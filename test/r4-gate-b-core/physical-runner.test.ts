import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  authenticatedRetryJournal,
  BLOCKED_SUPERVISOR_CONTRACT,
  PhysicalRunnerError,
  cleanupConstruction,
  cleanupCoreRetry,
  cleanupHostBindingReattempt,
  cleanupMacOSResourcesFromJournal,
  cleanupPostgresResources,
  closeExactOwnedRootAuthority,
  constructPhysicalAdapters,
  createCheckpointOwnershipJournal,
  createConstructionJournal,
  createHostBindingReattemptCheckpointClaim,
  createHostBindingReattemptJournal,
  createPermanentHostBindingReattemptConsumedAttempt,
  createRetryJournal,
  exerciseBlockedStartProtocolForConstruction,
  exerciseConstructionPublicationProtocolForConstruction,
  exerciseCheckpointPublicationProtocolForConstruction,
  exerciseMacOSDirectStartProtocolForConstruction,
  executePostgresLane,
  finalizeHostBindingReattemptOnce,
  finalizeFailedCheckpointWriterRoot,
  deriveHostBindingReattemptRunId,
  createHostBindingReattemptActivationCard,
  HOST_BINDING_REATTEMPT_AUTHORITY,
  HOST_BINDING_REATTEMPT_WORKSET,
  openAuthenticatedConstructionJournalForAppend,
  openAuthenticatedRetryJournalForAppend,
  openExactOwnedRootAuthority,
  PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS,
  normalizeFinalConstructionCheckpointInputs,
  parsePhysicalRunnerArguments,
  physicalRunnerDirectErrorBody,
  readConstructionJournalForCleanup,
  readHostBindingReattemptCheckpointClaimForCleanup,
  readHostBindingReattemptConsumedAttempt,
  readCheckpoint,
  removeEmptyAuthenticatedRetryJournalRoot,
  removeExactOwnedRootTree,
  resolvePostgresContainerIdentityStep,
  RETRY_CLEANUP_ABSENCE_MARKERS,
  reconcileCheckpointOwnershipJournalForCleanup,
  reconcileHostBindingReattemptCheckpointClaimForCleanup,
  selectPhysicalRunnerTerminalError,
  stageRuntimeDependencies,
  preparePhaseBHostBindingPreInput,
  prepareHostBindingReattempt,
  validateConstructionJournalForCleanup,
  validateDockerExactNameAbsent,
  validateRetryJournalForCleanup,
  verifyPhaseAAuthority,
  verifyPhaseBConstructionRootInventory,
  withAuthenticatedConstructionRollbackPlan,
  writeFinalConstructionCheckpoint,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-physical-runner.mjs";
import {
  CANONICAL_SYSTEM_TEMP_ROOT,
  POSTGRES_CONTAINER_ID_PLACEHOLDER,
  buildPostgresPhysicalPlan,
  postgresContainerCleanupCommandShapeSha256,
  postgresContainerIdentityAuthoritySha256,
  postgresVolumeCleanupCommandShapeSha256,
  validatePostgresContainerCreateFrame,
  validatePostgresContainerIdentityFrame,
  validatePostgresVolumeCreateFrame,
  validatePostgresVolumeIdentityFrame,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-physical-port.mjs";
import {
  HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS,
  atomicWritePrivateFile,
  buildHostBindingReattemptOutputFrames,
  hostBindingReattemptEnvironmentDirectoryIdentitySha256,
  hostBindingReattemptEnvironmentDirectoryIntentSha256,
  runtimeDependencyInventory,
  runtimeDependencyLogicalName,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-host-binding.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const hashFrame = (value: string) => `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
const APPROVED_SUCCESSOR_PACKAGE_LOCK_SHA256 = "sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f";
const HISTORICAL_PHYSICAL_PACKAGE_LOCK_SHA256 = "sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812";
const currentPackageLockBytes = fs.readFileSync(path.join(root, "package-lock.json"));
const currentPackageLockSha256 = `sha256:${createHash("sha256").update(currentPackageLockBytes).digest("hex")}`;
currentPackageLockBytes.fill(0);
const physicalRunnerSource = fs.readFileSync(path.join(root, "scripts/r4-gate-b-physical-runner.mjs"), "utf8");
const historicalPhysicalPackageLockBindings = Array.from(
  physicalRunnerSource.matchAll(/^\s*"package-lock\.json": "(sha256:[a-f0-9]{64})",$/gmu),
  (match) => match[1],
);
const syntheticHostBindingReattemptOutput = ({ checkpoint, checkpointSha256, activationCardSha256, activationGrantSha256, consumedAttemptTombstoneSha256, attemptId, hostBindingId = "c".repeat(32) }: { checkpoint: Record<string, any>; checkpointSha256: string; activationCardSha256: string; activationGrantSha256: string; consumedAttemptTombstoneSha256: string; attemptId: string; hostBindingId?: string }) => {
  const digest = (value: string) => hashFrame(`synthetic-reattempt:${value}\n`);
  const identity = (index: number) => Object.freeze({ logicalName: `tool-${index}`, path: `/synthetic/tool-${index}`, sha256: digest(`tool-${index}`), size: 1, mode: 0o755, uid: 501, gid: 20, device: "1", inode: String(index + 1), nlink: 1, mtimeMilliseconds: 1 });
  const directoryIdentity = (directoryPath: string, inode: string) => Object.freeze({ path: directoryPath, size: 1, mode: 0o755, uid: 501, gid: 20, device: "1", inode, nlink: 2, mtimeMilliseconds: 1 });
  const docker = Object.freeze({ cliPath: "/synthetic/docker", socketPath: "/synthetic/docker.sock", socketIdentity: Object.freeze({ size: 1, mode: 0o600, uid: 501, gid: 20, device: "1", inode: "30", nlink: 1, mtimeMilliseconds: 1 }), clientVersion: "28.3.2", clientApiVersion: "1.51", serverVersion: "28.3.2", serverApiVersion: "1.51", serverOs: "linux", serverArch: "arm64", imageReference: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", repoDigest: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", localImageId: digest("image"), imageOs: "linux", imageArch: "arm64", imageSizeBytes: 1, unixSocketRequests: 2 });
  const publicDocker = Object.freeze(Object.fromEntries(Object.entries(docker).filter(([key]) => !new Set(["cliPath", "socketPath", "socketIdentity", "imageReference", "unixSocketRequests"]).has(key))));
  const macos = Object.freeze({ platform: "darwin-arm64", productVersion: "26.0", buildVersion: "26A1", architecture: "arm64", developerRoot: "/synthetic/developer", developerRootIdentity: directoryIdentity("/synthetic/developer", "31"), sdkPath: "/synthetic/developer/SDKs/MacOSX26.0.sdk", sdkPathIdentity: directoryIdentity("/synthetic/developer/SDKs/MacOSX26.0.sdk", "32"), sdkVersion: "26.0", swiftcPath: "/synthetic/developer/usr/bin/swiftc", swiftVersion: "Apple Swift version 6.2", opensslVersion: "LibreSSL 3.3.6", nodeVersion: process.version, readOnlyInspectionCalls: 9 });
  const createdAt = "2026-08-09T12:00:00.000Z";
  const expiresAt = "2026-08-12T12:00:00.000Z";
  return buildHostBindingReattemptOutputFrames({
    frozen: Object.freeze({ reattemptRunId: HOST_BINDING_REATTEMPT_AUTHORITY.runId, reattemptPacketSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256, reattemptOwnerReviewSha256: HOST_BINDING_REATTEMPT_AUTHORITY.ownerReviewSha256, approvedProposalHead: HOST_BINDING_REATTEMPT_AUTHORITY.proposalHead, approvedProposalTree: HOST_BINDING_REATTEMPT_AUTHORITY.proposalTree, implementationHead: checkpoint.implementationHead, implementationTree: checkpoint.implementationTree, runtimeDependencyAggregateSha256: checkpoint.runtimeDependencyAggregateSha256 }),
    legacy: Object.freeze({ hostBindingId, capsule: Object.freeze({ privateSalt: "d".repeat(64), createdAt, expiresAt, boundFiles: Object.freeze(Array.from({ length: 20 }, (_, index) => identity(index))), docker, macos }), publicReceipt: Object.freeze({ createdAt, expiresAt, platform: "darwin-arm64", tools: Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({ logicalName: `tool-${index}`, version: "byte-bound", sha256: digest(`public-tool-${index}`) }))), docker: publicDocker }) }),
    checkpointSha256, activationCardSha256, activationGrantSha256, consumedAttemptTombstoneSha256, attemptId,
  });
};
const constructionRoot = path.join(root, ".forme/gate-b-physical-construction/79b7775defbdaf043697ef9b6d0ab45c");
const isPostOutputAuthorityFailure = (error: unknown) => error instanceof Error
  && "code" in error
  && typeof error.code === "string"
  && (error.code === "PHYSICAL_BRANCH_DRIFT" || error.code.startsWith("PHYSICAL_PHASE_A_WORKSET_ESCAPE:"))
  && "verdict" in error
  && error.verdict === "RED";
const isExactSuccessorPackageLockFailure = (error: unknown) => error instanceof Error
  && "code" in error
  && error.code === "PHYSICAL_IMMUTABLE_DRIFT:package-lock.json"
  && "verdict" in error
  && error.verdict === "RED";
const assertExactSuccessorPackageLockBoundary = () => {
  assert.equal(currentPackageLockSha256, APPROVED_SUCCESSOR_PACKAGE_LOCK_SHA256);
  assert.deepEqual(historicalPhysicalPackageLockBindings, [HISTORICAL_PHYSICAL_PACKAGE_LOCK_SHA256]);
  assert.equal(isPostOutputAuthorityFailure(Object.assign(new Error("successor lock fixture"), { code: "PHYSICAL_IMMUTABLE_DRIFT:package-lock.json", verdict: "RED" })), false);
};
const isUnsupportedNodeRuntimeFailure = (error: unknown) => error instanceof Error
  && "code" in error
  && error.code === "BLOCKED_SUPERVISOR_NODE_FILE_UNSAFE"
  && "verdict" in error
  && error.verdict === "RED";
const standaloneBlockedStartRoots = () => fs.readdirSync(CANONICAL_SYSTEM_TEMP_ROOT)
  .filter((name) => name.startsWith("forme-r4-blocked-start-"))
  .sort();
const standaloneMacOSDirectRoots = () => fs.readdirSync(CANONICAL_SYSTEM_TEMP_ROOT)
  .filter((name) => name.startsWith("forme-r4-macos-direct-start-"))
  .sort();
const constructionJournalFixtureRoot = () => {
  const fixtureRoot = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-construction-journal-")));
  fs.chmodSync(fixtureRoot, 0o700);
  return fixtureRoot;
};
const phaseBCheckpointFixtureRoot = (contents = "checkpoint\n") => {
  const fixtureRoot = constructionJournalFixtureRoot();
  fs.writeFileSync(path.join(fixtureRoot, "construction-checkpoint.v1.json"), contents, { flag: "wx", mode: 0o600 });
  return fixtureRoot;
};
const retryJournalFixtureRoot = () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-retry-journal-")));
  fs.chmodSync(parent, 0o700);
  return Object.freeze({ parent, root: path.join(parent, "run") });
};
const checkpointFixture = () => {
  const sha = `sha256:${"a".repeat(64)}`;
  return {
    schemaVersion: "r4_gate_b_physical_construction_checkpoint.v1",
    constructionRunId: "79b7775defbdaf043697ef9b6d0ab45c",
    approvedDecisionBriefSha256: "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2",
    constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
    constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
    approvedProposalHead: "a45ea061e8e92f247597787e36ecfe52740b216a",
    approvedProposalTree: "89b28903fc34e985a17e8f3fdc4bfd7d0972880e",
    implementationHead: "b".repeat(40),
    implementationTree: "c".repeat(40),
    physicalRunnerSha256: sha,
    hostBindingModuleSha256: sha,
    physicalPortSha256: sha,
    runnerContractSha256: sha,
    codexProfileSha256: "sha256:0c6dc1dda5c97f9d3773bc2ccbd49b28c8ba1b02f7f6b55180db7b2672a9d2ce",
    runtimeDependencyCount: 32,
    runtimeDependencyAggregateSha256: sha,
    runtimeDependencies: Array.from({ length: 32 }, (_, index) => ({ path: `fixture/runtime-${index}.bin`, sha256: sha })),
    validationAggregateSha256: sha,
    auditReceipts: { postgres: sha, codexUnified: sha, macosAuthority: sha },
  };
};
const trackedRootAuthorities = new Set<unknown>();
const trackRootAuthority = <T extends { rootAuthority?: unknown }>(authenticated: T): T => {
  if (authenticated.rootAuthority !== undefined) trackedRootAuthorities.add(authenticated.rootAuthority);
  return authenticated;
};
test.afterEach(() => {
  for (const authority of trackedRootAuthorities) closeExactOwnedRootAuthority(authority);
  trackedRootAuthorities.clear();
});
const readConstructionJournalFixture = (fixtureRoot: string) => trackRootAuthority(readConstructionJournalForCleanup({
  constructionRoot: fixtureRoot,
  journalPath: path.join(fixtureRoot, "journal.v1.jsonl"),
  checkpointPath: path.join(fixtureRoot, "construction-checkpoint.v1.json"),
}));
const assertNoEffectConstructionPlan = (records: readonly unknown[]) => {
  assert.deepEqual(validateConstructionJournalForCleanup(records), {
    unresolvedProcessGroups: [],
    unresolvedProcesses: [],
    publicationHostBindingId: null,
    publicationComplete: false,
    removePartialPublication: false,
    capsuleExpectedSha256: null,
    capsuleStageReady: false,
    receiptExpectedSha256: null,
    receiptStageReady: false,
    capsuleRootIntent: false,
    capsuleRootCreated: false,
    capsuleRootIdentitySha256: null,
    slotRootIntent: false,
    slotRootObserved: false,
    slotRootIdentitySha256: null,
    environmentDirectoryPlans: HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.map((spec: Readonly<{ name: string; environmentKey: string; ownedResource: string }>) => ({
      name: spec.name,
      environmentKey: spec.environmentKey,
      ownedResource: spec.ownedResource,
      intentObserved: false,
      createdObserved: false,
      identitySha256: null,
    })),
    removeOwnerInput: false,
    unstartedSupervisorStarts: [],
    unstartedDirectGateIntents: 0,
  });
};

test("blocked-start supervisor bytes and logical process-group accounting are frozen in the runner contract", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/physical-runner-contract.json"), "utf8"));
  assert.equal(CANONICAL_SYSTEM_TEMP_ROOT, fs.realpathSync("/tmp"));
  assert.deepEqual(contract.postImplementationCorrection, {
    status: "OWNER_APPROVED_C_LAYER_PORTABILITY_CORRECTION",
    historicalImplementationHead: "92c6c3f8896494aed699671a04a93a09fb59087d",
    historicalImplementationTree: "cf2ce5567c601fff1ad709e565dde41cf9c3540d",
    historicalOutputHead: "63ae16940faf17694152cffa12848e62c2933c52",
    historicalOutputTree: "ebfd96e7c1003c076d417798e53430891f60f057",
    allowedImplementationPaths: [
      "schemas/r4/gate-b-core/artifact-index.json", "schemas/r4/gate-b-core/physical-runner-contract.json", "scripts/r4-doc-audit.mjs",
      "scripts/r4-gate-b-physical-port.mjs", "scripts/r4-gate-b-physical-runner.mjs", "test/r4-gate-b-core/physical-runner.test.ts",
    ],
    allowedR2OutputPaths: [
      "docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md",
      "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md",
      "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md",
    ],
    canonicalSystemTemporaryRoot: "realpath(/tmp)",
    temporaryRootEnvironmentAuthority: false,
    temporaryRootCallerAuthority: false,
    productionPhaseABranchGuardChanged: false,
    productionBlockedStartNodeIdentityChanged: false,
    standaloneBlockedStartUnsupportedNodeRuntime: "fail-closed-before-child-start-and-remove-private-test-root",
    postOutputOrDetachedConstructionEntry: "fail-closed-before-journal-root-or-effect",
    historicalHostBindingAttemptRebound: false,
    historicalHostBindingAttemptRerun: false,
    runnerAfterCorrectionHostBound: false,
    retryExecutionGrant: "NOT_REQUESTED",
    firstProviderCallGrant: "NOT_REQUESTED",
  });
  for (const sourcePath of ["scripts/r4-gate-b-physical-port.mjs", "scripts/r4-gate-b-physical-runner.mjs"]) {
    const source = fs.readFileSync(path.join(root, sourcePath), "utf8");
    assert.doesNotMatch(source, /os\.tmpdir|process\.env\.(?:TMPDIR|TMP|TEMP)/u);
    assert.doesNotMatch(source, /["'`]\/private\/tmp/u);
  }
  assert.equal(contract.construction.checkpointGreenRequiresAllSerialExercises, true);
  assert.ok(contract.construction.phaseARequiredSerialExercises.includes("exec-replace-3fd same-PID blocked-start protocol"));
  assert.ok(contract.construction.phaseARequiredSerialExercises.includes("self-blocked direct macOS helper and feeder protocol"));
  assert.ok(contract.construction.phaseARequiredSerialExercises.includes("actual checkpoint no-clobber hardlink publication and durable ownership-claim recovery protocol"));
  assert.deepEqual(contract.construction.checkpointWriterInputs, ["validationAggregateSha256", "postgresAuditReceiptSha256", "codexUnifiedAuditReceiptSha256", "macosAuthorityAuditReceiptSha256"]);
  assert.deepEqual(contract.construction.checkpointWriterAuditReceiptMapping, { postgres: "postgresAuditReceiptSha256", codexUnified: "codexUnifiedAuditReceiptSha256", macosAuthority: "macosAuthorityAuditReceiptSha256" });
  assert.match(contract.construction.checkpointWriterReturnShaAuthority, /authenticated checkpointPublication\.sha256/u);
  assert.match(contract.construction.checkpointWriterReturnShaAuthority, /not re-read with fileSha/u);
  assert.equal(contract.construction.checkpointClaimReaderCloseFaultVerdict, "RED_QUARANTINED");
  assert.match(contract.construction.checkpointWriteProtocol, /no-clobber hardlink temp-to-final/u);
  assert.match(contract.construction.checkpointWriteProtocol, /complete canonical bytes plus full identity\/content\/nlink/u);
  assert.match(contract.construction.checkpointWriteProtocol, /holds both descriptors across exact journal unlink and root fsync/u);
  assert.match(contract.construction.checkpointWriteProtocol, /rename fallback forbidden/u);
  assert.match(contract.construction.checkpointCrashResidueCleanup, /first opens the journal O_NOFOLLOW/u);
  assert.match(contract.construction.checkpointCrashResidueCleanup, /zero-valid-prefix torn journal.*never truncated/u);
  assert.deepEqual(contract.processSupervision.protocolImplementations, {
    hostInspector: "exec-replace-3fd",
    postgres: "exec-replace-3fd",
    codex: "exec-replace-3fd",
    macosCli: "exec-replace-3fd",
    cleanupCli: "exec-replace-3fd",
    macosHelper: "self-blocked-direct-helper",
    macosFeeder: "self-blocked-direct-feeder",
  });
  assert.equal(contract.processSupervision.macosDirectReadyTransport, "inherited-pipe-plus-live-child-handle-no-durable-pid-slot");
  assert.equal(contract.processSupervision.macosDirectCrashBeforeStartedJournalVerdict, "RED_QUARANTINED");
  const blocked = contract.processSupervision.blockedStartProtocol;
  assert.deepEqual(blocked, JSON.parse(JSON.stringify(BLOCKED_SUPERVISOR_CONTRACT)));
  assert.equal(blocked.schemaVersion, BLOCKED_SUPERVISOR_CONTRACT.schemaVersion);
  assert.equal(blocked.sourceSha256, BLOCKED_SUPERVISOR_CONTRACT.sourceSha256);
  assert.equal(blocked.runtimeMaterialization, BLOCKED_SUPERVISOR_CONTRACT.runtimeMaterialization);
  assert.equal(blocked.readySlotMode, BLOCKED_SUPERVISOR_CONTRACT.readySlotMode);
  assert.equal(blocked.releaseMaximumBytes, BLOCKED_SUPERVISOR_CONTRACT.releaseMaximumBytes);
  assert.equal(blocked.releaseFrameHashBound, true);
  assert.equal(blocked.startIdIncludesJournalIntentSequence, true);
  assert.equal(blocked.releaseAfterStartedJournalFsync, true);
  assert.equal(blocked.parentLeaseRequired, false);
  assert.equal(blocked.targetDetachedProcessGroupCount, 1);
  assert.equal(blocked.logicalStartCountsSupervisorGroupNotRawProcesses, true);
  assert.equal(blocked.targetStartsBeforeDurablePidAuthority, false);
  assert.equal(blocked.execReplacesLauncherAtSamePid, true);
  assert.equal(blocked.residentCarrierProcesses, 0);
  assert.deepEqual(blocked.execvePreservedFileDescriptors, [0, 1, 2]);
  assert.equal(blocked.persistedProcessIdSignalAuthority, "durable-started-journal-only");
  assert.equal(blocked.intentOnlyReadySlotProcessIdSignalAuthority, "authenticated-deterministic-ready-slot-only");
  assert.equal(blocked.emptyOrPartialReadySlotVerdict, "RED_QUARANTINED");
  assert.equal(blocked.preReleaseFaultCases, 13);
  assert.equal(blocked.preReleaseFaultMatrixConstructionRequired, true);
  assert.equal(blocked.startErrorObservation, "logicalStartObserved-plus-processGroupState");
  assert.equal(blocked.launcherArgvEnvironmentContainsTargetSecrets, false);
  assert.equal(blocked.releaseBufferBestEffortZeroized, true);
  assert.equal(blocked.v8RuntimeWideErasureClaimed, false);
  const cleanupFsm = contract.futureRetry.cleanupJournalFsm;
  assert.deepEqual(cleanupFsm.greenMarkerEvents, ["retry-cleanup-observed", "retry-cleanup-after-terminal"]);
  assert.equal(cleanupFsm.greenMarkerIsAbsoluteJournalTerminal, true);
  assert.equal(cleanupFsm.recordsAfterGreenMarker, "RED_QUARANTINED");
  assert.match(cleanupFsm.directHelperFeederOverlapRule, /both feeder and helper/u);
  assert.match(cleanupFsm.directHelperFeederRecoveryOrder, /helper then feeder or feeder then helper/u);
  assert.match(cleanupFsm.directHelperFeederRecoveryOrder, /until both are absent/u);
  assert.match(cleanupFsm.postgresAbsenceMarkerLaneTerminal, /every later PostgreSQL lane marker, observation, or process record is RED_QUARANTINED/u);
  assert.match(cleanupFsm.postgresNormalIdentityCapture, /64-lower-hex ID/u);
  assert.deepEqual(cleanupFsm.postgresNormalTailOrder, [
    "container-pre-remove-exact-id-name-label-inspect", "container-remove-by-observed-immutable-id", "container-post-remove-exact-id-absence", "container-post-remove-exact-name-absence",
    "volume-pre-remove-exact-stable-identity-and-label-inspect", "volume-remove-by-name-under-same-user-procedural-boundary", "volume-post-remove-exact-name-absence", "postgres-absence-proof",
  ]);
  assert.match(cleanupFsm.postgresResolvedCommandBinding, /durable command-authority hashes include that exact ID/u);
  assert.match(cleanupFsm.postgresDirtyClearRule, /remove exit 0 never clears/u);
  assert.match(cleanupFsm.postgresCompensationIdentityRule, /same-name recreation is preserved and RED_QUARANTINED/u);
  assert.match(cleanupFsm.macosAbsenceMarkerJournalTerminal, /only one exact final unified cleanup Green marker may follow/u);
  assert.deepEqual(cleanupFsm.postgresCompensationMarker, {
    lane: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.lane,
    event: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.event,
    commandFrame: "retry-postgres-cleanup-absence-v1\n",
    ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.postgres.ownedResources],
    terminalCode: "ABSENT",
    cleanupState: "observed-absent",
  });
  assert.deepEqual(cleanupFsm.macosCompensationMarker, {
    lane: RETRY_CLEANUP_ABSENCE_MARKERS.macos.lane,
    event: RETRY_CLEANUP_ABSENCE_MARKERS.macos.event,
    commandFrame: "retry-macos-cleanup-absence-v1\n",
    ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.macos.ownedResources],
    terminalCode: "ABSENT",
    cleanupState: "observed-absent",
  });
  assert.equal(RETRY_CLEANUP_ABSENCE_MARKERS.postgres.commandShapeSha256, hashFrame(cleanupFsm.postgresCompensationMarker.commandFrame));
  assert.equal(RETRY_CLEANUP_ABSENCE_MARKERS.macos.commandShapeSha256, hashFrame(cleanupFsm.macosCompensationMarker.commandFrame));
  assert.match(cleanupFsm.rootAbsentFastPathAuthority, /caller-injected booleans are ignored/u);
  assert.deepEqual(contract.postgresPlan.cleanupTail, ["container-cleanup-inspect-by-ID", "container-remove-by-ID", "container-id-absence", "container-name-absence", "volume-cleanup-inspect-stable-identity", "volume-remove-by-name", "volume-name-absence", "postgres-absence-proof"]);
  assert.match(contract.postgresPlan.containerCreateOutput, /64-lower-hex immutable container ID/u);
});

test("blocked-start launcher releases one owned fake target by same-PID exec replacement", async () => {
  const rootsBefore = standaloneBlockedStartRoots();
  let result;
  try { result = await exerciseBlockedStartProtocolForConstruction(); }
  catch (error) {
    assert.equal(isUnsupportedNodeRuntimeFailure(error), true);
    assert.deepEqual(standaloneBlockedStartRoots(), rootsBefore, "unsupported CI Node must fail before child start and remove its private test root");
    return;
  }
  assert.deepEqual(result, {
    status: "GREEN",
    fakeProcessStarts: 6,
    samePidExecReplaceProven: true,
    startedJournalBeforeTargetOutputProven: true,
    supervisorDiscardCanariesNotInherited: true,
    residentCarrierProcesses: 0,
    processGroupsAbsent: true,
    preparationFaultMatrix: {
      casesValidated: 13,
      logicalStartsObserved: 5,
      allProcessGroupsAbsent: true,
      residueCount: 0,
    },
  });
  assert.deepEqual(standaloneBlockedStartRoots(), rootsBefore);
});

test("blocked-start preserves production Node identity checks and cleans an unsupported toolcache runtime", async () => {
  const rootsBefore = standaloneBlockedStartRoots();
  const originalLstat = fs.lstatSync;
  const mutableFs = fs as unknown as { lstatSync: typeof fs.lstatSync };
  mutableFs.lstatSync = ((candidate: fs.PathLike, options?: fs.StatSyncOptions) => {
    const observed = originalLstat(candidate, options as never);
    if (String(candidate) !== process.execPath || typeof observed.nlink !== "number") return observed;
    return Object.assign(Object.create(Object.getPrototypeOf(observed)), observed, { nlink: 2 });
  }) as typeof fs.lstatSync;
  try { await assert.rejects(exerciseBlockedStartProtocolForConstruction(), isUnsupportedNodeRuntimeFailure); }
  finally { mutableFs.lstatSync = originalLstat; }
  assert.deepEqual(standaloneBlockedStartRoots(), rootsBefore);
});

test("macOS direct helper and feeder remain gated until their started journals are durable", async () => {
  const result = await exerciseMacOSDirectStartProtocolForConstruction();
  assert.deepEqual(result, {
    status: "GREEN",
    fakeProcessStarts: 2,
    helperDirectPidReadyValidated: true,
    feederDirectPidReadyValidated: true,
    startedJournalBeforeBothReleases: true,
    candidateBytesWritten: 1390,
    handoffCount: 1,
    processGroupsAbsent: true,
    realHelperStarts: 0,
    providerCalls: 0,
  });
});

test("macOS direct feeder terminal wait uses the bounded authority deadline and remains fail closed after it", async () => {
  const rootsBefore = standaloneMacOSDirectRoots();
  const withinAuthority = await exerciseMacOSDirectStartProtocolForConstruction({ terminalTiming: "delayed-within-authority" });
  assert.deepEqual(withinAuthority, {
    status: "GREEN",
    fakeProcessStarts: 2,
    helperDirectPidReadyValidated: true,
    feederDirectPidReadyValidated: true,
    startedJournalBeforeBothReleases: true,
    candidateBytesWritten: 1390,
    handoffCount: 1,
    processGroupsAbsent: true,
    realHelperStarts: 0,
    providerCalls: 0,
    terminalTimingEvidence: {
      terminalTiming: "delayed-within-authority",
      authorityBudgetMilliseconds: 62_000,
      virtualTerminalDelayMilliseconds: 30_000,
    },
  });
  await assert.rejects(
    exerciseMacOSDirectStartProtocolForConstruction({ terminalTiming: "after-authority" }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "MACOS_FEEDER_TERMINAL_INVALID" && "verdict" in error && error.verdict === "YELLOW",
  );
  for (const terminalTiming of ["", "within", "after", "ordinary ", null, 1]) {
    await assert.rejects(
      exerciseMacOSDirectStartProtocolForConstruction({ terminalTiming } as never),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "MACOS_DIRECT_EXERCISE_TERMINAL_TIMING_INVALID" && "verdict" in error && error.verdict === "RED",
    );
  }
  await assert.rejects(
    exerciseMacOSDirectStartProtocolForConstruction({ terminalTiming: "ordinary", extra: true } as never),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "MACOS_DIRECT_EXERCISE_OPTIONS_INVALID" && "verdict" in error && error.verdict === "RED",
  );
  assert.deepEqual(standaloneMacOSDirectRoots(), rootsBefore);
});

test("construction publication is stage-anchored, no-clobber and symlink-safe", async () => {
  assert.deepEqual(await exerciseConstructionPublicationProtocolForConstruction(), {
    status: "GREEN",
    casesValidated: 4,
    durableStageAuthorityProven: true,
    finalNoClobberProven: true,
    wrongResourcePreserved: true,
    danglingSymlinkNeverAbsent: true,
    retainedFinalLinkCount: 1,
  });
});

test("checkpoint publication exercises the actual no-clobber hardlink writer and crash cleanup", () => {
  assert.deepEqual(exerciseCheckpointPublicationProtocolForConstruction(), {
    status: "GREEN",
    casesValidated: 4,
    actualCheckpointWriterProtocolExercised: true,
    durableOwnershipClaimExercised: true,
    noClobberHardlinkProven: true,
    deterministicTempResiduePreserved: true,
    crashAliasCleanupProven: true,
    renameFallbackUsed: false,
  });
});

test("checkpoint crash aliases are removable only as one internal one-link name or an exact two-link pair", () => {
  const inventory = Object.freeze({
    "construction-checkpoint.v1.json": Object.freeze({ kind: "file", modes: Object.freeze([0o600]), aliasGroup: "checkpoint" }),
    ".construction-checkpoint.v1.json.fixture.tmp": Object.freeze({ kind: "file", modes: Object.freeze([0o600]), aliasGroup: "checkpoint" }),
  });
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-checkpoint-alias-")));
  const ownedRoot = path.join(parent, "run");
  fs.mkdirSync(ownedRoot, { mode: 0o700 });
  const finalPath = path.join(ownedRoot, "construction-checkpoint.v1.json");
  const tempPath = path.join(ownedRoot, ".construction-checkpoint.v1.json.fixture.tmp");
  fs.writeFileSync(tempPath, "checkpoint\n", { flag: "wx", mode: 0o600 });
  fs.linkSync(tempPath, finalPath);
  const authority = openExactOwnedRootAuthority({ root: ownedRoot, anchor: parent, codePrefix: "TEST_CHECKPOINT_ALIAS" });
  removeExactOwnedRootTree(authority, inventory);
  assert.equal(fs.existsSync(ownedRoot), false);

  const externalRoot = path.join(parent, "external-run");
  fs.mkdirSync(externalRoot, { mode: 0o700 });
  const externalTemp = path.join(externalRoot, ".construction-checkpoint.v1.json.fixture.tmp");
  const outsideLink = path.join(parent, "outside-checkpoint-link");
  fs.writeFileSync(externalTemp, "checkpoint\n", { flag: "wx", mode: 0o600 });
  fs.linkSync(externalTemp, outsideLink);
  const externalAuthority = openExactOwnedRootAuthority({ root: externalRoot, anchor: parent, codePrefix: "TEST_CHECKPOINT_EXTERNAL_ALIAS" });
  assert.throws(
    () => removeExactOwnedRootTree(externalAuthority, inventory),
    (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED",
  );
  assert.equal(fs.existsSync(externalTemp), true);
  assert.equal(fs.existsSync(outsideLink), true);
  fs.rmSync(parent, { recursive: true, force: true });
});

test("exact owned-root removal preserves unknown entries, symlinks and same-UID path replacements", () => {
  const inventory = Object.freeze({ known: Object.freeze({ kind: "directory", modes: Object.freeze([0o700]) }) });
  for (const collisionKind of ["unknown", "symlink"] as const) {
    const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-owned-root-inventory-")));
    const ownedRoot = path.join(parent, "run");
    fs.mkdirSync(ownedRoot, { mode: 0o700 });
    fs.mkdirSync(path.join(ownedRoot, "known"), { mode: 0o700 });
    const collision = path.join(ownedRoot, collisionKind === "unknown" ? "owner-unknown" : "known-link");
    if (collisionKind === "unknown") fs.writeFileSync(collision, "preserve\n", { flag: "wx", mode: 0o600 });
    else fs.symlinkSync(path.join(ownedRoot, "missing"), collision);
    const before = fs.lstatSync(collision);
    const authority = openExactOwnedRootAuthority({ root: ownedRoot, anchor: parent, codePrefix: "TEST_OWNED_ROOT" });
    assert.throws(
      () => removeExactOwnedRootTree(authority, collisionKind === "unknown" ? inventory : Object.freeze({ "known-link": Object.freeze({ kind: "directory", modes: Object.freeze([0o700]) }) })),
      (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
    const after = fs.lstatSync(collision);
    assert.equal(after.dev, before.dev);
    assert.equal(after.ino, before.ino);
    if (collisionKind === "unknown") assert.equal(fs.readFileSync(collision, "utf8"), "preserve\n");
    else assert.equal(fs.readlinkSync(collision), path.join(ownedRoot, "missing"));
    fs.rmSync(parent, { recursive: true, force: true });
  }

  const hardlinkParent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-owned-root-hardlink-")));
  const hardlinkRoot = path.join(hardlinkParent, "run");
  const ownerFile = path.join(hardlinkParent, "owner-file");
  fs.mkdirSync(hardlinkRoot, { mode: 0o700 });
  fs.writeFileSync(ownerFile, "owner-hardlink-preserve\n", { flag: "wx", mode: 0o600 });
  fs.linkSync(ownerFile, path.join(hardlinkRoot, "known-file"));
  const hardlinkAuthority = openExactOwnedRootAuthority({ root: hardlinkRoot, anchor: hardlinkParent, codePrefix: "TEST_OWNED_ROOT_HARDLINK" });
  assert.throws(
    () => removeExactOwnedRootTree(hardlinkAuthority, Object.freeze({ "known-file": Object.freeze({ kind: "file", modes: Object.freeze([0o600]) }) })),
    (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED",
  );
  assert.equal(fs.lstatSync(ownerFile).nlink, 2);
  assert.equal(fs.readFileSync(path.join(hardlinkRoot, "known-file"), "utf8"), "owner-hardlink-preserve\n");
  fs.rmSync(hardlinkParent, { recursive: true, force: true });

  const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-owned-root-swap-")));
  const ownedRoot = path.join(parent, "run");
  const displaced = path.join(parent, "run-displaced");
  fs.mkdirSync(ownedRoot, { mode: 0o700 });
  fs.mkdirSync(path.join(ownedRoot, "known"), { mode: 0o700 });
  const originalRoot = fs.lstatSync(ownedRoot);
  const authority = openExactOwnedRootAuthority({ root: ownedRoot, anchor: parent, codePrefix: "TEST_OWNED_ROOT_SWAP" });
  const originalReadDirectory = fs.readdirSync;
  let matchingRootReads = 0;
  let swapInjected = false;
  fs.readdirSync = ((target: fs.PathLike, options?: unknown) => {
    if (String(target) === ownedRoot) {
      matchingRootReads += 1;
      if (matchingRootReads === 2) {
        fs.renameSync(ownedRoot, displaced);
        fs.mkdirSync(ownedRoot, { mode: 0o700 });
        fs.mkdirSync(path.join(ownedRoot, "known"), { mode: 0o700 });
        swapInjected = true;
      }
    }
    return originalReadDirectory(target, options as never);
  }) as typeof fs.readdirSync;
  try {
    assert.throws(
      () => removeExactOwnedRootTree(authority, inventory),
      (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
  } finally { fs.readdirSync = originalReadDirectory; }
  assert.equal(swapInjected, true);
  const replacementRoot = fs.lstatSync(ownedRoot);
  const displacedRoot = fs.lstatSync(displaced);
  assert.notEqual(replacementRoot.ino, originalRoot.ino);
  assert.equal(displacedRoot.ino, originalRoot.ino);
  assert.deepEqual(fs.readdirSync(ownedRoot), ["known"]);
  assert.deepEqual(fs.readdirSync(displaced), ["known"]);
  fs.rmSync(parent, { recursive: true, force: true });

  const closeParent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-owned-root-close-")));
  const closeRoot = path.join(closeParent, "run");
  fs.mkdirSync(closeRoot, { mode: 0o700 });
  const closeAuthority = openExactOwnedRootAuthority({ root: closeRoot, anchor: closeParent, codePrefix: "TEST_OWNED_ROOT_CLOSE" });
  const originalClose = fs.closeSync;
  let closeInjected = false;
  fs.closeSync = ((descriptor: number) => {
    if (!closeInjected && descriptor === closeAuthority.rootFd) {
      closeInjected = true;
      originalClose(descriptor);
      throw Object.assign(new Error("injected owned-root authority close fault"), { code: "EIO" });
    }
    return originalClose(descriptor);
  }) as typeof fs.closeSync;
  try {
    assert.throws(
      () => removeExactOwnedRootTree(closeAuthority, Object.freeze({})),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "TEST_OWNED_ROOT_CLOSE_AUTHORITY_CLOSE_FAILED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
  } finally { fs.closeSync = originalClose; }
  assert.equal(closeInjected, true);
  assert.equal(fs.existsSync(closeRoot), false);
  fs.rmdirSync(closeParent);
});

test("carried Construction authority rejects a renamed root before journal interpretation", () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-carried-construction-root-")));
  const constructionRoot = path.join(parent, "run");
  const displaced = path.join(parent, "run-displaced");
  const journal = createConstructionJournal(constructionRoot);
  const rootAuthority = journal.takeRootAuthority();
  journal.close();
  journal.zeroize();
  fs.renameSync(constructionRoot, displaced);
  fs.mkdirSync(constructionRoot, { mode: 0o700 });
  fs.writeFileSync(path.join(constructionRoot, "journal.v1.jsonl"), "replacement-preserve\n", { flag: "wx", mode: 0o600 });
  const replacement = fs.lstatSync(constructionRoot);
  assert.throws(
    () => readConstructionJournalForCleanup({ constructionRoot, journalPath: path.join(constructionRoot, "journal.v1.jsonl"), checkpointPath: path.join(constructionRoot, "construction-checkpoint.v1.json"), rootAuthority }),
    (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED",
  );
  assert.equal(fs.lstatSync(constructionRoot).ino, replacement.ino);
  assert.equal(fs.readFileSync(path.join(constructionRoot, "journal.v1.jsonl"), "utf8"), "replacement-preserve\n");
  assert.equal(fs.existsSync(path.join(displaced, "journal.v1.jsonl")), true);
  fs.rmSync(parent, { recursive: true, force: true });
});

test("journal creation quarantines a new root when exact authority cannot be opened", () => {
  for (const kind of ["construction", "retry"] as const) {
    const fixture = retryJournalFixtureRoot();
    const originalOpen = fs.openSync;
    let injected = false;
    fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
      if (!injected && String(target) === fixture.root && (flags & fs.constants.O_DIRECTORY) !== 0) {
        injected = true;
        throw Object.assign(new Error(`injected ${kind} root authority open fault`), { code: "EIO" });
      }
      return originalOpen(target, flags, mode);
    }) as typeof fs.openSync;
    try {
      assert.throws(
        () => kind === "construction" ? createConstructionJournal(fixture.root) : createRetryJournal(fixture.root, hashFrame("authority-open-manifest\n"), "a".repeat(32), "authority-open-run"),
        (error: unknown) => error instanceof Error && "code" in error && error.code === (kind === "construction" ? "CONSTRUCTION_RUN_ROOT_AUTHENTICATION_FAILED" : "RETRY_RUN_ROOT_AUTHENTICATION_FAILED"),
      );
      assert.equal(injected, true);
    } finally { fs.openSync = originalOpen; }
    assert.equal(fs.existsSync(fixture.root), true);
    assert.deepEqual(fs.readdirSync(fixture.root), []);
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  }
});

test("Retry authority transfer gate closes journal and held root descriptors on inventory drift", () => {
  const fixture = retryJournalFixtureRoot();
  const journal = createRetryJournal(fixture.root, hashFrame("transfer-gate-manifest\n"), "a".repeat(32), "transfer-gate-run");
  const unknown = path.join(fixture.root, "same-uid-unknown");
  fs.writeFileSync(unknown, "preserve\n", { flag: "wx", mode: 0o600 });
  const originalClose = fs.closeSync;
  let closeCalls = 0;
  fs.closeSync = ((descriptor: number) => { closeCalls += 1; return originalClose(descriptor); }) as typeof fs.closeSync;
  try {
    assert.throws(() => journal.takeRootAuthority(), (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_RUN_ROOT_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED");
  } finally { fs.closeSync = originalClose; }
  assert.equal(closeCalls, 3);
  journal.close();
  journal.zeroize();
  assert.equal(fs.readFileSync(unknown, "utf8"), "preserve\n");
  fs.rmSync(fixture.parent, { recursive: true, force: true });
});

test("owned-file rollback and blocked-slot recovery preserve same-UID replacements and symlinks", async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-owned-mutation-")));
  const exerciseRollbackSwap = (target: string, displaced: string, mode: number, operation: () => unknown, expectedCode: string) => {
    const replacement = Buffer.from(`same-uid-replacement:${path.basename(target)}\n`, "utf8");
    const originalOpen = fs.openSync;
    const originalFsync = fs.fsyncSync;
    let targetFd: number | null = null;
    let swapped = false;
    fs.openSync = ((candidate: fs.PathLike, flags: number, openMode?: fs.Mode) => {
      const descriptor = originalOpen(candidate, flags, openMode);
      if (String(candidate) === target && (flags & fs.constants.O_EXCL) !== 0) targetFd = descriptor;
      return descriptor;
    }) as typeof fs.openSync;
    fs.fsyncSync = ((descriptor: number) => {
      if (!swapped && descriptor === targetFd) {
        originalFsync(descriptor);
        fs.renameSync(target, displaced);
        fs.writeFileSync(target, replacement, { flag: "wx", mode });
        swapped = true;
        throw Object.assign(new Error("injected created-file rollback swap"), { code: "EIO" });
      }
      return originalFsync(descriptor);
    }) as typeof fs.fsyncSync;
    try {
      assert.throws(operation, (error: unknown) => error instanceof Error && "code" in error && error.code === expectedCode && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { fs.openSync = originalOpen; fs.fsyncSync = originalFsync; }
    assert.equal(swapped, true);
    assert.deepEqual(fs.readFileSync(target), replacement);
    assert.notEqual(fs.lstatSync(target).ino, fs.lstatSync(displaced).ino);
    replacement.fill(0);
  };
  try {
    const source = path.join(parent, "source");
    const copyTarget = path.join(parent, "copy-target");
    const copyDisplaced = path.join(parent, "copy-displaced");
    const sourceBytes = Buffer.from("owned-copy-source\n", "utf8");
    fs.writeFileSync(source, sourceBytes, { flag: "wx", mode: 0o600 });
    exerciseRollbackSwap(copyTarget, copyDisplaced, 0o500, () => PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.copyOpenedRegularFile({ source, destination: copyTarget, expectedSha256: hashFrame(sourceBytes.toString("utf8")), destinationMode: 0o500 }), "CODEX_STAGE_DESTINATION_ROLLBACK_UNCERTAIN");
    sourceBytes.fill(0);

    const atomicRoot = path.join(parent, "atomic");
    const atomicTarget = path.join(atomicRoot, "secret");
    const atomicDisplaced = path.join(atomicRoot, "secret-displaced");
    const atomicBytes = Buffer.from("owned-atomic-source\n", "utf8");
    exerciseRollbackSwap(atomicTarget, atomicDisplaced, 0o600, () => PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.atomicWriteOwnedRunFile(atomicTarget, atomicBytes, 0o600), "OWNED_RUN_WRITE_ROLLBACK_UNCERTAIN");
    atomicBytes.fill(0);

    const danglingSecret = path.join(parent, "dangling-secret");
    const danglingTarget = path.join(parent, "missing-secret-owner");
    fs.symlinkSync(danglingTarget, danglingSecret);
    assert.throws(() => PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.zeroizeAndUnlinkOwnedFile(danglingSecret), (error: unknown) => error instanceof Error && "code" in error && error.code === "MACOS_SECRET_FILE_UNSAFE" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.readlinkSync(danglingSecret), danglingTarget);

    const recoveryRoot = path.join(parent, "slot-recovery");
    const slotRoot = path.join(recoveryRoot, "blocked-supervisor-pids");
    fs.mkdirSync(recoveryRoot, { mode: 0o700 });
    fs.mkdirSync(slotRoot, { mode: 0o700 });
    const commandShapeSha256 = hashFrame("blocked-slot-recovery-swap\n");
    const start = Object.freeze({ lane: "macos", family: "macos", logicalId: "slot-swap", startSequence: 0, commandShapeSha256, ownedResources: Object.freeze(["macos-process-group"]) });
    const startId = PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.blockedStartId({ ...start, runId: path.basename(recoveryRoot) });
    const releaseAuthoritySha256 = hashFrame("blocked-slot-release\n");
    const slotPath = path.join(slotRoot, `${startId.slice(7)}.jsonl`);
    const displacedSlot = `${slotPath}.displaced`;
    const readyBytes = Buffer.from(`${JSON.stringify({ pid: 999_999, releaseAuthoritySha256, schemaVersion: "r4_gate_b_blocked_supervisor_ready.v2", startId })}\n`, "utf8");
    fs.writeFileSync(slotPath, readyBytes, { flag: "wx", mode: 0o600 });
    const originalSlot = fs.lstatSync(slotPath);
    const originalLstat = fs.lstatSync;
    const mutableFs = fs as unknown as { lstatSync: typeof fs.lstatSync };
    let slotReads = 0;
    let slotSwapped = false;
    mutableFs.lstatSync = ((candidate: fs.PathLike, options?: unknown) => {
      if (String(candidate) === slotPath) {
        slotReads += 1;
        if (!slotSwapped && slotReads === 4) {
          fs.renameSync(slotPath, displacedSlot);
          fs.writeFileSync(slotPath, readyBytes, { flag: "wx", mode: 0o600 });
          slotSwapped = true;
        }
      }
      return originalLstat(candidate, options as never);
    }) as typeof fs.lstatSync;
    const appended: unknown[] = [];
    try {
      await assert.rejects(PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.recoverUnstartedBlockedSupervisors(recoveryRoot, [start], { async append(record: unknown) { appended.push(record); } }), (error: unknown) => error instanceof Error && "code" in error && error.code === "BLOCKED_SUPERVISOR_SLOT_IDENTITY_DRIFT" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { mutableFs.lstatSync = originalLstat; }
    assert.equal(slotSwapped, true);
    assert.deepEqual(appended, []);
    assert.equal(fs.lstatSync(displacedSlot).ino, originalSlot.ino);
    assert.notEqual(fs.lstatSync(slotPath).ino, originalSlot.ino);
    assert.deepEqual(fs.readFileSync(slotPath), readyBytes);
    fs.unlinkSync(slotPath);
    fs.symlinkSync(path.join(slotRoot, "missing-owner-slot"), slotPath);
    const carried = Object.freeze({ pid: 999_999, startId, releaseAuthoritySha256, device: originalSlot.dev, inode: originalSlot.ino });
    assert.throws(() => PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.removeObservedSupervisorSlot(slotPath, startId, releaseAuthoritySha256, 999_999, carried), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.readlinkSync(slotPath), path.join(slotRoot, "missing-owner-slot"));
    readyBytes.fill(0);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});

test("successor runner accepts only the eight frozen v1/v2 argument shapes", () => {
  assert.deepEqual(parsePhysicalRunnerArguments(["construct-physical-adapters"]), { mode: "construct-physical-adapters" });
  assert.deepEqual(parsePhysicalRunnerArguments(["finalize-host-binding"]), { mode: "finalize-host-binding" });
  assert.deepEqual(parsePhysicalRunnerArguments(["cleanup-construction", "--construction-packet-sha", "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06"]), { mode: "cleanup-construction", constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06" });
  const hash = `sha256:${"a".repeat(64)}`;
  const receipt = Buffer.from(canonicalJson({ schemaVersion: "fixture" }), "utf8").toString("base64url");
  assert.deepEqual(parsePhysicalRunnerArguments(["prepare-host-binding-reattempt", "--validation-receipt", receipt, "--authority-audit-receipt", receipt, "--host-audit-receipt", receipt]), { mode: "prepare-host-binding-reattempt", validationReceipt: receipt, authorityAuditReceipt: receipt, hostAuditReceipt: receipt });
  assert.deepEqual(parsePhysicalRunnerArguments(["finalize-host-binding-reattempt", "--checkpoint-sha", hash, "--activation-card-sha", hash, "--activation-grant-sha", hash]), { mode: "finalize-host-binding-reattempt", checkpointSha256: hash, activationCardSha256: hash, activationGrantSha256: hash });
  assert.deepEqual(parsePhysicalRunnerArguments(["cleanup-host-binding-reattempt", "--packet-sha", HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256]), { mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 });
  assert.deepEqual(parsePhysicalRunnerArguments(["execute-core-retry", "--manifest-sha", hash, "--execution-grant", hash, "--host-binding-id", "b".repeat(32)]), { mode: "execute-core-retry", manifestSha256: hash, executionGrantSha256: hash, hostBindingId: "b".repeat(32) });
  for (const argv of [[], ["--help"], ["construct-physical-adapters", "extra"], ["prepare-host-binding-reattempt", "--validation-receipt", `${receipt}=`, "--authority-audit-receipt", receipt, "--host-audit-receipt", receipt], ["finalize-host-binding-reattempt", "--checkpoint-sha", hash, "--activation-card-sha", hash, "--activation-grant-sha", "invalid"], ["cleanup-host-binding-reattempt", "--packet-sha", `sha256:${"b".repeat(64)}`], ["execute-core-retry"], ["execute-core-retry", "--manifest-sha", hash, "--execution-grant", `sha256:${"b".repeat(64)}`, "--host-binding-id", "b".repeat(32)]]) assert.throws(() => parsePhysicalRunnerArguments(argv), /PHYSICAL_RUNNER_ARGUMENTS_DENIED/u);
});

test("direct runner errors emit an admitted v2 terminal frame exactly and retain the generic pre-admission envelope", () => {
  const terminalResult = Object.freeze({ schemaVersion: "r4_gate_b_host_binding_reattempt_terminal.v2", status: "RED_QUARANTINED", reasonCode: "FIXTURE" });
  const admitted = new PhysicalRunnerError("HOST_BINDING_REATTEMPT_FIXTURE", "RED_QUARANTINED") as PhysicalRunnerError & { terminalResult: typeof terminalResult };
  admitted.terminalResult = terminalResult;
  assert.equal(physicalRunnerDirectErrorBody(admitted), terminalResult, "an admitted failure must not wrap or nest the canonical terminal frame");
  assert.deepEqual(physicalRunnerDirectErrorBody(new PhysicalRunnerError("HOST_BINDING_REATTEMPT_PREADMISSION_FIXTURE", "RED")), {
    schemaVersion: "r4_gate_b_physical_runner_error.v1",
    code: "HOST_BINDING_REATTEMPT_PREADMISSION_FIXTURE",
    verdict: "RED",
  });
  const source = fs.readFileSync(path.join(root, "scripts/r4-gate-b-physical-runner.mjs"), "utf8");
  const directCatch = source.slice(source.indexOf("if (direct) {"));
  assert.match(directCatch, /physicalRunnerDirectErrorBody\(error\)/u);
  assert.match(directCatch, /process\.exitCode = 1/u);
});

test("reattempt authority derives the approved run id independently and freezes the exact 12-path workset", () => {
  const preimage = `r4-gate-b-host-binding-reattempt-v2\n${HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256}\n${HOST_BINDING_REATTEMPT_AUTHORITY.ownerReviewSha256}\n${HOST_BINDING_REATTEMPT_AUTHORITY.proposalHead}\n${HOST_BINDING_REATTEMPT_AUTHORITY.proposalTree}\n`;
  const independentlyDerived = createHash("sha256").update(Buffer.from(preimage, "utf8")).digest("hex").slice(0, 32);
  assert.equal(independentlyDerived, "5cf5b31b5adfceac7fda4d5319db8957");
  assert.equal(deriveHostBindingReattemptRunId(HOST_BINDING_REATTEMPT_AUTHORITY), independentlyDerived);
  assert.equal(HOST_BINDING_REATTEMPT_WORKSET.length, 12);
  assert.deepEqual(HOST_BINDING_REATTEMPT_WORKSET.filter((entry: { status: string }) => entry.status === "A").map((entry: { path: string }) => entry.path).sort(), [
    "schemas/r4/gate-b-core/host-binding-reattempt-capsule.schema.json",
    "schemas/r4/gate-b-core/host-binding-reattempt-checkpoint.schema.json",
    "schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json",
    "schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json",
    "schemas/r4/gate-b-core/host-binding-reattempt-public-receipt.schema.json",
  ]);
  assert.equal(HOST_BINDING_REATTEMPT_WORKSET.filter((entry: { status: string }) => entry.status === "M").length, 7);
  assert.deepEqual({ preparation: HOST_BINDING_REATTEMPT_AUTHORITY.preparationGrant, host: HOST_BINDING_REATTEMPT_AUTHORITY.hostBindingAttemptGrant, retry: HOST_BINDING_REATTEMPT_AUTHORITY.retryExecutionGrant, provider: HOST_BINDING_REATTEMPT_AUTHORITY.firstProviderCallGrant }, { preparation: "APPROVED", host: "NOT_REQUESTED", retry: "NOT_REQUESTED", provider: "NOT_REQUESTED" });
});

test("reattempt journal binds slot and Host environment directory identities in one exact order", () => {
  const tombstoneSha256 = hashFrame("reattempt-owned-directory-tombstone\n");
  const slotIntentSha256 = hashFrame("r4-gate-b-blocked-start-slot-root.v1\n");
  let sequence = 0;
  const record = (overrides: Record<string, unknown>) => Object.freeze({
    schemaVersion: "r4_gate_b_physical_journal.v1", sequence: sequence++, previousRecordSha256: null, runId: HOST_BINDING_REATTEMPT_AUTHORITY.runId, manifestSha256: null,
    hostBindingId: null, lane: "host-binding", event: "fixture", commandShapeSha256: null, processGroupId: null, ownedResources: Object.freeze([]), terminalCode: null, cleanupState: "required", ...overrides,
  });
  const prefix = [
    record({ event: "input-open-intent", commandShapeSha256: tombstoneSha256, ownedResources: ["owner-input-envelope"] }),
    record({ event: "intent:blocked-start-slot-root", commandShapeSha256: slotIntentSha256, ownedResources: ["blocked-start-slot-root"] }),
    record({ event: "observed:blocked-start-slot-root", commandShapeSha256: hashFrame("slot-root-identity\n"), ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED" }),
  ];
  for (const spec of HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS) {
    prefix.push(record({ event: `environment-directory-create-intent:${spec.name}`, commandShapeSha256: hostBindingReattemptEnvironmentDirectoryIntentSha256(HOST_BINDING_REATTEMPT_AUTHORITY.runId, spec.name), ownedResources: [spec.ownedResource] }));
    prefix.push(record({ event: `environment-directory-created:${spec.name}`, commandShapeSha256: hashFrame(`environment-directory-identity:${spec.name}\n`), ownedResources: [spec.ownedResource], terminalCode: "CREATED" }));
  }
  prefix.push(record({ event: "intent:docker-client-version", commandShapeSha256: hashFrame("docker-client-intent\n"), ownedResources: ["inspector-process-group"] }));
  const options = { inputOpenCommandFrame: "fixed-owner-input-open-v2\n", inputOpenCommandShapeSha256: tombstoneSha256, publicationTerminalCode: "HOST_BOUND_YELLOW", capsuleRootIdentityRequired: true, ownedDirectoryIdentityRequired: true };
  const plan = validateConstructionJournalForCleanup(prefix, options);
  assert.equal(plan.slotRootObserved, true);
  assert.equal(plan.slotRootIdentitySha256, hashFrame("slot-root-identity\n"));
  assert.deepEqual(plan.environmentDirectoryPlans.map((entry: { name: string; intentObserved: boolean; createdObserved: boolean; identitySha256: string }) => ({ name: entry.name, intent: entry.intentObserved, created: entry.createdObserved, identity: entry.identitySha256 })), HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.map((spec: { name: string }) => ({ name: spec.name, intent: true, created: true, identity: hashFrame(`environment-directory-identity:${spec.name}\n`) })));

  const swapped = [...prefix];
  [swapped[3], swapped[5]] = [swapped[5]!, swapped[3]!];
  assert.throws(() => validateConstructionJournalForCleanup(swapped, options), /CONSTRUCTION_JOURNAL_ENVIRONMENT_DIRECTORY_ORDER_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(prefix.slice(0, 4).concat(prefix.at(-1)!), options), /CONSTRUCTION_JOURNAL_ENVIRONMENT_DIRECTORY_PAIR_INTERRUPTED/u);
  const legacyPrefix = [prefix[0]!, prefix[1]!, Object.freeze({ ...prefix[2]!, commandShapeSha256: slotIntentSha256 })];
  assert.doesNotThrow(() => validateConstructionJournalForCleanup(legacyPrefix, { ...options, ownedDirectoryIdentityRequired: false }));
});

test("Gate P preparation has a source-closed boundary with no Host input capability", () => {
  const source = fs.readFileSync(path.join(root, "scripts/r4-gate-b-physical-runner.mjs"), "utf8");
  const start = source.indexOf("const HOST_BINDING_REATTEMPT_NO_INPUT_SENTINEL");
  const end = source.indexOf("\nfunction hostBindingReattemptJournalRecord", start);
  assert.ok(start >= 0 && end > start);
  const preparationBoundary = source.slice(start, end);
  for (const forbidden of ["REATTEMPT_INPUT_PATH", "readAndConsumeHostBindingReattemptInput", "removeHostBindingInputEnvelope", "proveHostBindingReattemptInputAbsent"]) assert.equal(preparationBoundary.includes(forbidden), false, `Gate P preparation must not reference ${forbidden}`);
  const signature = preparationBoundary.slice(preparationBoundary.indexOf("export function prepareHostBindingReattempt"), preparationBoundary.indexOf("} = {}) {", preparationBoundary.indexOf("export function prepareHostBindingReattempt")));
  for (const forbiddenOption of ["inputPath", "inputReader", "inputConsumer", "inputRemover", "inputAbsenceProver"]) assert.equal(signature.includes(forbiddenOption), false, `Gate P options must not expose ${forbiddenOption}`);
  const finalizeStart = source.indexOf("export async function finalizeHostBindingReattemptOnce");
  const finalizeAdmissionEnd = source.indexOf("rejectHostBindingReattemptTombstoneCollision(consumedAttemptPath);", finalizeStart);
  assert.ok(finalizeStart >= 0 && finalizeAdmissionEnd > finalizeStart);
  const finalizeAdmission = source.slice(finalizeStart, finalizeAdmissionEnd);
  assert.match(finalizeAdmission, /now = hostBindingReattemptNow/u);
  assert.match(finalizeAdmission, /now !== hostBindingReattemptNow/u, "production admission must reject an injected clock before any tombstone or Host input access");
});

test("Gate P reattempt preparation publishes only an authenticated checkpoint and never touches the Host input port", async () => {
  const fixtureParent = fs.realpathSync(fs.mkdtempSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-reattempt-prepare-")));
  fs.chmodSync(fixtureParent, 0o700);
  const implementationHead = "a".repeat(40);
  const implementationTree = "b".repeat(40);
  const validationAggregateSha256 = hashFrame("reattempt-validation\n");
  const encode = (value: unknown) => Buffer.from(canonicalJson(value), "utf8").toString("base64url");
  const validationReceipt = encode({
    schemaVersion: "r4_gate_b_host_binding_reattempt_validation_receipt.v2", implementationHead, implementationTree, status: "PASS", validationAggregateSha256,
    hostBindingInputAccessed: false, hostBindingInputPresenceObserved: false, dockerReadOnlyCliCalls: 0, localDockerUnixSocketRequests: 0, macosReadOnlyInspectionCalls: 0, realPhysicalEffects: 0, retryExecutions: 0, providerCalls: 0,
  });
  const auditReceipt = (auditClass: string) => encode({ schemaVersion: "r4_gate_b_host_binding_reattempt_audit_receipt.v2", auditClass, implementationHead, implementationTree, status: "PASS", findingsCount: 0, blockerCount: 0, importantCount: 0, summarySha256: hashFrame(`${auditClass}\n`) });
  const input = Object.freeze({ mode: "prepare-host-binding-reattempt", validationReceipt, authorityAuditReceipt: auditReceipt("authority-checkpoint-journal-cleanup"), hostAuditReceipt: auditReceipt("host-admission-counters-zeroization-publication") });
  const runtime = runtimeDependencyInventory(root);
  const authority = Object.freeze({ implementationHead, implementationTree, changedPathCount: 12, worksetAggregateSha256: hashFrame("prefixed-workset-lines\n") });
  const hashFile = (relativePath: string) => `sha256:${createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex")}`;
  const counters = { directoryListCalls: 0, statCalls: 0, openCalls: 0, readCalls: 0, removeCalls: 0, presenceObservations: 0 };
  let sentinelSnapshots = 0;
  const inputAccessSentinel = Object.freeze({ snapshot() { sentinelSnapshots += 1; return Object.freeze({ ...counters }); } });
  const prepareAt = (name: string, overrides: Record<string, unknown> = {}) => {
    const reattemptRoot = path.join(fixtureParent, name);
    return Object.freeze({
      reattemptRoot,
      options: {
        reattemptRoot,
        rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
        consumedAttemptPath: path.join(fixtureParent, `${name}.consumed.json`),
        publicReceiptPath: path.join(fixtureParent, `${name}.public.json`),
        capsuleRoot: path.join(fixtureParent, `${name}.capsules`),
        authorityVerifier: () => authority,
        runtimeInventory: () => runtime,
        hashFile,
        activationCardFactory: createHostBindingReattemptActivationCard,
        inputAccessSentinel,
        ...overrides,
      },
    });
  };
  type FixtureJournal = { append(record: Record<string, unknown>): Promise<unknown> };
  const appendEnvironmentDirectoryFixtures = async (journal: FixtureJournal, reattemptRoot: string) => {
    for (const spec of HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS) {
      await journal.append({ lane: "host-binding", event: `environment-directory-create-intent:${spec.name}`, commandShapeSha256: hostBindingReattemptEnvironmentDirectoryIntentSha256(HOST_BINDING_REATTEMPT_AUTHORITY.runId, spec.name), ownedResources: [spec.ownedResource], cleanupState: "required" });
      const directory = path.join(reattemptRoot, spec.name);
      fs.mkdirSync(directory, { mode: 0o700 });
      await journal.append({ lane: "host-binding", event: `environment-directory-created:${spec.name}`, commandShapeSha256: hostBindingReattemptEnvironmentDirectoryIdentitySha256(HOST_BINDING_REATTEMPT_AUTHORITY.runId, spec.name, fs.lstatSync(directory)), ownedResources: [spec.ownedResource], terminalCode: "CREATED", cleanupState: "required" });
    }
  };
  try {
    const green = prepareAt("green");
    const card = prepareHostBindingReattempt(input, green.options);
    assert.equal(card.schemaVersion, "r4_gate_b_host_binding_activation_card.v2");
    assert.equal(card.status, "WAITING_OWNER_ACTIVATION");
    assert.equal(card.hostBindingInputAccessed, false);
    assert.equal(card.hostBindingInputPresenceObserved, false);
    assert.deepEqual(fs.readdirSync(green.reattemptRoot), ["checkpoint.v2.json"]);
    const checkpointBytes = fs.readFileSync(path.join(green.reattemptRoot, "checkpoint.v2.json"));
    assert.equal(card.checkpointSha256, `sha256:${createHash("sha256").update(checkpointBytes).digest("hex")}`);
    assert.equal(checkpointBytes.at(-1), 0x0a);
    checkpointBytes.fill(0);
    assert.deepEqual(counters, { directoryListCalls: 0, statCalls: 0, openCalls: 0, readCalls: 0, removeCalls: 0, presenceObservations: 0 });
    assert.ok(sentinelSnapshots >= 2);

    const cardFault = prepareAt("card-fault", { activationCardFactory: () => { throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_CARD_FIXTURE_FAULT", "RED"); } });
    assert.throws(() => prepareHostBindingReattempt(input, cardFault.options), /HOST_BINDING_REATTEMPT_CARD_FIXTURE_FAULT/u);
    assert.equal(fs.existsSync(cardFault.reattemptRoot), false, "a deterministic Card fault before claim commit must remove the exact checkpoint, claim and root");

    const hookNames = ["onTemporaryDurable", "onLinkDurable", "onPublishedDurable"] as const;
    for (const hookName of hookNames) {
      const checkpointWriter = (target: string, bytes: Buffer, mode: number, options: Record<string, unknown>) => atomicWritePrivateFile(target, bytes, mode, {
        ...options,
        [hookName](publication: unknown) {
          (options[hookName] as (value: unknown) => void)(publication);
          throw new PhysicalRunnerError(`HOST_BINDING_REATTEMPT_${hookName.toUpperCase()}_FIXTURE_FAULT`, "RED");
        },
      });
      const fault = prepareAt(`hook-${hookName}`, { checkpointWriter });
      assert.throws(() => prepareHostBindingReattempt(input, fault.options), new RegExp(`HOST_BINDING_REATTEMPT_${hookName.toUpperCase()}_FIXTURE_FAULT`, "u"));
      assert.equal(fs.existsSync(fault.reattemptRoot), false, `${hookName} pre-commit fault must roll back the exact root`);
    }

    const mutableFs = fs as typeof fs & { writeSync: typeof fs.writeSync; fsyncSync: typeof fs.fsyncSync; unlinkSync: typeof fs.unlinkSync; rmdirSync: typeof fs.rmdirSync; closeSync: typeof fs.closeSync; linkSync: typeof fs.linkSync };
    const factoryFaults = [
      {
        name: "claim-partial-write",
        factory(args: Parameters<typeof createHostBindingReattemptCheckpointClaim>[0]) {
          const original = mutableFs.writeSync;
          let calls = 0;
          mutableFs.writeSync = ((...writeArgs: Parameters<typeof fs.writeSync>) => {
            calls += 1;
            if (calls === 1) return Math.max(1, Math.floor(Number(writeArgs[3]) / 2));
            throw new Error("CLAIM_PARTIAL_WRITE_FIXTURE_FAULT");
          }) as typeof fs.writeSync;
          try { return createHostBindingReattemptCheckpointClaim(args); } finally { mutableFs.writeSync = original; }
        },
      },
      {
        name: "claim-append-fsync",
        factory(args: Parameters<typeof createHostBindingReattemptCheckpointClaim>[0]) {
          const original = mutableFs.fsyncSync;
          let calls = 0;
          mutableFs.fsyncSync = ((fd: number) => { calls += 1; if (calls === 3) throw new Error("CLAIM_APPEND_FSYNC_FIXTURE_FAULT"); return original(fd); }) as typeof fs.fsyncSync;
          try { return createHostBindingReattemptCheckpointClaim(args); } finally { mutableFs.fsyncSync = original; }
        },
      },
    ];
    for (const faultCase of factoryFaults) {
      const fault = prepareAt(faultCase.name, { checkpointClaimFactory: faultCase.factory });
      assert.throws(() => prepareHostBindingReattempt(input, fault.options));
      assert.equal(fs.existsSync(fault.reattemptRoot), false, `${faultCase.name} must leave no Gate-P root before commitStarted`);
    }

    const commitFaultFactory = (kind: "unlink" | "root-fsync" | "fd-close") => (args: Parameters<typeof createHostBindingReattemptCheckpointClaim>[0]) => {
      const claim = createHostBindingReattemptCheckpointClaim(args);
      return Object.freeze({
        ...claim,
        commit() {
          const originalUnlink = mutableFs.unlinkSync;
          const originalFsync = mutableFs.fsyncSync;
          const originalClose = mutableFs.closeSync;
          let closeCalls = 0;
          if (kind === "unlink") mutableFs.unlinkSync = ((candidate: fs.PathLike) => { if (candidate === claim.path) throw new Error("CLAIM_COMMIT_UNLINK_FIXTURE_FAULT"); return originalUnlink(candidate); }) as typeof fs.unlinkSync;
          if (kind === "root-fsync") mutableFs.fsyncSync = ((fd: number) => { if (fd === args.rootAuthority.rootFd) throw new Error("CLAIM_COMMIT_ROOT_FSYNC_FIXTURE_FAULT"); return originalFsync(fd); }) as typeof fs.fsyncSync;
          if (kind === "fd-close") mutableFs.closeSync = ((fd: number) => { closeCalls += 1; if (closeCalls === 1) throw new Error("CLAIM_COMMIT_CLOSE_FIXTURE_FAULT"); return originalClose(fd); }) as typeof fs.closeSync;
          try { return claim.commit(); }
          finally { mutableFs.unlinkSync = originalUnlink; mutableFs.fsyncSync = originalFsync; mutableFs.closeSync = originalClose; }
        },
      });
    };
    for (const kind of ["unlink", "root-fsync", "fd-close"] as const) {
      const fault = prepareAt(`commit-${kind}`, { checkpointClaimFactory: commitFaultFactory(kind) });
      assert.throws(() => prepareHostBindingReattempt(input, fault.options), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
      assert.equal(fs.existsSync(fault.reattemptRoot), true, `${kind} uncertainty after commitStarted must preserve the authenticated root`);
      if (kind === "unlink") {
        const authorityForRecovery = openExactOwnedRootAuthority({ root: fault.reattemptRoot, anchor: CANONICAL_SYSTEM_TEMP_ROOT, codePrefix: "HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_TEST" });
        const authenticated = readHostBindingReattemptCheckpointClaimForCleanup({ rootAuthority: authorityForRecovery });
        assert.deepEqual(reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: authorityForRecovery }), { rootAbsent: true, claimRecovered: true });
      }
    }

    const claimTailIdentity = (stat: fs.Stats) => Object.freeze({ size: stat.size, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, device: String(stat.dev), inode: String(stat.ino), nlink: stat.nlink, mtimeMilliseconds: Math.trunc(stat.mtimeMs) });
    const claimTailBytes = Buffer.from("host-binding-reattempt-claim-tail\n", "utf8");
    const claimTailSha256 = hashFrame("host-binding-reattempt-claim-tail\n");
    const buildClaimTail = (name: string, phase: 2 | 3 | 4) => {
      const reattemptRoot = path.join(fixtureParent, name);
      fs.mkdirSync(reattemptRoot, { mode: 0o700 });
      const rootAuthority = openExactOwnedRootAuthority({ root: reattemptRoot, anchor: CANONICAL_SYSTEM_TEMP_ROOT, codePrefix: "HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_TAIL_TEST" });
      const checkpointPath = path.join(reattemptRoot, "checkpoint.v2.json");
      const temporaryPath = path.join(reattemptRoot, `.checkpoint.v2.json.${HOST_BINDING_REATTEMPT_AUTHORITY.runId}.tmp`);
      const claim = createHostBindingReattemptCheckpointClaim({ rootAuthority, checkpointPath, checkpointSha256: claimTailSha256 });
      fs.writeFileSync(temporaryPath, claimTailBytes, { flag: "wx", mode: 0o600 });
      const temporaryFd = fs.openSync(temporaryPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      try { fs.fsyncSync(temporaryFd); } finally { fs.closeSync(temporaryFd); }
      claim.onTemporaryDurable(Object.freeze({ sha256: claimTailSha256, identity: claimTailIdentity(fs.lstatSync(temporaryPath)) }));
      if (phase >= 3) {
        fs.linkSync(temporaryPath, checkpointPath);
        fs.fsyncSync(rootAuthority.rootFd);
        claim.onLinkDurable(Object.freeze({ sha256: claimTailSha256, identity: claimTailIdentity(fs.lstatSync(checkpointPath)) }));
      }
      if (phase === 4) {
        fs.unlinkSync(temporaryPath);
        fs.fsyncSync(rootAuthority.rootFd);
        claim.onPublishedDurable(Object.freeze({ sha256: claimTailSha256, identity: claimTailIdentity(fs.lstatSync(checkpointPath)) }));
      }
      return Object.freeze({ reattemptRoot, rootAuthority, checkpointPath, temporaryPath, claim });
    };
    try {
      for (const phase of [2, 3, 4] as const) {
        const claimTail = buildClaimTail(`claim-only-tail-records-${phase}`, phase);
        try {
          for (const alias of [claimTail.temporaryPath, claimTail.checkpointPath]) if (fs.existsSync(alias)) fs.unlinkSync(alias);
          claimTail.claim.closeForRecovery();
          let authenticated = readHostBindingReattemptCheckpointClaimForCleanup({ rootAuthority: claimTail.rootAuthority });
          if (phase === 2) {
            const originalLstat = fs.lstatSync;
            (fs as typeof fs & { lstatSync: typeof fs.lstatSync }).lstatSync = ((candidate: fs.PathLike, options?: fs.StatOptions) => {
              if (String(candidate) === claimTail.checkpointPath) throw Object.assign(new Error("HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_ALIAS_UNKNOWN_FIXTURE"), { code: "EIO" });
              return originalLstat(candidate, options as never);
            }) as typeof fs.lstatSync;
            try {
              assert.throws(() => reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: claimTail.rootAuthority }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_FINAL_UNREADABLE" && "verdict" in error && error.verdict === "RED_QUARANTINED");
            } finally { (fs as typeof fs & { lstatSync: typeof fs.lstatSync }).lstatSync = originalLstat; }
            assert.deepEqual(fs.readdirSync(claimTail.reattemptRoot), ["checkpoint-claim.v2.jsonl"], "an unknown alias observation must preserve the exact claim-only root");
          }
          if (phase === 3) {
            const originalFsync = mutableFs.fsyncSync;
            let aliasAbsenceFsyncFault = false;
            mutableFs.fsyncSync = ((fd: number) => {
              if (!aliasAbsenceFsyncFault && fd === claimTail.rootAuthority.rootFd) { aliasAbsenceFsyncFault = true; throw new Error("HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_ALIAS_ABSENCE_FSYNC_FIXTURE"); }
              return originalFsync(fd);
            }) as typeof fs.fsyncSync;
            try {
              assert.throws(() => reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: claimTail.rootAuthority }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_RECOVERY_UNCERTAIN" && "verdict" in error && error.verdict === "RED_QUARANTINED");
            } finally { mutableFs.fsyncSync = originalFsync; }
            assert.equal(aliasAbsenceFsyncFault, true);
            assert.deepEqual(fs.readdirSync(claimTail.reattemptRoot), ["checkpoint-claim.v2.jsonl"], "a fault after the last alias unlink must retain the exact claim until alias absence is durable");
            authenticated = readHostBindingReattemptCheckpointClaimForCleanup({ rootAuthority: claimTail.rootAuthority });
          }
          assert.deepEqual(reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: claimTail.rootAuthority }), { rootAbsent: true, claimRecovered: true });
          assert.equal(fs.existsSync(claimTail.reattemptRoot), false, `records=${phase} claim-only cleanup tail must be idempotently removable`);
        } finally {
          closeExactOwnedRootAuthority(claimTail.rootAuthority);
          fs.rmSync(claimTail.reattemptRoot, { recursive: true, force: true });
        }
      }

      const replacementTail = buildClaimTail("claim-only-tail-replacement", 4);
      try {
        fs.unlinkSync(replacementTail.checkpointPath);
        fs.writeFileSync(replacementTail.checkpointPath, claimTailBytes, { flag: "wx", mode: 0o600 });
        replacementTail.claim.closeForRecovery();
        const authenticated = readHostBindingReattemptCheckpointClaimForCleanup({ rootAuthority: replacementTail.rootAuthority });
        assert.throws(() => reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: replacementTail.rootAuthority }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CHECKPOINT_CLAIM_FILE_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED");
        assert.equal(fs.readFileSync(replacementTail.checkpointPath).equals(claimTailBytes), true, "a replacement checkpoint alias must be preserved for quarantine");
        assert.equal(fs.existsSync(path.join(replacementTail.reattemptRoot, "checkpoint-claim.v2.jsonl")), true);
        fs.unlinkSync(replacementTail.checkpointPath);
        assert.deepEqual(reconcileHostBindingReattemptCheckpointClaimForCleanup({ ...authenticated, rootAuthority: replacementTail.rootAuthority }), { rootAbsent: true, claimRecovered: true });
      } finally {
        closeExactOwnedRootAuthority(replacementTail.rootAuthority);
        fs.rmSync(replacementTail.reattemptRoot, { recursive: true, force: true });
      }
    } finally { claimTailBytes.fill(0); }

    const originalRollbackTailFsync = mutableFs.fsyncSync;
    let rollbackTailRootFd: number | null = null;
    let rollbackTailArmed = false;
    let rollbackTailFsyncFault = false;
    const rollbackTail = prepareAt("prepare-rollback-final-unlink-tail", {
      activationCardFactory() { rollbackTailArmed = true; throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_ROLLBACK_TAIL_CARD_FIXTURE", "RED"); },
      checkpointClaimFactory(args: Parameters<typeof createHostBindingReattemptCheckpointClaim>[0]) { rollbackTailRootFd = args.rootAuthority.rootFd; return createHostBindingReattemptCheckpointClaim(args); },
    });
    mutableFs.fsyncSync = ((fd: number) => {
      if (rollbackTailArmed && fd === rollbackTailRootFd && !rollbackTailFsyncFault) { rollbackTailFsyncFault = true; throw new Error("HOST_BINDING_REATTEMPT_ROLLBACK_TAIL_ROOT_FSYNC_FIXTURE"); }
      return originalRollbackTailFsync(fd);
    }) as typeof fs.fsyncSync;
    try {
      assert.throws(() => prepareHostBindingReattempt(input, rollbackTail.options), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_ROLLBACK_TAIL_CARD_FIXTURE" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { mutableFs.fsyncSync = originalRollbackTailFsync; }
    assert.equal(rollbackTailFsyncFault, true);
    assert.deepEqual(fs.readdirSync(rollbackTail.reattemptRoot), ["checkpoint-claim.v2.jsonl"], "a rollback fault after final unlink must preserve the authenticated claim-only tail");
    const recoveredRollbackTail = await cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      ...rollbackTail.options,
      inputPath: path.join(fixtureParent, "prepare-rollback-tail-input-must-not-be-observed.json"),
    });
    assert.equal(recoveredRollbackTail.status, "GREEN");
    assert.equal(recoveredRollbackTail.claimRecovered, true);
    assert.equal(fs.existsSync(rollbackTail.reattemptRoot), false);

    const admitted = prepareAt("admitted-yellow");
    const activationCard = prepareHostBindingReattempt(input, admitted.options);
    const activationCardSha256 = hashFrame(canonicalJson(activationCard));
    const activationGrant = Object.freeze({
      schemaVersion: "r4_gate_b_host_binding_activation_grant.v2",
      activationCardSha256,
      attemptOrdinal: 2,
      checkpointSha256: activationCard.checkpointSha256,
      firstProviderCallGrant: "NOT_REQUESTED",
      hostBindingAttemptGrant: "APPROVED_ONCE",
      hostBindingInputPreparedByOwner: true,
      implementationHead,
      implementationTree,
      retryExecutionGrant: "NOT_REQUESTED",
    });
    const activationGrantSha256 = hashFrame(canonicalJson(activationGrant));
    const neverOpenedInput = path.join(fixtureParent, "owner-input-never-created.json");
    const inputConsumer = (_inputPath: string) => {
      const error = new PhysicalRunnerError("HOST_BINDING_INCOMPLETE_YELLOW", "YELLOW_NO_RETRY") as PhysicalRunnerError & { inputObservation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean } };
      error.inputObservation = Object.freeze({ accessed: true, openCalls: 0, removedOrAbsent: true });
      throw error;
    };
    const preAdmission = prepareAt("preadmission-grant-denied");
    const preAdmissionCard = prepareHostBindingReattempt(input, preAdmission.options);
    let preAdmissionInputCalls = 0;
    let preAdmissionTombstoneCalls = 0;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: preAdmissionCard.checkpointSha256, activationCardSha256: hashFrame(canonicalJson(preAdmissionCard)), activationGrantSha256: `sha256:${"f".repeat(64)}` }, {
      ...preAdmission.options,
      inputPath: path.join(fixtureParent, "preadmission-input-must-not-be-observed.json"),
      inputConsumer() { preAdmissionInputCalls += 1; throw new Error("PREADMISSION_INPUT_MUST_NOT_RUN"); },
      tombstoneFactory(args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) { preAdmissionTombstoneCalls += 1; return createPermanentHostBindingReattemptConsumedAttempt(args); },
      processPortFactory() { throw new Error("PREADMISSION_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("PREADMISSION_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("PREADMISSION_HOST_FINALIZER_MUST_NOT_RUN"); },
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_HASH_MISMATCH" && (error as { terminalResult?: unknown }).terminalResult === undefined);
    assert.equal(preAdmissionInputCalls, 0);
    assert.equal(preAdmissionTombstoneCalls, 0);
    assert.equal(fs.existsSync(preAdmission.options.consumedAttemptPath as string), false);
    assert.equal(fs.existsSync(preAdmission.reattemptRoot), false);

    for (const collisionKind of ["public-receipt", "capsule-root"] as const) {
      const collision = prepareAt(`preadmission-${collisionKind}-collision`);
      const collisionCard = prepareHostBindingReattempt(input, collision.options);
      const collisionCardSha256 = hashFrame(canonicalJson(collisionCard));
      const collisionGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: collisionCardSha256, checkpointSha256: collisionCard.checkpointSha256 }));
      const publicReceiptPath = collision.options.publicReceiptPath as string;
      const capsuleRoot = collision.options.capsuleRoot as string;
      const sentinelPath = collisionKind === "public-receipt" ? publicReceiptPath : path.join(capsuleRoot, "owner-sentinel.txt");
      if (collisionKind === "public-receipt") fs.writeFileSync(publicReceiptPath, "owner-public-receipt-collision\n", { flag: "wx", mode: 0o644 });
      else {
        fs.mkdirSync(capsuleRoot, { mode: 0o700 });
        fs.writeFileSync(sentinelPath, "owner-capsule-root-collision\n", { flag: "wx", mode: 0o600 });
      }
      const sentinelBytes = fs.readFileSync(sentinelPath);
      let tombstoneCalls = 0;
      let inputCalls = 0;
      let inspectorCalls = 0;
      await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: collisionCard.checkpointSha256, activationCardSha256: collisionCardSha256, activationGrantSha256: collisionGrantSha256 }, {
        ...collision.options,
        inputPath: path.join(fixtureParent, `${collisionKind}-collision-input-must-not-be-observed.json`),
        tombstoneFactory(args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) { tombstoneCalls += 1; return createPermanentHostBindingReattemptConsumedAttempt(args); },
        inputConsumer() { inputCalls += 1; throw new Error("PREADMISSION_COLLISION_INPUT_MUST_NOT_RUN"); },
        processPortFactory() { throw new Error("PREADMISSION_COLLISION_PROCESS_PORT_MUST_NOT_RUN"); },
        inspectorFactory() { inspectorCalls += 1; throw new Error("PREADMISSION_COLLISION_INSPECTOR_MUST_NOT_RUN"); },
        hostFinalizer() { throw new Error("PREADMISSION_COLLISION_HOST_FINALIZER_MUST_NOT_RUN"); },
      }), (error: unknown) => error instanceof Error
        && "code" in error
        && error.code === (collisionKind === "public-receipt" ? "HOST_BINDING_REATTEMPT_PUBLIC_RECEIPT_PREEXISTS" : "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_PREEXISTS")
        && (error as { terminalResult?: unknown }).terminalResult === undefined);
      assert.equal(tombstoneCalls, 0, `${collisionKind} collision must stop before the permanent tombstone`);
      assert.equal(inputCalls, 0, `${collisionKind} collision must stop before Host input access`);
      assert.equal(inspectorCalls, 0, `${collisionKind} collision must stop before inspector construction`);
      assert.equal(fs.existsSync(collision.options.consumedAttemptPath as string), false);
      assert.equal(fs.existsSync(collision.reattemptRoot), false, `${collisionKind} collision must clean only the pre-admission checkpoint root`);
      assert.equal(fs.readFileSync(sentinelPath).equals(sentinelBytes), true, `${collisionKind} collision bytes must be preserved`);
      sentinelBytes.fill(0);
    }

    const unsafeReceiptParent = path.join(fixtureParent, "unsafe-public-receipt-parent");
    fs.mkdirSync(unsafeReceiptParent, { mode: 0o700 });
    fs.chmodSync(unsafeReceiptParent, 0o755);
    const unsafeReceipt = prepareAt("unsafe-public-receipt-parent-admission", { publicReceiptPath: path.join(unsafeReceiptParent, "receipt.json") });
    const unsafeReceiptCard = prepareHostBindingReattempt(input, unsafeReceipt.options);
    const unsafeReceiptCardSha256 = hashFrame(canonicalJson(unsafeReceiptCard));
    const unsafeReceiptGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: unsafeReceiptCardSha256, checkpointSha256: unsafeReceiptCard.checkpointSha256 }));
    let unsafeReceiptTombstoneCalls = 0;
    let unsafeReceiptInputCalls = 0;
    let unsafeReceiptInspectorCalls = 0;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: unsafeReceiptCard.checkpointSha256, activationCardSha256: unsafeReceiptCardSha256, activationGrantSha256: unsafeReceiptGrantSha256 }, {
      ...unsafeReceipt.options,
      inputPath: path.join(fixtureParent, "unsafe-parent-input-must-not-be-observed.json"),
      tombstoneFactory(args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) { unsafeReceiptTombstoneCalls += 1; return createPermanentHostBindingReattemptConsumedAttempt(args); },
      inputConsumer() { unsafeReceiptInputCalls += 1; throw new Error("UNSAFE_PARENT_INPUT_MUST_NOT_RUN"); },
      processPortFactory() { throw new Error("UNSAFE_PARENT_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { unsafeReceiptInspectorCalls += 1; throw new Error("UNSAFE_PARENT_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("UNSAFE_PARENT_HOST_FINALIZER_MUST_NOT_RUN"); },
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "OWNED_DIRECTORY_COMPONENT_UNSAFE" && (error as { terminalResult?: unknown }).terminalResult === undefined);
    assert.equal(unsafeReceiptTombstoneCalls, 0, "an unsafe public-receipt parent must stop before the permanent tombstone");
    assert.equal(unsafeReceiptInputCalls, 0, "an unsafe public-receipt parent must stop before Host input access");
    assert.equal(unsafeReceiptInspectorCalls, 0, "an unsafe public-receipt parent must stop before inspector construction");
    assert.equal(fs.existsSync(unsafeReceipt.options.consumedAttemptPath as string), false);
    assert.equal(fs.existsSync(unsafeReceipt.reattemptRoot), false);

    const foreignDomain = prepareAt("foreign-construction-journal-domain");
    const foreignDomainCard = prepareHostBindingReattempt(input, foreignDomain.options);
    const foreignDomainCardSha256 = hashFrame(canonicalJson(foreignDomainCard));
    const foreignDomainGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: foreignDomainCardSha256, checkpointSha256: foreignDomainCard.checkpointSha256 }));
    let foreignDomainStopCalls = 0;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: foreignDomainCard.checkpointSha256, activationCardSha256: foreignDomainCardSha256, activationGrantSha256: foreignDomainGrantSha256 }, {
      ...foreignDomain.options,
      inputPath: path.join(fixtureParent, "foreign-domain-input-never-created.json"),
      journalFactory(rootAuthority: Parameters<typeof createHostBindingReattemptJournal>[0]) {
        const journal = createHostBindingReattemptJournal(rootAuthority);
        let domainPrimed = false;
        return Object.freeze({
          ...journal,
          async append(partial: Record<string, unknown>) {
            if (!domainPrimed) {
              domainPrimed = true;
              await journal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: ["construction-run-root", "fake-process-groups"] });
            }
            return journal.append(partial);
          },
        });
      },
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 0, removedOrAbsent: true }));
        throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_FOREIGN_DOMAIN_FIXTURE", "YELLOW_NO_RETRY");
      },
      processPortFactory() { throw new Error("FOREIGN_DOMAIN_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("FOREIGN_DOMAIN_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("FOREIGN_DOMAIN_HOST_FINALIZER_MUST_NOT_RUN"); },
      stopProcessGroup() { foreignDomainStopCalls += 1; return true; },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_FOREIGN_DOMAIN_FIXTURE" && "verdict" in error && error.verdict === "RED_QUARANTINED" && (error as { terminalResult?: { status?: string } }).terminalResult?.status === "RED_QUARANTINED");
    assert.equal(foreignDomainStopCalls, 0, "a foreign-domain journal must be rejected before any process signaling");
    assert.equal(fs.existsSync(foreignDomain.reattemptRoot), true, "a foreign-domain journal and checkpoint must be preserved for quarantine");
    assert.equal(fs.existsSync(foreignDomain.options.consumedAttemptPath as string), true, "the permanent consumed-attempt tombstone must be preserved");
    assert.deepEqual(fs.readdirSync(foreignDomain.reattemptRoot).sort(), ["checkpoint.v2.json", "journal.v2.jsonl"]);
    await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      ...foreignDomain.options,
      inputPath: path.join(fixtureParent, "foreign-domain-input-never-created.json"),
      stopProcessGroup() { foreignDomainStopCalls += 1; return true; },
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_JOURNAL_DOMAIN_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(foreignDomainStopCalls, 0, "standalone cleanup must reject a foreign-domain journal before any process signaling");
    assert.deepEqual(fs.readdirSync(foreignDomain.reattemptRoot).sort(), ["checkpoint.v2.json", "journal.v2.jsonl"], "standalone cleanup must preserve the foreign journal and checkpoint");

    const preCreateFault = prepareAt("tombstone-pre-create-open-fault");
    const preCreateCard = prepareHostBindingReattempt(input, preCreateFault.options);
    const preCreateCardSha256 = hashFrame(canonicalJson(preCreateCard));
    const preCreateGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: preCreateCardSha256, checkpointSha256: preCreateCard.checkpointSha256 }));
    let preCreateInputCalls = 0;
    let preCreateTerminal: Record<string, unknown> | null = null;
    const preCreateTombstoneFactory = (args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) => {
      const originalOpen = fs.openSync;
      const mutableOpen = fs as typeof fs & { openSync: typeof fs.openSync };
      mutableOpen.openSync = ((candidate: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
        if (String(candidate) === args.consumedAttemptPath && typeof flags === "number" && (flags & fs.constants.O_EXCL) !== 0) throw Object.assign(new Error("TOMBSTONE_PRE_CREATE_OPEN_FIXTURE_FAULT"), { code: "EIO" });
        return originalOpen(candidate, flags, mode);
      }) as typeof fs.openSync;
      try { return createPermanentHostBindingReattemptConsumedAttempt(args); }
      finally { mutableOpen.openSync = originalOpen; }
    };
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: preCreateCard.checkpointSha256, activationCardSha256: preCreateCardSha256, activationGrantSha256: preCreateGrantSha256 }, {
      ...preCreateFault.options,
      inputPath: path.join(fixtureParent, "pre-create-input-must-not-be-observed.json"),
      inputConsumer() { preCreateInputCalls += 1; throw new Error("PRE_CREATE_INPUT_MUST_NOT_RUN"); },
      tombstoneFactory: preCreateTombstoneFactory,
      processPortFactory() { throw new Error("PRE_CREATE_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("PRE_CREATE_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("PRE_CREATE_HOST_FINALIZER_MUST_NOT_RUN"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => {
      preCreateTerminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
      return error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_TOMBSTONE_CREATE_FAILED";
    });
    assert.equal(preCreateInputCalls, 0);
    assert.ok(preCreateTerminal !== null);
    const observedPreCreateTerminal = preCreateTerminal as unknown as Record<string, unknown>;
    assert.equal(observedPreCreateTerminal.status, "RED");
    assert.equal(observedPreCreateTerminal.consumedAttemptTombstoneStatus, "ABSENT");
    assert.equal(observedPreCreateTerminal.attemptConsumed, false);
    assert.equal(observedPreCreateTerminal.consumedAttemptTombstonePresent, false);
    assert.equal(observedPreCreateTerminal.consumedAttemptTombstoneSha256, null);
    assert.equal(observedPreCreateTerminal.hostBindingInputAccessed, false);
    assert.equal(observedPreCreateTerminal.reattemptRunRootAbsent, true);
    assert.equal(observedPreCreateTerminal.reattemptJournalAbsent, true);
    assert.equal(fs.existsSync(preCreateFault.options.consumedAttemptPath as string), false);
    assert.equal(fs.existsSync(preCreateFault.reattemptRoot), false);

    const postFsyncFault = prepareAt("tombstone-post-parent-fsync-fault");
    const postFsyncCard = prepareHostBindingReattempt(input, postFsyncFault.options);
    const postFsyncCardSha256 = hashFrame(canonicalJson(postFsyncCard));
    const postFsyncGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: postFsyncCardSha256, checkpointSha256: postFsyncCard.checkpointSha256 }));
    let postFsyncInputCalls = 0;
    let postFsyncTerminal: Record<string, unknown> | null = null;
    const postFsyncTombstoneFactory = (args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) => {
      const originalOpen = fs.openSync;
      const originalFsync = mutableFs.fsyncSync;
      const originalLstat = fs.lstatSync;
      const mutableOpen = fs as typeof fs & { openSync: typeof fs.openSync; lstatSync: typeof fs.lstatSync };
      const parent = path.dirname(args.consumedAttemptPath);
      let parentFd: number | null = null;
      let parentFsyncReturned = false;
      let postFsyncFaultInjected = false;
      mutableOpen.openSync = ((candidate: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
        const opened = originalOpen(candidate, flags, mode);
        if (String(candidate) === parent && typeof flags === "number" && (flags & fs.constants.O_DIRECTORY) !== 0 && parentFd === null) parentFd = opened;
        return opened;
      }) as typeof fs.openSync;
      mutableFs.fsyncSync = ((fd: number) => {
        const result = originalFsync(fd);
        if (parentFd !== null && fd === parentFd) parentFsyncReturned = true;
        return result;
      }) as typeof fs.fsyncSync;
      mutableOpen.lstatSync = ((candidate: fs.PathLike, options?: fs.StatOptions) => {
        if (parentFsyncReturned && !postFsyncFaultInjected && String(candidate) === parent) {
          postFsyncFaultInjected = true;
          throw Object.assign(new Error("TOMBSTONE_POST_PARENT_FSYNC_IDENTITY_FIXTURE_FAULT"), { code: "EIO" });
        }
        return originalLstat(candidate, options as never);
      }) as typeof fs.lstatSync;
      try { return createPermanentHostBindingReattemptConsumedAttempt(args); }
      finally { mutableOpen.openSync = originalOpen; mutableFs.fsyncSync = originalFsync; mutableOpen.lstatSync = originalLstat; }
    };
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: postFsyncCard.checkpointSha256, activationCardSha256: postFsyncCardSha256, activationGrantSha256: postFsyncGrantSha256 }, {
      ...postFsyncFault.options,
      inputPath: path.join(fixtureParent, "post-fsync-input-must-not-be-observed.json"),
      inputConsumer() { postFsyncInputCalls += 1; throw new Error("POST_FSYNC_INPUT_MUST_NOT_RUN"); },
      tombstoneFactory: postFsyncTombstoneFactory,
      processPortFactory() { throw new Error("POST_FSYNC_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("POST_FSYNC_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("POST_FSYNC_HOST_FINALIZER_MUST_NOT_RUN"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => {
      postFsyncTerminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
      return error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_TOMBSTONE_PARENT_DRIFT" && "verdict" in error && error.verdict === "RED_QUARANTINED";
    });
    assert.equal(postFsyncInputCalls, 0);
    assert.ok(postFsyncTerminal !== null);
    const observedPostFsyncTerminal = postFsyncTerminal as unknown as Record<string, unknown>;
    assert.equal(observedPostFsyncTerminal.status, "RED_QUARANTINED");
    assert.equal(observedPostFsyncTerminal.consumedAttemptTombstoneStatus, "PRESENT_UNAUTHENTICATED");
    assert.equal(observedPostFsyncTerminal.attemptConsumed, true);
    assert.equal(observedPostFsyncTerminal.consumedAttemptTombstonePresent, true);
    assert.equal(observedPostFsyncTerminal.consumedAttemptTombstoneSha256, null);
    assert.equal(observedPostFsyncTerminal.hostBindingInputAccessed, false);
    assert.equal(observedPostFsyncTerminal.reattemptRunRootAbsent, false);
    assert.equal(fs.existsSync(postFsyncFault.options.consumedAttemptPath as string), true);
    assert.equal(fs.existsSync(postFsyncFault.reattemptRoot), true, "a post-parent-fsync identity fault must never roll back or revive the consumed attempt");

    let terminal: Record<string, unknown> | null = null;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: activationCard.checkpointSha256, activationCardSha256, activationGrantSha256 }, {
      ...admitted.options,
      inputPath: neverOpenedInput,
      inputConsumer,
      inputAbsenceProver(candidate: string) { assert.equal(candidate, neverOpenedInput); return true; },
      processPortFactory() { throw new Error("PROCESS_PORT_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
      inspectorFactory() { throw new Error("INSPECTOR_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
      hostFinalizer() { throw new Error("HOST_FINALIZER_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => {
      terminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
      return error instanceof Error && "code" in error && error.code === "HOST_BINDING_INCOMPLETE_YELLOW";
    });
    assert.ok(terminal !== null);
    const admittedTerminal = terminal as unknown as Record<string, unknown>;
    assert.equal(admittedTerminal.status, "YELLOW_NO_RETRY");
    assert.equal(admittedTerminal.consumedAttemptTombstoneStatus, "AUTHENTICATED");
    assert.equal(admittedTerminal.hostBindingInputAccessed, true);
    assert.equal(admittedTerminal.hostBindingInputOpenCalls, 0);
    assert.equal(admittedTerminal.hostBindingInputRemoved, true);
    assert.equal(admittedTerminal.reattemptRunRootAbsent, true);
    assert.equal(admittedTerminal.reattemptJournalAbsent, true);
    assert.equal(admittedTerminal.processGroupsAbsent, true);
    assert.equal(admittedTerminal.publicationStatus, "ABSENT");
    assert.equal(fs.existsSync(admitted.reattemptRoot), false);
    assert.equal(fs.existsSync(admitted.options.consumedAttemptPath as string), true, "the consumed-attempt tombstone is permanent");

    for (const runtimeDrift of ["deleted", "replaced"] as const) {
      const drift = prepareAt(`runtime-tombstone-${runtimeDrift}`);
      const driftCard = prepareHostBindingReattempt(input, drift.options);
      const driftCardSha256 = hashFrame(canonicalJson(driftCard));
      const driftGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: driftCardSha256, checkpointSha256: driftCard.checkpointSha256 }));
      const driftTombstonePath = drift.options.consumedAttemptPath as string;
      let driftTerminal: Record<string, unknown> | null = null;
      await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: driftCard.checkpointSha256, activationCardSha256: driftCardSha256, activationGrantSha256: driftGrantSha256 }, {
        ...drift.options,
        inputPath: path.join(fixtureParent, `runtime-tombstone-${runtimeDrift}-input-consumed-by-fixture.json`),
        inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
          options.onInputObservation(Object.freeze({ accessed: true, openCalls: 0, removedOrAbsent: true }));
          fs.unlinkSync(driftTombstonePath);
          if (runtimeDrift === "replaced") fs.writeFileSync(driftTombstonePath, "{}\n", { flag: "wx", mode: 0o600 });
          throw new PhysicalRunnerError(`HOST_BINDING_REATTEMPT_RUNTIME_TOMBSTONE_${runtimeDrift.toUpperCase()}_FIXTURE`, "YELLOW_NO_RETRY");
        },
        processPortFactory() { throw new Error("RUNTIME_TOMBSTONE_DRIFT_PROCESS_PORT_MUST_NOT_RUN"); },
        inspectorFactory() { throw new Error("RUNTIME_TOMBSTONE_DRIFT_INSPECTOR_MUST_NOT_RUN"); },
        hostFinalizer() { throw new Error("RUNTIME_TOMBSTONE_DRIFT_HOST_FINALIZER_MUST_NOT_RUN"); },
        now: () => new Date("2026-08-09T12:00:00.000Z"),
      }), (error: unknown) => {
        driftTerminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
        return error instanceof Error && "code" in error && error.code === `HOST_BINDING_REATTEMPT_RUNTIME_TOMBSTONE_${runtimeDrift.toUpperCase()}_FIXTURE` && "verdict" in error && error.verdict === "RED_QUARANTINED";
      });
      assert.ok(driftTerminal !== null);
      const observedDriftTerminal = driftTerminal as unknown as Record<string, unknown>;
      assert.equal(observedDriftTerminal.status, "RED_QUARANTINED");
      assert.equal(observedDriftTerminal.attemptConsumed, true);
      assert.equal(observedDriftTerminal.consumedAttemptTombstoneStatus, runtimeDrift === "replaced" ? "PRESENT_UNAUTHENTICATED" : "PRESENCE_UNKNOWN");
      assert.equal(observedDriftTerminal.consumedAttemptTombstonePresent, runtimeDrift === "replaced" ? true : null);
      assert.equal(observedDriftTerminal.consumedAttemptTombstoneSha256, null);
      assert.equal(observedDriftTerminal.cleanupStatus, "RED_QUARANTINED");
      assert.equal(observedDriftTerminal.reattemptRunRootAbsent, false);
      assert.deepEqual(fs.readdirSync(drift.reattemptRoot).sort(), ["checkpoint.v2.json", "journal.v2.jsonl"], "runtime tombstone drift must stop before journal or checkpoint mutation");
      assert.equal(fs.existsSync(driftTombstonePath), runtimeDrift === "replaced");
    }

    const destructiveCleanupDrift = prepareAt("destructive-cleanup-tombstone-deleted");
    const destructiveCleanupCard = prepareHostBindingReattempt(input, destructiveCleanupDrift.options);
    const destructiveCleanupCardSha256 = hashFrame(canonicalJson(destructiveCleanupCard));
    const destructiveCleanupGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: destructiveCleanupCardSha256, checkpointSha256: destructiveCleanupCard.checkpointSha256 }));
    const destructiveCleanupTombstonePath = destructiveCleanupDrift.options.consumedAttemptPath as string;
    let destructiveCleanupAbsenceCalls = 0;
    let destructiveCleanupTerminal: Record<string, unknown> | null = null;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: destructiveCleanupCard.checkpointSha256, activationCardSha256: destructiveCleanupCardSha256, activationGrantSha256: destructiveCleanupGrantSha256 }, {
      ...destructiveCleanupDrift.options,
      inputPath: path.join(fixtureParent, "destructive-cleanup-input-consumed-by-fixture.json"),
      inputConsumer,
      inputAbsenceProver() {
        destructiveCleanupAbsenceCalls += 1;
        fs.unlinkSync(destructiveCleanupTombstonePath);
        return true;
      },
      processPortFactory() { throw new Error("DESTRUCTIVE_CLEANUP_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("DESTRUCTIVE_CLEANUP_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("DESTRUCTIVE_CLEANUP_HOST_FINALIZER_MUST_NOT_RUN"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => {
      destructiveCleanupTerminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
      return error instanceof Error && "code" in error && error.code === "HOST_BINDING_INCOMPLETE_YELLOW" && "verdict" in error && error.verdict === "RED_QUARANTINED";
    });
    assert.equal(destructiveCleanupAbsenceCalls, 1);
    assert.ok(destructiveCleanupTerminal !== null);
    const observedDestructiveCleanupTerminal = destructiveCleanupTerminal as unknown as Record<string, unknown>;
    assert.equal(observedDestructiveCleanupTerminal.status, "RED_QUARANTINED");
    assert.equal(observedDestructiveCleanupTerminal.attemptConsumed, true);
    assert.equal(observedDestructiveCleanupTerminal.consumedAttemptTombstoneStatus, "PRESENCE_UNKNOWN");
    assert.equal(observedDestructiveCleanupTerminal.cleanupStatus, "RED_QUARANTINED");
    assert.deepEqual(fs.readdirSync(destructiveCleanupDrift.reattemptRoot).sort(), ["checkpoint.v2.json", "journal.v2.jsonl"], "the final tombstone reauthentication must precede checkpoint or journal deletion");
    assert.equal(fs.existsSync(destructiveCleanupTombstonePath), false);

    for (const [phase, openCalls] of [["before", 0], ["during", 1]] as const) {
      const consumeCrash = prepareAt(`input-${phase}-consume-crash`);
      const consumeCrashCard = prepareHostBindingReattempt(input, consumeCrash.options);
      const consumeCrashCardSha256 = hashFrame(canonicalJson(consumeCrashCard));
      const consumeCrashGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: consumeCrashCardSha256, checkpointSha256: consumeCrashCard.checkpointSha256 }));
      const consumeCrashInputPath = path.join(fixtureParent, `input-${phase}-consume.json`);
      fs.writeFileSync(consumeCrashInputPath, "{}\n", { flag: "wx", mode: 0o600 });
      await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: consumeCrashCard.checkpointSha256, activationCardSha256: consumeCrashCardSha256, activationGrantSha256: consumeCrashGrantSha256 }, {
        ...consumeCrash.options,
        inputPath: consumeCrashInputPath,
        inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
          options.onInputObservation(Object.freeze({ accessed: true, openCalls, removedOrAbsent: false }));
          throw new PhysicalRunnerError(`HOST_BINDING_REATTEMPT_INPUT_${phase.toUpperCase()}_CONSUME_FIXTURE`, "YELLOW_NO_RETRY");
        },
        processPortFactory() { throw new Error(`${phase.toUpperCase()}_CONSUME_PROCESS_PORT_MUST_NOT_RUN`); },
        inspectorFactory() { throw new Error(`${phase.toUpperCase()}_CONSUME_INSPECTOR_MUST_NOT_RUN`); },
        hostFinalizer() { throw new Error(`${phase.toUpperCase()}_CONSUME_HOST_FINALIZER_MUST_NOT_RUN`); },
        now: () => new Date("2026-08-09T12:00:00.000Z"),
      }), (error: unknown) => error instanceof Error && "code" in error && error.code === `HOST_BINDING_REATTEMPT_INPUT_${phase.toUpperCase()}_CONSUME_FIXTURE` && "verdict" in error && error.verdict === "RED_QUARANTINED" && (error as { terminalResult?: { cleanupStatus?: string; status?: string } }).terminalResult?.cleanupStatus === "RED_QUARANTINED" && (error as { terminalResult?: { status?: string } }).terminalResult?.status === "RED_QUARANTINED");
      assert.equal(fs.existsSync(consumeCrashInputPath), true, `crash-${phase}-consume cleanup must preserve an input whose inode was never durably journaled`);
      assert.equal(fs.existsSync(consumeCrash.reattemptRoot), true, `crash-${phase}-consume cleanup must preserve the authenticated journal/root for quarantine`);
      assert.equal(fs.existsSync(consumeCrash.options.consumedAttemptPath as string), true);
    }

    const hostNotStarted = prepareAt("host-not-started-terminal");
    const hostNotStartedCard = prepareHostBindingReattempt(input, hostNotStarted.options);
    const hostNotStartedCardSha256 = hashFrame(canonicalJson(hostNotStartedCard));
    const hostNotStartedGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: hostNotStartedCardSha256, checkpointSha256: hostNotStartedCard.checkpointSha256 }));
    let hostNotStartedJournal: FixtureJournal | null = null;
    let hostNotStartedRecoveryCalls = 0;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: hostNotStartedCard.checkpointSha256, activationCardSha256: hostNotStartedCardSha256, activationGrantSha256: hostNotStartedGrantSha256 }, {
      ...hostNotStarted.options,
      inputPath: path.join(fixtureParent, "host-not-started-input-consumed-by-fixture.json"),
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
        return Object.freeze({ fixture: "owner-input" });
      },
      processPortFactory() { return Object.freeze({}); },
      inspectorFactory({ journal }: { journal: FixtureJournal }) {
        hostNotStartedJournal = journal;
        return Object.freeze({ snapshot() { return Object.freeze({ dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" }); } });
      },
      async hostFinalizer() {
        const journal = hostNotStartedJournal;
        assert.ok(journal !== null);
        await appendEnvironmentDirectoryFixtures(journal, hostNotStarted.reattemptRoot);
        const logicalId = "docker-client-version";
        const commandShapeSha256 = hashFrame(`host-not-started-inspector:${logicalId}\n`);
        await journal.append({ lane: "host-binding", event: `intent:${logicalId}`, commandShapeSha256, ownedResources: ["inspector-process-group"], cleanupState: "required" });
        await journal.append({ lane: "host-binding", event: `not-started:${logicalId}`, commandShapeSha256, processGroupId: null, ownedResources: ["inspector-process-group"], terminalCode: "NOT_STARTED", cleanupState: "observed-absent" });
        throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_NOT_STARTED_FIXTURE", "RED");
      },
      recoverUnstarted() { hostNotStartedRecoveryCalls += 1; throw new Error("HOST_NOT_STARTED_MUST_NOT_REPLAY"); },
      stopProcessGroup() { throw new Error("HOST_NOT_STARTED_MUST_NOT_SIGNAL"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_NOT_STARTED_FIXTURE");
    assert.equal(hostNotStartedRecoveryCalls, 0);
    assert.equal(fs.existsSync(hostNotStarted.reattemptRoot), false, fs.existsSync(hostNotStarted.reattemptRoot) ? `unexpected host-not-started residue: ${canonicalJson(fs.readdirSync(hostNotStarted.reattemptRoot).sort())}` : undefined);
    assert.equal(fs.existsSync(hostNotStarted.options.consumedAttemptPath as string), true);

    const consumedAttemptPath = admitted.options.consumedAttemptPath as string;
    {
      const originalFsync = mutableFs.fsyncSync;
      mutableFs.fsyncSync = (() => { throw new Error("TOMBSTONE_READER_PARENT_FSYNC_FIXTURE_FAULT"); }) as typeof fs.fsyncSync;
      try {
        assert.throws(() => readHostBindingReattemptConsumedAttempt({ consumedAttemptPath }), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
      } finally { mutableFs.fsyncSync = originalFsync; }
      assert.equal(fs.existsSync(consumedAttemptPath), true, "reader parent-fsync uncertainty must preserve the permanent tombstone");
    }
    for (const [closeName, failAtClose] of [["file", 1], ["parent", 2]] as const) {
      const originalClose = mutableFs.closeSync;
      let closeCalls = 0;
      mutableFs.closeSync = ((fd: number) => {
        closeCalls += 1;
        if (closeCalls === failAtClose) throw new Error(`TOMBSTONE_READER_${closeName.toUpperCase()}_CLOSE_FIXTURE_FAULT`);
        return originalClose(fd);
      }) as typeof fs.closeSync;
      try {
        assert.throws(() => readHostBindingReattemptConsumedAttempt({ consumedAttemptPath }), (error: unknown) => {
          const observation = (error as { tombstoneObservation?: { attemptConsumed?: boolean; consumedAttemptTombstoneStatus?: string; consumedAttemptTombstonePresent?: boolean | null; tombstoneSha256?: string | null } }).tombstoneObservation;
          return error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED" && observation?.attemptConsumed === true && observation.consumedAttemptTombstoneStatus === "PRESENT_UNAUTHENTICATED" && observation.consumedAttemptTombstonePresent === true && observation.tombstoneSha256 === null;
        });
      } finally { mutableFs.closeSync = originalClose; }
    }

    const collision = prepareAt("tombstone-eexist-collision");
    const collisionCard = prepareHostBindingReattempt(input, collision.options);
    const collisionCardSha256 = hashFrame(canonicalJson(collisionCard));
    const collisionGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: collisionCardSha256, checkpointSha256: collisionCard.checkpointSha256 }));
    let collisionInputCalls = 0;
    let collisionTerminal: Record<string, unknown> | null = null;
    const collisionTombstoneFactory = (args: Parameters<typeof createPermanentHostBindingReattemptConsumedAttempt>[0]) => {
      const originalOpen = fs.openSync;
      const originalClose = mutableFs.closeSync;
      const target = args.consumedAttemptPath;
      const parent = path.dirname(target);
      let factoryParentFd: number | null = null;
      let collisionInjected = false;
      let parentCloseFaultInjected = false;
      (fs as typeof fs & { openSync: typeof fs.openSync }).openSync = ((candidate: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
        const candidateText = String(candidate);
        if (candidateText === target && typeof flags === "number" && (flags & fs.constants.O_EXCL) !== 0 && !collisionInjected) {
          const foreignFd = originalOpen(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
          try { fs.fchmodSync(foreignFd, 0o600); fs.writeSync(foreignFd, Buffer.from("{}\n", "utf8")); fs.fsyncSync(foreignFd); }
          finally { originalClose(foreignFd); }
          collisionInjected = true;
        }
        const opened = originalOpen(candidate, flags, mode);
        if (candidateText === parent && factoryParentFd === null) factoryParentFd = opened;
        return opened;
      }) as typeof fs.openSync;
      mutableFs.closeSync = ((fd: number) => {
        if (factoryParentFd !== null && fd === factoryParentFd && !parentCloseFaultInjected) {
          parentCloseFaultInjected = true;
          throw new Error("TOMBSTONE_COLLISION_PARENT_CLOSE_FIXTURE_FAULT");
        }
        return originalClose(fd);
      }) as typeof fs.closeSync;
      try { return createPermanentHostBindingReattemptConsumedAttempt(args); }
      finally { (fs as typeof fs & { openSync: typeof fs.openSync }).openSync = originalOpen; mutableFs.closeSync = originalClose; }
    };
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: collisionCard.checkpointSha256, activationCardSha256: collisionCardSha256, activationGrantSha256: collisionGrantSha256 }, {
      ...collision.options,
      inputPath: path.join(fixtureParent, "collision-input-must-not-be-observed.json"),
      inputConsumer() { collisionInputCalls += 1; throw new Error("COLLISION_INPUT_MUST_NOT_RUN"); },
      tombstoneFactory: collisionTombstoneFactory,
      processPortFactory() { throw new Error("COLLISION_PROCESS_PORT_MUST_NOT_RUN"); },
      inspectorFactory() { throw new Error("COLLISION_INSPECTOR_MUST_NOT_RUN"); },
      hostFinalizer() { throw new Error("COLLISION_HOST_FINALIZER_MUST_NOT_RUN"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => {
      collisionTerminal = (error as { terminalResult?: Record<string, unknown> }).terminalResult ?? null;
      return error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED";
    });
    assert.equal(collisionInputCalls, 0);
    assert.ok(collisionTerminal !== null);
    const observedCollisionTerminal = collisionTerminal as unknown as Record<string, unknown>;
    assert.equal(observedCollisionTerminal.status, "RED_QUARANTINED");
    assert.equal(observedCollisionTerminal.consumedAttemptTombstoneStatus, "PRESENT_UNAUTHENTICATED");
    assert.equal(observedCollisionTerminal.attemptConsumed, false);
    assert.equal(observedCollisionTerminal.consumedAttemptTombstonePresent, true);
    assert.equal(observedCollisionTerminal.consumedAttemptTombstoneSha256, null);
    assert.equal(observedCollisionTerminal.hostBindingInputAccessed, false);
    assert.equal(observedCollisionTerminal.reattemptRunRootAbsent, false);
    assert.equal(fs.existsSync(collision.reattemptRoot), true, "a non-ABSENT collision must preserve the pre-admission root for quarantine");

    const successful = prepareAt("admitted-success");
    const successCard = prepareHostBindingReattempt(input, successful.options);
    const successCardSha256 = hashFrame(canonicalJson(successCard));
    const successGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: successCardSha256, checkpointSha256: successCard.checkpointSha256 }));
    const hostBindingId = "c".repeat(32);
    let capsuleBytes = Buffer.alloc(0);
    let publicReceiptBytes = Buffer.alloc(0);
    let capsuleSha256 = "";
    let publicReceiptSha256 = "";
    const inspectorCommandIds = [
      "docker-client-version", "docker-daemon-version", "docker-image-observation",
      "macos-product-version", "macos-build-version", "macos-architecture", "developer-root",
      "swiftc-path", "sdk-path", "sdk-version", "swift-version", "openssl-version",
    ];
    let inspectionJournal: FixtureJournal | null = null;
    const hostSnapshot = Object.freeze({ dockerCliStarts: 3, localDockerUnixSocketRequests: 2, macosInspectorStarts: 9, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
    const appendObservedInspectorFixtures = async (journal: FixtureJournal, reattemptRoot: string) => {
      await appendEnvironmentDirectoryFixtures(journal, reattemptRoot);
      for (const [index, id] of inspectorCommandIds.entries()) {
        const commandShapeSha256 = hashFrame(`host-inspector-fixture:${id}\n`);
        const processGroupId = 10_000 + index;
        await journal.append({ lane: "host-binding", event: `intent:${id}`, commandShapeSha256, ownedResources: ["inspector-process-group"], cleanupState: "required" });
        await journal.append({ lane: "host-binding", event: `started:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], cleanupState: "required" });
        await journal.append({ lane: "host-binding", event: `terminal:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" });
        await journal.append({ lane: "host-binding", event: `observed:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" });
      }
    };

    const capsuleRace = prepareAt("capsule-root-post-admission-race");
    const capsuleRaceCard = prepareHostBindingReattempt(input, capsuleRace.options);
    const capsuleRaceCardSha256 = hashFrame(canonicalJson(capsuleRaceCard));
    const capsuleRaceGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: capsuleRaceCardSha256, checkpointSha256: capsuleRaceCard.checkpointSha256 }));
    const capsuleRaceRoot = capsuleRace.options.capsuleRoot as string;
    const capsuleRaceSentinel = path.join(capsuleRaceRoot, "owner-race-sentinel.txt");
    let capsuleRaceJournal: FixtureJournal | null = null;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: capsuleRaceCard.checkpointSha256, activationCardSha256: capsuleRaceCardSha256, activationGrantSha256: capsuleRaceGrantSha256 }, {
      ...capsuleRace.options,
      inputPath: path.join(fixtureParent, "capsule-root-race-input-consumed-by-fixture.json"),
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
        return Object.freeze({ fixture: "owner-input" });
      },
      inputAbsenceProver() { return true; },
      processPortFactory() { return Object.freeze({ fixture: "no-process-authority" }); },
      inspectorFactory({ journal }: { journal: FixtureJournal }) {
        capsuleRaceJournal = journal;
        return Object.freeze({ snapshot() { return hostSnapshot; } });
      },
      async hostFinalizer(hostArguments: Record<string, any>) {
        const journal = capsuleRaceJournal;
        assert.ok(journal !== null);
        await appendObservedInspectorFixtures(journal, capsuleRace.reattemptRoot);
        fs.mkdirSync(capsuleRaceRoot, { mode: 0o700 });
        fs.writeFileSync(capsuleRaceSentinel, "owner-created-after-admission\n", { flag: "wx", mode: 0o600 });
        return syntheticHostBindingReattemptOutput({
          checkpoint: hostArguments.checkpoint,
          checkpointSha256: hostArguments.checkpointSha256,
          activationCardSha256: hostArguments.activationCardSha256,
          activationGrantSha256: hostArguments.activationGrantSha256,
          consumedAttemptTombstoneSha256: hostArguments.consumedAttemptTombstoneSha256,
          attemptId: hostArguments.attemptId,
          hostBindingId,
        });
      },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_CREATE_TARGET_PREEXISTS" && "verdict" in error && error.verdict === "RED_QUARANTINED" && (error as { terminalResult?: { status?: string } }).terminalResult?.status === "RED_QUARANTINED");
    assert.equal(fs.readFileSync(capsuleRaceSentinel, "utf8"), "owner-created-after-admission\n", "a capsule root raced in after admission must be preserved, never adopted or removed");
    assert.equal(fs.existsSync(capsuleRace.reattemptRoot), true, "the authenticated attempt root must remain quarantined after a capsule-root race");

    const successTerminal = await finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: successCard.checkpointSha256, activationCardSha256: successCardSha256, activationGrantSha256: successGrantSha256 }, {
      ...successful.options,
      inputPath: path.join(fixtureParent, "success-input-consumed-by-fixture.json"),
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
        return Object.freeze({ fixture: "owner-input" });
      },
      inputAbsenceProver() { return true; },
      processPortFactory() { return Object.freeze({ fixture: "no-process-authority" }); },
      inspectorFactory({ journal }: { journal: FixtureJournal }) {
        inspectionJournal = journal;
        return Object.freeze({ snapshot() { return hostSnapshot; } });
      },
      async hostFinalizer(hostArguments: Record<string, any>) {
        const journal = inspectionJournal;
        assert.ok(journal !== null);
        await appendObservedInspectorFixtures(journal, successful.reattemptRoot);
        const output = syntheticHostBindingReattemptOutput({
          checkpoint: hostArguments.checkpoint,
          checkpointSha256: hostArguments.checkpointSha256,
          activationCardSha256: hostArguments.activationCardSha256,
          activationGrantSha256: hostArguments.activationGrantSha256,
          consumedAttemptTombstoneSha256: hostArguments.consumedAttemptTombstoneSha256,
          attemptId: hostArguments.attemptId,
          hostBindingId,
        });
        capsuleBytes = output.capsuleBytes;
        publicReceiptBytes = output.publicReceiptBytes;
        capsuleSha256 = output.capsuleSha256;
        publicReceiptSha256 = output.publicReceiptSha256;
        return output;
      },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    });
    assert.equal(successTerminal.status, "HOST_BOUND_YELLOW");
    assert.equal(successTerminal.dockerReadOnlyCliCalls, 3);
    assert.equal(successTerminal.localDockerUnixSocketRequests, 2);
    assert.equal(successTerminal.macosReadOnlyInspectionCalls, 9);
    assert.equal(successTerminal.publicationStatus, "PUBLISHED");
    assert.equal(successTerminal.hostBindingId, hostBindingId);
    assert.equal(successTerminal.hostBindingCapsuleSha256, capsuleSha256);
    assert.equal(successTerminal.hostBindingPublicReceiptSha256, publicReceiptSha256);
    assert.equal(successTerminal.reattemptRunRootAbsent, true);
    assert.equal(successTerminal.reattemptJournalAbsent, true);
    assert.equal(successTerminal.processGroupsAbsent, true);
    assert.equal(successTerminal.cleanupStatus, "GREEN");
    assert.equal(successTerminal.retryExecutionGrant, "NOT_REQUESTED");
    assert.equal(successTerminal.firstProviderCallGrant, "NOT_REQUESTED");
    assert.equal(fs.existsSync(successful.reattemptRoot), false);
    assert.equal(fs.existsSync(path.join(successful.options.capsuleRoot as string, `${hostBindingId}.json`)), true);
    assert.equal(fs.existsSync(successful.options.publicReceiptPath as string), true);
    assert.ok(capsuleBytes.every((byte) => byte === 0), "private capsule buffer must be zeroized only after retained-output revalidation");
    assert.ok(publicReceiptBytes.every((byte) => byte === 0), "public receipt working buffer must be zeroized at the terminal boundary");

    const retainedPublicReceiptPath = successful.options.publicReceiptPath as string;
    const retainedCapsulePath = path.join(successful.options.capsuleRoot as string, `${hostBindingId}.json`);
    const invalidTtlReceipt = JSON.parse(fs.readFileSync(retainedPublicReceiptPath, "utf8"));
    invalidTtlReceipt.expiresAt = new Date(Date.parse(invalidTtlReceipt.createdAt) + 259_200_001).toISOString();
    fs.writeFileSync(retainedPublicReceiptPath, `${canonicalJson(invalidTtlReceipt)}\n`, { mode: 0o644 });
    await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      reattemptRoot: successful.reattemptRoot,
      rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
      consumedAttemptPath: successful.options.consumedAttemptPath as string,
      inputPath: path.join(fixtureParent, "success-input-consumed-by-fixture.json"),
      capsuleRoot: successful.options.capsuleRoot as string,
      publicReceiptPath: retainedPublicReceiptPath,
      inputAbsenceProver() { return true; },
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_SURVIVING_PUBLICATION_PAIR_DRIFT" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.existsSync(retainedCapsulePath), true, "invalid-TTL reentry must preserve the capsule for quarantine");
    assert.equal(fs.existsSync(retainedPublicReceiptPath), true, "invalid-TTL reentry must preserve the receipt for quarantine");
    assert.equal(fs.existsSync(successful.options.consumedAttemptPath as string), true, "invalid-TTL reentry must preserve the consumed-attempt tombstone");

    const executionCrash = prepareAt("execution-inventory-crash");
    const executionCrashCard = prepareHostBindingReattempt(input, executionCrash.options);
    const executionCrashCardSha256 = hashFrame(canonicalJson(executionCrashCard));
    const executionCrashGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: executionCrashCardSha256, checkpointSha256: executionCrashCard.checkpointSha256 }));
    const executionCrashHostBindingId = "e".repeat(32);
    let executionCrashJournal: FixtureJournal | null = null;
    let executionCrashStageLinkFault = false;
    const originalLink = mutableFs.linkSync;
    mutableFs.linkSync = ((existingPath: fs.PathLike, newPath: fs.PathLike) => {
      if (!executionCrashStageLinkFault && String(existingPath) === path.join(executionCrash.reattemptRoot, "publication-capsule.v2.stage")) {
        executionCrashStageLinkFault = true;
        throw Object.assign(new Error("HOST_BINDING_REATTEMPT_CAPSULE_STAGE_CRASH_FIXTURE"), { code: "EIO" });
      }
      return originalLink(existingPath, newPath);
    }) as typeof fs.linkSync;
    try {
      await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: executionCrashCard.checkpointSha256, activationCardSha256: executionCrashCardSha256, activationGrantSha256: executionCrashGrantSha256 }, {
        ...executionCrash.options,
        inputPath: path.join(fixtureParent, "execution-crash-input-consumed-by-fixture.json"),
        inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
          options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
          return Object.freeze({ fixture: "owner-input" });
        },
        inputAbsenceProver() { throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_CRASH_PRESERVE_FIXTURE", "RED_QUARANTINED"); },
        processPortFactory() { return Object.freeze({}); },
        inspectorFactory({ journal }: { journal: FixtureJournal }) {
          executionCrashJournal = journal;
          return Object.freeze({ snapshot() { return hostSnapshot; } });
        },
        async hostFinalizer(hostArguments: Record<string, any>) {
          const journal = executionCrashJournal;
          assert.ok(journal !== null);
          await appendEnvironmentDirectoryFixtures(journal, executionCrash.reattemptRoot);
          for (const [index, id] of inspectorCommandIds.entries()) {
            const commandShapeSha256 = hashFrame(`execution-crash-inspector:${id}\n`);
            const processGroupId = 20_000 + index;
            const intentRecord = await journal.append({ lane: "host-binding", event: `intent:${id}`, commandShapeSha256, ownedResources: ["inspector-process-group"], cleanupState: "required" }) as { sequence: number };
            await journal.append({ lane: "host-binding", event: `started:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], cleanupState: "required" });
            if (index === 0) {
              const startId = PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.blockedStartId({ runId: path.basename(executionCrash.reattemptRoot), startSequence: intentRecord.sequence, family: "host-inspector", logicalId: id, commandShapeSha256 });
              const readyBytes = Buffer.from(`${canonicalJson({ pid: processGroupId, releaseAuthoritySha256: hashFrame("execution-crash-release-authority\n"), schemaVersion: "r4_gate_b_blocked_supervisor_ready.v2", startId })}\n`, "utf8");
              try { fs.writeFileSync(path.join(executionCrash.reattemptRoot, "blocked-supervisor-pids", `${startId.slice(7)}.jsonl`), readyBytes, { flag: "wx", mode: 0o600 }); }
              finally { readyBytes.fill(0); }
            }
            await journal.append({ lane: "host-binding", event: `terminal:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" });
            await journal.append({ lane: "host-binding", event: `observed:${id}`, commandShapeSha256, processGroupId, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" });
          }
          return syntheticHostBindingReattemptOutput({
            checkpoint: hostArguments.checkpoint,
            checkpointSha256: hostArguments.checkpointSha256,
            activationCardSha256: hostArguments.activationCardSha256,
            activationGrantSha256: hostArguments.activationGrantSha256,
            consumedAttemptTombstoneSha256: hostArguments.consumedAttemptTombstoneSha256,
            attemptId: hostArguments.attemptId,
            hostBindingId: executionCrashHostBindingId,
          });
        },
        now: () => new Date("2026-08-09T12:00:00.000Z"),
      }), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED" && (error as { terminalResult?: { status?: string } }).terminalResult?.status === "RED_QUARANTINED");
    } finally { mutableFs.linkSync = originalLink; }
    assert.equal(executionCrashStageLinkFault, true);
    assert.deepEqual(fs.readdirSync(executionCrash.reattemptRoot).sort(), ["blocked-supervisor-pids", "checkpoint.v2.json", "docker-config", "home", "journal.v2.jsonl", "publication-capsule.v2.stage", "tmp"]);
    const unknownExecutionSibling = path.join(executionCrash.reattemptRoot, "unknown-sibling");
    fs.symlinkSync("unowned-target", unknownExecutionSibling);
    await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      reattemptRoot: executionCrash.reattemptRoot,
      rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
      consumedAttemptPath: executionCrash.options.consumedAttemptPath as string,
      inputPath: path.join(fixtureParent, "execution-crash-input-consumed-by-fixture.json"),
      capsuleRoot: executionCrash.options.capsuleRoot as string,
      publicReceiptPath: executionCrash.options.publicReceiptPath as string,
      inputAbsenceProver() { return true; },
    }), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_ROOT_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.lstatSync(unknownExecutionSibling).isSymbolicLink(), true, "an unknown sibling must be preserved for quarantine");
    assert.equal(fs.existsSync(executionCrash.reattemptRoot), true);
    assert.equal(fs.existsSync(path.join(executionCrash.reattemptRoot, "publication-capsule.v2.stage")), true);
    fs.unlinkSync(unknownExecutionSibling);
    const executionCrashCleanupOptions = {
      reattemptRoot: executionCrash.reattemptRoot,
      rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
      consumedAttemptPath: executionCrash.options.consumedAttemptPath as string,
      inputPath: path.join(fixtureParent, "execution-crash-input-consumed-by-fixture.json"),
      capsuleRoot: executionCrash.options.capsuleRoot as string,
      publicReceiptPath: executionCrash.options.publicReceiptPath as string,
      inputAbsenceProver() { return true; },
    };
    for (const [directoryName, expectedCode] of [["home", "HOST_BINDING_REATTEMPT_ENVIRONMENT_HOME_IDENTITY_DRIFT"], ["blocked-supervisor-pids", "HOST_BINDING_REATTEMPT_SUPERVISOR_SLOT_ROOT_IDENTITY_DRIFT"]] as const) {
      const ownedDirectory = path.join(executionCrash.reattemptRoot, directoryName);
      const displacedDirectory = path.join(fixtureParent, `execution-crash-${directoryName}-owned`);
      fs.renameSync(ownedDirectory, displacedDirectory);
      fs.mkdirSync(ownedDirectory, { mode: 0o700 });
      await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === expectedCode && "verdict" in error && error.verdict === "RED_QUARANTINED");
      assert.equal(fs.lstatSync(ownedDirectory).isDirectory(), true, `${directoryName} replacement must be preserved for quarantine`);
      fs.rmdirSync(ownedDirectory);
      fs.renameSync(displacedDirectory, ownedDirectory);
    }
    const executionCapsuleRoot = executionCrash.options.capsuleRoot as string;
    const originalExecutionRmdir = mutableFs.rmdirSync;
    const originalExecutionFsync = mutableFs.fsyncSync;
    let capsuleRootRmdirObserved = false;
    let capsuleRootParentFsyncFault = false;
    mutableFs.rmdirSync = ((candidate: fs.PathLike, options?: fs.RmDirOptions) => {
      const result = originalExecutionRmdir(candidate, options);
      if (String(candidate) === executionCapsuleRoot) capsuleRootRmdirObserved = true;
      return result;
    }) as typeof fs.rmdirSync;
    mutableFs.fsyncSync = ((fd: number) => {
      if (capsuleRootRmdirObserved && !capsuleRootParentFsyncFault) {
        capsuleRootParentFsyncFault = true;
        throw new Error("HOST_BINDING_REATTEMPT_CAPSULE_ROOT_PARENT_FSYNC_FIXTURE_FAULT");
      }
      return originalExecutionFsync(fd);
    }) as typeof fs.fsyncSync;
    try {
      await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_ABSENCE_PROOF_FAILED" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { mutableFs.rmdirSync = originalExecutionRmdir; mutableFs.fsyncSync = originalExecutionFsync; }
    assert.equal(capsuleRootRmdirObserved, true);
    assert.equal(capsuleRootParentFsyncFault, true);
    assert.equal(fs.existsSync(executionCapsuleRoot), false, "the rmdir/fsync crash window leaves an absent capsule root that cleanup must recognize on reentry");
    assert.equal(fs.existsSync(executionCrash.reattemptRoot), true);

    fs.mkdirSync(executionCapsuleRoot, { mode: 0o700 });
    await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_IDENTITY_DRIFT" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.lstatSync(executionCapsuleRoot).isDirectory(), true, "a replacement capsule root must be preserved for quarantine");
    fs.rmdirSync(executionCapsuleRoot);

    fs.symlinkSync("unowned-capsule-target", executionCapsuleRoot);
    await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_UNSAFE" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(fs.lstatSync(executionCapsuleRoot).isSymbolicLink(), true, "a symlink capsule root must be preserved for quarantine");
    fs.unlinkSync(executionCapsuleRoot);

    const originalExecutionLstat = fs.lstatSync;
    (fs as typeof fs & { lstatSync: typeof fs.lstatSync }).lstatSync = ((candidate: fs.PathLike, options?: fs.StatOptions) => {
      if (String(candidate) === executionCapsuleRoot) throw Object.assign(new Error("HOST_BINDING_REATTEMPT_CAPSULE_ROOT_LSTAT_FIXTURE_FAULT"), { code: "EIO" });
      return originalExecutionLstat(candidate, options as never);
    }) as typeof fs.lstatSync;
    try {
      await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_CAPSULE_ROOT_UNREADABLE" && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { (fs as typeof fs & { lstatSync: typeof fs.lstatSync }).lstatSync = originalExecutionLstat; }
    assert.equal(fs.existsSync(executionCrash.reattemptRoot), true, "an unknown capsule-root observation must preserve the authenticated cleanup root");

    const executionHome = path.join(executionCrash.reattemptRoot, "home");
    const originalTransientRmdir = mutableFs.rmdirSync;
    const originalTransientFsync = mutableFs.fsyncSync;
    let homeRmdirObserved = false;
    let homeRootFsyncFault = false;
    mutableFs.rmdirSync = ((candidate: fs.PathLike, options?: fs.RmDirOptions) => {
      const result = originalTransientRmdir(candidate, options);
      if (String(candidate) === executionHome) homeRmdirObserved = true;
      return result;
    }) as typeof fs.rmdirSync;
    mutableFs.fsyncSync = ((fd: number) => {
      if (homeRmdirObserved && !homeRootFsyncFault) { homeRootFsyncFault = true; throw new Error("HOST_BINDING_REATTEMPT_ENVIRONMENT_HOME_ROOT_FSYNC_FIXTURE_FAULT"); }
      return originalTransientFsync(fd);
    }) as typeof fs.fsyncSync;
    try {
      await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
    } finally { mutableFs.rmdirSync = originalTransientRmdir; mutableFs.fsyncSync = originalTransientFsync; }
    assert.equal(homeRmdirObserved, true);
    assert.equal(homeRootFsyncFault, true);
    assert.equal(fs.existsSync(executionHome), false, "a created-directory rmdir/fsync crash tail must be reenterable from exact absence");
    assert.equal(fs.existsSync(executionCrash.reattemptRoot), true);

    const recoveredExecutionCrash = await cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, executionCrashCleanupOptions);
    assert.equal(recoveredExecutionCrash.status, "GREEN");
    assert.equal(recoveredExecutionCrash.publicationStatus, "ABSENT");
    assert.equal(fs.existsSync(executionCrash.reattemptRoot), false);
    assert.equal(fs.existsSync(executionCrash.options.capsuleRoot as string), false);
    assert.equal(fs.existsSync(executionCrash.options.consumedAttemptPath as string), true, "standalone crash cleanup must preserve the permanent tombstone");

    const stoppedGroupCrash = prepareAt("started-group-cleanup-crash");
    const stoppedGroupCard = prepareHostBindingReattempt(input, stoppedGroupCrash.options);
    const stoppedGroupCardSha256 = hashFrame(canonicalJson(stoppedGroupCard));
    const stoppedGroupGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: stoppedGroupCardSha256, checkpointSha256: stoppedGroupCard.checkpointSha256 }));
    const stoppedGroupId = inspectorCommandIds[0];
    const stoppedGroupProcessGroupId = 21_000;
    let stoppedGroupJournal: FixtureJournal | null = null;
    const initialStopCalls: number[] = [];
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: stoppedGroupCard.checkpointSha256, activationCardSha256: stoppedGroupCardSha256, activationGrantSha256: stoppedGroupGrantSha256 }, {
      ...stoppedGroupCrash.options,
      inputPath: path.join(fixtureParent, "started-group-input-consumed-by-fixture.json"),
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
        return Object.freeze({ fixture: "owner-input" });
      },
      inputAbsenceProver() { throw new Error("INPUT_ABSENCE_MUST_NOT_PRECEDE_GROUP_RECOVERY"); },
      processPortFactory() { return Object.freeze({}); },
      inspectorFactory({ journal }: { journal: FixtureJournal }) {
        stoppedGroupJournal = journal;
        return Object.freeze({ snapshot() { return hostSnapshot; } });
      },
      async hostFinalizer() {
        const journal = stoppedGroupJournal;
        assert.ok(journal !== null);
        await appendEnvironmentDirectoryFixtures(journal, stoppedGroupCrash.reattemptRoot);
        const commandShapeSha256 = hashFrame(`started-group-crash-inspector:${stoppedGroupId}\n`);
        const intentRecord = await journal.append({ lane: "host-binding", event: `intent:${stoppedGroupId}`, commandShapeSha256, ownedResources: ["inspector-process-group"], cleanupState: "required" }) as { sequence: number };
        await journal.append({ lane: "host-binding", event: `started:${stoppedGroupId}`, commandShapeSha256, processGroupId: stoppedGroupProcessGroupId, ownedResources: ["inspector-process-group"], cleanupState: "required" });
        const startId = PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.blockedStartId({ runId: path.basename(stoppedGroupCrash.reattemptRoot), startSequence: intentRecord.sequence, family: "host-inspector", logicalId: stoppedGroupId, commandShapeSha256 });
        const readyBytes = Buffer.from(`${canonicalJson({ pid: stoppedGroupProcessGroupId, releaseAuthoritySha256: hashFrame("started-group-crash-release-authority\n"), schemaVersion: "r4_gate_b_blocked_supervisor_ready.v2", startId })}\n`, "utf8");
        try { fs.writeFileSync(path.join(stoppedGroupCrash.reattemptRoot, "blocked-supervisor-pids", `${startId.slice(7)}.jsonl`), readyBytes, { flag: "wx", mode: 0o600 }); }
        finally { readyBytes.fill(0); }
        throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_STARTED_GROUP_CRASH_FIXTURE", "RED_QUARANTINED");
      },
      async stopProcessGroup(processGroupId: number) { initialStopCalls.push(processGroupId); return false; },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.deepEqual(initialStopCalls, [stoppedGroupProcessGroupId]);
    assert.equal(fs.readdirSync(path.join(stoppedGroupCrash.reattemptRoot, "blocked-supervisor-pids")).length, 1, "a failed first cleanup must preserve the authenticated ready slot");
    const recoveryStopCalls: number[] = [];
    const recoveredStoppedGroup = await cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      reattemptRoot: stoppedGroupCrash.reattemptRoot,
      rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
      consumedAttemptPath: stoppedGroupCrash.options.consumedAttemptPath as string,
      inputPath: path.join(fixtureParent, "started-group-input-consumed-by-fixture.json"),
      capsuleRoot: stoppedGroupCrash.options.capsuleRoot as string,
      publicReceiptPath: stoppedGroupCrash.options.publicReceiptPath as string,
      inputAbsenceProver() { return true; },
      async stopProcessGroup(processGroupId: number) { recoveryStopCalls.push(processGroupId); return true; },
    });
    assert.deepEqual(recoveryStopCalls, [stoppedGroupProcessGroupId]);
    assert.equal(recoveredStoppedGroup.status, "GREEN");
    assert.equal(recoveredStoppedGroup.processGroupsAbsent, true);
    assert.equal(fs.existsSync(stoppedGroupCrash.reattemptRoot), false, "cleanup must remove the ready slot before removing the now-empty slot root");
    assert.equal(fs.existsSync(stoppedGroupCrash.options.consumedAttemptPath as string), true);

    const unstartedAppendCrash = prepareAt("unstarted-append-before-slot-remove-crash");
    const unstartedAppendCard = prepareHostBindingReattempt(input, unstartedAppendCrash.options);
    const unstartedAppendCardSha256 = hashFrame(canonicalJson(unstartedAppendCard));
    const unstartedAppendGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: unstartedAppendCardSha256, checkpointSha256: unstartedAppendCard.checkpointSha256 }));
    const unstartedLogicalId = inspectorCommandIds[0];
    const unstartedProcessGroupId = 22_000;
    let unstartedJournal: FixtureJournal | null = null;
    let unstartedSlotPath: string | null = null;
    let durableRecoveryAppends = 0;
    await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: unstartedAppendCard.checkpointSha256, activationCardSha256: unstartedAppendCardSha256, activationGrantSha256: unstartedAppendGrantSha256 }, {
      ...unstartedAppendCrash.options,
      inputPath: path.join(fixtureParent, "unstarted-append-input-consumed-by-fixture.json"),
      inputConsumer(_candidate: string, options: { onInputObservation(observation: { accessed: boolean; openCalls: number; removedOrAbsent: boolean }): void }) {
        options.onInputObservation(Object.freeze({ accessed: true, openCalls: 1, removedOrAbsent: true }));
        return Object.freeze({ fixture: "owner-input" });
      },
      processPortFactory() { return Object.freeze({}); },
      inspectorFactory({ journal }: { journal: FixtureJournal }) {
        unstartedJournal = journal;
        return Object.freeze({ snapshot() { return hostSnapshot; } });
      },
      async hostFinalizer() {
        const journal = unstartedJournal;
        assert.ok(journal !== null);
        await appendEnvironmentDirectoryFixtures(journal, unstartedAppendCrash.reattemptRoot);
        const commandShapeSha256 = hashFrame(`unstarted-append-crash-inspector:${unstartedLogicalId}\n`);
        const intentRecord = await journal.append({ lane: "host-binding", event: `intent:${unstartedLogicalId}`, commandShapeSha256, ownedResources: ["inspector-process-group"], cleanupState: "required" }) as { sequence: number };
        const startId = PHYSICAL_RUNNER_OFFLINE_MUTATION_TEST_HOOKS.blockedStartId({ runId: path.basename(unstartedAppendCrash.reattemptRoot), startSequence: intentRecord.sequence, family: "host-inspector", logicalId: unstartedLogicalId, commandShapeSha256 });
        unstartedSlotPath = path.join(unstartedAppendCrash.reattemptRoot, "blocked-supervisor-pids", `${startId.slice(7)}.jsonl`);
        const readyBytes = Buffer.from(`${canonicalJson({ pid: unstartedProcessGroupId, releaseAuthoritySha256: hashFrame("unstarted-append-crash-release-authority\n"), schemaVersion: "r4_gate_b_blocked_supervisor_ready.v2", startId })}\n`, "utf8");
        try { fs.writeFileSync(unstartedSlotPath, readyBytes, { flag: "wx", mode: 0o600 }); }
        finally { readyBytes.fill(0); }
        throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_UNSTARTED_APPEND_CRASH_FIXTURE", "RED_QUARANTINED");
      },
      async recoverUnstarted(_root: string, starts: readonly Record<string, any>[], recoveryJournal: FixtureJournal) {
        assert.equal(starts.length, 1);
        const start = starts[0];
        if (start === undefined) throw new Error("UNSTARTED_RECOVERY_AUTHORITY_MISSING");
        await recoveryJournal.append({ lane: start.lane, event: `cleanup-observed-absent:${start.logicalId}`, commandShapeSha256: start.commandShapeSha256, processGroupId: unstartedProcessGroupId, ownedResources: start.ownedResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
        durableRecoveryAppends += 1;
        throw new PhysicalRunnerError("HOST_BINDING_REATTEMPT_AFTER_ABSENCE_APPEND_BEFORE_SLOT_REMOVE_FIXTURE", "RED_QUARANTINED");
      },
      stopProcessGroup() { throw new Error("UNSTARTED_STOP_PROCESS_GROUP_MUST_NOT_RUN"); },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    }), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.equal(durableRecoveryAppends, 1);
    assert.ok(unstartedSlotPath !== null && fs.existsSync(unstartedSlotPath), "the append/remove crash window must retain the exact ready slot for journal-authenticated reentry");
    const recoveredUnstartedAppend = await cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, {
      reattemptRoot: unstartedAppendCrash.reattemptRoot,
      rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
      consumedAttemptPath: unstartedAppendCrash.options.consumedAttemptPath as string,
      inputPath: path.join(fixtureParent, "unstarted-append-input-consumed-by-fixture.json"),
      capsuleRoot: unstartedAppendCrash.options.capsuleRoot as string,
      publicReceiptPath: unstartedAppendCrash.options.publicReceiptPath as string,
      inputAbsenceProver() { return true; },
      recoverUnstarted() { throw new Error("DURABLE_ABSENCE_MUST_PREVENT_UNSTARTED_REPLAY"); },
      stopProcessGroup() { throw new Error("DURABLE_ABSENCE_MUST_PREVENT_GROUP_SIGNAL"); },
    });
    assert.equal(recoveredUnstartedAppend.status, "GREEN");
    assert.equal(fs.existsSync(unstartedAppendCrash.reattemptRoot), false);
    assert.equal(fs.existsSync(unstartedAppendCrash.options.consumedAttemptPath as string), true);

    for (const [tailName, expectedRootNames] of [
      ["checkpoint-unlink", ["journal.v2.jsonl"]],
      ["journal-unlink", []],
      ["root-rmdir", null],
    ] as const) {
      const tail = prepareAt(`cleanup-tail-${tailName}`);
      const tailCard = prepareHostBindingReattempt(input, tail.options);
      const tailCardSha256 = hashFrame(canonicalJson(tailCard));
      const tailGrantSha256 = hashFrame(canonicalJson({ ...activationGrant, activationCardSha256: tailCardSha256, checkpointSha256: tailCard.checkpointSha256 }));
      const originalFsync = mutableFs.fsyncSync;
      const originalUnlink = mutableFs.unlinkSync;
      const originalRmdir = mutableFs.rmdirSync;
      let armed = false;
      let throwOnNextFsync = false;
      const tailInputPath = path.join(fixtureParent, `tail-${tailName}-input-never-created.json`);
      try {
        await assert.rejects(finalizeHostBindingReattemptOnce({ mode: "finalize-host-binding-reattempt", checkpointSha256: tailCard.checkpointSha256, activationCardSha256: tailCardSha256, activationGrantSha256: tailGrantSha256 }, {
          ...tail.options,
          inputPath: tailInputPath,
          inputConsumer,
          inputAbsenceProver() {
            if (!armed) {
              armed = true;
              mutableFs.unlinkSync = ((candidate: fs.PathLike) => {
                const result = originalUnlink(candidate);
                if (tailName === "journal-unlink" && String(candidate) === path.join(tail.reattemptRoot, "journal.v2.jsonl") || tailName === "checkpoint-unlink" && String(candidate) === path.join(tail.reattemptRoot, "checkpoint.v2.json")) throwOnNextFsync = true;
                return result;
              }) as typeof fs.unlinkSync;
              mutableFs.rmdirSync = ((candidate: fs.PathLike, options?: fs.RmDirOptions) => {
                const result = originalRmdir(candidate, options);
                if (tailName === "root-rmdir" && String(candidate) === tail.reattemptRoot) throwOnNextFsync = true;
                return result;
              }) as typeof fs.rmdirSync;
              mutableFs.fsyncSync = ((fd: number) => {
                if (throwOnNextFsync) { throwOnNextFsync = false; throw new Error(`CLEANUP_TAIL_${tailName.toUpperCase()}_FSYNC_FAULT`); }
                return originalFsync(fd);
              }) as typeof fs.fsyncSync;
            }
            return true;
          },
          processPortFactory() { throw new Error("PROCESS_PORT_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
          inspectorFactory() { throw new Error("INSPECTOR_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
          hostFinalizer() { throw new Error("HOST_FINALIZER_MUST_NOT_RUN_AFTER_INPUT_FAILURE"); },
          now: () => new Date("2026-08-09T12:00:00.000Z"),
        }), (error: unknown) => error instanceof Error && (error as { terminalResult?: { status?: string } }).terminalResult?.status === "RED_QUARANTINED");
      } finally { mutableFs.fsyncSync = originalFsync; mutableFs.unlinkSync = originalUnlink; mutableFs.rmdirSync = originalRmdir; }
      if (expectedRootNames === null) assert.equal(fs.existsSync(tail.reattemptRoot), false);
      else assert.deepEqual(fs.readdirSync(tail.reattemptRoot).sort(), [...expectedRootNames]);
      const cleanupOptions = {
        reattemptRoot: tail.reattemptRoot,
        rootAnchor: CANONICAL_SYSTEM_TEMP_ROOT,
        consumedAttemptPath: tail.options.consumedAttemptPath as string,
        inputPath: tailInputPath,
        capsuleRoot: tail.options.capsuleRoot as string,
        publicReceiptPath: tail.options.publicReceiptPath as string,
        inputAbsenceProver() { return true; },
      };
      if (tailName !== "root-rmdir") {
        assert.ok(expectedRootNames !== null);
        const tombstonePath = tail.options.consumedAttemptPath as string;
        const originalTombstoneBytes = fs.readFileSync(tombstonePath);
        fs.unlinkSync(tombstonePath);
        try {
          await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, cleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_TOMBSTONE_ABSENT_ROOT_AMBIGUOUS" && "verdict" in error && error.verdict === "RED_QUARANTINED" && (error as { tombstoneObservation?: { attemptConsumed?: boolean; consumedAttemptTombstoneStatus?: string } }).tombstoneObservation?.attemptConsumed === true && (error as { tombstoneObservation?: { consumedAttemptTombstoneStatus?: string } }).tombstoneObservation?.consumedAttemptTombstoneStatus === "PRESENCE_UNKNOWN");
          assert.deepEqual(fs.readdirSync(tail.reattemptRoot).sort(), [...expectedRootNames], `${tailName} with a missing tombstone must preserve the ambiguous cleanup tail`);
        } finally {
          fs.writeFileSync(tombstonePath, originalTombstoneBytes, { flag: "wx", mode: 0o600 });
          originalTombstoneBytes.fill(0);
        }
      }
      if (tailName === "checkpoint-unlink") {
        const tombstonePath = tail.options.consumedAttemptPath as string;
        const originalTombstoneBytes = fs.readFileSync(tombstonePath);
        try {
          const originalTombstone = JSON.parse(originalTombstoneBytes.toString("utf8")) as Record<string, any>;
          const replacementImplementationTree = "e".repeat(40);
          const replacementGrant = {
            schemaVersion: "r4_gate_b_host_binding_activation_grant.v2",
            activationCardSha256: originalTombstone.activationCardSha256,
            attemptOrdinal: 2,
            checkpointSha256: originalTombstone.checkpointSha256,
            firstProviderCallGrant: "NOT_REQUESTED",
            hostBindingAttemptGrant: "APPROVED_ONCE",
            hostBindingInputPreparedByOwner: true,
            implementationHead: originalTombstone.implementationHead,
            implementationTree: replacementImplementationTree,
            retryExecutionGrant: "NOT_REQUESTED",
          };
          const replacementTombstone = { ...originalTombstone, implementationTree: replacementImplementationTree, activationGrantSha256: hashFrame(canonicalJson(replacementGrant)) };
          fs.writeFileSync(tombstonePath, `${canonicalJson(replacementTombstone)}\n`, { mode: 0o600 });
          await assert.rejects(cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, cleanupOptions), (error: unknown) => error instanceof Error && "code" in error && error.code === "HOST_BINDING_REATTEMPT_JOURNAL_DOMAIN_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED");
          assert.deepEqual(fs.readdirSync(tail.reattemptRoot), ["journal.v2.jsonl"], "a journal-only tail must preserve its root when the tombstone no longer matches record zero");
        } finally {
          fs.writeFileSync(tombstonePath, originalTombstoneBytes, { mode: 0o600 });
          originalTombstoneBytes.fill(0);
        }
      }
      const cleanup = await cleanupHostBindingReattempt({ mode: "cleanup-host-binding-reattempt", packetSha256: HOST_BINDING_REATTEMPT_AUTHORITY.packetSha256 }, cleanupOptions);
      assert.equal(cleanup.status, "GREEN");
      assert.equal(cleanup.reattemptRunRootAbsent, true);
      assert.equal(fs.existsSync(tail.reattemptRoot), false);
    }
  } finally { fs.rmSync(fixtureParent, { recursive: true, force: true }); }
});

test("Docker exact-name absence accepts only the closed daemon not-found frame", () => {
  assert.equal(validateDockerExactNameAbsent({ resourceKind: "container", resourceName: "forme-r4-test", stdout: Buffer.alloc(0), stderr: Buffer.from("Error response from daemon: No such container: forme-r4-test\n"), exitCode: 1 }), true);
  assert.equal(validateDockerExactNameAbsent({ resourceKind: "volume", resourceName: "forme-r4-test", stdout: Buffer.alloc(0), stderr: Buffer.from("Error response from daemon: get forme-r4-test: no such volume\n"), exitCode: 1 }), true);
  for (const input of [
    { resourceKind: "container", resourceName: "forme-r4-test", stdout: Buffer.from("unexpected\n"), stderr: Buffer.alloc(0), exitCode: 1 },
    { resourceKind: "container", resourceName: "forme-r4-test", stdout: Buffer.alloc(0), stderr: Buffer.from("permission denied\n"), exitCode: 1 },
    { resourceKind: "volume", resourceName: "forme-r4-test", stdout: Buffer.alloc(0), stderr: Buffer.from("Error response from daemon: get other: no such volume\n"), exitCode: 1 },
    { resourceKind: "container", resourceName: "forme-r4-test", stdout: Buffer.alloc(0), stderr: Buffer.from("Error response from daemon: No such container: forme-r4-test\n"), exitCode: 2 },
  ]) assert.throws(() => validateDockerExactNameAbsent(input), /POSTGRES_EXACT_NAME_ABSENCE_INVALID/u);
});

test("Postgres cleanup identity frames and resolved container argv are exact and body-free", () => {
  const runId = "d".repeat(32);
  const containerName = `forme-r4-core-${runId}`;
  const containerId = "a".repeat(64);
  const created = validatePostgresContainerCreateFrame({ stdout: Buffer.from(`${containerId}\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName });
  assert.equal(created.containerId, containerId);
  assert.equal(created.identitySha256, postgresContainerIdentityAuthoritySha256(runId, containerName, containerId));
  assert.equal(validatePostgresContainerIdentityFrame({ stdout: Buffer.from(`${containerId}\t/${containerName}\t${runId}\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName, expectedContainerId: containerId }).identitySha256, created.identitySha256);
  const volumeName = containerName;
  assert.equal(validatePostgresVolumeCreateFrame({ stdout: Buffer.from(`${volumeName}\n`), stderr: Buffer.alloc(0), exitCode: 0, volumeName }), true);
  const volumeFrame = `${volumeName}\t${runId}\t2026-08-08T12:34:56Z\tlocal\tlocal\n`;
  const volume = validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(volumeFrame), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName });
  assert.equal(validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(volumeFrame), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName, expectedIdentitySha256: volume.identitySha256 }).identitySha256, volume.identitySha256);
  const plan = buildPostgresPhysicalPlan({ dockerCli: "/owned/docker", dockerUnixSocket: "/owned/docker.sock", localImageId: `sha256:${"b".repeat(64)}` }, `sha256:${"c".repeat(64)}`, runId);
  const rawRemove = plan.steps.find((step: { kind: string }) => step.kind === "container-remove");
  assert.equal(rawRemove.argv.at(-1), POSTGRES_CONTAINER_ID_PLACEHOLDER);
  const resolved = resolvePostgresContainerIdentityStep(rawRemove, runId, containerId);
  assert.equal(resolved.step.argv.at(-1), containerId);
  assert.equal(resolved.journalCommandShapeSha256, postgresContainerCleanupCommandShapeSha256("container-remove", runId, containerId));
  assert.match(postgresVolumeCleanupCommandShapeSha256(runId, volume.identitySha256), /^sha256:[0-9a-f]{64}$/u);
  for (const invoke of [
    () => validatePostgresContainerCreateFrame({ stdout: Buffer.from(`${containerId}\r\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName }),
    () => validatePostgresContainerIdentityFrame({ stdout: Buffer.from(`${"b".repeat(64)}\t/${containerName}\t${runId}\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName, expectedContainerId: containerId }),
    () => validatePostgresContainerIdentityFrame({ stdout: Buffer.from(`${containerId}\t/${containerName}\tforeign\n`), stderr: Buffer.alloc(0), exitCode: 0, runId, containerName, expectedContainerId: containerId }),
    () => validatePostgresVolumeIdentityFrame({ stdout: Buffer.from(volumeFrame.replace("2026-08-08", "2026-08-09")), stderr: Buffer.alloc(0), exitCode: 0, runId, volumeName, expectedIdentitySha256: volume.identitySha256 }),
    () => validatePostgresVolumeCreateFrame({ stdout: Buffer.from(`${volumeName}\nextra\n`), stderr: Buffer.alloc(0), exitCode: 0, volumeName }),
  ]) assert.throws(invoke, /POSTGRES_(?:CONTAINER|VOLUME)_/u);
});

test("runtime snapshot aggregate binds every capsule source size and rejects size drift", () => {
  type RuntimeEntry = Readonly<{ path: string; sha256: string }>;
  type BoundRuntimeEntry = Readonly<{ logicalName: string; path: string; sha256: string; size: number }>;
  const inventory = runtimeDependencyInventory(root) as Readonly<{ files: readonly RuntimeEntry[]; aggregateSha256: string }>;
  const boundFiles: BoundRuntimeEntry[] = inventory.files.map((entry) => {
    const source = path.join(root, entry.path);
    return Object.freeze({ logicalName: runtimeDependencyLogicalName(entry.path), path: source, sha256: entry.sha256, size: fs.lstatSync(source).size });
  });
  const capsule = Object.freeze({ runtimeDependencyAggregateSha256: inventory.aggregateSha256, boundFiles: Object.freeze(boundFiles) });
  const fixtureRoot = constructionJournalFixtureRoot();
  const mismatchRoot = constructionJournalFixtureRoot();
  try {
    const snapshot = stageRuntimeDependencies(capsule, fixtureRoot);
    const expectedTupleFrame = boundFiles.map((entry, index) => `${inventory.files[index]!.path}\0${inventory.files[index]!.sha256}\0${entry.size}\n`).join("");
    assert.equal(snapshot.aggregateSha256, hashFrame(expectedTupleFrame));
    assert.equal(snapshot.fileCount, inventory.files.length);
    assert.equal(snapshot.assertStable(), true);

    const mismatched = boundFiles.map((entry, index) => Object.freeze({ ...entry, size: entry.size + Number(index === 0) }));
    assert.throws(
      () => stageRuntimeDependencies(Object.freeze({ runtimeDependencyAggregateSha256: inventory.aggregateSha256, boundFiles: Object.freeze(mismatched) }), mismatchRoot),
      /RUNTIME_SNAPSHOT_SIZE_DRIFT:/u,
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(mismatchRoot, { recursive: true, force: true });
  }
});

test("retry cleanup journal accepts only exact non-process FSM crash prefixes", async () => {
  type RetryJournalRecord = {
    schemaVersion: string; sequence: number; previousRecordSha256: string | null; runId: string; manifestSha256: string;
    hostBindingId: string; lane: string; event: string; commandShapeSha256: string | null;
    processGroupId: number | null; ownedResources: string[]; terminalCode: string | null; cleanupState: string;
  };
  const capsuleSha256 = hashFrame("retry-capsule\n");
  const runtimeSha256 = hashFrame("retry-runtime-snapshot\n");
  const runId = "e".repeat(32);
  let sequence = 0;
  const record = (overrides: Partial<RetryJournalRecord>): RetryJournalRecord => ({
    schemaVersion: "r4_gate_b_physical_journal.v1", sequence: sequence++, previousRecordSha256: null,
    runId, manifestSha256: hashFrame("retry-manifest\n"), hostBindingId: "b".repeat(32),
    lane: "runner", event: "", commandShapeSha256: null, processGroupId: null,
    ownedResources: [], terminalCode: null, cleanupState: "required", ...overrides,
  });
  const process = (lane: "postgres" | "macos" | "cleanup" | "codex", kind: string, pid: number, ownedResources: string[], options: { commandShapeSha256?: string; terminalCode?: string } = {}) => {
    const commandShapeSha256 = options.commandShapeSha256 ?? hashFrame(`${lane}:${kind}\n`);
    return [
      record({ lane, event: `intent:${kind}`, commandShapeSha256, ownedResources }),
      record({ lane, event: `started:${kind}`, commandShapeSha256, processGroupId: pid, ownedResources }),
      record({ lane, event: `terminal:${kind}`, commandShapeSha256, processGroupId: pid, ownedResources, terminalCode: options.terminalCode ?? "0", cleanupState: "observed-absent" }),
    ];
  };
  const CODEX_PROCESS_KINDS_FOR_TEST = ["version", "help", "schema", "initialize"];
  const authority = record({ event: "retry-authority-revalidated", commandShapeSha256: capsuleSha256, ownedResources: ["retry-run-root"] });
  const runtimeIntent = record({ event: "runtime-snapshot-intent", commandShapeSha256: runtimeSha256, ownedResources: ["runtime-snapshot"] });
  const runtimeObserved = record({ event: "runtime-snapshot-observed", commandShapeSha256: runtimeSha256, ownedResources: ["runtime-snapshot"], terminalCode: "71" });
  const slotShapeSha256 = hashFrame("r4-gate-b-blocked-start-slot-root.v1\n");
  const slotIntent = record({ event: "intent:blocked-start-slot-root", commandShapeSha256: slotShapeSha256, ownedResources: ["blocked-start-slot-root"] });
  const slotObserved = record({ event: "observed:blocked-start-slot-root", commandShapeSha256: slotShapeSha256, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED" });
  const prologue = [authority, runtimeIntent, runtimeObserved, slotIntent, slotObserved];
  for (let length = 1; length <= prologue.length; length += 1) assert.doesNotThrow(() => validateRetryJournalForCleanup(prologue.slice(0, length), runtimeSha256));
  assert.equal(validateRetryJournalForCleanup(prologue, runtimeSha256).runtimeDependencyAggregateSha256, runtimeSha256);

  const postgresMarker = (kind: string) => record({ lane: "postgres", event: `marker:${kind}`, commandShapeSha256: hashFrame(kind), ownedResources: ["postgres-container", "postgres-volume", "postgres-workers"] });
  const postgresContainerId = "a".repeat(64);
  const postgresContainerIdentitySha256 = postgresContainerIdentityAuthoritySha256(runId, `forme-r4-core-${runId}`, postgresContainerId);
  const postgresVolumeIdentitySha256 = hashFrame("postgres-volume-identity\n");
  const postgresObservation = (kind: string, commandShapeSha256: string, ownedResources: string[], terminalCode: string, cleanupState = "required") => record({ lane: "postgres", event: `observation:${kind}`, commandShapeSha256, ownedResources, terminalCode, cleanupState });
  const postgresRunRootShapeSha256 = hashFrame(`postgres-run-root:${runId}\n`);
  const postgresEvents = [
    record({ lane: "postgres", event: "marker:run-root-target-absent", commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"] }),
    record({ lane: "postgres", event: "marker:run-root-created", commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"], terminalCode: "CREATED" }),
    postgresMarker("capsule-revalidate"),
    ...process("postgres", "volume-create", 10_000, ["postgres-process-group"]),
    ...process("postgres", "volume-identity-capture", 10_001, ["postgres-process-group"]),
    postgresObservation("postgres-volume-identity", postgresVolumeIdentitySha256, ["postgres-volume"], "OBSERVED"),
    ...process("postgres", "container-create", 10_002, ["postgres-process-group"]),
    postgresObservation("postgres-container-identity", postgresContainerIdentitySha256, ["postgres-container"], postgresContainerId),
    postgresMarker("container-created-marker"),
    ...process("postgres", "container-start", 10_003, ["postgres-process-group"]),
    postgresMarker("container-started-marker"),
    ...process("postgres", "container-cleanup-inspect", 10_004, ["postgres-process-group"]),
    postgresObservation("postgres-container-pre-remove-identity", postgresContainerIdentitySha256, ["postgres-container"], postgresContainerId),
    ...process("postgres", "container-remove", 10_005, ["postgres-process-group"], { commandShapeSha256: postgresContainerCleanupCommandShapeSha256("container-remove", runId, postgresContainerId) }),
    ...process("postgres", "container-id-absence", 10_006, ["postgres-process-group"], { commandShapeSha256: postgresContainerCleanupCommandShapeSha256("container-id-absence", runId, postgresContainerId), terminalCode: "1" }),
    postgresObservation("postgres-container-id-absent", postgresContainerIdentitySha256, ["postgres-container"], "ABSENT", "observed-absent"),
    ...process("postgres", "container-name-absence", 10_007, ["postgres-process-group"], { terminalCode: "1" }),
    postgresObservation("postgres-container-name-absent", postgresContainerIdentitySha256, ["postgres-container"], "ABSENT", "observed-absent"),
    ...process("postgres", "volume-cleanup-inspect", 10_008, ["postgres-process-group"]),
    postgresObservation("postgres-volume-pre-remove-identity", postgresVolumeIdentitySha256, ["postgres-volume"], "OBSERVED"),
    ...process("postgres", "volume-remove", 10_009, ["postgres-process-group"], { commandShapeSha256: postgresVolumeCleanupCommandShapeSha256(runId, postgresVolumeIdentitySha256) }),
    ...process("postgres", "volume-name-absence", 10_010, ["postgres-process-group"], { terminalCode: "1" }),
    postgresObservation("postgres-volume-name-absent", postgresVolumeIdentitySha256, ["postgres-volume"], "ABSENT", "observed-absent"),
    postgresMarker("postgres-absence-proof"),
  ];
  for (let length = 1; length <= postgresEvents.length; length += 1) assert.doesNotThrow(() => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, length)], runtimeSha256));
  assert.equal(validateRetryJournalForCleanup([...prologue, ...postgresEvents], runtimeSha256).postgresAbsenceProofObserved, true);
  const containerRemoveTerminalIndex = postgresEvents.findIndex((entry) => entry.event === "terminal:container-remove");
  const containerNameAbsenceTerminalIndex = postgresEvents.findIndex((entry) => entry.event === "terminal:container-name-absence");
  const volumeNameAbsenceTerminalIndex = postgresEvents.findIndex((entry) => entry.event === "terminal:volume-name-absence");
  assert.ok(containerRemoveTerminalIndex > 0 && containerNameAbsenceTerminalIndex > containerRemoveTerminalIndex && volumeNameAbsenceTerminalIndex > containerNameAbsenceTerminalIndex);
  assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, containerRemoveTerminalIndex + 1), postgresMarker("postgres-absence-proof")], runtimeSha256),
    /RETRY_CLEANUP_POSTGRES_MARKER_INVALID/u,
    "container rm exit 0 alone must never clear dirty state",
  );
  for (const recreationTerminalIndex of [containerNameAbsenceTerminalIndex, volumeNameAbsenceTerminalIndex]) {
    const dirtyPrefix = [...postgresEvents.slice(0, recreationTerminalIndex), { ...postgresEvents[recreationTerminalIndex]!, terminalCode: "0" }];
    assert.doesNotThrow(() => validateRetryJournalForCleanup([...prologue, ...dirtyPrefix], runtimeSha256));
    assert.throws(
      () => validateRetryJournalForCleanup([...prologue, ...dirtyPrefix, postgresMarker("postgres-absence-proof")], runtimeSha256),
      /RETRY_CLEANUP_POSTGRES_MARKER_INVALID/u,
      "same-name recreation must prevent the absence marker and Green",
    );
  }
  const containerPreObservationIndex = postgresEvents.findIndex((entry) => entry.event === "observation:postgres-container-pre-remove-identity");
  assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, containerPreObservationIndex), { ...postgresEvents[containerPreObservationIndex]!, commandShapeSha256: hashFrame("foreign-container-identity\n") }], runtimeSha256),
    /RETRY_CLEANUP_POSTGRES_TAIL_OBSERVATION_INVALID/u,
  );
  const containerRemoveIntent = postgresEvents.find((entry) => entry.event === "intent:container-remove")!;
  assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, containerPreObservationIndex + 1), { ...containerRemoveIntent, commandShapeSha256: hashFrame("name-bound-remove-forbidden\n") }], runtimeSha256),
    /RETRY_CLEANUP_POSTGRES_CONTAINER_REMOVE_BINDING_INVALID/u,
  );
  const startedMarkerIndex = postgresEvents.findIndex((entry) => entry.event === "marker:container-started-marker");
  const dirtyPostgresPrefix = [...prologue, ...postgresEvents.slice(0, startedMarkerIndex + 1)];
  const postgresCleanupMarkerEarly = record({
    lane: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.lane,
    event: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.event,
    commandShapeSha256: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.commandShapeSha256,
    ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.postgres.ownedResources],
    terminalCode: "ABSENT",
    cleanupState: "observed-absent",
  });
  const cleanupThroughContainerRemove = [
    ...process("cleanup", "cleanup-container-inspect", 10_020, ["cleanup-process-group"]),
    ...process("cleanup", "cleanup-container-remove", 10_021, ["cleanup-process-group"], { commandShapeSha256: postgresContainerCleanupCommandShapeSha256("container-remove", runId, postgresContainerId) }),
  ];
  assert.throws(() => validateRetryJournalForCleanup([...dirtyPostgresPrefix, ...cleanupThroughContainerRemove, postgresCleanupMarkerEarly], runtimeSha256), /RETRY_CLEANUP_POSTGRES_ABSENCE_MARKER_INVALID/u);
  const cleanupThroughContainerAbsence = [
    ...cleanupThroughContainerRemove,
    ...process("cleanup", "cleanup-container-id-absence", 10_022, ["cleanup-process-group"], { commandShapeSha256: postgresContainerCleanupCommandShapeSha256("container-id-absence", runId, postgresContainerId), terminalCode: "1" }),
    ...process("cleanup", "cleanup-container-absence", 10_023, ["cleanup-process-group"], { terminalCode: "1" }),
  ];
  assert.throws(() => validateRetryJournalForCleanup([...dirtyPostgresPrefix, ...cleanupThroughContainerAbsence, postgresCleanupMarkerEarly], runtimeSha256), /RETRY_CLEANUP_POSTGRES_ABSENCE_MARKER_INVALID/u);
  const cleanupThroughVolumeRemove = [
    ...cleanupThroughContainerAbsence,
    ...process("cleanup", "cleanup-volume-inspect", 10_024, ["cleanup-process-group"]),
    ...process("cleanup", "cleanup-volume-remove", 10_025, ["cleanup-process-group"], { commandShapeSha256: postgresVolumeCleanupCommandShapeSha256(runId, postgresVolumeIdentitySha256) }),
  ];
  assert.throws(() => validateRetryJournalForCleanup([...dirtyPostgresPrefix, ...cleanupThroughVolumeRemove, postgresCleanupMarkerEarly], runtimeSha256), /RETRY_CLEANUP_POSTGRES_ABSENCE_MARKER_INVALID/u);
  assert.doesNotThrow(() => validateRetryJournalForCleanup([
    ...dirtyPostgresPrefix,
    ...cleanupThroughVolumeRemove,
    ...process("cleanup", "cleanup-volume-absence", 10_026, ["cleanup-process-group"], { terminalCode: "1" }),
    postgresCleanupMarkerEarly,
  ], runtimeSha256));

  const codexEvents = CODEX_PROCESS_KINDS_FOR_TEST.flatMap((kind, index) => process("codex", kind, 10_100 + index, ["codex-process-group", "codex-stdio"]));
  const codexBeforePostgresProof = process("codex", "version", 10_099, ["codex-process-group", "codex-stdio"]);
  for (let length = 1; length <= codexBeforePostgresProof.length; length += 1) assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, 2), ...codexBeforePostgresProof.slice(0, length)], runtimeSha256),
    /RETRY_CLEANUP_CODEX_PROCESS_PHASE_INVALID/u,
  );
  for (let length = 1; length <= codexEvents.length; length += 1) assert.doesNotThrow(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents, ...codexEvents.slice(0, length)], runtimeSha256),
  );
  const laterLanePrefix = [...prologue, ...postgresEvents, ...codexEvents];

  const macOSRunRootShapeSha256 = hashFrame(`macos-run-root:${runId}\n`);
  const macOSMarkers = [
    record({ lane: "macos", event: "marker:run-root-target-absent", commandShapeSha256: macOSRunRootShapeSha256, ownedResources: ["macos-run-root"] }),
    record({ lane: "macos", event: "marker:run-root-created", commandShapeSha256: macOSRunRootShapeSha256, ownedResources: ["macos-run-root"], terminalCode: "CREATED" }),
    record({ lane: "macos", event: "marker:preflight", commandShapeSha256: hashFrame("macos-preflight-v1\n"), ownedResources: ["macos-run-root"] }),
  ];
  assert.throws(() => validateRetryJournalForCleanup([...prologue, ...postgresEvents, macOSMarkers[0]!], runtimeSha256), /RETRY_CLEANUP_MACOS_RUN_ROOT_TARGET_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, ...postgresEvents, ...codexEvents.slice(0, -1), macOSMarkers[0]!], runtimeSha256), /RETRY_CLEANUP_MACOS_RUN_ROOT_TARGET_INVALID/u);
  for (let length = 1; length <= macOSMarkers.length; length += 1) assert.doesNotThrow(() => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers.slice(0, length)], runtimeSha256));
  const macOSProcessOrder = [
    "compile", "default-keychain-pre", "search-list-pre", "derive-key-certificate", "derive-pkcs12", "custom-keychain-create", "custom-keychain-unlock",
    "custom-keychain-import", "custom-keychain-partition", "binding-canary-add", "binding-canary-find", "identity-inventory", "codesign-sign",
    "codesign-verify-strict", "codesign-entitlements", "codesign-designated-requirement", "codesign-test-requirement", "helper-spawn", "runtime-identity",
    "pre-body-network-sample", "feeder-spawn", "binding-canary-delete", "identity-delete", "custom-keychain-lock", "custom-keychain-delete",
    "default-keychain-post", "search-list-post",
  ];
  const macOSJournalEvents: RetryJournalRecord[] = [];
  const helperPid = 11_017;
  const helperShapeSha256 = hashFrame("macos:helper-spawn\n");
  const helperResources = ["macos-helper-group", "candidate-pipe", "helper-receipt-pipe", "direct-ready-pipe", "direct-release-pipe"];
  const feederResources = ["macos-feeder-group", "candidate-pipe", "completion-pipe", "direct-ready-pipe", "direct-release-pipe"];
  const defaultMetadataSha256 = hashFrame("default-keychain-metadata\n");
  const searchMetadataSha256 = hashFrame("search-list-metadata\n");
  for (const [index, kind] of macOSProcessOrder.entries()) {
    if (kind === "helper-spawn") {
      macOSJournalEvents.push(
        record({ lane: "macos", event: "intent:helper-spawn", commandShapeSha256: helperShapeSha256, ownedResources: helperResources }),
        record({ lane: "macos", event: "started:helper-spawn", commandShapeSha256: helperShapeSha256, processGroupId: helperPid, ownedResources: helperResources }),
      );
    } else if (kind === "feeder-spawn") {
      macOSJournalEvents.push(...process("macos", kind, 11_000 + index, feederResources));
      macOSJournalEvents.push(record({ lane: "macos", event: "terminal:helper-spawn", commandShapeSha256: helperShapeSha256, processGroupId: helperPid, ownedResources: helperResources, terminalCode: "0", cleanupState: "observed-absent" }));
    } else macOSJournalEvents.push(...process("macos", kind, 11_000 + index, ["macos-process-group"]));
    if (["default-keychain-pre", "default-keychain-post"].includes(kind)) macOSJournalEvents.push(record({ lane: "macos", event: `observation:${kind}`, commandShapeSha256: defaultMetadataSha256, ownedResources: [], terminalCode: "OBSERVED" }));
    if (["search-list-pre", "search-list-post"].includes(kind)) macOSJournalEvents.push(record({ lane: "macos", event: `observation:${kind}`, commandShapeSha256: searchMetadataSha256, ownedResources: [], terminalCode: "OBSERVED" }));
  }
  for (let length = 1; length <= macOSJournalEvents.length; length += 1) assert.doesNotThrow(() => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents.slice(0, length)], runtimeSha256));
  const authenticatedMacOS = validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents], runtimeSha256);
  assert.equal(authenticatedMacOS.macOSExternalEffectsAbsent, true);
  assert.equal(authenticatedMacOS.macOSMetadataRestored, true);
  const macOSAbsenceMarker = record({
    lane: RETRY_CLEANUP_ABSENCE_MARKERS.macos.lane,
    event: RETRY_CLEANUP_ABSENCE_MARKERS.macos.event,
    commandShapeSha256: RETRY_CLEANUP_ABSENCE_MARKERS.macos.commandShapeSha256,
    ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.macos.ownedResources],
    terminalCode: "ABSENT",
    cleanupState: "observed-absent",
  });
  assert.equal(validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents, macOSAbsenceMarker], runtimeSha256).macOSCleanupAbsenceObserved, true);

  const cleanupCheckpoint = record({ lane: "cleanup", event: "retry-cleanup-observed", commandShapeSha256: hashFrame("retry-cleanup-v1\n"), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
  assert.throws(() => validateRetryJournalForCleanup([...prologue, cleanupCheckpoint], runtimeSha256), /RETRY_CLEANUP_CHECKPOINT_INVALID/u);
  const cleanExecutionPrefix = [...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents, macOSAbsenceMarker, cleanupCheckpoint];
  assert.doesNotThrow(() => validateRetryJournalForCleanup(cleanExecutionPrefix, runtimeSha256));
  const cleanupSuffix = process("cleanup", "cleanup-container-inspect", 12_000, ["cleanup-process-group"]);
  for (let length = 1; length <= cleanupSuffix.length; length += 1) assert.throws(
    () => validateRetryJournalForCleanup([...cleanExecutionPrefix, ...cleanupSuffix.slice(0, length)], runtimeSha256),
    /RETRY_CLEANUP_RECORD_AFTER_CHECKPOINT/u,
  );
  const terminalCrashCheckpoint = record({ lane: "cleanup", event: "retry-cleanup-after-terminal", commandShapeSha256: hashFrame("retry-cleanup-v1\n"), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
  assert.throws(() => validateRetryJournalForCleanup([authority, terminalCrashCheckpoint], runtimeSha256), /RETRY_CLEANUP_CHECKPOINT_INVALID/u);
  const terminalCleanPrefix = [...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents, macOSAbsenceMarker, terminalCrashCheckpoint];
  assert.doesNotThrow(() => validateRetryJournalForCleanup(terminalCleanPrefix, runtimeSha256));
  const postgresCompensationMarker = record({
    lane: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.lane,
    event: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.event,
    commandShapeSha256: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.commandShapeSha256,
    ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.postgres.ownedResources],
    terminalCode: "ABSENT",
    cleanupState: "observed-absent",
  });
  assert.equal(validateRetryJournalForCleanup([...prologue, postgresCompensationMarker], runtimeSha256).postgresAbsenceProofObserved, true);
  const compensatedLanePrefix = [...prologue, postgresCompensationMarker, ...codexEvents, macOSAbsenceMarker];
  assert.doesNotThrow(() => validateRetryJournalForCleanup([...compensatedLanePrefix, terminalCrashCheckpoint], runtimeSha256));
  assert.throws(() => validateRetryJournalForCleanup([...prologue, postgresCompensationMarker, postgresEvents[0]!], runtimeSha256), /RETRY_CLEANUP_RECORD_AFTER_POSTGRES_ABSENCE/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, postgresCompensationMarker, ...process("postgres", "readiness", 12_901, ["postgres-process-group"]).slice(0, 1)], runtimeSha256), /RETRY_CLEANUP_RECORD_AFTER_POSTGRES_ABSENCE/u);
  const postMacOSAbsenceRecords = [
    macOSMarkers[0]!,
    macOSJournalEvents.find((entry) => entry.event === "observation:default-keychain-pre")!,
    macOSJournalEvents.find((entry) => entry.event === "intent:compile")!,
    process("cleanup", "binding-canary-delete", 12_902, ["cleanup-process-group"])[0]!,
  ];
  for (const afterAbsence of postMacOSAbsenceRecords) assert.throws(
    () => validateRetryJournalForCleanup([...compensatedLanePrefix, afterAbsence], runtimeSha256),
    /RETRY_CLEANUP_RECORD_AFTER_MACOS_ABSENCE/u,
  );

  assert.throws(() => validateRetryJournalForCleanup([{ ...authority, terminalCode: "GREEN" }], runtimeSha256), /RETRY_CLEANUP_AUTHORITY_RECORD_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup(prologue, hashFrame("wrong-runtime-snapshot\n")), /RETRY_CLEANUP_RUNTIME_SNAPSHOT_AUTHORITY_DRIFT/u);
  assert.throws(() => validateRetryJournalForCleanup([authority, runtimeIntent, { ...runtimeObserved, commandShapeSha256: hashFrame("wrong-runtime-observation\n") }], runtimeSha256), /RETRY_CLEANUP_RUNTIME_SNAPSHOT_OBSERVATION_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, postgresMarker("evil")], runtimeSha256), /RETRY_CLEANUP_POSTGRES_MARKER_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, postgresEvents[1]!], runtimeSha256), /RETRY_CLEANUP_POSTGRES_RUN_ROOT_CREATED_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, macOSMarkers[1]!], runtimeSha256), /RETRY_CLEANUP_MACOS_RUN_ROOT_CREATED_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, ...process("macos", "custom-keychain-create", 10_999, ["macos-process-group"])], runtimeSha256), /RETRY_CLEANUP_MACOS_PROCESS_WITHOUT_RUN_ROOT/u);
  const firstObservationIndex = macOSJournalEvents.findIndex((entry) => entry.event === "observation:default-keychain-pre");
  const firstObservationPrefix = [...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents.slice(0, firstObservationIndex + 1)];
  assert.throws(() => validateRetryJournalForCleanup([...firstObservationPrefix, { ...firstObservationPrefix.at(-1)! }], runtimeSha256), /RETRY_CLEANUP_MACOS_OBSERVATION_INVALID/u);
  const tooEarlyGreen = record({ lane: "cleanup", event: "retry-cleanup-observed", commandShapeSha256: hashFrame("retry-cleanup-v1\n"), ownedResources: [], terminalCode: "GREEN", cleanupState: "observed-absent" });
  assert.throws(() => validateRetryJournalForCleanup([authority, tooEarlyGreen], runtimeSha256), /RETRY_CLEANUP_CHECKPOINT_INVALID/u);
  const unresolvedCodex = process("codex", "version", 13_000, ["codex-process-group", "codex-stdio"]).slice(0, 2);
  assert.throws(() => validateRetryJournalForCleanup([...prologue, ...postgresEvents, ...unresolvedCodex, cleanupCheckpoint], runtimeSha256), /RETRY_CLEANUP_CHECKPOINT_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...terminalCleanPrefix, ...process("cleanup", "cleanup-volume-inspect", 13_001, ["cleanup-process-group"])], runtimeSha256), /RETRY_CLEANUP_RECORD_AFTER_CHECKPOINT/u);

  const postgresAfterProof = process("postgres", "readiness", 13_100, ["postgres-process-group"]);
  for (let length = 1; length <= postgresAfterProof.length; length += 1) assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents, ...postgresAfterProof.slice(0, length)], runtimeSha256),
    /RETRY_CLEANUP_RECORD_AFTER_POSTGRES_ABSENCE/u,
  );
  const postgresAfterRemoval = process("postgres", "container-create", 13_101, ["postgres-process-group"]);
  assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...postgresEvents.slice(0, -1), ...postgresAfterRemoval, postgresEvents.at(-1)!], runtimeSha256),
    /RETRY_CLEANUP_POSTGRES_REMOVAL_SUFFIX_INVALID/u,
  );

  const postgresReentry = process("postgres", "readiness", 13_102, ["postgres-process-group"]);
  const completedMacOSCompile = macOSJournalEvents.slice(0, 3);
  for (const authenticatedLaterLane of [laterLanePrefix, [...laterLanePrefix, ...macOSMarkers, ...completedMacOSCompile]]) {
    for (let length = 1; length <= postgresReentry.length; length += 1) assert.throws(
      () => validateRetryJournalForCleanup([...authenticatedLaterLane, ...postgresReentry.slice(0, length)], runtimeSha256),
      /RETRY_CLEANUP_RECORD_AFTER_POSTGRES_ABSENCE/u,
    );
  }

  const cleanupStarted = process("cleanup", "cleanup-container-inspect", 13_104, ["cleanup-process-group"]);
  const codexAfterCleanup = process("codex", "help", 13_105, ["codex-process-group", "codex-stdio"]);
  const macOSAfterCleanup = macOSJournalEvents.slice(0, 3);
  for (let length = 1; length <= codexAfterCleanup.length; length += 1) assert.throws(
    () => validateRetryJournalForCleanup([...prologue, ...cleanupStarted, ...codexAfterCleanup.slice(0, length)], runtimeSha256),
    /RETRY_CLEANUP_PROCESS_PHASE_INVALID/u,
  );
  for (let length = 1; length <= macOSAfterCleanup.length; length += 1) assert.throws(
    () => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...cleanupStarted, ...macOSAfterCleanup.slice(0, length)], runtimeSha256),
    /RETRY_CLEANUP_(?:PROCESS_PHASE_INVALID|PROCESS_AFTER_POSTGRES_ABSENCE)/u,
  );
  const secondCleanup = process("cleanup", "cleanup-volume-inspect", 13_106, ["cleanup-process-group"]);
  for (let length = 1; length <= secondCleanup.length; length += 1) assert.doesNotThrow(
    () => validateRetryJournalForCleanup([...prologue, ...cleanupStarted, ...secondCleanup.slice(0, length)], runtimeSha256),
  );

  assert.throws(
    () => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...process("macos", "custom-keychain-delete", 13_107, ["macos-process-group"])], runtimeSha256),
    /RETRY_CLEANUP_MACOS_PROCESS_ORDER_INVALID/u,
  );
  const keychainCreateIntentIndex = macOSJournalEvents.findIndex((entry) => entry.event === "intent:custom-keychain-create");
  const throughKeychainCreateStarted = macOSJournalEvents.slice(0, keychainCreateIntentIndex + 2);
  const delayedKeychainCreateTerminal = macOSJournalEvents[keychainCreateIntentIndex + 2]!;
  const cleanupKeychainDelete = process("cleanup", "custom-keychain-delete", 13_108, ["cleanup-process-group"]);
  assert.throws(
    () => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...throughKeychainCreateStarted, ...cleanupKeychainDelete, delayedKeychainCreateTerminal], runtimeSha256),
    /RETRY_CLEANUP_PROCESS_PHASE_INVALID/u,
  );
  const dirtyMacOSRecords = [...laterLanePrefix, ...macOSMarkers, ...throughKeychainCreateStarted];
  const dirtyMacOSAuthority = validateRetryJournalForCleanup(dirtyMacOSRecords, runtimeSha256);
  assert.equal(dirtyMacOSAuthority.macOSExternalEffectsAbsent, false);
  assert.equal(dirtyMacOSAuthority.macOSMetadataRestored, false);
  assert.equal(fs.existsSync(path.join(CANONICAL_SYSTEM_TEMP_ROOT, `forme-r4-gate-b-core-${runId}`)), false);
  await assert.rejects(
    () => cleanupMacOSResourcesFromJournal({ capsule: Object.freeze({}), runId, records: dirtyMacOSRecords, journal: Object.freeze({}), processPort: null, cleanupAuthority: dirtyMacOSAuthority }),
    /MACOS_CLEANUP_ROOT_MISSING_WITH_KEYCHAIN_AUTHORITY/u,
  );
  assert.throws(() => validateRetryJournalForCleanup([...dirtyMacOSRecords, macOSAbsenceMarker], runtimeSha256), /RETRY_CLEANUP_MACOS_ABSENCE_MARKER_INVALID/u);
  assert.throws(() => validateRetryJournalForCleanup([...dirtyMacOSRecords, terminalCrashCheckpoint], runtimeSha256), /RETRY_CLEANUP_CHECKPOINT_INVALID/u);

  const feederIntentIndex = macOSJournalEvents.findIndex((entry) => entry.event === "intent:feeder-spawn");
  const bindingDeleteIntent = macOSJournalEvents.find((entry) => entry.event === "intent:binding-canary-delete");
  assert.ok(feederIntentIndex >= 0 && bindingDeleteIntent !== undefined);
  for (const directPrefixLength of [feederIntentIndex + 2, feederIntentIndex + 3]) {
    assert.throws(
      () => validateRetryJournalForCleanup([...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents.slice(0, directPrefixLength), bindingDeleteIntent], runtimeSha256),
      /RETRY_CLEANUP_MACOS_DIRECT_PROCESS_OVERLAP/u,
    );
  }
  const feederStarted = macOSJournalEvents[feederIntentIndex + 1]!;
  assert.equal(feederStarted.event, "started:feeder-spawn");
  const directStartedPrefix = [...laterLanePrefix, ...macOSMarkers, ...macOSJournalEvents.slice(0, feederIntentIndex + 2)];
  const helperRecovery = record({ lane: "macos", event: "cleanup-observed-absent:helper-spawn", commandShapeSha256: helperShapeSha256, processGroupId: helperPid, ownedResources: helperResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
  const feederRecovery = record({ lane: "macos", event: "cleanup-observed-absent:feeder-spawn", commandShapeSha256: feederStarted.commandShapeSha256, processGroupId: feederStarted.processGroupId, ownedResources: feederResources, terminalCode: "ABSENT", cleanupState: "observed-absent" });
  for (const recoveryOrder of [[helperRecovery, feederRecovery], [feederRecovery, helperRecovery]]) {
    assert.doesNotThrow(() => validateRetryJournalForCleanup([...directStartedPrefix, recoveryOrder[0]!], runtimeSha256));
    assert.doesNotThrow(() => validateRetryJournalForCleanup([...directStartedPrefix, ...recoveryOrder], runtimeSha256));
    assert.doesNotThrow(() => validateRetryJournalForCleanup([...directStartedPrefix, ...recoveryOrder, bindingDeleteIntent], runtimeSha256));
    assert.throws(() => validateRetryJournalForCleanup([...directStartedPrefix, recoveryOrder[0]!, bindingDeleteIntent], runtimeSha256), /RETRY_CLEANUP_MACOS_DIRECT_PROCESS_OVERLAP/u);
  }
});

test("Postgres journal proof bypasses closed effects and compensation marker makes root-removal re-entry idempotent", async () => {
  const absentRunId = createHash("sha256").update(`postgres-absence:${process.pid}:${Date.now()}`).digest("hex").slice(0, 32);
  const absentRoot = path.join(CANONICAL_SYSTEM_TEMP_ROOT, `forme-r4-gate-b-postgres-${absentRunId}`);
  assert.equal(fs.existsSync(absentRoot), false);
  let processStarts = 0;
  assert.equal(await cleanupPostgresResources({
    capsule: Object.freeze({}),
    runId: absentRunId,
    journal: Object.freeze({ async append() { throw new Error("journal proof path must not append"); } }),
    records: Object.freeze([
      Object.freeze({ lane: "postgres", event: "marker:run-root-target-absent" }),
      Object.freeze({ lane: "postgres", event: "marker:run-root-created" }),
      Object.freeze({ lane: "postgres", event: "intent:volume-create" }),
      Object.freeze({ lane: "postgres", event: "intent:container-create" }),
      Object.freeze({ lane: "postgres", event: "marker:postgres-absence-proof", commandShapeSha256: hashFrame("postgres-absence-proof"), processGroupId: null, ownedResources: ["postgres-container", "postgres-volume", "postgres-workers"], terminalCode: null, cleanupState: "required" }),
    ]),
    processPort: Object.freeze({ async start() { processStarts += 1; throw new Error("proof path must not start cleanup"); } }),
    cleanupAuthority: Object.freeze({ postgresAbsenceProofObserved: false }),
  }), true);
  assert.equal(processStarts, 0);
  await assert.rejects(
    () => cleanupPostgresResources({
      capsule: Object.freeze({}),
      runId: absentRunId,
      journal: Object.freeze({ async append() { throw new Error("forged authority path must not append"); } }),
      records: Object.freeze([
        Object.freeze({ lane: "postgres", event: "marker:run-root-target-absent" }),
        Object.freeze({ lane: "postgres", event: "marker:run-root-created" }),
        Object.freeze({ lane: "postgres", event: "intent:container-create" }),
      ]),
      processPort: null,
      cleanupAuthority: Object.freeze({ postgresAbsenceProofObserved: true }),
    }),
    /POSTGRES_CLEANUP_ROOT_MISSING_WITH_EFFECT_AUTHORITY/u,
  );

  const transferRunId = createHash("sha256").update(`postgres-transfer:${process.pid}:${Date.now()}`).digest("hex").slice(0, 32);
  const transferRoot = path.join(CANONICAL_SYSTEM_TEMP_ROOT, `forme-r4-gate-b-postgres-${transferRunId}`);
  assert.equal(fs.existsSync(transferRoot), false);
  const records: Array<Record<string, unknown>> = [];
  const journal = Object.freeze({
    async append(value: Record<string, unknown>) {
      const record = Object.freeze({ sequence: records.length, processGroupId: null, terminalCode: null, cleanupState: "required", ownedResources: [], ...value });
      records.push(record);
      return record;
    },
  });
  const postgresRootState: { authority: null | { rootFd: number; parentFd: number } } = { authority: null };
  const originalMkdir = fs.mkdirSync;
  fs.mkdirSync = ((candidate: fs.PathLike, options?: fs.MakeDirectoryOptions & { recursive?: false }) => {
    if (String(candidate) === path.join(transferRoot, "home")) throw Object.assign(new Error("injected after created marker"), { code: "EIO" });
    return originalMkdir(candidate, options as never);
  }) as typeof fs.mkdirSync;
  try {
    await assert.rejects(() => executePostgresLane({
      capsule: Object.freeze({ docker: Object.freeze({ cliPath: "/usr/bin/false", socketPath: path.join(CANONICAL_SYSTEM_TEMP_ROOT, "forme-r4-unused-docker.sock"), localImageId: hashFrame("postgres-image\n") }) }),
      manifestSha256: hashFrame("postgres-transfer-manifest\n"),
      runId: transferRunId,
      runtimeSnapshot: Object.freeze({ readText(relativePath: string) { return fs.readFileSync(path.join(root, relativePath), "utf8"); } }),
      journal,
      processPort: Object.freeze({ async start() { throw new Error("Postgres process start forbidden in authority-transfer test"); } }),
      postgresRootState,
    }), /injected after created marker/u);
  } finally {
    fs.mkdirSync = originalMkdir;
  }
  assert.notEqual(postgresRootState.authority, null);
  const carriedRootFd = postgresRootState.authority!.rootFd;
  assert.doesNotThrow(() => fs.fstatSync(carriedRootFd));
  try {
    assert.equal(await cleanupPostgresResources({
      capsule: Object.freeze({}),
      runId: transferRunId,
      journal,
      records,
      processPort: Object.freeze({ async start() { throw new Error("no-effect cleanup must not start a process"); } }),
      cleanupAuthority: Object.freeze({ postgresAbsenceProofObserved: false }),
      rootAuthority: postgresRootState.authority,
    }), true);
    postgresRootState.authority = null;
    assert.equal(fs.existsSync(transferRoot), false);
    assert.throws(() => fs.fstatSync(carriedRootFd), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
    const durableMarker = records.at(-1);
    assert.deepEqual(durableMarker, {
      sequence: records.length - 1,
      processGroupId: null,
      terminalCode: "ABSENT",
      cleanupState: "observed-absent",
      ownedResources: [...RETRY_CLEANUP_ABSENCE_MARKERS.postgres.ownedResources],
      lane: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.lane,
      event: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.event,
      commandShapeSha256: RETRY_CLEANUP_ABSENCE_MARKERS.postgres.commandShapeSha256,
    });
    const recordCountAfterRemoval = records.length;
    assert.equal(await cleanupPostgresResources({
      capsule: Object.freeze({}),
      runId: transferRunId,
      journal,
      records,
      processPort: Object.freeze({ async start() { throw new Error("durable root-absent re-entry must not start a process"); } }),
      cleanupAuthority: Object.freeze({ postgresAbsenceProofObserved: false }),
    }), true);
    assert.equal(records.length, recordCountAfterRemoval, "root-absent re-entry must consume the durable journal marker without appending");
  } finally {
    if (postgresRootState.authority !== null) closeExactOwnedRootAuthority(postgresRootState.authority);
    if (fs.existsSync(transferRoot)) fs.rmSync(transferRoot, { recursive: true, force: true });
  }
});

test("macOS compensation marker is durable before root removal and is the only root-absent re-entry authority", async () => {
  const runId = createHash("sha256").update(`macos-cleanup-reentry:${process.pid}:${Date.now()}`).digest("hex").slice(0, 32);
  const runRoot = path.join(CANONICAL_SYSTEM_TEMP_ROOT, `forme-r4-gate-b-core-${runId}`);
  assert.equal(fs.existsSync(runRoot), false);
  fs.mkdirSync(runRoot, { mode: 0o700 });
  const records: Array<Record<string, unknown>> = [
    Object.freeze({ lane: "macos", event: "marker:run-root-target-absent", processGroupId: null }),
    Object.freeze({ lane: "macos", event: "marker:run-root-created", processGroupId: null }),
  ];
  let appendCount = 0;
  const journal = Object.freeze({
    async append(value: Record<string, unknown>) {
      appendCount += 1;
      const record = Object.freeze({ processGroupId: null, terminalCode: null, cleanupState: "required", ownedResources: [], ...value });
      records.push(record);
      return record;
    },
  });
  try {
    assert.equal(await cleanupMacOSResourcesFromJournal({ capsule: Object.freeze({}), runId, records, journal, processPort: null, cleanupAuthority: Object.freeze({ macOSExternalEffectsAbsent: false, macOSMetadataRestored: false }) }), true);
    assert.equal(fs.existsSync(runRoot), false);
    assert.equal(appendCount, 1);
    assert.equal(records.at(-1)?.event, RETRY_CLEANUP_ABSENCE_MARKERS.macos.event);
    assert.equal(await cleanupMacOSResourcesFromJournal({ capsule: Object.freeze({}), runId, records, journal, processPort: null, cleanupAuthority: Object.freeze({ macOSExternalEffectsAbsent: false, macOSMetadataRestored: false }) }), true);
    assert.equal(appendCount, 1, "root-absent re-entry must rely on the exact durable macOS marker without appending");

    const forgedRecords = records.slice(0, -1);
    await assert.rejects(
      () => cleanupMacOSResourcesFromJournal({ capsule: Object.freeze({}), runId, records: forgedRecords, journal, processPort: null, cleanupAuthority: Object.freeze({ macOSExternalEffectsAbsent: true, macOSMetadataRestored: true }) }),
      /MACOS_CLEANUP_ROOT_MISSING_WITH_KEYCHAIN_AUTHORITY/u,
    );
  } finally {
    if (fs.existsSync(runRoot)) fs.rmSync(runRoot, { recursive: true, force: true });
  }
});

test("checkpoint writer failure preserves a preexisting final and closes deletion authority", () => {
  const fixtureParent = constructionJournalFixtureRoot();
  const fixtureRoot = path.join(fixtureParent, "checkpoint-writer-root");
  fs.mkdirSync(fixtureRoot, { mode: 0o700 });
  const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
  const sentinel = Buffer.from("same-uid-preexisting-checkpoint\n", "utf8");
  const attempted = Buffer.from("writer-owned-checkpoint\n", "utf8");
  fs.writeFileSync(checkpointPath, sentinel, { flag: "wx", mode: 0o600 });
  const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_WRITER_COLLISION_TEST" });
  try {
    assert.throws(() => atomicWritePrivateFile(checkpointPath, attempted, 0o600, { anchor: fixtureParent }), (error: unknown) => error instanceof Error && "code" in error && error.code === "PRIVATE_WRITE_TARGET_EXISTS");
    assert.throws(
      () => finalizeFailedCheckpointWriterRoot({ rootAuthority: authority, checkpointPath, publication: null }),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_CHECKPOINT_WRITE_RESIDUE_PRESERVED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
    assert.equal(fs.existsSync(fixtureRoot), true);
    const observed = fs.readFileSync(checkpointPath);
    try { assert.equal(observed.equals(sentinel), true); } finally { observed.fill(0); }
    assert.throws(() => fs.fstatSync(authority.rootFd), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
  } finally {
    sentinel.fill(0); attempted.fill(0);
    closeExactOwnedRootAuthority(authority);
    fs.rmSync(fixtureParent, { recursive: true, force: true });
  }
});

test("checkpoint writer failure cleanup removes only its captured published identity", () => {
  const fixtureParent = constructionJournalFixtureRoot();
  const fixtureRoot = path.join(fixtureParent, "checkpoint-writer-owned-root");
  fs.mkdirSync(fixtureRoot, { mode: 0o700 });
  const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
  const bytes = Buffer.from("writer-owned-checkpoint\n", "utf8");
  const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_WRITER_OWNED_TEST" });
  try {
    const publication = atomicWritePrivateFile(checkpointPath, bytes, 0o600, { anchor: fixtureParent });
    assert.equal(publication.sha256, hashFrame("writer-owned-checkpoint\n"));
    assert.deepEqual(finalizeFailedCheckpointWriterRoot({ rootAuthority: authority, checkpointPath, publication }), { rootAbsent: true, ownedFinalRemoved: true });
    assert.equal(fs.existsSync(fixtureRoot), false);
  } finally {
    bytes.fill(0);
    closeExactOwnedRootAuthority(authority);
    fs.rmSync(fixtureParent, { recursive: true, force: true });
  }
});

test("checkpoint durable ownership journal authenticates crash residues and never claims missing-journal collisions", () => {
  const asIdentity = (stat: fs.Stats) => Object.freeze({ size: stat.size, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, device: String(stat.dev), inode: String(stat.ino), nlink: stat.nlink, mtimeMilliseconds: Math.trunc(stat.mtimeMs) });
  const bytes = Buffer.from("durably-claimed-checkpoint\n", "utf8");
  const checkpointSha256 = hashFrame("durably-claimed-checkpoint\n");
  const exerciseClaimedPhase = (phase: "stage" | "link" | "published") => {
    const fixtureParent = constructionJournalFixtureRoot();
    const fixtureRoot = path.join(fixtureParent, `checkpoint-claim-${phase}`);
    fs.mkdirSync(fixtureRoot, { mode: 0o700 });
    const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
    const temporaryPath = path.join(fixtureRoot, `.construction-checkpoint.v1.json.${checkpointFixture().constructionRunId}.tmp`);
    const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: `CHECKPOINT_CLAIM_${phase.toUpperCase()}_TEST` });
    try {
      const claim = createCheckpointOwnershipJournal({ rootAuthority: authority, checkpointPath, checkpointSha256 });
      fs.writeFileSync(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
      const tempFd = fs.openSync(temporaryPath, fs.constants.O_RDONLY); fs.fsyncSync(tempFd); fs.closeSync(tempFd);
      claim.onTemporaryDurable(Object.freeze({ sha256: checkpointSha256, identity: asIdentity(fs.lstatSync(temporaryPath)) }));
      if (phase !== "stage") {
        fs.linkSync(temporaryPath, checkpointPath);
        claim.onLinkDurable(Object.freeze({ sha256: checkpointSha256, identity: asIdentity(fs.lstatSync(checkpointPath)) }));
      }
      if (phase === "published") {
        fs.unlinkSync(temporaryPath);
        claim.onPublishedDurable(Object.freeze({ sha256: checkpointSha256, identity: asIdentity(fs.lstatSync(checkpointPath)) }));
      }
      claim.closeForCrashTest();
      const authenticated = readConstructionJournalForCleanup({ constructionRoot: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl"), checkpointPath, rootAuthority: authority });
      assert.deepEqual(reconcileCheckpointOwnershipJournalForCleanup(authenticated, checkpointPath), { rootAbsent: true, claimRecovered: true });
      assert.equal(fs.existsSync(fixtureRoot), false);
    } finally {
      closeExactOwnedRootAuthority(authority);
      fs.rmSync(fixtureParent, { recursive: true, force: true });
    }
  };
  try {
    for (const phase of ["stage", "link", "published"] as const) exerciseClaimedPhase(phase);

    for (const collisionName of ["construction-checkpoint.v1.json", `.construction-checkpoint.v1.json.${checkpointFixture().constructionRunId}.tmp`]) {
      const fixtureParent = constructionJournalFixtureRoot();
      const fixtureRoot = path.join(fixtureParent, "checkpoint-unclaimed");
      fs.mkdirSync(fixtureRoot, { mode: 0o700 });
      const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
      const collisionPath = path.join(fixtureRoot, collisionName);
      fs.writeFileSync(collisionPath, bytes, { flag: "wx", mode: 0o600 });
      const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_UNCLAIMED_TEST" });
      assert.throws(
        () => readConstructionJournalForCleanup({ constructionRoot: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl"), checkpointPath, rootAuthority: authority }),
        /CONSTRUCTION_CHECKPOINT_RESIDUE_UNCLAIMED/u,
      );
      assert.equal(fs.readFileSync(collisionPath).equals(bytes), true);
      fs.rmSync(fixtureParent, { recursive: true, force: true });
    }

    const fixtureParent = constructionJournalFixtureRoot();
    const fixtureRoot = path.join(fixtureParent, "checkpoint-claim-commit");
    fs.mkdirSync(fixtureRoot, { mode: 0o700 });
    const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
    const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_CLAIM_COMMIT_TEST" });
    const claim = createCheckpointOwnershipJournal({ rootAuthority: authority, checkpointPath, checkpointSha256 });
    atomicWritePrivateFile(checkpointPath, bytes, 0o600, { anchor: fixtureParent, onTemporaryDurable: claim.onTemporaryDurable, onLinkDurable: claim.onLinkDurable, onPublishedDurable: claim.onPublishedDurable });
    claim.commit();
    assert.equal(fs.existsSync(path.join(fixtureRoot, "journal.v1.jsonl")), false);
    closeExactOwnedRootAuthority(authority);
    const cleanupAuthority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_COMMITTED_PRESERVE_TEST" });
    assert.throws(
      () => readConstructionJournalForCleanup({ constructionRoot: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl"), checkpointPath, rootAuthority: cleanupAuthority }),
      /CONSTRUCTION_CHECKPOINT_RESIDUE_UNCLAIMED/u,
    );
    assert.equal(fs.readFileSync(checkpointPath).equals(bytes), true);
    fs.rmSync(fixtureParent, { recursive: true, force: true });
  } finally { bytes.fill(0); }
});

test("checkpoint ownership journal factory and commit faults close descriptors without claiming residue", () => {
  const bytes = Buffer.from("checkpoint-claim-fault\n", "utf8");
  const checkpointSha256 = hashFrame("checkpoint-claim-fault\n");
  try {
    for (const fault of ["fchmod", "journal-fsync", "root-fsync", "initial-append-partial", "initial-append-fsync", "cleanup-unlink", "cleanup-close", "cleanup-root-fsync"] as const) {
      const fixtureParent = constructionJournalFixtureRoot();
      const fixtureRoot = path.join(fixtureParent, `claim-factory-${fault}`);
      fs.mkdirSync(fixtureRoot, { mode: 0o700 });
      const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
      const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_CLAIM_FACTORY_FAULT_TEST" });
      const originalOpen = fs.openSync; const originalFchmod = fs.fchmodSync; const originalFsync = fs.fsyncSync; const originalWrite = fs.writeSync; const originalUnlink = fs.unlinkSync; const originalClose = fs.closeSync;
      let journalFd: number | null = null; let fsyncCount = 0; let writeInjected = false; let cleanupFaultInjected = false;
      fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
        const descriptor = originalOpen(target, flags, mode);
        if (String(target).endsWith("/journal.v1.jsonl")) journalFd = descriptor;
        return descriptor;
      }) as typeof fs.openSync;
      fs.fchmodSync = ((descriptor: number, mode: fs.Mode) => { if (fault === "fchmod") throw Object.assign(new Error("injected claim fchmod"), { code: "EIO" }); return originalFchmod(descriptor, mode); }) as typeof fs.fchmodSync;
      fs.fsyncSync = ((descriptor: number) => {
        fsyncCount += 1;
        if ((fault === "journal-fsync" && fsyncCount === 1) || (fault === "root-fsync" && fsyncCount === 2) || (fault === "initial-append-fsync" && fsyncCount === 3) || (fault === "cleanup-root-fsync" && fsyncCount === 3)) throw Object.assign(new Error(`injected ${fault}`), { code: "EIO" });
        return originalFsync(descriptor);
      }) as typeof fs.fsyncSync;
      fs.writeSync = ((descriptor: number, buffer: Uint8Array, offset?: number, length?: number, position?: number | null) => {
        if ((fault === "initial-append-partial" || fault.startsWith("cleanup-")) && !writeInjected) { writeInjected = true; originalWrite(descriptor, buffer, offset ?? 0, Math.min(length ?? buffer.byteLength, 7), position); throw Object.assign(new Error("injected partial claim append"), { code: "EIO" }); }
        return originalWrite(descriptor, buffer, offset, length, position);
      }) as typeof fs.writeSync;
      fs.unlinkSync = ((target: fs.PathLike) => {
        if (fault === "cleanup-unlink" && !cleanupFaultInjected && String(target).endsWith("/journal.v1.jsonl")) { cleanupFaultInjected = true; throw Object.assign(new Error("injected claim cleanup unlink"), { code: "EIO" }); }
        return originalUnlink(target);
      }) as typeof fs.unlinkSync;
      fs.closeSync = ((descriptor: number) => {
        if (fault === "cleanup-close" && !cleanupFaultInjected && descriptor === journalFd) { cleanupFaultInjected = true; originalClose(descriptor); throw Object.assign(new Error("injected claim cleanup close"), { code: "EIO" }); }
        return originalClose(descriptor);
      }) as typeof fs.closeSync;
      try {
        assert.throws(
          () => createCheckpointOwnershipJournal({ rootAuthority: authority, checkpointPath, checkpointSha256 }),
          (error: unknown) => error instanceof Error && (!fault.startsWith("cleanup-") || error.message === "CONSTRUCTION_CHECKPOINT_CLAIM_FACTORY_CLEANUP_UNCERTAIN"),
        );
      }
      finally { fs.openSync = originalOpen; fs.fchmodSync = originalFchmod; fs.fsyncSync = originalFsync; fs.writeSync = originalWrite; fs.unlinkSync = originalUnlink; fs.closeSync = originalClose; }
      assert.equal(fs.existsSync(path.join(fixtureRoot, "journal.v1.jsonl")), fault === "cleanup-unlink");
      assert.ok(journalFd !== null);
      assert.throws(() => fs.fstatSync(journalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      if (fault === "cleanup-unlink") { fs.unlinkSync(path.join(fixtureRoot, "journal.v1.jsonl")); fs.fsyncSync(authority.rootFd); }
      removeExactOwnedRootTree(authority, Object.freeze({}));
      fs.rmSync(fixtureParent, { recursive: true, force: true });
    }

    const poisonedParent = constructionJournalFixtureRoot();
    const poisonedRoot = path.join(poisonedParent, "claim-poisoned-abort");
    fs.mkdirSync(poisonedRoot, { mode: 0o700 });
    const poisonedPath = path.join(poisonedRoot, "construction-checkpoint.v1.json");
    const poisonedAuthority = openExactOwnedRootAuthority({ root: poisonedRoot, anchor: poisonedParent, codePrefix: "CHECKPOINT_CLAIM_POISONED_ABORT_TEST" });
    const poisonedClaim = createCheckpointOwnershipJournal({ rootAuthority: poisonedAuthority, checkpointPath: poisonedPath, checkpointSha256 });
    fs.appendFileSync(path.join(poisonedRoot, "journal.v1.jsonl"), "poisoned-tail");
    poisonedClaim.abort();
    assert.equal(fs.existsSync(path.join(poisonedRoot, "journal.v1.jsonl")), false);
    removeExactOwnedRootTree(poisonedAuthority, Object.freeze({}));
    fs.rmSync(poisonedParent, { recursive: true, force: true });

    const abortFaultParent = constructionJournalFixtureRoot();
    const abortFaultRoot = path.join(abortFaultParent, "claim-abort-fault");
    fs.mkdirSync(abortFaultRoot, { mode: 0o700 });
    const abortFaultPath = path.join(abortFaultRoot, "construction-checkpoint.v1.json");
    const abortFaultJournalPath = path.join(abortFaultRoot, "journal.v1.jsonl");
    const abortFaultAuthority = openExactOwnedRootAuthority({ root: abortFaultRoot, anchor: abortFaultParent, codePrefix: "CHECKPOINT_CLAIM_ABORT_FAULT_TEST" });
    const originalAbortOpen = fs.openSync;
    let abortJournalFd: number | null = null;
    fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => { const descriptor = originalAbortOpen(target, flags, mode); if (String(target) === abortFaultJournalPath) abortJournalFd = descriptor; return descriptor; }) as typeof fs.openSync;
    let abortFaultClaim: ReturnType<typeof createCheckpointOwnershipJournal>;
    try { abortFaultClaim = createCheckpointOwnershipJournal({ rootAuthority: abortFaultAuthority, checkpointPath: abortFaultPath, checkpointSha256 }); }
    finally { fs.openSync = originalAbortOpen; }
    const originalAbortUnlink = fs.unlinkSync; let abortUnlinkInjected = false;
    fs.unlinkSync = ((target: fs.PathLike) => { if (!abortUnlinkInjected && String(target) === abortFaultJournalPath) { abortUnlinkInjected = true; throw Object.assign(new Error("injected claim abort unlink fault"), { code: "EIO" }); } return originalAbortUnlink(target); }) as typeof fs.unlinkSync;
    try { assert.throws(() => abortFaultClaim.abort(), /CONSTRUCTION_CHECKPOINT_CLAIM_ABORT_UNCERTAIN/u); }
    finally { fs.unlinkSync = originalAbortUnlink; }
    assert.ok(abortJournalFd !== null);
    assert.throws(() => fs.fstatSync(abortJournalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
    assert.equal(fs.existsSync(abortFaultJournalPath), true);
    closeExactOwnedRootAuthority(abortFaultAuthority); fs.rmSync(abortFaultParent, { recursive: true, force: true });

    const commitParent = constructionJournalFixtureRoot();
    const commitRoot = path.join(commitParent, "claim-commit-fsync");
    fs.mkdirSync(commitRoot, { mode: 0o700 });
    const commitPath = path.join(commitRoot, "construction-checkpoint.v1.json");
    const commitAuthority = openExactOwnedRootAuthority({ root: commitRoot, anchor: commitParent, codePrefix: "CHECKPOINT_CLAIM_COMMIT_FAULT_TEST" });
    const commitClaim = createCheckpointOwnershipJournal({ rootAuthority: commitAuthority, checkpointPath: commitPath, checkpointSha256 });
    const publication = atomicWritePrivateFile(commitPath, bytes, 0o600, { anchor: commitParent, onTemporaryDurable: commitClaim.onTemporaryDurable, onLinkDurable: commitClaim.onLinkDurable, onPublishedDurable: commitClaim.onPublishedDurable });
    const originalFsync = fs.fsyncSync;
    fs.fsyncSync = ((descriptor: number) => { if (descriptor === commitAuthority.rootFd) throw Object.assign(new Error("injected claim commit root fsync"), { code: "EIO" }); return originalFsync(descriptor); }) as typeof fs.fsyncSync;
    try { assert.throws(() => commitClaim.commit()); }
    finally { fs.fsyncSync = originalFsync; }
    assert.equal(fs.existsSync(path.join(commitRoot, "journal.v1.jsonl")), false);
    assert.throws(() => finalizeFailedCheckpointWriterRoot({ rootAuthority: commitAuthority, checkpointPath: commitPath, publication, ownershipJournal: commitClaim }), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DURABILITY_UNCERTAIN/u);
    assert.equal(fs.readFileSync(commitPath).equals(bytes), true);
    fs.rmSync(commitParent, { recursive: true, force: true });

    for (const journalBytes of [Buffer.alloc(0), Buffer.from("{torn", "utf8")]) {
      const fixtureParent = constructionJournalFixtureRoot(); const fixtureRoot = path.join(fixtureParent, "claim-empty-or-torn");
      fs.mkdirSync(fixtureRoot, { mode: 0o700 });
      const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
      fs.writeFileSync(checkpointPath, bytes, { flag: "wx", mode: 0o600 });
      const journalPath = path.join(fixtureRoot, "journal.v1.jsonl");
      fs.writeFileSync(journalPath, journalBytes, { flag: "wx", mode: 0o600 });
      const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_EMPTY_TORN_TEST" });
      assert.throws(() => readConstructionJournalForCleanup({ constructionRoot: fixtureRoot, journalPath, checkpointPath, rootAuthority: authority }), /CONSTRUCTION_CHECKPOINT_RESIDUE_UNCLAIMED/u);
      assert.equal(fs.readFileSync(checkpointPath).equals(bytes), true);
      assert.equal(fs.readFileSync(journalPath).equals(journalBytes), true, "zero-valid-prefix torn claim must not be truncated while a checkpoint residue exists");
      journalBytes.fill(0); fs.rmSync(fixtureParent, { recursive: true, force: true });
    }
  } finally { bytes.fill(0); }
});

test("checkpoint claim commit authenticates full journal state and holds the final descriptor across durability", () => {
  const bytes = Buffer.from("strict-checkpoint-commit\n", "utf8");
  const checkpointSha256 = hashFrame("strict-checkpoint-commit\n");
  const buildPublished = (name: string) => {
    const fixtureParent = constructionJournalFixtureRoot();
    const fixtureRoot = path.join(fixtureParent, name);
    fs.mkdirSync(fixtureRoot, { mode: 0o700 });
    const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
    const journalPath = path.join(fixtureRoot, "journal.v1.jsonl");
    const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_STRICT_COMMIT_TEST" });
    const originalOpen = fs.openSync;
    let journalFd: number | null = null;
    fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
      const descriptor = originalOpen(target, flags, mode);
      if (String(target) === journalPath) journalFd = descriptor;
      return descriptor;
    }) as typeof fs.openSync;
    let claim: ReturnType<typeof createCheckpointOwnershipJournal>;
    try { claim = createCheckpointOwnershipJournal({ rootAuthority: authority, checkpointPath, checkpointSha256 }); }
    finally { fs.openSync = originalOpen; }
    const publication = atomicWritePrivateFile(checkpointPath, bytes, 0o600, { anchor: fixtureParent, onTemporaryDurable: claim.onTemporaryDurable, onLinkDurable: claim.onLinkDurable, onPublishedDurable: claim.onPublishedDurable });
    assert.ok(journalFd !== null);
    return { fixtureParent, fixtureRoot, checkpointPath, journalPath, authority, journalFd, claim, publication };
  };
  try {
    {
      const fixture = buildPublished("claim-commit-content-drift");
      const journalBytes = fs.readFileSync(fixture.journalPath);
      journalBytes[0] = journalBytes[0]! ^ 1;
      fs.writeFileSync(fixture.journalPath, journalBytes, { flag: "r+" });
      journalBytes.fill(0);
      const originalOpen = fs.openSync;
      let finalFd: number | null = null;
      fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
        const descriptor = originalOpen(target, flags, mode);
        if (String(target) === fixture.checkpointPath && finalFd === null) finalFd = descriptor;
        return descriptor;
      }) as typeof fs.openSync;
      try { assert.throws(() => fixture.claim.commit(), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DRIFT/u); }
      finally { fs.openSync = originalOpen; }
      assert.ok(finalFd !== null);
      assert.throws(() => fs.fstatSync(fixture.journalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.throws(() => fs.fstatSync(finalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.equal(fs.existsSync(fixture.journalPath), true);
      assert.equal(fs.readFileSync(fixture.checkpointPath).equals(bytes), true);
      assert.throws(() => finalizeFailedCheckpointWriterRoot({ rootAuthority: fixture.authority, checkpointPath: fixture.checkpointPath, publication: fixture.publication, ownershipJournal: fixture.claim }), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DURABILITY_UNCERTAIN/u);
      fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildPublished("claim-commit-journal-link");
      const foreignAlias = path.join(fixture.fixtureParent, "journal-external-alias");
      fs.linkSync(fixture.journalPath, foreignAlias);
      assert.throws(() => fixture.claim.commit(), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DRIFT/u);
      assert.equal(fs.existsSync(foreignAlias), true);
      assert.equal(fs.existsSync(fixture.journalPath), true);
      assert.throws(() => fs.fstatSync(fixture.journalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.throws(() => finalizeFailedCheckpointWriterRoot({ rootAuthority: fixture.authority, checkpointPath: fixture.checkpointPath, publication: fixture.publication, ownershipJournal: fixture.claim }), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DURABILITY_UNCERTAIN/u);
      fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildPublished("claim-commit-post-fsync-drift");
      const drift = Buffer.from(bytes); drift[0] = drift[0]! ^ 1;
      const originalOpen = fs.openSync; const originalFsync = fs.fsyncSync;
      let finalFd: number | null = null; let journalHeldAtRootFsync = false; let finalHeldAtRootFsync = false; let injected = false;
      fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
        const descriptor = originalOpen(target, flags, mode);
        if (String(target) === fixture.checkpointPath && finalFd === null) finalFd = descriptor;
        return descriptor;
      }) as typeof fs.openSync;
      fs.fsyncSync = ((descriptor: number) => {
        const result = originalFsync(descriptor);
        if (descriptor === fixture.authority.rootFd && !injected) {
          injected = true;
          assert.doesNotThrow(() => fs.fstatSync(fixture.journalFd!)); journalHeldAtRootFsync = true;
          assert.doesNotThrow(() => fs.fstatSync(finalFd!)); finalHeldAtRootFsync = true;
          fs.writeFileSync(fixture.checkpointPath, drift, { flag: "r+" });
        }
        return result;
      }) as typeof fs.fsyncSync;
      try { assert.throws(() => fixture.claim.commit(), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_FINAL_POST_FSYNC_DRIFT/u); }
      finally { fs.openSync = originalOpen; fs.fsyncSync = originalFsync; }
      assert.equal(journalHeldAtRootFsync, true); assert.equal(finalHeldAtRootFsync, true);
      assert.equal(fs.existsSync(fixture.journalPath), false);
      assert.ok(finalFd !== null);
      assert.throws(() => fs.fstatSync(fixture.journalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.throws(() => fs.fstatSync(finalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.throws(() => finalizeFailedCheckpointWriterRoot({ rootAuthority: fixture.authority, checkpointPath: fixture.checkpointPath, publication: fixture.publication, ownershipJournal: fixture.claim }), /CONSTRUCTION_CHECKPOINT_CLAIM_COMMIT_DURABILITY_UNCERTAIN/u);
      assert.equal(fs.readFileSync(fixture.checkpointPath).equals(drift), true);
      drift.fill(0); fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }
  } finally { bytes.fill(0); }
});

test("checkpoint claim recovery authenticates and holds the journal before alias cleanup", () => {
  const bytes = Buffer.from("strict-checkpoint-recovery\n", "utf8");
  const checkpointSha256 = hashFrame("strict-checkpoint-recovery\n");
  const asIdentity = (stat: fs.Stats) => Object.freeze({ size: stat.size, mode: stat.mode & 0o7777, uid: stat.uid, gid: stat.gid, device: String(stat.dev), inode: String(stat.ino), nlink: stat.nlink, mtimeMilliseconds: Math.trunc(stat.mtimeMs) });
  const buildStageCrash = (name: string, withStage = true) => {
    const fixtureParent = constructionJournalFixtureRoot(); const fixtureRoot = path.join(fixtureParent, name);
    fs.mkdirSync(fixtureRoot, { mode: 0o700 });
    const checkpointPath = path.join(fixtureRoot, "construction-checkpoint.v1.json");
    const temporaryPath = path.join(fixtureRoot, `.construction-checkpoint.v1.json.${checkpointFixture().constructionRunId}.tmp`);
    const journalPath = path.join(fixtureRoot, "journal.v1.jsonl");
    const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: fixtureParent, codePrefix: "CHECKPOINT_STRICT_RECOVERY_TEST" });
    const claim = createCheckpointOwnershipJournal({ rootAuthority: authority, checkpointPath, checkpointSha256 });
    if (withStage) {
      fs.writeFileSync(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
      claim.onTemporaryDurable(Object.freeze({ sha256: checkpointSha256, identity: asIdentity(fs.lstatSync(temporaryPath)) }));
    }
    claim.closeForCrashTest();
    return { fixtureParent, fixtureRoot, checkpointPath, temporaryPath, journalPath, authority };
  };
  try {
    {
      const fixture = buildStageCrash("claim-recovery-held-journal");
      const authenticated = readConstructionJournalForCleanup({ constructionRoot: fixture.fixtureRoot, journalPath: fixture.journalPath, checkpointPath: fixture.checkpointPath, rootAuthority: fixture.authority });
      const originalOpen = fs.openSync; const originalUnlink = fs.unlinkSync; const originalFsync = fs.fsyncSync;
      let journalFd: number | null = null; let candidateFd: number | null = null; let journalHeldAtAliasUnlink = false; let descriptorsHeldAtRootFsync = false;
      fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => {
        const descriptor = originalOpen(target, flags, mode);
        if (String(target) === fixture.journalPath) journalFd = descriptor;
        if (String(target) === fixture.temporaryPath) candidateFd = descriptor;
        return descriptor;
      }) as typeof fs.openSync;
      fs.unlinkSync = ((target: fs.PathLike) => {
        if (String(target) === fixture.temporaryPath) { assert.doesNotThrow(() => fs.fstatSync(journalFd!)); journalHeldAtAliasUnlink = true; }
        return originalUnlink(target);
      }) as typeof fs.unlinkSync;
      fs.fsyncSync = ((descriptor: number) => {
        if (descriptor === fixture.authority.rootFd) { assert.doesNotThrow(() => fs.fstatSync(journalFd!)); assert.doesNotThrow(() => fs.fstatSync(candidateFd!)); descriptorsHeldAtRootFsync = true; }
        return originalFsync(descriptor);
      }) as typeof fs.fsyncSync;
      try { assert.deepEqual(reconcileCheckpointOwnershipJournalForCleanup(authenticated, fixture.checkpointPath), { rootAbsent: true, claimRecovered: true }); }
      finally { fs.openSync = originalOpen; fs.unlinkSync = originalUnlink; fs.fsyncSync = originalFsync; }
      assert.equal(journalHeldAtAliasUnlink, true); assert.equal(descriptorsHeldAtRootFsync, true);
      assert.ok(journalFd !== null); assert.ok(candidateFd !== null);
      assert.throws(() => fs.fstatSync(journalFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      assert.throws(() => fs.fstatSync(candidateFd!), (error: unknown) => error instanceof Error && "code" in error && error.code === "EBADF");
      fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildStageCrash("claim-recovery-reader-close-gate");
      const originalOpen = fs.openSync; const originalClose = fs.closeSync;
      let readerFd: number | null = null; let closeInjected = false;
      fs.openSync = ((target: fs.PathLike, flags: number, mode?: fs.Mode) => { const descriptor = originalOpen(target, flags, mode); if (String(target) === fixture.journalPath) readerFd = descriptor; return descriptor; }) as typeof fs.openSync;
      fs.closeSync = ((descriptor: number) => { if (!closeInjected && descriptor === readerFd) { closeInjected = true; originalClose(descriptor); throw Object.assign(new Error("injected claim reader close fault"), { code: "EIO" }); } return originalClose(descriptor); }) as typeof fs.closeSync;
      let authenticated: ReturnType<typeof readConstructionJournalForCleanup>;
      try { authenticated = readConstructionJournalForCleanup({ constructionRoot: fixture.fixtureRoot, journalPath: fixture.journalPath, checkpointPath: fixture.checkpointPath, rootAuthority: fixture.authority }); }
      finally { fs.openSync = originalOpen; fs.closeSync = originalClose; }
      assert.equal(authenticated.journalReadCloseFaultCode, "CONSTRUCTION_JOURNAL_READ_CLOSE_FAILED");
      assert.throws(
        () => reconcileCheckpointOwnershipJournalForCleanup(authenticated, fixture.checkpointPath),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_JOURNAL_READ_CLOSE_FAILED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      assert.equal(fs.readFileSync(fixture.temporaryPath).equals(bytes), true); assert.equal(fs.existsSync(fixture.journalPath), true);
      closeExactOwnedRootAuthority(fixture.authority); fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildStageCrash("claim-recovery-journal-replacement");
      const authenticated = readConstructionJournalForCleanup({ constructionRoot: fixture.fixtureRoot, journalPath: fixture.journalPath, checkpointPath: fixture.checkpointPath, rootAuthority: fixture.authority });
      const journalBytes = fs.readFileSync(fixture.journalPath);
      const originalJournalFd = fs.openSync(fixture.journalPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      try {
        const originalJournalIdentity = asIdentity(fs.fstatSync(originalJournalFd));
        fs.unlinkSync(fixture.journalPath); fs.writeFileSync(fixture.journalPath, journalBytes, { flag: "wx", mode: 0o600 });
        assert.notDeepEqual(asIdentity(fs.lstatSync(fixture.journalPath)), originalJournalIdentity);
      } finally { fs.closeSync(originalJournalFd); journalBytes.fill(0); }
      assert.throws(() => reconcileCheckpointOwnershipJournalForCleanup(authenticated, fixture.checkpointPath), /CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_DRIFT/u);
      assert.equal(fs.readFileSync(fixture.temporaryPath).equals(bytes), true);
      closeExactOwnedRootAuthority(fixture.authority); fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildStageCrash("claim-recovery-journal-content-drift");
      const authenticated = readConstructionJournalForCleanup({ constructionRoot: fixture.fixtureRoot, journalPath: fixture.journalPath, checkpointPath: fixture.checkpointPath, rootAuthority: fixture.authority });
      const before = fs.lstatSync(fixture.journalPath); const journalBytes = fs.readFileSync(fixture.journalPath);
      journalBytes[0] = journalBytes[0]! ^ 1;
      fs.writeFileSync(fixture.journalPath, journalBytes, { flag: "r+" }); fs.utimesSync(fixture.journalPath, before.atime, before.mtime); journalBytes.fill(0);
      assert.throws(() => reconcileCheckpointOwnershipJournalForCleanup(authenticated, fixture.checkpointPath), /CONSTRUCTION_CHECKPOINT_CLAIM_JOURNAL_DRIFT/u);
      assert.equal(fs.readFileSync(fixture.temporaryPath).equals(bytes), true);
      closeExactOwnedRootAuthority(fixture.authority); fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }

    {
      const fixture = buildStageCrash("claim-recovery-intent-only", false);
      const authenticated = readConstructionJournalForCleanup({ constructionRoot: fixture.fixtureRoot, journalPath: fixture.journalPath, checkpointPath: fixture.checkpointPath, rootAuthority: fixture.authority });
      assert.throws(() => reconcileCheckpointOwnershipJournalForCleanup(authenticated, fixture.checkpointPath), /CONSTRUCTION_CHECKPOINT_CLAIM_INTENT_ONLY_UNAUTHENTICATED/u);
      assert.equal(fs.existsSync(fixture.journalPath), true);
      closeExactOwnedRootAuthority(fixture.authority); fs.rmSync(fixture.fixtureParent, { recursive: true, force: true });
    }
  } finally { bytes.fill(0); }
});

test("retry journal create and append faults require torn-tail repair plus a newly authenticated writer", async () => {
  const manifestSha256 = hashFrame("retry-journal-poison-manifest-v1\n");
  const hostBindingId = "b".repeat(32);
  const runId = "c".repeat(32);
  const parsed = Object.freeze({ manifestSha256, hostBindingId });
  const capsuleSha256 = hashFrame("retry-journal-poison-capsule-v1\n");
  const runtimeSha256 = hashFrame("retry-journal-poison-runtime-v1\n");
  const slotShapeSha256 = hashFrame("r4-gate-b-blocked-start-slot-root.v1\n");
  const commandShapeSha256 = hashFrame("retry-journal-poison-process-v1\n");
  const postgresRunRootShapeSha256 = hashFrame(`postgres-run-root:${runId}\n`);
  const processGroupId = 53_210;
  const processIntent = { lane: "postgres", event: "intent:container-create", commandShapeSha256, ownedResources: ["postgres-process-group"] };
  const started = { lane: "postgres", event: "started:container-create", commandShapeSha256, processGroupId, ownedResources: ["postgres-process-group"] };
  const terminal = { lane: "postgres", event: "terminal:container-create", commandShapeSha256, processGroupId, ownedResources: ["postgres-process-group"], terminalCode: "NO_TERMINAL", cleanupState: "quarantined" };
  const recovery = { lane: "postgres", event: "cleanup-observed-absent:container-create", commandShapeSha256, processGroupId, ownedResources: ["postgres-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" };
  const appendPrologue = async (journal: ReturnType<typeof createRetryJournal>) => {
    await journal.append({ lane: "runner", event: "retry-authority-revalidated", commandShapeSha256: capsuleSha256, ownedResources: ["retry-run-root"] });
    await journal.append({ lane: "runner", event: "runtime-snapshot-intent", commandShapeSha256: runtimeSha256, ownedResources: ["runtime-snapshot"] });
    await journal.append({ lane: "runner", event: "runtime-snapshot-observed", commandShapeSha256: runtimeSha256, ownedResources: ["runtime-snapshot"], terminalCode: "71" });
    await journal.append({ lane: "runner", event: "intent:blocked-start-slot-root", commandShapeSha256: slotShapeSha256, ownedResources: ["blocked-start-slot-root"] });
    await journal.append({ lane: "runner", event: "observed:blocked-start-slot-root", commandShapeSha256: slotShapeSha256, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED" });
    await journal.append({ lane: "postgres", event: "marker:run-root-target-absent", commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"] });
    await journal.append({ lane: "postgres", event: "marker:run-root-created", commandShapeSha256: postgresRunRootShapeSha256, ownedResources: ["postgres-run-root"], terminalCode: "CREATED" });
  };
  const readFixture = (fixtureRoot: string) => trackRootAuthority(authenticatedRetryJournal(parsed, runId, { root: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl") }));
  const removeFixture = (fixture: Readonly<{ parent: string; root: string }>, label: string) => {
    fs.rmSync(fixture.parent, { recursive: true, force: true });
    assert.equal(fs.existsSync(fixture.root), false, `exact ${label} retry root must be absent`);
    assert.equal(fs.existsSync(fixture.parent), false, `exact ${label} retry fixture parent must be absent`);
  };

  for (const [failurePoint, failureCall] of [["file-fsync", 2], ["directory-fsync", 3]] as const) {
    const fixture = retryJournalFixtureRoot();
    const originalFsync = fs.fsyncSync;
    let calls = 0;
    fs.fsyncSync = ((descriptor: number) => {
      calls += 1;
      if (calls === failureCall) throw Object.assign(new Error(`injected retry create ${failurePoint}`), { code: "EIO" });
      return originalFsync(descriptor);
    }) as typeof fs.fsyncSync;
    try { assert.throws(() => createRetryJournal(fixture.root, manifestSha256, hostBindingId, runId), /RETRY_JOURNAL_CREATE_FAILED/u); }
    finally { fs.fsyncSync = originalFsync; }
    assert.equal(fs.existsSync(fixture.root), false);
    assert.deepEqual(fs.readdirSync(fixture.parent), []);
    removeFixture(fixture, `create-${failurePoint}`);
  }

  for (const partialEvent of ["started", "terminal"] as const) {
    const fixture = retryJournalFixtureRoot();
    const journal = createRetryJournal(fixture.root, manifestSha256, hostBindingId, runId);
    const originalWrite = fs.writeSync;
    let journalClosed = false;
    const capturedBuffers: Buffer[] = [];
    try {
      await appendPrologue(journal);
      await journal.append(processIntent);
      if (partialEvent === "terminal") await journal.append(started);
      let writes = 0;
      fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
        writes += 1;
        assert.ok(Buffer.isBuffer(buffer));
        capturedBuffers.push(buffer);
        if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
        throw Object.assign(new Error(`injected retry partial ${partialEvent} fault`), { code: "EIO" });
      }) as typeof fs.writeSync;
      try { await assert.rejects(journal.append(partialEvent === "started" ? started : terminal), new RegExp(`injected retry partial ${partialEvent} fault`, "u")); }
      finally { fs.writeSync = originalWrite; }
      const faultBuffer = capturedBuffers.at(-1);
      assert.ok(faultBuffer !== undefined);
      assert.ok(faultBuffer.every((byte) => byte === 0), "failed Retry append serialization bytes must be zeroized");
      const journalPath = path.join(fixture.root, "journal.v1.jsonl");
      const tornBytes = fs.readFileSync(journalPath);
      try {
        await assert.rejects(
          journal.append(recovery),
          (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
        );
        assert.deepEqual(fs.readFileSync(journalPath), tornBytes);
        assert.throws(() => journal.aggregateSha256(), /RETRY_JOURNAL_APPEND_POISONED/u);
      } finally { tornBytes.fill(0); }
      journal.close();
      journalClosed = true;
      journal.zeroize();

      const authenticated = readFixture(fixture.root);
      assert.equal(authenticated.records.length, partialEvent === "started" ? 8 : 9);
      assert.equal(authenticated.records.at(-1)?.event, partialEvent === "started" ? "intent:container-create" : "started:container-create");
      const beforeRecovery = validateRetryJournalForCleanup(authenticated.records, runtimeSha256);
      assert.deepEqual(beforeRecovery.unresolvedProcessGroups, partialEvent === "started" ? [] : [processGroupId]);
      assert.equal(beforeRecovery.unstartedSupervisorStarts.length, partialEvent === "started" ? 1 : 0);
      const recoveryJournal = openAuthenticatedRetryJournalForAppend(authenticated, parsed, runId);
      try { await recoveryJournal.append(recovery); }
      finally { recoveryJournal.close(); }
      const recovered = readFixture(fixture.root);
      assert.equal(recovered.records.at(-1)?.event, "cleanup-observed-absent:container-create");
      assert.deepEqual(validateRetryJournalForCleanup(recovered.records, runtimeSha256).unresolvedProcessGroups, []);
      assert.deepEqual(validateRetryJournalForCleanup(recovered.records, runtimeSha256).unstartedSupervisorStarts, []);
      assert.deepEqual(fs.readdirSync(fixture.root), ["journal.v1.jsonl"]);
    } finally {
      fs.writeSync = originalWrite;
      if (!journalClosed) try { journal.close(); } catch { /* fixture removal remains authoritative */ }
      journal.zeroize();
      removeFixture(fixture, `partial-${partialEvent}`);
    }
  }

  const durableFixture = retryJournalFixtureRoot();
  const durableJournal = createRetryJournal(durableFixture.root, manifestSha256, hostBindingId, runId);
  const originalWrite = fs.writeSync;
  const originalFsync = fs.fsyncSync;
  let durableJournalClosed = false;
  const capturedDurableBuffers: Buffer[] = [];
  try {
    await appendPrologue(durableJournal);
    await durableJournal.append(processIntent);
    await durableJournal.append(started);
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      assert.ok(Buffer.isBuffer(buffer));
      capturedDurableBuffers.push(buffer);
      return originalWrite(descriptor, buffer, offset, length, position ?? null);
    }) as typeof fs.writeSync;
    fs.fsyncSync = ((descriptor: number) => {
      originalFsync(descriptor);
      throw Object.assign(new Error("injected Retry post-durable fsync fault"), { code: "EIO" });
    }) as typeof fs.fsyncSync;
    try { await assert.rejects(durableJournal.append(terminal), /injected Retry post-durable fsync fault/u); }
    finally { fs.writeSync = originalWrite; fs.fsyncSync = originalFsync; }
    const durableBuffer = capturedDurableBuffers.at(-1);
    assert.ok(durableBuffer !== undefined);
    assert.ok(durableBuffer.every((byte) => byte === 0), "fsync-failed Retry serialization bytes must be zeroized");
    const journalPath = path.join(durableFixture.root, "journal.v1.jsonl");
    const durableBytes = fs.readFileSync(journalPath);
    try {
      await assert.rejects(
        durableJournal.append(recovery),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      assert.deepEqual(fs.readFileSync(journalPath), durableBytes);
    } finally { durableBytes.fill(0); }
    durableJournal.close();
    durableJournalClosed = true;
    durableJournal.zeroize();
    const authenticated = readFixture(durableFixture.root);
    assert.equal(authenticated.records.length, 10);
    assert.equal(authenticated.records.at(-1)?.event, "terminal:container-create");
    assert.deepEqual(validateRetryJournalForCleanup(authenticated.records, runtimeSha256).unresolvedProcessGroups, [processGroupId]);
    const recoveryJournal = openAuthenticatedRetryJournalForAppend(authenticated, parsed, runId);
    try { await recoveryJournal.append(recovery); }
    finally { recoveryJournal.close(); }
    const recovered = readFixture(durableFixture.root);
    assert.equal(recovered.records.length, 11);
    assert.deepEqual(validateRetryJournalForCleanup(recovered.records, runtimeSha256).unresolvedProcessGroups, []);
    assert.deepEqual(fs.readdirSync(durableFixture.root), ["journal.v1.jsonl"]);
  } finally {
    fs.writeSync = originalWrite;
    fs.fsyncSync = originalFsync;
    if (!durableJournalClosed) try { durableJournal.close(); } catch { /* fixture removal remains authoritative */ }
    durableJournal.zeroize();
    removeFixture(durableFixture, "durable-fsync");
  }

  const recoveryFixture = retryJournalFixtureRoot();
  let initialJournal: ReturnType<typeof createRetryJournal> | null = createRetryJournal(recoveryFixture.root, manifestSha256, hostBindingId, runId);
  let recoveryJournal: ReturnType<typeof openAuthenticatedRetryJournalForAppend> | null = null;
  const recoveryOriginalWrite = fs.writeSync;
  try {
    await appendPrologue(initialJournal);
    await initialJournal.append(processIntent);
    await initialJournal.append(started);
    await initialJournal.append(terminal);
    initialJournal.close();
    initialJournal.zeroize();
    initialJournal = null;
    recoveryJournal = openAuthenticatedRetryJournalForAppend(readFixture(recoveryFixture.root), parsed, runId);
    let writes = 0;
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      writes += 1;
      if (writes === 1) return recoveryOriginalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
      throw Object.assign(new Error("injected authenticated Retry recovery append fault"), { code: "EIO" });
    }) as typeof fs.writeSync;
    try { await assert.rejects(recoveryJournal.append(recovery), /injected authenticated Retry recovery append fault/u); }
    finally { fs.writeSync = recoveryOriginalWrite; }
    await assert.rejects(
      recoveryJournal.append(recovery),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_CLEANUP_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
    recoveryJournal.close();
    recoveryJournal = null;
    const repaired = readFixture(recoveryFixture.root);
    assert.equal(repaired.records.length, 10);
    const authenticatedRecovery = openAuthenticatedRetryJournalForAppend(repaired, parsed, runId);
    try { await authenticatedRecovery.append(recovery); }
    finally { authenticatedRecovery.close(); }
    const recovered = readFixture(recoveryFixture.root);
    assert.equal(recovered.records.length, 11);
    assert.deepEqual(validateRetryJournalForCleanup(recovered.records, runtimeSha256).unresolvedProcessGroups, []);
    assert.deepEqual(fs.readdirSync(recoveryFixture.root), ["journal.v1.jsonl"]);
  } finally {
    fs.writeSync = recoveryOriginalWrite;
    try { recoveryJournal?.close(); } catch { /* fixture removal remains authoritative */ }
    try { initialJournal?.close(); } catch { /* fixture removal remains authoritative */ }
    initialJournal?.zeroize();
    removeFixture(recoveryFixture, "authenticated-recovery-writer");
  }
});

test("first Retry authority torn tail permits only exact journal-only no-effect cleanup", async () => {
  const manifestSha256 = hashFrame("retry-empty-prefix-manifest-v1\n");
  const hostBindingId = "d".repeat(32);
  const runId = "e".repeat(32);
  const parsed = Object.freeze({ manifestSha256, hostBindingId });
  const readFixture = (fixtureRoot: string) => trackRootAuthority(authenticatedRetryJournal(parsed, runId, { root: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl") }));
  const fixture = retryJournalFixtureRoot();
  const journal = createRetryJournal(fixture.root, manifestSha256, hostBindingId, runId);
  const originalWrite = fs.writeSync;
  let journalClosed = false;
  const capturedBuffers: Buffer[] = [];
  try {
    let writes = 0;
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      writes += 1;
      assert.ok(Buffer.isBuffer(buffer));
      capturedBuffers.push(buffer);
      if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
      throw Object.assign(new Error("injected first Retry authority partial append"), { code: "EIO" });
    }) as typeof fs.writeSync;
    try {
      await assert.rejects(
        journal.append({ lane: "runner", event: "retry-authority-revalidated", commandShapeSha256: hashFrame("retry-empty-prefix-capsule-v1\n"), ownedResources: ["retry-run-root"] }),
        /injected first Retry authority partial append/u,
      );
    } finally { fs.writeSync = originalWrite; }
    const faultBuffer = capturedBuffers.at(-1);
    assert.ok(faultBuffer !== undefined);
    assert.ok(faultBuffer.every((byte) => byte === 0), "first Retry authority fault bytes must be zeroized");
    journal.close();
    journalClosed = true;
    journal.zeroize();
    const authenticated = readFixture(fixture.root);
    assert.deepEqual(authenticated.records, []);
    assert.equal(fs.lstatSync(path.join(fixture.root, "journal.v1.jsonl")).size, 0);
    assert.deepEqual(fs.readdirSync(fixture.root), ["journal.v1.jsonl"]);
    assert.deepEqual(removeEmptyAuthenticatedRetryJournalRoot(authenticated), {
      status: "GREEN",
      retryRunRootAbsent: true,
      retryJournalAbsent: true,
      effectsAttempted: 0,
    });
    assert.equal(fs.existsSync(fixture.root), false);
    assert.deepEqual(fs.readdirSync(fixture.parent), []);
  } finally {
    fs.writeSync = originalWrite;
    if (!journalClosed) try { journal.close(); } catch { /* fixture removal remains authoritative */ }
    journal.zeroize();
    fs.rmSync(fixture.parent, { recursive: true, force: true });
    assert.equal(fs.existsSync(fixture.root), false, "exact empty-prefix Retry root must be absent");
    assert.equal(fs.existsSync(fixture.parent), false, "exact empty-prefix fixture parent must be absent");
  }

  for (const siblingKind of ["regular", "symlink"] as const) {
    const collision = retryJournalFixtureRoot();
    const cleanJournal = createRetryJournal(collision.root, manifestSha256, hostBindingId, runId);
    cleanJournal.close();
    cleanJournal.zeroize();
    const siblingPath = path.join(collision.root, `unknown-${siblingKind}`);
    try {
      if (siblingKind === "regular") fs.writeFileSync(siblingPath, "owner-preserve\n", { mode: 0o600, flag: "wx" });
      else fs.symlinkSync(path.join(collision.root, "missing-owner-target"), siblingPath);
      const siblingBefore = fs.lstatSync(siblingPath);
      const authenticated = readFixture(collision.root);
      assert.deepEqual(authenticated.records, []);
      assert.throws(
        () => removeEmptyAuthenticatedRetryJournalRoot(authenticated),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_EMPTY_JOURNAL_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      const siblingAfter = fs.lstatSync(siblingPath);
      assert.equal(siblingAfter.dev, siblingBefore.dev);
      assert.equal(siblingAfter.ino, siblingBefore.ino);
      assert.equal(siblingAfter.isSymbolicLink(), siblingKind === "symlink");
      if (siblingKind === "regular") assert.equal(fs.readFileSync(siblingPath, "utf8"), "owner-preserve\n");
      else assert.equal(fs.readlinkSync(siblingPath), path.join(collision.root, "missing-owner-target"));
      assert.equal(fs.lstatSync(path.join(collision.root, "journal.v1.jsonl")).size, 0);
      assert.deepEqual(fs.readdirSync(collision.root).sort(), ["journal.v1.jsonl", `unknown-${siblingKind}`].sort());
    } finally {
      fs.rmSync(collision.parent, { recursive: true, force: true });
      assert.equal(fs.existsSync(collision.root), false, `exact unknown-${siblingKind} Retry root must be absent after test teardown`);
      assert.equal(fs.existsSync(collision.parent), false, `exact unknown-${siblingKind} fixture parent must be absent after test teardown`);
    }
  }
});

test("empty Retry journal cleanup faults remain idempotently recoverable to exact root absence", () => {
  const manifestSha256 = hashFrame("retry-empty-cleanup-fault-manifest-v1\n");
  const hostBindingId = "f".repeat(32);
  const runId = "a".repeat(32);
  const parsed = Object.freeze({ manifestSha256, hostBindingId });
  const readFixture = (fixtureRoot: string) => trackRootAuthority(authenticatedRetryJournal(parsed, runId, { root: fixtureRoot, journalPath: path.join(fixtureRoot, "journal.v1.jsonl") }));
  const cases = [
    Object.freeze({ name: "root-fsync", expectedCode: "RETRY_EMPTY_JOURNAL_ROOT_FSYNC_FAILED", closeFailureCall: 0 }),
    Object.freeze({ name: "journal-close", expectedCode: "RETRY_EMPTY_JOURNAL_CLOSE_FAILED", closeFailureCall: 1 }),
    Object.freeze({ name: "root-close", expectedCode: "RETRY_EMPTY_JOURNAL_ROOT_CLOSE_FAILED", closeFailureCall: 2 }),
    Object.freeze({ name: "rmdir", expectedCode: "RETRY_EMPTY_JOURNAL_RMDIR_FAILED", closeFailureCall: 0 }),
  ];
  for (const faultCase of cases) {
    const fixture = retryJournalFixtureRoot();
    const journal = createRetryJournal(fixture.root, manifestSha256, hostBindingId, runId);
    journal.close();
    journal.zeroize();
    const authenticated = readFixture(fixture.root);
    assert.deepEqual(authenticated.records, []);
    const originalFsync = fs.fsyncSync;
    const originalClose = fs.closeSync;
    const originalRmdir = fs.rmdirSync;
    let injected = false;
    let closeCalls = 0;
    try {
      if (faultCase.name === "root-fsync") {
        fs.fsyncSync = ((descriptor: number) => {
          if (!injected) { injected = true; throw Object.assign(new Error("injected empty Retry root fsync fault"), { code: "EIO" }); }
          return originalFsync(descriptor);
        }) as typeof fs.fsyncSync;
      }
      if (faultCase.closeFailureCall !== 0) {
        fs.closeSync = ((descriptor: number) => {
          closeCalls += 1;
          if (!injected && closeCalls === faultCase.closeFailureCall) { injected = true; throw Object.assign(new Error(`injected empty Retry ${faultCase.name} fault`), { code: "EIO" }); }
          return originalClose(descriptor);
        }) as typeof fs.closeSync;
      }
      if (faultCase.name === "rmdir") {
        fs.rmdirSync = ((target: fs.PathLike) => {
          if (!injected) { injected = true; throw Object.assign(new Error("injected empty Retry rmdir fault"), { code: "EIO" }); }
          return originalRmdir(target);
        }) as typeof fs.rmdirSync;
      }
      assert.throws(
        () => removeEmptyAuthenticatedRetryJournalRoot(authenticated),
        (error: unknown) => error instanceof Error && "code" in error && error.code === faultCase.expectedCode && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      assert.equal(injected, true, `${faultCase.name} fault must be reached`);
    } finally {
      fs.fsyncSync = originalFsync;
      fs.closeSync = originalClose;
      fs.rmdirSync = originalRmdir;
    }
    const retryState = readFixture(fixture.root);
    if (!retryState.alreadyAbsent) {
      assert.equal(retryState.journalAlreadyRemoved, true);
      assert.deepEqual(retryState.records, []);
      assert.deepEqual(fs.readdirSync(fixture.root), []);
      assert.equal(removeEmptyAuthenticatedRetryJournalRoot(retryState).status, "GREEN");
    }
    assert.equal(fs.existsSync(fixture.root), false, `${faultCase.name} retry must reach exact root absence`);
    assert.deepEqual(fs.readdirSync(fixture.parent), []);
    fs.rmdirSync(fixture.parent);
    assert.equal(fs.existsSync(fixture.parent), false, `${faultCase.name} fixture parent must be absent`);
  }
});

test("journal reader close faults preserve read primaries and zeroize before close", async () => {
  const exerciseCloseFault = <T>(operation: () => T, expectedCode: string) => {
    const originalClose = fs.closeSync;
    const originalAllocUnsafe = Buffer.allocUnsafe;
    const capturedBuffers: Buffer[] = [];
    let closeInjected = false;
    Buffer.allocUnsafe = ((size: number) => { const bytes = originalAllocUnsafe(size); capturedBuffers.push(bytes); return bytes; }) as typeof Buffer.allocUnsafe;
    fs.closeSync = ((descriptor: number) => {
      if (!closeInjected) {
        closeInjected = true;
        originalClose(descriptor);
        throw Object.assign(new Error("injected journal reader close fault"), { code: "EIO" });
      }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try {
      assert.throws(
        operation,
        (error: unknown) => error instanceof Error && "code" in error && error.code === expectedCode && !String(error.message).includes("CLOSE_FAILED"),
      );
      assert.equal(closeInjected, true);
      assert.ok(capturedBuffers.length >= 1);
      assert.ok(capturedBuffers.every((bytes) => bytes.every((byte) => byte === 0)), "authenticated reader buffers must be zero before close-fault reporting");
    } finally {
      fs.closeSync = originalClose;
      Buffer.allocUnsafe = originalAllocUnsafe;
    }
  };

  const constructionRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(constructionRoot);
    await journal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: ["construction-run-root", "fake-process-groups"] });
    journal.close();
    journal.zeroize();
    const journalPath = path.join(constructionRoot, "journal.v1.jsonl");
    const corrupt = fs.readFileSync(journalPath);
    corrupt[0] = "!".charCodeAt(0);
    fs.writeFileSync(journalPath, corrupt);
    corrupt.fill(0);
    exerciseCloseFault(() => readConstructionJournalFixture(constructionRoot), "CONSTRUCTION_JOURNAL_CHAIN_INVALID");
  } finally {
    fs.rmSync(constructionRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(constructionRoot), false);
  }

  const manifestSha256 = hashFrame("retry-reader-primary-manifest-v1\n");
  const hostBindingId = "1".repeat(32);
  const runId = "2".repeat(32);
  const parsed = Object.freeze({ manifestSha256, hostBindingId });
  const retryFixture = retryJournalFixtureRoot();
  try {
    const journal = createRetryJournal(retryFixture.root, manifestSha256, hostBindingId, runId);
    await journal.append({ lane: "runner", event: "retry-authority-revalidated", commandShapeSha256: hashFrame("retry-reader-primary-capsule-v1\n"), ownedResources: ["retry-run-root"] });
    journal.close();
    journal.zeroize();
    const journalPath = path.join(retryFixture.root, "journal.v1.jsonl");
    const corrupt = fs.readFileSync(journalPath);
    corrupt[0] = "!".charCodeAt(0);
    fs.writeFileSync(journalPath, corrupt);
    corrupt.fill(0);
    exerciseCloseFault(
      () => authenticatedRetryJournal(parsed, runId, { root: retryFixture.root, journalPath }),
      "RETRY_JOURNAL_CHAIN_INVALID",
    );
  } finally {
    fs.rmSync(retryFixture.parent, { recursive: true, force: true });
    assert.equal(fs.existsSync(retryFixture.parent), false);
  }

  const missingFixture = retryJournalFixtureRoot();
  try {
    fs.mkdirSync(missingFixture.root, { mode: 0o700 });
    fs.writeFileSync(path.join(missingFixture.root, "unknown-owner-sibling"), "preserve\n", { mode: 0o600, flag: "wx" });
    const originalClose = fs.closeSync;
    let closeInjected = false;
    fs.closeSync = ((descriptor: number) => {
      if (!closeInjected) { closeInjected = true; originalClose(descriptor); throw Object.assign(new Error("injected missing-journal reader close fault"), { code: "EIO" }); }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try {
      assert.throws(
        () => authenticatedRetryJournal(parsed, runId, { root: missingFixture.root, journalPath: path.join(missingFixture.root, "journal.v1.jsonl") }),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "RETRY_JOURNAL_MISSING_WITH_RESOURCES",
      );
      assert.equal(closeInjected, true);
      assert.equal(fs.readFileSync(path.join(missingFixture.root, "unknown-owner-sibling"), "utf8"), "preserve\n");
    } finally { fs.closeSync = originalClose; }
  } finally {
    fs.rmSync(missingFixture.parent, { recursive: true, force: true });
    assert.equal(fs.existsSync(missingFixture.parent), false);
  }
});

test("authenticated reader close faults finish exact no-effect cleanup before controlled RED", async () => {
  await cleanupConstruction();
  const constructionJournal = createConstructionJournal();
  constructionJournal.close();
  constructionJournal.zeroize();
  const originalClose = fs.closeSync;
  let closeInjected = false;
  fs.closeSync = ((descriptor: number) => {
    if (!closeInjected) { closeInjected = true; originalClose(descriptor); throw Object.assign(new Error("injected Construction reader close fault"), { code: "EIO" }); }
    return originalClose(descriptor);
  }) as typeof fs.closeSync;
  try {
    await assert.rejects(
      cleanupConstruction(),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_JOURNAL_READ_CLOSE_FAILED" && "verdict" in error && error.verdict === "RED",
    );
    assert.equal(closeInjected, true);
  } finally { fs.closeSync = originalClose; }
  assert.deepEqual(await cleanupConstruction(), { status: "GREEN", constructionRunRootAbsent: true, constructionJournalAbsent: true, processGroupsAbsent: true });

  const manifestSha256 = hashFrame("retry-reader-close-cleanup-manifest-v1\n");
  const hostBindingId = "3".repeat(32);
  const runId = createHash("sha256").update(`r4-gate-b-physical-retry:${manifestSha256}:${hostBindingId}`, "utf8").digest("hex").slice(0, 32);
  const parsed = Object.freeze({ manifestSha256, executionGrantSha256: manifestSha256, hostBindingId });
  for (const initialState of ["journal", "missing-journal"] as const) {
    const fixture = retryJournalFixtureRoot();
    if (initialState === "journal") {
      const journal = createRetryJournal(fixture.root, manifestSha256, hostBindingId, runId);
      journal.close();
      journal.zeroize();
    } else fs.mkdirSync(fixture.root, { mode: 0o700 });
    const authority = { root: fixture.root, journalPath: path.join(fixture.root, "journal.v1.jsonl") };
    let injected = false;
    fs.closeSync = ((descriptor: number) => {
      if (!injected) { injected = true; originalClose(descriptor); throw Object.assign(new Error(`injected Retry ${initialState} reader close fault`), { code: "EIO" }); }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try {
      await assert.rejects(
        cleanupCoreRetry(parsed, { journalAuthority: authority }),
        (error: unknown) => error instanceof Error && "code" in error && error.code === (initialState === "journal" ? "RETRY_JOURNAL_READ_CLOSE_FAILED" : "RETRY_EMPTY_ROOT_AUTHENTICATION_CLOSE_FAILED") && "verdict" in error && error.verdict === "RED",
      );
      assert.equal(injected, true);
    } finally { fs.closeSync = originalClose; }
    assert.equal(fs.existsSync(fixture.root), false, `${initialState} close-fault cleanup must remove exact root`);
    assert.deepEqual(await cleanupCoreRetry(parsed, { journalAuthority: authority }), { schemaVersion: "r4_gate_b_physical_retry_cleanup.v1", status: "GREEN", alreadyAbsent: true });
    fs.rmdirSync(fixture.parent);
    assert.equal(fs.existsSync(fixture.parent), false);
  }
});

test("terminal selection preserves first-cause code and escalates to the strongest safety verdict", () => {
  const primaryYellow = Object.assign(new Error("PRIMARY_YELLOW"), { code: "PRIMARY_YELLOW", verdict: "YELLOW", partialObservation: { marker: 1 } });
  const primaryRed = Object.assign(new Error("PRIMARY_RED"), { code: "PRIMARY_RED", verdict: "RED" });
  const cleanupQuarantined = Object.assign(new Error("CLEANUP_QUARANTINED"), { code: "CLEANUP_QUARANTINED", verdict: "RED_QUARANTINED" });
  const finalizationRed = Object.assign(new Error("FINALIZATION_RED"), { code: "FINALIZATION_RED", verdict: "RED" });
  const rawCleanup = Object.assign(new Error("RAW_CLEANUP"), { code: "RAW_CLEANUP" });
  const primaryYellowQuarantined = Object.assign(new Error("PRIMARY_YELLOW_QUARANTINED"), { code: "PRIMARY_YELLOW_QUARANTINED", verdict: "YELLOW_QUARANTINED" });
  const yellowQuarantine = selectPhysicalRunnerTerminalError(primaryYellow, cleanupQuarantined, null);
  assert.equal(yellowQuarantine.code, "PRIMARY_YELLOW");
  assert.equal(yellowQuarantine.verdict, "RED_QUARANTINED");
  assert.deepEqual(yellowQuarantine.partialObservation, { marker: 1 });
  const redQuarantine = selectPhysicalRunnerTerminalError(primaryRed, cleanupQuarantined, null);
  assert.equal(redQuarantine.code, "PRIMARY_RED");
  assert.equal(redQuarantine.verdict, "RED_QUARANTINED");
  const yellowFinalization = selectPhysicalRunnerTerminalError(primaryYellow, null, finalizationRed);
  assert.equal(yellowFinalization.code, "PRIMARY_YELLOW");
  assert.equal(yellowFinalization.verdict, "RED");
  const yellowRawCleanup = selectPhysicalRunnerTerminalError(primaryYellow, rawCleanup, null);
  assert.equal(yellowRawCleanup.code, "PRIMARY_YELLOW");
  assert.equal(yellowRawCleanup.verdict, "RED_QUARANTINED");
  assert.equal(selectPhysicalRunnerTerminalError(primaryRed, null, null), primaryRed);
  assert.equal(selectPhysicalRunnerTerminalError(primaryYellowQuarantined, null, null), primaryYellowQuarantined);
});

test("exact successor package-lock denies Construction entry before root or physical effects", async () => {
  assertExactSuccessorPackageLockBoundary();
  assert.equal(fs.existsSync(constructionRoot), false);
  await assert.rejects(constructPhysicalAdapters(), isExactSuccessorPackageLockFailure);
  assert.equal(fs.existsSync(constructionRoot), false);
  assert.equal((await cleanupConstruction()).constructionRunRootAbsent, true);
});

test("construction cleanup journal publication and recovery state machines reject replay and field drift", () => {
  const sha = `sha256:${"a".repeat(64)}`;
  const hostBindingId = "b".repeat(32);
  let sequence = 0;
  type TestJournalRecord = {
    schemaVersion: string; sequence: number; previousRecordSha256: null; runId: string; manifestSha256: null;
    hostBindingId: string | null; lane: string; event: string; commandShapeSha256: string | null;
    processGroupId: number | null; ownedResources: string[]; terminalCode: string | null; cleanupState: string;
  };
  const record = (overrides: Partial<TestJournalRecord>): TestJournalRecord => ({
    schemaVersion: "r4_gate_b_physical_journal.v1", sequence: sequence++, previousRecordSha256: null,
    runId: "79b7775defbdaf043697ef9b6d0ab45c", manifestSha256: null, hostBindingId: null,
    lane: "host-binding", event: "", commandShapeSha256: null, processGroupId: null,
    ownedResources: [], terminalCode: null, cleanupState: "required", ...overrides,
  });
  const input = record({ event: "input-open-intent", commandShapeSha256: hashFrame("fixed-owner-input-open-v1\n"), ownedResources: ["owner-input-envelope"] });
  const slotHash = hashFrame("r4-gate-b-blocked-start-slot-root.v1\n");
  const slotIntent = record({ event: "intent:blocked-start-slot-root", commandShapeSha256: slotHash, ownedResources: ["blocked-start-slot-root"] });
  const slotObserved = record({ event: "observed:blocked-start-slot-root", commandShapeSha256: slotHash, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED" });
  const inspectorIds = ["docker-client-version", "docker-daemon-version", "docker-image-observation", "macos-product-version", "macos-build-version", "macos-architecture", "developer-root", "swiftc-path", "sdk-path", "sdk-version", "swift-version", "openssl-version"];
  const processRecords = inspectorIds.flatMap((id, index) => {
    const pid = 10_000 + index;
    return [
      record({ event: `intent:${id}`, commandShapeSha256: sha, ownedResources: ["inspector-process-group"] }),
      record({ event: `started:${id}`, commandShapeSha256: sha, processGroupId: pid, ownedResources: ["inspector-process-group"] }),
      record({ event: `terminal:${id}`, commandShapeSha256: sha, processGroupId: pid, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" }),
      record({ event: `observed:${id}`, commandShapeSha256: sha, processGroupId: pid, ownedResources: ["inspector-process-group"], terminalCode: "0", cleanupState: "observed-absent" }),
    ];
  });
  const publication = [
    record({ event: "capsule-target-absent", hostBindingId, commandShapeSha256: sha, ownedResources: ["host-binding-capsule"] }),
    record({ event: "capsule-publication-intent", hostBindingId, commandShapeSha256: sha, ownedResources: ["host-binding-capsule"] }),
    record({ event: "capsule-stage-ready", hostBindingId, commandShapeSha256: sha, ownedResources: ["host-binding-capsule-stage"], terminalCode: "STAGED" }),
    record({ event: "public-receipt-target-absent", hostBindingId, commandShapeSha256: sha, ownedResources: ["public-receipt"] }),
    record({ event: "public-receipt-publication-intent", hostBindingId, commandShapeSha256: sha, ownedResources: ["public-receipt"] }),
    record({ event: "public-receipt-stage-ready", hostBindingId, commandShapeSha256: sha, ownedResources: ["public-receipt-stage"], terminalCode: "STAGED" }),
    record({ event: "capsule-published", hostBindingId, commandShapeSha256: sha, ownedResources: ["host-binding-capsule", "public-receipt"], terminalCode: "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW", cleanupState: "retain-capsule" }),
  ];
  const valid = [input, slotIntent, slotObserved, ...processRecords, ...publication];
  assert.equal(validateConstructionJournalForCleanup(valid).publicationComplete, true);
  const firstObservedIndex = valid.findIndex((entry) => entry.event === "observed:docker-client-version");
  const replayAfterObserved = [...valid];
  replayAfterObserved.splice(firstObservedIndex + 1, 0, { ...valid[firstObservedIndex]!, event: "cleanup-observed-absent:docker-client-version", terminalCode: "ABSENT" });
  assert.throws(() => validateConstructionJournalForCleanup(replayAfterObserved), /CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_DUPLICATE/u);
  assert.throws(() => validateConstructionJournalForCleanup([input, { ...input }, ...valid.slice(1)]), /CONSTRUCTION_JOURNAL_INPUT_INTENT_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(valid.map((entry, index) => index === valid.length - 1 ? { ...entry, lane: "construction" } : entry)), /CONSTRUCTION_JOURNAL_PUBLICATION_ID_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(valid.map((entry) => entry.event === "capsule-publication-intent" ? { ...entry, commandShapeSha256: `sha256:${"c".repeat(64)}` } : entry)), /CONSTRUCTION_JOURNAL_CAPSULE_INTENT_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(valid.filter((entry) => entry.event !== "capsule-stage-ready")), /CONSTRUCTION_JOURNAL_RECEIPT_TARGET_INVALID/u);
  const capsuleStageIndex = valid.findIndex((entry) => entry.event === "capsule-stage-ready");
  assert.throws(() => validateConstructionJournalForCleanup([...valid.slice(0, capsuleStageIndex + 1), { ...valid[capsuleStageIndex]! }, ...valid.slice(capsuleStageIndex + 1)]), /CONSTRUCTION_JOURNAL_CAPSULE_STAGE_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(valid.map((entry) => entry.event === "public-receipt-stage-ready" ? { ...entry, ownedResources: ["public-receipt"] } : entry)), /CONSTRUCTION_JOURNAL_RECEIPT_STAGE_INVALID/u);
  assert.throws(() => validateConstructionJournalForCleanup(valid.map((entry) => entry.event === "public-receipt-target-absent" ? { ...entry, ownedResources: ["host-binding-capsule"] } : entry)), /CONSTRUCTION_JOURNAL_RECEIPT_TARGET_INVALID/u);

  sequence = 0;
  const qInput = record({ event: "input-open-intent", commandShapeSha256: hashFrame("fixed-owner-input-open-v1\n"), ownedResources: ["owner-input-envelope"] });
  const qSlotIntent = record({ event: "intent:blocked-start-slot-root", commandShapeSha256: slotHash, ownedResources: ["blocked-start-slot-root"] });
  const qSlotObserved = record({ event: "observed:blocked-start-slot-root", commandShapeSha256: slotHash, ownedResources: ["blocked-start-slot-root"], terminalCode: "CREATED" });
  const qIntent = record({ event: "intent:docker-client-version", commandShapeSha256: sha, ownedResources: ["inspector-process-group"] });
  const qStarted = record({ event: "started:docker-client-version", commandShapeSha256: sha, processGroupId: 20_000, ownedResources: ["inspector-process-group"] });
  const qTerminal = record({ event: "terminal:docker-client-version", commandShapeSha256: sha, processGroupId: 20_000, ownedResources: ["inspector-process-group"], terminalCode: "NO_TERMINAL", cleanupState: "quarantined" });
  const qRecovery = record({ event: "cleanup-observed-absent:docker-client-version", commandShapeSha256: sha, processGroupId: 20_000, ownedResources: ["inspector-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" });
  const recovered = [qInput, qSlotIntent, qSlotObserved, qIntent, qStarted, qTerminal, qRecovery];
  assert.deepEqual(validateConstructionJournalForCleanup(recovered).unresolvedProcessGroups, []);
  assert.throws(() => validateConstructionJournalForCleanup([...recovered, { ...qRecovery }]), /CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_DUPLICATE/u);
  assert.throws(() => validateConstructionJournalForCleanup([...recovered, { ...qRecovery, processGroupId: 20_001 }]), /CONSTRUCTION_JOURNAL_INSPECTOR_RECOVERY_DUPLICATE/u);
});

test("construction journal recovery closes fresh empty and first-append write/fsync fault windows", async () => {
  const fakeMatrixIntent = { lane: "construction", event: "fake-matrix-intent", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: ["construction-run-root", "fake-process-groups"] };

  for (const failurePoint of ["file-fsync", "directory-fsync"] as const) {
    const createFaultRoot = constructionJournalFixtureRoot();
    const originalFsync = fs.fsyncSync;
    let calls = 0;
    fs.fsyncSync = ((descriptor: number) => {
      calls += 1;
      if ((failurePoint === "file-fsync" && calls === 1) || (failurePoint === "directory-fsync" && calls === 2)) throw Object.assign(new Error(`injected ${failurePoint}`), { code: "EIO" });
      return originalFsync(descriptor);
    }) as typeof fs.fsyncSync;
    try { assert.throws(() => createConstructionJournal(createFaultRoot), /CONSTRUCTION_JOURNAL_CREATE_FAILED/u); }
    finally { fs.fsyncSync = originalFsync; }
    assert.equal(fs.existsSync(path.join(createFaultRoot, "journal.v1.jsonl")), false);
    assert.deepEqual(fs.readdirSync(createFaultRoot), []);
    fs.rmSync(createFaultRoot, { recursive: true, force: true });
  }

  const emptyRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(emptyRoot);
    journal.close();
    const stat = fs.lstatSync(path.join(emptyRoot, "journal.v1.jsonl"));
    assert.equal(stat.size, 0);
    assert.equal(stat.mode & 0o777, 0o600);
    const authenticated = readConstructionJournalFixture(emptyRoot);
    assert.deepEqual(authenticated.records, []);
    assertNoEffectConstructionPlan(authenticated.records);
  } finally { fs.rmSync(emptyRoot, { recursive: true, force: true }); }

  const writeFaultRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(writeFaultRoot);
    const originalWrite = fs.writeSync;
    let writes = 0;
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      writes += 1;
      if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
      throw Object.assign(new Error("injected first-append write fault"), { code: "EIO" });
    }) as typeof fs.writeSync;
    try { await assert.rejects(journal.append(fakeMatrixIntent), /injected first-append write fault/u); }
    finally { fs.writeSync = originalWrite; journal.close(); }
    assert.ok(fs.lstatSync(path.join(writeFaultRoot, "journal.v1.jsonl")).size > 0);
    const authenticated = readConstructionJournalFixture(writeFaultRoot);
    assert.deepEqual(authenticated.records, []);
    assertNoEffectConstructionPlan(authenticated.records);
    assert.equal(fs.lstatSync(path.join(writeFaultRoot, "journal.v1.jsonl")).size, 0);
  } finally { fs.rmSync(writeFaultRoot, { recursive: true, force: true }); }

  const fsyncFaultRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(fsyncFaultRoot);
    const originalFsync = fs.fsyncSync;
    fs.fsyncSync = ((descriptor: number) => {
      originalFsync(descriptor);
      throw Object.assign(new Error("injected first-append fsync fault"), { code: "EIO" });
    }) as typeof fs.fsyncSync;
    try { await assert.rejects(journal.append(fakeMatrixIntent), /injected first-append fsync fault/u); }
    finally { fs.fsyncSync = originalFsync; journal.close(); }
    const authenticated = readConstructionJournalFixture(fsyncFaultRoot);
    assert.equal(authenticated.records.length, 1);
    assert.equal(authenticated.records[0].event, "fake-matrix-intent");
    assert.deepEqual(validateConstructionJournalForCleanup(authenticated.records).unresolvedProcessGroups, []);
    assert.deepEqual(validateConstructionJournalForCleanup(authenticated.records).unstartedSupervisorStarts, []);
  } finally { fs.rmSync(fsyncFaultRoot, { recursive: true, force: true }); }
});

test("construction journal append faults poison the live writer and recover only through a newly authenticated writer", async () => {
  const matrixShape = hashFrame("construction-fake-matrix-v1\n");
  const commandShapeSha256 = hashFrame("construction-journal-poison-process-v1\n");
  const processGroupId = 43_210;
  const fakeMatrixIntent = { lane: "construction", event: "fake-matrix-intent", commandShapeSha256: matrixShape, ownedResources: ["construction-run-root", "fake-process-groups"] };
  const processIntent = { lane: "macos", event: "intent:blocked-start-fake", commandShapeSha256, ownedResources: ["macos-process-group"] };
  const started = { lane: "macos", event: "started:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"] };
  const terminal = { lane: "macos", event: "terminal:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"], terminalCode: "NO_TERMINAL", cleanupState: "quarantined" };
  const recovery = { lane: "macos", event: "cleanup-observed-absent:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" };

  for (const partialEvent of ["started", "terminal"] as const) {
    const fixtureRoot = constructionJournalFixtureRoot();
    const journal = createConstructionJournal(fixtureRoot);
    const originalWrite = fs.writeSync;
    let journalClosed = false;
    const capturedAppendBuffers: Buffer[] = [];
    try {
      await journal.append(fakeMatrixIntent);
      await journal.append(processIntent);
      if (partialEvent === "terminal") await journal.append(started);
      let writes = 0;
      fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
        writes += 1;
        assert.ok(Buffer.isBuffer(buffer));
        capturedAppendBuffers.push(buffer);
        if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
        throw Object.assign(new Error(`injected partial ${partialEvent} append fault`), { code: "EIO" });
      }) as typeof fs.writeSync;
      try { await assert.rejects(journal.append(partialEvent === "started" ? started : terminal), new RegExp(`injected partial ${partialEvent} append fault`, "u")); }
      finally { fs.writeSync = originalWrite; }

      const faultBuffer = capturedAppendBuffers.at(-1);
      assert.ok(faultBuffer !== undefined);
      assert.ok(faultBuffer.every((byte) => byte === 0), "failed append serialization bytes must be zeroized");
      const journalPath = path.join(fixtureRoot, "journal.v1.jsonl");
      const tornBytes = fs.readFileSync(journalPath);
      try {
        await assert.rejects(
          journal.append(recovery),
          (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
        );
        assert.deepEqual(fs.readFileSync(journalPath), tornBytes, "poisoned writer must not append a recovery record");
        assert.throws(() => journal.aggregateSha256(), /CONSTRUCTION_JOURNAL_APPEND_POISONED/u);
      } finally { tornBytes.fill(0); }
      journal.close();
      journalClosed = true;
      journal.zeroize();

      const authenticated = readConstructionJournalFixture(fixtureRoot);
      assert.equal(authenticated.records.length, partialEvent === "started" ? 2 : 3);
      assert.equal(authenticated.records.at(-1)?.event, partialEvent === "started" ? "intent:blocked-start-fake" : "started:blocked-start-fake");
      const beforeRecovery = validateConstructionJournalForCleanup(authenticated.records);
      assert.deepEqual(beforeRecovery.unresolvedProcessGroups, partialEvent === "started" ? [] : [processGroupId]);
      assert.equal(beforeRecovery.unstartedSupervisorStarts.length, partialEvent === "started" ? 1 : 0);

      const recoveryJournal = openAuthenticatedConstructionJournalForAppend(authenticated);
      try {
        const recoveryRecord = await recoveryJournal.append(recovery);
        assert.equal(recoveryRecord.sequence, authenticated.records.length);
        assert.match(recoveryRecord.previousRecordSha256, /^sha256:[0-9a-f]{64}$/u);
      } finally { recoveryJournal.close(); }
      const recovered = readConstructionJournalFixture(fixtureRoot);
      assert.equal(recovered.records.at(-1)?.event, "cleanup-observed-absent:blocked-start-fake");
      assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unresolvedProcessGroups, []);
      assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unstartedSupervisorStarts, []);
      assert.deepEqual(fs.readdirSync(fixtureRoot), ["journal.v1.jsonl"]);
    } finally {
      fs.writeSync = originalWrite;
      if (!journalClosed) try { journal.close(); } catch { /* fixture removal remains authoritative */ }
      journal.zeroize();
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
      assert.equal(fs.existsSync(fixtureRoot), false, `exact ${partialEvent} fault fixture root must be absent`);
    }
  }

  const durableFaultRoot = constructionJournalFixtureRoot();
  const durableJournal = createConstructionJournal(durableFaultRoot);
  const originalWrite = fs.writeSync;
  const originalFsync = fs.fsyncSync;
  let durableJournalClosed = false;
  const capturedDurableBuffers: Buffer[] = [];
  try {
    await durableJournal.append(fakeMatrixIntent);
    await durableJournal.append(processIntent);
    await durableJournal.append(started);
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      assert.ok(Buffer.isBuffer(buffer));
      capturedDurableBuffers.push(buffer);
      return originalWrite(descriptor, buffer, offset, length, position ?? null);
    }) as typeof fs.writeSync;
    fs.fsyncSync = ((descriptor: number) => {
      originalFsync(descriptor);
      throw Object.assign(new Error("injected post-durable append fsync fault"), { code: "EIO" });
    }) as typeof fs.fsyncSync;
    try { await assert.rejects(durableJournal.append(terminal), /injected post-durable append fsync fault/u); }
    finally { fs.writeSync = originalWrite; fs.fsyncSync = originalFsync; }

    const durableBuffer = capturedDurableBuffers.at(-1);
    assert.ok(durableBuffer !== undefined);
    assert.ok(durableBuffer.every((byte) => byte === 0), "fsync-failed append serialization bytes must be zeroized");
    const journalPath = path.join(durableFaultRoot, "journal.v1.jsonl");
    const durablePrefix = fs.readFileSync(journalPath);
    try {
      await assert.rejects(
        durableJournal.append(recovery),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      assert.deepEqual(fs.readFileSync(journalPath), durablePrefix, "poisoned writer must not extend a fully durable prefix");
    } finally { durablePrefix.fill(0); }
    durableJournal.close();
    durableJournalClosed = true;
    durableJournal.zeroize();

    const authenticated = readConstructionJournalFixture(durableFaultRoot);
    assert.equal(authenticated.records.length, 4);
    assert.equal(authenticated.records.at(-1)?.event, "terminal:blocked-start-fake");
    assert.deepEqual(validateConstructionJournalForCleanup(authenticated.records).unresolvedProcessGroups, [processGroupId]);
    const recoveryJournal = openAuthenticatedConstructionJournalForAppend(authenticated);
    try { await recoveryJournal.append(recovery); }
    finally { recoveryJournal.close(); }
    const recovered = readConstructionJournalFixture(durableFaultRoot);
    assert.equal(recovered.records.length, 5);
    assert.equal(recovered.records.at(-1)?.event, "cleanup-observed-absent:blocked-start-fake");
    assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unresolvedProcessGroups, []);
    assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unstartedSupervisorStarts, []);
    assert.deepEqual(fs.readdirSync(durableFaultRoot), ["journal.v1.jsonl"]);
  } finally {
    fs.writeSync = originalWrite;
    fs.fsyncSync = originalFsync;
    if (!durableJournalClosed) try { durableJournal.close(); } catch { /* fixture removal remains authoritative */ }
    durableJournal.zeroize();
    fs.rmSync(durableFaultRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(durableFaultRoot), false, "exact durable-fault fixture root must be absent");
  }
});

test("authenticated construction recovery writer is also poisoned by an append fault", async () => {
  const fixtureRoot = constructionJournalFixtureRoot();
  const commandShapeSha256 = hashFrame("construction-recovery-writer-poison-v1\n");
  const processGroupId = 43_211;
  const recovery = { lane: "macos", event: "cleanup-observed-absent:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"], terminalCode: "ABSENT", cleanupState: "observed-absent" };
  const originalWrite = fs.writeSync;
  let initialJournal: ReturnType<typeof createConstructionJournal> | null = null;
  let recoveryJournal: ReturnType<typeof openAuthenticatedConstructionJournalForAppend> | null = null;
  try {
    initialJournal = createConstructionJournal(fixtureRoot);
    await initialJournal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: ["construction-run-root", "fake-process-groups"] });
    await initialJournal.append({ lane: "macos", event: "intent:blocked-start-fake", commandShapeSha256, ownedResources: ["macos-process-group"] });
    await initialJournal.append({ lane: "macos", event: "started:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"] });
    await initialJournal.append({ lane: "macos", event: "terminal:blocked-start-fake", commandShapeSha256, processGroupId, ownedResources: ["macos-process-group"], terminalCode: "NO_TERMINAL", cleanupState: "quarantined" });
    initialJournal.close();
    initialJournal.zeroize();
    initialJournal = null;

    recoveryJournal = openAuthenticatedConstructionJournalForAppend(readConstructionJournalFixture(fixtureRoot));
    const capturedBuffers: Buffer[] = [];
    let writes = 0;
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      writes += 1;
      assert.ok(Buffer.isBuffer(buffer));
      capturedBuffers.push(buffer);
      if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
      throw Object.assign(new Error("injected authenticated recovery append fault"), { code: "EIO" });
    }) as typeof fs.writeSync;
    try { await assert.rejects(recoveryJournal.append(recovery), /injected authenticated recovery append fault/u); }
    finally { fs.writeSync = originalWrite; }
    const faultBuffer = capturedBuffers.at(-1);
    assert.ok(faultBuffer !== undefined);
    assert.ok(faultBuffer.every((byte) => byte === 0), "failed recovery serialization bytes must be zeroized");
    const journalPath = path.join(fixtureRoot, "journal.v1.jsonl");
    const tornBytes = fs.readFileSync(journalPath);
    try {
      await assert.rejects(
        recoveryJournal.append(recovery),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "CONSTRUCTION_CLEANUP_JOURNAL_APPEND_POISONED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      assert.deepEqual(fs.readFileSync(journalPath), tornBytes);
    } finally { tornBytes.fill(0); }
    recoveryJournal.close();
    recoveryJournal = null;

    const repaired = readConstructionJournalFixture(fixtureRoot);
    assert.equal(repaired.records.length, 4);
    const authenticatedRecovery = openAuthenticatedConstructionJournalForAppend(repaired);
    try { await authenticatedRecovery.append(recovery); }
    finally { authenticatedRecovery.close(); }
    const recovered = readConstructionJournalFixture(fixtureRoot);
    assert.equal(recovered.records.length, 5);
    assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unresolvedProcessGroups, []);
    assert.deepEqual(validateConstructionJournalForCleanup(recovered.records).unstartedSupervisorStarts, []);
    assert.deepEqual(fs.readdirSync(fixtureRoot), ["journal.v1.jsonl"]);
  } finally {
    fs.writeSync = originalWrite;
    try { recoveryJournal?.close(); } catch { /* fixture removal remains authoritative */ }
    try { initialJournal?.close(); } catch { /* fixture removal remains authoritative */ }
    initialJournal?.zeroize();
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(fixtureRoot), false, "exact recovery-writer fault fixture root must be absent");
  }
});

test("Phase B authenticates the exact checkpoint/journal root inventory and preserves unknown siblings", () => {
  const preexistingRoot = constructionJournalFixtureRoot();
  const preexistingCheckpointPath = path.join(preexistingRoot, "construction-checkpoint.v1.json");
  const preexistingUnknownPath = path.join(preexistingRoot, "same-uid-unknown-sibling");
  try {
    fs.writeFileSync(preexistingCheckpointPath, "checkpoint\n", { mode: 0o600, flag: "wx" });
    fs.writeFileSync(preexistingUnknownPath, "owner-preserve\n", { mode: 0o600, flag: "wx" });
    const unknownBefore = fs.lstatSync(preexistingUnknownPath);
    assert.throws(
      () => verifyPhaseBConstructionRootInventory(preexistingRoot, "checkpoint-only"),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "PHASE_B_CONSTRUCTION_ROOT_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED",
    );
    const unknownAfter = fs.lstatSync(preexistingUnknownPath);
    assert.equal(unknownAfter.dev, unknownBefore.dev);
    assert.equal(unknownAfter.ino, unknownBefore.ino);
    assert.equal(fs.readFileSync(preexistingUnknownPath, "utf8"), "owner-preserve\n");
    assert.equal(fs.existsSync(path.join(preexistingRoot, "journal.v1.jsonl")), false);
    assert.deepEqual(fs.readdirSync(preexistingRoot).sort(), ["construction-checkpoint.v1.json", "same-uid-unknown-sibling"]);
  } finally { fs.rmSync(preexistingRoot, { recursive: true, force: true }); }

  const inventoryRoot = constructionJournalFixtureRoot();
  const checkpointPath = path.join(inventoryRoot, "construction-checkpoint.v1.json");
  const unknownPath = path.join(inventoryRoot, "same-uid-unknown-sibling");
  try {
    fs.writeFileSync(checkpointPath, "checkpoint\n", { mode: 0o600, flag: "wx" });
    assert.deepEqual(verifyPhaseBConstructionRootInventory(inventoryRoot, "checkpoint-only"), {
      phase: "checkpoint-only",
      entries: ["construction-checkpoint.v1.json"],
      stableIdentity: true,
      noFollow: true,
    });
    const journal = createConstructionJournal(inventoryRoot);
    try {
      assert.deepEqual(verifyPhaseBConstructionRootInventory(inventoryRoot, "checkpoint-and-journal"), {
        phase: "checkpoint-and-journal",
        entries: ["construction-checkpoint.v1.json", "journal.v1.jsonl"],
        stableIdentity: true,
        noFollow: true,
      });
      fs.writeFileSync(unknownPath, "owner-preserve\n", { mode: 0o600, flag: "wx" });
      const unknownBefore = fs.lstatSync(unknownPath);
      assert.throws(
        () => verifyPhaseBConstructionRootInventory(inventoryRoot, "checkpoint-and-journal"),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "PHASE_B_CONSTRUCTION_ROOT_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
      const unknownAfter = fs.lstatSync(unknownPath);
      assert.equal(unknownAfter.dev, unknownBefore.dev);
      assert.equal(unknownAfter.ino, unknownBefore.ino);
      assert.equal(fs.readFileSync(unknownPath, "utf8"), "owner-preserve\n");
      assert.deepEqual(fs.readdirSync(inventoryRoot).sort(), ["construction-checkpoint.v1.json", "journal.v1.jsonl", "same-uid-unknown-sibling"]);
    } finally { journal.close(); journal.zeroize(); }
  } finally { fs.rmSync(inventoryRoot, { recursive: true, force: true }); }
});

test("Phase B pre-input ordinary checkpoint faults remove the authenticated root without input access", async () => {
  const fixtureRoot = phaseBCheckpointFixtureRoot();
  await assert.rejects(
    preparePhaseBHostBindingPreInput({
      constructionRoot: fixtureRoot,
      checkpointReader() { throw new PhysicalRunnerError("PHASE_B_TEST_CHECKPOINT_FAULT", "RED"); },
      implementationVerifier() { throw new Error("unreachable verifier"); },
    }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "PHASE_B_TEST_CHECKPOINT_FAULT" && "hostBindingInputRead" in error && error.hostBindingInputRead === false,
  );
  assert.equal(fs.existsSync(fixtureRoot), false);
});

test("Phase B second inventory preserves an injected unknown sibling and returns quarantined before input", async () => {
  const fixtureRoot = phaseBCheckpointFixtureRoot();
  const unknownPath = path.join(fixtureRoot, "same-uid-unknown-sibling");
  try {
    await assert.rejects(
      preparePhaseBHostBindingPreInput({
        constructionRoot: fixtureRoot,
        checkpointReader() { return Object.freeze({ fixture: true }); },
        implementationVerifier() {},
        afterJournalAuthorityTransfer() { fs.writeFileSync(unknownPath, "owner-preserve\n", { flag: "wx", mode: 0o600 }); },
      }),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "PHASE_B_CONSTRUCTION_ROOT_INVENTORY_INVALID" && "verdict" in error && error.verdict === "RED_QUARANTINED" && "hostBindingInputRead" in error && error.hostBindingInputRead === false,
    );
    assert.equal(fs.readFileSync(unknownPath, "utf8"), "owner-preserve\n");
    assert.deepEqual(fs.readdirSync(fixtureRoot).sort(), ["construction-checkpoint.v1.json", "journal.v1.jsonl", "same-uid-unknown-sibling"]);
  } finally { fs.rmSync(fixtureRoot, { recursive: true, force: true }); }
});

test("Phase B carried root authority detects a pre-journal same-UID root swap and preserves both resources", async () => {
  const fixtureRoot = phaseBCheckpointFixtureRoot();
  const displaced = `${fixtureRoot}-displaced`;
  try {
    await assert.rejects(
      preparePhaseBHostBindingPreInput({
        constructionRoot: fixtureRoot,
        checkpointReader() { return Object.freeze({ fixture: true }); },
        implementationVerifier() {
          fs.renameSync(fixtureRoot, displaced);
          fs.mkdirSync(fixtureRoot, { mode: 0o700 });
          fs.writeFileSync(path.join(fixtureRoot, "construction-checkpoint.v1.json"), "replacement\n", { flag: "wx", mode: 0o600 });
        },
      }),
      (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED" && "hostBindingInputRead" in error && error.hostBindingInputRead === false,
    );
    assert.deepEqual(fs.readdirSync(fixtureRoot), ["construction-checkpoint.v1.json"]);
    assert.deepEqual(fs.readdirSync(displaced), ["construction-checkpoint.v1.json"]);
  } finally { fs.rmSync(fixtureRoot, { recursive: true, force: true }); fs.rmSync(displaced, { recursive: true, force: true }); }
});

test("Phase B pre-input cleanup preserves the first code while escalating later unknown-resource cleanup", async () => {
  const fixtureRoot = phaseBCheckpointFixtureRoot();
  const unknownPath = path.join(fixtureRoot, "same-uid-late-unknown");
  try {
    await assert.rejects(
      preparePhaseBHostBindingPreInput({
        constructionRoot: fixtureRoot,
        checkpointReader() {
          fs.writeFileSync(unknownPath, "owner-preserve\n", { flag: "wx", mode: 0o600 });
          throw new PhysicalRunnerError("PHASE_B_TEST_YELLOW_PRIMARY", "YELLOW_NO_RETRY");
        },
        implementationVerifier() {},
      }),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "PHASE_B_TEST_YELLOW_PRIMARY" && "verdict" in error && error.verdict === "RED_QUARANTINED" && "hostBindingInputRead" in error && error.hostBindingInputRead === false,
    );
    assert.equal(fs.readFileSync(unknownPath, "utf8"), "owner-preserve\n");
  } finally { fs.rmSync(fixtureRoot, { recursive: true, force: true }); }
});

test("construction journal authority transfer gate fail-stops every held descriptor", () => {
  const fixtureRoot = phaseBCheckpointFixtureRoot();
  const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: path.dirname(fixtureRoot), codePrefix: "TEST_CONSTRUCTION_TRANSFER" });
  const journal = createConstructionJournal(fixtureRoot, { rootAuthority: authority });
  fs.writeFileSync(path.join(fixtureRoot, "same-uid-unknown"), "preserve\n", { flag: "wx", mode: 0o600 });
  try {
    assert.throws(() => journal.takeRootAuthority(), (error: unknown) => error instanceof Error && "verdict" in error && error.verdict === "RED_QUARANTINED");
    assert.throws(() => fs.fstatSync(authority.rootFd), (error: any) => error?.code === "EBADF");
    assert.throws(() => fs.fstatSync(authority.parentFd), (error: any) => error?.code === "EBADF");
    journal.close();
    journal.zeroize();
    assert.equal(fs.readFileSync(path.join(fixtureRoot, "same-uid-unknown"), "utf8"), "preserve\n");
  } finally { fs.rmSync(fixtureRoot, { recursive: true, force: true }); }
});

test("publication rollback validation always closes authenticated construction reader authority", () => {
  const fixtureRoot = constructionJournalFixtureRoot();
  const journal = createConstructionJournal(fixtureRoot);
  journal.close();
  journal.zeroize();
  const authenticated = readConstructionJournalFixture(fixtureRoot);
  const { rootFd, parentFd } = authenticated.rootAuthority as { rootFd: number; parentFd: number };
  assert.equal(withAuthenticatedConstructionRollbackPlan(authenticated, (plan: ReturnType<typeof validateConstructionJournalForCleanup>) => { assertNoEffectConstructionPlan(authenticated.records); return plan.publicationComplete; }), false);
  assert.throws(() => fs.fstatSync(rootFd), (error: any) => error?.code === "EBADF");
  assert.throws(() => fs.fstatSync(parentFd), (error: any) => error?.code === "EBADF");
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

test("construction journal recovery authenticates only a complete prefix and rejects non-tail corruption", async () => {
  const prefixRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(prefixRoot);
    await journal.append({ lane: "host-binding", event: "input-open-intent", commandShapeSha256: hashFrame("fixed-owner-input-open-v1\n"), ownedResources: ["owner-input-envelope"] });
    const journalPath = path.join(prefixRoot, "journal.v1.jsonl");
    const prefix = fs.readFileSync(journalPath);
    await journal.append({ lane: "host-binding", event: "capsule-target-absent", hostBindingId: "b".repeat(32), commandShapeSha256: `sha256:${"a".repeat(64)}`, ownedResources: ["host-binding-capsule"] });
    journal.close();
    const fullSize = fs.lstatSync(journalPath).size;
    const fd = fs.openSync(journalPath, fs.constants.O_RDWR);
    try { fs.ftruncateSync(fd, fullSize - 1); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    const originalFsync = fs.fsyncSync;
    let repairFsyncs = 0;
    fs.fsyncSync = ((descriptor: number) => { repairFsyncs += 1; return originalFsync(descriptor); }) as typeof fs.fsyncSync;
    let authenticated: ReturnType<typeof readConstructionJournalFixture>;
    try { authenticated = readConstructionJournalFixture(prefixRoot); }
    finally { fs.fsyncSync = originalFsync; }
    assert.equal(repairFsyncs, 1);
    assert.equal(authenticated.records.length, 1);
    assert.equal(authenticated.records[0].event, "input-open-intent");
    assert.deepEqual(fs.readFileSync(journalPath), prefix);
    const plan = validateConstructionJournalForCleanup(authenticated.records);
    assert.equal(plan.removeOwnerInput, true);
    assert.equal(plan.publicationHostBindingId, null);
    assert.equal(plan.capsuleExpectedSha256, null);
    assert.deepEqual(plan.unresolvedProcessGroups, []);
    assert.deepEqual(plan.unstartedSupervisorStarts, []);
    prefix.fill(0);
  } finally { fs.rmSync(prefixRoot, { recursive: true, force: true }); }

  const corruptRoot = constructionJournalFixtureRoot();
  try {
    const journal = createConstructionJournal(corruptRoot);
    await journal.append({ lane: "construction", event: "fake-matrix-intent", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: ["construction-run-root", "fake-process-groups"] });
    await journal.append({ lane: "construction", event: "fake-matrix-observed", commandShapeSha256: hashFrame("construction-fake-matrix-v1\n"), ownedResources: [], terminalCode: "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN" });
    journal.close();
    const journalPath = path.join(corruptRoot, "journal.v1.jsonl");
    const corrupt = fs.readFileSync(journalPath);
    const marker = corrupt.indexOf(Buffer.from("fake-matrix-intent", "utf8"));
    assert.ok(marker >= 0);
    corrupt[marker + "fake-matrix-".length] = "j".charCodeAt(0);
    fs.writeFileSync(journalPath, corrupt);
    const before = fs.readFileSync(journalPath);
    assert.throws(() => readConstructionJournalFixture(corruptRoot), /CONSTRUCTION_JOURNAL_CHAIN_INVALID/u);
    assert.deepEqual(fs.readFileSync(journalPath), before);
    corrupt.fill(0); before.fill(0);
  } finally { fs.rmSync(corruptRoot, { recursive: true, force: true }); }
});

test("Phase A authority denies the exact successor package-lock before construction-root effects", () => {
  assertExactSuccessorPackageLockBoundary();
  assert.equal(fs.existsSync(constructionRoot), false);
  assert.throws(verifyPhaseAAuthority, isExactSuccessorPackageLockFailure);
  assert.equal(fs.existsSync(constructionRoot), false);
});

test("checkpoint reader zeroizes before close and preserves a schema first cause over the later close fault", () => {
  for (const [value, expectedCode] of [[checkpointFixture(), "CONSTRUCTION_CHECKPOINT_READ_CLOSE_FAILED"], [{}, "CONSTRUCTION_CHECKPOINT_SCHEMA_INVALID"]] as const) {
    const fixtureRoot = phaseBCheckpointFixtureRoot(`${canonicalJson(value)}\n`);
    const authority = openExactOwnedRootAuthority({ root: fixtureRoot, anchor: path.dirname(fixtureRoot), codePrefix: "TEST_CHECKPOINT_READER" });
    const originalRead = fs.readSync;
    const originalClose = fs.closeSync;
    let checkpointDescriptor: number | null = null;
    let capturedBytes: Buffer | null = null;
    fs.readSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      const count = originalRead(descriptor, buffer, offset, length, position ?? null);
      if (Buffer.isBuffer(buffer) && buffer.length > 1) { checkpointDescriptor = descriptor; capturedBytes = buffer; }
      return count;
    }) as typeof fs.readSync;
    fs.closeSync = ((descriptor: number) => {
      if (descriptor === checkpointDescriptor) {
        assert.ok(capturedBytes !== null && capturedBytes.every((byte) => byte === 0), "checkpoint bytes must be zeroized before close");
        originalClose(descriptor);
        throw Object.assign(new Error("injected checkpoint close fault"), { code: "EIO" });
      }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try {
      assert.throws(
        () => readCheckpoint({ constructionRoot: fixtureRoot, rootAuthority: authority }),
        (error: unknown) => error instanceof Error && "code" in error && error.code === expectedCode && "verdict" in error && error.verdict === "RED",
      );
    } finally { fs.readSync = originalRead; fs.closeSync = originalClose; }
    removeExactOwnedRootTree(authority, Object.freeze({ "construction-checkpoint.v1.json": Object.freeze({ kind: "file", modes: Object.freeze([0o600]) }) }));
    assert.equal(fs.existsSync(fixtureRoot), false);
  }
});

test("final checkpoint writer maps four exact flat receipt hashes into the schema auditReceipts object", () => {
  const hash = `sha256:${"a".repeat(64)}`;
  const flat = { validationAggregateSha256: hash, postgresAuditReceiptSha256: hash, codexUnifiedAuditReceiptSha256: hash, macosAuthorityAuditReceiptSha256: hash };
  assert.deepEqual(normalizeFinalConstructionCheckpointInputs(flat), { validationAggregateSha256: hash, auditReceipts: { postgres: hash, codexUnified: hash, macosAuthority: hash } });
  assert.throws(() => writeFinalConstructionCheckpoint({ ...flat, validationAggregateSha256: "invalid" }), /CONSTRUCTION_CHECKPOINT_RECEIPT_INPUT_INVALID/u);
  assert.throws(() => writeFinalConstructionCheckpoint({ ...flat, extra: hash }), /CONSTRUCTION_CHECKPOINT_WRITER_INPUT_SHAPE/u);
  assert.throws(() => writeFinalConstructionCheckpoint({ validationAggregateSha256: hash, auditReceipts: { postgres: hash, codexUnified: hash, macosAuthority: hash } }), /CONSTRUCTION_CHECKPOINT_WRITER_INPUT_SHAPE/u);
  const writerSource = writeFinalConstructionCheckpoint.toString();
  assert.match(writerSource, /const checkpointSha256 = checkpointPublication\.sha256;/u);
  assert.doesNotMatch(writerSource, /fileSha\(path\.relative\(REPOSITORY_ROOT, CHECKPOINT_PATH\)\)/u, "writer return hash must not re-read the checkpoint pathname after authenticated publication");
  const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json"), "utf8"));
  assert.equal(schema.properties.approvedDecisionBriefSha256.const, "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2");
});

test("C-layer preserves historical Host Yellow and zero-call truth while the successor lock denies Construction before effects", async () => {
  assertExactSuccessorPackageLockBoundary();
  const evidence = JSON.parse(fs.readFileSync(path.join(root, "docs/evidence/r4-gate-b-physical-adapter-construction.json"), "utf8"));
  assert.equal(evidence.implementationHead, "92c6c3f8896494aed699671a04a93a09fb59087d");
  assert.equal(evidence.implementationTree, "cf2ce5567c601fff1ad709e565dde41cf9c3540d");
  assert.equal(evidence.status, "HOST_BINDING_INCOMPLETE_YELLOW");
  assert.equal(evidence.reasonCode, "HOST_BOUND_PATH_SYMLINKED");
  assert.equal(evidence.hostBindingAttempted, true);
  assert.equal(evidence.postgresCalls, 0);
  assert.equal(evidence.realCodexCalls, 0);
  assert.equal(evidence.providerCalls, 0);
  assert.equal(evidence.retryExecutionGrant, "NOT_REQUESTED");
  assert.equal(evidence.firstProviderCallGrant, "NOT_REQUESTED");
  assert.equal(fs.existsSync(constructionRoot), false);
  await assert.rejects(constructPhysicalAdapters(), isExactSuccessorPackageLockFailure);
  assert.equal(fs.existsSync(constructionRoot), false);
});

test("library direct execution is denied and Retry stays closed", () => {
  const library = spawnSync(process.execPath, ["scripts/r4-gate-b-physical-port.mjs"], { cwd: root, encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } });
  assert.equal(library.status, 64);
  assert.equal(library.stderr, "PHYSICAL_PORT_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  const hash = `sha256:${"a".repeat(64)}`;
  const retry = spawnSync(process.execPath, ["scripts/r4-gate-b-physical-runner.mjs", "execute-core-retry", "--manifest-sha", hash, "--execution-grant", hash, "--host-binding-id", "b".repeat(32)], { cwd: root, encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } });
  assert.equal(retry.status, 1);
  const parsed = JSON.parse(retry.stdout);
  assert.ok(["RETRY_MANIFEST_NOT_PUBLISHED", "RETRY_MANIFEST_HASH_MISMATCH"].includes(parsed.code));
});

test("future Retry evidence distinguishes validated approval from pre-receipt unknown state", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/physical-retry-evidence.schema.json"), "utf8"));
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  const sha = `sha256:${"a".repeat(64)}`;
  const postgres = { status: "POSTGRES_CORE_LANE_GREEN", namedFamilies: 13, executableCases: 16, orderedExecutions: 32, coreCalls: 68, successful2xx: 39, controlledNon2xx: 29, newReceipts: 37, persistedVerifiers: 32, recoveryCallsValidated: 4, readinessAttempts: 1, rollbackPassed: true, reapplyPassed: true, cleanupStatus: "GREEN" };
  const codex = { status: "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN", reportedVersion: "codex-cli 0.145.0", schemaFileCount: 273, schemaAggregateSha256: "sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62", processStartSlotsConsumed: 4, processGroupsStarted: 4, clientWrites: 2, serverResponses: 1, serverRequests: 0, serverNotifications: 0, receiveBufferEmptyBeforeSecondWrite: true, preSecondWriteViolationObserved: false, postSecondWriteViolationObserved: false, allStartedGroupsReaped: true, allStartedGroupsAbsent: true, exitCodes: [0, 0, 0, 0], stderrBytes: 0, schemaStdoutBytes: 0, threadStarts: 0, turnStarts: 0, providerCalls: 0, providerBytes: 0, networkAuthority: 0, networkTransmittedBytes: 0, networkSyscallAttemptAbsenceClaimed: false, causalFinality: "UNPROVEN_ACCEPTED", postResponseFinalityProven: false, aiLaneEnabled: false, cleanupStatus: "GREEN" };
  const macos = { status: "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY", reasonCode: "CLEAN_TRANSIENT_MECHANISM", helperReceiptSha256: sha, helperReceiptValidated: true, helperReasonCode: "approve_exact", terminal: "approve_exact", presenceCeremonies: 1, presenceCeremoniesObserved: true, handoffCount: 1, handoffCountObserved: true, helperControlledZeroizationPassed: true, helperCleanupPassed: true, outerCleanupPassed: true, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0, candidateBodyStderrBytes: 0, certificateSha256: sha, preSignExecutableSha256: sha, preSignPayloadInventorySha256: sha, signedBundleInventorySha256: sha, postSignExecutableSha256: sha, entitlementsSha256: sha, designatedRequirementSha256: sha, signatureStrictValidated: true, runtimeIdentityValidated: true, networkSampleZero: true, defaultKeychainMetadataEqual: true, searchListMetadataEqual: true, customTemporaryKeychainOperations: 12, securityLifecycleSubcommands: 10, identityInventoryReads: 1, signingPrivateKeyUses: 1, defaultKeychainMetadataReads: 2, searchListMetadataReads: 2, securityCliInvocations: 15, codesignCliInvocations: 5, opensslCliInvocations: 2 };
  const evidence = { schemaVersion: "r4_gate_b_physical_retry_evidence.v1", terminalStatus: "COMPLETED_YELLOW", reasonCode: "CLEAN_ZERO_PROVIDER_RETRY", manifestSha256: sha, executionGrantSha256: sha, hostBindingId: "b".repeat(32), hostBindingCapsuleSha256: sha, implementationHead: "c".repeat(40), implementationTree: "d".repeat(40), publicationHead: "e".repeat(40), publicationTree: "f".repeat(40), laneOrder: ["postgres", "codex", "macos", "cleanup", "evidence", "stop"], postgres, codex, macos, journalAggregateSha256: sha, cleanupStatus: "GREEN", firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: "YELLOW" };
  assert.equal(validate(evidence), true, JSON.stringify(validate.errors));
  const unknown = { ...evidence, terminalStatus: "TERMINAL_YELLOW", reasonCode: "MACOS_HELPER_RECEIPT_UNOBSERVED", macos: { ...macos, status: "YELLOW", reasonCode: "HELPER_RECEIPT_UNOBSERVED", helperReceiptSha256: null, helperReceiptValidated: false, helperReasonCode: null, terminal: null, presenceCeremonies: null, presenceCeremoniesObserved: false, handoffCount: null, handoffCountObserved: false, helperControlledZeroizationPassed: null, helperCleanupPassed: null } };
  assert.equal(validate(unknown), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...evidence, macos: { ...unknown.macos, status: "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY" } }), false);
  const candidateDrift = { ...evidence, terminalStatus: "TERMINAL_RED", reasonCode: "MACOS_CANDIDATE_BINDING_DRIFT", aggregateVerdict: "RED", macos: { ...macos, status: "RED", reasonCode: "MACOS_CANDIDATE_BINDING_DRIFT", helperReasonCode: "candidate_binding_drift", terminal: "controlled_failure", handoffCount: 0 } };
  assert.equal(validate(candidateDrift), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...candidateDrift, terminalStatus: "TERMINAL_YELLOW", aggregateVerdict: "YELLOW" }), false);
});
