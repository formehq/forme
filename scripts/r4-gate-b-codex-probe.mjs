import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  guardClientMessage,
  initializedMessage,
  initializeMessage,
  runAppServerProbe,
  validatePinnedCodexFixtures,
} from "../packages/r4-codex-adapter/src/app-server-probe.ts";
import {
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
