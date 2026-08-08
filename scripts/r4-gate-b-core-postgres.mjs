import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SQL_PATHS = Object.freeze({
  bootstrap: "schemas/r4/gate-b-core/sql/0000_r4_gate_b_core_bootstrap.sql",
  migration: "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql",
  verify: "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.verify.sql",
  rollback: "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.rollback.sql",
});
const FIXTURE_PATHS = Object.freeze({
  happy: "fixtures/r4-gate-b-core/postgres/core-happy-path.sql",
  errors: "fixtures/r4-gate-b-core/postgres/core-errors.sql",
  races: "fixtures/r4-gate-b-core/postgres/core-races.sql",
});
export const CORE_BASIS_ERRORS_SQL = String.raw`\set ON_ERROR_STOP on

-- Direct-SQL NULL and exact-context rejection for the migrate-only basis
-- function. This runs before the one valid basis installation.
SET ROLE forme_r4_migrate;

DO $fixture$
DECLARE
  result forme_r4.api_result_v1;
  valid_ctx forme_r4.mutation_context_v1 := ROW(
    'controller',
    'subject_gatebcorecontroller0001',
    'sha256:b6c733e7298f287d559ee69afa6a0fdd6312248388c5db493ee3c80a2b2d5993',
    'gate_b_core_basis_install_v1',
    'sha256:a0b7bfe19e9583c68e715afcd361a06cd3ddb7dc57165efc77188e02ea12d309',
    NULL,
    '8a7b8a0f-44d5-4c5e-a1b2-8b77b7e0c401'
  )::forme_r4.mutation_context_v1;
  denied_ctx forme_r4.mutation_context_v1;
  basis_hash forme_r4.sha256_digest := 'sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35';
BEGIN
  result := forme_r4.tx_gate_b_core_basis_install(NULL::forme_r4.mutation_context_v1, basis_hash);
  IF (result).http_status<>409 OR (result).code<>'gate_b_core_basis_request_conflict' THEN RAISE EXCEPTION 'basis_null_context_not_closed'; END IF;
  result := forme_r4.tx_gate_b_core_basis_install(valid_ctx, NULL::forme_r4.sha256_digest);
  IF (result).http_status<>409 THEN RAISE EXCEPTION 'basis_null_hash_not_closed'; END IF;

  denied_ctx := valid_ctx; denied_ctx.idempotency_key := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>409 THEN RAISE EXCEPTION 'basis_null_idempotency_not_closed'; END IF;
  denied_ctx := valid_ctx; denied_ctx.canonical_request_hash := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>409 THEN RAISE EXCEPTION 'basis_null_request_hash_not_closed'; END IF;

  denied_ctx := valid_ctx; denied_ctx.actor_class := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'basis_null_actor_not_closed'; END IF;
  denied_ctx := valid_ctx; denied_ctx.actor_subject_id := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'basis_null_subject_not_closed'; END IF;
  denied_ctx := valid_ctx; denied_ctx.actor_scope_digest := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'basis_null_scope_not_closed'; END IF;
  denied_ctx := valid_ctx; denied_ctx.expected_object_version := 1;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'basis_version_not_closed'; END IF;
  denied_ctx := valid_ctx; denied_ctx.correlation_id := NULL;
  result := forme_r4.tx_gate_b_core_basis_install(denied_ctx, basis_hash);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'basis_null_correlation_not_closed'; END IF;

  IF (SELECT count(*) FROM forme_r4.third_places)<>0
     OR (SELECT count(*) FROM forme_r4.entities)<>0
     OR (SELECT count(*) FROM forme_r4.actor_subjects)<>0 THEN
    RAISE EXCEPTION 'basis_negative_fixture_mutated_state';
  END IF;
END
$fixture$;

RESET ROLE;
`;
const LINEAGE_FIXED = Object.freeze({
  technical_packet_sha: "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5",
  scope_brief_sha: "sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f",
  construction_packet_sha: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
  core_basis_sha: "sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35",
});
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

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

export const CORE_SQL_SURFACE = Object.freeze([
  ["third_place.list", "api_third_place_list"],
  ["projection.read", "api_projection_read"],
  ["public_encounter.issue", "tx_public_encounter_issue"],
  ["interaction.create", "tx_interaction_create"],
  ["interaction.read", "api_interaction_read"],
  ["interaction.delete", "tx_interaction_delete"],
  ["grant_offer.accept", "tx_grant_offer_accept"],
  ["room.pair.exchange", "tx_room_pair_exchange"],
  ["control.status", "api_control_status"],
  ["control.interaction.read", "api_control_interaction_read"],
  ["room.create", "tx_room_create"],
  ["room.pair", "tx_room_pair_issue"],
  ["room.binding.revoke", "tx_room_binding_revoke"],
  ["projection.revoke", "tx_projection_revoke"],
  ["response.revoke", "tx_response_revoke"],
  ["grant.revoke", "tx_grant_revoke"],
  ["grant_offer.issue", "tx_grant_offer_issue"],
  ["grant_offer.revoke", "tx_grant_offer_revoke"],
  ["interaction.close", "tx_interaction_close"],
  ["curation.admit", "tx_curation_admit"],
  ["curation.unlist", "tx_curation_unlist"],
  ["room_operator.status", "api_room_operator_status"],
  ["room_operator.sync", "tx_room_operator_sync"],
  ["room_operator.pull", "tx_room_operator_pull"],
  ["room_operator.cycle.reserve", "tx_fresh_cycle_reserve"],
  ["room_operator.cycle.recover", "tx_fresh_cycle_recover"],
  ["room_operator.cycle.abandon", "tx_fresh_cycle_abandon_zero_dispatch"],
  ["room_operator.dispatch.issue", "tx_dispatch_permit_issue"],
  ["room_operator.ack", "tx_room_event_ack"],
  ["room_operator.projection.deliver", "tx_projection_deliver"],
  ["room_operator.response.deliver", "tx_response_deliver"],
  ["room_operator.local_purge.receipt", "tx_local_purge_receipt"],
]);
export const EXPECTED_SURFACE_FUNCTIONS = Object.freeze(CORE_SQL_SURFACE.map(([, name]) => name));
export const EXPECTED_HELPERS = Object.freeze([
  "is_encrypted_field_v1", "enforce_projection_room_entity",
  "enforce_projection_immutability", "enforce_response_expiry",
  "enforce_terminal_unreadability", "enforce_room_event_sequence",
]);
export const SETUP_FUNCTION = "tx_gate_b_core_basis_install";
export const EXCLUDED_FUNCTIONS = Object.freeze([
  "tx_notification_set", "tx_notification_remove", "tx_notification_verify",
  "tx_direct_invite_redeem", "tx_agent_derivative_mint", "tx_room_mode_set",
  "tx_room_retire", "tx_room_delete", "tx_grant_issue", "tx_grant_replace",
  "tx_direct_invite_issue", "tx_direct_invite_revoke", "tx_projection_attest_stale",
  "api_unavailable_result", "notify_claim_next", "notify_record_provider_result",
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
  "pairing-exchange-competing-secret",
  "public-encounter-one-use",
  "public-rate-final-slot",
  "grant-offer-accept-vs-revoke",
  "grant-quota-final-slot",
  "fresh-cycle-competing-reservation",
  "dispatch-vs-zero-dispatch-abandon",
  "response-delivery-vs-owner-close",
  "response-delivery-vs-guest-delete",
  "response-delivery-vs-projection-revoke",
  "operator-pull-vs-binding-revoke",
  "curation-unlist-vs-public-encounter",
  "same-key-concurrent-replay",
]);

export const NON_RACE_ASSERTIONS = Object.freeze([
  "room_event_sequence_monotonic",
  "room_event_identity_exact",
  "ack_high_water_advances",
  "duplicate_ack_no_op",
  "out_of_order_ack_rejected",
]);

export const CORE_POSTGRES_PHYSICAL = Object.freeze({
  imageLabel: "postgres:16.10-bookworm",
  image: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74",
  ociIndex: "sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74",
  arm64Manifest: "sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf",
  platform: "linux/arm64",
  database: "forme_r4_gate_b",
  network: "none",
  hostPorts: 0,
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function exactFile(relativePath) {
  if (![...Object.values(SQL_PATHS), ...Object.values(FIXTURE_PATHS), "schemas/r4/gate-b-core/core-basis.json"].includes(relativePath)) fail("SQL_PATH_NOT_ALLOWLISTED");
  const candidate = path.join(REPOSITORY_ROOT, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail("SQL_PATH_UNSAFE");
  const real = fs.realpathSync(candidate);
  if (real !== candidate || !real.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) fail("SQL_PATH_ESCAPE");
  return fs.readFileSync(real, "utf8");
}
function runtimeFile(relativePath, readRuntimeFile = undefined) {
  if (![...Object.values(SQL_PATHS), ...Object.values(FIXTURE_PATHS), "schemas/r4/gate-b-core/core-basis.json"].includes(relativePath)) fail("SQL_PATH_NOT_ALLOWLISTED");
  if (readRuntimeFile === undefined) return exactFile(relativePath);
  if (typeof readRuntimeFile !== "function") fail("POSTGRES_RUNTIME_READER_INVALID");
  let value;
  try { value = readRuntimeFile(relativePath); } catch { fail(`POSTGRES_RUNTIME_READ_FAILED:${relativePath}`); }
  if (typeof value === "string") return value;
  if (!Buffer.isBuffer(value)) fail(`POSTGRES_RUNTIME_BYTES_INVALID:${relativePath}`);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(value); } catch { fail(`POSTGRES_RUNTIME_UTF8_INVALID:${relativePath}`); }
}

function exactLineage(executionManifestSha256, readRuntimeFile = undefined) {
  if (!SHA256_PATTERN.test(executionManifestSha256)) fail("POSTGRES_EXECUTION_MANIFEST_HASH_INVALID");
  return Object.freeze({
    ...LINEAGE_FIXED,
    execution_manifest_sha: executionManifestSha256,
    migration_sha: sha256(runtimeFile(SQL_PATHS.migration, readRuntimeFile)),
  });
}

function lineagePrefix(lineage) {
  return `${Object.entries(lineage).map(([key, value]) => `\\set ${key} '${value}'\n`).join("")}`;
}

function coreBasisInstallSql(readRuntimeFile = undefined) {
  const basisBytes = runtimeFile("schemas/r4/gate-b-core/core-basis.json", readRuntimeFile);
  const basis = JSON.parse(basisBytes);
  const expected = {
    controllerSubjectId: "subject_gatebcorecontroller0001",
    actorScopeDigest: "sha256:b6c733e7298f287d559ee69afa6a0fdd6312248388c5db493ee3c80a2b2d5993",
    idempotencyKey: "gate_b_core_basis_install_v1",
    canonicalRequestHash: "sha256:a0b7bfe19e9583c68e715afcd361a06cd3ddb7dc57165efc77188e02ea12d309",
    correlationId: "8a7b8a0f-44d5-4c5e-a1b2-8b77b7e0c401",
  };
  for (const [key, value] of Object.entries(expected)) if (basis[key] !== value) fail("POSTGRES_CORE_BASIS_COMPOSER_DRIFT");
  return `\\set ON_ERROR_STOP on\nSET ROLE forme_r4_migrate;\nDO $basis$\nDECLARE result forme_r4.api_result_v1;\nBEGIN\n  result := forme_r4.tx_gate_b_core_basis_install(\n    ROW('controller','${basis.controllerSubjectId}','${basis.actorScopeDigest}','${basis.idempotencyKey}','${basis.canonicalRequestHash}',NULL,'${basis.correlationId}')::forme_r4.mutation_context_v1,\n    '${LINEAGE_FIXED.core_basis_sha}'::forme_r4.sha256_digest);\n  IF (result).http_status<>201 OR (result).code<>'gate_b_core_basis_installed' THEN RAISE EXCEPTION 'core_basis_install_failed'; END IF;\nEND\n$basis$;\nRESET ROLE;\n`;
}

export function buildCorePostgresStdin(sqlKey, executionManifestSha256, readRuntimeFile = undefined) {
  if (![...Object.keys(SQL_PATHS), "basis", "basisErrors", ...Object.keys(FIXTURE_PATHS)].includes(sqlKey)) fail("POSTGRES_SQL_STEP_UNKNOWN");
  if (sqlKey === "basis") return coreBasisInstallSql(readRuntimeFile);
  if (sqlKey === "basisErrors") return CORE_BASIS_ERRORS_SQL;
  const relative = SQL_PATHS[sqlKey] ?? FIXTURE_PATHS[sqlKey];
  const source = runtimeFile(relative, readRuntimeFile);
  if (["migration", "verify", "rollback"].includes(sqlKey)) return lineagePrefix(exactLineage(executionManifestSha256, readRuntimeFile)) + source;
  return source;
}

function stdinDescriptor(sqlKey) {
  if (sqlKey === "basis") return Object.freeze({ kind: "core-basis-function-composer", sourcePath: "schemas/r4/gate-b-core/core-basis.json", sourceSha256: LINEAGE_FIXED.core_basis_sha, requiresExecutionManifestSha256: false });
  if (sqlKey === "basisErrors") return Object.freeze({ kind: "closed-inline-sql", sourcePath: "scripts/r4-gate-b-core-postgres.mjs", sourceSha256: sha256(CORE_BASIS_ERRORS_SQL), requiresExecutionManifestSha256: false });
  const relative = SQL_PATHS[sqlKey] ?? FIXTURE_PATHS[sqlKey];
  const source = exactFile(relative);
  return Object.freeze({
    kind: ["migration", "verify", "rollback"].includes(sqlKey) ? "repo-sql-with-six-lineage-bindings" : "exact-repo-sql",
    sourcePath: relative,
    sourceSha256: sha256(source),
    requiresExecutionManifestSha256: ["migration", "verify", "rollback"].includes(sqlKey),
  });
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
  return splitSqlStatements(source).filter((statement) => /\bCREATE\s+FUNCTION\s+forme_r4\./iu.test(maskSql(statement)));
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
  exactSet(functions, [...EXPECTED_HELPERS, SETUP_FUNCTION, ...EXPECTED_SURFACE_FUNCTIONS], "POSTGRES_FUNCTION_INVENTORY_DRIFT");
  for (const excluded of EXCLUDED_FUNCTIONS) if (functions.includes(excluded)) fail("POSTGRES_EXCLUDED_FUNCTION_PRESENT");
  if (/\bapi_unavailable_result\s*\(/iu.test(masked)) fail("POSTGRES_UNAVAILABLE_STUB_PRESENT");
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
    "R4_GATE_B_CORE_SYNTHETIC_ONLY_V1",
  ];
  for (const token of bootstrapRequired) if (!bootstrap.includes(token)) fail("POSTGRES_BOOTSTRAP_BOUNDARY_DRIFT");
  if (!/REVOKE\s+EXECUTE\s+ON\s+ALL\s+FUNCTIONS\s+IN\s+SCHEMA\s+forme_r4\s+FROM\s+PUBLIC/iu.test(masked)) fail("POSTGRES_PUBLIC_EXECUTE_REVOKE_MISSING");
  if (!/REVOKE\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+forme_r4\s+FROM\s+PUBLIC/iu.test(masked)) fail("POSTGRES_PUBLIC_TABLE_REVOKE_MISSING");
  if (/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL)\s+ON\s+(?:ALL\s+)?TABLES?\b[\s\S]*?TO\s+forme_r4_(?:app|janitor|notify|audit)/iu.test(masked)) fail("POSTGRES_RUNTIME_RAW_TABLE_GRANT");

  for (const token of ["37", "44", "39", "32", "11", "7", "typtype='e'", "aclexplode", "acl.grantee=0"]) {
    if (!verify.includes(token)) fail("POSTGRES_VERIFY_ASSERTION_DRIFT");
  }
  for (const token of ["R4_GATE_B_CORE_SYNTHETIC_ONLY_V1", "DROP SCHEMA forme_r4 CASCADE", ...EXPECTED_ROLES.map((role) => `DROP ROLE ${role}`)]) {
    if (!rollback.includes(token)) fail("POSTGRES_ROLLBACK_GUARD_DRIFT");
  }
  for (const source of [migration, verify, rollback]) {
    for (const variable of ["technical_packet_sha", "scope_brief_sha", "construction_packet_sha", "core_basis_sha", "execution_manifest_sha", "migration_sha"]) {
      if (!source.includes(`:{?${variable}}`)) fail("POSTGRES_HASH_INPUT_GUARD_DRIFT");
    }
  }
  for (const value of [
    "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5",
    "sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f",
    "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
    "sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35",
  ]) if (!migration.includes(value)) fail("POSTGRES_LINEAGE_HASH_DRIFT");
  const basis = exactFile("schemas/r4/gate-b-core/core-basis.json");
  if (sha256(basis) !== "sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35") fail("POSTGRES_CORE_BASIS_HASH_DRIFT");
  if ((basis.match(/\n/gu) ?? []).length !== 1 || !basis.endsWith("\n")) fail("POSTGRES_CORE_BASIS_BYTES_DRIFT");
  const appGrantNames = [...masked.matchAll(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+forme_r4\.([a-z0-9_]+)/giu)].map((match) => match[1]);
  exactSet(appGrantNames.filter((name) => name !== SETUP_FUNCTION), EXPECTED_SURFACE_FUNCTIONS, "POSTGRES_APP_EXECUTE_MATRIX_DRIFT");
  if (!migration.includes(`GRANT EXECUTE ON FUNCTION forme_r4.${SETUP_FUNCTION}`) || !migration.includes("TO forme_r4_migrate")) fail("POSTGRES_SETUP_GRANT_DRIFT");
}

export function replayRace(scenario, order) {
  if (!RACE_SCENARIOS.includes(scenario)) fail("RACE_SCENARIO_UNKNOWN");
  if (!Array.isArray(order) || order.length !== 2 || new Set(order).size !== 2) fail("RACE_ORDER_INVALID");
  const [first, second] = order;
  const result = { scenario, first, second, planOnly: true, semanticEffects: 1, providerHandoffs: 0 };
  if (scenario === "fresh-cycle-competing-reservation") {
    Object.assign(result, { winner: first, loserCode: "cycle_already_reserved", winnerRecoverCode: "cycle_recovered", loserRecoverCode: "cycle_recovery_mismatch" });
  } else if (scenario === "operator-pull-vs-binding-revoke") {
    Object.assign(result, first === "pull" ? { pullCode: "interaction_pulled", revokeCode: "binding_revoked" } : { revokeCode: "binding_revoked", pullCode: "not_found" });
  } else if (["response-delivery-vs-owner-close", "response-delivery-vs-guest-delete", "response-delivery-vs-projection-revoke"].includes(scenario)) {
    Object.assign(result, { winner: first, loserControlled: true, finalReadableBodies: first === "deliver" ? 1 : 0 });
  } else if (scenario === "same-key-concurrent-replay") {
    Object.assign(result, { winner: first, secondIsExactReplay: true, semanticEffects: 1 });
  } else {
    Object.assign(result, { winner: first, loser: second, loserControlled: true });
  }
  return Object.freeze(result);
}

export const CORE_POSTGRES_RUN_ID = "r4gbcore-c0de20260807";
const FUTURE_RUN_ROOT = `/private/tmp/forme-r4-gate-b-core-${CORE_POSTGRES_RUN_ID}`;
const CONTAINER_NAME = `forme-r4-core-${CORE_POSTGRES_RUN_ID}`;
const VOLUME_NAME = `forme-r4-core-${CORE_POSTGRES_RUN_ID}`;

function closedPsqlStep(sqlKey) {
  if (![...Object.keys(SQL_PATHS), "basis", "basisErrors", ...Object.keys(FIXTURE_PATHS)].includes(sqlKey)) fail("POSTGRES_SQL_STEP_UNKNOWN");
  return Object.freeze({
    kind: "psql-stdin",
    argv: Object.freeze(["docker", "exec", "-i", CONTAINER_NAME, "psql", "-X", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", CORE_POSTGRES_PHYSICAL.database]),
    stdinKey: sqlKey,
    stdin: stdinDescriptor(sqlKey),
    cwd: REPOSITORY_ROOT,
    environment: Object.freeze({}),
  });
}

function closedRaceWorkersStep() {
  const workerArgv = Object.freeze(["docker", "exec", "-i", CONTAINER_NAME, "psql", "-X", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", CORE_POSTGRES_PHYSICAL.database]);
  return Object.freeze({
    kind: "race-workers",
    fixtureKey: "races",
    constructionStatus: "RACE_WORKER_CALL_BYTES_REQUIRE_FOLLOWUP_CONSTRUCTION",
    processGroupCount: 3,
    scenarioCount: RACE_SCENARIOS.length,
    scenarios: RACE_SCENARIOS,
    releaseOrders: Object.freeze([Object.freeze(["a", "b"]), Object.freeze(["b", "a"])]),
    controller: Object.freeze({ processGroup: "race-controller", role: "holds-and-releases-two-actor-specific-advisory-locks", boundedReadyPolls: 40, readyPollIntervalMilliseconds: 100 }),
    workers: Object.freeze([
      Object.freeze({ actor: "a", processGroup: "race-a", argv: workerArgv, stdinComposer: "closed-race-worker-a-v1", barrierRole: "actor_a" }),
      Object.freeze({ actor: "b", processGroup: "race-b", argv: workerArgv, stdinComposer: "closed-race-worker-b-v1", barrierRole: "actor_b" }),
    ]),
    requiresActualCoreFunctionCalls: true,
    requiresPersistentStateVerifier: true,
    expectedExecutionCount: RACE_SCENARIOS.length * 2,
    reapBeforeReturn: true,
    cwd: REPOSITORY_ROOT,
    environment: Object.freeze({}),
  });
}

export function buildCorePostgresExecutionPlan() {
  return Object.freeze({
    schemaVersion: "r4.gate-b-core-postgres-plan.v1",
    runId: CORE_POSTGRES_RUN_ID,
    runRoot: FUTURE_RUN_ROOT,
    containerName: CONTAINER_NAME,
    volumeName: VOLUME_NAME,
    physical: CORE_POSTGRES_PHYSICAL,
    markerIntentBeforeFirstEffect: true,
    steps: Object.freeze([
      Object.freeze({ kind: "marker-intent", bodyFree: true }),
      Object.freeze({ kind: "docker-image-inspect", argv: Object.freeze(["docker", "image", "inspect", "--format", "{{json .}}", CORE_POSTGRES_PHYSICAL.image]), outputValidator: "pinned-arm64-image-observation-v1", expectedOCIIndex: CORE_POSTGRES_PHYSICAL.ociIndex, expectedArm64Manifest: CORE_POSTGRES_PHYSICAL.arm64Manifest, environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      Object.freeze({ kind: "docker-volume-create", argv: Object.freeze(["docker", "volume", "create", "--label", `forme.run=${CORE_POSTGRES_RUN_ID}`, VOLUME_NAME]), environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      Object.freeze({ kind: "docker-container-create", argv: Object.freeze(["docker", "run", "--detach", "--name", CONTAINER_NAME, "--label", `forme.run=${CORE_POSTGRES_RUN_ID}`, "--platform", CORE_POSTGRES_PHYSICAL.platform, "--network", CORE_POSTGRES_PHYSICAL.network, "--publish-all=false", "--env", "POSTGRES_DB=forme_r4_gate_b", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--volume", `${VOLUME_NAME}:/var/lib/postgresql/data`, CORE_POSTGRES_PHYSICAL.image]), environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      Object.freeze({ kind: "postgres-readiness", argv: Object.freeze(["docker", "exec", CONTAINER_NAME, "pg_isready", "--username", "postgres", "--dbname", CORE_POSTGRES_PHYSICAL.database, "--timeout", "1"]), maximumAttempts: 30, intervalMilliseconds: 250, outputValidator: "bounded-pg-isready-v1", environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      closedPsqlStep("bootstrap"),
      closedPsqlStep("migration"),
      closedPsqlStep("basisErrors"),
      closedPsqlStep("basis"),
      closedPsqlStep("verify"),
      closedPsqlStep("happy"),
      closedPsqlStep("errors"),
      closedRaceWorkersStep(),
      closedPsqlStep("verify"),
      closedPsqlStep("rollback"),
      closedPsqlStep("bootstrap"),
      closedPsqlStep("migration"),
      closedPsqlStep("basis"),
      closedPsqlStep("verify"),
      Object.freeze({ kind: "docker-container-remove", argv: Object.freeze(["docker", "rm", "--force", CONTAINER_NAME]), environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      Object.freeze({ kind: "docker-volume-remove", argv: Object.freeze(["docker", "volume", "rm", VOLUME_NAME]), environment: Object.freeze({}), cwd: REPOSITORY_ROOT }),
      Object.freeze({ kind: "marker-clean", bodyFree: true }),
    ]),
  });
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code);
  return value;
}

export function validateCorePostgresImageObservation(value) {
  const observation = exactObject(value, ["ociIndex", "resolvedManifest", "platform", "architecture", "operatingSystem", "localOnly"], "POSTGRES_IMAGE_OBSERVATION_INVALID");
  if (
    observation.ociIndex !== CORE_POSTGRES_PHYSICAL.ociIndex
    || observation.resolvedManifest !== CORE_POSTGRES_PHYSICAL.arm64Manifest
    || observation.platform !== CORE_POSTGRES_PHYSICAL.platform
    || observation.architecture !== "arm64"
    || observation.operatingSystem !== "linux"
    || observation.localOnly !== true
  ) fail("POSTGRES_IMAGE_MANIFEST_DRIFT");
  return Object.freeze({ ...observation });
}

export function validateCorePostgresReadinessObservation(value) {
  const observation = exactObject(value, ["ready", "attempts", "lastExitCode", "stderrBytes"], "POSTGRES_READINESS_OBSERVATION_INVALID");
  if (observation.ready !== true || !Number.isInteger(observation.attempts) || observation.attempts < 1 || observation.attempts > 30 || observation.lastExitCode !== 0 || observation.stderrBytes !== 0) fail("POSTGRES_READINESS_FAILED");
  return Object.freeze({ ...observation });
}

export function validateCorePostgresRaceObservation(value) {
  const observation = exactObject(value, ["scenarioCount", "releaseOrderCount", "executionCount", "actualCoreFunctionCalls", "persistentStateVerifications", "controlledResults", "workerGroupsReaped", "survivingProcessGroups"], "POSTGRES_RACE_OBSERVATION_INVALID");
  if (
    observation.scenarioCount !== 13 || observation.releaseOrderCount !== 2 || observation.executionCount !== 26
    || observation.actualCoreFunctionCalls !== 52 || observation.persistentStateVerifications !== 26
    || observation.controlledResults !== 52 || observation.workerGroupsReaped !== true || observation.survivingProcessGroups !== 0
  ) fail("POSTGRES_RACE_OBSERVATION_FAILED");
  return Object.freeze({ ...observation });
}

export async function executeCorePostgresPlanWithInjectedExecutor(executor, { faultAfter = null, faultWindow = "before" } = {}) {
  if (!executor || typeof executor.execute !== "function" || Object.keys(executor).some((key) => !["execute", "checkpoint", "cleanup"].includes(key))) fail("POSTGRES_EXECUTOR_INVALID");
  if (faultAfter !== null && (!Number.isInteger(faultAfter) || faultAfter < 0)) fail("POSTGRES_FAULT_INDEX_INVALID");
  if (!["before", "after"].includes(faultWindow)) fail("POSTGRES_FAULT_WINDOW_INVALID");
  const plan = buildCorePostgresExecutionPlan();
  const completed = [];
  let primaryError = null;
  try {
    for (let index = 0; index < plan.steps.length; index += 1) {
      if (faultAfter === index && faultWindow === "before") fail("POSTGRES_INJECTED_FAULT_BEFORE_EFFECT");
      const step = plan.steps[index];
      const observation = await executor.execute(step);
      if (step.kind === "docker-image-inspect") validateCorePostgresImageObservation(observation);
      if (step.kind === "postgres-readiness") validateCorePostgresReadinessObservation(observation);
      if (step.kind === "race-workers") validateCorePostgresRaceObservation(observation);
      if (faultAfter === index && faultWindow === "after") fail("POSTGRES_INJECTED_FAULT_AFTER_EFFECT_BEFORE_MARKER");
      if (typeof executor.checkpoint === "function" && !step.kind.startsWith("marker-")) {
        await executor.checkpoint(Object.freeze({ kind: "marker-update", completedKind: step.kind, bodyFree: true }));
      }
      completed.push(step.kind);
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (typeof executor.cleanup === "function") await executor.cleanup(Object.freeze({ containerName: CONTAINER_NAME, volumeName: VOLUME_NAME, runRoot: FUTURE_RUN_ROOT }));
  }
  if (primaryError) throw primaryError;
  return Object.freeze({ schemaVersion: "r4.gate-b-core-postgres-fake-result.v1", completed: Object.freeze(completed), realEffects: 0 });
}

export function inspectPostgresContract() {
  const files = Object.fromEntries(Object.entries(SQL_PATHS).map(([key, value]) => [key, exactFile(value)]));
  assertStaticContract(files);
  const fixtures = Object.fromEntries(Object.entries(FIXTURE_PATHS).map(([key, value]) => [key, exactFile(value)]));
  for (const source of Object.values(fixtures)) splitSqlStatements(source);
  splitSqlStatements(CORE_BASIS_ERRORS_SQL);
  const migrationFunctions = names(files.migration, /\bCREATE\s+FUNCTION\s+forme_r4\.([a-z0-9_]+)/giu);
  const migrationIndexes = names(files.migration, /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-z0-9_]+)/giu);
  const migrationTriggers = names(files.migration, /\bCREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+([a-z0-9_]+)/giu);
  return Object.freeze({
    schemaVersion: "r4_gate_b_core_postgres_static.v1",
    status: "CORE_CONSTRUCTED_STATIC_ONLY",
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
    nonRaceAssertionCount: NON_RACE_ASSERTIONS.length,
    lockOrder: LOCK_ORDER,
    fileHashes: Object.fromEntries([
      ...Object.entries(files).map(([key, value]) => [SQL_PATHS[key], sha256(value)]),
      ...Object.entries(fixtures).map(([key, value]) => [FIXTURE_PATHS[key], sha256(value)]),
      ["inline:CORE_BASIS_ERRORS_SQL", sha256(CORE_BASIS_ERRORS_SQL)],
    ]),
    physicalPlan: buildCorePostgresExecutionPlan(),
    deferredExecutionAssertions: [
      "bootstrap_apply_verify_rollback_reapply",
      "catalog_and_effective_privileges",
      "database_constraints_and_triggers",
      "thirteen_serializable_commit_order_races",
      "postgres_16_10_parser_and_runtime",
    ],
  });
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("POSTGRES_STATIC_COMMAND_INVALID");
  process.stdout.write(`${JSON.stringify(inspectPostgresContract())}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
