import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
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

import {
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../apps/room/src/synthetic-fixtures.ts";
import { coreOperationDefinition } from "../apps/room/src/core-policy.ts";
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
const NEXT_BIN = resolve(ROOT, "node_modules/next/dist/bin/next");
const LOOPBACK_ONLY_NETWORK = resolve(ROOT, "scripts/allow-loopback-only-network.mjs");
const NEXT_BUILD_ROOT = resolve(ROOT, "apps/room/.next");
const NEXT_ENV_PATH = resolve(ROOT, "apps/room/next-env.d.ts");
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const SYNTHETIC_REQUEST = "What would this project prioritize next?";
const TWIN_BASIS_HASH = canonicalSha256("r4.live-socket.synthetic-current-twin-basis.v1");
const POLICY_HASH = canonicalSha256("r4.live-socket.synthetic-manual-owner-policy.v1");
const MAXIMUM_RESPONSE_BYTES = 16 * 1_024;
const MAXIMUM_SERVER_OUTPUT_BYTES = 1024 * 1024;
const PRIOR_LOOPBACK_ENVELOPE_HASH = "sha256:b90e018d6670a3b732d0e7817f99ec0445f4a2b3d32be3941cd5f2ea92859822";

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
  ) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_TEXT_INVALID");
  return value;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitUntil(milliseconds) {
  while (Date.now() <= milliseconds) await sleep(Math.min(10, milliseconds - Date.now() + 1));
}

class LiveSocketApiError extends Error {
  constructor(status, code) {
    super(`LIVE_SOCKET_API_${code}`);
    this.name = "LiveSocketApiError";
    this.status = status;
    this.code = code;
  }
}

function apiPath(definition, params) {
  return definition.path.split("/").map((part) => {
    if (!part.startsWith(":")) return part;
    const value = params[part.slice(1)];
    if (typeof value !== "string") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_PATH_INVALID");
    return encodeURIComponent(value);
  }).join("/");
}

function exactOwnedDirectoryAbsent(path) {
  if (!existsSync(path)) return true;
  const stat = lstatSync(path);
  return stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid?.();
}

async function reserveLoopbackPort() {
  return await new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectPromise);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = server.address();
      if (address === null || typeof address === "string" || address.address !== "127.0.0.1") {
        server.close(() => rejectPromise(new Error("EXACT_RESPONSE_LIVE_SOCKET_PORT_INVALID")));
        return;
      }
      server.close((error) => error ? rejectPromise(error) : resolvePromise(address.port));
    });
  });
}

async function processGroupAbsent(pid) {
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    return error && typeof error === "object" && error.code === "ESRCH";
  }
}

async function stopProcessGroup(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* exact group may already be gone */ }
  for (let attempt = 0; attempt < 50 && !(await processGroupAbsent(child.pid)); attempt += 1) await sleep(100);
  if (!(await processGroupAbsent(child.pid))) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { /* exact group may already be gone */ }
  }
}

async function portClosed(baseUrl) {
  try {
    await fetch(`${baseUrl}/api/v1/third-place/projections`, { signal: AbortSignal.timeout(500) });
    return false;
  } catch {
    return true;
  }
}

async function startLiveNextServer(ephemeralRoot) {
  if (existsSync(NEXT_BUILD_ROOT)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_BUILD_ROOT_OCCUPIED");
  const nextEnvBefore = readFileSync(NEXT_ENV_PATH);
  const nextEnvDev = Buffer.from(nextEnvBefore.toString("utf8").replaceAll("./.next/types/", "./.next/dev/types/"), "utf8");
  const restoreNextEnvironment = () => {
    const current = readFileSync(NEXT_ENV_PATH);
    if (current.equals(nextEnvBefore)) return;
    if (!current.equals(nextEnvDev)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_NEXT_ENV_DRIFT");
    writeFileSync(NEXT_ENV_PATH, nextEnvBefore);
  };
  const home = join(ephemeralRoot, "server-home");
  const temporary = join(ephemeralRoot, "server-tmp");
  mkdirSync(home, { mode: 0o700 });
  mkdirSync(temporary, { mode: 0o700 });
  const port = await reserveLoopbackPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  let outputBytes = 0;
  let outputOverflow = false;
  const child = spawn(process.execPath, [
    NEXT_BIN,
    "dev",
    "apps/room",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
    "--webpack",
  ], {
    cwd: ROOT,
    detached: true,
    env: {
      FORME_R4_SYNTHETIC: "1",
      HOME: home,
      LANG: "C",
      LC_ALL: "C",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `--import=${LOOPBACK_ONLY_NETWORK}`,
      PATH: "/usr/bin:/bin",
      TMPDIR: temporary,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => {
    outputBytes += chunk.byteLength;
    if (outputBytes <= MAXIMUM_SERVER_OUTPUT_BYTES) output.push(Buffer.from(chunk));
    else outputOverflow = true;
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  let spawnError = null;
  child.once("error", (error) => { spawnError = error; });

  try {
    for (let attempt = 1; attempt <= 120; attempt += 1) {
      if (spawnError !== null || child.exitCode !== null || child.signalCode !== null || outputOverflow) {
        throw new Error("EXACT_RESPONSE_LIVE_SOCKET_SERVER_FAILED");
      }
      try {
        const response = await fetch(`${baseUrl}/api/v1/third-place/projections`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(500),
        });
        if (response.status === 200) {
          await response.arrayBuffer();
          return Object.freeze({
            baseUrl,
            child,
            output,
            readinessAttempts: attempt,
            async close() {
              await stopProcessGroup(child);
              try {
                if (existsSync(NEXT_BUILD_ROOT)) {
                  if (!exactOwnedDirectoryAbsent(NEXT_BUILD_ROOT)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_BUILD_ROOT_UNOWNED");
                  rmSync(NEXT_BUILD_ROOT, { recursive: true, force: true });
                }
              } finally {
                restoreNextEnvironment();
              }
              return Object.freeze({
                processGroupAbsent: await processGroupAbsent(child.pid),
                buildRootAbsent: !existsSync(NEXT_BUILD_ROOT),
                portClosed: await portClosed(baseUrl),
              });
            },
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message === "EXACT_RESPONSE_LIVE_SOCKET_SERVER_FAILED") throw error;
      }
      await sleep(250);
    }
    throw new Error("EXACT_RESPONSE_LIVE_SOCKET_SERVER_NOT_READY");
  } catch (error) {
    await stopProcessGroup(child);
    try {
      if (existsSync(NEXT_BUILD_ROOT) && exactOwnedDirectoryAbsent(NEXT_BUILD_ROOT)) {
        rmSync(NEXT_BUILD_ROOT, { recursive: true, force: true });
      }
    } finally {
      restoreNextEnvironment();
    }
    throw error;
  }
}

export function buildExactResponseLiveSocketEnvelopeV1() {
  const envelope = Object.freeze({
    schemaVersion: "r4.exact_response_live_socket_envelope.v1",
    issue: 69,
    priorLoopbackEnvelopeHash: PRIOR_LOOPBACK_ENVELOPE_HASH,
    origin: Object.freeze({
      createdAtRuntime: true,
      roomId: SYNTHETIC_PUBLIC_ROOM_ID,
      projectionId: PUBLIC_PROJECTION_ID,
      requestHash: canonicalSha256(SYNTHETIC_REQUEST),
      consent: "manual_owner_only",
      transport: "next_process_tcp_http_loopback",
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
      nextProcessLimit: 1,
      syntheticLoopbackSemanticCommitLimit: 1,
      lostResponseRecoveryAttemptLimit: 1,
      externalNetworkCalls: 0,
      publicTrafficCalls: 0,
      providerCalls: 0,
      productionAuthority: false,
      durablePublicCoreAuthority: false,
      hostedServerAuthority: false,
    }),
  });
  return Object.freeze({ envelope, envelopeHash: canonicalSha256(envelope) });
}

export async function runExactResponseLiveSocketRehearsalV1(responseTextValue, review) {
  const responseText = exactResponseText(responseTextValue);
  if (review === null || typeof review !== "object") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_REVIEW_INVALID");
  const ephemeralRoot = mkdtempSync(join(tmpdir(), "forme-r4-exact-response-live-socket-"));
  chmodSync(ephemeralRoot, 0o700);
  let server = null;
  let liveHttpRequests = 0;
  let hostedDeliveryAttempts = 0;
  let cleanup = Object.freeze({ processGroupAbsent: false, buildRootAbsent: false, portClosed: false, privateRootAbsent: false });
  let result = null;
  let serverOutputBodyFree = true;
  let cleanupFailure = null;

  try {
    server = await startLiveNextServer(ephemeralRoot);
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
        if (typeof input.idempotencyKey !== "string") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_IDEMPOTENCY_INVALID");
        headers.set("Idempotency-Key", input.idempotencyKey);
      }
      if (definition.expectedVersion) {
        if (!Number.isSafeInteger(input.expectedVersion)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_VERSION_INVALID");
        headers.set("If-Match", String(input.expectedVersion));
      }
      if (action === "public_encounter.issue") headers.set("X-Forme-Synthetic-Client-Bucket", "r4-exact-response-live-socket");
      const url = new URL(`${server.baseUrl}/api/v1${path}`);
      if (definition.method === "GET") {
        for (const [key, value] of Object.entries(input.body ?? {})) url.searchParams.set(key, String(value));
      }
      liveHttpRequests += 1;
      const response = await fetch(url, {
        method: definition.method,
        headers,
        body: definition.method === "GET" ? undefined : canonicalJson(input.body ?? {}),
        signal: AbortSignal.timeout(10_000),
      });
      let body;
      try { body = await response.json(); } catch { throw new LiveSocketApiError(response.status, "response_invalid"); }
      if (body === null || typeof body !== "object" || Array.isArray(body)) throw new LiveSocketApiError(response.status, "response_invalid");
      if (!response.ok) {
        const code = body.error && typeof body.error === "object" && typeof body.error.code === "string"
          && /^[a-z0-9_]{1,80}$/u.test(body.error.code)
          ? body.error.code
          : "request_failed";
        throw new LiveSocketApiError(response.status, code);
      }
      return Object.freeze({ status: response.status, body });
    };

    const encounterSecret = capability();
    const replySecret = capability();
    const deleteSecret = capability();
    await call("public_encounter.issue", {
      params: { projectionId: PUBLIC_PROJECTION_ID },
      body: { encounterSecret },
      idempotencyKey: canonicalSha256({ kind: "live_socket_encounter" }).slice(7),
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
      idempotencyKey: canonicalSha256({ kind: "live_socket_interaction" }).slice(7),
    });
    const interactionId = created.body.interactionId ?? created.body.targetId;
    if (typeof interactionId !== "string") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_INTERACTION_INVALID");
    const pulled = await call("room_operator.pull", {
      params: { interactionId },
      secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
      idempotencyKey: canonicalSha256({ kind: "live_socket_pull" }).slice(7),
      expectedVersion: 1,
    });
    const currentInteraction = validateInteractionV1(pulled.body.interaction);
    const receiptStartedAt = currentInteraction.acceptedAt;
    const receiptFinishedMilliseconds = Math.max(Date.parse(receiptStartedAt), Date.now());
    const receiptFinishedAt = new Date(receiptFinishedMilliseconds).toISOString();
    const admittedAt = new Date(receiptFinishedMilliseconds + 1);
    const candidateExpiresAt = new Date(Math.min(
      Date.parse(currentInteraction.expiresAt),
      admittedAt.getTime() + 7 * 24 * 60 * 60 * 1_000,
    )).toISOString();
    await waitUntil(admittedAt.getTime());
    const receipt = buildManualOwnerSessionReceiptV1({
      interaction: currentInteraction,
      policyHash: POLICY_HASH,
      startedAt: receiptStartedAt,
      finishedAt: receiptFinishedAt,
      expiresAt: candidateExpiresAt,
    });
    const projectionRead = await call("projection.read", { params: { projectionId: currentInteraction.projectionId } });
    const projectionView = projectionRead.body.view;
    const originState = projectionView?.lifecycle?.ownerState;
    if (typeof originState !== "string") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_PROJECTION_INVALID");
    const candidate = buildManualOwnerCandidate({
      currentInteraction,
      currentOriginStateAtCompilation: originState,
      sessionReceipt: receipt,
      responseText,
      currentTwinBasisHash: TWIN_BASIS_HASH,
      currentPolicyHash: POLICY_HASH,
      admittedAt,
      expiresAt: new Date(candidateExpiresAt),
    });
    if (review.reviewCandidate({
      responseText: candidate.responseText,
      candidateHash: candidate.candidateHash,
      roomId: candidate.roomId,
      projectionId: candidate.projectionId,
      interactionId: candidate.interactionId,
      sourceDisclosureClass: "manual_owner_authored",
    }) !== "approve_exact") {
      result = Object.freeze({
        schemaVersion: "r4.exact_response_live_socket_rehearsal.v1",
        issue: 69,
        verdict: "CANDIDATE_REJECTED",
        candidateHash: candidate.candidateHash,
        runtime: Object.freeze({ liveNextProcesses: 1, liveHttpRequests, hostedDeliveryAttempts: 0, hostedResponseCommits: 0, providerCalls: 0, modelCalls: 0, toolCalls: 0, persistedCandidateBytes: 0, externalNetworkCalls: 0, publicTrafficCalls: 0 }),
      });
    } else {
      const approvedAtMilliseconds = Math.max(admittedAt.getTime() + 1, Date.now());
      await waitUntil(approvedAtMilliseconds);
      const approvalExpiresAt = new Date(Math.min(approvedAtMilliseconds + 15 * 60 * 1_000, Date.parse(candidateExpiresAt))).toISOString();
      const approval = buildExactResponseArtifactApprovalV1({
        candidate,
        approvedAt: new Date(approvedAtMilliseconds).toISOString(),
        expiresAt: approvalExpiresAt,
        operationClass: "loopback_exact_response_delivery",
      });
      const status = await call("room_operator.status", {
        secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
        body: { roomId: candidate.roomId },
      });
      const liveProjection = await call("projection.read", { params: { projectionId: candidate.projectionId } });
      const liveGuestBefore = await call("interaction.read", { params: { interactionId }, secret: replySecret });
      const room = status.body.room;
      const liveProjectionView = liveProjection.body.view;
      const guestInteractionBefore = liveGuestBefore.body.interaction;
      if (!room || !liveProjectionView?.lifecycle || !guestInteractionBefore) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_CURRENT_STATE_INVALID");
      const observedAt = new Date().toISOString();
      const delivery = coordinateResponsePublicationV1({
        responseId: opaqueId("response", candidate.candidateHash),
        publicationAttestationId: opaqueId("att", { candidateHash: candidate.candidateHash, kind: "live_socket_response" }),
        candidate,
        approval,
        binding: Object.freeze({
          bindingId: SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
          roomId: candidate.roomId,
          secret: new TextEncoder().encode(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
          state: "current",
          expiresAt: candidateExpiresAt,
        }),
        responseExpiresAt: candidateExpiresAt,
        attestationExpiresAt: approvalExpiresAt,
        reader: {
          protocolVersion: "trusted_response_publication_state_reader.v1",
          readCurrentAfterApproval: () => ({
            artifactClass: "response",
            observedAt,
            roomId: room.roomId,
            roomStatus: room.status,
            projectionId: liveProjectionView.projection.projectionId,
            interactionId: guestInteractionBefore.interactionId,
            interactionState: ["accepted", "seen_locally", "preparing"].includes(guestInteractionBefore.state)
              ? guestInteractionBefore.state
              : "terminal",
            originState: liveProjectionView.lifecycle.ownerState,
            candidateStoreState: "transient_current",
            candidateHash: candidate.candidateHash,
            twinBasisHash: candidate.twinBasisHash,
            snapshotManifestHash: candidate.snapshotManifestHash,
            sessionReceiptHash: candidate.sessionReceiptHash,
            sourceDisclosureClass: candidate.sourceDisclosureClass,
            policyHash: candidate.policyHash,
            existingResponseId: guestInteractionBefore.response?.responseId ?? null,
            parentInteractionExpiresAt: guestInteractionBefore.expiresAt,
          }),
        },
      });
      if (review.reviewPublicDelivery(delivery) !== "deliver_loopback") {
        result = Object.freeze({
          schemaVersion: "r4.exact_response_live_socket_rehearsal.v1",
          issue: 69,
          verdict: "DELIVERY_CANCELLED",
          candidateHash: candidate.candidateHash,
          approvalHash: canonicalSha256(approval),
          runtime: Object.freeze({ liveNextProcesses: 1, liveHttpRequests, hostedDeliveryAttempts: 0, hostedResponseCommits: 0, providerCalls: 0, modelCalls: 0, toolCalls: 0, persistedCandidateBytes: 0, externalNetworkCalls: 0, publicTrafficCalls: 0 }),
        });
      } else {
        const coordinator = new ProtectedRoomMutationCoordinator({
          lock: new ProtectedRoomLock({ root: join(ephemeralRoot, "locks"), bootId: "exact-response-live-socket" }),
          interactionLeases: new ProtectedInteractionLeaseStore({ root: join(ephemeralRoot, "interaction-leases"), bootId: "exact-response-live-socket" }),
          replayRoot: join(ephemeralRoot, "replay"),
        });
        let firstHostedResult = null;
        const operation = new SyntheticLocalPublicationOperation({
          root: join(ephemeralRoot, "publication"),
          coordinator,
          port: {
            async submit(selectedDelivery, idempotencyKey) {
              hostedDeliveryAttempts += 1;
              const delivered = await call("room_operator.response.deliver", {
                secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
                body: { delivery: selectedDelivery },
                idempotencyKey,
                expectedVersion: 2,
              });
              const current = canonicalJson(delivered.body);
              if (firstHostedResult !== null && firstHostedResult !== current) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_IDEMPOTENCY_DRIFT");
              firstHostedResult ??= current;
              const receiptId = delivered.body.receipt?.receiptId;
              if (typeof receiptId !== "string") throw new Error("EXACT_RESPONSE_LIVE_SOCKET_RECEIPT_INVALID");
              return { receiptId };
            },
          },
        });
        try {
          await operation.submit({ roomId: candidate.roomId, delivery, now: new Date(), faultAt: "after_submit" });
        } catch (error) {
          if (!(error instanceof Error) || !/injected local publication interruption:after_submit/u.test(error.message)) throw error;
        }
        const localReceipt = await operation.submit({ roomId: candidate.roomId, delivery, now: new Date() });
        const durable = readdirSync(join(ephemeralRoot, "publication"))
          .map((name) => readFileSync(join(ephemeralRoot, "publication", name), "utf8"))
          .join("\n");
        if (durable.includes(responseText)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_BODY_PERSISTED");
        const synced = await call("room_operator.sync", {
          secret: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
          body: { roomId: candidate.roomId, afterSequence: 0 },
          idempotencyKey: canonicalSha256({ kind: "live_socket_final_sync" }).slice(7),
        });
        const responseEvents = Array.isArray(synced.body.events)
          ? synced.body.events.filter((event) => event?.eventType === "response.published")
          : [];
        const guest = await call("interaction.read", { params: { interactionId }, secret: replySecret });
        const guestBody = guest.body.interaction?.response?.body;
        if (guestBody !== responseText) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_GUEST_BODY_DRIFT");
        if (responseEvents.length !== 1 || hostedDeliveryAttempts !== 2) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_COMMIT_COUNT_INVALID");
        result = Object.freeze({
          schemaVersion: "r4.exact_response_live_socket_rehearsal.v1",
          issue: 69,
          proofClass: "transient_manual_owner_synthetic_live_next_tcp_http",
          priorLoopbackEnvelopeHash: PRIOR_LOOPBACK_ENVELOPE_HASH,
          verdict: "GREEN_LIVE_SOCKET_EXACT_RESPONSE_DELIVERED",
          candidateHash: candidate.candidateHash,
          approvalHash: canonicalSha256(approval),
          publicResponseHash: canonicalSha256(delivery.response),
          deliveryHash: canonicalSha256(delivery),
          guestObservedBodyHash: canonicalSha256(guestBody),
          guestObservedBodyBytes: Buffer.byteLength(guestBody, "utf8"),
          localPublicationReceiptHash: canonicalSha256(localReceipt),
          runtime: Object.freeze({ liveNextProcesses: 1, liveHttpRequests, hostedDeliveryAttempts, hostedResponseCommits: 1, localDeliveryCalls: 1, providerCalls: 0, modelCalls: 0, toolCalls: 0, persistedCandidateBytes: 0, externalNetworkCalls: 0, publicTrafficCalls: 0 }),
        });
      }
    }
  } finally {
    if (server !== null) {
      serverOutputBodyFree = !Buffer.concat(server.output).includes(Buffer.from(responseText, "utf8"));
      try {
        const serverCleanup = await server.close();
        cleanup = Object.freeze({ ...serverCleanup, privateRootAbsent: false });
      } catch (error) {
        cleanupFailure = error;
      }
    }
    rmSync(ephemeralRoot, { recursive: true, force: true });
    cleanup = Object.freeze({ ...cleanup, privateRootAbsent: !existsSync(ephemeralRoot) });
  }
  if (cleanupFailure !== null) throw cleanupFailure;
  if (result === null) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_RESULT_MISSING");
  if (!serverOutputBodyFree) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_SERVER_OUTPUT_BODY_LEAK");
  if (!Object.values(cleanup).every(Boolean)) throw new Error("EXACT_RESPONSE_LIVE_SOCKET_CLEANUP_INCOMPLETE");
  return Object.freeze({ ...result, cleanup });
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
set responseDialog to display dialog "Paste the exact Owner-authored public Response for the synthetic #69 live Next loopback Interaction. It remains in process memory and is not written to the repository or ledger." default answer "" buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel" with title "Forme #69 — live loopback Response text"
return text returned of responseDialog
end tell\n`, "EXACT_RESPONSE_LIVE_SOCKET_TEXT_CANCELLED");
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
set reviewDialog to display dialog ${appleScriptString(preview)} buttons {"Reject", "Approve exact"} default button "Approve exact" with title "Forme #69 — live loopback candidate approval"
return button returned of reviewDialog
end tell\n`, "EXACT_RESPONSE_LIVE_SOCKET_CANDIDATE_REVIEW_CANCELLED");
  return button === "Approve exact" ? "approve_exact" : "reject";
}

function deliveryReview(delivery) {
  const preview = [
    "Complete synthetic live-loopback public payload:",
    "",
    canonicalJson(delivery.response),
    "",
    "This sends one semantic Response over real TCP HTTP to a loopback-only Next process and synthetic originating Interaction. Child-process external network is fail-closed. It performs no durable Public Core, hosted, public-traffic or Production effect.",
  ].join("\n");
  const button = dialog(`tell application "System Events"
activate
set deliveryDialog to display dialog ${appleScriptString(preview)} buttons {"Cancel", "Deliver over live loopback"} default button "Cancel" with title "Forme #69 — final live-loopback payload"
return button returned of deliveryDialog
end tell\n`, "EXACT_RESPONSE_LIVE_SOCKET_DELIVERY_REVIEW_CANCELLED");
  return button === "Deliver over live loopback" ? "deliver_loopback" : "cancel";
}

function writeLedger(path, value, exclusive = false) {
  const ledgerRoot = resolve(ROOT, ".forme/r4-exact-response-live-socket");
  mkdirSync(ledgerRoot, { recursive: true, mode: 0o700 });
  chmodSync(ledgerRoot, 0o700);
  writeFileSync(path, `${canonicalJson(value)}\n`, { encoding: "utf8", mode: 0o600, flag: exclusive ? "wx" : "w" });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { envelope, envelopeHash } = buildExactResponseLiveSocketEnvelopeV1();
  if (process.argv.length === 3 && process.argv[2] === "inspect") {
    process.stdout.write(`${canonicalJson({ schemaVersion: "r4.exact_response_live_socket_inspection.v1", issue: 69, envelopeHash, envelope, responseBodyBytes: 0, providerCalls: 0, externalNetworkCalls: 0 })}\n`);
  } else if (
    process.platform === "darwin"
    && process.argv.length === 4
    && process.argv[2] === "execute-once"
    && process.argv[3] === envelopeHash
  ) {
    let responseText = "";
    const ledgerPath = resolve(ROOT, ".forme/r4-exact-response-live-socket", `${envelopeHash.slice(7)}.json`);
    try {
      responseText = collectOwnerResponse();
      writeLedger(ledgerPath, { schemaVersion: "r4.exact_response_live_socket_ledger.v1", issue: 69, envelopeHash, state: "review_started", semanticCommitLimit: 1, externalEffectAuthority: false }, true);
      const result = await runExactResponseLiveSocketRehearsalV1(responseText, { reviewCandidate: candidateReview, reviewPublicDelivery: deliveryReview });
      writeLedger(ledgerPath, { schemaVersion: "r4.exact_response_live_socket_ledger.v1", issue: 69, envelopeHash, state: "completed", result });
      process.stdout.write(`${canonicalJson(result)}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : "EXACT_RESPONSE_LIVE_SOCKET_FAILED"}\n`);
      process.exitCode = 1;
    } finally {
      responseText = "";
    }
  } else {
    process.stderr.write(`usage: node scripts/r4-exact-response-live-socket-rehearsal.mjs inspect | execute-once ${envelopeHash}\n`);
    process.exitCode = 64;
  }
}
