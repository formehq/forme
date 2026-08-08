import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, parseStrictJson } from "../packages/r4-protocol/src/index.ts";
import {
  CORE_CODEX_SCHEMA_COUNT,
  CORE_CODEX_SCHEMA_SHA256,
  CORE_CODEX_VERSION,
  buildCoreCodexLogicalCommand,
  coreCodexLayout,
  createCoreCodexWireGuard,
  validateCoreCodexLogicalCommand,
} from "../packages/r4-codex-adapter/src/zero-call-physical.ts";
import { buildCorePostgresStdin } from "./r4-gate-b-core-postgres.mjs";

export const PHYSICAL_AUTHORITY = Object.freeze({
  constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
  constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
  approvedProposalHead: "a45ea061e8e92f247597787e36ecfe52740b216a",
  approvedProposalTree: "89b28903fc34e985a17e8f3fdc4bfd7d0972880e",
  constructionRunId: "79b7775defbdaf043697ef9b6d0ab45c",
  hostBindingAdapterConstructionGrant: "APPROVED",
  retryExecutionGrant: "NOT_REQUESTED",
  firstProviderCallGrant: "NOT_REQUESTED",
});
export const POSTGRES_COUNTS = Object.freeze({ namedFamilies: 13, executableCases: 16, orderedExecutions: 32, concurrentCoreCalls: 64, recoveryCoreCalls: 4, expectedCoreCalls: 68, expected2xx: 39, expectedControlledNon2xx: 29, expectedNewReceipts: 37, persistedVerifiers: 32 });
export const CODEX_PROCESS_KINDS = Object.freeze(["version", "help", "schema", "initialize"]);
export const MACOS_PLAN_ORDER = Object.freeze([
  "preflight", "write-openssl-config", "compile", "assemble-bundle", "pre-sign-inventory", "default-keychain-pre", "search-list-pre",
  "derive-key-certificate", "derive-pkcs12", "custom-keychain-create", "custom-keychain-unlock", "custom-keychain-import",
  "custom-keychain-partition", "binding-canary-add", "binding-canary-find", "identity-inventory", "codesign-sign",
  "codesign-verify-strict", "codesign-entitlements", "codesign-designated-requirement", "codesign-test-requirement",
  "post-sign-inventory", "helper-spawn", "runtime-identity", "pre-body-network-sample", "feeder-spawn",
  "eof-commit-gate", "helper-receipt", "binding-canary-delete", "identity-delete", "custom-keychain-lock",
  "custom-keychain-delete", "default-keychain-post", "search-list-post", "cleanup", "absence-proof",
]);

const SHA = /^sha256:[0-9a-f]{64}$/u;
const ID = /^[0-9a-f]{32}$/u;
const MACOS_OPENSSL_CONFIG = `[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=Forme Gate B Synthetic\n[ext]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=codeSigning\nsubjectKeyIdentifier=hash\n`;
const MACOS_SYNTHETIC_CANDIDATE_PREIMAGE = Object.freeze({
  schemaVersion: "response_candidate.v1",
  candidateId: "candidate_cccccccccccccccccccccccccccccccc",
  interactionId: "interaction_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
  sessionEnvelopeId: "session_ssssssssssssssssssssssssssssssss",
  roomId: "room_rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
  projectionId: "proj_pppppppppppppppppppppppppppppppp",
  originState: "published_fresh",
  responseText: "Synthetic Forme Gate B response.\nApprove only this exact demonstration handoff.",
  sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
  twinBasisHash: `sha256:${"b".repeat(64)}`,
  snapshotManifestHash: `sha256:${"d".repeat(64)}`,
  sessionReceiptHash: `sha256:${"e".repeat(64)}`,
  policyHash: `sha256:${"f".repeat(64)}`,
  admittedAt: "2026-08-07T00:00:00.000Z",
  expiresAt: "2026-08-10T00:00:00.000Z",
});
const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const RACE_CATALOG_PATH = path.join(REPOSITORY_ROOT, "schemas/r4/gate-b-core/postgres/race-catalog.json");
const RACE_TEMPLATES = Object.freeze({
  setup: path.join(REPOSITORY_ROOT, "fixtures/r4-gate-b-core/postgres/core-race-setup.sql"),
  worker: path.join(REPOSITORY_ROOT, "fixtures/r4-gate-b-core/postgres/core-race-worker.sql"),
  verify: path.join(REPOSITORY_ROOT, "fixtures/r4-gate-b-core/postgres/core-race-verify.sql"),
});

export class PhysicalPortError extends Error {
  constructor(code) { super(code); this.name = "PhysicalPortError"; this.code = code; }
}
function fail(code) { throw new PhysicalPortError(code); }
function sha256(bytes) { return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`; }
function rawUtf8Sort(left, right) { return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8")); }
function exactObject(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code);
  return value;
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}
function closedFile(filePath) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(filePath) !== filePath) fail("PHYSICAL_CONTRACT_FILE_UNSAFE");
  return fs.readFileSync(filePath, "utf8");
}
export function macosSyntheticFrame() {
  const candidate = Object.freeze({ ...MACOS_SYNTHETIC_CANDIDATE_PREIMAGE, candidateHash: sha256(Buffer.from(canonicalJson(MACOS_SYNTHETIC_CANDIDATE_PREIMAGE), "utf8")) });
  return deepFreeze({
    schemaVersion: "transient_candidate_frame.v1",
    candidate,
    reservationId: "reservation_vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
    sessionEnvelopeHash: `sha256:${"1".repeat(64)}`,
    startAuthorizationHash: `sha256:${"a".repeat(64)}`,
  });
}
export function macosSyntheticFrameBytes() { return Buffer.from(canonicalJson(macosSyntheticFrame()), "utf8"); }

const MACOS_HELPER_RECEIPT_KEYS = new Set([
  "aggregateVerdict", "bodyBearingHandoffOutsideHelper", "candidateBodyFilesCreated", "candidateBodyStderrBytes",
  "candidateBodyStdoutBytes", "cleanupPassed", "controlledZeroizationPassed", "crashZeroizationClaimed",
  "fullPersistentLaneStatusChanged", "handoffCount", "networkCalls", "persistentCandidateRecoverySupported",
  "presenceCeremonies", "providerCalls", "reasonCode", "schemaVersion", "terminal",
]);
export function validateMacOSHelperTerminal({ stdout, stderr, exitCode, signal }) {
  if (!Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr) || !Number.isInteger(exitCode) || (signal !== null && typeof signal !== "string")) fail("MACOS_HELPER_TERMINAL_SHAPE");
  if (signal !== null || stderr.length !== 0) fail("MACOS_HELPER_TERMINAL_UNOBSERVED");
  if (exitCode === 64 && stdout.length === 0) return deepFreeze({ helperReceiptSha256: null, helperReceiptValidated: false, terminal: null, presenceCeremonies: null, presenceCeremoniesObserved: false, handoffCount: null, handoffCountObserved: false, helperControlledZeroizationPassed: null, helperCleanupPassed: null });
  if (stdout.length < 1 || stdout.length > 4096 || stdout.at(-1) !== 0x0a || stdout.subarray(0, -1).includes(0x0a) || stdout.includes(0x00)) fail("MACOS_HELPER_RECEIPT_FRAMING");
  let receipt;
  try { receipt = parseStrictJson(stdout.subarray(0, -1).toString("utf8")); } catch { fail("MACOS_HELPER_RECEIPT_JSON"); }
  exactObject(receipt, MACOS_HELPER_RECEIPT_KEYS, "MACOS_HELPER_RECEIPT_SHAPE");
  if (`${canonicalJson(receipt)}\n` !== stdout.toString("utf8")) fail("MACOS_HELPER_RECEIPT_NOT_CANONICAL");
  if (receipt.schemaVersion !== "r4.gate-b-core.macos-helper-receipt.v1" || !["approve_exact", "discard", "authority_expired", "controlled_failure"].includes(receipt.terminal) || receipt.reasonCode !== receipt.terminal) fail("MACOS_HELPER_RECEIPT_SEMANTICS");
  for (const key of ["candidateBodyFilesCreated", "candidateBodyStdoutBytes", "candidateBodyStderrBytes", "bodyBearingHandoffOutsideHelper", "providerCalls", "networkCalls"]) if (receipt[key] !== 0) fail("MACOS_HELPER_RECEIPT_BODY_OR_EFFECT");
  if (![0, 1].includes(receipt.handoffCount) || ![0, 1].includes(receipt.presenceCeremonies) || receipt.crashZeroizationClaimed !== false || receipt.persistentCandidateRecoverySupported !== false || receipt.fullPersistentLaneStatusChanged !== false || receipt.aggregateVerdict !== "YELLOW" || typeof receipt.controlledZeroizationPassed !== "boolean" || typeof receipt.cleanupPassed !== "boolean") fail("MACOS_HELPER_RECEIPT_SEMANTICS");
  if (receipt.terminal === "approve_exact") {
    if (exitCode !== 0 || receipt.handoffCount !== 1 || receipt.presenceCeremonies !== 1 || receipt.controlledZeroizationPassed !== true || receipt.cleanupPassed !== true) fail("MACOS_HELPER_RECEIPT_APPROVE_MISMATCH");
  } else {
    const expectedExit = receipt.terminal === "controlled_failure" ? 70 : 0;
    if (exitCode !== expectedExit || receipt.handoffCount !== 0) fail("MACOS_HELPER_RECEIPT_TERMINAL_MISMATCH");
  }
  return deepFreeze({ helperReceiptSha256: sha256(stdout), helperReceiptValidated: true, terminal: receipt.terminal, presenceCeremonies: receipt.presenceCeremonies, presenceCeremoniesObserved: true, handoffCount: receipt.handoffCount, handoffCountObserved: true, helperControlledZeroizationPassed: receipt.controlledZeroizationPassed, helperCleanupPassed: receipt.cleanupPassed });
}
export function validateMacOSSyntheticFeederCompletion({ exitCode, signal, candidateBytesWritten, expectedCandidateBytes, controlBytes, stdoutBytes, stderrBytes, markerObservedBeforeFeederExit }) {
  if (!Number.isInteger(exitCode) || (signal !== null && typeof signal !== "string") || !Number.isInteger(candidateBytesWritten) || !Number.isInteger(expectedCandidateBytes) || !Buffer.isBuffer(controlBytes) || !Buffer.isBuffer(stdoutBytes) || !Buffer.isBuffer(stderrBytes) || typeof markerObservedBeforeFeederExit !== "boolean") fail("MACOS_FEEDER_OBSERVATION_SHAPE");
  if (signal !== null || exitCode !== 0 || candidateBytesWritten !== expectedCandidateBytes || expectedCandidateBytes < 1 || expectedCandidateBytes > 32768 || markerObservedBeforeFeederExit || controlBytes.toString("utf8") !== "FRAME_COMPLETE\n" || stdoutBytes.length !== 0 || stderrBytes.length !== 0) fail("MACOS_FEEDER_COMPLETION_INVALID");
  return deepFreeze({ completionMarkerValidated: true, feederExitZero: true, eofReleaseAllowed: true, candidateBytesWritten });
}
export function loadRaceCatalog() {
  const catalog = JSON.parse(closedFile(RACE_CATALOG_PATH));
  return validateRaceCatalog(catalog);
}
export function validateRaceCatalog(catalog) {
  exactObject(catalog, new Set(["schemaVersion", "authority", "counts", "cases", "orders", "c09Recovery"]), "RACE_CATALOG_SHAPE");
  if (catalog.schemaVersion !== "r4.gate-b-core.postgres-race-catalog.v1" || catalog.authority !== PHYSICAL_AUTHORITY.constructionPacketSha256) fail("RACE_CATALOG_AUTHORITY");
  if (canonicalJson(catalog.counts) !== canonicalJson(POSTGRES_COUNTS)) fail("RACE_CATALOG_COUNTS");
  if (!Array.isArray(catalog.cases) || catalog.cases.length !== 16 || new Set(catalog.cases.map((row) => row.id)).size !== 16) fail("RACE_CATALOG_CASES");
  if (!Array.isArray(catalog.orders) || catalog.orders.length !== 32 || new Set(catalog.orders.map((row) => row.id)).size !== 32) fail("RACE_CATALOG_ORDERS");
  for (const caseRow of catalog.cases) {
    if (!/^C(?:0[1-9]|1[0-6])$/u.test(caseRow.id) || !/^tx_[a-z0-9_]+$/u.test(caseRow.aFunction) || !/^tx_[a-z0-9_]+$/u.test(caseRow.bFunction)) fail("RACE_CATALOG_FUNCTION");
  }
  let success = 0;
  let controlled = 0;
  let receipts = 0;
  for (const order of catalog.orders) {
    if (!catalog.cases.some((row) => row.id === order.caseId) || !["A", "B"].includes(order.first) || !Array.isArray(order.a) || !Array.isArray(order.b)) fail("RACE_ORDER_SHAPE");
    for (const result of [order.a, order.b]) {
      if (!Number.isInteger(result[0]) || !/^[a-z0-9_]+$/u.test(result[1])) fail("RACE_RESULT_SHAPE");
      if (result[0] >= 200 && result[0] < 300) success += 1; else controlled += 1;
    }
    if (![1, 2].includes(order.semanticEffectCount) || ![1, 2].includes(order.newReceiptCount)) fail("RACE_EFFECT_COUNT");
    receipts += order.newReceiptCount;
    if (order.a[0] >= 400 && order.aReceiptId !== undefined) fail("RACE_REJECTED_RECEIPT");
    if (order.b[0] >= 400 && order.bReceiptId !== undefined) fail("RACE_REJECTED_RECEIPT");
  }
  for (const recovery of catalog.c09Recovery) {
    success += recovery.winner[0] >= 200 && recovery.winner[0] < 300 ? 1 : 0;
    controlled += recovery.loser[0] >= 400 ? 1 : 0;
    receipts += recovery.newReceiptCount;
    if (recovery.domainEffectCount !== 0) fail("RACE_RECOVERY_DOMAIN_EFFECT");
  }
  if (success !== 39 || controlled !== 29 || receipts !== 37) fail("RACE_AGGREGATE_DRIFT");
  return deepFreeze(catalog);
}

const DIGEST = Object.freeze({
  binding: `sha256:${"b".repeat(64)}`, controller: `sha256:${"d".repeat(64)}`, curator: `sha256:${"e".repeat(64)}`,
  encounter: `sha256:${"1".repeat(64)}`, reply: `sha256:${"2".repeat(64)}`, deletion: `sha256:${"3".repeat(64)}`,
  edge: `sha256:${"5".repeat(64)}`, request: `sha256:${"6".repeat(64)}`, auth: `sha256:${"7".repeat(64)}`,
  session: `sha256:${"8".repeat(64)}`, payload: `sha256:${"9".repeat(64)}`, candidate: `sha256:${"a".repeat(64)}`,
});
const ENCRYPTED = `'${canonicalJson({ schemaVersion: "a256gcm.v1", algorithm: "AES-256-GCM", keyId: "r4.hosted.gate-b.synthetic.v1", nonce: "AAAAAAAAAAAAAAAA", ciphertext: "U1lOVEhFVElD", tag: "BBBBBBBBBBBBBBBBBBBBBB", aadHash: `sha256:${"c".repeat(64)}` })}'::jsonb`;
const IDS = Object.freeze({
  pairing: "pairing_gatebcore00000000001", binding: "binding_gatebcore00000000001", projection: "projection_gatebcore000000001",
  thirdPlace: "thirdplace_gatebcore000000001", encounterA: "encounter_gatebcore00000000a1", encounterB: "encounter_gatebcore00000000b1",
  interaction: "interaction_gatebcore000000001", offer: "offer_gatebcore0000000000001", grant: "grant_gatebcore0000000000001",
  chain: "chain_gatebcore0000000000001", reservation: "reservation_gatebcore00000001", permit: "permit_gatebcore000000000001",
  response: "response_gatebcore00000000001", basis: "basis_gatebcoreresponse0000001",
});
function raceUuid(orderId, actor) {
  const hex = crypto.createHash("sha256").update(`${orderId}:${actor}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function raceKey(orderId, actor, shared = false) {
  const compact = orderId.toLowerCase().replaceAll("-", "");
  return `race_${compact}_${shared ? "shared" : actor.toLowerCase()}_key_00000001`;
}
function requestHash(orderId, actor, shared = false) {
  const source = shared ? orderId : `${orderId}:${actor}`;
  return sha256(Buffer.from(`r4-race-request:${source}\n`, "utf8"));
}
function context(actorClass, subject, scope, orderId, actor, expectedVersion, shared = false) {
  return `ROW('${actorClass}',${subject === null ? "NULL" : `'${subject}'`},'${scope}','${raceKey(orderId, actor, shared)}','${requestHash(orderId, actor, shared)}',${expectedVersion === null ? "NULL" : expectedVersion},'${raceUuid(orderId, actor)}')::forme_r4.mutation_context_v1`;
}
function publicEncounterArgs(orderId, actor) {
  const shared = orderId.startsWith("C16-");
  const encounter = shared ? "encounter_gatebcore0000000c16" : actor === "A" ? IDS.encounterA : IDS.encounterB;
  return `${context("public", null, DIGEST.edge, orderId, actor, 2, shared)},'${IDS.projection}','${encounter}','${DIGEST.encounter}','${DIGEST.edge}'`;
}
function interactionArgs(orderId, actor) {
  const grant = orderId.startsWith("C08-");
  const sharedEncounter = orderId.startsWith("C02-");
  const submission = grant ? IDS.grant : sharedEncounter ? IDS.encounterA : actor === "A" ? IDS.encounterA : IDS.encounterB;
  const scope = grant ? DIGEST.reply : DIGEST.encounter;
  const interaction = `interaction_${orderId.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001`;
  return `${context(grant ? "manual_guest" : "manual_guest", null, scope, orderId, actor, null)},'${grant ? "grant" : "public_encounter"}','${submission}','${IDS.projection}','${interaction}','ask',${ENCRYPTED},128,'${DIGEST.request}',NULL,NULL,NULL,'g0_manual','allow_owner_local_ai','{"schemaVersion":"consent_envelope.v1","synthetic":true}'::jsonb,'${DIGEST.request}','reply_${orderId.toLowerCase().replaceAll("-", "")}_${actor.toLowerCase()}_00000001','${DIGEST.reply}','${DIGEST.deletion}'`;
}
function syntheticArgs(name, actor, orderId) {
  const controllerVersion = name === "tx_projection_revoke" || name === "tx_curation_unlist" ? 2 : 1;
  const controller = context("controller", "subject_gatebcorecontroller0001", DIGEST.controller, orderId, actor, controllerVersion);
  const curator = context("curator", "subject_gatebcorecurator000001", DIGEST.curator, orderId, actor, 2);
  const operatorVersion = name === "tx_fresh_cycle_reserve" ? 2 : name === "tx_room_operator_pull" ? 1 : name === "tx_response_deliver" ? 1 : 1;
  const operator = context("room_operator_v1", null, DIGEST.binding, orderId, actor, operatorVersion);
  if (name === "tx_room_pair_exchange") return `${context("public", null, DIGEST.candidate, orderId, actor, 1)},'${IDS.pairing}','${DIGEST.candidate}','${DIGEST.auth}','${IDS.binding}','${DIGEST.binding}','synthetic-sealed-envelope'::bytea,'${DIGEST.session}'`;
  if (name === "tx_public_encounter_issue") return publicEncounterArgs(orderId, actor);
  if (name === "tx_interaction_create") return interactionArgs(orderId, actor);
  if (name === "tx_grant_offer_accept") return `${context("manual_guest", null, DIGEST.reply, orderId, actor, 1)},'${IDS.offer}','${DIGEST.reply}','${IDS.grant}','${DIGEST.auth}','${IDS.chain}'`;
  if (name === "tx_grant_offer_revoke") return `${controller},'${IDS.offer}'`;
  if (name === "tx_fresh_cycle_reserve") {
    const reservation = orderId.startsWith("C09-") ? actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b" : IDS.reservation;
    return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${reservation}','${DIGEST.auth}','${DIGEST.session}'`;
  }
  if (name === "tx_fresh_cycle_recover") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.auth}','${DIGEST.session}'`;
  if (name === "tx_fresh_cycle_abandon_zero_dispatch") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.auth}','${DIGEST.session}',0`;
  if (name === "tx_dispatch_permit_issue") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.reservation}','${DIGEST.session}','${DIGEST.auth}','OpenAI','gpt-5','${DIGEST.payload}',1,'${IDS.permit}'`;
  if (name === "tx_response_deliver") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${IDS.response}',${ENCRYPTED},256,'${DIGEST.payload}','${DIGEST.candidate}','${DIGEST.request}','published_fresh','manual_owner_authored','${IDS.basis}','{"schemaVersion":"publication_attestation.v1","attestationId":"attestation_gatebcoreresp0001","bindingId":"${IDS.binding}","roomId":"room_gatebcorepublic00000001","artifactClass":"response","artifactId":"${IDS.response}","artifactHash":"${DIGEST.request}","issuedAt":"2026-08-07T00:00:00.000Z","expiresAt":"2026-08-08T00:00:00.000Z","hmacSha256":"${DIGEST.payload}"}'::jsonb`;
  if (name === "tx_interaction_close") return `${controller},'${IDS.interaction}'`;
  if (name === "tx_interaction_delete") return `${context("manual_guest", null, DIGEST.deletion, orderId, actor, 1)},'${IDS.interaction}','${DIGEST.deletion}'`;
  if (name === "tx_projection_revoke") return `${controller},'${IDS.projection}'`;
  if (name === "tx_room_operator_pull") return `${operator},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}'`;
  if (name === "tx_room_binding_revoke") return `${controller},'${IDS.binding}'`;
  if (name === "tx_curation_unlist") return `${curator},'${IDS.thirdPlace}','${IDS.projection}'`;
  fail(`RACE_FUNCTION_ARGUMENTS_MISSING:${name}`);
}
function baseScenarioRowsSql({ binding = true } = {}) {
  const rows = [
    `INSERT INTO forme_r4.rooms(room_id,schema_version,entity_id,home_third_place_id,label_ciphertext,room_kind,interaction_mode,status,version,event_high_water) VALUES('room_gatebcorepublic00000001','room.v1','entity_gatebcoreforme00000001','thirdplace_gatebcore000000001',${ENCRYPTED},'third_place_public','public_single','active',1,0);`,
    `INSERT INTO forme_r4.projections(projection_id,schema_version,room_id,entity_id,capsule_ciphertext,capsule_plaintext_bytes,title_scalar_count,summary_plaintext_bytes,disclosure_basis_id,publication_attestation_id,payload_hash,owner_state,curation_state,current,lifecycle_version,published_at,fresh_until,expires_at,changed_at) VALUES('${IDS.projection}','projection_capsule.v1','room_gatebcorepublic00000001','entity_gatebcoreforme00000001',${ENCRYPTED},1024,24,128,'basis_gatebcoreprojection000001','attestation_gatebcoreproj0001','${DIGEST.request}','published_fresh','admitted',true,2,transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',transaction_timestamp()+interval '2 days',transaction_timestamp()-interval '1 minute');`,
    `UPDATE forme_r4.rooms SET current_projection_id='${IDS.projection}' WHERE room_id='room_gatebcorepublic00000001';`,
  ];
  if (binding) rows.push(`INSERT INTO forme_r4.room_bindings(binding_id,schema_version,room_id,pairing_id,scope_version,secret_digest,client_public_key_hash,state,paired_at,expires_at,version) VALUES('${IDS.binding}','room_operator_binding.v1','room_gatebcorepublic00000001','pairing_gatebcorebasis000000001','room_operator.v1','${DIGEST.binding}','${DIGEST.auth}','active',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',1);`);
  return rows.join("\n");
}
function encounterSeedSql(encounterId, suffix) {
  return `INSERT INTO forme_r4.public_encounters(encounter_id,schema_version,room_id,projection_id,secret_digest,state,issued_at,expires_at,accepted_count,version,canonical_object_hash) VALUES('${encounterId}','public_encounter.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.encounter}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',0,1,'${DIGEST.request}');\nINSERT INTO forme_r4.rate_buckets(rate_event_id,room_id,scope,bucket_digest,source_object_id,committed_at,expires_at) VALUES('rate_encounter_seed_${suffix.padStart(16, "0")}','room_gatebcorepublic00000001','encounter_issue','${DIGEST.edge}','${encounterId}',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '23 hours');`;
}
function interactionSeedSql({ state = "accepted", version = 1, interactionId = IDS.interaction, originClass = "public_encounter", originId = "encounter_gatebcoreseed000001", unresolvedId = "scope_gatebcoreseed000000001", reply = DIGEST.reply, deletion = DIGEST.deletion } = {}) {
  return `INSERT INTO forme_r4.interactions(interaction_id,schema_version,room_id,projection_id,origin_projection_hash,origin_state_at_acceptance,origin_capability_class,origin_capability_id,unresolved_scope_id,interaction_type,request_ciphertext,request_plaintext_bytes,request_content_hash,guest_capsule_level,consent,accepted_at,expires_at,reply_capability_id,reply_capability_digest,delete_capability_digest,state,state_version,canonical_object_hash) VALUES('${interactionId}','interaction.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.request}','published_fresh','${originClass}','${originId}','${unresolvedId}','ask',${ENCRYPTED},128,'${DIGEST.request}','g0_manual','manual_owner_only',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day','reply_gatebcoreseed00000000001','${reply}','${deletion}','${state}',${version},'${DIGEST.request}');`;
}
function publicActiveSeedSql(count) {
  return `INSERT INTO forme_r4.interactions(interaction_id,schema_version,room_id,projection_id,origin_projection_hash,origin_state_at_acceptance,origin_capability_class,origin_capability_id,unresolved_scope_id,interaction_type,request_ciphertext,request_plaintext_bytes,request_content_hash,guest_capsule_level,consent,accepted_at,expires_at,reply_capability_id,reply_capability_digest,delete_capability_digest,state,state_version,canonical_object_hash) SELECT ('interaction_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,'interaction.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.request}','published_fresh','public_encounter',('encounter_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,('scope_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,'ask',${ENCRYPTED},128,'${DIGEST.request}','g0_manual','manual_owner_only',transaction_timestamp()-interval '2 hours',transaction_timestamp()+interval '1 day',('reply_race_seed_'||lpad(g::text,16,'0'))::forme_r4.r4_id,('sha256:'||lpad(to_hex(g),64,'0'))::forme_r4.sha256_digest,('sha256:'||lpad(to_hex(g+1000),64,'0'))::forme_r4.sha256_digest,'accepted',1,'${DIGEST.request}' FROM generate_series(1,${count}) AS g;`;
}
function rateSeedSql(scope, count, age, offset = 0) {
  return `INSERT INTO forme_r4.rate_buckets(rate_event_id,room_id,scope,bucket_digest,source_object_id,committed_at,expires_at) SELECT ('rate_race_seed_'||lpad((g+${offset})::text,16,'0'))::forme_r4.r4_id,'room_gatebcorepublic00000001','${scope}','${DIGEST.edge}',('source_race_seed_'||lpad((g+${offset})::text,16,'0'))::forme_r4.r4_id,transaction_timestamp()-interval '${age}',transaction_timestamp()+interval '12 hours' FROM generate_series(1,${count}) AS g;`;
}
function normalIssuedC06EncountersSql() {
  return `SET LOCAL ROLE forme_r4_app;
DO $c06_issue$
DECLARE a forme_r4.api_result_v1; b forme_r4.api_result_v1;
BEGIN
  a := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("C06-SETUP", "A")});
  b := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("C06-SETUP", "B")});
  IF (a).http_status<>201 OR (a).code<>'public_encounter_issued' OR (b).http_status<>201 OR (b).code<>'public_encounter_issued' THEN RAISE EXCEPTION 'c06_normal_issuance_setup_failed'; END IF;
END
$c06_issue$;
RESET ROLE;`;
}
function nonRacePublicBoundarySql() {
  const missingEncounter = `INSERT INTO forme_r4.public_encounters(encounter_id,schema_version,room_id,projection_id,secret_digest,state,issued_at,expires_at,accepted_count,version,canonical_object_hash) VALUES('${IDS.encounterA}','public_encounter.v1','room_gatebcorepublic00000001','${IDS.projection}','${DIGEST.encounter}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',0,1,'${DIGEST.request}');`;
  const missingInteraction = interactionArgs("NONRACE-MISSING", "A");
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE forme_r4_migrate;
${baseScenarioRowsSql()}
${publicActiveSeedSql(20)}
${missingEncounter}
SET LOCAL ROLE forme_r4_app;
DO $nonrace$
DECLARE limited forme_r4.api_result_v1; missing forme_r4.api_result_v1;
BEGIN
  limited := forme_r4.tx_public_encounter_issue(${publicEncounterArgs("NONRACE-CAP20", "B")});
  IF (limited).http_status<>429 OR (limited).code<>'rate_limited' OR (limited).receipt_id IS NOT NULL THEN RAISE EXCEPTION 'public_issue_active_cap20_not_closed'; END IF;
  missing := forme_r4.tx_interaction_create(${missingInteraction});
  IF (missing).http_status<>409 OR (missing).code<>'capability_unavailable' OR (missing).target_id<>'${IDS.encounterA}' OR (missing).target_version<>1 OR (missing).receipt_id IS NOT NULL OR (missing).result<>jsonb_build_object('code','capability_unavailable') THEN RAISE EXCEPTION 'public_missing_issuance_lineage_not_closed'; END IF;
  IF EXISTS (SELECT 1 FROM forme_r4.idempotency_records) OR EXISTS (SELECT 1 FROM forme_r4.operation_receipts) THEN RAISE EXCEPTION 'public_nonrace_error_mutated_receipts'; END IF;
END
$nonrace$;
COMMIT;
`;
}
function scenarioSetupSql(caseId) {
  const rows = [baseScenarioRowsSql({ binding: caseId !== "C01" })];
  if (caseId === "C01") rows.push(`INSERT INTO forme_r4.pairing_challenges(pairing_id,schema_version,room_id,pairing_code_digest,state,issued_at,expires_at,version) VALUES('${IDS.pairing}','pairing_challenge.v1','room_gatebcorepublic00000001','${DIGEST.candidate}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '10 minutes',1);`);
  if (caseId === "C02") rows.push(encounterSeedSql(IDS.encounterA, "2"));
  if (caseId === "C03") rows.push(publicActiveSeedSql(19), encounterSeedSql(IDS.encounterA, "31"), encounterSeedSql(IDS.encounterB, "32"));
  if (caseId === "C04") rows.push(rateSeedSql("encounter_issue", 9, "30 minutes", 40));
  if (caseId === "C05") rows.push(rateSeedSql("encounter_issue", 49, "2 hours", 50));
  if (caseId === "C06") rows.push(rateSeedSql("public_accept", 2, "2 hours", 600), normalIssuedC06EncountersSql());
  if (caseId === "C07") rows.push(interactionSeedSql(), `INSERT INTO forme_r4.grant_offers(offer_id,schema_version,source_interaction_id,target_room_id,target_projection_id,preset_id,state,issued_at,acceptance_expires_at,offered_grant_expires_at,version,canonical_object_hash) VALUES('${IDS.offer}','grant_offer.v1','${IDS.interaction}','room_gatebcorepublic00000001','${IDS.projection}','short_exchange','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',transaction_timestamp()+interval '2 days',1,'${DIGEST.request}');`);
  if (caseId === "C08") rows.push(publicActiveSeedSql(20), rateSeedSql("public_accept", 3, "2 hours", 800), `INSERT INTO forme_r4.grants(grant_id,schema_version,room_id,projection_id,reentry_chain_id,preset_id,secret_digest,state,issued_at,expires_at,accepted_count,accepted_quota,agent_derivation_allowed,version,canonical_object_hash) VALUES('${IDS.grant}','grant.v1','room_gatebcorepublic00000001','${IDS.projection}','${IDS.chain}','short_exchange','${DIGEST.reply}','issued',transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '1 day',1,2,false,1,'${DIGEST.request}');`);
  if (caseId === "C09") rows.push(interactionSeedSql({ state: "seen_locally", version: 2 }));
  if (caseId === "C10") rows.push(interactionSeedSql({ state: "preparing", version: 1 }), `INSERT INTO forme_r4.fresh_cycle_reservations(reservation_id,schema_version,interaction_id,start_authorization_hash,session_envelope_hash,state,idempotency_key,reserved_at,version,canonical_object_hash) VALUES('${IDS.reservation}','fresh_cycle_reservation.v1','${IDS.interaction}','${DIGEST.auth}','${DIGEST.session}','reserved','race_reservation_seed_key_0001',transaction_timestamp()-interval '1 minute',1,'${DIGEST.request}');`);
  if (["C11", "C12", "C13"].includes(caseId)) rows.push(interactionSeedSql({ state: "seen_locally", version: 1 }));
  if (caseId === "C14") rows.push(interactionSeedSql({ state: "accepted", version: 1 }));
  return rows.join("\n");
}
function scenarioVerifierSql(order) {
  const winner = order.first.toLowerCase();
  const expectedReceipts = order.newReceiptCount + (order.caseId === "C09" ? 1 : 0);
  const shared = order.caseId === "C16";
  const expectedKeys = [
    ...(order.a[0] < 300 ? [raceKey(order.id, "A", shared)] : []),
    ...(order.b[0] < 300 ? [raceKey(order.id, "B", shared)] : []),
  ];
  const rejectedKeys = [
    ...(order.a[0] >= 300 ? [raceKey(order.id, "A", shared)] : []),
    ...(order.b[0] >= 300 ? [raceKey(order.id, "B", shared)] : []),
  ];
  if (order.caseId === "C09") expectedKeys.push(raceKey(`${order.id}-recover-winner`, order.first, false));
  const quotedKeys = [...new Set(expectedKeys)].map((value) => `'${value}'`).join(",");
  const predicates = [`(SELECT count(*) FROM forme_r4.operation_receipts WHERE idempotency_key IN (${quotedKeys}))=${expectedReceipts}`, `(SELECT count(*) FROM forme_r4.idempotency_records WHERE idempotency_key IN (${quotedKeys}))=${expectedReceipts}`];
  for (const rejectedKey of new Set(rejectedKeys)) {
    predicates.push(
      `(SELECT count(*) FROM forme_r4.operation_receipts WHERE idempotency_key='${rejectedKey}')=0`,
      `(SELECT count(*) FROM forme_r4.idempotency_records WHERE idempotency_key='${rejectedKey}')=0`,
    );
  }
  if (order.caseId === "C01") predicates.push("(SELECT state='exchanged' AND version=2 FROM forme_r4.pairing_challenges WHERE pairing_id='pairing_gatebcore00000000001')", "(SELECT count(*) FROM forme_r4.room_bindings)=1");
  if (order.caseId === "C02") predicates.push("(SELECT count(*) FROM forme_r4.interactions)=1", "(SELECT state='consumed' AND accepted_count=1 AND version=2 FROM forme_r4.public_encounters WHERE encounter_id='encounter_gatebcore00000000a1')");
  if (order.caseId === "C03") predicates.push("(SELECT count(*) FROM forme_r4.interactions WHERE origin_capability_class='public_encounter' AND state IN ('accepted','seen_locally','preparing'))=20");
  if (order.caseId === "C04") predicates.push(`(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='encounter_issue' AND committed_at>transaction_timestamp()-interval '1 hour')=10`);
  if (order.caseId === "C05") predicates.push(`(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='encounter_issue' AND committed_at>transaction_timestamp()-interval '24 hours')=50`);
  if (order.caseId === "C06") predicates.push("(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='public_accept')=3", "(SELECT count(*) FROM forme_r4.interactions)=1");
  if (order.caseId === "C07") predicates.push(order.first === "A" ? `(SELECT state='accepted' AND version=2 FROM forme_r4.grant_offers WHERE offer_id='${IDS.offer}') AND (SELECT count(*) FROM forme_r4.grants)=1` : `(SELECT state='owner_revoked' AND version=2 FROM forme_r4.grant_offers WHERE offer_id='${IDS.offer}') AND (SELECT count(*) FROM forme_r4.grants)=0`);
  if (order.caseId === "C08") predicates.push("(SELECT accepted_count=2 AND version=2 FROM forme_r4.grants WHERE grant_id='grant_gatebcore0000000000001')", "(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='public_accept')=3");
  if (order.caseId === "C09") predicates.push(`(SELECT count(*) FROM forme_r4.fresh_cycle_reservations)=1`, `(SELECT reservation_id='${order.first === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b"}' FROM forme_r4.fresh_cycle_reservations LIMIT 1)`);
  if (order.caseId === "C10") predicates.push(`(SELECT state='${order.first === "A" ? "dispatch_committed" : "released_zero_dispatch"}' AND version=2 FROM forme_r4.fresh_cycle_reservations WHERE reservation_id='${IDS.reservation}')`, `(SELECT count(*) FROM forme_r4.dispatch_permits)=${order.first === "A" ? 1 : 0}`);
  if (["C11", "C12"].includes(order.caseId)) predicates.push(`(SELECT state='${order.first === "A" ? "response_ready" : order.caseId === "C11" ? "closed_without_response" : "deleted"}' FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`, `(SELECT count(*) FROM forme_r4.responses)=${order.first === "A" ? 1 : 0}`);
  if (order.caseId === "C13") predicates.push(`(SELECT owner_state='revoked' AND current=false AND body_readable=false FROM forme_r4.projections WHERE projection_id='${IDS.projection}')`, `(SELECT count(*) FROM forme_r4.responses)=${order.first === "A" ? 1 : 0}`);
  if (order.caseId === "C14") predicates.push(`(SELECT state='revoked' FROM forme_r4.room_bindings WHERE binding_id='${IDS.binding}')`, `(SELECT state='${order.first === "A" ? "seen_locally" : "accepted"}' FROM forme_r4.interactions WHERE interaction_id='${IDS.interaction}')`);
  if (order.caseId === "C15") predicates.push(`(SELECT curation_state='unlisted' FROM forme_r4.projections WHERE projection_id='${IDS.projection}')`, `(SELECT count(*) FROM forme_r4.public_encounters)=${order.first === "B" ? 1 : 0}`);
  if (order.caseId === "C16") {
    const winnerReceipt = `receipt_encounter_issue_${raceUuid(order.id, order.first).replaceAll("-", "")}`;
    predicates.push(
      "(SELECT count(*) FROM forme_r4.public_encounters)=1",
      "(SELECT count(*) FROM forme_r4.rate_buckets WHERE scope='encounter_issue')=1",
      `(SELECT count(*)=1 AND bool_and(receipt_id='${winnerReceipt}' AND target_id='encounter_gatebcore0000000c16' AND target_version=1 AND body_free_code='public_encounter_issued') FROM forme_r4.operation_receipts WHERE action='public_encounter.issue')`,
      `(SELECT count(*)=1 AND bool_and(receipt_id='${winnerReceipt}' AND http_status=201 AND result_code='public_encounter_issued' AND body_free_result IS NOT NULL) FROM forme_r4.idempotency_records WHERE action='public_encounter.issue')`,
    );
  }
  predicates.push(`'${winner}' IN ('a','b')`);
  return `DO $verify$ BEGIN IF NOT (${predicates.join(" AND ")}) THEN RAISE EXCEPTION 'race_persisted_state_mismatch:${order.id}'; END IF; END $verify$;`;
}
function replaceAllExact(template, replacements) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    const marker = `{{${token}}}`;
    if (!output.includes(marker)) fail("RACE_TEMPLATE_TOKEN_MISSING");
    output = output.replaceAll(marker, value);
  }
  if (/\{\{[A-Z0-9_]+\}\}/u.test(output)) fail("RACE_TEMPLATE_TOKEN_UNRESOLVED");
  return output;
}
function splitRaceWorkerInput(input, actor) {
  const marker = `-- COMMIT_GATE ${actor}\n`;
  const index = input.indexOf(marker);
  if (index < 0 || input.indexOf(marker, index + marker.length) >= 0) fail("RACE_WORKER_COMMIT_GATE_INVALID");
  return deepFreeze({ prefix: input.slice(0, index + marker.length), suffix: input.slice(index + marker.length) });
}
export function composeRaceArtifacts(catalog = loadRaceCatalog()) {
  const templates = Object.fromEntries(Object.entries(RACE_TEMPLATES).map(([key, value]) => [key, closedFile(value)]));
  const entries = [];
  for (const order of catalog.orders) {
    const caseRow = catalog.cases.find((row) => row.id === order.caseId);
    const orderToken = order.first === "A" ? "A-B" : "B-A";
    const setup = replaceAllExact(templates.setup, { CASE_ID: order.caseId, ORDER_ID: orderToken, EXACT_SCENARIO_SETUP_SQL: scenarioSetupSql(order.caseId) });
    const workers = {};
    for (const actor of ["A", "B"]) {
      const fn = actor === "A" ? caseRow.aFunction : caseRow.bFunction;
      const expected = actor === "A" ? order.a : order.b;
      const call = `SELECT (r).http_status AS http_status,(r).code AS code,COALESCE((r).target_id::text,'') AS target_id,COALESCE((r).target_version::text,'') AS target_version,COALESCE((r).receipt_id::text,'') AS receipt_id FROM (SELECT forme_r4.${fn}(${syntheticArgs(fn, actor, order.id)}) AS r) AS exact_call`;
      const c16 = order.caseId === "C16";
      const winnerReceipt = c16 ? `receipt_encounter_issue_${raceUuid(order.id, order.first).replaceAll("-", "")}` : "";
      workers[actor] = replaceAllExact(templates.worker, { ACTOR: actor, ACTOR_START_KEY: String(BigInt(`0x${crypto.createHash("sha256").update(`${order.id}:${actor}`).digest("hex").slice(0, 15)}`)), EXACT_CORE_CALL_SQL: call, EXPECTED_HTTP: String(expected[0]), EXPECTED_CODE: expected[1], EXPECT_RECEIPT: expected[0] < 300 ? "true" : "false", EXPECTED_EXACT_TARGET: c16 ? "encounter_gatebcore0000000c16" : "", EXPECTED_EXACT_VERSION: c16 ? "1" : "", EXPECTED_EXACT_RECEIPT: winnerReceipt });
    }
    const verify = replaceAllExact(templates.verify, { CASE_ID: order.caseId, ORDER_ID: orderToken, EXACT_PERSISTED_ASSERTION_SQL: scenarioVerifierSql(order) });
    const second = order.first === "A" ? "B" : "A";
    const observer = `WITH RECURSIVE poll(attempt,ok) AS (SELECT 1,EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE pid=:second_pid AND state='active' AND wait_event_type='Lock' AND :first_pid=ANY(pg_catalog.pg_blocking_pids(pid)) AND cardinality(pg_catalog.pg_blocking_pids(pid))=1) UNION ALL SELECT attempt+1,EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE pid=:second_pid AND state='active' AND wait_event_type='Lock' AND :first_pid=ANY(pg_catalog.pg_blocking_pids(pid)) AND cardinality(pg_catalog.pg_blocking_pids(pid))=1) FROM poll CROSS JOIN LATERAL (SELECT pg_catalog.pg_sleep(0.025)) AS delay WHERE NOT ok AND attempt<200) SELECT CASE WHEN pg_catalog.bool_or(ok) THEN 'OBSERVER_OK' ELSE pg_catalog.current_setting('forme_r4.closed_race_observer_rejected') END AS body_free_marker FROM poll;`;
    const controller = `${order.id}\nHOLD_SESSION_LOCKS:A,B\nWAIT_READY:A,B:5000\nRELEASE_START:${order.first}\nWAIT_POST_CALL:${order.first}:5000\nRELEASE_START:${second}\nWAIT_CALL_STARTED:${second}:5000\nOBSERVER_ROLE:postgres\nOBSERVER_SQL_SHA256:${sha256(observer)}\nREQUIRE_BLOCKED:${second}<-${order.first}\nCOMMIT_GATE:${order.first}\nWAIT_COMMIT_ACK:${order.first}:5000\nWAIT_POST_CALL:${second}:5000\nCOMMIT_GATE:${second}\nWAIT_COMMIT_ACK:${second}:5000\nREAP_AND_PROVE_ABSENT:A,B,OBSERVER\n`;
    entries.push(deepFreeze({ orderId: order.id, setup, workers, verify, observer, controller }));
  }
  return deepFreeze(entries);
}
export function raceByteIndex(catalog = loadRaceCatalog()) {
  const artifacts = composeRaceArtifacts(catalog);
  const entries = artifacts.map((row) => ({ orderId: row.orderId, setupSha256: sha256(row.setup), workerASha256: sha256(row.workers.A), workerBSha256: sha256(row.workers.B), controllerSha256: sha256(row.controller), verifierSha256: sha256(row.verify) }));
  const recovery = composeRaceRecoveries(catalog).map((row) => ({ orderId: row.orderId, kind: row.kind, inputSha256: sha256(row.input), resultSha256: sha256(canonicalJson(row.result)) }));
  return deepFreeze({ schemaVersion: "r4.gate-b-core.postgres-race-byte-index.v1", constructionPacketSha256: PHYSICAL_AUTHORITY.constructionPacketSha256, templateHashes: Object.fromEntries(Object.entries(RACE_TEMPLATES).map(([key, value]) => [key, sha256(closedFile(value))])), orderCount: 32, entries, recoveryInputCount: 4, recovery });
}
export function composeRaceRecoveries(catalog = loadRaceCatalog()) {
  return deepFreeze(catalog.c09Recovery.flatMap((row) => ["winner", "loser"].map((kind) => {
    const actor = kind === "winner" ? row.orderId.endsWith("A-B") ? "A" : "B" : row.orderId.endsWith("A-B") ? "B" : "A";
    const reservation = kind === "winner" ? actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b" : actor === "A" ? "reservation_gatebcore0000000a" : "reservation_gatebcore0000000b";
    const input = `SELECT (forme_r4.tx_fresh_cycle_recover(${context("room_operator_v1", null, DIGEST.binding, `${row.orderId}-recover-${kind}`, actor, 1)},'${IDS.binding}','${DIGEST.binding}','${IDS.interaction}','${reservation}','${DIGEST.auth}','${DIGEST.session}')).*;\n`;
    return { orderId: row.orderId, kind, actor, input, result: row[kind] };
  })));
}

export function buildPostgresPhysicalPlan(binding, manifestSha256, runId) {
  exactObject(binding, new Set(["dockerCli", "dockerUnixSocket", "localImageId"]), "POSTGRES_BINDING_SHAPE");
  if (!path.isAbsolute(binding.dockerCli) || !path.isAbsolute(binding.dockerUnixSocket) || !SHA.test(binding.localImageId) || !SHA.test(manifestSha256) || !ID.test(runId)) fail("POSTGRES_PLAN_AUTHORITY_INVALID");
  const host = `unix://${binding.dockerUnixSocket}`;
  const name = `forme-r4-core-${runId}`;
  const volume = `forme-r4-core-${runId}`;
  const runRoot = `/private/tmp/forme-r4-gate-b-postgres-${runId}`;
  const base = [binding.dockerCli, "--host", host];
  const environment = deepFreeze({ HOME: `${runRoot}/home`, DOCKER_CONFIG: `${runRoot}/docker-config`, TMPDIR: `${runRoot}/tmp`, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" });
  const docker = (kind, tail, effect, extra = {}) => deepFreeze({ kind, executable: binding.dockerCli, argv: [...base.slice(1), ...tail], environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exit-zero-stderr-zero", effect, ...extra });
  const psqlArgv = ["--host", host, "exec", "--user", "postgres", "--interactive", name, "/usr/bin/psql", "-X", "--no-password", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", "forme_r4_gate_b", "--no-align", "--tuples-only", "--quiet"];
  const psql = (kind, stdinText, extra = {}) => deepFreeze({ kind, executable: binding.dockerCli, argv: psqlArgv, environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "exact-plan-bytes", stdinText, stdinSha256: sha256(Buffer.from(stdinText, "utf8")), deadlineMilliseconds: 120_000, stdoutLimitBytes: 1_048_576, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "psql-body-free-closed", effect: "postgres-sql", ...extra });
  const marker = (kind) => deepFreeze({ kind, executable: null, argv: [], environment: {}, cwd: runRoot, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 0, stdoutLimitBytes: 0, stderrLimitBytes: 0, expectedExitCodes: [], outputParser: "journal-fsync", effect: "body-free-marker" });
  const catalog = loadRaceCatalog();
  const artifacts = composeRaceArtifacts(catalog);
  const recoveries = composeRaceRecoveries(catalog);
  const steps = [
    marker("capsule-revalidate"),
    docker("container-collision-check", ["container", "inspect", "--format", "{{json .Config.Labels}}", name], "read-only-exact-name", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-name-must-be-absent" }),
    docker("volume-collision-check", ["volume", "inspect", "--format", "{{json .Labels}}", volume], "read-only-exact-name", { expectedExitCodes: [1], stderrLimitBytes: 4096, outputParser: "exact-name-must-be-absent" }),
    docker("volume-create", ["volume", "create", "--label", `forme.run=${runId}`, volume], "volume-create"),
    docker("container-create", ["create", "--pull=never", "--name", name, "--label", `forme.run=${runId}`, "--platform", "linux/arm64", "--network", "none", "--env", "POSTGRES_DB=forme_r4_gate_b", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--volume", `${volume}:/var/lib/postgresql/data`, "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"], "container-create"),
    marker("container-created-marker"),
    docker("container-start", ["start", name], "container-start"),
    marker("container-started-marker"),
    docker("readiness", ["exec", "--user", "postgres", name, "/usr/bin/pg_isready", "--username", "postgres", "--dbname", "forme_r4_gate_b", "--timeout", "1"], "read-only", { maximumAttempts: 30, intervalMilliseconds: 250, deadlineMilliseconds: 10_000, outputParser: "pg-isready-bounded" }),
  ];
  for (const sqlKey of ["bootstrap", "migration", "basisErrors", "basis", "verify", "happy", "errors", "verify", "rollback"]) steps.push(psql(`baseline-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256), { sqlKey }));
  for (const sqlKey of ["bootstrap", "migration", "basis"]) steps.push(psql(`nonrace-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256), { sqlKey }));
  steps.push(psql("nonrace-public-boundaries", nonRacePublicBoundarySql(), { sqlKey: "nonrace-public-boundaries", expectedAssertions: ["public_issue_active_cap20_not_closed", "public_missing_issuance_lineage_not_closed"] }));
  steps.push(psql("nonrace-rollback", buildCorePostgresStdin("rollback", manifestSha256), { sqlKey: "rollback" }));
  for (const artifact of artifacts) {
    for (const sqlKey of ["bootstrap", "migration", "basis"]) steps.push(psql(`${artifact.orderId}-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256), { orderId: artifact.orderId, sqlKey }));
    steps.push(psql(`${artifact.orderId}-setup`, artifact.setup, { orderId: artifact.orderId, sqlKey: "race-setup" }));
    const workerA = splitRaceWorkerInput(artifact.workers.A, "A");
    const workerB = splitRaceWorkerInput(artifact.workers.B, "B");
    steps.push(deepFreeze({ kind: `${artifact.orderId}-controller`, operation: "read-committed-overlap-controller", orderId: artifact.orderId, executable: binding.dockerCli, argv: psqlArgv, environment, cwd: `${runRoot}/neutral-cwd`, shell: false, callerArguments: 0, stdinSource: "two-worker-and-controller-byte-index", workerAStdin: artifact.workers.A, workerAStdinSha256: sha256(Buffer.from(artifact.workers.A, "utf8")), workerAPrefix: workerA.prefix, workerAPrefixSha256: sha256(Buffer.from(workerA.prefix, "utf8")), workerASuffix: workerA.suffix, workerASuffixSha256: sha256(Buffer.from(workerA.suffix, "utf8")), workerBStdin: artifact.workers.B, workerBStdinSha256: sha256(Buffer.from(artifact.workers.B, "utf8")), workerBPrefix: workerB.prefix, workerBPrefixSha256: sha256(Buffer.from(workerB.prefix, "utf8")), workerBSuffix: workerB.suffix, workerBSuffixSha256: sha256(Buffer.from(workerB.suffix, "utf8")), observerStdin: artifact.observer, observerStdinSha256: sha256(Buffer.from(artifact.observer, "utf8")), controllerProtocol: artifact.controller, controllerProtocolSha256: sha256(Buffer.from(artifact.controller, "utf8")), deadlineMilliseconds: 30_000, stdoutLimitBytes: 1_048_576, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exact-race-arm-and-lock-observer", processGroupCount: 3, effect: "postgres-race-core-calls" }));
    for (const recovery of recoveries.filter((row) => row.orderId === artifact.orderId)) steps.push(psql(`${artifact.orderId}-recover-${recovery.kind}`, recovery.input, { orderId: artifact.orderId, recoveryKind: recovery.kind, expectedResult: recovery.result, sqlKey: "c09-recovery" }));
    steps.push(psql(`${artifact.orderId}-verify`, artifact.verify, { orderId: artifact.orderId, sqlKey: "race-verifier" }));
    steps.push(psql(`${artifact.orderId}-rollback`, buildCorePostgresStdin("rollback", manifestSha256), { orderId: artifact.orderId, sqlKey: "rollback" }));
  }
  for (const sqlKey of ["bootstrap", "migration", "basis", "verify", "rollback"]) steps.push(psql(`final-${sqlKey}`, buildCorePostgresStdin(sqlKey, manifestSha256), { sqlKey }));
  steps.push(docker("container-remove", ["rm", "--force", name], "container-remove"), docker("volume-remove", ["volume", "rm", volume], "volume-remove"), marker("postgres-absence-proof"));
  return deepFreeze({
    schemaVersion: "r4.gate-b-core.postgres-physical-plan.v1", manifestSha256, runId, runRoot, containerName: name, volumeName: volume, imageReference: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", localImageId: binding.localImageId,
    steps: deepFreeze(steps), orderedExecutions: 32, expectedCoreCalls: 68, expected2xx: 39, expectedControlledNon2xx: 29, expectedNewReceipts: 37, persistedVerifiers: 32, byteIndexSha256: sha256(Buffer.from(canonicalJson(raceByteIndex()), "utf8")),
  });
}

export function buildCodexPhysicalPlan(runRoot) {
  const layout = coreCodexLayout(runRoot);
  const commands = CODEX_PROCESS_KINDS.map((kind) => {
    const logical = buildCoreCodexLogicalCommand(layout, kind);
    validateCoreCodexLogicalCommand(layout, logical);
    return deepFreeze({ ...logical, shell: false, detached: true, executable: "/usr/bin/sandbox-exec", termGraceMilliseconds: 2000, killGraceMilliseconds: 2000 });
  });
  return deepFreeze({ schemaVersion: "r4.gate-b-core.codex-physical-plan.v1", version: CORE_CODEX_VERSION, schemaFileCount: CORE_CODEX_SCHEMA_COUNT, schemaAggregateSha256: CORE_CODEX_SCHEMA_SHA256, commands, processStartSlots: 4, threadStarts: 0, turnStarts: 0, providerCalls: 0, networkAuthority: 0, postResponseFinalityProven: false, causalFinality: "UNPROVEN_ACCEPTED" });
}
export function evaluateCodexWireChunks(chunks, validateInitializeResult) {
  if (!Array.isArray(chunks) || chunks.some((chunk) => !Buffer.isBuffer(chunk))) fail("CODEX_WIRE_CHUNKS_INVALID");
  const guard = createCoreCodexWireGuard(validateInitializeResult);
  let buffer = Buffer.alloc(0);
  let writes = 1;
  let responseCandidate = false;
  let violation = false;
  let secondWriteCommitted = false;
  for (const chunk of chunks) {
    if (violation) break;
    const prior = buffer;
    buffer = Buffer.concat([prior, chunk]);
    prior.fill(0);
    while (true) {
      const lf = buffer.indexOf(0x0a);
      if (lf < 0) break;
      const line = Buffer.from(buffer.subarray(0, lf));
      const remainder = Buffer.from(buffer.subarray(lf + 1));
      buffer.fill(0); buffer = remainder;
      try {
        if (!guard.acceptLine(line)) violation = true;
        else if (/"id"\s*:\s*0/u.test(line.toString("utf8"))) responseCandidate = true;
      } catch { violation = true; }
      finally { line.fill(0); }
      if (violation) break;
    }
    if (!secondWriteCommitted && responseCandidate) {
      if (buffer.length === 0 && !violation) { writes = 2; secondWriteCommitted = true; }
      else violation = true;
    }
  }
  let summary = null;
  if (!violation && buffer.length === 0) { try { summary = guard.finish(); } catch { violation = true; } }
  else if (buffer.length > 0) violation = true;
  buffer.fill(0);
  return deepFreeze({ writes, violation, secondWriteCommitted, postResponseFinalityProven: false, causalFinality: "UNPROVEN_ACCEPTED", summary });
}

export function buildMacOSPhysicalPlan(binding, manifestSha256, runId) {
  exactObject(binding, new Set(["swiftc", "sdkPath", "codesign", "security", "openssl", "lsof", "node"]), "MACOS_BINDING_SHAPE");
  if (!SHA.test(manifestSha256) || !ID.test(runId) || Object.values(binding).some((value) => !path.isAbsolute(value))) fail("MACOS_PLAN_AUTHORITY_INVALID");
  const root = `/private/tmp/forme-r4-gate-b-core-${runId}`;
  const build = `${root}/build`;
  const app = `${root}/FormeCoreLocal.app`;
  const executable = `${app}/Contents/MacOS/FormeCoreLocal`;
  const keychain = `${root}/signing/forme-core.keychain-db`;
  const key = `${root}/signing/key.pem`;
  const cert = `${root}/signing/cert.pem`;
  const p12 = `${root}/signing/identity.p12`;
  const opensslConfig = `${root}/signing/openssl.cnf`;
  const entitlements = path.join(REPOSITORY_ROOT, "native/macos/Resources/FormeCoreLocal.entitlements");
  const sourceRoot = path.join(REPOSITORY_ROOT, "native/macos/Sources/FormeCoreLocal");
  const sourceFiles = fs.readdirSync(sourceRoot).filter((name) => name.endsWith(".swift")).sort(rawUtf8Sort).map((name) => path.join(sourceRoot, name));
  const environment = deepFreeze({ HOME: `${root}/isolated-home`, TMPDIR: `${root}/tmp`, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" });
  const internal = (kind, operation, extra = {}) => deepFreeze({ kind, operation, executable: null, argv: [], cwd: root, environment: {}, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 0, stderrLimitBytes: 0, expectedExitCodes: [], outputParser: "internal-closed", ...extra });
  const commandStep = (kind, tool, argv, extra = {}) => deepFreeze({ kind, operation: "spawn-exact", executable: tool, argv, cwd: root, environment, shell: false, callerArguments: 0, stdinSource: "none", deadlineMilliseconds: 30_000, stdoutLimitBytes: 65_536, stderrLimitBytes: 0, expectedExitCodes: [0], outputParser: "exit-zero-stderr-zero", ...extra });
  const requirement = `designated => identifier \"org.chaostudio.forme.gate-b.core-local\" and certificate leaf = H\"<OBSERVED_CERT_SHA1>\"`;
  const byKind = {
    preflight: internal("preflight", "revalidate-host-binding-and-owned-root"),
    "write-openssl-config": internal("write-openssl-config", "o-excl-write-fsync", { targetPath: opensslConfig, targetMode: 0o600, exactBytesSha256: sha256(Buffer.from(MACOS_OPENSSL_CONFIG, "utf8")), exactBytes: MACOS_OPENSSL_CONFIG }),
    compile: commandStep("compile", binding.swiftc, ["-sdk", binding.sdkPath, "-target", "arm64-apple-macos26.0", "-swift-version", "6", "-parse-as-library", ...sourceFiles, "-o", `${build}/FormeCoreLocal`], { deadlineMilliseconds: 120_000 }),
    "assemble-bundle": internal("assemble-bundle", "exact-fs-api-bundle-assembly"),
    "pre-sign-inventory": internal("pre-sign-inventory", "recursive-inventory-exact-pre-sign"),
    "default-keychain-pre": commandStep("default-keychain-pre", binding.security, ["default-keychain", "-d", "user"]),
    "search-list-pre": commandStep("search-list-pre", binding.security, ["list-keychains", "-d", "user"]),
    "derive-key-certificate": commandStep("derive-key-certificate", binding.openssl, ["req", "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes", "-days", "1", "-config", opensslConfig, "-extensions", "ext", "-keyout", key, "-out", cert], { deadlineMilliseconds: 60_000 }),
    "derive-pkcs12": commandStep("derive-pkcs12", binding.openssl, ["pkcs12", "-export", "-out", p12, "-inkey", key, "-in", cert, "-passout", "pass:<SYNTHETIC_P12_PASSWORD>"], { deadlineMilliseconds: 60_000 }),
    "custom-keychain-create": commandStep("custom-keychain-create", binding.security, ["create-keychain", "-p", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "custom-keychain-unlock": commandStep("custom-keychain-unlock", binding.security, ["unlock-keychain", "-p", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "custom-keychain-import": commandStep("custom-keychain-import", binding.security, ["import", p12, "-k", keychain, "-f", "pkcs12", "-P", "<SYNTHETIC_P12_PASSWORD>", "-x", "-T", "/usr/bin/codesign"]),
    "custom-keychain-partition": commandStep("custom-keychain-partition", binding.security, ["set-key-partition-list", "-S", "apple-tool:,apple:", "-s", "-k", "<SYNTHETIC_KEYCHAIN_PASSWORD>", keychain]),
    "binding-canary-add": commandStep("binding-canary-add", binding.security, ["add-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", "-w", "<SYNTHETIC_BINDING_CANARY>", keychain]),
    "binding-canary-find": commandStep("binding-canary-find", binding.security, ["find-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", keychain]),
    "identity-inventory": commandStep("identity-inventory", binding.security, ["find-identity", "-v", "-p", "codesigning", keychain]),
    "codesign-sign": commandStep("codesign-sign", binding.codesign, ["--force", "--sign", "<OBSERVED_CERT_SHA1>", "--keychain", keychain, "--options", "runtime", "--timestamp=none", "--entitlements", entitlements, "--requirements", requirement, app], { deadlineMilliseconds: 60_000 }),
    "codesign-verify-strict": commandStep("codesign-verify-strict", binding.codesign, ["--verify", "--strict=all", "--verbose=4", app], { stderrLimitBytes: 65_536 }),
    "codesign-entitlements": commandStep("codesign-entitlements", binding.codesign, ["-d", "--entitlements", ":-", app], { stderrLimitBytes: 65_536 }),
    "codesign-designated-requirement": commandStep("codesign-designated-requirement", binding.codesign, ["-d", "-r-", app], { stderrLimitBytes: 65_536 }),
    "codesign-test-requirement": commandStep("codesign-test-requirement", binding.codesign, ["-R", requirement, app]),
    "post-sign-inventory": internal("post-sign-inventory", "recursive-inventory-exact-post-sign"),
    "helper-spawn": commandStep("helper-spawn", executable, ["--gate-b-core-transient-probe"], { stdinSource: "inherited-candidate-pipe-held-open", deadlineMilliseconds: 902_000, stdoutLimitBytes: 4096, expectedExitCodes: [0, 64, 70], outputParser: "terminal-specific-helper-receipt" }),
    "runtime-identity": internal("runtime-identity", "pid-path-executable-hash-and-prior-signature-binding"),
    "pre-body-network-sample": commandStep("pre-body-network-sample", binding.lsof, ["-nP", "-a", "-p", "<HELPER_PID>", "-iTCP", "-iUDP"], { stdoutLimitBytes: 65_536 }),
    "feeder-spawn": commandStep("feeder-spawn", binding.node, [path.join(REPOSITORY_ROOT, "fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs"), "<CANDIDATE_FD>", "<COMPLETION_FD>", "complete"], { stdoutLimitBytes: 0 }),
    "eof-commit-gate": internal("eof-commit-gate", "validate-completion-marker-and-feeder-zero-then-close-guard-fd"),
    "helper-receipt": internal("helper-receipt", "validate-canonical-raw-receipt-frame", { deadlineMilliseconds: 902_000, stdoutLimitBytes: 4096 }),
    "binding-canary-delete": commandStep("binding-canary-delete", binding.security, ["delete-generic-password", "-a", "forme-gate-b", "-s", "forme-room-binding", keychain]),
    "identity-delete": commandStep("identity-delete", binding.security, ["delete-identity", "-Z", "<OBSERVED_CERT_SHA1>", keychain]),
    "custom-keychain-lock": commandStep("custom-keychain-lock", binding.security, ["lock-keychain", keychain]),
    "custom-keychain-delete": commandStep("custom-keychain-delete", binding.security, ["delete-keychain", keychain]),
    "default-keychain-post": commandStep("default-keychain-post", binding.security, ["default-keychain", "-d", "user"]),
    "search-list-post": commandStep("search-list-post", binding.security, ["list-keychains", "-d", "user"]),
    cleanup: internal("cleanup", "journal-bound-idempotent-cleanup"),
    "absence-proof": internal("absence-proof", "owned-resource-and-process-absence-proof"),
  };
  const steps = MACOS_PLAN_ORDER.map((kind, ordinal) => deepFreeze({ ordinal: ordinal + 1, ...byKind[kind] }));
  return deepFreeze({ schemaVersion: "r4.gate-b-core.macos-physical-plan.v1", manifestSha256, runId, runRoot: root, opensslConfigSha256: sha256(Buffer.from(MACOS_OPENSSL_CONFIG, "utf8")), steps, securityCliInvocations: 15, codesignCliInvocations: 5, opensslCliInvocations: 2, customTemporaryKeychainOperations: 12, helperSeatbeltApplied: false, transientProviderProfileExecutionCount: 0, realProviderChildStarts: 0, candidateMaximumBytes: 32768, localAuthenticationCeremoniesMaximum: 1, handoffsMaximum: 1 });
}

export async function runFakePlan(plan, executor, { faultAfter = null, faultWindow = "after" } = {}) {
  if (!plan || !Array.isArray(plan.steps) || !executor || executor.mode !== "construction_fake" || typeof executor.execute !== "function" || typeof executor.cleanup !== "function") fail("FAKE_PLAN_EXECUTOR_INVALID");
  if (!['before', 'after'].includes(faultWindow)) fail("FAKE_PLAN_FAULT_WINDOW_INVALID");
  let completed = 0;
  let injected = false;
  try {
    for (const step of plan.steps) {
      if (faultAfter === completed + 1 && faultWindow === "before") { injected = true; throw new PhysicalPortError("INJECTED_FAULT"); }
      await executor.execute(step);
      completed += 1;
      if (faultAfter === completed && faultWindow === "after") { injected = true; throw new PhysicalPortError("INJECTED_FAULT"); }
    }
    return deepFreeze({ completed, injectedFault: false, physicalEffects: 0 });
  } catch (error) {
    if (!(error instanceof PhysicalPortError) || error.code !== "INJECTED_FAULT") throw error;
    return deepFreeze({ completed, injectedFault: injected, physicalEffects: 0 });
  } finally {
    const cleaned = await executor.cleanup();
    if (cleaned !== true) fail("FAKE_PLAN_CLEANUP_FAILED");
  }
}
export async function orchestrateConstructionFakeLanes(ports) {
  exactObject(ports, new Set(["postgres", "codex", "macos", "cleanup"]), "UNIFIED_FAKE_PORT_SHAPE");
  for (const key of ["postgres", "codex", "macos"]) if (ports[key]?.mode !== "construction_fake" || typeof ports[key].run !== "function") fail("UNIFIED_FAKE_LANE_PORT_INVALID");
  if (ports.cleanup?.mode !== "construction_fake" || typeof ports.cleanup.run !== "function") fail("UNIFIED_FAKE_CLEANUP_PORT_INVALID");
  const order = [];
  const results = {};
  let terminal = null;
  try {
    for (const lane of ["postgres", "codex", "macos"]) {
      if (terminal !== null) break;
      order.push(lane);
      const result = await ports[lane].run();
      if (result === null || typeof result !== "object" || !["GREEN", "YELLOW", "RED"].includes(result.verdict)) fail("UNIFIED_FAKE_LANE_RESULT_INVALID");
      results[lane] = result;
      if (result.verdict === "RED" || result.stopLaterLanes === true) terminal = lane;
    }
  } finally {
    order.push("cleanup");
    const cleaned = await ports.cleanup.run();
    if (cleaned !== true) fail("UNIFIED_FAKE_CLEANUP_FAILED");
  }
  order.push("evidence", "stop");
  return deepFreeze({ order, results, terminalLane: terminal, cleanupPassed: true, aggregateVerdict: terminal === null ? "YELLOW" : "RED", physicalEffects: 0 });
}
export async function runConstructionFakeMatrix() {
  const catalog = loadRaceCatalog();
  const stressHashes = [];
  for (let run = 0; run < 3; run += 1) stressHashes.push(sha256(canonicalJson(raceByteIndex(catalog))));
  if (new Set(stressHashes).size !== 1) fail("RACE_STRESS_NONDETERMINISTIC");
  const manifestSha256 = `sha256:${"a".repeat(64)}`;
  const syntheticRunId = "a".repeat(32);
  const postgresPlan = buildPostgresPhysicalPlan({ dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", localImageId: `sha256:${"b".repeat(64)}` }, manifestSha256, syntheticRunId);
  const macPlan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: "/synthetic/node" }, manifestSha256, syntheticRunId);
  let fakeStarts = 0;
  for (const faultWindow of ["before", "after"]) for (let faultAfter = 1; faultAfter <= postgresPlan.steps.length; faultAfter += 1) {
    await runFakePlan(postgresPlan, { mode: "construction_fake", async execute() { fakeStarts += 1; }, async cleanup() { return true; } }, { faultAfter, faultWindow });
  }
  for (const faultWindow of ["before", "after"]) for (let faultAfter = 1; faultAfter <= macPlan.steps.length; faultAfter += 1) {
    await runFakePlan(macPlan, { mode: "construction_fake", async execute() { fakeStarts += 1; }, async cleanup() { return true; } }, { faultAfter, faultWindow });
  }
  const unified = await orchestrateConstructionFakeLanes({
    postgres: { mode: "construction_fake", async run() { return { verdict: "GREEN", stopLaterLanes: false }; } },
    codex: { mode: "construction_fake", async run() { return { verdict: "GREEN", stopLaterLanes: false }; } },
    macos: { mode: "construction_fake", async run() { return { verdict: "YELLOW", stopLaterLanes: false }; } },
    cleanup: { mode: "construction_fake", async run() { return true; } },
  });
  return deepFreeze({ status: "ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN", deterministicStressRuns: 3, raceOrders: catalog.orders.length, expectedCoreCalls: POSTGRES_COUNTS.expectedCoreCalls, postgresAtomicFaultCases: postgresPlan.steps.length * 2, macosAtomicFaultCases: macPlan.steps.length * 2, unifiedLaneOrder: unified.order, unifiedCleanupPassed: unified.cleanupPassed, fakeChildStarts: fakeStarts, realPhysicalEffects: 0 });
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  process.stderr.write("PHYSICAL_PORT_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  process.exitCode = 64;
}
