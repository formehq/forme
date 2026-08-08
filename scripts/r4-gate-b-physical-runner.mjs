#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { createRequire } from "node:module";
import { Ajv2020 } from "ajv/dist/2020.js";
import { fileURLToPath } from "node:url";
import { canonicalJson, parseStrictJson } from "../packages/r4-protocol/src/index.ts";
import {
  HOST_BINDING_AUTHORITY,
  HostBindingError,
  atomicWritePrivateFile,
  createProcessHostInspector,
  ensureOwnedPrivateDirectory,
  finalizeHostBinding,
  readAndRevalidateHostBindingCapsule,
  readAndConsumeHostBindingInput,
  removeHostBindingInputEnvelope,
  privateWriteTemporaryPath,
  runtimeDependencyLogicalName,
  runtimeDependencyInventory,
  sha256,
} from "./r4-gate-b-host-binding.mjs";
import {
  PHYSICAL_AUTHORITY,
  CODEX_PROCESS_KINDS,
  MACOS_DIRECT_START_PROTOCOL,
  MACOS_PLAN_ORDER,
  buildCodexPhysicalPlan,
  buildMacOSPhysicalPlan,
  buildPostgresPhysicalPlan,
  runConstructionFakeMatrix,
  validateMacOSDesignatedRequirementObservation,
  validateMacOSExactEntitlements,
  validateMacOSHelperTerminal,
  validateMacOSIdentityInventory,
  validateMacOSStrictSignatureObservation,
  validateMacOSSyntheticFeederCompletion,
  validateRaceCatalog,
} from "./r4-gate-b-physical-port.mjs";
import {
  CORE_CODEX_LAUNCHER_SHA256,
  CORE_CODEX_NATIVE_SHA256,
  CORE_CODEX_SCHEMA_COUNT,
  CORE_CODEX_SCHEMA_SHA256,
  CORE_CODEX_SELECTED_SCHEMAS,
  coreCodexLayout,
  runCoreCodexZeroCall,
  validateCoreCodexLogicalCommand,
} from "../packages/r4-codex-adapter/src/zero-call-physical.ts";
import { guardClientMessage, initializeMessage, initializedMessage } from "../packages/r4-codex-adapter/src/app-server-probe.ts";
import { createCoreSharedOrchestrationCaseExecutor } from "./r4-gate-b-codex-probe.mjs";

const addFormats = createRequire(import.meta.url)("ajv-formats");

const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const PACKET_PATH = "docs/R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-PACKET.md";
const REVIEW_PATH = "docs/R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-OWNER-REVIEW.md";
const INPUT_PATH = path.join(REPOSITORY_ROOT, ".forme/gate-b-host-binding-input.v1.json");
const CONSTRUCTION_ROOT = path.join(REPOSITORY_ROOT, `.forme/gate-b-physical-construction/${HOST_BINDING_AUTHORITY.constructionRunId}`);
const CHECKPOINT_PATH = path.join(CONSTRUCTION_ROOT, "construction-checkpoint.v1.json");
const JOURNAL_PATH = path.join(CONSTRUCTION_ROOT, "journal.v1.jsonl");
const CAPSULE_ROOT = path.join(REPOSITORY_ROOT, ".forme/gate-b-host-bindings");
const PUBLIC_RECEIPT_PATH = path.join(REPOSITORY_ROOT, "docs/evidence/r4-gate-b-host-binding-public.json");
const RETRY_MANIFEST_PATH = path.join(REPOSITORY_ROOT, "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md");
const RETRY_ROOT_PARENT = path.join(REPOSITORY_ROOT, ".forme/gate-b-physical-retry");
const SHA = /^sha256:[0-9a-f]{64}$/u;
const ID = /^[0-9a-f]{32}$/u;
const GIT = /^[0-9a-f]{40}$/u;

const ALLOWED_PATHS = new Set(`
schemas/r4/gate-b-core/host-binding-input.schema.json
schemas/r4/gate-b-core/host-binding-capsule.schema.json
schemas/r4/gate-b-core/host-binding-public-receipt.schema.json
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/physical-construction-evidence.schema.json
schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json
schemas/r4/gate-b-core/physical-retry-evidence.schema.json
schemas/r4/gate-b-core/postgres/physical-adapter-contract.json
schemas/r4/gate-b-core/postgres/race-catalog.json
schemas/r4/gate-b-core/postgres/race-byte-index.json
schemas/r4/gate-b-core/macos/physical-adapter-contract.json
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-port.mjs
scripts/r4-gate-b-physical-runner.mjs
fixtures/r4-gate-b-core/macos/fake-provider-child.mjs
fixtures/r4-gate-b-core/macos/fake-helper-child.mjs
fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs
fixtures/r4-gate-b-core/postgres/core-race-setup.sql
fixtures/r4-gate-b-core/postgres/core-race-worker.sql
fixtures/r4-gate-b-core/postgres/core-race-verify.sql
test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/physical-runner.test.ts
test/r4-gate-b-core/postgres-races.test.ts
test/r4-gate-b-core/macos-process-death.test.ts
schemas/r4/gate-b-core/README.md
schemas/r4/gate-b-core/artifact-index.json
schemas/r4/gate-b-core/runtime-boundary.json
schemas/r4/gate-b-core/postgres-contract.md
schemas/r4/gate-b-core/codex-zero-call-contract.json
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql
schemas/r4/gate-b-core/macos/build-recipe.json
schemas/r4/gate-b-core/macos/transient-candidate-contract.json
fixtures/r4-gate-b-core/postgres/core-happy-path.sql
fixtures/r4-gate-b-core/postgres/core-errors.sql
fixtures/r4-gate-b-core/postgres/core-races.sql
packages/r4-codex-adapter/src/zero-call-physical.ts
scripts/r4-doc-audit.mjs
scripts/r4-gate-b-path-fence.mjs
scripts/r4-gate-b-core-postgres.mjs
scripts/r4-gate-b-codex-probe.mjs
scripts/r4-gate-b-macos-core.mjs
test/r4-gate-b-core/postgres-static.test.ts
test/r4-gate-b-core/postgres-adapter.test.ts
test/r4-gate-b-core/codex-physical-adapter.test.ts
test/r4-gate-b-core/macos-core-adapter.test.ts
native/macos/Sources/FormeCoreLocal/CoreLauncher.swift
native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift
native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift
native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift
native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift
native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift
native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift
docs/evidence/r4-gate-b-physical-adapter-construction.json
docs/evidence/r4-gate-b-host-binding-public.json
docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md
README.md
docs/README.md
docs/CONTROL.md
docs/ROADMAP.md
docs/DECISIONS.md
`.trim().split("\n"));

const PHASE_B_OUTPUT_PATHS = new Set([
  "docs/evidence/r4-gate-b-physical-adapter-construction.json",
  "docs/evidence/r4-gate-b-host-binding-public.json",
  "docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md",
  "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md",
  "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md",
  "README.md",
  "docs/README.md",
  "docs/CONTROL.md",
  "docs/ROADMAP.md",
  "docs/DECISIONS.md",
]);
const PHASE_A_IMPLEMENTATION_PATHS = new Set([...ALLOWED_PATHS].filter((entry) => !PHASE_B_OUTPUT_PATHS.has(entry)));
const PHASE_A_REQUIRED_NEW_PATHS = new Set(`
fixtures/r4-gate-b-core/macos/fake-helper-child.mjs
fixtures/r4-gate-b-core/macos/fake-provider-child.mjs
fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs
fixtures/r4-gate-b-core/postgres/core-race-setup.sql
fixtures/r4-gate-b-core/postgres/core-race-verify.sql
fixtures/r4-gate-b-core/postgres/core-race-worker.sql
schemas/r4/gate-b-core/host-binding-capsule.schema.json
schemas/r4/gate-b-core/host-binding-input.schema.json
schemas/r4/gate-b-core/host-binding-public-receipt.schema.json
schemas/r4/gate-b-core/macos/physical-adapter-contract.json
schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json
schemas/r4/gate-b-core/physical-construction-evidence.schema.json
schemas/r4/gate-b-core/physical-retry-evidence.schema.json
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/postgres/physical-adapter-contract.json
schemas/r4/gate-b-core/postgres/race-byte-index.json
schemas/r4/gate-b-core/postgres/race-catalog.json
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-port.mjs
scripts/r4-gate-b-physical-runner.mjs
test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/macos-process-death.test.ts
test/r4-gate-b-core/physical-runner.test.ts
test/r4-gate-b-core/postgres-races.test.ts
`.trim().split("\n"));
const PHASE_B_OUTPUT_PATH_SET_SHA256 = sha256(Buffer.from(`${[...PHASE_B_OUTPUT_PATHS].sort((a, b) => Buffer.from(a, "utf8").compare(Buffer.from(b, "utf8"))).join("\n")}\n`, "utf8"));

const IMMUTABLE_HASHES = Object.freeze({
  "docs/R4-TECHNICAL-CONTROL-PACKET.md": "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5",
  "docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md": "sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6",
  "docs/R4-GATE-B-CORE-CONSTRUCTION-REPORT.md": "sha256:4369c5bf7f95e805b440c47a5d2908b091d74c14ab0b322a39d663978c570f40",
  "docs/evidence/r4-gate-b-core-construction.json": "sha256:8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09",
  "docs/R4-GATE-B-CORE-EXECUTION-MANIFEST.md": "sha256:f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74",
  "docs/R4-GATE-B-CORE-EXECUTION-OWNER-REVIEW.md": "sha256:332c86ab3ec7612dfa7a107eaf95358dccc7843d0c7b97befddb096b5e3307d6",
  "docs/R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-DECISION-BRIEF.md": "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2",
  "package-lock.json": "sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812",
  "schemas/r4/gate-b-core/evidence.schema.json": "sha256:34bda9a95ea6aa13047aa12c25f656e051a95c107416d4a2c50c20ba2343a9e1",
  "schemas/r4/gate-b-core/macos/evidence.schema.json": "sha256:08eb1e8331ddcb1fd1c6c84762ad285550420a9ef685394db2415c033b53f81f",
  "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb": "sha256:0c6dc1dda5c97f9d3773bc2ccbd49b28c8ba1b02f7f6b55180db7b2672a9d2ce",
});

export class PhysicalRunnerError extends Error {
  constructor(code, verdict = "ADAPTER_CONSTRUCTION_YELLOW") { super(code); this.name = "PhysicalRunnerError"; this.code = code; this.verdict = verdict; }
}
function fail(code, verdict) { throw new PhysicalRunnerError(code, verdict); }
export function selectPhysicalRunnerTerminalError(primaryError = null, cleanupError = null, finalizationError = null) {
  const selected = primaryError ?? cleanupError ?? finalizationError;
  if (selected === null) return null;
  const laterVerdicts = [
    cleanupError === null ? null : String(cleanupError?.verdict ?? "RED_QUARANTINED"),
    finalizationError === null ? null : String(finalizationError?.verdict ?? "RED"),
  ].filter((verdict) => verdict !== null);
  let strongestVerdict = selected?.verdict;
  if (laterVerdicts.some((verdict) => verdict.includes("QUARANTINED"))) strongestVerdict = "RED_QUARANTINED";
  else if (laterVerdicts.some((verdict) => verdict.startsWith("RED")) && strongestVerdict !== "RED_QUARANTINED") strongestVerdict = "RED";
  if (strongestVerdict === undefined || strongestVerdict === selected?.verdict) return selected;
  const escalated = new PhysicalRunnerError(selected?.code ?? selected?.message ?? "PHYSICAL_RUNNER_TERMINAL", strongestVerdict);
  for (const key of ["partialObservation", "hostInspection", "logicalStartObserved", "processGroupState", "processGroupId"]) if (selected?.[key] !== undefined) escalated[key] = selected[key];
  escalated.primaryCause = selected;
  return escalated;
}
function git(args) { return execFileSync("/usr/bin/git", args, { cwd: REPOSITORY_ROOT, encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" }, stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function gitRaw(args) { return execFileSync("/usr/bin/git", args, { cwd: REPOSITORY_ROOT, encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" }, stdio: ["ignore", "pipe", "pipe"] }); }
function fileSha(relativePath) { return sha256(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath))); }
function exactObject(value, keys, code) { if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code); return value; }
function validateSchema(relativePath, value, code) {
  const schema = parseStrictJson(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false, useDefaults: false, validateFormats: true });
  addFormats(ajv, { mode: "full", keywords: false });
  if (ajv.compile(schema)(value) !== true) fail(code, "RED");
}
function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
    if (written <= 0) fail("PHYSICAL_WRITE_STALLED", "RED");
    offset += written;
  }
}
function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function lstatIfPresent(target, code = "PATH_ENTRY_UNREADABLE", verdict = "RED_QUARANTINED") {
  try { return fs.lstatSync(target); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    fail(code, verdict);
  }
}
function requirePathEntryAbsent(target, code, verdict = "RED") {
  if (lstatIfPresent(target, `${code}_UNREADABLE`, verdict) !== null) fail(code, verdict);
}
function assertExistingRepoDirectory(directory, code = "REPOSITORY_DIRECTORY_UNSAFE") {
  if (!path.isAbsolute(directory)) fail(code, "RED");
  const relative = path.relative(REPOSITORY_ROOT, directory);
  if (relative === "" || path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) fail(code, "RED");
  let cursor = REPOSITORY_ROOT;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    const stat = fs.lstatSync(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0 || fs.realpathSync(cursor) !== cursor) fail(code, "RED");
  }
  return directory;
}
function snapshotNoSymlinkPathChain(candidate, code) {
  if (!path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) fail(code, "RED");
  const parsed = path.parse(candidate);
  let cursor = parsed.root;
  const entries = [];
  for (const component of candidate.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) fail(code, "RED");
    entries.push(Object.freeze({ path: cursor, dev: stat.dev, ino: stat.ino, mode: stat.mode, uid: stat.uid, nlink: stat.nlink }));
  }
  return Object.freeze(entries);
}
function assertNoSymlinkPathChainStable(entries, code) {
  for (const entry of entries) {
    const stat = fs.lstatSync(entry.path);
    if (stat.isSymbolicLink() || stat.dev !== entry.dev || stat.ino !== entry.ino || stat.mode !== entry.mode || stat.uid !== entry.uid || stat.nlink !== entry.nlink) fail(code, "RED");
  }
}

const exactOwnedRootAuthorities = new WeakSet();
function structuralDirectoryIdentity(stat) {
  return Object.freeze({ dev: stat.dev, ino: stat.ino, mode: stat.mode, uid: stat.uid, gid: stat.gid });
}
function sameStructuralDirectoryIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.uid === right.uid && left.gid === right.gid;
}
function snapshotStructuralDirectoryChain(candidate, code) {
  if (!path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) fail(code, "RED_QUARANTINED");
  const parsed = path.parse(candidate);
  let cursor = parsed.root;
  const entries = [];
  for (const component of candidate.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    let stat;
    try { stat = fs.lstatSync(cursor, { bigint: true }); }
    catch { fail(code, "RED_QUARANTINED"); }
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail(code, "RED_QUARANTINED");
    entries.push(Object.freeze({ path: cursor, ...structuralDirectoryIdentity(stat) }));
  }
  return Object.freeze(entries);
}
function assertStructuralDirectoryChainStable(entries, code) {
  for (const expected of entries) {
    let observed;
    try { observed = fs.lstatSync(expected.path, { bigint: true }); }
    catch { fail(code, "RED_QUARANTINED"); }
    if (!observed.isDirectory() || observed.isSymbolicLink() || !sameStructuralDirectoryIdentity(expected, structuralDirectoryIdentity(observed))) fail(code, "RED_QUARANTINED");
  }
}
export function closeExactOwnedRootAuthority(authority, code = null) {
  if (!exactOwnedRootAuthorities.has(authority) || authority.state.closed) return;
  authority.state.closed = true;
  let closeFailed = false;
  for (const descriptor of [authority.rootFd, authority.parentFd]) {
    try { fs.closeSync(descriptor); }
    catch { closeFailed = true; }
  }
  if (closeFailed && code !== null) fail(code, "RED_QUARANTINED");
}
function exactOwnedRootAnchor(root, codePrefix) {
  for (const anchor of [REPOSITORY_ROOT, "/private/tmp"]) {
    const relative = path.relative(anchor, root);
    if (relative !== "" && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`)) return anchor;
  }
  fail(`${codePrefix}_ANCHOR_INVALID`, "RED_QUARANTINED");
}
function createExclusiveOwnedRoot0700(root, anchor, codePrefix) {
  if (!path.isAbsolute(root) || path.normalize(root) !== root || !path.isAbsolute(anchor) || path.normalize(anchor) !== anchor) fail(`${codePrefix}_CREATE_AUTHORITY_INVALID`, "RED");
  const relative = path.relative(anchor, root);
  if (relative === "" || path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) fail(`${codePrefix}_CREATE_AUTHORITY_INVALID`, "RED");
  const parent = path.dirname(root);
  const parentChain = snapshotStructuralDirectoryChain(parent, `${codePrefix}_CREATE_PARENT_UNSAFE`);
  if (lstatIfPresent(root, `${codePrefix}_CREATE_TARGET_UNREADABLE`) !== null) fail(`${codePrefix}_CREATE_TARGET_PREEXISTS`, "RED_QUARANTINED");
  try { fs.mkdirSync(root, { recursive: false, mode: 0o700 }); }
  catch (error) {
    if (error?.code === "EEXIST") fail(`${codePrefix}_CREATE_TARGET_RACE`, "RED_QUARANTINED");
    throw error;
  }
  const created = fs.lstatSync(root, { bigint: true });
  assertStructuralDirectoryChainStable(parentChain, `${codePrefix}_CREATE_PARENT_DRIFT`);
  if (!created.isDirectory() || created.isSymbolicLink() || created.uid !== BigInt(process.getuid()) || (created.mode & 0o777n) !== 0o700n || fs.realpathSync(root) !== root) fail(`${codePrefix}_CREATE_IDENTITY_INVALID`, "RED_QUARANTINED");
  fsyncDirectory(parent);
  try {
    const authority = openExactOwnedRootAuthority({ root, anchor, codePrefix });
    if (!sameStructuralDirectoryIdentity(structuralDirectoryIdentity(created), authority.rootIdentity)) {
      closeExactOwnedRootAuthority(authority);
      fail(`${codePrefix}_CREATE_IDENTITY_DRIFT`, "RED_QUARANTINED");
    }
    return authority;
  } catch (error) {
    // A failed descriptor bind leaves no deletion authority. Even if the
    // pathname still looks unchanged, preserve it for quarantine rather than
    // risk deleting a same-UID replacement.
    if (error instanceof PhysicalRunnerError) throw error;
    fail(`${codePrefix}_CREATE_AUTHORITY_FAILED`, "RED_QUARANTINED");
  }
}
export function openExactOwnedRootAuthority({ root, anchor, codePrefix }) {
  if (typeof root !== "string" || !path.isAbsolute(root) || path.normalize(root) !== root || typeof anchor !== "string" || !path.isAbsolute(anchor) || path.normalize(anchor) !== anchor || typeof codePrefix !== "string" || !/^[A-Z0-9_]+$/u.test(codePrefix) || typeof fs.constants.O_DIRECTORY !== "number" || typeof fs.constants.O_NOFOLLOW !== "number") fail(`${String(codePrefix || "OWNED_ROOT")}_AUTHORITY_INVALID`, "RED_QUARANTINED");
  let realAnchor;
  try { realAnchor = fs.realpathSync(anchor); }
  catch { fail(`${codePrefix}_ANCHOR_UNSAFE`, "RED_QUARANTINED"); }
  const relative = path.relative(realAnchor, root);
  if (realAnchor !== anchor || relative === "" || path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) fail(`${codePrefix}_AUTHORITY_INVALID`, "RED_QUARANTINED");
  const parent = path.dirname(root);
  const ancestorChain = snapshotStructuralDirectoryChain(parent, `${codePrefix}_ANCESTOR_UNSAFE`);
  let parentFd = null;
  let rootFd = null;
  try {
    const parentBefore = fs.lstatSync(parent, { bigint: true });
    const rootBefore = fs.lstatSync(root, { bigint: true });
    if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink() || rootBefore.uid !== BigInt(process.getuid()) || (rootBefore.mode & 0o777n) !== 0o700n || fs.realpathSync(root) !== root) fail(`${codePrefix}_ROOT_UNSAFE`, "RED_QUARANTINED");
    parentFd = fs.openSync(parent, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    rootFd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    const parentOpened = fs.fstatSync(parentFd, { bigint: true });
    const rootOpened = fs.fstatSync(rootFd, { bigint: true });
    const rootAfter = fs.lstatSync(root, { bigint: true });
    assertStructuralDirectoryChainStable(ancestorChain, `${codePrefix}_ANCESTOR_DRIFT`);
    if (!sameStructuralDirectoryIdentity(structuralDirectoryIdentity(parentBefore), structuralDirectoryIdentity(parentOpened)) || !sameStructuralDirectoryIdentity(structuralDirectoryIdentity(rootBefore), structuralDirectoryIdentity(rootOpened)) || !sameStructuralDirectoryIdentity(structuralDirectoryIdentity(rootBefore), structuralDirectoryIdentity(rootAfter))) fail(`${codePrefix}_IDENTITY_DRIFT`, "RED_QUARANTINED");
    const authority = Object.freeze({
      root,
      parent,
      anchor,
      codePrefix,
      parentFd,
      rootFd,
      ancestorChain,
      parentIdentity: structuralDirectoryIdentity(parentOpened),
      rootIdentity: structuralDirectoryIdentity(rootOpened),
      state: { closed: false },
    });
    exactOwnedRootAuthorities.add(authority);
    return authority;
  } catch (error) {
    if (rootFd !== null) try { fs.closeSync(rootFd); } catch {}
    if (parentFd !== null) try { fs.closeSync(parentFd); } catch {}
    if (error instanceof PhysicalRunnerError) throw error;
    fail(`${codePrefix}_AUTHENTICATION_FAILED`, "RED_QUARANTINED");
  }
}
function assertExactOwnedRootAuthorityCurrent(authority, codePrefix = authority?.codePrefix ?? "OWNED_ROOT") {
  if (!exactOwnedRootAuthorities.has(authority) || authority.state.closed) fail(`${codePrefix}_AUTHORITY_INVALID`, "RED_QUARANTINED");
  try {
    assertStructuralDirectoryChainStable(authority.ancestorChain, `${codePrefix}_ANCESTOR_DRIFT`);
    const parentFd = fs.fstatSync(authority.parentFd, { bigint: true });
    const parentPath = fs.lstatSync(authority.parent, { bigint: true });
    const rootFd = fs.fstatSync(authority.rootFd, { bigint: true });
    const rootPath = fs.lstatSync(authority.root, { bigint: true });
    if (!parentFd.isDirectory() || !parentPath.isDirectory() || parentPath.isSymbolicLink() || !rootFd.isDirectory() || !rootPath.isDirectory() || rootPath.isSymbolicLink() || rootPath.uid !== BigInt(process.getuid()) || (rootPath.mode & 0o777n) !== 0o700n || fs.realpathSync(authority.root) !== authority.root || !sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentFd)) || !sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentPath)) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootFd)) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootPath))) fail(`${codePrefix}_IDENTITY_DRIFT`, "RED_QUARANTINED");
    return true;
  } catch (error) {
    if (error instanceof PhysicalRunnerError) throw error;
    fail(`${codePrefix}_IDENTITY_UNREADABLE`, "RED_QUARANTINED");
  }
}
function observeExactOwnedRootInventory(authority, inventory, codePrefix) {
  const allowed = new Map();
  const configuredAliasGroups = new Map();
  for (const [name, specification] of Object.entries(inventory)) {
    const aliasGroup = specification?.aliasGroup ?? null;
    if (name.length < 1 || name === "." || name === ".." || name.includes("\0") || name.includes(path.sep) || specification === null || typeof specification !== "object" || !["file", "directory"].includes(specification.kind) || !Array.isArray(specification.modes) || specification.modes.length < 1 || specification.modes.some((mode) => !Number.isInteger(mode)) || (aliasGroup !== null && (specification.kind !== "file" || typeof aliasGroup !== "string" || !/^[a-z0-9-]+$/u.test(aliasGroup)))) fail(`${codePrefix}_INVENTORY_AUTHORITY_INVALID`, "RED");
    if (aliasGroup !== null) configuredAliasGroups.set(aliasGroup, (configuredAliasGroups.get(aliasGroup) ?? 0) + 1);
    allowed.set(Buffer.from(name, "utf8").toString("hex"), Object.freeze({ name, ...specification }));
  }
  if ([...configuredAliasGroups.values()].some((count) => count !== 2)) fail(`${codePrefix}_INVENTORY_AUTHORITY_INVALID`, "RED");
  let names;
  try { names = fs.readdirSync(authority.root, { encoding: "buffer" }).sort((left, right) => Buffer.compare(left, right)); }
  catch { fail(`${codePrefix}_INVENTORY_UNREADABLE`, "RED_QUARANTINED"); }
  const entries = [];
  for (const nameBytes of names) {
    const specification = allowed.get(nameBytes.toString("hex"));
    if (specification === undefined || !nameBytes.equals(Buffer.from(specification.name, "utf8"))) fail(`${codePrefix}_INVENTORY_INVALID`, "RED_QUARANTINED");
    let stat;
    try { stat = fs.lstatSync(path.join(authority.root, specification.name), { bigint: true }); }
    catch { fail(`${codePrefix}_INVENTORY_UNREADABLE`, "RED_QUARANTINED"); }
    const kindMatches = specification.kind === "file" ? stat.isFile() : stat.isDirectory();
    const aliasGroup = specification.aliasGroup ?? null;
    const linkCountSafe = specification.kind !== "file" || (aliasGroup === null ? stat.nlink === 1n : [1n, 2n].includes(stat.nlink));
    if (!kindMatches || stat.isSymbolicLink() || stat.uid !== BigInt(process.getuid()) || !linkCountSafe || !specification.modes.includes(Number(stat.mode & 0o777n))) fail(`${codePrefix}_INVENTORY_ENTRY_UNSAFE`, "RED_QUARANTINED");
    entries.push(Object.freeze({ name: specification.name, kind: specification.kind, aliasGroup, nlink: stat.nlink, ...structuralDirectoryIdentity(stat) }));
  }
  for (const aliasGroup of configuredAliasGroups.keys()) {
    const aliases = entries.filter((entry) => entry.aliasGroup === aliasGroup);
    const singleSafe = aliases.length === 0 || (aliases.length === 1 && aliases[0].nlink === 1n);
    const pairSafe = aliases.length === 2 && aliases.every((entry) => entry.nlink === 2n) && aliases[0].dev === aliases[1].dev && aliases[0].ino === aliases[1].ino;
    if (!singleSafe && !pairSafe) fail(`${codePrefix}_INVENTORY_ALIAS_UNSAFE`, "RED_QUARANTINED");
  }
  return Object.freeze({ names: Object.freeze(names.map((name) => Buffer.from(name))), entries: Object.freeze(entries) });
}
function sameExactOwnedRootInventory(left, right) {
  return left.names.length === right.names.length && left.names.every((name, index) => name.equals(right.names[index])) && left.entries.length === right.entries.length && left.entries.every((entry, index) => {
    const observed = right.entries[index];
    return entry.name === observed.name && entry.kind === observed.kind && entry.aliasGroup === observed.aliasGroup && entry.nlink === observed.nlink && sameStructuralDirectoryIdentity(entry, observed);
  });
}
function assertClosedExactOwnedRootInventory(authority, inventory, codePrefix = authority?.codePrefix ?? "OWNED_ROOT") {
  assertExactOwnedRootAuthorityCurrent(authority, codePrefix);
  const before = observeExactOwnedRootInventory(authority, inventory, codePrefix);
  const after = observeExactOwnedRootInventory(authority, inventory, codePrefix);
  if (!sameExactOwnedRootInventory(before, after) || before.names.length !== Object.keys(inventory).length) fail(`${codePrefix}_INVENTORY_DRIFT`, "RED_QUARANTINED");
  assertExactOwnedRootAuthorityCurrent(authority, codePrefix);
  return true;
}
export function removeExactOwnedRootTree(authority, inventory) {
  const codePrefix = authority?.codePrefix ?? "OWNED_ROOT";
  if (!exactOwnedRootAuthorities.has(authority) || authority.state.closed || inventory === null || typeof inventory !== "object" || Array.isArray(inventory)) fail(`${codePrefix}_REMOVE_AUTHORITY_INVALID`, "RED_QUARANTINED");
  let primaryError = null;
  try {
    assertStructuralDirectoryChainStable(authority.ancestorChain, `${codePrefix}_ANCESTOR_DRIFT`);
    const parentOpened = fs.fstatSync(authority.parentFd, { bigint: true });
    const parentPath = fs.lstatSync(authority.parent, { bigint: true });
    const rootOpened = fs.fstatSync(authority.rootFd, { bigint: true });
    const rootPath = fs.lstatSync(authority.root, { bigint: true });
    if (!rootOpened.isDirectory() || !rootPath.isDirectory() || rootPath.isSymbolicLink() || rootPath.uid !== BigInt(process.getuid()) || (rootPath.mode & 0o777n) !== 0o700n || fs.realpathSync(authority.root) !== authority.root || !sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentOpened)) || !sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentPath)) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootOpened)) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootPath))) fail(`${codePrefix}_PRE_REMOVE_IDENTITY_DRIFT`, "RED_QUARANTINED");
    const inventoryBefore = observeExactOwnedRootInventory(authority, inventory, codePrefix);
    const inventoryAfter = observeExactOwnedRootInventory(authority, inventory, codePrefix);
    const rootFinalFd = fs.fstatSync(authority.rootFd, { bigint: true });
    const rootFinalPath = fs.lstatSync(authority.root, { bigint: true });
    assertStructuralDirectoryChainStable(authority.ancestorChain, `${codePrefix}_ANCESTOR_DRIFT`);
    if (!sameExactOwnedRootInventory(inventoryBefore, inventoryAfter) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootFinalFd)) || !sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootFinalPath)) || fs.realpathSync(authority.root) !== authority.root) fail(`${codePrefix}_PRE_REMOVE_DRIFT`, "RED_QUARANTINED");
    fs.rmSync(authority.root, { recursive: true, force: false, maxRetries: 0 });
    const rootAfterRemove = fs.fstatSync(authority.rootFd, { bigint: true });
    if (!sameStructuralDirectoryIdentity(authority.rootIdentity, structuralDirectoryIdentity(rootAfterRemove))) fail(`${codePrefix}_POST_REMOVE_IDENTITY_DRIFT`, "RED_QUARANTINED");
    if (lstatIfPresent(authority.root, `${codePrefix}_ABSENCE_UNREADABLE`) !== null) fail(`${codePrefix}_ABSENCE_UNKNOWN`, "RED_QUARANTINED");
    assertStructuralDirectoryChainStable(authority.ancestorChain, `${codePrefix}_ANCESTOR_DRIFT`);
    const parentAfterFd = fs.fstatSync(authority.parentFd, { bigint: true });
    const parentAfterPath = fs.lstatSync(authority.parent, { bigint: true });
    if (!sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentAfterFd)) || !sameStructuralDirectoryIdentity(authority.parentIdentity, structuralDirectoryIdentity(parentAfterPath))) fail(`${codePrefix}_PARENT_DRIFT`, "RED_QUARANTINED");
    fs.fsyncSync(authority.parentFd);
    return Object.freeze({ rootAbsent: true, exactIdentityRemoved: true, parentStable: true, parentFsyncPassed: true });
  } catch (error) {
    primaryError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError(`${codePrefix}_REMOVE_FAILED`, "RED_QUARANTINED");
    throw primaryError;
  } finally {
    try { closeExactOwnedRootAuthority(authority, `${codePrefix}_AUTHORITY_CLOSE_FAILED`); }
    catch (closeError) { if (primaryError === null) throw closeError; }
  }
}

const ownedDirectory0700 = Object.freeze({ kind: "directory", modes: Object.freeze([0o700]) });
const ownedFile0600 = Object.freeze({ kind: "file", modes: Object.freeze([0o600]) });
const checkpointAliasFile0600 = Object.freeze({ kind: "file", modes: Object.freeze([0o600]), aliasGroup: "construction-checkpoint" });
const CONSTRUCTION_NEW_JOURNAL_INVENTORY = Object.freeze({ "journal.v1.jsonl": ownedFile0600 });
const CONSTRUCTION_EXISTING_JOURNAL_INVENTORY = Object.freeze({ "construction-checkpoint.v1.json": ownedFile0600, "journal.v1.jsonl": ownedFile0600 });
const CONSTRUCTION_CHECKPOINT_INVENTORY = Object.freeze({ "construction-checkpoint.v1.json": ownedFile0600 });
const CONSTRUCTION_CHECKPOINT_CLEANUP_INVENTORY = Object.freeze({
  "construction-checkpoint.v1.json": checkpointAliasFile0600,
  [`.construction-checkpoint.v1.json.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`]: checkpointAliasFile0600,
});
const PHASE_B_PRE_INPUT_DELETE_INVENTORY = Object.freeze({
  ...CONSTRUCTION_CHECKPOINT_CLEANUP_INVENTORY,
  "journal.v1.jsonl": ownedFile0600,
});
const RETRY_NEW_JOURNAL_INVENTORY = Object.freeze({ "journal.v1.jsonl": ownedFile0600 });
const CONSTRUCTION_ROOT_DELETE_INVENTORY = Object.freeze({
  "journal.v1.jsonl": ownedFile0600,
  ...CONSTRUCTION_CHECKPOINT_CLEANUP_INVENTORY,
  "blocked-supervisor-pids": ownedDirectory0700,
  "codex-shared-matrix": ownedDirectory0700,
  "codex-staging-source": ownedDirectory0700,
  "codex-staging-destination": ownedDirectory0700,
  "discard-canary-0.bin": ownedFile0600,
  "discard-canary-1.bin": ownedFile0600,
  "publication-protocol-fake": ownedDirectory0700,
  "checkpoint-publication-protocol-fake": ownedDirectory0700,
  "publication-capsule.v1.stage": ownedFile0600,
  "publication-public-receipt.v1.stage": Object.freeze({ kind: "file", modes: Object.freeze([0o644]) }),
});
const RETRY_ROOT_DELETE_INVENTORY = Object.freeze({
  "journal.v1.jsonl": ownedFile0600,
  "runtime-snapshot": ownedDirectory0700,
  "blocked-supervisor-pids": ownedDirectory0700,
  "codex": ownedDirectory0700,
});
const POSTGRES_ROOT_DELETE_INVENTORY = Object.freeze({
  home: ownedDirectory0700,
  "docker-config": ownedDirectory0700,
  tmp: ownedDirectory0700,
  "neutral-cwd": ownedDirectory0700,
});
const MACOS_ROOT_DELETE_INVENTORY = Object.freeze({
  build: ownedDirectory0700,
  signing: ownedDirectory0700,
  "isolated-home": ownedDirectory0700,
  tmp: ownedDirectory0700,
  "FormeCoreLocal.app": ownedDirectory0700,
});

export function parsePhysicalRunnerArguments(argv) {
  if (argv.length === 1 && argv[0] === "construct-physical-adapters") return Object.freeze({ mode: "construct-physical-adapters" });
  if (argv.length === 1 && argv[0] === "finalize-host-binding") return Object.freeze({ mode: "finalize-host-binding" });
  if (argv.length === 3 && argv[0] === "cleanup-construction" && argv[1] === "--construction-packet-sha" && argv[2] === PHYSICAL_AUTHORITY.constructionPacketSha256) return Object.freeze({ mode: "cleanup-construction", constructionPacketSha256: argv[2] });
  if (argv.length === 7 && ["execute-core-retry", "cleanup-core-retry"].includes(argv[0]) && argv[1] === "--manifest-sha" && argv[3] === "--execution-grant" && argv[5] === "--host-binding-id" && SHA.test(argv[2]) && argv[2] === argv[4] && ID.test(argv[6])) return Object.freeze({ mode: argv[0], manifestSha256: argv[2], executionGrantSha256: argv[4], hostBindingId: argv[6] });
  fail("PHYSICAL_RUNNER_ARGUMENTS_DENIED", "RED");
}

function currentChangedPaths() {
  const outputs = [
    gitRaw(["diff", "--name-only", "-z"]),
    gitRaw(["diff", "--cached", "--name-only", "-z"]),
    gitRaw(["ls-files", "--others", "--exclude-standard", "-z"]),
  ];
  return [...new Set(outputs.flatMap((output) => output.split("\0").filter(Boolean)))];
}
function parseNameStatus(output) {
  const tokens = output.split("\0").filter(Boolean);
  const entries = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (/^[RC][0-9]{1,3}$/u.test(status)) {
      const from = tokens[index++]; const to = tokens[index++];
      if (from === undefined || to === undefined) fail("PHYSICAL_PHASE_A_NAME_STATUS_INVALID", "RED");
      entries.push(Object.freeze({ status, path: to, from }));
    } else {
      const relativePath = tokens[index++];
      if (!/^[A-Z]$/u.test(status) || relativePath === undefined) fail("PHYSICAL_PHASE_A_NAME_STATUS_INVALID", "RED");
      entries.push(Object.freeze({ status, path: relativePath, from: null }));
    }
  }
  return entries;
}
function phaseAChangedPathStatuses() {
  const entries = [
    ...parseNameStatus(gitRaw(["diff", "--name-status", "-z", `${PHYSICAL_AUTHORITY.approvedProposalHead}..HEAD`])),
    ...parseNameStatus(gitRaw(["diff", "--name-status", "-z"])),
    ...parseNameStatus(gitRaw(["diff", "--cached", "--name-status", "-z"])),
    ...gitRaw(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean).map((relativePath) => Object.freeze({ status: "A", path: relativePath, from: null })),
  ];
  const byPath = new Map();
  for (const entry of entries) {
    if (!["A", "M"].includes(entry.status)) fail(`PHYSICAL_PHASE_A_DELETE_RENAME_DENIED:${entry.status}:${entry.path}`, "RED");
    const prior = byPath.get(entry.path);
    if (prior !== undefined && prior !== entry.status && !(prior === "A" && entry.status === "M") && !(prior === "M" && entry.status === "A")) fail(`PHYSICAL_PHASE_A_STATUS_CONFLICT:${entry.path}`, "RED");
    byPath.set(entry.path, prior === "A" || entry.status === "A" ? "A" : "M");
  }
  return byPath;
}
function committedChangedPaths(fromHead = PHYSICAL_AUTHORITY.approvedProposalHead, toHead = "HEAD") {
  const output = gitRaw(["diff", "--name-only", "-z", `${fromHead}..${toHead}`]);
  return output.split("\0").filter(Boolean);
}
export function verifyPhaseAAuthority() {
  if (fileSha(PACKET_PATH) !== PHYSICAL_AUTHORITY.constructionPacketSha256 || fileSha(REVIEW_PATH) !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256) fail("PHYSICAL_APPROVAL_BYTES_DRIFT", "RED");
  for (const [relativePath, expected] of Object.entries(IMMUTABLE_HASHES)) if (fileSha(relativePath) !== expected) fail(`PHYSICAL_IMMUTABLE_DRIFT:${relativePath}`, "RED");
  if (git(["branch", "--show-current"]) !== "codex/r4-gate-a-build") fail("PHYSICAL_BRANCH_DRIFT", "RED");
  const mergeBase = git(["merge-base", PHYSICAL_AUTHORITY.approvedProposalHead, "HEAD"]);
  if (mergeBase !== PHYSICAL_AUTHORITY.approvedProposalHead) fail("PHYSICAL_PROPOSAL_NOT_ANCESTOR", "RED");
  const proposalTree = git(["rev-parse", `${PHYSICAL_AUTHORITY.approvedProposalHead}^{tree}`]);
  if (proposalTree !== PHYSICAL_AUTHORITY.approvedProposalTree) fail("PHYSICAL_PROPOSAL_TREE_DRIFT", "RED");
  const statusByPath = phaseAChangedPathStatuses();
  const changed = [...statusByPath.keys()];
  for (const relativePath of changed) if (!PHASE_A_IMPLEMENTATION_PATHS.has(relativePath)) fail(`PHYSICAL_PHASE_A_WORKSET_ESCAPE:${relativePath}`, "RED");
  for (const [relativePath, status] of statusByPath) {
    if (status === "A" && !PHASE_A_REQUIRED_NEW_PATHS.has(relativePath)) fail(`PHYSICAL_PHASE_A_UNAPPROVED_NEW_PATH:${relativePath}`, "RED");
    if (status === "M" && PHASE_A_REQUIRED_NEW_PATHS.has(relativePath)) fail(`PHYSICAL_PHASE_A_REQUIRED_NEW_PATH_NOT_NEW:${relativePath}`, "RED");
  }
  for (const relativePath of PHASE_A_REQUIRED_NEW_PATHS) {
    if (statusByPath.get(relativePath) !== "A") fail(`PHYSICAL_PHASE_A_REQUIRED_NEW_PATH_MISSING:${relativePath}`, "RED");
    const absolute = path.join(REPOSITORY_ROOT, relativePath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(absolute) !== absolute) fail(`PHYSICAL_PHASE_A_REQUIRED_NEW_PATH_UNSAFE:${relativePath}`, "RED");
  }
  return Object.freeze({ changedPaths: Object.freeze(changed.sort()), packetSha256: PHYSICAL_AUTHORITY.constructionPacketSha256, proposalAncestor: true, packageLockSha256: IMMUTABLE_HASHES["package-lock.json"] });
}

const PHASE_B_CONSTRUCTION_ROOT_INVENTORIES = Object.freeze({
  "checkpoint-only": Object.freeze(["construction-checkpoint.v1.json"]),
  "checkpoint-and-journal": Object.freeze(["construction-checkpoint.v1.json", "journal.v1.jsonl"]),
});
function sameStableBigIntIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.uid === right.uid && left.gid === right.gid && left.nlink === right.nlink && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}
function readConstructionRootNameBytes(root) {
  try { return fs.readdirSync(root, { encoding: "buffer" }).sort((left, right) => Buffer.compare(left, right)); }
  catch { fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_UNREADABLE", "RED_QUARANTINED"); }
}
export function verifyPhaseBConstructionRootInventory(root = CONSTRUCTION_ROOT, phase = "checkpoint-only", { rootAuthority: carriedRootAuthority = null } = {}) {
  const expectedNames = PHASE_B_CONSTRUCTION_ROOT_INVENTORIES[phase];
  if (!path.isAbsolute(root) || path.normalize(root) !== root || expectedNames === undefined || typeof fs.constants.O_NOFOLLOW !== "number" || typeof fs.constants.O_DIRECTORY !== "number" || (carriedRootAuthority !== null && (!exactOwnedRootAuthorities.has(carriedRootAuthority) || carriedRootAuthority.state.closed || carriedRootAuthority.root !== root))) fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_AUTHORITY_INVALID", "RED_QUARANTINED");
  const expectedNameBytes = expectedNames.map((name) => Buffer.from(name, "utf8")).sort((left, right) => Buffer.compare(left, right));
  const namesEqual = (observed) => observed.length === expectedNameBytes.length && observed.every((name, index) => name.equals(expectedNameBytes[index]));
  let ownedRootAuthority = null;
  const rootAuthority = carriedRootAuthority ?? (ownedRootAuthority = openExactOwnedRootAuthority({ root, anchor: exactOwnedRootAnchor(root, "PHASE_B_CONSTRUCTION_ROOT"), codePrefix: "PHASE_B_CONSTRUCTION_ROOT" }));
  try {
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "PHASE_B_CONSTRUCTION_ROOT");
    const rootBefore = fs.lstatSync(root, { bigint: true });
    if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink() || rootBefore.uid !== BigInt(process.getuid()) || (rootBefore.mode & 0o777n) !== 0o700n || fs.realpathSync(root) !== root) fail("PHASE_B_CONSTRUCTION_ROOT_UNSAFE", "RED_QUARANTINED");
    const rootOpened = fs.fstatSync(rootAuthority.rootFd, { bigint: true });
    if (!sameStableBigIntIdentity(rootBefore, rootOpened)) fail("PHASE_B_CONSTRUCTION_ROOT_IDENTITY_DRIFT", "RED_QUARANTINED");
    const namesBefore = readConstructionRootNameBytes(root);
    if (!namesEqual(namesBefore)) fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_INVALID", "RED_QUARANTINED");
    for (const name of expectedNames) {
      const entryPath = path.join(root, name);
      const entryBefore = fs.lstatSync(entryPath, { bigint: true });
      if (!entryBefore.isFile() || entryBefore.isSymbolicLink() || entryBefore.uid !== BigInt(process.getuid()) || entryBefore.nlink !== 1n || (entryBefore.mode & 0o777n) !== 0o600n) fail("PHASE_B_CONSTRUCTION_ROOT_ENTRY_UNSAFE", "RED_QUARANTINED");
      const entryFd = fs.openSync(entryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      try {
        const entryOpened = fs.fstatSync(entryFd, { bigint: true });
        const entryAfter = fs.lstatSync(entryPath, { bigint: true });
        if (!sameStableBigIntIdentity(entryBefore, entryOpened) || !sameStableBigIntIdentity(entryBefore, entryAfter)) fail("PHASE_B_CONSTRUCTION_ROOT_ENTRY_IDENTITY_DRIFT", "RED_QUARANTINED");
      } finally { fs.closeSync(entryFd); }
    }
    const namesAfter = readConstructionRootNameBytes(root);
    const rootAfterFd = fs.fstatSync(rootAuthority.rootFd, { bigint: true });
    const rootAfterPath = fs.lstatSync(root, { bigint: true });
    if (!namesEqual(namesAfter) || !sameStableBigIntIdentity(rootBefore, rootAfterFd) || !sameStableBigIntIdentity(rootBefore, rootAfterPath)) fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_DRIFT", "RED_QUARANTINED");
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "PHASE_B_CONSTRUCTION_ROOT");
    return Object.freeze({ phase, entries: Object.freeze([...expectedNames]), stableIdentity: true, noFollow: true });
  } catch (error) {
    if (error instanceof PhysicalRunnerError) throw error;
    fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_UNREADABLE", "RED_QUARANTINED");
  } finally {
    if (ownedRootAuthority !== null) {
      try { closeExactOwnedRootAuthority(ownedRootAuthority, "PHASE_B_CONSTRUCTION_ROOT_INVENTORY_CLOSE_FAILED"); }
      catch { fail("PHASE_B_CONSTRUCTION_ROOT_INVENTORY_CLOSE_FAILED", "RED_QUARANTINED"); }
    }
  }
}

export function createConstructionJournal(root = CONSTRUCTION_ROOT, { rootAuthority: carriedRootAuthority = null } = {}) {
  let rootCreated = false;
  if (carriedRootAuthority !== null && (!exactOwnedRootAuthorities.has(carriedRootAuthority) || carriedRootAuthority.state.closed || carriedRootAuthority.root !== root)) fail("CONSTRUCTION_RUN_ROOT_CARRIED_AUTHORITY_INVALID", "RED_QUARANTINED");
  const borrowedRootAuthority = carriedRootAuthority !== null;
  const rootCreationAttempted = !borrowedRootAuthority && lstatIfPresent(root, "CONSTRUCTION_RUN_ROOT_UNREADABLE", "RED") === null;
  const journalPath = path.join(root, "journal.v1.jsonl");
  let fd = null;
  let journalCreated = false;
  let journalIdentity = null;
  let rootAuthority = carriedRootAuthority;
  try {
    if (rootCreationAttempted) {
      const rootAnchor = exactOwnedRootAnchor(root, "CONSTRUCTION_RUN_ROOT");
      ensureOwnedPrivateDirectory(path.dirname(root), rootAnchor);
      rootAuthority = createExclusiveOwnedRoot0700(root, rootAnchor, "CONSTRUCTION_RUN_ROOT");
      rootCreated = true;
    }
    else if (rootAuthority === null) {
      const stat = fs.lstatSync(root);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700 || fs.realpathSync(root) !== root) fail("CONSTRUCTION_RUN_ROOT_UNSAFE", "RED");
      rootAuthority = openExactOwnedRootAuthority({ root, anchor: exactOwnedRootAnchor(root, "CONSTRUCTION_RUN_ROOT"), codePrefix: "CONSTRUCTION_RUN_ROOT" });
    }
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_RUN_ROOT");
    fd = fs.openSync(journalPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
    journalCreated = true;
    journalIdentity = fs.fstatSync(fd);
    if (!journalIdentity.isFile() || journalIdentity.uid !== process.getuid() || journalIdentity.nlink !== 1 || (journalIdentity.mode & 0o777) !== 0o600 || journalIdentity.size !== 0) fail("CONSTRUCTION_JOURNAL_CREATE_IDENTITY_INVALID", "RED_QUARANTINED");
    fs.fsyncSync(fd);
    fs.fsyncSync(rootAuthority.rootFd);
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_RUN_ROOT");
  } catch (error) {
    let cleanupUncertain = false;
    if (journalCreated && journalIdentity === null && fd !== null) try { journalIdentity = fs.fstatSync(fd); } catch { cleanupUncertain = true; }
    if (fd !== null) { try { fs.closeSync(fd); } catch { cleanupUncertain = true; } fd = null; }
    if (rootAuthority !== null && !cleanupUncertain) {
      try { assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_RUN_ROOT"); }
      catch { cleanupUncertain = true; }
    }
    if (!rootCreated && journalCreated && rootAuthority !== null && !cleanupUncertain) {
      try {
        const observed = fs.lstatSync(journalPath);
        if (journalIdentity === null || !observed.isFile() || observed.isSymbolicLink() || observed.uid !== process.getuid() || observed.nlink !== 1 || (observed.mode & 0o777) !== 0o600 || observed.dev !== journalIdentity.dev || observed.ino !== journalIdentity.ino) cleanupUncertain = true;
        else {
          fs.unlinkSync(journalPath);
          if (lstatIfPresent(journalPath, "CONSTRUCTION_JOURNAL_CREATE_ABSENCE_UNREADABLE") !== null) cleanupUncertain = true;
          else {
            assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_RUN_ROOT");
            fs.fsyncSync(rootAuthority.rootFd);
          }
        }
      } catch { cleanupUncertain = true; }
    }
    if (rootCreated && rootAuthority !== null && !cleanupUncertain) {
      const ownedAuthority = rootAuthority;
      rootAuthority = null;
      try { removeExactOwnedRootTree(ownedAuthority, CONSTRUCTION_ROOT_DELETE_INVENTORY); }
      catch { cleanupUncertain = true; }
    }
    if (rootAuthority !== null && !borrowedRootAuthority) {
      try { closeExactOwnedRootAuthority(rootAuthority, "CONSTRUCTION_RUN_ROOT_AUTHORITY_CLOSE_FAILED"); }
      catch { cleanupUncertain = true; }
      rootAuthority = null;
    }
    if (cleanupUncertain) fail("CONSTRUCTION_JOURNAL_CREATE_CLEANUP_UNCERTAIN", "RED_QUARANTINED");
    if (error instanceof PhysicalRunnerError) throw error;
    fail("CONSTRUCTION_JOURNAL_CREATE_FAILED", "RED");
  }
  let rootAuthorityTransferred = false;
  let sequence = 0;
  let previous = null;
  let poisoned = false;
  const raw = [];
  const records = [];
  return Object.freeze({
    path: journalPath,
    async append(partial) {
      if (fd === null) fail("CONSTRUCTION_JOURNAL_ALREADY_CLOSED", "RED");
      if (poisoned) fail("CONSTRUCTION_JOURNAL_APPEND_POISONED", "RED_QUARANTINED");
      const record = Object.freeze({
        schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous,
        runId: HOST_BINDING_AUTHORITY.constructionRunId, manifestSha256: null, hostBindingId: partial.hostBindingId ?? null,
        lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null,
        processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required",
      });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      try {
        writeAll(fd, bytes);
        fs.fsyncSync(fd);
        const durableBytes = Buffer.from(bytes);
        raw.push(durableBytes);
        records.push(record);
        previous = sha256(bytes);
        sequence += 1;
        return record;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally { bytes.fill(0); }
    },
    close() { if (fd !== null) { const owned = fd; fd = null; fs.closeSync(owned); } },
    takeRootAuthority() {
      if (rootAuthorityTransferred || rootAuthority === null) fail("CONSTRUCTION_RUN_ROOT_AUTHORITY_ALREADY_TAKEN", "RED_QUARANTINED");
      try { assertClosedExactOwnedRootInventory(rootAuthority, rootCreated ? CONSTRUCTION_NEW_JOURNAL_INVENTORY : CONSTRUCTION_EXISTING_JOURNAL_INVENTORY, "CONSTRUCTION_RUN_ROOT"); }
      catch (error) {
        let finalizationError = null;
        if (fd !== null) {
          const owned = fd; fd = null;
          try { fs.closeSync(owned); }
          catch { finalizationError = new PhysicalRunnerError("CONSTRUCTION_RUN_ROOT_TRANSFER_JOURNAL_CLOSE_FAILED", "RED"); }
        }
        for (const bytes of raw) bytes.fill(0);
        try { closeExactOwnedRootAuthority(rootAuthority, "CONSTRUCTION_RUN_ROOT_TRANSFER_AUTHORITY_CLOSE_FAILED"); }
        catch (closeError) { finalizationError = selectPhysicalRunnerTerminalError(finalizationError, null, closeError); }
        rootAuthority = null;
        throw selectPhysicalRunnerTerminalError(error, null, finalizationError);
      }
      rootAuthorityTransferred = true;
      return rootAuthority;
    },
    aggregateSha256() { if (poisoned) fail("CONSTRUCTION_JOURNAL_APPEND_POISONED", "RED_QUARANTINED"); return sha256(Buffer.concat(raw)); },
    records() { return Object.freeze([...records]); },
    zeroize() {
      for (const bytes of raw) bytes.fill(0);
      if (!rootAuthorityTransferred && rootAuthority !== null) { closeExactOwnedRootAuthority(rootAuthority, "CONSTRUCTION_RUN_ROOT_AUTHORITY_CLOSE_FAILED"); rootAuthority = null; }
    },
  });
}

function safeRemoveExactTree(root) {
  const parent = path.join(REPOSITORY_ROOT, ".forme/gate-b-physical-construction");
  if (!path.isAbsolute(root) || path.dirname(root) !== parent) fail("CONSTRUCTION_CLEANUP_ROOT_INVALID", "RED");
  const authority = openExactOwnedRootAuthority({ root, anchor: REPOSITORY_ROOT, codePrefix: "CONSTRUCTION_CLEANUP_ROOT" });
  removeExactOwnedRootTree(authority, CONSTRUCTION_ROOT_DELETE_INVENTORY);
}
export function readConstructionJournalForCleanup({ constructionRoot = CONSTRUCTION_ROOT, journalPath = JOURNAL_PATH, checkpointPath = CHECKPOINT_PATH, rootAuthority: carriedRootAuthority = null } = {}) {
  if (!path.isAbsolute(constructionRoot) || path.normalize(constructionRoot) !== constructionRoot || journalPath !== path.join(constructionRoot, "journal.v1.jsonl") || checkpointPath !== path.join(constructionRoot, "construction-checkpoint.v1.json")) fail("CONSTRUCTION_JOURNAL_READ_AUTHORITY_INVALID", "RED");
  if (carriedRootAuthority !== null && (!exactOwnedRootAuthorities.has(carriedRootAuthority) || carriedRootAuthority.state.closed || carriedRootAuthority.root !== constructionRoot)) fail("CONSTRUCTION_CLEANUP_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  let rootAuthority = carriedRootAuthority;
  let retainRootAuthority = false;
  try {
    if (rootAuthority !== null) assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CLEANUP_ROOT");
    const rootStat = lstatIfPresent(constructionRoot, "CONSTRUCTION_CLEANUP_ROOT_UNREADABLE");
    if (rootStat === null) {
      if (rootAuthority !== null) fail("CONSTRUCTION_CLEANUP_CARRIED_ROOT_ABSENT", "RED_QUARANTINED");
      return Object.freeze({ alreadyAbsent: true, journalPath, records: Object.freeze([]) });
    }
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.uid !== process.getuid() || (rootStat.mode & 0o777) !== 0o700 || fs.realpathSync(constructionRoot) !== constructionRoot) fail("CONSTRUCTION_CLEANUP_ROOT_UNSAFE", "RED_QUARANTINED");
    rootAuthority ??= openExactOwnedRootAuthority({ root: constructionRoot, anchor: exactOwnedRootAnchor(constructionRoot, "CONSTRUCTION_CLEANUP_ROOT"), codePrefix: "CONSTRUCTION_CLEANUP_ROOT" });
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CLEANUP_ROOT");
    if (lstatIfPresent(journalPath, "CONSTRUCTION_JOURNAL_PATH_UNREADABLE") === null) {
      const names = fs.readdirSync(constructionRoot).sort();
      if (names.length !== 0) fail("CONSTRUCTION_CHECKPOINT_RESIDUE_UNCLAIMED", "RED_QUARANTINED");
      retainRootAuthority = true;
      return Object.freeze({ alreadyAbsent: false, journalPath, records: Object.freeze([]), rootAuthority });
    }
    const stat = fs.lstatSync(journalPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.size < 0 || stat.size > 16_777_216) fail("CONSTRUCTION_JOURNAL_UNSAFE", "RED_QUARANTINED");
  const fd = fs.openSync(journalPath, fs.constants.O_RDWR | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(stat.size);
  let authenticatedResult = null;
  let primaryError = null;
  let journalReadCloseFaultCode = null;
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("CONSTRUCTION_JOURNAL_SHORT_READ", "RED_QUARANTINED");
      offset += count;
    }
    const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(journalPath);
    if (afterFd.dev !== stat.dev || afterFd.ino !== stat.ino || afterFd.size !== stat.size || afterFd.uid !== stat.uid || afterFd.nlink !== 1 || (afterFd.mode & 0o777) !== 0o600 || Math.trunc(afterFd.mtimeMs) !== Math.trunc(stat.mtimeMs) || afterPath.dev !== stat.dev || afterPath.ino !== stat.ino || afterPath.size !== stat.size || afterPath.uid !== stat.uid || afterPath.nlink !== 1 || (afterPath.mode & 0o777) !== 0o600 || Math.trunc(afterPath.mtimeMs) !== Math.trunc(stat.mtimeMs)) fail("CONSTRUCTION_JOURNAL_TOCTOU_OR_FRAME", "RED_QUARANTINED");
    const keys = new Set(["schemaVersion", "sequence", "previousRecordSha256", "runId", "manifestSha256", "hostBindingId", "lane", "event", "commandShapeSha256", "processGroupId", "ownedResources", "terminalCode", "cleanupState"]);
    let previous = null;
    const records = [];
    const prefixLength = bytes.length === 0 || bytes.at(-1) === 0x0a ? bytes.length : bytes.lastIndexOf(0x0a) + 1;
    let cursor = 0;
    while (cursor < prefixLength) {
      const end = bytes.indexOf(0x0a, cursor);
      if (end < cursor || end >= prefixLength || end === cursor) fail("CONSTRUCTION_JOURNAL_CHAIN_INVALID", "RED_QUARANTINED");
      const lineBytes = bytes.subarray(cursor, end);
      const line = lineBytes.toString("utf8");
      let value;
      try {
        value = parseStrictJson(line);
        exactObject(value, keys, "CONSTRUCTION_JOURNAL_RECORD_SHAPE");
        if (line !== canonicalJson(value) || value.schemaVersion !== "r4_gate_b_physical_journal.v1" || value.sequence !== records.length || value.previousRecordSha256 !== previous || value.runId !== HOST_BINDING_AUTHORITY.constructionRunId || value.manifestSha256 !== null || (value.hostBindingId !== null && !ID.test(value.hostBindingId))) throw new Error("invalid construction journal chain");
      } catch { fail("CONSTRUCTION_JOURNAL_CHAIN_INVALID", "RED_QUARANTINED"); }
      previous = sha256(bytes.subarray(cursor, end + 1));
      records.push(Object.freeze(value));
      cursor = end + 1;
    }
    const resourceNames = fs.readdirSync(constructionRoot).filter((name) => name !== path.basename(journalPath));
    if (records.length === 0 && resourceNames.length !== 0) fail("CONSTRUCTION_CHECKPOINT_RESIDUE_UNCLAIMED", "RED_QUARANTINED");
    if (prefixLength !== bytes.length) {
      try {
        fs.ftruncateSync(fd, prefixLength);
        fs.fsyncSync(fd);
        const repairedFd = fs.fstatSync(fd); const repairedPath = fs.lstatSync(journalPath);
        if (repairedFd.dev !== stat.dev || repairedFd.ino !== stat.ino || repairedFd.size !== prefixLength || repairedFd.uid !== stat.uid || repairedFd.nlink !== 1 || (repairedFd.mode & 0o777) !== 0o600 || repairedPath.dev !== stat.dev || repairedPath.ino !== stat.ino || repairedPath.size !== prefixLength || repairedPath.uid !== stat.uid || repairedPath.nlink !== 1 || (repairedPath.mode & 0o777) !== 0o600) fail("CONSTRUCTION_JOURNAL_TAIL_REPAIR_INVALID", "RED_QUARANTINED");
      } catch (error) {
        if (error instanceof PhysicalRunnerError) throw error;
        fail("CONSTRUCTION_JOURNAL_TAIL_REPAIR_FAILED", "RED_QUARANTINED");
      }
    }
    const finalJournalFd = fs.fstatSync(fd);
    const finalJournalPath = fs.lstatSync(journalPath);
    if (!finalJournalFd.isFile() || finalJournalFd.isSymbolicLink() || canonicalJson(statIdentityForCleanup(finalJournalFd)) !== canonicalJson(statIdentityForCleanup(finalJournalPath))) fail("CONSTRUCTION_JOURNAL_POST_REPAIR_DRIFT", "RED_QUARANTINED");
    authenticatedResult = Object.freeze({ alreadyAbsent: false, journalPath, journalIdentity: statIdentityForCleanup(finalJournalFd), records: Object.freeze(records) });
  } catch (error) { primaryError = error; }
  finally {
    bytes.fill(0);
    try { fs.closeSync(fd); }
    catch { journalReadCloseFaultCode = "CONSTRUCTION_JOURNAL_READ_CLOSE_FAILED"; }
  }
    if (primaryError !== null) throw primaryError;
    if (authenticatedResult === null) fail("CONSTRUCTION_JOURNAL_READ_RESULT_MISSING", "RED_QUARANTINED");
    retainRootAuthority = true;
    return Object.freeze({ ...authenticatedResult, journalReadCloseFaultCode, rootAuthority });
  } finally {
    if (!retainRootAuthority && rootAuthority !== null) closeExactOwnedRootAuthority(rootAuthority);
  }
}

export function openAuthenticatedConstructionJournalForAppend(authenticated) {
  if (!exactOwnedRootAuthorities.has(authenticated?.rootAuthority) || authenticated.rootAuthority.state.closed) fail("CONSTRUCTION_CLEANUP_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "CONSTRUCTION_CLEANUP_ROOT");
  const chain = snapshotNoSymlinkPathChain(authenticated.journalPath, "CONSTRUCTION_CLEANUP_JOURNAL_PATH_UNSAFE");
  const before = fs.lstatSync(authenticated.journalPath);
  const fd = fs.openSync(authenticated.journalPath, fs.constants.O_WRONLY | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW ?? 0));
  const opened = fs.fstatSync(fd);
  const afterPath = fs.lstatSync(authenticated.journalPath);
  try { assertNoSymlinkPathChainStable(chain, "CONSTRUCTION_CLEANUP_JOURNAL_PATH_DRIFT"); }
  catch (error) { fs.closeSync(fd); throw error; }
  if (!before.isFile() || before.isSymbolicLink() || before.dev !== opened.dev || before.ino !== opened.ino || before.size !== opened.size || before.uid !== process.getuid() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600 || afterPath.dev !== before.dev || afterPath.ino !== before.ino || afterPath.size !== before.size || afterPath.nlink !== 1) { fs.closeSync(fd); fail("CONSTRUCTION_CLEANUP_JOURNAL_APPEND_UNSAFE", "RED_QUARANTINED"); }
  const records = [...authenticated.records];
  let sequence = records.length;
  let previous = null;
  if (records.length !== 0) {
    const previousBytes = Buffer.from(`${canonicalJson(records.at(-1))}\n`, "utf8");
    try { previous = sha256(previousBytes); } finally { previousBytes.fill(0); }
  }
  let closed = false;
  let poisoned = false;
  return Object.freeze({
    records() { return Object.freeze([...records]); },
    async append(partial) {
      if (closed) fail("CONSTRUCTION_CLEANUP_JOURNAL_ALREADY_CLOSED", "RED_QUARANTINED");
      if (poisoned) fail("CONSTRUCTION_CLEANUP_JOURNAL_APPEND_POISONED", "RED_QUARANTINED");
      assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "CONSTRUCTION_CLEANUP_ROOT");
      const record = Object.freeze({ schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous, runId: HOST_BINDING_AUTHORITY.constructionRunId, manifestSha256: null, hostBindingId: partial.hostBindingId ?? null, lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null, processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required" });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      try { writeAll(fd, bytes); fs.fsyncSync(fd); assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "CONSTRUCTION_CLEANUP_ROOT"); previous = sha256(bytes); records.push(record); sequence += 1; return record; }
      catch (error) { poisoned = true; throw error; }
      finally { bytes.fill(0); }
    },
    close() { if (!closed) { closed = true; fs.closeSync(fd); } },
  });
}
const HOST_INSPECTOR_COMMAND_IDS = new Set([
  "docker-client-version", "docker-daemon-version", "docker-image-observation",
  "macos-product-version", "macos-build-version", "macos-architecture", "developer-root",
  "swiftc-path", "sdk-path", "sdk-version", "swift-version", "openssl-version",
]);
const CONSTRUCTION_PROCESS_IDS = new Set(["blocked-start-fake", ...Array.from({ length: 13 }, (_, index) => `blocked-start-fault-${index}`), "helper-spawn", "feeder-spawn"]);
function constructionProcessResources(id) {
  if (id === "helper-spawn") return ["macos-helper-group", "candidate-pipe", "helper-receipt-pipe", "direct-ready-pipe", "direct-release-pipe"];
  if (id === "feeder-spawn") return ["macos-feeder-group", "candidate-pipe", "completion-pipe", "direct-ready-pipe", "direct-release-pipe"];
  return ["macos-process-group"];
}
export function validateConstructionJournalForCleanup(records) {
  const processStates = new Map();
  let publicationHostBindingId = null;
  let capsuleTargetAbsent = false;
  let receiptTargetAbsent = false;
  let capsuleIntent = false;
  let receiptIntent = false;
  let capsuleStageReady = false;
  let receiptStageReady = false;
  let capsuleExpectedSha256 = null;
  let receiptExpectedSha256 = null;
  let publicationComplete = false;
  let ownerInputOpenIntent = false;
  let fakeMatrixIntent = false;
  let fakeMatrixObserved = false;
  let slotRootIntent = false;
  let slotRootObserved = false;
  const observedInspectorIds = new Set();
  const allowedNonProcessEvents = new Set([
    "fake-matrix-intent", "fake-matrix-observed", "input-open-intent",
    "intent:blocked-start-slot-root", "observed:blocked-start-slot-root",
    "capsule-target-absent", "public-receipt-target-absent", "capsule-publication-intent",
    "capsule-stage-ready", "public-receipt-publication-intent", "public-receipt-stage-ready", "capsule-published",
  ]);
  const rememberedIntent = new Map();
  const consumedInspectorIntents = new Set();
  const unstartedSupervisorStarts = new Map();
  const constructionIntents = new Map();
  const constructionProcessStates = new Map();
  const constructionCompletedIds = new Set();
  const constructionUnstartedSupervisorStarts = new Map();
  const constructionUnstartedDirectGateIntents = new Set();
  for (const record of records) {
    if (fakeMatrixIntent && !fakeMatrixObserved && record.event !== "fake-matrix-observed") {
      if (["intent:blocked-start-slot-root", "observed:blocked-start-slot-root"].includes(record.event)) {
        const shape = sha256(Buffer.from("r4-gate-b-blocked-start-slot-root.v1\n", "utf8"));
        const isIntent = record.event.startsWith("intent:");
        if (record.lane !== "construction" || record.hostBindingId !== null || record.processGroupId !== null || record.commandShapeSha256 !== shape || canonicalJson(record.ownedResources) !== canonicalJson(["blocked-start-slot-root"]) || record.cleanupState !== "required" || (isIntent ? slotRootIntent || slotRootObserved || record.terminalCode !== null : !slotRootIntent || slotRootObserved || record.terminalCode !== "CREATED")) fail("CONSTRUCTION_JOURNAL_PHASE_A_SLOT_ROOT_INVALID", "RED_QUARANTINED");
        if (isIntent) slotRootIntent = true; else slotRootObserved = true;
        continue;
      }
      const phaseMatch = /^(intent|started|terminal|cleanup-observed-absent|not-started):(.+)$/u.exec(record.event);
      if (phaseMatch !== null && CONSTRUCTION_PROCESS_IDS.has(phaseMatch[2])) {
        const [, phase, id] = phaseMatch;
        const resources = constructionProcessResources(id);
        if (record.lane !== "macos" || record.hostBindingId !== null || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson(resources)) fail("CONSTRUCTION_JOURNAL_PHASE_A_PROCESS_SHAPE_INVALID", "RED_QUARANTINED");
        if (phase === "intent") {
          if (constructionIntents.has(id) || constructionCompletedIds.has(id) || record.processGroupId !== null || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_PHASE_A_PROCESS_INTENT_INVALID", "RED_QUARANTINED");
          const descriptor = Object.freeze({ id, hash: record.commandShapeSha256, sequence: record.sequence, resources: Object.freeze(resources) });
          constructionIntents.set(id, descriptor);
          if (id === "helper-spawn" || id === "feeder-spawn") constructionUnstartedDirectGateIntents.add(id);
          else constructionUnstartedSupervisorStarts.set(id, Object.freeze({ startSequence: record.sequence, family: "macos", logicalId: id, commandShapeSha256: record.commandShapeSha256 }));
          continue;
        }
        const intent = constructionIntents.get(id);
        if (intent === undefined || record.commandShapeSha256 !== intent.hash) fail("CONSTRUCTION_JOURNAL_PHASE_A_PROCESS_WITHOUT_INTENT", "RED_QUARANTINED");
        if (phase === "not-started") {
          if (id === "helper-spawn" || id === "feeder-spawn" || constructionCompletedIds.has(id) || record.processGroupId !== null || record.terminalCode !== "NOT_STARTED" || record.cleanupState !== "observed-absent") fail("CONSTRUCTION_JOURNAL_PHASE_A_NOT_STARTED_INVALID", "RED_QUARANTINED");
          constructionUnstartedSupervisorStarts.delete(id);
          constructionCompletedIds.add(id);
          continue;
        }
        if (!Number.isSafeInteger(record.processGroupId) || record.processGroupId <= 1) fail("CONSTRUCTION_JOURNAL_PHASE_A_PID_INVALID", "RED_QUARANTINED");
        let state = constructionProcessStates.get(record.processGroupId);
        if (phase === "started") {
          if (state !== undefined || [...constructionProcessStates.values()].some((value) => value.id === id) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_PHASE_A_START_INVALID", "RED_QUARANTINED");
          state = { id, hash: intent.hash, resources, terminal: false, terminalCode: null, absent: false, recovered: false };
          constructionProcessStates.set(record.processGroupId, state);
          constructionUnstartedSupervisorStarts.delete(id);
          constructionUnstartedDirectGateIntents.delete(id);
          continue;
        }
        if (phase === "cleanup-observed-absent") {
          if (record.terminalCode !== "ABSENT" || record.cleanupState !== "observed-absent") fail("CONSTRUCTION_JOURNAL_PHASE_A_RECOVERY_INVALID", "RED_QUARANTINED");
          if (state === undefined) {
            if ([...constructionProcessStates.values()].some((value) => value.id === id) || constructionCompletedIds.has(id)) fail("CONSTRUCTION_JOURNAL_PHASE_A_RECOVERY_REPLAY", "RED_QUARANTINED");
            state = { id, hash: intent.hash, resources, terminal: true, terminalCode: "ABSENT", absent: true, recovered: true };
            constructionProcessStates.set(record.processGroupId, state);
          } else {
            if (state.id !== id || state.hash !== intent.hash || state.recovered || state.absent) fail("CONSTRUCTION_JOURNAL_PHASE_A_RECOVERY_REPLAY", "RED_QUARANTINED");
            state.terminal = true; state.terminalCode = "ABSENT"; state.absent = true; state.recovered = true;
          }
          constructionUnstartedSupervisorStarts.delete(id);
          constructionUnstartedDirectGateIntents.delete(id);
          constructionCompletedIds.add(id);
          continue;
        }
        if (state === undefined || state.id !== id || state.hash !== intent.hash || state.terminal) fail("CONSTRUCTION_JOURNAL_PHASE_A_TERMINAL_WITHOUT_START", "RED_QUARANTINED");
        const terminalCodeValid = record.terminalCode === "NO_TERMINAL" || (typeof record.terminalCode === "string" && /^(?:-1|0|[1-9][0-9]{0,2})$/u.test(record.terminalCode) && Number(record.terminalCode) <= 255);
        if (!terminalCodeValid || !["observed-absent", "quarantined"].includes(record.cleanupState)) fail("CONSTRUCTION_JOURNAL_PHASE_A_TERMINAL_INVALID", "RED_QUARANTINED");
        state.terminal = true; state.terminalCode = record.terminalCode; state.absent = record.cleanupState === "observed-absent";
        if (state.absent) constructionCompletedIds.add(id);
        continue;
      }
      fail("CONSTRUCTION_JOURNAL_PHASE_A_EVENT_INVALID", "RED_QUARANTINED");
    }
    if (record.lane === "host-binding" && record.event.startsWith("intent:")) {
      const id = record.event.slice("intent:".length);
      if (HOST_INSPECTOR_COMMAND_IDS.has(id)) {
        if (!ownerInputOpenIntent || !slotRootObserved || publicationHostBindingId !== null || rememberedIntent.has(id) || record.hostBindingId !== null || record.processGroupId !== null || record.terminalCode !== null || record.cleanupState !== "required" || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson(["inspector-process-group"])) fail("CONSTRUCTION_JOURNAL_INSPECTOR_INTENT_INVALID", "RED_QUARANTINED");
        rememberedIntent.set(id, Object.freeze({ hash: record.commandShapeSha256, sequence: record.sequence }));
        unstartedSupervisorStarts.set(id, Object.freeze({ startSequence: record.sequence, family: "host-inspector", logicalId: id, commandShapeSha256: record.commandShapeSha256 }));
        continue;
      }
    }
    const processPhaseMatch = record.lane === "host-binding" ? /^(started|terminal|observed|cleanup-observed-absent):(.+)$/u.exec(record.event) : null;
    if (processPhaseMatch !== null && HOST_INSPECTOR_COMMAND_IDS.has(processPhaseMatch[2])) {
      const [phase, id] = record.event.split(":", 2);
      const expectedIntent = rememberedIntent.get(id);
      const expectedHash = expectedIntent?.hash;
      if (!HOST_INSPECTOR_COMMAND_IDS.has(id) || expectedHash === undefined || record.hostBindingId !== null || record.commandShapeSha256 !== expectedHash || !Number.isSafeInteger(record.processGroupId) || record.processGroupId <= 1 || canonicalJson(record.ownedResources) !== canonicalJson(["inspector-process-group"])) fail("CONSTRUCTION_JOURNAL_INSPECTOR_SEQUENCE_INVALID", "RED_QUARANTINED");
      let state = processStates.get(record.processGroupId);
      if (phase === "started") {
        if (consumedInspectorIntents.has(id) || state !== undefined || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_INSPECTOR_DUPLICATE_START", "RED_QUARANTINED");
        consumedInspectorIntents.add(id);
        state = { id, hash: expectedHash, terminal: false, terminalCode: null, absent: false, recovered: false };
        processStates.set(record.processGroupId, state);
        unstartedSupervisorStarts.delete(id);
      } else {
        if (phase === "cleanup-observed-absent") {
          if (record.terminalCode !== "ABSENT" || record.cleanupState !== "observed-absent") fail("CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_INVALID", "RED_QUARANTINED");
          if (state === undefined) {
            if (consumedInspectorIntents.has(id)) fail("CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_DUPLICATE", "RED_QUARANTINED");
            consumedInspectorIntents.add(id);
            state = { id, hash: expectedHash, terminal: true, terminalCode: "ABSENT", absent: true, recovered: true };
            processStates.set(record.processGroupId, state);
            unstartedSupervisorStarts.delete(id);
          } else {
            if (state.id !== id || state.hash !== expectedHash || state.recovered || observedInspectorIds.has(id)) fail("CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_DUPLICATE", "RED_QUARANTINED");
            state.terminal = true; state.terminalCode = "ABSENT"; state.absent = true; state.recovered = true;
          }
        } else if (state === undefined || state.id !== id || state.hash !== expectedHash) fail("CONSTRUCTION_JOURNAL_INSPECTOR_WITHOUT_START", "RED_QUARANTINED");
        else if (phase === "terminal") {
          const terminalCodeValid = record.terminalCode === "NO_TERMINAL" || (typeof record.terminalCode === "string" && /^(?:-1|0|[1-9][0-9]{0,2})$/u.test(record.terminalCode) && Number(record.terminalCode) <= 255);
          if (state.terminal || !terminalCodeValid || !["observed-absent", "quarantined"].includes(record.cleanupState)) fail("CONSTRUCTION_JOURNAL_INSPECTOR_DUPLICATE_TERMINAL", "RED_QUARANTINED");
          state.terminal = true;
          state.terminalCode = record.terminalCode;
          state.absent = record.cleanupState === "observed-absent";
        } else {
          if (!state.terminal || state.terminalCode !== "0" || !state.absent || state.recovered || record.terminalCode !== "0" || record.cleanupState !== "observed-absent") fail("CONSTRUCTION_JOURNAL_INSPECTOR_OBSERVED_INVALID", "RED_QUARANTINED");
          if (observedInspectorIds.has(id)) fail("CONSTRUCTION_JOURNAL_INSPECTOR_OBSERVED_REPLAY", "RED_QUARANTINED");
          observedInspectorIds.add(id);
        }
      }
      continue;
    }
    if (!allowedNonProcessEvents.has(record.event) || !["construction", "host-binding"].includes(record.lane) || record.processGroupId !== null) fail("CONSTRUCTION_JOURNAL_EVENT_NOT_AUTHORIZED", "RED_QUARANTINED");
    if (record.event === "fake-matrix-intent") {
      const shape = sha256(Buffer.from("construction-fake-matrix-v1\n"));
      if (fakeMatrixIntent || fakeMatrixObserved || records[0] !== record || record.lane !== "construction" || record.hostBindingId !== null || record.commandShapeSha256 !== shape || canonicalJson(record.ownedResources) !== canonicalJson(["construction-run-root", "fake-process-groups"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_FAKE_INTENT_INVALID", "RED_QUARANTINED");
      fakeMatrixIntent = true;
      continue;
    }
    if (record.event === "fake-matrix-observed") {
      const shape = sha256(Buffer.from("construction-fake-matrix-v1\n"));
      if (!fakeMatrixIntent || fakeMatrixObserved || !slotRootObserved || constructionCompletedIds.size !== CONSTRUCTION_PROCESS_IDS.size || constructionUnstartedSupervisorStarts.size !== 0 || constructionUnstartedDirectGateIntents.size !== 0 || [...constructionProcessStates.values()].some((state) => !state.absent) || record.lane !== "construction" || record.hostBindingId !== null || record.commandShapeSha256 !== shape || canonicalJson(record.ownedResources) !== canonicalJson([]) || record.terminalCode !== "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN" || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_FAKE_OBSERVED_INVALID", "RED_QUARANTINED");
      fakeMatrixObserved = true;
      continue;
    }
    if (fakeMatrixIntent || fakeMatrixObserved) fail("CONSTRUCTION_JOURNAL_PHASE_MIXED", "RED_QUARANTINED");
    if (record.event === "input-open-intent") {
      if (ownerInputOpenIntent || records[0] !== record || record.lane !== "host-binding" || record.hostBindingId !== null || record.commandShapeSha256 !== sha256(Buffer.from("fixed-owner-input-open-v1\n")) || canonicalJson(record.ownedResources) !== canonicalJson(["owner-input-envelope"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_INPUT_INTENT_INVALID", "RED_QUARANTINED");
      ownerInputOpenIntent = true;
      continue;
    }
    if (["intent:blocked-start-slot-root", "observed:blocked-start-slot-root"].includes(record.event)) {
      const shape = sha256(Buffer.from("r4-gate-b-blocked-start-slot-root.v1\n", "utf8"));
      const isIntent = record.event.startsWith("intent:");
      if (!ownerInputOpenIntent || record.lane !== "host-binding" || record.hostBindingId !== null || record.commandShapeSha256 !== shape || canonicalJson(record.ownedResources) !== canonicalJson(["blocked-start-slot-root"]) || record.cleanupState !== "required" || (isIntent ? slotRootIntent || slotRootObserved || record.terminalCode !== null : !slotRootIntent || slotRootObserved || record.terminalCode !== "CREATED")) fail("CONSTRUCTION_JOURNAL_SLOT_ROOT_INVALID", "RED_QUARANTINED");
      if (isIntent) slotRootIntent = true; else slotRootObserved = true;
      continue;
    }
    if (["capsule-target-absent", "public-receipt-target-absent", "capsule-publication-intent", "capsule-stage-ready", "public-receipt-publication-intent", "public-receipt-stage-ready", "capsule-published"].includes(record.event)) {
      if (record.lane !== "host-binding" || record.processGroupId !== null || !ID.test(record.hostBindingId)) fail("CONSTRUCTION_JOURNAL_PUBLICATION_ID_INVALID", "RED_QUARANTINED");
      if (publicationHostBindingId !== null && publicationHostBindingId !== record.hostBindingId) fail("CONSTRUCTION_JOURNAL_PUBLICATION_ID_DRIFT", "RED_QUARANTINED");
      publicationHostBindingId = record.hostBindingId;
      if (record.event === "capsule-target-absent") {
        if (capsuleTargetAbsent || capsuleIntent || receiptTargetAbsent || observedInspectorIds.size !== HOST_INSPECTOR_COMMAND_IDS.size || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson(["host-binding-capsule"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_CAPSULE_TARGET_INVALID", "RED_QUARANTINED");
        capsuleTargetAbsent = true;
        capsuleExpectedSha256 = record.commandShapeSha256;
      }
      if (record.event === "capsule-publication-intent") {
        if (!capsuleTargetAbsent || capsuleIntent || capsuleStageReady || receiptTargetAbsent || record.commandShapeSha256 !== capsuleExpectedSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["host-binding-capsule"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_CAPSULE_INTENT_INVALID", "RED_QUARANTINED");
        capsuleIntent = true;
      }
      if (record.event === "capsule-stage-ready") {
        if (!capsuleIntent || capsuleStageReady || receiptTargetAbsent || record.commandShapeSha256 !== capsuleExpectedSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["host-binding-capsule-stage"]) || record.terminalCode !== "STAGED" || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_CAPSULE_STAGE_INVALID", "RED_QUARANTINED");
        capsuleStageReady = true;
      }
      if (record.event === "public-receipt-target-absent") {
        if (!capsuleStageReady || receiptTargetAbsent || receiptIntent || receiptStageReady || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson(["public-receipt"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_RECEIPT_TARGET_INVALID", "RED_QUARANTINED");
        receiptTargetAbsent = true;
        receiptExpectedSha256 = record.commandShapeSha256;
      }
      if (record.event === "public-receipt-publication-intent") {
        if (!capsuleStageReady || !receiptTargetAbsent || receiptIntent || receiptStageReady || !SHA.test(record.commandShapeSha256) || record.commandShapeSha256 !== receiptExpectedSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["public-receipt"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_RECEIPT_BEFORE_CAPSULE", "RED_QUARANTINED");
        receiptIntent = true;
      }
      if (record.event === "public-receipt-stage-ready") {
        if (!receiptIntent || receiptStageReady || record.commandShapeSha256 !== receiptExpectedSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["public-receipt-stage"]) || record.terminalCode !== "STAGED" || record.cleanupState !== "required") fail("CONSTRUCTION_JOURNAL_RECEIPT_STAGE_INVALID", "RED_QUARANTINED");
        receiptStageReady = true;
      }
      if (record.event === "capsule-published") {
        if (!capsuleStageReady || !receiptStageReady || publicationComplete || record.commandShapeSha256 !== capsuleExpectedSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["host-binding-capsule", "public-receipt"]) || record.terminalCode !== "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW" || record.cleanupState !== "retain-capsule") fail("CONSTRUCTION_JOURNAL_PUBLICATION_COMMIT_INVALID", "RED_QUARANTINED");
        publicationComplete = true;
      }
      continue;
    }
    fail("CONSTRUCTION_JOURNAL_NONPROCESS_UNREACHABLE", "RED_QUARANTINED");
  }
  return Object.freeze({
    unresolvedProcessGroups: Object.freeze([...processStates.entries(), ...constructionProcessStates.entries()].filter(([, state]) => !state.absent).map(([pid]) => pid)),
    unresolvedProcesses: Object.freeze([
      ...[...processStates.entries()].filter(([, state]) => !state.absent).map(([processGroupId, state]) => Object.freeze({ processGroupId, lane: "host-binding", logicalId: state.id, commandShapeSha256: state.hash, ownedResources: Object.freeze(["inspector-process-group"]) })),
      ...[...constructionProcessStates.entries()].filter(([, state]) => !state.absent).map(([processGroupId, state]) => Object.freeze({ processGroupId, lane: "macos", logicalId: state.id, commandShapeSha256: state.hash, ownedResources: Object.freeze(state.resources) })),
    ]),
    publicationHostBindingId,
    publicationComplete,
    removePartialPublication: publicationHostBindingId !== null && !publicationComplete,
    capsuleExpectedSha256,
    receiptExpectedSha256,
    capsuleStageReady,
    receiptStageReady,
    removeOwnerInput: ownerInputOpenIntent,
    unstartedSupervisorStarts: Object.freeze([
      ...[...unstartedSupervisorStarts.values()].map((start) => Object.freeze({ ...start, lane: "host-binding", ownedResources: Object.freeze(["inspector-process-group"]) })),
      ...[...constructionUnstartedSupervisorStarts.values()].map((start) => Object.freeze({ ...start, lane: "macos", ownedResources: Object.freeze(["macos-process-group"]) })),
    ]),
    unstartedDirectGateIntents: constructionUnstartedDirectGateIntents.size,
  });
}
function removeExactPublishedFile(target, expectedMode, expectedSha256 = null) {
  const stat = lstatIfPresent(target, "PARTIAL_PUBLICATION_PATH_UNREADABLE");
  if (stat === null) return;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o777) !== expectedMode) fail("PARTIAL_PUBLICATION_FILE_UNSAFE", "RED_QUARANTINED");
  if (expectedSha256 !== null) {
    const chain = snapshotNoSymlinkPathChain(target, "PARTIAL_PUBLICATION_PATH_UNSAFE");
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const bytes = Buffer.allocUnsafe(stat.size);
    try {
      let offset = 0;
      while (offset < bytes.length) { const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (count <= 0) fail("PARTIAL_PUBLICATION_SHORT_READ", "RED_QUARANTINED"); offset += count; }
      const opened = fs.fstatSync(fd); const after = fs.lstatSync(target);
      assertNoSymlinkPathChainStable(chain, "PARTIAL_PUBLICATION_PATH_DRIFT");
      if (opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== stat.size || opened.nlink !== stat.nlink || after.dev !== stat.dev || after.ino !== stat.ino || after.size !== stat.size || after.nlink !== stat.nlink || sha256(bytes) !== expectedSha256) fail("PARTIAL_PUBLICATION_HASH_MISMATCH", "RED_QUARANTINED");
    } finally { bytes.fill(0); fs.closeSync(fd); }
  }
  const beforeUnlink = fs.lstatSync(target);
  if (beforeUnlink.dev !== stat.dev || beforeUnlink.ino !== stat.ino || beforeUnlink.size !== stat.size || beforeUnlink.nlink !== stat.nlink) fail("PARTIAL_PUBLICATION_UNLINK_IDENTITY_DRIFT", "RED_QUARANTINED");
  fs.unlinkSync(target);
  fsyncDirectory(path.dirname(target));
}
function constructionPublicationStagePath(kind, constructionRoot = CONSTRUCTION_ROOT) {
  if (!new Set(["capsule", "public-receipt"]).has(kind)) fail("PUBLICATION_STAGE_KIND_INVALID", "RED");
  return path.join(constructionRoot, `publication-${kind}.v1.stage`);
}
function assertPublicationFile(stat, expectedMode, code, allowedLinks = [1]) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || !allowedLinks.includes(stat.nlink) || (stat.mode & 0o777) !== expectedMode || stat.size < 1 || stat.size > 2_097_152) fail(code, "RED_QUARANTINED");
}
function hashExactPublicationPath(target, expectedSha256, code) {
  const stat = fs.lstatSync(target);
  const chain = snapshotNoSymlinkPathChain(target, `${code}_PATH_UNSAFE`);
  const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(stat.size);
  try {
    let offset = 0;
    while (offset < bytes.length) { const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (count <= 0) fail(code, "RED_QUARANTINED"); offset += count; }
    const opened = fs.fstatSync(fd); const after = fs.lstatSync(target);
    assertNoSymlinkPathChainStable(chain, `${code}_PATH_DRIFT`);
    if (opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== stat.size || opened.nlink !== stat.nlink || after.dev !== stat.dev || after.ino !== stat.ino || after.size !== stat.size || after.nlink !== stat.nlink || sha256(bytes) !== expectedSha256) fail(code, "RED_QUARANTINED");
    return stat;
  } finally { bytes.fill(0); fs.closeSync(fd); }
}
function unlinkPublicationAlias(target, expected, stage) {
  const current = fs.lstatSync(target);
  if (current.dev !== expected.dev || current.ino !== expected.ino || current.size !== expected.size || current.nlink !== expected.nlink || current.dev !== stage.dev || current.ino !== stage.ino) fail("PUBLICATION_UNLINK_IDENTITY_DRIFT", "RED_QUARANTINED");
  fs.unlinkSync(target);
  if (lstatIfPresent(target, "PUBLICATION_UNLINK_ABSENCE_UNREADABLE") !== null) fail("PUBLICATION_UNLINK_ABSENCE_UNKNOWN", "RED_QUARANTINED");
}
function reconcileConstructionPublication({ finalPath, temporaryPath, stagePath, expectedMode, expectedSha256, retain, externalLinksAuthorized }) {
  const stage = lstatIfPresent(stagePath, "PUBLICATION_STAGE_PATH_UNREADABLE");
  const temporary = lstatIfPresent(temporaryPath, "PUBLICATION_TEMP_PATH_UNREADABLE");
  const final = lstatIfPresent(finalPath, "PUBLICATION_FINAL_PATH_UNREADABLE");
  if (!externalLinksAuthorized && (temporary !== null || final !== null)) fail("PUBLICATION_LINK_WITHOUT_DURABLE_STAGE_AUTHORITY", "RED_QUARANTINED");
  if (stage === null) {
    if (temporary !== null) fail("PUBLICATION_TEMP_WITHOUT_OWNERSHIP_ANCHOR", "RED_QUARANTINED");
    if (final === null) return;
    assertPublicationFile(final, expectedMode, "PUBLICATION_FINAL_WITHOUT_STAGE_UNSAFE");
    hashExactPublicationPath(finalPath, expectedSha256, "PUBLICATION_FINAL_WITHOUT_STAGE_HASH_DRIFT");
    if (!retain) fail("PUBLICATION_FINAL_WITHOUT_OWNERSHIP_ANCHOR", "RED_QUARANTINED");
    return;
  }
  assertPublicationFile(stage, expectedMode, "PUBLICATION_STAGE_IDENTITY_DRIFT", [1, 2, 3]);
  const expectedOwnedLinkCount = 1 + Number(temporary !== null) + Number(final !== null);
  if (stage.nlink !== expectedOwnedLinkCount) fail("PUBLICATION_STAGE_UNKNOWN_HARDLINK", "RED_QUARANTINED");
  for (const [label, observed] of [["TEMP", temporary], ["FINAL", final]]) {
    if (observed === null) continue;
    assertPublicationFile(observed, expectedMode, `PUBLICATION_${label}_IDENTITY_DRIFT`, [1, 2, 3]);
    if (observed.dev !== stage.dev || observed.ino !== stage.ino || observed.size !== stage.size) fail(`PUBLICATION_${label}_OWNERSHIP_DRIFT`, "RED_QUARANTINED");
  }
  if (retain) {
    if (final === null) fail("PUBLICATION_COMMIT_FINAL_MISSING", "RED_QUARANTINED");
    hashExactPublicationPath(finalPath, expectedSha256, "PUBLICATION_COMMIT_HASH_DRIFT");
    if (temporary !== null) unlinkPublicationAlias(temporaryPath, temporary, stage);
    const retainedStage = fs.lstatSync(stagePath);
    const retainedFinal = fs.lstatSync(finalPath);
    if (retainedStage.dev !== retainedFinal.dev || retainedStage.ino !== retainedFinal.ino || retainedStage.size !== retainedFinal.size || retainedStage.nlink !== 2 || retainedFinal.nlink !== 2) fail("PUBLICATION_COMMIT_STAGE_IDENTITY_DRIFT", "RED_QUARANTINED");
    fs.unlinkSync(stagePath);
    if (lstatIfPresent(stagePath, "PUBLICATION_COMMIT_STAGE_ABSENCE_UNREADABLE") !== null) fail("PUBLICATION_COMMIT_STAGE_ABSENCE_UNKNOWN", "RED_QUARANTINED");
    fsyncDirectory(path.dirname(stagePath));
    fsyncDirectory(path.dirname(finalPath));
    return;
  }
  if (final !== null) unlinkPublicationAlias(finalPath, final, stage);
  const refreshedStage = fs.lstatSync(stagePath);
  if (refreshedStage.dev !== stage.dev || refreshedStage.ino !== stage.ino) fail("PUBLICATION_STAGE_IDENTITY_DRIFT", "RED_QUARANTINED");
  if (temporary !== null) unlinkPublicationAlias(temporaryPath, fs.lstatSync(temporaryPath), refreshedStage);
  fsyncDirectory(path.dirname(finalPath));
}
function observeExactPublishedFile(target, expectedMode, expectedSha256, expectedBytes, maximumBytes, expectedLinkCount = 1) {
  if (!SHA.test(expectedSha256) || !Buffer.isBuffer(expectedBytes) || expectedBytes.length < 2 || expectedBytes.length > maximumBytes) fail("PUBLISHED_FILE_EXPECTATION_INVALID", "RED");
  const chain = snapshotNoSymlinkPathChain(target, "PUBLISHED_FILE_PATH_UNSAFE");
  const before = fs.lstatSync(target);
  if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid() || before.nlink !== expectedLinkCount || (before.mode & 0o777) !== expectedMode || before.size !== expectedBytes.length) fail("PUBLISHED_FILE_IDENTITY_INVALID", "RED");
  const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(before.size);
  const trailing = Buffer.alloc(1);
  try {
    let offset = 0;
    while (offset < bytes.length) { const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (count <= 0) fail("PUBLISHED_FILE_SHORT_READ", "RED"); offset += count; }
    if (fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("PUBLISHED_FILE_TRAILING_READ", "RED");
    const opened = fs.fstatSync(fd); const after = fs.lstatSync(target);
    assertNoSymlinkPathChainStable(chain, "PUBLISHED_FILE_PATH_DRIFT");
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size || opened.nlink !== expectedLinkCount || Math.trunc(opened.mtimeMs) !== Math.trunc(before.mtimeMs) || after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.nlink !== expectedLinkCount || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a) || sha256(bytes) !== expectedSha256 || !crypto.timingSafeEqual(bytes, expectedBytes)) fail("PUBLISHED_FILE_BYTE_DRIFT", "RED");
    return true;
  } finally { bytes.fill(0); trailing.fill(0); fs.closeSync(fd); }
}
async function atomicPublishConstructionFile(target, bytes, { mode, kind, parent, journal, hostBindingId, stageEvent, stageResource, constructionRoot = CONSTRUCTION_ROOT }) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) fail("TRACKED_WRITE_BYTES_INVALID", "RED");
  if (typeof journal?.append !== "function" || !ID.test(hostBindingId) || !new Set(["capsule-stage-ready", "public-receipt-stage-ready"]).has(stageEvent) || typeof stageResource !== "string") fail("TRACKED_WRITE_STAGE_AUTHORITY_INVALID", "RED");
  if (path.dirname(target) !== parent) fail("TRACKED_WRITE_PARENT_MISMATCH", "RED");
  requirePathEntryAbsent(target, "TRACKED_WRITE_TARGET_PREEXISTS", "RED");
  const temporary = path.join(parent, `.${path.basename(target)}.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`);
  const stage = constructionPublicationStagePath(kind, constructionRoot);
  requirePathEntryAbsent(temporary, "TRACKED_WRITE_TEMP_PREEXISTS", "RED_QUARANTINED");
  requirePathEntryAbsent(stage, "TRACKED_WRITE_STAGE_PREEXISTS", "RED_QUARANTINED");
  let fd = null;
  let writtenIdentity = null;
  try {
    fd = fs.openSync(stage, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), mode);
    fs.fchmodSync(fd, mode);
    writeAll(fd, bytes);
    fs.fsyncSync(fd);
    const stat = fs.fstatSync(fd);
    writtenIdentity = stat;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o777) !== mode || stat.size !== bytes.length) fail("TRACKED_WRITE_OBSERVATION_INVALID", "RED");
    fs.closeSync(fd); fd = null;
    const stagedBeforeAuthority = fs.lstatSync(stage);
    if (!stagedBeforeAuthority.isFile() || stagedBeforeAuthority.isSymbolicLink() || stagedBeforeAuthority.dev !== writtenIdentity.dev || stagedBeforeAuthority.ino !== writtenIdentity.ino || stagedBeforeAuthority.nlink !== 1 || stagedBeforeAuthority.uid !== process.getuid() || (stagedBeforeAuthority.mode & 0o777) !== mode || stagedBeforeAuthority.size !== bytes.length) fail("TRACKED_WRITE_STAGE_IDENTITY_DRIFT", "RED");
    fsyncDirectory(path.dirname(stage));
    const stagedAfterDirectorySync = fs.lstatSync(stage);
    if (stagedAfterDirectorySync.dev !== writtenIdentity.dev || stagedAfterDirectorySync.ino !== writtenIdentity.ino || stagedAfterDirectorySync.nlink !== 1 || stagedAfterDirectorySync.size !== bytes.length) fail("TRACKED_WRITE_STAGE_DIRECTORY_SYNC_DRIFT", "RED");
    await journal.append({ lane: "host-binding", event: stageEvent, hostBindingId, commandShapeSha256: sha256(bytes), ownedResources: [stageResource], terminalCode: "STAGED", cleanupState: "required" });
    try { fs.linkSync(stage, temporary); }
    catch (error) { if (error?.code === "EEXIST") fail("TRACKED_WRITE_TEMP_RACE", "RED_QUARANTINED"); throw error; }
    fsyncDirectory(parent);
    try { fs.linkSync(temporary, target); }
    catch (error) { if (error?.code === "EEXIST") fail("TRACKED_WRITE_TARGET_RACE", "RED"); throw error; }
    fsyncDirectory(parent);
    const staged = fs.lstatSync(stage); const temp = fs.lstatSync(temporary);
    const final = fs.lstatSync(target);
    if (![staged, temp, final].every((observed) => observed.isFile() && !observed.isSymbolicLink() && observed.nlink === 3 && observed.uid === process.getuid() && (observed.mode & 0o777) === mode && observed.dev === writtenIdentity.dev && observed.ino === writtenIdentity.ino && observed.size === bytes.length)) fail("TRACKED_WRITE_PUBLISH_IDENTITY_DRIFT", "RED");
    unlinkPublicationAlias(temporary, temp, staged);
    fsyncDirectory(parent);
    const stagedAfter = fs.lstatSync(stage); const finalAfter = fs.lstatSync(target);
    if (![stagedAfter, finalAfter].every((observed) => observed.nlink === 2 && observed.dev === writtenIdentity.dev && observed.ino === writtenIdentity.ino && observed.size === bytes.length)) fail("TRACKED_WRITE_FINAL_LINK_IDENTITY_DRIFT", "RED");
  } catch (error) {
    if (fd !== null) try { fs.closeSync(fd); } catch { /* authenticated construction cleanup owns the stage */ }
    throw error;
  }
}

export async function exerciseConstructionPublicationProtocolForConstruction(baseRoot = null) {
  const ownsRoot = baseRoot === null;
  const base = ownsRoot ? fs.realpathSync(fs.mkdtempSync("/tmp/forme-r4-publication-protocol-")) : baseRoot;
  if (!path.isAbsolute(base) || path.normalize(base) !== base || (!ownsRoot && path.dirname(base) !== CONSTRUCTION_ROOT)) fail("PUBLICATION_EXERCISE_ROOT_INVALID", "RED");
  if (!ownsRoot) fs.mkdirSync(base, { recursive: false, mode: 0o700 });
  fs.chmodSync(base, 0o700);
  const hostBindingId = "a".repeat(32);
  const bytes = Buffer.from(`${canonicalJson({ schemaVersion: "r4_gate_b_publication_protocol_fixture.v1" })}\n`, "utf8");
  const makeCase = (name) => {
    const caseRoot = path.join(base, name);
    const stageRoot = path.join(caseRoot, "owned");
    const parent = path.join(caseRoot, "published");
    fs.mkdirSync(caseRoot, { mode: 0o700 }); fs.mkdirSync(stageRoot, { mode: 0o700 }); fs.mkdirSync(parent, { mode: 0o700 });
    return { caseRoot, stageRoot, parent, target: path.join(parent, "artifact.json"), temporary: path.join(parent, `.artifact.json.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`) };
  };
  try {
    const clean = makeCase("clean");
    const records = [];
    const journal = Object.freeze({ async append(value) { records.push(Object.freeze({ ...value })); return value; } });
    await atomicPublishConstructionFile(clean.target, bytes, { mode: 0o644, kind: "public-receipt", parent: clean.parent, journal, hostBindingId, stageEvent: "public-receipt-stage-ready", stageResource: "public-receipt-stage", constructionRoot: clean.stageRoot });
    if (records.length !== 1 || records[0].event !== "public-receipt-stage-ready" || records[0].terminalCode !== "STAGED" || lstatIfPresent(clean.temporary) !== null) fail("PUBLICATION_EXERCISE_STAGE_AUTHORITY_INVALID", "RED");
    observeExactPublishedFile(clean.target, 0o644, sha256(bytes), bytes, 4096, 2);
    reconcileConstructionPublication({ finalPath: clean.target, temporaryPath: clean.temporary, stagePath: constructionPublicationStagePath("public-receipt", clean.stageRoot), expectedMode: 0o644, expectedSha256: sha256(bytes), retain: true, externalLinksAuthorized: true });
    observeExactPublishedFile(clean.target, 0o644, sha256(bytes), bytes, 4096, 1);

    const collision = makeCase("collision");
    const sentinel = Buffer.from("same-uid-preexisting-temp\n", "utf8");
    fs.writeFileSync(collision.temporary, sentinel, { flag: "wx", mode: 0o644 });
    let collisionDenied = false;
    try { await atomicPublishConstructionFile(collision.target, bytes, { mode: 0o644, kind: "public-receipt", parent: collision.parent, journal, hostBindingId, stageEvent: "public-receipt-stage-ready", stageResource: "public-receipt-stage", constructionRoot: collision.stageRoot }); }
    catch (error) { collisionDenied = error instanceof PhysicalRunnerError && error.code === "TRACKED_WRITE_TEMP_PREEXISTS"; }
    const collisionObserved = fs.readFileSync(collision.temporary);
    try { if (!collisionDenied || !crypto.timingSafeEqual(collisionObserved, sentinel)) fail("PUBLICATION_EXERCISE_COLLISION_NOT_PRESERVED", "RED"); }
    finally { collisionObserved.fill(0); }
    sentinel.fill(0);

    const wrongInode = makeCase("wrong-inode");
    const stagePath = constructionPublicationStagePath("public-receipt", wrongInode.stageRoot);
    fs.writeFileSync(stagePath, bytes, { flag: "wx", mode: 0o644 });
    fs.writeFileSync(wrongInode.temporary, bytes, { flag: "wx", mode: 0o644 });
    let wrongInodeDenied = false;
    try { reconcileConstructionPublication({ finalPath: wrongInode.target, temporaryPath: wrongInode.temporary, stagePath, expectedMode: 0o644, expectedSha256: sha256(bytes), retain: false, externalLinksAuthorized: true }); }
    catch (error) { wrongInodeDenied = error instanceof PhysicalRunnerError && ["PUBLICATION_STAGE_UNKNOWN_HARDLINK", "PUBLICATION_TEMP_OWNERSHIP_DRIFT"].includes(error.code); }
    if (!wrongInodeDenied || lstatIfPresent(wrongInode.temporary) === null) fail("PUBLICATION_EXERCISE_WRONG_INODE_NOT_PRESERVED", "RED");

    const dangling = makeCase("dangling-symlink");
    fs.symlinkSync(path.join(dangling.parent, "missing"), dangling.temporary);
    let danglingDenied = false;
    try { await atomicPublishConstructionFile(dangling.target, bytes, { mode: 0o644, kind: "public-receipt", parent: dangling.parent, journal, hostBindingId, stageEvent: "public-receipt-stage-ready", stageResource: "public-receipt-stage", constructionRoot: dangling.stageRoot }); }
    catch (error) { danglingDenied = error instanceof PhysicalRunnerError && error.code === "TRACKED_WRITE_TEMP_PREEXISTS"; }
    if (!danglingDenied || !fs.lstatSync(dangling.temporary).isSymbolicLink()) fail("PUBLICATION_EXERCISE_DANGLING_SYMLINK_NOT_PRESERVED", "RED");
    return Object.freeze({ status: "GREEN", casesValidated: 4, durableStageAuthorityProven: true, finalNoClobberProven: true, wrongResourcePreserved: true, danglingSymlinkNeverAbsent: true, retainedFinalLinkCount: 1 });
  } finally {
    bytes.fill(0);
    if (ownsRoot) {
      fs.rmSync(base, { recursive: true, force: true, maxRetries: 0 });
      if (lstatIfPresent(base, "PUBLICATION_EXERCISE_ROOT_ABSENCE_UNREADABLE") !== null) fail("PUBLICATION_EXERCISE_ROOT_RESIDUE", "RED_QUARANTINED");
    }
  }
}

function deriveRetryRunId(manifestSha256, hostBindingId) {
  if (!SHA.test(manifestSha256) || !ID.test(hostBindingId)) fail("RETRY_RUN_ID_AUTHORITY_INVALID", "RED");
  return crypto.createHash("sha256").update(`r4-gate-b-physical-retry:${manifestSha256}:${hostBindingId}`, "utf8").digest("hex").slice(0, 32);
}
function retryRootFor(manifestSha256, hostBindingId) {
  return path.join(RETRY_ROOT_PARENT, deriveRetryRunId(manifestSha256, hostBindingId));
}
function groupExists(processGroupId) {
  try { process.kill(-processGroupId, 0); return true; }
  catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    return null;
  }
}
function signalGroup(processGroupId, signal) {
  try { process.kill(-processGroupId, signal); return true; }
  catch (error) {
    if (error?.code === "ESRCH") return true;
    if (error?.code === "EPERM") return false;
    return false;
  }
}
async function waitForGroupAbsence(processGroupId, milliseconds) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() <= deadline) {
    const observed = groupExists(processGroupId);
    if (observed === false) return true;
    if (observed === null) return false;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return groupExists(processGroupId) === false;
}
async function stopAndProveGroupAbsent(processGroupId) {
  if (groupExists(processGroupId) === false) return true;
  signalGroup(processGroupId, "SIGTERM");
  if (await waitForGroupAbsence(processGroupId, 2_000)) return true;
  signalGroup(processGroupId, "SIGKILL");
  return await waitForGroupAbsence(processGroupId, 2_000);
}
const BLOCKED_SUPERVISOR_SOURCE = `${[
  'import crypto from "node:crypto";',
  'import fs from "node:fs";',
  'const fail=()=>process.exit(78);',
  'const sha=value=>"sha256:"+crypto.createHash("sha256").update(value).digest("hex");',
  'const canonical=value=>{if(value===null)return"null";if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);if(typeof value==="number"&&Number.isFinite(value))return JSON.stringify(value);if(Array.isArray(value))return"["+value.map(canonical).join(",")+"]";if(typeof value==="object"){const keys=Object.keys(value).sort();return"{"+keys.map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";}fail();};',
  'const exactKeys=(value,keys)=>value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join("\\n")===[...keys].sort().join("\\n");',
  'const startId=process.env.FORME_R4_BLOCKED_START_ID;',
  'const authority=process.env.FORME_R4_BLOCKED_RELEASE_AUTHORITY;',
  'if(typeof startId!=="string"||!/^sha256:[0-9a-f]{64}$/.test(startId)||typeof authority!=="string"||!/^sha256:[0-9a-f]{64}$/.test(authority)||typeof process.execve!=="function")fail();',
  'const readyValue={pid:process.pid,releaseAuthoritySha256:authority,schemaVersion:"r4_gate_b_blocked_supervisor_ready.v2",startId};',
  'const ready=Buffer.from(canonical(readyValue)+"\\n","utf8");',
  'try{let offset=0;while(offset<ready.length){const count=fs.writeSync(5,ready,offset,ready.length-offset);if(count<=0)fail();offset+=count;}fs.fsyncSync(5);fs.closeSync(5);}finally{ready.fill(0);}',
  'let control=Buffer.alloc(0);',
  'const release=fs.createReadStream(null,{fd:6,autoClose:true});',
  'release.on("data",chunk=>{const owned=Buffer.from(chunk);const next=Buffer.concat([control,owned]);control.fill(0);owned.fill(0);control=next;if(control.length>131072)fail();});',
  'release.on("error",fail);',
  'release.on("end",()=>{if(control.length<2||control.at(-1)!==10||control.subarray(0,-1).includes(10)||control.includes(0)||control.includes(13)||sha(control)!==authority)fail();const text=control.subarray(0,-1).toString("utf8");let value;try{value=JSON.parse(text);if(canonical(value)!==text)fail();}catch{fail();}if(!exactKeys(value,["argv","commandShapeSha256","cwd","environment","executable","family","logicalId","runId","schemaVersion","startId","startSequence","targetStdioCount"])||value.schemaVersion!=="r4_gate_b_blocked_supervisor_release.v2"||value.startId!==startId||typeof value.runId!=="string"||!/^[A-Za-z0-9._-]+$/.test(value.runId)||!["host-inspector","codex","postgres","macos","cleanup"].includes(value.family)||typeof value.logicalId!=="string"||!/^[A-Za-z0-9-]+$/.test(value.logicalId)||!Number.isSafeInteger(value.startSequence)||value.startSequence<0||typeof value.commandShapeSha256!=="string"||!/^sha256:[0-9a-f]{64}$/.test(value.commandShapeSha256)||typeof value.executable!=="string"||!value.executable.startsWith("/")||!Array.isArray(value.argv)||value.argv.some(item=>typeof item!=="string"||item.includes("\\0"))||typeof value.cwd!=="string"||!value.cwd.startsWith("/")||value.environment===null||typeof value.environment!=="object"||Array.isArray(value.environment)||value.targetStdioCount!==3)fail();for(const [key,item]of Object.entries(value.environment)){if(typeof key!=="string"||typeof item!=="string"||key.includes("\\0")||item.includes("\\0"))fail();}const projection={commandShapeSha256:value.commandShapeSha256,family:value.family,logicalId:value.logicalId,runId:value.runId,schemaVersion:"r4_gate_b_blocked_start_id.v1",startSequence:value.startSequence};if(sha(Buffer.from(canonical(projection)+"\\n","utf8"))!==startId)fail();const executable=value.executable;const argv=[executable,...value.argv];const environment=value.environment;const cwd=value.cwd;control.fill(0);try{process.chdir(cwd);process.execve(executable,argv,environment);}catch{fail();}});',
].join("\n")}\n`;
const BLOCKED_SUPERVISOR_SHA256 = sha256(Buffer.from(BLOCKED_SUPERVISOR_SOURCE, "utf8"));
export const BLOCKED_SUPERVISOR_CONTRACT = Object.freeze({
  schemaVersion: "r4_gate_b_blocked_supervisor.v2",
  sourceSha256: BLOCKED_SUPERVISOR_SHA256,
  runtimeMaterialization: "node-eval-fixed-source",
  readySlotMode: 0o600,
  releaseMaximumBytes: 131_072,
  releaseFrameHashBound: true,
  startIdIncludesJournalIntentSequence: true,
  releaseAfterStartedJournalFsync: true,
  parentLeaseRequired: false,
  targetDetachedProcessGroupCount: 1,
  logicalStartCountsSupervisorGroupNotRawProcesses: true,
  targetStartsBeforeDurablePidAuthority: false,
  execReplacesLauncherAtSamePid: true,
  residentCarrierProcesses: 0,
  execvePreservedFileDescriptors: Object.freeze([0, 1, 2]),
  persistedProcessIdSignalAuthority: "durable-started-journal-only",
  intentOnlyReadySlotProcessIdSignalAuthority: "authenticated-deterministic-ready-slot-only",
  emptyOrPartialReadySlotVerdict: "RED_QUARANTINED",
  preReleaseFaultCases: 13,
  preReleaseFaultMatrixConstructionRequired: true,
  startErrorObservation: "logicalStartObserved-plus-processGroupState",
  targetArgvEnvironmentTransport: "bounded-canonical-release-pipe-only",
  launcherArgvEnvironmentContainsTargetSecrets: false,
  releaseFrameMayContainSyntheticSecrets: true,
  releaseBufferBestEffortZeroized: true,
  v8RuntimeWideErasureClaimed: false,
  supervisorTrackedAsAdditionalLogicalStart: false,
  parentDeathAfterReleaseAutoCleanupClaimed: false,
});
function blockedStartId({ runId, startSequence, family, logicalId, commandShapeSha256 }) {
  if (typeof runId !== "string" || !/^[A-Za-z0-9._-]+$/u.test(runId) || !Number.isSafeInteger(startSequence) || startSequence < 0 || !["host-inspector", "codex", "postgres", "macos", "cleanup"].includes(family) || typeof logicalId !== "string" || !/^[A-Za-z0-9-]+$/u.test(logicalId) || !SHA.test(commandShapeSha256)) fail("BLOCKED_SUPERVISOR_START_ID_INPUT_INVALID", "RED");
  return sha256(Buffer.from(`${canonicalJson({ schemaVersion: "r4_gate_b_blocked_start_id.v1", runId, startSequence, family, logicalId, commandShapeSha256 })}\n`, "utf8"));
}
function supervisorSlotPath(root, startId) {
  if (!SHA.test(startId)) fail("BLOCKED_SUPERVISOR_START_ID_INVALID", "RED");
  return path.join(root, "blocked-supervisor-pids", `${startId.slice(7)}.jsonl`);
}
function observeCurrentNodeExecutable(expected = null) {
  if (typeof process.execve !== "function" || !path.isAbsolute(process.execPath) || path.normalize(process.execPath) !== process.execPath || fs.realpathSync(process.execPath) !== process.execPath) fail("BLOCKED_SUPERVISOR_NODE_RUNTIME_UNSUPPORTED", "RED");
  const chain = snapshotNoSymlinkPathChain(process.execPath, "BLOCKED_SUPERVISOR_NODE_PATH_UNSAFE");
  const beforePath = fs.lstatSync(process.execPath);
  if (!beforePath.isFile() || beforePath.isSymbolicLink() || ![0, process.getuid()].includes(beforePath.uid) || beforePath.nlink !== 1 || (beforePath.mode & 0o022) !== 0 || beforePath.size < 1 || beforePath.size > 536_870_912) fail("BLOCKED_SUPERVISOR_NODE_FILE_UNSAFE", "RED");
  const fd = fs.openSync(process.execPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const hash = crypto.createHash("sha256");
  const block = Buffer.allocUnsafe(65_536);
  try {
    let offset = 0;
    while (offset < beforePath.size) {
      const count = fs.readSync(fd, block, 0, Math.min(block.length, beforePath.size - offset), offset);
      if (count <= 0) fail("BLOCKED_SUPERVISOR_NODE_SHORT_READ", "RED");
      hash.update(block.subarray(0, count)); offset += count;
    }
    const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(process.execPath);
    assertNoSymlinkPathChainStable(chain, "BLOCKED_SUPERVISOR_NODE_PATH_DRIFT");
    const observed = Object.freeze({ path: process.execPath, sha256: `sha256:${hash.digest("hex")}`, size: beforePath.size, mode: beforePath.mode & 0o7777, uid: beforePath.uid, gid: beforePath.gid, device: String(beforePath.dev), inode: String(beforePath.ino), nlink: beforePath.nlink, mtimeMilliseconds: Math.trunc(beforePath.mtimeMs) });
    if (afterFd.dev !== beforePath.dev || afterFd.ino !== beforePath.ino || afterFd.size !== beforePath.size || Math.trunc(afterFd.mtimeMs) !== Math.trunc(beforePath.mtimeMs) || afterPath.dev !== beforePath.dev || afterPath.ino !== beforePath.ino || afterPath.nlink !== 1) fail("BLOCKED_SUPERVISOR_NODE_IDENTITY_DRIFT", "RED");
    if (expected !== null && canonicalJson(observed) !== canonicalJson({ path: expected.path, sha256: expected.sha256, size: expected.size, mode: expected.mode, uid: expected.uid, gid: expected.gid, device: expected.device, inode: expected.inode, nlink: expected.nlink, mtimeMilliseconds: expected.mtimeMilliseconds })) fail("BLOCKED_SUPERVISOR_NODE_BINDING_DRIFT", "RED");
    return observed;
  } finally { block.fill(0); fs.closeSync(fd); }
}
function prepareBlockedSupervisor(root, expectedNodeBinding = null) {
  const pidRoot = path.join(root, "blocked-supervisor-pids");
  if (!fs.existsSync(pidRoot)) fail("BLOCKED_SUPERVISOR_SLOT_ROOT_NOT_PREPARED", "RED");
  const pidRootStat = fs.lstatSync(pidRoot);
  if (!pidRootStat.isDirectory() || pidRootStat.isSymbolicLink() || pidRootStat.uid !== process.getuid() || (pidRootStat.mode & 0o777) !== 0o700 || fs.realpathSync(pidRoot) !== pidRoot) fail("BLOCKED_SUPERVISOR_SLOT_ROOT_UNSAFE", "RED");
  const nodeBinding = observeCurrentNodeExecutable(expectedNodeBinding);
  const runId = path.basename(root);
  if (!/^[A-Za-z0-9._-]+$/u.test(runId)) fail("BLOCKED_SUPERVISOR_RUN_ID_INVALID", "RED");
  return Object.freeze({ pidRoot, supervisorSha256: BLOCKED_SUPERVISOR_SHA256, nodeBinding, runId });
}
async function prepareBlockedStartSlotRoot(root, journal, lane) {
  const pidRoot = path.join(root, "blocked-supervisor-pids");
  const commandShapeSha256 = sha256(Buffer.from("r4-gate-b-blocked-start-slot-root.v1\n", "utf8"));
  await journal.append({ lane, event: "intent:blocked-start-slot-root", commandShapeSha256, ownedResources: ["blocked-start-slot-root"], cleanupState: "required" });
  if (fs.existsSync(pidRoot)) fail("BLOCKED_SUPERVISOR_SLOT_ROOT_PREEXISTS", "RED_QUARANTINED");
  mkdirOwned0700(pidRoot);
  await journal.append({ lane, event: "observed:blocked-start-slot-root", commandShapeSha256, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED", cleanupState: "required" });
  return pidRoot;
}
function readSupervisorReadySlot(slotPath, startId, releaseAuthoritySha256 = null) {
  const stat = fs.lstatSync(slotPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size > 512) return false;
  const fd = fs.openSync(slotPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(stat.size);
  try {
    let offset = 0; while (offset < bytes.length) { const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (count <= 0) return false; offset += count; }
    const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(slotPath);
    if (afterFd.dev !== stat.dev || afterFd.ino !== stat.ino || afterFd.size !== stat.size || afterPath.dev !== stat.dev || afterPath.ino !== stat.ino || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a)) return false;
    const value = parseStrictJson(bytes.subarray(0, -1).toString("utf8"));
    exactObject(value, new Set(["pid", "releaseAuthoritySha256", "schemaVersion", "startId"]), "BLOCKED_SUPERVISOR_READY_SHAPE");
    if (value.schemaVersion !== "r4_gate_b_blocked_supervisor_ready.v2" || value.startId !== startId || !SHA.test(value.releaseAuthoritySha256) || (releaseAuthoritySha256 !== null && value.releaseAuthoritySha256 !== releaseAuthoritySha256) || !Number.isSafeInteger(value.pid) || value.pid <= 1) return null;
    return Object.freeze({ pid: value.pid, startId: value.startId, releaseAuthoritySha256: value.releaseAuthoritySha256, device: stat.dev, inode: stat.ino });
  } catch { return false; }
  finally { bytes.fill(0); fs.closeSync(fd); }
}
function removeObservedSupervisorSlot(slotPath, startId, releaseAuthoritySha256, expectedPid, expectedReady) {
  if (expectedReady === null || typeof expectedReady !== "object" || expectedReady.startId !== startId || expectedReady.releaseAuthoritySha256 !== releaseAuthoritySha256 || expectedReady.pid !== expectedPid || !Number.isSafeInteger(expectedReady.device) || !Number.isSafeInteger(expectedReady.inode)) fail("BLOCKED_SUPERVISOR_SLOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  if (lstatIfPresent(slotPath, "BLOCKED_SUPERVISOR_SLOT_UNREADABLE") === null) return true;
  const ready = readSupervisorReadySlot(slotPath, startId, releaseAuthoritySha256);
  if (ready === false || ready === null || ready.pid !== expectedPid || ready.device !== expectedReady.device || ready.inode !== expectedReady.inode) fail("BLOCKED_SUPERVISOR_SLOT_IDENTITY_DRIFT", "RED_QUARANTINED");
  const beforeUnlink = lstatIfPresent(slotPath, "BLOCKED_SUPERVISOR_SLOT_UNREADABLE");
  if (beforeUnlink === null || !beforeUnlink.isFile() || beforeUnlink.isSymbolicLink() || beforeUnlink.uid !== process.getuid() || beforeUnlink.nlink !== 1 || (beforeUnlink.mode & 0o777) !== 0o600 || beforeUnlink.dev !== ready.device || beforeUnlink.ino !== ready.inode) fail("BLOCKED_SUPERVISOR_SLOT_IDENTITY_DRIFT", "RED_QUARANTINED");
  fs.unlinkSync(slotPath);
  if (lstatIfPresent(slotPath, "BLOCKED_SUPERVISOR_SLOT_ABSENCE_UNREADABLE") !== null) fail("BLOCKED_SUPERVISOR_SLOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
  fsyncDirectory(path.dirname(slotPath));
  return true;
}
function createProductionBlockedProcessPort(root, expectedNodeBinding = null, auditDiscardFileDescriptors = null, constructionFaultPoint = null) {
  const prepared = prepareBlockedSupervisor(root, expectedNodeBinding);
  if (auditDiscardFileDescriptors !== null && (!(root === CONSTRUCTION_ROOT || root.startsWith("/private/tmp/forme-r4-blocked-start-")) || !Array.isArray(auditDiscardFileDescriptors) || auditDiscardFileDescriptors.length !== 2 || auditDiscardFileDescriptors.some((fd) => !Number.isSafeInteger(fd) || fd < 0))) fail("BLOCKED_SUPERVISOR_AUDIT_FD_AUTHORITY_INVALID", "RED");
  const constructionFaultPoints = new Set(["after-slot-open", "before-slot-fstat", "after-slot-fstat", "before-slot-fsync", "after-slot-fsync", "before-parent-fsync", "after-parent-fsync", "before-spawn", "after-spawn", "before-slot-close", "after-slot-close", "before-ready", "after-ready"]);
  if (constructionFaultPoint !== null && (!(root === CONSTRUCTION_ROOT || root.startsWith("/private/tmp/forme-r4-blocked-start-")) || !constructionFaultPoints.has(constructionFaultPoint))) fail("BLOCKED_SUPERVISOR_FAULT_AUTHORITY_INVALID", "RED");
  let constructionFaultConsumed = false;
  const injectConstructionFault = (point) => {
    if (constructionFaultPoint !== point || constructionFaultConsumed) return;
    constructionFaultConsumed = true;
    fail("BLOCKED_SUPERVISOR_INJECTED_FAULT", "RED");
  };
  return Object.freeze({
    supervisorSha256: prepared.supervisorSha256,
    nodeBinding: prepared.nodeBinding,
    async start({ family, logicalId, startSequence, commandShapeSha256, executable, argv, cwd, environment, stdio = ["pipe", "pipe", "pipe"], targetStdioCount = 3 }) {
      if (!["host-inspector", "codex", "postgres", "macos", "cleanup"].includes(family) || typeof logicalId !== "string" || !/^[A-Za-z0-9-]+$/u.test(logicalId) || !Number.isSafeInteger(startSequence) || startSequence < 0 || !SHA.test(commandShapeSha256) || !path.isAbsolute(executable) || path.normalize(executable) !== executable || !Array.isArray(argv) || argv.some((item) => typeof item !== "string" || item.includes("\0")) || !path.isAbsolute(cwd) || path.normalize(cwd) !== cwd || environment === null || typeof environment !== "object" || Array.isArray(environment) || Object.entries(environment).some(([key, value]) => typeof key !== "string" || typeof value !== "string" || key.includes("\0") || value.includes("\0")) || !Array.isArray(stdio) || stdio.length !== 3 || targetStdioCount !== 3) fail("BLOCKED_SUPERVISOR_START_SHAPE_INVALID", "RED");
      observeCurrentNodeExecutable(prepared.nodeBinding);
      const copiedArgv = Object.freeze(argv.map((item) => `${item}`));
      const copiedEnvironment = Object.freeze(Object.fromEntries(Object.entries(environment).sort(([left], [right]) => Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"))).map(([key, value]) => [key, `${value}`])));
      const startId = blockedStartId({ runId: prepared.runId, startSequence, family, logicalId, commandShapeSha256 });
      const envelope = Object.freeze({ schemaVersion: "r4_gate_b_blocked_supervisor_release.v2", startId, runId: prepared.runId, startSequence, commandShapeSha256, family, logicalId, executable: `${executable}`, argv: copiedArgv, cwd: `${cwd}`, environment: copiedEnvironment, targetStdioCount });
      const releaseBytes = Buffer.from(`${canonicalJson(envelope)}\n`, "utf8");
      if (releaseBytes.length > 131_072) { releaseBytes.fill(0); fail("BLOCKED_SUPERVISOR_RELEASE_TOO_LARGE", "RED"); }
      const releaseAuthoritySha256 = sha256(releaseBytes);
      const slotPath = supervisorSlotPath(root, startId);
      let slotFd = null;
      let slotIdentity = null;
      let slotCreated = false;
      let child = null;
      let readySlotIdentity = null;
      let logicalStartObserved = false;
      const removeCreatedSlot = () => {
        if (!slotCreated) return true;
        if (slotIdentity === null) {
          if (slotFd === null) fail("BLOCKED_SUPERVISOR_CREATED_SLOT_IDENTITY_UNKNOWN", "RED_QUARANTINED");
          slotIdentity = fs.fstatSync(slotFd);
        }
        const observed = fs.lstatSync(slotPath);
        if (!observed.isFile() || observed.isSymbolicLink() || observed.uid !== process.getuid() || observed.nlink !== 1 || (observed.mode & 0o777) !== 0o600 || observed.dev !== slotIdentity.dev || observed.ino !== slotIdentity.ino) fail("BLOCKED_SUPERVISOR_CREATED_SLOT_DRIFT", "RED_QUARANTINED");
        fs.unlinkSync(slotPath); fsyncDirectory(path.dirname(slotPath));
        slotCreated = false;
        return true;
      };
      const closeSlot = () => {
        if (slotFd === null) return;
        const owned = slotFd;
        slotFd = null;
        fs.closeSync(owned);
      };
      const closeChildStreams = () => {
        if (child === null) return;
        const streams = new Set([child.stdin, child.stdout, child.stderr, ...(Array.isArray(child.stdio) ? child.stdio : [])]);
        for (const stream of streams) try { stream?.destroy?.(); } catch { /* bounded group cleanup remains authoritative */ }
      };
      try {
        slotFd = fs.openSync(slotPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
        slotCreated = true;
        injectConstructionFault("after-slot-open");
        injectConstructionFault("before-slot-fstat");
        slotIdentity = fs.fstatSync(slotFd);
        injectConstructionFault("after-slot-fstat");
        if (!slotIdentity.isFile() || slotIdentity.uid !== process.getuid() || slotIdentity.nlink !== 1 || (slotIdentity.mode & 0o777) !== 0o600) fail("BLOCKED_SUPERVISOR_CREATED_SLOT_UNSAFE", "RED_QUARANTINED");
        injectConstructionFault("before-slot-fsync");
        fs.fsyncSync(slotFd);
        injectConstructionFault("after-slot-fsync");
        injectConstructionFault("before-parent-fsync");
        fsyncDirectory(path.dirname(slotPath));
        injectConstructionFault("after-parent-fsync");
        const afterDurable = fs.fstatSync(slotFd);
        if (afterDurable.dev !== slotIdentity.dev || afterDurable.ino !== slotIdentity.ino || afterDurable.size !== 0) fail("BLOCKED_SUPERVISOR_CREATED_SLOT_DRIFT", "RED_QUARANTINED");
        const wrapperStdio = [...stdio, ...(auditDiscardFileDescriptors ?? ["ignore", "ignore"]), slotFd, "pipe"];
        injectConstructionFault("before-spawn");
        child = spawn(process.execPath, ["--input-type=module", "--eval", BLOCKED_SUPERVISOR_SOURCE], { cwd: root, env: { FORME_R4_BLOCKED_START_ID: startId, FORME_R4_BLOCKED_RELEASE_AUTHORITY: releaseAuthoritySha256 }, shell: false, detached: true, stdio: wrapperStdio });
        logicalStartObserved = true;
        injectConstructionFault("after-spawn");
        injectConstructionFault("before-slot-close");
        closeSlot();
        injectConstructionFault("after-slot-close");
        if (!Number.isSafeInteger(child.pid) || child.pid <= 1) fail("BLOCKED_SUPERVISOR_PID_MISSING", "RED");
        const readyDeadline = Date.now() + 2_000;
        injectConstructionFault("before-ready");
        let ready = readSupervisorReadySlot(slotPath, startId, releaseAuthoritySha256);
        while (Date.now() <= readyDeadline && (ready === false || ready === null || ready.pid !== child.pid)) { await new Promise((resolve) => setTimeout(resolve, 10)); ready = readSupervisorReadySlot(slotPath, startId, releaseAuthoritySha256); }
        if (ready === false || ready === null || ready.pid !== child.pid) fail("BLOCKED_SUPERVISOR_READY_MISSING", "RED");
        readySlotIdentity = ready;
        injectConstructionFault("after-ready");
        observeCurrentNodeExecutable(prepared.nodeBinding);
        let released = false;
        const control = child.stdio[6];
        if (!control) fail("BLOCKED_SUPERVISOR_CONTROL_PIPE_MISSING", "RED");
      child.release = async () => {
        if (released) fail("BLOCKED_SUPERVISOR_DUPLICATE_RELEASE", "RED");
        released = true;
        try { observeCurrentNodeExecutable(prepared.nodeBinding); }
        catch (error) { releaseBytes.fill(0); try { control.destroy(); } catch {} throw error; }
        try {
          await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error = null) => {
              if (settled) return;
              settled = true;
              control.off("error", onError);
              if (error === null) resolve(); else reject(error);
            };
            const onError = (error) => finish(error);
            control.once("error", onError);
            control.end(releaseBytes, () => finish());
          });
        } finally { releaseBytes.fill(0); }
      };
      child.abortBeforeRelease = async () => {
        releaseBytes.fill(0); closeChildStreams();
        const absent = await stopAndProveGroupAbsent(child.pid);
        return absent;
      };
      child.signalGroup = (signal) => signalGroup(child.pid, signal);
      child.stopAndProveAbsent = async () => {
        closeChildStreams();
        const absent = await stopAndProveGroupAbsent(child.pid);
        return absent;
      };
      child.finalizeSlotAfterTerminal = () => removeObservedSupervisorSlot(slotPath, startId, releaseAuthoritySha256, child.pid, readySlotIdentity);
      child.supervisorSlotPath = slotPath;
      child.supervisorSha256 = prepared.supervisorSha256;
      child.blockedStartId = startId;
      child.releaseAuthoritySha256 = releaseAuthoritySha256;
      return child;
      } catch (error) {
        releaseBytes.fill(0);
        let cleanupUncertain = false;
        if (slotCreated && slotIdentity === null && slotFd !== null) {
          try {
            const recoveredIdentity = fs.fstatSync(slotFd);
            if (!recoveredIdentity.isFile() || recoveredIdentity.uid !== process.getuid() || recoveredIdentity.nlink !== 1 || (recoveredIdentity.mode & 0o777) !== 0o600) cleanupUncertain = true;
            else slotIdentity = recoveredIdentity;
          } catch { cleanupUncertain = true; }
        }
        try { closeSlot(); } catch { cleanupUncertain = true; }
        let processGroupState = logicalStartObserved ? "unknown" : "not-started";
        if (logicalStartObserved && child !== null) {
          closeChildStreams();
          const pid = Number.isSafeInteger(child.pid) && child.pid > 1 ? child.pid : null;
          if (pid !== null) {
            try {
              if (await stopAndProveGroupAbsent(pid)) processGroupState = "observed-absent";
              else cleanupUncertain = true;
            } catch { cleanupUncertain = true; }
          } else {
            try {
              await Promise.race([new Promise((resolve) => child.once("close", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
              const ready = readSupervisorReadySlot(slotPath, startId, releaseAuthoritySha256);
              if (ready !== false && ready !== null && groupExists(ready.pid) === false) processGroupState = "observed-absent";
              else cleanupUncertain = true;
            } catch { cleanupUncertain = true; }
          }
        }
        if (!logicalStartObserved) processGroupState = "not-started";
        if (!cleanupUncertain && (processGroupState === "observed-absent" || processGroupState === "not-started")) {
          try { removeCreatedSlot(); } catch { cleanupUncertain = true; }
        }
        const trusted = error instanceof PhysicalRunnerError;
        const code = trusted ? error.code : "BLOCKED_SUPERVISOR_START_UNCONTROLLED";
        const verdict = cleanupUncertain || processGroupState === "unknown" ? "RED_QUARANTINED" : trusted && error.verdict === "RED_QUARANTINED" ? "RED" : trusted ? (error.verdict ?? "RED") : "RED";
        const terminal = new PhysicalRunnerError(code, verdict);
        terminal.logicalStartObserved = logicalStartObserved;
        terminal.processGroupState = cleanupUncertain ? "unknown" : processGroupState;
        terminal.processGroupId = logicalStartObserved && child !== null && Number.isSafeInteger(child.pid) && child.pid > 1 ? child.pid : null;
        throw terminal;
      }
    },
  });
}
async function recoverUnstartedBlockedSupervisors(root, starts, journal = null) {
  let allAbsent = true;
  for (const start of starts) {
    const startId = blockedStartId({ ...start, runId: path.basename(root) });
    const slotPath = supervisorSlotPath(root, startId);
    if (lstatIfPresent(slotPath, "BLOCKED_SUPERVISOR_RECOVERY_SLOT_UNREADABLE") === null) { allAbsent = false; continue; }
    const deadline = Date.now() + 2_000;
    let ready = readSupervisorReadySlot(slotPath, startId);
    while (ready === false && Date.now() <= deadline) { await new Promise((resolve) => setTimeout(resolve, 10)); ready = readSupervisorReadySlot(slotPath, startId); }
    if (ready === false || ready === null) { allAbsent = false; continue; }
    const absent = groupExists(ready.pid) === false || await stopAndProveGroupAbsent(ready.pid);
    if (!absent) { allAbsent = false; continue; }
    removeObservedSupervisorSlot(slotPath, startId, ready.releaseAuthoritySha256, ready.pid, ready);
    if (journal !== null) {
      await journal.append({ lane: start.lane, event: `cleanup-observed-absent:${start.logicalId}`, commandShapeSha256: start.commandShapeSha256, processGroupId: ready.pid, ownedResources: start.ownedResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
    }
  }
  return allAbsent;
}
function appendBounded(prior, chunk, limit) {
  if (prior.length > limit) return prior;
  const next = Buffer.concat([prior, chunk]);
  prior.fill(0);
  if (next.length <= limit) return next;
  const capped = Buffer.from(next.subarray(0, limit + 1));
  next.fill(0);
  return capped;
}
export function validateDockerExactNameAbsent({ resourceKind, resourceName, stdout, stderr, exitCode }) {
  if (!Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr) || !["container", "volume"].includes(resourceKind) || typeof resourceName !== "string" || resourceName.length < 1 || exitCode !== 1 || stdout.length !== 0) fail("POSTGRES_EXACT_NAME_ABSENCE_INVALID", "RED");
  const text = stderr.toString("utf8");
  const accepted = resourceKind === "container"
    ? new Set([`Error response from daemon: No such container: ${resourceName}\n`, `Error: No such container: ${resourceName}\n`])
    : new Set([`Error response from daemon: get ${resourceName}: no such volume\n`, `Error: No such volume: ${resourceName}\n`]);
  if (!accepted.has(text)) fail("POSTGRES_EXACT_NAME_ABSENCE_INVALID", "RED");
  return true;
}

async function runClosedProcess(command, { journal, lane, processPort, stdin = null, acceptedExitCodes = command.expectedExitCodes ?? [0], onStarted = null, onCompleted = null, journalCommandShapeSha256 = null } = {}) {
  if (!command || !path.isAbsolute(command.executable) || !Array.isArray(command.argv) || !path.isAbsolute(command.cwd) || command.shell !== false || command.callerArguments !== 0 || !Number.isInteger(command.deadlineMilliseconds) || command.deadlineMilliseconds < 1 || !Number.isInteger(command.stdoutLimitBytes) || !Number.isInteger(command.stderrLimitBytes)) fail("PHYSICAL_PROCESS_COMMAND_DENIED", "RED");
  if (!processPort || typeof processPort.start !== "function") fail("PHYSICAL_BLOCKED_PROCESS_PORT_REQUIRED", "RED");
  const commandShapeSha256 = journalCommandShapeSha256 ?? sha256(Buffer.from(canonicalJson({ executable: command.executable, argv: command.argv, cwd: command.cwd, environment: command.environment, deadlineMilliseconds: command.deadlineMilliseconds, stdoutLimitBytes: command.stdoutLimitBytes, stderrLimitBytes: command.stderrLimitBytes }), "utf8"));
  if (!SHA.test(commandShapeSha256)) fail("PHYSICAL_PROCESS_JOURNAL_SHAPE_INVALID", "RED");
  const intentRecord = await journal.append({ lane, event: `intent:${command.kind}`, commandShapeSha256, ownedResources: [`${lane}-process-group`], cleanupState: "required" });
  const family = ["postgres", "macos", "cleanup"].includes(lane) ? lane : null;
  if (family === null || typeof command.kind !== "string" || !/^[A-Za-z0-9-]+$/u.test(command.kind)) fail("PHYSICAL_PROCESS_LOGICAL_ID_INVALID", "RED");
  const child = await processPort.start({ family, logicalId: command.kind, startSequence: intentRecord.sequence, commandShapeSha256, executable: command.executable, argv: command.argv, cwd: command.cwd, environment: command.environment, stdio: ["pipe", "pipe", "pipe"], targetStdioCount: 3 });
  if (!Number.isSafeInteger(child.pid) || child.pid <= 1) fail("PHYSICAL_PROCESS_PID_MISSING", "RED");
  const processGroupId = child.pid;
  try {
    await journal.append({ lane, event: `started:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], cleanupState: "required" });
    if (onStarted !== null) onStarted(Object.freeze({ processGroupId, commandShapeSha256 }));
  } catch (error) {
    const absent = typeof child.abortBeforeRelease === "function" ? await child.abortBeforeRelease() : false;
    if (!absent) fail("PHYSICAL_PROCESS_UNJOURNALED_GROUP_QUARANTINED", "RED_QUARANTINED");
    await journal.append({ lane, event: `cleanup-observed-absent:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], terminalCode: "ABSENT", cleanupState: "observed-absent" });
    if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
    throw error;
  }
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let overflow = false;
  let stdinError = null;
  const signal = (value) => typeof child.signalGroup === "function" ? child.signalGroup(value) : false;
  let stdioClosedForStop = false;
  const closeOwnedStdioForStop = () => {
    if (stdioClosedForStop) return;
    stdioClosedForStop = true;
    for (const stream of [child.stdin, child.stdout, child.stderr]) try { stream.destroy(); } catch { /* process cleanup remains authoritative */ }
  };
  child.stdin.on("error", (error) => { stdinError = error; closeOwnedStdioForStop(); signal("SIGTERM"); });
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, command.stdoutLimitBytes); if (stdout.length > command.stdoutLimitBytes) { overflow = true; closeOwnedStdioForStop(); signal("SIGTERM"); } });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, command.stderrLimitBytes); if (stderr.length > command.stderrLimitBytes) { overflow = true; closeOwnedStdioForStop(); signal("SIGTERM"); } });
  const closed = new Promise((resolve) => {
    let settled = false;
    child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
    child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
  });
  let releaseError = null;
  try {
    if (typeof child.release !== "function") fail("PHYSICAL_BLOCKED_RELEASE_PORT_MISSING", "RED");
    await child.release();
  } catch (error) { releaseError = error; closeOwnedStdioForStop(); signal("SIGTERM"); }
  if (releaseError === null) {
    if (stdin === null) child.stdin.end();
    else {
      const owned = Buffer.isBuffer(stdin) ? Buffer.from(stdin) : Buffer.from(stdin, "utf8");
      try { child.stdin.end(owned); } finally { owned.fill(0); }
    }
  }
  let timedOut = false;
  let timeoutId;
  const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve(null), command.deadlineMilliseconds); });
  let terminal = await Promise.race([closed, timeout]);
  clearTimeout(timeoutId);
  if (terminal === null) {
    timedOut = true;
    closeOwnedStdioForStop();
    signal("SIGTERM");
    terminal = await awaitMacOSTerminalWithTimeout(closed, 2_000);
    if (terminal === null) {
      signal("SIGKILL");
      terminal = await awaitMacOSTerminalWithTimeout(closed, 2_000);
    }
  }
  closeOwnedStdioForStop();
  const absent = typeof child.stopAndProveAbsent === "function" ? await child.stopAndProveAbsent() : false;
  try {
    await journal.append({ lane, event: `terminal:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
    if (absent && typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
  } catch (error) {
    if (absent) {
      await journal.append({ lane, event: `cleanup-observed-absent:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], terminalCode: "ABSENT", cleanupState: "observed-absent" });
      if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
    }
    stdout.fill(0); stderr.fill(0); throw error;
  }
  if (releaseError !== null || terminal === null || terminal.error || stdinError !== null || timedOut || overflow || !absent || terminal.signal !== null || !acceptedExitCodes.includes(terminal.code) || stdout.length > command.stdoutLimitBytes || stderr.length > command.stderrLimitBytes) {
    stdout.fill(0); stderr.fill(0);
    fail("PHYSICAL_PROCESS_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
  }
  if (onCompleted !== null) onCompleted(Object.freeze({ exitCode: terminal.code, processGroupId, commandShapeSha256 }));
  return Object.freeze({ stdout, stderr, exitCode: terminal.code, processGroupId, processGroupAbsent: absent });
}

function readRetryManifestAuthority(parsed) {
  if (!fs.existsSync(RETRY_MANIFEST_PATH)) fail("RETRY_MANIFEST_NOT_PUBLISHED", "HOST_BINDING_INCOMPLETE_YELLOW");
  const stat = fs.lstatSync(RETRY_MANIFEST_PATH);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(RETRY_MANIFEST_PATH) !== RETRY_MANIFEST_PATH || stat.size > 1_048_576) fail("RETRY_MANIFEST_FILE_UNSAFE", "RED");
  const bytes = fs.readFileSync(RETRY_MANIFEST_PATH);
  try {
    if (sha256(bytes) !== parsed.manifestSha256) fail("RETRY_MANIFEST_HASH_MISMATCH", "RED");
    const textValue = bytes.toString("utf8");
    const match = /<!-- R4_GATE_B_RETRY_AUTHORITY_BEGIN -->\n([^\n]+)\n<!-- R4_GATE_B_RETRY_AUTHORITY_END -->/u.exec(textValue);
    if (!match) fail("RETRY_MANIFEST_AUTHORITY_BLOCK_MISSING", "RED");
    let value;
    try { value = parseStrictJson(match[1]); } catch { fail("RETRY_MANIFEST_AUTHORITY_JSON_INVALID", "RED"); }
    exactObject(value, new Set(["schemaVersion", "implementationHead", "implementationTree", "outputCommitParent", "outputCommitPathSetSha256", "outputCommitMustBeDirectChild", "hostBindingId", "hostBindingCapsuleSha256", "hostBindingPublicReceiptSha256", "physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexPortSha256", "codexProfileSha256", "runtimeDependencyAggregateSha256", "aggregateCeiling"]), "RETRY_MANIFEST_AUTHORITY_SHAPE");
    if (value.schemaVersion !== "r4_gate_b_physical_retry_authority.v1" || value.hostBindingId !== parsed.hostBindingId || value.aggregateCeiling !== "YELLOW" || !GIT.test(value.implementationHead) || !GIT.test(value.implementationTree) || value.outputCommitParent !== value.implementationHead || value.outputCommitPathSetSha256 !== PHASE_B_OUTPUT_PATH_SET_SHA256 || value.outputCommitMustBeDirectChild !== true) fail("RETRY_MANIFEST_AUTHORITY_INVALID", "RED");
    for (const key of ["hostBindingCapsuleSha256", "hostBindingPublicReceiptSha256", "physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexPortSha256", "codexProfileSha256", "runtimeDependencyAggregateSha256"]) if (!SHA.test(value[key])) fail("RETRY_MANIFEST_AUTHORITY_INVALID", "RED");
    if (match[1] !== canonicalJson(value)) fail("RETRY_MANIFEST_AUTHORITY_NOT_CANONICAL", "RED");
    return Object.freeze(value);
  } finally { bytes.fill(0); }
}

function readPublicHostBindingReceipt(expected) {
  const bytes = fs.readFileSync(PUBLIC_RECEIPT_PATH);
  try {
    if (sha256(bytes) !== expected.hostBindingPublicReceiptSha256 || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a)) fail("HOST_BINDING_PUBLIC_RECEIPT_DRIFT", "RED");
    const value = parseStrictJson(bytes.subarray(0, -1).toString("utf8"));
    validateSchema("schemas/r4/gate-b-core/host-binding-public-receipt.schema.json", value, "HOST_BINDING_PUBLIC_RECEIPT_SCHEMA_INVALID");
    if (`${canonicalJson(value)}\n` !== bytes.toString("utf8") || value.hostBindingId !== expected.hostBindingId || value.hostBindingCapsuleSha256 !== expected.hostBindingCapsuleSha256 || value.implementationHead !== expected.implementationHead || value.implementationTree !== expected.implementationTree || value.runtimeDependencyAggregateSha256 !== expected.runtimeDependencyAggregateSha256 || value.retryExecutionGrant !== "NOT_REQUESTED" || value.firstProviderCallGrant !== "NOT_REQUESTED") fail("HOST_BINDING_PUBLIC_RECEIPT_INVALID", "RED");
    return Object.freeze(value);
  } finally { bytes.fill(0); }
}

function verifyRetryRepositoryAuthority(authority) {
  if (gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") fail("RETRY_REPOSITORY_DIRTY", "RED");
  if (git(["cat-file", "-t", authority.implementationHead]) !== "commit" || git(["rev-parse", `${authority.implementationHead}^{tree}`]) !== authority.implementationTree || git(["merge-base", authority.implementationHead, "HEAD"]) !== authority.implementationHead) fail("RETRY_IMPLEMENTATION_LINEAGE_DRIFT", "RED");
  const runtime = runtimeDependencyInventory();
  const actual = { physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"), hostBindingModuleSha256: fileSha("scripts/r4-gate-b-host-binding.mjs"), physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"), runnerContractSha256: fileSha("schemas/r4/gate-b-core/physical-runner-contract.json"), codexPortSha256: fileSha("packages/r4-codex-adapter/src/zero-call-physical.ts"), codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb"), runtimeDependencyAggregateSha256: runtime.aggregateSha256 };
  for (const [key, value] of Object.entries(actual)) if (authority[key] !== value) fail("RETRY_IMPLEMENTATION_BYTE_DRIFT", "RED");
  const publicationHead = git(["log", "-1", "--format=%H", "--", RETRY_MANIFEST_PATH]);
  const parents = git(["rev-list", "--parents", "-n", "1", publicationHead]).split(" ");
  if (parents.length !== 2 || parents[1] !== authority.implementationHead) fail("RETRY_OUTPUT_COMMIT_LINEAGE_DRIFT", "RED");
  const publicationPaths = committedChangedPaths(authority.implementationHead, publicationHead).sort((a, b) => Buffer.from(a, "utf8").compare(Buffer.from(b, "utf8")));
  if (publicationPaths.length !== PHASE_B_OUTPUT_PATHS.size || publicationPaths.some((entry) => !PHASE_B_OUTPUT_PATHS.has(entry)) || sha256(Buffer.from(`${publicationPaths.join("\n")}\n`, "utf8")) !== authority.outputCommitPathSetSha256) fail("RETRY_OUTPUT_COMMIT_PATHSET_DRIFT", "RED");
  const publicationTree = git(["rev-parse", `${publicationHead}^{tree}`]);
  return Object.freeze({ ...actual, publicationHead, publicationTree });
}

export function createRetryJournal(root, manifestSha256, hostBindingId, runId) {
  if (lstatIfPresent(root, "RETRY_RUN_ROOT_UNREADABLE", "RED") !== null) fail("RETRY_RUN_ROOT_PREEXISTS", "RED");
  const journalPath = path.join(root, "journal.v1.jsonl");
  let rootCreated = false;
  let fd = null;
  let journalCreated = false;
  let journalIdentity = null;
  let rootAuthority = null;
  try {
    rootAuthority = createExclusiveOwnedRoot0700(root, exactOwnedRootAnchor(root, "RETRY_RUN_ROOT"), "RETRY_RUN_ROOT");
    rootCreated = true;
    fd = fs.openSync(journalPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
    journalCreated = true;
    journalIdentity = fs.fstatSync(fd);
    if (!journalIdentity.isFile() || journalIdentity.uid !== process.getuid() || journalIdentity.nlink !== 1 || (journalIdentity.mode & 0o777) !== 0o600 || journalIdentity.size !== 0) fail("RETRY_JOURNAL_CREATE_IDENTITY_INVALID", "RED_QUARANTINED");
    fs.fsyncSync(fd);
    fsyncDirectory(root);
  } catch (error) {
    let cleanupUncertain = false;
    if (journalCreated && journalIdentity === null && fd !== null) try { journalIdentity = fs.fstatSync(fd); } catch { cleanupUncertain = true; }
    if (fd !== null) { try { fs.closeSync(fd); } catch { cleanupUncertain = true; } fd = null; }
    if (rootAuthority !== null && !cleanupUncertain) {
      try { assertExactOwnedRootAuthorityCurrent(rootAuthority, "RETRY_RUN_ROOT"); }
      catch { cleanupUncertain = true; }
    }
    if (rootCreated && rootAuthority !== null && !cleanupUncertain) {
      const ownedAuthority = rootAuthority;
      rootAuthority = null;
      try { removeExactOwnedRootTree(ownedAuthority, RETRY_ROOT_DELETE_INVENTORY); }
      catch { cleanupUncertain = true; }
    }
    if (rootAuthority !== null) {
      try { closeExactOwnedRootAuthority(rootAuthority, "RETRY_RUN_ROOT_AUTHORITY_CLOSE_FAILED"); }
      catch { cleanupUncertain = true; }
      rootAuthority = null;
    }
    if (cleanupUncertain) fail("RETRY_JOURNAL_CREATE_CLEANUP_UNCERTAIN", "RED_QUARANTINED");
    if (error instanceof PhysicalRunnerError) throw error;
    fail("RETRY_JOURNAL_CREATE_FAILED", "RED");
  }
  let rootAuthorityTransferred = false;
  let sequence = 0;
  let previous = null;
  let poisoned = false;
  const raw = [];
  const records = [];
  return Object.freeze({
    path: journalPath,
    async append(partial) {
      if (fd === null) fail("RETRY_JOURNAL_ALREADY_CLOSED", "RED");
      if (poisoned) fail("RETRY_JOURNAL_APPEND_POISONED", "RED_QUARANTINED");
      const record = Object.freeze({ schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous, runId, manifestSha256, hostBindingId, lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null, processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required" });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      try {
        writeAll(fd, bytes);
        fs.fsyncSync(fd);
        const durableBytes = Buffer.from(bytes);
        raw.push(durableBytes);
        records.push(record);
        previous = sha256(bytes);
        sequence += 1;
        return record;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally { bytes.fill(0); }
    },
    close() { if (fd !== null) { const owned = fd; fd = null; fs.closeSync(owned); } },
    takeRootAuthority() {
      if (rootAuthorityTransferred || rootAuthority === null) fail("RETRY_RUN_ROOT_AUTHORITY_ALREADY_TAKEN", "RED_QUARANTINED");
      try { assertClosedExactOwnedRootInventory(rootAuthority, RETRY_NEW_JOURNAL_INVENTORY, "RETRY_RUN_ROOT"); }
      catch (error) {
        let cleanupUncertain = false;
        poisoned = true;
        if (fd !== null) { const owned = fd; fd = null; try { fs.closeSync(owned); } catch { cleanupUncertain = true; } }
        for (const bytes of raw) bytes.fill(0);
        try { closeExactOwnedRootAuthority(rootAuthority, "RETRY_RUN_ROOT_AUTHORITY_CLOSE_FAILED"); }
        catch { cleanupUncertain = true; }
        rootAuthority = null;
        if (cleanupUncertain) fail("RETRY_RUN_ROOT_TRANSFER_CLEANUP_UNCERTAIN", "RED_QUARANTINED");
        throw error;
      }
      rootAuthorityTransferred = true;
      return rootAuthority;
    },
    aggregateSha256() { if (poisoned) fail("RETRY_JOURNAL_APPEND_POISONED", "RED_QUARANTINED"); return sha256(Buffer.concat(raw)); },
    records() { return Object.freeze([...records]); },
    zeroize() {
      for (const bytes of raw) bytes.fill(0);
      if (!rootAuthorityTransferred && rootAuthority !== null) { closeExactOwnedRootAuthority(rootAuthority, "RETRY_RUN_ROOT_AUTHORITY_CLOSE_FAILED"); rootAuthority = null; }
    },
  });
}

function mkdirOwned0700(directory) {
  if (!path.isAbsolute(directory) || path.normalize(directory) !== directory || directory.includes("\0")) fail("RETRY_OWNED_DIRECTORY_PATH_INVALID", "RED");
  const privateTmp = "/private/tmp";
  const inside = (anchor) => {
    const relative = path.relative(anchor, directory);
    return relative !== "" && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`);
  };
  const anchor = inside(REPOSITORY_ROOT) ? REPOSITORY_ROOT : inside(privateTmp) ? privateTmp : null;
  if (anchor === null || fs.realpathSync(anchor) !== anchor) fail("RETRY_OWNED_DIRECTORY_ANCHOR_INVALID", "RED");
  let cursor = anchor;
  for (const component of path.relative(anchor, directory).split(path.sep).filter(Boolean)) {
    const parent = cursor;
    cursor = path.join(cursor, component);
    try {
      const stat = fs.lstatSync(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700 || fs.realpathSync(cursor) !== cursor) fail("RETRY_OWNED_DIRECTORY_UNSAFE", "RED");
    } catch (error) {
      if (error instanceof PhysicalRunnerError) throw error;
      if (error?.code !== "ENOENT") fail("RETRY_OWNED_DIRECTORY_UNREADABLE", "RED");
      fs.mkdirSync(cursor, { recursive: false, mode: 0o700 });
      const created = fs.lstatSync(cursor);
      if (!created.isDirectory() || created.isSymbolicLink() || created.uid !== process.getuid() || (created.mode & 0o777) !== 0o700) fail("RETRY_OWNED_DIRECTORY_CREATE_UNSAFE", "RED");
      fsyncDirectory(parent);
    }
  }
}
function capsuleBoundFile(capsule, logicalName) {
  const matches = capsule.boundFiles.filter((entry) => entry.logicalName === logicalName);
  if (matches.length !== 1) fail(`HOST_BINDING_LOGICAL_FILE_MISSING:${logicalName}`, "RED");
  return matches[0];
}
function statIdentityForCleanup(stat) {
  return Object.freeze({ size: stat.size, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, device: String(stat.dev), inode: String(stat.ino), nlink: stat.nlink, mtimeMilliseconds: Math.trunc(stat.mtimeMs) });
}
function assertCleanupBoundFileCurrent(capsule, logicalName) {
  const expected = capsuleBoundFile(capsule, logicalName);
  const chain = snapshotNoSymlinkPathChain(expected.path, `RETRY_CLEANUP_${logicalName.toUpperCase().replaceAll("-", "_")}_PATH_UNSAFE`);
  const fd = fs.openSync(expected.path, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const hash = crypto.createHash("sha256");
  const block = Buffer.allocUnsafe(65_536);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size !== expected.size || canonicalJson(statIdentityForCleanup(before)) !== canonicalJson({ size: expected.size, mode: expected.mode, uid: expected.uid, gid: expected.gid, device: expected.device, inode: expected.inode, nlink: expected.nlink, mtimeMilliseconds: expected.mtimeMilliseconds })) fail("RETRY_CLEANUP_TOOL_IDENTITY_DRIFT", "RED_QUARANTINED");
    let offset = 0;
    while (offset < before.size) {
      const count = fs.readSync(fd, block, 0, Math.min(block.length, before.size - offset), offset);
      if (count <= 0) fail("RETRY_CLEANUP_TOOL_SHORT_READ", "RED_QUARANTINED");
      hash.update(block.subarray(0, count));
      offset += count;
    }
    const after = fs.fstatSync(fd);
    const pathAfter = fs.lstatSync(expected.path);
    assertNoSymlinkPathChainStable(chain, "RETRY_CLEANUP_TOOL_PATH_DRIFT");
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || Math.trunc(after.mtimeMs) !== Math.trunc(before.mtimeMs) || pathAfter.dev !== before.dev || pathAfter.ino !== before.ino || pathAfter.nlink !== 1 || `sha256:${hash.digest("hex")}` !== expected.sha256) fail("RETRY_CLEANUP_TOOL_BYTE_DRIFT", "RED_QUARANTINED");
    return expected.path;
  } finally { block.fill(0); fs.closeSync(fd); }
}
function assertCleanupDockerSocketCurrent(capsule) {
  const chain = snapshotNoSymlinkPathChain(capsule.docker.socketPath, "RETRY_CLEANUP_DOCKER_SOCKET_PATH_UNSAFE");
  const stat = fs.lstatSync(capsule.docker.socketPath);
  if (!stat.isSocket() || canonicalJson(statIdentityForCleanup(stat)) !== canonicalJson(capsule.docker.socketIdentity)) fail("RETRY_CLEANUP_DOCKER_SOCKET_DRIFT", "RED_QUARANTINED");
  assertNoSymlinkPathChainStable(chain, "RETRY_CLEANUP_DOCKER_SOCKET_PATH_DRIFT");
  return capsule.docker.socketPath;
}
function copyOpenedRegularFile({ source, destination, expectedSha256, destinationMode }) {
  if (!SHA.test(expectedSha256) || ![0o500, 0o600].includes(destinationMode)) fail("CODEX_STAGE_AUTHORITY_INVALID", "RED");
  const snapshot = (candidate) => {
    if (!path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) fail("CODEX_STAGE_PATH_INVALID", "RED");
    const parsed = path.parse(candidate); let cursor = parsed.root; const entries = [];
    for (const component of candidate.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
      cursor = path.join(cursor, component); const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) fail("CODEX_STAGE_PATH_SYMLINK_DENIED", "RED");
      entries.push({ path: cursor, dev: stat.dev, ino: stat.ino, mode: stat.mode, uid: stat.uid });
    }
    return entries;
  };
  const stable = (entries) => entries.every((entry) => { const stat = fs.lstatSync(entry.path); return !stat.isSymbolicLink() && stat.dev === entry.dev && stat.ino === entry.ino && stat.mode === entry.mode && stat.uid === entry.uid; });
  const sourceChain = snapshot(source); const destinationChain = snapshot(path.dirname(destination));
  const sourceFd = fs.openSync(source, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let destinationFd = null; let destinationIdentity = null; let bytes = Buffer.alloc(0);
  try {
    const before = fs.fstatSync(sourceFd);
    if (!before.isFile() || before.uid !== process.getuid() || before.nlink !== 1 || before.size > 536_870_912) fail("CODEX_STAGE_SOURCE_UNSAFE", "RED");
    if (!stable(sourceChain) || !stable(destinationChain)) fail("CODEX_STAGE_PATH_CHANGED", "RED");
    bytes = Buffer.alloc(before.size); let offset = 0;
    while (offset < bytes.length) { const count = fs.readSync(sourceFd, bytes, offset, bytes.length - offset, offset); if (count <= 0) fail("CODEX_STAGE_SOURCE_SHORT_READ", "RED"); offset += count; }
    if (sha256(bytes) !== expectedSha256) fail("CODEX_STAGE_SOURCE_HASH_DRIFT", "RED");
    destinationFd = fs.openSync(destination, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), destinationMode);
    destinationIdentity = fs.fstatSync(destinationFd);
    if (!destinationIdentity.isFile() || destinationIdentity.nlink !== 1 || destinationIdentity.uid !== process.getuid() || (destinationIdentity.mode & 0o777) !== destinationMode || destinationIdentity.size !== 0) fail("CODEX_STAGE_DESTINATION_CREATE_IDENTITY_INVALID", "RED_QUARANTINED");
    writeAll(destinationFd, bytes); fs.fsyncSync(destinationFd); fs.fchmodSync(destinationFd, destinationMode);
    const after = fs.fstatSync(sourceFd); const sourcePath = fs.lstatSync(source);
    if (!stable(sourceChain) || !stable(destinationChain) || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || sourcePath.dev !== after.dev || sourcePath.ino !== after.ino || sourcePath.nlink !== 1) fail("CODEX_STAGE_SOURCE_CHANGED", "RED");
  } catch (error) {
    let rollbackUncertain = false;
    if (destinationFd !== null && destinationIdentity !== null) {
      try {
        const held = fs.fstatSync(destinationFd);
        const observed = fs.lstatSync(destination);
        if (!stable(destinationChain) || !held.isFile() || !observed.isFile() || observed.isSymbolicLink() || held.dev !== destinationIdentity.dev || held.ino !== destinationIdentity.ino || observed.dev !== destinationIdentity.dev || observed.ino !== destinationIdentity.ino || observed.nlink !== 1 || observed.uid !== destinationIdentity.uid || (observed.mode & 0o777) !== destinationMode) rollbackUncertain = true;
        else {
          fs.unlinkSync(destination);
          const afterUnlink = fs.fstatSync(destinationFd);
          if (afterUnlink.dev !== destinationIdentity.dev || afterUnlink.ino !== destinationIdentity.ino || afterUnlink.nlink !== 0 || lstatIfPresent(destination, "CODEX_STAGE_ROLLBACK_ABSENCE_UNREADABLE") !== null) rollbackUncertain = true;
          else fsyncDirectory(path.dirname(destination));
        }
      } catch { rollbackUncertain = true; }
    } else if (destinationFd !== null) rollbackUncertain = true;
    if (destinationFd !== null) { try { fs.closeSync(destinationFd); } catch { rollbackUncertain = true; } destinationFd = null; }
    if (rollbackUncertain) fail("CODEX_STAGE_DESTINATION_ROLLBACK_UNCERTAIN", "RED_QUARANTINED");
    throw error;
  } finally {
    if (destinationFd !== null) fs.closeSync(destinationFd);
    fs.closeSync(sourceFd); bytes.fill(0);
  }
  fsyncDirectory(path.dirname(destination));
  const staged = fs.lstatSync(destination);
  if (!staged.isFile() || staged.isSymbolicLink() || staged.nlink !== 1 || staged.uid !== process.getuid() || (staged.mode & 0o777) !== destinationMode || fs.realpathSync(destination) !== destination) fail("CODEX_STAGE_DESTINATION_UNSAFE", "RED");
  const observed = fs.readFileSync(destination);
  try { const digest = sha256(observed); if (digest !== expectedSha256) fail("CODEX_STAGE_DESTINATION_HASH_DRIFT", "RED"); return Object.freeze({ sha256: digest, bytes: observed.length }); } finally { observed.fill(0); }
}
function exercisePrivateCodexStaging(root) {
  const sourceRoot = path.join(root, "codex-staging-source"); const destinationRoot = path.join(root, "codex-staging-destination");
  mkdirOwned0700(sourceRoot); mkdirOwned0700(destinationRoot);
  const source = path.join(sourceRoot, "synthetic-codex"); const destination = path.join(destinationRoot, "synthetic-codex");
  const bytes = Buffer.from("synthetic-codex-staging-fixture\n", "utf8");
  const fd = fs.openSync(source, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  try { writeAll(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const expected = sha256(bytes); bytes.fill(0);
  const result = copyOpenedRegularFile({ source, destination, expectedSha256: expected, destinationMode: 0o500 });
  let existingRejected = false;
  try { copyOpenedRegularFile({ source, destination, expectedSha256: expected, destinationMode: 0o500 }); } catch { existingRejected = true; }
  if (!existingRejected) fail("CODEX_STAGE_EXISTING_DESTINATION_NOT_REJECTED", "RED");
  return Object.freeze({ status: "GREEN", sha256: result.sha256, existingDestinationRejected: true });
}
async function exerciseBlockedStartPreparationFaultMatrix({ root, journal }) {
  const faultPoints = Object.freeze(["after-slot-open", "before-slot-fstat", "after-slot-fstat", "before-slot-fsync", "after-slot-fsync", "before-parent-fsync", "after-parent-fsync", "before-spawn", "after-spawn", "before-slot-close", "after-slot-close", "before-ready", "after-ready"]);
  let logicalStartsObserved = 0;
  for (const [index, faultPoint] of faultPoints.entries()) {
    const logicalId = `blocked-start-fault-${index}`;
    const commandShapeSha256 = sha256(Buffer.from(`${logicalId}\n`, "utf8"));
    const intent = await journal.append({ lane: "macos", event: `intent:${logicalId}`, commandShapeSha256, ownedResources: ["macos-process-group"], cleanupState: "required" });
    const port = createProductionBlockedProcessPort(root, null, null, faultPoint);
    let observedError = null;
    try {
      await port.start({ family: "macos", logicalId, startSequence: intent.sequence, commandShapeSha256, executable: process.execPath, argv: ["--version"], cwd: root, environment: { FORME_R4_BLOCKED_FAULT_FAKE: "1" }, stdio: ["pipe", "pipe", "pipe"], targetStdioCount: 3 });
    } catch (error) { observedError = error; }
    if (!(observedError instanceof PhysicalRunnerError) || observedError.code !== "BLOCKED_SUPERVISOR_INJECTED_FAULT" || observedError.verdict !== "RED" || !["not-started", "observed-absent"].includes(observedError.processGroupState)) fail("BLOCKED_SUPERVISOR_FAULT_RESULT_INVALID", "RED");
    const expectedLogicalStart = ["after-spawn", "before-slot-close", "after-slot-close", "before-ready", "after-ready"].includes(faultPoint);
    if (observedError.logicalStartObserved !== expectedLogicalStart || (expectedLogicalStart && (observedError.processGroupState !== "observed-absent" || !Number.isSafeInteger(observedError.processGroupId))) || (!expectedLogicalStart && (observedError.processGroupState !== "not-started" || observedError.processGroupId !== null))) fail("BLOCKED_SUPERVISOR_FAULT_OBSERVATION_INVALID", "RED");
    if (expectedLogicalStart) {
      await journal.append({ lane: "macos", event: `cleanup-observed-absent:${logicalId}`, commandShapeSha256, processGroupId: observedError.processGroupId, ownedResources: ["macos-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" });
    } else {
      await journal.append({ lane: "macos", event: `not-started:${logicalId}`, commandShapeSha256, ownedResources: ["macos-process-group"], terminalCode: "NOT_STARTED", cleanupState: "observed-absent" });
    }
    logicalStartsObserved += Number(expectedLogicalStart);
    if (fs.readdirSync(path.join(root, "blocked-supervisor-pids")).length !== 0) fail("BLOCKED_SUPERVISOR_FAULT_SLOT_RESIDUE", "RED_QUARANTINED");
  }
  return Object.freeze({ casesValidated: faultPoints.length, logicalStartsObserved, allProcessGroupsAbsent: true, residueCount: 0 });
}
export async function exerciseBlockedStartProtocolForConstruction(options = {}) {
  const ownsLifecycle = options.root === undefined && options.journal === undefined;
  if (!ownsLifecycle && (options.root !== CONSTRUCTION_ROOT || options.journal === null || typeof options.journal?.append !== "function" || typeof options.journal?.records !== "function")) fail("BLOCKED_START_EXERCISE_EXTERNAL_AUTHORITY_INVALID", "RED");
  const root = ownsLifecycle ? `/private/tmp/forme-r4-blocked-start-${crypto.randomBytes(16).toString("hex")}` : options.root;
  const journal = ownsLifecycle ? createRetryJournal(root, `sha256:${"0".repeat(64)}`, "0".repeat(32), path.basename(root)) : options.journal;
  const initialRecordCount = journal.records().length;
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  const discardCanaryDescriptors = [];
  try {
    await prepareBlockedStartSlotRoot(root, journal, ownsLifecycle ? "runner" : "construction");
    const discardCanaryIdentities = [];
    for (const [index, text] of ["blocked-start-discard-canary-a\n", "blocked-start-discard-canary-b\n"].entries()) {
      const canaryPath = path.join(root, `discard-canary-${index}.bin`);
      const bytes = Buffer.from(text, "utf8");
      let writeDescriptor = null;
      try {
        writeDescriptor = fs.openSync(canaryPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
        writeAll(writeDescriptor, bytes);
        fs.fsyncSync(writeDescriptor);
      } finally {
        bytes.fill(0);
        if (writeDescriptor !== null) fs.closeSync(writeDescriptor);
      }
      const readDescriptor = fs.openSync(canaryPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      const identity = fs.fstatSync(readDescriptor);
      if (!identity.isFile() || identity.nlink !== 1 || identity.uid !== process.getuid() || (identity.mode & 0o777) !== 0o600) fail("BLOCKED_START_EXERCISE_CANARY_UNSAFE", "RED");
      discardCanaryDescriptors.push(readDescriptor);
      discardCanaryIdentities.push(Object.freeze({ device: String(identity.dev), inode: String(identity.ino) }));
    }
    fsyncDirectory(root);
    const processPort = createProductionBlockedProcessPort(root, null, discardCanaryDescriptors);
    const targetSource = [
      'import fs from "node:fs";',
      'let groupLeaderProbe=false;try{process.kill(-process.pid,0);groupLeaderProbe=true;}catch{}',
      `const discardCanaryIdentities=${JSON.stringify(discardCanaryIdentities)};`,
      'const discardDescriptorCanariesAbsent=[3,4].every((fd,index)=>{try{const stat=fs.fstatSync(fd);return String(stat.dev)!==discardCanaryIdentities[index].device||String(stat.ino)!==discardCanaryIdentities[index].inode;}catch{return true;}});',
      'process.stdout.write(JSON.stringify({cwd:process.cwd(),discardDescriptorCanariesAbsent,environmentKeys:Object.keys(process.env).sort(),groupLeaderProbe,pid:process.pid,schemaVersion:"r4_gate_b_blocked_start_target.v1"})+"\\n");',
    ].join("\n");
    const command = Object.freeze({ kind: "blocked-start-fake", executable: process.execPath, argv: Object.freeze(["--input-type=module", "--eval", targetSource]), cwd: root, environment: Object.freeze({ FORME_R4_BLOCKED_FAKE: "1" }), shell: false, callerArguments: 0, deadlineMilliseconds: 5_000, stdoutLimitBytes: 4096, stderrLimitBytes: 0, expectedExitCodes: Object.freeze([0]) });
    const result = await runClosedProcess(command, { journal, lane: "macos", processPort });
    stdout = result.stdout; stderr = result.stderr;
    if (stderr.length !== 0 || stdout.length < 2 || stdout.at(-1) !== 0x0a || stdout.subarray(0, -1).includes(0x0a) || stdout.includes(0x00) || stdout.includes(0x0d)) fail("BLOCKED_START_EXERCISE_FRAME_INVALID", "RED");
    const observation = parseStrictJson(stdout.subarray(0, -1).toString("utf8"));
    exactObject(observation, new Set(["cwd", "discardDescriptorCanariesAbsent", "environmentKeys", "groupLeaderProbe", "pid", "schemaVersion"]), "BLOCKED_START_EXERCISE_SHAPE_INVALID");
    if (observation.schemaVersion !== "r4_gate_b_blocked_start_target.v1") fail("BLOCKED_START_EXERCISE_SCHEMA_INVALID", "RED");
    if (observation.cwd !== root) fail("BLOCKED_START_EXERCISE_CWD_INVALID", "RED");
    const targetEnvironmentKeys = observation.environmentKeys.filter((key) => key !== "__CF_USER_TEXT_ENCODING");
    if (canonicalJson(targetEnvironmentKeys) !== canonicalJson(["FORME_R4_BLOCKED_FAKE"]) || observation.environmentKeys.some((key) => key.startsWith("FORME_R4_BLOCKED_") && key !== "FORME_R4_BLOCKED_FAKE")) fail("BLOCKED_START_EXERCISE_ENVIRONMENT_INVALID", "RED");
    if (observation.discardDescriptorCanariesAbsent !== true) fail("BLOCKED_START_EXERCISE_EXTRA_FD_INVALID", "RED");
    if (observation.groupLeaderProbe !== true) fail("BLOCKED_START_EXERCISE_PROCESS_GROUP_INVALID", "RED");
    if (observation.pid !== result.processGroupId) fail("BLOCKED_START_EXERCISE_PID_INVALID", "RED");
    if (result.processGroupAbsent !== true) fail("BLOCKED_START_EXERCISE_ABSENCE_INVALID", "RED");
    const records = journal.records().slice(initialRecordCount);
    const started = records.find((record) => record.event === "started:blocked-start-fake");
    const terminal = records.find((record) => record.event === "terminal:blocked-start-fake");
    if (!started || !terminal || started.processGroupId !== observation.pid || terminal.processGroupId !== observation.pid || started.sequence >= terminal.sequence || terminal.cleanupState !== "observed-absent") fail("BLOCKED_START_EXERCISE_JOURNAL_INVALID", "RED");
    const slotRoot = path.join(root, "blocked-supervisor-pids");
    if (fs.readdirSync(slotRoot).length !== 0) fail("BLOCKED_START_EXERCISE_SLOT_RESIDUE", "RED_QUARANTINED");
    const preparationFaultMatrix = await exerciseBlockedStartPreparationFaultMatrix({ root, journal });
    return Object.freeze({ status: "GREEN", fakeProcessStarts: 1 + preparationFaultMatrix.logicalStartsObserved, samePidExecReplaceProven: true, startedJournalBeforeTargetOutputProven: true, supervisorDiscardCanariesNotInherited: true, residentCarrierProcesses: 0, processGroupsAbsent: true, preparationFaultMatrix });
  } finally {
    stdout.fill(0); stderr.fill(0);
    for (const descriptor of discardCanaryDescriptors) try { fs.closeSync(descriptor); } catch {}
    if (ownsLifecycle) {
      try { journal.close(); } catch {}
      journal.zeroize();
      try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 0 }); } catch {}
      if (fs.existsSync(root)) fail("BLOCKED_START_EXERCISE_ROOT_RESIDUE", "RED_QUARANTINED");
    }
  }
}
export async function exerciseMacOSDirectStartProtocolForConstruction(options = {}) {
  const ownsLifecycle = options.root === undefined && options.journal === undefined;
  if (!ownsLifecycle && (options.root !== CONSTRUCTION_ROOT || options.journal === null || typeof options.journal?.append !== "function" || typeof options.journal?.records !== "function")) fail("MACOS_DIRECT_EXERCISE_EXTERNAL_AUTHORITY_INVALID", "RED");
  const root = ownsLifecycle ? `/private/tmp/forme-r4-macos-direct-start-${crypto.randomBytes(16).toString("hex")}` : options.root;
  const journal = ownsLifecycle ? createRetryJournal(root, `sha256:${"1".repeat(64)}`, "1".repeat(32), path.basename(root)) : options.journal;
  const initialRecordCount = journal.records().length;
  const helperSource = [
    'import crypto from "node:crypto";',
    'import fs from "node:fs";',
    'const writeAll=(fd,bytes)=>{let offset=0;while(offset<bytes.length){const count=fs.writeSync(fd,bytes,offset,bytes.length-offset);if(count<=0)process.exit(64);offset+=count;}};',
    'const expected=Buffer.from("R4_GATE_B_DIRECT_RELEASE_V1 helper\\n","utf8");',
    'const ready=Buffer.from(`R4_GATE_B_DIRECT_READY_V1 helper ${process.pid}\\n`,"utf8");',
    'writeAll(3,ready);fs.closeSync(3);ready.fill(0);',
    'const release=Buffer.alloc(expected.length);let offset=0;while(offset<release.length){const count=fs.readSync(4,release,offset,release.length-offset,null);if(count<=0)process.exit(64);offset+=count;}const sentinel=Buffer.alloc(1);const trailing=fs.readSync(4,sentinel,0,1,null);fs.closeSync(4);const releaseValid=trailing===0&&crypto.timingSafeEqual(release,expected);release.fill(0);expected.fill(0);sentinel.fill(0);if(!releaseValid)process.exit(64);',
    'const chunks=[];process.stdin.on("data",chunk=>chunks.push(Buffer.from(chunk)));process.stdin.on("end",()=>{const body=Buffer.concat(chunks);for(const chunk of chunks)chunk.fill(0);const valid=body.length===1390&&`sha256:${crypto.createHash("sha256").update(body).digest("hex")}`==="sha256:0576ca281013f55670897488801dcfef98fb00db08a303fcbd8a028f97f2c001";body.fill(0);const receipt={aggregateVerdict:"YELLOW",bodyBearingHandoffOutsideHelper:0,candidateBodyFilesCreated:0,candidateBodyStderrBytes:0,candidateBodyStdoutBytes:0,cleanupPassed:true,controlledZeroizationPassed:true,crashZeroizationClaimed:false,fullPersistentLaneStatusChanged:false,handoffCount:valid?1:0,networkCalls:0,persistentCandidateRecoverySupported:false,presenceCeremonies:valid?1:0,providerCalls:0,reasonCode:valid?"approve_exact":"controlled_failure",schemaVersion:"r4.gate-b-core.macos-helper-receipt.v2",terminal:valid?"approve_exact":"controlled_failure"};process.stdout.write(JSON.stringify(receipt)+"\\n");process.exitCode=valid?0:70;});',
  ].join("\n");
  const helperStep = Object.freeze({
    kind: "helper-spawn", executable: process.execPath, argv: Object.freeze(["--input-type=module", "--eval", helperSource]), cwd: root, environment: Object.freeze({ FORME_R4_MACOS_DIRECT_FAKE: "helper" }), shell: false,
    startProtocol: MACOS_DIRECT_START_PROTOCOL.helper.implementation, targetStdioCount: MACOS_DIRECT_START_PROTOCOL.helper.targetStdioCount, descriptorMap: MACOS_DIRECT_START_PROTOCOL.helper.descriptorMap,
    readyFrameMaximumBytes: MACOS_DIRECT_START_PROTOCOL.helper.readyFrameMaximumBytes, releaseFrame: MACOS_DIRECT_START_PROTOCOL.helper.releaseFrame, releaseRequiresEOF: true,
  });
  const feederStep = Object.freeze({
    kind: "feeder-spawn", executable: process.execPath, argv: Object.freeze([path.join(REPOSITORY_ROOT, "fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs"), "3", "4", "5", "6", "complete"]), cwd: root, environment: Object.freeze({ FORME_R4_MACOS_DIRECT_FAKE: "feeder" }), shell: false,
    startProtocol: MACOS_DIRECT_START_PROTOCOL.feeder.implementation, targetStdioCount: MACOS_DIRECT_START_PROTOCOL.feeder.targetStdioCount, descriptorMap: MACOS_DIRECT_START_PROTOCOL.feeder.descriptorMap,
    readyFrameMaximumBytes: MACOS_DIRECT_START_PROTOCOL.feeder.readyFrameMaximumBytes, releaseFrame: MACOS_DIRECT_START_PROTOCOL.feeder.releaseFrame, releaseRequiresEOF: true,
  });
  const state = { helper: null, helperEvidence: null, feederEvidence: null, runtimeIdentityValidated: true, networkSampleZero: true, syntheticCandidateFrameBytes: 1390, absoluteAuthorityDeadlineMilliseconds: Date.now() + 60_000 };
  try {
    await spawnMacOSHelper(helperStep, state, journal);
    if (state.helper?.released !== false) fail("MACOS_DIRECT_EXERCISE_HELPER_RELEASE_ORDER_INVALID", "RED");
    await spawnMacOSFeeder(feederStep, state, journal);
    if (state.helper.released !== true || state.feederEvidence?.eofReleaseAllowed !== true || state.feederEvidence.candidateBytesWritten !== 1390) fail("MACOS_DIRECT_EXERCISE_FEEDER_INVALID", "RED");
    await new Promise((resolve) => state.helper.child.stdin.end(resolve));
    await finishMacOSHelper(state, journal);
    if (state.helperEvidence?.helperReceiptValidated !== true || state.helperEvidence.terminal !== "approve_exact" || state.helperEvidence.handoffCount !== 1) fail("MACOS_DIRECT_EXERCISE_HELPER_INVALID", "RED");
    const processEvents = journal.records().slice(initialRecordCount).filter((record) => record.lane === "macos").map((record) => record.event);
    const expectedEvents = ["intent:helper-spawn", "started:helper-spawn", "intent:feeder-spawn", "started:feeder-spawn", "terminal:feeder-spawn", "terminal:helper-spawn"];
    if (canonicalJson(processEvents) !== canonicalJson(expectedEvents)) fail("MACOS_DIRECT_EXERCISE_JOURNAL_ORDER_INVALID", "RED");
    return Object.freeze({ status: "GREEN", fakeProcessStarts: 2, helperDirectPidReadyValidated: true, feederDirectPidReadyValidated: true, startedJournalBeforeBothReleases: true, candidateBytesWritten: 1390, handoffCount: 1, processGroupsAbsent: true, realHelperStarts: 0, providerCalls: 0 });
  } finally {
    if (state.helper) {
      destroyMacOSChildStreams(state.helper.child);
      if (groupExists(state.helper.pid) !== false) await stopAndProveGroupAbsent(state.helper.pid);
    }
    if (ownsLifecycle) {
      try { journal.close(); } catch {}
      journal.zeroize();
      try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 0 }); } catch {}
      if (fs.existsSync(root)) fail("MACOS_DIRECT_EXERCISE_ROOT_RESIDUE", "RED_QUARANTINED");
    }
  }
}
function prepareCodexStaging(capsule, codexRunRoot, runtimeSnapshot) {
  mkdirOwned0700(codexRunRoot);
  const layout = coreCodexLayout(codexRunRoot);
  for (const directory of [path.dirname(layout.stagedCodex), path.dirname(layout.stagedProfile), layout.schemaRoot, layout.neutralCwd, layout.home, layout.codexHome, layout.tmpdir, path.dirname(layout.evidencePath)]) mkdirOwned0700(directory);
  const nativeSource = capsuleBoundFile(capsule, "codex-native");
  const launcherSource = capsuleBoundFile(capsule, "codex-launcher");
  const profileSource = capsuleBoundFile(capsule, "codex-seatbelt-profile");
  if (nativeSource.sha256 !== CORE_CODEX_NATIVE_SHA256 || launcherSource.sha256 !== CORE_CODEX_LAUNCHER_SHA256 || profileSource.sha256 !== IMMUTABLE_HASHES["schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb"]) fail("CODEX_CAPSULE_SOURCE_HASH_DRIFT", "RED");
  const stagedNative = copyOpenedRegularFile({ source: nativeSource.path, destination: layout.stagedCodex, expectedSha256: CORE_CODEX_NATIVE_SHA256, destinationMode: 0o500 });
  const snapshotProfile = path.join(runtimeSnapshot.root, "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb");
  const stagedProfile = copyOpenedRegularFile({ source: snapshotProfile, destination: layout.stagedProfile, expectedSha256: profileSource.sha256, destinationMode: 0o600 });
  return Object.freeze({
    layout,
    publicHashes: Object.freeze({ profileSourceSha256: profileSource.sha256, profileStagedSha256: stagedProfile.sha256, launcherSourceSha256: launcherSource.sha256, nativeSourceSha256: nativeSource.sha256, nativeStagedSha256: stagedNative.sha256 }),
  });
}

export function stageRuntimeDependencies(capsule, retryRoot) {
  const runtimeRoot = path.join(retryRoot, "runtime-snapshot");
  mkdirOwned0700(runtimeRoot);
  const expected = runtimeDependencyInventory();
  const staged = [];
  const expectedStaged = [];
  for (const entry of expected.files) {
    const source = capsuleBoundFile(capsule, runtimeDependencyLogicalName(entry.path));
    if (source.sha256 !== entry.sha256 || !Number.isSafeInteger(source.size) || source.size < 0) fail(`RUNTIME_SNAPSHOT_CAPSULE_DRIFT:${entry.path}`, "RED");
    const destination = path.join(runtimeRoot, entry.path);
    mkdirOwned0700(path.dirname(destination));
    const observed = copyOpenedRegularFile({ source: source.path, destination, expectedSha256: entry.sha256, destinationMode: 0o600 });
    if (observed.bytes !== source.size) fail(`RUNTIME_SNAPSHOT_SIZE_DRIFT:${entry.path}`, "RED");
    staged.push(Object.freeze({ path: entry.path, sha256: observed.sha256, size: observed.bytes }));
    expectedStaged.push(Object.freeze({ path: entry.path, sha256: entry.sha256, size: source.size }));
  }
  const aggregateSha256 = sha256(Buffer.from(staged.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.size}\n`).join(""), "utf8"));
  const expectedAggregate = sha256(Buffer.from(expectedStaged.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.size}\n`).join(""), "utf8"));
  if (aggregateSha256 !== expectedAggregate || expected.aggregateSha256 !== capsule.runtimeDependencyAggregateSha256) fail("RUNTIME_SNAPSHOT_AGGREGATE_DRIFT", "RED");
  const expectedByPath = new Map(staged.map((entry) => [entry.path, entry]));
  const readPinnedBytes = (relativePath) => {
    const expectedEntry = expectedByPath.get(relativePath);
    if (expectedEntry === undefined || typeof relativePath !== "string" || path.isAbsolute(relativePath) || relativePath.split(path.sep).includes("..")) fail(`RUNTIME_SNAPSHOT_PATH_DENIED:${relativePath}`, "RED");
    const target = path.join(runtimeRoot, relativePath);
    const chain = snapshotNoSymlinkPathChain(target, "RUNTIME_SNAPSHOT_PATH_UNSAFE");
    const beforePath = fs.lstatSync(target);
    if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.uid !== process.getuid() || beforePath.nlink !== 1 || (beforePath.mode & 0o777) !== 0o600 || beforePath.size !== expectedEntry.size) fail("RUNTIME_SNAPSHOT_FILE_UNSAFE", "RED");
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const bytes = Buffer.allocUnsafe(beforePath.size);
    try {
      let offset = 0;
      while (offset < bytes.length) {
        const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
        if (count <= 0) fail("RUNTIME_SNAPSHOT_SHORT_READ", "RED");
        offset += count;
      }
      const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(target);
      assertNoSymlinkPathChainStable(chain, "RUNTIME_SNAPSHOT_PATH_DRIFT");
      if (afterFd.dev !== beforePath.dev || afterFd.ino !== beforePath.ino || afterFd.size !== beforePath.size || Math.trunc(afterFd.mtimeMs) !== Math.trunc(beforePath.mtimeMs) || afterPath.dev !== beforePath.dev || afterPath.ino !== beforePath.ino || afterPath.nlink !== 1 || sha256(bytes) !== expectedEntry.sha256) fail("RUNTIME_SNAPSHOT_BYTE_DRIFT", "RED");
      return bytes;
    } catch (error) { bytes.fill(0); throw error; }
    finally { fs.closeSync(fd); }
  };
  const assertStable = () => {
    for (const entry of staged) { const bytes = readPinnedBytes(entry.path); bytes.fill(0); }
    return true;
  };
  return Object.freeze({
    root: fs.realpathSync(runtimeRoot),
    fileCount: staged.length,
    aggregateSha256,
    readText(relativePath) {
      const bytes = readPinnedBytes(relativePath);
      try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } finally { bytes.fill(0); }
    },
    readBytes(relativePath) { return readPinnedBytes(relativePath); },
    assertStable,
  });
}

function journalHasExactProcessObservation(journal, expected) {
  if (typeof journal?.records !== "function") return false;
  const records = journal.records();
  return Array.isArray(records) && records.some((record) => record.lane === expected.lane
    && record.event === expected.event
    && record.commandShapeSha256 === expected.commandShapeSha256
    && record.processGroupId === expected.processGroupId
    && canonicalJson(record.ownedResources) === canonicalJson(expected.ownedResources)
    && record.terminalCode === expected.terminalCode
    && record.cleanupState === expected.cleanupState);
}

function createCodexProcessOrchestratorCore({ mode, layout, journal, spawnChild, stopProcessGroup = stopAndProveGroupAbsent, timing = Object.freeze({ setTimeout, clearTimeout, now: () => Date.now() }) }) {
  if (!["construction_fake", "production_physical"].includes(mode) || !journal || typeof journal.append !== "function" || typeof spawnChild !== "function" || typeof stopProcessGroup !== "function" || !timing || typeof timing.setTimeout !== "function" || typeof timing.clearTimeout !== "function" || typeof timing.now !== "function") fail("CODEX_PROCESS_ORCHESTRATOR_BINDING_INVALID", "RED");
  const groups = new Map();
  return Object.freeze({
    mode,
    async run(command, wireGuard) {
      validateCoreCodexLogicalCommand(layout, command);
      if (command.kind === "initialize" ? !wireGuard : wireGuard !== undefined) fail("CODEX_WIRE_GUARD_BINDING_INVALID", "RED");
      const commandShapeSha256 = sha256(Buffer.from(canonicalJson(command), "utf8"));
      const intentRecord = await journal.append({ lane: "codex", event: `intent:${command.kind}`, commandShapeSha256, ownedResources: ["codex-process-group", "codex-stdio"], cleanupState: "required" });
      const child = await spawnChild(command, Object.freeze({ startSequence: intentRecord.sequence, commandShapeSha256 }));
      if (!child || !child.stdin || !child.stdout || !child.stderr || typeof child.once !== "function") fail("CODEX_PROCESS_EXECUTOR_RESULT_INVALID", "RED");
      if (!Number.isSafeInteger(child.pid) || child.pid <= 1) fail("CODEX_PHYSICAL_PID_MISSING", "RED");
      const pid = child.pid;
      groups.set(pid, Object.freeze({ child, kind: command.kind, commandShapeSha256 }));
      try {
        await journal.append({ lane: "codex", event: `started:${command.kind}`, commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], cleanupState: "required" });
      } catch (error) {
        const absent = typeof child.abortBeforeRelease === "function" ? await child.abortBeforeRelease() : await stopProcessGroup(pid);
        if (!absent) fail("CODEX_UNJOURNALED_GROUP_QUARANTINED", "RED_QUARANTINED");
        const recovery = { lane: "codex", event: `cleanup-observed-absent:${command.kind}`, commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], terminalCode: "ABSENT", cleanupState: "observed-absent" };
        try { await journal.append(recovery); }
        catch (recoveryError) {
          if (journalHasExactProcessObservation(journal, recovery)) {
            if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
            groups.delete(pid);
          }
          throw recoveryError;
        }
        if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
        groups.delete(pid);
        throw error;
      }
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let receive = Buffer.alloc(0);
      const lines = [];
      let clientWrites = 0;
      let initializedWritten = false;
      let initializedAt = null;
      let exitGraceTimer = null;
      let resolveExitGrace;
      const exitGracePromise = new Promise((resolve) => { resolveExitGrace = resolve; });
      let protocolError = null;
      let stdinError = null;
      let overflow = false;
      let stdioClosedForStop = false;
      const closeOwnedStdioForStop = () => {
        if (stdioClosedForStop) return;
        stdioClosedForStop = true;
        for (const stream of [child.stdin, child.stdout, child.stderr]) try { stream.destroy(); } catch { /* exact process cleanup remains authoritative */ }
      };
      let stopResolve;
      const stopPromise = new Promise((resolve) => { stopResolve = resolve; });
      const requestStop = () => stopResolve();
      const observeOwnedZeroization = () => {
        const buffers = [stdout, stderr, receive, ...lines];
        let nonzeroBytes = 0;
        for (const buffer of buffers) for (const byte of buffer) nonzeroBytes += Number(byte !== 0);
        if (typeof child.observeOrchestratorZeroization === "function") child.observeOrchestratorZeroization(Object.freeze({ bufferCount: buffers.length, nonzeroBytes }));
      };
      const clearOwned = () => { stdout.fill(0); stderr.fill(0); receive.fill(0); for (const line of lines) line.fill(0); observeOwnedZeroization(); };
      try {
      child.stdin.on("error", (error) => { stdinError = error; protocolError ??= error; closeOwnedStdioForStop(); requestStop(); });
      child.stdout.on("data", (chunk) => {
        const ownedChunk = Buffer.from(chunk);
        try {
        stdout = appendBounded(stdout, ownedChunk, command.stdoutLimitBytes);
        if (stdout.length > command.stdoutLimitBytes) { overflow = true; closeOwnedStdioForStop(); requestStop(); return; }
        if (command.kind !== "initialize" || protocolError !== null) return;
        if (initializedWritten && ownedChunk.length > 0) { protocolError = new Error("CODEX_WIRE_BYTES_AFTER_SECOND_WRITE"); requestStop(); return; }
        receive = appendBounded(receive, ownedChunk, 1_048_576);
        if (receive.length > 1_048_576) { protocolError = new Error("CODEX_WIRE_LINE_TOO_LARGE"); requestStop(); return; }
        let responseCandidate = false;
        let newline;
        while ((newline = receive.indexOf(0x0a)) >= 0) {
          const prior = receive;
          const line = Buffer.from(prior.subarray(0, newline));
          receive = Buffer.from(prior.subarray(newline + 1));
          prior.fill(0);
          lines.push(line);
          try {
            if (wireGuard.acceptLine(line)) {
              if (initializedWritten || responseCandidate) throw new Error("CODEX_INITIALIZED_DUPLICATE_WRITE");
              responseCandidate = true;
            }
          } catch (error) { protocolError = error; requestStop(); break; }
        }
        if (protocolError === null && responseCandidate && receive.length !== 0) { protocolError = new Error("CODEX_WIRE_PARTIAL_AFTER_RESPONSE"); requestStop(); }
        if (protocolError === null && responseCandidate && receive.length === 0) {
          try {
            const initializedFrame = guardClientMessage(initializedMessage());
            if (typeof child.observeInitializedFramePrepared === "function") child.observeInitializedFramePrepared();
            clientWrites += 1;
            initializedWritten = true;
            initializedAt = timing.now();
            child.stdin.end(initializedFrame);
            const elapsedSinceEndCall = Math.max(0, timing.now() - initializedAt);
            exitGraceTimer = timing.setTimeout(() => resolveExitGrace({ kind: "exit-grace" }), Math.max(0, 2_000 - elapsedSinceEndCall));
          } catch (error) { protocolError = error; requestStop(); }
        }
        } finally { ownedChunk.fill(0); }
      });
      child.stderr.on("data", (chunk) => { const ownedChunk = Buffer.from(chunk); try { stderr = appendBounded(stderr, ownedChunk, 1_048_576); if (stderr.length > 1_048_576) { overflow = true; closeOwnedStdioForStop(); requestStop(); } } finally { ownedChunk.fill(0); } });
      const closePromise = new Promise((resolve) => {
        let settled = false;
        child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
        child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
      });
      if (typeof child.release === "function") await child.release();
      else if (mode === "production_physical") fail("CODEX_BLOCKED_RELEASE_PORT_MISSING", "RED");
      if (command.kind === "initialize") {
        child.stdin.write(guardClientMessage(initializeMessage()));
        clientWrites += 1;
      } else child.stdin.end();
      let deadlineTimer;
      const deadlinePromise = new Promise((resolve) => { deadlineTimer = timing.setTimeout(() => resolve({ kind: "deadline" }), command.deadlineMilliseconds); });
      const first = await Promise.race([closePromise.then((value) => ({ kind: "close", value })), stopPromise.then(() => ({ kind: "stop" })), deadlinePromise, exitGracePromise]);
      timing.clearTimeout(deadlineTimer);
      if (exitGraceTimer !== null) timing.clearTimeout(exitGraceTimer);
      let timedOut = first.kind === "deadline" || first.kind === "exit-grace";
      let terminal = first.kind === "close" ? first.value : null;
      if (terminal === null) {
        closeOwnedStdioForStop();
        if (typeof child.signalGroup === "function") child.signalGroup("SIGTERM"); else signalGroup(pid, "SIGTERM");
        terminal = await Promise.race([closePromise, new Promise((resolve) => timing.setTimeout(() => resolve(null), 2_000))]);
        if (terminal === null) {
          if (typeof child.signalGroup === "function") child.signalGroup("SIGKILL"); else signalGroup(pid, "SIGKILL");
          terminal = await Promise.race([closePromise, new Promise((resolve) => timing.setTimeout(() => resolve(null), 2_000))]);
        }
      }
      const exitLatency = command.kind === "initialize" && initializedAt !== null ? timing.now() - initializedAt : 0;
      closeOwnedStdioForStop();
      const absent = typeof child.stopAndProveAbsent === "function" ? await child.stopAndProveAbsent() : await stopProcessGroup(pid);
      const terminalObservation = { lane: "codex", event: `terminal:${command.kind}`, commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" };
      try { await journal.append(terminalObservation); }
      catch (terminalError) {
        if (absent && journalHasExactProcessObservation(journal, terminalObservation)) {
          if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
          groups.delete(pid);
        }
        throw terminalError;
      }
      if (absent) {
        if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
        groups.delete(pid);
      }
      if (protocolError !== null) { clearOwned(); throw protocolError; }
      if (terminal?.error || stdinError !== null) { clearOwned(); throw terminal?.error ?? stdinError; }
      const trailingBytes = command.kind === "initialize" ? receive.length : 0;
      receive.fill(0);
      return Object.freeze({ stdout, stderr, exitCode: overflow || terminal === null ? -1 : terminal.code, timedOut, processGroupStarted: true, processGroupReaped: terminal !== null, processGroupAbsent: absent, syntheticDescendantsStarted: 0, clientWrites, trailingBytes, handshakeExitLatencyMilliseconds: exitLatency, lines, observeOwnedBufferZeroization: observeOwnedZeroization });
      } catch (error) {
        clearOwned();
        if (error !== null && typeof error === "object") try { error.ownedBufferZeroizationPassed = true; } catch { /* the buffers are still cleared even when the terminal error is immutable */ }
        throw error;
      }
    },
    async cleanup() {
      let clean = true;
      for (const [pid, authority] of [...groups]) {
        const absent = typeof authority.child.stopAndProveAbsent === "function" ? await authority.child.stopAndProveAbsent() : await stopProcessGroup(pid);
        if (!absent) { clean = false; continue; }
        const recovery = { lane: "codex", event: `cleanup-observed-absent:${authority.kind}`, commandShapeSha256: authority.commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], terminalCode: "ABSENT", cleanupState: "observed-absent" };
        try { await journal.append(recovery); }
        catch (error) {
          if (journalHasExactProcessObservation(journal, recovery)) {
            if (typeof authority.child.finalizeSlotAfterTerminal === "function") authority.child.finalizeSlotAfterTerminal();
            groups.delete(pid);
          }
          throw error;
        }
        if (typeof authority.child.finalizeSlotAfterTerminal === "function") authority.child.finalizeSlotAfterTerminal();
        groups.delete(pid);
      }
      return clean;
    },
  });
}

export function createConstructionCodexProcessOrchestrator({ layout, journal, spawnChild, stopProcessGroup = stopAndProveGroupAbsent, timing = undefined }) {
  const relative = path.relative(REPOSITORY_ROOT, layout.runRoot);
  const insideRepository = relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
  if (insideRepository) {
    const matrixRoot = path.join(CONSTRUCTION_ROOT, "codex-shared-matrix");
    const withinMatrix = path.relative(matrixRoot, layout.runRoot);
    if (withinMatrix === "" || path.isAbsolute(withinMatrix) || withinMatrix === ".." || withinMatrix.startsWith(`..${path.sep}`)) fail("CODEX_CONSTRUCTION_LAYOUT_REPO_OVERLAP", "RED");
    const chain = snapshotNoSymlinkPathChain(layout.runRoot, "CODEX_CONSTRUCTION_LAYOUT_PATH_UNSAFE");
    const stat = fs.lstatSync(layout.runRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700 || fs.realpathSync(layout.runRoot) !== layout.runRoot) fail("CODEX_CONSTRUCTION_LAYOUT_UNSAFE", "RED");
    assertNoSymlinkPathChainStable(chain, "CODEX_CONSTRUCTION_LAYOUT_PATH_DRIFT");
  }
  return createCodexProcessOrchestratorCore({ mode: "construction_fake", layout, journal, spawnChild, stopProcessGroup, ...(timing === undefined ? {} : { timing }) });
}

function createProductionCodexSpawnPort({ layout, journal, processPort }) {
  return createCodexProcessOrchestratorCore({
    mode: "production_physical",
    layout,
    journal,
    async spawnChild(command, authority) {
      return await processPort.start({ family: "codex", logicalId: command.kind, startSequence: authority.startSequence, commandShapeSha256: authority.commandShapeSha256, executable: command.argv[0], argv: command.argv.slice(1), cwd: command.cwd, environment: command.environment, stdio: ["pipe", "pipe", "pipe"], targetStdioCount: 3 });
    },
  });
}

async function executeCodexLane({ capsule, retryRoot, runtimeSnapshot, journal, processPort }) {
  const staged = prepareCodexStaging(capsule, path.join(retryRoot, "codex"), runtimeSnapshot);
  const plan = buildCodexPhysicalPlan(staged.layout.runRoot);
  if (plan.commands.length !== 4 || plan.schemaFileCount !== CORE_CODEX_SCHEMA_COUNT || plan.schemaAggregateSha256 !== CORE_CODEX_SCHEMA_SHA256) fail("CODEX_PHYSICAL_PLAN_DRIFT", "RED");
  const port = createProductionCodexSpawnPort({ layout: staged.layout, journal, processPort });
  const evidence = await runCoreCodexZeroCall({ layout: staged.layout, spawnPort: port, expectedSchema: { fileCount: CORE_CODEX_SCHEMA_COUNT, aggregateSha256: CORE_CODEX_SCHEMA_SHA256, selected: CORE_CODEX_SELECTED_SCHEMAS }, publicHashes: staged.publicHashes });
  if (evidence.status !== "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN" || evidence.causalFinality !== "UNPROVEN_ACCEPTED" || evidence.postResponseFinalityProven !== false || evidence.providerCalls !== 0 || evidence.threadStarts !== 0 || evidence.turnStarts !== 0) fail("CODEX_PHYSICAL_EVIDENCE_INVALID", "RED");
  return evidence;
}

async function spawnInteractivePsql(step, actor, journal, processPort) {
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment, actor }), "utf8"));
  const intentRecord = await journal.append({ lane: "postgres", event: `intent:race-${actor}`, commandShapeSha256, ownedResources: ["postgres-race-process-group"], cleanupState: "required" });
  if (!processPort || typeof processPort.start !== "function") fail("POSTGRES_BLOCKED_PROCESS_PORT_REQUIRED", "RED");
  const child = await processPort.start({ family: "postgres", logicalId: `race-${actor}`, startSequence: intentRecord.sequence, commandShapeSha256, executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment, stdio: ["pipe", "pipe", "pipe"], targetStdioCount: 3 });
  if (!Number.isSafeInteger(child.pid) || child.pid <= 1) fail("POSTGRES_RACE_PID_MISSING", "RED");
  const pid = child.pid;
  try {
    await journal.append({ lane: "postgres", event: `started:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], cleanupState: "required" });
  } catch (error) {
    const absent = typeof child.abortBeforeRelease === "function" ? await child.abortBeforeRelease() : false;
    if (!absent) fail("POSTGRES_RACE_UNJOURNALED_GROUP_QUARANTINED", "RED_QUARANTINED");
    await journal.append({ lane: "postgres", event: `cleanup-observed-absent:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" });
    if (typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
    throw error;
  }
  let raw = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  const pendingLines = [];
  const seenMarkers = new Set();
  let stdoutBytes = 0;
  let activeWaiter = null;
  let stdinError = null;
  let terminal = null;
  let terminalRecorded = false;
  let protocolViolation = null;
  let terminalResolve;
  const terminalPromise = new Promise((resolve) => { terminalResolve = resolve; });
  const signal = (value) => typeof child.signalGroup === "function" ? child.signalGroup(value) : false;
  let stdioClosedForStop = false;
  const closeOwnedStdioForStop = () => {
    if (stdioClosedForStop) return;
    stdioClosedForStop = true;
    for (const stream of [child.stdin, child.stdout, child.stderr]) try { stream.destroy(); } catch { /* group cleanup remains authoritative */ }
  };
  const stopForViolation = () => { closeOwnedStdioForStop(); signal("SIGTERM"); };
  const markerClass = (line) => {
    if (line === "CONTROLLER_READY") return line;
    if (/^RELEASED [AB]$/u.test(line)) return line;
    if (line === "OBSERVER_OK") return line;
    const match = /^(READY|CALL_STARTED|POST_CALL|RESULT|RESULT_BODY_HEX|COMMIT_ACK) ([AB])(?: |$)/u.exec(line);
    return match ? `${match[1]} ${match[2]}` : null;
  };
  const publish = (line) => {
    const allowed = actor === "CONTROLLER"
      ? /^(?:CONTROLLER_READY|RELEASED [AB])$/u.test(line)
      : actor === "OBSERVER"
        ? line === "OBSERVER_OK"
        : new RegExp(`^(?:READY ${actor} [0-9]+|CALL_STARTED ${actor}|POST_CALL ${actor}|RESULT ${actor} [1-5][0-9]{2} [a-z0-9_]+ [01]|RESULT_BODY_HEX ${actor} [0-9a-f]+|COMMIT_ACK ${actor})$`, "u").test(line);
    if (!allowed) { protocolViolation = line.slice(0, 128); stopForViolation(); return; }
    const marker = markerClass(line);
    if (marker === null || seenMarkers.has(marker)) { protocolViolation = "DUPLICATE_OR_UNKNOWN_MARKER"; stopForViolation(); return; }
    seenMarkers.add(marker);
    if (activeWaiter !== null) {
      const waiter = activeWaiter;
      activeWaiter = null;
      clearTimeout(waiter.timer);
      if (!waiter.predicate(line)) { protocolViolation = "OUT_OF_ORDER_MARKER"; waiter.reject(new PhysicalRunnerError("POSTGRES_RACE_MARKER_OUT_OF_ORDER", "RED")); stopForViolation(); }
      else waiter.resolve(line);
    } else {
      if (pendingLines.length >= 8) { protocolViolation = "MARKER_QUEUE_OVERFLOW"; stopForViolation(); return; }
      pendingLines.push(line);
    }
  };
  child.stdout.on("data", (chunk) => {
    const ownedChunk = Buffer.from(chunk);
    stdoutBytes += ownedChunk.length;
    if (stdoutBytes > step.stdoutLimitBytes) { ownedChunk.fill(0); protocolViolation = "STDOUT_TOTAL_OVERFLOW"; stopForViolation(); return; }
    raw = appendBounded(raw, ownedChunk, step.stdoutLimitBytes);
    ownedChunk.fill(0);
    if (raw.length > step.stdoutLimitBytes) { protocolViolation = "STDOUT_LINE_OVERFLOW"; stopForViolation(); return; }
    let newline;
    while ((newline = raw.indexOf(0x0a)) >= 0) {
      const prior = raw;
      const lineBytes = Buffer.from(prior.subarray(0, newline));
      raw = Buffer.from(prior.subarray(newline + 1));
      prior.fill(0);
      try {
        if (lineBytes.length === 0 || lineBytes.includes(0x0d) || lineBytes.includes(0x00)) { protocolViolation = "INVALID_LINE_FRAMING"; stopForViolation(); return; }
        let line;
        try { line = new TextDecoder("utf-8", { fatal: true }).decode(lineBytes); } catch { protocolViolation = "INVALID_UTF8"; stopForViolation(); return; }
        publish(line);
      } finally { lineBytes.fill(0); }
    }
  });
  child.stderr.on("data", (chunk) => { const owned = Buffer.from(chunk); try { stderr = appendBounded(stderr, owned, 1); } finally { owned.fill(0); } stopForViolation(); });
  child.stdin.on("error", (error) => { stdinError = error; stopForViolation(); });
  child.once("error", (error) => { terminal = { code: -1, signal: null, error }; terminalResolve(terminal); });
  child.once("close", (code, signal) => { if (terminal === null) { terminal = { code: code ?? -1, signal, error: null }; terminalResolve(terminal); } });
  const waitForLine = (predicate, milliseconds = 5_000) => new Promise((resolve, reject) => {
    if (protocolViolation !== null) { reject(new PhysicalRunnerError("POSTGRES_RACE_PROTOCOL_ALREADY_INVALID", "RED")); return; }
    if (activeWaiter !== null) { reject(new PhysicalRunnerError("POSTGRES_RACE_CONCURRENT_WAITER_DENIED", "RED")); return; }
    if (pendingLines.length > 0) {
      const next = pendingLines.shift();
      if (!predicate(next)) { protocolViolation = "OUT_OF_ORDER_BUFFERED_MARKER"; stopForViolation(); reject(new PhysicalRunnerError("POSTGRES_RACE_MARKER_OUT_OF_ORDER", "RED")); }
      else resolve(next);
      return;
    }
    const waiter = { predicate, resolve, reject, timer: null };
    waiter.timer = setTimeout(() => { if (activeWaiter === waiter) activeWaiter = null; reject(new PhysicalRunnerError("POSTGRES_RACE_MARKER_TIMEOUT", "RED")); }, milliseconds);
    activeWaiter = waiter;
  });
  if (typeof child.release !== "function") fail("POSTGRES_BLOCKED_RELEASE_PORT_MISSING", "RED");
  await child.release();
  return Object.freeze({
    pid,
    write(value) { if (typeof value !== "string" || stdinError !== null) fail("POSTGRES_RACE_STDIN_INVALID", "RED"); child.stdin.write(value); },
    end(value = "") { if (typeof value !== "string" || stdinError !== null) fail("POSTGRES_RACE_STDIN_INVALID", "RED"); child.stdin.end(value); },
    waitForLine,
    async closeExpected() {
      const observed = await Promise.race([terminalPromise, new Promise((resolve) => setTimeout(() => resolve(null), 5_000))]);
      closeOwnedStdioForStop();
      const absent = typeof child.stopAndProveAbsent === "function" ? await child.stopAndProveAbsent() : false;
      await journal.append({ lane: "postgres", event: `terminal:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], terminalCode: observed === null ? "NO_TERMINAL" : String(observed.code), cleanupState: absent ? "observed-absent" : "quarantined" });
      if (absent && typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
      terminalRecorded = true;
      const clean = observed !== null && observed.error === null && observed.code === 0 && observed.signal === null && stdinError === null && stderr.length === 0 && raw.length === 0 && pendingLines.length === 0 && activeWaiter === null && protocolViolation === null && absent;
      raw.fill(0); stderr.fill(0);
      if (!clean) fail("POSTGRES_RACE_PROCESS_TERMINAL_INVALID", absent ? "RED" : "RED_QUARANTINED");
      return true;
    },
    async forceCleanup() {
      if (activeWaiter !== null) { clearTimeout(activeWaiter.timer); activeWaiter.reject(new PhysicalRunnerError("POSTGRES_RACE_FORCE_CLEANUP", "RED")); activeWaiter = null; }
      closeOwnedStdioForStop();
      const absent = typeof child.stopAndProveAbsent === "function" ? await child.stopAndProveAbsent() : false;
      if (!terminalRecorded) {
        await journal.append({ lane: "postgres", event: `terminal:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
        terminalRecorded = true;
      }
      if (absent && typeof child.finalizeSlotAfterTerminal === "function") child.finalizeSlotAfterTerminal();
      raw.fill(0); stderr.fill(0); pendingLines.splice(0);
      return absent;
    },
  });
}

function raceBarrierKey(prefix) {
  const match = /pg_advisory_xact_lock\(([0-9]+)::bigint\)/u.exec(prefix);
  if (!match) fail("POSTGRES_RACE_BARRIER_KEY_MISSING", "RED");
  return match[1];
}
export async function runPostgresRaceProtocol(step, journal, openSession) {
  if (typeof openSession !== "function") fail("POSTGRES_RACE_SESSION_PORT_MISSING", "RED");
  const caseDeadline = Date.now() + (Number.isInteger(step.deadlineMilliseconds) ? step.deadlineMilliseconds : 30_000);
  const remaining = () => {
    const value = caseDeadline - Date.now();
    if (value <= 0) fail("POSTGRES_RACE_CASE_DEADLINE", "RED");
    return Math.min(5_000, value);
  };
  const wait = (session, predicate) => session.waitForLine(predicate, remaining());
  const keyA = raceBarrierKey(step.workerAPrefix);
  const keyB = raceBarrierKey(step.workerBPrefix);
  let controller;
  let workerA;
  let workerB;
  let observer;
  const participants = [];
  const first = /RELEASE_START:(A|B)/u.exec(step.controllerProtocol)?.[1];
  if (!first) fail("POSTGRES_CONTROLLER_PROTOCOL_INVALID", "RED");
  const second = first === "A" ? "B" : "A";
  try {
    controller = await openSession(step, "CONTROLLER", journal); participants.push(controller);
    workerA = await openSession(step, "A", journal); participants.push(workerA);
    workerB = await openSession(step, "B", journal); participants.push(workerB);
    observer = await openSession(step, "OBSERVER", journal); participants.push(observer);
    const byActor = { A: workerA, B: workerB };
    controller.write(`\\set ON_ERROR_STOP on\nSELECT pg_catalog.pg_advisory_lock(${keyA}::bigint) AS held_a \\gset r4_lock_a_\nSELECT pg_catalog.pg_advisory_lock(${keyB}::bigint) AS held_b \\gset r4_lock_b_\n\\echo CONTROLLER_READY\n`);
    await wait(controller, (line) => line === "CONTROLLER_READY");
    workerA.write(step.workerAPrefix);
    workerB.write(step.workerBPrefix);
    const readyA = await wait(workerA, (line) => /^READY A [0-9]+$/u.test(line));
    const readyB = await wait(workerB, (line) => /^READY B [0-9]+$/u.test(line));
    const pidA = Number(readyA.split(" ")[2]);
    const pidB = Number(readyB.split(" ")[2]);
    if (!Number.isSafeInteger(pidA) || !Number.isSafeInteger(pidB) || pidA === pidB) fail("POSTGRES_BACKEND_PID_INVALID", "RED");
    const firstKey = first === "A" ? keyA : keyB;
    const secondKey = second === "A" ? keyA : keyB;
    controller.write(`SELECT pg_catalog.pg_advisory_unlock(${firstKey}::bigint) AS released \\gset r4_release_first_\n\\if :r4_release_first_released\n\\echo RELEASED ${first}\n\\else\n\\quit 3\n\\endif\n`);
    await wait(controller, (line) => line === `RELEASED ${first}`);
    await wait(byActor[first], (line) => line === `CALL_STARTED ${first}`);
    await wait(byActor[first], (line) => line === `POST_CALL ${first}`);
    const firstResult = await wait(byActor[first], (line) => line.startsWith(`RESULT ${first} `));
    controller.write(`SELECT pg_catalog.pg_advisory_unlock(${secondKey}::bigint) AS released \\gset r4_release_second_\n\\if :r4_release_second_released\n\\echo RELEASED ${second}\n\\else\n\\quit 3\n\\endif\n`);
    await wait(controller, (line) => line === `RELEASED ${second}`);
    await wait(byActor[second], (line) => line === `CALL_STARTED ${second}`);
    const firstBackendPid = first === "A" ? pidA : pidB;
    const secondBackendPid = second === "A" ? pidA : pidB;
    const observerSql = step.observerStdin.replaceAll(":second_pid", String(secondBackendPid)).replaceAll(":first_pid", String(firstBackendPid));
    if (observerSql.includes(":second_pid") || observerSql.includes(":first_pid")) fail("POSTGRES_OBSERVER_SUBSTITUTION_INVALID", "RED");
    observer.end(`\\set ON_ERROR_STOP on\n${observerSql.slice(0, -1)} \\gset r4_observer_\n\\echo :r4_observer_body_free_marker\n`);
    await wait(observer, (line) => line === "OBSERVER_OK");
    await observer.closeExpected();
    const firstBodyLine = step.orderId.startsWith("C16-")
      ? await wait(byActor[first], (line) => line.startsWith(`RESULT_BODY_HEX ${first} `))
      : null;
    byActor[first].end(`\\set r4_commit_gate 'COMMIT ${first}'\n${first === "A" ? step.workerASuffix : step.workerBSuffix}`);
    await wait(byActor[first], (line) => line === `COMMIT_ACK ${first}`);
    await byActor[first].closeExpected();
    await wait(byActor[second], (line) => line === `POST_CALL ${second}`);
    const secondResult = await wait(byActor[second], (line) => line.startsWith(`RESULT ${second} `));
    if (step.orderId.startsWith("C16-")) {
      const secondBodyLine = await wait(byActor[second], (line) => line.startsWith(`RESULT_BODY_HEX ${second} `));
      const firstBody = Buffer.from(firstBodyLine.split(" ")[2], "hex");
      const secondBody = Buffer.from(secondBodyLine.split(" ")[2], "hex");
      try {
        if (firstBody.length < 1 || firstBody.length > 65_536 || secondBody.length !== firstBody.length || !crypto.timingSafeEqual(firstBody, secondBody)) fail("POSTGRES_C16_REPLAY_BODY_MISMATCH", "RED");
      } finally { firstBody.fill(0); secondBody.fill(0); }
    }
    byActor[second].end(`\\set r4_commit_gate 'COMMIT ${second}'\n${second === "A" ? step.workerASuffix : step.workerBSuffix}`);
    await wait(byActor[second], (line) => line === `COMMIT_ACK ${second}`);
    await byActor[second].closeExpected();
    controller.end("\\q\n");
    await controller.closeExpected();
    const parseResult = (line) => {
      const match = /^RESULT ([AB]) ([1-5][0-9]{2}) ([a-z0-9_]+) ([01])$/u.exec(line);
      if (!match) fail("POSTGRES_RACE_RESULT_TOKEN_INVALID", "RED");
      return Object.freeze({ actor: match[1], status: Number(match[2]), code: match[3], receiptPresent: match[4] === "1" });
    };
    return Object.freeze({ orderId: step.orderId, overlapProven: true, results: Object.freeze([parseResult(firstResult), parseResult(secondResult)]), c16ReplayBodyEqual: step.orderId.startsWith("C16-"), processGroupsAbsent: true, processGroupCount: 4 });
  } catch (error) {
    let cleaned = true;
    for (const participant of [...participants].reverse()) if (!await participant.forceCleanup().catch(() => false)) cleaned = false;
    if (!cleaned) fail("POSTGRES_RACE_PARTICIPANT_QUARANTINED", "RED_QUARANTINED");
    throw error;
  }
}
async function executePostgresRaceController(step, journal, processPort) {
  return await runPostgresRaceProtocol(step, journal, (raceStep, actor, raceJournal) => spawnInteractivePsql(raceStep, actor, raceJournal, processPort));
}

export async function executePostgresLane({ capsule, manifestSha256, runId, runtimeSnapshot, journal, processPort, postgresRootState }) {
  if (postgresRootState === null || typeof postgresRootState !== "object" || postgresRootState.authority !== null) fail("POSTGRES_RUN_ROOT_STATE_INVALID", "RED_QUARANTINED");
  const binding = { dockerCli: capsule.docker.cliPath, dockerUnixSocket: capsule.docker.socketPath, localImageId: capsule.docker.localImageId };
  const plan = buildPostgresPhysicalPlan(binding, manifestSha256, runId, (relativePath) => runtimeSnapshot.readText(relativePath));
  requirePathEntryAbsent(plan.runRoot, "POSTGRES_RUN_ROOT_PREEXISTS", "RED_QUARANTINED");
  const runRootShapeSha256 = sha256(Buffer.from(`postgres-run-root:${runId}\n`, "utf8"));
  await journal.append({ lane: "postgres", event: "marker:run-root-target-absent", commandShapeSha256: runRootShapeSha256, ownedResources: ["postgres-run-root"], cleanupState: "required" });
  const postgresRootAuthority = createExclusiveOwnedRoot0700(plan.runRoot, "/private/tmp", "POSTGRES_RUN_ROOT");
  postgresRootState.authority = postgresRootAuthority;
  let rootRemovalAttempted = false;
  let createdMarkerDurable = false;
  let orderedExecutions = 0;
  let readinessAttempts = 0;
  let recoveriesValidated = 0;
  let persistedVerifiers = 0;
  let newReceiptsObserved = 0;
  const observedCoreResults = [];
  const laneDeadline = Date.now() + 900_000;
  const boundedStep = (step) => {
    const remaining = laneDeadline - Date.now();
    if (remaining <= 0) fail("POSTGRES_LANE_DEADLINE", "RED");
    return Object.freeze({ ...step, deadlineMilliseconds: Math.min(step.deadlineMilliseconds, remaining) });
  };
  try {
    await journal.append({ lane: "postgres", event: "marker:run-root-created", commandShapeSha256: runRootShapeSha256, ownedResources: ["postgres-run-root"], terminalCode: "CREATED", cleanupState: "required" });
    createdMarkerDurable = true;
    for (const directory of [path.join(plan.runRoot, "home"), path.join(plan.runRoot, "docker-config"), path.join(plan.runRoot, "tmp"), path.join(plan.runRoot, "neutral-cwd")]) mkdirOwned0700(directory);
    for (const rawStep of plan.steps) {
      const step = rawStep.executable === null ? rawStep : boundedStep(rawStep);
      if (step.executable === null) {
        await journal.append({ lane: "postgres", event: `marker:${step.kind}`, commandShapeSha256: sha256(Buffer.from(step.kind, "utf8")), ownedResources: ["postgres-container", "postgres-volume", "postgres-workers"], cleanupState: "required" });
        continue;
      }
      if (step.operation === "read-committed-overlap-controller") {
        const observed = await executePostgresRaceController(step, journal, processPort);
        if (!observed.overlapProven || observed.processGroupsAbsent !== true || observed.results.length !== 2) fail("POSTGRES_RACE_OBSERVATION_INVALID", "RED");
        observedCoreResults.push(...observed.results);
        orderedExecutions += 1;
        continue;
      }
      if (step.kind === "readiness") {
        let ready = false;
        for (let attempt = 1; attempt <= step.maximumAttempts; attempt += 1) {
          readinessAttempts = attempt;
          try {
            const result = await runClosedProcess(step, { journal, lane: "postgres", processPort, acceptedExitCodes: [0, 1] });
            const stdout = result.stdout.toString("utf8");
            result.stdout.fill(0); result.stderr.fill(0);
            if (result.exitCode === 0 && /accepting connections/u.test(stdout)) { ready = true; break; }
          } catch { /* bounded retry inside the one frozen readiness step */ }
          if (attempt < step.maximumAttempts) await new Promise((resolve) => setTimeout(resolve, step.intervalMilliseconds));
        }
        if (!ready) fail("POSTGRES_READINESS_NOT_CLOSED", "RED");
        continue;
      }
      const stdin = step.stdinSource === "exact-plan-bytes" ? step.stdinText : null;
      const result = await runClosedProcess(step, { journal, lane: "postgres", processPort, stdin });
      if (step.outputParser === "exact-name-must-be-absent") {
        const resourceKind = step.kind.startsWith("container-") ? "container" : "volume";
        const resourceName = resourceKind === "container" ? plan.containerName : plan.volumeName;
        validateDockerExactNameAbsent({ resourceKind, resourceName, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      }
      if (step.kind === "image-binding-revalidate") {
        const framed = result.stdout.toString("utf8");
        if (!framed.endsWith("\n") || framed.slice(0, -1).includes("\n") || framed.includes("\r") || framed.includes("\0")) fail("POSTGRES_IMAGE_OBSERVATION_FRAME_INVALID", "RED");
        const fields = framed.slice(0, -1).split("|");
        if (fields.length !== 4) fail("POSTGRES_IMAGE_OBSERVATION_FIELD_COUNT", "RED");
        const [imageId, osName, architecture, repoDigests] = fields;
        if (imageId !== step.expectedLocalImageId || osName !== step.expectedOs || architecture !== step.expectedArchitecture || !repoDigests.split(",").includes(step.expectedRepoDigest)) fail("POSTGRES_BOUND_IMAGE_DRIFT", "RED");
      }
      if (step.sqlKey === "c09-recovery") {
        const framed = result.stdout.toString("utf8");
        const match = /^RECOVERY_RESULT (WINNER|LOSER) ([1-5][0-9]{2}) ([a-z0-9_]+) ([01])\n$/u.exec(framed);
        if (!match || match[1].toLowerCase() !== step.recoveryKind) fail("POSTGRES_RECOVERY_RESULT_UNOBSERVED", "RED");
        observedCoreResults.push(Object.freeze({ actor: `C09-${match[1]}`, status: Number(match[2]), code: match[3], receiptPresent: match[4] === "1" }));
        recoveriesValidated += 1;
      }
      if (step.kind.endsWith("-verify") && result.exitCode !== 0) fail("POSTGRES_VERIFIER_FAILED", "RED");
      if (step.sqlKey === "race-verifier") {
        const framed = result.stdout.toString("utf8");
        if (framed !== `${step.expectedBodyFreeMarker}\n`) fail("POSTGRES_VERIFIER_MARKER_INVALID", "RED");
        const match = /^VERIFIED (C\d{2}-[AB]-[AB]) ([12])\n$/u.exec(framed);
        if (!match || match[1] !== step.orderId || Number(match[2]) !== step.expectedNewReceipts) fail("POSTGRES_VERIFIER_OBSERVATION_DRIFT", "RED");
        persistedVerifiers += 1;
        newReceiptsObserved += step.expectedNewReceipts;
      }
      result.stdout.fill(0); result.stderr.fill(0);
    }
    if (orderedExecutions !== 32 || recoveriesValidated !== 4 || persistedVerifiers !== 32) fail("POSTGRES_OBSERVED_EXECUTION_COUNT_DRIFT", "RED");
    const catalog = loadRaceCatalog((relativePath) => runtimeSnapshot.readText(relativePath));
    const successful2xx = observedCoreResults.filter((result) => result.status >= 200 && result.status < 300).length;
    const controlledNon2xx = observedCoreResults.length - successful2xx;
    const receiptBearingCallResults = observedCoreResults.filter((result) => result.receiptPresent).length;
    const newReceipts = newReceiptsObserved;
    if (receiptBearingCallResults !== 39) fail("POSTGRES_RECEIPT_BEARING_CALL_COUNT_DRIFT", "RED");
    if (observedCoreResults.length !== 68 || successful2xx !== 39 || controlledNon2xx !== 29 || newReceipts !== 37) fail("POSTGRES_OBSERVED_AGGREGATE_DRIFT", "RED");
    rootRemovalAttempted = true;
    try { removeExactOwnedRootTree(postgresRootAuthority, POSTGRES_ROOT_DELETE_INVENTORY); }
    finally { postgresRootState.authority = null; }
    return Object.freeze({ status: "POSTGRES_CORE_LANE_GREEN", namedFamilies: catalog.counts.namedFamilies, executableCases: catalog.counts.executableCases, orderedExecutions, coreCalls: observedCoreResults.length, successful2xx, controlledNon2xx, newReceipts, persistedVerifiers, recoveryCallsValidated: recoveriesValidated, readinessAttempts, rollbackPassed: true, reapplyPassed: true, cleanupStatus: "GREEN" });
  } catch (error) {
    if (!rootRemovalAttempted && !createdMarkerDurable) {
      try { rootRemovalAttempted = true; removeExactOwnedRootTree(postgresRootAuthority, POSTGRES_ROOT_DELETE_INVENTORY); }
      catch { /* outer Retry terminal remains quarantined and the exact root is preserved */ }
      finally { postgresRootState.authority = null; }
    }
    throw error;
  }
}

export const RETRY_CLEANUP_ABSENCE_MARKERS = Object.freeze({
  postgres: Object.freeze({
    lane: "postgres",
    event: "marker:cleanup-effects-absent",
    commandShapeSha256: sha256(Buffer.from("retry-postgres-cleanup-absence-v1\n", "utf8")),
    ownedResources: Object.freeze(["postgres-container", "postgres-volume"]),
  }),
  macos: Object.freeze({
    lane: "macos",
    event: "marker:cleanup-effects-absent",
    commandShapeSha256: sha256(Buffer.from("retry-macos-cleanup-absence-v1\n", "utf8")),
    ownedResources: Object.freeze(["macos-external-effects", "macos-keychain-metadata"]),
  }),
});
function exactRetryCleanupAbsenceMarker(record, marker) {
  return record?.lane === marker.lane
    && record.event === marker.event
    && record.commandShapeSha256 === marker.commandShapeSha256
    && record.processGroupId === null
    && canonicalJson(record.ownedResources) === canonicalJson(marker.ownedResources)
    && record.terminalCode === "ABSENT"
    && record.cleanupState === "observed-absent";
}
function retryCleanupAbsenceMarkerObserved(records, lane) {
  const marker = RETRY_CLEANUP_ABSENCE_MARKERS[lane];
  return Array.isArray(records) && marker !== undefined && records.some((record) => exactRetryCleanupAbsenceMarker(record, marker));
}
function retryPostgresExecutionAbsenceProofObserved(records) {
  return Array.isArray(records) && records.some((record) => record?.lane === "postgres"
    && record.event === "marker:postgres-absence-proof"
    && record.commandShapeSha256 === sha256(Buffer.from("postgres-absence-proof", "utf8"))
    && record.processGroupId === null
    && canonicalJson(record.ownedResources) === canonicalJson(["postgres-container", "postgres-volume", "postgres-workers"])
    && record.terminalCode === null
    && record.cleanupState === "required");
}
async function appendRetryCleanupAbsenceMarker(journal, lane) {
  const marker = RETRY_CLEANUP_ABSENCE_MARKERS[lane];
  if (marker === undefined || typeof journal?.append !== "function") fail("RETRY_CLEANUP_ABSENCE_MARKER_WRITER_INVALID", "RED_QUARANTINED");
  await journal.append({ ...marker, terminalCode: "ABSENT", cleanupState: "observed-absent" });
}

export async function cleanupPostgresResources({ capsule, runId, journal, records, processPort, rootAuthority = null }) {
  const plan = Object.freeze({ runRoot: `/private/tmp/forme-r4-gate-b-postgres-${runId}`, containerName: `forme-r4-core-${runId}`, volumeName: `forme-r4-core-${runId}` });
  const postgresIntents = new Set(records.filter((record) => record.lane === "postgres" && typeof record.event === "string" && record.event.startsWith("intent:")).map((record) => record.event.slice("intent:".length)));
  const mayHaveContainer = postgresIntents.has("container-create");
  const mayHaveVolume = postgresIntents.has("volume-create");
  const runRootTargetAbsent = records.some((record) => record.lane === "postgres" && record.event === "marker:run-root-target-absent");
  const runRootCreated = records.some((record) => record.lane === "postgres" && record.event === "marker:run-root-created");
  const postgresExecutionAbsenceProofObserved = retryPostgresExecutionAbsenceProofObserved(records);
  const postgresCleanupAbsenceObserved = retryCleanupAbsenceMarkerObserved(records, "postgres");
  const postgresAbsenceProofObserved = postgresExecutionAbsenceProofObserved || postgresCleanupAbsenceObserved;
  if (rootAuthority !== null && rootAuthority.root !== plan.runRoot) {
    closeExactOwnedRootAuthority(rootAuthority);
    fail("POSTGRES_CLEANUP_CARRIED_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  }
  const runRootStat = lstatIfPresent(plan.runRoot, "POSTGRES_CLEANUP_ROOT_UNREADABLE");
  if (!runRootCreated) {
    if (rootAuthority !== null) closeExactOwnedRootAuthority(rootAuthority);
    if (runRootStat !== null) fail(runRootTargetAbsent ? "POSTGRES_CLEANUP_UNCOMMITTED_ROOT_PRESENT" : "POSTGRES_CLEANUP_ROOT_WITHOUT_AUTHORITY", "RED_QUARANTINED");
    if (!postgresAbsenceProofObserved) await appendRetryCleanupAbsenceMarker(journal, "postgres");
    return true;
  }
  if (runRootStat === null) {
    if (rootAuthority !== null) closeExactOwnedRootAuthority(rootAuthority);
    if (postgresAbsenceProofObserved) return true;
    fail("POSTGRES_CLEANUP_ROOT_MISSING_WITH_EFFECT_AUTHORITY", "RED_QUARANTINED");
  }
  const postgresRootAuthority = rootAuthority ?? openExactOwnedRootAuthority({ root: plan.runRoot, anchor: "/private/tmp", codePrefix: "POSTGRES_CLEANUP_ROOT" });
  let rootRemovalAttempted = false;
  try {
  assertExactOwnedRootAuthorityCurrent(postgresRootAuthority, "POSTGRES_CLEANUP_ROOT");
  if (postgresAbsenceProofObserved || (!mayHaveContainer && !mayHaveVolume)) {
    if (!postgresAbsenceProofObserved) await appendRetryCleanupAbsenceMarker(journal, "postgres");
    rootRemovalAttempted = true;
    removeExactOwnedRootTree(postgresRootAuthority, POSTGRES_ROOT_DELETE_INVENTORY);
    return true;
  }
  const dockerCli = assertCleanupBoundFileCurrent(capsule, "docker-cli");
  const dockerSocket = assertCleanupDockerSocketCurrent(capsule);
  for (const directory of [path.join(plan.runRoot, "home"), path.join(plan.runRoot, "docker-config"), path.join(plan.runRoot, "tmp"), path.join(plan.runRoot, "neutral-cwd")]) mkdirOwned0700(directory);
  const base = ["--host", `unix://${dockerSocket}`];
  const environment = { HOME: path.join(plan.runRoot, "home"), DOCKER_CONFIG: path.join(plan.runRoot, "docker-config"), TMPDIR: path.join(plan.runRoot, "tmp"), PATH: "/usr/bin:/bin:/usr/sbin:/sbin" };
  const inspect = async (kind, resourceKind, resourceName, format) => {
    assertCleanupBoundFileCurrent(capsule, "docker-cli");
    assertCleanupDockerSocketCurrent(capsule);
    const command = { kind, executable: dockerCli, argv: [...base, resourceKind, "inspect", "--format", format, resourceName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 4096, expectedExitCodes: [0, 1] };
    const result = await runClosedProcess(command, { journal, lane: "cleanup", processPort, acceptedExitCodes: [0, 1] });
    try {
      if (result.exitCode === 1) { validateDockerExactNameAbsent({ resourceKind, resourceName, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }); return false; }
      if (result.stderr.length !== 0 || !result.stdout.endsWith(Buffer.from("\n")) || result.stdout.subarray(0, -1).includes(0x0a)) fail("POSTGRES_CLEANUP_LABEL_FRAME_INVALID", "RED");
      let labels;
      try { labels = JSON.parse(result.stdout.subarray(0, -1).toString("utf8")); } catch { fail("POSTGRES_CLEANUP_LABEL_JSON_INVALID", "RED"); }
      if (labels === null || typeof labels !== "object" || Array.isArray(labels) || labels["forme.run"] !== runId) fail("POSTGRES_CLEANUP_LABEL_MISMATCH", "RED");
      return true;
    } finally { result.stdout.fill(0); result.stderr.fill(0); }
  };
  if (mayHaveContainer) {
    const containerExists = await inspect("cleanup-container-inspect", "container", plan.containerName, "{{json .Config.Labels}}");
    if (containerExists) {
      assertCleanupBoundFileCurrent(capsule, "docker-cli"); assertCleanupDockerSocketCurrent(capsule);
      const remove = { kind: "cleanup-container-remove", executable: dockerCli, argv: [...base, "container", "rm", "--force", plan.containerName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0] };
      const result = await runClosedProcess(remove, { journal, lane: "cleanup", processPort });
      try { if (result.stdout.toString("utf8") !== `${plan.containerName}\n` || result.stderr.length !== 0) fail("POSTGRES_CONTAINER_REMOVE_OBSERVATION_INVALID", "RED"); } finally { result.stdout.fill(0); result.stderr.fill(0); }
      if (await inspect("cleanup-container-absence", "container", plan.containerName, "{{json .Config.Labels}}")) fail("POSTGRES_CONTAINER_STILL_PRESENT", "RED_QUARANTINED");
    }
  }
  if (mayHaveVolume) {
    const volumeExists = await inspect("cleanup-volume-inspect", "volume", plan.volumeName, "{{json .Labels}}");
    if (volumeExists) {
      assertCleanupBoundFileCurrent(capsule, "docker-cli"); assertCleanupDockerSocketCurrent(capsule);
      const remove = { kind: "cleanup-volume-remove", executable: dockerCli, argv: [...base, "volume", "rm", plan.volumeName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0] };
      const result = await runClosedProcess(remove, { journal, lane: "cleanup", processPort });
      try { if (result.stdout.toString("utf8") !== `${plan.volumeName}\n` || result.stderr.length !== 0) fail("POSTGRES_VOLUME_REMOVE_OBSERVATION_INVALID", "RED"); } finally { result.stdout.fill(0); result.stderr.fill(0); }
      if (await inspect("cleanup-volume-absence", "volume", plan.volumeName, "{{json .Labels}}")) fail("POSTGRES_VOLUME_STILL_PRESENT", "RED_QUARANTINED");
    }
  }
    await appendRetryCleanupAbsenceMarker(journal, "postgres");
    rootRemovalAttempted = true;
    removeExactOwnedRootTree(postgresRootAuthority, POSTGRES_ROOT_DELETE_INVENTORY);
    return true;
  } finally {
    if (!rootRemovalAttempted) closeExactOwnedRootAuthority(postgresRootAuthority);
  }
}

function recursiveOwnedInventory(root) {
  const canonicalRoot = fs.realpathSync(root);
  const seen = new Set();
  const lines = [];
  const records = [];
  const walk = (directory, relativeDirectory = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink() || stat.uid !== process.getuid() || fs.realpathSync(absolute) !== absolute) fail("MACOS_BUNDLE_ENTRY_UNSAFE", "RED");
      const inode = `${stat.dev}:${stat.ino}`;
      if (seen.has(inode)) fail("MACOS_BUNDLE_HARDLINK_DENIED", "RED");
      seen.add(inode);
      if (stat.isDirectory()) { const mode = stat.mode & 0o777; lines.push(`d\t${relative}\t${mode.toString(8)}\n`); records.push(Object.freeze({ kind: "directory", path: relative, mode, sha256: null })); walk(absolute, relative); }
      else if (stat.isFile()) {
        if (stat.nlink !== 1) fail("MACOS_BUNDLE_HARDLINK_DENIED", "RED");
        const bytes = fs.readFileSync(absolute);
        try { const mode = stat.mode & 0o777; const digest = sha256(bytes); lines.push(`f\t${relative}\t${mode.toString(8)}\t${bytes.length}\t${digest}\n`); records.push(Object.freeze({ kind: "file", path: relative, mode, sha256: digest })); } finally { bytes.fill(0); }
      } else fail("MACOS_BUNDLE_ENTRY_TYPE_DENIED", "RED");
    }
  };
  walk(canonicalRoot);
  return Object.freeze({ sha256: sha256(Buffer.from(lines.join(""), "utf8")), entries: Object.freeze(lines.map((line) => line.split("\t")[1])), records: Object.freeze(records) });
}
function validateExactBundleInventory(inventory, phase) {
  const expected = phase === "pre"
    ? [
      ["directory", "Contents", 0o700], ["directory", "Contents/MacOS", 0o700], ["directory", "Contents/Resources", 0o700],
      ["file", "Contents/Info.plist", 0o600], ["file", "Contents/MacOS/FormeCoreLocal", 0o500], ["file", "Contents/Resources/forme-core-transient-response.sb", 0o600],
    ]
    : [
      ["directory", "Contents", 0o700], ["directory", "Contents/MacOS", 0o700], ["directory", "Contents/Resources", 0o700], ["directory", "Contents/_CodeSignature", 0o755],
      ["file", "Contents/Info.plist", 0o600], ["file", "Contents/MacOS/FormeCoreLocal", 0o500], ["file", "Contents/Resources/forme-core-transient-response.sb", 0o600], ["file", "Contents/_CodeSignature/CodeResources", 0o644],
    ];
  const sortRows = (rows) => rows.sort((left, right) => Buffer.from(left[1], "utf8").compare(Buffer.from(right[1], "utf8")) || Buffer.from(left[0], "utf8").compare(Buffer.from(right[0], "utf8")));
  const observed = sortRows(inventory.records.map((entry) => [entry.kind, entry.path, entry.mode]));
  if (canonicalJson(observed) !== canonicalJson(sortRows(expected))) fail(`MACOS_${phase.toUpperCase()}_SIGN_INVENTORY_DRIFT`, "RED");
  return true;
}
function copyExactOwnedFile(source, destination, mode) {
  const bytes = fs.readFileSync(source);
  try { return copyOpenedRegularFile({ source, destination, expectedSha256: sha256(bytes), destinationMode: mode }); }
  finally { bytes.fill(0); }
}
function atomicWriteOwnedRunFile(target, bytes, mode) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || ![0o600].includes(mode)) fail("OWNED_RUN_WRITE_INVALID", "RED");
  mkdirOwned0700(path.dirname(target));
  let fd = null; let createdIdentity = null;
  try {
    fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), mode);
    createdIdentity = fs.fstatSync(fd);
    if (!createdIdentity.isFile() || createdIdentity.nlink !== 1 || createdIdentity.uid !== process.getuid() || (createdIdentity.mode & 0o777) !== mode || createdIdentity.size !== 0) fail("OWNED_RUN_WRITE_CREATE_IDENTITY_INVALID", "RED_QUARANTINED");
    writeAll(fd, bytes); fs.fsyncSync(fd);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.dev !== createdIdentity.dev || stat.ino !== createdIdentity.ino || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o777) !== mode || stat.size !== bytes.length) fail("OWNED_RUN_WRITE_OBSERVATION_INVALID", "RED");
    fs.closeSync(fd); fd = null; fsyncDirectory(path.dirname(target));
  } catch (error) {
    let rollbackUncertain = false;
    if (fd !== null && createdIdentity !== null) {
      try {
        const held = fs.fstatSync(fd);
        const observed = fs.lstatSync(target);
        if (!held.isFile() || !observed.isFile() || observed.isSymbolicLink() || held.dev !== createdIdentity.dev || held.ino !== createdIdentity.ino || observed.dev !== createdIdentity.dev || observed.ino !== createdIdentity.ino || observed.nlink !== 1 || observed.uid !== createdIdentity.uid || (observed.mode & 0o777) !== mode) rollbackUncertain = true;
        else {
          fs.unlinkSync(target);
          const afterUnlink = fs.fstatSync(fd);
          if (afterUnlink.dev !== createdIdentity.dev || afterUnlink.ino !== createdIdentity.ino || afterUnlink.nlink !== 0 || lstatIfPresent(target, "OWNED_RUN_WRITE_ROLLBACK_ABSENCE_UNREADABLE") !== null) rollbackUncertain = true;
          else fsyncDirectory(path.dirname(target));
        }
      } catch { rollbackUncertain = true; }
    } else if (fd !== null) rollbackUncertain = true;
    if (fd !== null) { try { fs.closeSync(fd); } catch { rollbackUncertain = true; } fd = null; }
    if (rollbackUncertain) fail("OWNED_RUN_WRITE_ROLLBACK_UNCERTAIN", "RED_QUARANTINED");
    throw error;
  }
}
function assertOwnedRegularFile(target, mode, code) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o777) !== mode || fs.realpathSync(target) !== target) fail(code, "RED");
  return stat;
}
function zeroizeAndUnlinkOwnedFile(target, maximumBytes = 16_777_216) {
  const stat = lstatIfPresent(target, "MACOS_SECRET_FILE_UNREADABLE");
  if (stat === null) return true;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.size < 0 || stat.size > maximumBytes || fs.realpathSync(target) !== target) fail("MACOS_SECRET_FILE_UNSAFE", "RED_QUARANTINED");
  const fd = fs.openSync(target, fs.constants.O_RDWR | (fs.constants.O_NOFOLLOW ?? 0));
  const zeros = Buffer.alloc(Math.min(65_536, Math.max(1, stat.size)));
  try {
    let offset = 0;
    while (offset < stat.size) {
      const length = Math.min(zeros.length, stat.size - offset);
      const written = fs.writeSync(fd, zeros, 0, length, offset);
      if (written !== length) fail("MACOS_SECRET_ZEROIZE_SHORT_WRITE", "RED_QUARANTINED");
      offset += written;
    }
    fs.fsyncSync(fd);
    const after = fs.fstatSync(fd);
    const pathAfter = fs.lstatSync(target);
    if (after.dev !== stat.dev || after.ino !== stat.ino || after.size !== stat.size || pathAfter.dev !== stat.dev || pathAfter.ino !== stat.ino) fail("MACOS_SECRET_ZEROIZE_TOCTOU", "RED_QUARANTINED");
    fs.unlinkSync(target);
    const afterUnlink = fs.fstatSync(fd);
    if (afterUnlink.dev !== stat.dev || afterUnlink.ino !== stat.ino || afterUnlink.nlink !== 0 || lstatIfPresent(target, "MACOS_SECRET_FILE_ABSENCE_UNREADABLE") !== null) fail("MACOS_SECRET_UNLINK_TOCTOU", "RED_QUARANTINED");
    fsyncDirectory(path.dirname(target));
  } finally { zeros.fill(0); fs.closeSync(fd); }
  return true;
}
export const PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS = Object.freeze({
  atomicWriteOwnedRunFile,
  blockedStartId,
  copyOpenedRegularFile,
  readSupervisorReadySlot,
  recoverUnstartedBlockedSupervisors,
  removeObservedSupervisorSlot,
  zeroizeAndUnlinkOwnedFile,
});
function removeMacOSRuntimeMaterials(plan) {
  for (const relative of ["signing/openssl.cnf", "signing/key.pem", "signing/cert.pem", "signing/identity.p12"]) zeroizeAndUnlinkOwnedFile(path.join(plan.runRoot, relative));
}
function replaceMacOSPlaceholders(step, state) {
  const replacements = new Map([
    ["<SYNTHETIC_KEYCHAIN_PASSWORD>", Buffer.isBuffer(state.keychainPassword) ? state.keychainPassword.toString("utf8") : state.keychainPassword],
    ["<SYNTHETIC_P12_PASSWORD>", Buffer.isBuffer(state.p12Password) ? state.p12Password.toString("utf8") : state.p12Password],
    ["<SYNTHETIC_BINDING_CANARY>", Buffer.isBuffer(state.bindingCanary) ? state.bindingCanary.toString("utf8") : state.bindingCanary],
    ["<OBSERVED_CERT_SHA1>", state.certificateSha1 ?? "<OBSERVED_CERT_SHA1>"],
    ["<HELPER_PID>", state.helper?.pid === undefined ? "<HELPER_PID>" : String(state.helper.pid)],
  ]);
  const replace = (value) => {
    let next = value;
    for (const [needle, replacement] of replacements) next = next.replaceAll(needle, replacement);
    if (/<[A-Z0-9_]+>/u.test(next)) fail("MACOS_PLAN_PLACEHOLDER_UNRESOLVED", "RED");
    return next;
  };
  return Object.freeze({ ...step, argv: step.argv.map(replace) });
}
function macOSPlaceholderCommandShapeSha256(step) {
  return sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment, deadlineMilliseconds: step.deadlineMilliseconds, stdoutLimitBytes: step.stdoutLimitBytes, stderrLimitBytes: step.stderrLimitBytes, ownedOutputs: step.ownedOutputs ?? [], outputModeNormalization: step.outputModeNormalization ?? null }), "utf8"));
}
function normalizeMacOSOwnedOutputs(step, runRoot) {
  if (step.ownedOutputs === undefined) return true;
  if (step.outputModeNormalization !== "o-nofollow-fchmod-fsync-identity-stable" || !Array.isArray(step.ownedOutputs) || step.ownedOutputs.length < 1) fail("MACOS_OWNED_OUTPUT_CONTRACT_INVALID", "RED");
  for (const output of step.ownedOutputs) {
    if (!output || !path.isAbsolute(output.path) || path.normalize(output.path) !== output.path || (!output.path.startsWith(`${runRoot}${path.sep}`)) || !["file", "directory"].includes(output.type) || !Number.isInteger(output.mode)) fail("MACOS_OWNED_OUTPUT_PATH_INVALID", "RED");
    const chain = snapshotNoSymlinkPathChain(output.path, "MACOS_OWNED_OUTPUT_PATH_UNSAFE");
    const before = fs.lstatSync(output.path);
    if (before.isSymbolicLink() || before.uid !== process.getuid() || (output.type === "file" ? !before.isFile() || before.nlink !== 1 || !Number.isSafeInteger(output.maximumBytes) || before.size < 1 || before.size > output.maximumBytes : !before.isDirectory())) fail("MACOS_OWNED_OUTPUT_TYPE_OR_SIZE_INVALID", "RED");
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (output.type === "directory" ? (fs.constants.O_DIRECTORY ?? 0) : 0);
    const fd = fs.openSync(output.path, flags);
    try {
      const opened = fs.fstatSync(fd);
      if (opened.dev !== before.dev || opened.ino !== before.ino || opened.uid !== before.uid || opened.nlink !== before.nlink || opened.size !== before.size) fail("MACOS_OWNED_OUTPUT_OPEN_IDENTITY_DRIFT", "RED");
      fs.fchmodSync(fd, output.mode); fs.fsyncSync(fd);
      const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(output.path);
      assertNoSymlinkPathChainStable(chain, "MACOS_OWNED_OUTPUT_PATH_DRIFT");
      if (afterFd.dev !== before.dev || afterFd.ino !== before.ino || afterPath.dev !== before.dev || afterPath.ino !== before.ino || afterFd.uid !== process.getuid() || afterPath.uid !== process.getuid() || (afterFd.mode & 0o777) !== output.mode || (afterPath.mode & 0o777) !== output.mode || (output.type === "file" && (afterFd.nlink !== 1 || afterPath.nlink !== 1 || afterFd.size !== before.size || afterPath.size !== before.size))) fail("MACOS_OWNED_OUTPUT_NORMALIZATION_FAILED", "RED");
    } finally { fs.closeSync(fd); }
  }
  return true;
}
const MACOS_SECURITY_KINDS = new Set(["default-keychain-pre", "search-list-pre", "custom-keychain-create", "custom-keychain-unlock", "custom-keychain-import", "custom-keychain-partition", "binding-canary-add", "binding-canary-find", "identity-inventory", "binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete", "default-keychain-post", "search-list-post"]);
const MACOS_CODESIGN_KINDS = new Set(["codesign-sign", "codesign-verify-strict", "codesign-entitlements", "codesign-designated-requirement", "codesign-test-requirement"]);
const MACOS_OPENSSL_KINDS = new Set(["derive-key-certificate", "derive-pkcs12"]);
const MACOS_KEYCHAIN_LIFECYCLE_KINDS = new Set(["custom-keychain-create", "custom-keychain-unlock", "custom-keychain-import", "custom-keychain-partition", "binding-canary-add", "binding-canary-find", "binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete"]);
function recordMacOSInvocationStarted(state, kind) {
  state.attempted.add(kind);
}
function recordMacOSInvocationCompleted(state, kind) {
  if (MACOS_SECURITY_KINDS.has(kind)) state.counters.security += 1;
  else if (MACOS_CODESIGN_KINDS.has(kind)) state.counters.codesign += 1;
  else if (MACOS_OPENSSL_KINDS.has(kind)) state.counters.openssl += 1;
  if (MACOS_KEYCHAIN_LIFECYCLE_KINDS.has(kind)) state.counters.securityLifecycle += 1;
  if (kind === "identity-inventory") state.counters.identityInventory += 1;
  if (kind === "codesign-sign") state.counters.signingPrivateKeyUses += 1;
  if (["default-keychain-pre", "default-keychain-post"].includes(kind)) state.counters.defaultKeychainMetadata += 1;
  if (["search-list-pre", "search-list-post"].includes(kind)) state.counters.searchListMetadata += 1;
}
function macOSCounterEvidence(state) {
  return Object.freeze({
    customTemporaryKeychainOperations: state.counters.securityLifecycle + state.counters.identityInventory + state.counters.signingPrivateKeyUses,
    securityLifecycleSubcommands: state.counters.securityLifecycle,
    identityInventoryReads: state.counters.identityInventory,
    signingPrivateKeyUses: state.counters.signingPrivateKeyUses,
    defaultKeychainMetadataReads: state.counters.defaultKeychainMetadata,
    searchListMetadataReads: state.counters.searchListMetadata,
    securityCliInvocations: state.counters.security,
    codesignCliInvocations: state.counters.codesign,
    opensslCliInvocations: state.counters.openssl,
  });
}
const MACOS_HELPER_PROCESS_RESOURCES = Object.freeze(["macos-helper-group", "candidate-pipe", "helper-receipt-pipe", "direct-ready-pipe", "direct-release-pipe"]);
const MACOS_FEEDER_PROCESS_RESOURCES = Object.freeze(["macos-feeder-group", "candidate-pipe", "completion-pipe", "direct-ready-pipe", "direct-release-pipe"]);
async function observeMacOSDirectReady(stream, expectedFrame, maximumBytes) {
  if (!stream || typeof stream.on !== "function" || typeof stream.destroy !== "function" || typeof expectedFrame !== "string" || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > 4096) fail("MACOS_DIRECT_READY_BINDING_INVALID", "RED");
  const expected = Buffer.from(expectedFrame, "utf8");
  if (expected.length < 1 || expected.length > maximumBytes || expected.at(-1) !== 0x0a || expected.subarray(0, -1).includes(0x0a) || expected.includes(0x00) || expected.includes(0x0d)) { expected.fill(0); fail("MACOS_DIRECT_READY_EXPECTATION_INVALID", "RED"); }
  let observed = Buffer.alloc(0);
  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => finish(new PhysicalRunnerError("MACOS_DIRECT_READY_TIMEOUT", "RED_QUARANTINED")), 2_000);
      const cleanup = () => {
        clearTimeout(timer);
        stream.off("data", onData);
        stream.off("end", onEnd);
        stream.off("error", onError);
      };
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error === null) resolve(); else reject(error);
      };
      const onData = (chunk) => {
        const owned = Buffer.from(chunk);
        try {
          observed = appendBounded(observed, owned, maximumBytes);
          if (observed.length > maximumBytes) finish(new PhysicalRunnerError("MACOS_DIRECT_READY_OVERSIZE", "RED"));
        } finally { owned.fill(0); }
      };
      const onEnd = () => {
        if (observed.length !== expected.length || !crypto.timingSafeEqual(observed, expected)) finish(new PhysicalRunnerError("MACOS_DIRECT_READY_FRAME_INVALID", "RED"));
        else finish();
      };
      const onError = () => finish(new PhysicalRunnerError("MACOS_DIRECT_READY_PIPE_ERROR", "RED_QUARANTINED"));
      stream.on("data", onData);
      stream.once("end", onEnd);
      stream.once("error", onError);
    });
  } finally {
    observed.fill(0);
    expected.fill(0);
    try { stream.destroy(); } catch {}
  }
}
async function releaseMacOSDirectChild(stream, expectedFrame) {
  if (!stream || typeof stream.end !== "function" || typeof stream.destroy !== "function" || typeof expectedFrame !== "string") fail("MACOS_DIRECT_RELEASE_BINDING_INVALID", "RED");
  const bytes = Buffer.from(expectedFrame, "utf8");
  if (bytes.length < 1 || bytes.length > 4096 || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x00) || bytes.includes(0x0d)) { bytes.fill(0); fail("MACOS_DIRECT_RELEASE_FRAME_INVALID", "RED"); }
  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const onError = () => finish(new PhysicalRunnerError("MACOS_DIRECT_RELEASE_PIPE_ERROR", "RED_QUARANTINED"));
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        stream.off("error", onError);
        if (error === null) resolve(); else reject(error);
      };
      stream.once("error", onError);
      stream.end(bytes, () => finish());
    });
  } finally { bytes.fill(0); }
}
function destroyMacOSChildStreams(child, indexes = null) {
  const entries = Array.isArray(child?.stdio) ? child.stdio : [];
  const selected = indexes === null ? entries : indexes.map((index) => entries[index]);
  for (const stream of selected) try { stream?.destroy(); } catch {}
}
async function recordMacOSDirectRecovery(journal, kind, commandShapeSha256, processGroupId, ownedResources) {
  await journal.append({ lane: "macos", event: `cleanup-observed-absent:${kind}`, commandShapeSha256, processGroupId, ownedResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
}
async function awaitMacOSTerminalWithTimeout(terminalPromise, milliseconds) {
  return await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => finish(null), milliseconds);
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    terminalPromise.then(finish, () => finish(null));
  });
}
async function spawnMacOSHelper(step, state, journal) {
  if (step.startProtocol !== MACOS_DIRECT_START_PROTOCOL.helper.implementation || step.targetStdioCount !== 5 || canonicalJson(step.descriptorMap) !== canonicalJson(MACOS_DIRECT_START_PROTOCOL.helper.descriptorMap) || step.releaseFrame !== MACOS_DIRECT_START_PROTOCOL.helper.releaseFrame || step.releaseRequiresEOF !== true || step.readyFrameMaximumBytes !== MACOS_DIRECT_START_PROTOCOL.helper.readyFrameMaximumBytes) fail("MACOS_HELPER_DIRECT_START_PLAN_DRIFT", "RED");
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment }), "utf8"));
  await journal.append({ lane: "macos", event: "intent:helper-spawn", commandShapeSha256, ownedResources: MACOS_HELPER_PROCESS_RESOURCES, cleanupState: "required" });
  const helperStartedAtMilliseconds = Date.now();
  const child = spawn(step.executable, step.argv, { cwd: step.cwd, env: { ...step.environment }, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"] });
  if (!Number.isInteger(child.pid)) fail("MACOS_HELPER_PID_MISSING", "RED");
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let releaseStarted = false;
  let released = false;
  let preReleaseOutputViolation = false;
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, 4096); if (!releaseStarted && chunk.length > 0) preReleaseOutputViolation = true; if (stdout.length > 4096 || preReleaseOutputViolation) { destroyMacOSChildStreams(child); signalGroup(child.pid, "SIGTERM"); } });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1); if (!releaseStarted && chunk.length > 0) preReleaseOutputViolation = true; destroyMacOSChildStreams(child); signalGroup(child.pid, "SIGTERM"); });
  let terminal = null;
  const close = new Promise((resolve) => {
    child.once("error", (error) => { terminal = { code: -1, signal: null, error }; resolve(terminal); });
    child.once("close", (code, signal) => { if (terminal === null) terminal = { code: code ?? -1, signal, error: null }; resolve(terminal); });
  });
  try {
    await observeMacOSDirectReady(child.stdio[3], `R4_GATE_B_DIRECT_READY_V1 helper ${child.pid}\n`, step.readyFrameMaximumBytes);
    if (preReleaseOutputViolation || stdout.length !== 0 || stderr.length !== 0) fail("MACOS_HELPER_PRE_RELEASE_OUTPUT", "RED");
    if (groupExists(child.pid) !== true) fail("MACOS_HELPER_DIRECT_GROUP_NOT_LIVE", "RED_QUARANTINED");
    await journal.append({ lane: "macos", event: "started:helper-spawn", commandShapeSha256, processGroupId: child.pid, ownedResources: MACOS_HELPER_PROCESS_RESOURCES, cleanupState: "required" });
  } catch (error) {
    destroyMacOSChildStreams(child);
    if (!await stopAndProveGroupAbsent(child.pid)) fail("MACOS_HELPER_UNJOURNALED_GROUP_QUARANTINED", "RED_QUARANTINED");
    await recordMacOSDirectRecovery(journal, "helper-spawn", commandShapeSha256, child.pid, MACOS_HELPER_PROCESS_RESOURCES);
    throw error;
  }
  state.helper = {
    child, pid: child.pid, startedAtMilliseconds: helperStartedAtMilliseconds, stdout: () => stdout, stderr: () => stderr, close, commandShapeSha256,
    terminalRecorded: false,
    terminalAbsent: false,
    recoveryRecorded: false,
    get released() { return released; },
    async release() {
      if (released) fail("MACOS_HELPER_DIRECT_RELEASE_DUPLICATE", "RED");
      if (preReleaseOutputViolation || stdout.length !== 0 || stderr.length !== 0) fail("MACOS_HELPER_PRE_RELEASE_OUTPUT", "RED");
      if (groupExists(child.pid) !== true) fail("MACOS_HELPER_DIRECT_RELEASE_GROUP_INVALID", "RED_QUARANTINED");
      releaseStarted = true;
      try { await releaseMacOSDirectChild(child.stdio[4], step.releaseFrame); released = true; }
      catch (error) { throw error; }
    },
  };
}
async function spawnMacOSFeeder(step, state, journal) {
  if (!state.helper || !state.helper.child.stdin) fail("MACOS_HELPER_PIPE_MISSING", "RED");
  if (!state.runtimeIdentityValidated || !state.networkSampleZero) fail("MACOS_HELPER_PRE_RELEASE_OBSERVATION_INCOMPLETE", "RED");
  if (step.startProtocol !== MACOS_DIRECT_START_PROTOCOL.feeder.implementation || step.targetStdioCount !== 7 || canonicalJson(step.descriptorMap) !== canonicalJson(MACOS_DIRECT_START_PROTOCOL.feeder.descriptorMap) || step.releaseFrame !== MACOS_DIRECT_START_PROTOCOL.feeder.releaseFrame || step.releaseRequiresEOF !== true || step.readyFrameMaximumBytes !== MACOS_DIRECT_START_PROTOCOL.feeder.readyFrameMaximumBytes) fail("MACOS_FEEDER_DIRECT_START_PLAN_DRIFT", "RED");
  await state.helper.release();
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment }), "utf8"));
  await journal.append({ lane: "macos", event: "intent:feeder-spawn", commandShapeSha256, ownedResources: MACOS_FEEDER_PROCESS_RESOURCES, cleanupState: "required" });
  const child = spawn(step.executable, step.argv, { cwd: step.cwd, env: { ...step.environment }, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe", state.helper.child.stdin, "pipe", "pipe", "pipe"] });
  if (!Number.isInteger(child.pid)) fail("MACOS_FEEDER_PID_MISSING", "RED");
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let control = Buffer.alloc(0);
  let releaseStarted = false;
  let preReleaseOutputViolation = false;
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, 1); if (!releaseStarted && chunk.length > 0) preReleaseOutputViolation = true; });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1); if (!releaseStarted && chunk.length > 0) preReleaseOutputViolation = true; });
  child.stdio[4].on("data", (chunk) => { control = appendBounded(control, chunk, 64); if (!releaseStarted && chunk.length > 0) preReleaseOutputViolation = true; });
  const terminalPromise = new Promise((resolve) => {
    let settled = false;
    child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
    child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
  });
  try {
    await observeMacOSDirectReady(child.stdio[5], `R4_GATE_B_DIRECT_READY_V1 feeder ${child.pid}\n`, step.readyFrameMaximumBytes);
    if (preReleaseOutputViolation || stdout.length !== 0 || stderr.length !== 0 || control.length !== 0) fail("MACOS_FEEDER_PRE_RELEASE_OUTPUT", "RED");
    if (groupExists(child.pid) !== true) fail("MACOS_FEEDER_DIRECT_GROUP_NOT_LIVE", "RED_QUARANTINED");
    await journal.append({ lane: "macos", event: "started:feeder-spawn", commandShapeSha256, processGroupId: child.pid, ownedResources: MACOS_FEEDER_PROCESS_RESOURCES, cleanupState: "required" });
    releaseStarted = true;
    await releaseMacOSDirectChild(child.stdio[6], step.releaseFrame);
  } catch (error) {
    destroyMacOSChildStreams(child);
    try { state.helper.child.stdin.destroy(); } catch {}
    if (!await stopAndProveGroupAbsent(child.pid)) fail("MACOS_FEEDER_UNJOURNALED_GROUP_QUARANTINED", "RED_QUARANTINED");
    await recordMacOSDirectRecovery(journal, "feeder-spawn", commandShapeSha256, child.pid, MACOS_FEEDER_PROCESS_RESOURCES);
    throw error;
  }
  const terminal = await awaitMacOSTerminalWithTimeout(terminalPromise, 10_000);
  if (terminal === null) { destroyMacOSChildStreams(child, [1, 2, 4, 5, 6]); signalGroup(child.pid, "SIGTERM"); }
  const absent = await stopAndProveGroupAbsent(child.pid);
  try {
    await journal.append({ lane: "macos", event: "terminal:feeder-spawn", commandShapeSha256, processGroupId: child.pid, ownedResources: MACOS_FEEDER_PROCESS_RESOURCES, terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
  } catch (error) {
    if (!absent) fail("MACOS_FEEDER_TERMINAL_JOURNAL_QUARANTINED", "RED_QUARANTINED");
    await recordMacOSDirectRecovery(journal, "feeder-spawn", commandShapeSha256, child.pid, MACOS_FEEDER_PROCESS_RESOURCES);
    throw error;
  }
  try {
    if (terminal === null || terminal.error || !absent) fail("MACOS_FEEDER_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
    const marker = /^FRAME_COMPLETE ([0-9]+)\n$/u.exec(control.toString("utf8"));
    const candidateBytesWritten = marker ? Number(marker[1]) : -1;
    state.feederEvidence = validateMacOSSyntheticFeederCompletion({ exitCode: terminal.code, signal: terminal.signal, candidateBytesWritten, expectedCandidateBytes: state.syntheticCandidateFrameBytes, controlBytes: control, stdoutBytes: stdout, stderrBytes: stderr, markerObservedBeforeFeederExit: false });
  } finally { stdout.fill(0); stderr.fill(0); control.fill(0); destroyMacOSChildStreams(child, [1, 2, 4, 5, 6]); }
}
async function finishMacOSHelper(state, journal) {
  if (!state.helper) fail("MACOS_HELPER_NOT_STARTED", "RED");
  if (state.helper.released !== true) fail("MACOS_HELPER_NEVER_RELEASED", "RED");
  const hardDeadline = Math.min(state.absoluteAuthorityDeadlineMilliseconds, state.helper.startedAtMilliseconds + 900_000) + 2_000;
  const remaining = Math.max(1, hardDeadline - Date.now());
  const terminal = await awaitMacOSTerminalWithTimeout(state.helper.close, remaining);
  if (terminal === null) { destroyMacOSChildStreams(state.helper.child); signalGroup(state.helper.pid, "SIGTERM"); }
  const absent = await stopAndProveGroupAbsent(state.helper.pid);
  try {
    await journal.append({ lane: "macos", event: "terminal:helper-spawn", commandShapeSha256: state.helper.commandShapeSha256, processGroupId: state.helper.pid, ownedResources: MACOS_HELPER_PROCESS_RESOURCES, terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
    state.helper.terminalRecorded = true;
    state.helper.terminalAbsent = absent;
  } catch (error) {
    if (!absent) fail("MACOS_HELPER_TERMINAL_JOURNAL_QUARANTINED", "RED_QUARANTINED");
    await recordMacOSDirectRecovery(journal, "helper-spawn", state.helper.commandShapeSha256, state.helper.pid, MACOS_HELPER_PROCESS_RESOURCES);
    state.helper.recoveryRecorded = true;
    throw error;
  }
  if (terminal === null || terminal.error || !absent) fail("MACOS_HELPER_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
  const stdout = state.helper.stdout();
  const stderr = state.helper.stderr();
  try {
    state.helperEvidence = validateMacOSHelperTerminal({ stdout, stderr, exitCode: terminal.code, signal: terminal.signal });
    if (state.helperEvidence.helperReceiptValidated !== true) fail("MACOS_HELPER_RECEIPT_UNOBSERVED", "YELLOW");
    if (state.helperEvidence.helperControlledZeroizationPassed !== true || state.helperEvidence.helperCleanupPassed !== true || (state.helperEvidence.terminal !== "approve_exact" && state.helperEvidence.handoffCount !== 0)) fail("MACOS_HELPER_RECEIPT_CLEANUP_INVALID", "RED");
    if (state.helperEvidence.helperReasonCode === "candidate_binding_drift") fail("MACOS_CANDIDATE_BINDING_DRIFT", "RED");
  } finally {
    stdout.fill(0); stderr.fill(0);
    destroyMacOSChildStreams(state.helper.child);
  }
}

function randomHexBuffer(byteCount) {
  const random = crypto.randomBytes(byteCount);
  try { return Buffer.from(random.toString("hex"), "utf8"); }
  finally { random.fill(0); }
}

async function cleanupMacOSAfterTerminal({ plan, state, journal, processPort, rootAuthority = null, absenceMarkerAlreadyObserved = false }) {
  let clean = true;
  if (rootAuthority !== null) {
    try { assertExactOwnedRootAuthorityCurrent(rootAuthority, "MACOS_CLEANUP_ROOT"); }
    catch { closeExactOwnedRootAuthority(rootAuthority); return false; }
  }
  const byKind = new Map(plan.steps.map((step) => [step.kind, step]));
  const runCleanupCommand = async (kind, acceptedExitCodes = [0]) => {
    const raw = byKind.get(kind);
    if (!raw) { clean = false; return; }
    try {
      const step = replaceMacOSPlaceholders(raw, state);
      const result = await runClosedProcess(step, { journal, lane: "cleanup", processPort, acceptedExitCodes, onStarted: () => recordMacOSInvocationStarted(state, kind), onCompleted: () => recordMacOSInvocationCompleted(state, kind), journalCommandShapeSha256: macOSPlaceholderCommandShapeSha256(raw) });
      if (kind === "default-keychain-post") {
        state.defaultPost = sha256(result.stdout);
        await journal.append({ lane: "cleanup", event: "observation:macos-default-keychain-post", commandShapeSha256: state.defaultPost, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" });
      }
      if (kind === "search-list-post") {
        state.searchPost = sha256(result.stdout);
        await journal.append({ lane: "cleanup", event: "observation:macos-search-list-post", commandShapeSha256: state.searchPost, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" });
      }
      result.stdout.fill(0); result.stderr.fill(0);
      state.completed.add(kind);
    } catch { clean = false; }
  };
  if (state.helper) {
    destroyMacOSChildStreams(state.helper.child);
    const helperAbsent = groupExists(state.helper.pid) === false || await stopAndProveGroupAbsent(state.helper.pid);
    if (!helperAbsent) clean = false;
    else if (state.helper.terminalAbsent !== true && state.helper.recoveryRecorded !== true) {
      try {
        await recordMacOSDirectRecovery(journal, "helper-spawn", state.helper.commandShapeSha256, state.helper.pid, MACOS_HELPER_PROCESS_RESOURCES);
        state.helper.recoveryRecorded = true;
      } catch { clean = false; }
    }
  }
  if (state.attempted.has("binding-canary-add") && !state.completed.has("binding-canary-delete")) await runCleanupCommand("binding-canary-delete", [0, 44]);
  if (state.attempted.has("custom-keychain-import") && !state.completed.has("identity-delete")) {
    if (state.certificateSha1 === null) clean = false;
    else await runCleanupCommand("identity-delete", [0, 44]);
  }
  if (state.attempted.has("custom-keychain-create") && !state.completed.has("custom-keychain-delete")) {
    if (!state.completed.has("custom-keychain-lock")) await runCleanupCommand("custom-keychain-lock", [0, 44]);
    await runCleanupCommand("custom-keychain-delete", [0, 44]);
  }
  try { removeMacOSRuntimeMaterials(plan); } catch { clean = false; }
  if (state.completed.has("default-keychain-pre") && state.defaultPost === null) await runCleanupCommand("default-keychain-post");
  if (state.completed.has("search-list-pre") && state.searchPost === null) await runCleanupCommand("search-list-post");
  const metadataProofRequired = state.attempted.has("custom-keychain-create");
  if (metadataProofRequired && (state.defaultPre === null || state.defaultPost === null || state.searchPre === null || state.searchPost === null)) clean = false;
  if (state.defaultPre !== null && state.defaultPost !== null && state.defaultPre !== state.defaultPost) clean = false;
  if (state.searchPre !== null && state.searchPost !== null && state.searchPre !== state.searchPost) clean = false;
  if (clean && typeof journal?.records === "function") {
    try {
      const authority = validateRetryJournalForCleanup(journal.records());
      if (authority.unresolvedProcessGroups.length !== 0 || authority.unstartedSupervisorStarts.length !== 0 || authority.unstartedDirectGateIntents !== 0 || authority.macOSExternalEffectsAbsent !== true || authority.macOSMetadataRestored !== true) clean = false;
    } catch { clean = false; }
  }
  if (clean && !absenceMarkerAlreadyObserved) {
    try { await appendRetryCleanupAbsenceMarker(journal, "macos"); }
    catch { clean = false; }
  }
  if (clean && rootAuthority !== null) {
    try { removeExactOwnedRootTree(rootAuthority, MACOS_ROOT_DELETE_INVENTORY); rootAuthority = null; }
    catch { clean = false; rootAuthority = null; }
  } else if (clean && lstatIfPresent(plan.runRoot, "MACOS_CLEANUP_ROOT_UNREADABLE") !== null) clean = false;
  if (rootAuthority !== null) closeExactOwnedRootAuthority(rootAuthority);
  return clean;
}

export async function cleanupMacOSResourcesFromJournal({ capsule, runId, records, journal, processPort }) {
  const runRoot = `/private/tmp/forme-r4-gate-b-core-${runId}`;
  const runRootTargetAbsent = records.some((record) => record.lane === "macos" && record.event === "marker:run-root-target-absent" && record.processGroupId === null);
  const runRootCreated = records.some((record) => record.lane === "macos" && record.event === "marker:run-root-created" && record.processGroupId === null);
  const macOSCleanupAbsenceObserved = retryCleanupAbsenceMarkerObserved(records, "macos");
  const runRootStat = lstatIfPresent(runRoot, "MACOS_CLEANUP_ROOT_UNREADABLE");
  if (!runRootCreated) {
    if (runRootStat !== null) fail(runRootTargetAbsent ? "MACOS_CLEANUP_UNCOMMITTED_ROOT_PRESENT" : "MACOS_CLEANUP_ROOT_WITHOUT_AUTHORITY", "RED_QUARANTINED");
    if (!macOSCleanupAbsenceObserved) await appendRetryCleanupAbsenceMarker(journal, "macos");
    return true;
  }
  if (runRootStat === null) {
    if (!macOSCleanupAbsenceObserved) fail("MACOS_CLEANUP_ROOT_MISSING_WITH_KEYCHAIN_AUTHORITY", "RED_QUARANTINED");
    return true;
  }
  const macOSRootAuthority = openExactOwnedRootAuthority({ root: runRoot, anchor: "/private/tmp", codePrefix: "MACOS_CLEANUP_ROOT" });
  let rootAuthorityTransferred = false;
  try {
  if (macOSCleanupAbsenceObserved) {
    rootAuthorityTransferred = true;
    removeExactOwnedRootTree(macOSRootAuthority, MACOS_ROOT_DELETE_INVENTORY);
    return true;
  }
  const attempted = new Set(); const completed = new Set();
  for (const record of records) {
    if (record.lane !== "macos" && record.lane !== "cleanup") continue;
    if (typeof record.event === "string" && record.event.startsWith("intent:")) attempted.add(record.event.slice("intent:".length));
    if (typeof record.event === "string" && record.event.startsWith("terminal:")) {
      const kind = record.event.slice("terminal:".length);
      if (record.terminalCode === "0" || (record.terminalCode === "44" && ["binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete"].includes(kind))) completed.add(kind);
    }
  }
  const keychainEffectPossible = attempted.has("custom-keychain-create");
  let plan;
  if (keychainEffectPossible) {
    const security = assertCleanupBoundFileCurrent(capsule, "security");
    for (const directory of [path.join(runRoot, "isolated-home"), path.join(runRoot, "tmp")]) mkdirOwned0700(directory);
    const environment = Object.freeze({ HOME: path.join(runRoot, "isolated-home"), TMPDIR: path.join(runRoot, "tmp") });
    const keychain = path.join(runRoot, "signing/forme-core.keychain-db");
    const command = (kind, argv) => Object.freeze({ kind, operation: "cleanup-spawn-exact", executable: security, argv, cwd: runRoot, environment, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 4096, expectedExitCodes: [0] });
    plan = Object.freeze({ runRoot, steps: Object.freeze([
      command("binding-canary-delete", ["delete-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", keychain]),
      command("identity-delete", ["delete-identity", "-Z", "<OBSERVED_CERT_SHA1>", keychain]),
      command("custom-keychain-lock", ["lock-keychain", keychain]),
      command("custom-keychain-delete", ["delete-keychain", keychain]),
      command("default-keychain-post", ["default-keychain", "-d", "user"]),
      command("search-list-post", ["list-keychains", "-d", "user"]),
    ]) });
  } else {
    plan = Object.freeze({ runRoot, steps: Object.freeze([]) });
    completed.delete("default-keychain-pre"); completed.delete("search-list-pre");
  }
  const observed = (event, cleanupEvent) => records.findLast((record) => (record.lane === "macos" && record.event === event) || (record.lane === "cleanup" && record.event === cleanupEvent))?.commandShapeSha256 ?? null;
  const state = { keychainPassword: Buffer.alloc(0), p12Password: Buffer.alloc(0), bindingCanary: Buffer.alloc(0), certificateSha1: null, certificateSha256: null, helper: null, defaultPre: observed("observation:default-keychain-pre", ""), searchPre: observed("observation:search-list-pre", ""), defaultPost: observed("observation:default-keychain-post", "observation:macos-default-keychain-post"), searchPost: observed("observation:search-list-post", "observation:macos-search-list-post"), attempted, completed, counters: { security: 0, codesign: 0, openssl: 0, securityLifecycle: 0, identityInventory: 0, signingPrivateKeyUses: 0, defaultKeychainMetadata: 0, searchListMetadata: 0 } };
  const certPath = path.join(plan.runRoot, "signing/cert.pem");
  if (keychainEffectPossible && fs.existsSync(certPath)) {
    const stat = assertOwnedRegularFile(certPath, 0o644, "MACOS_CLEANUP_CERTIFICATE_FILE_UNSAFE");
    if (stat.size < 1 || stat.size > 1_048_576) fail("MACOS_CLEANUP_CERTIFICATE_SIZE_INVALID", "RED_QUARANTINED");
    const fd = fs.openSync(certPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const pem = Buffer.allocUnsafe(stat.size); let der = Buffer.alloc(0);
    try {
      let offset = 0;
      while (offset < pem.length) { const count = fs.readSync(fd, pem, offset, pem.length - offset, offset); if (count <= 0) fail("MACOS_CLEANUP_CERTIFICATE_SHORT_READ", "RED_QUARANTINED"); offset += count; }
      const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(certPath);
      if (afterFd.dev !== stat.dev || afterFd.ino !== stat.ino || afterFd.size !== stat.size || Math.trunc(afterFd.mtimeMs) !== Math.trunc(stat.mtimeMs) || afterPath.dev !== stat.dev || afterPath.ino !== stat.ino || afterPath.size !== stat.size || afterPath.nlink !== 1) fail("MACOS_CLEANUP_CERTIFICATE_TOCTOU", "RED_QUARANTINED");
      const certificate = new X509Certificate(pem); der = Buffer.from(certificate.raw); state.certificateSha1 = crypto.createHash("sha1").update(der).digest("hex").toUpperCase(); state.certificateSha256 = sha256(der);
    } catch { /* cleanup remains quarantined if an imported identity cannot be bound */ }
    finally { fs.closeSync(fd); pem.fill(0); der.fill(0); }
  }
    rootAuthorityTransferred = true;
    return await cleanupMacOSAfterTerminal({ plan, state, journal, processPort, rootAuthority: macOSRootAuthority, absenceMarkerAlreadyObserved: macOSCleanupAbsenceObserved });
  } finally {
    if (!rootAuthorityTransferred) closeExactOwnedRootAuthority(macOSRootAuthority);
  }
}

async function executeMacOSLane({ capsule, manifestSha256, runId, runtimeSnapshot, journal, processPort }) {
  const tool = (name) => capsuleBoundFile(capsule, name).path;
  const binding = { swiftc: capsule.macos.swiftcPath, sdkPath: capsule.macos.sdkPath, codesign: tool("codesign"), security: tool("security"), openssl: tool("openssl"), lsof: tool("lsof"), node: tool("node"), runtimeSourceRoot: runtimeSnapshot.root };
  const plan = buildMacOSPhysicalPlan(binding, manifestSha256, runId, (relativePath) => runtimeSnapshot.readBytes(relativePath));
  if (plan.runtimeInputReadMode !== "injected-o-nofollow-identity-hash-pinned") fail("MACOS_RUNTIME_INPUT_MODE_INVALID", "RED");
  const state = { keychainPassword: randomHexBuffer(24), p12Password: randomHexBuffer(24), bindingCanary: randomHexBuffer(24), absoluteAuthorityDeadlineMilliseconds: plan.absoluteAuthorityDeadlineMilliseconds, syntheticCandidateFrameBytes: plan.syntheticCandidateFrameBytes, certificateSha1: null, certificateSha256: null, helper: null, helperEvidence: null, feederEvidence: null, defaultPre: null, searchPre: null, defaultPost: null, searchPost: null, preInventory: null, postInventory: null, preSignExecutableSha256: null, postSignExecutableSha256: null, runtimeIdentityValidated: false, signingValidated: false, networkSampleZero: false, attempted: new Set(), completed: new Set(), counters: { security: 0, codesign: 0, openssl: 0, securityLifecycle: 0, identityInventory: 0, signingPrivateKeyUses: 0, defaultKeychainMetadata: 0, searchListMetadata: 0 } };
  requirePathEntryAbsent(plan.runRoot, "MACOS_RUN_ROOT_PREEXISTS", "RED_QUARANTINED");
  await journal.append({ lane: "macos", event: "marker:run-root-target-absent", commandShapeSha256: sha256(Buffer.from(`macos-run-root:${runId}\n`)), ownedResources: ["macos-run-root"], cleanupState: "required" });
  let macOSRootAuthority = createExclusiveOwnedRoot0700(plan.runRoot, "/private/tmp", "MACOS_RUN_ROOT");
  const app = path.join(plan.runRoot, "FormeCoreLocal.app");
  const executable = path.join(app, "Contents/MacOS/FormeCoreLocal");
  try {
    await journal.append({ lane: "macos", event: "marker:run-root-created", commandShapeSha256: sha256(Buffer.from(`macos-run-root:${runId}\n`)), ownedResources: ["macos-run-root"], terminalCode: "CREATED", cleanupState: "required" });
    for (const directory of [path.join(plan.runRoot, "build"), path.join(plan.runRoot, "signing"), path.join(plan.runRoot, "isolated-home"), path.join(plan.runRoot, "tmp")]) mkdirOwned0700(directory);
    for (const rawStep of plan.steps) {
      const step = replaceMacOSPlaceholders(rawStep, state);
      if (step.kind === "preflight") { await journal.append({ lane: "macos", event: "marker:preflight", commandShapeSha256: sha256(Buffer.from("macos-preflight-v1\n")), ownedResources: ["macos-run-root"], cleanupState: "required" }); continue; }
      if (step.kind === "write-openssl-config") {
        const configBytes = Buffer.from(step.exactBytes, "utf8");
        try { atomicWriteOwnedRunFile(step.targetPath, configBytes, step.targetMode); } finally { configBytes.fill(0); }
        if (step.targetPath === REPOSITORY_ROOT || step.targetPath.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) fail("MACOS_OPENSSL_CONFIG_REPO_OVERLAP", "RED");
        const written = fs.readFileSync(step.targetPath); try { if (sha256(written) !== step.exactBytesSha256) fail("MACOS_OPENSSL_CONFIG_DRIFT", "RED"); } finally { written.fill(0); }
        continue;
      }
      if (step.kind === "assemble-bundle") {
        runtimeSnapshot.assertStable();
        for (const directory of [app, path.join(app, "Contents"), path.join(app, "Contents/MacOS"), path.join(app, "Contents/Resources")]) mkdirOwned0700(directory);
        copyExactOwnedFile(path.join(plan.runRoot, "build/FormeCoreLocal"), executable, 0o500);
        const infoPlist = runtimeSnapshot.readBytes("native/macos/Resources/FormeCoreLocal.Info.plist");
        const transientProfile = runtimeSnapshot.readBytes("schemas/r4/gate-b-core/macos/forme-core-transient-response.sb");
        try {
          atomicWriteOwnedRunFile(path.join(app, "Contents/Info.plist"), infoPlist, 0o600);
          atomicWriteOwnedRunFile(path.join(app, "Contents/Resources/forme-core-transient-response.sb"), transientProfile, 0o600);
        } finally { infoPlist.fill(0); transientProfile.fill(0); }
        runtimeSnapshot.assertStable();
        continue;
      }
      if (step.kind === "pre-sign-inventory") { state.preInventory = recursiveOwnedInventory(app); validateExactBundleInventory(state.preInventory, "pre"); state.preSignExecutableSha256 = state.preInventory.records.find((entry) => entry.path === "Contents/MacOS/FormeCoreLocal")?.sha256 ?? null; continue; }
      if (step.kind === "post-sign-inventory") { state.postInventory = recursiveOwnedInventory(app); validateExactBundleInventory(state.postInventory, "post"); const bytes = fs.readFileSync(executable); try { state.postSignExecutableSha256 = sha256(bytes); } finally { bytes.fill(0); } continue; }
      if (step.kind === "runtime-identity") {
        if (!state.helper || groupExists(state.helper.pid) !== true || fs.realpathSync(executable) !== executable) fail("MACOS_RUNTIME_IDENTITY_INVALID", "RED");
        const result = await runClosedProcess(step, { journal, lane: "macos", processPort });
        try {
          const names = result.stdout.toString("utf8").split("\n").filter((line) => line.startsWith("n")).map((line) => line.slice(1));
          if (names.length !== 1 || names[0] !== executable) fail("MACOS_RUNTIME_LIVE_EXECUTABLE_MISMATCH", "RED");
        } finally { result.stdout.fill(0); result.stderr.fill(0); }
        const bytes = fs.readFileSync(executable); try { if (sha256(bytes) !== state.postSignExecutableSha256) fail("MACOS_RUNTIME_EXECUTABLE_DRIFT", "RED"); } finally { bytes.fill(0); }
        state.runtimeIdentityValidated = true;
        continue;
      }
      if (step.kind === "eof-commit-gate") { if (!state.feederEvidence?.eofReleaseAllowed) fail("MACOS_EOF_COMMIT_GATE_DENIED", "RED"); state.helper.child.stdin.end(); continue; }
      if (step.kind === "helper-receipt") { await finishMacOSHelper(state, journal); continue; }
      if (step.kind === "cleanup") {
        if ((state.attempted.has("binding-canary-add") && !state.completed.has("binding-canary-delete"))
          || (state.attempted.has("custom-keychain-import") && !state.completed.has("identity-delete"))
          || (state.attempted.has("custom-keychain-create") && (!state.completed.has("custom-keychain-lock") || !state.completed.has("custom-keychain-delete")))
          || (state.helper !== null && state.helper.terminalAbsent !== true)
          || state.defaultPre === null || state.defaultPost === null || state.defaultPre !== state.defaultPost
          || state.searchPre === null || state.searchPost === null || state.searchPre !== state.searchPost) fail("MACOS_CLEANUP_ABSENCE_PROOF_INCOMPLETE", "RED_QUARANTINED");
        if (typeof journal?.records === "function") {
          const authority = validateRetryJournalForCleanup(journal.records());
          if (authority.unresolvedProcessGroups.length !== 0 || authority.unstartedSupervisorStarts.length !== 0 || authority.unstartedDirectGateIntents !== 0 || authority.macOSExternalEffectsAbsent !== true || authority.macOSMetadataRestored !== true) fail("MACOS_CLEANUP_ABSENCE_PROOF_INCOMPLETE", "RED_QUARANTINED");
        }
        await appendRetryCleanupAbsenceMarker(journal, "macos");
        removeExactOwnedRootTree(macOSRootAuthority, MACOS_ROOT_DELETE_INVENTORY);
        macOSRootAuthority = null;
        continue;
      }
      if (step.kind === "absence-proof") { if ((state.helper && groupExists(state.helper.pid) !== false) || fs.existsSync(plan.runRoot)) fail("MACOS_HELPER_OR_RESOURCE_ABSENCE_UNKNOWN", "RED_QUARANTINED"); continue; }
      if (step.kind === "helper-spawn") { if (Date.now() >= state.absoluteAuthorityDeadlineMilliseconds) fail("MACOS_AUTHORITY_EXPIRED_BEFORE_HELPER", "YELLOW"); await spawnMacOSHelper(step, state, journal); continue; }
      if (step.kind === "feeder-spawn") { runtimeSnapshot.assertStable(); await spawnMacOSFeeder(step, state, journal); runtimeSnapshot.assertStable(); continue; }
      if (step.kind === "pre-body-network-sample") {
        const result = await runClosedProcess({ ...step, expectedExitCodes: [0, 1], stderrLimitBytes: 0 }, { journal, lane: "macos", processPort, acceptedExitCodes: [0, 1] });
        try { if (result.stdout.length !== 0 || result.stderr.length !== 0) fail("MACOS_PRE_BODY_NETWORK_SOCKET_OBSERVED", "RED"); state.networkSampleZero = true; } finally { result.stdout.fill(0); result.stderr.fill(0); }
        continue;
      }
      if (["custom-keychain-create", "custom-keychain-import", "binding-canary-add"].includes(step.kind)) state.attempted.add(step.kind);
      const consumesRuntimePath = ["compile", "codesign-sign"].includes(step.kind);
      if (consumesRuntimePath) runtimeSnapshot.assertStable();
      const result = await runClosedProcess(step, { journal, lane: "macos", processPort, onStarted: () => recordMacOSInvocationStarted(state, step.kind), onCompleted: () => recordMacOSInvocationCompleted(state, step.kind), journalCommandShapeSha256: macOSPlaceholderCommandShapeSha256(rawStep) });
      if (consumesRuntimePath) runtimeSnapshot.assertStable();
      try {
        normalizeMacOSOwnedOutputs(step, plan.runRoot);
        if (step.kind === "default-keychain-pre") { state.defaultPre = sha256(result.stdout); await journal.append({ lane: "macos", event: "observation:default-keychain-pre", commandShapeSha256: state.defaultPre, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" }); }
        if (step.kind === "search-list-pre") { state.searchPre = sha256(result.stdout); await journal.append({ lane: "macos", event: "observation:search-list-pre", commandShapeSha256: state.searchPre, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" }); }
        if (step.kind === "default-keychain-post") { state.defaultPost = sha256(result.stdout); await journal.append({ lane: "macos", event: "observation:default-keychain-post", commandShapeSha256: state.defaultPost, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" }); }
        if (step.kind === "search-list-post") { state.searchPost = sha256(result.stdout); await journal.append({ lane: "macos", event: "observation:search-list-post", commandShapeSha256: state.searchPost, ownedResources: [], terminalCode: "OBSERVED", cleanupState: "required" }); }
        if (step.kind === "derive-key-certificate") {
          assertOwnedRegularFile(path.join(plan.runRoot, "signing/key.pem"), 0o600, "MACOS_PRIVATE_KEY_FILE_UNSAFE");
          assertOwnedRegularFile(path.join(plan.runRoot, "signing/cert.pem"), 0o644, "MACOS_CERTIFICATE_FILE_UNSAFE");
          const pem = fs.readFileSync(path.join(plan.runRoot, "signing/cert.pem")); let der = Buffer.alloc(0);
          try {
            const certificate = new X509Certificate(pem); der = Buffer.from(certificate.raw);
            state.certificateSha1 = crypto.createHash("sha1").update(der).digest("hex").toUpperCase();
            state.certificateSha256 = sha256(der);
          } finally { pem.fill(0); der.fill(0); }
        }
        if (step.kind === "derive-pkcs12") assertOwnedRegularFile(path.join(plan.runRoot, "signing/identity.p12"), 0o600, "MACOS_PKCS12_FILE_UNSAFE");
        if (step.kind === "identity-inventory") {
          validateMacOSIdentityInventory({ stdoutBytes: result.stdout, expectedCertificateSha1: state.certificateSha1 });
        }
        if (step.kind === "codesign-verify-strict") {
          state.signatureStrictValidated = validateMacOSStrictSignatureObservation({ stdoutBytes: result.stdout, stderrBytes: result.stderr, appPath: app }).signatureStrictValidated;
        }
        if (step.kind === "codesign-entitlements") {
          const expectedEntitlements = runtimeSnapshot.readBytes("native/macos/Resources/FormeCoreLocal.entitlements");
          try { state.entitlementsSha256 = validateMacOSExactEntitlements({ observedBytes: result.stdout, expectedBytes: expectedEntitlements }).entitlementsSha256; }
          finally { expectedEntitlements.fill(0); }
        }
        if (step.kind === "codesign-designated-requirement") {
          const expected = `designated => identifier \"org.chaostudio.forme.gate-b.core-local\" and certificate leaf = H\"${state.certificateSha1}\"`;
          const observation = validateMacOSDesignatedRequirementObservation({ stdoutBytes: result.stdout, stderrBytes: result.stderr, expectedRequirement: expected, expectedIdentifier: "org.chaostudio.forme.gate-b.core-local" });
          state.signatureMetadataValidated = true;
          state.designatedRequirementSha256 = observation.designatedRequirementSha256;
        }
        if (step.kind === "codesign-test-requirement") state.requirementTestValidated = true;
      } finally { result.stdout.fill(0); result.stderr.fill(0); }
      state.completed.add(step.kind);
      if (step.kind === "custom-keychain-delete") removeMacOSRuntimeMaterials(plan);
    }
    if (state.defaultPre !== state.defaultPost || state.searchPre !== state.searchPost) fail("MACOS_KEYCHAIN_METADATA_DRIFT", "RED");
    state.signingValidated = state.signatureStrictValidated === true && state.signatureMetadataValidated === true && typeof state.entitlementsSha256 === "string" && typeof state.designatedRequirementSha256 === "string" && state.requirementTestValidated === true;
    if (!state.helperEvidence || !state.feederEvidence || !state.preInventory || !state.postInventory || !state.certificateSha256 || !state.preSignExecutableSha256 || !state.runtimeIdentityValidated || !state.networkSampleZero || !state.signingValidated) fail("MACOS_PHYSICAL_EVIDENCE_INCOMPLETE", "RED");
    const counters = macOSCounterEvidence(state);
    if (canonicalJson(counters) !== canonicalJson({ customTemporaryKeychainOperations: plan.customTemporaryKeychainOperations, securityLifecycleSubcommands: plan.securityLifecycleSubcommands, identityInventoryReads: plan.identityInventoryReads, signingPrivateKeyUses: plan.signingPrivateKeyUses, defaultKeychainMetadataReads: plan.defaultKeychainMetadataReads, searchListMetadataReads: plan.searchListMetadataReads, securityCliInvocations: plan.securityCliInvocations, codesignCliInvocations: plan.codesignCliInvocations, opensslCliInvocations: plan.opensslCliInvocations })) fail("MACOS_PROCESS_COUNT_DRIFT", "RED");
    return Object.freeze({ status: state.helperEvidence.terminal === "approve_exact" ? "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY" : "YELLOW", reasonCode: state.helperEvidence.terminal === "approve_exact" ? "CLEAN_TRANSIENT_MECHANISM" : `HELPER_${String(state.helperEvidence.terminal).toUpperCase()}`, ...state.helperEvidence, outerCleanupPassed: true, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0, candidateBodyStderrBytes: 0, certificateSha256: state.certificateSha256, preSignExecutableSha256: state.preSignExecutableSha256, preSignPayloadInventorySha256: state.preInventory.sha256, signedBundleInventorySha256: state.postInventory.sha256, postSignExecutableSha256: state.postSignExecutableSha256, entitlementsSha256: state.entitlementsSha256, designatedRequirementSha256: state.designatedRequirementSha256, signatureStrictValidated: state.signatureStrictValidated, runtimeIdentityValidated: state.runtimeIdentityValidated, networkSampleZero: state.networkSampleZero, defaultKeychainMetadataEqual: state.defaultPre === state.defaultPost, searchListMetadataEqual: state.searchPre === state.searchPost, ...counters });
  } catch (error) {
    const cleaned = await cleanupMacOSAfterTerminal({ plan, state, journal, processPort, rootAuthority: macOSRootAuthority });
    macOSRootAuthority = null;
    const receipt = state.helperEvidence ?? { helperReceiptSha256: null, helperReceiptValidated: false, helperReasonCode: null, terminal: null, presenceCeremonies: null, presenceCeremoniesObserved: false, handoffCount: null, handoffCountObserved: false, helperControlledZeroizationPassed: null, helperCleanupPassed: null };
    const red = !cleaned || String(error?.verdict ?? "").startsWith("RED");
    return Object.freeze({
      status: !cleaned ? "RED_QUARANTINED" : red ? "RED" : "YELLOW", reasonCode: error?.code ?? "MACOS_PHYSICAL_TERMINAL",
      ...receipt, outerCleanupPassed: cleaned, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0,
      candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0, candidateBodyStderrBytes: 0,
      certificateSha256: state.certificateSha256, preSignExecutableSha256: state.preSignExecutableSha256, preSignPayloadInventorySha256: state.preInventory?.sha256 ?? null,
      signedBundleInventorySha256: state.postInventory?.sha256 ?? null, postSignExecutableSha256: state.postSignExecutableSha256,
      entitlementsSha256: state.entitlementsSha256 ?? null, designatedRequirementSha256: state.designatedRequirementSha256 ?? null,
      signatureStrictValidated: state.signatureStrictValidated ?? false, runtimeIdentityValidated: state.runtimeIdentityValidated, networkSampleZero: state.networkSampleZero,
      defaultKeychainMetadataEqual: state.defaultPre !== null && state.defaultPost !== null ? state.defaultPre === state.defaultPost : null,
      searchListMetadataEqual: state.searchPre !== null && state.searchPost !== null ? state.searchPre === state.searchPost : null,
      ...macOSCounterEvidence(state),
    });
  } finally {
    state.keychainPassword.fill(0); state.p12Password.fill(0); state.bindingCanary.fill(0);
    if (state.helper && groupExists(state.helper.pid) !== false) { destroyMacOSChildStreams(state.helper.child); await stopAndProveGroupAbsent(state.helper.pid); }
    if (macOSRootAuthority !== null) closeExactOwnedRootAuthority(macOSRootAuthority);
  }
}

export function authenticatedRetryJournal(parsed, runId, options = {}) {
  const defaultRoot = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  const root = options.root ?? defaultRoot;
  const journalPath = options.journalPath ?? path.join(root, "journal.v1.jsonl");
  if (!path.isAbsolute(root) || path.normalize(root) !== root || journalPath !== path.join(root, "journal.v1.jsonl")) fail("RETRY_JOURNAL_READ_AUTHORITY_INVALID", "RED_QUARANTINED");
  const rootStat = lstatIfPresent(root, "RETRY_CLEANUP_ROOT_UNREADABLE");
  if (rootStat === null) return Object.freeze({ root, journalPath, records: Object.freeze([]), alreadyAbsent: true, journalAlreadyRemoved: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.uid !== process.getuid() || (rootStat.mode & 0o777) !== 0o700 || fs.realpathSync(root) !== root) fail("RETRY_CLEANUP_ROOT_UNSAFE", "RED_QUARANTINED");
  const rootAuthority = openExactOwnedRootAuthority({ root, anchor: exactOwnedRootAnchor(root, "RETRY_CLEANUP_ROOT"), codePrefix: "RETRY_CLEANUP_ROOT" });
  let retainRootAuthority = false;
  try {
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "RETRY_CLEANUP_ROOT");
    if (lstatIfPresent(journalPath, "RETRY_JOURNAL_PATH_UNREADABLE") === null) {
    let rootFd = null;
    let primaryError = null;
    let journalReadCloseFaultCode = null;
    try {
      const before = fs.lstatSync(root, { bigint: true });
      rootFd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
      const opened = fs.fstatSync(rootFd, { bigint: true });
      const names = fs.readdirSync(root, { encoding: "buffer" });
      const after = fs.lstatSync(root, { bigint: true });
      if (names.length !== 0 || !sameStableBigIntIdentity(before, opened) || !sameStableBigIntIdentity(before, after)) fail("RETRY_JOURNAL_MISSING_WITH_RESOURCES", "RED_QUARANTINED");
    } catch (error) {
      primaryError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError("RETRY_EMPTY_ROOT_AUTHENTICATION_FAILED", "RED_QUARANTINED");
    } finally {
      if (rootFd !== null) try { fs.closeSync(rootFd); } catch { journalReadCloseFaultCode = "RETRY_EMPTY_ROOT_AUTHENTICATION_CLOSE_FAILED"; }
    }
    if (primaryError !== null) throw primaryError;
    retainRootAuthority = true;
    return Object.freeze({ root, journalPath, records: Object.freeze([]), alreadyAbsent: false, journalAlreadyRemoved: true, journalReadCloseFaultCode, rootAuthority });
    }
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "RETRY_CLEANUP_ROOT");
    const chain = snapshotNoSymlinkPathChain(journalPath, "RETRY_JOURNAL_PATH_UNSAFE");
    const stat = fs.lstatSync(journalPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.size < 0 || stat.size > 16_777_216) fail("RETRY_JOURNAL_UNSAFE", "RED_QUARANTINED");
  const fd = fs.openSync(journalPath, fs.constants.O_RDWR | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(stat.size);
  let authenticatedResult = null;
  let primaryError = null;
  let journalReadCloseFaultCode = null;
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("RETRY_JOURNAL_SHORT_READ", "RED_QUARANTINED");
      offset += count;
    }
    const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(journalPath);
    assertNoSymlinkPathChainStable(chain, "RETRY_JOURNAL_PATH_DRIFT");
    if (afterFd.dev !== stat.dev || afterFd.ino !== stat.ino || afterFd.size !== stat.size || Math.trunc(afterFd.mtimeMs) !== Math.trunc(stat.mtimeMs) || afterPath.dev !== stat.dev || afterPath.ino !== stat.ino || afterPath.size !== stat.size || afterPath.nlink !== 1) fail("RETRY_JOURNAL_TOCTOU", "RED_QUARANTINED");
    const prefixLength = bytes.length === 0 || bytes.at(-1) === 0x0a ? bytes.length : bytes.lastIndexOf(0x0a) + 1;
    let previous = null;
    const records = [];
    const keys = new Set(["schemaVersion", "sequence", "previousRecordSha256", "runId", "manifestSha256", "hostBindingId", "lane", "event", "commandShapeSha256", "processGroupId", "ownedResources", "terminalCode", "cleanupState"]);
    let cursor = 0;
    while (cursor < prefixLength) {
      const end = bytes.indexOf(0x0a, cursor);
      if (end < cursor || end >= prefixLength || end === cursor) fail("RETRY_JOURNAL_CHAIN_INVALID", "RED_QUARANTINED");
      const lineBytes = bytes.subarray(cursor, end);
      const line = lineBytes.toString("utf8");
      let value;
      try {
        value = parseStrictJson(line);
        exactObject(value, keys, "RETRY_JOURNAL_RECORD_SHAPE");
        if (line !== canonicalJson(value) || value.schemaVersion !== "r4_gate_b_physical_journal.v1" || value.sequence !== records.length || value.previousRecordSha256 !== previous || value.runId !== runId || value.manifestSha256 !== parsed.manifestSha256 || value.hostBindingId !== parsed.hostBindingId) throw new Error("invalid retry journal chain");
      } catch { fail("RETRY_JOURNAL_CHAIN_INVALID", "RED_QUARANTINED"); }
      previous = sha256(bytes.subarray(cursor, end + 1));
      records.push(Object.freeze(value));
      cursor = end + 1;
    }
    if (prefixLength !== bytes.length) {
      try {
        fs.ftruncateSync(fd, prefixLength);
        fs.fsyncSync(fd);
        const repairedFd = fs.fstatSync(fd); const repairedPath = fs.lstatSync(journalPath);
        if (repairedFd.dev !== stat.dev || repairedFd.ino !== stat.ino || repairedFd.size !== prefixLength || repairedFd.uid !== stat.uid || repairedFd.nlink !== 1 || (repairedFd.mode & 0o777) !== 0o600 || repairedPath.dev !== stat.dev || repairedPath.ino !== stat.ino || repairedPath.size !== prefixLength || repairedPath.uid !== stat.uid || repairedPath.nlink !== 1 || (repairedPath.mode & 0o777) !== 0o600) fail("RETRY_JOURNAL_TAIL_REPAIR_INVALID", "RED_QUARANTINED");
      } catch (error) {
        if (error instanceof PhysicalRunnerError) throw error;
        fail("RETRY_JOURNAL_TAIL_REPAIR_FAILED", "RED_QUARANTINED");
      }
    }
    authenticatedResult = Object.freeze({ root, journalPath, records: Object.freeze(records), alreadyAbsent: false, journalAlreadyRemoved: false });
  } catch (error) { primaryError = error; }
  finally {
    bytes.fill(0);
    try { fs.closeSync(fd); }
    catch { journalReadCloseFaultCode = "RETRY_JOURNAL_READ_CLOSE_FAILED"; }
  }
    if (primaryError !== null) throw primaryError;
    if (authenticatedResult === null) fail("RETRY_JOURNAL_READ_RESULT_MISSING", "RED_QUARANTINED");
    retainRootAuthority = true;
    return Object.freeze({ ...authenticatedResult, journalReadCloseFaultCode, rootAuthority });
  } finally {
    if (!retainRootAuthority) closeExactOwnedRootAuthority(rootAuthority);
  }
}

export function removeEmptyAuthenticatedRetryJournalRoot(authenticated) {
  if (authenticated?.alreadyAbsent !== false || !Array.isArray(authenticated.records) || authenticated.records.length !== 0 || !path.isAbsolute(authenticated.root) || path.normalize(authenticated.root) !== authenticated.root || authenticated.journalPath !== path.join(authenticated.root, "journal.v1.jsonl") || !exactOwnedRootAuthorities.has(authenticated.rootAuthority) || authenticated.rootAuthority.state.closed || typeof fs.constants.O_NOFOLLOW !== "number" || typeof fs.constants.O_DIRECTORY !== "number") fail("RETRY_EMPTY_JOURNAL_CLEANUP_AUTHORITY_INVALID", "RED_QUARANTINED");
  const root = authenticated.root;
  const journalPath = authenticated.journalPath;
  const parent = path.dirname(root);
  const inside = (anchor) => { const relative = path.relative(anchor, root); return relative !== "" && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`); };
  if (!inside(REPOSITORY_ROOT) && !inside("/private/tmp")) fail("RETRY_EMPTY_JOURNAL_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  const journalAlreadyRemoved = authenticated.journalAlreadyRemoved === true;
  const expectedName = Buffer.from("journal.v1.jsonl", "utf8");
  const parentChain = snapshotNoSymlinkPathChain(parent, "RETRY_EMPTY_JOURNAL_PARENT_UNSAFE");
  const parentIdentity = parentChain.at(-1);
  let rootFd = null;
  let journalFd = null;
  let journalIdentity = null;
  let cleanupStarted = false;
  let terminalError = null;
  const remember = (error, code) => { terminalError ??= error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError(code, "RED_QUARANTINED"); };
  try {
    assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_EMPTY_JOURNAL_ROOT");
    const rootBefore = fs.lstatSync(root, { bigint: true });
    if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink() || rootBefore.uid !== BigInt(process.getuid()) || (rootBefore.mode & 0o777n) !== 0o700n || fs.realpathSync(root) !== root) fail("RETRY_EMPTY_JOURNAL_ROOT_UNSAFE", "RED_QUARANTINED");
    rootFd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    const rootOpened = fs.fstatSync(rootFd, { bigint: true });
    if (!sameStableBigIntIdentity(rootBefore, rootOpened)) fail("RETRY_EMPTY_JOURNAL_ROOT_IDENTITY_DRIFT", "RED_QUARANTINED");
    const namesBefore = fs.readdirSync(root, { encoding: "buffer" });
    if (journalAlreadyRemoved ? namesBefore.length !== 0 : namesBefore.length !== 1 || !namesBefore[0].equals(expectedName)) fail("RETRY_EMPTY_JOURNAL_INVENTORY_INVALID", "RED_QUARANTINED");
    if (!journalAlreadyRemoved) {
      journalIdentity = fs.lstatSync(journalPath, { bigint: true });
      if (!journalIdentity.isFile() || journalIdentity.isSymbolicLink() || journalIdentity.uid !== BigInt(process.getuid()) || journalIdentity.nlink !== 1n || (journalIdentity.mode & 0o777n) !== 0o600n || journalIdentity.size !== 0n) fail("RETRY_EMPTY_JOURNAL_FILE_UNSAFE", "RED_QUARANTINED");
      journalFd = fs.openSync(journalPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const journalOpened = fs.fstatSync(journalFd, { bigint: true });
      const journalPreUnlink = fs.lstatSync(journalPath, { bigint: true });
      const rootPreUnlinkFd = fs.fstatSync(rootFd, { bigint: true });
      const rootPreUnlinkPath = fs.lstatSync(root, { bigint: true });
      const namesPreUnlink = fs.readdirSync(root, { encoding: "buffer" });
      if (!sameStableBigIntIdentity(journalIdentity, journalOpened) || !sameStableBigIntIdentity(journalIdentity, journalPreUnlink) || !sameStableBigIntIdentity(rootBefore, rootPreUnlinkFd) || !sameStableBigIntIdentity(rootBefore, rootPreUnlinkPath) || namesPreUnlink.length !== 1 || !namesPreUnlink[0].equals(expectedName)) fail("RETRY_EMPTY_JOURNAL_PRE_UNLINK_DRIFT", "RED_QUARANTINED");
      fs.unlinkSync(journalPath);
      cleanupStarted = true;
    } else cleanupStarted = true;

    try { fs.fsyncSync(rootFd); } catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_ROOT_FSYNC_FAILED"); }
    let safeToRemoveRoot = false;
    try {
      if (journalFd !== null) {
        const journalAfterUnlink = fs.fstatSync(journalFd, { bigint: true });
        if (journalIdentity === null || journalAfterUnlink.dev !== journalIdentity.dev || journalAfterUnlink.ino !== journalIdentity.ino || journalAfterUnlink.nlink !== 0n) fail("RETRY_EMPTY_JOURNAL_UNLINK_INVALID", "RED_QUARANTINED");
      }
      const rootAfterUnlinkFd = fs.fstatSync(rootFd, { bigint: true });
      const rootAfterUnlinkPath = fs.lstatSync(root, { bigint: true });
      if (fs.readdirSync(root, { encoding: "buffer" }).length !== 0 || !sameStableBigIntIdentity(rootAfterUnlinkFd, rootAfterUnlinkPath)) fail("RETRY_EMPTY_JOURNAL_UNLINK_INVALID", "RED_QUARANTINED");
      safeToRemoveRoot = true;
    } catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_POST_UNLINK_CHECK_FAILED"); }

    if (journalFd !== null) {
      try { fs.closeSync(journalFd); journalFd = null; }
      catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_CLOSE_FAILED"); }
    }
    if (safeToRemoveRoot) {
      try {
        assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_EMPTY_JOURNAL_ROOT");
        const rootPreRemoveFd = fs.fstatSync(rootFd, { bigint: true });
        const rootPreRemovePath = fs.lstatSync(root, { bigint: true });
        if (fs.readdirSync(root, { encoding: "buffer" }).length !== 0 || !sameStableBigIntIdentity(rootPreRemoveFd, rootPreRemovePath)) fail("RETRY_EMPTY_JOURNAL_PRE_RMDIR_DRIFT", "RED_QUARANTINED");
        fs.rmdirSync(root);
      } catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_RMDIR_FAILED"); }
    }
    const rootAbsent = lstatIfPresent(root, "RETRY_EMPTY_JOURNAL_ABSENCE_UNREADABLE") === null;
    if (!rootAbsent && terminalError === null) remember(new PhysicalRunnerError("RETRY_EMPTY_JOURNAL_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED"), "RETRY_EMPTY_JOURNAL_ROOT_ABSENCE_UNKNOWN");
    if (rootFd !== null) {
      try { fs.closeSync(rootFd); rootFd = null; }
      catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_ROOT_CLOSE_FAILED"); }
    }
    if (rootAbsent) {
      try {
        if (parentChain.length > 1) assertNoSymlinkPathChainStable(parentChain.slice(0, -1), "RETRY_EMPTY_JOURNAL_PARENT_DRIFT");
        const parentAfter = fs.lstatSync(parent);
        if (parentIdentity === undefined || parentAfter.isSymbolicLink() || !parentAfter.isDirectory() || parentAfter.dev !== parentIdentity.dev || parentAfter.ino !== parentIdentity.ino || parentAfter.mode !== parentIdentity.mode || parentAfter.uid !== parentIdentity.uid) fail("RETRY_EMPTY_JOURNAL_PARENT_DRIFT", "RED_QUARANTINED");
        fsyncDirectory(parent);
      } catch (error) { remember(error, "RETRY_EMPTY_JOURNAL_PARENT_FSYNC_FAILED"); }
    }
    if (terminalError !== null) throw terminalError;
    if (!rootAbsent) fail("RETRY_EMPTY_JOURNAL_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
    return Object.freeze({ status: "GREEN", retryRunRootAbsent: true, retryJournalAbsent: true, effectsAttempted: 0 });
  } catch (error) {
    if (error instanceof PhysicalRunnerError) throw error;
    fail(cleanupStarted ? "RETRY_EMPTY_JOURNAL_CLEANUP_FAILED" : "RETRY_EMPTY_JOURNAL_AUTHENTICATION_FAILED", "RED_QUARANTINED");
  } finally {
    if (journalFd !== null) try { fs.closeSync(journalFd); } catch { /* an earlier close error already prevents GREEN */ }
    if (rootFd !== null) try { fs.closeSync(rootFd); } catch { /* an earlier close error already prevents GREEN */ }
    closeExactOwnedRootAuthority(authenticated.rootAuthority, "RETRY_EMPTY_JOURNAL_AUTHORITY_CLOSE_FAILED");
  }
}

export function openAuthenticatedRetryJournalForAppend(authenticated, parsed, runId) {
  if (!exactOwnedRootAuthorities.has(authenticated?.rootAuthority) || authenticated.rootAuthority.state.closed) fail("RETRY_CLEANUP_ROOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_CLEANUP_ROOT");
  const chain = snapshotNoSymlinkPathChain(authenticated.journalPath, "RETRY_CLEANUP_JOURNAL_PATH_UNSAFE");
  const before = fs.lstatSync(authenticated.journalPath);
  const fd = fs.openSync(authenticated.journalPath, fs.constants.O_WRONLY | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW ?? 0));
  const after = fs.fstatSync(fd);
  const afterPath = fs.lstatSync(authenticated.journalPath);
  try { assertNoSymlinkPathChainStable(chain, "RETRY_CLEANUP_JOURNAL_PATH_DRIFT"); }
  catch (error) { fs.closeSync(fd); throw error; }
  if (!before.isFile() || before.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.uid !== process.getuid() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600 || afterPath.dev !== before.dev || afterPath.ino !== before.ino || afterPath.size !== before.size || afterPath.nlink !== 1) { fs.closeSync(fd); fail("RETRY_CLEANUP_JOURNAL_APPEND_UNSAFE", "RED_QUARANTINED"); }
  const records = [...authenticated.records];
  let sequence = records.length;
  let previous = null;
  if (records.length !== 0) {
    const previousBytes = Buffer.from(`${canonicalJson(records.at(-1))}\n`, "utf8");
    try { previous = sha256(previousBytes); } finally { previousBytes.fill(0); }
  }
  let closed = false;
  let poisoned = false;
  return Object.freeze({
    records() { return Object.freeze([...records]); },
    async append(partial) {
      if (closed) fail("RETRY_CLEANUP_JOURNAL_ALREADY_CLOSED", "RED_QUARANTINED");
      if (poisoned) fail("RETRY_CLEANUP_JOURNAL_APPEND_POISONED", "RED_QUARANTINED");
      assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_CLEANUP_ROOT");
      const record = Object.freeze({ schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous, runId, manifestSha256: parsed.manifestSha256, hostBindingId: parsed.hostBindingId, lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null, processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required" });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      try { writeAll(fd, bytes); fs.fsyncSync(fd); assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_CLEANUP_ROOT"); previous = sha256(bytes); records.push(record); sequence += 1; return record; }
      catch (error) { poisoned = true; throw error; }
      finally { bytes.fill(0); }
    },
    close() { if (!closed) { closed = true; fs.closeSync(fd); } },
  });
}

const RETRY_MACOS_NON_PROCESS_KINDS = new Set(["preflight", "write-openssl-config", "assemble-bundle", "pre-sign-inventory", "post-sign-inventory", "eof-commit-gate", "helper-receipt", "cleanup", "absence-proof"]);
const RETRY_MACOS_PROCESS_ORDER = Object.freeze(MACOS_PLAN_ORDER.filter((kind) => !RETRY_MACOS_NON_PROCESS_KINDS.has(kind)));
const RETRY_MACOS_PROCESS_KINDS = new Set(RETRY_MACOS_PROCESS_ORDER.filter((kind) => !["helper-spawn", "feeder-spawn"].includes(kind)));
const RETRY_MACOS_MUTATION_KINDS = new Set(["custom-keychain-create", "custom-keychain-unlock", "custom-keychain-import", "custom-keychain-partition", "binding-canary-add", "binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete"]);
const RETRY_CLEANUP_PROCESS_KINDS = new Set(["cleanup-container-inspect", "cleanup-container-remove", "cleanup-container-absence", "cleanup-volume-inspect", "cleanup-volume-remove", "cleanup-volume-absence", "binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete", "default-keychain-post", "search-list-post"]);
export function validateRetryJournalForCleanup(records, expectedRuntimeDependencyAggregateSha256 = null) {
  if (!Array.isArray(records) || records.length < 1) fail("RETRY_CLEANUP_JOURNAL_EMPTY", "RED_QUARANTINED");
  if (expectedRuntimeDependencyAggregateSha256 !== null && !SHA.test(expectedRuntimeDependencyAggregateSha256)) fail("RETRY_CLEANUP_RUNTIME_SNAPSHOT_AUTHORITY_INVALID", "RED_QUARANTINED");
  const first = records[0];
  if (first.lane !== "runner" || first.event !== "retry-authority-revalidated" || !SHA.test(first.commandShapeSha256) || first.processGroupId !== null || canonicalJson(first.ownedResources) !== canonicalJson(["retry-run-root"]) || first.terminalCode !== null || first.cleanupState !== "required") fail("RETRY_CLEANUP_AUTHORITY_RECORD_INVALID", "RED_QUARANTINED");
  const intents = new Map();
  const unstartedSupervisorStarts = new Map();
  const directStartKeys = new Set();
  const groups = new Map();
  const successfulProcessKinds = new Set();
  const postgresMarkerKinds = Object.freeze(["capsule-revalidate", "container-created-marker", "container-started-marker", "postgres-absence-proof"]);
  const macOSObservationKinds = Object.freeze(["default-keychain-pre", "search-list-pre", "default-keychain-post", "search-list-post"]);
  const blockedStartSlotShapeSha256 = sha256(Buffer.from("r4-gate-b-blocked-start-slot-root.v1\n", "utf8"));
  const postgresRunRootShapeSha256 = sha256(Buffer.from(`postgres-run-root:${first.runId}\n`, "utf8"));
  const macOSRunRootShapeSha256 = sha256(Buffer.from(`macos-run-root:${first.runId}\n`, "utf8"));
  const macOSPreflightShapeSha256 = sha256(Buffer.from("macos-preflight-v1\n", "utf8"));
  const retryCleanupShapeSha256 = sha256(Buffer.from("retry-cleanup-v1\n", "utf8"));
  let runtimeSnapshotIntentSha256 = null;
  let runtimeSnapshotObserved = false;
  let slotRootIntent = false;
  let slotRootObserved = false;
  let postgresRunRootPhase = 0;
  let postgresMarkerCursor = 0;
  let postgresAbsenceProofObserved = false;
  let postgresContainerEverCreated = false;
  let postgresVolumeEverCreated = false;
  let postgresContainerDirty = false;
  let postgresVolumeDirty = false;
  let postgresRemovalSuffixPhase = 0;
  let codexProcessIntentCursor = 0;
  let codexCompletedCursor = 0;
  let codexLifecycleKey = null;
  let macOSRunRootPhase = 0;
  let macOSObservationCursor = 0;
  let macOSProcessIntentCursor = 0;
  let macOSOrdinaryLifecycleKey = null;
  let macOSHelperLifecycle = "none";
  let macOSFeederLifecycle = "none";
  let macOSKeychainDirty = false;
  let macOSIdentityDirty = false;
  let macOSCanaryDirty = false;
  let macOSCleanupAbsenceObserved = false;
  let macOSMutationEpoch = 0;
  let macOSMutationSeen = false;
  const macOSObservationSha256 = new Map();
  const macOSObservationEpoch = new Map();
  let processRecordSeen = false;
  let laterThanPostgresProcessSeen = false;
  let macOSProcessSeen = false;
  let cleanupProcessSeen = false;
  let cleanupCheckpointSeen = false;
  const pendingIntentCount = () => [...intents.values()].reduce((total, count) => total + count, 0);
  const allGroupsAbsent = () => [...groups.values()].every((state) => state.absent);
  const macOSExternalEffectsAbsentNow = () => !macOSKeychainDirty && !macOSIdentityDirty && !macOSCanaryDirty;
  const macOSMetadataRestoredNow = () => !macOSMutationSeen || (macOSObservationSha256.get("default-keychain-pre") === macOSObservationSha256.get("default-keychain-post")
    && macOSObservationSha256.get("search-list-pre") === macOSObservationSha256.get("search-list-post")
    && macOSObservationEpoch.get("default-keychain-post") === macOSMutationEpoch
    && macOSObservationEpoch.get("search-list-post") === macOSMutationEpoch);
  const exactNonProcess = (record, { lane, event, commandShapeSha256, ownedResources, terminalCode, cleanupState }) => record.lane === lane
    && record.event === event
    && record.processGroupId === null
    && record.commandShapeSha256 === commandShapeSha256
    && canonicalJson(record.ownedResources) === canonicalJson(ownedResources)
    && record.terminalCode === terminalCode
    && record.cleanupState === cleanupState;
  const validateNonProcess = (record) => {
    if (record.processGroupId !== null || cleanupCheckpointSeen) return false;
    if (record.lane === "runner" && record.event === "retry-authority-revalidated") return false;
    if (record.lane === "runner" && record.event === "runtime-snapshot-intent") {
      if (processRecordSeen || runtimeSnapshotIntentSha256 !== null || runtimeSnapshotObserved || slotRootIntent || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson(["runtime-snapshot"]) || record.terminalCode !== null || record.cleanupState !== "required") fail("RETRY_CLEANUP_RUNTIME_SNAPSHOT_INTENT_INVALID", "RED_QUARANTINED");
      runtimeSnapshotIntentSha256 = record.commandShapeSha256;
      return true;
    }
    if (record.lane === "runner" && record.event === "runtime-snapshot-observed") {
      const fileCount = typeof record.terminalCode === "string" && /^[1-9][0-9]*$/u.test(record.terminalCode) ? Number(record.terminalCode) : NaN;
      if (processRecordSeen || runtimeSnapshotIntentSha256 === null || runtimeSnapshotObserved || slotRootIntent || record.commandShapeSha256 !== runtimeSnapshotIntentSha256 || canonicalJson(record.ownedResources) !== canonicalJson(["runtime-snapshot"]) || !Number.isSafeInteger(fileCount) || fileCount < 1 || record.cleanupState !== "required") fail("RETRY_CLEANUP_RUNTIME_SNAPSHOT_OBSERVATION_INVALID", "RED_QUARANTINED");
      runtimeSnapshotObserved = true;
      return true;
    }
    if (record.lane === "runner" && record.event === "intent:blocked-start-slot-root") {
      if (processRecordSeen || !runtimeSnapshotObserved || slotRootIntent || !exactNonProcess(record, { lane: "runner", event: "intent:blocked-start-slot-root", commandShapeSha256: blockedStartSlotShapeSha256, ownedResources: ["blocked-start-slot-root"], terminalCode: null, cleanupState: "required" })) fail("RETRY_CLEANUP_SLOT_ROOT_INTENT_INVALID", "RED_QUARANTINED");
      slotRootIntent = true;
      return true;
    }
    if (record.lane === "runner" && record.event === "observed:blocked-start-slot-root") {
      if (processRecordSeen || !slotRootIntent || slotRootObserved || !exactNonProcess(record, { lane: "runner", event: "observed:blocked-start-slot-root", commandShapeSha256: blockedStartSlotShapeSha256, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED", cleanupState: "required" })) fail("RETRY_CLEANUP_SLOT_ROOT_OBSERVATION_INVALID", "RED_QUARANTINED");
      slotRootObserved = true;
      return true;
    }
    if (record.lane === "postgres" && record.event === RETRY_CLEANUP_ABSENCE_MARKERS.postgres.event) {
      if (postgresAbsenceProofObserved || postgresContainerDirty || postgresVolumeDirty || pendingIntentCount() !== 0 || !allGroupsAbsent() || !exactRetryCleanupAbsenceMarker(record, RETRY_CLEANUP_ABSENCE_MARKERS.postgres)) fail("RETRY_CLEANUP_POSTGRES_ABSENCE_MARKER_INVALID", "RED_QUARANTINED");
      postgresAbsenceProofObserved = true;
      return true;
    }
    if (record.lane === "postgres" && typeof record.event === "string" && record.event.startsWith("marker:")) {
      if (record.event === "marker:run-root-target-absent") {
        if (!slotRootObserved || postgresRunRootPhase !== 0 || postgresMarkerCursor !== 0 || laterThanPostgresProcessSeen || cleanupProcessSeen || !exactNonProcess(record, { lane: "postgres", event: record.event, commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"], terminalCode: null, cleanupState: "required" })) fail("RETRY_CLEANUP_POSTGRES_RUN_ROOT_TARGET_INVALID", "RED_QUARANTINED");
        postgresRunRootPhase = 1;
        return true;
      }
      if (record.event === "marker:run-root-created") {
        if (postgresRunRootPhase !== 1 || postgresMarkerCursor !== 0 || laterThanPostgresProcessSeen || cleanupProcessSeen || !exactNonProcess(record, { lane: "postgres", event: record.event, commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"], terminalCode: "CREATED", cleanupState: "required" })) fail("RETRY_CLEANUP_POSTGRES_RUN_ROOT_CREATED_INVALID", "RED_QUARANTINED");
        postgresRunRootPhase = 2;
        return true;
      }
      const kind = record.event.slice("marker:".length);
      const expectedKind = postgresMarkerKinds[postgresMarkerCursor];
      const prerequisiteKinds = kind === "container-created-marker" ? ["container-create"] : kind === "container-started-marker" ? ["container-start"] : [];
      const absenceProofInvalid = kind === "postgres-absence-proof" && (!postgresContainerEverCreated || !postgresVolumeEverCreated || postgresContainerDirty || postgresVolumeDirty || postgresRemovalSuffixPhase !== 3 || pendingIntentCount() !== 0 || !allGroupsAbsent());
      if (!slotRootObserved || postgresRunRootPhase !== 2 || laterThanPostgresProcessSeen || macOSRunRootPhase !== 0 || cleanupProcessSeen || kind !== expectedKind || !exactNonProcess(record, { lane: "postgres", event: `marker:${kind}`, commandShapeSha256: sha256(Buffer.from(kind, "utf8")), ownedResources: ["postgres-container", "postgres-volume", "postgres-workers"], terminalCode: null, cleanupState: "required" }) || prerequisiteKinds.some((processKind) => !successfulProcessKinds.has(`postgres:${processKind}`)) || absenceProofInvalid) fail("RETRY_CLEANUP_POSTGRES_MARKER_INVALID", "RED_QUARANTINED");
      postgresMarkerCursor += 1;
      if (kind === "postgres-absence-proof") postgresAbsenceProofObserved = true;
      return true;
    }
    if (record.lane === "macos" && record.event === RETRY_CLEANUP_ABSENCE_MARKERS.macos.event) {
      if (!postgresAbsenceProofObserved || macOSCleanupAbsenceObserved || !macOSExternalEffectsAbsentNow() || !macOSMetadataRestoredNow() || pendingIntentCount() !== 0 || !allGroupsAbsent() || !exactRetryCleanupAbsenceMarker(record, RETRY_CLEANUP_ABSENCE_MARKERS.macos)) fail("RETRY_CLEANUP_MACOS_ABSENCE_MARKER_INVALID", "RED_QUARANTINED");
      macOSCleanupAbsenceObserved = true;
      return true;
    }
    if (record.lane === "macos" && typeof record.event === "string" && record.event.startsWith("marker:")) {
      if (!slotRootObserved || cleanupProcessSeen) fail("RETRY_CLEANUP_MACOS_MARKER_INVALID", "RED_QUARANTINED");
      if (record.event === "marker:run-root-target-absent") {
        if (!postgresAbsenceProofObserved || codexCompletedCursor !== CODEX_PROCESS_KINDS.length || codexProcessIntentCursor !== CODEX_PROCESS_KINDS.length || codexLifecycleKey !== null || macOSRunRootPhase !== 0 || macOSProcessSeen || !exactNonProcess(record, { lane: "macos", event: record.event, commandShapeSha256: macOSRunRootShapeSha256, ownedResources: ["macos-run-root"], terminalCode: null, cleanupState: "required" })) fail("RETRY_CLEANUP_MACOS_RUN_ROOT_TARGET_INVALID", "RED_QUARANTINED");
        macOSRunRootPhase = 1;
        return true;
      }
      if (record.event === "marker:run-root-created") {
        if (macOSRunRootPhase !== 1 || macOSProcessSeen || !exactNonProcess(record, { lane: "macos", event: record.event, commandShapeSha256: macOSRunRootShapeSha256, ownedResources: ["macos-run-root"], terminalCode: "CREATED", cleanupState: "required" })) fail("RETRY_CLEANUP_MACOS_RUN_ROOT_CREATED_INVALID", "RED_QUARANTINED");
        macOSRunRootPhase = 2;
        return true;
      }
      if (record.event === "marker:preflight") {
        if (macOSRunRootPhase !== 2 || macOSProcessSeen || !exactNonProcess(record, { lane: "macos", event: record.event, commandShapeSha256: macOSPreflightShapeSha256, ownedResources: ["macos-run-root"], terminalCode: null, cleanupState: "required" })) fail("RETRY_CLEANUP_MACOS_PREFLIGHT_INVALID", "RED_QUARANTINED");
        macOSRunRootPhase = 3;
        return true;
      }
      fail("RETRY_CLEANUP_MACOS_MARKER_INVALID", "RED_QUARANTINED");
    }
    if (record.lane === "macos" && typeof record.event === "string" && record.event.startsWith("observation:")) {
      const kind = record.event.slice("observation:".length);
      if (macOSRunRootPhase !== 3 || cleanupProcessSeen || kind !== macOSObservationKinds[macOSObservationCursor] || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson([]) || record.terminalCode !== "OBSERVED" || record.cleanupState !== "required" || !successfulProcessKinds.has(`macos:${kind}`)) fail("RETRY_CLEANUP_MACOS_OBSERVATION_INVALID", "RED_QUARANTINED");
      macOSObservationSha256.set(kind, record.commandShapeSha256);
      macOSObservationEpoch.set(kind, macOSMutationEpoch);
      macOSObservationCursor += 1;
      return true;
    }
    if (record.lane === "cleanup" && ["observation:macos-default-keychain-post", "observation:macos-search-list-post"].includes(record.event)) {
      const kind = record.event === "observation:macos-default-keychain-post" ? "default-keychain-post" : "search-list-post";
      if (macOSCleanupAbsenceObserved || kind !== macOSObservationKinds[macOSObservationCursor] || !SHA.test(record.commandShapeSha256) || canonicalJson(record.ownedResources) !== canonicalJson([]) || record.terminalCode !== "OBSERVED" || record.cleanupState !== "required" || !successfulProcessKinds.has(`cleanup:${kind}`)) fail("RETRY_CLEANUP_MACOS_OBSERVATION_INVALID", "RED_QUARANTINED");
      macOSObservationSha256.set(kind, record.commandShapeSha256);
      macOSObservationEpoch.set(kind, macOSMutationEpoch);
      macOSObservationCursor += 1;
      return true;
    }
    if (record.lane === "cleanup" && ["retry-cleanup-observed", "retry-cleanup-after-terminal"].includes(record.event)) {
      const cleanupGreenIncomplete = !slotRootObserved || !postgresAbsenceProofObserved || codexCompletedCursor !== CODEX_PROCESS_KINDS.length || codexProcessIntentCursor !== CODEX_PROCESS_KINDS.length || codexLifecycleKey !== null || !macOSCleanupAbsenceObserved || !macOSExternalEffectsAbsentNow() || !macOSMetadataRestoredNow();
      if (!exactNonProcess(record, { lane: "cleanup", event: record.event, commandShapeSha256: retryCleanupShapeSha256, ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" }) || cleanupGreenIncomplete || pendingIntentCount() !== 0 || !allGroupsAbsent()) fail("RETRY_CLEANUP_CHECKPOINT_INVALID", "RED_QUARANTINED");
      cleanupCheckpointSeen = true;
      return true;
    }
    return false;
  };
  const classify = (record) => {
    const match = /^(intent|started|terminal|cleanup-observed-absent):([A-Za-z0-9-]+)$/u.exec(record.event);
    if (!match) return null;
    const [, phase, kind] = match;
    if (kind === "blocked-start-slot-root") return null;
    let resources;
    let allowed = false;
    if (record.lane === "codex" && CODEX_PROCESS_KINDS.includes(kind)) { resources = ["codex-process-group", "codex-stdio"]; allowed = true; }
    else if (record.lane === "postgres" && /^race-(?:CONTROLLER|A|B|OBSERVER)$/u.test(kind)) { resources = ["postgres-race-process-group"]; allowed = true; }
    else if (record.lane === "postgres" && /^(?:image-binding-revalidate|container-collision-check|volume-collision-check|volume-create|container-create|container-start|readiness|container-remove|volume-remove|baseline-(?:bootstrap|migration|basisErrors|basis|verify|happy|errors|rollback)|nonrace-(?:bootstrap|migration|basis|public-boundaries|rollback)|C\d{2}-[AB]-[AB]-(?:bootstrap|migration|basis|setup|recover-(?:winner|loser)|verify|rollback)|final-(?:bootstrap|migration|basis|verify|rollback))$/u.test(kind)) { resources = ["postgres-process-group"]; allowed = true; }
    else if (record.lane === "macos" && RETRY_MACOS_PROCESS_KINDS.has(kind)) { resources = ["macos-process-group"]; allowed = true; }
    else if (record.lane === "macos" && kind === "helper-spawn") { resources = MACOS_HELPER_PROCESS_RESOURCES; allowed = true; }
    else if (record.lane === "macos" && kind === "feeder-spawn") { resources = MACOS_FEEDER_PROCESS_RESOURCES; allowed = true; }
    else if (record.lane === "cleanup" && RETRY_CLEANUP_PROCESS_KINDS.has(kind)) { resources = ["cleanup-process-group"]; allowed = true; }
    if (!allowed || canonicalJson(record.ownedResources) !== canonicalJson(resources) || !SHA.test(record.commandShapeSha256)) fail("RETRY_CLEANUP_PROCESS_RECORD_DENIED", "RED_QUARANTINED");
    const family = record.lane === "codex" ? "codex" : record.lane === "postgres" ? "postgres" : record.lane === "macos" ? "macos" : record.lane === "cleanup" ? "cleanup" : null;
    const genericBlockedStart = !(record.lane === "macos" && ["helper-spawn", "feeder-spawn"].includes(kind));
    return Object.freeze({ phase, kind, lane: record.lane, family, genericBlockedStart, commandShapeSha256: record.commandShapeSha256, ownedResources: Object.freeze(resources), key: `${record.lane}:${kind}:${record.commandShapeSha256}` });
  };
  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];
    if (cleanupCheckpointSeen) fail("RETRY_CLEANUP_RECORD_AFTER_CHECKPOINT", "RED_QUARANTINED");
    const unifiedCleanupGreen = record.lane === "cleanup" && ["retry-cleanup-observed", "retry-cleanup-after-terminal"].includes(record.event);
    if (macOSCleanupAbsenceObserved && !unifiedCleanupGreen) fail("RETRY_CLEANUP_RECORD_AFTER_MACOS_ABSENCE", "RED_QUARANTINED");
    if (postgresAbsenceProofObserved && record.lane === "postgres") fail("RETRY_CLEANUP_RECORD_AFTER_POSTGRES_ABSENCE", "RED_QUARANTINED");
    const descriptor = classify(record);
    if (descriptor === null) { if (!validateNonProcess(record)) fail("RETRY_CLEANUP_JOURNAL_EVENT_DENIED", "RED_QUARANTINED"); continue; }
    if (!slotRootObserved || (cleanupProcessSeen && descriptor.lane !== "cleanup")) fail("RETRY_CLEANUP_PROCESS_PHASE_INVALID", "RED_QUARANTINED");
    if (descriptor.lane === "postgres" && (postgresRunRootPhase !== 2 || postgresAbsenceProofObserved || laterThanPostgresProcessSeen || cleanupProcessSeen)) fail("RETRY_CLEANUP_POSTGRES_PROCESS_PHASE_INVALID", "RED_QUARANTINED");
    if (descriptor.lane === "postgres" && (postgresRemovalSuffixPhase === 3 || (postgresRemovalSuffixPhase === 1 && !(descriptor.phase === "intent" && descriptor.kind === "volume-remove")) || (postgresRemovalSuffixPhase === 2 && descriptor.kind !== "volume-remove"))) fail("RETRY_CLEANUP_POSTGRES_REMOVAL_SUFFIX_INVALID", "RED_QUARANTINED");
    if (descriptor.lane === "codex" && (!postgresAbsenceProofObserved || macOSRunRootPhase !== 0 || cleanupProcessSeen)) fail("RETRY_CLEANUP_CODEX_PROCESS_PHASE_INVALID", "RED_QUARANTINED");
    if (descriptor.lane === "macos" && macOSRunRootPhase !== 3) fail("RETRY_CLEANUP_MACOS_PROCESS_WITHOUT_RUN_ROOT", "RED_QUARANTINED");
    if (descriptor.lane === "cleanup" && macOSCleanupAbsenceObserved) fail("RETRY_CLEANUP_PROCESS_AFTER_MACOS_ABSENCE", "RED_QUARANTINED");
    if (descriptor.lane === "cleanup" && postgresAbsenceProofObserved && descriptor.kind.startsWith("cleanup-container")) fail("RETRY_CLEANUP_PROCESS_AFTER_POSTGRES_ABSENCE", "RED_QUARANTINED");
    if (descriptor.lane === "cleanup" && postgresAbsenceProofObserved && descriptor.kind.startsWith("cleanup-volume")) fail("RETRY_CLEANUP_PROCESS_AFTER_POSTGRES_ABSENCE", "RED_QUARANTINED");
    processRecordSeen = true;
    if (["codex", "macos", "cleanup"].includes(descriptor.lane)) laterThanPostgresProcessSeen = true;
    if (descriptor.lane === "macos") macOSProcessSeen = true;
    if (descriptor.lane === "cleanup") cleanupProcessSeen = true;
    if (descriptor.phase === "intent") {
      if (record.processGroupId !== null || record.terminalCode !== null || record.cleanupState !== "required") fail("RETRY_CLEANUP_PROCESS_INTENT_INVALID", "RED_QUARANTINED");
      if (descriptor.lane === "postgres") {
        if (descriptor.kind === "volume-create") { postgresVolumeEverCreated = true; postgresVolumeDirty = true; }
        if (descriptor.kind === "container-create") { postgresContainerEverCreated = true; postgresContainerDirty = true; }
        if (descriptor.kind === "container-start") postgresContainerDirty = true;
        if (descriptor.kind === "volume-remove" && postgresRemovalSuffixPhase === 1) postgresRemovalSuffixPhase = 2;
      }
      if (descriptor.lane === "codex") {
        if (descriptor.kind !== CODEX_PROCESS_KINDS[codexProcessIntentCursor] || codexProcessIntentCursor !== codexCompletedCursor || codexLifecycleKey !== null) fail("RETRY_CLEANUP_CODEX_PROCESS_ORDER_INVALID", "RED_QUARANTINED");
        codexProcessIntentCursor += 1;
        codexLifecycleKey = descriptor.key;
      }
      if (descriptor.lane === "macos") {
        if (descriptor.kind !== RETRY_MACOS_PROCESS_ORDER[macOSProcessIntentCursor]) fail("RETRY_CLEANUP_MACOS_PROCESS_ORDER_INVALID", "RED_QUARANTINED");
        macOSProcessIntentCursor += 1;
        if (descriptor.kind === "helper-spawn") {
          if (macOSHelperLifecycle !== "none" || macOSOrdinaryLifecycleKey !== null) fail("RETRY_CLEANUP_MACOS_HELPER_SEQUENCE_INVALID", "RED_QUARANTINED");
          macOSHelperLifecycle = "intent";
        } else if (descriptor.kind === "feeder-spawn") {
          if (macOSHelperLifecycle !== "started" || macOSFeederLifecycle !== "none" || macOSOrdinaryLifecycleKey !== null) fail("RETRY_CLEANUP_MACOS_FEEDER_SEQUENCE_INVALID", "RED_QUARANTINED");
          macOSFeederLifecycle = "intent";
        } else {
          if (macOSFeederLifecycle !== "none" && (macOSHelperLifecycle !== "absent" || macOSFeederLifecycle !== "absent")) fail("RETRY_CLEANUP_MACOS_DIRECT_PROCESS_OVERLAP", "RED_QUARANTINED");
          if (macOSOrdinaryLifecycleKey !== null) fail("RETRY_CLEANUP_MACOS_PROCESS_OVERLAP", "RED_QUARANTINED");
          macOSOrdinaryLifecycleKey = descriptor.key;
        }
      }
      if (descriptor.lane === "cleanup" && (["intent", "started"].includes(macOSHelperLifecycle) || ["intent", "started"].includes(macOSFeederLifecycle))) fail("RETRY_CLEANUP_MACOS_DIRECT_PROCESS_OVERLAP", "RED_QUARANTINED");
      if (["macos", "cleanup"].includes(descriptor.lane) && RETRY_MACOS_MUTATION_KINDS.has(descriptor.kind)) {
        macOSMutationSeen = true;
        macOSMutationEpoch += 1;
        if (descriptor.kind === "custom-keychain-create") macOSKeychainDirty = true;
        if (descriptor.kind === "custom-keychain-import") macOSIdentityDirty = true;
        if (descriptor.kind === "binding-canary-add") macOSCanaryDirty = true;
      }
      intents.set(descriptor.key, (intents.get(descriptor.key) ?? 0) + 1);
      if (descriptor.genericBlockedStart) {
        const pending = unstartedSupervisorStarts.get(descriptor.key) ?? [];
        pending.push(Object.freeze({ startSequence: record.sequence, family: descriptor.family, lane: descriptor.lane, logicalId: descriptor.kind, commandShapeSha256: descriptor.commandShapeSha256, ownedResources: descriptor.ownedResources }));
        unstartedSupervisorStarts.set(descriptor.key, pending);
      } else directStartKeys.add(descriptor.key);
      continue;
    }
    const intentCount = intents.get(descriptor.key) ?? 0;
    if (!Number.isSafeInteger(record.processGroupId) || record.processGroupId <= 1) fail("RETRY_CLEANUP_PROCESS_WITHOUT_AUTHORITY", "RED_QUARANTINED");
    if (descriptor.phase === "started") {
      if (intentCount < 1 || groups.has(record.processGroupId) || record.terminalCode !== null || record.cleanupState !== "required") fail("RETRY_CLEANUP_PROCESS_START_INVALID", "RED_QUARANTINED");
      if (descriptor.lane === "macos" && descriptor.kind === "helper-spawn" && macOSHelperLifecycle !== "intent") fail("RETRY_CLEANUP_MACOS_HELPER_SEQUENCE_INVALID", "RED_QUARANTINED");
      if (descriptor.lane === "macos" && descriptor.kind === "feeder-spawn" && macOSFeederLifecycle !== "intent") fail("RETRY_CLEANUP_MACOS_FEEDER_SEQUENCE_INVALID", "RED_QUARANTINED");
      if (descriptor.lane === "macos" && !["helper-spawn", "feeder-spawn"].includes(descriptor.kind) && macOSOrdinaryLifecycleKey !== descriptor.key) fail("RETRY_CLEANUP_MACOS_PROCESS_SEQUENCE_INVALID", "RED_QUARANTINED");
      if (descriptor.lane === "codex" && codexLifecycleKey !== descriptor.key) fail("RETRY_CLEANUP_CODEX_PROCESS_SEQUENCE_INVALID", "RED_QUARANTINED");
      intents.set(descriptor.key, intentCount - 1);
      if (descriptor.genericBlockedStart) {
        const pending = unstartedSupervisorStarts.get(descriptor.key);
        if (!Array.isArray(pending) || pending.length < 1) fail("RETRY_CLEANUP_SUPERVISOR_INTENT_MISSING", "RED_QUARANTINED");
        pending.shift();
        if (pending.length === 0) unstartedSupervisorStarts.delete(descriptor.key);
      }
      groups.set(record.processGroupId, { key: descriptor.key, descriptor, terminal: false, terminalCode: null, absent: false, recovered: false });
      if (descriptor.lane === "macos" && descriptor.kind === "helper-spawn") macOSHelperLifecycle = "started";
      if (descriptor.lane === "macos" && descriptor.kind === "feeder-spawn") macOSFeederLifecycle = "started";
    } else if (descriptor.phase === "terminal") {
      const state = groups.get(record.processGroupId);
      const terminalCodeValid = record.terminalCode === "NO_TERMINAL" || (typeof record.terminalCode === "string" && /^(?:-1|0|[1-9][0-9]{0,2})$/u.test(record.terminalCode) && Number(record.terminalCode) <= 255);
      if (state === undefined || state.key !== descriptor.key || state.terminal || !terminalCodeValid || !["observed-absent", "quarantined"].includes(record.cleanupState)) fail("RETRY_CLEANUP_PROCESS_TERMINAL_INVALID", "RED_QUARANTINED");
      state.terminal = true;
      state.terminalCode = record.terminalCode;
      state.absent = record.cleanupState === "observed-absent";
      if (state.absent && record.terminalCode === "0") successfulProcessKinds.add(`${descriptor.lane}:${descriptor.kind}`);
    } else {
      let state = groups.get(record.processGroupId);
      if (record.cleanupState !== "observed-absent" || record.terminalCode !== "ABSENT") fail("RETRY_CLEANUP_PROCESS_RECOVERY_INVALID", "RED_QUARANTINED");
      if (state === undefined) {
        if (intentCount < 1) fail("RETRY_CLEANUP_PROCESS_RECOVERY_WITHOUT_INTENT", "RED_QUARANTINED");
        intents.set(descriptor.key, intentCount - 1);
        if (descriptor.genericBlockedStart) {
          const pending = unstartedSupervisorStarts.get(descriptor.key);
          if (!Array.isArray(pending) || pending.length < 1) fail("RETRY_CLEANUP_PROCESS_RECOVERY_SLOT_MISSING", "RED_QUARANTINED");
          pending.shift(); if (pending.length === 0) unstartedSupervisorStarts.delete(descriptor.key);
        }
        state = { key: descriptor.key, descriptor, terminal: true, terminalCode: "ABSENT", absent: true, recovered: true };
        groups.set(record.processGroupId, state);
      } else {
        if (state.key !== descriptor.key || state.recovered) fail("RETRY_CLEANUP_PROCESS_RECOVERY_DUPLICATE", "RED_QUARANTINED");
        state.terminal = true;
        state.absent = true;
        state.recovered = true;
      }
    }
    const processState = groups.get(record.processGroupId);
    if (descriptor.lane === "postgres" && descriptor.phase === "terminal") {
      if (["container-create", "container-start"].includes(descriptor.kind)) postgresContainerDirty = true;
      if (descriptor.kind === "volume-create") postgresVolumeDirty = true;
      if (processState?.absent === true && record.terminalCode === "0" && descriptor.kind === "container-remove") { postgresContainerDirty = false; postgresRemovalSuffixPhase = 1; }
      if (processState?.absent === true && record.terminalCode === "0" && descriptor.kind === "volume-remove") { postgresVolumeDirty = false; if (postgresRemovalSuffixPhase === 2) postgresRemovalSuffixPhase = 3; }
    }
    if (["macos", "cleanup"].includes(descriptor.lane) && descriptor.phase === "terminal") {
      if (descriptor.kind === "custom-keychain-create") macOSKeychainDirty = true;
      if (descriptor.kind === "custom-keychain-import") macOSIdentityDirty = true;
      if (descriptor.kind === "binding-canary-add") macOSCanaryDirty = true;
      if (processState?.absent === true && ["0", "44"].includes(record.terminalCode)) {
        if (descriptor.kind === "binding-canary-delete") macOSCanaryDirty = false;
        if (descriptor.kind === "identity-delete") macOSIdentityDirty = false;
        if (descriptor.kind === "custom-keychain-delete") { macOSKeychainDirty = false; macOSIdentityDirty = false; macOSCanaryDirty = false; }
      }
    }
    if (descriptor.lane === "cleanup" && descriptor.phase === "terminal" && processState?.absent === true && record.terminalCode === "1") {
      if (["cleanup-container-inspect", "cleanup-container-absence"].includes(descriptor.kind)) postgresContainerDirty = false;
      if (["cleanup-volume-inspect", "cleanup-volume-absence"].includes(descriptor.kind)) postgresVolumeDirty = false;
    }
    if (descriptor.lane === "codex" && processState?.absent === true) {
      if (descriptor.phase === "terminal" && record.terminalCode === "0" && CODEX_PROCESS_KINDS[codexCompletedCursor] === descriptor.kind) codexCompletedCursor += 1;
      codexLifecycleKey = null;
    }
    if (descriptor.lane === "macos" && processState?.absent === true) {
      if (descriptor.kind === "helper-spawn") {
        if (descriptor.phase === "terminal" && macOSFeederLifecycle !== "absent") fail("RETRY_CLEANUP_MACOS_HELPER_BEFORE_FEEDER_TERMINAL", "RED_QUARANTINED");
        macOSHelperLifecycle = "absent";
      } else if (descriptor.kind === "feeder-spawn") {
        if (!["started", "absent"].includes(macOSHelperLifecycle)) fail("RETRY_CLEANUP_MACOS_FEEDER_SEQUENCE_INVALID", "RED_QUARANTINED");
        macOSFeederLifecycle = "absent";
      } else if (macOSOrdinaryLifecycleKey === descriptor.key) macOSOrdinaryLifecycleKey = null;
    }
  }
  if (expectedRuntimeDependencyAggregateSha256 !== null && runtimeSnapshotIntentSha256 !== null && runtimeSnapshotIntentSha256 !== expectedRuntimeDependencyAggregateSha256) fail("RETRY_CLEANUP_RUNTIME_SNAPSHOT_AUTHORITY_DRIFT", "RED_QUARANTINED");
  const unstartedDirectGateIntents = [...intents.entries()].reduce((count, [key, value]) => count + (directStartKeys.has(key) ? value : 0), 0);
  const macOSExternalEffectsAbsent = macOSExternalEffectsAbsentNow();
  const macOSMetadataRestored = macOSMetadataRestoredNow();
  return Object.freeze({
    capsuleSha256: first.commandShapeSha256,
    runtimeDependencyAggregateSha256: runtimeSnapshotIntentSha256,
    slotRootObserved,
    postgresRunRootPhase,
    postgresAbsenceProofObserved,
    macOSRunRootPhase,
    macOSExternalEffectsAbsent,
    macOSMetadataRestored,
    macOSCleanupAbsenceObserved,
    codexComplete: codexCompletedCursor === CODEX_PROCESS_KINDS.length && codexProcessIntentCursor === CODEX_PROCESS_KINDS.length && codexLifecycleKey === null,
    cleanupCheckpointSeen,
    unresolvedProcessGroups: Object.freeze([...groups.entries()].filter(([, value]) => !value.absent).map(([pid]) => pid)),
    unresolvedProcesses: Object.freeze([...groups.entries()].filter(([, value]) => !value.absent).map(([processGroupId, value]) => Object.freeze({ processGroupId, lane: value.descriptor.lane, logicalId: value.descriptor.kind, commandShapeSha256: value.descriptor.commandShapeSha256, ownedResources: value.descriptor.ownedResources }))),
    unstartedSupervisorStarts: Object.freeze([...unstartedSupervisorStarts.values()].flat()),
    unstartedDirectGateIntents,
  });
}

function readCleanupCapsule(expectedHostBindingId, expectedCapsuleSha256) {
  if (!ID.test(expectedHostBindingId) || !SHA.test(expectedCapsuleSha256)) fail("RETRY_CLEANUP_CAPSULE_AUTHORITY_INVALID", "RED_QUARANTINED");
  const capsulePath = path.join(CAPSULE_ROOT, `${expectedHostBindingId}.json`);
  const chain = snapshotNoSymlinkPathChain(capsulePath, "RETRY_CLEANUP_CAPSULE_PATH_UNSAFE");
  const before = fs.lstatSync(capsulePath);
  if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600 || before.size < 2 || before.size > 4_194_304) fail("RETRY_CLEANUP_CAPSULE_FILE_UNSAFE", "RED_QUARANTINED");
  const fd = fs.openSync(capsulePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(before.size);
  try {
    let offset = 0;
    while (offset < bytes.length) { const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (count <= 0) fail("RETRY_CLEANUP_CAPSULE_SHORT_READ", "RED_QUARANTINED"); offset += count; }
    const afterFd = fs.fstatSync(fd); const afterPath = fs.lstatSync(capsulePath);
    assertNoSymlinkPathChainStable(chain, "RETRY_CLEANUP_CAPSULE_PATH_DRIFT");
    if (afterFd.dev !== before.dev || afterFd.ino !== before.ino || afterFd.size !== before.size || Math.trunc(afterFd.mtimeMs) !== Math.trunc(before.mtimeMs) || afterPath.dev !== before.dev || afterPath.ino !== before.ino || sha256(bytes) !== expectedCapsuleSha256 || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a)) fail("RETRY_CLEANUP_CAPSULE_BYTE_DRIFT", "RED_QUARANTINED");
    const capsule = parseStrictJson(bytes.subarray(0, -1).toString("utf8"));
    exactObject(capsule, new Set(["schemaVersion", "hostBindingId", "privateSalt", "createdAt", "expiresAt", "implementationHead", "implementationTree", "runtimeDependencyAggregateSha256", "authority", "boundFiles", "docker", "macos", "invalidationRules"]), "RETRY_CLEANUP_CAPSULE_SHAPE");
    if (`${canonicalJson(capsule)}\n` !== bytes.toString("utf8") || capsule.schemaVersion !== "r4_gate_b_host_binding_capsule.v1" || capsule.hostBindingId !== expectedHostBindingId || !Array.isArray(capsule.boundFiles) || capsule.boundFiles.length < 1) fail("RETRY_CLEANUP_CAPSULE_CONTENT_INVALID", "RED_QUARANTINED");
    exactObject(capsule.authority, new Set(["constructionPacketSha256", "constructionOwnerReviewSha256", "approvedProposalHead", "approvedProposalTree", "retryExecutionGrant", "firstProviderCallGrant"]), "RETRY_CLEANUP_CAPSULE_AUTHORITY_SHAPE");
    if (capsule.authority.constructionPacketSha256 !== PHYSICAL_AUTHORITY.constructionPacketSha256 || capsule.authority.constructionOwnerReviewSha256 !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256 || capsule.authority.approvedProposalHead !== PHYSICAL_AUTHORITY.approvedProposalHead || capsule.authority.approvedProposalTree !== PHYSICAL_AUTHORITY.approvedProposalTree || capsule.authority.retryExecutionGrant !== "NOT_REQUESTED" || capsule.authority.firstProviderCallGrant !== "NOT_REQUESTED") fail("RETRY_CLEANUP_CAPSULE_APPROVAL_DRIFT", "RED_QUARANTINED");
    const logicalNames = new Set();
    for (const entry of capsule.boundFiles) {
      exactObject(entry, new Set(["logicalName", "path", "sha256", "size", "mode", "uid", "gid", "device", "inode", "nlink", "mtimeMilliseconds"]), "RETRY_CLEANUP_BOUND_FILE_SHAPE");
      if (!/^[a-z0-9._-]+$/u.test(entry.logicalName) || logicalNames.has(entry.logicalName) || !path.isAbsolute(entry.path) || path.normalize(entry.path) !== entry.path || !SHA.test(entry.sha256) || !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.nlink !== 1) fail("RETRY_CLEANUP_BOUND_FILE_INVALID", "RED_QUARANTINED");
      logicalNames.add(entry.logicalName);
    }
    if (capsule.docker?.cliPath !== capsuleBoundFile(capsule, "docker-cli").path || !path.isAbsolute(capsule.docker?.socketPath ?? "")) fail("RETRY_CLEANUP_DOCKER_BINDING_INVALID", "RED_QUARANTINED");
    return Object.freeze({ capsule: Object.freeze(capsule), capsuleSha256: expectedCapsuleSha256 });
  } finally { bytes.fill(0); fs.closeSync(fd); }
}

async function cleanupRetryResources({ parsed, capsule, journal, runId, processPort = null, rootAuthority = null, postgresRootState = null }) {
  let clean = true;
  if (rootAuthority !== null) assertExactOwnedRootAuthorityCurrent(rootAuthority, "RETRY_CLEANUP_ROOT");
  const currentRecords = () => typeof journal.records === "function" ? journal.records() : journal.records;
  const records = currentRecords();
  const cleanupAuthority = validateRetryJournalForCleanup(records, capsule.runtimeDependencyAggregateSha256);
  const retryRoot = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  const cleanupCliRequired = records.some((record) => {
    if (typeof record.event !== "string" || !record.event.startsWith("intent:")) return false;
    const kind = record.event.slice("intent:".length);
    return (!cleanupAuthority.macOSCleanupAbsenceObserved && kind === "custom-keychain-create") || (!cleanupAuthority.postgresAbsenceProofObserved && ["container-create", "volume-create"].includes(kind));
  });
  if (cleanupCliRequired && processPort === null) {
    if (!fs.existsSync(path.join(retryRoot, "blocked-supervisor-pids"))) fail("RETRY_CLEANUP_BLOCKED_START_ROOT_MISSING", "RED_QUARANTINED");
    processPort = createProductionBlockedProcessPort(retryRoot, capsuleBoundFile(capsule, "node"));
  }
  if (!await recoverUnstartedBlockedSupervisors(retryRoot, cleanupAuthority.unstartedSupervisorStarts, journal)) clean = false;
  if (cleanupAuthority.unstartedDirectGateIntents !== 0) clean = false;
  for (const process of cleanupAuthority.unresolvedProcesses) {
    if (!await stopAndProveGroupAbsent(process.processGroupId)) { clean = false; continue; }
    await journal.append({ lane: process.lane, event: `cleanup-observed-absent:${process.logicalId}`, commandShapeSha256: process.commandShapeSha256, processGroupId: process.processGroupId, ownedResources: process.ownedResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
  }
  try {
    const postgresRecords = currentRecords();
    await cleanupPostgresResources({ capsule, runId, journal, records: postgresRecords, processPort, cleanupAuthority: validateRetryJournalForCleanup(postgresRecords, capsule.runtimeDependencyAggregateSha256), rootAuthority: postgresRootState?.authority ?? null });
  } catch { clean = false; }
  finally {
    if (postgresRootState?.authority !== null && postgresRootState?.authority !== undefined) closeExactOwnedRootAuthority(postgresRootState.authority);
    if (postgresRootState !== null && typeof postgresRootState === "object") postgresRootState.authority = null;
  }
  const macRoot = `/private/tmp/forme-r4-gate-b-core-${runId}`;
  try {
    const macOSRecords = currentRecords();
    if (!await cleanupMacOSResourcesFromJournal({ capsule, runId, records: macOSRecords, journal, processPort, cleanupAuthority: validateRetryJournalForCleanup(macOSRecords, capsule.runtimeDependencyAggregateSha256) })) clean = false;
  } catch { clean = false; }
  if (lstatIfPresent(macRoot, "RETRY_CLEANUP_MACOS_ROOT_UNREADABLE") !== null) clean = false;
  let finalCleanupAuthority = null;
  try { finalCleanupAuthority = validateRetryJournalForCleanup(currentRecords(), capsule.runtimeDependencyAggregateSha256); }
  catch { clean = false; }
  if (finalCleanupAuthority === null || finalCleanupAuthority.postgresAbsenceProofObserved !== true || finalCleanupAuthority.macOSCleanupAbsenceObserved !== true || finalCleanupAuthority.macOSExternalEffectsAbsent !== true || finalCleanupAuthority.macOSMetadataRestored !== true || finalCleanupAuthority.unresolvedProcessGroups.length !== 0 || finalCleanupAuthority.unstartedSupervisorStarts.length !== 0 || finalCleanupAuthority.unstartedDirectGateIntents !== 0) clean = false;
  if (!clean) fail("RETRY_CLEANUP_ABSENCE_UNKNOWN", "RED_QUARANTINED");
  return finalCleanupAuthority;
}

async function executeCoreRetry(parsed) {
  const manifestAuthority = readRetryManifestAuthority(parsed);
  const repositoryAuthority = verifyRetryRepositoryAuthority(manifestAuthority);
  readPublicHostBindingReceipt(manifestAuthority);
  const capsulePath = path.join(CAPSULE_ROOT, `${parsed.hostBindingId}.json`);
  const observed = readAndRevalidateHostBindingCapsule({ capsulePath, expectedHostBindingId: parsed.hostBindingId });
  if (observed.capsuleSha256 !== manifestAuthority.hostBindingCapsuleSha256 || observed.capsule.implementationHead !== manifestAuthority.implementationHead || observed.capsule.implementationTree !== manifestAuthority.implementationTree) fail("RETRY_CAPSULE_MANIFEST_DRIFT", "RED");
  mkdirOwned0700(RETRY_ROOT_PARENT);
  const runId = deriveRetryRunId(parsed.manifestSha256, parsed.hostBindingId);
  const retryRoot = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  if (fs.existsSync(retryRoot)) fail("RETRY_RUN_ROOT_PREEXISTS", "RED");
  const journal = createRetryJournal(retryRoot, parsed.manifestSha256, parsed.hostBindingId, runId);
  const retryRootAuthority = journal.takeRootAuthority();
  let postgres = null;
  let codex = null;
  let macos = null;
  let processPort = null;
  const postgresRootState = { authority: null };
  let terminalError = null;
  let retryCleanupError = null;
  let cleanupStatus = "GREEN";
  try {
    await journal.append({ lane: "runner", event: "retry-authority-revalidated", commandShapeSha256: observed.capsuleSha256, ownedResources: ["retry-run-root"], cleanupState: "required" });
    await journal.append({ lane: "runner", event: "runtime-snapshot-intent", commandShapeSha256: observed.capsule.runtimeDependencyAggregateSha256, ownedResources: ["runtime-snapshot"], cleanupState: "required" });
    const runtimeSnapshot = stageRuntimeDependencies(observed.capsule, retryRoot);
    await journal.append({ lane: "runner", event: "runtime-snapshot-observed", commandShapeSha256: observed.capsule.runtimeDependencyAggregateSha256, ownedResources: ["runtime-snapshot"], terminalCode: String(runtimeSnapshot.fileCount), cleanupState: "required" });
    await prepareBlockedStartSlotRoot(retryRoot, journal, "runner");
    processPort = createProductionBlockedProcessPort(retryRoot, capsuleBoundFile(observed.capsule, "node"));
    runtimeSnapshot.assertStable();
    postgres = await executePostgresLane({ capsule: observed.capsule, manifestSha256: parsed.manifestSha256, runId, runtimeSnapshot, journal, processPort, postgresRootState });
    runtimeSnapshot.assertStable();
    const codexRaw = await executeCodexLane({ capsule: observed.capsule, retryRoot, runtimeSnapshot, journal, processPort });
    codex = Object.freeze({ status: codexRaw.status, reportedVersion: codexRaw.reportedVersion, schemaFileCount: codexRaw.schemaFileCount, schemaAggregateSha256: codexRaw.schemaAggregateSha256, processStartSlotsConsumed: codexRaw.processStartSlotsConsumed, processGroupsStarted: codexRaw.processGroupsStarted, clientWrites: codexRaw.clientWrites, serverResponses: codexRaw.serverResponses, serverRequests: codexRaw.serverRequests, serverNotifications: codexRaw.serverNotifications, receiveBufferEmptyBeforeSecondWrite: codexRaw.receiveBufferEmptyBeforeSecondWrite, preSecondWriteViolationObserved: codexRaw.preSecondWriteViolationObserved, postSecondWriteViolationObserved: codexRaw.postSecondWriteViolationObserved, allStartedGroupsReaped: codexRaw.allStartedGroupsReaped, allStartedGroupsAbsent: codexRaw.allStartedGroupsAbsent, exitCodes: codexRaw.exitCodes, stderrBytes: codexRaw.stderrBytes, schemaStdoutBytes: codexRaw.schemaStdoutBytes, threadStarts: codexRaw.threadStarts, turnStarts: codexRaw.turnStarts, providerCalls: codexRaw.providerCalls, providerBytes: codexRaw.providerBytes, networkAuthority: codexRaw.networkAuthority, networkTransmittedBytes: codexRaw.networkTransmittedBytes, networkSyscallAttemptAbsenceClaimed: codexRaw.networkSyscallAttemptAbsenceClaimed, causalFinality: codexRaw.causalFinality, postResponseFinalityProven: codexRaw.postResponseFinalityProven, aiLaneEnabled: codexRaw.aiLaneEnabled, cleanupStatus: codexRaw.cleanupStatus });
    runtimeSnapshot.assertStable();
    macos = await executeMacOSLane({ capsule: observed.capsule, manifestSha256: parsed.manifestSha256, runId, runtimeSnapshot, journal, processPort });
    runtimeSnapshot.assertStable();
    if (["RED", "RED_QUARANTINED"].includes(macos.status)) terminalError = new PhysicalRunnerError(macos.reasonCode, macos.status);
  } catch (error) {
    terminalError = error;
  }
  try {
    const cleanupAuthority = await cleanupRetryResources({ parsed, capsule: observed.capsule, journal, runId, processPort, rootAuthority: retryRootAuthority, postgresRootState });
    if (cleanupAuthority.slotRootObserved !== true || cleanupAuthority.codexComplete !== true) fail("RETRY_CLEANUP_GREEN_PRECONDITION_INCOMPLETE", "RED_QUARANTINED");
    await journal.append({ lane: "cleanup", event: terminalError === null ? "retry-cleanup-observed" : "retry-cleanup-after-terminal", commandShapeSha256: sha256(Buffer.from("retry-cleanup-v1\n")), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
    validateRetryJournalForCleanup(journal.records(), observed.capsule.runtimeDependencyAggregateSha256);
  } catch (cleanupError) {
    retryCleanupError = cleanupError;
    terminalError = selectPhysicalRunnerTerminalError(terminalError, retryCleanupError, null);
    cleanupStatus = "RED_QUARANTINED";
  } finally {
    if (postgresRootState.authority !== null) closeExactOwnedRootAuthority(postgresRootState.authority);
    postgresRootState.authority = null;
  }
  let journalAggregateSha256 = null;
  let journalFinalizationError = null;
  try { journalAggregateSha256 = journal.aggregateSha256(); } catch (error) { journalFinalizationError = error; }
  try { journal.close(); } catch (error) { journalFinalizationError ??= error; }
  try { journal.zeroize(); } catch (error) { journalFinalizationError ??= error; }
  if (cleanupStatus === "GREEN") {
    try { removeExactOwnedRootTree(retryRootAuthority, RETRY_ROOT_DELETE_INVENTORY); }
    catch (error) { retryCleanupError ??= error; cleanupStatus = "RED_QUARANTINED"; }
  } else {
    closeExactOwnedRootAuthority(retryRootAuthority);
  }
  if (journalFinalizationError !== null || journalAggregateSha256 === null) {
    const normalizedFinalizationError = new PhysicalRunnerError("RETRY_JOURNAL_FINALIZATION_FAILED", cleanupStatus === "GREEN" ? "RED" : "RED_QUARANTINED");
    throw selectPhysicalRunnerTerminalError(terminalError, retryCleanupError, normalizedFinalizationError);
  }
  if (cleanupStatus !== "GREEN") terminalError = selectPhysicalRunnerTerminalError(terminalError, retryCleanupError, new PhysicalRunnerError("RETRY_RUN_ROOT_OR_RESOURCE_ABSENCE_UNKNOWN", "RED_QUARANTINED"));
  const isRed = cleanupStatus !== "GREEN" || String(terminalError?.verdict ?? "").startsWith("RED");
  const cleanMechanism = terminalError === null && macos?.status === "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY";
  const terminalStatus = cleanupStatus !== "GREEN" ? "RED_QUARANTINED" : cleanMechanism ? "COMPLETED_YELLOW" : isRed ? "TERMINAL_RED" : "TERMINAL_YELLOW";
  const rawReason = terminalError?.code ?? (macos?.reasonCode && macos.status !== "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY" ? macos.reasonCode : "CLEAN_ZERO_PROVIDER_RETRY");
  const reasonCode = String(rawReason).toUpperCase().replace(/[^A-Z0-9_]/gu, "_").slice(0, 128) || "RETRY_TERMINAL";
  const evidence = Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_evidence.v1", terminalStatus, reasonCode, manifestSha256: parsed.manifestSha256, executionGrantSha256: parsed.executionGrantSha256, hostBindingId: parsed.hostBindingId, hostBindingCapsuleSha256: observed.capsuleSha256, implementationHead: manifestAuthority.implementationHead, implementationTree: manifestAuthority.implementationTree, publicationHead: repositoryAuthority.publicationHead, publicationTree: repositoryAuthority.publicationTree, laneOrder: ["postgres", "codex", "macos", "cleanup", "evidence", "stop"], postgres, codex, macos, journalAggregateSha256, cleanupStatus, firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: isRed ? "RED" : "YELLOW" });
  validateSchema("schemas/r4/gate-b-core/physical-retry-evidence.schema.json", evidence, "RETRY_EVIDENCE_SCHEMA_INVALID");
  return evidence;
}

export async function cleanupCoreRetry(parsed, { journalAuthority = {} } = {}) {
  const runId = deriveRetryRunId(parsed.manifestSha256, parsed.hostBindingId);
  const authenticated = authenticatedRetryJournal(parsed, runId, journalAuthority);
  if (authenticated.alreadyAbsent) return Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: "GREEN", alreadyAbsent: true });
  if (authenticated.records.length === 0) {
    const emptyCleanup = removeEmptyAuthenticatedRetryJournalRoot(authenticated);
    if (authenticated.journalReadCloseFaultCode !== null && authenticated.journalReadCloseFaultCode !== undefined) throw new PhysicalRunnerError(authenticated.journalReadCloseFaultCode, "RED");
    return Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: emptyCleanup.status, alreadyAbsent: false });
  }
  let removalAttempted = false;
  try {
    assertExactOwnedRootAuthorityCurrent(authenticated.rootAuthority, "RETRY_CLEANUP_ROOT");
    const cleanupAuthority = validateRetryJournalForCleanup(authenticated.records);
    const observed = readCleanupCapsule(parsed.hostBindingId, cleanupAuthority.capsuleSha256);
    const cleanupJournal = openAuthenticatedRetryJournalForAppend(authenticated, parsed, runId);
    let cleanupError = null;
    let journalCloseError = null;
    try { await cleanupRetryResources({ parsed, capsule: observed.capsule, journal: cleanupJournal, runId, rootAuthority: authenticated.rootAuthority }); }
    catch (error) { cleanupError = error; }
    try { cleanupJournal.close(); } catch (error) { journalCloseError = error; }
    if (cleanupError !== null) throw cleanupError;
    removalAttempted = true;
    removeExactOwnedRootTree(authenticated.rootAuthority, RETRY_ROOT_DELETE_INVENTORY);
    const terminalError = selectPhysicalRunnerTerminalError(
      authenticated.journalReadCloseFaultCode !== null && authenticated.journalReadCloseFaultCode !== undefined ? new PhysicalRunnerError(authenticated.journalReadCloseFaultCode, "RED") : null,
      null,
      journalCloseError !== null ? new PhysicalRunnerError("RETRY_CLEANUP_JOURNAL_CLOSE_FAILED", "RED") : null,
    );
    if (terminalError !== null) throw terminalError;
    return Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: "GREEN", alreadyAbsent: false });
  } finally {
    if (!removalAttempted) closeExactOwnedRootAuthority(authenticated.rootAuthority);
  }
}

export async function cleanupConstruction({ retainCompletePublication = false, rootAuthority = null } = {}) {
  const authenticated = readConstructionJournalForCleanup(rootAuthority === null ? undefined : { rootAuthority });
  if (authenticated.alreadyAbsent) return Object.freeze({ status: "GREEN", constructionRunRootAbsent: true, constructionJournalAbsent: true, processGroupsAbsent: true });
  let removalAttempted = false;
  try {
    if (isCheckpointOwnershipJournal(authenticated.records)) {
      reconcileCheckpointOwnershipJournalForCleanup(authenticated, CHECKPOINT_PATH);
      removalAttempted = true;
      return Object.freeze({ status: "GREEN", constructionRunRootAbsent: true, constructionJournalAbsent: true, processGroupsAbsent: true });
    }
    const cleanupPlan = validateConstructionJournalForCleanup(authenticated.records);
    const recoveryJournal = authenticated.records.length === 0 ? null : openAuthenticatedConstructionJournalForAppend(authenticated);
    let absent = true;
    let recoveryJournalCloseError = null;
    try {
      if (!await recoverUnstartedBlockedSupervisors(CONSTRUCTION_ROOT, cleanupPlan.unstartedSupervisorStarts, recoveryJournal)) absent = false;
      if (cleanupPlan.unstartedDirectGateIntents !== 0) absent = false;
      for (const process of cleanupPlan.unresolvedProcesses) {
        if (!await stopAndProveGroupAbsent(process.processGroupId)) { absent = false; continue; }
        await recoveryJournal.append({ lane: process.lane, event: `cleanup-observed-absent:${process.logicalId}`, commandShapeSha256: process.commandShapeSha256, processGroupId: process.processGroupId, ownedResources: process.ownedResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
      }
      if (!absent) fail("CONSTRUCTION_CLEANUP_GROUP_ABSENCE_UNKNOWN", "RED_QUARANTINED");
      if (cleanupPlan.removeOwnerInput) removeHostBindingInputEnvelope(INPUT_PATH);
      if (cleanupPlan.publicationHostBindingId !== null) {
        const capsulePath = path.join(CAPSULE_ROOT, `${cleanupPlan.publicationHostBindingId}.json`);
        const capsuleTemp = privateWriteTemporaryPath(capsulePath);
        const retainPublication = cleanupPlan.publicationComplete && retainCompletePublication;
        if (cleanupPlan.capsuleExpectedSha256 !== null) reconcileConstructionPublication({ finalPath: capsulePath, temporaryPath: capsuleTemp, stagePath: constructionPublicationStagePath("capsule"), expectedMode: 0o600, expectedSha256: cleanupPlan.capsuleExpectedSha256, retain: retainPublication, externalLinksAuthorized: cleanupPlan.capsuleStageReady });
        const receiptTemp = path.join(path.dirname(PUBLIC_RECEIPT_PATH), `.${path.basename(PUBLIC_RECEIPT_PATH)}.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`);
        if (cleanupPlan.receiptExpectedSha256 !== null) reconcileConstructionPublication({ finalPath: PUBLIC_RECEIPT_PATH, temporaryPath: receiptTemp, stagePath: constructionPublicationStagePath("public-receipt"), expectedMode: 0o644, expectedSha256: cleanupPlan.receiptExpectedSha256, retain: retainPublication, externalLinksAuthorized: cleanupPlan.receiptStageReady });
      }
    } finally {
      try { recoveryJournal?.close(); } catch (error) { recoveryJournalCloseError = error; }
    }
    removalAttempted = true;
    removeExactOwnedRootTree(authenticated.rootAuthority, CONSTRUCTION_ROOT_DELETE_INVENTORY);
    const terminalError = selectPhysicalRunnerTerminalError(
      authenticated.journalReadCloseFaultCode !== null && authenticated.journalReadCloseFaultCode !== undefined ? new PhysicalRunnerError(authenticated.journalReadCloseFaultCode, "RED") : null,
      null,
      recoveryJournalCloseError !== null ? new PhysicalRunnerError("CONSTRUCTION_CLEANUP_JOURNAL_CLOSE_FAILED", "RED") : null,
    );
    if (terminalError !== null) throw terminalError;
    return Object.freeze({ status: "GREEN", constructionRunRootAbsent: true, constructionJournalAbsent: true, processGroupsAbsent: true });
  } finally {
    if (!removalAttempted) closeExactOwnedRootAuthority(authenticated.rootAuthority);
  }
}

export function exerciseCheckpointPublicationProtocolForConstruction(baseRoot = null) {
  const ownsRoot = baseRoot === null;
  const base = ownsRoot ? fs.realpathSync(fs.mkdtempSync("/tmp/forme-r4-checkpoint-publication-")) : baseRoot;
  if (!path.isAbsolute(base) || path.normalize(base) !== base || (!ownsRoot && path.dirname(base) !== CONSTRUCTION_ROOT)) fail("CHECKPOINT_PUBLICATION_EXERCISE_ROOT_INVALID", "RED");
  if (!ownsRoot) fs.mkdirSync(base, { recursive: false, mode: 0o700 });
  fs.chmodSync(base, 0o700);
  const baseAuthority = ownsRoot ? openExactOwnedRootAuthority({ root: base, anchor: "/private/tmp", codePrefix: "CHECKPOINT_PUBLICATION_EXERCISE_ROOT" }) : null;
  const bytes = Buffer.from(`${canonicalJson({ schemaVersion: "r4_gate_b_checkpoint_publication_fixture.v1" })}\n`, "utf8");
  const sentinel = Buffer.from("same-uid-owner-preserve\n", "utf8");
  const makeCase = (name) => {
    const caseRoot = path.join(base, name);
    fs.mkdirSync(caseRoot, { mode: 0o700 });
    const target = path.join(caseRoot, "construction-checkpoint.v1.json");
    return Object.freeze({ caseRoot, target, temporary: privateWriteTemporaryPath(target) });
  };
  try {
    const clean = makeCase("clean");
    atomicWritePrivateFile(clean.target, bytes, 0o600, { anchor: base });
    const cleanBefore = fs.lstatSync(clean.target);
    const cleanBytes = fs.readFileSync(clean.target);
    const cleanAfter = fs.lstatSync(clean.target);
    try {
      if (!cleanBefore.isFile() || cleanBefore.isSymbolicLink() || cleanBefore.uid !== process.getuid() || cleanBefore.nlink !== 1 || (cleanBefore.mode & 0o777) !== 0o600 || cleanAfter.dev !== cleanBefore.dev || cleanAfter.ino !== cleanBefore.ino || cleanAfter.size !== cleanBefore.size || cleanAfter.mode !== cleanBefore.mode || cleanAfter.uid !== cleanBefore.uid || cleanAfter.nlink !== cleanBefore.nlink || !crypto.timingSafeEqual(cleanBytes, bytes)) fail("CHECKPOINT_PUBLICATION_EXERCISE_FINAL_INVALID", "RED");
    } finally { cleanBytes.fill(0); }
    if (lstatIfPresent(clean.temporary, "CHECKPOINT_PUBLICATION_EXERCISE_TEMP_UNREADABLE") !== null) fail("CHECKPOINT_PUBLICATION_EXERCISE_TEMP_REMAINS", "RED");

    const collision = makeCase("final-collision");
    fs.writeFileSync(collision.target, sentinel, { flag: "wx", mode: 0o600 });
    let finalCollisionDenied = false;
    try { atomicWritePrivateFile(collision.target, bytes, 0o600, { anchor: base }); }
    catch (error) { finalCollisionDenied = error instanceof HostBindingError && error.code === "PRIVATE_WRITE_TARGET_EXISTS"; }
    const collisionBytes = fs.readFileSync(collision.target);
    try { if (!finalCollisionDenied || !crypto.timingSafeEqual(collisionBytes, sentinel)) fail("CHECKPOINT_PUBLICATION_EXERCISE_FINAL_CLOBBERED", "RED"); }
    finally { collisionBytes.fill(0); }

    const residue = makeCase("temp-residue");
    fs.writeFileSync(residue.temporary, sentinel, { flag: "wx", mode: 0o600 });
    let residueDenied = false;
    try { atomicWritePrivateFile(residue.target, bytes, 0o600, { anchor: base }); }
    catch (error) { residueDenied = error instanceof HostBindingError && error.code === "PRIVATE_WRITE_TEMP_PREEXISTS"; }
    const residueBytes = fs.readFileSync(residue.temporary);
    try { if (!residueDenied || lstatIfPresent(residue.target) !== null || !crypto.timingSafeEqual(residueBytes, sentinel)) fail("CHECKPOINT_PUBLICATION_EXERCISE_RESIDUE_NOT_PRESERVED", "RED"); }
    finally { residueBytes.fill(0); }

    const crashAlias = makeCase("crash-alias");
    const crashAliasAuthority = openExactOwnedRootAuthority({ root: crashAlias.caseRoot, anchor: base, codePrefix: "CHECKPOINT_PUBLICATION_CRASH_ALIAS" });
    const crashClaim = createCheckpointOwnershipJournal({ rootAuthority: crashAliasAuthority, checkpointPath: crashAlias.target, checkpointSha256: sha256(bytes) });
    fs.writeFileSync(crashAlias.temporary, bytes, { flag: "wx", mode: 0o600 });
    crashClaim.onTemporaryDurable(Object.freeze({ sha256: sha256(bytes), identity: statIdentityForCleanup(fs.lstatSync(crashAlias.temporary)) }));
    fs.linkSync(crashAlias.temporary, crashAlias.target);
    crashClaim.onLinkDurable(Object.freeze({ sha256: sha256(bytes), identity: statIdentityForCleanup(fs.lstatSync(crashAlias.target)) }));
    crashClaim.closeForCrashTest();
    const crashAuthenticated = readConstructionJournalForCleanup({ constructionRoot: crashAlias.caseRoot, journalPath: path.join(crashAlias.caseRoot, "journal.v1.jsonl"), checkpointPath: crashAlias.target, rootAuthority: crashAliasAuthority });
    reconcileCheckpointOwnershipJournalForCleanup(crashAuthenticated, crashAlias.target);
    if (lstatIfPresent(crashAlias.caseRoot, "CHECKPOINT_PUBLICATION_CRASH_ALIAS_ABSENCE_UNREADABLE") !== null) fail("CHECKPOINT_PUBLICATION_CRASH_ALIAS_REMAINS", "RED_QUARANTINED");
    return Object.freeze({ status: "GREEN", casesValidated: 4, actualCheckpointWriterProtocolExercised: true, durableOwnershipClaimExercised: true, noClobberHardlinkProven: true, deterministicTempResiduePreserved: true, crashAliasCleanupProven: true, renameFallbackUsed: false });
  } finally {
    bytes.fill(0);
    sentinel.fill(0);
    if (baseAuthority !== null && !baseAuthority.state.closed) removeExactOwnedRootTree(baseAuthority, Object.freeze({ clean: ownedDirectory0700, "final-collision": ownedDirectory0700, "temp-residue": ownedDirectory0700, "crash-alias": ownedDirectory0700 }));
  }
}

export async function constructPhysicalAdapters() {
  const authority = verifyPhaseAAuthority();
  if (lstatIfPresent(CONSTRUCTION_ROOT, "CONSTRUCTION_RUN_ROOT_UNREADABLE", "RED") !== null) fail("CONSTRUCTION_RUN_ROOT_PREEXISTS", "RED");
  const journal = createConstructionJournal();
  const constructionRootAuthority = journal.takeRootAuthority();
  let resultValue = null;
  let primaryError = null;
  try {
    await journal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: sha256(Buffer.from("construction-fake-matrix-v1\n")), ownedResources: ["construction-run-root", "fake-process-groups"] });
    const codexMatrixRoot = path.join(CONSTRUCTION_ROOT, "codex-shared-matrix");
    mkdirOwned0700(codexMatrixRoot);
    const runCodexSharedCase = createCoreSharedOrchestrationCaseExecutor({ constructionTempRoot: codexMatrixRoot, createOrchestrator: createConstructionCodexProcessOrchestrator, deferFilesystemCleanupToConstructionRoot: true });
    const result = await runConstructionFakeMatrix({ requireCodexShared: true, runCodexSharedCase });
    const codexStagingCheck = exercisePrivateCodexStaging(CONSTRUCTION_ROOT);
    const blockedStartCheck = await exerciseBlockedStartProtocolForConstruction({ root: CONSTRUCTION_ROOT, journal });
    const macosDirectStartCheck = await exerciseMacOSDirectStartProtocolForConstruction({ root: CONSTRUCTION_ROOT, journal });
    const publicationProtocolCheck = await exerciseConstructionPublicationProtocolForConstruction(path.join(CONSTRUCTION_ROOT, "publication-protocol-fake"));
    const checkpointPublicationProtocolCheck = exerciseCheckpointPublicationProtocolForConstruction(path.join(CONSTRUCTION_ROOT, "checkpoint-publication-protocol-fake"));
    if (blockedStartCheck.status !== "GREEN" || macosDirectStartCheck.status !== "GREEN" || publicationProtocolCheck.status !== "GREEN" || checkpointPublicationProtocolCheck.status !== "GREEN") fail("CONSTRUCTION_START_PROTOCOL_EXERCISE_FAILED", "RED");
    validateRaceCatalog(JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, "schemas/r4/gate-b-core/postgres/race-catalog.json"), "utf8")));
    const runtimeDependencies = runtimeDependencyInventory();
    await journal.append({ lane: "construction", event: "fake-matrix-observed", commandShapeSha256: sha256(Buffer.from("construction-fake-matrix-v1\n")), terminalCode: result.status, cleanupState: "required" });
    const aggregate = journal.aggregateSha256();
    resultValue = Object.freeze({ schemaVersion: "r4_gate_b_physical_adapter_construction_check.v1", status: result.status, authority, result, codexStagingCheck, blockedStartCheck, macosDirectStartCheck, publicationProtocolCheck, checkpointPublicationProtocolCheck, fakeChildStarts: result.fakeChildStarts + blockedStartCheck.fakeProcessStarts + macosDirectStartCheck.fakeProcessStarts, runtimeDependencyCount: runtimeDependencies.fileCount, runtimeDependencyAggregateSha256: runtimeDependencies.aggregateSha256, runtimeDependencies: runtimeDependencies.files, journalAggregateSha256: aggregate, physicalEffects: 0, hostBindingInputRead: false, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" });
  } catch (error) { primaryError = error; }
  let finalizationError = null;
  let cleanupError = null;
  try { journal.close(); } catch { finalizationError = new PhysicalRunnerError("CONSTRUCTION_JOURNAL_CLOSE_FAILED", "RED"); }
  try { journal.zeroize(); } catch { finalizationError ??= new PhysicalRunnerError("CONSTRUCTION_JOURNAL_ZEROIZATION_FAILED", "RED"); }
  try { await cleanupConstruction({ rootAuthority: constructionRootAuthority }); } catch (error) { cleanupError = error; }
  const terminalError = selectPhysicalRunnerTerminalError(primaryError, cleanupError, finalizationError);
  if (terminalError !== null) throw terminalError;
  if (resultValue === null) fail("CONSTRUCTION_RESULT_MISSING", "RED");
  return resultValue;
}

export function readCheckpoint({ constructionRoot = CONSTRUCTION_ROOT, checkpointPath = path.join(constructionRoot, "construction-checkpoint.v1.json"), rootAuthority: carriedRootAuthority = null } = {}) {
  if (!path.isAbsolute(constructionRoot) || path.normalize(constructionRoot) !== constructionRoot || checkpointPath !== path.join(constructionRoot, "construction-checkpoint.v1.json") || (carriedRootAuthority !== null && (!exactOwnedRootAuthorities.has(carriedRootAuthority) || carriedRootAuthority.state.closed || carriedRootAuthority.root !== constructionRoot))) fail("CONSTRUCTION_CHECKPOINT_READ_AUTHORITY_INVALID", "RED_QUARANTINED");
  let ownedRootAuthority = null;
  const rootAuthority = carriedRootAuthority ?? (ownedRootAuthority = openExactOwnedRootAuthority({ root: constructionRoot, anchor: exactOwnedRootAnchor(constructionRoot, "CONSTRUCTION_CHECKPOINT_ROOT"), codePrefix: "CONSTRUCTION_CHECKPOINT_ROOT" }));
  let fd = null;
  let bytes = null;
  let trailing = null;
  let checkpoint = null;
  let primaryError = null;
  let finalizationError = null;
  const addFinalizationError = (error) => { finalizationError = selectPhysicalRunnerTerminalError(finalizationError, null, error); };
  try {
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_ROOT");
    const parentBefore = fs.lstatSync(constructionRoot, { bigint: true });
    const parentOpened = fs.fstatSync(rootAuthority.rootFd, { bigint: true });
    if (!sameStableBigIntIdentity(parentBefore, parentOpened)) fail("CONSTRUCTION_CHECKPOINT_PARENT_IDENTITY_DRIFT", "RED_QUARANTINED");
    const stat = fs.lstatSync(checkpointPath, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.uid !== BigInt(process.getuid()) || (stat.mode & 0o777n) !== 0o600n || stat.size < 1n || stat.size > 32_768n) fail("CONSTRUCTION_CHECKPOINT_UNSAFE", "RED");
    fd = fs.openSync(checkpointPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    bytes = Buffer.allocUnsafe(Number(stat.size));
    trailing = Buffer.alloc(1);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("CONSTRUCTION_CHECKPOINT_SHORT_READ", "RED");
      offset += count;
    }
    if (fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("CONSTRUCTION_CHECKPOINT_TRAILING_READ", "RED");
    const opened = fs.fstatSync(fd, { bigint: true });
    const after = fs.lstatSync(checkpointPath, { bigint: true });
    const parentAfterFd = fs.fstatSync(rootAuthority.rootFd, { bigint: true });
    const parentAfterPath = fs.lstatSync(constructionRoot, { bigint: true });
    if (!sameStableBigIntIdentity(stat, opened) || !sameStableBigIntIdentity(stat, after) || !sameStableBigIntIdentity(parentBefore, parentAfterFd) || !sameStableBigIntIdentity(parentBefore, parentAfterPath)) fail("CONSTRUCTION_CHECKPOINT_TOCTOU", "RED");
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_ROOT");
    if (bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a)) fail("CONSTRUCTION_CHECKPOINT_NOT_CANONICAL", "RED");
    let source;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, -1)); }
    catch { fail("CONSTRUCTION_CHECKPOINT_NOT_CANONICAL", "RED"); }
    try { checkpoint = parseStrictJson(source); }
    catch { fail("CONSTRUCTION_CHECKPOINT_JSON_INVALID", "RED"); }
    if (`${canonicalJson(checkpoint)}\n` !== bytes.toString("utf8")) fail("CONSTRUCTION_CHECKPOINT_NOT_CANONICAL", "RED");
    validateSchema("schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json", checkpoint, "CONSTRUCTION_CHECKPOINT_SCHEMA_INVALID");
  } catch (error) {
    primaryError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError("CONSTRUCTION_CHECKPOINT_READ_FAILED", "RED");
  } finally {
    try { bytes?.fill(0); trailing?.fill(0); }
    catch { addFinalizationError(new PhysicalRunnerError("CONSTRUCTION_CHECKPOINT_READ_ZEROIZATION_FAILED", "RED")); }
    if (fd !== null) {
      try { fs.closeSync(fd); }
      catch { addFinalizationError(new PhysicalRunnerError("CONSTRUCTION_CHECKPOINT_READ_CLOSE_FAILED", "RED")); }
    }
    if (ownedRootAuthority !== null) {
      try { closeExactOwnedRootAuthority(ownedRootAuthority, "CONSTRUCTION_CHECKPOINT_ROOT_AUTHORITY_CLOSE_FAILED"); }
      catch (error) { addFinalizationError(error); }
    }
  }
  const terminalError = selectPhysicalRunnerTerminalError(primaryError, null, finalizationError);
  if (terminalError !== null) throw terminalError;
  if (checkpoint === null) fail("CONSTRUCTION_CHECKPOINT_READ_RESULT_MISSING", "RED");
  return checkpoint;
}
function verifyFrozenImplementation(checkpoint) {
  verifyPhaseAAuthority();
  if (checkpoint.approvedDecisionBriefSha256 !== HOST_BINDING_AUTHORITY.decisionBriefSha256 || checkpoint.constructionPacketSha256 !== PHYSICAL_AUTHORITY.constructionPacketSha256 || checkpoint.constructionOwnerReviewSha256 !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256 || checkpoint.approvedProposalHead !== PHYSICAL_AUTHORITY.approvedProposalHead || checkpoint.approvedProposalTree !== PHYSICAL_AUTHORITY.approvedProposalTree) fail("IMPLEMENTATION_CHECKPOINT_APPROVAL_DRIFT", "RED");
  if (!GIT.test(checkpoint.implementationHead) || !GIT.test(checkpoint.implementationTree) || git(["rev-parse", "HEAD"]) !== checkpoint.implementationHead || git(["rev-parse", "HEAD^{tree}"]) !== checkpoint.implementationTree || gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") fail("IMPLEMENTATION_CHECKPOINT_REPO_DRIFT", "RED");
  const bindings = { physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"), hostBindingModuleSha256: fileSha("scripts/r4-gate-b-host-binding.mjs"), physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"), runnerContractSha256: fileSha("schemas/r4/gate-b-core/physical-runner-contract.json"), codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb") };
  for (const [key, value] of Object.entries(bindings)) if (checkpoint[key] !== value) fail("IMPLEMENTATION_CHECKPOINT_HASH_DRIFT", "RED");
  const runtime = runtimeDependencyInventory();
  if (checkpoint.runtimeDependencyCount !== runtime.fileCount || checkpoint.runtimeDependencyAggregateSha256 !== runtime.aggregateSha256 || canonicalJson(checkpoint.runtimeDependencies) !== canonicalJson(runtime.files)) fail("IMPLEMENTATION_CHECKPOINT_RUNTIME_DRIFT", "RED");
  return Object.freeze({ ...bindings, runtimeDependencyCount: runtime.fileCount, runtimeDependencyAggregateSha256: runtime.aggregateSha256 });
}
function verifyFrozenImplementationAfterPublicReceipt(checkpoint, expectedPublicReceiptSha256, expectedLinkCount = 1) {
  if (!SHA.test(expectedPublicReceiptSha256)) fail("IMPLEMENTATION_POST_RECEIPT_HASH_INVALID", "RED");
  if (fileSha(PACKET_PATH) !== PHYSICAL_AUTHORITY.constructionPacketSha256 || fileSha(REVIEW_PATH) !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256) fail("IMPLEMENTATION_POST_RECEIPT_APPROVAL_DRIFT", "RED");
  for (const [relativePath, expected] of Object.entries(IMMUTABLE_HASHES)) if (fileSha(relativePath) !== expected) fail(`IMPLEMENTATION_POST_RECEIPT_IMMUTABLE_DRIFT:${relativePath}`, "RED");
  if (git(["branch", "--show-current"]) !== "codex/r4-gate-a-build" || git(["merge-base", PHYSICAL_AUTHORITY.approvedProposalHead, "HEAD"]) !== PHYSICAL_AUTHORITY.approvedProposalHead || git(["rev-parse", `${PHYSICAL_AUTHORITY.approvedProposalHead}^{tree}`]) !== PHYSICAL_AUTHORITY.approvedProposalTree) fail("IMPLEMENTATION_POST_RECEIPT_REPOSITORY_AUTHORITY_DRIFT", "RED");
  if (git(["rev-parse", "HEAD"]) !== checkpoint.implementationHead || git(["rev-parse", "HEAD^{tree}"]) !== checkpoint.implementationTree) fail("IMPLEMENTATION_POST_RECEIPT_HEAD_DRIFT", "RED");
  if (gitRaw(["diff", "--name-only", "-z"]) !== "" || gitRaw(["diff", "--cached", "--name-only", "-z"]) !== "" || gitRaw(["ls-files", "--others", "--exclude-standard", "-z"]) !== `${path.relative(REPOSITORY_ROOT, PUBLIC_RECEIPT_PATH)}\0`) fail("IMPLEMENTATION_POST_RECEIPT_WORKTREE_DRIFT", "RED");
  const receiptStat = fs.lstatSync(PUBLIC_RECEIPT_PATH);
  if (!receiptStat.isFile() || receiptStat.isSymbolicLink() || receiptStat.uid !== process.getuid() || receiptStat.nlink !== expectedLinkCount || (receiptStat.mode & 0o777) !== 0o644 || fileSha(path.relative(REPOSITORY_ROOT, PUBLIC_RECEIPT_PATH)) !== expectedPublicReceiptSha256) fail("IMPLEMENTATION_POST_RECEIPT_FILE_DRIFT", "RED");
  if (checkpoint.approvedDecisionBriefSha256 !== HOST_BINDING_AUTHORITY.decisionBriefSha256 || checkpoint.constructionPacketSha256 !== PHYSICAL_AUTHORITY.constructionPacketSha256 || checkpoint.constructionOwnerReviewSha256 !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256 || checkpoint.approvedProposalHead !== PHYSICAL_AUTHORITY.approvedProposalHead || checkpoint.approvedProposalTree !== PHYSICAL_AUTHORITY.approvedProposalTree) fail("IMPLEMENTATION_POST_RECEIPT_CHECKPOINT_DRIFT", "RED");
  const bindings = { physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"), hostBindingModuleSha256: fileSha("scripts/r4-gate-b-host-binding.mjs"), physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"), runnerContractSha256: fileSha("schemas/r4/gate-b-core/physical-runner-contract.json"), codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb") };
  for (const [key, value] of Object.entries(bindings)) if (checkpoint[key] !== value) fail("IMPLEMENTATION_POST_RECEIPT_HASH_DRIFT", "RED");
  const runtime = runtimeDependencyInventory();
  if (checkpoint.runtimeDependencyCount !== runtime.fileCount || checkpoint.runtimeDependencyAggregateSha256 !== runtime.aggregateSha256 || canonicalJson(checkpoint.runtimeDependencies) !== canonicalJson(runtime.files)) fail("IMPLEMENTATION_POST_RECEIPT_RUNTIME_DRIFT", "RED");
  return true;
}

export function normalizeFinalConstructionCheckpointInputs(input) {
  const keys = new Set(["validationAggregateSha256", "postgresAuditReceiptSha256", "codexUnifiedAuditReceiptSha256", "macosAuthorityAuditReceiptSha256"]);
  if (input === null || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join("\n") !== [...keys].sort().join("\n")) fail("CONSTRUCTION_CHECKPOINT_WRITER_INPUT_SHAPE", "RED");
  const { validationAggregateSha256, postgresAuditReceiptSha256, codexUnifiedAuditReceiptSha256, macosAuthorityAuditReceiptSha256 } = input;
  if (![validationAggregateSha256, postgresAuditReceiptSha256, codexUnifiedAuditReceiptSha256, macosAuthorityAuditReceiptSha256].every((value) => typeof value === "string" && SHA.test(value))) fail("CONSTRUCTION_CHECKPOINT_RECEIPT_INPUT_INVALID", "RED");
  return Object.freeze({
    validationAggregateSha256,
    auditReceipts: Object.freeze({ postgres: postgresAuditReceiptSha256, codexUnified: codexUnifiedAuditReceiptSha256, macosAuthority: macosAuthorityAuditReceiptSha256 }),
  });
}

const CHECKPOINT_OWNERSHIP_EVENTS = Object.freeze(["checkpoint-publication-intent", "checkpoint-stage-ready", "checkpoint-link-observed", "checkpoint-published"]);
const CHECKPOINT_OWNERSHIP_RESOURCES = Object.freeze(["construction-checkpoint", "checkpoint-publication-journal"]);
function checkpointClaimStableIdentity(identity) {
  return Object.freeze({ mode: identity.mode & 0o7777, uid: identity.uid, gid: identity.gid, device: String(identity.device ?? identity.dev), inode: String(identity.inode ?? identity.ino) });
}
function checkpointClaimFileIdentity(identity) {
  return Object.freeze({ size: identity.size, mode: identity.mode & 0o7777, uid: identity.uid, gid: identity.gid, device: String(identity.device ?? identity.dev), inode: String(identity.inode ?? identity.ino), mtimeMilliseconds: identity.mtimeMilliseconds ?? Math.trunc(identity.mtimeMs) });
}
function checkpointClaimFullIdentity(identity) {
  return Object.freeze({ ...checkpointClaimFileIdentity(identity), nlink: identity.nlink });
}
function readCheckpointClaimDescriptorBytes(descriptor, size, code) {
  if (!Number.isSafeInteger(size) || size < 0 || size > 16_777_216) fail(code, "RED_QUARANTINED");
  const bytes = Buffer.allocUnsafe(size);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail(code, "RED_QUARANTINED");
      offset += count;
    }
    return bytes;
  } catch (error) { bytes.fill(0); throw error; }
}
function closeCheckpointClaimDescriptor(descriptor, code) {
  try { fs.closeSync(descriptor); return null; }
  catch {
    let stillOpen = true;
    try { fs.fstatSync(descriptor); }
    catch (probeError) { if (probeError?.code === "EBADF") stillOpen = false; }
    if (stillOpen) try { fs.closeSync(descriptor); } catch {}
    return new PhysicalRunnerError(code, "RED_QUARANTINED");
  }
}
function checkpointClaimHashes({ rootAuthority, journalIdentity, checkpointPath, checkpointSha256, temporaryIdentity = null }) {
  const base = Object.freeze({
    schemaVersion: "r4_gate_b_checkpoint_ownership_claim.v1",
    constructionRunId: HOST_BINDING_AUTHORITY.constructionRunId,
    rootIdentity: checkpointClaimStableIdentity(fs.fstatSync(rootAuthority.rootFd)),
    journalIdentity: checkpointClaimStableIdentity(journalIdentity),
    finalName: path.basename(checkpointPath),
    temporaryName: path.basename(privateWriteTemporaryPath(checkpointPath)),
    checkpointSha256,
  });
  const baseSha256 = sha256(Buffer.from(canonicalJson(base), "utf8"));
  const stageSha256 = temporaryIdentity === null ? null : sha256(Buffer.from(canonicalJson({ ...base, temporaryIdentity: checkpointClaimFileIdentity(temporaryIdentity) }), "utf8"));
  return Object.freeze({ baseSha256, stageSha256 });
}
function checkpointOwnershipRecord(sequence, previousRecordSha256, event, commandShapeSha256, terminalCode) {
  return Object.freeze({ schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256, runId: HOST_BINDING_AUTHORITY.constructionRunId, manifestSha256: null, hostBindingId: null, lane: "construction", event, commandShapeSha256, processGroupId: null, ownedResources: CHECKPOINT_OWNERSHIP_RESOURCES, terminalCode, cleanupState: "required" });
}
export function createCheckpointOwnershipJournal({ rootAuthority, checkpointPath, checkpointSha256 }) {
  if (!exactOwnedRootAuthorities.has(rootAuthority) || rootAuthority.state.closed || checkpointPath !== path.join(rootAuthority.root, "construction-checkpoint.v1.json") || !SHA.test(checkpointSha256)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_AUTHORITY_INVALID", "RED_QUARANTINED");
  const journalPath = path.join(rootAuthority.root, "journal.v1.jsonl");
  assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_ROOT");
  let fd = null;
  try { fd = fs.openSync(journalPath, fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600); }
  catch (error) { if (error?.code === "EEXIST") fail("CONSTRUCTION_CHECKPOINT_CLAIM_PREEXISTS", "RED_QUARANTINED"); throw error; }
  let currentJournalIdentity = null;
  let createdJournalStableIdentity = null;
  const cleanupFailedFactory = (primaryError) => {
    let cleanupUncertain = false;
    let pathUnlinked = false;
    try {
      assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_CLEANUP_ROOT");
      const openedStat = fs.fstatSync(fd);
      const observedStat = fs.lstatSync(journalPath);
      const openedStable = checkpointClaimStableIdentity(openedStat);
      const observedStable = checkpointClaimStableIdentity(observedStat);
      if (createdJournalStableIdentity === null || !openedStat.isFile() || !observedStat.isFile() || observedStat.isSymbolicLink() || openedStat.nlink !== 1 || observedStat.nlink !== 1 || canonicalJson(openedStable) !== canonicalJson(createdJournalStableIdentity) || canonicalJson(observedStable) !== canonicalJson(createdJournalStableIdentity)) cleanupUncertain = true;
      else {
        fs.unlinkSync(journalPath); pathUnlinked = true;
        const heldAfter = fs.fstatSync(fd);
        if (canonicalJson(checkpointClaimStableIdentity(heldAfter)) !== canonicalJson(createdJournalStableIdentity) || heldAfter.nlink !== 0 || lstatIfPresent(journalPath, "CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_ABSENCE_UNREADABLE") !== null) cleanupUncertain = true;
      }
    } catch { cleanupUncertain = true; }
    const closeError = closeCheckpointClaimDescriptor(fd, "CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_CLOSE_UNCERTAIN");
    fd = null;
    if (closeError !== null) cleanupUncertain = true;
    if (pathUnlinked) {
      try { assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_CLEANUP_ROOT"); fs.fsyncSync(rootAuthority.rootFd); }
      catch { cleanupUncertain = true; }
    }
    if (cleanupUncertain) fail("CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_CLEANUP_UNCERTAIN", "RED_QUARANTINED");
    if (primaryError instanceof PhysicalRunnerError) throw primaryError;
    fail("CONSTRUCTION_CHECKPOINT_CLAIM_CREATE_FAILED", "RED");
  };
  try {
    const createdStat = fs.fstatSync(fd);
    createdJournalStableIdentity = checkpointClaimStableIdentity(createdStat);
    if (!createdStat.isFile() || createdStat.nlink !== 1 || createdStat.uid !== process.getuid() || (createdStat.mode & 0o777) !== 0o600 || createdStat.size !== 0) fail("CONSTRUCTION_CHECKPOINT_CLAIM_CREATE_DRIFT", "RED_QUARANTINED");
    fs.fchmodSync(fd, 0o600);
    currentJournalIdentity = statIdentityForCleanup(fs.fstatSync(fd));
    const createdPathIdentity = statIdentityForCleanup(fs.lstatSync(journalPath));
    if (canonicalJson(currentJournalIdentity) !== canonicalJson(createdPathIdentity) || currentJournalIdentity.nlink !== 1 || currentJournalIdentity.uid !== process.getuid() || currentJournalIdentity.mode !== 0o600) fail("CONSTRUCTION_CHECKPOINT_CLAIM_CREATE_DRIFT", "RED_QUARANTINED");
    fs.fsyncSync(fd); fs.fsyncSync(rootAuthority.rootFd);
  } catch (error) { cleanupFailedFactory(error); }
  const hashes = checkpointClaimHashes({ rootAuthority, journalIdentity: currentJournalIdentity, checkpointPath, checkpointSha256 });
  let sequence = 0;
  let previous = null;
  let phase = 0;
  let stageIdentity = null;
  let stageSha256 = null;
  let committed = false;
  let journalRemoved = false;
  let commitUncertain = false;
  let publishedPublication = null;
  const durableRecords = [];
  const append = (event, commandShapeSha256, terminalCode) => {
    const record = checkpointOwnershipRecord(sequence, previous, event, commandShapeSha256, terminalCode);
    const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
    try {
      writeAll(fd, bytes); fs.fsyncSync(fd); assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_ROOT");
      const opened = statIdentityForCleanup(fs.fstatSync(fd)); const observed = statIdentityForCleanup(fs.lstatSync(journalPath));
      if (canonicalJson(opened) !== canonicalJson(observed) || opened.nlink !== 1 || opened.uid !== process.getuid() || opened.mode !== 0o600) fail("CONSTRUCTION_CHECKPOINT_CLAIM_APPEND_DRIFT", "RED_QUARANTINED");
      currentJournalIdentity = opened; previous = sha256(bytes); sequence += 1; durableRecords.push(record);
    } finally { bytes.fill(0); }
  };
  try { append(CHECKPOINT_OWNERSHIP_EVENTS[0], hashes.baseSha256, null); }
  catch (error) { cleanupFailedFactory(error); }
  const acceptPublication = (publication, expectedNlink, code) => {
    if (!publication || publication.sha256 !== checkpointSha256 || publication.identity?.nlink !== expectedNlink) fail(code, "RED_QUARANTINED");
    const fullIdentity = checkpointClaimFullIdentity(publication.identity);
    const normalized = checkpointClaimFileIdentity(fullIdentity);
    if (fullIdentity.uid !== process.getuid() || fullIdentity.mode !== 0o600 || fullIdentity.size < 1 || fullIdentity.size > 32_768 || stageIdentity !== null && canonicalJson(normalized) !== canonicalJson(stageIdentity)) fail(code, "RED_QUARANTINED");
    return fullIdentity;
  };
  const abortJournal = () => {
    if (journalRemoved || committed) return;
    if (fd === null || createdJournalStableIdentity === null) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_AUTHORITY_INVALID", "RED_QUARANTINED");
    let primaryError = null;
    let pathUnlinked = false;
    try {
      assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_ROOT");
      const opened = fs.fstatSync(fd); const observed = fs.lstatSync(journalPath);
      if (!opened.isFile() || !observed.isFile() || observed.isSymbolicLink() || opened.nlink !== 1 || observed.nlink !== 1 || canonicalJson(checkpointClaimStableIdentity(opened)) !== canonicalJson(createdJournalStableIdentity) || canonicalJson(checkpointClaimStableIdentity(observed)) !== canonicalJson(createdJournalStableIdentity)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_DRIFT", "RED_QUARANTINED");
      fs.unlinkSync(journalPath); pathUnlinked = true;
      const heldAfter = fs.fstatSync(fd);
      if (heldAfter.nlink !== 0 || canonicalJson(checkpointClaimStableIdentity(heldAfter)) !== canonicalJson(createdJournalStableIdentity) || lstatIfPresent(journalPath, "CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_ABSENCE_UNREADABLE") !== null) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_UNLINK_INVALID", "RED_QUARANTINED");
      fs.fsyncSync(rootAuthority.rootFd);
    } catch (error) { primaryError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError("CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_UNCERTAIN", "RED_QUARANTINED"); }
    const closeError = closeCheckpointClaimDescriptor(fd, "CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_CLOSE_UNCERTAIN"); fd = null;
    if (pathUnlinked) journalRemoved = true;
    const terminalError = selectPhysicalRunnerTerminalError(primaryError, null, closeError);
    if (terminalError !== null) throw terminalError;
  };
  const commitPublishedJournal = () => {
    if (fd === null || publishedPublication === null) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_AUTHORITY_INVALID", "RED_QUARANTINED");
    const expectedJournalBytes = Buffer.from(durableRecords.map((record) => `${canonicalJson(record)}\n`).join(""), "utf8");
    let finalFd = null;
    let primaryError = null;
    let journalPathUnlinked = false;
    const assertJournalCurrent = () => {
      const openedBefore = fs.fstatSync(fd); const observedBefore = fs.lstatSync(journalPath);
      if (!openedBefore.isFile() || !observedBefore.isFile() || observedBefore.isSymbolicLink() || openedBefore.nlink !== 1 || observedBefore.nlink !== 1 || canonicalJson(statIdentityForCleanup(openedBefore)) !== canonicalJson(currentJournalIdentity) || canonicalJson(statIdentityForCleanup(observedBefore)) !== canonicalJson(currentJournalIdentity) || openedBefore.size !== expectedJournalBytes.length) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DRIFT", "RED_QUARANTINED");
      const observedBytes = readCheckpointClaimDescriptorBytes(fd, openedBefore.size, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_SHORT_READ");
      try {
        const openedAfter = fs.fstatSync(fd); const observedAfter = fs.lstatSync(journalPath);
        if (canonicalJson(statIdentityForCleanup(openedAfter)) !== canonicalJson(currentJournalIdentity) || canonicalJson(statIdentityForCleanup(observedAfter)) !== canonicalJson(currentJournalIdentity) || !observedBytes.equals(expectedJournalBytes) || sha256(observedBytes) !== sha256(expectedJournalBytes)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DRIFT", "RED_QUARANTINED");
      } finally { observedBytes.fill(0); }
    };
    const assertFinalCurrent = (code) => {
      const openedBefore = fs.fstatSync(finalFd); const observedBefore = fs.lstatSync(checkpointPath);
      if (!openedBefore.isFile() || !observedBefore.isFile() || observedBefore.isSymbolicLink() || canonicalJson(statIdentityForCleanup(openedBefore)) !== canonicalJson(publishedPublication.identity) || canonicalJson(statIdentityForCleanup(observedBefore)) !== canonicalJson(publishedPublication.identity)) fail(code, "RED_QUARANTINED");
      const observedBytes = readCheckpointClaimDescriptorBytes(finalFd, openedBefore.size, `${code}_SHORT_READ`);
      try {
        const openedAfter = fs.fstatSync(finalFd); const observedAfter = fs.lstatSync(checkpointPath);
        if (canonicalJson(statIdentityForCleanup(openedAfter)) !== canonicalJson(publishedPublication.identity) || canonicalJson(statIdentityForCleanup(observedAfter)) !== canonicalJson(publishedPublication.identity) || sha256(observedBytes) !== publishedPublication.sha256) fail(code, "RED_QUARANTINED");
      } finally { observedBytes.fill(0); }
    };
    try {
      assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_ROOT");
      const beforeFinal = fs.lstatSync(checkpointPath);
      if (canonicalJson(statIdentityForCleanup(beforeFinal)) !== canonicalJson(publishedPublication.identity)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_DRIFT", "RED_QUARANTINED");
      finalFd = fs.openSync(checkpointPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      assertFinalCurrent("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_DRIFT");
      assertJournalCurrent();
      assertFinalCurrent("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_DRIFT");
      assertJournalCurrent();
      fs.unlinkSync(journalPath); journalPathUnlinked = true;
      const heldJournalAfter = fs.fstatSync(fd);
      if (heldJournalAfter.nlink !== 0 || canonicalJson(checkpointClaimStableIdentity(heldJournalAfter)) !== canonicalJson(createdJournalStableIdentity) || lstatIfPresent(journalPath, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_ABSENCE_UNREADABLE") !== null) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_UNLINK_INVALID", "RED_QUARANTINED");
      fs.fsyncSync(rootAuthority.rootFd);
      assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_ROOT");
      assertFinalCurrent("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_POST_FSYNC_DRIFT");
    } catch (error) { primaryError = error; }
    finally {
      expectedJournalBytes.fill(0);
      const finalCloseError = finalFd === null ? null : closeCheckpointClaimDescriptor(finalFd, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_CLOSE_UNCERTAIN");
      const journalCloseError = closeCheckpointClaimDescriptor(fd, "CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_JOURNAL_CLOSE_UNCERTAIN");
      finalFd = null; fd = null;
      if (journalPathUnlinked) journalRemoved = true;
      primaryError = selectPhysicalRunnerTerminalError(primaryError, finalCloseError, journalCloseError);
    }
    if (primaryError !== null) throw primaryError;
    committed = true;
  };
  return Object.freeze({
    onTemporaryDurable(publication) {
      if (phase !== 0) fail("CONSTRUCTION_CHECKPOINT_CLAIM_STAGE_ORDER_INVALID", "RED_QUARANTINED");
      const accepted = acceptPublication(publication, 1, "CONSTRUCTION_CHECKPOINT_CLAIM_STAGE_INVALID");
      stageIdentity = checkpointClaimFileIdentity(accepted);
      stageSha256 = checkpointClaimHashes({ rootAuthority, journalIdentity: currentJournalIdentity, checkpointPath, checkpointSha256, temporaryIdentity: stageIdentity }).stageSha256;
      append(CHECKPOINT_OWNERSHIP_EVENTS[1], stageSha256, "STAGED"); phase = 1;
    },
    onLinkDurable(publication) {
      if (phase !== 1) fail("CONSTRUCTION_CHECKPOINT_CLAIM_LINK_ORDER_INVALID", "RED_QUARANTINED");
      acceptPublication(publication, 2, "CONSTRUCTION_CHECKPOINT_CLAIM_LINK_INVALID");
      append(CHECKPOINT_OWNERSHIP_EVENTS[2], stageSha256, "LINKED"); phase = 2;
    },
    onPublishedDurable(publication) {
      if (phase !== 2) fail("CONSTRUCTION_CHECKPOINT_CLAIM_PUBLISH_ORDER_INVALID", "RED_QUARANTINED");
      const accepted = acceptPublication(publication, 1, "CONSTRUCTION_CHECKPOINT_CLAIM_PUBLISH_INVALID");
      append(CHECKPOINT_OWNERSHIP_EVENTS[3], stageSha256, "PUBLISHED"); phase = 3;
      publishedPublication = Object.freeze({ sha256: publication.sha256, identity: accepted });
    },
    commit() { if (phase !== 3) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_PHASE_INVALID", "RED_QUARANTINED"); try { commitPublishedJournal(); } catch (error) { commitUncertain = true; throw error; } },
    abort() { abortJournal(); },
    preservePublishedFinal() { return commitUncertain; },
    closeForCrashTest() { if (fd !== null) { const owned = fd; fd = null; fs.closeSync(owned); } },
  });
}

function isCheckpointOwnershipJournal(records) {
  return Array.isArray(records) && records.length > 0 && records[0]?.lane === "construction" && records[0]?.event === CHECKPOINT_OWNERSHIP_EVENTS[0];
}

export function reconcileCheckpointOwnershipJournalForCleanup(authenticated, checkpointPath = path.join(authenticated?.rootAuthority?.root ?? "", "construction-checkpoint.v1.json")) {
  const { rootAuthority, journalPath, journalIdentity, records, journalReadCloseFaultCode = null } = authenticated ?? {};
  if (!exactOwnedRootAuthorities.has(rootAuthority) || rootAuthority.state.closed || checkpointPath !== path.join(rootAuthority.root, "construction-checkpoint.v1.json") || !isCheckpointOwnershipJournal(records) || records.length > CHECKPOINT_OWNERSHIP_EVENTS.length || journalIdentity === undefined) fail("CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_AUTHORITY_INVALID", "RED_QUARANTINED");
  if (journalReadCloseFaultCode !== null && journalReadCloseFaultCode !== undefined) throw new PhysicalRunnerError(journalReadCloseFaultCode, "RED_QUARANTINED");
  assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_ROOT");
  let journalFd = null;
  let candidateFd = null;
  let expectedJournalBytes = Buffer.alloc(0);
  let candidateBytes = Buffer.alloc(0);
  let primaryError = null;
  let journalUnlinked = false;
  let cleanupDurable = false;
  try {
    journalFd = fs.openSync(journalPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    expectedJournalBytes = Buffer.from(records.map((record) => `${canonicalJson(record)}\n`).join(""), "utf8");
    const assertJournalCurrent = () => {
      const openedBefore = fs.fstatSync(journalFd); const observedBefore = fs.lstatSync(journalPath);
      if (!openedBefore.isFile() || !observedBefore.isFile() || observedBefore.isSymbolicLink() || openedBefore.nlink !== 1 || observedBefore.nlink !== 1 || canonicalJson(statIdentityForCleanup(openedBefore)) !== canonicalJson(journalIdentity) || canonicalJson(statIdentityForCleanup(observedBefore)) !== canonicalJson(journalIdentity) || openedBefore.size !== expectedJournalBytes.length) fail("CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_DRIFT", "RED_QUARANTINED");
      const observedBytes = readCheckpointClaimDescriptorBytes(journalFd, openedBefore.size, "CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_SHORT_READ");
      try {
        const openedAfter = fs.fstatSync(journalFd); const observedAfter = fs.lstatSync(journalPath);
        if (canonicalJson(statIdentityForCleanup(openedAfter)) !== canonicalJson(journalIdentity) || canonicalJson(statIdentityForCleanup(observedAfter)) !== canonicalJson(journalIdentity) || !observedBytes.equals(expectedJournalBytes) || sha256(observedBytes) !== sha256(expectedJournalBytes)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_DRIFT", "RED_QUARANTINED");
      } finally { observedBytes.fill(0); }
    };
    assertJournalCurrent();
  const terminals = [null, "STAGED", "LINKED", "PUBLISHED"];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.lane !== "construction" || record.event !== CHECKPOINT_OWNERSHIP_EVENTS[index] || record.hostBindingId !== null || record.processGroupId !== null || canonicalJson(record.ownedResources) !== canonicalJson(CHECKPOINT_OWNERSHIP_RESOURCES) || record.terminalCode !== terminals[index] || record.cleanupState !== "required" || !SHA.test(record.commandShapeSha256)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_RECORD_INVALID", "RED_QUARANTINED");
  }
    if (records.length === 1) fail("CONSTRUCTION_CHECKPOINT_CLAIM_INTENT_ONLY_UNAUTHENTICATED", "RED_QUARANTINED");
  const finalPath = checkpointPath; const temporaryPath = privateWriteTemporaryPath(checkpointPath);
  const names = fs.readdirSync(rootAuthority.root).sort();
  const allowedNames = new Set([path.basename(journalPath), path.basename(finalPath), path.basename(temporaryPath)]);
  if (names.some((name) => !allowedNames.has(name))) fail("CONSTRUCTION_CHECKPOINT_CLAIM_UNKNOWN_RESIDUE", "RED_QUARANTINED");
  const finalStat = lstatIfPresent(finalPath, "CONSTRUCTION_CHECKPOINT_CLAIM_FINAL_UNREADABLE");
  const temporaryStat = lstatIfPresent(temporaryPath, "CONSTRUCTION_CHECKPOINT_CLAIM_TEMP_UNREADABLE");
    const pair = finalStat !== null && temporaryStat !== null;
    const finalOnly = finalStat !== null && temporaryStat === null;
    const temporaryOnly = finalStat === null && temporaryStat !== null;
    const permitted = records.length === 2 ? pair || finalOnly || temporaryOnly : records.length === 3 ? pair || finalOnly : finalOnly;
    if (!permitted) fail("CONSTRUCTION_CHECKPOINT_CLAIM_PHASE_RESIDUE_INVALID", "RED_QUARANTINED");
    const selectedPath = finalStat !== null ? finalPath : temporaryPath;
    const selectedStat = finalStat ?? temporaryStat;
    if (!selectedStat.isFile() || selectedStat.isSymbolicLink() || selectedStat.uid !== process.getuid() || (selectedStat.mode & 0o777) !== 0o600 || selectedStat.size < 1 || selectedStat.size > 32_768 || (pair ? selectedStat.nlink !== 2 || finalStat.dev !== temporaryStat.dev || finalStat.ino !== temporaryStat.ino || temporaryStat.nlink !== 2 : selectedStat.nlink !== 1)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_FILE_INVALID", "RED_QUARANTINED");
    candidateFd = fs.openSync(selectedPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const selectedIdentity = statIdentityForCleanup(selectedStat);
    const assertCandidateCurrent = () => {
      const openedBefore = fs.fstatSync(candidateFd); const observedBefore = fs.lstatSync(selectedPath);
      if (!openedBefore.isFile() || !observedBefore.isFile() || observedBefore.isSymbolicLink() || canonicalJson(statIdentityForCleanup(openedBefore)) !== canonicalJson(selectedIdentity) || canonicalJson(statIdentityForCleanup(observedBefore)) !== canonicalJson(selectedIdentity)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_FILE_DRIFT", "RED_QUARANTINED");
      const observedBytes = readCheckpointClaimDescriptorBytes(candidateFd, openedBefore.size, "CONSTRUCTION_CHECKPOINT_CLAIM_SHORT_READ");
      try {
        const openedAfter = fs.fstatSync(candidateFd); const observedAfter = fs.lstatSync(selectedPath);
        if (canonicalJson(statIdentityForCleanup(openedAfter)) !== canonicalJson(selectedIdentity) || canonicalJson(statIdentityForCleanup(observedAfter)) !== canonicalJson(selectedIdentity)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_FILE_DRIFT", "RED_QUARANTINED");
        return Buffer.from(observedBytes);
      } finally { observedBytes.fill(0); }
    };
    candidateBytes = assertCandidateCurrent();
      const checkpointSha256 = sha256(candidateBytes);
      const hashes = checkpointClaimHashes({ rootAuthority, journalIdentity, checkpointPath, checkpointSha256, temporaryIdentity: statIdentityForCleanup(selectedStat) });
      if (records[0].commandShapeSha256 !== hashes.baseSha256 || records.slice(1).some((record) => record.commandShapeSha256 !== hashes.stageSha256)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_HASH_DRIFT", "RED_QUARANTINED");
    const aliases = [];
    for (const candidate of [temporaryPath, finalPath]) {
      const before = lstatIfPresent(candidate, "CONSTRUCTION_CHECKPOINT_CLAIM_ALIAS_UNREADABLE");
      if (before === null) continue;
      if (!before.isFile() || before.isSymbolicLink() || before.dev !== selectedStat.dev || before.ino !== selectedStat.ino || canonicalJson(checkpointClaimFileIdentity(before)) !== canonicalJson(checkpointClaimFileIdentity(selectedStat)) || before.nlink !== selectedStat.nlink) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ALIAS_DRIFT", "RED_QUARANTINED");
      aliases.push(Object.freeze({ path: candidate, identity: statIdentityForCleanup(before) }));
    }
    assertJournalCurrent();
    const finalCandidateBytes = assertCandidateCurrent();
    try { if (!finalCandidateBytes.equals(candidateBytes) || sha256(finalCandidateBytes) !== checkpointSha256) fail("CONSTRUCTION_CHECKPOINT_CLAIM_FILE_DRIFT", "RED_QUARANTINED"); }
    finally { finalCandidateBytes.fill(0); }
    for (let aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
      const alias = aliases[aliasIndex];
      const beforeUnlink = fs.lstatSync(alias.path);
      if (canonicalJson(checkpointClaimFileIdentity(beforeUnlink)) !== canonicalJson(checkpointClaimFileIdentity(alias.identity)) || beforeUnlink.nlink !== aliases.length - aliasIndex) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ALIAS_DRIFT", "RED_QUARANTINED");
      fs.unlinkSync(alias.path);
    }
    const heldAfterAliases = fs.fstatSync(candidateFd);
    if (heldAfterAliases.nlink !== 0 || canonicalJson(checkpointClaimFileIdentity(heldAfterAliases)) !== canonicalJson(checkpointClaimFileIdentity(selectedStat))) fail("CONSTRUCTION_CHECKPOINT_CLAIM_ALIAS_UNLINK_INVALID", "RED_QUARANTINED");
    assertJournalCurrent();
    fs.unlinkSync(journalPath); journalUnlinked = true;
    const heldJournalAfter = fs.fstatSync(journalFd);
    if (heldJournalAfter.nlink !== 0 || canonicalJson(checkpointClaimStableIdentity(heldJournalAfter)) !== canonicalJson(checkpointClaimStableIdentity(journalIdentity)) || lstatIfPresent(journalPath, "CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_ABSENCE_UNREADABLE") !== null) fail("CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_UNLINK_INVALID", "RED_QUARANTINED");
    fs.fsyncSync(rootAuthority.rootFd);
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_ROOT");
    const heldCandidateAfterFsync = fs.fstatSync(candidateFd);
    if (heldCandidateAfterFsync.nlink !== 0 || canonicalJson(checkpointClaimFileIdentity(heldCandidateAfterFsync)) !== canonicalJson(checkpointClaimFileIdentity(selectedStat))) fail("CONSTRUCTION_CHECKPOINT_CLAIM_POST_CLEANUP_DRIFT", "RED_QUARANTINED");
    const heldBytesAfterFsync = readCheckpointClaimDescriptorBytes(candidateFd, heldCandidateAfterFsync.size, "CONSTRUCTION_CHECKPOINT_CLAIM_POST_CLEANUP_SHORT_READ");
    try { if (sha256(heldBytesAfterFsync) !== checkpointSha256 || !heldBytesAfterFsync.equals(candidateBytes)) fail("CONSTRUCTION_CHECKPOINT_CLAIM_POST_CLEANUP_DRIFT", "RED_QUARANTINED"); }
    finally { heldBytesAfterFsync.fill(0); }
    const residue = fs.readdirSync(rootAuthority.root);
    if (residue.length !== 0) fail("CONSTRUCTION_CHECKPOINT_CLAIM_POST_CLEANUP_RESIDUE", "RED_QUARANTINED");
    cleanupDurable = true;
  } catch (error) { primaryError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError("CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_UNCERTAIN", "RED_QUARANTINED"); }
  finally {
    expectedJournalBytes.fill(0); candidateBytes.fill(0);
    const candidateCloseError = candidateFd === null ? null : closeCheckpointClaimDescriptor(candidateFd, "CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_FILE_CLOSE_UNCERTAIN");
    const journalCloseError = journalFd === null ? null : closeCheckpointClaimDescriptor(journalFd, "CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_JOURNAL_CLOSE_UNCERTAIN");
    candidateFd = null; journalFd = null;
    primaryError = selectPhysicalRunnerTerminalError(primaryError, candidateCloseError, journalCloseError);
  }
  if (primaryError !== null) throw primaryError;
  if (!cleanupDurable || !journalUnlinked) fail("CONSTRUCTION_CHECKPOINT_CLAIM_RECOVERY_RESULT_INVALID", "RED_QUARANTINED");
  removeExactOwnedRootTree(rootAuthority, Object.freeze({}));
  return Object.freeze({ rootAbsent: true, claimRecovered: true });
}

export function finalizeFailedCheckpointWriterRoot({ rootAuthority, checkpointPath, publication = null, ownershipJournal = null }) {
  if (!exactOwnedRootAuthorities.has(rootAuthority) || rootAuthority.state.closed || checkpointPath !== path.join(rootAuthority.root, "construction-checkpoint.v1.json") || (publication !== null && (publication === undefined || !SHA.test(publication.sha256) || publication.identity === null || typeof publication.identity !== "object")) || (ownershipJournal !== null && typeof ownershipJournal?.abort !== "function")) fail("CONSTRUCTION_CHECKPOINT_WRITE_CLEANUP_AUTHORITY_INVALID", "RED_QUARANTINED");
  let checkpointFd = null;
  let bytes = Buffer.alloc(0);
  try {
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_WRITE_CLEANUP_ROOT");
    if (publication !== null && ownershipJournal?.preservePublishedFinal?.() === true) fail("CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DURABILITY_UNCERTAIN", "RED_QUARANTINED");
    if (publication !== null) {
      const before = fs.lstatSync(checkpointPath);
      if (!before.isFile() || before.isSymbolicLink() || canonicalJson(statIdentityForCleanup(before)) !== canonicalJson(publication.identity)) fail("CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_DRIFT", "RED_QUARANTINED");
      checkpointFd = fs.openSync(checkpointPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      bytes = Buffer.allocUnsafe(before.size);
      let offset = 0;
      while (offset < bytes.length) {
        const count = fs.readSync(checkpointFd, bytes, offset, bytes.length - offset, offset);
        if (count <= 0) fail("CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_SHORT_READ", "RED_QUARANTINED");
        offset += count;
      }
      const opened = fs.fstatSync(checkpointFd);
      const after = fs.lstatSync(checkpointPath);
      assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_WRITE_CLEANUP_ROOT");
      if (canonicalJson(statIdentityForCleanup(opened)) !== canonicalJson(publication.identity) || canonicalJson(statIdentityForCleanup(after)) !== canonicalJson(publication.identity) || sha256(bytes) !== publication.sha256) fail("CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_DRIFT", "RED_QUARANTINED");
      const preUnlink = fs.lstatSync(checkpointPath);
      if (canonicalJson(statIdentityForCleanup(preUnlink)) !== canonicalJson(publication.identity)) fail("CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_DRIFT", "RED_QUARANTINED");
      fs.unlinkSync(checkpointPath);
      const heldAfterUnlink = fs.fstatSync(checkpointFd);
      if (String(heldAfterUnlink.dev) !== publication.identity.device || String(heldAfterUnlink.ino) !== publication.identity.inode || heldAfterUnlink.nlink !== 0 || lstatIfPresent(checkpointPath, "CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_ABSENCE_UNREADABLE") !== null) fail("CONSTRUCTION_CHECKPOINT_WRITE_OWNED_FINAL_UNLINK_INVALID", "RED_QUARANTINED");
      fs.fsyncSync(rootAuthority.rootFd);
      fs.closeSync(checkpointFd); checkpointFd = null;
    }
    ownershipJournal?.abort();
    assertExactOwnedRootAuthorityCurrent(rootAuthority, "CONSTRUCTION_CHECKPOINT_WRITE_CLEANUP_ROOT");
    const namesBefore = fs.readdirSync(rootAuthority.root, { encoding: "buffer" });
    const namesAfter = fs.readdirSync(rootAuthority.root, { encoding: "buffer" });
    if (namesBefore.length !== 0 || namesAfter.length !== 0) fail("CONSTRUCTION_CHECKPOINT_WRITE_RESIDUE_PRESERVED", "RED_QUARANTINED");
    removeExactOwnedRootTree(rootAuthority, Object.freeze({}));
    return Object.freeze({ rootAbsent: true, ownedFinalRemoved: publication !== null });
  } catch (error) {
    closeExactOwnedRootAuthority(rootAuthority);
    if (error instanceof PhysicalRunnerError) throw error;
    fail("CONSTRUCTION_CHECKPOINT_WRITE_RESIDUE_PRESERVED", "RED_QUARANTINED");
  } finally {
    bytes.fill(0);
    if (checkpointFd !== null) try { fs.closeSync(checkpointFd); } catch {}
  }
}

export function writeFinalConstructionCheckpoint(input) {
  const { validationAggregateSha256, auditReceipts } = normalizeFinalConstructionCheckpointInputs(input);
  const authority = verifyPhaseAAuthority();
  if (authority.changedPaths.length < 1 || gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") fail("CONSTRUCTION_CHECKPOINT_REPOSITORY_NOT_CLEAN", "RED");
  const implementationHead = git(["rev-parse", "HEAD"]);
  const implementationTree = git(["rev-parse", "HEAD^{tree}"]);
  if (implementationHead === PHYSICAL_AUTHORITY.approvedProposalHead || !GIT.test(implementationHead) || !GIT.test(implementationTree)) fail("CONSTRUCTION_CHECKPOINT_IMPLEMENTATION_IDENTITY_INVALID", "RED");
  const runtime = runtimeDependencyInventory();
  const checkpoint = Object.freeze({
    schemaVersion: "r4_gate_b_physical_construction_checkpoint.v1",
    constructionRunId: HOST_BINDING_AUTHORITY.constructionRunId,
    approvedDecisionBriefSha256: HOST_BINDING_AUTHORITY.decisionBriefSha256,
    constructionPacketSha256: PHYSICAL_AUTHORITY.constructionPacketSha256,
    constructionOwnerReviewSha256: PHYSICAL_AUTHORITY.constructionOwnerReviewSha256,
    approvedProposalHead: PHYSICAL_AUTHORITY.approvedProposalHead,
    approvedProposalTree: PHYSICAL_AUTHORITY.approvedProposalTree,
    implementationHead,
    implementationTree,
    physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"),
    hostBindingModuleSha256: fileSha("scripts/r4-gate-b-host-binding.mjs"),
    physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"),
    runnerContractSha256: fileSha("schemas/r4/gate-b-core/physical-runner-contract.json"),
    codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb"),
    runtimeDependencyCount: runtime.fileCount,
    runtimeDependencyAggregateSha256: runtime.aggregateSha256,
    runtimeDependencies: runtime.files,
    validationAggregateSha256,
    auditReceipts: Object.freeze({ ...auditReceipts }),
  });
  validateSchema("schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json", checkpoint, "CONSTRUCTION_CHECKPOINT_SCHEMA_INVALID");
  if (lstatIfPresent(CONSTRUCTION_ROOT, "CONSTRUCTION_CHECKPOINT_ROOT_UNREADABLE") !== null) fail("CONSTRUCTION_CHECKPOINT_ROOT_PREEXISTS", "RED_QUARANTINED");
  ensureOwnedPrivateDirectory(path.dirname(CONSTRUCTION_ROOT));
  const checkpointRootAuthority = createExclusiveOwnedRoot0700(CONSTRUCTION_ROOT, REPOSITORY_ROOT, "CONSTRUCTION_CHECKPOINT_ROOT");
  let retained = false;
  let checkpointPublication = null;
  let checkpointOwnershipJournal = null;
  let primaryError = null;
  try {
    const bytes = Buffer.from(`${canonicalJson(checkpoint)}\n`, "utf8");
    try {
      checkpointOwnershipJournal = createCheckpointOwnershipJournal({ rootAuthority: checkpointRootAuthority, checkpointPath: CHECKPOINT_PATH, checkpointSha256: sha256(bytes) });
      checkpointPublication = atomicWritePrivateFile(CHECKPOINT_PATH, bytes, 0o600, {
        onTemporaryDurable: checkpointOwnershipJournal.onTemporaryDurable,
        onLinkDurable: checkpointOwnershipJournal.onLinkDurable,
        onPublishedDurable: checkpointOwnershipJournal.onPublishedDurable,
      });
    }
    finally { bytes.fill(0); }
    const reopened = readCheckpoint({ rootAuthority: checkpointRootAuthority });
    if (canonicalJson(reopened) !== canonicalJson(checkpoint)) fail("CONSTRUCTION_CHECKPOINT_REOPEN_DRIFT", "RED");
    verifyFrozenImplementation(reopened);
    const checkpointSha256 = checkpointPublication.sha256;
    checkpointOwnershipJournal.commit();
    assertClosedExactOwnedRootInventory(checkpointRootAuthority, CONSTRUCTION_CHECKPOINT_INVENTORY, "CONSTRUCTION_CHECKPOINT_ROOT");
    closeExactOwnedRootAuthority(checkpointRootAuthority, "CONSTRUCTION_CHECKPOINT_ROOT_AUTHORITY_CLOSE_FAILED");
    retained = true;
    return Object.freeze({ schemaVersion: "r4_gate_b_physical_construction_checkpoint_write.v1", status: "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN", checkpointSha256, implementationHead, implementationTree, hostBindingInputRead: false, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (!retained && !checkpointRootAuthority.state.closed) {
      try { finalizeFailedCheckpointWriterRoot({ rootAuthority: checkpointRootAuthority, checkpointPath: CHECKPOINT_PATH, publication: checkpointPublication, ownershipJournal: checkpointOwnershipJournal }); }
      catch (cleanupError) { throw selectPhysicalRunnerTerminalError(primaryError, cleanupError, null); }
    }
  }
}

export async function preparePhaseBHostBindingPreInput({
  constructionRoot = CONSTRUCTION_ROOT,
  checkpointReader = readCheckpoint,
  implementationVerifier = verifyFrozenImplementation,
  journalFactory = createConstructionJournal,
  afterJournalAuthorityTransfer = () => {},
} = {}) {
  if (!path.isAbsolute(constructionRoot) || path.normalize(constructionRoot) !== constructionRoot || typeof checkpointReader !== "function" || typeof implementationVerifier !== "function" || typeof journalFactory !== "function" || typeof afterJournalAuthorityTransfer !== "function") fail("PHASE_B_PRE_INPUT_CONTROLLER_AUTHORITY_INVALID", "RED_QUARANTINED");
  if (constructionRoot === CONSTRUCTION_ROOT && (checkpointReader !== readCheckpoint || implementationVerifier !== verifyFrozenImplementation || journalFactory !== createConstructionJournal)) fail("PHASE_B_PRE_INPUT_PRODUCTION_OVERRIDE_DENIED", "RED_QUARANTINED");
  let rootAuthority = null;
  let checkpointInventoryAuthenticated = false;
  let checkpoint = null;
  let journal = null;
  let prepared = false;
  let primaryError = null;
  let cleanupError = null;
  let finalizationError = null;
  try {
    rootAuthority = openExactOwnedRootAuthority({ root: constructionRoot, anchor: exactOwnedRootAnchor(constructionRoot, "PHASE_B_CONSTRUCTION_ROOT"), codePrefix: "PHASE_B_CONSTRUCTION_ROOT" });
    verifyPhaseBConstructionRootInventory(constructionRoot, "checkpoint-only", { rootAuthority });
    checkpointInventoryAuthenticated = true;
    checkpoint = checkpointReader({ constructionRoot, checkpointPath: path.join(constructionRoot, "construction-checkpoint.v1.json"), rootAuthority });
    implementationVerifier(checkpoint);
    journal = journalFactory(constructionRoot, { rootAuthority });
    const transferredRootAuthority = journal.takeRootAuthority();
    if (transferredRootAuthority !== rootAuthority) fail("PHASE_B_PRE_INPUT_ROOT_AUTHORITY_TRANSFER_DRIFT", "RED_QUARANTINED");
    rootAuthority = transferredRootAuthority;
    afterJournalAuthorityTransfer({ constructionRoot, checkpoint, journal, rootAuthority });
    verifyPhaseBConstructionRootInventory(constructionRoot, "checkpoint-and-journal", { rootAuthority });
    prepared = true;
  } catch (error) {
    primaryError = error instanceof PhysicalRunnerError || error instanceof HostBindingError ? error : new PhysicalRunnerError("PHASE_B_PRE_INPUT_UNCONTROLLED", "RED");
  } finally {
    if (!prepared) {
      if (journal !== null) {
        try { journal.close(); }
        catch { finalizationError = new PhysicalRunnerError("PHASE_B_PRE_INPUT_JOURNAL_CLOSE_FAILED", "RED"); }
        try { journal.zeroize(); }
        catch { finalizationError = selectPhysicalRunnerTerminalError(finalizationError, null, new PhysicalRunnerError("PHASE_B_PRE_INPUT_JOURNAL_ZEROIZATION_FAILED", "RED")); }
      }
      if (rootAuthority !== null) {
        if (checkpointInventoryAuthenticated) {
          try { removeExactOwnedRootTree(rootAuthority, journal === null ? CONSTRUCTION_CHECKPOINT_CLEANUP_INVENTORY : PHASE_B_PRE_INPUT_DELETE_INVENTORY); }
          catch (error) { cleanupError = error instanceof PhysicalRunnerError ? error : new PhysicalRunnerError("PHASE_B_PRE_INPUT_CLEANUP_FAILED", "RED_QUARANTINED"); }
        } else {
          try { closeExactOwnedRootAuthority(rootAuthority, "PHASE_B_PRE_INPUT_ROOT_AUTHORITY_CLOSE_FAILED"); }
          catch (error) { cleanupError = error; }
        }
        rootAuthority = null;
      }
    }
  }
  const terminalError = selectPhysicalRunnerTerminalError(primaryError, cleanupError, finalizationError);
  if (terminalError !== null) {
    terminalError.hostBindingInputRead = false;
    throw terminalError;
  }
  if (!prepared || checkpoint === null || journal === null || rootAuthority === null) fail("PHASE_B_PRE_INPUT_RESULT_MISSING", "RED");
  return Object.freeze({ checkpoint, journal, rootAuthority, hostBindingInputRead: false });
}

export function withAuthenticatedConstructionRollbackPlan(authenticated, action) {
  if (authenticated?.alreadyAbsent !== false || !Array.isArray(authenticated.records) || authenticated.rootAuthority === undefined || typeof action !== "function") fail("HOST_BINDING_ROLLBACK_JOURNAL_AUTHORITY_INVALID", "RED_QUARANTINED");
  let result;
  let primaryError = null;
  let finalizationError = authenticated.journalReadCloseFaultCode !== null && authenticated.journalReadCloseFaultCode !== undefined ? new PhysicalRunnerError(authenticated.journalReadCloseFaultCode, "RED") : null;
  try {
    result = action(validateConstructionJournalForCleanup(authenticated.records));
  } catch (error) {
    primaryError = error instanceof PhysicalRunnerError || error instanceof HostBindingError ? error : new PhysicalRunnerError("HOST_BINDING_ROLLBACK_UNCONTROLLED", "RED");
  } finally {
    try { closeExactOwnedRootAuthority(authenticated.rootAuthority, "HOST_BINDING_ROLLBACK_ROOT_AUTHORITY_CLOSE_FAILED"); }
    catch (error) { finalizationError = selectPhysicalRunnerTerminalError(finalizationError, null, error); }
  }
  const terminalError = selectPhysicalRunnerTerminalError(primaryError, null, finalizationError);
  if (terminalError !== null) throw terminalError;
  return result;
}

function mergeHostInspectionObservations(...observations) {
  const values = observations.filter((value) => value !== null && value !== undefined);
  if (values.length === 0) return Object.freeze({ dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
  const maximum = (key) => Math.max(...values.map((value) => Number.isInteger(value?.[key]) ? value[key] : 0));
  const activeProcessGroups = maximum("activeProcessGroups");
  const unknownProcessGroups = maximum("unknownProcessGroups");
  return Object.freeze({
    dockerCliStarts: maximum("dockerCliStarts"),
    localDockerUnixSocketRequests: maximum("localDockerUnixSocketRequests"),
    macosInspectorStarts: maximum("macosInspectorStarts"),
    activeProcessGroups,
    unknownProcessGroups,
    cleanupState: unknownProcessGroups > 0 ? "unknown" : activeProcessGroups > 0 ? "active" : "observed-absent",
    quarantineState: unknownProcessGroups > 0 ? "quarantined" : "none",
  });
}

export async function finalizeHostBindingOnce() {
  const zeroHostInspection = Object.freeze({ dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
  let preparation;
  try { preparation = await preparePhaseBHostBindingPreInput(); }
  catch (error) {
    if (error instanceof PhysicalRunnerError || error instanceof HostBindingError) error.hostInspection = zeroHostInspection;
    throw error;
  }
  const { checkpoint, journal, rootAuthority: constructionRootAuthority } = preparation;
  let terminalError = null;
  let hostFinalizationError = null;
  let returnValue = null;
  let hostBindingResult = null;
  let publicReceiptSha256 = null;
  let inspector = null;
  let lastHostInspection = zeroHostInspection;
  try {
    await journal.append({ lane: "host-binding", event: "input-open-intent", commandShapeSha256: sha256(Buffer.from("fixed-owner-input-open-v1\n")), ownedResources: ["owner-input-envelope"], cleanupState: "required" });
    const ownerInput = readAndConsumeHostBindingInput(INPUT_PATH);
    await prepareBlockedStartSlotRoot(CONSTRUCTION_ROOT, journal, "host-binding");
    const processPort = createProductionBlockedProcessPort(CONSTRUCTION_ROOT);
    inspector = createProcessHostInspector({ root: CONSTRUCTION_ROOT, processPort, journal: (entry) => journal.append({ ...entry, ownedResources: ["inspector-process-group"], cleanupState: entry.cleanupState ?? "required" }) });
    hostBindingResult = await finalizeHostBinding({ repositoryRoot: REPOSITORY_ROOT, constructionRoot: CONSTRUCTION_ROOT, checkpoint, ownerInput, inspector });
    lastHostInspection = inspector.snapshot();
    verifyFrozenImplementation(checkpoint);
    const capsuleParent = ensureOwnedPrivateDirectory(CAPSULE_ROOT);
    const capsulePath = path.join(capsuleParent, `${hostBindingResult.hostBindingId}.json`);
    requirePathEntryAbsent(capsulePath, "HOST_BINDING_CAPSULE_TARGET_PREEXISTS", "RED");
    await journal.append({ lane: "host-binding", event: "capsule-target-absent", hostBindingId: hostBindingResult.hostBindingId, commandShapeSha256: hostBindingResult.capsuleSha256, ownedResources: ["host-binding-capsule"], cleanupState: "required" });
    await journal.append({ lane: "host-binding", event: "capsule-publication-intent", hostBindingId: hostBindingResult.hostBindingId, commandShapeSha256: hostBindingResult.capsuleSha256, ownedResources: ["host-binding-capsule"], cleanupState: "required" });
    await atomicPublishConstructionFile(capsulePath, hostBindingResult.capsuleBytes, { mode: 0o600, kind: "capsule", parent: capsuleParent, journal, hostBindingId: hostBindingResult.hostBindingId, stageEvent: "capsule-stage-ready", stageResource: "host-binding-capsule-stage" });
    observeExactPublishedFile(capsulePath, 0o600, hostBindingResult.capsuleSha256, hostBindingResult.capsuleBytes, 2_097_152, 2);
    const receiptParent = assertExistingRepoDirectory(path.dirname(PUBLIC_RECEIPT_PATH), "TRACKED_WRITE_PARENT_UNSAFE");
    requirePathEntryAbsent(PUBLIC_RECEIPT_PATH, "HOST_BINDING_PUBLIC_RECEIPT_TARGET_PREEXISTS", "RED");
    publicReceiptSha256 = sha256(hostBindingResult.publicReceiptBytes);
    await journal.append({ lane: "host-binding", event: "public-receipt-target-absent", hostBindingId: hostBindingResult.hostBindingId, commandShapeSha256: publicReceiptSha256, ownedResources: ["public-receipt"], cleanupState: "required" });
    await journal.append({ lane: "host-binding", event: "public-receipt-publication-intent", hostBindingId: hostBindingResult.hostBindingId, commandShapeSha256: publicReceiptSha256, ownedResources: ["public-receipt"], cleanupState: "required" });
    await atomicPublishConstructionFile(PUBLIC_RECEIPT_PATH, hostBindingResult.publicReceiptBytes, { mode: 0o644, kind: "public-receipt", parent: receiptParent, journal, hostBindingId: hostBindingResult.hostBindingId, stageEvent: "public-receipt-stage-ready", stageResource: "public-receipt-stage" });
    observeExactPublishedFile(PUBLIC_RECEIPT_PATH, 0o644, publicReceiptSha256, hostBindingResult.publicReceiptBytes, 1_048_576, 2);
    verifyFrozenImplementationAfterPublicReceipt(checkpoint, publicReceiptSha256, 2);
    observeExactPublishedFile(capsulePath, 0o600, hostBindingResult.capsuleSha256, hostBindingResult.capsuleBytes, 2_097_152, 2);
    observeExactPublishedFile(PUBLIC_RECEIPT_PATH, 0o644, publicReceiptSha256, hostBindingResult.publicReceiptBytes, 1_048_576, 2);
    await journal.append({ lane: "host-binding", event: "capsule-published", hostBindingId: hostBindingResult.hostBindingId, commandShapeSha256: hostBindingResult.capsuleSha256, ownedResources: ["host-binding-capsule", "public-receipt"], terminalCode: "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW", cleanupState: "retain-capsule" });
    returnValue = Object.freeze({ schemaVersion: "r4_gate_b_host_binding_result.v1", status: "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW", hostBindingId: hostBindingResult.hostBindingId, hostBindingCapsuleSha256: hostBindingResult.capsuleSha256, hostBindingPublicReceiptSha256: publicReceiptSha256, expiresAt: hostBindingResult.expiresAt, dockerReadOnlyCliCalls: 3, localDockerUnixSocketRequests: 2, macosReadOnlyInspectionCalls: 9, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: "YELLOW" });
  } catch (error) {
    lastHostInspection = mergeHostInspectionObservations(error?.partialObservation, inspector?.snapshot(), lastHostInspection);
    if (error instanceof HostBindingError || error instanceof PhysicalRunnerError) {
      error.partialObservation = lastHostInspection;
      terminalError = error;
    } else {
      terminalError = new PhysicalRunnerError("HOST_BINDING_UNCONTROLLED_TERMINAL", "RED");
      terminalError.partialObservation = lastHostInspection;
    }
  } finally {
    lastHostInspection = mergeHostInspectionObservations(lastHostInspection, inspector?.snapshot());
    try { journal.close(); }
    catch { hostFinalizationError = new PhysicalRunnerError("HOST_BINDING_JOURNAL_CLOSE_FAILED", "RED_QUARANTINED"); hostFinalizationError.partialObservation = lastHostInspection; }
    try { journal.zeroize(); }
    catch {
      hostFinalizationError = selectPhysicalRunnerTerminalError(hostFinalizationError, null, new PhysicalRunnerError("HOST_BINDING_JOURNAL_ZEROIZATION_FAILED", "RED"));
      hostFinalizationError.partialObservation = lastHostInspection;
    }
    terminalError = selectPhysicalRunnerTerminalError(terminalError, null, hostFinalizationError);
    if (terminalError !== null) terminalError.partialObservation = lastHostInspection;
    try {
      await cleanupConstruction({ retainCompletePublication: terminalError === null && returnValue !== null, rootAuthority: constructionRootAuthority });
      if (terminalError === null && returnValue !== null && hostBindingResult !== null && publicReceiptSha256 !== null) {
        const capsulePath = path.join(CAPSULE_ROOT, `${hostBindingResult.hostBindingId}.json`);
        observeExactPublishedFile(capsulePath, 0o600, hostBindingResult.capsuleSha256, hostBindingResult.capsuleBytes, 2_097_152);
        observeExactPublishedFile(PUBLIC_RECEIPT_PATH, 0o644, publicReceiptSha256, hostBindingResult.publicReceiptBytes, 1_048_576);
        verifyFrozenImplementationAfterPublicReceipt(checkpoint, publicReceiptSha256);
      }
      if (terminalError !== null) {
        lastHostInspection = Object.freeze({ ...lastHostInspection, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
        if (terminalError.verdict === "YELLOW_QUARANTINED") terminalError = new PhysicalRunnerError(terminalError.code ?? "HOST_BINDING_INCOMPLETE_YELLOW", "YELLOW_NO_RETRY");
        else if (terminalError.verdict === "RED_QUARANTINED") terminalError = new PhysicalRunnerError(terminalError.code ?? "HOST_BINDING_TERMINAL_RED", "RED");
        terminalError.partialObservation = lastHostInspection;
      }
    } catch (cleanupError) {
      let publicationRollbackFailed = false;
      if (hostBindingResult !== null) {
        const capsulePath = path.join(CAPSULE_ROOT, `${hostBindingResult.hostBindingId}.json`);
        try {
          if (lstatIfPresent(CONSTRUCTION_ROOT, "HOST_BINDING_ROLLBACK_ROOT_UNREADABLE") !== null) {
            const authenticatedRollback = readConstructionJournalForCleanup();
            withAuthenticatedConstructionRollbackPlan(authenticatedRollback, (rollbackPlan) => {
              reconcileConstructionPublication({ finalPath: capsulePath, temporaryPath: privateWriteTemporaryPath(capsulePath), stagePath: constructionPublicationStagePath("capsule"), expectedMode: 0o600, expectedSha256: hostBindingResult.capsuleSha256, retain: false, externalLinksAuthorized: rollbackPlan.capsuleStageReady });
              if (publicReceiptSha256 !== null) reconcileConstructionPublication({ finalPath: PUBLIC_RECEIPT_PATH, temporaryPath: path.join(path.dirname(PUBLIC_RECEIPT_PATH), `.${path.basename(PUBLIC_RECEIPT_PATH)}.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`), stagePath: constructionPublicationStagePath("public-receipt"), expectedMode: 0o644, expectedSha256: publicReceiptSha256, retain: false, externalLinksAuthorized: rollbackPlan.receiptStageReady });
            });
          } else {
            removeExactPublishedFile(capsulePath, 0o600, hostBindingResult.capsuleSha256);
            if (publicReceiptSha256 !== null) removeExactPublishedFile(PUBLIC_RECEIPT_PATH, 0o644, publicReceiptSha256);
          }
        } catch { publicationRollbackFailed = true; }
      }
      const normalizedCleanupError = publicationRollbackFailed ? new PhysicalRunnerError("HOST_BINDING_PUBLICATION_ROLLBACK_FAILED", "RED_QUARANTINED") : cleanupError;
      normalizedCleanupError.partialObservation = lastHostInspection;
      terminalError = selectPhysicalRunnerTerminalError(terminalError, normalizedCleanupError, hostFinalizationError);
      terminalError.partialObservation = lastHostInspection;
    }
    hostBindingResult?.capsuleBytes?.fill(0);
    hostBindingResult?.publicReceiptBytes?.fill(0);
  }
  if (terminalError !== null) {
    if (terminalError?.partialObservation !== undefined) terminalError.hostInspection = terminalError.partialObservation;
    throw terminalError;
  }
  if (returnValue === null) fail("HOST_BINDING_RESULT_MISSING", "RED");
  return returnValue;
}

async function run(argv) {
  const parsed = parsePhysicalRunnerArguments(argv);
  if (parsed.mode === "construct-physical-adapters") return await constructPhysicalAdapters();
  if (parsed.mode === "finalize-host-binding") return await finalizeHostBindingOnce();
  if (parsed.mode === "cleanup-construction") return await cleanupConstruction();
  if (parsed.mode === "cleanup-core-retry") return await cleanupCoreRetry(parsed);
  if (parsed.mode === "execute-core-retry") return await executeCoreRetry(parsed);
  fail("PHYSICAL_RUNNER_MODE_UNREACHABLE", "RED");
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  run(process.argv.slice(2)).then((result) => process.stdout.write(`${canonicalJson(result)}\n`)).catch((error) => {
    const body = { schemaVersion: "r4_gate_b_physical_runner_error.v1", code: error?.code ?? "PHYSICAL_RUNNER_UNCONTROLLED", verdict: error?.verdict ?? "RED", ...(error?.hostInspection === undefined ? {} : { hostInspection: error.hostInspection }) };
    process.stdout.write(`${canonicalJson(body)}\n`);
    process.exitCode = 1;
  });
}
