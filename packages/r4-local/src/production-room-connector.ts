import { canonicalSha256 } from "../../r4-protocol/src/index.ts";
import { assertBodyFree } from "./body-free.ts";
import {
  ExactPublicRoomBindingCredentialV1,
  type ProductionBearerAuthorizationV1,
  ProductionPairingExchangeAuthorizationV1,
  type PreparedPublicRoomPairingV1,
  type ProductionPairingExchangeEnvelopeV1,
  type ProductionRoomCredentialVaultV1,
} from "./credential-vault.ts";
import {
  buildProductionPairingExchangeHttpPlan,
  buildProductionPublicRoomOperatorHttpPlan,
  fixedProductionHttpsOrigin,
  parseProductionPairingExchangeInput,
  parseProductionPublicRoomOperatorInput,
  type ProductionHostedHttpPlanV1,
  type ProductionPairingExchangeInputV1,
  type ProductionPublicRoomOperatorAction,
  type ProductionPublicRoomOperatorInputV1,
} from "./hosted-room-api.ts";

export interface ProductionRoomTransportResponseV1 {
  readonly status: number;
  readonly payload: unknown;
}

/**
 * There is deliberately no fetch/socket implementation in this package. A
 * Gate-C host must inject one adapter and explicitly apply the sensitive
 * authorization object to the one outbound request.
 */
export interface ProductionRoomTransportV1 {
  dispatch(
    plan: ProductionHostedHttpPlanV1,
    authorization: ProductionBearerAuthorizationV1 | ProductionPairingExchangeAuthorizationV1 | null,
  ): Promise<ProductionRoomTransportResponseV1>;
}

export interface ProductionRoomConnectorResultV1 {
  readonly schemaVersion: "forme.room.production-connector-result.v1";
  readonly action: ProductionPublicRoomOperatorAction | "room.pair.exchange";
  readonly status: number;
  /** May contain the exact pulled Interaction; it is never sent to diagnostics. */
  readonly payload: unknown;
}

export interface ProductionRoomConnectorDiagnosticV1 {
  readonly schemaVersion: "forme.room.production-connector-diagnostic.v1";
  readonly operation: ProductionPublicRoomOperatorAction | "room.pair.exchange";
  readonly roomId: string;
  readonly requestHash: `sha256:${string}`;
  readonly expectedVersion: number | null;
  readonly httpStatus: number | null;
  readonly outcome:
    | "accepted"
    | "rejected"
    | "binding_unavailable"
    | "request_denied"
    | "transport_unavailable";
}

export type ProductionRoomConnectorErrorCode =
  | "PRODUCTION_ROOM_REQUEST_INVALID"
  | "PRODUCTION_ROOM_BINDING_UNAVAILABLE"
  | "PRODUCTION_ROOM_REQUEST_DENIED"
  | "PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE"
  | "PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID"
  | "PRODUCTION_ROOM_DIAGNOSTIC_UNAVAILABLE";

const MAXIMUM_PAIRING_CLOCK_SKEW_MILLISECONDS = 30_000;
const MAXIMUM_PAIRING_ATTEMPT_MILLISECONDS = 10 * 60 * 1_000;

export class ProductionRoomConnectorError extends Error {
  readonly code: ProductionRoomConnectorErrorCode;

  constructor(code: ProductionRoomConnectorErrorCode) {
    super(code);
    this.name = "ProductionRoomConnectorError";
    this.code = code;
  }
}

export interface ProductionRoomConnectorOptionsV1 {
  readonly fixedOrigin: string;
  readonly vault: ProductionRoomCredentialVaultV1;
  readonly transport: ProductionRoomTransportV1;
  readonly now?: () => Date;
  readonly diagnostic?: (value: ProductionRoomConnectorDiagnosticV1) => void;
}

function connectorError(code: ProductionRoomConnectorErrorCode): ProductionRoomConnectorError {
  return new ProductionRoomConnectorError(code);
}

function exactNow(value: Date): string {
  const milliseconds = value.getTime();
  if (!Number.isFinite(milliseconds)) throw connectorError("PRODUCTION_ROOM_REQUEST_INVALID");
  return value.toISOString();
}

function transportResponse(value: unknown): ProductionRoomTransportResponseV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  }
  const response = value as Partial<ProductionRoomTransportResponseV1>;
  if (!Number.isInteger(response.status) || (response.status ?? 0) < 100 || (response.status ?? 0) > 599) {
    throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  }
  if (!Object.hasOwn(value, "payload")) throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  return { status: response.status as number, payload: response.payload };
}

function exactPairingTimestamp(value: unknown): string {
  if (typeof value !== "string") throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  }
  return value;
}

function pairingResponseBindsIntent(
  response: ProductionRoomTransportResponseV1,
  input: ProductionPairingExchangeInputV1,
  prepared: PreparedPublicRoomPairingV1,
  startedAt: string,
  responseObservedAt: string,
): ProductionPairingExchangeEnvelopeV1 | null {
  if (response.status < 200 || response.status >= 300) return null;
  if (response.payload === null || typeof response.payload !== "object" || Array.isArray(response.payload)) {
    throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  }
  const payload = response.payload as Record<string, unknown>;
  const exactKeys = [
    "schemaVersion", "pairingId", "bindingId", "roomId", "clientPublicKeyHash",
    "pairedAt", "expiresAt", "sealedCredential", "version", "receiptSha256",
  ];
  if (
    Object.keys(payload).length !== exactKeys.length
    || Object.keys(payload).some((key) => !exactKeys.includes(key))
    || payload.schemaVersion !== "forme.room.production-pairing-exchange-result.v1"
    || payload.roomId !== input.roomId
    || payload.pairingId !== input.pairingId
    || typeof payload.bindingId !== "string"
    || !/^binding_[A-Za-z0-9_-]{16,128}$/u.test(payload.bindingId)
    || payload.clientPublicKeyHash !== canonicalSha256(prepared.clientPublicKey)
    || typeof payload.sealedCredential !== "string"
    || !/^[A-Za-z0-9_-]{43,32768}$/u.test(payload.sealedCredential)
    || !Number.isSafeInteger(payload.version)
    || Number(payload.version) < 1
    || typeof payload.receiptSha256 !== "string"
    || !/^sha256:[0-9a-f]{64}$/u.test(payload.receiptSha256)
  ) {
    throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  }
  const pairedAt = exactPairingTimestamp(payload.pairedAt);
  const expiresAt = exactPairingTimestamp(payload.expiresAt);
  const startedMilliseconds = Date.parse(startedAt);
  const responseMilliseconds = Date.parse(responseObservedAt);
  const preparedMilliseconds = Date.parse(prepared.preparedAt);
  const preparationExpiryMilliseconds = Date.parse(prepared.expiresAt);
  const pairedMilliseconds = Date.parse(pairedAt);
  const expiresMilliseconds = Date.parse(expiresAt);
  if (
    responseMilliseconds < startedMilliseconds
    || responseMilliseconds - startedMilliseconds > MAXIMUM_PAIRING_ATTEMPT_MILLISECONDS
    || responseMilliseconds >= preparationExpiryMilliseconds
    || expiresMilliseconds <= pairedMilliseconds
    || expiresMilliseconds - pairedMilliseconds > 30 * 24 * 60 * 60 * 1_000
    || pairedMilliseconds < preparedMilliseconds - MAXIMUM_PAIRING_CLOCK_SKEW_MILLISECONDS
    || pairedMilliseconds > responseMilliseconds + MAXIMUM_PAIRING_CLOCK_SKEW_MILLISECONDS
    || responseMilliseconds >= expiresMilliseconds
    || responseMilliseconds - pairedMilliseconds
      > MAXIMUM_PAIRING_ATTEMPT_MILLISECONDS + MAXIMUM_PAIRING_CLOCK_SKEW_MILLISECONDS
  ) throw connectorError("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
  return Object.freeze({
    schemaVersion: "forme.room.production-pairing-exchange-result.v1",
    pairingId: input.pairingId,
    bindingId: payload.bindingId,
    roomId: input.roomId,
    clientPublicKeyHash: payload.clientPublicKeyHash as `sha256:${string}`,
    pairedAt,
    expiresAt,
    sealedCredential: payload.sealedCredential,
    version: Number(payload.version),
    receiptSha256: payload.receiptSha256 as `sha256:${string}`,
  });
}

function exactPreparedPairing(
  value: unknown,
  input: ProductionPairingExchangeInputV1,
  observedAt: string,
): PreparedPublicRoomPairingV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
  }
  const prepared = value as Record<string, unknown>;
  const keys = [
    "schemaVersion", "roomId", "pairingId", "idempotencyKey", "clientPublicKey", "preparedAt", "expiresAt",
  ];
  if (
    Object.keys(prepared).length !== keys.length
    || Object.keys(prepared).some((key) => !keys.includes(key))
    || prepared.schemaVersion !== "forme.room.prepared-public-pairing.v1"
    || prepared.roomId !== input.roomId
    || prepared.pairingId !== input.pairingId
    || prepared.idempotencyKey !== input.idempotencyKey
    || typeof prepared.clientPublicKey !== "string"
    || prepared.clientPublicKey.length < 16
    || Buffer.byteLength(prepared.clientPublicKey, "utf8") > 4_096
  ) throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
  const preparedAt = exactPairingTimestamp(prepared.preparedAt);
  const expiresAt = exactPairingTimestamp(prepared.expiresAt);
  if (
    Date.parse(preparedAt) > Date.parse(observedAt)
    || Date.parse(observedAt) >= Date.parse(expiresAt)
    || Date.parse(expiresAt) - Date.parse(preparedAt) > 10 * 60 * 1_000
  ) throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
  return Object.freeze({
    schemaVersion: "forme.room.prepared-public-pairing.v1",
    roomId: input.roomId,
    pairingId: input.pairingId,
    idempotencyKey: input.idempotencyKey,
    clientPublicKey: prepared.clientPublicKey,
    preparedAt,
    expiresAt,
  });
}

function assertPairingBindingUsable(
  binding: ExactPublicRoomBindingCredentialV1,
  roomId: string,
  observedAt: string,
): void {
  const observedMilliseconds = Date.parse(observedAt);
  const pairedMilliseconds = Date.parse(binding.pairedAt);
  if (pairedMilliseconds - observedMilliseconds > MAXIMUM_PAIRING_CLOCK_SKEW_MILLISECONDS) {
    throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
  }
  binding.assertUsableFor(
    roomId,
    new Date(Math.max(observedMilliseconds, pairedMilliseconds)).toISOString(),
  );
}

export class ProductionPublicRoomConnectorV1 {
  readonly fixedOrigin: string;
  readonly #vault: ProductionRoomCredentialVaultV1;
  readonly #transport: ProductionRoomTransportV1;
  readonly #now: () => Date;
  readonly #diagnostic: ((value: ProductionRoomConnectorDiagnosticV1) => void) | null;

  constructor(options: ProductionRoomConnectorOptionsV1) {
    this.fixedOrigin = fixedProductionHttpsOrigin(options.fixedOrigin);
    if (
      options.vault === null
      || typeof options.vault !== "object"
      || typeof options.vault.readExactPublicRoomBinding !== "function"
      || typeof options.vault.preparePublicRoomPairing !== "function"
      || typeof options.vault.commitPairedPublicRoomBinding !== "function"
      || options.transport === null
      || typeof options.transport !== "object"
      || typeof options.transport.dispatch !== "function"
      || (options.now !== undefined && typeof options.now !== "function")
      || (options.diagnostic !== undefined && typeof options.diagnostic !== "function")
    ) throw connectorError("PRODUCTION_ROOM_REQUEST_INVALID");
    this.#vault = options.vault;
    this.#transport = options.transport;
    this.#now = options.now ?? (() => new Date());
    this.#diagnostic = options.diagnostic ?? null;
  }

  #emit(value: ProductionRoomConnectorDiagnosticV1): void {
    assertBodyFree(value);
    if (this.#diagnostic === null) return;
    try {
      this.#diagnostic(Object.freeze({ ...value }));
    } catch {
      throw connectorError("PRODUCTION_ROOM_DIAGNOSTIC_UNAVAILABLE");
    }
  }

  #diagnosticValue(input: {
    operation: ProductionPublicRoomOperatorAction | "room.pair.exchange";
    roomId: string;
    requestHash: `sha256:${string}`;
    expectedVersion: number | null;
    httpStatus: number | null;
    outcome: ProductionRoomConnectorDiagnosticV1["outcome"];
  }): ProductionRoomConnectorDiagnosticV1 {
    return Object.freeze({
      schemaVersion: "forme.room.production-connector-diagnostic.v1",
      ...input,
    });
  }

  async call(
    actionValue: string,
    value: ProductionPublicRoomOperatorInputV1 | unknown,
  ): Promise<ProductionRoomConnectorResultV1> {
    let parsed: ReturnType<typeof parseProductionPublicRoomOperatorInput>;
    try {
      parsed = parseProductionPublicRoomOperatorInput(actionValue, value);
    } catch {
      throw connectorError("PRODUCTION_ROOM_REQUEST_INVALID");
    }
    const requestHash = canonicalSha256({ action: parsed.action, input: parsed.input });
    const common = {
      operation: parsed.action,
      roomId: parsed.input.roomId,
      requestHash,
      expectedVersion: parsed.input.expectedVersion,
    } as const;

    let binding;
    try {
      binding = await this.#vault.readExactPublicRoomBinding(parsed.input.roomId);
    } catch {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "binding_unavailable" }));
      throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
    }
    if (binding === null) {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "binding_unavailable" }));
      throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
    }

    const now = exactNow(this.#now());
    try {
      binding.assertUsableFor(parsed.input.roomId, now);
      if (parsed.action === "room_operator.projection.deliver") {
        binding.verifyProjectionDelivery(parsed.input.request.delivery, now);
      }
    } catch {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "request_denied" }));
      throw connectorError("PRODUCTION_ROOM_REQUEST_DENIED");
    }

    let plan: ProductionHostedHttpPlanV1;
    try {
      plan = buildProductionPublicRoomOperatorHttpPlan(this.fixedOrigin, parsed.action, parsed.input);
    } catch {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "request_denied" }));
      throw connectorError("PRODUCTION_ROOM_REQUEST_DENIED");
    }

    let response: ProductionRoomTransportResponseV1;
    try {
      response = await binding.withTransportAuthorization(async (authorization) => {
        const raw = await this.#transport.dispatch(plan, authorization);
        authorization.assertAbsentFrom(raw);
        return transportResponse(raw);
      });
    } catch {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "transport_unavailable" }));
      throw connectorError("PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE");
    }
    const outcome = response.status >= 200 && response.status < 300 ? "accepted" : "rejected";
    this.#emit(this.#diagnosticValue({ ...common, httpStatus: response.status, outcome }));
    return Object.freeze({
      schemaVersion: "forme.room.production-connector-result.v1",
      action: parsed.action,
      status: response.status,
      payload: response.payload,
    });
  }

  /** Pairing is a separate bootstrap lane and cannot invoke an operator action. */
  async exchangePairing(value: ProductionPairingExchangeInputV1 | unknown): Promise<ProductionRoomConnectorResultV1> {
    let input: ProductionPairingExchangeInputV1;
    let plan: ProductionHostedHttpPlanV1;
    try {
      input = parseProductionPairingExchangeInput(value);
      plan = buildProductionPairingExchangeHttpPlan(this.fixedOrigin, input);
    } catch {
      throw connectorError("PRODUCTION_ROOM_REQUEST_INVALID");
    }
    const startedAt = exactNow(this.#now());
    const preliminaryRequestHash = canonicalSha256({
      schemaVersion: "forme.room.production-pairing-diagnostic-intent.v1",
      action: "room.pair.exchange",
      roomId: input.roomId,
      pairingId: input.pairingId,
      idempotencyKey: input.idempotencyKey,
      expectedVersion: input.expectedVersion,
    });
    const preliminaryCommon = {
      operation: "room.pair.exchange" as const,
      roomId: input.roomId,
      requestHash: preliminaryRequestHash,
      expectedVersion: input.expectedVersion,
    };
    let prepared: PreparedPublicRoomPairingV1;
    try {
      prepared = exactPreparedPairing(await this.#vault.preparePublicRoomPairing({
        roomId: input.roomId,
        pairingId: input.pairingId,
        idempotencyKey: input.idempotencyKey,
        observedAt: startedAt,
      }), input, startedAt);
    } catch {
      this.#emit(this.#diagnosticValue({ ...preliminaryCommon, httpStatus: null, outcome: "binding_unavailable" }));
      throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
    }
    const common = {
      ...preliminaryCommon,
      requestHash: canonicalSha256({
        schemaVersion: "forme.room.production-pairing-diagnostic-intent.v1",
        action: "room.pair.exchange",
        roomId: input.roomId,
        pairingId: input.pairingId,
        clientPublicKeyHash: canonicalSha256(prepared.clientPublicKey),
        idempotencyKey: input.idempotencyKey,
        expectedVersion: input.expectedVersion,
      }),
    };
    let response: ProductionRoomTransportResponseV1;
    let responseObservedAt: string;
    let exchange: ProductionPairingExchangeEnvelopeV1 | null;
    const authorization = new ProductionPairingExchangeAuthorizationV1({
      pairingCode: input.pairingCode,
      clientPublicKey: prepared.clientPublicKey,
    });
    try {
      const raw = await this.#transport.dispatch(plan, authorization);
      authorization.assertAbsentFrom(raw);
      response = transportResponse(raw);
      responseObservedAt = exactNow(this.#now());
      exchange = pairingResponseBindsIntent(response, input, prepared, startedAt, responseObservedAt);
    } catch {
      this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "transport_unavailable" }));
      throw connectorError("PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE");
    }
    const outcome = response.status >= 200 && response.status < 300 ? "accepted" : "rejected";
    let payload: unknown = Object.freeze({
      schemaVersion: "forme.room.production-pairing-rejected.v1",
      pairingId: input.pairingId,
      roomId: input.roomId,
    });
    if (exchange !== null) {
      let binding: ExactPublicRoomBindingCredentialV1;
      try {
        binding = await this.#vault.commitPairedPublicRoomBinding({
          roomId: input.roomId,
          pairingId: input.pairingId,
          prepared,
          exchange,
        });
        assertPairingBindingUsable(binding, input.roomId, responseObservedAt);
        if (
          binding.bindingId !== exchange.bindingId
          || binding.roomId !== exchange.roomId
          || binding.pairedAt !== exchange.pairedAt
          || binding.expiresAt !== exchange.expiresAt
          || binding.version !== exchange.version
        ) throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
        const durable = await this.#vault.readExactPublicRoomBinding(input.roomId);
        const completedAt = exactNow(this.#now());
        if (
          Date.parse(completedAt) < Date.parse(responseObservedAt)
          || Date.parse(completedAt) >= Date.parse(prepared.expiresAt)
          || Date.parse(completedAt) - Date.parse(startedAt) > MAXIMUM_PAIRING_ATTEMPT_MILLISECONDS
          || durable === null
          || durable.bindingId !== binding.bindingId
          || durable.roomId !== binding.roomId
          || durable.pairedAt !== binding.pairedAt
          || durable.expiresAt !== binding.expiresAt
          || durable.version !== binding.version
          || durable.state !== "current"
          || !durable.hasSameSecretAuthority(binding)
        ) throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
        assertPairingBindingUsable(durable, input.roomId, completedAt);
        binding = durable;
      } catch {
        this.#emit(this.#diagnosticValue({ ...common, httpStatus: null, outcome: "binding_unavailable" }));
        throw connectorError("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
      }
      payload = Object.freeze({
        schemaVersion: "forme.room.production-pairing-committed.v1",
        pairingId: input.pairingId,
        roomId: input.roomId,
        binding: binding.diagnostic(),
        receiptSha256: exchange.receiptSha256,
      });
    }
    this.#emit(this.#diagnosticValue({ ...common, httpStatus: response.status, outcome }));
    return Object.freeze({
      schemaVersion: "forme.room.production-connector-result.v1",
      action: "room.pair.exchange",
      status: response.status,
      payload,
    });
  }
}
