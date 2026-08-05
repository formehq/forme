import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runAppServerProbe,
  validatePinnedCodexFixtures,
} from "../packages/r4-codex-adapter/src/app-server-probe.ts";

const repositoryRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const constructedPaths = Object.freeze([
  "packages/r4-codex-adapter/src/app-server-probe.ts",
  "packages/r4-codex-adapter/src/index.ts",
  "fixtures/r4-gate-b/codex-app-server-0.145.0-schema.sha256",
  "fixtures/r4-gate-b/codex-app-server-0.145.0-methods.json",
  "scripts/r4-gate-b-codex-probe.mjs",
  "test/r4-gate-b/codex-adapter.test.ts",
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
  if (![...constructedPaths, contractPath].includes(relativePath)) fail("CODEX_CONSTRUCTION_PATH_DENIED");
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

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("CODEX_CONSTRUCTION_COMMAND_INVALID");
  const temporary = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  const result = await inspectCodexAdapterConstruction(temporary);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
