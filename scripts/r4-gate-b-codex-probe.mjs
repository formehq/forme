import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { canonicalJson } from "../packages/r4-protocol/src/index.ts";
import {
  guardClientMessage,
  initializedMessage,
  initializeMessage,
  runAppServerProbe,
  validatePinnedCodexFixtures,
} from "../packages/r4-codex-adapter/src/app-server-probe.ts";
import {
  CORE_CODEX_ALLOWED_HOME,
  CORE_CODEX_VERSION,
  buildCoreCodexLogicalCommand,
  computeSchemaInventory,
  coreCodexLayout,
  runCoreCodexZeroCall,
  validateCoreCodexLogicalCommand,
} from "../packages/r4-codex-adapter/src/zero-call-physical.ts";

const repositoryRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const constructedPaths = Object.freeze([
  "packages/r4-codex-adapter/src/app-server-probe.ts",
  "packages/r4-codex-adapter/src/index.ts",
  "fixtures/r4-gate-b/codex-app-server-0.145.0-schema.sha256",
  "fixtures/r4-gate-b/codex-app-server-0.145.0-methods.json",
  "scripts/r4-gate-b-codex-probe.mjs",
  "test/r4-gate-b/codex-adapter.test.ts",
]);
const coreConstructedPaths = Object.freeze([
  "packages/r4-codex-adapter/src/zero-call-physical.ts",
  "schemas/r4/gate-b-core/codex-zero-call-contract.json",
  "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb",
  "fixtures/r4-gate-b-core/codex/initialize-result.json",
  "test/r4-gate-b-core/codex-physical-adapter.test.ts",
]);
const contractPath = "schemas/r4/gate-b/codex-zero-call-contract.json";
const HELP_BYTES = Buffer.from("fixture app-server help\n", "utf8");
const SCHEMA_FILES = Object.freeze({
  "ClientNotification.json": "{\"methods\":[\"initialized\"]}\n",
  "ClientRequest.json": "{\"methods\":[\"initialize\"]}\n",
  "InitializeResult.json": "{\"schemaVersion\":\"fixture.initialize-result.v1\"}\n",
});
const BEHAVIORS = new Set([
  "clean", "server_request", "unknown_notification", "duplicate_notification",
  "unexpected_shape", "nonzero", "stderr", "malformed",
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactRead(relativePath) {
  if (![...constructedPaths, ...coreConstructedPaths, contractPath].includes(relativePath)) fail("CODEX_CONSTRUCTION_PATH_DENIED");
  const candidate = path.join(repositoryRoot, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(candidate) !== candidate) {
    fail("CODEX_CONSTRUCTION_PATH_UNSAFE");
  }
  return fs.readFileSync(candidate, "utf8");
}

function canonicalTempRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) fail("CONSTRUCTION_TEMP_ROOT_REQUIRED");
  const stat = fs.lstatSync(value);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) fail("CONSTRUCTION_TEMP_ROOT_UNSAFE");
  const real = fs.realpathSync(value);
  if (real !== path.resolve(value)) fail("CONSTRUCTION_TEMP_ROOT_UNSAFE");
  return real;
}

function mkdir0700(value) {
  fs.mkdirSync(value, { recursive: true, mode: 0o700 });
  fs.chmodSync(value, 0o700);
}

function fixtureSource(behavior) {
  const schemaLiteral = JSON.stringify(SCHEMA_FILES);
  return `#!${process.execPath}
// FORME_GATE_B_FAKE_CODEX_EXECUTABLE_V1
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const behavior = ${JSON.stringify(behavior)};
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("codex-cli 0.145.0\\n");
} else if (args.length === 2 && args[0] === "app-server" && args[1] === "--help") {
  process.stdout.write("fixture app-server help\\n");
} else if (args.length === 4 && args[0] === "app-server" && args[1] === "generate-json-schema" && args[2] === "--out") {
  const files = ${schemaLiteral};
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(args[3], name), value, { flag: "wx", mode: 0o600 });
} else if (args.length === 3 && args[0] === "app-server" && args[1] === "--listen" && args[2] === "stdio://") {
  if (behavior === "stderr") process.stderr.write("fixture stderr");
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    let message;
    try { message = JSON.parse(line); } catch { process.exit(6); }
    if (message.method === "initialize" && message.id === 0) {
      if (behavior === "malformed") { process.stdout.write("{bad json\\n"); return; }
      if (behavior === "server_request") { process.stdout.write(JSON.stringify({ id: 9, method: "thread/start", params: {} }) + "\\n"); return; }
      if (behavior === "unknown_notification") { process.stdout.write(JSON.stringify({ method: "thread/started", params: {} }) + "\\n"); return; }
      if (behavior === "unexpected_shape") { process.stdout.write(JSON.stringify({ id: 0, result: {}, extra: true }) + "\\n"); return; }
      const notice = { method: "remoteControl/status/changed", params: { installationId: "fixture-installation", machineName: "fixture-machine", status: "disabled" } };
      process.stdout.write(JSON.stringify(notice) + "\\n");
      if (behavior === "duplicate_notification") process.stdout.write(JSON.stringify(notice) + "\\n");
      process.stdout.write(JSON.stringify({ id: 0, result: { capabilities: {}, schemaVersion: "fixture.initialize-result.v1", serverVersion: "0.145.0" } }) + "\\n");
    } else if (message.method === "initialized") {
      process.exit(behavior === "nonzero" ? 7 : 0);
    } else {
      process.exit(8);
    }
  });
} else {
  process.exit(9);
}
`;
}

export function expectedFixtureSchema() {
  const fileHashes = Object.fromEntries(Object.entries(SCHEMA_FILES).map(([name, value]) => [name, digest(value)]));
  const aggregate = Object.keys(fileHashes).sort((left, right) => Buffer.from(left).compare(Buffer.from(right)))
    .map((name) => `${fileHashes[name]}  ${name}\n`).join("");
  return Object.freeze({
    fileCount: Object.keys(fileHashes).length,
    aggregateSha256: digest(aggregate),
    fileHashes: Object.freeze(fileHashes),
  });
}

export function createFakeCodexFixture(constructionTempRoot, behavior = "clean") {
  if (!BEHAVIORS.has(behavior)) fail("FAKE_CODEX_BEHAVIOR_DENIED");
  const temporary = canonicalTempRoot(constructionTempRoot);
  const root = path.join(temporary, `codex-fixture-${behavior}`);
  if (fs.existsSync(root)) fail("FAKE_CODEX_ROOT_EXISTS");
  for (const token of [
    "bin", "build/schema", "tmp/neutral-cwd", "tmp/codex", "auth/home", "auth/fixture-state",
  ]) mkdir0700(path.join(root, ...token.split("/")));
  const executable = path.join(root, "bin/fixture-codex");
  const source = fixtureSource(behavior);
  fs.writeFileSync(executable, source, { encoding: "utf8", flag: "wx", mode: 0o500 });
  fs.chmodSync(executable, 0o500);
  return Object.freeze({
    root,
    executableSha256: digest(source),
    expectedHelpSha256: digest(HELP_BYTES),
    expectedSchema: expectedFixtureSchema(),
  });
}

export function cleanupFakeCodexFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
  if (fs.existsSync(root)) fail("FAKE_CODEX_CLEANUP_FAILED");
}

export async function inspectCodexAdapterConstruction(constructionTempRoot) {
  const sources = Object.fromEntries(constructedPaths.map((name) => [name, exactRead(name)]));
  const contract = JSON.parse(exactRead(contractPath));
  if (
    contract.distribution.npmVersion !== "0.145.0"
    || contract.distribution.darwinArm64BinarySha256 !== "1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590"
    || contract.authority.authorizedThreadStarts !== 0
    || contract.authority.authorizedTurnStarts !== 0
    || contract.authority.authorizedProviderSessions !== 0
  ) fail("CODEX_CONTRACT_AUTHORITY_DRIFT");
  for (const token of [
    "REAL_CODEX_DENIED_DURING_CONSTRUCTION", "CODEX_CLIENT_METHOD_DENIED_BEFORE_WRITE",
    "threadStarts: 0", "turnStarts: 0", "providerCalls: 0", "fixture-codex",
  ]) if (!sources["packages/r4-codex-adapter/src/app-server-probe.ts"].includes(token)) fail("CODEX_ADAPTER_CONTROL_DRIFT");
  validatePinnedCodexFixtures();
  const fixture = createFakeCodexFixture(constructionTempRoot, "clean");
  try {
    const result = await runAppServerProbe({
      root: fixture.root,
      authority: { mode: "fixture", sha256: fixture.executableSha256 },
      expectedHelpSha256: fixture.expectedHelpSha256,
      expectedSchema: fixture.expectedSchema,
    });
    if (result.classification !== "FIXTURE_GREEN") fail("FAKE_CODEX_PROBE_FAILED");
    return Object.freeze({
      schemaVersion: "r4_gate_b_codex_adapter_construction.v1",
      status: "GREEN_FAKE_EXECUTABLE_ONLY",
      fixtureExecutableCalls: 4,
      realCodexCalls: 0,
      threadStarts: result.threadStarts,
      turnStarts: result.turnStarts,
      providerCalls: result.providerCalls,
      providerBytes: result.providerBytes,
      schemaFileCount: result.schemaFileCount,
      clientWrites: result.clientWrites,
      cleanupPassed: true,
      fileHashes: Object.fromEntries(Object.entries(sources).map(([name, value]) => [name, digest(value)])),
    });
  } finally {
    cleanupFakeCodexFixture(fixture.root);
  }
}

const CORE_BEHAVIORS = new Set([
  "clean", "server_request", "unknown_notification", "duplicate_notification",
  "malformed", "invalid_result", "response_then_unknown", "nonzero", "stderr", "timeout", "huge_output", "unreaped",
  "descendant", "schema_missing", "schema_extra", "schema_nested",
]);

function coreSchemaFiles() {
  const files = {
    "codex_app_server_protocol.schemas.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/protocol-v1", type: "object" }) + "\n",
    "codex_app_server_protocol.v2.schemas.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/protocol-v2", type: "object" }) + "\n",
    "ClientRequest.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/client-request", type: "object" }) + "\n",
    "ClientNotification.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/client-notification", type: "object" }) + "\n",
    "ServerRequest.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/server-request", type: "object" }) + "\n",
    "ServerNotification.json": JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/server-notification", type: "object" }) + "\n",
    "InitializeResponse.json": JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "forme://synthetic/initialize-response",
      type: "object",
      additionalProperties: false,
      required: ["userAgent"],
      properties: { userAgent: { type: "string", minLength: 1, maxLength: 256 } },
    }) + "\n",
  };
  for (let index = 0; index < 266; index += 1) {
    const name = `Synthetic${String(index).padStart(3, "0")}.json`;
    files[name] = JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", $id: `forme://synthetic/${index}`, type: "object" }) + "\n";
  }
  if (Object.keys(files).length !== 273) fail("CORE_FAKE_SCHEMA_COUNT_INVALID");
  return Object.freeze(files);
}

export function expectedCoreFakeSchema() {
  const files = coreSchemaFiles();
  const fileHashes = Object.fromEntries(Object.entries(files).map(([name, value]) => [`./${name}`, `sha256:${digest(value)}`]));
  const names = Object.keys(fileHashes).sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  const aggregate = names.map((name) => `${fileHashes[name].slice(7)}  ${name}\n`).join("");
  const selectedNames = [
    "./codex_app_server_protocol.schemas.json", "./codex_app_server_protocol.v2.schemas.json",
    "./ClientRequest.json", "./ClientNotification.json", "./ServerRequest.json", "./ServerNotification.json",
  ];
  return Object.freeze({
    fileCount: 273,
    aggregateSha256: `sha256:${digest(aggregate)}`,
    selected: Object.freeze(Object.fromEntries(selectedNames.map((name) => [name, fileHashes[name]]))),
  });
}

function writeCoreFakeSchema(schemaRoot, behavior) {
  const files = { ...coreSchemaFiles() };
  if (behavior === "schema_missing") delete files["Synthetic265.json"];
  if (behavior === "schema_extra") files["Extra.json"] = "{}\n";
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(schemaRoot, name), value, { flag: "wx", mode: 0o600 });
  if (behavior === "schema_nested") {
    const nested = path.join(schemaRoot, "nested");
    mkdir0700(nested);
    fs.writeFileSync(path.join(nested, "Extra.json"), "{}\n", { flag: "wx", mode: 0o600 });
  }
}

export function createCoreFakeCodexLayout(constructionTempRoot, behavior = "clean") {
  if (!CORE_BEHAVIORS.has(behavior)) fail("CORE_FAKE_CODEX_BEHAVIOR_DENIED");
  const temporary = canonicalTempRoot(constructionTempRoot);
  const root = path.join(temporary, `codex-core-fixture-${behavior}`);
  if (fs.existsSync(root)) fail("CORE_FAKE_CODEX_ROOT_EXISTS");
  mkdir0700(root);
  const layout = coreCodexLayout(root);
  for (const directory of [
    path.dirname(layout.stagedCodex), path.dirname(layout.stagedProfile), layout.schemaRoot,
    layout.neutralCwd, layout.home, layout.codexHome, layout.tmpdir,
    path.dirname(layout.evidencePath),
  ]) mkdir0700(directory);
  fs.writeFileSync(layout.stagedCodex, "FORME_GATE_B_CORE_FAKE_CODEX_V1\n", { flag: "wx", mode: 0o500 });
  fs.chmodSync(layout.stagedCodex, 0o500);
  const profile = exactRead("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb");
  fs.writeFileSync(layout.stagedProfile, profile, { flag: "wx", mode: 0o600 });
  fs.chmodSync(layout.stagedProfile, 0o600);
  return Object.freeze({ root, layout, behavior });
}

export function createCoreMemorySpawnPort(fixture) {
  const commands = [];
  let cleanupCalls = 0;
  let initializeClientWrites = 0;
  const initializeFixture = JSON.parse(exactRead("fixtures/r4-gate-b-core/codex/initialize-result.json"));
  const resultObject = initializeFixture.result;
  return Object.freeze({
    mode: "construction_fake",
    get commands() { return commands; },
    get cleanupCalls() { return cleanupCalls; },
    get initializeClientWrites() { return initializeClientWrites; },
    async run(command, wireGuard) {
      commands.push(command);
      if (command.kind === "schema") writeCoreFakeSchema(fixture.layout.schemaRoot, fixture.behavior);
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let lines = [];
      let exitCode = 0;
      let timedOut = false;
      let reaped = true;
      let absent = true;
      let descendants = 0;
      if (command.kind === "version") stdout = Buffer.from(CORE_CODEX_VERSION);
      if (command.kind === "help") stdout = Buffer.from("synthetic Codex app-server help\n");
      if (command.kind === "initialize") {
        if (!wireGuard) fail("CORE_WIRE_GUARD_REQUIRED");
        initializeClientWrites = 1;
        const notification = { method: "remoteControl/status/changed", params: { status: "disabled", machineName: "synthetic-machine-secret", installationId: "synthetic-install-secret" } };
        const response = { id: 0, result: fixture.behavior === "invalid_result" ? { userAgent: 7 } : resultObject };
        if (fixture.behavior === "server_request") lines = [Buffer.from(JSON.stringify({ id: 9, method: "thread/start", params: {} }))];
        else if (fixture.behavior === "unknown_notification") lines = [Buffer.from(JSON.stringify({ method: "thread/started", params: {} }))];
        else if (fixture.behavior === "duplicate_notification") lines = [Buffer.from(JSON.stringify(notification)), Buffer.from(JSON.stringify(notification)), Buffer.from(JSON.stringify(response))];
        else if (fixture.behavior === "response_then_unknown") lines = [Buffer.from(JSON.stringify(response)), Buffer.from(JSON.stringify({ method: "thread/started", params: {} }))];
        else if (fixture.behavior === "malformed") lines = [Buffer.from("{bad")];
        else lines = [Buffer.from(JSON.stringify(notification)), Buffer.from(JSON.stringify(response))];
        stdout = Buffer.from(lines.map((line) => `${line.toString("utf8")}\n`).join(""));
        let shouldWriteInitialized = false;
        try {
          for (const line of lines) if (wireGuard.acceptLine(line)) shouldWriteInitialized = true;
        } catch (error) {
          stdout.fill(0);
          stderr.fill(0);
          for (const line of lines) line.fill(0);
          throw error;
        }
        if (shouldWriteInitialized) initializeClientWrites += 1;
        if (fixture.behavior === "descendant") descendants = 1;
      }
      if (fixture.behavior === "nonzero") exitCode = 7;
      if (fixture.behavior === "stderr") stderr = Buffer.from("synthetic stderr secret");
      if (fixture.behavior === "timeout") timedOut = true;
      if (fixture.behavior === "huge_output") stdout = Buffer.alloc(command.stdoutLimitBytes + 1, 65);
      if (fixture.behavior === "unreaped") { reaped = false; absent = false; }
      return Object.freeze({
        stdout, stderr, exitCode, timedOut,
        processGroupStarted: true,
        processGroupReaped: reaped,
        processGroupAbsent: absent,
        syntheticDescendantsStarted: descendants,
        clientWrites: command.kind === "initialize" ? initializeClientWrites : 0,
        trailingBytes: 0,
        handshakeExitLatencyMilliseconds: command.kind === "initialize" ? 1 : 0,
        lines,
      });
    },
    async cleanup() { cleanupCalls += 1; return true; },
  });
}

export function coreSyntheticPublicHashes(fixture) {
  const profile = fs.readFileSync(fixture.layout.stagedProfile);
  const native = fs.readFileSync(fixture.layout.stagedCodex);
  try {
    return Object.freeze({
      profileSourceSha256: `sha256:${digest(profile)}`,
      profileStagedSha256: `sha256:${digest(profile)}`,
      launcherSourceSha256: `sha256:${digest("FORME_GATE_B_CORE_SYNTHETIC_LAUNCHER_V1\n")}`,
      nativeSourceSha256: `sha256:${digest(native)}`,
      nativeStagedSha256: `sha256:${digest(native)}`,
    });
  } finally {
    profile.fill(0);
    native.fill(0);
  }
}

function immediateConstructionTiming(onSchedule = () => {}, onNow = () => {}) {
  let now = 0;
  return Object.freeze({
    setTimeout(callback, milliseconds) {
      onSchedule(milliseconds);
      const token = { active: true };
      token.handle = setImmediate(() => {
        if (!token.active) return;
        now += milliseconds;
        callback();
      });
      return token;
    },
    clearTimeout(token) {
      if (token && token.active) {
        token.active = false;
        clearImmediate(token.handle);
      }
    },
    now() { onNow(); return now; },
  });
}

function compilePhysicalCodexEvidenceProjection() {
  const schemaPath = path.join(repositoryRoot, "schemas/r4/gate-b-core/physical-retry-evidence.schema.json");
  const stat = fs.lstatSync(schemaPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(schemaPath) !== schemaPath || stat.size < 1 || stat.size > 1_048_576) fail("CORE_SHARED_EVIDENCE_SCHEMA_UNSAFE");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  if (!schema?.$defs?.codex) fail("CORE_SHARED_EVIDENCE_SCHEMA_MISSING");
  const validator = new Ajv2020({ strict: true, allErrors: false }).compile(schema.$defs.codex);
  return (value) => validator(value) === true;
}

function physicalCodexEvidenceProjection(evidence) {
  return Object.freeze({
    status: "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN",
    reportedVersion: evidence.reportedVersion,
    schemaFileCount: evidence.schemaFileCount,
    // The synthetic 273-file fixture has its own aggregate; the physical
    // projection binds the separately frozen production aggregate while every
    // other observable field is carried from the actual shared-factory result.
    schemaAggregateSha256: "sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62",
    processStartSlotsConsumed: evidence.processStartSlotsConsumed,
    processGroupsStarted: evidence.processGroupsStarted,
    clientWrites: evidence.clientWrites,
    serverResponses: evidence.serverResponses,
    serverRequests: evidence.serverRequests,
    serverNotifications: evidence.serverNotifications,
    receiveBufferEmptyBeforeSecondWrite: evidence.receiveBufferEmptyBeforeSecondWrite,
    preSecondWriteViolationObserved: evidence.preSecondWriteViolationObserved,
    postSecondWriteViolationObserved: evidence.postSecondWriteViolationObserved,
    allStartedGroupsReaped: evidence.allStartedGroupsReaped,
    allStartedGroupsAbsent: evidence.allStartedGroupsAbsent,
    exitCodes: evidence.exitCodes,
    stderrBytes: evidence.stderrBytes,
    schemaStdoutBytes: evidence.schemaStdoutBytes,
    threadStarts: evidence.threadStarts,
    turnStarts: evidence.turnStarts,
    providerCalls: evidence.providerCalls,
    providerBytes: evidence.providerBytes,
    networkAuthority: evidence.networkAuthority,
    networkTransmittedBytes: evidence.networkTransmittedBytes,
    networkSyscallAttemptAbsenceClaimed: evidence.networkSyscallAttemptAbsenceClaimed,
    causalFinality: evidence.causalFinality,
    postResponseFinalityProven: evidence.postResponseFinalityProven,
    aiLaneEnabled: evidence.aiLaneEnabled,
    cleanupStatus: evidence.cleanupStatus,
  });
}

function journalFaultFromCase(caseId) {
  const ordinary = /^journal-(intent|started|terminal)-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
  if (ordinary !== null) return Object.freeze({ event: `${ordinary[1]}:${ordinary[2]}`, side: ordinary[3] });
  const cleanup = /^journal-cleanup-observed-absent-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
  return cleanup === null ? null : Object.freeze({ event: `cleanup-observed-absent:${cleanup[1]}`, side: cleanup[2] });
}

function schemaBehaviorFromCase(caseId) {
  if (caseId === "schema-missing") return "schema_missing";
  if (caseId === "schema-extra") return "schema_extra";
  if (caseId === "schema-nested") return "schema_nested";
  return "clean";
}

function mutateCommandForSharedCase(command, mutationMode) {
  if (mutationMode === "argv-extra") return Object.freeze({ ...command, argv: Object.freeze([...command.argv, "denied-extra"]) });
  if (mutationMode === "argv-missing") return Object.freeze({ ...command, argv: Object.freeze(command.argv.slice(0, -1)) });
  if (mutationMode === "argv-reordered") {
    const argv = [...command.argv];
    const last = argv.length - 1;
    [argv[last], argv[last - 1]] = [argv[last - 1], argv[last]];
    return Object.freeze({ ...command, argv: Object.freeze(argv) });
  }
  if (mutationMode === "argv-value") {
    const argv = [...command.argv];
    argv[argv.length - 1] = `${argv.at(-1)}-denied`;
    return Object.freeze({ ...command, argv: Object.freeze(argv) });
  }
  if (mutationMode === "env-extra") return Object.freeze({ ...command, environment: Object.freeze({ ...command.environment, INHERITED: "denied" }) });
  if (mutationMode === "env-missing") {
    const environment = { ...command.environment };
    delete environment.NO_COLOR;
    return Object.freeze({ ...command, environment: Object.freeze(environment) });
  }
  if (mutationMode === "env-value") return Object.freeze({ ...command, environment: Object.freeze({ ...command.environment, PATH: "/denied" }) });
  if (mutationMode === "cwd") return Object.freeze({ ...command, cwd: path.dirname(command.cwd) });
  if (mutationMode === "deadline") return Object.freeze({ ...command, deadlineMilliseconds: command.deadlineMilliseconds + 1 });
  if (mutationMode === "output-ceiling") return Object.freeze({ ...command, stdoutLimitBytes: command.stdoutLimitBytes + 1 });
  return command;
}

/**
 * Builds the body-free callback consumed by runConstructionFakeMatrix.  It
 * runs every case through the injected shared production orchestration
 * factory, but its children, clock, process groups and journal are entirely
 * synthetic and bounded below one caller-owned private temp root. Production
 * Construction defers filesystem deletion to its authenticated top-root
 * authority; standalone callers retain the default per-case cleanup.
 */
export function createCoreSharedOrchestrationCaseExecutor({ constructionTempRoot, createOrchestrator, deferFilesystemCleanupToConstructionRoot = false }) {
  const privateRoot = canonicalTempRoot(constructionTempRoot);
  if (typeof createOrchestrator !== "function") fail("CORE_SHARED_ORCHESTRATOR_FACTORY_REQUIRED");
  if (typeof deferFilesystemCleanupToConstructionRoot !== "boolean") fail("CORE_SHARED_FILESYSTEM_CLEANUP_POLICY_INVALID");
  const validateEvidenceProjection = compilePhysicalCodexEvidenceProjection();
  let caseSequence = 0;
  return async function runSharedCase(spec) {
    if (spec === null || typeof spec !== "object" || typeof spec.caseId !== "string" || typeof spec.faultClass !== "string") fail("CORE_SHARED_CASE_SPEC_INVALID");
    caseSequence += 1;
    const caseRoot = path.join(privateRoot, `codex-shared-${String(caseSequence).padStart(3, "0")}`);
    mkdir0700(caseRoot);
    const fixture = createCoreFakeCodexLayout(caseRoot, schemaBehaviorFromCase(spec.caseId));
    const fakeWrapper = path.join(fixture.root, "shared-fake-wrapper");
    const fakeWrapperMarker = Buffer.from("FORME_GATE_B_CORE_SHARED_FAKE_WRAPPER_V1\n", "utf8");
    fs.writeFileSync(fakeWrapper, fakeWrapperMarker, { flag: "wx", mode: 0o500 });
    fs.chmodSync(fakeWrapper, 0o500);
    const fakeWrapperStat = fs.lstatSync(fakeWrapper);
    const fakeWrapperBytes = fs.readFileSync(fakeWrapper);
    const fakeWrapperIdentityValid = fakeWrapperStat.isFile() && !fakeWrapperStat.isSymbolicLink() && fakeWrapperStat.uid === process.getuid() && fakeWrapperStat.nlink === 1
      && (fakeWrapperStat.mode & 0o777) === 0o500 && fs.realpathSync(fakeWrapper) === fakeWrapper
      && digest(fakeWrapperBytes) === digest(fakeWrapperMarker);
    fakeWrapperBytes.fill(0);
    fakeWrapperMarker.fill(0);
    if (!fakeWrapperIdentityValid) fail("CORE_SHARED_FAKE_WRAPPER_UNSAFE");
    const memoryPort = createCoreMemorySpawnPort(fixture);
    const expectedSchema = { ...expectedCoreFakeSchema(), selected: { ...expectedCoreFakeSchema().selected } };
    const publicHashes = coreSyntheticPublicHashes(fixture);
    const journalFault = journalFaultFromCase(spec.caseId);
    const journalLines = [];
    const journalRecords = [];
    let priorJournalSha256 = null;
    let journalFaultObserved = false;
    let journalInputShapeValidated = true;
    let journalInputRejectionObserved = false;
    let startedFsyncObserved = new Set();
    const validateJournalInput = (partial, productionInput = true) => {
      const match = /^(intent|started|terminal|cleanup-observed-absent):(version|help|schema|initialize)$/u.exec(partial?.event);
      const marker = match?.[1] ?? null;
      const kind = match?.[2] ?? null;
      const expectedCommandShapeSha256 = kind === null ? null : `sha256:${digest(Buffer.from(canonicalJson(buildCoreCodexLogicalCommand(fixture.layout, kind)), "utf8"))}`;
      const keys = marker === "intent"
        ? ["lane", "event", "commandShapeSha256", "ownedResources", "cleanupState"]
        : marker === "started"
          ? ["lane", "event", "commandShapeSha256", "processGroupId", "ownedResources", "cleanupState"]
          : ["terminal", "cleanup-observed-absent"].includes(marker)
            ? ["lane", "event", "commandShapeSha256", "processGroupId", "ownedResources", "terminalCode", "cleanupState"]
            : [];
      const actualKeys = partial !== null && typeof partial === "object" && !Array.isArray(partial) ? Object.keys(partial).sort() : [];
      const expectedKeys = [...keys].sort();
      const exactKeys = actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]);
      const valid = exactKeys
        && partial.lane === "codex"
        && /^sha256:[0-9a-f]{64}$/u.test(partial.commandShapeSha256)
        && partial.commandShapeSha256 === expectedCommandShapeSha256
        && Array.isArray(partial.ownedResources)
        && canonicalJson(partial.ownedResources) === canonicalJson(["codex-process-group", "codex-stdio"])
        && (marker === "intent" || (Number.isSafeInteger(partial.processGroupId) && partial.processGroupId > 1 && children.get(partial.processGroupId)?.command.kind === kind))
        && (!["terminal", "cleanup-observed-absent"].includes(marker) || typeof partial.terminalCode === "string")
        && (marker === "terminal"
          ? (partial.terminalCode === "NO_TERMINAL" || /^(?:0|-?[1-9][0-9]*)$/u.test(partial.terminalCode))
            && ["observed-absent", "quarantined"].includes(partial.cleanupState)
          : marker === "cleanup-observed-absent"
            ? partial.terminalCode === "ABSENT" && partial.cleanupState === "observed-absent"
            : partial.cleanupState === "required");
      if (!valid) {
        if (productionInput) journalInputShapeValidated = false;
        fail("CORE_SHARED_JOURNAL_INPUT_INVALID");
      }
      return marker;
    };
    const journal = Object.freeze({
      records() { return Object.freeze([...journalRecords]); },
      async append(partial) {
        validateJournalInput(partial);
        if (spec.faultClass === "JOURNAL_INPUT_CANARY" && !journalInputRejectionObserved) {
          const key = spec.caseId.includes("body-canary") ? "responseText"
            : spec.caseId.includes("path-canary") ? "privatePath"
              : "machineIdentity";
          try {
            validateJournalInput({ ...partial, [key]: "synthetic-canary" }, false);
            fail("CORE_SHARED_JOURNAL_CANARY_ACCEPTED");
          } catch (error) {
            if (error?.code !== "CORE_SHARED_JOURNAL_INPUT_INVALID") throw error;
            journalInputRejectionObserved = true;
            throw error;
          }
        }
        const matchesFault = journalFault !== null && journalFault.event === partial.event && !journalFaultObserved;
        if (matchesFault && journalFault.side === "before") { journalFaultObserved = true; throw new Error(`CORE_SHARED_JOURNAL_FAULT_BEFORE:${partial.event}`); }
        const record = Object.freeze({
          schemaVersion: "r4_gate_b_physical_journal.v1",
          sequence: journalRecords.length,
          previousRecordSha256: priorJournalSha256,
          runId: "c".repeat(32),
          manifestSha256: null,
          hostBindingId: null,
          lane: partial.lane,
          event: partial.event,
          commandShapeSha256: partial.commandShapeSha256 ?? null,
          processGroupId: partial.processGroupId ?? null,
          ownedResources: partial.ownedResources ?? [],
          terminalCode: partial.terminalCode ?? null,
          cleanupState: partial.cleanupState ?? "required",
        });
        const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
        journalRecords.push(record);
        journalLines.push(bytes);
        priorJournalSha256 = `sha256:${digest(bytes)}`;
        if (partial.event.startsWith("started:")) startedFsyncObserved.add(partial.event.slice("started:".length));
        if (matchesFault && journalFault.side === "after") { journalFaultObserved = true; throw new Error(`CORE_SHARED_JOURNAL_FAULT_AFTER:${partial.event}`); }
        return record;
      },
    });
    const observations = {
      processStartSlotsConsumed: 0,
      processGroupsStarted: 0,
      clientWrites: 0,
      termSignals: 0,
      killSignals: 0,
      stdinErrors: 0,
      esrchObservations: 0,
      epermObservations: 0,
      unknownAbsenceObservations: 0,
      syntheticDescendantsStarted: 0,
      mutationBeforeSpawnRejected: false,
      inMemoryFakeExecutorBoundaryProven: true,
      inMemoryFakeWrapperSubstitutionProven: true,
      clientWriteBytesValidated: true,
      releaseOrderingViolation: false,
      stdioCloseBeforeSignalViolation: false,
      writeAfterStdioCloseViolation: false,
      emittedBuffers: [],
      timerScheduleMilliseconds: [],
      initializedWriteTimerEvents: [],
      retryStarts: 0,
      fifthStarts: 0,
      alternateExecutableStarts: 0,
    };
    const children = new Map();
    const startedKinds = new Set();
    const initializeFixture = JSON.parse(exactRead("fixtures/r4-gate-b-core/codex/initialize-result.json")).result;
    const cleanCase = spec.caseId === "clean-notification-before-response-four-start";
    const exitGraceHangCase = ["start-4-response-then-hang-term", "start-4-response-then-hang-kill"].includes(spec.caseId);
    const groupCase = spec.caseId.includes("group-eperm") || spec.caseId.includes("group-unknown");
    const cleanupMarkerFaultMatch = /^journal-cleanup-observed-absent-(version|help|schema|initialize)-(before|after)$/u.exec(spec.caseId);
    const cleanupMarkerFaultKind = cleanupMarkerFaultMatch?.[1] ?? null;
    const persistentGroupCase = spec.caseId.endsWith("-persistent");
    const descendantCase = spec.caseId.includes("adversarial-descendant");
    let evidenceSchemaRejectionObserved = false;

    const emitOwned = (emitter, bytes) => {
      const source = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      const owned = Buffer.from(source);
      observations.emittedBuffers.push(source, owned);
      try { emitter.emit("data", owned); } finally { owned.fill(0); source.fill(0); }
    };
    const writeAllowedHome = () => {
      for (const name of CORE_CODEX_ALLOWED_HOME) {
        const candidate = path.join(fixture.layout.codexHome, name);
        if (["skills", ".tmp", "tmp"].includes(name)) mkdir0700(candidate);
        else fs.writeFileSync(candidate, "synthetic-state", { flag: "wx", mode: 0o600 });
      }
    };
    const mutateSchemaAfterGeneration = () => {
      if (!["schema-dialect", "schema-ref-closure", "schema-selected-hash"].includes(spec.caseId)) return;
      const target = spec.caseId === "schema-selected-hash"
        ? path.join(fixture.layout.schemaRoot, "ClientRequest.json")
        : path.join(fixture.layout.schemaRoot, "InitializeResponse.json");
      const value = spec.caseId === "schema-dialect"
        ? { $schema: "https://attacker.invalid/schema", type: "object" }
        : spec.caseId === "schema-ref-closure"
          ? { $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/initialize-response", $ref: "./Missing.json" }
          : { $schema: "http://json-schema.org/draft-07/schema#", $id: "forme://synthetic/client-request-mutated", type: "object" };
      fs.writeFileSync(target, `${JSON.stringify(value)}\n`, { flag: "w", mode: 0o600 });
      if (["schema-dialect", "schema-ref-closure"].includes(spec.caseId)) {
        const inventory = computeSchemaInventory(fixture.layout.schemaRoot, Object.keys(expectedSchema.selected));
        expectedSchema.fileCount = inventory.fileCount;
        expectedSchema.aggregateSha256 = inventory.aggregateSha256;
        expectedSchema.selected = Object.fromEntries(Object.keys(expectedSchema.selected).map((name) => [name, inventory.files[name].sha256]));
      } else if (spec.caseId === "schema-selected-hash") {
        const inventory = computeSchemaInventory(fixture.layout.schemaRoot, Object.keys(expectedSchema.selected));
        expectedSchema.fileCount = inventory.fileCount;
        expectedSchema.aggregateSha256 = inventory.aggregateSha256;
      }
    };
    const initializeChunks = () => {
      const notification = `${JSON.stringify({ method: "remoteControl/status/changed", params: { status: "disabled", machineName: "synthetic-machine-secret", installationId: "synthetic-install-secret" } })}\n`;
      const response = `${JSON.stringify({ id: 0, result: spec.caseId === "wire-invalid-result" ? { userAgent: 7 } : initializeFixture })}\n`;
      if (groupCase || spec.caseId === "wire-server-request-before-response") return [`${JSON.stringify({ id: 9, method: "thread/start", params: {} })}\n`];
      if (spec.caseId === "wire-unknown-notification-before-response") return [`${JSON.stringify({ method: "thread/started", params: {} })}\n`];
      if (spec.caseId === "wire-duplicate-notification") return [`${notification}${notification}${response}`];
      if (spec.caseId === "wire-response-full-line-same-chunk") return [`${response}${JSON.stringify({ id: 9, method: "thread/start", params: {} })}\n`];
      if (spec.caseId === "wire-response-partial-same-chunk") return [`${response}{`];
      if (spec.caseId === "wire-response-unknown-next-chunk") return [response, `${JSON.stringify({ method: "thread/started", params: {} })}\n`];
      if (spec.caseId === "wire-notification-after-response") return [`${response}${notification}`];
      if (spec.caseId === "wire-duplicate-response") return [`${response}${response}`];
      if (spec.caseId === "wire-malformed") return ["{bad\n"];
      if (spec.caseId === "wire-oversize-line") return ["x".repeat(1_048_577)];
      if (spec.caseId === "wire-trailing-buffer") return [`${notification}{`];
      return [`${notification}${response}`];
    };

    const stopSyntheticGroup = async (pid) => {
      const child = children.get(pid);
      if (!child || child.logicalAbsent) return true;
      if (cleanupMarkerFaultKind === child.command.kind) {
        child.absenceAttempts += 1;
        if (child.absenceAttempts === 1) { observations.unknownAbsenceObservations += 1; return false; }
        child.logicalAbsent = true;
        child.close(0, null);
        observations.esrchObservations += 1;
        return true;
      }
      if (child.slot === 4 && groupCase) {
        child.absenceAttempts += 1;
        if (child.absenceAttempts === 1) {
          if (spec.caseId.includes("eperm")) observations.epermObservations += 1;
          else observations.unknownAbsenceObservations += 1;
          return false;
        }
        if (!child.allStdioClosed()) observations.stdioCloseBeforeSignalViolation = true;
        observations.termSignals += 1;
        if (persistentGroupCase) {
          if (!child.allStdioClosed()) observations.stdioCloseBeforeSignalViolation = true;
          observations.killSignals += 1;
          if (spec.caseId.includes("eperm")) observations.epermObservations += 1;
          else observations.unknownAbsenceObservations += 1;
          return false;
        }
        child.logicalAbsent = true;
        child.close(0, null);
        for (const descendant of child.descendants) descendant.closed = true;
        observations.esrchObservations += 1;
        return true;
      }
      if (child.slot === 4 && descendantCase) {
        if (!child.allStdioClosed()) observations.stdioCloseBeforeSignalViolation = true;
        observations.termSignals += 1;
        for (const descendant of child.descendants) if (!descendant.ignoresTerm) descendant.closed = true;
        if (child.descendants.some((descendant) => !descendant.closed)) {
          if (!child.allStdioClosed()) observations.stdioCloseBeforeSignalViolation = true;
          observations.killSignals += 1;
          for (const descendant of child.descendants) descendant.closed = true;
        }
      }
      child.logicalAbsent = true;
      child.close(0, null);
      observations.esrchObservations += 1;
      return true;
    };

    const spawnChild = async (command) => {
      observations.processStartSlotsConsumed += 1;
      const slot = observations.processStartSlotsConsumed;
      validateCoreCodexLogicalCommand(fixture.layout, command);
      if (command.argv[0] !== "/usr/bin/sandbox-exec" || command.cwd !== fixture.layout.neutralCwd || Object.keys(command.environment).length !== 6) observations.inMemoryFakeExecutorBoundaryProven = false;
      const substitutedArgv = [fakeWrapper, ...command.argv.slice(1)];
      if (substitutedArgv[0] !== fakeWrapper || substitutedArgv.length !== command.argv.length || substitutedArgv.slice(1).some((value, index) => value !== command.argv[index + 1])) {
        observations.inMemoryFakeWrapperSubstitutionProven = false;
        observations.alternateExecutableStarts += 1;
      }
      if ((spec.caseId === "spawn-call-rejected-slot-1" && slot === 1) || (spec.caseId === "spawn-call-rejected-slot-4" && slot === 4)) throw new Error(`CORE_SHARED_SPAWN_REJECTED:${slot}`);
      const pid = 10_000 + caseSequence * 10 + slot;
      observations.processGroupsStarted += 1;
      if (startedKinds.has(command.kind)) observations.retryStarts += 1;
      startedKinds.add(command.kind);
      if (observations.processGroupsStarted > 4) observations.fifthStarts += 1;
      const childEmitter = new EventEmitter();
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const stdin = new EventEmitter();
      const stdioState = { stdin: false, stdout: false, stderr: false };
      stdin.destroy = () => { stdioState.stdin = true; return stdin; };
      stdout.destroy = () => { stdioState.stdout = true; return stdout; };
      stderr.destroy = () => { stdioState.stderr = true; return stderr; };
      let initializeOutputSent = false;
      const child = {
        pid,
        slot,
        command,
        stdin,
        stdout,
        stderr,
        logicalAbsent: false,
        closed: false,
        released: false,
        absenceAttempts: 0,
        descendants: descendantCase && slot === 4 ? [{ closed: false, ignoresTerm: spec.caseId.endsWith("-kill") }] : [],
        zeroizationReports: [],
        allStdioClosed() { return stdioState.stdin && stdioState.stdout && stdioState.stderr; },
        once: childEmitter.once.bind(childEmitter),
        close(code = 0, signal = null) {
          if (!child.closed) {
            stdin.destroy(); stdout.destroy(); stderr.destroy();
            child.closed = true;
            childEmitter.emit("close", code, signal);
          }
        },
        async abortBeforeRelease() {
          if (child.released) throw new Error("CORE_SHARED_ABORT_AFTER_RELEASE");
          child.logicalAbsent = true;
          child.close(0, null);
          observations.esrchObservations += 1;
          return true;
        },
        async release() {
          child.released = true;
          if (!startedFsyncObserved.has(command.kind)) observations.releaseOrderingViolation = true;
          if (command.kind === "initialize") return;
          if (spec.caseId === "start-3-oversize" && slot === 3) {
            emitOwned(stdout, Buffer.alloc(command.stdoutLimitBytes + 1, 0x41));
            return;
          }
          const result = await memoryPort.run(command);
          try {
            if (command.kind === "schema") mutateSchemaAfterGeneration();
            if (result.stdout.length > 0) emitOwned(stdout, result.stdout);
            if ((spec.caseId === "start-1-stderr" && slot === 1) || result.stderr.length > 0) emitOwned(stderr, Buffer.from("synthetic stderr", "utf8"));
            child.close(spec.caseId === "start-2-nonzero" && slot === 2 ? 7 : result.exitCode);
          } finally {
            result.stdout.fill(0);
            result.stderr.fill(0);
            for (const line of result.lines ?? []) line.fill(0);
          }
        },
        signalGroup(signal) {
          if (!child.allStdioClosed()) observations.stdioCloseBeforeSignalViolation = true;
          if (signal === "SIGTERM") observations.termSignals += 1;
          else if (signal === "SIGKILL") observations.killSignals += 1;
          if (groupCase) return false;
          if (["start-4-timeout-kill", "start-4-response-then-hang-kill"].includes(spec.caseId) && signal === "SIGTERM") return false;
          child.close(signal === "SIGKILL" ? -1 : 0, signal);
          return true;
        },
        async stopAndProveAbsent() { return await stopSyntheticGroup(pid); },
        observeOrchestratorZeroization(summary) {
          const keys = summary !== null && typeof summary === "object" ? Object.keys(summary).sort() : [];
          if (canonicalJson(keys) !== canonicalJson(["bufferCount", "nonzeroBytes"])) observations.inMemoryFakeExecutorBoundaryProven = false;
          child.zeroizationReports.push(Object.freeze({ bufferCount: summary?.bufferCount, nonzeroBytes: summary?.nonzeroBytes }));
        },
        observeInitializedFramePrepared() { observations.initializedWriteTimerEvents.push("initialized-frame-prepared"); },
      };
      stdin.write = (bytes) => {
        if (command.kind !== "initialize") return true;
        if (stdioState.stdin) observations.writeAfterStdioCloseViolation = true;
        const expected = guardClientMessage(initializeMessage());
        if (typeof bytes !== "string" || bytes !== expected) observations.clientWriteBytesValidated = false;
        observations.clientWrites += 1;
        if (spec.caseId === "start-4-stdin-epipe-before-response" && observations.clientWrites === 1) {
          observations.stdinErrors += 1;
          stdin.emit("error", Object.assign(new Error("synthetic EPIPE"), { code: "EPIPE" }));
          return false;
        }
        if (!initializeOutputSent) {
          initializeOutputSent = true;
          if (!["start-4-timeout-term", "start-4-timeout-kill"].includes(spec.caseId)) {
            const chunks = initializeChunks();
            for (const chunk of chunks) emitOwned(stdout, chunk);
            if (spec.caseId === "wire-trailing-buffer") child.close(0);
          }
        }
        return true;
      };
      stdin.end = (bytes) => {
        if (command.kind !== "initialize") return true;
        if (stdioState.stdin) observations.writeAfterStdioCloseViolation = true;
        if (bytes !== undefined) {
          observations.initializedWriteTimerEvents.push("initialized-end");
          const expected = guardClientMessage(initializedMessage());
          if (typeof bytes !== "string" || bytes !== expected) observations.clientWriteBytesValidated = false;
          observations.clientWrites += 1;
        }
        if (spec.caseId === "start-4-stdin-epipe-second-write" && bytes !== undefined) {
          observations.stdinErrors += 1;
          stdin.emit("error", Object.assign(new Error("synthetic EPIPE"), { code: "EPIPE" }));
          return false;
        }
        if (bytes !== undefined) {
          if (cleanCase) writeAllowedHome();
          if (spec.caseId === "isolated-home-write-escape") fs.writeFileSync(path.join(fixture.layout.codexHome, "unknown.sqlite"), "synthetic", { flag: "wx", mode: 0o600 });
          if (spec.caseId === "private-canary-detected") fs.writeFileSync(path.join(fixture.layout.home, "session.txt"), "prompt: synthetic-private-canary", { flag: "wx", mode: 0o600 });
          if (spec.caseId === "schema-toctou-after-initialize") fs.appendFileSync(path.join(fixture.layout.schemaRoot, "InitializeResponse.json"), " ");
          if (spec.caseId !== "wire-response-unknown-next-chunk" && !exitGraceHangCase) child.close(0);
        }
        return true;
      };
      children.set(pid, child);
      observations.syntheticDescendantsStarted += child.descendants.length;
      return child;
    };

    const rawPort = createOrchestrator({
      layout: fixture.layout,
      journal,
      spawnChild,
      stopProcessGroup: stopSyntheticGroup,
      timing: immediateConstructionTiming((milliseconds) => {
        observations.timerScheduleMilliseconds.push(milliseconds);
        observations.initializedWriteTimerEvents.push(`timer:${milliseconds}`);
      }, () => observations.initializedWriteTimerEvents.push("timing-now")),
    });
    let portCleanupCalls = 0;
    const port = Object.freeze({
      mode: rawPort.mode,
      run: rawPort.run.bind(rawPort),
      async cleanup() {
        portCleanupCalls += 1;
        return await rawPort.cleanup();
      },
    });
    let evidence = null;
    let invocationError = null;
    try {
      if (spec.faultClass === "COMMAND_MUTATION") {
        const command = mutateCommandForSharedCase(buildCoreCodexLogicalCommand(fixture.layout, spec.commandKind), spec.mutationMode);
        try { await port.run(command); }
        catch (error) { invocationError = error; observations.mutationBeforeSpawnRejected = observations.processStartSlotsConsumed === 0; }
        await port.cleanup();
      } else {
        try {
          evidence = await runCoreCodexZeroCall({ layout: fixture.layout, spawnPort: port, expectedSchema, publicHashes });
        } catch (error) { invocationError = error; }
      }
      const sawQuarantine = observations.epermObservations + observations.unknownAbsenceObservations > 0;
      if (!sawQuarantine || cleanupMarkerFaultKind !== null) await port.cleanup();
      if (spec.caseId.startsWith("evidence-")) {
        if (evidence === null || !validateEvidenceProjection(physicalCodexEvidenceProjection(evidence))) fail("CORE_SHARED_CLEAN_EVIDENCE_PROJECTION_INVALID");
        const mutated = { ...physicalCodexEvidenceProjection(evidence) };
        if (spec.caseId === "evidence-schema-required-field-rejected") delete mutated.status;
        else if (spec.caseId === "evidence-schema-wrong-type-rejected") mutated.providerCalls = "0";
        else if (spec.caseId === "evidence-schema-wrong-enum-rejected") mutated.cleanupStatus = "UNKNOWN";
        else {
          const canaryKey = spec.caseId === "evidence-body-canary-rejected" ? "responseText"
            : spec.caseId === "evidence-path-canary-rejected" ? "privatePath"
              : spec.caseId === "evidence-pid-canary-rejected" ? "processGroupId"
                : spec.caseId === "evidence-wire-canary-rejected" ? "rawWire"
                  : spec.caseId === "evidence-argv-canary-rejected" ? "argv"
                    : spec.caseId === "evidence-env-canary-rejected" ? "environment"
                      : spec.caseId === "evidence-schema-body-canary-rejected" ? "schemaBody"
                        : spec.caseId === "evidence-private-inventory-canary-rejected" ? "privateInventory"
                          : spec.caseId === "evidence-stable-identity-canary-rejected" ? "machineIdentity"
                            : "extra";
          mutated[canaryKey] = "synthetic-canary";
        }
        evidenceSchemaRejectionObserved = !validateEvidenceProjection(mutated);
      }
      const allProcessGroupsAbsent = [...children.values()].every((child) => child.logicalAbsent);
      const unresolved = [...children.values()].filter((child) => !child.logicalAbsent);
      const descendantGroupCleanupObserved = descendantCase
        && observations.syntheticDescendantsStarted === 1
        && allProcessGroupsAbsent
        && [...children.values()].every((child) => child.descendants.every((descendant) => descendant.closed));
      const releasedChildren = [...children.values()].filter((child) => child.released);
      const ownedBufferZeroizationPassed = releasedChildren.every((child) => child.zeroizationReports.length > 0
        && child.zeroizationReports.every((report) => Number.isSafeInteger(report.bufferCount) && report.bufferCount >= 3 && report.nonzeroBytes === 0));
      const fakeEmitterBufferZeroizationPassed = observations.emittedBuffers.every((buffer) => buffer.every((byte) => byte === 0));
      const ownedStdioClosedBeforeReturn = [...children.values()].every((child) => child.allStdioClosed());
      for (const child of children.values()) {
        child.close(0, null);
        for (const descendant of child.descendants) descendant.closed = true;
      }
      const syntheticChildHandlesClosedAtReturn = [...children.values()].every((child) => child.closed && child.descendants.every((descendant) => descendant.closed));
      let previous = null;
      let journalChainValid = true;
      for (let index = 0; index < journalLines.length; index += 1) {
        const record = journalRecords[index];
        if (record.sequence !== index || record.previousRecordSha256 !== previous || `${canonicalJson(record)}\n` !== journalLines[index].toString("utf8")) journalChainValid = false;
        previous = `sha256:${digest(journalLines[index])}`;
      }
      const journalAggregateSha256 = `sha256:${digest(Buffer.concat(journalLines))}`;
      const yellowCleaned = sawQuarantine && allProcessGroupsAbsent;
      const terminalClass = cleanCase && invocationError === null
        ? "CLEAN"
        : !allProcessGroupsAbsent
          ? "RED_QUARANTINED"
          : yellowCleaned
            ? "YELLOW_QUARANTINED_CLEANED"
            : "CONTROLLED_FAILURE";
      const idempotenceCleanupCalls = sawQuarantine ? 0 : Math.max(0, portCleanupCalls - 1);
      const quarantineCleanupCalls = sawQuarantine ? portCleanupCalls : 0;
      const invocationReason = invocationError === null
        ? "NO_ERROR"
        : typeof invocationError.code === "string"
          ? invocationError.code
          : typeof invocationError.message === "string"
            ? invocationError.message
            : "UNKNOWN_ERROR";
      const observedReasonCode = cleanCase && invocationError === null
        ? "CLEAN"
        : spec.faultClass === "EVIDENCE_SCHEMA" && evidenceSchemaRejectionObserved
          ? "EVIDENCE_SCHEMA_REJECTED"
          : journalFaultObserved && journalFault !== null
            ? `CORE_SHARED_JOURNAL_FAULT_${journalFault.side.toUpperCase()}:${journalFault.event}`
          : descendantGroupCleanupObserved
            ? "SYNTHETIC_DESCENDANT_GROUP_CLEANED"
            : invocationReason;
      const injectedFaultObserved = observedReasonCode !== "CLEAN" && observedReasonCode !== "NO_ERROR" && observedReasonCode !== "UNKNOWN_ERROR";
      const initializedFrameIndex = observations.initializedWriteTimerEvents.indexOf("initialized-frame-prepared");
      const initializedEndIndex = observations.initializedWriteTimerEvents.indexOf("initialized-end");
      const exitGraceTimerIndex = initializedEndIndex < 0 ? -1 : observations.initializedWriteTimerEvents.indexOf("timer:2000", initializedEndIndex + 1);
      return Object.freeze({
        caseId: spec.caseId,
        terminalClass,
        processStartSlotsConsumed: observations.processStartSlotsConsumed,
        processGroupsStarted: observations.processGroupsStarted,
        clientWrites: observations.clientWrites,
        termSignals: observations.termSignals,
        killSignals: observations.killSignals,
        stdinErrors: observations.stdinErrors,
        esrchObservations: observations.esrchObservations,
        epermObservations: observations.epermObservations,
        unknownAbsenceObservations: observations.unknownAbsenceObservations,
        syntheticDescendantsStarted: observations.syntheticDescendantsStarted,
        timerScheduleMilliseconds: Object.freeze([...observations.timerScheduleMilliseconds]),
        initializedEndBeforeExitGraceTimerProven: observations.clientWrites < 2 || (initializedFrameIndex >= 0 && observations.initializedWriteTimerEvents[initializedFrameIndex + 1] === "timing-now" && initializedEndIndex === initializedFrameIndex + 2 && observations.initializedWriteTimerEvents[initializedEndIndex + 1] === "timing-now" && exitGraceTimerIndex === initializedEndIndex + 2),
        journalFaultObserved,
        journalRecordCount: journalRecords.length,
        journalAggregateSha256,
        journalChainValid,
        effectReleaseAfterStartedFsync: observations.processGroupsStarted === 0 ? null : !observations.releaseOrderingViolation,
        logicalCleanupObligationRetained: !allProcessGroupsAbsent,
        logicalAllProcessGroupsAbsent: allProcessGroupsAbsent,
        syntheticChildHandlesClosedAtReturn,
        cleanupCalls: portCleanupCalls,
        portCleanupCalls,
        idempotenceCleanupCalls,
        quarantineCleanupCalls,
        residueCount: unresolved.length,
        injectedFaultObserved,
        observedReasonCode,
        logicalCommandBoundaryProven: spec.faultClass === "COMMAND_MUTATION" ? invocationError !== null : true,
        mutationBeforeSpawnRejected: observations.mutationBeforeSpawnRejected,
        inMemoryFakeExecutorBoundaryProven: observations.inMemoryFakeExecutorBoundaryProven,
        inMemoryFakeWrapperSubstitutionProven: observations.inMemoryFakeWrapperSubstitutionProven,
        clientWriteBytesValidated: observations.clientWriteBytesValidated,
        evidenceSchemaRejectionObserved,
        journalInputShapeValidated,
        journalInputRejectionObserved,
        stdioCloseBeforeSignalProven: !observations.stdioCloseBeforeSignalViolation,
        ownedStdioClosedBeforeReturn,
        noWritesAfterStdioClose: !observations.writeAfterStdioCloseViolation,
        ownedBufferZeroizationPassed,
        fakeEmitterBufferZeroizationPassed,
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
        retryStarts: observations.retryStarts,
        fifthStarts: observations.fifthStarts,
        alternateExecutableStarts: observations.alternateExecutableStarts,
      });
    } finally {
      for (const line of journalLines) line.fill(0);
      for (const buffer of observations.emittedBuffers) buffer.fill(0);
      if (!deferFilesystemCleanupToConstructionRoot) {
        cleanupFakeCodexFixture(fixture.root);
        fs.rmSync(caseRoot, { recursive: true, force: true });
        if (fs.existsSync(caseRoot)) fail("CORE_SHARED_CASE_ROOT_CLEANUP_FAILED");
      }
    }
  };
}

function coreProcessFakeSource(behavior) {
  const schemas = JSON.stringify(coreSchemaFiles());
  return `#!${process.execPath}
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const behavior = ${JSON.stringify(behavior)};
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("codex-cli 0.145.0\\n");
} else if (args.length === 2 && args[0] === "app-server" && args[1] === "--help") {
  process.stdout.write("synthetic Codex app-server help\\n");
} else if (args.length === 4 && args[0] === "app-server" && args[1] === "generate-json-schema" && args[2] === "--out") {
  const schemas = ${schemas};
  for (const [name, value] of Object.entries(schemas)) {
    const target = path.join(args[3], name);
    fs.writeFileSync(target, value, { flag: "wx", mode: 0o600 });
    fs.chmodSync(target, 0o600);
  }
} else if (args.length === 3 && args[0] === "app-server" && args[1] === "--listen" && args[2] === "stdio://") {
  if (behavior === "ignore_term") process.on("SIGTERM", () => {});
  let descendant = null;
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    if (message.method === "initialize" && message.id === 0) {
      if (behavior === "ignore_term") return;
      if (behavior === "server_request") { process.stdout.write(JSON.stringify({ id: 9, method: "thread/start", params: {} }) + "\\n"); return; }
      if (behavior === "invalid_result") { process.stdout.write(JSON.stringify({ id: 0, result: { userAgent: 7 } }) + "\\n"); return; }
      if (behavior === "response_then_partial") {
        process.stdout.write(JSON.stringify({ id: 0, result: ${exactRead("fixtures/r4-gate-b-core/codex/initialize-result.json").trim()}.result }) + "\\n{");
        return;
      }
      if (behavior === "response_then_unknown") {
        process.stdout.write(JSON.stringify({ id: 0, result: ${exactRead("fixtures/r4-gate-b-core/codex/initialize-result.json").trim()}.result }) + "\\n", () => {
          setTimeout(() => process.stdout.write(JSON.stringify({ method: "thread/started", params: {} }) + "\\n"), 20);
        });
        return;
      }
      if (behavior === "oversized_line") { process.stdout.write("x".repeat(1048577)); return; }
      if (behavior === "descendant" || behavior === "stubborn_descendant") descendant = spawn(process.execPath, ["-e", behavior === "stubborn_descendant" ? "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)" : "setInterval(() => {}, 1000)"], { stdio: "ignore" });
      process.stdout.write(JSON.stringify({ method: "remoteControl/status/changed", params: { status: "disabled", machineName: "process-secret-machine", installationId: "process-secret-install" } }) + "\\n");
      process.stdout.write(JSON.stringify({ id: 0, result: ${exactRead("fixtures/r4-gate-b-core/codex/initialize-result.json").trim()}.result }) + "\\n");
    } else if (message.method === "initialized" && behavior !== "response_then_unknown") {
      lines.close();
      process.exit(0);
    } else if (message.method !== "initialized") process.exit(9);
  });
} else process.exit(8);
`;
}

function coreWrapperSource() {
  return `#include <errno.h>\n#include <string.h>\n#include <unistd.h>\nint main(int argc, char **argv) {\n  int split = -1;\n  for (int i = 1; i < argc; i += 1) if (strcmp(argv[i], "--") == 0) { split = i; break; }\n  if (split < 0 || split + 1 >= argc) return 125;\n  execv(argv[split + 1], &argv[split + 1]);\n  return errno == 0 ? 126 : errno;\n}\n`;
}

function spawnAndWait(executable, argv, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, options);
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(undefined) : reject(new Error(`CORE_FAKE_COMPILE_FAILED:${code}:${stderr.length}`)));
  });
}

export async function createCoreProcessFakeFixture(constructionTempRoot, behavior = "clean") {
  if (!["clean", "descendant", "stubborn_descendant", "ignore_term", "server_request", "invalid_result", "response_then_partial", "response_then_unknown", "oversized_line"].includes(behavior)) fail("CORE_PROCESS_BEHAVIOR_DENIED");
  const temporary = canonicalTempRoot(constructionTempRoot);
  const root = path.join(temporary, `codex-core-process-${behavior}`);
  if (fs.existsSync(root)) fail("CORE_PROCESS_ROOT_EXISTS");
  mkdir0700(root);
  const layout = coreCodexLayout(root);
  for (const directory of [
    path.dirname(layout.stagedCodex), path.dirname(layout.stagedProfile), layout.schemaRoot,
    layout.neutralCwd, layout.home, layout.codexHome, layout.tmpdir, path.dirname(layout.evidencePath),
  ]) mkdir0700(directory);
  const fakeSource = coreProcessFakeSource(behavior);
  fs.writeFileSync(layout.stagedCodex, fakeSource, { flag: "wx", mode: 0o500 });
  fs.chmodSync(layout.stagedCodex, 0o500);
  const profile = exactRead("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb");
  fs.writeFileSync(layout.stagedProfile, profile, { flag: "wx", mode: 0o600 });
  fs.chmodSync(layout.stagedProfile, 0o600);
  const wrapperSource = path.join(root, "fake-wrapper.c");
  const wrapper = path.join(root, "fake-wrapper");
  fs.writeFileSync(wrapperSource, coreWrapperSource(), { flag: "wx", mode: 0o600 });
  await spawnAndWait("/usr/bin/clang", ["-std=c17", "-O0", "-Wall", "-Wextra", "-Werror", wrapperSource, "-o", wrapper], {
    cwd: root,
    env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", TMPDIR: layout.tmpdir },
    stdio: ["ignore", "ignore", "pipe"],
  });
  fs.chmodSync(wrapper, 0o500);
  const wrapperBytes = fs.readFileSync(wrapper);
  try {
    return Object.freeze({ root, constructionRoot: temporary, layout, behavior, wrapper, wrapperSha256: `sha256:${digest(wrapperBytes)}` });
  } finally { wrapperBytes.fill(0); }
}

function groupExists(pid) {
  try { process.kill(-pid, 0); return true; }
  catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

async function waitForGroupAbsence(pid, milliseconds) {
  const deadline = Date.now() + milliseconds;
  while (groupExists(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  return !groupExists(pid);
}

export function createCoreProcessSpawnPort(fixture, timing = {}) {
  const constructionRoot = canonicalTempRoot(fixture.constructionRoot);
  const fixtureRoot = fs.realpathSync(fixture.root);
  const uid = typeof process.getuid === "function" ? process.getuid() : -1;
  const rootStat = fs.lstatSync(fixtureRoot);
  const wrapperStat = fs.lstatSync(fixture.wrapper);
  const wrapperBytes = fs.readFileSync(fixture.wrapper);
  const wrapperHash = `sha256:${digest(wrapperBytes)}`;
  wrapperBytes.fill(0);
  if (
    !fixtureRoot.startsWith(`${constructionRoot}${path.sep}`)
    || fixtureRoot !== path.resolve(fixture.root)
    || !rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.uid !== uid || (rootStat.mode & 0o777) !== 0o700
    || !fixture.wrapper.startsWith(`${fixtureRoot}${path.sep}`) || fs.realpathSync(fixture.wrapper) !== fixture.wrapper
    || !wrapperStat.isFile() || wrapperStat.isSymbolicLink() || wrapperStat.uid !== uid || wrapperStat.nlink !== 1 || (wrapperStat.mode & 0o777) !== 0o500
    || wrapperHash !== fixture.wrapperSha256
  ) fail("CORE_FAKE_WRAPPER_UNSAFE");
  const deadlineOverrideMilliseconds = timing.deadlineOverrideMilliseconds ?? null;
  const termGraceMilliseconds = timing.termGraceMilliseconds ?? 2_000;
  const killGraceMilliseconds = timing.killGraceMilliseconds ?? 2_000;
  for (const value of [termGraceMilliseconds, killGraceMilliseconds]) if (!Number.isInteger(value) || value < 10 || value > 2_000) fail("CORE_FAKE_TIMING_INVALID");
  if (deadlineOverrideMilliseconds !== null && (!Number.isInteger(deadlineOverrideMilliseconds) || deadlineOverrideMilliseconds < 10 || deadlineOverrideMilliseconds > 10_000)) fail("CORE_FAKE_TIMING_INVALID");
  const commands = [];
  const groups = new Set();
  let cleanupCalls = 0;
  let initializeClientWrites = 0;
  const boundedClose = (closePromise, milliseconds) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ settled: false }), milliseconds);
    closePromise.then((value) => { clearTimeout(timer); resolve({ settled: true, value }); });
  });
  const signalGroup = (pid, signal) => {
    try { process.kill(-pid, signal); return true; }
    catch (error) {
      if (error?.code === "ESRCH" || error?.code === "EPERM") return false;
      throw error;
    }
  };
  return Object.freeze({
    mode: "construction_fake",
    get commands() { return commands; },
    get cleanupCalls() { return cleanupCalls; },
    get initializeClientWrites() { return initializeClientWrites; },
    async run(command, wireGuard) {
      validateCoreCodexLogicalCommand(fixture.layout, command);
      if (command.kind === "initialize" ? !wireGuard : wireGuard !== undefined) fail("CORE_WIRE_GUARD_INVALID");
      commands.push(command);
      const physicalArgv = [fixture.wrapper, ...command.argv.slice(1)];
      if (physicalArgv[0] !== fixture.wrapper || physicalArgv.slice(1).some((value, index) => value !== command.argv[index + 1])) fail("CORE_FAKE_WRAPPER_REPLACEMENT_INVALID");
      const child = spawn(physicalArgv[0], physicalArgv.slice(1), {
        cwd: command.cwd,
        env: { ...command.environment },
        detached: true,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (typeof child.pid !== "number") fail("CORE_FAKE_CHILD_PID_MISSING");
      const pid = child.pid;
      groups.add(pid);
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let timedOut = false;
      let oversized = false;
      let clientWrites = 0;
      let receive = Buffer.alloc(0);
      const lines = [];
      let initializedWritten = false;
      let initializedAt = null;
      let protocolError = null;
      let stopResolve;
      const stopPromise = new Promise((resolve) => { stopResolve = resolve; });
      const requestStop = () => { stopResolve(); };
      const append = (prior, chunk, limit) => {
        if (prior.length > limit) return prior;
        const next = Buffer.concat([prior, chunk]);
        prior.fill(0);
        if (next.length <= limit) return next;
        const limited = Buffer.from(next.subarray(0, limit + 1));
        next.fill(0);
        return limited;
      };
      const clearOwnedBuffers = () => {
        stdout.fill(0);
        stderr.fill(0);
        receive.fill(0);
        for (const line of lines) line.fill(0);
      };
      child.stdout.on("data", (chunk) => {
        stdout = append(stdout, chunk, command.stdoutLimitBytes);
        receive = append(receive, chunk, 1_048_576);
        if (stdout.length > command.stdoutLimitBytes) { oversized = true; requestStop(); }
        if (command.kind === "initialize" && protocolError === null && !oversized) {
          let newline;
          let shouldWriteInitialized = false;
          while ((newline = receive.indexOf(0x0a)) >= 0) {
            const priorReceive = receive;
            const line = Buffer.from(priorReceive.subarray(0, newline));
            receive = Buffer.from(priorReceive.subarray(newline + 1));
            priorReceive.fill(0);
            lines.push(line);
            try {
              if (wireGuard.acceptLine(line)) {
                if (initializedWritten) fail("CORE_INITIALIZED_DUPLICATE_WRITE");
                shouldWriteInitialized = true;
              }
            } catch (error) {
              protocolError = error;
              requestStop();
              break;
            }
          }
          if (receive.length > 1_048_576) { protocolError = new Error("CODEX_WIRE_LINE_TOO_LARGE"); requestStop(); }
          if (protocolError === null && shouldWriteInitialized && receive.length !== 0) {
            protocolError = new Error("CODEX_WIRE_PARTIAL_AFTER_RESPONSE");
            requestStop();
          }
          if (protocolError === null && shouldWriteInitialized && receive.length === 0) {
            child.stdin.end(guardClientMessage(initializedMessage()));
            clientWrites += 1;
            initializeClientWrites = clientWrites;
            initializedWritten = true;
            initializedAt = Date.now();
          }
        }
      });
      child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk, 1_048_576); });
      const closePromise = new Promise((resolve) => {
        let settled = false;
        child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, error }); } });
        child.once("close", (code) => { if (!settled) { settled = true; resolve({ code: code ?? -1, error: null }); } });
      });
      if (command.kind === "initialize") {
        child.stdin.write(guardClientMessage(initializeMessage()));
        clientWrites += 1;
        initializeClientWrites = clientWrites;
      } else child.stdin.end();
      const effectiveDeadline = command.kind === "initialize" && deadlineOverrideMilliseconds !== null
        ? deadlineOverrideMilliseconds
        : command.deadlineMilliseconds;
      const first = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ kind: "deadline" }), effectiveDeadline);
        closePromise.then((value) => { clearTimeout(timer); resolve({ kind: "close", value }); });
        stopPromise.then(() => { clearTimeout(timer); resolve({ kind: "stop" }); });
      });
      let close = first.kind === "close" ? { settled: true, value: first.value } : { settled: false };
      if (first.kind !== "close") {
        timedOut = first.kind === "deadline";
        signalGroup(pid, "SIGTERM");
        close = await boundedClose(closePromise, termGraceMilliseconds);
        if (!close.settled) {
          signalGroup(pid, "SIGKILL");
          close = await boundedClose(closePromise, killGraceMilliseconds);
        }
      }
      const exitLatency = command.kind === "initialize" && initializedAt !== null ? Date.now() - initializedAt : 0;
      signalGroup(pid, "SIGTERM");
      if (!await waitForGroupAbsence(pid, termGraceMilliseconds)) signalGroup(pid, "SIGKILL");
      const absent = await waitForGroupAbsence(pid, killGraceMilliseconds);
      if (absent) groups.delete(pid);
      if (protocolError !== null) { clearOwnedBuffers(); throw protocolError; }
      if (close.settled && close.value.error) { clearOwnedBuffers(); throw close.value.error; }
      return Object.freeze({
        stdout, stderr,
        exitCode: oversized || !close.settled ? -1 : close.value.code,
        timedOut,
        processGroupStarted: true,
        processGroupReaped: close.settled,
        processGroupAbsent: absent,
        syntheticDescendantsStarted: ["descendant", "stubborn_descendant"].includes(fixture.behavior) && command.kind === "initialize" ? 1 : 0,
        clientWrites,
        trailingBytes: command.kind === "initialize" ? receive.length : 0,
        handshakeExitLatencyMilliseconds: exitLatency,
        lines,
      });
    },
    async cleanup() {
      cleanupCalls += 1;
      for (const pid of groups) {
        signalGroup(pid, "SIGKILL");
        if (!await waitForGroupAbsence(pid, killGraceMilliseconds)) return false;
      }
      groups.clear();
      return true;
    },
  });
}

export async function inspectCoreCodexAdapterConstruction(constructionTempRoot) {
  const sources = Object.fromEntries(coreConstructedPaths.slice(0, 4).map((name) => [name, exactRead(name)]));
  const contract = JSON.parse(sources["schemas/r4/gate-b-core/codex-zero-call-contract.json"]);
  if (contract.distribution.npmVersion !== "0.145.0" || contract.authority.threadStarts !== 0 || contract.authority.turnStarts !== 0 || contract.authority.providerCalls !== 0 || contract.authority.aiLaneEnabled !== false || contract.handshakeOrdering?.schemaInventoryAndReferenceClosureValidatedBeforeInitializeSpawn !== true || contract.handshakeOrdering?.preResponseInvalidWireMaximumClientWrites !== 1 || contract.handshakeOrdering?.postResponseUnexpectedWireTerminalizesAndCleans !== true || contract.handshakeOrdering?.postResponseViolationMaximumClientWrites !== 2 || contract.handshakeOrdering?.clientWritesAfterPostResponseViolation !== 0 || contract.handshakeOrdering?.postResponseWireFinalityUnproven !== true || contract.processSupervision?.processGroupRemovedFromCleanupJournalOnlyAfterAbsence !== true) fail("CORE_CODEX_CONTRACT_DRIFT");
  const fixture = createCoreFakeCodexLayout(constructionTempRoot, "clean");
  const port = createCoreMemorySpawnPort(fixture);
  try {
    const evidence = await runCoreCodexZeroCall({
      layout: fixture.layout,
      spawnPort: port,
      expectedSchema: expectedCoreFakeSchema(),
      publicHashes: coreSyntheticPublicHashes(fixture),
    });
    if (evidence.status !== "ZERO_CALL_CHILD_MECHANISM_GREEN" || evidence.aiLaneEnabled !== false || evidence.aggregateVerdict !== "YELLOW") fail("CORE_FAKE_CODEX_PROBE_FAILED");
    const inventory = computeSchemaInventory(fixture.layout.schemaRoot, Object.keys(expectedCoreFakeSchema().selected));
    return Object.freeze({
      schemaVersion: "r4.gate-b-core.codex-construction.v1",
      status: "GREEN_FAKE_PORT_ONLY",
      logicalCommandCount: port.commands.length,
      schemaFileCount: inventory.fileCount,
      realCodexCalls: 0,
      sandboxExecCalls: 0,
      threadStarts: 0,
      turnStarts: 0,
      providerCalls: 0,
      providerBytes: 0,
      networkBytes: 0,
      cleanupPassed: true,
      aiLaneEnabled: false,
      aggregateVerdict: "YELLOW",
      fileHashes: Object.fromEntries(Object.entries(sources).map(([name, value]) => [name, digest(value)])),
    });
  } finally {
    cleanupFakeCodexFixture(fixture.root);
  }
}

async function main() {
  if (process.argv.length !== 3 || !["check", "check-core"].includes(process.argv[2])) fail("CODEX_CONSTRUCTION_COMMAND_INVALID");
  const temporary = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  const result = process.argv[2] === "check-core"
    ? await inspectCoreCodexAdapterConstruction(temporary)
    : await inspectCodexAdapterConstruction(temporary);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
