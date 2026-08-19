import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  canonicalJson,
  canonicalSha256,
  validateProjectionCapsuleV1,
} from "../packages/r4-protocol/src/index.ts";
import { loadPublicCoreLocalRuntimeV1 } from "../apps/room/src/public-core-local-runtime.ts";
import { PublicCoreApplicationError } from "../apps/room/src/public-core-application.ts";
import { dispatchLocalPublicCoreApiV1 } from "../apps/room/src/http.ts";
import {
  createPublicCoreIdentityPortV1,
  derivePublicCoreLocalActorScopeDigestV1,
} from "../apps/room/src/public-core-room-runtime.ts";
import { operationDefinition } from "../apps/room/src/operation-inventory.ts";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

export const LOCAL_RUNTIME_REHEARSAL_IMAGE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
export const LOCAL_RUNTIME_REHEARSAL_PLATFORM = "linux/arm64";
export const LOCAL_RUNTIME_REHEARSAL_SERVER_VERSION = 160010;
const DOCKER = "/Applications/Docker.app/Contents/Resources/bin/docker";
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCHEMA_PATH = join(ROOT, "schemas/r4/public-core/schema.sql");
const VERIFY_PATH = join(ROOT, "schemas/r4/public-core/verify.sql");
const MAX_OUTPUT = 1024 * 1024;
const OWNER_LABEL = "forme.r4.owner=local-public-core-runtime-rehearsal";

class RehearsalFailure extends Error {
  constructor(code, phase) {
    super(code);
    this.name = "RehearsalFailure";
    this.code = code;
    this.phase = phase;
  }
}

function fail(code, phase) {
  throw new RehearsalFailure(code, phase);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function capability(bytes = randomBytes(32)) {
  return Buffer.from(bytes).toString("base64url");
}

function safeFailure(error) {
  return Object.freeze({
    code: error instanceof RehearsalFailure ? error.code : "local_runtime_rehearsal_failed",
    phase: error instanceof RehearsalFailure ? error.phase : "unknown",
  });
}

async function createDockerContext(campaignRoot) {
  const executable = await lstat(DOCKER);
  if (!executable.isFile() || executable.isSymbolicLink() || (executable.mode & 0o111) === 0 || await realpath(DOCKER) !== DOCKER) {
    fail("local_runtime_docker_cli_invalid", "docker.preflight");
  }
  const home = await realpath(homedir());
  const socketPath = join(home, ".docker", "run", "docker.sock");
  const socket = await lstat(socketPath);
  if (!socket.isSocket() || socket.isSymbolicLink() || socket.uid !== process.getuid?.() || await realpath(socketPath) !== socketPath) {
    fail("local_runtime_docker_socket_invalid", "docker.preflight");
  }
  const dockerConfig = join(campaignRoot, "docker-config");
  await mkdir(dockerConfig, { mode: 0o700 });
  await chmod(dockerConfig, 0o700);
  await writeFile(join(dockerConfig, "config.json"), "{\"auths\":{}}\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  return Object.freeze({
    socketPath,
    env: Object.freeze({
      HOME: campaignRoot,
      DOCKER_CONFIG: dockerConfig,
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
    }),
  });
}

async function command(docker, args, phase, allowNonzero = false, timeoutMs = 60_000) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(DOCKER, ["--host", `unix://${docker.socketPath}`, ...args], {
      cwd: "/",
      env: docker.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    const capture = (target) => (chunk) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_OUTPUT) child.kill("SIGKILL");
      else target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.once("error", () => {
      clearTimeout(timer);
      rejectPromise(new RehearsalFailure("local_runtime_docker_spawn_failed", phase));
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      const out = Buffer.concat(stdout).toString("utf8").trim();
      const err = Buffer.concat(stderr).toString("utf8").trim();
      if (bytes > MAX_OUTPUT || timedOut || signal !== null) rejectPromise(new RehearsalFailure("local_runtime_docker_call_ambiguous", phase));
      else if (code !== 0 && !allowNonzero) rejectPromise(new RehearsalFailure("local_runtime_docker_call_failed", phase));
      else resolvePromise(Object.freeze({ code, stdout: out, stderr: err }));
    });
  });
}

async function exactAbsent(docker, kind, name) {
  const result = await command(docker, [kind, "inspect", name], `docker.${kind}.absence`, true);
  if (result.code === 0) fail("local_runtime_owned_name_collision", `docker.${kind}.absence`);
}

export function createLocalRuntimeRehearsalProjectionV1(roomId, entityId, now) {
  const publishedAt = now.toISOString();
  const freshUntil = new Date(now.getTime() + 48 * 60 * 60 * 1_000).toISOString();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000).toISOString();
  const projectionId = `proj_${createHash("sha256").update(`runtime-rehearsal:${publishedAt}`).digest("hex").slice(0, 32)}`;
  const preimage = {
    schemaVersion: "projection_capsule.v1",
    projectionId,
    roomId,
    entityId,
    title: "Forme runtime wiring rehearsal",
    thirdPlaceSummary: "Synthetic loopback-only content proves the durable #67 product path without publishing Owner meaning.",
    claims: [
      { slot: "becoming", text: "The durable Public Core is connected to the actual Room runtime.", attribution: "inferred_allowed", uncertainty: "This is synthetic technical evidence, not publication authority." },
      { slot: "now", text: "A loopback rehearsal is validating PostgreSQL-backed Room behavior.", attribution: "inferred_allowed", uncertainty: "This is a synthetic rehearsal observation, not a Production or Owner-experience claim." },
      { slot: "nextMove", text: "Review publication-stable Owner wording before the real bounded encounter.", attribution: "inferred_allowed", uncertainty: "The next move remains subject to Owner review after technical activation is Green." },
      { slot: "tensions", text: "Useful Presence must remain separate from private Twin truth and Owner authorship.", attribution: "unresolved_allowed", uncertainty: null },
      { slot: "openTo", text: "One reviewed real Guest encounter after the technical path closes.", attribution: "inferred_allowed", uncertainty: "No real Guest encounter or publication authority is implied by this synthetic run." },
    ],
    supportedInteractions: ["ask"],
    allowedTopics: ["Forme product direction"],
    unavailableTopics: ["private Twin evidence", "credentials", "source bodies"],
    expectedResponseLatency: "No response is promised in #67.",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "This rehearsal carries one synthetic request to the local Owner lane and invokes no model.",
    nonCommitmentStatement: "This synthetic Projection cannot speak for or commit the Owner.",
    disclosureBasisId: `basis_${projectionId.slice(5)}`,
    publicationAttestationId: `att_${projectionId.slice(5)}`,
    publishedAt,
    freshUntil,
    expiresAt,
  };
  return validateProjectionCapsuleV1({ ...preimage, payloadHash: canonicalSha256(preimage) });
}

async function privateFile(root, name, value) {
  await writeFile(join(root, name), value, { mode: 0o600 });
  await chmod(join(root, name), 0o600);
  return Buffer.from(value, "utf8");
}

async function writeRuntimeRoot(input) {
  await rm(input.runtimeRoot, { recursive: true, force: true });
  await mkdir(input.runtimeRoot, { recursive: true, mode: 0o700 });
  await chmod(input.runtimeRoot, 0o700);
  const database = await privateFile(input.runtimeRoot, "database-url", input.databaseUrl);
  const body = await privateFile(input.runtimeRoot, "body-encryption-key", input.bodyKey);
  const pepper = await privateFile(input.runtimeRoot, "capability-pepper-key", input.pepperKey);
  const identity = await privateFile(input.runtimeRoot, "identity-key", input.identityKey);
  const controller = await privateFile(input.runtimeRoot, "controller-secret", input.controllerSecret);
  const curator = await privateFile(input.runtimeRoot, "curator-secret", input.curatorSecret);
  const operator = await privateFile(input.runtimeRoot, "room-operator-secret", input.roomOperatorSecret);
  const authorityValue = canonicalJson(input.publicationAuthority);
  const authority = await privateFile(input.runtimeRoot, "publication-authority.json", authorityValue);
  await privateFile(input.runtimeRoot, "runtime.json", canonicalJson({
    schemaVersion: "r4_public_core_local_runtime_config.v1",
    roomId: input.roomId,
    databaseUrlRef: `ref:postgres-url/local-activation@${sha256(database)}`,
    bodyEncryptionKeyRef: `ref:body-encryption/local-activation@${sha256(body)}`,
    capabilityPepperRef: `ref:capability-pepper/local-activation@${sha256(pepper)}`,
    identityKeySha256: sha256(identity),
    controllerSecretSha256: sha256(controller),
    curatorSecretSha256: sha256(curator),
    roomOperatorSecretSha256: sha256(operator),
    publicationAuthoritySha256: sha256(authority),
    publicRateBucket: input.publicRateBucket,
  }));
}

async function operation(runtime, action, options = {}) {
  const definition = operationDefinition(action);
  try {
    return await runtime.runCore({
      definition,
      params: options.params ?? {},
      body: options.body ?? {},
      authorization: options.secret ? `Bearer ${options.secret}` : null,
      syntheticActor: null,
      syntheticClientBucket: null,
      idempotencyKey: definition.mutating ? options.idempotencyKey : null,
      expectedVersion: options.expectedVersion ?? null,
    });
  } catch (error) {
    if (error instanceof PublicCoreApplicationError && /^[a-z0-9_]{1,80}$/u.test(error.code)) {
      fail(`local_runtime_operation_${error.code}`, `product.${action}`);
    }
    fail("local_runtime_operation_failed", `product.${action}`);
  }
}

function apiPath(definition, params) {
  return definition.path.split("/").map((part) => {
    if (!part.startsWith(":")) return part;
    const value = params?.[part.slice(1)];
    if (typeof value !== "string") fail("local_runtime_http_path_invalid", `product.http.${definition.name}`);
    return encodeURIComponent(value);
  }).join("/");
}

async function apiOperation(runtime, action, options = {}) {
  const definition = operationDefinition(action);
  const path = apiPath(definition, options.params ?? {});
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.secret) headers.set("Authorization", `Bearer ${options.secret}`);
  if (definition.mutating) {
    if (typeof options.idempotencyKey !== "string") {
      fail("local_runtime_http_idempotency_invalid", `product.http.${action}`);
    }
    headers.set("Idempotency-Key", options.idempotencyKey);
  }
  if (definition.expectedVersion && !Number.isSafeInteger(options.expectedVersion)) {
    fail("local_runtime_http_version_invalid", `product.http.${action}`);
  }
  if (options.expectedVersion !== undefined) headers.set("If-Match", String(options.expectedVersion));
  const response = await dispatchLocalPublicCoreApiV1(new Request(`http://127.0.0.1/api/v1${path}`, {
    method: definition.method,
    headers,
    body: definition.method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
  }), path.slice(1).split("/"), runtime);
  let body;
  try {
    body = await response.json();
  } catch {
    fail("local_runtime_http_response_invalid", `product.http.${action}`);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    fail("local_runtime_http_response_invalid", `product.http.${action}`);
  }
  if (!response.ok) {
    const code = body.error && typeof body.error === "object" && typeof body.error.code === "string"
      && /^[a-z0-9_]{1,80}$/u.test(body.error.code)
      ? body.error.code
      : "request_failed";
    fail(`local_runtime_http_${code}`, `product.http.${action}`);
  }
  return Object.freeze({ status: response.status, body });
}

function deriveBindingSecret(input) {
  const actorScopeDigest = derivePublicCoreLocalActorScopeDigestV1(input.identityKeyBytes, "public", null);
  const canonicalRequestHash = canonicalSha256({
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room.pair.exchange",
    actorClass: "public",
    actorScopeDigest,
    params: { pairingId: input.pairingId },
    body: { pairingCode: input.pairingCode, clientPublicKey: input.clientPublicKey },
    trustedTransport: null,
    expectedVersion: 1,
  });
  const identity = createPublicCoreIdentityPortV1(input.identityKeyBytes);
  try {
    return identity.deriveSecret({
      purpose: "room_binding",
      action: "room.pair.exchange",
      actorScopeDigest,
      idempotencyKey: input.idempotencyKey,
      canonicalRequestHash,
      kind: "binding_secret",
    });
  } finally {
    identity.close();
  }
}

async function postgresReady(config) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const client = new Client({ ...config, connectionTimeoutMillis: 1_000, query_timeout: 1_000 });
    try {
      await client.connect();
      const result = await client.query("SELECT 1 AS ready");
      if (result.rows[0]?.ready === 1) return attempt;
    } catch {
      if (attempt === 60) fail("local_runtime_postgres_not_ready", "postgres.readiness");
    } finally {
      try { await client.end(); } catch { /* cleanup owns terminal closure */ }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  fail("local_runtime_postgres_not_ready", "postgres.readiness");
}

async function sql(config, text, phase) {
  const client = new Client({ ...config, connectionTimeoutMillis: 2_000, query_timeout: 90_000 });
  try {
    await client.connect();
    return await client.query(text);
  } catch {
    fail("local_runtime_postgres_sql_failed", phase);
  } finally {
    try { await client.end(); } catch { /* cleanup owns terminal closure */ }
  }
}

function allowImagePull(options) {
  if (options === undefined) return false;
  if (
    options === null
    || typeof options !== "object"
    || Array.isArray(options)
    || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).length !== 1
    || Object.keys(options)[0] !== "allowImagePull"
    || typeof options.allowImagePull !== "boolean"
  ) fail("local_runtime_rehearsal_options_invalid", "input");
  return options.allowImagePull;
}

export async function runLocalPublicCoreRuntimeRehearsal(options) {
  const pullAllowed = allowImagePull(options);
  const runId = randomBytes(8).toString("hex");
  const names = Object.freeze({
    container: `forme-r4-runtime-${runId}`,
    network: `forme-r4-runtime-net-${runId}`,
    volume: `forme-r4-runtime-vol-${runId}`,
  });
  const campaignRoot = await realpath(await mkdir(join(tmpdir(), `forme-r4-runtime-${runId}`), { recursive: true, mode: 0o700 }).then(() => join(tmpdir(), `forme-r4-runtime-${runId}`)));
  const runtimeRoot = join(campaignRoot, "runtime");
  const passwordPath = join(campaignRoot, "postgres-password");
  const state = { container: false, network: false, volume: false, runtimeLoads: 0 };
  const result = {
    schemaVersion: "r4.local-public-core-runtime-rehearsal-result.v1",
    runId,
    status: "FAILED_CLEANUP_UNKNOWN",
    bindings: {
      image: LOCAL_RUNTIME_REHEARSAL_IMAGE,
      platform: LOCAL_RUNTIME_REHEARSAL_PLATFORM,
      schemaSha256: sha256(await readFile(SCHEMA_PATH)),
      verifySha256: sha256(await readFile(VERIFY_PATH)),
    },
    outcome: {
      schemaApplied: false,
      verifyPassed: false,
      roomCreated: false,
      bindingCreated: false,
      projectionDelivered: false,
      curatorAdmitted: false,
      publicModeOpened: false,
      projectionRead: false,
      encounterHours: 0,
      interactionCreated: false,
      runtimeReloaded: false,
      durableSyncAndPull: false,
      interactionDeleted: false,
    },
    effects: {
      loopbackOnly: true,
      syntheticDataOnly: true,
      realGuestRecords: 0,
      providerCalls: 0,
      externalMessages: 0,
      imagePullAttempts: 0,
      imagePulls: 0,
      productionEffects: 0,
      publicTrafficEffects: 0,
      gateCEffects: 0,
    },
    cleanup: { containerAbsent: false, networkAbsent: false, volumeAbsent: false, privateRootAbsent: false },
    failure: null,
  };
  let loaded = null;
  let docker = null;
  try {
    await chmod(campaignRoot, 0o700);
    docker = await createDockerContext(campaignRoot);
    const password = capability();
    await writeFile(passwordPath, password, { mode: 0o600 });
    await chmod(passwordPath, 0o600);
    await command(docker, ["version", "--format", "{{json .Server}}"], "docker.version");
    const cachedImage = await command(docker, ["image", "inspect", LOCAL_RUNTIME_REHEARSAL_IMAGE, "--format", "{{json .}}"], "docker.image.inspect", true);
    if (cachedImage.code !== 0) {
      if (!pullAllowed) fail("local_runtime_exact_image_not_cached", "docker.image.inspect");
      result.effects.imagePullAttempts = 1;
      await command(docker, ["image", "pull", "--platform", LOCAL_RUNTIME_REHEARSAL_PLATFORM, LOCAL_RUNTIME_REHEARSAL_IMAGE], "docker.image.pull", false, 180_000);
      result.effects.imagePulls = 1;
      await command(docker, ["image", "inspect", LOCAL_RUNTIME_REHEARSAL_IMAGE, "--format", "{{json .}}"], "docker.image.inspect.after_pull");
    }
    await exactAbsent(docker, "container", names.container);
    await exactAbsent(docker, "network", names.network);
    await exactAbsent(docker, "volume", names.volume);
    await command(docker, ["network", "create", "--label", OWNER_LABEL, names.network], "docker.network.create");
    state.network = true;
    await command(docker, ["volume", "create", "--label", OWNER_LABEL, names.volume], "docker.volume.create");
    state.volume = true;
    await command(docker, [
      "container", "create", "--name", names.container, "--platform", LOCAL_RUNTIME_REHEARSAL_PLATFORM,
      "--label", OWNER_LABEL, "--network", names.network,
      "--mount", `type=volume,src=${names.volume},dst=/var/lib/postgresql/data`,
      "--mount", `type=bind,src=${passwordPath},dst=/run/secrets/postgres-password,readonly`,
      "--publish", "127.0.0.1::5432",
      "--env", "POSTGRES_DB=forme_activation", "--env", "POSTGRES_USER=forme",
      "--env", "POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password",
      LOCAL_RUNTIME_REHEARSAL_IMAGE,
    ], "docker.container.create");
    state.container = true;
    await command(docker, ["container", "start", names.container], "docker.container.start");
    const portResult = await command(docker, ["container", "port", names.container, "5432/tcp"], "docker.container.port");
    const portMatch = /^127\.0\.0\.1:([1-9][0-9]{0,4})$/u.exec(portResult.stdout);
    if (!portMatch) fail("local_runtime_loopback_port_invalid", "docker.container.port");
    const port = Number(portMatch[1]);
    const pg = { host: "127.0.0.1", port, user: "forme", password, database: "forme_activation", ssl: false };
    const readinessAttempts = await postgresReady(pg);
    const version = await sql(pg, "SHOW server_version_num", "postgres.version");
    if (Number(version.rows[0]?.server_version_num) !== LOCAL_RUNTIME_REHEARSAL_SERVER_VERSION) fail("local_runtime_postgres_version_mismatch", "postgres.version");
    await sql(pg, await readFile(SCHEMA_PATH, "utf8"), "postgres.schema");
    result.outcome.schemaApplied = true;
    await sql(pg, await readFile(VERIFY_PATH, "utf8"), "postgres.verify");
    result.outcome.verifyPassed = true;

    const now = new Date();
    const roomId = `room_${createHash("sha256").update(`room:${runId}`).digest("hex").slice(0, 32)}`;
    const entityId = "entity_forme_public_core_v1";
    const projectionValue = createLocalRuntimeRehearsalProjectionV1(roomId, entityId, now);
    const approvalHash = canonicalSha256({ runId, kind: "synthetic-runtime-rehearsal-approval" });
    const attestationHash = canonicalSha256({ runId, kind: "synthetic-runtime-rehearsal-attestation" });
    const publicationAuthority = Object.freeze({
      schemaVersion: "r4_public_core_local_publication_authority.v1",
      projectionPayloadHash: projectionValue.payloadHash,
      publicationApprovalHash: approvalHash,
      publicationAttestationHash: attestationHash,
      basisHash: canonicalSha256({ runId, kind: "synthetic-basis" }),
      projectionPolicyHash: canonicalSha256({ runId, kind: "synthetic-policy" }),
      publicationApprovalId: `approval_${createHash("sha256").update(`approval:${runId}`).digest("hex").slice(0, 32)}`,
    });
    const bodyKey = capability();
    const pepperKey = capability();
    const identityKey = capability();
    const identityKeyBytes = Buffer.from(identityKey, "base64url");
    const controllerSecret = capability();
    const curatorSecret = capability();
    const placeholderOperatorSecret = capability();
    const publicRateBucket = `bucket_${createHash("sha256").update(`bucket:${runId}`).digest("hex").slice(0, 32)}`;
    const runtimeInput = {
      runtimeRoot,
      databaseUrl: `postgresql://forme:${encodeURIComponent(password)}@127.0.0.1:${port}/forme_activation`,
      bodyKey,
      pepperKey,
      identityKey,
      controllerSecret,
      curatorSecret,
      roomOperatorSecret: placeholderOperatorSecret,
      publicationAuthority,
      publicRateBucket,
      roomId,
    };
    await writeRuntimeRoot(runtimeInput);
    loaded = await loadPublicCoreLocalRuntimeV1(runtimeRoot);
    state.runtimeLoads += 1;
    const controllerKey = `controller_${runId.padEnd(32, "0")}`;
    const created = await operation(loaded.runtime, "room.create", {
      secret: controllerSecret,
      body: { entityId, roomKind: "third_place_public", label: "Forme synthetic runtime rehearsal" },
      idempotencyKey: controllerKey,
    });
    if (created.status !== 201 || created.body.roomId !== roomId) fail("local_runtime_room_create_invalid", "product.room.create");
    result.outcome.roomCreated = true;
    const pairKey = `pair_${runId.padEnd(32, "0")}`;
    const paired = await operation(loaded.runtime, "room.pair", {
      secret: controllerSecret,
      params: { roomId },
      idempotencyKey: pairKey,
      expectedVersion: 1,
    });
    const pairingId = paired.body.pairingId;
    const pairingCode = paired.body.pairingCode;
    if (typeof pairingId !== "string" || typeof pairingCode !== "string") fail("local_runtime_pairing_invalid", "product.room.pair");
    const exchangeKey = `exchange_${runId.padEnd(32, "0")}`;
    const clientPublicKey = `local-loopback-client-${runId}`;
    const exchanged = await apiOperation(loaded.runtime, "room.pair.exchange", {
      params: { pairingId },
      body: { pairingCode, clientPublicKey },
      idempotencyKey: exchangeKey,
      expectedVersion: 1,
    });
    if (exchanged.status !== 201 || typeof exchanged.body.bindingId !== "string") fail("local_runtime_pairing_exchange_invalid", "product.room.pair.exchange");
    result.outcome.bindingCreated = true;
    const roomOperatorSecret = deriveBindingSecret({ identityKeyBytes, pairingId, pairingCode, clientPublicKey, idempotencyKey: exchangeKey });
    await loaded.close();
    loaded = null;
    await writeRuntimeRoot({ ...runtimeInput, roomOperatorSecret });
    loaded = await loadPublicCoreLocalRuntimeV1(runtimeRoot);
    state.runtimeLoads += 1;

    const delivered = await operation(loaded.runtime, "room_operator.projection.deliver", {
      secret: roomOperatorSecret,
      body: { projection: projectionValue, publicationApprovalHash: approvalHash, publicationAttestationHash: attestationHash },
      idempotencyKey: `deliver_${runId.padEnd(32, "0")}`,
      expectedVersion: 1,
    });
    if (delivered.status !== 201) fail("local_runtime_projection_delivery_invalid", "product.projection.deliver");
    result.outcome.projectionDelivered = true;
    const admitted = await operation(loaded.runtime, "curation.admit", {
      secret: curatorSecret,
      params: { projectionId: projectionValue.projectionId },
      idempotencyKey: `admit_${runId.padEnd(32, "0")}`,
      expectedVersion: 1,
    });
    if (admitted.status !== 200) fail("local_runtime_curation_invalid", "product.curation.admit");
    result.outcome.curatorAdmitted = true;
    const opened = await operation(loaded.runtime, "room.mode.set", {
      secret: controllerSecret,
      params: { roomId },
      body: { interactionMode: "public_single" },
      idempotencyKey: `open_${runId.padEnd(32, "0")}`,
      expectedVersion: 2,
    });
    if (opened.status !== 200) fail("local_runtime_mode_open_invalid", "product.room.mode.open");
    result.outcome.publicModeOpened = true;
    const listed = await apiOperation(loaded.runtime, "third_place.list");
    if (!Array.isArray(listed.body.residents) || listed.body.residents.length !== 1) fail("local_runtime_discovery_invalid", "product.third_place.list");
    const read = await apiOperation(loaded.runtime, "projection.read", {
      params: { projectionId: projectionValue.projectionId },
    });
    const readProjection = read.body.projection ?? read.body.view?.projection;
    if (read.status !== 200 || readProjection?.projectionId !== projectionValue.projectionId) {
      fail("local_runtime_projection_read_invalid", "product.projection.read");
    }
    result.outcome.projectionRead = true;
    const encounterSecret = capability();
    const encounter = await apiOperation(loaded.runtime, "public_encounter.issue", {
      params: { projectionId: projectionValue.projectionId },
      body: { encounterSecret },
      idempotencyKey: `encounter_${runId.padEnd(32, "0")}`,
      expectedVersion: 2,
    });
    result.outcome.encounterHours = (Date.parse(encounter.body.expiresAt) - now.getTime()) / (60 * 60 * 1_000);
    if (result.outcome.encounterHours <= 23.9 || result.outcome.encounterHours > 24.1) fail("local_runtime_encounter_window_invalid", "product.public_encounter.issue");
    const replySecret = capability();
    const deleteSecret = capability();
    const interaction = await apiOperation(loaded.runtime, "interaction.create", {
      secret: encounterSecret,
      body: {
        projectionId: projectionValue.projectionId,
        interactionType: "ask",
        consent: "manual_owner_only",
        requestBody: "SYNTHETIC_LOOPBACK_RUNTIME_REHEARSAL_PRIVATE_REQUEST",
        guestCapsule: null,
        replySecret,
        deleteSecret,
      },
      idempotencyKey: `interaction_${runId.padEnd(32, "0")}`,
    });
    const interactionId = interaction.body.targetId;
    if (interaction.status !== 201 || typeof interactionId !== "string") fail("local_runtime_interaction_invalid", "product.interaction.create");
    result.outcome.interactionCreated = true;
    await loaded.close();
    loaded = await loadPublicCoreLocalRuntimeV1(runtimeRoot);
    state.runtimeLoads += 1;
    result.outcome.runtimeReloaded = true;
    const synced = await operation(loaded.runtime, "room_operator.sync", {
      secret: roomOperatorSecret,
      body: { roomId, afterSequence: 0 },
      idempotencyKey: `sync_${runId.padEnd(32, "0")}`,
    });
    const events = synced.body.events;
    const event = Array.isArray(events) ? events.find((value) => value?.targetId === interactionId) : null;
    if (!event) fail("local_runtime_sync_missing_interaction", "product.room_operator.sync");
    const pulled = await operation(loaded.runtime, "room_operator.pull", {
      secret: roomOperatorSecret,
      params: { interactionId },
      idempotencyKey: `pull_${runId.padEnd(32, "0")}`,
      expectedVersion: 1,
    });
    if (pulled.body.requestBody !== "SYNTHETIC_LOOPBACK_RUNTIME_REHEARSAL_PRIVATE_REQUEST") fail("local_runtime_pull_invalid", "product.room_operator.pull");
    result.outcome.durableSyncAndPull = true;
    const closed = await operation(loaded.runtime, "room.mode.set", {
      secret: controllerSecret,
      params: { roomId },
      body: { interactionMode: "closed" },
      idempotencyKey: `close_${runId.padEnd(32, "0")}`,
      expectedVersion: 3,
    });
    if (closed.status !== 200) fail("local_runtime_mode_close_invalid", "product.room.mode.close");
    const deleted = await apiOperation(loaded.runtime, "interaction.delete", {
      secret: deleteSecret,
      params: { interactionId },
      idempotencyKey: `delete_${runId.padEnd(32, "0")}`,
      expectedVersion: 2,
    });
    if (deleted.status !== 200 || deleted.body.bodyAvailable !== false) fail("local_runtime_interaction_delete_invalid", "product.interaction.delete");
    result.outcome.interactionDeleted = true;
    result.readinessAttempts = readinessAttempts;
  } catch (error) {
    result.failure = safeFailure(error);
  } finally {
    if (loaded) {
      try { await loaded.close(); } catch { result.failure ??= { code: "local_runtime_close_failed", phase: "runtime.close" }; }
    }
    if (docker !== null && state.container) {
      await command(docker, ["container", "stop", "--time", "10", names.container], "cleanup.container.stop", true);
      await command(docker, ["container", "rm", "--force", names.container], "cleanup.container.rm", true);
    }
    if (docker !== null && state.network) await command(docker, ["network", "rm", names.network], "cleanup.network.rm", true);
    if (docker !== null && state.volume) await command(docker, ["volume", "rm", "--force", names.volume], "cleanup.volume.rm", true);
    if (docker !== null) {
      result.cleanup.containerAbsent = (await command(docker, ["container", "inspect", names.container], "cleanup.container.absent", true)).code !== 0;
      result.cleanup.networkAbsent = (await command(docker, ["network", "inspect", names.network], "cleanup.network.absent", true)).code !== 0;
      result.cleanup.volumeAbsent = (await command(docker, ["volume", "inspect", names.volume], "cleanup.volume.absent", true)).code !== 0;
    } else {
      result.cleanup.containerAbsent = state.container === false;
      result.cleanup.networkAbsent = state.network === false;
      result.cleanup.volumeAbsent = state.volume === false;
    }
    await rm(campaignRoot, { recursive: true, force: true });
    try { await realpath(campaignRoot); } catch { result.cleanup.privateRootAbsent = true; }
  }
  const green = result.failure === null
    && Object.values(result.outcome).every((value) => value === true || (typeof value === "number" && value > 0))
    && Object.values(result.cleanup).every(Boolean);
  result.status = green ? "GREEN_CLEAN" : Object.values(result.cleanup).every(Boolean) ? "FAILED_CLEAN" : "FAILED_CLEANUP_UNKNOWN";
  result.runtimeLoads = state.runtimeLoads;
  return Object.freeze(result);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pullAllowed = process.argv.length === 4 && process.argv[3] === "--allow-image-pull";
  if ((process.argv.length !== 3 && !pullAllowed) || process.argv[2] !== "execute") {
    process.stderr.write("usage: node scripts/r4-local-public-core-runtime-rehearsal.mjs execute [--allow-image-pull]\n");
    process.exitCode = 2;
  } else {
    const result = await runLocalPublicCoreRuntimeRehearsal({ allowImagePull: pullAllowed });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status !== "GREEN_CLEAN") process.exitCode = 1;
  }
}
