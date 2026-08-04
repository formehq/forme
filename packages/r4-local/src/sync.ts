import {
  canonicalSha256,
  ProtocolValidationError,
  validateCursorGoneV1,
  validateRoomEventAckReceiptV1,
  validateRoomEventAckV1,
  validateRoomEventBatchV1,
  validateRoomEventV1,
  type RoomEventAckV1,
} from "../../r4-protocol/src/index.ts";
import type { BodyFreeLedgerStore } from "./ledger.ts";
import type { ProtectedRoomLock } from "./lock.ts";
import {
  coordinatorForRoomLock,
  type ProtectedRoomMutationCoordinator,
  type RoomMutationContext,
} from "./coordinator.ts";
import type {
  AckOutboxEntry,
  BodyFreeRoomEvent,
  BodyFreeRoomLedger,
  CursorGone,
  RoomEventBatch,
  RoomEventLifecycle,
  RoomSyncPort,
  SyncFaultPoint,
  SyncOptions,
} from "./types.ts";

function isCursorGone(value: RoomEventBatch | CursorGone): value is CursorGone {
  return value.schemaVersion === "cursor_gone.v1";
}

export function roomEventHash(event: BodyFreeRoomEvent): `sha256:${string}` {
  return canonicalSha256(validateRoomEventV1(event));
}

function trip(faultAt: SyncFaultPoint | undefined, point: SyncFaultPoint): void {
  if (faultAt === point) throw new Error(`injected sync interruption:${point}`);
}

function advance(store: BodyFreeLedgerStore, ledger: BodyFreeRoomLedger): BodyFreeRoomLedger {
  const next = { ...ledger, version: ledger.version + 1 };
  store.write(ledger.version, next);
  return next;
}

function withQuarantine(
  store: BodyFreeLedgerStore,
  ledger: BodyFreeRoomLedger,
  errorCode: string,
  eventId: string | null,
  now: Date,
): BodyFreeRoomLedger {
  return advance(store, {
    ...ledger,
    quarantine: { errorCode, eventId, observedAt: now.toISOString() },
  });
}

export class ExplicitRoomSync {
  readonly store: BodyFreeLedgerStore;
  readonly lock: ProtectedRoomLock;
  readonly coordinator: ProtectedRoomMutationCoordinator;
  readonly port: RoomSyncPort;
  readonly lifecycle: RoomEventLifecycle;

  constructor(input: {
    store: BodyFreeLedgerStore;
    lock: ProtectedRoomLock;
    port: RoomSyncPort;
    lifecycle?: RoomEventLifecycle;
    coordinator?: ProtectedRoomMutationCoordinator;
  }) {
    this.store = input.store;
    this.lock = input.lock;
    this.coordinator = input.coordinator ?? coordinatorForRoomLock(input.lock);
    this.port = input.port;
    this.lifecycle = input.lifecycle ?? { async apply(): Promise<void> {} };
  }

  readStatus(roomId: string, now = new Date()): {
    roomId: string;
    cursor: number;
    highWater: number;
    pendingAckCount: number;
    recoveryRequired: boolean;
    bindingUsable: boolean;
    version: number;
  } {
    const ledger = this.store.read(roomId);
    return {
      roomId,
      cursor: ledger.cursor,
      highWater: ledger.highWater,
      pendingAckCount: ledger.ackOutbox.length,
      recoveryRequired: ledger.cleanupRequired || ledger.ackOutbox.length > 0 || ledger.quarantine !== null,
      bindingUsable: ledger.bindingRevokedAt === null && Date.parse(ledger.bindingExpiresAt) > now.getTime(),
      version: ledger.version,
    };
  }

  async sync(roomId: string, options: SyncOptions = {}): Promise<BodyFreeRoomLedger> {
    const now = options.now?.() ?? new Date();
    return await this.coordinator.run(roomId, "room_sync", async (context) => {
      let ledger = this.store.read(roomId);
      if (ledger.cleanupRequired) throw new Error("recovery_required:cleanup");
      if (ledger.quarantine) throw new Error(`recovery_required:${ledger.quarantine.errorCode}`);
      if (ledger.bindingRevokedAt !== null || Date.parse(ledger.bindingExpiresAt) <= now.getTime()) {
        throw new Error("binding_unavailable");
      }

      ledger = await this.recoverPendingAcks(ledger, options, context);
      trip(options.faultAt, "before_fetch");
      const rawResult = await this.port.fetchEvents(roomId, ledger.cursor);
      trip(options.faultAt, "after_fetch");
      let result: RoomEventBatch | CursorGone;
      try {
        result = isCursorGone(rawResult)
          ? validateCursorGoneV1(rawResult)
          : validateRoomEventBatchV1(rawResult);
      } catch (error) {
        const code = error instanceof ProtocolValidationError ? error.code : "malformed_sync_response";
        withQuarantine(this.store, ledger, code, null, now);
        throw new Error(`sync quarantined: ${code}`);
      }
      if (result.roomId !== roomId) {
        withQuarantine(this.store, ledger, "wrong_room", null, now);
        throw new Error("sync quarantined: wrong Room");
      }
      if (isCursorGone(result)) return await this.reconcileGone(ledger, result, now, context);
      if (result.afterSequence !== ledger.cursor) {
        withQuarantine(this.store, ledger, "cursor_mismatch", null, now);
        throw new Error("sync quarantined: cursor mismatch");
      }
      for (const event of result.events) {
        const expected = ledger.cursor + 1;
        if (event.sequence !== expected) {
          withQuarantine(this.store, ledger, "sequence_gap", event.eventId, now);
          throw new Error("sync quarantined: sequence gap");
        }
        const existing = ledger.events.find((item) => item.eventId === event.eventId);
        if (existing && roomEventHash(existing) !== roomEventHash(event)) {
          withQuarantine(this.store, ledger, "event_hash_conflict", event.eventId, now);
          throw new Error("sync quarantined: event hash conflict");
        }
        trip(options.faultAt, "before_event_persist");
        const ack: AckOutboxEntry = {
          schemaVersion: "local_room_event_ack_outbox.v1",
          ack: validateRoomEventAckV1({
            schemaVersion: "room_event_ack.v1",
            roomId,
            eventId: event.eventId,
            sequence: event.sequence,
            eventHash: roomEventHash(event),
            idempotencyKey: `ack_${canonicalSha256({ roomId, eventId: event.eventId, sequence: event.sequence }).slice(7, 39)}`,
          }),
          serverReceiptId: null,
        };
        ledger = advance(this.store, {
          ...ledger,
          highWater: Math.max(ledger.highWater, result.highWater),
          events: existing ? ledger.events : [...ledger.events, event],
          ackOutbox: [...ledger.ackOutbox, ack],
        });
        trip(options.faultAt, "after_event_persist");
        ledger = await this.recoverPendingAcks(ledger, options, context);
      }
      if (result.events.length === 0 && ledger.highWater !== result.highWater) {
        ledger = advance(this.store, { ...ledger, highWater: result.highWater });
      }
      return ledger;
    }, now);
  }

  private async recoverPendingAcks(ledger: BodyFreeRoomLedger, options: SyncOptions, context: RoomMutationContext): Promise<BodyFreeRoomLedger> {
    let current = ledger;
    while (current.ackOutbox.length > 0) {
      const entry = current.ackOutbox[0];
      if (!entry) break;
      const event = current.events.find((candidate) =>
        candidate.eventId === entry.ack.eventId && candidate.sequence === entry.ack.sequence
      );
      if (!event || roomEventHash(event) !== entry.ack.eventHash) {
        current = withQuarantine(this.store, current, "ack_event_missing_or_changed", entry.ack.eventId, options.now?.() ?? new Date());
        throw new Error("sync quarantined: ACK event missing or changed");
      }
      // The event is already durable. Deny/cleanup must converge before an ACK
      // can make the hosted cursor advance, including on pending-ACK restart.
      await this.lifecycle.apply(event, options.now?.() ?? new Date(), context);
      trip(options.faultAt, "before_ack");
      let receipt;
      try {
        receipt = validateRoomEventAckReceiptV1(await this.port.acknowledge(entry.ack));
      } catch {
        current = withQuarantine(this.store, current, "malformed_ack_receipt", entry.ack.eventId, options.now?.() ?? new Date());
        throw new Error("sync quarantined: malformed ACK receipt");
      }
      trip(options.faultAt, "after_ack");
      if (
        receipt.roomId !== entry.ack.roomId
        || receipt.eventId !== entry.ack.eventId
        || receipt.sequence !== entry.ack.sequence
        || receipt.eventHash !== entry.ack.eventHash
        || receipt.idempotencyKey !== entry.ack.idempotencyKey
      ) {
        current = withQuarantine(this.store, current, "ack_receipt_mismatch", entry.ack.eventId, options.now?.() ?? new Date());
        throw new Error("sync quarantined: ACK receipt mismatch");
      }
      trip(options.faultAt, "before_ack_receipt_persist");
      current = advance(this.store, {
        ...current,
        ackOutbox: current.ackOutbox.map((item, index) => index === 0
          ? { ...item, serverReceiptId: receipt.receiptId }
          : item),
      });
      trip(options.faultAt, "after_ack_receipt_persist");
      trip(options.faultAt, "before_cursor_persist");
      current = advance(this.store, {
        ...current,
        cursor: entry.ack.sequence,
        ackOutbox: current.ackOutbox.slice(1),
      });
      trip(options.faultAt, "after_cursor_persist");
    }
    return current;
  }

  private async reconcileGone(
    ledger: BodyFreeRoomLedger,
    result: CursorGone,
    now: Date,
    context: RoomMutationContext,
  ): Promise<BodyFreeRoomLedger> {
    const sorted = [...result.liveEvents].sort((left, right) => left.sequence - right.sequence);
    const unique = new Map<string, BodyFreeRoomEvent>();
    for (const event of sorted) {
      const current = unique.get(event.eventId);
      if (current && roomEventHash(current) !== roomEventHash(event)) throw new Error("cursor reconciliation hash conflict");
      unique.set(event.eventId, event);
    }
    let current = advance(this.store, {
      ...ledger,
      highWater: result.highWater,
      events: [...unique.values()],
      tombstoneIds: [...new Set(result.tombstoneIds)].sort(),
      gapWarning: {
        earliestReplayableSequence: result.earliestReplayableSequence,
        observedAt: now.toISOString(),
      },
      ackOutbox: [],
    });
    for (const event of sorted) await this.lifecycle.apply(event, now, context);
    for (const tombstoneId of result.tombstoneIds) {
      await this.lifecycle.applyTombstone?.(result.roomId, tombstoneId, now, context);
    }
    current = advance(this.store, { ...current, cursor: result.highWater });
    return current;
  }
}

export class FakeRoomSyncPort implements RoomSyncPort {
  readonly roomId: string;
  readonly events: BodyFreeRoomEvent[] = [];
  readonly acknowledgements = new Map<string, Awaited<ReturnType<RoomSyncPort["acknowledge"]>>>();
  earliestReplayableSequence = 1;
  fetchCount = 0;
  ackCount = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  append(event: BodyFreeRoomEvent): void {
    const validated = validateRoomEventV1(event);
    if (validated.roomId !== this.roomId) throw new Error("fake port Room mismatch");
    this.events.push(structuredClone(validated));
    this.events.sort((left, right) => left.sequence - right.sequence);
  }

  async fetchEvents(roomId: string, afterSequence: number): Promise<RoomEventBatch | CursorGone> {
    this.fetchCount += 1;
    if (roomId !== this.roomId) throw new Error("fake port Room mismatch");
    const highWater = this.events.at(-1)?.sequence ?? 0;
    if (afterSequence > 0 && afterSequence < this.earliestReplayableSequence - 1) {
      return {
        schemaVersion: "cursor_gone.v1",
        roomId,
        afterSequence,
        highWater,
        earliestReplayableSequence: this.earliestReplayableSequence,
        liveEvents: this.events.filter((event) => event.sequence >= this.earliestReplayableSequence),
        tombstoneIds: [],
      };
    }
    return {
      schemaVersion: "room_event_batch.v1",
      roomId,
      afterSequence,
      highWater,
      events: this.events.filter((event) => event.sequence > afterSequence),
    };
  }

  async acknowledge(rawRequest: RoomEventAckV1): Promise<Awaited<ReturnType<RoomSyncPort["acknowledge"]>>> {
    const request = validateRoomEventAckV1(rawRequest);
    this.ackCount += 1;
    const existing = this.acknowledgements.get(request.idempotencyKey);
    if (existing) {
      if (existing.eventHash !== request.eventHash) throw new Error("idempotency hash conflict");
      return structuredClone(existing);
    }
    const receipt = validateRoomEventAckReceiptV1({
      schemaVersion: "room_event_ack_receipt.v1",
      receiptId: `receipt_${canonicalSha256(request).slice(7, 39)}`,
      roomId: request.roomId,
      eventId: request.eventId,
      sequence: request.sequence,
      eventHash: request.eventHash,
      idempotencyKey: request.idempotencyKey,
      committedAt: "2026-08-03T12:00:00.000Z",
    });
    this.acknowledgements.set(request.idempotencyKey, receipt);
    return structuredClone(receipt);
  }
}
