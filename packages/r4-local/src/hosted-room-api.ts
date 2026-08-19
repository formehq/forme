import {
  canonicalJson,
  validateHostedPublicationDeliveryV1,
  validateRoomEventAckV1,
} from "../../r4-protocol/src/index.ts";

export const CORE_ROOM_API_ACTIONS = [
  "third_place.list", "projection.read", "public_encounter.issue", "interaction.create",
  "interaction.read", "interaction.delete", "grant_offer.accept", "room.pair.exchange",
  "control.status", "control.interaction.read", "room.create", "room.pair",
  "room.binding.revoke", "projection.revoke", "response.revoke", "grant.revoke",
  "grant_offer.issue", "grant_offer.revoke", "interaction.close", "curation.admit",
  "curation.unlist", "room_operator.status", "room_operator.sync", "room_operator.pull",
  "room_operator.cycle.reserve", "room_operator.cycle.recover", "room_operator.cycle.abandon",
  "room_operator.dispatch.issue", "room_operator.ack", "room_operator.projection.deliver",
  "room_operator.response.deliver", "room_operator.local_purge.receipt",
] as const;

export type CoreRoomApiAction = typeof CORE_ROOM_API_ACTIONS[number];
type Method = "GET" | "POST" | "DELETE";

interface Shape {
  readonly method: Method;
  readonly path: string;
  readonly actor: "public" | "guest_capability" | "controller" | "curator" | "room_operator";
  readonly mutating: boolean;
  readonly expectedVersion: boolean;
  readonly required: readonly string[];
  readonly optional?: readonly string[];
}

export const CORE_ROOM_API_SHAPES: Readonly<Record<CoreRoomApiAction, Shape>> = {
  "third_place.list": { method: "GET", path: "/third-place/projections", actor: "public", mutating: false, expectedVersion: false, required: [] },
  "projection.read": { method: "GET", path: "/projections/:projectionId", actor: "public", mutating: false, expectedVersion: false, required: [] },
  "public_encounter.issue": { method: "POST", path: "/projections/:projectionId/encounters", actor: "public", mutating: true, expectedVersion: true, required: ["encounterSecret"] },
  "interaction.create": { method: "POST", path: "/interactions", actor: "guest_capability", mutating: true, expectedVersion: false, required: ["projectionId", "interactionType", "consent", "requestBody"], optional: ["replySecret", "deleteSecret", "guestCapsule"] },
  "interaction.read": { method: "GET", path: "/interactions/:interactionId", actor: "guest_capability", mutating: false, expectedVersion: false, required: [] },
  "interaction.delete": { method: "DELETE", path: "/interactions/:interactionId", actor: "guest_capability", mutating: true, expectedVersion: true, required: [] },
  "grant_offer.accept": { method: "POST", path: "/grant-offers/:offerId/accept", actor: "guest_capability", mutating: true, expectedVersion: true, required: ["grantSecret"] },
  "room.pair.exchange": { method: "POST", path: "/pairings/:pairingId/exchange", actor: "public", mutating: true, expectedVersion: true, required: ["pairingCode", "clientPublicKey"] },
  "control.status": { method: "GET", path: "/control/status", actor: "controller", mutating: false, expectedVersion: false, required: [] },
  "control.interaction.read": { method: "GET", path: "/control/interactions/:interactionId", actor: "controller", mutating: false, expectedVersion: false, required: [] },
  "room.create": { method: "POST", path: "/control/rooms", actor: "controller", mutating: true, expectedVersion: false, required: ["entityId", "roomKind", "label"] },
  "room.pair": { method: "POST", path: "/control/rooms/:roomId/pairings", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "room.binding.revoke": { method: "POST", path: "/control/room-bindings/:bindingId/revoke", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "projection.revoke": { method: "POST", path: "/control/projections/:projectionId/revoke", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "response.revoke": { method: "POST", path: "/control/responses/:responseId/revoke", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "grant.revoke": { method: "POST", path: "/control/grants/:grantId/revoke", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "grant_offer.issue": { method: "POST", path: "/control/grant-offers", actor: "controller", mutating: true, expectedVersion: false, required: ["sourceInteractionId", "roomId", "projectionId", "presetId", "acceptanceExpiresAt", "offeredGrantExpiresAt"] },
  "grant_offer.revoke": { method: "POST", path: "/control/grant-offers/:offerId/revoke", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "interaction.close": { method: "POST", path: "/control/interactions/:interactionId/close", actor: "controller", mutating: true, expectedVersion: true, required: [] },
  "curation.admit": { method: "POST", path: "/curation/projections/:projectionId/admit", actor: "curator", mutating: true, expectedVersion: true, required: [] },
  "curation.unlist": { method: "POST", path: "/curation/projections/:projectionId/unlist", actor: "curator", mutating: true, expectedVersion: true, required: [] },
  "room_operator.status": { method: "GET", path: "/room-operator/status", actor: "room_operator", mutating: false, expectedVersion: false, required: ["roomId"] },
  "room_operator.sync": { method: "POST", path: "/room-operator/sync", actor: "room_operator", mutating: true, expectedVersion: false, required: ["roomId", "afterSequence"] },
  "room_operator.pull": { method: "POST", path: "/room-operator/interactions/:interactionId/pull", actor: "room_operator", mutating: true, expectedVersion: true, required: [] },
  "room_operator.cycle.reserve": { method: "POST", path: "/room-operator/interactions/:interactionId/cycle/reserve", actor: "room_operator", mutating: true, expectedVersion: true, required: ["startAuthorizationHash", "sessionEnvelopeHash"] },
  "room_operator.cycle.recover": { method: "POST", path: "/room-operator/interactions/:interactionId/cycle/recover", actor: "room_operator", mutating: true, expectedVersion: true, required: ["reservationId", "startAuthorizationHash", "sessionEnvelopeHash"] },
  "room_operator.cycle.abandon": { method: "POST", path: "/room-operator/interactions/:interactionId/cycle/abandon", actor: "room_operator", mutating: true, expectedVersion: true, required: ["reservationId", "startAuthorizationHash", "sessionEnvelopeHash", "transportJournalDispatches"] },
  "room_operator.dispatch.issue": { method: "POST", path: "/room-operator/interactions/:interactionId/dispatch-permits", actor: "room_operator", mutating: true, expectedVersion: true, required: ["reservationId", "sessionEnvelopeHash", "startAuthorizationHash", "provider", "model", "payloadHash", "ordinal"] },
  "room_operator.ack": { method: "POST", path: "/room-operator/events/ack", actor: "room_operator", mutating: true, expectedVersion: false, required: ["schemaVersion", "roomId", "eventId", "sequence", "eventHash", "idempotencyKey"] },
  "room_operator.projection.deliver": { method: "POST", path: "/room-operator/projections/deliver", actor: "room_operator", mutating: true, expectedVersion: true, required: ["delivery"] },
  "room_operator.response.deliver": { method: "POST", path: "/room-operator/responses/deliver", actor: "room_operator", mutating: true, expectedVersion: true, required: ["delivery"] },
  "room_operator.local_purge.receipt": { method: "POST", path: "/room-operator/interactions/:interactionId/local-purge", actor: "room_operator", mutating: true, expectedVersion: true, required: ["localBytesAbsent"] },
};

export interface CoreRoomApiCapabilityV1 {
  readonly bearer: string | null;
  readonly syntheticActor: "controller" | "curator" | "room_operator" | null;
  readonly idempotencyKey: string | null;
  readonly expectedVersion: number | null;
  readonly syntheticClientBucket: string | null;
}

export interface CoreRoomApiSecureInputV1 {
  readonly schemaVersion: "forme.room.core-api-input.v1";
  readonly pathParams: Readonly<Record<string, string>>;
  readonly request: Readonly<Record<string, unknown>>;
  readonly capability: CoreRoomApiCapabilityV1;
}

export interface CoreHostedHttpPlanV1 {
  readonly schemaVersion: "forme.room.core-http-plan.v1";
  readonly action: CoreRoomApiAction;
  readonly method: Method;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | null;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = [], label: string): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(`${label} has an unknown or missing field`);
  }
}

function coreAction(value: string): CoreRoomApiAction {
  if (!(CORE_ROOM_API_ACTIONS as readonly string[]).includes(value)) throw new Error("Core Room API action is unavailable");
  return value as CoreRoomApiAction;
}

function canonicalCapability(value: unknown): CoreRoomApiCapabilityV1 {
  const input = record(value, "Core Room API capability");
  exactKeys(input, ["bearer", "syntheticActor", "idempotencyKey", "expectedVersion", "syntheticClientBucket"], [], "Core Room API capability");
  const bearer = input.bearer;
  if (bearer !== null && (typeof bearer !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(bearer))) throw new Error("Core Room API bearer is invalid");
  const actor = input.syntheticActor;
  if (actor !== null && actor !== "controller" && actor !== "curator" && actor !== "room_operator") throw new Error("Core Room API actor is invalid");
  const idempotencyKey = input.idempotencyKey;
  if (idempotencyKey !== null && (typeof idempotencyKey !== "string" || !/^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$/u.test(idempotencyKey))) throw new Error("Core Room API idempotency key is invalid");
  const expectedVersion = input.expectedVersion;
  if (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || Number(expectedVersion) < 0)) throw new Error("Core Room API expected version is invalid");
  const bucket = input.syntheticClientBucket;
  if (bucket !== null && (typeof bucket !== "string" || bucket.length < 1 || Buffer.byteLength(bucket, "utf8") > 128)) throw new Error("Core Room API client bucket is invalid");
  return {
    bearer: bearer as string | null,
    syntheticActor: actor as CoreRoomApiCapabilityV1["syntheticActor"],
    idempotencyKey: idempotencyKey as string | null,
    expectedVersion: expectedVersion as number | null,
    syntheticClientBucket: bucket as string | null,
  };
}

export function parseCoreRoomApiSecureInput(actionValue: string, value: unknown): {
  readonly action: CoreRoomApiAction;
  readonly input: CoreRoomApiSecureInputV1;
} {
  const action = coreAction(actionValue);
  const shape = CORE_ROOM_API_SHAPES[action];
  const outer = record(value, "Core Room API input");
  exactKeys(outer, ["schemaVersion", "pathParams", "request", "capability"], [], "Core Room API input");
  if (outer.schemaVersion !== "forme.room.core-api-input.v1") throw new Error("Core Room API schemaVersion is invalid");
  const pathParams = record(outer.pathParams, "Core Room API pathParams");
  const requiredParams = [...shape.path.matchAll(/:([^/]+)/gu)].map((match) => match[1] ?? "");
  exactKeys(pathParams, requiredParams, [], "Core Room API pathParams");
  for (const [key, pathValue] of Object.entries(pathParams)) {
    if (typeof pathValue !== "string" || !/^[A-Za-z0-9_-]{1,160}$/u.test(pathValue)) throw new Error(`Core Room API path parameter ${key} is invalid`);
  }
  const request = record(outer.request, "Core Room API request");
  exactKeys(request, shape.required, shape.optional ?? [], "Core Room API request");
  const capability = canonicalCapability(outer.capability);
  const requiredActor = shape.actor === "controller" || shape.actor === "curator" || shape.actor === "room_operator" ? shape.actor : null;
  if (capability.syntheticActor !== requiredActor) throw new Error("Core Room API actor does not match the operation");
  const needsBearer = shape.actor === "guest_capability" || shape.actor === "room_operator";
  if ((capability.bearer !== null) !== needsBearer) throw new Error("Core Room API bearer does not match the operation");
  if ((capability.idempotencyKey !== null) !== shape.mutating) throw new Error("Core Room API idempotency key does not match the operation");
  if (shape.expectedVersion && capability.expectedVersion === null) throw new Error("Core Room API expected version is required");
  if (!shape.expectedVersion && capability.expectedVersion !== null && !shape.mutating) throw new Error("Core Room API read cannot carry expected version");
  if ((capability.syntheticClientBucket !== null) !== (action === "public_encounter.issue")) throw new Error("Core Room API client bucket does not match the operation");
  if (action === "room.create" && request.roomKind !== "third_place_public") throw new Error("Core creates public Rooms only");
  return {
    action,
    input: {
      schemaVersion: "forme.room.core-api-input.v1",
      pathParams: pathParams as Record<string, string>,
      request,
      capability,
    },
  };
}

export function buildCoreHostedHttpPlan(
  fixedBaseUrl: string,
  actionValue: string,
  value: unknown,
): CoreHostedHttpPlanV1 {
  if (!/^https?:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/u.test(fixedBaseUrl)) throw new Error("Core Room API base URL is not a fixed origin");
  const { action, input } = parseCoreRoomApiSecureInput(actionValue, value);
  const shape = CORE_ROOM_API_SHAPES[action];
  let relative = shape.path;
  for (const [key, pathValue] of Object.entries(input.pathParams)) relative = relative.replace(`:${key}`, encodeURIComponent(pathValue));
  if (relative.includes(":")) throw new Error("Core Room API path is incomplete");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.capability.bearer !== null) headers.Authorization = `Bearer ${input.capability.bearer}`;
  if (input.capability.syntheticActor !== null) headers["X-Forme-Synthetic-Actor"] = input.capability.syntheticActor;
  if (input.capability.idempotencyKey !== null) headers["Idempotency-Key"] = input.capability.idempotencyKey;
  if (input.capability.expectedVersion !== null) headers["If-Match"] = String(input.capability.expectedVersion);
  if (input.capability.syntheticClientBucket !== null) headers["X-Forme-Synthetic-Client-Bucket"] = input.capability.syntheticClientBucket;
  let body: string | null = null;
  let url = `${fixedBaseUrl}/api/v1${relative}`;
  if (shape.method === "GET") {
    const query = new URLSearchParams();
    for (const [key, requestValue] of Object.entries(input.request).sort(([left], [right]) => left.localeCompare(right))) {
      if (typeof requestValue !== "string" && typeof requestValue !== "number") throw new Error("Core Room API GET value is invalid");
      query.set(key, String(requestValue));
    }
    const encoded = query.toString();
    if (encoded) url += `?${encoded}`;
  } else {
    headers["Content-Type"] = "application/json";
    body = canonicalJson(input.request);
  }
  return Object.freeze({ schemaVersion: "forme.room.core-http-plan.v1", action, method: shape.method, url, headers: Object.freeze(headers), body });
}

/**
 * The production local connector is intentionally narrower than the synthetic
 * Core inventory. It covers only the #67 public Projection/knock walking slice.
 * Fresh, Response, Grant, Private Room, notification, Controller, and Curator
 * operations have no production connector route here.
 */
export const PRODUCTION_PUBLIC_ROOM_OPERATOR_ACTIONS = [
  "room_operator.status",
  "room_operator.sync",
  "room_operator.pull",
  "room_operator.ack",
  "room_operator.projection.deliver",
  "room_operator.local_purge.receipt",
] as const;

export type ProductionPublicRoomOperatorAction = typeof PRODUCTION_PUBLIC_ROOM_OPERATOR_ACTIONS[number];

interface ProductionShape {
  readonly method: Method;
  readonly path: string;
  readonly mutating: boolean;
  readonly expectedVersion: boolean;
  readonly required: readonly string[];
}

const PRODUCTION_PUBLIC_ROOM_OPERATOR_SHAPES: Readonly<Record<ProductionPublicRoomOperatorAction, ProductionShape>> = {
  "room_operator.status": {
    method: "GET",
    path: "/room-operator/status",
    mutating: false,
    expectedVersion: false,
    required: ["roomId"],
  },
  "room_operator.sync": {
    method: "POST",
    path: "/room-operator/sync",
    mutating: true,
    expectedVersion: false,
    required: ["roomId", "afterSequence"],
  },
  "room_operator.pull": {
    method: "POST",
    path: "/room-operator/interactions/:interactionId/pull",
    mutating: true,
    expectedVersion: true,
    required: [],
  },
  "room_operator.ack": {
    method: "POST",
    path: "/room-operator/events/ack",
    mutating: true,
    expectedVersion: false,
    required: ["schemaVersion", "roomId", "eventId", "sequence", "eventHash", "idempotencyKey"],
  },
  "room_operator.projection.deliver": {
    method: "POST",
    path: "/room-operator/projections/deliver",
    mutating: true,
    expectedVersion: true,
    required: ["delivery"],
  },
  "room_operator.local_purge.receipt": {
    method: "POST",
    path: "/room-operator/interactions/:interactionId/local-purge",
    mutating: true,
    expectedVersion: true,
    required: ["localBytesAbsent"],
  },
};

export interface ProductionPublicRoomOperatorInputV1 {
  readonly schemaVersion: "forme.room.production-public-operator-input.v1";
  /** Selects one exact public Room binding from the injected credential vault. */
  readonly roomId: string;
  readonly pathParams: Readonly<Record<string, string>>;
  readonly request: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string | null;
  readonly expectedVersion: number | null;
}

export interface ProductionHostedHttpPlanV1 {
  readonly schemaVersion: "forme.room.production-http-plan.v1";
  readonly action: ProductionPublicRoomOperatorAction | "room.pair.exchange";
  readonly networkDirection: "outbound_only";
  readonly redirectPolicy: "error";
  readonly method: Method;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | null;
  /** Sensitive bytes are supplied only through the injected transport lane. */
  readonly sensitiveBody: "pairing_exchange" | null;
}

export interface ProductionPairingExchangeInputV1 {
  readonly schemaVersion: "forme.room.production-pairing-exchange-input.v1";
  /** Local bootstrap intent; the returned binding must independently confirm it. */
  readonly roomId: string;
  readonly pairingId: string;
  readonly pairingCode: string;
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
}

const ROOM_ID = /^room_[A-Za-z0-9_-]{16,128}$/u;
const INTERACTION_ID = /^interaction_[A-Za-z0-9_-]{16,128}$/u;
const PAIRING_ID = /^pairing_[A-Za-z0-9_-]{16,128}$/u;
const IDEMPOTENCY_KEY = /^(?:[A-Fa-f0-9]{32,256}|[A-Za-z0-9_-]{22,256})$/u;

function productionDeny(code: string): never {
  throw new Error(code);
}

function productionRoomId(value: unknown): string {
  if (typeof value !== "string" || !ROOM_ID.test(value)) productionDeny("PRODUCTION_ROOM_ID_INVALID");
  return value;
}

function productionIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !IDEMPOTENCY_KEY.test(value)) {
    productionDeny("PRODUCTION_ROOM_IDEMPOTENCY_KEY_INVALID");
  }
  return value;
}

function productionExpectedVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) productionDeny("PRODUCTION_ROOM_EXPECTED_VERSION_INVALID");
  return Number(value);
}

export function fixedProductionHttpsOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    productionDeny("PRODUCTION_ROOM_ORIGIN_INVALID");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.pathname !== "/"
    || parsed.search !== ""
    || parsed.hash !== ""
    || parsed.hostname.length === 0
  ) productionDeny("PRODUCTION_ROOM_ORIGIN_INVALID");
  if (value !== parsed.origin && value !== `${parsed.origin}/`) productionDeny("PRODUCTION_ROOM_ORIGIN_INVALID");
  return parsed.origin;
}

function productionAction(value: string): ProductionPublicRoomOperatorAction {
  if (!(PRODUCTION_PUBLIC_ROOM_OPERATOR_ACTIONS as readonly string[]).includes(value)) {
    productionDeny("PRODUCTION_ROOM_ACTION_NOT_ALLOWED");
  }
  return value as ProductionPublicRoomOperatorAction;
}

function productionPathParams(shape: ProductionShape, value: unknown): Readonly<Record<string, string>> {
  const params = record(value, "Production Room pathParams");
  const required = [...shape.path.matchAll(/:([^/]+)/gu)].map((match) => match[1] ?? "");
  exactKeys(params, required, [], "Production Room pathParams");
  for (const [key, pathValue] of Object.entries(params)) {
    if (typeof pathValue !== "string" || !/^[A-Za-z0-9_-]{1,160}$/u.test(pathValue)) {
      productionDeny("PRODUCTION_ROOM_PATH_PARAMETER_INVALID");
    }
    if (key === "interactionId" && !INTERACTION_ID.test(pathValue)) {
      productionDeny("PRODUCTION_ROOM_PATH_PARAMETER_INVALID");
    }
  }
  return Object.freeze({ ...params } as Record<string, string>);
}

export function parseProductionPublicRoomOperatorInput(actionValue: string, value: unknown): {
  readonly action: ProductionPublicRoomOperatorAction;
  readonly input: ProductionPublicRoomOperatorInputV1;
} {
  const action = productionAction(actionValue);
  const shape = PRODUCTION_PUBLIC_ROOM_OPERATOR_SHAPES[action];
  const outer = record(value, "Production Room input");
  exactKeys(
    outer,
    ["schemaVersion", "roomId", "pathParams", "request", "idempotencyKey", "expectedVersion"],
    [],
    "Production Room input",
  );
  if (outer.schemaVersion !== "forme.room.production-public-operator-input.v1") {
    productionDeny("PRODUCTION_ROOM_INPUT_SCHEMA_INVALID");
  }
  const roomId = productionRoomId(outer.roomId);
  const pathParams = productionPathParams(shape, outer.pathParams);
  const rawRequest = record(outer.request, "Production Room request");
  exactKeys(rawRequest, shape.required, [], "Production Room request");

  let request: Readonly<Record<string, unknown>> = Object.freeze({ ...rawRequest });
  if (action === "room_operator.status" || action === "room_operator.sync") {
    if (rawRequest.roomId !== roomId) productionDeny("PRODUCTION_ROOM_BINDING_MISMATCH");
  }
  if (action === "room_operator.sync") {
    if (!Number.isSafeInteger(rawRequest.afterSequence) || Number(rawRequest.afterSequence) < 0) {
      productionDeny("PRODUCTION_ROOM_CURSOR_INVALID");
    }
  }
  if (action === "room_operator.ack") {
    let ack;
    try {
      ack = validateRoomEventAckV1(rawRequest);
    } catch {
      productionDeny("PRODUCTION_ROOM_ACK_INVALID");
    }
    if (ack.roomId !== roomId) productionDeny("PRODUCTION_ROOM_BINDING_MISMATCH");
    request = Object.freeze({ ...ack });
  }
  if (action === "room_operator.local_purge.receipt" && rawRequest.localBytesAbsent !== true) {
    productionDeny("PRODUCTION_ROOM_LOCAL_PURGE_ATTESTATION_INVALID");
  }
  if (action === "room_operator.projection.deliver") {
    let delivery;
    try {
      delivery = validateHostedPublicationDeliveryV1(rawRequest.delivery);
    } catch {
      productionDeny("PRODUCTION_ROOM_PROJECTION_DELIVERY_INVALID");
    }
    if (
      delivery.artifactClass !== "projection"
      || delivery.projection === null
      || delivery.response !== null
      || delivery.projection.roomId !== roomId
      || delivery.attestation.roomId !== roomId
    ) productionDeny("PRODUCTION_ROOM_PROJECTION_DELIVERY_INVALID");
    request = Object.freeze({ delivery });
  }

  const idempotencyKey = outer.idempotencyKey === null ? null : productionIdempotencyKey(outer.idempotencyKey);
  const expectedVersion = outer.expectedVersion === null ? null : productionExpectedVersion(outer.expectedVersion);
  if ((idempotencyKey !== null) !== shape.mutating) productionDeny("PRODUCTION_ROOM_IDEMPOTENCY_MISMATCH");
  if ((expectedVersion !== null) !== shape.expectedVersion) productionDeny("PRODUCTION_ROOM_EXPECTED_VERSION_MISMATCH");
  if (action === "room_operator.ack" && request.idempotencyKey !== idempotencyKey) {
    productionDeny("PRODUCTION_ROOM_ACK_IDEMPOTENCY_MISMATCH");
  }

  return Object.freeze({
    action,
    input: Object.freeze({
      schemaVersion: "forme.room.production-public-operator-input.v1",
      roomId,
      pathParams,
      request,
      idempotencyKey,
      expectedVersion,
    }),
  });
}

function buildProductionPlan(input: {
  readonly fixedOrigin: string;
  readonly action: ProductionPublicRoomOperatorAction | "room.pair.exchange";
  readonly method: Method;
  readonly relativePath: string;
  readonly request: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly expectedVersion: number | null;
  readonly sensitiveBody?: "pairing_exchange" | null;
}): ProductionHostedHttpPlanV1 {
  const origin = fixedProductionHttpsOrigin(input.fixedOrigin);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.idempotencyKey !== "") headers["Idempotency-Key"] = productionIdempotencyKey(input.idempotencyKey);
  if (input.expectedVersion !== null) headers["If-Match"] = String(productionExpectedVersion(input.expectedVersion));
  let url = `${origin}/api/v1${input.relativePath}`;
  let body: string | null = null;
  if (input.method === "GET") {
    const query = new URLSearchParams();
    for (const [key, requestValue] of Object.entries(input.request).sort(([left], [right]) => left.localeCompare(right))) {
      if (typeof requestValue !== "string" && typeof requestValue !== "number") {
        productionDeny("PRODUCTION_ROOM_GET_VALUE_INVALID");
      }
      query.set(key, String(requestValue));
    }
    const encoded = query.toString();
    if (encoded !== "") url += `?${encoded}`;
  } else if ((input.sensitiveBody ?? null) === null) {
    headers["Content-Type"] = "application/json";
    body = canonicalJson(input.request);
  } else {
    headers["Content-Type"] = "application/json";
  }
  return Object.freeze({
    schemaVersion: "forme.room.production-http-plan.v1",
    action: input.action,
    networkDirection: "outbound_only",
    redirectPolicy: "error",
    method: input.method,
    url,
    headers: Object.freeze(headers),
    body,
    sensitiveBody: input.sensitiveBody ?? null,
  });
}

export function buildProductionPublicRoomOperatorHttpPlan(
  fixedOrigin: string,
  actionValue: string,
  value: unknown,
): ProductionHostedHttpPlanV1 {
  const parsed = parseProductionPublicRoomOperatorInput(actionValue, value);
  const shape = PRODUCTION_PUBLIC_ROOM_OPERATOR_SHAPES[parsed.action];
  let relativePath = shape.path;
  for (const [key, pathValue] of Object.entries(parsed.input.pathParams)) {
    relativePath = relativePath.replace(`:${key}`, encodeURIComponent(pathValue));
  }
  if (relativePath.includes(":")) productionDeny("PRODUCTION_ROOM_PATH_PARAMETER_INVALID");
  return buildProductionPlan({
    fixedOrigin,
    action: parsed.action,
    method: shape.method,
    relativePath,
    request: parsed.input.request,
    idempotencyKey: parsed.input.idempotencyKey ?? "",
    expectedVersion: parsed.input.expectedVersion,
    sensitiveBody: null,
  });
}

export function parseProductionPairingExchangeInput(value: unknown): ProductionPairingExchangeInputV1 {
  const input = record(value, "Production Room pairing input");
  exactKeys(
    input,
    ["schemaVersion", "roomId", "pairingId", "pairingCode", "idempotencyKey", "expectedVersion"],
    [],
    "Production Room pairing input",
  );
  if (input.schemaVersion !== "forme.room.production-pairing-exchange-input.v1") {
    productionDeny("PRODUCTION_ROOM_PAIRING_INPUT_INVALID");
  }
  if (typeof input.pairingId !== "string" || !PAIRING_ID.test(input.pairingId)) {
    productionDeny("PRODUCTION_ROOM_PAIRING_INPUT_INVALID");
  }
  if (
    typeof input.pairingCode !== "string"
    || input.pairingCode.length < 16
    || Buffer.byteLength(input.pairingCode, "utf8") > 128
  ) productionDeny("PRODUCTION_ROOM_PAIRING_INPUT_INVALID");
  return Object.freeze({
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: productionRoomId(input.roomId),
    pairingId: input.pairingId,
    pairingCode: input.pairingCode,
    idempotencyKey: productionIdempotencyKey(input.idempotencyKey),
    expectedVersion: productionExpectedVersion(input.expectedVersion),
  });
}

export function buildProductionPairingExchangeHttpPlan(
  fixedOrigin: string,
  value: unknown,
): ProductionHostedHttpPlanV1 {
  const input = parseProductionPairingExchangeInput(value);
  return buildProductionPlan({
    fixedOrigin,
    action: "room.pair.exchange",
    method: "POST",
    relativePath: `/pairings/${encodeURIComponent(input.pairingId)}/exchange`,
    request: Object.freeze({}),
    idempotencyKey: input.idempotencyKey,
    expectedVersion: input.expectedVersion,
    sensitiveBody: "pairing_exchange",
  });
}
