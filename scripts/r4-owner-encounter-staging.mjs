import { createHash, randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  canonicalSha256,
} from "../packages/r4-protocol/src/index.ts";
import { loadPublicCoreLocalRuntimeV1 } from "../apps/room/src/public-core-local-runtime.ts";
import {
  createLocalRuntimeRehearsalProjectionV1,
  localPublicCoreRuntimeConstructionV1,
} from "./r4-local-public-core-runtime-rehearsal.mjs";

const STATE_BASENAME = /^forme-r4-67-staging-[a-f0-9]{16}$/u;
const RUN_ID = /^[a-f0-9]{16}$/u;
const PORT = /^[1-9][0-9]{0,4}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
const SECRET_FILE = "bootstrap-secrets.json";
const PASSWORD_FILE = "postgres-password";
const MANIFEST_FILE = "manifest.json";
const LOCAL_RUNTIME = "local-runtime";
const REMOTE_RUNTIME = "remote-runtime";

export const OWNER_STAGING_NODE_IMAGE = "node@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43";
export const OWNER_STAGING_NODE_PLATFORM = "linux/amd64";

function fail(code) {
  throw new Error(code);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function id(prefix, runId) {
  return `${prefix}_${createHash("sha256").update(`${prefix}:${runId}`).digest("hex").slice(0, 32)}`;
}

function stateNames(runId) {
  if (!RUN_ID.test(runId)) fail("R4_OWNER_STAGING_RUN_ID_INVALID");
  return Object.freeze({
    network: `forme-r4-67-staging-net-${runId}`,
    volume: `forme-r4-67-staging-pg-${runId}`,
    databaseContainer: `forme-r4-67-staging-db-${runId}`,
    applicationContainer: `forme-r4-67-staging-app-${runId}`,
  });
}

async function exactStateRoot(path, mustExist) {
  if (!isAbsolute(path) || !STATE_BASENAME.test(basename(path))) {
    fail("R4_OWNER_STAGING_ROOT_INVALID");
  }
  if (!mustExist) {
    const parent = await realpath(dirname(path));
    if (join(parent, basename(path)) !== path) fail("R4_OWNER_STAGING_ROOT_INVALID");
    return path;
  }
  const canonical = await realpath(path);
  const stat = await lstat(canonical);
  if (
    canonical !== path
    || !stat.isDirectory()
    || stat.isSymbolicLink()
    || stat.uid !== process.getuid?.()
    || (stat.mode & 0o777) !== 0o700
  ) fail("R4_OWNER_STAGING_ROOT_INVALID");
  return canonical;
}

async function privateJson(path, value, flag = "w") {
  await writeFile(path, canonicalJson(value), { encoding: "utf8", mode: 0o600, flag });
  await chmod(path, 0o600);
}

async function privateText(path, value, flag = "w") {
  await writeFile(path, value, { encoding: "utf8", mode: 0o600, flag });
  await chmod(path, 0o600);
}

async function readPrivateJson(path) {
  const stat = await lstat(path);
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || stat.uid !== process.getuid?.()
    || (stat.mode & 0o777) !== 0o600
    || stat.nlink !== 1
    || stat.size < 2
    || stat.size > 64 * 1024
  ) fail("R4_OWNER_STAGING_PRIVATE_FILE_INVALID");
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    fail("R4_OWNER_STAGING_PRIVATE_FILE_INVALID");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("R4_OWNER_STAGING_PRIVATE_FILE_INVALID");
  }
  return parsed;
}

function exactSecretBundle(value) {
  const keys = [
    "schemaVersion", "runId", "commit", "roomId", "entityId", "postgresPassword",
    "bodyKey", "pepperKey", "identityKey", "controllerSecret", "curatorSecret",
    "placeholderOperatorSecret", "publicRateBucket", "publicationAuthority",
    "roomOperatorSecret", "projectionId",
  ];
  if (
    Object.keys(value).length !== keys.length
    || Object.keys(value).some((key) => !keys.includes(key))
    || value.schemaVersion !== "r4.owner-encounter-staging-secrets.v1"
    || !RUN_ID.test(value.runId)
    || !COMMIT.test(value.commit)
    || typeof value.roomId !== "string"
    || typeof value.entityId !== "string"
    || typeof value.publicRateBucket !== "string"
    || (value.publicationAuthority !== null && (typeof value.publicationAuthority !== "object" || Array.isArray(value.publicationAuthority)))
    || (value.roomOperatorSecret !== null && typeof value.roomOperatorSecret !== "string")
    || (value.projectionId !== null && typeof value.projectionId !== "string")
  ) fail("R4_OWNER_STAGING_SECRET_BUNDLE_INVALID");
  for (const key of [
    "postgresPassword", "bodyKey", "pepperKey", "identityKey", "controllerSecret",
    "curatorSecret", "placeholderOperatorSecret",
  ]) {
    if (typeof value[key] !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value[key])) {
      fail("R4_OWNER_STAGING_SECRET_BUNDLE_INVALID");
    }
  }
  return value;
}

function bodyFreeManifest(secrets, status, extra = {}) {
  return Object.freeze({
    schemaVersion: "r4.owner-encounter-staging-manifest.v1",
    runId: secrets.runId,
    commit: secrets.commit,
    status,
    names: stateNames(secrets.runId),
    runtimeImage: OWNER_STAGING_NODE_IMAGE,
    runtimePlatform: OWNER_STAGING_NODE_PLATFORM,
    roomId: secrets.roomId,
    projectionId: secrets.projectionId,
    syntheticDataOnly: true,
    loopbackOnly: true,
    providerCalls: 0,
    externalMessages: 0,
    publicTrafficEffects: 0,
    ...extra,
  });
}

async function initialize(stateRoot, commit) {
  if (!COMMIT.test(commit)) fail("R4_OWNER_STAGING_COMMIT_INVALID");
  await exactStateRoot(stateRoot, false);
  try {
    await lstat(stateRoot);
    fail("R4_OWNER_STAGING_ROOT_EXISTS");
  } catch (error) {
    if (error instanceof Error && error.message === "R4_OWNER_STAGING_ROOT_EXISTS") throw error;
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
  }
  await mkdir(stateRoot, { mode: 0o700 });
  await chmod(stateRoot, 0o700);
  const runId = basename(stateRoot).slice(-16);
  if (!RUN_ID.test(runId)) fail("R4_OWNER_STAGING_RUN_ID_INVALID");
  const capability = localPublicCoreRuntimeConstructionV1.capability;
  const secrets = {
    schemaVersion: "r4.owner-encounter-staging-secrets.v1",
    runId,
    commit,
    roomId: id("room", runId),
    entityId: "entity_forme_public_core_v1",
    postgresPassword: capability(),
    bodyKey: capability(),
    pepperKey: capability(),
    identityKey: capability(),
    controllerSecret: capability(),
    curatorSecret: capability(),
    placeholderOperatorSecret: capability(),
    publicRateBucket: id("bucket", runId),
    publicationAuthority: null,
    roomOperatorSecret: null,
    projectionId: null,
  };
  await privateJson(join(stateRoot, SECRET_FILE), secrets, "wx");
  await privateText(join(stateRoot, PASSWORD_FILE), secrets.postgresPassword, "wx");
  const manifest = bodyFreeManifest(secrets, "INITIALIZED");
  await privateJson(join(stateRoot, MANIFEST_FILE), manifest, "wx");
  return manifest;
}

async function bootstrap(stateRoot, localPort) {
  if (!PORT.test(localPort) || Number(localPort) > 65535) fail("R4_OWNER_STAGING_PORT_INVALID");
  await exactStateRoot(stateRoot, true);
  const secretPath = join(stateRoot, SECRET_FILE);
  const secrets = exactSecretBundle(await readPrivateJson(secretPath));
  if (secrets.publicationAuthority !== null || secrets.roomOperatorSecret !== null || secrets.projectionId !== null) {
    fail("R4_OWNER_STAGING_ALREADY_BOOTSTRAPPED");
  }
  const password = encodeURIComponent(secrets.postgresPassword);
  const localDatabaseUrl = `postgresql://forme:${password}@127.0.0.1:${localPort}/forme_activation`;
  const remoteDatabaseUrl = `postgresql://forme:${password}@127.0.0.1:5432/forme_activation`;
  const pg = {
    host: "127.0.0.1",
    port: Number(localPort),
    user: "forme",
    password: secrets.postgresPassword,
    database: "forme_activation",
    ssl: false,
  };
  const readinessAttempts = await localPublicCoreRuntimeConstructionV1.postgresReady(pg);
  const version = await localPublicCoreRuntimeConstructionV1.sql(pg, "SHOW server_version_num", "owner-staging.postgres.version");
  const serverVersion = Number(version.rows[0]?.server_version_num);
  if (!Number.isSafeInteger(serverVersion) || Math.floor(serverVersion / 10_000) !== 16) {
    fail("R4_OWNER_STAGING_POSTGRES_VERSION_INVALID");
  }
  const schema = await readFile(localPublicCoreRuntimeConstructionV1.schemaPath, "utf8");
  const verify = await readFile(localPublicCoreRuntimeConstructionV1.verifyPath, "utf8");
  await localPublicCoreRuntimeConstructionV1.sql(pg, schema, "owner-staging.postgres.schema");
  await localPublicCoreRuntimeConstructionV1.sql(pg, verify, "owner-staging.postgres.verify");

  const now = new Date();
  const projection = createLocalRuntimeRehearsalProjectionV1(secrets.roomId, secrets.entityId, now);
  const approvalHash = canonicalSha256({ runId: secrets.runId, kind: "synthetic-owner-staging-approval" });
  const attestationHash = canonicalSha256({ runId: secrets.runId, kind: "synthetic-owner-staging-attestation" });
  const publicationAuthority = Object.freeze({
    schemaVersion: "r4_public_core_local_publication_authority.v1",
    projectionPayloadHash: projection.payloadHash,
    publicationApprovalHash: approvalHash,
    publicationAttestationHash: attestationHash,
    basisHash: canonicalSha256({ runId: secrets.runId, kind: "synthetic-owner-staging-basis" }),
    projectionPolicyHash: canonicalSha256({ runId: secrets.runId, kind: "synthetic-owner-staging-policy" }),
    publicationApprovalId: id("approval", secrets.runId),
  });
  const common = {
    bodyKey: secrets.bodyKey,
    pepperKey: secrets.pepperKey,
    identityKey: secrets.identityKey,
    controllerSecret: secrets.controllerSecret,
    curatorSecret: secrets.curatorSecret,
    roomOperatorSecret: secrets.placeholderOperatorSecret,
    publicationAuthority,
    publicRateBucket: secrets.publicRateBucket,
    roomId: secrets.roomId,
  };
  const localRoot = join(stateRoot, LOCAL_RUNTIME);
  await localPublicCoreRuntimeConstructionV1.writeRuntimeRoot({
    ...common,
    runtimeRoot: localRoot,
    databaseUrl: localDatabaseUrl,
  });
  let loaded = await loadPublicCoreLocalRuntimeV1(localRoot);
  try {
    const key = secrets.runId.padEnd(32, "0");
    const created = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room.create", {
      secret: secrets.controllerSecret,
      body: { entityId: secrets.entityId, roomKind: "third_place_public", label: "Forme isolated Owner staging" },
      idempotencyKey: `controller_${key}`,
    });
    if (created.status !== 201 || created.body.roomId !== secrets.roomId) fail("R4_OWNER_STAGING_ROOM_CREATE_INVALID");
    const paired = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room.pair", {
      secret: secrets.controllerSecret,
      params: { roomId: secrets.roomId },
      idempotencyKey: `pair_${key}`,
      expectedVersion: 1,
    });
    const pairingId = paired.body.pairingId;
    const pairingCode = paired.body.pairingCode;
    if (typeof pairingId !== "string" || typeof pairingCode !== "string") fail("R4_OWNER_STAGING_PAIR_INVALID");
    const exchangeKey = `exchange_${key}`;
    const clientPublicKey = `isolated-owner-staging-${secrets.runId}`;
    const exchanged = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room.pair.exchange", {
      params: { pairingId },
      body: { pairingCode, clientPublicKey },
      idempotencyKey: exchangeKey,
      expectedVersion: 1,
    });
    if (exchanged.status !== 201) fail("R4_OWNER_STAGING_PAIR_EXCHANGE_INVALID");
    const identityKeyBytes = Buffer.from(secrets.identityKey, "base64url");
    const roomOperatorSecret = localPublicCoreRuntimeConstructionV1.deriveBindingSecret({
      identityKeyBytes,
      pairingId,
      pairingCode,
      clientPublicKey,
      idempotencyKey: exchangeKey,
    });
    await loaded.close();
    loaded = null;
    const finalCommon = { ...common, roomOperatorSecret };
    await localPublicCoreRuntimeConstructionV1.writeRuntimeRoot({
      ...finalCommon,
      runtimeRoot: localRoot,
      databaseUrl: localDatabaseUrl,
    });
    await localPublicCoreRuntimeConstructionV1.writeRuntimeRoot({
      ...finalCommon,
      runtimeRoot: join(stateRoot, REMOTE_RUNTIME),
      databaseUrl: remoteDatabaseUrl,
    });
    loaded = await loadPublicCoreLocalRuntimeV1(localRoot);
    const delivered = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room_operator.projection.deliver", {
      secret: roomOperatorSecret,
      body: { projection, publicationApprovalHash: approvalHash, publicationAttestationHash: attestationHash },
      idempotencyKey: `deliver_${key}`,
      expectedVersion: 1,
    });
    if (delivered.status !== 201) fail("R4_OWNER_STAGING_PROJECTION_DELIVER_INVALID");
    const admitted = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "curation.admit", {
      secret: secrets.curatorSecret,
      params: { projectionId: projection.projectionId },
      idempotencyKey: `admit_${key}`,
      expectedVersion: 1,
    });
    if (admitted.status !== 200) fail("R4_OWNER_STAGING_CURATION_INVALID");
    const opened = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room.mode.set", {
      secret: secrets.controllerSecret,
      params: { roomId: secrets.roomId },
      body: { interactionMode: "public_single" },
      idempotencyKey: `open_${key}`,
      expectedVersion: 2,
    });
    if (opened.status !== 200) fail("R4_OWNER_STAGING_MODE_INVALID");
    const listed = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "third_place.list");
    if (!Array.isArray(listed.body.residents) || listed.body.residents.length !== 1) {
      fail("R4_OWNER_STAGING_DISCOVERY_INVALID");
    }
    Object.assign(secrets, {
      publicationAuthority,
      roomOperatorSecret,
      projectionId: projection.projectionId,
    });
    await privateJson(secretPath, secrets);
    const manifest = bodyFreeManifest(secrets, "BOOTSTRAPPED", {
      postgresServerVersion: serverVersion,
      readinessAttempts,
      schemaSha256: sha256(Buffer.from(schema, "utf8")),
      verifySha256: sha256(Buffer.from(verify, "utf8")),
      roomVersion: 3,
      projectionVersion: 2,
    });
    await privateJson(join(stateRoot, MANIFEST_FILE), manifest);
    return manifest;
  } finally {
    if (loaded) await loaded.close();
  }
}

async function ownerPull(stateRoot) {
  await exactStateRoot(stateRoot, true);
  const secrets = exactSecretBundle(await readPrivateJson(join(stateRoot, SECRET_FILE)));
  if (secrets.roomOperatorSecret === null || secrets.projectionId === null) {
    fail("R4_OWNER_STAGING_NOT_BOOTSTRAPPED");
  }
  const loaded = await loadPublicCoreLocalRuntimeV1(join(stateRoot, LOCAL_RUNTIME));
  try {
    const key = randomBytes(16).toString("hex");
    const synced = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room_operator.sync", {
      secret: secrets.roomOperatorSecret,
      body: { roomId: secrets.roomId, afterSequence: 0 },
      idempotencyKey: `owner_sync_${key}`,
    });
    const events = Array.isArray(synced.body.events) ? synced.body.events : [];
    const accepted = [...events].reverse().find((event) => (
      event?.action === "interaction.create"
      && event?.targetKind === "interaction"
      && event?.bodyAvailable === true
    ));
    if (typeof accepted?.targetId !== "string") {
      return Object.freeze({
        schemaVersion: "r4.owner-encounter-staging-owner-view.v1",
        status: "WAITING_FOR_GUEST",
        roomId: secrets.roomId,
        projectionId: secrets.projectionId,
        interaction: null,
      });
    }
    const pulled = await localPublicCoreRuntimeConstructionV1.operation(loaded.runtime, "room_operator.pull", {
      secret: secrets.roomOperatorSecret,
      params: { interactionId: accepted.targetId },
      idempotencyKey: id("owner_pull", `${secrets.runId}:${accepted.targetId}`),
      expectedVersion: 1,
    });
    const interaction = pulled.body.interaction;
    if (
      interaction?.interactionId !== accepted.targetId
      || interaction?.projectionId !== secrets.projectionId
      || typeof interaction?.interactionType !== "string"
      || typeof interaction?.consent !== "string"
      || typeof interaction?.expiresAt !== "string"
      || typeof pulled.body.requestBody !== "string"
    ) fail("R4_OWNER_STAGING_PULL_INVALID");
    return Object.freeze({
      schemaVersion: "r4.owner-encounter-staging-owner-view.v1",
      status: "GUEST_KNOCK_RECEIVED",
      roomId: secrets.roomId,
      projectionId: secrets.projectionId,
      interaction: Object.freeze({
        interactionId: accepted.targetId,
        interactionType: interaction.interactionType,
        requestBody: pulled.body.requestBody,
        consent: interaction.consent,
        originProjectionId: interaction.projectionId,
        bodyExpiresAt: interaction.expiresAt,
      }),
    });
  } finally {
    await loaded.close();
  }
}

async function removeState(stateRoot) {
  await exactStateRoot(stateRoot, true);
  await rm(stateRoot, { recursive: true, force: false });
  try {
    await realpath(stateRoot);
  } catch {
    return Object.freeze({ schemaVersion: "r4.owner-encounter-staging-local-cleanup.v1", stateRootAbsent: true });
  }
  fail("R4_OWNER_STAGING_LOCAL_CLEANUP_FAILED");
}

export async function runOwnerEncounterStagingCli(args) {
  const [command, stateRoot, value] = args;
  if (command === "init" && args.length === 3) return await initialize(stateRoot, value);
  if (command === "bootstrap" && args.length === 3) return await bootstrap(stateRoot, value);
  if (command === "owner-pull" && args.length === 2) return await ownerPull(stateRoot);
  if (command === "cleanup-local" && args.length === 2) return await removeState(stateRoot);
  fail("usage: r4-owner-encounter-staging <init ROOT COMMIT|bootstrap ROOT LOCAL_PORT|owner-pull ROOT|cleanup-local ROOT>");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runOwnerEncounterStagingCli(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "R4_OWNER_STAGING_FAILED"}\n`);
    process.exitCode = 1;
  }
}
