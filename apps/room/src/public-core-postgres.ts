import { canonicalSha256 } from "../../../packages/r4-protocol/src/index.ts";
import type { PublicCoreEncryptedFieldV1 } from "./public-core-crypto.ts";
import {
  PUBLIC_CORE_ACTION_NAMES,
  type PublicCoreActionName,
} from "./public-core-policy.ts";

/**
 * Repository-only PostgreSQL construction boundary for R4 #67.
 *
 * There is deliberately no driver, pool, DSN, migration runner, route, or
 * caller-supplied SQL here. A later Gate C adapter may implement the narrow
 * executor port. This module owns every statement that can cross that port.
 */
export const PUBLIC_CORE_SQL_SCHEMA = "forme_r4_public_core" as const;

/**
 * SHA-256 of the exact proposed DDL prefix through the last declared index,
 * excluding the catalog-comment writer and seed rows. Verify and rollback pin
 * this independently of the mutable PostgreSQL schema comment.
 */
export const PUBLIC_CORE_SQL_EXPECTED_CATALOG_CONTRACT_SHA256 =
  "sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4" as const;

export const PUBLIC_CORE_SQL_TABLES = [
  "installation",
  "rooms",
  "projections",
  "pairing_challenges",
  "room_bindings",
  "public_encounters",
  "interactions",
  "rate_events",
  "room_events",
  "mutation_receipts",
  "event_acks",
  "encryption_nonces",
  "purge_jobs",
  "retention_health",
] as const;

export const PUBLIC_CORE_SQL_READ_ACTIONS = [
  "third_place.list",
  "projection.read",
  "interaction.read",
  "room_operator.status",
] as const satisfies readonly PublicCoreActionName[];

export const PUBLIC_CORE_SQL_MUTATION_ACTIONS = [
  "public_encounter.issue",
  "interaction.create",
  "interaction.delete",
  "room.pair.exchange",
  "room.create",
  "room.pair",
  "room.binding.revoke",
  "room.mode.set",
  "projection.revoke",
  "curation.admit",
  "curation.unlist",
  "room_operator.sync",
  "room_operator.pull",
  "room_operator.ack",
  "room_operator.projection.deliver",
  "room_operator.local_purge.receipt",
] as const satisfies readonly PublicCoreActionName[];

export type PublicCoreSqlReadActionV1 = typeof PUBLIC_CORE_SQL_READ_ACTIONS[number];
export type PublicCoreSqlMutationActionV1 = typeof PUBLIC_CORE_SQL_MUTATION_ACTIONS[number];

export const PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION = Object.freeze({
  "third_place.list": "listThirdPlace",
  "projection.read": "readProjection",
  "interaction.read": "readInteraction",
  "room_operator.status": "readRoomOperatorStatus",
  "public_encounter.issue": "issuePublicEncounter",
  "interaction.create": "createInteraction",
  "interaction.delete": "deleteInteraction",
  "room.pair.exchange": "exchangeRoomPair",
  "room.create": "createRoom",
  "room.pair": "createRoomPair",
  "room.binding.revoke": "revokeRoomBinding",
  "room.mode.set": "setRoomMode",
  "projection.revoke": "revokeProjection",
  "curation.admit": "admitProjection",
  "curation.unlist": "unlistProjection",
  "room_operator.sync": "syncRoomOperator",
  "room_operator.pull": "pullRoomOperator",
  "room_operator.ack": "ackRoomOperator",
  "room_operator.projection.deliver": "deliverProjection",
  "room_operator.local_purge.receipt": "recordLocalPurgeReceipt",
}) satisfies Readonly<Record<PublicCoreActionName, string>>;

export const PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES = Object.freeze({
  rooms: ["label_ciphertext"],
  projections: ["capsule_ciphertext"],
  pairing_challenges: ["pairing_code_ciphertext", "exchange_envelope_ciphertext"],
  interactions: ["request_ciphertext", "guest_capsule_ciphertext"],
} as const);

export const PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS = Object.freeze({
  "rooms.label_ciphertext": 1_024,
  "projections.capsule_ciphertext": 131_072,
  "pairing_challenges.pairing_code_ciphertext": 4_096,
  "pairing_challenges.exchange_envelope_ciphertext": 32_768,
  "interactions.request_ciphertext": 32_768,
  "interactions.guest_capsule_ciphertext": 4_096,
} as const);

export const PUBLIC_CORE_SQL_LOCK_ORDER = [
  "installation",
  "room",
  "binding_or_pairing",
  "projection",
  "encounter",
  "interaction",
  "event_or_ack",
  "purge_or_retention",
] as const;

export type PublicCoreSqlLockClassV1 = typeof PUBLIC_CORE_SQL_LOCK_ORDER[number];
export type PublicCoreSqlPhaseV1 =
  | "read"
  | "receipt_reserve"
  | "receipt_lookup"
  | "recovery"
  | "lock"
  | "precondition"
  | "nonce_reservation"
  | "domain_write"
  | "event_allocate"
  | "event_append"
  | "receipt_finalize"
  | "maintenance";

export type PublicCoreSqlValueV1 =
  | string
  | number
  | boolean
  | bigint
  | readonly string[]
  | readonly number[]
  | PublicCoreEncryptedFieldV1
  | Readonly<Record<string, unknown>>
  | null;

const SQL_STATEMENT_BRAND: unique symbol = Symbol("r4.public-core.canonical-sql-statement.v1");
const CANONICAL_STATEMENTS = new WeakSet<object>();
const LOCAL_ERROR_METADATA = new WeakMap<object, Readonly<{ status: number; code: string }>>();
const CALLBACK_RESULTS = new WeakSet<object>();
const CALLBACK_RESULT_BRAND: unique symbol = Symbol("r4.public-core.sql-callback-result.v1");

/**
 * Only this module can create the brand. The executor receives bound,
 * canonical statements; no exported API accepts a statement or SQL string.
 */
export interface PublicCoreCanonicalSqlStatementV1 {
  readonly [SQL_STATEMENT_BRAND]: "r4.public-core.canonical-sql-statement.v1";
  readonly statementId: string;
  readonly action: PublicCoreActionName | "retention.janitor";
  readonly phase: PublicCoreSqlPhaseV1;
  readonly lockClass: PublicCoreSqlLockClassV1 | null;
  readonly text: string;
  readonly values: readonly PublicCoreSqlValueV1[];
  readonly payloadClass: "body_free" | "ciphertext_only";
  readonly rowExpectation: "any" | "exactly_one" | "zero_or_one" | "zero_or_more";
  readonly rowKeys: readonly string[];
}

export interface PublicCoreSqlQueryResultV1 {
  readonly rowCount: number;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
}

export interface PublicCoreSqlTransactionV1 {
  query(statement: PublicCoreCanonicalSqlStatementV1): Promise<PublicCoreSqlQueryResultV1>;
}

/** Gate C may implement this port. Construction uses only an injected fake. */
export interface PublicCoreSqlExecutorV1 {
  transaction<T>(
    options: Readonly<{ isolation: "read_committed"; readOnly: boolean }>,
    work: (transaction: PublicCoreSqlTransactionV1) => Promise<T>,
  ): Promise<T>;
}

export class PublicCorePostgresError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "PublicCorePostgresError";
    this.status = status;
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; status: number; code: string }> {
    return Object.freeze({ name: this.name, status: this.status, code: this.code });
  }
}

function fail(status: number, code: string): never {
  const error = new PublicCorePostgresError(status, code);
  LOCAL_ERROR_METADATA.set(error, Object.freeze({ status, code }));
  Object.freeze(error);
  throw error;
}

export type PublicCoreSqlSha256V1 = `sha256:${string}`;
export type PublicCoreSqlHmacSha256V1 = `hmac-sha256:${string}`;
export type PublicCoreSqlActorClassV1 =
  | "public"
  | "guest_capability"
  | "controller"
  | "curator"
  | "room_operator";

export interface PublicCoreSqlEncryptedValueV1 {
  readonly envelope: PublicCoreEncryptedFieldV1;
  readonly plaintextBytes: number;
  readonly fieldVersion: number;
}

export interface PublicCoreSqlMutationContextV1<A extends PublicCoreSqlMutationActionV1 = PublicCoreSqlMutationActionV1> {
  readonly action: A;
  readonly receiptId: string;
  readonly roomId: string;
  readonly actorClass: PublicCoreSqlActorClassV1;
  readonly actorScopeDigest: PublicCoreSqlHmacSha256V1;
  readonly idempotencyKey: string;
  readonly canonicalRequestHash: PublicCoreSqlSha256V1;
  readonly expectedVersion: number | null;
  readonly requestedAt: string;
}

export interface PublicCoreSqlEventInputV1 {
  readonly eventId: string;
  readonly eventHash: PublicCoreSqlSha256V1;
}

export interface PublicCoreListThirdPlaceSqlInputV1 {
  readonly roomId: string;
  readonly requestedAt: string;
}

export interface PublicCoreReadProjectionSqlInputV1 extends PublicCoreListThirdPlaceSqlInputV1 {
  readonly projectionId: string;
}

export interface PublicCoreReadInteractionSqlInputV1 extends PublicCoreListThirdPlaceSqlInputV1 {
  readonly interactionId: string;
  readonly replySecretDigest: PublicCoreSqlHmacSha256V1;
}

export interface PublicCoreReadRoomOperatorStatusSqlInputV1 extends PublicCoreListThirdPlaceSqlInputV1 {
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
}

export interface PublicCoreIssueEncounterSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly projectionId: string;
  readonly encounterId: string;
  readonly encounterSecretDigest: PublicCoreSqlHmacSha256V1;
  readonly issuanceBucketDigest: PublicCoreSqlHmacSha256V1;
  readonly hourlyRateEventId: string;
  readonly hourlyBucketDigest: PublicCoreSqlHmacSha256V1;
  readonly hourWindowStart: string;
  readonly dailyRateEventId: string;
  readonly dailyBucketDigest: PublicCoreSqlHmacSha256V1;
  readonly dayWindowStart: string;
  readonly rateExpiresAt: string;
  readonly encounterExpiresAt: string;
}

export interface PublicCoreCreateInteractionSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly interactionId: string;
  readonly interactionType: "ask" | "seed" | "resonance";
  readonly projectionId: string;
  readonly acceptRateEventId: string;
  readonly dayWindowStart: string;
  readonly rateExpiresAt: string;
  readonly requestCiphertext: PublicCoreSqlEncryptedValueV1;
  readonly guestCapsuleCiphertext: PublicCoreSqlEncryptedValueV1 | null;
  readonly requestBodyHash: PublicCoreSqlSha256V1;
  readonly guestCapsuleBodyHash: PublicCoreSqlSha256V1 | null;
  readonly consentHash: PublicCoreSqlSha256V1;
  readonly replySecretDigest: PublicCoreSqlHmacSha256V1;
  readonly deleteSecretDigest: PublicCoreSqlHmacSha256V1;
  readonly bodyExpiresAt: string;
  readonly encounterSecretDigest: PublicCoreSqlHmacSha256V1;
}

export interface PublicCoreDeleteInteractionSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly interactionId: string;
  readonly interactionPurgeJobId: string;
  readonly deleteSecretDigest: PublicCoreSqlHmacSha256V1;
}

export interface PublicCoreExchangeRoomPairSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly pairingId: string;
  readonly clientPublicKeyHash: PublicCoreSqlSha256V1;
  readonly pairingCodeDigest: PublicCoreSqlHmacSha256V1;
  readonly exchangeEnvelopeCiphertext: PublicCoreSqlEncryptedValueV1;
  readonly bindingId: string;
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly bindingExpiresAt: string;
}

export interface PublicCoreCreateRoomSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly entityId: string;
  readonly labelCiphertext: PublicCoreSqlEncryptedValueV1;
}

export interface PublicCoreCreateRoomPairSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly pairingId: string;
  readonly pairingCodeCiphertext: PublicCoreSqlEncryptedValueV1;
  readonly pairingCodeDigest: PublicCoreSqlHmacSha256V1;
  readonly pairingExpiresAt: string;
}

export interface PublicCoreRevokeRoomBindingSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly bindingId: string;
}

export interface PublicCoreSetRoomModeSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly interactionMode: "public_single" | "closed";
}

export interface PublicCoreRevokeProjectionSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly projectionId: string;
  readonly projectionPurgeJobId: string;
}

export interface PublicCoreCurationSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly projectionId: string;
}

export interface PublicCoreSyncRoomOperatorSqlInputV1 {
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly afterSequence: number;
}

export interface PublicCorePullRoomOperatorSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly interactionId: string;
}

export interface PublicCoreAckRoomOperatorSqlInputV1 {
  readonly ackId: string;
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly eventId: string;
  readonly sequence: number;
  readonly eventHash: PublicCoreSqlSha256V1;
}

export interface PublicCoreDeliverProjectionSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly projectionId: string;
  readonly capsuleCiphertext: PublicCoreSqlEncryptedValueV1;
  readonly payloadHash: PublicCoreSqlSha256V1;
  readonly basisHash: PublicCoreSqlSha256V1;
  readonly projectionPolicyHash: PublicCoreSqlSha256V1;
  readonly publicationApprovalId: string;
  readonly publicationApprovalHash: PublicCoreSqlSha256V1;
  readonly publicationAttestationHash: PublicCoreSqlSha256V1;
  readonly publishedAt: string;
  readonly freshUntil: string;
  readonly expiresAt: string;
  readonly projectionPurgeJobId: string;
}

export interface PublicCoreRecordLocalPurgeSqlInputV1 extends PublicCoreSqlEventInputV1 {
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1;
  readonly interactionId: string;
}

export interface PublicCoreRunRetentionJanitorSqlInputV1 {
  readonly requestedAt: string;
  readonly batchSize: number;
}

export interface PublicCoreSqlBodyFreeResultV1 {
  readonly kind: "body_free";
  readonly action: PublicCoreSqlMutationActionV1;
  readonly status: number;
  readonly code: string;
  readonly receiptId: string;
  readonly targetId: string;
  readonly targetVersion: number;
  readonly recovered: boolean;
}

export interface PublicCoreSqlEncounterIssueResultV1 {
  readonly kind: "encounter_issue";
  readonly action: "public_encounter.issue";
  readonly status: 201;
  readonly code: "encounter_issued";
  readonly receiptId: string;
  readonly encounterId: string;
  readonly encounterVersion: number;
  readonly expiresAt: string;
  readonly recovered: boolean;
}

export interface PublicCoreSqlPairingIssueResultV1 {
  readonly kind: "pairing_issue";
  readonly action: "room.pair";
  readonly status: 201;
  readonly code: "pairing_issued";
  readonly receiptId: string;
  readonly pairingId: string;
  readonly pairingCodeCiphertext: Readonly<Record<string, unknown>>;
  readonly expiresAt: string;
  readonly targetVersion: number;
  readonly recovered: boolean;
}

export interface PublicCoreSqlPairingExchangeResultV1 {
  readonly kind: "pairing_exchange";
  readonly action: "room.pair.exchange";
  readonly status: 201;
  readonly code: "pairing_exchanged";
  readonly receiptId: string;
  readonly pairingId: string;
  readonly bindingId: string;
  readonly exchangeEnvelopeCiphertext: Readonly<Record<string, unknown>>;
  readonly expiresAt: string;
  readonly targetVersion: number;
  readonly recovered: boolean;
}

const PUBLIC_CORE_SQL_EVENT_KINDS = [
  "room_created",
  "room_mode_set",
  "pairing_issued",
  "pairing_exchanged",
  "binding_revoked",
  "projection_delivered",
  "projection_revoked",
  "curation_admitted",
  "curation_unlisted",
  "encounter_issued",
  "interaction_accepted",
  "interaction_deleted",
  "local_purge_receipted",
] as const;

export interface PublicCoreSqlEventRowV1 {
  readonly eventId: string;
  readonly sequence: number;
  readonly eventKind: typeof PUBLIC_CORE_SQL_EVENT_KINDS[number];
  readonly action: PublicCoreSqlMutationActionV1;
  readonly targetKind: "room" | "pairing" | "binding" | "projection" | "encounter" | "interaction" | "purge";
  readonly targetId: string;
  readonly targetVersion: number;
  readonly eventHash: PublicCoreSqlSha256V1;
  readonly committedAt: string;
  readonly bodyAvailable: boolean;
}

export interface PublicCoreSqlSyncResultV1 {
  readonly kind: "sync_window" | "cursor_gone";
  readonly action: "room_operator.sync";
  readonly status: 200 | 410;
  readonly code: "event_batch" | "cursor_gone";
  readonly receiptId: string;
  readonly roomId: string;
  readonly afterSequence: number;
  readonly highWater: number;
  readonly replayFloor: number;
  readonly events: readonly PublicCoreSqlEventRowV1[];
  readonly tombstoneIds: readonly string[];
  readonly recovered: boolean;
}

export interface PublicCoreSqlPullResultV1 {
  readonly kind: "interaction_pull";
  readonly action: "room_operator.pull";
  readonly status: 200;
  readonly code: "interaction_pulled";
  readonly receiptId: string;
  readonly interactionId: string;
  readonly interactionVersion: number;
  readonly projectionId: string;
  readonly originProjectionHash: PublicCoreSqlSha256V1;
  readonly interactionType: "ask" | "seed" | "resonance";
  readonly consentHash: PublicCoreSqlSha256V1;
  readonly interactionState: "seen_locally";
  readonly acceptedAt: string;
  readonly localPurgeReceivedAt: string | null;
  readonly requestCiphertext: Readonly<Record<string, unknown>>;
  readonly guestCapsuleCiphertext: Readonly<Record<string, unknown>> | null;
  readonly requestFieldVersion: number;
  readonly bodyHash: PublicCoreSqlSha256V1;
  readonly guestCapsuleFieldVersion: number | null;
  readonly guestCapsuleHash: PublicCoreSqlSha256V1 | null;
  readonly bodyExpiresAt: string;
  readonly recovered: boolean;
}

export interface PublicCoreSqlTerminalResultV1 {
  readonly kind: "terminal_reconciliation";
  readonly action: "room.pair" | "room.pair.exchange" | "room_operator.pull";
  readonly status: 410;
  readonly code: "terminal_reconciliation" | "pull_terminal";
  readonly receiptId: string;
  readonly targetId: string;
  readonly terminalState:
    | "expired"
    | "exchanged"
    | "interaction_deleted"
    | "origin_revoked"
    | "interaction_expired"
    | "receipt_version_unavailable"
    | "unavailable";
  readonly recovered: boolean;
}

export interface PublicCoreSqlThirdPlaceRowV1 {
  readonly thirdPlaceId: string;
  readonly roomId: string;
  readonly projectionId: string;
  readonly capsuleCiphertext: Readonly<Record<string, unknown>>;
  readonly payloadHash: PublicCoreSqlSha256V1;
  readonly capsuleFieldVersion: number;
  readonly lifecycleVersion: number;
  readonly freshUntil: string;
  readonly expiresAt: string;
}

export interface PublicCoreSqlProjectionRowV1 {
  readonly projectionId: string;
  readonly roomId: string;
  readonly capsuleCiphertext: Readonly<Record<string, unknown>> | null;
  readonly payloadHash: PublicCoreSqlSha256V1;
  readonly capsuleFieldVersion: number;
  readonly ownerState: "published_fresh" | "stale" | "superseded" | "revoked" | "expired";
  readonly curationState: "not_admitted" | "admitted" | "unlisted";
  readonly interactionMode: "public_single" | "closed";
  readonly current: boolean;
  readonly bodyAvailable: boolean;
  readonly lifecycleVersion: number;
  readonly publishedAt: string;
  readonly freshUntil: string;
  readonly expiresAt: string;
}

export interface PublicCoreSqlInteractionRowV1 {
  readonly interactionId: string;
  readonly roomId: string;
  readonly originProjectionId: string;
  readonly originProjectionHash: PublicCoreSqlSha256V1;
  readonly interactionType: "ask" | "seed" | "resonance";
  readonly consentHash: PublicCoreSqlSha256V1;
  readonly state: "accepted" | "seen_locally" | "interaction_deleted" | "interaction_expired" | "origin_revoked";
  readonly version: number;
  readonly acceptedAt: string;
  readonly bodyExpiresAt: string;
  readonly bodyAvailable: boolean;
  readonly localPurgeReceivedAt: string | null;
}

export interface PublicCoreSqlRoomOperatorStatusRowV1 {
  readonly roomId: string;
  readonly interactionMode: "public_single" | "closed";
  readonly roomVersion: number;
  readonly currentProjectionId: string | null;
  readonly eventHighWater: number;
  readonly eventReplayFloor: number;
  readonly bindingId: string;
  readonly bindingVersion: number;
  readonly bindingExpiresAt: string;
  readonly lastSuccessfulPurgeAt: string;
  readonly writeStop: boolean;
}

export type PublicCoreSqlReadResultV1 =
  | Readonly<{ kind: "read"; action: "third_place.list"; rows: readonly PublicCoreSqlThirdPlaceRowV1[] }>
  | Readonly<{ kind: "read"; action: "projection.read"; rows: readonly PublicCoreSqlProjectionRowV1[] }>
  | Readonly<{ kind: "read"; action: "interaction.read"; rows: readonly PublicCoreSqlInteractionRowV1[] }>
  | Readonly<{ kind: "read"; action: "room_operator.status"; rows: readonly PublicCoreSqlRoomOperatorStatusRowV1[] }>;

export interface PublicCoreSqlAckResultV1 {
  readonly kind: "ack";
  readonly action: "room_operator.ack";
  readonly status: 200;
  readonly code: "event_acked";
  readonly receiptId: string;
  readonly ackId: string;
  readonly eventId: string;
  readonly sequence: number;
  readonly eventHash: PublicCoreSqlSha256V1;
  readonly ackedAt: string;
  readonly recovered: boolean;
}

export interface PublicCoreSqlJanitorResultV1 {
  readonly kind: "retention_janitor";
  readonly acquired: boolean;
  readonly claimed: number;
  readonly completed: number;
  readonly backlogRemaining: boolean;
  readonly lastSuccessfulPurgeAt: string | null;
}

export type PublicCoreSqlMutationResultV1 =
  | PublicCoreSqlBodyFreeResultV1
  | PublicCoreSqlEncounterIssueResultV1
  | PublicCoreSqlPairingIssueResultV1
  | PublicCoreSqlPairingExchangeResultV1
  | PublicCoreSqlSyncResultV1
  | PublicCoreSqlPullResultV1
  | PublicCoreSqlAckResultV1
  | PublicCoreSqlTerminalResultV1;

export type PublicCoreSqlOperationResultV1 =
  | PublicCoreSqlReadResultV1
  | PublicCoreSqlMutationResultV1;

type SqlRow = Readonly<Record<string, unknown>>;

interface MutationRunV1 {
  readonly context: PublicCoreSqlMutationContextV1;
  readonly input: object;
}

interface DomainOutcomeV1 {
  readonly targetId: string;
  readonly targetVersion: number;
  readonly row: SqlRow;
}

interface ReceiptRowV1 {
  readonly receiptId: string;
  readonly action: PublicCoreSqlMutationActionV1;
  readonly requestHash: PublicCoreSqlSha256V1;
  readonly status: "reserved" | "committed";
  readonly targetId: string | null;
  readonly relatedTargetId: string | null;
  readonly targetVersion: number | null;
  readonly httpStatus: number | null;
  readonly resultCode: string | null;
  readonly recoveryKind:
    | "body_free"
    | "pairing_issue"
    | "pairing_exchange"
    | "sync_window"
    | "interaction_pull"
    | "pull_terminal";
  readonly syncAfterSequence: number | null;
  readonly syncHighWater: number | null;
  readonly syncReplayFloor: number | null;
  readonly syncResultKind: "event_batch" | "cursor_gone" | null;
  readonly syncEventIds: readonly string[] | null;
  readonly syncEventSequences: readonly number[] | null;
  readonly syncEventKinds: readonly typeof PUBLIC_CORE_SQL_EVENT_KINDS[number][] | null;
  readonly syncObjectIds: readonly string[] | null;
  readonly syncObjectVersions: readonly number[] | null;
  readonly syncEventHashes: readonly PublicCoreSqlSha256V1[] | null;
  readonly syncEventCommittedAts: readonly string[] | null;
  readonly syncTombstoneIds: readonly string[] | null;
  readonly syncTombstoneExpiresAts: readonly string[] | null;
  readonly pullInteractionId: string | null;
  readonly pullRequestFieldVersion: number | null;
  readonly pullBodyHash: PublicCoreSqlSha256V1 | null;
  readonly pullGuestFieldVersion: number | null;
  readonly pullGuestHash: PublicCoreSqlSha256V1 | null;
  readonly pullBodyExpiresAt: string | null;
  readonly pullTerminalState:
    | "interaction_deleted"
    | "origin_revoked"
    | "interaction_expired"
    | null;
  readonly createdAt: string;
  readonly committedAt: string | null;
  readonly sourceExpiresAt: string | null;
  readonly expiresAt: string;
}

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const HMAC_SHA256 = /^hmac-sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u;
const ID_SUFFIX = "[A-Za-z0-9_-]{16,128}";
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{16,256}$/u;
const RESULT_CODE = /^[a-z][a-z0-9_]{0,95}$/u;
const SAFE_SQL = /\b(?:COPY|ALTER\s+SYSTEM|CREATE\s+EXTENSION|dblink|postgres_fdw|lo_import|lo_export)\b/iu;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Public values are an untrusted port. Copy their data descriptors without
 * invoking accessors, then validate and emit SQL only from the owned tree.
 * Any Proxy/accessor/prototype fault is collapsed to one body-free error.
 */
function snapshotInput<T>(value: T): T {
  try {
    const owned = plainDataSnapshot(value);
    if (!isRecord(owned)) throw new TypeError("invalid_input_root");
    return owned as T;
  } catch {
    fail(400, "sql_input_invalid");
  }
}

function exactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(400, code);
  }
}

function assertId(value: unknown, code = "invalid_identifier"): asserts value is string {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) fail(400, code);
}

function assertIdKind(value: unknown, prefix: string, code = "invalid_identifier"): asserts value is string {
  if (typeof value !== "string" || !new RegExp(`^${prefix}_${ID_SUFFIX}$`, "u").test(value)) fail(400, code);
}

function assertTime(value: unknown, code = "invalid_time"): asserts value is string {
  if (typeof value !== "string") fail(400, code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) fail(400, code);
}

function assertSha(value: unknown, code = "invalid_sha256"): asserts value is PublicCoreSqlSha256V1 {
  if (typeof value !== "string" || !SHA256.test(value)) fail(400, code);
}

function assertHmac(value: unknown, code = "invalid_hmac_sha256"): asserts value is PublicCoreSqlHmacSha256V1 {
  if (typeof value !== "string" || !HMAC_SHA256.test(value)) fail(400, code);
}

/**
 * Compare the fixed 32-byte payload of two already-shape-validated HMAC
 * strings without a text equality branch. Callers must still select the row
 * by its non-secret object identity first.
 */
function constantTimeHmacPredicate(column: string, parameter: string): string {
  if (!/^[a-z][a-z0-9_.]*$/u.test(column) || !/^\$[1-9][0-9]*$/u.test(parameter)) {
    fail(500, "sql_digest_predicate_invalid");
  }
  return `(SELECT COALESCE(bit_or(
    get_byte(decode(substr(${column},13),'hex'),byte_index)
    # get_byte(decode(substr(${parameter},13),'hex'),byte_index)
  ),0)=0 FROM generate_series(0,31) AS byte_index)`;
}

function integer(value: unknown, minimum: number, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(400, code);
  return value as number;
}

function milliseconds(value: string): number {
  assertTime(value);
  return Date.parse(value);
}

function addMilliseconds(value: string, amount: number): string {
  return new Date(milliseconds(value) + amount).toISOString();
}

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

function validateActionChronology(run: MutationRunV1): void {
  const requested = milliseconds(run.context.requestedAt);
  const input = run.input as Record<string, unknown>;
  const time = (key: string): number => milliseconds(input[key] as string);
  if (run.context.action === "public_encounter.issue") {
    const hourStart = time("hourWindowStart");
    const dayStart = time("dayWindowStart");
    const rateExpiry = time("rateExpiresAt");
    const encounterExpiry = time("encounterExpiresAt");
    if (
      hourStart !== Math.floor(requested / HOUR_MS) * HOUR_MS
      || dayStart !== Math.floor(requested / DAY_MS) * DAY_MS
      || rateExpiry < Math.max(hourStart + HOUR_MS, dayStart + DAY_MS, encounterExpiry)
      || rateExpiry > requested + 25 * HOUR_MS
      || encounterExpiry !== requested + DAY_MS
    ) fail(400, "action_chronology_invalid");
  }
  if (run.context.action === "interaction.create") {
    const dayStart = time("dayWindowStart");
    const rateExpiry = time("rateExpiresAt");
    const bodyExpiry = time("bodyExpiresAt");
    if (
      dayStart !== Math.floor(requested / DAY_MS) * DAY_MS
      || rateExpiry < dayStart + DAY_MS
      || rateExpiry > requested + 25 * HOUR_MS
      || bodyExpiry <= requested
      || bodyExpiry > requested + 30 * DAY_MS
    ) fail(400, "action_chronology_invalid");
  }
  if (run.context.action === "room.pair") {
    const expires = time("pairingExpiresAt");
    if (expires <= requested || expires > requested + 10 * 60 * 1_000) fail(400, "action_chronology_invalid");
  }
  if (run.context.action === "room.pair.exchange") {
    const expires = time("bindingExpiresAt");
    if (expires <= requested || expires > requested + 30 * DAY_MS) fail(400, "action_chronology_invalid");
  }
  if (run.context.action === "room_operator.projection.deliver") {
    const published = time("publishedAt");
    const fresh = time("freshUntil");
    const expires = time("expiresAt");
    if (
      published > requested
      || published >= fresh
      || fresh >= expires
      || expires > published + 7 * DAY_MS
    ) fail(400, "action_chronology_invalid");
  }
}

function rowText(row: SqlRow, key: string, code = "sql_result_invalid"): string {
  const value = row[key];
  if (typeof value !== "string") fail(503, code);
  return value;
}

function rowNullableText(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") fail(503, "sql_result_invalid");
  return value;
}

function rowNumber(row: SqlRow, key: string, code = "sql_result_invalid"): number {
  const value = row[key];
  const parsed = typeof value === "bigint"
    ? Number(value)
    : typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value)
      ? Number(value)
      : value;
  if (!Number.isSafeInteger(parsed)) fail(503, code);
  return parsed as number;
}

function rowNullableNumber(row: SqlRow, key: string): number | null {
  if (row[key] === null || row[key] === undefined) return null;
  return rowNumber(row, key);
}

function rowNullableStringArray(row: SqlRow, key: string): readonly string[] | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || value.length > 256 || value.some((item) => typeof item !== "string")) {
    fail(503, "sql_result_invalid");
  }
  return Object.freeze([...value] as string[]);
}

function rowNullableNumberArray(row: SqlRow, key: string): readonly number[] | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || value.length > 256) fail(503, "sql_result_invalid");
  return Object.freeze(value.map((item) => {
    const parsed = typeof item === "bigint"
      ? Number(item)
      : typeof item === "string" && /^(?:0|[1-9][0-9]*)$/u.test(item)
        ? Number(item)
        : item;
    if (!Number.isSafeInteger(parsed)) fail(503, "sql_result_invalid");
    return parsed as number;
  }));
}

function rowBoolean(row: SqlRow, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") fail(503, "sql_result_invalid");
  return value;
}

function rowObject(row: SqlRow, key: string): Readonly<Record<string, unknown>> {
  const value = row[key];
  return exactCiphertextEnvelope(value);
}

function rowNullableObject(row: SqlRow, key: string): Readonly<Record<string, unknown>> | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return exactCiphertextEnvelope(value);
}

function exactCiphertextEnvelope(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) fail(503, "sql_result_invalid");
  const keys = ["schemaVersion", "algorithm", "keyVersion", "nonce", "ciphertext", "tag", "aadHash"];
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(503, "sql_result_invalid");
  }
  if (
    value.schemaVersion !== "a256gcm.v1"
    || value.algorithm !== "AES-256-GCM"
    || typeof value.keyVersion !== "string"
    || !/^[A-Za-z0-9._:-]{1,128}$/u.test(value.keyVersion)
    || typeof value.nonce !== "string"
    || !/^[A-Za-z0-9_-]{16}$/u.test(value.nonce)
    || typeof value.ciphertext !== "string"
    || !/^[A-Za-z0-9_-]+$/u.test(value.ciphertext)
    || typeof value.tag !== "string"
    || !/^[A-Za-z0-9_-]{22}$/u.test(value.tag)
    || typeof value.aadHash !== "string"
    || !SHA256.test(value.aadHash)
  ) fail(503, "sql_result_invalid");
  return value;
}

function canonicalStatement(input: Readonly<{
  statementId: string;
  action: PublicCoreActionName | "retention.janitor";
  phase: PublicCoreSqlPhaseV1;
  text: string;
  values?: readonly PublicCoreSqlValueV1[];
  lockClass?: PublicCoreSqlLockClassV1 | null;
  payloadClass?: "body_free" | "ciphertext_only";
  rowExpectation?: PublicCoreCanonicalSqlStatementV1["rowExpectation"];
  rowKeys: readonly string[];
}>): PublicCoreCanonicalSqlStatementV1 {
  const text = input.text.trim();
  const values = Object.freeze([...(input.values ?? [])]);
  const rowKeys = Object.freeze([...input.rowKeys]);
  if (text.includes(";") || SAFE_SQL.test(text)) fail(500, "sql_statement_unsafe");
  const placeholders = [...text.matchAll(/\$(\d+)/gu)].map((match) => Number(match[1]));
  const highest = placeholders.length === 0 ? 0 : Math.max(...placeholders);
  const placeholderSet = new Set(placeholders);
  if (
    highest !== values.length
    || Array.from({ length: highest }, (_, index) => index + 1).some((index) => !placeholderSet.has(index))
    || values.some((value) => value === undefined)
  ) {
    fail(500, "sql_statement_binding_drift");
  }
  const value = Object.freeze({
    [SQL_STATEMENT_BRAND]: "r4.public-core.canonical-sql-statement.v1" as const,
    statementId: input.statementId,
    action: input.action,
    phase: input.phase,
    lockClass: input.lockClass ?? null,
    text,
    values,
    payloadClass: input.payloadClass ?? "body_free",
    rowExpectation: input.rowExpectation ?? "any",
    rowKeys,
  });
  CANONICAL_STATEMENTS.add(value);
  return value;
}

async function query(
  transaction: PublicCoreSqlTransactionV1,
  statement: PublicCoreCanonicalSqlStatementV1,
): Promise<PublicCoreSqlQueryResultV1> {
  if (!CANONICAL_STATEMENTS.has(statement as object)) fail(500, "sql_statement_not_canonical");
  const result = await transaction.query(statement);
  if (statement.rowExpectation === "exactly_one" && result.rowCount !== 1) {
    fail(409, "sql_expected_exactly_one");
  }
  if (statement.rowExpectation === "zero_or_one" && result.rowCount > 1) {
    fail(503, "sql_expected_zero_or_one");
  }
  return result;
}

interface PreparedExecutorV1 {
  readonly receiver: PublicCoreSqlExecutorV1;
  readonly transaction: PublicCoreSqlExecutorV1["transaction"];
}

interface CallbackResultV1<T> {
  readonly [CALLBACK_RESULT_BRAND]: "r4.public-core.sql-callback-result.v1";
  readonly value: T;
}

function localErrorMetadata(value: unknown): Readonly<{ status: number; code: string }> | null {
  if (!((typeof value === "object" && value !== null) || typeof value === "function")) return null;
  return LOCAL_ERROR_METADATA.get(value as object) ?? null;
}

/** Bridge membrane access; callers can inspect but cannot mint this brand. */
export function authenticPublicCorePostgresErrorDetails(
  error: unknown,
): Readonly<{ status: number; code: string }> | null {
  try {
    const details = localErrorMetadata(error);
    if (details === null || !Object.isFrozen(error)) return null;
    const status = Object.getOwnPropertyDescriptor(error as object, "status");
    const code = Object.getOwnPropertyDescriptor(error as object, "code");
    if (
      !status || !("value" in status) || status.writable !== false
      || !Number.isSafeInteger(status.value) || status.value < 400 || status.value > 599
      || !code || !("value" in code) || code.writable !== false
      || typeof code.value !== "string" || !/^[A-Za-z0-9_]{1,128}$/u.test(code.value)
      || status.value !== details.status || code.value !== details.code
    ) return null;
    return details;
  } catch {
    return null;
  }
}

function prepareExecutor(executor: PublicCoreSqlExecutorV1): PreparedExecutorV1 {
  try {
    if (!executor || (typeof executor !== "object" && typeof executor !== "function")) {
      fail(500, "sql_executor_invalid");
    }
    if (["driver", "pool", "dsn", "connectionString", "url", "network"].some(
      (key) => Reflect.has(executor as object, key),
    )) fail(500, "sql_executor_invalid");
    const transaction = Reflect.get(executor as object, "transaction") as unknown;
    if (typeof transaction !== "function") fail(500, "sql_executor_invalid");
    return Object.freeze({
      receiver: executor,
      transaction: transaction as PublicCoreSqlExecutorV1["transaction"],
    });
  } catch (error) {
    const local = localErrorMetadata(error);
    if (local !== null) fail(local.status, local.code);
    fail(500, "sql_executor_invalid");
  }
}

function plainDataSnapshot(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("invalid_port_number");
    return value;
  }
  if (typeof value !== "object" || depth > 4) {
    throw new TypeError("invalid_port_value");
  }
  if (Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Array.prototype) throw new TypeError("invalid_port_array_prototype");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
      throw new TypeError("invalid_port_array_symbols");
    }
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
    const rawLength = lengthDescriptor && "value" in lengthDescriptor
      ? lengthDescriptor.value
      : null;
    if (typeof rawLength !== "number" || !Number.isSafeInteger(rawLength)
      || rawLength < 0 || rawLength > 1_024) throw new TypeError("invalid_port_array_length");
    const length = rawLength;
    const expectedKeys = new Set(["length", ...Array.from({ length }, (_, index) => String(index))]);
    if (Object.keys(descriptors).some((key) => !expectedKeys.has(key))
      || Object.keys(descriptors).length !== expectedKeys.size) {
      throw new TypeError("invalid_port_array_keys");
    }
    const copy: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError("invalid_port_array_descriptor");
      }
      copy.push(plainDataSnapshot(descriptor.value, depth + 1));
    }
    return Object.freeze(copy);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError("invalid_port_prototype");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length !== 0) throw new TypeError("invalid_port_symbols");
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError("invalid_port_descriptor");
    copy[key] = plainDataSnapshot(descriptor.value, depth + 1);
  }
  return Object.freeze(copy);
}

function snapshotQueryResult(
  raw: unknown,
  statement: PublicCoreCanonicalSqlStatementV1,
): PublicCoreSqlQueryResultV1 {
  try {
    if (raw === null || typeof raw !== "object") throw new TypeError("invalid_query_result");
    const prototype = Object.getPrototypeOf(raw);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("invalid_query_result_prototype");
    if (Object.getOwnPropertySymbols(raw).length !== 0) throw new TypeError("invalid_query_result_symbols");
    const descriptors = Object.getOwnPropertyDescriptors(raw);
    const keys = Object.keys(descriptors).sort();
    if (keys.length !== 2 || keys[0] !== "rowCount" || keys[1] !== "rows") {
      throw new TypeError("invalid_query_result_keys");
    }
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (!rowCountDescriptor || !("value" in rowCountDescriptor) || !rowCountDescriptor.enumerable
      || !rowsDescriptor || !("value" in rowsDescriptor) || !rowsDescriptor.enumerable) {
      throw new TypeError("invalid_query_result_descriptors");
    }
    const rowCount = rowCountDescriptor.value;
    const rawRows = rowsDescriptor.value;
    if (!Number.isSafeInteger(rowCount) || rowCount < 0 || !Array.isArray(rawRows)) {
      throw new TypeError("invalid_query_result_shape");
    }
    const rowDescriptors = Object.getOwnPropertyDescriptors(rawRows);
    if (Object.getOwnPropertySymbols(rawRows).length !== 0) {
      throw new TypeError("invalid_query_rows_symbols");
    }
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(rawRows, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor) || lengthDescriptor.value !== rowCount) {
      throw new TypeError("invalid_query_result_length");
    }
    const rows: Readonly<Record<string, unknown>>[] = [];
    for (let index = 0; index < rowCount; index += 1) {
      const descriptor = rowDescriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError("invalid_query_result_sparse");
      }
      const row = plainDataSnapshot(descriptor.value);
      if (!isRecord(row)) throw new TypeError("invalid_query_row");
      const actual = Object.keys(row).sort();
      const expected = [...statement.rowKeys].sort();
      if (actual.length !== expected.length || actual.some((key, keyIndex) => key !== expected[keyIndex])) {
        throw new TypeError("invalid_query_row_keys");
      }
      rows.push(row);
    }
    const expectedArrayKeys = new Set([
      "length",
      ...Array.from({ length: rowCount }, (_, index) => String(index)),
    ]);
    const actualArrayKeys = Reflect.ownKeys(rowDescriptors).filter((key): key is string => typeof key === "string");
    if (
      actualArrayKeys.length !== expectedArrayKeys.size
      || actualArrayKeys.some((key) => !expectedArrayKeys.has(key))
      || rows.length !== rowCount
    ) throw new TypeError("invalid_query_rows");
    return Object.freeze({ rowCount, rows: Object.freeze(rows) });
  } catch {
    fail(503, "sql_executor_result_invalid");
  }
}

function prepareTransaction(raw: unknown): PublicCoreSqlTransactionV1 {
  let queryMethod: unknown;
  try {
    if (raw === null || (typeof raw !== "object" && typeof raw !== "function")) {
      throw new TypeError("invalid_transaction");
    }
    queryMethod = Reflect.get(raw as object, "query");
    if (typeof queryMethod !== "function") throw new TypeError("invalid_query_method");
  } catch {
    fail(503, "sql_executor_protocol_violation");
  }
  const receiver = raw as object;
  const method = queryMethod as PublicCoreSqlTransactionV1["query"];
  return Object.freeze({
    query: async (statement: PublicCoreCanonicalSqlStatementV1): Promise<PublicCoreSqlQueryResultV1> => {
      let result: unknown;
      try {
        result = await Reflect.apply(method, receiver, [statement]);
      } catch {
        fail(503, "sql_executor_boundary_failed");
      }
      return snapshotQueryResult(result, statement);
    },
  });
}

async function executeTransaction<T>(
  executor: PreparedExecutorV1,
  options: Readonly<{ isolation: "read_committed"; readOnly: boolean }>,
  work: (transaction: PublicCoreSqlTransactionV1) => Promise<T>,
): Promise<T> {
  let active = true;
  let attempts = 0;
  let completed = false;
  let expected: CallbackResultV1<T> | undefined;
  const callback = async (rawTransaction: PublicCoreSqlTransactionV1): Promise<CallbackResultV1<T>> => {
    attempts += 1;
    if (!active || attempts !== 1) fail(503, "sql_executor_protocol_violation");
    const value = await work(prepareTransaction(rawTransaction));
    if (!active || attempts !== 1) fail(503, "sql_executor_protocol_violation");
    const result = Object.freeze({
      [CALLBACK_RESULT_BRAND]: "r4.public-core.sql-callback-result.v1" as const,
      value,
    });
    CALLBACK_RESULTS.add(result);
    expected = result;
    completed = true;
    return result;
  };
  let returned: unknown;
  try {
    returned = await Reflect.apply(executor.transaction, executor.receiver, [options, callback]);
  } catch (error) {
    active = false;
    const local = localErrorMetadata(error);
    if (local !== null) fail(local.status, local.code);
    fail(503, "sql_executor_boundary_failed");
  }
  active = false;
  if (
    attempts !== 1
    || !completed
    || expected === undefined
    || returned !== expected
    || !CALLBACK_RESULTS.has(expected)
  ) fail(503, "sql_executor_protocol_violation");
  return expected.value;
}

function validateContext<A extends PublicCoreSqlMutationActionV1>(
  expectedAction: A,
  context: PublicCoreSqlMutationContextV1<A>,
): void {
  exactKeys(context, [
    "action", "receiptId", "roomId", "actorClass", "actorScopeDigest",
    "idempotencyKey", "canonicalRequestHash", "expectedVersion", "requestedAt",
  ], "mutation_context_shape_invalid");
  if (context.action !== expectedAction) fail(400, "action_context_mismatch");
  assertIdKind(context.receiptId, "receipt", "receipt_id_invalid");
  assertIdKind(context.roomId, "room", "room_id_invalid");
  if (!["public", "guest_capability", "controller", "curator", "room_operator"].includes(context.actorClass)) {
    fail(400, "actor_class_invalid");
  }
  assertHmac(context.actorScopeDigest, "actor_scope_digest_invalid");
  if (!IDEMPOTENCY.test(context.idempotencyKey)) fail(400, "idempotency_key_invalid");
  assertSha(context.canonicalRequestHash, "canonical_request_hash_invalid");
  if (context.expectedVersion !== null) integer(context.expectedVersion, 1, "expected_version_invalid");
  assertTime(context.requestedAt, "requested_at_invalid");
}

function validateEvent(input: PublicCoreSqlEventInputV1): void {
  assertIdKind(input.eventId, "event", "event_id_invalid");
  assertSha(input.eventHash, "event_hash_invalid");
}

function canonicalBase64Url(
  value: unknown,
  expectedBytes: number | null,
  code: string,
): Buffer {
  if (
    typeof value !== "string"
    || (expectedBytes !== null && value.length !== Math.ceil(expectedBytes * 4 / 3))
    || !/^[A-Za-z0-9_-]+$/u.test(value)
  ) fail(400, code);
  const decoded = Buffer.from(value, "base64url");
  if (
    decoded.byteLength < 1
    || (expectedBytes !== null && decoded.byteLength !== expectedBytes)
    || decoded.toString("base64url") !== value
  ) {
    decoded.fill(0);
    fail(400, code);
  }
  return decoded;
}

function validateEncrypted(
  value: PublicCoreSqlEncryptedValueV1,
  identity: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label_ciphertext" | "capsule_ciphertext" | "pairing_code_ciphertext" | "exchange_envelope_ciphertext" | "request_ciphertext" | "guest_capsule_ciphertext";
    roomId: string;
    rowId: string;
  }>,
): string {
  if (!isRecord(value)) fail(400, "encrypted_value_invalid");
  exactKeys(value, ["envelope", "plaintextBytes", "fieldVersion"], "encrypted_value_shape_invalid");
  if (!isRecord(value.envelope)) fail(400, "encrypted_envelope_invalid");
  exactKeys(value.envelope, [
    "schemaVersion", "algorithm", "keyVersion", "nonce", "ciphertext", "tag", "aadHash",
  ], "encrypted_envelope_shape_invalid");
  const envelope = value.envelope;
  if (
    envelope.schemaVersion !== "a256gcm.v1"
    || envelope.algorithm !== "AES-256-GCM"
    || typeof envelope.keyVersion !== "string"
    || !/^keyv_[a-f0-9]{32}$/u.test(envelope.keyVersion)
  ) fail(400, "encrypted_envelope_invalid");
  const plaintextBytes = integer(value.plaintextBytes, 1, "encrypted_plaintext_size_invalid");
  integer(value.fieldVersion, 1, "encrypted_field_version_invalid");
  const field = `${identity.table}.${identity.column}` as keyof typeof PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS;
  if (plaintextBytes > PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS[field]) {
    fail(400, "encrypted_plaintext_size_invalid");
  }
  const expectedAadHash = canonicalSha256({
    schemaVersion: "r4_public_core_aad.v1",
    table: identity.table,
    column: identity.column,
    roomId: identity.roomId,
    rowId: identity.rowId,
    objectVersion: value.fieldVersion,
  });
  if (envelope.aadHash !== expectedAadHash) fail(400, "encrypted_aad_identity_mismatch");
  const nonce = canonicalBase64Url(envelope.nonce, 12, "encrypted_nonce_invalid");
  const ciphertext = canonicalBase64Url(envelope.ciphertext, plaintextBytes, "encrypted_ciphertext_invalid");
  const tag = canonicalBase64Url(envelope.tag, 16, "encrypted_tag_invalid");
  const nonceHex = nonce.toString("hex");
  nonce.fill(0);
  ciphertext.fill(0);
  tag.fill(0);
  return nonceHex;
}

function recoveredEncryptedEnvelope(
  row: SqlRow,
  envelopeKey: string,
  plaintextBytesKey: string,
  fieldVersionKey: string,
  identity: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label_ciphertext" | "capsule_ciphertext" | "pairing_code_ciphertext" | "exchange_envelope_ciphertext" | "request_ciphertext" | "guest_capsule_ciphertext";
    roomId: string;
    rowId: string;
  }>,
  nullable: boolean,
): Readonly<Record<string, unknown>> | null {
  try {
    const envelope = rowNullableObject(row, envelopeKey);
    const plaintextBytes = rowNullableNumber(row, plaintextBytesKey);
    if (envelope === null) {
      if (!nullable || plaintextBytes !== null) throw new TypeError("ciphertext_result_shape");
      return null;
    }
    if (plaintextBytes === null) throw new TypeError("ciphertext_result_shape");
    const fieldVersion = rowNumber(row, fieldVersionKey);
    validateEncrypted(
      Object.freeze({ envelope: envelope as unknown as PublicCoreEncryptedFieldV1, plaintextBytes, fieldVersion }),
      identity,
    );
    return envelope;
  } catch {
    fail(503, "sql_ciphertext_result_invalid");
  }
}

function readStatement(
  action: PublicCoreSqlReadActionV1,
  input: PublicCoreListThirdPlaceSqlInputV1 | PublicCoreReadProjectionSqlInputV1
    | PublicCoreReadInteractionSqlInputV1 | PublicCoreReadRoomOperatorStatusSqlInputV1,
): PublicCoreCanonicalSqlStatementV1 {
  switch (action) {
    case "third_place.list":
      return canonicalStatement({
        statementId: "third_place.list.read",
        action,
        phase: "read",
        text: `SELECT i.third_place_id,r.room_id,p.projection_id,p.capsule_ciphertext,
                      p.capsule_plaintext_bytes,p.capsule_field_version,p.payload_hash,
                      p.lifecycle_version,p.fresh_until,p.expires_at
                 FROM ${PUBLIC_CORE_SQL_SCHEMA}.installation i
                 JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rooms r ON r.installation_id=i.installation_id
                 JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p
                   ON p.projection_id=r.current_projection_id AND p.room_id=r.room_id
                WHERE r.room_id=$1 AND r.active AND p.current AND p.body_readable
                  AND p.owner_state='published_fresh' AND p.curation_state='admitted'
                  AND p.fresh_until>$2 AND p.expires_at>$2`,
        values: [input.roomId, input.requestedAt],
        rowExpectation: "zero_or_more",
        rowKeys: [
          "third_place_id", "room_id", "projection_id", "capsule_ciphertext",
          "capsule_plaintext_bytes", "capsule_field_version", "payload_hash",
          "lifecycle_version", "fresh_until", "expires_at",
        ],
      });
    case "projection.read": {
      const value = input as PublicCoreReadProjectionSqlInputV1;
      return canonicalStatement({
        statementId: "projection.read.read",
        action,
        phase: "read",
        text: `SELECT p.projection_id,p.room_id,p.capsule_ciphertext,
                      p.capsule_plaintext_bytes,p.capsule_field_version,p.payload_hash,
                      p.owner_state,p.curation_state,r.interaction_mode,p.current,p.body_readable,
                      p.lifecycle_version,p.published_at,p.fresh_until,p.expires_at
                 FROM ${PUBLIC_CORE_SQL_SCHEMA}.projections p
                 JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rooms r ON r.room_id=p.room_id
                WHERE p.room_id=$1 AND p.projection_id=$2`,
        values: [value.roomId, value.projectionId],
        payloadClass: "ciphertext_only",
        rowExpectation: "zero_or_one",
        rowKeys: [
          "projection_id", "room_id", "capsule_ciphertext", "payload_hash",
          "capsule_plaintext_bytes", "capsule_field_version",
          "owner_state", "curation_state", "interaction_mode", "current", "body_readable", "lifecycle_version",
          "published_at", "fresh_until", "expires_at",
        ],
      });
    }
    case "interaction.read": {
      const value = input as PublicCoreReadInteractionSqlInputV1;
      return canonicalStatement({
        statementId: "interaction.read.read",
        action,
        phase: "read",
        text: `SELECT interaction_id,room_id,origin_projection_id,
                      origin_projection_payload_hash,interaction_type,consent_hash,
                      state,body_readable,version,created_at,body_expires_at,
                      tombstone_expires_at,local_purge_received_at
                 FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
                WHERE room_id=$1 AND interaction_id=$2
                  AND ${constantTimeHmacPredicate("reply_secret_digest", "$3")}
                  AND tombstone_expires_at>$4`,
        values: [value.roomId, value.interactionId, value.replySecretDigest, value.requestedAt],
        payloadClass: "body_free",
        rowExpectation: "zero_or_one",
        rowKeys: [
          "interaction_id", "room_id", "origin_projection_id", "origin_projection_payload_hash",
          "interaction_type", "consent_hash", "state", "body_readable", "version", "created_at",
          "body_expires_at", "tombstone_expires_at", "local_purge_received_at",
        ],
      });
    }
    case "room_operator.status": {
      const value = input as PublicCoreReadRoomOperatorStatusSqlInputV1;
      return canonicalStatement({
        statementId: "room_operator.status.read",
        action,
        phase: "read",
        text: `SELECT r.room_id,r.interaction_mode,r.version,
                      CASE WHEN p.current AND p.owner_state IN ('published_fresh','stale')
                                  AND p.expires_at>$3
                           THEN p.projection_id ELSE NULL END AS current_projection_id,
                      r.event_high_water,
                      r.event_replay_floor,b.binding_id,b.version AS binding_version,
                      b.expires_at,h.last_successful_purge_at,
                      (h.last_successful_purge_at <= $3::timestamptz - interval '36 hours') AS write_stop
                 FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
                 JOIN ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings b
                   ON b.room_id=r.room_id
                  AND ${constantTimeHmacPredicate("b.credential_digest", "$2")}
                 LEFT JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p
                   ON p.room_id=r.room_id AND p.projection_id=r.current_projection_id
                CROSS JOIN ${PUBLIC_CORE_SQL_SCHEMA}.retention_health h
                WHERE r.room_id=$1 AND r.active AND b.state='current' AND b.expires_at>$3`,
        values: [value.roomId, value.bindingCredentialDigest, value.requestedAt],
        rowExpectation: "zero_or_one",
        rowKeys: [
          "room_id", "interaction_mode", "version", "current_projection_id", "event_high_water",
          "event_replay_floor", "binding_id", "binding_version", "expires_at",
          "last_successful_purge_at", "write_stop",
        ],
      });
    }
  }
}

const RECEIPT_COLUMNS = `receipt_id,action_name,request_hash,status,target_id,related_target_id,
  target_version,http_status,result_code,recovery_kind,sync_after_sequence,
  sync_high_water,sync_replay_floor,sync_result_kind,sync_event_ids,sync_event_sequences,
  sync_event_kinds,sync_object_ids,sync_object_versions,sync_event_hashes,
  sync_event_committed_ats,sync_tombstone_ids,sync_tombstone_expires_ats,pull_interaction_id,
  pull_request_field_version,pull_body_hash,pull_guest_field_version,pull_guest_hash,
  pull_body_expires_at,pull_terminal_state,source_expires_at,created_at,committed_at,expires_at`;

const RECEIPT_ROW_KEYS = Object.freeze([
  "receipt_id", "action_name", "request_hash", "status", "target_id", "related_target_id",
  "target_version", "http_status", "result_code", "recovery_kind", "sync_after_sequence",
  "sync_high_water", "sync_replay_floor", "sync_result_kind", "sync_event_ids",
  "sync_event_sequences", "sync_event_kinds", "sync_object_ids", "sync_object_versions",
  "sync_event_hashes", "sync_event_committed_ats", "sync_tombstone_ids",
  "sync_tombstone_expires_ats", "pull_interaction_id",
  "pull_request_field_version", "pull_body_hash", "pull_guest_field_version", "pull_guest_hash",
  "pull_body_expires_at", "pull_terminal_state", "source_expires_at", "created_at", "committed_at",
  "expires_at",
]);

function recoveryKind(action: PublicCoreSqlMutationActionV1): ReceiptRowV1["recoveryKind"] {
  if (action === "room.pair") return "pairing_issue";
  if (action === "room.pair.exchange") return "pairing_exchange";
  if (action === "room_operator.sync") return "sync_window";
  if (action === "room_operator.pull") return "interaction_pull";
  return "body_free";
}

function receiptReserveStatement(context: PublicCoreSqlMutationContextV1): PublicCoreCanonicalSqlStatementV1 {
  return canonicalStatement({
    statementId: `${context.action}.receipt.reserve`,
    action: context.action,
    phase: "receipt_reserve",
    text: `INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts
      (receipt_id,room_id,actor_class,actor_scope_digest,action_name,idempotency_key,
       request_hash,recovery_kind,status,created_at,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'reserved',$9,$9::timestamptz+interval '37 days')
      ON CONFLICT (actor_scope_digest,action_name,idempotency_key) DO NOTHING
      RETURNING ${RECEIPT_COLUMNS}`,
    values: [
      context.receiptId,
      context.roomId,
      context.actorClass,
      context.actorScopeDigest,
      context.action,
      context.idempotencyKey,
      context.canonicalRequestHash,
      recoveryKind(context.action),
      context.requestedAt,
    ],
    rowExpectation: "zero_or_one",
    rowKeys: RECEIPT_ROW_KEYS,
  });
}

function receiptLookupStatement(context: PublicCoreSqlMutationContextV1): PublicCoreCanonicalSqlStatementV1 {
  return canonicalStatement({
    statementId: `${context.action}.receipt.lookup`,
    action: context.action,
    phase: "receipt_lookup",
    text: `SELECT ${RECEIPT_COLUMNS}
             FROM ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts
            WHERE actor_scope_digest=$1 AND action_name=$2 AND idempotency_key=$3
            FOR UPDATE`,
    values: [context.actorScopeDigest, context.action, context.idempotencyKey],
    rowExpectation: "exactly_one",
    rowKeys: RECEIPT_ROW_KEYS,
  });
}

const ROOM_OPERATOR_MUTATION_ACTIONS = new Set<PublicCoreSqlMutationActionV1>([
  "room_operator.sync",
  "room_operator.pull",
  "room_operator.ack",
  "room_operator.projection.deliver",
  "room_operator.local_purge.receipt",
]);

function roomOperatorReplayAuthorizationStatement(
  run: MutationRunV1,
): PublicCoreCanonicalSqlStatementV1 {
  if (!ROOM_OPERATOR_MUTATION_ACTIONS.has(run.context.action)) {
    fail(500, "sql_room_operator_authorization_action_invalid");
  }
  const input = run.input as
    | PublicCoreSyncRoomOperatorSqlInputV1
    | PublicCorePullRoomOperatorSqlInputV1
    | PublicCoreAckRoomOperatorSqlInputV1
    | PublicCoreDeliverProjectionSqlInputV1
    | PublicCoreRecordLocalPurgeSqlInputV1;
  return canonicalStatement({
    statementId: `${run.context.action}.replay.binding_authorize`,
    action: run.context.action,
    phase: "precondition",
    text: `SELECT binding_id,version
             FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings
            WHERE room_id=$1
              AND ${constantTimeHmacPredicate("credential_digest", "$2")}
              AND state='current' AND expires_at>$3`,
    values: [run.context.roomId, input.bindingCredentialDigest, run.context.requestedAt],
    rowExpectation: "exactly_one",
    rowKeys: ["binding_id", "version"],
  });
}

const RECEIPT_TARGET_PREFIX = Object.freeze({
  "public_encounter.issue": "encounter",
  "interaction.create": "interaction",
  "interaction.delete": "interaction",
  "room.pair.exchange": "pairing",
  "room.create": "room",
  "room.pair": "pairing",
  "room.binding.revoke": "binding",
  "room.mode.set": "room",
  "projection.revoke": "proj",
  "curation.admit": "proj",
  "curation.unlist": "proj",
  "room_operator.sync": "room",
  "room_operator.pull": "interaction",
  "room_operator.ack": "ack",
  "room_operator.projection.deliver": "proj",
  "room_operator.local_purge.receipt": "interaction",
}) satisfies Readonly<Record<PublicCoreSqlMutationActionV1, string>>;

function parseReceipt(row: SqlRow): ReceiptRowV1 {
  const action = rowText(row, "action_name");
  if (!(PUBLIC_CORE_SQL_MUTATION_ACTIONS as readonly string[]).includes(action)) {
    fail(503, "sql_receipt_action_invalid");
  }
  const typedAction = action as PublicCoreSqlMutationActionV1;
  const requestHash = rowText(row, "request_hash");
  assertSha(requestHash, "sql_receipt_hash_invalid");
  const status = rowText(row, "status");
  if (status !== "reserved" && status !== "committed") fail(503, "sql_receipt_status_invalid");
  const recovery = rowText(row, "recovery_kind");
  if (![
    "body_free", "pairing_issue", "pairing_exchange", "sync_window", "interaction_pull", "pull_terminal",
  ].includes(recovery)) fail(503, "sql_receipt_recovery_invalid");
  const resultCode = rowNullableText(row, "result_code");
  if (resultCode !== null && !RESULT_CODE.test(resultCode)) fail(503, "sql_receipt_result_invalid");
  const receipt: ReceiptRowV1 = {
    receiptId: rowText(row, "receipt_id"),
    action: typedAction,
    requestHash,
    status,
    targetId: rowNullableText(row, "target_id"),
    relatedTargetId: rowNullableText(row, "related_target_id"),
    targetVersion: rowNullableNumber(row, "target_version"),
    httpStatus: rowNullableNumber(row, "http_status"),
    resultCode,
    recoveryKind: recovery as ReceiptRowV1["recoveryKind"],
    syncAfterSequence: rowNullableNumber(row, "sync_after_sequence"),
    syncHighWater: rowNullableNumber(row, "sync_high_water"),
    syncReplayFloor: rowNullableNumber(row, "sync_replay_floor"),
    syncResultKind: rowNullableText(row, "sync_result_kind") as ReceiptRowV1["syncResultKind"],
    syncEventIds: rowNullableStringArray(row, "sync_event_ids"),
    syncEventSequences: rowNullableNumberArray(row, "sync_event_sequences"),
    syncEventKinds: rowNullableStringArray(row, "sync_event_kinds") as ReceiptRowV1["syncEventKinds"],
    syncObjectIds: rowNullableStringArray(row, "sync_object_ids"),
    syncObjectVersions: rowNullableNumberArray(row, "sync_object_versions"),
    syncEventHashes: rowNullableStringArray(row, "sync_event_hashes") as ReceiptRowV1["syncEventHashes"],
    syncEventCommittedAts: rowNullableStringArray(row, "sync_event_committed_ats"),
    syncTombstoneIds: rowNullableStringArray(row, "sync_tombstone_ids"),
    syncTombstoneExpiresAts: rowNullableStringArray(row, "sync_tombstone_expires_ats"),
    pullInteractionId: rowNullableText(row, "pull_interaction_id"),
    pullRequestFieldVersion: rowNullableNumber(row, "pull_request_field_version"),
    pullBodyHash: rowNullableText(row, "pull_body_hash") as PublicCoreSqlSha256V1 | null,
    pullGuestFieldVersion: rowNullableNumber(row, "pull_guest_field_version"),
    pullGuestHash: rowNullableText(row, "pull_guest_hash") as PublicCoreSqlSha256V1 | null,
    pullBodyExpiresAt: rowNullableText(row, "pull_body_expires_at"),
    pullTerminalState: rowNullableText(row, "pull_terminal_state") as ReceiptRowV1["pullTerminalState"],
    createdAt: rowText(row, "created_at"),
    committedAt: rowNullableText(row, "committed_at"),
    sourceExpiresAt: rowNullableText(row, "source_expires_at"),
    expiresAt: rowText(row, "expires_at"),
  };
  assertIdKind(receipt.receiptId, "receipt", "sql_receipt_id_invalid");
  assertTime(receipt.createdAt, "sql_receipt_created_at_invalid");
  assertTime(receipt.expiresAt, "sql_receipt_expiry_invalid");
  if (receipt.committedAt !== null) assertTime(receipt.committedAt, "sql_receipt_committed_at_invalid");
  if (receipt.sourceExpiresAt !== null) assertTime(receipt.sourceExpiresAt, "sql_receipt_source_expiry_invalid");
  if (receipt.targetId !== null) {
    assertIdKind(receipt.targetId, RECEIPT_TARGET_PREFIX[typedAction], "sql_receipt_target_invalid");
  }
  if (receipt.relatedTargetId !== null) {
    assertIdKind(receipt.relatedTargetId, "binding", "sql_receipt_related_target_invalid");
  }
  if (receipt.pullInteractionId !== null) {
    assertIdKind(receipt.pullInteractionId, "interaction", "sql_receipt_pull_target_invalid");
  }
  if (receipt.targetVersion !== null && receipt.targetVersion < 1) {
    fail(503, "sql_receipt_target_version_invalid");
  }
  if (receipt.pullBodyHash !== null) assertSha(receipt.pullBodyHash, "sql_receipt_pull_hash_invalid");
  if (receipt.pullGuestHash !== null) assertSha(receipt.pullGuestHash, "sql_receipt_pull_guest_hash_invalid");
  if (receipt.pullBodyExpiresAt !== null) assertTime(receipt.pullBodyExpiresAt, "sql_receipt_pull_expiry_invalid");
  if (receipt.pullTerminalState !== null && ![
    "interaction_deleted", "origin_revoked", "interaction_expired",
  ].includes(receipt.pullTerminalState)) fail(503, "sql_receipt_terminal_state_invalid");

  const expectedRecovery = recoveryKind(typedAction);
  if (receipt.recoveryKind !== expectedRecovery
    && !(typedAction === "room_operator.pull" && receipt.recoveryKind === "pull_terminal")) {
    fail(503, "sql_receipt_recovery_action_invalid");
  }
  const syncValues = [
    receipt.syncAfterSequence, receipt.syncHighWater, receipt.syncReplayFloor,
    receipt.syncResultKind, receipt.syncEventIds, receipt.syncEventSequences,
    receipt.syncEventKinds, receipt.syncObjectIds, receipt.syncObjectVersions,
    receipt.syncEventHashes, receipt.syncEventCommittedAts, receipt.syncTombstoneIds,
    receipt.syncTombstoneExpiresAts,
  ];
  const pullValues = [
    receipt.pullInteractionId, receipt.pullRequestFieldVersion, receipt.pullBodyHash,
    receipt.pullGuestFieldVersion, receipt.pullGuestHash, receipt.pullBodyExpiresAt,
  ];
  const allNull = (values: readonly unknown[]): boolean => values.every((value) => value === null);
  const allPresent = (values: readonly unknown[]): boolean => values.every((value) => value !== null);
  const created = Date.parse(receipt.createdAt);
  const expires = Date.parse(receipt.expiresAt);
  if (expires !== created + 37 * DAY_MS && status === "reserved") {
    fail(503, "sql_receipt_expiry_invalid");
  }
  if (status === "reserved") {
    if (
      receipt.targetId !== null || receipt.relatedTargetId !== null || receipt.targetVersion !== null
      || receipt.httpStatus !== null || receipt.resultCode !== null || receipt.committedAt !== null
      || receipt.sourceExpiresAt !== null || !allNull(syncValues) || !allNull(pullValues)
      || receipt.pullTerminalState !== null
    ) fail(503, "sql_receipt_reserved_shape_invalid");
    return Object.freeze(receipt);
  }

  if (
    receipt.httpStatus === null || receipt.resultCode === null || receipt.targetId === null
    || receipt.targetVersion === null || receipt.committedAt === null || receipt.sourceExpiresAt === null
    || Date.parse(receipt.committedAt) < created || Date.parse(receipt.committedAt) >= expires
    || expires !== Date.parse(receipt.sourceExpiresAt)
    || expires <= created || expires > created + 37 * DAY_MS
  ) fail(503, "sql_receipt_terminal_invalid");
  const expected = receipt.recoveryKind === "pull_terminal"
    ? { status: 410, code: "pull_terminal" }
    : receipt.recoveryKind === "sync_window" && receipt.syncResultKind === "cursor_gone"
      ? { status: 410, code: "cursor_gone" }
      : resultMetadata(typedAction);
  if (receipt.httpStatus !== expected.status || receipt.resultCode !== expected.code) {
    fail(503, "sql_receipt_result_invalid");
  }
  const pairingRecovery = receipt.recoveryKind === "pairing_issue" || receipt.recoveryKind === "pairing_exchange";
  if (pairingRecovery && expires > created + 10 * 60 * 1_000) fail(503, "sql_receipt_expiry_invalid");
  if (!pairingRecovery && receipt.recoveryKind !== "sync_window"
    && receipt.recoveryKind !== "interaction_pull" && receipt.recoveryKind !== "pull_terminal"
    && expires !== created + 37 * DAY_MS) fail(503, "sql_receipt_expiry_invalid");

  if (receipt.recoveryKind === "body_free") {
    if (receipt.relatedTargetId !== null || !allNull(syncValues) || !allNull(pullValues)
      || receipt.pullTerminalState !== null) fail(503, "sql_receipt_closed_shape_invalid");
  } else if (receipt.recoveryKind === "pairing_issue") {
    if (receipt.relatedTargetId !== null || !allNull(syncValues) || !allNull(pullValues)
      || receipt.pullTerminalState !== null) fail(503, "sql_receipt_closed_shape_invalid");
  } else if (receipt.recoveryKind === "pairing_exchange") {
    if (receipt.relatedTargetId === null || !allNull(syncValues) || !allNull(pullValues)
      || receipt.pullTerminalState !== null) fail(503, "sql_receipt_closed_shape_invalid");
  } else if (receipt.recoveryKind === "sync_window") {
    if (receipt.relatedTargetId !== null || !allPresent(syncValues) || !allNull(pullValues)
      || receipt.pullTerminalState !== null) fail(503, "sql_receipt_closed_shape_invalid");
    validateSyncReceiptSnapshot(receipt);
  } else if (receipt.recoveryKind === "interaction_pull") {
    if (
      receipt.relatedTargetId !== null || !allNull(syncValues)
      || receipt.pullInteractionId !== receipt.targetId || receipt.pullRequestFieldVersion === null
      || receipt.pullRequestFieldVersion < 1 || receipt.pullBodyHash === null
      || receipt.pullBodyExpiresAt === null || receipt.pullTerminalState !== null
      || receipt.sourceExpiresAt !== receipt.pullBodyExpiresAt
      || ((receipt.pullGuestFieldVersion === null) !== (receipt.pullGuestHash === null))
      || (receipt.pullGuestFieldVersion !== null && receipt.pullGuestFieldVersion < 1)
    ) fail(503, "sql_receipt_closed_shape_invalid");
  } else if (
    receipt.relatedTargetId !== null || !allNull(syncValues) || !allNull(pullValues)
    || receipt.pullTerminalState === null
  ) fail(503, "sql_receipt_closed_shape_invalid");
  return Object.freeze(receipt);
}

interface LockIdentityV1 {
  readonly roomId: string;
  readonly bindingId: string | null;
  readonly bindingCredentialDigest: PublicCoreSqlHmacSha256V1 | null;
  readonly pairingId: string | null;
  readonly projectionId: string | null;
  readonly encounterId: string | null;
  readonly encounterSecretDigest: PublicCoreSqlHmacSha256V1 | null;
  readonly interactionId: string | null;
  readonly eventId: string | null;
  readonly eventSequence: number | null;
  readonly afterSequence: number | null;
  readonly requestedAt: string;
}

const MUTATION_LOCKS = Object.freeze({
  "public_encounter.issue": ["installation", "room", "projection", "purge_or_retention"],
  "interaction.create": ["installation", "room", "projection", "encounter", "purge_or_retention"],
  "interaction.delete": ["installation", "room", "encounter", "interaction", "purge_or_retention"],
  "room.pair.exchange": ["installation", "room", "binding_or_pairing", "purge_or_retention"],
  "room.create": ["installation", "purge_or_retention"],
  "room.pair": ["installation", "room", "binding_or_pairing", "purge_or_retention"],
  "room.binding.revoke": ["installation", "room", "binding_or_pairing", "purge_or_retention"],
  "room.mode.set": ["installation", "room", "purge_or_retention"],
  "projection.revoke": ["installation", "room", "projection", "encounter", "interaction", "purge_or_retention"],
  "curation.admit": ["installation", "room", "projection", "purge_or_retention"],
  "curation.unlist": ["installation", "room", "projection", "purge_or_retention"],
  "room_operator.sync": ["installation", "room", "binding_or_pairing", "event_or_ack", "purge_or_retention"],
  "room_operator.pull": ["installation", "room", "binding_or_pairing", "projection", "encounter", "interaction", "purge_or_retention"],
  "room_operator.ack": ["installation", "room", "binding_or_pairing", "event_or_ack", "purge_or_retention"],
  "room_operator.projection.deliver": ["installation", "room", "binding_or_pairing", "projection", "encounter", "interaction", "purge_or_retention"],
  "room_operator.local_purge.receipt": ["installation", "room", "binding_or_pairing", "interaction", "purge_or_retention"],
}) satisfies Readonly<Record<PublicCoreSqlMutationActionV1, readonly PublicCoreSqlLockClassV1[]>>;

function lockStatement(
  action: PublicCoreSqlMutationActionV1,
  lockClass: PublicCoreSqlLockClassV1,
  identity: LockIdentityV1,
): PublicCoreCanonicalSqlStatementV1 {
  let text: string;
  let values: readonly PublicCoreSqlValueV1[] = [identity.roomId];
  let rowExpectation: PublicCoreCanonicalSqlStatementV1["rowExpectation"] = "exactly_one";
  let rowKeys: readonly string[];
  switch (lockClass) {
    case "installation":
      text = `SELECT installation_id,entity_id,version
                FROM ${PUBLIC_CORE_SQL_SCHEMA}.installation
               WHERE singleton_slot FOR UPDATE`;
      values = [];
      rowKeys = ["installation_id", "entity_id", "version"];
      break;
    case "room":
      text = `SELECT room_id,installation_id,interaction_mode,active,version,
                     current_projection_id,event_high_water,event_replay_floor
                FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms WHERE room_id=$1 FOR UPDATE`;
      rowKeys = [
        "room_id", "installation_id", "interaction_mode", "active", "version",
        "current_projection_id", "event_high_water", "event_replay_floor",
      ];
      break;
    case "binding_or_pairing":
      if (action === "room.pair.exchange") {
        text = `SELECT pairing_id,room_id,state,version,expires_at,pairing_code_digest,
                       pairing_code_ciphertext,exchange_envelope_ciphertext
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
                 WHERE room_id=$1 AND pairing_id=$2 FOR UPDATE`;
        values = [identity.roomId, identity.pairingId];
        rowKeys = [
          "pairing_id", "room_id", "state", "version", "expires_at", "pairing_code_digest",
          "pairing_code_ciphertext", "exchange_envelope_ciphertext",
        ];
      } else if (action === "room.pair") {
        text = `SELECT pairing_id,state,version,expires_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
                 WHERE room_id=$1 ORDER BY pairing_id COLLATE "C" FOR UPDATE`;
        rowExpectation = "zero_or_more";
        rowKeys = ["pairing_id", "state", "version", "expires_at"];
      } else if (action === "room.binding.revoke") {
        text = `SELECT binding_id,room_id,state,version,expires_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings
                 WHERE room_id=$1 AND binding_id=$2 FOR UPDATE`;
        values = [identity.roomId, identity.bindingId];
        rowKeys = ["binding_id", "room_id", "state", "version", "expires_at"];
      } else {
        text = `SELECT binding_id,room_id,state,version,expires_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings
                 WHERE room_id=$1
                   AND ${constantTimeHmacPredicate("credential_digest", "$2")}
                   AND state='current' AND expires_at>$3
                 FOR UPDATE`;
        values = [identity.roomId, identity.bindingCredentialDigest, identity.requestedAt];
        rowKeys = ["binding_id", "room_id", "state", "version", "expires_at"];
      }
      break;
    case "projection":
      if (action === "room_operator.projection.deliver") {
        text = `SELECT p.projection_id,p.owner_state,p.curation_state,p.lifecycle_version
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
                  JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p
                    ON p.room_id=r.room_id AND p.projection_id=r.current_projection_id
                 WHERE r.room_id=$1 ORDER BY p.projection_id COLLATE "C" FOR UPDATE OF p`;
        values = [identity.roomId];
        rowExpectation = "zero_or_more";
        rowKeys = ["projection_id", "owner_state", "curation_state", "lifecycle_version"];
      } else if (["interaction.create", "room_operator.pull"].includes(action)) {
        const joinColumn = action === "interaction.create"
          ? constantTimeHmacPredicate("e.encounter_secret_digest", "$2")
          : "x.interaction_id=$2";
        const joinTable = action === "interaction.create"
          ? `${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p ON p.room_id=e.room_id AND p.projection_id=e.projection_id`
          : `${PUBLIC_CORE_SQL_SCHEMA}.interactions x JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p ON p.room_id=x.room_id AND p.projection_id=x.origin_projection_id`;
        text = `SELECT p.projection_id,p.owner_state,p.curation_state,p.lifecycle_version
                  FROM ${joinTable}
                 WHERE p.room_id=$1 AND ${joinColumn}
                   ${action === "interaction.create" ? "AND p.projection_id=$3" : ""}
                 ORDER BY p.projection_id COLLATE "C" FOR UPDATE OF p`;
        values = [
          identity.roomId,
          action === "interaction.create" ? identity.encounterSecretDigest : identity.interactionId,
          ...(action === "interaction.create" ? [identity.projectionId] : []),
        ];
        rowKeys = ["projection_id", "owner_state", "curation_state", "lifecycle_version"];
      } else {
        text = `SELECT projection_id,owner_state,curation_state,current,body_readable,
                       lifecycle_version,fresh_until,expires_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.projections
                 WHERE room_id=$1 AND projection_id=$2
                 ORDER BY projection_id COLLATE "C" FOR UPDATE`;
        values = [identity.roomId, identity.projectionId];
        rowKeys = [
          "projection_id", "owner_state", "curation_state", "current", "body_readable",
          "lifecycle_version", "fresh_until", "expires_at",
        ];
      }
      break;
    case "encounter":
      if (["projection.revoke", "room_operator.projection.deliver"].includes(action)) {
        const predicate = action === "projection.revoke"
          ? "e.projection_id=$2"
          : "e.projection_id=r.current_projection_id";
        text = `SELECT e.encounter_id,e.projection_id,e.state,e.version
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
                  JOIN ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e ON e.room_id=r.room_id
                 WHERE r.room_id=$1 AND ${predicate}
                 ORDER BY e.encounter_id COLLATE "C" FOR UPDATE OF e`;
        values = action === "projection.revoke"
          ? [identity.roomId, identity.projectionId]
          : [identity.roomId];
        rowExpectation = "zero_or_more";
        rowKeys = ["encounter_id", "projection_id", "state", "version"];
      } else if (["interaction.delete", "room_operator.pull"].includes(action)) {
        text = `SELECT e.encounter_id,e.state,e.version,e.expires_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
                  JOIN ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
                    ON e.room_id=x.room_id AND e.encounter_id=x.encounter_id
                 WHERE x.room_id=$1 AND x.interaction_id=$2 FOR UPDATE OF e`;
        values = [identity.roomId, identity.interactionId];
        rowKeys = ["encounter_id", "state", "version", "expires_at"];
      } else {
        const projectionPredicate = action === "interaction.create" ? " AND projection_id=$3" : "";
        text = `SELECT encounter_id,state,version,expires_at,issuance_bucket_digest
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters
                 WHERE room_id=$1
                   AND ${constantTimeHmacPredicate("encounter_secret_digest", "$2")}
                   ${projectionPredicate}
                 FOR UPDATE`;
        values = [identity.roomId, identity.encounterSecretDigest,
          ...(action === "interaction.create" ? [identity.projectionId] : [])];
        rowKeys = ["encounter_id", "state", "version", "expires_at", "issuance_bucket_digest"];
      }
      break;
    case "interaction":
      if (["projection.revoke", "room_operator.projection.deliver"].includes(action)) {
        const predicate = action === "projection.revoke"
          ? "x.origin_projection_id=$2"
          : "x.origin_projection_id=r.current_projection_id";
        text = `SELECT x.interaction_id,x.origin_projection_id,x.state,x.version
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
                  JOIN ${PUBLIC_CORE_SQL_SCHEMA}.interactions x ON x.room_id=r.room_id
                 WHERE r.room_id=$1 AND ${predicate}
                 ORDER BY x.interaction_id COLLATE "C" FOR UPDATE OF x`;
        values = action === "projection.revoke"
          ? [identity.roomId, identity.projectionId]
          : [identity.roomId];
        rowExpectation = "zero_or_more";
        rowKeys = ["interaction_id", "origin_projection_id", "state", "version"];
      } else {
        text = `SELECT interaction_id,state,body_readable,version,body_expires_at,
                       local_purge_received_at
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
                 WHERE room_id=$1 AND interaction_id=$2 FOR UPDATE`;
        values = [identity.roomId, identity.interactionId];
        rowKeys = [
          "interaction_id", "state", "body_readable", "version", "body_expires_at",
          "local_purge_received_at",
        ];
      }
      break;
    case "event_or_ack":
      if (action === "room_operator.ack") {
        text = `SELECT event_id,sequence,event_hash
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events
                 WHERE room_id=$1 AND event_id=$2 AND sequence=$3 FOR UPDATE`;
        values = [identity.roomId, identity.eventId, identity.eventSequence];
        rowKeys = ["event_id", "sequence", "event_hash"];
      } else {
        text = `SELECT e.event_id,e.sequence,e.event_hash
                  FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
                  JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rooms r ON r.room_id=e.room_id
                 WHERE e.room_id=$1 AND e.sequence>$2 AND e.sequence<=r.event_high_water
                 ORDER BY e.event_id COLLATE "C" FOR UPDATE OF e`;
        values = [identity.roomId, identity.afterSequence];
        rowExpectation = "zero_or_more";
        rowKeys = ["event_id", "sequence", "event_hash"];
      }
      break;
    case "purge_or_retention":
      text = `SELECT health_id,last_successful_purge_at,version
                FROM ${PUBLIC_CORE_SQL_SCHEMA}.retention_health
               WHERE singleton_slot FOR UPDATE`;
      values = [];
      rowKeys = ["health_id", "last_successful_purge_at", "version"];
      break;
  }
  return canonicalStatement({
    statementId: `${action}.lock.${lockClass}`,
    action,
    phase: "lock",
    lockClass,
    text,
    values,
    rowExpectation,
    rowKeys,
  });
}

function retentionPreconditionStatement(
  action: PublicCoreSqlMutationActionV1,
  context: PublicCoreSqlMutationContextV1,
  mode: "public_single" | "closed" | null,
): PublicCoreCanonicalSqlStatementV1 {
  const alwaysAllowed = new Set<PublicCoreSqlMutationActionV1>([
    "interaction.delete",
    "room.binding.revoke",
    "projection.revoke",
    "curation.unlist",
    "room_operator.sync",
    "room_operator.ack",
    "room_operator.local_purge.receipt",
  ]);
  let predicate = "h.last_successful_purge_at>$1::timestamptz-interval '36 hours'";
  let values: readonly PublicCoreSqlValueV1[] = [context.requestedAt];
  if (alwaysAllowed.has(action)) {
    predicate = "true";
    values = [];
  }
  if (action === "room.mode.set") {
    predicate = `(h.last_successful_purge_at>$1::timestamptz-interval '36 hours'
      OR ($2='closed' AND r.interaction_mode='public_single'))`;
    values = [context.requestedAt, mode];
  }
  // A committed pull replay returned before this point. Every pull reaching
  // this precondition is fresh and therefore cannot decrypt during write-stop.
  const roomJoin = action === "room.mode.set"
    ? `JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rooms r ON r.room_id=$3`
    : "";
  if (action === "room.mode.set") values = [...values, context.roomId];
  return canonicalStatement({
    statementId: `${action}.precondition.retention_health`,
    action,
    phase: "precondition",
    text: `SELECT h.health_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.retention_health h
            ${roomJoin} WHERE h.singleton_slot AND ${predicate}`,
    values,
    rowExpectation: "exactly_one",
    rowKeys: ["health_id"],
  });
}

type MutationInputV1 =
  | PublicCoreIssueEncounterSqlInputV1
  | PublicCoreCreateInteractionSqlInputV1
  | PublicCoreDeleteInteractionSqlInputV1
  | PublicCoreExchangeRoomPairSqlInputV1
  | PublicCoreCreateRoomSqlInputV1
  | PublicCoreCreateRoomPairSqlInputV1
  | PublicCoreRevokeRoomBindingSqlInputV1
  | PublicCoreSetRoomModeSqlInputV1
  | PublicCoreRevokeProjectionSqlInputV1
  | PublicCoreCurationSqlInputV1
  | PublicCoreSyncRoomOperatorSqlInputV1
  | PublicCorePullRoomOperatorSqlInputV1
  | PublicCoreAckRoomOperatorSqlInputV1
  | PublicCoreDeliverProjectionSqlInputV1
  | PublicCoreRecordLocalPurgeSqlInputV1;

function nonceReservationStatement(
  action: PublicCoreSqlMutationActionV1,
  encrypted: PublicCoreSqlEncryptedValueV1,
  identity: Readonly<{
    table: "rooms" | "projections" | "pairing_challenges" | "interactions";
    column: "label_ciphertext" | "capsule_ciphertext" | "pairing_code_ciphertext" | "exchange_envelope_ciphertext" | "request_ciphertext" | "guest_capsule_ciphertext";
    roomId: string;
    rowId: string;
  }>,
): PublicCoreCanonicalSqlStatementV1 {
  const nonce = validateEncrypted(encrypted, identity);
  return canonicalStatement({
    statementId: `${action}.nonce.${identity.table}.${identity.column}`,
    action,
    phase: "nonce_reservation",
    text: `INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.encryption_nonces
      (key_version,nonce,table_name,row_id,column_name,field_version)
      VALUES ($1,decode($2,'hex'),'${identity.table}',$3,'${identity.column}',$4)
      RETURNING key_version`,
    values: [encrypted.envelope.keyVersion, nonce, identity.rowId, encrypted.fieldVersion],
    rowExpectation: "exactly_one",
    rowKeys: ["key_version"],
  });
}

function nonceStatements(run: MutationRunV1): readonly PublicCoreCanonicalSqlStatementV1[] {
  const { action, roomId } = run.context;
  switch (action) {
    case "room.create": {
      const input = run.input as PublicCoreCreateRoomSqlInputV1;
      return [nonceReservationStatement(action, input.labelCiphertext, {
        table: "rooms", column: "label_ciphertext", roomId, rowId: roomId,
      })];
    }
    case "room.pair": {
      const input = run.input as PublicCoreCreateRoomPairSqlInputV1;
      return [nonceReservationStatement(action, input.pairingCodeCiphertext, {
        table: "pairing_challenges", column: "pairing_code_ciphertext", roomId, rowId: input.pairingId,
      })];
    }
    case "room.pair.exchange": {
      const input = run.input as PublicCoreExchangeRoomPairSqlInputV1;
      return [nonceReservationStatement(action, input.exchangeEnvelopeCiphertext, {
        table: "pairing_challenges", column: "exchange_envelope_ciphertext", roomId, rowId: input.pairingId,
      })];
    }
    case "interaction.create": {
      const input = run.input as PublicCoreCreateInteractionSqlInputV1;
      const statements = [nonceReservationStatement(action, input.requestCiphertext, {
        table: "interactions", column: "request_ciphertext", roomId, rowId: input.interactionId,
      })];
      if (input.guestCapsuleCiphertext !== null) {
        statements.push(nonceReservationStatement(action, input.guestCapsuleCiphertext, {
          table: "interactions", column: "guest_capsule_ciphertext", roomId, rowId: input.interactionId,
        }));
      }
      return Object.freeze(statements);
    }
    case "room_operator.projection.deliver": {
      const input = run.input as PublicCoreDeliverProjectionSqlInputV1;
      return [nonceReservationStatement(action, input.capsuleCiphertext, {
        table: "projections", column: "capsule_ciphertext", roomId, rowId: input.projectionId,
      })];
    }
    default:
      return Object.freeze([]);
  }
}

function domainStatement(run: MutationRunV1): PublicCoreCanonicalSqlStatementV1 {
  const { context } = run;
  const action = context.action;
  let text: string;
  let values: readonly PublicCoreSqlValueV1[];
  let payloadClass: PublicCoreCanonicalSqlStatementV1["payloadClass"] = "body_free";
  switch (action) {
    case "public_encounter.issue": {
      const input = run.input as PublicCoreIssueEncounterSqlInputV1;
      text = `WITH hourly AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.rate_events
          (rate_event_id,room_id,installation_id,bucket_kind,bucket_digest,
           window_start,window_end,event_ordinal,expires_at)
        SELECT $1,r.room_id,r.installation_id,'encounter_issue_hour',$2,$3,
               $3::timestamptz+interval '1 hour',count(prior.rate_event_id)::integer+1,$4
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
          LEFT JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rate_events prior
            ON prior.room_id=r.room_id AND prior.bucket_kind='encounter_issue_hour'
           AND ${constantTimeHmacPredicate("prior.bucket_digest", "$2")} AND prior.window_start=$3
         WHERE r.room_id=$5 AND r.interaction_mode='public_single' AND r.active
         GROUP BY r.room_id,r.installation_id HAVING count(prior.rate_event_id)<10
         RETURNING rate_event_id,room_id
      ), daily AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.rate_events
          (rate_event_id,room_id,installation_id,bucket_kind,bucket_digest,
           window_start,window_end,event_ordinal,expires_at)
        SELECT $6,r.room_id,r.installation_id,'encounter_issue_day',$7,$8,
               $8::timestamptz+interval '24 hours',count(prior.rate_event_id)::integer+1,$4
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r JOIN hourly h ON h.room_id=r.room_id
          LEFT JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rate_events prior
            ON prior.room_id=r.room_id AND prior.bucket_kind='encounter_issue_day'
           AND ${constantTimeHmacPredicate("prior.bucket_digest", "$7")} AND prior.window_start=$8
         GROUP BY r.room_id,r.installation_id HAVING count(prior.rate_event_id)<50
         RETURNING rate_event_id,room_id
      ) INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters
          (encounter_id,room_id,installation_id,projection_id,encounter_secret_digest,
           issuance_bucket_digest,hourly_rate_event_id,daily_rate_event_id,issued_at,expires_at)
        SELECT $9,r.room_id,r.installation_id,$10,$11,$12,h.rate_event_id,d.rate_event_id,$13,$14
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r JOIN hourly h ON h.room_id=r.room_id
          JOIN daily d ON d.room_id=r.room_id
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p
            ON p.room_id=r.room_id AND p.projection_id=$10
         WHERE r.room_id=$5 AND r.interaction_mode='public_single' AND r.active
           AND p.current AND p.body_readable AND p.owner_state='published_fresh'
           AND p.curation_state='admitted' AND p.fresh_until>$13 AND p.expires_at>$13
           AND p.lifecycle_version=$15
        RETURNING encounter_id AS target_id,version AS target_version`;
      values = [
        input.hourlyRateEventId, input.hourlyBucketDigest, input.hourWindowStart,
        input.rateExpiresAt, context.roomId, input.dailyRateEventId,
        input.dailyBucketDigest, input.dayWindowStart, input.encounterId,
        input.projectionId, input.encounterSecretDigest, input.issuanceBucketDigest,
        context.requestedAt, input.encounterExpiresAt, context.expectedVersion,
      ];
      break;
    }
    case "interaction.create": {
      const input = run.input as PublicCoreCreateInteractionSqlInputV1;
      text = `WITH accepted_rate AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.rate_events
          (rate_event_id,room_id,installation_id,bucket_kind,bucket_digest,
           window_start,window_end,event_ordinal,expires_at)
        SELECT $1,r.room_id,r.installation_id,'interaction_accept_day',e.issuance_bucket_digest,
               $2,$2::timestamptz+interval '24 hours',count(prior.rate_event_id)::integer+1,$3
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
            ON e.room_id=r.room_id
           AND ${constantTimeHmacPredicate("e.encounter_secret_digest", "$4")}
           AND e.projection_id=$21
          LEFT JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rate_events prior
            ON prior.room_id=r.room_id AND prior.bucket_kind='interaction_accept_day'
           AND prior.bucket_digest=e.issuance_bucket_digest AND prior.window_start=$2
         WHERE r.room_id=$5 AND r.interaction_mode='public_single' AND r.active
           AND e.state='issued' AND e.expires_at>$6
           AND (SELECT count(*) FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
                 WHERE x.room_id=r.room_id AND x.state IN ('accepted','seen_locally'))<20
         GROUP BY r.room_id,r.installation_id,e.issuance_bucket_digest
        HAVING count(prior.rate_event_id)<3 RETURNING rate_event_id
      ), accepted AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.interactions
          (interaction_id,room_id,installation_id,encounter_id,origin_projection_id,
           interaction_type,request_ciphertext,guest_capsule_ciphertext,request_plaintext_bytes,
           guest_capsule_plaintext_bytes,request_field_version,guest_capsule_field_version,
           request_hash,guest_capsule_hash,consent_hash,origin_projection_payload_hash,
           reply_secret_digest,delete_secret_digest,created_at,body_expires_at,tombstone_expires_at)
        SELECT $7,e.room_id,e.installation_id,e.encounter_id,e.projection_id,$8,$9,$10,$11,$12,$13,
               $14,$15,$16,$17,p.payload_hash,$18,$19,$6,$20,$20::timestamptz+interval '7 days'
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.projections p
            ON p.room_id=e.room_id AND p.projection_id=e.projection_id
          JOIN accepted_rate rate ON true
         WHERE e.room_id=$5 AND e.state='issued'
           AND ${constantTimeHmacPredicate("e.encounter_secret_digest", "$4")}
           AND e.projection_id=$21
           AND p.current AND p.body_readable AND p.owner_state='published_fresh'
           AND p.curation_state='admitted' AND p.fresh_until>$6 AND p.expires_at>$6
        RETURNING interaction_id,encounter_id,room_id,version
      ), consumed AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
           SET state='consumed',consumed_interaction_id=a.interaction_id,
               consumed_at=$6,version=e.version+1
          FROM accepted a WHERE e.room_id=a.room_id AND e.encounter_id=a.encounter_id
        RETURNING e.encounter_id
      ) SELECT a.interaction_id AS target_id,a.version AS target_version
          FROM accepted a JOIN consumed c ON c.encounter_id=a.encounter_id`;
      values = [
        input.acceptRateEventId, input.dayWindowStart, input.rateExpiresAt,
        input.encounterSecretDigest, context.roomId, context.requestedAt, input.interactionId,
        input.interactionType,
        input.requestCiphertext.envelope,
        input.guestCapsuleCiphertext?.envelope ?? null,
        input.requestCiphertext.plaintextBytes,
        input.guestCapsuleCiphertext?.plaintextBytes ?? null,
        input.requestCiphertext.fieldVersion,
        input.guestCapsuleCiphertext?.fieldVersion ?? 1,
        input.requestBodyHash, input.guestCapsuleBodyHash, input.consentHash,
        input.replySecretDigest, input.deleteSecretDigest, input.bodyExpiresAt,
        input.projectionId,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "interaction.delete": {
      const input = run.input as PublicCoreDeleteInteractionSqlInputV1;
      text = `WITH terminal AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions
           SET request_ciphertext=NULL,guest_capsule_ciphertext=NULL,body_readable=false,
               state='interaction_deleted',deleted_at=$1,version=version+1
         WHERE room_id=$2 AND interaction_id=$3 AND body_readable
           AND ${constantTimeHmacPredicate("delete_secret_digest", "$4")} AND version=$5
        RETURNING interaction_id,room_id,installation_id,version,
                  GREATEST(request_field_version,guest_capsule_field_version) AS field_version
      ), purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT $6,room_id,installation_id,'interaction_body',interaction_id,field_version,
               $1::timestamptz+interval '23 hours' FROM terminal
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
        RETURNING purge_job_id
      ) SELECT interaction_id AS target_id,version AS target_version FROM terminal`;
      values = [
        context.requestedAt, context.roomId, input.interactionId,
        input.deleteSecretDigest, context.expectedVersion, input.interactionPurgeJobId,
      ];
      break;
    }
    case "room.pair.exchange": {
      const input = run.input as PublicCoreExchangeRoomPairSqlInputV1;
      text = `WITH consumed AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
           SET state='exchanged',pairing_code_ciphertext=NULL,
               exchange_envelope_ciphertext=$1,exchange_envelope_plaintext_bytes=$2,
               exchange_envelope_field_version=$3,client_public_key_hash=$4,
               consumed_at=$5,version=version+1
         WHERE room_id=$6 AND pairing_id=$7 AND state='issued' AND expires_at>$5
           AND ${constantTimeHmacPredicate("pairing_code_digest", "$8")} AND version=$9
        RETURNING pairing_id,room_id,installation_id,version,expires_at,
                  exchange_envelope_ciphertext
      ), bound AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings
          (binding_id,room_id,installation_id,credential_digest,paired_at,expires_at)
        SELECT $10,room_id,installation_id,$11,$5,$12 FROM consumed
        RETURNING binding_id,room_id
      ) SELECT c.pairing_id AS target_id,c.version AS target_version,b.binding_id,
               c.exchange_envelope_ciphertext,c.expires_at
          FROM consumed c JOIN bound b ON b.room_id=c.room_id`;
      values = [
        input.exchangeEnvelopeCiphertext.envelope,
        input.exchangeEnvelopeCiphertext.plaintextBytes,
        input.exchangeEnvelopeCiphertext.fieldVersion,
        input.clientPublicKeyHash, context.requestedAt, context.roomId,
        input.pairingId, input.pairingCodeDigest, context.expectedVersion,
        input.bindingId, input.bindingCredentialDigest, input.bindingExpiresAt,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "room.create": {
      const input = run.input as PublicCoreCreateRoomSqlInputV1;
      text = `INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.rooms
        (room_id,installation_id,interaction_mode,label_ciphertext,label_plaintext_bytes,
         label_field_version,version,created_at,closed_at)
        SELECT $1,i.installation_id,'closed',$2,$3,$4,1,$5,$5
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.installation i
         WHERE i.singleton_slot AND i.entity_id=$6
        RETURNING room_id AS target_id,version AS target_version`;
      values = [
        context.roomId, input.labelCiphertext.envelope, input.labelCiphertext.plaintextBytes,
        input.labelCiphertext.fieldVersion, context.requestedAt, input.entityId,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "room.pair": {
      const input = run.input as PublicCoreCreateRoomPairSqlInputV1;
      text = `WITH expired AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
           SET state='expired',pairing_code_ciphertext=NULL,exchange_envelope_ciphertext=NULL,
               version=version+1
         WHERE room_id=$1 AND state IN ('issued','exchanged') AND expires_at<=$2
        RETURNING pairing_id,room_id,installation_id,
                  GREATEST(pairing_code_field_version,exchange_envelope_field_version) AS field_version
      ), purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_pair_'||pg_catalog.md5(pairing_id||':'||field_version::text),
               room_id,installation_id,'pairing_material',pairing_id,field_version,
               $2::timestamptz+interval '23 hours' FROM expired
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
      ) INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
        (pairing_id,room_id,installation_id,pairing_code_ciphertext,
         pairing_code_plaintext_bytes,pairing_code_digest,pairing_code_field_version,
         exchange_envelope_ciphertext,exchange_envelope_plaintext_bytes,
         exchange_envelope_field_version,created_at,expires_at)
        SELECT $3,r.room_id,r.installation_id,$4,$5,$6,$7,NULL,NULL,1,$2,$8
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
         WHERE r.room_id=$1 AND r.active AND r.version=$9
           AND NOT EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges p
                            WHERE p.room_id=r.room_id AND p.state='issued' AND p.expires_at>$2)
        RETURNING pairing_id AS target_id,version AS target_version,
                  pairing_code_ciphertext,expires_at`;
      values = [
        context.roomId, context.requestedAt, input.pairingId,
        input.pairingCodeCiphertext.envelope, input.pairingCodeCiphertext.plaintextBytes,
        input.pairingCodeDigest, input.pairingCodeCiphertext.fieldVersion, input.pairingExpiresAt,
        context.expectedVersion,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "room.binding.revoke": {
      const input = run.input as PublicCoreRevokeRoomBindingSqlInputV1;
      text = `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings
                 SET state='revoked',revoked_at=$1,version=version+1
               WHERE room_id=$2 AND binding_id=$3 AND state='current' AND version=$4
              RETURNING binding_id AS target_id,version AS target_version`;
      values = [context.requestedAt, context.roomId, input.bindingId, context.expectedVersion];
      break;
    }
    case "room.mode.set": {
      const input = run.input as PublicCoreSetRoomModeSqlInputV1;
      text = `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms
                 SET interaction_mode=$1,
                     closed_at=CASE WHEN $1='closed' THEN $2::timestamptz ELSE NULL END,
                     version=version+1
               WHERE room_id=$3 AND active AND version=$4
                 AND interaction_mode<>$1 AND $1 IN ('public_single','closed')
              RETURNING room_id AS target_id,version AS target_version`;
      values = [input.interactionMode, context.requestedAt, context.roomId, context.expectedVersion];
      break;
    }
    case "projection.revoke": {
      const input = run.input as PublicCoreRevokeProjectionSqlInputV1;
      text = `WITH revoked AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.projections
           SET owner_state='revoked',current=false,body_readable=false,capsule_ciphertext=NULL,
               revoked_at=$1,lifecycle_version=lifecycle_version+1
         WHERE room_id=$2 AND projection_id=$3 AND owner_state IN ('published_fresh','stale')
           AND lifecycle_version=$4
        RETURNING projection_id,room_id,installation_id,lifecycle_version,capsule_field_version
      ), room_clear AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms r SET current_projection_id=NULL,version=version+1
          FROM revoked p WHERE r.room_id=p.room_id AND r.current_projection_id=p.projection_id
      ), encounters AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
           SET state='invalidated',invalidated_at=$1,version=version+1
          FROM revoked p WHERE e.room_id=p.room_id AND e.projection_id=p.projection_id
           AND e.state='issued'
      ), interactions AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
           SET state='origin_revoked',body_readable=false,request_ciphertext=NULL,
               guest_capsule_ciphertext=NULL,version=version+1
          FROM revoked p WHERE x.room_id=p.room_id AND x.origin_projection_id=p.projection_id
           AND x.state IN ('accepted','seen_locally')
        RETURNING x.interaction_id,x.room_id,x.installation_id,
                  GREATEST(x.request_field_version,x.guest_capsule_field_version) AS field_version
      ), purge_projection AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT $5,room_id,installation_id,'projection_body',projection_id,capsule_field_version,
               $1::timestamptz+interval '23 hours' FROM revoked
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
      ), purge_interactions AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_interaction_'||pg_catalog.md5(interaction_id||':'||field_version::text),
               room_id,installation_id,'interaction_body',interaction_id,field_version,
               $1::timestamptz+interval '23 hours'
          FROM interactions ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
      ) SELECT projection_id AS target_id,lifecycle_version AS target_version FROM revoked`;
      values = [
        context.requestedAt, context.roomId, input.projectionId,
        context.expectedVersion, input.projectionPurgeJobId,
      ];
      break;
    }
    case "curation.admit": {
      const input = run.input as PublicCoreCurationSqlInputV1;
      text = `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.projections
                 SET curation_state='admitted',lifecycle_version=lifecycle_version+1
               WHERE room_id=$1 AND projection_id=$2 AND current AND body_readable
                 AND owner_state='published_fresh' AND curation_state='not_admitted'
                 AND fresh_until>$3 AND expires_at>$3 AND lifecycle_version=$4
              RETURNING projection_id AS target_id,lifecycle_version AS target_version`;
      values = [context.roomId, input.projectionId, context.requestedAt, context.expectedVersion];
      break;
    }
    case "curation.unlist": {
      const input = run.input as PublicCoreCurationSqlInputV1;
      text = `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.projections
                 SET curation_state='unlisted',lifecycle_version=lifecycle_version+1
               WHERE room_id=$1 AND projection_id=$2 AND curation_state='admitted'
                 AND lifecycle_version=$3
              RETURNING projection_id AS target_id,lifecycle_version AS target_version`;
      values = [context.roomId, input.projectionId, context.expectedVersion];
      break;
    }
    case "room_operator.sync": {
      const input = run.input as PublicCoreSyncRoomOperatorSqlInputV1;
      text = `WITH room_state AS (
        SELECT r.room_id,r.version,r.event_high_water,r.event_replay_floor,
               CASE WHEN $1<r.event_replay_floor-1 THEN 'cursor_gone'::text
                    ELSE 'event_batch'::text END AS result_kind,
               CASE WHEN $1<r.event_replay_floor-1 THEN r.event_replay_floor-1
                    ELSE $1::bigint END AS page_after
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
         WHERE r.room_id=$2 AND $1>=0 AND $1<=r.event_high_water
      ), bounds AS (
        SELECT s.*,LEAST(s.event_high_water,s.page_after+256) AS page_high
          FROM room_state s
      ), event_page AS (
        SELECT e.event_id,e.sequence,e.event_kind,e.object_id,e.object_version,
               e.event_hash,e.committed_at,e.expires_at
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
          JOIN bounds b ON b.room_id=e.room_id
         WHERE e.sequence>b.page_after AND e.sequence<=b.page_high AND e.expires_at>$3
         ORDER BY e.sequence,e.event_id COLLATE "C"
      ), event_snapshot AS (
        SELECT COALESCE(array_agg(e.event_id ORDER BY e.sequence),ARRAY[]::text[]) AS event_ids,
               COALESCE(array_agg(e.sequence ORDER BY e.sequence),ARRAY[]::bigint[]) AS event_sequences,
               COALESCE(array_agg(e.event_kind ORDER BY e.sequence),ARRAY[]::text[]) AS event_kinds,
               COALESCE(array_agg(e.object_id ORDER BY e.sequence),ARRAY[]::text[]) AS object_ids,
               COALESCE(array_agg(e.object_version ORDER BY e.sequence),ARRAY[]::bigint[]) AS object_versions,
               COALESCE(array_agg(e.event_hash ORDER BY e.sequence),ARRAY[]::text[]) AS event_hashes,
               COALESCE(array_agg(to_char(e.committed_at AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ORDER BY e.sequence),ARRAY[]::text[]) AS committed_ats,
               MIN(e.expires_at) AS event_source_expires_at,COUNT(e.*)::bigint AS event_count
          FROM event_page e
      ), tombstone_page AS (
        SELECT tombstone.object_id,tombstone.source_expires_at
          FROM (
            SELECT p.projection_id AS object_id,$3::timestamptz+interval '37 days' AS source_expires_at
              FROM ${PUBLIC_CORE_SQL_SCHEMA}.projections p
              JOIN bounds b ON b.room_id=p.room_id
             WHERE b.result_kind='cursor_gone' AND NOT p.body_readable
            UNION ALL
            SELECT x.interaction_id AS object_id,x.tombstone_expires_at AS source_expires_at
              FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
              JOIN bounds b ON b.room_id=x.room_id
             WHERE b.result_kind='cursor_gone' AND NOT x.body_readable
               AND x.tombstone_expires_at>$3
          ) tombstone
         ORDER BY tombstone.object_id COLLATE "C" LIMIT 256
      ), tombstone_snapshot AS (
        SELECT COALESCE(array_agg(t.object_id ORDER BY t.object_id COLLATE "C"),ARRAY[]::text[])
                 AS tombstone_ids,
               COALESCE(array_agg(to_char(t.source_expires_at AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ORDER BY t.object_id COLLATE "C"),ARRAY[]::text[])
                 AS tombstone_expires_ats,
               MIN(t.source_expires_at) AS tombstone_source_expires_at
          FROM tombstone_page t
      ), snapshot AS (
        SELECT b.*,$3::timestamptz+interval '37 days' AS receipt_ceiling,
               es.event_ids,es.event_sequences,es.event_kinds,es.object_ids,es.object_versions,
               es.event_hashes,es.committed_ats,ts.tombstone_ids,ts.tombstone_expires_ats,
               LEAST($3::timestamptz+interval '37 days',
                 COALESCE(es.event_source_expires_at,$3::timestamptz+interval '37 days'),
                 COALESCE(ts.tombstone_source_expires_at,$3::timestamptz+interval '37 days'))
                 AS source_expires_at
          FROM bounds b CROSS JOIN event_snapshot es CROSS JOIN tombstone_snapshot ts
         WHERE es.event_count=GREATEST(b.page_high-b.page_after,0)
      ) SELECT s.room_id AS target_id,s.version AS target_version,
               $1::bigint AS sync_after_sequence,s.page_high AS sync_high_water,
               s.event_replay_floor AS sync_replay_floor,s.result_kind AS sync_result_kind,
               s.event_ids AS sync_event_ids,s.event_sequences AS sync_event_sequences,
               s.event_kinds AS sync_event_kinds,s.object_ids AS sync_object_ids,
               s.object_versions AS sync_object_versions,s.event_hashes AS sync_event_hashes,
               s.committed_ats AS sync_event_committed_ats,
               s.tombstone_ids AS sync_tombstone_ids,
               s.tombstone_expires_ats AS sync_tombstone_expires_ats,
               s.source_expires_at
          FROM snapshot s`;
      values = [
        input.afterSequence, context.roomId, context.requestedAt,
      ];
      break;
    }
    case "room_operator.pull": {
      const input = run.input as PublicCorePullRoomOperatorSqlInputV1;
      text = `WITH candidate AS (
        SELECT x.interaction_id,x.room_id,x.installation_id,x.state,x.body_readable,x.version,
               x.origin_projection_id,x.origin_projection_payload_hash,x.interaction_type,
               x.consent_hash,x.created_at,x.local_purge_received_at,
               x.request_ciphertext,x.guest_capsule_ciphertext,x.request_hash,x.guest_capsule_hash,
               x.request_plaintext_bytes,x.guest_capsule_plaintext_bytes,
               x.request_field_version,x.guest_capsule_field_version,
               x.body_expires_at,x.tombstone_expires_at
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings b
            ON b.room_id=x.room_id
           AND ${constantTimeHmacPredicate("b.credential_digest", "$5")}
           AND b.state='current' AND b.expires_at>$1
         WHERE x.room_id=$2 AND x.interaction_id=$3 AND x.version=$4
      ), expired AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
           SET state='interaction_expired',body_readable=false,request_ciphertext=NULL,
               guest_capsule_ciphertext=NULL,version=x.version+1
          FROM candidate c
         WHERE x.interaction_id=c.interaction_id AND c.body_expires_at<=$1
           AND c.body_readable AND c.state IN ('accepted','seen_locally')
        RETURNING x.interaction_id AS target_id,x.room_id,x.installation_id,
                  x.version AS target_version,'terminal'::text AS pull_outcome,
                  'interaction_expired'::text AS terminal_state,
                  x.origin_projection_id,x.origin_projection_payload_hash,x.interaction_type,
                  x.consent_hash,x.state AS interaction_state,x.created_at,
                  x.local_purge_received_at,
                  x.request_ciphertext,x.guest_capsule_ciphertext,x.request_hash,x.guest_capsule_hash,
                  x.request_plaintext_bytes,x.guest_capsule_plaintext_bytes,
                  x.request_field_version,x.guest_capsule_field_version,
                  x.body_expires_at,x.tombstone_expires_at AS source_expires_at,
                  GREATEST(x.request_field_version,x.guest_capsule_field_version) AS purge_field_version
      ), expiry_purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_interaction_'||pg_catalog.md5(target_id||':'||purge_field_version::text),
               room_id,installation_id,'interaction_body',target_id,purge_field_version,
               $1::timestamptz+interval '23 hours'
          FROM expired ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
      ), pulled AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
           SET state='seen_locally',pulled_at=$1,version=x.version+1
          FROM candidate c
         WHERE x.interaction_id=c.interaction_id AND c.state='accepted'
           AND c.body_readable AND c.request_ciphertext IS NOT NULL AND c.body_expires_at>$1
        RETURNING x.interaction_id AS target_id,x.version AS target_version,
                  'body'::text AS pull_outcome,NULL::text AS terminal_state,
                  x.origin_projection_id,x.origin_projection_payload_hash,x.interaction_type,
                  x.consent_hash,x.state AS interaction_state,x.created_at,
                  x.local_purge_received_at,
                  x.request_ciphertext,x.guest_capsule_ciphertext,x.request_hash,x.guest_capsule_hash,
                  x.request_plaintext_bytes,x.guest_capsule_plaintext_bytes,
                  x.request_field_version,x.guest_capsule_field_version,
                  x.body_expires_at,x.body_expires_at AS source_expires_at
      ), terminal AS (
        SELECT c.interaction_id AS target_id,c.version AS target_version,
               'terminal'::text AS pull_outcome,c.state AS terminal_state,
               c.origin_projection_id,c.origin_projection_payload_hash,c.interaction_type,
               c.consent_hash,c.state AS interaction_state,c.created_at,
               c.local_purge_received_at,
               NULL::jsonb AS request_ciphertext,NULL::jsonb AS guest_capsule_ciphertext,
               c.request_hash,c.guest_capsule_hash,c.request_plaintext_bytes,
               c.guest_capsule_plaintext_bytes,c.request_field_version,
               c.guest_capsule_field_version,c.body_expires_at,
               c.tombstone_expires_at AS source_expires_at
          FROM candidate c
         WHERE c.state IN ('interaction_deleted','origin_revoked','interaction_expired')
           AND c.tombstone_expires_at>$1
           AND NOT EXISTS (SELECT 1 FROM expired)
      ) SELECT target_id,target_version,pull_outcome,terminal_state,origin_projection_id,
               origin_projection_payload_hash,interaction_type,consent_hash,interaction_state,
               created_at,local_purge_received_at,request_ciphertext,
               guest_capsule_ciphertext,request_hash,guest_capsule_hash,request_plaintext_bytes,
               guest_capsule_plaintext_bytes,request_field_version,guest_capsule_field_version,
               body_expires_at,source_expires_at
          FROM pulled
        UNION ALL
        SELECT target_id,target_version,pull_outcome,terminal_state,origin_projection_id,
               origin_projection_payload_hash,interaction_type,consent_hash,interaction_state,
               created_at,local_purge_received_at,request_ciphertext,
               guest_capsule_ciphertext,request_hash,guest_capsule_hash,request_plaintext_bytes,
               guest_capsule_plaintext_bytes,request_field_version,guest_capsule_field_version,
               body_expires_at,source_expires_at
          FROM expired
        UNION ALL
        SELECT target_id,target_version,pull_outcome,terminal_state,origin_projection_id,
               origin_projection_payload_hash,interaction_type,consent_hash,interaction_state,
               created_at,local_purge_received_at,request_ciphertext,
               guest_capsule_ciphertext,request_hash,guest_capsule_hash,request_plaintext_bytes,
               guest_capsule_plaintext_bytes,request_field_version,guest_capsule_field_version,
               body_expires_at,source_expires_at
          FROM terminal`;
      values = [
        context.requestedAt, context.roomId, input.interactionId,
        context.expectedVersion, input.bindingCredentialDigest,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "room_operator.ack": {
      const input = run.input as PublicCoreAckRoomOperatorSqlInputV1;
      text = `INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.event_acks
        (ack_id,room_id,installation_id,binding_id,event_id,sequence,event_hash,acked_at)
        SELECT $1,e.room_id,e.installation_id,b.binding_id,e.event_id,e.sequence,e.event_hash,$3
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings b
            ON b.room_id=e.room_id
           AND ${constantTimeHmacPredicate("b.credential_digest", "$2")}
           AND b.state='current' AND b.expires_at>$3
         WHERE e.room_id=$4 AND e.event_id=$5 AND e.sequence=$6 AND e.event_hash=$7
        ON CONFLICT (binding_id,event_id,sequence,event_hash)
        DO UPDATE SET acked_at=${PUBLIC_CORE_SQL_SCHEMA}.event_acks.acked_at
        RETURNING ack_id AS target_id,1::bigint AS target_version`;
      values = [
        input.ackId, input.bindingCredentialDigest, context.requestedAt, context.roomId,
        input.eventId, input.sequence, input.eventHash,
      ];
      break;
    }
    case "room_operator.projection.deliver": {
      const input = run.input as PublicCoreDeliverProjectionSqlInputV1;
      text = `WITH old_projection AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.projections p
           SET owner_state='superseded',current=false,body_readable=false,capsule_ciphertext=NULL,
               superseded_at=$1,lifecycle_version=p.lifecycle_version+1
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
         WHERE r.room_id=$2 AND p.room_id=r.room_id AND p.projection_id=r.current_projection_id
        RETURNING p.projection_id,p.room_id,p.installation_id,p.capsule_field_version
      ), invalidated_encounters AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
           SET state='invalidated',invalidated_at=$1,version=e.version+1
          FROM old_projection p WHERE e.room_id=p.room_id AND e.projection_id=p.projection_id
           AND e.state='issued'
      ), inserted AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.projections
          (projection_id,room_id,installation_id,capsule_ciphertext,capsule_plaintext_bytes,
           capsule_field_version,payload_hash,basis_hash,projection_policy_hash,
           publication_approval_id,publication_approval_hash,publication_attestation_hash,
           owner_state,curation_state,current,body_readable,published_at,fresh_until,expires_at)
        SELECT $3,r.room_id,r.installation_id,$4,$5,$6,$7,$8,$9,$10,$11,$12,
               'published_fresh','not_admitted',true,true,$13,$14,$15
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings b
            ON b.room_id=r.room_id
           AND ${constantTimeHmacPredicate("b.credential_digest", "$16")}
           AND b.state='current' AND b.expires_at>$1
         WHERE r.room_id=$2 AND r.active AND r.version=$17
           AND $13::timestamptz<=$1 AND $13::timestamptz<$14
           AND $14::timestamptz<$15 AND $15::timestamptz<=$13::timestamptz+interval '7 days'
        RETURNING projection_id,room_id,lifecycle_version
      ), room_updated AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
           SET current_projection_id=i.projection_id,version=r.version+1
          FROM inserted i WHERE r.room_id=i.room_id RETURNING r.room_id
      ), purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT $18,room_id,installation_id,'projection_body',projection_id,capsule_field_version,
               $1::timestamptz+interval '23 hours' FROM old_projection
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
      ) SELECT i.projection_id AS target_id,i.lifecycle_version AS target_version
          FROM inserted i JOIN room_updated r ON r.room_id=i.room_id`;
      values = [
        context.requestedAt, context.roomId, input.projectionId,
        input.capsuleCiphertext.envelope, input.capsuleCiphertext.plaintextBytes,
        input.capsuleCiphertext.fieldVersion, input.payloadHash, input.basisHash,
        input.projectionPolicyHash, input.publicationApprovalId,
        input.publicationApprovalHash, input.publicationAttestationHash,
        input.publishedAt, input.freshUntil, input.expiresAt, input.bindingCredentialDigest,
        context.expectedVersion, input.projectionPurgeJobId,
      ];
      payloadClass = "ciphertext_only";
      break;
    }
    case "room_operator.local_purge.receipt": {
      const input = run.input as PublicCoreRecordLocalPurgeSqlInputV1;
      text = `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
                 SET local_purge_received_at=$1,version=version+1
                FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_bindings b
               WHERE x.room_id=$2 AND x.interaction_id=$3
                 AND x.local_purge_received_at IS NULL AND x.version=$4
                 AND b.room_id=x.room_id
                 AND ${constantTimeHmacPredicate("b.credential_digest", "$5")}
                 AND b.state='current' AND b.expires_at>$1
              RETURNING x.interaction_id AS target_id,x.version AS target_version`;
      values = [
        context.requestedAt, context.roomId, input.interactionId,
        context.expectedVersion, input.bindingCredentialDigest,
      ];
      break;
    }
  }
  return canonicalStatement({
    statementId: `${action}.domain_write`,
    action,
    phase: "domain_write",
    text,
    values,
    payloadClass,
    rowExpectation: "exactly_one",
    rowKeys: action === "room.pair.exchange"
      ? ["target_id", "target_version", "binding_id", "exchange_envelope_ciphertext", "expires_at"]
      : action === "room.pair"
        ? ["target_id", "target_version", "pairing_code_ciphertext", "expires_at"]
      : action === "room_operator.sync"
          ? [
            "target_id", "target_version", "sync_after_sequence", "sync_high_water",
            "sync_replay_floor", "sync_result_kind", "sync_event_ids", "sync_event_sequences",
            "sync_event_kinds", "sync_object_ids", "sync_object_versions", "sync_event_hashes",
            "sync_event_committed_ats", "sync_tombstone_ids", "sync_tombstone_expires_ats",
            "source_expires_at",
          ]
          : action === "room_operator.pull"
            ? [
              "target_id", "target_version", "pull_outcome", "terminal_state",
              "origin_projection_id", "origin_projection_payload_hash", "interaction_type",
              "consent_hash", "interaction_state", "created_at", "local_purge_received_at",
              "request_ciphertext", "guest_capsule_ciphertext", "request_hash", "guest_capsule_hash",
              "request_plaintext_bytes", "guest_capsule_plaintext_bytes", "request_field_version",
              "guest_capsule_field_version", "body_expires_at", "source_expires_at",
            ]
            : ["target_id", "target_version"],
  });
}

const EVENT_CONTRACT = Object.freeze({
  "public_encounter.issue": Object.freeze({ eventKind: "encounter_issued", targetKind: "encounter", targetPrefix: "encounter", bodyAvailable: false }),
  "interaction.create": Object.freeze({ eventKind: "interaction_accepted", targetKind: "interaction", targetPrefix: "interaction", bodyAvailable: true }),
  "interaction.delete": Object.freeze({ eventKind: "interaction_deleted", targetKind: "interaction", targetPrefix: "interaction", bodyAvailable: false }),
  "room.pair.exchange": Object.freeze({ eventKind: "pairing_exchanged", targetKind: "binding", targetPrefix: "binding", bodyAvailable: false }),
  "room.create": Object.freeze({ eventKind: "room_created", targetKind: "room", targetPrefix: "room", bodyAvailable: true }),
  "room.pair": Object.freeze({ eventKind: "pairing_issued", targetKind: "pairing", targetPrefix: "pairing", bodyAvailable: true }),
  "room.binding.revoke": Object.freeze({ eventKind: "binding_revoked", targetKind: "binding", targetPrefix: "binding", bodyAvailable: false }),
  "room.mode.set": Object.freeze({ eventKind: "room_mode_set", targetKind: "room", targetPrefix: "room", bodyAvailable: true }),
  "projection.revoke": Object.freeze({ eventKind: "projection_revoked", targetKind: "projection", targetPrefix: "proj", bodyAvailable: false }),
  "curation.admit": Object.freeze({ eventKind: "curation_admitted", targetKind: "projection", targetPrefix: "proj", bodyAvailable: true }),
  "curation.unlist": Object.freeze({ eventKind: "curation_unlisted", targetKind: "projection", targetPrefix: "proj", bodyAvailable: true }),
  "room_operator.projection.deliver": Object.freeze({ eventKind: "projection_delivered", targetKind: "projection", targetPrefix: "proj", bodyAvailable: true }),
  "room_operator.local_purge.receipt": Object.freeze({ eventKind: "local_purge_receipted", targetKind: "purge", targetPrefix: "interaction", bodyAvailable: false }),
} as const);

type PublicCoreEventActionV1 = keyof typeof EVENT_CONTRACT;

const EVENT_ACTION_BY_KIND = Object.freeze({
  encounter_issued: "public_encounter.issue",
  interaction_accepted: "interaction.create",
  interaction_deleted: "interaction.delete",
  pairing_exchanged: "room.pair.exchange",
  room_created: "room.create",
  pairing_issued: "room.pair",
  binding_revoked: "room.binding.revoke",
  room_mode_set: "room.mode.set",
  projection_revoked: "projection.revoke",
  curation_admitted: "curation.admit",
  curation_unlisted: "curation.unlist",
  projection_delivered: "room_operator.projection.deliver",
  local_purge_receipted: "room_operator.local_purge.receipt",
} as const satisfies Readonly<Record<typeof PUBLIC_CORE_SQL_EVENT_KINDS[number], PublicCoreEventActionV1>>);

function eventAllocationStatement(
  run: MutationRunV1,
): PublicCoreCanonicalSqlStatementV1 | null {
  const action = run.context.action;
  if (!(action in EVENT_CONTRACT)) return null;
  return canonicalStatement({
    statementId: `${action}.event.allocate`,
    action,
    phase: "event_allocate",
    text: `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms
              SET event_high_water=event_high_water+1
            WHERE room_id=$1
            RETURNING installation_id,event_high_water AS sequence`,
    values: [run.context.roomId],
    rowExpectation: "exactly_one",
    rowKeys: ["installation_id", "sequence"],
  });
}

function eventInsertStatement(
  run: MutationRunV1,
  outcome: DomainOutcomeV1,
  installationId: string,
  sequence: number,
): Readonly<{ statement: PublicCoreCanonicalSqlStatementV1; eventHash: PublicCoreSqlSha256V1 }> {
  const action = run.context.action as PublicCoreEventActionV1;
  const contract = EVENT_CONTRACT[action];
  if (contract === undefined) fail(500, "event_contract_missing");
  const input = run.input as PublicCoreSqlEventInputV1;
  let objectId = outcome.targetId;
  let objectVersion = outcome.targetVersion;
  if (action === "room.pair.exchange") {
    objectId = (run.input as PublicCoreExchangeRoomPairSqlInputV1).bindingId;
    objectVersion = 1;
  }
  assertIdKind(objectId, contract.targetPrefix, "event_target_id_invalid");
  const preimage = Object.freeze({
    schemaVersion: "r4_public_core_room_event.v1" as const,
    eventId: input.eventId,
    roomId: run.context.roomId,
    sequence,
    action,
    targetKind: contract.targetKind,
    targetId: objectId,
    targetVersion: objectVersion,
    committedAt: run.context.requestedAt,
    bodyAvailable: contract.bodyAvailable,
  });
  const eventHash = canonicalSha256(preimage);
  const statement = canonicalStatement({
    statementId: `${action}.event.append`,
    action,
    phase: "event_append",
    text: `INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.room_events
      (event_id,room_id,installation_id,sequence,event_kind,object_id,
       object_version,event_hash,committed_at,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9::timestamptz+interval '37 days')
      RETURNING event_id,sequence,event_hash,committed_at`,
    values: [
      input.eventId, run.context.roomId, installationId, sequence, contract.eventKind,
      objectId, objectVersion, eventHash, run.context.requestedAt,
    ],
    rowExpectation: "exactly_one",
    rowKeys: ["event_id", "sequence", "event_hash", "committed_at"],
  });
  return Object.freeze({ statement, eventHash });
}

function resultMetadata(action: PublicCoreSqlMutationActionV1): Readonly<{ status: number; code: string }> {
  const values: Readonly<Record<PublicCoreSqlMutationActionV1, readonly [number, string]>> = {
    "public_encounter.issue": [201, "encounter_issued"],
    "interaction.create": [201, "interaction_created"],
    "interaction.delete": [200, "interaction_deleted"],
    "room.pair.exchange": [201, "pairing_exchanged"],
    "room.create": [201, "room_created"],
    "room.pair": [201, "pairing_issued"],
    "room.binding.revoke": [200, "binding_revoked"],
    "room.mode.set": [200, "room_mode_set"],
    "projection.revoke": [200, "projection_revoked"],
    "curation.admit": [200, "projection_admitted"],
    "curation.unlist": [200, "projection_unlisted"],
    "room_operator.sync": [200, "event_batch"],
    "room_operator.pull": [200, "interaction_pulled"],
    "room_operator.ack": [200, "event_acked"],
    "room_operator.projection.deliver": [201, "projection_delivered"],
    "room_operator.local_purge.receipt": [200, "local_purge_recorded"],
  };
  const [status, code] = values[action];
  return Object.freeze({ status, code });
}

function receiptFinalizeStatement(
  run: MutationRunV1,
  outcome: DomainOutcomeV1,
): PublicCoreCanonicalSqlStatementV1 {
  const action = run.context.action;
  let metadata = resultMetadata(action);
  let finalizedRecoveryKind = recoveryKind(action);
  const relatedTargetId = action === "room.pair.exchange"
    ? (run.input as PublicCoreExchangeRoomPairSqlInputV1).bindingId
    : null;
  let pullId: string | null = null;
  let pullRequestFieldVersion: number | null = null;
  let pullHash: string | null = null;
  let pullGuestFieldVersion: number | null = null;
  let pullGuestHash: string | null = null;
  let pullExpires: string | null = null;
  let pullTerminalState: string | null = null;
  let syncAfterSequence: number | null = null;
  let syncHighWater: number | null = null;
  let syncReplayFloor: number | null = null;
  let syncResultKind: string | null = null;
  let syncEventIds: readonly string[] | null = null;
  let syncEventSequences: readonly number[] | null = null;
  let syncEventKinds: readonly string[] | null = null;
  let syncObjectIds: readonly string[] | null = null;
  let syncObjectVersions: readonly number[] | null = null;
  let syncEventHashes: readonly string[] | null = null;
  let syncEventCommittedAts: readonly string[] | null = null;
  let syncTombstoneIds: readonly string[] | null = null;
  let syncTombstoneExpiresAts: readonly string[] | null = null;
  let sourceExpiresAt = addMilliseconds(run.context.requestedAt, 37 * DAY_MS);
  if (action === "room_operator.sync") {
    syncAfterSequence = rowNumber(outcome.row, "sync_after_sequence");
    syncHighWater = rowNumber(outcome.row, "sync_high_water");
    syncReplayFloor = rowNumber(outcome.row, "sync_replay_floor");
    syncResultKind = rowText(outcome.row, "sync_result_kind");
    syncEventIds = rowNullableStringArray(outcome.row, "sync_event_ids");
    syncEventSequences = rowNullableNumberArray(outcome.row, "sync_event_sequences");
    syncEventKinds = rowNullableStringArray(outcome.row, "sync_event_kinds");
    syncObjectIds = rowNullableStringArray(outcome.row, "sync_object_ids");
    syncObjectVersions = rowNullableNumberArray(outcome.row, "sync_object_versions");
    syncEventHashes = rowNullableStringArray(outcome.row, "sync_event_hashes");
    syncEventCommittedAts = rowNullableStringArray(outcome.row, "sync_event_committed_ats");
    syncTombstoneIds = rowNullableStringArray(outcome.row, "sync_tombstone_ids");
    syncTombstoneExpiresAts = rowNullableStringArray(outcome.row, "sync_tombstone_expires_ats");
    if (syncResultKind !== "event_batch" && syncResultKind !== "cursor_gone") {
      fail(503, "sql_sync_result_kind_invalid");
    }
    if (
      syncEventIds === null || syncEventSequences === null || syncEventKinds === null
      || syncObjectIds === null || syncObjectVersions === null || syncEventHashes === null
      || syncEventCommittedAts === null || syncTombstoneIds === null
      || syncTombstoneExpiresAts === null
    ) fail(503, "sql_sync_result_invalid");
    metadata = syncResultKind === "event_batch"
      ? Object.freeze({ status: 200, code: "event_batch" })
      : Object.freeze({ status: 410, code: "cursor_gone" });
    sourceExpiresAt = rowText(outcome.row, "source_expires_at");
  }
  if (action === "room.pair" || action === "room.pair.exchange") {
    sourceExpiresAt = rowText(outcome.row, "expires_at");
    if (action === "room.pair"
      && sourceExpiresAt !== (run.input as PublicCoreCreateRoomPairSqlInputV1).pairingExpiresAt) {
      fail(503, "sql_pairing_receipt_expiry_invalid");
    }
  }
  if (action === "room_operator.pull") {
    sourceExpiresAt = rowText(outcome.row, "source_expires_at");
    const pullOutcome = rowText(outcome.row, "pull_outcome");
    if (pullOutcome === "body") {
      if (outcome.row.terminal_state !== null || outcome.row.request_ciphertext === null) {
        fail(503, "sql_pull_outcome_invalid");
      }
      pullId = outcome.targetId;
      pullRequestFieldVersion = rowNumber(outcome.row, "request_field_version");
      pullHash = rowText(outcome.row, "request_hash");
      pullGuestFieldVersion = outcome.row.guest_capsule_ciphertext === null
        ? null
        : rowNumber(outcome.row, "guest_capsule_field_version");
      pullGuestHash = rowNullableText(outcome.row, "guest_capsule_hash");
      if ((pullGuestFieldVersion === null) !== (pullGuestHash === null)) {
        fail(503, "sql_pull_guest_identity_invalid");
      }
      pullExpires = rowText(outcome.row, "body_expires_at");
    } else if (pullOutcome === "terminal") {
      const state = rowText(outcome.row, "terminal_state");
      if (!["interaction_deleted", "origin_revoked", "interaction_expired"].includes(state)) {
        fail(503, "sql_pull_terminal_state_invalid");
      }
      finalizedRecoveryKind = "pull_terminal";
      metadata = Object.freeze({ status: 410, code: "pull_terminal" });
      pullTerminalState = state;
    } else {
      fail(503, "sql_pull_outcome_invalid");
    }
  }
  if (pullHash !== null) assertSha(pullHash, "sql_pull_hash_invalid");
  if (pullGuestHash !== null) assertSha(pullGuestHash, "sql_pull_guest_hash_invalid");
  assertTime(sourceExpiresAt, "sql_receipt_source_expiry_invalid");
  if (
    Date.parse(sourceExpiresAt) <= Date.parse(run.context.requestedAt)
    || Date.parse(sourceExpiresAt) > Date.parse(run.context.requestedAt) + 37 * DAY_MS
  ) fail(503, "sql_receipt_source_expiry_invalid");
  return canonicalStatement({
    statementId: `${action}.receipt.finalize`,
    action,
    phase: "receipt_finalize",
    text: `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts
              SET status='committed',target_id=$1,related_target_id=$2,target_version=$3,
                  recovery_kind=$4,http_status=$5,result_code=$6,committed_at=$7,
                  pull_interaction_id=$8,pull_request_field_version=$9,
                  pull_body_hash=$10,pull_guest_field_version=$11,pull_guest_hash=$12,
                  pull_body_expires_at=$13,pull_terminal_state=$14,
                  source_expires_at=$15,expires_at=$15,
                  sync_after_sequence=$18,sync_high_water=$19,sync_replay_floor=$20,
                  sync_result_kind=$21,sync_event_ids=$22,sync_event_sequences=$23,
                  sync_event_kinds=$24,sync_object_ids=$25,sync_object_versions=$26,
                  sync_event_hashes=$27,sync_event_committed_ats=$28,
                  sync_tombstone_ids=$29,sync_tombstone_expires_ats=$30
            WHERE receipt_id=$16 AND request_hash=$17 AND status='reserved'
            RETURNING ${RECEIPT_COLUMNS}`,
    values: [
      outcome.targetId, relatedTargetId, outcome.targetVersion, finalizedRecoveryKind,
      metadata.status, metadata.code, run.context.requestedAt,
      pullId, pullRequestFieldVersion, pullHash, pullGuestFieldVersion, pullGuestHash,
      pullExpires, pullTerminalState, sourceExpiresAt,
      run.context.receiptId, run.context.canonicalRequestHash,
      syncAfterSequence, syncHighWater, syncReplayFloor, syncResultKind,
      syncEventIds, syncEventSequences, syncEventKinds, syncObjectIds,
      syncObjectVersions, syncEventHashes, syncEventCommittedAts,
      syncTombstoneIds, syncTombstoneExpiresAts,
    ],
    rowExpectation: "exactly_one",
    rowKeys: RECEIPT_ROW_KEYS,
  });
}

function recoveryStatement(
  receipt: ReceiptRowV1,
  roomId: string,
  requestedAt: string,
): PublicCoreCanonicalSqlStatementV1 {
  const action = receipt.recoveryKind === "pairing_issue"
    ? "room.pair"
    : receipt.recoveryKind === "pairing_exchange"
      ? "room.pair.exchange"
      : receipt.recoveryKind === "sync_window"
        ? "room_operator.sync"
        : "room_operator.pull";
  if (receipt.targetId === null) fail(503, "sql_recovery_target_missing");
  if (receipt.recoveryKind === "pairing_issue") {
    return canonicalStatement({
      statementId: "room.pair.recovery.read",
      action,
      phase: "recovery",
      text: `SELECT pairing_id,state,version,pairing_code_ciphertext,
                    pairing_code_plaintext_bytes,pairing_code_field_version,expires_at
               FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
              WHERE room_id=$1 AND pairing_id=$2`,
      values: [roomId, receipt.targetId],
      payloadClass: "ciphertext_only",
      rowExpectation: "zero_or_one",
      rowKeys: [
        "pairing_id", "state", "version", "pairing_code_ciphertext",
        "pairing_code_plaintext_bytes", "pairing_code_field_version", "expires_at",
      ],
    });
  }
  if (receipt.recoveryKind === "pairing_exchange") {
    return canonicalStatement({
      statementId: "room.pair.exchange.recovery.read",
      action,
      phase: "recovery",
      text: `SELECT pairing_id,state,version,exchange_envelope_ciphertext,
                    exchange_envelope_plaintext_bytes,exchange_envelope_field_version,expires_at
               FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
              WHERE room_id=$1 AND pairing_id=$2`,
      values: [roomId, receipt.targetId],
      payloadClass: "ciphertext_only",
      rowExpectation: "zero_or_one",
      rowKeys: [
        "pairing_id", "state", "version", "exchange_envelope_ciphertext",
        "exchange_envelope_plaintext_bytes", "exchange_envelope_field_version", "expires_at",
      ],
    });
  }
  if (receipt.recoveryKind === "interaction_pull") {
    return canonicalStatement({
      statementId: "room_operator.pull.recovery.read",
      action,
      phase: "recovery",
      text: `SELECT interaction_id,origin_projection_id,origin_projection_payload_hash,
                    interaction_type,consent_hash,state,body_readable,version,created_at,
                    local_purge_received_at,request_ciphertext,
                    guest_capsule_ciphertext,request_hash,guest_capsule_hash,
                    request_plaintext_bytes,guest_capsule_plaintext_bytes,
                    request_field_version,guest_capsule_field_version,body_expires_at
               FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
              WHERE room_id=$1 AND interaction_id=$2`,
      values: [roomId, receipt.targetId],
      payloadClass: "ciphertext_only",
      rowExpectation: "zero_or_one",
      rowKeys: [
        "interaction_id", "origin_projection_id", "origin_projection_payload_hash",
        "interaction_type", "consent_hash", "state", "body_readable", "version", "created_at",
        "local_purge_received_at", "request_ciphertext",
        "guest_capsule_ciphertext", "request_hash", "guest_capsule_hash", "request_plaintext_bytes",
        "guest_capsule_plaintext_bytes", "request_field_version", "guest_capsule_field_version",
        "body_expires_at",
      ],
    });
  }
  if (receipt.recoveryKind === "pull_terminal") {
    return canonicalStatement({
      statementId: "room_operator.pull.terminal.recovery.read",
      action,
      phase: "recovery",
      text: `SELECT interaction_id,state,tombstone_expires_at
               FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
              WHERE room_id=$1 AND interaction_id=$2 AND tombstone_expires_at>$3`,
      values: [roomId, receipt.targetId, requestedAt],
      rowExpectation: "zero_or_one",
      rowKeys: ["interaction_id", "state", "tombstone_expires_at"],
    });
  }
  fail(500, "sql_recovery_kind_invalid");
}

function parseEvents(rows: readonly SqlRow[], roomId: string): readonly PublicCoreSqlEventRowV1[] {
  return Object.freeze(rows.map((row) => {
    const eventId = rowText(row, "event_id");
    const eventKind = rowText(row, "event_kind");
    const objectId = rowText(row, "object_id");
    const committedAt = rowText(row, "committed_at");
    const eventHash = rowText(row, "event_hash");
    assertIdKind(eventId, "event", "sql_event_id_invalid");
    assertSha(eventHash, "sql_event_hash_invalid");
    assertTime(committedAt, "sql_event_time_invalid");
    if (!(PUBLIC_CORE_SQL_EVENT_KINDS as readonly string[]).includes(eventKind)) {
      fail(503, "sql_event_kind_invalid");
    }
    const action = EVENT_ACTION_BY_KIND[eventKind as keyof typeof EVENT_ACTION_BY_KIND];
    const contract = EVENT_CONTRACT[action];
    assertIdKind(objectId, contract.targetPrefix, "sql_event_object_id_invalid");
    const sequence = rowNumber(row, "sequence");
    const objectVersion = rowNumber(row, "object_version");
    if (sequence < 1) fail(503, "sql_event_sequence_invalid");
    if (objectVersion < 1) fail(503, "sql_event_version_invalid");
    if (contract.targetKind === "room" && objectId !== roomId) fail(503, "sql_event_room_target_invalid");
    const preimage = Object.freeze({
      schemaVersion: "r4_public_core_room_event.v1" as const,
      eventId,
      roomId,
      sequence,
      action,
      targetKind: contract.targetKind,
      targetId: objectId,
      targetVersion: objectVersion,
      committedAt,
      bodyAvailable: contract.bodyAvailable,
    });
    if (canonicalSha256(preimage) !== eventHash) fail(503, "sql_event_hash_invalid");
    return Object.freeze({
      eventId,
      sequence,
      eventKind: eventKind as PublicCoreSqlEventRowV1["eventKind"],
      action,
      targetKind: contract.targetKind,
      targetId: objectId,
      targetVersion: objectVersion,
      eventHash,
      committedAt,
      bodyAvailable: contract.bodyAvailable,
    });
  }));
}

function validateSyncReceiptSnapshot(receipt: ReceiptRowV1): void {
  const arrays = [
    receipt.syncEventIds, receipt.syncEventSequences, receipt.syncEventKinds,
    receipt.syncObjectIds, receipt.syncObjectVersions, receipt.syncEventHashes,
    receipt.syncEventCommittedAts,
  ];
  if (
    receipt.syncAfterSequence === null || receipt.syncHighWater === null
    || receipt.syncReplayFloor === null || receipt.syncResultKind === null
    || receipt.syncTombstoneIds === null || receipt.syncTombstoneExpiresAts === null
    || arrays.some((value) => value === null)
  ) fail(503, "sql_sync_receipt_invalid");
  const after = receipt.syncAfterSequence;
  const high = receipt.syncHighWater;
  const floor = receipt.syncReplayFloor;
  const cursorGone = receipt.syncResultKind === "cursor_gone";
  if (receipt.syncResultKind !== "event_batch" && !cursorGone) {
    fail(503, "sql_sync_result_kind_invalid");
  }
  if (
    !Number.isSafeInteger(after) || !Number.isSafeInteger(high) || !Number.isSafeInteger(floor)
    || after < 0 || floor < 1 || (cursorGone ? after >= floor - 1 : after < floor - 1)
  ) fail(503, "sql_sync_window_invalid");
  const pageAfter = cursorGone ? floor - 1 : after;
  const expectedCount = high - pageAfter;
  const eventIds = receipt.syncEventIds as readonly string[];
  const sequences = receipt.syncEventSequences as readonly number[];
  const eventKinds = receipt.syncEventKinds as readonly string[];
  const objectIds = receipt.syncObjectIds as readonly string[];
  const objectVersions = receipt.syncObjectVersions as readonly number[];
  const eventHashes = receipt.syncEventHashes as readonly string[];
  const committedAts = receipt.syncEventCommittedAts as readonly string[];
  const sourceExpires = receipt.sourceExpiresAt === null ? Number.NaN : Date.parse(receipt.sourceExpiresAt);
  let expectedSourceExpires = Date.parse(receipt.createdAt) + 37 * DAY_MS;
  if (expectedCount < 0 || expectedCount > 256
    || arrays.some((value) => (value as readonly unknown[]).length !== expectedCount)) {
    fail(503, "sql_sync_window_invalid");
  }
  for (let index = 0; index < expectedCount; index += 1) {
    const eventId = eventIds[index];
    const sequence = sequences[index];
    const eventKind = eventKinds[index];
    const objectId = objectIds[index];
    const objectVersion = objectVersions[index];
    const eventHash = eventHashes[index];
    const committedAt = committedAts[index];
    if (eventId === undefined || sequence === undefined || eventKind === undefined
      || objectId === undefined || objectVersion === undefined || eventHash === undefined
      || committedAt === undefined) fail(503, "sql_sync_window_invalid");
    assertIdKind(eventId, "event", "sql_event_id_invalid");
    if (sequence !== pageAfter + index + 1) fail(503, "sql_sync_sequence_gap");
    if (!(PUBLIC_CORE_SQL_EVENT_KINDS as readonly string[]).includes(eventKind)) {
      fail(503, "sql_event_kind_invalid");
    }
    const eventAction = EVENT_ACTION_BY_KIND[eventKind as keyof typeof EVENT_ACTION_BY_KIND];
    assertIdKind(objectId, EVENT_CONTRACT[eventAction].targetPrefix, "sql_event_object_id_invalid");
    if (!Number.isSafeInteger(objectVersion) || objectVersion < 1) fail(503, "sql_event_version_invalid");
    assertSha(eventHash, "sql_event_hash_invalid");
    assertTime(committedAt, "sql_event_time_invalid");
    expectedSourceExpires = Math.min(expectedSourceExpires, Date.parse(committedAt) + 37 * DAY_MS);
  }
  const tombstones = receipt.syncTombstoneIds;
  const tombstoneExpiresAts = receipt.syncTombstoneExpiresAts;
  if (tombstones.length > 256 || tombstones.length !== tombstoneExpiresAts.length
    || (!cursorGone && tombstones.length !== 0)) {
    fail(503, "sql_sync_tombstones_invalid");
  }
  let prior = "";
  for (let index = 0; index < tombstones.length; index += 1) {
    const tombstoneId = tombstones[index];
    const tombstoneExpiresAt = tombstoneExpiresAts[index];
    if (tombstoneId === undefined || tombstoneExpiresAt === undefined) {
      fail(503, "sql_sync_tombstones_invalid");
    }
    if (!new RegExp(`^(?:proj|interaction)_${ID_SUFFIX}$`, "u").test(tombstoneId)
      || (prior !== "" && tombstoneId <= prior)) fail(503, "sql_sync_tombstones_invalid");
    assertTime(tombstoneExpiresAt, "sql_sync_tombstone_expiry_invalid");
    if (Date.parse(tombstoneExpiresAt) <= Date.parse(receipt.createdAt)) {
      fail(503, "sql_sync_tombstone_expiry_invalid");
    }
    expectedSourceExpires = Math.min(expectedSourceExpires, Date.parse(tombstoneExpiresAt));
    prior = tombstoneId;
  }
  if (!Number.isFinite(sourceExpires)
    || sourceExpires !== expectedSourceExpires
    || receipt.sourceExpiresAt !== new Date(expectedSourceExpires).toISOString()) {
    fail(503, "sql_sync_source_expiry_invalid");
  }
}

function eventsFromSyncReceipt(
  receipt: ReceiptRowV1,
  roomId: string,
): readonly PublicCoreSqlEventRowV1[] {
  validateSyncReceiptSnapshot(receipt);
  const rows = (receipt.syncEventIds as readonly string[]).map((eventId, index) => Object.freeze({
    event_id: eventId,
    sequence: (receipt.syncEventSequences as readonly number[])[index],
    event_kind: (receipt.syncEventKinds as readonly string[])[index],
    object_id: (receipt.syncObjectIds as readonly string[])[index],
    object_version: (receipt.syncObjectVersions as readonly number[])[index],
    event_hash: (receipt.syncEventHashes as readonly string[])[index],
    committed_at: (receipt.syncEventCommittedAts as readonly string[])[index],
  }));
  return parseEvents(Object.freeze(rows), roomId);
}

function expectedTargetId(run: MutationRunV1): string {
  const input = run.input as Record<string, unknown>;
  switch (run.context.action) {
    case "public_encounter.issue": return input.encounterId as string;
    case "interaction.create":
    case "interaction.delete":
    case "room_operator.pull":
    case "room_operator.local_purge.receipt": return input.interactionId as string;
    case "room.pair.exchange":
    case "room.pair": return input.pairingId as string;
    case "room.create":
    case "room.mode.set":
    case "room_operator.sync": return run.context.roomId;
    case "room.binding.revoke": return input.bindingId as string;
    case "projection.revoke":
    case "curation.admit":
    case "curation.unlist":
    case "room_operator.projection.deliver": return input.projectionId as string;
    case "room_operator.ack": return input.ackId as string;
  }
}

function assertReceiptTargetForRun(receipt: ReceiptRowV1, run: MutationRunV1): void {
  if (
    receipt.action !== run.context.action
    || receipt.requestHash !== run.context.canonicalRequestHash
    || receipt.targetId !== expectedTargetId(run)
    || receipt.targetVersion === null
  ) fail(503, "sql_result_identity_invalid");
  const action = run.context.action;
  const fixedOne = new Set<PublicCoreSqlMutationActionV1>([
    "public_encounter.issue", "interaction.create", "room.create", "room.pair",
    "room_operator.ack", "room_operator.projection.deliver",
  ]);
  const incrementsExpected = new Set<PublicCoreSqlMutationActionV1>([
    "interaction.delete", "room.pair.exchange", "room.binding.revoke", "room.mode.set",
    "projection.revoke", "curation.admit", "curation.unlist",
    "room_operator.local_purge.receipt",
  ]);
  if (fixedOne.has(action) && receipt.targetVersion !== 1) {
    fail(503, "sql_result_version_invalid");
  }
  if (incrementsExpected.has(action)
    && receipt.targetVersion !== (run.context.expectedVersion as number) + 1) {
    fail(503, "sql_result_version_invalid");
  }
  if (action === "room_operator.sync" && receipt.targetVersion < 1) {
    fail(503, "sql_result_version_invalid");
  }
  if (action === "room_operator.pull") {
    const expected = run.context.expectedVersion as number;
    if (receipt.targetVersion !== expected && receipt.targetVersion !== expected + 1) {
      fail(503, "sql_result_version_invalid");
    }
  }
}

async function recoverCommitted(
  transaction: PublicCoreSqlTransactionV1,
  receipt: ReceiptRowV1,
  run: MutationRunV1,
  recovered: boolean,
): Promise<PublicCoreSqlMutationResultV1> {
  const roomId = run.context.roomId;
  const requestedAt = run.context.requestedAt;
  if (receipt.status !== "committed") fail(503, "sql_recovery_receipt_not_committed");
  if (receipt.targetId === null || receipt.targetVersion === null
    || receipt.httpStatus === null || receipt.resultCode === null) {
    fail(503, "sql_recovery_receipt_invalid");
  }
  assertReceiptTargetForRun(receipt, run);
  if (receipt.action === "room_operator.ack") {
    const result = await query(transaction, canonicalStatement({
      statementId: "room_operator.ack.recovery.read",
      action: "room_operator.ack",
      phase: "recovery",
      text: `SELECT ack_id,event_id,sequence,event_hash,acked_at
               FROM ${PUBLIC_CORE_SQL_SCHEMA}.event_acks
              WHERE room_id=$1 AND ack_id=$2`,
      values: [roomId, receipt.targetId],
      rowExpectation: "exactly_one",
      rowKeys: ["ack_id", "event_id", "sequence", "event_hash", "acked_at"],
    }));
    const row = result.rows[0] as SqlRow;
    const ackId = rowText(row, "ack_id");
    const eventId = rowText(row, "event_id");
    const sequence = rowNumber(row, "sequence");
    const ackedAt = rowText(row, "acked_at");
    const eventHash = rowText(row, "event_hash");
    const input = run.input as PublicCoreAckRoomOperatorSqlInputV1;
    assertId(ackId, "sql_ack_id_invalid");
    assertId(eventId, "sql_ack_event_id_invalid");
    assertTime(ackedAt, "sql_ack_time_invalid");
    assertSha(eventHash, "sql_ack_hash_invalid");
    if (
      ackId !== receipt.targetId
      || eventId !== input.eventId
      || sequence !== input.sequence
      || eventHash !== input.eventHash
    ) fail(503, "sql_ack_recovery_invalid");
    return Object.freeze({
      kind: "ack",
      action: "room_operator.ack",
      status: 200,
      code: "event_acked",
      receiptId: receipt.receiptId,
      ackId,
      eventId,
      sequence,
      eventHash,
      ackedAt,
      recovered,
    });
  }
  if (receipt.recoveryKind === "body_free") {
    if (receipt.action === "public_encounter.issue") {
      return Object.freeze({
        kind: "encounter_issue",
        action: "public_encounter.issue",
        status: 201,
        code: "encounter_issued",
        receiptId: receipt.receiptId,
        encounterId: receipt.targetId,
        encounterVersion: receipt.targetVersion,
        expiresAt: addMilliseconds(receipt.createdAt, DAY_MS),
        recovered,
      });
    }
    return Object.freeze({
      kind: "body_free",
      action: receipt.action,
      status: receipt.httpStatus,
      code: receipt.resultCode,
      receiptId: receipt.receiptId,
      targetId: receipt.targetId,
      targetVersion: receipt.targetVersion,
      recovered,
    });
  }
  if (receipt.recoveryKind === "pull_terminal") {
    if (receipt.action !== "room_operator.pull" || receipt.pullTerminalState === null) {
      fail(503, "sql_pull_terminal_receipt_invalid");
    }
    const terminalSource = await query(
      transaction,
      recoveryStatement(receipt, roomId, requestedAt),
    );
    const row = terminalSource.rows[0];
    if (row === undefined
      || rowText(row, "interaction_id") !== receipt.targetId
      || rowText(row, "state") !== receipt.pullTerminalState) {
      fail(503, "sql_pull_terminal_source_invalid");
    }
    const tombstoneExpiresAt = rowText(row, "tombstone_expires_at");
    assertTime(tombstoneExpiresAt, "sql_pull_terminal_source_invalid");
    if (tombstoneExpiresAt !== receipt.sourceExpiresAt) {
      fail(503, "sql_pull_terminal_source_invalid");
    }
    return terminalResult(
      "room_operator.pull", receipt, receipt.pullTerminalState, recovered, "pull_terminal",
    );
  }
  if (receipt.recoveryKind === "sync_window") {
    if (
      receipt.syncAfterSequence !== (run.input as PublicCoreSyncRoomOperatorSqlInputV1).afterSequence
      || receipt.syncResultKind === null || receipt.syncTombstoneIds === null
    ) fail(503, "sql_sync_request_identity_invalid");
    const events = eventsFromSyncReceipt(receipt, roomId);
    return Object.freeze({
      kind: receipt.syncResultKind === "cursor_gone" ? "cursor_gone" : "sync_window",
      action: "room_operator.sync",
      status: receipt.syncResultKind === "cursor_gone" ? 410 : 200,
      code: receipt.syncResultKind,
      receiptId: receipt.receiptId,
      roomId,
      afterSequence: receipt.syncAfterSequence,
      highWater: receipt.syncHighWater as number,
      replayFloor: receipt.syncReplayFloor as number,
      events,
      tombstoneIds: receipt.syncTombstoneIds,
      recovered,
    });
  }
  const recoveredRow = await query(transaction, recoveryStatement(receipt, roomId, requestedAt));
  if (receipt.recoveryKind === "pairing_issue") {
    const row = recoveredRow.rows[0];
    const state = row === undefined ? "unavailable" : rowText(row, "state");
    const expiresAt = row === undefined ? null : rowText(row, "expires_at");
    if (expiresAt !== null) assertTime(expiresAt, "sql_pairing_expiry_invalid");
    if (receipt.sourceExpiresAt
        !== (run.input as PublicCoreCreateRoomPairSqlInputV1).pairingExpiresAt
      || (expiresAt !== null && expiresAt !== receipt.sourceExpiresAt)) {
      fail(503, "sql_pairing_receipt_expiry_invalid");
    }
    if (state !== "issued" || (row !== undefined
      && (Date.parse(expiresAt as string) <= Date.parse(requestedAt)
        || row["pairing_code_ciphertext"] === null))) {
      const terminalState = row !== undefined && Date.parse(expiresAt as string) <= Date.parse(requestedAt)
        ? "expired"
        : state;
      if (!["unavailable", "expired", "exchanged"].includes(terminalState)) {
        fail(503, "sql_pairing_terminal_state_invalid");
      }
      return terminalResult(
        "room.pair", receipt, terminalState as PublicCoreSqlTerminalResultV1["terminalState"], recovered,
      );
    }
    if (
      rowText(row as SqlRow, "pairing_id") !== receipt.targetId
      || rowNumber(row as SqlRow, "version") !== receipt.targetVersion
    ) fail(503, "sql_pairing_recovery_invalid");
    const pairingCodeCiphertext = recoveredEncryptedEnvelope(
      row as SqlRow,
      "pairing_code_ciphertext", "pairing_code_plaintext_bytes", "pairing_code_field_version",
      Object.freeze({
        table: "pairing_challenges", column: "pairing_code_ciphertext",
        roomId, rowId: receipt.targetId,
      }),
      false,
    );
    if (pairingCodeCiphertext === null) fail(503, "sql_ciphertext_result_invalid");
    return Object.freeze({
      kind: "pairing_issue",
      action: "room.pair",
      status: 201,
      code: "pairing_issued",
      receiptId: receipt.receiptId,
      pairingId: receipt.targetId,
      pairingCodeCiphertext,
      expiresAt: expiresAt as string,
      targetVersion: receipt.targetVersion,
      recovered,
    });
  }
  if (receipt.recoveryKind === "pairing_exchange") {
    const row = recoveredRow.rows[0];
    const state = row === undefined ? "unavailable" : rowText(row, "state");
    const expiresAt = row === undefined ? null : rowText(row, "expires_at");
    if (expiresAt !== null) assertTime(expiresAt, "sql_pairing_expiry_invalid");
    if (expiresAt !== null && expiresAt !== receipt.sourceExpiresAt) {
      fail(503, "sql_pairing_receipt_expiry_invalid");
    }
    if (state !== "exchanged" || (row !== undefined
      && (Date.parse(expiresAt as string) <= Date.parse(requestedAt)
        || row["exchange_envelope_ciphertext"] === null))
      || receipt.relatedTargetId === null) {
      const terminalState = row !== undefined && Date.parse(expiresAt as string) <= Date.parse(requestedAt)
        ? "expired"
        : state;
      if (!["unavailable", "expired"].includes(terminalState)) {
        fail(503, "sql_pairing_terminal_state_invalid");
      }
      return terminalResult(
        "room.pair.exchange", receipt,
        terminalState as PublicCoreSqlTerminalResultV1["terminalState"], recovered,
      );
    }
    if (
      rowText(row as SqlRow, "pairing_id") !== receipt.targetId
      || rowNumber(row as SqlRow, "version") !== receipt.targetVersion
      || receipt.relatedTargetId !== (run.input as PublicCoreExchangeRoomPairSqlInputV1).bindingId
    ) fail(503, "sql_pairing_recovery_invalid");
    const exchangeEnvelopeCiphertext = recoveredEncryptedEnvelope(
      row as SqlRow,
      "exchange_envelope_ciphertext", "exchange_envelope_plaintext_bytes",
      "exchange_envelope_field_version",
      Object.freeze({
        table: "pairing_challenges", column: "exchange_envelope_ciphertext",
        roomId, rowId: receipt.targetId,
      }),
      false,
    );
    if (exchangeEnvelopeCiphertext === null) fail(503, "sql_ciphertext_result_invalid");
    return Object.freeze({
      kind: "pairing_exchange",
      action: "room.pair.exchange",
      status: 201,
      code: "pairing_exchanged",
      receiptId: receipt.receiptId,
      pairingId: receipt.targetId,
      bindingId: receipt.relatedTargetId,
      exchangeEnvelopeCiphertext,
      expiresAt: expiresAt as string,
      targetVersion: receipt.targetVersion,
      recovered,
    });
  }
  if (receipt.recoveryKind === "interaction_pull") {
    const row = recoveredRow.rows[0];
    if (receipt.pullRequestFieldVersion === null || receipt.pullBodyHash === null
      || receipt.pullBodyExpiresAt === null || receipt.pullInteractionId !== receipt.targetId) {
      fail(503, "sql_pull_receipt_invalid");
    }
    if (row === undefined) {
      return terminalResult("room_operator.pull", receipt, "unavailable", true);
    }
    if (rowText(row, "interaction_id") !== receipt.targetId) {
      fail(503, "sql_pull_recovery_identity_invalid");
    }
    const state = rowText(row, "state");
    if (["interaction_deleted", "origin_revoked", "interaction_expired"].includes(state)) {
      return terminalResult(
        "room_operator.pull", receipt,
        state as PublicCoreSqlTerminalResultV1["terminalState"], true,
      );
    }
    const currentExpiry = rowText(row, "body_expires_at");
    assertTime(currentExpiry, "sql_pull_expiry_invalid");
    if (Date.parse(currentExpiry) <= Date.parse(requestedAt)) {
      return terminalResult("room_operator.pull", receipt, "interaction_expired", true);
    }
    if (state !== "seen_locally"
      || !rowBoolean(row, "body_readable")
      || row["request_ciphertext"] === null) {
      fail(503, "sql_pull_lifecycle_invalid");
    }
    const projectionId = rowText(row, "origin_projection_id");
    const originProjectionHash = rowText(row, "origin_projection_payload_hash");
    const interactionType = rowText(row, "interaction_type");
    const consentHash = rowText(row, "consent_hash");
    const acceptedAt = rowText(row, "created_at");
    const currentObjectVersion = rowNumber(row, "version");
    const currentLocalPurgeReceivedAt = rowNullableText(row, "local_purge_received_at");
    assertIdKind(projectionId, "proj", "sql_pull_projection_invalid");
    assertSha(originProjectionHash, "sql_pull_origin_hash_invalid");
    assertSha(consentHash, "sql_pull_consent_hash_invalid");
    assertTime(acceptedAt, "sql_pull_accepted_at_invalid");
    if (!["ask", "seed", "resonance"].includes(interactionType)) {
      fail(503, "sql_pull_interaction_type_invalid");
    }
    if (currentLocalPurgeReceivedAt !== null) {
      assertTime(currentLocalPurgeReceivedAt, "sql_pull_local_purge_invalid");
    }
    if (
      Date.parse(acceptedAt) >= Date.parse(currentExpiry)
      || currentObjectVersion < receipt.targetVersion
      || currentObjectVersion > receipt.targetVersion + 1
      || (currentObjectVersion === receipt.targetVersion + 1 && currentLocalPurgeReceivedAt === null)
    ) fail(503, "sql_pull_receipt_view_invalid");
    const localPurgeReceivedAt = currentObjectVersion === receipt.targetVersion
      ? currentLocalPurgeReceivedAt
      : null;
    const exactVersion = rowNumber(row, "request_field_version") === receipt.pullRequestFieldVersion;
    const exactHash = rowText(row, "request_hash") === receipt.pullBodyHash;
    const currentGuestFieldVersion = row["guest_capsule_ciphertext"] === null
      ? null
      : rowNumber(row, "guest_capsule_field_version");
    const currentGuestHash = rowNullableText(row, "guest_capsule_hash");
    const exactGuest = currentGuestFieldVersion === receipt.pullGuestFieldVersion
      && currentGuestHash === receipt.pullGuestHash;
    const exactExpiry = currentExpiry === receipt.pullBodyExpiresAt;
    if (!exactVersion || !exactHash || !exactGuest || !exactExpiry) {
      return terminalResult("room_operator.pull", receipt, "receipt_version_unavailable", true);
    }
    const requestCiphertext = recoveredEncryptedEnvelope(
      row, "request_ciphertext", "request_plaintext_bytes", "request_field_version",
      Object.freeze({
        table: "interactions", column: "request_ciphertext",
        roomId, rowId: receipt.targetId,
      }),
      false,
    );
    const guestCapsuleCiphertext = recoveredEncryptedEnvelope(
      row, "guest_capsule_ciphertext", "guest_capsule_plaintext_bytes", "guest_capsule_field_version",
      Object.freeze({
        table: "interactions", column: "guest_capsule_ciphertext",
        roomId, rowId: receipt.targetId,
      }),
      true,
    );
    if (requestCiphertext === null) fail(503, "sql_ciphertext_result_invalid");
    return Object.freeze({
      kind: "interaction_pull",
      action: "room_operator.pull",
      status: 200,
      code: "interaction_pulled",
      receiptId: receipt.receiptId,
      interactionId: receipt.targetId,
      interactionVersion: receipt.targetVersion,
      projectionId,
      originProjectionHash,
      interactionType: interactionType as PublicCoreSqlPullResultV1["interactionType"],
      consentHash,
      interactionState: "seen_locally",
      acceptedAt,
      localPurgeReceivedAt,
      requestCiphertext,
      guestCapsuleCiphertext,
      requestFieldVersion: receipt.pullRequestFieldVersion,
      bodyHash: receipt.pullBodyHash as PublicCoreSqlSha256V1,
      guestCapsuleFieldVersion: receipt.pullGuestFieldVersion,
      guestCapsuleHash: receipt.pullGuestHash,
      bodyExpiresAt: receipt.pullBodyExpiresAt as string,
      recovered,
    });
  }
  fail(500, "sql_recovery_kind_invalid");
}

function terminalResult(
  action: PublicCoreSqlTerminalResultV1["action"],
  receipt: ReceiptRowV1,
  terminalState: PublicCoreSqlTerminalResultV1["terminalState"],
  recovered: boolean,
  code: PublicCoreSqlTerminalResultV1["code"] = "terminal_reconciliation",
): PublicCoreSqlTerminalResultV1 {
  if (receipt.targetId === null) fail(503, "sql_terminal_target_invalid");
  return Object.freeze({
    kind: "terminal_reconciliation",
    action,
    status: 410,
    code,
    receiptId: receipt.receiptId,
    targetId: receipt.targetId,
    terminalState,
    recovered,
  });
}

const EXPECTED_VERSION_ACTIONS = new Set<PublicCoreSqlMutationActionV1>([
  "public_encounter.issue",
  "interaction.delete",
  "room.pair.exchange",
  "room.pair",
  "room.binding.revoke",
  "room.mode.set",
  "projection.revoke",
  "curation.admit",
  "curation.unlist",
  "room_operator.pull",
  "room_operator.projection.deliver",
  "room_operator.local_purge.receipt",
]);

const ACTOR_BY_ACTION = Object.freeze({
  "public_encounter.issue": "public",
  "interaction.create": "guest_capability",
  "interaction.delete": "guest_capability",
  "room.pair.exchange": "public",
  "room.create": "controller",
  "room.pair": "controller",
  "room.binding.revoke": "controller",
  "room.mode.set": "controller",
  "projection.revoke": "controller",
  "curation.admit": "curator",
  "curation.unlist": "curator",
  "room_operator.sync": "room_operator",
  "room_operator.pull": "room_operator",
  "room_operator.ack": "room_operator",
  "room_operator.projection.deliver": "room_operator",
  "room_operator.local_purge.receipt": "room_operator",
}) satisfies Readonly<Record<PublicCoreSqlMutationActionV1, PublicCoreSqlActorClassV1>>;

const INPUT_KEYS = Object.freeze({
  "public_encounter.issue": [
    "projectionId", "encounterId", "encounterSecretDigest", "issuanceBucketDigest",
    "hourlyRateEventId", "hourlyBucketDigest", "hourWindowStart", "dailyRateEventId",
    "dailyBucketDigest", "dayWindowStart", "rateExpiresAt", "encounterExpiresAt",
    "eventId", "eventHash",
  ],
  "interaction.create": [
    "interactionId", "interactionType", "projectionId", "acceptRateEventId", "dayWindowStart",
    "rateExpiresAt", "requestCiphertext", "guestCapsuleCiphertext", "requestBodyHash",
    "guestCapsuleBodyHash", "consentHash", "replySecretDigest", "deleteSecretDigest", "bodyExpiresAt",
    "encounterSecretDigest", "eventId", "eventHash",
  ],
  "interaction.delete": [
    "interactionId", "interactionPurgeJobId", "deleteSecretDigest", "eventId", "eventHash",
  ],
  "room.pair.exchange": [
    "pairingId", "clientPublicKeyHash", "pairingCodeDigest", "exchangeEnvelopeCiphertext",
    "bindingId", "bindingCredentialDigest", "bindingExpiresAt", "eventId", "eventHash",
  ],
  "room.create": ["entityId", "labelCiphertext", "eventId", "eventHash"],
  "room.pair": [
    "pairingId", "pairingCodeCiphertext", "pairingCodeDigest", "pairingExpiresAt",
    "eventId", "eventHash",
  ],
  "room.binding.revoke": ["bindingId", "eventId", "eventHash"],
  "room.mode.set": ["interactionMode", "eventId", "eventHash"],
  "projection.revoke": ["projectionId", "projectionPurgeJobId", "eventId", "eventHash"],
  "curation.admit": ["projectionId", "eventId", "eventHash"],
  "curation.unlist": ["projectionId", "eventId", "eventHash"],
  "room_operator.sync": ["bindingCredentialDigest", "afterSequence"],
  "room_operator.pull": ["bindingCredentialDigest", "interactionId", "eventId", "eventHash"],
  "room_operator.ack": ["ackId", "bindingCredentialDigest", "eventId", "sequence", "eventHash"],
  "room_operator.projection.deliver": [
    "bindingCredentialDigest", "projectionId", "capsuleCiphertext", "payloadHash", "basisHash",
    "projectionPolicyHash", "publicationApprovalId", "publicationApprovalHash",
    "publicationAttestationHash", "publishedAt", "freshUntil", "expiresAt",
    "projectionPurgeJobId", "eventId", "eventHash",
  ],
  "room_operator.local_purge.receipt": [
    "bindingCredentialDigest", "interactionId", "eventId", "eventHash",
  ],
}) satisfies Readonly<Record<PublicCoreSqlMutationActionV1, readonly string[]>>;

const INPUT_ID_PREFIX = Object.freeze({
  projectionId: "proj",
  encounterId: "encounter",
  hourlyRateEventId: "rate",
  dailyRateEventId: "rate",
  interactionId: "interaction",
  acceptRateEventId: "rate",
  interactionPurgeJobId: "purge",
  pairingId: "pairing",
  bindingId: "binding",
  entityId: "entity",
  projectionPurgeJobId: "purge",
  publicationApprovalId: "approval",
  ackId: "ack",
  eventId: "event",
}) satisfies Readonly<Record<string, string>>;

function validateMutationRun<A extends PublicCoreSqlMutationActionV1>(
  action: A,
  context: PublicCoreSqlMutationContextV1<A>,
  input: MutationInputV1,
): MutationRunV1 {
  const stableContext = snapshotInput(context);
  const stableInput = snapshotInput(input);
  validateContext(action, stableContext);
  exactKeys(stableInput, INPUT_KEYS[action], "action_input_shape_invalid");
  if (stableContext.actorClass !== ACTOR_BY_ACTION[action]) fail(404, "not_found");
  if (EXPECTED_VERSION_ACTIONS.has(action) !== (stableContext.expectedVersion !== null)) {
    fail(400, "expected_version_contract_invalid");
  }
  for (const [key, value] of Object.entries(stableInput)) {
    if (key.endsWith("Id")) {
      const prefix = INPUT_ID_PREFIX[key as keyof typeof INPUT_ID_PREFIX];
      if (prefix === undefined) fail(500, "input_id_contract_missing");
      assertIdKind(value, prefix, `${key}_invalid`);
    }
    if (key.endsWith("At")) assertTime(value, `${key}_invalid`);
    if (key.endsWith("Digest")) assertHmac(value, `${key}_invalid`);
    if (key.endsWith("Hash") && value !== null) assertSha(value, `${key}_invalid`);
  }
  if ("eventId" in stableInput) validateEvent(stableInput as PublicCoreSqlEventInputV1);
  if (action === "room.mode.set") {
    const mode = (stableInput as PublicCoreSetRoomModeSqlInputV1).interactionMode;
    if (mode !== "public_single" && mode !== "closed") fail(400, "room_mode_invalid");
  }
  if (action === "room_operator.sync") {
    integer((stableInput as PublicCoreSyncRoomOperatorSqlInputV1).afterSequence, 0, "after_sequence_invalid");
  }
  if (action === "room_operator.ack") {
    integer((stableInput as PublicCoreAckRoomOperatorSqlInputV1).sequence, 1, "event_sequence_invalid");
  }
  if (action === "interaction.create") {
    const create = stableInput as PublicCoreCreateInteractionSqlInputV1;
    if (!["ask", "seed", "resonance"].includes(create.interactionType)) {
      fail(400, "interaction_type_invalid");
    }
    if ((create.guestCapsuleCiphertext === null) !== (create.guestCapsuleBodyHash === null)) {
      fail(400, "guest_capsule_hash_contract_invalid");
    }
  }
  const run = Object.freeze({ context: stableContext, input: stableInput });
  validateActionChronology(run);
  // Validate ciphertext shape, byte ceilings, AAD identity, and immutable
  // nonce bytes before the executor is entered. The canonical reservation
  // statements are rebuilt inside the transaction from the same owned run.
  nonceStatements(run);
  return run;
}

function lockIdentity(run: MutationRunV1): LockIdentityV1 {
  const input = run.input as Record<string, unknown>;
  const text = (key: string): string | null => typeof input[key] === "string" ? input[key] as string : null;
  const number = (key: string): number | null => Number.isSafeInteger(input[key]) ? input[key] as number : null;
  return Object.freeze({
    roomId: run.context.roomId,
    bindingId: text("bindingId"),
    bindingCredentialDigest: text("bindingCredentialDigest") as PublicCoreSqlHmacSha256V1 | null,
    pairingId: text("pairingId"),
    projectionId: text("projectionId"),
    encounterId: text("encounterId"),
    encounterSecretDigest: text("encounterSecretDigest") as PublicCoreSqlHmacSha256V1 | null,
    interactionId: text("interactionId"),
    eventId: text("eventId"),
    eventSequence: number("sequence"),
    afterSequence: number("afterSequence"),
    requestedAt: run.context.requestedAt,
  });
}

async function executeMutation(
  executor: PreparedExecutorV1,
  run: MutationRunV1,
): Promise<PublicCoreSqlMutationResultV1> {
  return await executeTransaction(executor,
    Object.freeze({ isolation: "read_committed" as const, readOnly: false }),
    async (transaction) => {
      const reserved = await query(transaction, receiptReserveStatement(run.context));
      let receipt: ReceiptRowV1;
      if (reserved.rowCount === 1) {
        receipt = parseReceipt(reserved.rows[0] as SqlRow);
        if (
          receipt.receiptId !== run.context.receiptId
          || receipt.requestHash !== run.context.canonicalRequestHash
          || receipt.action !== run.context.action
          || receipt.status !== "reserved"
          || receipt.createdAt !== run.context.requestedAt
          || receipt.expiresAt !== addMilliseconds(run.context.requestedAt, 37 * DAY_MS)
        ) fail(503, "sql_receipt_reservation_invalid");
      } else {
        const existing = await query(transaction, receiptLookupStatement(run.context));
        const existingRow = existing.rows[0] as SqlRow;
        const existingExpiry = rowText(existingRow, "expires_at");
        assertTime(existingExpiry, "sql_receipt_expiry_invalid");
        if (Date.parse(existingExpiry) <= Date.parse(run.context.requestedAt)) {
          fail(409, "idempotency_record_expired");
        }
        receipt = parseReceipt(existingRow);
        if (receipt.action !== run.context.action || receipt.requestHash !== run.context.canonicalRequestHash) {
          fail(409, "idempotency_conflict");
        }
        if (receipt.status === "committed") {
          if (ROOM_OPERATOR_MUTATION_ACTIONS.has(run.context.action)) {
            await query(transaction, roomOperatorReplayAuthorizationStatement(run));
          }
          return await recoverCommitted(
            transaction,
            receipt,
            run,
            true,
          );
        }
        fail(409, "idempotency_in_progress");
      }

      const identity = lockIdentity(run);
      const classes = MUTATION_LOCKS[run.context.action];
      const indexes = classes.map((value) => PUBLIC_CORE_SQL_LOCK_ORDER.indexOf(value));
      if (indexes.some((value, index) => index > 0 && value <= (indexes[index - 1] ?? -1))) {
        fail(500, "sql_lock_order_drift");
      }
      for (const lockClass of classes) {
        await query(transaction, lockStatement(run.context.action, lockClass, identity));
      }
      const mode = run.context.action === "room.mode.set"
        ? (run.input as PublicCoreSetRoomModeSqlInputV1).interactionMode
        : null;
      await query(transaction, retentionPreconditionStatement(run.context.action, run.context, mode));
      for (const nonce of nonceStatements(run)) await query(transaction, nonce);
      const domain = await query(transaction, domainStatement(run));
      const row = domain.rows[0] as SqlRow;
      const outcome: DomainOutcomeV1 = Object.freeze({
        targetId: rowText(row, "target_id"),
        targetVersion: rowNumber(row, "target_version"),
        row,
      });
      const allocationStatement = eventAllocationStatement(run);
      if (allocationStatement !== null) {
        const allocated = await query(transaction, allocationStatement);
        const allocationRow = allocated.rows[0] as SqlRow;
        const installationId = rowText(allocationRow, "installation_id");
        const sequence = rowNumber(allocationRow, "sequence");
        assertIdKind(installationId, "installation", "sql_event_installation_invalid");
        if (sequence < 1) fail(503, "sql_event_sequence_invalid");
        const event = eventInsertStatement(run, outcome, installationId, sequence);
        const appended = await query(transaction, event.statement);
        const appendedRow = appended.rows[0] as SqlRow;
        const eventId = rowText(appendedRow, "event_id");
        const eventHash = rowText(appendedRow, "event_hash");
        const committedAt = rowText(appendedRow, "committed_at");
        if (
          eventId !== (run.input as PublicCoreSqlEventInputV1).eventId
          || rowNumber(appendedRow, "sequence") !== sequence
          || eventHash !== event.eventHash
          || committedAt !== run.context.requestedAt
        ) fail(503, "sql_event_append_result_invalid");
      }
      const finalized = await query(transaction, receiptFinalizeStatement(run, outcome));
      const committed = parseReceipt(finalized.rows[0] as SqlRow);
      if (
        committed.status !== "committed"
        || committed.action !== run.context.action
        || committed.requestHash !== run.context.canonicalRequestHash
        || committed.createdAt !== run.context.requestedAt
        || committed.targetId !== outcome.targetId
        || committed.targetVersion !== outcome.targetVersion
      ) fail(503, "sql_receipt_finalize_invalid");
      return await recoverCommitted(
        transaction,
        committed,
        run,
        false,
      );
    },
  );
}

function sanitizeReadRows(
  action: PublicCoreSqlReadActionV1,
  rows: readonly SqlRow[],
  input: PublicCoreListThirdPlaceSqlInputV1 | PublicCoreReadProjectionSqlInputV1
    | PublicCoreReadInteractionSqlInputV1 | PublicCoreReadRoomOperatorStatusSqlInputV1,
): PublicCoreSqlReadResultV1["rows"] {
  if (action === "third_place.list") return Object.freeze(rows.map((row) => {
    const thirdPlaceId = rowText(row, "third_place_id");
    const roomId = rowText(row, "room_id");
    const projectionId = rowText(row, "projection_id");
    const payloadHash = rowText(row, "payload_hash");
    const capsuleFieldVersion = rowNumber(row, "capsule_field_version");
    const lifecycleVersion = rowNumber(row, "lifecycle_version");
    const freshUntil = rowText(row, "fresh_until");
    const expiresAt = rowText(row, "expires_at");
    assertIdKind(thirdPlaceId, "thirdplace", "sql_read_result_invalid");
    assertIdKind(roomId, "room", "sql_read_result_invalid");
    assertIdKind(projectionId, "proj", "sql_read_result_invalid");
    assertSha(payloadHash, "sql_read_result_invalid");
    assertTime(freshUntil, "sql_read_result_invalid");
    assertTime(expiresAt, "sql_read_result_invalid");
    if (
      thirdPlaceId !== "thirdplace_forme_public_core_v1"
      || roomId !== input.roomId
      || capsuleFieldVersion < 1
      || lifecycleVersion < 1
      || Date.parse(freshUntil) <= Date.parse(input.requestedAt)
      || Date.parse(expiresAt) <= Date.parse(input.requestedAt)
      || Date.parse(freshUntil) > Date.parse(expiresAt)
    ) fail(503, "sql_read_result_invalid");
    const capsuleCiphertext = recoveredEncryptedEnvelope(
      row, "capsule_ciphertext", "capsule_plaintext_bytes", "capsule_field_version",
      Object.freeze({
        table: "projections", column: "capsule_ciphertext",
        roomId, rowId: projectionId,
      }),
      false,
    );
    if (capsuleCiphertext === null) fail(503, "sql_ciphertext_result_invalid");
    return Object.freeze({
      thirdPlaceId,
      roomId,
      projectionId,
      capsuleCiphertext,
      payloadHash,
      capsuleFieldVersion,
      lifecycleVersion,
      freshUntil,
      expiresAt,
    });
  }));
  if (action === "projection.read") return Object.freeze(rows.map((row) => {
    const readInput = input as PublicCoreReadProjectionSqlInputV1;
    const projectionId = rowText(row, "projection_id");
    const roomId = rowText(row, "room_id");
    const payloadHash = rowText(row, "payload_hash");
    assertIdKind(projectionId, "proj", "sql_read_result_invalid");
    assertIdKind(roomId, "room", "sql_read_result_invalid");
    assertSha(payloadHash, "sql_read_result_invalid");
    const storedOwnerState = rowText(row, "owner_state");
    const curationState = rowText(row, "curation_state");
    const interactionMode = rowText(row, "interaction_mode");
    const storedCurrent = rowBoolean(row, "current");
    const storedBodyReadable = rowBoolean(row, "body_readable");
    const capsuleFieldVersion = rowNumber(row, "capsule_field_version");
    const lifecycleVersion = rowNumber(row, "lifecycle_version");
    const publishedAt = rowText(row, "published_at");
    const freshUntil = rowText(row, "fresh_until");
    const expiresAt = rowText(row, "expires_at");
    if (![
      "published_fresh", "stale", "superseded", "revoked", "expired",
    ].includes(storedOwnerState)) fail(503, "sql_read_result_invalid");
    if (!["not_admitted", "admitted", "unlisted"].includes(curationState)) fail(503, "sql_read_result_invalid");
    if (interactionMode !== "public_single" && interactionMode !== "closed") fail(503, "sql_read_result_invalid");
    if (projectionId !== readInput.projectionId || roomId !== readInput.roomId
      || capsuleFieldVersion < 1 || lifecycleVersion < 1) {
      fail(503, "sql_read_result_invalid");
    }
    assertTime(publishedAt, "sql_read_result_invalid");
    assertTime(freshUntil, "sql_read_result_invalid");
    assertTime(expiresAt, "sql_read_result_invalid");
    if (
      Date.parse(publishedAt) >= Date.parse(freshUntil)
      || Date.parse(freshUntil) >= Date.parse(expiresAt)
      || Date.parse(expiresAt) - Date.parse(publishedAt) > 7 * DAY_MS
    ) fail(503, "sql_read_result_invalid");
    const expiredNow = Date.parse(expiresAt) <= Date.parse(readInput.requestedAt);
    const storedTerminal = ["superseded", "revoked", "expired"].includes(storedOwnerState);
    const terminal = expiredNow || storedTerminal;
    const ownerState = expiredNow && !storedTerminal ? "expired" : storedOwnerState;
    const current = terminal ? false : storedCurrent;
    const bodyAvailable = !terminal && storedBodyReadable;
    if (
      (!terminal && (!storedCurrent || !storedBodyReadable || row.capsule_ciphertext === null))
      || (storedTerminal && (storedCurrent || storedBodyReadable || row.capsule_ciphertext !== null))
    ) fail(503, "sql_read_result_invalid");
    const capsuleCiphertext = bodyAvailable
      ? recoveredEncryptedEnvelope(
          row, "capsule_ciphertext", "capsule_plaintext_bytes", "capsule_field_version",
          Object.freeze({
            table: "projections", column: "capsule_ciphertext",
            roomId, rowId: projectionId,
          }),
          false,
        )
      : null;
    if (bodyAvailable && capsuleCiphertext === null) fail(503, "sql_ciphertext_result_invalid");
    return Object.freeze({
      projectionId,
      roomId,
      capsuleCiphertext,
      payloadHash,
      capsuleFieldVersion,
      ownerState: ownerState as PublicCoreSqlProjectionRowV1["ownerState"],
      curationState: curationState as PublicCoreSqlProjectionRowV1["curationState"],
      interactionMode: interactionMode as PublicCoreSqlProjectionRowV1["interactionMode"],
      current,
      bodyAvailable,
      lifecycleVersion,
      publishedAt,
      freshUntil,
      expiresAt,
    });
  }));
  if (action === "interaction.read") return Object.freeze(rows.map((row) => {
    const readInput = input as PublicCoreReadInteractionSqlInputV1;
    const interactionId = rowText(row, "interaction_id");
    const roomId = rowText(row, "room_id");
    const originProjectionId = rowText(row, "origin_projection_id");
    const originProjectionHash = rowText(row, "origin_projection_payload_hash");
    const interactionType = rowText(row, "interaction_type");
    const consentHash = rowText(row, "consent_hash");
    const storedState = rowText(row, "state");
    const storedBodyReadable = rowBoolean(row, "body_readable");
    const version = rowNumber(row, "version");
    const acceptedAt = rowText(row, "created_at");
    const bodyExpiresAt = rowText(row, "body_expires_at");
    const tombstoneExpiresAt = rowText(row, "tombstone_expires_at");
    const localPurgeReceivedAt = rowNullableText(row, "local_purge_received_at");
    if (![
      "accepted", "seen_locally", "interaction_deleted", "interaction_expired", "origin_revoked",
    ].includes(storedState)) fail(503, "sql_read_result_invalid");
    if (!["ask", "seed", "resonance"].includes(interactionType)) fail(503, "sql_read_result_invalid");
    assertSha(originProjectionHash, "sql_read_result_invalid");
    assertSha(consentHash, "sql_read_result_invalid");
    assertIdKind(interactionId, "interaction", "sql_read_result_invalid");
    assertIdKind(roomId, "room", "sql_read_result_invalid");
    assertIdKind(originProjectionId, "proj", "sql_read_result_invalid");
    assertTime(acceptedAt, "sql_read_result_invalid");
    assertTime(bodyExpiresAt, "sql_read_result_invalid");
    assertTime(tombstoneExpiresAt, "sql_read_result_invalid");
    if (localPurgeReceivedAt !== null) assertTime(localPurgeReceivedAt, "sql_read_result_invalid");
    if (
      interactionId !== readInput.interactionId
      || roomId !== readInput.roomId
      || version < 1
      || Date.parse(acceptedAt) >= Date.parse(bodyExpiresAt)
      || Date.parse(bodyExpiresAt) - Date.parse(acceptedAt) > 30 * DAY_MS
      || Date.parse(tombstoneExpiresAt) <= Date.parse(bodyExpiresAt)
      || Date.parse(tombstoneExpiresAt) <= Date.parse(readInput.requestedAt)
      || (localPurgeReceivedAt !== null && Date.parse(localPurgeReceivedAt) < Date.parse(acceptedAt))
    ) {
      fail(503, "sql_read_result_invalid");
    }
    const hardExpired = Date.parse(bodyExpiresAt) <= Date.parse(readInput.requestedAt);
    const storedTerminal = [
      "interaction_deleted", "interaction_expired", "origin_revoked",
    ].includes(storedState);
    const state = hardExpired && !storedTerminal ? "interaction_expired" : storedState;
    const bodyAvailable = !hardExpired && !storedTerminal;
    if (storedBodyReadable !== !storedTerminal) fail(503, "sql_read_result_invalid");
    return Object.freeze({
      interactionId,
      roomId,
      originProjectionId,
      originProjectionHash,
      interactionType: interactionType as PublicCoreSqlInteractionRowV1["interactionType"],
      consentHash,
      state: state as PublicCoreSqlInteractionRowV1["state"],
      version,
      acceptedAt,
      bodyExpiresAt,
      bodyAvailable,
      localPurgeReceivedAt,
    });
  }));
  return Object.freeze(rows.map((row) => {
    const readInput = input as PublicCoreReadRoomOperatorStatusSqlInputV1;
    const roomId = rowText(row, "room_id");
    const bindingId = rowText(row, "binding_id");
    const interactionMode = rowText(row, "interaction_mode");
    const roomVersion = rowNumber(row, "version");
    const currentProjectionId = rowNullableText(row, "current_projection_id");
    const eventHighWater = rowNumber(row, "event_high_water");
    const eventReplayFloor = rowNumber(row, "event_replay_floor");
    const bindingVersion = rowNumber(row, "binding_version");
    const bindingExpiresAt = rowText(row, "expires_at");
    const lastSuccessfulPurgeAt = rowText(row, "last_successful_purge_at");
    if (interactionMode !== "public_single" && interactionMode !== "closed") fail(503, "sql_read_result_invalid");
    assertTime(bindingExpiresAt, "sql_read_result_invalid");
    assertTime(lastSuccessfulPurgeAt, "sql_read_result_invalid");
    if (currentProjectionId !== null) assertIdKind(currentProjectionId, "proj", "sql_read_result_invalid");
    if (
      roomId !== readInput.roomId
      || roomVersion < 1
      || bindingVersion < 1
      || eventHighWater < 0
      || eventReplayFloor < 1
      || eventReplayFloor > eventHighWater + 1
      || Date.parse(bindingExpiresAt) <= Date.parse(readInput.requestedAt)
    ) fail(503, "sql_read_result_invalid");
    return Object.freeze({
      roomId,
      interactionMode,
      roomVersion,
      currentProjectionId,
      eventHighWater,
      eventReplayFloor,
      bindingId,
      bindingVersion,
      bindingExpiresAt,
      lastSuccessfulPurgeAt,
      writeStop: rowBoolean(row, "write_stop"),
    });
  }));
}

function janitorStatement(
  statementId: string,
  text: string,
  values: readonly PublicCoreSqlValueV1[],
  rowExpectation: PublicCoreCanonicalSqlStatementV1["rowExpectation"] = "zero_or_more",
): PublicCoreCanonicalSqlStatementV1 {
  const rowKeys: Readonly<Record<string, readonly string[]>> = {
    "retention.janitor.advisory_lock": ["acquired"],
    "retention.janitor.lock.installation": ["installation_id"],
    "retention.janitor.lock.room": ["room_id"],
    "retention.janitor.health.start": ["health_id"],
    "retention.janitor.pairing_material": ["purge_job_id"],
    "retention.janitor.projection_body": ["purge_job_id"],
    "retention.janitor.public_encounter": ["encounter_id"],
    "retention.janitor.interaction_body": ["purge_job_id"],
    "retention.janitor.rate_event": ["rate_event_id"],
    "retention.janitor.room_event": ["event_id"],
    "retention.janitor.mutation_receipt": ["receipt_id"],
    "retention.janitor.interaction_tombstone": ["interaction_id"],
    "retention.janitor.purge.claim": ["purge_job_id", "target_kind", "target_object_id"],
    "retention.janitor.purge.complete": ["purge_job_id"],
    "retention.janitor.event_floor": ["room_id", "event_replay_floor"],
    "retention.janitor.backlog.check": ["backlog_remaining"],
    "retention.janitor.health.success": ["last_successful_purge_at"],
    "retention.janitor.health.backlog": ["health_id"],
    "retention.janitor.health.failure": ["health_id"],
  };
  const expectedKeys = rowKeys[statementId];
  if (expectedKeys === undefined) fail(500, "janitor_statement_shape_missing");
  return canonicalStatement({
    statementId,
    action: "retention.janitor",
    phase: "maintenance",
    text,
    values,
    rowExpectation,
    rowKeys: expectedKeys,
  });
}

function janitorWorkStatements(input: PublicCoreRunRetentionJanitorSqlInputV1): readonly PublicCoreCanonicalSqlStatementV1[] {
  const values: readonly PublicCoreSqlValueV1[] = [input.requestedAt, input.batchSize];
  return Object.freeze([
    janitorStatement(
      "retention.janitor.lock.installation",
      `SELECT installation_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.installation
        WHERE singleton_slot FOR UPDATE`,
      [],
      "exactly_one",
    ),
    janitorStatement(
      "retention.janitor.lock.room",
      `SELECT room_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms
        WHERE singleton_slot FOR UPDATE`,
      [],
      "zero_or_one",
    ),
    janitorStatement(
      "retention.janitor.health.start",
      `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.retention_health
          SET last_run_started_at=$1,last_run_completed_at=NULL,last_failure_code=NULL,
              version=version+1 WHERE singleton_slot RETURNING health_id`,
      [input.requestedAt],
      "exactly_one",
    ),
    janitorStatement(
      "retention.janitor.pairing_material",
      `WITH candidates AS (
        SELECT pairing_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
         WHERE expires_at<=$1 AND (pairing_code_ciphertext IS NOT NULL OR exchange_envelope_ciphertext IS NOT NULL)
         ORDER BY pairing_id COLLATE "C" FOR UPDATE SKIP LOCKED LIMIT $2
      ), terminal AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges p
           SET state='expired',pairing_code_ciphertext=NULL,exchange_envelope_ciphertext=NULL,
               version=p.version+1 FROM candidates c WHERE p.pairing_id=c.pairing_id
        RETURNING p.pairing_id,p.room_id,p.installation_id,
                  GREATEST(p.pairing_code_field_version,p.exchange_envelope_field_version) AS field_version
      ) INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
        (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_pair_'||pg_catalog.md5(pairing_id||':'||field_version::text),
               room_id,installation_id,'pairing_material',pairing_id,field_version,
               $1::timestamptz+interval '23 hours' FROM terminal
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
        RETURNING purge_job_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.projection_body",
      `WITH candidates AS (
        SELECT projection_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.projections
         WHERE body_readable AND expires_at<=$1
         ORDER BY projection_id COLLATE "C" FOR UPDATE SKIP LOCKED LIMIT $2
      ), terminal AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.projections p
           SET owner_state='expired',current=false,body_readable=false,capsule_ciphertext=NULL,
               lifecycle_version=p.lifecycle_version+1
          FROM candidates c WHERE p.projection_id=c.projection_id
        RETURNING p.projection_id,p.room_id,p.installation_id,p.capsule_field_version
      ), room_clear AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms r SET current_projection_id=NULL,version=r.version+1
          FROM terminal p WHERE r.room_id=p.room_id AND r.current_projection_id=p.projection_id
      ), encounters AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
           SET state='invalidated',invalidated_at=$1,version=e.version+1
          FROM terminal p WHERE e.room_id=p.room_id AND e.projection_id=p.projection_id
           AND e.state='issued'
      ), interactions AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
           SET state='origin_revoked',body_readable=false,request_ciphertext=NULL,
               guest_capsule_ciphertext=NULL,version=x.version+1
          FROM terminal p WHERE x.room_id=p.room_id AND x.origin_projection_id=p.projection_id
           AND x.state IN ('accepted','seen_locally')
        RETURNING x.interaction_id,x.room_id,x.installation_id,
                  GREATEST(x.request_field_version,x.guest_capsule_field_version) AS field_version
      ), projection_purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
        (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_projection_'||pg_catalog.md5(projection_id||':'||capsule_field_version::text),
               room_id,installation_id,'projection_body',projection_id,capsule_field_version,
               $1::timestamptz+interval '23 hours' FROM terminal
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
        RETURNING purge_job_id
      ), interaction_purge AS (
        INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
        (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_expired_'||pg_catalog.md5(interaction_id||':'||field_version::text),
               room_id,installation_id,'interaction_body',interaction_id,field_version,
               $1::timestamptz+interval '23 hours'
          FROM interactions
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
        RETURNING purge_job_id
      ) SELECT purge_job_id FROM projection_purge
        UNION ALL SELECT purge_job_id FROM interaction_purge`,
      values,
    ),
    janitorStatement(
      "retention.janitor.public_encounter",
      `WITH candidates AS (
        SELECT encounter_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters
         WHERE expires_at<=$1
         ORDER BY encounter_id COLLATE "C" FOR UPDATE SKIP LOCKED LIMIT $2
      ) DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e USING candidates c
          WHERE e.encounter_id=c.encounter_id RETURNING e.encounter_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.interaction_body",
      `WITH candidates AS (
        SELECT interaction_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
         WHERE body_readable AND body_expires_at<=$1
         ORDER BY interaction_id COLLATE "C" FOR UPDATE SKIP LOCKED LIMIT $2
      ), terminal AS (
        UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.interactions x
           SET state='interaction_expired',body_readable=false,request_ciphertext=NULL,
               guest_capsule_ciphertext=NULL,version=x.version+1
          FROM candidates c WHERE x.interaction_id=c.interaction_id
        RETURNING x.interaction_id,x.room_id,x.installation_id,
                  GREATEST(x.request_field_version,x.guest_capsule_field_version) AS field_version
      ) INSERT INTO ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
        (purge_job_id,room_id,installation_id,target_kind,target_object_id,target_field_version,due_at)
        SELECT 'purge_interaction_'||pg_catalog.md5(interaction_id||':'||field_version::text),
               room_id,installation_id,'interaction_body',interaction_id,field_version,
               $1::timestamptz+interval '23 hours' FROM terminal
        ON CONFLICT (target_kind,target_object_id,target_field_version) DO NOTHING
        RETURNING purge_job_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.rate_event",
      `WITH candidates AS (
        SELECT r.rate_event_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.rate_events r
         WHERE r.expires_at<=$1
           AND NOT EXISTS (
             SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters e
              WHERE e.room_id=r.room_id
                AND r.rate_event_id IN (e.hourly_rate_event_id,e.daily_rate_event_id)
           )
         ORDER BY r.rate_event_id COLLATE "C"
         FOR UPDATE OF r SKIP LOCKED LIMIT $2
      ) DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.rate_events r USING candidates c
          WHERE r.rate_event_id=c.rate_event_id RETURNING r.rate_event_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.room_event",
      `WITH prefix AS MATERIALIZED (
        SELECT e.event_id,e.room_id,e.sequence
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
          JOIN ${PUBLIC_CORE_SQL_SCHEMA}.rooms r ON r.room_id=e.room_id
         WHERE e.sequence>=r.event_replay_floor AND e.expires_at<=$1
           AND (SELECT count(*) FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events prior
                 WHERE prior.room_id=e.room_id
                   AND prior.sequence BETWEEN r.event_replay_floor AND e.sequence)
               = e.sequence-r.event_replay_floor+1
           AND NOT EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events blocker
                            WHERE blocker.room_id=e.room_id
                              AND blocker.sequence BETWEEN r.event_replay_floor AND e.sequence
                              AND blocker.expires_at>$1)
         ORDER BY e.sequence LIMIT $2
      ), locked AS (
        SELECT e.event_id,e.room_id,e.sequence
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
          JOIN prefix p ON p.event_id=e.event_id
         ORDER BY e.event_id COLLATE "C" FOR UPDATE OF e
      ), deleted_acks AS (
        DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.event_acks a USING locked c
         WHERE a.event_id=c.event_id RETURNING a.ack_id
      ) DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events e USING locked c
          WHERE e.event_id=c.event_id RETURNING e.event_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.mutation_receipt",
      `WITH candidates AS (
        SELECT receipt_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts
         WHERE expires_at<=$1 ORDER BY receipt_id COLLATE "C"
         FOR UPDATE SKIP LOCKED LIMIT $2
      ) DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts r USING candidates c
          WHERE r.receipt_id=c.receipt_id RETURNING r.receipt_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.interaction_tombstone",
      `WITH candidates AS (
        SELECT interaction_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
         WHERE NOT body_readable AND tombstone_expires_at<=$1
         ORDER BY interaction_id COLLATE "C" FOR UPDATE SKIP LOCKED LIMIT $2
      ) DELETE FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions x USING candidates c
          WHERE x.interaction_id=c.interaction_id RETURNING x.interaction_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.purge.claim",
      `WITH candidates AS (
        SELECT purge_job_id FROM ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
         WHERE state IN ('pending','failed') AND due_at<=$1
         ORDER BY target_kind COLLATE "C",target_object_id COLLATE "C",purge_job_id COLLATE "C"
         FOR UPDATE SKIP LOCKED LIMIT $2
      ) UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs p
           SET state='claimed',claimed_at=$1,attempt_count=p.attempt_count+1
          FROM candidates c WHERE p.purge_job_id=c.purge_job_id
        RETURNING p.purge_job_id,p.target_kind,p.target_object_id`,
      values,
    ),
    janitorStatement(
      "retention.janitor.purge.complete",
      `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
          SET state='completed',completed_at=$1
        WHERE state='claimed' AND claimed_at=$1 RETURNING purge_job_id`,
      [input.requestedAt],
    ),
    janitorStatement(
      "retention.janitor.event_floor",
      `WITH shape AS (
        SELECT r.room_id,r.event_replay_floor,r.event_high_water,
               min(e.sequence) AS first_remaining,count(e.event_id)::bigint AS remaining_count
          FROM ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
          LEFT JOIN ${PUBLIC_CORE_SQL_SCHEMA}.room_events e
            ON e.room_id=r.room_id AND e.sequence>=r.event_replay_floor
         GROUP BY r.room_id,r.event_replay_floor,r.event_high_water
      ), proven AS (
        SELECT room_id,CASE
          WHEN remaining_count=0 THEN event_high_water+1
          WHEN first_remaining IS NOT NULL
           AND remaining_count=event_high_water-first_remaining+1 THEN first_remaining
          ELSE event_replay_floor END AS proven_floor
          FROM shape
      ) UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.rooms r
          SET event_replay_floor=p.proven_floor
         FROM proven p WHERE r.room_id=p.room_id
        RETURNING r.room_id,r.event_replay_floor`,
      [],
    ),
  ]);
}

function janitorAdvisoryLockStatement(): PublicCoreCanonicalSqlStatementV1 {
  return janitorStatement(
    "retention.janitor.advisory_lock",
    "SELECT pg_try_advisory_xact_lock(8243996700421904::bigint) AS acquired",
    [],
    "exactly_one",
  );
}

function janitorFailureStatement(input: PublicCoreRunRetentionJanitorSqlInputV1): PublicCoreCanonicalSqlStatementV1 {
  return janitorStatement(
    "retention.janitor.health.failure",
    `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.retention_health
        SET last_run_started_at=COALESCE(last_run_started_at,$1),last_run_completed_at=$1,
            last_failure_code='janitor_failed',version=version+1
      WHERE singleton_slot RETURNING health_id`,
    [input.requestedAt],
    "exactly_one",
  );
}

function janitorBacklogStatement(input: PublicCoreRunRetentionJanitorSqlInputV1): PublicCoreCanonicalSqlStatementV1 {
  return janitorStatement(
    "retention.janitor.backlog.check",
    `SELECT (
      EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.pairing_challenges
               WHERE expires_at<=$1 AND (pairing_code_ciphertext IS NOT NULL OR exchange_envelope_ciphertext IS NOT NULL))
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.projections WHERE body_readable AND expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions WHERE body_readable AND body_expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.public_encounters WHERE expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.rate_events WHERE expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.room_events WHERE expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.mutation_receipts WHERE expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.interactions
                  WHERE NOT body_readable AND tombstone_expires_at<=$1)
      OR EXISTS (SELECT 1 FROM ${PUBLIC_CORE_SQL_SCHEMA}.purge_jobs
                  WHERE state IN ('pending','failed','claimed') AND due_at<=$1)
    ) AS backlog_remaining`,
    [input.requestedAt],
    "exactly_one",
  );
}

function janitorSuccessStatement(input: PublicCoreRunRetentionJanitorSqlInputV1): PublicCoreCanonicalSqlStatementV1 {
  return janitorStatement(
    "retention.janitor.health.success",
    `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.retention_health
        SET last_successful_purge_at=$1,last_run_completed_at=$1,last_failure_code=NULL,
            version=version+1 WHERE singleton_slot
      RETURNING last_successful_purge_at`,
    [input.requestedAt],
    "exactly_one",
  );
}

function janitorBacklogHealthStatement(input: PublicCoreRunRetentionJanitorSqlInputV1): PublicCoreCanonicalSqlStatementV1 {
  return janitorStatement(
    "retention.janitor.health.backlog",
    `UPDATE ${PUBLIC_CORE_SQL_SCHEMA}.retention_health
        SET last_run_completed_at=$1,last_failure_code='backlog_remaining',version=version+1
      WHERE singleton_slot RETURNING health_id`,
    [input.requestedAt],
    "exactly_one",
  );
}

/**
 * Exact named durable store construction. It is intentionally not the live
 * application store: inputs are already authenticated, digested and encrypted.
 */
export interface PublicCorePreparedSqlStoreV1 {
  listThirdPlace(input: PublicCoreListThirdPlaceSqlInputV1): Promise<PublicCoreSqlReadResultV1>;
  readProjection(input: PublicCoreReadProjectionSqlInputV1): Promise<PublicCoreSqlReadResultV1>;
  readInteraction(input: PublicCoreReadInteractionSqlInputV1): Promise<PublicCoreSqlReadResultV1>;
  readRoomOperatorStatus(input: PublicCoreReadRoomOperatorStatusSqlInputV1): Promise<PublicCoreSqlReadResultV1>;
  issuePublicEncounter(context: PublicCoreSqlMutationContextV1<"public_encounter.issue">, input: PublicCoreIssueEncounterSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  createInteraction(context: PublicCoreSqlMutationContextV1<"interaction.create">, input: PublicCoreCreateInteractionSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  deleteInteraction(context: PublicCoreSqlMutationContextV1<"interaction.delete">, input: PublicCoreDeleteInteractionSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  exchangeRoomPair(context: PublicCoreSqlMutationContextV1<"room.pair.exchange">, input: PublicCoreExchangeRoomPairSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  createRoom(context: PublicCoreSqlMutationContextV1<"room.create">, input: PublicCoreCreateRoomSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  createRoomPair(context: PublicCoreSqlMutationContextV1<"room.pair">, input: PublicCoreCreateRoomPairSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  revokeRoomBinding(context: PublicCoreSqlMutationContextV1<"room.binding.revoke">, input: PublicCoreRevokeRoomBindingSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  setRoomMode(context: PublicCoreSqlMutationContextV1<"room.mode.set">, input: PublicCoreSetRoomModeSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  revokeProjection(context: PublicCoreSqlMutationContextV1<"projection.revoke">, input: PublicCoreRevokeProjectionSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  admitProjection(context: PublicCoreSqlMutationContextV1<"curation.admit">, input: PublicCoreCurationSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  unlistProjection(context: PublicCoreSqlMutationContextV1<"curation.unlist">, input: PublicCoreCurationSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  syncRoomOperator(context: PublicCoreSqlMutationContextV1<"room_operator.sync">, input: PublicCoreSyncRoomOperatorSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  pullRoomOperator(context: PublicCoreSqlMutationContextV1<"room_operator.pull">, input: PublicCorePullRoomOperatorSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  ackRoomOperator(context: PublicCoreSqlMutationContextV1<"room_operator.ack">, input: PublicCoreAckRoomOperatorSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  deliverProjection(context: PublicCoreSqlMutationContextV1<"room_operator.projection.deliver">, input: PublicCoreDeliverProjectionSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  recordLocalPurgeReceipt(context: PublicCoreSqlMutationContextV1<"room_operator.local_purge.receipt">, input: PublicCoreRecordLocalPurgeSqlInputV1): Promise<PublicCoreSqlMutationResultV1>;
  runRetentionJanitor(input: PublicCoreRunRetentionJanitorSqlInputV1): Promise<PublicCoreSqlJanitorResultV1>;
}

export class PublicCorePostgresStoreV1 implements PublicCorePreparedSqlStoreV1 {
  readonly #executor: PreparedExecutorV1;

  constructor(executor: PublicCoreSqlExecutorV1) {
    this.#executor = prepareExecutor(executor);
  }

  async #read(
    action: PublicCoreSqlReadActionV1,
    input: PublicCoreListThirdPlaceSqlInputV1 | PublicCoreReadProjectionSqlInputV1
      | PublicCoreReadInteractionSqlInputV1 | PublicCoreReadRoomOperatorStatusSqlInputV1,
    keys: readonly string[],
  ): Promise<PublicCoreSqlReadResultV1> {
    const stableInput = snapshotInput(input);
    exactKeys(stableInput, keys, "read_input_shape_invalid");
    assertIdKind(stableInput.roomId, "room", "room_id_invalid");
    assertTime(stableInput.requestedAt, "requested_at_invalid");
    if ("projectionId" in stableInput) assertIdKind(stableInput.projectionId, "proj", "projection_id_invalid");
    if ("interactionId" in stableInput) {
      assertIdKind(stableInput.interactionId, "interaction", "interaction_id_invalid");
      assertHmac(stableInput.replySecretDigest, "reply_secret_digest_invalid");
    }
    if ("bindingCredentialDigest" in stableInput) {
      assertHmac(stableInput.bindingCredentialDigest, "binding_credential_digest_invalid");
    }
    return await executeTransaction(this.#executor,
      Object.freeze({ isolation: "read_committed" as const, readOnly: true }),
      async (transaction) => {
        const result = await query(transaction, readStatement(action, stableInput));
        return Object.freeze({
          kind: "read" as const,
          action,
          rows: sanitizeReadRows(action, result.rows, stableInput),
        }) as PublicCoreSqlReadResultV1;
      },
    );
  }

  async listThirdPlace(input: PublicCoreListThirdPlaceSqlInputV1): Promise<PublicCoreSqlReadResultV1> {
    return await this.#read("third_place.list", input, ["roomId", "requestedAt"]);
  }

  async readProjection(input: PublicCoreReadProjectionSqlInputV1): Promise<PublicCoreSqlReadResultV1> {
    return await this.#read("projection.read", input, ["roomId", "projectionId", "requestedAt"]);
  }

  async readInteraction(input: PublicCoreReadInteractionSqlInputV1): Promise<PublicCoreSqlReadResultV1> {
    return await this.#read("interaction.read", input, [
      "roomId", "interactionId", "replySecretDigest", "requestedAt",
    ]);
  }

  async readRoomOperatorStatus(input: PublicCoreReadRoomOperatorStatusSqlInputV1): Promise<PublicCoreSqlReadResultV1> {
    return await this.#read("room_operator.status", input, [
      "roomId", "bindingCredentialDigest", "requestedAt",
    ]);
  }

  async issuePublicEncounter(
    context: PublicCoreSqlMutationContextV1<"public_encounter.issue">,
    input: PublicCoreIssueEncounterSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("public_encounter.issue", context, input));
  }

  async createInteraction(
    context: PublicCoreSqlMutationContextV1<"interaction.create">,
    input: PublicCoreCreateInteractionSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("interaction.create", context, input));
  }

  async deleteInteraction(
    context: PublicCoreSqlMutationContextV1<"interaction.delete">,
    input: PublicCoreDeleteInteractionSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("interaction.delete", context, input));
  }

  async exchangeRoomPair(
    context: PublicCoreSqlMutationContextV1<"room.pair.exchange">,
    input: PublicCoreExchangeRoomPairSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room.pair.exchange", context, input));
  }

  async createRoom(
    context: PublicCoreSqlMutationContextV1<"room.create">,
    input: PublicCoreCreateRoomSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room.create", context, input));
  }

  async createRoomPair(
    context: PublicCoreSqlMutationContextV1<"room.pair">,
    input: PublicCoreCreateRoomPairSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room.pair", context, input));
  }

  async revokeRoomBinding(
    context: PublicCoreSqlMutationContextV1<"room.binding.revoke">,
    input: PublicCoreRevokeRoomBindingSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room.binding.revoke", context, input));
  }

  async setRoomMode(
    context: PublicCoreSqlMutationContextV1<"room.mode.set">,
    input: PublicCoreSetRoomModeSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room.mode.set", context, input));
  }

  async revokeProjection(
    context: PublicCoreSqlMutationContextV1<"projection.revoke">,
    input: PublicCoreRevokeProjectionSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("projection.revoke", context, input));
  }

  async admitProjection(
    context: PublicCoreSqlMutationContextV1<"curation.admit">,
    input: PublicCoreCurationSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("curation.admit", context, input));
  }

  async unlistProjection(
    context: PublicCoreSqlMutationContextV1<"curation.unlist">,
    input: PublicCoreCurationSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("curation.unlist", context, input));
  }

  async syncRoomOperator(
    context: PublicCoreSqlMutationContextV1<"room_operator.sync">,
    input: PublicCoreSyncRoomOperatorSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room_operator.sync", context, input));
  }

  async pullRoomOperator(
    context: PublicCoreSqlMutationContextV1<"room_operator.pull">,
    input: PublicCorePullRoomOperatorSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room_operator.pull", context, input));
  }

  async ackRoomOperator(
    context: PublicCoreSqlMutationContextV1<"room_operator.ack">,
    input: PublicCoreAckRoomOperatorSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room_operator.ack", context, input));
  }

  async deliverProjection(
    context: PublicCoreSqlMutationContextV1<"room_operator.projection.deliver">,
    input: PublicCoreDeliverProjectionSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room_operator.projection.deliver", context, input));
  }

  async recordLocalPurgeReceipt(
    context: PublicCoreSqlMutationContextV1<"room_operator.local_purge.receipt">,
    input: PublicCoreRecordLocalPurgeSqlInputV1,
  ): Promise<PublicCoreSqlMutationResultV1> {
    return await executeMutation(this.#executor, validateMutationRun("room_operator.local_purge.receipt", context, input));
  }

  async runRetentionJanitor(input: PublicCoreRunRetentionJanitorSqlInputV1): Promise<PublicCoreSqlJanitorResultV1> {
    const stableInput = snapshotInput(input);
    exactKeys(stableInput, ["requestedAt", "batchSize"], "janitor_input_shape_invalid");
    assertTime(stableInput.requestedAt, "requested_at_invalid");
    const batchSize = integer(stableInput.batchSize, 1, "janitor_batch_size_invalid");
    if (batchSize > 100) fail(400, "janitor_batch_size_invalid");
    try {
      return await executeTransaction(this.#executor,
        Object.freeze({ isolation: "read_committed" as const, readOnly: false }),
        async (transaction) => {
          const lock = await query(transaction, janitorAdvisoryLockStatement());
          const acquired = rowBoolean(lock.rows[0] as SqlRow, "acquired");
          if (!acquired) return Object.freeze({
            kind: "retention_janitor" as const,
            acquired: false,
            claimed: 0,
            completed: 0,
            backlogRemaining: false,
            lastSuccessfulPurgeAt: null,
          });
          let claimed = 0;
          let completed = 0;
          let lastSuccessfulPurgeAt: string | null = null;
          for (const statement of janitorWorkStatements(stableInput)) {
            const result = await query(transaction, statement);
            if (statement.statementId === "retention.janitor.purge.claim") claimed = result.rowCount;
            if (statement.statementId === "retention.janitor.purge.complete") completed = result.rowCount;
          }
          const backlog = await query(transaction, janitorBacklogStatement(stableInput));
          const backlogRemaining = rowBoolean(backlog.rows[0] as SqlRow, "backlog_remaining");
          if (backlogRemaining) {
            await query(transaction, janitorBacklogHealthStatement(stableInput));
          } else {
            const success = await query(transaction, janitorSuccessStatement(stableInput));
            lastSuccessfulPurgeAt = rowText(success.rows[0] as SqlRow, "last_successful_purge_at");
            assertTime(lastSuccessfulPurgeAt, "sql_janitor_time_invalid");
            if (lastSuccessfulPurgeAt !== stableInput.requestedAt) {
              fail(503, "sql_janitor_time_invalid");
            }
          }
          return Object.freeze({
            kind: "retention_janitor" as const,
            acquired: true,
            claimed,
            completed,
            backlogRemaining,
            lastSuccessfulPurgeAt,
          });
        },
      );
    } catch {
      try {
        await executeTransaction(this.#executor,
          Object.freeze({ isolation: "read_committed" as const, readOnly: false }),
          async (transaction) => {
            await query(transaction, janitorFailureStatement(stableInput));
          },
        );
      } catch {
        fail(503, "retention_janitor_failure_unrecorded");
      }
      fail(503, "retention_janitor_failed");
    }
  }
}

export const PUBLIC_CORE_POSTGRES_CONSTRUCTION = Object.freeze({
  schemaVersion: "r4.public-core-postgres-construction.v1" as const,
  driver: null,
  pool: null,
  dsn: null,
  migrationExecuted: false as const,
  databaseProcesses: 0 as const,
  networkCalls: 0 as const,
  trafficReady: false as const,
  gateCReady: false as const,
});

if (
  new Set([...PUBLIC_CORE_SQL_READ_ACTIONS, ...PUBLIC_CORE_SQL_MUTATION_ACTIONS]).size !== 20
  || PUBLIC_CORE_ACTION_NAMES.some((action) => !(action in PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION))
) fail(500, "sql_action_surface_drift");
