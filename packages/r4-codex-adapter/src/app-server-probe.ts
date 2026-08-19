import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  type JsonValue,
} from "../../r4-protocol/src/index.ts";

export const PINNED_CODEX_NPM_VERSION = "0.145.0" as const;
export const PINNED_CODEX_CLI_VERSION = "codex-cli 0.145.0" as const;
export const PINNED_CODEX_NATIVE_SHA256 = "1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590" as const;
export const PINNED_SCHEMA_AGGREGATE_SHA256 = "313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62" as const;
export const PINNED_SCHEMA_FILE_COUNT = 273;
export const MAX_JSONL_LINE_BYTES = 1_048_576;
export const HANDSHAKE_EXIT_TIMEOUT_MILLISECONDS = 2_000;

const SHA256 = /^[0-9a-f]{64}$/u;
const FIXTURE_MARKER = "FORME_GATE_B_FAKE_CODEX_EXECUTABLE_V1";
const PINNED_FIXTURE_PATHS = Object.freeze({
  schema: "fixtures/r4-gate-b/codex-app-server-0.145.0-schema.sha256",
  methods: "fixtures/r4-gate-b/codex-app-server-0.145.0-methods.json",
});
const repositoryRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

export type ExpectedSchemaInventory = Readonly<{
  fileCount: number;
  aggregateSha256: string;
  fileHashes: Readonly<Record<string, string>>;
}>;

export type ExecutableAuthority =
  | Readonly<{ mode: "fixture"; sha256: string }>
  | Readonly<{ mode: "pinned_staged"; sha256: typeof PINNED_CODEX_NATIVE_SHA256 }>;

export type AppServerProbeResult = Readonly<{
  schemaVersion: "r4_gate_b_app_server_probe.v1";
  classification: "FIXTURE_GREEN" | "PINNED_ZERO_CALL_YELLOW";
  executableSha256: string;
  versionSha256: `sha256:${string}`;
  helpSha256: `sha256:${string}`;
  schemaFileCount: number;
  schemaAggregateSha256: string;
  initializeResultSha256: `sha256:${string}`;
  disabledRemoteControlNotificationCount: number;
  sanitizedNotificationSha256: `sha256:${string}` | null;
  clientWrites: 2;
  serverRequests: 0;
  threadStarts: 0;
  turnStarts: 0;
  providerCalls: 0;
  providerBytes: 0;
  stderrBytes: 0;
  exitCode: 0;
}>;

export class AppServerProbeError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "AppServerProbeError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new AppServerProbeError(code);
}

function digest(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactObject(value: JsonValue, keys: readonly string[], code: string): Record<string, JsonValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const object = value as Record<string, JsonValue>;
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
  return object;
}

function exactTrackedFixture(relativePath: string): string {
  if (!new Set<string>(Object.values(PINNED_FIXTURE_PATHS)).has(relativePath)) fail("CODEX_PIN_PATH_DENIED");
  const candidate = path.join(repositoryRoot, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(candidate) !== candidate) {
    fail("CODEX_PIN_PATH_UNSAFE");
  }
  return fs.readFileSync(candidate, "utf8");
}

export function validatePinnedCodexFixtures(): Readonly<{
  schemaPinHash: string;
  methodPinHash: string;
  deniedMethodCount: number;
}> {
  const schemaSource = exactTrackedFixture(PINNED_FIXTURE_PATHS.schema);
  const methodSource = exactTrackedFixture(PINNED_FIXTURE_PATHS.methods);
  const schema = JSON.parse(schemaSource) as Record<string, unknown>;
  const methods = JSON.parse(methodSource) as Record<string, unknown>;
  if (
    schema.schemaVersion !== "r4.gate-b.codex-schema-pins.v1"
    || schema.npmVersion !== PINNED_CODEX_NPM_VERSION
    || schema.reportedCliVersion !== PINNED_CODEX_CLI_VERSION
    || schema.experimentalIncluded !== false
    || schema.fileCount !== PINNED_SCHEMA_FILE_COUNT
    || schema.aggregateSha256 !== PINNED_SCHEMA_AGGREGATE_SHA256
  ) fail("CODEX_SCHEMA_PIN_DRIFT");
  if (
    methods.schemaVersion !== "r4.gate-b.codex-method-pins.v1"
    || methods.npmVersion !== PINNED_CODEX_NPM_VERSION
    || JSON.stringify(methods.allowedClientRequests) !== JSON.stringify(["initialize"])
    || JSON.stringify(methods.allowedClientNotifications) !== JSON.stringify(["initialized"])
    || JSON.stringify(methods.allowedServerRequests) !== JSON.stringify([])
    || !Array.isArray(methods.explicitDeniedClientMethods)
    || !Array.isArray(methods.deniedFamilyPrefixes)
  ) fail("CODEX_METHOD_PIN_DRIFT");
  const denied = [...methods.explicitDeniedClientMethods, ...methods.deniedFamilyPrefixes];
  for (const family of ["thread/", "turn/", "model/", "account/", "tool/", "fs/", "process/"]) {
    if (!denied.some((value) => typeof value === "string" && (value === family || value.startsWith(family)))) {
      fail("CODEX_DENIED_METHOD_FAMILY_MISSING");
    }
  }
  return Object.freeze({
    schemaPinHash: digest(schemaSource),
    methodPinHash: digest(methodSource),
    deniedMethodCount: denied.length,
  });
}

export function initializeMessage(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    method: "initialize",
    id: 0,
    params: Object.freeze({
      clientInfo: Object.freeze({
        name: "forme_gate_b_probe",
        title: "Forme Gate B Probe",
        version: "0.1.0",
      }),
    }),
  });
}

export function initializedMessage(): Readonly<Record<string, unknown>> {
  return Object.freeze({ method: "initialized", params: Object.freeze({}) });
}

export function guardClientMessage(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("CODEX_CLIENT_MESSAGE_DENIED");
  const object = value as Record<string, unknown>;
  if (object.method === "initialize") {
    if (canonicalJson(object) !== canonicalJson(initializeMessage())) fail("CODEX_CLIENT_MESSAGE_DENIED");
  } else if (object.method === "initialized") {
    if (canonicalJson(object) !== canonicalJson(initializedMessage())) fail("CODEX_CLIENT_MESSAGE_DENIED");
  } else {
    fail("CODEX_CLIENT_METHOD_DENIED_BEFORE_WRITE");
  }
  const line = `${canonicalJson(object)}\n`;
  if (Buffer.byteLength(line) > MAX_JSONL_LINE_BYTES) fail("CODEX_CLIENT_LINE_TOO_LARGE");
  return line;
}

function currentUid(): number {
  if (typeof process.getuid !== "function") fail("CODEX_FIXTURE_ROOT_INVALID");
  return process.getuid();
}

function canonicalRoot(root: string): string {
  if (!path.isAbsolute(root)) fail("CODEX_FIXTURE_ROOT_INVALID");
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== currentUid() || (stat.mode & 0o077) !== 0) {
    fail("CODEX_FIXTURE_ROOT_INVALID");
  }
  const real = fs.realpathSync(root);
  if (real !== path.resolve(root)) fail("CODEX_FIXTURE_ROOT_INVALID");
  return real;
}

function exactChild(root: string, token: string, kind: "file" | "directory"): string {
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u.test(token) || token.split("/").some((part) => part === "." || part === "..")) {
    fail("CODEX_FIXTURE_PATH_DENIED");
  }
  const candidate = path.join(root, ...token.split("/"));
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink() || stat.uid !== currentUid()) fail("CODEX_FIXTURE_PATH_UNSAFE");
  if (kind === "file" && (!stat.isFile() || stat.nlink !== 1)) fail("CODEX_FIXTURE_PATH_UNSAFE");
  if (kind === "directory" && !stat.isDirectory()) fail("CODEX_FIXTURE_PATH_UNSAFE");
  if (fs.realpathSync(candidate) !== candidate) fail("CODEX_FIXTURE_PATH_UNSAFE");
  return candidate;
}

function assertExecutable(root: string, authority: ExecutableAuthority): Readonly<{ path: string; sha256: string }> {
  const token = authority.mode === "fixture" ? "bin/fixture-codex" : "install/FormeLocal.app/Contents/Resources/Codex/codex";
  const executable = exactChild(root, token, "file");
  const stat = fs.lstatSync(executable);
  if ((stat.mode & 0o777) !== 0o500) fail("CODEX_EXECUTABLE_MODE_INVALID");
  const bytes = fs.readFileSync(executable);
  const sha256 = digest(bytes);
  if (!SHA256.test(authority.sha256) || sha256 !== authority.sha256) fail("CODEX_EXECUTABLE_HASH_MISMATCH");
  if (authority.mode === "fixture") {
    if (bytes.length > 65_536 || !bytes.toString("utf8").includes(FIXTURE_MARKER)) fail("REAL_CODEX_DENIED_DURING_CONSTRUCTION");
  } else if (sha256 !== PINNED_CODEX_NATIVE_SHA256) {
    fail("CODEX_EXECUTABLE_HASH_MISMATCH");
  }
  bytes.fill(0);
  return Object.freeze({ path: executable, sha256 });
}

function exactEnvironment(root: string, mode: ExecutableAuthority["mode"]): Readonly<Record<string, string>> {
  return Object.freeze({
    HOME: exactChild(root, "auth/home", "directory"),
    CODEX_HOME: exactChild(root, mode === "fixture" ? "auth/fixture-state" : "auth/codex-home", "directory"),
    TMPDIR: exactChild(root, "tmp/codex", "directory"),
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    NO_COLOR: "1",
    CODEX_DISABLE_ANALYTICS: "1",
  });
}

function allowedArgv(executable: string, kind: "version" | "help" | "schema" | "stdio", schemaRoot: string): readonly string[] {
  if (kind === "version") return Object.freeze([executable, "--version"]);
  if (kind === "help") return Object.freeze([executable, "app-server", "--help"]);
  if (kind === "schema") return Object.freeze([executable, "app-server", "generate-json-schema", "--out", schemaRoot]);
  return Object.freeze([executable, "app-server", "--listen", "stdio://"]);
}

async function captureCommand(input: Readonly<{
  argv: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  timeoutMilliseconds: number;
}>): Promise<Readonly<{ stdout: Buffer; stderr: Buffer; exitCode: number }>> {
  const [executable, ...args] = input.argv;
  if (!executable) fail("CODEX_ARGV_DENIED");
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: input.cwd, env: input.env as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let total = 0;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new AppServerProbeError("CODEX_FIXTURE_TIMEOUT"));
    }, input.timeoutMilliseconds);
    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_JSONL_LINE_BYTES) child.kill("SIGKILL");
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_JSONL_LINE_BYTES) child.kill("SIGKILL");
      else stderr.push(Buffer.from(chunk));
    });
    child.once("error", () => {
      clearTimeout(timer);
      reject(new AppServerProbeError("CODEX_FIXTURE_SPAWN_FAILED"));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (total > MAX_JSONL_LINE_BYTES) {
        reject(new AppServerProbeError("CODEX_FIXTURE_OUTPUT_TOO_LARGE"));
        return;
      }
      resolve(Object.freeze({
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        exitCode: code ?? -1,
      }));
    });
  });
}

function schemaInventory(schemaRoot: string): ExpectedSchemaInventory {
  const entries = fs.readdirSync(schemaRoot, { withFileTypes: true })
    .sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
  const fileHashes: Record<string, string> = {};
  const aggregateLines: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink() || !/^[A-Za-z0-9._-]+\.json$/u.test(entry.name)) {
      fail("CODEX_SCHEMA_WRITESET_INVALID");
    }
    const file = exactChild(schemaRoot, entry.name, "file");
    const value = fs.readFileSync(file);
    const hash = digest(value);
    fileHashes[entry.name] = hash;
    aggregateLines.push(`${hash}  ${entry.name}\n`);
    value.fill(0);
  }
  return Object.freeze({
    fileCount: entries.length,
    aggregateSha256: digest(aggregateLines.join("")),
    fileHashes: Object.freeze(fileHashes),
  });
}

function assertSchemaInventory(actual: ExpectedSchemaInventory, expected: ExpectedSchemaInventory): void {
  if (
    actual.fileCount !== expected.fileCount
    || actual.aggregateSha256 !== expected.aggregateSha256
    || canonicalJson(actual.fileHashes) !== canonicalJson(expected.fileHashes)
  ) fail("CODEX_SCHEMA_FIXTURE_MISMATCH");
}

async function handshake(input: Readonly<{
  executable: string;
  cwd: string;
  env: Readonly<Record<string, string>>;
  schemaRoot: string;
}>): Promise<Readonly<{
  initializeResultSha256: `sha256:${string}`;
  notificationCount: number;
  notificationSha256: `sha256:${string}` | null;
  stderrBytes: number;
  exitCode: number;
}>> {
  const argv = allowedArgv(input.executable, "stdio", input.schemaRoot);
  return await new Promise((resolve, reject) => {
    const child = spawn(argv[0] as string, argv.slice(1), {
      cwd: input.cwd,
      env: input.env as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = Buffer.alloc(0);
    let stderrBytes = 0;
    let initializeHash: `sha256:${string}` | null = null;
    let notificationHash: `sha256:${string}` | null = null;
    let notificationCount = 0;
    let initializedSent = false;
    let settled = false;
    const rejectOnce = (code: string) => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new AppServerProbeError(code));
    };
    const timer = setTimeout(
      () => rejectOnce("CODEX_HANDSHAKE_TIMEOUT"),
      HANDSHAKE_EXIT_TIMEOUT_MILLISECONDS,
    );
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 0) rejectOnce("CODEX_STDERR_NOT_EMPTY");
    });
    child.stdout.on("data", (chunk: Buffer) => {
      if (settled) return;
      try {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > MAX_JSONL_LINE_BYTES * 4) {
          rejectOnce("CODEX_SERVER_OUTPUT_TOO_LARGE");
          return;
        }
        while (true) {
          const newline = buffer.indexOf(0x0a);
          if (newline === -1) break;
          if (newline > MAX_JSONL_LINE_BYTES) {
            rejectOnce("CODEX_SERVER_LINE_TOO_LARGE");
            return;
          }
          const line = buffer.subarray(0, newline).toString("utf8");
          buffer = buffer.subarray(newline + 1);
          let parsed: JsonValue;
          try {
            parsed = parseStrictJson(line);
          } catch {
            rejectOnce("CODEX_SERVER_JSON_INVALID");
            return;
          }
          const hasMethod = parsed !== null
            && typeof parsed === "object"
            && !Array.isArray(parsed)
            && Object.prototype.hasOwnProperty.call(parsed, "method");
          const hasId = parsed !== null
            && typeof parsed === "object"
            && !Array.isArray(parsed)
            && Object.prototype.hasOwnProperty.call(parsed, "id");
          const message = exactObject(
            parsed,
            hasMethod ? (hasId ? ["id", "method", "params"] : ["method", "params"]) : ["id", "result"],
            "CODEX_SERVER_MESSAGE_DENIED",
          );
          if ("method" in message && "id" in message) {
            rejectOnce("CODEX_SERVER_REQUEST_DENIED");
            return;
          }
          if ("method" in message) {
            if (message.method !== "remoteControl/status/changed") {
              rejectOnce("CODEX_SERVER_NOTIFICATION_DENIED");
              return;
            }
            const params = exactObject(
              message.params as JsonValue,
              ["installationId", "machineName", "status"],
              "CODEX_SERVER_NOTIFICATION_DENIED",
            );
            if (params.status !== "disabled") {
              rejectOnce("CODEX_SERVER_NOTIFICATION_DENIED");
              return;
            }
            notificationHash = canonicalSha256({ method: message.method, status: params.status });
            notificationCount += 1;
            if (notificationCount > 1) {
              rejectOnce("CODEX_SERVER_NOTIFICATION_DUPLICATE");
              return;
            }
          } else {
            if (message.id !== 0 || initializeHash !== null) {
              rejectOnce("CODEX_INITIALIZE_RESPONSE_INVALID");
              return;
            }
            const result = exactObject(
              message.result as JsonValue,
              ["capabilities", "schemaVersion", "serverVersion"],
              "CODEX_INITIALIZE_RESPONSE_INVALID",
            );
            if (
              result.schemaVersion !== "fixture.initialize-result.v1"
              || result.serverVersion !== PINNED_CODEX_NPM_VERSION
            ) {
              rejectOnce("CODEX_INITIALIZE_RESPONSE_INVALID");
              return;
            }
            exactObject(result.capabilities as JsonValue, [], "CODEX_INITIALIZE_RESPONSE_INVALID");
            initializeHash = canonicalSha256(result);
            if (!initializedSent) {
              initializedSent = true;
              child.stdin.end(guardClientMessage(initializedMessage()));
            }
          }
        }
      } catch (error) {
        rejectOnce(error instanceof AppServerProbeError ? error.code : "CODEX_SERVER_MESSAGE_DENIED");
      }
    });
    child.once("error", () => rejectOnce("CODEX_FIXTURE_SPAWN_FAILED"));
    child.once("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (
        buffer.length !== 0
        || code !== 0
        || stderrBytes !== 0
        || initializeHash === null
        || !initializedSent
      ) {
        reject(new AppServerProbeError("CODEX_HANDSHAKE_EXIT_INVALID"));
        return;
      }
      resolve(Object.freeze({
        initializeResultSha256: initializeHash,
        notificationCount,
        notificationSha256: notificationHash,
        stderrBytes,
        exitCode: 0,
      }));
    });
    child.stdin.write(guardClientMessage(initializeMessage()));
  });
}

export async function runAppServerProbe(input: Readonly<{
  root: string;
  authority: ExecutableAuthority;
  expectedHelpSha256: string;
  expectedSchema: ExpectedSchemaInventory;
}>): Promise<AppServerProbeResult> {
  validatePinnedCodexFixtures();
  const root = canonicalRoot(input.root);
  const executable = assertExecutable(root, input.authority);
  const schemaRoot = exactChild(root, "build/schema", "directory");
  const cwd = exactChild(root, "tmp/neutral-cwd", "directory");
  if (fs.readdirSync(schemaRoot).length !== 0) fail("CODEX_SCHEMA_ROOT_NOT_EMPTY");
  if (fs.existsSync(path.join(cwd, ".git"))) fail("CODEX_NEUTRAL_CWD_INVALID");
  const env = exactEnvironment(root, input.authority.mode);

  const version = await captureCommand({
    argv: allowedArgv(executable.path, "version", schemaRoot),
    cwd,
    env,
    timeoutMilliseconds: 2_000,
  });
  if (
    version.exitCode !== 0
    || version.stderr.length !== 0
    || version.stdout.toString("utf8").trimEnd() !== PINNED_CODEX_CLI_VERSION
  ) fail("CODEX_VERSION_FIXTURE_MISMATCH");

  const help = await captureCommand({
    argv: allowedArgv(executable.path, "help", schemaRoot),
    cwd,
    env,
    timeoutMilliseconds: 2_000,
  });
  if (
    help.exitCode !== 0
    || help.stderr.length !== 0
    || digest(help.stdout) !== input.expectedHelpSha256
  ) fail("CODEX_HELP_FIXTURE_MISMATCH");

  const schema = await captureCommand({
    argv: allowedArgv(executable.path, "schema", schemaRoot),
    cwd,
    env,
    timeoutMilliseconds: 2_000,
  });
  if (schema.exitCode !== 0 || schema.stderr.length !== 0 || schema.stdout.length !== 0) {
    fail("CODEX_SCHEMA_COMMAND_FAILED");
  }
  const inventory = schemaInventory(schemaRoot);
  assertSchemaInventory(inventory, input.expectedSchema);
  const wire = await handshake({ executable: executable.path, cwd, env, schemaRoot });
  return Object.freeze({
    schemaVersion: "r4_gate_b_app_server_probe.v1",
    classification: input.authority.mode === "fixture" ? "FIXTURE_GREEN" : "PINNED_ZERO_CALL_YELLOW",
    executableSha256: executable.sha256,
    versionSha256: `sha256:${digest(version.stdout)}`,
    helpSha256: `sha256:${digest(help.stdout)}`,
    schemaFileCount: inventory.fileCount,
    schemaAggregateSha256: inventory.aggregateSha256,
    initializeResultSha256: wire.initializeResultSha256,
    disabledRemoteControlNotificationCount: wire.notificationCount,
    sanitizedNotificationSha256: wire.notificationSha256,
    clientWrites: 2,
    serverRequests: 0,
    threadStarts: 0,
    turnStarts: 0,
    providerCalls: 0,
    providerBytes: 0,
    stderrBytes: 0,
    exitCode: 0,
  });
}
