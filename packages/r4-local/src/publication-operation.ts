import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  canonicalSha256,
  validateHostedPublicationDeliveryV1,
  type HostedPublicationDeliveryV1,
  type Sha256,
} from "../../r4-protocol/src/index.ts";
import { assertBodyFree, stableJson } from "./body-free.ts";
import type { ProtectedRoomMutationCoordinator } from "./coordinator.ts";
import {
  isExactIsoTimestamp,
  isPrefixedId,
  isSha256,
  parseExactPersistedRecord,
} from "./persisted-record.ts";

export type LocalPublicationFault =
  | "before_intent_persist"
  | "after_intent_persist"
  | "before_submit"
  | "after_submit"
  | "before_receipt_persist"
  | "after_receipt_persist";

export interface LocalPublicationReceiptV1 {
  readonly schemaVersion: "local_publication_receipt.v1";
  readonly roomId: string;
  readonly requestHash: Sha256;
  readonly idempotencyKey: string;
  readonly hostedReceiptId: string;
  readonly completedAt: string;
}

interface LocalPublicationIntentV1 {
  readonly schemaVersion: "local_publication_intent.v1";
  readonly roomId: string;
  readonly requestHash: Sha256;
  readonly idempotencyKey: string;
  readonly startedAt: string;
}

export interface SyntheticPublicationPort {
  submit(delivery: HostedPublicationDeliveryV1, idempotencyKey: string): Promise<{ receiptId: string }>;
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function atomicBodyFree(path: string, value: unknown): void {
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

function trip(selected: LocalPublicationFault | undefined, point: LocalPublicationFault): void {
  if (selected === point) throw new Error(`injected local publication interruption:${point}`);
}

export class SyntheticLocalPublicationOperation {
  readonly root: string;
  readonly coordinator: ProtectedRoomMutationCoordinator;
  readonly port: SyntheticPublicationPort;

  constructor(input: { root: string; coordinator: ProtectedRoomMutationCoordinator; port: SyntheticPublicationPort }) {
    this.root = input.root;
    this.coordinator = input.coordinator;
    this.port = input.port;
  }

  async submit(input: {
    roomId: string;
    delivery: HostedPublicationDeliveryV1;
    now: Date;
    faultAt?: LocalPublicationFault;
  }): Promise<LocalPublicationReceiptV1> {
    const delivery = validateHostedPublicationDeliveryV1(input.delivery);
    if (delivery.attestation.roomId !== input.roomId) throw new Error("local publication Room binding mismatch");
    const requestHash = canonicalSha256(delivery);
    const idempotencyKey = `publication_${canonicalSha256({ roomId: input.roomId, requestHash }).slice(7, 39)}`;
    const intentPath = join(this.root, `${idempotencyKey}.intent.json`);
    const receiptPath = join(this.root, `${idempotencyKey}.receipt.json`);
    return await this.coordinator.run(input.roomId, "publication_submit", async () => {
      if (existsSync(receiptPath)) return this.readReceipt(receiptPath, input.roomId, requestHash, idempotencyKey);
      trip(input.faultAt, "before_intent_persist");
      if (!existsSync(intentPath)) {
        atomicBodyFree(intentPath, {
          schemaVersion: "local_publication_intent.v1",
          roomId: input.roomId,
          requestHash,
          idempotencyKey,
          startedAt: input.now.toISOString(),
        });
      } else {
        this.readIntent(intentPath, input.roomId, requestHash, idempotencyKey);
      }
      trip(input.faultAt, "after_intent_persist");
      trip(input.faultAt, "before_submit");
      const hosted = await this.port.submit(delivery, idempotencyKey);
      trip(input.faultAt, "after_submit");
      trip(input.faultAt, "before_receipt_persist");
      const receipt: LocalPublicationReceiptV1 = {
        schemaVersion: "local_publication_receipt.v1",
        roomId: input.roomId,
        requestHash,
        idempotencyKey,
        hostedReceiptId: hosted.receiptId,
        completedAt: input.now.toISOString(),
      };
      atomicBodyFree(receiptPath, receipt);
      trip(input.faultAt, "after_receipt_persist");
      return receipt;
    }, input.now);
  }

  private readReceipt(path: string, roomId: string, requestHash: Sha256, idempotencyKey: string): LocalPublicationReceiptV1 {
    const value = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "requestHash", "idempotencyKey", "hostedReceiptId", "completedAt",
    ], "local publication receipt binding mismatch") as unknown as LocalPublicationReceiptV1;
    if (
      value.schemaVersion !== "local_publication_receipt.v1"
      || value.roomId !== roomId
      || value.requestHash !== requestHash
      || value.idempotencyKey !== idempotencyKey
      || !isPrefixedId(value.roomId, "room")
      || !isSha256(value.requestHash)
      || !isPrefixedId(value.idempotencyKey, "publication")
      || !/^receipt_[A-Za-z0-9_-]{16,128}$/u.test(value.hostedReceiptId)
      || !isExactIsoTimestamp(value.completedAt)
    ) throw new Error("local publication receipt binding mismatch");
    assertBodyFree(value);
    return value;
  }

  private readIntent(path: string, roomId: string, requestHash: Sha256, idempotencyKey: string): LocalPublicationIntentV1 {
    const value = parseExactPersistedRecord(readFileSync(path, "utf8"), [
      "schemaVersion", "roomId", "requestHash", "idempotencyKey", "startedAt",
    ], "local publication intent binding mismatch") as unknown as LocalPublicationIntentV1;
    if (
      value.schemaVersion !== "local_publication_intent.v1"
      || value.roomId !== roomId
      || value.requestHash !== requestHash
      || value.idempotencyKey !== idempotencyKey
      || !isPrefixedId(value.roomId, "room")
      || !isSha256(value.requestHash)
      || !isPrefixedId(value.idempotencyKey, "publication")
      || !isExactIsoTimestamp(value.startedAt)
    ) throw new Error("local publication intent binding mismatch");
    assertBodyFree(value);
    return value;
  }
}

export class FakeSyntheticPublicationPort implements SyntheticPublicationPort {
  private readonly commits = new Map<string, { requestHash: Sha256; receiptId: string }>();
  attempts = 0;

  async submit(delivery: HostedPublicationDeliveryV1, idempotencyKey: string): Promise<{ receiptId: string }> {
    this.attempts += 1;
    const requestHash = canonicalSha256(validateHostedPublicationDeliveryV1(delivery));
    const current = this.commits.get(idempotencyKey);
    if (current) {
      if (current.requestHash !== requestHash) throw new Error("synthetic publication idempotency conflict");
      return { receiptId: current.receiptId };
    }
    const committed = {
      requestHash,
      receiptId: `receipt_${canonicalSha256({ idempotencyKey, requestHash }).slice(7, 39)}`,
    };
    this.commits.set(idempotencyKey, committed);
    return { receiptId: committed.receiptId };
  }

  committedCount(): number { return this.commits.size; }
}
