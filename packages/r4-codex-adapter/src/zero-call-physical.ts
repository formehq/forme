import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Ajv } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import { canonicalJson, parseStrictJson, type JsonValue } from "../../r4-protocol/src/index.ts";
import { guardClientMessage, initializeMessage, initializedMessage } from "./app-server-probe.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;

export const CORE_CODEX_VERSION = "codex-cli 0.145.0\n" as const;
export const CORE_CODEX_LAUNCHER_SHA256 = "sha256:134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477" as const;
export const CORE_CODEX_NATIVE_SHA256 = "sha256:1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590" as const;
export const CORE_CODEX_SCHEMA_COUNT = 273;
export const CORE_CODEX_SCHEMA_SHA256 = "sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62" as const;
export const CORE_CODEX_SELECTED_SCHEMAS = Object.freeze({
  "./codex_app_server_protocol.schemas.json": "sha256:b6ec47c51bef8a6857dd9435f9919a43ba6616a5a9e3ab25087451cbc93d9f06",
  "./codex_app_server_protocol.v2.schemas.json": "sha256:bf840d4cb1f74ed64badfaba37bd44999f1ccf6c721f03c2d196ad7f0991dab0",
  "./ClientRequest.json": "sha256:cc9f6e191a032bdfdc96d768f4ddaba4ced75408017af3ac0dbcc4d00c1faaa8",
  "./ClientNotification.json": "sha256:a30b3041578845b11add3d07d5a63cd3a12d5d126e87b8c591862b4aeb68d97c",
  "./ServerRequest.json": "sha256:177f8b7de9dd8ce2055c56a5fd22dbc6ec24e2a4d706d08fef9f5ad4effe71f6",
  "./ServerNotification.json": "sha256:7f9f9ac791c067e3e9840a9a6543a3a0d3de86e64b2d764ede4c2f3b01bcba64",
} as const);
export const CORE_CODEX_ALLOWED_HOME = Object.freeze([
  ".tmp", "goals_1.sqlite", "installation_id", "logs_2.sqlite",
  "memories_1.sqlite", "skills", "state_5.sqlite", "state_5.sqlite-shm",
  "state_5.sqlite-wal", "tmp",
]);

const SHA = /^sha256:[0-9a-f]{64}$/u;
const DIALECTS = new Set(["http://json-schema.org/draft-07/schema#", "https://json-schema.org/draft/2020-12/schema"]);
const COMMAND_KINDS = ["version", "help", "schema", "initialize"] as const;
const DEADLINES = Object.freeze({ version: 5_000, help: 5_000, schema: 30_000, initialize: 10_000 });
const OUTPUT_LIMITS = Object.freeze({ version: 256, help: 1_048_576, schema: 1_048_576, initialize: 4_194_304 });

export type CoreCodexCommandKind = typeof COMMAND_KINDS[number];
export type CoreCodexLayout = Readonly<{
  runRoot: string;
  stagedCodex: string;
  stagedProfile: string;
  schemaRoot: string;
  neutralCwd: string;
  home: string;
  codexHome: string;
  tmpdir: string;
  evidencePath: string;
}>;
export type CoreCodexLogicalCommand = Readonly<{
  kind: CoreCodexCommandKind;
  argv: readonly string[];
  cwd: string;
  environment: Readonly<Record<string, string>>;
  deadlineMilliseconds: number;
  stdoutLimitBytes: number;
}>;
export type SchemaInventory = Readonly<{
  fileCount: number;
  aggregateSha256: `sha256:${string}`;
  selectedSchemaSetSha256: `sha256:${string}` | null;
  files: Readonly<Record<string, Readonly<{ sha256: `sha256:${string}`; bytes: number }>>>;
}>;
export type CodexSpawnResult = Readonly<{
  stdout: Uint8Array;
  stderr: Uint8Array;
  exitCode: number;
  timedOut: boolean;
  processGroupStarted: true;
  processGroupReaped: boolean;
  processGroupAbsent: boolean;
  syntheticDescendantsStarted: 0 | 1;
  clientWrites: 0 | 1 | 2;
  trailingBytes: number;
  handshakeExitLatencyMilliseconds: number;
  lines?: readonly Uint8Array[];
}>;
export type CoreCodexWireSummary = Readonly<{
  initializeResultSha256: `sha256:${string}`;
  sanitizedNotificationSha256: `sha256:${string}` | null;
  serverNotifications: 0 | 1;
}>;
export type CoreCodexWireGuard = Readonly<{
  acceptLine(bytes: Uint8Array): boolean;
  finish(): CoreCodexWireSummary;
}>;
export type CodexSpawnPort = Readonly<{
  mode: "construction_fake" | "production_physical";
  run(command: CoreCodexLogicalCommand, wireGuard?: CoreCodexWireGuard): Promise<CodexSpawnResult>;
  cleanup(): Promise<boolean>;
}>;

export class CoreCodexError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "CoreCodexError";
    this.code = code;
  }
}
function fail(code: string): never { throw new CoreCodexError(code); }
function sha(value: string | Uint8Array): `sha256:${string}` {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}
function uid(): number {
  if (typeof process.getuid !== "function") fail("CODEX_OWNER_UNAVAILABLE");
  return process.getuid();
}
function assertAbsoluteClean(value: string, code: string): string {
  if (!path.isAbsolute(value) || value.includes("\0") || value.split(path.sep).includes("..")) fail(code);
  return path.resolve(value);
}
function assertExistingCanonicalDirectory(value: string, mode = 0o700): string {
  const resolved = assertAbsoluteClean(value, "CODEX_ROOT_INVALID");
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid() || (stat.mode & 0o777) !== mode || fs.realpathSync(resolved) !== resolved) fail("CODEX_ROOT_INVALID");
  return resolved;
}

export function coreCodexLayout(runRoot: string): CoreCodexLayout {
  const root = assertAbsoluteClean(runRoot, "CODEX_RUN_ROOT_INVALID");
  return Object.freeze({
    runRoot: root,
    stagedCodex: path.join(root, "install/FormeLocal.app/Contents/Resources/Codex/codex"),
    stagedProfile: path.join(root, "install/FormeLocal.app/Contents/Resources/forme-codex-zero-call.sb"),
    schemaRoot: path.join(root, "build/codex-app-server-schema"),
    neutralCwd: path.join(root, "tmp/codex-neutral-cwd"),
    home: path.join(root, "auth/home"),
    codexHome: path.join(root, "auth/codex-home"),
    tmpdir: path.join(root, "tmp/codex"),
    evidencePath: path.join(root, "staging-evidence/codex-zero-call.json"),
  });
}

function exactEnvironment(layout: CoreCodexLayout): Readonly<Record<string, string>> {
  return Object.freeze({
    HOME: layout.home,
    CODEX_HOME: layout.codexHome,
    TMPDIR: layout.tmpdir,
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    NO_COLOR: "1",
    CODEX_DISABLE_ANALYTICS: "1",
  });
}
function commandTail(layout: CoreCodexLayout, kind: CoreCodexCommandKind): readonly string[] {
  if (kind === "version") return [layout.stagedCodex, "--version"];
  if (kind === "help") return [layout.stagedCodex, "app-server", "--help"];
  if (kind === "schema") return [layout.stagedCodex, "app-server", "generate-json-schema", "--out", layout.schemaRoot];
  return [layout.stagedCodex, "app-server", "--listen", "stdio://"];
}
export function buildCoreCodexLogicalCommand(layout: CoreCodexLayout, kind: CoreCodexCommandKind): CoreCodexLogicalCommand {
  if (!COMMAND_KINDS.includes(kind)) fail("CODEX_COMMAND_KIND_DENIED");
  const argv = Object.freeze([
    "/usr/bin/sandbox-exec", "-f", layout.stagedProfile,
    "-D", `STAGED_CODEX=${layout.stagedCodex}`,
    "-D", `STAGED_PROFILE=${layout.stagedProfile}`,
    "-D", `SCHEMA_ROOT=${layout.schemaRoot}`,
    "-D", `ISOLATED_HOME=${layout.home}`,
    "-D", `ISOLATED_CODEX_HOME=${layout.codexHome}`,
    "-D", `ISOLATED_TMPDIR=${layout.tmpdir}`,
    "-D", `NEUTRAL_CWD=${layout.neutralCwd}`,
    "--", ...commandTail(layout, kind),
  ]);
  return Object.freeze({ kind, argv, cwd: layout.neutralCwd, environment: exactEnvironment(layout), deadlineMilliseconds: DEADLINES[kind], stdoutLimitBytes: OUTPUT_LIMITS[kind] });
}
export function validateCoreCodexLogicalCommand(layout: CoreCodexLayout, value: CoreCodexLogicalCommand): void {
  const expected = buildCoreCodexLogicalCommand(layout, value.kind);
  if (canonicalJson(value as unknown as JsonValue) !== canonicalJson(expected as unknown as JsonValue)) fail("CODEX_LOGICAL_COMMAND_DENIED");
}

function assertNoSymlinkComponents(value: string): void {
  const resolved = assertAbsoluteClean(value, "CODEX_PATH_INVALID");
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) fail("CODEX_PATH_SYMLINK_DENIED");
  }
}
function componentIdentities(value: string): Readonly<Record<string, string>> {
  const resolved = assertAbsoluteClean(value, "CODEX_PATH_INVALID");
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const result: Record<string, string> = {};
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) fail("CODEX_PATH_SYMLINK_DENIED");
    result[cursor] = `${stat.dev}:${stat.ino}:${stat.mode}:${stat.uid}`;
  }
  return Object.freeze(result);
}
function assertComponentIdentities(expected: Readonly<Record<string, string>>): void {
  for (const [candidate, identity] of Object.entries(expected)) {
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink() || `${stat.dev}:${stat.ino}:${stat.mode}:${stat.uid}` !== identity) fail("CODEX_PATH_COMPONENT_CHANGED");
  }
}
function openedIdentity(stat: fs.Stats): string {
  return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.mode}`;
}

export function copyOpenedRegularFile(input: Readonly<{
  source: string;
  destination: string;
  expectedSha256: `sha256:${string}`;
  destinationMode: 0o500 | 0o600;
  constructionTestHookAfterOpen?: () => void;
}>): Readonly<{ sha256: `sha256:${string}`; bytes: number }> {
  if (!SHA.test(input.expectedSha256)) fail("CODEX_SOURCE_HASH_INVALID");
  assertNoSymlinkComponents(input.source);
  assertNoSymlinkComponents(path.dirname(input.destination));
  const sourceComponents = componentIdentities(input.source);
  const destinationParentComponents = componentIdentities(path.dirname(input.destination));
  const sourceFd = fs.openSync(input.source, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  let destinationFd: number | null = null;
  let createdDestination = false;
  let bytes = Buffer.alloc(0);
  try {
    const before = fs.fstatSync(sourceFd);
    if (!before.isFile() || before.uid !== uid() || before.nlink !== 1) fail("CODEX_SOURCE_FILE_UNSAFE");
    input.constructionTestHookAfterOpen?.();
    assertComponentIdentities(sourceComponents);
    assertComponentIdentities(destinationParentComponents);
    destinationFd = fs.openSync(input.destination, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, input.destinationMode);
    createdDestination = true;
    bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(sourceFd, bytes, offset, bytes.length - offset, offset);
      if (read === 0) fail("CODEX_SOURCE_SHORT_READ");
      offset += read;
    }
    if (sha(bytes) !== input.expectedSha256) fail("CODEX_SOURCE_HASH_MISMATCH");
    fs.writeSync(destinationFd, bytes, 0, bytes.length, 0);
    fs.fsyncSync(destinationFd);
    fs.fchmodSync(destinationFd, input.destinationMode);
    const after = fs.fstatSync(sourceFd);
    const sourcePath = fs.lstatSync(input.source);
    assertComponentIdentities(sourceComponents);
    assertComponentIdentities(destinationParentComponents);
    if (openedIdentity(before) !== openedIdentity(after) || sourcePath.ino !== after.ino || sourcePath.dev !== after.dev || sourcePath.nlink !== 1) fail("CODEX_SOURCE_CHANGED_DURING_COPY");
  } catch (error) {
    if (destinationFd !== null) fs.closeSync(destinationFd);
    destinationFd = null;
    if (createdDestination) try { fs.rmSync(input.destination, { force: true }); } catch { /* cleanup is checked by caller */ }
    throw error;
  } finally {
    if (destinationFd !== null) fs.closeSync(destinationFd);
    fs.closeSync(sourceFd);
    bytes.fill(0);
  }
  const staged = fs.lstatSync(input.destination);
  if (!staged.isFile() || staged.isSymbolicLink() || staged.nlink !== 1 || staged.uid !== uid() || (staged.mode & 0o777) !== input.destinationMode || fs.realpathSync(input.destination) !== input.destination) fail("CODEX_STAGE_FILE_UNSAFE");
  const stagedBytes = fs.readFileSync(input.destination);
  try {
    const stagedHash = sha(stagedBytes);
    if (stagedHash !== input.expectedSha256) fail("CODEX_STAGE_HASH_MISMATCH");
    const parentFd = fs.openSync(path.dirname(input.destination), fs.constants.O_RDONLY);
    try { fs.fsyncSync(parentFd); } finally { fs.closeSync(parentFd); }
    return Object.freeze({ sha256: stagedHash, bytes: stagedBytes.length });
  } finally { stagedBytes.fill(0); }
}

function canonicalSchemaName(relative: string): string {
  if (!relative || relative.includes("\\") || /[\0-\x1f\x7f]/u.test(relative) || path.posix.isAbsolute(relative)) fail("CODEX_SCHEMA_NAME_INVALID");
  const parts = relative.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail("CODEX_SCHEMA_NAME_INVALID");
  return `./${parts.join("/")}`;
}
function rawUtf8Sort(left: string, right: string): number { return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8")); }

export function computeSchemaInventory(schemaRoot: string, selectedNames: readonly string[] = Object.keys(CORE_CODEX_SELECTED_SCHEMAS)): SchemaInventory {
  const root = assertExistingCanonicalDirectory(schemaRoot);
  const files: Record<string, { sha256: `sha256:${string}`; bytes: number }> = {};
  const seenInodes = new Set<string>();
  const walk = (directory: string, relativeDirectory: string): number => {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    if (directory !== root && entries.length === 0) fail("CODEX_SCHEMA_EMPTY_DIRECTORY");
    let descendants = 0;
    for (const entry of entries) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const canonical = canonicalSchemaName(relative);
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink() || stat.uid !== uid() || fs.realpathSync(absolute) !== absolute) fail("CODEX_SCHEMA_ENTRY_UNSAFE");
      if (stat.isDirectory()) {
        if ((stat.mode & 0o777) !== 0o700) fail("CODEX_SCHEMA_MODE_INVALID");
        descendants += walk(absolute, relative);
      } else if (stat.isFile()) {
        if (stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) fail("CODEX_SCHEMA_ENTRY_UNSAFE");
        const inode = `${stat.dev}:${stat.ino}`;
        if (seenInodes.has(inode)) fail("CODEX_SCHEMA_HARDLINK_DENIED");
        seenInodes.add(inode);
        const value = fs.readFileSync(absolute);
        try { files[canonical] = { sha256: sha(value), bytes: value.length }; } finally { value.fill(0); }
        descendants += 1;
      } else fail("CODEX_SCHEMA_ENTRY_UNSAFE");
    }
    return descendants;
  };
  walk(root, "");
  const names = Object.keys(files).sort(rawUtf8Sort);
  const lines = names.map((name) => `${files[name]!.sha256.slice(7)}  ${name}\n`).join("");
  const selected = [...selectedNames].sort(rawUtf8Sort);
  const selectedSet = selected.every((name) => files[name]) ? sha(selected.map((name) => `${files[name]!.sha256.slice(7)}  ${name}\n`).join("")) : null;
  return Object.freeze({ fileCount: names.length, aggregateSha256: sha(lines), selectedSchemaSetSha256: selectedSet, files: Object.freeze(files) });
}

export function validateSchemaInventory(actual: SchemaInventory, expected: Readonly<{
  fileCount: number;
  aggregateSha256: `sha256:${string}`;
  selected: Readonly<Record<string, `sha256:${string}`>>;
}>): void {
  if (actual.fileCount !== expected.fileCount || actual.aggregateSha256 !== expected.aggregateSha256) fail("CODEX_SCHEMA_INVENTORY_DRIFT");
  for (const [name, expectedHash] of Object.entries(expected.selected)) if (actual.files[name]?.sha256 !== expectedHash) fail("CODEX_SELECTED_SCHEMA_DRIFT");
  if (actual.selectedSchemaSetSha256 === null) fail("CODEX_SELECTED_SCHEMA_MISSING");
}

function refsIn(value: JsonValue, output: string[] = []): string[] {
  if (Array.isArray(value)) for (const child of value) refsIn(child, output);
  else if (value !== null && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") output.push(child);
    else refsIn(child, output);
  }
  return output;
}
function compileInitializeResultSchema(schemaRoot: string): Readonly<{
  dialect: string;
  validate(value: JsonValue): boolean;
}> {
  const inventory = computeSchemaInventory(schemaRoot, ["./InitializeResponse.json"]);
  const schemaEntry = inventory.files["./InitializeResponse.json"];
  if (!schemaEntry) fail("CODEX_INITIALIZE_SCHEMA_MISSING");
  const sources = new Map<string, JsonValue>();
  for (const name of Object.keys(inventory.files)) {
    const value = parseStrictJson(fs.readFileSync(path.join(schemaRoot, name.slice(2)), "utf8"));
    sources.set(name, value);
  }
  const target = sources.get("./InitializeResponse.json");
  if (target === null || typeof target !== "object" || Array.isArray(target)) fail("CODEX_INITIALIZE_SCHEMA_INVALID");
  const dialect = (target as Record<string, JsonValue>).$schema;
  if (typeof dialect !== "string" || !DIALECTS.has(dialect)) fail("CODEX_SCHEMA_DIALECT_DENIED");
  const visited = new Set<string>();
  const visit = (name: string): void => {
    if (visited.has(name)) return;
    const schema = sources.get(name);
    if (!schema) fail("CODEX_SCHEMA_REFERENCE_MISSING");
    visited.add(name);
    if (schema !== null && typeof schema === "object" && !Array.isArray(schema)) {
      const ownDialect = (schema as Record<string, JsonValue>).$schema;
      if (ownDialect !== undefined && ownDialect !== dialect) fail("CODEX_SCHEMA_DIALECT_MISMATCH");
    }
    for (const reference of refsIn(schema)) {
      if (reference.startsWith("#")) continue;
      const [file] = reference.split("#", 1);
      if (!file || /^\w+:\/\//u.test(file) || path.posix.isAbsolute(file) || file.includes("\\") || file.split("/").includes("..")) fail("CODEX_REMOTE_SCHEMA_REFERENCE_DENIED");
      visit(canonicalSchemaName(file.startsWith("./") ? file.slice(2) : file));
    }
  };
  visit("./InitializeResponse.json");
  const ids = new Set<string>();
  for (const schema of sources.values()) if (schema !== null && typeof schema === "object" && !Array.isArray(schema)) {
    const id = (schema as Record<string, JsonValue>).$id;
    if (typeof id === "string") { if (ids.has(id)) fail("CODEX_SCHEMA_DUPLICATE_ID"); ids.add(id); }
  }
  const ajv = dialect === "http://json-schema.org/draft-07/schema#"
    ? new Ajv({ strict: true, strictSchema: true, allErrors: false, coerceTypes: false, removeAdditional: false, useDefaults: false, allowUnionTypes: false, validateFormats: true, unicodeRegExp: true, ownProperties: true })
    : new Ajv2020({ strict: true, strictSchema: true, allErrors: false, coerceTypes: false, removeAdditional: false, useDefaults: false, allowUnionTypes: false, validateFormats: true, unicodeRegExp: true, ownProperties: true });
  addFormats(ajv, { mode: "full", keywords: false });
  for (const [name, schema] of sources) ajv.addSchema(schema as object, name);
  const validator = ajv.getSchema("./InitializeResponse.json");
  if (!validator) fail("CODEX_INITIALIZE_SCHEMA_INVALID");
  return Object.freeze({
    dialect,
    validate(value: JsonValue): boolean { return validator(value) === true; },
  });
}

export function validateGeneratedInitializeSchema(schemaRoot: string): Readonly<{ dialect: string }> {
  const compiled = compileInitializeResultSchema(schemaRoot);
  return Object.freeze({ dialect: compiled.dialect });
}

export function validateInitializeResultAgainstGeneratedSchema(schemaRoot: string, fixture: JsonValue): Readonly<{ dialect: string; fixtureSha256: `sha256:${string}` }> {
  const compiled = compileInitializeResultSchema(schemaRoot);
  if (!compiled.validate(fixture)) fail("CODEX_INITIALIZE_RESULT_SCHEMA_INVALID");
  return Object.freeze({ dialect: compiled.dialect, fixtureSha256: sha(canonicalJson(fixture)) });
}

function exactObject(value: JsonValue, keys: readonly string[], code: string): Record<string, JsonValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const object = value as Record<string, JsonValue>;
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
  return object;
}
export function createCoreCodexWireGuard(validateInitializeResult: (value: JsonValue) => boolean): CoreCodexWireGuard {
  let responseAccepted = false;
  let notificationAccepted = false;
  let finished = false;
  const acceptLine = (bytes: Uint8Array): boolean => {
    if (finished || responseAccepted) fail("CODEX_WIRE_AFTER_RESPONSE_DENIED");
    if (bytes.length > 1_048_576) fail("CODEX_WIRE_LINE_TOO_LARGE");
    let parsed: JsonValue;
    const ownedBytes = Buffer.from(bytes);
    try { parsed = parseStrictJson(ownedBytes.toString("utf8")); }
    catch { fail("CODEX_WIRE_JSON_INVALID"); }
    finally { ownedBytes.fill(0); }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) fail("CODEX_WIRE_SHAPE_INVALID");
    const object = exactObject(parsed, Object.prototype.hasOwnProperty.call(parsed as object, "method")
      ? (Object.prototype.hasOwnProperty.call(parsed as object, "id") ? ["id", "method", "params"] : ["method", "params"])
      : ["id", "result"], "CODEX_WIRE_SHAPE_INVALID");
    if (typeof object.method === "string") {
      if (object.id !== undefined) fail("CODEX_SERVER_REQUEST_DENIED");
      if (object.method !== "remoteControl/status/changed" || notificationAccepted) fail("CODEX_SERVER_NOTIFICATION_DENIED");
      if (object.params === null || typeof object.params !== "object" || Array.isArray(object.params) || (object.params as Record<string, JsonValue>).status !== "disabled") fail("CODEX_SERVER_NOTIFICATION_DENIED");
      const parameterKeys = Object.keys(object.params as Record<string, JsonValue>).sort();
      if (parameterKeys.some((key) => !["installationId", "machineName", "status"].includes(key))) fail("CODEX_SERVER_NOTIFICATION_DENIED");
      for (const key of ["installationId", "machineName"]) {
        const value = (object.params as Record<string, JsonValue>)[key];
        if (value !== undefined && typeof value !== "string") fail("CODEX_SERVER_NOTIFICATION_DENIED");
      }
      notificationAccepted = true;
      return false;
    } else {
      if (object.id !== 0 || object.result === undefined || !validateInitializeResult(object.result)) fail("CODEX_INITIALIZE_RESPONSE_INVALID");
      if (object.result === undefined) fail("CODEX_INITIALIZE_RESPONSE_INVALID");
      responseAccepted = true;
      return true;
    }
  };
  const finish = (): CoreCodexWireSummary => {
    if (finished) fail("CODEX_WIRE_ALREADY_FINISHED");
    finished = true;
    if (!responseAccepted) fail("CODEX_INITIALIZE_RESPONSE_MISSING");
    const sanitized = { schemaVersion: "r4.codex.initialize-result-sanitized.v1", responseId: 0, schemaValid: true };
    const notification = { schemaVersion: "r4.codex.remote-control-status-sanitized.v1", status: "disabled" };
    return Object.freeze({
      initializeResultSha256: sha(canonicalJson(sanitized)),
      sanitizedNotificationSha256: notificationAccepted ? sha(canonicalJson(notification)) : null,
      serverNotifications: notificationAccepted ? 1 : 0,
    });
  };
  return Object.freeze({ acceptLine, finish });
}

export function validateCoreCodexWire(lines: readonly Uint8Array[], validateInitializeResult: (value: JsonValue) => boolean): CoreCodexWireSummary {
  const guard = createCoreCodexWireGuard(validateInitializeResult);
  for (const bytes of lines) guard.acceptLine(bytes);
  return guard.finish();
}

export function computeIsolatedWriteInventory(layout: CoreCodexLayout): Readonly<{ sha256: `sha256:${string}`; entryCount: number }> {
  const roots = Object.freeze({ schema: layout.schemaRoot, home: layout.home, codex_home: layout.codexHome, tmp: layout.tmpdir });
  const lines: string[] = [];
  for (const [tag, rootPath] of Object.entries(roots).sort(([a], [b]) => rawUtf8Sort(a, b))) {
    const root = assertExistingCanonicalDirectory(rootPath);
    const walk = (directory: string, relativeDirectory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => rawUtf8Sort(a.name, b.name))) {
        const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
        canonicalSchemaName(relative);
        const absolute = path.join(directory, entry.name);
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink() || stat.uid !== uid() || fs.realpathSync(absolute) !== absolute || (stat.isFile() && stat.nlink !== 1)) fail("CODEX_WRITE_ENTRY_UNSAFE");
        if (tag === "codex_home" && !CORE_CODEX_ALLOWED_HOME.includes(relative.split("/")[0]!)) fail("CODEX_HOME_WRITESET_ESCAPE");
        if (tag !== "schema" && /(?:session|rollout|auth|credential)/iu.test(relative)) fail("CODEX_PRIVATE_WRITE_DENIED");
        const mode = (stat.mode & 0o777).toString(8).padStart(4, "0");
        if (stat.isDirectory()) {
          lines.push(`${tag}\t${relative}\tdirectory\t${mode}\t${tag === "schema" ? "0\t-" : "-\t-"}\n`);
          walk(absolute, relative);
        } else if (stat.isFile()) {
          if (tag === "schema") {
            const bytes = fs.readFileSync(absolute);
            try { lines.push(`${tag}\t${relative}\tfile\t${mode}\t${bytes.length}\t${sha(bytes)}\n`); } finally { bytes.fill(0); }
          } else {
            if (stat.size > 8 * 1_048_576) fail("CODEX_PRIVATE_WRITE_TOO_LARGE");
            const bytes = fs.readFileSync(absolute);
            try {
              const text = bytes.toString("utf8");
              if (/(?:responseText|prompt|transcript|authorization|bearer\s|credential|private[-_ ]?key)/iu.test(text)) fail("CODEX_PRIVATE_WRITE_DENIED");
            } finally { bytes.fill(0); }
            lines.push(`${tag}\t${relative}\tfile\t${mode}\t-\t-\n`);
          }
        } else fail("CODEX_WRITE_ENTRY_UNSAFE");
      }
    };
    walk(root, "");
  }
  lines.sort((left, right) => rawUtf8Sort(left, right));
  return Object.freeze({ sha256: sha(lines.join("")), entryCount: lines.length });
}

function commandShapeValue(layout: CoreCodexLayout, kind: CoreCodexCommandKind): JsonValue {
  const command = buildCoreCodexLogicalCommand(layout, kind);
  const substitutions = new Map<string, string>([
    [layout.stagedCodex, "${STAGED_CODEX}"], [layout.stagedProfile, "${STAGED_PROFILE}"],
    [layout.schemaRoot, "${SCHEMA_ROOT}"], [layout.neutralCwd, "${NEUTRAL_CWD}"],
    [layout.home, "${HOME}"], [layout.codexHome, "${CODEX_HOME}"], [layout.tmpdir, "${TMPDIR}"],
  ]);
  const normalize = (value: string): string => {
    for (const [literal, symbolic] of substitutions) {
      if (value === literal) return symbolic;
      if (value.endsWith(`=${literal}`)) return `${value.slice(0, value.length - literal.length)}${symbolic}`;
    }
    return value;
  };
  return {
    kind,
    argv: command.argv.map(normalize),
    cwd: normalize(command.cwd),
    environment: Object.fromEntries(Object.entries(command.environment).map(([key, value]) => [key, normalize(value)])),
    deadlineMilliseconds: command.deadlineMilliseconds,
    stdoutLimitBytes: command.stdoutLimitBytes,
  };
}

export function coreCodexLogicalCommandShapeSha256(layout: CoreCodexLayout): Readonly<Record<CoreCodexCommandKind, `sha256:${string}`>> {
  return Object.freeze(Object.fromEntries(COMMAND_KINDS.map((kind) => [kind, sha(canonicalJson(commandShapeValue(layout, kind)))])) as Record<CoreCodexCommandKind, `sha256:${string}`>);
}

export async function runCoreCodexZeroCall(input: Readonly<{
  layout: CoreCodexLayout;
  spawnPort: CodexSpawnPort;
  expectedSchema: Readonly<{ fileCount: number; aggregateSha256: `sha256:${string}`; selected: Readonly<Record<string, `sha256:${string}`>> }>;
  publicHashes: Readonly<{
    profileSourceSha256: `sha256:${string}`;
    profileStagedSha256: `sha256:${string}`;
    launcherSourceSha256: `sha256:${string}`;
    nativeSourceSha256: `sha256:${string}`;
    nativeStagedSha256: `sha256:${string}`;
  }>;
}>): Promise<Readonly<Record<string, JsonValue>>> {
  if (!(["construction_fake", "production_physical"] as const).includes(input.spawnPort.mode)) fail("CODEX_SPAWN_PORT_MODE_DENIED");
  for (const value of Object.values(input.publicHashes)) if (!SHA.test(value)) fail("CODEX_PUBLIC_HASH_INVALID");
  const results: CodexSpawnResult[] = [];
  let cleanupPassed = false;
  try {
    const validateResult = (kind: CoreCodexCommandKind, command: CoreCodexLogicalCommand, result: CodexSpawnResult): void => {
      if (result.timedOut || result.exitCode !== 0 || result.stderr.length !== 0 || result.stdout.length > command.stdoutLimitBytes || !result.processGroupReaped || !result.processGroupAbsent) fail("CODEX_CHILD_EXECUTION_FAILED");
      if (result.syntheticDescendantsStarted !== 0) fail("CODEX_UNEXPECTED_DESCENDANT");
      if (result.trailingBytes !== 0 || result.handshakeExitLatencyMilliseconds > 2_000) fail("CODEX_CHILD_PROTOCOL_INCOMPLETE");
      if (result.clientWrites !== (kind === "initialize" ? 2 : 0)) fail("CODEX_CLIENT_WRITE_COUNT_INVALID");
      if (kind === "version" && Buffer.from(result.stdout).toString("utf8") !== CORE_CODEX_VERSION) fail("CODEX_VERSION_DRIFT");
      if (kind === "schema" && result.stdout.length !== 0) fail("CODEX_SCHEMA_STDOUT_NONEMPTY");
    };
    for (const kind of COMMAND_KINDS.slice(0, 3)) {
      const command = buildCoreCodexLogicalCommand(input.layout, kind);
      validateCoreCodexLogicalCommand(input.layout, command);
      const result = await input.spawnPort.run(command);
      results.push(result);
      validateResult(kind, command, result);
    }
    const inventory = computeSchemaInventory(input.layout.schemaRoot, Object.keys(input.expectedSchema.selected));
    validateSchemaInventory(inventory, input.expectedSchema);
    const compiledInitializeResult = compileInitializeResultSchema(input.layout.schemaRoot);
    guardClientMessage(initializeMessage());
    const wireGuard = createCoreCodexWireGuard((value) => compiledInitializeResult.validate(value));
    const initializeCommand = buildCoreCodexLogicalCommand(input.layout, "initialize");
    validateCoreCodexLogicalCommand(input.layout, initializeCommand);
    const initializeResult = await input.spawnPort.run(initializeCommand, wireGuard);
    results.push(initializeResult);
    validateResult("initialize", initializeCommand, initializeResult);
    const postInitializeInventory = computeSchemaInventory(input.layout.schemaRoot, Object.keys(input.expectedSchema.selected));
    validateSchemaInventory(postInitializeInventory, input.expectedSchema);
    if (canonicalJson(postInitializeInventory as unknown as JsonValue) !== canonicalJson(inventory as unknown as JsonValue)) fail("CODEX_SCHEMA_CHANGED_AFTER_COMPILE");
    const wire = wireGuard.finish();
    guardClientMessage(initializedMessage());
    const writes = computeIsolatedWriteInventory(input.layout);
    cleanupPassed = await input.spawnPort.cleanup();
    if (!cleanupPassed) fail("CODEX_CLEANUP_FAILED");
    const evidence = {
      schemaVersion: "r4.gate-b-core.codex-zero-call-evidence.v1",
      status: input.spawnPort.mode === "production_physical" ? "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN" : "ZERO_CALL_CHILD_MECHANISM_GREEN",
      reasonCode: "clean_zero_call_mechanism",
      ...input.publicHashes,
      logicalCommandShapeSha256: coreCodexLogicalCommandShapeSha256(input.layout),
      reportedVersion: "codex-cli 0.145.0",
      helpStdoutSha256: sha(results[1]!.stdout),
      helpStdoutBytes: results[1]!.stdout.length,
      schemaStdoutBytes: 0,
      schemaFileCount: inventory.fileCount,
      schemaAggregateSha256: inventory.aggregateSha256,
      selectedSchemaSetSha256: inventory.selectedSchemaSetSha256,
      initializeResultSha256: wire.initializeResultSha256,
      sanitizedNotificationSha256: wire.sanitizedNotificationSha256,
      clientWrites: 2,
      serverResponses: 1,
      serverRequests: 0,
      serverNotifications: wire.serverNotifications,
      exitCodes: results.map((result) => result.exitCode),
      stderrBytes: 0,
      isolatedWriteInventorySha256: writes.sha256,
      processGroupsStarted: 4,
      processStartSlotsConsumed: 4,
      syntheticDescendantsStarted: results.reduce((total, result) => total + result.syntheticDescendantsStarted, 0),
      allStartedGroupsReaped: results.every((result) => result.processGroupReaped),
      allStartedGroupsAbsent: results.every((result) => result.processGroupAbsent),
      threadStarts: 0,
      turnStarts: 0,
      providerCalls: 0,
      providerBytes: 0,
      networkBytes: 0,
      networkAuthority: 0,
      networkTransmittedBytes: 0,
      networkSyscallAttemptAbsenceClaimed: false,
      causalFinality: "UNPROVEN_ACCEPTED",
      postResponseFinalityProven: false,
      receiveBufferEmptyBeforeSecondWrite: true,
      preSecondWriteViolationObserved: false,
      postSecondWriteViolationObserved: false,
      cleanupPassed,
      cleanupStatus: "GREEN",
      aiLaneEnabled: false,
      aggregateVerdict: "YELLOW",
    } satisfies Record<string, JsonValue>;
    return Object.freeze(evidence);
  } finally {
    for (const result of results) {
      result.stdout.fill(0);
      result.stderr.fill(0);
      for (const line of result.lines ?? []) line.fill(0);
    }
    if (!cleanupPassed) await input.spawnPort.cleanup().catch(() => false);
  }
}
