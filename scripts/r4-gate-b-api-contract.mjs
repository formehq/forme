import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createPathFence, normalizePathToken } from "./r4-gate-b-path-fence.mjs";

const PACKET_SHA = "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5";
const OUTPUTS = [
  "schemas/r4/api-v1.schema.json",
  "schemas/r4/api-v1-index.json",
  "schemas/r4/local-formats.schema.json",
  "schemas/r4/local-formats-index.json",
  "schemas/r4/gate-b-evidence.schema.json",
];
const INPUTS = [
  "schemas/r4/gate-b/operations.md",
  "schemas/r4/gate-b/local-formats.md",
  "schemas/r4/protocol.schema.json",
  "schemas/r4/schema-index.json",
  "apps/room/src/operation-inventory.ts",
];

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readText(relativePath) {
  return fs.readFileSync(relativePath, "utf8");
}

function tableCells(line) {
  const cells = [];
  let current = "";
  let inCode = false;
  for (const character of line) {
    if (character === "`") inCode = !inCode;
    if (character === "|" && !inCode) {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current);
  return cells.slice(1, -1).map((cell) => cell.trim());
}

function backtickGroups(value) {
  return [...value.matchAll(/`([^`]*)`/gu)].map((match) => match[1]);
}

function balancedBrace(value) {
  const start = value.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    if (value[index] === "}") depth -= 1;
    if (depth === 0) return value.slice(start + 1, index);
  }
  throw new Error("UNBALANCED_MEMBER_SHAPE");
}

function topLevelParts(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if ((character === "," && depth === 0) || index === value.length) {
      const part = value.slice(start, index).trim();
      if (part.length > 0) parts.push(part);
      start = index + 1;
    }
  }
  return parts;
}

function memberShape(value) {
  const separator = value.indexOf(":");
  const name = (separator === -1 ? value : value.slice(0, separator)).trim();
  const annotation = separator === -1 ? "" : value.slice(separator + 1).trim();
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) {
    throw new Error("INVALID_MEMBER_NAME");
  }
  return { name, annotation };
}

function parseMemberGroup(value) {
  if (value === "[]" || value.length === 0) return [];
  const content = value.startsWith("{") && value.endsWith("}") ? value.slice(1, -1) : value;
  return topLevelParts(content).map(memberShape);
}

function parseInventory(source) {
  const pattern = /\{ name: "([^"]+)", family: "([^"]+)", method: "([^"]+)", path: "([^"]+)", actor: "([^"]+)", mutating: (true|false), expectedVersion: (true|false) \}/gu;
  const rows = [...source.matchAll(pattern)].map((match) => ({
    action: match[1],
    family: match[2],
    method: match[3],
    path: match[4],
    actor: match[5],
    mutating: match[6] === "true",
    expectedVersion: match[7] === "true",
  }));
  if (rows.length !== 45) throw new Error("OPERATION_INVENTORY_COUNT_MISMATCH");
  return rows;
}

function parseRequest(cell) {
  const groups = backtickGroups(cell);
  const requestName = groups.find((group) => /^[A-Za-z][A-Za-z0-9]+V1$/u.test(group));
  if (!requestName) throw new Error("REQUEST_REF_MISSING");
  const requiredMatch = /required `(\{[^`]*\})`/u.exec(cell);
  const optionalMatch = /optional `(\{[^`]*\})`/u.exec(cell);
  if (requiredMatch) {
    return {
      requestName,
      required: parseMemberGroup(requiredMatch[1]),
      optional: optionalMatch ? parseMemberGroup(optionalMatch[1]) : [],
    };
  }
  const memberGroup = groups.find((group) => group === "[]" || group.startsWith("{"));
  if (memberGroup === undefined) throw new Error("REQUEST_MEMBERS_MISSING");
  return { requestName, required: parseMemberGroup(memberGroup), optional: [] };
}

function protocolVersionMap(protocol) {
  const result = new Map();
  for (const [name, definition] of Object.entries(protocol.$defs)) {
    const version = definition?.properties?.schemaVersion?.const;
    if (typeof version === "string") result.set(version, name);
  }
  return result;
}

function externalProtocolRef(protocol, definition) {
  return `${protocol.$id}#/$defs/${definition}`;
}

function parseOperations(markdown, inventory, protocol) {
  const versionMap = protocolVersionMap(protocol);
  const rows = markdown
    .split("\n")
    .filter((line) => /^\| [0-9]+ \|/u.test(line))
    .map((line) => tableCells(line));
  if (rows.length !== 45) throw new Error("OPERATION_MAP_COUNT_MISMATCH");

  const operations = rows.map((cells, index) => {
    if (cells.length !== 8) throw new Error("OPERATION_COLUMN_COUNT_MISMATCH");
    const number = Number(cells[0]);
    const action = backtickGroups(cells[1])[0];
    const methodPath = backtickGroups(cells[2])[0];
    const auth = backtickGroups(cells[3])[0];
    const request = parseRequest(cells[4]);
    const resultCell = cells[5];
    const statusGroups = backtickGroups(resultCell)
      .map((group) => /^(\d{3}) (.+)$/u.exec(group))
      .filter(Boolean)
      .map((match) => ({ status: Number(match[1]), name: match[2] }));
    if (statusGroups.length === 0) throw new Error("SUCCESS_RESULT_MISSING");
    const inventoryRow = inventory[index];
    if (
      number !== index + 1 ||
      action !== inventoryRow.action ||
      methodPath !== `${inventoryRow.method} ${inventoryRow.path}`
    ) {
      throw new Error("OPERATION_MAP_INVENTORY_DRIFT");
    }
    const wireVersion = backtickGroups(resultCell).find((group) => /^[a-z][a-z0-9_.-]+\.v1$/u.test(group));
    const resultMembersText = balancedBrace(resultCell);
    const resultMembers = resultMembersText === null ? [] : topLevelParts(resultMembersText).map(memberShape);
    const resultRefs = [];
    for (const result of statusGroups) {
      if (/^[A-Za-z][A-Za-z0-9]+V1$/u.test(result.name)) {
        resultRefs.push(`#/$defs/${result.name}`);
      } else {
        const definition = versionMap.get(result.name);
        if (!definition) throw new Error("UNKNOWN_CANONICAL_RESULT_VERSION");
        resultRefs.push(externalProtocolRef(protocol, definition));
      }
    }
    resultRefs.push("#/$defs/ApiErrorV1");
    return {
      number,
      action,
      method: inventoryRow.method,
      path: inventoryRow.path,
      auth,
      actor: inventoryRow.actor,
      mutating: inventoryRow.mutating,
      expectedVersion: inventoryRow.expectedVersion,
      request,
      resultCell,
      primaryResult: statusGroups[0],
      wireVersion,
      resultMembers,
      resultRefs,
    };
  });

  const recovery = {
    "notification.set": "NotificationSetRecoveredResultV1",
    "notification.verify": "NotificationVerifyRecoveredResultV1",
    "room.pair": "RoomPairRecoveryExpiredResultV1",
    "room.pair.exchange": "RoomPairExchangeRecoveryExpiredResultV1",
    "room_operator.projection.deliver": "PublicationRecoveryUnavailableResultV1",
    "room_operator.response.deliver": "PublicationRecoveryUnavailableResultV1",
  };
  for (const operation of operations) {
    const recoveryName = recovery[operation.action];
    if (recoveryName) operation.resultRefs.splice(-1, 0, `#/$defs/${recoveryName}`);
  }
  return operations;
}

function scalarDefs() {
  return {
    OpaqueId: { type: "string", pattern: "^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$", maxLength: 160 },
    Sha256: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    Timestamp: {
      type: "string",
      format: "date-time",
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
    },
    Capability32: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
    IdempotencyKey: { type: "string", pattern: "^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$" },
  };
}

function apiPropertySchema(name, annotation, protocol, wireVersion = null) {
  const version = /([a-z][a-z0-9_.-]+\.v1)/u.exec(annotation)?.[1];
  if (version) {
    const definition = protocolVersionMap(protocol).get(version);
    if (definition) return { $ref: externalProtocolRef(protocol, definition) };
  }
  const explicit = {
    schemaVersion: wireVersion ? { const: wireVersion } : { type: "string", minLength: 1, maxLength: 128 },
    interactionType: { enum: ["ask", "seed", "resonance"] },
    consent: { enum: ["allow_owner_local_ai", "manual_owner_only"] },
    requestBody: { type: "string", maxLength: 12288 },
    guestCapsule: {
      oneOf: [
        { type: "null" },
        { $ref: externalProtocolRef(protocol, "GuestCapsuleV1") },
      ],
    },
    roomKind: { enum: ["third_place_public", "private_grant_only"] },
    interactionMode: { enum: ["public_single", "invite_only", "closed"] },
    presetId: { enum: ["one_visit", "short_exchange", "familiar_collaborator", "trusted_collaborator"] },
    permitsAgentDerivative: { type: "boolean" },
    transportJournalDispatches: { const: 0 },
    provider: { const: "OpenAI" },
    model: { type: "string", minLength: 1, maxLength: 128 },
    ordinal: { type: "integer", minimum: 1, maximum: 3 },
    localBytesAbsent: { const: true },
    afterSequence: { type: "integer", minimum: 0 },
    email: { type: "string", format: "email", maxLength: 320 },
    code: { type: "string", pattern: "^[0-9]{6}$" },
    label: { type: "string", minLength: 1, maxLength: 120 },
    pairingCode: { $ref: "#/$defs/Capability32" },
    clientPublicKey: { type: "string", minLength: 32, maxLength: 4096 },
    sealedCredential: { type: "string", minLength: 1, maxLength: 8192 },
    delivery: { $ref: externalProtocolRef(protocol, "HostedPublicationDeliveryV1") },
    view: { $ref: externalProtocolRef(protocol, "ProjectionReadViewV1") },
    room: { $ref: externalProtocolRef(protocol, "RoomV1") },
    projection: { $ref: externalProtocolRef(protocol, "ProjectionCapsuleV1") },
    lifecycle: { $ref: externalProtocolRef(protocol, "ProjectionLifecycleV1") },
    encounter: { $ref: externalProtocolRef(protocol, "PublicEncounterV1") },
    grant: { $ref: externalProtocolRef(protocol, "GrantV1") },
    offer: { $ref: externalProtocolRef(protocol, "GrantOfferV1") },
    invite: { $ref: externalProtocolRef(protocol, "DirectGrantInviteV1") },
    derivative: { $ref: externalProtocolRef(protocol, "AgentDerivativeV1") },
    interaction: { $ref: externalProtocolRef(protocol, "InteractionV1") },
    response: { $ref: externalProtocolRef(protocol, "ResponseV1") },
    reservation: { $ref: externalProtocolRef(protocol, "FreshCycleReservationV1") },
    permit: { $ref: externalProtocolRef(protocol, "DispatchPermitV1") },
    receipt: { $ref: externalProtocolRef(protocol, "OperationReceiptV1") },
    endpoint: { $ref: externalProtocolRef(protocol, "NotificationEndpointV1") },
    syntheticNotice: { $ref: externalProtocolRef(protocol, "ReadyNoticeV1") },
    residents: { type: "array", items: { $ref: externalProtocolRef(protocol, "ProjectionCapsuleV1") } },
    interactions: { type: "array", items: { $ref: externalProtocolRef(protocol, "InteractionV1") } },
    synthetic: { type: "boolean" },
    syntheticTransport: {
      type: "object",
      additionalProperties: false,
      required: ["upstreamEnabled"],
      properties: { upstreamEnabled: { const: false } },
    },
    syntheticRecovery: {
      type: "object",
      additionalProperties: false,
      required: ["verificationCodeRetained", "bodyFree"],
      properties: { verificationCodeRetained: { const: false }, bodyFree: { const: true } },
    },
  };
  if (explicit[name]) return explicit[name];
  if (/Secret$/u.test(name)) return { $ref: "#/$defs/Capability32" };
  if (/Hash$/u.test(name)) return { $ref: "#/$defs/Sha256" };
  if (/At$/u.test(name)) return { $ref: "#/$defs/Timestamp" };
  if (/Version$|Sequence$/u.test(name)) return { type: "integer", minimum: 0 };
  if (/Id$|Ids$/u.test(name)) return { $ref: "#/$defs/OpaqueId" };
  if (/^(state|responseState|artifactClass|operation|outcome|errorCode)$/u.test(name)) {
    return { type: "string", minLength: 1, maxLength: 128 };
  }
  return { type: "string", minLength: 1, maxLength: 8192 };
}

function objectSchema(members, protocol, wireVersion = null, optional = []) {
  const optionalNames = new Set(optional.map((member) => member.name));
  const all = [...members, ...optional];
  return {
    type: "object",
    additionalProperties: false,
    required: all.filter((member) => !optionalNames.has(member.name)).map((member) => member.name),
    properties: Object.fromEntries(
      all.map((member) => [member.name, apiPropertySchema(member.name, member.annotation, protocol, wireVersion)]),
    ),
  };
}

function apiSchema(operations, protocol) {
  const defs = {
    ...scalarDefs(),
    ApiErrorDetailV1: {
      type: "object",
      additionalProperties: false,
      required: ["code", "correlationId"],
      properties: {
        code: { type: "string", minLength: 1, maxLength: 128 },
        correlationId: { type: "string", minLength: 1, maxLength: 160 },
        message: { type: "string", minLength: 1, maxLength: 512 },
      },
    },
    ApiErrorV1: {
      type: "object",
      additionalProperties: false,
      required: ["error"],
      properties: { error: { $ref: "#/$defs/ApiErrorDetailV1" } },
    },
  };

  for (const operation of operations) {
    const requestSchema = objectSchema(
      operation.request.required,
      protocol,
      null,
      operation.request.optional,
    );
    if (operation.request.requestName === "RoomOperatorAckRequestV1") {
      defs[operation.request.requestName] = {
        $ref: externalProtocolRef(protocol, "RoomEventAckV1"),
      };
    } else {
      if (operation.request.requestName === "RoomOperatorProjectionDeliverRequestV1") {
        requestSchema.properties.delivery = {
          allOf: [
            { $ref: externalProtocolRef(protocol, "HostedPublicationDeliveryV1") },
            {
              type: "object",
              required: ["artifactClass"],
              properties: { artifactClass: { const: "projection" } },
            },
          ],
        };
      }
      if (operation.request.requestName === "RoomOperatorResponseDeliverRequestV1") {
        requestSchema.properties.delivery = {
          allOf: [
            { $ref: externalProtocolRef(protocol, "HostedPublicationDeliveryV1") },
            {
              type: "object",
              required: ["artifactClass"],
              properties: { artifactClass: { const: "response" } },
            },
          ],
        };
      }
      defs[operation.request.requestName] = requestSchema;
    }
    const resultName = operation.primaryResult.name;
    if (/^[A-Za-z][A-Za-z0-9]+V1$/u.test(resultName) && defs[resultName] === undefined) {
      const canonical = operation.wireVersion
        ? protocolVersionMap(protocol).get(operation.wireVersion)
        : null;
      defs[resultName] = canonical
        ? { $ref: externalProtocolRef(protocol, canonical) }
        : objectSchema(operation.resultMembers, protocol, operation.wireVersion);
    }
  }

  const recoverySchemas = {
    NotificationSetRecoveredResultV1: ["schemaVersion", "endpoint", "receipt", "syntheticRecovery"],
    NotificationVerifyRecoveredResultV1: ["schemaVersion", "endpoint", "receipt", "syntheticRecovery"],
    RoomPairRecoveryExpiredResultV1: ["schemaVersion", "pairingId", "roomId", "expiresAt", "receipt"],
    RoomPairExchangeRecoveryExpiredResultV1: ["schemaVersion", "pairingId", "roomId", "expiresAt", "receipt"],
    PublicationRecoveryUnavailableResultV1: ["schemaVersion", "artifactClass", "artifactId", "state", "receipt"],
  };
  const recoveryVersions = {
    NotificationSetRecoveredResultV1: "notification_set_result.v1",
    NotificationVerifyRecoveredResultV1: "notification_verify_result.v1",
    RoomPairRecoveryExpiredResultV1: "synthetic_pairing_recovery_expired.v1",
    RoomPairExchangeRecoveryExpiredResultV1: "synthetic_pairing_exchange_recovery_expired.v1",
    PublicationRecoveryUnavailableResultV1: "publication_recovery_unavailable.v1",
  };
  for (const [name, members] of Object.entries(recoverySchemas)) {
    defs[name] = objectSchema(
      members.map((member) => ({ name: member, annotation: "" })),
      protocol,
      recoveryVersions[name],
    );
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://forme.example/schemas/r4/api-v1.v1.schema.json",
    title: "Forme R4 closed API v1 operation schemas",
    $comment: `Generated offline from the frozen Gate B map under Packet ${PACKET_SHA}.`,
    $defs: defs,
  };
}

function parseLocalFormats(markdown) {
  const rows = markdown
    .split("\n")
    .filter((line) => /^\| `[^`]+`/u.test(line))
    .map((line) => tableCells(line));
  if (rows.length !== 25) throw new Error("LOCAL_FORMAT_ROW_COUNT_MISMATCH");
  const parsed = [];
  const fieldMap = new Map();
  for (const cells of rows) {
    if (cells.length !== 4) throw new Error("LOCAL_FORMAT_COLUMN_COUNT_MISMATCH");
    const schemaVersion = backtickGroups(cells[0])[0];
    const staged = / staged$/u.test(cells[0]);
    let fields;
    if (/^Same exact candidate envelope fields/u.test(cells[2])) {
      fields = fieldMap.get("local_encrypted_response_candidate.v1");
    } else if (/^Journal fields except `startedAt`/u.test(cells[2])) {
      const base = fieldMap.get("local_stale_replay_journal.v1");
      fields = [
        ...base.filter((field) => field.name !== "startedAt"),
        { name: "replayReceiptId", annotation: "" },
        { name: "completedAt", annotation: "" },
      ];
    } else {
      const raw = cells[2].replaceAll("`", "").split(";")[0].trim();
      fields = parseMemberGroup(raw);
    }
    if (!fields) throw new Error("LOCAL_FORMAT_FIELDS_MISSING");
    if (!fieldMap.has(schemaVersion)) fieldMap.set(schemaVersion, fields);
    parsed.push({
      schemaVersion,
      staged,
      locationCell: cells[1],
      fields,
      lifetime: cells[3],
    });
  }
  return parsed;
}

function definitionName(version) {
  return version
    .split(/[._-]/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function localPropertySchema(version, name, protocol) {
  if (name === "schemaVersion") return { const: version };
  if (name === "ack") return { $ref: externalProtocolRef(protocol, "RoomEventAckV1") };
  if (name === "agentShare") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "derivativeSecret"],
      properties: {
        schemaVersion: { const: "guest_agent_token_share.v1" },
        derivativeSecret: { $ref: "#/$defs/Capability32" },
      },
    };
  }
  const phaseEnums = {
    "local_candidate_admission_intent.v1": ["planned", "key_wrapped", "candidate_persisted"],
    "local_candidate_replacement_journal.v1": ["planned", "key_wrapped", "staged", "old_denied", "successor_active"],
    "r4.candidate-cleanup-journal.v1": ["denied", "ciphertext_removed"],
    "local_fresh_run_marker.v1": ["active", "cleanup_required"],
  };
  if (name === "phase" && phaseEnums[version]) return { enum: phaseEnums[version] };
  if (name === "reason") {
    return { enum: ["owner_denied", "owner_replaced", "basis_invalidated", "interaction_terminal", "projection_terminal", "response_terminal", "room_terminal", "cursor_tombstone", "published", "candidate_expired"] };
  }
  if (name === "terminal") {
    return { enum: ["normal", "cancel", "timeout", "budget", "schema_failure", "process_kill", "fork_attempt", "huge_output", "machine_crash"] };
  }
  if (name === "outcome" && version === "r4.body-free-receipt.v1") {
    return { enum: ["accepted", "no_op", "rejected", "unavailable", "recovered"] };
  }
  if (name === "outcome" && version === "local_fresh_run_cleanup_receipt.v1") {
    return { const: "runtime_bytes_absent" };
  }
  if (["cursor", "highWater", "version", "processId", "ownerProcessId"].includes(name)) {
    return { type: "integer", minimum: 0 };
  }
  if (["cleanupRequired", "terminal"].includes(name) && name !== "terminal") return { type: "boolean" };
  if (["events", "ackOutbox", "receipts", "tombstoneIds", "reservations"].includes(name)) {
    return { type: "array", items: true };
  }
  if (["gapWarning", "quarantine"].includes(name)) {
    return { oneOf: [{ type: "null" }, { type: "object" }, { type: "array" }] };
  }
  if (["budget", "manualRecovery"].includes(name)) return { type: "object" };
  if (/Secret$/u.test(name)) return { $ref: "#/$defs/Capability32" };
  if (/Hash$/u.test(name)) return { $ref: "#/$defs/Sha256" };
  if (/At$|ExpiresAt$/u.test(name)) return { $ref: "#/$defs/Timestamp" };
  if (/Id$|Ref$/u.test(name)) return { type: "string", minLength: 1, maxLength: 160 };
  return { type: "string", minLength: 1, maxLength: 131072 };
}

function localSchema(rows, protocol) {
  const defs = { ...scalarDefs() };
  for (const row of rows) {
    const name = definitionName(row.schemaVersion);
    if (defs[name]) continue;
    defs[name] = {
      type: "object",
      additionalProperties: false,
      required: row.fields.map((field) => field.name),
      properties: Object.fromEntries(
        row.fields.map((field) => [field.name, localPropertySchema(row.schemaVersion, field.name, protocol)]),
      ),
    };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://forme.example/schemas/r4/local-formats.v1.schema.json",
    title: "Forme R4 closed local record formats",
    $comment: `Generated offline from the frozen Gate B local map under Packet ${PACKET_SHA}.`,
    $defs: defs,
  };
}

const TOKEN_PATTERNS = {
  ROOM_ID: "room_[A-Za-z0-9_-]{16,128}",
  INTERACTION_ID: "interaction_[A-Za-z0-9_-]{16,128}",
  CANDIDATE_ID: "candidate_[A-Za-z0-9_-]{16,128}",
  OLD_CANDIDATE_ID: "candidate_[A-Za-z0-9_-]{16,128}",
  NEW_CANDIDATE_ID: "candidate_[A-Za-z0-9_-]{16,128}",
  JOURNAL_ID: "journal_[A-Za-z0-9_-]{16,128}",
  RUN_LOCAL_ID: "run_[A-Za-z0-9_-]{16,128}",
  CYCLE_ID: "[A-Za-z0-9_-]{16,128}",
  IDEMPOTENCY_KEY: "(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})",
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function locationPattern(cell) {
  const location = backtickGroups(cell).find((group) => group.includes("/") || group.endsWith(".jsonl"));
  if (!location) return null;
  let pattern = escapeRegex(location);
  for (const [token, tokenPattern] of Object.entries(TOKEN_PATTERNS)) {
    pattern = pattern.replaceAll(token, tokenPattern);
  }
  return `^${pattern}$`;
}

function cleanupClass(row) {
  const text = row.lifetime.toLowerCase();
  if (row.schemaVersion === "r4.local-room-ledger.v1") return "workspace_durable_body_free";
  if (row.schemaVersion === "local_encrypted_response_candidate.v1") {
    return row.staged ? "replacement_transition" : "deny_key_destroy_ciphertext_remove";
  }
  if (text.includes("append-only") || text.includes("durable recovery receipt")) return "retained_body_free_receipt";
  if (text.includes("memory") || text.includes("descriptor")) return "memory_or_secure_channel_only";
  if (text.includes("destroyed after")) return "destroy_after_body_free_commit";
  if (text.includes("transient") || text.includes("marker")) return "explicit_reconcile_then_remove";
  return "explicit_lifecycle";
}

function localIndex(rows, sourceHash) {
  return {
    schemaVersion: "r4.gate-b.local-format-index.v1",
    approvedPacketSha256: PACKET_SHA,
    sourceSha256: sourceHash,
    formatCount: rows.length,
    formats: rows.map((row) => ({
      schemaVersion: row.schemaVersion,
      locationPattern: locationPattern(row.locationCell),
      bodyFree: ![
        "local_encrypted_response_candidate.v1",
        "guest_capability_input.v1",
        "guest_ask_recovery.v1",
        "guest_agent_token_recovery.v1",
        "guest_agent_token_secret_bundle.v1",
      ].includes(row.schemaVersion),
      workspaceAllowed: locationPattern(row.locationCell)?.startsWith("^workspace/") === true,
      cleanup: cleanupClass(row),
    })),
  };
}

function evidenceSchema() {
  const laneNames = [
    "preflight",
    "gate-a-regression-and-protocol-replay",
    "path-fence",
    "api-and-local-format-schemas",
    "static-sql-and-role-function-contracts",
    "encrypted-field",
    "fake-budget-and-event-fence",
    "fake-only-codex-adapter",
    "native-source-compile-and-unit-tests",
    "aggregate-runner-synthetic-dry-run",
    "static-package-workset-audit",
    "construction-report-and-execution-manifest",
    "cleanup",
  ];
  const laneStatus = { enum: ["NOT_RUN", "GREEN", "YELLOW", "RED"] };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://forme.example/schemas/r4/gate-b-retry-construction-evidence.v1.schema.json",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "status", "verdict", "authority", "commencement", "immutableBindings", "toolchain", "preflightControls", "checkpoints", "lanes", "effectCounts", "constructedFiles"],
    properties: {
      schemaVersion: { const: "r4_gate_b_retry_construction.v1" },
      status: { enum: ["IN_PROGRESS", "COMPLETE"] },
      verdict: { oneOf: [{ type: "null" }, { enum: ["GREEN", "YELLOW", "RED"] }] },
      authority: { type: "object", additionalProperties: false, required: ["retryConstructionPacketSha256", "retryExecutionGrant", "firstProviderCallTestGrant", "authorizedProviderSessions", "authorizedProviderBytes", "authorizedSpendUsd"], properties: { retryConstructionPacketSha256: { $ref: "#/$defs/Sha256" }, retryExecutionGrant: { const: "NOT_REQUESTED" }, firstProviderCallTestGrant: { const: "NOT_REQUESTED" }, authorizedProviderSessions: { const: 0 }, authorizedProviderBytes: { const: 0 }, authorizedSpendUsd: { const: 0 } } },
      commencement: { type: "object", additionalProperties: false, required: ["branch", "commit", "tree", "implementationBaselineCommit", "implementationBaselineTree", "implementationBaselineIsAncestor", "interveningPathsApprovalOrGovernanceOnly", "worktreeClean", "localRemoteTrackingRefMatched"], properties: { branch: { const: "codex/r4-gate-a-build" }, commit: { type: "string", pattern: "^[a-f0-9]{40}$" }, tree: { type: "string", pattern: "^[a-f0-9]{40}$" }, implementationBaselineCommit: { type: "string", pattern: "^[a-f0-9]{40}$" }, implementationBaselineTree: { type: "string", pattern: "^[a-f0-9]{40}$" }, implementationBaselineIsAncestor: { const: true }, interveningPathsApprovalOrGovernanceOnly: { const: true }, worktreeClean: { const: true }, localRemoteTrackingRefMatched: { const: true } } },
      immutableBindings: { type: "object", minProperties: 1, propertyNames: { pattern: "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))[A-Za-z0-9._/-]+$" }, additionalProperties: { $ref: "#/$defs/Sha256" } },
      toolchain: { type: "object" },
      preflightControls: { type: "object" },
      checkpoints: { type: "array", items: { type: "object", required: ["lane", "status"], properties: { lane: { enum: laneNames }, status: laneStatus, assertions: { type: "array", items: { type: "string", pattern: "^[A-Z0-9_-]+$" } }, controlledObservations: { type: "array", items: { type: "string", pattern: "^[A-Z0-9_-]+$" } }, protocolReplay: { type: "object" }, staticAudit: { type: "object" }, testCount: { type: "integer", minimum: 0 }, developmentIterations: { type: "integer", minimum: 1 }, fallbackUsed: { type: "boolean" }, metrics: { type: "object" } }, additionalProperties: false } },
      lanes: { type: "object", additionalProperties: false, required: laneNames, properties: Object.fromEntries(laneNames.map((name) => [name, laneStatus])) },
      effectCounts: { type: "object", additionalProperties: false, required: ["providerSessions", "providerBytes", "spendUsd", "codexThreadStarts", "codexTurnStarts", "realGuestBytes", "externalMessages", "productionWrites", "deploys", "merges", "dockerCommands", "postgresProcesses", "keychainOperations", "userPresencePrompts"], properties: Object.fromEntries(["providerSessions", "providerBytes", "spendUsd", "codexThreadStarts", "codexTurnStarts", "realGuestBytes", "externalMessages", "productionWrites", "deploys", "merges", "dockerCommands", "postgresProcesses", "keychainOperations", "userPresencePrompts"].map((name) => [name, { const: 0 }])) },
      constructedFiles: { type: "object", propertyNames: { pattern: "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))[A-Za-z0-9._/-]+$" }, additionalProperties: { $ref: "#/$defs/Sha256" } },
      cleanup: { type: "object" },
      executionProposal: { type: "object" },
      physicalBoundary: { enum: ["CONTROLLING_AGENT_NOT_KERNEL_SANDBOXED"] },
    },
    $defs: { Sha256: scalarDefs().Sha256 },
  };
}

export function buildContractArtifacts() {
  const operationsBytes = readText("schemas/r4/gate-b/operations.md");
  const localBytes = readText("schemas/r4/gate-b/local-formats.md");
  const inventoryBytes = readText("apps/room/src/operation-inventory.ts");
  const protocolBytes = readText("schemas/r4/protocol.schema.json");
  const protocolIndexBytes = readText("schemas/r4/schema-index.json");
  const protocol = JSON.parse(protocolBytes);
  const protocolIndex = JSON.parse(protocolIndexBytes);
  const inventory = parseInventory(inventoryBytes);
  const operations = parseOperations(operationsBytes, inventory, protocol);
  const api = apiSchema(operations, protocol);
  const apiBytes = jsonBytes(api);
  const localRows = parseLocalFormats(localBytes);
  const local = localSchema(localRows, protocol);
  const localSchemaBytes = jsonBytes(local);
  const index = {
    schemaVersion: "r4.gate-b.api-v1-index.v1",
    approvedPacketSha256: PACKET_SHA,
    operationMapSha256: sha256(operationsBytes),
    operationInventorySha256: sha256(inventoryBytes),
    canonicalProtocolRegistrySha256: sha256(protocolIndexBytes),
    bundleSha256: sha256(apiBytes),
    operationCount: operations.length,
    mutationCount: operations.filter((operation) => operation.mutating).length,
    readCount: operations.filter((operation) => !operation.mutating).length,
    expectedVersionRequiredCount: operations.filter((operation) => operation.expectedVersion).length,
    operations: operations.map((operation) => ({
      action: operation.action,
      method: operation.method,
      path: operation.path,
      actor: operation.actor,
      mutating: operation.mutating,
      expectedVersion: operation.expectedVersion,
      requestRef: `#/$defs/${operation.request.requestName}`,
      resultRefs: operation.resultRefs,
    })),
  };
  const localIndexValue = localIndex(localRows, sha256(localBytes));
  localIndexValue.bundleSha256 = sha256(localSchemaBytes);
  localIndexValue.canonicalProtocolRegistrySha256 = sha256(protocolIndexBytes);
  const artifacts = {
    "schemas/r4/api-v1.schema.json": apiBytes,
    "schemas/r4/api-v1-index.json": jsonBytes(index),
    "schemas/r4/local-formats.schema.json": localSchemaBytes,
    "schemas/r4/local-formats-index.json": jsonBytes(localIndexValue),
    "schemas/r4/gate-b-evidence.schema.json": jsonBytes(evidenceSchema()),
  };
  if (protocolIndex.objectCount !== 39) throw new Error("PROTOCOL_OBJECT_COUNT_MISMATCH");
  return artifacts;
}

export function candidateCleanupOrder() {
  return Object.freeze(["COMMIT_DENY", "DESTROY_KEY", "REMOVE_CIPHERTEXT", "COMMIT_RECEIPT", "REMOVE_TRANSIENT"]);
}

export function reconcileCandidateCleanup(state) {
  const keys = ["denyCommitted", "keyDestroyed", "ciphertextPresent", "receiptCommitted"];
  if (state === null || typeof state !== "object" || Array.isArray(state)) throw new Error("CLEANUP_STATE_INVALID");
  if (Object.keys(state).length !== keys.length || keys.some((key) => typeof state[key] !== "boolean")) {
    throw new Error("CLEANUP_STATE_INVALID");
  }
  if (!state.denyCommitted) return "COMMIT_DENY";
  if (!state.keyDestroyed) return "DESTROY_KEY";
  if (state.ciphertextPresent) return "REMOVE_CIPHERTEXT";
  if (!state.receiptCommitted) return "COMMIT_RECEIPT";
  return "COMPLETE";
}

export function writeCanonicalRecord(root, relativePath, value) {
  const token = normalizePathToken(relativePath, [".codex", "codex-home"]);
  const canonicalRoot = fs.realpathSync(root);
  if (canonicalRoot !== path.resolve(root)) throw new Error("RECORD_ROOT_NOT_CANONICAL");
  const target = path.join(canonicalRoot, ...token.split("/"));
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  fs.chmodSync(parent, 0o700);
  if (fs.existsSync(target)) throw new Error("RECORD_TARGET_EXISTS");
  const pending = `${target}.pending-${sha256(token).slice(7, 19)}`;
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  const descriptor = fs.openSync(pending, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(pending, target);
  const parentDescriptor = fs.openSync(parent, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(parentDescriptor);
  } finally {
    fs.closeSync(parentDescriptor);
  }
  return target;
}

function writeOrCheck(mode) {
  const artifacts = buildContractArtifacts();
  const repositoryRoot = fs.realpathSync(process.cwd());
  const constructionTempRoot = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  if (typeof constructionTempRoot !== "string" || constructionTempRoot.length === 0) {
    throw new Error("CONSTRUCTION_TEMP_ROOT_REQUIRED");
  }
  const fence = createPathFence({
    repositoryRoot,
    constructionTempRoot,
    repositoryAllowlist: [...INPUTS, ...OUTPUTS].map((entry) => ({ path: entry, access: "exact" })),
    tempAllowlist: [{ path: "generated", access: "tree" }],
  });
  for (const input of INPUTS) fence.resolveRepository(input, { kind: "file" });
  const hashes = {};
  for (const output of OUTPUTS) {
    const target = fence.resolveRepository(output, { mustExist: mode === "check", kind: "file" });
    const bytes = artifacts[output];
    if (mode === "write") {
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      fs.writeFileSync(target, bytes, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } else if (fs.readFileSync(target, "utf8") !== bytes) {
      throw new Error("GENERATED_CONTRACT_DRIFT");
    }
    hashes[output] = sha256(bytes);
  }
  process.stdout.write(`${jsonBytes({ status: "GREEN", mode, fileCount: OUTPUTS.length, hashes })}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode !== "write" && mode !== "check") throw new Error("USAGE_WRITE_OR_CHECK");
  writeOrCheck(mode);
}
