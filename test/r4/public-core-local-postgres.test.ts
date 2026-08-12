import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LOCAL_POSTGRES_DOCKER_COMMAND_KINDS,
  LOCAL_POSTGRES_PHASE1_AUTHORITY,
  LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES,
  LOCAL_POSTGRES_STAGE_A_PATHS,
  LocalPostgresRunnerError,
  buildLocalPostgresDockerPlan,
  createLocalPostgresPendingGrant,
  deriveLocalPostgresResourceNames,
  parseLocalPostgresRunnerArguments,
  runApprovedLocalPostgresPhysical,
  runLocalPostgresFakePlan,
  validateLocalPostgresGrant,
// The approved runner is an executable .mjs artifact; its runtime exports are
// contract-tested here without adding an out-of-workset declaration file.
// @ts-expect-error -- intentionally no ambient declaration for the CLI artifact.
} from "../../scripts/r4-public-core-local-postgres.mjs";

const SHA = `sha256:${"a".repeat(64)}`;
const GIT = "b".repeat(40);
const NOW = "2026-08-11T18:00:00.000Z";

function grant(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v2",
    grantId: "0123456789abcdef0123456789abcdef",
    ownerApprovalSha256: SHA,
    addendumSha256: LOCAL_POSTGRES_PHASE1_AUTHORITY.addendumSha256,
    addendumReviewSha256: LOCAL_POSTGRES_PHASE1_AUTHORITY.addendumReviewSha256,
    addendumWrapperHead: LOCAL_POSTGRES_PHASE1_AUTHORITY.addendumWrapperHead,
    addendumWrapperTree: LOCAL_POSTGRES_PHASE1_AUTHORITY.addendumWrapperTree,
    physicalRebindPacketSha256: SHA,
    physicalRebindReviewSha256: SHA,
    physicalRebindBaselineHead: GIT,
    physicalRebindBaselineTree: GIT,
    physicalRebindWrapperHead: GIT,
    physicalRebindWrapperTree: GIT,
    stageAHead: GIT,
    stageATree: GIT,
    stageAArtifactAggregateSha256: SHA,
    packageLockSha256: LOCAL_POSTGRES_PHASE1_AUTHORITY.packageLockSha256,
    runnerSha256: SHA,
    schemaSqlSha256: `sha256:${"c".repeat(64)}`,
    verifySqlSha256: `sha256:${"d".repeat(64)}`,
    rollbackSqlSha256: `sha256:${"e".repeat(64)}`,
    socketIdentitySha256: SHA,
    imageReference: LOCAL_POSTGRES_PHASE1_AUTHORITY.imageReference,
    maximumPhysicalAttempts: 1,
    maximumDockerLifecycles: 3,
    localOnly: true,
    productionEffectsAllowed: false,
    createdAt: "2026-08-11T17:00:00.000Z",
    expiresAt: "2026-08-11T19:00:00.000Z",
    ...overrides,
  });
}

async function privateRoot(): Promise<string> {
  const value = await mkdtemp(path.join(os.tmpdir(), "forme-r4-local-pg-test-"));
  await chmod(value, 0o700);
  return value;
}

test("Addendum B runner freezes 17 offline artifacts and no Phase-1 physical effect", () => {
  assert.equal(LOCAL_POSTGRES_STAGE_A_PATHS.length, 17);
  assert.deepEqual(
    [...LOCAL_POSTGRES_STAGE_A_PATHS].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))),
    [...LOCAL_POSTGRES_STAGE_A_PATHS],
  );
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.tables, 14);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.columns, 207);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.constraints, 172);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.indexes, 44);
  assert.match(LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureFileCount, 145);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.phase1DockerCalls, 0);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.phase1PostgresConnections, 0);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindRequired, true);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.trafficReady, false);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.gateCReady, false);
});

test("future physical engine is fully constructed but ordinary test entry remains fake-only", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  assert.equal(source.includes("local_postgres_physical_engine_not_frozen"), false);
  assert.match(source, /if \(parsed\.mode === "fake"\)/u);
  assert.match(source, /consumeLocalPostgresGrant/u);
  assert.match(source, /performNormalPhysicalRun/u);
  assert.match(source, /cleanupOwnedDocker/u);
  assert.equal((source.match(/spawnSync\(DOCKER_CLI/gu) ?? []).length, 1);
  assert.equal((source.match(/fs\.linkSync\(/gu) ?? []).length, 1, "only one-use grant consumption may hardlink");
  assert.equal(source.includes("coordinator.active.json"), false);
  assert.equal(source.includes("coordinator.claim.json"), false);
  assert.equal(source.includes("process.kill("), false, "PID-only liveness cannot authorize takeover");
  assert.match(source, /\/proc\/sys\/kernel\/random\/boot_id/u);
  assert.match(source, /physical-evidence-draft-p/u);
  for (const denied of ["container\", \"run", "container\", \"exec", "image\", \"build", "system\", \"prune"]) {
    assert.equal(source.includes(denied), false);
  }
});

test("grant membrane is exact, rejects obsolete SQL and snapshots hostile input", () => {
  const accepted = validateLocalPostgresGrant(grant(), new Date(NOW));
  assert.equal(accepted.grantId, "0123456789abcdef0123456789abcdef");
  assert.throws(
    () => validateLocalPostgresGrant(grant({ unexpected: true }), new Date(NOW)),
    (error: unknown) => error instanceof LocalPostgresRunnerError && (error as Error).message === "local_postgres_input_invalid",
  );
  assert.throws(
    () => validateLocalPostgresGrant(grant({
      schemaSqlSha256: "sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2",
    }), new Date(NOW)),
    (error: unknown) => error instanceof LocalPostgresRunnerError && (error as Error).message === "local_postgres_obsolete_sql_grant",
  );
  const canary = "PRIVATE_GRANT_GETTER_CANARY";
  const hostile = new Proxy(grant(), { ownKeys() { throw new Error(canary); } });
  assert.throws(
    () => validateLocalPostgresGrant(hostile, new Date(NOW)),
    (error: unknown) => error instanceof LocalPostgresRunnerError
      && (error as Error).message === "local_postgres_input_invalid"
      && !JSON.stringify(error).includes(canary),
  );
});

test("pending grant is private, one-use shaped, and contains no secret material", async (t) => {
  const root = await privateRoot();
  t.after(async () => rm(root, { recursive: true, force: true }));
  const observedAt = Date.now();
  const currentGrant = grant({
    createdAt: new Date(observedAt - 60_000).toISOString(),
    expiresAt: new Date(observedAt + 60_000).toISOString(),
  });
  const receipt = createLocalPostgresPendingGrant({ privateRoot: root, grant: currentGrant });
  assert.match(receipt.pendingGrantSha256, /^sha256:[0-9a-f]{64}$/u);
  const bytes = await readFile(path.join(root, "grant.pending.json"), "utf8");
  assert.equal(bytes.includes("password"), false);
  assert.equal(bytes.includes("dsn"), false);
  assert.throws(
    () => createLocalPostgresPendingGrant({ privateRoot: root, grant: currentGrant }),
    (error: unknown) => error instanceof LocalPostgresRunnerError && (error as Error).message === "local_postgres_grant_already_exists",
  );
});

test("Docker plan is a closed exact-name surface with loopback-only random publication", () => {
  const grantId = "0123456789abcdef0123456789abcdef";
  const resources = deriveLocalPostgresResourceNames(grantId);
  const plan = buildLocalPostgresDockerPlan({ grantId, secretMountSource: "/private/run/password" });
  assert.equal(plan.resources.container, resources.container);
  assert.equal(plan.resources.labelValue, grantId);
  for (const step of plan.steps as readonly Readonly<{ kind: string; argv: readonly string[] }>[]) {
    assert.ok(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(step.kind as never));
    const text = step.argv.join(" ");
    for (const forbidden of [" run ", " exec ", " logs ", " login ", " context ", " prune "]) {
      assert.equal(` ${text} `.includes(forbidden), false);
    }
  }
  const create = (plan.steps as readonly Readonly<{ kind: string; argv: readonly string[] }>[])
    .find((step) => step.kind === "container.create");
  assert.ok(create);
  assert.ok(create.argv.includes("127.0.0.1::5432"));
  assert.equal(create.argv.some((value) => value.startsWith("POSTGRES_PASSWORD=")), false);
  assert.ok(create.argv.some((value) => value === "POSTGRES_PASSWORD_FILE=/run/secrets/forme-r4-postgres-password"));
  assert.throws(
    () => buildLocalPostgresDockerPlan({ grantId, secretMountSource: "/private/run/password,ro" }),
    LocalPostgresRunnerError,
  );
});

test("fake-only shared coordinator runs the exact terminal flow with zero physical or local residue", async () => {
  const green = await runLocalPostgresFakePlan();
  assert.equal(green.schemaVersion, "r4.public-core-local-postgres-fake-result.v3");
  assert.equal(green.status, "GREEN");
  assert.equal(green.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(green.actionCount, 20);
  assert.equal(JSON.stringify(green.catalog), JSON.stringify({ columns: 207, constraints: 172, indexes: 44, tables: 14 }));
  assert.equal(green.databaseIdentityCount, 2);
  assert.equal(green.restartCount, 1);
  assert.equal(green.residueCount, 0);
  assert.deepEqual(green.transientLocalResidues, []);
  assert.equal(green.openSyntheticPoolCount, 0);
  assert.equal(green.openSyntheticGraphCount, 0);
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.syntheticPortCalls.pgDriverResolved, true);
  assert.equal(green.receipt.coordinatorLeaseReleased, true);
  assert.equal(green.receipt.coordinatorResidueScope, "finalizing_owner_only");
  assert.match(green.receipt.coordinatorLeaseOwnerNonce, /^[0-9a-f]{64}$/u);
  assert.match(green.receipt.coordinatorOwnerProcessStartIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.ok(Number.isSafeInteger(green.receipt.coordinatorOwnerPid));
  assert.equal(green.receipt.ownedCoordinatorResidueCount, 0);
  assert.equal(green.receipt.pgImportClosureSha256, LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureSha256);
  assert.equal(green.realApplicationGraphCompositions, 2);
  assert.equal(green.realApplicationGraphClosures, 2);
  assert.equal(green.realApplicationGraphCanaryConnects, 2);
  assert.equal(green.realApplicationGraphErrorCanaries, 2);
  assert.equal(green.retainedRealApplicationGraphCount, 0);
});

test("every shared lifecycle before/after fault closes handles and proves zero residue", async (t) => {
  for (const faultAt of LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES) {
    for (const faultEdge of ["before", "after"] as const) {
      await t.test(`${faultAt}:${faultEdge}`, async () => {
        const failed = await runLocalPostgresFakePlan({ faultAt, faultEdge, recoverCleanup: true });
        assert.equal(failed.physicalEffects, 0);
        assert.equal(failed.residueCount, 0);
        assert.deepEqual(failed.transientLocalResidues, []);
        assert.equal(failed.openSyntheticPoolCount, 0);
        assert.equal(failed.openSyntheticGraphCount, 0);
        assert.equal(JSON.stringify(failed).includes("PRIVATE_"), false);
        assert.equal(failed.requestedFault, `${faultAt}:${faultEdge}#1`);
        assert.equal(failed.faultInjected, true);
        assert.equal(failed.faultInjectionCount, 1);
        assert.equal(failed.faultInjectionOccurrence, 1);
        assert.equal(failed.requestedCheckpointOccurrenceCount, 1);
        assert.ok(failed.checkpoints.includes(`${faultAt}:${faultEdge}`));
        assert.equal(failed.firstFailureCode === null, false);
        assert.equal(failed.recoveryAttempted, true);
        assert.ok(["FAILED", "CLEANUP_RECOVERED", "GREEN"].includes(failed.status));
      });
    }
  }
});

test("grant, journal, cleanup, lease, and evidence crash edges recover through the same coordinator", async (t) => {
  const cases = [
    { faultAt: "lease.candidate.install", faultEdge: "after" },
    { faultAt: "grant.consume.link", faultEdge: "after" },
    { faultAt: "grant.consume.unlink_pending", faultEdge: "after" },
    { faultAt: "journal.entry.install", faultEdge: "before" },
    { faultAt: "journal.entry.install", faultEdge: "after" },
    { faultAt: "cleanup.container.rm", faultEdge: "after" },
    { faultAt: "cleanup.network.rm", faultEdge: "after" },
    { faultAt: "cleanup.volume.rm", faultEdge: "after" },
    { faultAt: "evidence.provisional.install", faultEdge: "after" },
    { faultAt: "lease.release", faultEdge: "before" },
    { faultAt: "lease.release", faultEdge: "after" },
    { faultAt: "evidence.publish", faultEdge: "before" },
  ] as const;
  for (const fault of cases) {
    await t.test(`${fault.faultAt}:${fault.faultEdge}`, async () => {
      const result = await runLocalPostgresFakePlan({ ...fault, recoverCleanup: true });
      assert.equal(result.physicalEffects, 0);
      assert.equal(result.residueCount, 0);
      assert.deepEqual(result.transientLocalResidues, []);
      assert.equal(result.openSyntheticPoolCount, 0);
      assert.equal(result.openSyntheticGraphCount, 0);
      assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);
      assert.equal(result.requestedFault, `${fault.faultAt}:${fault.faultEdge}#1`);
      assert.equal(result.faultInjected, true);
      assert.equal(result.faultInjectionCount, 1);
      assert.equal(result.faultInjectionOccurrence, 1);
      assert.ok(result.requestedCheckpointOccurrenceCount >= 1);
      assert.ok(result.checkpoints.includes(`${fault.faultAt}:${fault.faultEdge}`));
      assert.equal(result.firstFailureCode === null, false);
      assert.equal(result.recoveryAttempted, true);
    });
  }
});

test("same-root contender fails closed while the unique live lease owns the coordinator", async () => {
  const result = await runLocalPostgresFakePlan({ sameRootConcurrency: true });
  assert.equal(result.status, "GREEN");
  assert.equal(result.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.deepEqual(result.sameRootContenderCheckpoints, ["lease.acquire.precheck:after"]);
  assert.equal(result.residueCount, 0);
  assert.deepEqual(result.transientLocalResidues, []);
  assert.equal(result.openSyntheticPoolCount, 0);
  assert.equal(result.openSyntheticGraphCount, 0);
  assert.equal(result.realApplicationGraphCompositions, 2);
  assert.equal(result.realApplicationGraphClosures, 2);

  const finalization = await runLocalPostgresFakePlan({ sameRootFinalizationConcurrency: true });
  assert.equal(finalization.status, "GREEN");
  assert.equal(finalization.finalizationContenderObservedCandidate, true);
  assert.equal(finalization.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.deepEqual(finalization.sameRootContenderCheckpoints, []);
  assert.equal(finalization.residueCount, 0);
  assert.deepEqual(finalization.transientLocalResidues, []);

  const doorway = await runLocalPostgresFakePlan({ reentrantDoorway: true });
  assert.equal(doorway.status, "GREEN");
  assert.equal(doorway.reentrantDoorwayObserved, true);
  assert.equal(doorway.reentrantTerminalReadMatched, true);
  assert.equal(doorway.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.ok(doorway.sameRootContenderCheckpoints.includes("lease.acquire.prior_clear:after"));
  assert.ok(doorway.sameRootContenderCheckpoints.includes("lease.acquire.published:after"));
  assert.equal(doorway.residueCount, 0);
  assert.deepEqual(doorway.transientLocalResidues, []);

  const caughtLease = await runLocalPostgresFakePlan({
    faultAt: "lease.acquire.published",
    faultEdge: "after",
  });
  assert.equal(caughtLease.faultInjected, true);
  assert.equal(caughtLease.residueCount, 0);
  assert.deepEqual(caughtLease.transientLocalResidues, []);

  const caughtDraft = await runLocalPostgresFakePlan({
    faultAt: "evidence.provisional.install",
    faultEdge: "before",
  });
  assert.equal(caughtDraft.faultInjected, true);
  assert.equal(caughtDraft.residueCount, 0);
  assert.deepEqual(caughtDraft.transientLocalResidues, []);
});

test("terminal evidence repeats idempotently and two dead-owner recoverers converge on one receipt", async () => {
  const repeated = await runLocalPostgresFakePlan({ repeatTerminalEntry: true });
  assert.equal(repeated.status, "GREEN");
  assert.equal(repeated.repeatReceiptMatches, true);
  assert.equal(repeated.syntheticPortCalls.socket, 1);
  assert.equal(repeated.residueCount, 0);

  const recovered = await runLocalPostgresFakePlan({ concurrentRecovery: true });
  assert.equal(recovered.status, "GREEN");
  assert.equal(recovered.firstFailureCode, "local_postgres_fake_injected_fault");
  assert.equal(recovered.faultInjectionCount, 1);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.syntheticPortCalls.socket, 1);
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("FAILED BLOCKED evidence is replaced by one cleanup-recovered terminal receipt", async () => {
  const recovered = await runLocalPostgresFakePlan({
    faultAt: "cleanup.container.rm",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.match(recovered.recoveryReceipt.priorEvidenceSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("two dead-owner recoverers converge while replacing FAILED BLOCKED evidence", async () => {
  const recovered = await runLocalPostgresFakePlan({ concurrentReplacementRecovery: true });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.faultInjectionCount, 1);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.concurrentReplacementStagingFaultInjected, true);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.recoveryFailureCode, null);
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.match(recovered.recoveryReceipt.priorEvidenceSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:before",
  ).length, 3);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:after",
  ).length, 1);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("stale FAILED BLOCKED snapshot reconciles the concurrent terminal replacement winner", async () => {
  const recovered = await runLocalPostgresFakePlan({ upstreamSnapshotReplacementRecovery: true });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.concurrentReplacementStagingFaultInjected, true);
  assert.equal(recovered.upstreamSnapshotReconcileObserved, true);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.recoveryFailureCode, null);
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.recovery.snapshot:after",
  ).length, 3);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:after",
  ).length, 1);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("faultOccurrence selects an exact repeated journal and graph-close checkpoint", async () => {
  const journal = await runLocalPostgresFakePlan({
    faultAt: "journal.entry.install",
    faultEdge: "after",
    faultOccurrence: 3,
    recoverCleanup: true,
  });
  assert.equal(journal.faultInjectionCount, 1);
  assert.equal(journal.faultInjectionOccurrence, 3);
  assert.ok(journal.requestedCheckpointOccurrenceCount >= 3);
  assert.equal(journal.firstFailureCode === null, false);
  assert.equal(journal.residueCount, 0);

  const graph = await runLocalPostgresFakePlan({
    faultAt: "application_graph.close",
    faultEdge: "before",
    faultOccurrence: 2,
    recoverCleanup: true,
  });
  assert.equal(graph.faultInjectionCount, 1);
  assert.equal(graph.faultInjectionOccurrence, 2);
  assert.ok(graph.requestedCheckpointOccurrenceCount >= 2);
  assert.equal(graph.firstFailureCode === null, false);
  assert.equal(graph.openSyntheticGraphCount, 0);
  assert.equal(graph.openSyntheticPoolCount, 0);
  assert.equal(graph.residueCount, 0);
});

test("durable cleanup proof bypasses socket resolution and graph cleanup retries after one injected close fault", async () => {
  const cleanupProof = await runLocalPostgresFakePlan({
    faultAt: "evidence.provisional.install",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(cleanupProof.faultInjected, true);
  assert.equal(cleanupProof.recoveryAttempted, true);
  assert.equal(cleanupProof.syntheticPortCalls.socket, 1);
  assert.equal(cleanupProof.recoveryCheckpoints.includes("socket.resolved:after"), false);
  assert.equal(cleanupProof.residueCount, 0);

  const retriedClose = await runLocalPostgresFakePlan({
    faultAt: "application_graph.close",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(retriedClose.faultInjected, true);
  assert.ok(retriedClose.checkpoints.filter((value: string) => value === "application_graph.close:before").length >= 2);
  assert.equal(retriedClose.openSyntheticGraphCount, 0);
  assert.equal(retriedClose.openSyntheticPoolCount, 0);
  assert.equal(retriedClose.residueCount, 0);
});

test("ordinary argument and invalid physical entry preserve preexisting private bytes and make no daemon receipt", async (t) => {
  assert.deepEqual(parseLocalPostgresRunnerArguments(["fake"]), { mode: "fake" });
  assert.throws(() => parseLocalPostgresRunnerArguments(["physical"]), LocalPostgresRunnerError);
  const root = await privateRoot();
  t.after(async () => rm(root, { recursive: true, force: true }));
  const evidence = path.join(root, "physical-evidence.json");
  const sentinel = path.join(root, "postgres-password");
  await writeFile(sentinel, "OWNER_SENTINEL", { mode: 0o600, flag: "wx" });
  await assert.rejects(
    runApprovedLocalPostgresPhysical({ grantRoot: root, evidenceOut: evidence }),
    (error: unknown) => error instanceof LocalPostgresRunnerError
      && (error as Error).message === "local_postgres_grant_state_invalid"
      && !JSON.stringify(error).includes(root),
  );
  assert.equal(await readFile(sentinel, "utf8"), "OWNER_SENTINEL");
  await assert.rejects(readFile(evidence, "utf8"), /ENOENT/u);
  assert.equal((await stat(sentinel)).mode & 0o777, 0o600);
});
