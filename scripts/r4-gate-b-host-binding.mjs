import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { canonicalJson, parseStrictJson } from "../packages/r4-protocol/src/index.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats");
const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));

export const HOST_BINDING_AUTHORITY = Object.freeze({
  decisionBriefSha256: "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2",
  constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
  constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
  approvedProposalHead: "a45ea061e8e92f247597787e36ecfe52740b216a",
  approvedProposalTree: "89b28903fc34e985a17e8f3fdc4bfd7d0972880e",
  constructionRunId: "79b7775defbdaf043697ef9b6d0ab45c",
});
export const POSTGRES_IMAGE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
export const CODEX_BINDINGS = Object.freeze({
  version: "0.145.0",
  launcherRelativePath: "bin/codex.js",
  launcherSha256: "sha256:134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477",
  nativeRelativePath: "vendor/aarch64-apple-darwin/codex/codex",
  nativeSha256: "sha256:1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590",
});
export const INSPECTOR_LIMITS = Object.freeze({
  dockerClient: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 512 }),
  dockerVersion: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 2_048 }),
  dockerImage: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 4_096 }),
  macos: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 4_096 }),
  termGraceMilliseconds: 2_000,
  killGraceMilliseconds: 2_000,
});

const SHA = /^sha256:[0-9a-f]{64}$/u;
const GIT = /^[0-9a-f]{40}$/u;
const ID = /^[0-9a-f]{32}$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const VERSION = /^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][0-9A-Za-z][0-9A-Za-z.-]*)?$/u;
const API_VERSION = /^[0-9]+\.[0-9]+$/u;
const REPOSITORY_COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/u;
const INPUT_KEYS = new Set(["schemaVersion", "dockerCli", "dockerUnixSocket", "codexPackageRoot"]);
const REATTEMPT_ACTIVATION_GRANT_KEYS = new Set(["schemaVersion", "activationCardSha256", "attemptOrdinal", "checkpointSha256", "firstProviderCallGrant", "hostBindingAttemptGrant", "hostBindingInputPreparedByOwner", "implementationHead", "implementationTree", "retryExecutionGrant"]);
const INSPECTOR_SNAPSHOT_KEYS = new Set(["dockerCliStarts", "localDockerUnixSocketRequests", "macosInspectorStarts", "activeProcessGroups", "unknownProcessGroups", "cleanupState", "quarantineState"]);
const MINIMAL_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
const SYSTEM_TOOLS = Object.freeze({
  swVers: "/usr/bin/sw_vers",
  uname: "/usr/bin/uname",
  xcodeSelect: "/usr/bin/xcode-select",
  xcrun: "/usr/bin/xcrun",
  codesign: "/usr/bin/codesign",
  security: "/usr/bin/security",
  openssl: "/usr/bin/openssl",
  sandboxExec: "/usr/bin/sandbox-exec",
  lsof: "/usr/sbin/lsof",
});
const DOCKER_INSPECTOR_IDS = new Set(["docker-client-version", "docker-daemon-version", "docker-image-observation"]);
const DOCKER_SOCKET_INSPECTOR_IDS = new Set(["docker-daemon-version", "docker-image-observation"]);
const MACOS_INSPECTOR_IDS = new Set(["macos-product-version", "macos-build-version", "macos-architecture", "developer-root", "swiftc-path", "sdk-path", "sdk-version", "swift-version", "openssl-version"]);
const HOST_INSPECTOR_SEQUENCE = Object.freeze(["docker-client-version", "docker-daemon-version", "docker-image-observation", "macos-product-version", "macos-build-version", "macos-architecture", "developer-root", "swiftc-path", "sdk-path", "sdk-version", "swift-version", "openssl-version"]);
export const HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS = Object.freeze([
  Object.freeze({ name: "home", environmentKey: "HOME", ownedResource: "host-inspector-environment-home" }),
  Object.freeze({ name: "docker-config", environmentKey: "DOCKER_CONFIG", ownedResource: "host-inspector-environment-docker-config" }),
  Object.freeze({ name: "tmp", environmentKey: "TMPDIR", ownedResource: "host-inspector-environment-tmp" }),
]);
const HOST_BINDING_ENVIRONMENT_DIRECTORY_SPEC_BY_NAME = new Map(HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.map((spec) => [spec.name, spec]));
export const RUNTIME_DEPENDENCY_PATHS = Object.freeze(`
scripts/r4-gate-b-physical-runner.mjs
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-port.mjs
scripts/r4-gate-b-core-postgres.mjs
scripts/r4-gate-b-codex-probe.mjs
package.json
package-lock.json
packages/r4-codex-adapter/src/zero-call-physical.ts
packages/r4-codex-adapter/src/app-server-probe.ts
packages/r4-protocol/src/index.ts
packages/r4-protocol/src/canonical.ts
packages/r4-protocol/src/constructors.ts
packages/r4-protocol/src/golden.ts
packages/r4-protocol/src/guards.ts
packages/r4-protocol/src/object-validation.ts
packages/r4-protocol/src/registry.ts
packages/r4-protocol/src/state.ts
packages/r4-protocol/src/types.ts
packages/r4-protocol/src/validation.ts
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/physical-retry-evidence.schema.json
schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json
schemas/r4/gate-b-core/host-binding-input.schema.json
schemas/r4/gate-b-core/host-binding-capsule.schema.json
schemas/r4/gate-b-core/host-binding-public-receipt.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-checkpoint.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-capsule.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-public-receipt.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json
schemas/r4/gate-b-core/postgres/physical-adapter-contract.json
schemas/r4/gate-b-core/postgres/race-catalog.json
schemas/r4/gate-b-core/postgres/race-byte-index.json
schemas/r4/gate-b-core/postgres-contract.md
schemas/r4/gate-b-core/sql/0000_r4_gate_b_core_bootstrap.sql
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.verify.sql
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.rollback.sql
fixtures/r4-gate-b-core/postgres/core-race-setup.sql
fixtures/r4-gate-b-core/postgres/core-race-worker.sql
fixtures/r4-gate-b-core/postgres/core-race-verify.sql
fixtures/r4-gate-b-core/postgres/core-happy-path.sql
fixtures/r4-gate-b-core/postgres/core-errors.sql
fixtures/r4-gate-b-core/postgres/core-races.sql
schemas/r4/gate-b-core/macos/physical-adapter-contract.json
schemas/r4/gate-b-core/macos/build-recipe.json
schemas/r4/gate-b-core/macos/transient-candidate-contract.json
schemas/r4/gate-b-core/macos/evidence.schema.json
schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb
schemas/r4/gate-b-core/macos/forme-core-transient-response.sb
fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs
native/macos/Package.swift
native/macos/Sources/FormeCoreLocal/CoreLauncher.swift
native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift
native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift
native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift
native/macos/Sources/FormeCoreLocal/CoreSandboxProfile.swift
native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift
native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift
native/macos/Resources/FormeCoreLocal.Info.plist
native/macos/Resources/FormeCoreLocal.entitlements
`.trim().split("\n").sort((a, b) => Buffer.from(a, "utf8").compare(Buffer.from(b, "utf8"))));
export const HOST_BINDING_INVALIDATION_RULES = Object.freeze([
  "expired",
  "implementation_head_drift",
  "implementation_tree_drift",
  "runner_hash_drift",
  "contract_hash_drift",
  "profile_hash_drift",
  "runtime_dependency_drift",
  "bound_file_identity_drift",
  "bound_file_hash_drift",
  "path_mode_owner_drift",
  "developer_root_drift",
  "sdk_path_drift",
  "docker_socket_drift",
  "docker_image_drift",
  "platform_drift",
]);

export class HostBindingError extends Error {
  constructor(code, verdict = "HOST_BINDING_INCOMPLETE_YELLOW", partialObservation = null) {
    super(code);
    this.name = "HostBindingError";
    this.code = code;
    this.verdict = verdict;
    this.partialObservation = partialObservation;
  }
  attachPartialObservation(observation) { if (this.partialObservation === null) this.partialObservation = validateHostInspectorSnapshot(observation); return this; }
}
function fail(code, verdict) { throw new HostBindingError(code, verdict); }
export function sha256(bytes) { return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`; }
function hostInspectorEnvironmentDirectorySpec(directoryName) {
  if (typeof directoryName !== "string" || !HOST_BINDING_ENVIRONMENT_DIRECTORY_SPEC_BY_NAME.has(directoryName)) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_ROLE_INVALID", "RED");
  return HOST_BINDING_ENVIRONMENT_DIRECTORY_SPEC_BY_NAME.get(directoryName);
}
function hostInspectorStructuralDirectoryIdentity(stat) {
  if (stat === null || typeof stat !== "object" || typeof stat.isDirectory !== "function" || !stat.isDirectory() || (typeof stat.isSymbolicLink === "function" && stat.isSymbolicLink()) || stat.uid !== currentUid() || (stat.mode & 0o7777) !== 0o700) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_IDENTITY_INVALID", "RED_QUARANTINED");
  return Object.freeze({
    device: String(stat.dev),
    inode: String(stat.ino),
    mode: stat.mode & 0o7777,
    uid: stat.uid,
    gid: stat.gid,
  });
}
function sameHostInspectorStructuralDirectoryIdentity(left, right) {
  return left.device === right.device && left.inode === right.inode && left.mode === right.mode && left.uid === right.uid && left.gid === right.gid;
}
export function observeHostBindingReattemptEnvironmentDirectoryIdentity(reattemptRunId, directoryName, stat) {
  if (!ID.test(reattemptRunId)) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_RUN_ID_INVALID", "RED");
  const spec = hostInspectorEnvironmentDirectorySpec(directoryName);
  return Object.freeze({
    schemaVersion: "r4_gate_b_host_binding_reattempt_owned_directory_identity.v2",
    reattemptRunId,
    directoryName: spec.name,
    ownedResource: spec.ownedResource,
    ...hostInspectorStructuralDirectoryIdentity(stat),
  });
}
export function hostBindingReattemptEnvironmentDirectoryIntentSha256(reattemptRunId, directoryName) {
  if (!ID.test(reattemptRunId)) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_RUN_ID_INVALID", "RED");
  const spec = hostInspectorEnvironmentDirectorySpec(directoryName);
  return sha256(Buffer.from(`r4-gate-b-host-binding-reattempt-environment-directory-create-v2\n${reattemptRunId}\n${spec.name}\n${spec.ownedResource}\n`, "utf8"));
}
export function hostBindingReattemptEnvironmentDirectoryIdentitySha256(reattemptRunId, directoryName, stat) {
  return sha256(Buffer.from(canonicalJson(observeHostBindingReattemptEnvironmentDirectoryIdentity(reattemptRunId, directoryName, stat)), "utf8"));
}
export function runtimeDependencyLogicalName(relativePath) {
  if (typeof relativePath !== "string" || !RUNTIME_DEPENDENCY_PATHS.includes(relativePath)) fail("RUNTIME_DEPENDENCY_LOGICAL_NAME_PATH_INVALID", "RED");
  return `repo-${crypto.createHash("sha256").update(Buffer.from(relativePath, "utf8")).digest("hex")}`;
}
function validateTrackedSchema(relativePath, value, code) {
  const schema = parseStrictJson(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false, useDefaults: false, validateFormats: true });
  addFormats(ajv, { mode: "full", keywords: false });
  if (ajv.compile(schema)(value) !== true) fail(code, "RED");
}
function exactKeys(value, keys, code, verdict) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code, verdict);
  if (Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code, verdict);
  return value;
}
function deepFreezeJson(value) {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== "object" || Object.isFrozen(current)) continue;
    for (const child of Object.values(current)) if (child !== null && typeof child === "object") pending.push(child);
    Object.freeze(current);
  }
  return value;
}
export function decodeCanonicalJsonFrameBase64Url(encoded, { maximumBytes = 4_096, code = "CANONICAL_FRAME_INVALID" } = {}) {
  if (!Number.isInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > 4_096 || typeof code !== "string" || !/^[A-Z][A-Z0-9_]{0,95}$/u.test(code)) fail("CANONICAL_FRAME_OPTIONS_INVALID", "RED");
  if (typeof encoded !== "string" || encoded.length < 1 || encoded.length > 5_462 || !BASE64URL.test(encoded)) fail(code, "RED");
  let bytes = Buffer.alloc(0);
  try {
    bytes = Buffer.from(encoded, "base64url");
    if (bytes.length < 1 || bytes.length > maximumBytes || bytes.toString("base64url") !== encoded || bytes.includes(0x00) || bytes.includes(0x0a) || bytes.includes(0x0d)) fail(code, "RED");
    const text = bytes.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(bytes)) fail(code, "RED");
    let value;
    try { value = parseStrictJson(text); } catch { fail(code, "RED"); }
    if (canonicalJson(value) !== text) fail(code, "RED");
    return Object.freeze({ value: deepFreezeJson(value), sha256: sha256(bytes) });
  } finally {
    bytes.fill(0);
  }
}
export function decodeHostBindingReattemptEvidenceReceipt(encoded, expectedKind, expectedBinding = {}) {
  const expected = Object.freeze({
    validation: Object.freeze({ schemaVersion: "r4_gate_b_host_binding_reattempt_validation_receipt.v2", auditClass: null }),
    "authority-audit": Object.freeze({ schemaVersion: "r4_gate_b_host_binding_reattempt_audit_receipt.v2", auditClass: "authority-checkpoint-journal-cleanup" }),
    "host-audit": Object.freeze({ schemaVersion: "r4_gate_b_host_binding_reattempt_audit_receipt.v2", auditClass: "host-admission-counters-zeroization-publication" }),
  })[expectedKind];
  if (expected === undefined || expectedBinding === null || typeof expectedBinding !== "object" || Array.isArray(expectedBinding)) fail("HOST_BINDING_REATTEMPT_EVIDENCE_KIND_INVALID", "RED");
  const decoded = decodeCanonicalJsonFrameBase64Url(encoded, { maximumBytes: 4_096, code: "HOST_BINDING_REATTEMPT_EVIDENCE_FRAME_INVALID" });
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json", decoded.value, "HOST_BINDING_REATTEMPT_EVIDENCE_SCHEMA_INVALID");
  if (decoded.value.schemaVersion !== expected.schemaVersion || (expected.auditClass !== null && decoded.value.auditClass !== expected.auditClass)) fail("HOST_BINDING_REATTEMPT_EVIDENCE_KIND_MISMATCH", "RED");
  for (const [key, value] of Object.entries(expectedBinding)) {
    if (!new Set(["implementationHead", "implementationTree"]).has(key) || typeof value !== "string" || !GIT.test(value) || decoded.value[key] !== value) fail("HOST_BINDING_REATTEMPT_EVIDENCE_BINDING_MISMATCH", "RED");
  }
  return decoded;
}
export function createHostBindingReattemptActivationGrantFrame({ activationCardSha256, checkpointSha256, implementationHead, implementationTree }) {
  const frame = {
    schemaVersion: "r4_gate_b_host_binding_activation_grant.v2",
    activationCardSha256,
    attemptOrdinal: 2,
    checkpointSha256,
    firstProviderCallGrant: "NOT_REQUESTED",
    hostBindingAttemptGrant: "APPROVED_ONCE",
    hostBindingInputPreparedByOwner: true,
    implementationHead,
    implementationTree,
    retryExecutionGrant: "NOT_REQUESTED",
  };
  exactKeys(frame, REATTEMPT_ACTIVATION_GRANT_KEYS, "HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_SHAPE");
  if (!SHA.test(frame.activationCardSha256) || !SHA.test(frame.checkpointSha256) || !GIT.test(frame.implementationHead) || !GIT.test(frame.implementationTree)) fail("HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_INVALID", "RED");
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json", frame, "HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_SCHEMA_INVALID");
  return deepFreezeJson(frame);
}
export function assertHostBindingReattemptActivationGrantHash(fields, expectedSha256) {
  if (!SHA.test(expectedSha256)) fail("HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_HASH_INVALID", "RED");
  const frame = createHostBindingReattemptActivationGrantFrame(fields);
  const frameSha256 = sha256(Buffer.from(canonicalJson(frame), "utf8"));
  if (frameSha256 !== expectedSha256) fail("HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_HASH_MISMATCH", "RED");
  return Object.freeze({ frame, sha256: frameSha256 });
}
export function deriveHostBindingReattemptAttemptId({ reattemptPacketSha256, reattemptOwnerReviewSha256, approvedProposalHead, implementationHead, checkpointSha256 }) {
  if (!SHA.test(reattemptPacketSha256) || !SHA.test(reattemptOwnerReviewSha256) || !GIT.test(approvedProposalHead) || !GIT.test(implementationHead) || !SHA.test(checkpointSha256)) fail("HOST_BINDING_REATTEMPT_ATTEMPT_ID_AUTHORITY_INVALID", "RED");
  return crypto.createHash("sha256").update(Buffer.from(`r4-gate-b-host-binding-reattempt-attempt-v2\n${reattemptPacketSha256}\n${reattemptOwnerReviewSha256}\n${approvedProposalHead}\n${implementationHead}\n${checkpointSha256}\n`, "utf8")).digest("hex").slice(0, 32);
}
export function validateHostInspectorSnapshot(value, { complete = false } = {}) {
  exactKeys(value, INSPECTOR_SNAPSHOT_KEYS, "HOST_INSPECTOR_SNAPSHOT_SHAPE");
  for (const [key, maximum] of [["dockerCliStarts", 3], ["localDockerUnixSocketRequests", 2], ["macosInspectorStarts", 9]]) if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > maximum) fail("HOST_INSPECTOR_SNAPSHOT_COUNT_INVALID", "RED");
  for (const key of ["activeProcessGroups", "unknownProcessGroups"]) if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 12) fail("HOST_INSPECTOR_SNAPSHOT_GROUP_INVALID", "RED");
  const expectedCleanup = value.unknownProcessGroups > 0 ? "unknown" : value.activeProcessGroups > 0 ? "active" : "observed-absent";
  const expectedQuarantine = value.unknownProcessGroups > 0 ? "quarantined" : "none";
  if (value.cleanupState !== expectedCleanup || value.quarantineState !== expectedQuarantine || value.unknownProcessGroups > value.activeProcessGroups) fail("HOST_INSPECTOR_SNAPSHOT_STATE_INVALID", "RED");
  if (complete && (value.dockerCliStarts !== 3 || value.localDockerUnixSocketRequests !== 2 || value.macosInspectorStarts !== 9 || value.activeProcessGroups !== 0 || value.unknownProcessGroups !== 0)) fail("HOST_INSPECTOR_SNAPSHOT_INCOMPLETE", "RED");
  return Object.freeze({ ...value });
}
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}
function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    let written;
    try { written = fs.writeSync(fd, bytes, offset, bytes.length - offset); }
    catch (error) { if (error?.code === "EINTR") continue; throw error; }
    if (written <= 0) fail("HOST_BINDING_WRITE_STALLED", "RED");
    offset += written;
  }
}
export function ensureOwnedPrivateDirectory(directory, anchor = REPOSITORY_ROOT) {
  const exact = assertAbsoluteLiteral(directory, "OWNED_DIRECTORY_PATH_INVALID");
  const exactAnchor = fs.realpathSync(assertAbsoluteLiteral(anchor, "OWNED_DIRECTORY_ANCHOR_INVALID"));
  if (!isInside(exactAnchor, exact) || exact === exactAnchor) fail("OWNED_DIRECTORY_OUTSIDE_ANCHOR", "RED");
  let cursor = exactAnchor;
  for (const component of path.relative(exactAnchor, exact).split(path.sep).filter(Boolean)) {
    const parent = cursor;
    cursor = path.join(cursor, component);
    try {
      const stat = fs.lstatSync(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== currentUid() || (stat.mode & 0o777) !== 0o700 || fs.realpathSync(cursor) !== cursor) fail("OWNED_DIRECTORY_COMPONENT_UNSAFE", "RED");
    } catch (error) {
      if (error instanceof HostBindingError) throw error;
      if (error?.code !== "ENOENT") fail("OWNED_DIRECTORY_COMPONENT_UNREADABLE", "RED");
      fs.mkdirSync(cursor, { recursive: false, mode: 0o700 });
      const created = fs.lstatSync(cursor);
      if (!created.isDirectory() || created.isSymbolicLink() || created.uid !== currentUid() || (created.mode & 0o777) !== 0o700) fail("OWNED_DIRECTORY_COMPONENT_CREATE_UNSAFE", "RED");
      fsyncDirectory(parent);
    }
  }
  return exact;
}
function assertAbsoluteLiteral(value, code) {
  if (typeof value !== "string" || !path.isAbsolute(value) || value.includes("\0") || value.split(path.sep).includes("..") || value.includes("~")) fail(code);
  if (path.normalize(value) !== value) fail(code);
  return value;
}
function snapshotPathChain(value, code) {
  const parsed = path.parse(value);
  let cursor = parsed.root;
  const entries = [];
  for (const part of value.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch { fail(code); }
    if (stat.isSymbolicLink()) fail(code);
    entries.push(Object.freeze({ path: cursor, device: String(stat.dev), inode: String(stat.ino), mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, nlink: stat.nlink, kind: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : stat.isSocket() ? "socket" : "other" }));
  }
  return Object.freeze(entries);
}
function assertPathChainStable(snapshot, code, verdict = "YELLOW_NO_RETRY") {
  for (const expected of snapshot) {
    let stat;
    try { stat = fs.lstatSync(expected.path); } catch { fail(code, verdict); }
    const observed = { path: expected.path, device: String(stat.dev), inode: String(stat.ino), mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, nlink: stat.nlink, kind: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : stat.isSocket() ? "socket" : "other" };
    if (canonicalJson(observed) !== canonicalJson(expected) || stat.isSymbolicLink()) fail(code, verdict);
  }
  return true;
}
function statIdentity(stat) {
  return Object.freeze({
    size: stat.size,
    mode: stat.mode & 0o7777,
    uid: stat.uid,
    gid: stat.gid,
    device: String(stat.dev),
    inode: String(stat.ino),
    nlink: stat.nlink,
    mtimeMilliseconds: Math.trunc(stat.mtimeMs),
  });
}
function sameIdentity(left, right) {
  return ["size", "mode", "uid", "gid", "device", "inode", "nlink", "mtimeMilliseconds"].every((key) => left[key] === right[key]);
}
function sameIdentityWithoutLinkCount(left, right) {
  return ["size", "mode", "uid", "gid", "device", "inode", "mtimeMilliseconds"].every((key) => left[key] === right[key]);
}
export function runtimeDependencyInventory(repositoryRoot = REPOSITORY_ROOT) {
  const repo = fs.realpathSync(repositoryRoot);
  const files = RUNTIME_DEPENDENCY_PATHS.map((relativePath) => {
    const absolute = path.join(repo, relativePath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(absolute) !== absolute || (stat.mode & 0o022) !== 0) fail(`RUNTIME_DEPENDENCY_UNSAFE:${relativePath}`, "RED");
    return Object.freeze({ path: relativePath, sha256: sha256(fs.readFileSync(absolute)) });
  });
  return Object.freeze({ files: Object.freeze(files), fileCount: files.length, aggregateSha256: sha256(Buffer.from(`${canonicalJson(files)}\n`, "utf8")) });
}
function currentUid() {
  if (typeof process.getuid !== "function") fail("HOST_BINDING_UID_UNAVAILABLE");
  return process.getuid();
}
function readBoundRegularFile(logicalName, value, { expectedSha256 = null, owner = "system-or-current", maximumBytes = 536_870_912, deniedRoots = [] } = {}) {
  const filePath = assertAbsoluteLiteral(value, "HOST_BOUND_PATH_INVALID");
  const chain = snapshotPathChain(filePath, "HOST_BOUND_PATH_SYMLINKED");
  const before = fs.lstatSync(filePath);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || (before.mode & 0o022) !== 0) fail("HOST_BOUND_FILE_UNSAFE");
  if (owner === "current" && before.uid !== currentUid()) fail("HOST_BOUND_FILE_OWNER_DRIFT");
  if (owner === "system-or-current" && before.uid !== 0 && before.uid !== currentUid()) fail("HOST_BOUND_FILE_OWNER_DRIFT");
  const real = fs.realpathSync(filePath);
  if (real !== filePath) fail("HOST_BOUND_FILE_CANONICAL_DRIFT");
  for (const denied of deniedRoots) if (isInside(denied, real) || isInside(real, denied)) fail("HOST_BOUND_FILE_OVERLAP");
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(filePath, flags);
  let bytes;
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.size > maximumBytes) fail("HOST_BOUND_FILE_SIZE_OR_TYPE");
    bytes = Buffer.allocUnsafe(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("HOST_BOUND_FILE_SHORT_READ");
      offset += count;
    }
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(fs.lstatSync(filePath));
    assertPathChainStable(chain, "HOST_BOUND_FILE_PATH_CHAIN_DRIFT");
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(before))) fail("HOST_BOUND_FILE_TOCTOU");
    const digest = sha256(bytes);
    if (expectedSha256 !== null && digest !== expectedSha256) fail("HOST_BOUND_FILE_HASH_DRIFT", "YELLOW_NO_RETRY");
    return Object.freeze({ logicalName, path: filePath, sha256: digest, ...afterFd });
  } finally {
    bytes?.fill(0);
    fs.closeSync(fd);
  }
}
export function inspectConstructionFixtureFile(filePath, expectedSha256 = null) {
  return readBoundRegularFile("construction-fixture", filePath, { owner: "current", expectedSha256, maximumBytes: 1_048_576 });
}
export function observeBoundDirectory(value, { owner = "current", deniedRoots = [] } = {}) {
  const directory = assertAbsoluteLiteral(value, "HOST_BOUND_DIRECTORY_INVALID");
  const chain = snapshotPathChain(directory, "HOST_BOUND_DIRECTORY_SYMLINKED");
  const before = fs.lstatSync(directory);
  if (!before.isDirectory() || before.isSymbolicLink() || (before.mode & 0o022) !== 0) fail("HOST_BOUND_DIRECTORY_UNSAFE");
  if (owner === "current" && before.uid !== currentUid()) fail("HOST_BOUND_DIRECTORY_OWNER_DRIFT");
  if (owner === "system-or-current" && before.uid !== 0 && before.uid !== currentUid()) fail("HOST_BOUND_DIRECTORY_OWNER_DRIFT");
  if (!new Set(["current", "system-or-current"]).has(owner)) fail("HOST_BOUND_DIRECTORY_OWNER_POLICY_INVALID", "RED");
  const real = fs.realpathSync(directory);
  if (real !== directory) fail("HOST_BOUND_DIRECTORY_CANONICAL_DRIFT");
  for (const denied of deniedRoots) if (isInside(denied, real) || isInside(real, denied)) fail("HOST_BOUND_DIRECTORY_OVERLAP");
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0) | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fs.fstatSync(fd);
    const after = fs.lstatSync(directory);
    assertPathChainStable(chain, "HOST_BOUND_DIRECTORY_PATH_CHAIN_DRIFT");
    const openedIdentity = statIdentity(opened);
    if (!opened.isDirectory() || opened.isSymbolicLink() || opened.nlink < 1 || !sameIdentity(openedIdentity, statIdentity(before)) || !sameIdentity(openedIdentity, statIdentity(after))) fail("HOST_BOUND_DIRECTORY_TOCTOU");
    return Object.freeze({ path: real, ...openedIdentity });
  } finally {
    fs.closeSync(fd);
  }
}
function validateDirectory(value, options = {}) {
  return observeBoundDirectory(value, options).path;
}
export function inspectConstructionFixtureDirectory(directory, deniedRoots = []) {
  return validateDirectory(directory, { owner: "current", deniedRoots });
}
function validateSocket(value, deniedRoots = []) {
  const socket = assertAbsoluteLiteral(value, "DOCKER_SOCKET_PATH_INVALID");
  const chain = snapshotPathChain(socket, "DOCKER_SOCKET_PATH_SYMLINKED");
  const stat = fs.lstatSync(socket);
  if (!stat.isSocket() || stat.isSymbolicLink() || (stat.mode & 0o002) !== 0 || (stat.uid !== 0 && stat.uid !== currentUid())) fail("DOCKER_SOCKET_UNSAFE", "YELLOW_NO_RETRY");
  const real = fs.realpathSync(socket);
  if (real !== socket) fail("DOCKER_SOCKET_CANONICAL_DRIFT", "YELLOW_NO_RETRY");
  for (const denied of deniedRoots) if (isInside(denied, real) || isInside(real, denied)) fail("DOCKER_SOCKET_OVERLAP", "YELLOW_NO_RETRY");
  assertPathChainStable(chain, "DOCKER_SOCKET_PATH_CHAIN_DRIFT");
  return Object.freeze({ path: socket, ...statIdentity(stat) });
}
export function inspectConstructionFixtureSocket(socket) { return validateSocket(socket); }

export function createHostBindingFinalRevalidator() {
  const boundFileAuthorities = [];
  const directoryAuthorities = new Map();
  let dockerSocketAuthority = null;
  let sealed = false;
  const requireOpen = () => { if (sealed) fail("HOST_BINDING_FINAL_REVALIDATOR_SEALED", "RED"); };
  const copyDeniedRoots = (deniedRoots) => Object.freeze([...(deniedRoots ?? [])]);
  return Object.freeze({
    observeBoundFile(logicalName, filePath, options = {}) {
      requireOpen();
      const retainedOptions = Object.freeze({
        owner: options.owner ?? "system-or-current",
        maximumBytes: options.maximumBytes ?? 536_870_912,
        deniedRoots: copyDeniedRoots(options.deniedRoots),
      });
      const chain = snapshotPathChain(assertAbsoluteLiteral(filePath, "HOST_BOUND_PATH_INVALID"), "HOST_BOUND_PATH_SYMLINKED");
      const observed = readBoundRegularFile(logicalName, filePath, { ...retainedOptions, expectedSha256: options.expectedSha256 ?? null });
      assertPathChainStable(chain, "HOST_BINDING_FINAL_CAPTURE_PATH_DRIFT");
      boundFileAuthorities.push(Object.freeze({ expected: observed, chain, options: retainedOptions }));
      return observed;
    },
    observeDockerSocket(socketPath, deniedRoots = []) {
      requireOpen();
      if (dockerSocketAuthority !== null) fail("HOST_BINDING_FINAL_SOCKET_DUPLICATE", "RED");
      const retainedDeniedRoots = copyDeniedRoots(deniedRoots);
      const chain = snapshotPathChain(assertAbsoluteLiteral(socketPath, "DOCKER_SOCKET_PATH_INVALID"), "DOCKER_SOCKET_PATH_SYMLINKED");
      const observed = validateSocket(socketPath, retainedDeniedRoots);
      assertPathChainStable(chain, "HOST_BINDING_FINAL_CAPTURE_PATH_DRIFT");
      dockerSocketAuthority = Object.freeze({ expected: observed, chain, deniedRoots: retainedDeniedRoots });
      return observed;
    },
    observeDirectory(role, directoryPath, options = {}) {
      requireOpen();
      if (!new Set(["developer-root", "sdk-path"]).has(role) || directoryAuthorities.has(role)) fail("HOST_BINDING_FINAL_DIRECTORY_ROLE_INVALID", "RED");
      const retainedOptions = Object.freeze({ owner: options.owner ?? "current", deniedRoots: copyDeniedRoots(options.deniedRoots) });
      const chain = snapshotPathChain(assertAbsoluteLiteral(directoryPath, "HOST_BOUND_DIRECTORY_INVALID"), "HOST_BOUND_DIRECTORY_SYMLINKED");
      const observed = observeBoundDirectory(directoryPath, retainedOptions);
      assertPathChainStable(chain, "HOST_BINDING_FINAL_CAPTURE_PATH_DRIFT");
      directoryAuthorities.set(role, Object.freeze({ expected: observed, chain, options: retainedOptions }));
      return observed;
    },
    revalidate() {
      requireOpen();
      sealed = true;
      try {
        if (boundFileAuthorities.length < 1 || dockerSocketAuthority === null || directoryAuthorities.size !== 2 || !directoryAuthorities.has("developer-root") || !directoryAuthorities.has("sdk-path")) fail("HOST_BINDING_FINAL_REVALIDATION_INCOMPLETE", "RED");
        for (const authority of boundFileAuthorities) {
          assertPathChainStable(authority.chain, "HOST_BINDING_FINAL_BOUND_FILE_PATH_DRIFT", "RED");
          const observed = readBoundRegularFile(authority.expected.logicalName, authority.expected.path, { ...authority.options, expectedSha256: authority.expected.sha256 });
          assertPathChainStable(authority.chain, "HOST_BINDING_FINAL_BOUND_FILE_PATH_DRIFT", "RED");
          if (canonicalJson(observed) !== canonicalJson(authority.expected)) fail("HOST_BINDING_FINAL_BOUND_FILE_IDENTITY_DRIFT", "RED");
        }
        assertPathChainStable(dockerSocketAuthority.chain, "HOST_BINDING_FINAL_DOCKER_SOCKET_PATH_DRIFT", "RED");
        const observedSocket = validateSocket(dockerSocketAuthority.expected.path, dockerSocketAuthority.deniedRoots);
        assertPathChainStable(dockerSocketAuthority.chain, "HOST_BINDING_FINAL_DOCKER_SOCKET_PATH_DRIFT", "RED");
        if (canonicalJson(observedSocket) !== canonicalJson(dockerSocketAuthority.expected)) fail("HOST_BINDING_FINAL_DOCKER_SOCKET_IDENTITY_DRIFT", "RED");
        for (const role of ["developer-root", "sdk-path"]) {
          const authority = directoryAuthorities.get(role);
          assertPathChainStable(authority.chain, "HOST_BINDING_FINAL_DIRECTORY_PATH_DRIFT", "RED");
          const observed = observeBoundDirectory(authority.expected.path, authority.options);
          assertPathChainStable(authority.chain, "HOST_BINDING_FINAL_DIRECTORY_PATH_DRIFT", "RED");
          if (canonicalJson(observed) !== canonicalJson(authority.expected)) fail("HOST_BINDING_FINAL_DIRECTORY_IDENTITY_DRIFT", "RED");
        }
        return true;
      } catch {
        throw new HostBindingError("HOST_BINDING_FINAL_REVALIDATION_DRIFT", "RED");
      }
    },
  });
}

function validateHostBindingInputBytesForVersion(bytes, schemaVersion) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 16_384 || bytes[bytes.length - 1] !== 0x0a) fail("HOST_BINDING_INPUT_FRAMING");
  if (bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x00)) fail("HOST_BINDING_INPUT_FRAMING");
  let value;
  try { value = parseStrictJson(bytes.subarray(0, -1).toString("utf8")); } catch { fail("HOST_BINDING_INPUT_JSON_INVALID"); }
  exactKeys(value, INPUT_KEYS, "HOST_BINDING_INPUT_SHAPE");
  if (value.schemaVersion !== schemaVersion) fail("HOST_BINDING_INPUT_VERSION");
  for (const key of ["dockerCli", "dockerUnixSocket", "codexPackageRoot"]) assertAbsoluteLiteral(value[key], "HOST_BINDING_INPUT_PATH_INVALID");
  if (`${canonicalJson(value)}\n` !== bytes.toString("utf8")) fail("HOST_BINDING_INPUT_NOT_CANONICAL");
  return Object.freeze(value);
}
export function validateHostBindingInputBytes(bytes) {
  return validateHostBindingInputBytesForVersion(bytes, "r4_gate_b_host_binding_input.v1");
}
export function validateHostBindingReattemptInputBytes(bytes) {
  const value = validateHostBindingInputBytesForVersion(bytes, "r4_gate_b_host_binding_reattempt_input.v2");
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json", value, "HOST_BINDING_REATTEMPT_INPUT_SCHEMA_INVALID");
  return value;
}
function classifyMissingHostBindingInput(operation) {
  try { return operation(); }
  catch (error) {
    if (error?.code === "ENOENT") fail("HOST_BINDING_INCOMPLETE_YELLOW", "YELLOW_NO_RETRY");
    throw error;
  }
}
function readAndConsumeHostBindingInputCore(inputPath, validator = validateHostBindingInputBytes, observation = null) {
  if (typeof validator !== "function") fail("HOST_BINDING_INPUT_VALIDATOR_INVALID", "RED");
  if (observation !== null && (typeof observation !== "object" || Array.isArray(observation))) fail("HOST_BINDING_INPUT_OBSERVATION_INVALID", "RED");
  const exact = assertAbsoluteLiteral(inputPath, "HOST_BINDING_INPUT_PATH_INVALID");
  const parent = path.dirname(exact);
  const parentChain = snapshotPathChain(parent, "HOST_BINDING_INPUT_PARENT_UNSAFE");
  const parentLeaf = parentChain.at(-1);
  if (!parentLeaf || parentLeaf.kind !== "directory" || parentLeaf.uid !== currentUid() || (parentLeaf.mode & 0o777) !== 0o700) fail("HOST_BINDING_INPUT_PARENT_UNSAFE", "RED");
  assertPathChainStable(parentChain, "HOST_BINDING_INPUT_PARENT_DRIFT");
  let fd = null;
  let bytes = Buffer.alloc(0);
  const trailing = Buffer.alloc(1);
  let expectedIdentity = null;
  let targetChain = null;
  try {
    if (observation !== null) observation.accessed = true;
    const stat = classifyMissingHostBindingInput(() => fs.lstatSync(exact));
    if (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === currentUid()) expectedIdentity = statIdentity(stat);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== currentUid() || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size > 16_384) fail("HOST_BINDING_INPUT_FILE_UNSAFE");
    targetChain = snapshotPathChain(exact, "HOST_BINDING_INPUT_PATH_SYMLINKED");
    fd = classifyMissingHostBindingInput(() => fs.openSync(exact, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)));
    if (observation !== null) observation.openCalls = 1;
    bytes = Buffer.allocUnsafe(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("HOST_BINDING_INPUT_SHORT_OR_TRAILING");
      offset += count;
    }
    if (fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("HOST_BINDING_INPUT_SHORT_OR_TRAILING");
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(classifyMissingHostBindingInput(() => fs.lstatSync(exact)));
    assertPathChainStable(targetChain, "HOST_BINDING_INPUT_PATH_CHAIN_DRIFT");
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(stat))) fail("HOST_BINDING_INPUT_TOCTOU");
    return validator(bytes);
  } finally {
    bytes.fill(0);
    trailing.fill(0);
    let finalizationError = null;
    if (fd !== null) {
      try { fs.closeSync(fd); }
      catch {
        finalizationError = new HostBindingError("HOST_BINDING_INPUT_CLOSE_FAILED", "RED");
        try { fs.fstatSync(fd); fs.closeSync(fd); } catch (error) { if (error?.code !== "EBADF") finalizationError = new HostBindingError("HOST_BINDING_INPUT_CLOSE_UNCERTAIN", "RED"); }
      }
    }
    try {
      assertPathChainStable(parentChain, "HOST_BINDING_INPUT_PARENT_DRIFT", "RED");
      let current = null;
      try { current = fs.lstatSync(exact); }
      catch (error) { if (error?.code !== "ENOENT") fail("HOST_BINDING_INPUT_CLEANUP_INSPECTION_FAILED", "RED"); }
      if (current === null) {
        fsyncDirectory(parent);
        if (observation !== null) observation.removedOrAbsent = true;
      } else {
        if (expectedIdentity === null || !current.isFile() || current.isSymbolicLink() || current.nlink !== 1 || current.uid !== currentUid() || !sameIdentity(statIdentity(current), expectedIdentity)) fail("HOST_BINDING_INPUT_CLEANUP_IDENTITY_DRIFT", "RED");
        if (targetChain !== null) assertPathChainStable(targetChain, "HOST_BINDING_INPUT_CLEANUP_PATH_DRIFT", "RED");
        try { fs.unlinkSync(exact); } catch { fail("HOST_BINDING_INPUT_UNLINK_FAILED", "RED"); }
        fsyncDirectory(parent);
        if (observation !== null) observation.removedOrAbsent = true;
      }
    } catch (error) {
      finalizationError = error instanceof HostBindingError ? error : new HostBindingError("HOST_BINDING_INPUT_CLEANUP_FAILED", "RED");
    }
    if (finalizationError !== null) throw finalizationError;
  }
}
export function readAndConsumeHostBindingInput(inputPath) {
  try { return readAndConsumeHostBindingInputCore(inputPath, validateHostBindingInputBytes); }
  catch (error) {
    if (error instanceof HostBindingError && error.verdict !== "RED" && !String(error.verdict).includes("QUARANTINED") && String(error.code).startsWith("HOST_BINDING_INPUT_")) throw new HostBindingError("HOST_BINDING_INCOMPLETE_YELLOW", "YELLOW_NO_RETRY");
    throw error;
  }
}
export function readAndConsumeHostBindingReattemptInput(inputPath, options = {}) {
  const observation = { accessed: false, openCalls: 0, removedOrAbsent: false };
  const snapshot = () => Object.freeze({ accessed: observation.accessed, openCalls: observation.openCalls, removedOrAbsent: observation.removedOrAbsent });
  try {
    if (options === null || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some((key) => key !== "onInputObservation")) fail("HOST_BINDING_REATTEMPT_INPUT_OBSERVATION_OPTIONS_INVALID", "RED");
    const { onInputObservation = null } = options;
    if (onInputObservation !== null && typeof onInputObservation !== "function") fail("HOST_BINDING_REATTEMPT_INPUT_OBSERVATION_CALLBACK_INVALID", "RED");
    const value = readAndConsumeHostBindingInputCore(inputPath, validateHostBindingReattemptInputBytes, observation);
    if (onInputObservation !== null) {
      try { onInputObservation(snapshot()); }
      catch { const callbackError = new HostBindingError("HOST_BINDING_REATTEMPT_INPUT_OBSERVATION_CALLBACK_FAILED", "RED"); callbackError.inputObservation = snapshot(); throw callbackError; }
    }
    return value;
  }
  catch (error) {
    let terminalError = error;
    if (terminalError instanceof HostBindingError && terminalError.verdict !== "RED" && !String(terminalError.verdict).includes("QUARANTINED") && String(terminalError.code).startsWith("HOST_BINDING_INPUT_")) terminalError = new HostBindingError("HOST_BINDING_INCOMPLETE_YELLOW", "YELLOW_NO_RETRY");
    if (terminalError !== null && (typeof terminalError === "object" || typeof terminalError === "function")) terminalError.inputObservation = snapshot();
    throw terminalError;
  }
}
export function removeHostBindingInputEnvelope(inputPath) {
  const exact = assertAbsoluteLiteral(inputPath, "HOST_BINDING_INPUT_PATH_INVALID");
  const parent = path.dirname(exact);
  const parentChain = snapshotPathChain(parent, "HOST_BINDING_INPUT_PARENT_UNSAFE");
  const parentLeaf = parentChain.at(-1);
  if (!parentLeaf || parentLeaf.kind !== "directory" || parentLeaf.uid !== currentUid() || (parentLeaf.mode & 0o777) !== 0o700) fail("HOST_BINDING_INPUT_PARENT_UNSAFE", "RED");
  assertPathChainStable(parentChain, "HOST_BINDING_INPUT_PARENT_DRIFT", "RED");
  let current;
  try { current = fs.lstatSync(exact); }
  catch (error) {
    if (error?.code !== "ENOENT") fail("HOST_BINDING_INPUT_CLEANUP_INSPECTION_FAILED", "RED");
    fsyncDirectory(parent);
    return false;
  }
  if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1 || current.uid !== currentUid() || (current.mode & 0o777) !== 0o600 || current.size > 16_384) fail("HOST_BINDING_INPUT_CLEANUP_IDENTITY_DRIFT", "RED");
  const targetChain = snapshotPathChain(exact, "HOST_BINDING_INPUT_CLEANUP_PATH_DRIFT");
  assertPathChainStable(parentChain, "HOST_BINDING_INPUT_PARENT_DRIFT", "RED");
  assertPathChainStable(targetChain, "HOST_BINDING_INPUT_CLEANUP_PATH_DRIFT", "RED");
  fs.unlinkSync(exact);
  fsyncDirectory(parent);
  return true;
}

function parseJsonSequence(text, expectedCount) {
  if (typeof text !== "string" || text.length === 0 || !text.endsWith("\n") || text.includes("\r") || text.includes("\0")) fail("HOST_INSPECTOR_OUTPUT_FRAMING");
  const line = text.slice(0, -1);
  if (line.length === 0 || line.includes("\n")) fail("HOST_INSPECTOR_OUTPUT_FRAMING");
  const values = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = 0; index <= line.length; index += 1) {
    const char = line[index];
    if (index === line.length || (!inString && depth === 0 && char === " ")) {
      if (index > start) {
        try { values.push(JSON.parse(line.slice(start, index))); } catch { fail("HOST_INSPECTOR_OUTPUT_JSON"); }
      }
      start = index + 1;
      continue;
    }
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") depth -= 1;
    if (depth < 0) fail("HOST_INSPECTOR_OUTPUT_JSON");
  }
  if (inString || depth !== 0 || values.length !== expectedCount) fail("HOST_INSPECTOR_OUTPUT_SHAPE");
  return values;
}
function oneLine(output, code) {
  if (typeof output !== "string" || output.length === 0 || !output.endsWith("\n") || output.slice(0, -1).includes("\n") || output.includes("\r") || output.includes("\0")) fail(code);
  return output.slice(0, -1);
}
export function parseDockerClientVersion(output) {
  const line = oneLine(output, "DOCKER_CLIENT_VERSION_INVALID");
  const match = /^Docker version ([0-9]+(?:\.[0-9]+){1,3}), build [A-Za-z0-9._+-]+$/u.exec(line);
  if (!match) fail("DOCKER_CLIENT_VERSION_INVALID", "YELLOW_NO_RETRY");
  return match[1];
}
export function parseDockerVersionObservation(output) {
  const [clientVersion, clientApiVersion, serverVersion, serverApiVersion, serverOs, serverArch] = parseJsonSequence(output, 6);
  if (typeof clientVersion !== "string" || typeof serverVersion !== "string" || !VERSION.test(clientVersion) || !VERSION.test(serverVersion) || clientVersion.length > 128 || serverVersion.length > 128 || typeof clientApiVersion !== "string" || typeof serverApiVersion !== "string" || !API_VERSION.test(clientApiVersion) || !API_VERSION.test(serverApiVersion) || clientApiVersion.length > 64 || serverApiVersion.length > 64 || typeof serverOs !== "string" || typeof serverArch !== "string") fail("DOCKER_VERSION_OBSERVATION_INVALID");
  if (serverOs !== "linux" || serverArch !== "arm64") fail("DOCKER_PLATFORM_UNSUPPORTED", "YELLOW_NO_RETRY");
  return Object.freeze({ clientVersion, clientApiVersion, serverVersion, serverApiVersion, serverOs, serverArch });
}
export function parseDockerImageObservation(output) {
  const [repoDigests, localImageId, imageOs, imageArch, imageSizeBytes] = parseJsonSequence(output, 5);
  const digestSet = Array.isArray(repoDigests) ? new Set(repoDigests) : null;
  const validDigests = Array.isArray(repoDigests) && repoDigests.length >= 1 && repoDigests.length <= 64 && digestSet.size === repoDigests.length && repoDigests.every(isRepositoryDigest);
  if (!validDigests || !digestSet.has(POSTGRES_IMAGE) || !SHA.test(localImageId) || imageOs !== "linux" || imageArch !== "arm64" || !Number.isSafeInteger(imageSizeBytes) || imageSizeBytes <= 0) fail("DOCKER_IMAGE_UNSUPPORTED", "YELLOW_NO_RETRY");
  return Object.freeze({ repoDigest: POSTGRES_IMAGE, localImageId, imageOs, imageArch, imageSizeBytes });
}

function isRepositoryDigest(value) {
  if (typeof value !== "string" || value.length > 327 || !/@sha256:[0-9a-f]{64}$/u.test(value)) return false;
  const repository = value.slice(0, -72);
  const components = repository.split("/");
  if (components.length < 1 || components.some((component) => component.length === 0)) return false;
  const colon = components[0].lastIndexOf(":");
  if (colon !== -1) {
    const host = components[0].slice(0, colon);
    const port = components[0].slice(colon + 1);
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(host) || !/^[1-9][0-9]{0,4}$/u.test(port) || Number(port) > 65_535) return false;
    components.shift();
    if (components.length === 0) return false;
  }
  return components.every((component) => REPOSITORY_COMPONENT.test(component));
}

export function parseMacOSProductVersion(output) {
  const version = oneLine(output, "MACOS_PRODUCT_VERSION_INVALID");
  if (version.length > 32 || !/^\d+\.\d+(?:\.\d+)?$/u.test(version) || Number(version.split(".")[0]) < 26) fail("MACOS_PLATFORM_UNSUPPORTED", "YELLOW_NO_RETRY");
  return version;
}
export function parseMacOSBuildVersion(output) {
  const version = oneLine(output, "MACOS_BUILD_VERSION_INVALID");
  if (version.length > 32 || !/^[0-9]{2,3}[A-Z][0-9]+[a-z]?$/u.test(version)) fail("MACOS_BUILD_VERSION_INVALID", "YELLOW_NO_RETRY");
  return version;
}
export function parseMacOSArchitecture(output) {
  const architecture = oneLine(output, "MACOS_ARCHITECTURE_INVALID");
  if (architecture !== "arm64") fail("MACOS_PLATFORM_UNSUPPORTED", "YELLOW_NO_RETRY");
  return architecture;
}
function parseAbsolutePathObservation(output, code) {
  const observed = oneLine(output, code);
  if (Buffer.byteLength(observed, "utf8") > 4_095) fail(code, "YELLOW_NO_RETRY");
  try { return assertAbsoluteLiteral(observed, code); } catch { fail(code, "YELLOW_NO_RETRY"); }
}
function acceptedDeveloperRoot(value) {
  return /^\/Applications\/Xcode[^/]*\.app\/Contents\/Developer$/u.test(value) || value === "/Library/Developer/CommandLineTools";
}
export function parseDeveloperRootObservation(output) {
  const value = parseAbsolutePathObservation(output, "DEVELOPER_ROOT_INVALID");
  if (!acceptedDeveloperRoot(value)) fail("DEVELOPER_TOOLCHAIN_UNSUPPORTED", "YELLOW_NO_RETRY");
  return value;
}
export function parseSwiftcPathObservation(output) { return parseAbsolutePathObservation(output, "SWIFTC_PATH_INVALID"); }
export function parseSdkPathObservation(output) { return parseAbsolutePathObservation(output, "SDK_PATH_INVALID"); }
export function parseSdkVersion(output) {
  const version = oneLine(output, "SDK_VERSION_INVALID");
  if (version.length > 32 || !/^\d+\.\d+(?:\.\d+)?$/u.test(version)) fail("SDK_VERSION_INVALID", "YELLOW_NO_RETRY");
  return version;
}
export function validateDeveloperToolchainRelationship({ developerRoot, swiftcPath, sdkPath, sdkVersion = null }) {
  const sdkName = /^MacOSX(?:(\d+(?:\.\d+)*))?\.sdk$/u.exec(path.basename(sdkPath));
  if (!acceptedDeveloperRoot(developerRoot) || !isInside(developerRoot, swiftcPath) || !isInside(developerRoot, sdkPath) || !swiftcPath.endsWith("/usr/bin/swiftc") || !sdkName || (sdkVersion !== null && sdkName[1] !== undefined && sdkName[1] !== sdkVersion)) fail("DEVELOPER_TOOLCHAIN_UNSUPPORTED", "YELLOW_NO_RETRY");
  return true;
}
export function parseSwiftVersion(output) {
  if (typeof output !== "string" || output.length < 1 || output.length > 512 || !output.endsWith("\n") || output.includes("\r") || output.includes("\0")) fail("SWIFT_VERSION_INVALID", "YELLOW_NO_RETRY");
  const lines = output.slice(0, -1).split("\n");
  if (lines.length !== 2) fail("SWIFT_VERSION_INVALID", "YELLOW_NO_RETRY");
  const versionMatch = /^(?:swift-driver version: [0-9]+(?:\.[0-9]+){1,3} )?Apple Swift version ([0-9]+(?:\.[0-9]+){1,3})(?: \([A-Za-z0-9._+ -]+\))?$/u.exec(lines[0]);
  if (!versionMatch || !/^Target: arm64-apple-macosx[0-9]+(?:\.[0-9]+){0,2}$/u.test(lines[1])) fail("SWIFT_VERSION_INVALID", "YELLOW_NO_RETRY");
  const [major, minor] = versionMatch[1].split(".").map(Number);
  if (major < 6 || (major === 6 && minor < 2)) fail("SWIFT_VERSION_UNSUPPORTED", "YELLOW_NO_RETRY");
  return lines.join("\n");
}
export function parseOpenSSLVersion(output) {
  const version = oneLine(output, "OPENSSL_VERSION_INVALID");
  if (version.length > 512 || !/^(?:LibreSSL|OpenSSL) [0-9]+\.[0-9]+\.[0-9]+[0-9A-Za-z.+-]*(?: [0-9A-Za-z][0-9A-Za-z ().,+\/_-]*)?$/u.test(version)) fail("OPENSSL_VERSION_INVALID", "YELLOW_NO_RETRY");
  return version;
}
function resolveObservedCanonicalPath(value, code) {
  try {
    const resolved = fs.realpathSync(assertAbsoluteLiteral(value, code));
    return assertAbsoluteLiteral(resolved, code);
  } catch (error) {
    if (error instanceof HostBindingError) throw error;
    fail(code, "YELLOW_NO_RETRY");
  }
}

export function createProcessHostInspector({ root, journal = async () => {}, clock = () => Date.now(), processPort = null }) {
  const canonicalRoot = fs.realpathSync(root);
  if (typeof journal !== "function" || typeof clock !== "function") fail("HOST_INSPECTOR_PORT_INVALID", "RED");
  let dockerCliStarts = 0;
  let localDockerUnixSocketRequests = 0;
  let macosInspectorStarts = 0;
  const attemptedCommandIds = new Set();
  const activeProcessGroups = new Set();
  const unknownProcessGroups = new Set();
  let environmentState = "unprepared";
  let environmentReattemptRunId = null;
  let environmentRootAuthority = null;
  let preparedEnvironment = null;
  const environmentDirectoryAuthorities = [];
  const environmentDirectoryObservations = [];
  const assertEnvironmentRootCurrent = () => {
    if (environmentRootAuthority === null || environmentRootAuthority.fd === null) fail("HOST_INSPECTOR_ENVIRONMENT_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
    const opened = hostInspectorStructuralDirectoryIdentity(fs.fstatSync(environmentRootAuthority.fd));
    const observed = hostInspectorStructuralDirectoryIdentity(fs.lstatSync(canonicalRoot));
    if (fs.realpathSync(canonicalRoot) !== canonicalRoot || !sameHostInspectorStructuralDirectoryIdentity(opened, environmentRootAuthority.identity) || !sameHostInspectorStructuralDirectoryIdentity(observed, environmentRootAuthority.identity)) fail("HOST_INSPECTOR_ENVIRONMENT_ROOT_IDENTITY_DRIFT", "RED_QUARANTINED");
  };
  const assertEnvironmentDirectoryCurrent = (authority) => {
    const opened = hostInspectorStructuralDirectoryIdentity(fs.fstatSync(authority.fd));
    const observedStat = fs.lstatSync(authority.path);
    const observed = hostInspectorStructuralDirectoryIdentity(observedStat);
    if (fs.realpathSync(authority.path) !== authority.path || !sameHostInspectorStructuralDirectoryIdentity(opened, authority.identity) || !sameHostInspectorStructuralDirectoryIdentity(observed, authority.identity) || hostBindingReattemptEnvironmentDirectoryIdentitySha256(environmentReattemptRunId, authority.spec.name, observedStat) !== authority.identitySha256) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_IDENTITY_DRIFT", "RED_QUARANTINED");
  };
  const assertEnvironmentCurrentCore = () => {
    try {
      if (environmentState !== "prepared") fail("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_NOT_PREPARED", "RED_QUARANTINED");
      assertEnvironmentRootCurrent();
      if (!ID.test(environmentReattemptRunId) || environmentDirectoryAuthorities.length !== HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.length) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_AUTHORITY_INCOMPLETE", "RED_QUARANTINED");
      for (const authority of environmentDirectoryAuthorities) assertEnvironmentDirectoryCurrent(authority);
      assertEnvironmentRootCurrent();
      return true;
    } catch (error) {
      if (error instanceof HostBindingError) throw error;
      throw new HostBindingError("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_UNREADABLE", "RED_QUARANTINED");
    }
  };
  const closeEnvironmentAuthority = () => {
    if (environmentState === "closed") return true;
    let closeFailed = false;
    for (const authority of [...environmentDirectoryAuthorities].reverse()) {
      if (authority.fd === null) continue;
      try { fs.closeSync(authority.fd); }
      catch { closeFailed = true; }
      authority.fd = null;
    }
    if (environmentRootAuthority?.fd !== null && environmentRootAuthority?.fd !== undefined) {
      try { fs.closeSync(environmentRootAuthority.fd); }
      catch { closeFailed = true; }
      environmentRootAuthority.fd = null;
    }
    environmentState = "closed";
    if (closeFailed) fail("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_CLOSE_UNCERTAIN", "RED_QUARANTINED");
    return true;
  };
  const prepareEnvironment = async (authority) => {
    if (authority === null || typeof authority !== "object" || Array.isArray(authority)) fail("HOST_INSPECTOR_ENVIRONMENT_PREPARE_AUTHORITY_INVALID", "RED");
    exactKeys(authority, new Set(["reattemptRunId"]), "HOST_INSPECTOR_ENVIRONMENT_PREPARE_AUTHORITY_SHAPE", "RED");
    if (!ID.test(authority.reattemptRunId) || environmentState !== "unprepared" || attemptedCommandIds.size !== 0 || typeof fs.constants.O_DIRECTORY !== "number" || typeof fs.constants.O_NOFOLLOW !== "number") fail("HOST_INSPECTOR_ENVIRONMENT_PREPARE_AUTHORITY_INVALID", "RED");
    environmentReattemptRunId = authority.reattemptRunId;
    environmentState = "preparing";
    try {
      const rootBefore = fs.lstatSync(canonicalRoot);
      const rootIdentity = hostInspectorStructuralDirectoryIdentity(rootBefore);
      const rootFd = fs.openSync(canonicalRoot, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
      environmentRootAuthority = { fd: rootFd, identity: rootIdentity };
      assertEnvironmentRootCurrent();
      preparedEnvironment = inspectorEnvironment(canonicalRoot);
      for (const spec of HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS) {
        const intentSha256 = hostBindingReattemptEnvironmentDirectoryIntentSha256(environmentReattemptRunId, spec.name);
        try {
          await journal({
            lane: "host-binding",
            event: `environment-directory-create-intent:${spec.name}`,
            hostBindingId: null,
            commandShapeSha256: intentSha256,
            processGroupId: null,
            ownedResources: [spec.ownedResource],
            terminalCode: null,
            cleanupState: "required",
          });
        } catch { fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_INTENT_JOURNAL_FAILED", "RED_QUARANTINED"); }
        assertEnvironmentRootCurrent();
        const directory = path.join(canonicalRoot, spec.name);
        try { fs.mkdirSync(directory, { recursive: false, mode: 0o700 }); }
        catch (error) {
          if (error?.code === "EEXIST") fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_PREEXISTS", "RED_QUARANTINED");
          fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_CREATE_FAILED", "RED_QUARANTINED");
        }
        let directoryFd = null;
        try {
          const created = fs.lstatSync(directory);
          const createdIdentity = hostInspectorStructuralDirectoryIdentity(created);
          if (fs.realpathSync(directory) !== directory) fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_CREATE_IDENTITY_INVALID", "RED_QUARANTINED");
          directoryFd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
          const authority = {
            spec,
            path: directory,
            fd: directoryFd,
            identity: createdIdentity,
            identitySha256: hostBindingReattemptEnvironmentDirectoryIdentitySha256(environmentReattemptRunId, spec.name, created),
          };
          environmentDirectoryAuthorities.push(authority);
          directoryFd = null;
          assertEnvironmentDirectoryCurrent(authority);
          fs.fsyncSync(authority.fd);
          fs.fsyncSync(environmentRootAuthority.fd);
          assertEnvironmentRootCurrent();
          assertEnvironmentDirectoryCurrent(authority);
          const observation = Object.freeze({
            reattemptRunId: environmentReattemptRunId,
            environmentKey: spec.environmentKey,
            name: spec.name,
            ownedResource: spec.ownedResource,
            identitySha256: authority.identitySha256,
          });
          try {
            await journal({
              lane: "host-binding",
              event: `environment-directory-created:${spec.name}`,
              hostBindingId: null,
              commandShapeSha256: authority.identitySha256,
              processGroupId: null,
              ownedResources: [spec.ownedResource],
              terminalCode: "CREATED",
              cleanupState: "required",
            });
          } catch { fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_CREATED_JOURNAL_FAILED", "RED_QUARANTINED"); }
          environmentDirectoryObservations.push(observation);
          assertEnvironmentRootCurrent();
          assertEnvironmentDirectoryCurrent(authority);
        } finally {
          if (directoryFd !== null) try { fs.closeSync(directoryFd); } catch { fail("HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_AUTHORITY_CLOSE_UNCERTAIN", "RED_QUARANTINED"); }
        }
      }
      environmentState = "prepared";
      assertEnvironmentCurrentCore();
      return Object.freeze({ environment: preparedEnvironment, directories: Object.freeze([...environmentDirectoryObservations]) });
    } catch (error) {
      environmentState = "quarantined";
      if (error instanceof HostBindingError) throw error;
      throw new HostBindingError("HOST_INSPECTOR_ENVIRONMENT_PREPARE_FAILED", "RED_QUARANTINED");
    }
  };
  const snapshot = () => Object.freeze({
    dockerCliStarts,
    localDockerUnixSocketRequests,
    macosInspectorStarts,
    activeProcessGroups: activeProcessGroups.size,
    unknownProcessGroups: unknownProcessGroups.size,
    cleanupState: unknownProcessGroups.size > 0 ? "unknown" : activeProcessGroups.size > 0 ? "active" : "observed-absent",
    quarantineState: unknownProcessGroups.size > 0 ? "quarantined" : "none",
  });
  const recordStartCounters = (dockerCommand, dockerSocketCommand, macosCommand) => {
    dockerCliStarts += Number(dockerCommand);
    localDockerUnixSocketRequests += Number(dockerSocketCommand);
    macosInspectorStarts += Number(macosCommand);
  };
  const conservativeStartFailure = (commandId, dockerCommand, dockerSocketCommand, macosCommand) => {
    recordStartCounters(dockerCommand, dockerSocketCommand, macosCommand);
    const token = `unreturned-process-port:${commandId}`;
    activeProcessGroups.add(token);
    unknownProcessGroups.add(token);
  };
  return Object.freeze({
    prepareEnvironment,
    assertEnvironmentCurrent: assertEnvironmentCurrentCore,
    closeEnvironmentAuthority,
    environmentDirectoryObservations: () => Object.freeze([...environmentDirectoryObservations]),
    async run(command, guards = []) {
      try {
        exactKeys(command, new Set(["id", "executable", "argv", "deadlineMilliseconds", "stdoutLimitBytes", "environment"]), "HOST_INSPECTOR_COMMAND_SHAPE");
        if (!path.isAbsolute(command.executable) || !Array.isArray(command.argv) || command.argv.some((v) => typeof v !== "string") || !Array.isArray(guards) || guards.some((guard) => typeof guard !== "function")) fail("HOST_INSPECTOR_COMMAND_INVALID");
        const dockerCommand = DOCKER_INSPECTOR_IDS.has(command.id);
        const dockerSocketCommand = DOCKER_SOCKET_INSPECTOR_IDS.has(command.id);
        const macosCommand = MACOS_INSPECTOR_IDS.has(command.id);
        if ((!dockerCommand && !macosCommand) || (dockerCommand && macosCommand) || attemptedCommandIds.has(command.id) || command.id !== HOST_INSPECTOR_SEQUENCE[attemptedCommandIds.size] || dockerCliStarts + Number(dockerCommand) > 3 || localDockerUnixSocketRequests + Number(dockerSocketCommand) > 2 || macosInspectorStarts + Number(macosCommand) > 9) fail("HOST_INSPECTOR_COMMAND_CEILING_INVALID", "RED");
      if (environmentState !== "unprepared") {
        assertEnvironmentCurrentCore();
        if (canonicalJson(command.environment) !== canonicalJson(preparedEnvironment)) fail("HOST_INSPECTOR_ENVIRONMENT_COMMAND_DRIFT", "RED");
      }
      for (const guard of guards) guard("before-start");
      if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
      attemptedCommandIds.add(command.id);
      const commandShapeSha256 = sha256(Buffer.from(canonicalJson(command), "utf8"));
      const intentRecord = await journal({ lane: "host-binding", event: `intent:${command.id}`, commandShapeSha256, processGroupId: null });
      if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
      const startedAt = clock();
      let child;
      try {
        if (processPort === null || typeof processPort.start !== "function") fail("HOST_INSPECTOR_PROCESS_PORT_MISSING", "RED");
        child = await processPort.start({ family: "host-inspector", logicalId: command.id, startSequence: intentRecord.sequence, commandShapeSha256, executable: command.executable, argv: command.argv, cwd: canonicalRoot, environment: command.environment, stdio: ["ignore", "pipe", "pipe"], targetStdioCount: 3 });
      }
      catch (error) {
        if (error && typeof error === "object" && typeof error.verdict === "string") {
          if (error.logicalStartObserved === true) {
            recordStartCounters(dockerCommand, dockerSocketCommand, macosCommand);
            if (error.processGroupState !== "observed-absent") {
              const token = `unreturned-process-port:${command.id}`;
              activeProcessGroups.add(token);
              if (error.processGroupState !== "not-started") unknownProcessGroups.add(token);
            }
          } else if (error.logicalStartObserved !== false && error.verdict.includes("QUARANTINED")) conservativeStartFailure(command.id, dockerCommand, dockerSocketCommand, macosCommand);
          const conservative = snapshot();
          let partial = conservative;
          if (error.partialObservation !== undefined && error.partialObservation !== null) {
            let supplied;
            try { supplied = validateHostInspectorSnapshot(error.partialObservation); }
            catch { throw new HostBindingError("HOST_INSPECTOR_PROCESS_PORT_PARTIAL_INVALID", "RED", conservative); }
            const lowerBoundKeys = ["dockerCliStarts", "localDockerUnixSocketRequests", "macosInspectorStarts", "activeProcessGroups", "unknownProcessGroups"];
            if (lowerBoundKeys.some((key) => supplied[key] < conservative[key])) throw new HostBindingError("HOST_INSPECTOR_PROCESS_PORT_PARTIAL_REGRESSION", "RED", conservative);
            partial = supplied;
          }
          const code = typeof error.code === "string" && /^[A-Z][A-Z0-9_:-]{0,127}$/u.test(error.code) ? error.code : "HOST_INSPECTOR_PROCESS_PORT_FAILED";
          let verdict = error.verdict;
          let closure = null;
          if (error.logicalStartObserved === false && error.processGroupState === "not-started") {
            closure = { lane: "host-binding", event: `not-started:${command.id}`, commandShapeSha256, processGroupId: null, terminalCode: "NOT_STARTED", cleanupState: "observed-absent" };
          } else if (error.logicalStartObserved === true && error.processGroupState === "observed-absent" && Number.isSafeInteger(error.processGroupId) && error.processGroupId > 1) {
            closure = { lane: "host-binding", event: `cleanup-observed-absent:${command.id}`, commandShapeSha256, processGroupId: error.processGroupId, terminalCode: "ABSENT", cleanupState: "observed-absent" };
          }
          if (closure !== null) {
            try { await journal(closure); }
            catch { verdict = "RED_QUARANTINED"; }
          }
          throw new HostBindingError(code, verdict, partial);
        }
        fail("HOST_INSPECTOR_SPAWN_FAILED");
      }
      const destroyOwnedStdio = () => {
        for (const stream of [child?.stdout, child?.stderr]) try { stream?.destroy(); } catch { /* cleanup authority remains the live child handle */ }
      };
      if (!Number.isInteger(child.pid)) {
        destroyOwnedStdio();
        const absent = typeof child.abortBeforeRelease === "function" ? await child.abortBeforeRelease() : false;
        recordStartCounters(dockerCommand, dockerSocketCommand, macosCommand);
        if (!absent) {
          const token = `invalid-pid:${command.id}`;
          activeProcessGroups.add(token); unknownProcessGroups.add(token);
        }
        fail("HOST_INSPECTOR_PID_MISSING", absent ? "RED" : "RED_QUARANTINED");
      }
      recordStartCounters(dockerCommand, dockerSocketCommand, macosCommand);
      activeProcessGroups.add(child.pid);
      const stdout = [];
      const stderr = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let overflow = false;
      const stop = (signal) => typeof child.signalGroup === "function" ? child.signalGroup(signal) : false;
      let stdioDestroyed = false;
      let termSent = false;
      let killSent = false;
      let stopNoticeResolve;
      const stopNotice = new Promise((resolve) => { stopNoticeResolve = resolve; });
      const closeOwnedStdio = () => {
        if (stdioDestroyed) return;
        stdioDestroyed = true;
        destroyOwnedStdio();
      };
      const requestTerm = () => {
        closeOwnedStdio();
        if (!termSent) { termSent = true; stop("SIGTERM"); }
        stopNoticeResolve("STOP_REQUESTED");
      };
      const requestKill = () => {
        closeOwnedStdio();
        if (!killSent) { killSent = true; stop("SIGKILL"); }
      };
      child.stdout.on("data", (chunk) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > command.stdoutLimitBytes) { overflow = true; requestTerm(); }
        else stdout.push(Buffer.from(chunk));
      });
      child.stderr.on("data", (chunk) => {
        stderrBytes += chunk.length;
        if (stderr.length === 0 && chunk.length > 0) stderr.push(Buffer.from(chunk.subarray(0, 1)));
        requestTerm();
      });
      const closed = new Promise((resolve) => {
        let settled = false;
        child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
        child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
      });
      const awaitClosedWithin = async (milliseconds) => {
        let timeout;
        try { return await Promise.race([closed, new Promise((resolve) => { timeout = setTimeout(() => resolve(null), milliseconds); })]); }
        finally { clearTimeout(timeout); }
      };
      try {
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        await journal({ lane: "host-binding", event: `started:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid });
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        for (const guard of guards) guard("after-start");
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        if (typeof child.release !== "function") fail("HOST_INSPECTOR_RELEASE_PORT_MISSING", "RED");
        await child.release();
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
      } catch (error) {
        closeOwnedStdio();
        const absent = typeof child.abortBeforeRelease === "function" ? await child.abortBeforeRelease() : false;
        if (absent) {
          await journal({ lane: "host-binding", event: `cleanup-observed-absent:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid, terminalCode: "ABSENT", cleanupState: "observed-absent" });
          if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
          activeProcessGroups.delete(child.pid);
        } else unknownProcessGroups.add(child.pid);
        throw error;
      }
      let timer;
      let terminal = await Promise.race([closed, stopNotice, new Promise((resolve) => { timer = setTimeout(() => resolve(null), command.deadlineMilliseconds); })]);
      clearTimeout(timer);
      let timedOut = terminal === null;
      if (terminal === "STOP_REQUESTED") terminal = null;
      if (terminal === null || overflow || stderrBytes !== 0) {
        requestTerm();
        terminal = await awaitClosedWithin(INSPECTOR_LIMITS.termGraceMilliseconds);
        if (terminal === null) {
          requestKill();
          terminal = await awaitClosedWithin(INSPECTOR_LIMITS.killGraceMilliseconds);
        }
      }
      closeOwnedStdio();
      const absent = typeof child.stopAndProveAbsent === "function" ? await child.stopAndProveAbsent() : false;
      if (absent) { activeProcessGroups.delete(child.pid); unknownProcessGroups.delete(child.pid); }
      else unknownProcessGroups.add(child.pid);
      const out = Buffer.concat(stdout); const err = Buffer.concat(stderr);
      try {
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        for (const guard of guards) guard("after-terminal");
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        try {
          await journal({ lane: "host-binding", event: `terminal:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid, terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
          if (absent && typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
          if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        } catch (error) {
          if (absent) {
            await journal({ lane: "host-binding", event: `cleanup-observed-absent:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid, terminalCode: "ABSENT", cleanupState: "observed-absent" });
            if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
          }
          throw error;
        }
        if (!absent) fail("HOST_INSPECTOR_GROUP_ABSENCE_UNKNOWN", "YELLOW_QUARANTINED");
        if (terminal === null || terminal.error || terminal.code !== 0 || terminal.signal !== null || timedOut || overflow || stderrBytes !== 0 || err.length !== 0 || out.length > command.stdoutLimitBytes || clock() - startedAt > command.deadlineMilliseconds + INSPECTOR_LIMITS.termGraceMilliseconds + INSPECTOR_LIMITS.killGraceMilliseconds) fail("HOST_INSPECTOR_TERMINAL_INVALID", "YELLOW_NO_RETRY");
        await journal({ lane: "host-binding", event: `observed:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid, terminalCode: "0", cleanupState: "observed-absent" });
        if (environmentState !== "unprepared") assertEnvironmentCurrentCore();
        return out.toString("utf8");
      } finally { out.fill(0); err.fill(0); for (const part of stdout) part.fill(0); for (const part of stderr) part.fill(0); }
      } catch (error) {
        if (environmentState !== "unprepared") {
          try { assertEnvironmentCurrentCore(); }
          catch (authorityError) {
            if (authorityError instanceof HostBindingError) throw authorityError.attachPartialObservation(snapshot());
            throw new HostBindingError("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_UNREADABLE", "RED_QUARANTINED", snapshot());
          }
        }
        if (error instanceof HostBindingError) throw error.attachPartialObservation(snapshot());
        throw new HostBindingError("HOST_INSPECTOR_UNEXPECTED_FAILURE", "RED", snapshot());
      }
    },
    snapshot,
  });
}

function inspectorEnvironment(tempRoot) {
  return Object.freeze({ HOME: path.join(tempRoot, "home"), DOCKER_CONFIG: path.join(tempRoot, "docker-config"), TMPDIR: path.join(tempRoot, "tmp"), PATH: MINIMAL_PATH });
}
function command(id, executable, argv, limits, environment) {
  return Object.freeze({ id, executable, argv: Object.freeze(argv), deadlineMilliseconds: limits.deadlineMilliseconds, stdoutLimitBytes: limits.stdoutLimitBytes, environment });
}
function assertCheckpoint(checkpoint) {
  exactKeys(checkpoint, new Set(["schemaVersion", "constructionRunId", "approvedDecisionBriefSha256", "constructionPacketSha256", "constructionOwnerReviewSha256", "approvedProposalHead", "approvedProposalTree", "implementationHead", "implementationTree", "physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexProfileSha256", "runtimeDependencyCount", "runtimeDependencyAggregateSha256", "runtimeDependencies", "validationAggregateSha256", "auditReceipts"]), "HOST_BINDING_CHECKPOINT_SHAPE");
  if (checkpoint.schemaVersion !== "r4_gate_b_physical_construction_checkpoint.v1" || checkpoint.constructionRunId !== HOST_BINDING_AUTHORITY.constructionRunId || checkpoint.approvedDecisionBriefSha256 !== HOST_BINDING_AUTHORITY.decisionBriefSha256 || checkpoint.constructionPacketSha256 !== HOST_BINDING_AUTHORITY.constructionPacketSha256 || checkpoint.constructionOwnerReviewSha256 !== HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256 || checkpoint.approvedProposalHead !== HOST_BINDING_AUTHORITY.approvedProposalHead || checkpoint.approvedProposalTree !== HOST_BINDING_AUTHORITY.approvedProposalTree || !GIT.test(checkpoint.implementationHead) || !GIT.test(checkpoint.implementationTree)) fail("HOST_BINDING_CHECKPOINT_DRIFT");
  for (const key of ["physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexProfileSha256", "runtimeDependencyAggregateSha256", "validationAggregateSha256"]) if (!SHA.test(checkpoint[key])) fail("HOST_BINDING_CHECKPOINT_HASH_INVALID");
  const actualRuntime = runtimeDependencyInventory();
  if (checkpoint.runtimeDependencyCount !== actualRuntime.fileCount || checkpoint.runtimeDependencyAggregateSha256 !== actualRuntime.aggregateSha256 || canonicalJson(checkpoint.runtimeDependencies) !== canonicalJson(actualRuntime.files)) fail("HOST_BINDING_CHECKPOINT_RUNTIME_DEPENDENCY_DRIFT", "RED");
  return checkpoint;
}
function assertHostBindingReattemptCheckpoint(checkpoint) {
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-checkpoint.schema.json", checkpoint, "HOST_BINDING_REATTEMPT_CHECKPOINT_SCHEMA_INVALID");
  const actualRuntime = runtimeDependencyInventory();
  if (checkpoint.runtimeDependencyCount !== actualRuntime.fileCount || checkpoint.runtimeDependencyAggregateSha256 !== actualRuntime.aggregateSha256 || canonicalJson(checkpoint.runtimeDependencies) !== canonicalJson(actualRuntime.files)) fail("HOST_BINDING_REATTEMPT_CHECKPOINT_RUNTIME_DEPENDENCY_DRIFT", "RED");
  const runtimeHashes = new Map(checkpoint.runtimeDependencies.map((entry) => [entry.path, entry.sha256]));
  for (const [field, relativePath] of Object.entries({
    physicalRunnerSha256: "scripts/r4-gate-b-physical-runner.mjs",
    hostBindingModuleSha256: "scripts/r4-gate-b-host-binding.mjs",
    physicalPortSha256: "scripts/r4-gate-b-physical-port.mjs",
    runnerContractSha256: "schemas/r4/gate-b-core/physical-runner-contract.json",
    codexProfileSha256: "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb",
  })) if (runtimeHashes.get(relativePath) !== checkpoint[field]) fail("HOST_BINDING_REATTEMPT_CHECKPOINT_RUNTIME_HASH_DRIFT", "RED");
  return checkpoint;
}
function legacyCheckpointViewOfReattempt(checkpoint) {
  return Object.freeze({
    schemaVersion: "r4_gate_b_physical_construction_checkpoint.v1",
    constructionRunId: HOST_BINDING_AUTHORITY.constructionRunId,
    approvedDecisionBriefSha256: HOST_BINDING_AUTHORITY.decisionBriefSha256,
    constructionPacketSha256: HOST_BINDING_AUTHORITY.constructionPacketSha256,
    constructionOwnerReviewSha256: HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256,
    approvedProposalHead: HOST_BINDING_AUTHORITY.approvedProposalHead,
    approvedProposalTree: HOST_BINDING_AUTHORITY.approvedProposalTree,
    implementationHead: checkpoint.implementationHead,
    implementationTree: checkpoint.implementationTree,
    physicalRunnerSha256: checkpoint.physicalRunnerSha256,
    hostBindingModuleSha256: checkpoint.hostBindingModuleSha256,
    physicalPortSha256: checkpoint.physicalPortSha256,
    runnerContractSha256: checkpoint.runnerContractSha256,
    codexProfileSha256: checkpoint.codexProfileSha256,
    runtimeDependencyCount: checkpoint.runtimeDependencyCount,
    runtimeDependencyAggregateSha256: checkpoint.runtimeDependencyAggregateSha256,
    runtimeDependencies: checkpoint.runtimeDependencies,
    validationAggregateSha256: checkpoint.validationAggregateSha256,
    auditReceipts: Object.freeze({ postgres: checkpoint.validationReceiptSha256, codexUnified: checkpoint.authorityAuditReceiptSha256, macosAuthority: checkpoint.hostAuditReceiptSha256 }),
  });
}

async function finalizeHostBindingCore({ repositoryRoot, constructionRoot, checkpoint, ownerInput, inspector, now = () => new Date(), randomBytes = crypto.randomBytes }, environmentAuthority = null) {
  if (typeof inspector?.run !== "function" || typeof inspector?.snapshot !== "function" || (environmentAuthority !== null && (typeof inspector?.prepareEnvironment !== "function" || typeof inspector?.assertEnvironmentCurrent !== "function" || typeof inspector?.closeEnvironmentAuthority !== "function"))) fail("HOST_INSPECTOR_PORT_INVALID", "RED");
  if (environmentAuthority !== null) {
    exactKeys(environmentAuthority, new Set(["reattemptRunId"]), "HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_SHAPE", "RED");
    if (!ID.test(environmentAuthority.reattemptRunId)) fail("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_INVALID", "RED");
  }
  const assertPreparedEnvironmentCurrent = () => {
    if (inspector.assertEnvironmentCurrent() !== true) fail("HOST_INSPECTOR_ENVIRONMENT_REVALIDATION_UNCONFIRMED", "RED_QUARANTINED");
  };
  const closePreparedEnvironmentAuthority = () => {
    if (inspector.closeEnvironmentAuthority() !== true) fail("HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_CLOSE_UNCONFIRMED", "RED_QUARANTINED");
  };
  const repo = fs.realpathSync(repositoryRoot);
  const construction = fs.realpathSync(constructionRoot);
  const frozen = assertCheckpoint(checkpoint);
  const input = exactKeys(ownerInput, INPUT_KEYS, "HOST_BINDING_INPUT_SHAPE");
  const finalRevalidator = createHostBindingFinalRevalidator();
  const codexRoot = validateDirectory(input.codexPackageRoot, { owner: "current", deniedRoots: [repo, construction] });
  const socket = finalRevalidator.observeDockerSocket(input.dockerUnixSocket, [repo, construction]);
  const boundFiles = [];
  const bind = (logicalName, filePath, options) => { const observed = finalRevalidator.observeBoundFile(logicalName, filePath, options); boundFiles.push(observed); return observed; };
  const dockerCli = bind("docker-cli", input.dockerCli, { owner: "system-or-current", deniedRoots: [repo, construction] });
  const codexLauncher = bind("codex-launcher", path.join(codexRoot, CODEX_BINDINGS.launcherRelativePath), { owner: "current", expectedSha256: CODEX_BINDINGS.launcherSha256 });
  const codexNative = bind("codex-native", path.join(codexRoot, CODEX_BINDINGS.nativeRelativePath), { owner: "current", expectedSha256: CODEX_BINDINGS.nativeSha256 });
  for (const entry of frozen.runtimeDependencies) bind(runtimeDependencyLogicalName(entry.path), path.join(repo, entry.path), { owner: "current", expectedSha256: entry.sha256 });
  for (const [logical, tool] of Object.entries(SYSTEM_TOOLS)) bind(logical.replace(/[A-Z]/gu, (m) => `-${m.toLowerCase()}`), tool, { owner: "system-or-current" });
  const node = bind("node", process.execPath, { owner: "system-or-current" });
  const guardIdentities = (items) => {
    const snapshots = items.map((item) => ({ item, chain: snapshotPathChain(item.path, "HOST_INSPECTOR_GUARD_PATH_UNSAFE") }));
    return (phase) => {
      const verdict = phase === "before-start" ? "YELLOW_NO_RETRY" : "RED";
      for (const { item, chain } of snapshots) {
        assertPathChainStable(chain, "HOST_INSPECTOR_GUARD_PATH_DRIFT", verdict);
        const observed = statIdentity(fs.lstatSync(item.path));
        if (!sameIdentity(observed, item)) fail("HOST_INSPECTOR_GUARD_IDENTITY_DRIFT", verdict);
      }
    };
  };
  const dockerCliGuard = guardIdentities([dockerCli]);
  const dockerDaemonGuard = guardIdentities([dockerCli, socket]);
  let environmentPreparationStarted = false;
  try {
  const env = inspectorEnvironment(construction);
  if (environmentAuthority === null) {
    fs.mkdirSync(env.HOME, { mode: 0o700 }); fs.mkdirSync(env.DOCKER_CONFIG, { mode: 0o700 }); fs.mkdirSync(env.TMPDIR, { mode: 0o700 });
  } else {
    environmentPreparationStarted = true;
    const preparedInspectorEnvironment = await inspector.prepareEnvironment(environmentAuthority);
    exactKeys(preparedInspectorEnvironment, new Set(["environment", "directories"]), "HOST_INSPECTOR_ENVIRONMENT_PREPARE_RESULT_SHAPE", "RED_QUARANTINED");
    if (canonicalJson(preparedInspectorEnvironment.environment) !== canonicalJson(env) || !Array.isArray(preparedInspectorEnvironment.directories) || preparedInspectorEnvironment.directories.length !== HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.length) fail("HOST_INSPECTOR_ENVIRONMENT_PREPARE_RESULT_INVALID", "RED_QUARANTINED");
    for (const [index, spec] of HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.entries()) {
      const observation = preparedInspectorEnvironment.directories[index];
      exactKeys(observation, new Set(["reattemptRunId", "environmentKey", "name", "ownedResource", "identitySha256"]), "HOST_INSPECTOR_ENVIRONMENT_OBSERVATION_SHAPE", "RED_QUARANTINED");
      if (observation.reattemptRunId !== environmentAuthority.reattemptRunId || observation.environmentKey !== spec.environmentKey || observation.name !== spec.name || observation.ownedResource !== spec.ownedResource || !SHA.test(observation.identitySha256)) fail("HOST_INSPECTOR_ENVIRONMENT_OBSERVATION_INVALID", "RED_QUARANTINED");
    }
    assertPreparedEnvironmentCurrent();
  }
  const dockerClientRaw = await inspector.run(command("docker-client-version", dockerCli.path, ["--version"], INSPECTOR_LIMITS.dockerClient, env), [dockerCliGuard]);
  const dockerClientVersion = parseDockerClientVersion(dockerClientRaw);
  const dockerVersionRaw = await inspector.run(command("docker-daemon-version", dockerCli.path, ["--host", `unix://${socket.path}`, "version", "--format", "{{json .Client.Version}} {{json .Client.APIVersion}} {{json .Server.Version}} {{json .Server.APIVersion}} {{json .Server.Os}} {{json .Server.Arch}}"], INSPECTOR_LIMITS.dockerVersion, env), [dockerDaemonGuard]);
  const dockerVersion = parseDockerVersionObservation(dockerVersionRaw);
  if (dockerClientVersion !== dockerVersion.clientVersion) fail("DOCKER_CLIENT_VERSION_DRIFT", "YELLOW_NO_RETRY");
  const dockerImageRaw = await inspector.run(command("docker-image-observation", dockerCli.path, ["--host", `unix://${socket.path}`, "image", "inspect", "--format", "{{json .RepoDigests}} {{json .Id}} {{json .Os}} {{json .Architecture}} {{json .Size}}", POSTGRES_IMAGE], INSPECTOR_LIMITS.dockerImage, env), [dockerDaemonGuard]);
  const dockerImage = parseDockerImageObservation(dockerImageRaw);
  const macCalls = [
    ["macos-product-version", SYSTEM_TOOLS.swVers, ["-productVersion"], parseMacOSProductVersion], ["macos-build-version", SYSTEM_TOOLS.swVers, ["-buildVersion"], parseMacOSBuildVersion],
    ["macos-architecture", SYSTEM_TOOLS.uname, ["-m"], parseMacOSArchitecture], ["developer-root", SYSTEM_TOOLS.xcodeSelect, ["-p"], parseDeveloperRootObservation],
    ["swiftc-path", SYSTEM_TOOLS.xcrun, ["--find", "swiftc"], parseSwiftcPathObservation], ["sdk-path", SYSTEM_TOOLS.xcrun, ["--sdk", "macosx", "--show-sdk-path"], parseSdkPathObservation],
    ["sdk-version", SYSTEM_TOOLS.xcrun, ["--sdk", "macosx", "--show-sdk-version"], parseSdkVersion],
  ];
  const macOutputs = {};
  for (const [id, executable, argv, parser] of macCalls) {
    const observedTool = boundFiles.find((entry) => entry.path === executable);
    macOutputs[id] = parser(await inspector.run(command(id, executable, argv, INSPECTOR_LIMITS.macos, env), [guardIdentities([observedTool])]));
  }
  const developerRootIdentity = finalRevalidator.observeDirectory("developer-root", macOutputs["developer-root"], { owner: "system-or-current", deniedRoots: [repo, construction] });
  const resolvedSwiftcPath = resolveObservedCanonicalPath(macOutputs["swiftc-path"], "SWIFTC_PATH_INVALID");
  const resolvedSdkPath = resolveObservedCanonicalPath(macOutputs["sdk-path"], "SDK_PATH_INVALID");
  const sdkPathIdentity = finalRevalidator.observeDirectory("sdk-path", resolvedSdkPath, { owner: "system-or-current", deniedRoots: [repo, construction] });
  validateDeveloperToolchainRelationship({ developerRoot: developerRootIdentity.path, swiftcPath: resolvedSwiftcPath, sdkPath: sdkPathIdentity.path, sdkVersion: macOutputs["sdk-version"] });
  const swiftc = bind("swiftc", resolvedSwiftcPath, { owner: "system-or-current", deniedRoots: [repo, construction] });
  const swiftVersion = parseSwiftVersion(await inspector.run(command("swift-version", swiftc.path, ["--version"], INSPECTOR_LIMITS.macos, env), [guardIdentities([swiftc])]));
  const opensslBound = boundFiles.find((entry) => entry.path === SYSTEM_TOOLS.openssl);
  const opensslVersion = parseOpenSSLVersion(await inspector.run(command("openssl-version", SYSTEM_TOOLS.openssl, ["version"], INSPECTOR_LIMITS.macos, env), [guardIdentities([opensslBound])]));
  validateHostInspectorSnapshot(inspector.snapshot(), { complete: true });
  if (environmentAuthority !== null) assertPreparedEnvironmentCurrent();
  finalRevalidator.revalidate();
  const created = now();
  const expires = new Date(created.getTime() + 259_200_000);
  let hostBindingRandom = null;
  let privateSaltRandom = null;
  let hostBindingId;
  let privateSalt;
  try {
    hostBindingRandom = randomBytes(16);
    privateSaltRandom = randomBytes(32);
    if (!Buffer.isBuffer(hostBindingRandom) || hostBindingRandom.length !== 16 || !Buffer.isBuffer(privateSaltRandom) || privateSaltRandom.length !== 32) fail("HOST_BINDING_RANDOM_INVALID", "RED");
    hostBindingId = hostBindingRandom.toString("hex");
    privateSalt = privateSaltRandom.toString("hex");
  } finally {
    hostBindingRandom?.fill(0);
    privateSaltRandom?.fill(0);
  }
  if (!ID.test(hostBindingId) || !/^[0-9a-f]{64}$/u.test(privateSalt)) fail("HOST_BINDING_RANDOM_INVALID", "RED");
  const capsule = Object.freeze({
    schemaVersion: "r4_gate_b_host_binding_capsule.v1", hostBindingId, privateSalt,
    createdAt: created.toISOString(), expiresAt: expires.toISOString(), implementationHead: frozen.implementationHead, implementationTree: frozen.implementationTree, runtimeDependencyAggregateSha256: frozen.runtimeDependencyAggregateSha256,
    authority: Object.freeze({ constructionPacketSha256: HOST_BINDING_AUTHORITY.constructionPacketSha256, constructionOwnerReviewSha256: HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256, approvedProposalHead: HOST_BINDING_AUTHORITY.approvedProposalHead, approvedProposalTree: HOST_BINDING_AUTHORITY.approvedProposalTree, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" }),
    boundFiles: Object.freeze(boundFiles.sort((a, b) => Buffer.compare(Buffer.from(a.logicalName), Buffer.from(b.logicalName)))),
    docker: Object.freeze({ cliPath: dockerCli.path, socketPath: socket.path, socketIdentity: Object.freeze({ size: socket.size, mode: socket.mode, uid: socket.uid, gid: socket.gid, device: socket.device, inode: socket.inode, nlink: socket.nlink, mtimeMilliseconds: socket.mtimeMilliseconds }), ...dockerVersion, ...dockerImage, imageReference: POSTGRES_IMAGE, unixSocketRequests: 2 }),
    macos: Object.freeze({ platform: "darwin-arm64", productVersion: macOutputs["macos-product-version"], buildVersion: macOutputs["macos-build-version"], architecture: "arm64", developerRoot: developerRootIdentity.path, developerRootIdentity, sdkPath: sdkPathIdentity.path, sdkPathIdentity, sdkVersion: macOutputs["sdk-version"], swiftcPath: swiftc.path, swiftVersion, opensslVersion, nodeVersion: process.version, readOnlyInspectionCalls: 9 }),
    invalidationRules: HOST_BINDING_INVALIDATION_RULES,
  });
  if (new Set(boundFiles.map((entry) => entry.logicalName)).size !== boundFiles.length) fail("HOST_BINDING_LOGICAL_NAME_COLLISION", "RED");
  const capsuleBytes = Buffer.from(`${canonicalJson(capsule)}\n`, "utf8");
  let publicReceiptBytes = null;
  let bytesTransferred = false;
  try {
    const capsuleSha256 = sha256(capsuleBytes);
    const publicTools = boundFiles.filter((entry) => !entry.logicalName.startsWith("repo-") && !["docker-cli", "codex-launcher", "codex-native"].includes(entry.logicalName)).map((entry) => Object.freeze({ logicalName: entry.logicalName, version: entry.logicalName === "node" ? process.version : entry.logicalName === "swiftc" ? swiftVersion : entry.logicalName === "openssl" ? opensslVersion : "byte-bound", sha256: entry.sha256 }));
    publicTools.push(Object.freeze({ logicalName: "docker-cli", version: dockerClientVersion, sha256: dockerCli.sha256 }), Object.freeze({ logicalName: "codex-launcher", version: CODEX_BINDINGS.version, sha256: codexLauncher.sha256 }), Object.freeze({ logicalName: "codex-native", version: CODEX_BINDINGS.version, sha256: codexNative.sha256 }));
    publicTools.sort((a, b) => Buffer.compare(Buffer.from(a.logicalName), Buffer.from(b.logicalName)));
    const publicReceipt = Object.freeze({
      schemaVersion: "r4_gate_b_host_binding_public_receipt.v1", hostBindingId, hostBindingCapsuleSha256: capsuleSha256, createdAt: capsule.createdAt, expiresAt: capsule.expiresAt,
      implementationHead: frozen.implementationHead, implementationTree: frozen.implementationTree, runtimeDependencyAggregateSha256: frozen.runtimeDependencyAggregateSha256, platform: "darwin-arm64", tools: Object.freeze(publicTools),
      docker: Object.freeze({ ...dockerVersion, ...dockerImage }),
      closedBoundaries: Object.freeze({ pathsWithheld: true, accountIdentityWithheld: true, credentialsRead: 0, dockerMutationCalls: 0, realCodexCalls: 0, sandboxExecCalls: 0, macosPhysicalCalls: 0 }),
      retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED", providerCalls: 0, providerNetworkAuthority: 0, externalRuntimeNetworkAuthority: 0, localDockerUnixSocketRequests: 2, aggregateVerdict: "YELLOW",
    });
    publicReceiptBytes = Buffer.from(`${canonicalJson(publicReceipt)}\n`, "utf8");
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-capsule.schema.json", capsule, "HOST_BINDING_CAPSULE_SCHEMA_INVALID");
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-public-receipt.schema.json", publicReceipt, "HOST_BINDING_PUBLIC_RECEIPT_SCHEMA_INVALID");
    if (environmentPreparationStarted) {
      assertPreparedEnvironmentCurrent();
      closePreparedEnvironmentAuthority();
      environmentPreparationStarted = false;
    }
    bytesTransferred = true;
    return Object.freeze({ capsule, capsuleBytes, capsuleSha256, publicReceipt, publicReceiptBytes, hostBindingId, expiresAt: capsule.expiresAt });
  } finally {
    if (!bytesTransferred) {
      capsuleBytes.fill(0);
      publicReceiptBytes?.fill(0);
    }
  }
  } finally {
    if (environmentPreparationStarted) closePreparedEnvironmentAuthority();
  }
}

async function finalizeHostBindingWithEnvironmentAuthority(options, environmentAuthority = null) {
  try { return await finalizeHostBindingCore(options, environmentAuthority); }
  catch (error) {
    if (error instanceof HostBindingError) {
      if (typeof options?.inspector?.snapshot === "function") error.attachPartialObservation(options.inspector.snapshot());
      throw error;
    }
    const observation = typeof options?.inspector?.snapshot === "function" ? validateHostInspectorSnapshot(options.inspector.snapshot()) : null;
    throw new HostBindingError("HOST_BINDING_UNEXPECTED_FAILURE", "RED", observation);
  }
}
export async function finalizeHostBinding(options) { return await finalizeHostBindingWithEnvironmentAuthority(options); }

export function buildHostBindingReattemptOutputFrames({ frozen, legacy, checkpointSha256, activationCardSha256, activationGrantSha256, consumedAttemptTombstoneSha256, attemptId }) {
  const authority = Object.freeze({
    reattemptPacketSha256: frozen.reattemptPacketSha256,
    reattemptOwnerReviewSha256: frozen.reattemptOwnerReviewSha256,
    approvedProposalHead: frozen.approvedProposalHead,
    approvedProposalTree: frozen.approvedProposalTree,
    hostBindingAttemptGrant: "APPROVED_ONCE",
    retryExecutionGrant: "NOT_REQUESTED",
    firstProviderCallGrant: "NOT_REQUESTED",
  });
  const closedCounters = Object.freeze({
    dockerReadOnlyCliCalls: 3,
    localDockerUnixSocketRequests: 2,
    macosReadOnlyInspectionCalls: 9,
    dockerMutationCalls: 0,
    credentialsRead: 0,
    realPhysicalEffects: 0,
    realCodexCalls: 0,
    sandboxExecCalls: 0,
    signingCalls: 0,
    keychainCalls: 0,
    localAuthenticationCalls: 0,
    retryExecutions: 0,
    providerCalls: 0,
    externalRuntimeNetworkCalls: 0,
  });
  let capsuleBytes = null;
  let publicReceiptBytes = null;
  let transferred = false;
  try {
    const capsule = deepFreezeJson({
      schemaVersion: "r4_gate_b_host_binding_reattempt_capsule.v2",
      reattemptRunId: frozen.reattemptRunId,
      attemptId,
      attemptOrdinal: 2,
      cumulativeHostBindingAttemptCeiling: 2,
      hostBindingId: legacy.hostBindingId,
      privateSalt: legacy.capsule.privateSalt,
      createdAt: legacy.capsule.createdAt,
      expiresAt: legacy.capsule.expiresAt,
      implementationHead: frozen.implementationHead,
      implementationTree: frozen.implementationTree,
      checkpointSha256,
      activationCardSha256,
      activationGrantSha256,
      consumedAttemptTombstoneSha256,
      runtimeDependencyAggregateSha256: frozen.runtimeDependencyAggregateSha256,
      authority,
      boundFiles: legacy.capsule.boundFiles,
      docker: legacy.capsule.docker,
      macos: legacy.capsule.macos,
      closedCounters,
      invalidationRules: HOST_BINDING_INVALIDATION_RULES,
    });
    capsuleBytes = Buffer.from(`${canonicalJson(capsule)}\n`, "utf8");
    const capsuleSha256 = sha256(capsuleBytes);
    const publicReceipt = deepFreezeJson({
      schemaVersion: "r4_gate_b_host_binding_reattempt_public_receipt.v2",
      reattemptRunId: frozen.reattemptRunId,
      attemptId,
      attemptOrdinal: 2,
      cumulativeHostBindingAttemptCeiling: 2,
      hostBindingId: legacy.hostBindingId,
      hostBindingCapsuleSha256: capsuleSha256,
      consumedAttemptTombstoneSha256,
      createdAt: legacy.publicReceipt.createdAt,
      expiresAt: legacy.publicReceipt.expiresAt,
      implementationHead: frozen.implementationHead,
      implementationTree: frozen.implementationTree,
      checkpointSha256,
      activationCardSha256,
      activationGrantSha256,
      runtimeDependencyAggregateSha256: frozen.runtimeDependencyAggregateSha256,
      platform: legacy.publicReceipt.platform,
      tools: legacy.publicReceipt.tools,
      docker: legacy.publicReceipt.docker,
      closedBoundaries: Object.freeze({ pathsWithheld: true, accountIdentityWithheld: true, ...closedCounters }),
      hostBindingAttemptGrant: "APPROVED_ONCE",
      retryExecutionGrant: "NOT_REQUESTED",
      firstProviderCallGrant: "NOT_REQUESTED",
      status: "HOST_BOUND_YELLOW",
      aggregateVerdict: "YELLOW",
    });
    publicReceiptBytes = Buffer.from(`${canonicalJson(publicReceipt)}\n`, "utf8");
    const publicReceiptSha256 = sha256(publicReceiptBytes);
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-capsule.schema.json", capsule, "HOST_BINDING_REATTEMPT_CAPSULE_SCHEMA_INVALID");
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-public-receipt.schema.json", publicReceipt, "HOST_BINDING_REATTEMPT_PUBLIC_RECEIPT_SCHEMA_INVALID");
    transferred = true;
    return Object.freeze({ capsule, capsuleBytes, capsuleSha256, publicReceipt, publicReceiptBytes, publicReceiptSha256, hostBindingId: legacy.hostBindingId, expiresAt: capsule.expiresAt });
  } finally {
    if (!transferred) {
      capsuleBytes?.fill(0);
      publicReceiptBytes?.fill(0);
    }
  }
}

export async function finalizeHostBindingReattempt({
  repositoryRoot,
  reattemptRoot,
  checkpoint,
  checkpointSha256,
  activationCardSha256,
  activationGrantSha256,
  consumedAttemptTombstoneSha256,
  attemptId,
  ownerInput,
  inspector,
  now = () => new Date(),
  randomBytes = crypto.randomBytes,
}) {
  const frozen = assertHostBindingReattemptCheckpoint(checkpoint);
  for (const value of [checkpointSha256, activationCardSha256, activationGrantSha256, consumedAttemptTombstoneSha256]) if (!SHA.test(value)) fail("HOST_BINDING_REATTEMPT_FINALIZATION_HASH_INVALID", "RED");
  if (!ID.test(attemptId)) fail("HOST_BINDING_REATTEMPT_ATTEMPT_ID_INVALID", "RED");
  if (sha256(Buffer.from(`${canonicalJson(frozen)}\n`, "utf8")) !== checkpointSha256) fail("HOST_BINDING_REATTEMPT_CHECKPOINT_HASH_MISMATCH", "RED");
  if (deriveHostBindingReattemptAttemptId({ reattemptPacketSha256: frozen.reattemptPacketSha256, reattemptOwnerReviewSha256: frozen.reattemptOwnerReviewSha256, approvedProposalHead: frozen.approvedProposalHead, implementationHead: frozen.implementationHead, checkpointSha256 }) !== attemptId) fail("HOST_BINDING_REATTEMPT_ATTEMPT_ID_MISMATCH", "RED");
  assertHostBindingReattemptActivationGrantHash({ activationCardSha256, checkpointSha256, implementationHead: frozen.implementationHead, implementationTree: frozen.implementationTree }, activationGrantSha256);
  exactKeys(ownerInput, INPUT_KEYS, "HOST_BINDING_INPUT_SHAPE");
  if (ownerInput.schemaVersion !== "r4_gate_b_host_binding_reattempt_input.v2") fail("HOST_BINDING_INPUT_VERSION");
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json", ownerInput, "HOST_BINDING_REATTEMPT_INPUT_SCHEMA_INVALID");
  const legacy = await finalizeHostBindingWithEnvironmentAuthority(
    { repositoryRoot, constructionRoot: reattemptRoot, checkpoint: legacyCheckpointViewOfReattempt(frozen), ownerInput, inspector, now, randomBytes },
    Object.freeze({ reattemptRunId: frozen.reattemptRunId }),
  );
  try {
    return buildHostBindingReattemptOutputFrames({ frozen, legacy, checkpointSha256, activationCardSha256, activationGrantSha256, consumedAttemptTombstoneSha256, attemptId });
  } finally {
    legacy.capsuleBytes.fill(0);
    legacy.publicReceiptBytes.fill(0);
  }
}

export function assertHostBindingCapsuleAuthority(capsule) {
  if (capsule === null || typeof capsule !== "object" || Array.isArray(capsule) || capsule.authority === null || typeof capsule.authority !== "object" || Array.isArray(capsule.authority)) fail("HOST_BINDING_CAPSULE_AUTHORITY_DRIFT", "RED");
  const authority = capsule.authority;
  if (authority.constructionPacketSha256 !== HOST_BINDING_AUTHORITY.constructionPacketSha256 || authority.constructionOwnerReviewSha256 !== HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256 || authority.approvedProposalHead !== HOST_BINDING_AUTHORITY.approvedProposalHead || authority.approvedProposalTree !== HOST_BINDING_AUTHORITY.approvedProposalTree || authority.retryExecutionGrant !== "NOT_REQUESTED" || authority.firstProviderCallGrant !== "NOT_REQUESTED") fail("HOST_BINDING_CAPSULE_AUTHORITY_DRIFT", "RED");
  if (canonicalJson(capsule.invalidationRules) !== canonicalJson(HOST_BINDING_INVALIDATION_RULES)) fail("HOST_BINDING_CAPSULE_INVALIDATION_RULE_DRIFT", "RED");
  return true;
}

export function readAndRevalidateHostBindingCapsule({ capsulePath, expectedHostBindingId, now = () => new Date(), allowExpiredForCleanup = false }) {
  const exact = assertAbsoluteLiteral(capsulePath, "HOST_BINDING_CAPSULE_PATH_INVALID");
  const capsuleChain = snapshotPathChain(exact, "HOST_BINDING_CAPSULE_PATH_SYMLINKED");
  const before = fs.lstatSync(exact);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.uid !== currentUid() || (before.mode & 0o777) !== 0o600 || before.size < 1 || before.size > 2_097_152) fail("HOST_BINDING_CAPSULE_FILE_UNSAFE", "RED");
  const fd = fs.openSync(exact, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(before.size);
  const trailing = Buffer.alloc(1);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("HOST_BINDING_CAPSULE_SHORT_READ", "RED");
      offset += count;
    }
    if (fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("HOST_BINDING_CAPSULE_TRAILING_READ", "RED");
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(fs.lstatSync(exact));
    assertPathChainStable(capsuleChain, "HOST_BINDING_CAPSULE_PATH_CHAIN_DRIFT", "RED");
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(before))) fail("HOST_BINDING_CAPSULE_TOCTOU", "RED");
    if (bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x00)) fail("HOST_BINDING_CAPSULE_FRAMING", "RED");
    let capsule;
    try { capsule = parseStrictJson(bytes.subarray(0, -1).toString("utf8")); } catch { fail("HOST_BINDING_CAPSULE_JSON_INVALID", "RED"); }
    if (`${canonicalJson(capsule)}\n` !== bytes.toString("utf8")) fail("HOST_BINDING_CAPSULE_NOT_CANONICAL", "RED");
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-capsule.schema.json", capsule, "HOST_BINDING_CAPSULE_SCHEMA_INVALID");
    assertHostBindingCapsuleAuthority(capsule);
    if (!allowExpiredForCleanup) {
      const runtime = runtimeDependencyInventory();
      if (capsule.runtimeDependencyAggregateSha256 !== runtime.aggregateSha256) fail("HOST_BINDING_RUNTIME_DEPENDENCY_DRIFT", "YELLOW_NO_RETRY");
    }
    if (capsule.hostBindingId !== expectedHostBindingId || !ID.test(expectedHostBindingId)) fail("HOST_BINDING_CAPSULE_ID_MISMATCH", "RED");
    const created = Date.parse(capsule.createdAt);
    const expires = Date.parse(capsule.expiresAt);
    const observedNow = now().getTime();
    if (!Number.isFinite(created) || !Number.isFinite(expires) || expires - created !== 259_200_000 || (!allowExpiredForCleanup && (observedNow >= expires || observedNow < created))) fail("HOST_BINDING_CAPSULE_EXPIRED_OR_CLOCK_INVALID", "YELLOW_NO_RETRY");
    for (const expected of capsule.boundFiles) {
      if (allowExpiredForCleanup && expected.logicalName.startsWith("repo-")) continue;
      const owner = ["codex-launcher", "codex-native"].includes(expected.logicalName) || expected.path.startsWith(`${REPOSITORY_ROOT}${path.sep}`) ? "current" : "system-or-current";
      const observed = readBoundRegularFile(expected.logicalName, expected.path, { owner, expectedSha256: expected.sha256 });
      if (!sameIdentity(observed, expected) || observed.sha256 !== expected.sha256 || observed.logicalName !== expected.logicalName || observed.path !== expected.path) fail("HOST_BINDING_BOUND_FILE_DRIFT", "YELLOW_NO_RETRY");
    }
    if (new Set(capsule.boundFiles.map((entry) => entry.logicalName)).size !== capsule.boundFiles.length) fail("HOST_BINDING_LOGICAL_NAME_COLLISION", "RED");
    const dockerCli = capsule.boundFiles.find((entry) => entry.logicalName === "docker-cli");
    const swiftc = capsule.boundFiles.find((entry) => entry.logicalName === "swiftc");
    if (!dockerCli || dockerCli.path !== capsule.docker.cliPath || !swiftc || swiftc.path !== capsule.macos.swiftcPath) fail("HOST_BINDING_CAPSULE_PATH_AUTHORITY_DRIFT", "RED");
    validateDeveloperToolchainRelationship({ developerRoot: capsule.macos.developerRoot, swiftcPath: capsule.macos.swiftcPath, sdkPath: capsule.macos.sdkPath, sdkVersion: capsule.macos.sdkVersion });
    const developerRootIdentity = observeBoundDirectory(capsule.macos.developerRoot, { owner: "system-or-current" });
    const sdkPathIdentity = observeBoundDirectory(capsule.macos.sdkPath, { owner: "system-or-current" });
    if (developerRootIdentity.path !== capsule.macos.developerRootIdentity.path || !sameIdentity(developerRootIdentity, capsule.macos.developerRootIdentity) || sdkPathIdentity.path !== capsule.macos.sdkPathIdentity.path || !sameIdentity(sdkPathIdentity, capsule.macos.sdkPathIdentity)) fail("HOST_BINDING_DEVELOPER_DIRECTORY_DRIFT", "YELLOW_NO_RETRY");
    const socket = validateSocket(capsule.docker.socketPath);
    if (!sameIdentity(socket, capsule.docker.socketIdentity)) fail("HOST_BINDING_DOCKER_SOCKET_DRIFT", "YELLOW_NO_RETRY");
    return Object.freeze({ capsule: Object.freeze(capsule), capsuleSha256: sha256(bytes), capsulePath: exact });
  } finally {
    bytes.fill(0);
    trailing.fill(0);
    fs.closeSync(fd);
  }
}

export function privateWriteTemporaryPath(target, temporaryRunId = HOST_BINDING_AUTHORITY.constructionRunId) {
  const exact = assertAbsoluteLiteral(target, "PRIVATE_WRITE_TARGET_INVALID");
  if (!ID.test(temporaryRunId)) fail("PRIVATE_WRITE_TEMPORARY_RUN_ID_INVALID", "RED");
  return path.join(path.dirname(exact), `.${path.basename(exact)}.${temporaryRunId}.tmp`);
}

export function atomicWritePrivateFile(target, bytes, mode = 0o600, {
  anchor = REPOSITORY_ROOT,
  temporaryRunId = HOST_BINDING_AUTHORITY.constructionRunId,
  onTemporaryDurable = null,
  onLinkDurable = null,
  onPublishedDurable = null,
} = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) fail("PRIVATE_WRITE_BYTES_INVALID", "RED");
  if (mode !== 0o600) fail("PRIVATE_WRITE_MODE_INVALID", "RED");
  const durableHooks = [onTemporaryDurable, onLinkDurable, onPublishedDurable];
  if (durableHooks.some((hook) => hook !== null && typeof hook !== "function")) fail("PRIVATE_WRITE_DURABLE_HOOK_INVALID", "RED");
  const contentSha256 = sha256(bytes);
  const notifyDurable = (hook, identity) => {
    if (hook === null) return;
    const result = hook(Object.freeze({ sha256: contentSha256, identity }));
    if (result !== null && typeof result === "object" && typeof result.then === "function") fail("PRIVATE_WRITE_ASYNC_DURABLE_HOOK_DENIED", "RED");
  };
  const exact = assertAbsoluteLiteral(target, "PRIVATE_WRITE_TARGET_INVALID");
  const parent = ensureOwnedPrivateDirectory(path.dirname(exact), anchor);
  const requireFinalAbsent = () => {
    try { fs.lstatSync(exact); fail("PRIVATE_WRITE_TARGET_EXISTS", "RED"); }
    catch (error) {
      if (error instanceof HostBindingError) throw error;
      if (error?.code !== "ENOENT") fail("PRIVATE_WRITE_TARGET_UNREADABLE", "RED");
    }
  };
  requireFinalAbsent();
  const temp = privateWriteTemporaryPath(exact, temporaryRunId);
  const parentBefore = fs.lstatSync(parent);
  const parentFd = fs.openSync(parent, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0) | (fs.constants.O_NOFOLLOW ?? 0));
  const parentOpened = fs.fstatSync(parentFd);
  if (!parentBefore.isDirectory() || parentBefore.isSymbolicLink() || parentOpened.dev !== parentBefore.dev || parentOpened.ino !== parentBefore.ino || parentOpened.uid !== currentUid() || (parentOpened.mode & 0o777) !== 0o700) {
    fs.closeSync(parentFd);
    fail("PRIVATE_WRITE_PARENT_IDENTITY_INVALID", "RED");
  }
  let fd = null;
  let tempCreated = false;
  let createdIdentity = null;
  let writtenIdentity = null;
  let published = false;
  try {
    try { fd = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600); }
    catch (error) { if (error?.code === "EEXIST") fail("PRIVATE_WRITE_TEMP_PREEXISTS", "RED"); throw error; }
    tempCreated = true;
    createdIdentity = fs.fstatSync(fd);
    fs.fchmodSync(fd, 0o600);
    writeAll(fd, bytes);
    fs.fsyncSync(fd);
    writtenIdentity = fs.fstatSync(fd);
    const tempPathIdentity = fs.lstatSync(temp);
    if (!writtenIdentity.isFile() || writtenIdentity.isSymbolicLink() || writtenIdentity.nlink !== 1 || writtenIdentity.uid !== currentUid() || (writtenIdentity.mode & 0o777) !== 0o600 || writtenIdentity.size !== bytes.length || !sameIdentity(statIdentity(writtenIdentity), statIdentity(tempPathIdentity))) fail("PRIVATE_WRITE_OBSERVATION_INVALID", "RED");
    fs.closeSync(fd); fd = null;
    fs.fsyncSync(parentFd);
    notifyDurable(onTemporaryDurable, statIdentity(tempPathIdentity));
    const tempAfterDurableHook = fs.lstatSync(temp);
    if (!sameIdentity(statIdentity(tempPathIdentity), statIdentity(tempAfterDurableHook))) fail("PRIVATE_WRITE_TEMP_DURABLE_HOOK_DRIFT", "RED");
    requireFinalAbsent();
    const parentBeforeRename = fs.lstatSync(parent);
    if (parentBeforeRename.dev !== parentOpened.dev || parentBeforeRename.ino !== parentOpened.ino || !parentBeforeRename.isDirectory() || parentBeforeRename.isSymbolicLink()) fail("PRIVATE_WRITE_PARENT_DRIFT", "RED");
    try { fs.linkSync(temp, exact); }
    catch (error) { if (error?.code === "EEXIST") fail("PRIVATE_WRITE_TARGET_RACE", "RED"); throw error; }
    published = true;
    const linkedTempIdentity = fs.lstatSync(temp);
    const linkedFinalIdentity = fs.lstatSync(exact);
    if (!linkedTempIdentity.isFile() || linkedTempIdentity.isSymbolicLink() || !linkedFinalIdentity.isFile() || linkedFinalIdentity.isSymbolicLink() || linkedTempIdentity.nlink !== 2 || linkedFinalIdentity.nlink !== 2 || !sameIdentity(statIdentity(linkedTempIdentity), statIdentity(linkedFinalIdentity)) || !sameIdentityWithoutLinkCount(statIdentity(writtenIdentity), statIdentity(linkedFinalIdentity))) fail("PRIVATE_WRITE_LINK_IDENTITY_DRIFT", "RED");
    fs.fsyncSync(parentFd);
    notifyDurable(onLinkDurable, statIdentity(linkedFinalIdentity));
    const linkedTempAfterDurableHook = fs.lstatSync(temp);
    const linkedFinalAfterDurableHook = fs.lstatSync(exact);
    if (!sameIdentity(statIdentity(linkedTempIdentity), statIdentity(linkedTempAfterDurableHook)) || !sameIdentity(statIdentity(linkedFinalIdentity), statIdentity(linkedFinalAfterDurableHook))) fail("PRIVATE_WRITE_LINK_DURABLE_HOOK_DRIFT", "RED");
    fs.unlinkSync(temp);
    tempCreated = false;
    const finalIdentity = fs.lstatSync(exact);
    if (finalIdentity.nlink !== 1 || !sameIdentity(statIdentity(writtenIdentity), statIdentity(finalIdentity))) fail("PRIVATE_WRITE_PUBLISH_IDENTITY_DRIFT", "RED");
    fs.fsyncSync(parentFd);
    notifyDurable(onPublishedDurable, statIdentity(finalIdentity));
    const finalAfterDurableHook = fs.lstatSync(exact);
    if (!sameIdentity(statIdentity(finalIdentity), statIdentity(finalAfterDurableHook))) fail("PRIVATE_WRITE_PUBLISHED_DURABLE_HOOK_DRIFT", "RED");
    return Object.freeze({ sha256: contentSha256, identity: statIdentity(finalIdentity) });
  } catch (error) {
    let cleanupFailure = null;
    if (fd !== null) {
      if (createdIdentity === null) {
        try { createdIdentity = fs.fstatSync(fd); }
        catch (identityError) { cleanupFailure = identityError; }
      }
      try { fs.closeSync(fd); }
      catch (closeError) { cleanupFailure ??= closeError; }
      fd = null;
    }
    if (tempCreated || published) {
      if (createdIdentity === null) cleanupFailure ??= new Error("PRIVATE_WRITE_CLEANUP_IDENTITY_UNKNOWN");
      else {
        for (const cleanupPath of published ? [exact, temp] : [temp]) {
          try {
            const observed = fs.lstatSync(cleanupPath);
            const rechecked = fs.lstatSync(cleanupPath);
            if (!observed.isFile() || observed.isSymbolicLink() || observed.uid !== currentUid() || ![1, 2].includes(observed.nlink) || observed.dev !== createdIdentity.dev || observed.ino !== createdIdentity.ino || !sameIdentity(statIdentity(observed), statIdentity(rechecked))) throw new Error("PRIVATE_WRITE_CLEANUP_IDENTITY_DRIFT");
            fs.unlinkSync(cleanupPath);
          } catch (cleanupError) {
            if (cleanupError?.code !== "ENOENT") cleanupFailure = cleanupError;
          }
        }
      }
      try { fs.fsyncSync(parentFd); } catch (cleanupError) { cleanupFailure ??= cleanupError; }
    }
    if (cleanupFailure !== null) throw new HostBindingError("PRIVATE_WRITE_CLEANUP_FAILED", "RED_QUARANTINED");
    throw error;
  } finally {
    fs.closeSync(parentFd);
  }
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  process.stderr.write("HOST_BINDING_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  process.exitCode = 64;
}
