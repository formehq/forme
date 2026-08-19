import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSha256,
  GOLDEN_PROJECTION,
  GOLDEN_ROOM,
} from "../../packages/r4-protocol/src/index.ts";
import {
  approveProjectionExact,
  compileProjectionDraft,
  revalidateProjectionBeforeDelivery,
  type ProjectionDraftInput,
} from "../../packages/r4-local/src/index.ts";
import type { TwinRevision, TwinRevisionV3 } from "../../src/types.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const HASH = (seed: string): `sha256:${string}` => canonicalSha256({ seed });

function v1Revision(overrides: Partial<TwinRevision> = {}): TwinRevision {
  return {
    schemaVersion: "1",
    workspaceId: "wrk_syntheticprojection00000001",
    revision: 25,
    previousRevision: 24,
    observedAt: T0,
    workspaceContractHash: HASH("workspace-contract"),
    evidence: [],
    changes: { added: [], modified: [], deleted: [] },
    ownerFrame: {
      activeIntent: "Build a synthetic, bounded R4 protocol proof.",
      nextMove: "Review one local Projection candidate.",
      unresolved: ["The provider lane remains closed in Gate A."],
    },
    warnings: [],
    ...overrides,
  } as TwinRevision;
}

function draft(selections: ProjectionDraftInput["selections"]): ProjectionDraftInput {
  return {
    roomId: GOLDEN_ROOM.roomId,
    projectionId: GOLDEN_PROJECTION.projectionId,
    entityId: GOLDEN_ROOM.entityId,
    basisId: "basis_syntheticprojection000001",
    publicationAttestationId: "att_syntheticprojection0000001",
    ownerDecisionId: "decision_syntheticprojection0001",
    title: "Synthetic Project Projection",
    thirdPlaceSummary: "A shallow, Owner-approved synthetic view.",
    selections,
    supportedInteractions: ["ask"],
    allowedTopics: ["synthetic verification"],
    unavailableTopics: ["private source bodies"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "Local Forme may prepare but cannot publish autonomously.",
    nonCommitmentStatement: "This Projection cannot commit the Owner.",
    projectionPolicyGeneration: 1,
    projectionPolicyHash: HASH("projection-policy"),
    publishedAt: T0,
    freshUntil: "2026-08-04T12:00:00.000Z",
    expiresAt: "2026-08-10T12:00:00.000Z",
  };
}

function reviewExact(compiled: ReturnType<typeof compileProjectionDraft>) {
  return approveProjectionExact({
    draft: compiled,
    expectedPayloadHash: compiled.capsule.payloadHash,
    expectedBasisHash: canonicalSha256(compiled.basis),
    ownerPresenceConfirmed: true,
    approvalId: "approval_syntheticprojection0001",
    operationId: "op_syntheticprojection00000001",
    approvedAt: T0,
    expiresAt: "2026-08-03T12:15:00.000Z",
  });
}

test("Projection compilation accepts exact R1 Owner Frame, unresolved, and explicit synthetic Owner wording", () => {
  const revision = v1Revision();
  const compiled = compileProjectionDraft({
    revision,
    twinRevisionHash: HASH("twin-25"),
    draft: draft([
      { slot: "now", source: "owner_frame", field: "activeIntent" },
      { slot: "nextMove", source: "owner_frame", field: "nextMove" },
      { slot: "tensions", source: "owner_unresolved", index: 0 },
      { slot: "openTo", source: "projection_owner_wording", text: "Synthetic collaboration questions." },
    ]),
  });
  assert.deepEqual(compiled.basis.claims.map((claim) => [claim.sourceKind, claim.semanticStatus]), [
    ["owner_frame", "active"],
    ["owner_frame", "active"],
    ["owner_unresolved", "active"],
    ["projection_owner_wording", "active"],
  ]);
  assert.equal(compiled.basis.claims[0]?.attribution, "owner_confirmed");
  assert.equal(compiled.basis.claims[2]?.attribution, "unresolved_allowed");
  assert.equal("approval" in compiled, false, "compiler cannot mint Owner approval");
  const reviewed = reviewExact(compiled);
  assert.equal(reviewed.approval.artifactHash, compiled.capsule.payloadHash);
  assert.equal(reviewed.approval.basisHash, canonicalSha256(compiled.basis));
});

test("pre-delivery revalidation detects changed Twin revision/hash and identical payload is an explicit no-op", () => {
  const revision = v1Revision();
  const twinHash = HASH("twin-25");
  const compiled = compileProjectionDraft({
    revision,
    twinRevisionHash: twinHash,
    draft: draft([{ slot: "now", source: "owner_frame", field: "activeIntent" }]),
  });
  const reviewed = reviewExact(compiled);
  assert.deepEqual(revalidateProjectionBeforeDelivery({
    reviewed,
    currentRevision: revision,
    currentTwinRevisionHash: twinHash,
    now: "2026-08-03T12:05:00.000Z",
    currentHostedPayloadHash: null,
  }), { allowed: true, noOp: false });
  assert.deepEqual(revalidateProjectionBeforeDelivery({
    reviewed,
    currentRevision: revision,
    currentTwinRevisionHash: twinHash,
    now: "2026-08-03T12:05:00.000Z",
    currentHostedPayloadHash: compiled.capsule.payloadHash,
  }), { allowed: true, noOp: true });

  assert.throws(() => revalidateProjectionBeforeDelivery({
    reviewed,
    currentRevision: v1Revision({ revision: 26, previousRevision: 25 }),
    currentTwinRevisionHash: HASH("twin-26"),
    now: "2026-08-03T12:05:00.000Z",
  }), /approval became stale|Twin basis changed/u);
  assert.throws(() => revalidateProjectionBeforeDelivery({
    reviewed,
    currentRevision: revision,
    currentTwinRevisionHash: HASH("same-revision-content-changed"),
    now: "2026-08-03T12:05:00.000Z",
  }), /approval became stale|Twin basis changed/u);
  assert.throws(() => revalidateProjectionBeforeDelivery({
    reviewed,
    currentRevision: revision,
    currentTwinRevisionHash: twinHash,
    now: reviewed.approval.expiresAt,
  }), /approval expired/u);
});

test("Projection compilation rejects superseded Reflection and non-terminal R3 proposal, but labels rolled-back history", () => {
  const corrected = {
    reflectionId: "ref_correctedsynthetic0000000001",
    status: "corrected" as const,
    authoredBy: "owner" as const,
    baseTwinRevision: 23,
    claim: "The Owner-corrected synthetic meaning remains active.",
    relationType: "trajectory" as const,
    evidence: [],
    uncertainty: null,
    alternativeExplanation: null,
    implication: "Use only the corrected meaning.",
    ownerQuestion: null,
    proposalId: null,
    runtimeReceiptId: null,
    dependentOutputIds: [],
    supersedesReflectionId: "ref_originalsynthetic0000000001",
    supersededByReflectionId: null,
    createdAt: T0,
  };
  const proposal = {
    proposal: {
      schemaVersion: "1" as const,
      proposalId: "act_syntheticprojection00000001",
      baseTwinRevision: 24,
      actionKind: "render_next_move_brief.v1" as const,
      rationale: "Synthetic rationale",
      title: "Synthetic effect",
      whyNow: "Synthetic now",
      nextMove: "Synthetic next",
      successCheck: "Synthetic check",
      ownerChallenge: "Synthetic challenge",
    },
    proposalHash: HASH("proposal"),
    packetHash: HASH("packet"),
    correctedReflectionId: corrected.reflectionId,
    correctionId: "cor_syntheticprojection00000001",
    runtimeReceiptId: "rr_syntheticprojection000000001",
    effectPlan: null,
    effectPlanHash: null,
    admittedRevision: 24,
    status: "rolled-back" as const,
    approvalId: "apr_syntheticprojection00000001",
    effectReceiptIds: ["efr_execsynthetic000000000001", "efr_rollsynthetic000000000001"],
    createdAt: T0,
  };
  const executionReceipt = {
    receiptId: "efr_execsynthetic000000000001",
    operation: "execute" as const,
    effectId: "effect_syntheticprojection000001",
    proposalId: proposal.proposal.proposalId,
    approvalId: proposal.approvalId!,
    effectPlanHash: HASH("effect-plan"),
    baseTwinRevision: 24,
    resultTwinRevision: 25,
    targetPath: "README.md" as const,
    expectedBeforeHash: HASH("before"),
    expectedAfterHash: HASH("after"),
    observedHash: HASH("after"),
    status: "succeeded" as const,
    completedAt: T0,
  };
  const rollbackReceipt = {
    ...executionReceipt,
    receiptId: "efr_rollsynthetic000000000001",
    operation: "rollback" as const,
    baseTwinRevision: 25,
    resultTwinRevision: 26,
    expectedBeforeHash: HASH("after"),
    expectedAfterHash: HASH("before"),
    observedHash: HASH("before"),
  };
  const revision: TwinRevisionV3 = {
    ...v1Revision(),
    schemaVersion: "3",
    cognition: { reflections: [corrected], corrections: [], invalidations: [], runtimeReceipts: [] },
    agency: { proposals: [proposal], approvals: [], runtimeReceipts: [], effectReceipts: [executionReceipt, rollbackReceipt], invalidations: [] },
  };
  const compiled = compileProjectionDraft({
    revision,
    twinRevisionHash: HASH("twin-v3"),
    draft: draft([
      { slot: "becoming", source: "reflection", reflectionId: corrected.reflectionId },
      { slot: "tensions", source: "r3_effect", proposalId: proposal.proposal.proposalId },
    ]),
  });
  assert.equal(compiled.basis.claims[0]?.sourceKind, "owner_corrected_reflection");
  assert.equal(compiled.basis.claims[1]?.semanticStatus, "rolled_back");
  assert.match(compiled.capsule.claims[1]?.text ?? "", /Historically|rolled back/iu);

  const supersededRevision: TwinRevisionV3 = {
    ...revision,
    cognition: { ...revision.cognition, reflections: [{ ...corrected, status: "superseded" }] },
  };
  assert.throws(() => compileProjectionDraft({
    revision: supersededRevision,
    twinRevisionHash: HASH("superseded"),
    draft: draft([{ slot: "becoming", source: "reflection", reflectionId: corrected.reflectionId }]),
  }), /not Projection-eligible/u);
  assert.throws(() => compileProjectionDraft({
    revision: { ...revision, agency: { ...revision.agency, proposals: [{ ...proposal, status: "proposed" }] } },
    twinRevisionHash: HASH("proposed"),
    draft: draft([{ slot: "tensions", source: "r3_effect", proposalId: proposal.proposal.proposalId }]),
  }), /Projection basis rejected:effect_basis_ineligible/u);
});
