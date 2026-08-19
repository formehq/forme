import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  key: string;
  expectedVersion?: number | null;
}

function fixture() {
  const store = new SyntheticPresenceStore(() => new Date(T0));
  const app = new HostedRoomApplication(store);
  return {
    store,
    call(name: string, options: CallOptions): Promise<OperationResponse> {
      const definition = operationDefinition(name);
      return app.run({
        definition,
        params: options.params ?? {},
        body: syntheticCapabilityRequestBody(options.body ?? {}),
        authorization: options.secret
          ? `Bearer ${syntheticCapabilitySecret(options.secret)}`
          : definition.actor === "room_operator"
            ? `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`
            : null,
        syntheticActor: ["controller", "curator", "room_operator"].includes(definition.actor) ? definition.actor : null,
        idempotencyKey: options.key,
        expectedVersion: options.expectedVersion ?? (definition.expectedVersion ? 1 : null),
        syntheticClientBucket: "synthetic-lost-response-client",
      });
    },
  };
}

async function conflict(work: Promise<unknown>): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, "idempotency_conflict");
    assert.equal(error.status, 409);
    return true;
  });
}

function assertNoRawBearer(response: OperationResponse, ...bearers: string[]): void {
  const wire = JSON.stringify(response.body);
  for (const bearer of bearers) assert.doesNotMatch(wire, new RegExp(bearer, "u"));
}

test("E03 every client-secret create recovers exact lost response and changed bytes fail closed", async () => {
  const instance = fixture();

  const issuedGrantSecret = "direct_grant_lost_response_secret_001";
  const grantOptions: CallOptions = {
    key: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret: issuedGrantSecret,
      permitsAgentDerivative: false,
      reentryChainId: "chain_directlostresponse000000001",
    },
  };
  const issuedGrant = await instance.call("grant.issue", grantOptions);
  assert.deepEqual(await instance.call("grant.issue", grantOptions), issuedGrant);
  assertNoRawBearer(issuedGrant, issuedGrantSecret);
  await conflict(instance.call("grant.issue", {
    ...grantOptions,
    body: { ...grantOptions.body, grantSecret: "changed_direct_grant_secret_000001" },
  }));
  const priorGrantId = (issuedGrant.body.grant as { grantId: string }).grantId;

  const replacementSecret = "replacement_lost_response_secret_0001";
  const replacementOptions: CallOptions = {
    key: "abababababababababababababababab",
    params: { grantId: priorGrantId },
    expectedVersion: 1,
    body: {
      presetId: "trusted_collaborator",
      grantSecret: replacementSecret,
      permitsAgentDerivative: true,
    },
  };
  const replacement = await instance.call("grant.replace", replacementOptions);
  assert.deepEqual(await instance.call("grant.replace", replacementOptions), replacement);
  assertNoRawBearer(replacement, issuedGrantSecret, replacementSecret);
  await conflict(instance.call("grant.replace", {
    ...replacementOptions,
    body: { ...replacementOptions.body, grantSecret: "changed_replacement_secret_00000001" },
  }));
  const replacementId = (replacement.body.grant as { grantId: string }).grantId;
  assert.equal(instance.store.capability(priorGrantId)?.value.state, "replaced");
  assert.equal(instance.store.capability(replacementId)?.value.acceptedCount, 0);
  assert.equal(instance.store.capabilities().filter((capability) => capability.kind === "grant"
    && [priorGrantId, replacementId].includes(capability.value.grantId)).length, 2);
  const grantSurfaces = JSON.stringify({
    response: replacement.body,
    idempotency: instance.store.idempotencyEntries(),
    ownerStatus: instance.store.ownerStatus(),
    capabilities: instance.store.capabilities(),
  });
  assert.equal(grantSurfaces.includes(issuedGrantSecret), false);
  assert.equal(grantSurfaces.includes(replacementSecret), false);

  const encounterSecret = "encounter_lost_response_secret_000001";
  const encounterOptions: CallOptions = {
    key: "01010101010101010101010101010101",
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret },
  };
  const encounter = await instance.call("public_encounter.issue", encounterOptions);
  assert.deepEqual(await instance.call("public_encounter.issue", encounterOptions), encounter);
  assertNoRawBearer(encounter, encounterSecret);
  await conflict(instance.call("public_encounter.issue", {
    ...encounterOptions,
    body: { encounterSecret: "changed_encounter_secret_0000000001" },
  }));

  const replySecret = "reply_lost_response_secret_0000000001";
  const deleteSecret = "delete_lost_response_secret_000000001";
  const interactionOptions: CallOptions = {
    key: "02020202020202020202020202020202",
    secret: encounterSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      replySecret,
      deleteSecret,
      requestBody: "Synthetic lost-response request.",
      guestCapsule: null,
    },
  };
  const interaction = await instance.call("interaction.create", interactionOptions);
  assert.deepEqual(await instance.call("interaction.create", interactionOptions), interaction);
  assertNoRawBearer(interaction, replySecret, deleteSecret, encounterSecret);
  await conflict(instance.call("interaction.create", {
    ...interactionOptions,
    body: { ...interactionOptions.body, requestBody: "Changed canonical request." },
  }));
  const interactionId = interaction.body.interactionId as string;

  const offerOptions: CallOptions = {
    key: "03030303030303030303030303030303",
    body: {
      sourceInteractionId: interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: "2026-08-04T12:00:00.000Z",
      offeredGrantExpiresAt: "2026-08-10T12:00:00.000Z",
    },
  };
  const offer = await instance.call("grant_offer.issue", offerOptions);
  const offerId = (offer.body.offer as { offerId: string }).offerId;
  const acceptedGrantSecret = "offer_accept_client_grant_secret_00001";
  const acceptOptions: CallOptions = {
    key: "04040404040404040404040404040404",
    params: { offerId },
    secret: replySecret,
    body: { grantSecret: acceptedGrantSecret },
  };
  const accepted = await instance.call("grant_offer.accept", acceptOptions);
  assert.deepEqual(await instance.call("grant_offer.accept", acceptOptions), accepted);
  assertNoRawBearer(accepted, acceptedGrantSecret, replySecret);
  await conflict(instance.call("grant_offer.accept", {
    ...acceptOptions,
    body: { grantSecret: "changed_offer_grant_secret_0000001" },
  }));

  const inviteSecret = "direct_invite_client_secret_00000001";
  const inviteOptions: CallOptions = {
    key: "05050505050505050505050505050505",
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "short_exchange",
      acceptanceExpiresAt: "2026-08-04T12:00:00.000Z",
      offeredGrantExpiresAt: "2026-08-06T12:00:00.000Z",
      inviteSecret,
    },
  };
  const invite = await instance.call("direct_invite.issue", inviteOptions);
  assert.deepEqual(await instance.call("direct_invite.issue", inviteOptions), invite);
  assertNoRawBearer(invite, inviteSecret);
  await conflict(instance.call("direct_invite.issue", {
    ...inviteOptions,
    body: { ...inviteOptions.body, inviteSecret: "changed_direct_invite_secret_000001" },
  }));
  const inviteId = (invite.body.invite as { inviteId: string }).inviteId;
  const redeemedGrantSecret = "redeemed_client_grant_secret_0000001";
  const redeemOptions: CallOptions = {
    key: "06060606060606060606060606060606",
    params: { inviteId },
    secret: inviteSecret,
    body: { grantSecret: redeemedGrantSecret },
  };
  const redeemed = await instance.call("direct_invite.redeem", redeemOptions);
  assert.deepEqual(await instance.call("direct_invite.redeem", redeemOptions), redeemed);
  assertNoRawBearer(redeemed, redeemedGrantSecret, inviteSecret);
  await conflict(instance.call("direct_invite.redeem", {
    ...redeemOptions,
    body: { grantSecret: "changed_redeemed_grant_secret_0001" },
  }));

  const derivativeSecret = "client_agent_derivative_secret_000001";
  const derivativeReplySecret = "client_derivative_reply_secret_000001";
  const derivativeDeleteSecret = "client_derivative_delete_secret_00001";
  const derivativeOptions: CallOptions = {
    key: "07070707070707070707070707070707",
    secret: acceptedGrantSecret,
    body: {
      agentSecret: derivativeSecret,
      replySecret: derivativeReplySecret,
      deleteSecret: derivativeDeleteSecret,
    },
  };
  const derivative = await instance.call("agent_derivative.mint", derivativeOptions);
  assert.deepEqual(await instance.call("agent_derivative.mint", derivativeOptions), derivative);
  assertNoRawBearer(derivative, derivativeSecret, acceptedGrantSecret);
  await conflict(instance.call("agent_derivative.mint", {
    ...derivativeOptions,
    body: {
      agentSecret: "changed_agent_derivative_secret_0001",
      replySecret: derivativeReplySecret,
      deleteSecret: derivativeDeleteSecret,
    },
  }));
});

test("E03 pairing separates Owner challenge issue from same-key recoverable connector exchange", async () => {
  const instance = fixture();
  const issueOptions: CallOptions = {
    key: "08080808080808080808080808080808",
    params: { roomId: PUBLIC_ROOM_ID },
    body: {},
  };
  const challenge = await instance.call("room.pair", issueOptions);
  assert.deepEqual(await instance.call("room.pair", issueOptions), challenge);
  const pairingId = challenge.body.pairingId as string;
  const pairingCode = challenge.body.pairingCode as string;
  const exchangeOptions: CallOptions = {
    key: "81818181818181818181818181818181",
    params: { pairingId },
    expectedVersion: 1,
    body: { pairingCode, clientPublicKey: "synthetic-x25519-public-key-material-0000000001" },
  };
  const first = await instance.call("room.pair.exchange", exchangeOptions);
  assert.deepEqual(await instance.call("room.pair.exchange", exchangeOptions), first);
  const replay = await instance.call("room.pair.exchange", {
    ...exchangeOptions,
    key: "82828282828282828282828282828282",
  });
  assert.deepEqual(replay, first, "same client key recovers the exact stored sealed response with a new transport idempotency key");
  const sealed = first.body.sealedCredential;
  assert.equal(typeof sealed, "string");
  assert.match(sealed as string, /^synthetic-sealed:[a-f0-9]{64}$/u);
  assert.doesNotMatch(JSON.stringify(first.body), /room-operator:/u, "server credential exists only inside the sealed analogue");
  await assert.rejects(instance.call("room.pair.exchange", {
    ...exchangeOptions,
    key: "83838383838383838383838383838383",
    body: { pairingCode, clientPublicKey: "changed-x25519-public-key-material-000000001" },
  }), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, "pairing_already_consumed");
    assert.equal(error.status, 409);
    return true;
  });
  await assert.rejects(instance.call("room.pair", {
    ...issueOptions,
    body: { unexpected: "changed challenge bytes" },
  }), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, "invalid_request_shape");
    assert.equal(error.status, 400);
    return true;
  });
});

test("D05 derivative-supplied reply/delete values are decoys; only Manual-prebound recovery secrets can read/delete", async () => {
  const instance = fixture();
  const parentSecret = "manual_parent_grant_secret_000000001";
  await instance.call("grant.issue", {
    key: "09090909090909090909090909090909",
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret: parentSecret,
      permitsAgentDerivative: true,
      reentryChainId: "chain_derivative_recovery00000001",
    },
  });
  const agentSecret = "derivative_agent_only_secret_00000001";
  const manualReplySecret = "manual_prebound_reply_secret_000000001";
  const manualDeleteSecret = "manual_prebound_delete_secret_00000001";
  await instance.call("agent_derivative.mint", {
    key: "10101010101010101010101010101010",
    secret: parentSecret,
    body: { agentSecret, replySecret: manualReplySecret, deleteSecret: manualDeleteSecret },
  });
  const agentChosenReply = "agent_chosen_reply_secret_0000000001";
  const agentChosenDelete = "agent_chosen_delete_secret_000000001";
  const created = await instance.call("interaction.create", {
    key: "11111111111111111111111111111111",
    secret: agentSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      replySecret: agentChosenReply,
      deleteSecret: agentChosenDelete,
      requestBody: "Synthetic derivative request.",
      guestCapsule: null,
    },
  });
  const interactionId = created.body.interactionId as string;
  await assert.rejects(
    instance.call("interaction.read", { key: "12121212121212121212121212121212", params: { interactionId }, secret: agentChosenReply }),
    (error: unknown) => error instanceof SemanticError && error.code === "not_found",
  );
  await assert.rejects(
    instance.call("interaction.delete", { key: "13131313131313131313131313131313", params: { interactionId }, secret: agentChosenDelete }),
    (error: unknown) => error instanceof SemanticError && error.code === "not_found",
  );
  await assert.rejects(
    instance.call("interaction.read", { key: "14141414141414141414141414141414", params: { interactionId }, secret: parentSecret }),
    (error: unknown) => error instanceof SemanticError && error.code === "not_found",
  );
  const read = await instance.call("interaction.read", {
    key: "14141414141414141414141414141414",
    params: { interactionId },
    secret: manualReplySecret,
  });
  assert.equal((read.body.interaction as { state: string }).state, "accepted");
  const deleted = await instance.call("interaction.delete", {
    key: "15151515151515151515151515151515",
    params: { interactionId },
    secret: manualDeleteSecret,
  });
  assert.equal(deleted.status, 200);
});
