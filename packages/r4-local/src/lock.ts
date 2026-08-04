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
import { join } from "node:path";
import {
  isExactIsoTimestamp,
  isLocalToken,
  isUuid,
  parseExactPersistedRecord,
} from "./persisted-record.ts";

export const PROTECTED_ROOM_OPERATION_CLASSES = [
  "room_sync",
  "room_reconcile",
  "response_prepare",
  "candidate_review",
  "candidate_cleanup",
  "publication_submit",
  "publication_reconcile",
  "fresh_runtime_begin",
  "fresh_runtime_read",
  "fresh_runtime_cleanup",
  "fresh_runtime_reconcile",
] as const;

export type ProtectedRoomOperationClass = (typeof PROTECTED_ROOM_OPERATION_CLASSES)[number];

function validOperationClass(value: unknown): asserts value is ProtectedRoomOperationClass {
  if (!PROTECTED_ROOM_OPERATION_CLASSES.includes(value as ProtectedRoomOperationClass)) {
    throw new Error("invalid protected Room operation class");
  }
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

export interface LockRecord {
  schemaVersion: "r4.local-lock.v1";
  roomId: string;
  operationClass: ProtectedRoomOperationClass;
  processId: number;
  bootId: string;
  startedAt: string;
  nonce: string;
}

export interface LockLease {
  record: LockRecord;
  release(): void;
}

export class ProtectedRoomLock {
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

  private lockPath(roomId: string): string {
    if (!/^room_[A-Za-z0-9_-]{16,128}$/u.test(roomId)) throw new Error("invalid Room ID");
    return join(this.root, `${roomId}.lock.json`);
  }

  private recoveryPath(roomId: string): string {
    return `${this.lockPath(roomId)}.recovery`;
  }

  inspect(roomId: string): LockRecord | null {
    const path = this.lockPath(roomId);
    if (!existsSync(path)) return null;
    const record = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "operationClass", "processId", "bootId", "startedAt", "nonce",
    ], "ambiguous protected Room lock") as unknown as LockRecord;
    if (
      record.schemaVersion !== "r4.local-lock.v1"
      || record.roomId !== roomId
      || !Number.isSafeInteger(record.processId)
      || record.processId <= 0
      || !isLocalToken(record.bootId)
      || !isExactIsoTimestamp(record.startedAt)
      || !isUuid(record.nonce)
    ) {
      throw new Error("ambiguous protected Room lock");
    }
    try {
      validOperationClass(record.operationClass);
    } catch {
      throw new Error("ambiguous protected Room lock");
    }
    return record;
  }

  acquire(roomId: string, operationClass: ProtectedRoomOperationClass, now = new Date()): LockLease {
    validOperationClass(operationClass);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const path = this.lockPath(roomId);
    if (existsSync(this.recoveryPath(roomId))) throw new Error("protected Room recovery is busy");
    const record: LockRecord = {
      schemaVersion: "r4.local-lock.v1",
      roomId,
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
      const current = this.inspect(roomId);
      if (!current) throw new Error("protected Room lock race");
      throw new Error(`protected Room is busy:${this.isProcessLive(current.processId, current.bootId)}`);
    }
    try {
      writeFileSync(descriptor, `${JSON.stringify(record)}\n`, "utf8");
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
        const current = this.inspect(roomId);
        if (!current || current.nonce !== record.nonce) throw new Error("protected Room lock ownership changed");
        rmSync(path);
        syncDirectory(this.root);
        released = true;
      },
    };
  }

  recoverStale(roomId: string): LockRecord {
    const record = this.inspect(roomId);
    if (!record) throw new Error("no protected Room lock to recover");
    const state = this.isProcessLive(record.processId, record.bootId);
    if (state !== "dead") throw new Error(`protected Room lock recovery denied:${state}`);
    rmSync(this.lockPath(roomId));
    syncDirectory(this.root);
    return record;
  }

  /** Atomically replaces a proven-dead lock without an unlocked gap. */
  takeoverStale(
    roomId: string,
    operationClass: ProtectedRoomOperationClass,
    now = new Date(),
  ): { recovered: LockRecord; lease: LockLease } {
    validOperationClass(operationClass);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const recoveryPath = this.recoveryPath(roomId);
    let recoveryDescriptor: number;
    try {
      recoveryDescriptor = openSync(recoveryPath, "wx", 0o600);
    } catch {
      throw new Error("protected Room recovery is busy");
    }
    try {
      writeFileSync(recoveryDescriptor, `${JSON.stringify({ schemaVersion: "r4.local-lock-recovery.v1", roomId })}\n`, "utf8");
      fsyncSync(recoveryDescriptor);
    } finally {
      closeSync(recoveryDescriptor);
    }
    syncDirectory(this.root);
    try {
      const recovered = this.inspect(roomId);
      if (!recovered) throw new Error("no protected Room lock to recover");
      const state = this.isProcessLive(recovered.processId, recovered.bootId);
      if (state !== "dead") throw new Error(`protected Room lock recovery denied:${state}`);
      const record: LockRecord = {
        schemaVersion: "r4.local-lock.v1",
        roomId,
        operationClass,
        processId: process.pid,
        bootId: this.bootId,
        startedAt: now.toISOString(),
        nonce: crypto.randomUUID(),
      };
      const path = this.lockPath(roomId);
      const temporary = `${path}.takeover-${process.pid}-${crypto.randomUUID()}`;
      const descriptor = openSync(temporary, "wx", 0o600);
      try {
        writeFileSync(descriptor, `${JSON.stringify(record)}\n`, "utf8");
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
      renameSync(temporary, path);
      syncDirectory(this.root);
      rmSync(recoveryPath);
      syncDirectory(this.root);
      let released = false;
      const lease: LockLease = {
        record,
        release: () => {
          if (released) return;
          const current = this.inspect(roomId);
          if (!current || current.nonce !== record.nonce) throw new Error("protected Room lock ownership changed");
          rmSync(path);
          syncDirectory(this.root);
          released = true;
        },
      };
      return { recovered, lease };
    } catch (error) {
      rmSync(recoveryPath, { force: true });
      syncDirectory(this.root);
      throw error;
    }
  }
}
