import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import * as postgresModule from "../../apps/room/src/public-core-postgres.ts";
import {
  PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES,
  PUBLIC_CORE_POSTGRES_CONSTRUCTION,
  PUBLIC_CORE_SQL_EXPECTED_CATALOG_CONTRACT_SHA256,
  PUBLIC_CORE_SQL_LOCK_ORDER,
  PUBLIC_CORE_SQL_MUTATION_ACTIONS,
  PUBLIC_CORE_SQL_READ_ACTIONS,
  PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS,
  PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION,
  PUBLIC_CORE_SQL_TABLES,
  PublicCorePostgresError,
  PublicCorePostgresStoreV1,
  type PublicCoreCanonicalSqlStatementV1,
  type PublicCoreSqlActorClassV1,
  type PublicCoreSqlEncryptedValueV1,
  type PublicCoreSqlExecutorV1,
  type PublicCoreSqlMutationActionV1,
  type PublicCoreSqlMutationContextV1,
  type PublicCoreSqlQueryResultV1,
  type PublicCoreSqlTransactionV1,
} from "../../apps/room/src/public-core-postgres.ts";
import { PUBLIC_CORE_ACTION_NAMES } from "../../apps/room/src/public-core-policy.ts";

const SCHEMA = readFileSync(new URL("../../schemas/r4/public-core/schema.sql", import.meta.url), "utf8");
const VERIFY = readFileSync(new URL("../../schemas/r4/public-core/verify.sql", import.meta.url), "utf8");
const ROLLBACK = readFileSync(new URL("../../schemas/r4/public-core/rollback.sql", import.meta.url), "utf8");
const ADAPTER = readFileSync(new URL("../../apps/room/src/public-core-postgres.ts", import.meta.url), "utf8");

function catalogManifestRows(sql: string): string {
  const start = sql.indexOf("SELECT 'relation|'");
  const endMarker = ") catalog_rows;";
  const end = sql.indexOf(endMarker, start);
  assert.ok(start >= 0 && end >= 0, "catalog manifest row query must exist");
  return sql.slice(start, end + endMarker.length).replace(/\s+/gu, " ").trim();
}

const NOW = "2026-08-10T12:00:00.000Z";
const HOUR = "2026-08-10T12:00:00.000Z";
const DAY = "2026-08-10T00:00:00.000Z";
const RATE_EXPIRES = "2026-08-11T12:59:00.000Z";
const ENCOUNTER_EXPIRES = "2026-08-11T12:00:00.000Z";
const BODY_EXPIRES = "2026-09-09T11:59:00.000Z";
const PAIR_EXPIRES = "2026-08-10T12:10:00.000Z";
const BINDING_EXPIRES = "2026-09-09T12:00:00.000Z";
const FRESH_UNTIL = "2026-08-11T12:00:00.000Z";
const PROJECTION_EXPIRES = "2026-08-17T12:00:00.000Z";
const SYNC_CEILING = "2026-09-16T12:00:00.000Z";
const TOMBSTONE_EXPIRES = "2026-09-16T11:59:00.000Z";

const IDS = Object.freeze({
  room: `room_${"r".repeat(24)}`,
  entity: `entity_${"e".repeat(24)}`,
  projection: `proj_${"p".repeat(24)}`,
  oldProjection: `proj_${"o".repeat(24)}`,
  encounter: `encounter_${"n".repeat(24)}`,
  interaction: `interaction_${"i".repeat(24)}`,
  pairing: `pairing_${"q".repeat(24)}`,
  binding: `binding_${"b".repeat(24)}`,
  event: `event_${"v".repeat(24)}`,
  ack: `ack_${"a".repeat(24)}`,
  purge: `purge_${"u".repeat(24)}`,
  receipt: `receipt_${"c".repeat(24)}`,
  receipt2: `receipt_${"d".repeat(24)}`,
  rateHour: `rate_${"h".repeat(24)}`,
  rateDay: `rate_${"j".repeat(24)}`,
  rateAccept: `rate_${"k".repeat(24)}`,
  approval: `approval_${"l".repeat(24)}`,
});

const sha = (character: string): `sha256:${string}` => `sha256:${character.repeat(64)}`;
const hmac = (character: string): `hmac-sha256:${string}` => `hmac-sha256:${character.repeat(64)}`;

const ACTOR: Readonly<Record<PublicCoreSqlMutationActionV1, PublicCoreSqlActorClassV1>> = {
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
};

const NO_EXPECTED = new Set<PublicCoreSqlMutationActionV1>([
  "interaction.create", "room.create", "room_operator.sync", "room_operator.ack",
]);

function context<A extends PublicCoreSqlMutationActionV1>(
  action: A,
  overrides: Partial<PublicCoreSqlMutationContextV1<A>> = {},
): PublicCoreSqlMutationContextV1<A> {
  return Object.freeze({
    action,
    receiptId: IDS.receipt,
    roomId: IDS.room,
    actorClass: ACTOR[action],
    actorScopeDigest: hmac("1"),
    idempotencyKey: `idem.${action.replaceAll(".", "_")}.0000000000000000`,
    canonicalRequestHash: sha("2"),
    expectedVersion: NO_EXPECTED.has(action) ? null : 1,
    requestedAt: NOW,
    ...overrides,
  });
}

let nonceByte = 1;
function encrypted(
  table: "rooms" | "projections" | "pairing_challenges" | "interactions",
  column: "label_ciphertext" | "capsule_ciphertext" | "pairing_code_ciphertext" | "exchange_envelope_ciphertext" | "request_ciphertext" | "guest_capsule_ciphertext",
  rowId: string,
  fieldVersion = 1,
): PublicCoreSqlEncryptedValueV1 {
  const nonce = Buffer.alloc(12, nonceByte++ % 255).toString("base64url");
  return Object.freeze({
    envelope: Object.freeze({
      schemaVersion: "a256gcm.v1" as const,
      algorithm: "AES-256-GCM" as const,
      keyVersion: "keyv_11111111111111111111111111111111",
      nonce,
      ciphertext: Buffer.alloc(12, 9).toString("base64url"),
      tag: Buffer.alloc(16, 7).toString("base64url"),
      aadHash: canonicalSha256({
        schemaVersion: "r4_public_core_aad.v1",
        table,
        column,
        roomId: IDS.room,
        rowId,
        objectVersion: fieldVersion,
      }),
    }),
    plaintextBytes: 12,
    fieldVersion,
  });
}

function encryptedWithBytes(
  value: PublicCoreSqlEncryptedValueV1,
  plaintextBytes: number,
): PublicCoreSqlEncryptedValueV1 {
  return Object.freeze({
    ...value,
    plaintextBytes,
    envelope: Object.freeze({
      ...value.envelope,
      ciphertext: Buffer.alloc(plaintextBytes, 9).toString("base64url"),
    }),
  });
}

function inputFor(action: PublicCoreSqlMutationActionV1): object {
  const event = { eventId: IDS.event, eventHash: sha("3") };
  switch (action) {
    case "public_encounter.issue": return {
      projectionId: IDS.projection,
      encounterId: IDS.encounter,
      encounterSecretDigest: hmac("1"),
      issuanceBucketDigest: hmac("2"),
      hourlyRateEventId: IDS.rateHour,
      hourlyBucketDigest: hmac("3"),
      hourWindowStart: HOUR,
      dailyRateEventId: IDS.rateDay,
      dailyBucketDigest: hmac("4"),
      dayWindowStart: DAY,
      rateExpiresAt: RATE_EXPIRES,
      encounterExpiresAt: ENCOUNTER_EXPIRES,
      ...event,
    };
    case "interaction.create": return {
      interactionId: IDS.interaction,
      interactionType: "ask" as const,
      projectionId: IDS.projection,
      acceptRateEventId: IDS.rateAccept,
      dayWindowStart: DAY,
      rateExpiresAt: RATE_EXPIRES,
      requestCiphertext: encrypted("interactions", "request_ciphertext", IDS.interaction),
      guestCapsuleCiphertext: encrypted("interactions", "guest_capsule_ciphertext", IDS.interaction),
      requestBodyHash: sha("4"),
      guestCapsuleBodyHash: sha("d"),
      consentHash: sha("5"),
      replySecretDigest: hmac("5"),
      deleteSecretDigest: hmac("6"),
      bodyExpiresAt: BODY_EXPIRES,
      encounterSecretDigest: hmac("1"),
      ...event,
    };
    case "interaction.delete": return {
      interactionId: IDS.interaction,
      interactionPurgeJobId: IDS.purge,
      deleteSecretDigest: hmac("6"),
      ...event,
    };
    case "room.pair.exchange": return {
      pairingId: IDS.pairing,
      clientPublicKeyHash: sha("6"),
      pairingCodeDigest: hmac("7"),
      exchangeEnvelopeCiphertext: encrypted(
        "pairing_challenges", "exchange_envelope_ciphertext", IDS.pairing, 2,
      ),
      bindingId: IDS.binding,
      bindingCredentialDigest: hmac("8"),
      bindingExpiresAt: BINDING_EXPIRES,
      ...event,
    };
    case "room.create": return {
      entityId: IDS.entity,
      labelCiphertext: encrypted("rooms", "label_ciphertext", IDS.room),
      ...event,
    };
    case "room.pair": return {
      pairingId: IDS.pairing,
      pairingCodeCiphertext: encrypted(
        "pairing_challenges", "pairing_code_ciphertext", IDS.pairing,
      ),
      pairingCodeDigest: hmac("7"),
      pairingExpiresAt: PAIR_EXPIRES,
      ...event,
    };
    case "room.binding.revoke": return { bindingId: IDS.binding, ...event };
    case "room.mode.set": return { interactionMode: "closed" as const, ...event };
    case "projection.revoke": return {
      projectionId: IDS.projection, projectionPurgeJobId: IDS.purge, ...event,
    };
    case "curation.admit":
    case "curation.unlist": return { projectionId: IDS.projection, ...event };
    case "room_operator.sync": return { bindingCredentialDigest: hmac("8"), afterSequence: 2 };
    case "room_operator.pull": return { bindingCredentialDigest: hmac("8"), interactionId: IDS.interaction, ...event };
    case "room_operator.ack": return {
      ackId: IDS.ack, bindingCredentialDigest: hmac("8"), eventId: IDS.event, sequence: 3, eventHash: sha("3"),
    };
    case "room_operator.projection.deliver": return {
      bindingCredentialDigest: hmac("8"),
      projectionId: IDS.projection,
      capsuleCiphertext: encrypted("projections", "capsule_ciphertext", IDS.projection),
      payloadHash: sha("7"),
      basisHash: sha("8"),
      projectionPolicyHash: sha("9"),
      publicationApprovalId: IDS.approval,
      publicationApprovalHash: sha("a"),
      publicationAttestationHash: sha("b"),
      publishedAt: NOW,
      freshUntil: FRESH_UNTIL,
      expiresAt: PROJECTION_EXPIRES,
      projectionPurgeJobId: IDS.purge,
      ...event,
    };
    case "room_operator.local_purge.receipt": return {
      bindingCredentialDigest: hmac("8"), interactionId: IDS.interaction, ...event,
    };
  }
}

type ReceiptState = Record<string, unknown>;

function receiptKey(scope: unknown, action: unknown, key: unknown): string {
  return `${String(scope)}\u0000${String(action)}\u0000${String(key)}`;
}

class ExecutingFakeSqlExecutor implements PublicCoreSqlExecutorV1 {
  receipts = new Map<string, ReceiptState>();
  readonly trace: PublicCoreCanonicalSqlStatementV1[] = [];
  readonly effects = new Map<PublicCoreSqlMutationActionV1, number>();
  readonly events = new Map<PublicCoreSqlMutationActionV1, number>();
  failAtStatementId: string | null = null;
  failAfterStatementId: string | null = null;
  zeroAtStatementId: string | null = null;
  failBeforeCommitOnce = false;
  loseCommittedResponseOnce = false;
  allocatedEventSequence = 1;
  eventHashOverride: string | null = null;
  reserveCreatedAtOverride: string | null = null;
  reserveExpiresAtOverride: string | null = null;
  domainTargetOverride: string | null = null;
  domainVersionOverride: number | null = null;
  pairingState: "issued" | "exchanged" | "expired" = "issued";
  pairingCodeCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null =
    encrypted("pairing_challenges", "pairing_code_ciphertext", IDS.pairing).envelope;
  exchangeEnvelopeCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null =
    encrypted("pairing_challenges", "exchange_envelope_ciphertext", IDS.pairing, 2).envelope;
  pullState: "accepted" | "seen_locally" | "interaction_deleted" | "origin_revoked" | "interaction_expired" = "accepted";
  pullBodyReadable = true;
  pullRequestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null =
    encrypted("interactions", "request_ciphertext", IDS.interaction).envelope;
  pullGuestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null =
    encrypted("interactions", "guest_capsule_ciphertext", IDS.interaction).envelope;
  pullVersion = 1;
  pullRequestFieldVersion = 1;
  pullGuestFieldVersion = 1;
  pullHash = sha("4");
  pullGuestHash: `sha256:${string}` | null = sha("d");
  pullExpiresAt = BODY_EXPIRES;
  pullTombstoneExpiresAt = TOMBSTONE_EXPIRES;
  pullProjectionId = IDS.projection;
  pullOriginProjectionHash = sha("7");
  pullInteractionType: "ask" | "seed" | "resonance" = "ask";
  pullConsentHash = sha("5");
  pullAcceptedAt = NOW;
  localPurgeReceivedAt: string | null = null;
  syncFloor = 1;
  syncHighWater = 5;
  janitorBacklogRemaining = false;
  readonly syncEvents = [3, 4, 5].map((sequence) => {
    const eventId = `event_${String.fromCharCode(117 + sequence).repeat(24)}`;
    return {
      event_id: eventId,
      sequence,
      event_kind: "interaction_accepted",
      object_id: IDS.interaction,
      object_version: 1,
      event_hash: canonicalSha256({
        schemaVersion: "r4_public_core_room_event.v1",
        eventId,
        roomId: IDS.room,
        sequence,
        action: "interaction.create",
        targetKind: "interaction",
        targetId: IDS.interaction,
        targetVersion: 1,
        committedAt: NOW,
        bodyAvailable: true,
      }),
      committed_at: NOW,
    };
  });

  async transaction<T>(
    _options: Readonly<{ isolation: "read_committed"; readOnly: boolean }>,
    work: (transaction: PublicCoreSqlTransactionV1) => Promise<T>,
  ): Promise<T> {
    const workingReceipts = structuredClone(this.receipts);
    const workingEffects = structuredClone(this.effects);
    const workingEvents = structuredClone(this.events);
    const workingDomain = {
      pullState: this.pullState,
      pullBodyReadable: this.pullBodyReadable,
      pullRequestCiphertext: this.pullRequestCiphertext,
      pullGuestCiphertext: this.pullGuestCiphertext,
      pullVersion: this.pullVersion,
      pullRequestFieldVersion: this.pullRequestFieldVersion,
      pullGuestFieldVersion: this.pullGuestFieldVersion,
      pullHash: this.pullHash,
      pullGuestHash: this.pullGuestHash,
      pullExpiresAt: this.pullExpiresAt,
      pullTombstoneExpiresAt: this.pullTombstoneExpiresAt,
      pullProjectionId: this.pullProjectionId,
      pullOriginProjectionHash: this.pullOriginProjectionHash,
      pullInteractionType: this.pullInteractionType,
      pullConsentHash: this.pullConsentHash,
      pullAcceptedAt: this.pullAcceptedAt,
      localPurgeReceivedAt: this.localPurgeReceivedAt,
    };
    const transaction: PublicCoreSqlTransactionV1 = Object.freeze({
      query: async (statement: PublicCoreCanonicalSqlStatementV1): Promise<PublicCoreSqlQueryResultV1> => {
        this.trace.push(statement);
        if (this.failAtStatementId === statement.statementId) throw new Error("INJECTED_SQL_FAILURE");
        if (this.zeroAtStatementId === statement.statementId) return { rowCount: 0, rows: [] };
        const result = this.#execute(
          statement, workingReceipts, workingEffects, workingEvents, workingDomain,
        );
        if (this.failAfterStatementId === statement.statementId) {
          throw new Error("AFTER_PHASE_PRIVATE_CANARY");
        }
        return result;
      },
    });
    const result = await work(transaction);
    if (this.failBeforeCommitOnce) {
      this.failBeforeCommitOnce = false;
      throw new Error("INJECTED_BEFORE_COMMIT");
    }
    this.receipts = workingReceipts;
    this.effects.clear();
    for (const [action, count] of workingEffects) this.effects.set(action, count);
    this.events.clear();
    for (const [action, count] of workingEvents) this.events.set(action, count);
    Object.assign(this, workingDomain);
    if (this.loseCommittedResponseOnce) {
      this.loseCommittedResponseOnce = false;
      throw new Error("INJECTED_COMMITTED_RESPONSE_LOST");
    }
    return result;
  }

  #execute(
    statement: PublicCoreCanonicalSqlStatementV1,
    receipts: Map<string, ReceiptState>,
    effects: Map<PublicCoreSqlMutationActionV1, number>,
    events: Map<PublicCoreSqlMutationActionV1, number>,
    domain: {
      pullState: ExecutingFakeSqlExecutor["pullState"];
      pullBodyReadable: boolean;
      pullRequestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null;
      pullGuestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null;
      pullVersion: number;
      pullRequestFieldVersion: number;
      pullGuestFieldVersion: number;
      pullHash: string;
      pullGuestHash: string | null;
      pullExpiresAt: string;
      pullTombstoneExpiresAt: string;
      pullProjectionId: string;
      pullOriginProjectionHash: string;
      pullInteractionType: ExecutingFakeSqlExecutor["pullInteractionType"];
      pullConsentHash: string;
      pullAcceptedAt: string;
      localPurgeReceivedAt: string | null;
    },
  ): PublicCoreSqlQueryResultV1 {
    if (statement.phase === "receipt_reserve") {
      const [receiptId, roomId, actorClass, scope, action, key, requestHash, recoveryKind] = statement.values;
      const storageKey = receiptKey(scope, action, key);
      if (receipts.has(storageKey)) return { rowCount: 0, rows: [] };
      const row: ReceiptState = {
        receipt_id: receiptId,
        action_name: action,
        request_hash: requestHash,
        status: "reserved",
        target_id: null,
        related_target_id: null,
        target_version: null,
        http_status: null,
        result_code: null,
        recovery_kind: recoveryKind,
        sync_after_sequence: null,
        sync_high_water: null,
        sync_replay_floor: null,
        sync_result_kind: null,
        sync_event_ids: null,
        sync_event_sequences: null,
        sync_event_kinds: null,
        sync_object_ids: null,
        sync_object_versions: null,
        sync_event_hashes: null,
        sync_event_committed_ats: null,
        sync_tombstone_ids: null,
        sync_tombstone_expires_ats: null,
        pull_interaction_id: null,
        pull_request_field_version: null,
        pull_body_hash: null,
        pull_guest_field_version: null,
        pull_guest_hash: null,
        pull_body_expires_at: null,
        pull_terminal_state: null,
        source_expires_at: null,
        created_at: this.reserveCreatedAtOverride ?? NOW,
        committed_at: null,
        expires_at: this.reserveExpiresAtOverride ?? "2026-09-16T12:00:00.000Z",
      };
      receipts.set(storageKey, row);
      return { rowCount: 1, rows: [Object.freeze({ ...row })] };
    }
    if (statement.phase === "receipt_lookup") {
      const [scope, action, key] = statement.values;
      const row = receipts.get(receiptKey(scope, action, key));
      return row ? { rowCount: 1, rows: [Object.freeze({ ...row })] } : { rowCount: 0, rows: [] };
    }
    if (statement.phase === "domain_write") {
      const action = statement.action as PublicCoreSqlMutationActionV1;
      const row = this.#domainRow(action, statement, domain, receipts);
      if (row === null) return { rowCount: 0, rows: [] };
      effects.set(action, (effects.get(action) ?? 0) + 1);
      return { rowCount: 1, rows: [row] };
    }
    if (statement.phase === "event_allocate") {
      return { rowCount: 1, rows: [{
        installation_id: "installation_forme_public_core_v1",
        sequence: this.allocatedEventSequence,
      }] };
    }
    if (statement.phase === "event_append") {
      const action = statement.action as PublicCoreSqlMutationActionV1;
      events.set(action, (events.get(action) ?? 0) + 1);
      return { rowCount: 1, rows: [{
        event_id: statement.values[0],
        sequence: statement.values[3],
        event_hash: this.eventHashOverride ?? statement.values[7],
        committed_at: statement.values[8],
      }] };
    }
    if (statement.phase === "receipt_finalize") {
      const values = statement.values;
      const receiptId = values[15];
      const requestHash = values[16];
      const entry = [...receipts.entries()].find(([, row]) => row.receipt_id === receiptId);
      if (!entry || entry[1].request_hash !== requestHash || entry[1].status !== "reserved") {
        return { rowCount: 0, rows: [] };
      }
      const row = entry[1];
      Object.assign(row, {
        status: "committed",
        target_id: values[0],
        related_target_id: values[1],
        target_version: values[2],
        recovery_kind: values[3],
        http_status: values[4],
        result_code: values[5],
        pull_interaction_id: values[7],
        pull_request_field_version: values[8],
        pull_body_hash: values[9],
        pull_guest_field_version: values[10],
        pull_guest_hash: values[11],
        pull_body_expires_at: values[12],
        pull_terminal_state: values[13],
        source_expires_at: values[14],
        committed_at: values[6],
        expires_at: values[14],
      });
      return { rowCount: 1, rows: [Object.freeze({ ...row })] };
    }
    if (statement.statementId === "room.pair.recovery.read") {
      return { rowCount: 1, rows: [{
        pairing_id: IDS.pairing,
        state: this.pairingState,
        version: 1,
        pairing_code_ciphertext: this.pairingCodeCiphertext,
        pairing_code_plaintext_bytes: 12,
        pairing_code_field_version: 1,
        expires_at: PAIR_EXPIRES,
      }] };
    }
    if (statement.statementId === "room.pair.exchange.recovery.read") {
      return { rowCount: 1, rows: [{
        pairing_id: IDS.pairing,
        state: this.pairingState === "issued" ? "exchanged" : this.pairingState,
        version: 2,
        exchange_envelope_ciphertext: this.exchangeEnvelopeCiphertext,
        exchange_envelope_plaintext_bytes: 12,
        exchange_envelope_field_version: 2,
        expires_at: PAIR_EXPIRES,
      }] };
    }
    if (statement.statementId === "room_operator.pull.recovery.read") {
      return { rowCount: 1, rows: [{
        interaction_id: IDS.interaction,
        state: domain.pullState,
        body_readable: domain.pullBodyReadable,
        version: domain.pullVersion,
        request_ciphertext: domain.pullRequestCiphertext,
        guest_capsule_ciphertext: domain.pullGuestCiphertext,
        request_hash: domain.pullHash,
        guest_capsule_hash: domain.pullGuestHash,
        request_plaintext_bytes: 12,
        guest_capsule_plaintext_bytes: domain.pullGuestCiphertext === null ? null : 12,
        request_field_version: domain.pullRequestFieldVersion,
        guest_capsule_field_version: domain.pullGuestFieldVersion,
        body_expires_at: domain.pullExpiresAt,
        origin_projection_id: domain.pullProjectionId,
        origin_projection_payload_hash: domain.pullOriginProjectionHash,
        interaction_type: domain.pullInteractionType,
        consent_hash: domain.pullConsentHash,
        created_at: domain.pullAcceptedAt,
        local_purge_received_at: domain.localPurgeReceivedAt,
      }] };
    }
    if (statement.statementId === "room_operator.pull.terminal.recovery.read") {
      return { rowCount: 1, rows: [{
        interaction_id: IDS.interaction,
        state: domain.pullState,
        tombstone_expires_at: domain.pullTombstoneExpiresAt,
      }] };
    }
    if (statement.statementId === "room_operator.ack.recovery.read") {
      return { rowCount: 1, rows: [{
        ack_id: IDS.ack,
        event_id: IDS.event,
        sequence: 3,
        event_hash: sha("3"),
        acked_at: NOW,
      }] };
    }
    if (statement.statementId === "room_operator.sync.recovery.room") {
      return { rowCount: 1, rows: [{
        room_id: IDS.room,
        event_replay_floor: this.syncFloor,
        event_high_water: this.syncHighWater,
      }] };
    }
    if (statement.statementId === "room_operator.sync.recovery.events") {
      const after = Number(statement.values[1]);
      const high = Number(statement.values[2]);
      const rows = this.syncEvents.filter((event) => event.sequence > after && event.sequence <= high);
      return { rowCount: rows.length, rows };
    }
    if (statement.statementId === "room_operator.sync.recovery.tombstones") {
      return { rowCount: 2, rows: [{ object_id: IDS.oldProjection }, { object_id: IDS.interaction }] };
    }
    if (statement.statementId === "retention.janitor.advisory_lock") {
      return { rowCount: 1, rows: [{ acquired: true }] };
    }
    if (statement.statementId === "retention.janitor.health.success") {
      return { rowCount: 1, rows: [{ last_successful_purge_at: NOW }] };
    }
    if (statement.statementId === "retention.janitor.backlog.check") {
      return { rowCount: 1, rows: [{ backlog_remaining: this.janitorBacklogRemaining }] };
    }
    if (statement.statementId === "retention.janitor.purge.claim") {
      return { rowCount: 1, rows: [this.#rowFor(statement, {
        purge_job_id: IDS.purge,
        target_kind: "interaction_body",
        target_object_id: IDS.interaction,
      })] };
    }
    if (statement.statementId === "retention.janitor.purge.complete") {
      return { rowCount: 1, rows: [{ purge_job_id: IDS.purge }] };
    }
    if (statement.statementId.endsWith(".read")) return this.#readRow(statement.action);
    if (statement.rowExpectation === "exactly_one") {
      return { rowCount: 1, rows: [this.#rowFor(statement)] };
    }
    return { rowCount: 0, rows: [] };
  }

  #domainRow(
    action: PublicCoreSqlMutationActionV1,
    statement: PublicCoreCanonicalSqlStatementV1,
    domain: {
      pullState: ExecutingFakeSqlExecutor["pullState"];
      pullBodyReadable: boolean;
      pullRequestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null;
      pullGuestCiphertext: PublicCoreSqlEncryptedValueV1["envelope"] | null;
      pullVersion: number;
      pullRequestFieldVersion: number;
      pullGuestFieldVersion: number;
      pullHash: string;
      pullGuestHash: string | null;
      pullExpiresAt: string;
      pullTombstoneExpiresAt: string;
      pullProjectionId: string;
      pullOriginProjectionHash: string;
      pullInteractionType: "ask" | "seed" | "resonance";
      pullConsentHash: string;
      pullAcceptedAt: string;
      localPurgeReceivedAt: string | null;
    },
    receipts: Map<string, ReceiptState>,
  ): ReceiptState | null {
    const target: Readonly<Record<PublicCoreSqlMutationActionV1, readonly [string, number]>> = {
      "public_encounter.issue": [IDS.encounter, 1],
      "interaction.create": [IDS.interaction, 1],
      "interaction.delete": [IDS.interaction, 2],
      "room.pair.exchange": [IDS.pairing, 2],
      "room.create": [IDS.room, 1],
      "room.pair": [IDS.pairing, 1],
      "room.binding.revoke": [IDS.binding, 2],
      "room.mode.set": [IDS.room, 2],
      "projection.revoke": [IDS.projection, 2],
      "curation.admit": [IDS.projection, 2],
      "curation.unlist": [IDS.projection, 2],
      "room_operator.sync": [IDS.room, 1],
      "room_operator.pull": [IDS.interaction, 2],
      "room_operator.ack": [IDS.ack, 1],
      "room_operator.projection.deliver": [IDS.projection, 1],
      "room_operator.local_purge.receipt": [IDS.interaction, 2],
    };
    const [canonicalTargetId, canonicalTargetVersion] = target[action];
    const targetId = this.domainTargetOverride ?? canonicalTargetId;
    const targetVersion = this.domainVersionOverride ?? canonicalTargetVersion;
    if (action === "room_operator.sync") {
      const receiptId = statement.values[1];
      const after = Number(statement.values[0]);
      const cursorGone = after < this.syncFloor - 1;
      const pageAfter = cursorGone ? this.syncFloor - 1 : after;
      const pageHigh = Math.min(this.syncHighWater, pageAfter + 256);
      const page = this.syncEvents.filter((event) => event.sequence > pageAfter && event.sequence <= pageHigh);
      if (page.length !== pageHigh - pageAfter) return null;
      const tombstones = cursorGone ? [IDS.oldProjection, IDS.interaction].sort() : [];
      const tombstoneExpiresAts = tombstones.map((id) => id === IDS.interaction
        ? TOMBSTONE_EXPIRES
        : SYNC_CEILING);
      const sourceExpiresAt = tombstoneExpiresAts[0] ?? SYNC_CEILING;
      for (const row of receipts.values()) {
        if (row.receipt_id === receiptId) {
          row.sync_after_sequence = after;
          row.sync_high_water = pageHigh;
          row.sync_replay_floor = this.syncFloor;
          row.sync_result_kind = cursorGone ? "cursor_gone" : "event_batch";
          row.sync_event_ids = page.map((event) => event.event_id);
          row.sync_event_sequences = page.map((event) => event.sequence);
          row.sync_event_kinds = page.map((event) => event.event_kind);
          row.sync_object_ids = page.map((event) => event.object_id);
          row.sync_object_versions = page.map((event) => event.object_version);
          row.sync_event_hashes = page.map((event) => event.event_hash);
          row.sync_event_committed_ats = page.map((event) => event.committed_at);
          row.sync_tombstone_ids = tombstones;
          row.sync_tombstone_expires_ats = tombstoneExpiresAts;
          row.source_expires_at = sourceExpiresAt;
          row.expires_at = sourceExpiresAt;
        }
      }
      return {
        target_id: targetId,
        target_version: targetVersion,
        sync_after_sequence: after,
        sync_high_water: pageHigh,
        sync_replay_floor: this.syncFloor,
        sync_result_kind: cursorGone ? "cursor_gone" : "event_batch",
        sync_event_ids: page.map((event) => event.event_id),
        sync_event_sequences: page.map((event) => event.sequence),
        sync_event_kinds: page.map((event) => event.event_kind),
        sync_object_ids: page.map((event) => event.object_id),
        sync_object_versions: page.map((event) => event.object_version),
        sync_event_hashes: page.map((event) => event.event_hash),
        sync_event_committed_ats: page.map((event) => event.committed_at),
        sync_tombstone_ids: tombstones,
        sync_tombstone_expires_ats: tombstoneExpiresAts,
        source_expires_at: sourceExpiresAt,
      };
    }
    if (action === "room_operator.pull") {
      if (domain.pullState === "accepted" && domain.pullBodyReadable
        && domain.pullRequestCiphertext !== null
        && Date.parse(domain.pullExpiresAt) > Date.parse(NOW)) {
        domain.pullState = "seen_locally";
        domain.pullVersion += 1;
        return {
          target_id: IDS.interaction,
          target_version: domain.pullVersion,
          pull_outcome: "body",
          terminal_state: null,
          request_ciphertext: domain.pullRequestCiphertext,
          guest_capsule_ciphertext: domain.pullGuestCiphertext,
          request_hash: domain.pullHash,
          guest_capsule_hash: domain.pullGuestHash,
          request_plaintext_bytes: 12,
          guest_capsule_plaintext_bytes: domain.pullGuestCiphertext === null ? null : 12,
          request_field_version: domain.pullRequestFieldVersion,
          guest_capsule_field_version: domain.pullGuestFieldVersion,
          body_expires_at: domain.pullExpiresAt,
          origin_projection_id: domain.pullProjectionId,
          origin_projection_payload_hash: domain.pullOriginProjectionHash,
          interaction_type: domain.pullInteractionType,
          consent_hash: domain.pullConsentHash,
          interaction_state: "seen_locally",
          created_at: domain.pullAcceptedAt,
          local_purge_received_at: domain.localPurgeReceivedAt,
          source_expires_at: domain.pullExpiresAt,
        };
      }
      if (["interaction_deleted", "origin_revoked", "interaction_expired"].includes(domain.pullState)) {
        return {
          target_id: IDS.interaction,
          target_version: domain.pullVersion,
          pull_outcome: "terminal",
          terminal_state: domain.pullState,
          request_ciphertext: null,
          guest_capsule_ciphertext: null,
          request_hash: domain.pullHash,
          guest_capsule_hash: domain.pullGuestHash,
          request_plaintext_bytes: 12,
          guest_capsule_plaintext_bytes: domain.pullGuestCiphertext === null ? null : 12,
          request_field_version: domain.pullRequestFieldVersion,
          guest_capsule_field_version: domain.pullGuestFieldVersion,
          body_expires_at: domain.pullExpiresAt,
          origin_projection_id: domain.pullProjectionId,
          origin_projection_payload_hash: domain.pullOriginProjectionHash,
          interaction_type: domain.pullInteractionType,
          consent_hash: domain.pullConsentHash,
          interaction_state: domain.pullState,
          created_at: domain.pullAcceptedAt,
          local_purge_received_at: domain.localPurgeReceivedAt,
          source_expires_at: domain.pullTombstoneExpiresAt,
        };
      }
      if (Date.parse(domain.pullExpiresAt) <= Date.parse(NOW)) {
        domain.pullState = "interaction_expired";
        domain.pullBodyReadable = false;
        domain.pullRequestCiphertext = null;
        domain.pullGuestCiphertext = null;
        domain.pullVersion += 1;
        return {
          target_id: IDS.interaction,
          target_version: domain.pullVersion,
          pull_outcome: "terminal",
          terminal_state: "interaction_expired",
          request_ciphertext: null,
          guest_capsule_ciphertext: null,
          request_hash: domain.pullHash,
          guest_capsule_hash: domain.pullGuestHash,
          request_plaintext_bytes: 12,
          guest_capsule_plaintext_bytes: domain.pullGuestCiphertext === null ? null : 12,
          request_field_version: domain.pullRequestFieldVersion,
          guest_capsule_field_version: domain.pullGuestFieldVersion,
          body_expires_at: domain.pullExpiresAt,
          origin_projection_id: domain.pullProjectionId,
          origin_projection_payload_hash: domain.pullOriginProjectionHash,
          interaction_type: domain.pullInteractionType,
          consent_hash: domain.pullConsentHash,
          interaction_state: "interaction_expired",
          created_at: domain.pullAcceptedAt,
          local_purge_received_at: domain.localPurgeReceivedAt,
          source_expires_at: domain.pullTombstoneExpiresAt,
        };
      }
      return null;
    }
    if (action === "room_operator.local_purge.receipt") {
      if (domain.localPurgeReceivedAt !== null) return null;
      domain.localPurgeReceivedAt = NOW;
      domain.pullVersion += 1;
      return { target_id: IDS.interaction, target_version: domain.pullVersion };
    }
    if (action === "room.pair.exchange") return {
      target_id: targetId,
      target_version: targetVersion,
      binding_id: IDS.binding,
      exchange_envelope_ciphertext: this.exchangeEnvelopeCiphertext,
      expires_at: PAIR_EXPIRES,
    };
    if (action === "room.pair") return {
      target_id: targetId,
      target_version: targetVersion,
      pairing_code_ciphertext: this.pairingCodeCiphertext,
      expires_at: PAIR_EXPIRES,
    };
    return { target_id: targetId, target_version: targetVersion };
  }

  #rowFor(
    statement: PublicCoreCanonicalSqlStatementV1,
    overrides: Readonly<Record<string, unknown>> = {},
  ): Readonly<Record<string, unknown>> {
    return Object.freeze(Object.fromEntries(
      statement.rowKeys.map((key) => [key, Object.hasOwn(overrides, key) ? overrides[key] : null]),
    ));
  }

  #readRow(action: (typeof PUBLIC_CORE_ACTION_NAMES)[number] | "retention.janitor"): PublicCoreSqlQueryResultV1 {
    if (action === "third_place.list") return { rowCount: 1, rows: [{
      third_place_id: "thirdplace_forme_public_core_v1",
      room_id: IDS.room,
      projection_id: IDS.projection,
      capsule_ciphertext: encrypted("projections", "capsule_ciphertext", IDS.projection).envelope,
      capsule_plaintext_bytes: 12,
      capsule_field_version: 1,
      payload_hash: sha("7"),
      lifecycle_version: 1,
      fresh_until: FRESH_UNTIL,
      expires_at: PROJECTION_EXPIRES,
    }] };
    if (action === "projection.read") return { rowCount: 0, rows: [] };
    if (action === "interaction.read") return { rowCount: 0, rows: [] };
    if (action === "room_operator.status") return { rowCount: 0, rows: [] };
    return { rowCount: 0, rows: [] };
  }
}

async function executeAction(
  store: PublicCorePostgresStoreV1,
  action: PublicCoreSqlMutationActionV1,
  contextValue = context(action),
  inputValue = inputFor(action),
) {
  const methodName = PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION[action] as keyof PublicCorePostgresStoreV1;
  const method = store[methodName] as unknown as (
    current: PublicCoreSqlMutationContextV1,
    input: object,
  ) => Promise<unknown>;
  return await method.call(store, contextValue, inputValue);
}

function isBoundaryError(error: unknown): boolean {
  return error instanceof PublicCorePostgresError
    && error.code === "sql_executor_boundary_failed"
    && !/INJECTED|PRIVATE_CANARY/u.test(error.message);
}

function isClosedPostgresError(code: string): (error: unknown) => boolean {
  return (error: unknown): boolean => error instanceof PublicCorePostgresError
    && error.code === code
    && error.message === code
    && !/INJECTED|PRIVATE_CANARY|SECRET/u.test(error.message);
}

type UnsafePortWork = (transaction: unknown) => Promise<unknown>;

function injectedPort(
  transaction: (options: unknown, work: UnsafePortWork) => Promise<unknown>,
): PublicCoreSqlExecutorV1 {
  return { transaction } as unknown as PublicCoreSqlExecutorV1;
}

function thirdPlacePortRow(): Record<string, unknown> {
  return {
    third_place_id: "thirdplace_forme_public_core_v1",
    room_id: IDS.room,
    projection_id: IDS.projection,
    capsule_ciphertext: encrypted("projections", "capsule_ciphertext", IDS.projection).envelope,
    capsule_plaintext_bytes: 12,
    capsule_field_version: 1,
    payload_hash: sha("7"),
    lifecycle_version: 1,
    fresh_until: FRESH_UNTIL,
    expires_at: PROJECTION_EXPIRES,
  };
}

function transactionReturning(result: unknown): unknown {
  return Object.freeze({
    query: async (): Promise<unknown> => result,
  });
}

async function listWithPort(executor: PublicCoreSqlExecutorV1) {
  return await new PublicCorePostgresStoreV1(executor).listThirdPlace({
    roomId: IDS.room,
    requestedAt: NOW,
  });
}

test("PostgreSQL construction keeps the exact 20-action / 14-table boundary", () => {
  assert.equal(PUBLIC_CORE_SQL_READ_ACTIONS.length, 4);
  assert.equal(PUBLIC_CORE_SQL_MUTATION_ACTIONS.length, 16);
  assert.deepEqual(
    [...PUBLIC_CORE_SQL_READ_ACTIONS, ...PUBLIC_CORE_SQL_MUTATION_ACTIONS].sort(),
    [...PUBLIC_CORE_ACTION_NAMES].sort(),
  );
  assert.deepEqual(Object.keys(PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION).sort(), [...PUBLIC_CORE_ACTION_NAMES].sort());
  assert.equal(new Set(Object.values(PUBLIC_CORE_SQL_STORE_METHOD_BY_ACTION)).size, 20);
  assert.deepEqual(PUBLIC_CORE_POSTGRES_CONSTRUCTION, {
    schemaVersion: "r4.public-core-postgres-construction.v1",
    driver: null,
    pool: null,
    dsn: null,
    migrationExecuted: false,
    databaseProcesses: 0,
    networkCalls: 0,
    trafficReady: false,
    gateCReady: false,
  });
  const tables = [...SCHEMA.matchAll(/CREATE TABLE forme_r4_public_core\.([a-z_]+)/gu)]
    .map((match) => match[1]);
  assert.equal(tables.length, 14);
  assert.deepEqual([...tables].sort(), [...PUBLIC_CORE_SQL_TABLES].sort());
});

test("no exported entry accepts a caller plan, statement list, or SQL string", () => {
  for (const forbidden of [
    "PUBLIC_CORE_SQL_PLAN_BUILDERS",
    "executePublicCoreSqlPlanWithInjectedExecutor",
    "buildEncryptionNonceReservationStatement",
  ]) assert.equal(forbidden in postgresModule, false, forbidden);
  assert.doesNotMatch(ADAPTER, /export (?:async )?function .*\b(?:plan|sql|statement).*\(/iu);
  assert.doesNotMatch(ADAPTER, /executeTransaction\(plan|callerSql|arbitrarySql|queryText/iu);
  assert.match(ADAPTER, /const SQL_STATEMENT_BRAND: unique symbol/u);
  assert.match(ADAPTER, /CANONICAL_STATEMENTS\.has/u);
});

test("executor membrane requires one active callback and its exact private result", async () => {
  const validResult = { rowCount: 1, rows: [thirdPlacePortRow()] };
  const transaction = transactionReturning(validResult);

  await assert.rejects(
    listWithPort(injectedPort(async () => Object.freeze({ ignored: true }))),
    isClosedPostgresError("sql_executor_protocol_violation"),
  );

  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => {
      const exact = await work(transaction);
      return { ...(exact as object) };
    })),
    isClosedPostgresError("sql_executor_protocol_violation"),
  );

  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => {
      const exact = await work(transaction);
      try {
        await work(transaction);
      } catch {
        // The hostile port may swallow the second-call failure; the membrane's
        // final attempt count must still reject the whole transaction.
      }
      return exact;
    })),
    isClosedPostgresError("sql_executor_protocol_violation"),
  );

  let late: UnsafePortWork | null = null;
  let queryCalls = 0;
  const lateTransaction = Object.freeze({
    query: async (): Promise<unknown> => {
      queryCalls += 1;
      return validResult;
    },
  });
  const result = await listWithPort(injectedPort(async (_options, work) => {
    late = work;
    return await work(lateTransaction);
  }));
  assert.equal(result.rows.length, 1);
  assert.equal(queryCalls, 1);
  assert.ok(late !== null);
  await assert.rejects(
    (late as UnsafePortWork)(lateTransaction),
    isClosedPostgresError("sql_executor_protocol_violation"),
  );
  assert.equal(queryCalls, 1, "late callback must fail before any query or state effect");
});

test("executor membrane sanitizes hostile port, transaction, query and row objects", async () => {
  for (const thrown of [
    new Error("PRIVATE_CANARY_SECRET"),
    new PublicCorePostgresError(418, "PRIVATE_CANARY_SECRET"),
  ]) {
    await assert.rejects(
      listWithPort(injectedPort(async () => { throw thrown; })),
      isBoundaryError,
    );
  }

  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => await work(Object.freeze({
      query: async (): Promise<never> => { throw new Error("PRIVATE_CANARY_SECRET"); },
    })))),
    isBoundaryError,
  );

  let rethrownLocalError: unknown;
  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => {
      try {
        return await work(Object.freeze({
          query: async (): Promise<never> => { throw new Error("PRIVATE_CANARY_SECRET"); },
        }));
      } catch (error) {
        rethrownLocalError = error;
        assert.equal(Reflect.set(error as object, "status", 599), false);
        assert.equal(Reflect.set(error as object, "code", "mutated_canary"), false);
        throw error;
      }
    })),
    (error: unknown): boolean => isBoundaryError(error)
      && Object.isFrozen(error)
      && (error as PublicCorePostgresError).status === 503,
  );
  assert.equal(Object.isFrozen(rethrownLocalError), true);

  const getterTransaction = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(getterTransaction, "query", {
    enumerable: true,
    get(): never { throw new Error("PRIVATE_CANARY_SECRET"); },
  });
  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => await work(getterTransaction))),
    isClosedPostgresError("sql_executor_protocol_violation"),
  );

  const baseRow = thirdPlacePortRow();
  const rowWithGetter = { ...baseRow };
  Object.defineProperty(rowWithGetter, "payload_hash", {
    enumerable: true,
    get(): never { throw new Error("PRIVATE_CANARY_SECRET"); },
  });
  const rowProxy = new Proxy({ ...baseRow }, {
    ownKeys(): never { throw new Error("PRIVATE_CANARY_SECRET"); },
  });
  const outerGetter = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(outerGetter, "rowCount", { enumerable: true, value: 1 });
  Object.defineProperty(outerGetter, "rows", {
    enumerable: true,
    get(): never { throw new Error("PRIVATE_CANARY_SECRET"); },
  });
  const arrayWithExtraNumericKey = [baseRow];
  Object.defineProperty(arrayWithExtraNumericKey, "01", { enumerable: true, value: baseRow });
  const arrayWithSymbol = [baseRow];
  Object.defineProperty(arrayWithSymbol, Symbol("PRIVATE_CANARY_SECRET"), {
    enumerable: true,
    value: true,
  });
  const malformedResults: readonly unknown[] = [
    { rowCount: 1, rows: [baseRow], privateCanary: "SECRET" },
    { rowCount: 2, rows: [baseRow] },
    { rowCount: 1, rows: [{ ...baseRow, private_canary: "SECRET" }] },
    { rowCount: 1, rows: [rowWithGetter] },
    { rowCount: 1, rows: [rowProxy] },
    { rowCount: 1, rows: arrayWithExtraNumericKey },
    { rowCount: 1, rows: arrayWithSymbol },
    outerGetter,
    new Proxy({ rowCount: 1, rows: [baseRow] }, {
      ownKeys(): never { throw new Error("PRIVATE_CANARY_SECRET"); },
    }),
  ];
  for (const malformed of malformedResults) {
    await assert.rejects(
      listWithPort(injectedPort(async (_options, work) =>
        await work(transactionReturning(malformed)))),
      isClosedPostgresError("sql_executor_result_invalid"),
    );
  }
});

test("executor rows are owned snapshots and ciphertext envelopes are exact seven-key values", async () => {
  const mutable = thirdPlacePortRow();
  const listed = await listWithPort(injectedPort(async (_options, work) =>
    await work(transactionReturning({ rowCount: 1, rows: [mutable] }))));
  mutable.payload_hash = sha("e");
  assert.equal((listed.rows[0] as { payloadHash?: string } | undefined)?.payloadHash, sha("7"));
  assert.equal(Object.isFrozen(listed.rows), true);
  assert.equal(Object.isFrozen(listed.rows[0]), true);

  await assert.rejects(
    listWithPort(injectedPort(async (_options, work) => await work(transactionReturning({
      rowCount: 1,
      rows: [{ ...thirdPlacePortRow(), room_id: `room_${"w".repeat(24)}` }],
    })))),
    isClosedPostgresError("sql_read_result_invalid"),
  );

  const malformedEnvelope = {
    ...encrypted("projections", "capsule_ciphertext", IDS.projection).envelope,
    privateCanary: "SECRET",
  };
  const projectionRow = {
    projection_id: IDS.projection,
    room_id: IDS.room,
    capsule_ciphertext: malformedEnvelope,
    capsule_plaintext_bytes: 12,
    capsule_field_version: 1,
    payload_hash: sha("7"),
    owner_state: "published_fresh",
    curation_state: "admitted",
    interaction_mode: "public_single",
    current: true,
    body_readable: true,
    lifecycle_version: 1,
    published_at: NOW,
    fresh_until: FRESH_UNTIL,
    expires_at: PROJECTION_EXPIRES,
  };
  const port = injectedPort(async (_options, work) => await work(transactionReturning({
    rowCount: 1,
    rows: [projectionRow],
  })));
  await assert.rejects(
    new PublicCorePostgresStoreV1(port).readProjection({
      roomId: IDS.room,
      projectionId: IDS.projection,
      requestedAt: NOW,
    }),
    isClosedPostgresError("sql_ciphertext_result_invalid"),
  );
});

test("public input membrane owns descriptors before validation and closes accessor or Proxy faults", async () => {
  const authorityExecutor = new ExecutingFakeSqlExecutor();
  const hostileAuthority = { ...context("curation.admit") } as Record<string, unknown>;
  let actionGetterCalls = 0;
  Object.defineProperty(hostileAuthority, "action", {
    enumerable: true,
    configurable: true,
    get(): string {
      actionGetterCalls += 1;
      return actionGetterCalls === 1 ? "curation.admit" : "curation.unlist";
    },
  });
  await assert.rejects(
    executeAction(
      new PublicCorePostgresStoreV1(authorityExecutor),
      "curation.admit",
      hostileAuthority as unknown as PublicCoreSqlMutationContextV1,
    ),
    (error: unknown): boolean => error instanceof PublicCorePostgresError
      && error.status === 400
      && error.code === "sql_input_invalid"
      && error.message === "sql_input_invalid",
  );
  assert.equal(actionGetterCalls, 0, "descriptor snapshot must never invoke authority accessors");
  assert.equal(authorityExecutor.trace.length, 0);
  assert.equal(authorityExecutor.effects.get("curation.admit") ?? 0, 0);
  assert.equal(authorityExecutor.effects.get("curation.unlist") ?? 0, 0);

  for (const invoke of [
    async (executor: ExecutingFakeSqlExecutor): Promise<unknown> => await executeAction(
      new PublicCorePostgresStoreV1(executor),
      "curation.admit",
      context("curation.admit"),
      new Proxy(inputFor("curation.admit"), {
        ownKeys(): never { throw new Error("PRIVATE_INPUT_PROXY_CANARY"); },
      }),
    ),
    async (executor: ExecutingFakeSqlExecutor): Promise<unknown> => await new PublicCorePostgresStoreV1(executor)
      .listThirdPlace(new Proxy({ roomId: IDS.room, requestedAt: NOW }, {
        ownKeys(): never { throw new Error("PRIVATE_READ_PROXY_CANARY"); },
      })),
    async (executor: ExecutingFakeSqlExecutor): Promise<unknown> => await new PublicCorePostgresStoreV1(executor)
      .runRetentionJanitor(new Proxy({ requestedAt: NOW, batchSize: 10 }, {
        ownKeys(): never { throw new Error("PRIVATE_JANITOR_PROXY_CANARY"); },
      })),
  ]) {
    const executor = new ExecutingFakeSqlExecutor();
    await assert.rejects(
      invoke(executor),
      (error: unknown): boolean => error instanceof PublicCorePostgresError
        && error.status === 400
        && error.code === "sql_input_invalid"
        && error.message === "sql_input_invalid"
        && !/CANARY/u.test(error.message),
    );
    assert.equal(executor.trace.length, 0, "hostile public input must fail before transaction entry");
  }

  const nestedExecutor = new ExecutingFakeSqlExecutor();
  const roomInput = inputFor("room.create") as Record<string, unknown>;
  const encryptedValue = roomInput.labelCiphertext as PublicCoreSqlEncryptedValueV1;
  const hostileEnvelope = { ...encryptedValue.envelope } as Record<string, unknown>;
  let aadGetterCalls = 0;
  Object.defineProperty(hostileEnvelope, "aadHash", {
    enumerable: true,
    configurable: true,
    get(): string {
      aadGetterCalls += 1;
      return aadGetterCalls === 1 ? encryptedValue.envelope.aadHash : sha("f");
    },
  });
  roomInput.labelCiphertext = { ...encryptedValue, envelope: hostileEnvelope };
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(nestedExecutor), "room.create", context("room.create"), roomInput),
    isClosedPostgresError("sql_input_invalid"),
  );
  assert.equal(aadGetterCalls, 0, "nested ciphertext accessors must never run");
  assert.equal(nestedExecutor.trace.length, 0);
});

test("encrypted inputs enforce the exact per-column ceilings and canonical envelope bytes before effects", async () => {
  assert.deepEqual(PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS, {
    "rooms.label_ciphertext": 1_024,
    "projections.capsule_ciphertext": 131_072,
    "pairing_challenges.pairing_code_ciphertext": 4_096,
    "pairing_challenges.exchange_envelope_ciphertext": 32_768,
    "interactions.request_ciphertext": 32_768,
    "interactions.guest_capsule_ciphertext": 4_096,
  });
  for (const boundary of [
    "label_plaintext_bytes BETWEEN 1 AND 1024",
    "capsule_plaintext_bytes BETWEEN 1 AND 131072",
    "pairing_code_plaintext_bytes BETWEEN 1 AND 4096",
    "exchange_envelope_plaintext_bytes BETWEEN 1 AND 32768",
    "request_plaintext_bytes BETWEEN 1 AND 32768",
    "guest_capsule_plaintext_bytes BETWEEN 1 AND 4096",
  ]) assert.match(SCHEMA, new RegExp(boundary, "u"));
  const ceilingCases = [
    ["room.create", "labelCiphertext", "rooms.label_ciphertext"],
    ["room_operator.projection.deliver", "capsuleCiphertext", "projections.capsule_ciphertext"],
    ["room.pair", "pairingCodeCiphertext", "pairing_challenges.pairing_code_ciphertext"],
    ["room.pair.exchange", "exchangeEnvelopeCiphertext", "pairing_challenges.exchange_envelope_ciphertext"],
    ["interaction.create", "requestCiphertext", "interactions.request_ciphertext"],
    ["interaction.create", "guestCapsuleCiphertext", "interactions.guest_capsule_ciphertext"],
  ] as const;
  for (const [action, inputKey, ceilingKey] of ceilingCases) {
    const input = { ...inputFor(action) } as Record<string, unknown>;
    const value = input[inputKey] as PublicCoreSqlEncryptedValueV1;
    input[inputKey] = encryptedWithBytes(value, PUBLIC_CORE_SQL_PLAINTEXT_BYTE_CEILINGS[ceilingKey] + 1);
    const executor = new ExecutingFakeSqlExecutor();
    await assert.rejects(
      executeAction(new PublicCorePostgresStoreV1(executor), action, context(action), input),
      isClosedPostgresError("encrypted_plaintext_size_invalid"),
      `${action}:${inputKey}`,
    );
    assert.equal(executor.trace.length, 0, `${action}:${inputKey}`);
  }

  const valid = (inputFor("room.create") as { labelCiphertext: PublicCoreSqlEncryptedValueV1 })
    .labelCiphertext;
  const malformedEnvelopes = [
    { ...valid.envelope, keyVersion: "keyv_NOT_CANONICAL" },
    { ...valid.envelope, nonce: `${valid.envelope.nonce}=` },
    { ...valid.envelope, tag: Buffer.alloc(15, 7).toString("base64url") },
    { ...valid.envelope, ciphertext: Buffer.alloc(11, 9).toString("base64url") },
  ];
  for (const envelope of malformedEnvelopes) {
    const input = { ...inputFor("room.create"), labelCiphertext: { ...valid, envelope } };
    const executor = new ExecutingFakeSqlExecutor();
    await assert.rejects(
      executeAction(new PublicCorePostgresStoreV1(executor), "room.create", context("room.create"), input),
      (error: unknown): boolean => error instanceof PublicCorePostgresError
        && error.status === 400
        && ["encrypted_envelope_invalid", "encrypted_nonce_invalid", "encrypted_tag_invalid",
          "encrypted_ciphertext_invalid"].includes(error.code),
    );
    assert.equal(executor.trace.length, 0);
  }
});

test("action inputs reject swapped identifier kinds, noncanonical instants, and lifecycle drift pre-transaction", async () => {
  const identifierCases = [
    ["room.create", "entityId"], ["room.create", "eventId"],
    ["public_encounter.issue", "projectionId"], ["public_encounter.issue", "encounterId"],
    ["public_encounter.issue", "hourlyRateEventId"], ["public_encounter.issue", "dailyRateEventId"],
    ["interaction.create", "interactionId"], ["interaction.create", "acceptRateEventId"],
    ["interaction.delete", "interactionPurgeJobId"], ["room.pair", "pairingId"],
    ["room.binding.revoke", "bindingId"], ["room_operator.projection.deliver", "publicationApprovalId"],
    ["room_operator.ack", "ackId"],
  ] as const;
  for (const [action, field] of identifierCases) {
    const input = { ...inputFor(action), [field]: IDS.room };
    const executor = new ExecutingFakeSqlExecutor();
    await assert.rejects(
      executeAction(new PublicCorePostgresStoreV1(executor), action, context(action), input),
      (error: unknown): boolean => error instanceof PublicCorePostgresError && error.status === 400,
      `${action}:${field}`,
    );
    assert.equal(executor.trace.length, 0, `${action}:${field}`);
  }

  const badContext = { ...context("curation.admit"), requestedAt: "2026-08-10T12:00:00Z" };
  const badContextExecutor = new ExecutingFakeSqlExecutor();
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(badContextExecutor), "curation.admit", badContext),
    isClosedPostgresError("requested_at_invalid"),
  );
  assert.equal(badContextExecutor.trace.length, 0);

  const chronologyCases = [
    ["room.pair", { pairingExpiresAt: "2026-08-10T12:10:00.001Z" }],
    ["room.pair.exchange", { bindingExpiresAt: "2026-09-09T12:00:00.001Z" }],
    ["interaction.create", { bodyExpiresAt: "2026-09-09T12:00:00.001Z" }],
    ["public_encounter.issue", { encounterExpiresAt: "2026-08-11T12:00:00.001Z" }],
    ["room_operator.projection.deliver", { freshUntil: NOW }],
  ] as const;
  for (const [action, drift] of chronologyCases) {
    const executor = new ExecutingFakeSqlExecutor();
    await assert.rejects(
      executeAction(
        new PublicCorePostgresStoreV1(executor), action, context(action),
        { ...inputFor(action), ...drift },
      ),
      isClosedPostgresError("action_chronology_invalid"),
      action,
    );
    assert.equal(executor.trace.length, 0, action);
  }
});

test("action results bind the exact requested target identity and version", async () => {
  const wrongTarget = new ExecutingFakeSqlExecutor();
  wrongTarget.domainTargetOverride = `room_${"x".repeat(24)}`;
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(wrongTarget), "room.mode.set"),
    isClosedPostgresError("sql_result_identity_invalid"),
  );
  assert.equal(wrongTarget.receipts.size, 0);
  assert.equal(wrongTarget.effects.get("room.mode.set") ?? 0, 0);

  const wrongVersion = new ExecutingFakeSqlExecutor();
  wrongVersion.domainVersionOverride = 99;
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(wrongVersion), "room.mode.set"),
    isClosedPostgresError("sql_result_version_invalid"),
  );
  assert.equal(wrongVersion.receipts.size, 0);
  assert.equal(wrongVersion.effects.get("room.mode.set") ?? 0, 0);
});

test("schema closes Room lineage, receipt shape, ciphertext, nonce, rate and retention invariants", () => {
  assert.deepEqual(PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES, {
    rooms: ["label_ciphertext"],
    projections: ["capsule_ciphertext"],
    pairing_challenges: ["pairing_code_ciphertext", "exchange_envelope_ciphertext"],
    interactions: ["request_ciphertext", "guest_capsule_ciphertext"],
  });
  for (const token of [
    "fk_projections__room", "fk_pairing_challenges__room", "fk_room_bindings__room",
    "fk_public_encounters__projection", "fk_interactions__origin_projection",
    "fk_public_encounters__hourly_rate", "fk_public_encounters__daily_rate",
    "fk_public_encounters__consumed_interaction", "uq_interactions__consumed_lineage",
    "fk_room_events__room", "fk_event_acks__binding", "fk_event_acks__event",
    "fk_event_acks__room", "fk_purge_jobs__room", "uq_rooms__singleton",
    "uq_projections__one_current", "ck_mutation_receipts__closed_shape",
    "related_target_id", "'pairing_issue'", "pk_encryption_nonces",
    "uq_encryption_nonces__field", "octet_length(nonce) = 12",
  ]) assert.match(SCHEMA, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), token);
  assert.match(SCHEMA, /body_readable AND capsule_ciphertext IS NOT NULL/u);
  assert.match(SCHEMA, /FOREIGN KEY \(consumed_interaction_id, encounter_id, room_id, projection_id\)[\s\S]*REFERENCES forme_r4_public_core\.interactions \([\s\S]*interaction_id, encounter_id, room_id, origin_projection_id/u);
  assert.equal((SCHEMA.match(/- ARRAY\[/gu) ?? []).length, 6);
  assert.equal((SCHEMA.match(/\?& ARRAY\[/gu) ?? []).length, 6);
  assert.match(SCHEMA, /interaction_mode text NOT NULL DEFAULT 'closed'/u);
  assert.match(SCHEMA, /closed_at timestamptz\(3\) NULL DEFAULT transaction_timestamp\(\)/u);
  assert.match(SCHEMA, /local_purge_received_at timestamptz\(3\) NULL/u);
  assert.match(SCHEMA, /actor_class IN \('public', 'guest_capability', 'controller', 'curator', 'room_operator'\)/u);
  assert.match(SCHEMA, /actor_scope_digest ~ '\^hmac-sha256:/u);
  for (const boundary of [
    "event_ordinal BETWEEN 1 AND 10", "event_ordinal BETWEEN 1 AND 50",
    "event_ordinal BETWEEN 1 AND 3", "interval '10 minutes'", "interval '24 hours'",
    "interval '25 hours'", "interval '30 days'", "interval '37 days'",
  ]) assert.match(SCHEMA, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  for (const kind of [
    "pairing_material", "public_encounter", "projection_body", "interaction_body",
    "rate_event", "room_event", "mutation_receipt", "interaction_tombstone",
  ]) assert.match(SCHEMA, new RegExp(`'${kind}'`, "u"));
  const receipts = SCHEMA.match(/CREATE TABLE forme_r4_public_core\.mutation_receipts[\s\S]*?\n\);/u)?.[0] ?? "";
  assert.doesNotMatch(receipts, /\b(?:jsonb|bytea|ciphertext|request_body|result_body)\b/iu);
  const committedShape = receipts.slice(
    receipts.indexOf("CONSTRAINT ck_mutation_receipts__terminal"),
    receipts.indexOf("CONSTRAINT ck_mutation_receipts__result_contract"),
  );
  assert.match(committedShape, /http_status IS NOT NULL AND result_code IS NOT NULL/u);
  assert.match(committedShape, /\) IS TRUE\)/u);
  const pullRecovery = receipts.slice(
    receipts.indexOf("CONSTRAINT ck_mutation_receipts__pull_recovery"),
    receipts.indexOf("CONSTRAINT ck_mutation_receipts__pull_terminal"),
  );
  for (const required of [
    "pull_interaction_id", "pull_request_field_version", "pull_body_hash", "pull_body_expires_at",
    "pull_guest_field_version", "pull_guest_hash",
  ]) assert.match(pullRecovery, new RegExp(`${required} IS NOT NULL`, "u"), required);
  assert.match(pullRecovery, /\) IS TRUE\)/u);
  assert.match(receipts, /sync_tombstone_expires_ats text\[\] NULL/u);
  assert.match(receipts, /cardinality\(sync_tombstone_ids\) = cardinality\(sync_tombstone_expires_ats\)/u);
});

test("read methods execute fixed bound SQL and return only exact owned fields", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const result = await store.listThirdPlace({ roomId: IDS.room, requestedAt: NOW });
  assert.equal(result.action, "third_place.list");
  assert.equal(result.rows.length, 1);
  assert.equal("forbidden_extra" in (result.rows[0] ?? {}), false);
  assert.equal(executor.trace.length, 1);
  assert.equal(executor.trace[0]?.phase, "read");
  assert.equal(executor.trace[0]?.values[0], IDS.room);
  assert.equal(executor.trace[0]?.values[1], NOW);
});

test("all 16 named mutations bind values and execute reserve, ordered locks, domain, event and receipt", async () => {
  for (const action of PUBLIC_CORE_SQL_MUTATION_ACTIONS) {
    const executor = new ExecutingFakeSqlExecutor();
    const store = new PublicCorePostgresStoreV1(executor);
    const result = await executeAction(store, action);
    assert.ok(result !== null, action);
    assert.equal(executor.effects.get(action), 1, action);
    assert.equal(executor.trace[0]?.phase, "receipt_reserve", action);
    assert.equal(executor.trace.filter((entry) => entry.phase === "domain_write").length, 1, action);
    assert.equal(executor.trace.filter((entry) => entry.phase === "receipt_finalize").length, 1, action);
    const locks = executor.trace.filter((entry) => entry.phase === "lock");
    const lockIndexes = locks.map((entry) => PUBLIC_CORE_SQL_LOCK_ORDER.indexOf(entry.lockClass!));
    assert.ok(lockIndexes.every((value, index) => index === 0 || value > (lockIndexes[index - 1] ?? -1)), action);
    for (const statement of executor.trace) {
      const placeholders = [...statement.text.matchAll(/\$(\d+)/gu)].map((match) => Number(match[1]));
      assert.equal(placeholders.length === 0 ? 0 : Math.max(...placeholders), statement.values.length, statement.statementId);
      assert.ok(statement.values.every((value) => value !== undefined), statement.statementId);
      assert.doesNotMatch(statement.text, /;/u, statement.statementId);
      assert.doesNotMatch(statement.text, /\b(?:COPY|ALTER SYSTEM|CREATE EXTENSION|dblink|postgres_fdw)\b/iu);
    }
  }
});

test("event hashes are derived after the database sequence allocation and forged append rows roll back", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  executor.allocatedEventSequence = 7;
  const suppliedHash = sha("f");
  await executeAction(
    new PublicCorePostgresStoreV1(executor),
    "room.mode.set",
    context("room.mode.set"),
    { ...inputFor("room.mode.set"), eventHash: suppliedHash },
  );
  const append = executor.trace.find((statement) => statement.statementId === "room.mode.set.event.append");
  assert.ok(append);
  const expectedHash = canonicalSha256({
    schemaVersion: "r4_public_core_room_event.v1",
    eventId: IDS.event,
    roomId: IDS.room,
    sequence: 7,
    action: "room.mode.set",
    targetKind: "room",
    targetId: IDS.room,
    targetVersion: 2,
    committedAt: NOW,
    bodyAvailable: true,
  });
  assert.equal(append.values[3], 7);
  assert.equal(append.values[7], expectedHash);
  assert.notEqual(append.values[7], suppliedHash, "caller eventHash is not authority");

  const forged = new ExecutingFakeSqlExecutor();
  forged.eventHashOverride = sha("e");
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(forged), "room.mode.set"),
    isClosedPostgresError("sql_event_append_result_invalid"),
  );
  assert.equal(forged.receipts.size, 0);
  assert.equal(forged.effects.get("room.mode.set") ?? 0, 0);
  assert.equal(forged.events.get("room.mode.set") ?? 0, 0);
});

test("fixed SQL expresses rates, pool, destructive nulling, mode-close health rule and old-current delivery locks", async () => {
  const traces = new Map<PublicCoreSqlMutationActionV1, readonly PublicCoreCanonicalSqlStatementV1[]>();
  for (const action of PUBLIC_CORE_SQL_MUTATION_ACTIONS) {
    const executor = new ExecutingFakeSqlExecutor();
    await executeAction(new PublicCorePostgresStoreV1(executor), action);
    traces.set(action, [...executor.trace]);
  }
  const domain = (action: PublicCoreSqlMutationActionV1) =>
    traces.get(action)?.find((statement) => statement.phase === "domain_write")?.text ?? "";
  assert.match(domain("public_encounter.issue"), /count\(prior\.rate_event_id\)<10/u);
  assert.match(domain("public_encounter.issue"), /count\(prior\.rate_event_id\)<50/u);
  assert.match(domain("interaction.create"), /count\(prior\.rate_event_id\)<3/u);
  assert.match(domain("interaction.create"), /\)<20/u);
  assert.match(domain("interaction.delete"), /request_ciphertext=NULL,guest_capsule_ciphertext=NULL,body_readable=false/u);
  assert.match(domain("room.create"), /interaction_mode,label_ciphertext[\s\S]*SELECT \$1,i\.installation_id,'closed'/u);
  assert.match(domain("room.create"), /,1,\$5,\$5/u);
  assert.equal(
    traces.get("room.create")?.find((statement) => statement.phase === "domain_write")?.values[4],
    NOW,
  );
  assert.match(domain("room.pair.exchange"), /pairing_code_ciphertext=NULL/u);
  assert.match(domain("room.pair.exchange"), /exchange_envelope_ciphertext=\$1/u);
  const modeHealth = traces.get("room.mode.set")?.find((statement) => statement.phase === "precondition")?.text ?? "";
  assert.match(modeHealth, /\$2='closed' AND r\.interaction_mode='public_single'/u);
  assert.doesNotMatch(modeHealth, /\$2='closed' OR/u);
  const deliveryLocks = traces.get("room_operator.projection.deliver")?.filter((statement) =>
    ["projection", "encounter", "interaction"].includes(statement.lockClass ?? ""),
  ) ?? [];
  assert.equal(deliveryLocks.length, 3);
  for (const statement of deliveryLocks) {
    assert.match(statement.text, /current_projection_id/u);
    assert.equal(statement.values.includes(IDS.projection), false, statement.statementId);
  }
  assert.match(domain("room_operator.projection.deliver"), /p\.projection_id=r\.current_projection_id/u);
});

test("bearer and rate HMAC inputs use the fixed 32-byte comparison contract", () => {
  assert.match(ADAPTER, /get_byte\(decode\(substr\([^,]+,13\),'hex'\),byte_index\)/u);
  assert.match(ADAPTER, /generate_series\(0,31\) AS byte_index/u);
  assert.match(ADAPTER, /bit_or\([\s\S]*?# get_byte/u);
  assert.doesNotMatch(
    ADAPTER,
    /(?:reply_secret_digest|delete_secret_digest|encounter_secret_digest|pairing_code_digest|bucket_digest)\s*=\s*\$[0-9]+/u,
  );
  for (const digestColumn of [
    "actor_scope_digest", "credential_digest", "pairing_code_digest", "bucket_digest",
    "encounter_secret_digest", "reply_secret_digest", "delete_secret_digest",
  ]) assert.match(SCHEMA, new RegExp(`${digestColumn}[^\\n]*hmac-sha256|${digestColumn}[\\s\\S]{0,400}hmac-sha256`, "u"));
});

test("nonce registrations are action-pinned and AAD drift fails before transaction", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  await executeAction(new PublicCorePostgresStoreV1(executor), "interaction.create");
  const nonces = executor.trace.filter((statement) => statement.phase === "nonce_reservation");
  assert.equal(nonces.length, 2);
  assert.match(nonces[0]?.text ?? "", /'interactions'.*'request_ciphertext'/su);
  assert.match(nonces[1]?.text ?? "", /'interactions'.*'guest_capsule_ciphertext'/su);
  assert.equal(nonces[0]?.values[2], IDS.interaction);
  assert.match(nonces[0]?.text ?? "", /decode\(\$2,'hex'\)/u);
  assert.equal(typeof nonces[0]?.values[1], "string");
  assert.match(String(nonces[0]?.values[1]), /^[0-9a-f]{24}$/u);
  assert.equal(nonces.flatMap((statement) => [...statement.values]).some(ArrayBuffer.isView), false);
  const retainedNonce = nonces[0]?.values[1];
  await Promise.resolve();
  assert.equal(nonces[0]?.values[1], retainedNonce, "bound nonce is an immutable scalar snapshot");
  const bad = inputFor("room.create") as ReturnType<typeof inputFor> & {
    labelCiphertext: PublicCoreSqlEncryptedValueV1;
  };
  const envelope = bad.labelCiphertext.envelope;
  const drifted = {
    ...bad,
    labelCiphertext: {
      ...bad.labelCiphertext,
      envelope: { ...envelope, aadHash: sha("f") },
    },
  };
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(new ExecutingFakeSqlExecutor()), "room.create", context("room.create"), drifted),
    /encrypted_aad_identity_mismatch/u,
  );
  assert.match(SCHEMA, /request_plaintext_bytes integer NOT NULL/u);
  assert.match(SCHEMA, /pairing_code_plaintext_bytes integer NOT NULL/u);
  const interactionDomain = executor.trace.find((statement) => statement.statementId === "interaction.create.domain_write");
  assert.ok(interactionDomain?.values.includes(12));
});

test("step 0 executes INSERT then SELECT and stops replay/conflict before domain locks", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const first = await executeAction(store, "room.mode.set") as { receiptId: string; recovered: boolean };
  assert.equal(first.receiptId, IDS.receipt);
  assert.equal(first.recovered, false);
  const traceStart = executor.trace.length;
  const changedReceiptContext = context("room.mode.set", { receiptId: IDS.receipt2 });
  const replay = await executeAction(store, "room.mode.set", changedReceiptContext) as {
    receiptId: string;
    recovered: boolean;
  };
  assert.equal(replay.receiptId, IDS.receipt, "stored receipt ID wins over a retry's new ID");
  assert.equal(replay.recovered, true);
  const replayTrace = executor.trace.slice(traceStart);
  assert.deepEqual(replayTrace.map((statement) => statement.phase), ["receipt_reserve", "receipt_lookup"]);
  assert.equal(replayTrace.some((statement) => statement.phase === "lock" || statement.phase === "domain_write"), false);

  const conflictStart = executor.trace.length;
  await assert.rejects(
    executeAction(store, "room.mode.set", context("room.mode.set", {
      receiptId: IDS.receipt2,
      canonicalRequestHash: sha("d"),
    })),
    (error: unknown) => error instanceof PublicCorePostgresError && error.code === "idempotency_conflict",
  );
  const conflictTrace = executor.trace.slice(conflictStart);
  assert.deepEqual(conflictTrace.map((statement) => statement.phase), ["receipt_reserve", "receipt_lookup"]);
});

test("a fresh reservation must echo the exact canonical request clock and 37-day deadline", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  executor.reserveCreatedAtOverride = "2026-08-09T12:00:00.000Z";
  executor.reserveExpiresAtOverride = "2026-09-15T12:00:00.000Z";
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(executor), "curation.admit"),
    isClosedPostgresError("sql_receipt_reservation_invalid"),
  );
  assert.equal(executor.receipts.size, 0);
  assert.equal(executor.effects.get("curation.admit") ?? 0, 0);
});

test("all 16 actions recover a committed lost response without repeating the domain effect", async () => {
  for (const action of PUBLIC_CORE_SQL_MUTATION_ACTIONS) {
    const executor = new ExecutingFakeSqlExecutor();
    executor.loseCommittedResponseOnce = true;
    const store = new PublicCorePostgresStoreV1(executor);
    await assert.rejects(executeAction(store, action), isBoundaryError, action);
    assert.equal(executor.effects.get(action), 1, action);
    const replay = await executeAction(store, action, context(action, { receiptId: IDS.receipt2 })) as {
      recovered: boolean;
      receiptId: string;
    };
    assert.equal(replay.recovered, true, action);
    assert.equal(replay.receiptId, IDS.receipt, action);
    assert.equal(executor.effects.get(action), 1, action);
  }
});

test("pre-commit failures and row-expectation failures roll back receipt and domain state", async () => {
  for (const failure of ["room.create.lock.installation", "room.create.domain_write", "room.create.event.append"] as const) {
    const executor = new ExecutingFakeSqlExecutor();
    executor.failAtStatementId = failure;
    await assert.rejects(
      executeAction(new PublicCorePostgresStoreV1(executor), "room.create"),
      isBoundaryError,
    );
    assert.equal(executor.receipts.size, 0, failure);
    assert.equal(executor.effects.get("room.create") ?? 0, 0, failure);
  }
  const zero = new ExecutingFakeSqlExecutor();
  zero.zeroAtStatementId = "room.create.domain_write";
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(zero), "room.create"),
    (error: unknown) => error instanceof PublicCorePostgresError && error.code === "sql_expected_exactly_one",
  );
  assert.equal(zero.receipts.size, 0);
  assert.equal(zero.effects.get("room.create") ?? 0, 0);
});

test("every mutation rolls back at reservation, precondition, domain, finalize and pre-commit boundaries", async () => {
  for (const action of PUBLIC_CORE_SQL_MUTATION_ACTIONS) {
    for (const statementId of [
      `${action}.receipt.reserve`,
      `${action}.precondition.retention_health`,
      `${action}.domain_write`,
      `${action}.receipt.finalize`,
    ]) {
      const executor = new ExecutingFakeSqlExecutor();
      executor.failAtStatementId = statementId;
      await assert.rejects(
        executeAction(new PublicCorePostgresStoreV1(executor), action),
        isBoundaryError,
      );
      assert.equal(executor.receipts.size, 0, `${action}:${statementId}`);
      assert.equal(executor.effects.get(action) ?? 0, 0, `${action}:${statementId}`);
    }
    const beforeCommit = new ExecutingFakeSqlExecutor();
    beforeCommit.failBeforeCommitOnce = true;
    await assert.rejects(
      executeAction(new PublicCorePostgresStoreV1(beforeCommit), action),
      isBoundaryError,
    );
    assert.equal(beforeCommit.receipts.size, 0, `${action}:before_commit`);
    assert.equal(beforeCommit.effects.get(action) ?? 0, 0, `${action}:before_commit`);
  }
});

test("after-phase failures roll back already-applied receipt, domain and event effects", async () => {
  const bodyFreeEventless = new Set<PublicCoreSqlMutationActionV1>([
    "room_operator.sync", "room_operator.pull", "room_operator.ack",
  ]);
  for (const action of PUBLIC_CORE_SQL_MUTATION_ACTIONS) {
    const phaseStatements = [
      `${action}.receipt.reserve`,
      `${action}.precondition.retention_health`,
      `${action}.domain_write`,
      ...(!bodyFreeEventless.has(action) ? [`${action}.event.append`] : []),
      `${action}.receipt.finalize`,
    ];
    for (const statementId of phaseStatements) {
      const executor = new ExecutingFakeSqlExecutor();
      executor.failAfterStatementId = statementId;
      await assert.rejects(
        executeAction(new PublicCorePostgresStoreV1(executor), action),
        isBoundaryError,
        `${action}:${statementId}`,
      );
      assert.equal(executor.receipts.size, 0, `${action}:${statementId}:receipt`);
      assert.equal(executor.effects.get(action) ?? 0, 0, `${action}:${statementId}:domain`);
      assert.equal(executor.events.get(action) ?? 0, 0, `${action}:${statementId}:event`);
    }
  }
});

test("pair issue and exchange have explicit ciphertext recovery, with expiry/consumption winning", async () => {
  const pairExecutor = new ExecutingFakeSqlExecutor();
  const pairStore = new PublicCorePostgresStoreV1(pairExecutor);
  const issued = await executeAction(pairStore, "room.pair") as {
    kind: string;
    pairingCodeCiphertext: Readonly<Record<string, unknown>>;
    recovered: boolean;
  };
  assert.equal(issued.kind, "pairing_issue");
  assert.deepEqual(
    { ...issued.pairingCodeCiphertext },
    { ...pairExecutor.pairingCodeCiphertext },
  );
  const pairReceipt = [...pairExecutor.receipts.values()][0];
  assert.ok(pairReceipt);
  pairReceipt.source_expires_at = "2026-08-10T12:09:00.000Z";
  pairReceipt.expires_at = "2026-08-10T12:09:00.000Z";
  await assert.rejects(
    executeAction(pairStore, "room.pair", context("room.pair", { receiptId: IDS.receipt2 })),
    isClosedPostgresError("sql_pairing_receipt_expiry_invalid"),
  );
  pairReceipt.source_expires_at = PAIR_EXPIRES;
  pairReceipt.expires_at = PAIR_EXPIRES;
  pairExecutor.pairingState = "exchanged";
  pairExecutor.pairingCodeCiphertext = null;
  const terminal = await executeAction(
    pairStore,
    "room.pair",
    context("room.pair", { receiptId: IDS.receipt2 }),
  ) as { kind: string; status: number; terminalState: string };
  assert.equal(terminal.kind, "terminal_reconciliation");
  assert.equal(terminal.status, 410);
  assert.equal(terminal.terminalState, "exchanged");

  const exchangeExecutor = new ExecutingFakeSqlExecutor();
  const exchanged = await executeAction(
    new PublicCorePostgresStoreV1(exchangeExecutor),
    "room.pair.exchange",
  ) as { kind: string; bindingId: string; exchangeEnvelopeCiphertext: Readonly<Record<string, unknown>> };
  assert.equal(exchanged.kind, "pairing_exchange");
  assert.equal(exchanged.bindingId, IDS.binding);
  assert.deepEqual(
    { ...exchanged.exchangeEnvelopeCiphertext },
    { ...exchangeExecutor.exchangeEnvelopeCiphertext },
  );
  assert.ok(exchangeExecutor.trace.some((statement) => statement.statementId === "room.pair.exchange.recovery.read"));
});

test("pull recovery returns exact stored body version until terminal lifecycle makes it body-free", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const pulled = await executeAction(store, "room_operator.pull") as {
    kind: string;
    interactionVersion: number;
    bodyHash: string;
  };
  assert.equal(pulled.kind, "interaction_pull");
  assert.equal(pulled.interactionVersion, 2);
  assert.equal(pulled.bodyHash, sha("4"));
  executor.pullState = "interaction_deleted";
  executor.pullBodyReadable = false;
  executor.pullRequestCiphertext = null;
  const terminal = await executeAction(
    store,
    "room_operator.pull",
    context("room_operator.pull", { receiptId: IDS.receipt2 }),
  ) as { kind: string; status: number; terminalState: string };
  assert.deepEqual(
    { kind: terminal.kind, status: terminal.status, terminalState: terminal.terminalState },
    { kind: "terminal_reconciliation", status: 410, terminalState: "interaction_deleted" },
  );
});

test("fresh pull is accepted-only while local purge is one-shot and preserves exact same-key replay", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const pulled = await executeAction(store, "room_operator.pull") as {
    requestCiphertext: Readonly<Record<string, unknown>>;
    interactionVersion: number;
  };
  assert.equal(executor.pullState, "seen_locally");
  assert.equal(pulled.interactionVersion, 2);
  const originalCiphertext = { ...pulled.requestCiphertext };

  await assert.rejects(
    executeAction(store, "room_operator.pull", context("room_operator.pull", {
      receiptId: `receipt_${"e".repeat(24)}`,
      idempotencyKey: "idem.room_operator_pull.new_key.0000000000000000",
      expectedVersion: 2,
    })),
    isClosedPostgresError("sql_expected_exactly_one"),
  );
  assert.equal(executor.effects.get("room_operator.pull"), 1);

  const purge = await executeAction(
    store,
    "room_operator.local_purge.receipt",
    context("room_operator.local_purge.receipt", {
      receiptId: `receipt_${"f".repeat(24)}`,
      idempotencyKey: "idem.local_purge.first.0000000000000000",
      expectedVersion: 2,
    }),
  ) as { targetVersion: number };
  assert.equal(purge.targetVersion, 3);
  assert.equal(executor.localPurgeReceivedAt, NOW);
  assert.equal(executor.pullBodyReadable, true, "local receipt is independent of server body retention");
  assert.notEqual(executor.pullRequestCiphertext, null);

  const replay = await executeAction(
    store,
    "room_operator.pull",
    context("room_operator.pull", { receiptId: IDS.receipt2 }),
  ) as {
    recovered: boolean;
    interactionVersion: number;
    requestCiphertext: Readonly<Record<string, unknown>>;
  };
  assert.equal(replay.recovered, true);
  assert.equal(replay.interactionVersion, 2, "receipt version does not follow mutable lifecycle version");
  assert.deepEqual({ ...replay.requestCiphertext }, originalCiphertext);

  await assert.rejects(
    executeAction(store, "room_operator.local_purge.receipt", context(
      "room_operator.local_purge.receipt",
      {
        receiptId: `receipt_${"g".repeat(24)}`,
        idempotencyKey: "idem.local_purge.repeat.0000000000000000",
        expectedVersion: 3,
      },
    )),
    isClosedPostgresError("sql_expected_exactly_one"),
  );
  assert.equal(executor.effects.get("room_operator.local_purge.receipt"), 1);
});

test("fresh terminal pulls commit closed 410 receipts with delete, revoke and expiry precedence", async () => {
  const cases = [
    { state: "interaction_deleted", expiry: "2026-08-09T12:00:00.000Z", terminal: "interaction_deleted" },
    { state: "origin_revoked", expiry: "2026-08-09T12:00:00.000Z", terminal: "origin_revoked" },
    { state: "accepted", expiry: "2026-08-09T12:00:00.000Z", terminal: "interaction_expired" },
  ] as const;
  for (const current of cases) {
    const executor = new ExecutingFakeSqlExecutor();
    executor.pullState = current.state;
    executor.pullExpiresAt = current.expiry;
    if (current.state !== "accepted") {
      executor.pullBodyReadable = false;
      executor.pullRequestCiphertext = null;
      executor.pullGuestCiphertext = null;
    }
    const store = new PublicCorePostgresStoreV1(executor);
    const terminal = await executeAction(store, "room_operator.pull") as {
      kind: string;
      status: number;
      code: string;
      terminalState: string;
      recovered: boolean;
    };
    assert.deepEqual({
      kind: terminal.kind,
      status: terminal.status,
      code: terminal.code,
      terminalState: terminal.terminalState,
      recovered: terminal.recovered,
    }, {
      kind: "terminal_reconciliation",
      status: 410,
      code: "pull_terminal",
      terminalState: current.terminal,
      recovered: false,
    });
    assert.equal("requestCiphertext" in terminal, false);
    assert.equal(executor.events.get("room_operator.pull") ?? 0, 0);
    const receipt = [...executor.receipts.values()][0];
    assert.equal(receipt?.recovery_kind, "pull_terminal");
    assert.equal(receipt?.pull_terminal_state, current.terminal);
    assert.equal(receipt?.http_status, 410);

    const effectsBefore = executor.effects.get("room_operator.pull");
    const replay = await executeAction(
      store,
      "room_operator.pull",
      context("room_operator.pull", { receiptId: IDS.receipt2 }),
    ) as { terminalState: string; recovered: boolean };
    assert.equal(replay.terminalState, current.terminal);
    assert.equal(replay.recovered, true);
    assert.equal(executor.effects.get("room_operator.pull"), effectsBefore);
  }
});

test("terminal pull replay is bound to the exact durable state and tombstone deadline", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  executor.pullState = "interaction_deleted";
  executor.pullBodyReadable = false;
  executor.pullRequestCiphertext = null;
  executor.pullGuestCiphertext = null;
  const store = new PublicCorePostgresStoreV1(executor);
  await executeAction(store, "room_operator.pull");
  assert.ok(executor.trace.some(
    (statement) => statement.statementId === "room_operator.pull.terminal.recovery.read",
  ));

  executor.pullTombstoneExpiresAt = SYNC_CEILING;
  await assert.rejects(
    executeAction(
      store,
      "room_operator.pull",
      context("room_operator.pull", { receiptId: IDS.receipt2 }),
    ),
    isClosedPostgresError("sql_pull_terminal_source_invalid"),
  );
  assert.equal(executor.effects.get("room_operator.pull"), 1);
});

test("pull receipt recovery binds request and guest field versions, hashes and expiry but tolerates lifecycle advance", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  await executeAction(store, "room_operator.pull");

  executor.pullVersion += 1;
  executor.localPurgeReceivedAt = NOW;
  const lifecycleReplay = await executeAction(
    store,
    "room_operator.pull",
    context("room_operator.pull", { receiptId: IDS.receipt2 }),
  ) as { kind: string };
  assert.equal(lifecycleReplay.kind, "interaction_pull");

  for (const mutate of [
    () => { executor.pullRequestFieldVersion += 1; },
    () => { executor.pullHash = sha("d"); },
    () => { executor.pullGuestFieldVersion += 1; },
    () => { executor.pullGuestHash = sha("e"); },
    () => { executor.pullExpiresAt = "2026-09-08T11:59:00.000Z"; },
  ]) {
    executor.pullRequestFieldVersion = 1;
    executor.pullHash = sha("4");
    executor.pullGuestFieldVersion = 1;
    executor.pullGuestHash = sha("d");
    executor.pullExpiresAt = BODY_EXPIRES;
    mutate();
    const unavailable = await executeAction(
      store,
      "room_operator.pull",
      context("room_operator.pull", { receiptId: IDS.receipt2 }),
    ) as { kind: string; terminalState: string };
    assert.equal(unavailable.kind, "terminal_reconciliation");
    assert.equal(unavailable.terminalState, "receipt_version_unavailable");
  }

  const terminalExecutor = new ExecutingFakeSqlExecutor();
  terminalExecutor.pullState = "interaction_deleted";
  terminalExecutor.pullBodyReadable = false;
  terminalExecutor.pullRequestCiphertext = null;
  terminalExecutor.pullGuestCiphertext = null;
  const purgeReceipt = await executeAction(
    new PublicCorePostgresStoreV1(terminalExecutor),
    "room_operator.local_purge.receipt",
  ) as { kind: string };
  assert.equal(purgeReceipt.kind, "body_free", "local receipt does not depend on server ciphertext state");
});

test("ACK replay reconstructs the exact semantic ACK and expired receipts never restart a write", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const ack = await executeAction(store, "room_operator.ack") as {
    kind: string;
    ackId: string;
    eventId: string;
    sequence: number;
    eventHash: string;
    recovered: boolean;
  };
  assert.deepEqual({
    kind: ack.kind,
    ackId: ack.ackId,
    eventId: ack.eventId,
    sequence: ack.sequence,
    eventHash: ack.eventHash,
  }, {
    kind: "ack",
    ackId: IDS.ack,
    eventId: IDS.event,
    sequence: 3,
    eventHash: sha("3"),
  });
  const replay = await executeAction(
    store,
    "room_operator.ack",
    context("room_operator.ack", { receiptId: IDS.receipt2 }),
  ) as { recovered: boolean; ackId: string };
  assert.equal(replay.recovered, true);
  assert.equal(replay.ackId, IDS.ack);

  for (const receipt of executor.receipts.values()) receipt.expires_at = "2026-08-09T12:00:00.000Z";
  const traceStart = executor.trace.length;
  await assert.rejects(
    executeAction(store, "room_operator.ack", context("room_operator.ack", { receiptId: IDS.receipt2 })),
    (error: unknown) => error instanceof PublicCorePostgresError && error.code === "idempotency_record_expired",
  );
  assert.deepEqual(
    executor.trace.slice(traceStart).map((statement) => statement.phase),
    ["receipt_reserve", "receipt_lookup"],
  );
});

test("sync receipt expiry is the exact minimum of event and tombstone source deadlines", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  await executeAction(store, "room_operator.sync");
  const receipt = [...executor.receipts.values()][0];
  assert.ok(receipt);
  const effectsBefore = executor.effects.get("room_operator.sync");
  receipt.sync_event_sequences = [3, 4, 5];
  const committedAt = "2026-08-09T12:00:00.000Z";
  const eventIds = receipt.sync_event_ids as string[];
  const hashes = [...receipt.sync_event_hashes as string[]];
  const times = [...receipt.sync_event_committed_ats as string[]];
  times[0] = committedAt;
  hashes[0] = canonicalSha256({
    schemaVersion: "r4_public_core_room_event.v1",
    eventId: eventIds[0],
    roomId: IDS.room,
    sequence: 3,
    action: "interaction.create",
    targetKind: "interaction",
    targetId: IDS.interaction,
    targetVersion: 1,
    committedAt,
    bodyAvailable: true,
  });
  receipt.sync_event_committed_ats = times;
  receipt.sync_event_hashes = hashes;
  await assert.rejects(
    executeAction(store, "room_operator.sync", context("room_operator.sync", { receiptId: IDS.receipt2 })),
    isClosedPostgresError("sql_sync_source_expiry_invalid"),
  );
  assert.equal(executor.effects.get("room_operator.sync"), effectsBefore);

  const cursorExecutor = new ExecutingFakeSqlExecutor();
  cursorExecutor.syncFloor = 5;
  const cursorStore = new PublicCorePostgresStoreV1(cursorExecutor);
  await executeAction(
    cursorStore,
    "room_operator.sync",
    context("room_operator.sync", {
      idempotencyKey: "idem.room_operator_sync.deadline.0000000000000000",
    }),
  );
  const cursorReceipt = [...cursorExecutor.receipts.values()][0];
  assert.ok(cursorReceipt);
  assert.deepEqual(cursorReceipt.sync_tombstone_expires_ats, [TOMBSTONE_EXPIRES, SYNC_CEILING]);
  assert.equal(cursorReceipt.source_expires_at, TOMBSTONE_EXPIRES);

  cursorReceipt.sync_tombstone_expires_ats = [SYNC_CEILING];
  await assert.rejects(
    executeAction(
      cursorStore,
      "room_operator.sync",
      context("room_operator.sync", {
        receiptId: IDS.receipt2,
        idempotencyKey: "idem.room_operator_sync.deadline.0000000000000000",
      }),
    ),
    isClosedPostgresError("sql_sync_tombstones_invalid"),
  );
});

test("sync freezes its high-water, locks event IDs in C order and returns cursor-gone reconciliation", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  const first = await executeAction(store, "room_operator.sync") as {
    kind: string;
    highWater: number;
    events: readonly unknown[];
  };
  assert.equal(first.kind, "sync_window");
  assert.equal(first.highWater, 5);
  const lock = executor.trace.find((statement) => statement.statementId === "room_operator.sync.lock.event_or_ack");
  assert.match(lock?.text ?? "", /ORDER BY e\.event_id COLLATE "C" FOR UPDATE/u);
  executor.syncHighWater = 9;
  const replay = await executeAction(
    store,
    "room_operator.sync",
    context("room_operator.sync", { receiptId: IDS.receipt2 }),
  ) as { highWater: number; recovered: boolean };
  assert.equal(replay.highWater, 5);
  assert.equal(replay.recovered, true);
  executor.syncFloor = 5;
  const stableReplay = await executeAction(
    store,
    "room_operator.sync",
    context("room_operator.sync", { receiptId: IDS.receipt2 }),
  ) as { kind: string; replayFloor: number; tombstoneIds: readonly string[] };
  assert.equal(stableReplay.kind, "sync_window");
  assert.equal(stableReplay.replayFloor, 1);
  assert.deepEqual(stableReplay.tombstoneIds, []);
  executor.syncHighWater = 5;
  const gone = await executeAction(
    store,
    "room_operator.sync",
    context("room_operator.sync", {
      receiptId: IDS.receipt2,
      idempotencyKey: "idem.room_operator_sync.cursor.0000000000000000",
    }),
  ) as { kind: string; status: number; replayFloor: number; tombstoneIds: readonly string[] };
  assert.equal(gone.kind, "cursor_gone");
  assert.equal(gone.status, 410);
  assert.equal(gone.replayFloor, 5);
  assert.deepEqual(gone.tombstoneIds, [IDS.interaction, IDS.oldProjection]);
});

test("sync rejects executor-forged event enums without committing receipt or effects", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  executor.syncEvents[0]!.event_kind = "PRIVATE_CANARY_SECRET";
  await assert.rejects(
    executeAction(new PublicCorePostgresStoreV1(executor), "room_operator.sync"),
    isClosedPostgresError("sql_event_kind_invalid"),
  );
  assert.equal(executor.receipts.size, 0);
  assert.equal(executor.effects.get("room_operator.sync") ?? 0, 0);
});

test("sync replay rejects a forged noncontiguous frozen page instead of querying mutable events", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  const store = new PublicCorePostgresStoreV1(executor);
  await executeAction(store, "room_operator.sync");
  const receipt = [...executor.receipts.values()][0];
  assert.ok(receipt);
  receipt.sync_event_sequences = [3, 5, 4];
  const effectsBefore = executor.effects.get("room_operator.sync");
  const traceStart = executor.trace.length;
  await assert.rejects(
    executeAction(store, "room_operator.sync", context("room_operator.sync", { receiptId: IDS.receipt2 })),
    isClosedPostgresError("sql_sync_sequence_gap"),
  );
  assert.equal(executor.effects.get("room_operator.sync"), effectsBefore);
  assert.deepEqual(
    executor.trace.slice(traceStart).map((statement) => statement.phase),
    ["receipt_reserve", "receipt_lookup"],
  );
});

test("committed receipt recovery rejects action-incoherent status, code, kind and source expiry", async () => {
  const corruptions: readonly ((row: ReceiptState) => void)[] = [
    (row) => { row.http_status = 599; },
    (row) => { row.result_code = "forged_result"; },
    (row) => { row.recovery_kind = "pairing_issue"; },
    (row) => {
      row.source_expires_at = "2026-09-17T12:00:00.000Z";
      row.expires_at = "2026-09-17T12:00:00.000Z";
    },
    (row) => { row.committed_at = row.expires_at; },
  ];
  for (const corrupt of corruptions) {
    const executor = new ExecutingFakeSqlExecutor();
    const store = new PublicCorePostgresStoreV1(executor);
    await executeAction(store, "curation.admit");
    const receipt = [...executor.receipts.values()][0];
    assert.ok(receipt);
    corrupt(receipt);
    await assert.rejects(
      executeAction(store, "curation.admit", context("curation.admit", { receiptId: IDS.receipt2 })),
      (error: unknown): boolean => error instanceof PublicCorePostgresError
        && error.status === 503
        && error.code.startsWith("sql_receipt_"),
    );
    assert.equal(executor.effects.get("curation.admit"), 1);
  }
});

test("janitor uses a fixed advisory lock, bounded C-order work, and advances health only when drained", async () => {
  const drainedExecutor = new ExecutingFakeSqlExecutor();
  const drained = await new PublicCorePostgresStoreV1(drainedExecutor)
    .runRetentionJanitor({ requestedAt: NOW, batchSize: 2 });
  assert.deepEqual(drained, {
    kind: "retention_janitor",
    acquired: true,
    claimed: 1,
    completed: 1,
    backlogRemaining: false,
    lastSuccessfulPurgeAt: NOW,
  });
  assert.equal(drainedExecutor.trace[0]?.statementId, "retention.janitor.advisory_lock");
  assert.deepEqual(
    drainedExecutor.trace.slice(1, 4).map((statement) => statement.statementId),
    [
      "retention.janitor.lock.installation",
      "retention.janitor.lock.room",
      "retention.janitor.health.start",
    ],
  );
  assert.match(drainedExecutor.trace[0]?.text ?? "", /pg_try_advisory_xact_lock\(8243996700421904::bigint\)/u);
  const claim = drainedExecutor.trace.find((statement) => statement.statementId === "retention.janitor.purge.claim");
  assert.match(claim?.text ?? "", /target_kind COLLATE "C",target_object_id COLLATE "C",purge_job_id COLLATE "C"/u);
  assert.equal(claim?.values[1], 2);
  assert.ok(drainedExecutor.trace.some((statement) => statement.statementId === "retention.janitor.health.success"));

  const backlogExecutor = new ExecutingFakeSqlExecutor();
  backlogExecutor.janitorBacklogRemaining = true;
  const backlog = await new PublicCorePostgresStoreV1(backlogExecutor)
    .runRetentionJanitor({ requestedAt: NOW, batchSize: 2 });
  assert.equal(backlog.backlogRemaining, true);
  assert.equal(backlog.lastSuccessfulPurgeAt, null);
  assert.equal(backlogExecutor.trace.some((statement) => statement.statementId === "retention.janitor.health.success"), false);
  assert.ok(backlogExecutor.trace.some((statement) => statement.statementId === "retention.janitor.health.backlog"));
  for (const token of [
    "pairing_challenges", "projections", "interactions", "public_encounters",
    "rate_events", "room_events", "mutation_receipts", "purge_jobs", "event_replay_floor",
  ]) assert.match(ADAPTER, new RegExp(token, "u"), token);
  const projectionExpiry = drainedExecutor.trace.find(
    (statement) => statement.statementId === "retention.janitor.projection_body",
  )?.text ?? "";
  assert.match(projectionExpiry, /state='invalidated'/u);
  assert.match(projectionExpiry, /state='origin_revoked'/u);
  const roomEventPurge = drainedExecutor.trace.find(
    (statement) => statement.statementId === "retention.janitor.room_event",
  )?.text ?? "";
  assert.match(roomEventPurge, /DELETE FROM forme_r4_public_core\.event_acks/u);
  const ratePurge = drainedExecutor.trace.find(
    (statement) => statement.statementId === "retention.janitor.rate_event",
  )?.text ?? "";
  assert.match(ratePurge, /NOT EXISTS[\s\S]*public_encounters/u);
  assert.match(ratePurge, /r\.rate_event_id IN \(e\.hourly_rate_event_id,e\.daily_rate_event_id\)/u);
  assert.equal((ADAPTER.match(/'purge_[a-z_]*'\|\|pg_catalog\.md5\(/gu) ?? []).length, 7);
  assert.doesNotMatch(
    ADAPTER,
    /'purge_[^']*'\|\|(?:pairing_id|projection_id|interaction_id|target_id)(?!\|\|':'\|\|)/u,
  );
});

test("event janitor proves a contiguous sequence prefix before separate C-order locks and floor advance", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  await new PublicCorePostgresStoreV1(executor).runRetentionJanitor({ requestedAt: NOW, batchSize: 2 });
  const eventDelete = executor.trace.find(
    (statement) => statement.statementId === "retention.janitor.room_event",
  )?.text ?? "";
  const floorAdvance = executor.trace.find(
    (statement) => statement.statementId === "retention.janitor.event_floor",
  )?.text ?? "";
  assert.match(eventDelete, /e\.sequence>=r\.event_replay_floor/u);
  assert.match(eventDelete, /=\s*e\.sequence-r\.event_replay_floor\+1/u);
  assert.match(eventDelete, /NOT EXISTS[\s\S]*blocker\.expires_at>\$1/u);
  assert.match(eventDelete, /ORDER BY e\.sequence LIMIT \$2/u);
  assert.match(eventDelete, /ORDER BY e\.event_id COLLATE "C" FOR UPDATE OF e/u);
  assert.ok(
    eventDelete.indexOf("ORDER BY e.sequence LIMIT $2")
      < eventDelete.indexOf('ORDER BY e.event_id COLLATE "C"'),
  );
  assert.ok(eventDelete.indexOf("DELETE FROM forme_r4_public_core.event_acks")
    < eventDelete.indexOf("DELETE FROM forme_r4_public_core.room_events"));
  assert.match(floorAdvance, /remaining_count=event_high_water-first_remaining\+1/u);
  assert.match(floorAdvance, /WHEN remaining_count=0 THEN event_high_water\+1/u);

  const adversarial = [
    { sequence: 1, eventId: "event_z", expired: true },
    { sequence: 2, eventId: "event_a", expired: true },
    { sequence: 3, eventId: "event_m", expired: false },
    { sequence: 4, eventId: "event_b", expired: true },
  ];
  const prefix = adversarial
    .sort((left, right) => left.sequence - right.sequence)
    .filter((event, index) => event.expired && event.sequence === index + 1)
    .slice(0, 2);
  assert.deepEqual(prefix.map((event) => event.sequence), [1, 2]);
  assert.deepEqual(prefix.map((event) => event.eventId).sort(), ["event_a", "event_z"]);
  assert.equal(adversarial[2]?.sequence, 3, "partial batch advances only to first retained sequence");
});

test("every purge obligation keeps a strict sub-24-hour margin and verify rejects schema drift", () => {
  const purgeInsertCount = (ADAPTER.match(/INSERT INTO \$\{PUBLIC_CORE_SQL_SCHEMA\}\.purge_jobs/gu) ?? []).length;
  const marginCount = (ADAPTER.match(/interval '23 hours'/gu) ?? []).length;
  assert.ok(purgeInsertCount > 0);
  assert.equal(marginCount, purgeInsertCount);
  assert.match(SCHEMA, /created_at <= due_at AND due_at < created_at \+ interval '24 hours'/u);
  assert.doesNotMatch(SCHEMA, /due_at <= created_at \+ interval '24 hours'/u);
  const cipherConstraints = [...SCHEMA.matchAll(
    /CONSTRAINT ck_(?:rooms__label|projections__capsule|pairing_challenges__(?:pairing|exchange)|interactions__(?:request|guest))_cipher CHECK \(([\s\S]*?)\n  \)[,\n]/gu,
  )].map((match) => match[1] ?? "");
  assert.equal(cipherConstraints.length, 6);
  for (const cipherConstraint of cipherConstraints) {
    assert.equal((cipherConstraint.match(/jsonb_typeof\([^\n]+->'[^']+'\) = 'string'/gu) ?? []).length, 7);
    assert.match(cipherConstraint, /keyVersion' ~ '\^keyv_\[a-f0-9\]\{32\}\$'/u);
    assert.match(cipherConstraint, /nonce' ~ '\^\[A-Za-z0-9_-\]\{16\}\$'/u);
    assert.match(cipherConstraint, /tag' ~ '\^\[A-Za-z0-9_-\]\{21\}\[AQgw\]\$'/u);
    assert.match(cipherConstraint, /length\([^\n]+ciphertext[^\n]+\) =/u);
  }
  assert.match(VERIFY, /public_core_column_definition_drift/u);
  assert.match(VERIFY, /public_core_constraint_inventory_drift/u);
  assert.match(VERIFY, /public_core_check_constraint_definition_drift/u);
});

test("constraint inventory compares the exact schema set in full-signature C order", () => {
  const expectedBlock = VERIFY.match(
    /expected_constraint_csv constant text :=([\s\S]*?);\n  expected_key_constraint_csv/u,
  )?.[1];
  assert.ok(expectedBlock, "expected constraint inventory must remain explicit");
  const expected = [...expectedBlock.matchAll(/'([^']*)'/gu)]
    .map((match) => match[1] ?? "")
    .join("")
    .split(",");

  const constraintType = (constraintName: string): string => constraintName.startsWith("pk_")
    ? "p"
    : constraintName.startsWith("uq_")
      ? "u"
      : constraintName.startsWith("fk_")
        ? "f"
        : "c";
  const actual = [...SCHEMA.matchAll(
    /CREATE TABLE forme_r4_public_core\.([a-z_]+) \(([\s\S]*?)\n\);/gu,
  )].flatMap((tableMatch) => {
    const tableName = tableMatch[1] ?? "";
    return [...(tableMatch[2] ?? "").matchAll(/\bCONSTRAINT ([a-z0-9_]+)/gu)].map((constraintMatch) => {
      const constraintName = constraintMatch[1] ?? "";
      const type = constraintType(constraintName);
      return { tableName, constraintName, signature: `${tableName}|${constraintName}|${type}` };
    });
  });
  actual.push(...[...SCHEMA.matchAll(
    /ALTER TABLE forme_r4_public_core\.([a-z_]+)\n  ADD CONSTRAINT ([a-z0-9_]+)/gu,
  )].map((match) => {
    const tableName = match[1] ?? "";
    const constraintName = match[2] ?? "";
    const type = constraintType(constraintName);
    return { tableName, constraintName, signature: `${tableName}|${constraintName}|${type}` };
  }));
  const byBytes = (left: string, right: string): number => Buffer.compare(Buffer.from(left), Buffer.from(right));
  const signatureOrder = actual.map(({ signature }) => signature).sort(byBytes);
  const legacyNameOrder = actual.toSorted((left, right) => {
    const tableOrder = byBytes(left.tableName, right.tableName);
    return tableOrder === 0 ? byBytes(left.constraintName, right.constraintName) : tableOrder;
  }).map(({ signature }) => signature);

  assert.equal(actual.length, 172);
  assert.deepEqual(signatureOrder, expected);
  assert.deepEqual(
    legacyNameOrder.flatMap((signature, index) => signature === expected[index]
      ? []
      : [{ index, expected: expected[index], actual: signature }]),
    [
      {
        index: 41,
        expected: "mutation_receipts|ck_mutation_receipts__actor_action|c",
        actual: "mutation_receipts|ck_mutation_receipts__actor|c",
      },
      {
        index: 42,
        expected: "mutation_receipts|ck_mutation_receipts__actor|c",
        actual: "mutation_receipts|ck_mutation_receipts__actor_action|c",
      },
      {
        index: 49,
        expected: "mutation_receipts|ck_mutation_receipts__recovery_action|c",
        actual: "mutation_receipts|ck_mutation_receipts__recovery|c",
      },
      {
        index: 50,
        expected: "mutation_receipts|ck_mutation_receipts__recovery|c",
        actual: "mutation_receipts|ck_mutation_receipts__recovery_action|c",
      },
    ],
  );
  assert.match(
    VERIFY,
    /array_agg\(signature ORDER BY signature COLLATE "C"\)[\s\S]*?constraint_inventory/u,
  );
});

test("janitor failure records a closed failure code in a separate transaction", async () => {
  const executor = new ExecutingFakeSqlExecutor();
  executor.failAtStatementId = "retention.janitor.purge.claim";
  await assert.rejects(
    new PublicCorePostgresStoreV1(executor).runRetentionJanitor({ requestedAt: NOW, batchSize: 10 }),
    (error: unknown) => error instanceof PublicCorePostgresError && error.code === "retention_janitor_failed",
  );
  assert.ok(executor.trace.some((statement) => statement.statementId === "retention.janitor.health.failure"));
});

test("verify is read-only and rollback refuses durable rows, seed drift, and unexpected objects before DROP", () => {
  const ddlMarker = "-- Persist the exact catalog shape produced by these hash-pinned bytes.";
  const ddlPrefix = SCHEMA.slice(0, SCHEMA.indexOf(ddlMarker));
  const sourceContract = `sha256:${createHash("sha256").update(ddlPrefix).digest("hex")}`;
  assert.equal(sourceContract, PUBLIC_CORE_SQL_EXPECTED_CATALOG_CONTRACT_SHA256);
  const contractHex = PUBLIC_CORE_SQL_EXPECTED_CATALOG_CONTRACT_SHA256.slice("sha256:".length);
  for (const artifact of [ADAPTER, SCHEMA, VERIFY, ROLLBACK]) assert.match(
    artifact,
    new RegExp(contractHex, "u"),
  );
  assert.match(VERIFY, /BEGIN TRANSACTION READ ONLY/u);
  assert.match(VERIFY, /public_core_table_inventory_drift/u);
  assert.match(VERIFY, /public_core_column_definition_drift/u);
  assert.match(VERIFY, /public_core_constraint_definition_drift/u);
  assert.match(VERIFY, /public_core_key_constraint_definition_drift/u);
  assert.match(VERIFY, /public_core_foreign_key_definition_drift/u);
  assert.match(VERIFY, /public_core_index_definition_drift/u);
  assert.match(VERIFY, /public_core_catalog_manifest_drift/u);
  assert.match(VERIFY, /pg_catalog\.pg_get_constraintdef/u);
  assert.match(VERIFY, /WHEN '_text' THEN 'text\[\]'/u);
  assert.match(VERIFY, /WHEN '_int8' THEN 'bigint\[\]'/u);
  assert.match(ROLLBACK, /\) <> 207 OR \(/u);
  assert.match(ROLLBACK, /\) <> 172 OR EXISTS \(/u);
  assert.match(SCHEMA, /r4\.public-core\.catalog-manifest\.v2:contract-sha256:/u);
  assert.match(VERIFY, /uq_interactions__consumed_lineage/u);
  assert.match(VERIFY, /\) <> 15 THEN/u);
  assert.match(VERIFY, /public_core_unexpected_object_present/u);
  assert.match(VERIFY, /public_core_unexpected_durable_rows/u);
  assert.match(ROLLBACK, /public_core_rollback_durable_rows_present/u);
  assert.match(ROLLBACK, /public_core_rollback_installation_seed_drift/u);
  assert.match(ROLLBACK, /public_core_rollback_retention_seed_drift/u);
  assert.match(ROLLBACK, /public_core_rollback_unexpected_object/u);
  assert.match(ROLLBACK, /public_core_rollback_external_dependency/u);
  assert.match(ROLLBACK, /dependency\.deptype IN \('a', 'n'\)/u);
  assert.match(ROLLBACK, /dependency\.classid = 'pg_catalog\.pg_class'/u);
  assert.match(ROLLBACK, /public_core_rollback_definition_drift/u);
  assert.match(ROLLBACK, /public_core_rollback_catalog_manifest_drift/u);
  assert.match(ROLLBACK, /SELECT count\(\*\) FROM forme_r4_public_core\.rooms/u);
  assert.ok(ROLLBACK.indexOf("public_core_rollback_durable_rows_present") < ROLLBACK.indexOf("DROP SCHEMA"));
  assert.equal((ROLLBACK.match(/DROP TABLE forme_r4_public_core\.[a-z_]+ RESTRICT/gu) ?? []).length, 14);
  assert.match(ROLLBACK, /DROP CONSTRAINT fk_public_encounters__consumed_interaction RESTRICT/u);
  assert.match(ROLLBACK, /DROP CONSTRAINT fk_rooms__current_projection RESTRICT/u);
  assert.match(ROLLBACK, /DROP SCHEMA forme_r4_public_core RESTRICT/u);
  assert.doesNotMatch(ROLLBACK, /\bCASCADE\b/u);
  assert.doesNotMatch(`${SCHEMA}\n${VERIFY}\n${ROLLBACK}`, /\\connect|\bpsql\b|docker|postgres:\/\//iu);
});

test("catalog signatures cast PostgreSQL catalog identifiers and internal char fields without changing their frame", () => {
  const manifestRows = [SCHEMA, VERIFY, ROLLBACK].map(catalogManifestRows);
  assert.equal(manifestRows[1], manifestRows[0]);
  assert.equal(manifestRows[2], manifestRows[0]);
  for (const signatureRows of manifestRows) {
    for (const expression of [
      "c.relname::text", "c.relkind::text", "c.relpersistence::text",
      "a.attname::text", "t.typname::text", "a.attidentity::text", "a.attgenerated::text",
      "owner.relname::text", "constraint_row.conname::text", "constraint_row.contype::text",
      "idx.relname::text", "access_method.amname::text",
      "item.typname::text", "item.typtype::text", "item.typcategory::text",
    ]) assert.match(signatureRows, new RegExp(expression.replaceAll(".", "\\."), "u"));
    assert.doesNotMatch(
      signatureRows,
      /(?:relkind|relpersistence|attidentity|attgenerated|contype|typtype|typcategory)(?!::text)\s*\|\|/u,
    );
  }
  const preCorrectionFrame = manifestRows[0]?.replace(
    /(?<identifier>(?:c\.(?:relname|relkind|relpersistence)|a\.(?:attname|attidentity|attgenerated)|t\.typname|owner\.relname|constraint_row\.(?:conname|contype)|idx\.relname|access_method\.amname|item\.(?:typname|typtype|typcategory)))::text/gu,
    "$<identifier>",
  );
  assert.equal(
    createHash("sha256").update(preCorrectionFrame ?? "").digest("hex"),
    "7b911e0b0b89a759b73052baeb08fa037c0539b3606b827f35bcb87eb2d7ece8",
    "the shared catalog signature frame changes only by explicit text casts",
  );
  assert.match(VERIFY, /owner\.relname::text \|\| '\|' \|\| c\.conname::text \|\| '\|' \|\| c\.contype::text/u);
  assert.match(VERIFY, /a\.attnum::text \|\| ':' \|\| a\.attname::text/u);
  assert.match(VERIFY, /array_agg\(t\.typname::text \|\| '\|' \|\| t\.typtype::text/u);
});

test("construction has no driver, runtime, network, migration or body diagnostics", () => {
  assert.doesNotMatch(ADAPTER, /from ["'](?:pg|postgres|node:net|node:tls|node:http|node:https)/u);
  assert.doesNotMatch(ADAPTER, /\b(?:DATABASE_URL|createConnection|listen\(|fetch\()/u);
  assert.doesNotMatch(ADAPTER, /console\.(?:log|error|warn)|JSON\.stringify\(.*(?:ciphertext|secret)/u);
  assert.equal(PUBLIC_CORE_POSTGRES_CONSTRUCTION.networkCalls, 0);
  assert.equal(PUBLIC_CORE_POSTGRES_CONSTRUCTION.migrationExecuted, false);
});
