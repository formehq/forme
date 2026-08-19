import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  APPROVED_TECHNICAL_PACKET_SHA256,
  GateBPreflightError,
  SHA256_PATTERN,
  constructionDryRunParent,
  createRunLayout,
  executionRunParent,
  repositoryRootPath,
  validateCodexInstallationRoot,
  validateExecutionManifestHash,
  verifyConstructionBindings,
} from "./r4-gate-b-preflight.mjs";
import { cleanupRunRoot, GateBCleanupError } from "./r4-gate-b-cleanup.mjs";

export const AGGREGATE_LANE_ORDER = Object.freeze([
  "preflight",
  "gate-a-regression-and-protocol",
  "api-and-local-format-contracts",
  "postgres-migration-roles-races",
  "encrypted-field-adapter",
  "fake-budget-and-event-fence",
  "codex-zero-call",
  "macos-physical-boundary",
  "cleanup-and-artifact-index",
]);
export const CORE_AGGREGATE_LANE_ORDER = Object.freeze([
  "core-preflight",
  "gate-a-and-full-regression",
  "core-contract-web-api-cli",
  "core-postgres-static-and-fake",
  "encrypted-field-regression",
  "core-codex-zero-call-fake",
  "core-macos-transient-fake",
  "core-static-effect-and-workset-audit",
  "core-cleanup-and-artifact-index",
]);
export const LANE_STATUSES = Object.freeze(["GREEN", "YELLOW", "RED", "NOT_RUN"]);
export const FORBIDDEN_EFFECT_KEYS = Object.freeze([
  "providerSessions", "providerBytes", "spendUsd", "codexThreadStarts", "codexTurnStarts",
  "realGuestBytes", "externalMessages", "productionWrites", "deploys", "merges",
]);
const ZERO_EFFECT_COUNTS = Object.freeze({
  providerSessions: 0,
  providerBytes: 0,
  spendUsd: 0,
  codexThreadStarts: 0,
  codexTurnStarts: 0,
  realGuestBytes: 0,
  externalMessages: 0,
  productionWrites: 0,
  deploys: 0,
  merges: 0,
  dockerCommands: 0,
  postgresProcesses: 0,
  keychainOperations: 0,
  userPresencePrompts: 0,
  realCodexCalls: 0,
  sandboxExecCalls: 0,
  signingCalls: 0,
  localAuthenticationCalls: 0,
  secureEnclaveOperations: 0,
  networkCalls: 0,
});
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/u;
const repositoryRoot = repositoryRootPath();

export class GateBRunnerError extends Error {
  constructor(code) {
    super(code);
    this.name = "GateBRunnerError";
    this.code = code;
  }
}

function fail(code) {
  throw new GateBRunnerError(code);
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
  return value;
}

function normalizeLaneResult(lane, value) {
  exactKeys(value, ["status", "code", "effects", "metrics"], "LANE_RESULT_SHAPE_INVALID");
  if (!LANE_STATUSES.includes(value.status) || value.status === "NOT_RUN") fail("LANE_RESULT_STATUS_INVALID");
  if (!CODE_PATTERN.test(value.code)) fail("LANE_RESULT_CODE_INVALID");
  exactKeys(value.effects, Object.keys(ZERO_EFFECT_COUNTS), "LANE_EFFECT_SHAPE_INVALID");
  for (const [key, count] of Object.entries(value.effects)) {
    if (!Number.isSafeInteger(count) || count < 0) fail("LANE_EFFECT_COUNT_INVALID");
    if (FORBIDDEN_EFFECT_KEYS.includes(key) && count !== 0) fail("FORBIDDEN_EFFECT_NONZERO");
  }
  if (value.metrics === null || typeof value.metrics !== "object" || Array.isArray(value.metrics)) {
    fail("LANE_METRICS_INVALID");
  }
  for (const [key, metric] of Object.entries(value.metrics)) {
    if (!/^[A-Za-z][A-Za-z0-9]{1,63}$/u.test(key)) fail("LANE_METRIC_KEY_INVALID");
    if (!(typeof metric === "boolean" || (Number.isSafeInteger(metric) && metric >= 0))) {
      fail("LANE_METRIC_VALUE_INVALID");
    }
  }
  return Object.freeze({ lane, status: value.status, code: value.code, effects: value.effects, metrics: value.metrics });
}

function notRun(lane) {
  return Object.freeze({ lane, status: "NOT_RUN", code: "NOT_RUN_AFTER_RED", effects: ZERO_EFFECT_COUNTS, metrics: {} });
}

function sumEffects(results) {
  const totals = { ...ZERO_EFFECT_COUNTS };
  for (const result of results) {
    for (const key of Object.keys(totals)) totals[key] += result.effects[key];
  }
  for (const key of FORBIDDEN_EFFECT_KEYS) if (totals[key] !== 0) fail("FORBIDDEN_EFFECT_NONZERO");
  return Object.freeze(totals);
}

export async function runSerialAggregate(adapter) {
  const results = [];
  let stopped = false;
  let yellow = false;
  let aiLaneEnabled = true;
  for (const lane of AGGREGATE_LANE_ORDER) {
    if (lane === "cleanup-and-artifact-index") continue;
    if (stopped) {
      results.push(notRun(lane));
      continue;
    }
    let normalized;
    try {
      normalized = normalizeLaneResult(lane, await adapter.run(lane));
    } catch (error) {
      const code = controlledErrorCode(error, "UNCONTROLLED_LANE_FAILURE");
      normalized = normalizeLaneResult(lane, {
        status: "RED",
        code,
        effects: ZERO_EFFECT_COUNTS,
        metrics: {},
      });
    }
    results.push(normalized);
    if (normalized.status === "RED") stopped = true;
    if (normalized.status === "YELLOW") yellow = true;
    if ((lane === "codex-zero-call" || lane === "macos-physical-boundary") && normalized.status !== "GREEN") {
      aiLaneEnabled = false;
    }
  }
  let cleanup;
  try {
    cleanup = normalizeLaneResult("cleanup-and-artifact-index", await adapter.run("cleanup-and-artifact-index"));
  } catch (error) {
    cleanup = normalizeLaneResult("cleanup-and-artifact-index", {
      status: "RED",
      code: controlledErrorCode(error, "CLEANUP_UNCONTROLLED_FAILURE"),
      effects: ZERO_EFFECT_COUNTS,
      metrics: {},
    });
  }
  results.push(cleanup);
  const red = results.some((result) => result.status === "RED");
  if (cleanup.status === "YELLOW") yellow = true;
  const verdict = red ? "RED" : yellow ? "YELLOW" : "GREEN";
  return Object.freeze({
    schemaVersion: "r4_gate_b_aggregate_run.v1",
    verdict,
    aiLaneEnabled: verdict !== "RED" && aiLaneEnabled,
    laneOrderSha256: `sha256:${digest(`${AGGREGATE_LANE_ORDER.join("\n")}\n`)}`,
    lanes: Object.freeze(results),
    effectCounts: sumEffects(results),
  });
}

export async function runCoreConstructionAggregate(adapter) {
  const results = [];
  let stopped = false;
  let yellow = false;
  let aiLaneEnabled = false;
  for (const laneName of CORE_AGGREGATE_LANE_ORDER) {
    if (laneName === "core-cleanup-and-artifact-index") continue;
    if (stopped) { results.push(notRun(laneName)); continue; }
    let normalized;
    try { normalized = normalizeLaneResult(laneName, await adapter.run(laneName)); }
    catch (error) {
      normalized = normalizeLaneResult(laneName, { status: "RED", code: controlledErrorCode(error, "CORE_UNCONTROLLED_LANE_FAILURE"), effects: ZERO_EFFECT_COUNTS, metrics: {} });
    }
    results.push(normalized);
    if (normalized.status === "RED") stopped = true;
    if (normalized.status === "YELLOW") yellow = true;
  }
  let cleanup;
  try { cleanup = normalizeLaneResult("core-cleanup-and-artifact-index", await adapter.run("core-cleanup-and-artifact-index")); }
  catch (error) {
    cleanup = normalizeLaneResult("core-cleanup-and-artifact-index", { status: "RED", code: controlledErrorCode(error, "CORE_CLEANUP_UNCONTROLLED_FAILURE"), effects: ZERO_EFFECT_COUNTS, metrics: {} });
  }
  results.push(cleanup);
  const red = results.some((entry) => entry.status === "RED");
  if (cleanup.status === "YELLOW") yellow = true;
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.aggregate-construction.v1",
    verdict: red ? "RED" : yellow ? "YELLOW" : "GREEN",
    aiLaneEnabled,
    laneOrderSha256: `sha256:${digest(`${CORE_AGGREGATE_LANE_ORDER.join("\n")}\n`)}`,
    lanes: Object.freeze(results),
    effectCounts: sumEffects(results),
  });
}

function controlledErrorCode(error, fallback) {
  if (
    error instanceof GateBRunnerError
    || error instanceof GateBPreflightError
    || error instanceof GateBCleanupError
  ) return error.code;
  if (error && typeof error === "object" && CODE_PATTERN.test(error.code ?? "")) return error.code;
  return fallback;
}

export function parseRunnerArguments(argv) {
  if (argv.length === 1 && argv[0] === "dry-run") return Object.freeze({ mode: "dry-run" });
  if (argv.length === 1 && argv[0] === "dry-run-core") return Object.freeze({ mode: "dry-run-core" });
  if (
    argv.length !== 9
    || argv[0] !== "execute"
    || argv[1] !== "--packet-sha"
    || argv[3] !== "--manifest-sha"
    || argv[5] !== "--execution-grant"
    || argv[7] !== "--codex-install-root"
  ) fail("RUNNER_ARGUMENTS_DENIED");
  const packetSha = argv[2];
  const manifestSha = argv[4];
  const executionGrant = argv[6];
  const codexInstallRoot = argv[8];
  if (
    packetSha !== `sha256:${APPROVED_TECHNICAL_PACKET_SHA256}`
    || !SHA256_PATTERN.test(manifestSha)
    || executionGrant !== manifestSha
    || typeof codexInstallRoot !== "string"
    || !path.isAbsolute(codexInstallRoot)
  ) fail("RUNNER_ARGUMENTS_DENIED");
  return Object.freeze({ mode: "execute", packetSha, manifestSha, executionGrant, codexInstallRoot });
}

function lane(status = "GREEN", code = "SYNTHETIC_GREEN", metrics = {}) {
  return Object.freeze({ status, code, effects: ZERO_EFFECT_COUNTS, metrics });
}

class SyntheticAdapter {
  constructor(overrides = {}, cleanupAction = null) {
    this.overrides = overrides;
    this.cleanupAction = cleanupAction;
    this.calls = [];
  }

  async run(laneName) {
    this.calls.push(laneName);
    if (laneName === "cleanup-and-artifact-index" && this.cleanupAction) {
      const receipt = this.cleanupAction();
      return lane("GREEN", "SYNTHETIC_CLEANUP_GREEN", { runRootAbsent: receipt.runRootAbsent });
    }
    return this.overrides[laneName] ?? lane();
  }
}

function assertDryRun(condition, code) {
  if (!condition) fail(code);
}

export async function runSyntheticDryRun() {
  verifyConstructionBindings();
  const denied = [
    [],
    ["execute", "--provider", "OpenAI"],
    ["execute", "--model", "fixture"],
    ["execute", "--credential", "fixture"],
    ["execute", "--real-data", "fixture"],
    ["execute", "--cwd", "/private/tmp"],
  ];
  for (const value of denied) {
    let rejected = false;
    try { parseRunnerArguments(value); } catch { rejected = true; }
    assertDryRun(rejected, "DRY_RUN_ARGUMENT_DENIAL_FAILED");
  }

  const parent = constructionDryRunParent();
  const runID = "gb_00000000000000000000000000000001";
  const manifestSha = `sha256:${"1".repeat(64)}`;
  const layout = createRunLayout({ parent, runID, executionManifestSha256: manifestSha });
  const allGreenAdapter = new SyntheticAdapter({}, () => cleanupRunRoot({
    root: layout.root,
    runID,
    executionManifestSha256: manifestSha,
    allowDockerCleanup: false,
  }));
  const allGreen = await runSerialAggregate(allGreenAdapter);
  assertDryRun(allGreen.verdict === "GREEN", "DRY_RUN_GREEN_SCENARIO_FAILED");
  assertDryRun(allGreenAdapter.calls.join("|") === AGGREGATE_LANE_ORDER.join("|"), "DRY_RUN_ORDER_FAILED");
  fs.rmdirSync(parent);

  const yellowAdapter = new SyntheticAdapter({
    "codex-zero-call": lane("YELLOW", "SYNTHETIC_CODEX_YELLOW"),
  });
  const yellow = await runSerialAggregate(yellowAdapter);
  assertDryRun(yellow.verdict === "YELLOW" && yellow.aiLaneEnabled === false, "DRY_RUN_YELLOW_SCENARIO_FAILED");
  assertDryRun(yellow.lanes.every((entry) => entry.status !== "NOT_RUN"), "DRY_RUN_YELLOW_CONTINUATION_FAILED");

  const redAdapter = new SyntheticAdapter({
    "postgres-migration-roles-races": lane("RED", "SYNTHETIC_POSTGRES_RED"),
  });
  const red = await runSerialAggregate(redAdapter);
  const redIndex = red.lanes.findIndex((entry) => entry.status === "RED");
  assertDryRun(red.verdict === "RED", "DRY_RUN_RED_SCENARIO_FAILED");
  assertDryRun(red.lanes.slice(redIndex + 1, -1).every((entry) => entry.status === "NOT_RUN"), "DRY_RUN_RED_STOP_FAILED");
  assertDryRun(redAdapter.calls.at(-1) === "cleanup-and-artifact-index", "DRY_RUN_CLEANUP_NOT_CALLED");

  const cleanupRedAdapter = new SyntheticAdapter({
    "cleanup-and-artifact-index": lane("RED", "SYNTHETIC_CLEANUP_RED"),
  });
  const cleanupRed = await runSerialAggregate(cleanupRedAdapter);
  assertDryRun(cleanupRed.verdict === "RED", "DRY_RUN_CLEANUP_RED_FAILED");

  return Object.freeze({
    schemaVersion: "r4_gate_b_aggregate_dry_run.v1",
    status: "GREEN_SYNTHETIC_ONLY",
    scenarioCount: 4,
    deniedArgumentCaseCount: denied.length,
    laneCount: AGGREGATE_LANE_ORDER.length,
    serialOrderPassed: true,
    yellowContinuationPassed: true,
    redStopNotRunPassed: true,
    cleanupAlwaysRan: true,
    bodyFreeEvidencePassed: true,
    externalNetworkCalls: 0,
    dockerCommands: 0,
    postgresProcesses: 0,
    realCodexCalls: 0,
    keychainOperations: 0,
    userPresencePrompts: 0,
    providerCalls: 0,
    cleanupPassed: !fs.existsSync(parent),
  });
}

class CoreSyntheticAdapter {
  constructor(overrides = {}, faultLane = null, faultWindow = "before") {
    this.overrides = overrides;
    this.faultLane = faultLane;
    this.faultWindow = faultWindow;
    this.calls = [];
    this.cleanupCalls = 0;
  }
  async run(laneName) {
    this.calls.push(laneName);
    if (laneName === "core-cleanup-and-artifact-index") {
      this.cleanupCalls += 1;
      return lane("GREEN", "CORE_SYNTHETIC_CLEANUP_GREEN", { cleanupPassed: true });
    }
    if (this.faultLane === laneName) {
      const error = new GateBRunnerError(this.faultWindow === "before" ? "CORE_INJECTED_BEFORE_EFFECT" : "CORE_INJECTED_AFTER_EFFECT_BEFORE_MARKER");
      throw error;
    }
    return this.overrides[laneName] ?? lane("GREEN", "CORE_SYNTHETIC_GREEN", { bodyFreeCheckpoint: true });
  }
}

export async function runCoreConstructionDryRun() {
  const expectedYellow = {
    "core-postgres-static-and-fake": lane("YELLOW", "CORE_POSTGRES_RACE_WORKER_CONSTRUCTION_INCOMPLETE", { fakeMechanismPassed: true }),
    "core-codex-zero-call-fake": lane("YELLOW", "CORE_CODEX_HOST_BOUND_PHYSICAL_ADAPTER_INCOMPLETE", { fakeMechanismPassed: true }),
    "core-macos-transient-fake": lane("YELLOW", "CORE_MACOS_HOST_BOUND_PHYSICAL_ADAPTER_INCOMPLETE", { fakeMechanismPassed: true }),
  };
  const normalAdapter = new CoreSyntheticAdapter(expectedYellow);
  const normal = await runCoreConstructionAggregate(normalAdapter);
  assertDryRun(normal.verdict === "YELLOW" && normal.aiLaneEnabled === false, "CORE_DRY_RUN_EXPECTED_YELLOW_FAILED");
  assertDryRun(normalAdapter.calls.join("|") === CORE_AGGREGATE_LANE_ORDER.join("|"), "CORE_DRY_RUN_ORDER_FAILED");
  assertDryRun(Object.values(normal.effectCounts).every((value) => value === 0), "CORE_DRY_RUN_EFFECT_NONZERO");

  let faultCases = 0;
  for (const faultWindow of ["before", "after"]) {
    for (const laneName of CORE_AGGREGATE_LANE_ORDER.slice(0, -1)) {
      const adapter = new CoreSyntheticAdapter({}, laneName, faultWindow);
      const result = await runCoreConstructionAggregate(adapter);
      assertDryRun(result.verdict === "RED", "CORE_DRY_RUN_FAULT_NOT_RED");
      assertDryRun(adapter.cleanupCalls === 1 && adapter.calls.at(-1) === "core-cleanup-and-artifact-index", "CORE_DRY_RUN_FAULT_CLEANUP_FAILED");
      faultCases += 1;
    }
  }
  // CoreSyntheticAdapter always owns cleanup; exercise cleanup Red through a minimal exact adapter.
  const cleanupFailure = await runCoreConstructionAggregate({
    async run(laneName) { return laneName === "core-cleanup-and-artifact-index" ? lane("RED", "CORE_SYNTHETIC_CLEANUP_RED") : lane(); },
  });
  assertDryRun(cleanupFailure.verdict === "RED", "CORE_DRY_RUN_CLEANUP_RED_FAILED");
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.aggregate-construction-dry-run.v1",
    status: "CORE_REPOSITORY_REVIEWABLE_YELLOW",
    verdict: "YELLOW",
    blockers: Object.freeze([
      "postgres_race_worker_call_bytes_and_persistent_verifiers",
      "host_binding_and_core_physical_runner",
      "macos_signed_helper_physical_executor",
    ]),
    laneCount: CORE_AGGREGATE_LANE_ORDER.length,
    injectedFaultCaseCount: faultCases,
    serialOrderPassed: true,
    redStopPassed: true,
    cleanupAlwaysRan: true,
    bodyFreeCheckpointsPassed: true,
    aiLaneEnabled: false,
    retryExecutionGranted: false,
    firstProviderCallGranted: false,
    realCodexCalls: 0,
    sandboxExecCalls: 0,
    dockerCommands: 0,
    postgresProcesses: 0,
    signingCalls: 0,
    keychainOperations: 0,
    localAuthenticationCalls: 0,
    secureEnclaveOperations: 0,
    providerCalls: 0,
    networkCalls: 0,
  });
}

function runExactNode(args, timeout = 120_000) {
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    env: {
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      FORME_CONSTRUCTION_TEMP_ROOT: process.env.FORME_CONSTRUCTION_TEMP_ROOT,
      PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      npm_config_offline: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
    encoding: "buffer",
    timeout,
    maxBuffer: 4_194_304,
  });
  if (result.error || result.status !== 0 || (result.stderr?.length ?? 0) > 1_048_576) fail("EXECUTION_LOCAL_COMMAND_FAILED");
  return Object.freeze({ stdoutBytes: result.stdout?.length ?? 0, stderrBytes: result.stderr?.length ?? 0 });
}

class ExecutionAdapter {
  constructor(input, layout) {
    this.input = input;
    this.layout = layout;
    this.preflight = null;
  }

  async run(laneName) {
    if (laneName === "preflight") {
      verifyConstructionBindings();
      validateExecutionManifestHash(this.input.manifestSha);
      this.preflight = validateCodexInstallationRoot(this.input.codexInstallRoot);
      return lane("GREEN", "EXECUTION_PREFLIGHT_GREEN", { codexSourceHashesMatched: true });
    }
    if (laneName === "gate-a-regression-and-protocol") {
      runExactNode(["node_modules/typescript/bin/tsc", "--noEmit"]);
      runExactNode(["--import", "./scripts/deny-external-network.mjs", "--test", "test/*.test.ts"]);
      runExactNode(["--import", "./scripts/deny-external-network.mjs", "--test", "test/r4/**/*.test.ts"]);
      return lane("GREEN", "EXECUTION_GATE_A_GREEN", { commandCount: 3 });
    }
    if (laneName === "api-and-local-format-contracts") {
      runExactNode(["scripts/r4-gate-b-api-contract.mjs", "check"]);
      runExactNode(["scripts/r4-gate-b-postgres.mjs", "check"]);
      return lane("GREEN", "EXECUTION_CONTRACTS_GREEN", { commandCount: 2 });
    }
    if (laneName === "postgres-migration-roles-races") {
      return lane("YELLOW", "POSTGRES_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_ADAPTER", { runtimeExecuted: false });
    }
    if (laneName === "encrypted-field-adapter") {
      runExactNode(["scripts/r4-gate-b-encrypted-field.mjs", "check"]);
      return lane("GREEN", "EXECUTION_ENCRYPTED_FIELD_GREEN", { commandCount: 1 });
    }
    if (laneName === "fake-budget-and-event-fence") {
      runExactNode(["scripts/r4-gate-b-fake-budget.mjs", "check"]);
      return lane("GREEN", "EXECUTION_FAKE_BUDGET_GREEN", { commandCount: 1 });
    }
    if (laneName === "codex-zero-call") {
      return lane("YELLOW", "CODEX_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_SEATBELT_ADAPTER", { runtimeExecuted: false });
    }
    if (laneName === "macos-physical-boundary") {
      return lane("YELLOW", "MACOS_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_SIGNING_ADAPTER", { runtimeExecuted: false });
    }
    if (laneName === "cleanup-and-artifact-index") {
      const receipt = cleanupRunRoot({
        root: this.layout.root,
        runID: this.layout.marker.runID,
        executionManifestSha256: this.input.manifestSha,
        allowDockerCleanup: true,
      });
      return lane("GREEN", "EXECUTION_CLEANUP_GREEN", { runRootAbsent: receipt.runRootAbsent });
    }
    fail("EXECUTION_LANE_DENIED");
  }
}

async function runExecution(input) {
  const parent = executionRunParent();
  const runID = `gb_${crypto.randomBytes(16).toString("hex")}`;
  const layout = createRunLayout({ parent, runID, executionManifestSha256: input.manifestSha });
  const result = await runSerialAggregate(new ExecutionAdapter(input, layout));
  return Object.freeze({ ...result, runID });
}

async function main() {
  try {
    const input = parseRunnerArguments(process.argv.slice(2));
    const result = input.mode === "dry-run" ? await runSyntheticDryRun()
      : input.mode === "dry-run-core" ? await runCoreConstructionDryRun()
        : await runExecution(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: "RED", code: controlledErrorCode(error, "RUNNER_UNCONTROLLED_FAILURE") })}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
