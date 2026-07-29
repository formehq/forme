import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runActionProposal } from "../src/agency.ts";
import { buildActionContextPacket } from "../src/action-context.ts";
import {
  expectedActionProposalId,
  R3_PLACEHOLDER_BODY,
  managedBody,
  validateActionProposalForPacket,
} from "../src/action.ts";
import { runReflection } from "../src/cognition.ts";
import { assertActionIntentProposal, assertTwinRevision } from "../src/contracts.ts";
import { buildContextPacket, type ContextSelection } from "../src/context.ts";
import type { ActionRuntime, ReflectionRuntime } from "../src/runtime.ts";
import { expectedProposalId } from "../src/reflection.ts";
import {
  approveAction,
  correctReflection,
  executeAction,
  initWorkspace,
  observeWorkspace,
  rollbackAction,
  statusWorkspace,
  type EffectFailurePoint,
} from "../src/store.ts";
import type {
  ActionContextPacket,
  ActionIntentProposalV2,
  ActionRuntimeProposalResult,
  ContextPacket,
  RuntimeProposalResult,
} from "../src/types.ts";
import { allStateText, at, FIXED_WORKSPACE_ID, makeGitWorkspace, removeWorkspace } from "./helpers.ts";

const README_CANARY = "R3_PRIVATE_README_SOURCE_BODY_CANARY";
const START = "<!-- forme:r3-action:start -->";
const END = "<!-- forme:r3-action:end -->";

interface R3Fixture {
  workspace: string;
  selection: ContextSelection;
  correctedReflectionId: string;
}

function commit(workspace: string, message: string): string {
  execFileSync("git", ["add", "."], { cwd: workspace });
  execFileSync("git", ["commit", "-q", "-m", message], {
    cwd: workspace,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Forme Test",
      GIT_AUTHOR_EMAIL: "forme@example.test",
      GIT_COMMITTER_NAME: "Forme Test",
      GIT_COMMITTER_EMAIL: "forme@example.test",
    },
  });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();
}

function reflectionRuntimeResult(packet: ContextPacket): RuntimeProposalResult {
  return {
    proposal: {
      schemaVersion: "1",
      proposalId: expectedProposalId(packet),
      baseTwinRevision: packet.baseTwinRevision,
      claim: "Owner review changed from a written governance idea into an exercised control path that corrected model-derived project meaning before later action.",
      relationType: "trajectory",
      evidenceIds: packet.allowedEvidenceIds,
      uncertainty: {
        level: "medium",
        rationale: "The relationship is grounded in one bounded slice and should not be generalized beyond that evidence.",
      },
      alternativeExplanation: "The correction may reflect a one-off wording issue rather than a reusable owner-control pattern.",
      implication: "Any later action must depend on the corrected owner meaning and require a separate exact approval.",
      ownerQuestion: "Should this be narrowed before it becomes action context?",
    },
    cliVersion: "codex-cli test",
    model: "gpt-5.6-test",
    completedAt: "2026-07-18T09:00:00.000Z",
    audit: {
      eventCount: 5,
      itemTypes: ["agent_message", "reasoning"],
      toolEventCount: 0,
      turnCompleted: true,
      inputTokens: 100,
      outputTokens: 80,
    },
  };
}

class FakeReflectionRuntime implements ReflectionRuntime {
  generate(packet: ContextPacket): RuntimeProposalResult {
    return reflectionRuntimeResult(packet);
  }
}

function actionRuntimeResult(packet: ActionContextPacket): ActionRuntimeProposalResult {
  return {
    proposal: {
      schemaVersion: "1",
      proposalId: expectedActionProposalId(packet),
      baseTwinRevision: packet.baseTwinRevision,
      actionKind: "render_next_move_brief.v1",
      rationale: "The corrected Reflection makes one owner-reviewable next move more useful than another summary while preserving a separate approval boundary.",
      title: "Validate the bounded R3 action",
      whyNow: "The project has corrected meaning and a fixed effect surface ready for one controlled walking-slice test.",
      nextMove: "Review the exact managed-block preview and approve only if its proposal and effect-plan hashes match.",
      successCheck: "The fixed README block changes once, Twin revision advances once, and an execution receipt verifies the resulting hash.",
      ownerChallenge: "Reject this proposal if it overstates what one R2 correction proved or if the next move is not decision-useful.",
    },
    cliVersion: "codex-cli test",
    model: "gpt-5.6-test",
    completedAt: "2026-07-18T11:00:00.000Z",
    audit: {
      eventCount: 5,
      itemTypes: ["agent_message", "reasoning"],
      toolEventCount: 0,
      turnCompleted: true,
      inputTokens: 90,
      outputTokens: 70,
    },
  };
}

class FakeActionRuntime implements ActionRuntime {
  generateAction(packet: ActionContextPacket): ActionRuntimeProposalResult {
    return actionRuntimeResult(packet);
  }
}

function actionRuntimeResultV2(
  packet: ActionContextPacket,
  mode: ActionIntentProposalV2["mode"] = "recommend",
): ActionRuntimeProposalResult {
  const asksOwner = mode === "ask_owner";
  return {
    ...actionRuntimeResult(packet),
    proposal: {
      schemaVersion: "2",
      proposalId: expectedActionProposalId(packet),
      baseTwinRevision: packet.baseTwinRevision,
      actionKind: "render_next_move_brief.v1",
      mode,
      plainLanguageSummary: asksOwner
        ? "One missing owner judgment prevents a responsible recommendation."
        : "Use the corrected Reflection as the acceptance boundary for this bounded action.",
      recommendation: asksOwner
        ? null
        : "Approve only the fixed README brief whose effect hash matches the reviewed recommendation.",
      blockingQuestion: asksOwner
        ? "Should the success condition optimize for owner comprehension or for execution-path coverage?"
        : null,
      confidence: {
        level: asksOwner ? "low" : "medium",
        rationale: asksOwner
          ? "The packet proves the control path but does not contain the owner's priority between the two outcomes."
          : "The corrected Reflection directly supports the boundary, while substantive usefulness still needs another case.",
      },
      decisionItems: [
        {
          judgment: "What this action is allowed to prove",
          recommendedChoice: "Treat it as evidence for the bounded control path only.",
          reason: "One corrected case cannot establish general recommendation accuracy or broader action safety.",
          alternatives: [
            "Treat it as evidence of product usefulness as well.",
            "Do not admit any action until another case exists.",
          ],
        },
        {
          judgment: "How the owner should review the result",
          recommendedChoice: "Review the recommendation first, then expand its editable judgments.",
          reason: "This preserves a low-cost top layer without hiding the clauses that may need correction.",
          alternatives: ["Review every provenance field before reading the recommendation."],
        },
      ],
      whyNow: "The corrected meaning and fixed effect surface are ready for a recommendation-first owner review.",
      successCheck: "The owner can understand the answer first, edit one judgment independently, and verify any exact effect before approval.",
      ownerChallenge: "Reject the brief if its compact answer hides a material uncertainty or overstates the corrected evidence.",
    },
  };
}

class FakeActionRuntimeV2 implements ActionRuntime {
  readonly #mode: ActionIntentProposalV2["mode"];

  constructor(mode: ActionIntentProposalV2["mode"] = "recommend") {
    this.#mode = mode;
  }

  generateAction(packet: ActionContextPacket): ActionRuntimeProposalResult {
    return actionRuntimeResultV2(packet, this.#mode);
  }
}

function makeR3Fixture(): R3Fixture {
  const workspace = makeGitWorkspace();
  mkdirSync(join(workspace, "docs"));
  writeFileSync(join(workspace, "README.md"), [
    "# Demo",
    "",
    README_CANARY,
    "",
    START,
    "_No approved Forme action is currently applied._",
    END,
    "",
  ].join("\n"));
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was required before action.\n");
  const earlierCommit = commit(workspace, "record review boundary");
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was exercised through one correction before action.\n");
  const laterCommit = commit(workspace, "exercise review boundary");
  initWorkspace({
    workspaceRoot: workspace,
    name: "R3 test workspace",
    activeIntent: "Prove one owner-controlled bounded action.",
    nextMove: "Prepare and review one fixed-marker action proposal.",
    unresolved: ["Does the proposal preserve owner authority through execution?"],
    includePaths: ["README.md", "docs/DECISIONS.md"],
    workspaceId: FIXED_WORKSPACE_ID,
    now: at("2026-07-18T08:00:00.000Z"),
  });
  const selection: ContextSelection = {
    earlierCommit,
    laterCommit,
    relativePath: "docs/DECISIONS.md",
    earlierLines: { start: 3, end: 3 },
    laterLines: { start: 3, end: 3 },
    task: "Infer how owner review changed before bounded action.",
  };
  const reflected = runReflection(workspace, selection, new FakeReflectionRuntime(), {
    now: at("2026-07-18T09:01:00.000Z"),
  }).observation.revision;
  if (reflected.schemaVersion !== "2") throw new Error("fixture did not reach R2");
  const inferred = reflected.cognition.reflections[0];
  if (!inferred) throw new Error("fixture has no Reflection");
  const corrected = correctReflection(
    workspace,
    inferred.reflectionId,
    "Owner review is one proven control path for this project, not evidence that every future action is safe; R3 must bind one exact effect to a fresh approval.",
    { now: at("2026-07-18T10:00:00.000Z") },
  ).revision;
  if (corrected.schemaVersion !== "2") throw new Error("fixture did not retain R2");
  const correctedReflection = corrected.cognition.reflections.find((item) => item.status === "corrected");
  if (!correctedReflection) throw new Error("fixture has no corrected Reflection");
  return { workspace, selection, correctedReflectionId: correctedReflection.reflectionId };
}

function admitAndApprove(fixture: R3Fixture): { proposalId: string; approvalId: string; effectPlanHash: string } {
  const proposed = runActionProposal(
    fixture.workspace,
    "Render one bounded next-move brief for owner-controlled R3 validation.",
    new FakeActionRuntime(),
    { now: at("2026-07-18T11:01:00.000Z") },
  ).observation.revision;
  if (proposed.schemaVersion !== "3") throw new Error("fixture did not reach R3");
  const record = proposed.agency.proposals[0];
  if (!record) throw new Error("fixture has no action proposal");
  if (record.effectPlanHash === null) throw new Error("fixture action proposal has no effect plan");
  const approved = approveAction(fixture.workspace, record.proposal.proposalId, record.effectPlanHash, {
    now: at("2026-07-18T12:00:00.000Z"),
  }).revision;
  if (approved.schemaVersion !== "3") throw new Error("fixture did not approve R3");
  const approvalId = approved.agency.approvals[0]?.approvalId;
  if (!approvalId) throw new Error("fixture has no approval");
  return { proposalId: record.proposal.proposalId, approvalId, effectPlanHash: record.effectPlanHash };
}

test("R3 packet is deterministic and body-free, and model output cannot add a path or patch", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const goal = "Render one bounded next-move brief for owner-controlled R3 validation.";
  const first = buildActionContextPacket(fixture.workspace, goal);
  const second = buildActionContextPacket(fixture.workspace, goal);
  assert.deepEqual(first, second);
  assert.equal(first.manifest.transmittedSourceBytes, 0);
  assert.equal(first.packet.correctedReflection.reflectionId, fixture.correctedReflectionId);
  assert.doesNotMatch(JSON.stringify(first.packet), new RegExp(README_CANARY));
  assert.doesNotMatch(JSON.stringify(first.packet), new RegExp(fixture.workspace));
  assert.throws(
    () => assertActionIntentProposal({ ...actionRuntimeResult(first.packet).proposal, path: "src/unsafe.ts" }),
    /Action intent proposal contract failed/,
  );
  assert.equal(buildContextPacket(fixture.workspace, fixture.selection).packet.baseTwinRevision, 3);
});

test("R2 Context Packet preserves active owner corrections after the Twin reaches V3", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const beforePromotion = statusWorkspace(fixture.workspace).revision;
  if (beforePromotion.schemaVersion !== "2") assert.fail("expected corrected V2 fixture");
  const correction = beforePromotion.cognition.corrections[0];
  assert.ok(correction);

  const promoted = runActionProposal(
    fixture.workspace,
    "Render one bounded next-move brief for owner-controlled R3 validation.",
    new FakeActionRuntime(),
    { now: at("2026-07-18T11:01:00.000Z") },
  ).observation.revision;
  if (promoted.schemaVersion !== "3") assert.fail("expected fixture to reach V3");

  const nextPacket = buildContextPacket(fixture.workspace, fixture.selection).packet;
  assert.equal(nextPacket.baseTwinRevision, promoted.revision);
  assert.deepEqual(nextPacket.activeCorrections, [{
    correctionId: correction.correctionId,
    targetReflectionId: correction.targetReflectionId,
    correctedReflectionId: correction.correctedReflectionId,
    correctionText: correction.correctionText,
    correctedAt: correction.correctedAt,
  }]);
});

test("R3-V2 contract enforces recommendation, ask-owner, decomposition, and rendered-text boundaries", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const packet = buildActionContextPacket(
    fixture.workspace,
    "Return one understandable recommendation with editable judgments.",
  ).packet;
  const recommended = actionRuntimeResultV2(packet).proposal;
  const asksOwner = actionRuntimeResultV2(packet, "ask_owner").proposal;
  if (recommended.schemaVersion !== "2" || asksOwner.schemaVersion !== "2") assert.fail("expected V2 proposals");
  assert.doesNotThrow(() => assertActionIntentProposal(recommended));
  assert.doesNotThrow(() => assertActionIntentProposal(asksOwner));
  assert.throws(
    () => assertActionIntentProposal({
      ...asksOwner,
      confidence: { ...asksOwner.confidence, level: "medium" },
    }),
    /ask_owner mode requires low confidence/,
  );
  assert.throws(
    () => assertActionIntentProposal({ ...recommended, blockingQuestion: "Should the owner choose instead?" }),
    /recommend mode requires one recommendation and no blocking question/,
  );
  assert.throws(
    () => assertActionIntentProposal({
      ...recommended,
      decisionItems: [...recommended.decisionItems, recommended.decisionItems[0], recommended.decisionItems[1]],
    }),
    /Action intent proposal contract failed/,
  );
  assert.throws(
    () => validateActionProposalForPacket({
      ...recommended,
      ownerChallenge: "Hide <!-- forme:r3-action:start --> inside output.",
    }, packet),
    /forbidden marker/,
  );
});

test("R3-V2 recommendation renders a progressive brief and retains exact approval and execution", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const proposed = runActionProposal(
    fixture.workspace,
    "Return one understandable recommendation with editable judgments.",
    new FakeActionRuntimeV2(),
    { now: at("2026-07-18T11:01:00.000Z") },
  ).observation;
  if (proposed.revision.schemaVersion !== "3") assert.fail("expected V3");
  const record = proposed.revision.agency.proposals[0];
  assert.ok(record);
  assert.equal(record.proposal.schemaVersion, "2");
  assert.ok(record.effectPlan);
  assert.ok(record.effectPlanHash);
  assert.match(proposed.view, /Layer 1 — 30-second answer/);
  assert.match(proposed.view, /Layer 2 — editable judgment items/);
  assert.match(proposed.view, /Layer 3 — evidence, uncertainty, provenance, and consequences/);
  assert.match(proposed.view, /Treat it as evidence for the bounded control path only/);
  const approved = approveAction(
    fixture.workspace,
    record.proposal.proposalId,
    record.effectPlanHash,
    { now: at("2026-07-18T12:00:00.000Z") },
  ).revision;
  if (approved.schemaVersion !== "3") assert.fail("expected V3");
  const approvalId = approved.agency.approvals[0]?.approvalId;
  assert.ok(approvalId);
  const executed = executeAction(fixture.workspace, approvalId, {
    now: at("2026-07-18T13:00:00.000Z"),
  });
  assert.equal(executed.receipt.status, "succeeded");
  assert.match(managedBody(readFileSync(join(fixture.workspace, "README.md"), "utf8")), /Owner Decision Brief/);
  assert.match(managedBody(readFileSync(join(fixture.workspace, "README.md"), "utf8")), /Editable judgment items/);
});

test("R3-V2 ask_owner persists one blocking question but cannot create, approve, or execute an effect", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const proposed = runActionProposal(
    fixture.workspace,
    "Return one understandable recommendation or name the blocking owner judgment.",
    new FakeActionRuntimeV2("ask_owner"),
    { now: at("2026-07-18T11:01:00.000Z") },
  ).observation;
  if (proposed.revision.schemaVersion !== "3") assert.fail("expected V3");
  const record = proposed.revision.agency.proposals[0];
  assert.ok(record);
  assert.equal(record.effectPlan, null);
  assert.equal(record.effectPlanHash, null);
  assert.equal(proposed.revision.agency.approvals.length, 0);
  assert.equal(proposed.revision.agency.effectReceipts.length, 0);
  assert.match(proposed.view, /Owner input needed/);
  assert.match(proposed.view, /no effect plan was compiled/);
  assert.doesNotMatch(proposed.view, /Exact managed-block preview/);
  assert.throws(
    () => approveAction(
      fixture.workspace,
      record.proposal.proposalId,
      `sha256:${"0".repeat(64)}`,
    ),
    /ask_owner proposals cannot be approved/,
  );
  const tampered = structuredClone(proposed.revision);
  tampered.agency.approvals.push({
    approvalId: `apr_${"0".repeat(32)}`,
    proposalId: record.proposal.proposalId,
    proposalHash: record.proposalHash,
    effectPlanHash: `sha256:${"0".repeat(64)}`,
    authority: "owner",
    baseTwinRevision: proposed.revision.revision,
    approvedAt: "2026-07-18T12:00:00.000Z",
    status: "approved",
    consumedAt: null,
  });
  assert.throws(
    () => assertTwinRevision(tampered),
    /ask_owner proposals cannot be referenced by approvals/,
  );
  const reconstructed = statusWorkspace(fixture.workspace);
  assert.equal(reconstructed.view, proposed.view);
  assert.equal(managedBody(readFileSync(join(fixture.workspace, "README.md"), "utf8")), R3_PLACEHOLDER_BODY);
});

test("R3 proposal, exact approval, execution, idempotent retry, and rollback form one V3 chain", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const approved = admitAndApprove(fixture);
  const beforeExecution = statusWorkspace(fixture.workspace);
  assert.equal(beforeExecution.revision.revision, 5);
  assert.match(beforeExecution.view, new RegExp(approved.effectPlanHash));
  assert.match(beforeExecution.view, /Exact managed-block preview/);

  const executed = executeAction(fixture.workspace, approved.approvalId, {
    now: at("2026-07-18T13:00:00.000Z"),
  });
  assert.equal(executed.changed, true);
  assert.equal(executed.receipt.status, "succeeded");
  assert.equal(executed.observation.revision.revision, 6);
  assert.notEqual(managedBody(readFileSync(join(fixture.workspace, "README.md"), "utf8")), R3_PLACEHOLDER_BODY);
  assert.equal(execFileSync("git", ["status", "--short"], { cwd: fixture.workspace, encoding: "utf8" }).includes("README.md"), true);

  const retried = executeAction(fixture.workspace, approved.approvalId);
  assert.equal(retried.changed, false);
  assert.equal(retried.observation.revision.revision, 6);
  assert.equal(retried.receipt.receiptId, executed.receipt.receiptId);
  assert.doesNotMatch(allStateText(fixture.workspace), new RegExp(README_CANARY));

  const rolledBack = rollbackAction(fixture.workspace, executed.receipt.receiptId, {
    now: at("2026-07-18T14:00:00.000Z"),
  });
  assert.equal(rolledBack.receipt.status, "succeeded");
  assert.equal(rolledBack.observation.revision.revision, 7);
  assert.equal(managedBody(readFileSync(join(fixture.workspace, "README.md"), "utf8")), R3_PLACEHOLDER_BODY);
  const rollbackRetry = rollbackAction(fixture.workspace, executed.receipt.receiptId);
  assert.equal(rollbackRetry.changed, false);
  assert.equal(rollbackRetry.observation.revision.revision, 7);
});

test("R3 rejects the wrong effect hash and invalidates approval after an intervening Twin revision", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const run = runActionProposal(
    fixture.workspace,
    "Render one bounded next-move brief for owner-controlled R3 validation.",
    new FakeActionRuntime(),
    { now: at("2026-07-18T11:01:00.000Z") },
  );
  if (run.observation.revision.schemaVersion !== "3") assert.fail("expected V3");
  const record = run.observation.revision.agency.proposals[0];
  assert.ok(record);
  assert.ok(record.effectPlanHash);
  assert.throws(
    () => approveAction(fixture.workspace, record.proposal.proposalId, `sha256:${"0".repeat(64)}`),
    /does not match/,
  );
  const approved = approveAction(fixture.workspace, record.proposal.proposalId, record.effectPlanHash, {
    now: at("2026-07-18T11:15:00.000Z"),
  }).revision;
  if (approved.schemaVersion !== "3") assert.fail("expected V3");
  const approvalId = approved.agency.approvals[0]?.approvalId;
  assert.ok(approvalId);
  writeFileSync(join(fixture.workspace, "docs", "DECISIONS.md"), "# Decisions\n\nAn intervening source revision breaks approval freshness.\n");
  const observed = observeWorkspace(fixture.workspace, {
    now: at("2026-07-18T11:30:00.000Z"),
  });
  assert.equal(observed.revision.revision, 6);
  if (observed.revision.schemaVersion !== "3") assert.fail("expected V3");
  assert.equal(observed.revision.agency.proposals[0]?.status, "invalidated");
  assert.equal(observed.revision.agency.approvals[0]?.status, "invalidated");
  assert.throws(
    () => executeAction(fixture.workspace, approvalId),
    /not executable/,
  );
});

test("R3 records an indeterminate terminal receipt when the journaled target becomes unknown", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const approved = admitAndApprove(fixture);
  assert.throws(
    () => executeAction(fixture.workspace, approved.approvalId, {
      failurePoint: "effect-pending",
      now: at("2026-07-18T13:00:00.000Z"),
    }),
    /injected failure/,
  );
  const readmePath = join(fixture.workspace, "README.md");
  writeFileSync(
    readmePath,
    readFileSync(readmePath, "utf8").replace(
      "_No approved Forme action is currently applied._",
      "An external writer changed the journaled target.",
    ),
  );
  const recovered = statusWorkspace(fixture.workspace);
  if (recovered.revision.schemaVersion !== "3") assert.fail("expected V3");
  assert.equal(recovered.revision.revision, 6);
  assert.equal(recovered.revision.agency.effectReceipts[0]?.status, "indeterminate");
  assert.equal(recovered.revision.agency.proposals[0]?.status, "indeterminate");
  assert.equal(recovered.revision.agency.approvals[0]?.status, "consumed");
  assert.doesNotMatch(allStateText(fixture.workspace), /external writer changed/i);
  assert.throws(() => executeAction(fixture.workspace, approved.approvalId), /not executable/);
});

test("R3 owner correction invalidates a dependent proposal and any later approval", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const proposed = runActionProposal(
    fixture.workspace,
    "Render one bounded next-move brief for owner-controlled R3 validation.",
    new FakeActionRuntime(),
    { now: at("2026-07-18T11:01:00.000Z") },
  ).observation.revision;
  if (proposed.schemaVersion !== "3") assert.fail("expected V3");
  const record = proposed.agency.proposals[0];
  assert.ok(record);
  assert.ok(record.effectPlanHash);
  const effectPlanHash = record.effectPlanHash;
  const corrected = correctReflection(
    fixture.workspace,
    fixture.correctedReflectionId,
    "The owner narrows the active meaning again, so every unexecuted action derived from the previous correction must be invalidated.",
    { now: at("2026-07-18T11:30:00.000Z") },
  );
  if (corrected.revision.schemaVersion !== "3") assert.fail("expected V3");
  assert.equal(corrected.revision.agency.proposals[0]?.status, "invalidated");
  assert.equal(corrected.revision.agency.invalidations.length, 1);
  assert.throws(
    () => approveAction(fixture.workspace, record.proposal.proposalId, effectPlanHash),
    /cannot be approved from status invalidated/,
  );
});

test("R3 refuses a README with duplicate managed markers", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const readmePath = join(fixture.workspace, "README.md");
  writeFileSync(readmePath, `${readFileSync(readmePath, "utf8")}\n${START}\nDuplicate\n${END}\n`);
  observeWorkspace(fixture.workspace, { now: at("2026-07-18T10:30:00.000Z") });
  assert.throws(
    () => runActionProposal(
      fixture.workspace,
      "Render one bounded next-move brief for owner-controlled R3 validation.",
      new FakeActionRuntime(),
    ),
    /exactly one Forme R3 managed block/,
  );
});

for (const failurePoint of [
  "effect-pending",
  "effect-write",
  "effect-revision",
  "effect-head",
  "effect-view",
] as const satisfies readonly EffectFailurePoint[]) {
  test(`R3 effect recovery: ${failurePoint} interruption converges exactly once`, (context) => {
    const fixture = makeR3Fixture();
    context.after(() => removeWorkspace(fixture.workspace));
    const approved = admitAndApprove(fixture);
    assert.throws(
      () => executeAction(fixture.workspace, approved.approvalId, {
        failurePoint,
        now: at("2026-07-18T13:00:00.000Z"),
      }),
      /injected failure/,
    );
    const recovered = statusWorkspace(fixture.workspace);
    assert.equal(recovered.revision.revision, 6);
    if (recovered.revision.schemaVersion !== "3") assert.fail("expected V3");
    assert.equal(recovered.revision.agency.effectReceipts.length, 1);
    assert.equal(recovered.revision.agency.effectReceipts[0]?.status, "succeeded");
    assert.equal(recovered.revision.agency.proposals[0]?.status, "executed");
    const retry = executeAction(fixture.workspace, approved.approvalId);
    assert.equal(retry.changed, false);
    assert.equal(retry.observation.revision.revision, 6);
  });
}
