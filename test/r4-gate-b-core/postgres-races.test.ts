import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  buildPostgresPhysicalPlan,
  composeRaceArtifacts,
  loadRaceCatalog,
  orchestrateConstructionFakeLanes,
  raceByteIndex,
  runConstructionFakeMatrix,
  validateRaceCatalog,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-physical-port.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("race catalog freezes 13 families as 16 cases, 32 orders and exact 68/39/29/37", () => {
  const catalog = loadRaceCatalog();
  assert.equal(catalog.cases.length, 16);
  assert.equal(catalog.orders.length, 32);
  assert.deepEqual(catalog.counts, { namedFamilies: 13, executableCases: 16, orderedExecutions: 32, concurrentCoreCalls: 64, recoveryCoreCalls: 4, expectedCoreCalls: 68, expected2xx: 39, expectedControlledNon2xx: 29, expectedNewReceipts: 37, persistedVerifiers: 32 });
  assert.equal(catalog.cases.find((entry: { id: string }) => entry.id === "C16")?.aFunction, "tx_public_encounter_issue");
  assert.equal(catalog.orders.find((entry: { id: string }) => entry.id === "C13-A-B")?.semanticEffectCount, 2);
  assert.throws(() => validateRaceCatalog({ ...catalog, counts: { ...catalog.counts, expectedCoreCalls: 69 } }), /RACE_CATALOG_COUNTS/u);
});

test("tracked race byte index is a bijection with deterministic composers and four C09 recoveries", () => {
  const actual = raceByteIndex();
  const tracked = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/postgres/race-byte-index.json"), "utf8"));
  assert.equal(canonicalJson(actual), canonicalJson(tracked));
  assert.equal(actual.entries.length, 32);
  assert.equal(actual.recovery.length, 4);
  assert.equal(new Set(actual.entries.flatMap((entry: Record<string, string>) => [entry.setupSha256, entry.workerASha256, entry.workerBSha256, entry.controllerSha256, entry.verifierSha256])).size, 160);
  const artifacts = composeRaceArtifacts();
  assert.ok(artifacts.every((entry: { workers: { A: string; B: string } }) => entry.workers.A.includes("BEGIN ISOLATION LEVEL READ COMMITTED") && entry.workers.A.indexOf("pg_advisory_xact_lock") < entry.workers.A.indexOf("forme_r4.tx_")));
  for (const entry of artifacts as Array<{ setup: string; workers: { A: string; B: string }; verify: string; controller: string }>) {
    assert.doesNotMatch(`${entry.setup}\n${entry.workers.A}\n${entry.workers.B}\n${entry.verify}`, /NULL::forme_r4\.mutation_context_v1|exact_synthetic_setup_receipt|exact_post_state|\{\{/u);
    assert.match(entry.setup, /INSERT INTO forme_r4\.rooms/u);
    assert.match(entry.verify, /DO \$verify\$/u);
    assert.match(entry.controller, /OBSERVER_SQL_SHA256:sha256:[0-9a-f]{64}/u);
    assert.match(entry.controller, /REAP_AND_PROVE_ABSENT:A,B,OBSERVER/u);
  }
  const c06 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C06-A-B");
  assert.match(c06.setup, /tx_public_encounter_issue/u);
  assert.doesNotMatch(c06.setup, /encounter_seed_000000000000006[12]/u);
  assert.match(c06.verify, /WHERE idempotency_key IN/u);
});

test("SQL source applies only the two approved public-pool and issued-edge corrections", () => {
  const sql = fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql"), "utf8");
  assert.match(sql, /origin_capability_class='public_encounter' AND state IN \('accepted','seen_locally','preparing'\)/u);
  assert.match(sql, /scope='encounter_issue' AND source_object_id=p_submission_id/u);
  assert.match(sql, /bucket_digest=v_edge_bucket_digest/u);
  assert.match(sql, /IF p_submission_class='public_encounter' THEN[\s\S]*INSERT INTO forme_r4\.rate_buckets/u);
  assert.match(sql, /RETURN ROW\(409::smallint,'capability_unavailable',p_submission_id,cap_version,NULL,jsonb_build_object\('code','capability_unavailable'\)\)/u);
  assert.doesNotMatch(sql, /scope='public_accept' AND bucket_digest=\(p_ctx\)\.actor_scope_digest/u);
});

test("future Docker plan is typed, local-socket bound, pull-never, portless and fake-only now", async () => {
  const plan = buildPostgresPhysicalPlan({ dockerCli: "/owned/docker", dockerUnixSocket: "/owned/docker.sock", localImageId: `sha256:${"a".repeat(64)}` }, `sha256:${"b".repeat(64)}`, "c".repeat(32));
  const create = plan.steps.find((entry: { kind: string }) => entry.kind === "container-create");
  assert.ok(create.argv.includes("--pull=never"));
  assert.ok(create.argv.includes("--network"));
  assert.ok(create.argv.includes("none"));
  assert.ok(!create.argv.some((value: string) => value.startsWith("--publish") || value === "-p"));
  assert.equal(plan.expectedCoreCalls, 68);
  assert.equal(plan.steps.filter((entry: { operation?: string }) => entry.operation === "read-committed-overlap-controller").length, 32);
  assert.equal(plan.steps.filter((entry: { sqlKey?: string }) => entry.sqlKey === "race-verifier").length, 32);
  assert.equal(plan.steps.filter((entry: { sqlKey?: string }) => entry.sqlKey === "c09-recovery").length, 4);
  const nonrace = plan.steps.find((entry: { sqlKey?: string }) => entry.sqlKey === "nonrace-public-boundaries");
  assert.match(nonrace.stdinText, /public_issue_active_cap20_not_closed/u);
  assert.match(nonrace.stdinText, /public_missing_issuance_lineage_not_closed/u);
  assert.ok(plan.steps.every((entry: { executable?: string | null; argv?: string[] }) => entry.executable === null || entry.executable === "/owned/docker"));
  const fake = await runConstructionFakeMatrix();
  assert.equal(fake.realPhysicalEffects, 0);
  assert.equal(fake.deterministicStressRuns, 3);
  assert.equal(fake.postgresAtomicFaultCases, plan.steps.length * 2);
});

test("unified fake runner fixes lane order, stops after terminal lane and always cleans", async () => {
  const calls: string[] = [];
  const result = await orchestrateConstructionFakeLanes({
    postgres: { mode: "construction_fake", async run() { calls.push("postgres"); return { verdict: "GREEN", stopLaterLanes: false }; } },
    codex: { mode: "construction_fake", async run() { calls.push("codex"); return { verdict: "RED", stopLaterLanes: true }; } },
    macos: { mode: "construction_fake", async run() { calls.push("macos"); return { verdict: "GREEN", stopLaterLanes: false }; } },
    cleanup: { mode: "construction_fake", async run() { calls.push("cleanup"); return true; } },
  });
  assert.deepEqual(calls, ["postgres", "codex", "cleanup"]);
  assert.deepEqual(result.order, ["postgres", "codex", "cleanup", "evidence", "stop"]);
  assert.equal(result.terminalLane, "codex");
  assert.equal(result.cleanupPassed, true);
  assert.equal(result.physicalEffects, 0);
});
