import { canonicalJsonBytes, canonicalSha256Omitting } from "./canonical.ts";
import {
  ProtocolValidationError,
  assertArray,
  assertCanonicalText,
  assertExactKeys,
  assertIntegerInRange,
  assertOneOf,
  assertOpaqueId,
  assertRecord,
  assertSha256,
  assertUtcTimestamp,
  compareTimestamps,
  utf8ByteLength,
} from "./guards.ts";
import { GRANT_PRESETS, validateP0Budget } from "./state.ts";
import type {
  AgentDerivativeV1,
  ApiMutationEnvelopeV1,
  DirectGrantInviteV1,
  DispatchPermitV1,
  FreshCycleReservationV1,
  GrantOfferV1,
  GuestCapsuleV1,
  NotificationEndpointV1,
  ProjectionLifecycleV1,
  PublicEncounterV1,
  CursorGoneV1,
  RoomEventAckReceiptV1,
  RoomEventAckV1,
  RoomEventBatchV1,
  RoomEventObjectType,
  RoomEventV1,
  ResponseSourcePolicyV1,
  ResponseSourceSnapshotV1,
  RoomOperatorRequestV1,
  SessionBudgetV1,
  SnapshotQueryResultV1,
  SnapshotQueryV1,
  TransportDispatchIntentV1,
} from "./types.ts";

function fail(code: string, path: string, message: string): never {
  throw new ProtocolValidationError(code, path, message);
}

function nullableTimestamp(value: unknown, path: string): asserts value is string | null {
  if (value !== null) assertUtcTimestamp(value, path);
}

function nullableId(value: unknown, prefix: string, path: string): asserts value is string | null {
  if (value !== null) assertOpaqueId(value, prefix, path);
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") fail("invalid_type", path, "expected boolean");
}

function validateBudgetShape(value: unknown, path: string): asserts value is SessionBudgetV1 {
  assertRecord(value, path);
  assertExactKeys(value, path, ["wallClockSeconds", "providerDispatches", "inputTokens", "outputTokens", "spend"]);
  assertIntegerInRange(value.wallClockSeconds, `${path}.wallClockSeconds`, 1, 3_600);
  assertIntegerInRange(value.providerDispatches, `${path}.providerDispatches`, 0, 3);
  assertIntegerInRange(value.inputTokens, `${path}.inputTokens`, 0, 128_000);
  assertIntegerInRange(value.outputTokens, `${path}.outputTokens`, 0, 8_000);
  assertRecord(value.spend, `${path}.spend`);
  assertExactKeys(value.spend, `${path}.spend`, ["mode", "maximumUsd"]);
  assertOneOf(value.spend.mode, ["incremental", "not_applicable"] as const, `${path}.spend.mode`);
  if (value.spend.mode === "incremental") {
    if (typeof value.spend.maximumUsd !== "number" || !Number.isFinite(value.spend.maximumUsd) || value.spend.maximumUsd < 0 || value.spend.maximumUsd > 1) {
      fail("invalid_spend", `${path}.spend.maximumUsd`, "expected finite amount in [0, 1]");
    }
  } else if (value.spend.maximumUsd !== null) {
    fail("invalid_spend", `${path}.spend.maximumUsd`, "not_applicable requires null");
  }
  const decision = validateP0Budget(value as unknown as SessionBudgetV1);
  if (!decision.allowed) fail("budget_outside_p0", path, decision.code);
}

export function validateProjectionLifecycleV1(value: unknown): ProjectionLifecycleV1 {
  assertRecord(value, "$projectionLifecycle");
  assertExactKeys(value, "$projectionLifecycle", ["schemaVersion", "projectionId", "ownerState", "curationState", "current", "version", "changedAt"]);
  if (value.schemaVersion !== "projection_lifecycle.v1") fail("schema_version", "$projectionLifecycle.schemaVersion", "expected projection_lifecycle.v1");
  assertOpaqueId(value.projectionId, "proj", "$projectionLifecycle.projectionId");
  assertOneOf(value.ownerState, ["published_fresh", "stale", "superseded", "revoked", "expired"] as const, "$projectionLifecycle.ownerState");
  assertOneOf(value.curationState, ["not_admitted", "admitted", "unlisted"] as const, "$projectionLifecycle.curationState");
  assertBoolean(value.current, "$projectionLifecycle.current");
  assertIntegerInRange(value.version, "$projectionLifecycle.version", 1, Number.MAX_SAFE_INTEGER);
  assertUtcTimestamp(value.changedAt, "$projectionLifecycle.changedAt");
  if ((value.ownerState === "superseded" || value.ownerState === "revoked" || value.ownerState === "expired") && value.current) {
    fail("terminal_projection_current", "$projectionLifecycle.current", "terminal Projection cannot remain current");
  }
  return value as unknown as ProjectionLifecycleV1;
}

export function validatePublicEncounterV1(value: unknown): PublicEncounterV1 {
  assertRecord(value, "$encounter");
  assertExactKeys(value, "$encounter", ["schemaVersion", "encounterId", "roomId", "projectionId", "secretDigest", "state", "issuedAt", "expiresAt", "acceptedCount", "unresolvedInteractionId"]);
  if (value.schemaVersion !== "public_encounter.v1") fail("schema_version", "$encounter.schemaVersion", "expected public_encounter.v1");
  assertOpaqueId(value.encounterId, "encounter", "$encounter.encounterId");
  assertOpaqueId(value.roomId, "room", "$encounter.roomId");
  assertOpaqueId(value.projectionId, "proj", "$encounter.projectionId");
  assertSha256(value.secretDigest, "$encounter.secretDigest");
  assertOneOf(value.state, ["issued", "consumed", "revoked", "replaced", "expired", "invalidated"] as const, "$encounter.state");
  assertUtcTimestamp(value.issuedAt, "$encounter.issuedAt");
  assertUtcTimestamp(value.expiresAt, "$encounter.expiresAt");
  if (compareTimestamps(value.expiresAt, value.issuedAt) <= 0) fail("invalid_time_order", "$encounter.expiresAt", "encounter expiry must follow issuance");
  if (Date.parse(value.expiresAt) - Date.parse(value.issuedAt) > 24 * 60 * 60 * 1_000) fail("encounter_ttl_widened", "$encounter.expiresAt", "public encounter maximum is 24 hours");
  assertIntegerInRange(value.acceptedCount, "$encounter.acceptedCount", 0, 1);
  nullableId(value.unresolvedInteractionId, "interaction", "$encounter.unresolvedInteractionId");
  if (value.acceptedCount === 1 && value.state === "issued") fail("encounter_consumed_state", "$encounter.state", "accepted encounter cannot remain issued");
  return value as unknown as PublicEncounterV1;
}

export function validateGrantOfferV1(value: unknown): GrantOfferV1 {
  assertRecord(value, "$offer");
  assertExactKeys(value, "$offer", ["schemaVersion", "offerId", "sourceInteractionId", "targetRoomId", "targetProjectionId", "presetId", "state", "issuedAt", "acceptanceExpiresAt", "offeredGrantExpiresAt"]);
  if (value.schemaVersion !== "grant_offer.v1") fail("schema_version", "$offer.schemaVersion", "expected grant_offer.v1");
  assertOpaqueId(value.offerId, "offer", "$offer.offerId");
  assertOpaqueId(value.sourceInteractionId, "interaction", "$offer.sourceInteractionId");
  assertOpaqueId(value.targetRoomId, "room", "$offer.targetRoomId");
  assertOpaqueId(value.targetProjectionId, "proj", "$offer.targetProjectionId");
  assertOneOf(value.presetId, ["one_visit", "short_exchange", "familiar_collaborator", "trusted_collaborator"] as const, "$offer.presetId");
  assertOneOf(value.state, ["issued", "accepted", "owner_revoked", "expired", "invalidated"] as const, "$offer.state");
  assertUtcTimestamp(value.issuedAt, "$offer.issuedAt");
  assertUtcTimestamp(value.acceptanceExpiresAt, "$offer.acceptanceExpiresAt");
  assertUtcTimestamp(value.offeredGrantExpiresAt, "$offer.offeredGrantExpiresAt");
  if (compareTimestamps(value.acceptanceExpiresAt, value.issuedAt) <= 0 || compareTimestamps(value.offeredGrantExpiresAt, value.issuedAt) <= 0) fail("invalid_time_order", "$offer", "deadlines must follow issuance");
  if (Date.parse(value.offeredGrantExpiresAt) - Date.parse(value.issuedAt) > GRANT_PRESETS[value.presetId].ttlMilliseconds) fail("offered_grant_expiry_widened", "$offer.offeredGrantExpiresAt", "offered Grant exceeds preset window");
  return value as unknown as GrantOfferV1;
}

export function validateDirectGrantInviteV1(value: unknown): DirectGrantInviteV1 {
  assertRecord(value, "$invite");
  assertExactKeys(value, "$invite", ["schemaVersion", "inviteId", "targetRoomId", "targetProjectionId", "presetId", "secretDigest", "state", "issuedAt", "redemptionExpiresAt", "offeredGrantExpiresAt"]);
  if (value.schemaVersion !== "direct_grant_invite.v1") fail("schema_version", "$invite.schemaVersion", "expected direct_grant_invite.v1");
  assertOpaqueId(value.inviteId, "invite", "$invite.inviteId");
  assertOpaqueId(value.targetRoomId, "room", "$invite.targetRoomId");
  assertOpaqueId(value.targetProjectionId, "proj", "$invite.targetProjectionId");
  assertOneOf(value.presetId, ["one_visit", "short_exchange", "familiar_collaborator", "trusted_collaborator"] as const, "$invite.presetId");
  assertSha256(value.secretDigest, "$invite.secretDigest");
  assertOneOf(value.state, ["issued", "redeemed", "owner_revoked", "expired", "invalidated"] as const, "$invite.state");
  assertUtcTimestamp(value.issuedAt, "$invite.issuedAt");
  assertUtcTimestamp(value.redemptionExpiresAt, "$invite.redemptionExpiresAt");
  assertUtcTimestamp(value.offeredGrantExpiresAt, "$invite.offeredGrantExpiresAt");
  if (compareTimestamps(value.redemptionExpiresAt, value.issuedAt) <= 0 || compareTimestamps(value.offeredGrantExpiresAt, value.issuedAt) <= 0) fail("invalid_time_order", "$invite", "invite deadlines must follow issuance");
  if (Date.parse(value.offeredGrantExpiresAt) - Date.parse(value.issuedAt) > GRANT_PRESETS[value.presetId].ttlMilliseconds) fail("offered_grant_expiry_widened", "$invite.offeredGrantExpiresAt", "offered Grant exceeds preset window");
  return value as unknown as DirectGrantInviteV1;
}

export function validateAgentDerivativeV1(value: unknown): AgentDerivativeV1 {
  assertRecord(value, "$derivative");
  assertExactKeys(value, "$derivative", ["schemaVersion", "derivativeId", "parentCapabilityId", "parentCapabilityClass", "roomId", "projectionId", "secretDigest", "state", "issuedAt", "expiresAt", "acceptedCount"]);
  if (value.schemaVersion !== "agent_derivative.v1") fail("schema_version", "$derivative.schemaVersion", "expected agent_derivative.v1");
  assertOpaqueId(value.derivativeId, "derivative", "$derivative.derivativeId");
  assertCanonicalText(value.parentCapabilityId, "$derivative.parentCapabilityId", { minScalars: 18, maxBytes: 160 });
  assertOneOf(value.parentCapabilityClass, ["public_encounter.v1", "grant.v1"] as const, "$derivative.parentCapabilityClass");
  assertOpaqueId(value.roomId, "room", "$derivative.roomId");
  assertOpaqueId(value.projectionId, "proj", "$derivative.projectionId");
  assertSha256(value.secretDigest, "$derivative.secretDigest");
  assertOneOf(value.state, ["issued", "consumed", "revoked", "replaced", "expired", "invalidated"] as const, "$derivative.state");
  assertUtcTimestamp(value.issuedAt, "$derivative.issuedAt");
  assertUtcTimestamp(value.expiresAt, "$derivative.expiresAt");
  if (compareTimestamps(value.expiresAt, value.issuedAt) <= 0) fail("invalid_time_order", "$derivative.expiresAt", "derivative expiry must follow issuance");
  if (Date.parse(value.expiresAt) - Date.parse(value.issuedAt) > 15 * 60 * 1_000) fail("derivative_ttl_widened", "$derivative.expiresAt", "Agent derivative maximum is 15 minutes");
  assertIntegerInRange(value.acceptedCount, "$derivative.acceptedCount", 0, 1);
  return value as unknown as AgentDerivativeV1;
}

export function validateGuestCapsuleV1(value: unknown): GuestCapsuleV1 {
  assertRecord(value, "$guestCapsule");
  assertExactKeys(value, "$guestCapsule", ["schemaVersion", "level", "pseudonym", "currentFocus", "offer", "seek", "openQuestion", "declaredSourceClass", "scopeLabel", "freshnessAt", "guestSchemaVersion", "consentStatement"]);
  if (value.schemaVersion !== "guest_capsule.v1") fail("schema_version", "$guestCapsule.schemaVersion", "expected guest_capsule.v1");
  assertOneOf(value.level, ["g0_manual", "g1_lightweight", "g2_agent_projection"] as const, "$guestCapsule.level");
  for (const key of ["pseudonym", "currentFocus", "offer", "seek", "openQuestion", "declaredSourceClass", "scopeLabel", "guestSchemaVersion", "consentStatement"] as const) {
    if (value[key] !== null) assertCanonicalText(value[key], `$guestCapsule.${key}`, { maxBytes: 1_024 });
  }
  nullableTimestamp(value.freshnessAt, "$guestCapsule.freshnessAt");
  const reusable = [value.pseudonym, value.currentFocus, value.offer, value.seek, value.openQuestion];
  const agentOnly = [value.declaredSourceClass, value.scopeLabel, value.freshnessAt, value.guestSchemaVersion, value.consentStatement];
  if (value.level === "g0_manual" && [...reusable, ...agentOnly].some((item) => item !== null)) fail("g0_fields_forbidden", "$guestCapsule", "g0_manual contains request only");
  if (value.level === "g1_lightweight" && agentOnly.some((item) => item !== null)) fail("g1_agent_fields_forbidden", "$guestCapsule", "G2 provenance fields are unavailable in G1");
  if (value.level === "g2_agent_projection" && agentOnly.some((item) => item === null)) fail("g2_fields_required", "$guestCapsule", "G2 source/scope/freshness/schema/consent fields are required");
  if (canonicalJsonBytes(value).length > 4 * 1_024) fail("guest_capsule_too_large", "$guestCapsule", "capsule exceeds 4 KiB canonical JSON");
  return value as unknown as GuestCapsuleV1;
}

export function validateNotificationEndpointV1(value: unknown): NotificationEndpointV1 {
  assertRecord(value, "$endpoint");
  assertExactKeys(value, "$endpoint", ["schemaVersion", "interactionId", "state", "encryptedAddress", "redactedMarker", "verificationExpiresAt", "verificationAttempts", "verificationSendsThisHour", "confirmedAt", "version"]);
  if (value.schemaVersion !== "notification_endpoint.v1") fail("schema_version", "$endpoint.schemaVersion", "expected notification_endpoint.v1");
  assertOpaqueId(value.interactionId, "interaction", "$endpoint.interactionId");
  assertOneOf(value.state, ["absent", "verification_pending", "confirmed", "cleared"] as const, "$endpoint.state");
  if (value.encryptedAddress !== null) assertCanonicalText(value.encryptedAddress, "$endpoint.encryptedAddress", { maxBytes: 8_192 });
  if (value.redactedMarker !== null) assertCanonicalText(value.redactedMarker, "$endpoint.redactedMarker", { maxBytes: 128 });
  nullableTimestamp(value.verificationExpiresAt, "$endpoint.verificationExpiresAt");
  assertIntegerInRange(value.verificationAttempts, "$endpoint.verificationAttempts", 0, 5);
  assertIntegerInRange(value.verificationSendsThisHour, "$endpoint.verificationSendsThisHour", 0, 3);
  nullableTimestamp(value.confirmedAt, "$endpoint.confirmedAt");
  assertIntegerInRange(value.version, "$endpoint.version", 1, Number.MAX_SAFE_INTEGER);
  if (value.state === "verification_pending" && (value.encryptedAddress === null || value.verificationExpiresAt === null)) fail("pending_endpoint_incomplete", "$endpoint", "pending verification needs encrypted address and expiry");
  if (value.state === "confirmed" && (value.encryptedAddress === null || value.confirmedAt === null)) fail("confirmed_endpoint_incomplete", "$endpoint", "confirmed endpoint needs encrypted address and confirmation time");
  if ((value.state === "absent" || value.state === "cleared") && value.encryptedAddress !== null) fail("cleared_endpoint_retains_address", "$endpoint.encryptedAddress", "absent/cleared endpoint cannot retain address");
  return value as unknown as NotificationEndpointV1;
}

const ROOM_EVENT_OBJECT_TYPES = [
  "room",
  "projection",
  "interaction",
  "response",
  "grant",
  "notification",
  "purge",
] as const satisfies readonly RoomEventObjectType[];

const ROOM_EVENT_ID_PREFIX: Readonly<Record<RoomEventObjectType, string>> = {
  room: "room",
  projection: "proj",
  interaction: "interaction",
  response: "response",
  grant: "grant",
  notification: "notice",
  purge: "purge",
};

function assertRoomEventTypeCoherence(objectType: RoomEventObjectType, eventType: string): void {
  const prefix = eventType.split(".", 1)[0];
  const expected = objectType === "projection" ? ["projection", "curation"] : [objectType];
  if (!prefix || !expected.includes(prefix)) {
    fail("event_object_type_mismatch", "$roomEvent.eventType", "eventType does not match objectType");
  }
}

function assertGenericOpaqueId(value: unknown, path: string): asserts value is string {
  assertCanonicalText(value, path, { minScalars: 18, maxScalars: 160 });
  if (!/^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u.test(value)) {
    fail("invalid_id", path, "expected an opaque identifier");
  }
}

export function validateRoomEventV1(value: unknown): RoomEventV1 {
  assertRecord(value, "$roomEvent");
  assertExactKeys(value, "$roomEvent", [
    "schemaVersion", "eventId", "roomId", "sequence", "objectType", "objectId",
    "eventType", "objectVersion", "payloadHash", "committedAt", "bodyAvailable",
  ]);
  if (value.schemaVersion !== "room_event.v1") fail("schema_version", "$roomEvent.schemaVersion", "expected room_event.v1");
  assertOpaqueId(value.eventId, "event", "$roomEvent.eventId");
  assertOpaqueId(value.roomId, "room", "$roomEvent.roomId");
  assertIntegerInRange(value.sequence, "$roomEvent.sequence", 1, Number.MAX_SAFE_INTEGER);
  assertOneOf(value.objectType, ROOM_EVENT_OBJECT_TYPES, "$roomEvent.objectType");
  assertOpaqueId(value.objectId, ROOM_EVENT_ID_PREFIX[value.objectType], "$roomEvent.objectId");
  assertCanonicalText(value.eventType, "$roomEvent.eventType", { minScalars: 3, maxBytes: 128 });
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/u.test(value.eventType)) {
    fail("invalid_event_type", "$roomEvent.eventType", "expected a namespaced body-free event type");
  }
  assertRoomEventTypeCoherence(value.objectType, value.eventType);
  assertIntegerInRange(value.objectVersion, "$roomEvent.objectVersion", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.payloadHash, "$roomEvent.payloadHash");
  assertUtcTimestamp(value.committedAt, "$roomEvent.committedAt");
  assertBoolean(value.bodyAvailable, "$roomEvent.bodyAvailable");
  return value as unknown as RoomEventV1;
}

export function validateRoomEventBatchV1(value: unknown): RoomEventBatchV1 {
  assertRecord(value, "$roomEventBatch");
  assertExactKeys(value, "$roomEventBatch", ["schemaVersion", "roomId", "afterSequence", "highWater", "events"]);
  if (value.schemaVersion !== "room_event_batch.v1") fail("schema_version", "$roomEventBatch.schemaVersion", "expected room_event_batch.v1");
  assertOpaqueId(value.roomId, "room", "$roomEventBatch.roomId");
  assertIntegerInRange(value.afterSequence, "$roomEventBatch.afterSequence", 0, Number.MAX_SAFE_INTEGER);
  assertIntegerInRange(value.highWater, "$roomEventBatch.highWater", value.afterSequence, Number.MAX_SAFE_INTEGER);
  assertArray(value.events, "$roomEventBatch.events", 0, 1_000);
  const eventIds = new Set<string>();
  value.events.forEach((event, index) => {
    const validated = validateRoomEventV1(event);
    if (validated.roomId !== value.roomId) fail("wrong_room", `$roomEventBatch.events[${index}].roomId`, "event belongs to another Room");
    if (validated.sequence !== (value.afterSequence as number) + index + 1) fail("sequence_gap", `$roomEventBatch.events[${index}].sequence`, "batch events must be contiguous after cursor");
    if (validated.sequence > (value.highWater as number)) fail("event_above_high_water", `$roomEventBatch.events[${index}].sequence`, "event exceeds high-water mark");
    if (eventIds.has(validated.eventId)) fail("duplicate_event_id", `$roomEventBatch.events[${index}].eventId`, "event IDs must be unique");
    eventIds.add(validated.eventId);
  });
  return value as unknown as RoomEventBatchV1;
}

export function validateCursorGoneV1(value: unknown): CursorGoneV1 {
  assertRecord(value, "$cursorGone");
  assertExactKeys(value, "$cursorGone", [
    "schemaVersion", "roomId", "afterSequence", "highWater",
    "earliestReplayableSequence", "liveEvents", "tombstoneIds",
  ]);
  if (value.schemaVersion !== "cursor_gone.v1") fail("schema_version", "$cursorGone.schemaVersion", "expected cursor_gone.v1");
  assertOpaqueId(value.roomId, "room", "$cursorGone.roomId");
  assertIntegerInRange(value.afterSequence, "$cursorGone.afterSequence", 0, Number.MAX_SAFE_INTEGER);
  assertIntegerInRange(value.highWater, "$cursorGone.highWater", 0, Number.MAX_SAFE_INTEGER);
  assertIntegerInRange(value.earliestReplayableSequence, "$cursorGone.earliestReplayableSequence", 1, (value.highWater as number) + 1);
  if ((value.afterSequence as number) >= (value.earliestReplayableSequence as number) - 1) {
    fail("cursor_not_gone", "$cursorGone.afterSequence", "410 view requires a cursor older than replayable history");
  }
  assertArray(value.liveEvents, "$cursorGone.liveEvents", 0, 100_000);
  let priorSequence = 0;
  const eventIds = new Set<string>();
  value.liveEvents.forEach((event, index) => {
    const validated = validateRoomEventV1(event);
    if (validated.roomId !== value.roomId) fail("wrong_room", `$cursorGone.liveEvents[${index}].roomId`, "event belongs to another Room");
    if (validated.sequence < (value.earliestReplayableSequence as number) || validated.sequence > (value.highWater as number)) {
      fail("event_outside_reconciliation_window", `$cursorGone.liveEvents[${index}].sequence`, "live event is outside replayable high-water window");
    }
    if (validated.sequence <= priorSequence) fail("events_unsorted", `$cursorGone.liveEvents[${index}].sequence`, "live events must be strictly sequence-sorted");
    if (eventIds.has(validated.eventId)) fail("duplicate_event_id", `$cursorGone.liveEvents[${index}].eventId`, "event IDs must be unique");
    priorSequence = validated.sequence;
    eventIds.add(validated.eventId);
  });
  assertArray(value.tombstoneIds, "$cursorGone.tombstoneIds", 0, 100_000);
  const tombstoneIds = value.tombstoneIds as unknown[];
  tombstoneIds.forEach((id, index) => assertGenericOpaqueId(id, `$cursorGone.tombstoneIds[${index}]`));
  if (new Set(tombstoneIds as string[]).size !== tombstoneIds.length) fail("duplicate_tombstone_id", "$cursorGone.tombstoneIds", "tombstone IDs must be unique");
  const sortedTombstones = [...(tombstoneIds as string[])].sort(compareUtf8);
  if (!(tombstoneIds as string[]).every((id, index) => id === sortedTombstones[index])) fail("tombstone_ids_unsorted", "$cursorGone.tombstoneIds", "tombstone IDs must use bytewise canonical order");
  return value as unknown as CursorGoneV1;
}

export function validateRoomEventAckV1(value: unknown): RoomEventAckV1 {
  assertRecord(value, "$roomEventAck");
  assertExactKeys(value, "$roomEventAck", ["schemaVersion", "roomId", "eventId", "sequence", "eventHash", "idempotencyKey"]);
  if (value.schemaVersion !== "room_event_ack.v1") fail("schema_version", "$roomEventAck.schemaVersion", "expected room_event_ack.v1");
  assertOpaqueId(value.roomId, "room", "$roomEventAck.roomId");
  assertOpaqueId(value.eventId, "event", "$roomEventAck.eventId");
  assertIntegerInRange(value.sequence, "$roomEventAck.sequence", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.eventHash, "$roomEventAck.eventHash");
  assertCanonicalText(value.idempotencyKey, "$roomEventAck.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  return value as unknown as RoomEventAckV1;
}

export function validateRoomEventAckReceiptV1(value: unknown): RoomEventAckReceiptV1 {
  assertRecord(value, "$roomEventAckReceipt");
  assertExactKeys(value, "$roomEventAckReceipt", [
    "schemaVersion", "receiptId", "roomId", "eventId", "sequence", "eventHash", "idempotencyKey", "committedAt",
  ]);
  if (value.schemaVersion !== "room_event_ack_receipt.v1") fail("schema_version", "$roomEventAckReceipt.schemaVersion", "expected room_event_ack_receipt.v1");
  assertOpaqueId(value.receiptId, "receipt", "$roomEventAckReceipt.receiptId");
  assertOpaqueId(value.roomId, "room", "$roomEventAckReceipt.roomId");
  assertOpaqueId(value.eventId, "event", "$roomEventAckReceipt.eventId");
  assertIntegerInRange(value.sequence, "$roomEventAckReceipt.sequence", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.eventHash, "$roomEventAckReceipt.eventHash");
  assertCanonicalText(value.idempotencyKey, "$roomEventAckReceipt.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  assertUtcTimestamp(value.committedAt, "$roomEventAckReceipt.committedAt");
  return value as unknown as RoomEventAckReceiptV1;
}

export const REQUIRED_SOURCE_ROOT_FILES = ["README.md", "package*.json", "tsconfig.json"] as const;
export const REQUIRED_SOURCE_DIRECTORY_ROOTS = ["docs/", "src/", "schemas/", "test/", "apps/", "packages/"] as const;
export const REQUIRED_SOURCE_EXTENSIONS = [".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".scss", ".html", ".sql", ".yaml", ".yml", ".toml"] as const;

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && new Set(actual).size === actual.length && expected.every((item) => actual.includes(item));
}

export function validateResponseSourcePolicyV1(value: unknown): ResponseSourcePolicyV1 {
  assertRecord(value, "$sourcePolicy");
  assertExactKeys(value, "$sourcePolicy", ["schemaVersion", "policyId", "allowedRootFiles", "allowedDirectoryRoots", "allowedExtensions", "maximumFileBytes", "maximumTotalBytes", "secretPatternPolicyVersion", "secretPatternPolicyHash", "policyHash"]);
  if (value.schemaVersion !== "response_source_policy.v1") fail("schema_version", "$sourcePolicy.schemaVersion", "expected response_source_policy.v1");
  assertOpaqueId(value.policyId, "policy", "$sourcePolicy.policyId");
  assertArray(value.allowedRootFiles, "$sourcePolicy.allowedRootFiles", REQUIRED_SOURCE_ROOT_FILES.length, REQUIRED_SOURCE_ROOT_FILES.length);
  assertArray(value.allowedDirectoryRoots, "$sourcePolicy.allowedDirectoryRoots", REQUIRED_SOURCE_DIRECTORY_ROOTS.length, REQUIRED_SOURCE_DIRECTORY_ROOTS.length);
  assertArray(value.allowedExtensions, "$sourcePolicy.allowedExtensions", REQUIRED_SOURCE_EXTENSIONS.length, REQUIRED_SOURCE_EXTENSIONS.length);
  if (!sameSet(value.allowedRootFiles as string[], REQUIRED_SOURCE_ROOT_FILES)) fail("source_policy_widened", "$sourcePolicy.allowedRootFiles", "must match Packet root-file rules exactly");
  if (!sameSet(value.allowedDirectoryRoots as string[], REQUIRED_SOURCE_DIRECTORY_ROOTS)) fail("source_policy_widened", "$sourcePolicy.allowedDirectoryRoots", "must match Packet directory roots exactly");
  if (!sameSet(value.allowedExtensions as string[], REQUIRED_SOURCE_EXTENSIONS)) fail("source_policy_widened", "$sourcePolicy.allowedExtensions", "must match Packet extensions exactly");
  if (value.maximumFileBytes !== 512 * 1_024 || value.maximumTotalBytes !== 8 * 1_024 * 1_024) fail("source_policy_widened", "$sourcePolicy", "size limits must match Packet");
  assertCanonicalText(value.secretPatternPolicyVersion, "$sourcePolicy.secretPatternPolicyVersion", { minScalars: 1, maxBytes: 128 });
  assertSha256(value.secretPatternPolicyHash, "$sourcePolicy.secretPatternPolicyHash");
  assertSha256(value.policyHash, "$sourcePolicy.policyHash");
  if (canonicalSha256Omitting(value, ["policyHash"]) !== value.policyHash) fail("policy_hash_mismatch", "$sourcePolicy.policyHash", "must hash canonical policy excluding policyHash");
  return value as unknown as ResponseSourcePolicyV1;
}

function pathAllowed(path: string, policy: ResponseSourcePolicyV1): boolean {
  if (path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "" || part === "." || part === "..")) return false;
  const segments = path.split("/");
  const excludedSegments = new Set([".git", ".forme", ".codex", "node_modules", ".next", "dist", "build", "coverage", ".cache", "cache", "caches", "vendor", "vendored", "generated"]);
  if (segments.some((segment) => excludedSegments.has(segment) || segment.startsWith(".env"))) return false;
  if (segments.length > 1 && /^(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/u.test(segments.at(-1) ?? "")) return false;
  const rootAllowed = path === "README.md" || path === "tsconfig.json" || /^package[^/]*\.json$/u.test(path);
  const directoryAllowed = policy.allowedDirectoryRoots.some((root) => path.startsWith(root));
  const extensionAllowed = policy.allowedExtensions.some((extension) => path.endsWith(extension));
  if (!(rootAllowed || (directoryAllowed && extensionAllowed))) return false;
  const lower = path.toLowerCase();
  return !lower.startsWith(".git/") && !lower.startsWith(".forme/") && !lower.includes("/.env") && path !== "AGENTS.md";
}

function compareUtf8(left: string, right: string): number {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return a.length - b.length;
}

export function validateResponseSourceSnapshotV1(value: unknown, policy: ResponseSourcePolicyV1): ResponseSourceSnapshotV1 {
  assertRecord(value, "$snapshot");
  assertExactKeys(value, "$snapshot", ["schemaVersion", "snapshotId", "repositoryHead", "repositoryTreeHash", "policyId", "policyHash", "files", "fileCount", "totalBytes", "manifestHash", "createdAt"]);
  if (value.schemaVersion !== "response_source_snapshot.v1") fail("schema_version", "$snapshot.schemaVersion", "expected response_source_snapshot.v1");
  assertOpaqueId(value.snapshotId, "snapshot", "$snapshot.snapshotId");
  assertCanonicalText(value.repositoryHead, "$snapshot.repositoryHead", { minScalars: 40, maxScalars: 64 });
  if (!/^[a-f0-9]{40,64}$/u.test(value.repositoryHead)) fail("invalid_git_head", "$snapshot.repositoryHead", "expected lowercase commit hash");
  assertSha256(value.repositoryTreeHash, "$snapshot.repositoryTreeHash");
  if (value.policyId !== policy.policyId || value.policyHash !== policy.policyHash) fail("snapshot_policy_mismatch", "$snapshot", "snapshot must bind exact policy");
  assertArray(value.files, "$snapshot.files", 0, 100_000);
  let total = 0;
  const paths: string[] = [];
  value.files.forEach((file, index) => {
    const path = `$snapshot.files[${index}]`;
    assertRecord(file, path);
    assertExactKeys(file, path, ["canonicalPath", "contentHash", "byteCount"]);
    assertCanonicalText(file.canonicalPath, `${path}.canonicalPath`, { minScalars: 1, maxBytes: 1_024 });
    if (!pathAllowed(file.canonicalPath, policy)) fail("snapshot_path_forbidden", `${path}.canonicalPath`, "path is outside source policy");
    assertSha256(file.contentHash, `${path}.contentHash`);
    assertIntegerInRange(file.byteCount, `${path}.byteCount`, 0, policy.maximumFileBytes);
    paths.push(file.canonicalPath);
    total += file.byteCount;
  });
  if (new Set(paths).size !== paths.length) fail("duplicate_snapshot_path", "$snapshot.files", "paths must be unique");
  const sorted = [...paths].sort(compareUtf8);
  if (!paths.every((path, index) => path === sorted[index])) fail("snapshot_paths_unsorted", "$snapshot.files", "paths must use bytewise canonical order");
  assertIntegerInRange(value.fileCount, "$snapshot.fileCount", 0, 100_000);
  assertIntegerInRange(value.totalBytes, "$snapshot.totalBytes", 0, policy.maximumTotalBytes);
  if (value.fileCount !== value.files.length || value.totalBytes !== total) fail("snapshot_aggregate_mismatch", "$snapshot", "fileCount/totalBytes must match entries");
  assertSha256(value.manifestHash, "$snapshot.manifestHash");
  assertUtcTimestamp(value.createdAt, "$snapshot.createdAt");
  if (canonicalSha256Omitting(value, ["manifestHash"]) !== value.manifestHash) fail("manifest_hash_mismatch", "$snapshot.manifestHash", "must hash canonical manifest excluding manifestHash");
  return value as unknown as ResponseSourceSnapshotV1;
}

export function validateFreshCycleReservationV1(value: unknown): FreshCycleReservationV1 {
  assertRecord(value, "$cycle");
  assertExactKeys(value, "$cycle", ["schemaVersion", "reservationId", "interactionId", "startAuthorizationHash", "sessionEnvelopeHash", "state", "idempotencyKey", "reservedAt", "firstDispatchCommittedAt", "version"]);
  if (value.schemaVersion !== "fresh_cycle_reservation.v1") fail("schema_version", "$cycle.schemaVersion", "expected fresh_cycle_reservation.v1");
  assertOpaqueId(value.reservationId, "reservation", "$cycle.reservationId");
  assertOpaqueId(value.interactionId, "interaction", "$cycle.interactionId");
  assertSha256(value.startAuthorizationHash, "$cycle.startAuthorizationHash");
  assertSha256(value.sessionEnvelopeHash, "$cycle.sessionEnvelopeHash");
  assertOneOf(value.state, ["unreserved", "reserved", "dispatch_committed", "released_zero_dispatch"] as const, "$cycle.state");
  assertCanonicalText(value.idempotencyKey, "$cycle.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  nullableTimestamp(value.reservedAt, "$cycle.reservedAt");
  nullableTimestamp(value.firstDispatchCommittedAt, "$cycle.firstDispatchCommittedAt");
  assertIntegerInRange(value.version, "$cycle.version", 1, Number.MAX_SAFE_INTEGER);
  if (value.state === "unreserved" && value.reservedAt !== null) fail("unreserved_has_time", "$cycle.reservedAt", "unreserved cycle cannot have reservedAt");
  if (value.state !== "unreserved" && value.reservedAt === null) fail("reservation_time_required", "$cycle.reservedAt", "reserved/terminal cycle needs reservedAt");
  if (value.state === "dispatch_committed" && value.firstDispatchCommittedAt === null) fail("dispatch_time_required", "$cycle.firstDispatchCommittedAt", "dispatch_committed needs timestamp");
  if (value.state === "released_zero_dispatch" && value.firstDispatchCommittedAt !== null) fail("zero_dispatch_conflict", "$cycle.firstDispatchCommittedAt", "zero-dispatch release cannot have dispatch timestamp");
  if (value.reservedAt !== null && value.firstDispatchCommittedAt !== null && compareTimestamps(value.firstDispatchCommittedAt, value.reservedAt) < 0) fail("invalid_time_order", "$cycle.firstDispatchCommittedAt", "dispatch cannot precede reservation");
  return value as unknown as FreshCycleReservationV1;
}

export function validateDispatchPermitV1(value: unknown): DispatchPermitV1 {
  assertRecord(value, "$permit");
  assertExactKeys(value, "$permit", ["schemaVersion", "permitId", "interactionId", "reservationId", "sessionEnvelopeHash", "startAuthorizationHash", "provider", "modelId", "payloadHash", "dispatchOrdinal", "idempotencyKey", "issuedAt", "expiresAt", "consumedAt"]);
  if (value.schemaVersion !== "dispatch_permit.v1") fail("schema_version", "$permit.schemaVersion", "expected dispatch_permit.v1");
  assertOpaqueId(value.permitId, "permit", "$permit.permitId");
  assertOpaqueId(value.interactionId, "interaction", "$permit.interactionId");
  assertOpaqueId(value.reservationId, "reservation", "$permit.reservationId");
  assertSha256(value.sessionEnvelopeHash, "$permit.sessionEnvelopeHash");
  assertSha256(value.startAuthorizationHash, "$permit.startAuthorizationHash");
  if (value.provider !== "OpenAI") fail("provider_not_allowed", "$permit.provider", "P0 provider is OpenAI");
  assertCanonicalText(value.modelId, "$permit.modelId", { minScalars: 1, maxBytes: 256 });
  assertSha256(value.payloadHash, "$permit.payloadHash");
  assertIntegerInRange(value.dispatchOrdinal, "$permit.dispatchOrdinal", 1, 3);
  assertCanonicalText(value.idempotencyKey, "$permit.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  assertUtcTimestamp(value.issuedAt, "$permit.issuedAt");
  assertUtcTimestamp(value.expiresAt, "$permit.expiresAt");
  nullableTimestamp(value.consumedAt, "$permit.consumedAt");
  if (compareTimestamps(value.expiresAt, value.issuedAt) <= 0) fail("invalid_time_order", "$permit.expiresAt", "permit expiry must follow issuance");
  if (Date.parse(value.expiresAt) - Date.parse(value.issuedAt) > 30_000) fail("permit_ttl_widened", "$permit.expiresAt", "dispatch permit maximum is 30 seconds");
  if (value.consumedAt !== null && (compareTimestamps(value.consumedAt, value.issuedAt) < 0 || compareTimestamps(value.consumedAt, value.expiresAt) >= 0)) fail("permit_consumed_outside_window", "$permit.consumedAt", "permit consumption must be within issuance window");
  return value as unknown as DispatchPermitV1;
}

export function validateApiMutationEnvelopeV1(value: unknown): ApiMutationEnvelopeV1 {
  assertRecord(value, "$mutation");
  assertExactKeys(value, "$mutation", ["schemaVersion", "actorClass", "action", "idempotencyKey", "canonicalRequestHash", "expectedObjectVersion", "predecessorHash", "payloadHash"]);
  if (value.schemaVersion !== "api_mutation_envelope.v1") fail("schema_version", "$mutation.schemaVersion", "expected api_mutation_envelope.v1");
  assertOneOf(value.actorClass, ["public", "manual_guest", "guest_agent", "controller", "curator", "room_operator.v1", "janitor"] as const, "$mutation.actorClass");
  assertCanonicalText(value.action, "$mutation.action", { minScalars: 1, maxBytes: 128 });
  assertCanonicalText(value.idempotencyKey, "$mutation.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  assertSha256(value.canonicalRequestHash, "$mutation.canonicalRequestHash");
  if (value.expectedObjectVersion !== null) assertIntegerInRange(value.expectedObjectVersion, "$mutation.expectedObjectVersion", 1, Number.MAX_SAFE_INTEGER);
  if (value.predecessorHash !== null) assertSha256(value.predecessorHash, "$mutation.predecessorHash");
  assertSha256(value.payloadHash, "$mutation.payloadHash");
  return value as unknown as ApiMutationEnvelopeV1;
}

export function validateRoomOperatorRequestV1(value: unknown): RoomOperatorRequestV1 {
  assertRecord(value, "$roomOperator");
  assertExactKeys(value, "$roomOperator", ["schemaVersion", "bindingId", "roomId", "action", "mutation", "exactTargetId"]);
  if (value.schemaVersion !== "room_operator_request.v1") fail("schema_version", "$roomOperator.schemaVersion", "expected room_operator_request.v1");
  assertOpaqueId(value.bindingId, "binding", "$roomOperator.bindingId");
  assertOpaqueId(value.roomId, "room", "$roomOperator.roomId");
  assertOneOf(value.action, ["inspect", "sync", "pull_exact_request", "reserve_fresh_cycle", "recover_fresh_cycle", "abandon_zero_dispatch", "issue_dispatch_permit", "recover_dispatch_permit", "ack_event", "recover_ack", "deliver_projection", "deliver_response", "attest_stale", "attest_local_purge"] as const, "$roomOperator.action");
  if (value.mutation !== null) validateApiMutationEnvelopeV1(value.mutation);
  if (value.exactTargetId !== null) assertCanonicalText(value.exactTargetId, "$roomOperator.exactTargetId", { minScalars: 18, maxBytes: 160 });
  if (value.action === "inspect" && value.mutation !== null) fail("readonly_mutation", "$roomOperator.mutation", "inspect is read-only");
  return value as unknown as RoomOperatorRequestV1;
}

export function validateSnapshotQueryV1(value: unknown): SnapshotQueryV1 {
  assertRecord(value, "$snapshotQuery");
  if (value.schemaVersion === "snapshot_line_read.v1") {
    assertExactKeys(value, "$snapshotQuery", ["schemaVersion", "canonicalPath", "lineStart", "lineEnd"]);
    assertCanonicalText(value.canonicalPath, "$snapshotQuery.canonicalPath", { minScalars: 1, maxBytes: 1_024 });
    assertIntegerInRange(value.lineStart, "$snapshotQuery.lineStart", 1, Number.MAX_SAFE_INTEGER);
    assertIntegerInRange(value.lineEnd, "$snapshotQuery.lineEnd", value.lineStart as number, Number.MAX_SAFE_INTEGER);
    if ((value.lineEnd as number) - (value.lineStart as number) + 1 > 200) fail("line_read_too_large", "$snapshotQuery", "line read maximum is 200 contiguous lines");
    return value as unknown as SnapshotQueryV1;
  }
  if (value.schemaVersion === "snapshot_search.v1") {
    assertExactKeys(value, "$snapshotQuery", ["schemaVersion", "pattern", "patternKind"]);
    assertCanonicalText(value.pattern, "$snapshotQuery.pattern", { minScalars: 1, maxBytes: 256 });
    assertOneOf(value.patternKind, ["literal", "re2"] as const, "$snapshotQuery.patternKind");
    return value as unknown as SnapshotQueryV1;
  }
  fail("schema_version", "$snapshotQuery.schemaVersion", "unknown snapshot query");
}

export function validateSnapshotQueryResultV1(value: unknown): SnapshotQueryResultV1 {
  assertRecord(value, "$snapshotResult");
  assertExactKeys(value, "$snapshotResult", ["schemaVersion", "queryHash", "status", "resultText", "matchCount", "resultBytes", "bodyFreeErrorCode"]);
  if (value.schemaVersion !== "snapshot_query_result.v1") fail("schema_version", "$snapshotResult.schemaVersion", "expected snapshot_query_result.v1");
  assertSha256(value.queryHash, "$snapshotResult.queryHash");
  assertOneOf(value.status, ["ok", "not_found", "rejected", "timeout"] as const, "$snapshotResult.status");
  if (value.resultText !== null) {
    assertCanonicalText(value.resultText, "$snapshotResult.resultText", { maxBytes: 64 * 1_024 });
    if (utf8ByteLength(value.resultText) !== value.resultBytes) fail("result_byte_mismatch", "$snapshotResult.resultBytes", "must match resultText UTF-8 bytes");
  } else if (value.resultBytes !== 0) fail("empty_result_bytes", "$snapshotResult.resultBytes", "null result has zero bytes");
  assertIntegerInRange(value.matchCount, "$snapshotResult.matchCount", 0, 100);
  assertIntegerInRange(value.resultBytes, "$snapshotResult.resultBytes", 0, 64 * 1_024);
  if (value.bodyFreeErrorCode !== null) assertCanonicalText(value.bodyFreeErrorCode, "$snapshotResult.bodyFreeErrorCode", { maxBytes: 128 });
  return value as unknown as SnapshotQueryResultV1;
}

export function validateTransportDispatchIntentV1(value: unknown): TransportDispatchIntentV1 {
  assertRecord(value, "$dispatchIntent");
  assertExactKeys(value, "$dispatchIntent", ["schemaVersion", "interactionId", "reservationId", "sessionEnvelopeHash", "startAuthorizationHash", "provider", "modelId", "payloadHash", "dispatchOrdinal", "countedInputTokens", "reservedOutputTokens", "reservedApplicableSpendUsd", "idempotencyKey"]);
  if (value.schemaVersion !== "transport_dispatch_intent.v1") fail("schema_version", "$dispatchIntent.schemaVersion", "expected transport_dispatch_intent.v1");
  assertOpaqueId(value.interactionId, "interaction", "$dispatchIntent.interactionId");
  assertOpaqueId(value.reservationId, "reservation", "$dispatchIntent.reservationId");
  assertSha256(value.sessionEnvelopeHash, "$dispatchIntent.sessionEnvelopeHash");
  assertSha256(value.startAuthorizationHash, "$dispatchIntent.startAuthorizationHash");
  if (value.provider !== "OpenAI") fail("provider_not_allowed", "$dispatchIntent.provider", "P0 provider is OpenAI");
  assertCanonicalText(value.modelId, "$dispatchIntent.modelId", { minScalars: 1, maxBytes: 256 });
  assertSha256(value.payloadHash, "$dispatchIntent.payloadHash");
  assertIntegerInRange(value.dispatchOrdinal, "$dispatchIntent.dispatchOrdinal", 1, 3);
  assertIntegerInRange(value.countedInputTokens, "$dispatchIntent.countedInputTokens", 0, 128_000);
  assertIntegerInRange(value.reservedOutputTokens, "$dispatchIntent.reservedOutputTokens", 0, 8_000);
  if (value.reservedApplicableSpendUsd !== null && (typeof value.reservedApplicableSpendUsd !== "number" || !Number.isFinite(value.reservedApplicableSpendUsd) || value.reservedApplicableSpendUsd < 0 || value.reservedApplicableSpendUsd > 1)) fail("spend_reservation_invalid", "$dispatchIntent.reservedApplicableSpendUsd", "expected null or finite amount in [0,1]");
  assertCanonicalText(value.idempotencyKey, "$dispatchIntent.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  return value as unknown as TransportDispatchIntentV1;
}

export function validateMaximumBudgetObject(value: unknown): SessionBudgetV1 {
  validateBudgetShape(value, "$budget");
  return value;
}
