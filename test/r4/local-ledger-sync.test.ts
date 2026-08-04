import assert from "node:assert/strict";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertBodyFree,
  ExplicitRoomSync,
  FakeRoomSyncPort,
  FileBodyFreeLedgerStore,
  ProtectedRoomLock,
  sha256,
  type AckResult,
  type CursorGone,
  type RoomEventBatch,
  type RoomSyncPort,
  type SyncFaultPoint,
} from "../../packages/r4-local/src/index.ts";
import type { RoomEventAckV1 } from "../../packages/r4-protocol/src/index.ts";
import { ledger, NOW, removeRoot, ROOM_ID, roomEvent, temporaryRoot } from "./helpers.ts";

function harness(): {
  root: string;
  store: FileBodyFreeLedgerStore;
  port: FakeRoomSyncPort;
  sync: ExplicitRoomSync;
} {
  const root = temporaryRoot("sync");
  const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
  store.create(ledger());
  const port = new FakeRoomSyncPort(ROOM_ID);
  const lock = new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot-synthetic" });
  return { root, store, port, sync: new ExplicitRoomSync({ store, lock, port }) };
}

test("body-free ledger persists only allowlisted metadata and uses protected file modes", () => {
  const root = temporaryRoot("ledger");
  try {
    const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
    store.create(ledger());
    const path = join(root, "ledger", `${ROOM_ID}.json`);
    const bytes = readFileSync(path, "utf8");
    assert.doesNotMatch(bytes, /Synthetic candidate|Guest request|@example/u);
    assert.equal(statSync(path).mode & 0o077, 0);
    assert.doesNotThrow(() => assertBodyFree(JSON.parse(bytes)));

    assert.throws(() => assertBodyFree({ responseBody: "not allowed" }), /forbidden key/u);
    assert.throws(() => assertBodyFree({ value: "FORME_GUEST_CANARY" }), /forbidden value/u);
    assert.throws(() => store.create({ ...ledger({ roomId: "room_synthetic00000002" }), receipts: [{ responseBody: "leak" }] } as never), /body-free/u);
  } finally {
    removeRoot(root);
  }
});

test("ledger and nested event, ACK, and receipt records reject unknown persisted fields", () => {
  const root = temporaryRoot("strict-ledger");
  const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
  const event = roomEvent(1);
  const exact = ledger({
    cursor: 1,
    highWater: 1,
    events: [event],
    ackOutbox: [{
      schemaVersion: "local_room_event_ack_outbox.v1",
      ack: {
        schemaVersion: "room_event_ack.v1",
        roomId: ROOM_ID,
        eventId: event.eventId,
        sequence: 1,
        eventHash: sha256("strict-event-hash"),
        idempotencyKey: "strict_ack_idempotency_000001",
      },
      serverReceiptId: null,
    }],
    receipts: [{
      schemaVersion: "r4.body-free-receipt.v1",
      receiptId: "receipt_strictledger00000001",
      roomId: ROOM_ID,
      operation: "sync.ack",
      objectId: event.eventId,
      requestHash: sha256("strict-receipt"),
      outcome: "accepted",
      errorCode: null,
      committedAt: NOW.toISOString(),
    }],
  });
  try {
    store.create(exact);
    const path = join(root, "ledger", `${ROOM_ID}.json`);
    const mutations = [
      (value: Record<string, unknown>) => ({ ...value, note: "unknown" }),
      (value: Record<string, unknown>) => ({ ...value, events: [{ ...(value.events as Record<string, unknown>[])[0], note: "unknown" }] }),
      (value: Record<string, unknown>) => ({
        ...value,
        ackOutbox: [{ ...(value.ackOutbox as Record<string, unknown>[])[0], note: "unknown" }],
      }),
      (value: Record<string, unknown>) => ({
        ...value,
        receipts: [{ ...(value.receipts as Record<string, unknown>[])[0], note: "unknown" }],
      }),
    ];
    for (const mutate of mutations) {
      writeFileSync(path, `${JSON.stringify(mutate(structuredClone(exact) as unknown as Record<string, unknown>))}\n`, "utf8");
      assert.throws(() => store.read(ROOM_ID), /unknown|field is not allowed/u);
    }
  } finally {
    removeRoot(root);
  }
});

test("read-only status performs zero fetch, ACK, cursor, receipt, or filesystem mutation", () => {
  const { root, store, port, sync } = harness();
  try {
    port.append(roomEvent(1));
    const path = join(root, "ledger", `${ROOM_ID}.json`);
    const before = readFileSync(path);
    const beforeMtime = statSync(path, { bigint: true }).mtimeNs;
    const status = sync.readStatus(ROOM_ID, NOW);
    const after = readFileSync(path);
    assert.deepEqual(status, {
      roomId: ROOM_ID,
      cursor: 0,
      highWater: 0,
      pendingAckCount: 0,
      recoveryRequired: false,
      bindingUsable: true,
      version: 1,
    });
    assert.deepEqual(after, before);
    assert.equal(statSync(path, { bigint: true }).mtimeNs, beforeMtime);
    assert.equal(store.read(ROOM_ID).receipts.length, 0);
    assert.equal(port.fetchCount, 0);
    assert.equal(port.ackCount, 0);
  } finally {
    removeRoot(root);
  }
});

test("explicit sync persists before ACK, advances contiguously, and is replay-idempotent", async () => {
  const { root, store, port, sync } = harness();
  try {
    port.append(roomEvent(1));
    port.append(roomEvent(2));
    const first = await sync.sync(ROOM_ID, { now: () => NOW });
    assert.equal(first.cursor, 2);
    assert.equal(first.highWater, 2);
    assert.deepEqual(first.events.map((event) => event.sequence), [1, 2]);
    assert.equal(first.ackOutbox.length, 0);
    assert.equal(port.acknowledgements.size, 2);

    const version = first.version;
    const second = await sync.sync(ROOM_ID, { now: () => NOW });
    assert.equal(second.cursor, 2);
    assert.equal(second.events.length, 2);
    assert.equal(second.version, version);
    assert.equal(port.acknowledgements.size, 2);
    assert.equal(store.read(ROOM_ID).cursor, 2);
  } finally {
    removeRoot(root);
  }
});

test("concurrent sync/sync on one Room serializes while another Room lock remains independent", async () => {
  const root = temporaryRoot("sync-concurrency");
  try {
    const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
    store.create(ledger());
    let releaseFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => { releaseFetch = resolve; });
    let fetches = 0;
    const port: RoomSyncPort = {
      async fetchEvents(): Promise<RoomEventBatch> {
        fetches += 1;
        await fetchGate;
        return { schemaVersion: "room_event_batch.v1", roomId: ROOM_ID, afterSequence: 0, highWater: 0, events: [] };
      },
      async acknowledge(): Promise<AckResult> { throw new Error("no event to ACK"); },
    };
    const lock = new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot" });
    const sync = new ExplicitRoomSync({ store, lock, port });
    const first = sync.sync(ROOM_ID, { now: () => NOW });
    await assert.rejects(sync.sync(ROOM_ID, { now: () => NOW }), /busy:live/u);
    assert.equal(fetches, 1);
    const other = lock.acquire("room_synthetic00000002", "room_sync", NOW);
    other.release();
    releaseFetch?.();
    await first;
    assert.equal(lock.inspect(ROOM_ID), null);
  } finally {
    removeRoot(root);
  }
});

for (const faultAt of [
  "before_fetch",
  "after_fetch",
  "before_event_persist",
  "after_event_persist",
  "before_ack",
  "after_ack",
  "before_ack_receipt_persist",
  "after_ack_receipt_persist",
  "before_cursor_persist",
  "after_cursor_persist",
] satisfies SyncFaultPoint[]) {
  test(`sync crash at ${faultAt} recovers once without duplicate event or ACK effect`, async () => {
    const { root, store, port, sync } = harness();
    try {
      port.append(roomEvent(1));
      await assert.rejects(sync.sync(ROOM_ID, { now: () => NOW, faultAt }), /injected sync interruption/u);
      const interrupted = store.read(ROOM_ID);
      assert.ok(interrupted.cursor === 0 || interrupted.cursor === 1);
      const recovered = await sync.sync(ROOM_ID, { now: () => NOW });
      assert.equal(recovered.cursor, 1);
      assert.equal(recovered.events.length, 1);
      assert.equal(recovered.ackOutbox.length, 0);
      assert.equal(port.acknowledgements.size, 1);
    } finally {
      removeRoot(root);
    }
  });
}

test("gap, malformed event, wrong Room, and ACK corruption quarantine without cursor advance", async (t) => {
  const cases: Array<{ name: string; port: RoomSyncPort; code: string }> = [
    {
      name: "gap",
      code: "sequence_gap",
      port: {
        async fetchEvents(): Promise<RoomEventBatch> {
          return { schemaVersion: "room_event_batch.v1", roomId: ROOM_ID, afterSequence: 0, highWater: 2, events: [roomEvent(2)] };
        },
        async acknowledge(): Promise<AckResult> { throw new Error("must not ACK gap"); },
      },
    },
    {
      name: "malformed",
      code: "invalid_hash",
      port: {
        async fetchEvents(): Promise<RoomEventBatch> {
          return { schemaVersion: "room_event_batch.v1", roomId: ROOM_ID, afterSequence: 0, highWater: 1, events: [{ ...roomEvent(1), payloadHash: "bad" as never }] };
        },
        async acknowledge(): Promise<AckResult> { throw new Error("must not ACK malformed event"); },
      },
    },
    {
      name: "wrong Room",
      code: "wrong_room",
      port: {
        async fetchEvents(): Promise<RoomEventBatch> {
          return { schemaVersion: "room_event_batch.v1", roomId: "room_another0000000001", afterSequence: 0, highWater: 0, events: [] };
        },
        async acknowledge(): Promise<AckResult> { throw new Error("must not ACK wrong Room"); },
      },
    },
    {
      name: "ACK receipt corruption",
      code: "ack_receipt_mismatch",
      port: {
        async fetchEvents(): Promise<RoomEventBatch> {
          return { schemaVersion: "room_event_batch.v1", roomId: ROOM_ID, afterSequence: 0, highWater: 1, events: [roomEvent(1)] };
        },
        async acknowledge(entry: RoomEventAckV1): Promise<AckResult> {
          return {
            schemaVersion: "room_event_ack_receipt.v1",
            receiptId: "receipt_corrupt000000001",
            roomId: entry.roomId,
            eventId: entry.eventId,
            sequence: entry.sequence,
            eventHash: sha256("wrong"),
            idempotencyKey: entry.idempotencyKey,
            committedAt: NOW.toISOString(),
          };
        },
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const root = temporaryRoot("quarantine");
      try {
        const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
        store.create(ledger());
        const lock = new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot" });
        const sync = new ExplicitRoomSync({ store, lock, port: item.port });
        await assert.rejects(sync.sync(ROOM_ID, { now: () => NOW }), /quarantined/u);
        const state = store.read(ROOM_ID);
        assert.equal(state.cursor, 0);
        assert.equal(state.quarantine?.errorCode, item.code);
        assert.equal(sync.readStatus(ROOM_ID, NOW).recoveryRequired, true);
      } finally {
        removeRoot(root);
      }
    });
  }
});

test("cursor 410 reconciles live body-free state, tombstones, high-water, and permanent gap warning", async () => {
  const root = temporaryRoot("cursor-gone");
  try {
    const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
    store.create(ledger({ cursor: 1, highWater: 1 }));
    let acknowledgements = 0;
    const response: CursorGone = {
      schemaVersion: "cursor_gone.v1",
      roomId: ROOM_ID,
      afterSequence: 1,
      highWater: 8,
      earliestReplayableSequence: 5,
      liveEvents: [roomEvent(5), roomEvent(8)],
      tombstoneIds: ["interaction_removed000000001"],
    };
    const port: RoomSyncPort = {
      async fetchEvents(): Promise<CursorGone> { return structuredClone(response); },
      async acknowledge(): Promise<AckResult> { acknowledgements += 1; throw new Error("410 reconciliation does not ACK historical events"); },
    };
    const sync = new ExplicitRoomSync({
      store,
      lock: new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot" }),
      port,
    });
    const result = await sync.sync(ROOM_ID, { now: () => NOW });
    assert.equal(result.cursor, 8);
    assert.equal(result.highWater, 8);
    assert.deepEqual(result.events.map((event) => event.sequence), [5, 8]);
    assert.deepEqual(result.tombstoneIds, ["interaction_removed000000001"]);
    assert.equal(result.gapWarning?.earliestReplayableSequence, 5);
    assert.equal(acknowledgements, 0);
    assert.doesNotThrow(() => assertBodyFree(result));
  } finally {
    removeRoot(root);
  }
});

test("same event ID with a different canonical hash quarantines and never ACKs or advances", async () => {
  const root = temporaryRoot("event-conflict");
  try {
    const original = roomEvent(1);
    const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
    store.create(ledger({ events: [original] }));
    let acknowledgements = 0;
    const port: RoomSyncPort = {
      async fetchEvents(): Promise<RoomEventBatch> {
        return {
          schemaVersion: "room_event_batch.v1",
          roomId: ROOM_ID,
          afterSequence: 0,
          highWater: 1,
          events: [{ ...original, payloadHash: sha256("conflicting-payload") }],
        };
      },
      async acknowledge(): Promise<AckResult> {
        acknowledgements += 1;
        throw new Error("conflicting event must not ACK");
      },
    };
    const sync = new ExplicitRoomSync({
      store,
      lock: new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot" }),
      port,
    });
    await assert.rejects(sync.sync(ROOM_ID, { now: () => NOW }), /event hash conflict/u);
    const state = store.read(ROOM_ID);
    assert.equal(state.cursor, 0);
    assert.equal(state.quarantine?.errorCode, "event_hash_conflict");
    assert.equal(acknowledgements, 0);
  } finally {
    removeRoot(root);
  }
});

test("expired or revoked binding has zero network authority", async () => {
  for (const state of [
    ledger({ bindingExpiresAt: NOW.toISOString() }),
    ledger({ bindingRevokedAt: new Date(NOW.getTime() - 1_000).toISOString() }),
  ]) {
    const root = temporaryRoot("binding");
    try {
      const store = new FileBodyFreeLedgerStore(join(root, "ledger"));
      store.create(state);
      const port = new FakeRoomSyncPort(ROOM_ID);
      const sync = new ExplicitRoomSync({
        store,
        lock: new ProtectedRoomLock({ root: join(root, "locks"), bootId: "boot" }),
        port,
      });
      await assert.rejects(sync.sync(ROOM_ID, { now: () => NOW }), /binding_unavailable/u);
      assert.equal(port.fetchCount, 0);
      assert.equal(port.ackCount, 0);
    } finally {
      removeRoot(root);
    }
  }
});
