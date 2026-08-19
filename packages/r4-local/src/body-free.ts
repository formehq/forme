import { createHash } from "node:crypto";
import {
  canonicalJson,
  validateRoomEventAckV1,
  validateRoomEventV1,
} from "../../r4-protocol/src/index.ts";
import { isExactIsoTimestamp, isPrefixedId, isSha256 } from "./persisted-record.ts";
import type { AckOutboxEntry, BodyFreeReceipt, BodyFreeRoomLedger, Hash } from "./types.ts";

const FORBIDDEN_KEYS = new Set([
  "body",
  "request",
  "requesttext",
  "requestbody",
  "response",
  "responsetext",
  "responsebody",
  "candidate",
  "candidatebody",
  "candidatetext",
  "guestcapsule",
  "email",
  "emailaddress",
  "address",
  "secret",
  "rawsecret",
  "token",
  "credential",
  "verificationcode",
  "replyurl",
  "sourcepath",
  "path",
  "transcript",
  "prompt",
  "candidateplaintext",
  "toolarguments",
  "tooloutput",
  "rawip",
  "useragent",
]);

const FORBIDDEN_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /FORME_(?:PRIVATE|GUEST|CREDENTIAL|TRANSCRIPT)_CANARY/u,
  /(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{12,}/u,
  /https?:\/\/[^\s#]+#[A-Za-z0-9_-]{16,}/u,
];

export function sha256(value: string | Uint8Array): Hash {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function stableJson(value: unknown): string {
  return canonicalJson(value);
}

export function assertBodyFree(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(value)) throw new Error(`body-free contract failed at ${path}: forbidden value`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertBodyFree(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z]/gu, "");
    if (FORBIDDEN_KEYS.has(normalized)) {
      throw new Error(`body-free contract failed at ${path}.${key}: forbidden key`);
    }
    assertBodyFree(child, `${path}.${key}`);
  }
}

export function assertLedgerShape(value: unknown): asserts value is BodyFreeRoomLedger {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("local Room ledger is not an object");
  }
  assertBodyFree(value);
  const ledger = value as Partial<BodyFreeRoomLedger>;
  assertExactLocalKeys(value as Record<string, unknown>, [
    "schemaVersion", "roomId", "bindingId", "cursor", "highWater", "bindingExpiresAt", "bindingRevokedAt",
    "events", "ackOutbox", "receipts", "tombstoneIds", "gapWarning", "quarantine", "cleanupRequired", "version",
  ]);
  if (
    ledger.schemaVersion !== "r4.local-room-ledger.v1"
    || !isPrefixedId(ledger.roomId, "room")
    || !isPrefixedId(ledger.bindingId, "binding")
    || !Number.isSafeInteger(ledger.cursor) || (ledger.cursor ?? -1) < 0
    || !Number.isSafeInteger(ledger.highWater) || (ledger.highWater ?? -1) < 0
    || (ledger.cursor ?? 0) > (ledger.highWater ?? 0)
    || !isExactIsoTimestamp(ledger.bindingExpiresAt)
    || (ledger.bindingRevokedAt !== null && !isExactIsoTimestamp(ledger.bindingRevokedAt))
    || !Array.isArray(ledger.events)
    || !Array.isArray(ledger.ackOutbox)
    || !Array.isArray(ledger.receipts)
    || !Array.isArray(ledger.tombstoneIds)
    || typeof ledger.cleanupRequired !== "boolean"
    || !Number.isSafeInteger(ledger.version) || (ledger.version ?? 0) < 1
  ) {
    throw new Error("local Room ledger contract failed");
  }
  for (const event of ledger.events) {
    const validated = validateRoomEventV1(event);
    if (validated.roomId !== ledger.roomId) throw new Error("local Room ledger event Room mismatch");
  }
  for (const entry of ledger.ackOutbox) assertAckOutboxEntry(entry, ledger.roomId);
  for (const receipt of ledger.receipts) assertBodyFreeReceipt(receipt, ledger.roomId);
  for (const tombstoneId of ledger.tombstoneIds) {
    if (typeof tombstoneId !== "string" || !/^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u.test(tombstoneId)) {
      throw new Error("local Room ledger tombstone ID is invalid");
    }
  }
  if (ledger.gapWarning !== null) {
    if (ledger.gapWarning === undefined || typeof ledger.gapWarning !== "object" || Array.isArray(ledger.gapWarning)) {
      throw new Error("local Room ledger gap warning is invalid");
    }
    assertExactLocalKeys(ledger.gapWarning as unknown as Record<string, unknown>, ["earliestReplayableSequence", "observedAt"]);
    if (!Number.isSafeInteger(ledger.gapWarning.earliestReplayableSequence)
      || ledger.gapWarning.earliestReplayableSequence < 1
      || !isExactIsoTimestamp(ledger.gapWarning.observedAt)) throw new Error("local Room ledger gap warning is invalid");
  }
  if (ledger.quarantine !== null) {
    if (ledger.quarantine === undefined || typeof ledger.quarantine !== "object" || Array.isArray(ledger.quarantine)) {
      throw new Error("local Room ledger quarantine is invalid");
    }
    assertExactLocalKeys(ledger.quarantine as unknown as Record<string, unknown>, ["errorCode", "eventId", "observedAt"]);
    if (typeof ledger.quarantine.errorCode !== "string" || !/^[a-z0-9_]{1,128}$/u.test(ledger.quarantine.errorCode)
      || (ledger.quarantine.eventId !== null && !isPrefixedId(ledger.quarantine.eventId, "event"))
      || !isExactIsoTimestamp(ledger.quarantine.observedAt)) throw new Error("local Room ledger quarantine is invalid");
  }
}

function assertExactLocalKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error("local Room ledger contains unknown or missing fields");
  }
}

function assertAckOutboxEntry(value: unknown, roomId: string): asserts value is AckOutboxEntry {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("local ACK outbox entry is invalid");
  const entry = value as Partial<AckOutboxEntry>;
  assertExactLocalKeys(value as Record<string, unknown>, ["schemaVersion", "ack", "serverReceiptId"]);
  if (entry.schemaVersion !== "local_room_event_ack_outbox.v1") throw new Error("local ACK outbox entry is invalid");
  const ack = validateRoomEventAckV1(entry.ack);
  if (ack.roomId !== roomId) throw new Error("local ACK outbox Room mismatch");
  if (entry.serverReceiptId !== null && !isPrefixedId(entry.serverReceiptId, "receipt")) {
    throw new Error("local ACK outbox receipt ID is invalid");
  }
}

function assertBodyFreeReceipt(value: unknown, roomId: string): asserts value is BodyFreeReceipt {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("local body-free receipt is invalid");
  const receipt = value as Partial<BodyFreeReceipt>;
  assertExactLocalKeys(value as Record<string, unknown>, [
    "schemaVersion", "receiptId", "roomId", "operation", "objectId", "requestHash", "outcome", "errorCode", "committedAt",
  ]);
  if (
    receipt.schemaVersion !== "r4.body-free-receipt.v1"
    || !isPrefixedId(receipt.receiptId, "receipt")
    || receipt.roomId !== roomId
    || typeof receipt.operation !== "string" || !/^[a-z][a-z0-9_.]{1,127}$/u.test(receipt.operation)
    || (receipt.objectId !== null && (typeof receipt.objectId !== "string" || !/^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u.test(receipt.objectId)))
    || !isSha256(receipt.requestHash)
    || !(["accepted", "no_op", "rejected", "unavailable", "recovered"] as const).includes(receipt.outcome as never)
    || (receipt.errorCode !== null && (typeof receipt.errorCode !== "string" || !/^[a-z0-9_]{1,128}$/u.test(receipt.errorCode)))
    || !isExactIsoTimestamp(receipt.committedAt)
  ) throw new Error("local body-free receipt is invalid");
}
