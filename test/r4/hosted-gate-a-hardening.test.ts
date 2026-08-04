import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HostedRoomApplication,
  SemanticError,
  type OperationResponse,
} from "../../apps/room/src/application.ts";
import {
  SYNTHETIC_BACKUP_RETENTION_DISCLOSURE_HASH,
  SYNTHETIC_CONSENT_COPY_HASH,
  SYNTHETIC_PROVIDER_POLICY_HASH,
  SYNTHETIC_PROVIDER_POLICY_URL,
  SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE_HASH,
} from "../../apps/room/src/consent.ts";
import { dispatchApi } from "../../apps/room/src/http.ts";
import { createProjectionPage } from "../../apps/room/src/projection-page.ts";
import { FakeNotificationProviderSpy } from "../../apps/room/src/offline-control/notification.ts";
import type {
  FakeNoticeHandoff,
  FakeNotificationProvider,
} from "../../apps/room/src/offline-control/notification.ts";
import { SyntheticPublicRateControl } from "../../apps/room/src/offline-control/public-rate.ts";
import { OPERATION_INVENTORY, operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import { projectionWithPayloadHash } from "../../apps/room/src/domain.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import {
  SYNTHETIC_PRIVATE_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
  syntheticCapabilityRequestBody,
  syntheticCapabilitySecret,
} from "../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalSha256,
  type ArtifactApprovalV1,
  type GrantV1,
  type ResponseCandidateV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedResponseDeliveryBody } from "./hosted-publication-helpers.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const PRIVATE_PROJECTION_ID = "proj_formeprivate0000000000000000000";
let fixtureSerial = 0;

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  expectedVersion?: number | null;
  idempotencyKey?: string;
  clientBucket?: string;
}

function harness(provider?: FakeNotificationProvider) {
  let now = new Date(T0);
  const store = new SyntheticPresenceStore(() => now);
  const app = new HostedRoomApplication(store, provider);
  let sequence = 800_000;
  async function call(name: string, options: CallOptions = {}): Promise<OperationResponse> {
    const definition = operationDefinition(name);
    sequence += 1;
    return app.run({
      definition,
      params: options.params ?? {},
      body: syntheticCapabilityRequestBody(options.body ?? {}),
      authorization: options.secret
        ? `Bearer ${syntheticCapabilitySecret(options.secret)}`
        : definition.actor === "room_operator"
          ? `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`
          : null,
      syntheticActor: ["controller", "curator", "room_operator"].includes(definition.actor)
        ? definition.actor
        : null,
      idempotencyKey: definition.mutating
        ? options.idempotencyKey ?? sequence.toString(16).padStart(32, "0")
        : null,
      expectedVersion: options.expectedVersion !== undefined
        ? options.expectedVersion
        : definition.expectedVersion
          ? 1
          : null,
      syntheticClientBucket: options.clientBucket ?? "synthetic-hardening-client",
    });
  }
  return {
    app,
    store,
    call,
    advance(milliseconds: number): void { now = new Date(now.getTime() + milliseconds); },
  };
}

class BlockingProvider implements FakeNotificationProvider {
  readonly handoffs: FakeNoticeHandoff[] = [];
  readonly entered: Promise<void>;
  #markEntered: () => void = () => undefined;
  #release: () => void = () => undefined;
  readonly #released: Promise<void>;
  readonly #result: "accepted" | "unknown";

  constructor(result: "accepted" | "unknown" = "accepted") {
    this.#result = result;
    this.entered = new Promise<void>((resolve) => { this.#markEntered = resolve; });
    this.#released = new Promise<void>((resolve) => { this.#release = resolve; });
  }

  release(): void { this.#release(); }

  async handoff(input: FakeNoticeHandoff): Promise<"accepted" | "unknown"> {
    this.handoffs.push(structuredClone(input));
    this.#markEntered();
    await this.#released;
    return this.#result;
  }

  async reconcile(): Promise<"not_accepted"> { return "not_accepted"; }
}

async function semanticError(work: Promise<unknown>, code: string, status?: number): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

async function issueEncounter(
  instance: ReturnType<typeof harness>,
  label: string,
  clientBucket = "synthetic-hardening-client",
): Promise<string> {
  const secret = `encounter_${label}_secret_000000000001`;
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: secret },
    expectedVersion: 1,
    clientBucket,
  });
  return secret;
}

function interactionBody(label: string, interactionType: "ask" | "seed" | "resonance" = "ask") {
  return {
    projectionId: PUBLIC_PROJECTION_ID,
    interactionType,
    consent: "allow_owner_local_ai",
    replySecret: `reply_${label}_secret_0000000000000001`,
    deleteSecret: `delete_${label}_secret_00000000000001`,
    requestBody: `Synthetic hardening request ${label}.`,
    guestCapsule: null,
  } as const;
}

async function createInteraction(
  instance: ReturnType<typeof harness>,
  label: string,
  clientBucket = `synthetic-${label}`,
): Promise<{ interactionId: string; replySecret: string; deleteSecret: string }> {
  const encounterSecret = await issueEncounter(instance, label, clientBucket);
  const body = interactionBody(label);
  const created = await instance.call("interaction.create", { secret: encounterSecret, body });
  return {
    interactionId: created.body.interactionId as string,
    replySecret: body.replySecret,
    deleteSecret: body.deleteSecret,
  };
}

function responseDelivery(
  instance: ReturnType<typeof harness>,
  interactionId: string,
  label: string,
  expiresAt = "2026-08-04T12:00:00.000Z",
  sourceDisclosureClass: ResponseCandidateV1["sourceDisclosureClass"] = "manual_owner_authored",
): Record<string, unknown> {
  const candidatePreimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: `candidate_${label}0000000000000000`,
    interactionId,
    sessionEnvelopeId: sourceDisclosureClass === "manual_owner_authored" ? null : `session_${label}000000000000000000`,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    originState: "published_fresh",
    responseText: `Synthetic response ${label}.`,
    sourceDisclosureClass,
    twinBasisHash: canonicalSha256(`twin:${label}`),
    snapshotManifestHash: sourceDisclosureClass === "manual_owner_authored" ? null : canonicalSha256(`snapshot:${label}`),
    sessionReceiptHash: canonicalSha256(`receipt:${label}`),
    policyHash: canonicalSha256(`policy:${label}`),
    admittedAt: T0,
    expiresAt,
  };
  const candidate: ResponseCandidateV1 = {
    ...candidatePreimage,
    candidateHash: canonicalSha256(candidatePreimage),
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${label}000000000000000`,
    artifactClass: "response",
    artifactHash: candidate.candidateHash,
    roomId: PUBLIC_ROOM_ID,
    projectionId: PUBLIC_PROJECTION_ID,
    interactionId,
    basisHash: candidate.twinBasisHash,
    policyHash: candidate.policyHash,
    approvedAt: T0,
    expiresAt: "2026-08-03T13:00:00.000Z",
    operationId: `op_${label}000000000000000000000`,
  };
  const interaction = instance.store.interaction(interactionId);
  assert.ok(interaction);
  return signedResponseDeliveryBody({
    candidate,
    approval,
    parentInteractionExpiresAt: interaction.interaction.expiresAt,
  });
}

async function readyNoticeFixture(provider?: FakeNotificationProvider) {
  const instance = harness(provider);
  fixtureSerial += 1;
  const interaction = await createInteraction(instance, `worker_${fixtureSerial.toString().padStart(4, "0")}`);
  await instance.call("notification.set", {
    params: { interactionId: interaction.interactionId },
    secret: interaction.replySecret,
    expectedVersion: 1,
    body: { email: "worker-race@example.invalid" },
  });
  await instance.call("notification.verify", {
    params: { interactionId: interaction.interactionId },
    secret: interaction.replySecret,
    expectedVersion: 2,
    body: { code: "000000" },
  });
  const label = interaction.interactionId.slice(-12);
  await instance.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: responseDelivery(instance, interaction.interactionId, label),
  });
  const responseId = instance.store.interaction(interaction.interactionId)?.response?.responseId;
  assert.ok(responseId);
  return { ...instance, ...interaction, responseId };
}

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

function assertNoRecoveryDigest(value: unknown): void {
  const wire = serialized(value);
  for (const key of ["secretDigest", "replyCapabilityDigest", "deleteCapabilityDigest", "pairingCodeDigest"]) {
    assert.equal(wire.includes(key), false, `${key} must not cross this response boundary`);
  }
}

test("public rate analogue enforces 10/hour, 50/day, changed-bucket idempotency conflict, and Room-scoped digests", async () => {
  const instance = harness();
  const bucket = "same-client-rate-boundary";
  for (let batch = 0; batch < 5; batch += 1) {
    for (let index = 0; index < 10; index += 1) {
      await issueEncounter(instance, `rate_${batch}_${index}`, bucket);
    }
    if (batch === 0) {
      await semanticError(issueEncounter(instance, "rate_hour_11", bucket), "public_encounter_hourly_limited", 429);
    }
    if (batch < 4) instance.advance(60 * 60 * 1_000 + 1);
  }
  instance.advance(60 * 60 * 1_000 + 1);
  await semanticError(issueEncounter(instance, "rate_day_51", bucket), "public_encounter_daily_limited", 429);

  const replayKey = "abababababababababababababababab";
  await instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: "rate_idempotency_secret_00000000001" },
    expectedVersion: 1,
    clientBucket: "rate-idempotency-a",
    idempotencyKey: replayKey,
  });
  await semanticError(instance.call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: "rate_idempotency_secret_00000000001" },
    expectedVersion: 1,
    clientBucket: "rate-idempotency-b",
    idempotencyKey: replayKey,
  }), "idempotency_conflict", 409);

  const rate = new SyntheticPublicRateControl(instance.store);
  assert.notEqual(
    rate.bucketDigest(PUBLIC_ROOM_ID, "same-browser"),
    rate.bucketDigest(SYNTHETIC_PRIVATE_ROOM_ID, "same-browser"),
    "the same coarse input cannot become a cross-Room correlator",
  );
  const persisted = serialized(instance.store.auxiliaryEntries("public_rate:"));
  assert.equal(persisted.includes(bucket), false, "raw coarse bucket is never retained");
});

test("one coarse public bucket accepts at most three Interactions per day while the Room pool remains independent", async () => {
  const instance = harness();
  const bucket = "same-client-accept-boundary";
  for (let index = 1; index <= 3; index += 1) {
    const created = await createInteraction(instance, `accept_${index}`, bucket);
    await instance.call("interaction.close", {
      params: { interactionId: created.interactionId },
      expectedVersion: 1,
    });
  }
  const fourthSecret = await issueEncounter(instance, "accept_4", bucket);
  await semanticError(instance.call("interaction.create", {
    secret: fourthSecret,
    body: interactionBody("accept_4"),
  }), "public_accept_daily_limited", 429);
  assert.equal(instance.store.publicAcceptedCountSince(PUBLIC_ROOM_ID, "2026-08-02T12:00:00.000Z"), 3);
});

type DestructiveRace = "delete" | "remove" | "revoke";

async function commitDestructive(
  fixture: Awaited<ReturnType<typeof readyNoticeFixture>>,
  kind: DestructiveRace,
): Promise<OperationResponse> {
  if (kind === "delete") {
    return fixture.call("interaction.delete", {
      params: { interactionId: fixture.interactionId },
      secret: fixture.deleteSecret,
      expectedVersion: 2,
    });
  }
  if (kind === "remove") {
    return fixture.call("notification.remove", {
      params: { interactionId: fixture.interactionId },
      secret: fixture.replySecret,
      expectedVersion: 3,
    });
  }
  return fixture.call("response.revoke", {
    params: { responseId: fixture.responseId },
    expectedVersion: 1,
  });
}

test("notification claim commits before provider I/O so delete/remove/revoke can purge a submitting target", async () => {
  for (const kind of ["delete", "remove", "revoke"] as const) {
    const destructiveFirst = await readyNoticeFixture();
    await commitDestructive(destructiveFirst, kind);
    const afterTerminal = await destructiveFirst.app.runNotifyOnce();
    assert.equal(afterTerminal.outcome, "idle", `${kind}-first must prevent a later handoff`);

    const provider = new BlockingProvider("unknown");
    const workerFirst = await readyNoticeFixture(provider);
    const worker = workerFirst.app.runNotifyOnce();
    await provider.entered;
    await commitDestructive(workerFirst, kind);
    const duringHandoff = workerFirst.app.notificationInspection(workerFirst.interactionId).notice;
    assert.deepEqual({
      state: duringHandoff?.state,
      target: duringHandoff?.encryptedDeliveryTarget,
      retry: duringHandoff?.noFutureRetry,
    }, {
      state: "delivery_unknown",
      target: null,
      retry: true,
    }, `${kind} commits while provider I/O is blocked`);
    provider.release();
    const workerResult = await worker;
    assert.equal(workerResult.outcome, "delivery_unknown");
    assert.equal(provider.handoffs.length, 1);
    assert.equal(workerFirst.app.notificationInspection(workerFirst.interactionId).notice?.state, "delivery_unknown");
  }
});

test("late authenticated notification result only refines body-free evidence after a destructive handoff race", async () => {
  const blockingProvider = new BlockingProvider("unknown");
  const blocked = await readyNoticeFixture(blockingProvider);
  const worker = blocked.app.runNotifyOnce();
  await blockingProvider.entered;
  await commitDestructive(blocked, "delete");
  const bodyFree = blocked.app.notificationInspection(blocked.interactionId).notice;
  assert.deepEqual({ state: bodyFree?.state, target: bodyFree?.encryptedDeliveryTarget, retry: bodyFree?.noFutureRetry }, {
    state: "delivery_unknown",
    target: null,
    retry: true,
  });
  blockingProvider.release();
  assert.equal((await worker).outcome, "delivery_unknown");
  assert.equal((await blocked.app.applyLateNotificationResult(blocked.interactionId, "accepted")).state, "provider_accepted");

  for (const lateFirst of [true, false]) {
    const instance = await readyNoticeFixture(new FakeNotificationProviderSpy("unknown"));
    assert.equal((await instance.app.runNotifyOnce()).outcome, "delivery_unknown");
    if (lateFirst) {
      const [refined] = await Promise.all([
        instance.app.applyLateNotificationResult(instance.interactionId, "accepted"),
        commitDestructive(instance, "delete"),
      ]);
      assert.equal(refined.state, "provider_accepted");
    } else {
      const [, refined] = await Promise.all([
        commitDestructive(instance, "delete"),
        instance.app.applyLateNotificationResult(instance.interactionId, "accepted"),
      ]);
      assert.equal(refined.state, "provider_accepted");
    }
    assert.equal(instance.app.notificationInspection(instance.interactionId).notice?.state, "provider_accepted");
    assert.equal(instance.app.notificationInspection(instance.interactionId).endpoint.state, "cleared");
  }
});

test("notification endpoint version serializes set/set and set/remove without stale last-write-wins", async () => {
  const instance = harness();
  const interaction = await createInteraction(instance, "notification_version_race");
  const firstRace = await Promise.allSettled([
    instance.call("notification.set", {
      params: { interactionId: interaction.interactionId },
      secret: interaction.replySecret,
      expectedVersion: 1,
      idempotencyKey: "notificationsetraceaaaaaaaaaaaaaa",
      body: { email: "set-a@example.invalid" },
    }),
    instance.call("notification.set", {
      params: { interactionId: interaction.interactionId },
      secret: interaction.replySecret,
      expectedVersion: 1,
      idempotencyKey: "notificationsetracebbbbbbbbbbbbbb",
      body: { email: "set-b@example.invalid" },
    }),
  ]);
  assert.equal(firstRace.filter((result) => result.status === "fulfilled").length, 1);
  const firstRejected = firstRace.find((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.ok(firstRejected?.reason instanceof SemanticError);
  assert.equal((firstRejected.reason as SemanticError).code, "version_conflict");
  assert.equal(instance.app.notificationInspection(interaction.interactionId).endpoint.version, 2);
  await semanticError(instance.call("notification.remove", {
    params: { interactionId: interaction.interactionId },
    secret: interaction.replySecret,
    expectedVersion: 1,
  }), "version_conflict", 409);

  await instance.call("notification.verify", {
    params: { interactionId: interaction.interactionId },
    secret: interaction.replySecret,
    expectedVersion: 2,
    body: { code: "000000" },
  });
  const secondRace = await Promise.allSettled([
    instance.call("notification.set", {
      params: { interactionId: interaction.interactionId },
      secret: interaction.replySecret,
      expectedVersion: 3,
      idempotencyKey: "notificationsetreplaceraceaaaaaaa",
      body: { email: "replacement@example.invalid" },
    }),
    instance.call("notification.remove", {
      params: { interactionId: interaction.interactionId },
      secret: interaction.replySecret,
      expectedVersion: 3,
      idempotencyKey: "notificationremoveracebbbbbbbbbb",
    }),
  ]);
  assert.equal(secondRace.filter((result) => result.status === "fulfilled").length, 1);
  const secondRejected = secondRace.find((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.ok(secondRejected?.reason instanceof SemanticError);
  assert.equal((secondRejected.reason as SemanticError).code, "version_conflict");
  assert.equal(instance.app.notificationInspection(interaction.interactionId).endpoint.version, 4);
});

test("Interaction and Response clocks deny body reads before janitor, and notification enrollment is live-state only", async () => {
  const responseExpiry = harness();
  const ready = await createInteraction(responseExpiry, "response_clock");
  await responseExpiry.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: responseDelivery(responseExpiry, ready.interactionId, "responseclock"),
  });
  responseExpiry.advance(24 * 60 * 60 * 1_000 + 1);
  const guest = await responseExpiry.call("interaction.read", {
    params: { interactionId: ready.interactionId },
    secret: ready.replySecret,
  });
  const guestView = guest.body.interaction as Record<string, unknown>;
  assert.equal(guestView.response, null);
  assert.equal(guestView.responseState, "response_expired");
  const owner = await responseExpiry.call("control.interaction.read", { params: { interactionId: ready.interactionId } });
  assert.equal(owner.body.response, null);
  await semanticError(responseExpiry.call("notification.set", {
    params: { interactionId: ready.interactionId },
    secret: ready.replySecret,
    expectedVersion: 1,
    body: { email: "expired-response@example.invalid" },
  }), "notification_not_eligible", 410);

  const interactionExpiry = harness();
  const expiring = await createInteraction(interactionExpiry, "interaction_clock");
  const pending = await interactionExpiry.call("notification.set", {
    params: { interactionId: expiring.interactionId },
    secret: expiring.replySecret,
    expectedVersion: 1,
    body: { email: "interaction-expiry@example.invalid" },
  });
  assert.equal(pending.status, 202);
  interactionExpiry.advance(30 * 24 * 60 * 60 * 1_000 + 1);
  await semanticError(interactionExpiry.call("interaction.read", {
    params: { interactionId: expiring.interactionId },
    secret: expiring.replySecret,
  }), "not_found", 404);
  await semanticError(interactionExpiry.call("control.interaction.read", {
    params: { interactionId: expiring.interactionId },
  }), "not_found", 404);
  await semanticError(interactionExpiry.call("notification.verify", {
    params: { interactionId: expiring.interactionId },
    secret: expiring.replySecret,
    expectedVersion: 2,
    body: { code: "000000" },
  }), "interaction_expired", 410);
  assert.notEqual(instanceBody(instanceInteraction(interactionExpiry, expiring.interactionId)), "[purged]", "read denial precedes scheduled physical purge");

  const closed = harness();
  const closedInteraction = await createInteraction(closed, "notification_closed");
  await closed.call("interaction.close", { params: { interactionId: closedInteraction.interactionId }, expectedVersion: 1 });
  await semanticError(closed.call("notification.set", {
    params: { interactionId: closedInteraction.interactionId },
    secret: closedInteraction.replySecret,
    expectedVersion: 2,
    body: { email: "closed@example.invalid" },
  }), "notification_not_eligible", 410);
});

function instanceInteraction(instance: ReturnType<typeof harness>, interactionId: string) {
  const stored = instance.store.interaction(interactionId);
  assert.ok(stored);
  return stored;
}

function instanceBody(stored: ReturnType<typeof instanceInteraction>): string {
  return stored.interaction.requestText;
}

test("Projection-supported Interaction set is enforced and exact rendered consent hashes enter the immutable envelope", async () => {
  const instance = harness();
  const stored = instance.store.projection(PUBLIC_PROJECTION_ID);
  assert.ok(stored);
  const { payloadHash: _oldHash, ...preimage } = stored.projection;
  stored.projection = projectionWithPayloadHash({ ...preimage, supportedInteractions: ["ask"] });
  instance.store.saveProjection(stored);

  const unsupportedSecret = await issueEncounter(instance, "unsupported", "unsupported-client");
  await semanticError(instance.call("interaction.create", {
    secret: unsupportedSecret,
    body: interactionBody("unsupported", "seed"),
  }), "interaction_type_not_supported", 409);

  const accepted = await createInteraction(instance, "consent_exact", "consent-client");
  const envelope = instance.store.interaction(accepted.interactionId)?.interaction.consentEnvelope;
  assert.ok(envelope);
  assert.deepEqual({
    providerPolicyUrl: envelope.providerPolicyUrl,
    providerPolicyHash: envelope.providerPolicyHash,
    providerRetentionDisclosureHash: envelope.providerRetentionDisclosureHash,
    backupRetentionDisclosureHash: envelope.backupRetentionDisclosureHash,
    consentCopyHash: envelope.consentCopyHash,
  }, {
    providerPolicyUrl: SYNTHETIC_PROVIDER_POLICY_URL,
    providerPolicyHash: SYNTHETIC_PROVIDER_POLICY_HASH,
    providerRetentionDisclosureHash: SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE_HASH,
    backupRetentionDisclosureHash: SYNTHETIC_BACKUP_RETENTION_DISCLOSURE_HASH,
    consentCopyHash: SYNTHETIC_CONSENT_COPY_HASH,
  });
});

test("Grant and replacement effective expiry is capped by the exact Projection expiry", async () => {
  const instance = harness();
  const stored = instance.store.projection(PUBLIC_PROJECTION_ID);
  assert.ok(stored);
  const projectionExpiry = "2026-08-05T12:00:00.000Z";
  const { payloadHash: _oldHash, ...preimage } = stored.projection;
  stored.projection = projectionWithPayloadHash({ ...preimage, expiresAt: projectionExpiry });
  instance.store.saveProjection(stored);

  const issued = await instance.call("grant.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret: "grant_projection_cap_secret_00000001",
      permitsAgentDerivative: false,
      reentryChainId: "chain_projectionexpirycap000000001",
    },
  });
  const first = issued.body.grant as GrantV1;
  assert.equal(first.expiresAt, projectionExpiry);
  const replacement = await instance.call("grant.replace", {
    params: { grantId: first.grantId },
    expectedVersion: 1,
    body: {
      presetId: "trusted_collaborator",
      grantSecret: "grant_projection_cap_replacement_001",
      permitsAgentDerivative: true,
    },
  });
  assert.equal((replacement.body.grant as GrantV1).expiresAt, projectionExpiry);
});

test("D07 two concurrent replacements from one prior Grant commit exactly one successor", async () => {
  const instance = harness();
  const chain = "chain_concurrentreplacement0000001";
  const issued = await instance.call("grant.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret: "concurrent-prior-grant",
      permitsAgentDerivative: false,
      reentryChainId: chain,
    },
  });
  const prior = issued.body.grant as GrantV1;
  const before = instance.store.eventsAfter(PUBLIC_ROOM_ID, 0);
  const results = await Promise.allSettled([
    instance.call("grant.replace", {
      params: { grantId: prior.grantId },
      expectedVersion: 1,
      idempotencyKey: "replacewinnercandidateaaaaaaaaaaaa",
      body: {
        presetId: "trusted_collaborator",
        grantSecret: "concurrent-successor-a",
        permitsAgentDerivative: true,
      },
    }),
    instance.call("grant.replace", {
      params: { grantId: prior.grantId },
      expectedVersion: 1,
      idempotencyKey: "replacewinnercandidatebbbbbbbbbbbb",
      body: {
        presetId: "short_exchange",
        grantSecret: "concurrent-successor-b",
        permitsAgentDerivative: false,
      },
    }),
  ]);
  const committed = results.filter((result): result is PromiseFulfilledResult<OperationResponse> => result.status === "fulfilled");
  const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.equal(committed.length, 1);
  assert.equal(committed[0]?.value.status, 201);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0]?.reason instanceof SemanticError);
  assert.equal((rejected[0]?.reason as SemanticError).code, "grant_not_replaceable");
  assert.equal(instance.store.capability(prior.grantId)?.value.state, "replaced");
  const live = instance.store.capabilities().filter((capability) => capability.kind === "grant"
    && capability.value.reentryChainId === chain
    && (capability.value.state === "issued" || capability.value.state === "consumed"));
  assert.equal(live.length, 1);
  const successor = live[0];
  assert.ok(successor && successor.kind === "grant");
  assert.equal(successor.value.acceptedCount, 0, "replacement transfers no accepted quota");
  const after = instance.store.eventsAfter(PUBLIC_ROOM_ID, 0).slice(before.length);
  assert.equal(after.filter((event) => event.eventType === "grant.replaced" && event.objectId === prior.grantId).length, 1);
  assert.equal(after.filter((event) => event.eventType === "grant.issued" && event.objectId === successor.value.grantId).length, 1);
});

test("D12 admission requires the exact current clock-fresh public Projection while unlisting remains independently monotonic", async () => {
  const clockStale = harness();
  clockStale.advance(24 * 60 * 60 * 1_000);
  await semanticError(clockStale.call("curation.admit", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  }), "projection_not_admissible", 409);
  assert.equal((await clockStale.call("curation.unlist", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  })).status, 200, "stale public material can still be monotonically unlisted");

  const superseded = harness();
  const supersededRoom = superseded.store.room(PUBLIC_ROOM_ID);
  assert.ok(supersededRoom);
  superseded.store.saveRoom({ ...supersededRoom, room: { ...supersededRoom.room, currentProjectionId: PRIVATE_PROJECTION_ID } });
  await semanticError(superseded.call("curation.admit", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  }), "projection_not_admissible", 409);

  const retired = harness();
  const retiredRoom = retired.store.room(PUBLIC_ROOM_ID);
  assert.ok(retiredRoom);
  retired.store.saveRoom({ ...retiredRoom, room: { ...retiredRoom.room, status: "retired", retiredAt: T0 } });
  await semanticError(retired.call("curation.admit", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
  }), "projection_not_admissible", 409);

  const privateRoom = harness();
  await semanticError(privateRoom.call("curation.admit", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    expectedVersion: 1,
  }), "projection_not_admissible", 409);
});

test("all hosted capability and Interaction response lanes are digest-free; raw bearers never enter JSON, HTML, errors, or synthetic storage", async () => {
  const instance = harness();
  const encounterSecret = await issueEncounter(instance, "canary", "canary-client-bucket");
  const grantSecret = "grant_raw_canary_secret_0000000001";
  const grant = await instance.call("grant.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "familiar_collaborator",
      grantSecret,
      permitsAgentDerivative: true,
      reentryChainId: "chain_redactioncanary00000000001",
    },
  });
  const agentSecret = "agent_raw_canary_secret_0000000001";
  const manualReplySecret = "manual_reply_raw_canary_00000000001";
  const manualDeleteSecret = "manual_delete_raw_canary_000000001";
  const derivative = await instance.call("agent_derivative.mint", {
    secret: grantSecret,
    body: { agentSecret, replySecret: manualReplySecret, deleteSecret: manualDeleteSecret },
  });
  const inviteSecret = "invite_raw_canary_secret_000000001";
  const invite = await instance.call("direct_invite.issue", {
    body: {
      roomId: PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      presetId: "short_exchange",
      inviteSecret,
      acceptanceExpiresAt: "2026-08-04T12:00:00.000Z",
      offeredGrantExpiresAt: "2026-08-06T12:00:00.000Z",
    },
  });
  for (const response of [grant, derivative, invite]) assertNoRecoveryDigest(response.body);

  const body = interactionBody("redaction_wire");
  const created = await instance.call("interaction.create", { secret: encounterSecret, body });
  const interactionId = created.body.interactionId as string;
  const guest = await instance.call("interaction.read", { params: { interactionId }, secret: body.replySecret });
  const owner = await instance.call("control.interaction.read", { params: { interactionId } });
  const ownerStatus = await instance.call("control.status");
  for (const response of [guest, owner, ownerStatus]) assertNoRecoveryDigest(response.body);
  assert.equal("requestText" in (guest.body.interaction as Record<string, unknown>), false);

  const rawCanaries = [
    encounterSecret,
    grantSecret,
    agentSecret,
    manualReplySecret,
    manualDeleteSecret,
    inviteSecret,
    body.replySecret,
    body.deleteSecret,
    "canary-client-bucket",
  ];
  const protectedStorage = serialized({
    capabilities: instance.store.capabilities(),
    auxiliary: instance.store.auxiliaryEntries(""),
    interaction: instance.store.interaction(interactionId),
    ownerStatus: instance.store.ownerStatus(),
  });
  for (const canary of rawCanaries) assert.equal(protectedStorage.includes(canary), false, `raw canary leaked: ${canary}`);

  await assert.rejects(instance.call("interaction.read", {
    params: { interactionId },
    secret: "wrong_raw_error_canary_000000000001",
  }), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(serialized({ code: error.code, message: error.message }).includes("wrong_raw_error_canary"), false);
    return true;
  });

  const publicList = await instance.call("third_place.list");
  assert.doesNotMatch(serialized(publicList.body), /Forme Private Room|public familiarity never implies private access/u);
  const publicPage = readFileSync(new URL("../../apps/room/app/p/[projectionId]/page.tsx", import.meta.url), "utf8");
  const guestPage = readFileSync(new URL("../../apps/room/app/g/[interactionId]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(`${publicPage}\n${guestPage}`, /secretDigest|replyCapabilityDigest|deleteCapabilityDigest/u);
});

test("P03 hosted surface × canary matrix keeps private bodies, credentials, notification plaintext, and local basis on their named lanes", async () => {
  const provider = new FakeNotificationProviderSpy();
  const instance = harness(provider);
  const requestCanary = "P03_GUEST_REQUEST_PRIVATE_CANARY_31e2";
  const capsuleCanary = "P03_GUEST_CAPSULE_PRIVATE_CANARY_b284";
  const privateRequestCanary = "P03_CROSS_ROOM_PRIVATE_BODY_CANARY_42d9";
  const privateCapsuleCanary = "P03_CROSS_ROOM_CAPSULE_CANARY_c736";
  const privateBasisCanary = "P03_LOCAL_PRIVATE_BASIS_CANARY_ef11";
  const addressCanary = "p03-address-canary-19af@example.invalid";
  const logLines: string[] = [];
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const priorMode = process.env.FORME_R4_SYNTHETIC;
  const runtime = globalThis as typeof globalThis & { __formeR4SyntheticApplication?: HostedRoomApplication };
  const priorApplication = runtime.__formeR4SyntheticApplication;
  console.log = (...values: unknown[]) => { logLines.push(serialized(values)); };
  console.warn = (...values: unknown[]) => { logLines.push(serialized(values)); };
  console.error = (...values: unknown[]) => { logLines.push(serialized(values)); };
  process.env.FORME_R4_SYNTHETIC = "1";
  runtime.__formeR4SyntheticApplication = instance.app;
  try {
    const encounterLabel = await issueEncounter(instance, "p03_matrix", "p03-matrix-bucket");
    const publicBody = {
      ...interactionBody("p03_matrix"),
      requestBody: requestCanary,
      guestCapsule: {
        schemaVersion: "guest_capsule.v1",
        level: "g1_lightweight",
        pseudonym: "P03 guest",
        currentFocus: capsuleCanary,
        offer: null,
        seek: "One bounded response",
        openQuestion: null,
        declaredSourceClass: null,
        scopeLabel: null,
        freshnessAt: null,
        guestSchemaVersion: null,
        consentStatement: null,
      },
    } as const;
    const created = await instance.call("interaction.create", { secret: encounterLabel, body: publicBody });
    const interactionId = created.body.interactionId as string;
    const guest = await instance.call("interaction.read", { params: { interactionId }, secret: publicBody.replySecret });
    const ownerStatus = await instance.call("control.status");
    const exactOwner = await instance.call("control.interaction.read", { params: { interactionId } });
    const exactPull = await instance.call("room_operator.pull", {
      params: { interactionId },
      expectedVersion: 1,
      idempotencyKey: "p03matrixprotectedpull000000001",
    });
    assert.equal(serialized(exactOwner.body).includes(requestCanary), true, "exact Owner detail is an allowed private lane");
    assert.equal(serialized(exactOwner.body).includes(capsuleCanary), true);
    assert.equal(serialized(exactPull.body).includes(requestCanary), true, "exact-Room operator pull is an allowed protected lane");
    assert.equal(serialized(exactPull.body).includes(capsuleCanary), true);

    const notification = await instance.call("notification.set", {
      params: { interactionId },
      secret: publicBody.replySecret,
      expectedVersion: 1,
      idempotencyKey: "p03matrixnotificationset0000001",
      body: { email: addressCanary },
    });
    const verificationCode = (notification.body.syntheticVerification as { code: string }).code;
    assert.equal(verificationCode, "000000", "the synthetic response is the one explicit plaintext-code allowance");
    assert.equal(serialized(notification.body).includes(addressCanary), false);
    await instance.app.runVerificationNotifyOnce();
    assert.equal(provider.handoffs.length, 1);
    assert.equal(provider.handoffs[0]?.encryptedDeliveryTarget.includes(addressCanary), false);
    assert.notEqual(provider.handoffs[0]?.encryptedVerificationCode, verificationCode);
    await instance.call("notification.verify", {
      params: { interactionId },
      secret: publicBody.replySecret,
      expectedVersion: 2,
      idempotencyKey: "p03matrixnotificationverify00001",
      body: { code: verificationCode },
    });

    const privateGrantLabel = "p03_private_room_grant_secret";
    await instance.call("grant.issue", {
      body: {
        roomId: SYNTHETIC_PRIVATE_ROOM_ID,
        projectionId: PRIVATE_PROJECTION_ID,
        presetId: "one_visit",
        grantSecret: privateGrantLabel,
        permitsAgentDerivative: false,
        reentryChainId: "chain_p03_private_room_000000001",
      },
    });
    const privateBody = {
      projectionId: PRIVATE_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: privateRequestCanary,
      replySecret: "p03_private_reply_secret",
      deleteSecret: "p03_private_delete_secret",
      guestCapsule: {
        ...publicBody.guestCapsule,
        currentFocus: privateCapsuleCanary,
      },
    } as const;
    const privateCreated = await instance.call("interaction.create", { secret: privateGrantLabel, body: privateBody });
    const privateInteractionId = privateCreated.body.interactionId as string;
    const privateOwner = await instance.call("control.interaction.read", { params: { interactionId: privateInteractionId } });
    assert.equal(serialized(privateOwner.body).includes(privateRequestCanary), true);
    assert.equal(serialized(privateOwner.body).includes(privateCapsuleCanary), true);
    await semanticError(instance.call("room_operator.pull", {
      params: { interactionId: privateInteractionId },
      expectedVersion: 1,
    }), "not_found", 404);

    await semanticError(instance.call("room_operator.response.deliver", {
      expectedVersion: 2,
      body: { ...responseDelivery(instance, interactionId, "p03matrix"), privateBasis: privateBasisCanary },
    }), "invalid_request_shape", 400);

    const wrongBearer = syntheticCapabilitySecret("p03_wrong_bearer_error_canary");
    const errorResponse = await dispatchApi(new Request(
      `http://forme.invalid/api/v1/interactions/${interactionId}`,
      { headers: { authorization: `Bearer ${wrongBearer}` } },
    ), ["interactions", interactionId]);
    assert.equal(errorResponse.status, 404);
    const errorWire = await errorResponse.text();

    const thirdPlaceWire = await (await dispatchApi(
      new Request("http://forme.invalid/api/v1/third-place"),
      ["third-place"],
    )).text();
    const ProjectionPage = createProjectionPage(() => createElement("div", { "data-testid": "p03-guest-ask" }));
    const publicHtml = renderToStaticMarkup(await ProjectionPage({ params: Promise.resolve({ projectionId: PUBLIC_PROJECTION_ID }) }));
    const publicSurfaces = serialized({
      createReceipt: created.body,
      privateCreateReceipt: privateCreated.body,
      guestStatus: guest.body,
      ownerStatus: ownerStatus.body,
      thirdPlaceWire,
      publicHtml,
      errorWire,
      logs: logLines,
      idempotency: instance.store.idempotencyEntries(),
    });
    for (const canary of [
      requestCanary,
      capsuleCanary,
      privateRequestCanary,
      privateCapsuleCanary,
      privateBasisCanary,
      addressCanary,
    ]) assert.equal(publicSurfaces.includes(canary), false, `private canary escaped onto a denied surface: ${canary}`);

    const credentialCanaries = [
      syntheticCapabilitySecret(encounterLabel),
      syntheticCapabilitySecret(publicBody.replySecret),
      syntheticCapabilitySecret(publicBody.deleteSecret),
      syntheticCapabilitySecret(privateGrantLabel),
      syntheticCapabilitySecret(privateBody.replySecret),
      syntheticCapabilitySecret(privateBody.deleteSecret),
      wrongBearer,
    ];
    const hostedStorage = serialized({
      capabilities: instance.store.capabilities(),
      interactions: instance.store.interactions(),
      notification: instance.store.notification(interactionId),
      auxiliary: instance.store.auxiliaryEntries(""),
      idempotency: instance.store.idempotencyEntries(),
    });
    for (const canary of credentialCanaries) {
      assert.equal(hostedStorage.includes(canary), false, `raw credential entered hosted storage: ${canary}`);
      assert.equal(publicSurfaces.includes(canary), false, `raw credential entered public/error/HTML/log surface: ${canary}`);
    }
    assert.equal(hostedStorage.includes(addressCanary), false, "notification address is sealed rather than stored as plaintext");
    assert.equal(instance.store.notification(interactionId).endpoint.encryptedAddress?.includes(addressCanary), false);
    assert.equal(errorWire.includes(wrongBearer), false);
  } finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    if (priorMode === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = priorMode;
    if (priorApplication) runtime.__formeR4SyntheticApplication = priorApplication;
    else delete runtime.__formeR4SyntheticApplication;
  }
});

test("HTTP maps the synthetic coarse bucket header but never reflects bucket, bearer, or keyed digest", async () => {
  const previous = process.env.FORME_R4_SYNTHETIC;
  process.env.FORME_R4_SYNTHETIC = "1";
  const encounterSecret = syntheticCapabilitySecret("http_encounter_raw_canary_000000001");
  const bucket = "http-client-bucket-raw-canary";
  try {
    const response = await dispatchApi(new Request(
      `http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}/encounters`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
          "if-match": "1",
          "x-forme-synthetic-client-bucket": bucket,
        },
        body: JSON.stringify({ encounterSecret }),
      },
    ), ["projections", PUBLIC_PROJECTION_ID, "encounters"]);
    assert.equal(response.status, 201);
    const wire = await response.text();
    assert.equal(wire.includes(encounterSecret), false);
    assert.equal(wire.includes(bucket), false);
    assert.equal(wire.includes("secretDigest"), false);

    const error = await dispatchApi(new Request(
      "http://forme.invalid/api/v1/interactions/interaction_missing000000000000001",
      { headers: { authorization: "Bearer wrong_http_raw_canary_00000000001" } },
    ), ["interactions", "interaction_missing000000000000001"]);
    const errorWire = await error.text();
    assert.equal(error.status, 404);
    assert.equal(errorWire.includes("wrong_http_raw_canary"), false);
  } finally {
    if (previous === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previous;
  }
});

test("Private Projection read keeps an exhausted Grant live for read and requires explicit same-chain replacement", async () => {
  const instance = harness();
  const parentSecret = "private-parent-one-visit";
  const issued = await instance.call("grant.issue", {
    body: {
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      projectionId: PRIVATE_PROJECTION_ID,
      presetId: "one_visit",
      grantSecret: parentSecret,
      permitsAgentDerivative: true,
      reentryChainId: "chain_private_derivative_read_00001",
    },
  });
  const grant = issued.body.grant as GrantV1;
  const readAgentSecret = "private-read-agent";
  await instance.call("agent_derivative.mint", {
    secret: parentSecret,
    body: {
      agentSecret: readAgentSecret,
      replySecret: "private-read-reply",
      deleteSecret: "private-read-delete",
    },
  });
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: readAgentSecret,
  })).status, 200);

  const submitAgentSecret = "private-submit-agent";
  await instance.call("agent_derivative.mint", {
    secret: parentSecret,
    body: {
      agentSecret: submitAgentSecret,
      replySecret: "private-submit-reply",
      deleteSecret: "private-submit-delete",
    },
  });

  const created = await instance.call("interaction.create", {
    secret: submitAgentSecret,
    body: {
      projectionId: PRIVATE_PROJECTION_ID,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Use the exact private derivative once.",
      replySecret: "agent-decoy-reply",
      deleteSecret: "agent-decoy-delete",
      guestCapsule: null,
    },
  });
  assert.equal(instance.store.capability(grant.grantId)?.value.state, "consumed");
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: parentSecret,
  })).status, 200, "quota exhaustion terminates submit but not exact private read");
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: readAgentSecret,
  })).status, 200, "an unused live derivative follows the consumed parent's remaining read authority");
  await semanticError(instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: submitAgentSecret,
  }), "not_found", 404);
  await instance.call("interaction.close", {
    params: { interactionId: created.body.interactionId as string },
    expectedVersion: 1,
  });
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: parentSecret,
  })).status, 200);
  await semanticError(instance.call("grant.issue", {
    body: {
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      projectionId: PRIVATE_PROJECTION_ID,
      presetId: "one_visit",
      grantSecret: "private-illegal-parallel-grant",
      permitsAgentDerivative: false,
      reentryChainId: grant.reentryChainId,
    },
  }), "grant_replacement_required", 409);
  const replacementSecret = "private-consumed-replacement";
  const replaced = await instance.call("grant.replace", {
    params: { grantId: grant.grantId },
    expectedVersion: 1,
    body: {
      grantSecret: replacementSecret,
      presetId: "one_visit",
      permitsAgentDerivative: false,
    },
  });
  const replacement = replaced.body.grant as GrantV1;
  assert.equal(instance.store.capability(grant.grantId)?.value.state, "replaced");
  assert.equal(replacement.reentryChainId, grant.reentryChainId);
  assert.equal(replacement.acceptedCount, 0);
  await semanticError(instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: parentSecret,
  }), "not_found", 404);
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: replacementSecret,
  })).status, 200);
  await semanticError(instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: readAgentSecret,
  }), "not_found", 404);
  await instance.call("grant.revoke", { params: { grantId: replacement.grantId }, expectedVersion: 1 });
  await semanticError(instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: replacementSecret,
  }), "not_found", 404);
});

test("GrantOffer is discoverable only through the exact reply and accepts with lost-response-safe client Grant bytes", async () => {
  const instance = harness();
  const source = await createInteraction(instance, "offer_reply_view");
  const issued = await instance.call("grant_offer.issue", {
    body: {
      sourceInteractionId: source.interactionId,
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      projectionId: PRIVATE_PROJECTION_ID,
      presetId: "one_visit",
      acceptanceExpiresAt: "2026-08-03T13:00:00.000Z",
      offeredGrantExpiresAt: "2026-08-04T12:00:00.000Z",
    },
  });
  const offer = issued.body.offer as { offerId: string };
  const status = await instance.call("interaction.read", {
    params: { interactionId: source.interactionId },
    secret: source.replySecret,
  });
  const view = (status.body.interaction as Record<string, unknown>).grantOffer as Record<string, unknown>;
  assert.deepEqual(Object.keys(view).sort(), [
    "acceptanceExpiresAt", "offerId", "offeredGrantExpiresAt", "presetId", "publicRoomLabel", "schemaVersion", "targetProjectionId", "title",
  ]);
  assert.equal(view.offerId, offer.offerId);
  assert.equal(view.publicRoomLabel, null);
  assert.equal(JSON.stringify(await instance.call("control.status")).includes(offer.offerId), false);
  assert.equal(JSON.stringify(await instance.call("third_place.list")).includes(offer.offerId), false);

  const grantSecret = "accepted-offer-private-grant";
  const acceptOptions = {
    params: { offerId: offer.offerId },
    secret: source.replySecret,
    expectedVersion: 1,
    idempotencyKey: "offeracceptlostresponse0000000001",
    body: { grantSecret },
  } as const;
  const accepted = await instance.call("grant_offer.accept", acceptOptions);
  assert.deepEqual(await instance.call("grant_offer.accept", acceptOptions), accepted);
  assert.equal(JSON.stringify(accepted.body).includes(syntheticCapabilitySecret(grantSecret)), false);
  assert.equal((await instance.call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: grantSecret,
  })).status, 200);
  const after = await instance.call("interaction.read", {
    params: { interactionId: source.interactionId },
    secret: source.replySecret,
  });
  assert.equal((after.body.interaction as Record<string, unknown>).grantOffer, null);

  const invalidation = harness();
  const secondSource = await createInteraction(invalidation, "offer_target_invalid");
  await invalidation.call("grant_offer.issue", {
    body: {
      sourceInteractionId: secondSource.interactionId,
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      projectionId: PRIVATE_PROJECTION_ID,
      presetId: "one_visit",
      acceptanceExpiresAt: "2026-08-03T13:00:00.000Z",
      offeredGrantExpiresAt: "2026-08-04T12:00:00.000Z",
    },
  });
  await invalidation.call("projection.revoke", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    expectedVersion: 1,
  });
  const invalidated = await invalidation.call("interaction.read", {
    params: { interactionId: secondSource.interactionId },
    secret: secondSource.replySecret,
  });
  assert.equal((invalidated.body.interaction as Record<string, unknown>).grantOffer, null);
});

test("pairing and protected-pull idempotency recovery physically sheds transient secrets without replay", async () => {
  const instance = harness();
  const pairing = await instance.call("room.pair", {
    params: { roomId: PUBLIC_ROOM_ID },
    idempotencyKey: "pairingphysicalpurge000000000001",
    expectedVersion: 1,
  });
  const pairingId = pairing.body.pairingId as string;
  const pairingCode = pairing.body.pairingCode as string;
  const exchanged = await instance.call("room.pair.exchange", {
    params: { pairingId },
    idempotencyKey: "exchangingphysicalpurge00000001",
    expectedVersion: 1,
    body: { pairingCode, clientPublicKey: "synthetic-x25519-public-key-material" },
  });
  const sealedCredential = exchanged.body.sealedCredential as string;

  const encounterSecret = await issueEncounter(instance, "pull_storage_canary");
  const interactionBodyWithCanary = {
    ...interactionBody("pull_storage_canary"),
    requestBody: "PULL_PRIVATE_BODY_CANARY_MUST_NOT_ENTER_IDEMPOTENCY",
  };
  const created = await instance.call("interaction.create", { secret: encounterSecret, body: interactionBodyWithCanary });
  await instance.call("room_operator.pull", {
    params: { interactionId: created.body.interactionId as string },
    expectedVersion: 1,
    idempotencyKey: "protectedpullbodyfree000000000001",
  });
  await instance.call("notification.set", {
    params: { interactionId: created.body.interactionId as string },
    secret: interactionBodyWithCanary.replySecret,
    expectedVersion: 1,
    idempotencyKey: "notificationbodyfree000000000001",
    body: { email: "IDEMPOTENCY_EMAIL_CANARY@example.invalid" },
  });
  const liveEntries = JSON.stringify(instance.store.idempotencyEntries());
  assert.equal(liveEntries.includes(pairingCode), true);
  assert.equal(liveEntries.includes(sealedCredential), true);
  assert.equal(liveEntries.includes("PULL_PRIVATE_BODY_CANARY"), false);
  assert.equal(liveEntries.includes("IDEMPOTENCY_EMAIL_CANARY"), false);
  assert.equal(liveEntries.includes("syntheticVerification"), false);

  instance.advance(11 * 60 * 1000);
  const expiredEntries = JSON.stringify(instance.store.idempotencyEntries());
  assert.equal(expiredEntries.includes(pairingCode), false);
  assert.equal(expiredEntries.includes(sealedCredential), false);
  const expiredPairing = instance.store.pairingChallenge(pairingId);
  assert.equal(expiredPairing?.state, "expired");
  assert.equal(expiredPairing?.exchangeResponse, null);
});

test("all non-publication operations reject unknown body/param members and HTTP rejects duplicate GET keys", async () => {
  const instance = harness();
  for (const definition of OPERATION_INVENTORY) {
    if (definition.name === "room_operator.projection.deliver" || definition.name === "room_operator.response.deliver") continue;
    const params = Object.fromEntries(
      [...definition.path.matchAll(/:([^/]+)/gu)].map((match, index) => [match[1] ?? `param${index}`, `object_shape_${index.toString().padStart(16, "0")}`]),
    );
    await semanticError(instance.app.run({
      definition,
      params,
      body: { __unknownMember: true },
      authorization: definition.actor === "room_operator"
        ? `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`
        : definition.actor === "guest_capability"
          ? `Bearer ${syntheticCapabilitySecret("shape-guest")}`
          : null,
      syntheticActor: ["controller", "curator", "room_operator"].includes(definition.actor) ? definition.actor : null,
      idempotencyKey: definition.mutating ? `shape${definition.name.replaceAll(/[^A-Za-z0-9]/gu, "").padEnd(28, "0")}` : null,
      expectedVersion: definition.expectedVersion ? 1 : null,
      syntheticClientBucket: "shape-client",
    }), "invalid_request_shape", 400);
  }
  await semanticError(instance.app.run({
    definition: operationDefinition("third_place.list"),
    params: { unexpected: "value" },
    body: {},
    authorization: null,
    syntheticActor: null,
    idempotencyKey: null,
    expectedVersion: null,
  }), "invalid_request_shape", 400);
  const unknownKeyCanary = "RAW_SECRET_AS_UNKNOWN_KEY_MUST_NOT_REFLECT";
  await assert.rejects(instance.app.run({
    definition: operationDefinition("third_place.list"),
    params: {},
    body: { [unknownKeyCanary]: true },
    authorization: null,
    syntheticActor: null,
    idempotencyKey: null,
    expectedVersion: null,
  }), (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, "invalid_request_shape");
    assert.equal(error.message.includes(unknownKeyCanary), false);
    return true;
  });

  const response = await dispatchApi(new Request("http://forme.invalid/api/v1/third-place/projections?x=1&x=2"), ["third-place", "projections"]);
  assert.equal(response.status, 400);
  assert.equal((await response.json() as { error: { code: string } }).error.code, "duplicate_query_key");
});

test("Room operator authorization is rechecked inside the shared lock for revoke and expiry races", async () => {
  async function holdStore(instance: ReturnType<typeof harness>) {
    let release = (): void => undefined;
    let entered = (): void => undefined;
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    const holder = instance.store.runExclusive(async () => {
      entered();
      await released;
    });
    await enteredPromise;
    return { release, holder };
  }

  const revoked = harness();
  const revokeHold = await holdStore(revoked);
  const queuedStatus = revoked.app.run({
    definition: operationDefinition("room_operator.status"),
    params: {},
    body: { roomId: PUBLIC_ROOM_ID },
    authorization: `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`,
    syntheticActor: "room_operator",
    idempotencyKey: null,
    expectedVersion: null,
  });
  await Promise.resolve();
  const binding = revoked.store.roomOperatorBindingBySecret(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET);
  assert.ok(binding);
  revoked.store.saveRoomOperatorBinding({ ...binding, state: "revoked", revokedAt: T0, version: binding.version + 1 });
  revokeHold.release();
  await revokeHold.holder;
  await semanticError(queuedStatus, "not_found", 404);

  const expired = harness();
  const expiryHold = await holdStore(expired);
  const queuedSync = expired.app.run({
    definition: operationDefinition("room_operator.sync"),
    params: {},
    body: { roomId: PUBLIC_ROOM_ID, afterSequence: 0 },
    authorization: `Bearer ${SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET}`,
    syntheticActor: "room_operator",
    idempotencyKey: "operatorraceexpiry00000000000001",
    expectedVersion: null,
  });
  await Promise.resolve();
  expired.advance(31 * 24 * 60 * 60 * 1000);
  expiryHold.release();
  await expiryHold.holder;
  await semanticError(queuedSync, "not_found", 404);
});

test("Response delivery enforces the exact consent source lane and cannot backdate before acceptance", async () => {
  const manual = harness();
  const encounterSecret = await issueEncounter(manual, "manual_source_lane");
  const body = { ...interactionBody("manual_source_lane"), consent: "manual_owner_only" as const };
  const created = await manual.call("interaction.create", { secret: encounterSecret, body });
  const interactionId = created.body.interactionId as string;
  await semanticError(manual.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: responseDelivery(
      manual,
      interactionId,
      "fresh_into_manual",
      "2026-08-04T12:00:00.000Z",
      "fresh_native_sanitized_snapshot_owner_reviewed",
    ),
  }), "source_disclosure_not_consented", 409);

  const chronology = harness();
  chronology.advance(30 * 60 * 1000);
  const later = await createInteraction(chronology, "response_backdate");
  await semanticError(chronology.call("room_operator.response.deliver", {
    expectedVersion: 1,
    body: responseDelivery(chronology, later.interactionId, "backdated_response"),
  }), "response_chronology_invalid", 409);
});

test("capability creation and Authorization require canonical base64url for exactly 32 bytes", async () => {
  const instance = harness();
  await semanticError(instance.app.run({
    definition: operationDefinition("public_encounter.issue"),
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: "too_short_bearer" },
    authorization: null,
    syntheticActor: null,
    idempotencyKey: "invalidcapabilitycreation000000001",
    expectedVersion: 1,
    syntheticClientBucket: "invalid-capability-client",
  }), "invalid_capability_secret", 400);
  const tooLong = Buffer.alloc(33, 7).toString("base64url");
  await semanticError(instance.app.run({
    definition: operationDefinition("public_encounter.issue"),
    params: { projectionId: PUBLIC_PROJECTION_ID },
    body: { encounterSecret: tooLong },
    authorization: null,
    syntheticActor: null,
    idempotencyKey: "invalidlongcapability000000000001",
    expectedVersion: 1,
    syntheticClientBucket: "invalid-long-capability-client",
  }), "invalid_capability_secret", 400);
  const valid = syntheticCapabilitySecret("valid-32-byte-capability-fixture");
  assert.equal(Buffer.from(valid, "base64url").byteLength, 32);
  assert.equal(Buffer.from(valid, "base64url").toString("base64url"), valid);
  await semanticError(instance.app.run({
    definition: operationDefinition("projection.read"),
    params: { projectionId: PRIVATE_PROJECTION_ID },
    body: {},
    authorization: "Bearer only_sixteen_bytes",
    syntheticActor: null,
    idempotencyKey: null,
    expectedVersion: null,
  }), "not_found", 404);
});
