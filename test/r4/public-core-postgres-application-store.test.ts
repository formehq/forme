import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  GOLDEN_GUEST_CAPSULE,
  GOLDEN_PROJECTION,
  GOLDEN_ROOM,
  canonicalJson,
  canonicalSha256,
} from "../../packages/r4-protocol/src/index.ts";
import {
  PublicCoreCryptoKeyHandleV1,
  encryptPublicCoreField,
  type PublicCoreFieldAadV1,
  type PublicCoreEncryptedFieldV1,
} from "../../apps/room/src/public-core-crypto.ts";
import {
  PublicCorePostgresApplicationStoreV1,
  authenticPublicCorePostgresApplicationStoreErrorDetails,
  createPublicCorePostgresApplicationStoreV1,
  type PublicCorePostgresApplicationIdentityPortV1,
  type PublicCorePostgresApplicationStoreConfigV1,
} from "../../apps/room/src/public-core-postgres-application-store.ts";
import type {
  PublicCorePreparedSqlStoreV1,
  PublicCoreSqlMutationActionV1,
} from "../../apps/room/src/public-core-postgres.ts";
import type { PublicCoreConfigReference } from "../../apps/room/src/production-config.ts";
import type { PublicCoreMutationContextV1 } from "../../apps/room/src/public-core-store.ts";

const NOW = "2026-08-03T13:00:00.000Z";
const BODY_REF = `ref:body-encryption/postgres-bridge-test@sha256:${"1".repeat(64)}` as PublicCoreConfigReference;
const PEPPER_REF = `ref:capability-pepper/postgres-bridge-test@sha256:${"2".repeat(64)}` as PublicCoreConfigReference;
const APPROVAL_ID = `approval_${"a".repeat(24)}`;
const SHA = canonicalSha256("synthetic");

function bodyKey(): PublicCoreCryptoKeyHandleV1 {
  return new PublicCoreCryptoKeyHandleV1({
    purpose: "body_encryption",
    reference: BODY_REF,
    material: new Uint8Array(32).fill(17),
  });
}

function pepperKey(): PublicCoreCryptoKeyHandleV1 {
  return new PublicCoreCryptoKeyHandleV1({
    purpose: "capability_pepper",
    reference: PEPPER_REF,
    material: new Uint8Array(32).fill(29),
  });
}

const identity: PublicCorePostgresApplicationIdentityPortV1 = Object.freeze({
  deriveId(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveId"]>[0]): string {
    const suffix = createHash("sha256").update(canonicalJson(input)).digest("base64url").slice(0, 24);
    return `${input.prefix}_${suffix}`;
  },
  deriveSecret(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveSecret"]>[0]): string {
    return createHash("sha256").update(canonicalJson(input)).digest("base64url");
  },
  deriveNonce(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveNonce"]>[0]): Uint8Array {
    return Uint8Array.from(createHash("sha256").update(canonicalJson(input)).digest().subarray(0, 12));
  },
});

type Call = Readonly<{ name: string; args: readonly unknown[] }>;

class FakePreparedStore {
  readonly calls: Call[] = [];
  readonly results = new Map<string, unknown>();
  throwFrom: string | null = null;

  #call(name: string, args: readonly unknown[]): unknown {
    this.calls.push(Object.freeze({ name, args: structuredClone(args) }));
    if (this.throwFrom === name) throw new Error("PRIVATE_DATABASE_CANARY");
    const result = this.results.get(name);
    if (result === undefined) throw new Error(`missing fake result: ${name}`);
    return result;
  }

  async listThirdPlace(...args: readonly unknown[]): Promise<unknown> { return this.#call("listThirdPlace", args); }
  async readProjection(...args: readonly unknown[]): Promise<unknown> { return this.#call("readProjection", args); }
  async readInteraction(...args: readonly unknown[]): Promise<unknown> { return this.#call("readInteraction", args); }
  async readRoomOperatorStatus(...args: readonly unknown[]): Promise<unknown> { return this.#call("readRoomOperatorStatus", args); }
  async issuePublicEncounter(...args: readonly unknown[]): Promise<unknown> { return this.#call("issuePublicEncounter", args); }
  async createInteraction(...args: readonly unknown[]): Promise<unknown> { return this.#call("createInteraction", args); }
  async deleteInteraction(...args: readonly unknown[]): Promise<unknown> { return this.#call("deleteInteraction", args); }
  async exchangeRoomPair(...args: readonly unknown[]): Promise<unknown> { return this.#call("exchangeRoomPair", args); }
  async createRoom(...args: readonly unknown[]): Promise<unknown> { return this.#call("createRoom", args); }
  async createRoomPair(...args: readonly unknown[]): Promise<unknown> { return this.#call("createRoomPair", args); }
  async revokeRoomBinding(...args: readonly unknown[]): Promise<unknown> { return this.#call("revokeRoomBinding", args); }
  async setRoomMode(...args: readonly unknown[]): Promise<unknown> { return this.#call("setRoomMode", args); }
  async revokeProjection(...args: readonly unknown[]): Promise<unknown> { return this.#call("revokeProjection", args); }
  async admitProjection(...args: readonly unknown[]): Promise<unknown> { return this.#call("admitProjection", args); }
  async unlistProjection(...args: readonly unknown[]): Promise<unknown> { return this.#call("unlistProjection", args); }
  async syncRoomOperator(...args: readonly unknown[]): Promise<unknown> { return this.#call("syncRoomOperator", args); }
  async pullRoomOperator(...args: readonly unknown[]): Promise<unknown> { return this.#call("pullRoomOperator", args); }
  async ackRoomOperator(...args: readonly unknown[]): Promise<unknown> { return this.#call("ackRoomOperator", args); }
  async deliverProjection(...args: readonly unknown[]): Promise<unknown> { return this.#call("deliverProjection", args); }
  async recordLocalPurgeReceipt(...args: readonly unknown[]): Promise<unknown> { return this.#call("recordLocalPurgeReceipt", args); }
}

function config(store: FakePreparedStore, key = bodyKey()): PublicCorePostgresApplicationStoreConfigV1 {
  return Object.freeze({
    postgresStore: store as unknown as PublicCorePreparedSqlStoreV1,
    roomId: GOLDEN_ROOM.roomId,
    bodyEncryptionKey: key,
    capabilityPepperKey: pepperKey(),
    now: () => NOW,
    identity,
    publicationVerifier: async () => Object.freeze({
      basisHash: canonicalSha256("basis"),
      projectionPolicyHash: canonicalSha256("policy"),
      publicationApprovalId: APPROVAL_ID,
    }),
  });
}

const ACTORS: Readonly<Record<PublicCoreSqlMutationActionV1, PublicCoreMutationContextV1["actorClass"]>> = Object.freeze({
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
});

function context(
  action: PublicCoreSqlMutationActionV1,
  input: Readonly<{ expectedVersion?: number | null; authorizationSecret?: string | null }> = {},
): PublicCoreMutationContextV1 {
  return Object.freeze({
    action,
    actorClass: ACTORS[action],
    actorScopeDigest: canonicalSha256(`scope:${action}`),
    idempotencyKey: createHash("sha256").update(action).digest("hex"),
    canonicalRequestHash: canonicalSha256({ action }),
    expectedVersion: input.expectedVersion ?? null,
    authorizationSecret: input.authorizationSecret ?? null,
  });
}

function bodyFree(
  action: PublicCoreSqlMutationActionV1,
  targetId: string,
  targetVersion: number,
  code: string,
  recovered = false,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    kind: "body_free",
    action,
    status: action === "room.create" || action === "public_encounter.issue"
      || action === "interaction.create" || action === "room_operator.projection.deliver" ? 201 : 200,
    code,
    receiptId: `receipt_${"r".repeat(24)}`,
    targetId,
    targetVersion,
    recovered,
  });
}

async function encryptedEnvelope(
  key: PublicCoreCryptoKeyHandleV1,
  aad: PublicCoreFieldAadV1,
  plaintext: string,
): Promise<PublicCoreEncryptedFieldV1> {
  const encrypted = await encryptPublicCoreField({
    key,
    plaintext: new TextEncoder().encode(plaintext),
    aad,
    nonceAuthority: Object.freeze({ reserve(): void {} }),
    nonceSource: () => new Uint8Array(12).fill(aad.objectVersion + 3),
  });
  return encrypted.envelope;
}

test("bridge exposes exactly the approved 20-method application store and captures its named prepared-store methods", async () => {
  const expected = [
    "listThirdPlace", "readProjection", "readInteraction", "readRoomOperatorStatus",
    "issuePublicEncounter", "createInteraction", "deleteInteraction", "exchangeRoomPair",
    "createRoom", "createRoomPair", "revokeRoomBinding", "setRoomMode", "revokeProjection",
    "admitProjection", "unlistProjection", "syncRoomOperator", "pullRoomOperator",
    "ackRoomOperator", "deliverProjection", "recordLocalPurgeReceipt",
  ].sort();
  assert.deepEqual(
    Object.getOwnPropertyNames(PublicCorePostgresApplicationStoreV1.prototype)
      .filter((name) => name !== "constructor").sort(),
    expected,
  );

  const store = new FakePreparedStore();
  store.results.set("createRoom", bodyFree("room.create", GOLDEN_ROOM.roomId, 1, "room_created"));
  const bridge = createPublicCorePostgresApplicationStoreV1(config(store));
  store.createRoom = async (): Promise<never> => { throw new Error("LATE_METHOD_SWAP_CANARY"); };
  const result = await bridge.createRoom(context("room.create"), {
    entityId: GOLDEN_ROOM.entityId,
    label: "Synthetic closed Room",
  });
  assert.equal(result.status, 201);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), {
    schemaVersion: "r4_public_core_room_created.v1",
    roomId: GOLDEN_ROOM.roomId,
    roomVersion: 1,
    roomMode: "closed",
  });
  assert.equal(store.calls[0]?.name, "createRoom");
  const [sqlContext, sqlInput] = store.calls[0]?.args as readonly [Record<string, unknown>, Record<string, unknown>];
  assert.match(String(sqlContext.actorScopeDigest), /^hmac-sha256:[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(sqlInput).includes("Synthetic closed Room"), false);
  assert.equal(Object.hasOwn(sqlInput, "labelCiphertext"), true);
});

test("read bridge authenticates projection canonical preimage, body-free interaction consent, and operator credential digest", async () => {
  const store = new FakePreparedStore();
  const key = bodyKey();
  const capsule = await encryptedEnvelope(key, {
    schemaVersion: "r4_public_core_aad.v1",
    table: "projections",
    column: "capsule_ciphertext",
    roomId: GOLDEN_ROOM.roomId,
    rowId: GOLDEN_PROJECTION.projectionId,
    objectVersion: 1,
  }, canonicalJson(GOLDEN_PROJECTION));
  const projectionRow = Object.freeze({
    projectionId: GOLDEN_PROJECTION.projectionId,
    roomId: GOLDEN_ROOM.roomId,
    capsuleCiphertext: capsule,
    payloadHash: GOLDEN_PROJECTION.payloadHash,
    capsuleFieldVersion: 1,
    ownerState: "published_fresh",
    curationState: "admitted",
    interactionMode: "public_single",
    current: true,
    bodyAvailable: true,
    lifecycleVersion: 2,
    publishedAt: GOLDEN_PROJECTION.publishedAt,
    freshUntil: GOLDEN_PROJECTION.freshUntil,
    expiresAt: GOLDEN_PROJECTION.expiresAt,
  });
  store.results.set("listThirdPlace", Object.freeze({ kind: "read", action: "third_place.list", rows: [Object.freeze({
    thirdPlaceId: "thirdplace_forme_public_core_v1",
    roomId: GOLDEN_ROOM.roomId,
    projectionId: GOLDEN_PROJECTION.projectionId,
    capsuleCiphertext: capsule,
    payloadHash: GOLDEN_PROJECTION.payloadHash,
    capsuleFieldVersion: 1,
    lifecycleVersion: 2,
    freshUntil: GOLDEN_PROJECTION.freshUntil,
    expiresAt: GOLDEN_PROJECTION.expiresAt,
  })] }));
  store.results.set("readProjection", Object.freeze({ kind: "read", action: "projection.read", rows: [projectionRow] }));
  store.results.set("readInteraction", Object.freeze({ kind: "read", action: "interaction.read", rows: [Object.freeze({
    interactionId: `interaction_${"i".repeat(24)}`,
    roomId: GOLDEN_ROOM.roomId,
    originProjectionId: GOLDEN_PROJECTION.projectionId,
    originProjectionHash: GOLDEN_PROJECTION.payloadHash,
    interactionType: "ask",
    consentHash: canonicalSha256({ consent: "manual_owner_only" }),
    state: "accepted",
    version: 1,
    acceptedAt: NOW,
    bodyExpiresAt: "2026-09-02T13:00:00.000Z",
    bodyAvailable: true,
    localPurgeReceivedAt: null,
  })] }));
  store.results.set("readRoomOperatorStatus", Object.freeze({ kind: "read", action: "room_operator.status", rows: [Object.freeze({
    roomId: GOLDEN_ROOM.roomId,
    interactionMode: "closed",
    roomVersion: 1,
    currentProjectionId: null,
    eventHighWater: 0,
    eventReplayFloor: 1,
    bindingId: `binding_${"b".repeat(24)}`,
    bindingVersion: 1,
    bindingExpiresAt: "2026-09-02T13:00:00.000Z",
    lastSuccessfulPurgeAt: NOW,
    writeStop: false,
  })] }));
  const bridge = createPublicCorePostgresApplicationStoreV1(config(store, key));

  const listed = await bridge.listThirdPlace();
  assert.equal(canonicalJson((listed.body.residents as readonly unknown[])[0]), canonicalJson({ roomId: GOLDEN_ROOM.roomId, projection: GOLDEN_PROJECTION }));
  const read = await bridge.readProjection({ projectionId: GOLDEN_PROJECTION.projectionId });
  assert.equal(canonicalJson(read.body.projection), canonicalJson(GOLDEN_PROJECTION));
  assert.equal((read.body.lifecycle as Record<string, unknown>).version, 2);
  const interaction = await bridge.readInteraction({ interactionId: `interaction_${"i".repeat(24)}`, authorizationSecret: "reply_secret_0000000000000000" });
  assert.equal(((interaction.body.interaction as Record<string, unknown>).consent), "manual_owner_only");
  const status = await bridge.readRoomOperatorStatus({ roomId: GOLDEN_ROOM.roomId, authorizationSecret: "binding_secret_000000000000" });
  assert.equal(status.body.roomMode, "closed");
  const operatorCall = store.calls.find((call) => call.name === "readRoomOperatorStatus");
  const operatorInput = operatorCall?.args[0] as Record<string, unknown>;
  assert.match(String(operatorInput.bindingCredentialDigest), /^hmac-sha256:[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(operatorInput).includes("binding_secret"), false);
});

test("pull bridge returns a receipt-bound typed view after authenticated request and Guest capsule decryption", async () => {
  const store = new FakePreparedStore();
  const key = bodyKey();
  const interactionId = `interaction_${"i".repeat(24)}`;
  const requestBody = "What should this project prioritize next?";
  const guestPlaintext = canonicalJson(GOLDEN_GUEST_CAPSULE);
  const requestEnvelope = await encryptedEnvelope(key, {
    schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "request_ciphertext",
    roomId: GOLDEN_ROOM.roomId, rowId: interactionId, objectVersion: 1,
  }, requestBody);
  const guestEnvelope = await encryptedEnvelope(key, {
    schemaVersion: "r4_public_core_aad.v1", table: "interactions", column: "guest_capsule_ciphertext",
    roomId: GOLDEN_ROOM.roomId, rowId: interactionId, objectVersion: 1,
  }, guestPlaintext);
  store.results.set("pullRoomOperator", Object.freeze({
    kind: "interaction_pull",
    action: "room_operator.pull",
    status: 200,
    code: "interaction_pulled",
    receiptId: `receipt_${"r".repeat(24)}`,
    interactionId,
    interactionVersion: 2,
    projectionId: GOLDEN_PROJECTION.projectionId,
    originProjectionHash: GOLDEN_PROJECTION.payloadHash,
    interactionType: "ask",
    consentHash: canonicalSha256({ consent: "allow_owner_local_ai" }),
    interactionState: "seen_locally",
    acceptedAt: NOW,
    localPurgeReceivedAt: null,
    requestCiphertext: requestEnvelope,
    guestCapsuleCiphertext: guestEnvelope,
    requestFieldVersion: 1,
    bodyHash: canonicalSha256(requestBody),
    guestCapsuleFieldVersion: 1,
    guestCapsuleHash: canonicalSha256(guestPlaintext),
    bodyExpiresAt: "2026-09-02T13:00:00.000Z",
    recovered: true,
  }));
  const bridge = createPublicCorePostgresApplicationStoreV1(config(store, key));
  const result = await bridge.pullRoomOperator(
    context("room_operator.pull", { expectedVersion: 1, authorizationSecret: "binding_secret_000000000000" }),
    { interactionId },
  );
  assert.equal(result.recovered, true);
  assert.equal(result.body.requestBody, requestBody);
  assert.equal(canonicalJson(result.body.guestCapsule), canonicalJson(GOLDEN_GUEST_CAPSULE));
  assert.equal((result.body.interaction as Record<string, unknown>).interactionType, "ask");
  assert.equal((result.body.interaction as Record<string, unknown>).consent, "allow_owner_local_ai");
  const sqlInput = store.calls[0]?.args[1] as Record<string, unknown>;
  assert.equal(Object.hasOwn(sqlInput, "bindingId"), false);
  assert.match(String(sqlInput.bindingCredentialDigest), /^hmac-sha256:[a-f0-9]{64}$/u);
});

test("deterministic identity, secret and nonce ports make retry/reopen mutation inputs byte-identical without exposing binding secret", async () => {
  const firstStore = new FakePreparedStore();
  const secondStore = new FakePreparedStore();
  const pairingId = `pairing_${"p".repeat(24)}`;
  const bindingId = identity.deriveId({
    prefix: "binding",
    purpose: "room_binding",
    action: "room.pair.exchange",
    actorScopeDigest: canonicalSha256("scope:room.pair.exchange"),
    idempotencyKey: createHash("sha256").update("room.pair.exchange").digest("hex"),
    canonicalRequestHash: canonicalSha256({ action: "room.pair.exchange" }),
  });
  const result = Object.freeze({
    kind: "pairing_exchange", action: "room.pair.exchange", status: 201, code: "pairing_exchanged",
    receiptId: `receipt_${"r".repeat(24)}`, pairingId, bindingId,
    exchangeEnvelopeCiphertext: Object.freeze({ schemaVersion: "a256gcm.v1", algorithm: "AES-256-GCM", keyVersion: "keyv_00000000000000000000000000000000", nonce: "AAAAAAAAAAAAAAAA", ciphertext: "AA", tag: "AAAAAAAAAAAAAAAAAAAAAA", aadHash: SHA }),
    expiresAt: "2026-08-13T13:10:00.000Z", targetVersion: 2, recovered: false,
  });
  firstStore.results.set("exchangeRoomPair", result);
  secondStore.results.set("exchangeRoomPair", Object.freeze({ ...result, recovered: true }));
  const sharedBodyKey = bodyKey();
  const sharedPepperKey = pepperKey();
  const base = config(firstStore, sharedBodyKey);
  const secondConfig = Object.freeze({ ...base, postgresStore: secondStore as unknown as PublicCorePreparedSqlStoreV1, capabilityPepperKey: sharedPepperKey });
  const firstConfig = Object.freeze({ ...base, capabilityPepperKey: sharedPepperKey });
  const operation = context("room.pair.exchange", { expectedVersion: 1 });
  const input = { pairingId, pairingCode: "pairing_code_0000000000000000", clientPublicKey: "synthetic-client-public-key" };
  const first = await createPublicCorePostgresApplicationStoreV1(firstConfig).exchangeRoomPair(operation, input);
  const reopened = await createPublicCorePostgresApplicationStoreV1(secondConfig).exchangeRoomPair(operation, input);
  assert.equal(first.recovered, false);
  assert.equal(reopened.recovered, true);
  assert.deepEqual(firstStore.calls[0]?.args, secondStore.calls[0]?.args);
  const serialized = JSON.stringify(firstStore.calls[0]?.args);
  const derivedBindingSecret = identity.deriveSecret({
    kind: "binding_secret",
    purpose: "room_binding",
    action: "room.pair.exchange",
    actorScopeDigest: operation.actorScopeDigest,
    idempotencyKey: operation.idempotencyKey,
    canonicalRequestHash: operation.canonicalRequestHash,
  });
  assert.equal(serialized.includes(derivedBindingSecret), false);
  assert.equal(JSON.stringify(first.body).includes(derivedBindingSecret), false);
});

test("publication verifier is a closed injected port and unknown store failures remint one authentic body-free error", async () => {
  const store = new FakePreparedStore();
  store.results.set("deliverProjection", bodyFree(
    "room_operator.projection.deliver", GOLDEN_PROJECTION.projectionId, 1, "projection_delivered",
  ));
  let verifierInput: unknown = null;
  const bridge = createPublicCorePostgresApplicationStoreV1(Object.freeze({
    ...config(store),
    publicationVerifier: async (
      input: Parameters<PublicCorePostgresApplicationStoreConfigV1["publicationVerifier"]>[0],
    ) => {
      verifierInput = structuredClone(input);
      return Object.freeze({
        basisHash: canonicalSha256("basis"),
        projectionPolicyHash: canonicalSha256("policy"),
        publicationApprovalId: APPROVAL_ID,
      });
    },
  }));
  await bridge.deliverProjection(
    context("room_operator.projection.deliver", { expectedVersion: 1, authorizationSecret: "binding_secret_000000000000" }),
    { projection: GOLDEN_PROJECTION, publicationApprovalHash: canonicalSha256("approval"), publicationAttestationHash: canonicalSha256("attestation") },
  );
  assert.deepEqual((verifierInput as Record<string, unknown>).projection, GOLDEN_PROJECTION);
  const sqlInput = store.calls[0]?.args[1] as Record<string, unknown>;
  assert.equal(sqlInput.publicationApprovalId, APPROVAL_ID);
  assert.equal(sqlInput.basisHash, canonicalSha256("basis"));
  assert.equal(JSON.stringify(sqlInput).includes("binding_secret"), false);

  const failedStore = new FakePreparedStore();
  failedStore.throwFrom = "listThirdPlace";
  const failedBridge = createPublicCorePostgresApplicationStoreV1(config(failedStore));
  await assert.rejects(
    failedBridge.listThirdPlace(),
    (error: unknown) => {
      const details = authenticPublicCorePostgresApplicationStoreErrorDetails(error);
      assert.deepEqual(details, { status: 503, code: "public_core_postgres_store_unavailable" });
      assert.equal(`${String(error)}${JSON.stringify(error)}`.includes("PRIVATE_DATABASE_CANARY"), false);
      return true;
    },
  );
});
