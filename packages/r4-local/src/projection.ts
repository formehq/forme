import {
  assessProjectionBasisClaim,
  canonicalSha256,
  validateArtifactApprovalV1,
  validateProjectionBasisV1,
  validateProjectionCapsuleV1,
  type ArtifactApprovalV1,
  type ProjectionBasisClaimV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
  type ProjectionClaimV1,
} from "../../r4-protocol/src/index.ts";
import type { ActionProposalRecord, ReflectionRecord, TwinRevision } from "../../../src/types.ts";

export type ProjectionClaimSelection =
  | { slot: ProjectionClaimV1["slot"]; source: "owner_frame"; field: "activeIntent" | "nextMove" }
  | { slot: ProjectionClaimV1["slot"]; source: "owner_unresolved"; index: number }
  | { slot: ProjectionClaimV1["slot"]; source: "reflection"; reflectionId: string }
  | { slot: ProjectionClaimV1["slot"]; source: "r3_effect"; proposalId: string }
  | { slot: ProjectionClaimV1["slot"]; source: "projection_owner_wording"; text: string };

export interface ProjectionDraftInput {
  roomId: string;
  projectionId: string;
  entityId: string;
  basisId: string;
  publicationAttestationId: string;
  ownerDecisionId: string;
  title: string;
  thirdPlaceSummary: string;
  selections: ProjectionClaimSelection[];
  supportedInteractions: ProjectionCapsuleV1["supportedInteractions"];
  allowedTopics: string[];
  unavailableTopics: string[];
  expectedResponseLatency: string;
  visualThemeToken: string;
  agencyStatement: string;
  nonCommitmentStatement: string;
  projectionPolicyGeneration: number;
  projectionPolicyHash: `sha256:${string}`;
  publishedAt: string;
  freshUntil: string;
  expiresAt: string;
}

export interface CompiledProjectionDraft {
  input: ProjectionDraftInput;
  inputHash: `sha256:${string}`;
  capsule: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
}

export interface ReviewedProjectionDraft {
  draft: CompiledProjectionDraft;
  approval: ArtifactApprovalV1;
}

function sourceReference(kind: string, id: string): string {
  return `src_${canonicalSha256({ kind, id }).slice(7, 39)}`;
}

function activeReflection(revision: TwinRevision, reflectionId: string): ReflectionRecord {
  if (revision.schemaVersion === "1") throw new Error("Twin revision has no cognition state");
  const reflection = revision.cognition.reflections.find((item) => item.reflectionId === reflectionId);
  if (!reflection) throw new Error("Projection Reflection source not found");
  return reflection;
}

function actionProposal(revision: TwinRevision, proposalId: string): ActionProposalRecord {
  if (revision.schemaVersion !== "3") throw new Error("Twin revision has no agency state");
  const proposal = revision.agency.proposals.find((item) => item.proposal.proposalId === proposalId);
  if (!proposal) throw new Error("Projection R3 effect source not found");
  return proposal;
}

function effectIsStillCurrent(revision: TwinRevision, record: ActionProposalRecord): boolean {
  if (revision.schemaVersion !== "3" || record.status !== "executed") return false;
  const execution = revision.agency.effectReceipts.find((receipt) => (
    record.effectReceiptIds.includes(receipt.receiptId)
    && receipt.operation === "execute"
    && receipt.status === "succeeded"
    && receipt.observedHash === receipt.expectedAfterHash
  ));
  if (!execution) return false;
  const currentTarget = revision.evidence.find((evidence) => evidence.relativePath === execution.targetPath);
  return currentTarget?.contentHash === execution.expectedAfterHash;
}

function rolledBackHistoryIsVerified(revision: TwinRevision, record: ActionProposalRecord): boolean {
  if (revision.schemaVersion !== "3" || record.status !== "rolled-back") return false;
  const receipts = revision.agency.effectReceipts.filter((receipt) => record.effectReceiptIds.includes(receipt.receiptId));
  const execution = receipts.find((receipt) => receipt.operation === "execute" && receipt.status === "succeeded");
  const rollback = receipts.find((receipt) => receipt.operation === "rollback" && receipt.status === "succeeded");
  return Boolean(
    execution
    && rollback
    && execution.proposalId === record.proposal.proposalId
    && rollback.proposalId === record.proposal.proposalId
    && execution.effectPlanHash === rollback.effectPlanHash
    && execution.expectedAfterHash === rollback.expectedBeforeHash
    && execution.expectedBeforeHash === rollback.expectedAfterHash
    && execution.observedHash === execution.expectedAfterHash
    && rollback.observedHash === rollback.expectedAfterHash,
  );
}

function claimFromSelection(revision: TwinRevision, selection: ProjectionClaimSelection): {
  publicClaim: ProjectionClaimV1;
  basisClaim: ProjectionBasisClaimV1;
} {
  if (selection.source === "owner_frame") {
    const text = revision.ownerFrame[selection.field];
    return {
      publicClaim: { slot: selection.slot, text, attribution: "owner_confirmed", uncertainty: null },
      basisClaim: {
        slot: selection.slot,
        claimText: text,
        attribution: "owner_confirmed",
        disclosureClass: "current_owner_frame",
        transformationClass: "exact",
        sourceKind: "owner_frame",
        sourceReference: sourceReference("owner_frame", selection.field),
        sourceContentHash: canonicalSha256({ field: selection.field, text }),
        semanticStatus: "active",
      },
    };
  }
  if (selection.source === "owner_unresolved") {
    const text = revision.ownerFrame.unresolved[selection.index];
    if (!text) throw new Error("Projection unresolved source not found");
    return {
      publicClaim: { slot: selection.slot, text, attribution: "unresolved_allowed", uncertainty: "Owner-visible unresolved item." },
      basisClaim: {
        slot: selection.slot,
        claimText: text,
        attribution: "unresolved_allowed",
        disclosureClass: "current_owner_unresolved",
        transformationClass: "exact",
        sourceKind: "owner_unresolved",
        sourceReference: sourceReference("owner_unresolved", String(selection.index)),
        sourceContentHash: canonicalSha256({ index: selection.index, text }),
        semanticStatus: "active",
      },
    };
  }
  if (selection.source === "reflection") {
    const reflection = activeReflection(revision, selection.reflectionId);
    if (reflection.status === "corrected" && reflection.authoredBy === "owner") {
      return {
        publicClaim: { slot: selection.slot, text: reflection.claim, attribution: "owner_confirmed", uncertainty: null },
        basisClaim: {
          slot: selection.slot,
          claimText: reflection.claim,
          attribution: "owner_confirmed",
          disclosureClass: "active_owner_corrected_reflection",
          transformationClass: "exact",
          sourceKind: "owner_corrected_reflection",
          sourceReference: sourceReference("reflection", reflection.reflectionId),
          sourceContentHash: canonicalSha256(reflection),
          semanticStatus: "active",
        },
      };
    }
    if (reflection.status === "inferred" && reflection.authoredBy === "codex" && reflection.uncertainty) {
      return {
        publicClaim: {
          slot: selection.slot,
          text: reflection.claim,
          attribution: "inferred_allowed",
          uncertainty: `${reflection.uncertainty.level}: ${reflection.uncertainty.rationale}`,
        },
        basisClaim: {
          slot: selection.slot,
          claimText: reflection.claim,
          attribution: "inferred_allowed",
          disclosureClass: "active_inference_with_uncertainty",
          transformationClass: "exact",
          sourceKind: "inferred_reflection",
          sourceReference: sourceReference("reflection", reflection.reflectionId),
          sourceContentHash: canonicalSha256(reflection),
          semanticStatus: "active",
        },
      };
    }
    throw new Error(`Reflection is not Projection-eligible:${reflection.status}`);
  }
  if (selection.source === "r3_effect") {
    const record = actionProposal(revision, selection.proposalId);
    const semanticStatus = record.status === "executed"
      ? effectIsStillCurrent(revision, record) ? "executed_current" : "invalidated"
      : record.status === "rolled-back"
        ? rolledBackHistoryIsVerified(revision, record) ? "rolled_back" : "invalidated"
        : record.status === "indeterminate"
          ? "indeterminate"
          : record.status;
    const text = semanticStatus === "executed_current"
      ? "A bounded, Owner-approved Forme effect is currently applied."
      : semanticStatus === "rolled_back"
        ? "Historically, a bounded Forme effect was executed and rolled back successfully."
        : "An R3 effect has not reached an eligible terminal state.";
    return {
      publicClaim: { slot: selection.slot, text, attribution: "owner_confirmed", uncertainty: null },
      basisClaim: {
        slot: selection.slot,
        claimText: text,
        attribution: "owner_confirmed",
        disclosureClass: semanticStatus === "rolled_back" ? "exact_labeled_history" : "current_verified_effect",
        transformationClass: "transformed",
        sourceKind: "r3_effect",
        sourceReference: sourceReference("r3_effect", record.proposal.proposalId),
        sourceContentHash: canonicalSha256({
          proposalId: record.proposal.proposalId,
          status: record.status,
          effectReceiptIds: record.effectReceiptIds,
        }),
        semanticStatus,
      },
    };
  }
  return {
    publicClaim: { slot: selection.slot, text: selection.text, attribution: "owner_confirmed", uncertainty: null },
    basisClaim: {
      slot: selection.slot,
      claimText: selection.text,
      attribution: "owner_confirmed",
      disclosureClass: "exact_owner_projection_wording",
      transformationClass: "owner_edited",
      sourceKind: "projection_owner_wording",
      sourceReference: sourceReference("projection_owner_wording", canonicalSha256(selection.text)),
      sourceContentHash: canonicalSha256(selection.text),
      semanticStatus: "active",
    },
  };
}

export function compileProjectionDraft(input: {
  revision: TwinRevision;
  twinRevisionHash: `sha256:${string}`;
  draft: ProjectionDraftInput;
}): CompiledProjectionDraft {
  if (input.draft.selections.length === 0) throw new Error("Projection needs at least one selected claim");
  const claims = input.draft.selections.map((selection) => claimFromSelection(input.revision, selection));
  for (const claim of claims) {
    const decision = assessProjectionBasisClaim(claim.basisClaim);
    if (!decision.allowed) throw new Error(`Projection basis rejected:${decision.code}`);
    if (decision.code === "rolled_back_history_only" && !/histor(?:y|ically)|rolled back/iu.test(claim.publicClaim.text)) {
      throw new Error("rolled-back effect must be labeled as history");
    }
  }
  const payloadInput = {
    schemaVersion: "projection_capsule.v1",
    projectionId: input.draft.projectionId,
    roomId: input.draft.roomId,
    entityId: input.draft.entityId,
    title: input.draft.title,
    thirdPlaceSummary: input.draft.thirdPlaceSummary,
    claims: claims.map((claim) => claim.publicClaim),
    supportedInteractions: input.draft.supportedInteractions,
    allowedTopics: input.draft.allowedTopics,
    unavailableTopics: input.draft.unavailableTopics,
    expectedResponseLatency: input.draft.expectedResponseLatency,
    visualThemeToken: input.draft.visualThemeToken,
    agencyStatement: input.draft.agencyStatement,
    nonCommitmentStatement: input.draft.nonCommitmentStatement,
    disclosureBasisId: input.draft.basisId,
    publicationAttestationId: input.draft.publicationAttestationId,
    publishedAt: input.draft.publishedAt,
    freshUntil: input.draft.freshUntil,
    expiresAt: input.draft.expiresAt,
  } as const;
  const payloadHash = canonicalSha256(payloadInput);
  const capsule = validateProjectionCapsuleV1({ ...payloadInput, payloadHash });
  const ownerDecisionHash = canonicalSha256({
    ownerDecisionId: input.draft.ownerDecisionId,
    payloadHash,
    twinRevision: input.revision.revision,
    projectionPolicyHash: input.draft.projectionPolicyHash,
    selections: input.draft.selections,
  });
  const basis = validateProjectionBasisV1({
    schemaVersion: "projection_basis.v1",
    basisId: input.draft.basisId,
    projectionId: input.draft.projectionId,
    roomId: input.draft.roomId,
    twinRevision: input.revision.revision,
    twinRevisionHash: input.twinRevisionHash,
    workspaceContractHash: input.revision.workspaceContractHash,
    projectionPolicyGeneration: input.draft.projectionPolicyGeneration,
    projectionPolicyHash: input.draft.projectionPolicyHash,
    claims: claims.map((claim) => claim.basisClaim),
    payloadHash,
    ownerDecisionId: input.draft.ownerDecisionId,
    ownerDecisionHash,
    localReceiptId: null,
    hostedReceiptId: null,
  });
  return {
    input: structuredClone(input.draft),
    inputHash: canonicalSha256(input.draft),
    capsule,
    basis,
  };
}

/**
 * Separate synthetic Owner-review ceremony. Compilation can never mint an
 * approval. The caller must present the exact bytes/hashes observed in the
 * protected review surface and an explicit synthetic user-presence result.
 */
export function approveProjectionExact(input: {
  draft: CompiledProjectionDraft;
  expectedPayloadHash: `sha256:${string}`;
  expectedBasisHash: `sha256:${string}`;
  ownerPresenceConfirmed: true;
  approvalId: string;
  operationId: string;
  approvedAt: string;
  expiresAt: string;
}): ReviewedProjectionDraft {
  const basisHash = canonicalSha256(input.draft.basis);
  if (input.expectedPayloadHash !== input.draft.capsule.payloadHash || input.expectedBasisHash !== basisHash) {
    throw new Error("Projection bytes changed before Owner approval");
  }
  if (input.ownerPresenceConfirmed !== true) throw new Error("Owner presence is required");
  const approval = validateArtifactApprovalV1({
    schemaVersion: "artifact_approval.v1",
    approvalId: input.approvalId,
    artifactClass: "projection",
    artifactHash: input.expectedPayloadHash,
    roomId: input.draft.input.roomId,
    projectionId: input.draft.input.projectionId,
    interactionId: null,
    basisHash: input.expectedBasisHash,
    policyHash: input.draft.input.projectionPolicyHash,
    approvedAt: input.approvedAt,
    expiresAt: input.expiresAt,
    operationId: input.operationId,
  });
  return { draft: structuredClone(input.draft), approval };
}

export function revalidateProjectionBeforeDelivery(input: {
  reviewed: ReviewedProjectionDraft;
  currentRevision: TwinRevision;
  currentTwinRevisionHash: `sha256:${string}`;
  now: string;
  currentHostedPayloadHash?: `sha256:${string}` | null;
}): { allowed: true; noOp: boolean } {
  const rebuilt = compileProjectionDraft({
    revision: input.currentRevision,
    twinRevisionHash: input.currentTwinRevisionHash,
    draft: input.reviewed.draft.input,
  });
  if (
    input.reviewed.draft.inputHash !== rebuilt.inputHash
    || input.reviewed.draft.capsule.payloadHash !== rebuilt.capsule.payloadHash
    || canonicalSha256(input.reviewed.draft.basis) !== canonicalSha256(rebuilt.basis)
    || input.reviewed.approval.artifactHash !== rebuilt.capsule.payloadHash
    || input.reviewed.approval.basisHash !== canonicalSha256(rebuilt.basis)
    || input.reviewed.approval.policyHash !== rebuilt.basis.projectionPolicyHash
  ) throw new Error("Projection approval became stale");
  if (input.currentRevision.revision !== input.reviewed.draft.basis.twinRevision || input.currentTwinRevisionHash !== input.reviewed.draft.basis.twinRevisionHash) {
    throw new Error("Projection Twin basis changed before delivery");
  }
  if (Date.parse(input.reviewed.approval.expiresAt) <= Date.parse(input.now)) throw new Error("Projection approval expired");
  return { allowed: true, noOp: input.currentHostedPayloadHash === input.reviewed.draft.capsule.payloadHash };
}
