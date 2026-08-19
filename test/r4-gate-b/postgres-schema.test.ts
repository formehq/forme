import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { EXPECTED_COMPOSITES, EXPECTED_DOMAINS, EXPECTED_ROLES, EXPECTED_SURFACE_FUNCTIONS, EXPECTED_TABLES, EXPECTED_VIEWS, LOCK_ORDER, RACE_SCENARIOS, inspectPostgresContract, maskSql, replayRace, splitSqlStatements } from "../../scripts/r4-gate-b-postgres.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("static PostgreSQL inventory binds the frozen 37-table contract", () => {
  const result = inspectPostgresContract();
  assert.equal(result.status, "GREEN_STATIC_ONLY");
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.postgresProcesses, 0);
  assert.equal(result.dockerCommands, 0);
  assert.equal(result.networkCalls, 0);
  assert.equal(result.tableCount, 37);
  assert.equal(result.tableCount, EXPECTED_TABLES.length);
  assert.equal(result.domainCount, 44);
  assert.equal(result.domainCount, EXPECTED_DOMAINS.length);
  assert.equal(result.compositeCount, EXPECTED_COMPOSITES.length);
  assert.equal(result.surfaceFunctionCount, EXPECTED_SURFACE_FUNCTIONS.length);
  assert.equal(result.viewCount, EXPECTED_VIEWS.length);
  assert.equal(result.roleCount, EXPECTED_ROLES.length);
  assert.equal(result.enumCount, 0);
  assert.deepEqual(result.lockOrder, LOCK_ORDER);
});

test("SQL lexer ignores comments, strings, and function bodies without hiding delimiters", () => {
  const adversarial = [
    "-- CREATE TABLE forme_r4.false_table(x text);",
    "SELECT 'CREATE TYPE forme_r4.false_enum AS ENUM (''x'')';",
    "CREATE FUNCTION forme_r4.fixture() RETURNS text LANGUAGE sql SECURITY DEFINER",
    "SET search_path=pg_catalog,forme_r4 AS $fixture$",
    "  SELECT '; CREATE EXTENSION false_extension'::text;",
    "$fixture$;",
    "/* nested /* CREATE ROLE false_role */ comment */",
    "SELECT 1;",
  ].join("\n");
  const masked = maskSql(adversarial);
  assert.doesNotMatch(masked, /false_table|false_enum|false_extension|false_role/u);
  assert.match(masked, /CREATE FUNCTION forme_r4\.fixture/u);
  assert.equal(splitSqlStatements(adversarial).length, 3);
  assert.throws(() => splitSqlStatements("SELECT (1;"), /SQL_PAREN_UNBALANCED/u);
  assert.throws(() => maskSql("SELECT 'unterminated"), /SQL_STRING_UNTERMINATED/u);
});

test("SQL files carry exact execution guards and no forbidden runtime effects", () => {
  const paths = [
    "schemas/r4/sql/0000_r4_gate_b_bootstrap.sql",
    "schemas/r4/sql/0001_r4_presence.sql",
    "schemas/r4/sql/0001_r4_presence.verify.sql",
    "schemas/r4/sql/0001_r4_presence.rollback.sql",
  ];
  const combined = paths.map((relative) => fs.readFileSync(path.join(repositoryRoot, relative), "utf8")).join("\n");
  assert.doesNotMatch(maskSql(combined), /\bCREATE\s+EXTENSION\b|\bAS\s+ENUM\b|\bdblink\b|\bpostgres_fdw\b/iu);
  assert.doesNotMatch(combined, /https?:\/\//iu);
  assert.match(combined, /server_version_num/u);
  assert.match(combined, /forme_r4_gate_b/u);
  assert.match(combined, /R4_GATE_B_SYNTHETIC_ONLY_V1/u);
  assert.match(combined, /sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5/u);
  assert.match(combined, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA forme_r4 FROM PUBLIC/u);
});

test("static role and function surface is body-free and purpose-separated", () => {
  const migration = fs.readFileSync(path.join(repositoryRoot, "schemas/r4/sql/0001_r4_presence.sql"), "utf8");
  for (const role of EXPECTED_ROLES) assert.match(migration + fs.readFileSync(path.join(repositoryRoot, "schemas/r4/sql/0000_r4_gate_b_bootstrap.sql"), "utf8"), new RegExp(`\\b${role}\\b`, "u"));
  for (const fn of EXPECTED_SURFACE_FUNCTIONS) assert.match(migration, new RegExp(`CREATE FUNCTION forme_r4\\.${fn}\\b`, "u"));
  assert.doesNotMatch(maskSql(migration), /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:ALL\s+)?TABLE/iu);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION forme_r4\.notify_claim_next\(uuid\)[\s\S]*TO forme_r4_notify/u);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION forme_r4\.janitor_purge_due\(text,integer\)[\s\S]*TO forme_r4_janitor/u);
});

test("race fixtures preserve one semantic winner in both commit orders", () => {
  const orders: Record<string, [string, string]> = {
    "grant-replacement": ["replacement_a", "replacement_b"],
    "offer-accept-revoke": ["accept", "revoke"],
    "invite-redeem-revoke": ["redeem", "revoke"],
    "one-unresolved": ["interaction_a", "interaction_b"],
    "fresh-dispatch-release": ["dispatch", "release"],
    "publish-terminal": ["publish", "terminal"],
    "notification-handoff-remove": ["claim", "remove"],
    "janitor-duplicate": ["claim_a", "claim_b"],
  };
  for (const scenario of RACE_SCENARIOS) {
    const order = orders[scenario];
    assert.ok(order);
    for (const current of [order, [order[1], order[0]] as [string, string]]) {
      const outcome = replayRace(scenario, current);
      assert.equal(outcome.semanticEffects, 1);
      assert.equal(outcome.denied.length, 1);
      if (scenario === "publish-terminal") {
        assert.equal(outcome.finalState, "terminal");
        assert.equal(outcome.bodyReadable, false);
      }
      if (scenario === "notification-handoff-remove") assert.equal(outcome.noBlindResend, true);
      if (scenario === "janitor-duplicate") assert.equal(outcome.idempotent, true);
    }
  }
});

test("static report explicitly defers every real database assertion", () => {
  const result = inspectPostgresContract();
  assert.deepEqual(result.deferredExecutionAssertions, [
    "bootstrap_apply_verify_rollback_reapply",
    "catalog_and_effective_privileges",
    "database_constraints_and_triggers",
    "serializable_commit_order_races",
    "postgres_16_10_parser_and_runtime",
  ]);
  assert.equal(Object.keys(result.fileHashes).length, 4);
  for (const digest of Object.values(result.fileHashes as Record<string, string>)) assert.match(digest, /^sha256:[0-9a-f]{64}$/u);
});
