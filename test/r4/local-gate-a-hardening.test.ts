import assert from "node:assert/strict";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertCapabilityProbe,
  assertSyntheticFreshRuntimePolicy,
  buildSyntheticCapabilityProbe,
  buildSyntheticFreshRuntimePolicy,
  candidateSessionReceipt,
  classifySyntheticSupervisorTerminal,
  createCandidateOwnerReviewPort,
  FakeIdempotentBoundaryPort,
  FileCandidateStore,
  GATE_A_FAULT_POINTS,
  GATE_A_FAULT_STEPS,
  ProtectedInteractionLeaseStore,
  ProtectedRoomLock,
  ProtectedRoomMutationCoordinator,
  REQUIRED_DENIALS,
  sha256,
  SnapshotQueryBroker,
  stableJson,
  SyntheticGateAFaultWorkflow,
  SyntheticHardCeilingTransportGate,
  SyntheticRestrictedRuntimeAdapter,
  SyntheticUserPresenceKeyProtector,
  type RoomMutationClass,
  type SessionBudget,
  type SyntheticFreshRuntimePolicyV1,
} from "../../packages/r4-local/src/index.ts";
import {
  candidate,
  INTERACTION_ID,
  NOW,
  ROOM_ID,
  removeRoot,
  syntheticSnapshot,
  temporaryRoot,
} from "./helpers.ts";

const MODEL = "synthetic-fixed-model";
const BUDGET: SessionBudget = {
  providerDispatches: 3,
  inputTokens: 128_000,
  outputTokens: 8_000,
  wallClockSeconds: 3_600,
  spend: { mode: "incremental", maximumUsd: 1 },
};
const TRANSPORT_BINDING = {
  interactionId: INTERACTION_ID,
  sessionEnvelopeId: "session_transporthardening000001",
  sessionEnvelopeHash: sha256("transport-envelope"),
  startAuthorizationHash: sha256("transport-start"),
  policyHash: sha256("transport-policy"),
  outputSchemaHash: sha256("transport-schema"),
} as const;

test("F01/F02/F05 synthetic probe enumerates every denial and pins one bounded data tool plus optional inert coordination", () => {
  const result = buildSyntheticCapabilityProbe({
    adapter: "synthetic-gate-a-adapter",
    runtimeVersion: "0.0.0-offline",
    probedAt: NOW.toISOString(),
    includeInertCoordinationTool: true,
  });
  assert.doesNotThrow(() => assertCapabilityProbe(result));
  assert.deepEqual(result.attempts.map((attempt) => attempt.name), REQUIRED_DENIALS);
  assert.equal(new Set(result.attempts.map((attempt) => attempt.name)).size, REQUIRED_DENIALS.length);
  assert.deepEqual(result.modelCallableTools, ["SnapshotQueryBrokerV1", "update_plan_inert"]);
  const broker = result.runtimePolicy.modelCallableTools.find((tool) => tool.name === "SnapshotQueryBrokerV1");
  const inert = result.runtimePolicy.modelCallableTools.find((tool) => tool.name === "update_plan_inert");
  assert.equal(broker?.class, "snapshot_data");
  assert.equal(broker?.snapshotRead, true);
  assert.deepEqual(inert, {
    name: "update_plan_inert",
    class: "inert_coordination",
    snapshotRead: false,
    filesystemWrite: false,
    commandExecution: false,
    interpreterExecution: false,
    environmentRead: false,
    network: false,
    browserMcpApp: false,
    connector: false,
    publication: false,
    candidateFieldContribution: "none",
  });

  const duplicateAttempt = structuredClone(result);
  duplicateAttempt.attempts.push(structuredClone(duplicateAttempt.attempts[0]!));
  assert.throws(() => assertCapabilityProbe(duplicateAttempt), /probe_vector_count/u);
  const missingAttempt = structuredClone(result);
  missingAttempt.attempts = missingAttempt.attempts.slice(1);
  assert.throws(() => assertCapabilityProbe(missingAttempt), /probe_vector_count/u);
  assert.throws(() => assertCapabilityProbe({ ...result, bodyFreeEvidenceHash: sha256("tampered") }), /evidence_hash_mismatch/u);
  const duplicateBroker = structuredClone(result);
  duplicateBroker.modelCallableTools = ["SnapshotQueryBrokerV1", "SnapshotQueryBrokerV1"];
  duplicateBroker.bodyFreeEvidenceHash = sha256(stableJson({
    adapter: duplicateBroker.adapter,
    runtimeVersion: duplicateBroker.runtimeVersion,
    syntheticOnly: duplicateBroker.syntheticOnly,
    denied: duplicateBroker.denied,
    attempts: duplicateBroker.attempts,
    modelCallableTools: duplicateBroker.modelCallableTools,
    runtimePolicy: duplicateBroker.runtimePolicy,
    toolChecks: duplicateBroker.toolChecks,
  }));
  assert.throws(() => assertCapabilityProbe(duplicateBroker), /tool_inventory_mismatch/u);
});

test("F01/F02 model-callable adapter delegates only typed queries to the manifest-backed bounded Broker", () => {
  const policy = buildSyntheticFreshRuntimePolicy({
    adapter: "synthetic-gate-a-adapter",
    runtimeVersion: "0.0.0-offline",
  });
  const broker = new SnapshotQueryBroker(syntheticSnapshot([
    { path: "README.md", text: "admitted line" },
    { path: "docs/large.md", text: "x".repeat(32 * 1_024 + 1) },
  ]), Buffer.alloc(32, 0x31));
  const adapter = new SyntheticRestrictedRuntimeAdapter({ policy, snapshotBroker: broker });
  const admitted = adapter.invokeTool("SnapshotQueryBrokerV1", {
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
  });
  assert.equal("resultText" in admitted ? admitted.resultText : null, "admitted line");
  const outside = adapter.invokeTool("SnapshotQueryBrokerV1", {
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "docs/not-in-manifest.md", lineStart: 1, lineEnd: 1,
  });
  assert.equal("status" in outside ? outside.status : null, "not_found");
  const oversized = adapter.invokeTool("SnapshotQueryBrokerV1", {
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "docs/large.md", lineStart: 1, lineEnd: 1,
  });
  assert.equal("status" in oversized ? oversized.status : null, "rejected");
  assert.throws(() => adapter.invokeTool("SnapshotQueryBrokerV1", {
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 201,
  }), /line read maximum/u);
  assert.deepEqual(adapter.counters(), { brokerCalls: 4, inertCalls: 0, effectCount: 0 });
});

test("F05 runtime policy rejects resumed, persistent, ambient, inherited, and effectful-tool variants", () => {
  const policy = buildSyntheticFreshRuntimePolicy({
    adapter: "synthetic-gate-a-adapter",
    runtimeVersion: "0.0.0-offline",
    includeInertCoordinationTool: true,
  });
  assert.doesNotThrow(() => assertSyntheticFreshRuntimePolicy(policy));

  for (const mutate of [
    (value: Record<string, unknown>) => { value.resumeAllowed = true; },
    (value: Record<string, unknown>) => { value.ephemeral = false; },
    (value: Record<string, unknown>) => { value.inheritedEnvironment = "all"; },
    (value: Record<string, unknown>) => { value.approvalPolicy = "on-request"; },
  ]) {
    const changed = structuredClone(policy) as unknown as Record<string, unknown>;
    mutate(changed);
    assert.throws(() => assertSyntheticFreshRuntimePolicy(changed as unknown as SyntheticFreshRuntimePolicyV1));
  }
  for (const ambient of Object.keys(policy.ambient) as Array<keyof typeof policy.ambient>) {
    const changed = structuredClone(policy) as unknown as { ambient: Record<string, boolean> };
    changed.ambient[ambient] = true;
    assert.throws(
      () => assertSyntheticFreshRuntimePolicy(changed as unknown as SyntheticFreshRuntimePolicyV1),
      /ambient_surface/u,
    );
  }
  const effectful = structuredClone(policy) as unknown as { modelCallableTools: Array<Record<string, unknown>> };
  const inert = effectful.modelCallableTools.find((tool) => tool.name === "update_plan_inert");
  if (!inert) throw new Error("missing synthetic inert tool fixture");
  inert.network = true;
  assert.throws(
    () => assertSyntheticFreshRuntimePolicy(effectful as unknown as SyntheticFreshRuntimePolicyV1),
    /effectful_tool/u,
  );
});

function hardDispatch(overrides: Partial<Parameters<SyntheticHardCeilingTransportGate["reserve"]>[0]> = {}) {
  return {
    provider: "OpenAI",
    modelId: MODEL,
    endpointClass: "openai_responses",
    automaticRetryAttempt: false,
    fallbackRequested: false,
    priorTerminalFailure: false,
    usageKnown: true,
    spendKnown: true,
    now: new Date(NOW.getTime() + 1_000),
    nextInputTokens: 40_000,
    nextMaxOutputTokens: 2_000,
    nextWorstCaseSpendUsd: 0.3,
    payloadHash: sha256("synthetic-never-sent-payload"),
    idempotencyKey: "dispatch_synthetic00000001",
    ...overrides,
  };
}

test("F10 fake transport enforces exact ceilings and has no retry, provider/model switch, fallback, or upstream", () => {
  const gate = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_synthetic00000001",
    preparedAt: NOW,
    budget: BUDGET,
    ...TRANSPORT_BINDING,
  });
  const first = gate.reserve(hardDispatch());
  assert.equal(first.dispatchOrdinal, 1);
  assert.deepEqual(gate.reserve(hardDispatch()), first, "exact retry returns the authority-owned reservation");
  gate.reserve(hardDispatch({ idempotencyKey: "dispatch_synthetic00000002", payloadHash: sha256("payload-2") }));
  const exact = gate.reserve(hardDispatch({
    idempotencyKey: "dispatch_synthetic00000003",
    payloadHash: sha256("payload-3"),
    nextInputTokens: 48_000,
    nextMaxOutputTokens: 4_000,
    nextWorstCaseSpendUsd: 0.4,
  }));
  assert.equal(exact.dispatchOrdinal, 3);
  assert.equal(exact.upstreamEnabled, false);
  assert.equal(gate.policy.automaticRetry, false);
  assert.equal(gate.policy.providerFallback, false);
  assert.equal(gate.policy.modelFallback, false);

  const denied: Array<[Partial<Parameters<typeof gate.reserve>[0]>, RegExp]> = [
    [{ idempotencyKey: "dispatch_synthetic00000004" }, /dispatch budget/u],
    [{ now: new Date(NOW.getTime() + 3_600_000) }, /wall budget/u],
    [{ provider: "Other" }, /switch denied/u],
    [{ modelId: "synthetic-other-model" }, /switch denied/u],
    [{ endpointClass: "other" }, /switch denied/u],
    [{ automaticRetryAttempt: true }, /retry\/fallback denied/u],
    [{ fallbackRequested: true }, /retry\/fallback denied/u],
    [{ priorTerminalFailure: true }, /retry\/fallback denied/u],
    [{ usageKnown: false }, /unknown usage\/spend denied/u],
    [{ spendKnown: false }, /unknown usage\/spend denied/u],
    [{ nextInputTokens: Number.NaN }, /unknown or invalid/u],
  ];
  for (const [overrides, pattern] of denied) {
    const isolated = new SyntheticHardCeilingTransportGate({
      modelId: MODEL,
      cycleId: "cycle_isolated0000000001",
      preparedAt: NOW,
      budget: BUDGET,
      ...TRANSPORT_BINDING,
    });
    if (overrides.idempotencyKey === "dispatch_synthetic00000004") {
      isolated.reserve(hardDispatch({ idempotencyKey: "dispatch_fill000000000001" }));
      isolated.reserve(hardDispatch({ idempotencyKey: "dispatch_fill000000000002" }));
      isolated.reserve(hardDispatch({ idempotencyKey: "dispatch_fill000000000003" }));
    }
    assert.throws(() => isolated.reserve(hardDispatch(overrides)), pattern);
  }
  assert.equal(gate.reservations.length, 3, "denied attempts create no fake dispatch reservation");
  const consumed = gate.consume({ reservationId: first.reservationId, payloadHash: first.payloadHash, now: new Date(NOW.getTime() + 2_000) });
  assert.equal(consumed.state, "consumed");
  assert.throws(() => gate.consume({ reservationId: first.reservationId, payloadHash: first.payloadHash, now: new Date(NOW.getTime() + 3_000) }), /already consumed/u);
  const restarted = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_synthetic00000001",
    preparedAt: NOW,
    budget: BUDGET,
    ...TRANSPORT_BINDING,
    restore: gate.exportJournal(),
  });
  assert.deepEqual(restarted.reserve(hardDispatch()), consumed, "restart preserves consumption and exact retry identity");
  assert.throws(() => restarted.reserve(hardDispatch({ nextInputTokens: 1 })), /idempotency conflict/u);
  assert.throws(() => new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_widened0000000001",
    preparedAt: NOW,
    budget: { ...BUDGET, providerDispatches: 4 },
    ...TRANSPORT_BINDING,
  }), /widens Packet/u);

  const notApplicableBudget: SessionBudget = { ...BUDGET, spend: { mode: "not_applicable", maximumUsd: null } };
  const notApplicable = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_notapplicable000001",
    preparedAt: NOW,
    budget: notApplicableBudget,
    ...TRANSPORT_BINDING,
  });
  assert.doesNotThrow(() => notApplicable.reserve(hardDispatch({
    nextWorstCaseSpendUsd: 0,
  })));
  assert.throws(() => notApplicable.reserve(hardDispatch({
    nextWorstCaseSpendUsd: 0,
    idempotencyKey: "dispatch_notapplicable0002",
    spendKnown: false,
  })), /unknown usage\/spend/u);
});

test("F10 authority bridge conservatively charges every Broker result byte to transport input", () => {
  const broker = new SnapshotQueryBroker(syntheticSnapshot([{ path: "README.md", text: "returned broker bytes" }]), Buffer.alloc(32, 7));
  broker.evaluate({ schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1 });
  const gate = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_brokeraccounting000001",
    preparedAt: NOW,
    budget: BUDGET,
    ...TRANSPORT_BINDING,
    snapshotBroker: broker,
  });
  gate.reserve(hardDispatch({ nextInputTokens: 1 }));
  assert.throws(() => gate.authorityOwnedSnapshotAccess(broker), /undercounts broker result bytes/u);
  assert.throws(
    () => gate.authorityOwnedSnapshotAccess(new SnapshotQueryBroker(syntheticSnapshot(), Buffer.alloc(32, 8))),
    /authority binding mismatch/u,
  );
});

test("F11 supervisor classifies kill/fork/huge-output and resulting receipt remains body/path-free", () => {
  const base = {
    wallMilliseconds: 1,
    cpuMilliseconds: 1,
    residentBytes: 1,
    processCount: 1,
    fileDescriptors: 1,
    combinedOutputBytes: 1,
    signal: "none" as const,
    schemaValid: true,
    budgetValid: true,
  };
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, signal: "kill" }), "process_kill");
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, processCount: 33 }), "fork_attempt");
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, combinedOutputBytes: 32 * 1_024 * 1_024 + 1 }), "huge_output");
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, wallMilliseconds: 60 * 60 * 1_000 }), "timeout");
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, schemaValid: false }), "schema_failure");
  assert.equal(classifySyntheticSupervisorTerminal({ ...base, budgetValid: false }), "budget");
  assert.equal(classifySyntheticSupervisorTerminal(base), "normal");
  assert.throws(() => classifySyntheticSupervisorTerminal({ ...base, processCount: -1 }), /observation invalid/u);

  const receipt = candidateSessionReceipt({
    interactionId: INTERACTION_ID,
    sessionEnvelopeId: "session_hardeningreceipt0000001",
    sessionEnvelopeHash: sha256("hardening-envelope"),
    provider: "OpenAI",
    modelId: MODEL,
    dispatches: 1,
    inputTokens: 10,
    outputTokens: 5,
    applicableSpendUsd: 0,
    policyHash: sha256("policy"),
    schemaHash: sha256("schema"),
    access: { queryCount: 1, resultCount: 1, resultBytes: 10, accessDigest: sha256("keyed-access") },
    startedAt: NOW,
    completedAt: new Date(NOW.getTime() + 1_000),
  });
  assert.doesNotMatch(JSON.stringify(receipt), /request|README|FORME_PRIVATE|sourcePath/u);
});

function candidateHarness() {
  const base = temporaryRoot("reverse-isolation");
  const workspace = join(base, "workspace");
  const protectedRoot = join(base, "protected-candidate");
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  const store = new FileCandidateStore({
    root: protectedRoot,
    workspaceRoot: workspace,
    protector: new SyntheticUserPresenceKeyProtector({
      presenceProof: "synthetic-owner-presence",
      wrappingKey: Buffer.alloc(32, 0x2a),
    }),
  });
  const review = createCandidateOwnerReviewPort({ store, confirmUserPresence: () => "synthetic-owner-presence" });
  return { base, workspace, protectedRoot, store, review };
}

test("F12 candidate API is reverse-isolated and terminal/basis denial precedes physical cleanup", async () => {
  const fixture = candidateHarness();
  try {
    const value = candidate({ responseText: "FORME_TEST_SYNTHETIC_CANDIDATE_BODY" });
    await fixture.store.put(value);
    assert.deepEqual(readdirSync(fixture.workspace), []);
    assert.equal("read" in fixture.store, false, "plaintext read is absent from the store's public API");
    assert.equal((await fixture.review.read({ candidateId: value.candidateId, now: NOW })).candidateHash, value.candidateHash);

    await fixture.store.deny(value.candidateId, "interaction_terminal", NOW);
    assert.equal(fixture.store.hasCiphertext(value.candidateId), true, "deny-first precedes byte removal");
    await assert.rejects(
      fixture.review.read({ candidateId: value.candidateId, now: NOW }),
      /candidate_unavailable/u,
    );
    await fixture.store.cleanup(value.candidateId, "interaction_terminal", new Date(NOW.getTime() + 1_000));
    assert.equal(fixture.store.hasCiphertext(value.candidateId), false);

    const second = candidate({ candidateId: "candidate_basisinvalidationsynthetic01", responseText: "Synthetic second candidate." });
    await fixture.store.put(second);
    assert.equal(await fixture.store.invalidateBasis({
      candidateId: second.candidateId,
      currentBasisHash: sha256("changed-basis"),
      currentPolicyHash: second.policyHash,
      currentSnapshotManifestHash: second.snapshotManifestHash,
      now: NOW,
    }), true);
    assert.equal(fixture.store.hasCiphertext(second.candidateId), true);
    await assert.rejects(
      fixture.review.read({ candidateId: second.candidateId, now: NOW }),
      /candidate_unavailable/u,
    );
  } finally {
    removeRoot(fixture.base);
  }
});

test("E01 every before/after persist, ACK, cursor, publication, and cleanup fault converges idempotently", async (t) => {
  assert.equal(GATE_A_FAULT_POINTS.length, GATE_A_FAULT_STEPS.length * 2);
  for (const [index, faultAt] of GATE_A_FAULT_POINTS.entries()) {
    await t.test(faultAt, async () => {
      const root = temporaryRoot(`fault-${index}`);
      const port = new FakeIdempotentBoundaryPort();
      const input = {
        root,
        operationId: `operation_syntheticfault${String(index).padStart(16, "0")}`,
        requestHash: sha256(`fault-${index}`),
        port,
      };
      const first = new SyntheticGateAFaultWorkflow(input);
      try {
        first.initializeSyntheticBody(Buffer.from("FORME_PRIVATE_GUEST_CANARY synthetic-only", "utf8"));
        await assert.rejects(first.run(faultAt), new RegExp(`interruption:${faultAt}`, "u"));

        const beforeInspectNames = readdirSync(root).sort();
        const beforeInspectBytes = new Map(beforeInspectNames.map((name) => [name, readFileSync(join(root, name))]));
        const beforeInspectMtime = new Map(beforeInspectNames.map((name) => [name, statSync(join(root, name), { bigint: true }).mtimeNs]));
        first.inspect();
        assert.deepEqual(readdirSync(root).sort(), beforeInspectNames, "read-only inspect creates no recovery write");
        for (const name of beforeInspectNames) {
          assert.deepEqual(readFileSync(join(root, name)), beforeInspectBytes.get(name));
          assert.equal(statSync(join(root, name), { bigint: true }).mtimeNs, beforeInspectMtime.get(name));
        }

        const restarted = new SyntheticGateAFaultWorkflow(input);
        await restarted.run();
        const status = restarted.inspect();
        assert.deepEqual(status.completedSteps, GATE_A_FAULT_STEPS);
        assert.equal(status.syntheticBodyPresent, false);
        assert.equal(status.bodyFreeArtifactCount, GATE_A_FAULT_STEPS.length);
        assert.equal(port.committedCount(), 2, "ACK and publication each commit exactly once");
        assert.equal(first.cleanupRemoveCount + restarted.cleanupRemoveCount, 1);
        const durable = readdirSync(root)
          .filter((name) => name.endsWith(".json"))
          .map((name) => readFileSync(join(root, name), "utf8"))
          .join("\n");
        assert.doesNotMatch(durable, /FORME_PRIVATE_GUEST_CANARY|synthetic-only/u);
      } finally {
        removeRoot(root);
      }
    });
  }
});

function coordinatorHarness(ownerState: "live" | "dead" | "ambiguous" = "live") {
  const root = temporaryRoot("coordinator");
  const lock = new ProtectedRoomLock({
    root: join(root, "room-locks"),
    bootId: "coordinator-boot",
    isProcessLive: () => ownerState,
  });
  const interactionLeases = new ProtectedInteractionLeaseStore({
    root: join(root, "interaction-leases"),
    bootId: "coordinator-boot",
    isProcessLive: () => ownerState,
  });
  const coordinator = new ProtectedRoomMutationCoordinator({
    lock,
    interactionLeases,
    replayRoot: join(root, "replay"),
  });
  return { root, lock, interactionLeases, coordinator };
}

test("E02 exact per-Room writer coordinator serializes every required operation pairing", async (t) => {
  const pairs: Array<[RoomMutationClass, RoomMutationClass]> = [
    ["room_sync", "room_sync"],
    ["room_sync", "room_reconcile"],
    ["response_prepare", "candidate_cleanup"],
    ["publication_submit", "candidate_cleanup"],
  ];
  for (const [firstClass, secondClass] of pairs) {
    await t.test(`${firstClass}/${secondClass}`, async () => {
      const fixture = coordinatorHarness();
      try {
        let release: (() => void) | undefined;
        const held = new Promise<void>((resolve) => { release = resolve; });
        const first = fixture.coordinator.run(ROOM_ID, firstClass, async () => await held, NOW);
        await assert.rejects(
          fixture.coordinator.run(ROOM_ID, secondClass, async () => undefined, NOW),
          /protected Room is busy:live/u,
        );
        const otherRoom = "room_synthetic00000002";
        await assert.doesNotReject(fixture.coordinator.run(otherRoom, secondClass, async () => undefined, NOW));
        release?.();
        await first;
      } finally {
        removeRoot(fixture.root);
      }
    });
  }
});

test("E02 same-Interaction preparation lease blocks cleanup while other Interactions remain independent", () => {
  const fixture = coordinatorHarness();
  try {
    const prepare = fixture.coordinator.beginInteractionOperation({
      roomId: ROOM_ID,
      interactionId: INTERACTION_ID,
      operationClass: "response_prepare",
      now: NOW,
    });
    assert.throws(() => fixture.coordinator.beginInteractionOperation({
      roomId: ROOM_ID,
      interactionId: INTERACTION_ID,
      operationClass: "candidate_cleanup",
      now: NOW,
    }), /protected Interaction is busy:live/u);
    const other = fixture.coordinator.beginInteractionOperation({
      roomId: ROOM_ID,
      interactionId: "interaction_synthetic00000002",
      operationClass: "candidate_cleanup",
      now: NOW,
    });
    other.release();
    prepare.release();
  } finally {
    removeRoot(fixture.root);
  }
});

test("E02 verified stale Room lock replays once; live and ambiguous ownership fail closed", async () => {
  const dead = coordinatorHarness("dead");
  try {
    dead.lock.acquire(ROOM_ID, "room_sync", NOW);
    let replayCommits = 0;
    const stable = new Map<string, string>();
    const replay = async (key: string) => {
      if (!stable.has(key)) {
        stable.set(key, `receipt_${sha256(key).slice(7, 39)}`);
        replayCommits += 1;
      }
      return { receiptId: stable.get(key)! };
    };
    const input = {
      roomId: ROOM_ID,
      journalId: "journal_syntheticstale00000001",
      journalHash: sha256("stale-journal"),
      now: new Date(NOW.getTime() + 1_000),
      replay,
    };
    const first = await dead.coordinator.recoverStaleAndReplay(input);
    const second = await dead.coordinator.recoverStaleAndReplay(input);
    assert.equal(first.replayed, true);
    assert.equal(second.replayed, false);
    assert.equal(first.receipt.replayReceiptId, second.receipt.replayReceiptId);
    assert.equal(replayCommits, 1);
    assert.equal(dead.lock.inspect(ROOM_ID), null);
  } finally {
    removeRoot(dead.root);
  }

  for (const ownerState of ["live", "ambiguous"] as const) {
    const fixture = coordinatorHarness(ownerState);
    try {
      fixture.lock.acquire(ROOM_ID, "room_sync", NOW);
      await assert.rejects(fixture.coordinator.recoverStaleAndReplay({
        roomId: ROOM_ID,
        journalId: `journal_${ownerState}synthetic0000001`,
        journalHash: sha256(ownerState),
        now: NOW,
        replay: async () => { throw new Error("must not replay"); },
      }), new RegExp(`recovery denied:${ownerState}`, "u"));
    } finally {
      removeRoot(fixture.root);
    }
  }
});

test("E02 stale replay resumes dead locks after pending journal, callback loss, and durable receipt", async () => {
  for (const crashPoint of ["after_journal", "after_callback"] as const) {
    const fixture = coordinatorHarness("dead");
    try {
      fixture.lock.acquire(ROOM_ID, "room_sync", NOW);
      const commits = new Map<string, string>();
      let callbackCalls = 0;
      const input = {
        roomId: ROOM_ID,
        journalId: `journal_${crashPoint}synthetic000001`,
        journalHash: sha256(crashPoint),
        now: NOW,
        replay: async (key: string) => {
          callbackCalls += 1;
          if (crashPoint === "after_journal" && callbackCalls === 1) throw new Error("crash after journal");
          const receiptId = commits.get(key) ?? `receipt_${sha256(key).slice(7, 39)}`;
          commits.set(key, receiptId);
          if (crashPoint === "after_callback" && callbackCalls === 1) throw new Error("lost callback response");
          return { receiptId };
        },
      };
      await assert.rejects(fixture.coordinator.recoverStaleAndReplay(input), /crash|lost/u);
      fixture.lock.acquire(ROOM_ID, "room_sync", new Date(NOW.getTime() + 1_000));
      const recovered = await fixture.coordinator.recoverStaleAndReplay({ ...input, now: new Date(NOW.getTime() + 2_000) });
      assert.equal(recovered.replayed, true);
      assert.equal(commits.size, 1);

      // Simulate machine death after the durable receipt but before the old
      // lease released. Receipt recovery must not invoke callback again.
      fixture.lock.acquire(ROOM_ID, "room_sync", new Date(NOW.getTime() + 3_000));
      const before = callbackCalls;
      const receiptOnly = await fixture.coordinator.recoverStaleAndReplay({ ...input, now: new Date(NOW.getTime() + 4_000) });
      assert.equal(receiptOnly.replayed, false);
      assert.equal(callbackCalls, before);
    } finally {
      removeRoot(fixture.root);
    }
  }
});

test("E02 stale replay journal and receipt reject every unknown persisted field", async () => {
  const pending = coordinatorHarness("dead");
  try {
    const journalId = "journal_strictpendingsynthetic01";
    const journalHash = sha256("strict-pending");
    pending.lock.acquire(ROOM_ID, "room_sync", NOW);
    await assert.rejects(pending.coordinator.recoverStaleAndReplay({
      roomId: ROOM_ID,
      journalId,
      journalHash,
      now: NOW,
      replay: async () => { throw new Error("leave pending journal"); },
    }), /leave pending journal/u);
    const journalPath = join(pending.root, "replay", `${ROOM_ID}--${journalId}.json.pending`);
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Record<string, unknown>;
    writeFileSync(journalPath, `${JSON.stringify({ ...journal, harmless: "must-not-survive" })}\n`, "utf8");
    await assert.rejects(pending.coordinator.recoverStaleAndReplay({
      roomId: ROOM_ID,
      journalId,
      journalHash,
      now: new Date(NOW.getTime() + 1_000),
      replay: async () => ({ receiptId: "receipt_mustnotbereached00001" }),
    }), /stale replay journal binding conflict/u);
  } finally {
    removeRoot(pending.root);
  }

  const completed = coordinatorHarness("dead");
  try {
    const journalId = "journal_strictreceiptsynthetic1";
    const journalHash = sha256("strict-receipt");
    completed.lock.acquire(ROOM_ID, "room_sync", NOW);
    await completed.coordinator.recoverStaleAndReplay({
      roomId: ROOM_ID,
      journalId,
      journalHash,
      now: NOW,
      replay: async () => ({ receiptId: "receipt_strictsynthetic000001" }),
    });
    const receiptPath = join(completed.root, "replay", `${ROOM_ID}--${journalId}.json`);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
    writeFileSync(receiptPath, `${JSON.stringify({ ...receipt, harmless: "must-not-survive" })}\n`, "utf8");
    await assert.rejects(completed.coordinator.recoverStaleAndReplay({
      roomId: ROOM_ID,
      journalId,
      journalHash,
      now: new Date(NOW.getTime() + 1_000),
      replay: async () => ({ receiptId: "receipt_mustnotbereached00002" }),
    }), /stale replay receipt binding conflict/u);
  } finally {
    removeRoot(completed.root);
  }
});
