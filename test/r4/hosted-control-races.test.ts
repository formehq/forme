import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../apps/room/src/application.ts";
import { OPERATION_INVENTORY, operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type ResponseCandidateV1,
  type RoomEventAckReceiptV1,
  type RoomEventV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedResponseDeliveryBody } from "./hosted-publication-helpers.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  syntheticActor?: string | null;
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
}

function harness() {
  const store = new SyntheticPresenceStore(() => new Date(T0));
  const app = new HostedRoomApplication(store);
  let serial = 10_000;
  const call = async (name: string, options: CallOptions = {}): Promise<OperationResponse> => {
    const definition = operationDefinition(name);
    serial += 1;
    return app.run({
      definition,
      params: options.params ?? {},
      body: syntheticCapabilityRequestBody(options.body ?? {}),
      authorization: options.secret
        ? `Bearer ${syntheticCapabilitySecret(options.secret)}`
        : definition.actor === "room_operator"
          ? `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`
          : null,
      syntheticActor: options.syntheticActor !== undefined
        ? options.syntheticActor
        : definition.actor === "controller" || definition.actor === "curator" || definition.actor === "room_operator"
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
      syntheticClientBucket: "synthetic-control-races-client",
    });
  };
  return { store, app, call };
}

async function semanticError(work: Promise<unknown>, code?: string, status?: number): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    if (code !== undefined) assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

function idFrom(response: OperationResponse): string {
  assert.equal(typeof response.body.interactionId, "string");
  return response.body.interactionId as string;
}

async function pendingInteraction(
  instance: ReturnType<typeof harness>,
  label: string,
  consent: "manual_owner_only" | "allow_owner_local_ai" = "manual_owner_only",
) {
  const encounterSecret = `encounter_${label}_synthetic_secret_0001`;
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
    body: { encounterSecret },
  });
  const replySecret = `reply_${label}_synthetic_secret_0000001`;
  const deleteSecret = `delete_${label}_synthetic_secret_000001`;
  const created = await instance.call("interaction.create", {
    secret: encounterSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent,
      replySecret,
      deleteSecret,
      requestBody: `Synthetic race fixture ${label}.`,
      guestCapsule: null,
    },
  });
  return { interactionId: idFrom(created), replySecret, deleteSecret };
}

function delivery(
  instance: ReturnType<typeof harness>,
  interactionId: string,
  label: string,
): Record<string, unknown> {
  const stored = instance.store.interaction(interactionId);
  assert.ok(stored);
  const projection = instance.store.projection(stored.interaction.projectionId);
  assert.ok(projection);
  const seed = canonicalSha256(label).slice("sha256:".length, "sha256:".length + 32);
  const candidatePreimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: `candidate_${seed}`,
    interactionId,
    sessionEnvelopeId: null,
    roomId: stored.interaction.roomId,
    projectionId: stored.interaction.projectionId,
    originState: projection.lifecycle.ownerState,
    responseText: `Synthetic approved Response ${label}.`,
    sourceDisclosureClass: "manual_owner_authored",
    twinBasisHash: canonicalSha256(`twin:${label}`),
    snapshotManifestHash: null,
    sessionReceiptHash: canonicalSha256(`receipt:${label}`),
    policyHash: canonicalSha256(`policy:${label}`),
    admittedAt: T0,
    expiresAt: "2026-08-04T12:00:00.000Z",
  };
  const candidate: ResponseCandidateV1 = {
    ...candidatePreimage,
    candidateHash: canonicalSha256(candidatePreimage),
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${seed}`,
    artifactClass: "response",
    artifactHash: candidate.candidateHash,
    roomId: candidate.roomId,
    projectionId: candidate.projectionId,
    interactionId,
    basisHash: candidate.twinBasisHash,
    policyHash: candidate.policyHash,
    approvedAt: T0,
    expiresAt: "2026-08-03T13:00:00.000Z",
    operationId: `op_${seed}`,
  };
  return signedResponseDeliveryBody({
    candidate,
    approval,
    parentInteractionExpiresAt: stored.interaction.expiresAt,
  });
}

test("Web/API/operator inventory keeps boundary actions outside room_operator.v1", async () => {
  const operatorNames = OPERATION_INVENTORY
    .filter((definition) => definition.actor === "room_operator")
    .map((definition) => definition.name);
  assert.deepEqual(operatorNames, [
    "room_operator.status",
    "room_operator.sync",
    "room_operator.pull",
    "room_operator.cycle.reserve",
    "room_operator.cycle.recover",
    "room_operator.cycle.abandon",
    "room_operator.dispatch.issue",
    "room_operator.ack",
    "room_operator.projection.deliver",
    "room_operator.response.deliver",
    "room_operator.stale.attest",
    "room_operator.local_purge.receipt",
  ]);
  assert.equal(operatorNames.some((name) => /grant|curation|revoke|retire|delete|close/u.test(name)), false);
  assert.equal(
    OPERATION_INVENTORY.some((definition) => String(definition.name) === "projection.publish"),
    false,
    "hosted Controller cannot author or construct Projection bytes",
  );

  const instance = harness();
  await semanticError(
    instance.call("projection.revoke", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      expectedVersion: 1,
      syntheticActor: "room_operator",
    }),
    "not_found",
    404,
  );
  await semanticError(
    instance.call("room_operator.sync", {
      body: { roomId: PUBLIC_ROOM_ID, afterSequence: 0 },
      syntheticActor: "controller",
    }),
    "not_found",
    404,
  );
});

test("hosted Fresh cycle recovery never reopens a spent cycle and abandon requires exact zero-dispatch proof", async () => {
  const hashes = {
    startAuthorizationHash: canonicalSha256("fresh-start-authorization"),
    sessionEnvelopeHash: canonicalSha256("fresh-session-envelope"),
  };

  const preDispatch = harness();
  const pending = await pendingInteraction(preDispatch, "cycle_zero_dispatch", "allow_owner_local_ai");
  await preDispatch.call("room_operator.pull", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
  });
  const reservedResponse = await preDispatch.call("room_operator.cycle.reserve", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    body: hashes,
  });
  const reserved = reservedResponse.body.reservation as {
    reservationId: string;
    state: string;
    version: number;
  };
  const exactRecovery = { ...hashes, reservationId: reserved.reservationId };
  const recovered = await preDispatch.call("room_operator.cycle.recover", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 3,
    body: exactRecovery,
  });
  assert.deepEqual(recovered.body.reservation, reserved, "pre-dispatch recovery preserves the exact reservation bytes");
  await semanticError(
    preDispatch.call("room_operator.cycle.recover", {
      params: { interactionId: pending.interactionId },
      expectedVersion: 3,
      body: { ...exactRecovery, sessionEnvelopeHash: canonicalSha256("different-envelope") },
    }),
    "cycle_recovery_mismatch",
    409,
  );
  await semanticError(
    preDispatch.call("room_operator.cycle.abandon", {
      params: { interactionId: pending.interactionId },
      expectedVersion: 3,
      body: { ...exactRecovery, transportJournalDispatches: 1 },
    }),
    "zero_dispatch_attestation_required",
    409,
  );
  const released = await preDispatch.call("room_operator.cycle.abandon", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 3,
    body: { ...exactRecovery, transportJournalDispatches: 0 },
  });
  assert.equal((released.body.reservation as { state: string }).state, "released_zero_dispatch");

  const postDispatch = harness();
  const spentPending = await pendingInteraction(postDispatch, "cycle_after_dispatch", "allow_owner_local_ai");
  await postDispatch.call("room_operator.pull", {
    params: { interactionId: spentPending.interactionId },
    expectedVersion: 1,
  });
  const spentReservationResponse = await postDispatch.call("room_operator.cycle.reserve", {
    params: { interactionId: spentPending.interactionId },
    expectedVersion: 2,
    body: hashes,
  });
  const spentReservation = spentReservationResponse.body.reservation as { reservationId: string };
  const dispatchBinding = { ...hashes, reservationId: spentReservation.reservationId };
  await postDispatch.call("room_operator.dispatch.issue", {
    params: { interactionId: spentPending.interactionId },
    expectedVersion: 3,
    body: {
      ...dispatchBinding,
      provider: "OpenAI",
      model: "synthetic-gate-a-model",
      payloadHash: canonicalSha256("provider-payload-one"),
      ordinal: 1,
    },
  });
  const spentRecovery = await postDispatch.call("room_operator.cycle.recover", {
    params: { interactionId: spentPending.interactionId },
    expectedVersion: 3,
    body: dispatchBinding,
  });
  assert.equal((spentRecovery.body.reservation as { state: string }).state, "dispatch_committed");
  await semanticError(
    postDispatch.call("room_operator.cycle.abandon", {
      params: { interactionId: spentPending.interactionId },
      expectedVersion: 3,
      body: { ...dispatchBinding, transportJournalDispatches: 0 },
    }),
    "zero_dispatch_release_denied",
    409,
  );
  await semanticError(
    postDispatch.call("room_operator.dispatch.issue", {
      params: { interactionId: spentPending.interactionId },
      expectedVersion: 3,
      body: {
        ...dispatchBinding,
        provider: "OpenAI",
        model: "synthetic-gate-a-model",
        payloadHash: canonicalSha256("skipped-payload"),
        ordinal: 3,
      },
    }),
    "invalid_dispatch_ordinal",
    409,
  );
  await postDispatch.call("room_operator.dispatch.issue", {
    params: { interactionId: spentPending.interactionId },
    expectedVersion: 3,
    body: {
      ...dispatchBinding,
      provider: "OpenAI",
      model: "synthetic-gate-a-model",
      payloadHash: canonicalSha256("provider-payload-two"),
      ordinal: 2,
    },
  });
});

test("room_operator pull and Fresh reserve commit the visible accepted → seen_locally → preparing lifecycle exactly once", async () => {
  const instance = harness();
  const pending = await pendingInteraction(instance, "stepped_lifecycle", "allow_owner_local_ai");
  const hashes = {
    startAuthorizationHash: canonicalSha256("stepped-start-authorization"),
    sessionEnvelopeHash: canonicalSha256("stepped-session-envelope"),
  };

  await semanticError(instance.call("room_operator.cycle.reserve", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    body: hashes,
  }), "interaction_not_seen_locally", 409);
  assert.equal(instance.store.auxiliary(`cycle:${pending.interactionId}`), null);

  const pullKey = "steppedlifecyclepull000000000001";
  const pulled = await instance.call("room_operator.pull", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: pullKey,
  });
  assert.equal((pulled.body.interaction as { state: string }).state, "seen_locally");
  assert.equal((pulled.body.interaction as { stateVersion: number }).stateVersion, 2);
  assert.deepEqual(await instance.call("room_operator.pull", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 1,
    idempotencyKey: pullKey,
  }), pulled, "lost-response retry rehydrates the same protected state without a second transition");

  const reserveKey = "steppedlifecyclereserve000000001";
  const reserved = await instance.call("room_operator.cycle.reserve", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: reserveKey,
    body: hashes,
  });
  assert.equal(instance.store.interaction(pending.interactionId)?.interaction.state, "preparing");
  assert.equal(instance.store.interaction(pending.interactionId)?.interaction.stateVersion, 3);
  assert.deepEqual(await instance.call("room_operator.cycle.reserve", {
    params: { interactionId: pending.interactionId },
    expectedVersion: 2,
    idempotencyKey: reserveKey,
    body: hashes,
  }), reserved);

  const lifecycleEvents = instance.store.eventsAfter(PUBLIC_ROOM_ID, 0)
    .filter((event) => event.objectId === pending.interactionId)
    .map((event) => [event.eventType, event.objectVersion]);
  assert.deepEqual(lifecycleEvents, [
    ["interaction.accepted", 1],
    ["interaction.seen_locally", 2],
    ["interaction.preparing", 3],
  ]);
});

test("mutations require exact version and canonical idempotency replay conflicts on changed bytes", async () => {
  const instance = harness();
  const key = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const options: CallOptions = {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: "idempotent_encounter_secret_0001" },
    expectedVersion: 1,
    idempotencyKey: key,
  };
  const first = await instance.call("public_encounter.issue", options);
  const replay = await instance.call("public_encounter.issue", options);
  assert.deepEqual(replay, first);

  await semanticError(
    instance.call("public_encounter.issue", {
      ...options,
      body: { encounterSecret: "different_encounter_secret_0001" },
    }),
    "idempotency_conflict",
    409,
  );
  await semanticError(
    instance.call("curation.unlist", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      expectedVersion: null,
    }),
    "expected_version_required",
    400,
  );

  const unlisted = await instance.call("curation.unlist", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  });
  assert.equal((unlisted.body.lifecycle as { curationState: string; version: number }).curationState, "unlisted");
  await semanticError(
    instance.call("curation.admit", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      expectedVersion: 2,
    }),
    "successor_required",
    409,
  );
  await semanticError(
    instance.call("curation.unlist", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      expectedVersion: 1,
    }),
    "version_conflict",
    409,
  );
});

test("operator sync and ACK use the direct canonical event DTOs and bind the exact event hash", async () => {
  const instance = harness();
  await pendingInteraction(instance, "canonical_event_contract");
  const sync = await instance.call("room_operator.sync", {
    body: { roomId: PUBLIC_ROOM_ID, afterSequence: 0 },
  });
  assert.equal(sync.body.schemaVersion, "room_event_batch.v1");
  assert.equal("batch" in sync.body, false);
  assert.equal("receipt" in sync.body, false);
  const events = sync.body.events as RoomEventV1[];
  assert.ok(events.length >= 1);
  const event = events[0];
  assert.ok(event);

  const idempotencyKey = "canonicaleventack00000000000000001";
  const ack = {
    schemaVersion: "room_event_ack.v1",
    roomId: event.roomId,
    eventId: event.eventId,
    sequence: event.sequence,
    eventHash: canonicalSha256(event),
    idempotencyKey,
  };
  const acknowledged = await instance.call("room_operator.ack", {
    body: ack,
    idempotencyKey,
  });
  assert.equal(acknowledged.body.schemaVersion, "room_event_ack_receipt.v1");
  assert.equal("ackReceipt" in acknowledged.body, false);
  assert.equal("receipt" in acknowledged.body, false);
  assert.deepEqual(
    {
      roomId: (acknowledged.body as unknown as RoomEventAckReceiptV1).roomId,
      eventId: (acknowledged.body as unknown as RoomEventAckReceiptV1).eventId,
      sequence: (acknowledged.body as unknown as RoomEventAckReceiptV1).sequence,
      eventHash: (acknowledged.body as unknown as RoomEventAckReceiptV1).eventHash,
      idempotencyKey: (acknowledged.body as unknown as RoomEventAckReceiptV1).idempotencyKey,
    },
    {
      roomId: ack.roomId,
      eventId: ack.eventId,
      sequence: ack.sequence,
      eventHash: ack.eventHash,
      idempotencyKey,
    },
  );
  assert.deepEqual(
    await instance.call("room_operator.ack", { body: ack, idempotencyKey }),
    acknowledged,
    "same ACK bytes and idempotency key replay the exact receipt",
  );

  const wrongKey = "canonicaleventwrong000000000000001";
  await semanticError(
    instance.call("room_operator.ack", {
      idempotencyKey: wrongKey,
      body: {
        ...ack,
        eventHash: canonicalSha256("wrong-event"),
        idempotencyKey: wrongKey,
      },
    }),
    "ack_mismatch",
    409,
  );
});

test("close versus publish has exactly one winner and never refunds accepted quota", async () => {
  const closeFirst = harness();
  const firstPending = await pendingInteraction(closeFirst, "close_first");
  const closeFirstDelivery = delivery(closeFirst, firstPending.interactionId, "closefirst");
  await closeFirst.call("interaction.close", {
    params: { interactionId: firstPending.interactionId },
    expectedVersion: 1,
  });
  await semanticError(
    closeFirst.call("room_operator.response.deliver", {
      expectedVersion: 2,
      body: closeFirstDelivery,
    }),
    "interaction_not_eligible",
    410,
  );
  assert.equal(closeFirst.store.interaction(firstPending.interactionId)?.response, null);

  const publishFirst = harness();
  const secondPending = await pendingInteraction(publishFirst, "publish_first");
  await publishFirst.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: delivery(publishFirst, secondPending.interactionId, "publishfirst"),
  });
  await semanticError(
    publishFirst.call("interaction.close", {
      params: { interactionId: secondPending.interactionId },
      expectedVersion: 2,
    }),
    "terminal_interaction",
    409,
  );
  assert.equal(publishFirst.store.interaction(secondPending.interactionId)?.interaction.state, "response_ready");
  assert.equal(publishFirst.store.interaction(secondPending.interactionId)?.response?.state, "available");
});

test("Interaction delete versus publish has one winner; delete makes all hosted bodies unreadable", async () => {
  const deleteFirst = harness();
  const firstPending = await pendingInteraction(deleteFirst, "delete_first");
  const deleteFirstDelivery = delivery(deleteFirst, firstPending.interactionId, "deletefirst");
  await deleteFirst.call("interaction.delete", {
    params: { interactionId: firstPending.interactionId },
    secret: firstPending.deleteSecret,
    expectedVersion: 1,
  });
  await semanticError(
    deleteFirst.call("room_operator.response.deliver", {
      expectedVersion: 2,
      body: deleteFirstDelivery,
    }),
    "interaction_not_eligible",
    410,
  );
  const deleted = deleteFirst.store.interaction(firstPending.interactionId);
  assert.equal(deleted?.interaction.requestText, "[purged]");
  assert.equal(deleted?.response, null);

  const publishFirst = harness();
  const secondPending = await pendingInteraction(publishFirst, "delete_after_publish");
  await publishFirst.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: delivery(publishFirst, secondPending.interactionId, "beforedelete"),
  });
  await publishFirst.call("interaction.delete", {
    params: { interactionId: secondPending.interactionId },
    secret: secondPending.deleteSecret,
    expectedVersion: 2,
  });
  assert.equal(publishFirst.store.interaction(secondPending.interactionId)?.response, null);
  await semanticError(
    publishFirst.call("interaction.read", {
      params: { interactionId: secondPending.interactionId },
      secret: secondPending.replySecret,
    }),
    "not_found",
    404,
  );
});

test("Projection revoke versus publish has one winner and hides linked Response", async () => {
  const revokeFirst = harness();
  const firstPending = await pendingInteraction(revokeFirst, "revoke_first");
  const revokeFirstDelivery = delivery(revokeFirst, firstPending.interactionId, "revokefirst");
  await revokeFirst.call("projection.revoke", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  });
  await semanticError(
    revokeFirst.call("room_operator.response.deliver", {
      expectedVersion: 2,
      body: revokeFirstDelivery,
    }),
  );
  assert.equal(revokeFirst.store.interaction(firstPending.interactionId)?.response, null);
  assert.equal(revokeFirst.store.interaction(firstPending.interactionId)?.interaction.state, "origin_revoked");

  const publishFirst = harness();
  const secondPending = await pendingInteraction(publishFirst, "publish_before_revoke");
  await publishFirst.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: delivery(publishFirst, secondPending.interactionId, "beforerevoke"),
  });
  await publishFirst.call("projection.revoke", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  });
  const terminal = publishFirst.store.interaction(secondPending.interactionId);
  assert.equal(terminal?.interaction.state, "origin_revoked");
  assert.equal(terminal?.response?.state, "origin_revoked");
  assert.equal(terminal?.response?.body, "[purged]", "terminal cascade replaces hosted Response bytes with a tombstone marker");
  await semanticError(
    publishFirst.call("interaction.read", {
      params: { interactionId: secondPending.interactionId },
      secret: secondPending.replySecret,
    }),
    "not_found",
    404,
  );
});

test("Room retirement versus publish has one winner and terminal cascade dominates later delivery", async () => {
  const retireFirst = harness();
  const firstPending = await pendingInteraction(retireFirst, "retire_first");
  const retireFirstDelivery = delivery(retireFirst, firstPending.interactionId, "retirefirst");
  await retireFirst.call("room.retire", {
    params: { roomId: PUBLIC_ROOM_ID },
    expectedVersion: 1,
  });
  await semanticError(
    retireFirst.call("room_operator.response.deliver", {
      expectedVersion: 2,
      body: retireFirstDelivery,
    }),
  );
  assert.equal(retireFirst.store.interaction(firstPending.interactionId)?.interaction.state, "room_retired");
  assert.equal(retireFirst.store.interaction(firstPending.interactionId)?.response, null);

  const publishFirst = harness();
  const secondPending = await pendingInteraction(publishFirst, "publish_before_retire");
  await publishFirst.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: delivery(publishFirst, secondPending.interactionId, "beforeretire"),
  });
  await publishFirst.call("room.retire", {
    params: { roomId: PUBLIC_ROOM_ID },
    expectedVersion: 1,
  });
  const terminal = publishFirst.store.interaction(secondPending.interactionId);
  assert.equal(terminal?.interaction.state, "room_retired");
  assert.equal(terminal?.response?.state, "room_retired");
  assert.equal(terminal?.response?.body, "[purged]");
});
