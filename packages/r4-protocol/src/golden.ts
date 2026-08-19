import { canonicalJson, canonicalSha256 } from "./canonical.ts";
import { createApiMutationEnvelopeV1, createProjectionReadViewV1 } from "./constructors.ts";
import { deriveGrantUse, deriveProjectionRead, isSessionEnvelopeConsentSubset, validateP0Budget } from "./state.ts";
import type {
  AgentDerivativeV1,
  ArtifactApprovalV1,
  ProjectionReadViewV1,
  ConsentEnvelopeV1,
  DirectGrantInviteV1,
  DispatchPermitV1,
  FreshCycleReservationV1,
  GrantOfferV1,
  GrantV1,
  GuestCapsuleV1,
  HostedPublicationDeliveryV1,
  InteractionV1,
  NotificationEndpointV1,
  OperationReceiptV1,
  ProjectionBasisV1,
  ProjectionCapsuleV1,
  ProjectionLifecycleV1,
  PublicationAttestationV1,
  PublicEncounterV1,
  ReadyNoticeV1,
  CursorGoneV1,
  ResponseCandidateV1,
  ResponseOrientationV1,
  ResponsePublicationV1,
  ResponseSourcePolicyV1,
  ResponseSourceSnapshotV1,
  ResponseV1,
  RoomV1,
  RoomEventAckReceiptV1,
  RoomEventAckV1,
  RoomEventBatchV1,
  RoomEventV1,
  RoomOperatorRequestV1,
  SessionEnvelopeV1,
  SessionReceiptV1,
  Sha256,
  SnapshotLineReadV1,
  SnapshotQueryResultV1,
  SnapshotSearchV1,
  TransportDispatchIntentV1,
  TransportGateDecisionV1,
} from "./types.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const T15M = "2026-08-03T12:15:00.000Z";
const T1H = "2026-08-03T13:00:00.000Z";
const T1D = "2026-08-04T12:00:00.000Z";
const T7D = "2026-08-10T12:00:00.000Z";
const T30D = "2026-09-02T12:00:00.000Z";

function id(prefix: string, seed: string): string {
  return `${prefix}_${seed.repeat(32).slice(0, 32)}`;
}

function hash(seed: string): Sha256 {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

export const GOLDEN_ROOM: RoomV1 = {
  schemaVersion: "room.v1",
  roomId: id("room", "a"),
  entityId: id("entity", "b"),
  roomKind: "third_place_public",
  interactionMode: "public_single",
  status: "active",
  currentProjectionId: id("proj", "c"),
  version: 1,
  createdAt: T0,
  retiredAt: null,
};

const GOLDEN_PROJECTION_PREIMAGE: Omit<ProjectionCapsuleV1, "payloadHash"> = {
  schemaVersion: "projection_capsule.v1",
  projectionId: id("proj", "c"),
  roomId: GOLDEN_ROOM.roomId,
  entityId: GOLDEN_ROOM.entityId,
  title: "Forme Project",
  thirdPlaceSummary: "A shallow, Owner-approved view of the project.",
  claims: [
    { slot: "now", text: "R4 Gate A is ready for bounded repository work.", attribution: "owner_confirmed", uncertainty: null },
    { slot: "nextMove", text: "Prove the protocol locally before any real integration.", attribution: "inferred_allowed", uncertainty: "Implementation evidence is not yet complete." },
    { slot: "tensions", text: "The official Codex adapter proof remains unresolved.", attribution: "unresolved_allowed", uncertainty: null },
  ],
  supportedInteractions: ["ask", "seed", "resonance"],
  allowedTopics: ["Forme", "R4"],
  unavailableTopics: ["private source bodies"],
  expectedResponseLatency: "Owner-reviewed and asynchronous",
  visualThemeToken: "forme_clean_v1",
  agencyStatement: "A local Forme Agent may prepare a candidate after Owner start.",
  nonCommitmentStatement: "This Projection cannot commit the Owner.",
  disclosureBasisId: id("basis", "d"),
  publicationAttestationId: id("att", "e"),
  publishedAt: T0,
  freshUntil: T1D,
  expiresAt: T7D,
};

export const GOLDEN_PROJECTION: ProjectionCapsuleV1 = {
  ...GOLDEN_PROJECTION_PREIMAGE,
  payloadHash: canonicalSha256(GOLDEN_PROJECTION_PREIMAGE),
};

export const GOLDEN_PROJECTION_LIFECYCLE: ProjectionLifecycleV1 = {
  schemaVersion: "projection_lifecycle.v1",
  projectionId: GOLDEN_PROJECTION.projectionId,
  ownerState: "published_fresh",
  curationState: "admitted",
  current: true,
  version: 1,
  changedAt: T0,
};

export const GOLDEN_PROJECTION_BASIS: ProjectionBasisV1 = {
  schemaVersion: "projection_basis.v1",
  basisId: GOLDEN_PROJECTION.disclosureBasisId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  roomId: GOLDEN_ROOM.roomId,
  twinRevision: 25,
  twinRevisionHash: hash("2"),
  workspaceContractHash: hash("3"),
  projectionPolicyGeneration: 1,
  projectionPolicyHash: hash("4"),
  claims: [
    {
      slot: "now",
      claimText: GOLDEN_PROJECTION.claims[0]?.text ?? "",
      attribution: "owner_confirmed",
      disclosureClass: "current_owner_frame",
      transformationClass: "exact",
      sourceKind: "owner_frame",
      sourceReference: id("src", "f"),
      sourceContentHash: hash("5"),
      semanticStatus: "active",
    },
    {
      slot: "nextMove",
      claimText: GOLDEN_PROJECTION.claims[1]?.text ?? "",
      attribution: "inferred_allowed",
      disclosureClass: "active_inference_with_uncertainty",
      transformationClass: "exact",
      sourceKind: "inferred_reflection",
      sourceReference: id("src", "g"),
      sourceContentHash: hash("6"),
      semanticStatus: "active",
    },
    {
      slot: "tensions",
      claimText: GOLDEN_PROJECTION.claims[2]?.text ?? "",
      attribution: "unresolved_allowed",
      disclosureClass: "current_owner_unresolved",
      transformationClass: "exact",
      sourceKind: "owner_unresolved",
      sourceReference: id("src", "h"),
      sourceContentHash: hash("7"),
      semanticStatus: "active",
    },
  ],
  payloadHash: GOLDEN_PROJECTION.payloadHash,
  ownerDecisionId: id("decision", "h"),
  ownerDecisionHash: hash("8"),
  localReceiptId: id("receipt", "i"),
  hostedReceiptId: null,
};

export const GOLDEN_PUBLIC_ENCOUNTER: PublicEncounterV1 = {
  schemaVersion: "public_encounter.v1",
  encounterId: id("encounter", "j"),
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  secretDigest: hash("8"),
  state: "issued",
  issuedAt: T0,
  expiresAt: T1D,
  acceptedCount: 0,
  unresolvedInteractionId: null,
};

export const GOLDEN_GRANT: GrantV1 = {
  schemaVersion: "grant.v1",
  grantId: id("grant", "k"),
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  reentryChainId: id("chain", "l"),
  presetId: "trusted_collaborator",
  secretDigest: hash("9"),
  state: "issued",
  issuedAt: T0,
  expiresAt: T7D,
  acceptedCount: 0,
  acceptedQuota: 10,
  unresolvedInteractionId: null,
  agentDerivationAllowed: true,
  replacedGrantId: null,
};

export const GOLDEN_GRANT_OFFER: GrantOfferV1 = {
  schemaVersion: "grant_offer.v1",
  offerId: id("offer", "m"),
  sourceInteractionId: id("interaction", "n"),
  targetRoomId: GOLDEN_ROOM.roomId,
  targetProjectionId: GOLDEN_PROJECTION.projectionId,
  presetId: "familiar_collaborator",
  state: "issued",
  issuedAt: T0,
  acceptanceExpiresAt: T1D,
  offeredGrantExpiresAt: T7D,
};

export const GOLDEN_DIRECT_INVITE: DirectGrantInviteV1 = {
  schemaVersion: "direct_grant_invite.v1",
  inviteId: id("invite", "o"),
  targetRoomId: GOLDEN_ROOM.roomId,
  targetProjectionId: GOLDEN_PROJECTION.projectionId,
  presetId: "short_exchange",
  secretDigest: hash("a"),
  state: "issued",
  issuedAt: T0,
  redemptionExpiresAt: T1D,
  offeredGrantExpiresAt: "2026-08-06T12:00:00.000Z",
};

export const GOLDEN_AGENT_DERIVATIVE: AgentDerivativeV1 = {
  schemaVersion: "agent_derivative.v1",
  derivativeId: id("derivative", "p"),
  parentCapabilityId: GOLDEN_GRANT.grantId,
  parentCapabilityClass: "grant.v1",
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  secretDigest: hash("b"),
  state: "issued",
  issuedAt: T0,
  expiresAt: T15M,
  acceptedCount: 0,
};

export const GOLDEN_CONSENT: ConsentEnvelopeV1 = {
  schemaVersion: "consent_envelope.v1",
  consentEnvelopeId: id("consent", "q"),
  provider: "OpenAI",
  ownerAccountRegime: "synthetic_test_only",
  sourceClass: "sanitized_current_forme_snapshot",
  orientationClass: "body_path_free_twin_orientation",
  guestCapsuleAllowed: true,
  maximumBudget: {
    wallClockSeconds: 3_600,
    providerDispatches: 3,
    inputTokens: 128_000,
    outputTokens: 8_000,
    spend: { mode: "incremental", maximumUsd: 1 },
  },
  providerPolicyUrl: "https://example.invalid/openai-policy",
  providerPolicyHash: hash("c"),
  providerRetentionDisclosureHash: hash("d"),
  backupRetentionDisclosureHash: hash("e"),
  consentCopyHash: hash("f"),
  consentedAt: T0,
  replyCapabilityId: id("reply", "r"),
  replyCapabilityDigest: hash("0"),
};

export const GOLDEN_GUEST_CAPSULE: GuestCapsuleV1 = {
  schemaVersion: "guest_capsule.v1",
  level: "g1_lightweight",
  pseudonym: "Synthetic Guest",
  currentFocus: "Understand Forme",
  offer: null,
  seek: "A bounded answer",
  openQuestion: "What matters now?",
  declaredSourceClass: null,
  scopeLabel: null,
  freshnessAt: null,
  guestSchemaVersion: null,
  consentStatement: null,
};

export const GOLDEN_INTERACTION: InteractionV1 = {
  schemaVersion: "interaction.v1",
  interactionId: id("interaction", "n"),
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  originProjectionHash: GOLDEN_PROJECTION.payloadHash,
  originStateAtAcceptance: "published_fresh",
  interactionType: "ask",
  requestText: "What would this project prioritize next?",
  guestCapsule: GOLDEN_GUEST_CAPSULE,
  consent: "allow_owner_local_ai",
  consentEnvelope: GOLDEN_CONSENT,
  acceptedAt: T0,
  expiresAt: T30D,
  replyCapabilityDigest: GOLDEN_CONSENT.replyCapabilityDigest,
  deleteCapabilityDigest: hash("1"),
  state: "accepted",
  stateVersion: 1,
};

const GOLDEN_ORIENTATION_PREIMAGE: Omit<ResponseOrientationV1, "contentHash"> = {
  schemaVersion: "response_orientation.v1",
  orientationId: id("orientation", "s"),
  entityName: "Forme",
  ownerIntent: "Build the R4 protocol without crossing Gate A.",
  currentState: "Packet approved; repository-only implementation is active.",
  nextMove: "Complete offline protocol evidence.",
  publicClaimSummary: ["Forme preserves Owner authority."],
  eligibleCorrectionSummaries: ["Recommendations are not authorization."],
  eligibleUnresolvedItems: ["Official adapter proof remains Yellow."],
  localTwinRevision: 25,
  localTwinContentHash: hash("2"),
};


export const GOLDEN_ORIENTATION: ResponseOrientationV1 = {
  ...GOLDEN_ORIENTATION_PREIMAGE,
  contentHash: canonicalSha256(GOLDEN_ORIENTATION_PREIMAGE),
};

const GOLDEN_SOURCE_POLICY_PREIMAGE: Omit<ResponseSourcePolicyV1, "policyHash"> = {
  schemaVersion: "response_source_policy.v1",
  policyId: id("policy", "t"),
  allowedRootFiles: ["README.md", "package*.json", "tsconfig.json"],
  allowedDirectoryRoots: ["docs/", "src/", "schemas/", "test/", "apps/", "packages/"],
  allowedExtensions: [".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".scss", ".html", ".sql", ".yaml", ".yml", ".toml"],
  maximumFileBytes: 512 * 1_024,
  maximumTotalBytes: 8 * 1_024 * 1_024,
  secretPatternPolicyVersion: "synthetic-secret-patterns.v1",
  secretPatternPolicyHash: hash("4"),
};

export const GOLDEN_SOURCE_POLICY: ResponseSourcePolicyV1 = {
  ...GOLDEN_SOURCE_POLICY_PREIMAGE,
  policyHash: canonicalSha256(GOLDEN_SOURCE_POLICY_PREIMAGE),
};

const GOLDEN_SNAPSHOT_PREIMAGE: Omit<ResponseSourceSnapshotV1, "manifestHash"> = {
  schemaVersion: "response_source_snapshot.v1",
  snapshotId: id("snapshot", "u"),
  repositoryHead: "0000000000000000000000000000000000000000",
  repositoryTreeHash: hash("6"),
  policyId: GOLDEN_SOURCE_POLICY.policyId,
  policyHash: GOLDEN_SOURCE_POLICY.policyHash,
  files: [{ canonicalPath: "README.md", contentHash: hash("7"), byteCount: 128 }],
  fileCount: 1,
  totalBytes: 128,
  createdAt: T0,
};

export const GOLDEN_SNAPSHOT: ResponseSourceSnapshotV1 = {
  ...GOLDEN_SNAPSHOT_PREIMAGE,
  manifestHash: canonicalSha256(GOLDEN_SNAPSHOT_PREIMAGE),
};

export const GOLDEN_SESSION: SessionEnvelopeV1 = {
  schemaVersion: "session_envelope.v1",
  sessionEnvelopeId: id("session", "v"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  consentEnvelopeId: GOLDEN_CONSENT.consentEnvelopeId,
  consentEnvelopeHash: canonicalSha256(GOLDEN_CONSENT),
  provider: "OpenAI",
  modelId: "synthetic-model-no-call",
  ownerAccountRegime: GOLDEN_CONSENT.ownerAccountRegime,
  sourceClass: GOLDEN_CONSENT.sourceClass,
  orientationClass: GOLDEN_CONSENT.orientationClass,
  guestCapsuleIncluded: true,
  budget: {
    wallClockSeconds: 3_600,
    providerDispatches: 3,
    inputTokens: 128_000,
    outputTokens: 8_000,
    spend: { mode: "incremental", maximumUsd: 1 },
  },
  sourcePolicyHash: GOLDEN_SOURCE_POLICY.policyHash,
  snapshotManifestHash: GOLDEN_SNAPSHOT.manifestHash,
  orientationHash: GOLDEN_ORIENTATION.contentHash,
  providerRetentionDisclosureHash: GOLDEN_CONSENT.providerRetentionDisclosureHash,
  outputSchemaHash: hash("a"),
  preparedAt: T0,
  authorityExpiresAt: T1H,
};

const GOLDEN_CANDIDATE_PREIMAGE: Omit<ResponseCandidateV1, "candidateHash"> = {
  schemaVersion: "response_candidate.v1",
  candidateId: id("candidate", "w"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  sessionEnvelopeId: GOLDEN_SESSION.sessionEnvelopeId,
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  originState: "published_fresh",
  responseText: "Prioritize proving the narrow protocol before real integration.",
  sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
  twinBasisHash: hash("b"),
  snapshotManifestHash: GOLDEN_SNAPSHOT.manifestHash,
  sessionReceiptHash: hash("9"),
  policyHash: GOLDEN_SOURCE_POLICY.policyHash,
  admittedAt: T0,
  expiresAt: T7D,
};

export const GOLDEN_CANDIDATE: ResponseCandidateV1 = {
  ...GOLDEN_CANDIDATE_PREIMAGE,
  candidateHash: canonicalSha256(GOLDEN_CANDIDATE_PREIMAGE),
};

export const GOLDEN_APPROVAL: ArtifactApprovalV1 = {
  schemaVersion: "artifact_approval.v1",
  approvalId: id("approval", "x"),
  artifactClass: "response",
  artifactHash: GOLDEN_CANDIDATE.candidateHash,
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  interactionId: GOLDEN_INTERACTION.interactionId,
  basisHash: GOLDEN_CANDIDATE.twinBasisHash,
  policyHash: GOLDEN_CANDIDATE.policyHash,
  approvedAt: T0,
  expiresAt: T1H,
  operationId: id("op", "y"),
};

export const GOLDEN_RESPONSE: ResponseV1 = {
  schemaVersion: "response.v1",
  responseId: id("response", "z"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  roomId: GOLDEN_ROOM.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  body: GOLDEN_CANDIDATE.responseText,
  candidateHash: GOLDEN_CANDIDATE.candidateHash,
  originStateAtPublication: "published_fresh",
  sourceDisclosureClass: GOLDEN_CANDIDATE.sourceDisclosureClass,
  localBasisAttestationId: id("att", "f"),
  approvalAttestationId: id("att", "e"),
  publicationReceiptId: id("receipt", "g"),
  publishedAt: T0,
  expiresAt: T7D,
  state: "available",
  stateVersion: 1,
};

const GOLDEN_RESPONSE_PUBLICATION_PREIMAGE: Omit<ResponsePublicationV1, "payloadHash"> = {
  schemaVersion: "response_publication.v1",
  responseId: GOLDEN_RESPONSE.responseId,
  interactionId: GOLDEN_CANDIDATE.interactionId,
  roomId: GOLDEN_CANDIDATE.roomId,
  projectionId: GOLDEN_CANDIDATE.projectionId,
  body: GOLDEN_CANDIDATE.responseText,
  candidateHash: GOLDEN_CANDIDATE.candidateHash,
  originStateAtPublication: GOLDEN_CANDIDATE.originState as Exclude<typeof GOLDEN_CANDIDATE.originState, "revoked">,
  sourceDisclosureClass: GOLDEN_CANDIDATE.sourceDisclosureClass,
  localBasisAttestationId: GOLDEN_RESPONSE.localBasisAttestationId,
  publishedAt: T0,
  expiresAt: T7D,
};

export const GOLDEN_RESPONSE_PUBLICATION: ResponsePublicationV1 = {
  ...GOLDEN_RESPONSE_PUBLICATION_PREIMAGE,
  payloadHash: canonicalSha256(GOLDEN_RESPONSE_PUBLICATION_PREIMAGE),
};

export const GOLDEN_PUBLICATION_ATTESTATION: PublicationAttestationV1 = {
  schemaVersion: "publication_attestation.v1",
  attestationId: GOLDEN_RESPONSE.approvalAttestationId,
  bindingId: id("binding", "p"),
  roomId: GOLDEN_RESPONSE_PUBLICATION.roomId,
  artifactClass: "response",
  artifactId: GOLDEN_RESPONSE_PUBLICATION.responseId,
  artifactHash: GOLDEN_RESPONSE_PUBLICATION.payloadHash,
  issuedAt: GOLDEN_RESPONSE_PUBLICATION.publishedAt,
  expiresAt: T15M,
  hmacSha256: hash("9"),
};

export const GOLDEN_HOSTED_PUBLICATION_DELIVERY: HostedPublicationDeliveryV1 = {
  schemaVersion: "hosted_publication_delivery.v1",
  artifactClass: "response",
  projection: null,
  response: GOLDEN_RESPONSE_PUBLICATION,
  attestation: GOLDEN_PUBLICATION_ATTESTATION,
};

export const GOLDEN_NOTIFICATION_ENDPOINT: NotificationEndpointV1 = {
  schemaVersion: "notification_endpoint.v1",
  interactionId: GOLDEN_INTERACTION.interactionId,
  state: "confirmed",
  encryptedAddress: "synthetic-ciphertext",
  redactedMarker: "confirmed-endpoint",
  verificationExpiresAt: null,
  verificationAttempts: 1,
  verificationSendsThisHour: 1,
  confirmedAt: T0,
  version: 2,
};

export const GOLDEN_READY_NOTICE: ReadyNoticeV1 = {
  schemaVersion: "ready_notice.v1",
  noticeId: id("notice", "h"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  responseId: GOLDEN_RESPONSE.responseId,
  state: "ready_pending",
  encryptedDeliveryTarget: "synthetic-target-ciphertext",
  stableAttemptId: null,
  providerIdempotencyKey: null,
  attemptNumber: 0,
  leaseExpiresAt: null,
  reconciliationDeadline: null,
  noFutureRetry: false,
  version: 1,
};

export const GOLDEN_FRESH_CYCLE: FreshCycleReservationV1 = {
  schemaVersion: "fresh_cycle_reservation.v1",
  reservationId: id("reservation", "i"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  startAuthorizationHash: hash("d"),
  sessionEnvelopeHash: hash("e"),
  state: "reserved",
  idempotencyKey: "synthetic-idempotency-key-0001",
  reservedAt: T0,
  firstDispatchCommittedAt: null,
  version: 1,
};

export const GOLDEN_DISPATCH_PERMIT: DispatchPermitV1 = {
  schemaVersion: "dispatch_permit.v1",
  permitId: id("permit", "j"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  reservationId: GOLDEN_FRESH_CYCLE.reservationId,
  sessionEnvelopeHash: GOLDEN_FRESH_CYCLE.sessionEnvelopeHash,
  startAuthorizationHash: GOLDEN_FRESH_CYCLE.startAuthorizationHash,
  provider: "OpenAI",
  modelId: GOLDEN_SESSION.modelId,
  payloadHash: hash("f"),
  dispatchOrdinal: 1,
  idempotencyKey: "synthetic-dispatch-key-0001",
  issuedAt: T0,
  expiresAt: "2026-08-03T12:00:30.000Z",
  consumedAt: null,
};

export const GOLDEN_SESSION_RECEIPT: SessionReceiptV1 = {
  schemaVersion: "session_receipt.v1",
  receiptId: id("receipt", "k"),
  interactionId: GOLDEN_INTERACTION.interactionId,
  sessionEnvelopeId: GOLDEN_SESSION.sessionEnvelopeId,
  sessionEnvelopeHash: GOLDEN_FRESH_CYCLE.sessionEnvelopeHash,
  startedAt: T0,
  finishedAt: T15M,
  provider: "OpenAI",
  modelId: GOLDEN_SESSION.modelId,
  terminalStatus: "candidate_admitted",
  dispatches: 1,
  inputTokens: 1_024,
  outputTokens: 128,
  applicableSpendUsd: 0.01,
  sourceQueryCount: 2,
  sourceResultBytes: 2_048,
  accessEvidenceDigest: hash("0"),
  policyHash: GOLDEN_SOURCE_POLICY.policyHash,
  schemaHash: GOLDEN_SESSION.outputSchemaHash,
  runtimeVersion: "synthetic-adapter.v1",
  errorCode: null,
  expiresAt: T30D,
};

export const GOLDEN_OPERATION_RECEIPT: OperationReceiptV1 = {
  schemaVersion: "operation_receipt.v1",
  receiptId: id("receipt", "l"),
  actorClass: "room_operator.v1",
  action: "response.publish",
  idempotencyKey: "synthetic-publication-key-0001",
  canonicalRequestHash: hash("1"),
  targetId: GOLDEN_RESPONSE.responseId,
  targetVersion: 1,
  status: "committed",
  committedAt: T0,
  bodyFreeCode: "response_ready",
};

export const GOLDEN_ROOM_EVENT: RoomEventV1 = {
  schemaVersion: "room_event.v1",
  eventId: id("event", "r"),
  roomId: GOLDEN_ROOM.roomId,
  sequence: 1,
  objectType: "interaction",
  objectId: GOLDEN_INTERACTION.interactionId,
  eventType: "interaction.accepted",
  objectVersion: GOLDEN_INTERACTION.stateVersion,
  payloadHash: canonicalSha256({
    schemaVersion: "room_event_payload.v1",
    roomId: GOLDEN_ROOM.roomId,
    objectType: "interaction",
    objectId: GOLDEN_INTERACTION.interactionId,
    eventType: "interaction.accepted",
    objectVersion: GOLDEN_INTERACTION.stateVersion,
    bodyAvailable: true,
  }),
  committedAt: T0,
  bodyAvailable: true,
};

export const GOLDEN_ROOM_EVENT_BATCH: RoomEventBatchV1 = {
  schemaVersion: "room_event_batch.v1",
  roomId: GOLDEN_ROOM.roomId,
  afterSequence: 0,
  highWater: 1,
  events: [GOLDEN_ROOM_EVENT],
};

export const GOLDEN_CURSOR_GONE: CursorGoneV1 = {
  schemaVersion: "cursor_gone.v1",
  roomId: GOLDEN_ROOM.roomId,
  afterSequence: 0,
  highWater: 1,
  earliestReplayableSequence: 2,
  liveEvents: [],
  tombstoneIds: [GOLDEN_INTERACTION.interactionId],
};

export const GOLDEN_ROOM_EVENT_ACK: RoomEventAckV1 = {
  schemaVersion: "room_event_ack.v1",
  roomId: GOLDEN_ROOM.roomId,
  eventId: GOLDEN_ROOM_EVENT.eventId,
  sequence: GOLDEN_ROOM_EVENT.sequence,
  eventHash: canonicalSha256(GOLDEN_ROOM_EVENT),
  idempotencyKey: "synthetic-room-event-ack-0001",
};

export const GOLDEN_ROOM_EVENT_ACK_RECEIPT: RoomEventAckReceiptV1 = {
  schemaVersion: "room_event_ack_receipt.v1",
  receiptId: id("receipt", "s"),
  roomId: GOLDEN_ROOM_EVENT_ACK.roomId,
  eventId: GOLDEN_ROOM_EVENT_ACK.eventId,
  sequence: GOLDEN_ROOM_EVENT_ACK.sequence,
  eventHash: GOLDEN_ROOM_EVENT_ACK.eventHash,
  idempotencyKey: GOLDEN_ROOM_EVENT_ACK.idempotencyKey,
  committedAt: T0,
};

export const GOLDEN_API_MUTATION = createApiMutationEnvelopeV1({
  actorClass: "room_operator.v1",
  action: "response.publish",
  idempotencyKey: "synthetic-publication-key-0001",
  expectedObjectVersion: 1,
  predecessorHash: null,
  payload: {
    approvalId: GOLDEN_APPROVAL.approvalId,
    candidateHash: GOLDEN_CANDIDATE.candidateHash,
    interactionId: GOLDEN_INTERACTION.interactionId,
  },
});

export const GOLDEN_PROJECTION_READ_VIEW: ProjectionReadViewV1 = createProjectionReadViewV1(
  GOLDEN_ROOM,
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_LIFECYCLE,
  { kind: "public" },
  T0,
);

export const GOLDEN_ROOM_OPERATOR_REQUEST: RoomOperatorRequestV1 = {
  schemaVersion: "room_operator_request.v1",
  bindingId: id("binding", "m"),
  roomId: GOLDEN_ROOM.roomId,
  action: "deliver_response",
  mutation: GOLDEN_API_MUTATION,
  exactTargetId: GOLDEN_RESPONSE.responseId,
};

export const GOLDEN_SNAPSHOT_LINE_READ: SnapshotLineReadV1 = {
  schemaVersion: "snapshot_line_read.v1",
  canonicalPath: "README.md",
  lineStart: 1,
  lineEnd: 20,
};

export const GOLDEN_SNAPSHOT_SEARCH: SnapshotSearchV1 = {
  schemaVersion: "snapshot_search.v1",
  pattern: "Forme",
  patternKind: "literal",
};

export const GOLDEN_SNAPSHOT_QUERY_RESULT: SnapshotQueryResultV1 = {
  schemaVersion: "snapshot_query_result.v1",
  queryHash: canonicalSha256(GOLDEN_SNAPSHOT_LINE_READ),
  status: "ok",
  resultText: "Forme synthetic snapshot result",
  matchCount: 1,
  resultBytes: new TextEncoder().encode("Forme synthetic snapshot result").length,
  bodyFreeErrorCode: null,
};

export const GOLDEN_TRANSPORT_INTENT: TransportDispatchIntentV1 = {
  schemaVersion: "transport_dispatch_intent.v1",
  interactionId: GOLDEN_INTERACTION.interactionId,
  reservationId: GOLDEN_FRESH_CYCLE.reservationId,
  sessionEnvelopeHash: GOLDEN_FRESH_CYCLE.sessionEnvelopeHash,
  startAuthorizationHash: GOLDEN_FRESH_CYCLE.startAuthorizationHash,
  provider: "OpenAI",
  modelId: GOLDEN_SESSION.modelId,
  payloadHash: GOLDEN_DISPATCH_PERMIT.payloadHash,
  dispatchOrdinal: 1,
  countedInputTokens: 1_024,
  reservedOutputTokens: 512,
  reservedApplicableSpendUsd: 0.25,
  idempotencyKey: GOLDEN_DISPATCH_PERMIT.idempotencyKey,
};

export const GOLDEN_TRANSPORT_DECISION: TransportGateDecisionV1 = {
  schemaVersion: "transport_gate_decision.v1",
  allowed: true,
  code: "dispatch_permitted",
  permit: GOLDEN_DISPATCH_PERMIT,
  bodyFreeReceipt: GOLDEN_OPERATION_RECEIPT,
};

export const GOLDEN_SYNTHETIC_FIXTURES = {
  room: GOLDEN_ROOM,
  projection: GOLDEN_PROJECTION,
  projectionLifecycle: GOLDEN_PROJECTION_LIFECYCLE,
  projectionBasis: GOLDEN_PROJECTION_BASIS,
  publicEncounter: GOLDEN_PUBLIC_ENCOUNTER,
  grant: GOLDEN_GRANT,
  grantOffer: GOLDEN_GRANT_OFFER,
  directGrantInvite: GOLDEN_DIRECT_INVITE,
  agentDerivative: GOLDEN_AGENT_DERIVATIVE,
  guestCapsule: GOLDEN_GUEST_CAPSULE,
  interaction: GOLDEN_INTERACTION,
  consentEnvelope: GOLDEN_CONSENT,
  orientation: GOLDEN_ORIENTATION,
  sourcePolicy: GOLDEN_SOURCE_POLICY,
  sourceSnapshot: GOLDEN_SNAPSHOT,
  sessionEnvelope: GOLDEN_SESSION,
  freshCycle: GOLDEN_FRESH_CYCLE,
  dispatchPermit: GOLDEN_DISPATCH_PERMIT,
  responseCandidate: GOLDEN_CANDIDATE,
  artifactApproval: GOLDEN_APPROVAL,
  hostedPublicationDelivery: GOLDEN_HOSTED_PUBLICATION_DELIVERY,
  response: GOLDEN_RESPONSE,
  notificationEndpoint: GOLDEN_NOTIFICATION_ENDPOINT,
  readyNotice: GOLDEN_READY_NOTICE,
  sessionReceipt: GOLDEN_SESSION_RECEIPT,
  operationReceipt: GOLDEN_OPERATION_RECEIPT,
  roomEvent: GOLDEN_ROOM_EVENT,
  roomEventBatch: GOLDEN_ROOM_EVENT_BATCH,
  cursorGone: GOLDEN_CURSOR_GONE,
  roomEventAck: GOLDEN_ROOM_EVENT_ACK,
  roomEventAckReceipt: GOLDEN_ROOM_EVENT_ACK_RECEIPT,
  apiMutation: GOLDEN_API_MUTATION,
  projectionReadView: GOLDEN_PROJECTION_READ_VIEW,
  roomOperatorRequest: GOLDEN_ROOM_OPERATOR_REQUEST,
  snapshotLineRead: GOLDEN_SNAPSHOT_LINE_READ,
  snapshotSearch: GOLDEN_SNAPSHOT_SEARCH,
  snapshotQueryResult: GOLDEN_SNAPSHOT_QUERY_RESULT,
  transportDispatchIntent: GOLDEN_TRANSPORT_INTENT,
  transportGateDecision: GOLDEN_TRANSPORT_DECISION,
} as const;

export const GOLDEN_VECTOR_RESULTS = {
  canonicalFixtureHash: canonicalSha256(GOLDEN_SYNTHETIC_FIXTURES),
  canonicalFixtureJson: canonicalJson(GOLDEN_SYNTHETIC_FIXTURES),
  publicProjectionRead: deriveProjectionRead(GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, { kind: "public" }, T0),
  trustedGrantSubmit: deriveGrantUse(GOLDEN_GRANT, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, T0, "submit"),
  consentSubset: isSessionEnvelopeConsentSubset(GOLDEN_SESSION, GOLDEN_CONSENT),
  budgetWithinP0: validateP0Budget(GOLDEN_SESSION.budget),
} as const;

export const GOLDEN_FIXTURE_BUNDLE_SHA256 = "sha256:2b852e34066066af2119760bee7d5749b4f89dbb634a7851fa4ce2831c754d5e" as const;
export const GOLDEN_CANONICAL_SAMPLE = {
  input: { b: 2, a: "é" },
  json: "{\"a\":\"é\",\"b\":2}",
  sha256: "sha256:06c264c46ad5ada9493abd3aa2383fb205ae99d7d0bad40b03a43bfec8a1b8de",
} as const;

export function verifyGoldenVectors(): void {
  if (GOLDEN_VECTOR_RESULTS.canonicalFixtureHash !== GOLDEN_FIXTURE_BUNDLE_SHA256) {
    throw new Error("R4 golden fixture bundle hash drifted");
  }
  if (canonicalJson(GOLDEN_CANONICAL_SAMPLE.input) !== GOLDEN_CANONICAL_SAMPLE.json ||
    canonicalSha256(GOLDEN_CANONICAL_SAMPLE.input) !== GOLDEN_CANONICAL_SAMPLE.sha256) {
    throw new Error("R4 canonical JSON/SHA-256 golden sample drifted");
  }
}
