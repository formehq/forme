import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { parseStrictJson } from "../../../packages/r4-protocol/src/index.ts";
import { PublicCoreApplicationV1 } from "./public-core-application.ts";
import { PublicCoreCryptoKeyHandleV1 } from "./public-core-crypto.ts";
import {
  createPublicCorePostgresApplicationStoreV1,
  type PublicCorePublicationVerifierV1,
} from "./public-core-postgres-application-store.ts";
import { createPublicCorePgExecutorV1 } from "./public-core-pg-executor.ts";
import { PublicCorePostgresStoreV1 } from "./public-core-postgres.ts";
import {
  PublicCoreRoomRuntimeV1,
  createPublicCoreIdentityPortV1,
} from "./public-core-room-runtime.ts";
import type { PublicCoreConfigReference } from "./production-config.ts";

const PRIVATE_FILES = Object.freeze([
  "body-encryption-key",
  "capability-pepper-key",
  "controller-secret",
  "curator-secret",
  "database-url",
  "identity-key",
  "publication-authority.json",
  "room-operator-secret",
  "runtime.json",
]);
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const ROOM_ID = /^room_[A-Za-z0-9_-]{16,128}$/u;
const APPROVAL_ID = /^approval_[A-Za-z0-9_-]{16,128}$/u;
const RATE_BUCKET = /^bucket_[A-Za-z0-9_-]{16,128}$/u;

interface LocalRuntimeDocumentV1 {
  readonly schemaVersion: "r4_public_core_local_runtime_config.v1";
  readonly roomId: string;
  readonly databaseUrlRef: PublicCoreConfigReference;
  readonly bodyEncryptionKeyRef: PublicCoreConfigReference;
  readonly capabilityPepperRef: PublicCoreConfigReference;
  readonly identityKeySha256: `sha256:${string}`;
  readonly controllerSecretSha256: `sha256:${string}`;
  readonly curatorSecretSha256: `sha256:${string}`;
  readonly roomOperatorSecretSha256: `sha256:${string}`;
  readonly publicationAuthoritySha256: `sha256:${string}`;
  readonly publicRateBucket: string;
}

interface LocalPublicationAuthorityV1 {
  readonly schemaVersion: "r4_public_core_local_publication_authority.v1";
  readonly projectionPayloadHash: `sha256:${string}`;
  readonly publicationApprovalHash: `sha256:${string}`;
  readonly publicationAttestationHash: `sha256:${string}`;
  readonly basisHash: `sha256:${string}`;
  readonly projectionPolicyHash: `sha256:${string}`;
  readonly publicationApprovalId: string;
}

interface PgPoolWithEnd {
  connect(): unknown;
  end(): Promise<void>;
}

function fail(code: string): never {
  throw new Error(code);
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
}

function record(value: unknown, code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  return value as Readonly<Record<string, unknown>>;
}

function sha256(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalPrivateText(bytes: Buffer, maximumBytes: number, code: string): string {
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes || bytes.includes(0) || bytes.at(-1) === 10 || bytes.at(-1) === 13) fail(code);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.normalize("NFC") !== text || /[\r\n\0]/u.test(text)) fail(code);
  return text;
}

async function readPrivateFile(root: string, name: string, maximumBytes: number): Promise<Buffer> {
  const path = join(root, name);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.uid !== process.getuid?.() || (before.mode & 0o777) !== 0o600 || before.nlink !== 1 || before.size < 1 || before.size > maximumBytes) {
      fail("R4_LOCAL_RUNTIME_PRIVATE_FILE_INVALID");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || bytes.byteLength !== before.size) {
      bytes.fill(0);
      fail("R4_LOCAL_RUNTIME_PRIVATE_FILE_INVALID");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function decodeKey(bytes: Buffer, code: string): Buffer {
  const encoded = canonicalPrivateText(bytes, 128, code);
  const key = Buffer.from(encoded, "base64url");
  if (key.byteLength !== 32 || key.toString("base64url") !== encoded) {
    key.fill(0);
    fail(code);
  }
  return key;
}

function parseRuntime(bytes: Buffer): LocalRuntimeDocumentV1 {
  const code = "R4_LOCAL_RUNTIME_CONFIG_INVALID";
  const value = record(parseStrictJson(canonicalPrivateText(bytes, 32 * 1024, code)), code);
  exactKeys(value, [
    "schemaVersion", "roomId", "databaseUrlRef", "bodyEncryptionKeyRef", "capabilityPepperRef",
    "identityKeySha256", "controllerSecretSha256", "curatorSecretSha256",
    "roomOperatorSecretSha256", "publicationAuthoritySha256", "publicRateBucket",
  ], code);
  if (
    value.schemaVersion !== "r4_public_core_local_runtime_config.v1"
    || typeof value.roomId !== "string" || !ROOM_ID.test(value.roomId)
    || typeof value.databaseUrlRef !== "string" || !/^ref:postgres-url\/local-activation@sha256:[a-f0-9]{64}$/u.test(value.databaseUrlRef)
    || typeof value.bodyEncryptionKeyRef !== "string" || !/^ref:body-encryption\/local-activation@sha256:[a-f0-9]{64}$/u.test(value.bodyEncryptionKeyRef)
    || typeof value.capabilityPepperRef !== "string" || !/^ref:capability-pepper\/local-activation@sha256:[a-f0-9]{64}$/u.test(value.capabilityPepperRef)
    || typeof value.identityKeySha256 !== "string" || !SHA256.test(value.identityKeySha256)
    || typeof value.controllerSecretSha256 !== "string" || !SHA256.test(value.controllerSecretSha256)
    || typeof value.curatorSecretSha256 !== "string" || !SHA256.test(value.curatorSecretSha256)
    || typeof value.roomOperatorSecretSha256 !== "string" || !SHA256.test(value.roomOperatorSecretSha256)
    || typeof value.publicationAuthoritySha256 !== "string" || !SHA256.test(value.publicationAuthoritySha256)
    || typeof value.publicRateBucket !== "string" || !RATE_BUCKET.test(value.publicRateBucket)
  ) fail(code);
  return Object.freeze({ ...value }) as unknown as LocalRuntimeDocumentV1;
}

function parsePublicationAuthority(bytes: Buffer): LocalPublicationAuthorityV1 {
  const code = "R4_LOCAL_RUNTIME_PUBLICATION_AUTHORITY_INVALID";
  const value = record(parseStrictJson(canonicalPrivateText(bytes, 32 * 1024, code)), code);
  exactKeys(value, [
    "schemaVersion", "projectionPayloadHash", "publicationApprovalHash", "publicationAttestationHash",
    "basisHash", "projectionPolicyHash", "publicationApprovalId",
  ], code);
  if (
    value.schemaVersion !== "r4_public_core_local_publication_authority.v1"
    || [value.projectionPayloadHash, value.publicationApprovalHash, value.publicationAttestationHash, value.basisHash, value.projectionPolicyHash]
      .some((item) => typeof item !== "string" || !SHA256.test(item))
    || typeof value.publicationApprovalId !== "string" || !APPROVAL_ID.test(value.publicationApprovalId)
  ) fail(code);
  return Object.freeze({ ...value }) as unknown as LocalPublicationAuthorityV1;
}

function databaseUrl(bytes: Buffer, expectedRef: string): string {
  if (sha256(bytes) !== expectedRef.slice(expectedRef.indexOf("@") + 1)) fail("R4_LOCAL_RUNTIME_DATABASE_URL_INVALID");
  const value = canonicalPrivateText(bytes, 4_096, "R4_LOCAL_RUNTIME_DATABASE_URL_INVALID");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("R4_LOCAL_RUNTIME_DATABASE_URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || parsed.hostname !== "127.0.0.1"
    || !/^[1-9][0-9]{0,4}$/u.test(parsed.port)
    || parsed.pathname !== "/forme_activation"
    || parsed.username === "" || parsed.password === ""
    || parsed.search !== "" || parsed.hash !== ""
  ) fail("R4_LOCAL_RUNTIME_DATABASE_URL_INVALID");
  return value;
}

function publicationVerifier(authority: LocalPublicationAuthorityV1): PublicCorePublicationVerifierV1 {
  return async (input) => {
    if (
      input.projection.payloadHash !== authority.projectionPayloadHash
      || input.publicationApprovalHash !== authority.publicationApprovalHash
      || input.publicationAttestationHash !== authority.publicationAttestationHash
    ) fail("R4_LOCAL_RUNTIME_PUBLICATION_AUTHORITY_MISMATCH");
    return Object.freeze({
      basisHash: authority.basisHash,
      projectionPolicyHash: authority.projectionPolicyHash,
      publicationApprovalId: authority.publicationApprovalId,
    });
  };
}

async function createPool(connectionString: string): Promise<PgPoolWithEnd> {
  const module = await import("pg") as unknown as Readonly<Record<string, unknown>>;
  const Pool = module.Pool;
  if (typeof Pool !== "function") fail("R4_LOCAL_RUNTIME_PG_UNAVAILABLE");
  const pool = Reflect.construct(Pool, [{
    connectionString,
    max: 1,
    min: 0,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: false,
    application_name: "forme_r4_local_activation",
  }]) as PgPoolWithEnd;
  if (typeof pool.connect !== "function" || typeof pool.end !== "function") fail("R4_LOCAL_RUNTIME_PG_UNAVAILABLE");
  return pool;
}

export interface LoadedPublicCoreLocalRuntimeV1 {
  readonly runtime: PublicCoreRoomRuntimeV1;
  readonly roomId: string;
  close(): Promise<void>;
}

export async function loadPublicCoreLocalRuntimeV1(privateRoot: string): Promise<LoadedPublicCoreLocalRuntimeV1> {
  if (!isAbsolute(privateRoot)) fail("R4_LOCAL_RUNTIME_ROOT_INVALID");
  const canonical = await realpath(privateRoot);
  if (canonical !== privateRoot) fail("R4_LOCAL_RUNTIME_ROOT_INVALID");
  const directory = await open(canonical, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    const stat = await directory.stat();
    if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o700) fail("R4_LOCAL_RUNTIME_ROOT_INVALID");
    const entries = (await readdir(canonical)).sort();
    if (entries.length !== PRIVATE_FILES.length || entries.some((entry, index) => entry !== PRIVATE_FILES[index])) {
      fail("R4_LOCAL_RUNTIME_ROOT_INVALID");
    }
  } finally {
    await directory.close();
  }

  const values = new Map<string, Buffer>();
  let pool: PgPoolWithEnd | null = null;
  let bodyHandle: PublicCoreCryptoKeyHandleV1 | null = null;
  let pepperHandle: PublicCoreCryptoKeyHandleV1 | null = null;
  let identity: ReturnType<typeof createPublicCoreIdentityPortV1> | null = null;
  let runtime: PublicCoreRoomRuntimeV1 | null = null;
  let handedOff = false;
  try {
    for (const name of PRIVATE_FILES) values.set(name, await readPrivateFile(canonical, name, 32 * 1024));
    const config = parseRuntime(values.get("runtime.json") as Buffer);
    const authorityBytes = values.get("publication-authority.json") as Buffer;
    if (sha256(authorityBytes) !== config.publicationAuthoritySha256) fail("R4_LOCAL_RUNTIME_PUBLICATION_AUTHORITY_INVALID");
    const authority = parsePublicationAuthority(authorityBytes);
    const dsn = databaseUrl(values.get("database-url") as Buffer, config.databaseUrlRef);
    const bodyKey = decodeKey(values.get("body-encryption-key") as Buffer, "R4_LOCAL_RUNTIME_BODY_KEY_INVALID");
    const pepperKey = decodeKey(values.get("capability-pepper-key") as Buffer, "R4_LOCAL_RUNTIME_PEPPER_KEY_INVALID");
    const identityKey = decodeKey(values.get("identity-key") as Buffer, "R4_LOCAL_RUNTIME_IDENTITY_KEY_INVALID");
    const controller = canonicalPrivateText(values.get("controller-secret") as Buffer, 128, "R4_LOCAL_RUNTIME_CONTROLLER_SECRET_INVALID");
    const curator = canonicalPrivateText(values.get("curator-secret") as Buffer, 128, "R4_LOCAL_RUNTIME_CURATOR_SECRET_INVALID");
    const operator = canonicalPrivateText(values.get("room-operator-secret") as Buffer, 128, "R4_LOCAL_RUNTIME_OPERATOR_SECRET_INVALID");
    if (
      sha256(values.get("body-encryption-key") as Buffer) !== config.bodyEncryptionKeyRef.slice(config.bodyEncryptionKeyRef.indexOf("@") + 1)
      || sha256(values.get("capability-pepper-key") as Buffer) !== config.capabilityPepperRef.slice(config.capabilityPepperRef.indexOf("@") + 1)
      || sha256(values.get("identity-key") as Buffer) !== config.identityKeySha256
      || sha256(values.get("controller-secret") as Buffer) !== config.controllerSecretSha256
      || sha256(values.get("curator-secret") as Buffer) !== config.curatorSecretSha256
      || sha256(values.get("room-operator-secret") as Buffer) !== config.roomOperatorSecretSha256
    ) fail("R4_LOCAL_RUNTIME_BINDING_INVALID");

    pool = await createPool(dsn);
    bodyHandle = new PublicCoreCryptoKeyHandleV1({ purpose: "body_encryption", reference: config.bodyEncryptionKeyRef, material: bodyKey });
    pepperHandle = new PublicCoreCryptoKeyHandleV1({ purpose: "capability_pepper", reference: config.capabilityPepperRef, material: pepperKey });
    identity = createPublicCoreIdentityPortV1(identityKey);
    const postgresStore = new PublicCorePostgresStoreV1(createPublicCorePgExecutorV1({ pool }));
    const applicationStore = createPublicCorePostgresApplicationStoreV1(Object.freeze({
      postgresStore,
      roomId: config.roomId,
      bodyEncryptionKey: bodyHandle,
      capabilityPepperKey: pepperHandle,
      now: () => new Date().toISOString(),
      identity,
      publicationVerifier: publicationVerifier(authority),
    }));
    runtime = new PublicCoreRoomRuntimeV1({
      application: new PublicCoreApplicationV1(applicationStore),
      controllerSecret: controller,
      curatorSecret: curator,
      roomOperatorSecret: operator,
      actorDigestKey: identityKey,
      publicRateBucket: config.publicRateBucket,
    });
    bodyKey.fill(0);
    pepperKey.fill(0);
    identityKey.fill(0);
    handedOff = true;
    const loadedPool = pool;
    const loadedBodyHandle = bodyHandle;
    const loadedPepperHandle = pepperHandle;
    const loadedIdentity = identity;
    const loadedRuntime = runtime;
    let closed = false;
    return Object.freeze({
      runtime: loadedRuntime,
      roomId: config.roomId,
      async close() {
        if (closed) return;
        closed = true;
        loadedRuntime.close();
        loadedIdentity.close();
        loadedBodyHandle.close();
        loadedPepperHandle.close();
        await loadedPool.end();
      },
    });
  } finally {
    for (const value of values.values()) value.fill(0);
    if (!handedOff) {
      runtime?.close();
      identity?.close();
      bodyHandle?.close();
      pepperHandle?.close();
      if (pool !== null) await pool.end().catch(() => undefined);
    }
  }
}
