import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import test from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import {
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../../apps/room/src/synthetic-fixtures.ts";
import {
  createOfflineProjectionLogicalRehearsalPermit,
  OfflineRoomRehearsal,
} from "../../packages/r4-local/src/offline-room-rehearsal.ts";
import type { CoreRoomApiSecureInputV1 } from "../../packages/r4-local/src/hosted-room-api.ts";
import { canonicalJson, canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  approveLocalProjection,
  approveLocalRoomHandoff,
  assertPublishableLocalProjectionSourceReview,
  buildProjectionPublicationDeliveryV1,
  NON_PUBLISHABLE_HISTORICAL_SOURCE_REVIEW_SHA256,
  prepareLocalProjection,
  prepareLocalRoomHandoff,
  previewLocalRoomHandoff,
  recoverLocalRoomHandoff,
  type LocalRoomHandoffApprovalFault,
  type LocalRoomHandoffPrepareFault,
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
} from "../../src/store.ts";
import type {
  ActionContextPacket,
  ActionRuntimeProposalResult,
  ContextPacket,
  RuntimeProposalResult,
} from "../../src/types.ts";
import { signedProjectionDeliveryBody } from "./hosted-publication-helpers.ts";
import { removeRoot, temporaryRoot } from "./helpers.ts";
import { at, FIXED_WORKSPACE_ID, makeGitWorkspace, removeWorkspace } from "../helpers.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;
const PREPARED = new Date("2026-08-09T15:02:00.000Z");
const APPROVED = new Date("2026-08-09T15:03:00.000Z");
const SCHEDULED = new Date("2026-08-09T16:00:00.000Z");
const TARGET_ROOM = SYNTHETIC_PUBLIC_ROOM_ID;
const PRIVATE_CANARY = "ROOM_HANDOFF_PRIVATE_SOURCE_CANARY";
const START = "<!-- forme:r3-action:start -->";
const END = "<!-- forme:r3-action:end -->";

class FakeReflectionRuntime implements ReflectionRuntime {
  generate(packet: ContextPacket): RuntimeProposalResult {
    return {
      proposal: {
        schemaVersion: "1",
        proposalId: expectedProposalId(packet),
        baseTwinRevision: packet.baseTwinRevision,
        claim: "Owner review became an exercised control path before bounded action, and that narrow evidence must remain visible when public wording is prepared.",
        relationType: "trajectory",
        evidenceIds: packet.allowedEvidenceIds,
        uncertainty: { level: "medium", rationale: "This is one bounded project history." },
        alternativeExplanation: "The result may remain project-specific.",
        implication: "Public wording must preserve the Owner boundary.",
        ownerQuestion: "Is this narrow enough for a public Projection?",
      },
      cliVersion: "codex-cli local-room-handoff-test",
      model: "gpt-5.6-test",
      completedAt: "2026-08-09T09:00:00.000Z",
      audit: { eventCount: 4, itemTypes: ["agent_message"], toolEventCount: 0, turnCompleted: true, inputTokens: 20, outputTokens: 20 },
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
        rationale: "The corrected Reflection supports one reversible effect.",
        title: "Exercise one bounded effect",
        whyNow: "The project has corrected meaning.",
        nextMove: "Verify one exact reversible change.",
        successCheck: "The managed block is verified.",
        ownerChallenge: "Reject this if it exceeds the correction.",
      },
      cliVersion: "codex-cli local-room-handoff-test",
      model: "gpt-5.6-test",
      completedAt: "2026-08-09T11:00:00.000Z",
      audit: { eventCount: 4, itemTypes: ["agent_message"], toolEventCount: 0, turnCompleted: true, inputTokens: 20, outputTokens: 20 },
    };
  }
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

function makeApprovedProjection(): string {
  const workspace = realpathSync(makeGitWorkspace());
  mkdirSync(join(workspace, "docs"));
  writeFileSync(join(workspace, "README.md"), `# Fixture\n\n${PRIVATE_CANARY}\n\n${START}\n_No approved Forme action is currently applied._\n${END}\n`);
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was required.\n");
  const earlierCommit = commit(workspace, "record boundary");
  writeFileSync(join(workspace, "docs", "DECISIONS.md"), "# Decisions\n\nOwner review was exercised.\n");
  const laterCommit = commit(workspace, "exercise boundary");
  initWorkspace({
    workspaceRoot: workspace,
    name: "Forme handoff fixture",
    activeIntent: "Prove one controlled Room-bound Projection handoff.",
    nextMove: "Approve exact publication content without delivering it.",
    unresolved: ["Can a visitor understand the project without private sources?"],
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
    task: "Infer the bounded Owner-control change.",
  }, new FakeReflectionRuntime(), { now: at("2026-08-09T09:01:00.000Z") }).observation.revision;
  if (reflected.schemaVersion !== "2") throw new Error("fixture did not reach R2");
  const reflection = reflected.cognition.reflections[0];
  if (!reflection) throw new Error("fixture has no Reflection");
  correctReflection(workspace, reflection.reflectionId, "Owner review is proven here, but no local approval may silently become publication authority.", {
    now: at("2026-08-09T10:00:00.000Z"),
  });
  const proposed = runActionProposal(workspace, "Exercise one reversible effect.", new FakeActionRuntime(), {
    now: at("2026-08-09T11:01:00.000Z"),
  }).observation.revision;
  if (proposed.schemaVersion !== "3") throw new Error("fixture did not reach R3");
  const proposal = proposed.agency.proposals[0];
  if (!proposal?.effectPlanHash) throw new Error("fixture has no effect plan");
  const actionApproval = approveAction(workspace, proposal.proposal.proposalId, proposal.effectPlanHash, {
    now: at("2026-08-09T12:00:00.000Z"),
  }).revision;
  if (actionApproval.schemaVersion !== "3") throw new Error("fixture did not approve R3");
  const actionApprovalId = actionApproval.agency.approvals[0]?.approvalId;
  if (!actionApprovalId) throw new Error("fixture has no action approval");
  const effect = executeAction(workspace, actionApprovalId, { now: at("2026-08-09T13:00:00.000Z") });
  rollbackAction(workspace, effect.receipt.receiptId, { now: at("2026-08-09T14:00:00.000Z") });
  const local = prepareLocalProjection({
    workspaceRoot: workspace,
    ownerWording: {
      becoming: ["A project can keep meaning while its Owner is away."],
      now: ["The first three Twin capabilities are already Owner-accepted."],
      nextMove: ["Prove one controlled Presence handoff."],
      tensions: ["Enough public context must not expose private project sources."],
      openTo: ["Questions about the Forme vision and bounded Presence."],
      boundary: {
        supportedInteractions: ["ask", "resonance"],
        allowedTopics: ["Forme vision", "controlled Presence"],
        unavailableTopics: ["private Twin sources", "Owner commitments"],
        expectedResponseLatency: "Asynchronous and Owner-reviewed.",
        agencyStatement: "This Projection cannot act for the Owner.",
        nonCommitmentStatement: "A question grants no access, promise, or publication authority.",
      },
    },
    title: "Forme — Living Project Twin",
    summary: "Long-lived project meaning without an AI substitute for the Owner.",
    now: new Date("2026-08-09T15:00:00.000Z"),
  });
  approveLocalProjection({
    workspaceRoot: workspace,
    confirmation: `APPROVE ${local.candidate.manifest.reviewHash}`,
    now: new Date("2026-08-09T15:01:00.000Z"),
  });
  return workspace;
}

test("#67 slice A rebinds approved wording and exact approval remains delivery-free under deny-network", async (context) => {
  const workspace = makeApprovedProjection();
  context.after(() => removeWorkspace(workspace));
  const source = prepareLocalProjection({
    workspaceRoot: workspace,
    ownerWording: {
      becoming: ["A project can keep meaning while its Owner is away."],
      now: ["The first three Twin capabilities are already Owner-accepted."],
      nextMove: ["Prove one controlled Presence handoff."],
      tensions: ["Enough public context must not expose private project sources."],
      openTo: ["Questions about the Forme vision and bounded Presence."],
      boundary: {
        supportedInteractions: ["ask", "resonance"],
        allowedTopics: ["Forme vision", "controlled Presence"],
        unavailableTopics: ["private Twin sources", "Owner commitments"],
        expectedResponseLatency: "Asynchronous and Owner-reviewed.",
        agencyStatement: "This Projection cannot act for the Owner.",
        nonCommitmentStatement: "A question grants no access, promise, or publication authority.",
      },
    },
    title: "Forme — Living Project Twin",
    summary: "Long-lived project meaning without an AI substitute for the Owner.",
    now: PREPARED,
  });
  assert.equal(source.status, "APPROVED_CURRENT");

  const prepared = prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  assert.equal(prepared.status, "READY_FOR_OWNER_REVIEW");
  assert.equal(prepared.candidate.targetRoomId, TARGET_ROOM);
  assert.equal(prepared.candidate.scheduledPublishedAt, SCHEDULED.toISOString());
  assert.equal(prepared.candidate.draft.capsule.publishedAt, SCHEDULED.toISOString());
  assert.notEqual(prepared.candidate.projectionId, source.candidate.manifest.projectionId);
  assert.notEqual(prepared.candidate.basisId, source.candidate.basis.basisId);
  assert.notEqual(prepared.candidate.publicationAttestationId, source.candidate.capsule.publicationAttestationId);
  assert.notEqual(prepared.candidate.ownerDecisionId, source.candidate.basis.ownerDecisionId);
  assert.notEqual(prepared.candidate.draft.basis.projectionPolicyHash, source.candidate.basis.projectionPolicyHash);
  assert.notEqual(prepared.candidate.preparedAt, source.candidate.manifest.preparedAt);
  assert.notEqual(prepared.candidate.payloadHash, source.candidate.manifest.payloadHash);
  assert.notEqual(prepared.candidate.basisHash, source.candidate.manifest.basisHash);
  assert.notEqual(prepared.candidate.reviewHash, source.candidate.manifest.reviewHash);
  assert.equal(prepared.candidate.publicContentHash, prepared.candidate.source.publicContentHash);
  assert.deepEqual(prepared.candidate.draft.capsule.claims, source.candidate.capsule.claims);
  assert.deepEqual(prepared.candidate.draft.capsule.supportedInteractions, source.candidate.capsule.supportedInteractions);
  assert.deepEqual(prepared.candidate.draft.capsule.allowedTopics, source.candidate.capsule.allowedTopics);
  assert.deepEqual(prepared.candidate.draft.capsule.unavailableTopics, source.candidate.capsule.unavailableTopics);
  assert.match(prepared.preview, new RegExp(`APPROVE PUBLICATION ${prepared.candidate.reviewHash}`));
  assert.doesNotMatch(prepared.preview, new RegExp(PRIVATE_CANARY));
  assert.throws(() => approveLocalRoomHandoff({
    workspaceRoot: workspace,
    confirmation: `APPROVE PUBLICATION ${source.candidate.manifest.reviewHash}`,
    now: APPROVED,
  }), /exact displayed publication review hash/u);
  assert.throws(() => approveLocalRoomHandoff({
    workspaceRoot: workspace,
    confirmation: `APPROVE ${prepared.candidate.reviewHash}`,
    now: APPROVED,
  }), /exact displayed publication review hash/u);

  const approved = approveLocalRoomHandoff({
    workspaceRoot: workspace,
    confirmation: `APPROVE PUBLICATION ${prepared.candidate.reviewHash}`,
    now: APPROVED,
  });
  assert.equal(approved.status, "APPROVED_CURRENT");
  const bundle = approved.approval;
  assert.ok(bundle);
  assert.notEqual(bundle.approval.artifactApproval.approvalId, prepared.candidate.source.localContentApprovalId);
  assert.equal(bundle.approval.sourceLocalApprovalReused, false);
  assert.equal(bundle.approval.contentPublicationApproved, true);
  assert.equal(bundle.approval.deliveryAuthorized, false);
  assert.deepEqual([
    bundle.receipt.roomMutationCalls,
    bundle.receipt.networkCalls,
    bundle.receipt.providerCalls,
    bundle.receipt.hostBindingCalls,
    bundle.receipt.publicationCalls,
  ], [0, 0, 0, 0, 0]);
  assert.equal(bundle.receipt.contentPublicationApproved, true);
  assert.equal(bundle.receipt.deliveryAuthorized, false);
  assert.equal(previewLocalRoomHandoff({ workspaceRoot: workspace, now: new Date(APPROVED.getTime() + 1_000) }).status, "APPROVED_CURRENT");
  assert.equal(previewLocalRoomHandoff({ workspaceRoot: workspace, now: new Date(SCHEDULED.getTime() + 1) }).status, "APPROVED_CURRENT");

  const delivery = buildProjectionPublicationDeliveryV1({
    projection: approved.candidate.draft.capsule,
    basis: approved.candidate.draft.basis,
    approval: bundle.approval.artifactApproval,
    preflight: {
      artifactClass: "projection",
      observedAt: SCHEDULED.toISOString(),
      roomId: approved.candidate.targetRoomId,
      roomStatus: "active",
      projectionId: approved.candidate.projectionId,
      twinRevision: approved.candidate.twinRevision,
      twinRevisionHash: approved.candidate.twinRevisionHash,
      workspaceContractHash: approved.candidate.workspaceContractHash,
      projectionPolicyGeneration: approved.candidate.draft.basis.projectionPolicyGeneration,
      projectionPolicyHash: approved.candidate.draft.basis.projectionPolicyHash,
      payloadHash: approved.candidate.payloadHash,
      basisHash: approved.candidate.basisHash,
      currentHostedPayloadHash: null,
    },
    binding: {
      bindingId: `binding_${"8".repeat(32)}`,
      roomId: approved.candidate.targetRoomId,
      secret: new Uint8Array(32).fill(67),
      state: "current",
      expiresAt: new Date(Date.parse(approved.candidate.expiresAt) + 24 * 60 * 60 * 1_000).toISOString(),
    },
    attestationExpiresAt: bundle.approval.artifactApproval.expiresAt,
  });
  assert.equal(delivery.projection?.payloadHash, approved.candidate.payloadHash);
  assert.equal(delivery.attestation.artifactHash, approved.candidate.payloadHash);
  assert.equal(delivery.attestation.issuedAt, SCHEDULED.toISOString());
  assert.equal(delivery.attestation.roomId, approved.candidate.targetRoomId);

  const rehearsalParent = temporaryRoot("room-handoff-real-seam");
  context.after(() => removeRoot(rehearsalParent));
  const walkingSliceId = "slice_r4_room_handoff_real_seam_0001";
  const deliveryInput: CoreRoomApiSecureInputV1 = {
    schemaVersion: "forme.room.core-api-input.v1",
    pathParams: {},
    request: signedProjectionDeliveryBody({
      projection: approved.candidate.draft.capsule,
      basis: approved.candidate.draft.basis,
      approval: bundle.approval.artifactApproval,
      now: SCHEDULED.toISOString(),
    }),
    capability: {
      bearer: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
      syntheticActor: "room_operator",
      idempotencyKey: "67676767676767676767676767676767",
      expectedVersion: 1,
      syntheticClientBucket: null,
    },
  };
  const logicalRehearsalPermit = createOfflineProjectionLogicalRehearsalPermit({
    walkingSliceId,
    deliveryInput,
    approvedHandoff: {
      candidate: approved.candidate,
      approval: bundle,
    },
  });
  const rehearsal = await OfflineRoomRehearsal.open({
    root: join(rehearsalParent, "journal"),
    encryptionKey: Buffer.alloc(32, 67),
    now: SCHEDULED,
    rehearsalEnabled: true,
    walkingSliceId,
    seedEntityId: approved.candidate.draft.capsule.entityId,
  });
  const delivered = await rehearsal.mutate("room_operator.projection.deliver", deliveryInput, {
    projectionLogicalRehearsalPermit: logicalRehearsalPermit,
  });
  assert.equal(delivered.status, 201);
  const direct = await rehearsal.read("projection.read", {
    schemaVersion: "forme.room.core-api-input.v1",
    pathParams: { projectionId: approved.candidate.projectionId },
    request: {},
    capability: {
      bearer: null,
      syntheticActor: null,
      idempotencyKey: null,
      expectedVersion: null,
      syntheticClientBucket: null,
    },
  });
  const directProjection = (direct.body.view as { projection: { payloadHash: string; projectionId: string } }).projection;
  assert.equal(directProjection.projectionId, approved.candidate.projectionId);
  assert.equal(directProjection.payloadHash, approved.candidate.payloadHash);
  assert.equal(rehearsal.effectCounters().externalPublicationCalls, 0);

  const root = join(workspace, ".forme", "r4", "room-handoffs");
  assert.equal(statSync(root).mode & 0o777, 0o700);
  assert.equal(statSync(join(root, "candidates", `${prepared.candidate.handoffId}.json`)).mode & 0o777, 0o600);
  assert.equal(statSync(join(root, "approvals", prepared.candidate.handoffId)).mode & 0o777, 0o700);
  assert.equal(statSync(join(root, "approvals", prepared.candidate.handoffId, "approval.json")).mode & 0o777, 0o600);
  assert.equal(statSync(join(root, "approvals", prepared.candidate.handoffId, "receipt.json")).mode & 0o777, 0o600);
  const sourceCode = readFileSync(resolve("packages/r4-local/src/projection-room-handoff.ts"), "utf8");
  assert.doesNotMatch(sourceCode, /apps\/room|node:https|node:http|fetch\s*\(/u);
});

test("#67 schedule closes unapproved handoffs and the historical phase-only review is never publishable", (context) => {
  const workspace = makeApprovedProjection();
  context.after(() => removeWorkspace(workspace));
  assert.throws(() => prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: new Date(PREPARED),
    now: PREPARED,
  }), /future and no more than 24 hours/u);
  assert.throws(() => prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: new Date(PREPARED.getTime() + 24 * 60 * 60 * 1_000 + 1),
    now: PREPARED,
  }), /future and no more than 24 hours/u);
  assert.throws(() => prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: new Date(Number.NaN),
    now: PREPARED,
  }), /exact Date/u);

  const prepared = prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  assert.doesNotThrow(() => assertPublishableLocalProjectionSourceReview(prepared.candidate.source.reviewHash));
  assert.throws(
    () => assertPublishableLocalProjectionSourceReview(NON_PUBLISHABLE_HISTORICAL_SOURCE_REVIEW_SHA256),
    /non-publishable historical source/u,
  );
  assert.equal(previewLocalRoomHandoff({ workspaceRoot: workspace, now: SCHEDULED }).status, "READY_FOR_OWNER_REVIEW");
  const afterSchedule = new Date(SCHEDULED.getTime() + 1);
  assert.equal(previewLocalRoomHandoff({ workspaceRoot: workspace, now: afterSchedule }).status, "PUBLICATION_WINDOW_CLOSED");
  assert.throws(() => approveLocalRoomHandoff({
    workspaceRoot: workspace,
    confirmation: `APPROVE PUBLICATION ${prepared.candidate.reviewHash}`,
    now: afterSchedule,
  }), /not approvable:PUBLICATION_WINDOW_CLOSED/u);
});

test("#67 all seven durable fault points and explicit stale-lock recovery fail closed", () => {
  const prepareFaults: readonly LocalRoomHandoffPrepareFault[] = [
    "after_candidate_stage",
    "after_current_stage",
    "after_candidate_commit",
    "after_current_commit",
  ];
  for (const faultAt of prepareFaults) {
    const workspace = makeApprovedProjection();
    try {
      assert.throws(() => prepareLocalRoomHandoff({
        workspaceRoot: workspace,
        targetRoomId: TARGET_ROOM,
        scheduledPublishedAt: SCHEDULED,
        now: PREPARED,
        faultAt,
      }), /injected failure/u);
      const recovered = prepareLocalRoomHandoff({
        workspaceRoot: workspace,
        targetRoomId: TARGET_ROOM,
        scheduledPublishedAt: SCHEDULED,
        now: PREPARED,
      });
      assert.equal(recovered.status, "READY_FOR_OWNER_REVIEW", faultAt);
    } finally {
      removeWorkspace(workspace);
    }
  }

  const approvalFaults: readonly LocalRoomHandoffApprovalFault[] = [
    "after_approval_file",
    "after_approval_stage",
    "after_approval_commit",
  ];
  for (const faultAt of approvalFaults) {
    const workspace = makeApprovedProjection();
    try {
      const prepared = prepareLocalRoomHandoff({
        workspaceRoot: workspace,
        targetRoomId: TARGET_ROOM,
        scheduledPublishedAt: SCHEDULED,
        now: PREPARED,
      });
      assert.throws(() => approveLocalRoomHandoff({
        workspaceRoot: workspace,
        confirmation: `APPROVE PUBLICATION ${prepared.candidate.reviewHash}`,
        now: APPROVED,
        faultAt,
      }), /injected failure/u);
      const recovered = approveLocalRoomHandoff({
        workspaceRoot: workspace,
        confirmation: `APPROVE PUBLICATION ${prepared.candidate.reviewHash}`,
        now: APPROVED,
      });
      assert.equal(recovered.status, "APPROVED_CURRENT", faultAt);
    } finally {
      removeWorkspace(workspace);
    }
  }

  const workspace = makeApprovedProjection();
  try {
    const prepared = prepareLocalRoomHandoff({
      workspaceRoot: workspace,
      targetRoomId: TARGET_ROOM,
      scheduledPublishedAt: SCHEDULED,
      now: PREPARED,
    });
    assert.throws(() => recoverLocalRoomHandoff({
      workspaceRoot: workspace,
      expectedLockPid: 0,
      now: PREPARED,
    }), /exact positive lock PID/u);
    const deadPid = 2_000_000_000;
    assert.throws(() => recoverLocalRoomHandoff({
      workspaceRoot: workspace,
      expectedLockPid: deadPid,
      now: PREPARED,
    }), /no stale lock/u);
    const lock = join(workspace, ".forme", "r4", "room-handoffs", "LOCK");
    writeFileSync(lock, `${deadPid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    assert.throws(() => recoverLocalRoomHandoff({
      workspaceRoot: workspace,
      expectedLockPid: deadPid - 1,
      now: PREPARED,
    }), /does not match the stale lock/u);
    const recovered = recoverLocalRoomHandoff({
      workspaceRoot: workspace,
      expectedLockPid: deadPid,
      now: PREPARED,
    });
    assert.equal(recovered?.candidate.handoffId, prepared.candidate.handoffId);
    assert.equal(recovered?.status, "READY_FOR_OWNER_REVIEW");
  } finally {
    removeWorkspace(workspace);
  }
});

test("#67 slice A recovers staged writes, rejects stale Twin/time, tamper, and symlink substitution", (context) => {
  const recoveryWorkspace = makeApprovedProjection();
  context.after(() => removeWorkspace(recoveryWorkspace));
  const recovered = prepareLocalRoomHandoff({
    workspaceRoot: recoveryWorkspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  const recoveredApproval = approveLocalRoomHandoff({
    workspaceRoot: recoveryWorkspace,
    confirmation: `APPROVE PUBLICATION ${recovered.candidate.reviewHash}`,
    now: APPROVED,
  });
  assert.equal(recoveredApproval.status, "APPROVED_CURRENT");

  const staleWorkspace = makeApprovedProjection();
  context.after(() => removeWorkspace(staleWorkspace));
  const staleCandidate = prepareLocalRoomHandoff({
    workspaceRoot: staleWorkspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  observeWorkspace(staleWorkspace, {
    ownerFrame: { nextMove: "A new Twin requires a new Room handoff.", unresolved: ["A changed public question."] },
    now: at("2026-08-09T16:00:00.000Z"),
  });
  assert.equal(previewLocalRoomHandoff({ workspaceRoot: staleWorkspace, now: new Date("2026-08-09T16:01:00.000Z") }).status, "STALE_TWIN");
  assert.throws(() => approveLocalRoomHandoff({
    workspaceRoot: staleWorkspace,
    confirmation: `APPROVE PUBLICATION ${staleCandidate.candidate.reviewHash}`,
    now: new Date("2026-08-09T16:02:00.000Z"),
  }), /not approvable:STALE_TWIN/u);
  assert.equal(previewLocalRoomHandoff({
    workspaceRoot: recoveryWorkspace,
    now: new Date(recovered.candidate.freshUntil),
  }).status, "APPROVED_STALE_TIME");

  const tamperWorkspace = makeApprovedProjection();
  context.after(() => removeWorkspace(tamperWorkspace));
  const tamper = prepareLocalRoomHandoff({
    workspaceRoot: tamperWorkspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  const candidatePath = join(tamperWorkspace, ".forme", "r4", "room-handoffs", "candidates", `${tamper.candidate.handoffId}.json`);
  const changed = JSON.parse(readFileSync(candidatePath, "utf8")) as Record<string, unknown>;
  changed.deliveryAuthorized = true;
  writeFileSync(candidatePath, `${canonicalJson(changed)}\n`, "utf8");
  chmodSync(candidatePath, 0o600);
  assert.throws(() => previewLocalRoomHandoff({ workspaceRoot: tamperWorkspace, now: APPROVED }), /candidate is invalid|binding mismatch/u);

  const symlinkWorkspace = makeApprovedProjection();
  context.after(() => removeWorkspace(symlinkWorkspace));
  const symlink = prepareLocalRoomHandoff({
    workspaceRoot: symlinkWorkspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  const symlinkPath = join(symlinkWorkspace, ".forme", "r4", "room-handoffs", "candidates", `${symlink.candidate.handoffId}.json`);
  const retainedPath = `${symlinkPath}.retained`;
  renameSync(symlinkPath, retainedPath);
  symlinkSync(retainedPath, symlinkPath);
  assert.equal(lstatSync(symlinkPath).isSymbolicLink(), true);
  assert.throws(() => previewLocalRoomHandoff({ workspaceRoot: symlinkWorkspace, now: APPROVED }), /not one owned 0600 regular file/u);
});

test("#67 slice A schema validates persisted records and index pins exact schema bytes", (context) => {
  const workspace = makeApprovedProjection();
  context.after(() => removeWorkspace(workspace));
  const prepared = prepareLocalRoomHandoff({
    workspaceRoot: workspace,
    targetRoomId: TARGET_ROOM,
    scheduledPublishedAt: SCHEDULED,
    now: PREPARED,
  });
  const approved = approveLocalRoomHandoff({
    workspaceRoot: workspace,
    confirmation: `APPROVE PUBLICATION ${prepared.candidate.reviewHash}`,
    now: APPROVED,
  });
  const protocol = JSON.parse(readFileSync(resolve("schemas/r4/protocol.schema.json"), "utf8")) as object;
  const schemaBytes = readFileSync(resolve("schemas/r4/local-room-handoff.schema.json"));
  const schema = JSON.parse(schemaBytes.toString("utf8")) as object;
  const index = JSON.parse(readFileSync(resolve("schemas/r4/local-room-handoff-index.json"), "utf8")) as {
    schemaSha256: string;
    formatCount: number;
    formats: unknown[];
    localOnly: boolean;
    contentPublicationApprovalOnly: boolean;
    deliveryAuthorized: boolean;
    roomMutationCalls: number;
    networkCalls: number;
    providerCalls: number;
    hostBindingCalls: number;
    publicationCalls: number;
  };
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(protocol);
  const validate = ajv.compile(schema);
  const root = join(workspace, ".forme", "r4", "room-handoffs");
  const records = [
    prepared.candidate,
    approved.approval?.approval,
    approved.approval?.receipt,
    JSON.parse(readFileSync(join(root, "current.json"), "utf8")),
  ];
  for (const record of records) assert.equal(validate(record), true, ajv.errorsText(validate.errors));
  assert.equal(index.schemaSha256, `sha256:${createHash("sha256").update(schemaBytes).digest("hex")}`);
  assert.equal(index.formatCount, index.formats.length);
  assert.equal(index.localOnly, true);
  assert.equal(index.contentPublicationApprovalOnly, true);
  assert.equal(index.deliveryAuthorized, false);
  assert.deepEqual([
    index.roomMutationCalls,
    index.networkCalls,
    index.providerCalls,
    index.hostBindingCalls,
    index.publicationCalls,
  ], [0, 0, 0, 0, 0]);
});
