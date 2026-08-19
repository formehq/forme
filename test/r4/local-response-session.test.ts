import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSha256,
  GOLDEN_INTERACTION,
  type SessionBudgetV1,
} from "../../packages/r4-protocol/src/index.ts";
import {
  authorizeFreshSessionStart,
  buildResponseOrientation,
  prepareResponseSession,
  sha256,
} from "../../packages/r4-local/src/index.ts";
import type { TwinRevisionV2 } from "../../src/types.ts";
import { NOW, syntheticSnapshot } from "./helpers.ts";

const CORRECTED_ID = "reflection_correctedsynthetic000001";
const INFERRED_ID = "reflection_inferredsynthetic000001";

function revision(): TwinRevisionV2 {
  return {
    schemaVersion: "2",
    workspaceId: "workspace_syntheticresponse000001",
    revision: 7,
    previousRevision: 6,
    observedAt: NOW.toISOString(),
    workspaceContractHash: sha256("workspace-contract"),
    evidence: [],
    changes: { added: [], modified: [], deleted: [] },
    ownerFrame: {
      activeIntent: "Answer the bounded synthetic question truthfully.",
      nextMove: "Review one exact candidate before publication.",
      unresolved: ["How much detail is useful?", "Which trade-off matters most?"],
    },
    warnings: [],
    cognition: {
      reflections: [
        {
          reflectionId: CORRECTED_ID,
          status: "corrected",
          authoredBy: "owner",
          baseTwinRevision: 6,
          claim: "The Owner corrected this meaning and explicitly selected it.",
          relationType: "trajectory",
          evidence: [],
          uncertainty: null,
          alternativeExplanation: null,
          implication: "Use the corrected meaning only when selected.",
          ownerQuestion: null,
          proposalId: null,
          runtimeReceiptId: null,
          dependentOutputIds: [],
          supersedesReflectionId: INFERRED_ID,
          supersededByReflectionId: null,
          createdAt: NOW.toISOString(),
        },
        {
          reflectionId: INFERRED_ID,
          status: "superseded",
          authoredBy: "codex",
          baseTwinRevision: 5,
          claim: "An old inference that must never enter the orientation.",
          relationType: "trajectory",
          evidence: [],
          uncertainty: { level: "medium", rationale: "Synthetic." },
          alternativeExplanation: "Synthetic alternative.",
          implication: "Do not use it.",
          ownerQuestion: "Synthetic?",
          proposalId: "proposal_syntheticresponse000001",
          runtimeReceiptId: "receipt_syntheticresponse0000001",
          dependentOutputIds: [],
          supersedesReflectionId: null,
          supersededByReflectionId: CORRECTED_ID,
          createdAt: NOW.toISOString(),
        },
      ],
      corrections: [],
      invalidations: [],
      runtimeReceipts: [],
    },
  };
}

function orientation() {
  return buildResponseOrientation({
    revision: revision(),
    twinRevisionHash: sha256("twin-revision-7"),
    entityName: "Synthetic Forme",
    currentState: "One synthetic request is waiting for Owner review.",
    publicClaimSummary: ["This is a synthetic Gate A fixture."],
    responseAiEligibleCorrectedReflectionIds: [CORRECTED_ID],
    responseAiEligibleUnresolvedIndexes: [1],
  });
}

const BUDGET: SessionBudgetV1 = {
  wallClockSeconds: 600,
  providerDispatches: 1,
  inputTokens: 4_000,
  outputTokens: 1_000,
  spend: { mode: "incremental", maximumUsd: 0.1 },
};

test("Response Orientation admits only explicitly selected Owner corrections and unresolved items", () => {
  const built = orientation();
  assert.deepEqual(built.eligibleCorrectionSummaries, ["The Owner corrected this meaning and explicitly selected it."]);
  assert.deepEqual(built.eligibleUnresolvedItems, ["Which trade-off matters most?"]);
  assert.doesNotMatch(JSON.stringify(built), /old inference|relativePath|README\.md/u);
  const { contentHash, ...preimage } = built;
  assert.equal(contentHash, canonicalSha256(preimage));
});

test("S06 Guest Interaction and GuestCapsule processing cannot mutate the synthetic Twin", () => {
  const twin = revision();
  const beforeBytes = JSON.stringify(twin);
  const beforeHash = canonicalSha256(twin);
  const interaction = structuredClone(GOLDEN_INTERACTION);
  const builtOrientation = buildResponseOrientation({
    revision: twin,
    twinRevisionHash: beforeHash,
    entityName: "Synthetic Forme",
    currentState: "Process one Guest Interaction without importing it into Twin state.",
    publicClaimSummary: ["Guest input is session context, not Twin evidence."],
    responseAiEligibleCorrectedReflectionIds: [CORRECTED_ID],
    responseAiEligibleUnresolvedIndexes: [0],
  });
  prepareResponseSession({
    interaction,
    orientation: builtOrientation,
    snapshot: syntheticSnapshot(),
    sessionEnvelopeId: "session_s06nonmutation00000001",
    modelId: "synthetic-model",
    budget: BUDGET,
    outputSchemaHash: sha256("s06-output-schema"),
    preparedAt: NOW,
    authorityExpiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.notEqual(interaction.guestCapsule, null, "fixture exercises an actual GuestCapsule");
  assert.equal(JSON.stringify(twin), beforeBytes);
  assert.equal(canonicalSha256(twin), beforeHash);
});

test("Response Orientation rejects unmarked, duplicate, missing, and non-Owner semantic state", () => {
  const base = {
    revision: revision(),
    twinRevisionHash: sha256("twin-revision-7"),
    entityName: "Synthetic Forme",
    currentState: "Synthetic state.",
    publicClaimSummary: [] as string[],
    responseAiEligibleUnresolvedIndexes: [] as number[],
  };
  assert.throws(() => buildResponseOrientation({ ...base, responseAiEligibleCorrectedReflectionIds: [INFERRED_ID] }), /not an active Owner correction/u);
  assert.throws(() => buildResponseOrientation({ ...base, responseAiEligibleCorrectedReflectionIds: [CORRECTED_ID, CORRECTED_ID] }), /unique/u);
  assert.throws(() => buildResponseOrientation({ ...base, responseAiEligibleCorrectedReflectionIds: ["reflection_absentsynthetic0000001"] }), /not an active Owner correction/u);
  assert.throws(() => buildResponseOrientation({ ...base, responseAiEligibleCorrectedReflectionIds: [], responseAiEligibleUnresolvedIndexes: [9] }), /absent/u);
});

test("Prepare and Start are separate exact Owner actions bound to consent, orientation, snapshot, and lifetime", () => {
  const snapshot = syntheticSnapshot();
  const built = orientation();
  const prepared = prepareResponseSession({
    interaction: GOLDEN_INTERACTION,
    orientation: built,
    snapshot,
    sessionEnvelopeId: "session_preparedsynthetic000001",
    modelId: "synthetic-model-no-call",
    budget: BUDGET,
    outputSchemaHash: sha256("response-candidate-schema"),
    preparedAt: new Date(NOW.getTime() + 1_000),
    authorityExpiresAt: new Date(NOW.getTime() + 60 * 60 * 1_000),
  });
  assert.equal(prepared.sessionEnvelope.orientationHash, built.contentHash);
  assert.equal(prepared.sessionEnvelope.snapshotManifestHash, snapshot.manifest.manifestHash);
  assert.equal(prepared.sessionEnvelope.consentEnvelopeHash, canonicalSha256(GOLDEN_INTERACTION.consentEnvelope));

  const start = authorizeFreshSessionStart({
    prepared,
    expectedSessionEnvelopeHash: prepared.sessionEnvelopeHash,
    expectedOrientationHash: built.contentHash,
    expectedSnapshotManifestHash: snapshot.manifest.manifestHash,
    capabilityProbeHash: sha256("synthetic-capability-probe"),
    runtimePolicyHash: sha256("synthetic-runtime-policy"),
    ownerPresenceConfirmed: true,
    reviewedAt: new Date(NOW.getTime() + 2_000),
  });
  assert.equal(start.sessionEnvelopeHash, prepared.sessionEnvelopeHash);
  assert.match(start.startAuthorizationHash, /^sha256:[a-f0-9]{64}$/u);

  assert.throws(() => authorizeFreshSessionStart({
    prepared,
    expectedSessionEnvelopeHash: sha256("changed-preview"),
    expectedOrientationHash: built.contentHash,
    expectedSnapshotManifestHash: snapshot.manifest.manifestHash,
    capabilityProbeHash: sha256("synthetic-capability-probe"),
    runtimePolicyHash: sha256("synthetic-runtime-policy"),
    ownerPresenceConfirmed: true,
    reviewedAt: new Date(NOW.getTime() + 2_000),
  }), /preview changed/u);
});

test("manual-only or widened sessions cannot become a Fresh Session", () => {
  const snapshot = syntheticSnapshot();
  const built = orientation();
  const manual = { ...GOLDEN_INTERACTION, consent: "manual_owner_only" as const, consentEnvelope: null };
  assert.throws(() => prepareResponseSession({
    interaction: manual,
    orientation: built,
    snapshot,
    sessionEnvelopeId: "session_manualsynthetic0000001",
    modelId: "synthetic-model-no-call",
    budget: BUDGET,
    outputSchemaHash: sha256("response-candidate-schema"),
    preparedAt: new Date(NOW.getTime() + 1_000),
    authorityExpiresAt: new Date(NOW.getTime() + 60 * 60 * 1_000),
  }), /manual_owner_only/u);
  assert.throws(() => prepareResponseSession({
    interaction: GOLDEN_INTERACTION,
    orientation: built,
    snapshot,
    sessionEnvelopeId: "session_widenedsynthetic000001",
    modelId: "synthetic-model-no-call",
    budget: { ...BUDGET, outputTokens: 8_001 },
    outputSchemaHash: sha256("response-candidate-schema"),
    preparedAt: new Date(NOW.getTime() + 1_000),
    authorityExpiresAt: new Date(NOW.getTime() + 60 * 60 * 1_000),
  }), /outputTokens|budget/u);
});
