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
