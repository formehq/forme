import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  RUN_ID_PATTERN,
  SHA256_PATTERN,
  validateRunID,
} from "./r4-gate-b-preflight.mjs";

const DOCKER_EXECUTABLE = "/usr/local/bin/docker";
const POSTGRES_CONTAINER = "forme-r4-gb-e417836bd67b-pg";
const POSTGRES_VOLUME = "forme-r4-gb-e417836bd67b-pgdata";
const POSTGRES_TEMP_ROOT = "/private/tmp/forme-r4-gb-e417836bd67b";

export class GateBCleanupError extends Error {
  constructor(code) {
    super(code);
    this.name = "GateBCleanupError";
    this.code = code;
  }
}

export const CORE_CLEANUP_ORDER = Object.freeze([
  "commit-cleanup-required",
  "close-pipes-and-reap-process-groups",
  "terminate-helper-and-discard-transient-candidate",
  "remove-synthetic-room-binding",
  "remove-signing-identity-and-custom-keychain",
  "remove-app-codex-schema-auth-and-runtime-bytes",
  "remove-postgres-container-volume-and-workers",
  "verify-global-metadata-and-owned-resource-absence",
  "copy-body-free-summary-and-remove-run-root",
]);

export function validateCoreBodyFreeMarker(value) {
  const expected = [
    "schemaVersion", "runID", "executionManifestSha256", "phase", "cleanupState",
    "dockerContainerOwned", "dockerVolumeOwned", "processGroupIDs", "helperOwned",
    "customKeychainOwned", "syntheticRoomBindingOwned", "terminalCode",
  ].sort();
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("CORE_CLEANUP_MARKER_INVALID");
  const keys = Object.keys(value).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) fail("CORE_CLEANUP_MARKER_INVALID");
  if (value.schemaVersion !== "r4.gate-b-core.run-marker.v1" || !/^r4gbcore-[a-z0-9]{16}$/u.test(value.runID) || !SHA256_PATTERN.test(value.executionManifestSha256)) fail("CORE_CLEANUP_MARKER_INVALID");
  if (!["intent", "active", "cleanup_required", "terminal"].includes(value.phase) || !["not_started", "required", "complete", "uncertain"].includes(value.cleanupState)) fail("CORE_CLEANUP_MARKER_INVALID");
  for (const key of ["dockerContainerOwned", "dockerVolumeOwned", "helperOwned", "customKeychainOwned", "syntheticRoomBindingOwned"]) if (typeof value[key] !== "boolean") fail("CORE_CLEANUP_MARKER_INVALID");
  if (!Array.isArray(value.processGroupIDs) || value.processGroupIDs.some((pid) => !Number.isSafeInteger(pid) || pid <= 0)) fail("CORE_CLEANUP_MARKER_INVALID");
  if (value.terminalCode !== null && (typeof value.terminalCode !== "string" || !/^[A-Z][A-Z0-9_]{2,127}$/u.test(value.terminalCode))) fail("CORE_CLEANUP_MARKER_INVALID");
  const serialized = JSON.stringify(value);
  if (/(?:candidateHash|responseText|request|prompt|transcript|sourcePath|environment|password|privateKey|credential|absolutePath)/iu.test(serialized)) fail("CORE_CLEANUP_MARKER_BODY_BEARING");
  return Object.freeze({ ...value, processGroupIDs: Object.freeze([...value.processGroupIDs]) });
}

export function buildCoreCleanupPlan(marker) {
  const validated = validateCoreBodyFreeMarker(marker);
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.cleanup-plan.v1",
    runID: validated.runID,
    order: CORE_CLEANUP_ORDER,
    bodyFree: true,
    idempotent: true,
    arbitraryProcessDiscoveryAllowed: false,
    arbitraryPathDeletionAllowed: false,
  });
}

export async function executeCoreCleanupPlanWithInjectedExecutor(marker, executor, { faultAfter = null } = {}) {
  if (!executor || executor.mode !== "construction_fake" || typeof executor.execute !== "function" || Object.keys(executor).some((key) => !["mode", "execute"].includes(key))) fail("CORE_CLEANUP_EXECUTOR_DENIED");
  if (faultAfter !== null && (!Number.isInteger(faultAfter) || faultAfter < 0)) fail("CORE_CLEANUP_FAULT_INDEX_INVALID");
  const plan = buildCoreCleanupPlan(marker);
  let attempts = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < plan.order.length; index += 1) {
      if (pass === 0 && faultAfter === index) break;
      await executor.execute(Object.freeze({ kind: plan.order[index], bodyFree: true, idempotencyPass: pass + 1 }));
      attempts += 1;
    }
  }
  return Object.freeze({ cleanupPassed: true, idempotencyPasses: 2, attempts, realEffects: 0 });
}

function fail(code) {
  throw new GateBCleanupError(code);
}

function exactMarker(root) {
  const markerPath = path.join(root, ".forme-gate-b-run.json");
  const stat = fs.lstatSync(markerPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) {
    fail("CLEANUP_MARKER_UNSAFE");
  }
  const value = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  const keys = Object.keys(value).sort();
  const expected = [
    "dockerContainerCreated", "dockerVolumeCreated", "executionManifestSha256", "runID", "schemaVersion",
  ].sort();
  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
    || value.schemaVersion !== "r4_gate_b_run_marker.v1"
    || !RUN_ID_PATTERN.test(value.runID)
    || !SHA256_PATTERN.test(value.executionManifestSha256)
    || typeof value.dockerContainerCreated !== "boolean"
    || typeof value.dockerVolumeCreated !== "boolean"
  ) fail("CLEANUP_MARKER_INVALID");
  return Object.freeze({ markerPath, value });
}

function runDocker(args) {
  const result = spawnSync(DOCKER_EXECUTABLE, args, {
    cwd: "/private/tmp",
    env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" },
    encoding: "buffer",
    timeout: 30_000,
    maxBuffer: 1_048_576,
  });
  if (result.error || result.status !== 0) fail("CLEANUP_DOCKER_COMMAND_FAILED");
}

function assertExactRunRoot(root, expectedRunID) {
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) fail("CLEANUP_ROOT_UNSAFE");
  const real = fs.realpathSync(root);
  if (real !== path.resolve(root) || path.basename(real) !== expectedRunID) fail("CLEANUP_ROOT_UNSAFE");
  return real;
}

export function cleanupRunRoot(input) {
  validateRunID(input.runID);
  const root = assertExactRunRoot(input.root, input.runID);
  const { value } = exactMarker(root);
  if (value.runID !== input.runID || value.executionManifestSha256 !== input.executionManifestSha256) {
    fail("CLEANUP_AUTHORITY_MISMATCH");
  }
  let dockerCommands = 0;
  if (input.allowDockerCleanup === true && value.dockerContainerCreated) {
    runDocker(["rm", "--force", POSTGRES_CONTAINER]);
    dockerCommands += 1;
  }
  if (input.allowDockerCleanup === true && value.dockerVolumeCreated) {
    runDocker(["volume", "rm", "--force", POSTGRES_VOLUME]);
    dockerCommands += 1;
  }
  if (input.allowDockerCleanup === true && fs.existsSync(POSTGRES_TEMP_ROOT)) {
    const tempStat = fs.lstatSync(POSTGRES_TEMP_ROOT);
    if (!tempStat.isDirectory() || tempStat.isSymbolicLink() || fs.realpathSync(POSTGRES_TEMP_ROOT) !== POSTGRES_TEMP_ROOT) {
      fail("CLEANUP_POSTGRES_TEMP_ROOT_UNSAFE");
    }
    fs.rmSync(POSTGRES_TEMP_ROOT, { recursive: true, force: false });
  }
  fs.rmSync(root, { recursive: true, force: false });
  if (fs.existsSync(root)) fail("CLEANUP_RUN_ROOT_REMAINS");
  return Object.freeze({ status: "GREEN", dockerCommands, runRootAbsent: true });
}

function parseCLI(argv) {
  if (
    argv.length !== 6
    || argv[0] !== "cleanup"
    || argv[1] !== "--run-id"
    || argv[3] !== "--manifest-sha"
  ) fail("CLEANUP_ARGUMENTS_DENIED");
  const runID = validateRunID(argv[2]);
  const manifestSha = argv[4];
  if (!SHA256_PATTERN.test(manifestSha) || argv[5] !== "--no-docker-fallback") fail("CLEANUP_ARGUMENTS_DENIED");
  return Object.freeze({ runID, manifestSha });
}

function main() {
  const parsed = parseCLI(process.argv.slice(2));
  const temporary = process.env.TMPDIR;
  if (typeof temporary !== "string" || !path.isAbsolute(temporary)) fail("CLEANUP_TMPDIR_INVALID");
  const parent = path.join(fs.realpathSync(temporary), "forme-r4-gate-b");
  const root = path.join(parent, parsed.runID);
  const result = cleanupRunRoot({
    root,
    runID: parsed.runID,
    executionManifestSha256: parsed.manifestSha,
    allowDockerCleanup: true,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
