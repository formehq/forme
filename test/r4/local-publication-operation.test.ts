import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GOLDEN_HOSTED_PUBLICATION_DELIVERY } from "../../packages/r4-protocol/src/index.ts";
import {
  FakeSyntheticPublicationPort,
  ProtectedInteractionLeaseStore,
  ProtectedRoomLock,
  ProtectedRoomMutationCoordinator,
  SyntheticLocalPublicationOperation,
  type LocalPublicationFault,
} from "../../packages/r4-local/src/index.ts";
import { NOW, removeRoot, temporaryRoot } from "./helpers.ts";

const FAULTS: LocalPublicationFault[] = [
  "before_intent_persist",
  "after_intent_persist",
  "before_submit",
  "after_submit",
  "before_receipt_persist",
  "after_receipt_persist",
];

function harness() {
  const root = temporaryRoot("publication-operation");
  const lock = new ProtectedRoomLock({ root: join(root, "locks"), bootId: "publication-boot" });
  const coordinator = new ProtectedRoomMutationCoordinator({
    lock,
    interactionLeases: new ProtectedInteractionLeaseStore({
      root: join(root, "interaction-leases"), bootId: "publication-boot",
    }),
    replayRoot: join(root, "replay"),
  });
  const port = new FakeSyntheticPublicationPort();
  const operation = new SyntheticLocalPublicationOperation({ root: join(root, "publication"), coordinator, port });
  return { root, coordinator, port, operation };
}

for (const faultAt of FAULTS) {
  test(`actual local publication path recovers ${faultAt} with one remote commit`, async () => {
    const fixture = harness();
    const roomId = GOLDEN_HOSTED_PUBLICATION_DELIVERY.attestation.roomId;
    try {
      await assert.rejects(fixture.operation.submit({
        roomId,
        delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY,
        now: NOW,
        faultAt,
      }), /publication interruption/u);
      const receipt = await fixture.operation.submit({
        roomId,
        delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY,
        now: new Date(NOW.getTime() + 1_000),
      });
      assert.equal(receipt.roomId, roomId);
      assert.equal(fixture.port.committedCount(), 1);
      const durable = readdirSync(join(fixture.root, "publication"))
        .map((name) => readFileSync(join(fixture.root, "publication", name), "utf8"))
        .join("\n");
      assert.doesNotMatch(durable, new RegExp(GOLDEN_HOSTED_PUBLICATION_DELIVERY.response?.body ?? "never", "u"));
    } finally {
      removeRoot(fixture.root);
    }
  });
}

test("actual publication submit shares the exact per-Room coordinator", async () => {
  const fixture = harness();
  const roomId = GOLDEN_HOSTED_PUBLICATION_DELIVERY.attestation.roomId;
  try {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const sync = fixture.coordinator.run(roomId, "room_sync", async () => await held, NOW);
    await assert.rejects(fixture.operation.submit({
      roomId,
      delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY,
      now: NOW,
    }), /protected Room is busy:live/u);
    release();
    await sync;
  } finally {
    removeRoot(fixture.root);
  }
});

test("local publication intent and receipt reject unknown recovery fields", async () => {
  const intentFixture = harness();
  const roomId = GOLDEN_HOSTED_PUBLICATION_DELIVERY.attestation.roomId;
  try {
    await assert.rejects(intentFixture.operation.submit({
      roomId, delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY, now: NOW, faultAt: "after_intent_persist",
    }), /publication interruption/u);
    const intentName = readdirSync(join(intentFixture.root, "publication")).find((name) => name.endsWith(".intent.json"));
    if (!intentName) throw new Error("missing publication intent fixture");
    const path = join(intentFixture.root, "publication", intentName);
    const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    writeFileSync(path, `${JSON.stringify({ ...value, note: "unknown" })}\n`, "utf8");
    await assert.rejects(intentFixture.operation.submit({
      roomId, delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY, now: new Date(NOW.getTime() + 1_000),
    }), /intent binding mismatch/u);
  } finally {
    removeRoot(intentFixture.root);
  }

  const receiptFixture = harness();
  try {
    await assert.rejects(receiptFixture.operation.submit({
      roomId, delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY, now: NOW, faultAt: "after_receipt_persist",
    }), /publication interruption/u);
    const receiptName = readdirSync(join(receiptFixture.root, "publication")).find((name) => name.endsWith(".receipt.json"));
    if (!receiptName) throw new Error("missing publication receipt fixture");
    const path = join(receiptFixture.root, "publication", receiptName);
    const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    writeFileSync(path, `${JSON.stringify({ ...value, note: "unknown" })}\n`, "utf8");
    await assert.rejects(receiptFixture.operation.submit({
      roomId, delivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY, now: new Date(NOW.getTime() + 1_000),
    }), /receipt binding mismatch/u);
  } finally {
    removeRoot(receiptFixture.root);
  }
});
