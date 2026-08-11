import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { canonicalJsonBytes } from "../../../packages/r4-protocol/src/index.ts";
import type { PublicCoreConfigReference } from "./production-config.ts";

export const PUBLIC_CORE_ENCRYPTED_FIELD_SCHEMA_VERSION = "a256gcm.v1" as const;
export const PUBLIC_CORE_ENCRYPTION_ALGORITHM = "AES-256-GCM" as const;
export const PUBLIC_CORE_AAD_SCHEMA_VERSION = "r4_public_core_aad.v1" as const;
export const PUBLIC_CORE_KEYED_DIGEST_SCHEMA_VERSION = "r4_public_core_keyed_digest.v1" as const;
export const PUBLIC_CORE_KEYED_DIGEST_ALGORITHM = "hmac-sha256.v1" as const;
export const PUBLIC_CORE_AES_256_KEY_BYTES = 32;
export const PUBLIC_CORE_AES_GCM_NONCE_BYTES = 12;
export const PUBLIC_CORE_AES_GCM_TAG_BYTES = 16;

const MAX_PLAINTEXT_BYTES = 1024 * 1024;
const MAX_SECRET_BYTES = 4_096;
const R4_ID = /^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const KEY_VERSION = /^keyv_[a-f0-9]{32}$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const REFERENCE = /^ref:(body-encryption|capability-pepper)\/[a-z0-9][a-z0-9._\/-]{0,127}@sha256:[a-f0-9]{64}$/u;

const EXACT_AAD_KEYS = [
  "column",
  "objectVersion",
  "roomId",
  "rowId",
  "schemaVersion",
  "table",
] as const;
const EXACT_ENVELOPE_KEYS = [
  "aadHash",
  "algorithm",
  "ciphertext",
  "keyVersion",
  "nonce",
  "schemaVersion",
  "tag",
] as const;
const EXACT_DIGEST_KEYS = ["algorithm", "digest", "keyVersion", "schemaVersion"] as const;
const EXACT_NONCE_REGISTRATION_KEYS = [
  "column",
  "fieldVersion",
  "keyVersion",
  "nonce",
  "rowId",
  "table",
] as const;

/** The complete encrypted-column surface authorized by the #67 Packet. */
export const PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES = Object.freeze([
  "rooms.label_ciphertext",
  "projections.capsule_ciphertext",
  "pairing_challenges.pairing_code_ciphertext",
  "pairing_challenges.exchange_envelope_ciphertext",
  "interactions.request_ciphertext",
  "interactions.guest_capsule_ciphertext",
] as const);

const ENCRYPTED_COLUMN_SET = new Set<string>(PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES);

export type PublicCoreEncryptedColumnName = typeof PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES[number];
export type PublicCoreCryptoKeyPurpose = "body_encryption" | "capability_pepper";

export type PublicCoreSecretDigestDomain =
  | "actor_scope"
  | "coarse_rate_bucket"
  | "interaction_delete_secret"
  | "interaction_reply_secret"
  | "public_encounter_secret"
  | "room_binding_credential"
  | "room_pairing_code";

const SECRET_DIGEST_DOMAINS = new Set<PublicCoreSecretDigestDomain>([
  "actor_scope",
  "coarse_rate_bucket",
  "interaction_delete_secret",
  "interaction_reply_secret",
  "public_encounter_secret",
  "room_binding_credential",
  "room_pairing_code",
]);

export interface PublicCoreFieldAadV1 {
  readonly schemaVersion: typeof PUBLIC_CORE_AAD_SCHEMA_VERSION;
  readonly table: "interactions" | "pairing_challenges" | "projections" | "rooms";
  readonly column:
    | "capsule_ciphertext"
    | "exchange_envelope_ciphertext"
    | "guest_capsule_ciphertext"
    | "label_ciphertext"
    | "pairing_code_ciphertext"
    | "request_ciphertext";
  readonly roomId: string;
  readonly rowId: string;
  readonly objectVersion: number;
}

export interface PublicCoreEncryptedFieldV1 {
  readonly schemaVersion: typeof PUBLIC_CORE_ENCRYPTED_FIELD_SCHEMA_VERSION;
  readonly algorithm: typeof PUBLIC_CORE_ENCRYPTION_ALGORITHM;
  readonly keyVersion: string;
  readonly nonce: string;
  readonly ciphertext: string;
  readonly tag: string;
  readonly aadHash: `sha256:${string}`;
}

export interface PublicCoreNonceRegistrationV1 {
  readonly keyVersion: string;
  readonly nonce: Uint8Array;
  readonly table: PublicCoreFieldAadV1["table"];
  readonly rowId: string;
  readonly column: PublicCoreFieldAadV1["column"];
  readonly fieldVersion: number;
}

export interface PublicCoreNonceAuthorityV1 {
  /**
   * The durable implementation must bind this reservation to the same SQL
   * transaction that writes the returned ciphertext.
   */
  reserve(registration: PublicCoreNonceRegistrationV1): void | Promise<void>;
}

export interface PublicCoreKeyedDigestV1 {
  readonly schemaVersion: typeof PUBLIC_CORE_KEYED_DIGEST_SCHEMA_VERSION;
  readonly algorithm: typeof PUBLIC_CORE_KEYED_DIGEST_ALGORITHM;
  readonly keyVersion: string;
  readonly digest: `sha256:${string}`;
}

export class PublicCoreCryptoError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicCoreCryptoError";
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; code: string }> {
    return Object.freeze({ name: this.name, code: this.code });
  }
}

function fail(code: string): never {
  throw new PublicCoreCryptoError(code);
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  try {
    return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
  } finally {
    leftBytes.fill(0);
    rightBytes.fill(0);
  }
}

function sha256(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function decodeCanonicalBase64Url(value: unknown, expectedBytes: number | null): Buffer {
  if (typeof value !== "string" || !BASE64URL.test(value) || value.includes("=")) {
    fail("R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID");
  }
  let decoded: Buffer;
  try {
    decoded = Buffer.from(value, "base64url");
  } catch {
    fail("R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID");
  }
  if (
    decoded.byteLength === 0
    || canonicalBase64Url(decoded) !== value
    || (expectedBytes !== null && decoded.byteLength !== expectedBytes)
  ) {
    decoded.fill(0);
    fail("R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID");
  }
  return decoded;
}

function assertAad(value: unknown): asserts value is PublicCoreFieldAadV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, EXACT_AAD_KEYS)) {
    fail("R4_PUBLIC_CORE_CRYPTO_AAD_INVALID");
  }
  const aad = value as Partial<PublicCoreFieldAadV1>;
  if (
    aad.schemaVersion !== PUBLIC_CORE_AAD_SCHEMA_VERSION
    || typeof aad.table !== "string"
    || typeof aad.column !== "string"
    || !ENCRYPTED_COLUMN_SET.has(`${aad.table}.${aad.column}`)
    || typeof aad.roomId !== "string"
    || !R4_ID.test(aad.roomId)
    || typeof aad.rowId !== "string"
    || !R4_ID.test(aad.rowId)
    || !Number.isSafeInteger(aad.objectVersion)
    || (aad.objectVersion ?? 0) < 1
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_AAD_INVALID");
  }
}

function canonicalAadBytes(aad: PublicCoreFieldAadV1): Uint8Array {
  assertAad(aad);
  return canonicalJsonBytes(aad);
}

function expectedReferenceKind(purpose: PublicCoreCryptoKeyPurpose): "body-encryption" | "capability-pepper" {
  return purpose === "body_encryption" ? "body-encryption" : "capability-pepper";
}

export function derivePublicCoreKeyVersion(
  reference: PublicCoreConfigReference,
  purpose: PublicCoreCryptoKeyPurpose,
): string {
  const match = REFERENCE.exec(reference);
  if (match?.[1] !== expectedReferenceKind(purpose)) fail("R4_PUBLIC_CORE_CRYPTO_KEY_REFERENCE_INVALID");
  return `keyv_${createHash("sha256").update(reference, "utf8").digest("hex").slice(0, 32)}`;
}

interface KeyMaterialState {
  readonly purpose: PublicCoreCryptoKeyPurpose;
  readonly keyVersion: string;
  readonly material: Buffer;
  closed: boolean;
}

const KEY_MATERIAL = new WeakMap<PublicCoreCryptoKeyHandleV1, KeyMaterialState>();

/**
 * Opaque injected key material. Gate C may supply a resolver that constructs
 * this handle; references and raw bytes are never serialized by the handle.
 */
export class PublicCoreCryptoKeyHandleV1 {
  constructor(input: Readonly<{
    purpose: PublicCoreCryptoKeyPurpose;
    reference: PublicCoreConfigReference;
    material: Uint8Array;
  }>) {
    if (input.material.byteLength !== PUBLIC_CORE_AES_256_KEY_BYTES) {
      fail("R4_PUBLIC_CORE_CRYPTO_KEY_INVALID");
    }
    const keyVersion = derivePublicCoreKeyVersion(input.reference, input.purpose);
    KEY_MATERIAL.set(this, {
      purpose: input.purpose,
      keyVersion,
      material: Buffer.from(input.material),
      closed: false,
    });
    Object.freeze(this);
  }

  get keyVersion(): string {
    const state = KEY_MATERIAL.get(this);
    if (!state) fail("R4_PUBLIC_CORE_CRYPTO_KEY_INVALID");
    return state.keyVersion;
  }

  get purpose(): PublicCoreCryptoKeyPurpose {
    const state = KEY_MATERIAL.get(this);
    if (!state) fail("R4_PUBLIC_CORE_CRYPTO_KEY_INVALID");
    return state.purpose;
  }

  get closed(): boolean {
    const state = KEY_MATERIAL.get(this);
    if (!state) fail("R4_PUBLIC_CORE_CRYPTO_KEY_INVALID");
    return state.closed;
  }

  close(): void {
    const state = KEY_MATERIAL.get(this);
    if (!state) fail("R4_PUBLIC_CORE_CRYPTO_KEY_INVALID");
    if (!state.closed) {
      state.material.fill(0);
      state.closed = true;
    }
  }

  toJSON(): Readonly<{
    schemaVersion: "r4_public_core_crypto_key_handle.v1";
    purpose: PublicCoreCryptoKeyPurpose;
    keyVersion: string;
    closed: boolean;
  }> {
    return Object.freeze({
      schemaVersion: "r4_public_core_crypto_key_handle.v1",
      purpose: this.purpose,
      keyVersion: this.keyVersion,
      closed: this.closed,
    });
  }
}

function useKey<T>(
  handle: PublicCoreCryptoKeyHandleV1,
  purpose: PublicCoreCryptoKeyPurpose,
  operation: (key: Buffer, keyVersion: string) => T,
): T {
  const state = KEY_MATERIAL.get(handle);
  if (!state || state.closed || state.purpose !== purpose) fail("R4_PUBLIC_CORE_CRYPTO_KEY_UNAVAILABLE");
  return operation(state.material, state.keyVersion);
}

export function validatePublicCoreEncryptedField(value: unknown): PublicCoreEncryptedFieldV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, EXACT_ENVELOPE_KEYS)) {
    fail("R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID");
  }
  const envelope = value as Partial<PublicCoreEncryptedFieldV1>;
  if (
    envelope.schemaVersion !== PUBLIC_CORE_ENCRYPTED_FIELD_SCHEMA_VERSION
    || envelope.algorithm !== PUBLIC_CORE_ENCRYPTION_ALGORITHM
    || typeof envelope.keyVersion !== "string"
    || !KEY_VERSION.test(envelope.keyVersion)
    || typeof envelope.aadHash !== "string"
    || !SHA256.test(envelope.aadHash)
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID");
  }
  const nonce = decodeCanonicalBase64Url(envelope.nonce, PUBLIC_CORE_AES_GCM_NONCE_BYTES);
  const ciphertext = decodeCanonicalBase64Url(envelope.ciphertext, null);
  const tag = decodeCanonicalBase64Url(envelope.tag, PUBLIC_CORE_AES_GCM_TAG_BYTES);
  nonce.fill(0);
  ciphertext.fill(0);
  tag.fill(0);
  return Object.freeze({ ...envelope }) as PublicCoreEncryptedFieldV1;
}

export function validatePublicCoreNonceRegistration(value: unknown): PublicCoreNonceRegistrationV1 {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || !exactKeys(value, EXACT_NONCE_REGISTRATION_KEYS)
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_NONCE_REGISTRATION_INVALID");
  }
  const registration = value as Partial<PublicCoreNonceRegistrationV1>;
  if (
    typeof registration.keyVersion !== "string"
    || !KEY_VERSION.test(registration.keyVersion)
    || !(registration.nonce instanceof Uint8Array)
    || registration.nonce.byteLength !== PUBLIC_CORE_AES_GCM_NONCE_BYTES
    || typeof registration.table !== "string"
    || typeof registration.column !== "string"
    || !ENCRYPTED_COLUMN_SET.has(`${registration.table}.${registration.column}`)
    || typeof registration.rowId !== "string"
    || !R4_ID.test(registration.rowId)
    || !Number.isSafeInteger(registration.fieldVersion)
    || (registration.fieldVersion ?? 0) < 1
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_NONCE_REGISTRATION_INVALID");
  }
  return registration as PublicCoreNonceRegistrationV1;
}

/** Ephemeral test authority; the durable authority is the SQL unique index. */
export class InMemoryPublicCoreNonceAuthorityV1 implements PublicCoreNonceAuthorityV1 {
  readonly #nonces = new Set<string>();
  readonly #fields = new Set<string>();

  reserve(input: PublicCoreNonceRegistrationV1): void {
    const registration = validatePublicCoreNonceRegistration(input);
    const nonceKey = `${registration.keyVersion}:${canonicalBase64Url(registration.nonce)}`;
    const fieldKey = `${registration.table}:${registration.rowId}:${registration.column}:${registration.fieldVersion}`;
    if (this.#nonces.has(nonceKey) || this.#fields.has(fieldKey)) {
      fail("R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED");
    }
    this.#nonces.add(nonceKey);
    this.#fields.add(fieldKey);
  }

  get size(): number {
    return this.#nonces.size;
  }
}

export async function encryptPublicCoreField(input: Readonly<{
  key: PublicCoreCryptoKeyHandleV1;
  plaintext: Uint8Array;
  aad: PublicCoreFieldAadV1;
  nonceAuthority: PublicCoreNonceAuthorityV1;
  nonceSource?: () => Uint8Array;
}>): Promise<Readonly<{
  envelope: PublicCoreEncryptedFieldV1;
  nonceRegistration: PublicCoreNonceRegistrationV1;
  plaintextHash: `sha256:${string}`;
}>> {
  assertAad(input.aad);
  if (
    !(input.plaintext instanceof Uint8Array)
    || input.plaintext.byteLength < 1
    || input.plaintext.byteLength > MAX_PLAINTEXT_BYTES
    || !input.nonceAuthority
    || typeof input.nonceAuthority.reserve !== "function"
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_INPUT_INVALID");
  }
  let nonce: Buffer;
  try {
    nonce = Buffer.from((input.nonceSource ?? (() => randomBytes(PUBLIC_CORE_AES_GCM_NONCE_BYTES)))());
  } catch {
    fail("R4_PUBLIC_CORE_CRYPTO_NONCE_SOURCE_FAILED");
  }
  if (nonce.byteLength !== PUBLIC_CORE_AES_GCM_NONCE_BYTES) {
    nonce.fill(0);
    fail("R4_PUBLIC_CORE_CRYPTO_NONCE_INVALID");
  }
  const aadBytes = canonicalAadBytes(input.aad);
  const plaintext = Buffer.from(input.plaintext);
  let ciphertext: Buffer | null = null;
  let tag: Buffer | null = null;
  try {
    const encrypted = useKey(input.key, "body_encryption", (key, keyVersion) => {
      const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: PUBLIC_CORE_AES_GCM_TAG_BYTES });
      cipher.setAAD(aadBytes);
      return Object.freeze({
        keyVersion,
        ciphertext: Buffer.concat([cipher.update(plaintext), cipher.final()]),
        tag: cipher.getAuthTag(),
      });
    });
    ciphertext = encrypted.ciphertext;
    tag = encrypted.tag;
    const registration: PublicCoreNonceRegistrationV1 = Object.freeze({
      keyVersion: encrypted.keyVersion,
      nonce: Uint8Array.from(nonce),
      table: input.aad.table,
      rowId: input.aad.rowId,
      column: input.aad.column,
      fieldVersion: input.aad.objectVersion,
    });
    try {
      await input.nonceAuthority.reserve(registration);
    } catch (error) {
      let nonceReused = false;
      try {
        nonceReused = error instanceof PublicCoreCryptoError
          && error.code === "R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED";
      } catch {
        nonceReused = false;
      }
      if (nonceReused) fail("R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED");
      fail("R4_PUBLIC_CORE_CRYPTO_NONCE_RESERVATION_FAILED");
    }
    const envelope: PublicCoreEncryptedFieldV1 = Object.freeze({
      schemaVersion: PUBLIC_CORE_ENCRYPTED_FIELD_SCHEMA_VERSION,
      algorithm: PUBLIC_CORE_ENCRYPTION_ALGORITHM,
      keyVersion: encrypted.keyVersion,
      nonce: canonicalBase64Url(nonce),
      ciphertext: canonicalBase64Url(ciphertext),
      tag: canonicalBase64Url(tag),
      aadHash: sha256(aadBytes),
    });
    return Object.freeze({ envelope, nonceRegistration: registration, plaintextHash: sha256(plaintext) });
  } finally {
    plaintext.fill(0);
    nonce.fill(0);
    ciphertext?.fill(0);
    tag?.fill(0);
  }
}

export function decryptPublicCoreField(input: Readonly<{
  key: PublicCoreCryptoKeyHandleV1;
  envelope: unknown;
  aad: PublicCoreFieldAadV1;
  bodyReadable: boolean;
  expectedPlaintextHash: `sha256:${string}`;
}>): Uint8Array {
  if (input.bodyReadable !== true) fail("R4_PUBLIC_CORE_CRYPTO_BODY_UNREADABLE");
  assertAad(input.aad);
  if (typeof input.expectedPlaintextHash !== "string" || !SHA256.test(input.expectedPlaintextHash)) {
    fail("R4_PUBLIC_CORE_CRYPTO_INPUT_INVALID");
  }
  const envelope = validatePublicCoreEncryptedField(input.envelope);
  const aadBytes = canonicalAadBytes(input.aad);
  if (!constantTimeTextEqual(envelope.aadHash, sha256(aadBytes))) {
    fail("R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED");
  }
  const nonce = decodeCanonicalBase64Url(envelope.nonce, PUBLIC_CORE_AES_GCM_NONCE_BYTES);
  const ciphertext = decodeCanonicalBase64Url(envelope.ciphertext, null);
  const tag = decodeCanonicalBase64Url(envelope.tag, PUBLIC_CORE_AES_GCM_TAG_BYTES);
  let plaintext: Buffer | null = null;
  try {
    plaintext = useKey(input.key, "body_encryption", (key, keyVersion) => {
      if (!constantTimeTextEqual(envelope.keyVersion, keyVersion)) {
        fail("R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED");
      }
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, nonce, {
          authTagLength: PUBLIC_CORE_AES_GCM_TAG_BYTES,
        });
        decipher.setAAD(aadBytes);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      } catch {
        fail("R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED");
      }
    });
    if (!constantTimeTextEqual(sha256(plaintext), input.expectedPlaintextHash)) {
      plaintext.fill(0);
      fail("R4_PUBLIC_CORE_CRYPTO_INTEGRITY_FAILED");
    }
    return Uint8Array.from(plaintext);
  } finally {
    plaintext?.fill(0);
    nonce.fill(0);
    ciphertext.fill(0);
    tag.fill(0);
  }
}

export async function withDecryptedPublicCoreField<T>(
  input: Parameters<typeof decryptPublicCoreField>[0],
  operation: (plaintext: Uint8Array) => T | Promise<T>,
): Promise<T> {
  const plaintext = decryptPublicCoreField(input);
  try {
    let result: T;
    try {
      result = await operation(plaintext);
    } catch {
      fail("R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_CALLBACK_FAILED");
    }
    if (result instanceof Uint8Array || Buffer.isBuffer(result)) {
      fail("R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_ESCAPE_DENIED");
    }
    return result;
  } finally {
    plaintext.fill(0);
  }
}

function assertDigestDomain(domain: unknown): asserts domain is PublicCoreSecretDigestDomain {
  if (typeof domain !== "string" || !SECRET_DIGEST_DOMAINS.has(domain as PublicCoreSecretDigestDomain)) {
    fail("R4_PUBLIC_CORE_CRYPTO_DIGEST_INPUT_INVALID");
  }
}

function digestPreimage(domain: PublicCoreSecretDigestDomain, value: Uint8Array): Buffer {
  const prefix = Buffer.from(`forme:r4-public-core:keyed-digest:v1:${domain}\0`, "utf8");
  const preimage = Buffer.concat([prefix, Buffer.from(value)]);
  prefix.fill(0);
  return preimage;
}

export function keyedPublicCoreDigest(input: Readonly<{
  key: PublicCoreCryptoKeyHandleV1;
  domain: PublicCoreSecretDigestDomain;
  value: Uint8Array;
}>): PublicCoreKeyedDigestV1 {
  assertDigestDomain(input.domain);
  if (!(input.value instanceof Uint8Array) || input.value.byteLength < 1 || input.value.byteLength > MAX_SECRET_BYTES) {
    fail("R4_PUBLIC_CORE_CRYPTO_DIGEST_INPUT_INVALID");
  }
  const preimage = digestPreimage(input.domain, input.value);
  try {
    return useKey(input.key, "capability_pepper", (key, keyVersion) => Object.freeze({
      schemaVersion: PUBLIC_CORE_KEYED_DIGEST_SCHEMA_VERSION,
      algorithm: PUBLIC_CORE_KEYED_DIGEST_ALGORITHM,
      keyVersion,
      digest: `sha256:${createHmac("sha256", key).update(preimage).digest("hex")}`,
    }));
  } finally {
    preimage.fill(0);
  }
}

export function validatePublicCoreKeyedDigest(value: unknown): PublicCoreKeyedDigestV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, EXACT_DIGEST_KEYS)) {
    fail("R4_PUBLIC_CORE_CRYPTO_DIGEST_INVALID");
  }
  const digest = value as Partial<PublicCoreKeyedDigestV1>;
  if (
    digest.schemaVersion !== PUBLIC_CORE_KEYED_DIGEST_SCHEMA_VERSION
    || digest.algorithm !== PUBLIC_CORE_KEYED_DIGEST_ALGORITHM
    || typeof digest.keyVersion !== "string"
    || !KEY_VERSION.test(digest.keyVersion)
    || typeof digest.digest !== "string"
    || !SHA256.test(digest.digest)
  ) {
    fail("R4_PUBLIC_CORE_CRYPTO_DIGEST_INVALID");
  }
  return Object.freeze({ ...digest }) as PublicCoreKeyedDigestV1;
}

/** Call only after the exact indexed digest row has been selected. */
export function matchesPublicCoreKeyedDigest(input: Readonly<{
  key: PublicCoreCryptoKeyHandleV1;
  domain: PublicCoreSecretDigestDomain;
  value: Uint8Array;
  expected: unknown;
}>): boolean {
  const expected = validatePublicCoreKeyedDigest(input.expected);
  const actual = keyedPublicCoreDigest({ key: input.key, domain: input.domain, value: input.value });
  return constantTimeTextEqual(actual.keyVersion, expected.keyVersion)
    && constantTimeTextEqual(actual.digest, expected.digest);
}
