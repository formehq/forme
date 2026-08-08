import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  cleanupConstruction,
  constructPhysicalAdapters,
  parsePhysicalRunnerArguments,
  verifyPhaseAAuthority,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-physical-runner.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("successor runner accepts only five frozen argument shapes", () => {
  assert.deepEqual(parsePhysicalRunnerArguments(["construct-physical-adapters"]), { mode: "construct-physical-adapters" });
  assert.deepEqual(parsePhysicalRunnerArguments(["finalize-host-binding"]), { mode: "finalize-host-binding" });
  assert.deepEqual(parsePhysicalRunnerArguments(["cleanup-construction", "--construction-packet-sha", "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06"]), { mode: "cleanup-construction", constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06" });
  const hash = `sha256:${"a".repeat(64)}`;
  assert.deepEqual(parsePhysicalRunnerArguments(["execute-core-retry", "--manifest-sha", hash, "--execution-grant", hash, "--host-binding-id", "b".repeat(32)]), { mode: "execute-core-retry", manifestSha256: hash, executionGrantSha256: hash, hostBindingId: "b".repeat(32) });
  for (const argv of [[], ["--help"], ["construct-physical-adapters", "extra"], ["execute-core-retry"], ["execute-core-retry", "--manifest-sha", hash, "--execution-grant", `sha256:${"b".repeat(64)}`, "--host-binding-id", "b".repeat(32)]]) assert.throws(() => parsePhysicalRunnerArguments(argv), /PHYSICAL_RUNNER_ARGUMENTS_DENIED/u);
});

test("Phase A authority binds approval bytes, proposal ancestry, immutable roots and exact workset", () => {
  const result = verifyPhaseAAuthority();
  assert.equal(result.packetSha256, "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06");
  assert.equal(result.proposalAncestor, true);
  assert.ok(result.changedPaths.every((entry: string) => !entry.startsWith(".forme/")));
});

test("Construction mode runs only deterministic fake adapters, never reads Host Binding input, and cleans", async () => {
  cleanupConstruction();
  const result = await constructPhysicalAdapters();
  assert.equal(result.status, "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN");
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.hostBindingInputRead, false);
  assert.equal(result.result.deterministicStressRuns, 3);
  assert.equal(result.result.expectedCoreCalls, 68);
  assert.equal(result.retryExecutionGrant, "NOT_REQUESTED");
  assert.equal(result.firstProviderCallGrant, "NOT_REQUESTED");
  assert.equal(fs.existsSync(path.join(root, ".forme/gate-b-physical-construction/79b7775defbdaf043697ef9b6d0ab45c")), false);
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
  const postgres = { status: "POSTGRES_CORE_LANE_GREEN", namedFamilies: 13, executableCases: 16, orderedExecutions: 32, coreCalls: 68, successful2xx: 39, controlledNon2xx: 29, newReceipts: 37, persistedVerifiers: 32, readinessAttempts: 1, rollbackPassed: true, reapplyPassed: true, cleanupStatus: "GREEN" };
  const codex = { status: "CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN", reportedVersion: "codex-cli 0.145.0", schemaFileCount: 273, schemaAggregateSha256: "sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62", processStartSlotsConsumed: 4, processGroupsStarted: 4, clientWrites: 2, serverResponses: 1, serverRequests: 0, serverNotifications: 0, receiveBufferEmptyBeforeSecondWrite: true, preSecondWriteViolationObserved: false, postSecondWriteViolationObserved: false, allStartedGroupsReaped: true, allStartedGroupsAbsent: true, exitCodes: [0, 0, 0, 0], stderrBytes: 0, schemaStdoutBytes: 0, threadStarts: 0, turnStarts: 0, providerCalls: 0, providerBytes: 0, networkAuthority: 0, networkTransmittedBytes: 0, networkSyscallAttemptAbsenceClaimed: false, causalFinality: "UNPROVEN_ACCEPTED", postResponseFinalityProven: false, aiLaneEnabled: false, cleanupStatus: "GREEN" };
  const macos = { status: "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY", helperReceiptSha256: sha, helperReceiptValidated: true, terminal: "approve_exact", presenceCeremonies: 1, presenceCeremoniesObserved: true, handoffCount: 1, handoffCountObserved: true, helperControlledZeroizationPassed: true, helperCleanupPassed: true, outerCleanupPassed: true, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0, candidateBodyStderrBytes: 0, certificateSha256: sha, preSignPayloadInventorySha256: sha, signedBundleInventorySha256: sha, postSignExecutableSha256: sha, securityCliInvocations: 15, codesignCliInvocations: 5, opensslCliInvocations: 2 };
  const evidence = { schemaVersion: "r4_gate_b_physical_retry_evidence.v1", manifestSha256: sha, executionGrantSha256: sha, hostBindingId: "b".repeat(32), hostBindingCapsuleSha256: sha, implementationHead: "c".repeat(40), implementationTree: "d".repeat(40), laneOrder: ["postgres", "codex", "macos", "cleanup", "evidence", "stop"], postgres, codex, macos, journalAggregateSha256: sha, cleanupStatus: "GREEN", firstProviderCallGrant: "NOT_REQUESTED", aggregateVerdict: "YELLOW" };
  assert.equal(validate(evidence), true, JSON.stringify(validate.errors));
  const unknown = { ...evidence, macos: { ...macos, status: "YELLOW", helperReceiptSha256: null, helperReceiptValidated: false, terminal: null, presenceCeremonies: null, presenceCeremoniesObserved: false, handoffCount: null, handoffCountObserved: false, helperControlledZeroizationPassed: null, helperCleanupPassed: null } };
  assert.equal(validate(unknown), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...evidence, macos: { ...unknown.macos, status: "GREEN_TRANSIENT_MACOS_MECHANISM_ONLY" } }), false);
});
