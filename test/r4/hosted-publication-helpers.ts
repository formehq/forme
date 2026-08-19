import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
  type ResponseCandidateV1,
} from "../../packages/r4-protocol/src/index.ts";
import {
  buildProjectionPublicationDeliveryV1,
  buildResponsePublicationDeliveryV1,
} from "../../packages/r4-local/src/index.ts";
import {
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../../apps/room/src/synthetic-fixtures.ts";

const DEFAULT_BINDING_EXPIRY = "2026-09-02T12:00:00.000Z";

function binding(roomId: string, secret: string, bindingId: string) {
  return {
    bindingId,
    roomId,
    secret: new TextEncoder().encode(secret),
    state: "current" as const,
    expiresAt: DEFAULT_BINDING_EXPIRY,
  };
}

export function signedProjectionDeliveryBody(input: {
  projection: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
  approval: ArtifactApprovalV1;
  now?: string;
  secret?: string;
  bindingId?: string;
  currentHostedPayloadHash?: `sha256:${string}` | null;
}): Record<string, unknown> {
  const now = input.now ?? input.projection.publishedAt;
  return {
    delivery: buildProjectionPublicationDeliveryV1({
      projection: input.projection,
      basis: input.basis,
      approval: input.approval,
      preflight: {
        artifactClass: "projection",
        observedAt: now,
        roomId: input.projection.roomId,
        roomStatus: "active",
        projectionId: input.projection.projectionId,
        twinRevision: input.basis.twinRevision,
        twinRevisionHash: input.basis.twinRevisionHash,
        workspaceContractHash: input.basis.workspaceContractHash,
        projectionPolicyGeneration: input.basis.projectionPolicyGeneration,
        projectionPolicyHash: input.basis.projectionPolicyHash,
        payloadHash: input.projection.payloadHash,
        basisHash: canonicalSha256(input.basis),
        currentHostedPayloadHash: input.currentHostedPayloadHash ?? null,
      },
      binding: binding(
        input.projection.roomId,
        input.secret ?? SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
        input.bindingId ?? SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
      ),
      attestationExpiresAt: input.approval.expiresAt,
    }),
  };
}

export function signedResponseDeliveryBody(input: {
  candidate: ResponseCandidateV1;
  approval: ArtifactApprovalV1;
  now?: string;
  interactionState?: "accepted" | "seen_locally" | "preparing";
  parentInteractionExpiresAt?: string;
  responseExpiresAt?: string;
  responseId?: string;
  publicationAttestationId?: string;
  secret?: string;
  bindingId?: string;
}): Record<string, unknown> {
  const seed = input.candidate.candidateHash.slice("sha256:".length, "sha256:".length + 32);
  const now = input.now ?? input.candidate.admittedAt;
  return {
    delivery: buildResponsePublicationDeliveryV1({
      responseId: input.responseId ?? `response_${seed}`,
      publicationAttestationId: input.publicationAttestationId ?? `att_${canonicalSha256(`publication:${seed}`).slice(7, 39)}`,
      candidate: input.candidate,
      approval: input.approval,
      preflight: {
        artifactClass: "response",
        observedAt: now,
        roomId: input.candidate.roomId,
        roomStatus: "active",
        projectionId: input.candidate.projectionId,
        interactionId: input.candidate.interactionId,
        interactionState: input.interactionState ?? "preparing",
        originState: input.candidate.originState,
        candidateStoreState: "protected_current",
        candidateHash: input.candidate.candidateHash,
        twinBasisHash: input.candidate.twinBasisHash,
        snapshotManifestHash: input.candidate.snapshotManifestHash,
        sessionReceiptHash: input.candidate.sessionReceiptHash,
        sourceDisclosureClass: input.candidate.sourceDisclosureClass,
        policyHash: input.candidate.policyHash,
        existingResponseId: null,
        parentInteractionExpiresAt: input.parentInteractionExpiresAt ?? input.candidate.expiresAt,
      },
      binding: binding(
        input.candidate.roomId,
        input.secret ?? SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
        input.bindingId ?? SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
      ),
      responseExpiresAt: input.responseExpiresAt ?? input.candidate.expiresAt,
      attestationExpiresAt: input.approval.expiresAt,
    }),
  };
}
