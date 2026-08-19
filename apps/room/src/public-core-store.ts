import { createHash } from "node:crypto";
import {
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
  PublicCorePolicyError,
  assertPublicCoreRoomScopeForAction,
  type PublicCoreActionName,
} from "./public-core-policy.ts";
import {
  PublicCoreRetentionError,
  assertPublicCoreMutationAllowedByRetention,
  resolvePublicCoreProjectionRetention,
  resolvePublicCorePullRetention,
} from "./public-core-retention.ts";
import {
  decryptPublicCoreField,
  encryptPublicCoreField,
  keyedPublicCoreDigest,
  matchesPublicCoreKeyedDigest,
  type PublicCoreCryptoKeyHandleV1,
  type PublicCoreKeyedDigestV1,
  type PublicCoreNonceAuthorityV1,
  type PublicCoreNonceRegistrationV1,
  type PublicCoreFieldAadV1,
  type PublicCoreSecretDigestDomain,
} from "./public-core-crypto.ts";

export type PublicCoreSha256 = `sha256:${string}`;
export type PublicCoreActorClass = "public" | "guest_capability" | "controller" | "curator" | "room_operator";
export type PublicCoreRoomMode = "public_single" | "closed";
export type PublicCoreFaultPointV1 =
  | "before_idempotency_reservation"
  | "after_locks_and_rechecks"
  | "after_domain_write_before_room_event"
  | "after_room_event_before_receipt"
  | "after_receipt_before_commit"
  | "committed_response_lost";
export type PublicCoreFaultActionV1 = PublicCoreActionName | "retention.janitor";

export const PUBLIC_CORE_FAULT_POINTS = [
  "before_idempotency_reservation",
  "after_locks_and_rechecks",
  "after_domain_write_before_room_event",
  "after_room_event_before_receipt",
  "after_receipt_before_commit",
  "committed_response_lost",
] as const satisfies readonly PublicCoreFaultPointV1[];

export interface PublicCoreProtectedValueV1 {
  readonly schemaVersion: "r4_public_core_protected_value.v1";
  readonly envelope: Readonly<Record<string, unknown>>;
  readonly plaintextHash: PublicCoreSha256;
  readonly objectVersion: number;
  readonly readable: boolean;
}

/**
 * Required construction port. There is deliberately no plaintext or fixed-key
 * fallback: a caller must inject the production-specific crypto adapter or an
 * explicitly synthetic test adapter.
 */
export interface PublicCoreBodyProtectorV1 {
  protect(input: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
    roomId: string;
    rowId: string;
    objectVersion: number;
    plaintext: string;
    nonceAuthority: PublicCoreNonceAuthorityV1;
  }>): Promise<PublicCoreProtectedValueV1>;
  reveal(input: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
    roomId: string;
    rowId: string;
    objectVersion: number;
    protectedValue: PublicCoreProtectedValueV1;
  }>): Promise<string>;
  digest(domain: PublicCoreSecretDomainV1, value: string): PublicCoreKeyedDigestV1;
  matches(domain: PublicCoreSecretDomainV1, value: string, digest: PublicCoreKeyedDigestV1): boolean;
}

export type PublicCoreSecretDomainV1 =
  | "pairing_code"
  | "binding_secret"
  | "encounter_secret"
  | "reply_secret"
  | "delete_secret"
  | "rate_bucket";

const PUBLIC_CORE_FIELD_COLUMNS: Readonly<Record<string, PublicCoreFieldAadV1["column"]>> = Object.freeze({
  "rooms.label": "label_ciphertext",
  "projections.capsule": "capsule_ciphertext",
  "pairing_challenges.pairing_code": "pairing_code_ciphertext",
  "pairing_challenges.exchange_envelope": "exchange_envelope_ciphertext",
  "interactions.request_body": "request_ciphertext",
  "interactions.guest_capsule": "guest_capsule_ciphertext",
});

export const PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS = Object.freeze({
  "rooms.label": 1_024,
  "projections.capsule": 131_072,
  "pairing_challenges.pairing_code": 4_096,
  "pairing_challenges.exchange_envelope": 32_768,
  "interactions.request_body": 32_768,
  "interactions.guest_capsule": 4_096,
} as const);

function publicCorePlaintextByteCeiling(
  table: "rooms" | "projections" | "pairing_challenges" | "interactions",
  column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule",
): number {
  const ceiling = PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS[`${table}.${column}` as keyof typeof PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS];
  if (ceiling === undefined) fail(500, "encrypted_field_unavailable");
  return ceiling;
}

const PUBLIC_CORE_DIGEST_DOMAINS: Readonly<Record<PublicCoreSecretDomainV1, PublicCoreSecretDigestDomain>> = Object.freeze({
  pairing_code: "room_pairing_code",
  binding_secret: "room_binding_credential",
  encounter_secret: "public_encounter_secret",
  reply_secret: "interaction_reply_secret",
  delete_secret: "interaction_delete_secret",
  rate_bucket: "coarse_rate_bucket",
});

/** Bind the abstract store port to the approved production-specific crypto. */
export function createPublicCoreBodyProtectorV1(input: Readonly<{
  bodyEncryptionKey: PublicCoreCryptoKeyHandleV1;
  capabilityPepperKey: PublicCoreCryptoKeyHandleV1;
}>): PublicCoreBodyProtectorV1 {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const aad = (value: Readonly<{
    table: PublicCoreFieldAadV1["table"];
    column: string;
    roomId: string;
    rowId: string;
    objectVersion: number;
  }>): PublicCoreFieldAadV1 => {
    const column = PUBLIC_CORE_FIELD_COLUMNS[`${value.table}.${value.column}`];
    if (!column) fail(500, "encrypted_field_unavailable");
    return {
      schemaVersion: "r4_public_core_aad.v1",
      table: value.table,
      column,
      roomId: value.roomId,
      rowId: value.rowId,
      objectVersion: value.objectVersion,
    };
  };
  return Object.freeze({
    async protect(value) {
      const encrypted = await encryptPublicCoreField({
        key: input.bodyEncryptionKey,
        plaintext: encoder.encode(value.plaintext),
        aad: aad(value),
        nonceAuthority: value.nonceAuthority,
      });
      return Object.freeze({
        schemaVersion: "r4_public_core_protected_value.v1" as const,
        envelope: encrypted.envelope as unknown as Readonly<Record<string, unknown>>,
        plaintextHash: encrypted.plaintextHash,
        objectVersion: value.objectVersion,
        readable: true,
      });
    },
    async reveal(value) {
      return decoder.decode(decryptPublicCoreField({
        key: input.bodyEncryptionKey,
        envelope: value.protectedValue.envelope,
        aad: aad(value),
        bodyReadable: value.protectedValue.readable,
        expectedPlaintextHash: value.protectedValue.plaintextHash,
      }));
    },
    digest(domain, value) {
      return keyedPublicCoreDigest({
        key: input.capabilityPepperKey,
        domain: PUBLIC_CORE_DIGEST_DOMAINS[domain],
        value: encoder.encode(value),
      });
    },
    matches(domain, value, expected) {
      return matchesPublicCoreKeyedDigest({
        key: input.capabilityPepperKey,
        domain: PUBLIC_CORE_DIGEST_DOMAINS[domain],
        value: encoder.encode(value),
        expected,
      });
    },
  } satisfies PublicCoreBodyProtectorV1);
}

export interface PublicCoreIdSourceV1 {
  nextId(prefix: "room" | "projection" | "pairing" | "binding" | "encounter" | "interaction" | "event" | "receipt" | "purge" | "ack"): string;
  nextSecret(kind: "pairing_code" | "binding_secret"): string;
}

export interface PublicCoreFaultInjectorV1 {
  reach(
    action: PublicCoreFaultActionV1,
    point: PublicCoreFaultPointV1,
  ): "continue" | "inject_fault" | Promise<"continue" | "inject_fault">;
}

export interface PublicCoreMutationContextV1 {
  readonly action: PublicCoreActionName;
  readonly actorClass: PublicCoreActorClass;
  readonly actorScopeDigest: PublicCoreSha256;
  readonly idempotencyKey: string;
  readonly canonicalRequestHash: PublicCoreSha256;
  readonly expectedVersion: number | null;
  readonly authorizationSecret: string | null;
}

export interface PublicCoreOperationResponseV1 {
  readonly status: number;
  readonly body: Readonly<Record<string, unknown>>;
  readonly recovered: boolean;
}

export interface PublicCoreRoomRecordV1 {
  readonly roomId: string;
  readonly installationId: string;
  readonly entityId: string;
  readonly roomKind: "third_place_public";
  readonly interactionMode: PublicCoreRoomMode;
  readonly state: "active";
  readonly label: PublicCoreProtectedValueV1;
  readonly currentProjectionId: string | null;
  readonly eventHighWater: number;
  readonly eventFloor: number;
  readonly version: number;
  readonly createdAt: string;
}

export interface PublicCoreProjectionRecordV1 {
  readonly projectionId: string;
  readonly roomId: string;
  readonly entityId: string;
  readonly capsule: PublicCoreProtectedValueV1 | null;
  readonly payloadHash: PublicCoreSha256;
  readonly publicationApprovalHash: PublicCoreSha256;
  readonly publicationAttestationHash: PublicCoreSha256;
  readonly ownerState: "published_fresh" | "stale" | "superseded" | "revoked" | "expired";
  readonly curationState: "not_admitted" | "admitted" | "unlisted";
  readonly current: boolean;
  readonly publishedAt: string;
  readonly freshUntil: string;
  readonly expiresAt: string;
  readonly version: number;
}

export interface PublicCorePairingChallengeRecordV1 {
  readonly pairingId: string;
  readonly roomId: string;
  readonly pairingCode: PublicCoreProtectedValueV1 | null;
  readonly pairingCodeDigest: PublicCoreKeyedDigestV1;
  readonly exchangeEnvelope: PublicCoreProtectedValueV1 | null;
  readonly state: "issued" | "exchanged" | "expired";
  readonly bindingId: string | null;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly version: number;
}

export interface PublicCoreBindingRecordV1 {
  readonly bindingId: string;
  readonly roomId: string;
  readonly secretDigest: PublicCoreKeyedDigestV1;
  readonly state: "current" | "revoked" | "expired";
  readonly pairedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly version: number;
}

export interface PublicCoreEncounterRecordV1 {
  readonly encounterId: string;
  readonly roomId: string;
  readonly projectionId: string;
  readonly secretDigest: PublicCoreKeyedDigestV1;
  readonly rateBucketDigest: PublicCoreKeyedDigestV1;
  readonly state: "issued" | "consumed" | "revoked" | "expired";
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly interactionId: string | null;
  readonly version: number;
}

export interface PublicCoreInteractionRecordV1 {
  readonly interactionId: string;
  readonly roomId: string;
  readonly projectionId: string;
  readonly originProjectionHash: PublicCoreSha256;
  readonly originStateAtAcceptance: "published_fresh";
  readonly interactionType: InteractionType;
  readonly requestBody: PublicCoreProtectedValueV1 | null;
  readonly guestCapsule: PublicCoreProtectedValueV1 | null;
  readonly requestHash: PublicCoreSha256;
  readonly guestCapsuleHash: PublicCoreSha256 | null;
  readonly consent: InteractionConsent;
  readonly consentHash: PublicCoreSha256;
  readonly replySecretDigest: PublicCoreKeyedDigestV1;
  readonly deleteSecretDigest: PublicCoreKeyedDigestV1;
  readonly state: "accepted" | "seen_locally" | "interaction_deleted" | "interaction_expired" | "origin_revoked";
  readonly acceptedAt: string;
  readonly expiresAt: string;
  readonly localPurgeReceivedAt: string | null;
  readonly version: number;
}

export interface PublicCoreRoomEventV1 {
  readonly schemaVersion: "r4_public_core_room_event.v1";
  readonly eventId: string;
  readonly roomId: string;
  readonly sequence: number;
  readonly action: PublicCoreActionName;
  readonly targetKind: "room" | "projection" | "pairing" | "binding" | "encounter" | "interaction" | "purge";
  readonly targetId: string;
  readonly targetVersion: number;
  readonly eventHash: PublicCoreSha256;
  readonly committedAt: string;
  readonly bodyAvailable: boolean;
}

export const PUBLIC_CORE_ROOM_EVENT_CONTRACT: Readonly<Partial<Record<
  PublicCoreActionName,
  Readonly<{
    targetKind: PublicCoreRoomEventV1["targetKind"];
    targetIdPrefix: string;
    bodyAvailable: boolean;
  }>
>>> = Object.freeze({
  "room.create": Object.freeze({ targetKind: "room", targetIdPrefix: "room", bodyAvailable: true }),
  "room.pair": Object.freeze({ targetKind: "pairing", targetIdPrefix: "pairing", bodyAvailable: true }),
  "room.pair.exchange": Object.freeze({ targetKind: "binding", targetIdPrefix: "binding", bodyAvailable: false }),
  "room.binding.revoke": Object.freeze({ targetKind: "binding", targetIdPrefix: "binding", bodyAvailable: false }),
  "room.mode.set": Object.freeze({ targetKind: "room", targetIdPrefix: "room", bodyAvailable: true }),
  "room_operator.projection.deliver": Object.freeze({ targetKind: "projection", targetIdPrefix: "proj", bodyAvailable: true }),
  "projection.revoke": Object.freeze({ targetKind: "projection", targetIdPrefix: "proj", bodyAvailable: false }),
  "curation.admit": Object.freeze({ targetKind: "projection", targetIdPrefix: "proj", bodyAvailable: true }),
  "curation.unlist": Object.freeze({ targetKind: "projection", targetIdPrefix: "proj", bodyAvailable: true }),
  "public_encounter.issue": Object.freeze({ targetKind: "encounter", targetIdPrefix: "encounter", bodyAvailable: false }),
  "interaction.create": Object.freeze({ targetKind: "interaction", targetIdPrefix: "interaction", bodyAvailable: true }),
  "interaction.delete": Object.freeze({ targetKind: "interaction", targetIdPrefix: "interaction", bodyAvailable: false }),
  "room_operator.local_purge.receipt": Object.freeze({ targetKind: "purge", targetIdPrefix: "interaction", bodyAvailable: false }),
});

export type PublicCoreSyncRecoveryBodyV1 =
  | Readonly<{
      schemaVersion: "r4_public_core_event_batch.v1";
      roomId: string;
      afterSequence: number;
      highWater: number;
      events: readonly PublicCoreRoomEventV1[];
    }>
  | Readonly<{
      schemaVersion: "r4_public_core_cursor_gone.v1";
      roomId: string;
      afterSequence: number;
      highWater: number;
      earliestReplayableSequence: number;
      events: readonly PublicCoreRoomEventV1[];
      tombstoneIds: readonly string[];
    }>;

export type PublicCoreReceiptRecoveryV1 =
  | { readonly kind: "room_created"; readonly roomId: string; readonly roomVersion: number; readonly roomMode: "public_single" }
  | { readonly kind: "encounter_issued"; readonly encounterId: string; readonly encounterVersion: number; readonly expiresAt: string }
  | { readonly kind: "interaction_created"; readonly interactionId: string; readonly interactionVersion: number; readonly state: "accepted" }
  | { readonly kind: "interaction_deleted"; readonly interactionId: string; readonly interactionVersion: number; readonly bodyAvailable: false }
  | { readonly kind: "binding_revoked"; readonly bindingId: string; readonly bindingVersion: number }
  | { readonly kind: "room_mode_set"; readonly roomId: string; readonly roomVersion: number }
  | { readonly kind: "projection_revoked"; readonly projectionId: string; readonly projectionVersion: number }
  | { readonly kind: "projection_admitted"; readonly projectionId: string; readonly projectionVersion: number }
  | { readonly kind: "projection_unlisted"; readonly projectionId: string; readonly projectionVersion: number }
  | { readonly kind: "projection_delivered"; readonly projectionId: string; readonly projectionVersion: number }
  | { readonly kind: "local_purge_recorded"; readonly interactionId: string; readonly interactionVersion: number }
  | { readonly kind: "pull_terminal"; readonly interactionId: string; readonly interactionVersion: number; readonly state: "interaction_deleted" | "interaction_expired" | "origin_revoked" }
  | { readonly kind: "pairing_issue"; readonly pairingId: string; readonly targetVersion: number }
  | { readonly kind: "pairing_exchange"; readonly pairingId: string; readonly bindingId: string; readonly targetVersion: number }
  | { readonly kind: "sync"; readonly snapshot: PublicCoreSyncRecoveryBodyV1; readonly sourceExpiresAt: string }
  | { readonly kind: "pull"; readonly interactionId: string; readonly interactionVersion: number; readonly requestFieldVersion: number; readonly bodyHash: PublicCoreSha256; readonly guestCapsuleFieldVersion: number | null; readonly guestCapsuleHash: PublicCoreSha256 | null; readonly bodyExpiresAt: string }
  | { readonly kind: "ack"; readonly ackId: string; readonly eventId: string; readonly sequence: number; readonly eventHash: PublicCoreSha256 };

export interface PublicCoreMutationReceiptV1 {
  readonly schemaVersion: "r4_public_core_mutation_receipt.v1";
  readonly receiptId: string;
  readonly action: PublicCoreActionName;
  readonly actorScopeDigest: PublicCoreSha256;
  readonly idempotencyKey: string;
  readonly requestHash: PublicCoreSha256;
  readonly status: number;
  readonly code: string;
  readonly recovery: PublicCoreReceiptRecoveryV1;
  readonly committedAt: string;
  readonly expiresAt: string;
}

export interface PublicCorePurgeJobV1 {
  readonly purgeId: string;
  readonly roomId: string;
  readonly targetKind: "projection_body" | "interaction_body" | "pairing_body";
  readonly targetId: string;
  readonly enqueuedAt: string;
  readonly targetBy: string;
  readonly completedAt: string | null;
}

export interface PublicCoreRetentionHealthStateV1 {
  readonly lastSuccessfulPurgeAt: string;
  readonly lastBoundedRunAt: string;
}

export interface PublicCoreRateEventV1 {
  readonly roomId: string;
  readonly kind: "encounter_issue" | "interaction_accept";
  readonly bucketDigest: PublicCoreKeyedDigestV1;
  readonly occurredAt: string;
}

export interface PublicCoreEventAckV1 {
  readonly ackId: string;
  readonly bindingId: string;
  readonly roomId: string;
  readonly eventId: string;
  readonly sequence: number;
  readonly eventHash: PublicCoreSha256;
  readonly ackedAt: string;
}

interface MutablePublicCoreStateV1 {
  installation: { installationId: string; entityId: string };
  room: PublicCoreRoomRecordV1 | null;
  projections: Map<string, PublicCoreProjectionRecordV1>;
  pairings: Map<string, PublicCorePairingChallengeRecordV1>;
  bindings: Map<string, PublicCoreBindingRecordV1>;
  encounters: Map<string, PublicCoreEncounterRecordV1>;
  interactions: Map<string, PublicCoreInteractionRecordV1>;
  rateEvents: PublicCoreRateEventV1[];
  events: PublicCoreRoomEventV1[];
  nonceRegistrations: Map<string, PublicCoreNonceRegistrationV1>;
  receiptReservations: Map<string, PublicCoreSha256>;
  receipts: Map<string, PublicCoreMutationReceiptV1>;
  acks: Map<string, PublicCoreEventAckV1>;
  purgeJobs: Map<string, PublicCorePurgeJobV1>;
  retentionHealth: PublicCoreRetentionHealthStateV1;
}

export interface PublicCoreStoreSnapshotV1 {
  readonly room: PublicCoreRoomRecordV1 | null;
  readonly projections: readonly PublicCoreProjectionRecordV1[];
  readonly pairings: readonly PublicCorePairingChallengeRecordV1[];
  readonly bindings: readonly PublicCoreBindingRecordV1[];
  readonly encounters: readonly PublicCoreEncounterRecordV1[];
  readonly interactions: readonly PublicCoreInteractionRecordV1[];
  readonly events: readonly PublicCoreRoomEventV1[];
  readonly receipts: readonly PublicCoreMutationReceiptV1[];
  readonly purgeJobs: readonly PublicCorePurgeJobV1[];
  readonly retentionHealth: PublicCoreRetentionHealthStateV1;
}

export interface PublicCoreRetentionTransitionResultV1 {
  readonly schemaVersion: "r4_public_core_retention_transition.v1";
  readonly projectionsTerminalized: number;
  readonly pairingsTerminalized: number;
  readonly encountersExpired: number;
  readonly interactionsTerminalized: number;
  readonly interactionTombstonesPruned: number;
  readonly rateEventsPruned: number;
  readonly roomEventsPruned: number;
  readonly receiptsPruned: number;
  readonly acksPruned: number;
  readonly bodyFree: true;
}

export interface PublicCoreTestMaintenanceV1 {
  recordSuccessfulPurge(at?: string): Promise<void>;
  compactBodyFreeEvents(retainFromSequence: number): Promise<void>;
  runRetentionTransitions(): Promise<PublicCoreRetentionTransitionResultV1>;
}

const PUBLIC_CORE_TEST_MAINTENANCE = new WeakMap<object, PublicCoreTestMaintenanceV1>();

export interface PublicCoreDurableNonceRegistrationV1 {
  readonly keyVersion: string;
  readonly nonceBase64url: string;
  readonly table: PublicCoreNonceRegistrationV1["table"];
  readonly rowId: string;
  readonly column: PublicCoreNonceRegistrationV1["column"];
  readonly fieldVersion: number;
}

/** JSON-safe image used only by the injected durable/restart test boundary. */
export interface PublicCoreDurableStoreImageV1 {
  readonly schemaVersion: "r4_public_core_durable_store_image.v1";
  readonly checkpointAt: string;
  readonly installation: Readonly<{ installationId: string; entityId: string }>;
  readonly room: PublicCoreRoomRecordV1 | null;
  readonly projections: readonly PublicCoreProjectionRecordV1[];
  readonly pairings: readonly PublicCorePairingChallengeRecordV1[];
  readonly bindings: readonly PublicCoreBindingRecordV1[];
  readonly encounters: readonly PublicCoreEncounterRecordV1[];
  readonly interactions: readonly PublicCoreInteractionRecordV1[];
  readonly rateEvents: readonly PublicCoreRateEventV1[];
  readonly events: readonly PublicCoreRoomEventV1[];
  readonly nonceRegistrations: readonly PublicCoreDurableNonceRegistrationV1[];
  readonly receipts: readonly PublicCoreMutationReceiptV1[];
  readonly acks: readonly PublicCoreEventAckV1[];
  readonly purgeJobs: readonly PublicCorePurgeJobV1[];
  readonly retentionHealth: PublicCoreRetentionHealthStateV1;
  readonly imageHash: PublicCoreSha256;
}

export interface PublicCoreIssueEncounterInputV1 { readonly projectionId: string; readonly encounterSecret: string; readonly coarseRateBucket: string }
export interface PublicCoreCreateInteractionInputV1 { readonly projectionId: string; readonly interactionType: InteractionType; readonly consent: InteractionConsent; readonly requestBody: string; readonly guestCapsule: GuestCapsuleV1 | null; readonly replySecret: string; readonly deleteSecret: string }
export interface PublicCoreDeleteInteractionInputV1 { readonly interactionId: string }
export interface PublicCoreExchangeRoomPairInputV1 { readonly pairingId: string; readonly pairingCode: string; readonly clientPublicKey: string }
export interface PublicCoreCreateRoomInputV1 { readonly entityId: string; readonly label: string }
export interface PublicCoreCreateRoomPairInputV1 { readonly roomId: string }
export interface PublicCoreRevokeRoomBindingInputV1 { readonly bindingId: string }
export interface PublicCoreSetRoomModeInputV1 { readonly roomId: string; readonly interactionMode: PublicCoreRoomMode }
export interface PublicCoreRevokeProjectionInputV1 { readonly projectionId: string }
export interface PublicCoreCurationInputV1 { readonly projectionId: string }
export interface PublicCoreSyncInputV1 { readonly roomId: string; readonly afterSequence: number }
export interface PublicCorePullInputV1 { readonly interactionId: string }
export interface PublicCoreAckInputV1 { readonly roomId: string; readonly eventId: string; readonly sequence: number; readonly eventHash: PublicCoreSha256 }
export interface PublicCoreDeliverProjectionInputV1 { readonly projection: ProjectionCapsuleV1; readonly publicationApprovalHash: PublicCoreSha256; readonly publicationAttestationHash: PublicCoreSha256 }
export interface PublicCoreLocalPurgeInputV1 { readonly interactionId: string; readonly localBytesAbsent: true }

export interface PublicCoreApplicationStoreV1 {
  listThirdPlace(): Promise<PublicCoreOperationResponseV1>;
  readProjection(input: Readonly<{ projectionId: string }>): Promise<PublicCoreOperationResponseV1>;
  readInteraction(input: Readonly<{ interactionId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1>;
  readRoomOperatorStatus(input: Readonly<{ roomId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1>;
  issuePublicEncounter(context: PublicCoreMutationContextV1, input: PublicCoreIssueEncounterInputV1): Promise<PublicCoreOperationResponseV1>;
  createInteraction(context: PublicCoreMutationContextV1, input: PublicCoreCreateInteractionInputV1): Promise<PublicCoreOperationResponseV1>;
  deleteInteraction(context: PublicCoreMutationContextV1, input: PublicCoreDeleteInteractionInputV1): Promise<PublicCoreOperationResponseV1>;
  exchangeRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreExchangeRoomPairInputV1): Promise<PublicCoreOperationResponseV1>;
  createRoom(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomInputV1): Promise<PublicCoreOperationResponseV1>;
  createRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomPairInputV1): Promise<PublicCoreOperationResponseV1>;
  revokeRoomBinding(context: PublicCoreMutationContextV1, input: PublicCoreRevokeRoomBindingInputV1): Promise<PublicCoreOperationResponseV1>;
  setRoomMode(context: PublicCoreMutationContextV1, input: PublicCoreSetRoomModeInputV1): Promise<PublicCoreOperationResponseV1>;
  revokeProjection(context: PublicCoreMutationContextV1, input: PublicCoreRevokeProjectionInputV1): Promise<PublicCoreOperationResponseV1>;
  admitProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1>;
  unlistProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1>;
  syncRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreSyncInputV1): Promise<PublicCoreOperationResponseV1>;
  pullRoomOperator(context: PublicCoreMutationContextV1, input: PublicCorePullInputV1): Promise<PublicCoreOperationResponseV1>;
  ackRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreAckInputV1): Promise<PublicCoreOperationResponseV1>;
  deliverProjection(context: PublicCoreMutationContextV1, input: PublicCoreDeliverProjectionInputV1): Promise<PublicCoreOperationResponseV1>;
  recordLocalPurgeReceipt(context: PublicCoreMutationContextV1, input: PublicCoreLocalPurgeInputV1): Promise<PublicCoreOperationResponseV1>;
}

export class PublicCoreStoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "PublicCoreStoreError";
    this.status = status;
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; status: number; code: string }> {
    return Object.freeze({ name: this.name, status: this.status, code: this.code });
  }
}

const AUTHENTIC_PUBLIC_CORE_STORE_ERRORS = new WeakSet<PublicCoreStoreError>();

/** Application membrane access; callers can inspect but cannot mint the brand. */
export function authenticPublicCoreStoreErrorDetails(error: unknown): Readonly<{ status: number; code: string }> | null {
  try {
    if (
      (typeof error !== "object" && typeof error !== "function")
      || error === null
      || !AUTHENTIC_PUBLIC_CORE_STORE_ERRORS.has(error as PublicCoreStoreError)
      || !Object.isFrozen(error)
    ) return null;
    const status = Object.getOwnPropertyDescriptor(error, "status");
    const code = Object.getOwnPropertyDescriptor(error, "code");
    if (
      !status || !("value" in status) || status.writable !== false
      || !Number.isSafeInteger(status.value) || status.value < 400 || status.value > 599
      || !code || !("value" in code) || code.writable !== false
      || typeof code.value !== "string" || !/^[A-Za-z0-9_]{1,128}$/u.test(code.value)
    ) return null;
    return Object.freeze({ status: status.value as number, code: code.value });
  } catch {
    return null;
  }
}

export class PublicCoreCommittedResponseLostError extends Error {
  readonly action: PublicCoreActionName;
  constructor(action: PublicCoreActionName) {
    super("R4_PUBLIC_CORE_COMMITTED_RESPONSE_LOST");
    this.name = "PublicCoreCommittedResponseLostError";
    this.action = action;
  }
}

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;
const TEN_MINUTES_MS = 10 * 60 * 1_000;
const THIRTY_DAYS_MS = 30 * DAY_MS;
const THIRTY_SEVEN_DAYS_MS = 37 * DAY_MS;
const PUBLIC_CORE_IDEMPOTENCY_KEY = /^(?:[A-Fa-f0-9]{32,256}|[A-Za-z0-9_-]{22,256})$/u;

function addMilliseconds(value: string, amount: number): string {
  return new Date(Date.parse(value) + amount).toISOString();
}

function plaintextSha256(value: string): PublicCoreSha256 {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function fail(status: number, code: string): never {
  const error = new PublicCoreStoreError(status, code);
  AUTHENTIC_PUBLIC_CORE_STORE_ERRORS.add(error);
  Object.freeze(error);
  throw error;
}

function response(status: number, body: Record<string, unknown>, recovered = false): PublicCoreOperationResponseV1 {
  return deepFreezeOwned(ownedPlainSnapshot({ status, body, recovered }, "public_core_response_invalid") as unknown as PublicCoreOperationResponseV1);
}

function deepFreezeOwned<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    // Typed-array elements cannot be frozen by ECMAScript. They are accepted
    // here only after an owned copy and never cross a response boundary.
    if (value instanceof Uint8Array) return value;
    for (const child of Object.values(value as Record<string, unknown>)) deepFreezeOwned(child);
    Object.freeze(value);
  }
  return value;
}

function ownedPlainSnapshot(value: unknown, code: string, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(503, code);
    return value;
  }
  if (typeof value !== "object" || depth > 64 || seen.has(value)) fail(503, code);
  seen.add(value);
  try {
    if (value instanceof Uint8Array) return Uint8Array.from(value);
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length !== 0) fail(503, code);
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) fail(503, code);
      const length = descriptors.length;
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0) fail(503, code);
      const result: unknown[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) fail(503, code);
        result.push(ownedPlainSnapshot(descriptor.value, code, seen, depth + 1));
      }
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key))) fail(503, code);
      return result;
    }
    if (prototype !== Object.prototype && prototype !== null) fail(503, code);
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor) || descriptor.enumerable !== true) fail(503, code);
      result[key] = ownedPlainSnapshot(descriptor.value, code, seen, depth + 1);
    }
    return result;
  } catch (error) {
    const details = authenticPublicCoreStoreErrorDetails(error);
    if (details?.code === code) fail(details.status, details.code);
    fail(503, code);
  } finally {
    seen.delete(value);
  }
}

interface CapturedPortMethodV1 {
  readonly receiver: unknown;
  readonly method: (...args: readonly unknown[]) => unknown;
}

/**
 * Capture injected methods without invoking accessors. The captured function
 * cannot later be swapped by a caller and every reflection failure is reduced
 * to one local, body-free store error.
 */
function capturePortMethod(source: unknown, name: string, code: string): CapturedPortMethodV1 {
  if ((typeof source !== "object" && typeof source !== "function") || source === null) fail(503, code);
  try {
    let cursor: object | null = source;
    for (let depth = 0; cursor !== null && depth < 16; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
      if (descriptor) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") fail(503, code);
        return Object.freeze({ receiver: source, method: descriptor.value as (...args: readonly unknown[]) => unknown });
      }
      cursor = Object.getPrototypeOf(cursor) as object | null;
    }
  } catch (error) {
    const details = authenticPublicCoreStoreErrorDetails(error);
    if (details?.code === code) fail(details.status, details.code);
  }
  fail(503, code);
}

function invokeCaptured(port: CapturedPortMethodV1, args: readonly unknown[]): unknown {
  return Reflect.apply(port.method, port.receiver, args);
}

function ownDataProperty(source: unknown, name: string, code: string, optional = false): unknown {
  if ((typeof source !== "object" && typeof source !== "function") || source === null) fail(503, code);
  try {
    const descriptor = Object.getOwnPropertyDescriptor(source, name);
    if (!descriptor) {
      if (optional) return undefined;
      fail(503, code);
    }
    if (!("value" in descriptor) || descriptor.enumerable !== true) fail(503, code);
    return descriptor.value;
  } catch (error) {
    const details = authenticPublicCoreStoreErrorDetails(error);
    if (details?.code === code) fail(details.status, details.code);
    fail(503, code);
  }
}

function receiptKey(context: PublicCoreMutationContextV1): string {
  return `${context.actorScopeDigest}\u0000${context.action}\u0000${context.idempotencyKey}`;
}

function sameKeyedDigest(left: PublicCoreKeyedDigestV1, right: PublicCoreKeyedDigestV1): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.algorithm === right.algorithm
    && left.keyVersion === right.keyVersion
    && left.digest === right.digest;
}

function exactObjectKeys(value: unknown, expected: readonly string[]): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function assertDurable(condition: unknown, code = "durable_image_invariant_invalid"): asserts condition {
  if (!condition) fail(503, code);
}

function durableInstant(value: string): number {
  const parsed = Date.parse(value);
  assertDurable(Number.isFinite(parsed) && new Date(parsed).toISOString() === value);
  return parsed;
}

function assertDurableId(value: string, prefix: string): void {
  assertDurable(new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value));
}

function assertDurableSha(value: string): void {
  assertDurable(/^sha256:[a-f0-9]{64}$/u.test(value));
}

function assertDurableRoomEventTarget(event: PublicCoreRoomEventV1): void {
  const expected = PUBLIC_CORE_ROOM_EVENT_CONTRACT[event.action];
  assertDurable(
    expected !== undefined
    && event.targetKind === expected.targetKind
    && event.bodyAvailable === expected.bodyAvailable,
  );
  assertDurableId(event.targetId, expected.targetIdPrefix);
  if (expected.targetKind === "room") assertDurable(event.targetId === event.roomId);
}

function assertDurableDigest(value: PublicCoreKeyedDigestV1): void {
  assertDurable(exactObjectKeys(value, ["schemaVersion", "algorithm", "keyVersion", "digest"]));
  assertDurable(value.schemaVersion === "r4_public_core_keyed_digest.v1" && value.algorithm === "hmac-sha256.v1");
  assertDurable(/^keyv_[a-f0-9]{32}$/u.test(value.keyVersion));
  assertDurableSha(value.digest);
}

interface DurableProtectedFieldExpectationV1 {
  readonly table: PublicCoreFieldAadV1["table"];
  readonly column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
  readonly roomId: string;
  readonly rowId: string;
}

function assertDurableProtectedValue(
  value: PublicCoreProtectedValueV1,
  expected: DurableProtectedFieldExpectationV1,
): Readonly<{ nonceKey: string; fieldKey: string }> {
  assertDurable(exactObjectKeys(value, ["schemaVersion", "envelope", "plaintextHash", "objectVersion", "readable"]));
  assertDurable(value.schemaVersion === "r4_public_core_protected_value.v1" && value.readable === true);
  assertDurable(Number.isSafeInteger(value.objectVersion) && value.objectVersion >= 1);
  assertDurableSha(value.plaintextHash);
  const envelope = value.envelope;
  assertDurable(exactObjectKeys(envelope, ["schemaVersion", "algorithm", "keyVersion", "nonce", "ciphertext", "tag", "aadHash"]));
  assertDurable(envelope.schemaVersion === "a256gcm.v1" && envelope.algorithm === "AES-256-GCM");
  assertDurable(typeof envelope.keyVersion === "string" && /^keyv_[a-f0-9]{32}$/u.test(envelope.keyVersion));
  const decode = (input: unknown, bytes: number | null): Buffer => {
    assertDurable(typeof input === "string" && /^[A-Za-z0-9_-]+$/u.test(input));
    const decoded = Buffer.from(input, "base64url");
    assertDurable(decoded.length > 0 && Buffer.from(decoded).toString("base64url") === input && (bytes === null || decoded.length === bytes));
    return decoded;
  };
  const nonce = decode(envelope.nonce, 12);
  decode(envelope.ciphertext, null);
  decode(envelope.tag, 16);
  assertDurable(typeof envelope.aadHash === "string");
  assertDurableSha(envelope.aadHash);
  const aadColumn = PUBLIC_CORE_FIELD_COLUMNS[`${expected.table}.${expected.column}`];
  assertDurable(aadColumn !== undefined);
  const aad: PublicCoreFieldAadV1 = {
    schemaVersion: "r4_public_core_aad.v1",
    table: expected.table,
    column: aadColumn,
    roomId: expected.roomId,
    rowId: expected.rowId,
    objectVersion: value.objectVersion,
  };
  assertDurable(envelope.aadHash === canonicalSha256(aad));
  return Object.freeze({
    nonceKey: `${envelope.keyVersion}:${Buffer.from(nonce).toString("base64url")}`,
    fieldKey: `${expected.table}:${expected.rowId}:${aadColumn}:${value.objectVersion}`,
  });
}

function assertUniqueBy<T>(values: readonly T[], keyOf: (value: T) => string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = keyOf(value);
    assertDurable(!seen.has(key));
    seen.add(key);
  }
}

function assertDurableSyncSnapshot(snapshot: PublicCoreSyncRecoveryBodyV1): void {
  const cursorGone = snapshot.schemaVersion === "r4_public_core_cursor_gone.v1";
  assertDurable(cursorGone || snapshot.schemaVersion === "r4_public_core_event_batch.v1");
  assertDurable(exactObjectKeys(snapshot, cursorGone
    ? ["schemaVersion", "roomId", "afterSequence", "highWater", "earliestReplayableSequence", "events", "tombstoneIds"]
    : ["schemaVersion", "roomId", "afterSequence", "highWater", "events"]));
  assertDurableId(snapshot.roomId, "room");
  assertDurable(
    Number.isSafeInteger(snapshot.afterSequence)
    && snapshot.afterSequence >= 0
    && Number.isSafeInteger(snapshot.highWater)
    && snapshot.highWater >= snapshot.afterSequence
    && Array.isArray(snapshot.events),
  );
  let previous = cursorGone ? snapshot.earliestReplayableSequence - 1 : snapshot.afterSequence;
  if (cursorGone) {
    assertDurable(
      Number.isSafeInteger(snapshot.earliestReplayableSequence)
      && snapshot.earliestReplayableSequence > snapshot.afterSequence + 1
      && snapshot.earliestReplayableSequence <= snapshot.highWater + 1,
    );
    assertDurable(Array.isArray(snapshot.tombstoneIds));
    assertUniqueBy(snapshot.tombstoneIds, (value) => value);
    let previousTombstone: string | null = null;
    for (const id of snapshot.tombstoneIds) {
      assertDurable(/^(?:proj|interaction)_[A-Za-z0-9_-]{16,128}$/u.test(id));
      if (previousTombstone !== null) assertDurable(previousTombstone < id);
      previousTombstone = id;
    }
  }
  const eventIds = new Set<string>();
  for (const event of snapshot.events) {
    assertDurable(exactObjectKeys(event, [
      "schemaVersion", "eventId", "roomId", "sequence", "action", "targetKind", "targetId", "targetVersion",
      "eventHash", "committedAt", "bodyAvailable",
    ]));
    const candidate = event as unknown as PublicCoreRoomEventV1;
    assertDurable(candidate.schemaVersion === "r4_public_core_room_event.v1" && candidate.roomId === snapshot.roomId);
    assertDurableId(candidate.eventId, "event");
    assertDurable(!eventIds.has(candidate.eventId));
    eventIds.add(candidate.eventId);
    assertDurable(PUBLIC_CORE_ACTION_NAMES.includes(candidate.action));
    assertDurable(Number.isSafeInteger(candidate.sequence) && candidate.sequence === previous + 1 && candidate.sequence <= snapshot.highWater);
    assertDurable(Number.isSafeInteger(candidate.targetVersion) && candidate.targetVersion >= 1 && typeof candidate.bodyAvailable === "boolean");
    assertDurableRoomEventTarget(candidate);
    durableInstant(candidate.committedAt);
    assertDurableSha(candidate.eventHash);
    const { eventHash, ...preimage } = candidate;
    assertDurable(canonicalSha256(preimage) === eventHash);
    previous = candidate.sequence;
  }
  assertDurable(previous === snapshot.highWater);
}

function exactSyncSourceExpiresAt(
  snapshot: PublicCoreSyncRecoveryBodyV1,
  committedAt: string,
  interactionAcceptedAt: (interactionId: string) => string | null,
): string | null {
  const committedAtMs = Date.parse(committedAt);
  if (!Number.isSafeInteger(committedAtMs)) return null;
  const deadlines = [committedAtMs + THIRTY_SEVEN_DAYS_MS];
  for (const event of snapshot.events) {
    const eventAt = Date.parse(event.committedAt);
    if (!Number.isSafeInteger(eventAt)) return null;
    deadlines.push(eventAt + THIRTY_SEVEN_DAYS_MS);
  }
  if (snapshot.schemaVersion === "r4_public_core_cursor_gone.v1") {
    for (const targetId of snapshot.tombstoneIds) {
      if (!targetId.startsWith("interaction_")) continue;
      const acceptedAt = interactionAcceptedAt(targetId);
      const acceptedAtMs = acceptedAt === null ? Number.NaN : Date.parse(acceptedAt);
      if (!Number.isSafeInteger(acceptedAtMs)) return null;
      deadlines.push(acceptedAtMs + THIRTY_SEVEN_DAYS_MS);
    }
  }
  const deadline = Math.min(...deadlines);
  return Number.isSafeInteger(deadline) ? new Date(deadline).toISOString() : null;
}

function assertDurableReceiptRecovery(recovery: PublicCoreReceiptRecoveryV1): void {
  const version = (value: number): void => assertDurable(Number.isSafeInteger(value) && value >= 1);
  switch (recovery.kind) {
    case "room_created":
      assertDurable(exactObjectKeys(recovery, ["kind", "roomId", "roomVersion", "roomMode"]));
      assertDurableId(recovery.roomId, "room"); version(recovery.roomVersion); assertDurable(recovery.roomMode === "public_single"); return;
    case "encounter_issued":
      assertDurable(exactObjectKeys(recovery, ["kind", "encounterId", "encounterVersion", "expiresAt"]));
      assertDurableId(recovery.encounterId, "encounter"); version(recovery.encounterVersion); durableInstant(recovery.expiresAt); return;
    case "interaction_created":
      assertDurable(exactObjectKeys(recovery, ["kind", "interactionId", "interactionVersion", "state"]));
      assertDurableId(recovery.interactionId, "interaction"); version(recovery.interactionVersion); assertDurable(recovery.state === "accepted"); return;
    case "interaction_deleted":
      assertDurable(exactObjectKeys(recovery, ["kind", "interactionId", "interactionVersion", "bodyAvailable"]));
      assertDurableId(recovery.interactionId, "interaction"); version(recovery.interactionVersion); assertDurable(recovery.bodyAvailable === false); return;
    case "binding_revoked":
      assertDurable(exactObjectKeys(recovery, ["kind", "bindingId", "bindingVersion"]));
      assertDurableId(recovery.bindingId, "binding"); version(recovery.bindingVersion); return;
    case "room_mode_set":
      assertDurable(exactObjectKeys(recovery, ["kind", "roomId", "roomVersion"]));
      assertDurableId(recovery.roomId, "room"); version(recovery.roomVersion); return;
    case "projection_revoked":
    case "projection_admitted":
    case "projection_unlisted":
    case "projection_delivered":
      assertDurable(exactObjectKeys(recovery, ["kind", "projectionId", "projectionVersion"]));
      assertDurableId(recovery.projectionId, "proj"); version(recovery.projectionVersion); return;
    case "local_purge_recorded":
    case "pull_terminal":
      assertDurable(exactObjectKeys(recovery, recovery.kind === "pull_terminal"
        ? ["kind", "interactionId", "interactionVersion", "state"]
        : ["kind", "interactionId", "interactionVersion"]));
      assertDurableId(recovery.interactionId, "interaction"); version(recovery.interactionVersion);
      if (recovery.kind === "pull_terminal") {
        assertDurable(["interaction_deleted", "interaction_expired", "origin_revoked"].includes(recovery.state));
      }
      return;
    case "pairing_issue":
      assertDurable(exactObjectKeys(recovery, ["kind", "pairingId", "targetVersion"]));
      assertDurableId(recovery.pairingId, "pairing"); version(recovery.targetVersion); return;
    case "pairing_exchange":
      assertDurable(exactObjectKeys(recovery, ["kind", "pairingId", "bindingId", "targetVersion"]));
      assertDurableId(recovery.pairingId, "pairing"); assertDurableId(recovery.bindingId, "binding"); version(recovery.targetVersion); return;
    case "sync":
      assertDurable(exactObjectKeys(recovery, ["kind", "snapshot", "sourceExpiresAt"]));
      assertDurableSyncSnapshot(recovery.snapshot);
      durableInstant(recovery.sourceExpiresAt);
      return;
    case "pull":
      assertDurable(exactObjectKeys(recovery, [
        "kind", "interactionId", "interactionVersion", "requestFieldVersion", "bodyHash",
        "guestCapsuleFieldVersion", "guestCapsuleHash", "bodyExpiresAt",
      ]));
      assertDurableId(recovery.interactionId, "interaction"); version(recovery.interactionVersion); assertDurable(recovery.requestFieldVersion === 1);
      assertDurableSha(recovery.bodyHash); durableInstant(recovery.bodyExpiresAt);
      assertDurable((recovery.guestCapsuleFieldVersion === null) === (recovery.guestCapsuleHash === null));
      if (recovery.guestCapsuleFieldVersion !== null) assertDurable(recovery.guestCapsuleFieldVersion === 1);
      if (recovery.guestCapsuleHash !== null) assertDurableSha(recovery.guestCapsuleHash);
      return;
    case "ack":
      assertDurable(exactObjectKeys(recovery, ["kind", "ackId", "eventId", "sequence", "eventHash"]));
      assertDurableId(recovery.ackId, "ack"); assertDurableId(recovery.eventId, "event"); assertDurableSha(recovery.eventHash);
      assertDurable(Number.isSafeInteger(recovery.sequence) && recovery.sequence >= 1); return;
    default:
      return recovery satisfies never;
  }
}

function bodyFreeProjection(record: PublicCoreProjectionRecordV1): Readonly<Record<string, unknown>> {
  return Object.freeze({
    projectionId: record.projectionId,
    roomId: record.roomId,
    payloadHash: record.payloadHash,
    ownerState: record.ownerState,
    curationState: record.curationState,
    current: record.current,
    publishedAt: record.publishedAt,
    freshUntil: record.freshUntil,
    expiresAt: record.expiresAt,
    version: record.version,
    bodyAvailable: record.capsule?.readable === true,
  });
}

function bodyFreeInteraction(record: PublicCoreInteractionRecordV1): Readonly<Record<string, unknown>> {
  return Object.freeze({
    interactionId: record.interactionId,
    roomId: record.roomId,
    projectionId: record.projectionId,
    originProjectionHash: record.originProjectionHash,
    interactionType: record.interactionType,
    consent: record.consent,
    state: record.state,
    acceptedAt: record.acceptedAt,
    expiresAt: record.expiresAt,
    version: record.version,
    bodyAvailable: record.requestBody?.readable === true,
    localPurgeReceivedAt: record.localPurgeReceivedAt,
  });
}

function assertDurableImageInvariants(image: PublicCoreDurableStoreImageV1): void {
  const nowMs = durableInstant(image.checkpointAt);
  assertDurable(exactObjectKeys(image, [
    "schemaVersion", "checkpointAt", "installation", "room", "projections", "pairings", "bindings", "encounters",
    "interactions", "rateEvents", "events", "nonceRegistrations", "receipts", "acks", "purgeJobs",
    "retentionHealth", "imageHash",
  ]));
  assertDurable(image.schemaVersion === "r4_public_core_durable_store_image.v1");
  assertDurable([
    image.projections, image.pairings, image.bindings, image.encounters, image.interactions, image.rateEvents,
    image.events, image.nonceRegistrations, image.receipts, image.acks, image.purgeJobs,
  ].every(Array.isArray));
  assertDurable(exactObjectKeys(image.installation, ["installationId", "entityId"]));
  assertDurableId(image.installation.installationId, "install");
  assertDurableId(image.installation.entityId, "entity");
  assertDurable(exactObjectKeys(image.retentionHealth, ["lastSuccessfulPurgeAt", "lastBoundedRunAt"]));
  assertDurable(durableInstant(image.retentionHealth.lastSuccessfulPurgeAt) <= nowMs && durableInstant(image.retentionHealth.lastBoundedRunAt) <= nowMs);
  assertUniqueBy(image.projections, (value) => value.projectionId);
  assertUniqueBy(image.pairings, (value) => value.pairingId);
  assertUniqueBy(image.bindings, (value) => value.bindingId);
  assertUniqueBy(image.encounters, (value) => value.encounterId);
  assertUniqueBy(image.interactions, (value) => value.interactionId);
  assertUniqueBy(image.events, (value) => value.eventId);
  assertUniqueBy(image.receipts, (value) => `${value.actorScopeDigest}\u0000${value.action}\u0000${value.idempotencyKey}`);
  assertUniqueBy(image.receipts, (value) => value.receiptId);
  assertUniqueBy(image.acks, (value) => `${value.bindingId}\u0000${value.eventId}`);
  assertUniqueBy(image.acks, (value) => value.ackId);
  assertUniqueBy(image.purgeJobs, (value) => value.purgeId);

  const room = image.room;
  if (room === null) {
    assertDurable([
      image.projections, image.pairings, image.bindings, image.encounters, image.interactions,
      image.rateEvents, image.events, image.nonceRegistrations, image.receipts, image.acks, image.purgeJobs,
    ].every((values) => values.length === 0));
    return;
  }
  assertDurable(exactObjectKeys(room, [
    "roomId", "installationId", "entityId", "roomKind", "interactionMode", "state", "label",
    "currentProjectionId", "eventHighWater", "eventFloor", "version", "createdAt",
  ]));
  assertDurableId(room.roomId, "room");
  assertDurable(room.installationId === image.installation.installationId && room.entityId === image.installation.entityId);
  assertDurable(room.roomKind === "third_place_public" && room.state === "active");
  assertDurable(room.interactionMode === "public_single" || room.interactionMode === "closed");
  assertDurable(Number.isSafeInteger(room.version) && room.version >= 1);
  assertDurable(Number.isSafeInteger(room.eventHighWater) && room.eventHighWater >= 0);
  assertDurable(Number.isSafeInteger(room.eventFloor) && room.eventFloor >= 1 && room.eventFloor <= room.eventHighWater + 1);
  assertDurable(durableInstant(room.createdAt) <= nowMs);

  const projections = new Map(image.projections.map((value) => [value.projectionId, value]));
  const pairings = new Map(image.pairings.map((value) => [value.pairingId, value]));
  const bindings = new Map(image.bindings.map((value) => [value.bindingId, value]));
  const encounters = new Map(image.encounters.map((value) => [value.encounterId, value]));
  const interactions = new Map(image.interactions.map((value) => [value.interactionId, value]));
  const expectedNonceKeys = new Set<string>();
  const expectedFieldKeys = new Set<string>();
  const registerProtected = (value: PublicCoreProtectedValueV1, expected: DurableProtectedFieldExpectationV1): void => {
    const registration = assertDurableProtectedValue(value, expected);
    assertDurable(!expectedNonceKeys.has(registration.nonceKey) && !expectedFieldKeys.has(registration.fieldKey));
    expectedNonceKeys.add(registration.nonceKey);
    expectedFieldKeys.add(registration.fieldKey);
  };
  registerProtected(room.label, { table: "rooms", column: "label", roomId: room.roomId, rowId: room.roomId });

  let currentProjection: PublicCoreProjectionRecordV1 | null = null;
  for (const projection of image.projections) {
    assertDurable(exactObjectKeys(projection, [
      "projectionId", "roomId", "entityId", "capsule", "payloadHash", "publicationApprovalHash",
      "publicationAttestationHash", "ownerState", "curationState", "current", "publishedAt", "freshUntil",
      "expiresAt", "version",
    ]));
    assertDurableId(projection.projectionId, "proj");
    assertDurable(projection.roomId === room.roomId && projection.entityId === room.entityId);
    assertDurableSha(projection.payloadHash); assertDurableSha(projection.publicationApprovalHash); assertDurableSha(projection.publicationAttestationHash);
    assertDurable(Number.isSafeInteger(projection.version) && projection.version >= 1);
    const publishedAt = durableInstant(projection.publishedAt);
    const freshUntil = durableInstant(projection.freshUntil);
    const expiresAt = durableInstant(projection.expiresAt);
    assertDurable(publishedAt <= nowMs && freshUntil > publishedAt && freshUntil < expiresAt && expiresAt - publishedAt <= 7 * DAY_MS);
    assertDurable(["published_fresh", "stale", "superseded", "revoked", "expired"].includes(projection.ownerState));
    assertDurable(["not_admitted", "admitted", "unlisted"].includes(projection.curationState));
    const terminal = projection.ownerState === "superseded" || projection.ownerState === "revoked" || projection.ownerState === "expired" || expiresAt <= nowMs;
    if (terminal) assertDurable(projection.capsule === null && projection.current === false);
    else {
      assertDurable(projection.capsule !== null && projection.current === true);
      registerProtected(projection.capsule, { table: "projections", column: "capsule", roomId: room.roomId, rowId: projection.projectionId });
      assertDurable(currentProjection === null);
      currentProjection = projection;
    }
  }
  assertDurable((room.currentProjectionId === null && currentProjection === null) || room.currentProjectionId === currentProjection?.projectionId);

  for (const pairing of image.pairings) {
    assertDurable(exactObjectKeys(pairing, [
      "pairingId", "roomId", "pairingCode", "pairingCodeDigest", "exchangeEnvelope", "state", "bindingId",
      "issuedAt", "expiresAt", "version",
    ]));
    assertDurableId(pairing.pairingId, "pairing");
    assertDurable(pairing.roomId === room.roomId && Number.isSafeInteger(pairing.version) && pairing.version >= 1);
    assertDurableDigest(pairing.pairingCodeDigest);
    const issuedAt = durableInstant(pairing.issuedAt);
    const expiresAt = durableInstant(pairing.expiresAt);
    assertDurable(issuedAt <= nowMs && expiresAt > issuedAt && expiresAt - issuedAt <= TEN_MINUTES_MS);
    if (pairing.state === "issued") {
      assertDurable(expiresAt > nowMs && pairing.pairingCode !== null && pairing.exchangeEnvelope === null && pairing.bindingId === null);
      registerProtected(pairing.pairingCode, { table: "pairing_challenges", column: "pairing_code", roomId: room.roomId, rowId: pairing.pairingId });
    } else if (pairing.state === "exchanged") {
      assertDurable(expiresAt > nowMs && pairing.pairingCode === null && pairing.exchangeEnvelope !== null && pairing.bindingId !== null && bindings.has(pairing.bindingId));
      registerProtected(pairing.exchangeEnvelope, { table: "pairing_challenges", column: "exchange_envelope", roomId: room.roomId, rowId: pairing.pairingId });
    } else {
      assertDurable(pairing.state === "expired" && pairing.pairingCode === null && pairing.exchangeEnvelope === null);
    }
  }

  for (const binding of image.bindings) {
    assertDurable(exactObjectKeys(binding, ["bindingId", "roomId", "secretDigest", "state", "pairedAt", "expiresAt", "revokedAt", "version"]));
    assertDurableId(binding.bindingId, "binding");
    assertDurable(binding.roomId === room.roomId && Number.isSafeInteger(binding.version) && binding.version >= 1);
    assertDurableDigest(binding.secretDigest);
    const pairedAt = durableInstant(binding.pairedAt);
    const expiresAt = durableInstant(binding.expiresAt);
    assertDurable(pairedAt <= nowMs && expiresAt > pairedAt && expiresAt - pairedAt <= THIRTY_DAYS_MS);
    assertDurable(["current", "revoked", "expired"].includes(binding.state));
    assertDurable((binding.state === "revoked") === (binding.revokedAt !== null));
    if (binding.revokedAt !== null) assertDurable(durableInstant(binding.revokedAt) >= pairedAt);
  }

  for (const encounter of image.encounters) {
    assertDurable(exactObjectKeys(encounter, [
      "encounterId", "roomId", "projectionId", "secretDigest", "rateBucketDigest", "state", "issuedAt",
      "expiresAt", "interactionId", "version",
    ]));
    assertDurableId(encounter.encounterId, "encounter");
    assertDurable(encounter.roomId === room.roomId && projections.get(encounter.projectionId)?.roomId === room.roomId);
    assertDurableDigest(encounter.secretDigest); assertDurableDigest(encounter.rateBucketDigest);
    const issuedAt = durableInstant(encounter.issuedAt);
    const expiresAt = durableInstant(encounter.expiresAt);
    assertDurable(issuedAt <= nowMs && expiresAt > nowMs && expiresAt - issuedAt <= DAY_MS);
    assertDurable(["issued", "consumed", "revoked"].includes(encounter.state));
    if (encounter.state === "consumed") assertDurable(encounter.interactionId !== null && interactions.has(encounter.interactionId));
    else assertDurable(encounter.interactionId === null);
  }

  for (const interaction of image.interactions) {
    assertDurable(exactObjectKeys(interaction, [
      "interactionId", "roomId", "projectionId", "originProjectionHash", "originStateAtAcceptance", "interactionType",
      "requestBody", "guestCapsule", "requestHash", "guestCapsuleHash", "consent", "consentHash", "replySecretDigest",
      "deleteSecretDigest", "state", "acceptedAt", "expiresAt", "localPurgeReceivedAt", "version",
    ]));
    assertDurableId(interaction.interactionId, "interaction");
    assertDurable(interaction.roomId === room.roomId && projections.get(interaction.projectionId)?.roomId === room.roomId);
    assertDurableSha(interaction.originProjectionHash); assertDurableSha(interaction.requestHash); assertDurableSha(interaction.consentHash);
    if (interaction.guestCapsuleHash !== null) assertDurableSha(interaction.guestCapsuleHash);
    assertDurableDigest(interaction.replySecretDigest); assertDurableDigest(interaction.deleteSecretDigest);
    assertDurable(Number.isSafeInteger(interaction.version) && interaction.version >= 1);
    assertDurable(["ask", "seed", "resonance"].includes(interaction.interactionType));
    assertDurable(interaction.consent === "allow_owner_local_ai" || interaction.consent === "manual_owner_only");
    assertDurable(interaction.originStateAtAcceptance === "published_fresh");
    const acceptedAt = durableInstant(interaction.acceptedAt);
    const expiresAt = durableInstant(interaction.expiresAt);
    assertDurable(acceptedAt <= nowMs && expiresAt > acceptedAt && expiresAt - acceptedAt <= THIRTY_DAYS_MS);
    assertDurable(acceptedAt + THIRTY_SEVEN_DAYS_MS > nowMs);
    const terminal = interaction.state === "interaction_deleted" || interaction.state === "interaction_expired" || interaction.state === "origin_revoked" || expiresAt <= nowMs;
    if (terminal) assertDurable(interaction.requestBody === null && interaction.guestCapsule === null);
    else {
      assertDurable((interaction.state === "accepted" || interaction.state === "seen_locally") && interaction.requestBody !== null);
      registerProtected(interaction.requestBody, { table: "interactions", column: "request_body", roomId: room.roomId, rowId: interaction.interactionId });
      if (interaction.guestCapsule === null) assertDurable(interaction.guestCapsuleHash === null);
      else {
        assertDurable(interaction.guestCapsuleHash !== null);
        registerProtected(interaction.guestCapsule, { table: "interactions", column: "guest_capsule", roomId: room.roomId, rowId: interaction.interactionId });
      }
    }
    if (interaction.localPurgeReceivedAt !== null) assertDurable(durableInstant(interaction.localPurgeReceivedAt) >= acceptedAt);
  }

  for (const event of image.rateEvents) {
    assertDurable(exactObjectKeys(event, ["roomId", "kind", "bucketDigest", "occurredAt"]));
    assertDurable(event.roomId === room.roomId && (event.kind === "encounter_issue" || event.kind === "interaction_accept"));
    assertDurableDigest(event.bucketDigest);
    const occurredAt = durableInstant(event.occurredAt);
    assertDurable(occurredAt <= nowMs && occurredAt > nowMs - 25 * HOUR_MS);
  }

  let expectedSequence = room.eventFloor;
  const retainedEvents = new Map<string, PublicCoreRoomEventV1>();
  const retainedEventsBySequence = new Map<number, PublicCoreRoomEventV1>();
  for (const event of image.events) {
    assertDurable(exactObjectKeys(event, [
      "schemaVersion", "eventId", "roomId", "sequence", "action", "targetKind", "targetId", "targetVersion",
      "eventHash", "committedAt", "bodyAvailable",
    ]));
    assertDurableId(event.eventId, "event");
    assertDurable(event.schemaVersion === "r4_public_core_room_event.v1" && event.roomId === room.roomId);
    assertDurable(PUBLIC_CORE_ACTION_NAMES.includes(event.action) && Number.isSafeInteger(event.targetVersion) && event.targetVersion >= 1);
    assertDurableRoomEventTarget(event);
    assertDurable(event.sequence === expectedSequence && durableInstant(event.committedAt) > nowMs - THIRTY_SEVEN_DAYS_MS);
    const { eventHash, ...preimage } = event;
    assertDurableSha(eventHash); assertDurable(canonicalSha256(preimage) === eventHash);
    retainedEvents.set(event.eventId, event);
    retainedEventsBySequence.set(event.sequence, event);
    expectedSequence += 1;
  }
  assertDurable(expectedSequence === room.eventHighWater + 1);

  const recoveryAction: Readonly<Record<PublicCoreReceiptRecoveryV1["kind"], PublicCoreActionName>> = {
    room_created: "room.create", encounter_issued: "public_encounter.issue", interaction_created: "interaction.create",
    interaction_deleted: "interaction.delete", binding_revoked: "room.binding.revoke", room_mode_set: "room.mode.set",
    projection_revoked: "projection.revoke", projection_admitted: "curation.admit", projection_unlisted: "curation.unlist",
    projection_delivered: "room_operator.projection.deliver", local_purge_recorded: "room_operator.local_purge.receipt",
    pull_terminal: "room_operator.pull", pairing_issue: "room.pair", pairing_exchange: "room.pair.exchange",
    sync: "room_operator.sync", pull: "room_operator.pull", ack: "room_operator.ack",
  };
  for (const receipt of image.receipts) {
    assertDurable(exactObjectKeys(receipt, [
      "schemaVersion", "receiptId", "action", "actorScopeDigest", "idempotencyKey", "requestHash", "status", "code",
      "recovery", "committedAt", "expiresAt",
    ]));
    assertDurableId(receipt.receiptId, "receipt");
    assertDurable(receipt.schemaVersion === "r4_public_core_mutation_receipt.v1" && recoveryAction[receipt.recovery.kind] === receipt.action);
    assertDurableReceiptRecovery(receipt.recovery);
    assertDurableSha(receipt.actorScopeDigest); assertDurableSha(receipt.requestHash);
    assertDurable(typeof receipt.idempotencyKey === "string" && PUBLIC_CORE_IDEMPOTENCY_KEY.test(receipt.idempotencyKey));
    const resultByRecovery: Readonly<Record<PublicCoreReceiptRecoveryV1["kind"], readonly (readonly [number, string])[]>> = {
      room_created: [[201, "room_created"]], pairing_issue: [[201, "pairing_issued"]], pairing_exchange: [[201, "pairing_exchanged"]],
      binding_revoked: [[200, "binding_revoked"]], room_mode_set: [[200, "room_mode_set"]], projection_delivered: [[201, "projection_delivered"]],
      projection_revoked: [[200, "projection_revoked"]], projection_admitted: [[200, "projection_admitted"]], projection_unlisted: [[200, "projection_unlisted"]],
      encounter_issued: [[201, "encounter_issued"]], interaction_created: [[201, "interaction_created"]], interaction_deleted: [[200, "interaction_deleted"]],
      sync: [[200, "events_synced"], [410, "cursor_gone"]], pull_terminal: [[410, "pull_terminal"]], pull: [[200, "interaction_pulled"]],
      ack: [[200, "event_acked"]], local_purge_recorded: [[200, "local_purge_recorded"]],
    };
    assertDurable(resultByRecovery[receipt.recovery.kind].some(([status, code]) => receipt.status === status && receipt.code === code));
    const recovery = receipt.recovery;
    let receiptSourceAt: string | null = null;
    switch (recovery.kind) {
      case "room_created":
        assertDurable(recovery.roomId === room.roomId && room.version >= recovery.roomVersion);
        break;
      case "encounter_issued": {
        const encounter = encounters.get(recovery.encounterId);
        if (encounter) {
          assertDurable(encounter.roomId === room.roomId && encounter.version >= recovery.encounterVersion && encounter.expiresAt === recovery.expiresAt);
        } else {
          assertDurable(durableInstant(recovery.expiresAt) <= nowMs);
        }
        break;
      }
      case "interaction_created":
      case "interaction_deleted":
      case "local_purge_recorded":
      case "pull_terminal":
      case "pull": {
        const interaction = interactions.get(recovery.interactionId);
        assertDurable(interaction !== undefined && interaction.roomId === room.roomId && interaction.version >= recovery.interactionVersion);
        receiptSourceAt = interaction.acceptedAt;
        if (recovery.kind === "interaction_created") assertDurable(recovery.state === "accepted");
        if (recovery.kind === "interaction_deleted") assertDurable(interaction.state === "interaction_deleted" && recovery.bodyAvailable === false);
        if (recovery.kind === "local_purge_recorded") assertDurable(interaction.localPurgeReceivedAt !== null);
        if (recovery.kind === "pull_terminal") {
          assertDurable(["interaction_deleted", "interaction_expired", "origin_revoked"].includes(interaction.state));
        }
        if (recovery.kind === "pull") {
          const hasHistoricalFieldVersion = (
            column: "request_ciphertext" | "guest_capsule_ciphertext",
            fieldVersion: number,
          ): boolean => image.nonceRegistrations.some((registration) => (
            registration.table === "interactions"
            && registration.rowId === interaction.interactionId
            && registration.column === column
            && registration.fieldVersion === fieldVersion
          ));
          assertDurable(interaction.requestHash === recovery.bodyHash && interaction.expiresAt === recovery.bodyExpiresAt);
          assertDurable(interaction.requestBody !== null
            ? interaction.requestBody.objectVersion === recovery.requestFieldVersion
            : hasHistoricalFieldVersion("request_ciphertext", recovery.requestFieldVersion));
          assertDurable(interaction.guestCapsuleHash === recovery.guestCapsuleHash);
          if (recovery.guestCapsuleFieldVersion === null) {
            assertDurable(recovery.guestCapsuleHash === null);
          } else {
            assertDurable(interaction.guestCapsule !== null
              ? interaction.guestCapsule.objectVersion === recovery.guestCapsuleFieldVersion
              : hasHistoricalFieldVersion("guest_capsule_ciphertext", recovery.guestCapsuleFieldVersion));
          }
        }
        break;
      }
      case "binding_revoked": {
        const binding = bindings.get(recovery.bindingId);
        assertDurable(binding !== undefined && binding.roomId === room.roomId && binding.version >= recovery.bindingVersion && binding.state === "revoked");
        break;
      }
      case "room_mode_set":
        assertDurable(recovery.roomId === room.roomId && room.version >= recovery.roomVersion);
        break;
      case "projection_revoked":
      case "projection_admitted":
      case "projection_unlisted":
      case "projection_delivered": {
        const projection = projections.get(recovery.projectionId);
        assertDurable(projection !== undefined && projection.roomId === room.roomId && projection.version >= recovery.projectionVersion);
        break;
      }
      case "pairing_issue": {
        const pairing = pairings.get(recovery.pairingId);
        assertDurable(pairing !== undefined && pairing.roomId === room.roomId && pairing.version >= recovery.targetVersion);
        break;
      }
      case "pairing_exchange": {
        const pairing = pairings.get(recovery.pairingId);
        const binding = bindings.get(recovery.bindingId);
        assertDurable(
          pairing !== undefined
          && binding !== undefined
          && pairing.roomId === room.roomId
          && binding.roomId === room.roomId
          && pairing.bindingId === binding.bindingId
          && binding.version >= recovery.targetVersion,
        );
        break;
      }
      case "sync": {
        const snapshot = recovery.snapshot;
        assertDurable(snapshot.roomId === room.roomId && snapshot.highWater <= room.eventHighWater);
        assertDurable(snapshot.schemaVersion === "r4_public_core_event_batch.v1"
          ? receipt.status === 200 && receipt.code === "events_synced"
          : receipt.status === 410 && receipt.code === "cursor_gone");
        const firstSequence = snapshot.schemaVersion === "r4_public_core_cursor_gone.v1"
          ? snapshot.earliestReplayableSequence
          : snapshot.afterSequence + 1;
        for (const event of snapshot.events) {
          const retained = retainedEventsBySequence.get(event.sequence);
          if (retained !== undefined) {
            assertDurable(retained.eventId === event.eventId && retained.eventHash === event.eventHash);
          }
        }
        for (const retained of image.events) {
          if (retained.sequence < firstSequence || retained.sequence > snapshot.highWater) continue;
          const snapshotEvent = snapshot.events[retained.sequence - firstSequence];
          assertDurable(
            snapshotEvent !== undefined
            && snapshotEvent.eventId === retained.eventId
            && snapshotEvent.eventHash === retained.eventHash,
          );
        }
        if (snapshot.schemaVersion === "r4_public_core_cursor_gone.v1") {
          for (const targetId of snapshot.tombstoneIds) {
            if (targetId.startsWith("proj_")) {
              const projection = projections.get(targetId);
              assertDurable(
                projection !== undefined
                && projection.roomId === room.roomId
                && projection.capsule === null
                && projection.current === false
                && ["superseded", "revoked", "expired"].includes(projection.ownerState),
              );
            } else {
              const interaction = interactions.get(targetId);
              assertDurable(
                interaction !== undefined
                && interaction.roomId === room.roomId
                && interaction.requestBody === null
                && interaction.guestCapsule === null
                && ["interaction_deleted", "interaction_expired", "origin_revoked"].includes(interaction.state),
              );
            }
          }
        }
        break;
      }
      case "ack": {
        const ack = image.acks.find((value) => value.ackId === recovery.ackId);
        const sourceEvent = retainedEvents.get(recovery.eventId);
        assertDurable(
          ack !== undefined
          && sourceEvent !== undefined
          && ack.roomId === room.roomId
          && ack.eventId === recovery.eventId
          && ack.sequence === recovery.sequence
          && ack.eventHash === recovery.eventHash,
        );
        receiptSourceAt = sourceEvent.committedAt;
        break;
      }
      default:
        recovery satisfies never;
    }
    const committedAt = durableInstant(receipt.committedAt);
    const expiresAt = durableInstant(receipt.expiresAt);
    assertDurable(committedAt <= nowMs && committedAt > nowMs - THIRTY_SEVEN_DAYS_MS && expiresAt > nowMs);
    if (receipt.recovery.kind === "sync") {
      const snapshot = receipt.recovery.snapshot;
      const exactSourceExpiry = exactSyncSourceExpiresAt(
        snapshot,
        receipt.committedAt,
        (interactionId) => interactions.get(interactionId)?.acceptedAt ?? null,
      );
      assertDurable(
        exactSourceExpiry !== null
        && receipt.expiresAt === exactSourceExpiry
        && receipt.recovery.sourceExpiresAt === exactSourceExpiry,
      );
      assertDurable(snapshot.roomId === room.roomId);
      for (const event of snapshot.events) assertDurable(durableInstant(event.committedAt) <= committedAt);
      if (snapshot.schemaVersion === "r4_public_core_cursor_gone.v1") {
        for (const targetId of snapshot.tombstoneIds) {
          const sourceAt = targetId.startsWith("interaction_")
            ? interactions.get(targetId)?.acceptedAt
            : projections.get(targetId)?.publishedAt;
          assertDurable(sourceAt !== undefined && durableInstant(sourceAt) <= committedAt);
        }
      }
    } else if (receiptSourceAt !== null) {
      const expectedExpiry = Math.min(committedAt + THIRTY_SEVEN_DAYS_MS, durableInstant(receiptSourceAt) + THIRTY_SEVEN_DAYS_MS);
      assertDurable(expiresAt === expectedExpiry);
    } else {
      assertDurable(expiresAt - committedAt === THIRTY_SEVEN_DAYS_MS);
    }
  }

  for (const ack of image.acks) {
    assertDurable(exactObjectKeys(ack, ["ackId", "bindingId", "roomId", "eventId", "sequence", "eventHash", "ackedAt"]));
    assertDurableId(ack.ackId, "ack");
    const event = retainedEvents.get(ack.eventId);
    assertDurable(bindings.has(ack.bindingId) && ack.roomId === room.roomId && event !== undefined);
    assertDurable(ack.sequence === event.sequence && ack.eventHash === event.eventHash);
    assertDurableSha(ack.eventHash);
    assertDurable(durableInstant(ack.ackedAt) > nowMs - THIRTY_SEVEN_DAYS_MS);
  }

  for (const job of image.purgeJobs) {
    assertDurable(exactObjectKeys(job, ["purgeId", "roomId", "targetKind", "targetId", "enqueuedAt", "targetBy", "completedAt"]));
    assertDurableId(job.purgeId, "purge");
    assertDurable(job.roomId === room.roomId && ["projection_body", "interaction_body", "pairing_body"].includes(job.targetKind));
    assertDurableId(job.targetId, job.targetKind === "projection_body" ? "proj" : job.targetKind === "interaction_body" ? "interaction" : "pairing");
    const enqueuedAt = durableInstant(job.enqueuedAt);
    const targetBy = durableInstant(job.targetBy);
    assertDurable(targetBy >= enqueuedAt && targetBy - enqueuedAt < DAY_MS);
    if (job.completedAt !== null) assertDurable(durableInstant(job.completedAt) >= enqueuedAt);
  }

  assertUniqueBy(image.nonceRegistrations, (value) => `${value.keyVersion}:${value.nonceBase64url}`);
  const actualFieldKeys = new Set<string>();
  const actualNonceKeys = new Set<string>();
  const allowedNonceFields = new Set(Object.entries(PUBLIC_CORE_FIELD_COLUMNS).map(([field, column]) => `${field.split(".")[0]}:${column}`));
  for (const registration of image.nonceRegistrations) {
    assertDurable(exactObjectKeys(registration, ["keyVersion", "nonceBase64url", "table", "rowId", "column", "fieldVersion"]));
    assertDurable(/^keyv_[a-f0-9]{32}$/u.test(registration.keyVersion));
    const nonce = Buffer.from(registration.nonceBase64url, "base64url");
    assertDurable(nonce.length === 12 && Buffer.from(nonce).toString("base64url") === registration.nonceBase64url);
    assertDurable(Number.isSafeInteger(registration.fieldVersion) && registration.fieldVersion >= 1);
    assertDurable(allowedNonceFields.has(`${registration.table}:${registration.column}`));
    if (registration.table === "rooms") assertDurableId(registration.rowId, "room");
    else if (registration.table === "projections") assertDurableId(registration.rowId, "proj");
    else if (registration.table === "pairing_challenges") assertDurableId(registration.rowId, "pairing");
    else if (registration.table === "interactions") assertDurableId(registration.rowId, "interaction");
    else assertDurable(false);
    const nonceKey = `${registration.keyVersion}:${registration.nonceBase64url}`;
    const fieldKey = `${registration.table}:${registration.rowId}:${registration.column}:${registration.fieldVersion}`;
    assertDurable(!actualNonceKeys.has(nonceKey) && !actualFieldKeys.has(fieldKey));
    actualNonceKeys.add(nonceKey); actualFieldKeys.add(fieldKey);
  }
  for (const key of expectedNonceKeys) assertDurable(actualNonceKeys.has(key));
  for (const key of expectedFieldKeys) assertDurable(actualFieldKeys.has(key));
}

interface BegunMutationV1 {
  readonly working: MutablePublicCoreStateV1;
  readonly replay: PublicCoreMutationReceiptV1 | null;
}

interface EventTargetV1 {
  readonly roomId: string;
  readonly targetKind: PublicCoreRoomEventV1["targetKind"];
  readonly targetId: string;
  readonly targetVersion: number;
  readonly bodyAvailable: boolean;
}

/**
 * Ephemeral construction adapter. It models the exact durable transitions and
 * transaction/fault contract without opening a database, socket, route, or
 * credential source. Production PostgreSQL implements the same named port.
 */
export class InMemoryPublicCoreStoreV1 implements PublicCoreApplicationStoreV1 {
  readonly #clock: CapturedPortMethodV1;
  readonly #nextIdPort: CapturedPortMethodV1;
  readonly #nextSecretPort: CapturedPortMethodV1;
  readonly #protectPort: CapturedPortMethodV1;
  readonly #revealPort: CapturedPortMethodV1;
  readonly #digestPort: CapturedPortMethodV1;
  readonly #matchesPort: CapturedPortMethodV1;
  readonly #faultPort: CapturedPortMethodV1 | null;
  #activeNow: string | null = null;
  #lastObservedAt: string;
  #lastObservedAtMs: number;
  #state: MutablePublicCoreStateV1;
  #tail: Promise<void> = Promise.resolve();

  constructor(input: Readonly<{
    installationId: string;
    entityId: string;
    now: () => Date;
    ids: PublicCoreIdSourceV1;
    protector: PublicCoreBodyProtectorV1;
    fault?: PublicCoreFaultInjectorV1;
    lastSuccessfulPurgeAt?: string;
  }>) {
    const installationId = ownDataProperty(input, "installationId", "public_core_store_configuration_invalid");
    const entityId = ownDataProperty(input, "entityId", "public_core_store_configuration_invalid");
    const clock = ownDataProperty(input, "now", "public_core_store_configuration_invalid");
    const ids = ownDataProperty(input, "ids", "public_core_store_configuration_invalid");
    const protector = ownDataProperty(input, "protector", "public_core_store_configuration_invalid");
    const fault = ownDataProperty(input, "fault", "public_core_store_configuration_invalid", true);
    const lastSuccessfulPurgeAt = ownDataProperty(input, "lastSuccessfulPurgeAt", "public_core_store_configuration_invalid", true);
    if (typeof installationId !== "string" || !/^install_[A-Za-z0-9_-]{16,128}$/u.test(installationId)) {
      fail(503, "public_core_store_configuration_invalid");
    }
    if (typeof entityId !== "string" || !/^entity_[A-Za-z0-9_-]{16,128}$/u.test(entityId)) {
      fail(503, "public_core_store_configuration_invalid");
    }
    if (typeof clock !== "function") fail(503, "public_core_store_configuration_invalid");
    this.#clock = Object.freeze({ receiver: undefined, method: clock as (...args: readonly unknown[]) => unknown });
    this.#nextIdPort = capturePortMethod(ids, "nextId", "public_core_id_port_invalid");
    this.#nextSecretPort = capturePortMethod(ids, "nextSecret", "public_core_id_port_invalid");
    this.#protectPort = capturePortMethod(protector, "protect", "public_core_protector_port_invalid");
    this.#revealPort = capturePortMethod(protector, "reveal", "public_core_protector_port_invalid");
    this.#digestPort = capturePortMethod(protector, "digest", "public_core_protector_port_invalid");
    this.#matchesPort = capturePortMethod(protector, "matches", "public_core_protector_port_invalid");
    this.#faultPort = fault === undefined || fault === null
      ? null
      : capturePortMethod(fault, "reach", "public_core_fault_port_invalid");
    const sampled = this.#sampleClock();
    this.#lastObservedAt = sampled.instant;
    this.#lastObservedAtMs = sampled.milliseconds;
    const now = sampled.instant;
    if (lastSuccessfulPurgeAt !== undefined && (
      typeof lastSuccessfulPurgeAt !== "string"
      || !Number.isFinite(Date.parse(lastSuccessfulPurgeAt))
      || new Date(Date.parse(lastSuccessfulPurgeAt)).toISOString() !== lastSuccessfulPurgeAt
      || Date.parse(lastSuccessfulPurgeAt) > sampled.milliseconds
    )) fail(503, "public_core_store_configuration_invalid");
    this.#state = {
      installation: { installationId, entityId },
      room: null,
      projections: new Map(),
      pairings: new Map(),
      bindings: new Map(),
      encounters: new Map(),
      interactions: new Map(),
      rateEvents: [],
      events: [],
      nonceRegistrations: new Map(),
      receiptReservations: new Map(),
      receipts: new Map(),
      acks: new Map(),
      purgeJobs: new Map(),
      retentionHealth: {
        lastSuccessfulPurgeAt: lastSuccessfulPurgeAt ?? now,
        lastBoundedRunAt: lastSuccessfulPurgeAt ?? now,
      },
    };
    PUBLIC_CORE_TEST_MAINTENANCE.set(this, this.#createTestMaintenance());
  }

  static async reopen(input: Readonly<{
    image: PublicCoreDurableStoreImageV1;
    now: () => Date;
    ids: PublicCoreIdSourceV1;
    protector: PublicCoreBodyProtectorV1;
    fault?: PublicCoreFaultInjectorV1;
  }>): Promise<InMemoryPublicCoreStoreV1> {
    const image = ownedPlainSnapshot(
      ownDataProperty(input, "image", "durable_image_input_invalid"),
      "durable_image_input_invalid",
    ) as PublicCoreDurableStoreImageV1;
    const now = ownDataProperty(input, "now", "public_core_store_configuration_invalid");
    const ids = ownDataProperty(input, "ids", "public_core_store_configuration_invalid");
    const protector = ownDataProperty(input, "protector", "public_core_store_configuration_invalid");
    const fault = ownDataProperty(input, "fault", "public_core_store_configuration_invalid", true);
    const { imageHash, ...preimage } = image;
    if (image.schemaVersion !== "r4_public_core_durable_store_image.v1" || canonicalSha256(preimage) !== imageHash) {
      fail(503, "durable_image_hash_mismatch");
    }
    try {
      assertDurableImageInvariants(image);
    } catch (error) {
      const details = authenticPublicCoreStoreErrorDetails(error);
      if (details?.code === "durable_image_invariant_invalid") fail(details.status, details.code);
      fail(503, "durable_image_invariant_invalid");
    }
    const store = new InMemoryPublicCoreStoreV1({
      installationId: image.installation.installationId,
      entityId: image.installation.entityId,
      now: now as () => Date,
      ids: ids as PublicCoreIdSourceV1,
      protector: protector as PublicCoreBodyProtectorV1,
      ...(fault ? { fault: fault as PublicCoreFaultInjectorV1 } : {}),
      lastSuccessfulPurgeAt: image.retentionHealth.lastSuccessfulPurgeAt,
    });
    const reopenAt = store.#lastObservedAt;
    if (Date.parse(reopenAt) < Date.parse(image.checkpointAt)) fail(503, "durable_image_reopen_time_invalid");
    const nonceRegistrations = new Map<string, PublicCoreNonceRegistrationV1>();
    for (const encoded of image.nonceRegistrations) {
      const nonce = Uint8Array.from(Buffer.from(encoded.nonceBase64url, "base64url"));
      if (Buffer.from(nonce).toString("base64url") !== encoded.nonceBase64url) fail(503, "durable_image_nonce_invalid");
      const registration: PublicCoreNonceRegistrationV1 = {
        keyVersion: encoded.keyVersion,
        nonce,
        table: encoded.table,
        rowId: encoded.rowId,
        column: encoded.column,
        fieldVersion: encoded.fieldVersion,
      };
      const key = `${registration.keyVersion}:${encoded.nonceBase64url}`;
      if (nonceRegistrations.has(key)) fail(503, "durable_image_nonce_duplicate");
      nonceRegistrations.set(key, registration);
    }
    const restored: MutablePublicCoreStateV1 = {
      installation: clone(image.installation),
      room: clone(image.room),
      projections: new Map(image.projections.map((value) => [value.projectionId, clone(value)])),
      pairings: new Map(image.pairings.map((value) => [value.pairingId, clone(value)])),
      bindings: new Map(image.bindings.map((value) => [value.bindingId, clone(value)])),
      encounters: new Map(image.encounters.map((value) => [value.encounterId, clone(value)])),
      interactions: new Map(image.interactions.map((value) => [value.interactionId, clone(value)])),
      rateEvents: image.rateEvents.map((value) => clone(value)),
      events: image.events.map((value) => clone(value)),
      nonceRegistrations,
      receiptReservations: new Map(),
      receipts: new Map(image.receipts.map((value) => [
        `${value.actorScopeDigest}\u0000${value.action}\u0000${value.idempotencyKey}`,
        clone(value),
      ])),
      acks: new Map(image.acks.map((value) => [`${value.bindingId}\u0000${value.eventId}`, clone(value)])),
      purgeJobs: new Map(image.purgeJobs.map((value) => [value.purgeId, clone(value)])),
      retentionHealth: clone(image.retentionHealth),
    };
    await store.#assertRestoredCiphertexts(restored);
    store.#applyDueRetentionTransitions(restored, reopenAt);
    restored.retentionHealth = { ...restored.retentionHealth, lastBoundedRunAt: reopenAt };
    store.#state = restored;
    return store;
  }

  async #assertRestoredCiphertexts(state: MutablePublicCoreStateV1): Promise<void> {
    const room = state.room;
    if (room === null) return;
    const reveal = async (
      table: "rooms" | "projections" | "pairing_challenges" | "interactions",
      column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule",
      rowId: string,
      value: PublicCoreProtectedValueV1,
    ): Promise<string> => await this.#reveal({
      table,
      column,
      roomId: room.roomId,
      rowId,
      objectVersion: value.objectVersion,
      protectedValue: value,
    });
    try {
      const label = await reveal("rooms", "label", room.roomId, room.label);
      assertDurable(label.length > 0 && Buffer.byteLength(label, "utf8") <= PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS["rooms.label"]);

      for (const projection of state.projections.values()) {
        if (projection.capsule === null) continue;
        const capsule = validateProjectionCapsuleV1(JSON.parse(await reveal(
          "projections", "capsule", projection.projectionId, projection.capsule,
        )));
        assertDurable(
          capsule.projectionId === projection.projectionId
          && capsule.roomId === projection.roomId
          && capsule.entityId === projection.entityId
          && capsule.payloadHash === projection.payloadHash
          && capsule.publishedAt === projection.publishedAt
          && capsule.freshUntil === projection.freshUntil
          && capsule.expiresAt === projection.expiresAt,
        );
      }

      for (const pairing of state.pairings.values()) {
        if (pairing.pairingCode !== null) {
          const code = await reveal("pairing_challenges", "pairing_code", pairing.pairingId, pairing.pairingCode);
          assertDurable(this.#matches("pairing_code", code, pairing.pairingCodeDigest));
        }
        if (pairing.exchangeEnvelope !== null) {
          const value: unknown = JSON.parse(await reveal(
            "pairing_challenges", "exchange_envelope", pairing.pairingId, pairing.exchangeEnvelope,
          ));
          assertDurable(exactObjectKeys(value, [
            "schemaVersion", "bindingId", "roomId", "bindingSecret", "clientPublicKey", "expiresAt",
          ]));
          const binding = typeof value.bindingId === "string" ? state.bindings.get(value.bindingId) : undefined;
          assertDurable(
            value.schemaVersion === "r4_public_core_binding_exchange.v1"
            && binding !== undefined
            && pairing.bindingId === binding.bindingId
            && value.bindingId === binding.bindingId
            && value.roomId === room.roomId
            && value.expiresAt === binding.expiresAt
            && typeof value.bindingSecret === "string"
            && this.#matches("binding_secret", value.bindingSecret, binding.secretDigest)
            && typeof value.clientPublicKey === "string"
            && value.clientPublicKey.length > 0,
          );
        }
      }

      for (const interaction of state.interactions.values()) {
        assertDurable(interaction.consentHash === canonicalSha256({ consent: interaction.consent }));
        const projection = state.projections.get(interaction.projectionId);
        assertDurable(projection !== undefined && interaction.originProjectionHash === projection.payloadHash);
        if (interaction.requestBody === null) continue;
        const requestBody = await reveal("interactions", "request_body", interaction.interactionId, interaction.requestBody);
        assertDurable(canonicalSha256(requestBody) === interaction.requestHash);
        if (interaction.guestCapsule === null) {
          assertDurable(interaction.guestCapsuleHash === null);
          continue;
        }
        const guestPlaintext = await reveal("interactions", "guest_capsule", interaction.interactionId, interaction.guestCapsule);
        assertDurable(interaction.guestCapsuleHash !== null && canonicalSha256(guestPlaintext) === interaction.guestCapsuleHash);
        validateGuestCapsuleV1(JSON.parse(guestPlaintext));
      }
    } catch {
      fail(503, "durable_image_ciphertext_invalid");
    }
  }

  async exportDurableImage(): Promise<PublicCoreDurableStoreImageV1> {
    return await this.#serialized(async () => {
      const state = clone(this.#state);
      const checkpointAt = this.#now();
      // Export is non-mutating, but the durable image itself may never carry
      // bytes beyond an approved ceiling. Apply the same closed janitor
      // transitions only to this detached image.
      this.#applyDueRetentionTransitions(state, checkpointAt);
      const preimage = {
        schemaVersion: "r4_public_core_durable_store_image.v1" as const,
        checkpointAt,
        installation: state.installation,
        room: state.room,
        projections: [...state.projections.values()],
        pairings: [...state.pairings.values()],
        bindings: [...state.bindings.values()],
        encounters: [...state.encounters.values()],
        interactions: [...state.interactions.values()],
        rateEvents: state.rateEvents,
        events: state.events,
        nonceRegistrations: [...state.nonceRegistrations.values()].map((value) => ({
          keyVersion: value.keyVersion,
          nonceBase64url: Buffer.from(value.nonce).toString("base64url"),
          table: value.table,
          rowId: value.rowId,
          column: value.column,
          fieldVersion: value.fieldVersion,
        })),
        receipts: [...state.receipts.values()],
        acks: [...state.acks.values()],
        purgeJobs: [...state.purgeJobs.values()],
        retentionHealth: state.retentionHealth,
      };
      return deepFreezeOwned(ownedPlainSnapshot(
        { ...preimage, imageHash: canonicalSha256(preimage) },
        "durable_image_export_invalid",
      ) as unknown as PublicCoreDurableStoreImageV1);
    });
  }

  snapshot(): PublicCoreStoreSnapshotV1 {
    const state = clone(this.#state);
    return deepFreezeOwned(ownedPlainSnapshot({
      room: state.room,
      projections: Object.freeze([...state.projections.values()]),
      pairings: Object.freeze([...state.pairings.values()]),
      bindings: Object.freeze([...state.bindings.values()]),
      encounters: Object.freeze([...state.encounters.values()]),
      interactions: Object.freeze([...state.interactions.values()]),
      events: Object.freeze(state.events),
      receipts: Object.freeze([...state.receipts.values()]),
      purgeJobs: Object.freeze([...state.purgeJobs.values()]),
      retentionHealth: state.retentionHealth,
    }, "public_core_snapshot_invalid") as unknown as PublicCoreStoreSnapshotV1);
  }

  #createTestMaintenance(): PublicCoreTestMaintenanceV1 {
    return Object.freeze({
      recordSuccessfulPurge: async (at?: string): Promise<void> => {
        await this.#serialized(async () => {
          const operationNow = this.#now();
          const next = at ?? operationNow;
          const nextMs = Date.parse(next);
          if (
            !Number.isFinite(nextMs)
            || new Date(nextMs).toISOString() !== next
            || nextMs > Date.parse(operationNow)
            || nextMs < Date.parse(this.#state.retentionHealth.lastSuccessfulPurgeAt)
          ) fail(400, "invalid_retention_watermark");
          const working = clone(this.#state);
          working.retentionHealth = { lastSuccessfulPurgeAt: next, lastBoundedRunAt: operationNow };
          this.#state = working;
        });
      },
      compactBodyFreeEvents: async (retainFromSequence: number): Promise<void> => {
        await this.#serialized(async () => {
          const room = this.#state.room;
          if (!room || !Number.isSafeInteger(retainFromSequence) || retainFromSequence < 1) fail(400, "invalid_event_floor");
          this.#state = {
            ...this.#state,
            room: { ...room, eventFloor: Math.min(retainFromSequence, room.eventHighWater + 1) },
            events: this.#state.events.filter((event) => event.sequence >= retainFromSequence),
          };
        });
      },
      runRetentionTransitions: async (): Promise<PublicCoreRetentionTransitionResultV1> => await this.#serialized(async () => {
        const working = clone(this.#state);
        await this.#reach("retention.janitor", "after_locks_and_rechecks");
        const result = this.#applyDueRetentionTransitions(working);
        working.retentionHealth = { ...working.retentionHealth, lastBoundedRunAt: this.#now() };
        await this.#reach("retention.janitor", "after_domain_write_before_room_event");
        this.#state = working;
        return result;
      }),
    });
  }

  async #serialized<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release = (): void => undefined;
    this.#tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const sampled = this.#sampleClock();
      if (sampled.milliseconds < this.#lastObservedAtMs) fail(503, "public_core_clock_regressed");
      this.#lastObservedAt = sampled.instant;
      this.#lastObservedAtMs = sampled.milliseconds;
      this.#activeNow = sampled.instant;
      try {
        return await work();
      } catch (error) {
        const details = authenticPublicCoreStoreErrorDetails(error);
        if (details) fail(details.status, details.code);
        if (error instanceof PublicCorePolicyError) {
          const status = error.code === "R4_PUBLIC_CORE_INTAKE_CLOSED" ? 409 : 403;
          fail(status, error.code);
        }
        if (error instanceof PublicCoreRetentionError) fail(error.statusCode, error.code);
        fail(503, "public_core_store_operation_failed");
      } finally {
        this.#activeNow = null;
      }
    } finally {
      release();
    }
  }

  #sampleClock(): Readonly<{ instant: string; milliseconds: number }> {
    try {
      const value = invokeCaptured(this.#clock, []);
      if (value === null || typeof value !== "object") fail(503, "public_core_clock_invalid");
      const milliseconds = Date.prototype.getTime.call(value);
      if (!Number.isSafeInteger(milliseconds)) fail(503, "public_core_clock_invalid");
      return Object.freeze({ instant: new Date(milliseconds).toISOString(), milliseconds });
    } catch (error) {
      const details = authenticPublicCoreStoreErrorDetails(error);
      if (details?.code === "public_core_clock_invalid") fail(details.status, details.code);
      fail(503, "public_core_clock_unavailable");
    }
  }

  #now(): string {
    if (this.#activeNow === null) fail(503, "public_core_clock_context_missing");
    return this.#activeNow;
  }

  async #reach(action: PublicCoreFaultActionV1, point: PublicCoreFaultPointV1): Promise<void> {
    if (this.#faultPort === null) return;
    let outcome: unknown;
    try {
      outcome = await invokeCaptured(this.#faultPort, [action, point]);
    } catch {
      fail(503, "public_core_fault_port_unavailable");
    }
    if (outcome === "inject_fault") fail(503, "R4_PUBLIC_CORE_INJECTED_FAULT");
    if (outcome !== "continue") fail(503, "public_core_fault_port_invalid");
  }

  #idExists(state: MutablePublicCoreStateV1, value: string): boolean {
    return state.room?.roomId === value
      || state.projections.has(value)
      || state.pairings.has(value)
      || state.bindings.has(value)
      || state.encounters.has(value)
      || state.interactions.has(value)
      || state.events.some((event) => event.eventId === value)
      || [...state.receipts.values()].some((receipt) => receipt.receiptId === value)
      || [...state.acks.values()].some((ack) => ack.ackId === value)
      || state.purgeJobs.has(value);
  }

  #nextId(
    state: MutablePublicCoreStateV1,
    prefix: "room" | "projection" | "pairing" | "binding" | "encounter" | "interaction" | "event" | "receipt" | "purge" | "ack",
  ): string {
    let value: unknown;
    try {
      value = invokeCaptured(this.#nextIdPort, [prefix]);
    } catch {
      fail(503, "public_core_id_port_unavailable");
    }
    if (typeof value !== "string" || !new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value)) {
      fail(503, "public_core_id_port_invalid");
    }
    if (this.#idExists(state, value)) fail(503, "public_core_id_duplicate");
    return value;
  }

  #nextSecret(kind: "pairing_code" | "binding_secret"): string {
    let value: unknown;
    try {
      value = invokeCaptured(this.#nextSecretPort, [kind]);
    } catch {
      fail(503, "public_core_id_port_unavailable");
    }
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{16,4096}$/u.test(value)) {
      fail(503, "public_core_secret_port_invalid");
    }
    return value;
  }

  #digest(domain: PublicCoreSecretDomainV1, value: string): PublicCoreKeyedDigestV1 {
    let raw: unknown;
    try {
      raw = invokeCaptured(this.#digestPort, [domain, value]);
    } catch {
      fail(503, "public_core_digest_port_unavailable");
    }
    let digest: PublicCoreKeyedDigestV1;
    try {
      digest = ownedPlainSnapshot(raw, "public_core_digest_port_invalid") as PublicCoreKeyedDigestV1;
      assertDurableDigest(digest);
    } catch {
      fail(503, "public_core_digest_port_invalid");
    }
    return deepFreezeOwned(digest);
  }

  #matches(domain: PublicCoreSecretDomainV1, value: string, digest: PublicCoreKeyedDigestV1): boolean {
    let ownedDigest: PublicCoreKeyedDigestV1;
    try {
      ownedDigest = ownedPlainSnapshot(digest, "public_core_digest_port_invalid") as PublicCoreKeyedDigestV1;
      assertDurableDigest(ownedDigest);
    } catch {
      fail(503, "public_core_digest_port_invalid");
    }
    let result: unknown;
    try {
      result = invokeCaptured(this.#matchesPort, [domain, value, deepFreezeOwned(ownedDigest)]);
    } catch {
      fail(503, "public_core_matches_port_unavailable");
    }
    if (result !== true && result !== false) fail(503, "public_core_matches_port_invalid");
    return result;
  }

  #nonceAuthority(
    state: MutablePublicCoreStateV1,
    expected: Readonly<{
      table: PublicCoreFieldAadV1["table"];
      column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
      rowId: string;
      objectVersion: number;
    }>,
  ): Readonly<{ authority: PublicCoreNonceAuthorityV1; registration(): PublicCoreNonceRegistrationV1 | null }> {
    let registered: PublicCoreNonceRegistrationV1 | null = null;
    const expectedColumn = PUBLIC_CORE_FIELD_COLUMNS[`${expected.table}.${expected.column}`];
    if (!expectedColumn) fail(503, "public_core_nonce_registration_invalid");
    const authority: PublicCoreNonceAuthorityV1 = Object.freeze({
      reserve: (raw: PublicCoreNonceRegistrationV1): void => {
        if (registered !== null) fail(503, "public_core_nonce_registration_invalid");
        let registration: PublicCoreNonceRegistrationV1;
        try {
          registration = ownedPlainSnapshot(raw, "public_core_nonce_registration_invalid") as PublicCoreNonceRegistrationV1;
          if (!exactObjectKeys(registration, ["keyVersion", "nonce", "table", "rowId", "column", "fieldVersion"])) {
            fail(503, "public_core_nonce_registration_invalid");
          }
          if (
            !/^keyv_[a-f0-9]{32}$/u.test(registration.keyVersion)
            || !(registration.nonce instanceof Uint8Array)
            || registration.nonce.byteLength !== 12
            || registration.table !== expected.table
            || registration.rowId !== expected.rowId
            || registration.column !== expectedColumn
            || registration.fieldVersion !== expected.objectVersion
          ) fail(503, "public_core_nonce_registration_invalid");
        } catch (error) {
          const details = authenticPublicCoreStoreErrorDetails(error);
          if (details?.code === "public_core_nonce_registration_invalid") fail(details.status, details.code);
          fail(503, "public_core_nonce_registration_invalid");
        }
        const nonceKey = `${registration.keyVersion}:${Buffer.from(registration.nonce).toString("base64url")}`;
        const fieldKey = `${registration.table}:${registration.rowId}:${registration.column}:${registration.fieldVersion}`;
        if (state.nonceRegistrations.has(nonceKey)) fail(503, "encryption_nonce_reused");
        for (const existing of state.nonceRegistrations.values()) {
          const existingField = `${existing.table}:${existing.rowId}:${existing.column}:${existing.fieldVersion}`;
          if (existingField === fieldKey) fail(503, "encryption_field_version_reused");
        }
        registered = deepFreezeOwned(registration);
        state.nonceRegistrations.set(nonceKey, registration);
      },
    });
    return Object.freeze({ authority, registration: (): PublicCoreNonceRegistrationV1 | null => registered });
  }

  async #protect(
    state: MutablePublicCoreStateV1,
    input: Readonly<{
      table: "rooms" | "projections" | "pairing_challenges" | "interactions";
      column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
      roomId: string;
      rowId: string;
      objectVersion: number;
      plaintext: string;
    }>,
  ): Promise<PublicCoreProtectedValueV1> {
    const ownedInput = deepFreezeOwned(ownedPlainSnapshot(input, "public_core_protector_input_invalid") as typeof input);
    if (Buffer.byteLength(ownedInput.plaintext, "utf8") > publicCorePlaintextByteCeiling(ownedInput.table, ownedInput.column)) {
      fail(400, "public_core_plaintext_too_large");
    }
    const tracker = this.#nonceAuthority(state, ownedInput);
    let raw: unknown;
    try {
      raw = await invokeCaptured(this.#protectPort, [{ ...ownedInput, nonceAuthority: tracker.authority }]);
    } catch (error) {
      const details = authenticPublicCoreStoreErrorDetails(error);
      if (details) fail(details.status, details.code);
      fail(503, "public_core_protector_port_unavailable");
    }
    let value: PublicCoreProtectedValueV1;
    try {
      value = ownedPlainSnapshot(raw, "public_core_protector_result_invalid") as PublicCoreProtectedValueV1;
      const binding = assertDurableProtectedValue(value, ownedInput);
      if (value.objectVersion !== ownedInput.objectVersion || value.plaintextHash !== plaintextSha256(ownedInput.plaintext)) {
        fail(503, "public_core_protector_result_invalid");
      }
      const registration = tracker.registration();
      if (registration === null) fail(503, "public_core_nonce_registration_missing");
      const nonceKey = `${registration.keyVersion}:${Buffer.from(registration.nonce).toString("base64url")}`;
      if (binding.nonceKey !== nonceKey) fail(503, "public_core_nonce_registration_invalid");
    } catch (error) {
      const details = authenticPublicCoreStoreErrorDetails(error);
      if (details && details.code.startsWith("public_core_")) fail(details.status, details.code);
      fail(503, "public_core_protector_result_invalid");
    }
    return deepFreezeOwned(value);
  }

  async #reveal(input: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label" | "capsule" | "pairing_code" | "exchange_envelope" | "request_body" | "guest_capsule";
    roomId: string;
    rowId: string;
    objectVersion: number;
    protectedValue: PublicCoreProtectedValueV1;
  }>): Promise<string> {
    const ownedInput = deepFreezeOwned(ownedPlainSnapshot(input, "public_core_reveal_input_invalid") as typeof input);
    try {
      assertDurableProtectedValue(ownedInput.protectedValue, ownedInput);
      if (ownedInput.protectedValue.objectVersion !== ownedInput.objectVersion) fail(503, "public_core_reveal_input_invalid");
    } catch (error) {
      const details = authenticPublicCoreStoreErrorDetails(error);
      if (details?.code === "public_core_reveal_input_invalid") fail(details.status, details.code);
      fail(503, "public_core_reveal_input_invalid");
    }
    let plaintext: unknown;
    try {
      plaintext = await invokeCaptured(this.#revealPort, [ownedInput]);
    } catch {
      fail(503, "public_core_reveal_port_unavailable");
    }
    if (
      typeof plaintext !== "string"
      || Buffer.byteLength(plaintext, "utf8") > publicCorePlaintextByteCeiling(ownedInput.table, ownedInput.column)
      || plaintextSha256(plaintext) !== ownedInput.protectedValue.plaintextHash
    ) {
      fail(503, "public_core_reveal_result_invalid");
    }
    return plaintext;
  }

  #retentionIncident(state: MutablePublicCoreStateV1): boolean {
    return Date.parse(this.#now()) - Date.parse(state.retentionHealth.lastSuccessfulPurgeAt) > 36 * HOUR_MS;
  }

  #applyDueRetentionTransitions(
    state: MutablePublicCoreStateV1,
    now = this.#now(),
  ): PublicCoreRetentionTransitionResultV1 {
    const nowMs = Date.parse(now);
    let projectionsTerminalized = 0;
    let pairingsTerminalized = 0;
    let encountersExpired = 0;
    let interactionsTerminalized = 0;
    let interactionTombstonesPruned = 0;

    for (const projection of state.projections.values()) {
      const lifecycle = projection.ownerState === "revoked"
        ? "revoked"
        : projection.ownerState === "superseded"
          ? "superseded"
          : "current";
      const decision = resolvePublicCoreProjectionRetention({
        publicationAt: projection.publishedAt,
        hardExpiresAt: projection.expiresAt,
        now,
        lifecycle,
        admission: projection.curationState,
        freshness: projection.ownerState === "stale" || Date.parse(projection.freshUntil) <= nowMs ? "stale" : "fresh",
      });
      if (decision.bodyReadable) continue;

      const ownerState: PublicCoreProjectionRecordV1["ownerState"] = decision.reason === "hard_expired" || decision.reason === "retention_expired"
        ? "expired"
        : projection.ownerState;
      const requiresTransition = projection.capsule !== null || projection.current || projection.ownerState !== ownerState;
      if (requiresTransition) {
        state.projections.set(projection.projectionId, {
          ...projection,
          capsule: null,
          current: false,
          ownerState,
          version: projection.version + 1,
        });
        projectionsTerminalized += 1;
      }
      if (state.room?.currentProjectionId === projection.projectionId) {
        state.room = { ...state.room, currentProjectionId: null, version: state.room.version + 1 };
      }
      if (decision.enqueuePurge) this.#enqueuePurge(state, projection.roomId, "projection_body", projection.projectionId, now);
    }

    for (const pairing of state.pairings.values()) {
      if (Date.parse(pairing.expiresAt) > nowMs) continue;
      if (pairing.state !== "expired" || pairing.pairingCode !== null || pairing.exchangeEnvelope !== null) {
        state.pairings.set(pairing.pairingId, {
          ...pairing,
          pairingCode: null,
          exchangeEnvelope: null,
          state: "expired",
          version: pairing.version + 1,
        });
        pairingsTerminalized += 1;
      }
      this.#enqueuePurge(state, pairing.roomId, "pairing_body", pairing.pairingId, now);
    }

    for (const encounter of [...state.encounters.values()]) {
      if (Date.parse(encounter.expiresAt) <= nowMs) {
        state.encounters.delete(encounter.encounterId);
        encountersExpired += 1;
      }
    }

    for (const interaction of [...state.interactions.values()]) {
      if (Date.parse(interaction.acceptedAt) + THIRTY_SEVEN_DAYS_MS <= nowMs) {
        state.interactions.delete(interaction.interactionId);
        interactionTombstonesPruned += 1;
        continue;
      }
      const expired = Date.parse(interaction.expiresAt) <= nowMs;
      const terminal = interaction.state === "interaction_deleted" || interaction.state === "origin_revoked" || interaction.state === "interaction_expired";
      if (!expired && !terminal) continue;
      const stateAfter: PublicCoreInteractionRecordV1["state"] = terminal ? interaction.state : "interaction_expired";
      if (interaction.requestBody !== null || interaction.guestCapsule !== null || interaction.state !== stateAfter) {
        state.interactions.set(interaction.interactionId, {
          ...interaction,
          requestBody: null,
          guestCapsule: null,
          state: stateAfter,
          version: interaction.version + 1,
        });
        interactionsTerminalized += 1;
      }
      this.#enqueuePurge(state, interaction.roomId, "interaction_body", interaction.interactionId, now);
    }

    const rateEventCount = state.rateEvents.length;
    state.rateEvents = state.rateEvents.filter((event) => Date.parse(event.occurredAt) > nowMs - 25 * HOUR_MS);
    const roomEventCount = state.events.length;
    state.events = state.events.filter((event) => Date.parse(event.committedAt) > nowMs - THIRTY_SEVEN_DAYS_MS);
    if (state.room && state.events.length !== roomEventCount) {
      const earliestRetained = state.events[0]?.sequence ?? state.room.eventHighWater + 1;
      state.room = { ...state.room, eventFloor: Math.max(state.room.eventFloor, earliestRetained) };
    }
    const receiptCount = state.receipts.size;
    for (const [key, receipt] of state.receipts) {
      if (Date.parse(receipt.expiresAt) <= nowMs || Date.parse(receipt.committedAt) <= nowMs - THIRTY_SEVEN_DAYS_MS) {
        state.receipts.delete(key);
      }
    }
    const ackCount = state.acks.size;
    const retainedEventIds = new Set(state.events.map((event) => event.eventId));
    for (const [key, ack] of state.acks) {
      if (Date.parse(ack.ackedAt) <= nowMs - THIRTY_SEVEN_DAYS_MS || !retainedEventIds.has(ack.eventId)) state.acks.delete(key);
    }
    return Object.freeze({
      schemaVersion: "r4_public_core_retention_transition.v1",
      projectionsTerminalized,
      pairingsTerminalized,
      encountersExpired,
      interactionsTerminalized,
      interactionTombstonesPruned,
      rateEventsPruned: rateEventCount - state.rateEvents.length,
      roomEventsPruned: roomEventCount - state.events.length,
      receiptsPruned: receiptCount - state.receipts.size,
      acksPruned: ackCount - state.acks.size,
      bodyFree: true,
    });
  }

  #assertRetentionAdmission(
    state: MutablePublicCoreStateV1,
    context: PublicCoreMutationContextV1,
    replay: PublicCoreMutationReceiptV1 | null,
    modeTransition: Readonly<{ from: PublicCoreRoomMode; to: PublicCoreRoomMode }> | null = null,
  ): void {
    const effectiveModeTransition = context.action === "room.mode.set"
      && replay?.recovery.kind === "room_mode_set"
      && modeTransition?.to === "closed"
      ? { from: "public_single" as const, to: "closed" as const }
      : modeTransition;
    assertPublicCoreMutationAllowedByRetention({
      action: context.action,
      now: this.#now(),
      health: {
        schemaVersion: "r4_public_core_retention_health.v1",
        lastSuccessfulPurgeAt: state.retentionHealth.lastSuccessfulPurgeAt,
      },
      ...(effectiveModeTransition ? { roomModeTransition: effectiveModeTransition } : {}),
      ...(context.action === "room_operator.pull" ? {
        pullReplay: {
          committedReceipt: replay?.recovery.kind === "pull" || replay?.recovery.kind === "pull_terminal",
          sameKeyAndHash: replay?.requestHash === context.canonicalRequestHash,
        },
      } : {}),
    });
  }

  async #begin(
    expectedAction: PublicCoreActionName,
    context: PublicCoreMutationContextV1,
    modeTransition: Readonly<{ from: PublicCoreRoomMode; to: PublicCoreRoomMode }> | null = null,
  ): Promise<BegunMutationV1> {
    if (context.action !== expectedAction) fail(400, "action_context_mismatch");
    if (!PUBLIC_CORE_IDEMPOTENCY_KEY.test(context.idempotencyKey)) fail(400, "idempotency_key_invalid");
    await this.#reach(expectedAction, "before_idempotency_reservation");
    const working = clone(this.#state);
    const key = receiptKey(context);
    let replay = working.receipts.get(key) ?? null;
    if (replay && Date.parse(replay.expiresAt) <= Date.parse(this.#now())) {
      working.receipts.delete(key);
      replay = null;
    }
    if (replay && replay.requestHash !== context.canonicalRequestHash) fail(409, "idempotency_conflict");
    if (replay) {
      this.#assertRetentionAdmission(working, context, replay, modeTransition);
      this.#applyDueRetentionTransitions(working);
      return { working, replay };
    }
    const reservedHash = working.receiptReservations.get(key);
    if (reservedHash && reservedHash !== context.canonicalRequestHash) fail(409, "idempotency_conflict");
    working.receiptReservations.set(key, context.canonicalRequestHash);
    this.#assertRetentionAdmission(working, context, null, modeTransition);
    this.#applyDueRetentionTransitions(working);
    return { working, replay: null };
  }

  #room(state: MutablePublicCoreStateV1, roomId: string): PublicCoreRoomRecordV1 {
    const room = state.room;
    if (!room || room.roomId !== roomId) fail(404, "not_found");
    return room;
  }

  #projection(state: MutablePublicCoreStateV1, projectionId: string): PublicCoreProjectionRecordV1 {
    const projection = state.projections.get(projectionId);
    if (!projection) fail(404, "not_found");
    return projection;
  }

  #interaction(state: MutablePublicCoreStateV1, interactionId: string): PublicCoreInteractionRecordV1 {
    const interaction = state.interactions.get(interactionId);
    if (!interaction) fail(404, "not_found");
    return interaction;
  }

  #encounterBySecret(state: MutablePublicCoreStateV1, secret: string | null): PublicCoreEncounterRecordV1 {
    if (!secret) fail(404, "not_found");
    let found: PublicCoreEncounterRecordV1 | null = null;
    for (const encounter of state.encounters.values()) {
      if (this.#matches("encounter_secret", secret, encounter.secretDigest)) found = encounter;
    }
    if (!found) fail(404, "not_found");
    return found;
  }

  #bindingBySecret(state: MutablePublicCoreStateV1, secret: string | null): PublicCoreBindingRecordV1 {
    if (!secret) fail(404, "not_found");
    let found: PublicCoreBindingRecordV1 | null = null;
    for (const binding of state.bindings.values()) {
      if (this.#matches("binding_secret", secret, binding.secretDigest)) found = binding;
    }
    if (!found || found.state !== "current" || Date.parse(found.expiresAt) <= Date.parse(this.#now())) fail(404, "not_found");
    return found;
  }

  #assertOperator(state: MutablePublicCoreStateV1, context: PublicCoreMutationContextV1, roomId: string): PublicCoreBindingRecordV1 {
    const binding = this.#bindingBySecret(state, context.authorizationSecret);
    if (binding.roomId !== roomId) fail(404, "not_found");
    const room = this.#room(state, roomId);
    assertPublicCoreRoomScopeForAction(context.action, {
      roomKind: room.roomKind,
      interactionMode: room.interactionMode,
      capabilityKind: "room_operator",
    });
    return binding;
  }

  #assertExpected(context: PublicCoreMutationContextV1, actual: number): void {
    if (context.expectedVersion !== null && context.expectedVersion !== actual) fail(409, "expected_version_conflict");
  }

  #appendEvent(state: MutablePublicCoreStateV1, context: PublicCoreMutationContextV1, target: EventTargetV1 | null): void {
    if (!target) return;
    const expectedTarget = PUBLIC_CORE_ROOM_EVENT_CONTRACT[context.action];
    if (
      expectedTarget === undefined
      || target.targetKind !== expectedTarget.targetKind
      || target.bodyAvailable !== expectedTarget.bodyAvailable
      || !new RegExp(`^${expectedTarget.targetIdPrefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(target.targetId)
    ) fail(503, "public_core_room_event_target_invalid");
    const room = this.#room(state, target.roomId);
    const sequence = room.eventHighWater + 1;
    const preimage = {
      schemaVersion: "r4_public_core_room_event.v1" as const,
      eventId: this.#nextId(state, "event"),
      roomId: room.roomId,
      sequence,
      action: context.action,
      targetKind: target.targetKind,
      targetId: target.targetId,
      targetVersion: target.targetVersion,
      committedAt: this.#now(),
      bodyAvailable: target.bodyAvailable,
    };
    state.events.push({ ...preimage, eventHash: canonicalSha256(preimage) });
    state.room = { ...room, eventHighWater: sequence };
  }

  #commitReceipt(
    state: MutablePublicCoreStateV1,
    context: PublicCoreMutationContextV1,
    status: number,
    code: string,
    recovery: PublicCoreReceiptRecoveryV1,
    expiresAtOverride?: string,
  ): PublicCoreMutationReceiptV1 {
    const committedAt = this.#now();
    const expiresAt = expiresAtOverride ?? addMilliseconds(committedAt, THIRTY_SEVEN_DAYS_MS);
    if (
      !Number.isFinite(Date.parse(expiresAt))
      || new Date(Date.parse(expiresAt)).toISOString() !== expiresAt
      || Date.parse(expiresAt) <= Date.parse(committedAt)
      || Date.parse(expiresAt) > Date.parse(committedAt) + THIRTY_SEVEN_DAYS_MS
    ) fail(503, "public_core_receipt_expiry_invalid");
    const receipt: PublicCoreMutationReceiptV1 = {
      schemaVersion: "r4_public_core_mutation_receipt.v1",
      receiptId: this.#nextId(state, "receipt"),
      action: context.action,
      actorScopeDigest: context.actorScopeDigest,
      idempotencyKey: context.idempotencyKey,
      requestHash: context.canonicalRequestHash,
      status,
      code,
      recovery: deepFreezeOwned(ownedPlainSnapshot(recovery, "public_core_receipt_recovery_invalid") as PublicCoreReceiptRecoveryV1),
      committedAt,
      expiresAt,
    };
    const key = receiptKey(context);
    if (state.receiptReservations.get(key) !== context.canonicalRequestHash) fail(500, "idempotency_reservation_missing");
    state.receiptReservations.delete(key);
    state.receipts.set(key, receipt);
    return receipt;
  }

  #sourceBoundReceiptExpiry(originalAt: string): string {
    const nowMs = Date.parse(this.#now());
    const sourceDeadline = Date.parse(originalAt) + THIRTY_SEVEN_DAYS_MS;
    const deadline = Math.min(nowMs + THIRTY_SEVEN_DAYS_MS, sourceDeadline);
    if (!Number.isSafeInteger(deadline) || deadline <= nowMs) fail(503, "public_core_receipt_source_expired");
    return new Date(deadline).toISOString();
  }

  async #publish(state: MutablePublicCoreStateV1, context: PublicCoreMutationContextV1): Promise<void> {
    this.#state = state;
    await this.#reach(context.action, "committed_response_lost");
  }

  #enqueuePurge(
    state: MutablePublicCoreStateV1,
    roomId: string,
    targetKind: PublicCorePurgeJobV1["targetKind"],
    targetId: string,
    at = this.#now(),
  ): void {
    const existing = [...state.purgeJobs.values()].find((job) => job.targetKind === targetKind && job.targetId === targetId);
    if (existing) return;
    const enqueuedAt = at;
    const job: PublicCorePurgeJobV1 = {
      purgeId: `purge_${canonicalSha256({ roomId, targetKind, targetId }).slice("sha256:".length, "sha256:".length + 32)}`,
      roomId,
      targetKind,
      targetId,
      enqueuedAt,
      // The retention contract rejects a purge target at exactly +24h. Keep
      // this deadline strictly inside the ceiling while preserving ms
      // precision for deterministic tests and durable adapters.
      targetBy: addMilliseconds(enqueuedAt, DAY_MS - 1),
      completedAt: null,
    };
    state.purgeJobs.set(job.purgeId, job);
  }

  async #recover(state: MutablePublicCoreStateV1, receipt: PublicCoreMutationReceiptV1): Promise<PublicCoreOperationResponseV1> {
    const recovered = true;
    const recovery = receipt.recovery;
    if (recovery.kind === "sync") {
      return response(receipt.status, recovery.snapshot as unknown as Record<string, unknown>, recovered);
    }
    if (recovery.kind === "pull") return await this.#recoverPull(state, receipt, recovery);
    if (recovery.kind === "pairing_issue") {
      const pairing = state.pairings.get(recovery.pairingId);
      if (!pairing || pairing.state !== "issued" || Date.parse(pairing.expiresAt) <= Date.parse(this.#now()) || !pairing.pairingCode?.readable) {
        return response(410, { schemaVersion: "r4_public_core_terminal_reconciliation.v1", targetId: recovery.pairingId, state: pairing?.state ?? "unavailable" }, recovered);
      }
      const pairingCode = await this.#reveal({
        table: "pairing_challenges", column: "pairing_code", roomId: pairing.roomId,
        rowId: pairing.pairingId, objectVersion: pairing.pairingCode.objectVersion, protectedValue: pairing.pairingCode,
      });
      return response(receipt.status, { schemaVersion: "r4_public_core_pairing_issued.v1", pairingId: pairing.pairingId, pairingCode, expiresAt: pairing.expiresAt, version: pairing.version }, recovered);
    }
    if (recovery.kind === "pairing_exchange") {
      const pairing = state.pairings.get(recovery.pairingId);
      if (!pairing?.exchangeEnvelope?.readable || Date.parse(pairing.expiresAt) <= Date.parse(this.#now())) {
        return response(410, { schemaVersion: "r4_public_core_terminal_reconciliation.v1", targetId: recovery.pairingId, state: pairing?.state ?? "unavailable" }, recovered);
      }
      return response(receipt.status, { schemaVersion: "r4_public_core_pairing_exchanged.v1", pairingId: pairing.pairingId, bindingId: recovery.bindingId, exchangeEnvelope: pairing.exchangeEnvelope.envelope, version: pairing.version }, recovered);
    }
    if (recovery.kind === "ack") {
      return response(receipt.status, { schemaVersion: "r4_public_core_ack_receipt.v1", ...recovery }, recovered);
    }
    if (recovery.kind === "room_created") {
      return response(receipt.status, {
        schemaVersion: "r4_public_core_room_created.v1",
        roomId: recovery.roomId,
        roomVersion: recovery.roomVersion,
        roomMode: recovery.roomMode,
      }, recovered);
    }
    if (recovery.kind === "encounter_issued") {
      return response(receipt.status, {
        schemaVersion: "r4_public_core_mutation_result.v1",
        action: receipt.action,
        targetId: recovery.encounterId,
        targetVersion: recovery.encounterVersion,
        code: receipt.code,
        expiresAt: recovery.expiresAt,
      }, recovered);
    }
    if (recovery.kind === "interaction_created") {
      return response(receipt.status, {
        schemaVersion: "r4_public_core_mutation_result.v1",
        action: receipt.action,
        targetId: recovery.interactionId,
        targetVersion: recovery.interactionVersion,
        code: receipt.code,
        state: recovery.state,
      }, recovered);
    }
    if (recovery.kind === "interaction_deleted") {
      return response(receipt.status, {
        schemaVersion: "r4_public_core_mutation_result.v1",
        action: receipt.action,
        targetId: recovery.interactionId,
        targetVersion: recovery.interactionVersion,
        code: receipt.code,
        bodyAvailable: recovery.bodyAvailable,
      }, recovered);
    }
    if (recovery.kind === "pull_terminal") {
      return response(receipt.status, {
        schemaVersion: "r4_public_core_pull_terminal.v1",
        interactionId: recovery.interactionId,
        state: recovery.state,
        bodyAvailable: false,
      }, recovered);
    }

    let targetId: string;
    let targetVersion: number;
    switch (recovery.kind) {
      case "binding_revoked": targetId = recovery.bindingId; targetVersion = recovery.bindingVersion; break;
      case "room_mode_set": targetId = recovery.roomId; targetVersion = recovery.roomVersion; break;
      case "projection_revoked": targetId = recovery.projectionId; targetVersion = recovery.projectionVersion; break;
      case "projection_admitted": targetId = recovery.projectionId; targetVersion = recovery.projectionVersion; break;
      case "projection_unlisted": targetId = recovery.projectionId; targetVersion = recovery.projectionVersion; break;
      case "projection_delivered": targetId = recovery.projectionId; targetVersion = recovery.projectionVersion; break;
      case "local_purge_recorded": targetId = recovery.interactionId; targetVersion = recovery.interactionVersion; break;
      default: return recovery satisfies never;
    }
    return response(receipt.status, {
      schemaVersion: "r4_public_core_mutation_result.v1",
      action: receipt.action,
      targetId,
      targetVersion,
      code: receipt.code,
    }, recovered);
  }

  #tombstoneIds(state: MutablePublicCoreStateV1): readonly string[] {
    return [...new Set([
      ...[...state.projections.values()].filter((value) => !value.capsule?.readable).map((value) => value.projectionId),
      ...[...state.interactions.values()].filter((value) => !value.requestBody?.readable).map((value) => value.interactionId),
    ])].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  }

  #syncSourceExpiresAt(state: MutablePublicCoreStateV1, snapshot: PublicCoreSyncRecoveryBodyV1): string {
    const committedAt = this.#now();
    const expiresAt = exactSyncSourceExpiresAt(
      snapshot,
      committedAt,
      (interactionId) => state.interactions.get(interactionId)?.acceptedAt ?? null,
    );
    if (expiresAt === null || Date.parse(expiresAt) <= Date.parse(committedAt)) {
      fail(503, "public_core_sync_source_expired");
    }
    return expiresAt;
  }

  #ownedRequest<T>(value: T): T {
    return deepFreezeOwned(ownedPlainSnapshot(value, "public_core_operation_input_invalid") as T);
  }

  async listThirdPlace(): Promise<PublicCoreOperationResponseV1> {
    return await this.#serialized(async () => {
      const state = clone(this.#state);
      const room = state.room;
      if (!room) return response(200, { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] });
      assertPublicCoreRoomScopeForAction("third_place.list", {
        roomKind: room.roomKind,
        interactionMode: room.interactionMode,
        capabilityKind: null,
      });
      const now = Date.parse(this.#now());
      const residents: Record<string, unknown>[] = [];
      for (const projection of state.projections.values()) {
        if (!projection.current || projection.ownerState !== "published_fresh" || projection.curationState !== "admitted") continue;
        if (Date.parse(projection.freshUntil) <= now || Date.parse(projection.expiresAt) <= now || !projection.capsule?.readable) continue;
        const capsuleText = await this.#reveal({
          table: "projections", column: "capsule", roomId: projection.roomId,
          rowId: projection.projectionId, objectVersion: projection.capsule.objectVersion,
          protectedValue: projection.capsule,
        });
        residents.push({ roomId: room.roomId, projection: validateProjectionCapsuleV1(JSON.parse(capsuleText)) });
      }
      return response(200, { schemaVersion: "r4_public_core_third_place_list.v1", residents });
    });
  }

  async readProjection(input: Readonly<{ projectionId: string }>): Promise<PublicCoreOperationResponseV1> {
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const state = clone(this.#state);
      const projection = this.#projection(state, input.projectionId);
      const room = this.#room(state, projection.roomId);
      assertPublicCoreRoomScopeForAction("projection.read", { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      const hardExpired = Date.parse(projection.expiresAt) <= Date.parse(this.#now());
      if (hardExpired || projection.ownerState === "superseded" || projection.ownerState === "revoked" || projection.ownerState === "expired" || !projection.capsule?.readable) {
        const logicalProjection: PublicCoreProjectionRecordV1 = hardExpired
          ? { ...projection, capsule: null, current: false, ownerState: "expired" }
          : { ...projection, capsule: null, current: false };
        return response(410, { schemaVersion: "r4_public_core_projection_tombstone.v1", ...bodyFreeProjection(logicalProjection), bodyAvailable: false });
      }
      const capsule = validateProjectionCapsuleV1(JSON.parse(await this.#reveal({
        table: "projections", column: "capsule", roomId: projection.roomId,
        rowId: projection.projectionId, objectVersion: projection.capsule.objectVersion,
        protectedValue: projection.capsule,
      })));
      const stale = projection.ownerState === "stale" || Date.parse(projection.freshUntil) <= Date.parse(this.#now());
      return response(200, {
        schemaVersion: "r4_public_core_projection_read.v1",
        projection: capsule,
        lifecycle: bodyFreeProjection(projection),
        staleWarning: stale,
        discoverable: projection.curationState === "admitted" && !stale,
        newKnockAvailable: projection.curationState === "admitted" && !stale && room.interactionMode === "public_single",
      });
    });
  }

  async readInteraction(input: Readonly<{ interactionId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1> {
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const state = clone(this.#state);
      const interaction = this.#interaction(state, input.interactionId);
      const room = this.#room(state, interaction.roomId);
      assertPublicCoreRoomScopeForAction("interaction.read", { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "public_encounter" });
      if (!this.#matches("reply_secret", input.authorizationSecret, interaction.replySecretDigest)) fail(404, "not_found");
      const expired = Date.parse(interaction.expiresAt) <= Date.parse(this.#now());
      const view = expired && interaction.state !== "interaction_deleted" && interaction.state !== "origin_revoked"
        ? { ...bodyFreeInteraction(interaction), state: "interaction_expired", bodyAvailable: false }
        : bodyFreeInteraction(interaction);
      return response(200, { schemaVersion: "r4_public_core_interaction_status.v1", interaction: view });
    });
  }

  async readRoomOperatorStatus(input: Readonly<{ roomId: string; authorizationSecret: string }>): Promise<PublicCoreOperationResponseV1> {
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const state = clone(this.#state);
      const room = this.#room(state, input.roomId);
      const binding = this.#bindingBySecret(state, input.authorizationSecret);
      if (binding.roomId !== room.roomId) fail(404, "not_found");
      assertPublicCoreRoomScopeForAction("room_operator.status", { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "room_operator" });
      const currentProjection = room.currentProjectionId === null ? null : state.projections.get(room.currentProjectionId) ?? null;
      const logicalCurrentProjectionId = currentProjection
        && currentProjection.current
        && currentProjection.ownerState !== "revoked"
        && currentProjection.ownerState !== "superseded"
        && currentProjection.ownerState !== "expired"
        && Date.parse(currentProjection.expiresAt) > Date.parse(this.#now())
        ? currentProjection.projectionId
        : null;
      return response(200, {
        schemaVersion: "r4_public_core_room_operator_status.v1",
        roomId: room.roomId,
        roomMode: room.interactionMode,
        roomVersion: room.version,
        currentProjectionId: logicalCurrentProjectionId,
        eventHighWater: room.eventHighWater,
        earliestReplayableSequence: room.eventFloor,
        bindingId: binding.bindingId,
        bindingVersion: binding.version,
        retentionWriteStop: this.#retentionIncident(state),
      });
    });
  }

  async createRoom(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room.create", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      if (begun.working.room) fail(409, "single_room_slot_occupied");
      if (input.entityId !== begun.working.installation.entityId) fail(404, "not_found");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const roomId = this.#nextId(begun.working, "room");
      const label = await this.#protect(begun.working, { table: "rooms", column: "label", roomId, rowId: roomId, objectVersion: 1, plaintext: input.label });
      const room: PublicCoreRoomRecordV1 = {
        roomId,
        installationId: begun.working.installation.installationId,
        entityId: input.entityId,
        roomKind: "third_place_public",
        interactionMode: "public_single",
        state: "active",
        label,
        currentProjectionId: null,
        eventHighWater: 0,
        eventFloor: 1,
        version: 1,
        createdAt: this.#now(),
      };
      begun.working.room = room;
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId, targetKind: "room", targetId: roomId, targetVersion: room.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "room_created", {
        kind: "room_created", roomId, roomVersion: room.version, roomMode: "public_single",
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_room_created.v1", roomId, roomVersion: room.version, roomMode: room.interactionMode });
    });
  }

  async createRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreCreateRoomPairInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room.pair", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const room = this.#room(begun.working, input.roomId);
      this.#assertExpected(context, room.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "room_pairing" });
      for (const existing of begun.working.pairings.values()) {
        if (existing.roomId === room.roomId && Date.parse(existing.expiresAt) <= Date.parse(this.#now()) && (existing.pairingCode !== null || existing.exchangeEnvelope !== null)) {
          begun.working.pairings.set(existing.pairingId, {
            ...existing,
            pairingCode: null,
            exchangeEnvelope: null,
            state: "expired",
            version: existing.version + 1,
          });
          this.#enqueuePurge(begun.working, room.roomId, "pairing_body", existing.pairingId);
        }
      }
      if ([...begun.working.pairings.values()].some((item) => item.roomId === room.roomId && item.state === "issued" && Date.parse(item.expiresAt) > Date.parse(this.#now()))) fail(409, "pairing_already_issued");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const pairingId = this.#nextId(begun.working, "pairing");
      const pairingCode = this.#nextSecret("pairing_code");
      const issuedAt = this.#now();
      const protectedCode = await this.#protect(begun.working, { table: "pairing_challenges", column: "pairing_code", roomId: room.roomId, rowId: pairingId, objectVersion: 1, plaintext: pairingCode });
      const pairing: PublicCorePairingChallengeRecordV1 = {
        pairingId,
        roomId: room.roomId,
        pairingCode: protectedCode,
        pairingCodeDigest: this.#digest("pairing_code", pairingCode),
        exchangeEnvelope: null,
        state: "issued",
        bindingId: null,
        issuedAt,
        expiresAt: addMilliseconds(issuedAt, TEN_MINUTES_MS),
        version: 1,
      };
      begun.working.pairings.set(pairingId, pairing);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "pairing", targetId: pairingId, targetVersion: pairing.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "pairing_issued", { kind: "pairing_issue", pairingId, targetVersion: pairing.version });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_pairing_issued.v1", pairingId, pairingCode, expiresAt: pairing.expiresAt, version: pairing.version });
    });
  }

  async exchangeRoomPair(context: PublicCoreMutationContextV1, input: PublicCoreExchangeRoomPairInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room.pair.exchange", context);
      const pairing = begun.working.pairings.get(input.pairingId);
      if (!pairing) fail(404, "not_found");
      if (!this.#matches("pairing_code", input.pairingCode, pairing.pairingCodeDigest)) fail(404, "not_found");
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const room = this.#room(begun.working, pairing.roomId);
      this.#assertExpected(context, pairing.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "room_pairing" });
      if (pairing.state !== "issued" || Date.parse(pairing.expiresAt) <= Date.parse(this.#now()) || !pairing.pairingCode?.readable) fail(410, "pairing_unavailable");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const bindingId = this.#nextId(begun.working, "binding");
      const bindingSecret = this.#nextSecret("binding_secret");
      const pairedAt = this.#now();
      const binding: PublicCoreBindingRecordV1 = {
        bindingId,
        roomId: room.roomId,
        secretDigest: this.#digest("binding_secret", bindingSecret),
        state: "current",
        pairedAt,
        expiresAt: addMilliseconds(pairedAt, THIRTY_DAYS_MS),
        revokedAt: null,
        version: 1,
      };
      const exchangePlaintext = JSON.stringify({ schemaVersion: "r4_public_core_binding_exchange.v1", bindingId, roomId: room.roomId, bindingSecret, clientPublicKey: input.clientPublicKey, expiresAt: binding.expiresAt });
      const exchangeEnvelope = await this.#protect(begun.working, { table: "pairing_challenges", column: "exchange_envelope", roomId: room.roomId, rowId: pairing.pairingId, objectVersion: pairing.version + 1, plaintext: exchangePlaintext });
      const exchanged: PublicCorePairingChallengeRecordV1 = { ...pairing, pairingCode: null, exchangeEnvelope, state: "exchanged", bindingId, version: pairing.version + 1 };
      begun.working.bindings.set(bindingId, binding);
      begun.working.pairings.set(pairing.pairingId, exchanged);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "binding", targetId: bindingId, targetVersion: binding.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "pairing_exchanged", { kind: "pairing_exchange", pairingId: pairing.pairingId, bindingId, targetVersion: binding.version });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_pairing_exchanged.v1", pairingId: pairing.pairingId, bindingId, exchangeEnvelope: exchangeEnvelope.envelope, version: exchanged.version });
    });
  }

  async revokeRoomBinding(context: PublicCoreMutationContextV1, input: PublicCoreRevokeRoomBindingInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room.binding.revoke", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const binding = begun.working.bindings.get(input.bindingId);
      if (!binding) fail(404, "not_found");
      const room = this.#room(begun.working, binding.roomId);
      this.#assertExpected(context, binding.version);
      if (binding.state !== "current") fail(409, "binding_not_current");
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      await this.#reach(context.action, "after_locks_and_rechecks");
      const revoked: PublicCoreBindingRecordV1 = { ...binding, state: "revoked", revokedAt: this.#now(), version: binding.version + 1 };
      begun.working.bindings.set(binding.bindingId, revoked);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "binding", targetId: binding.bindingId, targetVersion: revoked.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "binding_revoked", {
        kind: "binding_revoked", bindingId: binding.bindingId, bindingVersion: revoked.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: binding.bindingId, targetVersion: revoked.version, code: "binding_revoked" });
    });
  }

  async setRoomMode(context: PublicCoreMutationContextV1, input: PublicCoreSetRoomModeInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const current = this.#room(this.#state, input.roomId);
      const begun = await this.#begin("room.mode.set", context, { from: current.interactionMode, to: input.interactionMode });
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const room = this.#room(begun.working, input.roomId);
      this.#assertExpected(context, room.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      if (room.interactionMode === input.interactionMode) fail(409, "room_mode_unchanged");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const changed: PublicCoreRoomRecordV1 = { ...room, interactionMode: input.interactionMode, version: room.version + 1 };
      begun.working.room = changed;
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "room", targetId: room.roomId, targetVersion: changed.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "room_mode_set", {
        kind: "room_mode_set", roomId: room.roomId, roomVersion: changed.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: room.roomId, targetVersion: changed.version, code: "room_mode_set" });
    });
  }

  async deliverProjection(context: PublicCoreMutationContextV1, input: PublicCoreDeliverProjectionInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room_operator.projection.deliver", context);
      const projection = validateProjectionCapsuleV1(input.projection);
      const room = this.#room(begun.working, projection.roomId);
      this.#assertOperator(begun.working, context, room.roomId);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      this.#assertExpected(context, room.version);
      if (projection.entityId !== room.entityId || begun.working.projections.has(projection.projectionId)) fail(409, "projection_identity_conflict");
      const now = Date.parse(this.#now());
      if (
        Date.parse(projection.publishedAt) > now
        || Date.parse(projection.expiresAt) <= now
        || Date.parse(projection.expiresAt) - Date.parse(projection.publishedAt) > 7 * DAY_MS
        || Date.parse(projection.freshUntil) > Date.parse(projection.expiresAt)
      ) fail(409, "projection_time_window_invalid");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const old = room.currentProjectionId ? begun.working.projections.get(room.currentProjectionId) ?? null : null;
      if (old) {
        const superseded: PublicCoreProjectionRecordV1 = {
          ...old,
          capsule: null,
          ownerState: "superseded",
          current: false,
          version: old.version + 1,
        };
        begun.working.projections.set(old.projectionId, superseded);
        this.#enqueuePurge(begun.working, old.roomId, "projection_body", old.projectionId);
        for (const encounter of begun.working.encounters.values()) {
          if (encounter.projectionId === old.projectionId && encounter.state === "issued") {
            begun.working.encounters.set(encounter.encounterId, { ...encounter, state: "revoked", version: encounter.version + 1 });
          }
        }
      }
      const capsule = await this.#protect(begun.working, {
        table: "projections", column: "capsule", roomId: room.roomId,
        rowId: projection.projectionId, objectVersion: 1, plaintext: JSON.stringify(projection),
      });
      const stored: PublicCoreProjectionRecordV1 = {
        projectionId: projection.projectionId,
        roomId: room.roomId,
        entityId: projection.entityId,
        capsule,
        payloadHash: projection.payloadHash,
        publicationApprovalHash: input.publicationApprovalHash,
        publicationAttestationHash: input.publicationAttestationHash,
        ownerState: "published_fresh",
        curationState: "not_admitted",
        current: true,
        publishedAt: projection.publishedAt,
        freshUntil: projection.freshUntil,
        expiresAt: projection.expiresAt,
        version: 1,
      };
      begun.working.projections.set(stored.projectionId, stored);
      begun.working.room = { ...room, currentProjectionId: stored.projectionId, version: room.version + 1 };
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "projection", targetId: stored.projectionId, targetVersion: stored.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "projection_delivered", {
        kind: "projection_delivered", projectionId: stored.projectionId, projectionVersion: stored.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: stored.projectionId, targetVersion: stored.version, code: "projection_delivered" });
    });
  }

  async revokeProjection(context: PublicCoreMutationContextV1, input: PublicCoreRevokeProjectionInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("projection.revoke", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const projection = this.#projection(begun.working, input.projectionId);
      const room = this.#room(begun.working, projection.roomId);
      this.#assertExpected(context, projection.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      if (projection.ownerState === "revoked" || projection.ownerState === "expired") fail(409, "projection_not_revocable");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const revoked: PublicCoreProjectionRecordV1 = { ...projection, capsule: null, ownerState: "revoked", current: false, version: projection.version + 1 };
      begun.working.projections.set(projection.projectionId, revoked);
      if (room.currentProjectionId === projection.projectionId) begun.working.room = { ...room, currentProjectionId: null, version: room.version + 1 };
      this.#enqueuePurge(begun.working, room.roomId, "projection_body", projection.projectionId);
      for (const encounter of begun.working.encounters.values()) {
        if (encounter.projectionId === projection.projectionId && encounter.state === "issued") {
          begun.working.encounters.set(encounter.encounterId, { ...encounter, state: "revoked", version: encounter.version + 1 });
        }
      }
      for (const interaction of begun.working.interactions.values()) {
        if (interaction.projectionId !== projection.projectionId || interaction.state === "interaction_deleted") continue;
        const terminal: PublicCoreInteractionRecordV1 = {
          ...interaction,
          requestBody: null,
          guestCapsule: null,
          state: "origin_revoked",
          version: interaction.version + 1,
        };
        begun.working.interactions.set(interaction.interactionId, terminal);
        this.#enqueuePurge(begun.working, room.roomId, "interaction_body", interaction.interactionId);
      }
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "projection", targetId: projection.projectionId, targetVersion: revoked.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "projection_revoked", {
        kind: "projection_revoked", projectionId: projection.projectionId, projectionVersion: revoked.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: projection.projectionId, targetVersion: revoked.version, code: "projection_revoked" });
    });
  }

  async admitProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("curation.admit", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const projection = this.#projection(begun.working, input.projectionId);
      const room = this.#room(begun.working, projection.roomId);
      this.#assertExpected(context, projection.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      if (!projection.current || projection.ownerState !== "published_fresh" || projection.curationState !== "not_admitted" || Date.parse(projection.freshUntil) <= Date.parse(this.#now())) fail(409, "projection_not_admittable");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const admitted: PublicCoreProjectionRecordV1 = { ...projection, curationState: "admitted", version: projection.version + 1 };
      begun.working.projections.set(projection.projectionId, admitted);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "projection", targetId: projection.projectionId, targetVersion: admitted.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "projection_admitted", {
        kind: "projection_admitted", projectionId: projection.projectionId, projectionVersion: admitted.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: projection.projectionId, targetVersion: admitted.version, code: "projection_admitted" });
    });
  }

  async unlistProjection(context: PublicCoreMutationContextV1, input: PublicCoreCurationInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("curation.unlist", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const projection = this.#projection(begun.working, input.projectionId);
      const room = this.#room(begun.working, projection.roomId);
      this.#assertExpected(context, projection.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: null });
      if (projection.curationState !== "admitted") fail(409, "projection_not_listed");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const unlisted: PublicCoreProjectionRecordV1 = { ...projection, curationState: "unlisted", version: projection.version + 1 };
      begun.working.projections.set(projection.projectionId, unlisted);
      for (const encounter of begun.working.encounters.values()) {
        if (encounter.projectionId === projection.projectionId && encounter.state === "issued") begun.working.encounters.set(encounter.encounterId, { ...encounter, state: "revoked", version: encounter.version + 1 });
      }
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "projection", targetId: projection.projectionId, targetVersion: unlisted.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "projection_unlisted", {
        kind: "projection_unlisted", projectionId: projection.projectionId, projectionVersion: unlisted.version,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: projection.projectionId, targetVersion: unlisted.version, code: "projection_unlisted" });
    });
  }

  async issuePublicEncounter(context: PublicCoreMutationContextV1, input: PublicCoreIssueEncounterInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("public_encounter.issue", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const projection = this.#projection(begun.working, input.projectionId);
      const room = this.#room(begun.working, projection.roomId);
      this.#assertExpected(context, projection.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "public_encounter" });
      const nowMs = Date.parse(this.#now());
      if (
        !projection.current
        || room.currentProjectionId !== projection.projectionId
        || projection.ownerState !== "published_fresh"
        || projection.curationState !== "admitted"
        || Date.parse(projection.freshUntil) <= nowMs
        || Date.parse(projection.expiresAt) <= nowMs
      ) fail(409, "projection_not_open_for_encounter");
      const rateBucketDigest = this.#digest("rate_bucket", `${room.roomId}\u0000${input.coarseRateBucket}`);
      const hourly = begun.working.rateEvents.filter((event) => event.kind === "encounter_issue" && event.roomId === room.roomId && sameKeyedDigest(event.bucketDigest, rateBucketDigest) && Date.parse(event.occurredAt) > nowMs - HOUR_MS).length;
      const daily = begun.working.rateEvents.filter((event) => event.kind === "encounter_issue" && event.roomId === room.roomId && sameKeyedDigest(event.bucketDigest, rateBucketDigest) && Date.parse(event.occurredAt) > nowMs - DAY_MS).length;
      if (hourly >= 10) fail(429, "encounter_hourly_rate_limited");
      if (daily >= 50) fail(429, "encounter_daily_rate_limited");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const encounterId = this.#nextId(begun.working, "encounter");
      const issuedAt = this.#now();
      const encounter: PublicCoreEncounterRecordV1 = {
        encounterId,
        roomId: room.roomId,
        projectionId: projection.projectionId,
        secretDigest: this.#digest("encounter_secret", input.encounterSecret),
        rateBucketDigest,
        state: "issued",
        issuedAt,
        expiresAt: addMilliseconds(issuedAt, DAY_MS),
        interactionId: null,
        version: 1,
      };
      begun.working.encounters.set(encounterId, encounter);
      begun.working.rateEvents.push({ roomId: room.roomId, kind: "encounter_issue", bucketDigest: rateBucketDigest, occurredAt: issuedAt });
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "encounter", targetId: encounterId, targetVersion: encounter.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "encounter_issued", {
        kind: "encounter_issued", encounterId, encounterVersion: encounter.version, expiresAt: encounter.expiresAt,
      });
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: encounterId, targetVersion: encounter.version, code: "encounter_issued", expiresAt: encounter.expiresAt });
    });
  }

  async createInteraction(context: PublicCoreMutationContextV1, input: PublicCoreCreateInteractionInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("interaction.create", context);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const encounter = this.#encounterBySecret(begun.working, context.authorizationSecret);
      if (encounter.projectionId !== input.projectionId) fail(404, "not_found");
      const projection = this.#projection(begun.working, encounter.projectionId);
      const room = this.#room(begun.working, encounter.roomId);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "public_encounter" });
      const nowMs = Date.parse(this.#now());
      if (
        encounter.state !== "issued"
        || encounter.interactionId !== null
        || Date.parse(encounter.expiresAt) <= nowMs
        || !projection.current
        || projection.ownerState !== "published_fresh"
        || projection.curationState !== "admitted"
        || Date.parse(projection.freshUntil) <= nowMs
        || Date.parse(projection.expiresAt) <= nowMs
      ) fail(409, "encounter_not_acceptable");
      const acceptedToday = begun.working.rateEvents.filter((event) => event.kind === "interaction_accept" && event.roomId === room.roomId && sameKeyedDigest(event.bucketDigest, encounter.rateBucketDigest) && Date.parse(event.occurredAt) > nowMs - DAY_MS).length;
      if (acceptedToday >= 3) fail(429, "interaction_daily_rate_limited");
      const unresolved = [...begun.working.interactions.values()].filter((item) => item.roomId === room.roomId && (item.state === "accepted" || item.state === "seen_locally")).length;
      if (unresolved >= 20) fail(429, "room_unresolved_pool_full");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const interactionId = this.#nextId(begun.working, "interaction");
      const acceptedAt = this.#now();
      const requestBody = await this.#protect(begun.working, { table: "interactions", column: "request_body", roomId: room.roomId, rowId: interactionId, objectVersion: 1, plaintext: input.requestBody });
      const guestCapsuleText = input.guestCapsule === null ? null : JSON.stringify(input.guestCapsule);
      const guestCapsule = guestCapsuleText === null ? null : await this.#protect(begun.working, { table: "interactions", column: "guest_capsule", roomId: room.roomId, rowId: interactionId, objectVersion: 1, plaintext: guestCapsuleText });
      const interaction: PublicCoreInteractionRecordV1 = {
        interactionId,
        roomId: room.roomId,
        projectionId: projection.projectionId,
        originProjectionHash: projection.payloadHash,
        originStateAtAcceptance: "published_fresh",
        interactionType: input.interactionType,
        requestBody,
        guestCapsule,
        requestHash: canonicalSha256(input.requestBody),
        guestCapsuleHash: guestCapsuleText === null ? null : canonicalSha256(guestCapsuleText),
        consent: input.consent,
        consentHash: canonicalSha256({ consent: input.consent }),
        replySecretDigest: this.#digest("reply_secret", input.replySecret),
        deleteSecretDigest: this.#digest("delete_secret", input.deleteSecret),
        state: "accepted",
        acceptedAt,
        expiresAt: addMilliseconds(acceptedAt, THIRTY_DAYS_MS),
        localPurgeReceivedAt: null,
        version: 1,
      };
      begun.working.interactions.set(interactionId, interaction);
      begun.working.encounters.set(encounter.encounterId, { ...encounter, state: "consumed", interactionId, version: encounter.version + 1 });
      begun.working.rateEvents.push({ roomId: room.roomId, kind: "interaction_accept", bucketDigest: encounter.rateBucketDigest, occurredAt: acceptedAt });
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "interaction", targetId: interactionId, targetVersion: interaction.version, bodyAvailable: true });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 201, "interaction_created", {
        kind: "interaction_created", interactionId, interactionVersion: interaction.version, state: "accepted",
      }, this.#sourceBoundReceiptExpiry(interaction.acceptedAt));
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(201, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: interactionId, targetVersion: interaction.version, code: "interaction_created", state: interaction.state });
    });
  }

  async deleteInteraction(context: PublicCoreMutationContextV1, input: PublicCoreDeleteInteractionInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("interaction.delete", context);
      const interaction = this.#interaction(begun.working, input.interactionId);
      const room = this.#room(begun.working, interaction.roomId);
      if (!context.authorizationSecret || !this.#matches("delete_secret", context.authorizationSecret, interaction.deleteSecretDigest)) fail(404, "not_found");
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      this.#assertExpected(context, interaction.version);
      assertPublicCoreRoomScopeForAction(context.action, { roomKind: room.roomKind, interactionMode: room.interactionMode, capabilityKind: "public_encounter" });
      if (interaction.state === "interaction_deleted") fail(409, "interaction_already_deleted");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const deleted: PublicCoreInteractionRecordV1 = { ...interaction, requestBody: null, guestCapsule: null, state: "interaction_deleted", version: interaction.version + 1 };
      begun.working.interactions.set(interaction.interactionId, deleted);
      this.#enqueuePurge(begun.working, room.roomId, "interaction_body", interaction.interactionId);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "interaction", targetId: interaction.interactionId, targetVersion: deleted.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "interaction_deleted", {
        kind: "interaction_deleted", interactionId: interaction.interactionId, interactionVersion: deleted.version, bodyAvailable: false,
      }, this.#sourceBoundReceiptExpiry(interaction.acceptedAt));
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: interaction.interactionId, targetVersion: deleted.version, code: "interaction_deleted", bodyAvailable: false });
    });
  }

  async syncRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreSyncInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room_operator.sync", context);
      const room = this.#room(begun.working, input.roomId);
      this.#assertOperator(begun.working, context, room.roomId);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      if (!Number.isSafeInteger(input.afterSequence) || input.afterSequence < 0 || input.afterSequence > room.eventHighWater) fail(400, "invalid_event_cursor");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const highWater = room.eventHighWater;
      const gone = input.afterSequence < room.eventFloor - 1;
      const snapshot: PublicCoreSyncRecoveryBodyV1 = gone
        ? {
            schemaVersion: "r4_public_core_cursor_gone.v1",
            roomId: room.roomId,
            afterSequence: input.afterSequence,
            highWater,
            earliestReplayableSequence: room.eventFloor,
            events: begun.working.events.filter((event) => event.sequence >= room.eventFloor && event.sequence <= highWater),
            tombstoneIds: this.#tombstoneIds(begun.working),
          }
        : {
            schemaVersion: "r4_public_core_event_batch.v1",
            roomId: room.roomId,
            afterSequence: input.afterSequence,
            highWater,
            events: begun.working.events.filter((event) => event.sequence > input.afterSequence && event.sequence <= highWater),
          };
      const sourceExpiresAt = this.#syncSourceExpiresAt(begun.working, snapshot);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, null);
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(
        begun.working,
        context,
        gone ? 410 : 200,
        gone ? "cursor_gone" : "events_synced",
        { kind: "sync", snapshot, sourceExpiresAt },
        sourceExpiresAt,
      );
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(gone ? 410 : 200, snapshot as unknown as Record<string, unknown>);
    });
  }

  async pullRoomOperator(context: PublicCoreMutationContextV1, input: PublicCorePullInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room_operator.pull", context);
      const interaction = this.#interaction(begun.working, input.interactionId);
      const room = this.#room(begun.working, interaction.roomId);
      this.#assertOperator(begun.working, context, room.roomId);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      this.#assertExpected(context, interaction.version);
      const bodyState = interaction.state === "origin_revoked"
        ? "origin_revoked"
        : interaction.state === "interaction_deleted" || interaction.requestBody?.readable !== true
          ? "deleted"
          : "readable";
      const retention = resolvePublicCorePullRetention({
        interactionCreatedAt: interaction.acceptedAt,
        now: this.#now(),
        bodyState,
        bodyVersion: interaction.requestBody?.objectVersion ?? interaction.version,
        health: {
          schemaVersion: "r4_public_core_retention_health.v1",
          lastSuccessfulPurgeAt: begun.working.retentionHealth.lastSuccessfulPurgeAt,
        },
        replay: { committedReceipt: false, sameKeyAndHash: false },
      });
      if (retention.kind === "body_free_reconciliation") {
        await this.#reach(context.action, "after_locks_and_rechecks");
        const terminalInteraction = this.#interaction(begun.working, interaction.interactionId);
        if (
          terminalInteraction.state !== "interaction_deleted"
          && terminalInteraction.state !== "interaction_expired"
          && terminalInteraction.state !== "origin_revoked"
        ) fail(503, "public_core_pull_terminal_state_invalid");
        await this.#reach(context.action, "after_domain_write_before_room_event");
        this.#appendEvent(begun.working, context, null);
        await this.#reach(context.action, "after_room_event_before_receipt");
        this.#commitReceipt(begun.working, context, 410, "pull_terminal", {
          kind: "pull_terminal", interactionId: interaction.interactionId,
          interactionVersion: terminalInteraction.version, state: terminalInteraction.state,
        }, this.#sourceBoundReceiptExpiry(terminalInteraction.acceptedAt));
        await this.#reach(context.action, "after_receipt_before_commit");
        await this.#publish(begun.working, context);
        return response(410, { schemaVersion: "r4_public_core_pull_terminal.v1", interactionId: interaction.interactionId, state: terminalInteraction.state, bodyAvailable: false });
      }
      if (interaction.state !== "accepted") fail(409, "interaction_already_pulled");
      const protectedRequest = interaction.requestBody;
      if (!protectedRequest?.readable) fail(503, "pull_body_unavailable");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const pulled: PublicCoreInteractionRecordV1 = { ...interaction, state: "seen_locally", version: interaction.version + 1 };
      begun.working.interactions.set(interaction.interactionId, pulled);
      const requestBody = await this.#reveal({ table: "interactions", column: "request_body", roomId: interaction.roomId, rowId: interaction.interactionId, objectVersion: protectedRequest.objectVersion, protectedValue: protectedRequest });
      if (canonicalSha256(requestBody) !== interaction.requestHash) fail(503, "pull_body_hash_mismatch");
      const guestCapsule = await this.#revealAndValidateGuestCapsule(interaction);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, null);
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "interaction_pulled", {
        kind: "pull",
        interactionId: interaction.interactionId,
        interactionVersion: pulled.version,
        requestFieldVersion: protectedRequest.objectVersion,
        bodyHash: interaction.requestHash,
        guestCapsuleFieldVersion: interaction.guestCapsule?.objectVersion ?? null,
        guestCapsuleHash: interaction.guestCapsuleHash,
        bodyExpiresAt: interaction.expiresAt,
      }, this.#sourceBoundReceiptExpiry(interaction.acceptedAt));
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_pull.v1", interaction: bodyFreeInteraction(pulled), requestBody, guestCapsule, bodyHash: interaction.requestHash });
    });
  }

  async ackRoomOperator(context: PublicCoreMutationContextV1, input: PublicCoreAckInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room_operator.ack", context);
      const room = this.#room(begun.working, input.roomId);
      const binding = this.#assertOperator(begun.working, context, room.roomId);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      const event = begun.working.events.find((item) => item.eventId === input.eventId && item.sequence === input.sequence && item.roomId === room.roomId);
      if (!event || event.eventHash !== input.eventHash) fail(409, "event_ack_mismatch");
      const ackKey = `${binding.bindingId}\u0000${event.eventId}`;
      if (begun.working.acks.has(ackKey)) fail(409, "event_already_acked");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const ackId = this.#nextId(begun.working, "ack");
      begun.working.acks.set(ackKey, { ackId, bindingId: binding.bindingId, roomId: room.roomId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash, ackedAt: this.#now() });
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, null);
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(
        begun.working,
        context,
        200,
        "event_acked",
        { kind: "ack", ackId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash },
        this.#sourceBoundReceiptExpiry(event.committedAt),
      );
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_ack_receipt.v1", kind: "ack", ackId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash });
    });
  }

  async recordLocalPurgeReceipt(context: PublicCoreMutationContextV1, input: PublicCoreLocalPurgeInputV1): Promise<PublicCoreOperationResponseV1> {
    context = this.#ownedRequest(context);
    input = this.#ownedRequest(input);
    return await this.#serialized(async () => {
      const begun = await this.#begin("room_operator.local_purge.receipt", context);
      const interaction = this.#interaction(begun.working, input.interactionId);
      const room = this.#room(begun.working, interaction.roomId);
      this.#assertOperator(begun.working, context, room.roomId);
      if (begun.replay) return await this.#recover(begun.working, begun.replay);
      this.#assertExpected(context, interaction.version);
      if (input.localBytesAbsent !== true) fail(400, "local_purge_attestation_required");
      if (interaction.localPurgeReceivedAt !== null) fail(409, "local_purge_already_recorded");
      await this.#reach(context.action, "after_locks_and_rechecks");
      const recorded: PublicCoreInteractionRecordV1 = { ...interaction, localPurgeReceivedAt: this.#now(), version: interaction.version + 1 };
      begun.working.interactions.set(interaction.interactionId, recorded);
      await this.#reach(context.action, "after_domain_write_before_room_event");
      this.#appendEvent(begun.working, context, { roomId: room.roomId, targetKind: "purge", targetId: interaction.interactionId, targetVersion: recorded.version, bodyAvailable: false });
      await this.#reach(context.action, "after_room_event_before_receipt");
      this.#commitReceipt(begun.working, context, 200, "local_purge_recorded", {
        kind: "local_purge_recorded", interactionId: interaction.interactionId, interactionVersion: recorded.version,
      }, this.#sourceBoundReceiptExpiry(interaction.acceptedAt));
      await this.#reach(context.action, "after_receipt_before_commit");
      await this.#publish(begun.working, context);
      return response(200, { schemaVersion: "r4_public_core_mutation_result.v1", action: context.action, targetId: interaction.interactionId, targetVersion: recorded.version, code: "local_purge_recorded" });
    });
  }

  async #recoverPull(
    state: MutablePublicCoreStateV1,
    receipt: PublicCoreMutationReceiptV1,
    recovery: Extract<PublicCoreReceiptRecoveryV1, { kind: "pull" }>,
  ): Promise<PublicCoreOperationResponseV1> {
    const interaction = state.interactions.get(recovery.interactionId);
    if (!interaction) {
      return response(410, {
        schemaVersion: "r4_public_core_pull_terminal.v1",
        interactionId: recovery.interactionId,
        state: "unavailable",
        bodyAvailable: false,
      }, true);
    }
    const bodyState = interaction.state === "origin_revoked"
      ? "origin_revoked"
      : interaction.state === "interaction_deleted" || interaction.requestBody?.readable !== true
        ? "deleted"
        : "readable";
    const retention = resolvePublicCorePullRetention({
      interactionCreatedAt: interaction.acceptedAt,
      now: this.#now(),
      bodyState,
      bodyVersion: interaction.requestBody?.objectVersion ?? recovery.requestFieldVersion,
      health: {
        schemaVersion: "r4_public_core_retention_health.v1",
        lastSuccessfulPurgeAt: state.retentionHealth.lastSuccessfulPurgeAt,
      },
      replay: { committedReceipt: true, sameKeyAndHash: true },
    });
    if (retention.kind === "body_free_reconciliation") {
      return response(410, {
        schemaVersion: "r4_public_core_pull_terminal.v1",
        interactionId: recovery.interactionId,
        state: interaction.state,
        bodyAvailable: false,
      }, true);
    }
    const exactInteractionVersion = interaction.version === recovery.interactionVersion;
    const localPurgeOnlyAdvance = interaction.version === recovery.interactionVersion + 1
      && interaction.state === "seen_locally"
      && interaction.localPurgeReceivedAt !== null;
    if (
      (!exactInteractionVersion && !localPurgeOnlyAdvance)
      || interaction.expiresAt !== recovery.bodyExpiresAt
      || Date.parse(recovery.bodyExpiresAt) <= Date.parse(this.#now())
      || interaction.requestHash !== recovery.bodyHash
      || interaction.requestBody?.objectVersion !== recovery.requestFieldVersion
      || (interaction.guestCapsule?.objectVersion ?? null) !== recovery.guestCapsuleFieldVersion
      || interaction.guestCapsuleHash !== recovery.guestCapsuleHash
    ) {
      return response(410, {
        schemaVersion: "r4_public_core_pull_terminal.v1",
        interactionId: recovery.interactionId,
        state: "receipt_version_unavailable",
        bodyAvailable: false,
      }, true);
    }
    const protectedRequest = interaction.requestBody;
    if (!protectedRequest?.readable) fail(503, "pull_body_unavailable");
    const requestBody = await this.#reveal({
      table: "interactions", column: "request_body", roomId: interaction.roomId,
      rowId: interaction.interactionId, objectVersion: protectedRequest.objectVersion,
      protectedValue: protectedRequest,
    });
    if (canonicalSha256(requestBody) !== recovery.bodyHash) {
      fail(503, "pull_body_hash_mismatch");
    }
    const guestCapsule = await this.#revealAndValidateGuestCapsule(interaction);
    const receiptBoundInteraction: PublicCoreInteractionRecordV1 = {
      ...interaction,
      version: recovery.interactionVersion,
      localPurgeReceivedAt: null,
    };
    return response(receipt.status, {
      schemaVersion: "r4_public_core_pull.v1",
      interaction: bodyFreeInteraction(receiptBoundInteraction),
      requestBody,
      guestCapsule,
      bodyHash: recovery.bodyHash,
    }, true);
  }

  async #revealAndValidateGuestCapsule(interaction: PublicCoreInteractionRecordV1): Promise<GuestCapsuleV1 | null> {
    const protectedGuest = interaction.guestCapsule;
    if (protectedGuest === null) {
      if (interaction.guestCapsuleHash !== null) fail(503, "pull_guest_capsule_hash_mismatch");
      return null;
    }
    if (!protectedGuest.readable || interaction.guestCapsuleHash === null) fail(503, "pull_guest_capsule_unavailable");
    const plaintext = await this.#reveal({
      table: "interactions", column: "guest_capsule", roomId: interaction.roomId,
      rowId: interaction.interactionId, objectVersion: protectedGuest.objectVersion,
      protectedValue: protectedGuest,
    });
    if (canonicalSha256(plaintext) !== interaction.guestCapsuleHash) {
      fail(503, "pull_guest_capsule_hash_mismatch");
    }
    try {
      return validateGuestCapsuleV1(JSON.parse(plaintext));
    } catch {
      fail(503, "pull_guest_capsule_invalid");
    }
  }
}

/** Explicitly test-only maintenance access; never part of the application port. */
export function createPublicCoreTestMaintenanceV1(store: InMemoryPublicCoreStoreV1): PublicCoreTestMaintenanceV1 {
  const maintenance = PUBLIC_CORE_TEST_MAINTENANCE.get(store);
  if (!maintenance) fail(503, "public_core_test_maintenance_unavailable");
  return maintenance;
}
