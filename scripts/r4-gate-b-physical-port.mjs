import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, parseStrictJson } from "../packages/r4-protocol/src/index.ts";
import {
  CORE_CODEX_SCHEMA_COUNT,
  CORE_CODEX_SCHEMA_SHA256,
  CORE_CODEX_VERSION,
  buildCoreCodexLogicalCommand,
  coreCodexLayout,
  createCoreCodexWireGuard,
  validateCoreCodexLogicalCommand,
} from "../packages/r4-codex-adapter/src/zero-call-physical.ts";
import { buildCorePostgresStdin } from "./r4-gate-b-core-postgres.mjs";

export const PHYSICAL_AUTHORITY = Object.freeze({
  constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
  constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
  approvedProposalHead: "a45ea061e8e92f247597787e36ecfe52740b216a",
  approvedProposalTree: "89b28903fc34e985a17e8f3fdc4bfd7d0972880e",
  constructionRunId: "79b7775defbdaf043697ef9b6d0ab45c",
  hostBindingAdapterConstructionGrant: "APPROVED",
  retryExecutionGrant: "NOT_REQUESTED",
  firstProviderCallGrant: "NOT_REQUESTED",
});
export const POSTGRES_COUNTS = Object.freeze({ namedFamilies: 13, executableCases: 16, orderedExecutions: 32, concurrentCoreCalls: 64, recoveryCoreCalls: 4, expectedCoreCalls: 68, expected2xx: 39, expectedControlledNon2xx: 29, expectedNewReceipts: 37, persistedVerifiers: 32 });
export const CODEX_PROCESS_KINDS = Object.freeze(["version", "help", "schema", "initialize"]);
export const MACOS_PLAN_ORDER = Object.freeze([
  "preflight", "write-openssl-config", "compile", "assemble-bundle", "pre-sign-inventory", "default-keychain-pre", "search-list-pre",
  "derive-key-certificate", "derive-pkcs12", "custom-keychain-create", "custom-keychain-unlock", "custom-keychain-import",
  "custom-keychain-partition", "binding-canary-add", "binding-canary-find", "identity-inventory", "codesign-sign",
  "codesign-verify-strict", "codesign-entitlements", "codesign-designated-requirement", "codesign-test-requirement",
  "post-sign-inventory", "helper-spawn", "runtime-identity", "pre-body-network-sample", "feeder-spawn",
  "eof-commit-gate", "helper-receipt", "binding-canary-delete", "identity-delete", "custom-keychain-lock",
  "custom-keychain-delete", "default-keychain-post", "search-list-post", "cleanup", "absence-proof",
]);
export const MACOS_DIRECT_START_PROTOCOL = deepFreeze({
  schemaVersion: "r4.gate-b-core.macos-direct-start.v1",
  lifecycleSemantics: "one-direct-child-pid-one-owned-process-group-zero-resident-carrier",
  readyTransport: "inherited-pipe-only-no-durable-pid-slot",
  normalPathAuthority: "exact-ready-frame-plus-live-child-process-handle",
  crashBeforeStartedJournalVerdict: "RED_QUARANTINED",
  persistedProcessIdSignalAuthority: false,
  parentDeathAfterReleaseAutoCleanupClaimed: false,
  helper: {
    implementation: "self-blocked-direct-helper",
    descriptorMap: { candidateInput: 0, receiptOutput: 1, diagnosticOutput: 2, readyOutput: 3, releaseInput: 4 },
    targetStdioCount: 5,
    readyFramePattern: "R4_GATE_B_DIRECT_READY_V1 helper <positive-decimal-pid>\\n",
    readyFrameMaximumBytes: 96,
    releaseFrame: "R4_GATE_B_DIRECT_RELEASE_V1 helper\n",
    releaseRequiresEOF: true,
    preReleaseOperations: ["parse-one-exact-command", "capture-nonextending-helper-start-time", "write-ready-frame", "read-release-frame"],
    functionalEffectsBeforeRelease: 0,
    candidateReadsBeforeRelease: 0,
    localAuthenticationCeremoniesBeforeRelease: 0,
  },
  feeder: {
    implementation: "self-blocked-direct-feeder",
    descriptorMap: { candidateOutput: 3, completionOutput: 4, readyOutput: 5, releaseInput: 6 },
    targetStdioCount: 7,
    readyFramePattern: "R4_GATE_B_DIRECT_READY_V1 feeder <positive-decimal-pid>\\n",
    readyFrameMaximumBytes: 96,
    releaseFrame: "R4_GATE_B_DIRECT_RELEASE_V1 feeder\n",
    releaseRequiresEOF: true,
    candidateBuffersBeforeRelease: 0,
    candidateWritesBeforeRelease: 0,
    completionWritesBeforeRelease: 0,
  },
  releaseOrdering: ["direct-child-ready", "pid-and-process-group-validated", "started-journal-fsync", "listeners-installed", "exact-release-frame-and-eof", "first-functional-effect"],
});

const SHA = /^sha256:[0-9a-f]{64}$/u;
const ID = /^[0-9a-f]{32}$/u;
const POSTGRES_CONTAINER_ID = /^[0-9a-f]{64}$/u;
export const POSTGRES_CONTAINER_ID_PLACEHOLDER = "<OBSERVED_CONTAINER_ID>";
const MACOS_SYNTHETIC_FRAME_BYTES = 1390;
const MACOS_SYNTHETIC_FRAME_SHA256 = "sha256:0576ca281013f55670897488801dcfef98fb00db08a303fcbd8a028f97f2c001";
const MACOS_OPENSSL_CONFIG = `[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=Forme Gate B Synthetic\n[ext]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=codeSigning\nsubjectKeyIdentifier=hash\n`;
const MACOS_SYNTHETIC_CANDIDATE_PREIMAGE = Object.freeze({
  schemaVersion: "response_candidate.v1",
  candidateId: "candidate_cccccccccccccccccccccccccccccccc",
  interactionId: "interaction_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
  sessionEnvelopeId: "session_ssssssssssssssssssssssssssssssss",
  roomId: "room_rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
  projectionId: "proj_pppppppppppppppppppppppppppppppp",
  originState: "published_fresh",
  responseText: "Synthetic Forme Gate B response.\nApprove only this exact demonstration handoff.",
  sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
  twinBasisHash: `sha256:${"b".repeat(64)}`,
  snapshotManifestHash: `sha256:${"d".repeat(64)}`,
  sessionReceiptHash: `sha256:${"e".repeat(64)}`,
  policyHash: `sha256:${"f".repeat(64)}`,
  admittedAt: "2026-08-07T00:00:00.000Z",
  expiresAt: "2026-08-10T00:00:00.000Z",
});
const MACOS_BUILD_INPUT_PATHS = Object.freeze([
  "native/macos/Sources/FormeCoreLocal/CoreLauncher.swift",
  "native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift",
  "native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift",
  "native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift",
  "native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift",
  "native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift",
  "native/macos/Sources/FormeCoreLocal/CoreSandboxProfile.swift",
  "native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift",
  "native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift",
  "native/macos/Resources/FormeCoreLocal.Info.plist",
  "native/macos/Resources/FormeCoreLocal.entitlements",
  "schemas/r4/gate-b-core/macos/forme-core-transient-response.sb",
  "schemas/r4/gate-b-core/macos/transient-candidate-contract.json",
  "schemas/r4/gate-b-core/macos/evidence.schema.json",
  "fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs",
]);
const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const RACE_CATALOG_RELATIVE_PATH = "schemas/r4/gate-b-core/postgres/race-catalog.json";
const RACE_TEMPLATE_RELATIVE_PATHS = Object.freeze({
  setup: "fixtures/r4-gate-b-core/postgres/core-race-setup.sql",
  worker: "fixtures/r4-gate-b-core/postgres/core-race-worker.sql",
  verify: "fixtures/r4-gate-b-core/postgres/core-race-verify.sql",
});

export class PhysicalPortError extends Error {
  constructor(code, verdict = null) { super(code); this.name = "PhysicalPortError"; this.code = code; this.verdict = verdict; }
}
function fail(code, verdict = null) { throw new PhysicalPortError(code, verdict); }
function sha256(bytes) { return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`; }
function rawUtf8Sort(left, right) { return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8")); }
function exactObject(value, keys, code, verdict = null) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code, verdict);
  return value;
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}
function exactPostgresDockerLine(stdout, stderr, exitCode, code) {
  if (!Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr) || exitCode !== 0 || stderr.length !== 0 || stdout.length < 2 || stdout.at(-1) !== 0x0a || stdout.subarray(0, -1).includes(0x0a) || stdout.includes(0x00) || stdout.includes(0x0d)) fail(code, "RED_QUARANTINED");
  return stdout.subarray(0, -1).toString("utf8");
}
export function postgresContainerIdentityAuthoritySha256(runId, containerName, containerId) {
  if (!ID.test(runId) || containerName !== `forme-r4-core-${runId}` || !POSTGRES_CONTAINER_ID.test(containerId)) fail("POSTGRES_CONTAINER_IDENTITY_AUTHORITY_INVALID", "RED_QUARANTINED");
  return sha256(Buffer.from(`${canonicalJson({ schemaVersion: "r4.gate-b-core.postgres-container-identity.v1", runId, containerName, containerId, formeRunLabel: runId })}\n`, "utf8"));
}
export function postgresContainerCleanupCommandShapeSha256(kind, runId, containerId) {
  if (!new Set(["container-remove", "container-id-absence"]).has(kind) || !ID.test(runId) || !POSTGRES_CONTAINER_ID.test(containerId)) fail("POSTGRES_CONTAINER_CLEANUP_COMMAND_AUTHORITY_INVALID", "RED_QUARANTINED");
  return sha256(Buffer.from(`r4-postgres-${kind}-v1\0${runId}\0${containerId}\n`, "utf8"));
}
export function postgresVolumeCleanupCommandShapeSha256(runId, volumeIdentitySha256) {
  if (!ID.test(runId) || !SHA.test(volumeIdentitySha256)) fail("POSTGRES_VOLUME_CLEANUP_COMMAND_AUTHORITY_INVALID", "RED_QUARANTINED");
  return sha256(Buffer.from(`r4-postgres-volume-remove-v1\0${runId}\0${volumeIdentitySha256}\n`, "utf8"));
}
export function validatePostgresContainerCreateFrame({ stdout, stderr, exitCode, runId, containerName }) {
  const containerId = exactPostgresDockerLine(stdout, stderr, exitCode, "POSTGRES_CONTAINER_CREATE_FRAME_INVALID");
  return deepFreeze({ containerId, identitySha256: postgresContainerIdentityAuthoritySha256(runId, containerName, containerId) });
}
export function validatePostgresContainerIdentityFrame({ stdout, stderr, exitCode, runId, containerName, expectedContainerId }) {
  const line = exactPostgresDockerLine(stdout, stderr, exitCode, "POSTGRES_CONTAINER_IDENTITY_FRAME_INVALID");
  const fields = line.split("\t");
  if (fields.length !== 3 || fields[0] !== expectedContainerId || fields[1] !== `/${containerName}` || fields[2] !== runId) fail("POSTGRES_CONTAINER_IDENTITY_MISMATCH", "RED_QUARANTINED");
  return deepFreeze({ containerId: fields[0], identitySha256: postgresContainerIdentityAuthoritySha256(runId, containerName, fields[0]) });
}
export function validatePostgresVolumeCreateFrame({ stdout, stderr, exitCode, volumeName }) {
  if (exactPostgresDockerLine(stdout, stderr, exitCode, "POSTGRES_VOLUME_CREATE_FRAME_INVALID") !== volumeName) fail("POSTGRES_VOLUME_CREATE_FRAME_INVALID", "RED_QUARANTINED");
  return true;
}
export function validatePostgresVolumeIdentityFrame({ stdout, stderr, exitCode, runId, volumeName, expectedIdentitySha256 = null }) {
  const line = exactPostgresDockerLine(stdout, stderr, exitCode, "POSTGRES_VOLUME_IDENTITY_FRAME_INVALID");
  const fields = line.split("\t");
  if (fields.length !== 5 || fields[0] !== volumeName || fields[1] !== runId || fields[2].length < 1 || fields[2].length > 128 || !/^[A-Za-z0-9._-]+$/u.test(fields[3]) || !/^[A-Za-z0-9._-]+$/u.test(fields[4])) fail("POSTGRES_VOLUME_IDENTITY_MISMATCH", "RED_QUARANTINED");
  const identity = deepFreeze({ schemaVersion: "r4.gate-b-core.postgres-volume-identity.v1", runId, volumeName, formeRunLabel: fields[1], createdAt: fields[2], driver: fields[3], scope: fields[4] });
  const identitySha256 = sha256(Buffer.from(`${canonicalJson(identity)}\n`, "utf8"));
  if (expectedIdentitySha256 !== null && identitySha256 !== expectedIdentitySha256) fail("POSTGRES_VOLUME_IDENTITY_DRIFT", "RED_QUARANTINED");
  return deepFreeze({ identity, identitySha256 });
}
export function runPostgresCleanupAuthorityFakeMatrix() {
  const runId = "f".repeat(32);
  const containerName = `forme-r4-core-${runId}`;
  const volumeName = containerName;
  const capturedId = "a".repeat(64);
  let removalCalls = 0;
  let containerForeignReplacementPreserved = false;
  try {
    validatePostgresContainerIdentityFrame({ stdout: Buffer.from(`${"b".repeat(64)}\t/${containerName}\t${runId}\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName, expectedContainerId: capturedId });
    removalCalls += 1;
  } catch (error) { containerForeignReplacementPreserved = error instanceof PhysicalPortError && error.code === "POSTGRES_CONTAINER_IDENTITY_MISMATCH" && error.verdict === "RED_QUARANTINED"; }
  const capturedVolume = validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(`${volumeName}\t${runId}\t2026-08-08T00:00:00Z\tlocal\tlocal\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName });
  let volumeForeignReplacementPreserved = false;
  try {
    validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(`${volumeName}\t${runId}\t2026-08-09T00:00:00Z\tlocal\tlocal\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName, expectedIdentitySha256: capturedVolume.identitySha256 });
    removalCalls += 1;
  } catch (error) { volumeForeignReplacementPreserved = error instanceof PhysicalPortError && error.code === "POSTGRES_VOLUME_IDENTITY_DRIFT" && error.verdict === "RED_QUARANTINED"; }
  const recreated = validatePostgresContainerIdentityFrame({ stdout: Buffer.from(`${"c".repeat(64)}\t/${containerName}\t${runId}\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName, expectedContainerId: "c".repeat(64) });
  const recreatedVolume = validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(`${volumeName}\t${runId}\t2026-08-10T00:00:00Z\tlocal\tlocal\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName });
  const foreignReplacementPreserved = containerForeignReplacementPreserved && volumeForeignReplacementPreserved;
  const postRemoveRecreationBlocksProof = recreated.containerId === "c".repeat(64) && recreatedVolume.identitySha256 !== capturedVolume.identitySha256;
  if (!foreignReplacementPreserved || removalCalls !== 0 || !postRemoveRecreationBlocksProof) fail("POSTGRES_CLEANUP_AUTHORITY_FAKE_MATRIX_DRIFT");
  return deepFreeze({ caseCount: 4, containerForeignReplacementPreserved, volumeForeignReplacementPreserved, foreignReplacementPreserved, removalCalls, postRemoveRecreationBlocksProof, absenceProofsIssued: 0, realPhysicalEffects: 0 });
}
function closedFile(filePath) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(filePath) !== filePath) fail("PHYSICAL_CONTRACT_FILE_UNSAFE");
  return fs.readFileSync(filePath, "utf8");
}
function postgresRuntimeText(relativePath, readRuntimeFile) {
  if (readRuntimeFile === undefined) return closedFile(path.join(REPOSITORY_ROOT, relativePath));
  if (typeof readRuntimeFile !== "function") fail("POSTGRES_RUNTIME_READER_INVALID");
  let value;
  try { value = readRuntimeFile(relativePath); } catch (error) { if (error instanceof PhysicalPortError) throw error; fail(`POSTGRES_RUNTIME_READ_FAILED:${relativePath}`); }
  if (typeof value === "string") return value;
  if (!Buffer.isBuffer(value)) fail(`POSTGRES_RUNTIME_BYTES_INVALID:${relativePath}`);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(value); } catch { fail(`POSTGRES_RUNTIME_UTF8_INVALID:${relativePath}`); }
}
function pinnedPostgresRuntimeReader(readRuntimeFile) {
  if (readRuntimeFile === undefined) return undefined;
  const cache = new Map();
  return (relativePath) => {
    if (!cache.has(relativePath)) cache.set(relativePath, postgresRuntimeText(relativePath, readRuntimeFile));
    return cache.get(relativePath);
  };
}
export function macosSyntheticFrame() {
  const candidate = Object.freeze({ ...MACOS_SYNTHETIC_CANDIDATE_PREIMAGE, candidateHash: sha256(Buffer.from(canonicalJson(MACOS_SYNTHETIC_CANDIDATE_PREIMAGE), "utf8")) });
  return deepFreeze({
    schemaVersion: "transient_candidate_frame.v1",
    candidate,
    reservationId: "reservation_vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
    sessionEnvelopeHash: `sha256:${"1".repeat(64)}`,
    startAuthorizationHash: `sha256:${"a".repeat(64)}`,
  });
}
export function macosSyntheticFrameBytes() { return Buffer.from(canonicalJson(macosSyntheticFrame()), "utf8"); }

const MACOS_HELPER_RECEIPT_KEYS = new Set([
  "aggregateVerdict", "bodyBearingHandoffOutsideHelper", "candidateBodyFilesCreated", "candidateBodyStderrBytes",
  "candidateBodyStdoutBytes", "cleanupPassed", "controlledZeroizationPassed", "crashZeroizationClaimed",
  "fullPersistentLaneStatusChanged", "handoffCount", "networkCalls", "persistentCandidateRecoverySupported",
  "presenceCeremonies", "providerCalls", "reasonCode", "schemaVersion", "terminal",
]);
export function validateMacOSHelperTerminal({ stdout, stderr, exitCode, signal }) {
  if (!Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr) || !Number.isInteger(exitCode) || (signal !== null && typeof signal !== "string")) fail("MACOS_HELPER_TERMINAL_SHAPE");
  if (signal !== null || stderr.length !== 0) fail("MACOS_HELPER_TERMINAL_UNOBSERVED");
  if (exitCode === 64 && stdout.length === 0) return deepFreeze({ helperReceiptSha256: null, helperReceiptValidated: false, helperReasonCode: null, terminal: null, presenceCeremonies: null, presenceCeremoniesObserved: false, handoffCount: null, handoffCountObserved: false, helperControlledZeroizationPassed: null, helperCleanupPassed: null });
  if (stdout.length < 1 || stdout.length > 4096 || stdout.at(-1) !== 0x0a || stdout.subarray(0, -1).includes(0x0a) || stdout.includes(0x00)) fail("MACOS_HELPER_RECEIPT_FRAMING");
  let receipt;
  try { receipt = parseStrictJson(stdout.subarray(0, -1).toString("utf8")); } catch { fail("MACOS_HELPER_RECEIPT_JSON"); }
  exactObject(receipt, MACOS_HELPER_RECEIPT_KEYS, "MACOS_HELPER_RECEIPT_SHAPE");
  if (`${canonicalJson(receipt)}\n` !== stdout.toString("utf8")) fail("MACOS_HELPER_RECEIPT_NOT_CANONICAL");
  if (receipt.schemaVersion !== "r4.gate-b-core.macos-helper-receipt.v2" || !["approve_exact", "discard", "authority_expired", "controlled_failure"].includes(receipt.terminal)) fail("MACOS_HELPER_RECEIPT_SEMANTICS");
  const allowedReasons = receipt.terminal === "controlled_failure" ? ["controlled_failure", "candidate_binding_drift"] : [receipt.terminal];
  if (!allowedReasons.includes(receipt.reasonCode)) fail("MACOS_HELPER_RECEIPT_REASON_MISMATCH");
  for (const key of ["candidateBodyFilesCreated", "candidateBodyStdoutBytes", "candidateBodyStderrBytes", "bodyBearingHandoffOutsideHelper", "providerCalls", "networkCalls"]) if (receipt[key] !== 0) fail("MACOS_HELPER_RECEIPT_BODY_OR_EFFECT", "RED");
  if (receipt.controlledZeroizationPassed !== true || receipt.cleanupPassed !== true) fail("MACOS_HELPER_RECEIPT_SEMANTICS", "RED");
  if (![0, 1].includes(receipt.handoffCount) || ![0, 1].includes(receipt.presenceCeremonies) || receipt.crashZeroizationClaimed !== false || receipt.persistentCandidateRecoverySupported !== false || receipt.fullPersistentLaneStatusChanged !== false || receipt.aggregateVerdict !== "YELLOW") fail("MACOS_HELPER_RECEIPT_SEMANTICS");
  if (receipt.terminal === "approve_exact") {
    if (exitCode !== 0 || receipt.handoffCount !== 1 || receipt.presenceCeremonies !== 1 || receipt.controlledZeroizationPassed !== true || receipt.cleanupPassed !== true) fail("MACOS_HELPER_RECEIPT_APPROVE_MISMATCH");
  } else {
    const expectedExit = receipt.terminal === "controlled_failure" ? 70 : 0;
    if (exitCode !== expectedExit || receipt.handoffCount !== 0) fail("MACOS_HELPER_RECEIPT_TERMINAL_MISMATCH");
  }
  return deepFreeze({ helperReceiptSha256: sha256(stdout), helperReceiptValidated: true, helperReasonCode: receipt.reasonCode, terminal: receipt.terminal, presenceCeremonies: receipt.presenceCeremonies, presenceCeremoniesObserved: true, handoffCount: receipt.handoffCount, handoffCountObserved: true, helperControlledZeroizationPassed: receipt.controlledZeroizationPassed, helperCleanupPassed: receipt.cleanupPassed });
}
export function validateMacOSSyntheticFeederCompletion({ exitCode, signal, candidateBytesWritten, expectedCandidateBytes, controlBytes, stdoutBytes, stderrBytes, markerObservedBeforeFeederExit }) {
  if (!Number.isInteger(exitCode) || (signal !== null && typeof signal !== "string") || !Number.isInteger(candidateBytesWritten) || !Number.isInteger(expectedCandidateBytes) || !Buffer.isBuffer(controlBytes) || !Buffer.isBuffer(stdoutBytes) || !Buffer.isBuffer(stderrBytes) || typeof markerObservedBeforeFeederExit !== "boolean") fail("MACOS_FEEDER_OBSERVATION_SHAPE");
  if (signal !== null || exitCode !== 0 || candidateBytesWritten !== expectedCandidateBytes || expectedCandidateBytes < 1 || expectedCandidateBytes > 32768 || markerObservedBeforeFeederExit || controlBytes.toString("utf8") !== `FRAME_COMPLETE ${candidateBytesWritten}\n` || stdoutBytes.length !== 0 || stderrBytes.length !== 0) fail("MACOS_FEEDER_COMPLETION_INVALID");
  return deepFreeze({ completionMarkerValidated: true, feederExitZero: true, eofReleaseAllowed: true, candidateBytesWritten });
}
export function validateMacOSExactEntitlements({ observedBytes, expectedBytes }) {
  if (!Buffer.isBuffer(observedBytes) || !Buffer.isBuffer(expectedBytes) || expectedBytes.length < 1 || expectedBytes.length > 4096) fail("MACOS_ENTITLEMENTS_OBSERVATION_SHAPE", "RED");
  if (sha256(expectedBytes) !== "sha256:97704a8960b4facceef54397a08fb5d0a456247c3627359215aa2a27df22656c") fail("MACOS_EXPECTED_ENTITLEMENTS_NOT_FROZEN_EMPTY", "RED");
  if (!observedBytes.equals(expectedBytes)) fail("MACOS_CODESIGN_ENTITLEMENTS_NOT_EXACT", "RED");
  return deepFreeze({ entitlementsExactEmpty: true, entitlementsSha256: sha256(observedBytes) });
}
export function validateMacOSStrictSignatureObservation({ stdoutBytes, stderrBytes, appPath }) {
  if (!Buffer.isBuffer(stdoutBytes) || !Buffer.isBuffer(stderrBytes) || typeof appPath !== "string" || !path.isAbsolute(appPath)) fail("MACOS_STRICT_SIGNATURE_OBSERVATION_SHAPE", "RED");
  const expected = Buffer.from(`${appPath}: valid on disk\n${appPath}: satisfies its Designated Requirement\n`, "utf8");
  try {
    if (stdoutBytes.length !== 0 || !stderrBytes.equals(expected)) fail("MACOS_CODESIGN_STRICT_OBSERVATION_INVALID", "RED");
    return deepFreeze({ signatureStrictValidated: true });
  } finally { expected.fill(0); }
}
export function validateMacOSDesignatedRequirementObservation({ stdoutBytes, stderrBytes, expectedRequirement, expectedIdentifier }) {
  if (!Buffer.isBuffer(stdoutBytes) || !Buffer.isBuffer(stderrBytes) || typeof expectedRequirement !== "string" || typeof expectedIdentifier !== "string" || stdoutBytes.length !== 0 || stderrBytes.length < 1 || stderrBytes.length > 65_536 || stderrBytes.includes(0x00)) fail("MACOS_REQUIREMENT_OBSERVATION_SHAPE", "RED");
  const text = stderrBytes.toString("utf8");
  if (!text.endsWith("\n")) fail("MACOS_REQUIREMENT_OBSERVATION_FRAMING", "RED");
  const lines = text.slice(0, -1).split("\n");
  const requirements = lines.filter((line) => line.startsWith("designated =>"));
  const identifiers = lines.filter((line) => line.startsWith("Identifier="));
  const codeDirectories = lines.filter((line) => line.startsWith("CodeDirectory "));
  if (requirements.length !== 1 || requirements[0] !== expectedRequirement || identifiers.length !== 1 || identifiers[0] !== `Identifier=${expectedIdentifier}` || codeDirectories.length !== 1 || !/\bflags=0x[0-9a-f]+\([^)]*\bruntime\b[^)]*\)(?:\s|$)/u.test(codeDirectories[0])) fail("MACOS_CODESIGN_REQUIREMENT_DRIFT", "RED");
  return deepFreeze({ designatedRequirementExact: true, identifierExact: true, hardenedRuntimeObserved: true, designatedRequirementSha256: sha256(Buffer.from(requirements[0], "utf8")) });
}
export function validateMacOSIdentityInventory({ stdoutBytes, expectedCertificateSha1 }) {
  if (!Buffer.isBuffer(stdoutBytes) || !/^[0-9A-F]{40}$/u.test(expectedCertificateSha1 ?? "") || stdoutBytes.length < 1 || stdoutBytes.length > 65_536 || stdoutBytes.includes(0x00)) fail("MACOS_IDENTITY_INVENTORY_SHAPE", "RED");
  const text = stdoutBytes.toString("utf8");
  if (!text.endsWith("\n") || text.slice(0, -1).split("\n").length !== 2) fail("MACOS_IDENTITY_INVENTORY_INVALID", "RED");
  const selectors = [...text.matchAll(/^\s*[0-9]+\)\s+([0-9A-F]{40})\s+"[^"]+"\s*$/gmu)].map((match) => match[1]);
  const summaries = [...text.matchAll(/^\s*([0-9]+) valid identities found\s*$/gmu)].map((match) => Number(match[1]));
  if (selectors.length !== 1 || selectors[0] !== expectedCertificateSha1 || summaries.length !== 1 || summaries[0] !== 1) fail("MACOS_IDENTITY_INVENTORY_INVALID", "RED");
  return deepFreeze({ identityInventoryCount: 1, certificateSelectorMatched: true });
}
export function loadRaceCatalog(readRuntimeFile = undefined) {
  const catalog = JSON.parse(postgresRuntimeText(RACE_CATALOG_RELATIVE_PATH, readRuntimeFile));
  return validateRaceCatalog(catalog);
}
export function validateRaceCatalog(catalog) {
  exactObject(catalog, new Set(["schemaVersion", "authority", "counts", "cases", "orders", "c09Recovery"]), "RACE_CATALOG_SHAPE");
  if (catalog.schemaVersion !== "r4.gate-b-core.postgres-race-catalog.v1" || catalog.authority !== PHYSICAL_AUTHORITY.constructionPacketSha256) fail("RACE_CATALOG_AUTHORITY");
  if (canonicalJson(catalog.counts) !== canonicalJson(POSTGRES_COUNTS)) fail("RACE_CATALOG_COUNTS");
  if (!Array.isArray(catalog.cases) || catalog.cases.length !== 16 || new Set(catalog.cases.map((row) => row.id)).size !== 16) fail("RACE_CATALOG_CASES");
  if (!Array.isArray(catalog.orders) || catalog.orders.length !== 32 || new Set(catalog.orders.map((row) => row.id)).size !== 32) fail("RACE_CATALOG_ORDERS");
  for (const caseRow of catalog.cases) {
    if (!/^C(?:0[1-9]|1[0-6])$/u.test(caseRow.id) || !/^tx_[a-z0-9_]+$/u.test(caseRow.aFunction) || !/^tx_[a-z0-9_]+$/u.test(caseRow.bFunction)) fail("RACE_CATALOG_FUNCTION");
  }
  let success = 0;
  let controlled = 0;
  let receipts = 0;
  for (const order of catalog.orders) {
    if (!catalog.cases.some((row) => row.id === order.caseId) || !["A", "B"].includes(order.first) || !Array.isArray(order.a) || !Array.isArray(order.b)) fail("RACE_ORDER_SHAPE");
    for (const result of [order.a, order.b]) {
      if (!Number.isInteger(result[0]) || !/^[a-z0-9_]+$/u.test(result[1])) fail("RACE_RESULT_SHAPE");
      if (result[0] >= 200 && result[0] < 300) success += 1; else controlled += 1;
    }
    if (![1, 2].includes(order.semanticEffectCount) || ![1, 2].includes(order.newReceiptCount)) fail("RACE_EFFECT_COUNT");
    receipts += order.newReceiptCount;
    if (order.a[0] >= 400 && order.aReceiptId !== undefined) fail("RACE_REJECTED_RECEIPT");
    if (order.b[0] >= 400 && order.bReceiptId !== undefined) fail("RACE_REJECTED_RECEIPT");
  }
  for (const recovery of catalog.c09Recovery) {
    success += recovery.winner[0] >= 200 && recovery.winner[0] < 300 ? 1 : 0;
    controlled += recovery.loser[0] >= 400 ? 1 : 0;
    receipts += recovery.newReceiptCount;
    if (recovery.domainEffectCount !== 0) fail("RACE_RECOVERY_DOMAIN_EFFECT");
  }
  if (success !== 39 || controlled !== 29 || receipts !== 37) fail("RACE_AGGREGATE_DRIFT");
  return deepFreeze(catalog);
}

const DIGEST = Object.freeze({
  binding: `sha256:${"b".repeat(64)}`, controller: `sha256:${"d".repeat(64)}`, curator: `sha256:${"e".repeat(64)}`,
  bindingA: `sha256:${"4".repeat(64)}`, bindingB: `sha256:${"f".repeat(64)}`,
  clientA: `sha256:${"0".repeat(64)}`, clientB: `sha256:${"c".repeat(64)}`,
  encounter: `sha256:${"1".repeat(64)}`, reply: `sha256:${"2".repeat(64)}`, deletion: `sha256:${"3".repeat(64)}`,
  edge: `sha256:${"5".repeat(64)}`, request: `sha256:${"6".repeat(64)}`, auth: `sha256:${"7".repeat(64)}`,
  session: `sha256:${"8".repeat(64)}`, payload: `sha256:${"9".repeat(64)}`, candidate: `sha256:${"a".repeat(64)}`,
});
const ENCRYPTED = `'${canonicalJson({ schemaVersion: "a256gcm.v1", algorithm: "AES-256-GCM", keyId: "r4.hosted.gate-b.synthetic.v1", nonce: "AAAAAAAAAAAAAAAA", ciphertext: "U1lOVEhFVElD", tag: "BBBBBBBBBBBBBBBBBBBBBB", aadHash: `sha256:${"c".repeat(64)}` })}'::jsonb`;
const IDS = Object.freeze({
  pairing: "pairing_gatebcore00000000001", binding: "binding_gatebcore00000000001", projection: "projection_gatebcore000000001",
  bindingA: "binding_gatebcore00000000a1", bindingB: "binding_gatebcore00000000b1",
  thirdPlace: "thirdplace_gatebcore000000001", encounterA: "encounter_gatebcore00000000a1", encounterB: "encounter_gatebcore00000000b1",
  interaction: "interaction_gatebcore000000001", offer: "offer_gatebcore0000000000001", grant: "grant_gatebcore0000000000001",
  chain: "chain_gatebcore0000000000001", reservation: "reservation_gatebcore00000001", permit: "permit_gatebcore000000000001",
  response: "response_gatebcore00000000001", basis: "basis_gatebcoreresponse0000001",
});
const RECEIPT_META_BY_CODE = Object.freeze({
  pairing_exchanged: Object.freeze({ prefix: "receipt_pair_exchange_", action: "room.pair.exchange", status: "committed" }),
  interaction_accepted: Object.freeze({ prefix: "receipt_interaction_create_", action: "interaction.create", status: "committed" }),
  public_encounter_issued: Object.freeze({ prefix: "receipt_encounter_issue_", action: "public_encounter.issue", status: "committed" }),
  grant_offer_accepted: Object.freeze({ prefix: "receipt_offer_accept_", action: "grant_offer.accept", status: "committed" }),
  grant_offer_revoked: Object.freeze({ prefix: "receipt_offer_revoke_", action: "grant_offer.revoke", status: "terminal" }),
  cycle_reserved: Object.freeze({ prefix: "receipt_cycle_reserve_", action: "room_operator.cycle.reserve", status: "committed" }),
  dispatch_permit_issued: Object.freeze({ prefix: "receipt_dispatch_issue_", action: "room_operator.dispatch.issue", status: "committed" }),
  cycle_abandoned_zero_dispatch: Object.freeze({ prefix: "receipt_cycle_abandon_", action: "room_operator.cycle.abandon", status: "terminal" }),
  response_delivered: Object.freeze({ prefix: "receipt_response_deliver_", action: "room_operator.response.deliver", status: "committed", recoveryKind: "publication_current" }),
  interaction_closed: Object.freeze({ prefix: "receipt_interaction_close_", action: "interaction.close", status: "terminal" }),
  interaction_deleted: Object.freeze({ prefix: "receipt_interaction_delete_", action: "interaction.delete", status: "terminal" }),
  projection_revoked: Object.freeze({ prefix: "receipt_projection_revoke_", action: "projection.revoke", status: "terminal" }),
  interaction_pulled: Object.freeze({ prefix: "receipt_operator_pull_", action: "room_operator.pull", status: "committed", recoveryKind: "room_operator_pull" }),
  binding_revoked: Object.freeze({ prefix: "receipt_binding_revoke_", action: "room.binding.revoke", status: "terminal" }),
  projection_unlisted: Object.freeze({ prefix: "receipt_curation_unlist_", action: "curation.unlist", status: "committed" }),
  cycle_recovered: Object.freeze({ prefix: "receipt_cycle_recover_", action: "room_operator.cycle.recover", status: "no_op" }),
});
function raceUuid(orderId, actor) {
  const hex = crypto.createHash("sha256").update(`${orderId}:${actor}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function compactRaceUuid(orderId, actor) { return raceUuid(orderId, actor).replaceAll("-", ""); }
function exactReceiptId(code, orderId, actor) {
  const meta = RECEIPT_META_BY_CODE[code];
  if (!meta) fail(`RACE_RECEIPT_META_MISSING:${code}`);
  return `${meta.prefix}${compactRaceUuid(orderId, actor)}`;
}
function raceKey(orderId, actor, shared = false) {
  const compact = orderId.toLowerCase().replaceAll("-", "");
  return `race_${compact}_${shared ? "shared" : actor.toLowerCase()}_key_00000001`;
}
function requestHash(orderId, actor, shared = false) {
  const source = shared ? orderId : `${orderId}:${actor}`;
  return sha256(Buffer.from(`r4-race-request:${source}\n`, "utf8"));
}
function context(actorClass, subject, scope, orderId, actor, expectedVersion, shared = false) {
  return `ROW('${actorClass}',${subject === null ? "NULL" : `'${subject}'`},'${scope}','${raceKey(orderId, actor, shared)}','${requestHash(orderId, actor, shared)}',${expectedVersion === null ? "NULL" : expectedVersion},'${raceUuid(orderId, actor)}')::forme_r4.mutation_context_v1`;
}
function publicEncounterArgs(orderId, actor) {
  const shared = orderId.startsWith("C16-");
  const encounter = shared ? "encounter_gatebcore0000000c16" : actor === "A" ? IDS.encounterA : IDS.encounterB;
  return `${context("public", null, DIGEST.edge, orderId, actor, 2, shared)},'${IDS.projection}','${encounter}','${DIGEST.encounter}','${DIGEST.edge}'`;
}
function interactionArgs(orderId, actor) {
  const grant = orderId.startsWith("C08-");
  const sharedEncounter = orderId.startsWith("C02-");
  const submission = grant ? IDS.grant : sharedEncounter ? IDS.encounterA : actor === "A" ? IDS.encounterA : IDS.encounterB;
  const scope = grant ? DIGEST.reply : DIGEST.encounter;
  const interaction = `interaction_${orderId.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001`;
  return `${context(grant ? "manual_guest" : "manual_guest", null, scope, orderId, actor, null)},'${grant ? "grant" : "public_encounter"}','${submission}','${IDS.projection}','${interaction}','ask',${ENCRYPTED},128,'${DIGEST.request}',NULL,NULL,NULL,'g0_manual','allow_owner_local_ai','{"schemaVersion":"consent_envelope.v1","synthetic":true}'::jsonb,'${DIGEST.request}','reply_${orderId.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001','${DIGEST.reply}','${DIGEST.deletion}'`;
}
function syntheticArgs(name, actor, orderId) {
  const controllerVersion = name === "tx_projection_revoke" || name === "tx_curation_unlist" ? 2 : 1;
  const controller = context("controller", "subject_gatebcorecontroller0001", DIGEST.controller, orderId, actor, controllerVersion);
  const curator = context("curator", "subject_gatebcorecurator000001", DIGEST.curator, orderId, actor, 2);
  const operatorVersion = name === "tx_fresh_cycle_reserve" ? 2 : name === "tx_room_operator_pull" ? 1 : name === "tx_response_deliver" ? 1 : 1;
  const operator = context("room_operator_v1", null, DIGEST.binding, orderId, actor, operatorVersion);
  if (name === "tx_room_pair_exchange") {
    const bindingId = actor === "A" ? IDS.bindingA : IDS.bindingB;
    const bindingSecret = actor === "A" ? DIGEST.bindingA : DIGEST.bindingB;
    const clientPublicKey = actor === "A" ? DIGEST.clientA : DIGEST.clientB;
    return `${context("public", null, DIGEST.candidate, orderId, actor, 1)},'${IDS.pairing}','${DIGEST.candidate}','${clientPublicKey}','${bindingId}','${bindingSecret}','synthetic-sealed-envelope-${actor.toLowerCase()}'::bytea,'${DIGEST.session}'`;
  }
  if (name === "tx_public_encounter_issue") return publicEncounterArgs(orderId, actor);
  if (name === "tx_interaction_create") return interactionArgs(orderId, actor);
  if (name === "tx_grant_offer_accept") return `${context("manual_guest", null, DIGEST.reply, orderId, actor, 1)},'${IDS.offer}','${DIGEST.reply}','${IDS.grant}','${DIGEST.auth}','${IDS.chain}'`;
  if (name === "tx_grant_offer_revoke") return `${controller},'${IDS.offer}'`;
  if (name === "tx_fresh_cycle_reserve") {
    const reservation = orderId.startsWith("C09-") ? actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b" : IDS.reservation;
    return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${reservation}','${DIGEST.auth}','${DIGEST.session}'`;
  }
  if (name === "tx_fresh_cycle_recover") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.auth}','${DIGEST.session}'`;
  if (name === "tx_fresh_cycle_abandon_zero_dispatch") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.auth}','${DIGEST.session}',0`;
  if (name === "tx_dispatch_permit_issue") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.session}','${DIGEST.auth}','OpenAI','gpt-5','${DIGEST.payload}',1,'${IDS.permit}'`;
  if (name === "tx_response_deliver") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.response}',${ENCRYPTED},256,'${DIGEST.payload}','${DIGEST.candidate}','${DIGEST.request}','published_fresh','manual_owner_authored','${IDS.basis}','{"schemaVersion":"publication_attestation.v1","attestationId":"attestation_gatebcoreresp0001","bindingId":"${IDS.binding}","roomId":"room_gatebcorepublic00000001","artifactClass":"response","artifactId":"${IDS.response}","artifactHash":"${DIGEST.request}","issuedAt":"2026-08-07T00:00:00.000Z","expiresAt":"2026-08-08T00:00:00.000Z","hmacSha256":"${DIGEST.payload}"}'::jsonb`;
  if (name === "tx_interaction_close") return `${controller},'${IDS.interaction}'`;
  if (name === "tx_interaction_delete") return `${context("manual_guest", null, DIGEST.deletion, orderId, actor, 1)},'${IDS.interaction}','${DIGEST.deletion}'`;
  if (name === "tx_projection_revoke") return `${controller},'${IDS.projection}'`;
  if (name === "tx_room_operator_pull") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}'`;
  if (name === "tx_room_binding_revoke") return `${controller},'${IDS.binding}'`;
  if (name === "tx_curation_unlist") return `${curator},'${IDS.thirdPlace}','${IDS.projection}'`;
  fail(`RACE_FUNCTION_ARGUMENTS_MISSING:${name}`);
}
function baseScenarioRowsSql({ binding = true } = {}) {
  const rows = [
    `INSERT INTO forme_r4.rooms(room_id,schema_version,entity_id,home_third_place_id,label_ciphertext,room_kind,interaction_mode,status,version,event_high_water) VALUES('room_gatebcorepublic00000001','room.v1','entity_gatebcoreforme00000001','thirdplace_gatebcore000000001',${ENCRYPTED},'third_place_public','public_single','active',1,0);`,
    `INSERT INTO forme_r4.projections(projection_id,schema_version,room_id,entity_id,capsule_ciphertext,capsule_plaintext_bytes,title_scalar_count,summary_plaintext_bytes,disclosure_basis_id,publication_attestation_id,payload_hash,owner_state,curation_state,current,lifecycle_version,published_at,fresh_until,expires_at,changed_at) VALUES('${IDS.projection}','projection_capsule.v1','room_gatebcorepublic00000001','entity_gatebcoreforme00000001',${ENCRYPTED},1024,24,128,'basis_gatebcoreprojection000001','attestation_gatebcoreproj0001','${DIGEST.request}','published_fresh','admitted',true,2,transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',transaction_timestamp()+interval '2 days',transaction_timestamp()-interval '1 minute');`,
    `UPDATE forme_r4.rooms SET current_projection_id='${IDS.projection}' WHERE room_id='room_gatebcorepublic00000001';`,
  ];
  if (binding) rows.push(`INSERT INTO forme_r4.room_bindings(binding_id,schema_version,room_id,pairing_id,scope_version,secret_digest,client_public_key_hash,state,paired_at,expires_at,version) VALUES('${IDS.binding}','room_operator_binding.v1','room_gatebcorepublic00000001','pairing_gatebcorebasis000000001','room_operator.v1','${DIGEST.binding}','${DIGEST.auth}','active',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',1);`);
  return rows.join("\n");
}
function encounterSeedSql(encounterId, suffix) {
  return `INSERT INTO forme_r4.public_encounters(encounter_id,schema_version,room_id,projection_id,secret_digest,state,issued_at,expires_at,accepted_count,version,canonical_object_hash) VALUES('${encounterId}','public_encounter.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.encounter}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',0,1,'${DIGEST.request}');\nINSERT INTO forme_r4.rate_buckets(rate_event_id,room_id,scope,bucket_digest,source_object_id,committed_at,expires_at) VALUES('rate_encounter_seed_${suffix.padStart(16, "0")}','room_gatebcorepublic00000001','encounter_issue','${DIGEST.edge}','${encounterId}',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '23 hours');`;
}
function interactionSeedSql({ state = "accepted", version = 1, interactionId = IDS.interaction, originClass = "public_encounter", originId = "encounter_gatebcoreseed000001", unresolvedId = "scope_gatebcoreseed000000001", reply = DIGEST.reply, deletion = DIGEST.deletion } = {}) {
  return `INSERT INTO forme_r4.interactions(interaction_id,schema_version,room_id,projection_id,origin_projection_hash,origin_state_at_acceptance,origin_capability_class,origin_capability_id,unresolved_scope_id,interaction_type,request_ciphertext,request_plaintext_bytes,request_content_hash,guest_capsule_level,consent,accepted_at,expires_at,reply_capability_id,reply_capability_digest,delete_capability_digest,state,state_version,canonical_object_hash) VALUES('${interactionId}','interaction.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.request}','published_fresh','${originClass}','${originId}','${unresolvedId}','ask',${ENCRYPTED},128,'${DIGEST.request}','g0_manual','manual_owner_only',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day','reply_gatebcoreseed00000000001','${reply}','${deletion}','${state}',${version},'${DIGEST.request}');`;
}
function publicActiveSeedSql(count) {
  return `INSERT INTO forme_r4.interactions(interaction_id,schema_version,room_id,projection_id,origin_projection_hash,origin_state_at_acceptance,origin_capability_class,origin_capability_id,unresolved_scope_id,interaction_type,request_ciphertext,request_plaintext_bytes,request_content_hash,guest_capsule_level,consent,accepted_at,expires_at,reply_capability_id,reply_capability_digest,delete_capability_digest,state,state_version,canonical_object_hash) SELECT ('interaction_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,'interaction.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.request}','published_fresh','public_encounter',('encounter_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,('scope_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,'ask',${ENCRYPTED},128,'${DIGEST.request}','g0_manual','manual_owner_only',transaction_timestamp()-interval '2 hours',transaction_timestamp()+interval '1 day',('reply_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,('sha256:'||lpad(to_hex(g),64,'0'))::forme_r4.sha256_digest,('sha256:'||lpad(to_hex(g+1000),64,'0'))::forme_r4.sha256_digest,'accepted',1,'${DIGEST.request}' FROM generate_series(1,${count}) AS g;`;
}
function rateSeedSql(scope, count, age, offset = 0) {
  return `INSERT INTO forme_r4.rate_buckets(rate_event_id,room_id,scope,bucket_digest,source_object_id,committed_at,expires_at) SELECT ('rate_race_seed_'||lpad((g+${offset})::text,16,'0'))::forme_r4.r4_id,'room_gatebcorepublic00000001','${scope}','${DIGEST.edge}',('source_race_seed_'||lpad((g+${offset})::text,16,'0'))::forme_r4.r4_id,transaction_timestamp()-interval '${age}',transaction_timestamp()+interval '12 hours' FROM generate_series(1,${count}) AS g;`;
}
function normalIssuedC06EncountersSql() {
  return `SET LOCAL ROLE forme_r4_app;
DO $c06_issue$
DECLARE a forme_r4.api_result_v1; b forme_r4.api_result_v1;
BEGIN
  a := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("C06-SETUP", "A")});
  b := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("C06-SETUP", "B")});
  IF (a).http_status<>201 OR (a).code<>'public_encounter_issued' OR (b).http_status<>201 OR (b).code<>'public_encounter_issued' THEN RAISE EXCEPTION 'c06_normal_issuance_setup_failed'; END IF;
END
$c06_issue$;
RESET ROLE;`;
}
function nonRacePublicBoundarySql() {
  const missingEncounter = `INSERT INTO forme_r4.public_encounters(encounter_id,schema_version,room_id,projection_id,secret_digest,state,issued_at,expires_at,accepted_count,version,canonical_object_hash) VALUES('${IDS.encounterA}','public_encounter.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.encounter}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',0,1,'${DIGEST.request}');`;
  const missingInteraction = interactionArgs("NONRACE-MISSING", "A");
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE forme_r4_migrate;
${baseScenarioRowsSql()}
${publicActiveSeedSql(20)}
${missingEncounter}
SET LOCAL ROLE forme_r4_app;
DO $nonrace_results$
DECLARE limited forme_r4.api_result_v1; missing forme_r4.api_result_v1;
BEGIN
  limited := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("NONRACE-CAP20", "B")});
  IF (limited).http_status<>429 OR (limited).code<>'rate_limited' OR (limited).receipt_id IS NOT NULL THEN RAISE EXCEPTION 'public_issue_active_cap20_not_closed'; END IF;
  missing := forme_r4.tx_interaction_create(${missingInteraction});
  IF (missing).http_status<>409 OR (missing).code<>'capability_unavailable' OR (missing).target_id<>'${IDS.encounterA}' OR (missing).target_version<>1 OR (missing).receipt_id IS NOT NULL OR (missing).result<>jsonb_build_object('code','capability_unavailable') THEN RAISE EXCEPTION 'public_missing_issuance_lineage_not_closed'; END IF;
END
$nonrace_results$;
RESET ROLE;
SET LOCAL ROLE forme_r4_migrate;
DO $nonrace_persisted$
BEGIN
  IF EXISTS (SELECT 1 FROM forme_r4.idempotency_records) OR EXISTS (SELECT 1 FROM forme_r4.operation_receipts) THEN RAISE EXCEPTION 'public_nonrace_error_mutated_receipts'; END IF;
END
$nonrace_persisted$;
COMMIT;
`;
}
function scenarioSetupSql(caseId) {
  const rows = [baseScenarioRowsSql({ binding: caseId !== "C01" })];
  if (caseId === "C01") rows.push(`INSERT INTO forme_r4.pairing_challenges(pairing_id,schema_version,room_id,pairing_code_digest,state,issued_at,expires_at,version) VALUES('${IDS.pairing}','pairing_challenge.v1','room_gatebcorepublic00000001','${DIGEST.candidate}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '10 minutes',1);`);
  if (caseId === "C02") rows.push(encounterSeedSql(IDS.encounterA, "2"));
  if (caseId === "C03") rows.push(publicActiveSeedSql(19), encounterSeedSql(IDS.encounterA, "31"), encounterSeedSql(IDS.encounterB, "32"));
  if (caseId === "C04") rows.push(rateSeedSql("encounter_issue", 9, "30 minutes", 40));
  if (caseId === "C05") rows.push(rateSeedSql("encounter_issue", 49, "2 hours", 50));
  if (caseId === "C06") rows.push(rateSeedSql("public_accept", 2, "2 hours", 600), normalIssuedC06EncountersSql());
  if (caseId === "C07") rows.push(interactionSeedSql(), `INSERT INTO forme_r4.grant_offers(offer_id,schema_version,source_interaction_id,target_room_id,target_projection_id,preset_id,state,issued_at,acceptance_expires_at,offered_grant_expires_at,version,canonical_object_hash) VALUES('${IDS.offer}','grant_offer.v1','${IDS.interaction}','room_gatebcorepublic00000001','${IDS.projection}','short_exchange','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',transaction_timestamp()+interval '2 days',1,'${DIGEST.request}');`);
  if (caseId === "C08") rows.push(publicActiveSeedSql(20), rateSeedSql("public_accept", 3, "2 hours", 800), `INSERT INTO forme_r4.grants(grant_id,schema_version,room_id,projection_id,reentry_chain_id,preset_id,secret_digest,state,issued_at,expires_at,accepted_count,accepted_quota,agent_derivation_allowed,version,canonical_object_hash) VALUES('${IDS.grant}','grant.v1','room_gatebcorepublic00000001','${IDS.projection}','${IDS.chain}','short_exchange','${DIGEST.reply}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',1,2,false,1,'${DIGEST.request}');`);
  if (caseId === "C09") rows.push(interactionSeedSql({ state: "seen_locally", version: 2 }));
  if (caseId === "C10") rows.push(interactionSeedSql({ state: "preparing", version: 1 }), `INSERT INTO forme_r4.fresh_cycle_reservations(reservation_id,schema_version,interaction_id,start_authorization_hash,session_envelope_hash,state,idempotency_key,reserved_at,version,canonical_object_hash) VALUES('${IDS.reservation}','fresh_cycle_reservation.v1','${IDS.interaction}','${DIGEST.auth}','${DIGEST.session}','reserved','race_reservation_seed_key_0001',transaction_timestamp()-interval '1 minute',1,'${DIGEST.request}');`);
  if (["C11", "C12", "C13"].includes(caseId)) rows.push(interactionSeedSql({ state: "seen_locally", version: 1 }));
  if (caseId === "C14") rows.push(interactionSeedSql({ state: "accepted", version: 1 }));
  return rows.join("\n");
}
function raceInteractionId(orderId, actor) {
  return `interaction_${orderId.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001`;
}
function raceExpectedShape(order, actor) {
  const result = actor === "A" ? order.a : order.b;
  const success = result[0] >= 200 && result[0] < 300;
  const first = order.first === actor;
  const encounter = actor === "A" ? IDS.encounterA : IDS.encounterB;
  const reservation = actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b";
  const binding = actor === "A" ? IDS.bindingA : IDS.bindingB;
  if (order.caseId === "C01") return { target: success ? binding : IDS.pairing, version: success ? "1" : "2" };
  if (["C02", "C03", "C06", "C08"].includes(order.caseId)) {
    if (success) return { target: raceInteractionId(order.id, actor), version: "1" };
    if (order.caseId === "C02") return { target: IDS.encounterA, version: "2" };
    if (order.caseId === "C08") return { target: IDS.grant, version: "2" };
    return { target: IDS.projection, version: "" };
  }
  if (["C04", "C05"].includes(order.caseId)) return success ? { target: encounter, version: "1" } : { target: IDS.projection, version: "2" };
  if (order.caseId === "C07") return success && actor === "A" ? { target: IDS.grant, version: "1" } : { target: IDS.offer, version: "2" };
  if (order.caseId === "C09") return success ? { target: reservation, version: "1" } : { target: IDS.interaction, version: "3" };
  if (order.caseId === "C10") return success && actor === "A" ? { target: IDS.permit, version: "1" } : { target: IDS.reservation, version: "2" };
  if (["C11", "C12"].includes(order.caseId)) return success && actor === "A" ? { target: IDS.response, version: "1" } : { target: IDS.interaction, version: "2" };
  if (order.caseId === "C13") return actor === "B" ? { target: IDS.projection, version: "3" } : first ? { target: IDS.response, version: "1" } : { target: IDS.interaction, version: "2" };
  if (order.caseId === "C14") return actor === "B" ? { target: IDS.binding, version: "2" } : first ? { target: IDS.interaction, version: "2" } : { target: "", version: "" };
  if (order.caseId === "C15") return actor === "A" ? { target: IDS.projection, version: "3" } : first ? { target: encounter, version: "1" } : { target: "", version: "" };
  if (order.caseId === "C16") return { target: "encounter_gatebcore0000000c16", version: "1" };
  fail("RACE_EXPECTED_SHAPE_MISSING");
}
function raceActorScope(order, actor, action) {
  if (action === "room.pair.exchange") return DIGEST.candidate;
  if (action === "interaction.create") return order.caseId === "C08" ? DIGEST.reply : DIGEST.encounter;
  if (action === "public_encounter.issue") return DIGEST.edge;
  if (action === "grant_offer.accept") return DIGEST.reply;
  if (["grant_offer.revoke", "interaction.close", "projection.revoke", "room.binding.revoke"].includes(action)) return DIGEST.controller;
  if (["room_operator.cycle.reserve", "room_operator.cycle.recover", "room_operator.cycle.abandon", "room_operator.dispatch.issue", "room_operator.response.deliver", "room_operator.pull"].includes(action)) return DIGEST.binding;
  if (action === "interaction.delete") return DIGEST.deletion;
  if (action === "curation.unlist") return DIGEST.curator;
  fail(`RACE_ACTOR_SCOPE_MISSING:${order.caseId}:${actor}:${action}`);
}
function raceActorIdentity(action) {
  if (["room.pair.exchange", "public_encounter.issue"].includes(action)) return ["public", "IS NULL"];
  if (["interaction.create", "grant_offer.accept", "interaction.delete"].includes(action)) return ["manual_guest", "IS NULL"];
  if (["grant_offer.revoke", "interaction.close", "projection.revoke", "room.binding.revoke"].includes(action)) return ["controller", "='subject_gatebcorecontroller0001'"];
  if (["room_operator.cycle.reserve", "room_operator.cycle.recover", "room_operator.cycle.abandon", "room_operator.dispatch.issue", "room_operator.response.deliver", "room_operator.pull"].includes(action)) return ["room_operator_v1", "IS NULL"];
  if (action === "curation.unlist") return ["curator", "='subject_gatebcorecurator000001'"];
  fail(`RACE_ACTOR_IDENTITY_MISSING:${action}`);
}
function exactSuccessReceiptPredicate(order, actor, result, shape) {
  const meta = RECEIPT_META_BY_CODE[result[1]];
  if (!meta) fail(`RACE_RECEIPT_META_MISSING:${result[1]}`);
  const shared = order.caseId === "C16";
  const receiptActor = shared ? order.first : actor;
  const receipt = exactReceiptId(result[1], order.id, receiptActor);
  const key = raceKey(order.id, actor, shared);
  const canonicalRequestHash = requestHash(order.id, actor, shared);
  const actorScope = raceActorScope(order, actor, meta.action);
  const [actorClass, subjectPredicate] = raceActorIdentity(meta.action);
  const recoveryKind = meta.recoveryKind ?? "body_free";
  return `EXISTS(SELECT 1 FROM forme_r4.operation_receipts o JOIN forme_r4.idempotency_records i ON i.receipt_id=o.receipt_id WHERE o.receipt_id='${receipt}' AND o.room_id='room_gatebcorepublic00000001' AND o.actor_class='${actorClass}' AND o.actor_subject_id ${subjectPredicate} AND o.actor_scope_digest='${actorScope}' AND o.action='${meta.action}' AND o.idempotency_key='${key}' AND o.canonical_request_hash='${canonicalRequestHash}' AND o.target_id='${shape.target}' AND o.target_version=${shape.version} AND o.status='${meta.status}' AND o.body_free_code='${result[1]}' AND o.result_body_free=jsonb_build_object('code','${result[1]}') AND i.room_id=o.room_id AND i.actor_scope_digest=o.actor_scope_digest AND i.action=o.action AND i.idempotency_key=o.idempotency_key AND i.canonical_request_hash=o.canonical_request_hash AND i.http_status=${result[0]} AND i.result_code='${result[1]}' AND i.recovery_kind='${recoveryKind}' AND i.body_free_result IS NOT NULL AND i.receipt_id='${receipt}')`;
}
function expectedRaceTableCounts(order) {
  const first = order.first;
  const publicEncounters = ["C02", "C04", "C05", "C16"].includes(order.caseId) ? 1
    : ["C03", "C06"].includes(order.caseId) ? 2
      : order.caseId === "C15" && first === "B" ? 1 : 0;
  const interactions = order.caseId === "C03" ? 20 : order.caseId === "C08" ? 21
    : ["C02", "C06", "C07", "C09", "C10", "C11", "C12", "C13", "C14"].includes(order.caseId) ? 1 : 0;
  const rateBuckets = order.caseId === "C02" ? 2 : order.caseId === "C03" ? 3
    : order.caseId === "C04" ? 10 : order.caseId === "C05" ? 50
      : order.caseId === "C06" ? 5 : order.caseId === "C08" ? 3
        : order.caseId === "C15" && first === "B" ? 1 : order.caseId === "C16" ? 1 : 0;
  const interactionEvents = ["C02", "C03", "C06", "C08"].includes(order.caseId) || (["C11", "C12"].includes(order.caseId) && first === "B") ? 1 : 0;
  const responseEvents = ["C11", "C12", "C13"].includes(order.caseId) && first === "A" ? 1 : 0;
  const streamEvents = ["C02", "C03", "C06", "C08"].includes(order.caseId) || (["C11", "C12", "C13"].includes(order.caseId) && first === "A") ? 1 : 0;
  return Object.freeze({
    pairingChallenges: order.caseId === "C01" ? 1 : 0,
    roomBindings: 1,
    publicEncounters,
    grants: ["C07", "C08"].includes(order.caseId) && (order.caseId === "C08" || first === "A") ? 1 : 0,
    grantOffers: order.caseId === "C07" ? 1 : 0,
    interactions,
    freshCycleReservations: ["C09", "C10"].includes(order.caseId) ? 1 : 0,
    dispatchPermits: order.caseId === "C10" && first === "A" ? 1 : 0,
    responses: ["C11", "C12", "C13"].includes(order.caseId) && first === "A" ? 1 : 0,
    interactionEvents,
    responseEvents,
    projectionEvents: order.caseId === "C13" ? 1 : 0,
    curationEvents: order.caseId === "C15" ? 1 : 0,
    streamEvents,
    rateBuckets,
  });
}
function exactCreatedInteractionPredicate(order, actor, originClass, originId) {
  const interactionId = raceInteractionId(order.id, actor);
  return `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND origin_projection_hash='${DIGEST.request}' AND origin_state_at_acceptance='published_fresh' AND origin_capability_class='${originClass}' AND origin_capability_id='${originId}' AND unresolved_scope_id='${originId}' AND interaction_type='ask' AND request_plaintext_bytes=128 AND request_content_hash='${DIGEST.request}' AND guest_capsule_ciphertext IS NULL AND guest_capsule_level='g0_manual' AND consent='allow_owner_local_ai' AND consent_envelope_hash='${DIGEST.request}' AND reply_capability_id='reply_${order.id.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001' AND reply_capability_digest='${DIGEST.reply}' AND delete_capability_digest='${DIGEST.deletion}' AND state='accepted' AND state_version=1 AND body_readable AND terminal_at IS NULL AND canonical_object_hash='${requestHash(order.id, actor, false)}') FROM forme_r4.interactions WHERE interaction_id='${interactionId}')`;
}
function exactInteractionCreateEvidencePredicate(order, actor, originClass, originId) {
  const uuid = compactRaceUuid(order.id, actor);
  const interactionId = raceInteractionId(order.id, actor);
  const request = requestHash(order.id, actor, false);
  return [
    exactCreatedInteractionPredicate(order, actor, originClass, originId),
    `(SELECT count(*)=1 AND bool_and(interaction_id='${interactionId}' AND room_id='room_gatebcorepublic00000001' AND prior_state IS NULL AND new_state='accepted' AND object_version=1 AND actor_class='manual_guest' AND actor_subject_id IS NULL AND request_hash='${request}') FROM forme_r4.interaction_lifecycle_events WHERE event_id='event_interaction_create_${uuid}')`,
    `(SELECT count(*)=1 AND bool_and(sequence=1 AND event_id='streamevent_interaction_${uuid}' AND object_type='interaction' AND object_id='${interactionId}' AND event_type='interaction.accepted' AND object_version=1 AND payload_hash='${request}' AND body_available AND NOT reconciliation_snapshot) FROM forme_r4.room_event_stream WHERE room_id='room_gatebcorepublic00000001')`,
  ];
}
function exactRatePredicate(scope, uuid, bucket, source) {
  const prefix = scope === "encounter_issue" ? "rate_encounter_" : "rate_accept_";
  return `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND scope='${scope}' AND bucket_digest='${bucket}' AND source_object_id='${source}') FROM forme_r4.rate_buckets WHERE rate_event_id='${prefix}${uuid}')`;
}
function exactDeliveredResponsePredicate(order, actor, finalState = "available", finalVersion = 1, readable = true) {
  const uuid = compactRaceUuid(order.id, actor);
  const request = requestHash(order.id, actor, false);
  return [
    `(SELECT count(*)=1 AND bool_and(interaction_id='${IDS.interaction}' AND room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND body_plaintext_bytes=256 AND body_content_hash='${DIGEST.payload}' AND candidate_hash='${DIGEST.candidate}' AND publication_payload_hash='${DIGEST.request}' AND origin_state_at_publication='published_fresh' AND source_disclosure_class='manual_owner_authored' AND local_basis_attestation_id='${IDS.basis}' AND approval_attestation_id='attestation_gatebcoreresp0001' AND publication_receipt_id='publication_receipt_${uuid}' AND state='${finalState}' AND state_version=${finalVersion} AND body_readable=${readable ? "true" : "false"} AND ${readable ? "terminal_at IS NULL" : "terminal_at IS NOT NULL"} AND canonical_object_hash='${request}') FROM forme_r4.responses WHERE response_id='${IDS.response}')`,
    `(SELECT count(*)=1 AND bool_and(response_id='${IDS.response}' AND interaction_id='${IDS.interaction}' AND room_id='room_gatebcorepublic00000001' AND prior_state IS NULL AND new_state='available' AND object_version=1 AND actor_class='room_operator_v1' AND actor_subject_id IS NULL AND request_hash='${request}') FROM forme_r4.response_lifecycle_events WHERE event_id='event_response_deliver_${uuid}')`,
    `(SELECT count(*)=1 AND bool_and(event_id='streamevent_response_${uuid}' AND object_type='response' AND object_id='${IDS.response}' AND event_type='response.delivered' AND object_version=1 AND payload_hash='${DIGEST.request}' AND body_available AND NOT reconciliation_snapshot) FROM forme_r4.room_event_stream WHERE room_id='room_gatebcorepublic00000001')`,
  ];
}
function scenarioVerifierSql(order) {
  const winner = order.first.toLowerCase();
  const winnerUuid = compactRaceUuid(order.id, order.first);
  const winnerInteraction = raceInteractionId(order.id, order.first);
  const winnerEncounter = order.first === "A" ? IDS.encounterA : IDS.encounterB;
  const loserEncounter = order.first === "A" ? IDS.encounterB : IDS.encounterA;
  const expectedReceipts = order.newReceiptCount + (order.caseId === "C09" ? 1 : 0);
  const shared = order.caseId === "C16";
  const expectedKeys = [
    ...(order.a[0] < 300 ? [raceKey(order.id, "A", shared)] : []),
    ...(order.b[0] < 300 ? [raceKey(order.id, "B", shared)] : []),
  ];
  const rejectedKeys = [
    ...(order.a[0] >= 300 ? [raceKey(order.id, "A", shared)] : []),
    ...(order.b[0] >= 300 ? [raceKey(order.id, "B", shared)] : []),
  ];
  if (order.caseId === "C09") {
    expectedKeys.push(raceKey(`${order.id}-recover-winner`, order.first, false));
    const loserActor = order.first === "A" ? "B" : "A";
    rejectedKeys.push(raceKey(`${order.id}-recover-loser`, loserActor, false));
  }
  const quotedKeys = [...new Set(expectedKeys)].map((value) => `'${value}'`).join(",");
  const orderKeyPrefix = `race_${order.id.toLowerCase().replaceAll("-", "")}`;
  const counts = expectedRaceTableCounts(order);
  const predicates = [
    `(SELECT count(*) FROM forme_r4.operation_receipts WHERE idempotency_key IN (${quotedKeys}))=${expectedReceipts}`,
    `(SELECT count(*) FROM forme_r4.idempotency_records WHERE idempotency_key IN (${quotedKeys}))=${expectedReceipts}`,
    `(SELECT count(*) FROM forme_r4.operation_receipts WHERE idempotency_key LIKE '${orderKeyPrefix}%')=${expectedReceipts}`,
    `(SELECT count(*) FROM forme_r4.idempotency_records WHERE idempotency_key LIKE '${orderKeyPrefix}%')=${expectedReceipts}`,
    `(SELECT count(*) FROM forme_r4.pairing_challenges)=${counts.pairingChallenges}`,
    `(SELECT count(*) FROM forme_r4.room_bindings)=${counts.roomBindings}`,
    `(SELECT count(*) FROM forme_r4.public_encounters)=${counts.publicEncounters}`,
    `(SELECT count(*) FROM forme_r4.grants)=${counts.grants}`,
    `(SELECT count(*) FROM forme_r4.grant_offers)=${counts.grantOffers}`,
    `(SELECT count(*) FROM forme_r4.interactions)=${counts.interactions}`,
    `(SELECT count(*) FROM forme_r4.fresh_cycle_reservations)=${counts.freshCycleReservations}`,
    `(SELECT count(*) FROM forme_r4.dispatch_permits)=${counts.dispatchPermits}`,
    `(SELECT count(*) FROM forme_r4.responses)=${counts.responses}`,
    `(SELECT count(*) FROM forme_r4.interaction_lifecycle_events)=${counts.interactionEvents}`,
    `(SELECT count(*) FROM forme_r4.response_lifecycle_events)=${counts.responseEvents}`,
    `(SELECT count(*) FROM forme_r4.projection_lifecycle_events)=${counts.projectionEvents}`,
    `(SELECT count(*) FROM forme_r4.curation_events)=${counts.curationEvents}`,
    `(SELECT count(*) FROM forme_r4.room_event_stream)=${counts.streamEvents}`,
    `(SELECT count(*) FROM forme_r4.rate_buckets)=${counts.rateBuckets}`,
    `(SELECT count(*)=1 AND bool_and(version=${order.caseId === "C13" ? 2 : 1} AND current_projection_id ${order.caseId === "C13" ? "IS NULL" : `='${IDS.projection}'`} AND event_high_water=${counts.streamEvents}) FROM forme_r4.rooms)`,
    `(SELECT count(*)=1 AND bool_and(owner_state='${order.caseId === "C13" ? "revoked" : "published_fresh"}' AND curation_state='${order.caseId === "C15" ? "unlisted" : "admitted"}' AND current=${order.caseId === "C13" ? "false" : "true"} AND lifecycle_version=${["C13", "C15"].includes(order.caseId) ? 3 : 2} AND body_readable=${order.caseId === "C13" ? "false" : "true"}) FROM forme_r4.projections)`,
  ];
  for (const actor of ["A", "B"]) {
    const result = actor === "A" ? order.a : order.b;
    const key = raceKey(order.id, actor, shared);
    const shape = raceExpectedShape(order, actor);
    if (result[0] < 300) predicates.push(exactSuccessReceiptPredicate(order, actor, result, shape));
  }
  for (const rejectedKey of new Set(rejectedKeys)) {
    predicates.push(
      `(SELECT count(*) FROM forme_r4.operation_receipts WHERE idempotency_key='${rejectedKey}')=0`,
      `(SELECT count(*) FROM forme_r4.idempotency_records WHERE idempotency_key='${rejectedKey}')=0`,
    );
  }
  if (order.caseId === "C01") {
    const winnerBinding = order.first === "A" ? IDS.bindingA : IDS.bindingB;
    const loserBinding = order.first === "A" ? IDS.bindingB : IDS.bindingA;
    const winnerSecret = order.first === "A" ? DIGEST.bindingA : DIGEST.bindingB;
    const winnerClient = order.first === "A" ? DIGEST.clientA : DIGEST.clientB;
    predicates.push(
      `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND pairing_code_digest='${DIGEST.candidate}' AND state='exchanged' AND version=2 AND binding_id='${winnerBinding}' AND client_public_key_hash='${winnerClient}' AND sealed_exchange_envelope='synthetic-sealed-envelope-${winner}'::bytea AND sealed_exchange_hash='${DIGEST.session}') FROM forme_r4.pairing_challenges WHERE pairing_id='${IDS.pairing}')`,
      `(SELECT count(*)=1 AND bool_and(binding_id='${winnerBinding}' AND room_id='room_gatebcorepublic00000001' AND pairing_id='${IDS.pairing}' AND scope_version='room_operator.v1' AND secret_digest='${winnerSecret}' AND client_public_key_hash='${winnerClient}' AND state='active' AND revoked_at IS NULL AND version=1) FROM forme_r4.room_bindings)`,
      `(SELECT count(*) FROM forme_r4.room_bindings WHERE binding_id='${loserBinding}')=0`,
    );
  }
  if (order.caseId === "C02") predicates.push(
    ...exactInteractionCreateEvidencePredicate(order, order.first, "public_encounter", IDS.encounterA),
    `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND secret_digest='${DIGEST.encounter}' AND state='consumed' AND accepted_count=1 AND unresolved_interaction_id='${winnerInteraction}' AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.public_encounters WHERE encounter_id='${IDS.encounterA}')`,
    exactRatePredicate("public_accept", winnerUuid, DIGEST.edge, winnerInteraction),
    `(SELECT count(*) FILTER (WHERE scope='encounter_issue')=1 AND count(*) FILTER (WHERE scope='public_accept')=1 FROM forme_r4.rate_buckets)`,
  );
  if (order.caseId === "C03") {
    predicates.push(
      "(SELECT count(*) FROM forme_r4.interactions WHERE origin_capability_class='public_encounter' AND state IN ('accepted','seen_locally','preparing'))=20",
      ...exactInteractionCreateEvidencePredicate(order, order.first, "public_encounter", winnerEncounter),
      `(SELECT count(*)=1 AND bool_and(state='consumed' AND accepted_count=1 AND unresolved_interaction_id='${winnerInteraction}' AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.public_encounters WHERE encounter_id='${winnerEncounter}')`,
      `(SELECT count(*)=1 AND bool_and(state='issued' AND accepted_count=0 AND unresolved_interaction_id IS NULL AND version=1 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.public_encounters WHERE encounter_id='${loserEncounter}')`,
      exactRatePredicate("public_accept", winnerUuid, DIGEST.edge, winnerInteraction),
      `(SELECT count(*) FILTER (WHERE scope='encounter_issue')=2 AND count(*) FILTER (WHERE scope='public_accept')=1 FROM forme_r4.rate_buckets)`,
    );
  }
  if (["C04", "C05"].includes(order.caseId)) predicates.push(
    `(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='encounter_issue' AND committed_at>transaction_timestamp()-interval '${order.caseId === "C04" ? "1 hour" : "24 hours"}')=${order.caseId === "C04" ? 10 : 50}`,
    `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND secret_digest='${DIGEST.encounter}' AND state='issued' AND accepted_count=0 AND unresolved_interaction_id IS NULL AND version=1 AND canonical_object_hash='${requestHash(order.id, order.first, false)}') FROM forme_r4.public_encounters WHERE encounter_id='${winnerEncounter}')`,
    exactRatePredicate("encounter_issue", winnerUuid, DIGEST.edge, winnerEncounter),
  );
  if (order.caseId === "C06") predicates.push(
    ...exactInteractionCreateEvidencePredicate(order, order.first, "public_encounter", winnerEncounter),
    `(SELECT count(*)=1 AND bool_and(state='consumed' AND accepted_count=1 AND unresolved_interaction_id='${winnerInteraction}' AND version=2) FROM forme_r4.public_encounters WHERE encounter_id='${winnerEncounter}')`,
    `(SELECT count(*)=1 AND bool_and(state='issued' AND accepted_count=0 AND unresolved_interaction_id IS NULL AND version=1) FROM forme_r4.public_encounters WHERE encounter_id='${loserEncounter}')`,
    exactRatePredicate("public_accept", winnerUuid, DIGEST.edge, winnerInteraction),
    `(SELECT count(*) FILTER (WHERE scope='encounter_issue')=2 AND count(*) FILTER (WHERE scope='public_accept')=3 FROM forme_r4.rate_buckets)`,
  );
  if (order.caseId === "C07") predicates.push(
    order.first === "A"
      ? `(SELECT count(*)=1 AND bool_and(source_interaction_id='${IDS.interaction}' AND target_room_id='room_gatebcorepublic00000001' AND target_projection_id='${IDS.projection}' AND preset_id='short_exchange' AND state='accepted' AND accepted_grant_id='${IDS.grant}' AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.grant_offers WHERE offer_id='${IDS.offer}')`
      : `(SELECT count(*)=1 AND bool_and(source_interaction_id='${IDS.interaction}' AND target_room_id='room_gatebcorepublic00000001' AND target_projection_id='${IDS.projection}' AND preset_id='short_exchange' AND state='owner_revoked' AND accepted_grant_id IS NULL AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.grant_offers WHERE offer_id='${IDS.offer}')`,
    ...(order.first === "A" ? [
      `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND reentry_chain_id='${IDS.chain}' AND preset_id='short_exchange' AND secret_digest='${DIGEST.auth}' AND state='issued' AND accepted_count=0 AND accepted_quota=2 AND unresolved_interaction_id IS NULL AND NOT agent_derivation_allowed AND version=1 AND canonical_object_hash='${requestHash(order.id, "A", false)}') FROM forme_r4.grants WHERE grant_id='${IDS.grant}')`,
    ] : []),
  );
  if (order.caseId === "C08") predicates.push(
    ...exactInteractionCreateEvidencePredicate(order, order.first, "grant", IDS.grant),
    `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND reentry_chain_id='${IDS.chain}' AND preset_id='short_exchange' AND secret_digest='${DIGEST.reply}' AND state='consumed' AND accepted_count=2 AND accepted_quota=2 AND unresolved_interaction_id='${winnerInteraction}' AND NOT agent_derivation_allowed AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.grants WHERE grant_id='${IDS.grant}')`,
    `(SELECT count(*) FILTER (WHERE scope='public_accept')=3 AND count(*) FILTER (WHERE scope='encounter_issue')=0 FROM forme_r4.rate_buckets)`,
  );
  if (order.caseId === "C09") {
    const winnerReservation = order.first === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b";
    const loserReservation = order.first === "A" ? "reservation_gatebcore0000000b" : "reservation_gatebcore0000000a";
    const recoveryOrderId = `${order.id}-recover-winner`;
    const recoveryReceipt = exactReceiptId("cycle_recovered", recoveryOrderId, order.first);
    const recoveryKey = raceKey(recoveryOrderId, order.first, false);
    predicates.push(
      `(SELECT count(*)=1 AND bool_and(state='preparing' AND state_version=3 AND body_readable AND terminal_at IS NULL AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`,
      `(SELECT count(*)=1 AND bool_and(interaction_id='${IDS.interaction}' AND start_authorization_hash='${DIGEST.auth}' AND session_envelope_hash='${DIGEST.session}' AND state='reserved' AND idempotency_key='${raceKey(order.id, order.first, false)}' AND first_dispatch_committed_at IS NULL AND released_at IS NULL AND version=1 AND canonical_object_hash='${requestHash(order.id, order.first, false)}') FROM forme_r4.fresh_cycle_reservations WHERE reservation_id='${winnerReservation}')`,
      `(SELECT count(*) FROM forme_r4.fresh_cycle_reservations WHERE reservation_id='${loserReservation}')=0`,
      `(SELECT count(*)=1 AND bool_and(actor_scope_digest='${DIGEST.binding}' AND action='room_operator.cycle.recover' AND idempotency_key='${recoveryKey}' AND canonical_request_hash='${requestHash(recoveryOrderId, order.first, false)}' AND target_id='${winnerReservation}' AND target_version=1 AND status='no_op' AND body_free_code='cycle_recovered' AND result_body_free=jsonb_build_object('code','cycle_recovered')) FROM forme_r4.operation_receipts WHERE receipt_id='${recoveryReceipt}')`,
      `(SELECT count(*)=1 AND bool_and(canonical_request_hash='${requestHash(recoveryOrderId, order.first, false)}' AND http_status=200 AND result_code='cycle_recovered' AND recovery_kind='body_free' AND body_free_result IS NOT NULL AND receipt_id='${recoveryReceipt}') FROM forme_r4.idempotency_records WHERE actor_scope_digest='${DIGEST.binding}' AND action='room_operator.cycle.recover' AND idempotency_key='${recoveryKey}')`,
    );
  }
  if (order.caseId === "C10") predicates.push(
    `(SELECT count(*)=1 AND bool_and(interaction_id='${IDS.interaction}' AND start_authorization_hash='${DIGEST.auth}' AND session_envelope_hash='${DIGEST.session}' AND state='${order.first === "A" ? "dispatch_committed" : "released_zero_dispatch"}' AND ${order.first === "A" ? "first_dispatch_committed_at IS NOT NULL AND released_at IS NULL" : "first_dispatch_committed_at IS NULL AND released_at IS NOT NULL"} AND version=2 AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.fresh_cycle_reservations WHERE reservation_id='${IDS.reservation}')`,
    `(SELECT count(*)=1 AND bool_and(state='${order.first === "A" ? "preparing" : "seen_locally"}' AND state_version=${order.first === "A" ? 1 : 2} AND body_readable AND terminal_at IS NULL) FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`,
    ...(order.first === "A" ? [
      `(SELECT count(*)=1 AND bool_and(interaction_id='${IDS.interaction}' AND reservation_id='${IDS.reservation}' AND session_envelope_hash='${DIGEST.session}' AND start_authorization_hash='${DIGEST.auth}' AND provider='OpenAI' AND model_id='gpt-5' AND payload_hash='${DIGEST.payload}' AND dispatch_ordinal=1 AND idempotency_key='${raceKey(order.id, "A", false)}' AND consumed_at IS NULL AND canonical_object_hash='${requestHash(order.id, "A", false)}') FROM forme_r4.dispatch_permits WHERE permit_id='${IDS.permit}')`,
    ] : []),
  );
  if (["C11", "C12"].includes(order.caseId)) {
    const state = order.first === "A" ? "response_ready" : order.caseId === "C11" ? "closed_without_response" : "interaction_deleted";
    const terminalEvent = order.caseId === "C11" ? "close" : "delete";
    predicates.push(
      `(SELECT count(*)=1 AND bool_and(state='${state}' AND state_version=2 AND body_readable=${order.first === "A" ? "true" : "false"} AND terminal_at IS ${order.first === "A" ? "NULL" : "NOT NULL"} AND canonical_object_hash='${DIGEST.request}') FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`,
      ...(order.first === "A" ? exactDeliveredResponsePredicate(order, "A") : [
        `(SELECT count(*)=1 AND bool_and(interaction_id='${IDS.interaction}' AND room_id='room_gatebcorepublic00000001' AND prior_state='seen_locally' AND new_state='${state}' AND object_version=2 AND actor_class='${order.caseId === "C11" ? "controller" : "manual_guest"}' AND actor_subject_id ${order.caseId === "C11" ? "='subject_gatebcorecontroller0001'" : "IS NULL"} AND request_hash='${requestHash(order.id, "B", false)}') FROM forme_r4.interaction_lifecycle_events WHERE event_id='event_interaction_${terminalEvent}_${compactRaceUuid(order.id, "B")}')`,
      ]),
    );
  }
  if (order.caseId === "C13") predicates.push(
    `(SELECT count(*)=1 AND bool_and(owner_state='revoked' AND curation_state='admitted' AND NOT current AND NOT body_readable AND lifecycle_version=3 AND purged_at IS NULL) FROM forme_r4.projections WHERE projection_id='${IDS.projection}')`,
    `(SELECT count(*)=1 AND bool_and(current_projection_id IS NULL AND version=2 AND event_high_water=${order.first === "A" ? 1 : 0}) FROM forme_r4.rooms WHERE room_id='room_gatebcorepublic00000001')`,
    `(SELECT count(*)=1 AND bool_and(state='origin_revoked' AND state_version=${order.first === "A" ? 3 : 2} AND NOT body_readable AND terminal_at IS NOT NULL) FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`,
    `(SELECT count(*)=1 AND bool_and(projection_id='${IDS.projection}' AND room_id='room_gatebcorepublic00000001' AND prior_owner_state='published_fresh' AND new_owner_state='revoked' AND prior_current AND NOT new_current AND object_version=3 AND actor_class='controller' AND actor_subject_id='subject_gatebcorecontroller0001' AND request_hash='${requestHash(order.id, "B", false)}') FROM forme_r4.projection_lifecycle_events WHERE event_id='event_projection_revoke_${compactRaceUuid(order.id, "B")}')`,
    ...(order.first === "A" ? exactDeliveredResponsePredicate(order, "A", "origin_revoked", 2, false) : []),
  );
  if (order.caseId === "C14") predicates.push(
    `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND state='revoked' AND revoked_at IS NOT NULL AND version=2) FROM forme_r4.room_bindings WHERE binding_id='${IDS.binding}')`,
    `(SELECT count(*)=1 AND bool_and(state='${order.first === "A" ? "seen_locally" : "accepted"}' AND state_version=${order.first === "A" ? 2 : 1} AND body_readable AND terminal_at IS NULL) FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`,
  );
  if (order.caseId === "C15") predicates.push(
    `(SELECT count(*)=1 AND bool_and(owner_state='published_fresh' AND curation_state='unlisted' AND current AND body_readable AND lifecycle_version=3) FROM forme_r4.projections WHERE projection_id='${IDS.projection}')`,
    `(SELECT count(*)=1 AND bool_and(third_place_id='${IDS.thirdPlace}' AND projection_id='${IDS.projection}' AND room_id='room_gatebcorepublic00000001' AND event_kind='unlisted' AND prior_state='admitted' AND new_state='unlisted' AND curator_subject_id='subject_gatebcorecurator000001' AND object_version=3 AND request_hash='${requestHash(order.id, "A", false)}') FROM forme_r4.curation_events WHERE event_id='event_curation_unlist_${compactRaceUuid(order.id, "A")}')`,
    ...(order.first === "B" ? [
      `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND secret_digest='${DIGEST.encounter}' AND state='issued' AND accepted_count=0 AND unresolved_interaction_id IS NULL AND version=1 AND canonical_object_hash='${requestHash(order.id, "B", false)}') FROM forme_r4.public_encounters WHERE encounter_id='${IDS.encounterB}')`,
      exactRatePredicate("encounter_issue", compactRaceUuid(order.id, "B"), DIGEST.edge, IDS.encounterB),
    ] : []),
  );
  if (order.caseId === "C16") {
    const encounterId = "encounter_gatebcore0000000c16";
    const winnerReceipt = exactReceiptId("public_encounter_issued", order.id, order.first);
    predicates.push(
      `(SELECT count(*)=1 AND bool_and(room_id='room_gatebcorepublic00000001' AND projection_id='${IDS.projection}' AND secret_digest='${DIGEST.encounter}' AND state='issued' AND accepted_count=0 AND unresolved_interaction_id IS NULL AND version=1 AND canonical_object_hash='${requestHash(order.id, order.first, true)}') FROM forme_r4.public_encounters WHERE encounter_id='${encounterId}')`,
      exactRatePredicate("encounter_issue", winnerUuid, DIGEST.edge, encounterId),
      `(SELECT count(*)=1 AND bool_and(receipt_id='${winnerReceipt}' AND target_id='encounter_gatebcore0000000c16' AND target_version=1 AND body_free_code='public_encounter_issued') FROM forme_r4.operation_receipts WHERE action='public_encounter.issue')`,
      `(SELECT count(*)=1 AND bool_and(receipt_id='${winnerReceipt}' AND canonical_request_hash='${requestHash(order.id, order.first, true)}' AND http_status=201 AND result_code='public_encounter_issued' AND recovery_kind='body_free' AND body_free_result IS NOT NULL) FROM forme_r4.idempotency_records WHERE actor_scope_digest='${DIGEST.edge}' AND action='public_encounter.issue' AND idempotency_key='${raceKey(order.id, order.first, true)}')`,
    );
  }
  if (["C02", "C03", "C06", "C08"].includes(order.caseId)) predicates.push(
    `(SELECT count(*) FROM forme_r4.interaction_lifecycle_events)=1`,
    `(SELECT count(*) FROM forme_r4.room_event_stream)=1`,
    `(SELECT event_high_water=1 FROM forme_r4.rooms WHERE room_id='room_gatebcorepublic00000001')`,
  );
  if (!["C02", "C03", "C06", "C08", "C11", "C12", "C13"].includes(order.caseId)) predicates.push(
    `(SELECT count(*) FROM forme_r4.room_event_stream)=0`,
    `(SELECT event_high_water=0 FROM forme_r4.rooms WHERE room_id='room_gatebcorepublic00000001')`,
  );
  predicates.push(`'${winner}' IN ('a','b')`);
  return `DO $verify$ BEGIN IF NOT (${predicates.join(" AND ")}) THEN RAISE EXCEPTION 'race_persisted_state_mismatch:${order.id}'; END IF; END $verify$;`;
}
function replaceAllExact(template, replacements) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    const marker = `{{${token}}}`;
    if (!output.includes(marker)) fail("RACE_TEMPLATE_TOKEN_MISSING");
    output = output.replaceAll(marker, value);
  }
  if (/\{\{[A-Z0-9_]+\}\}/u.test(output)) fail("RACE_TEMPLATE_TOKEN_UNRESOLVED");
  return output;
}
function splitRaceWorkerInput(input, actor) {
  const marker = `-- COMMIT_GATE ${actor}\n`;
  const index = input.indexOf(marker);
  if (index < 0 || input.indexOf(marker, index + marker.length) >= 0) fail("RACE_WORKER_COMMIT_GATE_INVALID");
  return deepFreeze({ prefix: input.slice(0, index + marker.length), suffix: input.slice(index + marker.length) });
}
export function composeRaceArtifacts(catalog = undefined, readRuntimeFile = undefined) {
  catalog ??= loadRaceCatalog(readRuntimeFile);
  const templates = Object.fromEntries(Object.entries(RACE_TEMPLATE_RELATIVE_PATHS).map(([key, relativePath]) => [key, postgresRuntimeText(relativePath, readRuntimeFile)]));
  const setups = new Map(catalog.cases.map((caseRow) => [
    caseRow.id,
    replaceAllExact(templates.setup, { CASE_ID: caseRow.id, EXACT_SCENARIO_SETUP_SQL: scenarioSetupSql(caseRow.id) }),
  ]));
  const entries = [];
  for (const order of catalog.orders) {
    const caseRow = catalog.cases.find((row) => row.id === order.caseId);
    const orderToken = order.first === "A" ? "A-B" : "B-A";
    const setup = setups.get(order.caseId);
    const workers = {};
    for (const actor of ["A", "B"]) {
      const fn = actor === "A" ? caseRow.aFunction : caseRow.bFunction;
      const expected = actor === "A" ? order.a : order.b;
      const call = `SELECT (r).http_status AS http_status,(r).code AS code,COALESCE((r).target_id::text,'') AS target_id,COALESCE((r).target_version::text,'') AS target_version,COALESCE((r).receipt_id::text,'') AS receipt_id,encode(pg_catalog.convert_to(COALESCE((r).result::text,''),'UTF8'),'hex') AS result_body_hex FROM (SELECT forme_r4.${fn}(${syntheticArgs(fn, actor, order.id)}) AS r) AS exact_call`;
      const c16 = order.caseId === "C16";
      const winnerReceipt = c16 ? `receipt_encounter_issue_${raceUuid(order.id, order.first).replaceAll("-", "")}` : "";
      const shape = raceExpectedShape(order, actor);
      workers[actor] = replaceAllExact(templates.worker, { ACTOR: actor, ACTOR_START_KEY: String(BigInt(`0x${crypto.createHash("sha256").update(`${order.id}:${actor}`).digest("hex").slice(0, 15)}`)), EXACT_CORE_CALL_SQL: call, EXPECTED_HTTP: String(expected[0]), EXPECTED_CODE: expected[1], EXPECT_RECEIPT: expected[0] < 300 ? "true" : "false", EXPECT_TARGET_NULL: shape.target === "" ? "true" : "false", EXPECT_VERSION_NULL: shape.version === "" ? "true" : "false", EXPECTED_EXACT_TARGET: shape.target, EXPECTED_EXACT_VERSION: shape.version, EXPECTED_EXACT_RECEIPT: winnerReceipt, RESULT_BODY_OUTPUT: c16 ? `\\echo RESULT_BODY_HEX ${actor} :r4_result_result_body_hex` : "" });
    }
    const expectedNewReceipts = order.newReceiptCount + (order.caseId === "C09" ? 1 : 0);
    const verify = replaceAllExact(templates.verify, { CASE_ID: order.caseId, ORDER_ID: orderToken, EXPECTED_NEW_RECEIPTS: String(expectedNewReceipts), EXACT_PERSISTED_ASSERTION_SQL: scenarioVerifierSql(order) });
    const second = order.first === "A" ? "B" : "A";
    const observer = `WITH RECURSIVE poll(attempt,ok) AS (SELECT 1,EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE pid=:second_pid AND state='active' AND wait_event_type='Lock' AND :first_pid=ANY(pg_catalog.pg_blocking_pids(pid)) AND cardinality(pg_catalog.pg_blocking_pids(pid))=1) UNION ALL SELECT attempt+1,EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE pid=:second_pid AND state='active' AND wait_event_type='Lock' AND :first_pid=ANY(pg_catalog.pg_blocking_pids(pid)) AND cardinality(pg_catalog.pg_blocking_pids(pid))=1) FROM poll CROSS JOIN LATERAL (SELECT pg_catalog.pg_sleep(0.025)) AS delay WHERE NOT ok AND attempt<200) SELECT CASE WHEN pg_catalog.bool_or(ok) THEN 'OBSERVER_OK' ELSE pg_catalog.current_setting('forme_r4.closed_race_observer_rejected') END AS body_free_marker FROM poll;`;
    const controller = `${order.id}\nHOLD_SESSION_LOCKS:A,B\nWAIT_READY:A,B:5000\nRELEASE_START:${order.first}\nWAIT_POST_CALL:${order.first}:5000\nRELEASE_START:${second}\nWAIT_CALL_STARTED:${second}:5000\nOBSERVER_ROLE:postgres\nOBSERVER_INDEPENDENT_SESSION:true\nOBSERVER_SQL_SHA256:${sha256(observer)}\nREQUIRE_BLOCKED:${second}<-${order.first}\nCOMMIT_GATE:${order.first}\nWAIT_COMMIT_ACK:${order.first}:5000\nWAIT_POST_CALL:${second}:5000\nCOMMIT_GATE:${second}\nWAIT_COMMIT_ACK:${second}:5000\nCOMPARE_C16_RESULT_BODY_BYTES:${order.caseId === "C16" ? "true" : "false"}\nREAP_AND_PROVE_ABSENT:CONTROLLER,A,B,OBSERVER\n`;
    entries.push(deepFreeze({ orderId: order.id, setup, workers, verify, expectedNewReceipts, observer, controller }));
  }
  return deepFreeze(entries);
}
export function raceByteIndex(catalog = undefined, readRuntimeFile = undefined) {
  catalog ??= loadRaceCatalog(readRuntimeFile);
  const artifacts = composeRaceArtifacts(catalog, readRuntimeFile);
  const setups = [...new Map(artifacts.map((row) => [row.orderId.slice(0, 3), row.setup])).entries()].map(([caseId, setup]) => ({ caseId, setupSha256: sha256(setup) }));
  const entries = artifacts.map((row) => ({ orderId: row.orderId, caseId: row.orderId.slice(0, 3), setupSha256: sha256(row.setup), workerASha256: sha256(row.workers.A), workerBSha256: sha256(row.workers.B), observerSha256: sha256(row.observer), controllerSha256: sha256(row.controller), verifierSha256: sha256(row.verify) }));
  const recovery = composeRaceRecoveries(catalog).map((row) => ({ orderId: row.orderId, kind: row.kind, inputSha256: sha256(row.input), resultSha256: sha256(canonicalJson(row.result)) }));
  if (setups.length !== 16 || new Set(setups.map((row) => row.setupSha256)).size !== 16) fail("RACE_SETUP_INDEX_INVALID");
  return deepFreeze({ schemaVersion: "r4.gate-b-core.postgres-race-byte-index.v1", constructionPacketSha256: PHYSICAL_AUTHORITY.constructionPacketSha256, templateHashes: Object.fromEntries(Object.entries(RACE_TEMPLATE_RELATIVE_PATHS).map(([key, relativePath]) => [key, sha256(postgresRuntimeText(relativePath, readRuntimeFile))])), setupCount: 16, setups, orderCount: 32, entries, recoveryInputCount: 4, recovery });
}
export function composeRaceRecoveries(catalog = loadRaceCatalog()) {
  return deepFreeze(catalog.c09Recovery.flatMap((row) => ["winner", "loser"].map((kind) => {
    const actor = kind === "winner" ? row.orderId.endsWith("A-B") ? "A" : "B" : row.orderId.endsWith("A-B") ? "B" : "A";
    const reservation = actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b";
    const expectedHttp = kind === "winner" ? 200 : 409;
    const expectedCode = kind === "winner" ? "cycle_recovered" : "cycle_recovery_mismatch";
    const expectedTarget = kind === "winner" ? reservation : IDS.interaction;
    const expectedVersion = kind === "winner" ? 1 : 3;
    const expectReceipt = kind === "winner";
    const input = `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE forme_r4_app;
SELECT (r).http_status AS http_status,(r).code AS code,COALESCE((r).target_id::text,'') AS target_id,COALESCE((r).target_version::text,'') AS target_version,COALESCE((r).receipt_id::text,'') AS receipt_id FROM (SELECT forme_r4.tx_fresh_cycle_recover(${context("room_operator_v1", null, DIGEST.binding, `${row.orderId}-recover-${kind}`, actor, 1)},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${reservation}','${DIGEST.auth}','${DIGEST.session}') AS r) AS exact_recovery \\gset r4_recovery_
SELECT CASE WHEN :'r4_recovery_http_status'::integer=${expectedHttp} AND :'r4_recovery_code'='${expectedCode}' AND :'r4_recovery_target_id'='${expectedTarget}' AND :'r4_recovery_target_version'='${expectedVersion}' AND ${expectReceipt ? ":'r4_recovery_receipt_id'<>''" : ":'r4_recovery_receipt_id'=''"} THEN 1 ELSE pg_catalog.current_setting('forme_r4.closed_race_recovery_rejected')::integer END AS exact_result_guard \\gset r4_recovery_guard_
SELECT CASE WHEN :'r4_recovery_receipt_id'='' THEN 0 ELSE 1 END AS receipt_present \\gset r4_recovery_receipt_
COMMIT;
\\echo RECOVERY_RESULT ${kind.toUpperCase()} :r4_recovery_http_status :r4_recovery_code :r4_recovery_receipt_receipt_present
`;
    return { orderId: row.orderId, kind, actor, input, result: row[kind] };
  })));
}

export function buildPostgresPhysicalPlan(binding, manifestSha256, runId, readRuntimeFile = undefined) {
  exactObject(binding, new Set(["dockerCli", "dockerUnixSocket", "localImageId"]), "POSTGRES_BINDING_SHAPE");
  if (!path.isAbsolute(binding.dockerCli) || !path.isAbsolute(binding.dockerUnixSocket) || !SHA.test(binding.localImageId) || !SHA.test(manifestSha256) || !ID.test(runId) || (readRuntimeFile !== undefined && typeof readRuntimeFile !== "function")) fail("POSTGRES_PLAN_AUTHORITY_INVALID");
  const host = `unix://${binding.dockerUnixSocket}`;
  const name = `forme-r4-core-${runId}`;
  const volume = `forme-r4-core-${runId}`;
  const runRoot = `/private/tmp/forme-r4-gate-b-postgres-${runId}`;
  const runtimeReader = pinnedPostgresRuntimeReader(readRuntimeFile);
  const base = [binding.dockerCli, "--host", host];
  const environment = deepFreeze({ HOME: `${runRoot}/home`, DOCKER_CONFIG: `${runRoot}/docker-config`, TMPDIR: `${runRoot}/tmp`, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" });
  const docker = (kind, tail, effect, extra = {}) => deepFreeze({ kind, executable: binding.dockerCli, argv: [...base.slice(1), ...tail], environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exit-zero-stderr-zero", effect, ...extra });
  const psqlArgv = ["--host", host, "exec", "--user", "postgres", "--interactive", name, "/usr/bin/psql", "-X", "--no-password", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", "forme_r4_gate_b", "--no-align", "--tuples-only", "--quiet"];
  const psql = (kind, stdinText, extra = {}) => deepFreeze({ kind, executable: binding.dockerCli, argv: psqlArgv, environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "exact-plan-bytes", stdinText, stdinSha256: sha256(Buffer.from(stdinText, "utf8")), deadlineMilliseconds: 120_000, stdoutLimitBytes: 1_048_576, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "psql-body-free-closed", effect: "postgres-sql", ...extra });
  const marker = (kind) => deepFreeze({ kind, executable: null, argv: [], environment: {}, cwd: runRoot, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 0, stdoutLimitBytes: 0, stderrLimitBytes: 0, expectedExitCodes: [], outputParser: "journal-fsync", effect: "body-free-marker" });
  const catalog = loadRaceCatalog(runtimeReader);
  const artifacts = composeRaceArtifacts(catalog, runtimeReader);
  const recoveries = composeRaceRecoveries(catalog);
  const steps = [
    marker("capsule-revalidate"),
    docker("image-binding-revalidate", ["image", "inspect", "--format", "{{.Id}}|{{.Os}}|{{.Architecture}}|{{join .RepoDigests \",\"}}", "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"], "read-only-bound-image", { outputParser: "exact-bound-image-id-platform-index", expectedLocalImageId: binding.localImageId, expectedOs: "linux", expectedArchitecture: "arm64", expectedRepoDigest: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74" }),
    docker("container-collision-check", ["container", "inspect", "--format", "{{json .Config.Labels}}", name], "read-only-exact-name", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-name-must-be-absent" }),
    docker("volume-collision-check", ["volume", "inspect", "--format", "{{json .Labels}}", volume], "read-only-exact-name", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-name-must-be-absent" }),
    docker("volume-create", ["volume", "create", "--label", `forme.run=${runId}`, volume], "volume-create", { outputParser: "exact-volume-create-name" }),
    docker("volume-identity-capture", ["volume", "inspect", "--format", "{{.Name}}\t{{index .Labels \"forme.run\"}}\t{{.CreatedAt}}\t{{.Driver}}\t{{.Scope}}", volume], "read-only-volume-identity", { outputParser: "exact-volume-identity" }),
    docker("container-create", ["create", "--pull=never", "--name", name, "--label", `forme.run=${runId}`, "--platform", "linux/arm64", "--network", "none", "--env", "POSTGRES_DB=forme_r4_gate_b", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--volume", `${volume}:/var/lib/postgresql/data`, "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"], "container-create", { outputParser: "exact-container-create-id" }),
    marker("container-created-marker"),
    docker("container-start", ["start", name], "container-start"),
    marker("container-started-marker"),
    docker("readiness", ["exec", "--user", "postgres", name, "/usr/bin/pg_isready", "--username", "postgres", "--dbname", "forme_r4_gate_b", "--timeout", "1"], "read-only", { maximumAttempts: 30, intervalMilliseconds: 250, deadlineMilliseconds: 10_000, outputParser: "pg-isready-bounded" }),
  ];
  for (const sqlKey of ["bootstrap", "migration", "basisErrors", "basis", "verify", "happy", "errors", "verify", "rollback"]) steps.push(psql(`baseline-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256, runtimeReader), { sqlKey }));
  for (const sqlKey of ["bootstrap", "migration", "basis"]) steps.push(psql(`nonrace-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256, runtimeReader), { sqlKey }));
  steps.push(psql("nonrace-public-boundaries", nonRacePublicBoundarySql(), { sqlKey: "nonrace-public-boundaries", expectedAssertions: ["public_issue_active_cap20_not_closed", "public_missing_issuance_lineage_not_closed"] }));
  steps.push(psql("nonrace-rollback", buildCorePostgresStdin("rollback", manifestSha256, runtimeReader), { sqlKey: "rollback" }));
  for (const artifact of artifacts) {
    for (const sqlKey of ["bootstrap", "migration", "basis"]) steps.push(psql(`${artifact.orderId}-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256, runtimeReader), { orderId: artifact.orderId, sqlKey }));
    steps.push(psql(`${artifact.orderId}-setup`, artifact.setup, { orderId: artifact.orderId, sqlKey: "race-setup" }));
    const workerA = splitRaceWorkerInput(artifact.workers.A, "A");
    const workerB = splitRaceWorkerInput(artifact.workers.B, "B");
    steps.push(deepFreeze({ kind: `${artifact.orderId}-controller`, operation: "read-committed-overlap-controller", orderId: artifact.orderId, executable: binding.dockerCli, argv: psqlArgv, environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "two-worker-controller-and-observer-byte-index", workerAStdin: artifact.workers.A, workerAStdinSha256: sha256(Buffer.from(artifact.workers.A, "utf8")), workerAPrefix: workerA.prefix, workerAPrefixSha256: sha256(Buffer.from(workerA.prefix, "utf8")), workerASuffix: workerA.suffix, workerASuffixSha256: sha256(Buffer.from(workerA.suffix, "utf8")), workerBStdin: artifact.workers.B, workerBStdinSha256: sha256(Buffer.from(artifact.workers.B, "utf8")), workerBPrefix: workerB.prefix, workerBPrefixSha256: sha256(Buffer.from(workerB.prefix, "utf8")), workerBSuffix: workerB.suffix, workerBSuffixSha256: sha256(Buffer.from(workerB.suffix, "utf8")), observerStdin: artifact.observer, observerStdinSha256: sha256(Buffer.from(artifact.observer, "utf8")), controllerProtocol: artifact.controller, controllerProtocolSha256: sha256(Buffer.from(artifact.controller, "utf8")), deadlineMilliseconds: 30_000, stdoutLimitBytes: 1_048_576, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exact-race-arm-and-lock-observer", processGroupCount: 4, effect: "postgres-race-core-calls" }));
    for (const recovery of recoveries.filter((row) => row.orderId === artifact.orderId)) steps.push(psql(`${artifact.orderId}-recover-${recovery.kind}`, recovery.input, { orderId: artifact.orderId, recoveryKind: recovery.kind, expectedResult: recovery.result, sqlKey: "c09-recovery" }));
    steps.push(psql(`${artifact.orderId}-verify`, artifact.verify, { orderId: artifact.orderId, sqlKey: "race-verifier", expectedBodyFreeMarker: `VERIFIED ${artifact.orderId} ${artifact.expectedNewReceipts}`, expectedNewReceipts: artifact.expectedNewReceipts }));
    steps.push(psql(`${artifact.orderId}-rollback`, buildCorePostgresStdin("rollback", manifestSha256, runtimeReader), { orderId: artifact.orderId, sqlKey: "rollback" }));
  }
  for (const sqlKey of ["bootstrap", "migration", "basis", "verify", "rollback"]) steps.push(psql(`final-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256, runtimeReader), { sqlKey }));
  steps.push(
    docker("container-cleanup-inspect", ["container", "inspect", "--format", "{{.Id}}\t{{.Name}}\t{{index .Config.Labels \"forme.run\"}}", POSTGRES_CONTAINER_ID_PLACEHOLDER], "read-only-container-identity", { outputParser: "exact-container-identity" }),
    docker("container-remove", ["rm", "--force", POSTGRES_CONTAINER_ID_PLACEHOLDER], "container-remove", { outputParser: "exact-container-remove-id" }),
    docker("container-id-absence", ["container", "inspect", "--format", "{{.Id}}", POSTGRES_CONTAINER_ID_PLACEHOLDER], "read-only-container-id-absence", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-container-id-absence" }),
    docker("container-name-absence", ["container", "inspect", "--format", "{{.Id}}", name], "read-only-container-name-absence", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-container-name-absence" }),
    docker("volume-cleanup-inspect", ["volume", "inspect", "--format", "{{.Name}}\t{{index .Labels \"forme.run\"}}\t{{.CreatedAt}}\t{{.Driver}}\t{{.Scope}}", volume], "read-only-volume-identity", { outputParser: "exact-volume-identity" }),
    docker("volume-remove", ["volume", "rm", volume], "volume-remove", { outputParser: "exact-volume-remove-name" }),
    docker("volume-name-absence", ["volume", "inspect", "--format", "{{.Name}}", volume], "read-only-volume-name-absence", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-volume-name-absence" }),
    marker("postgres-absence-proof"),
  );
  return deepFreeze({
    schemaVersion: "r4.gate-b-core.postgres-physical-plan.v1", manifestSha256, runId, runRoot, containerName: name, volumeName: volume, imageReference: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", localImageId: binding.localImageId,
    steps: deepFreeze(steps), orderedExecutions: 32, expectedCoreCalls: 68, expected2xx: 39, expectedControlledNon2xx: 29, expectedNewReceipts: 37, persistedVerifiers: 32, byteIndexSha256: sha256(Buffer.from(canonicalJson(raceByteIndex(catalog, runtimeReader)), "utf8")),
  });
}

export function buildCodexPhysicalPlan(runRoot) {
  const layout = coreCodexLayout(runRoot);
  const commands = CODEX_PROCESS_KINDS.map((kind) => {
    const logical = buildCoreCodexLogicalCommand(layout, kind);
    validateCoreCodexLogicalCommand(layout, logical);
    return deepFreeze({ ...logical, shell: false, detached: true, executable: "/usr/bin/sandbox-exec", termGraceMilliseconds: 2000, killGraceMilliseconds: 2000 });
  });
  return deepFreeze({ schemaVersion: "r4.gate-b-core.codex-physical-plan.v1", version: CORE_CODEX_VERSION, schemaFileCount: CORE_CODEX_SCHEMA_COUNT, schemaAggregateSha256: CORE_CODEX_SCHEMA_SHA256, commands, processStartSlots: 4, threadStarts: 0, turnStarts: 0, providerCalls: 0, networkAuthority: 0, postResponseFinalityProven: false, causalFinality: "UNPROVEN_ACCEPTED" });
}
export function evaluateCodexWireChunks(chunks, validateInitializeResult) {
  if (!Array.isArray(chunks) || chunks.some((chunk) => !Buffer.isBuffer(chunk))) fail("CODEX_WIRE_CHUNKS_INVALID");
  const guard = createCoreCodexWireGuard(validateInitializeResult);
  let buffer = Buffer.alloc(0);
  let writes = 1;
  let responseCandidate = false;
  let violation = false;
  let secondWriteCommitted = false;
  for (const chunk of chunks) {
    if (violation) break;
    const prior = buffer;
    buffer = Buffer.concat([prior, chunk]);
    prior.fill(0);
    while (true) {
      const lf = buffer.indexOf(0x0a);
      if (lf < 0) break;
      const line = Buffer.from(buffer.subarray(0, lf));
      const remainder = Buffer.from(buffer.subarray(lf + 1));
      buffer.fill(0); buffer = remainder;
      try {
        if (!guard.acceptLine(line)) violation = true;
        else if (/"id"\s*:\s*0/u.test(line.toString("utf8"))) responseCandidate = true;
      } catch { violation = true; }
      finally { line.fill(0); }
      if (violation) break;
    }
    if (!secondWriteCommitted && responseCandidate) {
      if (buffer.length === 0 && !violation) { writes = 2; secondWriteCommitted = true; }
      else violation = true;
    }
  }
  let summary = null;
  if (!violation && buffer.length === 0) { try { summary = guard.finish(); } catch { violation = true; } }
  else if (buffer.length > 0) violation = true;
  buffer.fill(0);
  return deepFreeze({ writes, violation, secondWriteCommitted, postResponseFinalityProven: false, causalFinality: "UNPROVEN_ACCEPTED", summary });
}

export function buildMacOSPhysicalPlan(binding, manifestSha256, runId, readRuntimeFile = undefined) {
  exactObject(binding, new Set(["swiftc", "sdkPath", "codesign", "security", "openssl", "lsof", "node", "runtimeSourceRoot"]), "MACOS_BINDING_SHAPE", "RED");
  if (!SHA.test(manifestSha256) || !ID.test(runId) || Object.values(binding).some((value) => !path.isAbsolute(value))) fail("MACOS_PLAN_AUTHORITY_INVALID", "RED");
  if (readRuntimeFile !== undefined && typeof readRuntimeFile !== "function") fail("MACOS_RUNTIME_READER_INVALID", "RED");
  const runtimeSourceRoot = path.normalize(binding.runtimeSourceRoot);
  let canonicalRuntimeSourceRoot;
  try { canonicalRuntimeSourceRoot = fs.realpathSync(runtimeSourceRoot); }
  catch { fail("MACOS_RUNTIME_SOURCE_ROOT_INVALID", "RED"); }
  if (runtimeSourceRoot !== binding.runtimeSourceRoot || canonicalRuntimeSourceRoot !== runtimeSourceRoot) fail("MACOS_RUNTIME_SOURCE_ROOT_INVALID", "RED");
  const runtimeInput = (relativePath) => {
    if (typeof relativePath !== "string" || path.isAbsolute(relativePath) || relativePath.split(path.sep).includes("..")) fail("MACOS_RUNTIME_INPUT_PATH_INVALID", "RED");
    const absolute = path.join(runtimeSourceRoot, relativePath);
    const relative = path.relative(runtimeSourceRoot, absolute);
    if (relative === "" || path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) fail("MACOS_RUNTIME_INPUT_PATH_ESCAPE", "RED");
    return absolute;
  };
  const runtimeBytes = (relativePath) => {
    const absolute = runtimeInput(relativePath);
    if (readRuntimeFile === undefined) return Buffer.from(closedFile(absolute), "utf8");
    const value = readRuntimeFile(relativePath);
    if (typeof value === "string") return Buffer.from(value, "utf8");
    if (!Buffer.isBuffer(value)) fail(`MACOS_RUNTIME_BYTES_INVALID:${relativePath}`, "RED");
    return value;
  };
  const runtimeJSON = (relativePath) => {
    const bytes = runtimeBytes(relativePath);
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { fail(`MACOS_RUNTIME_JSON_INVALID:${relativePath}`, "RED"); }
    finally { bytes.fill(0); }
  };
  const root = `/private/tmp/forme-r4-gate-b-core-${runId}`;
  const build = `${root}/build`;
  const app = `${root}/FormeCoreLocal.app`;
  const executable = `${app}/Contents/MacOS/FormeCoreLocal`;
  const keychain = `${root}/signing/forme-core.keychain-db`;
  const key = `${root}/signing/key.pem`;
  const cert = `${root}/signing/cert.pem`;
  const p12 = `${root}/signing/identity.p12`;
  const opensslConfig = `${root}/signing/openssl.cnf`;
  const entitlements = runtimeInput("native/macos/Resources/FormeCoreLocal.entitlements");
  const infoPlist = runtimeInput("native/macos/Resources/FormeCoreLocal.Info.plist");
  const transientProfile = runtimeInput("schemas/r4/gate-b-core/macos/forme-core-transient-response.sb");
  const recipePath = runtimeInput("schemas/r4/gate-b-core/macos/build-recipe.json");
  const transientContractPath = runtimeInput("schemas/r4/gate-b-core/macos/transient-candidate-contract.json");
  const recipe = runtimeJSON("schemas/r4/gate-b-core/macos/build-recipe.json");
  const transientContract = runtimeJSON("schemas/r4/gate-b-core/macos/transient-candidate-contract.json");
  if (recipe.swiftToolsVersion !== "6.2" || recipe.swiftLanguageMode !== "6" || recipe.runtimeInputSource !== "runner-owned-o-nofollow-hash-pinned-staging" || recipe.worktreeReadsAfterRevalidation !== 0) fail("MACOS_RECIPE_RUNTIME_BINDING_DRIFT", "RED");
  if (transientContract.frozenSyntheticVector?.frameBytes !== MACOS_SYNTHETIC_FRAME_BYTES || transientContract.frozenSyntheticVector?.frameSha256 !== MACOS_SYNTHETIC_FRAME_SHA256 || transientContract.frozenSyntheticVector?.candidateExpiresAt !== MACOS_SYNTHETIC_CANDIDATE_PREIMAGE.expiresAt || typeof transientContract.syntheticBinding?.sessionAuthorityExpiresAt !== "string" || typeof transientContract.syntheticBinding?.interactionExpiresAt !== "string") fail("MACOS_SYNTHETIC_AUTHORITY_CONTRACT_DRIFT", "RED");
  const absoluteAuthorityDeadlineMilliseconds = Math.min(...[transientContract.frozenSyntheticVector.candidateExpiresAt, transientContract.syntheticBinding.sessionAuthorityExpiresAt, transientContract.syntheticBinding.interactionExpiresAt].map((value) => Date.parse(value)));
  if (!Number.isSafeInteger(absoluteAuthorityDeadlineMilliseconds)) fail("MACOS_SYNTHETIC_AUTHORITY_DEADLINE_INVALID", "RED");
  exactObject(recipe.inputHashes, new Set(MACOS_BUILD_INPUT_PATHS), "MACOS_RECIPE_INPUT_SET_DRIFT", "RED");
  const sourceRelativePaths = Object.keys(recipe.inputHashes).filter((name) => /^native\/macos\/Sources\/FormeCoreLocal\/[A-Za-z0-9]+\.swift$/u.test(name)).sort(rawUtf8Sort);
  if (sourceRelativePaths.length !== 9) fail("MACOS_RECIPE_SOURCE_COUNT_DRIFT", "RED");
  for (const relativePath of Object.keys(recipe.inputHashes)) {
    const bytes = runtimeBytes(relativePath);
    try { if (sha256(bytes) !== recipe.inputHashes[relativePath]) fail(`MACOS_RECIPE_INPUT_HASH_DRIFT:${relativePath}`, "RED"); }
    finally { bytes.fill(0); }
  }
  const sourceFiles = sourceRelativePaths.map(runtimeInput);
  const environment = deepFreeze({ HOME: `${root}/isolated-home`, TMPDIR: `${root}/tmp` });
  const internal = (kind, operation, extra = {}) => deepFreeze({ kind, operation, executable: null, argv: [], cwd: root, environment: {}, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 0, stderrLimitBytes: 0, expectedExitCodes: [], outputParser: "internal-closed", ...extra });
  const commandStep = (kind, tool, argv, extra = {}) => deepFreeze({ kind, operation: "spawn-exact", executable: tool, argv, cwd: root, environment, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exit-zero-stderr-zero", ...extra });
  const requirement = `designated => identifier \"org.chaostudio.forme.gate-b.core-local\" and certificate leaf = H\"<OBSERVED_CERT_SHA1>\"`;
  const byKind = {
    preflight: internal("preflight", "revalidate-host-binding-and-owned-root"),
    "write-openssl-config": internal("write-openssl-config", "o-excl-write-fsync", { targetPath: opensslConfig, targetMode: 0o600, exactBytesSha256: sha256(Buffer.from(MACOS_OPENSSL_CONFIG, "utf8")), exactBytes: MACOS_OPENSSL_CONFIG }),
    compile: commandStep("compile", binding.swiftc, ["-sdk", binding.sdkPath, "-target", "arm64-apple-macos26.0", "-swift-version", "6", "-parse-as-library", ...sourceFiles, "-o", `${build}/FormeCoreLocal`], { deadlineMilliseconds: 120_000 }),
    "assemble-bundle": internal("assemble-bundle", "exact-fs-api-bundle-assembly", { infoPlistSourcePath: infoPlist, transientProfileSourcePath: transientProfile }),
    "pre-sign-inventory": internal("pre-sign-inventory", "recursive-inventory-exact-pre-sign"),
    "default-keychain-pre": commandStep("default-keychain-pre", binding.security, ["default-keychain", "-d", "user"]),
    "search-list-pre": commandStep("search-list-pre", binding.security, ["list-keychains", "-d", "user"]),
    "derive-key-certificate": commandStep("derive-key-certificate", binding.openssl, ["req", "-quiet", "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes", "-days", "1", "-config", opensslConfig, "-extensions", "ext", "-keyout", key, "-out", cert], { deadlineMilliseconds: 60_000, ownedOutputs: [{ path: key, type: "file", mode: 0o600, maximumBytes: 1_048_576 }, { path: cert, type: "file", mode: 0o644, maximumBytes: 1_048_576 }], outputModeNormalization: "o-nofollow-fchmod-fsync-identity-stable" }),
    "derive-pkcs12": commandStep("derive-pkcs12", binding.openssl, ["pkcs12", "-export", "-out", p12, "-inkey", key, "-in", cert, "-passout", "pass:<SYNTHETIC_P12_PASSWORD>"], { deadlineMilliseconds: 60_000, ownedOutputs: [{ path: p12, type: "file", mode: 0o600, maximumBytes: 1_048_576 }], outputModeNormalization: "o-nofollow-fchmod-fsync-identity-stable" }),
    "custom-keychain-create": commandStep("custom-keychain-create", binding.security, ["create-keychain", "-p", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "custom-keychain-unlock": commandStep("custom-keychain-unlock", binding.security, ["unlock-keychain", "-p", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "custom-keychain-import": commandStep("custom-keychain-import", binding.security, ["import", p12, "-k", keychain, "-f", "pkcs12", "-P", "<SYNTHETIC_P12_PASSWORD>", "-x", "-T", "/usr/bin/codesign"]),
    "custom-keychain-partition": commandStep("custom-keychain-partition", binding.security, ["set-key-partition-list", "-S", "apple-tool:,apple:", "-s", "-k", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "binding-canary-add": commandStep("binding-canary-add", binding.security, ["add-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", "-w", "<SYNTHETIC_BINDING_CANARY>", keychain]),
    "binding-canary-find": commandStep("binding-canary-find", binding.security, ["find-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", keychain]),
    "identity-inventory": commandStep("identity-inventory", binding.security, ["find-identity", "-v", "-p", "codesigning", keychain]),
    "codesign-sign": commandStep("codesign-sign", binding.codesign, ["--force", "--sign", "<OBSERVED_CERT_SHA1>", "--keychain", keychain, "--options", "runtime", "--timestamp=none", "--entitlements", entitlements, "--requirements", `=${requirement}`, app], { deadlineMilliseconds: 60_000, ownedOutputs: [{ path: `${app}/Contents/_CodeSignature`, type: "directory", mode: 0o755 }, { path: `${app}/Contents/_CodeSignature/CodeResources`, type: "file", mode: 0o644, maximumBytes: 16_777_216 }], outputModeNormalization: "o-nofollow-fchmod-fsync-identity-stable" }),
    "codesign-verify-strict": commandStep("codesign-verify-strict", binding.codesign, ["--verify", "--strict=all", "--verbose=4", app], { stderrLimitBytes: 65_536 }),
    "codesign-entitlements": commandStep("codesign-entitlements", binding.codesign, ["-d", "--entitlements", ":-", app], { stderrLimitBytes: 65_536 }),
    "codesign-designated-requirement": commandStep("codesign-designated-requirement", binding.codesign, ["-d", "--verbose=4", "-r-", app], { stderrLimitBytes: 65_536 }),
    "codesign-test-requirement": commandStep("codesign-test-requirement", binding.codesign, ["-R", `=${requirement}`, app]),
    "post-sign-inventory": internal("post-sign-inventory", "recursive-inventory-exact-post-sign"),
    "helper-spawn": commandStep("helper-spawn", executable, ["--gate-b-core-transient-probe"], { stdinSource: "inherited-candidate-pipe-held-open", deadlineMilliseconds: 902_000, stdoutLimitBytes: 4096, expectedExitCodes: [0, 64, 70], outputParser: "terminal-specific-helper-receipt", startProtocol: MACOS_DIRECT_START_PROTOCOL.helper.implementation, descriptorMap: MACOS_DIRECT_START_PROTOCOL.helper.descriptorMap, targetStdioCount: MACOS_DIRECT_START_PROTOCOL.helper.targetStdioCount, readyFramePattern: MACOS_DIRECT_START_PROTOCOL.helper.readyFramePattern, readyFrameMaximumBytes: MACOS_DIRECT_START_PROTOCOL.helper.readyFrameMaximumBytes, releaseFrame: MACOS_DIRECT_START_PROTOCOL.helper.releaseFrame, releaseRequiresEOF: true }),
    "runtime-identity": commandStep("runtime-identity", binding.lsof, ["-nP", "-a", "-p", "<HELPER_PID>", "-d", "txt", "-Fn"], { stdoutLimitBytes: 65_536, outputParser: "exact-live-pid-executable-path" }),
    "pre-body-network-sample": commandStep("pre-body-network-sample", binding.lsof, ["-nP", "-a", "-p", "<HELPER_PID>", "-iTCP", "-iUDP"], { stdoutLimitBytes: 65_536 }),
    "feeder-spawn": commandStep("feeder-spawn", binding.node, [runtimeInput("fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs"), "3", "4", "5", "6", "complete"], { stdoutLimitBytes: 0, startProtocol: MACOS_DIRECT_START_PROTOCOL.feeder.implementation, descriptorMap: MACOS_DIRECT_START_PROTOCOL.feeder.descriptorMap, targetStdioCount: MACOS_DIRECT_START_PROTOCOL.feeder.targetStdioCount, readyFramePattern: MACOS_DIRECT_START_PROTOCOL.feeder.readyFramePattern, readyFrameMaximumBytes: MACOS_DIRECT_START_PROTOCOL.feeder.readyFrameMaximumBytes, releaseFrame: MACOS_DIRECT_START_PROTOCOL.feeder.releaseFrame, releaseRequiresEOF: true }),
    "eof-commit-gate": internal("eof-commit-gate", "validate-completion-marker-and-feeder-zero-then-close-guard-fd"),
    "helper-receipt": internal("helper-receipt", "validate-canonical-raw-receipt-frame", { deadlineMilliseconds: 902_000, stdoutLimitBytes: 4096 }),
    "binding-canary-delete": commandStep("binding-canary-delete", binding.security, ["delete-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", keychain]),
    "identity-delete": commandStep("identity-delete", binding.security, ["delete-identity", "-Z", "<OBSERVED_CERT_SHA1>", keychain]),
    "custom-keychain-lock": commandStep("custom-keychain-lock", binding.security, ["lock-keychain", keychain]),
    "custom-keychain-delete": commandStep("custom-keychain-delete", binding.security, ["delete-keychain", keychain]),
    "default-keychain-post": commandStep("default-keychain-post", binding.security, ["default-keychain", "-d", "user"]),
    "search-list-post": commandStep("search-list-post", binding.security, ["list-keychains", "-d", "user"]),
    cleanup: internal("cleanup", "journal-bound-idempotent-cleanup"),
    "absence-proof": internal("absence-proof", "owned-resource-and-process-absence-proof"),
  };
  const steps = MACOS_PLAN_ORDER.map((kind, ordinal) => deepFreeze({ ordinal: ordinal + 1, ...byKind[kind] }));
  const recipeBytes = runtimeBytes("schemas/r4/gate-b-core/macos/build-recipe.json");
  let buildRecipeSha256;
  try { buildRecipeSha256 = sha256(recipeBytes); } finally { recipeBytes.fill(0); }
  return deepFreeze({ schemaVersion: "r4.gate-b-core.macos-physical-plan.v1", manifestSha256, runId, runRoot: root, runtimeSourceRoot, runtimeInputReadMode: readRuntimeFile === undefined ? "construction-direct-closed-file" : "injected-o-nofollow-identity-hash-pinned", buildRecipeSha256, sourceInputAggregateSha256: sha256(Buffer.from(canonicalJson(recipe.inputHashes), "utf8")), opensslConfigSha256: sha256(Buffer.from(MACOS_OPENSSL_CONFIG, "utf8")), directStartProtocol: MACOS_DIRECT_START_PROTOCOL, steps, securityCliInvocations: 15, codesignCliInvocations: 5, opensslCliInvocations: 2, customTemporaryKeychainOperations: 12, securityLifecycleSubcommands: 10, identityInventoryReads: 1, signingPrivateKeyUses: 1, defaultKeychainMetadataReads: 2, searchListMetadataReads: 2, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateMaximumBytes: 32768, syntheticCandidateFrameBytes: MACOS_SYNTHETIC_FRAME_BYTES, syntheticCandidateFrameSha256: MACOS_SYNTHETIC_FRAME_SHA256, absoluteAuthorityDeadlineMilliseconds, authorityDeadlineInputs: { candidateExpiresAt: transientContract.frozenSyntheticVector.candidateExpiresAt, sessionExpiresAt: transientContract.syntheticBinding.sessionAuthorityExpiresAt, interactionExpiresAt: transientContract.syntheticBinding.interactionExpiresAt, helperStartCeilingMilliseconds: 900_000 }, localAuthenticationCeremoniesMaximum: 1, handoffsMaximum: 1 });
}

export async function runFakePlan(plan, executor, { faultAfter = null, faultWindow = "after" } = {}) {
  if (!plan || !Array.isArray(plan.steps) || !executor || executor.mode !== "construction_fake" || typeof executor.execute !== "function" || typeof executor.cleanup !== "function") fail("FAKE_PLAN_EXECUTOR_INVALID");
  if (!['before', 'after'].includes(faultWindow)) fail("FAKE_PLAN_FAULT_WINDOW_INVALID");
  let completed = 0;
  let injected = false;
  try {
    for (const step of plan.steps) {
      if (faultAfter === completed + 1 && faultWindow === "before") { injected = true; throw new PhysicalPortError("INJECTED_FAULT"); }
      await executor.execute(step);
      completed += 1;
      if (faultAfter === completed && faultWindow === "after") { injected = true; throw new PhysicalPortError("INJECTED_FAULT"); }
    }
    return deepFreeze({ completed, injectedFault: false, physicalEffects: 0 });
  } catch (error) {
    if (!(error instanceof PhysicalPortError) || error.code !== "INJECTED_FAULT") throw error;
    return deepFreeze({ completed, injectedFault: injected, physicalEffects: 0 });
  } finally {
    const cleaned = await executor.cleanup();
    if (cleaned !== true) fail("FAKE_PLAN_CLEANUP_FAILED");
  }
}
export function createStatefulConstructionEffectExecutor(lane) {
  if (!new Set(["postgres", "macos"]).has(lane)) fail("STATEFUL_FAKE_LANE_INVALID");
  const resources = new Set();
  const markers = [];
  let cleanupCalls = 0;
  const addFor = (step) => {
    if (lane === "postgres") {
      if (["volume-create"].includes(step.kind)) resources.add("postgres-volume");
      if (["container-create", "container-start"].includes(step.kind)) resources.add("postgres-container");
      if (step.operation === "read-committed-overlap-controller") { resources.add("postgres-controller-workers-observer"); resources.delete("postgres-controller-workers-observer"); }
      if (step.kind === "container-name-absence") resources.delete("postgres-container");
      if (step.kind === "volume-name-absence") resources.delete("postgres-volume");
      if (step.kind === "postgres-absence-proof" && [...resources].some((resource) => resource.startsWith("postgres-"))) fail("POSTGRES_STATEFUL_FAKE_PROOF_WITH_RESIDUE");
    } else {
      if (step.kind === "compile") resources.add("macos-build-output");
      if (step.kind === "assemble-bundle") resources.add("macos-app-bundle");
      if (step.kind === "custom-keychain-create") resources.add("macos-custom-keychain");
      if (step.kind === "custom-keychain-import") resources.add("macos-signing-identity");
      if (step.kind === "binding-canary-add") resources.add("macos-binding-canary");
      if (step.kind === "helper-spawn") resources.add("macos-helper-group");
      if (step.kind === "feeder-spawn") resources.add("macos-feeder-group");
      if (step.kind === "binding-canary-delete") resources.delete("macos-binding-canary");
      if (step.kind === "identity-delete") resources.delete("macos-signing-identity");
      if (step.kind === "custom-keychain-delete") resources.delete("macos-custom-keychain");
      if (step.kind === "helper-receipt") { resources.delete("macos-helper-group"); resources.delete("macos-feeder-group"); }
      if (step.kind === "cleanup") resources.clear();
    }
  };
  return Object.freeze({
    mode: "construction_fake",
    get cleanupCalls() { return cleanupCalls; },
    get residueCount() { return resources.size; },
    get markerCount() { return markers.length; },
    async execute(step) { if (!step || typeof step.kind !== "string") fail("STATEFUL_FAKE_STEP_INVALID"); markers.push(`intent:${step.kind}`); addFor(step); markers.push(`observed:${step.kind}`); },
    async cleanup() { cleanupCalls += 1; resources.clear(); markers.push("cleanup:observed-absent"); return resources.size === 0; },
  });
}
export const MACOS_JOURNAL_FAULT_WINDOWS = Object.freeze(["after-intent-before-effect", "after-effect-before-observation", "after-observation"]);
export const MACOS_FAKE_CLEANUP_ORDER = Object.freeze([
  "macos-feeder-control-pipe", "macos-helper-stdin-guard", "macos-helper-receipt-pipe", "macos-feeder-group", "macos-helper-group",
  "macos-binding-canary", "macos-signing-identity", "macos-custom-keychain", "macos-openssl-config", "macos-private-key",
  "macos-certificate", "macos-certificate-der", "macos-pkcs12", "macos-app-bundle", "macos-build-output",
]);
function mutateMacOSFakeResources(resources, kind, observed) {
  const add = (...names) => { for (const name of names) resources.add(name); };
  const remove = (...names) => { for (const name of names) resources.delete(name); };
  if (kind === "write-openssl-config") add("macos-openssl-config");
  if (kind === "compile") add("macos-build-output");
  if (kind === "assemble-bundle") add("macos-app-bundle");
  if (kind === "derive-key-certificate") add("macos-private-key", "macos-certificate", "macos-certificate-der");
  if (kind === "derive-pkcs12") add("macos-pkcs12");
  if (kind === "custom-keychain-create") add("macos-custom-keychain");
  if (kind === "custom-keychain-import") add("macos-signing-identity");
  if (kind === "binding-canary-add") add("macos-binding-canary");
  if (kind === "helper-spawn") add("macos-helper-group", "macos-helper-stdin-guard", "macos-helper-receipt-pipe");
  if (kind === "feeder-spawn") add("macos-feeder-group", "macos-feeder-control-pipe");
  if (!observed) return;
  if (kind === "eof-commit-gate") remove("macos-helper-stdin-guard");
  if (kind === "helper-receipt") remove("macos-feeder-control-pipe", "macos-feeder-group", "macos-helper-receipt-pipe", "macos-helper-group");
  if (kind === "binding-canary-delete") remove("macos-binding-canary");
  if (kind === "identity-delete") remove("macos-signing-identity");
  if (kind === "custom-keychain-delete") remove("macos-custom-keychain");
  if (kind === "cleanup") remove(...MACOS_FAKE_CLEANUP_ORDER);
}
export function createJournaledMacOSConstructionEffectExecutor(recoveryJournal = []) {
  if (!Array.isArray(recoveryJournal) || recoveryJournal.some((entry) => typeof entry !== "string" || entry.length > 256)) fail("MACOS_FAKE_RECOVERY_JOURNAL_INVALID");
  const resources = new Set();
  const journal = [...recoveryJournal];
  let cleanupCalls = 0;
  let effectCount = 0;
  for (const marker of recoveryJournal) {
    const intent = /^intent:(.+)$/u.exec(marker);
    const observed = /^observed:(.+)$/u.exec(marker);
    const removed = /^cleanup:removed:(.+)$/u.exec(marker);
    if (intent) mutateMacOSFakeResources(resources, intent[1], false);
    if (observed) mutateMacOSFakeResources(resources, observed[1], true);
    if (removed) resources.delete(removed[1]);
  }
  return Object.freeze({
    mode: "construction_fake",
    get cleanupCalls() { return cleanupCalls; },
    get effectCount() { return effectCount; },
    get residueCount() { return resources.size; },
    get journal() { return Object.freeze([...journal]); },
    get residues() { return Object.freeze([...resources].sort(rawUtf8Sort)); },
    async writeIntent(step) {
      if (!step || typeof step.kind !== "string") fail("MACOS_FAKE_STEP_INVALID");
      journal.push(`intent:${step.kind}`);
    },
    async applyEffect(step) {
      if (!step || typeof step.kind !== "string") fail("MACOS_FAKE_STEP_INVALID");
      effectCount += 1;
      mutateMacOSFakeResources(resources, step.kind, false);
      if (step.kind === "cleanup") for (const name of MACOS_FAKE_CLEANUP_ORDER) resources.delete(name);
      journal.push(`effect:${step.kind}`);
    },
    async writeObservation(step) {
      if (!step || typeof step.kind !== "string") fail("MACOS_FAKE_STEP_INVALID");
      mutateMacOSFakeResources(resources, step.kind, true);
      if (step.kind === "absence-proof" && resources.size !== 0) fail("MACOS_FAKE_ABSENCE_PROOF_FAILED");
      journal.push(`observed:${step.kind}`);
    },
    async cleanup() {
      cleanupCalls += 1;
      for (const name of MACOS_FAKE_CLEANUP_ORDER) {
        const existed = resources.delete(name);
        journal.push(`cleanup:${existed ? "removed" : "absent"}:${name}`);
      }
      if (resources.size !== 0) fail("MACOS_FAKE_UNKNOWN_RESIDUE");
      journal.push("cleanup:observed-absent");
      return true;
    },
  });
}
export async function runJournaledMacOSFakePlan(plan, executor, { faultStep = null, faultWindow = "after-observation" } = {}) {
  if (!plan || !Array.isArray(plan.steps) || !executor || executor.mode !== "construction_fake" || typeof executor.writeIntent !== "function" || typeof executor.applyEffect !== "function" || typeof executor.writeObservation !== "function" || typeof executor.cleanup !== "function") fail("MACOS_FAKE_PLAN_EXECUTOR_INVALID");
  if (!MACOS_JOURNAL_FAULT_WINDOWS.includes(faultWindow) || (faultStep !== null && (!Number.isInteger(faultStep) || faultStep < 1 || faultStep > plan.steps.length))) fail("MACOS_FAKE_PLAN_FAULT_INVALID");
  let completed = 0;
  let injected = false;
  let unexpected = null;
  let journalBeforeCleanup = [];
  try {
    for (const step of plan.steps) {
      await executor.writeIntent(step);
      if (faultStep === step.ordinal && faultWindow === "after-intent-before-effect") { injected = true; throw new PhysicalPortError("INJECTED_MACOS_FAULT"); }
      await executor.applyEffect(step);
      if (faultStep === step.ordinal && faultWindow === "after-effect-before-observation") { injected = true; throw new PhysicalPortError("INJECTED_MACOS_FAULT"); }
      await executor.writeObservation(step);
      completed += 1;
      if (faultStep === step.ordinal && faultWindow === "after-observation") { injected = true; throw new PhysicalPortError("INJECTED_MACOS_FAULT"); }
    }
  } catch (error) {
    if (!(error instanceof PhysicalPortError) || error.code !== "INJECTED_MACOS_FAULT") unexpected = error;
  } finally {
    journalBeforeCleanup = [...executor.journal];
    if (await executor.cleanup() !== true) fail("MACOS_FAKE_PLAN_CLEANUP_FAILED");
  }
  if (unexpected !== null) throw unexpected;
  return deepFreeze({ completed, injectedFault: injected, faultStep, faultWindow, journalBeforeCleanup, cleanupCalls: executor.cleanupCalls, residueCount: executor.residueCount, physicalEffects: 0 });
}
export async function orchestrateConstructionFakeLanes(ports) {
  exactObject(ports, new Set(["postgres", "codex", "macos", "cleanup"]), "UNIFIED_FAKE_PORT_SHAPE");
  for (const key of ["postgres", "codex", "macos"]) if (ports[key]?.mode !== "construction_fake" || typeof ports[key].run !== "function") fail("UNIFIED_FAKE_LANE_PORT_INVALID");
  if (ports.cleanup?.mode !== "construction_fake" || typeof ports.cleanup.run !== "function") fail("UNIFIED_FAKE_CLEANUP_PORT_INVALID");
  const order = [];
  const results = {};
  let terminal = null;
  try {
    for (const lane of ["postgres", "codex", "macos"]) {
      if (terminal !== null) break;
      order.push(lane);
      const result = await ports[lane].run();
      if (result === null || typeof result !== "object" || !["GREEN", "YELLOW", "RED"].includes(result.verdict)) fail("UNIFIED_FAKE_LANE_RESULT_INVALID");
      results[lane] = result;
      if (result.verdict === "RED" || result.stopLaterLanes === true) terminal = lane;
    }
  } finally {
    order.push("cleanup");
    const cleaned = await ports.cleanup.run();
    if (cleaned !== true) fail("UNIFIED_FAKE_CLEANUP_FAILED");
  }
  order.push("evidence", "stop");
  return deepFreeze({ order, results, terminalLane: terminal, cleanupPassed: true, aggregateVerdict: terminal === null ? "YELLOW" : "RED", physicalEffects: 0 });
}

const codexExpectedReasonCode = (caseId, faultClass) => {
  if (faultClass === "CLEAN") return "CLEAN";
  if (faultClass === "COMMAND_MUTATION") return "CODEX_LOGICAL_COMMAND_DENIED";
  if (faultClass === "SPAWN_REJECTION") return `CORE_SHARED_SPAWN_REJECTED:${caseId.endsWith("slot-1") ? 1 : 4}`;
  if (["STDERR", "NONZERO", "OVERSIZE", "TIMEOUT_TERM", "TIMEOUT_KILL", "EXIT_GRACE_TERM", "EXIT_GRACE_KILL"].includes(faultClass)) return "CODEX_CHILD_EXECUTION_FAILED";
  if (["GROUP_EPERM", "GROUP_UNKNOWN"].includes(faultClass)) return "CODEX_SERVER_REQUEST_DENIED";
  if (faultClass === "STDIN_EPIPE") return "EPIPE";
  if (["DESCENDANT_TERM", "DESCENDANT_KILL"].includes(faultClass)) return "SYNTHETIC_DESCENDANT_GROUP_CLEANED";
  if (faultClass === "EVIDENCE_SCHEMA") return "EVIDENCE_SCHEMA_REJECTED";
  if (faultClass === "JOURNAL_INPUT_CANARY") return "CORE_SHARED_JOURNAL_INPUT_INVALID";
  if (faultClass === "WRITE_BOUNDARY") return caseId === "isolated-home-write-escape" ? "CODEX_HOME_WRITESET_ESCAPE" : "CODEX_PRIVATE_WRITE_DENIED";
  if (faultClass === "SCHEMA_POSTRUN") return "CODEX_SCHEMA_INVENTORY_DRIFT";
  if (faultClass === "SCHEMA_PREFLIGHT") {
    if (caseId === "schema-dialect") return "CODEX_SCHEMA_DIALECT_DENIED";
    if (caseId === "schema-ref-closure") return "CODEX_SCHEMA_REFERENCE_MISSING";
    if (caseId === "schema-selected-hash") return "CODEX_SELECTED_SCHEMA_DRIFT";
    return "CODEX_SCHEMA_INVENTORY_DRIFT";
  }
  if (faultClass === "WIRE_POST_SECOND_WRITE") return "CODEX_WIRE_BYTES_AFTER_SECOND_WRITE";
  if (faultClass === "WIRE_SAME_CHUNK") {
    if (caseId === "wire-response-partial-same-chunk") return "CODEX_WIRE_PARTIAL_AFTER_RESPONSE";
    return "CODEX_WIRE_AFTER_RESPONSE_DENIED";
  }
  if (faultClass === "WIRE_PRE_RESPONSE") {
    if (caseId === "wire-server-request-before-response") return "CODEX_SERVER_REQUEST_DENIED";
    if (["wire-unknown-notification-before-response", "wire-duplicate-notification"].includes(caseId)) return "CODEX_SERVER_NOTIFICATION_DENIED";
    if (caseId === "wire-invalid-result") return "CODEX_INITIALIZE_RESPONSE_INVALID";
    if (caseId === "wire-malformed") return "CODEX_WIRE_JSON_INVALID";
    if (caseId === "wire-oversize-line") return "CODEX_WIRE_LINE_TOO_LARGE";
    if (caseId === "wire-trailing-buffer") return "CODEX_CHILD_PROTOCOL_INCOMPLETE";
  }
  if (faultClass === "JOURNAL_MARKER_FAULT") {
    const match = /^journal-(intent|started|terminal)-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
    if (match !== null) return `CORE_SHARED_JOURNAL_FAULT_${match[3].toUpperCase()}:${match[1]}:${match[2]}`;
  }
  if (faultClass === "CLEANUP_MARKER_FAULT") {
    const match = /^journal-cleanup-observed-absent-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
    if (match !== null) return `CORE_SHARED_JOURNAL_FAULT_${match[2].toUpperCase()}:cleanup-observed-absent:${match[1]}`;
  }
  fail(`CODEX_SHARED_CASE_REASON_UNMAPPED:${caseId}`);
};

const codexExpectedTimerScheduleMilliseconds = (caseId, faultClass, expectedProcessGroupsStarted, minimumClientWrites) => {
  const deadlines = [5_000, 5_000, 30_000, 10_000];
  let releasedCount = expectedProcessGroupsStarted;
  if (faultClass === "JOURNAL_MARKER_FAULT") {
    const match = /^journal-(intent|started|terminal)-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
    if (match === null) fail(`CODEX_SHARED_CASE_TIMER_UNMAPPED:${caseId}`);
    const index = ["version", "help", "schema", "initialize"].indexOf(match[2]);
    releasedCount = index + Number(match[1] === "terminal");
  }
  if (faultClass === "CLEANUP_MARKER_FAULT") {
    const match = /^journal-cleanup-observed-absent-(version|help|schema|initialize)-(before|after)$/u.exec(caseId);
    if (match === null) fail(`CODEX_SHARED_CASE_TIMER_UNMAPPED:${caseId}`);
    releasedCount = ["version", "help", "schema", "initialize"].indexOf(match[1]) + 1;
  }
  const schedule = deadlines.slice(0, Math.min(releasedCount, 3));
  if (releasedCount >= 4) {
    // A valid initialize response schedules the independent exit-grace timer
    // in the same serialized turn as the exact second write, before the
    // command's overall deadline is scheduled by the caller.
    if (minimumClientWrites === 2) schedule.push(2_000);
    schedule.push(deadlines[3]);
  }
  if (["OVERSIZE", "TIMEOUT_TERM", "EXIT_GRACE_TERM", "STDIN_EPIPE", "WIRE_SAME_CHUNK", "WIRE_POST_SECOND_WRITE"].includes(faultClass)) schedule.push(2_000);
  if (faultClass === "WIRE_PRE_RESPONSE" && caseId !== "wire-trailing-buffer") schedule.push(2_000);
  if (["TIMEOUT_KILL", "EXIT_GRACE_KILL", "GROUP_EPERM", "GROUP_UNKNOWN"].includes(faultClass)) schedule.push(2_000, 2_000);
  return Object.freeze(schedule);
};

const codexCase = (caseId, faultClass, expectedStartSlotsConsumed, expectedProcessGroupsStarted, {
  minimumClientWrites = 0,
  maximumClientWrites = 0,
  expectedTermSignals = 0,
  expectedKillSignals = 0,
  expectedJournalFault = false,
  expectedAllProcessGroupsAbsent = true,
  expectedTerminalClass = "CONTROLLED_FAILURE",
  expectedStdinErrors = 0,
  expectedEpermObservations = 0,
  expectedUnknownAbsenceObservations = 0,
  expectedEsrchObservations = Math.max(0, expectedProcessGroupsStarted - expectedEpermObservations - expectedUnknownAbsenceObservations),
  expectedDescendantsStarted = 0,
  expectedMutationBeforeSpawnRejected = false,
  expectedEvidenceSchemaRejection = false,
  expectedJournalInputRejection = false,
  expectedJournalRecordCount = expectedProcessGroupsStarted * 3,
  expectedPortCleanupCalls = 2,
  expectedIdempotenceCleanupCalls = 1,
  expectedQuarantineCleanupCalls = 0,
  expectedReleaseOrdering = expectedProcessGroupsStarted > 0 ? true : null,
  commandKind = null,
  mutationMode = null,
} = {}) => deepFreeze({
  caseId,
  faultClass,
  expectedStartSlotsConsumed,
  expectedProcessGroupsStarted,
  minimumClientWrites,
  maximumClientWrites,
  expectedTermSignals,
  expectedKillSignals,
  expectedJournalFault,
  expectedAllProcessGroupsAbsent,
  expectedTerminalClass,
  expectedStdinErrors,
  expectedEpermObservations,
  expectedUnknownAbsenceObservations,
  expectedEsrchObservations,
  expectedDescendantsStarted,
  expectedMutationBeforeSpawnRejected,
  expectedEvidenceSchemaRejection,
  expectedJournalInputRejection,
  expectedJournalRecordCount,
  expectedPortCleanupCalls,
  expectedIdempotenceCleanupCalls,
  expectedQuarantineCleanupCalls,
  expectedReleaseOrdering,
  expectedReasonCode: codexExpectedReasonCode(caseId, faultClass),
  expectedTimerScheduleMilliseconds: codexExpectedTimerScheduleMilliseconds(caseId, faultClass, expectedProcessGroupsStarted, minimumClientWrites),
  commandKind,
  mutationMode,
});

const codexJournalFaultCases = CODEX_PROCESS_KINDS.flatMap((kind, index) => ["intent", "started", "terminal"].flatMap((marker) => ["before", "after"].map((side) => {
  const currentStarted = marker === "intent" ? 0 : 1;
  const committedCurrentRecords = marker === "intent"
    ? Number(side === "after")
    : marker === "started"
      ? 1 + Number(side === "after")
      : 2 + Number(side === "after");
  return codexCase(
    `journal-${marker}-${kind}-${side}`,
    "JOURNAL_MARKER_FAULT",
    index + currentStarted,
    index + currentStarted,
    {
      minimumClientWrites: kind === "initialize" && marker === "terminal" ? 2 : 0,
      maximumClientWrites: kind === "initialize" && marker === "terminal" ? 2 : 0,
      expectedJournalFault: true,
      expectedJournalRecordCount: index * 3 + committedCurrentRecords + Number(marker === "started" || (marker === "terminal" && side === "before")),
    },
  );
})));

const codexCleanupJournalFaultCases = CODEX_PROCESS_KINDS.flatMap((kind, index) => ["before", "after"].map((side) => codexCase(
  `journal-cleanup-observed-absent-${kind}-${side}`,
  "CLEANUP_MARKER_FAULT",
  index + 1,
  index + 1,
  {
    minimumClientWrites: kind === "initialize" ? 2 : 0,
    maximumClientWrites: kind === "initialize" ? 2 : 0,
    expectedJournalFault: true,
    expectedJournalRecordCount: index * 3 + 4,
    expectedTerminalClass: "YELLOW_QUARANTINED_CLEANED",
    expectedUnknownAbsenceObservations: 1,
    expectedEsrchObservations: index + 1,
    expectedPortCleanupCalls: 2,
    expectedIdempotenceCleanupCalls: 0,
    expectedQuarantineCleanupCalls: 2,
  },
)));

/**
 * Closed, body-free case catalog for the injected construction executor which
 * exercises the same Codex process orchestration used by the future physical
 * port.  The catalog contains no argv, environment, path, wire body, schema
 * body, PID or host identity.  A caller supplies one temp-root-bounded fake
 * case executor; this module validates every returned counter before the
 * aggregate construction matrix can become Green.
 */
export const CODEX_SHARED_ORCHESTRATION_FAULT_CASES = deepFreeze([
  codexCase("clean-notification-before-response-four-start", "CLEAN", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTerminalClass: "CLEAN" }),

  codexCase("logical-argv-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "argv-extra" }),
  codexCase("logical-argv-missing-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "argv-missing" }),
  codexCase("logical-argv-reordered-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "schema", mutationMode: "argv-reordered" }),
  codexCase("logical-version-tail-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "argv-value" }),
  codexCase("logical-help-tail-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "help", mutationMode: "argv-value" }),
  codexCase("logical-schema-tail-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "schema", mutationMode: "argv-value" }),
  codexCase("logical-initialize-tail-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "initialize", mutationMode: "argv-value" }),
  codexCase("logical-environment-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "env-extra" }),
  codexCase("logical-environment-missing-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "env-missing" }),
  codexCase("logical-environment-value-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "env-value" }),
  codexCase("logical-cwd-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "cwd" }),
  codexCase("logical-deadline-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "deadline" }),
  codexCase("logical-output-ceiling-mutation-before-start", "COMMAND_MUTATION", 0, 0, { expectedMutationBeforeSpawnRejected: true, commandKind: "version", mutationMode: "output-ceiling" }),
  codexCase("spawn-call-rejected-slot-1", "SPAWN_REJECTION", 1, 0, { expectedJournalRecordCount: 1 }),
  codexCase("spawn-call-rejected-slot-4", "SPAWN_REJECTION", 4, 3, { expectedJournalRecordCount: 10 }),

  codexCase("start-1-stderr", "STDERR", 1, 1),
  codexCase("start-2-nonzero", "NONZERO", 2, 2),
  codexCase("start-3-oversize", "OVERSIZE", 3, 3, { expectedTermSignals: 1 }),
  codexCase("start-4-timeout-term", "TIMEOUT_TERM", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("start-4-timeout-kill", "TIMEOUT_KILL", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1, expectedKillSignals: 1 }),
  codexCase("start-4-response-then-hang-term", "EXIT_GRACE_TERM", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1 }),
  codexCase("start-4-response-then-hang-kill", "EXIT_GRACE_KILL", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1, expectedKillSignals: 1 }),
  codexCase("start-4-stdin-epipe-before-response", "STDIN_EPIPE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1, expectedStdinErrors: 1 }),
  codexCase("start-4-stdin-epipe-second-write", "STDIN_EPIPE", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1, expectedStdinErrors: 1 }),
  codexCase("start-4-group-eperm-then-esrch", "GROUP_EPERM", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 2, expectedKillSignals: 1, expectedTerminalClass: "YELLOW_QUARANTINED_CLEANED", expectedEpermObservations: 1, expectedEsrchObservations: 4, expectedJournalRecordCount: 13, expectedPortCleanupCalls: 1, expectedIdempotenceCleanupCalls: 0, expectedQuarantineCleanupCalls: 1 }),
  codexCase("start-4-group-eperm-persistent", "GROUP_EPERM", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 2, expectedKillSignals: 2, expectedAllProcessGroupsAbsent: false, expectedTerminalClass: "RED_QUARANTINED", expectedEpermObservations: 2, expectedEsrchObservations: 3, expectedPortCleanupCalls: 1, expectedIdempotenceCleanupCalls: 0, expectedQuarantineCleanupCalls: 1 }),
  codexCase("start-4-group-unknown-then-esrch", "GROUP_UNKNOWN", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 2, expectedKillSignals: 1, expectedTerminalClass: "YELLOW_QUARANTINED_CLEANED", expectedUnknownAbsenceObservations: 1, expectedEsrchObservations: 4, expectedJournalRecordCount: 13, expectedPortCleanupCalls: 1, expectedIdempotenceCleanupCalls: 0, expectedQuarantineCleanupCalls: 1 }),
  codexCase("start-4-group-unknown-persistent", "GROUP_UNKNOWN", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 2, expectedKillSignals: 2, expectedAllProcessGroupsAbsent: false, expectedTerminalClass: "RED_QUARANTINED", expectedUnknownAbsenceObservations: 2, expectedEsrchObservations: 3, expectedPortCleanupCalls: 1, expectedIdempotenceCleanupCalls: 0, expectedQuarantineCleanupCalls: 1 }),
  codexCase("start-4-adversarial-descendant-term", "DESCENDANT_TERM", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1, expectedDescendantsStarted: 1 }),
  codexCase("start-4-adversarial-descendant-kill", "DESCENDANT_KILL", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1, expectedKillSignals: 1, expectedDescendantsStarted: 1 }),

  codexCase("wire-server-request-before-response", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-unknown-notification-before-response", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-duplicate-notification", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-invalid-result", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-response-full-line-same-chunk", "WIRE_SAME_CHUNK", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-response-partial-same-chunk", "WIRE_SAME_CHUNK", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-response-unknown-next-chunk", "WIRE_POST_SECOND_WRITE", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedTermSignals: 1 }),
  codexCase("wire-notification-after-response", "WIRE_SAME_CHUNK", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-duplicate-response", "WIRE_SAME_CHUNK", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-malformed", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-oversize-line", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1, expectedTermSignals: 1 }),
  codexCase("wire-trailing-buffer", "WIRE_PRE_RESPONSE", 4, 4, { minimumClientWrites: 1, maximumClientWrites: 1 }),

  codexCase("schema-missing", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-extra", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-nested", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-dialect", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-ref-closure", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-selected-hash", "SCHEMA_PREFLIGHT", 3, 3),
  codexCase("schema-toctou-after-initialize", "SCHEMA_POSTRUN", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2 }),
  codexCase("isolated-home-write-escape", "WRITE_BOUNDARY", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2 }),
  codexCase("private-canary-detected", "WRITE_BOUNDARY", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2 }),
  codexCase("evidence-schema-extra-field-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-schema-required-field-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-schema-wrong-type-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-schema-wrong-enum-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-body-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-path-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-pid-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-wire-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-argv-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-env-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-schema-body-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-private-inventory-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),
  codexCase("evidence-stable-identity-canary-rejected", "EVIDENCE_SCHEMA", 4, 4, { minimumClientWrites: 2, maximumClientWrites: 2, expectedEvidenceSchemaRejection: true }),

  codexCase("journal-input-body-canary-rejected", "JOURNAL_INPUT_CANARY", 0, 0, { expectedJournalRecordCount: 0, expectedJournalInputRejection: true }),
  codexCase("journal-input-path-canary-rejected", "JOURNAL_INPUT_CANARY", 0, 0, { expectedJournalRecordCount: 0, expectedJournalInputRejection: true }),
  codexCase("journal-input-stable-identity-canary-rejected", "JOURNAL_INPUT_CANARY", 0, 0, { expectedJournalRecordCount: 0, expectedJournalInputRejection: true }),

  ...codexJournalFaultCases,
  ...codexCleanupJournalFaultCases,
]);

const CODEX_SHARED_RESULT_KEYS = new Set([
  "caseId", "terminalClass", "processStartSlotsConsumed", "processGroupsStarted", "clientWrites",
  "termSignals", "killSignals", "stdinErrors", "esrchObservations", "epermObservations", "unknownAbsenceObservations", "syntheticDescendantsStarted", "timerScheduleMilliseconds", "initializedEndBeforeExitGraceTimerProven",
  "journalFaultObserved", "journalRecordCount", "journalAggregateSha256", "journalChainValid",
  "effectReleaseAfterStartedFsync", "logicalCleanupObligationRetained", "logicalAllProcessGroupsAbsent", "syntheticChildHandlesClosedAtReturn", "cleanupCalls", "portCleanupCalls", "idempotenceCleanupCalls", "quarantineCleanupCalls",
  "residueCount", "injectedFaultObserved", "observedReasonCode", "logicalCommandBoundaryProven", "mutationBeforeSpawnRejected", "inMemoryFakeExecutorBoundaryProven", "inMemoryFakeWrapperSubstitutionProven", "clientWriteBytesValidated", "evidenceSchemaRejectionObserved", "journalInputShapeValidated", "journalInputRejectionObserved", "stdioCloseBeforeSignalProven", "ownedStdioClosedBeforeReturn", "noWritesAfterStdioClose", "ownedBufferZeroizationPassed", "fakeEmitterBufferZeroizationPassed",
  "bodyBytesExposed", "privatePathFields", "stableIdentityFields", "realCodexCalls", "sandboxExecCalls", "threadStarts", "turnStarts",
  "providerCalls", "providerBytes", "networkAuthority", "networkTransmittedBytes", "retryStarts", "fifthStarts", "alternateExecutableStarts",
]);

function validateCodexSharedCaseResult(spec, result) {
  exactObject(result, CODEX_SHARED_RESULT_KEYS, "CODEX_SHARED_CASE_RESULT_SHAPE");
  if (result.caseId !== spec.caseId || result.terminalClass !== spec.expectedTerminalClass) fail(`CODEX_SHARED_CASE_TERMINAL_DRIFT:${spec.caseId}`);
  if (result.processStartSlotsConsumed !== spec.expectedStartSlotsConsumed || result.processGroupsStarted !== spec.expectedProcessGroupsStarted) fail(`CODEX_SHARED_CASE_START_DRIFT:${spec.caseId}`);
  if (!Number.isInteger(result.clientWrites) || result.clientWrites < spec.minimumClientWrites || result.clientWrites > spec.maximumClientWrites) fail(`CODEX_SHARED_CASE_WRITE_DRIFT:${spec.caseId}`);
  if (result.termSignals !== spec.expectedTermSignals || result.killSignals !== spec.expectedKillSignals || result.journalFaultObserved !== spec.expectedJournalFault) fail(`CODEX_SHARED_CASE_FAULT_DRIFT:${spec.caseId}`);
  if (result.stdinErrors !== spec.expectedStdinErrors || result.esrchObservations !== spec.expectedEsrchObservations || result.epermObservations !== spec.expectedEpermObservations || result.unknownAbsenceObservations !== spec.expectedUnknownAbsenceObservations || result.syntheticDescendantsStarted !== spec.expectedDescendantsStarted) fail(`CODEX_SHARED_CASE_FAULT_OBSERVATION_DRIFT:${spec.caseId}`);
  if (canonicalJson(result.timerScheduleMilliseconds) !== canonicalJson(spec.expectedTimerScheduleMilliseconds) || result.initializedEndBeforeExitGraceTimerProven !== true) fail(`CODEX_SHARED_CASE_TIMER_DRIFT:${spec.caseId}`);
  if (result.journalRecordCount !== spec.expectedJournalRecordCount || !SHA.test(result.journalAggregateSha256) || result.journalChainValid !== true || result.effectReleaseAfterStartedFsync !== spec.expectedReleaseOrdering || result.logicalCleanupObligationRetained !== !spec.expectedAllProcessGroupsAbsent) fail(`CODEX_SHARED_CASE_JOURNAL_DRIFT:${spec.caseId}`);
  if (result.logicalAllProcessGroupsAbsent !== spec.expectedAllProcessGroupsAbsent || result.syntheticChildHandlesClosedAtReturn !== true || result.cleanupCalls !== spec.expectedPortCleanupCalls || result.portCleanupCalls !== spec.expectedPortCleanupCalls || result.idempotenceCleanupCalls !== spec.expectedIdempotenceCleanupCalls || result.quarantineCleanupCalls !== spec.expectedQuarantineCleanupCalls) fail(`CODEX_SHARED_CASE_CLEANUP_DRIFT:${spec.caseId}`);
  if (result.residueCount !== (spec.expectedAllProcessGroupsAbsent ? 0 : 1)) fail(`CODEX_SHARED_CASE_RESIDUE:${spec.caseId}`);
  if (result.injectedFaultObserved !== (spec.expectedTerminalClass !== "CLEAN")) fail(`CODEX_SHARED_CASE_FAULT_UNOBSERVED:${spec.caseId}`);
  if (result.observedReasonCode !== spec.expectedReasonCode) fail(`CODEX_SHARED_CASE_REASON_DRIFT:${spec.caseId}:${result.observedReasonCode}`);
  if (result.logicalCommandBoundaryProven !== true || result.mutationBeforeSpawnRejected !== spec.expectedMutationBeforeSpawnRejected || result.inMemoryFakeExecutorBoundaryProven !== true || result.inMemoryFakeWrapperSubstitutionProven !== true || result.clientWriteBytesValidated !== true || result.evidenceSchemaRejectionObserved !== spec.expectedEvidenceSchemaRejection || result.journalInputShapeValidated !== true || result.journalInputRejectionObserved !== spec.expectedJournalInputRejection || result.stdioCloseBeforeSignalProven !== true || result.ownedStdioClosedBeforeReturn !== true || result.noWritesAfterStdioClose !== true || result.ownedBufferZeroizationPassed !== true || result.fakeEmitterBufferZeroizationPassed !== true) fail(`CODEX_SHARED_CASE_BOUNDARY_UNPROVEN:${spec.caseId}`);
  for (const key of ["bodyBytesExposed", "privatePathFields", "stableIdentityFields", "realCodexCalls", "sandboxExecCalls", "threadStarts", "turnStarts", "providerCalls", "providerBytes", "networkAuthority", "networkTransmittedBytes", "retryStarts", "fifthStarts", "alternateExecutableStarts"]) if (result[key] !== 0) fail(`CODEX_SHARED_CASE_AUTHORITY_ESCAPE:${spec.caseId}:${key}`);
  return result;
}

export async function runCodexSharedOrchestrationFaultMatrix(runCase) {
  if (typeof runCase !== "function") fail("CODEX_SHARED_CASE_EXECUTOR_REQUIRED");
  const resultLines = [];
  let fakeChildStarts = 0;
  let cleanCases = 0;
  let controlledFailureCases = 0;
  let yellowQuarantinedCleanedCases = 0;
  let redQuarantinedCases = 0;
  for (const spec of CODEX_SHARED_ORCHESTRATION_FAULT_CASES) {
    const result = validateCodexSharedCaseResult(spec, await runCase(spec));
    fakeChildStarts += result.processGroupsStarted;
    cleanCases += Number(result.terminalClass === "CLEAN");
    controlledFailureCases += Number(result.terminalClass === "CONTROLLED_FAILURE");
    yellowQuarantinedCleanedCases += Number(result.terminalClass === "YELLOW_QUARANTINED_CLEANED");
    redQuarantinedCases += Number(result.terminalClass === "RED_QUARANTINED");
    resultLines.push(`${canonicalJson(result)}\n`);
  }
  if (cleanCases !== 1 || cleanCases + controlledFailureCases + yellowQuarantinedCleanedCases + redQuarantinedCases !== CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length) fail("CODEX_SHARED_CASE_CLASSIFICATION_DRIFT");
  return deepFreeze({
    status: "CODEX_SHARED_PRODUCTION_ORCHESTRATION_FAULT_MATRIX_GREEN",
    caseCount: CODEX_SHARED_ORCHESTRATION_FAULT_CASES.length,
    cleanCases,
    controlledFailureCases,
    yellowQuarantinedCleanedCases,
    redQuarantinedCases,
    fakeChildStarts,
    aggregateSha256: sha256(Buffer.from(resultLines.join(""), "utf8")),
    bodyBytesExposed: 0,
    privatePathFields: 0,
    realCodexCalls: 0,
    sandboxExecCalls: 0,
    threadStarts: 0,
    turnStarts: 0,
    providerCalls: 0,
    providerBytes: 0,
    networkAuthority: 0,
    networkTransmittedBytes: 0,
  });
}

export async function runConstructionFakeMatrix(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some((key) => !["requireCodexShared", "runCodexSharedCase"].includes(key))) fail("CONSTRUCTION_FAKE_MATRIX_OPTIONS");
  const requireCodexShared = options.requireCodexShared ?? false;
  if (typeof requireCodexShared !== "boolean" || (options.runCodexSharedCase !== undefined && typeof options.runCodexSharedCase !== "function")) fail("CONSTRUCTION_CODEX_SHARED_OPTIONS_INVALID");
  const codexShared = options.runCodexSharedCase === undefined ? null : await runCodexSharedOrchestrationFaultMatrix(options.runCodexSharedCase);
  if (requireCodexShared && codexShared === null) fail("CODEX_SHARED_PRODUCTION_ORCHESTRATION_MATRIX_REQUIRED");
  const catalog = loadRaceCatalog();
  const postgresCleanupAuthorityRaces = runPostgresCleanupAuthorityFakeMatrix();
  const stressHashes = [];
  for (let run = 0; run < 3; run += 1) stressHashes.push(sha256(canonicalJson(raceByteIndex(catalog))));
  if (new Set(stressHashes).size !== 1) fail("RACE_STRESS_NONDETERMINISTIC");
  const manifestSha256 = `sha256:${"a".repeat(64)}`;
  const syntheticRunId = "a".repeat(32);
  const postgresPlan = buildPostgresPhysicalPlan({ dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", localImageId: `sha256:${"b".repeat(64)}` }, manifestSha256, syntheticRunId);
  const macPlan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: "/synthetic/node", runtimeSourceRoot: REPOSITORY_ROOT }, manifestSha256, syntheticRunId);
  let fakeStarts = 0;
  for (const faultWindow of ["before", "after"]) for (let faultAfter = 1; faultAfter <= postgresPlan.steps.length; faultAfter += 1) {
    const executor = createStatefulConstructionEffectExecutor("postgres");
    const originalExecute = executor.execute;
    const counting = Object.freeze({ ...executor, async execute(step) { fakeStarts += 1; return await originalExecute(step); } });
    await runFakePlan(postgresPlan, counting, { faultAfter, faultWindow });
    if (executor.residueCount !== 0 || executor.cleanupCalls !== 1) fail("POSTGRES_STATEFUL_FAKE_CLEANUP_DRIFT");
  }
  for (const faultWindow of MACOS_JOURNAL_FAULT_WINDOWS) for (let faultStep = 1; faultStep <= macPlan.steps.length; faultStep += 1) {
    const executor = createJournaledMacOSConstructionEffectExecutor();
    await runJournaledMacOSFakePlan(macPlan, executor, { faultStep, faultWindow });
    fakeStarts += executor.effectCount;
    if (executor.residueCount !== 0 || executor.cleanupCalls !== 1) fail("MACOS_STATEFUL_FAKE_CLEANUP_DRIFT");
  }
  const unified = await orchestrateConstructionFakeLanes({
    postgres: { mode: "construction_fake", async run() { return { verdict: "GREEN", stopLaterLanes: false }; } },
    codex: { mode: "construction_fake", async run() { return { verdict: codexShared === null ? "YELLOW" : "GREEN", stopLaterLanes: false }; } },
    macos: { mode: "construction_fake", async run() { return { verdict: "YELLOW", stopLaterLanes: false }; } },
    cleanup: { mode: "construction_fake", async run() { return true; } },
  });
  return deepFreeze({
    status: codexShared === null ? "ADAPTER_CONSTRUCTION_COMPONENT_MATRIX_GREEN" : "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN",
    deterministicStressRuns: 3,
    raceOrders: catalog.orders.length,
    expectedCoreCalls: POSTGRES_COUNTS.expectedCoreCalls,
    postgresAtomicFaultCases: postgresPlan.steps.length * 2,
    postgresCleanupAuthorityRaceCases: postgresCleanupAuthorityRaces.caseCount,
    postgresForeignReplacementPreserved: postgresCleanupAuthorityRaces.foreignReplacementPreserved,
    postgresPostRemoveRecreationBlocksProof: postgresCleanupAuthorityRaces.postRemoveRecreationBlocksProof,
    macosAtomicFaultCases: macPlan.steps.length * MACOS_JOURNAL_FAULT_WINDOWS.length,
    codexSharedOrchestrationCases: codexShared?.caseCount ?? 0,
    codexSharedOrchestrationAggregateSha256: codexShared?.aggregateSha256 ?? null,
    unifiedLaneOrder: unified.order,
    unifiedCleanupPassed: unified.cleanupPassed,
    fakeChildStarts: fakeStarts + (codexShared?.fakeChildStarts ?? 0),
    realPhysicalEffects: 0,
  });
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  process.stderr.write("PHYSICAL_PORT_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  process.exitCode = 64;
}
