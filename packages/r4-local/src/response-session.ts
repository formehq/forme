import {
  canonicalSha256,
  validateInteractionV1,
  validateResponseOrientationV1,
  validateResponseSourceSnapshotV1,
  validateSessionEnvelopeV1,
  type InteractionV1,
  type ResponseOrientationV1,
  type SessionBudgetV1,
  type SessionEnvelopeV1,
  type Sha256,
} from "../../r4-protocol/src/index.ts";
import type { TwinRevision } from "../../../src/types.ts";
import type { ResponseSourceSnapshot } from "./types.ts";

export interface PreparedResponseSession {
  readonly interactionId: string;
  readonly orientation: ResponseOrientationV1;
  readonly snapshot: ResponseSourceSnapshot;
  readonly sessionEnvelope: SessionEnvelopeV1;
  readonly sessionEnvelopeHash: Sha256;
  readonly preparedAt: string;
}

export interface FreshStartAuthorization {
  readonly schemaVersion: "local_fresh_start_authorization.v1";
  readonly interactionId: string;
  readonly sessionEnvelopeHash: Sha256;
  readonly orientationHash: Sha256;
  readonly snapshotManifestHash: Sha256;
  readonly capabilityProbeHash: Sha256;
  readonly runtimePolicyHash: Sha256;
  readonly reviewedAt: string;
  readonly authorityExpiresAt: string;
  readonly startAuthorizationHash: Sha256;
}

function selectedCorrectedSummaries(revision: TwinRevision, ids: readonly string[]): string[] {
  if (ids.length === 0) return [];
  if (revision.schemaVersion === "1") throw new Error("response_ai_eligible Reflection does not exist in this Twin revision");
  if (new Set(ids).size !== ids.length) throw new Error("response_ai_eligible Reflection IDs must be unique");
  return ids.map((id) => {
    const reflection = revision.cognition.reflections.find((item) => item.reflectionId === id);
    if (!reflection || reflection.status !== "corrected" || reflection.authoredBy !== "owner") {
      throw new Error(`Reflection is not an active Owner correction explicitly eligible for response AI:${id}`);
    }
    return reflection.claim;
  });
}

function selectedUnresolved(revision: TwinRevision, indexes: readonly number[]): string[] {
  if (new Set(indexes).size !== indexes.length) throw new Error("response_ai_eligible unresolved indexes must be unique");
  return indexes.map((index) => {
    if (!Number.isSafeInteger(index) || index < 0) throw new Error("invalid response_ai_eligible unresolved index");
    const value = revision.ownerFrame.unresolved[index];
    if (!value) throw new Error(`response_ai_eligible unresolved item is absent:${index}`);
    return value;
  });
}

/**
 * Builds the exact 8 KiB, body/path-free Twin orientation. Passing an ID or
 * index here is the explicit local `response_ai_eligible` marking ceremony;
 * unmarked cognition is omitted rather than inferred.
 */
export function buildResponseOrientation(input: {
  revision: TwinRevision;
  twinRevisionHash: Sha256;
  entityName: string;
  currentState: string;
  publicClaimSummary: readonly string[];
  responseAiEligibleCorrectedReflectionIds: readonly string[];
  responseAiEligibleUnresolvedIndexes: readonly number[];
}): ResponseOrientationV1 {
  const eligibleCorrectionSummaries = selectedCorrectedSummaries(
    input.revision,
    input.responseAiEligibleCorrectedReflectionIds,
  );
  const eligibleUnresolvedItems = selectedUnresolved(
    input.revision,
    input.responseAiEligibleUnresolvedIndexes,
  );
  const idBasis = {
    twinRevision: input.revision.revision,
    twinRevisionHash: input.twinRevisionHash,
    correctedIds: input.responseAiEligibleCorrectedReflectionIds,
    unresolvedIndexes: input.responseAiEligibleUnresolvedIndexes,
  };
  const preimage: Omit<ResponseOrientationV1, "contentHash"> = {
    schemaVersion: "response_orientation.v1",
    orientationId: `orientation_${canonicalSha256(idBasis).slice(7, 39)}`,
    entityName: input.entityName,
    ownerIntent: input.revision.ownerFrame.activeIntent,
    currentState: input.currentState,
    nextMove: input.revision.ownerFrame.nextMove,
    publicClaimSummary: [...input.publicClaimSummary],
    eligibleCorrectionSummaries,
    eligibleUnresolvedItems,
    localTwinRevision: input.revision.revision,
    localTwinContentHash: input.twinRevisionHash,
  };
  return validateResponseOrientationV1({ ...preimage, contentHash: canonicalSha256(preimage) });
}

/**
 * Compiles the exact consent→orientation→snapshot→session chain. It does not
 * authorize a Fresh start; that remains a second Owner action below.
 */
export function prepareResponseSession(input: {
  interaction: InteractionV1;
  orientation: ResponseOrientationV1;
  snapshot: ResponseSourceSnapshot;
  sessionEnvelopeId: string;
  modelId: string;
  budget: SessionBudgetV1;
  outputSchemaHash: Sha256;
  preparedAt: Date;
  authorityExpiresAt: Date;
}): PreparedResponseSession {
  const interaction = validateInteractionV1(input.interaction);
  const orientation = validateResponseOrientationV1(input.orientation);
  if (interaction.consent !== "allow_owner_local_ai" || interaction.consentEnvelope === null) {
    throw new Error("Interaction is manual_owner_only; Fresh session is unavailable");
  }
  if (!["accepted", "seen_locally", "preparing"].includes(interaction.state)) {
    throw new Error("Interaction is not response-eligible");
  }
  if (interaction.consentEnvelope.replyCapabilityDigest !== interaction.replyCapabilityDigest) {
    throw new Error("Consent Envelope is not bound to the Interaction reply capability");
  }
  if (orientation.localTwinRevision < 1) throw new Error("orientation has no committed Twin revision");
  validateResponseSourceSnapshotV1(input.snapshot.manifest, input.snapshot.policy);
  const preparedAt = input.preparedAt.toISOString();
  const authorityExpiresAt = input.authorityExpiresAt.toISOString();
  if (input.preparedAt.getTime() < Date.parse(interaction.acceptedAt) || input.preparedAt.getTime() >= Date.parse(interaction.expiresAt)) {
    throw new Error("Prepare response is outside the Interaction lifetime");
  }
  if (input.authorityExpiresAt.getTime() > Date.parse(interaction.expiresAt)) {
    throw new Error("Fresh authority cannot outlive the Interaction");
  }
  const sessionEnvelope = validateSessionEnvelopeV1({
    schemaVersion: "session_envelope.v1",
    sessionEnvelopeId: input.sessionEnvelopeId,
    interactionId: interaction.interactionId,
    consentEnvelopeId: interaction.consentEnvelope.consentEnvelopeId,
    consentEnvelopeHash: canonicalSha256(interaction.consentEnvelope),
    provider: interaction.consentEnvelope.provider,
    modelId: input.modelId,
    ownerAccountRegime: interaction.consentEnvelope.ownerAccountRegime,
    sourceClass: interaction.consentEnvelope.sourceClass,
    orientationClass: interaction.consentEnvelope.orientationClass,
    guestCapsuleIncluded: interaction.guestCapsule !== null,
    budget: input.budget,
    sourcePolicyHash: input.snapshot.policy.policyHash,
    snapshotManifestHash: input.snapshot.manifest.manifestHash,
    orientationHash: orientation.contentHash,
    providerRetentionDisclosureHash: interaction.consentEnvelope.providerRetentionDisclosureHash,
    outputSchemaHash: input.outputSchemaHash,
    preparedAt,
    authorityExpiresAt,
  }, interaction.consentEnvelope);
  return {
    interactionId: interaction.interactionId,
    orientation: structuredClone(orientation),
    snapshot: input.snapshot,
    sessionEnvelope,
    sessionEnvelopeHash: canonicalSha256(sessionEnvelope),
    preparedAt,
  };
}

/** Second action: exact protected preview + synthetic user-presence approval. */
export function authorizeFreshSessionStart(input: {
  prepared: PreparedResponseSession;
  expectedSessionEnvelopeHash: Sha256;
  expectedOrientationHash: Sha256;
  expectedSnapshotManifestHash: Sha256;
  capabilityProbeHash: Sha256;
  runtimePolicyHash: Sha256;
  ownerPresenceConfirmed: true;
  reviewedAt: Date;
}): FreshStartAuthorization {
  if (input.ownerPresenceConfirmed !== true) throw new Error("Owner presence is required");
  if (
    input.expectedSessionEnvelopeHash !== input.prepared.sessionEnvelopeHash
    || input.expectedOrientationHash !== input.prepared.orientation.contentHash
    || input.expectedSnapshotManifestHash !== input.prepared.snapshot.manifest.manifestHash
  ) throw new Error("Fresh start preview changed before authorization");
  if (input.reviewedAt.getTime() < Date.parse(input.prepared.preparedAt)
    || input.reviewedAt.getTime() >= Date.parse(input.prepared.sessionEnvelope.authorityExpiresAt)) {
    throw new Error("Fresh start review is outside prepared authority");
  }
  const preimage = {
    schemaVersion: "local_fresh_start_authorization.v1" as const,
    interactionId: input.prepared.interactionId,
    sessionEnvelopeHash: input.expectedSessionEnvelopeHash,
    orientationHash: input.expectedOrientationHash,
    snapshotManifestHash: input.expectedSnapshotManifestHash,
    capabilityProbeHash: input.capabilityProbeHash,
    runtimePolicyHash: input.runtimePolicyHash,
    reviewedAt: input.reviewedAt.toISOString(),
    authorityExpiresAt: input.prepared.sessionEnvelope.authorityExpiresAt,
  };
  return { ...preimage, startAuthorizationHash: canonicalSha256(preimage) };
}
