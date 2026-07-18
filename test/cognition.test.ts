import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runReflection } from "../src/cognition.ts";
import {
  buildContextPacket,
  defaultReflectionTask,
  type ContextSelection,
} from "../src/context.ts";
import type { ReflectionRuntime } from "../src/runtime.ts";
import { expectedProposalId, validateReflectionProposalForPacket } from "../src/reflection.ts";
import {
  correctReflection,
  initWorkspace,
  observeWorkspace,
  statusWorkspace,
  type FailurePoint,
} from "../src/store.ts";
import type { ContextPacket, RuntimeProposalResult } from "../src/types.ts";
import {
  allStateText,
  at,
  FIXED_WORKSPACE_ID,
  makeGitWorkspace,
  removeWorkspace,
} from "./helpers.ts";

const EARLIER_BODY_CANARY = "EARLIER_HISTORICAL_SOURCE_BODY_CANARY";
const LATER_BODY_CANARY = "LATER_HISTORICAL_SOURCE_BODY_CANARY";

interface R2Fixture {
  workspace: string;
  selection: ContextSelection;
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

function makeR2Fixture(): R2Fixture {
  const workspace = makeGitWorkspace();
  mkdirSync(join(workspace, "docs"));
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), [
    "# Decisions",
    "",
    `Tests established a technical review gate. ${EARLIER_BODY_CANARY}`,
    "Owner experience was required because implementation had outrun shared understanding.",
    "",
  ].join("\n"));
  const earlierCommit = commit(workspace, "establish owner acceptance");
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), [
    "# Decisions",
    "",
    "Tests established a technical review gate.",
    "Owner experience was required because implementation had outrun shared understanding.",
    "",
    `The real owner demo caught a silently ignored control input. ${LATER_BODY_CANARY}`,
    "Acceptance waited for the corrected rerun after technical checks had passed.",
    "",
  ].join("\n"));
  const laterCommit = commit(workspace, "exercise owner acceptance");
  initWorkspace({
    workspaceRoot: workspace,
    name: "R2 test workspace",
    activeIntent: "Prove bounded cross-time cognition.",
    nextMove: "Review and correct one evidence-backed Reflection.",
    unresolved: ["Is the relationship more valuable than a summary?"],
    includePaths: ["docs/DECISIONS.md"],
    workspaceId: FIXED_WORKSPACE_ID,
    now: at("2026-07-18T08:00:00.000Z"),
  });
  return {
    workspace,
    selection: {
      earlierCommit,
      laterCommit,
      relativePath: "docs/DECISIONS.md",
      earlierLines: { start: 3, end: 4 },
      laterLines: { start: 6, end: 7 },
      task: defaultReflectionTask(),
    },
  };
}

function runtimeResult(packet: ContextPacket): RuntimeProposalResult {
  return {
    proposal: {
      schemaVersion: "1",
      proposalId: expectedProposalId(packet),
      baseTwinRevision: packet.baseTwinRevision,
      claim: "Owner Acceptance changed from a governance rule into an operational diagnostic that caught a control-path defect after technical checks had already passed.",
      relationType: "trajectory",
      evidenceIds: packet.allowedEvidenceIds,
      uncertainty: {
        level: "medium",
        rationale: "The inference is supported by one completed development slice and may not generalize to later Forme gates.",
      },
      alternativeExplanation: "The owner demo may simply have exposed ordinary missing test coverage rather than a durable governance pattern.",
      implication: "R2 corrections should be exercised through the real owner surface as well as schema and unit-level validation.",
      ownerQuestion: "Does this relationship describe the project accurately, or should it be corrected?",
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

class FakeRuntime implements ReflectionRuntime {
  generate(packet: ContextPacket): RuntimeProposalResult {
    return runtimeResult(packet);
  }
}

test("R2 Context Packet is deterministic, bounded, Git-resolvable, and body-free in its manifest", (context) => {
  const fixture = makeR2Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const first = buildContextPacket(fixture.workspace, fixture.selection);
  const second = buildContextPacket(fixture.workspace, fixture.selection);

  assert.equal(first.packetHash, second.packetHash);
  assert.deepEqual(first.packet, second.packet);
  assert.equal(first.packet.documents.length, 2);
  assert.equal(first.packet.evidence.length, 2);
  assert.notEqual(first.packet.evidence[0]?.commit, first.packet.evidence[1]?.commit);
  assert.equal(first.packet.documents[0]?.body.includes(EARLIER_BODY_CANARY), true);
  assert.equal(first.packet.documents[1]?.body.includes(LATER_BODY_CANARY), true);
  assert.doesNotMatch(JSON.stringify(first.manifest), /HISTORICAL_SOURCE_BODY_CANARY/);
  assert.doesNotMatch(JSON.stringify(first.packet), new RegExp(fixture.workspace));
});

test("R2 admits one inferred Reflection, persists no historical bodies, and reconstructs the view", (context) => {
  const fixture = makeR2Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const run = runReflection(fixture.workspace, fixture.selection, new FakeRuntime(), {
    now: at("2026-07-18T09:01:00.000Z"),
  });

  assert.equal(run.observation.revision.schemaVersion, "2");
  assert.equal(run.observation.revision.revision, 2);
  if (run.observation.revision.schemaVersion !== "2") assert.fail("expected schema v2");
  const reflection = run.observation.revision.cognition.reflections[0];
  assert.equal(reflection?.status, "inferred");
  assert.equal(reflection?.authoredBy, "codex");
  assert.equal(reflection?.evidence.length, 2);
  assert.equal(run.observation.revision.cognition.runtimeReceipts[0]?.audit.toolEventCount, 0);
  assert.match(run.observation.view, /## Reflection/);
  assert.match(run.observation.view, /Uncertainty: medium/);

  const state = allStateText(fixture.workspace);
  assert.doesNotMatch(state, new RegExp(EARLIER_BODY_CANARY));
  assert.doesNotMatch(state, new RegExp(LATER_BODY_CANARY));
  assert.doesNotMatch(state, new RegExp(fixture.workspace));
  rmSync(join(fixture.workspace, ".forme", "restart.md"));
  assert.equal(statusWorkspace(fixture.workspace).view, run.observation.view);
});

test("R2 owner correction creates a revision, supersedes inference, invalidates output, and enters later context", (context) => {
  const fixture = makeR2Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const admitted = runReflection(fixture.workspace, fixture.selection, new FakeRuntime(), {
    now: at("2026-07-18T09:01:00.000Z"),
  }).observation;
  if (admitted.revision.schemaVersion !== "2") assert.fail("expected schema v2");
  const inferred = admitted.revision.cognition.reflections[0];
  assert.ok(inferred);
  const correctionText = "Owner Acceptance is a safety net for incomplete automation, not yet evidence of a general project-development pattern.";
  const corrected = correctReflection(fixture.workspace, inferred.reflectionId, correctionText, {
    now: at("2026-07-18T10:00:00.000Z"),
  });

  assert.equal(corrected.revision.revision, 3);
  if (corrected.revision.schemaVersion !== "2") assert.fail("expected schema v2");
  assert.equal(corrected.revision.cognition.reflections[0]?.status, "superseded");
  assert.equal(corrected.revision.cognition.reflections[1]?.status, "corrected");
  assert.equal(corrected.revision.cognition.reflections[1]?.authoredBy, "owner");
  assert.equal(corrected.revision.cognition.corrections[0]?.correctionText, correctionText);
  assert.equal(corrected.revision.cognition.invalidations.length, 1);
  assert.match(corrected.view, /Dependent outputs invalidated: 1/);

  const laterPacket = buildContextPacket(fixture.workspace, fixture.selection);
  assert.equal(laterPacket.packet.baseTwinRevision, 3);
  assert.equal(laterPacket.packet.activeCorrections[0]?.correctionText, correctionText);

  writeFileSync(join(fixture.workspace, "docs", "DECISIONS.md"), `${readFileSync(join(fixture.workspace, "docs", "DECISIONS.md"), "utf8")}Observed after correction.\n`);
  const observed = observeWorkspace(fixture.workspace, { now: at("2026-07-18T11:00:00.000Z") });
  assert.equal(observed.revision.schemaVersion, "2");
  if (observed.revision.schemaVersion !== "2") assert.fail("expected schema v2");
  assert.equal(observed.revision.cognition.corrections.length, 1);
  assert.equal(observed.revision.cognition.invalidations.length, 1);
  assert.equal(observed.revision.cognition.reflections[1]?.status, "corrected");
});

test("R2 local admission rejects duplicate evidence IDs even though the API output subset cannot express uniqueness", (context) => {
  const fixture = makeR2Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const packet = buildContextPacket(fixture.workspace, fixture.selection).packet;
  const result = runtimeResult(packet).proposal;
  const firstEvidenceId = result.evidenceIds[0];
  assert.ok(firstEvidenceId);
  result.evidenceIds = [firstEvidenceId, firstEvidenceId];
  assert.throws(() => validateReflectionProposalForPacket(result, packet), /evidence IDs must be unique/);
});

test("R2 rejects a packet when the Twin base revision changes during runtime execution", (context) => {
  const fixture = makeR2Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const mutatingRuntime: ReflectionRuntime = {
    generate(packet) {
      writeFileSync(join(fixture.workspace, "docs", "DECISIONS.md"), `${readFileSync(join(fixture.workspace, "docs", "DECISIONS.md"), "utf8")}Working tree changed.\n`);
      observeWorkspace(fixture.workspace, { now: at("2026-07-18T09:30:00.000Z") });
      return runtimeResult(packet);
    },
  };

  assert.throws(
    () => runReflection(fixture.workspace, fixture.selection, mutatingRuntime),
    /Context Packet changed before admission/,
  );
  assert.equal(statusWorkspace(fixture.workspace).revision.schemaVersion, "1");
});

for (const failurePoint of ["pending", "revision", "head", "view"] as const satisfies readonly FailurePoint[]) {
  test(`R2 correction recovery: ${failurePoint} interruption resumes exactly once`, (context) => {
    const fixture = makeR2Fixture();
    context.after(() => removeWorkspace(fixture.workspace));
    const admitted = runReflection(fixture.workspace, fixture.selection, new FakeRuntime(), {
      now: at("2026-07-18T09:01:00.000Z"),
    }).observation;
    if (admitted.revision.schemaVersion !== "2") assert.fail("expected schema v2");
    const reflectionId = admitted.revision.cognition.reflections[0]?.reflectionId;
    assert.ok(reflectionId);

    assert.throws(
      () => correctReflection(fixture.workspace, reflectionId, "The owner supplies corrected active meaning for recovery testing.", {
        failurePoint,
        now: at("2026-07-18T10:00:00.000Z"),
      }),
      /injected failure/,
    );
    const recovered = statusWorkspace(fixture.workspace);
    assert.equal(recovered.revision.revision, 3);
    if (recovered.revision.schemaVersion !== "2") assert.fail("expected schema v2");
    assert.equal(recovered.revision.cognition.corrections.length, 1);
    assert.equal(recovered.revision.cognition.invalidations.length, 1);
  });
}
