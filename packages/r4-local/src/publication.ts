import { createHmac, timingSafeEqual } from "node:crypto";
import {
  canonicalJsonBytes,
  canonicalSha256,
  assertOpaqueId,
  validateArtifactApprovalV1,
  validateHostedPublicationDeliveryV1,
  validateProjectionBasisV1,
  validateProjectionCapsuleV1,
  validatePublicationAttestationV1,
  validateResponseCandidateV1,
  validateResponsePublicationV1,
  type ArtifactApprovalV1,
  type HostedPublicationDeliveryV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
  type ProjectionOwnerState,
  type PublicationAttestationV1,
  type ResponseCandidateV1,
  type ResponsePublicationV1,
  type Sha256,
} from "../../r4-protocol/src/index.ts";

const SHA256_PREFIX = "sha256:";
const MINIMUM_BINDING_SECRET_BYTES = 32;

export interface RoomPublicationBindingV1 {
  readonly bindingId: string;
  readonly roomId: string;
  /** Per-Room key material from the protected connector; never serialized. */
  readonly secret: Uint8Array;
  readonly state: "current" | "revoked" | "expired";
  readonly expiresAt: string;
}

export interface ProjectionPublicationPreflightV1 {
  readonly artifactClass: "projection";
  readonly observedAt: string;
  readonly roomId: string;
  readonly roomStatus: "active" | "retired";
  readonly projectionId: string;
  readonly twinRevision: number;
  readonly twinRevisionHash: Sha256;
  readonly workspaceContractHash: Sha256;
  readonly projectionPolicyGeneration: number;
  readonly projectionPolicyHash: Sha256;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly currentHostedPayloadHash: Sha256 | null;
}

export interface ResponsePublicationPreflightV1 {
  readonly artifactClass: "response";
  readonly observedAt: string;
  readonly roomId: string;
  readonly roomStatus: "active" | "retired";
  readonly projectionId: string;
  readonly interactionId: string;
  readonly interactionState: "accepted" | "seen_locally" | "preparing" | "terminal";
  readonly originState: ProjectionOwnerState;
  readonly candidateStoreState: "protected_current" | "missing" | "submitted_unknown";
  readonly candidateHash: Sha256;
  readonly twinBasisHash: Sha256;
  readonly snapshotManifestHash: Sha256 | null;
  readonly sessionReceiptHash: Sha256;
  readonly sourceDisclosureClass: ResponseCandidateV1["sourceDisclosureClass"];
  readonly policyHash: Sha256;
  readonly existingResponseId: string | null;
  readonly parentInteractionExpiresAt: string;
}

/** Protected connector-side current-state reader, invoked only after approval exists. */
export interface TrustedResponsePublicationStateReaderV1 {
  readonly protocolVersion: "trusted_response_publication_state_reader.v1";
  readCurrentAfterApproval(input: {
    readonly approvalId: string;
    readonly approvedAt: string;
    readonly candidateHash: Sha256;
    readonly roomId: string;
    readonly projectionId: string;
    readonly interactionId: string;
  }): ResponsePublicationPreflightV1;
}

/** Protected connector-side reader for current Twin/policy/hosted Projection state. */
export interface TrustedProjectionPublicationStateReaderV1 {
  readonly protocolVersion: "trusted_projection_publication_state_reader.v1";
  readCurrentAfterApproval(input: {
    readonly approvalId: string;
    readonly approvedAt: string;
    readonly payloadHash: Sha256;
    readonly roomId: string;
    readonly projectionId: string;
  }): ProjectionPublicationPreflightV1;
}

export interface ProjectionPublicationNoOpReceiptV1 {
  readonly schemaVersion: "projection_publication_no_op_receipt.v1";
  readonly receiptId: string;
  readonly roomId: string;
  readonly projectionId: string;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly observedAt: string;
  readonly bodyFreeCode: "identical_projection_no_op";
}

export interface PublicationAttestationPreimageV1 {
  readonly domain: "forme.r4.publication-attestation.v1";
  readonly schemaVersion: "publication_attestation.v1";
  readonly attestationId: string;
  readonly bindingId: string;
  readonly roomId: string;
  readonly artifactClass: "projection" | "response";
  readonly artifactId: string;
  readonly artifactHash: Sha256;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

function fail(code: string): never {
  throw new Error(`hosted_publication_denied:${code}`);
}

function exactTime(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail(`${label}_invalid`);
  return parsed;
}

function same(actual: unknown, expected: unknown, code: string): void {
  if (actual !== expected) fail(code);
}

function validateBinding(binding: RoomPublicationBindingV1, roomId: string, now: string, attestationExpiresAt: string): void {
  same(binding.roomId, roomId, "binding_room_mismatch");
  if (binding.state !== "current") fail("binding_not_current");
  if (!(binding.secret instanceof Uint8Array) || binding.secret.byteLength < MINIMUM_BINDING_SECRET_BYTES) {
    fail("binding_secret_too_short");
  }
  const nowMs = exactTime(now, "observed_at");
  const bindingExpiryMs = exactTime(binding.expiresAt, "binding_expiry");
  const attestationExpiryMs = exactTime(attestationExpiresAt, "attestation_expiry");
  if (bindingExpiryMs <= nowMs) fail("binding_expired");
  if (attestationExpiryMs <= nowMs) fail("attestation_expired_at_issue");
  if (attestationExpiryMs > bindingExpiryMs) fail("attestation_outlives_binding");
}

export function publicationAttestationPreimageV1(
  attestation: Omit<PublicationAttestationV1, "hmacSha256">,
): PublicationAttestationPreimageV1 {
  return {
    domain: "forme.r4.publication-attestation.v1",
    schemaVersion: attestation.schemaVersion,
    attestationId: attestation.attestationId,
    bindingId: attestation.bindingId,
    roomId: attestation.roomId,
    artifactClass: attestation.artifactClass,
    artifactId: attestation.artifactId,
    artifactHash: attestation.artifactHash,
    issuedAt: attestation.issuedAt,
    expiresAt: attestation.expiresAt,
  };
}

function hmacSha256(secret: Uint8Array, preimage: PublicationAttestationPreimageV1): Sha256 {
  return `${SHA256_PREFIX}${createHmac("sha256", secret).update(canonicalJsonBytes(preimage)).digest("hex")}` as Sha256;
}

function signAttestation(input: {
  attestationId: string;
  binding: RoomPublicationBindingV1;
  artifactClass: "projection" | "response";
  artifactId: string;
  artifactHash: Sha256;
  issuedAt: string;
  expiresAt: string;
}): PublicationAttestationV1 {
  const unsigned = {
    schemaVersion: "publication_attestation.v1",
    attestationId: input.attestationId,
    bindingId: input.binding.bindingId,
    roomId: input.binding.roomId,
    artifactClass: input.artifactClass,
    artifactId: input.artifactId,
    artifactHash: input.artifactHash,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  } as const;
  return validatePublicationAttestationV1({
    ...unsigned,
    hmacSha256: hmacSha256(input.binding.secret, publicationAttestationPreimageV1(unsigned)),
  });
}

function validateApprovalWindow(approval: ArtifactApprovalV1, observedAt: string, attestationExpiresAt: string): void {
  const observed = exactTime(observedAt, "observed_at");
  const approved = exactTime(approval.approvedAt, "approval_time");
  const approvalExpiry = exactTime(approval.expiresAt, "approval_expiry");
  const attestationExpiry = exactTime(attestationExpiresAt, "attestation_expiry");
  if (approved > observed) fail("approval_not_yet_valid");
  if (approvalExpiry <= observed) fail("approval_expired");
  if (attestationExpiry > approvalExpiry) fail("attestation_outlives_approval");
}

function validateProjectionClaimBinding(projection: ProjectionCapsuleV1, basis: ProjectionBasisV1): void {
  if (projection.claims.length !== basis.claims.length) fail("projection_basis_claim_count_mismatch");
  for (let index = 0; index < projection.claims.length; index += 1) {
    const publicClaim = projection.claims[index];
    const privateClaim = basis.claims[index];
    if (
      !publicClaim
      || !privateClaim
      || publicClaim.slot !== privateClaim.slot
      || publicClaim.text !== privateClaim.claimText
      || publicClaim.attribution !== privateClaim.attribution
    ) fail("projection_basis_claim_mismatch");
  }
}

export function buildProjectionPublicationDeliveryV1(input: {
  projection: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
  approval: ArtifactApprovalV1;
  preflight: ProjectionPublicationPreflightV1;
  binding: RoomPublicationBindingV1;
  attestationExpiresAt: string;
}): HostedPublicationDeliveryV1 {
  const projection = validateProjectionCapsuleV1(input.projection);
  const basis = validateProjectionBasisV1(input.basis);
  const approval = validateArtifactApprovalV1(input.approval);
  const basisHash = canonicalSha256(basis);
  const { preflight } = input;

  validateBinding(input.binding, projection.roomId, preflight.observedAt, input.attestationExpiresAt);
  validateApprovalWindow(approval, preflight.observedAt, input.attestationExpiresAt);
  same(preflight.artifactClass, "projection", "preflight_artifact_class_mismatch");
  if (preflight.roomStatus !== "active") fail("room_not_active");
  same(preflight.roomId, projection.roomId, "preflight_room_mismatch");
  same(preflight.projectionId, projection.projectionId, "preflight_projection_mismatch");
  same(preflight.payloadHash, projection.payloadHash, "preflight_payload_mismatch");
  same(preflight.basisHash, basisHash, "preflight_basis_mismatch");
  same(preflight.twinRevision, basis.twinRevision, "twin_revision_changed");
  same(preflight.twinRevisionHash, basis.twinRevisionHash, "twin_revision_hash_changed");
  same(preflight.workspaceContractHash, basis.workspaceContractHash, "workspace_contract_changed");
  same(preflight.projectionPolicyGeneration, basis.projectionPolicyGeneration, "projection_policy_generation_changed");
  same(preflight.projectionPolicyHash, basis.projectionPolicyHash, "projection_policy_changed");
  same(basis.basisId, projection.disclosureBasisId, "projection_basis_id_mismatch");
  same(basis.roomId, projection.roomId, "projection_basis_room_mismatch");
  same(basis.projectionId, projection.projectionId, "projection_basis_target_mismatch");
  same(basis.payloadHash, projection.payloadHash, "projection_basis_payload_mismatch");
  if (basis.hostedReceiptId !== null) fail("projection_already_receipted");
  validateProjectionClaimBinding(projection, basis);

  if (approval.artifactClass !== "projection") fail("approval_artifact_class_mismatch");
  same(approval.artifactHash, projection.payloadHash, "approval_artifact_hash_mismatch");
  same(approval.roomId, projection.roomId, "approval_room_mismatch");
  same(approval.projectionId, projection.projectionId, "approval_projection_mismatch");
  same(approval.interactionId, null, "approval_interaction_forbidden");
  same(approval.basisHash, basisHash, "approval_basis_mismatch");
  same(approval.policyHash, basis.projectionPolicyHash, "approval_policy_mismatch");
  if (preflight.currentHostedPayloadHash === projection.payloadHash) fail("identical_projection_no_op");

  const attestation = signAttestation({
    attestationId: projection.publicationAttestationId,
    binding: input.binding,
    artifactClass: "projection",
    artifactId: projection.projectionId,
    artifactHash: projection.payloadHash,
    issuedAt: preflight.observedAt,
    expiresAt: input.attestationExpiresAt,
  });
  return validateHostedPublicationDeliveryV1({
    schemaVersion: "hosted_publication_delivery.v1",
    artifactClass: "projection",
    projection,
    response: null,
    attestation,
  });
}

export function buildResponsePublicationDeliveryV1(input: {
  responseId: string;
  publicationAttestationId: string;
  candidate: ResponseCandidateV1;
  approval: ArtifactApprovalV1;
  preflight: ResponsePublicationPreflightV1;
  binding: RoomPublicationBindingV1;
  responseExpiresAt: string;
  attestationExpiresAt: string;
}): HostedPublicationDeliveryV1 {
  const candidate = validateResponseCandidateV1(input.candidate);
  if (candidate.originState === "revoked") fail("origin_revoked");
  const approval = validateArtifactApprovalV1(input.approval);
  const { preflight } = input;

  validateBinding(input.binding, candidate.roomId, preflight.observedAt, input.attestationExpiresAt);
  validateApprovalWindow(approval, preflight.observedAt, input.attestationExpiresAt);
  same(preflight.artifactClass, "response", "preflight_artifact_class_mismatch");
  if (preflight.roomStatus !== "active") fail("room_not_active");
  if (!(["accepted", "seen_locally", "preparing"] as const).includes(preflight.interactionState as never)) {
    fail("interaction_not_response_eligible");
  }
  if (preflight.candidateStoreState !== "protected_current") fail("candidate_not_protected_current");
  if (preflight.existingResponseId !== null) fail("response_already_exists");
  same(preflight.roomId, candidate.roomId, "preflight_room_mismatch");
  same(preflight.projectionId, candidate.projectionId, "preflight_projection_mismatch");
  same(preflight.interactionId, candidate.interactionId, "preflight_interaction_mismatch");
  same(preflight.originState, candidate.originState, "origin_state_changed");
  same(preflight.candidateHash, candidate.candidateHash, "candidate_hash_changed");
  same(preflight.twinBasisHash, candidate.twinBasisHash, "twin_basis_changed");
  same(preflight.snapshotManifestHash, candidate.snapshotManifestHash, "snapshot_manifest_changed");
  same(preflight.sessionReceiptHash, candidate.sessionReceiptHash, "session_receipt_changed");
  same(preflight.sourceDisclosureClass, candidate.sourceDisclosureClass, "source_disclosure_class_changed");
  same(preflight.policyHash, candidate.policyHash, "response_policy_changed");

  if (approval.artifactClass !== "response") fail("approval_artifact_class_mismatch");
  same(approval.artifactHash, candidate.candidateHash, "approval_artifact_hash_mismatch");
  same(approval.roomId, candidate.roomId, "approval_room_mismatch");
  same(approval.projectionId, candidate.projectionId, "approval_projection_mismatch");
  same(approval.interactionId, candidate.interactionId, "approval_interaction_mismatch");
  same(approval.basisHash, candidate.twinBasisHash, "approval_basis_mismatch");
  same(approval.policyHash, candidate.policyHash, "approval_policy_mismatch");

  const publishedAtMs = exactTime(preflight.observedAt, "observed_at");
  const responseExpiryMs = exactTime(input.responseExpiresAt, "response_expiry");
  if (publishedAtMs < exactTime(candidate.admittedAt, "candidate_admission")) fail("candidate_not_yet_admitted");
  if (publishedAtMs >= exactTime(candidate.expiresAt, "candidate_expiry")) fail("candidate_expired");
  if (responseExpiryMs > exactTime(candidate.expiresAt, "candidate_expiry")) fail("response_outlives_candidate");
  if (responseExpiryMs > exactTime(preflight.parentInteractionExpiresAt, "interaction_expiry")) fail("response_outlives_interaction");

  const responsePreimage: Omit<ResponsePublicationV1, "payloadHash"> = {
    schemaVersion: "response_publication.v1",
    responseId: input.responseId,
    interactionId: candidate.interactionId,
    roomId: candidate.roomId,
    projectionId: candidate.projectionId,
    body: candidate.responseText,
    candidateHash: candidate.candidateHash,
    originStateAtPublication: candidate.originState as Exclude<ProjectionOwnerState, "revoked">,
    sourceDisclosureClass: candidate.sourceDisclosureClass,
    localBasisAttestationId: `att_${canonicalSha256({
      interactionId: candidate.interactionId,
      twinBasisHash: candidate.twinBasisHash,
      snapshotManifestHash: candidate.snapshotManifestHash,
      sessionReceiptHash: candidate.sessionReceiptHash,
      policyHash: candidate.policyHash,
      sourceDisclosureClass: candidate.sourceDisclosureClass,
    }).slice(7, 39)}`,
    publishedAt: preflight.observedAt,
    expiresAt: input.responseExpiresAt,
  };
  const response = validateResponsePublicationV1({
    ...responsePreimage,
    payloadHash: canonicalSha256(responsePreimage),
  });
  const attestation = signAttestation({
    attestationId: input.publicationAttestationId,
    binding: input.binding,
    artifactClass: "response",
    artifactId: response.responseId,
    artifactHash: response.payloadHash,
    issuedAt: preflight.observedAt,
    expiresAt: input.attestationExpiresAt,
  });
  return validateHostedPublicationDeliveryV1({
    schemaVersion: "hosted_publication_delivery.v1",
    artifactClass: "response",
    projection: null,
    response,
    attestation,
  });
}

/** Throws on any structural, scope, time, or HMAC mismatch. */
export function verifyHostedPublicationDeliveryHmacV1(
  value: unknown,
  binding: RoomPublicationBindingV1,
  now: string,
): HostedPublicationDeliveryV1 {
  const delivery = validateHostedPublicationDeliveryV1(value);
  validateBinding(binding, delivery.attestation.roomId, now, delivery.attestation.expiresAt);
  same(delivery.attestation.bindingId, binding.bindingId, "attestation_binding_mismatch");
  if (exactTime(now, "verification_time") < exactTime(delivery.attestation.issuedAt, "attestation_issue")) {
    fail("attestation_not_yet_valid");
  }
  const expected = hmacSha256(binding.secret, publicationAttestationPreimageV1(delivery.attestation));
  const expectedBytes = Buffer.from(expected.slice(SHA256_PREFIX.length), "hex");
  const actualBytes = Buffer.from(delivery.attestation.hmacSha256.slice(SHA256_PREFIX.length), "hex");
  if (expectedBytes.byteLength !== actualBytes.byteLength || !timingSafeEqual(expectedBytes, actualBytes)) {
    fail("attestation_hmac_mismatch");
  }
  return delivery;
}

export function coordinateProjectionPublicationV1(input: {
  projection: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
  approval: ArtifactApprovalV1;
  binding: RoomPublicationBindingV1;
  attestationExpiresAt: string;
  noOpReceiptId: string;
  reader: TrustedProjectionPublicationStateReaderV1;
}):
  | { readonly outcome: "deliver"; readonly delivery: HostedPublicationDeliveryV1 }
  | { readonly outcome: "no_op"; readonly receipt: ProjectionPublicationNoOpReceiptV1 } {
  const projection = validateProjectionCapsuleV1(input.projection);
  const basis = validateProjectionBasisV1(input.basis);
  const approval = validateArtifactApprovalV1(input.approval);
  if (input.reader.protocolVersion !== "trusted_projection_publication_state_reader.v1") fail("untrusted_current_state_reader");
  const preflight = input.reader.readCurrentAfterApproval({
    approvalId: approval.approvalId,
    approvedAt: approval.approvedAt,
    payloadHash: projection.payloadHash,
    roomId: projection.roomId,
    projectionId: projection.projectionId,
  });
  if (exactTime(preflight.observedAt, "observed_at") < exactTime(approval.approvedAt, "approval_time")) {
    fail("current_state_not_reread_after_approval");
  }
  try {
    return {
      outcome: "deliver",
      delivery: buildProjectionPublicationDeliveryV1({
        projection,
        basis,
        approval,
        preflight,
        binding: input.binding,
        attestationExpiresAt: input.attestationExpiresAt,
      }),
    };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.endsWith(":identical_projection_no_op")) throw error;
    assertOpaqueId(input.noOpReceiptId, "receipt", "$projectionNoOp.receiptId");
    return {
      outcome: "no_op",
      receipt: {
        schemaVersion: "projection_publication_no_op_receipt.v1",
        receiptId: input.noOpReceiptId,
        roomId: projection.roomId,
        projectionId: projection.projectionId,
        payloadHash: projection.payloadHash,
        basisHash: canonicalSha256(basis),
        observedAt: preflight.observedAt,
        bodyFreeCode: "identical_projection_no_op",
      },
    };
  }
}

export function coordinateResponsePublicationV1(input: {
  responseId: string;
  publicationAttestationId: string;
  candidate: ResponseCandidateV1;
  approval: ArtifactApprovalV1;
  binding: RoomPublicationBindingV1;
  responseExpiresAt: string;
  attestationExpiresAt: string;
  reader: TrustedResponsePublicationStateReaderV1;
}): HostedPublicationDeliveryV1 {
  const candidate = validateResponseCandidateV1(input.candidate);
  const approval = validateArtifactApprovalV1(input.approval);
  if (input.reader.protocolVersion !== "trusted_response_publication_state_reader.v1") fail("untrusted_current_state_reader");
  const preflight = input.reader.readCurrentAfterApproval({
    approvalId: approval.approvalId,
    approvedAt: approval.approvedAt,
    candidateHash: candidate.candidateHash,
    roomId: candidate.roomId,
    projectionId: candidate.projectionId,
    interactionId: candidate.interactionId,
  });
  if (exactTime(preflight.observedAt, "observed_at") < exactTime(approval.approvedAt, "approval_time")) {
    fail("current_state_not_reread_after_approval");
  }
  return buildResponsePublicationDeliveryV1({
    responseId: input.responseId,
    publicationAttestationId: input.publicationAttestationId,
    candidate,
    approval,
    preflight,
    binding: input.binding,
    responseExpiresAt: input.responseExpiresAt,
    attestationExpiresAt: input.attestationExpiresAt,
  });
}
