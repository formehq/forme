import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import {
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../../apps/room/src/synthetic-fixtures.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";

const T0 = "2026-06-01T12:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1_000;

function fixture() {
  let clock = new Date(T0);
  const store = new SyntheticPresenceStore(() => clock);
  const binding = store.roomOperatorBindingBySecret(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET);
  assert.ok(binding);
  store.saveRoomOperatorBinding({
    ...binding,
    expiresAt: new Date(clock.getTime() + 100 * DAY_MS).toISOString(),
  });
  const app = new HostedRoomApplication(store);
  let key = 0;
  return {
    store,
    advance(milliseconds: number) { clock = new Date(clock.getTime() + milliseconds); },
    sync(afterSequence: number) {
      key += 1;
      return app.run({
        definition: operationDefinition("room_operator.sync"),
        params: {},
        body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID, afterSequence },
        authorization: `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`,
        syntheticActor: "room_operator",
        idempotencyKey: `eventcompactionsync${key.toString().padStart(16, "0")}`,
        expectedVersion: null,
      });
    },
  };
}

test("E04 hosted compaction preserves a fresh live reconciliation view, terminal tombstones, and contiguous high-water", async () => {
  const instance = fixture();
  const projectionId = instance.store.room(SYNTHETIC_PUBLIC_ROOM_ID)?.room.currentProjectionId;
  assert.ok(projectionId);
  const live = instance.store.appendEvent(SYNTHETIC_PUBLIC_ROOM_ID, "projection.published", projectionId, 1);
  instance.advance(DAY_MS);
  const terminalId = "interaction_compactionterminal00000001";
  instance.store.appendEvent(SYNTHETIC_PUBLIC_ROOM_ID, "interaction.deleted", terminalId, 2);

  instance.advance(36 * DAY_MS);
  assert.deepEqual(instance.store.compactEvents(), { compactedEvents: 0, reconciliationSnapshots: 0 }, "the exact 37-day boundary remains replayable");
  assert.equal(instance.store.eventsAfter(SYNTHETIC_PUBLIC_ROOM_ID, 0).length, 2);

  instance.advance(1);
  assert.deepEqual(instance.store.compactEvents(), { compactedEvents: 1, reconciliationSnapshots: 1 });
  const replay = instance.store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID);
  assert.equal(replay.highWater, 3);
  assert.equal(replay.earliestReplayableSequence, 2);
  assert.equal(replay.liveEvents.length, 1);
  assert.deepEqual({
    sequence: replay.liveEvents[0]?.sequence,
    objectId: replay.liveEvents[0]?.objectId,
    eventType: replay.liveEvents[0]?.eventType,
    payloadHash: replay.liveEvents[0]?.payloadHash,
  }, {
    sequence: 3,
    objectId: projectionId,
    eventType: live.eventType,
    payloadHash: live.payloadHash,
  });
  assert.deepEqual(replay.tombstoneIds, [terminalId]);

  const gone = await instance.sync(0);
  assert.equal(gone.status, 410);
  assert.deepEqual({
    schemaVersion: gone.body.schemaVersion,
    highWater: gone.body.highWater,
    earliest: gone.body.earliestReplayableSequence,
    liveSequences: (gone.body.liveEvents as Array<{ sequence: number }>).map((event) => event.sequence),
    tombstones: gone.body.tombstoneIds,
  }, {
    schemaVersion: "cursor_gone.v1",
    highWater: 3,
    earliest: 2,
    liveSequences: [3],
    tombstones: [terminalId],
  });

  const boundary = await instance.sync(2);
  assert.equal(boundary.status, 200);
  assert.deepEqual((boundary.body.events as Array<{ sequence: number }>).map((event) => event.sequence), [3]);
  const current = await instance.sync(3);
  assert.equal(current.status, 200);
  assert.deepEqual(current.body.events, []);

  const next = instance.store.appendEvent(SYNTHETIC_PUBLIC_ROOM_ID, "room.mode_changed", SYNTHETIC_PUBLIC_ROOM_ID, 2);
  assert.equal(next.sequence, 4, "compaction never derives the next sequence from retained row count");
  const incremental = await instance.sync(3);
  assert.deepEqual((incremental.body.events as Array<{ sequence: number }>).map((event) => event.sequence), [4]);
  await assert.rejects(instance.sync(5), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "cursor_ahead");
    return true;
  });

  instance.advance(DAY_MS - 2);
  assert.deepEqual(instance.store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID).tombstoneIds, [terminalId], "terminal survives until just before its 37-day horizon");
  instance.advance(1);
  instance.store.compactEvents();
  assert.deepEqual(instance.store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID).tombstoneIds, [], "terminal disappears at its exact retention ceiling");
});

test("E04 a terminal-only compacted Room keeps high-water even when no replay row remains", () => {
  let clock = new Date(T0);
  const store = new SyntheticPresenceStore(() => clock);
  const terminalId = "interaction_terminalonlycompact000001";
  store.appendEvent(SYNTHETIC_PUBLIC_ROOM_ID, "interaction.deleted", terminalId, 2);
  clock = new Date(clock.getTime() + 37 * DAY_MS - 1);
  assert.deepEqual(store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID).tombstoneIds, [terminalId]);
  clock = new Date(clock.getTime() + 1);
  assert.deepEqual(store.compactEvents(), { compactedEvents: 0, reconciliationSnapshots: 0 });
  assert.deepEqual(store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID).tombstoneIds, []);
  clock = new Date(clock.getTime() + 1);
  assert.deepEqual(store.compactEvents(), { compactedEvents: 1, reconciliationSnapshots: 0 });
  assert.deepEqual(store.eventsAfter(SYNTHETIC_PUBLIC_ROOM_ID, 0), []);
  assert.deepEqual(store.eventReplayState(SYNTHETIC_PUBLIC_ROOM_ID), {
    highWater: 1,
    earliestReplayableSequence: 2,
    liveEvents: [],
    tombstoneIds: [],
  });
  const next = store.appendEvent(SYNTHETIC_PUBLIC_ROOM_ID, "room.mode_changed", SYNTHETIC_PUBLIC_ROOM_ID, 2);
  assert.equal(next.sequence, 2);
});
