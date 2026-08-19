import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GOLDEN_HOSTED_PUBLICATION_DELIVERY } from "../../packages/r4-protocol/src/index.ts";
import {
  FakeSyntheticPublicationPort,
  FileBodyFreeLedgerStore,
  FileCandidateStore,
  newBodyFreeLedger,
  ProtectedInteractionLeaseStore,
  ProtectedRoomLock,
  ProtectedRoomMutationCoordinator,
  sha256,
  SnapshotQueryBroker,
  stableJson,
  SyntheticFreshRuntimeStore,
  SyntheticLocalPublicationOperation,
  SyntheticUserPresenceKeyProtector,
} from "../../packages/r4-local/src/index.ts";
import {
  candidate,
  INTERACTION_ID,
  NOW,
  removeRoot,
  ROOM_ID,
  syntheticSnapshot,
  temporaryRoot,
} from "./helpers.ts";

const CANARIES = Object.freeze({
  private_source_or_twin: "P03_PRIVATE_SOURCE_TWIN_7f46ad",
  guest_request_or_capsule: "P03_GUEST_REQUEST_CAPSULE_d8c921",
  binding_credential: "P03_BINDING_CREDENTIAL_1e37cb",
  reply_or_verification_secret: "P03_REPLY_VERIFICATION_SECRET_548f0a",
  cross_room_content: "P03_CROSS_ROOM_CONTENT_90b13d",
  candidate_plaintext: "P03_CANDIDATE_PLAINTEXT_3a9e85",
  transcript: "P03_TRANSCRIPT_6dc072",
});

function durableBytes(root: string): string {
  if (!readdirSync(root, { withFileTypes: true }).length) return "";
  const visit = (path: string): string => readdirSync(path, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory() ? visit(child) : readFileSync(child, "utf8");
    })
    .join("\n");
  return visit(root);
}

test("P03 local-only subset: explicit surface × secret-class canary matrix stays body-free", async () => {
  const root = temporaryRoot("local-canary-matrix");
  const workspace = join(root, "workspace");
  const ledgerRoot = join(root, "ledger");
  const runtimeRoot = join(root, "runtime");
  const candidateRoot = join(root, "candidates");
  const publicationRoot = join(root, "publication");
  mkdirSync(workspace, { recursive: true });
  try {
    const lock = new ProtectedRoomLock({ root: join(root, "locks"), bootId: "canary-matrix-boot" });
    const coordinator = new ProtectedRoomMutationCoordinator({
      lock,
      interactionLeases: new ProtectedInteractionLeaseStore({
        root: join(root, "interaction-leases"),
        bootId: "canary-matrix-boot",
      }),
      replayRoot: join(root, "replay"),
    });

    const ledgerStore = new FileBodyFreeLedgerStore(ledgerRoot);
    ledgerStore.create(newBodyFreeLedger({
      roomId: ROOM_ID,
      bindingId: "binding_canarymatrix00000001",
      bindingExpiresAt: "2026-09-02T12:00:00.000Z",
    }));

    const runtime = new SyntheticFreshRuntimeStore({ root: runtimeRoot, workspaceRoot: workspace, lock, coordinator });
    runtime.begin({
      runId: "run_canarymatrix000000001",
      roomId: ROOM_ID,
      interactionId: INTERACTION_ID,
      sessionEnvelopeHash: sha256("canary-session"),
      requestBytes: Buffer.from([
        CANARIES.guest_request_or_capsule,
        CANARIES.binding_credential,
        CANARIES.reply_or_verification_secret,
      ].join("\n")),
      snapshotBytes: Buffer.from([
        CANARIES.private_source_or_twin,
        CANARIES.cross_room_content,
      ].join("\n")),
      streamBytes: Buffer.from(CANARIES.transcript),
      now: NOW,
      synthetic: true,
    });
    const runtimeReceipt = runtime.terminate(
      "run_canarymatrix000000001",
      "normal",
      new Date(NOW.getTime() + 1_000),
    );
    assert.equal(runtime.runtimeByteCount("run_canarymatrix000000001"), 0);

    const candidateStore = new FileCandidateStore({
      root: candidateRoot,
      workspaceRoot: workspace,
      protector: new SyntheticUserPresenceKeyProtector({
        presenceProof: "canary-matrix-owner-presence",
        wrappingKey: Buffer.alloc(32, 12),
      }),
      coordinator,
    });
    await candidateStore.put(candidate({ responseText: CANARIES.candidate_plaintext }));
    const badReviewErrors: string[] = [];
    try {
      await candidateStore.metadata("candidate_notavalididentifier");
    } catch (error) {
      badReviewErrors.push(error instanceof Error ? error.message : String(error));
    }

    const publicationPort = new FakeSyntheticPublicationPort();
    const publication = new SyntheticLocalPublicationOperation({
      root: publicationRoot,
      coordinator,
      port: publicationPort,
    });
    const publicationReceipt = await publication.submit({
      roomId: GOLDEN_HOSTED_PUBLICATION_DELIVERY.attestation.roomId,
      delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY,
      now: new Date(NOW.getTime() + 2_000),
    });

    const brokerError = new SnapshotQueryBroker(
      syntheticSnapshot([{ path: "README.md", text: "public synthetic snapshot" }]),
      Buffer.alloc(32, 13),
    ).evaluate({
      schemaVersion: "snapshot_line_read.v1",
      canonicalPath: "docs/not-in-manifest.md",
      lineStart: 1,
      lineEnd: 1,
    });

    const surfaces = Object.freeze({
      local_ledger_files: durableBytes(ledgerRoot),
      fresh_runtime_terminal_files: durableBytes(runtimeRoot),
      encrypted_candidate_files: durableBytes(candidateRoot),
      local_publication_intent_and_receipt_files: durableBytes(publicationRoot),
      prepublication_wire: stableJson(GOLDEN_HOSTED_PUBLICATION_DELIVERY),
      body_free_receipts: stableJson({ runtimeReceipt, publicationReceipt, brokerError }),
      error_outputs: badReviewErrors.join("\n"),
      log_like_status_outputs: stableJson({
        ledger: ledgerStore.read(ROOM_ID),
        runtime: runtime.inspect(),
        publicationCommitCount: publicationPort.committedCount(),
      }),
    });

    let assertions = 0;
    for (const [surfaceName, bytes] of Object.entries(surfaces)) {
      for (const [canaryClass, canary] of Object.entries(CANARIES)) {
        assert.equal(bytes.includes(canary), false, `${surfaceName} leaked ${canaryClass}`);
        assertions += 1;
      }
    }
    assert.equal(assertions, Object.keys(surfaces).length * Object.keys(CANARIES).length);
  } finally {
    removeRoot(root);
  }
});
