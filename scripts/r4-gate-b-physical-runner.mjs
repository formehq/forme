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
  atomicWritePrivateFile,
  createProcessHostInspector,
  finalizeHostBinding,
  readAndRevalidateHostBindingCapsule,
  readAndConsumeHostBindingInput,
  sha256,
} from "./r4-gate-b-host-binding.mjs";
import {
  PHYSICAL_AUTHORITY,
  buildCodexPhysicalPlan,
  buildMacOSPhysicalPlan,
  buildPostgresPhysicalPlan,
  macosSyntheticFrameBytes,
  runConstructionFakeMatrix,
  validateMacOSHelperTerminal,
  validateMacOSSyntheticFeederCompletion,
  validateRaceCatalog,
} from "./r4-gate-b-physical-port.mjs";
import {
  CORE_CODEX_LAUNCHER_SHA256,
  CORE_CODEX_NATIVE_SHA256,
  CORE_CODEX_SCHEMA_COUNT,
  CORE_CODEX_SCHEMA_SHA256,
  CORE_CODEX_SELECTED_SCHEMAS,
  copyOpenedRegularFile,
  coreCodexLayout,
  runCoreCodexZeroCall,
  validateCoreCodexLogicalCommand,
} from "../packages/r4-codex-adapter/src/zero-call-physical.ts";
import { guardClientMessage, initializeMessage, initializedMessage } from "../packages/r4-codex-adapter/src/app-server-probe.ts";

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

export function parsePhysicalRunnerArguments(argv) {
  if (argv.length === 1 && argv[0] === "construct-physical-adapters") return Object.freeze({ mode: "construct-physical-adapters" });
  if (argv.length === 1 && argv[0] === "finalize-host-binding") return Object.freeze({ mode: "finalize-host-binding" });
  if (argv.length === 3 && argv[0] === "cleanup-construction" && argv[1] === "--construction-packet-sha" && argv[2] === PHYSICAL_AUTHORITY.constructionPacketSha256) return Object.freeze({ mode: "cleanup-construction", constructionPacketSha256: argv[2] });
  if (argv.length === 7 && ["execute-core-retry", "cleanup-core-retry"].includes(argv[0]) && argv[1] === "--manifest-sha" && argv[3] === "--execution-grant" && argv[5] === "--host-binding-id" && SHA.test(argv[2]) && argv[2] === argv[4] && ID.test(argv[6])) return Object.freeze({ mode: argv[0], manifestSha256: argv[2], executionGrantSha256: argv[4], hostBindingId: argv[6] });
  fail("PHYSICAL_RUNNER_ARGUMENTS_DENIED", "RED");
}

function currentChangedPaths() {
  const output = gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]).replace(/\n$/u, "");
  if (!output) return [];
  return output.split("\n").map((line) => line.slice(3).replace(/^"|"$/gu, "")).map((value) => value.includes(" -> ") ? value.split(" -> ").at(-1) : value);
}
export function verifyPhaseAAuthority() {
  if (fileSha(PACKET_PATH) !== PHYSICAL_AUTHORITY.constructionPacketSha256 || fileSha(REVIEW_PATH) !== PHYSICAL_AUTHORITY.constructionOwnerReviewSha256) fail("PHYSICAL_APPROVAL_BYTES_DRIFT", "RED");
  for (const [relativePath, expected] of Object.entries(IMMUTABLE_HASHES)) if (fileSha(relativePath) !== expected) fail(`PHYSICAL_IMMUTABLE_DRIFT:${relativePath}`, "RED");
  if (git(["branch", "--show-current"]) !== "codex/r4-gate-a-build") fail("PHYSICAL_BRANCH_DRIFT", "RED");
  const mergeBase = git(["merge-base", PHYSICAL_AUTHORITY.approvedProposalHead, "HEAD"]);
  if (mergeBase !== PHYSICAL_AUTHORITY.approvedProposalHead) fail("PHYSICAL_PROPOSAL_NOT_ANCESTOR", "RED");
  const proposalTree = git(["rev-parse", `${PHYSICAL_AUTHORITY.approvedProposalHead}^{tree}`]);
  if (proposalTree !== PHYSICAL_AUTHORITY.approvedProposalTree) fail("PHYSICAL_PROPOSAL_TREE_DRIFT", "RED");
  const changed = currentChangedPaths();
  for (const relativePath of changed) if (!ALLOWED_PATHS.has(relativePath)) fail(`PHYSICAL_WORKSET_ESCAPE:${relativePath}`, "RED");
  return Object.freeze({ changedPaths: Object.freeze(changed.sort()), packetSha256: PHYSICAL_AUTHORITY.constructionPacketSha256, proposalAncestor: true, packageLockSha256: IMMUTABLE_HASHES["package-lock.json"] });
}

export function createConstructionJournal(root = CONSTRUCTION_ROOT) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const journalPath = path.join(root, "journal.v1.jsonl");
  const fd = fs.openSync(journalPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  let sequence = 0;
  let previous = null;
  const raw = [];
  const records = [];
  return Object.freeze({
    path: journalPath,
    async append(partial) {
      const record = Object.freeze({
        schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous,
        runId: HOST_BINDING_AUTHORITY.constructionRunId, manifestSha256: null, hostBindingId: partial.hostBindingId ?? null,
        lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null,
        processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required",
      });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      fs.writeSync(fd, bytes); fs.fsyncSync(fd); raw.push(Buffer.from(bytes)); records.push(record); previous = sha256(bytes); sequence += 1;
      return record;
    },
    close() { fs.closeSync(fd); },
    aggregateSha256() { return sha256(Buffer.concat(raw)); },
    records() { return Object.freeze([...records]); },
    zeroize() { for (const bytes of raw) bytes.fill(0); },
  });
}

function safeRemoveExactTree(root) {
  if (!path.isAbsolute(root) || path.dirname(root) !== path.join(REPOSITORY_ROOT, ".forme/gate-b-physical-construction")) fail("CONSTRUCTION_CLEANUP_ROOT_INVALID", "RED");
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 0 }); } catch { fail("CONSTRUCTION_CLEANUP_FAILED", "RED_QUARANTINED"); }
  if (fs.existsSync(root)) fail("CONSTRUCTION_CLEANUP_ABSENCE_UNKNOWN", "RED_QUARANTINED");
}
function atomicWriteTrackedFile(target, bytes) {
  const parent = path.dirname(target);
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o644);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, target);
  const parentFd = fs.openSync(parent, fs.constants.O_RDONLY);
  try { fs.fsyncSync(parentFd); } finally { fs.closeSync(parentFd); }
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
function appendBounded(prior, chunk, limit) {
  if (prior.length > limit) return prior;
  const next = Buffer.concat([prior, chunk]);
  prior.fill(0);
  if (next.length <= limit) return next;
  const capped = Buffer.from(next.subarray(0, limit + 1));
  next.fill(0);
  return capped;
}

async function runClosedProcess(command, { journal, lane, stdin = null, acceptedExitCodes = command.expectedExitCodes ?? [0] } = {}) {
  if (!command || !path.isAbsolute(command.executable) || !Array.isArray(command.argv) || !path.isAbsolute(command.cwd) || command.shell !== false || command.callerArguments !== 0 || !Number.isInteger(command.deadlineMilliseconds) || command.deadlineMilliseconds < 1 || !Number.isInteger(command.stdoutLimitBytes) || !Number.isInteger(command.stderrLimitBytes)) fail("PHYSICAL_PROCESS_COMMAND_DENIED", "RED");
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: command.executable, argv: command.argv, cwd: command.cwd, environment: command.environment, deadlineMilliseconds: command.deadlineMilliseconds, stdoutLimitBytes: command.stdoutLimitBytes, stderrLimitBytes: command.stderrLimitBytes }), "utf8"));
  await journal.append({ lane, event: `intent:${command.kind}`, commandShapeSha256, ownedResources: [`${lane}-process-group`], cleanupState: "required" });
  const child = spawn(command.executable, command.argv, { cwd: command.cwd, env: { ...command.environment }, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe"] });
  if (!Number.isInteger(child.pid)) fail("PHYSICAL_PROCESS_PID_MISSING", "RED");
  const processGroupId = child.pid;
  await journal.append({ lane, event: `started:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], cleanupState: "required" });
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let overflow = false;
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, command.stdoutLimitBytes); if (stdout.length > command.stdoutLimitBytes) { overflow = true; signalGroup(processGroupId, "SIGTERM"); } });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, command.stderrLimitBytes); if (stderr.length > command.stderrLimitBytes) { overflow = true; signalGroup(processGroupId, "SIGTERM"); } });
  const closed = new Promise((resolve) => {
    let settled = false;
    child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
    child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
  });
  if (stdin === null) child.stdin.end();
  else {
    const owned = Buffer.isBuffer(stdin) ? Buffer.from(stdin) : Buffer.from(stdin, "utf8");
    try { child.stdin.end(owned); } finally { owned.fill(0); }
  }
  let timedOut = false;
  let timeoutId;
  const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve(null), command.deadlineMilliseconds); });
  let terminal = await Promise.race([closed, timeout]);
  clearTimeout(timeoutId);
  if (terminal === null) {
    timedOut = true;
    signalGroup(processGroupId, "SIGTERM");
    terminal = await Promise.race([closed, new Promise((resolve) => setTimeout(() => resolve(null), 2_000))]);
    if (terminal === null) {
      signalGroup(processGroupId, "SIGKILL");
      terminal = await Promise.race([closed, new Promise((resolve) => setTimeout(() => resolve(null), 2_000))]);
    }
  }
  const absent = await stopAndProveGroupAbsent(processGroupId);
  await journal.append({ lane, event: `terminal:${command.kind}`, commandShapeSha256, processGroupId, ownedResources: [`${lane}-process-group`], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
  if (terminal === null || terminal.error || timedOut || overflow || !absent || terminal.signal !== null || !acceptedExitCodes.includes(terminal.code) || stdout.length > command.stdoutLimitBytes || stderr.length > command.stderrLimitBytes) {
    stdout.fill(0); stderr.fill(0);
    fail("PHYSICAL_PROCESS_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
  }
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
    exactObject(value, new Set(["schemaVersion", "implementationHead", "implementationTree", "hostBindingId", "hostBindingCapsuleSha256", "hostBindingPublicReceiptSha256", "physicalRunnerSha256", "physicalPortSha256", "codexProfileSha256", "aggregateCeiling"]), "RETRY_MANIFEST_AUTHORITY_SHAPE");
    if (value.schemaVersion !== "r4_gate_b_physical_retry_authority.v1" || value.hostBindingId !== parsed.hostBindingId || value.aggregateCeiling !== "YELLOW" || !GIT.test(value.implementationHead) || !GIT.test(value.implementationTree) || !SHA.test(value.hostBindingCapsuleSha256) || !SHA.test(value.hostBindingPublicReceiptSha256) || !SHA.test(value.physicalRunnerSha256) || !SHA.test(value.physicalPortSha256) || !SHA.test(value.codexProfileSha256)) fail("RETRY_MANIFEST_AUTHORITY_INVALID", "RED");
    if (match[1] !== canonicalJson(value)) fail("RETRY_MANIFEST_AUTHORITY_NOT_CANONICAL", "RED");
    return Object.freeze(value);
  } finally { bytes.fill(0); }
}

function readPublicHostBindingReceipt(expected) {
  const bytes = fs.readFileSync(PUBLIC_RECEIPT_PATH);
  try {
    if (sha256(bytes) !== expected.hostBindingPublicReceiptSha256 || bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a)) fail("HOST_BINDING_PUBLIC_RECEIPT_DRIFT", "RED");
    const value = parseStrictJson(bytes.subarray(0, -1).toString("utf8"));
    if (`${canonicalJson(value)}\n` !== bytes.toString("utf8") || value.hostBindingId !== expected.hostBindingId || value.hostBindingCapsuleSha256 !== expected.hostBindingCapsuleSha256 || value.implementationHead !== expected.implementationHead || value.implementationTree !== expected.implementationTree || value.retryExecutionGrant !== "NOT_REQUESTED" || value.firstProviderCallGrant !== "NOT_REQUESTED") fail("HOST_BINDING_PUBLIC_RECEIPT_INVALID", "RED");
    return Object.freeze(value);
  } finally { bytes.fill(0); }
}

function verifyRetryRepositoryAuthority(authority) {
  if (gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") fail("RETRY_REPOSITORY_DIRTY", "RED");
  if (git(["cat-file", "-t", authority.implementationHead]) !== "commit" || git(["rev-parse", `${authority.implementationHead}^{tree}`]) !== authority.implementationTree || git(["merge-base", authority.implementationHead, "HEAD"]) !== authority.implementationHead) fail("RETRY_IMPLEMENTATION_LINEAGE_DRIFT", "RED");
  const actual = { physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"), physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"), codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb") };
  for (const [key, value] of Object.entries(actual)) if (authority[key] !== value) fail("RETRY_IMPLEMENTATION_BYTE_DRIFT", "RED");
  return Object.freeze(actual);
}

function createRetryJournal(root, manifestSha256, hostBindingId, runId) {
  fs.mkdirSync(root, { recursive: false, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const journalPath = path.join(root, "journal.v1.jsonl");
  const fd = fs.openSync(journalPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  let sequence = 0;
  let previous = null;
  const raw = [];
  const records = [];
  return Object.freeze({
    path: journalPath,
    async append(partial) {
      const record = Object.freeze({ schemaVersion: "r4_gate_b_physical_journal.v1", sequence, previousRecordSha256: previous, runId, manifestSha256, hostBindingId, lane: partial.lane, event: partial.event, commandShapeSha256: partial.commandShapeSha256 ?? null, processGroupId: partial.processGroupId ?? null, ownedResources: partial.ownedResources ?? [], terminalCode: partial.terminalCode ?? null, cleanupState: partial.cleanupState ?? "required" });
      const bytes = Buffer.from(`${canonicalJson(record)}\n`, "utf8");
      fs.writeSync(fd, bytes); fs.fsyncSync(fd); raw.push(Buffer.from(bytes)); records.push(record); previous = sha256(bytes); sequence += 1;
      return record;
    },
    close() { fs.closeSync(fd); },
    aggregateSha256() { return sha256(Buffer.concat(raw)); },
    records() { return Object.freeze([...records]); },
    zeroize() { for (const bytes of raw) bytes.fill(0); },
  });
}

function mkdirOwned0700(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid()) fail("RETRY_OWNED_DIRECTORY_UNSAFE", "RED");
  fs.chmodSync(directory, 0o700);
  if (fs.realpathSync(directory) !== directory) fail("RETRY_OWNED_DIRECTORY_NOT_CANONICAL", "RED");
}
function capsuleBoundFile(capsule, logicalName) {
  const matches = capsule.boundFiles.filter((entry) => entry.logicalName === logicalName);
  if (matches.length !== 1) fail(`HOST_BINDING_LOGICAL_FILE_MISSING:${logicalName}`, "RED");
  return matches[0];
}
function prepareCodexStaging(capsule, codexRunRoot) {
  mkdirOwned0700(codexRunRoot);
  const layout = coreCodexLayout(codexRunRoot);
  for (const directory of [path.dirname(layout.stagedCodex), path.dirname(layout.stagedProfile), layout.schemaRoot, layout.neutralCwd, layout.home, layout.codexHome, layout.tmpdir, path.dirname(layout.evidencePath)]) mkdirOwned0700(directory);
  const nativeSource = capsuleBoundFile(capsule, "codex-native");
  const launcherSource = capsuleBoundFile(capsule, "codex-launcher");
  const profileSource = capsuleBoundFile(capsule, "codex-seatbelt-profile");
  if (nativeSource.sha256 !== CORE_CODEX_NATIVE_SHA256 || launcherSource.sha256 !== CORE_CODEX_LAUNCHER_SHA256 || profileSource.sha256 !== IMMUTABLE_HASHES["schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb"]) fail("CODEX_CAPSULE_SOURCE_HASH_DRIFT", "RED");
  const stagedNative = copyOpenedRegularFile({ source: nativeSource.path, destination: layout.stagedCodex, expectedSha256: CORE_CODEX_NATIVE_SHA256, destinationMode: 0o500 });
  const stagedProfile = copyOpenedRegularFile({ source: profileSource.path, destination: layout.stagedProfile, expectedSha256: profileSource.sha256, destinationMode: 0o600 });
  return Object.freeze({
    layout,
    publicHashes: Object.freeze({ profileSourceSha256: profileSource.sha256, profileStagedSha256: stagedProfile.sha256, launcherSourceSha256: launcherSource.sha256, nativeSourceSha256: nativeSource.sha256, nativeStagedSha256: stagedNative.sha256 }),
  });
}

function createProductionCodexSpawnPort({ layout, journal }) {
  const groups = new Set();
  return Object.freeze({
    mode: "production_physical",
    async run(command, wireGuard) {
      validateCoreCodexLogicalCommand(layout, command);
      if (command.kind === "initialize" ? !wireGuard : wireGuard !== undefined) fail("CODEX_WIRE_GUARD_BINDING_INVALID", "RED");
      const commandShapeSha256 = sha256(Buffer.from(canonicalJson(command), "utf8"));
      await journal.append({ lane: "codex", event: `intent:${command.kind}`, commandShapeSha256, ownedResources: ["codex-process-group", "codex-stdio"], cleanupState: "required" });
      const child = spawn(command.argv[0], command.argv.slice(1), { cwd: command.cwd, env: { ...command.environment }, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe"] });
      if (!Number.isInteger(child.pid)) fail("CODEX_PHYSICAL_PID_MISSING", "RED");
      const pid = child.pid;
      groups.add(pid);
      await journal.append({ lane: "codex", event: `started:${command.kind}`, commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], cleanupState: "required" });
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let receive = Buffer.alloc(0);
      const lines = [];
      let clientWrites = 0;
      let initializedWritten = false;
      let initializedAt = null;
      let protocolError = null;
      let overflow = false;
      let stopResolve;
      const stopPromise = new Promise((resolve) => { stopResolve = resolve; });
      const requestStop = () => stopResolve();
      const clearOwned = () => { stdout.fill(0); stderr.fill(0); receive.fill(0); for (const line of lines) line.fill(0); };
      child.stdout.on("data", (chunk) => {
        stdout = appendBounded(stdout, chunk, command.stdoutLimitBytes);
        if (stdout.length > command.stdoutLimitBytes) { overflow = true; requestStop(); return; }
        if (command.kind !== "initialize" || protocolError !== null) return;
        receive = appendBounded(receive, chunk, 1_048_576);
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
            child.stdin.end(guardClientMessage(initializedMessage()));
            clientWrites += 1;
            initializedWritten = true;
            initializedAt = Date.now();
          } catch (error) { protocolError = error; requestStop(); }
        }
      });
      child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1_048_576); if (stderr.length > 1_048_576) { overflow = true; requestStop(); } });
      const closePromise = new Promise((resolve) => {
        let settled = false;
        child.once("error", (error) => { if (!settled) { settled = true; resolve({ code: -1, signal: null, error }); } });
        child.once("close", (code, signal) => { if (!settled) { settled = true; resolve({ code: code ?? -1, signal, error: null }); } });
      });
      if (command.kind === "initialize") {
        child.stdin.write(guardClientMessage(initializeMessage()));
        clientWrites += 1;
      } else child.stdin.end();
      let deadlineTimer;
      const deadlinePromise = new Promise((resolve) => { deadlineTimer = setTimeout(() => resolve({ kind: "deadline" }), command.deadlineMilliseconds); });
      const first = await Promise.race([closePromise.then((value) => ({ kind: "close", value })), stopPromise.then(() => ({ kind: "stop" })), deadlinePromise]);
      clearTimeout(deadlineTimer);
      let timedOut = first.kind === "deadline";
      let terminal = first.kind === "close" ? first.value : null;
      if (terminal === null) {
        signalGroup(pid, "SIGTERM");
        terminal = await Promise.race([closePromise, new Promise((resolve) => setTimeout(() => resolve(null), 2_000))]);
        if (terminal === null) {
          signalGroup(pid, "SIGKILL");
          terminal = await Promise.race([closePromise, new Promise((resolve) => setTimeout(() => resolve(null), 2_000))]);
        }
      }
      const exitLatency = command.kind === "initialize" && initializedAt !== null ? Date.now() - initializedAt : 0;
      const absent = await stopAndProveGroupAbsent(pid);
      if (absent) groups.delete(pid);
      await journal.append({ lane: "codex", event: `terminal:${command.kind}`, commandShapeSha256, processGroupId: pid, ownedResources: ["codex-process-group", "codex-stdio"], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
      if (protocolError !== null) { clearOwned(); throw protocolError; }
      if (terminal?.error) { clearOwned(); throw terminal.error; }
      return Object.freeze({ stdout, stderr, exitCode: overflow || terminal === null ? -1 : terminal.code, timedOut, processGroupStarted: true, processGroupReaped: terminal !== null, processGroupAbsent: absent, syntheticDescendantsStarted: 0, clientWrites, trailingBytes: command.kind === "initialize" ? receive.length : 0, handshakeExitLatencyMilliseconds: exitLatency, lines });
    },
    async cleanup() {
      let clean = true;
      for (const pid of groups) if (!await stopAndProveGroupAbsent(pid)) clean = false;
      groups.clear();
      return clean;
    },
  });
}

async function executeCodexLane({ capsule, retryRoot, journal }) {
  const staged = prepareCodexStaging(capsule, path.join(retryRoot, "codex"));
  const plan = buildCodexPhysicalPlan(staged.layout.runRoot);
  if (plan.commands.length !== 4 || plan.schemaFileCount !== CORE_CODEX_SCHEMA_COUNT || plan.schemaAggregateSha256 !== CORE_CODEX_SCHEMA_SHA256) fail("CODEX_PHYSICAL_PLAN_DRIFT", "RED");
  const port = createProductionCodexSpawnPort({ layout: staged.layout, journal });
  const evidence = await runCoreCodexZeroCall({ layout: staged.layout, spawnPort: port, expectedSchema: { fileCount: CORE_CODEX_SCHEMA_COUNT, aggregateSha256: CORE_CODEX_SCHEMA_SHA256, selected: CORE_CODEX_SELECTED_SCHEMAS }, publicHashes: staged.publicHashes });
  if (evidence.status !== "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN" || evidence.causalFinality !== "UNPROVEN_ACCEPTED" || evidence.postResponseFinalityProven !== false || evidence.providerCalls !== 0 || evidence.threadStarts !== 0 || evidence.turnStarts !== 0) fail("CODEX_PHYSICAL_EVIDENCE_INVALID", "RED");
  return evidence;
}

async function spawnInteractivePsql(step, actor, journal) {
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment, actor }), "utf8"));
  await journal.append({ lane: "postgres", event: `intent:race-${actor}`, commandShapeSha256, ownedResources: ["postgres-race-process-group"], cleanupState: "required" });
  const child = spawn(step.executable, step.argv, { cwd: step.cwd, env: { ...step.environment }, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe"] });
  if (!Number.isInteger(child.pid)) fail("POSTGRES_RACE_PID_MISSING", "RED");
  const pid = child.pid;
  await journal.append({ lane: "postgres", event: `started:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], cleanupState: "required" });
  let raw = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  const lines = [];
  const waiters = [];
  let terminal = null;
  let terminalResolve;
  const terminalPromise = new Promise((resolve) => { terminalResolve = resolve; });
  const publish = (line) => {
    lines.push(line);
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (waiter.predicate(line)) { waiters.splice(index, 1); clearTimeout(waiter.timer); waiter.resolve(line); }
    }
  };
  child.stdout.on("data", (chunk) => {
    raw = appendBounded(raw, chunk, step.stdoutLimitBytes);
    if (raw.length > step.stdoutLimitBytes) { signalGroup(pid, "SIGTERM"); return; }
    let newline;
    while ((newline = raw.indexOf(0x0a)) >= 0) {
      const prior = raw;
      const line = prior.subarray(0, newline).toString("utf8").replace(/\r$/u, "");
      raw = Buffer.from(prior.subarray(newline + 1));
      prior.fill(0);
      if (line.length > 0) publish(line);
    }
  });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1); signalGroup(pid, "SIGTERM"); });
  child.once("error", (error) => { terminal = { code: -1, signal: null, error }; terminalResolve(terminal); });
  child.once("close", (code, signal) => { if (terminal === null) { terminal = { code: code ?? -1, signal, error: null }; terminalResolve(terminal); } });
  const waitForLine = (predicate, milliseconds = 5_000) => new Promise((resolve, reject) => {
    const existing = lines.find(predicate);
    if (existing !== undefined) { resolve(existing); return; }
    const waiter = { predicate, resolve, reject, timer: setTimeout(() => { const index = waiters.indexOf(waiter); if (index >= 0) waiters.splice(index, 1); reject(new PhysicalRunnerError("POSTGRES_RACE_MARKER_TIMEOUT", "RED")); }, milliseconds) };
    waiters.push(waiter);
  });
  return Object.freeze({
    pid,
    write(value) { if (typeof value !== "string") fail("POSTGRES_RACE_STDIN_INVALID", "RED"); child.stdin.write(value); },
    end(value = "") { child.stdin.end(value); },
    waitForLine,
    async closeExpected() {
      const observed = await Promise.race([terminalPromise, new Promise((resolve) => setTimeout(() => resolve(null), 5_000))]);
      const absent = await stopAndProveGroupAbsent(pid);
      await journal.append({ lane: "postgres", event: `terminal:race-${actor}`, commandShapeSha256, processGroupId: pid, ownedResources: ["postgres-race-process-group"], terminalCode: observed === null ? "NO_TERMINAL" : String(observed.code), cleanupState: absent ? "observed-absent" : "quarantined" });
      const clean = observed !== null && observed.error === null && observed.code === 0 && observed.signal === null && stderr.length === 0 && raw.length === 0 && absent;
      raw.fill(0); stderr.fill(0);
      if (!clean) fail("POSTGRES_RACE_PROCESS_TERMINAL_INVALID", absent ? "RED" : "RED_QUARANTINED");
      return true;
    },
    async forceCleanup() { child.stdin.destroy(); const absent = await stopAndProveGroupAbsent(pid); raw.fill(0); stderr.fill(0); return absent; },
  });
}

function raceBarrierKey(prefix) {
  const match = /pg_advisory_xact_lock\(([0-9]+)::bigint\)/u.exec(prefix);
  if (!match) fail("POSTGRES_RACE_BARRIER_KEY_MISSING", "RED");
  return match[1];
}
async function executePostgresRaceController(step, journal) {
  const keyA = raceBarrierKey(step.workerAPrefix);
  const keyB = raceBarrierKey(step.workerBPrefix);
  const controller = await spawnInteractivePsql(step, "CONTROLLER", journal);
  const workerA = await spawnInteractivePsql(step, "A", journal);
  const workerB = await spawnInteractivePsql(step, "B", journal);
  const participants = [controller, workerA, workerB];
  const first = /RELEASE_START:(A|B)/u.exec(step.controllerProtocol)?.[1];
  if (!first) fail("POSTGRES_CONTROLLER_PROTOCOL_INVALID", "RED");
  const second = first === "A" ? "B" : "A";
  const byActor = { A: workerA, B: workerB };
  try {
    controller.write(`\\set ON_ERROR_STOP on\nSELECT pg_catalog.pg_advisory_lock(${keyA}::bigint);\nSELECT pg_catalog.pg_advisory_lock(${keyB}::bigint);\n\\echo CONTROLLER_READY\n`);
    await controller.waitForLine((line) => line === "CONTROLLER_READY");
    workerA.write(step.workerAPrefix);
    workerB.write(step.workerBPrefix);
    const readyA = await workerA.waitForLine((line) => /^READY A [0-9]+$/u.test(line));
    const readyB = await workerB.waitForLine((line) => /^READY B [0-9]+$/u.test(line));
    const pidA = Number(readyA.split(" ")[2]);
    const pidB = Number(readyB.split(" ")[2]);
    if (!Number.isSafeInteger(pidA) || !Number.isSafeInteger(pidB) || pidA === pidB) fail("POSTGRES_BACKEND_PID_INVALID", "RED");
    const firstKey = first === "A" ? keyA : keyB;
    const secondKey = second === "A" ? keyA : keyB;
    controller.write(`SELECT pg_catalog.pg_advisory_unlock(${firstKey}::bigint);\n\\echo RELEASED ${first}\n`);
    await controller.waitForLine((line) => line === `RELEASED ${first}`);
    await byActor[first].waitForLine((line) => line === `POST_CALL ${first}`);
    controller.write(`SELECT pg_catalog.pg_advisory_unlock(${secondKey}::bigint);\n\\echo RELEASED ${second}\n`);
    await controller.waitForLine((line) => line === `RELEASED ${second}`);
    await byActor[second].waitForLine((line) => line === `CALL_STARTED ${second}`);
    const firstBackendPid = first === "A" ? pidA : pidB;
    const secondBackendPid = second === "A" ? pidA : pidB;
    const observerSql = step.observerStdin.replaceAll(":second_pid", String(secondBackendPid)).replaceAll(":first_pid", String(firstBackendPid));
    if (observerSql.includes(":second_pid") || observerSql.includes(":first_pid")) fail("POSTGRES_OBSERVER_SUBSTITUTION_INVALID", "RED");
    controller.write(`${observerSql.slice(0, -1)} \\gset r4_observer_\n\\echo :r4_observer_body_free_marker\n`);
    await controller.waitForLine((line) => line === "OBSERVER_OK");
    byActor[first].end(`\\set r4_commit_gate 'COMMIT ${first}'\n${first === "A" ? step.workerASuffix : step.workerBSuffix}`);
    await byActor[first].waitForLine((line) => line === `COMMIT_ACK ${first}`);
    await byActor[first].closeExpected();
    await byActor[second].waitForLine((line) => line === `POST_CALL ${second}`);
    byActor[second].end(`\\set r4_commit_gate 'COMMIT ${second}'\n${second === "A" ? step.workerASuffix : step.workerBSuffix}`);
    await byActor[second].waitForLine((line) => line === `COMMIT_ACK ${second}`);
    await byActor[second].closeExpected();
    controller.end("\\q\n");
    await controller.closeExpected();
    return Object.freeze({ orderId: step.orderId, overlapProven: true, controlledResults: 2, processGroupsAbsent: true });
  } catch (error) {
    for (const participant of participants) await participant.forceCleanup().catch(() => false);
    throw error;
  }
}

async function executePostgresLane({ capsule, manifestSha256, runId, journal }) {
  const binding = { dockerCli: capsule.docker.cliPath, dockerUnixSocket: capsule.docker.socketPath, localImageId: capsule.docker.localImageId };
  const plan = buildPostgresPhysicalPlan(binding, manifestSha256, runId);
  mkdirOwned0700(plan.runRoot);
  for (const directory of [path.join(plan.runRoot, "home"), path.join(plan.runRoot, "docker-config"), path.join(plan.runRoot, "tmp"), path.join(plan.runRoot, "neutral-cwd")]) mkdirOwned0700(directory);
  let orderedExecutions = 0;
  let readinessAttempts = 0;
  try {
    for (const step of plan.steps) {
      if (step.executable === null) {
        await journal.append({ lane: "postgres", event: `marker:${step.kind}`, commandShapeSha256: sha256(Buffer.from(step.kind, "utf8")), ownedResources: ["postgres-container", "postgres-volume", "postgres-workers"], cleanupState: "required" });
        continue;
      }
      if (step.operation === "read-committed-overlap-controller") {
        await executePostgresRaceController(step, journal);
        orderedExecutions += 1;
        continue;
      }
      if (step.kind === "readiness") {
        let ready = false;
        for (let attempt = 1; attempt <= step.maximumAttempts; attempt += 1) {
          readinessAttempts = attempt;
          try {
            const result = await runClosedProcess(step, { journal, lane: "postgres", acceptedExitCodes: [0, 1] });
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
      const result = await runClosedProcess(step, { journal, lane: "postgres", stdin });
      if (step.kind.endsWith("-verify") && result.exitCode !== 0) fail("POSTGRES_VERIFIER_FAILED", "RED");
      result.stdout.fill(0); result.stderr.fill(0);
    }
    if (orderedExecutions !== 32) fail("POSTGRES_ORDERED_EXECUTION_COUNT_DRIFT", "RED");
    fs.rmSync(plan.runRoot, { recursive: true, force: true, maxRetries: 0 });
    if (fs.existsSync(plan.runRoot)) fail("POSTGRES_RUN_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
    return Object.freeze({ status: "POSTGRES_CORE_LANE_GREEN", namedFamilies: 13, executableCases: 16, orderedExecutions, coreCalls: 68, successful2xx: 39, controlledNon2xx: 29, newReceipts: 37, persistedVerifiers: 32, readinessAttempts, rollbackPassed: true, reapplyPassed: true, cleanupStatus: "GREEN" });
  } catch (error) {
    throw error;
  }
}

async function cleanupPostgresResources({ capsule, runId, journal }) {
  const plan = buildPostgresPhysicalPlan({ dockerCli: capsule.docker.cliPath, dockerUnixSocket: capsule.docker.socketPath, localImageId: capsule.docker.localImageId }, `sha256:${"0".repeat(64)}`, runId);
  mkdirOwned0700(plan.runRoot);
  for (const directory of [path.join(plan.runRoot, "home"), path.join(plan.runRoot, "docker-config"), path.join(plan.runRoot, "tmp"), path.join(plan.runRoot, "neutral-cwd")]) mkdirOwned0700(directory);
  const base = ["--host", `unix://${capsule.docker.socketPath}`];
  const environment = { HOME: path.join(plan.runRoot, "home"), DOCKER_CONFIG: path.join(plan.runRoot, "docker-config"), TMPDIR: path.join(plan.runRoot, "tmp"), PATH: "/usr/bin:/bin:/usr/sbin:/sbin" };
  const inspect = async (kind, resourceKind, resourceName, format) => {
    const command = { kind, executable: capsule.docker.cliPath, argv: [...base, resourceKind, "inspect", "--format", format, resourceName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 4096, expectedExitCodes: [0, 1] };
    const result = await runClosedProcess(command, { journal, lane: "cleanup", acceptedExitCodes: [0, 1] });
    try {
      if (result.exitCode === 1) return false;
      let labels;
      try { labels = JSON.parse(result.stdout.toString("utf8")); } catch { fail("POSTGRES_CLEANUP_LABEL_JSON_INVALID", "RED"); }
      if (labels === null || typeof labels !== "object" || Array.isArray(labels) || labels["forme.run"] !== runId) fail("POSTGRES_CLEANUP_LABEL_MISMATCH", "RED");
      return true;
    } finally { result.stdout.fill(0); result.stderr.fill(0); }
  };
  const containerExists = await inspect("cleanup-container-inspect", "container", plan.containerName, "{{json .Config.Labels}}");
  if (containerExists) {
    const remove = { kind: "cleanup-container-remove", executable: capsule.docker.cliPath, argv: [...base, "container", "rm", "--force", plan.containerName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0] };
    const result = await runClosedProcess(remove, { journal, lane: "cleanup" }); result.stdout.fill(0); result.stderr.fill(0);
  }
  const volumeExists = await inspect("cleanup-volume-inspect", "volume", plan.volumeName, "{{json .Labels}}");
  if (volumeExists) {
    const remove = { kind: "cleanup-volume-remove", executable: capsule.docker.cliPath, argv: [...base, "volume", "rm", plan.volumeName], environment, cwd: path.join(plan.runRoot, "neutral-cwd"), shell: false, callerArguments: 0, deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0] };
    const result = await runClosedProcess(remove, { journal, lane: "cleanup" }); result.stdout.fill(0); result.stderr.fill(0);
  }
  fs.rmSync(plan.runRoot, { recursive: true, force: true, maxRetries: 0 });
  if (fs.existsSync(plan.runRoot)) fail("POSTGRES_CLEANUP_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
  return true;
}

function recursiveOwnedInventory(root) {
  const canonicalRoot = fs.realpathSync(root);
  const seen = new Set();
  const lines = [];
  const walk = (directory, relativeDirectory = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink() || stat.uid !== process.getuid() || fs.realpathSync(absolute) !== absolute) fail("MACOS_BUNDLE_ENTRY_UNSAFE", "RED");
      const inode = `${stat.dev}:${stat.ino}`;
      if (seen.has(inode)) fail("MACOS_BUNDLE_HARDLINK_DENIED", "RED");
      seen.add(inode);
      if (stat.isDirectory()) { lines.push(`d\t${relative}\t${(stat.mode & 0o777).toString(8)}\n`); walk(absolute, relative); }
      else if (stat.isFile()) {
        if (stat.nlink !== 1) fail("MACOS_BUNDLE_HARDLINK_DENIED", "RED");
        const bytes = fs.readFileSync(absolute);
        try { lines.push(`f\t${relative}\t${(stat.mode & 0o777).toString(8)}\t${bytes.length}\t${sha256(bytes)}\n`); } finally { bytes.fill(0); }
      } else fail("MACOS_BUNDLE_ENTRY_TYPE_DENIED", "RED");
    }
  };
  walk(canonicalRoot);
  return Object.freeze({ sha256: sha256(Buffer.from(lines.join(""), "utf8")), entries: Object.freeze(lines.map((line) => line.split("\t")[1])) });
}
function copyExactOwnedFile(source, destination, mode) {
  const bytes = fs.readFileSync(source);
  try { return copyOpenedRegularFile({ source, destination, expectedSha256: sha256(bytes), destinationMode: mode }); }
  finally { bytes.fill(0); }
}
function replaceMacOSPlaceholders(step, state) {
  const replacements = new Map([
    ["<SYNTHETIC_KEYCHAIN_PASSWORD>", state.keychainPassword],
    ["<SYNTHETIC_P12_PASSWORD>", state.p12Password],
    ["<SYNTHETIC_BINDING_CANARY>", state.bindingCanary],
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
async function spawnMacOSHelper(step, state, journal) {
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment }), "utf8"));
  await journal.append({ lane: "macos", event: "intent:helper-spawn", commandShapeSha256, ownedResources: ["macos-helper-group", "candidate-pipe", "helper-receipt-pipe"], cleanupState: "required" });
  const child = spawn(step.executable, step.argv, { cwd: step.cwd, env: { ...step.environment }, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe"] });
  if (!Number.isInteger(child.pid)) fail("MACOS_HELPER_PID_MISSING", "RED");
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, 4096); if (stdout.length > 4096) signalGroup(child.pid, "SIGTERM"); });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1); signalGroup(child.pid, "SIGTERM"); });
  let terminal = null;
  const close = new Promise((resolve) => {
    child.once("error", (error) => { terminal = { code: -1, signal: null, error }; resolve(terminal); });
    child.once("close", (code, signal) => { if (terminal === null) terminal = { code: code ?? -1, signal, error: null }; resolve(terminal); });
  });
  await journal.append({ lane: "macos", event: "started:helper-spawn", commandShapeSha256, processGroupId: child.pid, ownedResources: ["macos-helper-group", "candidate-pipe", "helper-receipt-pipe"], cleanupState: "required" });
  state.helper = { child, pid: child.pid, stdout: () => stdout, stderr: () => stderr, close, commandShapeSha256 };
}
async function spawnMacOSFeeder(step, state, journal) {
  if (!state.helper || !state.helper.child.stdin) fail("MACOS_HELPER_PIPE_MISSING", "RED");
  const commandShapeSha256 = sha256(Buffer.from(canonicalJson({ executable: step.executable, argv: step.argv, cwd: step.cwd, environment: step.environment }), "utf8"));
  await journal.append({ lane: "macos", event: "intent:feeder-spawn", commandShapeSha256, ownedResources: ["macos-feeder-group", "candidate-pipe", "completion-pipe"], cleanupState: "required" });
  const child = spawn(step.executable, step.argv, { cwd: step.cwd, env: { ...step.environment }, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe", state.helper.child.stdin, "pipe"] });
  if (!Number.isInteger(child.pid)) fail("MACOS_FEEDER_PID_MISSING", "RED");
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let control = Buffer.alloc(0);
  child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk, 1); });
  child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk, 1); });
  child.stdio[4].on("data", (chunk) => { control = appendBounded(control, chunk, 64); });
  const terminal = await Promise.race([
    new Promise((resolve) => { child.once("error", (error) => resolve({ code: -1, signal: null, error })); child.once("close", (code, signal) => resolve({ code: code ?? -1, signal, error: null })); }),
    new Promise((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]);
  if (terminal === null) signalGroup(child.pid, "SIGTERM");
  const absent = await stopAndProveGroupAbsent(child.pid);
  await journal.append({ lane: "macos", event: "terminal:feeder-spawn", commandShapeSha256, processGroupId: child.pid, ownedResources: ["macos-feeder-group", "candidate-pipe", "completion-pipe"], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
  try {
    if (terminal === null || terminal.error || !absent) fail("MACOS_FEEDER_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
    state.feederEvidence = validateMacOSSyntheticFeederCompletion({ exitCode: terminal.code, signal: terminal.signal, candidateBytesWritten: macosSyntheticFrameBytes().length, expectedCandidateBytes: macosSyntheticFrameBytes().length, controlBytes: control, stdoutBytes: stdout, stderrBytes: stderr, markerObservedBeforeFeederExit: false });
  } finally { stdout.fill(0); stderr.fill(0); control.fill(0); }
}
async function finishMacOSHelper(state, journal) {
  if (!state.helper) fail("MACOS_HELPER_NOT_STARTED", "RED");
  const terminal = await Promise.race([state.helper.close, new Promise((resolve) => setTimeout(() => resolve(null), 902_000))]);
  if (terminal === null) signalGroup(state.helper.pid, "SIGTERM");
  const absent = await stopAndProveGroupAbsent(state.helper.pid);
  await journal.append({ lane: "macos", event: "terminal:helper", commandShapeSha256: state.helper.commandShapeSha256, processGroupId: state.helper.pid, ownedResources: ["macos-helper-group", "helper-receipt-pipe"], terminalCode: terminal === null ? "NO_TERMINAL" : String(terminal.code), cleanupState: absent ? "observed-absent" : "quarantined" });
  if (terminal === null || terminal.error || !absent) fail("MACOS_HELPER_TERMINAL_INVALID", absent ? "YELLOW" : "RED_QUARANTINED");
  const stdout = state.helper.stdout();
  const stderr = state.helper.stderr();
  try { state.helperEvidence = validateMacOSHelperTerminal({ stdout, stderr, exitCode: terminal.code, signal: terminal.signal }); }
  finally { stdout.fill(0); stderr.fill(0); }
}

async function cleanupMacOSAfterTerminal({ plan, state, journal }) {
  let clean = true;
  const byKind = new Map(plan.steps.map((step) => [step.kind, step]));
  const runCleanupCommand = async (kind, acceptedExitCodes = [0]) => {
    const raw = byKind.get(kind);
    if (!raw) { clean = false; return; }
    try {
      const step = replaceMacOSPlaceholders(raw, state);
      const result = await runClosedProcess(step, { journal, lane: "cleanup", acceptedExitCodes });
      result.stdout.fill(0);
      result.stderr.fill(0);
      state.completed.add(kind);
    } catch { clean = false; }
  };
  if (state.helper && groupExists(state.helper.pid) !== false && !await stopAndProveGroupAbsent(state.helper.pid)) clean = false;
  if (state.attempted.has("binding-canary-add") && !state.completed.has("binding-canary-delete")) await runCleanupCommand("binding-canary-delete", [0, 44]);
  if (state.attempted.has("custom-keychain-import") && !state.completed.has("identity-delete")) {
    if (state.certificateSha1 === null) clean = false;
    else await runCleanupCommand("identity-delete", [0, 44]);
  }
  if (state.attempted.has("custom-keychain-create") && !state.completed.has("custom-keychain-delete")) {
    if (!state.completed.has("custom-keychain-lock")) await runCleanupCommand("custom-keychain-lock", [0, 44]);
    await runCleanupCommand("custom-keychain-delete", [0, 44]);
  }
  if (state.completed.has("default-keychain-pre") && !state.completed.has("default-keychain-post")) await runCleanupCommand("default-keychain-post");
  if (state.completed.has("search-list-pre") && !state.completed.has("search-list-post")) await runCleanupCommand("search-list-post");
  if (state.defaultPre !== null && state.defaultPost !== null && state.defaultPre !== state.defaultPost) clean = false;
  if (state.searchPre !== null && state.searchPost !== null && state.searchPre !== state.searchPost) clean = false;
  if (fs.existsSync(plan.runRoot)) {
    const stat = fs.lstatSync(plan.runRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || fs.realpathSync(plan.runRoot) !== plan.runRoot) clean = false;
    else fs.rmSync(plan.runRoot, { recursive: true, force: true, maxRetries: 0 });
  }
  if (fs.existsSync(plan.runRoot)) clean = false;
  return clean;
}

async function executeMacOSLane({ capsule, manifestSha256, runId, journal }) {
  const tool = (name) => capsuleBoundFile(capsule, name).path;
  const binding = { swiftc: capsule.macos.swiftcPath, sdkPath: capsule.macos.sdkPath, codesign: tool("codesign"), security: tool("security"), openssl: tool("openssl"), lsof: tool("lsof"), node: tool("node") };
  const plan = buildMacOSPhysicalPlan(binding, manifestSha256, runId);
  const state = { keychainPassword: crypto.randomBytes(24).toString("hex"), p12Password: crypto.randomBytes(24).toString("hex"), bindingCanary: crypto.randomBytes(24).toString("hex"), certificateSha1: null, certificateSha256: null, helper: null, helperEvidence: null, feederEvidence: null, defaultPre: null, searchPre: null, defaultPost: null, searchPost: null, preInventory: null, postInventory: null, postSignExecutableSha256: null, attempted: new Set(), completed: new Set() };
  mkdirOwned0700(plan.runRoot);
  for (const directory of [path.join(plan.runRoot, "build"), path.join(plan.runRoot, "signing"), path.join(plan.runRoot, "isolated-home"), path.join(plan.runRoot, "tmp")]) mkdirOwned0700(directory);
  const app = path.join(plan.runRoot, "FormeCoreLocal.app");
  const executable = path.join(app, "Contents/MacOS/FormeCoreLocal");
  try {
    for (const rawStep of plan.steps) {
      const step = replaceMacOSPlaceholders(rawStep, state);
      if (step.kind === "preflight") { await journal.append({ lane: "macos", event: "marker:preflight", commandShapeSha256: sha256(Buffer.from("macos-preflight-v1\n")), ownedResources: ["macos-run-root"], cleanupState: "required" }); continue; }
      if (step.kind === "write-openssl-config") {
        atomicWritePrivateFile(step.targetPath, Buffer.from(step.exactBytes, "utf8"), step.targetMode);
        if (step.targetPath === REPOSITORY_ROOT || step.targetPath.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) fail("MACOS_OPENSSL_CONFIG_REPO_OVERLAP", "RED");
        const written = fs.readFileSync(step.targetPath); try { if (sha256(written) !== step.exactBytesSha256) fail("MACOS_OPENSSL_CONFIG_DRIFT", "RED"); } finally { written.fill(0); }
        continue;
      }
      if (step.kind === "assemble-bundle") {
        for (const directory of [app, path.join(app, "Contents"), path.join(app, "Contents/MacOS"), path.join(app, "Contents/Resources")]) mkdirOwned0700(directory);
        copyExactOwnedFile(path.join(plan.runRoot, "build/FormeCoreLocal"), executable, 0o500);
        copyExactOwnedFile(path.join(REPOSITORY_ROOT, "native/macos/Resources/FormeCoreLocal.Info.plist"), path.join(app, "Contents/Info.plist"), 0o600);
        copyExactOwnedFile(path.join(REPOSITORY_ROOT, "schemas/r4/gate-b-core/macos/forme-core-transient-response.sb"), path.join(app, "Contents/Resources/forme-core-transient-response.sb"), 0o600);
        continue;
      }
      if (step.kind === "pre-sign-inventory") { state.preInventory = recursiveOwnedInventory(app); const expected = ["Contents/Info.plist", "Contents/MacOS/FormeCoreLocal", "Contents/Resources/forme-core-transient-response.sb"]; for (const member of expected) if (!state.preInventory.entries.includes(member)) fail("MACOS_PRE_SIGN_INVENTORY_DRIFT", "RED"); continue; }
      if (step.kind === "post-sign-inventory") { state.postInventory = recursiveOwnedInventory(app); if (!state.postInventory.entries.includes("Contents/_CodeSignature/CodeResources")) fail("MACOS_POST_SIGN_INVENTORY_DRIFT", "RED"); const bytes = fs.readFileSync(executable); try { state.postSignExecutableSha256 = sha256(bytes); } finally { bytes.fill(0); } continue; }
      if (step.kind === "runtime-identity") {
        if (!state.helper || groupExists(state.helper.pid) !== true || fs.realpathSync(executable) !== executable) fail("MACOS_RUNTIME_IDENTITY_INVALID", "RED");
        const bytes = fs.readFileSync(executable); try { if (sha256(bytes) !== state.postSignExecutableSha256) fail("MACOS_RUNTIME_EXECUTABLE_DRIFT", "RED"); } finally { bytes.fill(0); }
        continue;
      }
      if (step.kind === "eof-commit-gate") { if (!state.feederEvidence?.eofReleaseAllowed) fail("MACOS_EOF_COMMIT_GATE_DENIED", "RED"); state.helper.child.stdin.end(); continue; }
      if (step.kind === "helper-receipt") { await finishMacOSHelper(state, journal); continue; }
      if (step.kind === "cleanup") {
        fs.rmSync(plan.runRoot, { recursive: true, force: true, maxRetries: 0 });
        continue;
      }
      if (step.kind === "absence-proof") { if ((state.helper && groupExists(state.helper.pid) !== false) || fs.existsSync(plan.runRoot)) fail("MACOS_HELPER_OR_RESOURCE_ABSENCE_UNKNOWN", "RED_QUARANTINED"); continue; }
      if (step.kind === "helper-spawn") { await spawnMacOSHelper(step, state, journal); continue; }
      if (step.kind === "feeder-spawn") { await spawnMacOSFeeder(step, state, journal); continue; }
      if (step.kind === "pre-body-network-sample") {
        const result = await runClosedProcess({ ...step, expectedExitCodes: [0, 1], stderrLimitBytes: 0 }, { journal, lane: "macos", acceptedExitCodes: [0, 1] });
        try { if (result.stdout.length !== 0 || result.stderr.length !== 0) fail("MACOS_PRE_BODY_NETWORK_SOCKET_OBSERVED", "RED"); } finally { result.stdout.fill(0); result.stderr.fill(0); }
        continue;
      }
      if (["custom-keychain-create", "custom-keychain-import", "binding-canary-add"].includes(step.kind)) state.attempted.add(step.kind);
      const result = await runClosedProcess(step, { journal, lane: "macos" });
      try {
        if (step.kind === "default-keychain-pre") state.defaultPre = sha256(result.stdout);
        if (step.kind === "search-list-pre") state.searchPre = sha256(result.stdout);
        if (step.kind === "default-keychain-post") state.defaultPost = sha256(result.stdout);
        if (step.kind === "search-list-post") state.searchPost = sha256(result.stdout);
        if (step.kind === "derive-key-certificate") {
          const certificate = new X509Certificate(fs.readFileSync(path.join(plan.runRoot, "signing/cert.pem")));
          state.certificateSha1 = crypto.createHash("sha1").update(certificate.raw).digest("hex").toUpperCase();
          state.certificateSha256 = sha256(certificate.raw);
        }
        if (step.kind === "identity-inventory") {
          const matches = [...result.stdout.toString("utf8").matchAll(/\b([0-9A-F]{40})\b/gu)].map((match) => match[1]);
          if (matches.length !== 1 || matches[0] !== state.certificateSha1) fail("MACOS_IDENTITY_INVENTORY_INVALID", "RED");
        }
      } finally { result.stdout.fill(0); result.stderr.fill(0); }
      state.completed.add(step.kind);
    }
    if (state.defaultPre !== state.defaultPost || state.searchPre !== state.searchPost) fail("MACOS_KEYCHAIN_METADATA_DRIFT", "RED");
    if (!state.helperEvidence || !state.feederEvidence || !state.preInventory || !state.postInventory || !state.certificateSha256) fail("MACOS_PHYSICAL_EVIDENCE_INCOMPLETE", "RED");
    return Object.freeze({ status: state.helperEvidence.terminal === "approve_exact" ? "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY" : "YELLOW", ...state.helperEvidence, outerCleanupPassed: true, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0, candidateBodyStderrBytes: 0, certificateSha256: state.certificateSha256, preSignPayloadInventorySha256: state.preInventory.sha256, signedBundleInventorySha256: state.postInventory.sha256, postSignExecutableSha256: state.postSignExecutableSha256, securityCliInvocations: 15, codesignCliInvocations: 5, opensslCliInvocations: 2 });
  } catch (error) {
    const cleaned = await cleanupMacOSAfterTerminal({ plan, state, journal });
    if (!cleaned) fail("MACOS_TERMINAL_CLEANUP_UNCERTAIN", "RED_QUARANTINED");
    throw error;
  } finally {
    state.keychainPassword = ""; state.p12Password = ""; state.bindingCanary = "";
    if (state.helper && groupExists(state.helper.pid) !== false) await stopAndProveGroupAbsent(state.helper.pid);
    if (fs.existsSync(plan.runRoot)) fs.rmSync(plan.runRoot, { recursive: true, force: true, maxRetries: 0 });
  }
}

function authenticatedRetryJournal(parsed, runId) {
  const root = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  const journalPath = path.join(root, "journal.v1.jsonl");
  if (!fs.existsSync(root)) return Object.freeze({ root, journalPath, records: Object.freeze([]), alreadyAbsent: true });
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.uid !== process.getuid() || (rootStat.mode & 0o777) !== 0o700 || fs.realpathSync(root) !== root) fail("RETRY_CLEANUP_ROOT_UNSAFE", "RED_QUARANTINED");
  const stat = fs.lstatSync(journalPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size > 16_777_216) fail("RETRY_JOURNAL_UNSAFE", "RED_QUARANTINED");
  const bytes = fs.readFileSync(journalPath);
  try {
    if (bytes.at(-1) !== 0x0a) fail("RETRY_JOURNAL_FRAMING_INVALID", "RED_QUARANTINED");
    const lines = bytes.toString("utf8").slice(0, -1).split("\n");
    let previous = null;
    const records = [];
    const keys = new Set(["schemaVersion", "sequence", "previousRecordSha256", "runId", "manifestSha256", "hostBindingId", "lane", "event", "commandShapeSha256", "processGroupId", "ownedResources", "terminalCode", "cleanupState"]);
    for (let index = 0; index < lines.length; index += 1) {
      const value = parseStrictJson(lines[index]);
      exactObject(value, keys, "RETRY_JOURNAL_RECORD_SHAPE");
      if (lines[index] !== canonicalJson(value) || value.schemaVersion !== "r4_gate_b_physical_journal.v1" || value.sequence !== index || value.previousRecordSha256 !== previous || value.runId !== runId || value.manifestSha256 !== parsed.manifestSha256 || value.hostBindingId !== parsed.hostBindingId) fail("RETRY_JOURNAL_CHAIN_INVALID", "RED_QUARANTINED");
      const framed = Buffer.from(`${lines[index]}\n`, "utf8"); previous = sha256(framed); framed.fill(0); records.push(Object.freeze(value));
    }
    return Object.freeze({ root, journalPath, records: Object.freeze(records), alreadyAbsent: false });
  } finally { bytes.fill(0); }
}

async function cleanupRetryResources({ parsed, capsule, journal, runId }) {
  let clean = true;
  const records = typeof journal.records === "function" ? journal.records() : journal.records;
  const processGroups = [...new Set(records.map((record) => record.processGroupId).filter((value) => Number.isInteger(value)))];
  for (const processGroupId of processGroups) if (!await stopAndProveGroupAbsent(processGroupId)) clean = false;
  try { await cleanupPostgresResources({ capsule, runId, journal }); } catch { clean = false; }
  const macRoot = `/private/tmp/forme-r4-gate-b-core-${runId}`;
  if (fs.existsSync(macRoot)) {
    const stat = fs.lstatSync(macRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || fs.realpathSync(macRoot) !== macRoot) clean = false;
    else fs.rmSync(macRoot, { recursive: true, force: true, maxRetries: 0 });
  }
  const retryRoot = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  const codexRoot = path.join(retryRoot, "codex");
  if (fs.existsSync(codexRoot)) fs.rmSync(codexRoot, { recursive: true, force: true, maxRetries: 0 });
  if (fs.existsSync(macRoot) || fs.existsSync(codexRoot)) clean = false;
  if (!clean) fail("RETRY_CLEANUP_ABSENCE_UNKNOWN", "RED_QUARANTINED");
  return true;
}

async function executeCoreRetry(parsed) {
  const manifestAuthority = readRetryManifestAuthority(parsed);
  verifyRetryRepositoryAuthority(manifestAuthority);
  readPublicHostBindingReceipt(manifestAuthority);
  const capsulePath = path.join(CAPSULE_ROOT, `${parsed.hostBindingId}.json`);
  const observed = readAndRevalidateHostBindingCapsule({ capsulePath, expectedHostBindingId: parsed.hostBindingId });
  if (observed.capsuleSha256 !== manifestAuthority.hostBindingCapsuleSha256 || observed.capsule.implementationHead !== manifestAuthority.implementationHead || observed.capsule.implementationTree !== manifestAuthority.implementationTree) fail("RETRY_CAPSULE_MANIFEST_DRIFT", "RED");
  mkdirOwned0700(RETRY_ROOT_PARENT);
  const runId = deriveRetryRunId(parsed.manifestSha256, parsed.hostBindingId);
  const retryRoot = retryRootFor(parsed.manifestSha256, parsed.hostBindingId);
  if (fs.existsSync(retryRoot)) fail("RETRY_RUN_ROOT_PREEXISTS", "RED");
  const journal = createRetryJournal(retryRoot, parsed.manifestSha256, parsed.hostBindingId, runId);
  let evidence;
  let terminalError = null;
  try {
    await journal.append({ lane: "runner", event: "retry-authority-revalidated", commandShapeSha256: sha256(Buffer.from("manifest+grant+capsule-v1\n")), ownedResources: ["retry-run-root"], cleanupState: "required" });
    const postgres = await executePostgresLane({ capsule: observed.capsule, manifestSha256: parsed.manifestSha256, runId, journal });
    const codexRaw = await executeCodexLane({ capsule: observed.capsule, retryRoot, journal });
    const codex = Object.freeze({ status: codexRaw.status, reportedVersion: codexRaw.reportedVersion, schemaFileCount: codexRaw.schemaFileCount, schemaAggregateSha256: codexRaw.schemaAggregateSha256, processStartSlotsConsumed: codexRaw.processStartSlotsConsumed, processGroupsStarted: codexRaw.processGroupsStarted, clientWrites: codexRaw.clientWrites, serverResponses: codexRaw.serverResponses, serverRequests: codexRaw.serverRequests, serverNotifications: codexRaw.serverNotifications, receiveBufferEmptyBeforeSecondWrite: codexRaw.receiveBufferEmptyBeforeSecondWrite, preSecondWriteViolationObserved: codexRaw.preSecondWriteViolationObserved, postSecondWriteViolationObserved: codexRaw.postSecondWriteViolationObserved, allStartedGroupsReaped: codexRaw.allStartedGroupsReaped, allStartedGroupsAbsent: codexRaw.allStartedGroupsAbsent, exitCodes: codexRaw.exitCodes, stderrBytes: codexRaw.stderrBytes, schemaStdoutBytes: codexRaw.schemaStdoutBytes, threadStarts: codexRaw.threadStarts, turnStarts: codexRaw.turnStarts, providerCalls: codexRaw.providerCalls, providerBytes: codexRaw.providerBytes, networkAuthority: codexRaw.networkAuthority, networkTransmittedBytes: codexRaw.networkTransmittedBytes, networkSyscallAttemptAbsenceClaimed: codexRaw.networkSyscallAttemptAbsenceClaimed, causalFinality: codexRaw.causalFinality, postResponseFinalityProven: codexRaw.postResponseFinalityProven, aiLaneEnabled: codexRaw.aiLaneEnabled, cleanupStatus: codexRaw.cleanupStatus });
    const macos = await executeMacOSLane({ capsule: observed.capsule, manifestSha256: parsed.manifestSha256, runId, journal });
    await cleanupRetryResources({ parsed, capsule: observed.capsule, journal, runId });
    await journal.append({ lane: "cleanup", event: "retry-cleanup-observed", commandShapeSha256: sha256(Buffer.from("retry-cleanup-v1\n")), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
    evidence = Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_evidence.v1", manifestSha256: parsed.manifestSha256, executionGrantSha256: parsed.executionGrantSha256, hostBindingId: parsed.hostBindingId, hostBindingCapsuleSha256: observed.capsuleSha256, implementationHead: manifestAuthority.implementationHead, implementationTree: manifestAuthority.implementationTree, laneOrder: ["postgres", "codex", "macos", "cleanup", "evidence", "stop"], postgres, codex, macos, journalAggregateSha256: journal.aggregateSha256(), cleanupStatus: "GREEN", firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: "YELLOW" });
    validateSchema("schemas/r4/gate-b-core/physical-retry-evidence.schema.json", evidence, "RETRY_EVIDENCE_SCHEMA_INVALID");
  } catch (error) {
    terminalError = error;
    try {
      await cleanupRetryResources({ parsed, capsule: observed.capsule, journal, runId });
      await journal.append({ lane: "cleanup", event: "retry-cleanup-after-terminal", commandShapeSha256: sha256(Buffer.from("retry-cleanup-v1\n")), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
    } catch (cleanupError) { terminalError = cleanupError; }
  } finally {
    journal.close(); journal.zeroize();
    if (terminalError === null) {
      fs.rmSync(retryRoot, { recursive: true, force: true, maxRetries: 0 });
      if (fs.existsSync(retryRoot)) terminalError = new PhysicalRunnerError("RETRY_RUN_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
    }
  }
  if (terminalError !== null) throw terminalError;
  return evidence;
}

async function cleanupCoreRetry(parsed) {
  const runId = deriveRetryRunId(parsed.manifestSha256, parsed.hostBindingId);
  const authenticated = authenticatedRetryJournal(parsed, runId);
  if (authenticated.alreadyAbsent) return Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: "GREEN", alreadyAbsent: true });
  const capsulePath = path.join(CAPSULE_ROOT, `${parsed.hostBindingId}.json`);
  const observed = readAndRevalidateHostBindingCapsule({ capsulePath, expectedHostBindingId: parsed.hostBindingId, allowExpiredForCleanup: true });
  const inertJournal = Object.freeze({ records: authenticated.records, async append() { return null; } });
  await cleanupRetryResources({ parsed, capsule: observed.capsule, journal: inertJournal, runId });
  fs.rmSync(authenticated.root, { recursive: true, force: true, maxRetries: 0 });
  if (fs.existsSync(authenticated.root)) fail("RETRY_CLEANUP_ROOT_ABSENCE_UNKNOWN", "RED_QUARANTINED");
  return Object.freeze({ schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: "GREEN", alreadyAbsent: false });
}

export function cleanupConstruction() {
  safeRemoveExactTree(CONSTRUCTION_ROOT);
  return Object.freeze({ status: "GREEN", constructionRunRootAbsent: true, constructionJournalAbsent: true });
}

export async function constructPhysicalAdapters() {
  const authority = verifyPhaseAAuthority();
  if (fs.existsSync(CONSTRUCTION_ROOT)) fail("CONSTRUCTION_RUN_ROOT_PREEXISTS", "RED");
  const journal = createConstructionJournal();
  try {
    await journal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: sha256(Buffer.from("construction-fake-matrix-v1\n")), ownedResources: ["construction-run-root", "fake-process-groups"] });
    const result = await runConstructionFakeMatrix();
    validateRaceCatalog(JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, "schemas/r4/gate-b-core/postgres/race-catalog.json"), "utf8")));
    await journal.append({ lane: "construction", event: "fake-matrix-observed", commandShapeSha256: sha256(Buffer.from("construction-fake-matrix-v1\n")), terminalCode: result.status, cleanupState: "required" });
    const aggregate = journal.aggregateSha256();
    return Object.freeze({ schemaVersion: "r4_gate_b_physical_adapter_construction_check.v1", status: result.status, authority, result, journalAggregateSha256: aggregate, physicalEffects: 0, hostBindingInputRead: false, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" });
  } finally {
    journal.close(); journal.zeroize(); cleanupConstruction();
  }
}

function readCheckpoint() {
  const stat = fs.lstatSync(CHECKPOINT_PATH);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600 || stat.size > 32_768) fail("CONSTRUCTION_CHECKPOINT_UNSAFE", "RED");
  const bytes = fs.readFileSync(CHECKPOINT_PATH);
  try {
    if (!bytes.toString("utf8").endsWith("\n") || bytes.subarray(0, -1).includes(0x0a) || `${canonicalJson(parseStrictJson(bytes.subarray(0, -1).toString("utf8")))}\n` !== bytes.toString("utf8")) fail("CONSTRUCTION_CHECKPOINT_NOT_CANONICAL", "RED");
    const checkpoint = parseStrictJson(bytes.subarray(0, -1).toString("utf8"));
    validateSchema("schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json", checkpoint, "CONSTRUCTION_CHECKPOINT_SCHEMA_INVALID");
    return checkpoint;
  } finally { bytes.fill(0); }
}
function verifyFrozenImplementation(checkpoint) {
  if (!GIT.test(checkpoint.implementationHead) || !GIT.test(checkpoint.implementationTree) || git(["rev-parse", "HEAD"]) !== checkpoint.implementationHead || git(["rev-parse", "HEAD^{tree}"]) !== checkpoint.implementationTree || gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") fail("IMPLEMENTATION_CHECKPOINT_REPO_DRIFT", "RED");
  const bindings = { physicalRunnerSha256: fileSha("scripts/r4-gate-b-physical-runner.mjs"), hostBindingModuleSha256: fileSha("scripts/r4-gate-b-host-binding.mjs"), physicalPortSha256: fileSha("scripts/r4-gate-b-physical-port.mjs"), runnerContractSha256: fileSha("schemas/r4/gate-b-core/physical-runner-contract.json"), codexProfileSha256: fileSha("schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb") };
  for (const [key, value] of Object.entries(bindings)) if (checkpoint[key] !== value) fail("IMPLEMENTATION_CHECKPOINT_HASH_DRIFT", "RED");
  return bindings;
}

export async function finalizeHostBindingOnce() {
  const checkpoint = readCheckpoint();
  verifyFrozenImplementation(checkpoint);
  const journal = createConstructionJournal(CONSTRUCTION_ROOT);
  try {
    await journal.append({ lane: "host-binding", event: "input-open-intent", commandShapeSha256: sha256(Buffer.from("fixed-owner-input-open-v1\n")), ownedResources: ["owner-input-envelope"], cleanupState: "required" });
    const ownerInput = readAndConsumeHostBindingInput(INPUT_PATH);
    const inspector = createProcessHostInspector({ root: CONSTRUCTION_ROOT, journal: (entry) => journal.append({ ...entry, ownedResources: ["inspector-process-group"], cleanupState: "required" }) });
    const result = await finalizeHostBinding({ repositoryRoot: REPOSITORY_ROOT, constructionRoot: CONSTRUCTION_ROOT, checkpoint, ownerInput, inspector });
    const capsulePath = path.join(CAPSULE_ROOT, `${result.hostBindingId}.json`);
    atomicWritePrivateFile(capsulePath, result.capsuleBytes, 0o600);
    atomicWriteTrackedFile(PUBLIC_RECEIPT_PATH, result.publicReceiptBytes);
    await journal.append({ lane: "host-binding", event: "capsule-published", hostBindingId: result.hostBindingId, commandShapeSha256: result.capsuleSha256, ownedResources: ["host-binding-capsule", "public-receipt"], terminalCode: "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW", cleanupState: "retain-capsule" });
    return Object.freeze({ schemaVersion: "r4_gate_b_host_binding_result.v1", status: "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW", hostBindingId: result.hostBindingId, hostBindingCapsuleSha256: result.capsuleSha256, hostBindingPublicReceiptSha256: sha256(result.publicReceiptBytes), expiresAt: result.expiresAt, dockerReadOnlyCliCalls: 3, localDockerUnixSocketRequests: 2, macosReadOnlyInspectionCalls: 9, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: "YELLOW" });
  } finally {
    journal.close(); journal.zeroize(); safeRemoveExactTree(CONSTRUCTION_ROOT);
  }
}

async function run(argv) {
  const parsed = parsePhysicalRunnerArguments(argv);
  if (parsed.mode === "construct-physical-adapters") return await constructPhysicalAdapters();
  if (parsed.mode === "finalize-host-binding") return await finalizeHostBindingOnce();
  if (parsed.mode === "cleanup-construction") return cleanupConstruction();
  if (parsed.mode === "cleanup-core-retry") return await cleanupCoreRetry(parsed);
  if (parsed.mode === "execute-core-retry") return await executeCoreRetry(parsed);
  fail("PHYSICAL_RUNNER_MODE_UNREACHABLE", "RED");
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  run(process.argv.slice(2)).then((result) => process.stdout.write(`${canonicalJson(result)}\n`)).catch((error) => {
    const body = { schemaVersion: "r4_gate_b_physical_runner_error.v1", code: error?.code ?? "PHYSICAL_RUNNER_UNCONTROLLED", verdict: error?.verdict ?? "RED" };
    process.stdout.write(`${canonicalJson(body)}\n`);
    process.exitCode = 1;
  });
}
