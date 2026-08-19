import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  PublicCoreApplicationV1,
  type PublicCoreOperationInputV1,
  type PublicCoreTrustedTransportMetadataV1,
} from "../../apps/room/src/public-core-application.ts";
import { PublicCoreCryptoKeyHandleV1 } from "../../apps/room/src/public-core-crypto.ts";
import {
  InMemoryPublicCoreStoreV1,
  PUBLIC_CORE_FAULT_POINTS,
  PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS,
  createPublicCoreBodyProtectorV1,
  createPublicCoreTestMaintenanceV1,
  type PublicCoreBodyProtectorV1,
  type PublicCoreDurableStoreImageV1,
  type PublicCoreFaultActionV1,
  type PublicCoreFaultInjectorV1,
  type PublicCoreFaultPointV1,
  type PublicCoreIdSourceV1,
  type PublicCoreMutationContextV1,
  type PublicCoreTestMaintenanceV1,
} from "../../apps/room/src/public-core-store.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { canonicalSha256, type ProjectionCapsuleV1 } from "../../packages/r4-protocol/src/index.ts";
import type { PublicCoreConfigReference } from "../../apps/room/src/production-config.ts";
import type { PublicCoreActionName } from "../../apps/room/src/public-core-policy.ts";

const T0 = "2026-08-10T12:00:00.000Z";
const ENTITY_ID = `entity_${"f".repeat(32)}`;
const ACTOR_SCOPE = canonicalSha256("race actor scope");
const RATE_BUCKET = `bucket_${"r".repeat(32)}`;
const APPROVAL_HASH = canonicalSha256("race publication approval");
const ATTESTATION_HASH = canonicalSha256("race publication attestation");

function plaintextSha256(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

class RaceIds implements PublicCoreIdSourceV1 {
  #serial = 0;
  #latest = new Map<string, string>();
  nextId(prefix: "room" | "projection" | "pairing" | "binding" | "encounter" | "interaction" | "event" | "receipt" | "purge" | "ack"): string {
    this.#serial += 1;
    return `${prefix}_${this.#serial.toString(36).padStart(32, "0")}`;
  }
  nextSecret(kind: "pairing_code" | "binding_secret"): string {
    this.#serial += 1;
    const value = `${kind}_${this.#serial.toString(36).padStart(48, "0")}`;
    this.#latest.set(kind, value);
    return value;
  }
  latest(kind: "pairing_code" | "binding_secret"): string {
    return this.#latest.get(kind) ?? assert.fail(`missing ${kind}`);
  }
}

class OneShotFaults implements PublicCoreFaultInjectorV1 {
  #armed: { action: PublicCoreFaultActionV1; point: PublicCoreFaultPointV1 } | null = null;
  #barrier: Readonly<{
    action: PublicCoreFaultActionV1;
    point: PublicCoreFaultPointV1;
    entered: () => void;
    released: Promise<void>;
  }> | null = null;
  arm(action: PublicCoreFaultActionV1, point: PublicCoreFaultPointV1): void {
    this.#armed = { action, point };
  }
  pause(action: PublicCoreFaultActionV1, point: PublicCoreFaultPointV1): Readonly<{
    entered: Promise<void>;
    release(): void;
  }> {
    if (this.#barrier !== null) throw new Error("fault barrier already armed");
    let entered = (): void => undefined;
    let release = (): void => undefined;
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    this.#barrier = { action, point, entered, released };
    return Object.freeze({ entered: enteredPromise, release });
  }
  async reach(action: PublicCoreFaultActionV1, point: PublicCoreFaultPointV1): Promise<"continue" | "inject_fault"> {
    if (this.#armed?.action === action && this.#armed.point === point) {
      this.#armed = null;
      return "inject_fault";
    }
    const barrier = this.#barrier;
    if (barrier?.action === action && barrier.point === point) {
      barrier.entered();
      await barrier.released;
      if (this.#barrier === barrier) this.#barrier = null;
    }
    return "continue";
  }
}

interface RaceHarness {
  readonly app: PublicCoreApplicationV1;
  readonly store: InMemoryPublicCoreStoreV1;
  readonly ids: RaceIds;
  readonly faults: OneShotFaults;
  readonly protector: PublicCoreBodyProtectorV1;
  readonly maintenance: PublicCoreTestMaintenanceV1;
  readonly now: { value: string };
  build(action: PublicCoreActionName, overrides?: Partial<PublicCoreOperationInputV1>): PublicCoreOperationInputV1;
  execute(input: PublicCoreOperationInputV1, coarseRateBucket?: string): Promise<Awaited<ReturnType<PublicCoreApplicationV1["run"]>>>;
  call(action: PublicCoreActionName, overrides?: Partial<PublicCoreOperationInputV1>, coarseRateBucket?: string): Promise<Awaited<ReturnType<PublicCoreApplicationV1["run"]>>>;
}

function createHarness(): RaceHarness {
  const hash = "b".repeat(64);
  const bodyKey = new PublicCoreCryptoKeyHandleV1({
    purpose: "body_encryption",
    reference: `ref:body-encryption/race-test@sha256:${hash}` as PublicCoreConfigReference,
    material: Uint8Array.from({ length: 32 }, (_, index) => index + 11),
  });
  const pepperKey = new PublicCoreCryptoKeyHandleV1({
    purpose: "capability_pepper",
    reference: `ref:capability-pepper/race-test@sha256:${hash}` as PublicCoreConfigReference,
    material: Uint8Array.from({ length: 32 }, (_, index) => 244 - index),
  });
  const now = { value: T0 };
  const ids = new RaceIds();
  const faults = new OneShotFaults();
  const protector = createPublicCoreBodyProtectorV1({ bodyEncryptionKey: bodyKey, capabilityPepperKey: pepperKey });
  const store = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"r".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => new Date(now.value),
    ids,
    protector,
    fault: faults,
  });
  const app = new PublicCoreApplicationV1(store);
  let serial = 0;
  const build = (action: PublicCoreActionName, overrides: Partial<PublicCoreOperationInputV1> = {}): PublicCoreOperationInputV1 => {
    serial += 1;
    const definition = operationDefinition(action);
    return {
      schemaVersion: "r4_public_core_operation_input.v1",
      action,
      actorClass: definition.actor,
      actorScopeDigest: ACTOR_SCOPE,
      params: {},
      body: {},
      authorizationSecret: null,
      idempotencyKey: definition.mutating ? `race_${serial.toString(36).padStart(32, "0")}` : null,
      expectedVersion: null,
      ...overrides,
    };
  };
  const execute = async (input: PublicCoreOperationInputV1, coarseRateBucket = RATE_BUCKET) => {
    const trustedTransport: PublicCoreTrustedTransportMetadataV1 = {
      schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
      coarseRateBucket: input.action === "public_encounter.issue" ? coarseRateBucket : null,
    };
    return await app.run(input, trustedTransport);
  };
  return { app, store, ids, faults, protector, maintenance: createPublicCoreTestMaintenanceV1(store), now, build, execute, call: async (action, overrides = {}, coarseRateBucket = RATE_BUCKET) => await execute(build(action, overrides), coarseRateBucket) };
}

function projection(roomId: string, serial = 1): ProjectionCapsuleV1 {
  const projectionId = `proj_${serial.toString(36).padStart(32, "0")}`;
  const preimage: Omit<ProjectionCapsuleV1, "payloadHash"> = {
    schemaVersion: "projection_capsule.v1",
    projectionId,
    roomId,
    entityId: ENTITY_ID,
    title: `Forme Project ${serial}`,
    thirdPlaceSummary: "A bounded, Owner-approved project Projection.",
    claims: [
      { slot: "now", text: "Public Core construction is offline.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "nextMove", text: "Prove the bounded knock.", attribution: "inferred_allowed", uncertainty: "Activation remains gated." },
      { slot: "tensions", text: "Presence and control must remain coupled.", attribution: "unresolved_allowed", uncertainty: null },
    ],
    supportedInteractions: ["ask", "seed", "resonance"],
    allowedTopics: ["Forme Vision"],
    unavailableTopics: ["private source bodies"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "The request may reach the Owner without server AI.",
    nonCommitmentStatement: "The Projection cannot commit the Owner.",
    disclosureBasisId: `basis_${serial.toString(36).padStart(32, "0")}`,
    publicationAttestationId: `att_${serial.toString(36).padStart(32, "0")}`,
    publishedAt: T0,
    freshUntil: "2026-08-13T12:00:00.000Z",
    expiresAt: "2026-08-17T12:00:00.000Z",
  };
  return { ...preimage, payloadHash: canonicalSha256(preimage) };
}

async function setupRoom(h: RaceHarness): Promise<string> {
  const created = await h.call("room.create", { body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Race Room" } });
  return created.body.roomId as string;
}

async function setupBinding(h: RaceHarness): Promise<{ roomId: string; bindingId: string; bindingSecret: string }> {
  const roomId = await setupRoom(h);
  const pair = await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
  const exchange = await h.call("room.pair.exchange", {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "race-client-public-key-material" },
    expectedVersion: 1,
  });
  return { roomId, bindingId: exchange.body.bindingId as string, bindingSecret: h.ids.latest("binding_secret") };
}

async function setupDelivered(h: RaceHarness, admit: boolean): Promise<{ roomId: string; bindingSecret: string; projection: ProjectionCapsuleV1 }> {
  const binding = await setupBinding(h);
  const value = projection(binding.roomId);
  await h.call("room_operator.projection.deliver", {
    actorClass: "room_operator", authorizationSecret: binding.bindingSecret,
    body: { projection: value, publicationApprovalHash: APPROVAL_HASH, publicationAttestationHash: ATTESTATION_HASH }, expectedVersion: 1,
  });
  if (admit) await h.call("curation.admit", { actorClass: "curator", params: { projectionId: value.projectionId }, expectedVersion: 1 });
  return { roomId: binding.roomId, bindingSecret: binding.bindingSecret, projection: value };
}

async function setupEncounter(h: RaceHarness): Promise<{ roomId: string; bindingSecret: string; projection: ProjectionCapsuleV1; encounterSecret: string }> {
  const ready = await setupDelivered(h, true);
  const encounterSecret = "race_encounter_secret_000000000000000000000001";
  await h.call("public_encounter.issue", { params: { projectionId: ready.projection.projectionId }, body: { encounterSecret }, expectedVersion: 2 });
  return { ...ready, encounterSecret };
}

async function setupInteraction(h: RaceHarness): Promise<{ roomId: string; bindingSecret: string; projection: ProjectionCapsuleV1; interactionId: string; replySecret: string; deleteSecret: string }> {
  const encounter = await setupEncounter(h);
  const replySecret = "race_reply_secret_00000000000000000000000001";
  const deleteSecret = "race_delete_secret_0000000000000000000000001";
  const created = await h.call("interaction.create", {
    actorClass: "guest_capability", authorizationSecret: encounter.encounterSecret,
    body: {
      projectionId: encounter.projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Synthetic race request body.",
      guestCapsule: null,
      replySecret,
      deleteSecret,
    },
  });
  return { ...encounter, interactionId: created.body.targetId as string, replySecret, deleteSecret };
}

const MUTATIONS = [
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

async function preparedMutation(action: typeof MUTATIONS[number]): Promise<{ h: RaceHarness; input: PublicCoreOperationInputV1 }> {
  const h = createHarness();
  const key = `target_${action.replaceAll(".", "_")}_000000000000000000000001`;
  switch (action) {
    case "room.create":
      return { h, input: h.build(action, { idempotencyKey: key, body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Target Room" } }) };
    case "room.pair": {
      const roomId = await setupRoom(h);
      return { h, input: h.build(action, { idempotencyKey: key, params: { roomId }, expectedVersion: 1 }) };
    }
    case "room.pair.exchange": {
      const roomId = await setupRoom(h);
      const pair = await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
      return { h, input: h.build(action, { idempotencyKey: key, params: { pairingId: pair.body.pairingId }, body: { pairingCode: pair.body.pairingCode, clientPublicKey: "target-client-public-key" }, expectedVersion: 1 }) };
    }
    case "room.binding.revoke": {
      const bound = await setupBinding(h);
      return { h, input: h.build(action, { idempotencyKey: key, params: { bindingId: bound.bindingId }, expectedVersion: 1 }) };
    }
    case "room.mode.set": {
      const roomId = await setupRoom(h);
      return { h, input: h.build(action, { idempotencyKey: key, params: { roomId }, body: { interactionMode: "closed" }, expectedVersion: 1 }) };
    }
    case "room_operator.projection.deliver": {
      const bound = await setupBinding(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "room_operator", authorizationSecret: bound.bindingSecret, body: { projection: projection(bound.roomId), publicationApprovalHash: APPROVAL_HASH, publicationAttestationHash: ATTESTATION_HASH }, expectedVersion: 1 }) };
    }
    case "curation.admit": {
      const delivered = await setupDelivered(h, false);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "curator", params: { projectionId: delivered.projection.projectionId }, expectedVersion: 1 }) };
    }
    case "curation.unlist": {
      const delivered = await setupDelivered(h, true);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "curator", params: { projectionId: delivered.projection.projectionId }, expectedVersion: 2 }) };
    }
    case "projection.revoke": {
      const delivered = await setupDelivered(h, true);
      return { h, input: h.build(action, { idempotencyKey: key, params: { projectionId: delivered.projection.projectionId }, expectedVersion: 2 }) };
    }
    case "public_encounter.issue": {
      const ready = await setupDelivered(h, true);
      return { h, input: h.build(action, { idempotencyKey: key, params: { projectionId: ready.projection.projectionId }, body: { encounterSecret: "target_encounter_secret_00000000000000000000001" }, expectedVersion: 2 }) };
    }
    case "interaction.create": {
      const encounter = await setupEncounter(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "guest_capability", authorizationSecret: encounter.encounterSecret, body: { projectionId: encounter.projection.projectionId, interactionType: "ask", consent: "manual_owner_only", requestBody: "Target synthetic request.", guestCapsule: null, replySecret: "target_reply_secret_000000000000000000000001", deleteSecret: "target_delete_secret_00000000000000000000001" } }) };
    }
    case "interaction.delete": {
      const interaction = await setupInteraction(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "guest_capability", authorizationSecret: interaction.deleteSecret, params: { interactionId: interaction.interactionId }, expectedVersion: 1 }) };
    }
    case "room_operator.sync": {
      const bound = await setupBinding(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "room_operator", authorizationSecret: bound.bindingSecret, body: { roomId: bound.roomId, afterSequence: 0 } }) };
    }
    case "room_operator.pull": {
      const interaction = await setupInteraction(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "room_operator", authorizationSecret: interaction.bindingSecret, params: { interactionId: interaction.interactionId }, expectedVersion: 1 }) };
    }
    case "room_operator.ack": {
      const bound = await setupBinding(h);
      const event = h.store.snapshot().events[0]!;
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "room_operator", authorizationSecret: bound.bindingSecret, body: { roomId: bound.roomId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash } }) };
    }
    case "room_operator.local_purge.receipt": {
      const interaction = await setupInteraction(h);
      return { h, input: h.build(action, { idempotencyKey: key, actorClass: "room_operator", authorizationSecret: interaction.bindingSecret, params: { interactionId: interaction.interactionId }, body: { localBytesAbsent: true }, expectedVersion: 1 }) };
    }
  }
}

function conflicting(input: PublicCoreOperationInputV1): PublicCoreOperationInputV1 {
  const otherId = (prefix: string) => `${prefix}_${"z".repeat(32)}`;
  const params = { ...input.params };
  const body = { ...input.body };
  switch (input.action) {
    case "room.create": body.label = "Different target label"; break;
    case "room.pair": params.roomId = otherId("room"); break;
    case "room.pair.exchange": body.clientPublicKey = "different-client-public-key"; break;
    case "room.binding.revoke": params.bindingId = otherId("binding"); break;
    case "room.mode.set": body.interactionMode = "public_single"; break;
    case "room_operator.projection.deliver": body.publicationApprovalHash = canonicalSha256("different approval"); break;
    case "projection.revoke":
    case "curation.admit":
    case "curation.unlist":
    case "public_encounter.issue": params.projectionId = otherId("proj"); break;
    case "interaction.create": body.requestBody = "Different target request."; break;
    case "interaction.delete":
    case "room_operator.pull":
    case "room_operator.local_purge.receipt": params.interactionId = otherId("interaction"); break;
    case "room_operator.sync": body.afterSequence = 1; break;
    case "room_operator.ack": body.eventHash = canonicalSha256("different event"); break;
  }
  return { ...input, params, body };
}

async function hasCode(work: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(work, (error: unknown) => (error as { code?: string }).code === code);
}

let directContextSerial = 0;
function directContext(
  action: PublicCoreActionName,
  overrides: Partial<PublicCoreMutationContextV1> = {},
): PublicCoreMutationContextV1 {
  directContextSerial += 1;
  return {
    action,
    actorClass: operationDefinition(action).actor,
    actorScopeDigest: ACTOR_SCOPE,
    idempotencyKey: `direct_${directContextSerial.toString(36).padStart(32, "0")}`,
    canonicalRequestHash: canonicalSha256({ action, directContextSerial }),
    expectedVersion: null,
    authorizationSecret: null,
    ...overrides,
  };
}

for (const action of MUTATIONS) {
  for (const point of PUBLIC_CORE_FAULT_POINTS) {
    test(`#67 ${action} is atomic/recoverable at ${point}`, async () => {
      const { h, input } = await preparedMutation(action);
      const before = JSON.stringify(h.store.snapshot());
      const beforeReceiptCount = h.store.snapshot().receipts.filter((receipt) => receipt.action === action).length;
      h.faults.arm(action, point);
      await hasCode(h.execute(input), "R4_PUBLIC_CORE_INJECTED_FAULT");
      const afterFault = JSON.stringify(h.store.snapshot());
      if (point === "committed_response_lost") assert.notEqual(afterFault, before);
      else assert.equal(afterFault, before, "pre-commit fault must roll back domain, event, nonce and receipt state");
      const replay = await h.execute(input);
      assert.equal(replay.recovered, point === "committed_response_lost");
      assert.equal(h.store.snapshot().receipts.filter((receipt) => receipt.action === action).length, beforeReceiptCount + 1);
      if (point === "before_idempotency_reservation") await hasCode(h.execute(conflicting(input)), "idempotency_conflict");
    });
  }
}

test("store port membranes sanitize hostile clock, ID, protector, digest, match, reveal, nonce, and fault behavior", async () => {
  const canary = "PRIVATE_BODY_CANARY_STORE_PORT_57";
  const fixture = createHarness();
  const make = (overrides: Readonly<{
    now?: () => Date;
    ids?: PublicCoreIdSourceV1;
    protector?: PublicCoreBodyProtectorV1;
    fault?: PublicCoreFaultInjectorV1;
  }> = {}): InMemoryPublicCoreStoreV1 => new InMemoryPublicCoreStoreV1({
    installationId: `install_${"m".repeat(32)}`,
    entityId: ENTITY_ID,
    now: overrides.now ?? (() => new Date(T0)),
    ids: overrides.ids ?? new RaceIds(),
    protector: overrides.protector ?? fixture.protector,
    ...(overrides.fault ? { fault: overrides.fault } : {}),
  });
  const rejected = async (work: Promise<unknown>, code: string): Promise<void> => {
    await assert.rejects(work, (error: unknown) => {
      assert.equal((error as { code?: string }).code, code);
      assert.equal(JSON.stringify(error).includes(canary), false);
      return true;
    });
  };
  assert.throws(() => make({ now: () => { throw new Error(canary); } }), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "public_core_clock_unavailable");
    assert.equal(JSON.stringify(error).includes(canary), false);
    return true;
  });
  const time = { value: T0 };
  const regressing = make({ now: () => new Date(time.value) });
  time.value = "2026-08-10T11:59:59.999Z";
  await rejected(regressing.listThirdPlace(), "public_core_clock_regressed");

  const invalidIds: PublicCoreIdSourceV1 = {
    nextId: () => `wrong_${canary}`,
    nextSecret: () => `pairing_code_${"s".repeat(32)}`,
  };
  await rejected(make({ ids: invalidIds }).createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "Membrane Room" },
  ), "public_core_id_port_invalid");

  const throwingProtector: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async protect() { throw new Error(canary); },
  };
  await rejected(make({ protector: throwingProtector }).createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "Membrane Room" },
  ), "public_core_protector_port_unavailable");

  let stolenError: unknown = null;
  const brandStealingProtector: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async protect(input) {
      try {
        await input.nonceAuthority.reserve({ canary } as never);
      } catch (error) {
        stolenError = error;
        assert.equal(Object.isFrozen(error), true, "a dependency must receive only a frozen genuine error");
        assert.equal(Reflect.set(error as object, "status", 418), false);
        assert.equal(Reflect.set(error as object, "code", canary), false);
        assert.throws(() => Object.defineProperty(error, "code", { value: canary }));
        throw error;
      }
      return assert.fail("invalid nonce registration unexpectedly succeeded");
    },
  };
  const brandStore = make({ protector: brandStealingProtector });
  const brandApplication = new PublicCoreApplicationV1(brandStore);
  await assert.rejects(
    brandApplication.run(fixture.build("room.create", {
      body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Brand Room" },
    })),
    (error: unknown) => {
      assert.notEqual(error, stolenError, "the dependency-held branded instance must be reminted at the boundary");
      assert.equal((error as { status?: number }).status, 503);
      assert.equal((error as { code?: string }).code, "public_core_nonce_registration_invalid");
      assert.equal(JSON.stringify(error).includes(canary), false);
      return true;
    },
  );
  assert.equal(brandStore.snapshot().room, null);

  const mismatchedProtector: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async protect(input) {
      const protectedValue = await fixture.protector.protect(input);
      return { ...protectedValue, objectVersion: protectedValue.objectVersion + 1 };
    },
  };
  const mismatched = make({ protector: mismatchedProtector });
  await rejected(mismatched.createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "Membrane Room" },
  ), "public_core_protector_result_invalid");
  assert.equal(mismatched.snapshot().room, null, "invalid protected output must discard its nonce and working state");

  const invalidDigest: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    digest: () => ({ canary } as never),
  };
  const digestStore = make({ protector: invalidDigest });
  const digestRoom = await digestStore.createRoom(directContext("room.create"), { entityId: ENTITY_ID, label: "Digest Room" });
  await rejected(digestStore.createRoomPair(
    directContext("room.pair"),
    { roomId: digestRoom.body.roomId as string },
  ), "public_core_digest_port_invalid");

  const invalidMatch: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    matches: () => 1 as unknown as boolean,
  };
  const matchStore = make({ protector: invalidMatch });
  const matchRoom = await matchStore.createRoom(directContext("room.create"), { entityId: ENTITY_ID, label: "Match Room" });
  const matchPair = await matchStore.createRoomPair(directContext("room.pair"), { roomId: matchRoom.body.roomId as string });
  await rejected(matchStore.exchangeRoomPair(
    directContext("room.pair.exchange"),
    { pairingId: matchPair.body.pairingId as string, pairingCode: matchPair.body.pairingCode as string, clientPublicKey: "client_public_key_membrane_0001" },
  ), "public_core_matches_port_invalid");

  const throwingReveal: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async reveal() { throw new Error(canary); },
  };
  const revealStore = make({ protector: throwingReveal });
  const revealRoom = await revealStore.createRoom(directContext("room.create"), { entityId: ENTITY_ID, label: "Reveal Room" });
  const replayContext = directContext("room.pair");
  await revealStore.createRoomPair(replayContext, { roomId: revealRoom.body.roomId as string });
  await rejected(revealStore.createRoomPair(replayContext, { roomId: revealRoom.body.roomId as string }), "public_core_reveal_port_unavailable");

  const wrongReveal: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async reveal() { return canary; },
  };
  const wrongRevealStore = make({ protector: wrongReveal });
  const wrongRevealRoom = await wrongRevealStore.createRoom(directContext("room.create"), { entityId: ENTITY_ID, label: "Reveal Hash Room" });
  const wrongRevealContext = directContext("room.pair");
  await wrongRevealStore.createRoomPair(wrongRevealContext, { roomId: wrongRevealRoom.body.roomId as string });
  await rejected(wrongRevealStore.createRoomPair(wrongRevealContext, { roomId: wrongRevealRoom.body.roomId as string }), "public_core_reveal_result_invalid");

  const throwingFault: PublicCoreFaultInjectorV1 = {
    reach: async () => { throw new Error(canary); },
  };
  await rejected(make({ fault: throwingFault }).createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "Fault Room" },
  ), "public_core_fault_port_unavailable");
  const invalidFault: PublicCoreFaultInjectorV1 = {
    reach: async () => "invalid" as never,
  };
  await rejected(make({ fault: invalidFault }).createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "Fault Room" },
  ), "public_core_fault_port_invalid");
});

test("plaintext byte ceilings and the 256-byte idempotency cap fail before protection and on reopen", async () => {
  assert.deepEqual(PUBLIC_CORE_PLAINTEXT_BYTE_CEILINGS, {
    "rooms.label": 1_024,
    "projections.capsule": 131_072,
    "pairing_challenges.pairing_code": 4_096,
    "pairing_challenges.exchange_envelope": 32_768,
    "interactions.request_body": 32_768,
    "interactions.guest_capsule": 4_096,
  });

  const fixture = createHarness();
  let protectCalls = 0;
  const countingProtector: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async protect(input) {
      protectCalls += 1;
      return await fixture.protector.protect(input);
    },
  };
  const directStore = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"l".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => new Date(T0),
    ids: new RaceIds(),
    protector: countingProtector,
  });
  await hasCode(directStore.createRoom(
    directContext("room.create"),
    { entityId: ENTITY_ID, label: "界".repeat(342) },
  ), "public_core_plaintext_too_large");
  assert.equal(protectCalls, 0, "oversized plaintext must not cross the protector port");
  assert.equal(directStore.snapshot().room, null);

  for (const idempotencyKey of ["a".repeat(257), "z".repeat(257)]) {
    await hasCode(fixture.app.run(fixture.build("room.create", {
      idempotencyKey,
      body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Bounded label" },
    })), "idempotency_key_required");
  }

  await setupRoom(fixture);
  const image = await fixture.store.exportDurableImage();
  assert.ok(image.room);
  const oversizedLabel = "界".repeat(342);
  const room = {
    ...image.room,
    label: { ...image.room.label, plaintextHash: plaintextSha256(oversizedLabel) },
  };
  const { imageHash: _imageHash, ...imagePreimage } = image;
  const tamperedPreimage = { ...imagePreimage, room };
  const hostileReveal: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async reveal() { return oversizedLabel; },
  };
  await hasCode(InMemoryPublicCoreStoreV1.reopen({
    image: { ...tamperedPreimage, imageHash: canonicalSha256(tamperedPreimage) },
    now: () => new Date(fixture.now.value),
    ids: fixture.ids,
    protector: hostileReveal,
  }), "durable_image_ciphertext_invalid");
});

test("each serialized operation binds one monotonic canonical clock sample", async () => {
  const fixture = createHarness();
  let samples = 0;
  const epoch = Date.parse(T0);
  const store = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"c".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => { const value = new Date(epoch + samples); samples += 1; return value; },
    ids: new RaceIds(),
    protector: fixture.protector,
  });
  assert.equal(samples, 1, "constructor samples once");
  await store.createRoom(directContext("room.create"), { entityId: ENTITY_ID, label: "Clock Room" });
  assert.equal(samples, 2, "the whole mutation samples once at its serialized boundary");
  const snapshot = store.snapshot();
  assert.equal(snapshot.room?.createdAt, "2026-08-10T12:00:00.001Z");
  assert.equal(snapshot.events[0]?.committedAt, snapshot.room?.createdAt);
  assert.equal(snapshot.receipts[0]?.committedAt, snapshot.room?.createdAt);
});

test("application and store own nested operation data before the first await and across a real barrier", async () => {
  const fixture = createHarness();
  const capturedPlaintexts: string[] = [];
  const recordingProtector: PublicCoreBodyProtectorV1 = {
    ...fixture.protector,
    async protect(input) {
      capturedPlaintexts.push(input.plaintext);
      return await fixture.protector.protect(input);
    },
  };
  const now = { value: T0 };
  const store = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"t".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => new Date(now.value),
    ids: new RaceIds(),
    protector: recordingProtector,
  });
  const app = new PublicCoreApplicationV1(store);
  const raw = {
    schemaVersion: "r4_public_core_operation_input.v1" as const,
    action: "room.create",
    actorClass: "controller" as const,
    actorScopeDigest: ACTOR_SCOPE,
    params: {},
    body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Original owned label" },
    authorizationSecret: null,
    idempotencyKey: "toctou_application_room_000000000000000001",
    expectedVersion: null,
  };
  const pending = app.run(raw);
  raw.body.label = "PRIVATE_BODY_CANARY_MUTATED_LABEL";
  await pending;
  assert.equal(capturedPlaintexts[0], "Original owned label");

  let getterInvoked = false;
  const accessor = { ...raw, action: "third_place.list", actorClass: "public", idempotencyKey: null, expectedVersion: null } as Record<string, unknown>;
  Object.defineProperty(accessor, "body", { enumerable: true, get() { getterInvoked = true; throw new Error("PRIVATE_BODY_CANARY_ACCESSOR"); } });
  await hasCode(app.run(accessor as unknown as PublicCoreOperationInputV1), "invalid_request_shape");
  assert.equal(getterInvoked, false);
  const hostileProxy = new Proxy(raw, { getOwnPropertyDescriptor() { throw new Error("PRIVATE_BODY_CANARY_PROXY"); } });
  await hasCode(app.run(hostileProxy), "invalid_request_shape");

  const h = createHarness();
  const bound = await setupBinding(h);
  const capsule = projection(bound.roomId, 42);
  const originalTitle = capsule.title;
  const context = directContext("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bound.bindingSecret,
    expectedVersion: 1,
  });
  const input = {
    projection: capsule,
    publicationApprovalHash: APPROVAL_HASH,
    publicationAttestationHash: ATTESTATION_HASH,
  };
  const barrier = h.faults.pause("room_operator.projection.deliver", "after_locks_and_rechecks");
  const work = h.store.deliverProjection(context, input);
  await barrier.entered;
  (input.projection as unknown as { title: string }).title = "PRIVATE_BODY_CANARY_BARRIER_TITLE";
  (context as unknown as { authorizationSecret: string }).authorizationSecret = "PRIVATE_BODY_CANARY_BARRIER_SECRET";
  barrier.release();
  await work;
  const read = await h.call("projection.read", { params: { projectionId: capsule.projectionId } });
  assert.equal((read.body.projection as ProjectionCapsuleV1).title, originalTitle);
  assert.equal(JSON.stringify(read).includes("PRIVATE_BODY_CANARY"), false);
});

for (const action of MUTATIONS) {
  test(`#67 ${action} same-key replay reconstructs the exact action result`, async () => {
    const { h, input } = await preparedMutation(action);
    const first = await h.execute(input);
    const replay = await h.execute(input);
    assert.equal(replay.recovered, true);
    assert.equal(replay.status, first.status);
    assert.deepEqual(replay.body, first.body);
  });
}

test("retention work is discarded on pre-receipt reject and injected fault", async () => {
  const h = createHarness();
  const roomId = await setupRoom(h);
  await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
  h.now.value = "2026-08-10T12:11:00.000Z";
  const liveBefore = JSON.stringify(h.store.snapshot());
  const durableBefore = JSON.stringify(await h.store.exportDurableImage());

  await hasCode(h.call("room.mode.set", {
    params: { roomId },
    body: { interactionMode: "public_single" },
    expectedVersion: 1,
  }), "room_mode_unchanged");
  assert.equal(JSON.stringify(h.store.snapshot()), liveBefore);
  assert.equal(JSON.stringify(await h.store.exportDurableImage()), durableBefore);

  h.faults.arm("room.mode.set", "after_locks_and_rechecks");
  await hasCode(h.call("room.mode.set", {
    params: { roomId },
    body: { interactionMode: "closed" },
    expectedVersion: 1,
  }), "R4_PUBLIC_CORE_INJECTED_FAULT");
  assert.equal(JSON.stringify(h.store.snapshot()), liveBefore);
  assert.equal(JSON.stringify(await h.store.exportDurableImage()), durableBefore);
});

test("stale purge health permits exact lost-response replay of an already committed Room close only", async () => {
  const h = createHarness();
  const roomId = await setupRoom(h);
  h.now.value = "2026-08-12T00:00:00.001Z";
  const close = h.build("room.mode.set", {
    idempotencyKey: "stale_close_replay_00000000000000000000001",
    params: { roomId },
    body: { interactionMode: "closed" },
    expectedVersion: 1,
  });

  h.faults.arm("room.mode.set", "committed_response_lost");
  await hasCode(h.execute(close), "R4_PUBLIC_CORE_INJECTED_FAULT");
  assert.equal(h.store.snapshot().room?.interactionMode, "closed");

  const replay = await h.execute(close);
  assert.equal(replay.recovered, true);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.code, "room_mode_set");

  await hasCode(h.call("room.mode.set", {
    params: { roomId },
    body: { interactionMode: "closed" },
    expectedVersion: 2,
  }), "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED");
  await hasCode(h.call("room.mode.set", {
    params: { roomId },
    body: { interactionMode: "public_single" },
    expectedVersion: 2,
  }), "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED");
});

test("stale purge health permits exact terminal pull replay but rejects a fresh pull", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  const pull = h.build("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: "stale_terminal_pull_replay_0000000000000001",
  });
  const first = await h.execute(pull);
  assert.equal(first.status, 410);
  assert.equal(first.body.state, "interaction_deleted");

  h.now.value = "2026-08-12T00:00:00.001Z";
  const replay = await h.execute(pull);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);
  await hasCode(h.execute({
    ...pull,
    idempotencyKey: "stale_terminal_pull_fresh_00000000000000001",
  }), "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED");
});

test("interaction.create exact replay survives encounter expiry and restart while changed requests stay fresh", async () => {
  const h = createHarness();
  const encounter = await setupEncounter(h);
  const create = h.build("interaction.create", {
    actorClass: "guest_capability",
    authorizationSecret: encounter.encounterSecret,
    idempotencyKey: "restart_expired_encounter_create_00000000000001",
    body: {
      projectionId: encounter.projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Receipt-bound request survives encounter expiry.",
      guestCapsule: null,
      replySecret: "restart_expired_encounter_reply_00000000000001",
      deleteSecret: "restart_expired_encounter_delete_0000000000001",
    },
  });
  const first = await h.execute(create);

  h.now.value = "2026-08-11T12:00:00.001Z";
  await h.maintenance.runRetentionTransitions();
  assert.equal(h.store.snapshot().encounters.length, 0);
  const reopened = await InMemoryPublicCoreStoreV1.reopen({
    image: await h.store.exportDurableImage(),
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  const restarted = new PublicCoreApplicationV1(reopened);
  const replay = await restarted.run(create);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);

  await hasCode(restarted.run({
    ...create,
    body: { ...create.body, requestBody: "Changed body under the committed key." },
  }), "idempotency_conflict");
  await hasCode(restarted.run({
    ...create,
    idempotencyKey: "restart_expired_encounter_fresh_00000000000001",
  }), "not_found");
});

test("singleton create/create and one-encounter create/create serialize to one semantic winner", async () => {
  const roomRace = createHarness();
  const roomA = roomRace.build("room.create", { body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Room A" } });
  const roomB = roomRace.build("room.create", { body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Room B" } });
  const roomBarrier = roomRace.faults.pause("room.create", "after_locks_and_rechecks");
  const roomAWork = roomRace.app.run(roomA);
  await roomBarrier.entered;
  const roomBWork = roomRace.app.run(roomB);
  roomBarrier.release();
  const rooms = await Promise.allSettled([roomAWork, roomBWork]);
  assert.equal(rooms.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(roomRace.store.snapshot().room !== null, true);
  assert.equal(roomRace.store.snapshot().receipts.filter((receipt) => receipt.action === "room.create").length, 1);

  const interactionRace = createHarness();
  const encounter = await setupEncounter(interactionRace);
  const common = {
    actorClass: "guest_capability" as const,
    authorizationSecret: encounter.encounterSecret,
    body: {
      projectionId: encounter.projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Concurrent synthetic request.",
      guestCapsule: null,
      replySecret: "concurrent_reply_secret_000000000000000000001",
      deleteSecret: "concurrent_delete_secret_00000000000000000001",
    },
  };
  const createA = interactionRace.build("interaction.create", common);
  const createB = interactionRace.build("interaction.create", { ...common, body: { ...common.body, requestBody: "Second concurrent synthetic request." } });
  const createBarrier = interactionRace.faults.pause("interaction.create", "after_locks_and_rechecks");
  const createAWork = interactionRace.app.run(createA);
  await createBarrier.entered;
  const createBWork = interactionRace.app.run(createB);
  createBarrier.release();
  const interactions = await Promise.allSettled([createAWork, createBWork]);
  assert.equal(interactions.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(interactionRace.store.snapshot().interactions.length, 1);
  assert.equal(interactionRace.store.snapshot().encounters[0]?.state, "consumed");
});

test("pair exchange/exchange is one-use and pairing material clears on consumption and bounded expiry", async () => {
  const h = createHarness();
  const roomId = await setupRoom(h);
  const pair = await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
  const common = {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "concurrent-pair-client-public-key" },
    expectedVersion: 1,
  };
  const firstExchange = h.build("room.pair.exchange", common);
  const secondExchange = h.build("room.pair.exchange", common);
  const exchangeBarrier = h.faults.pause("room.pair.exchange", "after_locks_and_rechecks");
  const firstExchangeWork = h.app.run(firstExchange);
  await exchangeBarrier.entered;
  const secondExchangeWork = h.app.run(secondExchange);
  exchangeBarrier.release();
  const exchanges = await Promise.allSettled([firstExchangeWork, secondExchangeWork]);
  assert.equal(exchanges.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(h.store.snapshot().bindings.length, 1);
  assert.equal(h.store.snapshot().pairings[0]?.pairingCode, null);

  h.now.value = "2026-08-10T12:11:00.000Z";
  await h.call("room.pair", { params: { roomId }, expectedVersion: 1 });
  const first = h.store.snapshot().pairings.find((value) => value.pairingId === pair.body.pairingId);
  assert.equal(first?.pairingCode, null);
  assert.equal(first?.exchangeEnvelope, null);
  assert.equal(first?.state, "expired");
});

test("two same-Room-version Projection deliveries overlap but only one becomes current", async () => {
  const h = createHarness();
  const bound = await setupBinding(h);
  const firstProjection = projection(bound.roomId, 1);
  const secondProjection = projection(bound.roomId, 2);
  const first = h.build("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bound.bindingSecret,
    body: { projection: firstProjection, publicationApprovalHash: APPROVAL_HASH, publicationAttestationHash: ATTESTATION_HASH },
    expectedVersion: 1,
  });
  const second = h.build("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bound.bindingSecret,
    body: { projection: secondProjection, publicationApprovalHash: APPROVAL_HASH, publicationAttestationHash: ATTESTATION_HASH },
    expectedVersion: 1,
  });
  const barrier = h.faults.pause("room_operator.projection.deliver", "after_locks_and_rechecks");
  const firstWork = h.app.run(first);
  await barrier.entered;
  const secondWork = h.app.run(second);
  barrier.release();
  const outcomes = await Promise.allSettled([firstWork, secondWork]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(h.store.snapshot().projections.length, 1);
  assert.equal(h.store.snapshot().projections.filter((value) => value.current).length, 1);
});

test("pair/revoke and successor/revoke races preserve one Room, one current Projection, and closed binding state", async () => {
  const h = createHarness();
  const ready = await setupDelivered(h, true);
  const binding = h.store.snapshot().bindings[0]!;
  const pair = h.build("room.pair", { params: { roomId: ready.roomId }, expectedVersion: 2 });
  const revokeBinding = h.build("room.binding.revoke", { params: { bindingId: binding.bindingId }, expectedVersion: 1 });
  const pairRevokeBarrier = h.faults.pause("room.binding.revoke", "after_locks_and_rechecks");
  const revokeBindingWork = h.app.run(revokeBinding);
  await pairRevokeBarrier.entered;
  const pairWork = h.app.run(pair);
  pairRevokeBarrier.release();
  const results = await Promise.allSettled([pairWork, revokeBindingWork]);
  assert.equal(results.every((result) => result.status === "fulfilled"), true);
  assert.equal(h.store.snapshot().room?.roomId, ready.roomId);
  assert.equal(h.store.snapshot().bindings.find((value) => value.bindingId === binding.bindingId)?.state, "revoked");

  const h2 = createHarness();
  const current = await setupDelivered(h2, true);
  const successor = projection(current.roomId, 2);
  const delivery = h2.build("room_operator.projection.deliver", {
    actorClass: "room_operator", authorizationSecret: current.bindingSecret,
    body: { projection: successor, publicationApprovalHash: canonicalSha256("successor race approval"), publicationAttestationHash: canonicalSha256("successor race attestation") },
    expectedVersion: 2,
  });
  const revoke = h2.build("projection.revoke", { params: { projectionId: current.projection.projectionId }, expectedVersion: 3 });
  const deliverRevokeBarrier = h2.faults.pause("room_operator.projection.deliver", "after_locks_and_rechecks");
  const deliveryWork = h2.app.run(delivery);
  await deliverRevokeBarrier.entered;
  const revokeWork = h2.app.run(revoke);
  deliverRevokeBarrier.release();
  const deliverRevokeResults = await Promise.allSettled([deliveryWork, revokeWork]);
  assert.equal(deliverRevokeResults.every((result) => result.status === "fulfilled"), true);
  const snapshot = h2.store.snapshot();
  assert.ok(snapshot.projections.filter((value) => value.current).length <= 1);
  assert.equal(snapshot.room?.currentProjectionId === successor.projectionId || snapshot.room?.currentProjectionId === null, true);
});

test("admit/unlist overlap serializes to a single body-readable but undiscoverable Projection", async () => {
  const h = createHarness();
  const delivered = await setupDelivered(h, false);
  const barrier = h.faults.pause("curation.admit", "after_locks_and_rechecks");
  const admit = h.call("curation.admit", {
    actorClass: "curator",
    params: { projectionId: delivered.projection.projectionId },
    expectedVersion: 1,
  });
  await barrier.entered;
  const unlist = h.call("curation.unlist", {
    actorClass: "curator",
    params: { projectionId: delivered.projection.projectionId },
    expectedVersion: 2,
  });
  barrier.release();
  const outcomes = await Promise.allSettled([admit, unlist]);
  assert.equal(outcomes.every((outcome) => outcome.status === "fulfilled"), true);
  const stored = h.store.snapshot().projections[0]!;
  assert.equal(stored.curationState, "unlisted");
  assert.equal(stored.capsule?.readable, true);
  assert.deepEqual((await h.call("third_place.list")).body.residents, []);
});

test("encounter issuance loses real close/unlist/revoke/expiry races after terminal work holds the lock", async () => {
  for (const terminal of ["close", "unlist", "revoke", "expiry"] as const) {
    const h = createHarness();
    const ready = await setupDelivered(h, true);
    const terminalAction: PublicCoreFaultActionV1 = terminal === "close"
      ? "room.mode.set"
      : terminal === "unlist"
        ? "curation.unlist"
        : terminal === "revoke"
          ? "projection.revoke"
          : "retention.janitor";
    if (terminal === "expiry") h.now.value = "2026-08-17T12:00:00.000Z";
    const barrier = h.faults.pause(terminalAction, "after_locks_and_rechecks");
    const terminalWork = terminal === "close"
      ? h.call("room.mode.set", { params: { roomId: ready.roomId }, body: { interactionMode: "closed" }, expectedVersion: 2 })
      : terminal === "unlist"
        ? h.call("curation.unlist", { actorClass: "curator", params: { projectionId: ready.projection.projectionId }, expectedVersion: 2 })
        : terminal === "revoke"
          ? h.call("projection.revoke", { params: { projectionId: ready.projection.projectionId }, expectedVersion: 2 })
          : h.maintenance.runRetentionTransitions();
    await barrier.entered;
    const issue = h.call("public_encounter.issue", {
      params: { projectionId: ready.projection.projectionId },
      body: { encounterSecret: `terminal_${terminal}_encounter_secret_00000000000001` },
      expectedVersion: terminal === "close" ? 2 : 3,
    });
    barrier.release();
    const [terminalResult, issueResult] = await Promise.allSettled([terminalWork, issue]);
    assert.equal(terminalResult.status, "fulfilled");
    assert.equal(issueResult.status, "rejected");
    assert.equal(h.store.snapshot().encounters.length, 0);
  }
});

test("Interaction acceptance loses real close/unlist/revoke/expiry races without partially consuming encounter", async () => {
  for (const terminal of ["close", "unlist", "revoke", "expiry"] as const) {
    const h = createHarness();
    const encounter = await setupEncounter(h);
    const terminalAction: PublicCoreFaultActionV1 = terminal === "close"
      ? "room.mode.set"
      : terminal === "unlist"
        ? "curation.unlist"
        : terminal === "revoke"
          ? "projection.revoke"
          : "retention.janitor";
    if (terminal === "expiry") h.now.value = "2026-08-11T12:00:00.000Z";
    const barrier = h.faults.pause(terminalAction, "after_locks_and_rechecks");
    const terminalWork = terminal === "close"
      ? h.call("room.mode.set", { params: { roomId: encounter.roomId }, body: { interactionMode: "closed" }, expectedVersion: 2 })
      : terminal === "unlist"
        ? h.call("curation.unlist", { actorClass: "curator", params: { projectionId: encounter.projection.projectionId }, expectedVersion: 2 })
        : terminal === "revoke"
          ? h.call("projection.revoke", { params: { projectionId: encounter.projection.projectionId }, expectedVersion: 2 })
          : h.maintenance.runRetentionTransitions();
    await barrier.entered;
    const create = h.call("interaction.create", {
      actorClass: "guest_capability", authorizationSecret: encounter.encounterSecret,
      body: {
        projectionId: encounter.projection.projectionId,
        interactionType: "ask", consent: "manual_owner_only", requestBody: "Must not commit.", guestCapsule: null,
        replySecret: `terminal_${terminal}_reply_secret_00000000000000001`,
        deleteSecret: `terminal_${terminal}_delete_secret_000000000000001`,
      },
    });
    barrier.release();
    const [terminalResult, createResult] = await Promise.allSettled([terminalWork, create]);
    assert.equal(terminalResult.status, "fulfilled");
    assert.equal(createResult.status, "rejected");
    assert.equal(h.store.snapshot().interactions.length, 0);
    assert.notEqual(h.store.snapshot().encounters[0]?.state, "consumed");
  }
});

test("delete/pull race and lost-response replay always defer to terminal deletion", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  const deleteBarrier = h.faults.pause("interaction.delete", "after_locks_and_rechecks");
  const deletion = h.call("interaction.delete", {
    actorClass: "guest_capability", authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId }, expectedVersion: 1,
  });
  await deleteBarrier.entered;
  const racingPull = h.call("room_operator.pull", {
    actorClass: "room_operator", authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId }, expectedVersion: 2,
  });
  deleteBarrier.release();
  const [deleteResult, pullResult] = await Promise.allSettled([deletion, racingPull]);
  assert.equal(deleteResult.status, "fulfilled");
  assert.equal(pullResult.status, "fulfilled");
  if (pullResult.status === "fulfilled") {
    assert.equal(pullResult.value.status, 410);
    assert.equal(pullResult.value.body.bodyAvailable, false);
  }

  const replayHarness = createHarness();
  const replayPending = await setupInteraction(replayHarness);
  const pullKey = "delete_pull_race_pull_000000000000000000001";
  const pull = replayHarness.build("room_operator.pull", {
    actorClass: "room_operator", authorizationSecret: replayPending.bindingSecret,
    params: { interactionId: replayPending.interactionId }, expectedVersion: 1, idempotencyKey: pullKey,
  });
  await replayHarness.app.run(pull);
  await replayHarness.call("interaction.delete", {
    actorClass: "guest_capability", authorizationSecret: replayPending.deleteSecret,
    params: { interactionId: replayPending.interactionId }, expectedVersion: 2,
  });
  const recovery = await replayHarness.app.run(pull);
  assert.equal(recovery.status, 410);
  assert.equal(recovery.body.bodyAvailable, false);
  assert.equal(JSON.stringify(recovery).includes("Synthetic race request body"), false);

  const h2 = createHarness();
  const pending2 = await setupInteraction(h2);
  await h2.call("interaction.delete", {
    actorClass: "guest_capability", authorizationSecret: pending2.deleteSecret,
    params: { interactionId: pending2.interactionId }, expectedVersion: 1,
  });
  const terminalPull = await h2.call("room_operator.pull", {
    actorClass: "room_operator", authorizationSecret: pending2.bindingSecret,
    params: { interactionId: pending2.interactionId }, expectedVersion: 2,
  });
  assert.equal(terminalPull.status, 410);
  assert.equal(terminalPull.body.bodyAvailable, false);
});

test("a lost pull response cannot resurrect body after the original Interaction retention deadline", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);

  // Establish a still-current operator binding near the Interaction deadline;
  // this isolates retention precedence from unrelated binding expiry.
  h.now.value = "2026-09-08T12:00:00.000Z";
  await h.maintenance.recordSuccessfulPurge(h.now.value);
  await h.maintenance.runRetentionTransitions();
  const pair = await h.call("room.pair", {
    params: { roomId: pending.roomId },
    expectedVersion: h.store.snapshot().room!.version,
  });
  await h.call("room.pair.exchange", {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "retention-recovery-client-key" },
    expectedVersion: 1,
  });
  const currentBindingSecret = h.ids.latest("binding_secret");

  h.now.value = "2026-09-09T11:59:59.999Z";
  const input = h.build("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: currentBindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: "retention_lost_pull_0000000000000000000001",
  });
  h.faults.arm("room_operator.pull", "committed_response_lost");
  await hasCode(h.app.run(input), "R4_PUBLIC_CORE_INJECTED_FAULT");

  h.now.value = "2026-09-09T12:00:00.000Z";
  const replay = await h.app.run(input);
  assert.equal(replay.status, 410);
  assert.equal(replay.body.bodyAvailable, false);
  assert.equal(JSON.stringify(replay).includes("Synthetic race request body"), false);
  assert.notEqual(h.store.snapshot().interactions[0]?.requestBody, null, "replay does not publish implicit retention writes");
  await h.maintenance.runRetentionTransitions();
  assert.equal(h.store.snapshot().interactions[0]?.requestBody, null);
});

test("explicit janitor and durable export enforce 24-hour and 37-day maxima", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  const sync = await h.call("room_operator.sync", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId, afterSequence: 0 },
  });
  const firstEvent = (sync.body.events as Array<{ eventId: string; sequence: number; eventHash: `sha256:${string}` }>)[0]!;
  await h.call("room_operator.ack", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: {
      roomId: pending.roomId,
      eventId: firstEvent.eventId,
      sequence: firstEvent.sequence,
      eventHash: firstEvent.eventHash,
    },
  });

  h.now.value = "2026-08-11T12:00:00.000Z";
  const encounterRun = await h.maintenance.runRetentionTransitions();
  assert.equal(encounterRun.encountersExpired, 1);
  assert.equal(h.store.snapshot().encounters.length, 0);
  assert.ok(h.store.snapshot().events.length > 0);
  assert.ok(h.store.snapshot().receipts.length > 0);

  h.now.value = "2026-09-09T12:00:00.000Z";
  await h.maintenance.runRetentionTransitions();
  const terminal = h.store.snapshot().interactions.find((value) => value.interactionId === pending.interactionId)!;
  assert.equal(terminal.state, "interaction_expired");
  assert.equal(terminal.requestBody, null);

  h.now.value = "2026-09-16T12:00:00.000Z";
  const liveBeforeExport = JSON.stringify(h.store.snapshot());
  const boundedImage = await h.store.exportDurableImage();
  assert.equal(boundedImage.encounters.length, 0);
  assert.equal(boundedImage.interactions.length, 0);
  assert.equal(boundedImage.events.length, 0);
  assert.equal(boundedImage.receipts.length, 0);
  assert.equal(boundedImage.acks.length, 0);
  assert.equal(JSON.stringify(h.store.snapshot()), liveBeforeExport, "bounded export must not publish janitor work");

  const finalRun = await h.maintenance.runRetentionTransitions();
  assert.equal(finalRun.interactionTombstonesPruned, 1);
  assert.equal(h.store.snapshot().interactions.length, 0);
  assert.equal(h.store.snapshot().events.length, 0);
  assert.equal(h.store.snapshot().receipts.length, 0);
  const finalImage = await h.store.exportDurableImage();
  assert.equal(finalImage.acks.length, 0);
});

test("sync freezes high-water across append and stale cursor returns body-free 410 reconciliation", async () => {
  const h = createHarness();
  const bound = await setupDelivered(h, false);
  const key = "sync_frozen_highwater_000000000000000000001";
  const sync = h.build("room_operator.sync", {
    actorClass: "room_operator", authorizationSecret: bound.bindingSecret,
    body: { roomId: bound.roomId, afterSequence: 0 }, idempotencyKey: key,
  });
  const appendBarrier = h.faults.pause("room_operator.sync", "after_locks_and_rechecks");
  const firstWork = h.app.run(sync);
  await appendBarrier.entered;
  const append = h.call("room.mode.set", { params: { roomId: bound.roomId }, body: { interactionMode: "closed" }, expectedVersion: 2 });
  appendBarrier.release();
  const [firstResult, appendResult] = await Promise.allSettled([firstWork, append]);
  assert.equal(firstResult.status, "fulfilled");
  assert.equal(appendResult.status, "fulfilled");
  const first = firstResult.status === "fulfilled" ? firstResult.value : assert.fail("sync did not complete");
  const highWater = first.body.highWater;
  await h.call("projection.revoke", { params: { projectionId: bound.projection.projectionId }, expectedVersion: 1 });
  const replay = await h.app.run(sync);
  assert.equal(replay.body.highWater, highWater);
  assert.deepEqual(replay.body.events, first.body.events);
  const beforeMutationAttempt = JSON.stringify(await h.store.exportDurableImage());
  assert.equal(Object.isFrozen(replay), true);
  assert.equal(Object.isFrozen(replay.body.events), true);
  assert.throws(() => (replay.body.events as unknown[]).push({ canary: "PRIVATE_BODY_CANARY_EVENT" }));
  assert.throws(() => { (replay.body.events as Array<{ targetVersion: number }>)[0]!.targetVersion += 1; });
  assert.equal(JSON.stringify(await h.store.exportDurableImage()), beforeMutationAttempt);

  const floorBarrier = h.faults.pause("room_operator.sync", "after_locks_and_rechecks");
  const beforeFloor = h.call("room_operator.sync", {
    actorClass: "room_operator", authorizationSecret: bound.bindingSecret,
    body: { roomId: bound.roomId, afterSequence: 0 },
  });
  await floorBarrier.entered;
  const floor = h.maintenance.compactBodyFreeEvents(h.store.snapshot().room!.eventHighWater + 1);
  floorBarrier.release();
  const [beforeFloorResult, floorResult] = await Promise.allSettled([beforeFloor, floor]);
  assert.equal(beforeFloorResult.status, "fulfilled");
  assert.equal(floorResult.status, "fulfilled");
  const replayAfterFloorAndNewTombstone = await h.app.run(sync);
  assert.deepEqual(replayAfterFloorAndNewTombstone.body, first.body, "sync replay must use its receipt snapshot, not current events or tombstones");
  const compactedImage = await h.store.exportDurableImage();
  const reopenedStore = await InMemoryPublicCoreStoreV1.reopen({
    image: compactedImage,
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  const replayAfterRestart = await new PublicCoreApplicationV1(reopenedStore).run(sync);
  assert.equal(replayAfterRestart.recovered, true);
  assert.deepEqual(replayAfterRestart.body, first.body, "sync receipt snapshot must survive compaction, newer tombstones, and restart");
  const stale = await h.call("room_operator.sync", {
    actorClass: "room_operator", authorizationSecret: bound.bindingSecret,
    body: { roomId: bound.roomId, afterSequence: 0 },
  });
  assert.equal(stale.status, 410);
  assert.equal(JSON.stringify(stale).includes("Race Room"), false);
});

test("janitor races with Projection read/revoke and Interaction delete without body resurrection or duplicate purge jobs", async () => {
  const readHarness = createHarness();
  const readable = await setupDelivered(readHarness, true);
  readHarness.now.value = "2026-08-17T12:00:00.000Z";
  const readBarrier = readHarness.faults.pause("retention.janitor", "after_locks_and_rechecks");
  const janitorBeforeRead = readHarness.maintenance.runRetentionTransitions();
  await readBarrier.entered;
  const read = readHarness.call("projection.read", { params: { projectionId: readable.projection.projectionId } });
  readBarrier.release();
  const [janitorReadResult, readResult] = await Promise.allSettled([janitorBeforeRead, read]);
  assert.equal(janitorReadResult.status, "fulfilled");
  assert.equal(readResult.status, "fulfilled");
  if (readResult.status === "fulfilled") assert.equal(readResult.value.status, 410);
  const readSnapshot = readHarness.store.snapshot();
  assert.equal(readSnapshot.projections[0]?.capsule, null);
  assert.equal(readSnapshot.purgeJobs.filter((job) => job.targetId === readable.projection.projectionId).length, 1);
  const projectionJob = readSnapshot.purgeJobs.find((job) => job.targetId === readable.projection.projectionId)!;
  assert.ok(Date.parse(projectionJob.targetBy) - Date.parse(projectionJob.enqueuedAt) < 24 * 60 * 60 * 1_000);

  const revokeHarness = createHarness();
  const revocable = await setupDelivered(revokeHarness, true);
  revokeHarness.now.value = "2026-08-17T12:00:00.000Z";
  const revokeBarrier = revokeHarness.faults.pause("retention.janitor", "after_locks_and_rechecks");
  const janitorBeforeRevoke = revokeHarness.maintenance.runRetentionTransitions();
  await revokeBarrier.entered;
  const revoke = revokeHarness.call("projection.revoke", {
    params: { projectionId: revocable.projection.projectionId }, expectedVersion: 3,
  });
  revokeBarrier.release();
  const [janitorRevokeResult, revokeResult] = await Promise.allSettled([janitorBeforeRevoke, revoke]);
  assert.equal(janitorRevokeResult.status, "fulfilled");
  assert.equal(revokeResult.status, "rejected");
  assert.equal(revokeHarness.store.snapshot().purgeJobs.filter((job) => job.targetId === revocable.projection.projectionId).length, 1);

  const deleteHarness = createHarness();
  const deletable = await setupInteraction(deleteHarness);
  deleteHarness.now.value = "2026-09-09T12:00:00.000Z";
  const deleteBarrier = deleteHarness.faults.pause("retention.janitor", "after_locks_and_rechecks");
  const janitorBeforeDelete = deleteHarness.maintenance.runRetentionTransitions();
  await deleteBarrier.entered;
  const deletion = deleteHarness.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: deletable.deleteSecret,
    params: { interactionId: deletable.interactionId },
    expectedVersion: 2,
  });
  deleteBarrier.release();
  const [janitorDeleteResult, deleteResult] = await Promise.allSettled([janitorBeforeDelete, deletion]);
  assert.equal(janitorDeleteResult.status, "fulfilled");
  assert.equal(deleteResult.status, "fulfilled");
  const deleted = deleteHarness.store.snapshot().interactions.find((value) => value.interactionId === deletable.interactionId)!;
  assert.equal(deleted.requestBody, null);
  assert.equal(deleted.guestCapsule, null);
  assert.equal(deleteHarness.store.snapshot().purgeJobs.filter((job) => job.targetId === deletable.interactionId).length, 1);
});

test("ACK/ACK and wrong event hash permit exactly one exact semantic ACK", async () => {
  const h = createHarness();
  const bound = await setupBinding(h);
  const event = h.store.snapshot().events[0]!;
  await assert.rejects(h.call("room_operator.ack", {
    actorClass: "room_operator", authorizationSecret: bound.bindingSecret,
    body: { roomId: bound.roomId, eventId: event.eventId, sequence: event.sequence, eventHash: canonicalSha256("wrong") },
  }));
  const input = { actorClass: "room_operator" as const, authorizationSecret: bound.bindingSecret, body: { roomId: bound.roomId, eventId: event.eventId, sequence: event.sequence, eventHash: event.eventHash } };
  const ackBarrier = h.faults.pause("room_operator.ack", "after_locks_and_rechecks");
  const firstAck = h.call("room_operator.ack", input);
  await ackBarrier.entered;
  const secondAck = h.call("room_operator.ack", input);
  ackBarrier.release();
  const results = await Promise.allSettled([firstAck, secondAck]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
});

test("10/hour, 50/day, 3/day acceptance, and 20-unresolved pool boundaries fail closed", async () => {
  const hourly = createHarness();
  const ready = await setupDelivered(hourly, true);
  for (let index = 0; index < 10; index += 1) {
    await hourly.call("public_encounter.issue", {
      params: { projectionId: ready.projection.projectionId }, expectedVersion: 2,
      body: { encounterSecret: `hourly_encounter_${index.toString().padStart(32, "0")}` },
    });
  }
  await assert.rejects(hourly.call("public_encounter.issue", {
    params: { projectionId: ready.projection.projectionId }, expectedVersion: 2,
    body: { encounterSecret: "hourly_encounter_overflow_00000000000000001" },
  }));

  const daily = createHarness();
  const dailyReady = await setupDelivered(daily, true);
  for (let hour = 0; hour < 5; hour += 1) {
    daily.now.value = new Date(Date.parse(T0) + hour * 60 * 60 * 1_000).toISOString();
    for (let index = 0; index < 10; index += 1) {
      const ordinal = hour * 10 + index;
      await daily.call("public_encounter.issue", {
        params: { projectionId: dailyReady.projection.projectionId }, expectedVersion: 2,
        body: { encounterSecret: `daily_encounter_${ordinal.toString().padStart(32, "0")}` },
      });
    }
  }
  daily.now.value = "2026-08-10T17:00:00.000Z";
  await hasCode(daily.call("public_encounter.issue", {
    params: { projectionId: dailyReady.projection.projectionId }, expectedVersion: 2,
    body: { encounterSecret: "daily_encounter_overflow_0000000000000000001" },
  }), "encounter_daily_rate_limited");

  const accepted = createHarness();
  const acceptedReady = await setupDelivered(accepted, true);
  for (let index = 0; index < 3; index += 1) {
    const encounterSecret = `accepted_encounter_${index.toString().padStart(32, "0")}`;
    await accepted.call("public_encounter.issue", { params: { projectionId: acceptedReady.projection.projectionId }, expectedVersion: 2, body: { encounterSecret } });
    await accepted.call("interaction.create", {
      actorClass: "guest_capability", authorizationSecret: encounterSecret,
      body: { projectionId: acceptedReady.projection.projectionId, interactionType: "ask", consent: "manual_owner_only", requestBody: `Accepted ${index}`, guestCapsule: null, replySecret: `accepted_reply_${index.toString().padStart(32, "0")}`, deleteSecret: `accepted_delete_${index.toString().padStart(32, "0")}` },
    });
  }
  const fourthSecret = "accepted_encounter_fourth_00000000000000000001";
  await accepted.call("public_encounter.issue", { params: { projectionId: acceptedReady.projection.projectionId }, expectedVersion: 2, body: { encounterSecret: fourthSecret } });
  await assert.rejects(accepted.call("interaction.create", {
    actorClass: "guest_capability", authorizationSecret: fourthSecret,
    body: { projectionId: acceptedReady.projection.projectionId, interactionType: "ask", consent: "manual_owner_only", requestBody: "Fourth", guestCapsule: null, replySecret: "accepted_reply_fourth_000000000000000000001", deleteSecret: "accepted_delete_fourth_00000000000000000001" },
  }));

  const pool = createHarness();
  const poolReady = await setupDelivered(pool, true);
  for (let index = 0; index < 20; index += 1) {
    const bucket = `bucket_pool_${index.toString().padStart(24, "0")}`;
    const encounterSecret = `pool_encounter_${index.toString().padStart(32, "0")}`;
    await pool.call("public_encounter.issue", { params: { projectionId: poolReady.projection.projectionId }, expectedVersion: 2, body: { encounterSecret } }, bucket);
    await pool.call("interaction.create", {
      actorClass: "guest_capability", authorizationSecret: encounterSecret,
      body: { projectionId: poolReady.projection.projectionId, interactionType: "ask", consent: "manual_owner_only", requestBody: `Pool ${index}`, guestCapsule: null, replySecret: `pool_reply_${index.toString().padStart(32, "0")}`, deleteSecret: `pool_delete_${index.toString().padStart(32, "0")}` },
    });
  }
  const overflowSecret = "pool_encounter_overflow_00000000000000000001";
  await pool.call("public_encounter.issue", { params: { projectionId: poolReady.projection.projectionId }, expectedVersion: 2, body: { encounterSecret: overflowSecret } }, `bucket_overflow_${"x".repeat(24)}`);
  await assert.rejects(pool.call("interaction.create", {
    actorClass: "guest_capability", authorizationSecret: overflowSecret,
    body: { projectionId: poolReady.projection.projectionId, interactionType: "ask", consent: "manual_owner_only", requestBody: "Pool overflow", guestCapsule: null, replySecret: "pool_reply_overflow_0000000000000000000001", deleteSecret: "pool_delete_overflow_000000000000000000001" },
  }));
  assert.equal(pool.store.snapshot().interactions.length, 20);
});

test("pull revalidates receipt-domain request and GuestCapsule hashes before releasing plaintext", async () => {
  const h = createHarness();
  const encounter = await setupEncounter(h);
  const guestCapsule = {
    schemaVersion: "guest_capsule.v1" as const,
    level: "g1_lightweight" as const,
    pseudonym: "Synthetic Guest",
    currentFocus: "Understand Forme",
    offer: null,
    seek: "A bounded answer",
    openQuestion: "What matters now?",
    declaredSourceClass: null,
    scopeLabel: null,
    freshnessAt: null,
    guestSchemaVersion: null,
    consentStatement: null,
  };
  const created = await h.call("interaction.create", {
    actorClass: "guest_capability",
    authorizationSecret: encounter.encounterSecret,
    body: {
      projectionId: encounter.projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Integrity-bound request body.",
      guestCapsule,
      replySecret: "integrity_reply_secret_0000000000000000000001",
      deleteSecret: "integrity_delete_secret_000000000000000000001",
    },
  });
  const interactionId = created.body.targetId as string;
  const image = await h.store.exportDurableImage();
  const { imageHash: _imageHash, ...imagePreimage } = image;
  const reopen = async (changed: typeof image.interactions): Promise<InMemoryPublicCoreStoreV1> => {
    const preimage = { ...imagePreimage, interactions: changed };
    const changedImage = { ...preimage, imageHash: canonicalSha256(preimage) } satisfies PublicCoreDurableStoreImageV1;
    return await InMemoryPublicCoreStoreV1.reopen({
      image: changedImage,
      now: () => new Date(h.now.value),
      ids: h.ids,
      protector: h.protector,
    });
  };
  const pullInput = h.build("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: encounter.bindingSecret,
    params: { interactionId },
    expectedVersion: 1,
  });

  const requestHashTamper = image.interactions.map((value) => value.interactionId === interactionId
    ? { ...value, requestHash: canonicalSha256("tampered request domain hash") }
    : value);
  await hasCode(reopen(requestHashTamper), "durable_image_ciphertext_invalid");

  const guestHashTamper = image.interactions.map((value) => value.interactionId === interactionId
    ? { ...value, guestCapsuleHash: canonicalSha256("tampered GuestCapsule domain hash") }
    : value);
  await hasCode(reopen(guestHashTamper), "durable_image_ciphertext_invalid");

  const firstPull = await h.execute(pullInput);
  assert.deepEqual({ ...(firstPull.body.guestCapsule as Readonly<Record<string, unknown>>) }, guestCapsule);
  const pulledImage = await h.store.exportDurableImage();
  const pullReceipt = pulledImage.receipts.find((value) => value.idempotencyKey === pullInput.idempotencyKey);
  const pulledInteraction = pulledImage.interactions.find((value) => value.interactionId === interactionId);
  assert.ok(pullReceipt && pulledInteraction?.guestCapsule);
  assert.equal(pullReceipt.recovery.kind, "pull");
  if (pullReceipt.recovery.kind !== "pull") assert.fail("expected pull recovery");
  assert.equal(pullReceipt.recovery.guestCapsuleFieldVersion, pulledInteraction.guestCapsule.objectVersion);
  assert.equal(pullReceipt.recovery.guestCapsuleHash, pulledInteraction.guestCapsuleHash);

  const { imageHash: _pulledHash, ...pulledPreimage } = pulledImage;
  const rejectRecovery = async (recovery: typeof pullReceipt.recovery): Promise<void> => {
    const receipts = pulledImage.receipts.map((value) => value.receiptId === pullReceipt.receiptId
      ? { ...value, recovery }
      : value);
    const preimage = { ...pulledPreimage, receipts };
    await hasCode(InMemoryPublicCoreStoreV1.reopen({
      image: { ...preimage, imageHash: canonicalSha256(preimage) },
      now: () => new Date(h.now.value),
      ids: h.ids,
      protector: h.protector,
    }), "durable_image_invariant_invalid");
  };
  await rejectRecovery({ ...pullReceipt.recovery, guestCapsuleFieldVersion: pullReceipt.recovery.guestCapsuleFieldVersion! + 1 });
  await rejectRecovery({ ...pullReceipt.recovery, guestCapsuleHash: canonicalSha256("wrong receipt GuestCapsule hash") });

  const restarted = await InMemoryPublicCoreStoreV1.reopen({
    image: pulledImage,
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  const replay = await new PublicCoreApplicationV1(restarted).run(pullInput);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, firstPull.body);

  await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: "integrity_delete_secret_000000000000000000001",
    params: { interactionId },
    expectedVersion: 2,
  });
  const terminalImage = await h.store.exportDurableImage();
  const terminalReceipt = terminalImage.receipts.find((value) => value.idempotencyKey === pullInput.idempotencyKey);
  assert.ok(terminalReceipt && terminalReceipt.recovery.kind === "pull");
  assert.equal(terminalImage.interactions.find((value) => value.interactionId === interactionId)?.guestCapsule, null);
  const { imageHash: _terminalHash, ...terminalPreimage } = terminalImage;
  const rejectTerminalRecovery = async (recovery: typeof terminalReceipt.recovery): Promise<void> => {
    const receipts = terminalImage.receipts.map((value) => value.receiptId === terminalReceipt.receiptId
      ? { ...value, recovery }
      : value);
    const preimage = { ...terminalPreimage, receipts };
    await hasCode(InMemoryPublicCoreStoreV1.reopen({
      image: { ...preimage, imageHash: canonicalSha256(preimage) },
      now: () => new Date(h.now.value),
      ids: h.ids,
      protector: h.protector,
    }), "durable_image_invariant_invalid");
  };
  await rejectTerminalRecovery({ ...terminalReceipt.recovery, requestFieldVersion: 2 });
  await rejectTerminalRecovery({ ...terminalReceipt.recovery, bodyHash: canonicalSha256("terminal historical request drift") });
  await rejectTerminalRecovery({ ...terminalReceipt.recovery, guestCapsuleFieldVersion: 2 });
  await rejectTerminalRecovery({ ...terminalReceipt.recovery, guestCapsuleHash: canonicalSha256("terminal historical GuestCapsule drift") });
  await rejectTerminalRecovery({ ...terminalReceipt.recovery, bodyExpiresAt: "2026-09-09T12:00:00.001Z" });
});

test("reopen rejects rehashed sync retention widening, event drift, and unbound tombstones", async () => {
  const h = createHarness();
  const bound = await setupBinding(h);
  h.now.value = "2026-08-11T12:00:00.000Z";
  const sync = h.build("room_operator.sync", {
    actorClass: "room_operator",
    authorizationSecret: bound.bindingSecret,
    body: { roomId: bound.roomId, afterSequence: 0 },
    idempotencyKey: "sync_retention_reopen_000000000000000000001",
  });
  await h.execute(sync);
  const image = await h.store.exportDurableImage();
  const { imageHash: _imageHash, ...base } = image;
  type DurablePreimageV1 = Omit<PublicCoreDurableStoreImageV1, "imageHash">;
  const resign = (preimage: DurablePreimageV1): PublicCoreDurableStoreImageV1 => ({
    ...preimage,
    imageHash: canonicalSha256(preimage),
  });
  const reject = async (candidate: DurablePreimageV1): Promise<void> => await hasCode(
    InMemoryPublicCoreStoreV1.reopen({
      image: resign(candidate),
      now: () => new Date(h.now.value),
      ids: h.ids,
      protector: h.protector,
    }),
    "durable_image_invariant_invalid",
  );
  const syncReceipt = base.receipts.find((value) => value.recovery.kind === "sync")!;
  assert.equal(syncReceipt.recovery.kind, "sync");
  const widenedExpiry = new Date(Date.parse(syncReceipt.committedAt) + 37 * 24 * 60 * 60 * 1_000).toISOString();
  assert.notEqual(syncReceipt.expiresAt, widenedExpiry, "the older event must narrow the sync receipt source deadline");
  await reject({
    ...base,
    receipts: base.receipts.map((value) => value.receiptId === syncReceipt.receiptId
      ? {
          ...value,
          expiresAt: widenedExpiry,
          recovery: value.recovery.kind === "sync"
            ? { ...value.recovery, sourceExpiresAt: widenedExpiry }
            : value.recovery,
        }
      : value),
  } as DurablePreimageV1);

  const sourceEvent = syncReceipt.recovery.snapshot.events[0]!;
  const { eventHash: _eventHash, ...eventPreimage } = sourceEvent;
  const driftedEventPreimage = { ...eventPreimage, action: "interaction.create" as const };
  const driftedEvent = { ...driftedEventPreimage, eventHash: canonicalSha256(driftedEventPreimage) };
  await reject({
    ...base,
    receipts: base.receipts.map((value) => value.receiptId === syncReceipt.receiptId && value.recovery.kind === "sync"
      ? {
          ...value,
          recovery: {
            ...value.recovery,
            snapshot: { ...value.recovery.snapshot, events: [driftedEvent, ...value.recovery.snapshot.events.slice(1)] },
          },
        }
      : value),
  } as DurablePreimageV1);

  const overlapDriftPreimage = { ...eventPreimage, targetVersion: sourceEvent.targetVersion + 1 };
  const overlapDrift = { ...overlapDriftPreimage, eventHash: canonicalSha256(overlapDriftPreimage) };
  await reject({
    ...base,
    receipts: base.receipts.map((value) => value.receiptId === syncReceipt.receiptId && value.recovery.kind === "sync"
      ? {
          ...value,
          recovery: {
            ...value.recovery,
            snapshot: { ...value.recovery.snapshot, events: [overlapDrift, ...value.recovery.snapshot.events.slice(1)] },
          },
        }
      : value),
  } as DurablePreimageV1);
  await reject({
    ...base,
    receipts: base.receipts.map((value) => value.receiptId === syncReceipt.receiptId && value.recovery.kind === "sync"
      ? {
          ...value,
          recovery: {
            ...value.recovery,
            snapshot: { ...value.recovery.snapshot, events: value.recovery.snapshot.events.slice(0, -1) },
          },
        }
      : value),
  } as DurablePreimageV1);

  const tombstoneHarness = createHarness();
  const pending = await setupInteraction(tombstoneHarness);
  await tombstoneHarness.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  await tombstoneHarness.maintenance.compactBodyFreeEvents(2);
  await tombstoneHarness.call("room_operator.sync", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    body: { roomId: pending.roomId, afterSequence: 0 },
  });
  const tombstoneImage = await tombstoneHarness.store.exportDurableImage();
  const { imageHash: _tombstoneHash, ...tombstoneBase } = tombstoneImage;
  const tombstoneReceipt = tombstoneBase.receipts.find((value) => value.recovery.kind === "sync")!;
  assert.equal(tombstoneReceipt.recovery.kind, "sync");
  assert.equal(tombstoneReceipt.recovery.snapshot.schemaVersion, "r4_public_core_cursor_gone.v1");
  if (tombstoneReceipt.recovery.snapshot.schemaVersion !== "r4_public_core_cursor_gone.v1") assert.fail("cursor-gone receipt required");
  assert.equal(tombstoneReceipt.recovery.snapshot.events[0]?.sequence, 2);
  assert.equal(tombstoneReceipt.recovery.snapshot.events.at(-1)?.sequence, tombstoneReceipt.recovery.snapshot.highWater);
  const unboundId = `interaction_${"x".repeat(32)}`;
  const tamperedTombstoneBase = {
    ...tombstoneBase,
    receipts: tombstoneBase.receipts.map((value) => value.receiptId === tombstoneReceipt.receiptId && value.recovery.kind === "sync" && value.recovery.snapshot.schemaVersion === "r4_public_core_cursor_gone.v1"
      ? {
          ...value,
          recovery: {
            ...value.recovery,
            snapshot: { ...value.recovery.snapshot, tombstoneIds: [unboundId] },
          },
        }
      : value),
  } as DurablePreimageV1;
  await hasCode(
    InMemoryPublicCoreStoreV1.reopen({
      image: resign(tamperedTombstoneBase),
      now: () => new Date(tombstoneHarness.now.value),
      ids: tombstoneHarness.ids,
      protector: tombstoneHarness.protector,
    }),
    "durable_image_invariant_invalid",
  );
});

test("reopen rejects caller-rehashed images that violate closed durable invariants", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  await h.call("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
  });
  const image = await h.store.exportDurableImage();
  const { imageHash: _imageHash, ...base } = image;
  type DurablePreimageV1 = Omit<PublicCoreDurableStoreImageV1, "imageHash">;
  const resign = (preimage: DurablePreimageV1): PublicCoreDurableStoreImageV1 => ({
    ...preimage,
    imageHash: canonicalSha256(preimage),
  });
  const reopen = async (preimage: DurablePreimageV1): Promise<InMemoryPublicCoreStoreV1> => await InMemoryPublicCoreStoreV1.reopen({
    image: resign(preimage),
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });

  const valid = await InMemoryPublicCoreStoreV1.reopen({
    image,
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  assert.notEqual(valid, h.store);

  const room = base.room!;
  const projectionRecord = base.projections[0]!;
  const encounterRecord = base.encounters[0]!;
  const event = base.events[0]!;
  const receipt = base.receipts[0]!;
  const nonce = base.nonceRegistrations[0]!;
  const tag = room.label.envelope.tag as string;
  const tamperedTag = `${tag.startsWith("A") ? "B" : "A"}${tag.slice(1)}`;
  const cases: ReadonlyArray<Readonly<{ name: string; preimage: DurablePreimageV1; code: string }>> = [
    {
      name: "Room/installation composite",
      preimage: { ...base, room: { ...room, installationId: `install_${"x".repeat(32)}` } },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "checkpoint before historical rows",
      preimage: { ...base, checkpointAt: "2026-08-10T11:59:59.999Z" },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "Projection/Room composite",
      preimage: { ...base, projections: base.projections.map((value) => value.projectionId === projectionRecord.projectionId ? { ...value, roomId: `room_${"x".repeat(32)}` } : value) },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "duplicate durable ID",
      preimage: { ...base, projections: [...base.projections, projectionRecord] },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "duplicate nonce",
      preimage: { ...base, nonceRegistrations: [...base.nonceRegistrations, nonce] },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "event high-water",
      preimage: { ...base, room: { ...room, eventHighWater: room.eventHighWater + 1 } },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "event hash",
      preimage: { ...base, events: base.events.map((value) => value.eventId === event.eventId ? { ...value, targetVersion: value.targetVersion + 1 } : value) },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "receipt recovery/action",
      preimage: { ...base, receipts: base.receipts.map((value) => value.receiptId === receipt.receiptId ? { ...value, action: "curation.admit" } : value) },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "receipt wrong Room target",
      preimage: {
        ...base,
        receipts: base.receipts.map((value) => value.recovery.kind === "room_created"
          ? { ...value, recovery: { ...value.recovery, roomId: `room_${"x".repeat(32)}` } }
          : value),
      } as unknown as DurablePreimageV1,
      code: "durable_image_invariant_invalid",
    },
    {
      name: "receipt impossible target version",
      preimage: {
        ...base,
        receipts: base.receipts.map((value) => value.recovery.kind === "projection_delivered"
          ? { ...value, recovery: { ...value.recovery, projectionVersion: value.recovery.projectionVersion + 100 } }
          : value),
      } as unknown as DurablePreimageV1,
      code: "durable_image_invariant_invalid",
    },
    {
      name: "pull terminal wrong Interaction",
      preimage: {
        ...base,
        receipts: base.receipts.map((value) => value.recovery.kind === "pull_terminal"
          ? { ...value, recovery: { ...value.recovery, interactionId: `interaction_${"x".repeat(32)}` } }
          : value),
      } as unknown as DurablePreimageV1,
      code: "durable_image_invariant_invalid",
    },
    {
      name: "pull terminal canary state",
      preimage: {
        ...base,
        receipts: base.receipts.map((value) => value.recovery.kind === "pull_terminal"
          ? { ...value, recovery: { ...value.recovery, state: "PRIVATE_BODY_CANARY_RECOVERY" } }
          : value),
      } as unknown as DurablePreimageV1,
      code: "durable_image_invariant_invalid",
    },
    {
      name: "Projection lifecycle",
      preimage: { ...base, projections: base.projections.map((value) => value.projectionId === projectionRecord.projectionId ? { ...value, current: false } : value) },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "encounter retention ceiling",
      preimage: { ...base, encounters: base.encounters.map((value) => value.encounterId === encounterRecord.encounterId ? { ...value, expiresAt: "2026-08-11T12:00:00.001Z" } : value) },
      code: "durable_image_invariant_invalid",
    },
    {
      name: "ciphertext tag",
      preimage: { ...base, room: { ...room, label: { ...room.label, envelope: { ...room.label.envelope, tag: tamperedTag } } } },
      code: "durable_image_ciphertext_invalid",
    },
  ];
  for (const fixture of cases) {
    await hasCode(reopen(fixture.preimage), fixture.code);
  }
});

test("a durable image reopens into a genuinely new store and recovers committed receipts", async () => {
  const h = createHarness();
  const roomInput = h.build("room.create", {
    idempotencyKey: "restart_room_create_0000000000000000000001",
    body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Restart Room" },
  });
  const first = await h.app.run(roomInput);
  const image = await h.store.exportDurableImage();
  const reopenedStore = await InMemoryPublicCoreStoreV1.reopen({
    image,
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  assert.notEqual(reopenedStore, h.store);
  const restartedApplication = new PublicCoreApplicationV1(reopenedStore);
  const recovered = await restartedApplication.run(roomInput);
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.body, first.body);
  assert.equal(reopenedStore.snapshot().receipts.filter((receipt) => receipt.action === "room.create").length, 1);
});

test("checkpointed reopen validates historical bytes then applies each 10m/24h/7d/30d deadline with one reopen clock sample", async () => {
  const h = createHarness();
  await setupInteraction(h);
  const image = await h.store.exportDurableImage();
  assert.equal(image.checkpointAt, T0);
  const originalBytes = JSON.stringify(image);
  const reopenAt = async (at: string): Promise<InMemoryPublicCoreStoreV1> => {
    let samples = 0;
    const reopened = await InMemoryPublicCoreStoreV1.reopen({
      image,
      now: () => { samples += 1; return new Date(at); },
      ids: h.ids,
      protector: h.protector,
    });
    assert.equal(samples, 1, "reopen must bind one canonical now across all due transitions");
    assert.equal(JSON.stringify(image), originalBytes, "reopen must not mutate the checkpoint image");
    return reopened;
  };

  const tenMinutes = (await reopenAt("2026-08-10T12:10:00.000Z")).snapshot();
  assert.equal(tenMinutes.pairings[0]?.state, "expired");
  assert.equal(tenMinutes.pairings[0]?.pairingCode, null);
  assert.equal(tenMinutes.pairings[0]?.exchangeEnvelope, null);

  const oneDay = (await reopenAt("2026-08-11T12:00:00.000Z")).snapshot();
  assert.equal(oneDay.encounters.length, 0);
  assert.equal(oneDay.projections[0]?.capsule === null, false);

  const sevenDays = (await reopenAt("2026-08-17T12:00:00.000Z")).snapshot();
  assert.equal(sevenDays.projections[0]?.ownerState, "expired");
  assert.equal(sevenDays.projections[0]?.capsule, null);
  assert.equal(sevenDays.interactions[0]?.requestBody === null, false);

  const thirtyDays = (await reopenAt("2026-09-09T12:00:00.000Z")).snapshot();
  assert.equal(thirtyDays.interactions[0]?.state, "interaction_expired");
  assert.equal(thirtyDays.interactions[0]?.requestBody, null);
  assert.equal(thirtyDays.interactions[0]?.guestCapsule, null);
});

test("restart preserves exact pull replay across a nonterminal local-purge version bump", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  const pull = h.build("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: "restart_local_purge_pull_000000000000000001",
  });
  const first = await h.execute(pull);
  await h.call("room_operator.local_purge.receipt", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    body: { localBytesAbsent: true },
    expectedVersion: 2,
  });

  const restarted = await InMemoryPublicCoreStoreV1.reopen({
    image: await h.store.exportDurableImage(),
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  const replay = await new PublicCoreApplicationV1(restarted).run(pull);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);
  assert.equal(restarted.snapshot().interactions[0]?.version, 3);
});

test("restart preserves an exact terminal pull receipt after a later terminal lifecycle advance", async () => {
  const h = createHarness();
  const pending = await setupInteraction(h);
  await h.call("projection.revoke", {
    params: { projectionId: pending.projection.projectionId },
    expectedVersion: 2,
  });
  const pull = h.build("room_operator.pull", {
    actorClass: "room_operator",
    authorizationSecret: pending.bindingSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: "restart_terminal_pull_0000000000000000000001",
  });
  const first = await h.execute(pull);
  assert.equal(first.body.state, "origin_revoked");
  await h.call("interaction.delete", {
    actorClass: "guest_capability",
    authorizationSecret: pending.deleteSecret,
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
  });

  const restarted = await InMemoryPublicCoreStoreV1.reopen({
    image: await h.store.exportDurableImage(),
    now: () => new Date(h.now.value),
    ids: h.ids,
    protector: h.protector,
  });
  assert.equal(restarted.snapshot().interactions[0]?.state, "interaction_deleted");
  const replay = await new PublicCoreApplicationV1(restarted).run(pull);
  assert.equal(replay.recovered, true);
  assert.deepEqual(replay.body, first.body);
});
