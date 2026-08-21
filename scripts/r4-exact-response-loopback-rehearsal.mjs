import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HostedRoomApplication } from "../apps/room/src/application.ts";
import { coreOperationDefinition } from "../apps/room/src/core-policy.ts";
import { dispatchLocalSyntheticRoomApiV1 } from "../apps/room/src/http.ts";
import {
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../apps/room/src/synthetic-fixtures.ts";
import { SyntheticPresenceStore } from "../apps/room/src/store.ts";
import {
  buildExactResponseArtifactApprovalV1,
  buildManualOwnerCandidate,
  buildManualOwnerSessionReceiptV1,
  coordinateResponsePublicationV1,
  ProtectedInteractionLeaseStore,
  ProtectedRoomLock,
  ProtectedRoomMutationCoordinator,
  SyntheticLocalPublicationOperation,
} from "../packages/r4-local/src/index.ts";
import {
  canonicalJson,
  canonicalSha256,
  validateInteractionV1,
} from "../packages/r4-protocol/src/index.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const SYNTHETIC_REQUEST = "What would this project prioritize next?";
const TWIN_BASIS_HASH = canonicalSha256("r4.loopback.synthetic-current-twin-basis.v1");
const POLICY_HASH = canonicalSha256("r4.loopback.synthetic-manual-owner-policy.v1");
const MAXIMUM_RESPONSE_BYTES = 16 * 1_024;
const PRIOR_LOCAL_ENVELOPE_HASH = "sha256:a19e16ba4f3e3a022906caacf1df62a85b8348b658838f131255a342722f2ca6";

function timestamp(milliseconds) {
  return new Date(Date.parse("2026-08-03T12:00:00.000Z") + milliseconds).toISOString();
}

function opaqueId(prefix, value) {
  return `${prefix}_${canonicalSha256(value).slice(7, 39)}`;
}

function capability() {
  return randomBytes(32).toString("base64url");
}

function exactResponseText(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || Buffer.byteLength(value, "utf8") > MAXIMUM_RESPONSE_BYTES
    || value.normalize("NFC") !== value
    || /[\0\r]/u.test(value)
  ) throw new Error("EXACT_RESPONSE_TEXT_INVALID");
  return value;
}

function exactScenario(value) {
  if (!["normal", "byte_drift", "interaction_deleted", "origin_revoked"].includes(value)) {
    throw new Error("EXACT_RESPONSE_LOOPBACK_SCENARIO_INVALID");
  }
  return value;
}

class LoopbackApiError extends Error {
  constructor(status, code) {
    super(`LOOPBACK_API_${code}`);
    this.name = "LoopbackApiError";
    this.status = status;
    this.code = code;
  }
}

function apiPath(definition, params) {
  return definition.path.split("/").map((part) => {
    if (!part.startsWith(":")) return part;
    const value = params[part.slice(1)];
    if (typeof value !== "string") throw new Error("EXACT_RESPONSE_LOOPBACK_PATH_INVALID");
    return encodeURIComponent(value);
  }).join("/");
}

function resultBase(input) {
  return Object.freeze({
    schemaVersion: "r4.exact_response_loopback_rehearsal.v1",
    issue: 69,
    proofClass: "transient_manual_owner_synthetic_loopback_http",
    priorLocalEnvelopeHash: PRIOR_LOCAL_ENVELOPE_HASH,
    sourceDisclosureClass: "manual_owner_authored",
    ...input,
  });
}

export function buildExactResponseLoopbackEnvelopeV1() {
  const envelope = Object.freeze({
    schemaVersion: "r4.exact_response_loopback_envelope.v1",
    issue: 69,
    priorLocalEnvelopeHash: PRIOR_LOCAL_ENVELOPE_HASH,
    origin: Object.freeze({
      createdAtRuntime: true,
      roomId: SYNTHETIC_PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      requestHash: canonicalSha256(SYNTHETIC_REQUEST),
      consent: "manual_owner_only",
      transport: "same_next_route_matcher_and_http_parser",
    }),
    response: Object.freeze({
      sourceDisclosureClass: "manual_owner_authored",
      suppliedAtRuntime: true,
      maximumBytes: MAXIMUM_RESPONSE_BYTES,
      persistedCandidateBytes: 0,
    }),
    authority: Object.freeze({
      ownerCandidateReviewRequired: true,
      exactPublicPayloadReviewRequired: true,
      syntheticLoopbackSemanticCommitLimit: 1,
      lostResponseRecoveryAttemptLimit: 1,
      externalNetworkCalls: 0,
      publicTrafficCalls: 0,
      providerCalls: 0,
      productionAuthority: false,
      hostedServerAuthority: false,
    }),
  });
  return Object.freeze({ envelope, envelopeHash: canonicalSha256(envelope) });
}

export async function runExactResponseLoopbackRehearsalV1(responseTextValue, review, options = {}) {
  const responseText = exactResponseText(responseTextValue);
  const scenario = exactScenario(options.scenario ?? "normal");
  let clock = new Date(timestamp(0));
  const store = new SyntheticPresenceStore(() => clock);
  const application = new HostedRoomApplication(store);
  const ephemeralRoot = mkdtempSync(join(tmpdir(), "forme-r4-exact-response-loopback-"));
  chmodSync(ephemeralRoot, 0o700);
  let loopbackHttpDispatches = 0;
  let hostedDeliveryAttempts = 0;
  let candidateHash = null;
  let approvalHash = null;
  let publicResponseHash = null;
  let deliveryHash = null;

  const call = async (action, input = {}) => {
    const definition = coreOperationDefinition(action);
    const params = input.params ?? {};
    const path = apiPath(definition, params);
    const headers = new Headers({ Accept: "application/json" });
    if (definition.method !== "GET") headers.set("Content-Type", "application/json");
    if (typeof input.secret === "string") headers.set("Authorization", `Bearer ${input.secret}`);
    if (["controller", "curator", "room_operator"].includes(definition.actor)) {
      headers.set("X-Forme-Synthetic-Actor", definition.actor);
    }
    if (definition.mutating) {
      if (typeof input.idempotencyKey !== "string") throw new Error("EXACT_RESPONSE_LOOPBACK_IDEMPOTENCY_INVALID");
      headers.set("Idempotency-Key", input.idempotencyKey);
    }
    if (definition.expectedVersion) {
      if (!Number.isSafeInteger(input.expectedVersion)) throw new Error("EXACT_RESPONSE_LOOPBACK_VERSION_INVALID");
      headers.set("If-Match", String(input.expectedVersion));
    }
    if (action === "public_encounter.issue") headers.set("X-Forme-Synthetic-Client-Bucket", "r4-exact-response-loopback");
    loopbackHttpDispatches += 1;
    const response = await dispatchLocalSyntheticRoomApiV1(new Request(`http://127.0.0.1/api/v1${path}`, {
      method: definition.method,
      headers,
      body: definition.method === "GET" ? undefined : canonicalJson(input.body ?? {}),
    }), path.slice(1).split("/"), application);
    let body;
    try {
      body = await response.json();
    } catch {
      throw new LoopbackApiError(response.status, "response_invalid");
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new LoopbackApiError(response.status, "response_invalid");
    if (!response.ok) {
      const code = body.error && typeof body.error === "object" && typeof body.error.code === "string"
        && /^[a-z0-9_]{1,80}$/u.test(body.error.code)
        ? body.error.code
        : "request_failed";
      throw new LoopbackApiError(response.status, code);
    }
    return Object.freeze({ status: response.status, body });
  };

  const runtime = (localDeliveryCalls, hostedResponseCommits) => Object.freeze({
    providerCalls: 0,
    modelCalls: 0,
    toolCalls: 0,
    persistedCandidateBytes: 0,
    loopbackHttpDispatches,
    hostedDeliveryAttempts,
    hostedResponseCommits,
    localDeliveryCalls,
    externalNetworkCalls: 0,
    publicTrafficCalls: 0,
  });

  const finalResult = (input) => resultBase({
    scenario,
    candidateHash,
    approvalHash,
    publicResponseHash,
    deliveryHash,
    guestObservedBodyHash: null,
    guestObservedBodyBytes: 0,
    localPublicationReceiptHash: null,
    ...input,
  });

  try {
    const encounterSecret = capability();
    const replySecret = capability();
    const deleteSecret = capability();
    await call("public_encounter.issue", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      body: { encounterSecret },
      idempotencyKey: canonicalSha256({ scenario, kind: "encounter" }).slice(7),
      expectedVersion: 1,
    });
    const created = await call("interaction.create", {
      secret: encounterSecret,
      body: {
        projectionId: PUBLIC_PROJECTION_ID,
        interactionType: "ask",
        consent: "manual_owner_only",
        requestBody: SYNTHETIC_REQUEST,
        guestCapsule: null,
        replySecret,
        deleteSecret,
      },
      idempotencyKey: canonicalSha256({ scenario, kind: "interaction" }).slice(7),
    });
    const interactionId = created.body.interactionId ?? created.body.targetId;
    if (typeof interactionId !== "string") throw new Error("EXACT_RESPONSE_LOOPBACK_INTERACTION_INVALID");
    clock = new Date(timestamp(1_000));
    const pulled = await call("room_operator.pull", {
      params: { interactionId },
      secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
      idempotencyKey: canonicalSha256({ scenario, kind: "pull" }).slice(7),
      expectedVersion: 1,
    });
    const currentInteraction = validateInteractionV1(pulled.body.interaction);
    const projection = store.projection(currentInteraction.projectionId);
    const room = store.room(currentInteraction.roomId);
    const operatorBinding = store.roomOperatorBinding(SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID);
    if (!projection || !room || !operatorBinding) throw new Error("EXACT_RESPONSE_LOOPBACK_ORIGIN_INVALID");
    const candidateExpiresAt = new Date(Math.min(
      Date.parse(currentInteraction.expiresAt),
      Date.parse(timestamp(2_000)) + 7 * 24 * 60 * 60 * 1_000,
    )).toISOString();

    const receipt = buildManualOwnerSessionReceiptV1({
      interaction: currentInteraction,
      policyHash: POLICY_HASH,
      startedAt: timestamp(1_000),
      finishedAt: timestamp(1_500),
      expiresAt: candidateExpiresAt,
    });
    const candidate = buildManualOwnerCandidate({
      currentInteraction,
      currentOriginStateAtCompilation: projection.lifecycle.ownerState,
      sessionReceipt: receipt,
      responseText,
      currentTwinBasisHash: TWIN_BASIS_HASH,
      currentPolicyHash: POLICY_HASH,
      admittedAt: new Date(timestamp(2_000)),
      expiresAt: new Date(candidateExpiresAt),
    });
    candidateHash = candidate.candidateHash;
    if (review.reviewCandidate({
      responseText: candidate.responseText,
      candidateHash: candidate.candidateHash,
      roomId: candidate.roomId,
      projectionId: candidate.projectionId,
      interactionId: candidate.interactionId,
      sourceDisclosureClass: "manual_owner_authored",
    }) !== "approve_exact") {
      return finalResult({ verdict: "CANDIDATE_REJECTED", runtime: runtime(0, 0) });
    }

    const approval = buildExactResponseArtifactApprovalV1({
      candidate,
      approvedAt: timestamp(3_000),
      expiresAt: timestamp(15 * 60 * 1_000),
      operationClass: "loopback_exact_response_delivery",
    });
    approvalHash = canonicalSha256(approval);
    clock = new Date(timestamp(4_000));
    const binding = Object.freeze({
      bindingId: operatorBinding.bindingId,
      roomId: operatorBinding.roomId,
      secret: new TextEncoder().encode(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
      state: "current",
      expiresAt: operatorBinding.expiresAt,
    });
    const buildDelivery = (selectedCandidate) => coordinateResponsePublicationV1({
      responseId: opaqueId("response", selectedCandidate.candidateHash),
      publicationAttestationId: opaqueId("att", { candidateHash: selectedCandidate.candidateHash, kind: "loopback_response" }),
      candidate: selectedCandidate,
      approval,
      binding,
      responseExpiresAt: candidateExpiresAt,
      attestationExpiresAt: timestamp(15 * 60 * 1_000),
      reader: {
        protocolVersion: "trusted_response_publication_state_reader.v1",
        readCurrentAfterApproval: () => {
          const liveInteraction = store.interaction(currentInteraction.interactionId);
          const liveProjection = store.projection(currentInteraction.projectionId);
          const liveRoom = store.room(currentInteraction.roomId);
          if (!liveInteraction || !liveProjection || !liveRoom) throw new Error("EXACT_RESPONSE_LOOPBACK_CURRENT_STATE_UNAVAILABLE");
          return {
            artifactClass: "response",
            observedAt: timestamp(4_000),
            roomId: liveRoom.room.roomId,
            roomStatus: liveRoom.room.status,
            projectionId: liveProjection.projection.projectionId,
            interactionId: liveInteraction.interaction.interactionId,
            interactionState: ["accepted", "seen_locally", "preparing"].includes(liveInteraction.interaction.state)
              ? liveInteraction.interaction.state
              : "terminal",
            originState: liveProjection.lifecycle.ownerState,
            candidateStoreState: "transient_current",
            candidateHash: selectedCandidate.candidateHash,
            twinBasisHash: selectedCandidate.twinBasisHash,
            snapshotManifestHash: selectedCandidate.snapshotManifestHash,
            sessionReceiptHash: selectedCandidate.sessionReceiptHash,
            sourceDisclosureClass: selectedCandidate.sourceDisclosureClass,
            policyHash: selectedCandidate.policyHash,
            existingResponseId: liveInteraction.response?.responseId ?? null,
            parentInteractionExpiresAt: liveInteraction.interaction.expiresAt,
          };
        },
      },
    });

    if (scenario === "byte_drift") {
      const drifted = buildManualOwnerCandidate({
        currentInteraction,
        currentOriginStateAtCompilation: projection.lifecycle.ownerState,
        sessionReceipt: receipt,
        responseText: `${responseText} [drift]`,
        currentTwinBasisHash: TWIN_BASIS_HASH,
        currentPolicyHash: POLICY_HASH,
        admittedAt: new Date(timestamp(2_500)),
        expiresAt: new Date(candidateExpiresAt),
      });
      try {
        buildDelivery(drifted);
      } catch (error) {
        if (!(error instanceof Error) || !/approval_artifact_hash_mismatch/u.test(error.message)) throw error;
        return finalResult({ verdict: "GREEN_APPROVED_BYTE_DRIFT_DENIED", runtime: runtime(0, 0) });
      }
      throw new Error("EXACT_RESPONSE_LOOPBACK_BYTE_DRIFT_ACCEPTED");
    }

    const delivery = buildDelivery(candidate);
    publicResponseHash = canonicalSha256(delivery.response);
    deliveryHash = canonicalSha256(delivery);
    if (review.reviewPublicDelivery(delivery) !== "deliver_loopback") {
      return finalResult({ verdict: "DELIVERY_CANCELLED", runtime: runtime(0, 0) });
    }

    if (scenario === "interaction_deleted") {
      await call("interaction.delete", {
        params: { interactionId },
        secret: deleteSecret,
        idempotencyKey: canonicalSha256({ scenario, kind: "delete" }).slice(7),
        expectedVersion: 2,
      });
    } else if (scenario === "origin_revoked") {
      await call("projection.revoke", {
        params: { projectionId: currentInteraction.projectionId },
        idempotencyKey: canonicalSha256({ scenario, kind: "revoke" }).slice(7),
        expectedVersion: 1,
      });
    }

    const coordinator = new ProtectedRoomMutationCoordinator({
      lock: new ProtectedRoomLock({ root: join(ephemeralRoot, "locks"), bootId: "exact-response-loopback" }),
      interactionLeases: new ProtectedInteractionLeaseStore({
        root: join(ephemeralRoot, "interaction-leases"),
        bootId: "exact-response-loopback",
      }),
      replayRoot: join(ephemeralRoot, "replay"),
    });
    let firstHostedResult = null;
    const port = {
      async submit(selectedDelivery, idempotencyKey) {
        hostedDeliveryAttempts += 1;
        const delivered = await call("room_operator.response.deliver", {
          secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
          body: { delivery: selectedDelivery },
          idempotencyKey,
          expectedVersion: 2,
        });
        const current = canonicalJson(delivered.body);
        if (firstHostedResult !== null && firstHostedResult !== current) throw new Error("EXACT_RESPONSE_LOOPBACK_IDEMPOTENCY_DRIFT");
        firstHostedResult ??= current;
        const receiptId = delivered.body.receipt?.receiptId;
        if (typeof receiptId !== "string") throw new Error("EXACT_RESPONSE_LOOPBACK_HOSTED_RECEIPT_INVALID");
        return { receiptId };
      },
    };
    const operation = new SyntheticLocalPublicationOperation({
      root: join(ephemeralRoot, "publication"),
      coordinator,
      port,
    });

    if (scenario === "interaction_deleted" || scenario === "origin_revoked") {
      try {
        await operation.submit({ roomId: candidate.roomId, delivery, now: clock });
      } catch (error) {
        if (!(error instanceof LoopbackApiError) || error.status !== 409 || error.code !== "version_conflict") throw error;
        let guestResponse = null;
        try {
          const guest = await call("interaction.read", { params: { interactionId }, secret: replySecret });
          guestResponse = guest.body.interaction?.response ?? null;
        } catch (guestError) {
          if (!(guestError instanceof LoopbackApiError) || ![404, 410].includes(guestError.status)) throw guestError;
        }
        if (guestResponse !== null || store.eventsAfter(candidate.roomId, 0).some((event) => event.eventType === "response.published")) {
          throw new Error("EXACT_RESPONSE_LOOPBACK_DESTRUCTIVE_STATE_LOST");
        }
        return finalResult({ verdict: "GREEN_DESTRUCTIVE_STATE_WON", runtime: runtime(0, 0) });
      }
      throw new Error("EXACT_RESPONSE_LOOPBACK_DESTRUCTIVE_DELIVERY_ACCEPTED");
    }

    try {
      await operation.submit({ roomId: candidate.roomId, delivery, now: clock, faultAt: "after_submit" });
    } catch (error) {
      if (!(error instanceof Error) || !/injected local publication interruption:after_submit/u.test(error.message)) throw error;
    }
    const localReceipt = await operation.submit({
      roomId: candidate.roomId,
      delivery,
      now: new Date(clock.getTime() + 500),
    });
    const durable = readdirSync(join(ephemeralRoot, "publication"))
      .map((name) => readFileSync(join(ephemeralRoot, "publication", name), "utf8"))
      .join("\n");
    if (durable.includes(responseText)) throw new Error("EXACT_RESPONSE_LOOPBACK_BODY_PERSISTED");

    const guest = await call("interaction.read", { params: { interactionId }, secret: replySecret });
    const guestBody = guest.body.interaction?.response?.body;
    if (guestBody !== responseText) throw new Error("EXACT_RESPONSE_LOOPBACK_GUEST_BODY_DRIFT");
    const responseEvents = store.eventsAfter(candidate.roomId, 0).filter((event) => event.eventType === "response.published");
    if (responseEvents.length !== 1 || hostedDeliveryAttempts !== 2) throw new Error("EXACT_RESPONSE_LOOPBACK_IDEMPOTENCY_INVALID");
    return finalResult({
      verdict: "GREEN_LOOPBACK_EXACT_RESPONSE_DELIVERED",
      guestObservedBodyHash: canonicalSha256(guestBody),
      guestObservedBodyBytes: Buffer.byteLength(guestBody, "utf8"),
      localPublicationReceiptHash: canonicalSha256(localReceipt),
      runtime: runtime(1, 1),
    });
  } finally {
    rmSync(ephemeralRoot, { recursive: true, force: true });
  }
}

function appleScriptString(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function dialog(script, failureCode) {
  const result = spawnSync("/usr/bin/osascript", ["-"], {
    input: script,
    encoding: "utf8",
    maxBuffer: 64 * 1_024,
    env: { PATH: "/usr/bin:/bin" },
  });
  if (result.status !== 0 || result.signal !== null) throw new Error(failureCode);
  return result.stdout.replace(/\r?\n$/u, "");
}

function collectOwnerResponse() {
  return dialog(`tell application "System Events"
activate
set responseDialog to display dialog "Paste the exact Owner-authored public Response for the synthetic #69 loopback Interaction. It remains in process memory and is not written to the repository or ledger." default answer "" buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel" with title "Forme #69 — loopback Response text"
return text returned of responseDialog
end tell\n`, "EXACT_RESPONSE_LOOPBACK_TEXT_CANCELLED");
}

function candidateReview(input) {
  const preview = [
    "Manual Owner-authored Response — zero model participation.",
    `Room: ${input.roomId}`,
    `Projection: ${input.projectionId}`,
    `Interaction: ${input.interactionId}`,
    `Candidate hash: ${input.candidateHash}`,
    "",
    input.responseText,
  ].join("\n");
  const button = dialog(`tell application "System Events"
activate
set reviewDialog to display dialog ${appleScriptString(preview)} buttons {"Reject", "Approve exact"} default button "Approve exact" with title "Forme #69 — loopback candidate approval"
return button returned of reviewDialog
end tell\n`, "EXACT_RESPONSE_LOOPBACK_CANDIDATE_REVIEW_CANCELLED");
  return button === "Approve exact" ? "approve_exact" : "reject";
}

function deliveryReview(delivery) {
  const preview = [
    "Complete synthetic loopback public payload:",
    "",
    canonicalJson(delivery.response),
    "",
    "This sends one semantic Response through the local HTTP handler to a synthetic originating Interaction. It performs no external network, hosted-server, public-traffic or Production effect.",
  ].join("\n");
  const button = dialog(`tell application "System Events"
activate
set deliveryDialog to display dialog ${appleScriptString(preview)} buttons {"Cancel", "Deliver to loopback Guest"} default button "Cancel" with title "Forme #69 — final loopback payload"
return button returned of deliveryDialog
end tell\n`, "EXACT_RESPONSE_LOOPBACK_DELIVERY_REVIEW_CANCELLED");
  return button === "Deliver to loopback Guest" ? "deliver_loopback" : "cancel";
}

function writeLedger(path, value, exclusive = false) {
  const ledgerRoot = resolve(ROOT, ".forme/r4-exact-response-loopback");
  mkdirSync(ledgerRoot, { recursive: true, mode: 0o700 });
  chmodSync(ledgerRoot, 0o700);
  writeFileSync(path, `${canonicalJson(value)}\n`, { encoding: "utf8", mode: 0o600, flag: exclusive ? "wx" : "w" });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { envelope, envelopeHash } = buildExactResponseLoopbackEnvelopeV1();
  if (process.argv.length === 3 && process.argv[2] === "inspect") {
    process.stdout.write(`${canonicalJson({
      schemaVersion: "r4.exact_response_loopback_inspection.v1",
      issue: 69,
      envelopeHash,
      envelope,
      responseBodyBytes: 0,
      providerCalls: 0,
      externalNetworkCalls: 0,
    })}\n`);
  } else if (
    process.platform === "darwin"
    && process.argv.length === 4
    && process.argv[2] === "execute-once"
    && process.argv[3] === envelopeHash
  ) {
    let responseText = "";
    const ledgerPath = resolve(ROOT, ".forme/r4-exact-response-loopback", `${envelopeHash.slice(7)}.json`);
    try {
      responseText = collectOwnerResponse();
      writeLedger(ledgerPath, {
        schemaVersion: "r4.exact_response_loopback_ledger.v1",
        issue: 69,
        envelopeHash,
        state: "review_started",
        semanticCommitLimit: 1,
        externalEffectAuthority: false,
      }, true);
      const result = await runExactResponseLoopbackRehearsalV1(responseText, {
        reviewCandidate: candidateReview,
        reviewPublicDelivery: deliveryReview,
      });
      writeLedger(ledgerPath, {
        schemaVersion: "r4.exact_response_loopback_ledger.v1",
        issue: 69,
        envelopeHash,
        state: "completed",
        result,
      });
      process.stdout.write(`${canonicalJson(result)}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : "EXACT_RESPONSE_LOOPBACK_FAILED"}\n`);
      process.exitCode = 1;
    } finally {
      responseText = "";
    }
  } else {
    process.stderr.write(`usage: node scripts/r4-exact-response-loopback-rehearsal.mjs inspect | execute-once ${envelopeHash}\n`);
    process.exitCode = 64;
  }
}
