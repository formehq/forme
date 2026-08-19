import { canonicalSha256 } from "./canonical.ts";
import { deriveProjectionRead } from "./state.ts";
import type {
  ApiActorClass,
  ApiMutationEnvelopeV1,
  ConsentEnvelopeV1,
  GuestCapsuleV1,
  InteractionConsent,
  InteractionType,
  InteractionV1,
  OpaqueId,
  ProjectionCapsuleV1,
  ProjectionLifecycleV1,
  ProjectionReadViewV1,
  RoomV1,
  Sha256,
  UtcTimestamp,
} from "./types.ts";
import { validateApiMutationEnvelopeV1 } from "./object-validation.ts";
import { validateInteractionV1, validateProjectionCapsuleV1, validateRoomV1 } from "./validation.ts";

export interface ApiMutationEnvelopeInputV1 {
  readonly actorClass: ApiActorClass;
  readonly action: string;
  readonly idempotencyKey: string;
  readonly expectedObjectVersion: number | null;
  readonly predecessorHash: Sha256 | null;
  readonly payload: unknown;
}

export function createApiMutationEnvelopeV1(input: ApiMutationEnvelopeInputV1): ApiMutationEnvelopeV1 {
  const payloadHash = canonicalSha256(input.payload);
  const canonicalRequestHash = canonicalSha256({
    action: input.action,
    actorClass: input.actorClass,
    expectedObjectVersion: input.expectedObjectVersion,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    predecessorHash: input.predecessorHash,
  });
  return validateApiMutationEnvelopeV1({
    schemaVersion: "api_mutation_envelope.v1",
    actorClass: input.actorClass,
    action: input.action,
    idempotencyKey: input.idempotencyKey,
    canonicalRequestHash,
    expectedObjectVersion: input.expectedObjectVersion,
    predecessorHash: input.predecessorHash,
    payloadHash,
  });
}

export function createProjectionReadViewV1(
  roomInput: RoomV1,
  projectionInput: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
  access: Parameters<typeof deriveProjectionRead>[3],
  now: UtcTimestamp,
): ProjectionReadViewV1 {
  const room = validateRoomV1(roomInput);
  const projection = validateProjectionCapsuleV1(projectionInput);
  if (room.roomId !== projection.roomId || projection.projectionId !== lifecycle.projectionId) {
    throw new TypeError("Projection read view scope mismatch");
  }
  const decision = deriveProjectionRead(room, projection, lifecycle, access, now);
  if (!decision.allowed) throw new TypeError(`Projection read denied: ${decision.code}`);
  return {
    schemaVersion: "projection_read_view.v1",
    room,
    projection,
    lifecycle,
    warning: decision.warning === "stale_projection" ? "stale_projection" : null,
    cacheControl: "no-store",
  };
}

export interface AcceptedInteractionInputV1 {
  readonly interactionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly originProjectionHash: Sha256;
  readonly originStateAtAcceptance: InteractionV1["originStateAtAcceptance"];
  readonly interactionType: InteractionType;
  readonly requestText: string;
  readonly guestCapsule: GuestCapsuleV1 | null;
  readonly consent: InteractionConsent;
  readonly consentEnvelope: ConsentEnvelopeV1 | null;
  readonly acceptedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly replyCapabilityDigest: Sha256;
  readonly deleteCapabilityDigest: Sha256;
}

/** Compiles an accepted wire mutation into the canonical persisted object. */
export function createAcceptedInteractionV1(input: AcceptedInteractionInputV1): InteractionV1 {
  return validateInteractionV1({
    schemaVersion: "interaction.v1",
    ...input,
    state: "accepted",
    stateVersion: 1,
  });
}
