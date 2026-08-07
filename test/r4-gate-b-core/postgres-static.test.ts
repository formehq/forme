import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { CORE_BASIS_ERRORS_SQL, CORE_SQL_SURFACE, EXPECTED_COMPOSITES, EXPECTED_DOMAINS, EXPECTED_HELPERS, EXPECTED_ROLES, EXPECTED_SURFACE_FUNCTIONS, EXPECTED_TABLES, EXPECTED_VIEWS, EXCLUDED_FUNCTIONS, NON_RACE_ASSERTIONS, RACE_SCENARIOS, SETUP_FUNCTION, inspectPostgresContract, maskSql, replayRace, splitSqlStatements } from "../../scripts/r4-gate-b-core-postgres.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(repositoryRoot, "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql");

test("Core PostgreSQL inventory is exact and static-only", () => {
  const result = inspectPostgresContract();
  assert.equal(result.status, "CORE_CONSTRUCTED_STATIC_ONLY");
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.postgresProcesses, 0);
  assert.equal(result.dockerCommands, 0);
  assert.equal(result.networkCalls, 0);
  assert.equal(result.tableCount, EXPECTED_TABLES.length);
  assert.equal(result.tableCount, 37);
  assert.equal(result.domainCount, EXPECTED_DOMAINS.length);
  assert.equal(result.domainCount, 44);
  assert.equal(result.compositeCount, EXPECTED_COMPOSITES.length);
  assert.equal(result.compositeCount, 3);
  assert.equal(result.viewCount, EXPECTED_VIEWS.length);
  assert.equal(result.viewCount, 11);
  assert.equal(result.functionCount, EXPECTED_HELPERS.length + 1 + EXPECTED_SURFACE_FUNCTIONS.length);
  assert.equal(result.functionCount, 39);
  assert.equal(CORE_SQL_SURFACE.length, 32);
  assert.equal(result.roleCount, EXPECTED_ROLES.length);
  assert.equal(result.raceFixtureCount, 13);
  assert.equal(result.nonRaceAssertionCount, 5);
});

test("Core SQL exposes only the 32 mapped functions and the migrate-only setup", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");
  const functionNames = [...maskSql(migration).matchAll(/CREATE\s+FUNCTION\s+forme_r4\.([a-z0-9_]+)/giu)].map((match) => match[1]);
  assert.deepEqual([...functionNames].sort(), [...EXPECTED_HELPERS, SETUP_FUNCTION, ...EXPECTED_SURFACE_FUNCTIONS].sort());
  for (const excluded of EXCLUDED_FUNCTIONS) assert.ok(!functionNames.includes(excluded), excluded);
  assert.doesNotMatch(migration, /api_unavailable_result/u);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION forme_r4\.tx_gate_b_core_basis_install[\s\S]*TO forme_r4_migrate/u);
  assert.doesNotMatch(migration, /tx_gate_b_core_basis_install[\s\S]{0,500}TO forme_r4_app/u);
  assert.doesNotMatch(maskSql(migration), /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:ALL\s+)?TABLE/iu);
});

test("Core SQL lexer and hash guards cover every migration stage", () => {
  const paths = [
    "schemas/r4/gate-b-core/sql/0000_r4_gate_b_core_bootstrap.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.verify.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.rollback.sql",
  ];
  for (const relative of paths) assert.ok(splitSqlStatements(fs.readFileSync(path.join(repositoryRoot, relative), "utf8")).length > 0);
  const guarded = paths.slice(1).map((relative) => fs.readFileSync(path.join(repositoryRoot, relative), "utf8")).join("\n");
  for (const variable of ["technical_packet_sha", "scope_brief_sha", "construction_packet_sha", "core_basis_sha", "execution_manifest_sha", "migration_sha"]) assert.match(guarded, new RegExp(`:\\{\\?${variable}\\}`, "u"));
  assert.match(guarded, /R4_GATE_B_CORE_SYNTHETIC_ONLY_V1/u);
});

test("basis bytes and setup contract are exact", () => {
  const basis = fs.readFileSync(path.join(repositoryRoot, "schemas/r4/gate-b-core/core-basis.json"), "utf8");
  assert.equal(basis.split("\n").length, 2);
  assert.equal(basis.endsWith("\n"), true);
  const parsed = JSON.parse(basis) as Record<string, unknown>;
  assert.equal(parsed.schemaVersion, "r4.gate-b-core-basis.v1");
  assert.equal(parsed.thirdPlaceId, "thirdplace_gatebcore000000001");
  assert.equal(parsed.entityId, "entity_gatebcoreforme00000001");
  assert.equal(parsed.idempotencyKey, "gate_b_core_basis_install_v1");
  const migration = fs.readFileSync(migrationPath, "utf8");
  assert.match(migration, /p_ctx IS NULL/u);
  assert.ok((migration.match(/IS DISTINCT FROM/gu) ?? []).length >= 7);
});

test("fixtures include success, conflict, terminal and exact race/non-race plans", () => {
  const happy = fs.readFileSync(path.join(repositoryRoot, "fixtures/r4-gate-b-core/postgres/core-happy-path.sql"), "utf8");
  const errors = fs.readFileSync(path.join(repositoryRoot, "fixtures/r4-gate-b-core/postgres/core-errors.sql"), "utf8");
  const races = fs.readFileSync(path.join(repositoryRoot, "fixtures/r4-gate-b-core/postgres/core-races.sql"), "utf8");
  for (const token of ["room_created", "pairing_exchanged", "projection_delivered", "interaction_accepted", "cycle_abandoned_zero_dispatch", "response_delivered", "grant_offer_accepted"]) assert.match(happy, new RegExp(token, "u"));
  for (const token of ["idempotency_conflict", "version_conflict", "interaction_deleted", "dispatch_already_committed", "ack_out_of_order", "projection_revoked", "binding_revoked"]) assert.match(errors, new RegExp(token, "u"));
  for (const scenario of RACE_SCENARIOS) assert.match(races, new RegExp(scenario, "u"));
  for (const assertionName of NON_RACE_ASSERTIONS) assert.match(races, new RegExp(assertionName, "u"));
  assert.equal((races.match(/\(\d+,'[^']+','core-race-/gu) ?? []).length, 13);
  assert.match(races, /pg_advisory_xact_lock/u);
  assert.match(races, /RACE_WORKER_CALL_BYTES_REQUIRE_FOLLOWUP_CONSTRUCTION/u);
  for (const token of ["basis_null_context_not_closed", "basis_null_hash_not_closed", "basis_null_actor_not_closed", "basis_negative_fixture_mutated_state"]) assert.match(CORE_BASIS_ERRORS_SQL, new RegExp(token, "u"));
});

test("all 13 fake race interpretations remain one-effect controlled plans", () => {
  for (const scenario of RACE_SCENARIOS) {
    for (const order of [["a", "b"], ["b", "a"]] as const) {
      const outcome = replayRace(scenario, [...order]);
      assert.equal(outcome.planOnly, true);
      assert.equal(outcome.semanticEffects, 1);
      assert.equal(outcome.providerHandoffs, 0);
    }
  }
});
