import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import { canonicalJson, canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  approveLocalProjection,
  compileLocalProjectionProfile,
  prepareLocalProjection,
  previewLocalProjection,
  recoverLocalProjectionReview,
  type LocalProjectionApprovalFault,
  type LocalProjectionPrepareFault,
} from "../../packages/r4-local/src/index.ts";
import { expectedActionProposalId } from "../../src/action.ts";
import { runActionProposal } from "../../src/agency.ts";
import { runReflection } from "../../src/cognition.ts";
import type { ActionRuntime, ReflectionRuntime } from "../../src/runtime.ts";
import { expectedProposalId } from "../../src/reflection.ts";
import {
  approveAction,
  correctReflection,
  executeAction,
  initWorkspace,
  observeWorkspace,
  rollbackAction,
  statusWorkspace,
} from "../../src/store.ts";
import type {
  ActionContextPacket,
  ActionRuntimeProposalResult,
  ContextPacket,
  RuntimeProposalResult,
} from "../../src/types.ts";
import { allStateText, at, FIXED_WORKSPACE_ID, makeGitWorkspace, removeWorkspace } from "../helpers.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;
const PRIVATE_CANARY = "R4_LOCAL_PROJECTION_PRIVATE_SOURCE_CANARY";
const START = "<!-- forme:r3-action:start -->";
const END = "<!-- forme:r3-action:end -->";

interface Fixture {
  workspace: string;
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

class FakeReflectionRuntime implements ReflectionRuntime {
  generate(packet: ContextPacket): RuntimeProposalResult {
    return {
      proposal: {
        schemaVersion: "1",
        proposalId: expectedProposalId(packet),
        baseTwinRevision: packet.baseTwinRevision,
        claim: "Owner review became an exercised project control path before bounded action, with a correction that later public wording must preserve.",
        relationType: "trajectory",
        evidenceIds: packet.allowedEvidenceIds,
        uncertainty: {
          level: "medium",
          rationale: "This is one bounded project history and should not be generalized.",
        },
        alternativeExplanation: "The correction may still be specific to this project slice.",
        implication: "Public wording must preserve the correction and its limits.",
        ownerQuestion: "Is this narrow enough to show another person?",
      },
      cliVersion: "codex-cli local-projection-test",
      model: "gpt-5.6-test",
      completedAt: "2026-08-09T09:00:00.000Z",
      audit: {
        eventCount: 4,
        itemTypes: ["agent_message", "reasoning"],
        toolEventCount: 0,
        turnCompleted: true,
        inputTokens: 80,
        outputTokens: 60,
      },
    };
  }
}

class FakeActionRuntime implements ActionRuntime {
  generateAction(packet: ActionContextPacket): ActionRuntimeProposalResult {
    return {
      proposal: {
        schemaVersion: "1",
        proposalId: expectedActionProposalId(packet),
        baseTwinRevision: packet.baseTwinRevision,
        actionKind: "render_next_move_brief.v1",
        rationale: "The corrected Reflection supports one exact and reversible next-move brief.",
        title: "Exercise one bounded effect",
        whyNow: "The project has corrected meaning and a fixed reversible surface.",
        nextMove: "Review and execute only the exact managed-block effect.",
        successCheck: "The effect is verified and then rolled back to the original bytes.",
        ownerChallenge: "Reject this if it overstates what the corrected Reflection proved.",
      },
      cliVersion: "codex-cli local-projection-test",
      model: "gpt-5.6-test",
      completedAt: "2026-08-09T11:00:00.000Z",
      audit: {
        eventCount: 4,
        itemTypes: ["agent_message", "reasoning"],
        toolEventCount: 0,
        turnCompleted: true,
        inputTokens: 70,
        outputTokens: 50,
      },
    };
  }
}

function makeR3Fixture(): Fixture {
  const workspace = realpathSync(makeGitWorkspace());
  mkdirSync(join(workspace, "docs"));
  writeFileSync(join(workspace, "README.md"), [
    "# Local Projection fixture",
    "",
    PRIVATE_CANARY,
    "",
    START,
    "_No approved Forme action is currently applied._",
    END,
    "",
  ].join("\n"));
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was required.\n");
  const earlierCommit = commit(workspace, "record owner boundary");
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was exercised before action.\n");
  const laterCommit = commit(workspace, "exercise owner boundary");

  initWorkspace({
    workspaceRoot: workspace,
    name: "Forme local Projection fixture",
    activeIntent: "Turn the current Living Project Twin into one honest local public preview.",
    nextMove: "Review the exact local Projection wording before any Room exists.",
    unresolved: ["Can another person understand the project without receiving private source bodies?"],
    includePaths: ["README.md", "docs/DECISIONS.md"],
    workspaceId: FIXED_WORKSPACE_ID,
    now: at("2026-08-09T08:00:00.000Z"),
  });
  const reflected = runReflection(workspace, {
    earlierCommit,
    laterCommit,
    relativePath: "docs/DECISIONS.md",
    earlierLines: { start: 3, end: 3 },
    laterLines: { start: 3, end: 3 },
    task: "Infer how Owner control changed before bounded action.",
  }, new FakeReflectionRuntime(), { now: at("2026-08-09T09:01:00.000Z") }).observation.revision;
  if (reflected.schemaVersion !== "2") throw new Error("fixture did not reach R2");
  const inferred = reflected.cognition.reflections[0];
  if (!inferred) throw new Error("fixture has no Reflection");
  correctReflection(
    workspace,
    inferred.reflectionId,
    "Owner review is one proven control path here, not evidence that every future action is safe; public wording must preserve that limit.",
    { now: at("2026-08-09T10:00:00.000Z") },
  );
  const proposed = runActionProposal(
    workspace,
    "Render one reversible next-move brief before public Presence work.",
    new FakeActionRuntime(),
    { now: at("2026-08-09T11:01:00.000Z") },
  ).observation.revision;
  if (proposed.schemaVersion !== "3") throw new Error("fixture did not reach R3");
  const proposal = proposed.agency.proposals[0];
  if (!proposal?.effectPlanHash) throw new Error("fixture has no effect plan");
  const approved = approveAction(workspace, proposal.proposal.proposalId, proposal.effectPlanHash, {
    now: at("2026-08-09T12:00:00.000Z"),
  }).revision;
  if (approved.schemaVersion !== "3") throw new Error("fixture did not approve R3");
  const approvalId = approved.agency.approvals[0]?.approvalId;
  if (!approvalId) throw new Error("fixture has no action approval");
  const executed = executeAction(workspace, approvalId, { now: at("2026-08-09T13:00:00.000Z") });
  rollbackAction(workspace, executed.receipt.receiptId, { now: at("2026-08-09T14:00:00.000Z") });
  return { workspace };
}

function currentTime(offsetMilliseconds = 0): Date {
  return new Date(Date.now() + offsetMilliseconds);
}

function exactStateSnapshot(root: string): unknown[] {
  const rows: unknown[] = [];
  const visit = (path: string): void => {
    const stat = lstatSync(path, { bigint: false });
    rows.push({
      path: relative(root, path) || ".",
      device: stat.dev,
      inode: stat.ino,
      mode: stat.mode,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      sha256: stat.isFile() ? createHash("sha256").update(readFileSync(path)).digest("hex") : null,
    });
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort()) visit(join(path, entry));
    }
  };
  visit(root);
  return rows;
}

test("#66 prepares all five public sections from the real R1→R2→R3 Twin and exact approval remains local", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const openTo = "Questions about bounded collaboration and what this project is becoming.";
  const cliPrepared = execFileSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "prepare",
    "--workspace", fixture.workspace, "--open-to", openTo,
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    env: { ...process.env, FORME_DENY_NETWORK: "1" },
  });
  assert.match(cliPrepared, /READY_FOR_OWNER_REVIEW/u);
  const first = previewLocalProjection({ workspaceRoot: fixture.workspace, now: currentTime() });
  assert.equal(first.status, "READY_FOR_OWNER_REVIEW");
  assert.deepEqual(new Set(first.candidate.capsule.claims.map((claim) => claim.slot)), new Set([
    "becoming", "now", "nextMove", "tensions", "openTo",
  ]));
  assert.ok(first.candidate.capsule.claims.filter((claim) => claim.slot === "now").length >= 2);
  assert.ok(new Set(first.candidate.basis.claims.map((claim) => claim.sourceKind)).has("owner_frame"));
  assert.ok(new Set(first.candidate.basis.claims.map((claim) => claim.sourceKind)).has("owner_corrected_reflection"));
  assert.ok(new Set(first.candidate.basis.claims.map((claim) => claim.sourceKind)).has("r3_effect"));
  assert.match(first.preview, /LOCAL ONLY — NOT PUBLISHED — NO ROOM OR CURATOR ACTION/u);
  assert.match(first.preview, /### Becoming[\s\S]*### Now[\s\S]*### Next Move[\s\S]*### Tensions[\s\S]*### Open To/u);
  assert.match(first.preview, new RegExp(first.candidate.manifest.reviewHash));
  const exactReviewEnvelope = {
    schemaVersion: "local_projection_exact_review.v1",
    capsule: first.candidate.capsule,
    basis: first.candidate.basis,
  };
  assert.equal(canonicalSha256(exactReviewEnvelope), first.candidate.manifest.reviewHash);
  assert.ok(first.preview.includes(canonicalJson(exactReviewEnvelope)));
  assert.doesNotMatch(first.preview, new RegExp(PRIVATE_CANARY));
  assert.doesNotMatch(first.preview, new RegExp(fixture.workspace.replaceAll("/", "\\/")));
  assert.equal(first.candidate.manifest.publicationAuthorized, false);
  assert.equal(first.candidate.manifest.roomMutationAuthorized, false);

  const idempotent = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo,
    now: currentTime(),
  });
  assert.equal(idempotent.candidate.manifest.candidateId, first.candidate.manifest.candidateId);
  assert.throws(() => approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE sha256:${"0".repeat(64)}`,
    now: currentTime(1_000),
  }), /exact displayed review hash/u);

  const atFreshnessBoundary = new Date(first.candidate.capsule.freshUntil);
  assert.equal(previewLocalProjection({ workspaceRoot: fixture.workspace, now: atFreshnessBoundary }).status, "STALE_TIME");
  assert.throws(() => approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE ${first.candidate.manifest.reviewHash}`,
    now: atFreshnessBoundary,
  }), /not approvable:STALE_TIME/u);

  const emptyApproval = spawnSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "approve", "--workspace", fixture.workspace,
  ], { cwd: resolve("."), encoding: "utf8", input: "", env: { ...process.env, FORME_DENY_NETWORK: "1" } });
  assert.notEqual(emptyApproval.status, 0);
  assert.match(emptyApproval.stderr, /type the exact displayed/u);

  const cliApproval = spawnSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "approve", "--workspace", fixture.workspace,
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    input: `APPROVE ${first.candidate.manifest.reviewHash}\n`,
    env: { ...process.env, FORME_DENY_NETWORK: "1" },
  });
  assert.equal(cliApproval.status, 0, cliApproval.stderr);
  assert.match(cliApproval.stdout, /APPROVED_CURRENT/u);
  const approved = previewLocalProjection({ workspaceRoot: fixture.workspace, now: currentTime(1_000) });
  assert.equal(approved.status, "APPROVED_CURRENT");
  assert.equal(approved.approval?.approval.publicationAuthorized, false);
  assert.equal(approved.approval?.approval.roomMutationAuthorized, false);
  assert.deepEqual([
    approved.approval?.receipt.roomCalls,
    approved.approval?.receipt.networkCalls,
    approved.approval?.receipt.providerCalls,
    approved.approval?.receipt.hostBindingCalls,
    approved.approval?.receipt.publicationCalls,
  ], [0, 0, 0, 0, 0]);
  const restarted = previewLocalProjection({ workspaceRoot: fixture.workspace, now: currentTime(2_000) });
  assert.deepEqual(restarted.approval, approved.approval);
  assert.equal(restarted.candidate.manifest.reviewHash, first.candidate.manifest.reviewHash);
  assert.doesNotMatch(allStateText(fixture.workspace), new RegExp(PRIVATE_CANARY));
  const stateRoot = join(fixture.workspace, ".forme");
  const beforeReadOnlyPreview = exactStateSnapshot(stateRoot);
  previewLocalProjection({ workspaceRoot: fixture.workspace, now: currentTime(2_500) });
  assert.deepEqual(exactStateSnapshot(stateRoot), beforeReadOnlyPreview, "preview must not rewrite local state");

  const candidateRoot = join(fixture.workspace, ".forme", "r4", "projections", "candidates", first.candidate.manifest.candidateId);
  const approvalRoot = join(fixture.workspace, ".forme", "r4", "projections", "approvals", first.candidate.manifest.candidateId);
  assert.equal(statSync(candidateRoot).mode & 0o777, 0o700);
  assert.equal(statSync(approvalRoot).mode & 0o777, 0o700);
  for (const file of ["basis.json", "capsule.json", "input.json", "manifest.json"]) {
    assert.equal(statSync(join(candidateRoot, file)).mode & 0o777, 0o600);
  }
  for (const file of ["approval.json", "receipt.json"]) {
    assert.equal(statSync(join(approvalRoot, file)).mode & 0o777, 0o600);
  }

  const cliPreview = execFileSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "preview", "--workspace", fixture.workspace,
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    env: { ...process.env, FORME_DENY_NETWORK: "1" },
  });
  assert.match(cliPreview, /APPROVED_CURRENT/u);
  const forbiddenShortcut = spawnSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "approve", "--workspace", fixture.workspace, "--yes", "true",
  ], { cwd: resolve("."), encoding: "utf8", env: { ...process.env, FORME_DENY_NETWORK: "1" } });
  assert.notEqual(forbiddenShortcut.status, 0);
  assert.match(forbiddenShortcut.stderr, /unknown option.*--yes/u);
  assert.equal(previewLocalProjection({ workspaceRoot: fixture.workspace, now: atFreshnessBoundary }).status, "APPROVED_STALE_TIME");
  const expired = previewLocalProjection({
    workspaceRoot: fixture.workspace,
    now: new Date(first.candidate.manifest.expiresAt),
  });
  assert.equal(expired.status, "APPROVED_EXPIRED");
  assert.throws(() => approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE ${first.candidate.manifest.reviewHash}`,
    now: new Date(first.candidate.manifest.expiresAt),
  }), /not approvable:APPROVED_EXPIRED/u);
});

test("#66 marks an approved candidate stale after a real Twin change and rejects the old hash", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const prepared = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Questions about the next bounded Presence step.",
    now: currentTime(-1_000),
  });
  approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE ${prepared.candidate.manifest.reviewHash}`,
    now: currentTime(),
  });
  observeWorkspace(fixture.workspace, {
    ownerFrame: {
      nextMove: "Review a changed local Projection from the new Twin revision.",
      unresolved: ["A public question", "A public question", "A second public question"],
    },
    now: at("2026-08-09T15:00:00.000Z"),
  });
  const stale = previewLocalProjection({ workspaceRoot: fixture.workspace, now: currentTime(1_000) });
  assert.equal(stale.status, "APPROVED_STALE");
  assert.throws(() => approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE ${prepared.candidate.manifest.reviewHash}`,
    now: currentTime(2_000),
  }), /not approvable:APPROVED_STALE/u);
  const fresh = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Questions about the next bounded Presence step.",
    now: currentTime(3_000),
  });
  assert.notEqual(fresh.candidate.manifest.reviewHash, prepared.candidate.manifest.reviewHash);
  assert.equal(fresh.status, "READY_FOR_OWNER_REVIEW");
  assert.deepEqual(
    fresh.candidate.capsule.claims.filter((claim) => claim.slot === "tensions").map((claim) => claim.text),
    ["A public question", "A second public question"],
  );
  const current = statusWorkspace(fixture.workspace).revision;
  if (current.schemaVersion !== "3") throw new Error("fixture lost R3 state");
  const governingReflection = current.cognition.reflections.find((item) => item.status === "corrected");
  if (!governingReflection) throw new Error("fixture lost its governing correction");
  correctReflection(
    fixture.workspace,
    governingReflection.reflectionId,
    "A newer Owner correction now governs meaning, so the older R3 effect cannot be spliced into this new Becoming claim.",
    { now: at("2026-08-09T16:00:00.000Z") },
  );
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "This must wait for a new causally connected bounded effect.",
    now: currentTime(4_000),
  }), /verified current or rolled-back R3 effect/u);

  const lineageFixture = makeR3Fixture();
  context.after(() => removeWorkspace(lineageFixture.workspace));
  const lineageTwin = statusWorkspace(lineageFixture.workspace).revision;
  if (lineageTwin.schemaVersion !== "3") throw new Error("fixture lost R3 lineage");
  const crossSpliced = structuredClone(lineageTwin);
  const splicedReceipt = crossSpliced.agency.effectReceipts[0];
  if (!splicedReceipt) throw new Error("fixture lost its execution receipt");
  splicedReceipt.proposalId = `act_${"f".repeat(32)}`;
  assert.throws(() => compileLocalProjectionProfile({
    revision: crossSpliced,
    twinRevisionHash: canonicalSha256(crossSpliced),
    profile: {
      schemaVersion: "local_projection_profile_input.v1",
      workspaceName: "Cross-spliced Twin",
      openTo: "This structurally valid but causally false effect must not enter public wording.",
      preparedAt: new Date().toISOString(),
    },
  }), /verified current or rolled-back R3 effect/u);
  const correctionSpliced = structuredClone(lineageTwin);
  const splicedRecord = correctionSpliced.agency.proposals[0];
  if (!splicedRecord) throw new Error("fixture lost its action record");
  splicedRecord.correctionId = `cor_${"e".repeat(32)}`;
  assert.throws(() => compileLocalProjectionProfile({
    revision: correctionSpliced,
    twinRevisionHash: canonicalSha256(correctionSpliced),
    profile: {
      schemaVersion: "local_projection_profile_input.v1",
      workspaceName: "Correction-spliced Twin",
      openTo: "A correction that did not govern this effect must not enter public wording.",
      preparedAt: new Date().toISOString(),
    },
  }), /verified current or rolled-back R3 effect/u);
  const claimSpliced = structuredClone(lineageTwin);
  const correctedClaim = claimSpliced.cognition.reflections.find((item) => item.status === "corrected");
  if (!correctedClaim) throw new Error("fixture lost its corrected Reflection");
  correctedClaim.claim = "A structurally valid claim that the recorded Owner correction never said.";
  assert.throws(() => compileLocalProjectionProfile({
    revision: claimSpliced,
    twinRevisionHash: canonicalSha256(claimSpliced),
    profile: {
      schemaVersion: "local_projection_profile_input.v1",
      workspaceName: "Claim-spliced Twin",
      openTo: "An unrecorded corrected claim must not enter public wording.",
      preparedAt: new Date().toISOString(),
    },
  }), /verified current or rolled-back R3 effect/u);
  const contradictoryActive = structuredClone(lineageTwin);
  const activeCorrection = contradictoryActive.cognition.reflections.find((item) => item.status === "corrected");
  if (!activeCorrection) throw new Error("fixture lost its active corrected Reflection");
  activeCorrection.supersededByReflectionId = `ref_${"d".repeat(32)}`;
  assert.throws(() => compileLocalProjectionProfile({
    revision: contradictoryActive,
    twinRevisionHash: canonicalSha256(contradictoryActive),
    profile: {
      schemaVersion: "local_projection_profile_input.v1",
      workspaceName: "Contradictory active Reflection",
      openTo: "A corrected Reflection with a successor cannot still govern public wording.",
      preparedAt: new Date().toISOString(),
    },
  }), /verified current or rolled-back R3 effect/u);
  const clockRollback = structuredClone(lineageTwin);
  const clockRecord = clockRollback.agency.proposals[0];
  const clockRuntime = clockRollback.agency.runtimeReceipts.find((item) => item.receiptId === clockRecord?.runtimeReceiptId);
  if (!clockRecord || !clockRuntime) throw new Error("fixture lost its runtime lineage");
  clockRecord.createdAt = "2026-08-09T09:59:59.000Z";
  clockRuntime.completedAt = clockRecord.createdAt;
  assert.doesNotThrow(() => compileLocalProjectionProfile({
    revision: clockRollback,
    twinRevisionHash: canonicalSha256(clockRollback),
    profile: {
      schemaVersion: "local_projection_profile_input.v1",
      workspaceName: "Clock rollback Twin",
      openTo: "Revision authority, not wall-clock monotonicity, proves this causal order.",
      preparedAt: new Date().toISOString(),
    },
  }));
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: lineageFixture.workspace,
    openTo: "Unsafe terminal control \u009b31m must be rejected.",
  }), /unsafe terminal control character/u);
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: lineageFixture.workspace,
    openTo: "Arabic Letter Mark \u061c must not reorder exact review text.",
  }), /unsafe terminal control character/u);
});

test("#66 recovers candidate and approval staging without inventing partial Owner approval", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const prepareFaults: LocalProjectionPrepareFault[] = [
    "after_candidate_manifest",
    "after_candidate_stage",
    "after_current_stage",
    "after_candidate_commit",
    "after_current_commit",
  ];
  for (const [index, faultAt] of prepareFaults.entries()) {
    const openTo = `Fault recovery wording ${index + 1}.`;
    const now = currentTime(index * 10_000);
    assert.throws(() => prepareLocalProjection({ workspaceRoot: fixture.workspace, openTo, now, faultAt }), /injected failure/u);
    const recovered = prepareLocalProjection({ workspaceRoot: fixture.workspace, openTo, now });
    assert.equal(recovered.status, "READY_FOR_OWNER_REVIEW");
    assert.equal(recovered.approval, null);
  }

  const staleLockOpenTo = "Recover a complete candidate after a simulated hard process exit.";
  const staleLockNow = currentTime(55_000);
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: staleLockOpenTo,
    now: staleLockNow,
    faultAt: "after_candidate_stage",
  }), /injected failure/u);
  const lockPath = join(fixture.workspace, ".forme", "r4", "projections", "LOCK");
  const deadWriter = spawnSync(process.execPath, ["-e", [
    "const fs=require('node:fs');",
    "const path=process.argv[1];",
    "const fd=fs.openSync(path,'wx',0o600);",
    "fs.writeFileSync(fd,String(process.pid)+'\\n');",
    "fs.fsyncSync(fd);fs.closeSync(fd);",
    "process.stdout.write(String(process.pid));",
    "process.exit(0);",
  ].join(""), lockPath], { encoding: "utf8" });
  assert.equal(deadWriter.status, 0, deadWriter.stderr);
  const deadPid = Number.parseInt(deadWriter.stdout, 10);
  assert.throws(() => previewLocalProjection({ workspaceRoot: fixture.workspace }), /projection recover --lock-pid/u);
  const cliRecovery = execFileSync(process.execPath, [
    "--import", "./scripts/deny-external-network.mjs", "src/cli.ts", "projection", "recover",
    "--workspace", fixture.workspace, "--lock-pid", String(deadPid),
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    env: { ...process.env, FORME_DENY_NETWORK: "1" },
  });
  assert.match(cliRecovery, /READY_FOR_OWNER_REVIEW/u);
  const recoveredAfterHardExit = previewLocalProjection({ workspaceRoot: fixture.workspace, now: staleLockNow });
  assert.equal(recoveredAfterHardExit?.status, "READY_FOR_OWNER_REVIEW");
  assert.equal(recoveredAfterHardExit?.candidate.input.openTo, staleLockOpenTo);
  const reviewRoot = join(fixture.workspace, ".forme", "r4", "projections");
  assert.equal(existsSync(join(reviewRoot, "LOCK")), false);
  assert.equal(existsSync(join(reviewRoot, "LOCK.recovery")), false);
  assert.equal(existsSync(join(reviewRoot, ".current.json.stage")), false);
  assert.equal(readdirSync(join(reviewRoot, "candidates")).some((name) => name.endsWith(".stage")), false);
  assert.equal(readdirSync(join(reviewRoot, "approvals")).some((name) => name.endsWith(".stage")), false);

  writeFileSync(lockPath, `${process.pid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  const liveBefore = { body: readFileSync(lockPath, "utf8"), stat: statSync(lockPath) };
  assert.throws(() => recoverLocalProjectionReview({
    workspaceRoot: fixture.workspace,
    expectedLockPid: process.pid,
  }), /still active/u);
  const liveAfter = statSync(lockPath);
  assert.equal(readFileSync(lockPath, "utf8"), liveBefore.body);
  assert.deepEqual([liveAfter.dev, liveAfter.ino], [liveBefore.stat.dev, liveBefore.stat.ino]);
  unlinkSync(lockPath);

  writeFileSync(lockPath, `${deadPid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  const mismatchBefore = { body: readFileSync(lockPath, "utf8"), stat: statSync(lockPath) };
  assert.throws(() => recoverLocalProjectionReview({
    workspaceRoot: fixture.workspace,
    expectedLockPid: deadPid + 1_000_000,
  }), /does not match the stale lock/u);
  const mismatchAfter = statSync(lockPath);
  assert.equal(readFileSync(lockPath, "utf8"), mismatchBefore.body);
  assert.deepEqual([mismatchAfter.dev, mismatchAfter.ino], [mismatchBefore.stat.dev, mismatchBefore.stat.ino]);
  unlinkSync(lockPath);

  const candidate = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Approval crash recovery wording.",
    now: currentTime(60_000),
  });
  const confirmation = `APPROVE ${candidate.candidate.manifest.reviewHash}`;
  const approvalFaults: LocalProjectionApprovalFault[] = ["after_approval_file", "after_approval_stage", "after_approval_commit"];
  for (const [index, faultAt] of approvalFaults.entries()) {
    if (index > 0) {
      const next = prepareLocalProjection({
        workspaceRoot: fixture.workspace,
        openTo: `Approval fault candidate ${index}.`,
        now: currentTime(70_000 + index * 10_000),
      });
      const nextConfirmation = `APPROVE ${next.candidate.manifest.reviewHash}`;
      assert.throws(() => approveLocalProjection({
        workspaceRoot: fixture.workspace,
        confirmation: nextConfirmation,
        now: currentTime(71_000 + index * 10_000),
        faultAt,
      }), /injected failure/u);
      const recovered = approveLocalProjection({
        workspaceRoot: fixture.workspace,
        confirmation: nextConfirmation,
        now: currentTime(71_000 + index * 10_000),
      });
      assert.equal(recovered.status, "APPROVED_CURRENT");
      continue;
    }
    assert.throws(() => approveLocalProjection({
      workspaceRoot: fixture.workspace,
      confirmation,
      now: currentTime(61_000),
      faultAt,
    }), /injected failure/u);
    const recovered = approveLocalProjection({
      workspaceRoot: fixture.workspace,
      confirmation,
      now: currentTime(61_000),
    });
    assert.equal(recovered.status, "APPROVED_CURRENT");
  }
});

test("#66 fails closed on immutable bundle tampering and an in-flight Twin transition", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const originalPreparedAt = currentTime(-1_000);
  const prepared = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Questions that preserve the current public boundary.",
    now: originalPreparedAt,
  });
  const replacement = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "A different current candidate that must remain selected after collision.",
    now: currentTime(),
  });
  const currentPointerPath = join(fixture.workspace, ".forme", "r4", "projections", "current.json");
  const currentPointerBefore = readFileSync(currentPointerPath);
  const capsulePath = join(
    fixture.workspace,
    ".forme", "r4", "projections", "candidates", prepared.candidate.manifest.candidateId, "capsule.json",
  );
  const capsule = JSON.parse(readFileSync(capsulePath, "utf8")) as Record<string, unknown>;
  writeFileSync(capsulePath, `${JSON.stringify({ ...capsule, title: "Tampered title" })}\n`, { mode: 0o600 });
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Questions that preserve the current public boundary.",
    now: originalPreparedAt,
  }), /payloadHash|binding mismatch/u);
  assert.deepEqual(readFileSync(currentPointerPath), currentPointerBefore);
  assert.equal(previewLocalProjection({ workspaceRoot: fixture.workspace }).candidate.manifest.candidateId, replacement.candidate.manifest.candidateId);

  const approvedFixture = makeR3Fixture();
  context.after(() => removeWorkspace(approvedFixture.workspace));
  const approvalCandidate = prepareLocalProjection({
    workspaceRoot: approvedFixture.workspace,
    openTo: "Questions about exact approval identity.",
    now: currentTime(-1_000),
  });
  const approved = approveLocalProjection({
    workspaceRoot: approvedFixture.workspace,
    confirmation: `APPROVE ${approvalCandidate.candidate.manifest.reviewHash}`,
    now: currentTime(),
  });
  if (!approved.approval) throw new Error("test approval missing");
  const approvalRoot = join(
    approvedFixture.workspace,
    ".forme", "r4", "projections", "approvals", approvalCandidate.candidate.manifest.candidateId,
  );
  const forgedApproval = { ...approved.approval.approval, approvalId: `approval_${"a".repeat(32)}` };
  const forgedReceipt = {
    ...approved.approval.receipt,
    approvalId: forgedApproval.approvalId,
    approvalSha256: canonicalSha256(forgedApproval),
    receiptId: `receipt_${canonicalSha256({ approval: forgedApproval, candidate: approvalCandidate.candidate.manifest }).slice(7, 39)}`,
  };
  writeFileSync(join(approvalRoot, "approval.json"), `${canonicalJson(forgedApproval)}\n`, { mode: 0o600 });
  writeFileSync(join(approvalRoot, "receipt.json"), `${canonicalJson(forgedReceipt)}\n`, { mode: 0o600 });
  assert.throws(() => previewLocalProjection({ workspaceRoot: approvedFixture.workspace }), /binding mismatch/u);

  const second = makeR3Fixture();
  context.after(() => removeWorkspace(second.workspace));
  const pending = join(second.workspace, ".forme", "pending-transition.json");
  writeFileSync(pending, "{}\n", { mode: 0o600 });
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: second.workspace,
    openTo: "This must not trigger hidden Twin recovery.",
  }), /in-flight transition/u);
  unlinkSync(pending);
  assert.equal(readdirSync(join(second.workspace, ".forme")).includes("r4"), true, "review root may exist but no candidate is committed");
  assert.equal(readdirSync(join(second.workspace, ".forme", "r4", "projections", "candidates")).length, 0);

  const symlinkFixture = makeR3Fixture();
  context.after(() => removeWorkspace(symlinkFixture.workspace));
  const revisions = join(symlinkFixture.workspace, ".forme", "revisions");
  const revisionsBackup = join(symlinkFixture.workspace, ".forme", "revisions-backup");
  renameSync(revisions, revisionsBackup);
  symlinkSync("revisions-backup", revisions, "dir");
  assert.throws(() => prepareLocalProjection({
    workspaceRoot: symlinkFixture.workspace,
    openTo: "Ancestor symlinks must not become Twin authority.",
  }), /Twin revision root is not one trusted 0700 directory/u);
});

test("#66 standalone schema validates every local record and its index pins exact schema bytes", (context) => {
  const fixture = makeR3Fixture();
  context.after(() => removeWorkspace(fixture.workspace));
  const prepared = prepareLocalProjection({
    workspaceRoot: fixture.workspace,
    openTo: "Schema-bound local review questions.",
    title: "项目".repeat(30),
    now: currentTime(-1_000),
  });
  const approved = approveLocalProjection({
    workspaceRoot: fixture.workspace,
    confirmation: `APPROVE ${prepared.candidate.manifest.reviewHash}`,
    now: currentTime(),
  });
  const protocolPath = resolve("schemas/r4/protocol.schema.json");
  const schemaPath = resolve("schemas/r4/local-projection-review.schema.json");
  const indexPath = resolve("schemas/r4/local-projection-review-index.json");
  const protocol = JSON.parse(readFileSync(protocolPath, "utf8")) as object;
  const schemaBytes = readFileSync(schemaPath);
  const schema = JSON.parse(schemaBytes.toString("utf8")) as object;
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaSha256: string;
    formatCount: number;
    formats: unknown[];
    localOnly: boolean;
    publicationAuthorized: boolean;
    roomMutationAuthorized: boolean;
  };
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(protocol);
  const validate = ajv.compile(schema);
  const records = [
    prepared.candidate.input,
    prepared.candidate.manifest,
    prepared.candidate.capsule,
    prepared.candidate.basis,
    approved.approval?.approval,
    approved.approval?.receipt,
    JSON.parse(readFileSync(join(fixture.workspace, ".forme", "r4", "projections", "current.json"), "utf8")),
  ];
  for (const record of records) {
    assert.equal(validate(record), true, ajv.errorsText(validate.errors));
  }
  assert.equal(index.schemaSha256, `sha256:${createHash("sha256").update(schemaBytes).digest("hex")}`);
  assert.equal(index.formatCount, index.formats.length);
  assert.equal(index.localOnly, true);
  assert.equal(index.publicationAuthorized, false);
  assert.equal(index.roomMutationAuthorized, false);
});
