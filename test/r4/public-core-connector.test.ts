import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ExactPublicRoomBindingCredentialV1,
  ProductionBearerAuthorizationV1,
  ProductionPairingExchangeAuthorizationV1,
  ProductionPublicRoomConnectorV1,
  assertBodyFree,
  type ProductionHostedHttpPlanV1,
  type ProductionPairingExchangeInputV1,
  type ProductionPublicRoomOperatorInputV1,
  type ProductionRoomConnectorDiagnosticV1,
  type ProductionRoomCredentialVaultV1,
  type ProductionRoomTransportV1,
} from "../../packages/r4-local/src/index.ts";
import {
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_BASIS,
  GOLDEN_ROOM_EVENT_ACK,
  canonicalSha256,
  type ArtifactApprovalV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedProjectionDeliveryBody } from "./hosted-publication-helpers.ts";

const ORIGIN = "https://room.forme.example";
const ROOM_ID = GOLDEN_PROJECTION.roomId;
const OTHER_ROOM_ID = `room_${"b".repeat(32)}`;
const BINDING_ID = `binding_${"7".repeat(32)}`;
const BEARER = Buffer.alloc(32, 67).toString("base64url");
const T0 = "2026-08-03T12:00:00.000Z";
const T5M = "2026-08-03T12:05:00.000Z";
const T10M = "2026-08-03T12:10:00.000Z";
const T1H = "2026-08-03T13:00:00.000Z";
const T30D = "2026-09-02T12:00:00.000Z";
const CLIENT_PUBLIC_KEY = "client-public-key-persisted-before-exchange-0001";

function preparedPairing(input: ProductionPairingExchangeInputV1) {
  return Object.freeze({
    schemaVersion: "forme.room.prepared-public-pairing.v1" as const,
    roomId: input.roomId,
    pairingId: input.pairingId,
    idempotencyKey: input.idempotencyKey,
    clientPublicKey: CLIENT_PUBLIC_KEY,
    preparedAt: T0,
    expiresAt: T10M,
  });
}

function binding(overrides: Partial<ConstructorParameters<typeof ExactPublicRoomBindingCredentialV1>[0]> = {}) {
  return new ExactPublicRoomBindingCredentialV1({
    schemaVersion: "forme.room.public-binding-credential-input.v1",
    bindingId: BINDING_ID,
    roomId: ROOM_ID,
    roomKind: "third_place_public",
    state: "current",
    pairedAt: T0,
    expiresAt: T30D,
    version: 1,
    bearer: BEARER,
    ...overrides,
  });
}

function operatorInput(options: {
  roomId?: string;
  pathParams?: Record<string, string>;
  request?: Record<string, unknown>;
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
} = {}): ProductionPublicRoomOperatorInputV1 {
  return {
    schemaVersion: "forme.room.production-public-operator-input.v1",
    roomId: options.roomId ?? ROOM_ID,
    pathParams: options.pathParams ?? {},
    request: options.request ?? {},
    idempotencyKey: options.idempotencyKey ?? null,
    expectedVersion: options.expectedVersion ?? null,
  };
}

function fixture(options: {
  vault?: ProductionRoomCredentialVaultV1;
  transport?: ProductionRoomTransportV1;
  origin?: string;
} = {}) {
  const plans: ProductionHostedHttpPlanV1[] = [];
  const authorizationHeaders: Array<string | null> = [];
  const diagnostics: ProductionRoomConnectorDiagnosticV1[] = [];
  const vaultReads: string[] = [];
  const vault = options.vault ?? {
    async readExactPublicRoomBinding(roomId: string) {
      vaultReads.push(roomId);
      return binding();
    },
    async commitPairedPublicRoomBinding() {
      throw new Error("pairing commit is unavailable in the operator fixture");
    },
    async preparePublicRoomPairing() {
      throw new Error("pairing preparation is unavailable in the operator fixture");
    },
  };
  const transport = options.transport ?? {
    async dispatch(plan, authorization) {
      plans.push(plan);
      authorizationHeaders.push(
        authorization instanceof ProductionBearerAuthorizationV1
          ? authorization.headerValue()
          : null,
      );
      return { status: 200, payload: { schemaVersion: "connector_fixture_result.v1", operation: plan.action } };
    },
  } satisfies ProductionRoomTransportV1;
  const connector = new ProductionPublicRoomConnectorV1({
    fixedOrigin: options.origin ?? ORIGIN,
    vault,
    transport,
    now: () => new Date(T5M),
    diagnostic(value) { diagnostics.push(value); },
  });
  return { connector, plans, authorizationHeaders, diagnostics, vaultReads };
}

test("#67 production connector exposes only exact public operator calls over a fixed outbound HTTPS origin", async () => {
  const captured = fixture();
  const interactionId = `interaction_${"1".repeat(32)}`;
  const calls: Array<[string, ProductionPublicRoomOperatorInputV1]> = [
    ["room_operator.status", operatorInput({ request: { roomId: ROOM_ID } })],
    ["room_operator.sync", operatorInput({
      request: { roomId: ROOM_ID, afterSequence: 0 },
      idempotencyKey: "sync_connector_0000000000000001",
    })],
    ["room_operator.pull", operatorInput({
      pathParams: { interactionId },
      idempotencyKey: "pull_connector_0000000000000001",
      expectedVersion: 1,
    })],
    ["room_operator.ack", operatorInput({
      request: GOLDEN_ROOM_EVENT_ACK as unknown as Record<string, unknown>,
      idempotencyKey: GOLDEN_ROOM_EVENT_ACK.idempotencyKey,
    })],
    ["room_operator.local_purge.receipt", operatorInput({
      pathParams: { interactionId },
      request: { localBytesAbsent: true },
      idempotencyKey: "purge_connector_0000000000000001",
      expectedVersion: 2,
    })],
  ];

  for (const [action, input] of calls) {
    const result = await captured.connector.call(action, input);
    assert.equal(result.action, action);
    assert.equal(result.status, 200);
  }
  assert.deepEqual(captured.vaultReads, Array(calls.length).fill(ROOM_ID));
  assert.equal(captured.plans[0]?.url, `${ORIGIN}/api/v1/room-operator/status?roomId=${ROOM_ID}`);
  assert.equal(captured.plans[1]?.url, `${ORIGIN}/api/v1/room-operator/sync`);
  assert.equal(captured.plans[2]?.url, `${ORIGIN}/api/v1/room-operator/interactions/${interactionId}/pull`);
  assert.equal(captured.plans[3]?.url, `${ORIGIN}/api/v1/room-operator/events/ack`);
  assert.equal(captured.plans[4]?.url, `${ORIGIN}/api/v1/room-operator/interactions/${interactionId}/local-purge`);
  assert.equal(captured.plans[0]?.headers["Idempotency-Key"], undefined);
  assert.equal(captured.plans[1]?.headers["If-Match"], undefined);
  assert.equal(captured.plans[2]?.headers["If-Match"], "1");
  for (const plan of captured.plans) {
    assert.equal(plan.networkDirection, "outbound_only");
    assert.equal(plan.redirectPolicy, "error");
    assert.equal(plan.url.startsWith(`${ORIGIN}/api/v1/`), true);
    assert.equal(plan.headers.Authorization, undefined, "vault material must not enter the inspectable plan");
    assert.equal(Object.keys(plan.headers).some((key) => key.toLowerCase().startsWith("x-forme-synthetic")), false);
  }
  assert.deepEqual(captured.authorizationHeaders, Array(calls.length).fill(`Bearer ${BEARER}`));
  for (const diagnostic of captured.diagnostics) assert.doesNotThrow(() => assertBodyFree(diagnostic));
  assert.doesNotMatch(JSON.stringify(captured.diagnostics), new RegExp(BEARER, "u"));
});

test("Projection delivery verifies the exact binding/HMAC before transport and never opens the Response arm", async () => {
  const projectionApproval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: "approval_connectorprojection000001",
    artifactClass: "projection",
    artifactHash: GOLDEN_PROJECTION.payloadHash,
    roomId: ROOM_ID,
    projectionId: GOLDEN_PROJECTION.projectionId,
    interactionId: null,
    basisHash: canonicalSha256(GOLDEN_PROJECTION_BASIS),
    policyHash: GOLDEN_PROJECTION_BASIS.projectionPolicyHash,
    approvedAt: T0,
    expiresAt: T1H,
    operationId: "op_connectorprojection0000000001",
  };
  const request = signedProjectionDeliveryBody({
    projection: GOLDEN_PROJECTION,
    basis: GOLDEN_PROJECTION_BASIS,
    approval: projectionApproval,
    now: T5M,
    secret: BEARER,
    bindingId: BINDING_ID,
  });
  const captured = fixture();
  const result = await captured.connector.call("room_operator.projection.deliver", operatorInput({
    request,
    idempotencyKey: "projection_connector_000000000001",
    expectedVersion: 1,
  }));
  assert.equal(result.status, 200);
  assert.equal(captured.plans.length, 1);
  assert.equal(captured.plans[0]?.action, "room_operator.projection.deliver");
  assert.throws(
    () => binding({ state: "revoked" }).verifyProjectionDelivery(request.delivery, T5M),
    /PRODUCTION_ROOM_PROJECTION_AUTHORITY_INVALID/u,
  );

  const tampered = structuredClone(request);
  const delivery = tampered.delivery as { attestation: { hmacSha256: string } };
  delivery.attestation.hmacSha256 = `sha256:${"0".repeat(64)}`;
  await assert.rejects(
    captured.connector.call("room_operator.projection.deliver", operatorInput({
      request: tampered,
      idempotencyKey: "projection_connector_000000000002",
      expectedVersion: 1,
    })),
    /PRODUCTION_ROOM_REQUEST_DENIED/u,
  );
  assert.equal(captured.plans.length, 1, "invalid publication authority must fail before transport");

  await assert.rejects(
    captured.connector.call("room_operator.response.deliver", operatorInput({
      request: { delivery: { artifactClass: "response" } },
      idempotencyKey: "response_connector_00000000000001",
      expectedVersion: 1,
    })),
    /PRODUCTION_ROOM_REQUEST_INVALID/u,
  );
  assert.equal(captured.plans.length, 1);
});

test("unknown, Fresh, Response, Grant, email, Curator, and malformed/private calls fail before transport", async () => {
  const captured = fixture();
  for (const action of [
    "room_operator.cycle.reserve",
    "room_operator.dispatch.issue",
    "room_operator.response.deliver",
    "grant.issue",
    "notification.set",
    "curation.admit",
    "projection.read",
    "unknown.private.route",
  ]) {
    await assert.rejects(captured.connector.call(action, operatorInput()), /PRODUCTION_ROOM_REQUEST_INVALID/u);
  }
  assert.equal(captured.vaultReads.length, 0);
  assert.equal(captured.plans.length, 0);

  await assert.rejects(captured.connector.call("room_operator.sync", operatorInput({
    request: { roomId: OTHER_ROOM_ID, afterSequence: 0 },
    idempotencyKey: "sync_mismatch_00000000000000001",
  })), /PRODUCTION_ROOM_REQUEST_INVALID/u);
  await assert.rejects(captured.connector.call("room_operator.sync", operatorInput({
    request: { roomId: ROOM_ID, afterSequence: 0 },
    idempotencyKey: null,
  })), /PRODUCTION_ROOM_REQUEST_INVALID/u);
  await assert.rejects(captured.connector.call("room_operator.sync", operatorInput({
    request: { roomId: ROOM_ID, afterSequence: 0 },
    idempotencyKey: "sync_version_00000000000000001",
    expectedVersion: 1,
  })), /PRODUCTION_ROOM_REQUEST_INVALID/u);
  await assert.rejects(captured.connector.call("room_operator.ack", operatorInput({
    request: GOLDEN_ROOM_EVENT_ACK as unknown as Record<string, unknown>,
    idempotencyKey: "ack_mismatch_000000000000000001",
  })), /PRODUCTION_ROOM_REQUEST_INVALID/u);
  assert.equal(captured.plans.length, 0);
});

test("binding and transport failures are body-free and cannot echo vault material", async () => {
  const exact = binding();
  assert.doesNotMatch(JSON.stringify(exact), new RegExp(BEARER, "u"));
  assert.doesNotMatch(String(exact), new RegExp(BEARER, "u"));
  await exact.withTransportAuthorization(async (authorization) => {
    assert.deepEqual(JSON.parse(JSON.stringify(authorization)), {
      schemaVersion: "forme.room.production-bearer-authorization.v1",
      scheme: "Bearer",
      redacted: true,
    });
  });

  const vaultDiagnostics: ProductionRoomConnectorDiagnosticV1[] = [];
  let vaultTransportCalls = 0;
  const vaultFailure = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async readExactPublicRoomBinding() { throw new Error(`vault failed ${BEARER}`); },
      async preparePublicRoomPairing() { throw new Error("pairing is unavailable"); },
      async commitPairedPublicRoomBinding() { throw new Error("pairing is unavailable"); },
    },
    transport: {
      async dispatch() { vaultTransportCalls += 1; return { status: 200, payload: null }; },
    },
    now: () => new Date(T5M),
    diagnostic(value) { vaultDiagnostics.push(value); },
  });
  await assert.rejects(
    vaultFailure.call("room_operator.status", operatorInput({ request: { roomId: ROOM_ID } })),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, new RegExp(BEARER, "u"));
      return /PRODUCTION_ROOM_BINDING_UNAVAILABLE/u.test(error.message);
    },
  );
  assert.equal(vaultTransportCalls, 0);
  assert.doesNotMatch(JSON.stringify(vaultDiagnostics), new RegExp(BEARER, "u"));

  const transportDiagnostics: ProductionRoomConnectorDiagnosticV1[] = [];
  const transportFailure = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async readExactPublicRoomBinding() { return binding(); },
      async preparePublicRoomPairing() { throw new Error("pairing is unavailable"); },
      async commitPairedPublicRoomBinding() { throw new Error("pairing is unavailable"); },
    },
    transport: { async dispatch() { throw new Error(`upstream echoed ${BEARER} PRIVATE_BODY_CANARY`); } },
    now: () => new Date(T5M),
    diagnostic(value) { transportDiagnostics.push(value); },
  });
  await assert.rejects(
    transportFailure.call("room_operator.status", operatorInput({ request: { roomId: ROOM_ID } })),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, new RegExp(`${BEARER}|PRIVATE_BODY_CANARY`, "u"));
      return /PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE/u.test(error.message);
    },
  );
  assert.doesNotMatch(JSON.stringify(transportDiagnostics), new RegExp(`${BEARER}|PRIVATE_BODY_CANARY`, "u"));
  for (const diagnostic of [...vaultDiagnostics, ...transportDiagnostics]) {
    assert.doesNotThrow(() => assertBodyFree(diagnostic));
  }
});

test("pairing exchange is a separate typed bootstrap with no operator bearer", async () => {
  const pairingId = `pairing_${"9".repeat(32)}`;
  const pairingCode = "PAIRING_CODE_PRIVATE_CANARY_0001";
  const input: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode,
    idempotencyKey: "pairing_connector_00000000000001",
    expectedVersion: 1,
  };
  const plans: ProductionHostedHttpPlanV1[] = [];
  const authorizations: unknown[] = [];
  const diagnostics: ProductionRoomConnectorDiagnosticV1[] = [];
  const commits: unknown[] = [];
  const sealedCredential = Buffer.alloc(48, 19).toString("base64url");
  const clientPublicKeyHash = canonicalSha256(CLIENT_PUBLIC_KEY);
  const receiptSha256 = canonicalSha256({ pairingId, roomId: ROOM_ID, bindingId: BINDING_ID });
  let durableBinding: ExactPublicRoomBindingCredentialV1 | null = null;
  const observedTimes = [T0, T5M, T5M];
  let observedTimeIndex = 0;
  const connector = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async readExactPublicRoomBinding() { return durableBinding; },
      async preparePublicRoomPairing(value) {
        assert.deepEqual(value, {
          roomId: ROOM_ID,
          pairingId,
          idempotencyKey: input.idempotencyKey,
          observedAt: T0,
        });
        return preparedPairing(input);
      },
      async commitPairedPublicRoomBinding(value) {
        commits.push(value);
        assert.deepEqual(value.prepared, preparedPairing(input));
        durableBinding = binding({ pairedAt: T5M, expiresAt: T30D });
        return durableBinding;
      },
    },
    transport: {
      async dispatch(plan, authorization) {
        plans.push(plan);
        assert.ok(authorization instanceof ProductionPairingExchangeAuthorizationV1);
        authorizations.push(JSON.parse(JSON.stringify(authorization)));
        assert.equal(
          authorization.requestBody(),
          JSON.stringify({ clientPublicKey: CLIENT_PUBLIC_KEY, pairingCode: input.pairingCode }),
        );
        return {
          status: 201,
          payload: {
            schemaVersion: "forme.room.production-pairing-exchange-result.v1",
            roomId: ROOM_ID,
            pairingId,
            bindingId: BINDING_ID,
            clientPublicKeyHash,
            pairedAt: T5M,
            expiresAt: T30D,
            sealedCredential,
            version: 1,
            receiptSha256,
          },
        };
      },
    },
    now: () => new Date(observedTimes[Math.min(observedTimeIndex++, observedTimes.length - 1)]!),
    diagnostic(value) { diagnostics.push(value); },
  });
  const result = await connector.exchangePairing(input);
  assert.equal(result.status, 201);
  assert.equal(plans[0]?.url, `${ORIGIN}/api/v1/pairings/${pairingId}/exchange`);
  assert.equal(plans[0]?.headers.Authorization, undefined);
  assert.equal(plans[0]?.body, null);
  assert.equal(plans[0]?.sensitiveBody, "pairing_exchange");
  assert.equal(plans[0]?.headers["Idempotency-Key"], input.idempotencyKey);
  assert.equal(plans[0]?.headers["If-Match"], "1");
  assert.deepEqual(authorizations, [{ schemaVersion: "forme.room.production-pairing-authorization.v1", redacted: true }]);
  assert.equal(commits.length, 1);
  assert.deepEqual(result.payload, {
    schemaVersion: "forme.room.production-pairing-committed.v1",
    pairingId,
    roomId: ROOM_ID,
    binding: binding({ pairedAt: T5M, expiresAt: T30D }).diagnostic(),
    receiptSha256,
  });
  const observable = JSON.stringify({ plans, authorizations, diagnostics, result });
  assert.doesNotMatch(observable, new RegExp(`${pairingCode}|${sealedCredential}`, "u"));
  assert.doesNotThrow(() => assertBodyFree(diagnostics[0]));
});

test("pairing can retry one lost response only from the same durably prepared key", async () => {
  const pairingId = `pairing_${"6".repeat(32)}`;
  const input: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode: "PAIRING_CODE_PRIVATE_RETRY_0001",
    idempotencyKey: "pairing_retry_00000000000000001",
    expectedVersion: 1,
  };
  const prepared = preparedPairing(input);
  const receiptSha256 = canonicalSha256({ pairingId, retry: true });
  let dispatches = 0;
  let preparations = 0;
  let durableBinding: ExactPublicRoomBindingCredentialV1 | null = null;
  const connector = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async preparePublicRoomPairing() {
        preparations += 1;
        return prepared;
      },
      async commitPairedPublicRoomBinding(value) {
        assert.deepEqual(value.prepared, prepared);
        durableBinding = binding({ pairedAt: T5M, expiresAt: T30D });
        return durableBinding;
      },
      async readExactPublicRoomBinding() { return durableBinding; },
    },
    transport: {
      async dispatch(_plan, authorization) {
        dispatches += 1;
        assert.ok(authorization instanceof ProductionPairingExchangeAuthorizationV1);
        if (dispatches === 1) throw new Error("response lost after origin commit");
        return {
          status: 201,
          payload: {
            schemaVersion: "forme.room.production-pairing-exchange-result.v1",
            roomId: ROOM_ID,
            pairingId,
            bindingId: BINDING_ID,
            clientPublicKeyHash: canonicalSha256(CLIENT_PUBLIC_KEY),
            pairedAt: T5M,
            expiresAt: T30D,
            sealedCredential: Buffer.alloc(48, 23).toString("base64url"),
            version: 1,
            receiptSha256,
          },
        };
      },
    },
    now: () => new Date(T5M),
  });

  await assert.rejects(connector.exchangePairing(input), /PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE/u);
  const recovered = await connector.exchangePairing(input);
  assert.equal(dispatches, 2);
  assert.equal(preparations, 2);
  assert.equal(recovered.status, 201);
  assert.equal((recovered.payload as { receiptSha256: string }).receiptSha256, receiptSha256);
});

test("pairing never reports committed without exact durable vault readback", async () => {
  const pairingId = `pairing_${"5".repeat(32)}`;
  const input: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode: "PAIRING_CODE_PRIVATE_READBACK_01",
    idempotencyKey: "pairing_readback_000000000000001",
    expectedVersion: 1,
  };
  let commits = 0;
  const connector = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async preparePublicRoomPairing() { return preparedPairing(input); },
      async commitPairedPublicRoomBinding() {
        commits += 1;
        return binding({ pairedAt: T5M, expiresAt: T30D });
      },
      async readExactPublicRoomBinding() { return null; },
    },
    transport: {
      async dispatch() {
        return {
          status: 201,
          payload: {
            schemaVersion: "forme.room.production-pairing-exchange-result.v1",
            roomId: ROOM_ID,
            pairingId,
            bindingId: BINDING_ID,
            clientPublicKeyHash: canonicalSha256(CLIENT_PUBLIC_KEY),
            pairedAt: T5M,
            expiresAt: T30D,
            sealedCredential: Buffer.alloc(48, 29).toString("base64url"),
            version: 1,
            receiptSha256: canonicalSha256({ pairingId, readback: false }),
          },
        };
      },
    },
    now: () => new Date(T5M),
  });

  await assert.rejects(connector.exchangePairing(input), /PRODUCTION_ROOM_BINDING_UNAVAILABLE/u);
  assert.equal(commits, 1);
});

test("pairing durable readback must retain the exact private binding authority", async () => {
  const pairingId = `pairing_${"3".repeat(32)}`;
  const input: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode: "PAIRING_CODE_PRIVATE_AUTHORITY_01",
    idempotencyKey: "pairing_authority_00000000000001",
    expectedVersion: 1,
  };
  const committed = binding({ pairedAt: T5M, expiresAt: T30D });
  const wrongBearer = Buffer.alloc(32, 68).toString("base64url");
  const connector = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async preparePublicRoomPairing() { return preparedPairing(input); },
      async commitPairedPublicRoomBinding() { return committed; },
      async readExactPublicRoomBinding() {
        return binding({ pairedAt: T5M, expiresAt: T30D, bearer: wrongBearer });
      },
    },
    transport: {
      async dispatch() {
        return {
          status: 201,
          payload: {
            schemaVersion: "forme.room.production-pairing-exchange-result.v1",
            roomId: ROOM_ID,
            pairingId,
            bindingId: BINDING_ID,
            clientPublicKeyHash: canonicalSha256(CLIENT_PUBLIC_KEY),
            pairedAt: T5M,
            expiresAt: T30D,
            sealedCredential: Buffer.alloc(48, 37).toString("base64url"),
            version: 1,
            receiptSha256: canonicalSha256({ pairingId, authority: true }),
          },
        };
      },
    },
    now: () => new Date(T5M),
  });

  await assert.rejects(connector.exchangePairing(input), /PRODUCTION_ROOM_BINDING_UNAVAILABLE/u);
  assert.equal(committed.hasSameSecretAuthority(committed), true);
});

test("pairing rechecks preparation and binding time after transport and durable readback", async () => {
  const pairingId = `pairing_${"4".repeat(32)}`;
  const input: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode: "PAIRING_CODE_PRIVATE_TIMING_0001",
    idempotencyKey: "pairing_timing_0000000000000001",
    expectedVersion: 1,
  };
  const payload = {
    schemaVersion: "forme.room.production-pairing-exchange-result.v1",
    roomId: ROOM_ID,
    pairingId,
    bindingId: BINDING_ID,
    clientPublicKeyHash: canonicalSha256(CLIENT_PUBLIC_KEY),
    pairedAt: T5M,
    expiresAt: T30D,
    sealedCredential: Buffer.alloc(48, 31).toString("base64url"),
    version: 1,
    receiptSha256: canonicalSha256({ pairingId, timing: true }),
  };

  for (const scenario of [
    { times: [T0, T10M], expected: /PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE/u, commits: 0 },
    { times: [T0, T5M, T10M], expected: /PRODUCTION_ROOM_BINDING_UNAVAILABLE/u, commits: 1 },
  ]) {
    let timeIndex = 0;
    let commits = 0;
    let durable: ExactPublicRoomBindingCredentialV1 | null = null;
    const connector = new ProductionPublicRoomConnectorV1({
      fixedOrigin: ORIGIN,
      vault: {
        async preparePublicRoomPairing() { return preparedPairing(input); },
        async commitPairedPublicRoomBinding() {
          commits += 1;
          durable = binding({ pairedAt: T5M, expiresAt: T30D });
          return durable;
        },
        async readExactPublicRoomBinding() { return durable; },
      },
      transport: { async dispatch() { return { status: 201, payload }; } },
      now: () => new Date(scenario.times[Math.min(timeIndex++, scenario.times.length - 1)]!),
    });
    await assert.rejects(connector.exchangePairing(input), scenario.expected);
    assert.equal(commits, scenario.commits);
  }
});

test("pairing intent diagnostics are non-enumerable and invalid exchange bytes never reach the vault", async () => {
  const pairingId = `pairing_${"8".repeat(32)}`;
  const base: ProductionPairingExchangeInputV1 = {
    schemaVersion: "forme.room.production-pairing-exchange-input.v1",
    roomId: ROOM_ID,
    pairingId,
    pairingCode: "PAIRING_SECRET_CODE_ALPHA_0001",
    idempotencyKey: "pairing_negative_000000000000001",
    expectedVersion: 1,
  };
  const diagnostics: ProductionRoomConnectorDiagnosticV1[] = [];
  let commits = 0;
  const rejected = new ProductionPublicRoomConnectorV1({
    fixedOrigin: ORIGIN,
    vault: {
      async readExactPublicRoomBinding() { throw new Error("operator vault unavailable"); },
      async preparePublicRoomPairing() { return preparedPairing(base); },
      async commitPairedPublicRoomBinding() { commits += 1; throw new Error("unreachable"); },
    },
    now: () => new Date(T5M),
    transport: {
      async dispatch(plan, authorization) {
        assert.equal(plan.body, null);
        assert.equal(plan.sensitiveBody, "pairing_exchange");
        assert.ok(authorization instanceof ProductionPairingExchangeAuthorizationV1);
        return { status: 409, payload: { schemaVersion: "body_free_pairing_rejection.v1" } };
      },
    },
    diagnostic(value) { diagnostics.push(value); },
  });
  await rejected.exchangePairing(base);
  await rejected.exchangePairing({ ...base, pairingCode: "PAIRING_SECRET_CODE_BRAVO_0002" });
  assert.equal(commits, 0);
  assert.equal(diagnostics[0]?.requestHash, diagnostics[1]?.requestHash);
  assert.doesNotMatch(JSON.stringify(diagnostics), /PAIRING_SECRET_CODE/u);

  for (const payload of [
    {
      schemaVersion: "forme.room.production-pairing-exchange-result.v1",
      roomId: ROOM_ID,
      pairingId,
      bindingId: BINDING_ID,
      clientPublicKeyHash: canonicalSha256("wrong-client-public-key"),
      pairedAt: T5M,
      expiresAt: T30D,
      sealedCredential: Buffer.alloc(48, 1).toString("base64url"),
      version: 1,
      receiptSha256: canonicalSha256("wrong client"),
    },
    {
      schemaVersion: "forme.room.production-pairing-exchange-result.v1",
      roomId: ROOM_ID,
      pairingId,
      bindingId: BINDING_ID,
      clientPublicKeyHash: canonicalSha256(CLIENT_PUBLIC_KEY),
      pairedAt: T0,
      expiresAt: "2026-09-03T12:00:00.000Z",
      sealedCredential: Buffer.alloc(48, 2).toString("base64url"),
      version: 1,
      receiptSha256: canonicalSha256("long binding"),
    },
  ]) {
    const invalid = new ProductionPublicRoomConnectorV1({
      fixedOrigin: ORIGIN,
      vault: {
        async readExactPublicRoomBinding() { throw new Error("operator vault unavailable"); },
        async preparePublicRoomPairing() { return preparedPairing(base); },
        async commitPairedPublicRoomBinding() { commits += 1; return binding(); },
      },
      transport: { async dispatch() { return { status: 201, payload }; } },
      now: () => new Date(T5M),
    });
    await assert.rejects(invalid.exchangePairing(base), /PRODUCTION_ROOM_TRANSPORT_UNAVAILABLE/u);
  }
  assert.equal(commits, 0);
  assert.throws(
    () => binding({ pairedAt: T0, expiresAt: "2026-09-03T12:00:00.000Z" }),
    /PRODUCTION_ROOM_BINDING_INVALID/u,
  );
  await assert.rejects(
    rejected.exchangePairing({ ...base, pairingCode: "too-short" }),
    /PRODUCTION_ROOM_REQUEST_INVALID/u,
  );
});

test("production seam contains no live network or process-global credential fallback", () => {
  for (const path of [
    new URL("../../packages/r4-local/src/credential-vault.ts", import.meta.url),
    new URL("../../packages/r4-local/src/production-room-connector.ts", import.meta.url),
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|node:(?:http|https|net|tls)|process\.(?:env|argv)|console\./u);
  }
});

test("non-HTTPS, path-bearing, query-bearing, and userinfo origins fail at construction", () => {
  for (const origin of [
    "http://room.forme.example",
    "https://room.forme.example/api",
    "https://room.forme.example?next=elsewhere",
    "https://user:pass@room.forme.example",
  ]) {
    assert.throws(() => fixture({ origin }), /PRODUCTION_ROOM_ORIGIN_INVALID/u);
  }
});
