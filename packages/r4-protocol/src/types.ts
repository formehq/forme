export type Sha256 = `sha256:${string}`;
export type OpaqueId = string;
export type UtcTimestamp = string;

export type RoomKind = "third_place_public" | "private_grant_only";
export type InteractionMode = "public_single" | "invite_only" | "closed";
export type RoomStatus = "active" | "retired";
export type ProjectionOwnerState = "published_fresh" | "stale" | "superseded" | "revoked" | "expired";
export type CurationState = "not_admitted" | "admitted" | "unlisted";
export type ProjectionAttribution = "owner_confirmed" | "inferred_allowed" | "unresolved_allowed";
export type ProjectionBasisSourceKind =
  | "owner_frame"
  | "owner_unresolved"
  | "owner_corrected_reflection"
  | "inferred_reflection"
  | "r3_effect"
  | "projection_owner_wording";
export type ProjectionBasisSemanticStatus =
  | "active"
  | "superseded"
  | "invalidated"
  | "proposed"
  | "approved"
  | "executed_current"
  | "rolled_back"
  | "indeterminate";

export interface RoomV1 {
  readonly schemaVersion: "room.v1";
  readonly roomId: OpaqueId;
  readonly entityId: OpaqueId;
  readonly roomKind: RoomKind;
  readonly interactionMode: InteractionMode;
  readonly status: RoomStatus;
  readonly currentProjectionId: OpaqueId | null;
  readonly version: number;
  readonly createdAt: UtcTimestamp;
  readonly retiredAt: UtcTimestamp | null;
}

export interface ProjectionClaimV1 {
  readonly slot: "becoming" | "now" | "nextMove" | "tensions" | "openTo";
  readonly text: string;
  readonly attribution: ProjectionAttribution;
  readonly uncertainty: string | null;
}

export interface ProjectionCapsuleV1 {
  readonly schemaVersion: "projection_capsule.v1";
  readonly projectionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly entityId: OpaqueId;
  readonly title: string;
  readonly thirdPlaceSummary: string;
  readonly claims: readonly ProjectionClaimV1[];
  readonly supportedInteractions: readonly ("ask" | "seed" | "resonance")[];
  readonly allowedTopics: readonly string[];
  readonly unavailableTopics: readonly string[];
  readonly expectedResponseLatency: string;
  readonly visualThemeToken: string;
  readonly agencyStatement: string;
  readonly nonCommitmentStatement: string;
  readonly disclosureBasisId: OpaqueId;
  readonly publicationAttestationId: OpaqueId;
  readonly payloadHash: Sha256;
  readonly publishedAt: UtcTimestamp;
  readonly freshUntil: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
}

export interface ProjectionLifecycleV1 {
  readonly schemaVersion: "projection_lifecycle.v1";
  readonly projectionId: OpaqueId;
  readonly ownerState: ProjectionOwnerState;
  readonly curationState: CurationState;
  readonly current: boolean;
  readonly version: number;
  readonly changedAt: UtcTimestamp;
}

export interface ProjectionBasisClaimV1 {
  readonly slot: ProjectionClaimV1["slot"];
  readonly claimText: string;
  readonly attribution: ProjectionAttribution;
  readonly disclosureClass: string;
  readonly transformationClass: "exact" | "transformed" | "owner_edited";
  readonly sourceKind: ProjectionBasisSourceKind;
  readonly sourceReference: OpaqueId;
  readonly sourceContentHash: Sha256;
  readonly semanticStatus: ProjectionBasisSemanticStatus;
}

export interface ProjectionBasisV1 {
  readonly schemaVersion: "projection_basis.v1";
  readonly basisId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly twinRevision: number;
  readonly twinRevisionHash: Sha256;
  readonly workspaceContractHash: Sha256;
  readonly projectionPolicyGeneration: number;
  readonly projectionPolicyHash: Sha256;
  readonly claims: readonly ProjectionBasisClaimV1[];
  readonly payloadHash: Sha256;
  readonly ownerDecisionId: OpaqueId;
  readonly ownerDecisionHash: Sha256;
  readonly localReceiptId: OpaqueId | null;
  readonly hostedReceiptId: OpaqueId | null;
}

export type CapabilityState = "issued" | "consumed" | "revoked" | "replaced" | "expired" | "invalidated";
export type GrantPresetId = "one_visit" | "short_exchange" | "familiar_collaborator" | "trusted_collaborator";

export interface PublicEncounterV1 {
  readonly schemaVersion: "public_encounter.v1";
  readonly encounterId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly secretDigest: Sha256;
  readonly state: CapabilityState;
  readonly issuedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly acceptedCount: number;
  readonly unresolvedInteractionId: OpaqueId | null;
}

export interface GrantV1 {
  readonly schemaVersion: "grant.v1";
  readonly grantId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly reentryChainId: OpaqueId;
  readonly presetId: GrantPresetId;
  readonly secretDigest: Sha256;
  readonly state: CapabilityState;
  readonly issuedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly acceptedCount: number;
  readonly acceptedQuota: number;
  readonly unresolvedInteractionId: OpaqueId | null;
  readonly agentDerivationAllowed: boolean;
  readonly replacedGrantId: OpaqueId | null;
}

export type GrantOfferState = "issued" | "accepted" | "owner_revoked" | "expired" | "invalidated";

export interface GrantOfferV1 {
  readonly schemaVersion: "grant_offer.v1";
  readonly offerId: OpaqueId;
  readonly sourceInteractionId: OpaqueId;
  readonly targetRoomId: OpaqueId;
  readonly targetProjectionId: OpaqueId;
  readonly presetId: GrantPresetId;
  readonly state: GrantOfferState;
  readonly issuedAt: UtcTimestamp;
  readonly acceptanceExpiresAt: UtcTimestamp;
  readonly offeredGrantExpiresAt: UtcTimestamp;
}

export interface DirectGrantInviteV1 {
  readonly schemaVersion: "direct_grant_invite.v1";
  readonly inviteId: OpaqueId;
  readonly targetRoomId: OpaqueId;
  readonly targetProjectionId: OpaqueId;
  readonly presetId: GrantPresetId;
  readonly secretDigest: Sha256;
  readonly state: "issued" | "redeemed" | "owner_revoked" | "expired" | "invalidated";
  readonly issuedAt: UtcTimestamp;
  readonly redemptionExpiresAt: UtcTimestamp;
  readonly offeredGrantExpiresAt: UtcTimestamp;
}

export interface AgentDerivativeV1 {
  readonly schemaVersion: "agent_derivative.v1";
  readonly derivativeId: OpaqueId;
  readonly parentCapabilityId: OpaqueId;
  readonly parentCapabilityClass: "public_encounter.v1" | "grant.v1";
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly secretDigest: Sha256;
  readonly state: CapabilityState;
  readonly issuedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly acceptedCount: number;
}

export type InteractionType = "ask" | "seed" | "resonance";
export type GuestCapsuleLevel = "g0_manual" | "g1_lightweight" | "g2_agent_projection";
export type InteractionConsent = "allow_owner_local_ai" | "manual_owner_only";

export interface GuestCapsuleV1 {
  readonly schemaVersion: "guest_capsule.v1";
  readonly level: GuestCapsuleLevel;
  readonly pseudonym: string | null;
  readonly currentFocus: string | null;
  readonly offer: string | null;
  readonly seek: string | null;
  readonly openQuestion: string | null;
  readonly declaredSourceClass: string | null;
  readonly scopeLabel: string | null;
  readonly freshnessAt: UtcTimestamp | null;
  readonly guestSchemaVersion: string | null;
  readonly consentStatement: string | null;
}

export type SpendLimit =
  | { readonly mode: "incremental"; readonly maximumUsd: number }
  | { readonly mode: "not_applicable"; readonly maximumUsd: null };

export interface SessionBudgetV1 {
  readonly wallClockSeconds: number;
  readonly providerDispatches: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly spend: SpendLimit;
}

export interface ConsentEnvelopeV1 {
  readonly schemaVersion: "consent_envelope.v1";
  readonly consentEnvelopeId: OpaqueId;
  readonly provider: "OpenAI";
  readonly ownerAccountRegime: string;
  readonly sourceClass: "sanitized_current_forme_snapshot";
  readonly orientationClass: "body_path_free_twin_orientation";
  readonly guestCapsuleAllowed: boolean;
  readonly maximumBudget: SessionBudgetV1;
  readonly providerPolicyUrl: string;
  readonly providerPolicyHash: Sha256;
  readonly providerRetentionDisclosureHash: Sha256;
  readonly backupRetentionDisclosureHash: Sha256;
  readonly consentCopyHash: Sha256;
  readonly consentedAt: UtcTimestamp;
  readonly replyCapabilityId: OpaqueId;
  readonly replyCapabilityDigest: Sha256;
}

export type InteractionState =
  | "accepted"
  | "seen_locally"
  | "preparing"
  | "response_ready"
  | "closed_without_response"
  | "interaction_expired"
  | "interaction_deleted"
  | "origin_revoked"
  | "room_retired";

export interface InteractionV1 {
  readonly schemaVersion: "interaction.v1";
  readonly interactionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly originProjectionHash: Sha256;
  readonly originStateAtAcceptance: ProjectionOwnerState;
  readonly interactionType: InteractionType;
  readonly requestText: string;
  readonly guestCapsule: GuestCapsuleV1 | null;
  readonly consent: InteractionConsent;
  readonly consentEnvelope: ConsentEnvelopeV1 | null;
  readonly acceptedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly replyCapabilityDigest: Sha256;
  readonly deleteCapabilityDigest: Sha256;
  readonly state: InteractionState;
  readonly stateVersion: number;
}

export type ResponseState =
  | "available"
  | "response_expired"
  | "response_revoked"
  | "origin_revoked"
  | "interaction_deleted"
  | "room_retired";

/**
 * System-derived response provenance. This is intentionally a closed enum:
 * neither the model nor an Owner-entered label may describe its own source.
 */
export type ResponseSourceDisclosureClass =
  | "fresh_native_sanitized_snapshot_owner_reviewed"
  | "manual_owner_authored";

export interface ResponseV1 {
  readonly schemaVersion: "response.v1";
  readonly responseId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly body: string;
  readonly candidateHash: Sha256;
  readonly originStateAtPublication: ProjectionOwnerState;
  readonly sourceDisclosureClass: ResponseSourceDisclosureClass;
  readonly localBasisAttestationId: OpaqueId;
  readonly approvalAttestationId: OpaqueId;
  readonly publicationReceiptId: OpaqueId;
  readonly publishedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly state: ResponseState;
  readonly stateVersion: number;
}

export interface ArtifactApprovalV1 {
  readonly schemaVersion: "artifact_approval.v1";
  readonly approvalId: OpaqueId;
  readonly artifactClass: "projection" | "response";
  readonly artifactHash: Sha256;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly interactionId: OpaqueId | null;
  readonly basisHash: Sha256;
  readonly policyHash: Sha256;
  readonly approvedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly operationId: OpaqueId;
}

/**
 * Privacy-safe proof that one exact public artifact crossed one current
 * per-Room binding. The HMAC authenticates only this public envelope; private
 * approval and basis records never become wire fields.
 */
export interface PublicationAttestationV1 {
  readonly schemaVersion: "publication_attestation.v1";
  readonly attestationId: OpaqueId;
  readonly bindingId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly artifactClass: "projection" | "response";
  readonly artifactId: OpaqueId;
  readonly artifactHash: Sha256;
  readonly issuedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly hmacSha256: Sha256;
}

/** Exact public Response bytes accepted by the hosted publication boundary. */
export interface ResponsePublicationV1 {
  readonly schemaVersion: "response_publication.v1";
  readonly responseId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly body: string;
  readonly candidateHash: Sha256;
  readonly originStateAtPublication: Exclude<ProjectionOwnerState, "revoked">;
  readonly sourceDisclosureClass: ResponseSourceDisclosureClass;
  readonly localBasisAttestationId: OpaqueId;
  readonly payloadHash: Sha256;
  readonly publishedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
}

/**
 * The only canonical local-to-hosted publication DTO. Exactly one arm is
 * populated, and the accompanying attestation is bound to that arm's public
 * payload hash.
 */
export type HostedPublicationDeliveryV1 =
  | {
      readonly schemaVersion: "hosted_publication_delivery.v1";
      readonly artifactClass: "projection";
      readonly projection: ProjectionCapsuleV1;
      readonly response: null;
      readonly attestation: PublicationAttestationV1;
    }
  | {
      readonly schemaVersion: "hosted_publication_delivery.v1";
      readonly artifactClass: "response";
      readonly projection: null;
      readonly response: ResponsePublicationV1;
      readonly attestation: PublicationAttestationV1;
    };

export type NotificationEndpointState = "absent" | "verification_pending" | "confirmed" | "cleared";
export type NoticeState =
  | "absent"
  | "ready_pending"
  | "submitting"
  | "canceled"
  | "provider_accepted"
  | "delivery_unknown"
  | "failed";

export interface NotificationEndpointV1 {
  readonly schemaVersion: "notification_endpoint.v1";
  readonly interactionId: OpaqueId;
  readonly state: NotificationEndpointState;
  readonly encryptedAddress: string | null;
  readonly redactedMarker: string | null;
  readonly verificationExpiresAt: UtcTimestamp | null;
  readonly verificationAttempts: number;
  readonly verificationSendsThisHour: number;
  readonly confirmedAt: UtcTimestamp | null;
  readonly version: number;
}

export interface ReadyNoticeV1 {
  readonly schemaVersion: "ready_notice.v1";
  readonly noticeId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly responseId: OpaqueId;
  readonly state: NoticeState;
  readonly encryptedDeliveryTarget: string | null;
  readonly stableAttemptId: OpaqueId | null;
  readonly providerIdempotencyKey: string | null;
  readonly attemptNumber: number;
  readonly leaseExpiresAt: UtcTimestamp | null;
  readonly reconciliationDeadline: UtcTimestamp | null;
  readonly noFutureRetry: boolean;
  readonly version: number;
}

export interface ResponseOrientationV1 {
  readonly schemaVersion: "response_orientation.v1";
  readonly orientationId: OpaqueId;
  readonly entityName: string;
  readonly ownerIntent: string;
  readonly currentState: string;
  readonly nextMove: string;
  readonly publicClaimSummary: readonly string[];
  readonly eligibleCorrectionSummaries: readonly string[];
  readonly eligibleUnresolvedItems: readonly string[];
  readonly localTwinRevision: number;
  readonly localTwinContentHash: Sha256;
  readonly contentHash: Sha256;
}

export interface ResponseSourcePolicyV1 {
  readonly schemaVersion: "response_source_policy.v1";
  readonly policyId: OpaqueId;
  readonly allowedRootFiles: readonly string[];
  readonly allowedDirectoryRoots: readonly string[];
  readonly allowedExtensions: readonly string[];
  readonly maximumFileBytes: number;
  readonly maximumTotalBytes: number;
  readonly secretPatternPolicyVersion: string;
  readonly secretPatternPolicyHash: Sha256;
  readonly policyHash: Sha256;
}

export interface SnapshotFileV1 {
  readonly canonicalPath: string;
  readonly contentHash: Sha256;
  readonly byteCount: number;
}

export interface ResponseSourceSnapshotV1 {
  readonly schemaVersion: "response_source_snapshot.v1";
  readonly snapshotId: OpaqueId;
  readonly repositoryHead: string;
  readonly repositoryTreeHash: Sha256;
  readonly policyId: OpaqueId;
  readonly policyHash: Sha256;
  readonly files: readonly SnapshotFileV1[];
  readonly fileCount: number;
  readonly totalBytes: number;
  readonly manifestHash: Sha256;
  readonly createdAt: UtcTimestamp;
}

export interface SessionEnvelopeV1 {
  readonly schemaVersion: "session_envelope.v1";
  readonly sessionEnvelopeId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly consentEnvelopeId: OpaqueId;
  readonly consentEnvelopeHash: Sha256;
  readonly provider: "OpenAI";
  readonly modelId: string;
  readonly ownerAccountRegime: string;
  readonly sourceClass: "sanitized_current_forme_snapshot";
  readonly orientationClass: "body_path_free_twin_orientation";
  readonly guestCapsuleIncluded: boolean;
  readonly budget: SessionBudgetV1;
  readonly sourcePolicyHash: Sha256;
  readonly snapshotManifestHash: Sha256;
  readonly orientationHash: Sha256;
  readonly providerRetentionDisclosureHash: Sha256;
  readonly outputSchemaHash: Sha256;
  readonly preparedAt: UtcTimestamp;
  readonly authorityExpiresAt: UtcTimestamp;
}

export interface ResponseCandidateV1 {
  readonly schemaVersion: "response_candidate.v1";
  readonly candidateId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly sessionEnvelopeId: OpaqueId | null;
  readonly roomId: OpaqueId;
  readonly projectionId: OpaqueId;
  readonly originState: ProjectionOwnerState;
  readonly responseText: string;
  readonly sourceDisclosureClass: ResponseSourceDisclosureClass;
  readonly twinBasisHash: Sha256;
  readonly snapshotManifestHash: Sha256 | null;
  readonly sessionReceiptHash: Sha256;
  readonly policyHash: Sha256;
  readonly candidateHash: Sha256;
  readonly admittedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
}

export type FreshCycleState = "unreserved" | "reserved" | "dispatch_committed" | "released_zero_dispatch";

export interface FreshCycleReservationV1 {
  readonly schemaVersion: "fresh_cycle_reservation.v1";
  readonly reservationId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly startAuthorizationHash: Sha256;
  readonly sessionEnvelopeHash: Sha256;
  readonly state: FreshCycleState;
  readonly idempotencyKey: string;
  readonly reservedAt: UtcTimestamp | null;
  readonly firstDispatchCommittedAt: UtcTimestamp | null;
  readonly version: number;
}

export interface DispatchPermitV1 {
  readonly schemaVersion: "dispatch_permit.v1";
  readonly permitId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly reservationId: OpaqueId;
  readonly sessionEnvelopeHash: Sha256;
  readonly startAuthorizationHash: Sha256;
  readonly provider: "OpenAI";
  readonly modelId: string;
  readonly payloadHash: Sha256;
  readonly dispatchOrdinal: number;
  readonly idempotencyKey: string;
  readonly issuedAt: UtcTimestamp;
  readonly expiresAt: UtcTimestamp;
  readonly consumedAt: UtcTimestamp | null;
}

export interface SessionReceiptV1 {
  readonly schemaVersion: "session_receipt.v1";
  readonly receiptId: OpaqueId;
  readonly interactionId: OpaqueId;
  readonly sessionEnvelopeId: OpaqueId | null;
  readonly sessionEnvelopeHash: Sha256 | null;
  readonly startedAt: UtcTimestamp;
  readonly finishedAt: UtcTimestamp;
  readonly provider: "OpenAI" | null;
  readonly modelId: string | null;
  readonly terminalStatus: "candidate_admitted" | "manual_only" | "failed" | "budget_stopped" | "terminal_aborted";
  readonly dispatches: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly applicableSpendUsd: number | null;
  readonly sourceQueryCount: number;
  readonly sourceResultBytes: number;
  readonly accessEvidenceDigest: Sha256 | null;
  readonly policyHash: Sha256;
  readonly schemaHash: Sha256;
  readonly runtimeVersion: string;
  readonly errorCode: string | null;
  readonly expiresAt: UtcTimestamp;
}

export interface OperationReceiptV1 {
  readonly schemaVersion: "operation_receipt.v1";
  readonly receiptId: OpaqueId;
  readonly actorClass: string;
  readonly action: string;
  readonly idempotencyKey: string;
  readonly canonicalRequestHash: Sha256;
  readonly targetId: OpaqueId;
  readonly targetVersion: number;
  readonly status: "committed" | "no_op" | "rejected" | "terminal";
  readonly committedAt: UtcTimestamp;
  readonly bodyFreeCode: string;
}

/**
 * Body-free hosted-to-local convergence metadata. `payloadHash` binds the
 * hosted object's body-free event payload/version; it is deliberately not a
 * content field and the event never carries Guest, Projection, or Response
 * bodies, paths, capabilities, credentials, or tokens.
 */
export type RoomEventObjectType =
  | "room"
  | "projection"
  | "interaction"
  | "response"
  | "grant"
  | "notification"
  | "purge";

export interface RoomEventV1 {
  readonly schemaVersion: "room_event.v1";
  readonly eventId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly sequence: number;
  readonly objectType: RoomEventObjectType;
  readonly objectId: OpaqueId;
  readonly eventType: string;
  readonly objectVersion: number;
  readonly payloadHash: Sha256;
  readonly committedAt: UtcTimestamp;
  readonly bodyAvailable: boolean;
}

export interface RoomEventBatchV1 {
  readonly schemaVersion: "room_event_batch.v1";
  readonly roomId: OpaqueId;
  readonly afterSequence: number;
  readonly highWater: number;
  readonly events: readonly RoomEventV1[];
}

/** Explicit 410 reconciliation view; it never claims historical completeness. */
export interface CursorGoneV1 {
  readonly schemaVersion: "cursor_gone.v1";
  readonly roomId: OpaqueId;
  readonly afterSequence: number;
  readonly highWater: number;
  readonly earliestReplayableSequence: number;
  readonly liveEvents: readonly RoomEventV1[];
  readonly tombstoneIds: readonly OpaqueId[];
}

export interface RoomEventAckV1 {
  readonly schemaVersion: "room_event_ack.v1";
  readonly roomId: OpaqueId;
  readonly eventId: OpaqueId;
  readonly sequence: number;
  readonly eventHash: Sha256;
  readonly idempotencyKey: string;
}

export interface RoomEventAckReceiptV1 {
  readonly schemaVersion: "room_event_ack_receipt.v1";
  readonly receiptId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly eventId: OpaqueId;
  readonly sequence: number;
  readonly eventHash: Sha256;
  readonly idempotencyKey: string;
  readonly committedAt: UtcTimestamp;
}

export type ApiActorClass =
  | "public"
  | "manual_guest"
  | "guest_agent"
  | "controller"
  | "curator"
  | "room_operator.v1"
  | "janitor";

export interface ApiMutationEnvelopeV1 {
  readonly schemaVersion: "api_mutation_envelope.v1";
  readonly actorClass: ApiActorClass;
  readonly action: string;
  readonly idempotencyKey: string;
  readonly canonicalRequestHash: Sha256;
  readonly expectedObjectVersion: number | null;
  readonly predecessorHash: Sha256 | null;
  readonly payloadHash: Sha256;
}

export interface ProjectionReadViewV1 {
  readonly schemaVersion: "projection_read_view.v1";
  readonly room: RoomV1;
  readonly projection: ProjectionCapsuleV1;
  readonly lifecycle: ProjectionLifecycleV1;
  readonly warning: "stale_projection" | null;
  readonly cacheControl: "no-store";
}

export type RoomOperatorAction =
  | "inspect"
  | "sync"
  | "pull_exact_request"
  | "reserve_fresh_cycle"
  | "recover_fresh_cycle"
  | "abandon_zero_dispatch"
  | "issue_dispatch_permit"
  | "recover_dispatch_permit"
  | "ack_event"
  | "recover_ack"
  | "deliver_projection"
  | "deliver_response"
  | "attest_stale"
  | "attest_local_purge";

export interface RoomOperatorRequestV1 {
  readonly schemaVersion: "room_operator_request.v1";
  readonly bindingId: OpaqueId;
  readonly roomId: OpaqueId;
  readonly action: RoomOperatorAction;
  readonly mutation: ApiMutationEnvelopeV1 | null;
  readonly exactTargetId: OpaqueId | null;
}

export interface SnapshotLineReadV1 {
  readonly schemaVersion: "snapshot_line_read.v1";
  readonly canonicalPath: string;
  readonly lineStart: number;
  readonly lineEnd: number;
}

export interface SnapshotSearchV1 {
  readonly schemaVersion: "snapshot_search.v1";
  readonly pattern: string;
  readonly patternKind: "literal" | "re2";
}

export type SnapshotQueryV1 = SnapshotLineReadV1 | SnapshotSearchV1;

export interface SnapshotQueryResultV1 {
  readonly schemaVersion: "snapshot_query_result.v1";
  readonly queryHash: Sha256;
  readonly status: "ok" | "not_found" | "rejected" | "timeout";
  readonly resultText: string | null;
  readonly matchCount: number;
  readonly resultBytes: number;
  readonly bodyFreeErrorCode: string | null;
}

/** Pure boundary contract; concrete filesystem/runtime access belongs to r4-local. */
export interface SnapshotQueryBrokerV1 {
  readonly protocolVersion: "snapshot_query_broker.v1";
  evaluate(query: SnapshotQueryV1): SnapshotQueryResultV1;
}

export interface TransportDispatchIntentV1 {
  readonly schemaVersion: "transport_dispatch_intent.v1";
  readonly interactionId: OpaqueId;
  readonly reservationId: OpaqueId;
  readonly sessionEnvelopeHash: Sha256;
  readonly startAuthorizationHash: Sha256;
  readonly provider: "OpenAI";
  readonly modelId: string;
  readonly payloadHash: Sha256;
  readonly dispatchOrdinal: number;
  readonly countedInputTokens: number;
  readonly reservedOutputTokens: number;
  readonly reservedApplicableSpendUsd: number | null;
  readonly idempotencyKey: string;
}

export interface TransportGateDecisionV1 {
  readonly schemaVersion: "transport_gate_decision.v1";
  readonly allowed: boolean;
  readonly code: string;
  readonly permit: DispatchPermitV1 | null;
  readonly bodyFreeReceipt: OperationReceiptV1;
}

/** Pure boundary contract; concrete provider authentication/transport belongs to r4-local. */
export interface ResponseTransportGateV1 {
  readonly protocolVersion: "response_transport_gate.v1";
  authorize(intent: TransportDispatchIntentV1): TransportGateDecisionV1;
}

export type ProtocolObjectV1 =
  | RoomV1
  | ProjectionCapsuleV1
  | ProjectionLifecycleV1
  | ProjectionBasisV1
  | PublicEncounterV1
  | GrantV1
  | GrantOfferV1
  | DirectGrantInviteV1
  | AgentDerivativeV1
  | GuestCapsuleV1
  | ConsentEnvelopeV1
  | InteractionV1
  | ResponseV1
  | ArtifactApprovalV1
  | HostedPublicationDeliveryV1
  | NotificationEndpointV1
  | ReadyNoticeV1
  | ResponseOrientationV1
  | ResponseSourcePolicyV1
  | ResponseSourceSnapshotV1
  | SessionEnvelopeV1
  | ResponseCandidateV1
  | FreshCycleReservationV1
  | DispatchPermitV1
  | SessionReceiptV1
  | OperationReceiptV1
  | RoomEventV1
  | RoomEventBatchV1
  | CursorGoneV1
  | RoomEventAckV1
  | RoomEventAckReceiptV1
  | ApiMutationEnvelopeV1
  | ProjectionReadViewV1
  | RoomOperatorRequestV1
  | SnapshotLineReadV1
  | SnapshotSearchV1
  | SnapshotQueryResultV1
  | TransportDispatchIntentV1
  | TransportGateDecisionV1;
