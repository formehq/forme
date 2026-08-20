import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  canonicalJson,
  canonicalSha256,
  GOLDEN_INTERACTION,
  type InteractionV1,
  type SessionBudgetV1,
} from "../../r4-protocol/src/index.ts";
import type { TwinRevision } from "../../../src/types.ts";
import { assertBodyFree, sha256 } from "./body-free.ts";
import { SnapshotQueryBroker } from "./broker.ts";
import { assertCapabilityProbe, buildSyntheticCapabilityProbe, REQUIRED_DENIALS } from "./capability-probe.ts";
import {
  extractCandidateFromCompletedTurn,
  FakeResponseTransportGate,
  finalizeSyntheticFreshAdmission,
  SyntheticFreshAuthority,
  SyntheticHardCeilingTransportGate,
} from "./fresh-session.ts";
import { ProtectedRoomLock } from "./lock.ts";
import {
  authorizeFreshSessionStart,
  buildResponseOrientation,
  prepareResponseSession,
} from "./response-session.ts";
import { SyntheticFreshRuntimeStore } from "./runtime-cleanup.ts";
import { buildResponseSourceSnapshot } from "./snapshot.ts";
import type { FreshSessionEvent } from "./types.ts";

const CLOCK = new Date("2026-08-03T12:00:00.000Z");
const MODEL_ID = "synthetic-no-provider-model";
const OUTPUT_SCHEMA_HASH = sha256("response_candidate.v1:responseText-only");
const SESSION_BUDGET: SessionBudgetV1 = Object.freeze({
  wallClockSeconds: 600,
  providerDispatches: 1,
  inputTokens: 4_096,
  outputTokens: 1_024,
  spend: Object.freeze({ mode: "incremental", maximumUsd: 0 }),
});

export interface SyntheticFreshCandidateRehearsalResult {
  readonly schemaVersion: "r4.fresh_candidate_rehearsal.v1";
  readonly issue: 68;
  readonly verdict: "GREEN_CLEAN";
  readonly proofClass: "gate_a_repository_rehearsal";
  readonly syntheticOnly: true;
  readonly deterministicClock: string;
  readonly effects: {
    readonly providerCalls: 0;
    readonly networkCalls: 0;
    readonly connectorCalls: 0;
    readonly publicationCalls: 0;
    readonly realGuestRecords: 0;
  };
  readonly source: {
    readonly fileCount: number;
    readonly totalBytes: number;
    readonly policyHash: `sha256:${string}`;
    readonly manifestHash: `sha256:${string}`;
    readonly orientationHash: `sha256:${string}`;
  };
  readonly freshSession: {
    readonly sessionsStarted: 1;
    readonly resumedSessions: 0;
    readonly provider: "OpenAI";
    readonly modelId: typeof MODEL_ID;
    readonly upstreamEnabled: false;
    readonly syntheticDispatches: 1;
    readonly sessionEnvelopeHash: `sha256:${string}`;
    readonly startAuthorizationHash: `sha256:${string}`;
    readonly capabilityProbeHash: `sha256:${string}`;
    readonly deniedCapabilityCount: number;
    readonly budget: SessionBudgetV1;
  };
  readonly localReview: {
    readonly reviewCarrier: "gate_a_in_memory_analogue";
    readonly nativeCarrierInvoked: false;
    readonly decision: "synthetic_discard";
    readonly artifactHash: `sha256:${string}`;
    readonly artifactBytes: number;
    readonly sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed";
    readonly publicationAuthority: false;
    readonly handoffs: 0;
    readonly persistedArtifactBytes: 0;
  };
  readonly cleanup: {
    readonly runtimeBytesAfterTerminal: 0;
    readonly durableReceiptCount: 1;
    readonly durableReceiptsBodyFree: true;
    readonly temporaryRootExistsAfterReturn: false;
  };
  readonly aggregateHash: `sha256:${string}`;
}

function git(repositoryRoot: string, args: readonly string[]): void {
  execFileSync("/usr/bin/git", [...args], {
    cwd: repositoryRoot,
    stdio: "ignore",
    env: {
      PATH: "/usr/bin:/bin",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
      GIT_AUTHOR_DATE: CLOCK.toISOString(),
      GIT_COMMITTER_DATE: CLOCK.toISOString(),
      NODE_ENV: process.env.NODE_ENV ?? "test",
    },
  });
}

function createSyntheticRepository(root: string): string {
  const repositoryRoot = join(root, "admitted-repository");
  mkdirSync(join(repositoryRoot, "docs"), { recursive: true, mode: 0o700 });
  writeFileSync(join(repositoryRoot, "README.md"), [
    "# Synthetic Forme",
    "",
    "The Owner controls what becomes public.",
  ].join("\n"), { encoding: "utf8", mode: 0o600 });
  writeFileSync(join(repositoryRoot, "docs", "PRODUCT.md"), [
    "# Synthetic product state",
    "",
    "One bounded Guest question may produce one untrusted local draft.",
  ].join("\n"), { encoding: "utf8", mode: 0o600 });
  git(repositoryRoot, ["init", "--quiet", "--initial-branch=main"]);
  git(repositoryRoot, ["add", "--", "README.md", "docs/PRODUCT.md"]);
  git(repositoryRoot, [
    "-c", "user.name=Forme Synthetic Rehearsal",
    "-c", "user.email=synthetic@example.invalid",
    "commit", "--quiet", "--message=synthetic admitted source",
  ]);
  return repositoryRoot;
}

function syntheticTwin(): TwinRevision {
  return {
    schemaVersion: "1",
    workspaceId: "workspace_freshcandidate000000001",
    revision: 1,
    previousRevision: null,
    observedAt: CLOCK.toISOString(),
    workspaceContractHash: sha256("synthetic-fresh-candidate-workspace"),
    evidence: [],
    changes: { added: [], modified: [], deleted: [] },
    ownerFrame: {
      activeIntent: "Draft one bounded response without granting publication authority.",
      nextMove: "Review the exact untrusted artifact locally.",
      unresolved: ["What is the smallest useful next step?"],
    },
    warnings: [],
  };
}

function containsBytes(root: string, needle: Buffer): boolean {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) {
      if (containsBytes(absolute, needle)) return true;
      continue;
    }
    if (!entry.isFile() || statSync(absolute).size > 16 * 1_024 * 1_024) continue;
    if (readFileSync(absolute).includes(needle)) return true;
  }
  return false;
}

/**
 * Current #68 Gate A walking slice. It composes the real repository contracts
 * while keeping every effect synthetic: one fresh, non-resumed session; an
 * exact sanitized snapshot/orientation; one fake upstream-disabled dispatch;
 * an in-memory untrusted artifact; local synthetic discard; and exact cleanup.
 * It deliberately does not claim a native sandbox, user-presence ceremony, or
 * provider-backed call.
 */
export async function runSyntheticFreshCandidateRehearsal(): Promise<SyntheticFreshCandidateRehearsalResult> {
  const temporaryRoot = realpathSync(mkdtempSync(join(tmpdir(), "forme-r4-fresh-candidate-")));
  let preimage: Omit<SyntheticFreshCandidateRehearsalResult, "aggregateHash"> | null = null;
  try {
    const repositoryRoot = createSyntheticRepository(temporaryRoot);
    const snapshot = buildResponseSourceSnapshot(repositoryRoot, CLOCK);
    const twin = syntheticTwin();
    const twinHash = canonicalSha256(twin);
    const orientation = buildResponseOrientation({
      revision: twin,
      twinRevisionHash: twinHash,
      entityName: "Synthetic Forme",
      currentState: "One bounded synthetic Interaction awaits a local draft.",
      publicClaimSummary: ["The Owner controls what becomes public."],
      responseAiEligibleCorrectedReflectionIds: [],
      responseAiEligibleUnresolvedIndexes: [0],
    });
    const interaction: InteractionV1 = structuredClone(GOLDEN_INTERACTION);
    const preparedAt = new Date(CLOCK.getTime() + 1_000);
    const prepared = prepareResponseSession({
      interaction,
      orientation,
      snapshot,
      sessionEnvelopeId: "session_freshcandidate000000000001",
      modelId: MODEL_ID,
      budget: SESSION_BUDGET,
      outputSchemaHash: OUTPUT_SCHEMA_HASH,
      preparedAt,
      authorityExpiresAt: new Date(CLOCK.getTime() + 10 * 60 * 1_000),
    });

    const probe = buildSyntheticCapabilityProbe({
      adapter: "synthetic-fresh-candidate-no-process",
      runtimeVersion: "r4-fresh-candidate-rehearsal.v1",
      probedAt: new Date(CLOCK.getTime() + 1_500).toISOString(),
    });
    assertCapabilityProbe(probe);
    const start = authorizeFreshSessionStart({
      prepared,
      expectedSessionEnvelopeHash: prepared.sessionEnvelopeHash,
      expectedOrientationHash: orientation.contentHash,
      expectedSnapshotManifestHash: snapshot.manifest.manifestHash,
      capabilityProbeHash: probe.bodyFreeEvidenceHash,
      runtimePolicyHash: probe.runtimePolicy.policyHash,
      ownerPresenceConfirmed: true,
      reviewedAt: new Date(CLOCK.getTime() + 2_000),
    });

    const threadId = "thread_freshcandidate000000000001";
    const turnId = "turn_freshcandidate0000000000001";
    const responseText = "Synthetic Fresh draft: take one small reversible step, then review the result before sharing.";
    const events: FreshSessionEvent[] = [
      { type: "thread_started", threadId, turnId: null, provider: "OpenAI", model: MODEL_ID },
      { type: "turn_started", threadId, turnId, provider: "OpenAI", model: MODEL_ID },
      {
        type: "item_completed",
        threadId,
        turnId,
        provider: "OpenAI",
        model: MODEL_ID,
        item: {
          itemType: "agent_message",
          phase: "final_answer",
          text: canonicalJson({ responseText }),
        },
      },
      { type: "turn_completed", threadId, turnId, provider: "OpenAI", model: MODEL_ID, turnStatus: "completed" },
    ];
    const payload = canonicalJson({
      interactionId: interaction.interactionId,
      exactText: interaction.requestText,
      orientation,
      sessionEnvelope: prepared.sessionEnvelope,
      snapshotManifestHash: snapshot.manifest.manifestHash,
    });
    const payloadHash = sha256(payload);

    const runtimeStore = new SyntheticFreshRuntimeStore({
      root: join(temporaryRoot, "protected-runtime"),
      workspaceRoot: repositoryRoot,
      lock: new ProtectedRoomLock({
        root: join(temporaryRoot, "protected-locks"),
        bootId: "synthetic-fresh-candidate-boot",
      }),
    });
    const runId = "run_freshcandidate000000000001";
    runtimeStore.begin({
      runId,
      roomId: interaction.roomId,
      interactionId: interaction.interactionId,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
      requestBytes: Buffer.from(payload, "utf8"),
      snapshotBytes: Buffer.from(canonicalJson({ manifest: snapshot.manifest, files: snapshot.files }), "utf8"),
      streamBytes: Buffer.from(canonicalJson(events), "utf8"),
      now: new Date(CLOCK.getTime() + 3_000),
      synthetic: true,
    });

    const authority = new SyntheticFreshAuthority();
    authority.addInteraction(interaction.interactionId);
    const cycle = authority.reserve({
      interactionId: interaction.interactionId,
      startAuthorizationHash: start.startAuthorizationHash,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
      idempotencyKey: "fresh_candidate_cycle_00000001",
      now: new Date(CLOCK.getTime() + 3_500),
    });
    const permit = authority.issuePermit({
      interactionId: interaction.interactionId,
      reservationId: cycle.reservationId,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
      provider: "OpenAI",
      modelId: MODEL_ID,
      payloadHash,
      dispatchOrdinal: 1,
      idempotencyKey: "fresh_candidate_permit_0000001",
      now: new Date(CLOCK.getTime() + 4_000),
    });
    const consumedPermit = authority.consumePermit({
      interactionId: interaction.interactionId,
      permitId: permit.permitId,
      payloadHash,
      now: new Date(CLOCK.getTime() + 4_500),
    });
    const fakeTransport = new FakeResponseTransportGate();
    fakeTransport.send({
      permit: consumedPermit,
      payload,
      provider: "OpenAI",
      modelId: MODEL_ID,
      inputTokens: 1_024,
      outputTokens: 32,
      applicableSpendUsd: 0,
    });

    const broker = new SnapshotQueryBroker(snapshot, new Uint8Array(32).fill(0x68));
    const hardTransport = new SyntheticHardCeilingTransportGate({
      modelId: MODEL_ID,
      cycleId: "cycle_freshcandidate00000000001",
      preparedAt,
      budget: SESSION_BUDGET,
      interactionId: interaction.interactionId,
      sessionEnvelopeId: prepared.sessionEnvelope.sessionEnvelopeId,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
      startAuthorizationHash: start.startAuthorizationHash,
      policyHash: snapshot.policy.policyHash,
      outputSchemaHash: OUTPUT_SCHEMA_HASH,
      snapshotBroker: broker,
    });
    const hardReservation = hardTransport.reserve({
      provider: "OpenAI",
      modelId: MODEL_ID,
      endpointClass: "openai_responses",
      automaticRetryAttempt: false,
      fallbackRequested: false,
      priorTerminalFailure: false,
      usageKnown: true,
      spendKnown: true,
      now: new Date(CLOCK.getTime() + 4_000),
      nextInputTokens: 1_024,
      nextMaxOutputTokens: 32,
      nextWorstCaseSpendUsd: 0,
      payloadHash,
      idempotencyKey: "fresh_candidate_dispatch_000001",
    });
    hardTransport.consume({
      reservationId: hardReservation.reservationId,
      payloadHash,
      now: new Date(CLOCK.getTime() + 4_500),
    });
    const query = broker.evaluate({
      schemaVersion: "snapshot_search.v1",
      pattern: "Owner controls",
      patternKind: "literal",
    });
    if (query.status !== "ok") throw new Error("synthetic Fresh source query failed closed");

    const admission = finalizeSyntheticFreshAdmission({
      transportGate: hardTransport,
      events,
      processExitCode: 0,
      observedOutputSchemaHash: OUTPUT_SCHEMA_HASH,
      snapshotBroker: broker,
      outputTokens: 32,
      applicableSpendUsd: 0,
      startedAt: new Date(CLOCK.getTime() + 3_000),
      completedAt: new Date(CLOCK.getTime() + 6_000),
      runtimeVersion: "r4-fresh-candidate-rehearsal.v1",
      expiresAt: new Date(CLOCK.getTime() + 7 * 24 * 60 * 60 * 1_000),
    });
    assertBodyFree(admission.sessionReceipt);
    const artifact = extractCandidateFromCompletedTurn({
      events,
      authorizedThreadId: threadId,
      authorizedTurnId: turnId,
      expectedProvider: "OpenAI",
      expectedModel: MODEL_ID,
      expectedOutputSchemaHash: OUTPUT_SCHEMA_HASH,
      admissionEvidence: admission,
      sessionEnvelope: prepared.sessionEnvelope,
      expectedSessionEnvelopeHash: prepared.sessionEnvelopeHash,
      currentInteraction: interaction,
      currentOriginStateAtCompilation: interaction.originStateAtAcceptance,
      currentTwinBasisHash: twinHash,
      currentPolicyHash: snapshot.policy.policyHash,
      admittedAt: new Date(CLOCK.getTime() + 7_000),
      expiresAt: new Date(CLOCK.getTime() + 24 * 60 * 60 * 1_000),
    });
    if (artifact.sourceDisclosureClass !== "fresh_native_sanitized_snapshot_owner_reviewed") {
      throw new Error("synthetic Fresh artifact disclosure class changed");
    }

    // Gate A review analogue: observe the exact hash once, choose discard, and
    // terminate authority. There is intentionally no candidate store or
    // publication port in this walking slice.
    const reviewedArtifactHash = artifact.candidateHash;
    authority.commitTerminal(interaction.interactionId, "synthetic_discard");
    if (authority.canPublish(interaction.interactionId)) throw new Error("discard retained publication authority");
    const cleanupReceipt = runtimeStore.terminate(runId, "normal", new Date(CLOCK.getTime() + 8_000));
    assertBodyFree(cleanupReceipt);
    if (runtimeStore.runtimeByteCount(runId) !== 0) throw new Error("Fresh runtime bytes survived cleanup");
    const runtimeStatus = runtimeStore.inspect();
    if (runtimeStatus.activeRunIds.length !== 0 || runtimeStatus.cleanupRequiredRunIds.length !== 0 || runtimeStatus.receiptCount !== 1) {
      throw new Error("Fresh runtime did not reach one clean terminal receipt");
    }
    if (containsBytes(temporaryRoot, Buffer.from(responseText, "utf8"))) {
      throw new Error("transient Fresh artifact bytes were persisted");
    }

    preimage = {
      schemaVersion: "r4.fresh_candidate_rehearsal.v1",
      issue: 68,
      verdict: "GREEN_CLEAN",
      proofClass: "gate_a_repository_rehearsal",
      syntheticOnly: true,
      deterministicClock: CLOCK.toISOString(),
      effects: {
        providerCalls: 0,
        networkCalls: 0,
        connectorCalls: 0,
        publicationCalls: 0,
        realGuestRecords: 0,
      },
      source: {
        fileCount: snapshot.manifest.fileCount,
        totalBytes: snapshot.manifest.totalBytes,
        policyHash: snapshot.policy.policyHash,
        manifestHash: snapshot.manifest.manifestHash,
        orientationHash: orientation.contentHash,
      },
      freshSession: {
        sessionsStarted: 1,
        resumedSessions: 0,
        provider: "OpenAI",
        modelId: MODEL_ID,
        upstreamEnabled: false,
        syntheticDispatches: fakeTransport.calls.length as 1,
        sessionEnvelopeHash: prepared.sessionEnvelopeHash,
        startAuthorizationHash: start.startAuthorizationHash,
        capabilityProbeHash: probe.bodyFreeEvidenceHash,
        deniedCapabilityCount: REQUIRED_DENIALS.length,
        budget: structuredClone(SESSION_BUDGET),
      },
      localReview: {
        reviewCarrier: "gate_a_in_memory_analogue",
        nativeCarrierInvoked: false,
        decision: "synthetic_discard",
        artifactHash: reviewedArtifactHash,
        artifactBytes: Buffer.byteLength(artifact.responseText, "utf8"),
        sourceDisclosureClass: artifact.sourceDisclosureClass,
        publicationAuthority: false,
        handoffs: 0,
        persistedArtifactBytes: 0,
      },
      cleanup: {
        runtimeBytesAfterTerminal: 0,
        durableReceiptCount: runtimeStatus.receiptCount as 1,
        durableReceiptsBodyFree: true,
        temporaryRootExistsAfterReturn: false,
      },
    };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  if (preimage === null || existsSync(temporaryRoot)) throw new Error("Fresh rehearsal exact cleanup was not proved");
  assertBodyFree(preimage);
  return { ...preimage, aggregateHash: canonicalSha256(preimage) };
}
