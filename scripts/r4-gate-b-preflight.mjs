import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RETRY_CONSTRUCTION_PACKET_SHA256 = "4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7";
export const CORE_CORRECTION_PACKET_SHA256 = "5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6";
export const CORE_CORRECTION_OWNER_REVIEW_SHA256 = "2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299";
export const CORE_APPROVED_PROPOSAL_HEAD = "5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e";
export const CORE_APPROVED_PROPOSAL_TREE = "15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f";
export const APPROVED_TECHNICAL_PACKET_SHA256 = "e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5";
export const PACKAGE_LOCK_SHA256 = "d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812";
export const CODEX_LAUNCHER_SHA256 = "134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477";
export const CODEX_NATIVE_SHA256 = "1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590";
export const RUN_ID_PATTERN = /^gb_[a-f0-9]{32}$/u;
export const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
export const CODEX_PACKAGE_RELATIVE_PATHS = Object.freeze({
  launcher: "bin/codex.js",
  native: "vendor/aarch64-apple-darwin/codex/codex",
});

const repositoryRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const EXACT_REPOSITORY_READS = new Set([
  "docs/R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md",
  "docs/R4-GATE-B-RETRY-EXECUTION-MANIFEST.md",
  "docs/evidence/r4-gate-b-retry-construction.json",
  "package-lock.json",
  "schemas/r4/gate-b/runtime-boundary.json",
  "docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md",
  "docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-OWNER-REVIEW.md",
]);

export class GateBPreflightError extends Error {
  constructor(code) {
    super(code);
    this.name = "GateBPreflightError";
    this.code = code;
  }
}

function fail(code) {
  throw new GateBPreflightError(code);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function currentUid() {
  if (typeof process.getuid !== "function") fail("PREFLIGHT_UID_UNAVAILABLE");
  return process.getuid();
}

function assertOwnedDirectory(value, requiredMode, code) {
  const stat = fs.lstatSync(value);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== currentUid()) fail(code);
  if (requiredMode !== null && (stat.mode & 0o777) !== requiredMode) fail(code);
  const real = fs.realpathSync(value);
  if (real !== path.resolve(value)) fail(code);
  return real;
}

function assertExactFile(value, code) {
  const stat = fs.lstatSync(value);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== currentUid()) fail(code);
  if (fs.realpathSync(value) !== path.resolve(value)) fail(code);
  return stat;
}

export function exactRepositoryFile(relativePath) {
  if (!EXACT_REPOSITORY_READS.has(relativePath)) fail("PREFLIGHT_REPOSITORY_PATH_DENIED");
  const candidate = path.join(repositoryRoot, ...relativePath.split("/"));
  assertExactFile(candidate, "PREFLIGHT_REPOSITORY_PATH_UNSAFE");
  return candidate;
}

export function validateRunID(runID) {
  if (typeof runID !== "string" || !RUN_ID_PATTERN.test(runID)) fail("RUN_ID_INVALID");
  return runID;
}

export function validateSha256(value, code = "SHA256_INVALID") {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) fail(code);
  return value;
}

export function verifyConstructionBindings() {
  const bindings = [
    ["docs/R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md", RETRY_CONSTRUCTION_PACKET_SHA256],
    ["package-lock.json", PACKAGE_LOCK_SHA256],
  ];
  for (const [relativePath, expected] of bindings) {
    const actual = sha256(fs.readFileSync(exactRepositoryFile(relativePath)));
    if (actual !== expected) fail("PREFLIGHT_IMMUTABLE_HASH_DRIFT");
  }
  const boundary = JSON.parse(fs.readFileSync(exactRepositoryFile("schemas/r4/gate-b/runtime-boundary.json"), "utf8"));
  if (
    boundary.authority.approvedPacketSha256 !== `sha256:${APPROVED_TECHNICAL_PACKET_SHA256}`
    || boundary.authority.authorizedProviderSessions !== 0
    || boundary.authority.authorizedProviderBytes !== 0
    || boundary.authority.authorizedSpendUsd !== 0
  ) fail("PREFLIGHT_AUTHORITY_DRIFT");
  return Object.freeze({ immutableHashesMatched: true, authorityCeilingsMatched: true });
}

export function verifyCoreCorrectionImmutableBindings() {
  const bindings = [
    ["docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md", CORE_CORRECTION_PACKET_SHA256],
    ["docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-OWNER-REVIEW.md", CORE_CORRECTION_OWNER_REVIEW_SHA256],
    ["package-lock.json", PACKAGE_LOCK_SHA256],
  ];
  for (const [relativePath, expected] of bindings) {
    const actual = sha256(fs.readFileSync(exactRepositoryFile(relativePath)));
    if (actual !== expected) fail("CORE_PREFLIGHT_IMMUTABLE_HASH_DRIFT");
  }
  return Object.freeze({
    packetSha256: `sha256:${CORE_CORRECTION_PACKET_SHA256}`,
    ownerReviewSha256: `sha256:${CORE_CORRECTION_OWNER_REVIEW_SHA256}`,
    approvedProposalHead: CORE_APPROVED_PROPOSAL_HEAD,
    approvedProposalTree: CORE_APPROVED_PROPOSAL_TREE,
    packageLockSha256: `sha256:${PACKAGE_LOCK_SHA256}`,
  });
}

function exactCodexChild(root, relativePath, expectedSha256) {
  const candidate = path.join(root, ...relativePath.split("/"));
  assertExactFile(candidate, "CODEX_SOURCE_PATH_UNSAFE");
  if (!candidate.startsWith(`${root}${path.sep}`)) fail("CODEX_SOURCE_PATH_ESCAPE");
  const actual = sha256(fs.readFileSync(candidate));
  if (actual !== expectedSha256) fail("CODEX_SOURCE_HASH_MISMATCH");
  return Object.freeze({ relativePath, sha256: actual });
}

export function validateCodexInstallationRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) fail("CODEX_INSTALLATION_ROOT_INVALID");
  const root = assertOwnedDirectory(value, null, "CODEX_INSTALLATION_ROOT_UNSAFE");
  const launcher = exactCodexChild(root, CODEX_PACKAGE_RELATIVE_PATHS.launcher, CODEX_LAUNCHER_SHA256);
  const native = exactCodexChild(root, CODEX_PACKAGE_RELATIVE_PATHS.native, CODEX_NATIVE_SHA256);
  return Object.freeze({ root, launcher, native });
}

function mkdirExact(value) {
  fs.mkdirSync(value, { recursive: false, mode: 0o700 });
  fs.chmodSync(value, 0o700);
  assertOwnedDirectory(value, 0o700, "RUN_ROOT_DIRECTORY_UNSAFE");
}

export const RUN_ROOT_TOKENS = Object.freeze([
  "build",
  "install",
  "workspace",
  "connector-protection",
  "candidate-protection",
  "runtime",
  "auth",
  "auth/home",
  "auth/codex-home",
  "tmp",
  "tmp/fresh-child",
  "tmp/codex",
  "keychains",
  "signing",
  "staging-evidence",
  "fake-transport",
]);

export function createRunLayout(input) {
  validateRunID(input.runID);
  validateSha256(input.executionManifestSha256, "EXECUTION_MANIFEST_SHA_INVALID");
  const parent = assertOwnedDirectory(input.parent, 0o700, "RUN_PARENT_UNSAFE");
  const root = path.join(parent, input.runID);
  if (fs.existsSync(root)) fail("RUN_ROOT_ALREADY_EXISTS");
  mkdirExact(root);
  try {
    for (const token of RUN_ROOT_TOKENS) {
      const target = path.join(root, ...token.split("/"));
      if (!fs.existsSync(target)) mkdirExact(target);
    }
    const marker = {
      schemaVersion: "r4_gate_b_run_marker.v1",
      runID: input.runID,
      executionManifestSha256: input.executionManifestSha256,
      dockerContainerCreated: false,
      dockerVolumeCreated: false,
    };
    const markerPath = path.join(root, ".forme-gate-b-run.json");
    fs.writeFileSync(markerPath, `${JSON.stringify(marker)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    fs.chmodSync(markerPath, 0o600);
    return Object.freeze({ root, markerPath, marker });
  } catch (error) {
    try {
      fs.rmSync(root, { recursive: true, force: false });
    } catch {
      fail("RUN_ROOT_CREATION_CLEANUP_FAILED");
    }
    if (fs.existsSync(root)) fail("RUN_ROOT_CREATION_CLEANUP_FAILED");
    throw error;
  }
}

export function constructionDryRunParent() {
  const value = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  if (typeof value !== "string" || !path.isAbsolute(value)) fail("CONSTRUCTION_TEMP_ROOT_REQUIRED");
  const root = assertOwnedDirectory(value, 0o700, "CONSTRUCTION_TEMP_ROOT_UNSAFE");
  const parent = path.join(root, "aggregate-runner-dry-run");
  if (fs.existsSync(parent)) fail("CONSTRUCTION_DRY_RUN_PARENT_EXISTS");
  mkdirExact(parent);
  return parent;
}

export function executionRunParent() {
  const value = process.env.TMPDIR;
  if (typeof value !== "string" || !path.isAbsolute(value)) fail("EXECUTION_TMPDIR_REQUIRED");
  const temporary = assertOwnedDirectory(value, null, "EXECUTION_TMPDIR_UNSAFE");
  const parent = path.join(temporary, "forme-r4-gate-b");
  if (!fs.existsSync(parent)) mkdirExact(parent);
  return assertOwnedDirectory(parent, 0o700, "RUN_PARENT_UNSAFE");
}

export function validateExecutionManifestHash(expected) {
  validateSha256(expected, "EXECUTION_MANIFEST_SHA_INVALID");
  const actual = `sha256:${sha256(fs.readFileSync(exactRepositoryFile("docs/R4-GATE-B-RETRY-EXECUTION-MANIFEST.md")))}`;
  if (actual !== expected) fail("EXECUTION_MANIFEST_HASH_MISMATCH");
  return true;
}

export function repositoryRootPath() {
  return repositoryRoot;
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("PREFLIGHT_ARGUMENTS_DENIED");
  const result = verifyConstructionBindings();
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "r4_gate_b_preflight_construction.v1",
    status: "GREEN_CONSTRUCTION_BINDINGS_ONLY",
    ...result,
    realCodexReads: 0,
    dockerCommands: 0,
    networkCalls: 0,
  })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
