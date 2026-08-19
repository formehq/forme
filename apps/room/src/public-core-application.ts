import {
  assertCanonicalText,
  assertOpaqueId,
  assertSha256,
  canonicalSha256,
  validateGuestCapsuleV1,
  validateProjectionCapsuleV1,
  type GuestCapsuleV1,
  type InteractionConsent,
  type InteractionType,
  type ProjectionCapsuleV1,
} from "../../../packages/r4-protocol/src/index.ts";
import {
  PUBLIC_CORE_ACTION_NAMES,
  assertPublicCoreAction,
  type PublicCoreActionName,
} from "./public-core-policy.ts";
import { authenticPublicCorePostgresApplicationStoreErrorDetails } from "./public-core-postgres-application-store.ts";
import {
  PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS,
  PUBLIC_CORE_ROOM_EVENT_CONTRACT,
  authenticPublicCoreStoreErrorDetails,
  type PublicCoreRoomEventV1,
  type PublicCoreActorClass,
  type PublicCoreApplicationStoreV1,
  type PublicCoreMutationContextV1,
  type PublicCoreOperationResponseV1,
  type PublicCoreRoomMode,
  type PublicCoreSha256,
} from "./public-core-store.ts";

export interface PublicCoreOperationInputV1 {
  readonly schemaVersion: "r4_public_core_operation_input.v1";
  readonly action: string;
  readonly actorClass: PublicCoreActorClass;
  readonly actorScopeDigest: PublicCoreSha256;
  readonly params: Readonly<Record<string, unknown>>;
  readonly body: Readonly<Record<string, unknown>>;
  readonly authorizationSecret: string | null;
  readonly idempotencyKey: string | null;
  readonly expectedVersion: number | null;
}

/**
 * Server-derived transport facts are injected beside, never inside, the
 * public operation body. A route/edge adapter owns this value; a Guest cannot
 * select or rotate it through request JSON.
 */
export interface PublicCoreTrustedTransportMetadataV1 {
  readonly schemaVersion: "r4_public_core_trusted_transport_metadata.v1";
  readonly coarseRateBucket: string | null;
}

const EMPTY_TRUSTED_TRANSPORT_METADATA: PublicCoreTrustedTransportMetadataV1 = Object.freeze({
  schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
  coarseRateBucket: null,
});

export class PublicCoreApplicationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "PublicCoreApplicationError";
    this.status = status;
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; status: number; code: string }> {
    return Object.freeze({ name: this.name, status: this.status, code: this.code });
  }
}

function fail(status: number, code: string): never {
  throw new PublicCoreApplicationError(status, code);
}

const OWNED_SNAPSHOT_REJECTED = Object.freeze(new Error("PUBLIC_CORE_OWNED_SNAPSHOT_REJECTED"));
const STORE_CONTRACT_REJECTED = Object.freeze(new Error("PUBLIC_CORE_STORE_CONTRACT_REJECTED"));

function deepFreezeOwned<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreezeOwned(child);
    Object.freeze(value);
  }
  return value;
}

function ownedPlainSnapshot(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw OWNED_SNAPSHOT_REJECTED;
    return value;
  }
  if (typeof value !== "object" || depth > 64 || seen.has(value)) throw OWNED_SNAPSHOT_REJECTED;
  seen.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length !== 0) throw OWNED_SNAPSHOT_REJECTED;
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) throw OWNED_SNAPSHOT_REJECTED;
      const length = descriptors.length;
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0) throw OWNED_SNAPSHOT_REJECTED;
      const result: unknown[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) throw OWNED_SNAPSHOT_REJECTED;
        result.push(ownedPlainSnapshot(descriptor.value, seen, depth + 1));
      }
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key))) throw OWNED_SNAPSHOT_REJECTED;
      return result;
    }
    if (prototype !== Object.prototype && prototype !== null) throw OWNED_SNAPSHOT_REJECTED;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor) || descriptor.enumerable !== true) throw OWNED_SNAPSHOT_REJECTED;
      result[key] = ownedPlainSnapshot(descriptor.value, seen, depth + 1);
    }
    return result;
  } catch {
    throw OWNED_SNAPSHOT_REJECTED;
  } finally {
    seen.delete(value);
  }
}

function ownedRequestSnapshot<T>(value: T, code: string): T {
  try {
    return deepFreezeOwned(ownedPlainSnapshot(value) as T);
  } catch {
    fail(400, code);
  }
}

function contract(condition: unknown): asserts condition {
  if (!condition) throw STORE_CONTRACT_REJECTED;
}

function contractRecord(value: unknown): Readonly<Record<string, unknown>> {
  contract(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Readonly<Record<string, unknown>>;
}

function contractExact(value: Readonly<Record<string, unknown>>, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  contract(actual.length === expected.length && actual.every((key, index) => key === expected[index]));
}

function contractId(value: unknown, prefix: string): asserts value is string {
  contract(typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value));
}

function contractSha(value: unknown): asserts value is PublicCoreSha256 {
  contract(typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value));
}

function contractInstant(value: unknown): asserts value is string {
  contract(typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value);
}

function contractVersion(value: unknown): asserts value is number {
  contract(Number.isSafeInteger(value) && (value as number) >= 1);
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(400, "invalid_request_shape");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(400, "invalid_request_shape");
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(value: Readonly<Record<string, unknown>>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) {
    fail(400, "invalid_request_shape");
  }
}

function text(value: unknown, maximumBytes: number, minimumScalars = 1): string {
  try {
    assertCanonicalText(value, "$input", { minScalars: minimumScalars, maxBytes: maximumBytes });
    return value;
  } catch {
    fail(400, "invalid_request");
  }
}

function id(value: unknown, prefix: string): string {
  try {
    assertOpaqueId(value, prefix, "$input");
    return value;
  } catch {
    fail(400, "invalid_request");
  }
}

function sha(value: unknown): PublicCoreSha256 {
  try {
    assertSha256(value, "$input");
    return value;
  } catch {
    fail(400, "invalid_request");
  }
}

function integer(value: unknown, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(400, "invalid_request");
  return value as number;
}

function secret(value: unknown): string {
  const result = text(value, 4_096, 16);
  if (!/^[A-Za-z0-9_-]+$/u.test(result)) fail(400, "invalid_capability_secret");
  return result;
}

function coarseRateBucket(value: unknown): string {
  const result = text(value, 160, 23);
  if (!/^bucket_[A-Za-z0-9_-]{16,128}$/u.test(result)) fail(400, "invalid_coarse_rate_bucket");
  return result;
}

function empty(value: Readonly<Record<string, unknown>>): void {
  exactKeys(value, []);
}

function projection(value: unknown): ProjectionCapsuleV1 {
  try {
    const result = validateProjectionCapsuleV1(value);
    if (Buffer.byteLength(JSON.stringify(result), "utf8") > PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["projections.capsule"]) {
      fail(400, "invalid_projection");
    }
    return result;
  } catch {
    fail(400, "invalid_projection");
  }
}

function guestCapsule(value: unknown): GuestCapsuleV1 | null {
  if (value === null) return null;
  try {
    const result = validateGuestCapsuleV1(value);
    if (Buffer.byteLength(JSON.stringify(result), "utf8") > PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["interactions.guest_capsule"]) {
      fail(400, "invalid_guest_capsule");
    }
    return result;
  } catch {
    fail(400, "invalid_guest_capsule");
  }
}

function interactionType(value: unknown): InteractionType {
  if (value !== "ask" && value !== "seed" && value !== "resonance") fail(400, "invalid_interaction_type");
  return value;
}

function consent(value: unknown): InteractionConsent {
  if (value !== "allow_owner_local_ai" && value !== "manual_owner_only") fail(400, "invalid_consent");
  return value;
}

function roomMode(value: unknown): PublicCoreRoomMode {
  if (value !== "public_single" && value !== "closed") fail(400, "invalid_room_mode");
  return value;
}

function requireAuthorization(input: PublicCoreOperationInputV1): string {
  if (input.authorizationSecret === null) fail(404, "not_found");
  return secret(input.authorizationSecret);
}

function assertAuthorizationShape(input: PublicCoreOperationInputV1): void {
  const requiresSecret = input.actorClass === "guest_capability" || input.actorClass === "room_operator";
  const exchangeCarriesCode = input.action === "room.pair.exchange";
  if (requiresSecret) requireAuthorization(input);
  else if (input.authorizationSecret !== null && !exchangeCarriesCode) fail(400, "unexpected_authorization");
}

function mutationContext(
  input: PublicCoreOperationInputV1,
  action: PublicCoreActionName,
  trustedTransport: PublicCoreTrustedTransportMetadataV1,
): PublicCoreMutationContextV1 {
  const definition = assertPublicCoreAction(action);
  if (!definition.mutating) fail(400, "mutation_context_for_read");
  if (typeof input.idempotencyKey !== "string" || !/^(?:[A-Fa-f0-9]{32,256}|[A-Za-z0-9_-]{22,256})$/u.test(input.idempotencyKey)) {
    fail(400, "idempotency_key_required");
  }
  if (definition.expectedVersion) {
    integer(input.expectedVersion, 1);
  } else if (input.expectedVersion !== null) {
    fail(400, "unexpected_expected_version");
  }
  const canonicalRequestHash = canonicalSha256({
    schemaVersion: input.schemaVersion,
    action,
    actorClass: input.actorClass,
    actorScopeDigest: input.actorScopeDigest,
    params: input.params,
    body: input.body,
    trustedTransport: action === "public_encounter.issue" ? trustedTransport : null,
    expectedVersion: input.expectedVersion,
  });
  return Object.freeze({
    action,
    actorClass: input.actorClass,
    actorScopeDigest: input.actorScopeDigest,
    idempotencyKey: input.idempotencyKey,
    canonicalRequestHash,
    expectedVersion: input.expectedVersion,
    authorizationSecret: input.authorizationSecret,
  });
}

function assertReadEnvelope(input: PublicCoreOperationInputV1): void {
  if (input.idempotencyKey !== null || input.expectedVersion !== null) fail(400, "read_envelope_invalid");
}

function contractProjection(value: unknown): ProjectionCapsuleV1 {
  try {
    const result = validateProjectionCapsuleV1(value);
    contract(Buffer.byteLength(JSON.stringify(result), "utf8") <= PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["projections.capsule"]);
    return result;
  } catch {
    throw STORE_CONTRACT_REJECTED;
  }
}

function contractGuest(value: unknown): GuestCapsuleV1 | null {
  if (value === null) return null;
  try {
    const result = validateGuestCapsuleV1(value);
    contract(Buffer.byteLength(JSON.stringify(result), "utf8") <= PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["interactions.guest_capsule"]);
    return result;
  } catch {
    throw STORE_CONTRACT_REJECTED;
  }
}

const PROJECTION_LIFECYCLE_KEYS = [
  "projectionId", "roomId", "payloadHash", "ownerState", "curationState", "current", "publishedAt",
  "freshUntil", "expiresAt", "version", "bodyAvailable",
] as const;
const INTERACTION_VIEW_KEYS = [
  "interactionId", "roomId", "projectionId", "originProjectionHash", "interactionType", "consent", "state",
  "acceptedAt", "expiresAt", "version", "bodyAvailable", "localPurgeReceivedAt",
] as const;

function contractProjectionLifecycle(value: unknown): Readonly<Record<string, unknown>> {
  const lifecycle = contractRecord(value);
  contractExact(lifecycle, PROJECTION_LIFECYCLE_KEYS);
  contractId(lifecycle.projectionId, "proj"); contractId(lifecycle.roomId, "room"); contractSha(lifecycle.payloadHash);
  contract(["published_fresh", "stale", "superseded", "revoked", "expired"].includes(lifecycle.ownerState as string));
  contract(["not_admitted", "admitted", "unlisted"].includes(lifecycle.curationState as string));
  contract(typeof lifecycle.current === "boolean" && typeof lifecycle.bodyAvailable === "boolean");
  contractInstant(lifecycle.publishedAt); contractInstant(lifecycle.freshUntil); contractInstant(lifecycle.expiresAt); contractVersion(lifecycle.version);
  contract(Date.parse(lifecycle.publishedAt) < Date.parse(lifecycle.freshUntil) && Date.parse(lifecycle.freshUntil) < Date.parse(lifecycle.expiresAt));
  const terminal = ["superseded", "revoked", "expired"].includes(lifecycle.ownerState as string);
  contract(terminal
    ? lifecycle.current === false && lifecycle.bodyAvailable === false
    : lifecycle.current === true && lifecycle.bodyAvailable === true);
  return lifecycle;
}

function contractInteractionView(value: unknown): Readonly<Record<string, unknown>> {
  const interaction = contractRecord(value);
  contractExact(interaction, INTERACTION_VIEW_KEYS);
  contractId(interaction.interactionId, "interaction"); contractId(interaction.roomId, "room"); contractId(interaction.projectionId, "proj");
  contractSha(interaction.originProjectionHash);
  contract(["ask", "seed", "resonance"].includes(interaction.interactionType as string));
  contract(interaction.consent === "allow_owner_local_ai" || interaction.consent === "manual_owner_only");
  contract(["accepted", "seen_locally", "interaction_deleted", "interaction_expired", "origin_revoked"].includes(interaction.state as string));
  contractInstant(interaction.acceptedAt); contractInstant(interaction.expiresAt); contractVersion(interaction.version);
  contract(
    typeof interaction.bodyAvailable === "boolean"
    && Date.parse(interaction.acceptedAt) < Date.parse(interaction.expiresAt)
    && Date.parse(interaction.expiresAt) - Date.parse(interaction.acceptedAt) <= 30 * 24 * 60 * 60 * 1_000,
  );
  if (interaction.localPurgeReceivedAt !== null) {
    contractInstant(interaction.localPurgeReceivedAt);
    contract(Date.parse(interaction.localPurgeReceivedAt) >= Date.parse(interaction.acceptedAt));
  }
  const terminal = ["interaction_deleted", "interaction_expired", "origin_revoked"].includes(interaction.state as string);
  contract(interaction.bodyAvailable === !terminal);
  return interaction;
}

function contractRoomEvent(value: unknown): PublicCoreRoomEventV1 {
  const event = contractRecord(value);
  contractExact(event, [
    "schemaVersion", "eventId", "roomId", "sequence", "action", "targetKind", "targetId", "targetVersion",
    "eventHash", "committedAt", "bodyAvailable",
  ]);
  contract(event.schemaVersion === "r4_public_core_room_event.v1"); contractId(event.eventId, "event"); contractId(event.roomId, "room");
  contract(Number.isSafeInteger(event.sequence) && (event.sequence as number) >= 1 && PUBLIC_CORE_ACTION_NAMES.includes(event.action as PublicCoreActionName));
  const expectedTarget = PUBLIC_CORE_ROOM_EVENT_CONTRACT[event.action as PublicCoreActionName];
  contract(
    expectedTarget !== undefined
    && event.targetKind === expectedTarget.targetKind
    && event.bodyAvailable === expectedTarget.bodyAvailable,
  );
  contractId(event.targetId, expectedTarget.targetIdPrefix); contractVersion(event.targetVersion); contractInstant(event.committedAt);
  if (expectedTarget.targetKind === "room") contract(event.targetId === event.roomId);
  contractSha(event.eventHash);
  const { eventHash, ...preimage } = event;
  contract(canonicalSha256(preimage) === eventHash);
  return event as unknown as PublicCoreRoomEventV1;
}

function contractEnvelope(value: unknown, maxCiphertextBytes: number): void {
  const envelope = contractRecord(value);
  contractExact(envelope, ["schemaVersion", "algorithm", "keyVersion", "nonce", "ciphertext", "tag", "aadHash"]);
  contract(envelope.schemaVersion === "a256gcm.v1" && envelope.algorithm === "AES-256-GCM");
  contract(typeof envelope.keyVersion === "string" && /^keyv_[a-f0-9]{32}$/u.test(envelope.keyVersion));
  const canonicalBase64url = (encoded: unknown, exactBytes: number | null, maxBytes: number | null = null): void => {
    contract(typeof encoded === "string" && /^[A-Za-z0-9_-]+$/u.test(encoded));
    const decoded = Buffer.from(encoded, "base64url");
    contract(
      decoded.length > 0
      && Buffer.from(decoded).toString("base64url") === encoded
      && (exactBytes === null || decoded.length === exactBytes)
      && (maxBytes === null || decoded.length <= maxBytes),
    );
  };
  canonicalBase64url(envelope.nonce, 12);
  canonicalBase64url(envelope.ciphertext, null, maxCiphertextBytes);
  canonicalBase64url(envelope.tag, 16);
  contractSha(envelope.aadHash);
}

function contractGenericMutation(
  action: PublicCoreActionName,
  body: Readonly<Record<string, unknown>>,
  status: number,
  invocation: readonly unknown[],
): void {
  const expected: Readonly<Partial<Record<PublicCoreActionName, readonly [number, string, string]>>> = {
    "room.binding.revoke": [200, "binding_revoked", "binding"],
    "room.mode.set": [200, "room_mode_set", "room"],
    "projection.revoke": [200, "projection_revoked", "proj"],
    "curation.admit": [200, "projection_admitted", "proj"],
    "curation.unlist": [200, "projection_unlisted", "proj"],
    "room_operator.projection.deliver": [201, "projection_delivered", "proj"],
    "room_operator.local_purge.receipt": [200, "local_purge_recorded", "interaction"],
  };
  const rule = expected[action];
  contract(rule !== undefined && status === rule[0]);
  contractExact(body, ["schemaVersion", "action", "targetId", "targetVersion", "code"]);
  contract(body.schemaVersion === "r4_public_core_mutation_result.v1" && body.action === action && body.code === rule[1]);
  contractId(body.targetId, rule[2]); contractVersion(body.targetVersion);
  const context = contractRecord(invocation[0]);
  const input = contractRecord(invocation[1]);
  let expectedTargetId: unknown;
  switch (action) {
    case "room.binding.revoke": expectedTargetId = input.bindingId; break;
    case "room.mode.set": expectedTargetId = input.roomId; break;
    case "projection.revoke": case "curation.admit": case "curation.unlist": expectedTargetId = input.projectionId; break;
    case "room_operator.projection.deliver": expectedTargetId = contractRecord(input.projection).projectionId; break;
    case "room_operator.local_purge.receipt": expectedTargetId = input.interactionId; break;
    default: contract(false); return;
  }
  contract(body.targetId === expectedTargetId);
  if (action === "room_operator.projection.deliver") contract(body.targetVersion === 1);
  else contract(Number.isSafeInteger(context.expectedVersion) && body.targetVersion === (context.expectedVersion as number) + 1);
}

function validateStoreResponse(
  action: PublicCoreActionName,
  raw: unknown,
  invocation: readonly unknown[],
): PublicCoreOperationResponseV1 {
  const owned = ownedPlainSnapshot(raw);
  const result = contractRecord(owned);
  contractExact(result, ["status", "body", "recovered"]);
  contract(Number.isSafeInteger(result.status) && typeof result.recovered === "boolean");
  const status = result.status as number;
  const body = contractRecord(result.body);

  switch (action) {
    case "third_place.list": {
      contract(status === 200 && result.recovered === false); contractExact(body, ["schemaVersion", "residents"]); contract(body.schemaVersion === "r4_public_core_third_place_list.v1" && Array.isArray(body.residents));
      contract(body.residents.length <= 1);
      for (const rawResident of body.residents) {
        const resident = contractRecord(rawResident); contractExact(resident, ["roomId", "projection"]); contractId(resident.roomId, "room");
        const projection = contractProjection(resident.projection); contract(projection.roomId === resident.roomId);
      }
      break;
    }
    case "projection.read":
      contract(result.recovered === false);
      if (status === 200) {
        contractExact(body, ["schemaVersion", "projection", "lifecycle", "staleWarning", "discoverable", "newKnockAvailable"]);
        contract(body.schemaVersion === "r4_public_core_projection_read.v1");
        const projection = contractProjection(body.projection); const lifecycle = contractProjectionLifecycle(body.lifecycle);
        const expected = contractRecord(invocation[0]);
        contract(
          projection.projectionId === expected.projectionId
          && lifecycle.projectionId === expected.projectionId
          && projection.projectionId === lifecycle.projectionId
          && projection.roomId === lifecycle.roomId
          && projection.payloadHash === lifecycle.payloadHash
          && projection.publishedAt === lifecycle.publishedAt
          && projection.freshUntil === lifecycle.freshUntil
          && projection.expiresAt === lifecycle.expiresAt
          && lifecycle.current === true
          && lifecycle.bodyAvailable === true,
        );
        contract(typeof body.staleWarning === "boolean" && typeof body.discoverable === "boolean" && typeof body.newKnockAvailable === "boolean");
        contract(lifecycle.ownerState !== "stale" || body.staleWarning === true);
        contract(body.discoverable === (lifecycle.curationState === "admitted" && body.staleWarning === false));
        contract(body.newKnockAvailable !== true || body.discoverable === true);
      } else {
        contract(status === 410); contractExact(body, ["schemaVersion", ...PROJECTION_LIFECYCLE_KEYS]);
        contract(body.schemaVersion === "r4_public_core_projection_tombstone.v1");
        const lifecycle = contractProjectionLifecycle(Object.fromEntries(PROJECTION_LIFECYCLE_KEYS.map((key) => [key, body[key]])));
        const expected = contractRecord(invocation[0]);
        contract(
          lifecycle.projectionId === expected.projectionId
          && ["superseded", "revoked", "expired"].includes(lifecycle.ownerState as string)
          && body.current === false
          && body.bodyAvailable === false,
        );
      }
      break;
    case "interaction.read": {
      contract(status === 200 && result.recovered === false); contractExact(body, ["schemaVersion", "interaction"]); contract(body.schemaVersion === "r4_public_core_interaction_status.v1");
      const interaction = contractInteractionView(body.interaction);
      contract(interaction.interactionId === contractRecord(invocation[0]).interactionId);
      break;
    }
    case "room_operator.status":
      contract(status === 200 && result.recovered === false); contractExact(body, [
        "schemaVersion", "roomId", "roomMode", "roomVersion", "currentProjectionId", "eventHighWater",
        "earliestReplayableSequence", "bindingId", "bindingVersion", "retentionWriteStop",
      ]);
      contract(body.schemaVersion === "r4_public_core_room_operator_status.v1"); contractId(body.roomId, "room"); contractId(body.bindingId, "binding");
      contract(body.roomId === contractRecord(invocation[0]).roomId);
      if (body.currentProjectionId !== null) contractId(body.currentProjectionId, "proj");
      contract(body.roomMode === "public_single" || body.roomMode === "closed"); contractVersion(body.roomVersion); contractVersion(body.bindingVersion);
      contract(
        Number.isSafeInteger(body.eventHighWater)
        && (body.eventHighWater as number) >= 0
        && Number.isSafeInteger(body.earliestReplayableSequence)
        && (body.earliestReplayableSequence as number) >= 1
        && (body.earliestReplayableSequence as number) <= (body.eventHighWater as number) + 1,
      );
      contract(typeof body.retentionWriteStop === "boolean"); break;
    case "room.create":
      contract(status === 201); contractExact(body, ["schemaVersion", "roomId", "roomVersion", "roomMode"]);
      contract(
        body.schemaVersion === "r4_public_core_room_created.v1"
        && (body.roomMode === "public_single" || body.roomMode === "closed")
        && body.roomVersion === 1,
      );
      contractId(body.roomId, "room"); contractVersion(body.roomVersion); break;
    case "room.pair":
      if (status === 201) {
        contractExact(body, ["schemaVersion", "pairingId", "pairingCode", "expiresAt", "version"]); contract(body.schemaVersion === "r4_public_core_pairing_issued.v1");
        contractId(body.pairingId, "pairing"); contract(typeof body.pairingCode === "string" && /^[A-Za-z0-9_-]{16,4096}$/u.test(body.pairingCode) && Buffer.byteLength(body.pairingCode, "utf8") <= PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["pairing_challenges.pairing_code"]); contractInstant(body.expiresAt); contract(body.version === 1);
      } else {
        contract(status === 410 && result.recovered === true); contractExact(body, ["schemaVersion", "targetId", "state"]); contract(body.schemaVersion === "r4_public_core_terminal_reconciliation.v1");
        contractId(body.targetId, "pairing"); contract(["issued", "exchanged", "expired", "unavailable"].includes(body.state as string));
      }
      break;
    case "room.pair.exchange":
      if (status === 201) {
        contractExact(body, ["schemaVersion", "pairingId", "bindingId", "exchangeEnvelope", "version"]); contract(body.schemaVersion === "r4_public_core_pairing_exchanged.v1");
        const context = contractRecord(invocation[0]); const input = contractRecord(invocation[1]);
        contractId(body.pairingId, "pairing"); contractId(body.bindingId, "binding"); contractEnvelope(body.exchangeEnvelope, PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["pairing_challenges.exchange_envelope"]); contractVersion(body.version);
        contract(body.pairingId === input.pairingId && Number.isSafeInteger(context.expectedVersion) && body.version === (context.expectedVersion as number) + 1);
      } else {
        contract(status === 410 && result.recovered === true); contractExact(body, ["schemaVersion", "targetId", "state"]); contract(body.schemaVersion === "r4_public_core_terminal_reconciliation.v1");
        contractId(body.targetId, "pairing"); contract(body.targetId === contractRecord(invocation[1]).pairingId); contract(["issued", "exchanged", "expired", "unavailable"].includes(body.state as string));
      }
      break;
    case "public_encounter.issue":
      contract(status === 201); contractExact(body, ["schemaVersion", "action", "targetId", "targetVersion", "code", "expiresAt"]);
      contract(body.schemaVersion === "r4_public_core_mutation_result.v1" && body.action === action && body.code === "encounter_issued"); contractId(body.targetId, "encounter"); contract(body.targetVersion === 1); contractInstant(body.expiresAt); break;
    case "interaction.create":
      contract(status === 201); contractExact(body, ["schemaVersion", "action", "targetId", "targetVersion", "code", "state"]);
      contract(body.schemaVersion === "r4_public_core_mutation_result.v1" && body.action === action && body.code === "interaction_created" && body.state === "accepted"); contractId(body.targetId, "interaction"); contract(body.targetVersion === 1); break;
    case "interaction.delete":
      contract(status === 200); contractExact(body, ["schemaVersion", "action", "targetId", "targetVersion", "code", "bodyAvailable"]);
      contract(body.schemaVersion === "r4_public_core_mutation_result.v1" && body.action === action && body.code === "interaction_deleted" && body.bodyAvailable === false); contractId(body.targetId, "interaction"); contractVersion(body.targetVersion);
      contract(body.targetId === contractRecord(invocation[1]).interactionId && body.targetVersion === (contractRecord(invocation[0]).expectedVersion as number) + 1); break;
    case "room.binding.revoke": case "room.mode.set": case "projection.revoke": case "curation.admit": case "curation.unlist": case "room_operator.projection.deliver": case "room_operator.local_purge.receipt":
      contractGenericMutation(action, body, status, invocation); break;
    case "room_operator.sync": {
      const expected = contractRecord(invocation[1]);
      const cursorGone = status === 410;
      if (status === 200) {
        contractExact(body, ["schemaVersion", "roomId", "afterSequence", "highWater", "events"]); contract(body.schemaVersion === "r4_public_core_event_batch.v1");
      } else {
        contract(status === 410); contractExact(body, ["schemaVersion", "roomId", "afterSequence", "highWater", "earliestReplayableSequence", "events", "tombstoneIds"]);
        contract(body.schemaVersion === "r4_public_core_cursor_gone.v1" && Number.isSafeInteger(body.earliestReplayableSequence));
        contract(Array.isArray(body.tombstoneIds));
        const tombstoneIds = new Set<string>();
        let previousTombstone: string | null = null;
        for (const idValue of body.tombstoneIds) {
          contract(typeof idValue === "string" && (idValue.startsWith("proj_") || idValue.startsWith("interaction_")));
          contractId(idValue, idValue.startsWith("proj_") ? "proj" : "interaction");
          contract(!tombstoneIds.has(idValue) && (previousTombstone === null || previousTombstone < idValue));
          tombstoneIds.add(idValue);
          previousTombstone = idValue;
        }
      }
      contractId(body.roomId, "room"); contract(
        body.roomId === expected.roomId
        && body.afterSequence === expected.afterSequence
        && Number.isSafeInteger(body.afterSequence)
        && (body.afterSequence as number) >= 0
        && Number.isSafeInteger(body.highWater)
        && (body.highWater as number) >= (body.afterSequence as number),
      );
      const firstSequence = cursorGone ? body.earliestReplayableSequence as number : (body.afterSequence as number) + 1;
      if (cursorGone) {
        contract(firstSequence > (body.afterSequence as number) + 1 && firstSequence <= (body.highWater as number) + 1);
      }
      contract(Array.isArray(body.events));
      let prior = firstSequence - 1;
      const eventIds = new Set<string>();
      for (const rawEvent of body.events) {
        const event = contractRoomEvent(rawEvent);
        contract(event.roomId === body.roomId && event.sequence === prior + 1 && event.sequence <= (body.highWater as number));
        contract(!eventIds.has(event.eventId));
        eventIds.add(event.eventId);
        prior = event.sequence;
      }
      contract(prior === body.highWater);
      break;
    }
    case "room_operator.pull":
      if (status === 200) {
        contractExact(body, ["schemaVersion", "interaction", "requestBody", "guestCapsule", "bodyHash"]); contract(
          body.schemaVersion === "r4_public_core_pull.v1"
          && typeof body.requestBody === "string"
          && Buffer.byteLength(body.requestBody, "utf8") > 0
          && Buffer.byteLength(body.requestBody, "utf8") <= PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["interactions.request_body"],
        );
        const interaction = contractInteractionView(body.interaction);
        const expectedInput = contractRecord(invocation[1]);
        const context = contractRecord(invocation[0]);
        contract(
          interaction.interactionId === expectedInput.interactionId
          && interaction.state === "seen_locally"
          && interaction.bodyAvailable === true
          && Number.isSafeInteger(context.expectedVersion)
          && interaction.version === (context.expectedVersion as number) + 1,
        );
        contractSha(body.bodyHash); contract(canonicalSha256(body.requestBody) === body.bodyHash); contractGuest(body.guestCapsule);
      } else {
        contract(status === 410); contractExact(body, ["schemaVersion", "interactionId", "state", "bodyAvailable"]); contract(body.schemaVersion === "r4_public_core_pull_terminal.v1" && body.bodyAvailable === false);
        contractId(body.interactionId, "interaction"); contract(body.interactionId === contractRecord(invocation[1]).interactionId); contract(["interaction_deleted", "interaction_expired", "origin_revoked", "receipt_version_unavailable"].includes(body.state as string));
      }
      break;
    case "room_operator.ack":
      contract(status === 200); contractExact(body, ["schemaVersion", "kind", "ackId", "eventId", "sequence", "eventHash"]); contract(body.schemaVersion === "r4_public_core_ack_receipt.v1" && body.kind === "ack");
      contractId(body.ackId, "ack"); contractId(body.eventId, "event"); contract(Number.isSafeInteger(body.sequence) && (body.sequence as number) >= 1); contractSha(body.eventHash);
      {
        const expected = contractRecord(invocation[1]);
        contract(body.eventId === expected.eventId && body.sequence === expected.sequence && body.eventHash === expected.eventHash);
      }
      break;
  }
  return deepFreezeOwned(owned as PublicCoreOperationResponseV1);
}

function captureStoreMethod(
  store: unknown,
  name: keyof PublicCoreApplicationStoreV1,
): (...args: readonly unknown[]) => unknown {
  contract(store !== null && (typeof store === "object" || typeof store === "function"));
  try {
    let cursor: object | null = store as object;
    for (let depth = 0; cursor !== null && depth < 16; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
      if (descriptor) {
        contract("value" in descriptor && typeof descriptor.value === "function");
        return descriptor.value as (...args: readonly unknown[]) => unknown;
      }
      cursor = Object.getPrototypeOf(cursor) as object | null;
    }
  } catch {
    throw STORE_CONTRACT_REJECTED;
  }
  throw STORE_CONTRACT_REJECTED;
}

/**
 * Closed dispatcher for exactly the 4 reads and 16 mutations approved in the
 * #67 Packet. The store port exposes the same twenty named methods; there is no
 * generic persistence callback or arbitrary action executor below this layer.
 */
export class PublicCoreApplicationV1 {
  readonly #storeReceiver: PublicCoreApplicationStoreV1;
  readonly #storeMethods: ReadonlyMap<PublicCoreActionName, (...args: readonly unknown[]) => unknown>;

  constructor(store: PublicCoreApplicationStoreV1) {
    const methodByAction: Readonly<Record<PublicCoreActionName, keyof PublicCoreApplicationStoreV1>> = {
      "third_place.list": "listThirdPlace",
      "projection.read": "readProjection",
      "interaction.read": "readInteraction",
      "room_operator.status": "readRoomOperatorStatus",
      "public_encounter.issue": "issuePublicEncounter",
      "interaction.create": "createInteraction",
      "interaction.delete": "deleteInteraction",
      "room.pair.exchange": "exchangeRoomPair",
      "room.create": "createRoom",
      "room.pair": "createRoomPair",
      "room.binding.revoke": "revokeRoomBinding",
      "room.mode.set": "setRoomMode",
      "projection.revoke": "revokeProjection",
      "curation.admit": "admitProjection",
      "curation.unlist": "unlistProjection",
      "room_operator.sync": "syncRoomOperator",
      "room_operator.pull": "pullRoomOperator",
      "room_operator.ack": "ackRoomOperator",
      "room_operator.projection.deliver": "deliverProjection",
      "room_operator.local_purge.receipt": "recordLocalPurgeReceipt",
    };
    try {
      const methods = new Map<PublicCoreActionName, (...args: readonly unknown[]) => unknown>();
      for (const action of PUBLIC_CORE_ACTION_NAMES) {
        methods.set(action, captureStoreMethod(store, methodByAction[action]));
      }
      this.#storeReceiver = store;
      this.#storeMethods = methods;
    } catch {
      fail(503, "public_core_store_unavailable");
    }
  }

  async #invoke(action: PublicCoreActionName, args: readonly unknown[]): Promise<PublicCoreOperationResponseV1> {
    try {
      const method = this.#storeMethods.get(action);
      contract(method !== undefined);
      const raw = await Reflect.apply(method, this.#storeReceiver, args);
      return validateStoreResponse(action, raw, args);
    } catch (error) {
      let details: Readonly<{ status: number; code: string }> | null = null;
      try {
        details = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      } catch {
        details = null;
      }
      if (details === null) {
        try {
          details = authenticPublicCoreStoreErrorDetails(error);
        } catch {
          details = null;
        }
      }
      if (details !== null) fail(details.status, details.code);
      if (error === STORE_CONTRACT_REJECTED || error === OWNED_SNAPSHOT_REJECTED) fail(503, "public_core_store_contract_invalid");
      fail(503, "public_core_store_unavailable");
    }
  }

  async run(
    rawInput: PublicCoreOperationInputV1,
    rawTrustedTransport: PublicCoreTrustedTransportMetadataV1 = EMPTY_TRUSTED_TRANSPORT_METADATA,
  ): Promise<PublicCoreOperationResponseV1> {
    const input = ownedRequestSnapshot(rawInput, "invalid_request_shape") as unknown as PublicCoreOperationInputV1;
    exactKeys(input as unknown as Readonly<Record<string, unknown>>, [
      "schemaVersion",
      "action",
      "actorClass",
      "actorScopeDigest",
      "params",
      "body",
      "authorizationSecret",
      "idempotencyKey",
      "expectedVersion",
    ]);
    if (input.schemaVersion !== "r4_public_core_operation_input.v1") fail(400, "invalid_request_shape");
    const definition = assertPublicCoreAction(input.action);
    const action = definition.name as PublicCoreActionName;
    if (!PUBLIC_CORE_ACTION_NAMES.includes(action)) fail(404, "not_found");
    if (input.actorClass !== definition.actor) fail(404, "not_found");
    sha(input.actorScopeDigest);
    const params = record(input.params);
    const body = record(input.body);
    const trustedTransport = ownedRequestSnapshot(rawTrustedTransport, "invalid_trusted_transport_metadata") as unknown as PublicCoreTrustedTransportMetadataV1;
    exactKeys(trustedTransport as unknown as Readonly<Record<string, unknown>>, ["schemaVersion", "coarseRateBucket"]);
    if (trustedTransport.schemaVersion !== "r4_public_core_trusted_transport_metadata.v1") fail(400, "invalid_trusted_transport_metadata");
    const trustedCoarseRateBucket = trustedTransport.coarseRateBucket === null
      ? null
      : coarseRateBucket(trustedTransport.coarseRateBucket);
    if (action !== "public_encounter.issue" && trustedCoarseRateBucket !== null) fail(400, "unexpected_trusted_transport_metadata");
    assertAuthorizationShape(input);

    switch (action) {
      case "third_place.list":
        assertReadEnvelope(input); empty(params); empty(body);
        return await this.#invoke(action, []);
      case "projection.read":
        assertReadEnvelope(input); exactKeys(params, ["projectionId"]); empty(body);
        return await this.#invoke(action, [{ projectionId: id(params.projectionId, "proj") }]);
      case "interaction.read":
        assertReadEnvelope(input); exactKeys(params, ["interactionId"]); empty(body);
        return await this.#invoke(action, [{ interactionId: id(params.interactionId, "interaction"), authorizationSecret: requireAuthorization(input) }]);
      case "room_operator.status":
        assertReadEnvelope(input); empty(params); exactKeys(body, ["roomId"]);
        return await this.#invoke(action, [{ roomId: id(body.roomId, "room"), authorizationSecret: requireAuthorization(input) }]);
      case "room.create":
        empty(params); exactKeys(body, ["entityId", "roomKind", "label"]);
        if (body.roomKind !== "third_place_public") fail(404, "not_found");
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { entityId: id(body.entityId, "entity"), label: text(body.label, PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["rooms.label"]) }]);
      case "room.pair":
        exactKeys(params, ["roomId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { roomId: id(params.roomId, "room") }]);
      case "room.pair.exchange":
        exactKeys(params, ["pairingId"]); exactKeys(body, ["pairingCode", "clientPublicKey"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { pairingId: id(params.pairingId, "pairing"), pairingCode: secret(body.pairingCode), clientPublicKey: text(body.clientPublicKey, 8_192, 16) }]);
      case "room.binding.revoke":
        exactKeys(params, ["bindingId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { bindingId: id(params.bindingId, "binding") }]);
      case "room.mode.set":
        exactKeys(params, ["roomId"]); exactKeys(body, ["interactionMode"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { roomId: id(params.roomId, "room"), interactionMode: roomMode(body.interactionMode) }]);
      case "room_operator.projection.deliver": {
        empty(params); exactKeys(body, ["projection", "publicationApprovalHash", "publicationAttestationHash"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), {
          projection: projection(body.projection),
          publicationApprovalHash: sha(body.publicationApprovalHash),
          publicationAttestationHash: sha(body.publicationAttestationHash),
        }]);
      }
      case "projection.revoke":
        exactKeys(params, ["projectionId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { projectionId: id(params.projectionId, "proj") }]);
      case "curation.admit":
        exactKeys(params, ["projectionId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { projectionId: id(params.projectionId, "proj") }]);
      case "curation.unlist":
        exactKeys(params, ["projectionId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { projectionId: id(params.projectionId, "proj") }]);
      case "public_encounter.issue":
        exactKeys(params, ["projectionId"]); exactKeys(body, ["encounterSecret"]);
        if (trustedCoarseRateBucket === null) fail(400, "trusted_coarse_rate_bucket_required");
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { projectionId: id(params.projectionId, "proj"), encounterSecret: secret(body.encounterSecret), coarseRateBucket: trustedCoarseRateBucket }]);
      case "interaction.create":
        empty(params); exactKeys(body, ["projectionId", "interactionType", "consent", "requestBody", "guestCapsule", "replySecret", "deleteSecret"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), {
          projectionId: id(body.projectionId, "proj"),
          interactionType: interactionType(body.interactionType),
          consent: consent(body.consent),
          requestBody: text(body.requestBody, PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["interactions.request_body"]),
          guestCapsule: guestCapsule(body.guestCapsule),
          replySecret: secret(body.replySecret),
          deleteSecret: secret(body.deleteSecret),
        }]);
      case "interaction.delete":
        exactKeys(params, ["interactionId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { interactionId: id(params.interactionId, "interaction") }]);
      case "room_operator.sync":
        empty(params); exactKeys(body, ["roomId", "afterSequence"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { roomId: id(body.roomId, "room"), afterSequence: integer(body.afterSequence, 0) }]);
      case "room_operator.pull":
        exactKeys(params, ["interactionId"]); empty(body);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { interactionId: id(params.interactionId, "interaction") }]);
      case "room_operator.ack":
        empty(params); exactKeys(body, ["roomId", "eventId", "sequence", "eventHash"]);
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { roomId: id(body.roomId, "room"), eventId: id(body.eventId, "event"), sequence: integer(body.sequence, 1), eventHash: sha(body.eventHash) }]);
      case "room_operator.local_purge.receipt":
        exactKeys(params, ["interactionId"]); exactKeys(body, ["localBytesAbsent"]);
        if (body.localBytesAbsent !== true) fail(400, "local_purge_attestation_required");
        return await this.#invoke(action, [mutationContext(input, action, trustedTransport), { interactionId: id(params.interactionId, "interaction"), localBytesAbsent: true }]);
    }
  }
}
