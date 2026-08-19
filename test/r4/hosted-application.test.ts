import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";
import { signedResponseDeliveryBody } from "./hosted-publication-helpers.ts";
import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type GrantPresetId,
  type GrantV1,
  type InteractionV1,
  type ResponseCandidateV1,
} from "../../packages/r4-protocol/src/index.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const PRIVATE_ROOM_ID = "room_formeprivate0000000000000000000";
const PRIVATE_PROJECTION_ID = "proj_formeprivate0000000000000000000";

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  syntheticActor?: string | null;
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
}

interface TestHarness {
  app: HostedRoomApplication;
  store: SyntheticPresenceStore;
  call: (name: string, options?: CallOptions) => Promise<OperationResponse>;
}

function createHarness(): TestHarness {
  const store = new SyntheticPresenceStore(() => new Date(T0));
  const app = new HostedRoomApplication(store);
  let serial = 0;
  const call = async (name: string, options: CallOptions = {}): Promise<OperationResponse> => {
    const definition = operationDefinition(name);
    serial += 1;
    const syntheticActor = options.syntheticActor !== undefined
      ? options.syntheticActor
      : definition.actor === "controller" || definition.actor === "curator" || definition.actor === "room_operator"
        ? definition.actor
        : null;
    const idempotencyKey = options.idempotencyKey !== undefined
      ? options.idempotencyKey
      : definition.mutating
        ? serial.toString(16).padStart(32, "0")
        : null;
    const expectedVersion = options.expectedVersion !== undefined
      ? options.expectedVersion
      : definition.expectedVersion
        ? 1
        : null;
    return app.run({
      definition,
      params: options.params ?? {},
      body: syntheticCapabilityRequestBody(options.body ?? {}),
      authorization: options.secret
        ? `Bearer ${syntheticCapabilitySecret(options.secret)}`
        : definition.actor === "room_operator"
          ? `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`
          : null,
      syntheticActor,
      idempotencyKey,
      expectedVersion,
      syntheticClientBucket: "synthetic-hosted-application-client",
    });
  };
  return { app, store, call };
}

async function expectSemanticError(
  work: Promise<unknown>,
  code: string,
  status?: number,
): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

function grantFrom(response: OperationResponse): GrantV1 {
  return response.body.grant as GrantV1;
}

function interactionIdFrom(response: OperationResponse): string {
  assert.equal(typeof response.body.interactionId, "string");
  return response.body.interactionId as string;
}

async function issueGrant(
  harness: TestHarness,
  presetId: GrantPresetId,
  secret: string,
  options: { roomId?: string; projectionId?: string; permitsAgentDerivative?: boolean; chain?: string } = {},
): Promise<GrantV1> {
  const response = await harness.call("grant.issue", {
    body: {
      roomId: options.roomId ?? PUBLIC_ROOM_ID,
      projectionId: options.projectionId ?? PUBLIC_PROJECTION_ID,
      presetId,
      grantSecret: secret,
      permitsAgentDerivative: options.permitsAgentDerivative ?? false,
      reentryChainId: options.chain ?? `chain_${presetId}0000000000000000`,
    },
  });
  assert.equal(response.status, 201);
  return grantFrom(response);
}

function interactionBody(
  projectionId: string,
  label: string,
  consent: "allow_owner_local_ai" | "manual_owner_only" = "manual_owner_only",
): Record<string, unknown> {
  return {
    projectionId,
    interactionType: "ask",
    consent,
    replySecret: `reply_${label}_synthetic_secret_0001`,
    deleteSecret: `delete_${label}_synthetic_secret_0001`,
    requestBody: `Synthetic question ${label}; no real Guest data.`,
    guestCapsule: null,
  };
}

test("J1 public Manual Guest configures a fake notice and polls one Owner-reviewed Response", async () => {
  const harness = createHarness();
  const thirdPlace = await harness.call("third_place.list");
  assert.equal(thirdPlace.status, 200);
  const residents = thirdPlace.body.residents as Array<{ view: { projection: { projectionId: string } } }>;
  assert.deepEqual(residents.map((resident) => resident.view.projection.projectionId), [PUBLIC_PROJECTION_ID]);

  const projection = await harness.call("projection.read", { params: { projectionId: PUBLIC_PROJECTION_ID } });
  assert.equal(projection.status, 200);
  assert.equal((projection.body.view as { projection: { projectionId: string } }).projection.projectionId, PUBLIC_PROJECTION_ID);

  const encounterSecret = "manual_public_encounter_secret_0001";
  const encounterResult = await harness.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret },
    expectedVersion: 1,
  });
  assert.equal(encounterResult.status, 201);

  const request = interactionBody(PUBLIC_PROJECTION_ID, "j1", "allow_owner_local_ai");
  const created = await harness.call("interaction.create", {
    secret: encounterSecret,
    body: request,
  });
  const interactionId = interactionIdFrom(created);
  assert.equal(created.body.state, "accepted");
  assert.equal("requestText" in created.body, false, "create receipt stays body-free");

  const replySecret = request.replySecret as string;
  const pending = await harness.call("interaction.read", { params: { interactionId }, secret: replySecret });
  const pendingInteraction = pending.body.interaction as Record<string, unknown>;
  assert.equal(pendingInteraction.state, "accepted");
  assert.equal(pendingInteraction.response, null);
  assert.equal("requestText" in pendingInteraction, false, "Guest polling never echoes the request");

  const notification = await harness.call("notification.set", {
    params: { interactionId },
    secret: replySecret,
    expectedVersion: 1,
    body: { email: "guest-j1@example.invalid" },
  });
  assert.equal(notification.status, 202);
  assert.deepEqual(notification.body.syntheticVerification, {
    challengeId: (notification.body.syntheticVerification as { challengeId: string }).challengeId,
    code: "000000",
    externalEmailSent: false,
  });
  assert.equal((notification.body.endpoint as { state: string }).state, "verification_pending");

  const verified = await harness.call("notification.verify", {
    params: { interactionId },
    secret: replySecret,
    expectedVersion: 2,
    body: { code: "000000" },
  });
  assert.equal((verified.body.endpoint as { state: string }).state, "confirmed");

  const candidatePreimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: "candidate_j1synthetic000000000000",
    interactionId,
    sessionEnvelopeId: null,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    originState: "published_fresh",
    responseText: "Synthetic Owner-reviewed answer for the J1 walkthrough.",
    sourceDisclosureClass: "manual_owner_authored",
    twinBasisHash: `sha256:${"2".repeat(64)}`,
    snapshotManifestHash: null,
    sessionReceiptHash: `sha256:${"3".repeat(64)}`,
    policyHash: `sha256:${"4".repeat(64)}`,
    admittedAt: T0,
    expiresAt: "2026-08-04T12:00:00.000Z",
  };
  const candidate: ResponseCandidateV1 = {
    ...candidatePreimage,
    candidateHash: canonicalSha256(candidatePreimage),
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: "approval_j1synthetic000000000000",
    artifactClass: "response",
    artifactHash: candidate.candidateHash,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    interactionId,
    basisHash: candidate.twinBasisHash,
    policyHash: candidate.policyHash,
    approvedAt: T0,
    expiresAt: "2026-08-03T13:00:00.000Z",
    operationId: "op_j1synthetic0000000000000000",
  };
  const delivered = await harness.call("room_operator.response.deliver", {
    params: {},
    expectedVersion: 1,
    body: signedResponseDeliveryBody({
      candidate,
      approval,
      parentInteractionExpiresAt: "2026-09-02T12:00:00.000Z",
    }),
  });
  assert.equal(delivered.status, 201);
  assert.equal(delivered.body.interactionVersion, 2);
  assert.deepEqual(delivered.body.syntheticNotice, {
    schemaVersion: "synthetic_notice.v1",
    state: "ready_pending",
    bodyFree: true,
    externalEmailSent: false,
  });

  const ready = await harness.call("interaction.read", { params: { interactionId }, secret: replySecret });
  const readyInteraction = ready.body.interaction as Record<string, unknown>;
  assert.equal(readyInteraction.state, "response_ready");
  assert.equal((readyInteraction.response as { body: string }).body, "Synthetic Owner-reviewed answer for the J1 walkthrough.");
});

test("J3 Agent derivative is exact, one-use, non-delegable, and has no reply/delete/cross-Room authority", async () => {
  const harness = createHarness();
  const grantSecret = "manual_familiar_grant_secret_0001";
  const grant = await issueGrant(harness, "familiar_collaborator", grantSecret, { permitsAgentDerivative: true });
  const agentSecret = "guest_agent_derivative_secret_0001";
  const manualReplySecret = "manual_j3_reply_secret_000000001";
  const manualDeleteSecret = "manual_j3_delete_secret_00000001";
  const minted = await harness.call("agent_derivative.mint", {
    secret: grantSecret,
    body: { agentSecret, replySecret: manualReplySecret, deleteSecret: manualDeleteSecret },
  });
  assert.equal(minted.status, 201);
  const derivative = minted.body.derivative as { derivativeId: string; roomId: string; projectionId: string; state: string };
  assert.deepEqual(
    { roomId: derivative.roomId, projectionId: derivative.projectionId, state: derivative.state },
    { roomId: PUBLIC_ROOM_ID, projectionId: PUBLIC_PROJECTION_ID, state: "issued" },
  );

  const agentRead = await harness.call("projection.read", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    secret: agentSecret,
  });
  assert.equal(agentRead.status, 200);

  const request = interactionBody(PUBLIC_PROJECTION_ID, "j3");
  const created = await harness.call("interaction.create", { secret: agentSecret, body: request });
  const interactionId = interactionIdFrom(created);
  assert.equal(harness.store.capability(derivative.derivativeId)?.value.state, "consumed");
  assert.equal((harness.store.capability(grant.grantId)?.value as GrantV1).acceptedCount, 1, "derivative consumes parent quota");

  await expectSemanticError(
    harness.call("interaction.read", { params: { interactionId }, secret: agentSecret }),
    "not_found",
    404,
  );
  await expectSemanticError(
    harness.call("interaction.delete", { params: { interactionId }, secret: agentSecret, expectedVersion: 1 }),
    "not_found",
    404,
  );
  await expectSemanticError(
    harness.call("agent_derivative.mint", {
      secret: agentSecret,
      body: {
        agentSecret: "nested_agent_secret_000000001",
        replySecret: "nested_manual_reply_secret_00000001",
        deleteSecret: "nested_manual_delete_secret_0000001",
      },
    }),
    "not_found",
    404,
  );
  await expectSemanticError(
    harness.call("interaction.create", {
      secret: agentSecret,
      body: interactionBody(PRIVATE_PROJECTION_ID, "j3_cross_room"),
    }),
    "not_found",
    404,
  );
  await expectSemanticError(
    harness.call("interaction.create", {
      secret: agentSecret,
      body: interactionBody(PUBLIC_PROJECTION_ID, "j3_reuse"),
    }),
    "derivative_consumed",
    409,
  );
});

test("J4 four presets keep exact fixed expiry/quota and trusted rejects use 11 without widening Private access", async () => {
  const harness = createHarness();
  const expected: Record<GrantPresetId, { ttlDays: number; quota: number }> = {
    one_visit: { ttlDays: 1, quota: 1 },
    short_exchange: { ttlDays: 3, quota: 2 },
    familiar_collaborator: { ttlDays: 7, quota: 3 },
    trusted_collaborator: { ttlDays: 7, quota: 10 },
  };
  const grants = new Map<GrantPresetId, GrantV1>();
  for (const [presetId, contract] of Object.entries(expected) as Array<[GrantPresetId, { ttlDays: number; quota: number }]>) {
    const grant = await issueGrant(harness, presetId, `grant_${presetId}_secret_000001`, {
      permitsAgentDerivative: presetId === "trusted_collaborator",
    });
    grants.set(presetId, grant);
    assert.equal(grant.acceptedQuota, contract.quota);
    assert.equal(Date.parse(grant.expiresAt) - Date.parse(grant.issuedAt), contract.ttlDays * 24 * 60 * 60 * 1_000);
  }

  const trusted = grants.get("trusted_collaborator");
  assert.ok(trusted);
  const trustedSecret = "grant_trusted_collaborator_secret_000001";
  await expectSemanticError(
    harness.call("projection.read", { params: { projectionId: PRIVATE_PROJECTION_ID }, secret: trustedSecret }),
    "not_found",
    404,
  );

  const firstBody = interactionBody(PUBLIC_PROJECTION_ID, "j4_1");
  const replayKey = "11111111111111111111111111111111";
  const first = await harness.call("interaction.create", { secret: trustedSecret, body: firstBody, idempotencyKey: replayKey });
  const firstReplay = await harness.call("interaction.create", { secret: trustedSecret, body: firstBody, idempotencyKey: replayKey });
  assert.deepEqual(firstReplay, first, "same-key/same-bytes retry returns the exact prior result");
  assert.equal((harness.store.capability(trusted.grantId)?.value as GrantV1).acceptedCount, 1, "idempotent retry is quota-free");

  const agentSecret = "trusted_shared_derivative_secret_0001";
  await harness.call("agent_derivative.mint", {
    secret: trustedSecret,
    body: {
      agentSecret,
      replySecret: "trusted_manual_reply_secret_00000001",
      deleteSecret: "trusted_manual_delete_secret_0000001",
    },
  });
  await expectSemanticError(
    harness.call("interaction.create", { secret: agentSecret, body: interactionBody(PUBLIC_PROJECTION_ID, "j4_blocked") }),
    "unresolved_interaction_exists",
    409,
  );

  await harness.call("interaction.close", {
    params: { interactionId: interactionIdFrom(first) },
    expectedVersion: 1,
  });
  const agentAccepted = await harness.call("interaction.create", {
    secret: agentSecret,
    body: interactionBody(PUBLIC_PROJECTION_ID, "j4_2_agent"),
  });
  await harness.call("interaction.close", {
    params: { interactionId: interactionIdFrom(agentAccepted) },
    expectedVersion: 1,
  });

  for (let count = 3; count <= 10; count += 1) {
    const accepted = await harness.call("interaction.create", {
      secret: trustedSecret,
      body: interactionBody(PUBLIC_PROJECTION_ID, `j4_${count}`),
    });
    await harness.call("interaction.close", {
      params: { interactionId: interactionIdFrom(accepted) },
      expectedVersion: 1,
    });
  }

  const exhausted = harness.store.capability(trusted.grantId);
  assert.equal((exhausted?.value as GrantV1).acceptedCount, 10);
  assert.equal(exhausted?.value.state, "consumed");
  assert.equal((exhausted?.value as GrantV1).expiresAt, trusted.expiresAt, "use never extends fixed expiry");
  await expectSemanticError(
    harness.call("interaction.create", {
      secret: trustedSecret,
      body: interactionBody(PUBLIC_PROJECTION_ID, "j4_11_rejected"),
    }),
    "grant_quota_exhausted",
    409,
  );
});

test("J5 Private Room returns no body without its exact Room + Projection Grant", async () => {
  const harness = createHarness();
  await expectSemanticError(
    harness.call("projection.read", { params: { projectionId: PRIVATE_PROJECTION_ID } }),
    "not_found",
    404,
  );

  const publicTrustedSecret = "public_trusted_not_private_secret_0001";
  await issueGrant(harness, "trusted_collaborator", publicTrustedSecret);
  await expectSemanticError(
    harness.call("projection.read", { params: { projectionId: PRIVATE_PROJECTION_ID }, secret: publicTrustedSecret }),
    "not_found",
    404,
  );

  const privateSecret = "exact_private_room_grant_secret_0001";
  const privateGrant = await issueGrant(harness, "short_exchange", privateSecret, {
    roomId: PRIVATE_ROOM_ID,
    projectionId: PRIVATE_PROJECTION_ID,
    chain: "chain_privateexact000000000000",
  });
  assert.equal(privateGrant.roomId, PRIVATE_ROOM_ID);
  assert.equal(privateGrant.projectionId, PRIVATE_PROJECTION_ID);

  const readable = await harness.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: privateSecret,
  });
  assert.equal(readable.status, 200);
  assert.equal((readable.body.view as { projection: { projectionId: string } }).projection.projectionId, PRIVATE_PROJECTION_ID);

  const accepted = await harness.call("interaction.create", {
    secret: privateSecret,
    body: interactionBody(PRIVATE_PROJECTION_ID, "j5_private"),
  });
  const stored = harness.store.interaction(interactionIdFrom(accepted));
  assert.equal((stored?.interaction as InteractionV1).roomId, PRIVATE_ROOM_ID);

  await expectSemanticError(
    harness.call("interaction.create", {
      secret: privateSecret,
      body: interactionBody(PUBLIC_PROJECTION_ID, "j5_cross_room"),
    }),
    "not_found",
    404,
  );
});

test("SyntheticPresenceStore optionally seeds both fixed synthetic Rooms with one exact supplied Entity", () => {
  const seedEntityId = "entity_roomhandoff000000000000000001";
  const store = new SyntheticPresenceStore(
    () => new Date(T0),
    { seedEntityId },
  );
  assert.equal(store.room(PUBLIC_ROOM_ID)?.room.entityId, seedEntityId);
  assert.equal(store.room(PRIVATE_ROOM_ID)?.room.entityId, seedEntityId);
  assert.equal(store.projection(PUBLIC_PROJECTION_ID)?.projection.entityId, seedEntityId);
  assert.equal(store.projection(PRIVATE_PROJECTION_ID)?.projection.entityId, seedEntityId);

  const defaultStore = new SyntheticPresenceStore(() => new Date(T0));
  assert.equal(defaultStore.room(PUBLIC_ROOM_ID)?.room.entityId, "entity_forme000000000000000000000000");
});
