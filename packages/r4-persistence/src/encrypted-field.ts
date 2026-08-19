import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import { canonicalJsonBytes } from "../../r4-protocol/src/index.ts";

export const ENCRYPTED_FIELD_SCHEMA_VERSION = "a256gcm.v1" as const;
export const ENCRYPTED_FIELD_ALGORITHM = "AES-256-GCM" as const;
export const GATE_B_SYNTHETIC_KEY_ID = "r4.hosted.gate-b.synthetic.v1" as const;
export const ENCRYPTED_FIELD_AAD_SCHEMA_VERSION = "encrypted_field_aad.v1" as const;
export const AES_256_KEY_BYTES = 32;
export const AES_GCM_NONCE_BYTES = 12;
export const AES_GCM_TAG_BYTES = 16;
export const ENCRYPTED_FIELD_MAX_PLAINTEXT_BYTES = 32_768;

const R4_ID = /^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const EXACT_ENVELOPE_KEYS = [
  "aadHash", "algorithm", "ciphertext", "keyId", "nonce", "schemaVersion", "tag",
] as const;
const EXACT_AAD_KEYS = [
  "column", "objectVersion", "roomId", "rowId", "schemaVersion", "table",
] as const;

export const ENCRYPTED_COLUMNS = Object.freeze([
  "rooms.label_ciphertext",
  "projections.capsule_ciphertext",
  "interactions.request_ciphertext",
  "interactions.guest_capsule_ciphertext",
  "responses.body_ciphertext",
  "notification_endpoints.address_ciphertext",
  "notification_outbox.target_ciphertext",
  "notification_outbox.verification_code_ciphertext",
  "idempotency_records.sensitive_result_ciphertext",
] as const);

const ENCRYPTED_COLUMN_SET = new Set<string>(ENCRYPTED_COLUMNS);

export type EncryptedColumn = (typeof ENCRYPTED_COLUMNS)[number];

export type EncryptedFieldAadV1 = Readonly<{
  column: string;
  objectVersion: number;
  roomId: string;
  rowId: string;
  schemaVersion: typeof ENCRYPTED_FIELD_AAD_SCHEMA_VERSION;
  table: string;
}>;

export type EncryptedFieldV1 = Readonly<{
  schemaVersion: typeof ENCRYPTED_FIELD_SCHEMA_VERSION;
  algorithm: typeof ENCRYPTED_FIELD_ALGORITHM;
  keyId: typeof GATE_B_SYNTHETIC_KEY_ID;
  nonce: string;
  ciphertext: string;
  tag: string;
  aadHash: `sha256:${string}`;
}>;

export type NonceRegistration = Readonly<{
  keyId: typeof GATE_B_SYNTHETIC_KEY_ID;
  nonce: Uint8Array;
  table: string;
  rowId: string;
  column: string;
  fieldVersion: number;
}>;

export class EncryptedFieldError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "EncryptedFieldError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new EncryptedFieldError(code);
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function sha256(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function decodeCanonicalBase64Url(value: unknown, expectedBytes: number | null): Buffer {
  if (typeof value !== "string" || !BASE64URL.test(value) || value.includes("=")) {
    fail("ENCRYPTED_FIELD_INVALID");
  }
  let decoded: Buffer;
  try {
    decoded = Buffer.from(value, "base64url");
  } catch {
    fail("ENCRYPTED_FIELD_INVALID");
  }
  if (decoded.length === 0 || canonicalBase64Url(decoded) !== value) fail("ENCRYPTED_FIELD_INVALID");
  if (expectedBytes !== null && decoded.length !== expectedBytes) fail("ENCRYPTED_FIELD_INVALID");
  return decoded;
}

function assertAad(value: unknown): asserts value is EncryptedFieldAadV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, EXACT_AAD_KEYS)) {
    fail("AAD_INVALID");
  }
  const aad = value as Partial<EncryptedFieldAadV1>;
  if (
    aad.schemaVersion !== ENCRYPTED_FIELD_AAD_SCHEMA_VERSION
    || typeof aad.table !== "string"
    || typeof aad.column !== "string"
    || !ENCRYPTED_COLUMN_SET.has(`${aad.table}.${aad.column}`)
    || typeof aad.roomId !== "string" || !R4_ID.test(aad.roomId)
    || typeof aad.rowId !== "string" || !R4_ID.test(aad.rowId)
    || !Number.isSafeInteger(aad.objectVersion) || (aad.objectVersion ?? 0) < 1
  ) fail("AAD_INVALID");
}

function aadBytes(aad: EncryptedFieldAadV1): Uint8Array {
  assertAad(aad);
  return canonicalJsonBytes(aad);
}

export function validateEncryptedFieldV1(value: unknown): EncryptedFieldV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, EXACT_ENVELOPE_KEYS)) {
    fail("ENCRYPTED_FIELD_INVALID");
  }
  const envelope = value as Partial<EncryptedFieldV1>;
  if (
    envelope.schemaVersion !== ENCRYPTED_FIELD_SCHEMA_VERSION
    || envelope.algorithm !== ENCRYPTED_FIELD_ALGORITHM
    || envelope.keyId !== GATE_B_SYNTHETIC_KEY_ID
    || typeof envelope.aadHash !== "string" || !SHA256.test(envelope.aadHash)
  ) fail("ENCRYPTED_FIELD_INVALID");
  const nonce = decodeCanonicalBase64Url(envelope.nonce, AES_GCM_NONCE_BYTES);
  const ciphertext = decodeCanonicalBase64Url(envelope.ciphertext, null);
  const tag = decodeCanonicalBase64Url(envelope.tag, AES_GCM_TAG_BYTES);
  nonce.fill(0);
  ciphertext.fill(0);
  tag.fill(0);
  return Object.freeze({ ...envelope }) as EncryptedFieldV1;
}

export class SyntheticKeyHandle {
  #bytes: Buffer;
  #closed = false;

  constructor(key: Uint8Array) {
    if (key.byteLength !== AES_256_KEY_BYTES) fail("KEY_LENGTH_INVALID");
    this.#bytes = Buffer.from(key);
  }

  use<T>(operation: (key: Buffer) => T): T {
    if (this.#closed) fail("KEY_HANDLE_CLOSED");
    return operation(this.#bytes);
  }

  close(): void {
    if (!this.#closed) {
      this.#bytes.fill(0);
      this.#closed = true;
    }
  }

  get closed(): boolean {
    return this.#closed;
  }
}

export type FdReader = (fd: number, buffer: Buffer, offset: number, length: number, position: null) => number;
export type FdCloser = (fd: number) => void;

export function readSyntheticKeyFromInheritedFd(
  fd: number,
  reader: FdReader = fs.readSync,
  closer: FdCloser = fs.closeSync,
): SyntheticKeyHandle {
  if (!Number.isSafeInteger(fd) || fd < 3) fail("FD_KEY_READ_FAILED");
  const bytes = Buffer.alloc(AES_256_KEY_BYTES + 1);
  let offset = 0;
  let keyMaterial: Buffer | null = null;
  let failure: EncryptedFieldError | null = null;
  try {
    while (offset < bytes.length) {
      const read = reader(fd, bytes, offset, bytes.length - offset, null);
      if (!Number.isSafeInteger(read) || read < 0 || read > bytes.length - offset) fail("FD_KEY_READ_FAILED");
      if (read === 0) break;
      offset += read;
    }
    if (offset !== AES_256_KEY_BYTES) fail("KEY_LENGTH_INVALID");
    keyMaterial = Buffer.from(bytes.subarray(0, AES_256_KEY_BYTES));
  } catch (error) {
    failure = error instanceof EncryptedFieldError
      ? error
      : new EncryptedFieldError("FD_KEY_READ_FAILED");
  }
  bytes.fill(0);
  try {
    closer(fd);
  } catch {
    failure = new EncryptedFieldError("FD_KEY_CLOSE_FAILED");
  }
  if (failure !== null) {
    keyMaterial?.fill(0);
    throw failure;
  }
  if (keyMaterial === null) fail("FD_KEY_READ_FAILED");
  try {
    return new SyntheticKeyHandle(keyMaterial);
  } finally {
    keyMaterial.fill(0);
  }
}

export class InMemoryNonceRegistry {
  readonly #nonceKeys = new Set<string>();
  readonly #fieldKeys = new Set<string>();

  reserve(registration: NonceRegistration): void {
    if (
      registration.keyId !== GATE_B_SYNTHETIC_KEY_ID
      || registration.nonce.byteLength !== AES_GCM_NONCE_BYTES
      || !ENCRYPTED_COLUMN_SET.has(`${registration.table}.${registration.column}`)
      || !R4_ID.test(registration.rowId)
      || !Number.isSafeInteger(registration.fieldVersion) || registration.fieldVersion < 1
    ) fail("NONCE_REGISTRATION_INVALID");
    const nonceKey = `${registration.keyId}:${canonicalBase64Url(registration.nonce)}`;
    const fieldKey = `${registration.table}:${registration.rowId}:${registration.column}:${registration.fieldVersion}`;
    if (this.#nonceKeys.has(nonceKey) || this.#fieldKeys.has(fieldKey)) fail("ENCRYPTION_NONCE_REUSED");
    this.#nonceKeys.add(nonceKey);
    this.#fieldKeys.add(fieldKey);
  }

  get size(): number {
    return this.#nonceKeys.size;
  }
}

export type EncryptOptions = Readonly<{
  key: SyntheticKeyHandle;
  plaintext: Uint8Array;
  aad: EncryptedFieldAadV1;
  nonceRegistry: InMemoryNonceRegistry;
  nonceSource?: () => Uint8Array;
}>;

export function encryptField(options: EncryptOptions): Readonly<{
  envelope: EncryptedFieldV1;
  nonceRegistration: NonceRegistration;
}> {
  const { plaintext, aad, nonceRegistry } = options;
  assertAad(aad);
  if (plaintext.byteLength < 1 || plaintext.byteLength > ENCRYPTED_FIELD_MAX_PLAINTEXT_BYTES) {
    fail("PLAINTEXT_LENGTH_INVALID");
  }
  const nonce = Buffer.from((options.nonceSource ?? (() => randomBytes(AES_GCM_NONCE_BYTES)))());
  if (nonce.byteLength !== AES_GCM_NONCE_BYTES) {
    nonce.fill(0);
    fail("NONCE_LENGTH_INVALID");
  }
  const canonicalAad = aadBytes(aad);
  const plaintextCopy = Buffer.from(plaintext);
  try {
    const encrypted = options.key.use((key) => {
      const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: AES_GCM_TAG_BYTES });
      cipher.setAAD(canonicalAad);
      const ciphertext = Buffer.concat([cipher.update(plaintextCopy), cipher.final()]);
      const tag = cipher.getAuthTag();
      return { ciphertext, tag };
    });
    try {
      const registration: NonceRegistration = Object.freeze({
        keyId: GATE_B_SYNTHETIC_KEY_ID,
        nonce: Uint8Array.from(nonce),
        table: aad.table,
        rowId: aad.rowId,
        column: aad.column,
        fieldVersion: aad.objectVersion,
      });
      nonceRegistry.reserve(registration);
      const envelope: EncryptedFieldV1 = Object.freeze({
        schemaVersion: ENCRYPTED_FIELD_SCHEMA_VERSION,
        algorithm: ENCRYPTED_FIELD_ALGORITHM,
        keyId: GATE_B_SYNTHETIC_KEY_ID,
        nonce: canonicalBase64Url(nonce),
        ciphertext: canonicalBase64Url(encrypted.ciphertext),
        tag: canonicalBase64Url(encrypted.tag),
        aadHash: sha256(canonicalAad),
      });
      return Object.freeze({ envelope, nonceRegistration: registration });
    } finally {
      encrypted.ciphertext.fill(0);
      encrypted.tag.fill(0);
    }
  } finally {
    plaintextCopy.fill(0);
    nonce.fill(0);
  }
}

export function decryptField(options: Readonly<{
  key: SyntheticKeyHandle;
  envelope: unknown;
  aad: EncryptedFieldAadV1;
  bodyReadable: boolean;
}>): Uint8Array {
  if (options.bodyReadable !== true) fail("FIELD_NOT_READABLE");
  assertAad(options.aad);
  const envelope = validateEncryptedFieldV1(options.envelope);
  const canonicalAad = aadBytes(options.aad);
  const expectedAadHash = sha256(canonicalAad);
  const actualHash = Buffer.from(envelope.aadHash);
  const expectedHash = Buffer.from(expectedAadHash);
  if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) {
    actualHash.fill(0); expectedHash.fill(0); fail("AAD_MISMATCH");
  }
  actualHash.fill(0); expectedHash.fill(0);
  const nonce = decodeCanonicalBase64Url(envelope.nonce, AES_GCM_NONCE_BYTES);
  const ciphertext = decodeCanonicalBase64Url(envelope.ciphertext, null);
  const tag = decodeCanonicalBase64Url(envelope.tag, AES_GCM_TAG_BYTES);
  try {
    return options.key.use((key) => {
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, nonce, { authTagLength: AES_GCM_TAG_BYTES });
        decipher.setAAD(canonicalAad);
        decipher.setAuthTag(tag);
        return Uint8Array.from(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
      } catch {
        fail("AUTHENTICATION_FAILED");
      }
    });
  } finally {
    nonce.fill(0); ciphertext.fill(0); tag.fill(0);
  }
}

export function withDecryptedField<T>(
  options: Parameters<typeof decryptField>[0],
  operation: (plaintext: Uint8Array) => T,
): T {
  const plaintext = decryptField(options);
  try {
    const result = operation(plaintext);
    if (result instanceof Uint8Array || Buffer.isBuffer(result)) fail("PLAINTEXT_ESCAPE_DENIED");
    return result;
  } finally {
    plaintext.fill(0);
  }
}
