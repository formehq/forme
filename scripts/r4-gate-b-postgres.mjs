import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SQL_PATHS = Object.freeze({
  bootstrap: "schemas/r4/sql/0000_r4_gate_b_bootstrap.sql",
  migration: "schemas/r4/sql/0001_r4_presence.sql",
  verify: "schemas/r4/sql/0001_r4_presence.verify.sql",
  rollback: "schemas/r4/sql/0001_r4_presence.rollback.sql",
});

export const EXPECTED_TABLES = Object.freeze([
  "schema_migrations", "actor_subjects", "actor_roles", "third_places",
  "third_place_events", "entities", "rooms", "room_lifecycle_events",
  "encryption_nonces", "projections", "projection_lifecycle_events",
  "curation_events", "room_bindings", "pairing_challenges", "public_encounters",
  "grants", "grant_offers", "direct_grant_invites", "agent_derivatives",
  "capability_events", "interactions", "interaction_lifecycle_events",
  "fresh_cycle_reservations", "dispatch_permits", "responses",
  "response_lifecycle_events", "notification_endpoints",
  "notification_challenges", "notification_outbox", "notification_attempts",
  "room_event_stream", "operation_receipts", "idempotency_records",
  "rate_buckets", "retention_jobs", "purge_watermarks", "operator_incidents",
]);

export const EXPECTED_DOMAINS = Object.freeze([
  "r4_id", "sha256_digest", "idempotency_key", "canonical_text",
  "encrypted_field_v1", "actor_subject_state_d", "actor_role_kind_d",
  "entity_state_d", "third_place_state_d", "third_place_event_kind_d",
  "room_kind_d", "interaction_mode_d", "room_status_d",
  "room_lifecycle_event_kind_d", "projection_owner_state_d",
  "curation_state_d", "curation_event_kind_d", "capability_state_d",
  "grant_preset_id_d", "grant_offer_state_d", "direct_invite_state_d",
  "capability_class_d", "binding_state_d", "pairing_state_d",
  "interaction_type_d", "guest_capsule_level_d", "interaction_consent_d",
  "interaction_state_d", "fresh_cycle_state_d", "response_state_d",
  "response_source_disclosure_d", "notification_endpoint_state_d",
  "notification_challenge_state_d", "notification_semantic_kind_d",
  "notification_notice_state_d", "notification_attempt_state_d",
  "room_event_object_type_d", "operation_status_d",
  "idempotency_recovery_kind_d", "retention_target_kind_d",
  "retention_job_state_d", "purge_outcome_d", "operator_incident_code_d",
  "api_actor_class_d",
]);

export const EXPECTED_COMPOSITES = Object.freeze([
  "mutation_context_v1", "api_result_v1", "notification_claim_v1",
]);

export const EXPECTED_ROLES = Object.freeze([
  "forme_r4_migrate", "forme_r4_app", "forme_r4_janitor",
  "forme_r4_notify", "forme_r4_audit",
]);

export const EXPECTED_VIEWS = Object.freeze([
  "audit_schema_migrations", "audit_room_lifecycle",
  "audit_projection_lifecycle", "audit_curation_events",
  "audit_capability_events", "audit_interaction_lifecycle",
  "audit_response_lifecycle", "audit_operation_receipts",
  "audit_room_event_high_water", "audit_purge_health",
  "audit_operator_incidents",
]);

export const EXPECTED_SURFACE_FUNCTIONS = Object.freeze([
  "api_third_place_list", "api_projection_read", "api_interaction_read",
  "api_control_status", "api_control_interaction_read", "api_room_operator_status",
  "tx_public_encounter_issue", "tx_interaction_create", "tx_interaction_delete",
  "tx_notification_set", "tx_notification_remove", "tx_notification_verify",
  "tx_grant_offer_accept", "tx_direct_invite_redeem", "tx_agent_derivative_mint",
  "tx_room_pair_exchange", "tx_room_create", "tx_room_pair_issue",
  "tx_room_binding_revoke", "tx_room_mode_set", "tx_room_retire", "tx_room_delete",
  "tx_projection_revoke", "tx_response_revoke", "tx_grant_issue",
  "tx_grant_replace", "tx_grant_revoke", "tx_grant_offer_issue",
  "tx_grant_offer_revoke", "tx_direct_invite_issue", "tx_direct_invite_revoke",
  "tx_interaction_close", "tx_curation_admit", "tx_curation_unlist",
  "tx_room_operator_sync", "tx_room_operator_pull", "tx_fresh_cycle_reserve",
  "tx_fresh_cycle_recover", "tx_fresh_cycle_abandon_zero_dispatch",
  "tx_dispatch_permit_issue", "tx_room_event_ack", "tx_projection_deliver",
  "tx_response_deliver", "tx_projection_attest_stale", "tx_local_purge_receipt",
  "notify_claim_next", "notify_record_provider_result",
  "notify_claim_reconciliation", "notify_record_reconciliation",
  "notify_apply_late_authenticated_result", "janitor_purge_due",
  "janitor_compact_room_events", "janitor_health",
]);

export const LOCK_ORDER = Object.freeze([
  "room_advisory", "room", "projection", "capability", "interaction",
  "fresh_cycle", "dispatch_permit", "response", "notification_endpoint",
  "notification_outbox", "notification_attempt", "idempotency",
  "room_event_high_water", "retention",
]);

export const RACE_SCENARIOS = Object.freeze([
  "grant-replacement", "offer-accept-revoke", "invite-redeem-revoke",
  "one-unresolved", "fresh-dispatch-release", "publish-terminal",
  "notification-handoff-remove", "janitor-duplicate",
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function exactFile(relativePath) {
  if (!Object.values(SQL_PATHS).includes(relativePath)) fail("SQL_PATH_NOT_ALLOWLISTED");
  const candidate = path.join(REPOSITORY_ROOT, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail("SQL_PATH_UNSAFE");
  const real = fs.realpathSync(candidate);
  if (real !== candidate || !real.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) fail("SQL_PATH_ESCAPE");
  return fs.readFileSync(real, "utf8");
}

export function maskSql(source) {
  const chars = [...source];
  const masked = [...source];
  const blank = (index) => { if (chars[index] !== "\n" && chars[index] !== "\r") masked[index] = " "; };
  let index = 0;
  let lineStart = true;
  while (index < chars.length) {
    if (lineStart) {
      let cursor = index;
      while (chars[cursor] === " " || chars[cursor] === "\t") cursor += 1;
      if (chars[cursor] === "\\") {
        while (cursor < chars.length && chars[cursor] !== "\n") { blank(cursor); cursor += 1; }
        index = cursor;
        lineStart = true;
        continue;
      }
    }
    lineStart = chars[index] === "\n";
    if (chars[index] === "-" && chars[index + 1] === "-") {
      while (index < chars.length && chars[index] !== "\n") { blank(index); index += 1; }
      lineStart = true;
      continue;
    }
    if (chars[index] === "/" && chars[index + 1] === "*") {
      let depth = 1;
      blank(index); blank(index + 1); index += 2;
      while (index < chars.length && depth > 0) {
        if (chars[index] === "/" && chars[index + 1] === "*") { depth += 1; blank(index); blank(index + 1); index += 2; }
        else if (chars[index] === "*" && chars[index + 1] === "/") { depth -= 1; blank(index); blank(index + 1); index += 2; }
        else { blank(index); index += 1; }
      }
      if (depth !== 0) fail("SQL_BLOCK_COMMENT_UNTERMINATED");
      continue;
    }
    if (chars[index] === "'") {
      blank(index); index += 1;
      let closed = false;
      while (index < chars.length) {
        blank(index);
        if (chars[index] === "'" && chars[index + 1] === "'") { blank(index + 1); index += 2; continue; }
        if (chars[index] === "'") { index += 1; closed = true; break; }
        index += 1;
      }
      if (!closed) fail("SQL_STRING_UNTERMINATED");
      continue;
    }
    if (chars[index] === "$") {
      const tail = source.slice(index);
      const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u.exec(tail);
      if (match) {
        const delimiter = match[0];
        for (let i = 0; i < delimiter.length; i += 1) blank(index + i);
        index += delimiter.length;
        const close = source.indexOf(delimiter, index);
        if (close === -1) fail("SQL_DOLLAR_QUOTE_UNTERMINATED");
        while (index < close + delimiter.length) { blank(index); index += 1; }
        continue;
      }
    }
    index += 1;
  }
  return masked.join("");
}

export function splitSqlStatements(source) {
  const masked = maskSql(source);
  const statements = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === "(") depth += 1;
    if (masked[index] === ")") { depth -= 1; if (depth < 0) fail("SQL_PAREN_UNBALANCED"); }
    if (masked[index] === ";" && depth === 0) {
      const text = source.slice(start, index + 1).trim();
      if (text.length > 0) statements.push(text);
      start = index + 1;
    }
  }
  if (depth !== 0) fail("SQL_PAREN_UNBALANCED");
  const remainder = maskSql(source.slice(start)).trim();
  if (remainder.length > 0) fail("SQL_STATEMENT_UNTERMINATED");
  return statements;
}

function names(source, pattern) {
  return [...maskSql(source).matchAll(pattern)].map((match) => match[1]);
}

function exactSet(actual, expected, code) {
  if (actual.length !== expected.length || new Set(actual).size !== actual.length) fail(code);
  const a = [...actual].sort();
  const b = [...expected].sort();
  if (a.some((value, index) => value !== b[index])) fail(code);
}

function functionStatements(source) {
  return splitSqlStatements(source).filter((statement) => /^CREATE FUNCTION forme_r4\./iu.test(statement));
}

function assertStaticContract(files) {
  const { bootstrap, migration, verify, rollback } = files;
  for (const source of Object.values(files)) splitSqlStatements(source);
  const masked = maskSql(migration);
  if (/\bCREATE\s+TYPE\b[\s\S]*?\bAS\s+ENUM\b/iu.test(masked)) fail("POSTGRES_ENUM_PROHIBITED");
  if (/\bCREATE\s+EXTENSION\b/iu.test(masked)) fail("POSTGRES_EXTENSION_PROHIBITED");
  if (/\b(?:dblink|postgres_fdw|COPY\s+[\s\S]*?PROGRAM)\b/iu.test(masked)) fail("POSTGRES_EXTERNAL_EFFECT_TOKEN");
  if (/\b(?:production|forme_prod|real_guest)\b/iu.test(masked)) fail("POSTGRES_NON_SYNTHETIC_TOKEN");

  exactSet(names(migration, /\bCREATE\s+TABLE\s+forme_r4\.([a-z0-9_]+)/giu), EXPECTED_TABLES, "POSTGRES_TABLE_INVENTORY_DRIFT");
  exactSet(names(migration, /\bCREATE\s+DOMAIN\s+forme_r4\.([a-z0-9_]+)/giu), EXPECTED_DOMAINS, "POSTGRES_DOMAIN_INVENTORY_DRIFT");
  exactSet(names(migration, /\bCREATE\s+TYPE\s+forme_r4\.([a-z0-9_]+)/giu), EXPECTED_COMPOSITES, "POSTGRES_COMPOSITE_INVENTORY_DRIFT");
  exactSet(names(migration, /\bCREATE\s+VIEW\s+forme_r4\.([a-z0-9_]+)/giu), EXPECTED_VIEWS, "POSTGRES_VIEW_INVENTORY_DRIFT");
  const functions = names(migration, /\bCREATE\s+FUNCTION\s+forme_r4\.([a-z0-9_]+)/giu);
  for (const expected of EXPECTED_SURFACE_FUNCTIONS) {
    if (functions.filter((name) => name === expected).length !== 1) fail("POSTGRES_FUNCTION_SURFACE_DRIFT");
  }
  if (functions.length !== 60 || new Set(functions).size !== functions.length) fail("POSTGRES_FUNCTION_INVENTORY_DRIFT");
  for (const statement of functionStatements(migration)) {
    const statementMask = maskSql(statement);
    if (!/\bSECURITY\s+DEFINER\b/iu.test(statementMask)) fail("POSTGRES_FUNCTION_NOT_SECURITY_DEFINER");
    if (!/\bSET\s+search_path\s*=\s*pg_catalog\s*,\s*forme_r4\b/iu.test(statementMask)) fail("POSTGRES_FUNCTION_SEARCH_PATH_DRIFT");
  }

  exactSet(names(bootstrap, /\bCREATE\s+ROLE\s+([a-z0-9_]+)/giu), EXPECTED_ROLES, "POSTGRES_ROLE_INVENTORY_DRIFT");
  for (const role of EXPECTED_ROLES) {
    const roleStatement = splitSqlStatements(bootstrap).find((statement) => new RegExp(`^CREATE\\s+ROLE\\s+${role}\\b`, "iu").test(statement));
    if (!roleStatement || !/\bNOLOGIN\b[\s\S]*\bNOINHERIT\b[\s\S]*\bNOSUPERUSER\b[\s\S]*\bNOCREATEDB\b[\s\S]*\bNOCREATEROLE\b[\s\S]*\bNOREPLICATION\b[\s\S]*\bNOBYPASSRLS\b/iu.test(maskSql(roleStatement))) {
      fail("POSTGRES_ROLE_FLAGS_DRIFT");
    }
  }
  const bootstrapRequired = [
    "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
    "REVOKE ALL ON DATABASE forme_r4_gate_b FROM PUBLIC",
    "REVOKE ALL ON SCHEMA public FROM PUBLIC",
    "CREATE SCHEMA forme_r4 AUTHORIZATION forme_r4_migrate",
    "R4_GATE_B_SYNTHETIC_ONLY_V1",
  ];
  for (const token of bootstrapRequired) if (!bootstrap.includes(token)) fail("POSTGRES_BOOTSTRAP_BOUNDARY_DRIFT");
  if (!/REVOKE\s+EXECUTE\s+ON\s+ALL\s+FUNCTIONS\s+IN\s+SCHEMA\s+forme_r4\s+FROM\s+PUBLIC/iu.test(masked)) fail("POSTGRES_PUBLIC_EXECUTE_REVOKE_MISSING");
  if (!/REVOKE\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+forme_r4\s+FROM\s+PUBLIC/iu.test(masked)) fail("POSTGRES_PUBLIC_TABLE_REVOKE_MISSING");
  if (/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL)\s+ON\s+(?:ALL\s+)?TABLES?\b[\s\S]*?TO\s+forme_r4_(?:app|janitor|notify|audit)/iu.test(masked)) fail("POSTGRES_RUNTIME_RAW_TABLE_GRANT");

  for (const token of ["37", "44", "60", "11", "7", "typtype='e'", "aclexplode", "acl.grantee=0"]) {
    if (!verify.includes(token)) fail("POSTGRES_VERIFY_ASSERTION_DRIFT");
  }
  for (const token of ["R4_GATE_B_SYNTHETIC_ONLY_V1", "DROP SCHEMA forme_r4 CASCADE", ...EXPECTED_ROLES.map((role) => `DROP ROLE ${role}`)]) {
    if (!rollback.includes(token)) fail("POSTGRES_ROLLBACK_GUARD_DRIFT");
  }
  for (const source of [migration, verify, rollback]) {
    for (const variable of ["packet_sha", "manifest_sha", "migration_sha"]) {
      if (!source.includes(`:{?${variable}}`)) fail("POSTGRES_HASH_INPUT_GUARD_DRIFT");
    }
  }
}

export function replayRace(scenario, order) {
  if (!RACE_SCENARIOS.includes(scenario)) fail("RACE_SCENARIO_UNKNOWN");
  if (!Array.isArray(order) || order.length !== 2 || new Set(order).size !== 2) fail("RACE_ORDER_INVALID");
  const [first, second] = order;
  const result = { scenario, winner: first, denied: [second], semanticEffects: 1, providerHandoffs: 0 };
  if (scenario === "publish-terminal") {
    result.finalState = "terminal";
    result.bodyReadable = false;
    result.winner = order.includes("terminal") ? "terminal" : first;
    result.denied = result.winner === first ? [second] : [first];
  } else if (scenario === "notification-handoff-remove") {
    result.finalState = first === "claim" ? "delivery_unknown_no_retry" : "canceled_before_handoff";
    result.providerHandoffs = first === "claim" ? 1 : 0;
    result.noBlindResend = true;
  } else if (scenario === "janitor-duplicate") {
    result.finalState = "purged";
    result.winner = "first_claim";
    result.denied = ["duplicate_claim"];
    result.idempotent = true;
  } else {
    result.finalState = first;
  }
  return Object.freeze(result);
}

export function inspectPostgresContract() {
  const files = Object.fromEntries(Object.entries(SQL_PATHS).map(([key, value]) => [key, exactFile(value)]));
  assertStaticContract(files);
  const migrationFunctions = names(files.migration, /\bCREATE\s+FUNCTION\s+forme_r4\.([a-z0-9_]+)/giu);
  const migrationIndexes = names(files.migration, /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-z0-9_]+)/giu);
  const migrationTriggers = names(files.migration, /\bCREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+([a-z0-9_]+)/giu);
  return Object.freeze({
    schemaVersion: "r4_gate_b_postgres_static.v1",
    status: "GREEN_STATIC_ONLY",
    runtimeExecuted: false,
    postgresProcesses: 0,
    dockerCommands: 0,
    networkCalls: 0,
    tableCount: EXPECTED_TABLES.length,
    domainCount: EXPECTED_DOMAINS.length,
    compositeCount: EXPECTED_COMPOSITES.length,
    functionCount: migrationFunctions.length,
    surfaceFunctionCount: EXPECTED_SURFACE_FUNCTIONS.length,
    viewCount: EXPECTED_VIEWS.length,
    triggerCount: migrationTriggers.length,
    explicitIndexCount: migrationIndexes.length,
    roleCount: EXPECTED_ROLES.length,
    enumCount: 0,
    raceFixtureCount: RACE_SCENARIOS.length,
    lockOrder: LOCK_ORDER,
    fileHashes: Object.fromEntries(Object.entries(files).map(([key, value]) => [SQL_PATHS[key], sha256(value)])),
    deferredExecutionAssertions: [
      "bootstrap_apply_verify_rollback_reapply",
      "catalog_and_effective_privileges",
      "database_constraints_and_triggers",
      "serializable_commit_order_races",
      "postgres_16_10_parser_and_runtime",
    ],
  });
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("POSTGRES_STATIC_COMMAND_INVALID");
  process.stdout.write(`${JSON.stringify(inspectPostgresContract())}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
