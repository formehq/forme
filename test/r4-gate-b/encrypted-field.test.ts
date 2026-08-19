import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AES_256_KEY_BYTES,
  ENCRYPTED_COLUMNS,
  ENCRYPTED_FIELD_AAD_SCHEMA_VERSION,
  EncryptedFieldError,
  GATE_B_SYNTHETIC_KEY_ID,
  InMemoryNonceRegistry,
  SyntheticKeyHandle,
  decryptField,
  encryptField,
  readSyntheticKeyFromInheritedFd,
  validateEncryptedFieldV1,
  withDecryptedField,
  type EncryptedFieldAadV1,
  type EncryptedFieldV1,
} from "../../packages/r4-persistence/src/index.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf8", { fatal: true });
const KEY = Uint8Array.from({ length: AES_256_KEY_BYTES }, (_, index) => index + 1);
const OTHER_KEY = Uint8Array.from({ length: AES_256_KEY_BYTES }, (_, index) => 255 - index);
const NONCE_A = Uint8Array.from({ length: 12 }, (_, index) => index + 11);
const NONCE_B = Uint8Array.from({ length: 12 }, (_, index) => index + 31);

const ROOM_ID = "room_abcdefghijklmnop";
const OTHER_ROOM_ID = "room_qrstuvwxyzABCDEF";
const PROJECTION_ID = "projection_abcdefghijklmnop";
const OTHER_ROW_ID = "projection_qrstuvwxyzABCDEF";

function aad(overrides: Partial<EncryptedFieldAadV1> = {}): EncryptedFieldAadV1 {
  return {
    schemaVersion: ENCRYPTED_FIELD_AAD_SCHEMA_VERSION,
    table: "projections",
    column: "capsule_ciphertext",
    roomId: ROOM_ID,
    rowId: PROJECTION_ID,
    objectVersion: 1,
    ...overrides,
  };
}

function key(bytes = KEY): SyntheticKeyHandle {
  return new SyntheticKeyHandle(bytes);
}

function expectCode(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof EncryptedFieldError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    assert.doesNotMatch(error.stack ?? "", /FORME_(?:PRIVATE|GUEST|CREDENTIAL)_CANARY/u);
    return true;
  });
}

function encryptedFixture(plaintext = "FORME_PRIVATE_CANARY_projection_capsule"): {
  envelope: EncryptedFieldV1;
  keyHandle: SyntheticKeyHandle;
} {
  const keyHandle = key();
  const { envelope } = encryptField({
    key: keyHandle,
    plaintext: encoder.encode(plaintext),
    aad: aad(),
    nonceRegistry: new InMemoryNonceRegistry(),
    nonceSource: () => NONCE_A,
  });
  return { envelope, keyHandle };
}

function flipCanonicalCharacter(value: string): string {
  return `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
}

test("AES-256-GCM round trip is canonical and binds exact AAD", () => {
  const plaintext = "FORME_PRIVATE_CANARY_projection_capsule";
  const { envelope, keyHandle } = encryptedFixture(plaintext);
  assert.deepEqual(Object.keys(envelope).sort(), [
    "aadHash", "algorithm", "ciphertext", "keyId", "nonce", "schemaVersion", "tag",
  ]);
  assert.equal(envelope.schemaVersion, "a256gcm.v1");
  assert.equal(envelope.algorithm, "AES-256-GCM");
  assert.equal(envelope.keyId, GATE_B_SYNTHETIC_KEY_ID);
  assert.doesNotMatch(envelope.nonce + envelope.ciphertext + envelope.tag, /=/u);
  assert.doesNotMatch(JSON.stringify(envelope), /FORME_PRIVATE_CANARY/u);
  const recovered = decryptField({ key: keyHandle, envelope, aad: aad(), bodyReadable: true });
  assert.equal(decoder.decode(recovered), plaintext);
  recovered.fill(0);
  keyHandle.close();
});

test("wrong key and modified nonce tag ciphertext key ID or AAD fail closed", () => {
  const { envelope, keyHandle } = encryptedFixture();
  const wrongKey = key(OTHER_KEY);
  expectCode(() => decryptField({ key: wrongKey, envelope, aad: aad(), bodyReadable: true }), "AUTHENTICATION_FAILED");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, nonce: flipCanonicalCharacter(envelope.nonce) }, aad: aad(), bodyReadable: true }), "AUTHENTICATION_FAILED");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, tag: flipCanonicalCharacter(envelope.tag) }, aad: aad(), bodyReadable: true }), "AUTHENTICATION_FAILED");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, ciphertext: flipCanonicalCharacter(envelope.ciphertext) }, aad: aad(), bodyReadable: true }), "AUTHENTICATION_FAILED");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, keyId: "r4.hosted.other.v1" }, aad: aad(), bodyReadable: true }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, aadHash: `sha256:${"0".repeat(64)}` }, aad: aad(), bodyReadable: true }), "AAD_MISMATCH");
  wrongKey.close();
  keyHandle.close();
});

test("row column Room and object-version swaps cannot decrypt", () => {
  const { envelope, keyHandle } = encryptedFixture();
  expectCode(() => decryptField({ key: keyHandle, envelope, aad: aad({ rowId: OTHER_ROW_ID }), bodyReadable: true }), "AAD_MISMATCH");
  expectCode(() => decryptField({ key: keyHandle, envelope, aad: aad({ roomId: OTHER_ROOM_ID }), bodyReadable: true }), "AAD_MISMATCH");
  expectCode(() => decryptField({ key: keyHandle, envelope, aad: aad({ objectVersion: 2 }), bodyReadable: true }), "AAD_MISMATCH");
  expectCode(() => decryptField({
    key: keyHandle,
    envelope,
    aad: aad({ table: "responses", column: "body_ciphertext" }),
    bodyReadable: true,
  }), "AAD_MISMATCH");
  keyHandle.close();
});

test("malformed truncated and noncanonical envelopes are rejected before crypto", () => {
  const { envelope, keyHandle } = encryptedFixture();
  const { tag: _tag, ...missing } = envelope;
  expectCode(() => validateEncryptedFieldV1(missing), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => validateEncryptedFieldV1({ ...envelope, extra: "x" }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => validateEncryptedFieldV1({ ...envelope, nonce: `${envelope.nonce}=` }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => validateEncryptedFieldV1({ ...envelope, nonce: envelope.nonce.slice(0, -1) }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => validateEncryptedFieldV1({ ...envelope, tag: envelope.tag.slice(0, -1) }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => validateEncryptedFieldV1({ ...envelope, ciphertext: "" }), "ENCRYPTED_FIELD_INVALID");
  expectCode(() => decryptField({ key: keyHandle, envelope: { ...envelope, ciphertext: envelope.ciphertext.slice(0, -2) }, aad: aad(), bodyReadable: true }), "ENCRYPTED_FIELD_INVALID");
  keyHandle.close();
});

test("key plaintext nonce and AAD ceilings reject before any registration", () => {
  expectCode(() => key(Uint8Array.from({ length: 31 }, () => 1)), "KEY_LENGTH_INVALID");
  const keyHandle = key();
  const registry = new InMemoryNonceRegistry();
  expectCode(() => encryptField({ key: keyHandle, plaintext: new Uint8Array(), aad: aad(), nonceRegistry: registry, nonceSource: () => NONCE_A }), "PLAINTEXT_LENGTH_INVALID");
  expectCode(() => encryptField({ key: keyHandle, plaintext: new Uint8Array(32_769), aad: aad(), nonceRegistry: registry, nonceSource: () => NONCE_A }), "PLAINTEXT_LENGTH_INVALID");
  expectCode(() => encryptField({ key: keyHandle, plaintext: encoder.encode("x"), aad: aad(), nonceRegistry: registry, nonceSource: () => new Uint8Array(11) }), "NONCE_LENGTH_INVALID");
  expectCode(() => encryptField({ key: keyHandle, plaintext: encoder.encode("x"), aad: { ...aad(), table: "rooms" }, nonceRegistry: registry, nonceSource: () => NONCE_A }), "AAD_INVALID");
  expectCode(() => encryptField({ key: keyHandle, plaintext: encoder.encode("x"), aad: { ...aad(), objectVersion: 0 }, nonceRegistry: registry, nonceSource: () => NONCE_A }), "AAD_INVALID");
  expectCode(() => encryptField({ key: keyHandle, plaintext: encoder.encode("x"), aad: { ...aad(), extra: "x" } as EncryptedFieldAadV1, nonceRegistry: registry, nonceSource: () => NONCE_A }), "AAD_INVALID");
  assert.equal(registry.size, 0);
  keyHandle.close();
});

test("nonce registry rejects same-field and cross-table reuse globally", () => {
  const registry = new InMemoryNonceRegistry();
  const keyHandle = key();
  encryptField({ key: keyHandle, plaintext: encoder.encode("first"), aad: aad(), nonceRegistry: registry, nonceSource: () => NONCE_A });
  assert.equal(registry.size, 1);
  expectCode(() => encryptField({ key: keyHandle, plaintext: encoder.encode("second"), aad: aad({ objectVersion: 2 }), nonceRegistry: registry, nonceSource: () => NONCE_A }), "ENCRYPTION_NONCE_REUSED");
  expectCode(() => encryptField({
    key: keyHandle,
    plaintext: encoder.encode("cross-table"),
    aad: aad({ table: "responses", column: "body_ciphertext", rowId: "response_abcdefghijklmnop" }),
    nonceRegistry: registry,
    nonceSource: () => NONCE_A,
  }), "ENCRYPTION_NONCE_REUSED");
  const second = encryptField({ key: keyHandle, plaintext: encoder.encode("distinct"), aad: aad({ objectVersion: 2 }), nonceRegistry: registry, nonceSource: () => NONCE_B });
  assert.equal(second.nonceRegistration.fieldVersion, 2);
  assert.equal(registry.size, 2);
  keyHandle.close();
});

test("terminal unreadability denies before decryption and scoped callback zeroes bytes", () => {
  const { envelope, keyHandle } = encryptedFixture("sensitive");
  expectCode(() => decryptField({ key: keyHandle, envelope, aad: aad(), bodyReadable: false }), "FIELD_NOT_READABLE");
  let observed: Uint8Array | null = null;
  const byteCount = withDecryptedField({ key: keyHandle, envelope, aad: aad(), bodyReadable: true }, (plaintext) => {
    observed = plaintext;
    assert.equal(decoder.decode(plaintext), "sensitive");
    return plaintext.byteLength;
  });
  assert.equal(byteCount, 9);
  assert.ok(observed);
  assert.deepEqual([...observed], Array(9).fill(0));
  expectCode(() => withDecryptedField({ key: keyHandle, envelope, aad: aad(), bodyReadable: true }, (plaintext) => plaintext), "PLAINTEXT_ESCAPE_DENIED");
  keyHandle.close();
});

test("dedicated inherited descriptor reader accepts exactly 32 bytes and always closes", () => {
  let closed = 0;
  let cursor = 0;
  const reader = (_fd: number, buffer: Buffer, offset: number, length: number): number => {
    const remaining = KEY.length - cursor;
    const count = Math.min(length, remaining, 7);
    if (count === 0) return 0;
    buffer.set(KEY.subarray(cursor, cursor + count), offset);
    cursor += count;
    return count;
  };
  const handle = readSyntheticKeyFromInheritedFd(9, reader, () => { closed += 1; });
  assert.equal(closed, 1);
  assert.equal(handle.use((value) => value.length), 32);
  handle.close();
  expectCode(() => handle.use(() => 0), "KEY_HANDLE_CLOSED");

  let shortClosed = 0;
  let shortRead = false;
  expectCode(() => readSyntheticKeyFromInheritedFd(10, (_fd, buffer, offset) => {
    if (shortRead) return 0;
    buffer.set(KEY.subarray(0, 31), offset);
    shortRead = true;
    return 31;
  }, () => { shortClosed += 1; }), "KEY_LENGTH_INVALID");
  assert.equal(shortClosed, 1);
  expectCode(() => readSyntheticKeyFromInheritedFd(2, reader, () => undefined), "FD_KEY_READ_FAILED");
});

test("synthetic private canaries never enter envelope JSON errors evidence or disk", () => {
  const canaries = [
    "FORME_PRIVATE_CANARY_private_projection",
    "FORME_PRIVATE_CANARY_private_room_label",
    "FORME_GUEST_CANARY_request_capsule",
    "FORME_PRIVATE_CANARY_response",
    "FORME_CREDENTIAL_CANARY_address",
    "FORME_CREDENTIAL_CANARY_verification_code",
    "FORME_CREDENTIAL_CANARY_pairing_recovery",
    "FORME_CREDENTIAL_CANARY_capability_reply_delete",
  ];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-encrypted-field-"));
  fs.chmodSync(root, 0o700);
  const keyHandle = key();
  const registry = new InMemoryNonceRegistry();
  const evidence: Array<Record<string, unknown>> = [];
  try {
    canaries.forEach((canary, index) => {
      const nonce = Uint8Array.from({ length: 12 }, (_, position) => index * 13 + position + 1);
      const { envelope } = encryptField({
        key: keyHandle,
        plaintext: encoder.encode(canary),
        aad: aad({ objectVersion: index + 1 }),
        nonceRegistry: registry,
        nonceSource: () => nonce,
      });
      const serialized = JSON.stringify(envelope);
      for (const candidate of canaries) assert.equal(serialized.includes(candidate), false);
      evidence.push({ schemaVersion: "body_free_crypto_receipt.v1", fieldVersion: index + 1, status: "encrypted" });
    });
    const serializedEvidence = JSON.stringify(evidence);
    for (const canary of canaries) assert.equal(serializedEvidence.includes(canary), false);
    assert.deepEqual(fs.readdirSync(root), []);
    const implementation = fs.readFileSync("packages/r4-persistence/src/encrypted-field.ts", "utf8");
    for (const canary of canaries) assert.equal(implementation.includes(canary), false);
    assert.deepEqual(ENCRYPTED_COLUMNS.length, 9);
  } finally {
    keyHandle.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
