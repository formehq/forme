import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalJson,
  canonicalSha256,
  type ArtifactApprovalV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
  type ResponseCandidateV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedProjectionDeliveryBody, signedResponseDeliveryBody } from "./hosted-publication-helpers.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const T1H = "2026-08-03T13:00:00.000Z";
const T1D = "2026-08-04T12:00:00.000Z";
const T7D = "2026-08-10T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const ENTITY_ID = "entity_forme000000000000000000000000";
const PRIVATE_CANARY = "PRIVATE_BASIS_CANARY_MUST_STAY_LOCAL_0001";

function fixture(now = T0) {
  let clock = new Date(now);
  const store = new SyntheticPresenceStore(() => clock);
  const app = new HostedRoomApplication(store);
  let serial = 90_000;
  const call = async (name: string, options: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    secret?: string;
    idempotencyKey?: string;
    expectedVersion?: number;
  } = {}): Promise<OperationResponse> => {
    serial += 1;
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
      idempotencyKey: definition.mutating ? options.idempotencyKey ?? serial.toString(16).padStart(32, "0") : null,
      expectedVersion: definition.expectedVersion ? options.expectedVersion ?? 1 : null,
      syntheticClientBucket: "synthetic-publication-client",
    });
  };
  return {
    store,
    app,
    call,
    advance(milliseconds: number) { clock = new Date(clock.getTime() + milliseconds); },
  };
}

async function errorCode(work: Promise<unknown>, code: string, status: number): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

function projectionFixture(label: string, publishedAt = T0) {
  const seed = canonicalSha256(label).slice(7, 39);
  const preimage: Omit<ProjectionCapsuleV1, "payloadHash"> = {
    schemaVersion: "projection_capsule.v1",
    projectionId: `proj_${seed}`,
    roomId: PUBLIC_ROOM_ID,
    entityId: ENTITY_ID,
    title: "Privacy-safe successor",
    thirdPlaceSummary: "Only this approved public capsule crosses the boundary.",
    claims: [{ slot: "now", text: "The public delivery boundary is explicit.", attribution: "owner_confirmed", uncertainty: null }],
    supportedInteractions: ["ask"],
    allowedTopics: ["Forme R4"],
    unavailableTopics: ["private basis"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "Local preparation does not grant hosted authority.",
    nonCommitmentStatement: "This Projection cannot commit the Owner.",
    disclosureBasisId: `basis_${seed}`,
    publicationAttestationId: `att_${seed}`,
    publishedAt,
    freshUntil: T1D,
    expiresAt: new Date(Date.parse(publishedAt) + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const projection: ProjectionCapsuleV1 = { ...preimage, payloadHash: canonicalSha256(preimage) };
  const basis: ProjectionBasisV1 = {
    schemaVersion: "projection_basis.v1",
    basisId: projection.disclosureBasisId,
    projectionId: projection.projectionId,
    roomId: projection.roomId,
    twinRevision: 7,
    twinRevisionHash: canonicalSha256(`${PRIVATE_CANARY}:twin`),
    workspaceContractHash: canonicalSha256(`${PRIVATE_CANARY}:workspace`),
    projectionPolicyGeneration: 4,
    projectionPolicyHash: canonicalSha256(`${PRIVATE_CANARY}:policy`),
    claims: [{
      slot: "now",
      claimText: projection.claims[0]?.text ?? "",
      attribution: "owner_confirmed",
      disclosureClass: "current_owner_frame",
      transformationClass: "exact",
      sourceKind: "owner_frame",
      sourceReference: `src_${PRIVATE_CANARY}`,
      sourceContentHash: canonicalSha256(`${PRIVATE_CANARY}:source`),
      semanticStatus: "active",
    }],
    payloadHash: projection.payloadHash,
    ownerDecisionId: `decision_${PRIVATE_CANARY}`,
    ownerDecisionHash: canonicalSha256(`${PRIVATE_CANARY}:decision`),
    localReceiptId: `receipt_${seed}`,
    hostedReceiptId: null,
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${PRIVATE_CANARY}`,
    artifactClass: "projection",
    artifactHash: projection.payloadHash,
    roomId: projection.roomId,
    projectionId: projection.projectionId,
    interactionId: null,
    basisHash: canonicalSha256(basis),
    policyHash: basis.projectionPolicyHash,
    approvedAt: publishedAt,
    expiresAt: T1H,
    operationId: `op_${PRIVATE_CANARY}`,
  };
  return { projection, basis, approval };
}

test("Projection endpoint accepts only signed body.delivery; private basis canary never reaches wire or hosted store", async () => {
  const instance = fixture();
  const privateBundle = projectionFixture("e2e-projection-boundary");
  const body = signedProjectionDeliveryBody(privateBundle);
  assert.deepEqual(Object.keys(body), ["delivery"]);
  const wire = canonicalJson(body);
  assert.equal(wire.includes(PRIVATE_CANARY), false);
  assert.equal(wire.includes(privateBundle.basis.projectionPolicyHash), false);
  assert.equal(wire.includes(privateBundle.approval.approvalId), false);

  const key = "publicationprojectionreplay00000001";
  const first = await instance.call("room_operator.projection.deliver", { body, expectedVersion: 1, idempotencyKey: key });
  const replay = await instance.call("room_operator.projection.deliver", { body, expectedVersion: 1, idempotencyKey: key });
  assert.deepEqual(replay, first);
  assert.equal(instance.store.room(PUBLIC_ROOM_ID)?.room.version, 2, "same-key replay creates no second Room revision");
  assert.equal(instance.store.eventsAfter(PUBLIC_ROOM_ID, 0).filter((event) => event.eventType === "projection.published").length, 1);

  const hosted = canonicalJson({
    owner: instance.store.ownerStatus(),
    auxiliary: instance.store.auxiliaryEntries(""),
  });
  assert.equal(hosted.includes(PRIVATE_CANARY), false);
  assert.equal(hosted.includes(privateBundle.basis.projectionPolicyHash), false);
  assert.equal(hosted.includes(canonicalSha256(privateBundle.approval)), false);
  assert.equal(hosted.includes("basisHash"), false);
  assert.equal(hosted.includes("approvalHash"), false);

  await errorCode(instance.call("room_operator.projection.deliver", {
    body,
    expectedVersion: 2,
    idempotencyKey: "publicationprojectionsecondkey0001",
  }), "publication_attestation_used", 409);
});

test("publication idempotency replays only current public state and becomes body-free after expiry/revoke/successor/retire", async () => {
  async function published(label: string) {
    const instance = fixture();
    const bundle = projectionFixture(label);
    const body = signedProjectionDeliveryBody(bundle);
    const key = `publicationterminal${canonicalSha256(label).slice(7, 27)}`;
    const first = await instance.call("room_operator.projection.deliver", {
      body,
      expectedVersion: 1,
      idempotencyKey: key,
    });
    const operation = instance.store.idempotencyEntries().find((entry) => entry.recoveryKind === "publication_current");
    assert.ok(operation);
    assert.equal(JSON.stringify(operation.body).includes(bundle.projection.thirdPlaceSummary), false, "idempotency stores only body-free publication recovery coordinates");
    return { instance, bundle, body, key, first };
  }

  async function unavailable(value: Awaited<ReturnType<typeof published>>) {
    const replay = await value.instance.call("room_operator.projection.deliver", {
      body: value.body,
      expectedVersion: 1,
      idempotencyKey: value.key,
    });
    assert.equal(replay.status, 410);
    assert.deepEqual({
      schemaVersion: replay.body.schemaVersion,
      artifactClass: replay.body.artifactClass,
      artifactId: replay.body.artifactId,
      state: replay.body.state,
    }, {
      schemaVersion: "publication_recovery_unavailable.v1",
      artifactClass: "projection",
      artifactId: value.bundle.projection.projectionId,
      state: "unavailable",
    });
    assert.equal(JSON.stringify(replay.body).includes(value.bundle.projection.thirdPlaceSummary), false);
  }

  const expired = await published("idempotency-expired");
  expired.instance.advance(7 * 24 * 60 * 60 * 1_000);
  await unavailable(expired);

  const revoked = await published("idempotency-revoked");
  await revoked.instance.call("projection.revoke", {
    params: { projectionId: revoked.bundle.projection.projectionId },
    expectedVersion: 1,
  });
  await unavailable(revoked);

  const superseded = await published("idempotency-superseded");
  const successor = projectionFixture("idempotency-successor");
  await superseded.instance.call("room_operator.projection.deliver", {
    body: signedProjectionDeliveryBody(successor),
    expectedVersion: 2,
    idempotencyKey: "publicationterminalsuccessor00001",
  });
  await unavailable(superseded);

  const retired = await published("idempotency-retired");
  await retired.instance.call("room.retire", {
    params: { roomId: PUBLIC_ROOM_ID },
    expectedVersion: 2,
  });
  await unavailable(retired);

  const purged = await published("idempotency-retention-purge");
  assert.equal(purged.instance.store.idempotencyEntries().length, 1);
  purged.instance.advance(37 * 24 * 60 * 60 * 1_000);
  assert.equal(purged.instance.store.idempotencyEntries().length, 0, "ordinary recovery records are physically absent at the 37-day ceiling");
});

test("legacy private Projection bundle and a tampered HMAC fail before any hosted mutation", async () => {
  const legacy = fixture();
  const bundle = projectionFixture("legacy-projection-wire");
  await errorCode(legacy.call("room_operator.projection.deliver", {
    body: { projection: bundle.projection, basis: bundle.basis, approval: bundle.approval },
  }), "invalid_request_shape", 400);
  assert.equal(legacy.store.projection(bundle.projection.projectionId), null);

  const tampered = fixture();
  const signed = signedProjectionDeliveryBody(bundle) as { delivery: Record<string, unknown> };
  const attestation = signed.delivery.attestation as Record<string, unknown>;
  const badBody = {
    delivery: {
      ...signed.delivery,
      attestation: { ...attestation, hmacSha256: canonicalSha256("tampered-publication-hmac") },
    },
  };
  await errorCode(tampered.call("room_operator.projection.deliver", { body: badBody }), "not_found", 404);
  assert.equal(tampered.store.projection(bundle.projection.projectionId), null);
});

test("Projection publication cannot predate its Room and attestation time must equal publishedAt", async () => {
  const backdated = fixture();
  const backdatedBundle = projectionFixture("backdated-projection", "2026-08-03T11:59:00.000Z");
  await errorCode(backdated.call("room_operator.projection.deliver", {
    body: signedProjectionDeliveryBody(backdatedBundle),
  }), "projection_chronology_invalid", 409);
  assert.equal(backdated.store.projection(backdatedBundle.projection.projectionId), null);

  const mismatched = fixture("2026-08-03T12:00:01.000Z");
  const existingRoom = mismatched.store.room(PUBLIC_ROOM_ID);
  assert.ok(existingRoom);
  existingRoom.room = { ...existingRoom.room, createdAt: "2026-08-03T11:59:00.000Z" };
  mismatched.store.saveRoom(existingRoom);
  const mismatchBundle = projectionFixture("attestation-time-mismatch");
  await errorCode(mismatched.call("room_operator.projection.deliver", {
    body: signedProjectionDeliveryBody({ ...mismatchBundle, now: "2026-08-03T12:00:01.000Z" }),
  }), "projection_chronology_invalid", 409);
  assert.equal(mismatched.store.projection(mismatchBundle.projection.projectionId), null);
});

test("Response endpoint stores exact public bytes/IDs/times and no private candidate or approval material", async () => {
  const instance = fixture();
  const encounterSecret = "publication_boundary_encounter_secret_01";
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret },
  });
  const created = await instance.call("interaction.create", {
    secret: encounterSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      replySecret: "publication_boundary_reply_secret_001",
      deleteSecret: "publication_boundary_delete_secret_01",
      requestBody: "Synthetic privacy boundary question.",
      guestCapsule: null,
    },
  });
  const interactionId = created.body.interactionId as string;
  const candidatePreimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: "candidate_privatecanaryresponse00001",
    interactionId,
    sessionEnvelopeId: null,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    originState: "published_fresh",
    responseText: "Exact public Owner-approved response.",
    sourceDisclosureClass: "manual_owner_authored",
    twinBasisHash: canonicalSha256(`${PRIVATE_CANARY}:response-twin`),
    snapshotManifestHash: null,
    sessionReceiptHash: canonicalSha256(`${PRIVATE_CANARY}:session-receipt`),
    policyHash: canonicalSha256(`${PRIVATE_CANARY}:response-policy`),
    admittedAt: T0,
    expiresAt: T1D,
  };
  const candidate: ResponseCandidateV1 = { ...candidatePreimage, candidateHash: canonicalSha256(candidatePreimage) };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${PRIVATE_CANARY}`,
    artifactClass: "response",
    artifactHash: candidate.candidateHash,
    roomId: candidate.roomId,
    projectionId: candidate.projectionId,
    interactionId,
    basisHash: candidate.twinBasisHash,
    policyHash: candidate.policyHash,
    approvedAt: T0,
    expiresAt: T1H,
    operationId: `op_${PRIVATE_CANARY}`,
  };
  const responseId = "response_publicationboundary0000001";
  const body = signedResponseDeliveryBody({
    candidate,
    approval,
    responseId,
    responseExpiresAt: T1D,
    parentInteractionExpiresAt: T1D,
  });
  const wire = canonicalJson(body);
  assert.equal(wire.includes(PRIVATE_CANARY), false);
  assert.equal(wire.includes(candidate.twinBasisHash), false);
  if (candidate.snapshotManifestHash !== null) assert.equal(wire.includes(candidate.snapshotManifestHash), false);
  assert.equal(wire.includes(candidate.policyHash), false);
  assert.equal(wire.includes(approval.approvalId), false);

  const key = "publicationresponsereplay000000001";
  const first = await instance.call("room_operator.response.deliver", { body, idempotencyKey: key });
  assert.deepEqual(await instance.call("room_operator.response.deliver", { body, idempotencyKey: key }), first);
  const stored = instance.store.interaction(interactionId)?.response;
  assert.equal(stored?.responseId, responseId);
  assert.equal(stored?.body, candidate.responseText);
  assert.equal(stored?.publishedAt, T0);
  assert.equal(stored?.expiresAt, T1D);
  assert.equal(instance.store.eventsAfter(PUBLIC_ROOM_ID, 0).filter((event) => event.eventType === "response.published").length, 1);

  const hosted = canonicalJson({ owner: instance.store.ownerStatus(), auxiliary: instance.store.auxiliaryEntries("") });
  assert.equal(hosted.includes(PRIVATE_CANARY), false);
  assert.equal(hosted.includes(candidate.twinBasisHash), false);
  if (candidate.snapshotManifestHash !== null) assert.equal(hosted.includes(candidate.snapshotManifestHash), false);
  assert.equal(hosted.includes(candidate.policyHash), false);
  assert.equal(hosted.includes("approvalHash"), false);
  assert.equal(hosted.includes("basisHash"), false);
});

test("legacy Response candidate/approval wire shape is rejected", async () => {
  const instance = fixture();
  const candidate = { schemaVersion: "response_candidate.v1", candidateId: "candidate_legacy0000000000000000" };
  await errorCode(instance.call("room_operator.response.deliver", {
    body: { candidate, approval: { schemaVersion: "artifact_approval.v1" }, localBasisAttestationId: "att_legacy000000000000000000" },
  }), "invalid_request_shape", 400);
});
