import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

export const IMAGE_REFERENCE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
export const IMAGE_PLATFORM = "linux/arm64";
export const POSTGRES_SERVER_VERSION_NUM = 160010;
export const VERIFY_ASSERTION_IDS = Object.freeze([
  "public_core_table_inventory_drift",
  "public_core_index_inventory_drift",
  "public_core_constraint_inventory_drift",
  "public_core_constraint_definition_drift",
  "public_core_key_constraint_definition_drift",
  "public_core_foreign_key_definition_drift",
  "public_core_index_definition_drift",
  "public_core_index_predicate_or_collation_drift",
  "public_core_column_definition_drift",
  "public_core_catalog_manifest_drift",
  "public_core_singleton_seed_invalid",
  "public_core_unexpected_durable_rows",
  "public_core_unexpected_object_present",
  "public_core_check_constraint_definition_drift",
  "public_core_forbidden_column_present",
  "public_core_body_free_table_drift",
  "public_core_encrypted_field_inventory_drift",
  "public_core_composite_room_scope_drift",
]);
const VERIFY_ASSERTION_ID_SET = new Set(VERIFY_ASSERTION_IDS);
const VERIFY_DIAGNOSTIC_STATUS = "PUBLIC_CORE_ASSERTION_VECTOR_COMPLETE";
export const SQL_BINDINGS = Object.freeze({
  schema: Object.freeze({
    path: "schemas/r4/public-core/schema.sql",
    sha256: "sha256:752affd9c237edf0469ec1486269ad68f46b3b83f93d63d80666f0d20984cb00",
  }),
  verify: Object.freeze({
    path: "schemas/r4/public-core/verify.sql",
    sha256: "sha256:1b05175a925a2a8c614976c0e70700b6f9b7dab1fd59557d0eef6edb0f64c85e",
  }),
  rollback: Object.freeze({
    path: "schemas/r4/public-core/rollback.sql",
    sha256: "sha256:317c5cabc0af6d368fdb3d7d5e03ea97de2a58414bbd382883ee0fffd5c6878d",
  }),
});

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCKER_CLI = "/Applications/Docker.app/Contents/Resources/bin/docker";
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_READINESS_ATTEMPTS = 60;
const READINESS_DELAY_MS = 1_000;
const READINESS_DEADLINE_MS = 60_000;
const OWNER_LABEL = "forme.r4.owner";
const OWNER_VALUE = "disposable-postgres-rehearsal";
const RUN_LABEL = "forme.r4.run";
const ENABLER_LABEL = "forme.r4.enabler";
export const READINESS_OUTCOMES = Object.freeze([
  "READY",
  "CONNECT_RETRYABLE",
  "CONNECT_FAILED",
  "AUTH_OR_CONFIGURATION_FAILED",
  "QUERY_FAILED",
  "RESULT_INVALID",
  "CLIENT_CLOSE_FAILED",
]);
const RETRYABLE_READINESS_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "57P03"]);
const AUTH_OR_CONFIGURATION_CODES = new Set(["28000", "28P01", "3D000"]);

class RehearsalError extends Error {
  constructor(code, phase, { ambiguous = false, diagnostic = null } = {}) {
    super(code);
    this.name = "RehearsalError";
    this.code = code;
    this.phase = phase;
    this.ambiguous = ambiguous;
    this.diagnostic = diagnostic;
  }
}

function fail(code, phase, options) {
  throw new RehearsalError(code, phase, options);
}

function readinessDiagnostic(readinessOutcome, attempts) {
  if (!READINESS_OUTCOMES.includes(readinessOutcome) || !Number.isSafeInteger(attempts) || attempts < 1) {
    fail("disposable_postgres_readiness_diagnostic_invalid", "postgres.readiness", { ambiguous: true });
  }
  return Object.freeze({ readinessOutcome, attempts });
}

function errorCode(error) {
  return error !== null && typeof error === "object" && typeof error.code === "string" ? error.code : null;
}

function classifyConnectFailure(error) {
  const code = errorCode(error);
  if (code !== null && RETRYABLE_READINESS_CODES.has(code)) return "CONNECT_RETRYABLE";
  if (code !== null && AUTH_OR_CONFIGURATION_CODES.has(code)) return "AUTH_OR_CONFIGURATION_FAILED";
  return "CONNECT_FAILED";
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sanitizeError(error) {
  if (error instanceof RehearsalError) {
    return Object.freeze({ code: error.code, phase: error.phase, ambiguous: error.ambiguous, diagnostic: error.diagnostic });
  }
  return Object.freeze({ code: "disposable_postgres_unexpected_failure", phase: "unknown", ambiguous: true });
}

export function projectPostgresDiagnostic(error, phase = null) {
  if (error === null || typeof error !== "object") return null;
  const value = error;
  const pgCode = typeof value.code === "string" && /^[0-9A-Z]{5}$/u.test(value.code) ? value.code : null;
  const severity = typeof value.severity === "string" && /^[A-Z ]{3,20}$/u.test(value.severity) ? value.severity : null;
  const position = typeof value.position === "string" && /^[1-9][0-9]{0,8}$/u.test(value.position) ? value.position : null;
  const routine = typeof value.routine === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/u.test(value.routine) ? value.routine : null;
  const verifyAssertion = typeof phase === "string" && phase.startsWith("postgres.verify.")
    && pgCode === "P0001" && routine === "exec_stmt_raise"
    && typeof value.message === "string" && VERIFY_ASSERTION_ID_SET.has(value.message)
    ? value.message
    : null;
  if (pgCode === null && severity === null && position === null && routine === null) return null;
  return Object.freeze({ pgCode, severity, position, routine, verifyAssertion });
}

export function projectVerifyAssertionNotice(notice) {
  if (notice === null || typeof notice !== "object" || Array.isArray(notice)) return null;
  return notice.code === "00000"
    && notice.severity === "NOTICE"
    && notice.routine === "exec_stmt_raise"
    && typeof notice.message === "string"
    && VERIFY_ASSERTION_ID_SET.has(notice.message)
    ? notice.message
    : null;
}

export function normalizeVerifyAssertionVector(assertionIds) {
  if (!Array.isArray(assertionIds) || assertionIds.some((value) => typeof value !== "string")) {
    fail("disposable_postgres_verify_diagnostic_invalid", "postgres.verify-diagnostic", { ambiguous: true });
  }
  const positions = assertionIds.map((value) => VERIFY_ASSERTION_IDS.indexOf(value));
  if (positions.some((position) => position < 0)
      || new Set(assertionIds).size !== assertionIds.length
      || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
    fail("disposable_postgres_verify_diagnostic_invalid", "postgres.verify-diagnostic", { ambiguous: true });
  }
  return Object.freeze([...assertionIds]);
}

export function buildVerifyAssertionDiagnosticSql(verifySql) {
  if (typeof verifySql !== "string" || !verifySql.startsWith("-- R4 #67 Durable Public Core proposed verification.")) {
    fail("disposable_postgres_verify_diagnostic_source_invalid", "sql.verify-diagnostic");
  }
  const raisePattern = /RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '([a-z0-9_]+)';/gu;
  const identifiers = [...verifySql.matchAll(raisePattern)].map((match) => match[1]);
  if (canonicalJson(identifiers) !== canonicalJson(VERIFY_ASSERTION_IDS)) {
    fail("disposable_postgres_verify_diagnostic_source_invalid", "sql.verify-diagnostic");
  }
  const completionPattern = /SELECT\s+'PUBLIC_CORE_SCHEMA_PROPOSED_VERIFIED'::text AS status,\s+14::integer AS application_table_count,\s+0::integer AS migration_executions,\s+false AS traffic_ready,\s+false AS gate_c_ready;/u;
  const completionMatches = verifySql.match(new RegExp(completionPattern.source, "gu")) ?? [];
  if (completionMatches.length !== 1) fail("disposable_postgres_verify_diagnostic_source_invalid", "sql.verify-diagnostic");
  const diagnosticSql = verifySql
    .replace(raisePattern, (_statement, identifier) => `RAISE NOTICE USING ERRCODE = '00000', MESSAGE = '${identifier}';`)
    .replace(completionPattern, `SELECT '${VERIFY_DIAGNOSTIC_STATUS}'::text AS status, ${VERIFY_ASSERTION_IDS.length}::integer AS assertion_count;`);
  if (diagnosticSql.includes("RAISE EXCEPTION USING ERRCODE = 'P0001'")
      || (diagnosticSql.match(/RAISE NOTICE USING ERRCODE = '00000'/gu) ?? []).length !== VERIFY_ASSERTION_IDS.length) {
    fail("disposable_postgres_verify_diagnostic_source_invalid", "sql.verify-diagnostic");
  }
  return diagnosticSql;
}

function exactObject(value, phase) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("disposable_postgres_docker_result_invalid", phase, { ambiguous: true });
  return value;
}

function parseJson(text, phase) {
  try {
    return JSON.parse(text);
  } catch {
    fail("disposable_postgres_docker_json_invalid", phase, { ambiguous: true });
  }
}

function assertRunId(runId) {
  if (typeof runId !== "string" || !/^[0-9a-f]{16}$/u.test(runId)) fail("disposable_postgres_run_id_invalid", "input");
}

export function parseCliArguments(argv) {
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== "string")) {
    fail("disposable_postgres_cli_invalid", "input");
  }
  if (argv.length === 0) return Object.freeze({ mode: "rehearse", allowImagePull: false });
  if (argv.length === 1 && argv[0] === "diagnose") {
    return Object.freeze({ mode: "diagnose", allowImagePull: false });
  }
  if (argv.length === 2 && argv[0] === "diagnose" && argv[1] === "--allow-image-pull") {
    return Object.freeze({ mode: "diagnose", allowImagePull: true });
  }
  if (argv.length === 1 && argv[0] === "--allow-image-pull") {
    return Object.freeze({ mode: "rehearse", allowImagePull: true });
  }
  fail("disposable_postgres_cli_invalid", "input");
}

export function createRunSpec(runId, runtimeRoot = `/private/tmp/forme-r4-pg-${runId}`) {
  assertRunId(runId);
  const labels = Object.freeze({
    [OWNER_LABEL]: OWNER_VALUE,
    [RUN_LABEL]: runId,
    [ENABLER_LABEL]: "77",
  });
  return Object.freeze({
    runId,
    runtimeRoot,
    labels,
    names: Object.freeze({
      container: `forme-r4-pg-${runId}`,
      network: `forme-r4-pg-net-${runId}`,
      volume: `forme-r4-pg-vol-${runId}`,
    }),
    postgres: Object.freeze({
      user: "forme_r4_local",
      database: "forme_r4_local",
      containerPort: 5432,
      passwordTarget: "/run/secrets/postgres_password",
    }),
  });
}

export function readPinnedSql(repositoryRoot = REPOSITORY_ROOT) {
  const result = {};
  for (const [kind, binding] of Object.entries(SQL_BINDINGS)) {
    const absolute = path.join(repositoryRoot, binding.path);
    const bytes = fs.readFileSync(absolute);
    if (sha256(bytes) !== binding.sha256) fail("disposable_postgres_sql_binding_invalid", `sql.${kind}`);
    result[kind] = bytes.toString("utf8");
  }
  const verifyDiagnostic = buildVerifyAssertionDiagnosticSql(result.verify);
  return Object.freeze({
    ...result,
    verifyDiagnostic,
    verifyDiagnosticSha256: sha256(Buffer.from(verifyDiagnostic, "utf8")),
  });
}

function labelArgs(labels) {
  return Object.entries(labels).sort(([left], [right]) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
    .flatMap(([key, value]) => ["--label", `${key}=${value}`]);
}

export function buildContainerCreateArguments(spec, passwordPath) {
  if (typeof passwordPath !== "string" || !path.isAbsolute(passwordPath)) fail("disposable_postgres_password_path_invalid", "input");
  const mountSecret = `type=bind,src=${passwordPath},dst=${spec.postgres.passwordTarget},readonly`;
  const mountData = `type=volume,src=${spec.names.volume},dst=/var/lib/postgresql/data`;
  return Object.freeze([
    "container", "create", "--name", spec.names.container,
    ...labelArgs(spec.labels),
    "--platform", IMAGE_PLATFORM,
    "--network", spec.names.network,
    "--publish", `127.0.0.1::${spec.postgres.containerPort}`,
    "--mount", mountData,
    "--mount", mountSecret,
    "--env", `POSTGRES_PASSWORD_FILE=${spec.postgres.passwordTarget}`,
    "--env", `POSTGRES_USER=${spec.postgres.user}`,
    "--env", `POSTGRES_DB=${spec.postgres.database}`,
    IMAGE_REFERENCE,
  ]);
}

export function validateRunningPublishedPort(object, containerPort, expectedPort = null, phase = "docker.container.inspect") {
  if (object === null || typeof object !== "object" || Array.isArray(object)
      || !Number.isSafeInteger(containerPort) || containerPort < 1 || containerPort > 65_535
      || (expectedPort !== null && (!Number.isSafeInteger(expectedPort) || expectedPort < 1 || expectedPort > 65_535))) {
    fail("disposable_postgres_port_binding_invalid", phase, { ambiguous: true });
  }
  if (object.State?.Running !== true) fail("disposable_postgres_container_not_running", phase);
  const bindings = object.NetworkSettings?.Ports?.[`${containerPort}/tcp`];
  if (!Array.isArray(bindings) || bindings.length !== 1 || bindings[0]?.HostIp !== "127.0.0.1"
      || !/^[1-9][0-9]{1,4}$/u.test(bindings[0]?.HostPort ?? "")) {
    fail("disposable_postgres_port_binding_invalid", phase, { ambiguous: true });
  }
  const port = Number(bindings[0].HostPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("disposable_postgres_port_binding_invalid", phase, { ambiguous: true });
  }
  if (expectedPort !== null && port !== expectedPort) {
    fail("disposable_postgres_port_binding_changed", phase, { ambiguous: true });
  }
  return port;
}

function assertOwnedLabels(actual, spec, phase) {
  const labels = exactObject(actual ?? {}, phase);
  for (const [key, value] of Object.entries(spec.labels)) {
    if (labels[key] !== value) fail("disposable_postgres_resource_ownership_mismatch", phase, { ambiguous: true });
  }
}

function boundedAppend(chunks, chunk, state, phase) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  state.bytes += bytes.length;
  if (state.bytes > MAX_OUTPUT_BYTES) fail("disposable_postgres_docker_output_limit", phase, { ambiguous: true });
  chunks.push(bytes);
}

function runProcess(executable, args, { env, timeoutMs, phase }) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: "/", env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    const stdoutState = { bytes: 0 };
    const stderrState = { bytes: 0 };
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      try { boundedAppend(stdout, chunk, stdoutState, phase); }
      catch (error) { child.kill("SIGKILL"); reject(error); }
    });
    child.stderr.on("data", (chunk) => {
      try { boundedAppend(stderr, chunk, stderrState, phase); }
      catch (error) { child.kill("SIGKILL"); reject(error); }
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new RehearsalError("disposable_postgres_docker_spawn_failed", phase, { ambiguous: true }));
    });
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      resolve(Object.freeze({
        status,
        signal,
        timedOut,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderrBytes: stderrState.bytes,
      }));
    });
  });
}

function verifyDockerCli() {
  const real = fs.realpathSync(DOCKER_CLI);
  const stat = fs.lstatSync(DOCKER_CLI);
  if (real !== DOCKER_CLI || !stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o111) === 0) {
    fail("disposable_postgres_docker_cli_invalid", "preflight");
  }
}

function resolveDockerSocket() {
  const socketPath = path.join(fs.realpathSync(os.homedir()), ".docker", "run", "docker.sock");
  const stat = fs.lstatSync(socketPath);
  const uid = typeof process.getuid === "function" ? process.getuid() : stat.uid;
  if (fs.realpathSync(socketPath) !== socketPath || !stat.isSocket() || stat.isSymbolicLink() || stat.uid !== uid) {
    fail("disposable_postgres_docker_socket_invalid", "preflight");
  }
  return socketPath;
}

function createPrivateRuntimeRoot(runId) {
  const realTemporaryRoot = fs.realpathSync(os.tmpdir());
  const runtimeRoot = fs.mkdtempSync(path.join(realTemporaryRoot, `forme-r4-pg-${runId}-`));
  fs.chmodSync(runtimeRoot, 0o700);
  const dockerConfig = path.join(runtimeRoot, "docker-config");
  fs.mkdirSync(dockerConfig, { mode: 0o700 });
  const configPath = path.join(dockerConfig, "config.json");
  fs.writeFileSync(configPath, "{\"auths\":{}}\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  const passwordPath = path.join(runtimeRoot, "postgres-password");
  const password = randomBytes(32).toString("base64url");
  fs.writeFileSync(passwordPath, `${password}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return Object.freeze({ runtimeRoot, dockerConfig, passwordPath, password });
}

function removePrivateRuntimeRoot(runtime) {
  if (runtime === null) return true;
  const parent = fs.realpathSync(os.tmpdir());
  const relative = path.relative(parent, runtime.runtimeRoot);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !relative.startsWith("forme-r4-pg-")) {
    fail("disposable_postgres_runtime_root_invalid", "cleanup.local", { ambiguous: true });
  }
  fs.rmSync(runtime.runtimeRoot, { recursive: true, force: false });
  return !fs.existsSync(runtime.runtimeRoot);
}

function createPhysicalDocker(spec, runtime, socketPath) {
  const env = Object.freeze({
    HOME: runtime.runtimeRoot,
    DOCKER_CONFIG: runtime.dockerConfig,
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
  });
  const callCounts = {};

  async function call(kind, args, { allowStatusOne = false, timeoutMs = 60_000 } = {}) {
    callCounts[kind] = (callCounts[kind] ?? 0) + 1;
    const result = await runProcess(DOCKER_CLI, ["--host", `unix://${socketPath}`, ...args], { env, timeoutMs, phase: `docker.${kind}` });
    if (result.timedOut || result.signal !== null || result.status === null) {
      fail("disposable_postgres_docker_call_ambiguous", `docker.${kind}`, { ambiguous: true });
    }
    if (result.status !== 0 && !(allowStatusOne && result.status === 1)) {
      fail("disposable_postgres_docker_call_failed", `docker.${kind}`);
    }
    return result;
  }

  async function version() {
    const result = await call("version", ["version", "--format", "{{json .}}"]);
    const parsed = exactObject(parseJson(result.stdout.trim(), "docker.version"), "docker.version");
    const client = exactObject(parsed.Client, "docker.version");
    const server = exactObject(parsed.Server, "docker.version");
    if (typeof client.Version !== "string" || typeof server.Version !== "string" || server.Os !== "linux" || server.Arch !== "arm64") {
      fail("disposable_postgres_docker_host_incompatible", "docker.version");
    }
    return Object.freeze({ clientVersion: client.Version, serverVersion: server.Version, platform: `${server.Os}/${server.Arch}` });
  }

  async function inspectImage() {
    const result = await call("image.inspect", ["image", "inspect", "--format", "{{json .}}", IMAGE_REFERENCE], { allowStatusOne: true });
    if (result.status === 1) return null;
    const image = exactObject(parseJson(result.stdout.trim(), "docker.image.inspect"), "docker.image.inspect");
    if (image.Os !== "linux" || image.Architecture !== "arm64") fail("disposable_postgres_image_platform_mismatch", "docker.image.inspect");
    if (!Array.isArray(image.RepoDigests) || !image.RepoDigests.includes(IMAGE_REFERENCE)) fail("disposable_postgres_image_digest_mismatch", "docker.image.inspect");
    return Object.freeze({ id: image.Id, platform: `${image.Os}/${image.Architecture}` });
  }

  async function pullImage() {
    await call("image.pull", ["image", "pull", "--platform", IMAGE_PLATFORM, IMAGE_REFERENCE], { timeoutMs: 180_000 });
  }

  async function listExact(kind, name) {
    const noun = kind === "container" ? ["container", "ls", "--all"] : [kind, "ls"];
    const result = await call(`${kind}.list`, [...noun, "--filter", `name=^${name}$`, "--format", "{{json .}}"]);
    const rows = result.stdout.split("\n").filter((line) => line.trim() !== "").map((line) => exactObject(parseJson(line, `docker.${kind}.list`), `docker.${kind}.list`));
    const exact = rows.filter((row) => (kind === "container" ? row.Names : row.Name) === name);
    if (exact.length > 1) fail("disposable_postgres_resource_inventory_invalid", `docker.${kind}.list`, { ambiguous: true });
    return exact.length === 1;
  }

  async function inspect(kind, name) {
    const result = await call(`${kind}.inspect`, [kind, "inspect", name]);
    const parsed = parseJson(result.stdout, `docker.${kind}.inspect`);
    if (!Array.isArray(parsed) || parsed.length !== 1) fail("disposable_postgres_resource_inspect_invalid", `docker.${kind}.inspect`, { ambiguous: true });
    return exactObject(parsed[0], `docker.${kind}.inspect`);
  }

  function assertOwned(kind, object) {
    if (kind === "container") {
      if (object.Name !== `/${spec.names.container}` || typeof object.Id !== "string") fail("disposable_postgres_resource_identity_invalid", "docker.container.inspect", { ambiguous: true });
      assertOwnedLabels(object.Config?.Labels, spec, "docker.container.inspect");
    } else if (kind === "network") {
      if (object.Name !== spec.names.network || typeof object.Id !== "string") fail("disposable_postgres_resource_identity_invalid", "docker.network.inspect", { ambiguous: true });
      assertOwnedLabels(object.Labels, spec, "docker.network.inspect");
    } else {
      if (object.Name !== spec.names.volume) fail("disposable_postgres_resource_identity_invalid", "docker.volume.inspect", { ambiguous: true });
      assertOwnedLabels(object.Labels, spec, "docker.volume.inspect");
    }
  }

  async function requireAbsent(kind, name) {
    if (await listExact(kind, name)) fail("disposable_postgres_resource_collision", `docker.${kind}.preflight`);
  }

  async function createNetwork() {
    await call("network.create", ["network", "create", ...labelArgs(spec.labels), spec.names.network]);
    const object = await inspect("network", spec.names.network);
    assertOwned("network", object);
    return object.Id;
  }

  async function createVolume() {
    await call("volume.create", ["volume", "create", ...labelArgs(spec.labels), spec.names.volume]);
    const object = await inspect("volume", spec.names.volume);
    assertOwned("volume", object);
    return object.Name;
  }

  async function createContainer() {
    await call("container.create", buildContainerCreateArguments(spec, runtime.passwordPath));
    const object = await inspect("container", spec.names.container);
    assertOwned("container", object);
    return object.Id;
  }

  async function startContainer() {
    const object = await inspect("container", spec.names.container);
    assertOwned("container", object);
    await call("container.start", ["container", "start", spec.names.container]);
  }

  async function stopContainer() {
    if (!(await listExact("container", spec.names.container))) fail("disposable_postgres_container_missing", "docker.container.stop", { ambiguous: true });
    const object = await inspect("container", spec.names.container);
    assertOwned("container", object);
    if (object.State?.Running === true) await call("container.stop", ["container", "stop", "--time", "10", spec.names.container]);
  }

  async function publishedPort(expectedPort = null, phase = "docker.container.inspect") {
    const object = await inspect("container", spec.names.container);
    assertOwned("container", object);
    return validateRunningPublishedPort(object, spec.postgres.containerPort, expectedPort, phase);
  }

  async function cleanup() {
    const result = { container: false, network: false, volume: false };
    if (await listExact("container", spec.names.container)) {
      const object = await inspect("container", spec.names.container);
      assertOwned("container", object);
      if (object.State?.Running === true) await call("container.stop", ["container", "stop", "--time", "10", spec.names.container]);
      await call("container.rm", ["container", "rm", spec.names.container]);
    }
    result.container = !(await listExact("container", spec.names.container));
    if (await listExact("network", spec.names.network)) {
      const object = await inspect("network", spec.names.network);
      assertOwned("network", object);
      await call("network.rm", ["network", "rm", spec.names.network]);
    }
    result.network = !(await listExact("network", spec.names.network));
    if (await listExact("volume", spec.names.volume)) {
      const object = await inspect("volume", spec.names.volume);
      assertOwned("volume", object);
      await call("volume.rm", ["volume", "rm", spec.names.volume]);
    }
    result.volume = !(await listExact("volume", spec.names.volume));
    return Object.freeze(result);
  }

  return Object.freeze({
    callCounts,
    version,
    inspectImage,
    pullImage,
    requireAbsent,
    createNetwork,
    createVolume,
    createContainer,
    startContainer,
    stopContainer,
    publishedPort,
    cleanup,
  });
}

export async function waitForPostgresReadiness({
  createClient,
  phase,
  onAttempt = () => {},
  maxAttempts = MAX_READINESS_ATTEMPTS,
  delayMs = READINESS_DELAY_MS,
  deadlineMs = READINESS_DEADLINE_MS,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now = () => Date.now(),
}) {
  if (typeof createClient !== "function" || typeof phase !== "string" || !phase.startsWith("postgres.readiness.")
      || typeof onAttempt !== "function" || typeof sleep !== "function" || typeof now !== "function"
      || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_READINESS_ATTEMPTS
      || !Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > READINESS_DELAY_MS
      || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > READINESS_DEADLINE_MS) {
    fail("disposable_postgres_readiness_input_invalid", "postgres.readiness", { ambiguous: true });
  }
  const startedAt = now();
  if (!Number.isSafeInteger(startedAt) || startedAt < 0) {
    fail("disposable_postgres_readiness_clock_invalid", phase, { ambiguous: true });
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const observedAt = now();
    if (!Number.isSafeInteger(observedAt) || observedAt < startedAt) {
      fail("disposable_postgres_readiness_clock_invalid", phase, { ambiguous: true });
    }
    if (observedAt - startedAt >= deadlineMs) {
      fail("disposable_postgres_readiness_exhausted", phase, {
        diagnostic: readinessDiagnostic("CONNECT_RETRYABLE", attempt - 1 || 1),
      });
    }
    onAttempt(attempt);
    let client = null;
    let connected = false;
    let ready = false;
    let failure = null;
    let primaryError = null;
    try {
      try {
        client = createClient();
      } catch {
        fail("disposable_postgres_readiness_connect_failed", phase, {
          ambiguous: true,
          diagnostic: readinessDiagnostic("CONNECT_FAILED", attempt),
        });
      }
      if (client === null || typeof client !== "object" || typeof client.connect !== "function"
          || typeof client.query !== "function" || typeof client.end !== "function") {
        fail("disposable_postgres_readiness_connect_failed", phase, {
          ambiguous: true,
          diagnostic: readinessDiagnostic("CONNECT_FAILED", attempt),
        });
      }
      try {
        await client.connect();
        connected = true;
      } catch (error) {
        const outcome = classifyConnectFailure(error);
        if (outcome !== "CONNECT_RETRYABLE") {
          fail(outcome === "AUTH_OR_CONFIGURATION_FAILED"
            ? "disposable_postgres_readiness_auth_or_configuration_failed"
            : "disposable_postgres_readiness_connect_failed", phase, {
            ambiguous: outcome === "CONNECT_FAILED",
            diagnostic: readinessDiagnostic(outcome, attempt),
          });
        }
        failure = Object.freeze({ outcome, attempts: attempt });
      }
      if (connected) {
        let result;
        try {
          result = await client.query("SELECT 1::integer AS ready");
        } catch {
          fail("disposable_postgres_readiness_query_failed", phase, {
            ambiguous: true,
            diagnostic: readinessDiagnostic("QUERY_FAILED", attempt),
          });
        }
        if (result?.rows?.length !== 1 || result.rows[0]?.ready !== 1) {
          fail("disposable_postgres_readiness_result_invalid", phase, {
            ambiguous: true,
            diagnostic: readinessDiagnostic("RESULT_INVALID", attempt),
          });
        }
        ready = true;
      }
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      if (client !== null && typeof client === "object" && typeof client.end === "function") {
        try { await client.end(); }
        catch {
          if (primaryError === null) {
            fail("disposable_postgres_readiness_client_close_failed", phase, {
              ambiguous: true,
              diagnostic: readinessDiagnostic("CLIENT_CLOSE_FAILED", attempt),
            });
          }
        }
      }
    }
    if (ready) return Object.freeze({ readinessOutcome: "READY", attempts: attempt });
    if (failure === null || failure.outcome !== "CONNECT_RETRYABLE") {
      fail("disposable_postgres_readiness_connect_failed", phase, {
        ambiguous: true,
        diagnostic: readinessDiagnostic("CONNECT_FAILED", attempt),
      });
    }
    const afterAttempt = now();
    if (!Number.isSafeInteger(afterAttempt) || afterAttempt < observedAt) {
      fail("disposable_postgres_readiness_clock_invalid", phase, { ambiguous: true });
    }
    if (attempt === maxAttempts || afterAttempt - startedAt >= deadlineMs) {
      fail("disposable_postgres_readiness_exhausted", phase, {
        diagnostic: readinessDiagnostic("CONNECT_RETRYABLE", attempt),
      });
    }
    await sleep(Math.min(delayMs, deadlineMs - (afterAttempt - startedAt)));
  }
  fail("disposable_postgres_readiness_exhausted", phase, {
    diagnostic: readinessDiagnostic("CONNECT_RETRYABLE", maxAttempts),
  });
}

function createPhysicalPostgres(spec, runtime) {
  function config(port, readiness = false) {
    return Object.freeze({
      host: "127.0.0.1",
      port,
      user: spec.postgres.user,
      password: runtime.password,
      database: spec.postgres.database,
      application_name: `forme-r4-enabler-77-${spec.runId}`,
      ssl: false,
      connectionTimeoutMillis: 1_500,
      query_timeout: readiness ? 1_500 : 90_000,
      statement_timeout: readiness ? 1_500 : 90_000,
    });
  }

  async function withClient(port, phase, operation) {
    const client = new Client(config(port));
    let connected = false;
    try {
      await client.connect();
      connected = true;
      return await operation(client);
    } catch (error) {
      if (error instanceof RehearsalError) throw error;
      fail("disposable_postgres_sql_failed", phase, { ambiguous: true, diagnostic: projectPostgresDiagnostic(error, phase) });
    } finally {
      if (connected) {
        try { await client.end(); }
        catch { /* the disposable container/volume cleanup is the final closure */ }
      }
    }
  }

  async function waitReady(port, phase, onAttempt) {
    return waitForPostgresReadiness({
      createClient: () => new Client(config(port, true)),
      phase,
      onAttempt,
    });
  }

  async function serverVersion(port) {
    return withClient(port, "postgres.version", async (client) => {
      const result = await client.query("SHOW server_version_num");
      const value = Number(result.rows[0]?.server_version_num);
      if (!Number.isSafeInteger(value)) fail("disposable_postgres_version_result_invalid", "postgres.version", { ambiguous: true });
      return value;
    });
  }

  async function execute(port, sql, phase) {
    return withClient(port, phase, async (client) => {
      await client.query(sql);
      return true;
    });
  }

  async function diagnose(port, sql, phase) {
    const client = new Client(config(port));
    const assertionIds = [];
    let unexpectedNotice = false;
    let connected = false;
    const onNotice = (notice) => {
      const identifier = projectVerifyAssertionNotice(notice);
      if (identifier === null) unexpectedNotice = true;
      else assertionIds.push(identifier);
    };
    client.on("notice", onNotice);
    try {
      await client.connect();
      connected = true;
      const rawResult = await client.query(sql);
      if (unexpectedNotice) fail("disposable_postgres_verify_diagnostic_invalid", phase, { ambiguous: true });
      const results = Array.isArray(rawResult) ? rawResult : [rawResult];
      const markers = results.flatMap((result) => Array.isArray(result?.rows) ? result.rows : [])
        .filter((row) => row?.status === VERIFY_DIAGNOSTIC_STATUS);
      if (markers.length !== 1
          || canonicalJson(Object.keys(markers[0]).sort()) !== canonicalJson(["assertion_count", "status"])
          || markers[0].assertion_count !== VERIFY_ASSERTION_IDS.length) {
        fail("disposable_postgres_verify_diagnostic_invalid", phase, { ambiguous: true });
      }
      return normalizeVerifyAssertionVector(assertionIds);
    } catch (error) {
      if (error instanceof RehearsalError) throw error;
      fail("disposable_postgres_sql_failed", phase, { ambiguous: true });
    } finally {
      client.off("notice", onNotice);
      if (connected) {
        try { await client.end(); }
        catch { /* the disposable container/volume cleanup is the final closure */ }
      }
    }
  }

  async function installationSeed(port) {
    return withClient(port, "postgres.seed", async (client) => {
      const result = await client.query(
        "SELECT installation_id, third_place_id, entity_id, config_lineage_hash FROM forme_r4_public_core.installation",
      );
      if (result.rows.length !== 1) fail("disposable_postgres_seed_invalid", "postgres.seed", { ambiguous: true });
      return Object.freeze({ ...result.rows[0] });
    });
  }

  async function schemaAbsent(port) {
    return withClient(port, "postgres.rollback-proof", async (client) => {
      const result = await client.query("SELECT to_regnamespace('forme_r4_public_core') IS NULL AS absent");
      return result.rows.length === 1 && result.rows[0]?.absent === true;
    });
  }

  return Object.freeze({ waitReady, serverVersion, execute, diagnose, installationSeed, schemaAbsent });
}

function expectedSeed() {
  return Object.freeze({
    installation_id: "installation_forme_public_core_v1",
    third_place_id: "thirdplace_forme_public_core_v1",
    entity_id: "entity_forme_public_core_v1",
    config_lineage_hash: "sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31",
  });
}

export async function runRehearsal({
  spec, docker, postgres, sql, startedAt = new Date().toISOString(), allowImagePull = false,
}) {
  const state = {
    host: null,
    imagePulled: false,
    image: null,
    port: null,
    readiness: { initial: 0, restart: 0 },
    readinessOutcomes: { initial: "NOT_STARTED", restart: "NOT_STARTED" },
    schemaApplied: false,
    verifyCount: 0,
    restartCount: 0,
    rollbackApplied: false,
    rollbackProven: false,
    seedBeforeRestart: null,
    seedAfterRestart: null,
    resourceIds: { container: null, network: null, volume: null },
  };
  let primaryFailure = null;
  let cleanupFailure = null;
  let cleanup = Object.freeze({ container: false, network: false, volume: false });

  try {
    state.host = await docker.version();
    state.image = await docker.inspectImage();
    if (state.image === null) {
      if (!allowImagePull) fail("disposable_postgres_image_not_cached", "docker.image.inspect");
      await docker.pullImage();
      state.imagePulled = true;
      state.image = await docker.inspectImage();
      if (state.image === null) fail("disposable_postgres_image_missing_after_pull", "docker.image.inspect", { ambiguous: true });
    }
    if (state.image.platform !== IMAGE_PLATFORM) fail("disposable_postgres_image_platform_mismatch", "docker.image.inspect");

    await docker.requireAbsent("container", spec.names.container);
    await docker.requireAbsent("network", spec.names.network);
    await docker.requireAbsent("volume", spec.names.volume);
    state.resourceIds.network = await docker.createNetwork();
    state.resourceIds.volume = await docker.createVolume();
    state.resourceIds.container = await docker.createContainer();
    await docker.startContainer();
    state.port = await docker.publishedPort(null, "docker.container.initial");

    const initialReadiness = await postgres.waitReady(
      state.port,
      "postgres.readiness.initial",
      (attempt) => { state.readiness.initial = attempt; },
    );
    state.readiness.initial = initialReadiness.attempts;
    state.readinessOutcomes.initial = initialReadiness.readinessOutcome;
    const version = await postgres.serverVersion(state.port);
    if (version !== POSTGRES_SERVER_VERSION_NUM) fail("disposable_postgres_version_mismatch", "postgres.version");
    await postgres.execute(state.port, sql.schema, "postgres.schema");
    state.schemaApplied = true;
    await postgres.execute(state.port, sql.verify, "postgres.verify.initial");
    state.verifyCount += 1;
    state.seedBeforeRestart = await postgres.installationSeed(state.port);
    if (canonicalJson(state.seedBeforeRestart) !== canonicalJson(expectedSeed())) fail("disposable_postgres_seed_invalid", "postgres.seed");

    await docker.stopContainer();
    await docker.startContainer();
    state.restartCount = 1;
    await docker.publishedPort(state.port, "docker.container.restart");
    const restartReadiness = await postgres.waitReady(
      state.port,
      "postgres.readiness.restart",
      (attempt) => { state.readiness.restart = attempt; },
    );
    state.readiness.restart = restartReadiness.attempts;
    state.readinessOutcomes.restart = restartReadiness.readinessOutcome;
    await postgres.execute(state.port, sql.verify, "postgres.verify.restart");
    state.verifyCount += 1;
    state.seedAfterRestart = await postgres.installationSeed(state.port);
    if (canonicalJson(state.seedAfterRestart) !== canonicalJson(state.seedBeforeRestart)) fail("disposable_postgres_restart_persistence_failed", "postgres.seed");

    await postgres.execute(state.port, sql.rollback, "postgres.rollback");
    state.rollbackApplied = true;
    state.rollbackProven = await postgres.schemaAbsent(state.port);
    if (!state.rollbackProven) fail("disposable_postgres_rollback_proof_failed", "postgres.rollback-proof", { ambiguous: true });
  } catch (error) {
    primaryFailure = sanitizeError(error);
    if (primaryFailure.phase === "postgres.readiness.initial" && primaryFailure.diagnostic?.readinessOutcome !== undefined) {
      state.readinessOutcomes.initial = primaryFailure.diagnostic.readinessOutcome;
    }
    if (primaryFailure.phase === "postgres.readiness.restart" && primaryFailure.diagnostic?.readinessOutcome !== undefined) {
      state.readinessOutcomes.restart = primaryFailure.diagnostic.readinessOutcome;
    }
  } finally {
    try { cleanup = await docker.cleanup(); }
    catch (error) { cleanupFailure = sanitizeError(error); }
  }

  const cleanupGreen = cleanupFailure === null && cleanup.container && cleanup.network && cleanup.volume;
  const green = primaryFailure === null && cleanupGreen && state.schemaApplied && state.verifyCount === 2
    && state.restartCount === 1 && state.rollbackApplied && state.rollbackProven;
  return Object.freeze({
    schemaVersion: "r4.disposable-postgres-rehearsal-result.v2",
    status: green ? "GREEN" : cleanupGreen ? "FAILED_CLEAN" : "FAILED_CLEANUP_AMBIGUOUS",
    runId: spec.runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    outcome: Object.freeze({
      schemaApplied: state.schemaApplied,
      verifyCount: state.verifyCount,
      restartCount: state.restartCount,
      restartPersistenceProven: canonicalJson(state.seedBeforeRestart) === canonicalJson(state.seedAfterRestart) && state.seedBeforeRestart !== null,
      rollbackApplied: state.rollbackApplied,
      rollbackProven: state.rollbackProven,
    }),
    bindings: Object.freeze({
      imageReference: IMAGE_REFERENCE,
      imagePlatform: IMAGE_PLATFORM,
      postgresServerVersionNum: POSTGRES_SERVER_VERSION_NUM,
      sql: Object.freeze(Object.fromEntries(Object.entries(SQL_BINDINGS).map(([kind, binding]) => [kind, binding.sha256]))),
    }),
    observation: Object.freeze({
      host: state.host,
      imagePulled: state.imagePulled,
      image: state.image,
      publishedHost: state.port === null ? null : "127.0.0.1",
      publishedPort: state.port,
      readinessAttempts: Object.freeze({ ...state.readiness }),
      readinessOutcomes: Object.freeze({ ...state.readinessOutcomes }),
    }),
    resources: Object.freeze({
      names: spec.names,
      labels: spec.labels,
      ids: Object.freeze({ ...state.resourceIds }),
      finalAbsent: cleanup,
    }),
    effects: Object.freeze({
      syntheticDataOnly: true,
      historicalResourcesTouched: false,
      providerCalls: 0,
      realGuestRecords: 0,
      productionEffects: 0,
      publicTrafficEffects: 0,
      gateCEffects: 0,
      dockerCallCounts: Object.freeze({ ...docker.callCounts }),
    }),
    failure: primaryFailure,
    cleanupFailure,
  });
}

export async function runVerifyDiagnosticRehearsal({
  spec, docker, postgres, sql, startedAt = new Date().toISOString(), allowImagePull = false,
}) {
  const state = {
    host: null,
    imagePulled: false,
    image: null,
    port: null,
    readinessAttempts: 0,
    readinessOutcome: "NOT_STARTED",
    schemaApplied: false,
    assertionIds: null,
    resourceIds: { container: null, network: null, volume: null },
  };
  let primaryFailure = null;
  let cleanupFailure = null;
  let cleanup = Object.freeze({ container: false, network: false, volume: false });

  try {
    state.host = await docker.version();
    state.image = await docker.inspectImage();
    if (state.image === null) {
      if (!allowImagePull) fail("disposable_postgres_image_not_cached", "docker.image.inspect");
      await docker.pullImage();
      state.imagePulled = true;
      state.image = await docker.inspectImage();
      if (state.image === null) fail("disposable_postgres_image_missing_after_pull", "docker.image.inspect", { ambiguous: true });
    }
    if (state.image.platform !== IMAGE_PLATFORM) fail("disposable_postgres_image_platform_mismatch", "docker.image.inspect");
    await docker.requireAbsent("container", spec.names.container);
    await docker.requireAbsent("network", spec.names.network);
    await docker.requireAbsent("volume", spec.names.volume);
    state.resourceIds.network = await docker.createNetwork();
    state.resourceIds.volume = await docker.createVolume();
    state.resourceIds.container = await docker.createContainer();
    await docker.startContainer();
    state.port = await docker.publishedPort(null, "docker.container.diagnostic");
    const readiness = await postgres.waitReady(
      state.port,
      "postgres.readiness.diagnostic",
      (attempt) => { state.readinessAttempts = attempt; },
    );
    state.readinessAttempts = readiness.attempts;
    state.readinessOutcome = readiness.readinessOutcome;
    const version = await postgres.serverVersion(state.port);
    if (version !== POSTGRES_SERVER_VERSION_NUM) fail("disposable_postgres_version_mismatch", "postgres.version");
    await postgres.execute(state.port, sql.schema, "postgres.schema");
    state.schemaApplied = true;
    state.assertionIds = normalizeVerifyAssertionVector(
      await postgres.diagnose(state.port, sql.verifyDiagnostic, "postgres.verify-diagnostic"),
    );
  } catch (error) {
    primaryFailure = sanitizeError(error);
    if (primaryFailure.phase === "postgres.readiness.diagnostic" && primaryFailure.diagnostic?.readinessOutcome !== undefined) {
      state.readinessOutcome = primaryFailure.diagnostic.readinessOutcome;
    }
  } finally {
    try { cleanup = await docker.cleanup(); }
    catch (error) { cleanupFailure = sanitizeError(error); }
  }

  const cleanupGreen = cleanupFailure === null && cleanup.container && cleanup.network && cleanup.volume;
  const diagnosticComplete = primaryFailure === null && state.schemaApplied && state.assertionIds !== null;
  return Object.freeze({
    schemaVersion: "r4.disposable-postgres-verify-diagnostic-result.v1",
    status: diagnosticComplete && cleanupGreen ? "DIAGNOSTIC_COMPLETE_CLEAN"
      : cleanupGreen ? "FAILED_CLEAN" : "FAILED_CLEANUP_AMBIGUOUS",
    runId: spec.runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    outcome: Object.freeze({
      schemaApplied: state.schemaApplied,
      assertionCount: VERIFY_ASSERTION_IDS.length,
      evaluatedAssertionCount: state.assertionIds === null ? 0 : VERIFY_ASSERTION_IDS.length,
      failedAssertionIds: state.assertionIds,
    }),
    bindings: Object.freeze({
      imageReference: IMAGE_REFERENCE,
      imagePlatform: IMAGE_PLATFORM,
      postgresServerVersionNum: POSTGRES_SERVER_VERSION_NUM,
      schemaSha256: SQL_BINDINGS.schema.sha256,
      verifySourceSha256: SQL_BINDINGS.verify.sha256,
      verifyDiagnosticSha256: sql.verifyDiagnosticSha256,
    }),
    observation: Object.freeze({
      host: state.host,
      imagePulled: state.imagePulled,
      image: state.image,
      publishedHost: state.port === null ? null : "127.0.0.1",
      publishedPort: state.port,
      readinessAttempts: state.readinessAttempts,
      readinessOutcome: state.readinessOutcome,
    }),
    resources: Object.freeze({
      names: spec.names,
      labels: spec.labels,
      ids: Object.freeze({ ...state.resourceIds }),
      finalAbsent: cleanup,
    }),
    effects: Object.freeze({
      syntheticDataOnly: true,
      historicalResourcesTouched: false,
      imagePulls: state.imagePulled ? 1 : 0,
      providerCalls: 0,
      realGuestRecords: 0,
      productionEffects: 0,
      publicTrafficEffects: 0,
      gateCEffects: 0,
      dockerCallCounts: Object.freeze({ ...docker.callCounts }),
    }),
    failure: primaryFailure,
    cleanupFailure,
  });
}

async function main() {
  const runId = randomBytes(8).toString("hex");
  let runtime = null;
  let result = null;
  try {
    const cli = parseCliArguments(process.argv.slice(2));
    verifyDockerCli();
    const socketPath = resolveDockerSocket();
    runtime = createPrivateRuntimeRoot(runId);
    const spec = createRunSpec(runId, runtime.runtimeRoot);
    const sql = readPinnedSql();
    const docker = createPhysicalDocker(spec, runtime, socketPath);
    const postgres = createPhysicalPostgres(spec, runtime);
    result = cli.mode === "diagnose"
      ? await runVerifyDiagnosticRehearsal({ spec, docker, postgres, sql, allowImagePull: cli.allowImagePull })
      : await runRehearsal({ spec, docker, postgres, sql, allowImagePull: cli.allowImagePull });
  } catch (error) {
    result = Object.freeze({
      schemaVersion: "r4.disposable-postgres-rehearsal-result.v2",
      status: "FAILED_CLEAN",
      runId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      failure: sanitizeError(error),
      effects: Object.freeze({
        syntheticDataOnly: true,
        historicalResourcesTouched: false,
        providerCalls: 0,
        realGuestRecords: 0,
        productionEffects: 0,
        publicTrafficEffects: 0,
        gateCEffects: 0,
      }),
    });
  } finally {
    let localCleanupGreen = false;
    try { localCleanupGreen = removePrivateRuntimeRoot(runtime); }
    catch { localCleanupGreen = false; }
    result = Object.freeze({ ...result, localRuntimeResidueAbsent: localCleanupGreen });
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = ["GREEN", "DIAGNOSTIC_COMPLETE_CLEAN"].includes(result.status) && result.localRuntimeResidueAbsent ? 0 : 1;
}

const invokedPath = process.argv[1] === undefined ? null : path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) await main();
