import assert from "node:assert/strict";
import test from "node:test";
import { HostedRoomApplication, type OperationResponse } from "../../apps/room/src/application.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET, syntheticCapabilityRequestBody, syntheticCapabilitySecret } from "../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type ResponseCandidateV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedResponseDeliveryBody } from "./hosted-publication-helpers.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";

function fixture() {
  let clock = new Date(T0);
  const store = new SyntheticPresenceStore(() => clock);
  const app = new HostedRoomApplication(store);
  let serial = 30_000;
  async function call(name: string, options: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    secret?: string;
    expectedVersion?: number | null;
  } = {}): Promise<OperationResponse> {
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
      idempotencyKey: definition.mutating ? serial.toString(16).padStart(32, "0") : null,
      expectedVersion: options.expectedVersion ?? (definition.expectedVersion ? 1 : null),
      syntheticClientBucket: "synthetic-response-terminal-client",
    });
  }
  return {
    store,
    app,
    call,
    setTime(value: string) { clock = new Date(value); },
  };
}

async function readyInteraction(
  instance: ReturnType<typeof fixture>,
  label: string,
  timing: {
    readonly responsePublishedAt?: string;
    readonly responseExpiresAt?: string;
    readonly approvalExpiresAt?: string;
    readonly parentInteractionExpiresAt?: string;
    readonly originState?: ResponseCandidateV1["originState"];
  } = {},
) {
  const encounterSecret = `encounter_${label}_terminal_secret_00001`;
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret },
  });
  const replySecret = `reply_${label}_terminal_secret_00000001`;
  const deleteSecret = `delete_${label}_terminal_secret_0000001`;
  const created = await instance.call("interaction.create", {
    secret: encounterSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      replySecret,
      deleteSecret,
      requestBody: `Synthetic ${label} terminal request.`,
      guestCapsule: null,
    },
  });
  const interactionId = created.body.interactionId as string;
  const pending = await instance.call("notification.set", {
    params: { interactionId },
    secret: replySecret,
    body: { email: `${label}@example.invalid` },
  });
  const code = (pending.body.syntheticVerification as { code: string }).code;
  await instance.call("notification.verify", {
    params: { interactionId },
    secret: replySecret,
    expectedVersion: 2,
    body: { code },
  });
  const responsePublishedAt = timing.responsePublishedAt ?? T0;
  const responseExpiresAt = timing.responseExpiresAt ?? "2026-08-04T12:00:00.000Z";
  if (responsePublishedAt !== T0) instance.setTime(responsePublishedAt);
  const candidatePreimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: `candidate_${label}terminal0000000000000`,
    interactionId,
    sessionEnvelopeId: null,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    originState: timing.originState ?? "published_fresh",
    responseText: `Synthetic response ${label}.`,
    sourceDisclosureClass: "manual_owner_authored",
    twinBasisHash: canonicalSha256(`twin:${label}`),
    snapshotManifestHash: null,
    sessionReceiptHash: canonicalSha256(`receipt:${label}`),
    policyHash: canonicalSha256(`policy:${label}`),
    admittedAt: responsePublishedAt,
    expiresAt: responseExpiresAt,
  };
  const candidate: ResponseCandidateV1 = { ...candidatePreimage, candidateHash: canonicalSha256(candidatePreimage) };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${label}terminal0000000000000`,
    artifactClass: "response",
    artifactHash: candidate.candidateHash,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    interactionId,
    basisHash: candidate.twinBasisHash,
    policyHash: candidate.policyHash,
    approvedAt: responsePublishedAt,
    expiresAt: timing.approvalExpiresAt ?? "2026-08-03T13:00:00.000Z",
    operationId: `op_${label}terminal00000000000000000`,
  };
  const delivered = await instance.call("room_operator.response.deliver", {
    body: signedResponseDeliveryBody({
      candidate,
      approval,
      now: responsePublishedAt,
      parentInteractionExpiresAt: timing.parentInteractionExpiresAt ?? "2026-09-02T12:00:00.000Z",
    }),
  });
  return { interactionId, responseId: delivered.body.responseId as string, replySecret };
}

test("D13/E09 Controller response revoke immediately hides/purges body and terminalizes pending notice", async () => {
  const instance = fixture();
  const ready = await readyInteraction(instance, "revoke");
  assert.equal(instance.app.notificationInspection(ready.interactionId).notice?.state, "ready_pending");
  const revoked = await instance.call("response.revoke", {
    params: { responseId: ready.responseId },
    expectedVersion: 1,
  });
  assert.equal(revoked.body.responseState, "response_revoked");
  const stored = instance.store.interaction(ready.interactionId);
  assert.equal(stored?.response?.state, "response_revoked");
  assert.equal(stored?.response?.body, "[purged]");
  const guest = await instance.call("interaction.read", { params: { interactionId: ready.interactionId }, secret: ready.replySecret });
  assert.equal((guest.body.interaction as { response: unknown }).response, null);
  assert.equal((guest.body.interaction as { responseState: string }).responseState, "response_revoked");
  assert.equal(instance.app.notificationInspection(ready.interactionId).endpoint.state, "cleared");
  assert.equal(instance.app.notificationInspection(ready.interactionId).notice?.state, "canceled");
});

test("D13/E09 Janitor response and Interaction expiry are monotonic, body-free, and idempotent", async () => {
  const responseExpiry = fixture();
  const ready = await readyInteraction(responseExpiry, "expiry");
  responseExpiry.setTime("2026-08-10T12:00:00.001Z");
  const first = await responseExpiry.app.runLifecycleJanitor();
  assert.deepEqual(first, {
    schemaVersion: "synthetic_lifecycle_janitor.v1",
    expiredInteractions: 0,
    expiredResponses: 1,
    bodyFree: true,
  });
  assert.equal(responseExpiry.store.interaction(ready.interactionId)?.response?.state, "response_expired");
  assert.equal(responseExpiry.store.interaction(ready.interactionId)?.response?.body, "[purged]");
  assert.equal((await responseExpiry.app.runLifecycleJanitor()).expiredResponses, 0, "repeat is effectless");

  const interactionExpiry = fixture();
  const interaction = await readyInteraction(interactionExpiry, "interactionexpiry");
  interactionExpiry.setTime("2026-09-03T12:00:00.001Z");
  const expired = await interactionExpiry.app.runLifecycleJanitor();
  assert.equal(expired.expiredInteractions, 1);
  const stored = interactionExpiry.store.interaction(interaction.interactionId);
  assert.equal(stored?.interaction.state, "interaction_expired");
  assert.equal(stored?.interaction.requestText, "[purged]");
  assert.equal(stored?.interaction.guestCapsule, null);
  assert.equal(stored?.response?.body, "[purged]");
  assert.equal(interactionExpiry.app.notificationInspection(interaction.interactionId).endpoint.state, "cleared");
  assert.equal((await interactionExpiry.app.runLifecycleJanitor()).expiredInteractions, 0);
});

test("E06 scheduled registry drives actual hosted body/address/challenge purge and records only body-free receipts", async () => {
  const responseExpiry = fixture();
  const ready = await readyInteraction(responseExpiry, "actualregistry");
  assert.notEqual(responseExpiry.app.notificationInspection(ready.interactionId).endpoint.encryptedAddress, null);
  assert.notEqual(responseExpiry.app.notificationInspection(ready.interactionId).notice?.encryptedDeliveryTarget, null);
  responseExpiry.setTime("2026-08-04T12:00:00.000Z");
  const expired = await responseExpiry.app.runLifecycleJanitor();
  assert.equal(expired.expiredResponses, 1);
  assert.equal(responseExpiry.store.interaction(ready.interactionId)?.response?.body, "[purged]");
  assert.equal(responseExpiry.app.notificationInspection(ready.interactionId).endpoint.encryptedAddress, null);
  assert.equal(responseExpiry.app.notificationInspection(ready.interactionId).notice?.encryptedDeliveryTarget, null);
  const responseRetention = responseExpiry.app.retentionInspection();
  assert.equal(responseRetention.targets.some((target) => target.kind === "response_body"), true);
  assert.equal(responseRetention.targets.some((target) => target.kind === "notification_endpoint"), true);
  assert.equal(responseRetention.targets.some((target) => target.kind === "notification_delivery_target"), true);
  assert.equal(responseRetention.targets.every((target) => !target.payloadPresent && target.purgedAt !== null), true);
  assert.equal(responseRetention.receipts.every((receipt) => receipt.bodyFree && !JSON.stringify(receipt).includes("actualregistry@example.invalid")), true);
  assert.equal(responseRetention.health.healthy, true);

  const verificationExpiry = fixture();
  const encounterSecret = "encounter_verification_registry_secret";
  await verificationExpiry.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret },
  });
  const replySecret = "reply_verification_registry_secret";
  const created = await verificationExpiry.call("interaction.create", {
    secret: encounterSecret,
    body: {
      projectionId: PUBLIC_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      replySecret,
      deleteSecret: "delete_verification_registry_secret",
      requestBody: "Synthetic pending verification retention request.",
      guestCapsule: null,
    },
  });
  const interactionId = created.body.interactionId as string;
  await verificationExpiry.call("notification.set", {
    params: { interactionId },
    secret: replySecret,
    body: { email: "verification-registry@example.invalid" },
  });
  verificationExpiry.setTime("2026-08-03T12:15:00.000Z");
  await verificationExpiry.app.runLifecycleJanitor();
  const notification = verificationExpiry.app.notificationInspection(interactionId);
  assert.equal(notification.endpoint.state, "cleared");
  assert.equal(notification.endpoint.encryptedAddress, null);
  assert.equal(notification.challengePresent, false);
  assert.equal(notification.verificationSend?.encryptedDeliveryTarget, null);
  assert.equal(notification.verificationSend?.encryptedVerificationCode, null);
  const verificationRetention = verificationExpiry.app.retentionInspection();
  assert.equal(verificationRetention.targets.some((target) => target.kind === "verification_challenge"), true);
  assert.equal(verificationRetention.targets.some((target) => target.kind === "notification_endpoint"), true);
  assert.equal(verificationRetention.targets.some((target) => target.kind === "notification_delivery_target"), true);
  assert.equal(verificationRetention.targets.every((target) => !target.payloadPresent), true);

  const operationRetention = fixture();
  await operationRetention.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: "encounter_operation_retention_secret" },
  });
  assert.equal(operationRetention.store.idempotencyEntries().length, 1);
  operationRetention.setTime("2026-09-09T12:00:00.000Z");
  await operationRetention.app.runLifecycleJanitor();
  assert.equal(operationRetention.store.idempotencyEntries().length, 0, "scheduled maintenance applies the 37-day operation-record ceiling to the actual store");
});

test("E06 equal-expiry response is purged before its parent Interaction in the same bounded batch", async () => {
  const instance = fixture();
  const parentExpiry = "2026-09-02T12:00:00.000Z";
  const ready = await readyInteraction(instance, "equalexpiry", {
    responsePublishedAt: "2026-09-01T12:00:00.000Z",
    responseExpiresAt: parentExpiry,
    approvalExpiresAt: "2026-09-01T13:00:00.000Z",
    parentInteractionExpiresAt: parentExpiry,
    originState: "expired",
  });
  const stored = instance.store.interaction(ready.interactionId);
  assert.ok(stored?.response);
  assert.equal(stored.response.expiresAt, stored.interaction.expiresAt);
  instance.setTime(stored.interaction.expiresAt);

  const result = await instance.app.runLifecycleJanitor();
  assert.deepEqual(
    { expiredInteractions: result.expiredInteractions, expiredResponses: result.expiredResponses },
    { expiredInteractions: 1, expiredResponses: 1 },
  );
  const after = instance.store.interaction(ready.interactionId);
  assert.equal(after?.interaction.requestText, "[purged]");
  assert.equal(after?.response?.body, "[purged]");
  const receipts = instance.app.retentionInspection().lastRun?.receipts ?? [];
  const responseIndex = receipts.findIndex((receipt) => receipt.targetKind === "response_body");
  const interactionIndex = receipts.findIndex((receipt) => receipt.targetKind === "interaction_body");
  assert.equal(responseIndex >= 0 && interactionIndex >= 0 && responseIndex < interactionIndex, true);
  assert.equal(receipts.every((receipt) => receipt.outcome !== "failed"), true);
});

test("E06 actual-store batch is exactly 100; injected failure preserves bytes and manual retry receipts every remaining target", async () => {
  const instance = fixture();
  const encounterSecret = "encounter_e06_bounded_batch_secret";
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
      replySecret: "reply_e06_bounded_batch_secret",
      deleteSecret: "delete_e06_bounded_batch_secret",
      requestBody: "Synthetic E06 bounded batch body 0.",
      guestCapsule: null,
    },
  });
  const baseId = created.body.interactionId as string;
  const base = instance.store.interaction(baseId);
  assert.ok(base);
  const cloneIds: string[] = [];
  for (let index = 1; index <= 100; index += 1) {
    const interactionId = `interaction_e06batch${index.toString().padStart(24, "0")}`;
    cloneIds.push(interactionId);
    instance.store.saveInteraction({
      ...base,
      interaction: {
        ...base.interaction,
        interactionId,
        requestText: `Synthetic E06 bounded batch body ${index}.`,
      },
    });
  }
  const allIds = [baseId, ...cloneIds];
  instance.setTime(base.interaction.expiresAt);
  const failedId = cloneIds[0] as string;
  const first = await instance.app.runLifecycleJanitor(
    base.interaction.expiresAt,
    "scheduled",
    { failTargetIds: new Set([`interaction_body:${failedId}`]) },
  );
  assert.equal(first.expiredInteractions, 99);
  const afterFirstBodies = allIds.filter((interactionId) => instance.store.interaction(interactionId)?.interaction.requestText !== "[purged]");
  assert.equal(afterFirstBodies.length, 2, "one failed and one beyond-batch body remain physically present");
  assert.equal(afterFirstBodies.includes(failedId), true, "injected failure never mutates the actual body");
  const firstInspection = instance.app.retentionInspection();
  assert.equal(firstInspection.targets.length, 101);
  assert.equal(firstInspection.receipts.length, 100);
  assert.equal(firstInspection.targets.filter((target) => target.payloadPresent).length, 2);
  assert.equal(firstInspection.lastRun?.status, "partial_failure");

  const manual = await instance.app.runLifecycleJanitor(base.interaction.expiresAt, "manual");
  assert.equal(manual.expiredInteractions, 2);
  assert.equal(allIds.every((interactionId) => instance.store.interaction(interactionId)?.interaction.requestText === "[purged]"), true);
  const recovered = instance.app.retentionInspection();
  assert.equal(recovered.targets.every((target) => !target.payloadPresent), true);
  assert.equal(recovered.receipts.length, 101, "one stable final receipt exists for every actual target");
  assert.equal(recovered.lastRun?.invocation, "manual");
  assert.equal(recovered.lastRun?.status, "completed");
  assert.equal(recovered.lastRun?.receipts.length, 2);
});
