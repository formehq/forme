import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  buildPostgresPhysicalPlan,
  composeRaceArtifacts,
  composeRaceRecoveries,
  loadRaceCatalog,
  orchestrateConstructionFakeLanes,
  raceByteIndex,
  runConstructionFakeMatrix,
  validateRaceCatalog,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-physical-port.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { runPostgresRaceProtocol } from "../../scripts/r4-gate-b-physical-runner.mjs";

const root = path.resolve(import.meta.dirname, "../..");

function createStatefulRaceSessions({ observerAccepted = true, secondBodyHex = "7b7d" } = {}) {
  const opened: string[] = [];
  const cleaned: string[] = [];
  const trace: string[] = [];
  const sessions = new Map<string, ReturnType<typeof createSession>>();
  let first = "A";
  let second = "B";
  let orderId = "C01-A-B";
  let firstCommitted = false;

  const emitResult = (worker: ReturnType<typeof createSession> | undefined, actor: string, firstArm: boolean) => {
    if (orderId.startsWith("C16-")) {
      worker?.emit(`RESULT ${actor} 201 public_encounter_issued 1`);
      worker?.emit(`RESULT_BODY_HEX ${actor} ${firstArm ? "7b7d" : secondBodyHex}`);
    } else {
      worker?.emit(`RESULT ${actor} ${firstArm ? "200 pairing_exchanged 1" : "410 pairing_expired 0"}`);
    }
  };

  function createSession(actor: string) {
    const lines: string[] = [];
    let waiter: { predicate: (line: string) => boolean; resolve: (line: string) => void; reject: (error: Error) => void } | null = null;
    let terminal = false;
    const emit = (line: string) => {
      trace.push(`emit:${actor}:${line}`);
      if (waiter === null) {
        lines.push(line);
        return;
      }
      const active = waiter;
      waiter = null;
      if (!active.predicate(line)) active.reject(new Error(`FAKE_MARKER_OUT_OF_ORDER:${actor}:${line}`));
      else active.resolve(line);
    };
    const rejectUnmatched = () => {
      if (waiter !== null) {
        const active = waiter;
        waiter = null;
        active.reject(new Error(`FAKE_MARKER_MISSING:${actor}`));
      }
    };
    const session = {
      pid: actor === "CONTROLLER" ? 2000 : actor === "OBSERVER" ? 2003 : actor === "A" ? 2001 : 2002,
      emit,
      write(value: string) {
        trace.push(`write:${actor}`);
        if (actor === "CONTROLLER" && value.includes("CONTROLLER_READY")) emit("CONTROLLER_READY");
        else if (actor === "CONTROLLER") {
          const released = /\\echo RELEASED ([AB])/u.exec(value)?.[1];
          assert.ok(released);
          emit(`RELEASED ${released}`);
          const worker = sessions.get(released);
          worker?.emit(`CALL_STARTED ${released}`);
          if (released === first) {
            worker?.emit(`POST_CALL ${released}`);
            emitResult(worker, released, true);
          } else if (firstCommitted) {
            worker?.emit(`POST_CALL ${released}`);
            emitResult(worker, released, false);
          }
        } else if (actor === "A" || actor === "B") emit(`READY ${actor} ${session.pid}`);
      },
      end(value = "") {
        trace.push(`end:${actor}`);
        terminal = true;
        if (actor === "OBSERVER") emit(observerAccepted ? "OBSERVER_OK" : "OBSERVER_WRONG");
        if ((actor === "A" || actor === "B") && value.includes(`COMMIT ${actor}`)) {
          emit(`COMMIT_ACK ${actor}`);
          if (actor === first) {
            firstCommitted = true;
            const worker = sessions.get(second);
            worker?.emit(`POST_CALL ${second}`);
            emitResult(worker, second, false);
          }
        }
        if (!observerAccepted && actor === "OBSERVER") rejectUnmatched();
      },
      async waitForLine(predicate: (line: string) => boolean) {
        if (lines.length > 0) {
          const line = lines.shift()!;
          if (!predicate(line)) throw new Error(`FAKE_MARKER_OUT_OF_ORDER:${actor}:${line}`);
          return line;
        }
        if (terminal) throw new Error(`FAKE_MARKER_MISSING:${actor}`);
        assert.equal(waiter, null, `only one waiter is allowed for ${actor}`);
        return await new Promise<string>((resolve, reject) => { waiter = { predicate, resolve, reject }; });
      },
      async closeExpected() { assert.equal(terminal, true); assert.deepEqual(lines, []); assert.equal(waiter, null); return true; },
      async forceCleanup() { terminal = true; cleaned.push(actor); rejectUnmatched(); return true; },
    };
    return session;
  }

  return {
    opened, cleaned, trace,
    async openSession(step: { controllerProtocol: string }, actor: "CONTROLLER" | "A" | "B" | "OBSERVER") {
      if (opened.length === 0) {
        orderId = (step as { orderId?: string }).orderId ?? "C01-A-B";
        first = /RELEASE_START:(A|B)/u.exec(step.controllerProtocol)?.[1] ?? "A";
        second = first === "A" ? "B" : "A";
      }
      opened.push(actor);
      const session = createSession(actor);
      sessions.set(actor, session);
      return session;
    },
  };
}

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
  assert.equal(actual.setupCount, 16);
  assert.equal(actual.setups.length, 16);
  assert.equal(new Set(actual.setups.map((entry: { setupSha256: string }) => entry.setupSha256)).size, 16);
  assert.equal(actual.entries.length, 32);
  assert.equal(actual.recovery.length, 4);
  for (const caseId of actual.setups.map((entry: { caseId: string }) => entry.caseId)) {
    const orders = actual.entries.filter((entry: { caseId: string }) => entry.caseId === caseId);
    assert.equal(orders.length, 2);
    assert.equal(new Set(orders.map((entry: { setupSha256: string }) => entry.setupSha256)).size, 1);
  }
  const artifacts = composeRaceArtifacts();
  assert.ok(artifacts.every((entry: { workers: { A: string; B: string } }) => entry.workers.A.includes("BEGIN ISOLATION LEVEL READ COMMITTED") && entry.workers.A.indexOf("pg_advisory_xact_lock") < entry.workers.A.indexOf("forme_r4.tx_") && entry.workers.A.includes("\\gset r4_start_lock_") && entry.workers.A.includes("\\echo RESULT A ") && entry.workers.B.includes("\\echo RESULT B ")));
  for (const entry of artifacts as Array<{ orderId: string; setup: string; workers: { A: string; B: string }; verify: string; controller: string }>) {
    assert.doesNotMatch(`${entry.setup}\n${entry.workers.A}\n${entry.workers.B}\n${entry.verify}`, /NULL::forme_r4\.mutation_context_v1|exact_synthetic_setup_receipt|exact_post_state|\{\{/u);
    assert.match(entry.setup, /INSERT INTO forme_r4\.rooms/u);
    assert.match(entry.verify, /DO \$verify\$/u);
    assert.match(entry.verify, new RegExp(`VERIFIED ${entry.orderId} [12]`, "u"));
    assert.match(entry.verify, /operation_receipts o JOIN forme_r4\.idempotency_records i/u);
    assert.match(entry.verify, /race_persisted_state_mismatch/u);
    assert.match(entry.controller, /OBSERVER_SQL_SHA256:sha256:[0-9a-f]{64}/u);
    assert.match(entry.controller, /OBSERVER_INDEPENDENT_SESSION:true/u);
    assert.match(entry.controller, /REAP_AND_PROVE_ABSENT:CONTROLLER,A,B,OBSERVER/u);
  }
  const workerArtifacts = artifacts.flatMap((entry: { workers: { A: string; B: string } }) => [entry.workers.A, entry.workers.B]);
  assert.equal(workerArtifacts.filter((worker: string) => /\\echo RESULT [AB] /u.test(worker)).length, 64);
  assert.equal(workerArtifacts.filter((worker: string) => /\\echo RESULT_BODY_HEX [AB] /u.test(worker)).length, 4);
  for (const entry of artifacts as Array<{ orderId: string; workers: { A: string; B: string } }>) {
    for (const worker of [entry.workers.A, entry.workers.B]) {
      if (entry.orderId.startsWith("C16-")) assert.match(worker, /\\echo RESULT_BODY_HEX [AB] :r4_result_result_body_hex/u);
      else assert.doesNotMatch(worker, /RESULT_BODY_HEX/u);
    }
  }
  assert.equal(artifacts.reduce((sum: number, entry: { verify: string }) => sum + Number(/\\echo VERIFIED C(?:0[1-9]|1[0-6])-[AB]-[AB] ([12])/u.exec(entry.verify)?.[1] ?? -100), 0), 37);
  const c06 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C06-A-B");
  assert.match(c06.setup, /tx_public_encounter_issue/u);
  assert.doesNotMatch(c06.setup, /encounter_seed_000000000000006[12]/u);
  assert.match(c06.verify, /WHERE idempotency_key IN/u);
  const c01 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C01-A-B");
  assert.match(c01.workers.A, /binding_gatebcore00000000a1/u);
  assert.match(c01.workers.B, /binding_gatebcore00000000b1/u);
  assert.match(c01.verify, /sealed_exchange_envelope='synthetic-sealed-envelope-a'::bytea/u);
  const c09 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C09-A-B");
  assert.match(c09.verify, /room_operator\.cycle\.recover/u);
  assert.match(c09.verify, /race_c09abrecoverwinner_a_key_00000001/u);
  assert.match(c09.verify, /VERIFIED C09-A-B 2/u);
  for (const recovery of composeRaceRecoveries()) {
    assert.equal((recovery.input.match(/\\echo RECOVERY_RESULT /gu) ?? []).length, 1);
    assert.doesNotMatch(recovery.input, /RECOVERY_OK|\\echo RESULT /u);
  }
  const c12 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C12-B-A");
  assert.match(c12.verify, /new_state='interaction_deleted'/u);
  const c16 = artifacts.find((entry: { orderId: string }) => entry.orderId === "C16-A-B");
  assert.doesNotMatch(c16.workers.A, /EXPECTED_EXACT_RECEIPT/u, "closed token replacement must not leave symbolic names");
  assert.doesNotMatch(c16.workers.A, /\{\{/u);
  assert.match(c16.workers.A, /receipt_encounter_issue_[0-9a-f]{32}/u);
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
  const verifiers = plan.steps.filter((entry: { sqlKey?: string }) => entry.sqlKey === "race-verifier");
  assert.equal(verifiers.length, 32);
  assert.equal(verifiers.reduce((sum: number, entry: { expectedNewReceipts?: number }) => sum + (entry.expectedNewReceipts ?? -100), 0), 37);
  assert.ok(verifiers.every((entry: { orderId?: string; expectedNewReceipts?: number; expectedBodyFreeMarker?: string }) => entry.expectedBodyFreeMarker === `VERIFIED ${entry.orderId} ${entry.expectedNewReceipts}`));
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

test("PostgreSQL plan composes every repo-derived stdin from an injected pinned runtime reader", () => {
  const reads: string[] = [];
  const readRuntimeFile = (relativePath: string) => {
    reads.push(relativePath);
    return fs.readFileSync(path.join(root, relativePath));
  };
  const plan = buildPostgresPhysicalPlan({ dockerCli: "/owned/docker", dockerUnixSocket: "/owned/docker.sock", localImageId: `sha256:${"a".repeat(64)}` }, `sha256:${"b".repeat(64)}`, "c".repeat(32), readRuntimeFile);
  for (const relativePath of [
    "schemas/r4/gate-b-core/postgres/race-catalog.json",
    "fixtures/r4-gate-b-core/postgres/core-race-setup.sql",
    "fixtures/r4-gate-b-core/postgres/core-race-worker.sql",
    "fixtures/r4-gate-b-core/postgres/core-race-verify.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql",
    "schemas/r4/gate-b-core/core-basis.json",
  ]) assert.ok(reads.includes(relativePath), relativePath);
  assert.equal(reads.length, new Set(reads).size, "each pinned runtime path is read exactly once while the plan is composed");
  assert.equal(plan.steps.filter((entry: { stdinSource?: string }) => entry.stdinSource === "exact-plan-bytes").every((entry: { stdinSha256?: string }) => /^sha256:[0-9a-f]{64}$/u.test(entry.stdinSha256 ?? "")), true);
  assert.throws(() => buildPostgresPhysicalPlan({ dockerCli: "/owned/docker", dockerUnixSocket: "/owned/docker.sock", localImageId: `sha256:${"a".repeat(64)}` }, `sha256:${"b".repeat(64)}`, "c".repeat(32), (() => 1) as never), /POSTGRES_RUNTIME_BYTES_INVALID/u);
});

test("the production READ COMMITTED controller is exercised through four injected construction sessions", async () => {
  const plan = buildPostgresPhysicalPlan({ dockerCli: "/owned/docker", dockerUnixSocket: "/owned/docker.sock", localImageId: `sha256:${"a".repeat(64)}` }, `sha256:${"b".repeat(64)}`, "c".repeat(32));
  const step = plan.steps.find((entry: { orderId?: string; operation?: string }) => entry.orderId === "C01-A-B" && entry.operation === "read-committed-overlap-controller");
  assert.ok(step);
  const journal = { async append() { return null; } };
  const accepted = createStatefulRaceSessions();
  assert.equal(accepted.trace.length, 0);
  const result = await runPostgresRaceProtocol(step, journal, accepted.openSession);
  assert.deepEqual(accepted.opened, ["CONTROLLER", "A", "B", "OBSERVER"]);
  assert.equal(result.overlapProven, true);
  assert.equal(result.processGroupCount, 4);
  assert.deepEqual(result.results, [
    { actor: "A", status: 200, code: "pairing_exchanged", receiptPresent: true },
    { actor: "B", status: 410, code: "pairing_expired", receiptPresent: false },
  ]);
  assert.ok(accepted.trace.indexOf("write:CONTROLLER") < accepted.trace.indexOf("emit:CONTROLLER:CONTROLLER_READY"));
  assert.ok(accepted.trace.indexOf("end:A") < accepted.trace.indexOf("emit:B:POST_CALL B"));

  const rejected = createStatefulRaceSessions({ observerAccepted: false });
  await assert.rejects(runPostgresRaceProtocol(step, journal, rejected.openSession), /FAKE_MARKER_OUT_OF_ORDER:OBSERVER/u);
  assert.ok(["CONTROLLER", "A", "B", "OBSERVER"].every((actor) => rejected.cleaned.includes(actor)));

  const c16Step = plan.steps.find((entry: { orderId?: string; operation?: string }) => entry.orderId === "C16-A-B" && entry.operation === "read-committed-overlap-controller");
  assert.ok(c16Step);
  const mismatchedReplay = createStatefulRaceSessions({ secondBodyHex: "7b7b" });
  await assert.rejects(runPostgresRaceProtocol(c16Step, journal, mismatchedReplay.openSession), /POSTGRES_C16_REPLAY_BODY_MISMATCH/u);
  assert.ok(["CONTROLLER", "A", "B", "OBSERVER"].every((actor) => mismatchedReplay.cleaned.includes(actor)));
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
