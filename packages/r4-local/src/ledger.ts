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
import { parseStrictJson } from "../../r4-protocol/src/index.ts";
import { assertBodyFree, assertLedgerShape, stableJson } from "./body-free.ts";
import type { BodyFreeRoomLedger } from "./types.ts";

export interface BodyFreeLedgerStore {
  exists(roomId: string): boolean;
  read(roomId: string): BodyFreeRoomLedger;
  create(ledger: BodyFreeRoomLedger): void;
  write(expectedVersion: number, ledger: BodyFreeRoomLedger): void;
}

function fsyncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export class FileBodyFreeLedgerStore implements BodyFreeLedgerStore {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  private pathFor(roomId: string): string {
    if (!/^room_[A-Za-z0-9_-]{16,128}$/u.test(roomId)) throw new Error("invalid Room ID");
    return join(this.root, `${roomId}.json`);
  }

  exists(roomId: string): boolean {
    return existsSync(this.pathFor(roomId));
  }

  read(roomId: string): BodyFreeRoomLedger {
    const value: unknown = parseStrictJson(readFileSync(this.pathFor(roomId), "utf8"));
    assertLedgerShape(value);
    if (value.roomId !== roomId) throw new Error("local Room ledger Room mismatch");
    return structuredClone(value);
  }

  create(ledger: BodyFreeRoomLedger): void {
    if (this.exists(ledger.roomId)) throw new Error("local Room ledger already exists");
    this.persist(ledger);
  }

  write(expectedVersion: number, ledger: BodyFreeRoomLedger): void {
    const current = this.read(ledger.roomId);
    if (current.version !== expectedVersion) throw new Error("local Room ledger version conflict");
    if (ledger.version !== expectedVersion + 1) throw new Error("local Room ledger version must advance exactly once");
    this.persist(ledger);
  }

  private persist(ledger: BodyFreeRoomLedger): void {
    assertLedgerShape(ledger);
    assertBodyFree(ledger);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const target = this.pathFor(ledger.roomId);
    const temporary = `${target}.tmp-${process.pid}-${crypto.randomUUID()}`;
    const bytes = `${stableJson(ledger)}\n`;
    const descriptor = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(descriptor, bytes, "utf8");
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(temporary, target);
    fsyncDirectory(dirname(target));
  }
}

export function newBodyFreeLedger(input: {
  roomId: string;
  bindingId: string;
  bindingExpiresAt: string;
}): BodyFreeRoomLedger {
  const ledger: BodyFreeRoomLedger = {
    schemaVersion: "r4.local-room-ledger.v1",
    roomId: input.roomId,
    bindingId: input.bindingId,
    cursor: 0,
    highWater: 0,
    bindingExpiresAt: input.bindingExpiresAt,
    bindingRevokedAt: null,
    events: [],
    ackOutbox: [],
    receipts: [],
    tombstoneIds: [],
    gapWarning: null,
    quarantine: null,
    cleanupRequired: false,
    version: 1,
  };
  assertLedgerShape(ledger);
  return ledger;
}

export function removeSyntheticLedgerRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
