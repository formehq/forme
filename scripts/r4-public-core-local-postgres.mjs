#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const GRANT_ID = /^[0-9a-f]{32}$/u;
const MAX_GRANT_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const DOCKER_CLI = "/Applications/Docker.app/Contents/Resources/bin/docker";
const DOCKER_CLI_SHA256 = "sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a";
const IMAGE_REFERENCE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
const IMAGE_PLATFORM_MANIFEST = "sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf";
const ADDENDUM_SHA256 = "sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f";
const ADDENDUM_REVIEW_SHA256 = "sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2";
const WIRING_PACKET_SHA256 = "sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258";
const ADDENDUM_WRAPPER_HEAD = "1db7b30f38ca6322a3b0ad4be6d537af9cf781e8";
const ADDENDUM_WRAPPER_TREE = "1270bbc9beae9c446c83bbfc220e5906800890e3";
const PACKAGE_LOCK_SHA256 = "sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f";
const PG_IMPORT_CLOSURE_SHA256 = "sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4";
const PG_IMPORT_CLOSURE_FILE_COUNT = 145;
const PG_IMPORT_CLOSURE_PACKAGES = Object.freeze([
  "@types/pg", "pg", "pg-cloudflare", "pg-connection-string", "pg-int8", "pg-pool",
  "pg-protocol", "pg-types", "pgpass", "postgres-array", "postgres-bytea", "postgres-date",
  "postgres-interval", "split2", "xtend",
]);
const OBSOLETE_SQL_HASHES = new Set([
  "sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2",
  "sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4",
  "sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e",
]);

export const LOCAL_POSTGRES_STAGE_A_PATHS = Object.freeze([
  "apps/room/package.json",
  "apps/room/src/public-core-application.ts",
  "apps/room/src/public-core-crypto.ts",
  "apps/room/src/public-core-pg-executor.ts",
  "apps/room/src/public-core-postgres-application-store.ts",
  "apps/room/src/public-core-postgres.ts",
  "package-lock.json",
  "schemas/r4/public-core/rollback.sql",
  "schemas/r4/public-core/schema.sql",
  "schemas/r4/public-core/verify.sql",
  "scripts/r4-public-core-local-postgres.mjs",
  "test/r4/public-core-application.test.ts",
  "test/r4/public-core-local-postgres.test.ts",
  "test/r4/public-core-pg-executor.test.ts",
  "test/r4/public-core-postgres-application-store.test.ts",
  "test/r4/public-core-postgres.test.ts",
  "test/r4/public-core-privacy.test.ts",
]);

export const LOCAL_POSTGRES_SQL_PATHS = Object.freeze({
  schema: "schemas/r4/public-core/schema.sql",
  verify: "schemas/r4/public-core/verify.sql",
  rollback: "schemas/r4/public-core/rollback.sql",
});

export const LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS = Object.freeze({
  packet: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND.md",
  review: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-OWNER-REVIEW.md",
});

export const LOCAL_POSTGRES_PHASE1_AUTHORITY = Object.freeze({
  schemaVersion: "r4.public-core-local-postgres-phase1-authority.v2",
  addendumSha256: ADDENDUM_SHA256,
  addendumReviewSha256: ADDENDUM_REVIEW_SHA256,
  addendumWrapperHead: ADDENDUM_WRAPPER_HEAD,
  addendumWrapperTree: ADDENDUM_WRAPPER_TREE,
  packageLockSha256: PACKAGE_LOCK_SHA256,
  pgImportClosureSha256: PG_IMPORT_CLOSURE_SHA256,
  pgImportClosureFileCount: PG_IMPORT_CLOSURE_FILE_COUNT,
  stageAPathCount: 17,
  catalog: Object.freeze({ tables: 14, columns: 207, constraints: 172, indexes: 44 }),
  dockerCli: DOCKER_CLI,
  dockerCliSha256: DOCKER_CLI_SHA256,
  imageReference: IMAGE_REFERENCE,
  imagePlatform: "linux/arm64",
  imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
  phase1DockerCalls: 0,
  phase1PostgresConnections: 0,
  physicalRebindRequired: true,
  trafficReady: false,
  gateCReady: false,
});

export const LOCAL_POSTGRES_DOCKER_COMMAND_KINDS = Object.freeze([
  "version", "image.inspect", "image.pull", "container.inspect", "container.create",
  "container.start", "container.stop", "container.rm", "network.inspect", "network.create",
  "network.rm", "volume.inspect", "volume.create", "volume.rm",
]);

const GRANT_KEYS = Object.freeze([
  "schemaVersion", "grantId", "ownerApprovalSha256", "addendumSha256", "addendumReviewSha256",
  "addendumWrapperHead", "addendumWrapperTree", "physicalRebindPacketSha256",
  "physicalRebindReviewSha256", "physicalRebindBaselineHead", "physicalRebindBaselineTree",
  "physicalRebindWrapperHead", "physicalRebindWrapperTree", "stageAHead", "stageATree",
  "stageAArtifactAggregateSha256", "packageLockSha256", "runnerSha256", "schemaSqlSha256",
  "verifySqlSha256", "rollbackSqlSha256", "socketIdentitySha256", "imageReference",
  "maximumPhysicalAttempts", "maximumDockerLifecycles", "localOnly", "productionEffectsAllowed",
  "createdAt", "expiresAt",
]);

const ERROR_DETAILS = new WeakMap();
const JOURNAL_GENESIS = `sha256:${"0".repeat(64)}`;
const JOURNAL_DIRECTORY = "journal-v2";
const JOURNAL_MAXIMUM_ENTRIES = 512;
const JOURNAL_NORMAL_MAXIMUM_BYTES = 900_000;
const JOURNAL_TOTAL_MAXIMUM_BYTES = 1_000_000;
const MAX_DOCKER_OUTPUT_BYTES = 16 * 1024 * 1024;
const POSTGRES_READY_ATTEMPTS = 60;
const POSTGRES_READY_INTERVAL_MS = 500;
const JOURNAL_EVENTS = new Set([
  "grant.consumed", "docker.lifecycle_started", "docker.version_verified", "resources.absence_verified",
  "image.pull_attempted", "image.pulled", "image.verified", "network.created", "volume.created",
  "container.created", "container.started", "primary.schema_verified", "primary.walking_flow_green",
  "container.stopped", "primary.restart_replay_green", "primary.closure_flow_green",
  "rollback_database.created", "rollback_database.rehearsal_green", "container.removed",
  "network.removed", "volume.removed", "cleanup.proven", "cleanup.recovered",
]);

function assertUnicode(value) {
  if (typeof value !== "string" || value.normalize("NFC") !== value) throw new TypeError("invalid_unicode");
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("invalid_unicode");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new TypeError("invalid_unicode");
  }
}

function encodeCanonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("invalid_number");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertUnicode(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => encodeCanonical(item)).join(",")}]`;
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    || Object.getOwnPropertySymbols(value).length !== 0) throw new TypeError("invalid_json_value");
  const keys = Object.keys(value).sort(binaryCompare);
  return `{${keys.map((key) => {
    assertUnicode(key);
    if (value[key] === undefined) throw new TypeError("invalid_json_value");
    return `${JSON.stringify(key)}:${encodeCanonical(value[key])}`;
  }).join(",")}}`;
}

function canonicalJson(value) {
  return encodeCanonical(value);
}

class StrictJsonParser {
  #source;
  #index = 0;

  constructor(source) {
    if (typeof source !== "string") throw new TypeError("invalid_json_source");
    this.#source = source;
  }

  parse() {
    this.#skipWhitespace();
    const value = this.#parseValue();
    this.#skipWhitespace();
    if (this.#index !== this.#source.length) this.#error();
    return value;
  }

  #parseValue() {
    const char = this.#source[this.#index];
    if (char === "{") return this.#parseObject();
    if (char === "[") return this.#parseArray();
    if (char === '"') return this.#parseString();
    if (char === "t") return this.#literal("true", true);
    if (char === "f") return this.#literal("false", false);
    if (char === "n") return this.#literal("null", null);
    return this.#parseNumber();
  }

  #parseObject() {
    this.#index += 1;
    this.#skipWhitespace();
    const object = Object.create(null);
    const seen = new Set();
    if (this.#source[this.#index] === "}") { this.#index += 1; return object; }
    while (true) {
      if (this.#source[this.#index] !== '"') this.#error();
      const key = this.#parseString();
      if (seen.has(key)) this.#error();
      seen.add(key);
      this.#skipWhitespace();
      if (this.#source[this.#index] !== ":") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
      object[key] = this.#parseValue();
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "}") { this.#index += 1; return object; }
      if (separator !== ",") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseArray() {
    this.#index += 1;
    this.#skipWhitespace();
    const array = [];
    if (this.#source[this.#index] === "]") { this.#index += 1; return array; }
    while (true) {
      array.push(this.#parseValue());
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "]") { this.#index += 1; return array; }
      if (separator !== ",") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseString() {
    const start = this.#index;
    this.#index += 1;
    let escaped = false;
    while (this.#index < this.#source.length) {
      const code = this.#source.charCodeAt(this.#index);
      if (!escaped && code === 0x22) {
        this.#index += 1;
        let value;
        try { value = JSON.parse(this.#source.slice(start, this.#index)); } catch { this.#error(); }
        assertUnicode(value);
        return value;
      }
      if (!escaped && code < 0x20) this.#error();
      if (!escaped && code === 0x5c) escaped = true;
      else escaped = false;
      this.#index += 1;
    }
    this.#error();
  }

  #parseNumber() {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(this.#source.slice(this.#index));
    if (!match) this.#error();
    this.#index += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) this.#error();
    return number;
  }

  #literal(literal, value) {
    if (!this.#source.startsWith(literal, this.#index)) this.#error();
    this.#index += literal.length;
    return value;
  }

  #skipWhitespace() {
    while ([" ", "\t", "\n", "\r"].includes(this.#source[this.#index])) this.#index += 1;
  }

  #error() {
    throw new SyntaxError("invalid_strict_json");
  }
}

function parseStrictJson(source) {
  return new StrictJsonParser(source).parse();
}

export class LocalPostgresRunnerError extends Error {
  constructor(code) {
    super(code);
    this.name = "LocalPostgresRunnerError";
    ERROR_DETAILS.set(this, Object.freeze({ code }));
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({ name: "LocalPostgresRunnerError", code: ERROR_DETAILS.get(this)?.code ?? "local_postgres_runner_failed" });
  }
}

function authenticLocalPostgresRunnerErrorDetails(error) {
  try {
    if ((typeof error !== "object" && typeof error !== "function") || error === null || !Object.isFrozen(error)) return null;
    return ERROR_DETAILS.get(error) ?? null;
  } catch {
    return null;
  }
}

function fail(code) {
  throw new LocalPostgresRunnerError(code);
}

function sha256Bytes(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function sha256File(filePath) {
  try {
    return sha256Bytes(fs.readFileSync(filePath));
  } catch {
    fail("local_postgres_file_read_failed");
  }
}

function binaryCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function ownedPlain(value, depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("local_postgres_input_invalid");
    return value;
  }
  if (typeof value !== "object" || depth > 32 || seen.has(value)) fail("local_postgres_input_invalid");
  seen.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) fail("local_postgres_input_invalid");
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) fail("local_postgres_input_invalid");
      const length = descriptors.length;
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0) fail("local_postgres_input_invalid");
      const result = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail("local_postgres_input_invalid");
        result.push(ownedPlain(descriptor.value, depth + 1, seen));
      }
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key))) fail("local_postgres_input_invalid");
      return Object.freeze(result);
    }
    if (prototype !== Object.prototype && prototype !== null) fail("local_postgres_input_invalid");
    const result = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor) || !descriptor.enumerable) fail("local_postgres_input_invalid");
      result[key] = ownedPlain(descriptor.value, depth + 1, seen);
    }
    return Object.freeze(result);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_input_invalid");
  } finally {
    seen.delete(value);
  }
}

function exactKeys(value, expected) {
  const actual = Object.keys(value).sort(binaryCompare);
  const wanted = [...expected].sort(binaryCompare);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail("local_postgres_input_invalid");
}

function assertSha(value) {
  if (typeof value !== "string" || !SHA256.test(value)) fail("local_postgres_hash_invalid");
  return value;
}

function assertGit(value) {
  if (typeof value !== "string" || !GIT_OBJECT.test(value)) fail("local_postgres_git_binding_invalid");
  return value;
}

function instant(value) {
  if (typeof value !== "string") fail("local_postgres_time_invalid");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail("local_postgres_time_invalid");
  return parsed;
}

function runGit(args, binary = false) {
  const closedArgs = [
    "--no-optional-locks",
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "diff.external=",
    "-c", "submodule.recurse=false",
    ...args,
  ];
  const result = spawnSync("/usr/bin/git", closedArgs, {
    cwd: ROOT,
    encoding: binary ? null : "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/var/empty",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
    },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.status !== 0 || result.signal !== null) fail("local_postgres_git_verification_failed");
  if (binary) {
    if (!Buffer.isBuffer(result.stdout)) fail("local_postgres_git_verification_failed");
    return result.stdout;
  }
  if (typeof result.stdout !== "string") fail("local_postgres_git_verification_failed");
  return result.stdout.trim();
}

function gitBlob(head, artifactPath) {
  if (!GIT_OBJECT.test(head) || !LOCAL_POSTGRES_STAGE_A_PATHS.includes(artifactPath)) fail("local_postgres_git_binding_invalid");
  return runGit(["show", `${head}:${artifactPath}`], true);
}

export function computeStageAArtifactAggregate(head) {
  assertGit(head);
  const records = LOCAL_POSTGRES_STAGE_A_PATHS.map((artifactPath) => {
    const bytes = gitBlob(head, artifactPath);
    return Object.freeze({ path: artifactPath, bytes: bytes.length, sha256: sha256Bytes(bytes) });
  });
  const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
  return Object.freeze({ records: Object.freeze(records), aggregateSha256: sha256Bytes(frame) });
}

function assertPrivateDirectory(directoryPath) {
  let stat;
  try {
    stat = fs.lstatSync(directoryPath, { bigint: true });
  } catch {
    fail("local_postgres_private_root_invalid");
  }
  const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
  if (!path.isAbsolute(directoryPath) || !stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid
    || (Number(stat.mode) & 0o777) !== 0o700 || stat.nlink < 2n) fail("local_postgres_private_root_invalid");
  return stat;
}

function readPrivateJsonRecord(filePath, expectedLinks = 1n) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isFile() || stat.uid !== uid || (Number(stat.mode) & 0o777) !== 0o600
      || stat.nlink !== expectedLinks || stat.size > 65_536n) {
      fail("local_postgres_private_file_invalid");
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (after.dev !== stat.dev || after.ino !== stat.ino || after.size !== stat.size
      || after.nlink !== expectedLinks) fail("local_postgres_private_file_invalid");
    const raw = bytes.toString("utf8");
    const parsed = parseStrictJson(raw);
    if (raw !== `${canonicalJson(parsed)}\n`) fail("local_postgres_private_file_invalid");
    return Object.freeze({ value: parsed, sha256: sha256Bytes(bytes) });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function readPrivateJson(filePath) {
  return readPrivateJsonRecord(filePath).value;
}

function writePrivateJson(filePath, value, exclusive = true) {
  let descriptor;
  try {
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW | (exclusive ? fs.constants.O_EXCL : fs.constants.O_TRUNC);
    descriptor = fs.openSync(filePath, flags, 0o600);
    const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
    if (bytes.length > 65_536) fail("local_postgres_private_file_invalid");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

export function deriveLocalPostgresResourceNames(grantId) {
  if (typeof grantId !== "string" || !GRANT_ID.test(grantId)) fail("local_postgres_grant_invalid");
  const suffix = grantId.slice(0, 16);
  return Object.freeze({
    runId: suffix,
    container: `forme-r4-public-core-local-${suffix}`,
    network: `forme-r4-public-core-local-net-${suffix}`,
    volume: `forme-r4-public-core-local-vol-${suffix}`,
    databasePrimary: `forme_r4_local_${suffix}_a`,
    databaseRollback: `forme_r4_local_${suffix}_b`,
    labelKey: "forme.r4.public-core.local.grant",
    labelValue: grantId,
  });
}

function verifyRebindWrapper(grant) {
  const packetBytes = runGit(["show", `${grant.physicalRebindBaselineHead}:${LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.packet}`], true);
  const reviewBytes = runGit(["show", `${grant.physicalRebindWrapperHead}:${LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.review}`], true);
  if (sha256Bytes(packetBytes) !== grant.physicalRebindPacketSha256 || sha256Bytes(reviewBytes) !== grant.physicalRebindReviewSha256) {
    fail("local_postgres_physical_rebind_binding_invalid");
  }
  if (runGit(["rev-parse", `${grant.physicalRebindBaselineHead}^{tree}`]) !== grant.physicalRebindBaselineTree
    || runGit(["rev-parse", `${grant.physicalRebindWrapperHead}^{tree}`]) !== grant.physicalRebindWrapperTree
    || runGit(["rev-parse", `${grant.physicalRebindWrapperHead}^`]) !== grant.physicalRebindBaselineHead
    || runGit(["rev-parse", `${grant.physicalRebindBaselineHead}^`]) !== grant.stageAHead) {
    fail("local_postgres_physical_rebind_binding_invalid");
  }
  const packetDelta = runGit(["diff", "--name-only", `${grant.stageAHead}..${grant.physicalRebindBaselineHead}`]).split("\n").filter(Boolean);
  const reviewDelta = runGit(["diff", "--name-only", `${grant.physicalRebindBaselineHead}..${grant.physicalRebindWrapperHead}`]).split("\n").filter(Boolean);
  if (packetDelta.length !== 1 || packetDelta[0] !== LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.packet
    || reviewDelta.length !== 1 || reviewDelta[0] !== LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.review) {
    fail("local_postgres_physical_rebind_workset_invalid");
  }
}

export function validateLocalPostgresGrant(rawGrant, now = new Date()) {
  const grant = ownedPlain(rawGrant);
  exactKeys(grant, GRANT_KEYS);
  if (grant.schemaVersion !== "r4.public-core-local-postgres-grant.v2"
    || typeof grant.grantId !== "string" || !GRANT_ID.test(grant.grantId)
    || grant.addendumSha256 !== ADDENDUM_SHA256 || grant.addendumReviewSha256 !== ADDENDUM_REVIEW_SHA256
    || grant.addendumWrapperHead !== ADDENDUM_WRAPPER_HEAD || grant.addendumWrapperTree !== ADDENDUM_WRAPPER_TREE
    || grant.packageLockSha256 !== PACKAGE_LOCK_SHA256 || grant.imageReference !== IMAGE_REFERENCE
    || grant.maximumPhysicalAttempts !== 1 || grant.maximumDockerLifecycles !== 3
    || grant.localOnly !== true || grant.productionEffectsAllowed !== false) fail("local_postgres_grant_invalid");
  for (const key of [
    "ownerApprovalSha256", "physicalRebindPacketSha256", "physicalRebindReviewSha256",
    "stageAArtifactAggregateSha256", "runnerSha256", "schemaSqlSha256", "verifySqlSha256",
    "rollbackSqlSha256", "socketIdentitySha256",
  ]) assertSha(grant[key]);
  for (const key of [
    "physicalRebindBaselineHead", "physicalRebindBaselineTree", "physicalRebindWrapperHead",
    "physicalRebindWrapperTree", "stageAHead", "stageATree",
  ]) assertGit(grant[key]);
  if (OBSOLETE_SQL_HASHES.has(grant.schemaSqlSha256) || OBSOLETE_SQL_HASHES.has(grant.verifySqlSha256)
    || OBSOLETE_SQL_HASHES.has(grant.rollbackSqlSha256)) fail("local_postgres_obsolete_sql_grant");
  const createdAt = instant(grant.createdAt);
  const expiresAt = instant(grant.expiresAt);
  const observedAt = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(observedAt) || expiresAt <= createdAt || expiresAt - createdAt > MAX_GRANT_LIFETIME_MS
    || observedAt < createdAt || observedAt >= expiresAt) fail("local_postgres_grant_expired");
  deriveLocalPostgresResourceNames(grant.grantId);
  return grant;
}

export function verifyLocalPostgresCommittedBindings(grant, observedAt = new Date()) {
  const stable = validateLocalPostgresGrant(grant, observedAt);
  verifyRebindWrapper(stable);
  const stageTree = runGit(["rev-parse", `${stable.stageAHead}^{tree}`]);
  const stageParent = runGit(["rev-parse", `${stable.stageAHead}^`]);
  const stageDelta = runGit(["diff", "--name-only", `${ADDENDUM_WRAPPER_HEAD}..${stable.stageAHead}`])
    .split("\n").filter(Boolean).sort(binaryCompare);
  if (stageTree !== stable.stageATree || stageParent !== ADDENDUM_WRAPPER_HEAD
    || stageDelta.length !== LOCAL_POSTGRES_STAGE_A_PATHS.length
    || stageDelta.some((artifactPath, index) => artifactPath !== LOCAL_POSTGRES_STAGE_A_PATHS[index])) {
    fail("local_postgres_stage_a_binding_invalid");
  }
  const artifacts = computeStageAArtifactAggregate(stable.stageAHead);
  if (artifacts.aggregateSha256 !== stable.stageAArtifactAggregateSha256) fail("local_postgres_stage_a_binding_invalid");
  for (const record of artifacts.records) {
    if (sha256File(path.join(ROOT, record.path)) !== record.sha256) fail("local_postgres_stage_a_worktree_drift");
  }
  if (sha256File(path.join(ROOT, "package-lock.json")) !== stable.packageLockSha256
    || sha256File(fileURLToPath(import.meta.url)) !== stable.runnerSha256
    || sha256File(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.schema)) !== stable.schemaSqlSha256
    || sha256File(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.verify)) !== stable.verifySqlSha256
    || sha256File(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.rollback)) !== stable.rollbackSqlSha256) {
    fail("local_postgres_stage_a_worktree_drift");
  }
  const currentHead = runGit(["rev-parse", "HEAD^{commit}"]);
  const currentTree = runGit(["rev-parse", "HEAD^{tree}"]);
  if (currentHead !== stable.physicalRebindWrapperHead || currentTree !== stable.physicalRebindWrapperTree
    || runGit(["status", "--porcelain=v1", "--untracked-files=no"]) !== "") fail("local_postgres_wrapper_worktree_drift");
  return Object.freeze({ stageAHead: stable.stageAHead, stageATree: stable.stageATree, artifactAggregateSha256: artifacts.aggregateSha256 });
}

export function createLocalPostgresPendingGrant(input) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["privateRoot", "grant"]);
  if (typeof stable.privateRoot !== "string") fail("local_postgres_private_root_invalid");
  assertPrivateDirectory(stable.privateRoot);
  validateLocalPostgresGrant(stable.grant);
  const pending = path.join(stable.privateRoot, "grant.pending.json");
  const consumed = path.join(stable.privateRoot, "grant.consumed.json");
  if (fs.existsSync(pending) || fs.existsSync(consumed)) fail("local_postgres_grant_already_exists");
  writePrivateJson(pending, stable.grant);
  return Object.freeze({ pendingGrantSha256: sha256File(pending) });
}

async function consumeLocalPostgresGrantWithVerifier(input, verifyBindings, checkpoint = () => {}) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["privateRoot", "now"]);
  if (typeof stable.privateRoot !== "string") fail("local_postgres_private_root_invalid");
  assertPrivateDirectory(stable.privateRoot);
  const pending = path.join(stable.privateRoot, "grant.pending.json");
  const consumed = path.join(stable.privateRoot, "grant.consumed.json");
  if (fs.existsSync(consumed)) fail("local_postgres_grant_consumed_cleanup_only");
  const grant = validateLocalPostgresGrant(readPrivateJson(pending), new Date(stable.now));
  verifyBindings(grant);
  try {
    await checkpoint("grant.consume.link", "before");
    fs.linkSync(pending, consumed);
    fsyncPrivateDirectory(stable.privateRoot);
    await checkpoint("grant.consume.link", "after");
    const before = fs.lstatSync(pending, { bigint: true });
    const after = fs.lstatSync(consumed, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || after.nlink !== 2n) fail("local_postgres_grant_consume_failed");
    await checkpoint("grant.consume.unlink_pending", "before");
    fs.unlinkSync(pending);
    fsyncPrivateDirectory(stable.privateRoot);
    await checkpoint("grant.consume.unlink_pending", "after");
    if (fs.lstatSync(consumed, { bigint: true }).nlink !== 1n) fail("local_postgres_grant_consume_failed");
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_grant_consume_failed");
  }
  const consumedRecord = readPrivateJsonRecord(consumed);
  return Object.freeze({ grant, consumedGrantSha256: consumedRecord.sha256 });
}

export async function consumeLocalPostgresGrant(input) {
  return consumeLocalPostgresGrantWithVerifier(input, verifyLocalPostgresCommittedBindings);
}

function probeGrantConsumptionState(privateRoot) {
  const pending = privatePath(privateRoot, "grant.pending.json");
  const consumed = privatePath(privateRoot, "grant.consumed.json");
  let pendingStat = null;
  let consumedStat = null;
  try { pendingStat = fs.lstatSync(pending, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_grant_state_invalid");
  }
  try { consumedStat = fs.lstatSync(consumed, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_grant_state_invalid");
  }
  if (pendingStat !== null && consumedStat === null) return Object.freeze({ state: "pending", consumedGrantSha256: null });
  if (pendingStat === null && consumedStat !== null) {
    const record = readPrivateJsonRecord(consumed);
    return Object.freeze({ state: "consumed", consumedGrantSha256: record.sha256 });
  }
  if (pendingStat !== null && consumedStat !== null
    && pendingStat.isFile() && consumedStat.isFile()
    && pendingStat.dev === consumedStat.dev && pendingStat.ino === consumedStat.ino
    && pendingStat.nlink === 2n && consumedStat.nlink === 2n) {
    const record = readPrivateJsonRecord(consumed, 2n);
    return Object.freeze({ state: "both_links", consumedGrantSha256: record.sha256 });
  }
  fail("local_postgres_grant_state_invalid");
}

export function buildLocalPostgresDockerPlan(input) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantId", "secretMountSource"]);
  const resources = deriveLocalPostgresResourceNames(stable.grantId);
  if (typeof stable.secretMountSource !== "string" || !path.isAbsolute(stable.secretMountSource)
    || /[,\0\r\n]/u.test(stable.secretMountSource)) fail("local_postgres_secret_mount_invalid");
  const secretTarget = "/run/secrets/forme-r4-postgres-password";
  const label = `${resources.labelKey}=${resources.labelValue}`;
  const steps = [
    ["version", ["version", "--format", "{{json .}}"]],
    ["image.inspect", ["image", "inspect", "--format", "{{json .}}", IMAGE_REFERENCE]],
    ["image.pull", ["image", "pull", "--platform", "linux/arm64", IMAGE_REFERENCE]],
    ["network.inspect", ["network", "inspect", "--format", "{{json .}}", resources.network]],
    ["network.create", ["network", "create", "--internal", "--label", label, resources.network]],
    ["volume.inspect", ["volume", "inspect", "--format", "{{json .}}", resources.volume]],
    ["volume.create", ["volume", "create", "--label", label, resources.volume]],
    ["container.inspect", ["container", "inspect", "--format", "{{json .}}", resources.container]],
    ["container.create", [
      "container", "create", "--name", resources.container, "--label", label, "--platform", "linux/arm64",
      "--network", resources.network, "--publish", "127.0.0.1::5432",
      "--mount", `type=volume,src=${resources.volume},dst=/var/lib/postgresql/data`,
      "--mount", `type=bind,src=${stable.secretMountSource},dst=${secretTarget},readonly`,
      "--env", `POSTGRES_PASSWORD_FILE=${secretTarget}`, "--env", "POSTGRES_USER=forme_r4_local",
      "--env", `POSTGRES_DB=${resources.databasePrimary}`, IMAGE_REFERENCE,
    ]],
    ["container.start", ["container", "start", resources.container]],
    ["container.stop", ["container", "stop", "--time", "10", resources.container]],
    ["container.rm", ["container", "rm", resources.container]],
    ["network.rm", ["network", "rm", resources.network]],
    ["volume.rm", ["volume", "rm", resources.volume]],
  ].map(([kind, argv], index) => Object.freeze({ order: index + 1, kind, argv: Object.freeze(argv) }));
  return Object.freeze({ schemaVersion: "r4.public-core-local-postgres-docker-plan.v2", resources, steps: Object.freeze(steps) });
}

function privatePath(root, leaf) {
  if (typeof root !== "string" || typeof leaf !== "string" || leaf.includes("/") || leaf.includes("\\") || leaf === "") {
    fail("local_postgres_private_path_invalid");
  }
  const candidate = path.join(root, leaf);
  if (path.dirname(candidate) !== root) fail("local_postgres_private_path_invalid");
  return candidate;
}

function exactFileAbsence(filePath) {
  try {
    fs.lstatSync(filePath);
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
  fail("local_postgres_cleanup_unproven");
}

function fsyncPrivateDirectory(directoryPath) {
  let descriptor;
  try {
    descriptor = fs.openSync(directoryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isDirectory() || stat.uid !== uid || (Number(stat.mode) & 0o077) !== 0) {
      fail("local_postgres_private_file_invalid");
    }
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_private_file_invalid"); }
    }
  }
}

function journalDirectory(privateRoot, create = false) {
  const directoryPath = privatePath(privateRoot, JOURNAL_DIRECTORY);
  if (!coordinatorDirectoryExists(directoryPath)) {
    if (!create) return null;
    try {
      fs.mkdirSync(directoryPath, { mode: 0o700 });
      fsyncPrivateDirectory(privateRoot);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
      fail("local_postgres_journal_invalid");
    }
  }
  try {
    assertPrivateDirectory(directoryPath);
  } catch {
    fail("local_postgres_journal_invalid");
  }
  return directoryPath;
}

function writePrivateBytes(filePath, bytes) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function removePrivateFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== uid || stat.nlink !== 1n
      || (Number(stat.mode) & 0o777) !== 0o600) fail("local_postgres_cleanup_unproven");
    fs.unlinkSync(filePath);
    fsyncPrivateDirectory(path.dirname(filePath));
    exactFileAbsence(filePath);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
}

let cachedProcessStartIdentity = null;
let cachedBootIdentity = null;

function systemBootIdentity() {
  if (cachedBootIdentity !== null) return cachedBootIdentity;
  try {
    if (process.platform === "linux") {
      const bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(bootId)) return null;
      cachedBootIdentity = sha256Bytes(Buffer.from(`linux\0${bootId}`, "utf8"));
      return cachedBootIdentity;
    }
    if (process.platform === "darwin") {
      const result = spawnSync("/usr/sbin/sysctl", ["-n", "kern.boottime"], {
        encoding: "utf8",
        env: { PATH: "/usr/bin:/bin:/usr/sbin", HOME: "/var/empty", LANG: "C", LC_ALL: "C" },
        timeout: 5_000,
        maxBuffer: 8_192,
        windowsHide: true,
      });
      const boot = typeof result.stdout === "string" ? result.stdout.trim() : "";
      if (result.status !== 0 || result.signal !== null || !/^\{ sec = [0-9]+, usec = [0-9]+ \} .*$/u.test(boot)) return null;
      cachedBootIdentity = sha256Bytes(Buffer.from(`darwin\0${boot}`, "utf8"));
      return cachedBootIdentity;
    }
  } catch {
    return null;
  }
  return null;
}

function observeProcessStartIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return Object.freeze({ state: "unknown", identity: null });
  const bootIdentity = systemBootIdentity();
  if (bootIdentity === null) return Object.freeze({ state: "unknown", identity: null });
  try {
    if (process.platform === "linux") {
      let stat;
      try {
        stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      } catch (error) {
        if (error !== null && typeof error === "object" && error.code === "ENOENT") {
          return Object.freeze({ state: "dead", identity: null });
        }
        return Object.freeze({ state: "unknown", identity: null });
      }
      const close = stat.lastIndexOf(")");
      if (close < 1) return Object.freeze({ state: "unknown", identity: null });
      const fields = stat.slice(close + 2).trim().split(/ +/u);
      const startTicks = fields[19];
      if (typeof startTicks !== "string" || !/^[0-9]+$/u.test(startTicks)) {
        return Object.freeze({ state: "unknown", identity: null });
      }
      return Object.freeze({
        state: "live",
        identity: sha256Bytes(Buffer.from(`linux\0${bootIdentity}\0${pid}\0${startTicks}`, "utf8")),
      });
    }
    const result = spawnSync("/bin/ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin", HOME: "/var/empty", LANG: "C", LC_ALL: "C" },
      timeout: 5_000,
      maxBuffer: 8_192,
      windowsHide: true,
    });
    const started = typeof result.stdout === "string" ? result.stdout.trim() : "";
    if (result.signal !== null || result.error !== undefined) return Object.freeze({ state: "unknown", identity: null });
    if (result.status === 1 && started === "") return Object.freeze({ state: "dead", identity: null });
    if (result.status !== 0 || !/^[A-Za-z0-9 :]+$/u.test(started)) {
      return Object.freeze({ state: "unknown", identity: null });
    }
    return Object.freeze({
      state: "live",
      identity: sha256Bytes(Buffer.from(`${process.platform}\0${bootIdentity}\0${pid}\0${started}`, "utf8")),
    });
  } catch {
    return Object.freeze({ state: "unknown", identity: null });
  }
}

function processStartIdentity(pid) {
  const observed = observeProcessStartIdentity(pid);
  return observed.state === "live" ? observed.identity : null;
}

function ownProcessStartIdentity() {
  cachedProcessStartIdentity ??= processStartIdentity(process.pid);
  if (cachedProcessStartIdentity === null) fail("local_postgres_coordinator_liveness_unavailable");
  return cachedProcessStartIdentity;
}

function coordinatorLeaseRecord() {
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-coordinator-lease.v2",
    pid: process.pid,
    processStartIdentity: ownProcessStartIdentity(),
    ownerNonce: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  });
}

function validateCoordinatorLease(value) {
  const lease = ownedPlain(value);
  exactKeys(lease, ["schemaVersion", "pid", "processStartIdentity", "ownerNonce", "createdAt"]);
  if (lease.schemaVersion !== "r4.public-core-local-postgres-coordinator-lease.v2"
    || !Number.isSafeInteger(lease.pid) || lease.pid < 1
    || !SHA256.test(lease.processStartIdentity)
    || typeof lease.ownerNonce !== "string" || !/^[0-9a-f]{64}$/u.test(lease.ownerNonce)) {
    fail("local_postgres_coordinator_lock_invalid");
  }
  instant(lease.createdAt);
  return lease;
}

function coordinatorLeaseIsAlive(lease) {
  const observed = observeProcessStartIdentity(lease.pid);
  if (observed.state === "unknown") return true;
  if (observed.state === "dead") return false;
  return observed.identity === lease.processStartIdentity;
}

function coordinatorDirectoryExists(directoryPath) {
  try {
    fs.lstatSync(directoryPath);
    return true;
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return false;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function inspectCoordinatorLeaseFile(filePath) {
  try {
    return validateCoordinatorLease(readPrivateJsonRecord(filePath, 1n).value);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function unlinkCoordinatorLeaseFile(filePath, expectedOwnerNonce, allowAlreadyAbsent = false) {
  let owner;
  try {
    owner = inspectCoordinatorLeaseFile(filePath);
  } catch (error) {
    if (allowAlreadyAbsent && !coordinatorDirectoryExists(filePath)) return false;
    throw error;
  }
  if (owner.ownerNonce !== expectedOwnerNonce) fail("local_postgres_coordinator_lock_invalid");
  try {
    fs.unlinkSync(filePath);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (allowAlreadyAbsent && error !== null && typeof error === "object" && error.code === "ENOENT") return false;
    fail("local_postgres_coordinator_lock_invalid");
  }
  return true;
}

function coordinatorLeasePath(privateRoot, ownerNonce) {
  return privatePath(privateRoot, `coordinator-lease-${ownerNonce}.json`);
}

function ownerIdentityFileStem(owner) {
  return `p${owner.pid}-s${owner.processStartIdentity.slice("sha256:".length)}-n${owner.ownerNonce}`;
}

const COORDINATOR_DRAFT = /^coordinator-draft-p([1-9][0-9]*)-s([0-9a-f]{64})-n([0-9a-f]{64})\.json$/u;
const COORDINATOR_LEASE = /^coordinator-lease-([0-9a-f]{64})\.json$/u;
const FINALIZATION_DRAFT = /^physical-evidence-draft-p([1-9][0-9]*)-s([0-9a-f]{64})-n([0-9a-f]{64})\.json$/u;

function ownerIdentityFromFilename(match) {
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid < 1) fail("local_postgres_coordinator_lock_invalid");
  return Object.freeze({ pid, processStartIdentity: `sha256:${match[2]}`, ownerNonce: match[3] });
}

function cleanupOwnerNamedDrafts(privateRoot, pattern, isAlive = coordinatorLeaseIsAlive) {
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const match = pattern.exec(name);
    if (match === null) continue;
    const owner = ownerIdentityFromFilename(match);
    if (isAlive(owner)) fail("local_postgres_coordinator_active");
    removePrivateFile(privatePath(privateRoot, name));
  }
}

function writeCoordinatorLeaseAtomic(privateRoot, leasePath, record, checkpoint = () => {}) {
  const preparingPath = privatePath(privateRoot, `coordinator-draft-${ownerIdentityFileStem(record)}.json`);
  try {
    writePrivateJson(preparingPath, record);
    validateCoordinatorLease(readPrivateJson(preparingPath));
    checkpoint("lease.candidate.install", "before");
    fs.renameSync(preparingPath, leasePath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("lease.candidate.install", "after");
  } catch (error) {
    // This writer owns both unique names, so a caught failure removes either
    // location blindly. Only an actual process crash leaves filename-bound
    // bytes for exact dead-owner reconciliation.
    removeOwnUniquePaths([preparingPath, leasePath]);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function scanLiveCoordinatorLeases(privateRoot, isAlive = coordinatorLeaseIsAlive) {
  cleanupOwnerNamedDrafts(privateRoot, COORDINATOR_DRAFT, isAlive);
  const live = [];
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const match = COORDINATOR_LEASE.exec(name);
    if (match === null) {
      if (name.startsWith("coordinator-")) fail("local_postgres_coordinator_lock_invalid");
      continue;
    }
    const leasePath = privatePath(privateRoot, name);
    const owner = inspectCoordinatorLeaseFile(leasePath);
    if (owner.ownerNonce !== match[1]) fail("local_postgres_coordinator_lock_invalid");
    if (!isAlive(owner)) {
      unlinkCoordinatorLeaseFile(leasePath, owner.ownerNonce, true);
      continue;
    }
    const stat = fs.lstatSync(leasePath, { bigint: true });
    live.push(Object.freeze({
      leasePath,
      owner,
      birthtimeNs: stat.birthtimeNs,
      ctimeNs: stat.ctimeNs,
      name,
    }));
  }
  live.sort((left, right) => {
    if (left.birthtimeNs !== right.birthtimeNs) return left.birthtimeNs < right.birthtimeNs ? -1 : 1;
    if (left.ctimeNs !== right.ctimeNs) return left.ctimeNs < right.ctimeNs ? -1 : 1;
    return binaryCompare(left.name, right.name);
  });
  return live;
}

function releaseCoordinatorLease(lease, checkpoint = () => {}) {
  const current = inspectCoordinatorLeaseFile(lease.leasePath);
  if (canonicalJson(current) !== canonicalJson(lease.owner)) fail("local_postgres_coordinator_lock_invalid");
  checkpoint("lease.release", "before");
  unlinkCoordinatorLeaseFile(lease.leasePath, lease.owner.ownerNonce);
  checkpoint("lease.release", "after");
}

function discardOwnCoordinatorLease(privateRoot, owner) {
  const leasePath = coordinatorLeasePath(privateRoot, owner.ownerNonce);
  const draftPath = privatePath(privateRoot, `coordinator-draft-${ownerIdentityFileStem(owner)}.json`);
  removeOwnUniquePaths([draftPath, leasePath]);
}

function removeOwnUniquePaths(filePaths) {
  let removalFailure = null;
  for (const filePath of filePaths) {
    try {
      // These paths are nonce/owner-identity bound to this writer. Do not
      // parse potentially torn bytes; remove the owned name and prove absence.
      removePrivateFile(filePath);
      exactFileAbsence(filePath);
    } catch (error) {
      removalFailure ??= error;
    }
  }
  if (removalFailure !== null) throw removalFailure;
}

function coordinatorBarrierExists(provisionalPath, evidencePath) {
  if (coordinatorDirectoryExists(provisionalPath)) return true;
  if (!coordinatorDirectoryExists(evidencePath)) return false;
  return finalEvidenceIsTerminal(validateFinalizingReceipt(readPrivateJson(evidencePath)));
}

async function acquireCoordinatorLease(
  privateRoot,
  evidencePath,
  checkpoint = () => {},
  syncCheckpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  assertPrivateDirectory(privateRoot);
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  if (coordinatorBarrierExists(provisionalPath, evidencePath)) fail("local_postgres_coordinator_active");
  await checkpoint("lease.acquire.precheck", "after");
  const prior = scanLiveCoordinatorLeases(privateRoot, isAlive);
  if (prior.length !== 0) fail("local_postgres_coordinator_active");
  await checkpoint("lease.acquire.prior_clear", "after");
  const fresh = coordinatorLeaseRecord();
  const leasePath = coordinatorLeasePath(privateRoot, fresh.ownerNonce);
  try {
    writeCoordinatorLeaseAtomic(privateRoot, leasePath, fresh, syncCheckpoint);
    await checkpoint("lease.acquire.published", "after");
    if (coordinatorBarrierExists(provisionalPath, evidencePath)) {
      fail("local_postgres_coordinator_active");
    }
    let live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    for (let attempt = 0; live.length > 1 && live[0].owner.ownerNonce === fresh.ownerNonce && attempt < 50; attempt += 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
      live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    }
    if (live.length !== 1 || live[0].owner.ownerNonce !== fresh.ownerNonce) {
      fail("local_postgres_coordinator_active");
    }
    await checkpoint("lease.acquire.sole_self", "after");
    live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    if (live.length !== 1 || live[0].owner.ownerNonce !== fresh.ownerNonce) {
      fail("local_postgres_coordinator_active");
    }
    if (coordinatorBarrierExists(provisionalPath, evidencePath)) fail("local_postgres_coordinator_active");
    return Object.freeze({ leasePath, owner: fresh, ownerNonce: fresh.ownerNonce });
  } catch (error) {
    discardOwnCoordinatorLease(privateRoot, fresh);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function validateJournalDetail(event, rawDetail) {
  const detail = ownedPlain(rawDetail);
  const emptyEvents = new Set([
    "docker.version_verified", "resources.absence_verified", "network.created", "volume.created",
    "container.created", "primary.restart_replay_green", "rollback_database.rehearsal_green",
    "container.removed", "network.removed", "volume.removed",
  ]);
  if (emptyEvents.has(event)) exactKeys(detail, []);
  else if (event === "grant.consumed") {
    exactKeys(detail, ["consumedGrantSha256"]);
    assertSha(detail.consumedGrantSha256);
  } else if (event === "docker.lifecycle_started") {
    exactKeys(detail, ["mode", "ordinal"]);
    if ((detail.mode !== "construction" && detail.mode !== "cleanup_recovery")
      || !Number.isSafeInteger(detail.ordinal) || detail.ordinal < 1 || detail.ordinal > 3) {
      fail("local_postgres_journal_invalid");
    }
  } else if (event === "image.pull_attempted" || event === "image.pulled") {
    exactKeys(detail, ["referenceSha256"]);
    assertSha(detail.referenceSha256);
  } else if (event === "image.verified") {
    exactKeys(detail, ["platformManifest"]);
    if (detail.platformManifest !== IMAGE_PLATFORM_MANIFEST) fail("local_postgres_journal_invalid");
  } else if (event === "container.started") {
    exactKeys(detail, ["lifecycle"]);
    if (detail.lifecycle !== 1 && detail.lifecycle !== 2) fail("local_postgres_journal_invalid");
  } else if (event === "container.stopped") {
    const keys = Object.keys(detail);
    if (keys.length === 0) exactKeys(detail, []);
    else {
      exactKeys(detail, ["lifecycle"]);
      if (detail.lifecycle !== 1) fail("local_postgres_journal_invalid");
    }
  } else if (event === "primary.schema_verified") {
    exactKeys(detail, ["catalog"]);
    exactKeys(detail.catalog, ["tables", "columns", "constraints", "indexes"]);
    for (const key of ["tables", "columns", "constraints", "indexes"]) {
      if (detail.catalog[key] !== LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog[key]) fail("local_postgres_journal_invalid");
    }
  } else if (event === "primary.walking_flow_green") {
    exactKeys(detail, ["actionCount"]);
    if (detail.actionCount !== 15) fail("local_postgres_journal_invalid");
  } else if (event === "primary.closure_flow_green") {
    exactKeys(detail, ["actionCount"]);
    if (detail.actionCount !== 20) fail("local_postgres_journal_invalid");
  } else if (event === "rollback_database.created") {
    exactKeys(detail, ["identityCount"]);
    if (detail.identityCount !== 2) fail("local_postgres_journal_invalid");
  } else if (event === "cleanup.proven" || event === "cleanup.recovered") {
    exactKeys(detail, ["residueCount"]);
    if (detail.residueCount !== 0) fail("local_postgres_journal_invalid");
  } else fail("local_postgres_journal_invalid");
  return detail;
}

function assignJournalState(target, source) {
  target.sequence = source.sequence;
  target.lastSha256 = source.lastSha256;
  target.dockerLifecycleCount = source.dockerLifecycleCount;
  target.cleanupProven = source.cleanupProven;
  target.totalBytes = source.totalBytes;
}

function appendPrivateJournal(privateRoot, state, event, detail = Object.freeze({})) {
  if (typeof event !== "string" || !JOURNAL_EVENTS.has(event)) fail("local_postgres_journal_invalid");
  const durable = readJournalState(privateRoot);
  if (durable.sequence !== state.sequence || durable.lastSha256 !== state.lastSha256
    || durable.dockerLifecycleCount !== state.dockerLifecycleCount || durable.cleanupProven !== state.cleanupProven) {
    fail("local_postgres_journal_invalid");
  }
  const ownedDetail = validateJournalDetail(event, detail);
  const sequence = state.sequence + 1;
  if (sequence > JOURNAL_MAXIMUM_ENTRIES) fail("local_postgres_journal_invalid");
  const preimage = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-journal-entry.v2",
    sequence,
    previousSha256: state.lastSha256,
    event,
    detail: ownedDetail,
  });
  const entrySha256 = sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8"));
  const entry = Object.freeze({ ...preimage, entrySha256 });
  const entryBytes = Buffer.from(`${canonicalJson(entry)}\n`, "utf8");
  const cleanupEvent = event === "container.stopped" || event === "container.removed"
    || event === "network.removed" || event === "volume.removed" || event.startsWith("cleanup.");
  const maximumBytes = cleanupEvent ? JOURNAL_TOTAL_MAXIMUM_BYTES : JOURNAL_NORMAL_MAXIMUM_BYTES;
  if (durable.totalBytes + entryBytes.length > maximumBytes) fail("local_postgres_journal_invalid");
  const directoryPath = journalDirectory(privateRoot, true);
  const padded = String(sequence).padStart(6, "0");
  const finalPath = path.join(directoryPath, `entry-${padded}.json`);
  const pendingPath = path.join(directoryPath, `entry-${padded}.pending-${crypto.randomBytes(16).toString("hex")}.json`);
  exactFileAbsence(finalPath);
  let renamed = false;
  try {
    writePrivateJson(pendingPath, entry);
    readPrivateJson(pendingPath);
    state.checkpoint?.("journal.entry.install", "before");
    fs.renameSync(pendingPath, finalPath);
    renamed = true;
    fsyncPrivateDirectory(directoryPath);
    state.checkpoint?.("journal.entry.install", "after");
    const committed = readPrivateJsonRecord(finalPath);
    if (committed.sha256 !== sha256Bytes(entryBytes)) fail("local_postgres_journal_invalid");
    const refreshed = readJournalState(privateRoot);
    if (refreshed.sequence !== sequence || refreshed.lastSha256 !== entrySha256) fail("local_postgres_journal_invalid");
    assignJournalState(state, refreshed);
  } catch (error) {
    if (!renamed) {
      try { removePrivateFile(pendingPath); fsyncPrivateDirectory(directoryPath); } catch { /* recovery reader owns any residue */ }
    }
    try { assignJournalState(state, readJournalState(privateRoot)); } catch { /* preserve the primary sanitized failure */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_journal_invalid");
  }
  return entrySha256;
}

function resolveDockerSocketIdentity() {
  try {
    const user = os.userInfo();
    if (typeof user.homedir !== "string" || !path.isAbsolute(user.homedir)) fail("local_postgres_socket_invalid");
    const home = fs.realpathSync(user.homedir);
    const homeStat = fs.lstatSync(home, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : homeStat.uid;
    if (!homeStat.isDirectory() || homeStat.isSymbolicLink() || homeStat.uid !== uid) fail("local_postgres_socket_invalid");
    const dockerDirectory = path.join(home, ".docker");
    const runDirectory = path.join(dockerDirectory, "run");
    for (const directory of [dockerDirectory, runDirectory]) {
      const directoryStat = fs.lstatSync(directory, { bigint: true });
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== uid
        || fs.realpathSync(directory) !== directory) fail("local_postgres_socket_invalid");
    }
    const socketPath = path.join(runDirectory, "docker.sock");
    const relative = path.relative(home, socketPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) fail("local_postgres_socket_invalid");
    if (fs.realpathSync(socketPath) !== socketPath) fail("local_postgres_socket_invalid");
    const stat = fs.lstatSync(socketPath, { bigint: true });
    if (!stat.isSocket() || stat.isSymbolicLink() || stat.uid !== uid || stat.nlink !== 1n) fail("local_postgres_socket_invalid");
    const identity = Object.freeze({
      path: socketPath,
      dev: stat.dev.toString(10),
      ino: stat.ino.toString(10),
      uid: stat.uid.toString(10),
      gid: stat.gid.toString(10),
      mode: stat.mode.toString(8),
      nlink: stat.nlink.toString(10),
      size: stat.size.toString(10),
      mtimeMs: stat.mtimeMs.toString(),
    });
    return Object.freeze({ socketPath, identity, identitySha256: sha256Bytes(Buffer.from(canonicalJson(identity), "utf8")) });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_socket_invalid");
  }
}

function revalidateDockerSocketIdentity(authority) {
  const current = resolveDockerSocketIdentity();
  if (current.identitySha256 !== authority.identitySha256 || current.socketPath !== authority.socketPath) {
    fail("local_postgres_socket_identity_drift");
  }
}

function prepareIsolatedDockerHome(privateRoot) {
  const isolatedHome = privatePath(privateRoot, "docker-home");
  const dockerConfig = privatePath(privateRoot, "docker-config");
  try {
    fs.mkdirSync(isolatedHome, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    fs.mkdirSync(dockerConfig, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    writePrivateBytes(path.join(dockerConfig, "config.json"), Buffer.from('{"auths":{}}\n', "utf8"));
    assertPrivateDirectory(isolatedHome);
    assertPrivateDirectory(dockerConfig);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_docker_home_invalid");
  }
  return Object.freeze({ isolatedHome, dockerConfig });
}

function cleanupIsolatedDockerHome(privateRoot) {
  for (const leaf of ["docker-config", "docker-home"]) {
    const candidate = privatePath(privateRoot, leaf);
    try {
      const stat = fs.lstatSync(candidate, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid) fail("local_postgres_cleanup_unproven");
      fs.rmSync(candidate, { recursive: true, force: false });
      fsyncPrivateDirectory(privateRoot);
      exactFileAbsence(candidate);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
      if (error !== null && typeof error === "object" && error.code === "ENOENT") continue;
      fail("local_postgres_cleanup_unproven");
    }
  }
}

function ensureCleanupDockerHome(privateRoot) {
  try {
    return ensureIsolatedDockerHome(privateRoot);
  } catch {
    try {
      cleanupIsolatedDockerHome(privateRoot);
      return prepareIsolatedDockerHome(privateRoot);
    } catch {
      fail("local_postgres_docker_home_invalid");
    }
  }
}

function approvedDockerArgv(plan, kind, argv) {
  if (typeof kind !== "string" || !LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(kind)) fail("local_postgres_docker_command_denied");
  const candidate = ownedPlain(argv);
  const allowed = plan.steps.filter((step) => step.kind === kind).some((step) => (
    step.argv.length === candidate.length && step.argv.every((value, index) => value === candidate[index])
  ));
  if (!allowed) fail("local_postgres_docker_command_denied");
  return candidate;
}

function dockerEnvironment(isolated) {
  return Object.freeze({
    HOME: isolated.isolatedHome,
    DOCKER_CONFIG: isolated.dockerConfig,
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    TMPDIR: isolated.isolatedHome,
  });
}

function createDockerPort(authority, isolated, plan) {
  if (sha256File(DOCKER_CLI) !== DOCKER_CLI_SHA256) fail("local_postgres_docker_cli_invalid");
  const environment = dockerEnvironment(isolated);
  return Object.freeze({
    call(kind, argv, options = Object.freeze({})) {
      const stableOptions = ownedPlain(options);
      if (Object.keys(stableOptions).some((key) => key !== "missingAllowed")) fail("local_postgres_input_invalid");
      const stableArgv = approvedDockerArgv(plan, kind, argv);
      revalidateDockerSocketIdentity(authority);
      const result = spawnSync(DOCKER_CLI, ["--host", `unix://${authority.socketPath}`, ...stableArgv], {
        cwd: "/",
        encoding: "utf8",
        env: environment,
        maxBuffer: MAX_DOCKER_OUTPUT_BYTES,
        timeout: kind === "image.pull" ? 10 * 60_000 : 60_000,
      });
      if (result.signal !== null || result.error !== undefined || typeof result.stdout !== "string" || typeof result.stderr !== "string") {
        fail("local_postgres_docker_call_failed");
      }
      if (result.status !== 0) {
        if (stableOptions.missingAllowed === true && result.status === 1
          && result.stdout === "" && isExactDockerMissingDiagnostic(kind, result.stderr, plan)) {
          return Object.freeze({ found: false, stdout: "" });
        }
        fail("local_postgres_docker_call_failed");
      }
      return Object.freeze({ found: true, stdout: result.stdout.trim() });
    },
  });
}

function isExactDockerMissingDiagnostic(kind, stderr, plan) {
  if (typeof stderr !== "string") return false;
  const message = stderr.endsWith("\n") ? stderr.slice(0, -1) : stderr;
  if (message.includes("\n") || message.includes("\r")) return false;
  const expected = {
    "image.inspect": Object.freeze([
      `Error response from daemon: No such image: ${IMAGE_REFERENCE}`,
      `Error: No such object: ${IMAGE_REFERENCE}`,
    ]),
    "container.inspect": Object.freeze([
      `Error response from daemon: No such container: ${plan.resources.container}`,
    ]),
    "network.inspect": Object.freeze([
      `Error response from daemon: network ${plan.resources.network} not found`,
    ]),
    "volume.inspect": Object.freeze([
      `Error response from daemon: get ${plan.resources.volume}: no such volume`,
    ]),
  }[kind];
  return Array.isArray(expected) && expected.includes(message);
}

function parseDockerJson(value, code = "local_postgres_docker_contract_invalid") {
  try {
    const parsed = parseStrictJson(value);
    return ownedPlain(parsed);
  } catch {
    fail(code);
  }
}

function planStep(plan, kind) {
  const step = plan.steps.find((candidate) => candidate.kind === kind);
  if (!step) fail("local_postgres_docker_command_denied");
  return step;
}

function inspectOwnedResource(docker, plan, kind) {
  const step = planStep(plan, kind);
  const result = docker.call(kind, step.argv, { missingAllowed: true });
  if (!result.found) return null;
  const record = parseDockerJson(result.stdout);
  const labels = kind === "container.inspect" ? record.Config?.Labels : record.Labels;
  if (labels === null || typeof labels !== "object"
    || labels[plan.resources.labelKey] !== plan.resources.labelValue) fail("local_postgres_resource_ownership_invalid");
  return record;
}

function proveOwnedResourceAbsent(docker, plan, kind) {
  const record = inspectOwnedResource(docker, plan, kind);
  if (record !== null) fail("local_postgres_resource_preexists");
}

function validateDockerVersion(result) {
  const record = parseDockerJson(result.stdout);
  if (record.Client?.Version !== "29.3.1" || record.Server?.Version !== "29.3.1"
    || record.Server?.Os !== "linux" || record.Server?.Arch !== "arm64") fail("local_postgres_docker_version_invalid");
}

function validatePinnedImage(result) {
  const record = parseDockerJson(result.stdout);
  const digests = Array.isArray(record.RepoDigests) ? record.RepoDigests : [];
  if (record.Os !== "linux" || record.Architecture !== "arm64" || !digests.includes(IMAGE_REFERENCE)) {
    fail("local_postgres_image_identity_invalid");
  }
  if (record.Descriptor?.digest !== IMAGE_PLATFORM_MANIFEST
    || record.Descriptor?.platform?.os !== "linux"
    || record.Descriptor?.platform?.architecture !== "arm64") {
    fail("local_postgres_image_platform_manifest_invalid");
  }
}

function containerLoopbackPort(record, plan) {
  const ports = record?.NetworkSettings?.Ports?.["5432/tcp"];
  if (!Array.isArray(ports) || ports.length !== 1 || ports[0]?.HostIp !== "127.0.0.1"
    || typeof ports[0]?.HostPort !== "string" || !/^[1-9][0-9]{0,4}$/u.test(ports[0].HostPort)) {
    fail("local_postgres_loopback_binding_invalid");
  }
  const port = Number(ports[0].HostPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535
    || record.Config?.Labels?.[plan.resources.labelKey] !== plan.resources.labelValue) fail("local_postgres_loopback_binding_invalid");
  return port;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withLocalDeadline(operation, milliseconds, code) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("local_deadline")), milliseconds);
        timer.unref?.();
      }),
    ]);
  } catch {
    fail(code);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function canonicalRunnerReceipt(input) {
  return Object.freeze(ownedPlain({ schemaVersion: "r4.public-core-local-postgres-physical-result.v2", ...input }));
}

function removeOwnedPrivateTree(treePath) {
  let stat;
  try { stat = fs.lstatSync(treePath, { bigint: true }); } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
  const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
  if (stat.uid !== uid || stat.isSymbolicLink()) fail("local_postgres_cleanup_unproven");
  if (stat.isFile()) {
    if (stat.nlink !== 1n) fail("local_postgres_cleanup_unproven");
    fs.unlinkSync(treePath);
    fsyncPrivateDirectory(path.dirname(treePath));
    return;
  }
  if (!stat.isDirectory() || (Number(stat.mode) & 0o777) !== 0o700) fail("local_postgres_cleanup_unproven");
  for (const name of fs.readdirSync(treePath).sort(binaryCompare)) {
    if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) fail("local_postgres_cleanup_unproven");
    removeOwnedPrivateTree(path.join(treePath, name));
  }
  fs.rmdirSync(treePath);
  fsyncPrivateDirectory(path.dirname(treePath));
}

function readInstalledClosureFile(filePath) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : before.uid;
    if (!before.isFile() || before.uid !== uid || before.nlink !== 1n || (Number(before.mode) & 0o022) !== 0
      || before.size < 0n || before.size > 4_000_000n) fail("local_postgres_pg_import_closure_invalid");
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.nlink !== 1n) fail("local_postgres_pg_import_closure_invalid");
    return bytes;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_pg_import_closure_invalid"); }
    }
  }
}

function preparePgImportClosure(privateRoot) {
  const sourceRoot = path.join(ROOT, "node_modules");
  const runtimeRoot = privatePath(privateRoot, "pg-runtime");
  const destinationModules = path.join(runtimeRoot, "node_modules");
  exactFileAbsence(runtimeRoot);
  const records = [];
  try {
    fs.mkdirSync(runtimeRoot, { mode: 0o700 });
    fs.mkdirSync(destinationModules, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    fsyncPrivateDirectory(runtimeRoot);
    function copyDirectory(sourceDirectory, destinationDirectory) {
      const sourceStat = fs.lstatSync(sourceDirectory, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : sourceStat.uid;
      if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink() || sourceStat.uid !== uid
        || (Number(sourceStat.mode) & 0o022) !== 0 || fs.realpathSync(sourceDirectory) !== sourceDirectory) {
        fail("local_postgres_pg_import_closure_invalid");
      }
      if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory, { mode: 0o700 });
        fsyncPrivateDirectory(path.dirname(destinationDirectory));
      }
      for (const name of fs.readdirSync(sourceDirectory).sort(binaryCompare)) {
        if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
          fail("local_postgres_pg_import_closure_invalid");
        }
        const sourcePath = path.join(sourceDirectory, name);
        const destinationPath = path.join(destinationDirectory, name);
        const stat = fs.lstatSync(sourcePath, { bigint: true });
        if (stat.isSymbolicLink()) fail("local_postgres_pg_import_closure_invalid");
        if (stat.isDirectory()) copyDirectory(sourcePath, destinationPath);
        else if (stat.isFile()) {
          const bytes = readInstalledClosureFile(sourcePath);
          writePrivateBytes(destinationPath, bytes);
          const relative = path.relative(sourceRoot, sourcePath).split(path.sep).join("/");
          records.push(Object.freeze({ path: relative, sha256: sha256Bytes(bytes), bytes: bytes.length }));
        } else fail("local_postgres_pg_import_closure_invalid");
      }
    }
    for (const packagePath of PG_IMPORT_CLOSURE_PACKAGES) {
      const destinationPackage = path.join(destinationModules, ...packagePath.split("/"));
      const destinationParent = path.dirname(destinationPackage);
      if (!fs.existsSync(destinationParent)) {
        fs.mkdirSync(destinationParent, { mode: 0o700 });
        fsyncPrivateDirectory(path.dirname(destinationParent));
      }
      copyDirectory(path.join(sourceRoot, ...packagePath.split("/")), destinationPackage);
    }
    records.sort((left, right) => binaryCompare(left.path, right.path));
    const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
    if (records.length !== PG_IMPORT_CLOSURE_FILE_COUNT || sha256Bytes(frame) !== PG_IMPORT_CLOSURE_SHA256) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    fsyncPrivateDirectory(destinationModules);
    fsyncPrivateDirectory(runtimeRoot);
    const verified = verifyPgImportClosureRuntime(runtimeRoot);
    return Object.freeze({ runtimeRoot, aggregateSha256: verified.aggregateSha256, fileCount: verified.fileCount });
  } catch (error) {
    try { removeOwnedPrivateTree(runtimeRoot); } catch { /* primary sanitized failure wins */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  }
}

function verifyPgImportClosureRuntime(runtimeRoot) {
  try {
    assertPrivateDirectory(runtimeRoot);
    const modulesRoot = path.join(runtimeRoot, "node_modules");
    assertPrivateDirectory(modulesRoot);
    const expectedTopLevel = [...new Set(PG_IMPORT_CLOSURE_PACKAGES.map((value) => value.split("/")[0]))].sort(binaryCompare);
    const observedTopLevel = fs.readdirSync(modulesRoot).sort(binaryCompare);
    if (observedTopLevel.length !== expectedTopLevel.length
      || observedTopLevel.some((value, index) => value !== expectedTopLevel[index])) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    const typesRoot = path.join(modulesRoot, "@types");
    const observedTypes = fs.readdirSync(typesRoot).sort(binaryCompare);
    if (observedTypes.length !== 1 || observedTypes[0] !== "pg") fail("local_postgres_pg_import_closure_invalid");
    const records = [];
    function visit(directoryPath) {
      const directoryStat = fs.lstatSync(directoryPath, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : directoryStat.uid;
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== uid
        || (Number(directoryStat.mode) & 0o777) !== 0o700 || fs.realpathSync(directoryPath) !== directoryPath) {
        fail("local_postgres_pg_import_closure_invalid");
      }
      for (const name of fs.readdirSync(directoryPath).sort(binaryCompare)) {
        const candidate = path.join(directoryPath, name);
        const stat = fs.lstatSync(candidate, { bigint: true });
        if (stat.isSymbolicLink()) fail("local_postgres_pg_import_closure_invalid");
        if (stat.isDirectory()) visit(candidate);
        else if (stat.isFile()) {
          const bytes = readInstalledClosureFile(candidate);
          const relative = path.relative(modulesRoot, candidate).split(path.sep).join("/");
          if (!PG_IMPORT_CLOSURE_PACKAGES.some((packagePath) => relative.startsWith(`${packagePath}/`))) {
            fail("local_postgres_pg_import_closure_invalid");
          }
          records.push(Object.freeze({ path: relative, sha256: sha256Bytes(bytes), bytes: bytes.length }));
        } else fail("local_postgres_pg_import_closure_invalid");
      }
    }
    visit(modulesRoot);
    records.sort((left, right) => binaryCompare(left.path, right.path));
    const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
    if (records.length !== PG_IMPORT_CLOSURE_FILE_COUNT || sha256Bytes(frame) !== PG_IMPORT_CLOSURE_SHA256) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    return Object.freeze({ aggregateSha256: PG_IMPORT_CLOSURE_SHA256, fileCount: records.length });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  }
}

async function loadPgDriver(runtimeRoot) {
  try {
    if (typeof runtimeRoot !== "string" || !path.isAbsolute(runtimeRoot)) fail("local_postgres_pg_import_closure_invalid");
    verifyPgImportClosureRuntime(runtimeRoot);
    const require = createRequire(path.join(runtimeRoot, "entry.cjs"));
    const resolutionPaths = require.resolve.paths("pg");
    const expectedModulesRoot = path.join(runtimeRoot, "node_modules");
    if (!Array.isArray(resolutionPaths) || resolutionPaths[0] !== expectedModulesRoot) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    for (const fallbackPath of resolutionPaths.slice(1)) exactFileAbsence(fallbackPath);
    const cacheBefore = new Set(Object.keys(require.cache));
    const resolved = require.resolve("pg");
    const modulesRoot = path.join(runtimeRoot, "node_modules") + path.sep;
    if (!resolved.startsWith(modulesRoot)) fail("local_postgres_pg_import_closure_invalid");
    const module = require("pg");
    for (const loadedPath of Object.keys(require.cache)) {
      if (!cacheBefore.has(loadedPath) && !loadedPath.startsWith(modulesRoot)) {
        fail("local_postgres_pg_import_closure_invalid");
      }
    }
    for (const fallbackPath of resolutionPaths.slice(1)) exactFileAbsence(fallbackPath);
    verifyPgImportClosureRuntime(runtimeRoot);
    const candidate = module.Pool ?? module.default?.Pool;
    const types = module.types ?? module.default?.types;
    if (typeof candidate !== "function" || types === null || typeof types !== "object"
      || typeof types.getTypeParser !== "function") fail("local_postgres_pg_driver_invalid");
    const getTypeParser = types.getTypeParser.bind(types);
    const parseInt8 = (value) => {
      if (typeof value !== "string" || !/^-?(?:0|[1-9][0-9]*)$/u.test(value)) fail("local_postgres_pg_integer_invalid");
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) fail("local_postgres_pg_integer_invalid");
      return parsed;
    };
    const baseInt8Array = getTypeParser(1016, "text");
    const parseInt8Array = (value) => {
      let parsed;
      try { parsed = baseInt8Array(value); } catch { fail("local_postgres_pg_integer_invalid"); }
      function convert(item, depth = 0) {
        if (depth > 8) fail("local_postgres_pg_integer_invalid");
        if (Array.isArray(item)) return item.map((child) => convert(child, depth + 1));
        if (item === null) return null;
        if (typeof item === "number") {
          if (!Number.isSafeInteger(item)) fail("local_postgres_pg_integer_invalid");
          return item;
        }
        if (typeof item !== "string") fail("local_postgres_pg_integer_invalid");
        return parseInt8(item);
      }
      return convert(parsed);
    };
    const safeTypes = Object.freeze({
      getTypeParser(oid, format = "text") {
        if (!Number.isSafeInteger(oid) || (format !== "text" && format !== "binary")) fail("local_postgres_pg_type_invalid");
        if (format === "text" && oid === 20) return parseInt8;
        if (format === "text" && oid === 1016) return parseInt8Array;
        const parser = getTypeParser(oid, format);
        if (typeof parser !== "function") fail("local_postgres_pg_type_invalid");
        return parser;
      },
    });
    return Object.freeze({ Pool: candidate, types: safeTypes });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_driver_invalid");
  }
}

function createRunPool(driver, input) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["database", "password", "port"]);
  if (typeof stable.database !== "string" || !/^forme_r4_local_[0-9a-f]{16}_[ab]$|^postgres$/u.test(stable.database)
    || typeof stable.password !== "string" || stable.password.length < 32 || stable.password.length > 256
    || !Number.isSafeInteger(stable.port) || stable.port < 1 || stable.port > 65_535) fail("local_postgres_pool_configuration_invalid");
  try {
    return new driver.Pool({
      host: "127.0.0.1",
      port: stable.port,
      user: "forme_r4_local",
      password: stable.password,
      database: stable.database,
      max: 1,
      min: 0,
      idleTimeoutMillis: 1_000,
      connectionTimeoutMillis: 1_000,
      query_timeout: 90_000,
      statement_timeout: 75_000,
      lock_timeout: 10_000,
      idle_in_transaction_session_timeout: 30_000,
      allowExitOnIdle: false,
      ssl: false,
      application_name: "forme-r4-public-core-local-rehearsal",
      options: "-c timezone=UTC -c datestyle=ISO,MDY -c statement_timeout=75000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=30000",
      types: driver.types,
    });
  } catch {
    fail("local_postgres_pool_configuration_invalid");
  }
}

async function closeRunPool(pool) {
  if (pool === null) return;
  await withLocalDeadline(() => pool.end(), 10_000, "local_postgres_pool_close_failed");
}

async function queryRunPool(pool, text, values = undefined) {
  if (typeof text !== "string" || text.length === 0 || text.length > 2_000_000
    || (values !== undefined && !Array.isArray(values))) fail("local_postgres_sql_input_invalid");
  let result;
  try {
    result = await withLocalDeadline(
      () => (values === undefined ? pool.query(text) : pool.query(text, values)),
      100_000,
      "local_postgres_sql_execution_failed",
    );
  } catch {
    fail("local_postgres_sql_execution_failed");
  }
  try {
    if (result === null || typeof result !== "object") fail("local_postgres_sql_result_invalid");
    const descriptors = Object.getOwnPropertyDescriptors(result);
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (!rowCountDescriptor || !("value" in rowCountDescriptor) || !rowsDescriptor || !("value" in rowsDescriptor)
      || (rowCountDescriptor.value !== null && (!Number.isSafeInteger(rowCountDescriptor.value) || rowCountDescriptor.value < 0))) {
      fail("local_postgres_sql_result_invalid");
    }
    const rows = ownedPlain(rowsDescriptor.value);
    if (!Array.isArray(rows) || (rowCountDescriptor.value !== null && rows.length !== rowCountDescriptor.value)) {
      fail("local_postgres_sql_result_invalid");
    }
    return Object.freeze({ rowCount: rowCountDescriptor.value, rows });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_sql_result_invalid");
  }
}

async function executeRunSql(pool, text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 2_000_000) fail("local_postgres_sql_input_invalid");
  try {
    await pool.query(text);
  } catch {
    fail("local_postgres_sql_execution_failed");
  }
}

async function waitForPostgres(driver, connection) {
  for (let attempt = 1; attempt <= POSTGRES_READY_ATTEMPTS; attempt += 1) {
    let pool = null;
    try {
      pool = createRunPool(driver, connection);
      const result = await queryRunPool(pool, "SELECT 1::integer AS ready");
      if (result.rowCount === 1 && result.rows?.[0]?.ready === 1) {
        await closeRunPool(pool);
        return;
      }
    } catch {
      try { await closeRunPool(pool); } catch { /* a bounded readiness retry remains body-free */ }
      if (attempt === POSTGRES_READY_ATTEMPTS) fail("local_postgres_readiness_failed");
      await delay(POSTGRES_READY_INTERVAL_MS);
      continue;
    }
    try { await closeRunPool(pool); } catch { /* handled by final readiness failure */ }
    if (attempt === POSTGRES_READY_ATTEMPTS) fail("local_postgres_readiness_failed");
    await delay(POSTGRES_READY_INTERVAL_MS);
  }
  fail("local_postgres_readiness_failed");
}

function readSqlArtifact(artifactPath, expectedSha256) {
  const absolute = path.join(ROOT, artifactPath);
  let descriptor;
  try {
    descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size < 1n || stat.size > 2_000_000n) {
      fail("local_postgres_sql_binding_invalid");
    }
    const bytes = fs.readFileSync(descriptor);
    if (BigInt(bytes.length) !== stat.size || sha256Bytes(bytes) !== expectedSha256) fail("local_postgres_sql_binding_invalid");
    const text = bytes.toString("utf8");
    if (text.length === 0 || text.includes("\0")) fail("local_postgres_sql_binding_invalid");
    return text;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_sql_binding_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_sql_binding_invalid"); }
    }
  }
}

const CATALOG_COUNTS_SQL = `
SELECT
  (SELECT count(*)::integer
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND c.relkind = 'r') AS tables,
  (SELECT count(*)::integer
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
  (SELECT count(*)::integer
     FROM pg_constraint x JOIN pg_namespace n ON n.oid = x.connamespace
    WHERE n.nspname = 'forme_r4_public_core') AS constraints,
  (SELECT count(*)::integer FROM pg_indexes WHERE schemaname = 'forme_r4_public_core') AS indexes
`;

async function proveCatalog(pool) {
  const result = await queryRunPool(pool, CATALOG_COUNTS_SQL);
  const row = result.rows?.[0];
  if (result.rowCount !== 1 || row?.tables !== 14 || row?.columns !== 207 || row?.constraints !== 172 || row?.indexes !== 44) {
    fail("local_postgres_catalog_mismatch");
  }
  return Object.freeze({ tables: 14, columns: 207, constraints: 172, indexes: 44 });
}

const DURABLE_NON_SEED_COUNT_SQL = `
SELECT (
  (SELECT count(*) FROM forme_r4_public_core.rooms) +
  (SELECT count(*) FROM forme_r4_public_core.projections) +
  (SELECT count(*) FROM forme_r4_public_core.pairing_challenges) +
  (SELECT count(*) FROM forme_r4_public_core.room_bindings) +
  (SELECT count(*) FROM forme_r4_public_core.public_encounters) +
  (SELECT count(*) FROM forme_r4_public_core.interactions) +
  (SELECT count(*) FROM forme_r4_public_core.rate_events) +
  (SELECT count(*) FROM forme_r4_public_core.room_events) +
  (SELECT count(*) FROM forme_r4_public_core.mutation_receipts) +
  (SELECT count(*) FROM forme_r4_public_core.event_acks) +
  (SELECT count(*) FROM forme_r4_public_core.encryption_nonces) +
  (SELECT count(*) FROM forme_r4_public_core.purge_jobs)
)::integer AS durable_rows,
(SELECT count(*)::integer FROM forme_r4_public_core.installation) AS installation_rows,
(SELECT count(*)::integer FROM forme_r4_public_core.retention_health) AS retention_health_rows
`;

async function proveSeedOnly(pool) {
  const result = await queryRunPool(pool, DURABLE_NON_SEED_COUNT_SQL);
  const row = result.rows?.[0];
  if (result.rowCount !== 1 || row?.durable_rows !== 0 || row?.installation_rows !== 1 || row?.retention_health_rows !== 1) {
    fail("local_postgres_seed_state_invalid");
  }
}

async function proveNamespaceAbsent(pool) {
  const result = await queryRunPool(pool, "SELECT to_regnamespace('forme_r4_public_core') IS NULL AS absent");
  if (result.rowCount !== 1 || result.rows?.[0]?.absent !== true) fail("local_postgres_rollback_incomplete");
}

async function applyAndVerifySql(pool, sql) {
  await executeRunSql(pool, sql.schema);
  await executeRunSql(pool, sql.verify);
  return await proveCatalog(pool);
}

async function createRollbackDatabase(driver, connection, databaseName) {
  const admin = createRunPool(driver, { ...connection, database: "postgres" });
  try {
    if (!/^forme_r4_local_[0-9a-f]{16}_b$/u.test(databaseName)) fail("local_postgres_database_identity_invalid");
    await queryRunPool(admin, `CREATE DATABASE "${databaseName}"`);
  } finally {
    await closeRunPool(admin);
  }
}

function fixtureBytes(domain) {
  return crypto.createHash("sha256").update(`${WIRING_PACKET_SHA256}\0${domain}`, "utf8").digest();
}

function createDeterministicIdentityPort() {
  const authority = fixtureBytes("local-postgres-identity-v1");
  const secrets = new Map();
  const roomId = `room_${crypto.createHash("sha256").update(`${WIRING_PACKET_SHA256}\0local-postgres-room-id-v1`).digest("hex").slice(0, 32)}`;
  function digest(domain, input) {
    return crypto.createHmac("sha256", authority).update(domain, "utf8").update("\0", "utf8")
      .update(canonicalJson(ownedPlain(input)), "utf8").digest();
  }
  const port = Object.freeze({
    deriveId(input) {
      const stable = ownedPlain(input);
      const prefix = stable.prefix;
      if (typeof prefix !== "string" || !/^[a-z][a-z0-9_]{0,31}$/u.test(prefix)) fail("local_postgres_fixture_identity_invalid");
      if (prefix === "room") return roomId;
      return `${prefix}_${digest("id", stable).toString("hex").slice(0, 32)}`;
    },
    deriveSecret(input) {
      const stable = ownedPlain(input);
      const kind = stable.kind;
      if (typeof kind !== "string" || !/^[a-z][a-z0-9_]{0,31}$/u.test(kind)) fail("local_postgres_fixture_identity_invalid");
      const secret = `${kind}_${digest("secret", stable).toString("base64url")}`;
      secrets.set(kind, secret);
      return secret;
    },
    deriveNonce(input) {
      return Uint8Array.from(digest("nonce", ownedPlain(input)).subarray(0, 12));
    },
  });
  return Object.freeze({
    port,
    roomId,
    takeSecret(kind) {
      const value = secrets.get(kind);
      if (typeof value !== "string") fail("local_postgres_fixture_secret_unavailable");
      return value;
    },
    close() {
      authority.fill(0);
      secrets.clear();
    },
  });
}

function createProjectionCapsule(canonicalSha256, roomId, entityId, observedAt) {
  const publishedAt = new Date(observedAt).toISOString();
  const freshUntil = new Date(observedAt + 3 * 24 * 60 * 60 * 1_000).toISOString();
  const expiresAt = new Date(observedAt + 6 * 24 * 60 * 60 * 1_000).toISOString();
  const preimage = Object.freeze({
    schemaVersion: "projection_capsule.v1",
    projectionId: `proj_${crypto.createHash("sha256").update(`${roomId}\0projection`).digest("hex").slice(0, 32)}`,
    roomId,
    entityId,
    title: "Forme Local PostgreSQL Rehearsal",
    thirdPlaceSummary: "A synthetic, bounded local proof of the durable Public Core.",
    claims: Object.freeze([
      Object.freeze({ slot: "becoming", text: "A local PostgreSQL bridge is under review.", attribution: "owner_confirmed", uncertainty: null }),
      Object.freeze({ slot: "now", text: "Only synthetic local bytes are used.", attribution: "owner_confirmed", uncertainty: null }),
      Object.freeze({ slot: "nextMove", text: "Stop before Gate C activation.", attribution: "inferred_allowed", uncertainty: "Production authority remains absent." }),
      Object.freeze({ slot: "tensions", text: "Durability must not widen authority.", attribution: "unresolved_allowed", uncertainty: null }),
      Object.freeze({ slot: "openTo", text: "One bounded synthetic public encounter.", attribution: "owner_confirmed", uncertainty: null }),
    ]),
    supportedInteractions: Object.freeze(["ask", "seed", "resonance"]),
    allowedTopics: Object.freeze(["R4 local rehearsal"]),
    unavailableTopics: Object.freeze(["private data", "production credentials"]),
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "This synthetic Projection may carry one bounded local request.",
    nonCommitmentStatement: "This Projection cannot commit the Owner.",
    disclosureBasisId: `basis_${crypto.createHash("sha256").update(`${roomId}\0basis`).digest("hex").slice(0, 32)}`,
    publicationAttestationId: `att_${crypto.createHash("sha256").update(`${roomId}\0attestation`).digest("hex").slice(0, 32)}`,
    publishedAt,
    freshUntil,
    expiresAt,
  });
  return Object.freeze({ ...preimage, payloadHash: canonicalSha256(preimage) });
}

async function createApplicationGraph(pool, observedAt) {
  const [executorModule, postgresModule, bridgeModule, applicationModule, cryptoModule, protocolModule] = await Promise.all([
    import("../apps/room/src/public-core-pg-executor.ts"),
    import("../apps/room/src/public-core-postgres.ts"),
    import("../apps/room/src/public-core-postgres-application-store.ts"),
    import("../apps/room/src/public-core-application.ts"),
    import("../apps/room/src/public-core-crypto.ts"),
    import("../packages/r4-protocol/src/index.ts"),
  ]);
  const bodyMaterial = fixtureBytes("local-postgres-body-key-v1");
  const pepperMaterial = fixtureBytes("local-postgres-capability-pepper-v1");
  const publicationMaterial = fixtureBytes("local-postgres-publication-verifier-v1");
  const identity = createDeterministicIdentityPort();
  const roomId = identity.roomId;
  let bodyEncryptionKey;
  let capabilityPepperKey;
  const closedMaterial = {
    bodyEncryptionKey: false,
    capabilityPepperKey: false,
    identity: false,
    bodyMaterial: false,
    pepperMaterial: false,
    publicationMaterial: false,
  };
  function closeAllMaterial() {
    let failed = false;
    for (const [name, operation] of [
      ["bodyEncryptionKey", () => bodyEncryptionKey?.close()],
      ["capabilityPepperKey", () => capabilityPepperKey?.close()],
      ["identity", () => identity.close()],
      ["bodyMaterial", () => bodyMaterial.fill(0)],
      ["pepperMaterial", () => pepperMaterial.fill(0)],
      ["publicationMaterial", () => publicationMaterial.fill(0)],
    ]) {
      if (closedMaterial[name]) continue;
      try {
        operation();
        closedMaterial[name] = true;
      } catch {
        failed = true;
      }
    }
    if (failed) fail("local_postgres_application_graph_cleanup_failed");
  }
  try {
    bodyEncryptionKey = new cryptoModule.PublicCoreCryptoKeyHandleV1({
      purpose: "body_encryption",
      reference: `ref:body-encryption/local-postgres@${WIRING_PACKET_SHA256}`,
      material: bodyMaterial,
    });
    capabilityPepperKey = new cryptoModule.PublicCoreCryptoKeyHandleV1({
      purpose: "capability_pepper",
      reference: `ref:capability-pepper/local-postgres@${WIRING_PACKET_SHA256}`,
      material: pepperMaterial,
    });
    const executor = executorModule.createPublicCorePgExecutorV1({ pool });
    const postgresStore = new postgresModule.PublicCorePostgresStoreV1(executor);
    const publicationVerifier = Object.freeze(function verifyPublication(input) {
      const stable = ownedPlain(input);
      const frame = crypto.createHmac("sha256", publicationMaterial).update(canonicalJson(stable), "utf8").digest("hex");
      return Object.freeze({
        basisHash: protocolModule.canonicalSha256({ projectionPayloadHash: stable.projection?.payloadHash, domain: "basis" }),
        projectionPolicyHash: protocolModule.canonicalSha256({ projectionPayloadHash: stable.projection?.payloadHash, domain: "policy" }),
        publicationApprovalId: `approval_${frame.slice(0, 32)}`,
      });
    });
    const bridge = bridgeModule.createPublicCorePostgresApplicationStoreV1({
      postgresStore,
      roomId,
      bodyEncryptionKey,
      capabilityPepperKey,
      now: () => new Date(observedAt).toISOString(),
      identity: identity.port,
      publicationVerifier,
    });
    const application = new applicationModule.PublicCoreApplicationV1(bridge);
    return Object.freeze({
      application,
      roomId,
      observedAt,
      identity,
      canonicalSha256: protocolModule.canonicalSha256,
      close: closeAllMaterial,
    });
  } catch (error) {
    try { closeAllMaterial(); } catch { /* the original sanitized failure wins */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_application_graph_failed");
  }
}

function closeApplicationGraph(graph) {
  if (graph === null) return true;
  try {
    graph.close();
    return true;
  } catch {
    return false;
  }
}

const SYNTHETIC_ACTOR_CLASS = Object.freeze({
  "third_place.list": "public",
  "projection.read": "public",
  "public_encounter.issue": "public",
  "interaction.create": "guest_capability",
  "interaction.read": "guest_capability",
  "interaction.delete": "guest_capability",
  "room.pair.exchange": "public",
  "room.create": "controller",
  "room.pair": "controller",
  "room.binding.revoke": "controller",
  "room.mode.set": "controller",
  "projection.revoke": "controller",
  "curation.admit": "curator",
  "curation.unlist": "curator",
  "room_operator.status": "room_operator",
  "room_operator.sync": "room_operator",
  "room_operator.pull": "room_operator",
  "room_operator.ack": "room_operator",
  "room_operator.projection.deliver": "room_operator",
  "room_operator.local_purge.receipt": "room_operator",
});

async function runSyntheticWalkingFlow(graph, replayInput = null, progress = null) {
  if (replayInput !== null) {
    const replay = await graph.application.run(replayInput);
    if (replay.status !== 200 || replay.recovered !== true
      || replay.body?.interaction?.interactionType !== "ask"
      || typeof replay.body?.requestBody !== "string") {
      fail("local_postgres_restart_replay_failed");
    }
    return Object.freeze({ replayInput, replayBodyHash: graph.canonicalSha256(replay.body) });
  }
  const actorScopeDigest = graph.canonicalSha256("local postgres synthetic actor scope");
  let serial = 0;
  async function call(action, overrides = Object.freeze({})) {
    serial += 1;
    const stableOverrides = ownedPlain(overrides);
    const mutating = !["third_place.list", "projection.read", "interaction.read", "room_operator.status"].includes(action);
    const base = {
      schemaVersion: "r4_public_core_operation_input.v1",
      action,
      actorClass: SYNTHETIC_ACTOR_CLASS[action],
      actorScopeDigest,
      params: Object.freeze({}),
      body: Object.freeze({}),
      authorizationSecret: null,
      idempotencyKey: mutating ? `idem_${serial.toString(36).padStart(32, "0")}` : null,
      expectedVersion: null,
      ...stableOverrides,
    };
    const trusted = Object.freeze({
      schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
      coarseRateBucket: action === "public_encounter.issue" ? `bucket_${"b".repeat(32)}` : null,
    });
    const response = await graph.application.run(Object.freeze(base), trusted);
    if (!Number.isSafeInteger(response?.status) || response.status < 200 || response.status > 299) {
      fail("local_postgres_action_failed");
    }
    if (progress !== null) {
      progress.completedActions.add(action);
      progress.actionCount = progress.completedActions.size;
    }
    return response;
  }
  const entityId = "entity_forme_public_core_v1";
  const created = await call("room.create", { body: { entityId, roomKind: "third_place_public", label: "Forme Local PostgreSQL Room" } });
  if (created.body.roomId !== graph.roomId || created.body.roomMode !== "closed") fail("local_postgres_room_bootstrap_invalid");
  const pair = await call("room.pair", { params: { roomId: graph.roomId }, expectedVersion: 1 });
  const exchanged = await call("room.pair.exchange", {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "synthetic-local-postgres-client-public-key" },
    expectedVersion: 1,
  });
  const bindingSecret = graph.identity.takeSecret("binding_secret");
  const projection = createProjectionCapsule(graph.canonicalSha256, graph.roomId, entityId, graph.observedAt);
  const delivered = await call("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bindingSecret,
    body: {
      projection,
      publicationApprovalHash: graph.canonicalSha256("local approval"),
      publicationAttestationHash: graph.canonicalSha256("local attestation"),
    },
    expectedVersion: 1,
  });
  const admitted = await call("curation.admit", {
    actorClass: "curator", params: { projectionId: projection.projectionId }, expectedVersion: delivered.body.targetVersion,
  });
  const beforeOpen = await call("room_operator.status", {
    actorClass: "room_operator", authorizationSecret: bindingSecret, body: { roomId: graph.roomId },
  });
  const bindingVersion = beforeOpen.body.bindingVersion;
  await call("room.mode.set", {
    params: { roomId: graph.roomId }, body: { interactionMode: "public_single" }, expectedVersion: beforeOpen.body.roomVersion,
  });
  await call("third_place.list");
  await call("projection.read", { params: { projectionId: projection.projectionId } });
  const encounterSecret = `encounter_secret_${"e".repeat(32)}`;
  await call("public_encounter.issue", {
    params: { projectionId: projection.projectionId }, body: { encounterSecret }, expectedVersion: admitted.body.targetVersion,
  });
  const replySecret = `reply_secret_${"r".repeat(32)}`;
  const deleteSecret = `delete_secret_${"d".repeat(32)}`;
  const interaction = await call("interaction.create", {
    actorClass: "guest_capability",
    authorizationSecret: encounterSecret,
    body: {
      projectionId: projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Synthetic local PostgreSQL request body.",
      guestCapsule: null,
      replySecret,
      deleteSecret,
    },
  });
  await call("interaction.read", {
    actorClass: "guest_capability", authorizationSecret: replySecret, params: { interactionId: interaction.body.targetId },
  });
  const sync = await call("room_operator.sync", {
    actorClass: "room_operator", authorizationSecret: bindingSecret, body: { roomId: graph.roomId, afterSequence: 0 },
  });
  const pullKey = `idem_${(++serial).toString(36).padStart(32, "0")}`;
  const pullInput = Object.freeze({
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.pull",
    actorClass: "room_operator",
    actorScopeDigest,
    params: Object.freeze({ interactionId: interaction.body.targetId }),
    body: Object.freeze({}),
    authorizationSecret: bindingSecret,
    idempotencyKey: pullKey,
    expectedVersion: 1,
  });
  const pulled = await graph.application.run(pullInput);
  if (pulled.status !== 200 || pulled.body.interaction?.interactionType !== "ask") fail("local_postgres_pull_invalid");
  if (progress !== null) {
    progress.completedActions.add("room_operator.pull");
    progress.actionCount = progress.completedActions.size;
  }
  const firstEvent = sync.body.events?.[0];
  if (!firstEvent) fail("local_postgres_sync_invalid");
  await call("room_operator.ack", {
    actorClass: "room_operator",
    authorizationSecret: bindingSecret,
    body: { roomId: graph.roomId, eventId: firstEvent.eventId, sequence: firstEvent.sequence, eventHash: firstEvent.eventHash },
  });
  return Object.freeze({
    replayInput: pullInput,
    roomId: graph.roomId,
    projectionId: projection.projectionId,
    interactionId: interaction.body.targetId,
    pullBodyHash: graph.canonicalSha256(pulled.body),
    actorScopeDigest,
    bindingSecret,
    bindingId: exchanged.body.bindingId,
    bindingVersion,
    deleteSecret,
    admittedProjectionVersion: admitted.body.targetVersion,
  });
}

async function runSyntheticClosureFlow(graph, flow, progress) {
  let serial = 0;
  async function call(action, overrides) {
    serial += 1;
    const base = Object.freeze({
      schemaVersion: "r4_public_core_operation_input.v1",
      action,
      actorClass: SYNTHETIC_ACTOR_CLASS[action],
      actorScopeDigest: flow.actorScopeDigest,
      params: Object.freeze({}),
      body: Object.freeze({}),
      authorizationSecret: null,
      idempotencyKey: `idem_closure_${serial.toString(36).padStart(24, "0")}`,
      expectedVersion: null,
      ...ownedPlain(overrides),
    });
  const response = await graph.application.run(base);
    if (!Number.isSafeInteger(response?.status) || response.status < 200 || response.status > 299) {
      fail("local_postgres_action_failed");
    }
    progress.completedActions.add(action);
    progress.actionCount = progress.completedActions.size;
    return response;
  }
  await call("room_operator.local_purge.receipt", {
    actorClass: "room_operator", authorizationSecret: flow.bindingSecret,
    params: { interactionId: flow.interactionId }, body: { localBytesAbsent: true }, expectedVersion: 2,
  });
  await call("interaction.delete", {
    actorClass: "guest_capability", authorizationSecret: flow.deleteSecret,
    params: { interactionId: flow.interactionId }, expectedVersion: 3,
  });
  const status = await graph.application.run(Object.freeze({
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.status",
    actorClass: "room_operator",
    actorScopeDigest: flow.actorScopeDigest,
    params: Object.freeze({}),
    body: Object.freeze({ roomId: flow.roomId }),
    authorizationSecret: flow.bindingSecret,
    idempotencyKey: null,
    expectedVersion: null,
  }));
  if (!Number.isSafeInteger(status?.status) || status.status < 200 || status.status > 299) {
    fail("local_postgres_action_failed");
  }
  progress.completedActions.add("room_operator.status");
  progress.actionCount = progress.completedActions.size;
  await call("room.mode.set", {
    params: { roomId: flow.roomId }, body: { interactionMode: "closed" }, expectedVersion: status.body.roomVersion,
  });
  const unlisted = await call("curation.unlist", {
    actorClass: "curator", params: { projectionId: flow.projectionId }, expectedVersion: flow.admittedProjectionVersion,
  });
  await call("projection.revoke", {
    params: { projectionId: flow.projectionId }, expectedVersion: unlisted.body.targetVersion,
  });
  await call("room.binding.revoke", {
    params: { bindingId: flow.bindingId }, expectedVersion: flow.bindingVersion,
  });
}

function readJournalState(privateRoot) {
  try {
    const directoryPath = journalDirectory(privateRoot, false);
    if (directoryPath === null) {
      return { sequence: 0, lastSha256: JOURNAL_GENESIS, dockerLifecycleCount: 0, cleanupProven: false, totalBytes: 0 };
    }
    const names = fs.readdirSync(directoryPath).sort(binaryCompare);
    const finalPattern = /^entry-([0-9]{6})\.json$/u;
    const pendingPattern = /^entry-([0-9]{6})\.pending-[0-9a-f]{32}\.json$/u;
    const finals = [];
    let removedPending = false;
    for (const name of names) {
      const candidate = path.join(directoryPath, name);
      if (pendingPattern.test(name)) {
        removePrivateFile(candidate);
        removedPending = true;
      } else if (finalPattern.test(name)) finals.push(name);
      else fail("local_postgres_journal_invalid");
    }
    if (removedPending) fsyncPrivateDirectory(directoryPath);
    if (finals.length > JOURNAL_MAXIMUM_ENTRIES) fail("local_postgres_journal_invalid");
    let previousSha256 = JOURNAL_GENESIS;
    let sequence = 0;
    let dockerLifecycleCount = 0;
    let cleanupProven = false;
    let totalBytes = 0;
    for (const name of finals) {
      const match = finalPattern.exec(name);
      if (match === null || Number(match[1]) !== sequence + 1) fail("local_postgres_journal_invalid");
      const entryPath = path.join(directoryPath, name);
      const stat = fs.lstatSync(entryPath, { bigint: true });
      if (stat.size < 1n || stat.size > 65_536n) fail("local_postgres_journal_invalid");
      totalBytes += Number(stat.size);
      if (totalBytes > JOURNAL_TOTAL_MAXIMUM_BYTES) fail("local_postgres_journal_invalid");
      const entry = ownedPlain(readPrivateJson(entryPath));
      exactKeys(entry, ["schemaVersion", "sequence", "previousSha256", "event", "detail", "entrySha256"]);
      if (entry.schemaVersion !== "r4.public-core-local-postgres-journal-entry.v2"
        || entry.sequence !== sequence + 1 || entry.previousSha256 !== previousSha256
        || typeof entry.event !== "string" || !JOURNAL_EVENTS.has(entry.event) || cleanupProven) {
        fail("local_postgres_journal_invalid");
      }
      validateJournalDetail(entry.event, entry.detail);
      const preimage = Object.freeze({
        schemaVersion: entry.schemaVersion,
        sequence: entry.sequence,
        previousSha256: entry.previousSha256,
        event: entry.event,
        detail: entry.detail,
      });
      const expected = sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8"));
      if (entry.entrySha256 !== expected) fail("local_postgres_journal_invalid");
      if (entry.event === "docker.lifecycle_started") {
        dockerLifecycleCount += 1;
        if (entry.detail.ordinal !== dockerLifecycleCount || dockerLifecycleCount > 3
          || (dockerLifecycleCount > 1 && entry.detail.mode !== "cleanup_recovery")) {
          fail("local_postgres_journal_invalid");
        }
      }
      if (entry.event === "cleanup.proven" || entry.event === "cleanup.recovered") cleanupProven = true;
      sequence = entry.sequence;
      previousSha256 = expected;
    }
    return { sequence, lastSha256: previousSha256, dockerLifecycleCount, cleanupProven, totalBytes };
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_journal_invalid");
  }
}

function ensureIsolatedDockerHome(privateRoot) {
  const isolatedHome = privatePath(privateRoot, "docker-home");
  const dockerConfig = privatePath(privateRoot, "docker-config");
  if (!fs.existsSync(isolatedHome) && !fs.existsSync(dockerConfig)) return prepareIsolatedDockerHome(privateRoot);
  try {
    assertPrivateDirectory(isolatedHome);
    assertPrivateDirectory(dockerConfig);
    const config = ownedPlain(readPrivateJson(path.join(dockerConfig, "config.json")));
    exactKeys(config, ["auths"]);
    if (config.auths === null || typeof config.auths !== "object"
      || Object.keys(config.auths).length !== 0) fail("local_postgres_docker_home_invalid");
    return Object.freeze({ isolatedHome, dockerConfig });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_docker_home_invalid");
  }
}

function cleanupOwnedDocker(docker, plan, journalState, privateRoot) {
  let failed = false;
  function attempt(operation) {
    try { return operation(); } catch { failed = true; return null; }
  }
  const container = attempt(() => inspectOwnedResource(docker, plan, "container.inspect"));
  if (container !== null) {
    if (container.State?.Running === true) {
      const stopped = attempt(() => docker.call("container.stop", planStep(plan, "container.stop").argv));
      if (stopped !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "container.stopped"));
    }
    const removed = attempt(() => docker.call("container.rm", planStep(plan, "container.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "container.removed"));
  }
  const network = attempt(() => inspectOwnedResource(docker, plan, "network.inspect"));
  if (network !== null) {
    const removed = attempt(() => docker.call("network.rm", planStep(plan, "network.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "network.removed"));
  }
  const volume = attempt(() => inspectOwnedResource(docker, plan, "volume.inspect"));
  if (volume !== null) {
    const removed = attempt(() => docker.call("volume.rm", planStep(plan, "volume.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "volume.removed"));
  }
  for (const kind of ["container.inspect", "network.inspect", "volume.inspect"]) {
    const observed = attempt(() => inspectOwnedResource(docker, plan, kind));
    if (observed !== null) failed = true;
  }
  if (failed) fail("local_postgres_cleanup_unproven");
}

function completeOwnedCleanup(docker, plan, journalState, privateRoot, recovered) {
  let failed = false;
  try { cleanupOwnedDocker(docker, plan, journalState, privateRoot); } catch { failed = true; }
  try { removePrivateFile(privatePath(privateRoot, "postgres-password")); } catch { failed = true; }
  try { cleanupIsolatedDockerHome(privateRoot); } catch { failed = true; }
  try { removeOwnedPrivateTree(privatePath(privateRoot, "pg-runtime")); } catch { failed = true; }
  if (!failed) {
    try {
      appendPrivateJournal(privateRoot, journalState, recovered ? "cleanup.recovered" : "cleanup.proven", { residueCount: 0 });
    } catch {
      failed = true;
    }
  }
  if (failed) fail("local_postgres_cleanup_unproven");
}

function consumedGrantForCleanup(privateRoot, verifyBindings = verifyLocalPostgresCommittedBindings) {
  const consumedPath = privatePath(privateRoot, "grant.consumed.json");
  const record = readPrivateJsonRecord(consumedPath);
  const raw = ownedPlain(record.value);
  const createdAt = instant(raw.createdAt);
  const grant = validateLocalPostgresGrant(raw, new Date(createdAt + 1));
  verifyBindings(grant, new Date(createdAt + 1));
  return Object.freeze({ grant, consumedGrantSha256: record.sha256 });
}

function exactPhysicalEvidencePath(privateRoot, evidenceOut) {
  if (typeof evidenceOut !== "string" || !path.isAbsolute(evidenceOut)
    || path.basename(evidenceOut) !== "physical-evidence.json") {
    fail("local_postgres_evidence_path_invalid");
  }
  let parent;
  try { parent = fs.realpathSync(path.dirname(evidenceOut)); } catch { fail("local_postgres_evidence_path_invalid"); }
  if (parent !== privateRoot) fail("local_postgres_evidence_path_invalid");
  return path.join(privateRoot, "physical-evidence.json");
}

function preparePhysicalEvidenceWrite(evidencePath, cleanupOnly) {
  try {
    fs.lstatSync(evidencePath);
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") {
      return Object.freeze({ priorEvidenceSha256: null, priorConsumedGrantSha256: null, exclusive: true });
    }
    fail("local_postgres_evidence_path_invalid");
  }
  if (!cleanupOnly) fail("local_postgres_evidence_path_invalid");
  const prior = ownedPlain(readPrivateJson(evidencePath));
  if (prior.schemaVersion !== "r4.public-core-local-postgres-physical-result.v2"
    || prior.status !== "FAILED" || prior.cleanupStatus !== "BLOCKED"
    || typeof prior.consumedGrantSha256 !== "string" || !SHA256.test(prior.consumedGrantSha256)) {
    fail("local_postgres_evidence_path_invalid");
  }
  return Object.freeze({
    priorEvidenceSha256: sha256File(evidencePath),
    priorConsumedGrantSha256: prior.consumedGrantSha256,
    exclusive: false,
  });
}

export const LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES = Object.freeze([
  "docker.verify", "resources.absence", "image.ensure", "network.create", "volume.create",
  "container.create", "container.start", "primary.open", "primary.schema", "primary.walk",
  "primary.close", "container.restart", "replay.open", "replay.run", "replay.close",
  "rollback_database.create", "rollback.open", "rollback.run", "rollback.close",
]);

async function executePhysicalLifecycle(ports, progress) {
  await ports.verifyDocker();
  await ports.proveResourceAbsence();
  const image = await ports.ensurePinnedImage();
  progress.imagePulled = image.pulled;
  progress.imagePresent = image.present;
  await ports.createNetwork();
  await ports.createVolume();
  await ports.createContainer();
  await ports.startContainer();

  let flow;
  try {
    await ports.openPrimary();
    progress.databaseIdentityCount = 1;
    progress.catalog = await ports.applyPrimarySchema();
    flow = await ports.runWalkingFlow(progress);
  } finally {
    await ports.closePrimary();
  }

  await ports.restartContainer();
  progress.restartCount = 1;
  try {
    await ports.openReplay();
    await ports.runReplayAndClosure(flow, progress);
  } finally {
    await ports.closeReplay();
  }

  await ports.createRollbackDatabase();
  progress.databaseIdentityCount = 2;
  try {
    await ports.openRollback();
    await ports.runRollbackRehearsal();
  } finally {
    await ports.closeRollback();
  }
  return Object.freeze({
    imagePulled: progress.imagePulled,
    catalog: progress.catalog,
    actionCount: progress.actionCount,
    databaseIdentityCount: progress.databaseIdentityCount,
    restartCount: progress.restartCount,
  });
}

function createRealPhysicalLifecyclePorts(context, injectedDependencies = null) {
  const { grant, docker, plan, journalState, privateRoot, password, progress, pgRuntimeRoot } = context;
  const dependencies = injectedDependencies ?? Object.freeze({
    loadPgDriver,
    waitForPostgres,
    readSqlArtifact,
    createRunPool,
    closeRunPool,
    applyAndVerifySql,
    createApplicationGraph,
    closeApplicationGraph,
    runSyntheticWalkingFlow,
    runSyntheticClosureFlow,
    createRollbackDatabase,
    proveSeedOnly,
    executeRunSql,
    proveNamespaceAbsent,
  });
  let driver = null;
  let primaryConnection = null;
  let rollbackConnection = null;
  let sql = null;
  let pool = null;
  let graph = null;
  let flow = null;
  let imagePulled = false;

  async function closeGraphAndPool() {
    let failed = false;
    if (graph !== null) {
      try {
        if (dependencies.closeApplicationGraph(graph)) graph = null;
        else failed = true;
      } catch {
        failed = true;
      }
    }
    if (pool !== null) {
      try {
        await dependencies.closeRunPool(pool);
        pool = null;
      } catch {
        failed = true;
      }
    }
    if (failed) fail("local_postgres_application_graph_cleanup_failed");
  }

  return Object.freeze({
    async verifyDocker() {
      const version = docker.call("version", planStep(plan, "version").argv);
      validateDockerVersion(version);
      appendPrivateJournal(privateRoot, journalState, "docker.version_verified");
    },
    async proveResourceAbsence() {
      proveOwnedResourceAbsent(docker, plan, "container.inspect");
      proveOwnedResourceAbsent(docker, plan, "network.inspect");
      proveOwnedResourceAbsent(docker, plan, "volume.inspect");
      appendPrivateJournal(privateRoot, journalState, "resources.absence_verified");
    },
    async ensurePinnedImage() {
      let image = docker.call("image.inspect", planStep(plan, "image.inspect").argv, { missingAllowed: true });
      if (!image.found) {
        imagePulled = true;
        progress.imagePullAttempted = true;
        progress.imagePulled = null;
        appendPrivateJournal(privateRoot, journalState, "image.pull_attempted", { referenceSha256: sha256Bytes(Buffer.from(IMAGE_REFERENCE)) });
        docker.call("image.pull", planStep(plan, "image.pull").argv);
        appendPrivateJournal(privateRoot, journalState, "image.pulled", { referenceSha256: sha256Bytes(Buffer.from(IMAGE_REFERENCE)) });
        image = docker.call("image.inspect", planStep(plan, "image.inspect").argv);
      }
      validatePinnedImage(image);
      progress.imagePresent = true;
      progress.imagePulled = imagePulled;
      appendPrivateJournal(privateRoot, journalState, "image.verified", { platformManifest: IMAGE_PLATFORM_MANIFEST });
      return Object.freeze({ pulled: imagePulled, present: true });
    },
    async createNetwork() {
      docker.call("network.create", planStep(plan, "network.create").argv);
      appendPrivateJournal(privateRoot, journalState, "network.created");
    },
    async createVolume() {
      docker.call("volume.create", planStep(plan, "volume.create").argv);
      appendPrivateJournal(privateRoot, journalState, "volume.created");
    },
    async createContainer() {
      docker.call("container.create", planStep(plan, "container.create").argv);
      appendPrivateJournal(privateRoot, journalState, "container.created");
    },
    async startContainer() {
      progress.databaseIdentityAttemptCount = 1;
      docker.call("container.start", planStep(plan, "container.start").argv);
      appendPrivateJournal(privateRoot, journalState, "container.started", { lifecycle: 1 });
      const container = inspectOwnedResource(docker, plan, "container.inspect");
      if (container?.State?.Running !== true) fail("local_postgres_container_not_running");
      const port = containerLoopbackPort(container, plan);
      driver = await dependencies.loadPgDriver(pgRuntimeRoot);
      primaryConnection = Object.freeze({ database: plan.resources.databasePrimary, password, port });
      rollbackConnection = Object.freeze({ database: plan.resources.databaseRollback, password, port });
      sql = Object.freeze({
        schema: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.schema, grant.schemaSqlSha256),
        verify: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.verify, grant.verifySqlSha256),
        rollback: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.rollback, grant.rollbackSqlSha256),
      });
    },
    async openPrimary() {
      await dependencies.waitForPostgres(driver, primaryConnection);
      pool = dependencies.createRunPool(driver, primaryConnection);
    },
    async applyPrimarySchema() {
      const catalog = await dependencies.applyAndVerifySql(pool, sql);
      appendPrivateJournal(privateRoot, journalState, "primary.schema_verified", { catalog });
      return catalog;
    },
    async runWalkingFlow(progress) {
      graph = await dependencies.createApplicationGraph(pool, Date.now());
      flow = await dependencies.runSyntheticWalkingFlow(graph, null, progress);
      appendPrivateJournal(privateRoot, journalState, "primary.walking_flow_green", { actionCount: progress.actionCount });
      return flow;
    },
    closePrimary: closeGraphAndPool,
    async restartContainer() {
      docker.call("container.stop", planStep(plan, "container.stop").argv);
      appendPrivateJournal(privateRoot, journalState, "container.stopped", { lifecycle: 1 });
      progress.restartAttemptCount = 1;
      docker.call("container.start", planStep(plan, "container.start").argv);
      appendPrivateJournal(privateRoot, journalState, "container.started", { lifecycle: 2 });
      await dependencies.waitForPostgres(driver, primaryConnection);
    },
    async openReplay() {
      pool = dependencies.createRunPool(driver, primaryConnection);
      graph = await dependencies.createApplicationGraph(pool, Date.now());
    },
    async runReplayAndClosure(expectedFlow, progress) {
      if (expectedFlow !== flow) fail("local_postgres_restart_replay_failed");
      const replay = await dependencies.runSyntheticWalkingFlow(graph, flow.replayInput);
      if (replay.replayBodyHash !== flow.pullBodyHash) fail("local_postgres_restart_replay_failed");
      appendPrivateJournal(privateRoot, journalState, "primary.restart_replay_green");
      await dependencies.runSyntheticClosureFlow(graph, flow, progress);
      appendPrivateJournal(privateRoot, journalState, "primary.closure_flow_green", { actionCount: progress.actionCount });
    },
    closeReplay: closeGraphAndPool,
    async createRollbackDatabase() {
      progress.databaseIdentityAttemptCount = 2;
      await dependencies.createRollbackDatabase(driver, primaryConnection, plan.resources.databaseRollback);
      appendPrivateJournal(privateRoot, journalState, "rollback_database.created", { identityCount: 2 });
    },
    async openRollback() {
      pool = dependencies.createRunPool(driver, rollbackConnection);
    },
    async runRollbackRehearsal() {
      await dependencies.applyAndVerifySql(pool, sql);
      await dependencies.proveSeedOnly(pool);
      await dependencies.executeRunSql(pool, sql.rollback);
      await dependencies.proveNamespaceAbsent(pool);
      await dependencies.applyAndVerifySql(pool, sql);
      await dependencies.proveSeedOnly(pool);
      appendPrivateJournal(privateRoot, journalState, "rollback_database.rehearsal_green");
    },
    closeRollback: closeGraphAndPool,
    closeOutstanding: closeGraphAndPool,
  });
}

async function performNormalPhysicalRun(context) {
  const ports = createRealPhysicalLifecyclePorts(context);
  try {
    return await executePhysicalLifecycle(ports, context.progress);
  } finally {
    await ports.closeOutstanding();
  }
}

function assertPhysicalTerminalResult(result, progress) {
  const stable = ownedPlain(result);
  exactKeys(stable, ["imagePulled", "catalog", "actionCount", "databaseIdentityCount", "restartCount"]);
  const expectedActions = Object.keys(SYNTHETIC_ACTOR_CLASS).sort(binaryCompare);
  const completedActions = [...progress.completedActions].sort(binaryCompare);
  if (progress.imagePresent !== true || typeof progress.imagePulled !== "boolean"
    || progress.imagePullAttempted !== progress.imagePulled
    || progress.databaseIdentityAttemptCount !== 2 || progress.databaseIdentityCount !== 2
    || progress.restartAttemptCount !== 1 || progress.restartCount !== 1
    || progress.actionCount !== 20 || completedActions.length !== expectedActions.length
    || completedActions.some((action, index) => action !== expectedActions[index])
    || stable.imagePulled !== progress.imagePulled
    || stable.actionCount !== progress.actionCount
    || stable.databaseIdentityCount !== progress.databaseIdentityCount
    || stable.restartCount !== progress.restartCount
    || canonicalJson(stable.catalog) !== canonicalJson(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog)) {
    fail("local_postgres_terminal_evidence_invalid");
  }
}

const PHASE1_FAKE_SOCKET_IDENTITY_SHA256 = sha256Bytes(Buffer.from("forme-r4-phase1-fake-socket-v1", "utf8"));

function phase1FakeGrant(now) {
  const createdAt = new Date(now - 60_000).toISOString();
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v2",
    grantId: "0123456789abcdef0123456789abcdef",
    ownerApprovalSha256: sha256Bytes(Buffer.from("phase1-fake-owner-approval")),
    addendumSha256: ADDENDUM_SHA256,
    addendumReviewSha256: ADDENDUM_REVIEW_SHA256,
    addendumWrapperHead: ADDENDUM_WRAPPER_HEAD,
    addendumWrapperTree: ADDENDUM_WRAPPER_TREE,
    physicalRebindPacketSha256: sha256Bytes(Buffer.from("phase1-fake-rebind-packet")),
    physicalRebindReviewSha256: sha256Bytes(Buffer.from("phase1-fake-rebind-review")),
    physicalRebindBaselineHead: "1".repeat(40),
    physicalRebindBaselineTree: "2".repeat(40),
    physicalRebindWrapperHead: "3".repeat(40),
    physicalRebindWrapperTree: "4".repeat(40),
    stageAHead: "5".repeat(40),
    stageATree: "6".repeat(40),
    stageAArtifactAggregateSha256: sha256Bytes(Buffer.from("phase1-fake-stage-a")),
    packageLockSha256: PACKAGE_LOCK_SHA256,
    runnerSha256: sha256Bytes(Buffer.from("phase1-fake-runner")),
    schemaSqlSha256: sha256Bytes(Buffer.from("phase1-fake-schema")),
    verifySqlSha256: sha256Bytes(Buffer.from("phase1-fake-verify")),
    rollbackSqlSha256: sha256Bytes(Buffer.from("phase1-fake-rollback")),
    socketIdentitySha256: PHASE1_FAKE_SOCKET_IDENTITY_SHA256,
    imageReference: IMAGE_REFERENCE,
    maximumPhysicalAttempts: 1,
    maximumDockerLifecycles: 3,
    localOnly: true,
    productionEffectsAllowed: false,
    createdAt,
    expiresAt: new Date(now + 60 * 60_000).toISOString(),
  });
}

function createPhase1FakeController(input, observeCheckpoint = null) {
  const faultAt = input.faultAt ?? null;
  const faultEdge = input.faultEdge ?? "after";
  const faultOccurrence = input.faultOccurrence ?? 1;
  if (faultAt !== null && (typeof faultAt !== "string" || !/^[a-z][a-z0-9_.-]{0,95}$/u.test(faultAt))) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (faultEdge !== "before" && faultEdge !== "after") fail("local_postgres_fake_fault_invalid");
  if (!Number.isSafeInteger(faultOccurrence) || faultOccurrence < 1 || faultOccurrence > 512) {
    fail("local_postgres_fake_fault_invalid");
  }
  const checkpoints = [];
  let cleanupMode = false;
  let faultInjected = false;
  let faultInjectionCount = 0;
  let requestedOccurrenceCount = 0;
  let faultInjectionOccurrence = null;
  return Object.freeze({
    checkpoints,
    get faultInjected() { return faultInjected; },
    get faultInjectionCount() { return faultInjectionCount; },
    get faultInjectionOccurrence() { return faultInjectionOccurrence; },
    checkpoint(name, edge = "after") {
      checkpoints.push(`${name}:${edge}`);
      observeCheckpoint?.(name, edge);
      if (faultAt === name && faultEdge === edge) requestedOccurrenceCount += 1;
      if (!faultInjected && faultAt === name && faultEdge === edge && requestedOccurrenceCount === faultOccurrence) {
        faultInjected = true;
        faultInjectionCount += 1;
        faultInjectionOccurrence ??= requestedOccurrenceCount;
        fail("local_postgres_fake_injected_fault");
      }
    },
    enterCleanup() { cleanupMode = true; },
    dockerCheckpoint(kind, edge) {
      const prefix = cleanupMode ? "cleanup" : "docker";
      this.checkpoint(`${prefix}.${kind}`, edge);
    },
  });
}

function createPhase1FakeDockerPort(plan, state, controller) {
  function resourceRecord(kind) {
    const labels = { [plan.resources.labelKey]: plan.resources.labelValue };
    if (kind === "container.inspect") {
      return {
        Config: { Labels: labels },
        State: { Running: state.containerRunning },
        NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } },
      };
    }
    return { Labels: labels };
  }
  return Object.freeze({
    call(kind, argv, options = Object.freeze({})) {
      const stableOptions = ownedPlain(options);
      if (Object.keys(stableOptions).some((key) => key !== "missingAllowed")) fail("local_postgres_input_invalid");
      approvedDockerArgv(plan, kind, argv);
      controller.dockerCheckpoint(kind, "before");
      state.simulatedDockerPortCalls += 1;
      let found = true;
      let stdout = "";
      if (kind === "version") {
        stdout = canonicalJson({ Client: { Version: "29.3.1" }, Server: { Version: "29.3.1", Os: "linux", Arch: "arm64" } });
      } else if (kind === "image.inspect") {
        found = state.imagePresent;
        if (found) stdout = canonicalJson({
          Os: "linux",
          Architecture: "arm64",
          RepoDigests: [IMAGE_REFERENCE],
          Descriptor: { digest: IMAGE_PLATFORM_MANIFEST, platform: { os: "linux", architecture: "arm64" } },
        });
      } else if (kind === "image.pull") {
        state.imagePresent = true;
      } else if (kind === "network.inspect") {
        found = state.network;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "network.create") {
        if (state.network) fail("local_postgres_fake_port_invalid");
        state.network = true;
      } else if (kind === "network.rm") {
        if (!state.network) fail("local_postgres_fake_port_invalid");
        state.network = false;
      } else if (kind === "volume.inspect") {
        found = state.volume;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "volume.create") {
        if (state.volume) fail("local_postgres_fake_port_invalid");
        state.volume = true;
      } else if (kind === "volume.rm") {
        if (!state.volume) fail("local_postgres_fake_port_invalid");
        state.volume = false;
      } else if (kind === "container.inspect") {
        found = state.container;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "container.create") {
        if (state.container || !state.network || !state.volume) fail("local_postgres_fake_port_invalid");
        state.container = true;
        state.containerRunning = false;
      } else if (kind === "container.start") {
        if (!state.container) fail("local_postgres_fake_port_invalid");
        state.containerRunning = true;
      } else if (kind === "container.stop") {
        if (!state.container || !state.containerRunning) fail("local_postgres_fake_port_invalid");
        state.containerRunning = false;
      } else if (kind === "container.rm") {
        if (!state.container || state.containerRunning) fail("local_postgres_fake_port_invalid");
        state.container = false;
      } else {
        fail("local_postgres_fake_port_invalid");
      }
      controller.dockerCheckpoint(kind, "after");
      if (!found) {
        if (stableOptions.missingAllowed !== true) fail("local_postgres_fake_port_invalid");
        return Object.freeze({ found: false, stdout: "" });
      }
      return Object.freeze({ found: true, stdout });
    },
  });
}

function createPhase1FakeApplicationGraph(shared) {
  const roomId = "room_0123456789abcdef0123456789abcdef";
  const graphId = `graph-${shared.graphOpens + 1}`;
  shared.graphOpens += 1;
  shared.openGraphs.add(graphId);
  let closed = false;
  return Object.freeze({
    roomId,
    observedAt: Date.parse("2026-08-11T18:00:00.000Z"),
    canonicalSha256(value) { return sha256Bytes(Buffer.from(canonicalJson(value), "utf8")); },
    identity: Object.freeze({ takeSecret(kind) {
      if (kind !== "binding_secret") fail("local_postgres_fake_graph_invalid");
      return `binding_secret_${"b".repeat(32)}`;
    } }),
    application: Object.freeze({
      async run(input) {
        const action = input?.action;
        if (typeof action !== "string" || !(action in SYNTHETIC_ACTOR_CLASS)) fail("local_postgres_fake_graph_invalid");
        shared.actions.push(action);
        const body = (() => {
          if (action === "room.create") return { roomId, roomMode: "closed" };
          if (action === "room.pair") return { pairingId: `pairing_${"1".repeat(32)}`, pairingCode: "pairing-code-local" };
          if (action === "room.pair.exchange") return { bindingId: `binding_${"2".repeat(32)}`, version: 2 };
          if (action === "room_operator.projection.deliver") return { targetVersion: 1 };
          if (action === "curation.admit") return { targetVersion: 2 };
          if (action === "room_operator.status") {
            shared.statusReads += 1;
            return { bindingVersion: 1, roomVersion: shared.statusReads === 1 ? 1 : 2 };
          }
          if (action === "interaction.create") return { targetId: `interaction_${"3".repeat(32)}` };
          if (action === "room_operator.sync") return { events: [{ eventId: `event_${"4".repeat(32)}`, sequence: 1, eventHash: `sha256:${"5".repeat(64)}` }] };
          if (action === "room_operator.pull") return {
            interaction: { interactionType: "ask" },
            requestBody: "Synthetic local PostgreSQL request body.",
          };
          if (action === "curation.unlist") return { targetVersion: 3 };
          return { targetVersion: 1 };
        })();
        const recoveryKey = action === "room_operator.pull" ? input.idempotencyKey : null;
        const recovered = recoveryKey !== null && shared.pullKeys.has(recoveryKey);
        if (recoveryKey !== null) shared.pullKeys.add(recoveryKey);
        return Object.freeze({ status: 200, recovered, body: Object.freeze(body) });
      },
    }),
    close() {
      if (closed) return;
      closed = true;
      shared.graphCloses += 1;
      shared.openGraphs.delete(graphId);
    },
  });
}

function createPhase1FakeDependencies(shared, controller) {
  return Object.freeze({
    async loadPgDriver(runtimeRoot) {
      shared.pgDriverLoads += 1;
      const driver = await loadPgDriver(runtimeRoot);
      shared.pgDriverResolved = true;
      return driver;
    },
    async waitForPostgres() { shared.pgReadinessChecks += 1; },
    readSqlArtifact(artifactPath) { shared.sqlArtifactReads.push(artifactPath); return `-- ${artifactPath}`; },
    createRunPool() {
      shared.poolOpens += 1;
      const poolId = `pool-${shared.poolOpens}`;
      shared.openPools.add(poolId);
      return Object.freeze({
        poolId,
        connect() {
          shared.realApplicationGraphCanaryConnects += 1;
          throw new Error("PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY");
        },
      });
    },
    async closeRunPool(pool) {
      if (pool === null || typeof pool !== "object" || typeof pool.poolId !== "string"
        || !shared.openPools.delete(pool.poolId)) fail("local_postgres_fake_pool_invalid");
      shared.poolCloses += 1;
    },
    async applyAndVerifySql() { shared.sqlApplyVerifyRuns += 1; return LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog; },
    async createApplicationGraph(pool, observedAt) {
      const composed = await createApplicationGraph(pool, observedAt);
      shared.realApplicationGraphCompositions += 1;
      const canaryConnectsBefore = shared.realApplicationGraphCanaryConnects;
      let canaryError = null;
      let unexpectedlyGreen = false;
      try {
        await composed.application.run(Object.freeze({
          schemaVersion: "r4_public_core_operation_input.v1",
          action: "room.create",
          actorClass: "controller",
          actorScopeDigest: composed.canonicalSha256("real graph error canary"),
          params: Object.freeze({}),
          body: Object.freeze({
            entityId: "entity_forme_public_core_v1",
            roomKind: "third_place_public",
            label: "Real graph error canary",
          }),
          authorizationSecret: null,
          idempotencyKey: `idem_${"c".repeat(32)}`,
          expectedVersion: null,
        }));
        unexpectedlyGreen = true;
      } catch (error) {
        canaryError = error;
      }
      try {
        if (unexpectedlyGreen) fail("local_postgres_fake_real_graph_canary_unexpected_green");
        if (shared.realApplicationGraphCanaryConnects !== canaryConnectsBefore + 1
          || !(canaryError instanceof Error)
          || canaryError.message === "PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY"
          || JSON.stringify(canaryError).includes("PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY")) {
          fail("local_postgres_fake_real_graph_canary_invalid");
        }
        shared.realApplicationGraphErrorCanaries += 1;
      } finally {
        let closed = false;
        for (let attempt = 0; attempt < 3 && !closed; attempt += 1) closed = closeApplicationGraph(composed);
        if (!closed) {
          shared.retainedRealApplicationGraphs.add(composed);
          fail("local_postgres_fake_real_graph_cleanup_failed");
        }
        shared.realApplicationGraphClosures += 1;
      }
      return createPhase1FakeApplicationGraph(shared);
    },
    closeApplicationGraph(graph) {
      controller.checkpoint("application_graph.close", "before");
      const closed = closeApplicationGraph(graph);
      controller.checkpoint("application_graph.close", "after");
      return closed;
    },
    runSyntheticWalkingFlow,
    runSyntheticClosureFlow,
    async createRollbackDatabase() { shared.rollbackDatabaseCreates += 1; },
    async proveSeedOnly() { shared.seedProofs += 1; },
    async executeRunSql() { shared.rollbackExecutions += 1; },
    async proveNamespaceAbsent() { shared.namespaceAbsenceProofs += 1; },
  });
}

function wrapPhase1FakeLifecyclePorts(ports, controller) {
  const methodByStage = [
    ["verifyDocker", "docker.verify"], ["proveResourceAbsence", "resources.absence"],
    ["ensurePinnedImage", "image.ensure"], ["createNetwork", "network.create"],
    ["createVolume", "volume.create"], ["createContainer", "container.create"],
    ["startContainer", "container.start"], ["openPrimary", "primary.open"],
    ["applyPrimarySchema", "primary.schema"], ["runWalkingFlow", "primary.walk"],
    ["closePrimary", "primary.close"], ["restartContainer", "container.restart"],
    ["openReplay", "replay.open"], ["runReplayAndClosure", "replay.run"],
    ["closeReplay", "replay.close"], ["createRollbackDatabase", "rollback_database.create"],
    ["openRollback", "rollback.open"], ["runRollbackRehearsal", "rollback.run"],
    ["closeRollback", "rollback.close"],
  ];
  return Object.freeze(Object.fromEntries(methodByStage.map(([method, stage]) => [method, async (...args) => {
    controller.checkpoint(stage, "before");
    const result = await ports[method](...args);
    controller.checkpoint(stage, "after");
    return result;
  }])));
}

function createPhase1FakeAdapters(
  controller,
  state,
  shared,
  now,
  leaseOwnerAlive = true,
  recoverCaughtFinalization = true,
) {
  return Object.freeze({
    nowIso: () => new Date(now).toISOString(),
    resolveSocketIdentity() {
      shared.syntheticSocketResolutions += 1;
      return Object.freeze({
        socketPath: "/phase1-fake/no-socket",
        identity: Object.freeze({ phase1Fake: true }),
        identitySha256: PHASE1_FAKE_SOCKET_IDENTITY_SHA256,
      });
    },
    verifyBindings(grant) {
      if (grant.ownerApprovalSha256 !== sha256Bytes(Buffer.from("phase1-fake-owner-approval"))
        || grant.stageAHead !== "5".repeat(40)) fail("local_postgres_fake_binding_invalid");
      return Object.freeze({ phase1Fake: true });
    },
    createDockerPort(_socket, _isolated, plan) {
      return createPhase1FakeDockerPort(plan, state, controller);
    },
    async performRun(context) {
      const dependencies = createPhase1FakeDependencies(shared, controller);
      const realPorts = createRealPhysicalLifecyclePorts(context, dependencies);
      try {
        return await executePhysicalLifecycle(wrapPhase1FakeLifecyclePorts(realPorts, controller), context.progress);
      } finally {
        await realPorts.closeOutstanding();
      }
    },
    enterCleanup() { controller.enterCleanup(); },
    checkpoint(name, edge = "after") { controller.checkpoint(name, edge); },
    syncCheckpoint(name, edge = "after") { controller.checkpoint(name, edge); },
    isProcessAlive(owner) {
      return typeof leaseOwnerAlive === "function" ? leaseOwnerAlive(owner) : leaseOwnerAlive;
    },
    recoverCaughtFinalization,
  });
}

async function executePhase1FakeCoordinator(stable) {
  const now = Date.now();
  const privateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-local-pg-phase1-fake-"));
  fs.chmodSync(privateRoot, 0o700);
  const evidenceOut = path.join(privateRoot, "physical-evidence.json");
  const state = {
    imagePresent: false,
    network: false,
    volume: false,
    container: false,
    containerRunning: false,
    simulatedDockerPortCalls: 0,
  };
  const shared = {
    actions: [],
    pullKeys: new Set(),
    statusReads: 0,
    graphCloses: 0,
    graphOpens: 0,
    realApplicationGraphCompositions: 0,
    realApplicationGraphClosures: 0,
    realApplicationGraphCanaryConnects: 0,
    realApplicationGraphErrorCanaries: 0,
    retainedRealApplicationGraphs: new Set(),
    openGraphs: new Set(),
    pgDriverLoads: 0,
    pgDriverResolved: false,
    pgReadinessChecks: 0,
    sqlArtifactReads: [],
    poolOpens: 0,
    poolCloses: 0,
    openPools: new Set(),
    sqlApplyVerifyRuns: 0,
    rollbackDatabaseCreates: 0,
    seedProofs: 0,
    rollbackExecutions: 0,
    namespaceAbsenceProofs: 0,
    syntheticSocketResolutions: 0,
  };
  let firstReceipt = null;
  let recoveryReceipt = null;
  let firstCode = null;
  let recoveryCode = null;
  let firstFaultInjected = false;
  let recoveryAttempted = false;
  let contenderFailureCode = null;
  let contenderCheckpoints = Object.freeze([]);
  let finalizationContenderObservedCandidate = false;
  let repeatReceipt = null;
  let concurrentRecoveryReceipts = Object.freeze([]);
  let concurrentRecoveryRenameWinnerCount = 0;
  let concurrentRecoveryLoserReadbackCount = 0;
  let concurrentReplacementStagingFaultInjected = false;
  let upstreamSnapshotReconcileObserved = false;
  let reentrantDoorwayObserved = false;
  let reentrantTerminalReadMatched = false;
  let firstCheckpoints = Object.freeze([]);
  let recoveryCheckpoints = Object.freeze([]);
  try {
    createLocalPostgresPendingGrant({ privateRoot, grant: phase1FakeGrant(now) });
    let finalizationContender = null;
    let finalizationContenderController = null;
    const firstControllerInput = stable.concurrentRecovery === true
      ? Object.freeze({ ...stable, faultAt: "lease.release", faultEdge: "before", faultOccurrence: 1 })
      : stable.concurrentReplacementRecovery === true || stable.upstreamSnapshotReplacementRecovery === true
        ? Object.freeze({ ...stable, faultAt: "cleanup.container.rm", faultEdge: "before", faultOccurrence: 1 })
        : stable;
    const firstController = createPhase1FakeController(firstControllerInput, (name, edge) => {
      if (stable.sameRootFinalizationConcurrency !== true || finalizationContender !== null
        || name !== "evidence.provisional.install" || edge !== "before") return;
      finalizationContenderObservedCandidate = fs.readdirSync(privateRoot)
        .some((leaf) => FINALIZATION_DRAFT.test(leaf));
      finalizationContenderController = createPhase1FakeController(Object.freeze({}));
      finalizationContender = runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(finalizationContenderController, state, shared, now, true),
      ).then(() => null, (error) => error);
    });
    let firstAdapters = createPhase1FakeAdapters(
      firstController, state, shared, now, true, stable.concurrentRecovery !== true,
    );
    let firstRun = null;
    if (stable.reentrantDoorway === true) {
      let releasePriorClear;
      let releasePublished;
      let releaseOwner;
      let markPriorClear;
      let markPublished;
      let markOwnerHeld;
      const priorClear = new Promise((resolve) => { markPriorClear = resolve; });
      const published = new Promise((resolve) => { markPublished = resolve; });
      const ownerHeld = new Promise((resolve) => { markOwnerHeld = resolve; });
      const allowPriorClear = new Promise((resolve) => { releasePriorClear = resolve; });
      const allowPublished = new Promise((resolve) => { releasePublished = resolve; });
      const allowOwner = new Promise((resolve) => { releaseOwner = resolve; });
      const contenderController = createPhase1FakeController(Object.freeze({}));
      const contenderBase = createPhase1FakeAdapters(contenderController, state, shared, now, true);
      const contenderAdapters = Object.freeze({
        ...contenderBase,
        async checkpoint(name, edge = "after") {
          contenderBase.checkpoint(name, edge);
          if (name === "lease.acquire.prior_clear" && edge === "after") {
            markPriorClear();
            await allowPriorClear;
          }
          if (name === "lease.acquire.published" && edge === "after") {
            markPublished();
            await allowPublished;
          }
        },
      });
      const contender = runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut }, contenderAdapters,
      ).then(() => null, (error) => error);
      await priorClear;
      const ownerBase = firstAdapters;
      firstAdapters = Object.freeze({
        ...ownerBase,
        async checkpoint(name, edge = "after") {
          ownerBase.checkpoint(name, edge);
          if (name === "grant.state_observed" && edge === "after") {
            markOwnerHeld();
            await allowOwner;
          }
        },
      });
      firstRun = runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters);
      await ownerHeld;
      releasePriorClear();
      await published;
      releaseOwner();
      const ownerReceipt = await firstRun;
      const doorwayTerminalReceipt = await runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(createPhase1FakeController(Object.freeze({})), state, shared, now, true),
      );
      reentrantTerminalReadMatched = canonicalJson(doorwayTerminalReceipt) === canonicalJson(ownerReceipt);
      releasePublished();
      const contenderError = await contender;
      contenderFailureCode = contenderError === null
        ? "local_postgres_fake_contender_unexpected_green"
        : authenticLocalPostgresRunnerErrorDetails(contenderError)?.code ?? "local_postgres_fake_contender_failed";
      contenderCheckpoints = Object.freeze([...contenderController.checkpoints]);
      reentrantDoorwayObserved = ownerReceipt.status === "GREEN"
        && contenderCheckpoints.includes("lease.acquire.prior_clear:after")
        && contenderCheckpoints.includes("lease.acquire.published:after");
      firstRun = Promise.resolve(ownerReceipt);
    } else if (stable.sameRootConcurrency === true) {
      let markLeaseHeld;
      let resumeLeaseHolder;
      const leaseHeld = new Promise((resolve) => { markLeaseHeld = resolve; });
      const resume = new Promise((resolve) => { resumeLeaseHolder = resolve; });
      const baseAdapters = firstAdapters;
      firstAdapters = Object.freeze({
        ...baseAdapters,
        async checkpoint(name, edge = "after") {
          baseAdapters.checkpoint(name, edge);
          if (name === "grant.state_observed" && edge === "after") {
            markLeaseHeld();
            await resume;
          }
        },
      });
      firstRun = runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters);
      await leaseHeld;
      const contenderController = createPhase1FakeController(Object.freeze({}));
      try {
        await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(contenderController, state, shared, now, true),
        );
      } catch (error) {
        contenderFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_contender_failed";
      } finally {
        contenderCheckpoints = Object.freeze([...contenderController.checkpoints]);
        resumeLeaseHolder();
      }
    }
    try {
      firstReceipt = await (firstRun ?? runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters));
    } catch (error) {
      firstCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_failed";
      try { firstReceipt = ownedPlain(readPrivateJson(evidenceOut)); } catch { firstReceipt = null; }
    } finally {
      firstCheckpoints = Object.freeze([...firstController.checkpoints]);
      firstFaultInjected = firstController.faultInjected;
    }
    if (finalizationContender !== null) {
      try {
        const error = await finalizationContender;
        contenderFailureCode = error === null
          ? "local_postgres_fake_contender_unexpected_green"
          : authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_contender_failed";
      } finally {
        contenderCheckpoints = Object.freeze([...(finalizationContenderController?.checkpoints ?? [])]);
      }
    }
    const deadOwnerNonces = new Set();
    if (firstReceipt?.coordinatorLeaseOwnerNonce !== undefined) {
      deadOwnerNonces.add(firstReceipt.coordinatorLeaseOwnerNonce);
    }
    for (const name of fs.readdirSync(privateRoot)) {
      const leaseMatch = COORDINATOR_LEASE.exec(name);
      if (leaseMatch !== null) deadOwnerNonces.add(leaseMatch[1]);
    }
    try {
      const staged = validateFinalizingReceipt(readPrivateJson(path.join(privateRoot, "physical-evidence.finalizing.json")));
      deadOwnerNonces.add(staged.coordinatorLeaseOwnerNonce);
    } catch { /* no staged receipt */ }
    const recoveryOwnerAlive = (owner) => !deadOwnerNonces.has(owner.ownerNonce);

    async function runReentrantRecoveryPair(recoveredAt) {
      let reentrantRecovery = null;
      const secondController = createPhase1FakeController(Object.freeze({}));
      const firstRecoveryController = createPhase1FakeController(Object.freeze({}), (name, edge) => {
        if (name !== "evidence.publish" || edge !== "before" || reentrantRecovery !== null) return;
        reentrantRecovery = runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(secondController, state, shared, recoveredAt, recoveryOwnerAlive),
        ).then((receipt) => Object.freeze({ receipt, error: null }), (error) => Object.freeze({ receipt: null, error }));
      });
      let firstRecovered = null;
      let pairFailureCode = null;
      try {
        firstRecovered = await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(firstRecoveryController, state, shared, recoveredAt, recoveryOwnerAlive),
        );
      } catch (error) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
      }
      const secondRecovered = reentrantRecovery === null
        ? Object.freeze({ receipt: null, error: new Error("reentrant_recovery_not_entered") })
        : await reentrantRecovery;
      if (secondRecovered.error !== null) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(secondRecovered.error)?.code
          ?? "local_postgres_fake_recovery_failed";
      }
      const receipts = Object.freeze([firstRecovered, secondRecovered.receipt]);
      const checkpoints = Object.freeze([
        ...firstRecoveryController.checkpoints,
        ...secondController.checkpoints,
      ]);
      const renameWinnerCount = checkpoints.filter((value) => value === "evidence.publish:after").length;
      const receiptsMatch = receipts[0] !== null && receipts.every((receipt) => receipt !== null
        && canonicalJson(receipt) === canonicalJson(receipts[0]));
      return Object.freeze({
        receipts,
        receipt: receipts[0] ?? receipts[1] ?? null,
        checkpoints,
        failureCode: pairFailureCode,
        renameWinnerCount,
        loserReadbackCount: receiptsMatch && renameWinnerCount === 1 ? 1 : 0,
      });
    }

    async function runUpstreamSnapshotRecoveryPair(recoveredAt) {
      let publishingRecovery = null;
      const publishingController = createPhase1FakeController(Object.freeze({}));
      const staleSnapshotController = createPhase1FakeController(Object.freeze({}), (name, edge) => {
        if (name !== "evidence.recovery.snapshot" || edge !== "after" || publishingRecovery !== null) return;
        publishingRecovery = runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(publishingController, state, shared, recoveredAt, recoveryOwnerAlive),
        ).then((receipt) => Object.freeze({ receipt, error: null }), (error) => Object.freeze({ receipt: null, error }));
      });
      let staleSnapshotReceipt = null;
      let pairFailureCode = null;
      try {
        staleSnapshotReceipt = await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(staleSnapshotController, state, shared, recoveredAt, recoveryOwnerAlive),
        );
      } catch (error) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
      }
      const published = publishingRecovery === null
        ? Object.freeze({ receipt: null, error: new Error("snapshot_recovery_not_entered") })
        : await publishingRecovery;
      if (published.error !== null) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(published.error)?.code
          ?? "local_postgres_fake_recovery_failed";
      }
      const receipts = Object.freeze([staleSnapshotReceipt, published.receipt]);
      const checkpoints = Object.freeze([
        ...staleSnapshotController.checkpoints,
        ...publishingController.checkpoints,
      ]);
      const renameWinnerCount = checkpoints.filter((value) => value === "evidence.publish:after").length;
      const receiptsMatch = receipts[0] !== null && receipts.every((receipt) => receipt !== null
        && canonicalJson(receipt) === canonicalJson(receipts[0]));
      return Object.freeze({
        receipts,
        receipt: receipts[0] ?? receipts[1] ?? null,
        checkpoints,
        failureCode: pairFailureCode,
        renameWinnerCount,
        loserReadbackCount: receiptsMatch && renameWinnerCount === 1 ? 1 : 0,
        snapshotObserved: staleSnapshotController.checkpoints.includes("evidence.recovery.snapshot:after")
          && !staleSnapshotController.checkpoints.includes("evidence.publish:before"),
      });
    }

    if (stable.concurrentRecovery === true) {
      recoveryAttempted = true;
      const pair = await runReentrantRecoveryPair(now + 1_000);
      concurrentRecoveryReceipts = pair.receipts;
      recoveryReceipt = pair.receipt;
      recoveryCheckpoints = pair.checkpoints;
      recoveryCode = pair.failureCode;
      concurrentRecoveryRenameWinnerCount = pair.renameWinnerCount;
      concurrentRecoveryLoserReadbackCount = pair.loserReadbackCount;
    } else if (stable.concurrentReplacementRecovery === true
      || stable.upstreamSnapshotReplacementRecovery === true) {
      recoveryAttempted = true;
      const stagingController = createPhase1FakeController(Object.freeze({
        faultAt: "evidence.publish",
        faultEdge: "before",
        faultOccurrence: 1,
      }));
      let stagingFailureCode = null;
      try {
        await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(stagingController, state, shared, now + 1_000, recoveryOwnerAlive, false),
        );
      } catch (error) {
        stagingFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code
          ?? "local_postgres_fake_replacement_stage_failed";
      }
      concurrentReplacementStagingFaultInjected = stagingController.faultInjected;
      if (!concurrentReplacementStagingFaultInjected
        || stagingFailureCode !== "local_postgres_fake_injected_fault") {
        fail("local_postgres_fake_replacement_stage_invalid");
      }
      const stagedReplacement = validateFinalizingReceipt(
        readPrivateJson(path.join(privateRoot, "physical-evidence.finalizing.json")),
      );
      deadOwnerNonces.add(stagedReplacement.coordinatorLeaseOwnerNonce);
      const pair = stable.upstreamSnapshotReplacementRecovery === true
        ? await runUpstreamSnapshotRecoveryPair(now + 2_000)
        : await runReentrantRecoveryPair(now + 2_000);
      concurrentRecoveryReceipts = pair.receipts;
      recoveryReceipt = pair.receipt;
      recoveryCheckpoints = Object.freeze([...stagingController.checkpoints, ...pair.checkpoints]);
      recoveryCode = pair.failureCode;
      concurrentRecoveryRenameWinnerCount = pair.renameWinnerCount;
      concurrentRecoveryLoserReadbackCount = pair.loserReadbackCount;
      upstreamSnapshotReconcileObserved = pair.snapshotObserved === true;
    } else if (stable.recoverCleanup === true
      && (firstFaultInjected || firstReceipt === null || firstReceipt.cleanupStatus === "BLOCKED")) {
      recoveryAttempted = true;
      const recoveryController = createPhase1FakeController(Object.freeze({}));
      const recoveryAdapters = createPhase1FakeAdapters(
        recoveryController, state, shared, now + 1_000, recoveryOwnerAlive,
      );
      try {
        recoveryReceipt = await runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, recoveryAdapters);
      } catch (error) {
        recoveryCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
        try { recoveryReceipt = ownedPlain(readPrivateJson(evidenceOut)); } catch { recoveryReceipt = null; }
      } finally {
        recoveryCheckpoints = Object.freeze([...recoveryController.checkpoints]);
      }
    }
    if (stable.repeatTerminalEntry === true && (recoveryReceipt ?? firstReceipt) !== null) {
      repeatReceipt = await runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(createPhase1FakeController(Object.freeze({})), state, shared, now + 2_000, true),
      );
    }
    const finalReceipt = recoveryReceipt ?? firstReceipt;
    const transientNames = fs.readdirSync(privateRoot).filter((name) => (
      name === "postgres-password" || name === "docker-home" || name === "docker-config" || name === "pg-runtime"
      || name === "physical-evidence.finalizing.json"
      || FINALIZATION_DRAFT.test(name)
      || name.startsWith("coordinator-")
    ));
    const residueCount = Number(state.network) + Number(state.volume) + Number(state.container)
      + transientNames.length + shared.openPools.size + shared.openGraphs.size + shared.retainedRealApplicationGraphs.size;
    return Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-fake-result.v3",
      status: finalReceipt?.status ?? "FAILED_NO_RECEIPT",
      code: finalReceipt?.code ?? firstCode ?? "local_postgres_fake_failed",
      cleanupStatus: finalReceipt?.cleanupStatus ?? "NOT_PROVEN",
      receipt: finalReceipt,
      firstReceipt,
      recoveryReceipt,
      actionCount: firstReceipt?.actionCount ?? 0,
      catalog: firstReceipt?.catalog ?? null,
      databaseIdentityCount: firstReceipt?.databaseIdentityCount ?? 0,
      restartCount: firstReceipt?.restartCount ?? 0,
      residueCount,
      transientLocalResidues: Object.freeze(transientNames.sort(binaryCompare)),
      openSyntheticPoolCount: shared.openPools.size,
      openSyntheticGraphCount: shared.openGraphs.size,
      realApplicationGraphCompositions: shared.realApplicationGraphCompositions,
      realApplicationGraphClosures: shared.realApplicationGraphClosures,
      realApplicationGraphCanaryConnects: shared.realApplicationGraphCanaryConnects,
      realApplicationGraphErrorCanaries: shared.realApplicationGraphErrorCanaries,
      retainedRealApplicationGraphCount: shared.retainedRealApplicationGraphs.size,
      physicalEffects: 0,
      requestedFault: stable.faultAt === undefined
        ? null
        : `${stable.faultAt}:${stable.faultEdge ?? "after"}#${stable.faultOccurrence ?? 1}`,
      faultInjected: firstFaultInjected,
      faultInjectionCount: firstController.faultInjectionCount,
      faultInjectionOccurrence: firstController.faultInjectionOccurrence,
      requestedCheckpointOccurrenceCount: stable.faultAt === undefined ? 0 : firstCheckpoints
        .filter((value) => value === `${stable.faultAt}:${stable.faultEdge ?? "after"}`).length,
      firstFailureCode: firstCode,
      recoveryAttempted,
      recoveryFailureCode: recoveryCode,
      sameRootContenderFailureCode: contenderFailureCode,
      sameRootContenderCheckpoints: contenderCheckpoints,
      finalizationContenderObservedCandidate,
      repeatReceipt,
      repeatReceiptMatches: repeatReceipt === null || finalReceipt === null
        ? null
        : canonicalJson(repeatReceipt) === canonicalJson(finalReceipt),
      concurrentRecoveryReceiptCount: concurrentRecoveryReceipts.filter((receipt) => receipt !== null).length,
      concurrentRecoveryReceiptsMatch: concurrentRecoveryReceipts.length === 0
        ? null
        : concurrentRecoveryReceipts.every((receipt) => receipt !== null
          && canonicalJson(receipt) === canonicalJson(concurrentRecoveryReceipts[0])),
      concurrentRecoveryRenameWinnerCount,
      concurrentRecoveryLoserReadbackCount,
      concurrentReplacementStagingFaultInjected,
      upstreamSnapshotReconcileObserved,
      reentrantDoorwayObserved,
      reentrantTerminalReadMatched,
      syntheticPortCalls: Object.freeze({
        socket: shared.syntheticSocketResolutions,
        docker: state.simulatedDockerPortCalls,
        pgDriverLoads: shared.pgDriverLoads,
        pgDriverResolved: shared.pgDriverResolved,
        poolOpens: shared.poolOpens,
      }),
      uniqueActions: Object.freeze([...new Set(shared.actions)].sort(binaryCompare)),
      checkpoints: firstCheckpoints,
      recoveryCheckpoints,
    });
  } finally {
    try { fs.rmSync(privateRoot, { recursive: true, force: true }); } catch { /* temp-only fake teardown */ }
  }
}

export async function runLocalPostgresFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  const allowedKeys = new Set([
    "faultAt", "faultEdge", "faultOccurrence", "recoverCleanup", "sameRootConcurrency", "sameRootFinalizationConcurrency",
    "repeatTerminalEntry", "concurrentRecovery", "concurrentReplacementRecovery", "upstreamSnapshotReplacementRecovery",
    "reentrantDoorway",
  ]);
  if (Object.keys(stable).some((key) => !allowedKeys.has(key))) fail("local_postgres_input_invalid");
  if (stable.recoverCleanup !== undefined && typeof stable.recoverCleanup !== "boolean") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.faultOccurrence !== undefined
    && (!Number.isSafeInteger(stable.faultOccurrence) || stable.faultOccurrence < 1 || stable.faultOccurrence > 512)) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.sameRootConcurrency !== undefined && typeof stable.sameRootConcurrency !== "boolean") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.sameRootFinalizationConcurrency !== undefined
    && typeof stable.sameRootFinalizationConcurrency !== "boolean") fail("local_postgres_fake_fault_invalid");
  for (const key of [
    "repeatTerminalEntry", "concurrentRecovery", "concurrentReplacementRecovery",
    "upstreamSnapshotReplacementRecovery", "reentrantDoorway",
  ]) {
    if (stable[key] !== undefined && typeof stable[key] !== "boolean") fail("local_postgres_fake_fault_invalid");
  }
  return executePhase1FakeCoordinator(stable);
}

export function parseLocalPostgresRunnerArguments(argv) {
  const stable = ownedPlain(argv);
  if (stable.length === 1 && stable[0] === "fake") return Object.freeze({ mode: "fake" });
  if (stable.length === 5 && stable[0] === "physical" && stable[1] === "--grant-root"
    && typeof stable[2] === "string" && path.isAbsolute(stable[2]) && stable[3] === "--evidence-out"
    && typeof stable[4] === "string" && path.isAbsolute(stable[4])) {
    return Object.freeze({ mode: "physical", grantRoot: stable[2], evidenceOut: stable[4] });
  }
  fail("local_postgres_arguments_invalid");
}

/**
 * The physical engine is exported but remains unreachable until a valid v2
 * Physical Rebind wrapper and consumed grant are supplied. Phase 1 tests call
 * only the shared coordinator with private in-memory Docker/PG ports and a
 * synthetic 20-action application port. Each synthetic graph opening also
 * dynamically composes the real application/bridge/store/executor graph and
 * drives one fake-pool connection failure through its real error membrane;
 * this is a composition/error-path canary, not a claim that the 20 actions run
 * through real SQL. No operating-system Docker socket, daemon, PostgreSQL, SQL
 * engine, or network API is touched while constructing or testing these bytes.
 */
async function runLocalPostgresCoordinator(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantRoot", "evidenceOut"]);
  if (typeof stable.grantRoot !== "string" || !path.isAbsolute(stable.grantRoot)) fail("local_postgres_private_root_invalid");
  let privateRoot;
  try {
    privateRoot = fs.realpathSync(stable.grantRoot);
  } catch {
    fail("local_postgres_private_root_invalid");
  }
  assertPrivateDirectory(privateRoot);
  const evidencePath = exactPhysicalEvidencePath(privateRoot, stable.evidenceOut);

  const pendingPath = privatePath(privateRoot, "grant.pending.json");
  const consumedPath = privatePath(privateRoot, "grant.consumed.json");
  let pendingExists = false;
  let consumedExists = false;
  let socket = null;
  let journalState = {
    sequence: 0,
    lastSha256: JOURNAL_GENESIS,
    dockerLifecycleCount: 0,
    cleanupProven: false,
  };
  let isolated = null;
  let pgRuntime = null;
  let secretPath = privatePath(privateRoot, "postgres-password");
  let passwordBytes = null;
  let password = null;
  let grant;
  let consumedGrantSha256;
  let cleanupOnly = false;
  let docker = null;
  let plan = null;
  let result = null;
  const progress = {
    imagePresent: null,
    imagePullAttempted: false,
    imagePulled: false,
    catalog: null,
    actionCount: 0,
    completedActions: new Set(),
    databaseIdentityAttemptCount: 0,
    databaseIdentityCount: 0,
    restartAttemptCount: 0,
    restartCount: 0,
  };
  let failureCode = null;
  let cleanupStatus = "NOT_STARTED";
  let evidenceWrite = Object.freeze({
    priorEvidenceSha256: null,
    priorConsumedGrantSha256: null,
    exclusive: true,
  });
  let evidenceWritable = false;
  let localSetupStarted = false;
  let secretCreatedByThisRun = false;
  let validatedRecoveryState = false;
  let grantConsumptionStarted = false;
  let grantRecoveryRequired = false;

  try {
    pendingExists = fs.existsSync(pendingPath);
    consumedExists = fs.existsSync(consumedPath);
    cleanupOnly = consumedExists;
    if (pendingExists && consumedExists) {
      try {
        const pendingStat = fs.lstatSync(pendingPath, { bigint: true });
        const consumedStat = fs.lstatSync(consumedPath, { bigint: true });
        if (!pendingStat.isFile() || !consumedStat.isFile() || pendingStat.dev !== consumedStat.dev
          || pendingStat.ino !== consumedStat.ino || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) {
          fail("local_postgres_grant_state_invalid");
        }
        fs.unlinkSync(pendingPath);
        fsyncPrivateDirectory(privateRoot);
        if (fs.lstatSync(consumedPath, { bigint: true }).nlink !== 1n) fail("local_postgres_grant_state_invalid");
        pendingExists = false;
        consumedExists = true;
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
        fail("local_postgres_grant_state_invalid");
      }
    }
    if (pendingExists === consumedExists) fail("local_postgres_grant_state_invalid");
    evidenceWrite = preparePhysicalEvidenceWrite(evidencePath, consumedExists);
    evidenceWritable = evidenceWrite.exclusive;
    await adapters.checkpoint("grant.state_observed");
    journalState = readJournalState(privateRoot);
    journalState.checkpoint = adapters.syncCheckpoint;
    await adapters.checkpoint("journal.loaded");
    if (consumedExists) {
      ({ grant, consumedGrantSha256 } = consumedGrantForCleanup(privateRoot, adapters.verifyBindings));
      if (evidenceWrite.priorConsumedGrantSha256 !== null
        && evidenceWrite.priorConsumedGrantSha256 !== consumedGrantSha256) {
        fail("local_postgres_evidence_path_invalid");
      }
      evidenceWritable = true;
      validatedRecoveryState = true;
      if (!journalState.cleanupProven) {
        socket = adapters.resolveSocketIdentity();
        await adapters.checkpoint("socket.resolved");
      }
    } else {
      socket = adapters.resolveSocketIdentity();
      await adapters.checkpoint("socket.resolved");
      const pendingGrant = validateLocalPostgresGrant(readPrivateJson(pendingPath));
      if (pendingGrant.socketIdentitySha256 !== socket.identitySha256) fail("local_postgres_socket_identity_drift");
      grant = pendingGrant;
      grantConsumptionStarted = true;
      ({ grant, consumedGrantSha256 } = await consumeLocalPostgresGrantWithVerifier(
        { privateRoot, now: adapters.nowIso() }, adapters.verifyBindings, adapters.checkpoint,
      ));
      appendPrivateJournal(privateRoot, journalState, "grant.consumed", { consumedGrantSha256 });
      validatedRecoveryState = true;
      await adapters.checkpoint("grant.consumed");
      localSetupStarted = true;
      isolated = ensureIsolatedDockerHome(privateRoot);
      exactFileAbsence(secretPath);
      passwordBytes = Buffer.from(crypto.randomBytes(32).toString("base64url"), "utf8");
      password = passwordBytes.toString("utf8");
      secretCreatedByThisRun = true;
      writePrivateBytes(secretPath, passwordBytes);
      await adapters.checkpoint("secret.written");
      pgRuntime = preparePgImportClosure(privateRoot);
      await adapters.checkpoint("pg_runtime.prepared");
    }
    if (socket !== null && grant.socketIdentitySha256 !== socket.identitySha256) fail("local_postgres_socket_identity_drift");
    if (!validatedRecoveryState) fail("local_postgres_grant_state_invalid");
    if (journalState.cleanupProven) {
      if (!cleanupOnly) fail("local_postgres_journal_invalid");
      exactFileAbsence(secretPath);
      exactFileAbsence(privatePath(privateRoot, "docker-home"));
      exactFileAbsence(privatePath(privateRoot, "docker-config"));
      exactFileAbsence(privatePath(privateRoot, "pg-runtime"));
      cleanupStatus = "PROVEN_ABSENT";
      result = Object.freeze({
        imagePulled: false,
        catalog: null,
        actionCount: 0,
        databaseIdentityCount: 0,
        restartCount: 0,
      });
    } else {
      if ((!cleanupOnly && journalState.dockerLifecycleCount !== 0)
        || journalState.dockerLifecycleCount >= grant.maximumDockerLifecycles) {
        fail("local_postgres_docker_lifecycle_limit");
      }
      isolated ??= cleanupOnly ? ensureCleanupDockerHome(privateRoot) : ensureIsolatedDockerHome(privateRoot);
      plan = buildLocalPostgresDockerPlan({ grantId: grant.grantId, secretMountSource: secretPath });
      appendPrivateJournal(privateRoot, journalState, "docker.lifecycle_started", {
        mode: cleanupOnly ? "cleanup_recovery" : "construction",
        ordinal: journalState.dockerLifecycleCount + 1,
      });
      docker = adapters.createDockerPort(socket, isolated, plan, privateRoot);
      await adapters.checkpoint("docker.port_created");

      if (cleanupOnly) {
        adapters.enterCleanup();
        completeOwnedCleanup(docker, plan, journalState, privateRoot, true);
        cleanupStatus = "PROVEN_ABSENT";
        result = Object.freeze({
          imagePulled: false,
          catalog: null,
          actionCount: 0,
          databaseIdentityCount: 0,
          restartCount: 0,
        });
      } else {
        result = await adapters.performRun({
          grant, docker, plan, journalState, privateRoot, password, progress,
          pgRuntimeRoot: pgRuntime?.runtimeRoot ?? null,
        });
        assertPhysicalTerminalResult(result, progress);
        await adapters.checkpoint("lifecycle.completed");
      }
    }
  } catch (error) {
    const details = error !== null && (typeof error === "object" || typeof error === "function")
      ? ERROR_DETAILS.get(error) : null;
    failureCode = details?.code ?? "local_postgres_physical_failed";
  } finally {
    passwordBytes?.fill(0);
    password = null;
    if (grantConsumptionStarted && consumedGrantSha256 === undefined) {
      try {
        const observed = probeGrantConsumptionState(privateRoot);
        if (observed.state === "consumed" || observed.state === "both_links") {
          consumedGrantSha256 = observed.consumedGrantSha256;
          grantRecoveryRequired = true;
        }
      } catch {
        grantRecoveryRequired = true;
      }
    }
    if (grantRecoveryRequired) {
      cleanupStatus = "BLOCKED";
      failureCode ??= "local_postgres_grant_recovery_required";
    } else if (!cleanupOnly && docker !== null && plan !== null) {
      try {
        adapters.enterCleanup();
        completeOwnedCleanup(docker, plan, journalState, privateRoot, false);
        cleanupStatus = "PROVEN_ABSENT";
        await adapters.checkpoint("cleanup.completed");
      } catch {
        cleanupStatus = "BLOCKED";
        failureCode ??= "local_postgres_cleanup_blocked";
      }
    } else if (!cleanupOnly && docker === null) {
      try {
        if (secretCreatedByThisRun) removePrivateFile(secretPath);
        if (localSetupStarted) cleanupIsolatedDockerHome(privateRoot);
        if (localSetupStarted) removeOwnedPrivateTree(privatePath(privateRoot, "pg-runtime"));
        cleanupStatus = "PROVEN_NO_DOCKER_ENTRY";
      } catch {
        cleanupStatus = "BLOCKED";
        failureCode ??= "local_postgres_cleanup_blocked";
      }
    } else if (cleanupOnly && cleanupStatus !== "PROVEN_ABSENT") {
      cleanupStatus = "BLOCKED";
      failureCode ??= "local_postgres_cleanup_blocked";
    }
  }

  const status = failureCode === null && cleanupStatus === "PROVEN_ABSENT"
    ? (cleanupOnly ? "CLEANUP_RECOVERED" : "GREEN")
    : "FAILED";
  const receipt = canonicalRunnerReceipt({
    status,
    code: failureCode ?? (cleanupOnly ? "local_postgres_cleanup_recovered" : "local_postgres_physical_green"),
    cleanupStatus,
    priorEvidenceSha256: evidenceWrite.priorEvidenceSha256,
    consumedGrantSha256: consumedGrantSha256 ?? null,
    stageAHead: grant?.stageAHead ?? null,
    stageATree: grant?.stageATree ?? null,
    stageAArtifactAggregateSha256: grant?.stageAArtifactAggregateSha256 ?? null,
    packageLockSha256: grant?.packageLockSha256 ?? null,
    pgImportClosureSha256: pgRuntime?.aggregateSha256 ?? null,
    schemaSqlSha256: grant?.schemaSqlSha256 ?? null,
    verifySqlSha256: grant?.verifySqlSha256 ?? null,
    rollbackSqlSha256: grant?.rollbackSqlSha256 ?? null,
    socketIdentitySha256: grant?.socketIdentitySha256 ?? socket?.identitySha256 ?? null,
    imageReference: IMAGE_REFERENCE,
    imagePullAttempted: cleanupOnly ? null : progress.imagePullAttempted,
    imagePulled: cleanupOnly ? null : progress.imagePulled,
    imageCacheRetained: cleanupOnly ? null : progress.imagePresent,
    catalog: cleanupOnly ? null : progress.catalog,
    actionCount: cleanupOnly ? null : progress.actionCount,
    databaseIdentityAttemptCount: cleanupOnly ? null : progress.databaseIdentityAttemptCount,
    databaseIdentityCount: cleanupOnly ? null : progress.databaseIdentityCount,
    restartAttemptCount: cleanupOnly ? null : progress.restartAttemptCount,
    restartCount: cleanupOnly ? null : progress.restartCount,
    ownedContainerCount: cleanupStatus === "PROVEN_ABSENT" ? 0 : null,
    ownedNetworkCount: cleanupStatus === "PROVEN_ABSENT" ? 0 : null,
    ownedVolumeCount: cleanupStatus === "PROVEN_ABSENT" ? 0 : null,
    ownedCredentialCount: cleanupStatus === "PROVEN_ABSENT" || cleanupStatus === "PROVEN_NO_DOCKER_ENTRY" ? 0 : null,
    journalEntryCount: journalState.sequence,
    journalHeadSha256: journalState.lastSha256,
    productRuntimeEffects: false,
    trafficReady: false,
    gateCReady: false,
  });
  return Object.freeze({
    receipt,
    evidencePath,
    evidenceWrite,
    evidenceWritable,
    terminalFailureCode: status === "FAILED" ? (failureCode ?? "local_postgres_physical_failed") : null,
  });
}

const FINAL_RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "status", "code", "cleanupStatus", "priorEvidenceSha256", "consumedGrantSha256",
  "stageAHead", "stageATree", "stageAArtifactAggregateSha256", "packageLockSha256",
  "pgImportClosureSha256", "schemaSqlSha256", "verifySqlSha256", "rollbackSqlSha256",
  "socketIdentitySha256", "imageReference", "imagePullAttempted", "imagePulled", "imageCacheRetained",
  "catalog", "actionCount", "databaseIdentityAttemptCount", "databaseIdentityCount",
  "restartAttemptCount", "restartCount", "ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount",
  "ownedCredentialCount", "journalEntryCount", "journalHeadSha256", "productRuntimeEffects", "trafficReady",
  "gateCReady", "coordinatorLeaseOwnerSha256", "coordinatorLeaseOwnerNonce", "coordinatorOwnerPid",
  "coordinatorOwnerProcessStartIdentity", "coordinatorLeaseReleased", "coordinatorResidueScope",
  "ownedCoordinatorResidueCount",
]);

function finalizingReceipt(baseReceipt, lease) {
  const stable = ownedPlain(baseReceipt);
  const { schemaVersion, ...fields } = stable;
  if (schemaVersion !== "r4.public-core-local-postgres-physical-result.v2") fail("local_postgres_evidence_path_invalid");
  return canonicalRunnerReceipt({
    ...fields,
    coordinatorLeaseOwnerSha256: sha256Bytes(Buffer.from(lease.ownerNonce, "utf8")),
    coordinatorLeaseOwnerNonce: lease.owner.ownerNonce,
    coordinatorOwnerPid: lease.owner.pid,
    coordinatorOwnerProcessStartIdentity: lease.owner.processStartIdentity,
    coordinatorLeaseReleased: true,
    coordinatorResidueScope: "finalizing_owner_only",
    ownedCoordinatorResidueCount: 0,
  });
}

function validateFinalizingReceipt(raw) {
  const receipt = ownedPlain(raw);
  exactKeys(receipt, FINAL_RECEIPT_KEYS);
  if (receipt.schemaVersion !== "r4.public-core-local-postgres-physical-result.v2"
    || (receipt.status !== "GREEN" && receipt.status !== "CLEANUP_RECOVERED" && receipt.status !== "FAILED")
    || typeof receipt.code !== "string" || !/^local_postgres_[a-z0-9_]{1,95}$/u.test(receipt.code)
    || (receipt.cleanupStatus !== "PROVEN_ABSENT" && receipt.cleanupStatus !== "PROVEN_NO_DOCKER_ENTRY"
      && receipt.cleanupStatus !== "BLOCKED" && receipt.cleanupStatus !== "NOT_STARTED")
    || (receipt.priorEvidenceSha256 !== null && !SHA256.test(receipt.priorEvidenceSha256))
    || (receipt.consumedGrantSha256 !== null && !SHA256.test(receipt.consumedGrantSha256))
    || !SHA256.test(receipt.coordinatorLeaseOwnerSha256)
    || typeof receipt.coordinatorLeaseOwnerNonce !== "string"
    || !/^[0-9a-f]{64}$/u.test(receipt.coordinatorLeaseOwnerNonce)
    || receipt.coordinatorLeaseOwnerSha256 !== sha256Bytes(Buffer.from(receipt.coordinatorLeaseOwnerNonce, "utf8"))
    || !Number.isSafeInteger(receipt.coordinatorOwnerPid) || receipt.coordinatorOwnerPid < 1
    || !SHA256.test(receipt.coordinatorOwnerProcessStartIdentity)
    || receipt.coordinatorLeaseReleased !== true
    || receipt.coordinatorResidueScope !== "finalizing_owner_only"
    || receipt.ownedCoordinatorResidueCount !== 0 || receipt.productRuntimeEffects !== false
    || receipt.trafficReady !== false || receipt.gateCReady !== false || receipt.imageReference !== IMAGE_REFERENCE
    || !Number.isSafeInteger(receipt.journalEntryCount) || receipt.journalEntryCount < 0
    || !SHA256.test(receipt.journalHeadSha256)) fail("local_postgres_evidence_path_invalid");
  for (const key of ["imagePullAttempted", "imagePulled", "imageCacheRetained"]) {
    if (receipt[key] !== null && typeof receipt[key] !== "boolean") fail("local_postgres_evidence_path_invalid");
  }
  for (const key of [
    "actionCount", "databaseIdentityAttemptCount", "databaseIdentityCount", "restartAttemptCount", "restartCount",
    "ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "ownedCredentialCount",
  ]) {
    if (receipt[key] !== null && (!Number.isSafeInteger(receipt[key]) || receipt[key] < 0)) {
      fail("local_postgres_evidence_path_invalid");
    }
  }
  if (receipt.catalog !== null && canonicalJson(receipt.catalog) !== canonicalJson(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog)) {
    fail("local_postgres_evidence_path_invalid");
  }
  for (const key of [
    "stageAArtifactAggregateSha256", "packageLockSha256", "pgImportClosureSha256", "schemaSqlSha256",
    "verifySqlSha256", "rollbackSqlSha256", "socketIdentitySha256",
  ]) {
    if (receipt[key] !== null && !SHA256.test(receipt[key])) fail("local_postgres_evidence_path_invalid");
  }
  for (const key of ["stageAHead", "stageATree"]) {
    if (receipt[key] !== null && !GIT_OBJECT.test(receipt[key])) fail("local_postgres_evidence_path_invalid");
  }
  if (receipt.pgImportClosureSha256 !== null && receipt.pgImportClosureSha256 !== PG_IMPORT_CLOSURE_SHA256) {
    fail("local_postgres_evidence_path_invalid");
  }
  return receipt;
}

function finalEvidenceIsTerminal(receipt) {
  return receipt.status === "GREEN" || receipt.status === "CLEANUP_RECOVERED"
    || (receipt.status === "FAILED"
      && (receipt.cleanupStatus === "PROVEN_ABSENT" || receipt.cleanupStatus === "PROVEN_NO_DOCKER_ENTRY"));
}

function reconcileExactPublishedReceipt(evidencePath, provisionalPath, targetReceipt) {
  // A concurrent publisher has completed only when the continuous provisional
  // barrier is gone and the final path contains this exact immutable target.
  exactFileAbsence(provisionalPath);
  const winner = validateFinalizingReceipt(readPrivateJson(evidencePath));
  if (canonicalJson(winner) !== canonicalJson(targetReceipt)) fail("local_postgres_evidence_path_invalid");
  return winner;
}

function publishFinalizingReceipt(privateRoot, evidencePath, provisionalPath, receipt, checkpoint = () => {}) {
  if (coordinatorDirectoryExists(evidencePath) && !coordinatorDirectoryExists(provisionalPath)) {
    return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
  }
  let record;
  try {
    record = readPrivateJsonRecord(provisionalPath);
  } catch (error) {
    if (!coordinatorDirectoryExists(provisionalPath)) {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
    throw error;
  }
  const observed = validateFinalizingReceipt(record.value);
  if (canonicalJson(observed) !== canonicalJson(receipt)) fail("local_postgres_evidence_path_invalid");
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const priorReceipt = validateFinalizingReceipt(prior.value);
    if (prior.sha256 !== receipt.priorEvidenceSha256 || finalEvidenceIsTerminal(priorReceipt)) {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
  } else {
    if (receipt.priorEvidenceSha256 !== null) fail("local_postgres_evidence_path_invalid");
    try {
      exactFileAbsence(evidencePath);
    } catch {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
  }
  try {
    checkpoint("evidence.publish", "before");
    fs.renameSync(provisionalPath, evidencePath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("evidence.publish", "after");
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_evidence_path_invalid");
  }
  const committed = validateFinalizingReceipt(readPrivateJson(evidencePath));
  if (canonicalJson(committed) !== canonicalJson(receipt)) fail("local_postgres_evidence_path_invalid");
}

function receiptCoordinatorOwner(receipt) {
  return Object.freeze({
    pid: receipt.coordinatorOwnerPid,
    processStartIdentity: receipt.coordinatorOwnerProcessStartIdentity,
    ownerNonce: receipt.coordinatorLeaseOwnerNonce,
    createdAt: null,
  });
}

function writeFinalizingReceiptAtomic(
  privateRoot,
  evidencePath,
  provisionalPath,
  receipt,
  lease,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  exactFileAbsence(provisionalPath);
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const priorReceipt = validateFinalizingReceipt(prior.value);
    if (finalEvidenceIsTerminal(priorReceipt) || receipt.priorEvidenceSha256 !== prior.sha256) {
      fail("local_postgres_evidence_path_invalid");
    }
  } else if (receipt.priorEvidenceSha256 !== null) {
    fail("local_postgres_evidence_path_invalid");
  }
  const candidate = privatePath(privateRoot, `physical-evidence-draft-${ownerIdentityFileStem(lease.owner)}.json`);
  try {
    writePrivateJson(candidate, receipt);
    validateFinalizingReceipt(readPrivateJson(candidate));
    checkpoint("evidence.provisional.install", "before");
    fs.renameSync(candidate, provisionalPath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("evidence.provisional.install", "after");
  } catch (error) {
    // A caught failure is still this writer's unique path and is removed
    // blindly; process-crash residue alone relies on filename liveness.
    removeOwnUniquePaths([candidate]);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_evidence_path_invalid");
  }
}

function ownedCoordinatorResidueCount(privateRoot, owner) {
  const ownedNames = new Set([
    `coordinator-lease-${owner.ownerNonce}.json`,
    `coordinator-draft-${ownerIdentityFileStem(owner)}.json`,
    `physical-evidence-draft-${ownerIdentityFileStem(owner)}.json`,
  ]);
  return fs.readdirSync(privateRoot).filter((name) => ownedNames.has(name)).length;
}

function cleanupDeadForeignCoordinatorArtifactsAtTerminal(privateRoot, isAlive = coordinatorLeaseIsAlive) {
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const draft = COORDINATOR_DRAFT.exec(name) ?? FINALIZATION_DRAFT.exec(name);
    if (draft !== null) {
      const owner = ownerIdentityFromFilename(draft);
      try {
        if (!isAlive(owner)) removePrivateFile(privatePath(privateRoot, name));
      } catch { /* terminal exact evidence is authoritative; foreign cleanup is best effort */ }
      continue;
    }
    const lease = COORDINATOR_LEASE.exec(name);
    if (lease === null) continue;
    let owner;
    try { owner = inspectCoordinatorLeaseFile(privatePath(privateRoot, name)); } catch { continue; }
    try {
      if (owner.ownerNonce === lease[1] && !isAlive(owner)) {
        unlinkCoordinatorLeaseFile(privatePath(privateRoot, name), owner.ownerNonce, true);
      }
    } catch { /* terminal exact evidence is authoritative; foreign cleanup is best effort */ }
  }
}

function completeCoordinatorFinalization(
  privateRoot,
  evidencePath,
  allowCurrentOwner,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  const receipt = validateFinalizingReceipt(readPrivateJson(provisionalPath));
  const owner = receiptCoordinatorOwner(receipt);
  if (!allowCurrentOwner && isAlive(owner)) fail("local_postgres_coordinator_active");
  const leasePath = coordinatorLeasePath(privateRoot, owner.ownerNonce);
  if (coordinatorDirectoryExists(leasePath)) {
    try {
      const leaseOwner = inspectCoordinatorLeaseFile(leasePath);
      if (leaseOwner.pid !== owner.pid || leaseOwner.processStartIdentity !== owner.processStartIdentity
        || leaseOwner.ownerNonce !== owner.ownerNonce) fail("local_postgres_coordinator_lock_invalid");
      releaseCoordinatorLease(Object.freeze({ leasePath, owner: leaseOwner }), checkpoint);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
      if (coordinatorDirectoryExists(leasePath)) throw error;
    }
  }
  exactFileAbsence(leasePath);
  discardOwnCoordinatorLease(privateRoot, owner);
  if (ownedCoordinatorResidueCount(privateRoot, owner) !== 0) fail("local_postgres_coordinator_lock_invalid");
  publishFinalizingReceipt(privateRoot, evidencePath, provisionalPath, receipt, checkpoint);
  if (ownedCoordinatorResidueCount(privateRoot, owner) !== receipt.ownedCoordinatorResidueCount) {
    fail("local_postgres_coordinator_lock_invalid");
  }
  return receipt;
}

function terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (coordinatorDirectoryExists(provisionalPath)) return null;
    if (!coordinatorDirectoryExists(evidencePath)) return null;
    const current = validateFinalizingReceipt(readPrivateJson(evidencePath));
    if (coordinatorDirectoryExists(provisionalPath)) continue;
    return finalEvidenceIsTerminal(current) ? current : null;
  }
  fail("local_postgres_evidence_path_invalid");
}

function acceptRecoveredTerminal(privateRoot, receipt, isAlive) {
  cleanupDeadForeignCoordinatorArtifactsAtTerminal(privateRoot, isAlive);
  return receipt;
}

function recoverCoordinatorFinalization(
  privateRoot,
  evidencePath,
  isAlive = coordinatorLeaseIsAlive,
  checkpoint = () => {},
) {
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const committed = validateFinalizingReceipt(prior.value);
    checkpoint("evidence.recovery.snapshot", "after");
    if (coordinatorDirectoryExists(provisionalPath)) {
      let staged;
      try {
        staged = validateFinalizingReceipt(readPrivateJson(provisionalPath));
      } catch (error) {
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
      if (finalEvidenceIsTerminal(committed) || staged.priorEvidenceSha256 !== prior.sha256) {
        fail("local_postgres_evidence_path_invalid");
      }
      try {
        return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
    }
    if (finalEvidenceIsTerminal(committed)) {
      return acceptRecoveredTerminal(privateRoot, committed, isAlive);
    }
    const boundaryWinner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (boundaryWinner !== null) return acceptRecoveredTerminal(privateRoot, boundaryWinner, isAlive);
    if (coordinatorDirectoryExists(provisionalPath)) {
      try {
        return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
    }
    cleanupOwnerNamedDrafts(privateRoot, FINALIZATION_DRAFT, isAlive);
    if (scanLiveCoordinatorLeases(privateRoot, isAlive).length !== 0) fail("local_postgres_coordinator_active");
    const finalWinner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (finalWinner !== null) return acceptRecoveredTerminal(privateRoot, finalWinner, isAlive);
    if (coordinatorDirectoryExists(provisionalPath)) fail("local_postgres_coordinator_active");
    const refreshed = readPrivateJsonRecord(evidencePath);
    const refreshedReceipt = validateFinalizingReceipt(refreshed.value);
    if (finalEvidenceIsTerminal(refreshedReceipt)) {
      return acceptRecoveredTerminal(privateRoot, refreshedReceipt, isAlive);
    }
    if (refreshed.sha256 !== prior.sha256) fail("local_postgres_evidence_path_invalid");
    return null;
  }
  cleanupOwnerNamedDrafts(privateRoot, FINALIZATION_DRAFT, isAlive);
  if (!coordinatorDirectoryExists(provisionalPath)) {
    scanLiveCoordinatorLeases(privateRoot, isAlive);
    const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
    if (coordinatorDirectoryExists(evidencePath) || coordinatorDirectoryExists(provisionalPath)) {
      fail("local_postgres_coordinator_active");
    }
    return null;
  }
  try {
    return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
    const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
    throw error;
  }
}

function stageAndFinalizeCoordinatorOutcome(
  privateRoot,
  evidencePath,
  lease,
  outcome,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  if (outcome.evidenceWritable !== true) fail("local_postgres_evidence_path_invalid");
  const receipt = finalizingReceipt(outcome.receipt, lease);
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  writeFinalizingReceiptAtomic(privateRoot, evidencePath, provisionalPath, receipt, lease, checkpoint, isAlive);
  return completeCoordinatorFinalization(privateRoot, evidencePath, true, checkpoint, isAlive);
}

async function runCoordinatorWithLease(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantRoot", "evidenceOut"]);
  if (typeof stable.grantRoot !== "string" || !path.isAbsolute(stable.grantRoot)) fail("local_postgres_private_root_invalid");
  let privateRoot;
  try { privateRoot = fs.realpathSync(stable.grantRoot); } catch { fail("local_postgres_private_root_invalid"); }
  assertPrivateDirectory(privateRoot);
  const evidencePath = exactPhysicalEvidencePath(privateRoot, stable.evidenceOut);
  const recovered = recoverCoordinatorFinalization(
    privateRoot, evidencePath, adapters.isProcessAlive, adapters.syncCheckpoint,
  );
  if (recovered !== null) {
    if (recovered.status === "FAILED") fail(recovered.code);
    return recovered;
  }
  const lease = await acquireCoordinatorLease(
    privateRoot, evidencePath, adapters.checkpoint, adapters.syncCheckpoint, adapters.isProcessAlive,
  );
  let outcome;
  try {
    outcome = await runLocalPostgresCoordinator(stable, adapters);
  } catch (error) {
    try { releaseCoordinatorLease(lease, adapters.syncCheckpoint); } catch { fail("local_postgres_coordinator_lock_invalid"); }
    throw error;
  }
  if (outcome.evidenceWritable !== true) {
    releaseCoordinatorLease(lease, adapters.syncCheckpoint);
    fail(outcome.terminalFailureCode ?? "local_postgres_evidence_path_invalid");
  }
  let receipt;
  try {
    receipt = stageAndFinalizeCoordinatorOutcome(
      privateRoot, evidencePath, lease, outcome, adapters.syncCheckpoint, adapters.isProcessAlive,
    );
  } catch (error) {
    const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
    if (coordinatorDirectoryExists(provisionalPath)) {
      if (adapters.recoverCaughtFinalization !== false) {
        try {
          completeCoordinatorFinalization(
            privateRoot, evidencePath, true, adapters.syncCheckpoint, adapters.isProcessAlive,
          );
        } catch { /* bounded recovery remains on disk */ }
      }
    } else if (fs.readdirSync(privateRoot).some((name) => FINALIZATION_DRAFT.test(name))) {
      // A live owner keeps both its unique lease and owner-named torn draft;
      // only an exact dead-owner recovery may discard those bytes.
    } else if (coordinatorDirectoryExists(lease.leasePath)) {
      try { releaseCoordinatorLease(lease, adapters.syncCheckpoint); } catch { /* primary sanitized failure wins */ }
    }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
  if (outcome.terminalFailureCode !== null) fail(outcome.terminalFailureCode);
  return receipt;
}

export async function runApprovedLocalPostgresPhysical(input) {
  return runCoordinatorWithLease(input, Object.freeze({
      nowIso: () => new Date().toISOString(),
      resolveSocketIdentity: resolveDockerSocketIdentity,
      verifyBindings: verifyLocalPostgresCommittedBindings,
      createDockerPort,
      performRun: performNormalPhysicalRun,
      enterCleanup() {},
      async checkpoint() {},
      syncCheckpoint() {},
      isProcessAlive: coordinatorLeaseIsAlive,
      recoverCaughtFinalization: true,
  }));
}

async function direct() {
  const parsed = parseLocalPostgresRunnerArguments(process.argv.slice(2));
  if (parsed.mode === "fake") {
    process.stdout.write(`${canonicalJson(await runLocalPostgresFakePlan())}\n`);
    return;
  }
  await runApprovedLocalPostgresPhysical({ grantRoot: parsed.grantRoot, evidenceOut: parsed.evidenceOut });
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  direct().catch((error) => {
    const code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed";
    process.stderr.write(`${canonicalJson({ schemaVersion: "r4.public-core-local-postgres-error.v2", code })}\n`);
    process.exitCode = 1;
  });
}
