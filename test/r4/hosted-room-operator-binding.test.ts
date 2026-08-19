import assert from "node:assert/strict";
import test from "node:test";
import {
  HostedRoomApplication,
  SemanticError,
  assertRoomOperatorBindingScope,
  buildValidatedRoomOperatorRequest,
  type OperationResponse,
} from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import {
  SYNTHETIC_PRIVATE_ROOM_ID,
  SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET,
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
  syntheticCapabilityRequestBody,
  syntheticCapabilitySecret,
  syntheticPairingCredential,
} from "../../apps/room/src/synthetic-fixtures.ts";
import { canonicalSha256, createApiMutationEnvelopeV1 } from "../../packages/r4-protocol/src/index.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PRIVATE_PROJECTION_ID = "proj_formeprivate0000000000000000000";

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  authorization?: string | null;
  expectedVersion?: number | null;
  idempotencyKey?: string | null;
}

function fixture() {
  let now = new Date(T0);
  const store = new SyntheticPresenceStore(() => now);
  const app = new HostedRoomApplication(store);
  let serial = 90_000;
  async function call(name: string, options: CallOptions = {}): Promise<OperationResponse> {
    const definition = operationDefinition(name);
    serial += 1;
    return app.run({
      definition,
      params: options.params ?? {},
      body: syntheticCapabilityRequestBody(options.body ?? {}),
      authorization: options.authorization ?? null,
      syntheticActor: ["controller", "curator", "room_operator"].includes(definition.actor)
        ? definition.actor
        : null,
      idempotencyKey: options.idempotencyKey !== undefined
        ? options.idempotencyKey
        : definition.mutating
          ? serial.toString(16).padStart(32, "0")
          : null,
      expectedVersion: options.expectedVersion !== undefined
        ? options.expectedVersion
        : definition.expectedVersion
          ? 1
          : null,
      syntheticClientBucket: "synthetic-room-binding-client",
    });
  }
  return {
    store,
    call,
    setTime(value: string) { now = new Date(value); },
  };
}

async function notFound(work: Promise<unknown>): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "not_found");
    assert.match(error.message, /^The requested (?:operation|capability) is unavailable$/u);
    assert.doesNotMatch(error.message, /private|public|room_/iu);
    return true;
  });
}

function bearer(secret: string): string {
  return `Bearer ${syntheticCapabilitySecret(secret)}`;
}

test("room_operator.v1 fixtures are distinct exact-Room 30-day bindings and build the canonical wrapper", () => {
  const instance = fixture();
  const publicBinding = instance.store.roomOperatorBinding(SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID);
  const privateBinding = instance.store.roomOperatorBinding(SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID);
  assert.ok(publicBinding);
  assert.ok(privateBinding);
  assert.equal(publicBinding.roomId, SYNTHETIC_PUBLIC_ROOM_ID);
  assert.equal(privateBinding.roomId, SYNTHETIC_PRIVATE_ROOM_ID);
  assert.notEqual(publicBinding.secretDigest, privateBinding.secretDigest);
  assert.equal(Date.parse(publicBinding.expiresAt) - Date.parse(publicBinding.pairedAt), 30 * 24 * 60 * 60 * 1000);

  const mutation = createApiMutationEnvelopeV1({
    actorClass: "room_operator.v1",
    action: "room_operator.sync",
    idempotencyKey: "roomoperatorwrapper00000000000001",
    expectedObjectVersion: null,
    predecessorHash: null,
    payload: { roomId: SYNTHETIC_PUBLIC_ROOM_ID, afterSequence: 0 },
  });
  const request = buildValidatedRoomOperatorRequest(
    publicBinding,
    { roomId: SYNTHETIC_PUBLIC_ROOM_ID, exactTargetId: SYNTHETIC_PUBLIC_ROOM_ID },
    "sync",
    mutation,
  );
  assert.deepEqual(request, {
    schemaVersion: "room_operator_request.v1",
    bindingId: SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
    roomId: SYNTHETIC_PUBLIC_ROOM_ID,
    action: "sync",
    mutation,
    exactTargetId: SYNTHETIC_PUBLIC_ROOM_ID,
  });
  assert.doesNotThrow(() => assertRoomOperatorBindingScope(
    publicBinding,
    { roomId: SYNTHETIC_PUBLIC_ROOM_ID, exactTargetId: SYNTHETIC_PUBLIC_ROOM_ID },
    T0,
  ));
});

test("room_operator.v1 requires its bearer and a public binding cannot inspect or sync the private Room", async () => {
  const instance = fixture();
  await notFound(instance.call("room_operator.status", { body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID } }));
  await notFound(instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer("wrong_room_operator_secret_000000001"),
  }));

  const publicStatus = await instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  });
  assert.equal((publicStatus.body.room as { roomId: string }).roomId, SYNTHETIC_PUBLIC_ROOM_ID);
  const privateStatus = await instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PRIVATE_ROOM_ID },
    authorization: bearer(SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET),
  });
  assert.equal((privateStatus.body.room as { roomId: string }).roomId, SYNTHETIC_PRIVATE_ROOM_ID);

  await notFound(instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PRIVATE_ROOM_ID },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  }));
  await notFound(instance.call("room_operator.sync", {
    body: { roomId: SYNTHETIC_PRIVATE_ROOM_ID, afterSequence: 0 },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  }));
});

test("operator idempotency is keyed by binding ID rather than one global synthetic actor", async () => {
  const instance = fixture();
  const key = "samekeydifferentbindings0000000001";
  const publicSync = await instance.call("room_operator.sync", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID, afterSequence: 0 },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
    idempotencyKey: key,
  });
  const privateSync = await instance.call("room_operator.sync", {
    body: { roomId: SYNTHETIC_PRIVATE_ROOM_ID, afterSequence: 0 },
    authorization: bearer(SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET),
    idempotencyKey: key,
  });
  assert.equal(publicSync.body.roomId, SYNTHETIC_PUBLIC_ROOM_ID);
  assert.equal(privateSync.body.roomId, SYNTHETIC_PRIVATE_ROOM_ID);
  const audits = instance.store.auxiliaryEntries("room_operator_audit:").map(([, value]) => value);
  assert.equal(audits.length, 2);
  assert.deepEqual(new Set(audits.map((audit) => audit.bindingId)), new Set([
    SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
    SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID,
  ]));
  for (const audit of audits) {
    assert.equal(audit.bodyFree, true);
    assert.match(audit.operatorRequestHash as string, /^sha256:[a-f0-9]{64}$/u);
    assert.match(audit.mutationHash as string, /^sha256:[a-f0-9]{64}$/u);
    assert.equal("body" in audit, false);
  }
});

test("interaction, Projection, and ACK scopes are derived from their exact object Room", async () => {
  const instance = fixture();
  const grantSecret = "private_binding_scope_grant_secret_000001";
  await instance.call("grant.issue", {
    body: {
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      projectionId: PRIVATE_PROJECTION_ID,
      presetId: "one_visit",
      grantSecret,
      permitsAgentDerivative: false,
      reentryChainId: "chain_privatebindingscope000000001",
    },
  });
  const created = await instance.call("interaction.create", {
    authorization: bearer(grantSecret),
    body: {
      projectionId: PRIVATE_PROJECTION_ID,
      interactionType: "ask",
      consent: "allow_owner_local_ai",
      replySecret: "reply_privatebindingscope0000000001",
      deleteSecret: "delete_privatebindingscope000000001",
      requestBody: "Synthetic private Room request.",
      guestCapsule: null,
    },
  });
  const interactionId = created.body.interactionId as string;
  const cycleHash = canonicalSha256("wrong-room-cycle");

  for (const [name, body] of [
    ["room_operator.pull", {}],
    ["room_operator.cycle.reserve", { startAuthorizationHash: cycleHash, sessionEnvelopeHash: cycleHash }],
    ["room_operator.cycle.recover", { reservationId: "reservation_wrongroom000000000000", startAuthorizationHash: cycleHash, sessionEnvelopeHash: cycleHash }],
    ["room_operator.cycle.abandon", { reservationId: "reservation_wrongroom000000000000", startAuthorizationHash: cycleHash, sessionEnvelopeHash: cycleHash, transportJournalDispatches: 0 }],
    ["room_operator.dispatch.issue", {
      reservationId: "reservation_wrongroom000000000000",
      sessionEnvelopeHash: cycleHash,
      startAuthorizationHash: cycleHash,
      provider: "OpenAI",
      model: "synthetic-model",
      payloadHash: cycleHash,
      ordinal: 1,
    }],
    ["room_operator.local_purge.receipt", { localBytesAbsent: true }],
  ] as const) {
    await notFound(instance.call(name, {
      params: { interactionId },
      body,
      authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
    }));
  }
  await notFound(instance.call("room_operator.stale.attest", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  }));

  await instance.call("room.mode.set", {
    params: { roomId: SYNTHETIC_PRIVATE_ROOM_ID },
    body: { interactionMode: "closed" },
  });
  const batch = await instance.call("room_operator.sync", {
    body: { roomId: SYNTHETIC_PRIVATE_ROOM_ID, afterSequence: 0 },
    authorization: bearer(SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET),
  });
  const event = (batch.body.events as Array<Record<string, unknown>>)[0];
  assert.ok(event);
  await notFound(instance.call("room_operator.ack", {
    body: {
      schemaVersion: "room_event_ack.v1",
      roomId: event.roomId,
      eventId: event.eventId,
      sequence: event.sequence,
      eventHash: `sha256:${"0".repeat(64)}`,
      idempotencyKey: "privateackscope000000000000000001",
    },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
    idempotencyKey: "privateackscope000000000000000001",
  }));
});

test("revoked and expired bindings fail closed without a drain credential", async () => {
  const revoked = fixture();
  const binding = revoked.store.roomOperatorBinding(SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID);
  assert.ok(binding);
  revoked.store.saveRoomOperatorBinding({ ...binding, state: "revoked", revokedAt: T0 });
  await notFound(revoked.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  }));

  const expired = fixture();
  expired.setTime("2026-09-02T12:00:00.000Z");
  await notFound(expired.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
  }));
});

test("pairing challenge exchange atomically issues one nonrenewing binding and Controller revoke is immediate", async () => {
  const instance = fixture();
  const challenge = await instance.call("room.pair", {
    params: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    body: {},
    expectedVersion: 1,
  });
  const pairingId = challenge.body.pairingId as string;
  const pairingCode = challenge.body.pairingCode as string;
  const clientPublicKey = "synthetic-client-public-key-persisted-before-exchange-0001";
  const exchange = await instance.call("room.pair.exchange", {
    params: { pairingId },
    body: { pairingCode, clientPublicKey },
    expectedVersion: 1,
  });
  const bindingId = exchange.body.bindingId as string;
  const binding = instance.store.roomOperatorBinding(bindingId);
  assert.ok(binding);
  assert.equal(binding.roomId, SYNTHETIC_PUBLIC_ROOM_ID);
  assert.equal(binding.state, "active");
  assert.equal(Date.parse(binding.expiresAt) - Date.parse(binding.pairedAt), 30 * 24 * 60 * 60 * 1000);
  const recoveredCredential = syntheticPairingCredential(
    pairingId,
    SYNTHETIC_PUBLIC_ROOM_ID,
    canonicalSha256(clientPublicKey),
  );
  assert.equal(instance.store.roomOperatorBindingBySecret(recoveredCredential)?.bindingId, bindingId);
  assert.doesNotMatch(JSON.stringify(exchange.body), new RegExp(recoveredCredential, "u"));
  assert.equal((await instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer(recoveredCredential),
  })).status, 200);

  const revoked = await instance.call("room.binding.revoke", {
    params: { bindingId },
    expectedVersion: 1,
  });
  assert.equal(revoked.body.state, "revoked");
  assert.equal("secretDigest" in revoked.body, false);
  await notFound(instance.call("room_operator.status", {
    body: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    authorization: bearer(recoveredCredential),
  }));

  const expiring = fixture();
  const expiringChallenge = await expiring.call("room.pair", {
    params: { roomId: SYNTHETIC_PUBLIC_ROOM_ID },
    body: {},
    expectedVersion: 1,
  });
  expiring.setTime("2026-08-03T12:10:00.000Z");
  await assert.rejects(expiring.call("room.pair.exchange", {
    params: { pairingId: expiringChallenge.body.pairingId as string },
    body: {
      pairingCode: expiringChallenge.body.pairingCode,
      clientPublicKey: "synthetic-expired-client-public-key-0001",
    },
    expectedVersion: 1,
  }), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.status, 410);
    assert.equal(error.code, "pairing_expired");
    return true;
  });
});
