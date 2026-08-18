import { timingSafeEqual } from "node:crypto";
import {
  canonicalJson,
  canonicalSha256,
  validateGuestCapsuleV1,
  validateProjectionCapsuleV1,
  type GuestCapsuleV1,
  type InteractionConsent,
  type ProjectionCapsuleV1,
} from "../../../packages/r4-protocol/src/index.ts";
import {
  encryptPublicCoreField,
  keyedPublicCoreDigest,
  withDecryptedCanonicalPublicCoreField,
  type PublicCoreCryptoKeyHandleV1,
  type PublicCoreEncryptedFieldV1,
  type PublicCoreFieldAadV1,
  type PublicCoreSecretDigestDomain,
} from "./public-core-crypto.ts";
import {
  authenticPublicCorePostgresErrorDetails,
  type PublicCoreAckRoomOperatorSqlInputV1,
  type PublicCoreCreateInteractionSqlInputV1,
  type PublicCoreCreateRoomPairSqlInputV1,
  type PublicCoreCreateRoomSqlInputV1,
  type PublicCoreDeliverProjectionSqlInputV1,
  type PublicCoreExchangeRoomPairSqlInputV1,
  type PublicCoreIssueEncounterSqlInputV1,
  type PublicCorePreparedSqlStoreV1,
  type PublicCoreRecordLocalPurgeSqlInputV1,
  type PublicCoreSqlEncryptedValueV1,
  type PublicCoreSqlHmacSha256V1,
  type PublicCoreSqlMutationActionV1,
  type PublicCoreSqlMutationContextV1,
  type PublicCoreSqlMutationResultV1,
  type PublicCoreSqlReadResultV1,
  type PublicCoreSqlSha256V1,
} from "./public-core-postgres.ts";
import type {
  PublicCoreAckInputV1,
  PublicCoreApplicationStoreV1,
  PublicCoreCreateInteractionInputV1,
  PublicCoreCreateRoomInputV1,
  PublicCoreCreateRoomPairInputV1,
  PublicCoreCurationInputV1,
  PublicCoreDeleteInteractionInputV1,
  PublicCoreDeliverProjectionInputV1,
  PublicCoreExchangeRoomPairInputV1,
  PublicCoreIssueEncounterInputV1,
  PublicCoreLocalPurgeInputV1,
  PublicCoreMutationContextV1,
  PublicCoreOperationResponseV1,
  PublicCorePullInputV1,
  PublicCoreRevokeProjectionInputV1,
  PublicCoreRevokeRoomBindingInputV1,
  PublicCoreSetRoomModeInputV1,
  PublicCoreSha256,
  PublicCoreSyncInputV1,
} from "./public-core-store.ts";

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;
const TEN_MINUTES_MS = 10 * 60 * 1_000;
const THIRTY_DAYS_MS = 30 * DAY_MS;
const ID_SUFFIX = "[A-Za-z0-9_-]{16,128}";
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const SECRET = /^[A-Za-z0-9_-]{16,4096}$/u;
const LOCAL_ERROR_METADATA = new WeakMap<object, Readonly<{ status: number; code: string }>>();

type IdentityPrefix = "ack" | "binding" | "encounter" | "event" | "interaction" | "pairing" | "purge" | "rate" | "receipt";
type IdentitySecretKind = "binding_secret" | "pairing_code";

export interface PublicCorePostgresApplicationIdentityInputV1 {
  readonly purpose: string;
  readonly action: PublicCoreSqlMutationActionV1;
  readonly actorScopeDigest: PublicCoreSha256;
  readonly idempotencyKey: string;
  readonly canonicalRequestHash: PublicCoreSha256;
}

export interface PublicCorePostgresApplicationIdentityPortV1 {
  deriveId(input: PublicCorePostgresApplicationIdentityInputV1 & Readonly<{
    prefix: IdentityPrefix;
  }>): string;
  deriveSecret(input: PublicCorePostgresApplicationIdentityInputV1 & Readonly<{
    kind: IdentitySecretKind;
  }>): string;
  deriveNonce(input: PublicCorePostgresApplicationIdentityInputV1 & Readonly<{
    table: PublicCoreFieldAadV1["table"];
    column: PublicCoreFieldAadV1["column"];
    rowId: string;
    objectVersion: number;
  }>): Uint8Array;
}

export interface PublicCorePublicationVerificationResultV1 {
  readonly basisHash: PublicCoreSha256;
  readonly projectionPolicyHash: PublicCoreSha256;
  readonly publicationApprovalId: string;
}

export type PublicCorePublicationVerifierV1 = (
  input: Readonly<{
    projection: ProjectionCapsuleV1;
    publicationApprovalHash: PublicCoreSha256;
    publicationAttestationHash: PublicCoreSha256;
  }>,
) => PublicCorePublicationVerificationResultV1 | Promise<PublicCorePublicationVerificationResultV1>;

export interface PublicCorePostgresApplicationStoreConfigV1 {
  readonly postgresStore: PublicCorePreparedSqlStoreV1;
  readonly roomId: string;
  readonly bodyEncryptionKey: PublicCoreCryptoKeyHandleV1;
  readonly capabilityPepperKey: PublicCoreCryptoKeyHandleV1;
  readonly now: () => string;
  readonly identity: PublicCorePostgresApplicationIdentityPortV1;
  readonly publicationVerifier: PublicCorePublicationVerifierV1;
}

export class PublicCorePostgresApplicationStoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "PublicCorePostgresApplicationStoreError";
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string): never {
  const error = new PublicCorePostgresApplicationStoreError(status, code);
  LOCAL_ERROR_METADATA.set(error, Object.freeze({ status, code }));
  Object.freeze(error);
  throw error;
}

/** Application membrane access; only this module can mint an accepted error. */
export function authenticPublicCorePostgresApplicationStoreErrorDetails(
  error: unknown,
): Readonly<{ status: number; code: string }> | null {
  try {
    if ((typeof error !== "object" && typeof error !== "function") || error === null || !Object.isFrozen(error)) return null;
    const details = LOCAL_ERROR_METADATA.get(error as object);
    const status = Object.getOwnPropertyDescriptor(error as object, "status");
    const code = Object.getOwnPropertyDescriptor(error as object, "code");
    if (
      details === undefined
      || !status || !("value" in status) || status.writable !== false || status.value !== details.status
      || !code || !("value" in code) || code.writable !== false || code.value !== details.code
      || !Number.isSafeInteger(details.status) || details.status < 400 || details.status > 599
      || !/^[A-Za-z0-9_]{1,128}$/u.test(details.code)
    ) return null;
    return details;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshot(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(503, "public_core_store_contract_invalid");
    return value;
  }
  if (typeof value !== "object" || depth > 64 || seen.has(value)) fail(503, "public_core_store_contract_invalid");
  seen.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length !== 0) fail(503, "public_core_store_contract_invalid");
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) fail(503, "public_core_store_contract_invalid");
      const length = descriptors.length;
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0) {
        fail(503, "public_core_store_contract_invalid");
      }
      const result: unknown[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail(503, "public_core_store_contract_invalid");
        }
        result.push(snapshot(descriptor.value, seen, depth + 1));
      }
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key))) {
        fail(503, "public_core_store_contract_invalid");
      }
      return Object.freeze(result);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(503, "public_core_store_contract_invalid");
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor) || descriptor.enumerable !== true) fail(503, "public_core_store_contract_invalid");
      result[key] = snapshot(descriptor.value, seen, depth + 1);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
}

function response(status: number, body: Readonly<Record<string, unknown>>, recovered: boolean): PublicCoreOperationResponseV1 {
  return Object.freeze({
    status,
    body: snapshot(body) as Readonly<Record<string, unknown>>,
    recovered,
  });
}

function addMilliseconds(value: string, amount: number): string {
  return new Date(Date.parse(value) + amount).toISOString();
}

function instant(value: unknown, code: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value) {
    fail(503, code);
  }
  return value;
}

function sameFixedText(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  try {
    return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
  } finally {
    leftBytes.fill(0);
    rightBytes.fill(0);
  }
}

function consentFromHash(value: PublicCoreSqlSha256V1): InteractionConsent {
  const manual = canonicalSha256({ consent: "manual_owner_only" });
  const localAi = canonicalSha256({ consent: "allow_owner_local_ai" });
  if (sameFixedText(value, manual)) return "manual_owner_only";
  if (sameFixedText(value, localAi)) return "allow_owner_local_ai";
  fail(503, "public_core_consent_hash_invalid");
}

function lifecycle(row: Readonly<{
  projectionId: string;
  roomId: string;
  payloadHash: PublicCoreSqlSha256V1;
  ownerState: string;
  curationState: string;
  current: boolean;
  publishedAt: string;
  freshUntil: string;
  expiresAt: string;
  lifecycleVersion: number;
  bodyAvailable: boolean;
}>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    projectionId: row.projectionId,
    roomId: row.roomId,
    payloadHash: row.payloadHash,
    ownerState: row.ownerState,
    curationState: row.curationState,
    current: row.current,
    publishedAt: row.publishedAt,
    freshUntil: row.freshUntil,
    expiresAt: row.expiresAt,
    version: row.lifecycleVersion,
    bodyAvailable: row.bodyAvailable,
  });
}

function interactionView(row: Readonly<{
  interactionId: string;
  roomId: string;
  projectionId: string;
  originProjectionHash: PublicCoreSqlSha256V1;
  interactionType: "ask" | "seed" | "resonance";
  consentHash: PublicCoreSqlSha256V1;
  state: string;
  acceptedAt: string;
  bodyExpiresAt: string;
  version: number;
  bodyAvailable: boolean;
  localPurgeReceivedAt: string | null;
}>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    interactionId: row.interactionId,
    roomId: row.roomId,
    projectionId: row.projectionId,
    originProjectionHash: row.originProjectionHash,
    interactionType: row.interactionType,
    consent: consentFromHash(row.consentHash),
    state: row.state,
    acceptedAt: row.acceptedAt,
    expiresAt: row.bodyExpiresAt,
    version: row.version,
    bodyAvailable: row.bodyAvailable,
    localPurgeReceivedAt: row.localPurgeReceivedAt,
  });
}

type PreparedMethodName = Exclude<keyof PublicCorePreparedSqlStoreV1, "runRetentionJanitor">;
type CapturedMethod = Readonly<{ receiver: PublicCorePreparedSqlStoreV1; method: (...args: readonly unknown[]) => unknown }>;

function captureMethod(store: PublicCorePreparedSqlStoreV1, name: PreparedMethodName): CapturedMethod {
  try {
    let cursor: object | null = store as object;
    for (let depth = 0; cursor !== null && depth < 16; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
      if (descriptor) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") fail(500, "public_core_postgres_store_invalid");
        return Object.freeze({ receiver: store, method: descriptor.value as (...args: readonly unknown[]) => unknown });
      }
      cursor = Object.getPrototypeOf(cursor) as object | null;
    }
  } catch (error) {
    const local = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
    if (local) fail(local.status, local.code);
  }
  fail(500, "public_core_postgres_store_invalid");
}

const METHOD_NAMES = Object.freeze([
  "listThirdPlace", "readProjection", "readInteraction", "readRoomOperatorStatus",
  "issuePublicEncounter", "createInteraction", "deleteInteraction", "exchangeRoomPair",
  "createRoom", "createRoomPair", "revokeRoomBinding", "setRoomMode", "revokeProjection",
  "admitProjection", "unlistProjection", "syncRoomOperator", "pullRoomOperator",
  "ackRoomOperator", "deliverProjection", "recordLocalPurgeReceipt",
] as const satisfies readonly PreparedMethodName[]);

interface OperationIdentityV1 extends PublicCorePostgresApplicationIdentityInputV1 {}

export class PublicCorePostgresApplicationStoreV1 implements PublicCoreApplicationStoreV1 {
  readonly #postgresStore: PublicCorePreparedSqlStoreV1;
  readonly #methods: ReadonlyMap<PreparedMethodName, CapturedMethod>;
  readonly #roomId: string;
  readonly #bodyEncryptionKey: PublicCoreCryptoKeyHandleV1;
  readonly #capabilityPepperKey: PublicCoreCryptoKeyHandleV1;
  readonly #nowReceiver: unknown;
  readonly #now: () => string;
  readonly #identityReceiver: PublicCorePostgresApplicationIdentityPortV1;
  readonly #deriveId: PublicCorePostgresApplicationIdentityPortV1["deriveId"];
  readonly #deriveSecret: PublicCorePostgresApplicationIdentityPortV1["deriveSecret"];
  readonly #deriveNonce: PublicCorePostgresApplicationIdentityPortV1["deriveNonce"];
  readonly #publicationVerifier: PublicCorePublicationVerifierV1;

  constructor(config: PublicCorePostgresApplicationStoreConfigV1) {
    try {
      if (!isRecord(config) || typeof config.roomId !== "string" || !new RegExp(`^room_${ID_SUFFIX}$`, "u").test(config.roomId)) {
        fail(500, "public_core_postgres_application_config_invalid");
      }
      if (!config.postgresStore || (typeof config.postgresStore !== "object" && typeof config.postgresStore !== "function")) {
        fail(500, "public_core_postgres_application_config_invalid");
      }
      if (!config.identity || typeof config.identity !== "object") fail(500, "public_core_postgres_application_config_invalid");
      const now = Object.getOwnPropertyDescriptor(config, "now")?.value;
      const verifier = Object.getOwnPropertyDescriptor(config, "publicationVerifier")?.value;
      const deriveId = Object.getOwnPropertyDescriptor(config.identity, "deriveId")?.value
        ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(config.identity), "deriveId")?.value;
      const deriveSecret = Object.getOwnPropertyDescriptor(config.identity, "deriveSecret")?.value
        ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(config.identity), "deriveSecret")?.value;
      const deriveNonce = Object.getOwnPropertyDescriptor(config.identity, "deriveNonce")?.value
        ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(config.identity), "deriveNonce")?.value;
      if ([now, verifier, deriveId, deriveSecret, deriveNonce].some((value) => typeof value !== "function")) {
        fail(500, "public_core_postgres_application_config_invalid");
      }
      this.#postgresStore = config.postgresStore;
      this.#methods = new Map(METHOD_NAMES.map((name) => [name, captureMethod(config.postgresStore, name)]));
      this.#roomId = config.roomId;
      this.#bodyEncryptionKey = config.bodyEncryptionKey;
      this.#capabilityPepperKey = config.capabilityPepperKey;
      this.#nowReceiver = config;
      this.#now = now as () => string;
      this.#identityReceiver = config.identity;
      this.#deriveId = deriveId as PublicCorePostgresApplicationIdentityPortV1["deriveId"];
      this.#deriveSecret = deriveSecret as PublicCorePostgresApplicationIdentityPortV1["deriveSecret"];
      this.#deriveNonce = deriveNonce as PublicCorePostgresApplicationIdentityPortV1["deriveNonce"];
      this.#publicationVerifier = verifier as PublicCorePublicationVerifierV1;
    } catch (error) {
      const local = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      if (local) fail(local.status, local.code);
      fail(500, "public_core_postgres_application_config_invalid");
    }
  }

  async #run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const local = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      if (local) fail(local.status, local.code);
      const postgres = authenticPublicCorePostgresErrorDetails(error);
      if (postgres) fail(postgres.status, postgres.code);
      fail(503, "public_core_postgres_application_unavailable");
    }
  }

  #clock(): string {
    try {
      return instant(Reflect.apply(this.#now, this.#nowReceiver, []), "public_core_clock_invalid");
    } catch (error) {
      const local = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      if (local) fail(local.status, local.code);
      fail(503, "public_core_clock_invalid");
    }
  }

  #operationIdentity(context: PublicCoreMutationContextV1): OperationIdentityV1 {
    return Object.freeze({
      purpose: "operation",
      action: context.action as PublicCoreSqlMutationActionV1,
      actorScopeDigest: context.actorScopeDigest,
      idempotencyKey: context.idempotencyKey,
      canonicalRequestHash: context.canonicalRequestHash,
    });
  }

  #id(identity: OperationIdentityV1, prefix: IdentityPrefix, purpose: string): string {
    let value: unknown;
    try {
      value = Reflect.apply(this.#deriveId, this.#identityReceiver, [Object.freeze({ ...identity, prefix, purpose })]);
    } catch {
      fail(503, "public_core_identity_port_failed");
    }
    if (typeof value !== "string" || !new RegExp(`^${prefix}_${ID_SUFFIX}$`, "u").test(value)) {
      fail(503, "public_core_identity_port_invalid");
    }
    return value;
  }

  #secret(identity: OperationIdentityV1, kind: IdentitySecretKind, purpose: string): string {
    let value: unknown;
    try {
      value = Reflect.apply(this.#deriveSecret, this.#identityReceiver, [Object.freeze({ ...identity, kind, purpose })]);
    } catch {
      fail(503, "public_core_identity_port_failed");
    }
    if (typeof value !== "string" || !SECRET.test(value)) fail(503, "public_core_identity_port_invalid");
    return value;
  }

  #nonce(identity: OperationIdentityV1, aad: PublicCoreFieldAadV1, purpose: string): Uint8Array {
    let value: unknown;
    try {
      value = Reflect.apply(this.#deriveNonce, this.#identityReceiver, [Object.freeze({
        ...identity,
        purpose,
        table: aad.table,
        column: aad.column,
        rowId: aad.rowId,
        objectVersion: aad.objectVersion,
      })]);
    } catch {
      fail(503, "public_core_identity_port_failed");
    }
    if (!(value instanceof Uint8Array) || value.byteLength !== 12) fail(503, "public_core_identity_port_invalid");
    return Uint8Array.from(value);
  }

  #digest(domain: PublicCoreSecretDigestDomain, value: string): PublicCoreSqlHmacSha256V1 {
    const bytes = new TextEncoder().encode(value);
    try {
      const digest = keyedPublicCoreDigest({ key: this.#capabilityPepperKey, domain, value: bytes }).digest;
      return `hmac-sha256:${digest.slice("sha256:".length)}`;
    } finally {
      bytes.fill(0);
    }
  }

  async #encrypt(
    identity: OperationIdentityV1,
    aad: PublicCoreFieldAadV1,
    plaintext: string,
    purpose: string,
  ): Promise<PublicCoreSqlEncryptedValueV1> {
    const bytes = new TextEncoder().encode(plaintext);
    const nonce = this.#nonce(identity, aad, purpose);
    try {
      const encrypted = await encryptPublicCoreField({
        key: this.#bodyEncryptionKey,
        plaintext: bytes,
        aad,
        nonceAuthority: Object.freeze({ reserve(): void {} }),
        nonceSource: () => nonce,
      });
      return Object.freeze({ envelope: encrypted.envelope, plaintextBytes: bytes.byteLength, fieldVersion: aad.objectVersion });
    } finally {
      bytes.fill(0);
      nonce.fill(0);
    }
  }

  async #invoke(name: PreparedMethodName, ...args: readonly unknown[]): Promise<unknown> {
    const captured = this.#methods.get(name);
    if (!captured) fail(500, "public_core_postgres_store_invalid");
    try {
      return snapshot(await Reflect.apply(captured.method, captured.receiver, args));
    } catch (error) {
      const local = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      if (local) fail(local.status, local.code);
      const postgres = authenticPublicCorePostgresErrorDetails(error);
      if (postgres) fail(postgres.status, postgres.code);
      fail(503, "public_core_postgres_store_unavailable");
    }
  }

  #mutationContext<A extends PublicCoreSqlMutationActionV1>(
    action: A,
    context: PublicCoreMutationContextV1,
    requestedAt: string,
  ): PublicCoreSqlMutationContextV1<A> {
    if (context.action !== action) fail(400, "public_core_action_mismatch");
    const identity = this.#operationIdentity(context);
    return Object.freeze({
      action,
      receiptId: this.#id(identity, "receipt", "mutation_receipt"),
      roomId: this.#roomId,
      actorClass: context.actorClass,
      actorScopeDigest: this.#digest("actor_scope", context.actorScopeDigest),
      idempotencyKey: context.idempotencyKey,
      canonicalRequestHash: context.canonicalRequestHash,
      expectedVersion: context.expectedVersion,
      requestedAt,
    });
  }

  #event(identity: OperationIdentityV1, purpose: string): Readonly<{ eventId: string; eventHash: PublicCoreSqlSha256V1 }> {
    const eventId = this.#id(identity, "event", purpose);
    return Object.freeze({
      eventId,
      eventHash: canonicalSha256({
        schemaVersion: "r4_public_core_event_intent.v1",
        action: identity.action,
        purpose,
        eventId,
        canonicalRequestHash: identity.canonicalRequestHash,
      }),
    });
  }

  #operatorDigest(context: PublicCoreMutationContextV1): PublicCoreSqlHmacSha256V1 {
    if (context.authorizationSecret === null) fail(404, "not_found");
    return this.#digest("room_binding_credential", context.authorizationSecret);
  }

  #mutationResult(value: unknown, action: PublicCoreSqlMutationActionV1): PublicCoreSqlMutationResultV1 {
    if (!isRecord(value) || value.action !== action || typeof value.kind !== "string"
      || typeof value.status !== "number" || typeof value.recovered !== "boolean") {
      fail(503, "public_core_store_contract_invalid");
    }
    return value as unknown as PublicCoreSqlMutationResultV1;
  }

  async #projectionFromCiphertext(input: Readonly<{
    roomId: string;
    projectionId: string;
    capsuleFieldVersion: number;
    payloadHash: PublicCoreSqlSha256V1;
    capsuleCiphertext: Readonly<Record<string, unknown>>;
  }>): Promise<ProjectionCapsuleV1> {
    return await withDecryptedCanonicalPublicCoreField({
      key: this.#bodyEncryptionKey,
      envelope: input.capsuleCiphertext,
      aad: Object.freeze({
        schemaVersion: "r4_public_core_aad.v1",
        table: "projections",
        column: "capsule_ciphertext",
        roomId: input.roomId,
        rowId: input.projectionId,
        objectVersion: input.capsuleFieldVersion,
      }),
      bodyReadable: true,
      expectedCanonicalHash: input.payloadHash,
      maximumPlaintextBytes: 131_072,
      parseCanonical(plaintext) {
        const projection = validateProjectionCapsuleV1(JSON.parse(plaintext));
        if (!sameFixedText(projection.payloadHash, input.payloadHash)) throw new TypeError("projection_payload_hash");
        const { payloadHash: _payloadHash, ...payloadPreimage } = projection;
        return Object.freeze({ value: projection, canonicalValue: payloadPreimage });
      },
    });
  }

  async listThirdPlace(): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const raw = await this.#invoke("listThirdPlace", Object.freeze({ roomId: this.#roomId, requestedAt: this.#clock() }));
      if (!isRecord(raw) || raw.kind !== "read" || raw.action !== "third_place.list" || !Array.isArray(raw.rows) || raw.rows.length > 1) {
        fail(503, "public_core_store_contract_invalid");
      }
      const residents: Readonly<Record<string, unknown>>[] = [];
      for (const item of raw.rows) {
        if (!isRecord(item)) fail(503, "public_core_store_contract_invalid");
        const row = item as unknown as Extract<PublicCoreSqlReadResultV1, { action: "third_place.list" }>["rows"][number];
        residents.push(Object.freeze({
          roomId: row.roomId,
          projection: await this.#projectionFromCiphertext(row),
        }));
      }
      return response(200, Object.freeze({ schemaVersion: "r4_public_core_third_place_list.v1", residents }), false);
    });
  }

  async readProjection(input: Readonly<{ projectionId: string }>): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const raw = await this.#invoke("readProjection", Object.freeze({ roomId: this.#roomId, projectionId: input.projectionId, requestedAt }));
      if (!isRecord(raw) || raw.kind !== "read" || raw.action !== "projection.read" || !Array.isArray(raw.rows) || raw.rows.length > 1) {
        fail(503, "public_core_store_contract_invalid");
      }
      if (raw.rows.length === 0) fail(404, "not_found");
      if (!isRecord(raw.rows[0])) fail(503, "public_core_store_contract_invalid");
      const row = raw.rows[0] as unknown as Extract<PublicCoreSqlReadResultV1, { action: "projection.read" }>["rows"][number];
      const projectionLifecycle = lifecycle(row);
      if (!row.bodyAvailable || row.capsuleCiphertext === null) {
        return response(410, Object.freeze({ schemaVersion: "r4_public_core_projection_tombstone.v1", ...projectionLifecycle }), false);
      }
      const projection = await this.#projectionFromCiphertext(row as typeof row & { capsuleCiphertext: Readonly<Record<string, unknown>> });
      const stale = row.ownerState === "stale" || Date.parse(row.freshUntil) <= Date.parse(requestedAt);
      return response(200, Object.freeze({
        schemaVersion: "r4_public_core_projection_read.v1",
        projection,
        lifecycle: projectionLifecycle,
        staleWarning: stale,
        discoverable: row.curationState === "admitted" && !stale,
        newKnockAvailable: row.interactionMode === "public_single" && row.curationState === "admitted" && !stale,
      }), false);
    });
  }

  async readInteraction(input: Readonly<{ interactionId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const raw = await this.#invoke("readInteraction", Object.freeze({
        roomId: this.#roomId,
        interactionId: input.interactionId,
        replySecretDigest: this.#digest("interaction_reply_secret", input.authorizationSecret),
        requestedAt: this.#clock(),
      }));
      if (!isRecord(raw) || raw.kind !== "read" || raw.action !== "interaction.read" || !Array.isArray(raw.rows) || raw.rows.length > 1) {
        fail(503, "public_core_store_contract_invalid");
      }
      if (raw.rows.length === 0) fail(404, "not_found");
      if (!isRecord(raw.rows[0])) fail(503, "public_core_store_contract_invalid");
      const row = raw.rows[0] as unknown as Extract<PublicCoreSqlReadResultV1, { action: "interaction.read" }>["rows"][number];
      return response(200, Object.freeze({ schemaVersion: "r4_public_core_interaction_status.v1", interaction: interactionView({ ...row, projectionId: row.originProjectionId }) }), false);
    });
  }

  async readRoomOperatorStatus(input: Readonly<{ roomId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (input.roomId !== this.#roomId) fail(404, "not_found");
      const raw = await this.#invoke("readRoomOperatorStatus", Object.freeze({
        roomId: this.#roomId,
        bindingCredentialDigest: this.#digest("room_binding_credential", input.authorizationSecret),
        requestedAt: this.#clock(),
      }));
      if (!isRecord(raw) || raw.kind !== "read" || raw.action !== "room_operator.status" || !Array.isArray(raw.rows) || raw.rows.length > 1) {
        fail(503, "public_core_store_contract_invalid");
      }
      if (raw.rows.length === 0) fail(404, "not_found");
      if (!isRecord(raw.rows[0])) fail(503, "public_core_store_contract_invalid");
      const row = raw.rows[0] as unknown as Extract<PublicCoreSqlReadResultV1, { action: "room_operator.status" }>["rows"][number];
      return response(200, Object.freeze({
        schemaVersion: "r4_public_core_room_operator_status.v1",
        roomId: row.roomId,
        roomMode: row.interactionMode,
        roomVersion: row.roomVersion,
        currentProjectionId: row.currentProjectionId,
        eventHighWater: row.eventHighWater,
        earliestReplayableSequence: row.eventReplayFloor,
        bindingId: row.bindingId,
        bindingVersion: row.bindingVersion,
        retentionWriteStop: row.writeStop,
      }), false);
    });
  }

  async createRoom(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const sqlContext = this.#mutationContext("room.create", context, requestedAt);
      const labelCiphertext = await this.#encrypt(identity, Object.freeze({
        schemaVersion: "r4_public_core_aad.v1", table: "rooms", column: "label_ciphertext",
        roomId: this.#roomId, rowId: this.#roomId, objectVersion: 1,
      }), input.label, "room_label");
      const result = this.#mutationResult(await this.#invoke("createRoom", sqlContext, Object.freeze({
        entityId: input.entityId,
        labelCiphertext,
        ...this.#event(identity, "room_created"),
      } satisfies PublicCoreCreateRoomSqlInputV1)), "room.create");
      if (result.kind !== "body_free") fail(503, "public_core_store_contract_invalid");
      return response(201, Object.freeze({
        schemaVersion: "r4_public_core_room_created.v1", roomId: result.targetId,
        roomVersion: result.targetVersion, roomMode: "closed",
      }), result.recovered);
    });
  }

  async createRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomPairInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (input.roomId !== this.#roomId) fail(404, "not_found");
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const pairingId = this.#id(identity, "pairing", "pairing_challenge");
      const pairingCode = this.#secret(identity, "pairing_code", "pairing_challenge");
      const pairingCodeCiphertext = await this.#encrypt(identity, Object.freeze({
        schemaVersion: "r4_public_core_aad.v1", table: "pairing_challenges", column: "pairing_code_ciphertext",
        roomId: this.#roomId, rowId: pairingId, objectVersion: 1,
      }), pairingCode, "pairing_code");
      const result = this.#mutationResult(await this.#invoke("createRoomPair", this.#mutationContext("room.pair", context, requestedAt), Object.freeze({
        pairingId,
        pairingCodeCiphertext,
        pairingCodeDigest: this.#digest("room_pairing_code", pairingCode),
        pairingExpiresAt: addMilliseconds(requestedAt, TEN_MINUTES_MS),
        ...this.#event(identity, "pairing_issued"),
      } satisfies PublicCoreCreateRoomPairSqlInputV1)), "room.pair");
      if (result.kind === "terminal_reconciliation") {
        return response(410, Object.freeze({ schemaVersion: "r4_public_core_terminal_reconciliation.v1", targetId: result.targetId, state: result.terminalState }), true);
      }
      if (result.kind !== "pairing_issue") fail(503, "public_core_store_contract_invalid");
      const revealed = await withDecryptedCanonicalPublicCoreField({
        key: this.#bodyEncryptionKey,
        envelope: result.pairingCodeCiphertext,
        aad: Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "pairing_challenges", column: "pairing_code_ciphertext", roomId: this.#roomId, rowId: result.pairingId, objectVersion: result.targetVersion }),
        bodyReadable: true,
        expectedCanonicalHash: canonicalSha256(pairingCode),
        maximumPlaintextBytes: 4_096,
        parseCanonical: (plaintext) => Object.freeze({ value: plaintext, canonicalValue: plaintext }),
      });
      if (!sameFixedText(revealed, pairingCode)) fail(503, "public_core_pairing_code_invalid");
      return response(201, Object.freeze({ schemaVersion: "r4_public_core_pairing_issued.v1", pairingId: result.pairingId, pairingCode: revealed, expiresAt: result.expiresAt, version: result.targetVersion }), result.recovered);
    });
  }

  async exchangeRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreExchangeRoomPairInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const bindingId = this.#id(identity, "binding", "room_binding");
      const bindingSecret = this.#secret(identity, "binding_secret", "room_binding");
      const bindingExpiresAt = addMilliseconds(requestedAt, THIRTY_DAYS_MS);
      const exchangePlaintext = canonicalJson({
        schemaVersion: "r4_public_core_binding_exchange.v1", bindingId, roomId: this.#roomId,
        bindingSecret, clientPublicKey: input.clientPublicKey, expiresAt: bindingExpiresAt,
      });
      const exchangeEnvelopeCiphertext = await this.#encrypt(identity, Object.freeze({
        schemaVersion: "r4_public_core_aad.v1", table: "pairing_challenges", column: "exchange_envelope_ciphertext",
        roomId: this.#roomId, rowId: input.pairingId, objectVersion: (context.expectedVersion ?? 0) + 1,
      }), exchangePlaintext, "binding_exchange");
      const sqlInput: PublicCoreExchangeRoomPairSqlInputV1 = Object.freeze({
        pairingId: input.pairingId,
        clientPublicKeyHash: canonicalSha256(input.clientPublicKey),
        pairingCodeDigest: this.#digest("room_pairing_code", input.pairingCode),
        exchangeEnvelopeCiphertext,
        bindingId,
        bindingCredentialDigest: this.#digest("room_binding_credential", bindingSecret),
        bindingExpiresAt,
        ...this.#event(identity, "pairing_exchanged"),
      });
      const result = this.#mutationResult(await this.#invoke("exchangeRoomPair", this.#mutationContext("room.pair.exchange", context, requestedAt), sqlInput), "room.pair.exchange");
      if (result.kind === "terminal_reconciliation") return response(410, Object.freeze({ schemaVersion: "r4_public_core_terminal_reconciliation.v1", targetId: result.targetId, state: result.terminalState }), true);
      if (result.kind !== "pairing_exchange") fail(503, "public_core_store_contract_invalid");
      return response(201, Object.freeze({ schemaVersion: "r4_public_core_pairing_exchanged.v1", pairingId: result.pairingId, bindingId: result.bindingId, exchangeEnvelope: result.exchangeEnvelopeCiphertext, version: result.targetVersion }), result.recovered);
    });
  }

  async issuePublicEncounter(context: PublicCoreMutationContextV1, input: PublicCoreIssueEncounterInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const requested = Date.parse(requestedAt);
      const identity = this.#operationIdentity(context);
      const encounterExpiresAt = addMilliseconds(requestedAt, DAY_MS);
      const dayWindowStart = new Date(Math.floor(requested / DAY_MS) * DAY_MS).toISOString();
      const hourWindowStart = new Date(Math.floor(requested / HOUR_MS) * HOUR_MS).toISOString();
      const rateExpiresAt = new Date(Math.max(Date.parse(dayWindowStart) + DAY_MS, Date.parse(encounterExpiresAt))).toISOString();
      const bucketValue = `${this.#roomId}\u0000${input.coarseRateBucket}`;
      const result = this.#mutationResult(await this.#invoke("issuePublicEncounter", this.#mutationContext("public_encounter.issue", context, requestedAt), Object.freeze({
        projectionId: input.projectionId,
        encounterId: this.#id(identity, "encounter", "public_encounter"),
        encounterSecretDigest: this.#digest("public_encounter_secret", input.encounterSecret),
        issuanceBucketDigest: this.#digest("coarse_rate_bucket", bucketValue),
        hourlyRateEventId: this.#id(identity, "rate", "encounter_hourly_rate"),
        hourlyBucketDigest: this.#digest("coarse_rate_bucket", bucketValue),
        hourWindowStart,
        dailyRateEventId: this.#id(identity, "rate", "encounter_daily_rate"),
        dailyBucketDigest: this.#digest("coarse_rate_bucket", bucketValue),
        dayWindowStart,
        rateExpiresAt,
        encounterExpiresAt,
        ...this.#event(identity, "encounter_issued"),
      } satisfies PublicCoreIssueEncounterSqlInputV1)), "public_encounter.issue");
      if (result.kind !== "encounter_issue") fail(503, "public_core_store_contract_invalid");
      return response(201, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: result.encounterId, targetVersion: result.encounterVersion, code: "encounter_issued", expiresAt: result.expiresAt }), result.recovered);
    });
  }

  async createInteraction(context: PublicCoreMutationContextV1, input: PublicCoreCreateInteractionInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (context.authorizationSecret === null) fail(404, "not_found");
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const interactionId = this.#id(identity, "interaction", "interaction");
      const requestCiphertext = await this.#encrypt(identity, Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "request_ciphertext", roomId: this.#roomId, rowId: interactionId, objectVersion: 1 }), input.requestBody, "interaction_request");
      const guestPlaintext = input.guestCapsule === null ? null : canonicalJson(input.guestCapsule);
      const guestCapsuleCiphertext = guestPlaintext === null ? null : await this.#encrypt(identity, Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "guest_capsule_ciphertext", roomId: this.#roomId, rowId: interactionId, objectVersion: 1 }), guestPlaintext, "interaction_guest_capsule");
      const dayWindowStart = new Date(Math.floor(Date.parse(requestedAt) / DAY_MS) * DAY_MS).toISOString();
      const sqlInput: PublicCoreCreateInteractionSqlInputV1 = Object.freeze({
        interactionId,
        interactionType: input.interactionType,
        projectionId: input.projectionId,
        acceptRateEventId: this.#id(identity, "rate", "interaction_daily_rate"),
        dayWindowStart,
        rateExpiresAt: addMilliseconds(dayWindowStart, DAY_MS),
        requestCiphertext,
        guestCapsuleCiphertext,
        requestBodyHash: canonicalSha256(input.requestBody),
        guestCapsuleBodyHash: guestPlaintext === null ? null : canonicalSha256(guestPlaintext),
        consentHash: canonicalSha256({ consent: input.consent }),
        replySecretDigest: this.#digest("interaction_reply_secret", input.replySecret),
        deleteSecretDigest: this.#digest("interaction_delete_secret", input.deleteSecret),
        bodyExpiresAt: addMilliseconds(requestedAt, THIRTY_DAYS_MS),
        encounterSecretDigest: this.#digest("public_encounter_secret", context.authorizationSecret),
        ...this.#event(identity, "interaction_accepted"),
      });
      const result = this.#mutationResult(await this.#invoke("createInteraction", this.#mutationContext("interaction.create", context, requestedAt), sqlInput), "interaction.create");
      if (result.kind !== "body_free") fail(503, "public_core_store_contract_invalid");
      return response(201, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: result.targetId, targetVersion: result.targetVersion, code: "interaction_created", state: "accepted" }), result.recovered);
    });
  }

  async deleteInteraction(context: PublicCoreMutationContextV1, input: PublicCoreDeleteInteractionInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (context.authorizationSecret === null) fail(404, "not_found");
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const result = this.#mutationResult(await this.#invoke("deleteInteraction", this.#mutationContext("interaction.delete", context, requestedAt), Object.freeze({
        interactionId: input.interactionId,
        interactionPurgeJobId: this.#id(identity, "purge", "interaction_delete"),
        deleteSecretDigest: this.#digest("interaction_delete_secret", context.authorizationSecret),
        ...this.#event(identity, "interaction_deleted"),
      })), "interaction.delete");
      if (result.kind !== "body_free") fail(503, "public_core_store_contract_invalid");
      return response(200, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: result.targetId, targetVersion: result.targetVersion, code: "interaction_deleted", bodyAvailable: false }), result.recovered);
    });
  }

  async revokeRoomBinding(context: PublicCoreMutationContextV1, input: PublicCoreRevokeRoomBindingInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#genericMutation("room.binding.revoke", "revokeRoomBinding", context, Object.freeze({ bindingId: input.bindingId }), "binding_revoked", "binding", input.bindingId);
  }

  async setRoomMode(context: PublicCoreMutationContextV1, input: PublicCoreSetRoomModeInputV1): Promise<PublicCoreOperationResponseV1> {
    if (input.roomId !== this.#roomId) return await this.#run(async () => fail(404, "not_found"));
    return await this.#genericMutation("room.mode.set", "setRoomMode", context, Object.freeze({ interactionMode: input.interactionMode }), "room_mode_set", "room", this.#roomId);
  }

  async revokeProjection(context: PublicCoreMutationContextV1, input: PublicCoreRevokeProjectionInputV1): Promise<PublicCoreOperationResponseV1> {
    const identity = this.#operationIdentity(context);
    return await this.#genericMutation("projection.revoke", "revokeProjection", context, Object.freeze({ projectionId: input.projectionId, projectionPurgeJobId: this.#id(identity, "purge", "projection_revoke") }), "projection_revoked", "projection", input.projectionId);
  }

  async admitProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#genericMutation("curation.admit", "admitProjection", context, Object.freeze({ projectionId: input.projectionId }), "projection_admitted", "projection", input.projectionId);
  }

  async unlistProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#genericMutation("curation.unlist", "unlistProjection", context, Object.freeze({ projectionId: input.projectionId }), "projection_unlisted", "projection", input.projectionId);
  }

  async #genericMutation(
    action: PublicCoreSqlMutationActionV1,
    method: PreparedMethodName,
    context: PublicCoreMutationContextV1,
    coreInput: Readonly<Record<string, unknown>>,
    code: string,
    eventPurpose: string,
    expectedTargetId: string,
  ): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const result = this.#mutationResult(await this.#invoke(method, this.#mutationContext(action, context, requestedAt), Object.freeze({ ...coreInput, ...this.#event(identity, eventPurpose) })), action);
      if (result.kind !== "body_free" || result.targetId !== expectedTargetId) fail(503, "public_core_store_contract_invalid");
      return response(result.status, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action, targetId: result.targetId, targetVersion: result.targetVersion, code }), result.recovered);
    });
  }

  async syncRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreSyncInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (input.roomId !== this.#roomId) fail(404, "not_found");
      const requestedAt = this.#clock();
      const result = this.#mutationResult(await this.#invoke("syncRoomOperator", this.#mutationContext("room_operator.sync", context, requestedAt), Object.freeze({ bindingCredentialDigest: this.#operatorDigest(context), afterSequence: input.afterSequence })), "room_operator.sync");
      if (result.kind !== "sync_window" && result.kind !== "cursor_gone") fail(503, "public_core_store_contract_invalid");
      const events = result.events.map((event) => Object.freeze({
        schemaVersion: "r4_public_core_room_event.v1",
        eventId: event.eventId,
        roomId: result.roomId,
        sequence: event.sequence,
        action: event.action,
        targetKind: event.targetKind,
        targetId: event.targetId,
        targetVersion: event.targetVersion,
        eventHash: event.eventHash,
        committedAt: event.committedAt,
        bodyAvailable: event.bodyAvailable,
      }));
      const body = result.kind === "cursor_gone"
        ? Object.freeze({ schemaVersion: "r4_public_core_cursor_gone.v1", roomId: result.roomId, afterSequence: result.afterSequence, highWater: result.highWater, earliestReplayableSequence: result.replayFloor, events, tombstoneIds: result.tombstoneIds })
        : Object.freeze({ schemaVersion: "r4_public_core_event_batch.v1", roomId: result.roomId, afterSequence: result.afterSequence, highWater: result.highWater, events });
      return response(result.status, body, result.recovered);
    });
  }

  async pullRoomOperator(context: PublicCoreMutationContextV1, input: PublicCorePullInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const result = this.#mutationResult(await this.#invoke("pullRoomOperator", this.#mutationContext("room_operator.pull", context, requestedAt), Object.freeze({ bindingCredentialDigest: this.#operatorDigest(context), interactionId: input.interactionId, ...this.#event(identity, "interaction_pulled") })), "room_operator.pull");
      if (result.kind === "terminal_reconciliation") return response(410, Object.freeze({
        schemaVersion: "r4_public_core_pull_terminal.v1",
        interactionId: result.targetId,
        state: result.terminalState === "unavailable" ? "receipt_version_unavailable" : result.terminalState,
        bodyAvailable: false,
      }), result.recovered);
      if (result.kind !== "interaction_pull") fail(503, "public_core_store_contract_invalid");
      const requestBody = await withDecryptedCanonicalPublicCoreField({
        key: this.#bodyEncryptionKey,
        envelope: result.requestCiphertext,
        aad: Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "request_ciphertext", roomId: this.#roomId, rowId: result.interactionId, objectVersion: result.requestFieldVersion }),
        bodyReadable: true,
        expectedCanonicalHash: result.bodyHash,
        maximumPlaintextBytes: 32_768,
        parseCanonical: (plaintext) => Object.freeze({ value: plaintext, canonicalValue: plaintext }),
      });
      let guestCapsule: GuestCapsuleV1 | null = null;
      if (result.guestCapsuleCiphertext !== null) {
        if (result.guestCapsuleFieldVersion === null || result.guestCapsuleHash === null) fail(503, "public_core_store_contract_invalid");
        guestCapsule = await withDecryptedCanonicalPublicCoreField({
          key: this.#bodyEncryptionKey,
          envelope: result.guestCapsuleCiphertext,
          aad: Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "guest_capsule_ciphertext", roomId: this.#roomId, rowId: result.interactionId, objectVersion: result.guestCapsuleFieldVersion }),
          bodyReadable: true,
          expectedCanonicalHash: result.guestCapsuleHash,
          maximumPlaintextBytes: 4_096,
          parseCanonical(plaintext) { return Object.freeze({ value: validateGuestCapsuleV1(JSON.parse(plaintext)), canonicalValue: plaintext }); },
        });
      }
      return response(200, Object.freeze({
        schemaVersion: "r4_public_core_pull.v1",
        interaction: interactionView({
          interactionId: result.interactionId,
          roomId: this.#roomId,
          projectionId: result.projectionId,
          originProjectionHash: result.originProjectionHash,
          interactionType: result.interactionType,
          consentHash: result.consentHash,
          state: result.interactionState,
          acceptedAt: result.acceptedAt,
          bodyExpiresAt: result.bodyExpiresAt,
          version: result.interactionVersion,
          bodyAvailable: true,
          localPurgeReceivedAt: result.localPurgeReceivedAt,
        }),
        requestBody,
        guestCapsule,
        bodyHash: result.bodyHash,
      }), result.recovered);
    });
  }

  async ackRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreAckInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (input.roomId !== this.#roomId) fail(404, "not_found");
      const identity = this.#operationIdentity(context);
      const sqlInput: PublicCoreAckRoomOperatorSqlInputV1 = Object.freeze({
        ackId: this.#id(identity, "ack", "event_ack"),
        bindingCredentialDigest: this.#operatorDigest(context),
        eventId: input.eventId,
        sequence: input.sequence,
        eventHash: input.eventHash,
      });
      const result = this.#mutationResult(await this.#invoke("ackRoomOperator", this.#mutationContext("room_operator.ack", context, this.#clock()), sqlInput), "room_operator.ack");
      if (result.kind !== "ack") fail(503, "public_core_store_contract_invalid");
      return response(200, Object.freeze({ schemaVersion: "r4_public_core_ack_receipt.v1", kind: "ack", ackId: result.ackId, eventId: result.eventId, sequence: result.sequence, eventHash: result.eventHash }), result.recovered);
    });
  }

  async deliverProjection(context: PublicCoreMutationContextV1, input: PublicCoreDeliverProjectionInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const projection = validateProjectionCapsuleV1(input.projection);
      if (projection.roomId !== this.#roomId) fail(404, "not_found");
      let verifiedRaw: unknown;
      try {
        verifiedRaw = await Reflect.apply(this.#publicationVerifier, undefined, [Object.freeze({ projection: snapshot(projection), publicationApprovalHash: input.publicationApprovalHash, publicationAttestationHash: input.publicationAttestationHash })]);
      } catch {
        fail(503, "public_core_publication_verifier_failed");
      }
      const verified = snapshot(verifiedRaw);
      if (!isRecord(verified) || Object.keys(verified).sort().join("|") !== "basisHash|projectionPolicyHash|publicationApprovalId"
        || typeof verified.basisHash !== "string" || !SHA256.test(verified.basisHash)
        || typeof verified.projectionPolicyHash !== "string" || !SHA256.test(verified.projectionPolicyHash)
        || typeof verified.publicationApprovalId !== "string" || !new RegExp(`^approval_${ID_SUFFIX}$`, "u").test(verified.publicationApprovalId)) {
        fail(503, "public_core_publication_verifier_invalid");
      }
      const capsuleCiphertext = await this.#encrypt(identity, Object.freeze({ schemaVersion: "r4_public_core_aad.v1", table: "projections", column: "capsule_ciphertext", roomId: this.#roomId, rowId: projection.projectionId, objectVersion: 1 }), canonicalJson(projection), "projection_capsule");
      const sqlInput: PublicCoreDeliverProjectionSqlInputV1 = Object.freeze({
        bindingCredentialDigest: this.#operatorDigest(context),
        projectionId: projection.projectionId,
        capsuleCiphertext,
        payloadHash: projection.payloadHash,
        basisHash: verified.basisHash as PublicCoreSqlSha256V1,
        projectionPolicyHash: verified.projectionPolicyHash as PublicCoreSqlSha256V1,
        publicationApprovalId: verified.publicationApprovalId,
        publicationApprovalHash: input.publicationApprovalHash,
        publicationAttestationHash: input.publicationAttestationHash,
        publishedAt: projection.publishedAt,
        freshUntil: projection.freshUntil,
        expiresAt: projection.expiresAt,
        projectionPurgeJobId: this.#id(identity, "purge", "superseded_projection"),
        ...this.#event(identity, "projection_delivered"),
      });
      const result = this.#mutationResult(await this.#invoke("deliverProjection", this.#mutationContext("room_operator.projection.deliver", context, requestedAt), sqlInput), "room_operator.projection.deliver");
      if (result.kind !== "body_free" || result.targetId !== projection.projectionId) fail(503, "public_core_store_contract_invalid");
      return response(201, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: result.targetId, targetVersion: result.targetVersion, code: "projection_delivered" }), result.recovered);
    });
  }

  async recordLocalPurgeReceipt(context: PublicCoreMutationContextV1, input: PublicCoreLocalPurgeInputV1): Promise<PublicCoreOperationResponseV1> {
    return await this.#run(async () => {
      if (input.localBytesAbsent !== true) fail(400, "local_purge_attestation_required");
      const requestedAt = this.#clock();
      const identity = this.#operationIdentity(context);
      const sqlInput: PublicCoreRecordLocalPurgeSqlInputV1 = Object.freeze({
        bindingCredentialDigest: this.#operatorDigest(context),
        interactionId: input.interactionId,
        ...this.#event(identity, "local_purge_receipted"),
      });
      const result = this.#mutationResult(await this.#invoke("recordLocalPurgeReceipt", this.#mutationContext("room_operator.local_purge.receipt", context, requestedAt), sqlInput), "room_operator.local_purge.receipt");
      if (result.kind !== "body_free" || result.targetId !== input.interactionId) fail(503, "public_core_store_contract_invalid");
      return response(200, Object.freeze({ schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: result.targetId, targetVersion: result.targetVersion, code: "local_purge_recorded" }), result.recovered);
    });
  }
}

export function createPublicCorePostgresApplicationStoreV1(
  config: PublicCorePostgresApplicationStoreConfigV1,
): PublicCorePostgresApplicationStoreV1 {
  return new PublicCorePostgresApplicationStoreV1(config);
}
