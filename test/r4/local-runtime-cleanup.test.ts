import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ProtectedRoomLock } from "../../packages/r4-local/src/lock.ts";
import { ProtectedInteractionLeaseStore, ProtectedRoomMutationCoordinator } from "../../packages/r4-local/src/coordinator.ts";
import {
  SyntheticFreshRuntimeStore,
  type RuntimeCleanupFault,
  type RuntimeBeginFault,
  type SyntheticFreshTerminal,
} from "../../packages/r4-local/src/runtime-cleanup.ts";
import { sha256 } from "../../packages/r4-local/src/body-free.ts";
import { INTERACTION_ID, NOW, ROOM_ID, removeRoot, temporaryRoot } from "./helpers.ts";

function setup() {
  const parent = temporaryRoot("fresh-runtime");
  const workspace = join(parent, "workspace");
  const runtimeRoot = join(parent, "protected-runtime");
  const lockRoot = join(parent, "locks");
  const store = new SyntheticFreshRuntimeStore({
    root: runtimeRoot,
    workspaceRoot: workspace,
    lock: new ProtectedRoomLock({ root: lockRoot, bootId: "synthetic-boot" }),
  });
  return { parent, runtimeRoot, store };
}

function begin(store: SyntheticFreshRuntimeStore, runId: string, faultAt?: RuntimeBeginFault) {
  return store.begin({
    runId,
    roomId: ROOM_ID,
    interactionId: INTERACTION_ID,
    sessionEnvelopeHash: sha256(runId),
    requestBytes: Buffer.from("FORME_PRIVATE_GUEST_CANARY synthetic request", "utf8"),
    snapshotBytes: Buffer.from("FORME_PRIVATE_SOURCE_CANARY synthetic snapshot", "utf8"),
    streamBytes: Buffer.from("FORME_TRANSCRIPT_CANARY synthetic runtime stream", "utf8"),
    now: NOW,
    synthetic: true,
    faultAt,
  });
}

test("all synthetic Fresh terminal outcomes remove request/snapshot/runtime bytes and keep only body-free receipts", () => {
  const terminals: SyntheticFreshTerminal[] = [
    "normal", "cancel", "timeout", "budget", "schema_failure", "process_kill", "fork_attempt", "huge_output", "machine_crash",
  ];
  for (const [index, terminal] of terminals.entries()) {
    const fixture = setup();
    try {
      const runId = `run_${terminal.replaceAll("_", "")}synthetic${String(index).padStart(8, "0")}`;
      begin(fixture.store, runId);
      assert.ok(fixture.store.runtimeByteCount(runId) > 0);
      const receipt = fixture.store.terminate(runId, terminal, new Date(NOW.getTime() + 1_000));
      assert.equal(receipt.outcome, "runtime_bytes_absent");
      assert.equal(fixture.store.runtimeByteCount(runId), 0);
      assert.equal(fixture.store.inspect().activeRunIds.length, 0);
      const durable = readdirSync(fixture.runtimeRoot)
        .filter((name) => name.endsWith(".json"))
        .map((name) => join(fixture.runtimeRoot, name));
      assert.equal(durable.length, 1);
      assert.doesNotMatch(JSON.stringify(receipt), /FORME_(?:PRIVATE|TRANSCRIPT)_CANARY|requestBytes|snapshotBytes|streamBytes/u);
    } finally {
      removeRoot(fixture.parent);
    }
  }
});

for (const fault of ["after_deny", "after_body_remove", "after_receipt"] as RuntimeCleanupFault[]) {
  test(`Fresh cleanup crash ${fault} denies bytes first and explicit recovery finishes exactly once`, () => {
    const fixture = setup();
    const runId = `run_${fault.replaceAll("_", "")}synthetic00000001`;
    try {
      begin(fixture.store, runId);
      assert.throws(() => fixture.store.terminate(runId, "process_kill", NOW, fault), /injected Fresh runtime cleanup interruption/u);
      assert.throws(() => fixture.store.readSyntheticArtifact(runId, "request"), /denied pending cleanup/u);
      const before = fixture.store.inspect();
      assert.deepEqual(before.cleanupRequiredRunIds, [runId]);
      const recovered = fixture.store.reconcile(new Date(NOW.getTime() + 2_000));
      assert.equal(recovered.length, 1);
      assert.equal(fixture.store.runtimeByteCount(runId), 0);
      assert.deepEqual(fixture.store.reconcile(new Date(NOW.getTime() + 3_000)), []);
      assert.equal(fixture.store.inspect().receiptCount, 1);
    } finally {
      removeRoot(fixture.parent);
    }
  });
}

test("read-only startup status performs zero cleanup write; explicit reconcile handles machine crash", () => {
  const fixture = setup();
  const runId = "run_machinecrashsynthetic00000001";
  try {
    begin(fixture.store, runId);
    const beforeNames = readdirSync(fixture.runtimeRoot).sort();
    const beforeBytes = fixture.store.runtimeByteCount(runId);
    const watched = [
      join(fixture.runtimeRoot, `${runId}.marker.json`),
      join(fixture.runtimeRoot, `${runId}.ephemeral`, "request.bin"),
      join(fixture.runtimeRoot, `${runId}.ephemeral`, "snapshot.bin"),
      join(fixture.runtimeRoot, `${runId}.ephemeral`, "runtime-stream.bin"),
    ];
    const watchedBytes = watched.map((path) => readFileSync(path));
    const watchedMtimes = watched.map((path) => statSync(path, { bigint: true }).mtimeNs);
    const restarted = new SyntheticFreshRuntimeStore({
      root: fixture.runtimeRoot,
      workspaceRoot: join(fixture.parent, "workspace"),
      lock: new ProtectedRoomLock({ root: join(fixture.parent, "locks"), bootId: "synthetic-restart" }),
    });
    const restartedStatus = restarted.inspect();
    assert.deepEqual(restartedStatus.activeRunIds, []);
    assert.deepEqual(restartedStatus.cleanupRequiredRunIds, [runId]);
    assert.throws(() => restarted.readSyntheticArtifact(runId, "request"), /denied pending cleanup/u);
    assert.deepEqual(readdirSync(fixture.runtimeRoot).sort(), beforeNames);
    assert.equal(restarted.runtimeByteCount(runId), beforeBytes);
    for (const [index, path] of watched.entries()) {
      assert.deepEqual(readFileSync(path), watchedBytes[index]);
      assert.equal(statSync(path, { bigint: true }).mtimeNs, watchedMtimes[index]);
    }
    assert.equal(existsSync(join(fixture.runtimeRoot, `${runId}.cleanup-receipt.json`)), false);
    const receipts = restarted.reconcile(new Date(NOW.getTime() + 1_000));
    assert.equal(receipts[0]?.terminal, "machine_crash");
    assert.equal(restarted.runtimeByteCount(runId), 0);
  } finally {
    removeRoot(fixture.parent);
  }
});

test("runtime root cannot overlap the admitted Workspace and oversized artifacts fail before marker/body creation", () => {
  const parent = temporaryRoot("fresh-runtime-boundary");
  try {
    const workspace = join(parent, "workspace");
    assert.throws(() => new SyntheticFreshRuntimeStore({
      root: join(workspace, ".forme-runtime"),
      workspaceRoot: workspace,
      lock: new ProtectedRoomLock({ root: join(parent, "locks"), bootId: "synthetic" }),
    }), /disjoint/u);
    const runtimeRoot = join(parent, "runtime");
    const store = new SyntheticFreshRuntimeStore({
      root: runtimeRoot,
      workspaceRoot: workspace,
      lock: new ProtectedRoomLock({ root: join(parent, "locks"), bootId: "synthetic" }),
    });
    assert.throws(() => store.begin({
      runId: "run_oversizesynthetic00000000001",
      roomId: ROOM_ID,
      interactionId: INTERACTION_ID,
      sessionEnvelopeHash: sha256("oversize"),
      requestBytes: new Uint8Array(12 * 1024 * 1024 + 1),
      snapshotBytes: new Uint8Array(),
      now: NOW,
      synthetic: true,
    }), /byte ceiling/u);
    assert.equal(existsSync(runtimeRoot), false);
  } finally {
    removeRoot(parent);
  }
});

for (const fault of ["after_marker", "after_request", "after_snapshot", "after_stream"] as RuntimeBeginFault[]) {
  test(`Fresh begin crash ${fault} durably denies partial bytes until explicit reconcile`, () => {
    const fixture = setup();
    const runId = `run_begin${fault.replaceAll("_", "")}synthetic0001`;
    try {
      assert.throws(() => begin(fixture.store, runId, fault), /begin interruption/u);
      assert.throws(() => fixture.store.readSyntheticArtifact(runId, "request"), /denied pending cleanup/u);
      assert.deepEqual(fixture.store.inspect().cleanupRequiredRunIds, [runId]);
      const receipts = fixture.store.reconcile(new Date(NOW.getTime() + 2_000));
      assert.equal(receipts.length, 1);
      assert.equal(fixture.store.runtimeByteCount(runId), 0);
      assert.equal(fixture.store.inspect().receiptCount, 1);
    } finally {
      removeRoot(fixture.parent);
    }
  });
}

test("Fresh runtime holds the Interaction lease for the entire body-bearing lifetime", () => {
  const fixture = setup();
  const first = "run_leaseholdsynthetic000000001";
  const second = "run_leaseholdsynthetic000000002";
  try {
    begin(fixture.store, first);
    assert.throws(() => begin(fixture.store, second), /protected Interaction is busy:live/u);
    fixture.store.terminate(first, "normal", new Date(NOW.getTime() + 1_000));
    assert.doesNotThrow(() => begin(fixture.store, second));
    fixture.store.terminate(second, "normal", new Date(NOW.getTime() + 2_000));
  } finally {
    removeRoot(fixture.parent);
  }
});

test("Fresh runtime protected root rejects direct and parent symlinks into Workspace", () => {
  const parent = temporaryRoot("runtime-symlink-root");
  const workspace = join(parent, "workspace");
  mkdirSync(workspace, { recursive: true });
  try {
    const direct = join(parent, "runtime-link");
    symlinkSync(workspace, direct);
    assert.throws(() => new SyntheticFreshRuntimeStore({
      root: direct,
      workspaceRoot: workspace,
      lock: new ProtectedRoomLock({ root: join(parent, "locks-a"), bootId: "boot-a" }),
    }), /symlink component/u);
    const parentLink = join(parent, "parent-link");
    symlinkSync(workspace, parentLink);
    assert.throws(() => new SyntheticFreshRuntimeStore({
      root: join(parentLink, "runtime"),
      workspaceRoot: workspace,
      lock: new ProtectedRoomLock({ root: join(parent, "locks-b"), bootId: "boot-b" }),
    }), /symlink component/u);
  } finally {
    removeRoot(parent);
  }
});

for (const ownerState of ["dead", "live", "ambiguous"] as const) {
  test(`Fresh crash reconcile recovers the lifetime Interaction lease only for ${ownerState} ownership`, () => {
    const fixture = setup();
    const runId = `run_restartlease${ownerState}synthetic001`;
    try {
      begin(fixture.store, runId);
      const lock = new ProtectedRoomLock({
        root: join(fixture.parent, "locks"), bootId: "restart-boot", isProcessLive: () => ownerState,
      });
      const coordinator = new ProtectedRoomMutationCoordinator({
        lock,
        interactionLeases: new ProtectedInteractionLeaseStore({
          root: join(fixture.parent, "interaction-leases"), bootId: "restart-boot", isProcessLive: () => ownerState,
        }),
        replayRoot: join(fixture.parent, "replay-restart"),
      });
      const restarted = new SyntheticFreshRuntimeStore({
        root: fixture.runtimeRoot,
        workspaceRoot: join(fixture.parent, "workspace"),
        lock,
        coordinator,
      });
      if (ownerState === "dead") {
        assert.equal(restarted.reconcile(new Date(NOW.getTime() + 1_000)).length, 1);
        assert.equal(restarted.runtimeByteCount(runId), 0);
      } else {
        assert.throws(() => restarted.reconcile(NOW), new RegExp(`denied:${ownerState}`, "u"));
        assert.ok(restarted.runtimeByteCount(runId) > 0);
      }
    } finally {
      removeRoot(fixture.parent);
    }
  });
}

test("Fresh reconcile validates the exact cleanup receipt under the Room lock", () => {
  const fixture = setup();
  const runId = "run_corruptreceiptsynthetic000001";
  try {
    begin(fixture.store, runId);
    assert.throws(() => fixture.store.terminate(runId, "process_kill", NOW, "after_receipt"), /cleanup interruption/u);
    const receiptPath = join(fixture.runtimeRoot, `${runId}.cleanup-receipt.json`);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
    writeFileSync(receiptPath, `${JSON.stringify({ ...receipt, roomId: "room_tampered000000001" })}\n`, "utf8");
    assert.throws(() => fixture.store.reconcile(new Date(NOW.getTime() + 1_000)), /malformed Fresh runtime cleanup receipt/u);
  } finally {
    removeRoot(fixture.parent);
  }
});

test("Fresh marker rejects extra fields and cannot reroute cleanup to another valid Room", () => {
  const extra = setup();
  const extraRun = "run_strictextramarker000000001";
  try {
    begin(extra.store, extraRun);
    const markerPath = join(extra.runtimeRoot, `${extraRun}.marker.json`);
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
    writeFileSync(markerPath, `${JSON.stringify({ ...marker, note: "unknown" })}\n`, "utf8");
    assert.throws(() => extra.store.inspect(), /malformed Fresh runtime marker/u);
  } finally {
    removeRoot(extra.parent);
  }

  const reroute = setup();
  const rerouteRun = "run_strictreroutemarker0000001";
  try {
    begin(reroute.store, rerouteRun);
    const markerPath = join(reroute.runtimeRoot, `${rerouteRun}.marker.json`);
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
    writeFileSync(markerPath, `${JSON.stringify({ ...marker, roomId: "room_reroute00000000001" })}\n`, "utf8");
    assert.throws(() => reroute.store.reconcile(new Date(NOW.getTime() + 1_000)), /Interaction lease binding mismatch/u);
  } finally {
    removeRoot(reroute.parent);
  }
});

test("Fresh cleanup receipt rejects an otherwise innocuous unknown key", () => {
  const fixture = setup();
  const runId = "run_strictextrareceipt00000001";
  try {
    begin(fixture.store, runId);
    assert.throws(() => fixture.store.terminate(runId, "process_kill", NOW, "after_receipt"), /cleanup interruption/u);
    const path = join(fixture.runtimeRoot, `${runId}.cleanup-receipt.json`);
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    writeFileSync(path, `${JSON.stringify({ ...receipt, note: "unknown" })}\n`, "utf8");
    assert.throws(() => fixture.store.reconcile(new Date(NOW.getTime() + 1_000)), /malformed Fresh runtime cleanup receipt/u);
  } finally {
    removeRoot(fixture.parent);
  }
});
