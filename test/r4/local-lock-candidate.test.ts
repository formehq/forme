import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  createCandidateOwnerReviewPort,
  FileCandidateStore,
  ProtectedInteractionLeaseStore,
  ProtectedRoomLock,
  ProtectedRoomMutationCoordinator,
  sha256,
  SyntheticUserPresenceKeyProtector,
  type KeyProtector,
} from "../../packages/r4-local/src/index.ts";
import { candidate, INTERACTION_ID, NOW, removeRoot, ROOM_ID, temporaryRoot } from "./helpers.ts";

test("per-Room writer lock serializes same Room while independent Rooms do not share a lock", () => {
  const root = temporaryRoot("locks");
  try {
    const lock = new ProtectedRoomLock({ root, bootId: "boot" });
    assert.throws(() => lock.acquire(ROOM_ID, "arbitrary" as never, NOW), /invalid protected Room operation class/u);
    const first = lock.acquire(ROOM_ID, "room_sync", NOW);
    assert.throws(() => lock.acquire(ROOM_ID, "room_reconcile", NOW), /busy:live/u);
    const other = lock.acquire("room_synthetic00000002", "room_sync", NOW);
    assert.notEqual(first.record.nonce, other.record.nonce);
    other.release();
    first.release();
    assert.equal(lock.inspect(ROOM_ID), null);
    assert.doesNotThrow(() => first.release(), "release is idempotent");
  } finally {
    removeRoot(root);
  }
});

test("stale lock recovery requires proven dead ownership and denies live or ambiguous ownership", () => {
  for (const ownerState of ["dead", "live", "ambiguous"] as const) {
    const root = temporaryRoot(`stale-${ownerState}`);
    try {
      const creator = new ProtectedRoomLock({ root, bootId: "boot-old", isProcessLive: () => "dead" });
      creator.acquire(ROOM_ID, "room_sync", NOW);
      const recovery = new ProtectedRoomLock({ root, bootId: "boot-new", isProcessLive: () => ownerState });
      if (ownerState === "dead") {
        const record = recovery.recoverStale(ROOM_ID);
        assert.equal(record.operationClass, "room_sync");
        assert.equal(recovery.inspect(ROOM_ID), null);
        const lease = recovery.acquire(ROOM_ID, "room_reconcile", NOW);
        lease.release();
      } else {
        assert.throws(() => recovery.recoverStale(ROOM_ID), new RegExp(`denied:${ownerState}`, "u"));
        assert.notEqual(recovery.inspect(ROOM_ID), null);
      }
    } finally {
      removeRoot(root);
    }
  }
});

test("Room locks and Interaction leases reject extra keys and malformed authority fields", () => {
  const root = temporaryRoot("strict-lock-records");
  try {
    const lockRoot = join(root, "locks");
    const lock = new ProtectedRoomLock({ root: lockRoot, bootId: "strict-boot" });
    lock.acquire(ROOM_ID, "room_sync", NOW);
    const lockPath = join(lockRoot, `${ROOM_ID}.lock.json`);
    const lockRecord = JSON.parse(readFileSync(lockPath, "utf8")) as Record<string, unknown>;
    writeFileSync(lockPath, `${JSON.stringify({ ...lockRecord, harmless: "must-not-survive" })}\n`, "utf8");
    assert.throws(() => lock.inspect(ROOM_ID), /ambiguous protected Room lock/u);

    const leaseRoot = join(root, "leases");
    const leases = new ProtectedInteractionLeaseStore({ root: leaseRoot, bootId: "strict-boot" });
    leases.acquire(ROOM_ID, INTERACTION_ID, "response_prepare", NOW);
    const leasePath = join(leaseRoot, `${ROOM_ID}--${INTERACTION_ID}.lease.json`);
    const leaseRecord = JSON.parse(readFileSync(leasePath, "utf8")) as Record<string, unknown>;
    writeFileSync(leasePath, `${JSON.stringify({ ...leaseRecord, nonce: "not-a-uuid" })}\n`, "utf8");
    assert.throws(() => leases.inspect(ROOM_ID, INTERACTION_ID), /ambiguous protected Interaction lease/u);
  } finally {
    removeRoot(root);
  }
});

function candidateHarness(): {
  base: string;
  workspace: string;
  protectedRoot: string;
  protector: SyntheticUserPresenceKeyProtector;
  store: FileCandidateStore;
  review: ReturnType<typeof createCandidateOwnerReviewPort>;
} {
  const base = temporaryRoot("candidate");
  const workspace = join(base, "workspace");
  const protectedRoot = join(base, "protected-candidates");
  mkdirSync(workspace, { recursive: true });
  const protector = new SyntheticUserPresenceKeyProtector({
    presenceProof: "owner-is-present",
    wrappingKey: Buffer.alloc(32, 7),
  });
  const store = new FileCandidateStore({ root: protectedRoot, workspaceRoot: workspace, protector });
  const review = createCandidateOwnerReviewPort({ store, confirmUserPresence: () => "owner-is-present" });
  return { base, workspace, protectedRoot, protector, store, review };
}

test("candidate store is outside Workspace, ciphertext-only, user-presence gated, and exact-hash approved", async () => {
  const { base, workspace, protectedRoot, protector, store, review } = candidateHarness();
  try {
    assert.throws(
      () => new FileCandidateStore({ root: join(workspace, "candidate"), workspaceRoot: workspace, protector }),
      /disjoint/u,
    );
    const secretBody = "FORME_TEST_PLAINTEXT_CANDIDATE_8fd3d7";
    const admitted = await store.put(candidate({ responseText: secretBody }));
    store.assertProtectedPermissions();
    const files = readdirSync(protectedRoot);
    assert.deepEqual(files, [
      "candidate_synthetic00000001.admission-authority.json",
      "candidate_synthetic00000001.candidate.json",
    ]);
    const raw = files.map((name) => readFileSync(join(protectedRoot, name), "utf8")).join("\n");
    assert.doesNotMatch(raw, new RegExp(secretBody, "u"));
    assert.doesNotMatch(raw, /"body"|"text"|owner-is-present/u);
    for (const name of files) assert.equal(statSync(join(protectedRoot, name)).mode & 0o077, 0);
    assert.equal(readdirSync(workspace).length, 0);

    await assert.rejects(createCandidateOwnerReviewPort({ store, confirmUserPresence: () => "wrong-presence" }).read({
      candidateId: "candidate_synthetic00000001", now: NOW,
    }), /user presence required/u);
    const restored = await review.read({ candidateId: "candidate_synthetic00000001", now: NOW });
    assert.equal(restored.responseText, secretBody);
    await assert.rejects(
      review.approveExact({
        candidateId: "candidate_synthetic00000001",
        expectedHash: `sha256:${"0".repeat(64)}`,
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
      }),
      /candidate changed/u,
    );
    const approval = await review.approveExact({
      candidateId: "candidate_synthetic00000001",
      expectedHash: admitted.candidateHash,
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
    });
    assert.equal(approval.artifactHash, admitted.candidateHash);
    assert.equal(approval.basisHash, restored.twinBasisHash);
    assert.equal(approval.interactionId, restored.interactionId);
    assert.doesNotMatch(JSON.stringify(approval), new RegExp(secretBody, "u"));
  } finally {
    removeRoot(base);
  }
});

test("Owner edit replaces only response text and requires a separate exact approval", async () => {
  const { base, store, review } = candidateHarness();
  const original = candidate();
  try {
    await store.put(original);
    const oldApproval = await review.approveExact({
      candidateId: original.candidateId,
      expectedHash: original.candidateHash,
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
    });
    const successor = await review.replaceResponseText({
      candidateId: original.candidateId,
      expectedHash: original.candidateHash,
      responseText: "Owner-edited exact response.",
      now: new Date(NOW.getTime() + 1_000),
    });
    await assert.rejects(review.read({ candidateId: original.candidateId, now: NOW }), /candidate_unavailable/u);
    const current = await review.read({ candidateId: successor.candidateId, now: new Date(NOW.getTime() + 2_000) });
    const { candidateId: _oldId, candidateHash: _oldHash, responseText: _oldText, ...oldProvenance } = original;
    const { candidateId: _newId, candidateHash: _newHash, responseText: _newText, ...newProvenance } = current;
    assert.deepEqual(newProvenance, oldProvenance);
    assert.equal(current.responseText, "Owner-edited exact response.");
    assert.notEqual(oldApproval.artifactHash, current.candidateHash);
    const newApproval = await review.approveExact({
      candidateId: current.candidateId,
      expectedHash: current.candidateHash,
      now: new Date(NOW.getTime() + 3_000),
      expiresAt: new Date(NOW.getTime() + 60_000),
    });
    assert.equal(newApproval.artifactHash, current.candidateHash);
  } finally {
    removeRoot(base);
  }
});

for (const faultAt of ["after_successor_stage", "after_old_deny", "after_successor_activate"] as const) {
  test(`candidate replacement ${faultAt} has at most one readable candidate and restart reconciliation converges`, async () => {
    const { base, store, review } = candidateHarness();
    const original = candidate();
    const replacementText = `Owner replacement after ${faultAt}.`;
    const expectedId = `candidate_${canonicalSha256({
      replacedCandidateHash: original.candidateHash,
      responseText: replacementText,
    }).slice(7, 39)}`;
    try {
      await store.put(original);
      const oldApproval = await review.approveExact({
        candidateId: original.candidateId,
        expectedHash: original.candidateHash,
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
      });
      await assert.rejects(review.replaceResponseText({
        candidateId: original.candidateId,
        expectedHash: original.candidateHash,
        responseText: replacementText,
        now: new Date(NOW.getTime() + 1_000),
        faultAt,
      }), /replacement interruption/u);
      if (faultAt === "after_successor_stage") {
        const journal = JSON.parse(readFileSync(
          join(base, "protected-candidates", `${original.candidateId}.replacement.json`),
          "utf8",
        )) as { phase: string };
        assert.equal(journal.phase, "key_wrapped", "stage fsync occurs before its journal phase advance");
        assert.equal(existsSync(join(base, "protected-candidates", `${expectedId}.candidate.staged.json`)), true);
      }
      let readable = 0;
      for (const candidateId of [original.candidateId, expectedId]) {
        try {
          await review.read({ candidateId, now: new Date(NOW.getTime() + 2_000) });
          readable += 1;
        } catch { /* denied or staged */ }
      }
      assert.ok(readable <= 1);
      const recovered = await store.reconcileReplacement(original.candidateId, new Date(NOW.getTime() + 3_000));
      assert.equal(recovered.candidateId, expectedId);
      assert.equal(recovered.outcome, "successor_active");
      await assert.rejects(review.read({ candidateId: original.candidateId, now: NOW }), /candidate_unavailable/u);
      const successor = await review.read({ candidateId: expectedId, now: new Date(NOW.getTime() + 4_000) });
      assert.equal(successor.responseText, replacementText);
      assert.notEqual(successor.candidateHash, oldApproval.artifactHash);
      const { candidateId: _oldId, candidateHash: _oldHash, responseText: _oldText, ...oldProvenance } = original;
      const { candidateId: _newId, candidateHash: _newHash, responseText: _newText, ...newProvenance } = successor;
      assert.deepEqual(newProvenance, oldProvenance);
    } finally {
      removeRoot(base);
    }
  });
}

for (const faultAt of ["after_replacement_intent", "after_successor_key_wrap"] as const) {
  test(`candidate replacement ${faultAt} restart aborts safely and retains the predecessor`, async () => {
    const { base, protectedRoot, protector, store, review } = candidateHarness();
    const original = candidate();
    try {
      await store.put(original);
      await assert.rejects(review.replaceResponseText({
        candidateId: original.candidateId,
        expectedHash: original.candidateHash,
        responseText: `Interrupted before a recoverable stage: ${faultAt}`,
        now: new Date(NOW.getTime() + 1_000),
        faultAt,
      }), /replacement interruption/u);
      const journalPath = join(protectedRoot, `${original.candidateId}.replacement.json`);
      const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { wrappedKeyRef: string };
      await assert.rejects(review.read({
        candidateId: original.candidateId,
        now: new Date(NOW.getTime() + 2_000),
      }), /candidate_unavailable/u, "a pending replacement is fail-closed until restart reconciliation");
      const recovered = await store.reconcileReplacement(original.candidateId, new Date(NOW.getTime() + 3_000));
      assert.equal(recovered.outcome, "old_retained");
      assert.equal(recovered.candidateId, original.candidateId);
      assert.equal(existsSync(journalPath), false);
      assert.equal(protector.has(journal.wrappedKeyRef), false);
      assert.equal((await review.read({
        candidateId: original.candidateId,
        now: new Date(NOW.getTime() + 4_000),
      })).candidateHash, original.candidateHash);
    } finally {
      removeRoot(base);
    }
  });
}

test("expired pending replacement purges journal, stage, both candidate bodies, and wrapped key", async () => {
  const { base, protectedRoot, protector, store, review } = candidateHarness();
  const original = candidate();
  try {
    await store.put(original);
    await assert.rejects(review.replaceResponseText({
      candidateId: original.candidateId,
      expectedHash: original.candidateHash,
      responseText: "Successor that must not survive candidate expiry.",
      now: new Date(NOW.getTime() + 1_000),
      faultAt: "after_successor_stage",
    }), /replacement interruption/u);
    const journalPath = join(protectedRoot, `${original.candidateId}.replacement.json`);
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      newCandidateId: string;
      wrappedKeyRef: string;
    };
    const result = await store.reconcileReplacement(
      original.candidateId,
      new Date(Date.parse(original.expiresAt) + 1),
    );
    assert.equal(result.outcome, "expired");
    assert.equal(existsSync(journalPath), false);
    assert.equal(existsSync(join(protectedRoot, `${journal.newCandidateId}.candidate.staged.json`)), false);
    assert.equal(store.hasCiphertext(original.candidateId), false);
    assert.equal(protector.has(journal.wrappedKeyRef), false);
  } finally {
    removeRoot(base);
  }
});

for (const fault of ["after_deny", "after_key_destroy", "after_ciphertext_remove", "after_receipt_persist"] as const) {
  test(`candidate cleanup crash ${fault} fails closed and explicit reconcile finishes idempotently`, async () => {
      const { base, protectedRoot, protector, store, review } = candidateHarness();
    try {
      await store.put(candidate());
      await assert.rejects(store.cleanup("candidate_synthetic00000001", "owner_denied", NOW, fault), /injected candidate cleanup interruption/u);
      assert.equal(store.hasCleanupJournal("candidate_synthetic00000001"), true);
      await assert.rejects(review.read({ candidateId: "candidate_synthetic00000001", now: NOW }), /candidate_unavailable/u);
      assert.throws(() => store.metadata("candidate_synthetic00000001"), /candidate_unavailable/u);

      const journal = readFileSync(join(protectedRoot, "candidate_synthetic00000001.cleanup.json"), "utf8");
      assert.doesNotMatch(journal, /Synthetic candidate body|FORME_TEST_PLAINTEXT/u);
      await store.reconcile("candidate_synthetic00000001", new Date(NOW.getTime() + 1_000));
      await store.reconcile("candidate_synthetic00000001", new Date(NOW.getTime() + 2_000));
      assert.equal(store.hasCleanupJournal("candidate_synthetic00000001"), false);
      assert.equal(store.hasCiphertext("candidate_synthetic00000001"), false);
      assert.equal(protector.has(JSON.parse(journal).wrappedKeyRef as string), false);
      const receipts = readFileSync(join(protectedRoot, "cleanup-receipts.jsonl"), "utf8").trim().split("\n");
      assert.equal(receipts.length, 1);
      assert.doesNotMatch(receipts[0] ?? "", /Synthetic candidate body|FORME_TEST_PLAINTEXT/u);
    } finally {
      removeRoot(base);
    }
  });
}

test("known candidate expiry denies read without cleanup write", async () => {
  const { base, protectedRoot, store, review } = candidateHarness();
  try {
    await store.put(candidate());
    const path = join(protectedRoot, "candidate_synthetic00000001.candidate.json");
    const before = readFileSync(path);
    await assert.rejects(
      review.read({ candidateId: "candidate_synthetic00000001", now: new Date("2026-08-05T12:00:00.000Z") }),
      /candidate_expired/u,
    );
    assert.deepEqual(readFileSync(path), before);
    assert.equal(existsSync(join(protectedRoot, "candidate_synthetic00000001.cleanup.json")), false);
  } finally {
    removeRoot(base);
  }
});

test("candidate envelope metadata is authenticated and every direct metadata edit fails closed", async () => {
  const { base, protectedRoot, store, review } = candidateHarness();
  try {
    await store.put(candidate());
    const path = join(protectedRoot, "candidate_synthetic00000001.candidate.json");
    const original = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const edits: Record<string, unknown> = {
      expiresAt: "2026-08-06T12:00:00.000Z",
      admittedAt: "2026-08-03T12:00:01.000Z",
      roomId: "room_tamper00000000001",
      projectionId: "proj_tamper00000000001",
      interactionId: "interaction_tamper00000001",
      basisHash: sha256("tamper-basis"),
      policyHash: sha256("tamper-policy"),
      snapshotManifestHash: sha256("tamper-snapshot"),
      sessionReceiptHash: sha256("tamper-receipt"),
    };
    for (const [field, value] of Object.entries(edits)) {
      writeFileSync(path, `${JSON.stringify({ ...original, [field]: value })}\n`, "utf8");
      assert.throws(() => store.metadata("candidate_synthetic00000001"), /encrypted candidate contract/u, field);
      await assert.rejects(review.read({ candidateId: "candidate_synthetic00000001", now: NOW }), /encrypted candidate contract/u, field);
      await assert.rejects(store.invalidateBasis({
        candidateId: "candidate_synthetic00000001",
        currentBasisHash: candidate().twinBasisHash,
        currentPolicyHash: candidate().policyHash,
        currentSnapshotManifestHash: candidate().snapshotManifestHash,
        now: NOW,
      }), /encrypted candidate contract/u, field);
    }
  } finally {
    removeRoot(base);
  }
});

test("candidate envelope strictly rejects malformed routing, provenance, time, and base64 even with recomputed AAD hash", async () => {
  const { base, protectedRoot, store } = candidateHarness();
  try {
    await store.put(candidate());
    const path = join(protectedRoot, "candidate_synthetic00000001.candidate.json");
    const original = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const aadKeys = [
      "schemaVersion", "candidateId", "sessionEnvelopeId", "roomId", "projectionId", "interactionId",
      "basisHash", "snapshotManifestHash", "sessionReceiptHash", "sourceDisclosureClass", "policyHash",
      "candidateHash", "wrappedKey", "admittedAt", "expiresAt",
    ];
    const withRecomputedAad = (edit: Record<string, unknown>): Record<string, unknown> => {
      const value = { ...original, ...edit };
      const aad = Object.fromEntries(aadKeys.map((key) => [key, value[key]]));
      return { ...value, aadHash: canonicalSha256(aad) };
    };
    const edits: Record<string, unknown>[] = [
      { sessionEnvelopeId: "session_short" },
      { roomId: "room_short" },
      { projectionId: "proj_short" },
      { interactionId: "interaction_short" },
      { basisHash: "sha256:00" },
      { snapshotManifestHash: null },
      { sessionReceiptHash: "sha256:00" },
      { sourceDisclosureClass: "manual_owner_authored" },
      { policyHash: "sha256:00" },
      { candidateHash: "sha256:00" },
      { wrappedKey: "key_short" },
      { admittedAt: "2026-08-03T12:00:00+00:00" },
      { expiresAt: "2026-08-02T12:00:00.000Z" },
      { ciphertext: "***" },
      { iv: "AA" },
      { authTag: "AA" },
    ];
    for (const edit of edits) {
      writeFileSync(path, `${JSON.stringify(withRecomputedAad(edit))}\n`, "utf8");
      assert.throws(() => store.metadata("candidate_synthetic00000001"), /encrypted candidate contract failed/u);
    }
  } finally {
    removeRoot(base);
  }
});

test("separate admission authority prevents recomputed envelope metadata from rerouting cleanup or orphaning its key", async () => {
  const { base, protectedRoot, protector, store } = candidateHarness();
  try {
    await store.put(candidate());
    const envelopePath = join(protectedRoot, "candidate_synthetic00000001.candidate.json");
    const authorityPath = join(protectedRoot, "candidate_synthetic00000001.admission-authority.json");
    const envelope = JSON.parse(readFileSync(envelopePath, "utf8")) as Record<string, unknown>;
    const authority = JSON.parse(readFileSync(authorityPath, "utf8")) as { wrappedKeyRef: string };
    const changed: Record<string, unknown> = { ...envelope, roomId: "room_recomputedtamper000001" };
    const aad = {
      schemaVersion: changed.schemaVersion,
      candidateId: changed.candidateId,
      sessionEnvelopeId: changed.sessionEnvelopeId,
      roomId: changed.roomId,
      projectionId: changed.projectionId,
      interactionId: changed.interactionId,
      basisHash: changed.basisHash,
      snapshotManifestHash: changed.snapshotManifestHash,
      sessionReceiptHash: changed.sessionReceiptHash,
      sourceDisclosureClass: changed.sourceDisclosureClass,
      policyHash: changed.policyHash,
      candidateHash: changed.candidateHash,
      wrappedKey: changed.wrappedKey,
      admittedAt: changed.admittedAt,
      expiresAt: changed.expiresAt,
    };
    writeFileSync(envelopePath, `${JSON.stringify({ ...changed, aadHash: canonicalSha256(aad) })}\n`, "utf8");
    await assert.rejects(store.deny("candidate_synthetic00000001", "owner_denied", NOW), /admission authority binding mismatch/u);
    assert.equal(protector.has(authority.wrappedKeyRef), true);
    assert.equal(existsSync(join(protectedRoot, "candidate_synthetic00000001.cleanup.json")), false);

    const strictAuthority = JSON.parse(readFileSync(authorityPath, "utf8")) as Record<string, unknown>;
    writeFileSync(authorityPath, `${JSON.stringify({ ...strictAuthority, note: "unknown" })}\n`, "utf8");
    assert.throws(() => store.metadata("candidate_synthetic00000001"), /admission authority is malformed/u);
  } finally {
    removeRoot(base);
  }
});

test("candidate protected root rejects direct and parent-component symlinks into Workspace", () => {
  const base = temporaryRoot("candidate-symlink-root");
  const workspace = join(base, "workspace");
  mkdirSync(workspace, { recursive: true });
  const protector = new SyntheticUserPresenceKeyProtector();
  try {
    const direct = join(base, "candidate-link");
    symlinkSync(workspace, direct);
    assert.throws(() => new FileCandidateStore({ root: direct, workspaceRoot: workspace, protector }), /symlink component/u);
    const parentLink = join(base, "parent-link");
    symlinkSync(workspace, parentLink);
    assert.throws(() => new FileCandidateStore({ root: join(parentLink, "nested"), workspaceRoot: workspace, protector }), /symlink component/u);
  } finally {
    removeRoot(base);
  }
});

test("candidate deny reason is a closed persisted enum", async () => {
  const { base, store } = candidateHarness();
  try {
    await store.put(candidate());
    await assert.rejects(store.deny("candidate_synthetic00000001", "arbitrary_reason" as never, NOW), /invalid candidate deny reason/u);
  } finally {
    removeRoot(base);
  }
});

test("candidate cleanup journal and receipt ledger reject unknown persisted fields", async () => {
  const journalFixture = candidateHarness();
  try {
    await journalFixture.store.put(candidate());
    await journalFixture.store.deny("candidate_synthetic00000001", "owner_denied", NOW);
    const path = join(journalFixture.protectedRoot, "candidate_synthetic00000001.cleanup.json");
    const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    writeFileSync(path, `${JSON.stringify({ ...value, note: "unknown" })}\n`, "utf8");
    await assert.rejects(journalFixture.store.reconcile("candidate_synthetic00000001", NOW), /journal is malformed/u);
  } finally {
    removeRoot(journalFixture.base);
  }

  const receiptFixture = candidateHarness();
  try {
    await receiptFixture.store.put(candidate());
    await receiptFixture.store.cleanup("candidate_synthetic00000001", "owner_denied", NOW);
    const path = join(receiptFixture.protectedRoot, "cleanup-receipts.jsonl");
    const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    writeFileSync(path, `${JSON.stringify({ ...value, note: "unknown" })}\n`, "utf8");
    assert.throws(() => receiptFixture.store.hasCleanupReceipt("candidate_synthetic00000001"), /receipt ledger is malformed/u);
  } finally {
    removeRoot(receiptFixture.base);
  }
});

for (const ownerState of ["dead", "live", "ambiguous"] as const) {
  test(`explicit candidate reconcile handles crashed Interaction lease only when owner is ${ownerState}`, async () => {
    const base = temporaryRoot(`candidate-lease-${ownerState}`);
    const workspace = join(base, "workspace");
    mkdirSync(workspace, { recursive: true });
    const protector = new SyntheticUserPresenceKeyProtector({ presenceProof: "owner", wrappingKey: Buffer.alloc(32, 4) });
    const oldLock = new ProtectedRoomLock({ root: join(base, "locks"), bootId: "old-boot", isProcessLive: () => "dead" });
    const oldInteractionLeases = new ProtectedInteractionLeaseStore({
      root: join(base, "interaction-leases"), bootId: "old-boot", isProcessLive: () => "dead",
    });
    const oldCoordinator = new ProtectedRoomMutationCoordinator({
      lock: oldLock, interactionLeases: oldInteractionLeases, replayRoot: join(base, "replay"),
    });
    const protectedRoot = join(base, "candidates");
    const original = new FileCandidateStore({ root: protectedRoot, workspaceRoot: workspace, protector, coordinator: oldCoordinator });
    try {
      await original.put(candidate());
      await original.deny("candidate_synthetic00000001", "owner_denied", NOW);
      oldInteractionLeases.acquire(ROOM_ID, INTERACTION_ID, "candidate_cleanup", NOW);
      const newLock = new ProtectedRoomLock({ root: join(base, "locks"), bootId: "new-boot", isProcessLive: () => ownerState });
      const newLeases = new ProtectedInteractionLeaseStore({
        root: join(base, "interaction-leases"), bootId: "new-boot", isProcessLive: () => ownerState,
      });
      const restarted = new FileCandidateStore({
        root: protectedRoot,
        workspaceRoot: workspace,
        protector,
        coordinator: new ProtectedRoomMutationCoordinator({ lock: newLock, interactionLeases: newLeases, replayRoot: join(base, "replay-new") }),
      });
      if (ownerState === "dead") {
        await restarted.reconcile("candidate_synthetic00000001", new Date(NOW.getTime() + 1_000));
        assert.equal(restarted.hasCleanupReceipt("candidate_synthetic00000001"), true);
      } else {
        await assert.rejects(restarted.reconcile("candidate_synthetic00000001", NOW), new RegExp(`denied:${ownerState}`, "u"));
        assert.equal(restarted.hasCleanupJournal("candidate_synthetic00000001"), true);
      }
    } finally {
      removeRoot(base);
    }
  });
}

for (const faultAt of ["after_admission_intent", "after_key_wrap", "after_candidate_persist"] as const) {
test(`candidate admission machine crash ${faultAt} is discoverable and restart reconciliation converges`, async () => {
  const base = temporaryRoot("candidate-put-failure");
  const workspace = join(base, "workspace");
  const protectedRoot = join(base, "candidates");
  mkdirSync(workspace, { recursive: true });
  const backing = new SyntheticUserPresenceKeyProtector({ presenceProof: "owner", wrappingKey: Buffer.alloc(32, 3) });
  let wrappedRef: string | null = null;
  const tracking: KeyProtector = {
    wrap: async (key, reference) => {
      wrappedRef = await backing.wrap(key, reference);
      return wrappedRef;
    },
    unwrap: async (wrapped, proof) => await backing.unwrap(wrapped, proof),
    destroy: async (wrapped) => await backing.destroy(wrapped),
  };
  const store = new FileCandidateStore({ root: protectedRoot, workspaceRoot: workspace, protector: tracking });
  try {
    await assert.rejects(store.put(candidate(), faultAt), /put interruption/u);
    const intentPath = join(protectedRoot, "candidate_synthetic00000001.admission.json");
    const intent = JSON.parse(readFileSync(intentPath, "utf8")) as { wrappedKeyRef: string };
    assert.equal(existsSync(intentPath), true);
    if (faultAt === "after_admission_intent") {
      assert.equal(wrappedRef, null);
      assert.equal(backing.has(intent.wrappedKeyRef), false);
    } else {
      assert.equal(wrappedRef, intent.wrappedKeyRef);
      assert.equal(backing.has(intent.wrappedKeyRef), true, "the abrupt-crash vector skips in-process finally cleanup");
    }
    const review = createCandidateOwnerReviewPort({ store, confirmUserPresence: () => "owner" });
    await assert.rejects(review.read({ candidateId: "candidate_synthetic00000001", now: NOW }), /candidate_unavailable/u);
    const restarted = new FileCandidateStore({ root: protectedRoot, workspaceRoot: workspace, protector: tracking });
    const result = await restarted.reconcileAdmission("candidate_synthetic00000001", new Date(NOW.getTime() + 1_000));
    assert.equal(result.outcome, faultAt === "after_candidate_persist" ? "committed" : "aborted");
    assert.equal(existsSync(intentPath), false);
    if (faultAt === "after_candidate_persist") {
      assert.equal(restarted.hasCiphertext("candidate_synthetic00000001"), true);
      assert.equal(backing.has(intent.wrappedKeyRef), true);
    } else {
      assert.equal(restarted.hasCiphertext("candidate_synthetic00000001"), false);
      assert.equal(backing.has(intent.wrappedKeyRef), false);
    }
  } finally {
    removeRoot(base);
  }
});
}

test("Owner review and deny are serialized across deferred user-presence unwrap", async () => {
  const base = temporaryRoot("candidate-review-race");
  const workspace = join(base, "workspace");
  mkdirSync(workspace, { recursive: true });
  const backing = new SyntheticUserPresenceKeyProtector({ presenceProof: "owner", wrappingKey: Buffer.alloc(32, 5) });
  let signalStarted!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  let releaseUnwrap!: () => void;
  const unwrapGate = new Promise<void>((resolve) => { releaseUnwrap = resolve; });
  const deferred: KeyProtector = {
    wrap: async (key, reference) => await backing.wrap(key, reference),
    unwrap: async (wrapped, proof) => {
      signalStarted();
      await unwrapGate;
      return await backing.unwrap(wrapped, proof);
    },
    destroy: async (wrapped) => await backing.destroy(wrapped),
  };
  const store = new FileCandidateStore({ root: join(base, "candidates"), workspaceRoot: workspace, protector: deferred });
  const review = createCandidateOwnerReviewPort({ store, confirmUserPresence: () => "owner" });
  try {
    await store.put(candidate());
    const pendingRead = review.read({ candidateId: "candidate_synthetic00000001", now: NOW });
    await started;
    await assert.rejects(store.deny("candidate_synthetic00000001", "owner_denied", NOW), /protected Interaction is busy:live/u);
    releaseUnwrap();
    assert.equal((await pendingRead).candidateId, "candidate_synthetic00000001");
    await store.deny("candidate_synthetic00000001", "owner_denied", new Date(NOW.getTime() + 1_000));
    await assert.rejects(review.read({ candidateId: "candidate_synthetic00000001", now: NOW }), /candidate_unavailable/u);
  } finally {
    removeRoot(base);
  }
});
