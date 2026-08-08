import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { CORE_POSTGRES_PHYSICAL, buildCorePostgresExecutionPlan, buildCorePostgresStdin, executeCorePostgresPlanWithInjectedExecutor, validateCorePostgresImageObservation, validateCorePostgresRaceObservation, validateCorePostgresReadinessObservation } from "../../scripts/r4-gate-b-core-postgres.mjs";

function fakeObservation(kind: string) {
  if (kind === "docker-image-inspect") return { ociIndex: CORE_POSTGRES_PHYSICAL.ociIndex, resolvedManifest: CORE_POSTGRES_PHYSICAL.arm64Manifest, platform: "linux/arm64", architecture: "arm64", operatingSystem: "linux", localOnly: true };
  if (kind === "postgres-readiness") return { ready: true, attempts: 2, lastExitCode: 0, stderrBytes: 0 };
  if (kind === "race-workers") return { scenarioCount: 13, releaseOrderCount: 2, executionCount: 26, actualCoreFunctionCalls: 52, persistentStateVerifications: 26, controlledResults: 52, workerGroupsReaped: true, survivingProcessGroups: 0 };
  return undefined;
}

test("closed PostgreSQL plan pins image, platform, network, ports and stdin SQL", () => {
  const plan = buildCorePostgresExecutionPlan();
  assert.equal(plan.physical.image, CORE_POSTGRES_PHYSICAL.image);
  assert.match(plan.physical.image, /^postgres@sha256:[0-9a-f]{64}$/u);
  assert.equal(plan.physical.platform, "linux/arm64");
  assert.equal(plan.physical.network, "none");
  assert.equal(plan.physical.hostPorts, 0);
  assert.equal(plan.markerIntentBeforeFirstEffect, true);
  assert.equal(plan.steps[0]?.kind, "marker-intent");
  for (const step of plan.steps) {
    if (step.kind === "race-workers") {
      assert.equal(step.processGroupCount, 3);
      assert.equal(step.scenarioCount, 13);
      assert.equal(step.reapBeforeReturn, true);
      assert.deepEqual(step.workers.map((worker: { actor: string }) => worker.actor), ["a", "b"]);
      for (const worker of step.workers) {
        assert.deepEqual(worker.argv.slice(-7), ["-X", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", "forme_r4_gate_b"]);
        assert.match(worker.stdinComposer, /^closed-race-worker-[ab]-v1$/u);
      }
      continue;
    }
    if (!("argv" in step)) continue;
    assert.equal(step.cwd.endsWith("/forme"), true);
    assert.deepEqual(step.environment, {});
    assert.ok(!step.argv.includes("postgres:16.10-bookworm"));
    if (step.kind === "psql-stdin") {
      assert.deepEqual(step.argv.slice(-7), ["-X", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", "forme_r4_gate_b"]);
      assert.ok(!step.argv.some((value: string) => value.includes("CREATE ") || value.includes("SELECT ")));
      assert.equal(typeof step.stdinKey, "string");
      assert.match(step.stdin.sourceSha256, /^sha256:[0-9a-f]{64}$/u);
    }
  }
  const readiness = plan.steps.find((step: { kind: string }) => step.kind === "postgres-readiness");
  assert.equal(readiness.maximumAttempts, 30);
  assert.equal(readiness.intervalMilliseconds, 250);
});

test("stdin composer binds all six lineage values and installs basis only through the migrate-only function", () => {
  const manifestHash = `sha256:${"9".repeat(64)}`;
  const migration = buildCorePostgresStdin("migration", manifestHash);
  for (const key of ["technical_packet_sha", "scope_brief_sha", "construction_packet_sha", "core_basis_sha", "execution_manifest_sha", "migration_sha"]) assert.match(migration, new RegExp(`\\\\set ${key} 'sha256:[0-9a-f]{64}'`, "u"));
  const basis = buildCorePostgresStdin("basis", manifestHash);
  assert.match(basis, /SET ROLE forme_r4_migrate/u);
  assert.match(basis, /tx_gate_b_core_basis_install/u);
  assert.doesNotMatch(basis, /INSERT\s+INTO/iu);
  assert.match(buildCorePostgresStdin("basisErrors", manifestHash), /basis_null_context_not_closed/u);
  assert.throws(() => buildCorePostgresStdin("migration", "unbound"), /POSTGRES_EXECUTION_MANIFEST_HASH_INVALID/u);
});

test("stdin composer accepts only pinned string/byte runtime sources", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const reads: string[] = [];
  const readRuntimeFile = (relativePath: string) => {
    reads.push(relativePath);
    return fs.readFileSync(path.join(root, relativePath));
  };
  const manifestHash = `sha256:${"9".repeat(64)}`;
  assert.equal(buildCorePostgresStdin("migration", manifestHash, readRuntimeFile), buildCorePostgresStdin("migration", manifestHash));
  assert.ok(reads.includes("schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql"));
  assert.match(buildCorePostgresStdin("basis", manifestHash, readRuntimeFile), /tx_gate_b_core_basis_install/u);
  assert.throws(() => buildCorePostgresStdin("migration", manifestHash, (() => 1) as never), /POSTGRES_RUNTIME_BYTES_INVALID/u);
});

test("physical observation validators reject manifest, readiness and race drift", () => {
  assert.equal(validateCorePostgresImageObservation(fakeObservation("docker-image-inspect")).resolvedManifest, CORE_POSTGRES_PHYSICAL.arm64Manifest);
  assert.throws(() => validateCorePostgresImageObservation({ ...fakeObservation("docker-image-inspect"), resolvedManifest: `sha256:${"0".repeat(64)}` }), /POSTGRES_IMAGE_MANIFEST_DRIFT/u);
  assert.equal(validateCorePostgresReadinessObservation(fakeObservation("postgres-readiness")).ready, true);
  assert.throws(() => validateCorePostgresReadinessObservation({ ...fakeObservation("postgres-readiness"), attempts: 31 }), /POSTGRES_READINESS_FAILED/u);
  assert.equal(validateCorePostgresRaceObservation(fakeObservation("race-workers")).executionCount, 26);
  assert.throws(() => validateCorePostgresRaceObservation({ ...fakeObservation("race-workers"), persistentStateVerifications: 25 }), /POSTGRES_RACE_OBSERVATION_FAILED/u);
});

test("injected fake executor observes the exact plan with zero real effects", async () => {
  const observed: string[] = [];
  let cleanupCount = 0;
  const result = await executeCorePostgresPlanWithInjectedExecutor({
    async execute(step: { kind: string }) { observed.push(step.kind); return fakeObservation(step.kind); },
    async cleanup() { cleanupCount += 1; },
  });
  assert.deepEqual(observed, buildCorePostgresExecutionPlan().steps.map((step: { kind: string }) => step.kind));
  assert.equal(cleanupCount, 1);
  assert.equal(result.realEffects, 0);
});

test("every injected marker/effect fault still invokes idempotent fake cleanup", async () => {
  const stepCount = buildCorePostgresExecutionPlan().steps.length;
  for (const faultWindow of ["before", "after"] as const) {
    for (let faultAfter = 0; faultAfter < stepCount; faultAfter += 1) {
      let cleanupCount = 0;
      let activeRaceWorkers = 0;
      await assert.rejects(executeCorePostgresPlanWithInjectedExecutor({
        async execute(step: { kind: string }) { if (step.kind === "race-workers") activeRaceWorkers = 2; return fakeObservation(step.kind); },
        async checkpoint(step: { completedKind: string }) { if (step.completedKind === "race-workers") activeRaceWorkers = 0; },
        async cleanup() { activeRaceWorkers = 0; cleanupCount += 1; },
      }, { faultAfter, faultWindow }), /POSTGRES_INJECTED_FAULT/u);
      assert.equal(cleanupCount, 1);
      assert.equal(activeRaceWorkers, 0);
    }
  }
});

test("plan and executor reject arbitrary construction inputs", async () => {
  assert.equal(buildCorePostgresExecutionPlan.length, 0);
  await assert.rejects(executeCorePostgresPlanWithInjectedExecutor(null), /POSTGRES_EXECUTOR_INVALID/u);
  await assert.rejects(executeCorePostgresPlanWithInjectedExecutor({ execute() {}, shell: "/bin/sh" }), /POSTGRES_EXECUTOR_INVALID/u);
  await assert.rejects(executeCorePostgresPlanWithInjectedExecutor({ execute() {} }, { faultAfter: -1 }), /POSTGRES_FAULT_INDEX_INVALID/u);
  await assert.rejects(executeCorePostgresPlanWithInjectedExecutor({ execute() {} }, { faultWindow: "middle" }), /POSTGRES_FAULT_WINDOW_INVALID/u);
});
