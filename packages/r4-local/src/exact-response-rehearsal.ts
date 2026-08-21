import {
  canonicalSha256,
  GOLDEN_INTERACTION,
  GOLDEN_ORIENTATION,
  GOLDEN_SOURCE_POLICY,
  validateArtifactApprovalV1,
  validateSessionReceiptV1,
  type ArtifactApprovalV1,
  type HostedPublicationDeliveryV1,
  type SessionReceiptV1,
} from "../../r4-protocol/src/index.ts";
import { buildManualOwnerCandidate } from "./fresh-session.ts";
import {
  coordinateResponsePublicationV1,
  verifyHostedPublicationDeliveryHmacV1,
  type ResponsePublicationPreflightV1,
  type RoomPublicationBindingV1,
} from "./publication.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const T1S = "2026-08-03T12:00:01.000Z";
const T2S = "2026-08-03T12:00:02.000Z";
const T3S = "2026-08-03T12:00:03.000Z";
const T4S = "2026-08-03T12:00:04.000Z";
const T15M = "2026-08-03T12:15:00.000Z";
const T7D = "2026-08-10T12:00:00.000Z";
const PRIOR_TRANSIENT_CANDIDATE_HASH = "sha256:2f5050f730c129306bfce09b3bcfbc02e197f286e1ab26eb91b9adf4e554a13f" as const;
const MAXIMUM_RESPONSE_BYTES = 16 * 1_024;

function opaqueId(prefix: string, value: unknown): string {
  return `${prefix}_${canonicalSha256(value).slice(7, 39)}`;
}

function manualReceipt(): SessionReceiptV1 {
  const core = {
    interactionId: GOLDEN_INTERACTION.interactionId,
    policyHash: GOLDEN_SOURCE_POLICY.policyHash,
    startedAt: T0,
    finishedAt: T1S,
    expiresAt: T7D,
  };
  return validateSessionReceiptV1({
    schemaVersion: "session_receipt.v1",
    receiptId: opaqueId("receipt", core),
    interactionId: GOLDEN_INTERACTION.interactionId,
    sessionEnvelopeId: null,
    sessionEnvelopeHash: null,
    startedAt: T0,
    finishedAt: T1S,
    provider: null,
    modelId: null,
    terminalStatus: "manual_only",
    dispatches: 0,
    inputTokens: 0,
    outputTokens: 0,
    applicableSpendUsd: null,
    sourceQueryCount: 0,
    sourceResultBytes: 0,
    accessEvidenceDigest: null,
    policyHash: GOLDEN_SOURCE_POLICY.policyHash,
    schemaHash: canonicalSha256("manual-owner-response-text.v1"),
    runtimeVersion: "r4-exact-response-transient.v1",
    errorCode: null,
    expiresAt: T7D,
  });
}

function approval(candidateHash: `sha256:${string}`): ArtifactApprovalV1 {
  return validateArtifactApprovalV1({
    schemaVersion: "artifact_approval.v1",
    approvalId: opaqueId("approval", { candidateHash, approvedAt: T3S }),
    artifactClass: "response",
    artifactHash: candidateHash,
    roomId: GOLDEN_INTERACTION.roomId,
    projectionId: GOLDEN_INTERACTION.projectionId,
    interactionId: GOLDEN_INTERACTION.interactionId,
    basisHash: GOLDEN_ORIENTATION.contentHash,
    policyHash: GOLDEN_SOURCE_POLICY.policyHash,
    operationId: opaqueId("op", { candidateHash, operation: "local_exact_response_delivery" }),
    approvedAt: T3S,
    expiresAt: T15M,
  });
}

export interface ExactResponseReviewPort {
  reviewCandidate(input: Readonly<{
    responseText: string;
    candidateHash: `sha256:${string}`;
    roomId: string;
    projectionId: string;
    interactionId: string;
    sourceDisclosureClass: "manual_owner_authored";
  }>): "approve_exact" | "reject";
  reviewPublicDelivery(delivery: HostedPublicationDeliveryV1): "deliver_local" | "cancel";
}

export type ExactResponseLocalResult = Readonly<{
  schemaVersion: "r4.exact_response_local_delivery.v1";
  issue: 69;
  verdict: "CANDIDATE_REJECTED" | "DELIVERY_CANCELLED" | "GREEN_LOCAL_EXACT_RESPONSE_DELIVERED";
  proofClass: "transient_manual_owner_local_contract_delivery";
  priorTransientCandidateHash: typeof PRIOR_TRANSIENT_CANDIDATE_HASH;
  candidateHash: `sha256:${string}`;
  approvalHash: `sha256:${string}` | null;
  publicResponseHash: `sha256:${string}` | null;
  deliveryHash: `sha256:${string}` | null;
  guestObservedBodyHash: `sha256:${string}` | null;
  guestObservedBodyBytes: number;
  sourceDisclosureClass: "manual_owner_authored";
  runtime: {
    providerCalls: 0;
    modelCalls: 0;
    toolCalls: 0;
    persistedCandidateBytes: 0;
    localDeliveryCalls: 0 | 1;
    externalNetworkCalls: 0;
    publicTrafficCalls: 0;
  };
}>;

export function buildExactResponseLocalEnvelope(): Readonly<{
  envelope: Readonly<Record<string, unknown>>;
  envelopeHash: `sha256:${string}`;
}> {
  const envelope = Object.freeze({
    schemaVersion: "r4.exact_response_local_envelope.v1",
    issue: 69,
    priorTransientCandidateHash: PRIOR_TRANSIENT_CANDIDATE_HASH,
    target: Object.freeze({
      roomId: GOLDEN_INTERACTION.roomId,
      projectionId: GOLDEN_INTERACTION.projectionId,
      interactionId: GOLDEN_INTERACTION.interactionId,
      interactionRequestHash: canonicalSha256(GOLDEN_INTERACTION.requestText),
      twinBasisHash: GOLDEN_ORIENTATION.contentHash,
      policyHash: GOLDEN_SOURCE_POLICY.policyHash,
    }),
    response: Object.freeze({
      sourceDisclosureClass: "manual_owner_authored",
      suppliedAtRuntime: true,
      maximumBytes: MAXIMUM_RESPONSE_BYTES,
      persistedCandidateBytes: 0,
    }),
    authority: Object.freeze({
      ownerCandidateReviewRequired: true,
      exactPublicPayloadReviewRequired: true,
      localSyntheticDeliveryLimit: 1,
      externalNetworkCalls: 0,
      publicTrafficCalls: 0,
      providerCalls: 0,
      retryAuthority: false,
      productionAuthority: false,
    }),
  });
  return Object.freeze({ envelope, envelopeHash: canonicalSha256(envelope) });
}

function result(input: Omit<ExactResponseLocalResult, "schemaVersion" | "issue" | "proofClass" | "priorTransientCandidateHash" | "sourceDisclosureClass">): ExactResponseLocalResult {
  return Object.freeze({
    schemaVersion: "r4.exact_response_local_delivery.v1",
    issue: 69,
    proofClass: "transient_manual_owner_local_contract_delivery",
    priorTransientCandidateHash: PRIOR_TRANSIENT_CANDIDATE_HASH,
    sourceDisclosureClass: "manual_owner_authored",
    ...input,
  });
}

export function runTransientExactResponseLocalDelivery(
  responseText: string,
  review: ExactResponseReviewPort,
): ExactResponseLocalResult {
  if (Buffer.byteLength(responseText, "utf8") > MAXIMUM_RESPONSE_BYTES) {
    throw new Error("exact response exceeds the local response byte ceiling");
  }
  const receipt = manualReceipt();
  const candidate = buildManualOwnerCandidate({
    currentInteraction: GOLDEN_INTERACTION,
    currentOriginStateAtCompilation: "published_fresh",
    sessionReceipt: receipt,
    responseText,
    currentTwinBasisHash: GOLDEN_ORIENTATION.contentHash,
    currentPolicyHash: GOLDEN_SOURCE_POLICY.policyHash,
    admittedAt: new Date(T2S),
    expiresAt: new Date(T7D),
  });
  const baseRuntime = {
    providerCalls: 0 as const,
    modelCalls: 0 as const,
    toolCalls: 0 as const,
    persistedCandidateBytes: 0 as const,
    externalNetworkCalls: 0 as const,
    publicTrafficCalls: 0 as const,
  };
  const candidateDecision = review.reviewCandidate({
    responseText: candidate.responseText,
    candidateHash: candidate.candidateHash,
    roomId: candidate.roomId,
    projectionId: candidate.projectionId,
    interactionId: candidate.interactionId,
    sourceDisclosureClass: candidate.sourceDisclosureClass as "manual_owner_authored",
  });
  if (candidateDecision === "reject") {
    return result({
      verdict: "CANDIDATE_REJECTED",
      candidateHash: candidate.candidateHash,
      approvalHash: null,
      publicResponseHash: null,
      deliveryHash: null,
      guestObservedBodyHash: null,
      guestObservedBodyBytes: 0,
      runtime: { ...baseRuntime, localDeliveryCalls: 0 },
    });
  }
  const exactApproval = approval(candidate.candidateHash);
  const preflight: ResponsePublicationPreflightV1 = {
    artifactClass: "response",
    observedAt: T4S,
    roomId: candidate.roomId,
    roomStatus: "active",
    projectionId: candidate.projectionId,
    interactionId: candidate.interactionId,
    interactionState: "preparing",
    originState: candidate.originState,
    candidateStoreState: "transient_current",
    candidateHash: candidate.candidateHash,
    twinBasisHash: candidate.twinBasisHash,
    snapshotManifestHash: candidate.snapshotManifestHash,
    sessionReceiptHash: candidate.sessionReceiptHash,
    sourceDisclosureClass: candidate.sourceDisclosureClass,
    policyHash: candidate.policyHash,
    existingResponseId: null,
    parentInteractionExpiresAt: GOLDEN_INTERACTION.expiresAt,
  };
  const binding: RoomPublicationBindingV1 = {
    bindingId: opaqueId("binding", candidate.roomId),
    roomId: candidate.roomId,
    secret: new Uint8Array(32).fill(0x69),
    state: "current",
    expiresAt: GOLDEN_INTERACTION.expiresAt,
  };
  const delivery = coordinateResponsePublicationV1({
    responseId: opaqueId("response", candidate.candidateHash),
    publicationAttestationId: opaqueId("att", { candidateHash: candidate.candidateHash, class: "response" }),
    candidate,
    approval: exactApproval,
    binding,
    responseExpiresAt: T7D,
    attestationExpiresAt: T15M,
    reader: {
      protocolVersion: "trusted_response_publication_state_reader.v1",
      readCurrentAfterApproval: () => preflight,
    },
  });
  const approvalHash = canonicalSha256(exactApproval);
  const publicResponseHash = canonicalSha256(delivery.response);
  const deliveryHash = canonicalSha256(delivery);
  if (review.reviewPublicDelivery(delivery) === "cancel") {
    return result({
      verdict: "DELIVERY_CANCELLED",
      candidateHash: candidate.candidateHash,
      approvalHash,
      publicResponseHash,
      deliveryHash,
      guestObservedBodyHash: null,
      guestObservedBodyBytes: 0,
      runtime: { ...baseRuntime, localDeliveryCalls: 0 },
    });
  }
  const verified = verifyHostedPublicationDeliveryHmacV1(delivery, binding, T4S);
  const guestBody = verified.response?.body;
  if (typeof guestBody !== "string" || guestBody !== responseText) {
    throw new Error("local exact Response delivery body drift");
  }
  return result({
    verdict: "GREEN_LOCAL_EXACT_RESPONSE_DELIVERED",
    candidateHash: candidate.candidateHash,
    approvalHash,
    publicResponseHash,
    deliveryHash,
    guestObservedBodyHash: canonicalSha256(guestBody),
    guestObservedBodyBytes: Buffer.byteLength(guestBody, "utf8"),
    runtime: { ...baseRuntime, localDeliveryCalls: 1 },
  });
}
