import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { guardClientMessage } from "../../packages/r4-codex-adapter/src/app-server-probe.ts";
import {
  CORE_CODEX_ALLOWED_HOME,
  CORE_CODEX_VERSION,
  buildCoreCodexLogicalCommand,
  computeIsolatedWriteInventory,
  computeSchemaInventory,
  coreCodexLogicalCommandShapeSha256,
  runCoreCodexZeroCall,
  validateCoreCodexLogicalCommand,
  validateCoreCodexWire,
  validateInitializeResultAgainstGeneratedSchema,
  validateSchemaInventory,
} from "../../packages/r4-codex-adapter/src/zero-call-physical.ts";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { cleanupFakeCodexFixture, coreSyntheticPublicHashes, createCoreFakeCodexLayout, createCoreMemorySpawnPort, createCoreProcessFakeFixture, createCoreProcessSpawnPort, createCoreSharedOrchestrationCaseExecutor, expectedCoreFakeSchema } from "../../scripts/r4-gate-b-codex-probe.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { CODEX_SHARED_ORCHESTRATION_FAULT_CASES, runCodexSharedOrchestrationFaultMatrix, runConstructionFakeMatrix } from "../../scripts/r4-gate-b-physical-port.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { createConstructionCodexProcessOrchestrator } from "../../scripts/r4-gate-b-physical-runner.mjs";

let ownedTestRoot: string | undefined;
const repositoryRoot = fs.realpathSync(path.resolve(import.meta.dirname, "../.."));

function validateTestRoot(candidate: string): string {
  assert.ok(path.isAbsolute(candidate), "FORME_CONSTRUCTION_TEMP_ROOT must be absolute");
  const resolved = path.resolve(candidate);
  const metadata = fs.lstatSync(resolved);
  assert.ok(metadata.isDirectory() && !metadata.isSymbolicLink(), "test root must be a real directory");
  assert.equal(metadata.mode & 0o077, 0, "test root must be private");
  const canonical = fs.realpathSync(resolved);
  assert.equal(canonical, resolved, "test root must be canonical");
  assert.notEqual(canonical, fs.realpathSync(os.tmpdir()), "system temp itself is not a test root");
  const overlapsRepository = canonical === repositoryRoot
    || canonical.startsWith(`${repositoryRoot}${path.sep}`)
    || repositoryRoot.startsWith(`${canonical}${path.sep}`);
  assert.equal(overlapsRepository, false, "test root must not overlap the repository");
  return canonical;
}

function testRoot(): string {
  const configured = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  if (configured !== undefined) return validateTestRoot(configured);
  const canonicalSystemTemp = fs.realpathSync(os.tmpdir());
  if (ownedTestRoot === undefined) {
    const created = fs.mkdtempSync(path.join(canonicalSystemTemp, "forme-r4-core-test-"));
    fs.chmodSync(created, 0o700);
    ownedTestRoot = fs.realpathSync(created);
  }
  return validateTestRoot(ownedTestRoot);
}

after(() => {
  if (ownedTestRoot !== undefined) {
    const target = ownedTestRoot;
    fs.rmSync(target, { recursive: true, force: true });
    assert.equal(fs.existsSync(target), false, "owned test root cleanup failed");
  }
});

function constructionRoot(): string {
  const parent = testRoot();
  const result = fs.mkdtempSync(path.join(parent, "codex-test-"));
  fs.chmodSync(result, 0o700);
  return result;
}

function digest(value: string | Uint8Array): `sha256:${string}` {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

async function runFixture(root: string, behavior = "clean") {
  const fixture = createCoreFakeCodexLayout(root, behavior);
  const port = createCoreMemorySpawnPort(fixture);
  try {
    const evidence = await runCoreCodexZeroCall({
      layout: fixture.layout,
      spawnPort: port,
      expectedSchema: expectedCoreFakeSchema(),
      publicHashes: coreSyntheticPublicHashes(fixture),
    });
    return { evidence, fixture, port };
  } catch (error) {
    cleanupFakeCodexFixture(fixture.root);
    throw error;
  }
}

test("Core Codex command surface is four exact logical argv shapes and six environment keys", () => {
  const root = constructionRoot();
  const fixture = createCoreFakeCodexLayout(root, "clean");
  try {
    const kinds = ["version", "help", "schema", "initialize"] as const;
    for (const kind of kinds) {
      const command = buildCoreCodexLogicalCommand(fixture.layout, kind);
      assert.equal(command.argv[0], "/usr/bin/sandbox-exec");
      assert.deepEqual(Object.keys(command.environment), ["HOME", "CODEX_HOME", "TMPDIR", "PATH", "NO_COLOR", "CODEX_DISABLE_ANALYTICS"]);
      assert.equal(command.cwd, fixture.layout.neutralCwd);
      validateCoreCodexLogicalCommand(fixture.layout, command);
      assert.throws(() => validateCoreCodexLogicalCommand(fixture.layout, { ...command, argv: [...command.argv, "arbitrary"] }), /CODEX_LOGICAL_COMMAND_DENIED/u);
    }
    const hashes = coreCodexLogicalCommandShapeSha256(fixture.layout);
    assert.equal(new Set(Object.values(hashes)).size, 4);
    assert.deepEqual(hashes, coreCodexLogicalCommandShapeSha256(fixture.layout));
  } finally {
    cleanupFakeCodexFixture(fixture.root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("recursive schema inventory is deterministic and rejects missing, extra, nested, symlink and hard-link drift", async () => {
  const mutations = ["clean", "schema_missing", "schema_extra", "schema_nested"] as const;
  for (const behavior of mutations) {
    const root = constructionRoot();
    const fixture = createCoreFakeCodexLayout(root, behavior);
    const port = createCoreMemorySpawnPort(fixture);
    try {
      await port.run(buildCoreCodexLogicalCommand(fixture.layout, "schema"));
      const inventory = computeSchemaInventory(fixture.layout.schemaRoot, Object.keys(expectedCoreFakeSchema().selected));
      if (behavior === "clean") {
        validateSchemaInventory(inventory, expectedCoreFakeSchema());
        assert.equal(inventory.fileCount, 273);
      } else assert.throws(() => validateSchemaInventory(inventory, expectedCoreFakeSchema()), /CODEX_SCHEMA_INVENTORY_DRIFT/u);

      if (behavior === "clean") {
        const target = path.join(fixture.layout.schemaRoot, "Synthetic000.json");
        const linked = path.join(fixture.layout.schemaRoot, "SyntheticHardlink.json");
        fs.linkSync(target, linked);
        assert.throws(() => computeSchemaInventory(fixture.layout.schemaRoot), /CODEX_SCHEMA_HARDLINK_DENIED|CODEX_SCHEMA_ENTRY_UNSAFE/u);
        fs.rmSync(linked);
        const symbolic = path.join(fixture.layout.schemaRoot, "SyntheticSymlink.json");
        fs.symlinkSync(target, symbolic);
        assert.throws(() => computeSchemaInventory(fixture.layout.schemaRoot), /CODEX_SCHEMA_ENTRY_UNSAFE/u);
      }
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("InitializeResult uses the generated schema dialect and closed local reference graph", async () => {
  const root = constructionRoot();
  const fixture = createCoreFakeCodexLayout(root, "clean");
  const port = createCoreMemorySpawnPort(fixture);
  try {
    await port.run(buildCoreCodexLogicalCommand(fixture.layout, "schema"));
    const result = JSON.parse(fs.readFileSync("fixtures/r4-gate-b-core/codex/initialize-result.json", "utf8")).result;
    const validated = validateInitializeResultAgainstGeneratedSchema(fixture.layout.schemaRoot, result);
    assert.equal(validated.dialect, "http://json-schema.org/draft-07/schema#");
    assert.throws(() => validateInitializeResultAgainstGeneratedSchema(fixture.layout.schemaRoot, { ...result, serverVersion: 1 }), /CODEX_INITIALIZE_RESULT_SCHEMA_INVALID/u);
    const target = path.join(fixture.layout.schemaRoot, "InitializeResponse.json");
    fs.writeFileSync(target, JSON.stringify({ $schema: "https://attacker.invalid/schema", type: "object" }), { flag: "w", mode: 0o600 });
    assert.throws(() => validateInitializeResultAgainstGeneratedSchema(fixture.layout.schemaRoot, result), /CODEX_SCHEMA_DIALECT_DENIED/u);
  } finally {
    cleanupFakeCodexFixture(fixture.root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("wire guard allows only initialize/initialized, strips identity and rejects server requests or duplicate/unknown messages", () => {
  assert.throws(() => guardClientMessage({ method: "thread/start", params: {} }), /CODEX_CLIENT_METHOD_DENIED_BEFORE_WRITE/u);
  assert.throws(() => guardClientMessage({ method: "initialize", id: 0, params: {} }), /CODEX_CLIENT_MESSAGE_DENIED/u);
  const notification = Buffer.from(JSON.stringify({ method: "remoteControl/status/changed", params: { status: "disabled", machineName: "secret-machine", installationId: "secret-install" } }));
  const response = Buffer.from(JSON.stringify({ id: 0, result: { synthetic: true } }));
  const clean = validateCoreCodexWire([notification, response], () => true);
  assert.equal(clean.serverNotifications, 1);
  assert.doesNotMatch(JSON.stringify(clean), /secret-machine|secret-install/u);
  assert.throws(() => validateCoreCodexWire([Buffer.from(JSON.stringify({ id: 2, method: "thread/start", params: {} }))], () => true), /CODEX_SERVER_REQUEST_DENIED/u);
  assert.throws(() => validateCoreCodexWire([notification, notification, response], () => true), /CODEX_SERVER_NOTIFICATION_DENIED/u);
  assert.throws(() => validateCoreCodexWire([Buffer.from(JSON.stringify({ method: "thread/started", params: {} })), response], () => true), /CODEX_SERVER_NOTIFICATION_DENIED/u);
  assert.throws(() => validateCoreCodexWire([Buffer.from("{bad")], () => true), /CODEX_WIRE_JSON_INVALID/u);
});

test("schema inventory closes before initialize spawn and buffered invalid wire stops before initialized", async () => {
  {
    const root = constructionRoot();
    const fixture = createCoreFakeCodexLayout(root, "schema_missing");
    const port = createCoreMemorySpawnPort(fixture);
    try {
      await assert.rejects(runCoreCodexZeroCall({
        layout: fixture.layout,
        spawnPort: port,
        expectedSchema: expectedCoreFakeSchema(),
        publicHashes: coreSyntheticPublicHashes(fixture),
      }), /CODEX_SCHEMA_INVENTORY_DRIFT/u);
      assert.equal(port.commands.length, 3);
      assert.equal(port.initializeClientWrites, 0);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
  {
    const root = constructionRoot();
    const fixture = createCoreFakeCodexLayout(root, "clean");
    const inner = createCoreMemorySpawnPort(fixture);
    const mutatingPort = Object.freeze({
      mode: "construction_fake" as const,
      async run(command: Parameters<typeof inner.run>[0], wireGuard?: Parameters<typeof inner.run>[1]) {
        const result = await inner.run(command, wireGuard);
        if (command.kind === "initialize") fs.appendFileSync(path.join(fixture.layout.schemaRoot, "InitializeResponse.json"), " ");
        return result;
      },
      async cleanup() { return inner.cleanup(); },
    });
    try {
      await assert.rejects(runCoreCodexZeroCall({
        layout: fixture.layout,
        spawnPort: mutatingPort,
        expectedSchema: expectedCoreFakeSchema(),
        publicHashes: coreSyntheticPublicHashes(fixture),
      }), /CODEX_SCHEMA_INVENTORY_DRIFT|CODEX_SCHEMA_CHANGED_AFTER_COMPILE/u);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
  for (const behavior of ["server_request", "unknown_notification", "duplicate_notification", "malformed", "invalid_result", "response_then_unknown"] as const) {
    const root = constructionRoot();
    const fixture = createCoreFakeCodexLayout(root, behavior);
    const port = createCoreMemorySpawnPort(fixture);
    try {
      await assert.rejects(runCoreCodexZeroCall({
        layout: fixture.layout,
        spawnPort: port,
        expectedSchema: expectedCoreFakeSchema(),
        publicHashes: coreSyntheticPublicHashes(fixture),
      }), /CODEX_/u, behavior);
      assert.equal(port.commands.length, 4, behavior);
      assert.equal(port.initializeClientWrites, 1, behavior);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("clean fake child mechanism is body-free, zero-call and aggregate Yellow", async () => {
  const root = constructionRoot();
  try {
    const { evidence, fixture, port } = await runFixture(root);
    assert.equal(evidence.status, "ZERO_CALL_CHILD_MECHANISM_GREEN");
    assert.equal(evidence.reportedVersion, CORE_CODEX_VERSION.trim());
    assert.equal(evidence.schemaFileCount, 273);
    assert.equal(evidence.threadStarts, 0);
    assert.equal(evidence.turnStarts, 0);
    assert.equal(evidence.providerCalls, 0);
    assert.equal(evidence.providerBytes, 0);
    assert.equal(evidence.networkBytes, 0);
    assert.equal(evidence.aiLaneEnabled, false);
    assert.equal(evidence.aggregateVerdict, "YELLOW");
    assert.equal(port.commands.length, 4);
    assert.equal(port.cleanupCalls, 1);
    const serialized = JSON.stringify(evidence);
    assert.doesNotMatch(serialized, /synthetic-machine-secret|synthetic-install-secret|responseText|prompt|transcript|\/private\//u);
    cleanupFakeCodexFixture(fixture.root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("stderr, nonzero, timeout, huge output, unreaped group, descendant and malformed wire all stop and clean", async () => {
  const behaviors = ["stderr", "nonzero", "timeout", "huge_output", "unreaped", "descendant", "malformed", "server_request", "unknown_notification", "duplicate_notification", "schema_missing", "schema_extra", "schema_nested"];
  for (const behavior of behaviors) {
    const root = constructionRoot();
    try {
      await assert.rejects(runFixture(root, behavior), /CODEX_/u, behavior);
      assert.deepEqual(fs.readdirSync(root), [], behavior);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("construction wrapper execs only the staged fake Codex and reaps adversarial descendants", async () => {
  for (const behavior of ["clean", "descendant", "stubborn_descendant"] as const) {
    const root = constructionRoot();
    const fixture = await createCoreProcessFakeFixture(root, behavior);
    const port = createCoreProcessSpawnPort(fixture);
    try {
      const invocation = runCoreCodexZeroCall({
        layout: fixture.layout,
        spawnPort: port,
        expectedSchema: expectedCoreFakeSchema(),
        publicHashes: coreSyntheticPublicHashes(fixture),
      });
      if (behavior === "clean") {
        const evidence = await invocation;
        assert.equal(evidence.status, "ZERO_CALL_CHILD_MECHANISM_GREEN");
        assert.equal(port.commands.length, 4);
      } else {
        await assert.rejects(invocation, /CODEX_UNEXPECTED_DESCENDANT/u);
      }
      assert.ok(port.cleanupCalls >= 1);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("process wire guard separates pre-response rejection, same-buffer partial, and split post-response failure while bounding TERM/KILL", async () => {
  for (const behavior of ["server_request", "invalid_result", "response_then_partial", "response_then_unknown", "oversized_line"] as const) {
    const root = constructionRoot();
    const fixture = await createCoreProcessFakeFixture(root, behavior);
    const port = createCoreProcessSpawnPort(fixture, { termGraceMilliseconds: 100, killGraceMilliseconds: 500 });
    try {
      await assert.rejects(runCoreCodexZeroCall({
        layout: fixture.layout,
        spawnPort: port,
        expectedSchema: expectedCoreFakeSchema(),
        publicHashes: coreSyntheticPublicHashes(fixture),
      }), /CODEX_/u, behavior);
      assert.equal(port.initializeClientWrites, behavior === "response_then_unknown" ? 2 : 1, behavior);
      assert.ok(port.cleanupCalls >= 1, behavior);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  const root = constructionRoot();
  const fixture = await createCoreProcessFakeFixture(root, "ignore_term");
  const port = createCoreProcessSpawnPort(fixture, { deadlineOverrideMilliseconds: 250, termGraceMilliseconds: 100, killGraceMilliseconds: 500 });
  const started = Date.now();
  try {
    await assert.rejects(runCoreCodexZeroCall({
      layout: fixture.layout,
      spawnPort: port,
      expectedSchema: expectedCoreFakeSchema(),
      publicHashes: coreSyntheticPublicHashes(fixture),
    }), /CODEX_CHILD_EXECUTION_FAILED/u);
    assert.ok(Date.now() - started < 2_000);
    assert.equal(port.initializeClientWrites, 1);
    assert.ok(port.cleanupCalls >= 1);
  } finally {
    cleanupFakeCodexFixture(fixture.root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the production Codex orchestration is the same state machine exercised by an injected construction executor", async () => {
  for (const behavior of ["clean", "response_then_partial", "response_then_unknown"] as const) {
    const root = constructionRoot();
    const fixture = await createCoreProcessFakeFixture(root, behavior);
    let sequence = 0;
    const journal = { async append() { const record = { sequence }; sequence += 1; return record; } };
    const port = createConstructionCodexProcessOrchestrator({
      layout: fixture.layout,
      journal,
      spawnChild(command: { argv: string[]; cwd: string; environment: Record<string, string> }) {
        return spawn(fixture.wrapper, command.argv.slice(1), { cwd: command.cwd, env: { ...command.environment } as NodeJS.ProcessEnv, detached: true, shell: false, stdio: ["pipe", "pipe", "pipe"] });
      },
    });
    try {
      const invocation = runCoreCodexZeroCall({ layout: fixture.layout, spawnPort: port, expectedSchema: expectedCoreFakeSchema(), publicHashes: coreSyntheticPublicHashes(fixture) });
      if (behavior === "clean") {
        const evidence = await invocation;
        assert.equal(evidence.status, "ZERO_CALL_CHILD_MECHANISM_GREEN");
      } else await assert.rejects(invocation, /CODEX_/u, behavior);
      assert.equal(await port.cleanup(), true);
    } finally {
      cleanupFakeCodexFixture(fixture.root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("the shared-orchestration matrix catalog is closed, body-free and rejects any counter or authority drift", async () => {
  const closedResult = (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({
    caseId: spec.caseId,
    terminalClass: spec.expectedTerminalClass,
    processStartSlotsConsumed: spec.expectedStartSlotsConsumed,
    processGroupsStarted: spec.expectedProcessGroupsStarted,
    clientWrites: spec.minimumClientWrites,
    termSignals: spec.expectedTermSignals,
    killSignals: spec.expectedKillSignals,
    stdinErrors: spec.expectedStdinErrors,
    esrchObservations: spec.expectedEsrchObservations,
    epermObservations: spec.expectedEpermObservations,
    unknownAbsenceObservations: spec.expectedUnknownAbsenceObservations,
    syntheticDescendantsStarted: spec.expectedDescendantsStarted,
    timerScheduleMilliseconds: spec.expectedTimerScheduleMilliseconds,
    initializedEndBeforeExitGraceTimerProven: true,
    journalFaultObserved: spec.expectedJournalFault,
    journalRecordCount: spec.expectedJournalRecordCount,
    journalAggregateSha256: `sha256:${"0".repeat(64)}`,
    journalChainValid: true,
    effectReleaseAfterStartedFsync: spec.expectedReleaseOrdering,
    logicalCleanupObligationRetained: !spec.expectedAllProcessGroupsAbsent,
    logicalAllProcessGroupsAbsent: spec.expectedAllProcessGroupsAbsent,
    syntheticChildHandlesClosedAtReturn: true,
    cleanupCalls: spec.expectedPortCleanupCalls,
    portCleanupCalls: spec.expectedPortCleanupCalls,
    idempotenceCleanupCalls: spec.expectedIdempotenceCleanupCalls,
    quarantineCleanupCalls: spec.expectedQuarantineCleanupCalls,
    residueCount: spec.expectedAllProcessGroupsAbsent ? 0 : 1,
    injectedFaultObserved: spec.expectedTerminalClass !== "CLEAN",
    observedReasonCode: spec.expectedReasonCode,
    logicalCommandBoundaryProven: true,
    mutationBeforeSpawnRejected: spec.expectedMutationBeforeSpawnRejected,
    inMemoryFakeExecutorBoundaryProven: true,
    inMemoryFakeWrapperSubstitutionProven: true,
    clientWriteBytesValidated: true,
    evidenceSchemaRejectionObserved: spec.expectedEvidenceSchemaRejection,
    journalInputShapeValidated: true,
    journalInputRejectionObserved: spec.expectedJournalInputRejection,
    stdioCloseBeforeSignalProven: true,
    ownedStdioClosedBeforeReturn: true,
    noWritesAfterStdioClose: true,
    ownedBufferZeroizationPassed: true,
    fakeEmitterBufferZeroizationPassed: true,
    bodyBytesExposed: 0,
    privatePathFields: 0,
    stableIdentityFields: 0,
    realCodexCalls: 0,
    sandboxExecCalls: 0,
    threadStarts: 0,
    turnStarts: 0,
    providerCalls: 0,
    providerBytes: 0,
    networkAuthority: 0,
    networkTransmittedBytes: 0,
    retryStarts: 0,
    fifthStarts: 0,
    alternateExecutableStarts: 0,
  });
  assert.ok(CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length >= 92);
  assert.deepEqual(new Set(CODEX_SHARED_ORCHESTRATION_FAULT_CASES.map((entry: { caseId: string }) => entry.caseId)).size, CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length);
  assert.deepEqual(new Set(CODEX_SHARED_ORCHESTRATION_FAULT_CASES.map((entry: { faultClass: string }) => entry.faultClass)).has("JOURNAL_MARKER_FAULT"), true);
  const exitGraceTerm = CODEX_SHARED_ORCHESTRATION_FAULT_CASES.find((entry: { caseId: string }) => entry.caseId === "start-4-response-then-hang-term");
  const exitGraceKill = CODEX_SHARED_ORCHESTRATION_FAULT_CASES.find((entry: { caseId: string }) => entry.caseId === "start-4-response-then-hang-kill");
  assert.deepEqual(exitGraceTerm?.expectedTimerScheduleMilliseconds, [5_000, 5_000, 30_000, 2_000, 10_000, 2_000]);
  assert.deepEqual(exitGraceKill?.expectedTimerScheduleMilliseconds, [5_000, 5_000, 30_000, 2_000, 10_000, 2_000, 2_000]);
  const clean = await runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => closedResult(spec));
  assert.equal(clean.status, "CODEX_SHARED_PRODUCTION_ORCHESTRATION_FAULT_MATRIX_GREEN");
  assert.equal(clean.caseCount, CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length);
  assert.equal(clean.cleanCases, 1);
  assert.equal(clean.realCodexCalls, 0);
  assert.equal(clean.sandboxExecCalls, 0);
  assert.match(clean.aggregateSha256, /^sha256:[0-9a-f]{64}$/u);
  await assert.rejects(runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({ ...closedResult(spec), providerCalls: spec.caseId === "clean-notification-before-response-four-start" ? 1 : 0 })), /CODEX_SHARED_CASE_AUTHORITY_ESCAPE/u);
  await assert.rejects(runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({ ...closedResult(spec), observedReasonCode: "UNRELATED_FAILURE" })), /CODEX_SHARED_CASE_REASON_DRIFT/u);
  await assert.rejects(runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({ ...closedResult(spec), timerScheduleMilliseconds: [] })), /CODEX_SHARED_CASE_TIMER_DRIFT/u);
  await assert.rejects(runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({ ...closedResult(spec), journalInputShapeValidated: false })), /CODEX_SHARED_CASE_BOUNDARY_UNPROVEN/u);
  await assert.rejects(runCodexSharedOrchestrationFaultMatrix(async (spec: (typeof CODEX_SHARED_ORCHESTRATION_FAULT_CASES)[number]) => ({ ...closedResult(spec), ownedBufferZeroizationPassed: false })), /CODEX_SHARED_CASE_BOUNDARY_UNPROVEN/u);
  await assert.rejects(runConstructionFakeMatrix({ requireCodexShared: true }), /CODEX_SHARED_PRODUCTION_ORCHESTRATION_MATRIX_REQUIRED/u);
});

test("the complete body-free fault matrix executes through the shared production Codex orchestration", async () => {
  const root = constructionRoot();
  try {
    const runCase = createCoreSharedOrchestrationCaseExecutor({
      constructionTempRoot: root,
      createOrchestrator: createConstructionCodexProcessOrchestrator,
    });
    const cleanSpec = CODEX_SHARED_ORCHESTRATION_FAULT_CASES.find((entry: { caseId: string }) => entry.caseId === "clean-notification-before-response-four-start");
    assert.ok(cleanSpec);
    const independentlyObserved = await runCase({ ...cleanSpec, expectedReasonCode: "DENIED_SELF_ATTESTATION", expectedTimerScheduleMilliseconds: [] });
    assert.equal(independentlyObserved.observedReasonCode, "CLEAN");
    assert.deepEqual(independentlyObserved.timerScheduleMilliseconds, [5_000, 5_000, 30_000, 2_000, 10_000]);
    assert.deepEqual(fs.readdirSync(root), []);
    const result = await runConstructionFakeMatrix({ requireCodexShared: true, runCodexSharedCase: runCase });
    assert.equal(result.status, "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN");
    assert.equal(result.codexSharedOrchestrationCases, CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length);
    assert.match(result.codexSharedOrchestrationAggregateSha256, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(result.realPhysicalEffects, 0);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the production Construction callback defers its owned filesystem tree to top-root cleanup", async () => {
  const root = constructionRoot();
  try {
    assert.throws(() => createCoreSharedOrchestrationCaseExecutor({
      constructionTempRoot: root,
      createOrchestrator: createConstructionCodexProcessOrchestrator,
      deferFilesystemCleanupToConstructionRoot: "true",
    }), /CORE_SHARED_FILESYSTEM_CLEANUP_POLICY_INVALID/u);
    const runCase = createCoreSharedOrchestrationCaseExecutor({
      constructionTempRoot: root,
      createOrchestrator: createConstructionCodexProcessOrchestrator,
      deferFilesystemCleanupToConstructionRoot: true,
    });
    const cleanSpec = CODEX_SHARED_ORCHESTRATION_FAULT_CASES.find((entry: { caseId: string }) => entry.caseId === "clean-notification-before-response-four-start");
    assert.ok(cleanSpec);
    const observed = await runCase(cleanSpec);
    assert.equal(observed.logicalAllProcessGroupsAbsent, true);
    assert.equal(observed.syntheticChildHandlesClosedAtReturn, true);
    assert.equal(observed.ownedStdioClosedBeforeReturn, true);
    assert.equal(observed.ownedBufferZeroizationPassed, true);
    assert.equal(observed.fakeEmitterBufferZeroizationPassed, true);
    assert.deepEqual(fs.readdirSync(root), ["codex-shared-001"]);
    const caseRoot = path.join(root, "codex-shared-001");
    const fixtureRoot = path.join(caseRoot, "codex-core-fixture-clean");
    for (const retainedRoot of [caseRoot, fixtureRoot]) {
      const metadata = fs.lstatSync(retainedRoot);
      assert.ok(metadata.isDirectory() && !metadata.isSymbolicLink());
      assert.equal(metadata.mode & 0o077, 0);
      assert.equal(fs.realpathSync(retainedRoot), retainedRoot);
      assert.equal(path.relative(root, retainedRoot).startsWith(`..${path.sep}`), false);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("construction wrapper binding rejects a non-pinned binary identity", async () => {
  const root = constructionRoot();
  const fixture = await createCoreProcessFakeFixture(root, "clean");
  try {
    assert.throws(() => createCoreProcessSpawnPort({ ...fixture, wrapperSha256: `sha256:${"0".repeat(64)}` }), /CORE_FAKE_WRAPPER_UNSAFE/u);
  } finally {
    cleanupFakeCodexFixture(fixture.root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("isolated write inventory allows only exact CODEX_HOME top-level and rejects private material", async () => {
  const root = constructionRoot();
  const fixture = createCoreFakeCodexLayout(root, "clean");
  const port = createCoreMemorySpawnPort(fixture);
  try {
    await port.run(buildCoreCodexLogicalCommand(fixture.layout, "schema"));
    for (const name of CORE_CODEX_ALLOWED_HOME) {
      const candidate = path.join(fixture.layout.codexHome, name);
      if (name === "skills" || name === ".tmp" || name === "tmp") fs.mkdirSync(candidate, { mode: 0o700 });
      else fs.writeFileSync(candidate, "synthetic state", { mode: 0o600 });
    }
    const clean = computeIsolatedWriteInventory(fixture.layout);
    assert.match(clean.sha256, /^sha256:[0-9a-f]{64}$/u);
    const unknown = path.join(fixture.layout.codexHome, "unknown.sqlite");
    fs.writeFileSync(unknown, "synthetic", { mode: 0o600 });
    assert.throws(() => computeIsolatedWriteInventory(fixture.layout), /CODEX_HOME_WRITESET_ESCAPE/u);
    fs.rmSync(unknown);
    const privateBody = path.join(fixture.layout.home, "state");
    fs.writeFileSync(privateBody, "responseText: synthetic-private-canary", { mode: 0o600 });
    assert.throws(() => computeIsolatedWriteInventory(fixture.layout), /CODEX_PRIVATE_WRITE_DENIED/u);
  } finally {
    cleanupFakeCodexFixture(fixture.root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("test temp data stays below an explicit or fresh private test root", () => {
  const parent = testRoot();
  assert.ok(path.isAbsolute(parent));
  assert.notEqual(parent, os.tmpdir());
  const metadata = fs.lstatSync(parent);
  assert.ok(metadata.isDirectory() && !metadata.isSymbolicLink());
  assert.equal(metadata.mode & 0o077, 0);
});
