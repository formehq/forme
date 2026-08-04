import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { canonicalSha256, type Sha256 } from "../../r4-protocol/src/index.ts";
import { assertBodyFree, stableJson } from "./body-free.ts";
import {
  PROTECTED_ROOM_OPERATION_CLASSES,
  type LockLease,
  type ProtectedRoomLock,
  type ProtectedRoomOperationClass,
} from "./lock.ts";
import {
  isExactIsoTimestamp,
  isLocalToken,
  isPrefixedId,
  isSha256,
  isUuid,
  parseExactPersistedRecord,
} from "./persisted-record.ts";
// These records authorize crash takeover/replay, so every persisted field is closed and validated.

export type RoomMutationClass = ProtectedRoomOperationClass;

export interface RoomMutationContext {
  readonly roomId: string;
  readonly operationClass: RoomMutationClass;
  readonly lockNonce: string;
}

export interface InteractionLeaseRecordV1 {
  readonly schemaVersion: "local_interaction_lease.v1";
  readonly roomId: string;
  readonly interactionId: string;
  readonly operationClass: "response_prepare" | "candidate_cleanup";
  readonly processId: number;
  readonly bootId: string;
  readonly startedAt: string;
  readonly nonce: string;
}

export interface InteractionLeaseV1 {
  readonly record: InteractionLeaseRecordV1;
  release(): void;
}

function validRoomId(value: string): void {
  if (!/^room_[A-Za-z0-9_-]{16,128}$/u.test(value)) throw new Error("invalid Room ID");
}

function validInteractionId(value: string): void {
  if (!/^interaction_[A-Za-z0-9_-]{16,128}$/u.test(value)) throw new Error("invalid Interaction ID");
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function atomicBodyFreeJson(path: string, value: unknown): void {
  assertBodyFree(value);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${stableJson(value)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

/** Distinct long-lived lease for one body-bearing Interaction preparation. */
export class ProtectedInteractionLeaseStore {
  readonly root: string;
  readonly bootId: string;
  readonly isProcessLive: (processId: number, bootId: string) => "live" | "dead" | "ambiguous";

  constructor(input: {
    root: string;
    bootId: string;
    isProcessLive?: (processId: number, bootId: string) => "live" | "dead" | "ambiguous";
  }) {
    this.root = input.root;
    this.bootId = input.bootId;
    this.isProcessLive = input.isProcessLive ?? ((processId, bootId) => {
      if (bootId !== this.bootId) return "dead";
      try {
        process.kill(processId, 0);
        return "live";
      } catch {
        return "dead";
      }
    });
  }

  private leasePath(roomId: string, interactionId: string): string {
    validRoomId(roomId);
    validInteractionId(interactionId);
    return join(this.root, `${roomId}--${interactionId}.lease.json`);
  }

  inspect(roomId: string, interactionId: string): InteractionLeaseRecordV1 | null {
    const path = this.leasePath(roomId, interactionId);
    if (!existsSync(path)) return null;
    const value = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "interactionId", "operationClass", "processId", "bootId", "startedAt", "nonce",
    ], "ambiguous protected Interaction lease") as unknown as InteractionLeaseRecordV1;
    if (
      value.schemaVersion !== "local_interaction_lease.v1"
      || value.roomId !== roomId
      || value.interactionId !== interactionId
      || (value.operationClass !== "response_prepare" && value.operationClass !== "candidate_cleanup")
      || !Number.isSafeInteger(value.processId)
      || value.processId <= 0
      || !isLocalToken(value.bootId)
      || !isExactIsoTimestamp(value.startedAt)
      || !isUuid(value.nonce)
    ) throw new Error("ambiguous protected Interaction lease");
    assertBodyFree(value);
    return value;
  }

  acquire(
    roomId: string,
    interactionId: string,
    operationClass: InteractionLeaseRecordV1["operationClass"],
    now = new Date(),
  ): InteractionLeaseV1 {
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const path = this.leasePath(roomId, interactionId);
    const record: InteractionLeaseRecordV1 = {
      schemaVersion: "local_interaction_lease.v1",
      roomId,
      interactionId,
      operationClass,
      processId: process.pid,
      bootId: this.bootId,
      startedAt: now.toISOString(),
      nonce: crypto.randomUUID(),
    };
    let descriptor: number;
    try {
      descriptor = openSync(path, "wx", 0o600);
    } catch {
      const current = this.inspect(roomId, interactionId);
      if (!current) throw new Error("protected Interaction lease race");
      throw new Error(`protected Interaction is busy:${this.isProcessLive(current.processId, current.bootId)}`);
    }
    try {
      writeFileSync(descriptor, `${stableJson(record)}\n`, "utf8");
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    syncDirectory(this.root);
    let released = false;
    return {
      record,
      release: () => {
        if (released) return;
        const current = this.inspect(roomId, interactionId);
        if (!current || current.nonce !== record.nonce) throw new Error("protected Interaction lease ownership changed");
        rmSync(path);
        syncDirectory(this.root);
        released = true;
      },
    };
  }

  recoverStale(roomId: string, interactionId: string): InteractionLeaseRecordV1 {
    const record = this.inspect(roomId, interactionId);
    if (!record) throw new Error("no protected Interaction lease to recover");
    const state = this.isProcessLive(record.processId, record.bootId);
    if (state !== "dead") throw new Error(`protected Interaction lease recovery denied:${state}`);
    rmSync(this.leasePath(roomId, interactionId));
    syncDirectory(this.root);
    return record;
  }
}

export interface StaleReplayReceiptV1 {
  readonly schemaVersion: "local_stale_replay_receipt.v1";
  readonly roomId: string;
  readonly journalId: string;
  readonly journalHash: Sha256;
  readonly replayIdempotencyKey: string;
  readonly recoveredOperationClass: ProtectedRoomOperationClass;
  readonly recoveredLockNonceHash: Sha256;
  readonly replayReceiptId: string;
  readonly completedAt: string;
}

interface StaleReplayJournalV1 {
  readonly schemaVersion: "local_stale_replay_journal.v1";
  readonly roomId: string;
  readonly journalId: string;
  readonly journalHash: Sha256;
  readonly replayIdempotencyKey: string;
  readonly recoveredOperationClass: ProtectedRoomOperationClass;
  readonly recoveredLockNonceHash: Sha256;
  readonly startedAt: string;
}

/**
 * One coordinator for every short body-free mutation in an exact Room. Long
 * response preparation additionally owns the separate Interaction lease.
 */
export class ProtectedRoomMutationCoordinator {
  readonly lock: ProtectedRoomLock;
  readonly interactionLeases: ProtectedInteractionLeaseStore;
  readonly replayRoot: string;
  private readonly contexts = new WeakSet<object>();

  constructor(input: {
    lock: ProtectedRoomLock;
    interactionLeases: ProtectedInteractionLeaseStore;
    replayRoot: string;
  }) {
    this.lock = input.lock;
    this.interactionLeases = input.interactionLeases;
    this.replayRoot = input.replayRoot;
  }

  async run<T>(roomId: string, operationClass: RoomMutationClass, operation: (context: RoomMutationContext) => Promise<T> | T, now = new Date()): Promise<T> {
    const lease = this.lock.acquire(roomId, operationClass, now);
    try {
      return await operation(this.contextFor(lease));
    } finally {
      lease.release();
    }
  }

  runSync<T>(roomId: string, operationClass: RoomMutationClass, operation: (context: RoomMutationContext) => T, now = new Date()): T {
    const lease = this.lock.acquire(roomId, operationClass, now);
    try {
      return operation(this.contextFor(lease));
    } finally {
      lease.release();
    }
  }

  assertContext(context: RoomMutationContext, roomId: string): void {
    if (!this.contexts.has(context) || context.roomId !== roomId) throw new Error("invalid protected Room mutation context");
    const current = this.lock.inspect(roomId);
    if (!current || current.nonce !== context.lockNonce) throw new Error("expired protected Room mutation context");
  }

  private contextFor(lease: LockLease): RoomMutationContext {
    const context: RoomMutationContext = Object.freeze({
      roomId: lease.record.roomId,
      operationClass: lease.record.operationClass,
      lockNonce: lease.record.nonce,
    });
    this.contexts.add(context);
    return context;
  }

  beginInteractionOperation(input: {
    roomId: string;
    interactionId: string;
    operationClass: "response_prepare" | "candidate_cleanup";
    now?: Date;
  }): InteractionLeaseV1 {
    return this.interactionLeases.acquire(
      input.roomId,
      input.interactionId,
      input.operationClass,
      input.now,
    );
  }

  private replayReceiptPath(roomId: string, journalId: string): string {
    validRoomId(roomId);
    if (!/^journal_[A-Za-z0-9_-]{16,128}$/u.test(journalId)) throw new Error("invalid journal ID");
    return join(this.replayRoot, `${roomId}--${journalId}.json`);
  }

  private replayJournalPath(roomId: string, journalId: string): string {
    return `${this.replayReceiptPath(roomId, journalId)}.pending`;
  }

  /**
   * Explicit reconcile only. The callback must use the supplied stable key;
   * this fake analogue then demonstrates one committed replay and a durable
   * body-free receipt. Physical launcher/process proof remains Gate B.
   */
  async recoverStaleAndReplay(input: {
    roomId: string;
    journalId: string;
    journalHash: Sha256;
    now: Date;
    replay: (idempotencyKey: string) => Promise<{ receiptId: string }>;
  }): Promise<{ receipt: StaleReplayReceiptV1; replayed: boolean }> {
    validRoomId(input.roomId);
    if (!isPrefixedId(input.journalId, "journal")) throw new Error("invalid journal ID");
    if (!isSha256(input.journalHash)) throw new Error("invalid journal hash");
    if (!isExactIsoTimestamp(input.now.toISOString())) throw new Error("invalid replay time");
    const receiptPath = this.replayReceiptPath(input.roomId, input.journalId);
    const journalPath = this.replayJournalPath(input.roomId, input.journalId);
    if (existsSync(receiptPath)) {
      const resumed = this.acquireReplayLease(input.roomId, input.now);
      try {
        const receipt = this.readReplayReceipt(receiptPath, input);
        rmSync(journalPath, { force: true });
        syncDirectory(this.replayRoot);
        return { receipt, replayed: false };
      } finally {
        resumed.lease.release();
      }
    }
    let lease: LockLease;
    let replayJournal: StaleReplayJournalV1;
    if (existsSync(journalPath)) {
      replayJournal = this.readReplayJournal(journalPath, input);
      lease = this.acquireReplayLease(input.roomId, input.now).lease;
    } else {
      const takeover = this.lock.takeoverStale(input.roomId, "room_reconcile", input.now);
      lease = takeover.lease;
      const replayIdempotencyKey = `replay_${canonicalSha256({
        roomId: input.roomId,
        journalId: input.journalId,
        journalHash: input.journalHash,
      }).slice(7, 39)}`;
      replayJournal = {
        schemaVersion: "local_stale_replay_journal.v1",
        roomId: input.roomId,
        journalId: input.journalId,
        journalHash: input.journalHash,
        replayIdempotencyKey,
        recoveredOperationClass: takeover.recovered.operationClass,
        recoveredLockNonceHash: canonicalSha256(takeover.recovered.nonce),
        startedAt: input.now.toISOString(),
      };
      atomicBodyFreeJson(journalPath, replayJournal);
    }
    try {
      if (existsSync(receiptPath)) {
        const receipt = this.readReplayReceipt(receiptPath, input);
        rmSync(journalPath, { force: true });
        syncDirectory(this.replayRoot);
        return { receipt, replayed: false };
      }
      const result = await input.replay(replayJournal.replayIdempotencyKey);
      const receipt: StaleReplayReceiptV1 = {
        schemaVersion: "local_stale_replay_receipt.v1",
        roomId: input.roomId,
        journalId: input.journalId,
        journalHash: input.journalHash,
        replayIdempotencyKey: replayJournal.replayIdempotencyKey,
        recoveredOperationClass: replayJournal.recoveredOperationClass,
        recoveredLockNonceHash: replayJournal.recoveredLockNonceHash,
        replayReceiptId: result.receiptId,
        completedAt: input.now.toISOString(),
      };
      atomicBodyFreeJson(receiptPath, receipt);
      rmSync(journalPath, { force: true });
      syncDirectory(this.replayRoot);
      return { receipt, replayed: true };
    } finally {
      lease.release();
    }
  }

  private readReplayJournal(path: string, input: { roomId: string; journalId: string; journalHash: Sha256 }): StaleReplayJournalV1 {
    const value = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "journalId", "journalHash", "replayIdempotencyKey",
      "recoveredOperationClass", "recoveredLockNonceHash", "startedAt",
    ], "stale replay journal binding conflict") as unknown as StaleReplayJournalV1;
    if (
      value.schemaVersion !== "local_stale_replay_journal.v1"
      || value.roomId !== input.roomId
      || value.journalId !== input.journalId
      || value.journalHash !== input.journalHash
      || !/^replay_[A-Za-z0-9_-]{16,128}$/u.test(value.replayIdempotencyKey)
      || !PROTECTED_ROOM_OPERATION_CLASSES.includes(value.recoveredOperationClass)
      || !isSha256(value.recoveredLockNonceHash)
      || !isExactIsoTimestamp(value.startedAt)
    ) throw new Error("stale replay journal binding conflict");
    assertBodyFree(value);
    return value;
  }

  private acquireReplayLease(roomId: string, now: Date): { lease: LockLease } {
    const current = this.lock.inspect(roomId);
    if (!current) return { lease: this.lock.acquire(roomId, "room_reconcile", now) };
    const state = this.lock.isProcessLive(current.processId, current.bootId);
    if (state !== "dead") throw new Error(`protected Room lock recovery denied:${state}`);
    return { lease: this.lock.takeoverStale(roomId, "room_reconcile", now).lease };
  }

  private readReplayReceipt(path: string, input: { roomId: string; journalId: string; journalHash: Sha256 }): StaleReplayReceiptV1 {
    const value = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "journalId", "journalHash", "replayIdempotencyKey",
      "recoveredOperationClass", "recoveredLockNonceHash", "replayReceiptId", "completedAt",
    ], "stale replay receipt binding conflict") as unknown as StaleReplayReceiptV1;
    if (
      value.schemaVersion !== "local_stale_replay_receipt.v1"
      || value.roomId !== input.roomId
      || value.journalId !== input.journalId
      || value.journalHash !== input.journalHash
      || !/^replay_[A-Za-z0-9_-]{16,128}$/u.test(value.replayIdempotencyKey)
      || !PROTECTED_ROOM_OPERATION_CLASSES.includes(value.recoveredOperationClass)
      || !isSha256(value.recoveredLockNonceHash)
      || !/^receipt_[A-Za-z0-9_-]{16,128}$/u.test(value.replayReceiptId)
      || !isExactIsoTimestamp(value.completedAt)
    ) throw new Error("stale replay receipt binding conflict");
    assertBodyFree(value);
    return value;
  }
}

export function coordinatorForRoomLock(lock: ProtectedRoomLock): ProtectedRoomMutationCoordinator {
  const parent = dirname(lock.root);
  return new ProtectedRoomMutationCoordinator({
    lock,
    interactionLeases: new ProtectedInteractionLeaseStore({
      root: join(parent, "interaction-leases"),
      bootId: lock.bootId,
      isProcessLive: lock.isProcessLive,
    }),
    replayRoot: join(parent, "room-replay"),
  });
}
