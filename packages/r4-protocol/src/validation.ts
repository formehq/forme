import { canonicalJsonBytes, canonicalSha256, canonicalSha256Omitting } from "./canonical.ts";
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
} from "./guards.ts";
import { GRANT_PRESETS, assessProjectionBasisClaim, isSessionEnvelopeConsentSubset, validateP0Budget } from "./state.ts";
import { validateDispatchPermitV1, validateGuestCapsuleV1, validateMaximumBudgetObject, validateProjectionLifecycleV1 } from "./object-validation.ts";
import type {
  ArtifactApprovalV1,
  ConsentEnvelopeV1,
  GrantV1,
  HostedPublicationDeliveryV1,
  InteractionV1,
  OperationReceiptV1,
  ProjectionBasisV1,
  ProjectionCapsuleV1,
  ProjectionReadViewV1,
  PublicationAttestationV1,
  ReadyNoticeV1,
  ResponseCandidateV1,
  ResponseOrientationV1,
  ResponsePublicationV1,
  ResponseV1,
  RoomV1,
  SessionEnvelopeV1,
  SessionReceiptV1,
  TransportGateDecisionV1,
} from "./types.ts";

const ROOM_KINDS = ["third_place_public", "private_grant_only"] as const;
const ROOM_MODES = ["public_single", "invite_only", "closed"] as const;
const ROOM_STATES = ["active", "retired"] as const;
const ATTRIBUTIONS = ["owner_confirmed", "inferred_allowed", "unresolved_allowed"] as const;
const CLAIM_SLOTS = ["becoming", "now", "nextMove", "tensions", "openTo"] as const;
const PROJECTION_STATES = ["published_fresh", "stale", "superseded", "revoked", "expired"] as const;
const RESPONSE_SOURCE_DISCLOSURE_CLASSES = [
  "fresh_native_sanitized_snapshot_owner_reviewed",
  "manual_owner_authored",
] as const;

function fail(code: string, path: string, message: string): never {
  throw new ProtocolValidationError(code, path, message);
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") fail("invalid_type", path, "expected boolean");
}

function assertNullableId(value: unknown, prefix: string, path: string): void {
  if (value !== null) assertOpaqueId(value, prefix, path);
}

function assertNullableTimestamp(value: unknown, path: string): void {
  if (value !== null) assertUtcTimestamp(value, path);
}

function assertNullableSha256(value: unknown, path: string): void {
  if (value !== null) assertSha256(value, path);
}

function assertStringArray(value: unknown, path: string, maximum: number, itemBytes: number): asserts value is string[] {
  assertArray(value, path, 0, maximum);
  value.forEach((item, index) => assertCanonicalText(item, `${path}[${index}]`, { maxBytes: itemBytes }));
}

function assertHttpsUrl(value: unknown, path: string): void {
  assertCanonicalText(value, path, { maxBytes: 2_048 });
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") fail("invalid_url", path, "expected an HTTPS URL");
  } catch (error) {
    if (error instanceof ProtocolValidationError) throw error;
    fail("invalid_url", path, "expected an HTTPS URL");
  }
}

export function validateRoomV1(value: unknown): RoomV1 {
  assertRecord(value, "$room");
  assertExactKeys(value, "$room", ["schemaVersion", "roomId", "entityId", "roomKind", "interactionMode", "status", "currentProjectionId", "version", "createdAt", "retiredAt"]);
  if (value.schemaVersion !== "room.v1") fail("schema_version", "$room.schemaVersion", "expected room.v1");
  assertOpaqueId(value.roomId, "room", "$room.roomId");
  assertOpaqueId(value.entityId, "entity", "$room.entityId");
  assertOneOf(value.roomKind, ROOM_KINDS, "$room.roomKind");
  assertOneOf(value.interactionMode, ROOM_MODES, "$room.interactionMode");
  assertOneOf(value.status, ROOM_STATES, "$room.status");
  assertNullableId(value.currentProjectionId, "proj", "$room.currentProjectionId");
  assertIntegerInRange(value.version, "$room.version", 1, Number.MAX_SAFE_INTEGER);
  assertUtcTimestamp(value.createdAt, "$room.createdAt");
  assertNullableTimestamp(value.retiredAt, "$room.retiredAt");
  if (value.roomKind === "private_grant_only" && value.interactionMode === "public_single") {
    fail("room_mode_forbidden", "$room.interactionMode", "Private Room cannot use public_single");
  }
  if (value.status === "retired" && value.retiredAt === null) fail("missing_retirement", "$room.retiredAt", "retired Room needs retiredAt");
  if (value.status === "active" && value.retiredAt !== null) fail("unexpected_retirement", "$room.retiredAt", "active Room cannot have retiredAt");
  return value as unknown as RoomV1;
}

export function validateProjectionCapsuleV1(value: unknown): ProjectionCapsuleV1 {
  assertRecord(value, "$projection");
  assertExactKeys(value, "$projection", [
    "schemaVersion", "projectionId", "roomId", "entityId", "title", "thirdPlaceSummary", "claims",
    "supportedInteractions", "allowedTopics", "unavailableTopics", "expectedResponseLatency", "visualThemeToken",
    "agencyStatement", "nonCommitmentStatement", "disclosureBasisId", "publicationAttestationId", "payloadHash",
    "publishedAt", "freshUntil", "expiresAt",
  ]);
  if (value.schemaVersion !== "projection_capsule.v1") fail("schema_version", "$projection.schemaVersion", "expected projection_capsule.v1");
  assertOpaqueId(value.projectionId, "proj", "$projection.projectionId");
  assertOpaqueId(value.roomId, "room", "$projection.roomId");
  assertOpaqueId(value.entityId, "entity", "$projection.entityId");
  assertCanonicalText(value.title, "$projection.title", { minScalars: 1, maxScalars: 120 });
  assertCanonicalText(value.thirdPlaceSummary, "$projection.thirdPlaceSummary", { maxBytes: 512 });
  assertArray(value.claims, "$projection.claims", 1, 20);
  value.claims.forEach((claim, index) => {
    const path = `$projection.claims[${index}]`;
    assertRecord(claim, path);
    assertExactKeys(claim, path, ["slot", "text", "attribution", "uncertainty"]);
    assertOneOf(claim.slot, CLAIM_SLOTS, `${path}.slot`);
    assertCanonicalText(claim.text, `${path}.text`, { minScalars: 1, maxBytes: 8 * 1_024 });
    assertOneOf(claim.attribution, ATTRIBUTIONS, `${path}.attribution`);
    if (claim.uncertainty !== null) assertCanonicalText(claim.uncertainty, `${path}.uncertainty`, { maxBytes: 2_048 });
    if (claim.attribution === "inferred_allowed" && claim.uncertainty === null) {
      fail("uncertainty_required", `${path}.uncertainty`, "inferred_allowed claim needs uncertainty");
    }
  });
  assertArray(value.supportedInteractions, "$projection.supportedInteractions", 1, 3);
  value.supportedInteractions.forEach((item, index) => assertOneOf(item, ["ask", "seed", "resonance"] as const, `$projection.supportedInteractions[${index}]`));
  assertStringArray(value.allowedTopics, "$projection.allowedTopics", 32, 256);
  assertStringArray(value.unavailableTopics, "$projection.unavailableTopics", 32, 256);
  assertCanonicalText(value.expectedResponseLatency, "$projection.expectedResponseLatency", { maxBytes: 256 });
  assertCanonicalText(value.visualThemeToken, "$projection.visualThemeToken", { maxBytes: 128 });
  assertCanonicalText(value.agencyStatement, "$projection.agencyStatement", { maxBytes: 1_024 });
  assertCanonicalText(value.nonCommitmentStatement, "$projection.nonCommitmentStatement", { maxBytes: 1_024 });
  assertOpaqueId(value.disclosureBasisId, "basis", "$projection.disclosureBasisId");
  assertOpaqueId(value.publicationAttestationId, "att", "$projection.publicationAttestationId");
  assertSha256(value.payloadHash, "$projection.payloadHash");
  assertUtcTimestamp(value.publishedAt, "$projection.publishedAt");
  assertUtcTimestamp(value.freshUntil, "$projection.freshUntil");
  assertUtcTimestamp(value.expiresAt, "$projection.expiresAt");
  if (compareTimestamps(value.freshUntil, value.publishedAt) <= 0 || compareTimestamps(value.expiresAt, value.freshUntil) <= 0) {
    fail("invalid_time_order", "$projection", "expected publishedAt < freshUntil < expiresAt");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.publishedAt) > 7 * 24 * 60 * 60 * 1_000) {
    fail("projection_expiry_too_long", "$projection.expiresAt", "Projection cannot live beyond seven days");
  }
  let bodyBytes = 0;
  for (const claim of value.claims) {
    assertRecord(claim, "$projection.claims[]");
    assertCanonicalText(claim.text, "$projection.claims[].text");
    bodyBytes += new TextEncoder().encode(claim.text).length;
  }
  if (bodyBytes > 32 * 1_024) fail("projection_body_too_large", "$projection.claims", "claim text exceeds 32 KiB");
  if (canonicalSha256Omitting(value, ["payloadHash"]) !== value.payloadHash) {
    fail("payload_hash_mismatch", "$projection.payloadHash", "must hash canonical Projection payload excluding payloadHash");
  }
  return value as unknown as ProjectionCapsuleV1;
}

export function validateProjectionBasisV1(value: unknown): ProjectionBasisV1 {
  assertRecord(value, "$basis");
  assertExactKeys(value, "$basis", [
    "schemaVersion", "basisId", "projectionId", "roomId", "twinRevision", "twinRevisionHash", "workspaceContractHash",
    "projectionPolicyGeneration", "projectionPolicyHash", "claims", "payloadHash", "ownerDecisionId", "ownerDecisionHash",
    "localReceiptId", "hostedReceiptId",
  ]);
  if (value.schemaVersion !== "projection_basis.v1") fail("schema_version", "$basis.schemaVersion", "expected projection_basis.v1");
  assertOpaqueId(value.basisId, "basis", "$basis.basisId");
  assertOpaqueId(value.projectionId, "proj", "$basis.projectionId");
  assertOpaqueId(value.roomId, "room", "$basis.roomId");
  assertIntegerInRange(value.twinRevision, "$basis.twinRevision", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.twinRevisionHash, "$basis.twinRevisionHash");
  assertSha256(value.workspaceContractHash, "$basis.workspaceContractHash");
  assertIntegerInRange(value.projectionPolicyGeneration, "$basis.projectionPolicyGeneration", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.projectionPolicyHash, "$basis.projectionPolicyHash");
  assertArray(value.claims, "$basis.claims", 1, 20);
  value.claims.forEach((claim, index) => {
    const path = `$basis.claims[${index}]`;
    assertRecord(claim, path);
    assertExactKeys(claim, path, ["slot", "claimText", "attribution", "disclosureClass", "transformationClass", "sourceKind", "sourceReference", "sourceContentHash", "semanticStatus"]);
    assertOneOf(claim.slot, CLAIM_SLOTS, `${path}.slot`);
    assertCanonicalText(claim.claimText, `${path}.claimText`, { minScalars: 1, maxBytes: 8 * 1_024 });
    assertOneOf(claim.attribution, ATTRIBUTIONS, `${path}.attribution`);
    assertCanonicalText(claim.disclosureClass, `${path}.disclosureClass`, { maxBytes: 128 });
    assertOneOf(claim.transformationClass, ["exact", "transformed", "owner_edited"] as const, `${path}.transformationClass`);
    assertOneOf(claim.sourceKind, ["owner_frame", "owner_unresolved", "owner_corrected_reflection", "inferred_reflection", "r3_effect", "projection_owner_wording"] as const, `${path}.sourceKind`);
    assertOpaqueId(claim.sourceReference, "src", `${path}.sourceReference`);
    assertSha256(claim.sourceContentHash, `${path}.sourceContentHash`);
    assertOneOf(claim.semanticStatus, ["active", "superseded", "invalidated", "proposed", "approved", "executed_current", "rolled_back", "indeterminate"] as const, `${path}.semanticStatus`);
    const decision = assessProjectionBasisClaim(claim as never);
    if (!decision.allowed) fail("ineligible_projection_basis", path, decision.code);
  });
  assertSha256(value.payloadHash, "$basis.payloadHash");
  assertOpaqueId(value.ownerDecisionId, "decision", "$basis.ownerDecisionId");
  assertSha256(value.ownerDecisionHash, "$basis.ownerDecisionHash");
  assertNullableId(value.localReceiptId, "receipt", "$basis.localReceiptId");
  assertNullableId(value.hostedReceiptId, "receipt", "$basis.hostedReceiptId");
  return value as unknown as ProjectionBasisV1;
}

export function validateGrantV1(value: unknown): GrantV1 {
  assertRecord(value, "$grant");
  assertExactKeys(value, "$grant", [
    "schemaVersion", "grantId", "roomId", "projectionId", "reentryChainId", "presetId", "secretDigest", "state",
    "issuedAt", "expiresAt", "acceptedCount", "acceptedQuota", "unresolvedInteractionId", "agentDerivationAllowed", "replacedGrantId",
  ]);
  if (value.schemaVersion !== "grant.v1") fail("schema_version", "$grant.schemaVersion", "expected grant.v1");
  assertOpaqueId(value.grantId, "grant", "$grant.grantId");
  assertOpaqueId(value.roomId, "room", "$grant.roomId");
  assertOpaqueId(value.projectionId, "proj", "$grant.projectionId");
  assertOpaqueId(value.reentryChainId, "chain", "$grant.reentryChainId");
  assertOneOf(value.presetId, ["one_visit", "short_exchange", "familiar_collaborator", "trusted_collaborator"] as const, "$grant.presetId");
  assertSha256(value.secretDigest, "$grant.secretDigest");
  assertOneOf(value.state, ["issued", "consumed", "revoked", "replaced", "expired", "invalidated"] as const, "$grant.state");
  assertUtcTimestamp(value.issuedAt, "$grant.issuedAt");
  assertUtcTimestamp(value.expiresAt, "$grant.expiresAt");
  assertIntegerInRange(value.acceptedCount, "$grant.acceptedCount", 0, 10);
  assertIntegerInRange(value.acceptedQuota, "$grant.acceptedQuota", 1, 10);
  assertNullableId(value.unresolvedInteractionId, "interaction", "$grant.unresolvedInteractionId");
  assertBoolean(value.agentDerivationAllowed, "$grant.agentDerivationAllowed");
  assertNullableId(value.replacedGrantId, "grant", "$grant.replacedGrantId");
  const preset = GRANT_PRESETS[value.presetId];
  if (value.acceptedQuota !== preset.acceptedQuota) fail("grant_quota_mismatch", "$grant.acceptedQuota", "quota must match preset");
  if (compareTimestamps(value.expiresAt, value.issuedAt) <= 0) {
    fail("invalid_time_order", "$grant.expiresAt", "Grant expiry must follow issuance");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.issuedAt) > preset.ttlMilliseconds) {
    fail("grant_expiry_widened", "$grant.expiresAt", "expiry exceeds preset TTL");
  }
  if (value.acceptedCount > value.acceptedQuota) fail("grant_quota_overrun", "$grant.acceptedCount", "accepted count exceeds quota");
  return value as unknown as GrantV1;
}

export function validateConsentEnvelopeV1(value: unknown): ConsentEnvelopeV1 {
  assertRecord(value, "$consent");
  assertExactKeys(value, "$consent", [
    "schemaVersion", "consentEnvelopeId", "provider", "ownerAccountRegime", "sourceClass", "orientationClass",
    "guestCapsuleAllowed", "maximumBudget", "providerPolicyUrl", "providerPolicyHash", "providerRetentionDisclosureHash",
    "backupRetentionDisclosureHash", "consentCopyHash", "consentedAt", "replyCapabilityId", "replyCapabilityDigest",
  ]);
  if (value.schemaVersion !== "consent_envelope.v1") fail("schema_version", "$consent.schemaVersion", "expected consent_envelope.v1");
  assertOpaqueId(value.consentEnvelopeId, "consent", "$consent.consentEnvelopeId");
  if (value.provider !== "OpenAI") fail("provider_not_allowed", "$consent.provider", "P0 provider is OpenAI");
  assertCanonicalText(value.ownerAccountRegime, "$consent.ownerAccountRegime", { maxBytes: 256 });
  if (value.sourceClass !== "sanitized_current_forme_snapshot") fail("source_class", "$consent.sourceClass", "unexpected source class");
  if (value.orientationClass !== "body_path_free_twin_orientation") fail("orientation_class", "$consent.orientationClass", "unexpected orientation class");
  assertBoolean(value.guestCapsuleAllowed, "$consent.guestCapsuleAllowed");
  validateMaximumBudgetObject(value.maximumBudget);
  assertHttpsUrl(value.providerPolicyUrl, "$consent.providerPolicyUrl");
  assertSha256(value.providerPolicyHash, "$consent.providerPolicyHash");
  assertSha256(value.providerRetentionDisclosureHash, "$consent.providerRetentionDisclosureHash");
  assertSha256(value.backupRetentionDisclosureHash, "$consent.backupRetentionDisclosureHash");
  assertSha256(value.consentCopyHash, "$consent.consentCopyHash");
  assertUtcTimestamp(value.consentedAt, "$consent.consentedAt");
  assertOpaqueId(value.replyCapabilityId, "reply", "$consent.replyCapabilityId");
  assertSha256(value.replyCapabilityDigest, "$consent.replyCapabilityDigest");
  return value as unknown as ConsentEnvelopeV1;
}

export function validateSessionEnvelopeV1(value: unknown, consent?: ConsentEnvelopeV1): SessionEnvelopeV1 {
  assertRecord(value, "$session");
  assertExactKeys(value, "$session", [
    "schemaVersion", "sessionEnvelopeId", "interactionId", "consentEnvelopeId", "consentEnvelopeHash", "provider", "modelId",
    "ownerAccountRegime", "sourceClass", "orientationClass", "guestCapsuleIncluded", "budget", "sourcePolicyHash",
    "snapshotManifestHash", "orientationHash", "providerRetentionDisclosureHash", "outputSchemaHash", "preparedAt", "authorityExpiresAt",
  ]);
  if (value.schemaVersion !== "session_envelope.v1") fail("schema_version", "$session.schemaVersion", "expected session_envelope.v1");
  assertOpaqueId(value.sessionEnvelopeId, "session", "$session.sessionEnvelopeId");
  assertOpaqueId(value.interactionId, "interaction", "$session.interactionId");
  assertOpaqueId(value.consentEnvelopeId, "consent", "$session.consentEnvelopeId");
  assertSha256(value.consentEnvelopeHash, "$session.consentEnvelopeHash");
  if (value.provider !== "OpenAI") fail("provider_not_allowed", "$session.provider", "P0 provider is OpenAI");
  assertCanonicalText(value.modelId, "$session.modelId", { minScalars: 1, maxBytes: 256 });
  assertCanonicalText(value.ownerAccountRegime, "$session.ownerAccountRegime", { maxBytes: 256 });
  if (value.sourceClass !== "sanitized_current_forme_snapshot") fail("source_class", "$session.sourceClass", "unexpected source class");
  if (value.orientationClass !== "body_path_free_twin_orientation") fail("orientation_class", "$session.orientationClass", "unexpected orientation class");
  assertBoolean(value.guestCapsuleIncluded, "$session.guestCapsuleIncluded");
  validateMaximumBudgetObject(value.budget);
  ["sourcePolicyHash", "snapshotManifestHash", "orientationHash", "providerRetentionDisclosureHash", "outputSchemaHash"].forEach((key) => assertSha256(value[key], `$session.${key}`));
  assertUtcTimestamp(value.preparedAt, "$session.preparedAt");
  assertUtcTimestamp(value.authorityExpiresAt, "$session.authorityExpiresAt");
  if (compareTimestamps(value.authorityExpiresAt, value.preparedAt) <= 0) {
    fail("invalid_time_order", "$session.authorityExpiresAt", "authority expiry must follow preparation");
  }
  if (Date.parse(value.authorityExpiresAt) - Date.parse(value.preparedAt) > 60 * 60 * 1_000) {
    fail("authority_too_long", "$session.authorityExpiresAt", "Fresh authority cannot exceed 60 minutes from prepare");
  }
  const session = value as unknown as SessionEnvelopeV1;
  if (consent) {
    if (session.consentEnvelopeHash !== canonicalSha256(consent)) fail("consent_hash_mismatch", "$session.consentEnvelopeHash", "must hash exact Consent Envelope");
    const decision = isSessionEnvelopeConsentSubset(session, consent);
    if (!decision.allowed) fail("consent_subset_failed", "$session", decision.code);
  }
  return session;
}

export function validateInteractionV1(value: unknown): InteractionV1 {
  assertRecord(value, "$interaction");
  assertExactKeys(value, "$interaction", [
    "schemaVersion", "interactionId", "roomId", "projectionId", "originProjectionHash", "originStateAtAcceptance", "interactionType",
    "requestText", "guestCapsule", "consent", "consentEnvelope", "acceptedAt", "expiresAt", "replyCapabilityDigest",
    "deleteCapabilityDigest", "state", "stateVersion",
  ]);
  if (value.schemaVersion !== "interaction.v1") fail("schema_version", "$interaction.schemaVersion", "expected interaction.v1");
  assertOpaqueId(value.interactionId, "interaction", "$interaction.interactionId");
  assertOpaqueId(value.roomId, "room", "$interaction.roomId");
  assertOpaqueId(value.projectionId, "proj", "$interaction.projectionId");
  assertSha256(value.originProjectionHash, "$interaction.originProjectionHash");
  assertOneOf(value.originStateAtAcceptance, PROJECTION_STATES, "$interaction.originStateAtAcceptance");
  assertOneOf(value.interactionType, ["ask", "seed", "resonance"] as const, "$interaction.interactionType");
  assertCanonicalText(value.requestText, "$interaction.requestText", { minScalars: 1, maxBytes: 12 * 1_024 });
  if (value.guestCapsule !== null) {
    validateGuestCapsuleV1(value.guestCapsule);
    const bytes = canonicalJsonBytes(value.guestCapsule).length;
    if (bytes > 4 * 1_024) fail("guest_capsule_too_large", "$interaction.guestCapsule", "capsule exceeds 4 KiB");
  }
  assertOneOf(value.consent, ["allow_owner_local_ai", "manual_owner_only"] as const, "$interaction.consent");
  if (value.consent === "allow_owner_local_ai") {
    if (value.consentEnvelope === null) fail("consent_envelope_required", "$interaction.consentEnvelope", "AI consent requires envelope");
    validateConsentEnvelopeV1(value.consentEnvelope);
  } else if (value.consentEnvelope !== null) {
    fail("consent_envelope_forbidden", "$interaction.consentEnvelope", "manual-only Interaction has no AI envelope");
  }
  assertUtcTimestamp(value.acceptedAt, "$interaction.acceptedAt");
  assertUtcTimestamp(value.expiresAt, "$interaction.expiresAt");
  if (compareTimestamps(value.expiresAt, value.acceptedAt) <= 0) {
    fail("invalid_time_order", "$interaction.expiresAt", "Interaction expiry must follow acceptance");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.acceptedAt) > 30 * 24 * 60 * 60 * 1_000) {
    fail("interaction_retention_too_long", "$interaction.expiresAt", "Interaction cannot exceed 30 days");
  }
  assertSha256(value.replyCapabilityDigest, "$interaction.replyCapabilityDigest");
  assertSha256(value.deleteCapabilityDigest, "$interaction.deleteCapabilityDigest");
  assertOneOf(value.state, ["accepted", "seen_locally", "preparing", "response_ready", "closed_without_response", "interaction_expired", "interaction_deleted", "origin_revoked", "room_retired"] as const, "$interaction.state");
  assertIntegerInRange(value.stateVersion, "$interaction.stateVersion", 1, Number.MAX_SAFE_INTEGER);
  return value as unknown as InteractionV1;
}

export function validateResponseV1(value: unknown, parent?: InteractionV1): ResponseV1 {
  assertRecord(value, "$response");
  assertExactKeys(value, "$response", [
    "schemaVersion", "responseId", "interactionId", "roomId", "projectionId", "body", "candidateHash", "originStateAtPublication",
    "sourceDisclosureClass", "localBasisAttestationId", "approvalAttestationId", "publicationReceiptId", "publishedAt", "expiresAt",
    "state", "stateVersion",
  ]);
  if (value.schemaVersion !== "response.v1") fail("schema_version", "$response.schemaVersion", "expected response.v1");
  assertOpaqueId(value.responseId, "response", "$response.responseId");
  assertOpaqueId(value.interactionId, "interaction", "$response.interactionId");
  assertOpaqueId(value.roomId, "room", "$response.roomId");
  assertOpaqueId(value.projectionId, "proj", "$response.projectionId");
  assertCanonicalText(value.body, "$response.body", { minScalars: 1, maxBytes: 16 * 1_024 });
  assertSha256(value.candidateHash, "$response.candidateHash");
  assertOneOf(value.originStateAtPublication, PROJECTION_STATES, "$response.originStateAtPublication");
  if (value.originStateAtPublication === "revoked") fail("revoked_origin", "$response.originStateAtPublication", "revoked origin cannot receive a Response");
  assertOneOf(value.sourceDisclosureClass, RESPONSE_SOURCE_DISCLOSURE_CLASSES, "$response.sourceDisclosureClass");
  assertOpaqueId(value.localBasisAttestationId, "att", "$response.localBasisAttestationId");
  assertOpaqueId(value.approvalAttestationId, "att", "$response.approvalAttestationId");
  assertOpaqueId(value.publicationReceiptId, "receipt", "$response.publicationReceiptId");
  assertUtcTimestamp(value.publishedAt, "$response.publishedAt");
  assertUtcTimestamp(value.expiresAt, "$response.expiresAt");
  if (compareTimestamps(value.expiresAt, value.publishedAt) <= 0) {
    fail("invalid_time_order", "$response.expiresAt", "Response expiry must follow publication");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.publishedAt) > 7 * 24 * 60 * 60 * 1_000) {
    fail("response_retention_too_long", "$response.expiresAt", "Response cannot exceed seven days");
  }
  if (parent && (value.interactionId !== parent.interactionId || compareTimestamps(value.expiresAt, parent.expiresAt) > 0)) {
    fail("response_parent_mismatch", "$response", "Response must match and not outlive parent Interaction");
  }
  assertOneOf(value.state, ["available", "response_expired", "response_revoked", "origin_revoked", "interaction_deleted", "room_retired"] as const, "$response.state");
  assertIntegerInRange(value.stateVersion, "$response.stateVersion", 1, Number.MAX_SAFE_INTEGER);
  return value as unknown as ResponseV1;
}

export function validateArtifactApprovalV1(value: unknown): ArtifactApprovalV1 {
  assertRecord(value, "$approval");
  assertExactKeys(value, "$approval", ["schemaVersion", "approvalId", "artifactClass", "artifactHash", "roomId", "projectionId", "interactionId", "basisHash", "policyHash", "approvedAt", "expiresAt", "operationId"]);
  if (value.schemaVersion !== "artifact_approval.v1") fail("schema_version", "$approval.schemaVersion", "expected artifact_approval.v1");
  assertOpaqueId(value.approvalId, "approval", "$approval.approvalId");
  assertOneOf(value.artifactClass, ["projection", "response"] as const, "$approval.artifactClass");
  assertSha256(value.artifactHash, "$approval.artifactHash");
  assertOpaqueId(value.roomId, "room", "$approval.roomId");
  assertOpaqueId(value.projectionId, "proj", "$approval.projectionId");
  assertNullableId(value.interactionId, "interaction", "$approval.interactionId");
  if (value.artifactClass === "response" && value.interactionId === null) fail("interaction_required", "$approval.interactionId", "Response approval needs Interaction");
  if (value.artifactClass === "projection" && value.interactionId !== null) fail("interaction_forbidden", "$approval.interactionId", "Projection approval has no Interaction");
  assertSha256(value.basisHash, "$approval.basisHash");
  assertSha256(value.policyHash, "$approval.policyHash");
  assertUtcTimestamp(value.approvedAt, "$approval.approvedAt");
  assertUtcTimestamp(value.expiresAt, "$approval.expiresAt");
  if (compareTimestamps(value.expiresAt, value.approvedAt) <= 0) fail("invalid_time_order", "$approval.expiresAt", "approval expiry must follow approval");
  assertOpaqueId(value.operationId, "op", "$approval.operationId");
  return value as unknown as ArtifactApprovalV1;
}

export function validatePublicationAttestationV1(value: unknown): PublicationAttestationV1 {
  assertRecord(value, "$publicationAttestation");
  assertExactKeys(value, "$publicationAttestation", [
    "schemaVersion", "attestationId", "bindingId", "roomId", "artifactClass", "artifactId",
    "artifactHash", "issuedAt", "expiresAt", "hmacSha256",
  ]);
  if (value.schemaVersion !== "publication_attestation.v1") {
    fail("schema_version", "$publicationAttestation.schemaVersion", "expected publication_attestation.v1");
  }
  assertOpaqueId(value.attestationId, "att", "$publicationAttestation.attestationId");
  assertOpaqueId(value.bindingId, "binding", "$publicationAttestation.bindingId");
  assertOpaqueId(value.roomId, "room", "$publicationAttestation.roomId");
  assertOneOf(value.artifactClass, ["projection", "response"] as const, "$publicationAttestation.artifactClass");
  assertOpaqueId(value.artifactId, value.artifactClass === "projection" ? "proj" : "response", "$publicationAttestation.artifactId");
  assertSha256(value.artifactHash, "$publicationAttestation.artifactHash");
  assertUtcTimestamp(value.issuedAt, "$publicationAttestation.issuedAt");
  assertUtcTimestamp(value.expiresAt, "$publicationAttestation.expiresAt");
  if (compareTimestamps(value.expiresAt, value.issuedAt) <= 0) {
    fail("invalid_time_order", "$publicationAttestation.expiresAt", "attestation expiry must follow issue time");
  }
  assertSha256(value.hmacSha256, "$publicationAttestation.hmacSha256");
  return value as unknown as PublicationAttestationV1;
}

export function validateResponsePublicationV1(value: unknown): ResponsePublicationV1 {
  assertRecord(value, "$responsePublication");
  assertExactKeys(value, "$responsePublication", [
    "schemaVersion", "responseId", "interactionId", "roomId", "projectionId", "body", "candidateHash",
    "originStateAtPublication", "sourceDisclosureClass", "localBasisAttestationId", "payloadHash",
    "publishedAt", "expiresAt",
  ]);
  if (value.schemaVersion !== "response_publication.v1") {
    fail("schema_version", "$responsePublication.schemaVersion", "expected response_publication.v1");
  }
  assertOpaqueId(value.responseId, "response", "$responsePublication.responseId");
  assertOpaqueId(value.interactionId, "interaction", "$responsePublication.interactionId");
  assertOpaqueId(value.roomId, "room", "$responsePublication.roomId");
  assertOpaqueId(value.projectionId, "proj", "$responsePublication.projectionId");
  assertCanonicalText(value.body, "$responsePublication.body", { minScalars: 1, maxBytes: 16 * 1_024 });
  assertSha256(value.candidateHash, "$responsePublication.candidateHash");
  assertOneOf(value.originStateAtPublication, ["published_fresh", "stale", "superseded", "expired"] as const, "$responsePublication.originStateAtPublication");
  assertOneOf(value.sourceDisclosureClass, RESPONSE_SOURCE_DISCLOSURE_CLASSES, "$responsePublication.sourceDisclosureClass");
  assertOpaqueId(value.localBasisAttestationId, "att", "$responsePublication.localBasisAttestationId");
  assertSha256(value.payloadHash, "$responsePublication.payloadHash");
  assertUtcTimestamp(value.publishedAt, "$responsePublication.publishedAt");
  assertUtcTimestamp(value.expiresAt, "$responsePublication.expiresAt");
  if (compareTimestamps(value.expiresAt, value.publishedAt) <= 0) {
    fail("invalid_time_order", "$responsePublication.expiresAt", "Response publication expiry must follow publication");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.publishedAt) > 7 * 24 * 60 * 60 * 1_000) {
    fail("response_retention_too_long", "$responsePublication.expiresAt", "Response publication cannot exceed seven days");
  }
  if (canonicalSha256Omitting(value, ["payloadHash"]) !== value.payloadHash) {
    fail("payload_hash_mismatch", "$responsePublication.payloadHash", "must hash canonical public Response payload excluding payloadHash");
  }
  return value as unknown as ResponsePublicationV1;
}

export function validateHostedPublicationDeliveryV1(value: unknown): HostedPublicationDeliveryV1 {
  assertRecord(value, "$hostedPublicationDelivery");
  assertExactKeys(value, "$hostedPublicationDelivery", [
    "schemaVersion", "artifactClass", "projection", "response", "attestation",
  ]);
  if (value.schemaVersion !== "hosted_publication_delivery.v1") {
    fail("schema_version", "$hostedPublicationDelivery.schemaVersion", "expected hosted_publication_delivery.v1");
  }
  assertOneOf(value.artifactClass, ["projection", "response"] as const, "$hostedPublicationDelivery.artifactClass");
  const attestation = validatePublicationAttestationV1(value.attestation);
  if (attestation.artifactClass !== value.artifactClass) {
    fail("publication_attestation_mismatch", "$hostedPublicationDelivery.attestation.artifactClass", "must match delivery arm");
  }
  if (value.artifactClass === "projection") {
    if (value.response !== null) fail("publication_arm_mismatch", "$hostedPublicationDelivery.response", "projection delivery requires null response arm");
    const projection = validateProjectionCapsuleV1(value.projection);
    if (
      attestation.attestationId !== projection.publicationAttestationId
      || attestation.roomId !== projection.roomId
      || attestation.artifactId !== projection.projectionId
      || attestation.artifactHash !== projection.payloadHash
    ) {
      fail("publication_attestation_mismatch", "$hostedPublicationDelivery.attestation", "must bind the exact Projection ID, Room, payload hash, and attestation ID");
    }
    if (compareTimestamps(attestation.issuedAt, projection.publishedAt) < 0) {
      fail("publication_attestation_time_mismatch", "$hostedPublicationDelivery.attestation.issuedAt", "cannot precede Projection publication time");
    }
  } else {
    if (value.projection !== null) fail("publication_arm_mismatch", "$hostedPublicationDelivery.projection", "response delivery requires null projection arm");
    const response = validateResponsePublicationV1(value.response);
    if (
      attestation.roomId !== response.roomId
      || attestation.artifactId !== response.responseId
      || attestation.artifactHash !== response.payloadHash
    ) {
      fail("publication_attestation_mismatch", "$hostedPublicationDelivery.attestation", "must bind the exact Response ID, Room, and payload hash");
    }
    if (attestation.issuedAt !== response.publishedAt) {
      fail("publication_attestation_time_mismatch", "$hostedPublicationDelivery.attestation.issuedAt", "must equal Response publication time");
    }
  }
  return value as unknown as HostedPublicationDeliveryV1;
}

export function validateResponseOrientationV1(value: unknown): ResponseOrientationV1 {
  assertRecord(value, "$orientation");
  assertExactKeys(value, "$orientation", ["schemaVersion", "orientationId", "entityName", "ownerIntent", "currentState", "nextMove", "publicClaimSummary", "eligibleCorrectionSummaries", "eligibleUnresolvedItems", "localTwinRevision", "localTwinContentHash", "contentHash"]);
  if (value.schemaVersion !== "response_orientation.v1") fail("schema_version", "$orientation.schemaVersion", "expected response_orientation.v1");
  assertOpaqueId(value.orientationId, "orientation", "$orientation.orientationId");
  assertCanonicalText(value.entityName, "$orientation.entityName", { maxBytes: 256 });
  assertCanonicalText(value.ownerIntent, "$orientation.ownerIntent", { maxBytes: 2_048 });
  assertCanonicalText(value.currentState, "$orientation.currentState", { maxBytes: 2_048 });
  assertCanonicalText(value.nextMove, "$orientation.nextMove", { maxBytes: 2_048 });
  assertStringArray(value.publicClaimSummary, "$orientation.publicClaimSummary", 20, 1_024);
  assertStringArray(value.eligibleCorrectionSummaries, "$orientation.eligibleCorrectionSummaries", 20, 1_024);
  assertStringArray(value.eligibleUnresolvedItems, "$orientation.eligibleUnresolvedItems", 20, 1_024);
  assertIntegerInRange(value.localTwinRevision, "$orientation.localTwinRevision", 1, Number.MAX_SAFE_INTEGER);
  assertSha256(value.localTwinContentHash, "$orientation.localTwinContentHash");
  assertSha256(value.contentHash, "$orientation.contentHash");
  const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
  if (bytes > 8 * 1_024) fail("orientation_too_large", "$orientation", "orientation exceeds 8 KiB");
  if (canonicalSha256Omitting(value, ["contentHash"]) !== value.contentHash) {
    fail("orientation_hash_mismatch", "$orientation.contentHash", "must hash canonical orientation excluding contentHash");
  }
  return value as unknown as ResponseOrientationV1;
}

export function validateResponseCandidateV1(value: unknown): ResponseCandidateV1 {
  assertRecord(value, "$candidate");
  assertExactKeys(value, "$candidate", ["schemaVersion", "candidateId", "interactionId", "sessionEnvelopeId", "roomId", "projectionId", "originState", "responseText", "sourceDisclosureClass", "twinBasisHash", "snapshotManifestHash", "sessionReceiptHash", "policyHash", "candidateHash", "admittedAt", "expiresAt"]);
  if (value.schemaVersion !== "response_candidate.v1") fail("schema_version", "$candidate.schemaVersion", "expected response_candidate.v1");
  assertOpaqueId(value.candidateId, "candidate", "$candidate.candidateId");
  assertOpaqueId(value.interactionId, "interaction", "$candidate.interactionId");
  assertNullableId(value.sessionEnvelopeId, "session", "$candidate.sessionEnvelopeId");
  assertOpaqueId(value.roomId, "room", "$candidate.roomId");
  assertOpaqueId(value.projectionId, "proj", "$candidate.projectionId");
  assertOneOf(value.originState, PROJECTION_STATES, "$candidate.originState");
  if (value.originState === "revoked") fail("revoked_origin", "$candidate.originState", "revoked origin cannot receive candidate");
  assertCanonicalText(value.responseText, "$candidate.responseText", { minScalars: 1, maxBytes: 16 * 1_024 });
  assertOneOf(value.sourceDisclosureClass, RESPONSE_SOURCE_DISCLOSURE_CLASSES, "$candidate.sourceDisclosureClass");
  assertSha256(value.twinBasisHash, "$candidate.twinBasisHash");
  assertNullableSha256(value.snapshotManifestHash, "$candidate.snapshotManifestHash");
  assertSha256(value.sessionReceiptHash, "$candidate.sessionReceiptHash");
  assertSha256(value.policyHash, "$candidate.policyHash");
  assertSha256(value.candidateHash, "$candidate.candidateHash");
  if (value.sourceDisclosureClass === "fresh_native_sanitized_snapshot_owner_reviewed") {
    if (value.sessionEnvelopeId === null || value.snapshotManifestHash === null) {
      fail("fresh_provenance_required", "$candidate", "Fresh candidate requires exact Session Envelope and snapshot");
    }
  } else if (value.sessionEnvelopeId !== null || value.snapshotManifestHash !== null) {
    fail("manual_provenance_conflict", "$candidate", "Manual candidate cannot claim a Session Envelope or snapshot");
  }
  assertUtcTimestamp(value.admittedAt, "$candidate.admittedAt");
  assertUtcTimestamp(value.expiresAt, "$candidate.expiresAt");
  if (compareTimestamps(value.expiresAt, value.admittedAt) <= 0) {
    fail("invalid_time_order", "$candidate.expiresAt", "candidate expiry must follow admission");
  }
  if (Date.parse(value.expiresAt) - Date.parse(value.admittedAt) > 7 * 24 * 60 * 60 * 1_000) {
    fail("candidate_retention_too_long", "$candidate.expiresAt", "candidate cannot exceed seven days");
  }
  if (canonicalSha256Omitting(value, ["candidateHash"]) !== value.candidateHash) {
    fail("candidate_hash_mismatch", "$candidate.candidateHash", "must hash canonical candidate excluding candidateHash");
  }
  return value as unknown as ResponseCandidateV1;
}

const FORBIDDEN_RECEIPT_KEYS = /^(?:body|request|requestText|response|responseText|candidate|candidateText|address|email|secret|token|credential|verificationCode|transcript|prompt|sourcePath|path|toolArguments|toolOutput|rawIp|userAgent)$/iu;

export function assertBodyFreeValue(value: unknown, path = "$receipt"): void {
  if (value === null || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value === "string") {
    assertCanonicalText(value, path, { maxBytes: 4_096 });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertBodyFreeValue(item, `${path}[${index}]`));
    return;
  }
  assertRecord(value, path);
  for (const [key, member] of Object.entries(value)) {
    if (FORBIDDEN_RECEIPT_KEYS.test(key)) fail("body_bearing_receipt", `${path}.${key}`, "sensitive field is forbidden in a body-free receipt");
    assertBodyFreeValue(member, `${path}.${key}`);
  }
}

export function redactToBodyFreeReceipt(
  input: Readonly<Record<string, unknown>>,
  allowlistedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  const allowed = new Set(allowlistedKeys);
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key) || FORBIDDEN_RECEIPT_KEYS.test(key)) continue;
    output[key] = value;
  }
  assertBodyFreeValue(output);
  return output;
}

export function validateOperationReceiptV1(value: unknown): OperationReceiptV1 {
  assertBodyFreeValue(value);
  assertRecord(value, "$receipt");
  assertExactKeys(value, "$receipt", ["schemaVersion", "receiptId", "actorClass", "action", "idempotencyKey", "canonicalRequestHash", "targetId", "targetVersion", "status", "committedAt", "bodyFreeCode"]);
  if (value.schemaVersion !== "operation_receipt.v1") fail("schema_version", "$receipt.schemaVersion", "expected operation_receipt.v1");
  assertOpaqueId(value.receiptId, "receipt", "$receipt.receiptId");
  assertCanonicalText(value.actorClass, "$receipt.actorClass", { maxBytes: 128 });
  assertCanonicalText(value.action, "$receipt.action", { maxBytes: 128 });
  assertCanonicalText(value.idempotencyKey, "$receipt.idempotencyKey", { minScalars: 16, maxBytes: 256 });
  assertSha256(value.canonicalRequestHash, "$receipt.canonicalRequestHash");
  assertCanonicalText(value.targetId, "$receipt.targetId", { minScalars: 18, maxBytes: 160 });
  assertIntegerInRange(value.targetVersion, "$receipt.targetVersion", 1, Number.MAX_SAFE_INTEGER);
  assertOneOf(value.status, ["committed", "no_op", "rejected", "terminal"] as const, "$receipt.status");
  assertUtcTimestamp(value.committedAt, "$receipt.committedAt");
  assertCanonicalText(value.bodyFreeCode, "$receipt.bodyFreeCode", { maxBytes: 128 });
  return value as unknown as OperationReceiptV1;
}

export function validateSessionReceiptV1(value: unknown): SessionReceiptV1 {
  assertBodyFreeValue(value);
  assertRecord(value, "$sessionReceipt");
  assertExactKeys(value, "$sessionReceipt", ["schemaVersion", "receiptId", "interactionId", "sessionEnvelopeId", "sessionEnvelopeHash", "startedAt", "finishedAt", "provider", "modelId", "terminalStatus", "dispatches", "inputTokens", "outputTokens", "applicableSpendUsd", "sourceQueryCount", "sourceResultBytes", "accessEvidenceDigest", "policyHash", "schemaHash", "runtimeVersion", "errorCode", "expiresAt"]);
  if (value.schemaVersion !== "session_receipt.v1") fail("schema_version", "$sessionReceipt.schemaVersion", "expected session_receipt.v1");
  assertOpaqueId(value.receiptId, "receipt", "$sessionReceipt.receiptId");
  assertOpaqueId(value.interactionId, "interaction", "$sessionReceipt.interactionId");
  assertNullableId(value.sessionEnvelopeId, "session", "$sessionReceipt.sessionEnvelopeId");
  assertNullableSha256(value.sessionEnvelopeHash, "$sessionReceipt.sessionEnvelopeHash");
  if ((value.sessionEnvelopeId === null) !== (value.sessionEnvelopeHash === null)) {
    fail("session_envelope_pair", "$sessionReceipt", "Session Envelope ID and hash must both be present or absent");
  }
  assertUtcTimestamp(value.startedAt, "$sessionReceipt.startedAt");
  assertUtcTimestamp(value.finishedAt, "$sessionReceipt.finishedAt");
  if (compareTimestamps(value.finishedAt, value.startedAt) < 0) fail("invalid_time_order", "$sessionReceipt.finishedAt", "cannot precede start");
  if (value.provider !== null && value.provider !== "OpenAI") fail("provider_not_allowed", "$sessionReceipt.provider", "expected OpenAI or null");
  if (value.modelId !== null) assertCanonicalText(value.modelId, "$sessionReceipt.modelId", { maxBytes: 256 });
  if ((value.provider === null) !== (value.modelId === null)) fail("provider_model_pair", "$sessionReceipt", "provider and model must both be present or absent");
  assertOneOf(value.terminalStatus, ["candidate_admitted", "manual_only", "failed", "budget_stopped", "terminal_aborted"] as const, "$sessionReceipt.terminalStatus");
  assertIntegerInRange(value.dispatches, "$sessionReceipt.dispatches", 0, 3);
  assertIntegerInRange(value.inputTokens, "$sessionReceipt.inputTokens", 0, 128_000);
  assertIntegerInRange(value.outputTokens, "$sessionReceipt.outputTokens", 0, 8_000);
  if (value.applicableSpendUsd !== null && (typeof value.applicableSpendUsd !== "number" || !Number.isFinite(value.applicableSpendUsd) || value.applicableSpendUsd < 0 || value.applicableSpendUsd > 1)) fail("invalid_spend", "$sessionReceipt.applicableSpendUsd", "expected null or finite amount in [0,1]");
  assertIntegerInRange(value.sourceQueryCount, "$sessionReceipt.sourceQueryCount", 0, Number.MAX_SAFE_INTEGER);
  assertIntegerInRange(value.sourceResultBytes, "$sessionReceipt.sourceResultBytes", 0, Number.MAX_SAFE_INTEGER);
  if (value.accessEvidenceDigest !== null) assertSha256(value.accessEvidenceDigest, "$sessionReceipt.accessEvidenceDigest");
  assertSha256(value.policyHash, "$sessionReceipt.policyHash");
  assertSha256(value.schemaHash, "$sessionReceipt.schemaHash");
  assertCanonicalText(value.runtimeVersion, "$sessionReceipt.runtimeVersion", { maxBytes: 256 });
  if (value.errorCode !== null) assertCanonicalText(value.errorCode, "$sessionReceipt.errorCode", { maxBytes: 128 });
  assertUtcTimestamp(value.expiresAt, "$sessionReceipt.expiresAt");
  if (value.terminalStatus === "manual_only") {
    if (
      value.sessionEnvelopeId !== null
      || value.sessionEnvelopeHash !== null
      || value.dispatches !== 0
      || value.inputTokens !== 0
      || value.outputTokens !== 0
      || value.applicableSpendUsd !== null
      || value.sourceQueryCount !== 0
      || value.sourceResultBytes !== 0
      || value.accessEvidenceDigest !== null
      || value.provider !== null
      || value.modelId !== null
    ) fail("manual_only_provider_evidence", "$sessionReceipt", "manual-only must record no Session Envelope, provider, source access, usage, or spend");
  } else if (value.sessionEnvelopeId === null || value.sessionEnvelopeHash === null) {
    fail("session_envelope_required", "$sessionReceipt", "Fresh runtime receipt requires exact Session Envelope binding");
  }
  return value as unknown as SessionReceiptV1;
}

export function validateReadyNoticeV1(value: unknown): ReadyNoticeV1 {
  assertRecord(value, "$notice");
  assertExactKeys(value, "$notice", ["schemaVersion", "noticeId", "interactionId", "responseId", "state", "encryptedDeliveryTarget", "stableAttemptId", "providerIdempotencyKey", "attemptNumber", "leaseExpiresAt", "reconciliationDeadline", "noFutureRetry", "version"]);
  if (value.schemaVersion !== "ready_notice.v1") fail("schema_version", "$notice.schemaVersion", "expected ready_notice.v1");
  assertOpaqueId(value.noticeId, "notice", "$notice.noticeId");
  assertOpaqueId(value.interactionId, "interaction", "$notice.interactionId");
  assertOpaqueId(value.responseId, "response", "$notice.responseId");
  assertOneOf(value.state, ["absent", "ready_pending", "submitting", "canceled", "provider_accepted", "delivery_unknown", "failed"] as const, "$notice.state");
  if (value.encryptedDeliveryTarget !== null) assertCanonicalText(value.encryptedDeliveryTarget, "$notice.encryptedDeliveryTarget", { maxBytes: 8_192 });
  if (value.stableAttemptId !== null) assertOpaqueId(value.stableAttemptId, "attempt", "$notice.stableAttemptId");
  if (value.providerIdempotencyKey !== null) assertCanonicalText(value.providerIdempotencyKey, "$notice.providerIdempotencyKey", { minScalars: 16, maxBytes: 256 });
  assertBoolean(value.noFutureRetry, "$notice.noFutureRetry");
  assertIntegerInRange(value.attemptNumber, "$notice.attemptNumber", 0, Number.MAX_SAFE_INTEGER);
  assertNullableTimestamp(value.leaseExpiresAt, "$notice.leaseExpiresAt");
  assertNullableTimestamp(value.reconciliationDeadline, "$notice.reconciliationDeadline");
  assertIntegerInRange(value.version, "$notice.version", 1, Number.MAX_SAFE_INTEGER);
  if ((value.state === "submitting" || value.state === "delivery_unknown") && (value.stableAttemptId === null || value.providerIdempotencyKey === null)) fail("attempt_evidence_required", "$notice", "handoff state needs stable attempt and provider key");
  if ((value.state === "provider_accepted" || value.state === "failed") && value.encryptedDeliveryTarget !== null) {
    fail("delivery_target_retained", "$notice.encryptedDeliveryTarget", "terminal delivery cannot retain target");
  }
  if (value.noFutureRetry && value.state === "ready_pending") fail("retry_state_conflict", "$notice", "noFutureRetry cannot be ready_pending");
  return value as unknown as ReadyNoticeV1;
}

export function validateProjectionReadViewV1(value: unknown): ProjectionReadViewV1 {
  assertRecord(value, "$projectionReadView");
  assertExactKeys(value, "$projectionReadView", ["schemaVersion", "room", "projection", "lifecycle", "warning", "cacheControl"]);
  if (value.schemaVersion !== "projection_read_view.v1") fail("schema_version", "$projectionReadView.schemaVersion", "expected projection_read_view.v1");
  const room = validateRoomV1(value.room);
  const projection = validateProjectionCapsuleV1(value.projection);
  const lifecycle = validateProjectionLifecycleV1(value.lifecycle);
  if (value.warning !== null) assertOneOf(value.warning, ["stale_projection"] as const, "$projectionReadView.warning");
  if (value.cacheControl !== "no-store") fail("cache_control", "$projectionReadView.cacheControl", "sensitive view must be no-store");
  if (room.roomId !== projection.roomId || projection.projectionId !== lifecycle.projectionId) fail("view_scope_mismatch", "$projectionReadView", "Room/Projection/lifecycle IDs must agree");
  const hasStaleWarning = value.warning === "stale_projection";
  if (lifecycle.ownerState === "stale" && !hasStaleWarning) {
    fail("stale_warning_mismatch", "$projectionReadView.warning", "owner-stale view must carry the exact stale warning");
  }
  if (lifecycle.ownerState !== "published_fresh" && lifecycle.ownerState !== "stale" && hasStaleWarning) {
    fail("stale_warning_mismatch", "$projectionReadView.warning", "terminal Projection states cannot carry a readable stale warning");
  }
  return value as unknown as ProjectionReadViewV1;
}

export function validateTransportGateDecisionV1(value: unknown): TransportGateDecisionV1 {
  assertRecord(value, "$transportDecision");
  assertExactKeys(value, "$transportDecision", ["schemaVersion", "allowed", "code", "permit", "bodyFreeReceipt"]);
  if (value.schemaVersion !== "transport_gate_decision.v1") fail("schema_version", "$transportDecision.schemaVersion", "expected transport_gate_decision.v1");
  assertBoolean(value.allowed, "$transportDecision.allowed");
  assertCanonicalText(value.code, "$transportDecision.code", { minScalars: 1, maxBytes: 128 });
  if (value.permit !== null) validateDispatchPermitV1(value.permit);
  validateOperationReceiptV1(value.bodyFreeReceipt);
  if (value.allowed !== (value.permit !== null)) fail("permit_decision_mismatch", "$transportDecision", "allowed decision must carry permit; denial must not");
  return value as unknown as TransportGateDecisionV1;
}
