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
import type { ActionProposalRecord, EffectReceipt, ReflectionRecord, TwinRevision } from "../../../src/types.ts";

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

export interface LocalProjectionProfileInput {
  readonly schemaVersion: "local_projection_profile_input.v1";
  readonly workspaceName: string;
  readonly title?: string;
  readonly summary?: string;
  readonly openTo: string;
  readonly tension?: string;
  readonly becomingReflectionId?: string;
  readonly effectProposalId?: string;
  readonly preparedAt: string;
}

export interface CompiledLocalProjectionProfile extends CompiledProjectionDraft {
  readonly profileInput: LocalProjectionProfileInput;
  readonly profileInputHash: `sha256:${string}`;
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

function verifiedEffectLineage(
  revision: TwinRevision,
  record: ActionProposalRecord,
): { execution: EffectReceipt; rollback: EffectReceipt | null } | null {
  if (revision.schemaVersion !== "3" || record.effectPlan === null || record.effectPlanHash === null || record.approvalId === null) {
    return null;
  }
  if (revision.agency.proposals.filter((item) => item.proposal.proposalId === record.proposal.proposalId).length !== 1) {
    return null;
  }
  const plan = record.effectPlan;
  if (
    canonicalSha256(record.proposal) !== record.proposalHash
    || canonicalSha256(plan) !== record.effectPlanHash
    || plan.proposalId !== record.proposal.proposalId
    || plan.actionKind !== record.proposal.actionKind
    || plan.baseTwinRevision !== record.proposal.baseTwinRevision
    || record.admittedRevision !== record.proposal.baseTwinRevision + 1
    || plan.correctedReflectionId !== record.correctedReflectionId
  ) return null;
  const matchingCorrections = revision.cognition.corrections.filter((item) => item.correctionId === record.correctionId);
  const correction = matchingCorrections[0];
  const matchingCorrected = revision.cognition.reflections.filter((item) => item.reflectionId === record.correctedReflectionId);
  const corrected = matchingCorrected[0];
  const matchingTargets = revision.cognition.reflections.filter((item) => item.reflectionId === correction?.targetReflectionId);
  const target = matchingTargets[0];
  if (
    matchingCorrections.length !== 1
    || !correction
    || correction.authority !== "owner"
    || correction.correctedReflectionId !== record.correctedReflectionId
    || matchingCorrected.length !== 1
    || !corrected
    || corrected.status !== "corrected"
    || corrected.authoredBy !== "owner"
    || corrected.claim !== correction.correctionText
    || corrected.createdAt !== correction.correctedAt
    || corrected.baseTwinRevision !== correction.baseTwinRevision
    || correction.baseTwinRevision >= record.proposal.baseTwinRevision
    || corrected.supersedesReflectionId !== correction.targetReflectionId
    || corrected.supersededByReflectionId !== null
    || matchingTargets.length !== 1
    || !target
    || target.status !== "superseded"
    || target.supersededByReflectionId !== corrected.reflectionId
  ) return null;
  const matchingRuntimeReceipts = revision.agency.runtimeReceipts.filter((item) => item.receiptId === record.runtimeReceiptId);
  const runtimeReceipt = matchingRuntimeReceipts[0];
  if (
    matchingRuntimeReceipts.length !== 1
    || !runtimeReceipt
    || runtimeReceipt.packetHash !== record.packetHash
    || runtimeReceipt.proposalHash !== record.proposalHash
    || runtimeReceipt.baseTwinRevision !== record.proposal.baseTwinRevision
    || runtimeReceipt.validationResult !== "accepted"
    || runtimeReceipt.completedAt !== record.createdAt
    || runtimeReceipt.audit.toolEventCount !== 0
    || !runtimeReceipt.audit.turnCompleted
  ) return null;
  const matchingApprovals = revision.agency.approvals.filter((item) => item.approvalId === record.approvalId);
  const approval = matchingApprovals[0];
  if (
    matchingApprovals.length !== 1
    || !approval
    || approval.authority !== "owner"
    || approval.status !== "consumed"
    || approval.proposalId !== record.proposal.proposalId
    || approval.proposalHash !== record.proposalHash
    || approval.effectPlanHash !== record.effectPlanHash
    || approval.baseTwinRevision !== record.admittedRevision
  ) return null;
  if (new Set(record.effectReceiptIds).size !== record.effectReceiptIds.length) return null;
  const receipts = record.effectReceiptIds.map((receiptId) => (
    revision.agency.effectReceipts.filter((receipt) => receipt.receiptId === receiptId)
  ));
  if (receipts.some((matches) => matches.length !== 1)) return null;
  const boundReceipts = receipts.map((matches) => matches[0]) as EffectReceipt[];
  if (boundReceipts.some((receipt) => (
    receipt.proposalId !== record.proposal.proposalId
    || receipt.approvalId !== approval.approvalId
    || receipt.effectPlanHash !== record.effectPlanHash
    || receipt.effectId !== plan.effectId
    || receipt.targetPath !== plan.targetPath
    || receipt.resultTwinRevision !== receipt.baseTwinRevision + 1
  ))) return null;
  const execution = boundReceipts.find((receipt) => receipt.operation === "execute" && receipt.status === "succeeded");
  const rollback = boundReceipts.find((receipt) => receipt.operation === "rollback" && receipt.status === "succeeded") ?? null;
  if (
    !execution
    || execution.baseTwinRevision !== approval.baseTwinRevision + 1
    || execution.expectedBeforeHash !== plan.beforeFileHash
    || execution.expectedAfterHash !== plan.afterFileHash
    || execution.observedHash !== execution.expectedAfterHash
    || approval.consumedAt !== execution.completedAt
  ) return null;
  if (record.status === "executed") {
    return boundReceipts.length === 1 && rollback === null ? { execution, rollback } : null;
  }
  if (
    record.status !== "rolled-back"
    || boundReceipts.length !== 2
    || !rollback
    || rollback.baseTwinRevision !== execution.resultTwinRevision
    || rollback.expectedBeforeHash !== plan.afterFileHash
    || rollback.expectedAfterHash !== plan.beforeFileHash
    || rollback.observedHash !== rollback.expectedAfterHash
  ) return null;
  return { execution, rollback };
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

function eligibleEffect(revision: TwinRevision, record: ActionProposalRecord): boolean {
  return effectIsStillCurrent(revision, record) || rolledBackHistoryIsVerified(revision, record);
}

function localProfileEffectEligible(revision: TwinRevision, record: ActionProposalRecord): boolean {
  const lineage = verifiedEffectLineage(revision, record);
  if (!lineage) return false;
  if (record.status === "rolled-back") return lineage.rollback !== null;
  if (record.status !== "executed" || lineage.rollback !== null) return false;
  const currentTarget = revision.evidence.find((evidence) => evidence.relativePath === lineage.execution.targetPath);
  return currentTarget?.contentHash === lineage.execution.expectedAfterHash;
}

function latestByCreatedAt<T extends { createdAt: string }>(values: readonly T[]): T | undefined {
  return [...values].sort((left, right) => (
    right.createdAt.localeCompare(left.createdAt) || JSON.stringify(right).localeCompare(JSON.stringify(left))
  ))[0];
}

function requirePublicText(value: string, label: string, maximumBytes: number): string {
  const normalized = value.trim().normalize("NFC");
  if (normalized.length === 0 || Buffer.byteLength(normalized, "utf8") > maximumBytes) {
    throw new Error(`${label} must be non-empty and at most ${maximumBytes} UTF-8 bytes`);
  }
  return normalized;
}

function requirePublicScalarText(value: string, label: string, maximumScalars: number): string {
  const normalized = value.trim().normalize("NFC");
  if (normalized.length === 0 || [...normalized].length > maximumScalars) {
    throw new Error(`${label} must be non-empty and at most ${maximumScalars} Unicode characters`);
  }
  return normalized;
}

function localId(prefix: string, seed: unknown): string {
  return `${prefix}_${canonicalSha256(seed).slice("sha256:".length, "sha256:".length + 32)}`;
}

/**
 * #66's application profile over the lower-level Projection compiler. It
 * preserves the protocol's multi-claim slots while requiring one complete
 * public-facing five-section view and the R1 -> R2 -> R3 causal floor.
 */
export function compileLocalProjectionProfile(input: {
  revision: TwinRevision;
  twinRevisionHash: `sha256:${string}`;
  profile: LocalProjectionProfileInput;
}): CompiledLocalProjectionProfile {
  if (input.revision.schemaVersion !== "3") {
    throw new Error("Local Projection review requires the current R1-R3 Twin");
  }
  const workspaceName = requirePublicScalarText(input.profile.workspaceName, "Workspace name", 200);
  const openTo = requirePublicText(input.profile.openTo, "Open To", 8 * 1_024);
  const eligibleEffects = input.revision.agency.proposals.filter((item) => localProfileEffectEligible(input.revision, item));
  const effect = input.profile.effectProposalId
    ? eligibleEffects.find((item) => item.proposal.proposalId === input.profile.effectProposalId)
    : input.profile.becomingReflectionId
      ? latestByCreatedAt(eligibleEffects.filter((item) => item.correctedReflectionId === input.profile.becomingReflectionId))
      : latestByCreatedAt(eligibleEffects);
  if (!effect || !localProfileEffectEligible(input.revision, effect)) {
    throw new Error("Local Projection needs one verified current or rolled-back R3 effect");
  }
  const correctedReflectionId = input.profile.becomingReflectionId ?? effect.correctedReflectionId;
  if (effect.correctedReflectionId !== correctedReflectionId) {
    throw new Error("Local Projection R2 meaning and R3 effect do not belong to one causal chain");
  }
  const corrected = input.revision.cognition.reflections.find((item) => item.reflectionId === correctedReflectionId);
  if (!corrected || corrected.status !== "corrected" || corrected.authoredBy !== "owner") {
    throw new Error("Local Projection needs the active Owner-corrected Reflection that governed its R3 effect");
  }
  const seenUnresolved = new Set<string>();
  const unresolvedSources = input.revision.ownerFrame.unresolved
    .map((value, index) => ({ text: value.trim(), index }))
    .filter(({ text }) => {
      if (!text || seenUnresolved.has(text)) return false;
      seenUnresolved.add(text);
      return true;
    });
  const tensionSelections: ProjectionClaimSelection[] = input.profile.tension
    ? [{ slot: "tensions", source: "projection_owner_wording", text: requirePublicText(input.profile.tension, "Tension", 8 * 1_024) }]
    : unresolvedSources
      .slice(0, 3)
      .map(({ index }) => ({ slot: "tensions", source: "owner_unresolved", index }));
  if (tensionSelections.length === 0) {
    throw new Error("Local Projection needs one current unresolved item or explicit --tension wording");
  }
  const preparedMillis = Date.parse(input.profile.preparedAt);
  if (!Number.isFinite(preparedMillis) || new Date(preparedMillis).toISOString() !== input.profile.preparedAt) {
    throw new Error("Projection preparation time must be exact UTC RFC 3339");
  }
  const selections: ProjectionClaimSelection[] = [
    { slot: "becoming", source: "reflection", reflectionId: corrected.reflectionId },
    { slot: "now", source: "owner_frame", field: "activeIntent" },
    { slot: "now", source: "r3_effect", proposalId: effect.proposal.proposalId },
    { slot: "nextMove", source: "owner_frame", field: "nextMove" },
    ...tensionSelections,
    { slot: "openTo", source: "projection_owner_wording", text: openTo },
  ];
  const profileInput: LocalProjectionProfileInput = {
    schemaVersion: "local_projection_profile_input.v1",
    workspaceName,
    openTo,
    becomingReflectionId: corrected.reflectionId,
    effectProposalId: effect.proposal.proposalId,
    preparedAt: input.profile.preparedAt,
    ...(input.profile.title === undefined ? {} : { title: requirePublicScalarText(input.profile.title, "Projection title", 120) }),
    ...(input.profile.summary === undefined ? {} : { summary: requirePublicText(input.profile.summary, "Projection summary", 512) }),
    ...(input.profile.tension === undefined ? {} : { tension: requirePublicText(input.profile.tension, "Tension", 8 * 1_024) }),
  };
  const policy = {
    schemaVersion: "r4.local-projection-review-policy.v1",
    audience: "future_public_project_room",
    localOnly: true,
    roomMutationAuthorized: false,
    publicationAuthorized: false,
    requiredSlots: ["becoming", "now", "nextMove", "tensions", "openTo"],
    requiredBasisClasses: ["owner_frame", "owner_corrected_reflection", "r3_effect"],
  } as const;
  const seed = {
    schemaVersion: "r4.local-projection-review-seed.v1",
    twinRevisionHash: input.twinRevisionHash,
    profileInput,
    selections,
    policy,
  };
  const title = profileInput.title ?? `${workspaceName} — Project Projection`;
  if ([...title].length > 120) {
    throw new Error("Default Projection title exceeds 120 Unicode characters; provide a shorter --title");
  }
  const draft = compileProjectionDraft({
    revision: input.revision,
    twinRevisionHash: input.twinRevisionHash,
    draft: {
      roomId: localId("room", { ...seed, role: "local-review-only" }),
      projectionId: localId("proj", { ...seed, role: "projection" }),
      entityId: localId("entity", { workspaceId: input.revision.workspaceId }),
      basisId: localId("basis", { ...seed, role: "basis" }),
      publicationAttestationId: localId("att", { ...seed, role: "not-published" }),
      ownerDecisionId: localId("decision", { ...seed, role: "future-owner-review" }),
      title,
      thirdPlaceSummary: profileInput.summary ?? `A current, Owner-reviewed view of ${workspaceName}: ${input.revision.ownerFrame.activeIntent}`,
      selections,
      supportedInteractions: ["ask"],
      allowedTopics: ["project direction", "current work", "bounded collaboration"],
      unavailableTopics: ["private source bodies", "secrets, credentials, and unpublished personal context"],
      expectedResponseLatency: "Asynchronous and Owner-reviewed",
      visualThemeToken: "forme_project_twin_v1",
      agencyStatement: "This Projection may describe the project, but it cannot act, publish, or commit the Owner.",
      nonCommitmentStatement: "Questions are welcome; nothing here grants private access or creates an Owner commitment.",
      projectionPolicyGeneration: 1,
      projectionPolicyHash: canonicalSha256(policy),
      publishedAt: profileInput.preparedAt,
      freshUntil: new Date(preparedMillis + 23 * 60 * 60 * 1_000).toISOString(),
      expiresAt: new Date(preparedMillis + 24 * 60 * 60 * 1_000).toISOString(),
    },
  });
  const publicTexts = [
    draft.capsule.title,
    draft.capsule.thirdPlaceSummary,
    draft.capsule.agencyStatement,
    draft.capsule.nonCommitmentStatement,
    ...draft.capsule.claims.flatMap((claim) => [claim.text, claim.uncertainty ?? ""]),
    ...draft.capsule.allowedTopics,
    ...draft.capsule.unavailableTopics,
  ];
  if (publicTexts.some((value) => /[\u007f-\u009f\u2028\u2029\u206a-\u206f]|\p{Bidi_Control}/u.test(value))) {
    throw new Error("Local Projection public text contains an unsafe terminal control character");
  }
  const slots = new Set(draft.capsule.claims.map((claim) => claim.slot));
  for (const required of policy.requiredSlots) {
    if (!slots.has(required)) throw new Error(`Local Projection is missing required section:${required}`);
  }
  const sourceKinds = new Set(draft.basis.claims.map((claim) => claim.sourceKind));
  for (const required of policy.requiredBasisClasses) {
    if (!sourceKinds.has(required)) throw new Error(`Local Projection is missing causal basis:${required}`);
  }
  return {
    ...draft,
    profileInput,
    profileInputHash: canonicalSha256({
      ...profileInput,
      preparedAt: null,
    }),
  };
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
