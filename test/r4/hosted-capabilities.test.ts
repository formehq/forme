import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type GrantV1,
  type GuestCapsuleV1,
  type InteractionV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedProjectionDeliveryBody } from "./hosted-publication-helpers.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const T1H = "2026-08-03T13:00:00.000Z";
const T1D = "2026-08-04T12:00:00.000Z";
const T3D = "2026-08-06T12:00:00.000Z";
const T7D = "2026-08-10T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const ENTITY_ID = "entity_forme000000000000000000000000";

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  expectedVersion?: number | null;
  idempotencyKey?: string;
  clientBucket?: string;
}

function createHarness() {
  let nowMs = Date.parse(T0);
  const store = new SyntheticPresenceStore(() => new Date(nowMs));
  const app = new HostedRoomApplication(store);
  let serial = 20_000;
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
      syntheticActor: definition.actor === "controller" || definition.actor === "curator" || definition.actor === "room_operator"
        ? definition.actor
        : null,
      idempotencyKey: definition.mutating
        ? options.idempotencyKey ?? serial.toString(16).padStart(32, "0")
        : null,
      expectedVersion: options.expectedVersion !== undefined
        ? options.expectedVersion
        : definition.expectedVersion
          ? 1
          : null,
      syntheticClientBucket: options.clientBucket ?? "synthetic-capability-client",
    });
  };
  return {
    store,
    call,
    advance(milliseconds: number): void {
      nowMs += milliseconds;
    },
  };
}

async function expectSemanticError(work: Promise<unknown>, code: string, status?: number): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

function requestBody(label: string, guestCapsule: GuestCapsuleV1 | null = null): Record<string, unknown> {
  return {
    projectionId: PUBLIC_PROJECTION_ID,
    interactionType: "ask",
    consent: "allow_owner_local_ai",
    replySecret: `reply_${label}_synthetic_secret_0001`,
    deleteSecret: `delete_${label}_synthetic_secret_0001`,
    requestBody: `Synthetic request ${label}; no real Guest material.`,
    guestCapsule,
  };
}

function interactionId(response: OperationResponse): string {
  assert.equal(typeof response.body.interactionId, "string");
  return response.body.interactionId as string;
}

async function issueEncounter(instance: ReturnType<typeof createHarness>, label: string): Promise<string> {
  const secret = `encounter_${label}_synthetic_secret_0001`;
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
    body: { encounterSecret: secret },
    clientBucket: `synthetic-${label}`,
  });
  return secret;
}

async function issueGrant(
  instance: ReturnType<typeof createHarness>,
  secret: string,
  chain = "chain_replacementtest000000000000",
): Promise<GrantV1> {
  const result = await instance.call("grant.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret: secret,
      permitsAgentDerivative: false,
      reentryChainId: chain,
    },
  });
  return result.body.grant as GrantV1;
}

test("canonical G0/G1/G2 GuestCapsules are admitted only as exact consented objects", async () => {
  const instance = createHarness();
  const capsule: GuestCapsuleV1 = {
    schemaVersion: "guest_capsule.v1",
    level: "g2_agent_projection",
    pseudonym: "Synthetic Agent Guest",
    currentFocus: "Test the bounded interaction contract",
    offer: "A synthetic observation",
    seek: "One Owner-reviewed Response",
    openQuestion: "What should happen next?",
    declaredSourceClass: "synthetic_notes_projection",
    scopeLabel: "gate_a_synthetic_only",
    freshnessAt: T0,
    guestSchemaVersion: "synthetic_guest.v1",
    consentStatement: "Synthetic capsule may be used only for this exact interaction.",
  };
  const secret = await issueEncounter(instance, "capsule_valid");
  const created = await instance.call("interaction.create", {
    secret,
    body: requestBody("capsule_valid", capsule),
  });
  const stored = instance.store.interaction(interactionId(created));
  assert.deepEqual(stored?.interaction.guestCapsule, capsule);
  assert.equal(stored?.interaction.consentEnvelope?.guestCapsuleAllowed, true);
  assert.equal("guestCapsule" in created.body, false, "public receipt does not echo capsule bytes");

  const lowerLevels: GuestCapsuleV1[] = [
    {
      schemaVersion: "guest_capsule.v1",
      level: "g0_manual",
      pseudonym: null,
      currentFocus: null,
      offer: null,
      seek: null,
      openQuestion: null,
      declaredSourceClass: null,
      scopeLabel: null,
      freshnessAt: null,
      guestSchemaVersion: null,
      consentStatement: null,
    },
    {
      schemaVersion: "guest_capsule.v1",
      level: "g1_lightweight",
      pseudonym: "Synthetic Manual Guest",
      currentFocus: "A lightweight bounded exchange",
      offer: null,
      seek: "One response",
      openQuestion: "Is this useful?",
      declaredSourceClass: null,
      scopeLabel: null,
      freshnessAt: null,
      guestSchemaVersion: null,
      consentStatement: null,
    },
  ];
  for (const lower of lowerLevels) {
    const lowerSecret = await issueEncounter(instance, `capsule_${lower.level}`);
    const lowerCreated = await instance.call("interaction.create", {
      secret: lowerSecret,
      body: requestBody(`capsule_${lower.level}`, lower),
    });
    assert.deepEqual(instance.store.interaction(interactionId(lowerCreated))?.interaction.guestCapsule, lower);
  }

  const invalidSecret = await issueEncounter(instance, "capsule_invalid");
  await expectSemanticError(
    instance.call("interaction.create", {
      secret: invalidSecret,
      body: requestBody("capsule_invalid", { ...capsule, level: "g0_manual" }),
    }),
    "invalid_guestCapsule",
    400,
  );
});

test("Grant replacement is explicit, resets quota/expiry, preserves exact chain/scope, and rejects unresolved replacement", async () => {
  const instance = createHarness();
  const oldSecret = "grant_old_replacement_secret_0001";
  const oldGrant = await issueGrant(instance, oldSecret);
  const first = await instance.call("interaction.create", {
    secret: oldSecret,
    body: requestBody("replacement_first"),
  });
  await instance.call("interaction.close", {
    params: { interactionId: interactionId(first) },
    expectedVersion: 1,
  });

  const newSecret = "grant_new_replacement_secret_0001";
  const replaced = await instance.call("grant.replace", {
    params: { grantId: oldGrant.grantId },
    expectedVersion: 1,
    body: {
      grantSecret: newSecret,
      presetId: "trusted_collaborator",
      permitsAgentDerivative: true,
    },
  });
  const next = replaced.body.grant as GrantV1;
  assert.equal(instance.store.capability(oldGrant.grantId)?.value.state, "replaced");
  assert.deepEqual(
    {
      roomId: next.roomId,
      projectionId: next.projectionId,
      chain: next.reentryChainId,
      replacedGrantId: next.replacedGrantId,
      acceptedCount: next.acceptedCount,
      quota: next.acceptedQuota,
      expiresAt: next.expiresAt,
      derivation: next.agentDerivationAllowed,
    },
    {
      roomId: oldGrant.roomId,
      projectionId: oldGrant.projectionId,
      chain: oldGrant.reentryChainId,
      replacedGrantId: oldGrant.grantId,
      acceptedCount: 0,
      quota: 10,
      expiresAt: T7D,
      derivation: true,
    },
  );
  await expectSemanticError(
    instance.call("interaction.create", { secret: oldSecret, body: requestBody("replacement_old_reuse") }),
    "grant_replaced",
    409,
  );
  await expectSemanticError(
    issueGrant(instance, "grant_illegal_same_chain_secret_001", oldGrant.reentryChainId),
    "grant_replacement_required",
    409,
  );

  const unresolved = await instance.call("interaction.create", {
    secret: newSecret,
    body: requestBody("replacement_unresolved"),
  });
  await expectSemanticError(
    instance.call("grant.replace", {
      params: { grantId: next.grantId },
      expectedVersion: 1,
      body: { grantSecret: "grant_blocked_replacement_secret_001" },
    }),
    "unresolved_interaction_exists",
    409,
  );
  assert.equal(instance.store.interaction(interactionId(unresolved))?.interaction.state, "accepted");
});

test("public Room rolling pool rejects accepted use 21 while Grant continuations remain outside that pool", async () => {
  const instance = createHarness();
  for (let index = 1; index <= 20; index += 1) {
    const secret = await issueEncounter(instance, `pool_${index}`);
    const accepted = await instance.call("interaction.create", {
      secret,
      body: requestBody(`pool_${index}`),
    });
    await instance.call("interaction.close", {
      params: { interactionId: interactionId(accepted) },
      expectedVersion: 1,
    });
  }
  assert.equal(instance.store.publicAcceptedCountSince(PUBLIC_ROOM_ID, "2026-08-02T12:00:00.000Z"), 20);

  const twentyFirstSecret = await issueEncounter(instance, "pool_21");
  await expectSemanticError(
    instance.call("interaction.create", {
      secret: twentyFirstSecret,
      body: requestBody("pool_21"),
    }),
    "public_room_pool_exhausted",
    429,
  );

  const grantSecret = "grant_pool_exclusion_secret_0001";
  await issueGrant(instance, grantSecret, "chain_poolgrantoutside0000000000");
  const grantAccepted = await instance.call("interaction.create", {
    secret: grantSecret,
    body: requestBody("pool_grant_excluded"),
  });
  assert.equal(grantAccepted.status, 201, "Grant-backed continuation is not charged to the public encounter pool");
});

test("Agent derivative minted from a public encounter consumes the same rolling public pool", async () => {
  const instance = createHarness();
  for (let index = 1; index <= 19; index += 1) {
    const secret = await issueEncounter(instance, `derivative_pool_${index}`);
    const accepted = await instance.call("interaction.create", {
      secret,
      body: requestBody(`derivative_pool_${index}`),
    });
    await instance.call("interaction.close", {
      params: { interactionId: interactionId(accepted) },
      expectedVersion: 1,
    });
  }

  const parentSecret = await issueEncounter(instance, "derivative_pool_20");
  const agentSecret = "agent_public_pool_derivative_secret_001";
  await instance.call("agent_derivative.mint", {
    secret: parentSecret,
    body: {
      agentSecret,
      replySecret: "manual_public_pool_reply_secret_0001",
      deleteSecret: "manual_public_pool_delete_secret_001",
    },
  });
  const twentieth = await instance.call("interaction.create", {
    secret: agentSecret,
    body: requestBody("derivative_pool_20"),
  });
  await instance.call("interaction.close", {
    params: { interactionId: interactionId(twentieth) },
    expectedVersion: 1,
  });
  assert.equal(instance.store.publicAcceptedCountSince(PUBLIC_ROOM_ID, "2026-08-02T12:00:00.000Z"), 20);

  const deniedSecret = await issueEncounter(instance, "derivative_pool_21");
  await expectSemanticError(
    instance.call("interaction.create", { secret: deniedSecret, body: requestBody("derivative_pool_21") }),
    "public_room_pool_exhausted",
    429,
  );
});

async function sourceInteraction(instance: ReturnType<typeof createHarness>, label: string) {
  const encounterSecret = await issueEncounter(instance, label);
  const body = requestBody(label);
  const created = await instance.call("interaction.create", { secret: encounterSecret, body });
  return {
    interactionId: interactionId(created),
    replySecret: body.replySecret as string,
    deleteSecret: body.deleteSecret as string,
  };
}

test("GrantOffer and DirectInvite have explicit accept/revoke winners and waiting never extends fixed Grant expiry", async () => {
  const acceptFirst = createHarness();
  const source = await sourceInteraction(acceptFirst, "offer_accept_first");
  const issued = await acceptFirst.call("grant_offer.issue", {
    body: {
      sourceInteractionId: source.interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T7D,
    },
  });
  const offerId = (issued.body.offer as { offerId: string }).offerId;
  acceptFirst.advance(60 * 60 * 1_000);
  const accepted = await acceptFirst.call("grant_offer.accept", {
    params: { offerId },
    secret: source.replySecret,
    expectedVersion: 1,
    body: { grantSecret: "grant_offer_accepted_secret_0001" },
  });
  assert.equal((accepted.body.grant as GrantV1).expiresAt, T7D, "one hour of waiting does not reset the fixed expiry");
  await expectSemanticError(
    acceptFirst.call("grant_offer.revoke", { params: { offerId }, expectedVersion: 1 }),
    "grant_offer_terminal",
    409,
  );

  const revokeFirst = createHarness();
  const revokedSource = await sourceInteraction(revokeFirst, "offer_revoke_first");
  const revokeIssued = await revokeFirst.call("grant_offer.issue", {
    body: {
      sourceInteractionId: revokedSource.interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T7D,
    },
  });
  const revokedOfferId = (revokeIssued.body.offer as { offerId: string }).offerId;
  await revokeFirst.call("grant_offer.revoke", { params: { offerId: revokedOfferId }, expectedVersion: 1 });
  await expectSemanticError(
    revokeFirst.call("grant_offer.accept", {
      params: { offerId: revokedOfferId },
      secret: revokedSource.replySecret,
      expectedVersion: 1,
      body: { grantSecret: "grant_offer_revoked_secret_0001" },
    }),
    "grant_offer_owner_revoked",
    410,
  );

  const inviteSecret = "direct_invite_accept_secret_000001";
  const inviteIssued = await revokeFirst.call("direct_invite.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "short_exchange",
      inviteSecret,
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T3D,
    },
  });
  const inviteId = (inviteIssued.body.invite as { inviteId: string }).inviteId;
  const redeemed = await revokeFirst.call("direct_invite.redeem", {
    params: { inviteId },
    secret: inviteSecret,
    expectedVersion: 1,
    body: { grantSecret: "direct_invite_grant_secret_000001" },
  });
  assert.equal((redeemed.body.grant as GrantV1).expiresAt, T3D);
  await expectSemanticError(
    revokeFirst.call("direct_invite.redeem", {
      params: { inviteId },
      secret: inviteSecret,
      expectedVersion: 1,
      body: { grantSecret: "direct_invite_second_redeem_00001" },
    }),
    "direct_invite_redeemed",
    410,
  );
  await expectSemanticError(
    revokeFirst.call("direct_invite.revoke", { params: { inviteId }, expectedVersion: 1 }),
    "direct_invite_terminal",
    409,
  );

  const revokeInviteSecret = "direct_invite_revoke_secret_00001";
  const revokeInviteIssued = await revokeFirst.call("direct_invite.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "short_exchange",
      inviteSecret: revokeInviteSecret,
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T3D,
    },
  });
  const revokeInviteId = (revokeInviteIssued.body.invite as { inviteId: string }).inviteId;
  await revokeFirst.call("direct_invite.revoke", { params: { inviteId: revokeInviteId }, expectedVersion: 1 });
  await expectSemanticError(
    revokeFirst.call("direct_invite.redeem", {
      params: { inviteId: revokeInviteId },
      secret: revokeInviteSecret,
      expectedVersion: 1,
      body: { grantSecret: "direct_invite_revoked_grant_00001" },
    }),
    "direct_invite_owner_revoked",
    410,
  );
});

test("Offer/Invite expiry, one-live-offer, and target-successor commit orders fail closed", async () => {
  const expiryFirst = createHarness();
  const expiringSource = await sourceInteraction(expiryFirst, "offer_expiry_first");
  const expiringOffer = await expiryFirst.call("grant_offer.issue", {
    body: {
      sourceInteractionId: expiringSource.interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: "2026-08-03T12:30:00.000Z",
      offeredGrantExpiresAt: T7D,
    },
  });
  const expiringOfferId = (expiringOffer.body.offer as { offerId: string }).offerId;
  await expectSemanticError(
    expiryFirst.call("grant_offer.issue", {
      body: {
        sourceInteractionId: expiringSource.interactionId,
        roomId: PUBLIC_ROOM_ID,
        projectionId: PUBLIC_PROJECTION_ID,
        presetId: "short_exchange",
        acceptanceExpiresAt: "2026-08-03T12:30:00.000Z",
        offeredGrantExpiresAt: T3D,
      },
    }),
    "live_grant_offer_exists",
    409,
  );
  const expiringInviteSecret = "direct_invite_expiry_first_secret_001";
  const expiringInvite = await expiryFirst.call("direct_invite.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "short_exchange",
      inviteSecret: expiringInviteSecret,
      acceptanceExpiresAt: "2026-08-03T12:30:00.000Z",
      offeredGrantExpiresAt: T3D,
    },
  });
  const expiringInviteId = (expiringInvite.body.invite as { inviteId: string }).inviteId;
  expiryFirst.advance(31 * 60 * 1_000);
  await expectSemanticError(
    expiryFirst.call("grant_offer.accept", {
      params: { offerId: expiringOfferId },
      secret: expiringSource.replySecret,
      expectedVersion: 1,
      body: { grantSecret: "expired_offer_grant_secret_00001" },
    }),
    "grant_offer_expired",
    410,
  );
  await expectSemanticError(
    expiryFirst.call("grant_offer.revoke", { params: { offerId: expiringOfferId }, expectedVersion: 1 }),
    "grant_offer_terminal",
    409,
  );
  await expectSemanticError(
    expiryFirst.call("direct_invite.redeem", {
      params: { inviteId: expiringInviteId },
      secret: expiringInviteSecret,
      expectedVersion: 1,
      body: { grantSecret: "expired_invite_grant_secret_0001" },
    }),
    "direct_invite_expired",
    410,
  );

  const successorFirst = createHarness();
  const successorSource = await sourceInteraction(successorFirst, "offer_successor_first");
  const successorOffer = await successorFirst.call("grant_offer.issue", {
    body: {
      sourceInteractionId: successorSource.interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T7D,
    },
  });
  const successorOfferId = (successorOffer.body.offer as { offerId: string }).offerId;
  await successorFirst.call("room_operator.projection.deliver", {
    expectedVersion: 1,
    body: projectionBundle("offer_successor_first").body,
  });
  await expectSemanticError(
    successorFirst.call("grant_offer.accept", {
      params: { offerId: successorOfferId },
      secret: successorSource.replySecret,
      expectedVersion: 1,
      body: { grantSecret: "successor_invalidated_offer_00001" },
    }),
    "grant_offer_invalidated",
    410,
  );

  const acceptFirst = createHarness();
  const acceptedSource = await sourceInteraction(acceptFirst, "offer_accept_before_successor");
  const acceptedOffer = await acceptFirst.call("grant_offer.issue", {
    body: {
      sourceInteractionId: acceptedSource.interactionId,
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      acceptanceExpiresAt: T1D,
      offeredGrantExpiresAt: T7D,
    },
  });
  const acceptedOfferId = (acceptedOffer.body.offer as { offerId: string }).offerId;
  const acceptedGrantSecret = "accepted_before_successor_secret_001";
  const acceptedGrantResult = await acceptFirst.call("grant_offer.accept", {
    params: { offerId: acceptedOfferId },
    secret: acceptedSource.replySecret,
    expectedVersion: 1,
    body: { grantSecret: acceptedGrantSecret },
  });
  const acceptedGrant = acceptedGrantResult.body.grant as GrantV1;
  const successor = projectionBundle("offer_accept_before_successor");
  await acceptFirst.call("room_operator.projection.deliver", {
    expectedVersion: 1,
    body: successor.body,
  });
  assert.equal(acceptFirst.store.capability(acceptedGrant.grantId)?.value.state, "issued");
  await expectSemanticError(
    acceptFirst.call("interaction.create", {
      secret: acceptedGrantSecret,
      body: { ...requestBody("accepted_grant_successor_scope"), projectionId: successor.projection.projectionId },
    }),
    "not_found",
    404,
  );
});

function projectionBundle(label: string): {
  body: Record<string, unknown>;
  projection: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
  approval: ArtifactApprovalV1;
} {
  const seed = canonicalSha256(label).slice(7, 39);
  const projectionId = `proj_${seed}`;
  const basisId = `basis_${seed}`;
  const projectionPreimage: Omit<ProjectionCapsuleV1, "payloadHash"> = {
    schemaVersion: "projection_capsule.v1",
    projectionId,
    roomId: PUBLIC_ROOM_ID,
    entityId: ENTITY_ID,
    title: "Synthetic successor Projection",
    thirdPlaceSummary: "An exact synthetic bundle for hosted Gate A validation.",
    claims: [{
      slot: "now",
      text: `Synthetic exact Projection ${label}.`,
      attribution: "owner_confirmed",
      uncertainty: null,
    }],
    supportedInteractions: ["ask", "seed", "resonance"],
    allowedTopics: ["synthetic Gate A"],
    unavailableTopics: ["private source bodies"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "A local Forme Agent may prepare candidates after Owner start.",
    nonCommitmentStatement: "This Projection cannot commit the Owner.",
    disclosureBasisId: basisId,
    publicationAttestationId: `att_${seed}`,
    publishedAt: T0,
    freshUntil: T1D,
    expiresAt: T7D,
  };
  const projection: ProjectionCapsuleV1 = {
    ...projectionPreimage,
    payloadHash: canonicalSha256(projectionPreimage),
  };
  const policyHash = canonicalSha256(`policy:${label}`);
  const basis: ProjectionBasisV1 = {
    schemaVersion: "projection_basis.v1",
    basisId,
    projectionId,
    roomId: PUBLIC_ROOM_ID,
    twinRevision: 1,
    twinRevisionHash: canonicalSha256(`twin:${label}`),
    workspaceContractHash: canonicalSha256(`workspace:${label}`),
    projectionPolicyGeneration: 1,
    projectionPolicyHash: policyHash,
    claims: [{
      slot: "now",
      claimText: projection.claims[0]?.text ?? "",
      attribution: "owner_confirmed",
      disclosureClass: "current_owner_frame",
      transformationClass: "exact",
      sourceKind: "owner_frame",
      sourceReference: `src_${seed}`,
      sourceContentHash: canonicalSha256(`source:${label}`),
      semanticStatus: "active",
    }],
    payloadHash: projection.payloadHash,
    ownerDecisionId: `decision_${seed}`,
    ownerDecisionHash: canonicalSha256(`decision:${label}`),
    localReceiptId: `receipt_${seed}`,
    hostedReceiptId: null,
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${seed}`,
    artifactClass: "projection",
    artifactHash: projection.payloadHash,
    roomId: PUBLIC_ROOM_ID,
    projectionId,
    interactionId: null,
    basisHash: canonicalSha256(basis),
    policyHash,
    approvedAt: T0,
    expiresAt: T1H,
    operationId: `op_${seed}`,
  };
  return { body: signedProjectionDeliveryBody({ projection, basis, approval }), projection, basis, approval };
}

test("room_operator Projection delivery accepts one exact approved bundle and rejects stale Room versions", async () => {
  const instance = createHarness();
  const first = projectionBundle("projection_exact_first");
  await expectSemanticError(
    instance.call("room_operator.projection.deliver", {
      expectedVersion: 2,
      body: first.body,
    }),
    "version_conflict",
    409,
  );
  const delivered = await instance.call("room_operator.projection.deliver", {
    expectedVersion: 1,
    body: first.body,
  });
  assert.equal((delivered.body.projection as ProjectionCapsuleV1).payloadHash, first.projection.payloadHash);
  assert.equal(instance.store.room(PUBLIC_ROOM_ID)?.room.version, 2);
  assert.equal(instance.store.auxiliary(`projection_bundle:${first.projection.projectionId}`), null);
  assert.equal(
    instance.store.auxiliary(`publication_attestation:${first.projection.publicationAttestationId}`)?.artifactHash,
    first.projection.payloadHash,
  );

  const stale = projectionBundle("projection_exact_stale");
  await expectSemanticError(
    instance.call("room_operator.projection.deliver", {
      expectedVersion: 1,
      body: stale.body,
    }),
    "version_conflict",
    409,
  );

  const mismatchInstance = createHarness();
  const mismatch = projectionBundle("projection_mismatch");
  await expectSemanticError(
    mismatchInstance.call("room_operator.projection.deliver", {
      expectedVersion: 1,
      body: {
        projection: mismatch.projection,
        basis: mismatch.basis,
        approval: { ...mismatch.approval, policyHash: canonicalSha256("wrong-policy") },
      },
    }),
    "invalid_request_shape",
    400,
  );
});
