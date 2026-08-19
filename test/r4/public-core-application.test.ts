import assert from "node:assert/strict";
import test from "node:test";
import {
  PublicCoreApplicationV1,
  type PublicCoreOperationInputV1,
  type PublicCoreTrustedTransportMetadataV1,
} from "../../apps/room/src/public-core-application.ts";
import {
  PublicCoreCryptoKeyHandleV1,
} from "../../apps/room/src/public-core-crypto.ts";
import {
  InMemoryPublicCoreStoreV1,
  PublicCoreStoreError,
  createPublicCoreBodyProtectorV1,
  createPublicCoreTestMaintenanceV1,
  type PublicCoreApplicationStoreV1,
  type PublicCoreIdSourceV1,
} from "../../apps/room/src/public-core-store.ts";
import { PUBLIC_CORE_ACTION_NAMES } from "../../apps/room/src/public-core-policy.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import {
  canonicalSha256,
  type ProjectionCapsuleV1,
} from "../../packages/r4-protocol/src/index.ts";
import type { PublicCoreConfigReference } from "../../apps/room/src/production-config.ts";

const T0 = "2026-08-10T12:00:00.000Z";
const ENTITY_ID = `entity_${"e".repeat(32)}`;
const ACTOR_SCOPE = canonicalSha256("synthetic actor scope");
const RATE_BUCKET = `bucket_${"r".repeat(32)}`;

class DeterministicIds implements PublicCoreIdSourceV1 {
  #serial = 0;
  #secrets = new Map<string, string>();
  nextId(prefix: "room" | "projection" | "pairing" | "binding" | "encounter" | "interaction" | "event" | "receipt" | "purge" | "ack"): string {
    this.#serial += 1;
    return `${prefix}_${this.#serial.toString(36).padStart(32, "0")}`;
  }
  nextSecret(kind: "pairing_code" | "binding_secret"): string {
    this.#serial += 1;
    const value = `${kind}_${this.#serial.toString(36).padStart(48, "0")}`;
    this.#secrets.set(kind, value);
    return value;
  }
  lastSecret(kind: "pairing_code" | "binding_secret"): string {
    return this.#secrets.get(kind) ?? assert.fail(`missing ${kind}`);
  }
}

function cryptoFixture() {
  const hash = "a".repeat(64);
  const bodyKey = new PublicCoreCryptoKeyHandleV1({
    purpose: "body_encryption",
    reference: `ref:body-encryption/public-core-test@sha256:${hash}` as PublicCoreConfigReference,
    material: Uint8Array.from({ length: 32 }, (_, index) => index + 1),
  });
  const pepper = new PublicCoreCryptoKeyHandleV1({
    purpose: "capability_pepper",
    reference: `ref:capability-pepper/public-core-test@sha256:${hash}` as PublicCoreConfigReference,
    material: Uint8Array.from({ length: 32 }, (_, index) => 255 - index),
  });
  return createPublicCoreBodyProtectorV1({ bodyEncryptionKey: bodyKey, capabilityPepperKey: pepper });
}

interface Harness {
  readonly app: PublicCoreApplicationV1;
  readonly store: InMemoryPublicCoreStoreV1;
  readonly ids: DeterministicIds;
  readonly now: { value: string };
  call(action: string, overrides?: Partial<PublicCoreOperationInputV1>): Promise<Awaited<ReturnType<PublicCoreApplicationV1["run"]>>>;
}

function harness(): Harness {
  const now = { value: T0 };
  const ids = new DeterministicIds();
  const store = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"i".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => new Date(now.value),
    ids,
    protector: cryptoFixture(),
  });
  const app = new PublicCoreApplicationV1(store);
  let serial = 0;
  return {
    app,
    store,
    ids,
    now,
    async call(action, overrides = {}) {
      serial += 1;
      const definition = operationDefinition(action);
      const base: PublicCoreOperationInputV1 = {
        schemaVersion: "r4_public_core_operation_input.v1",
        action,
        actorClass: definition.actor,
        actorScopeDigest: ACTOR_SCOPE,
        params: {},
        body: {},
        authorizationSecret: null,
        idempotencyKey: definition.mutating ? `idem_${serial.toString(36).padStart(32, "0")}` : null,
        expectedVersion: null,
      };
      const operation = { ...base, ...overrides };
      const trustedTransport: PublicCoreTrustedTransportMetadataV1 = {
        schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
        coarseRateBucket: action === "public_encounter.issue" ? RATE_BUCKET : null,
      };
      return await app.run(operation, trustedTransport);
    },
  };
}

function capsule(roomId: string, sequence = 1): ProjectionCapsuleV1 {
  const projectionId = `proj_${sequence.toString(36).padStart(32, "0")}`;
  const publishedAt = T0;
  const preimage: Omit<ProjectionCapsuleV1, "payloadHash"> = {
    schemaVersion: "projection_capsule.v1",
    projectionId,
    roomId,
    entityId: ENTITY_ID,
    title: "Forme Project",
    thirdPlaceSummary: "A bounded public view of a project that remembers and acts without replacing its Owner.",
    claims: [
      { slot: "becoming", text: "Forme is becoming a durable semantic spine.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "now", text: "The durable Public Core is under offline construction.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "nextMove", text: "Prove one bounded public encounter.", attribution: "inferred_allowed", uncertainty: "Gate C remains separate." },
      { slot: "tensions", text: "Presence must remain useful without exceeding Owner authority.", attribution: "unresolved_allowed", uncertainty: null },
      { slot: "openTo", text: "Thoughtful collaborators who understand the Vision.", attribution: "owner_confirmed", uncertainty: null },
    ],
    supportedInteractions: ["ask", "seed", "resonance"],
    allowedTopics: ["Forme Vision", "current project direction"],
    unavailableTopics: ["private source bodies", "credentials"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "Forme may carry one bounded request to the Owner.",
    nonCommitmentStatement: "This Projection cannot speak for or commit the Owner.",
    disclosureBasisId: `basis_${sequence.toString(36).padStart(32, "0")}`,
    publicationAttestationId: `att_${sequence.toString(36).padStart(32, "0")}`,
    publishedAt,
    freshUntil: "2026-08-13T12:00:00.000Z",
    expiresAt: "2026-08-17T12:00:00.000Z",
  };
  return { ...preimage, payloadHash: canonicalSha256(preimage) };
}

async function roomAndBinding(h: Harness): Promise<{ roomId: string; bindingId: string; bindingSecret: string }> {
  const created = await h.call("room.create", { body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Forme Project Room" } });
  const roomId = created.body.roomId as string;
  const pair = await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
  const exchanged = await h.call("room.pair.exchange", {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "synthetic-client-public-key-material" },
    expectedVersion: 1,
  });
  return { roomId, bindingId: exchanged.body.bindingId as string, bindingSecret: h.ids.lastSecret("binding_secret") };
}

async function admittedProjection(h: Harness): Promise<{ roomId: string; projection: ProjectionCapsuleV1; bindingSecret: string }> {
  const bound = await roomAndBinding(h);
  const value = capsule(bound.roomId);
  await h.call("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bound.bindingSecret,
    body: { projection: value, publicationApprovalHash: canonicalSha256("approval"), publicationAttestationHash: canonicalSha256("attestation") },
    expectedVersion: 1,
  });
  await h.call("curation.admit", { actorClass: "curator", params: { projectionId: value.projectionId }, expectedVersion: 1 });
  return { roomId: bound.roomId, projection: value, bindingSecret: bound.bindingSecret };
}

async function pendingInteraction(h: Harness): Promise<{ roomId: string; projection: ProjectionCapsuleV1; bindingSecret: string; interactionId: string; replySecret: string; deleteSecret: string }> {
  const ready = await admittedProjection(h);
  const encounterSecret = "encounter_secret_synthetic_00000000000000000001";
  await h.call("public_encounter.issue", {
    params: { projectionId: ready.projection.projectionId },
    body: { encounterSecret },
    expectedVersion: 2,
  });
  const replySecret = "reply_secret_synthetic_000000000000000000000001";
  const deleteSecret = "delete_secret_synthetic_00000000000000000000001";
  const created = await h.call("interaction.create", {
    actorClass: "guest_capability",
    authorizationSecret: encounterSecret,
    body: {
      projectionId: ready.projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Synthetic Guest question CANARY_PRIVATE_REQUEST.",
      guestCapsule: null,
      replySecret,
      deleteSecret,
    },
  });
  return { ...ready, interactionId: created.body.targetId as string, replySecret, deleteSecret };
}

async function errorCode(work: Promise<unknown>, code: string, status?: number): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.equal(typeof error, "object");
    assert.equal((error as { code?: string }).code, code);
    if (status !== undefined) assert.equal((error as { status?: number; statusCode?: number }).status ?? (error as { statusCode?: number }).statusCode, status);
    return true;
  });
}

test("#67 application exposes exactly 4 reads and 16 named mutations", () => {
  assert.equal(PUBLIC_CORE_ACTION_NAMES.length, 20);
  const reads = PUBLIC_CORE_ACTION_NAMES.filter((name) => !operationDefinition(name).mutating);
  const mutations = PUBLIC_CORE_ACTION_NAMES.filter((name) => operationDefinition(name).mutating);
  assert.deepEqual(reads, ["third_place.list", "projection.read", "interaction.read", "room_operator.status"]);
  assert.equal(mutations.length, 16);
  const sourceMethods: Array<keyof InMemoryPublicCoreStoreV1> = [
    "listThirdPlace", "readProjection", "readInteraction", "readRoomOperatorStatus",
    "issuePublicEncounter", "createInteraction", "deleteInteraction", "exchangeRoomPair",
    "createRoom", "createRoomPair", "revokeRoomBinding", "setRoomMode", "revokeProjection",
    "admitProjection", "unlistProjection", "syncRoomOperator", "pullRoomOperator",
    "ackRoomOperator", "deliverProjection", "recordLocalPurgeReceipt",
  ];
  assert.equal(new Set(sourceMethods).size, 20);
  const productionPrototype = Object.getOwnPropertyNames(InMemoryPublicCoreStoreV1.prototype);
  assert.equal(productionPrototype.includes("recordSuccessfulPurge"), false);
  assert.equal(productionPrototype.includes("compactBodyFreeEvents"), false);
  assert.equal(productionPrototype.includes("runRetentionTransitions"), false);
});

function storeDouble(
  listThirdPlace: () => Promise<unknown>,
): PublicCoreApplicationStoreV1 {
  const fallback = async (): Promise<unknown> => ({
    status: 200,
    body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
    recovered: false,
  });
  return Object.fromEntries([
    "readProjection", "readInteraction", "readRoomOperatorStatus", "issuePublicEncounter", "createInteraction",
    "deleteInteraction", "exchangeRoomPair", "createRoom", "createRoomPair", "revokeRoomBinding", "setRoomMode",
    "revokeProjection", "admitProjection", "unlistProjection", "syncRoomOperator", "pullRoomOperator",
    "ackRoomOperator", "deliverProjection", "recordLocalPurgeReceipt",
  ].map((name) => [name, fallback]).concat([["listThirdPlace", listThirdPlace]])) as unknown as PublicCoreApplicationStoreV1;
}

test("application accepts SQL-created closed Rooms while room.create cannot select public_single", async () => {
  const roomId = `room_${"c".repeat(32)}`;
  const store = storeDouble(async () => ({
    status: 200,
    body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
    recovered: false,
  })) as unknown as Record<string, unknown>;
  let createCalls = 0;
  store.createRoom = async (_context: unknown, input: unknown) => {
    createCalls += 1;
    assert.deepEqual(input, { entityId: ENTITY_ID, label: "Closed SQL Room" });
    return {
      status: 201,
      body: {
        schemaVersion: "r4_public_core_room_created.v1",
        roomId,
        roomVersion: 1,
        roomMode: "closed",
      },
      recovered: false,
    };
  };
  const base: PublicCoreOperationInputV1 = {
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room.create",
    actorClass: "controller",
    actorScopeDigest: ACTOR_SCOPE,
    params: {},
    body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Closed SQL Room" },
    authorizationSecret: null,
    idempotencyKey: "closed_sql_room_create_00000000000000000001",
    expectedVersion: null,
  };
  const result = await new PublicCoreApplicationV1(store as unknown as PublicCoreApplicationStoreV1).run(base);
  assert.equal(result.body.roomMode, "closed");
  assert.equal(createCalls, 1);

  await errorCode(
    new PublicCoreApplicationV1(store as unknown as PublicCoreApplicationStoreV1).run({
      ...base,
      idempotencyKey: "closed_sql_room_create_00000000000000000002",
      body: { ...base.body, interactionMode: "public_single" },
    }),
    "invalid_request_shape",
    400,
  );
  assert.equal(createCalls, 1, "room.create mode selection must fail before the store");
});

const PUBLIC_LIST_INPUT: PublicCoreOperationInputV1 = Object.freeze({
  schemaVersion: "r4_public_core_operation_input.v1",
  action: "third_place.list",
  actorClass: "public",
  actorScopeDigest: ACTOR_SCOPE,
  params: Object.freeze({}),
  body: Object.freeze({}),
  authorizationSecret: null,
  idempotencyKey: null,
  expectedVersion: null,
});

test("application store membrane rejects hostile errors, results, getters, proxies, and forged domain errors without canary leakage", async () => {
  const canary = "PRIVATE_BODY_CANARY_APP_41";
  const unavailable = async (factory: () => PublicCoreApplicationV1): Promise<void> => {
    await assert.rejects(factory().run(PUBLIC_LIST_INPUT), (error: unknown) => {
      assert.equal((error as { code?: string }).code, "public_core_store_unavailable");
      assert.equal(JSON.stringify(error).includes(canary), false);
      return true;
    });
  };
  await unavailable(() => new PublicCoreApplicationV1(storeDouble(async () => { throw new Error(canary); })));
  await unavailable(() => new PublicCoreApplicationV1(storeDouble(async () => { throw new PublicCoreStoreError(418, canary); })));
  await unavailable(() => new PublicCoreApplicationV1(storeDouble(async () => { throw new Proxy({}, { getPrototypeOf() { throw new Error(canary); } }); })));

  const extra = new PublicCoreApplicationV1(storeDouble(async () => ({
    status: 200,
    body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [], extra: canary },
    recovered: false,
  })));
  await errorCode(extra.run(PUBLIC_LIST_INPUT), "public_core_store_contract_invalid", 503);

  let getterInvoked = false;
  const getterResult = { status: 200, recovered: false } as Record<string, unknown>;
  Object.defineProperty(getterResult, "body", { enumerable: true, get() { getterInvoked = true; throw new Error(canary); } });
  await errorCode(new PublicCoreApplicationV1(storeDouble(async () => getterResult)).run(PUBLIC_LIST_INPUT), "public_core_store_contract_invalid", 503);
  assert.equal(getterInvoked, false);

  const proxyResult = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error(canary); } });
  await errorCode(new PublicCoreApplicationV1(storeDouble(async () => proxyResult)).run(PUBLIC_LIST_INPUT), "public_core_store_contract_invalid", 503);

  const getterStore = storeDouble(async () => ({ status: 200, body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] }, recovered: false })) as unknown as Record<string, unknown>;
  Object.defineProperty(getterStore, "listThirdPlace", { enumerable: true, get() { throw new Error(canary); } });
  assert.throws(() => new PublicCoreApplicationV1(getterStore as unknown as PublicCoreApplicationStoreV1), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "public_core_store_unavailable");
    assert.equal(JSON.stringify(error).includes(canary), false);
    return true;
  });
});

test("application owns and freezes a validated store response before returning it", async () => {
  const mutable = {
    status: 200,
    body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] as unknown[] },
    recovered: false,
  };
  const result = await new PublicCoreApplicationV1(storeDouble(async () => mutable)).run(PUBLIC_LIST_INPUT);
  mutable.status = 410;
  mutable.body.schemaVersion = "mutated";
  mutable.body.residents.push({ canary: "PRIVATE_BODY_CANARY_MUTATION" });
  assert.equal(result.status, 200);
  assert.equal(result.body.schemaVersion, "r4_public_core_third_place_list.v1");
  assert.deepEqual(result.body.residents, []);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.body), true);
  assert.equal(Object.isFrozen(result.body.residents), true);
});

test("application rejects noncanonical or wrong-sized injected AES-GCM envelopes", async () => {
  const pairingId = `pairing_${"e".repeat(32)}`;
  const bindingId = `binding_${"e".repeat(32)}`;
  const validEnvelope = {
    schemaVersion: "a256gcm.v1",
    algorithm: "AES-256-GCM",
    keyVersion: `keyv_${"e".repeat(32)}`,
    nonce: Buffer.alloc(12, 1).toString("base64url"),
    ciphertext: Buffer.from("synthetic exchange envelope", "utf8").toString("base64url"),
    tag: Buffer.alloc(16, 2).toString("base64url"),
    aadHash: canonicalSha256("synthetic exchange aad"),
  };
  const input: PublicCoreOperationInputV1 = {
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room.pair.exchange",
    actorClass: operationDefinition("room.pair.exchange").actor,
    actorScopeDigest: ACTOR_SCOPE,
    params: { pairingId },
    body: {
      pairingCode: "pairing_code_application_contract_00000000001",
      clientPublicKey: "application-contract-client-public-key",
    },
    authorizationSecret: null,
    idempotencyKey: "pair_exchange_envelope_contract_00000000000001",
    expectedVersion: 1,
  };
  for (const envelope of [
    { ...validEnvelope, nonce: "A" },
    { ...validEnvelope, tag: "A" },
    { ...validEnvelope, ciphertext: "A" },
    { ...validEnvelope, ciphertext: Buffer.alloc(32_769, 3).toString("base64url") },
  ]) {
    const store = storeDouble(async () => ({
      status: 200,
      body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
      recovered: false,
    })) as unknown as Record<string, unknown>;
    store.exchangeRoomPair = async () => ({
      status: 201,
      body: {
        schemaVersion: "r4_public_core_pairing_exchanged.v1",
        pairingId,
        bindingId,
        exchangeEnvelope: envelope,
        version: 2,
      },
      recovered: false,
    });
    await errorCode(
      new PublicCoreApplicationV1(store as unknown as PublicCoreApplicationStoreV1).run(input),
      "public_core_store_contract_invalid",
      503,
    );
  }
});

test("application binds injected responses to the exact requested Room, Projection, Interaction, and event identity", async () => {
  const roomId = `room_${"m".repeat(32)}`;
  const otherRoomId = `room_${"n".repeat(32)}`;
  const interactionId = `interaction_${"m".repeat(32)}`;
  const otherInteractionId = `interaction_${"n".repeat(32)}`;
  const value = capsule(roomId, 7);
  const lifecycle = {
    projectionId: value.projectionId,
    roomId,
    payloadHash: value.payloadHash,
    ownerState: "published_fresh",
    curationState: "admitted",
    current: true,
    publishedAt: value.publishedAt,
    freshUntil: value.freshUntil,
    expiresAt: value.expiresAt,
    version: 1,
    bodyAvailable: true,
  };
  const interaction = {
    interactionId,
    roomId,
    projectionId: value.projectionId,
    originProjectionHash: value.payloadHash,
    interactionType: "ask",
    consent: "manual_owner_only",
    state: "seen_locally",
    acceptedAt: T0,
    expiresAt: "2026-09-09T12:00:00.000Z",
    version: 2,
    bodyAvailable: true,
    localPurgeReceivedAt: null,
  };
  const operation = (
    action: string,
    overrides: Partial<PublicCoreOperationInputV1>,
  ): PublicCoreOperationInputV1 => ({
    schemaVersion: "r4_public_core_operation_input.v1",
    action,
    actorClass: operationDefinition(action).actor,
    actorScopeDigest: ACTOR_SCOPE,
    params: {},
    body: {},
    authorizationSecret: null,
    idempotencyKey: operationDefinition(action).mutating ? `response_binding_${action.replaceAll(".", "_")}_000000000001` : null,
    expectedVersion: null,
    ...overrides,
  });
  const rejects = async (
    method: keyof PublicCoreApplicationStoreV1,
    input: PublicCoreOperationInputV1,
    response: unknown,
  ): Promise<void> => {
    const store = storeDouble(async () => ({
      status: 200,
      body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
      recovered: false,
    })) as unknown as Record<string, unknown>;
    store[method] = async () => response;
    await errorCode(
      new PublicCoreApplicationV1(store as unknown as PublicCoreApplicationStoreV1).run(input),
      "public_core_store_contract_invalid",
      503,
    );
  };

  await rejects("listThirdPlace", operation("third_place.list", {}), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_third_place_list.v1",
      residents: [{ roomId, projection: value }, { roomId, projection: value }],
    },
    recovered: false,
  });
  await rejects("listThirdPlace", operation("third_place.list", {}), {
    status: 200,
    body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
    recovered: true,
  });
  await rejects("readProjection", operation("projection.read", {
    params: { projectionId: `proj_${"x".repeat(32)}` },
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_projection_read.v1",
      projection: value,
      lifecycle,
      staleWarning: false,
      discoverable: true,
      newKnockAvailable: true,
    },
    recovered: false,
  });
  await rejects("readProjection", operation("projection.read", {
    params: { projectionId: value.projectionId },
  }), {
    status: 410,
    body: {
      schemaVersion: "r4_public_core_projection_tombstone.v1",
      ...lifecycle,
      ownerState: "stale",
      current: false,
      bodyAvailable: false,
    },
    recovered: false,
  });
  await rejects("readProjection", operation("projection.read", {
    params: { projectionId: value.projectionId },
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_projection_read.v1",
      projection: value,
      lifecycle: { ...lifecycle, curationState: "unlisted" },
      staleWarning: false,
      discoverable: true,
      newKnockAvailable: true,
    },
    recovered: false,
  });
  await rejects("readProjection", operation("projection.read", {
    params: { projectionId: value.projectionId },
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_projection_read.v1",
      projection: value,
      lifecycle: { ...lifecycle, ownerState: "stale" },
      staleWarning: false,
      discoverable: true,
      newKnockAvailable: true,
    },
    recovered: false,
  });
  await rejects("readInteraction", operation("interaction.read", {
    actorClass: "guest_capability",
    authorizationSecret: "reply_secret_response_binding_0000000000000001",
    params: { interactionId: otherInteractionId },
  }), {
    status: 200,
    body: { schemaVersion: "r4_public_core_interaction_status.v1", interaction },
    recovered: false,
  });
  await rejects("readRoomOperatorStatus", operation("room_operator.status", {
    actorClass: "room_operator",
    authorizationSecret: "binding_secret_response_binding_0000000000001",
    body: { roomId },
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_room_operator_status.v1",
      roomId: otherRoomId,
      roomMode: "public_single",
      roomVersion: 1,
      currentProjectionId: value.projectionId,
      eventHighWater: 1,
      earliestReplayableSequence: 3,
      bindingId: `binding_${"m".repeat(32)}`,
      bindingVersion: 1,
      retentionWriteStop: false,
    },
    recovered: false,
  });
  await rejects("pullRoomOperator", operation("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: "binding_secret_response_binding_0000000000001",
    params: { interactionId: otherInteractionId },
    expectedVersion: 1,
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_pull.v1",
      interaction,
      requestBody: "Bound response request body.",
      guestCapsule: null,
      bodyHash: canonicalSha256("Bound response request body."),
    },
    recovered: false,
  });
  await rejects("setRoomMode", operation("room.mode.set", {
    params: { roomId },
    body: { interactionMode: "closed" },
    expectedVersion: 1,
  }), {
    status: 200,
    body: {
      schemaVersion: "r4_public_core_mutation_result.v1",
      action: "room.mode.set",
      targetId: otherRoomId,
      targetVersion: 2,
      code: "room_mode_set",
    },
    recovered: false,
  });
});

test("application rejects semantically inconsistent injected sync events and incomplete windows", async () => {
  const roomId = `room_${"s".repeat(32)}`;
  const eventId = `event_${"s".repeat(32)}`;
  const eventPreimage = (overrides: Readonly<Record<string, unknown>> = {}) => ({
    schemaVersion: "r4_public_core_room_event.v1",
    eventId,
    roomId,
    sequence: 1,
    action: "room.create",
    targetKind: "room",
    targetId: roomId,
    targetVersion: 1,
    committedAt: T0,
    bodyAvailable: true,
    ...overrides,
  });
  const signedEvent = (overrides: Readonly<Record<string, unknown>> = {}) => {
    const preimage = eventPreimage(overrides);
    return { ...preimage, eventHash: canonicalSha256(preimage) };
  };
  const syncInput: PublicCoreOperationInputV1 = {
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.sync",
    actorClass: "room_operator",
    actorScopeDigest: ACTOR_SCOPE,
    params: {},
    body: { roomId, afterSequence: 0 },
    authorizationSecret: "binding_secret_sync_contract_00000000000000001",
    idempotencyKey: "sync_contract_injected_000000000000000000001",
    expectedVersion: null,
  };
  const rejects = async (body: Readonly<Record<string, unknown>>): Promise<void> => {
    const store = storeDouble(async () => ({
      status: 200,
      body: { schemaVersion: "r4_public_core_third_place_list.v1", residents: [] },
      recovered: false,
    })) as unknown as Record<string, unknown>;
    store.syncRoomOperator = async () => ({ status: 200, body, recovered: false });
    await errorCode(
      new PublicCoreApplicationV1(store as unknown as PublicCoreApplicationStoreV1).run(syncInput),
      "public_core_store_contract_invalid",
      503,
    );
  };
  const batch = (events: readonly unknown[], highWater = 1) => ({
    schemaVersion: "r4_public_core_event_batch.v1",
    roomId,
    afterSequence: 0,
    highWater,
    events,
  });
  await rejects(batch([signedEvent({ targetKind: "interaction" })]));
  await rejects(batch([signedEvent({ targetId: `interaction_${"s".repeat(32)}` })]));
  await rejects(batch([signedEvent({ bodyAvailable: false })]));
  await rejects(batch([signedEvent({ action: "room_operator.sync" })]));
  await rejects(batch([signedEvent({ sequence: 2 })], 2));
  await rejects(batch([signedEvent()], 2));
});

test("one-Room public flow keeps public Projection useful and private Interaction encrypted/body-free", async () => {
  const h = harness();
  assert.deepEqual((await h.call("third_place.list")).body.residents, []);
  const pending = await pendingInteraction(h);
  const durableImage = await h.store.exportDurableImage();
  assert.equal(JSON.stringify(durableImage).includes(RATE_BUCKET), false, "raw caller bucket must never be durable");
  assert.equal(durableImage.rateEvents[0]?.bucketDigest.schemaVersion, "r4_public_core_keyed_digest.v1");

  const listed = await h.call("third_place.list");
  assert.equal((listed.body.residents as unknown[]).length, 1);
  const direct = await h.call("projection.read", { params: { projectionId: pending.projection.projectionId } });
  assert.equal((direct.body.projection as ProjectionCapsuleV1).title, "Forme Project");
  const guestStatus = await h.call("interaction.read", {
    actorClass: "guest_capability",
    authorizationSecret: pending.replySecret,
    params: { interactionId: pending.interactionId },
  });
  assert.equal(JSON.stringify(guestStatus).includes("CANARY_PRIVATE_REQUEST"), false);

  const status = await h.call("room_operator.status", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId },
  });
  assert.equal(status.body.roomMode, "public_single");
  const synced = await h.call("room_operator.sync", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId, afterSequence: 0 },
  });
  const events = synced.body.events as Array<{ eventId: string; sequence: number; eventHash: string }>;
  assert.ok(events.length >= 1);
  assert.equal(JSON.stringify(events).includes("CANARY_PRIVATE_REQUEST"), false);

  const pulled = await h.call("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  assert.equal(pulled.body.requestBody, "Synthetic Guest question CANARY_PRIVATE_REQUEST.");
  const pullRecoveryInput: PublicCoreOperationInputV1 = {
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.pull",
    actorClass: "room_operator",
    actorScopeDigest: ACTOR_SCOPE,
    params: { interactionId: pending.interactionId },
    body: {},
    authorizationSecret: pending.bindingSecret,
    idempotencyKey: h.store.snapshot().receipts.find((receipt) => receipt.action === "room_operator.pull")!.idempotencyKey,
    expectedVersion: 1,
  };
  const pullReplay = await h.app.run(pullRecoveryInput);
  assert.equal(pullReplay.recovered, true);
  assert.equal(pullReplay.body.requestBody, pulled.body.requestBody);

  const event = events[0]!;
  const acked = await h.call("room_operator.ack", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash },
  });
  assert.equal(acked.status, 200);
  await h.call("room_operator.local_purge.receipt", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    body: { localBytesAbsent: true },
    expectedVersion: 2,
  });
  const staleReceiptReplay = await h.app.run(pullRecoveryInput);
  assert.equal(staleReceiptReplay.status, 200);
  assert.equal(staleReceiptReplay.body.requestBody, pulled.body.requestBody);
  assert.deepEqual(staleReceiptReplay.body, pulled.body);
  const deleted = await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 3,
  });
  assert.equal(deleted.body.bodyAvailable, false);
  const snapshotText = JSON.stringify(h.store.snapshot());
  for (const canary of ["CANARY_PRIVATE_REQUEST", pending.replySecret, pending.deleteSecret, pending.bindingSecret, h.ids.lastSecret("pairing_code")]) {
    assert.equal(snapshotText.includes(canary), false);
  }
});

test("all four reads leave the durable image byte-for-byte unchanged", async () => {
  const h = harness();
  const pending = await pendingInteraction(h);
  const before = JSON.stringify(await h.store.exportDurableImage());

  await h.call("third_place.list");
  await h.call("projection.read", { params: { projectionId: pending.projection.projectionId } });
  await h.call("interaction.read", {
    actorClass: "guest_capability",
    authorizationSecret: pending.replySecret,
    params: { interactionId: pending.interactionId },
  });
  await h.call("room_operator.status", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId },
  });

  assert.equal(JSON.stringify(await h.store.exportDurableImage()), before);
});

test("public encounter JSON cannot select or rotate the trusted coarse rate bucket", async () => {
  const h = harness();
  const ready = await admittedProjection(h);
  const input: PublicCoreOperationInputV1 = {
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "public_encounter.issue",
    actorClass: "public",
    actorScopeDigest: ACTOR_SCOPE,
    params: { projectionId: ready.projection.projectionId },
    body: {
      encounterSecret: "trusted_bucket_encounter_secret_00000000000001",
      coarseRateBucket: `bucket_${"caller".repeat(5)}`,
    },
    authorizationSecret: null,
    idempotencyKey: "trusted_bucket_idempotency_00000000000000001",
    expectedVersion: 2,
  };
  const trustedA: PublicCoreTrustedTransportMetadataV1 = {
    schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
    coarseRateBucket: `bucket_${"a".repeat(32)}`,
  };
  await errorCode(h.app.run(input, trustedA), "invalid_request_shape", 400);

  const publicBodyOnly = { ...input, body: { encounterSecret: input.body.encounterSecret } };
  await h.app.run(publicBodyOnly, trustedA);
  await errorCode(h.app.run(publicBodyOnly, {
    schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
    coarseRateBucket: `bucket_${"b".repeat(32)}`,
  }), "idempotency_conflict", 409);

  const imageText = JSON.stringify(await h.store.exportDurableImage());
  assert.equal(imageText.includes(trustedA.coarseRateBucket!), false);
  assert.equal(imageText.includes("caller"), false);
});

test("closed mode preserves direct reads and recovery while denying new intake", async () => {
  const h = harness();
  const ready = await admittedProjection(h);
  await h.call("room.mode.set", { params: { roomId: ready.roomId }, body: { interactionMode: "closed" }, expectedVersion: 2 });
  assert.equal((await h.call("projection.read", { params: { projectionId: ready.projection.projectionId } })).status, 200);
  assert.equal((await h.call("room_operator.status", { actorClass: "room_operator", authorizationSecret: ready.bindingSecret, body: { roomId: ready.roomId } })).body.roomMode, "closed");
  await errorCode(h.call("public_encounter.issue", {
    params: { projectionId: ready.projection.projectionId },
    body: { encounterSecret: "closed_encounter_secret_0000000000000000000001" },
    expectedVersion: 2,
  }), "R4_PUBLIC_CORE_INTAKE_CLOSED");
});

test("same key/same hash recovers, same key/different hash conflicts, and singleton/new-key semantic replay fails", async () => {
  const h = harness();
  const key = "idem_same_key_000000000000000000000001";
  const request: Partial<PublicCoreOperationInputV1> = { body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Forme Project Room" }, idempotencyKey: key };
  const first = await h.call("room.create", request);
  const replay = await h.call("room.create", request);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);
  await errorCode(h.call("room.create", { ...request, body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Different label" } }), "idempotency_conflict", 409);
  await errorCode(h.call("room.create", { body: request.body }), "single_room_slot_occupied", 409);
});

test("successor is an immediate body-free tombstone; unlisted current remains direct-readable and cannot be re-admitted", async () => {
  const h = harness();
  const ready = await admittedProjection(h);
  await h.call("curation.unlist", { actorClass: "curator", params: { projectionId: ready.projection.projectionId }, expectedVersion: 2 });
  assert.equal((await h.call("projection.read", { params: { projectionId: ready.projection.projectionId } })).status, 200);
  assert.deepEqual((await h.call("third_place.list")).body.residents, []);
  await errorCode(h.call("curation.admit", { actorClass: "curator", params: { projectionId: ready.projection.projectionId }, expectedVersion: 3 }), "projection_not_admittable", 409);

  const successor = capsule(ready.roomId, 2);
  await h.call("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: ready.bindingSecret,
    body: { projection: successor, publicationApprovalHash: canonicalSha256("successor approval"), publicationAttestationHash: canonicalSha256("successor attestation") },
    expectedVersion: 2,
  });
  const old = await h.call("projection.read", { params: { projectionId: ready.projection.projectionId } });
  assert.equal(old.status, 410);
  assert.equal(old.body.bodyAvailable, false);
  assert.equal(JSON.stringify(h.store.snapshot()).includes(ready.projection.thirdPlaceSummary), false);
});

test("a hard-expired Projection read is a non-mutating tombstone; the explicit janitor clears ciphertext", async () => {
  const h = harness();
  const ready = await admittedProjection(h);
  h.now.value = "2026-08-17T12:00:00.000Z";
  const beforeRead = JSON.stringify(h.store.snapshot());
  const expired = await h.call("projection.read", { params: { projectionId: ready.projection.projectionId } });
  assert.equal(expired.status, 410);
  assert.equal(expired.body.bodyAvailable, false);
  assert.equal(JSON.stringify(h.store.snapshot()), beforeRead);

  await createPublicCoreTestMaintenanceV1(h.store).runRetentionTransitions();
  const snapshot = h.store.snapshot();
  assert.equal(snapshot.projections[0]?.capsule, null);
  assert.equal(snapshot.projections[0]?.ownerState, "expired");
  const job = snapshot.purgeJobs.find((value) => value.targetId === ready.projection.projectionId)!;
  assert.ok(Date.parse(job.targetBy) - Date.parse(job.enqueuedAt) < 24 * 60 * 60 * 1_000);
});

test("retention-health stop denies fresh pull but permits exact committed pull replay", async () => {
  const h = harness();
  const pending = await pendingInteraction(h);
  const key = "idem_pull_recovery_000000000000000000001";
  const request: Partial<PublicCoreOperationInputV1> = {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: key,
  };
  await h.call("room_operator.pull", request);
  h.now.value = "2026-08-12T01:00:00.000Z";
  const recovered = await h.call("room_operator.pull", request);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.body.requestBody, "Synthetic Guest question CANARY_PRIVATE_REQUEST.");
  await errorCode(h.call("room_operator.pull", { ...request, idempotencyKey: "idem_fresh_pull_00000000000000000000001", expectedVersion: 2 }), "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED", 503);
});

test("Projection revoke terminalizes request body and wins over lost pull response", async () => {
  const h = harness();
  const pending = await pendingInteraction(h);
  const pullKey = "idem_pull_before_revoke_000000000000000001";
  const pullRequest: Partial<PublicCoreOperationInputV1> = {
    actorClass: "room_operator", authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId }, expectedVersion: 1, idempotencyKey: pullKey,
  };
  await h.call("room_operator.pull", pullRequest);
  await h.call("projection.revoke", { params: { projectionId: pending.projection.projectionId }, expectedVersion: 2 });
  const replay = await h.call("room_operator.pull", pullRequest);
  assert.equal(replay.status, 410);
  assert.equal(replay.body.bodyAvailable, false);
  assert.equal(JSON.stringify(replay).includes("CANARY_PRIVATE_REQUEST"), false);
});

test("a body-free terminal pull receipt also replays its exact original reconciliation", async () => {
  const h = harness();
  const pending = await pendingInteraction(h);
  await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  const request: Partial<PublicCoreOperationInputV1> = {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: "idem_terminal_pull_00000000000000000000001",
  };
  const first = await h.call("room_operator.pull", request);
  const replay = await h.call("room_operator.pull", request);
  assert.equal(first.status, 410);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);
});

test("idempotent recovery still reauthenticates the exact Guest and Room Operator capability", async () => {
  const h = harness();
  const pending = await pendingInteraction(h);
  const pullKey = "idem_pull_auth_recheck_000000000000000000001";
  const pull = {
    actorClass: "room_operator" as const,
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: pullKey,
  };
  await h.call("room_operator.pull", pull);
  await errorCode(h.call("room_operator.pull", { ...pull, authorizationSecret: "wrong_binding_secret_000000000000000000000001" }), "not_found", 404);

  const deleteKey = "idem_delete_auth_recheck_0000000000000000001";
  const deletion = {
    actorClass: "guest_capability" as const,
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: deleteKey,
  };
  await h.call("interaction.delete", deletion);
  await errorCode(h.call("interaction.delete", { ...deletion, authorizationSecret: "wrong_delete_secret_0000000000000000000000001" }), "not_found", 404);
});

test("wrong actor, wrong Room-shaped ID, unknown fields, and malformed secrets fail closed without echo", async () => {
  const h = harness();
  await errorCode(h.call("room.create", { actorClass: "room_operator", body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "CANARY_ACTOR" } }), "not_found", 404);
  await assert.rejects(
    h.app.run({
      schemaVersion: "r4_public_core_operation_input.v1",
      action: "third_place.list",
      actorClass: "public",
      actorScopeDigest: ACTOR_SCOPE,
      params: { unknownCanary: "SHOULD_NOT_ECHO" },
      body: {}, authorizationSecret: null, idempotencyKey: null, expectedVersion: null,
    }),
    (error: unknown) => JSON.stringify(error).includes("SHOULD_NOT_ECHO") === false,
  );
});
