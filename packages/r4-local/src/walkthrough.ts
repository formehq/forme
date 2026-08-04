import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { HostedRoomApplication, SemanticError, type OperationResponse } from "../../../apps/room/src/application.ts";
import { operationDefinition } from "../../../apps/room/src/operation-inventory.ts";
import { SyntheticPresenceStore } from "../../../apps/room/src/store.ts";
import {
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
  syntheticCapabilityRequestBody,
  syntheticCapabilitySecret,
} from "../../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalJson,
  canonicalSha256,
  type GrantPresetId,
  type GrantV1,
  type InteractionV1,
} from "../../r4-protocol/src/index.ts";
import type { TwinRevision } from "../../../src/types.ts";
import { assertBodyFree, sha256 } from "./body-free.ts";
import { SnapshotQueryBroker } from "./broker.ts";
import {
  createCandidateOwnerReviewPort,
  FileCandidateStore,
  SyntheticUserPresenceKeyProtector,
} from "./candidate-store.ts";
import { assertCapabilityProbe, buildSyntheticCapabilityProbe } from "./capability-probe.ts";
import {
  extractCandidateFromCompletedTurn,
  FakeResponseTransportGate,
  finalizeSyntheticFreshAdmission,
  SyntheticHardCeilingTransportGate,
  SyntheticFreshAuthority,
} from "./fresh-session.ts";
import {
  authorizeFreshSessionStart,
  buildResponseOrientation,
  prepareResponseSession,
} from "./response-session.ts";
import { RESPONSE_SOURCE_POLICY } from "./snapshot.ts";
import { coordinateResponsePublicationV1 } from "./publication.ts";
import { FakeSyntheticPublicationPort, SyntheticLocalPublicationOperation } from "./publication-operation.ts";
import { coordinatorForRoomLock } from "./coordinator.ts";
import { ProtectedRoomLock } from "./lock.ts";
import { SyntheticFreshRuntimeStore } from "./runtime-cleanup.ts";
import type { ResponseSourceSnapshot } from "./types.ts";

const PACKET_HASH = "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5" as const;
const T0 = "2026-08-03T12:00:00.000Z" as const;
const PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const PRIVATE_ROOM_ID = "room_formeprivate0000000000000000000";
const PRIVATE_PROJECTION_ID = "proj_formeprivate0000000000000000000";

export interface SyntheticWalkthroughStep {
  sequence: number;
  action: string;
  outcome: string;
  objectId?: string;
  objectVersion?: number;
  state?: string;
  contentHash?: `sha256:${string}`;
  contentBytes?: number;
  count?: number;
  expiresAt?: string;
  denialCode?: string;
  externalEmailSent?: false;
}

export interface SyntheticWalkthroughJourney {
  journeyId: "J1" | "J2" | "J3" | "J4" | "J5";
  label: string;
  stepCount: number;
  stepHashes: Array<`sha256:${string}`>;
  transcriptHash: `sha256:${string}`;
}

export interface SyntheticR4WalkthroughResult {
  schemaVersion: "r4.synthetic_walkthrough.v1";
  packetHash: typeof PACKET_HASH;
  deterministicClock: typeof T0;
  syntheticOnly: true;
  effects: {
    networkCalls: 0;
    providerCalls: 0;
    syntheticTransportDispatches: 1;
    externalEmailSends: 0;
    realGuestRecords: 0;
  };
  journeys: SyntheticWalkthroughJourney[];
  aggregateHash: `sha256:${string}`;
}

interface CallOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  secret?: string;
  expectedVersion?: number | null;
  idempotencyKey?: string;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function field<T>(response: OperationResponse, name: string): T {
  return response.body[name] as T;
}

function interactionId(response: OperationResponse): string {
  const value = field<unknown>(response, "interactionId");
  if (typeof value !== "string") throw new Error("synthetic walkthrough expected an Interaction ID");
  return value;
}

function denialCode(error: unknown): string {
  if (error instanceof SemanticError) return error.code;
  throw error;
}

function syntheticTwin(): TwinRevision {
  return {
    schemaVersion: "1",
    workspaceId: "workspace_walkthroughsynthetic000000",
    revision: 1,
    previousRevision: null,
    observedAt: T0,
    workspaceContractHash: canonicalSha256("synthetic-workspace-contract"),
    evidence: [],
    changes: { added: [], modified: [], deleted: [] },
    ownerFrame: {
      activeIntent: "Prove controlled social Presence without exposing the private Twin.",
      nextMove: "Return one exact Owner-reviewed Response through the retained reply capability.",
      unresolved: ["How should a future collaborator continue after the first bounded exchange?"],
    },
    warnings: [],
  };
}

function syntheticSourceSnapshot(): ResponseSourceSnapshot {
  const text = [
    "# Synthetic Forme snapshot",
    "Forme keeps durable meaning local and projects only Owner-approved claims.",
    "A deeper Guest request returns through an exact reviewed Response.",
  ].join("\n");
  const file = {
    canonicalPath: "README.md",
    contentHash: sha256(text),
    byteCount: utf8Bytes(text),
    text,
  };
  const createdAt = T0;
  const snapshotIdBasis = {
    repositoryHead: "a".repeat(40),
    repositoryTreeHash: canonicalSha256("synthetic-git-tree"),
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    createdAt,
    files: [{ canonicalPath: file.canonicalPath, contentHash: file.contentHash, byteCount: file.byteCount }],
  };
  const preimage = {
    schemaVersion: "response_source_snapshot.v1" as const,
    snapshotId: `snapshot_${canonicalSha256(snapshotIdBasis).slice(7, 39)}`,
    repositoryHead: snapshotIdBasis.repositoryHead,
    repositoryTreeHash: snapshotIdBasis.repositoryTreeHash,
    policyId: RESPONSE_SOURCE_POLICY.policyId,
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    files: snapshotIdBasis.files,
    fileCount: 1,
    totalBytes: file.byteCount,
    createdAt,
  };
  return {
    manifest: { ...preimage, manifestHash: canonicalSha256(preimage) },
    policy: RESPONSE_SOURCE_POLICY,
    files: [file],
  };
}

export async function runSyntheticR4Walkthrough(): Promise<SyntheticR4WalkthroughResult> {
  let hostedClock = Date.parse(T0);
  const store = new SyntheticPresenceStore(() => new Date(hostedClock));
  const app = new HostedRoomApplication(store);
  let callSequence = 0;
  const audit = new Map<SyntheticWalkthroughJourney["journeyId"], SyntheticWalkthroughStep[]>([
    ["J1", []],
    ["J2", []],
    ["J3", []],
    ["J4", []],
    ["J5", []],
  ]);
  let auditSequence = 0;

  const record = (
    journeyId: SyntheticWalkthroughJourney["journeyId"],
    step: Omit<SyntheticWalkthroughStep, "sequence">,
  ): void => {
    auditSequence += 1;
    audit.get(journeyId)?.push({ sequence: auditSequence, ...step });
  };

  const call = async (name: string, options: CallOptions = {}): Promise<OperationResponse> => {
    const definition = operationDefinition(name);
    callSequence += 1;
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
        ? options.idempotencyKey ?? callSequence.toString(16).padStart(32, "0")
        : null,
      expectedVersion: options.expectedVersion !== undefined
        ? options.expectedVersion
        : definition.expectedVersion
          ? 1
          : null,
      syntheticClientBucket: "synthetic-walkthrough-client",
    });
  };

  const issueGrant = async (
    presetId: GrantPresetId,
    secret: string,
    roomId = PUBLIC_ROOM_ID,
    projectionId = PUBLIC_PROJECTION_ID,
    permitsAgentDerivative = false,
  ): Promise<GrantV1> => {
    const response = await call("grant.issue", {
      body: {
        roomId,
        projectionId,
        presetId,
        grantSecret: secret,
        permitsAgentDerivative,
        reentryChainId: `chain_${canonicalSha256({ presetId, roomId, secret }).slice(7, 39)}`,
      },
    });
    return field<GrantV1>(response, "grant");
  };

  const request = (
    projectionId: string,
    label: string,
    consent: "allow_owner_local_ai" | "manual_owner_only" = "manual_owner_only",
  ): Record<string, unknown> => ({
    projectionId,
    interactionType: "ask",
    consent,
    replySecret: `reply_${label}_synthetic_secret_0000001`,
    deleteSecret: `delete_${label}_synthetic_secret_000001`,
    requestBody: `Synthetic request ${label}; no real Guest data.`,
    guestCapsule: null,
  });

  const close = async (id: string): Promise<void> => {
    await call("interaction.close", { params: { interactionId: id }, expectedVersion: 1 });
  };

  // J1 — public Manual Guest enters, submits privately, and keeps a polling capability.
  const thirdPlace = await call("third_place.list");
  const residents = field<Array<{ view: { projection: { projectionId: string; payloadHash: `sha256:${string}` } } }>>(thirdPlace, "residents");
  const publicResident = residents[0];
  if (!publicResident) throw new Error("synthetic Third Place fixture is empty");
  record("J1", {
    action: "third_place.list",
    outcome: "one_curated_public_projection",
    objectId: publicResident.view.projection.projectionId,
    contentHash: publicResident.view.projection.payloadHash,
    count: residents.length,
  });

  const encounterSecret = "walkthrough_public_encounter_secret_0001";
  const encounterResult = await call("public_encounter.issue", {
    params: { projectionId: PUBLIC_PROJECTION_ID },
    expectedVersion: 1,
    body: { encounterSecret },
  });
  const encounter = field<{ encounterId: string; expiresAt: string; state: string }>(encounterResult, "encounter");
  record("J1", {
    action: "public_encounter.issue",
    outcome: "bounded_capability_issued",
    objectId: encounter.encounterId,
    state: encounter.state,
    expiresAt: encounter.expiresAt,
  });

  const j1Request = request(PUBLIC_PROJECTION_ID, "walkthrough_j1", "allow_owner_local_ai");
  const created = await call("interaction.create", { secret: encounterSecret, body: j1Request });
  const j1InteractionId = interactionId(created);
  const j1RequestText = j1Request.requestBody as string;
  record("J1", {
    action: "interaction.create",
    outcome: "private_signal_accepted_body_free_receipt",
    objectId: j1InteractionId,
    state: field<string>(created, "state"),
    contentHash: canonicalSha256(j1RequestText),
    contentBytes: utf8Bytes(j1RequestText),
  });

  const j1ReplySecret = j1Request.replySecret as string;
  const noticeSet = await call("notification.set", {
    params: { interactionId: j1InteractionId },
    secret: j1ReplySecret,
    expectedVersion: 1,
    body: { email: "walkthrough@example.invalid" },
  });
  const fakeVerification = field<{ externalEmailSent: false }>(noticeSet, "syntheticVerification");
  await call("notification.verify", {
    params: { interactionId: j1InteractionId },
    secret: j1ReplySecret,
    expectedVersion: 2,
    body: { code: "000000" },
  });
  record("J1", {
    action: "notification.confirm",
    outcome: "synthetic_endpoint_confirmed_no_send",
    objectId: j1InteractionId,
    state: "confirmed",
    externalEmailSent: fakeVerification.externalEmailSent,
  });

  // J2 — full synthetic Fresh path: exact orientation/session, fake transport,
  // encrypted candidate, separate user-presence approval, verified delivery,
  // and cleanup. No provider or network adapter exists in this walkthrough.
  const sync = await call("room_operator.sync", { body: { roomId: PUBLIC_ROOM_ID, afterSequence: 0 } });
  const batch = sync.body as unknown as {
    highWater: number;
    events: Array<{ payloadHash: `sha256:${string}` }>;
  };
  record("J2", {
    action: "room_operator.sync",
    outcome: "explicit_body_free_sync",
    objectId: PUBLIC_ROOM_ID,
    objectVersion: batch.highWater,
    count: batch.events.length,
    contentHash: canonicalSha256(batch.events.map((event) => event.payloadHash)),
  });

  const pulled = await call("room_operator.pull", {
    params: { interactionId: j1InteractionId },
    expectedVersion: 1,
  });
  const pulledInteraction = field<InteractionV1>(pulled, "interaction");
  record("J2", {
    action: "room_operator.pull",
    outcome: "one_exact_synthetic_request_pulled",
    objectId: pulledInteraction.interactionId,
    contentHash: canonicalSha256(pulledInteraction.requestText),
    contentBytes: utf8Bytes(pulledInteraction.requestText),
  });

  const twin = syntheticTwin();
  const twinHash = canonicalSha256(twin);
  const snapshot = syntheticSourceSnapshot();
  const orientation = buildResponseOrientation({
    revision: twin,
    twinRevisionHash: twinHash,
    entityName: "Synthetic Forme Project",
    currentState: "R4 Gate A synthetic Presence validation is in progress.",
    publicClaimSummary: ["The hosted server is a no-AI control and relay plane."],
    responseAiEligibleCorrectedReflectionIds: [],
    responseAiEligibleUnresolvedIndexes: [0],
  });
  const preparedAt = new Date(Date.parse(T0) + 1_000);
  const prepared = prepareResponseSession({
    interaction: pulledInteraction,
    orientation,
    snapshot,
    sessionEnvelopeId: "session_walkthroughfresh000000000000",
    modelId: "synthetic-gate-a-model",
    budget: pulledInteraction.consentEnvelope?.maximumBudget ?? {
      wallClockSeconds: 3_600,
      providerDispatches: 3,
      inputTokens: 128_000,
      outputTokens: 8_000,
      spend: { mode: "incremental", maximumUsd: 1 },
    },
    outputSchemaHash: canonicalSha256("response_candidate.v1"),
    preparedAt,
    authorityExpiresAt: new Date(preparedAt.getTime() + 10 * 60 * 1_000),
  });
  record("J2", {
    action: "response_session.prepare",
    outcome: "consent_orientation_snapshot_exact_subset",
    objectId: prepared.sessionEnvelope.sessionEnvelopeId,
    contentHash: prepared.sessionEnvelopeHash,
    contentBytes: snapshot.manifest.totalBytes,
  });

  const probe = buildSyntheticCapabilityProbe({
    adapter: "synthetic-gate-a-no-process",
    runtimeVersion: "synthetic-fresh.v1",
    probedAt: new Date(preparedAt.getTime() + 500).toISOString(),
  });
  assertCapabilityProbe(probe);
  const startAuthorization = authorizeFreshSessionStart({
    prepared,
    expectedSessionEnvelopeHash: prepared.sessionEnvelopeHash,
    expectedOrientationHash: orientation.contentHash,
    expectedSnapshotManifestHash: snapshot.manifest.manifestHash,
    capabilityProbeHash: probe.bodyFreeEvidenceHash,
    runtimePolicyHash: probe.runtimePolicy.policyHash,
    ownerPresenceConfirmed: true,
    reviewedAt: new Date(preparedAt.getTime() + 1_000),
  });
  record("J2", {
    action: "response_session.authorize",
    outcome: "exact_preview_user_presence_and_fail_closed_probe",
    objectId: startAuthorization.interactionId,
    contentHash: startAuthorization.startAuthorizationHash,
    expiresAt: startAuthorization.authorityExpiresAt,
  });

  const reserved = await call("room_operator.cycle.reserve", {
    params: { interactionId: j1InteractionId },
    expectedVersion: 2,
    body: {
      startAuthorizationHash: startAuthorization.startAuthorizationHash,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
    },
  });
  const reservation = field<{ reservationId: string; state: string; version: number }>(reserved, "reservation");
  record("J2", {
    action: "room_operator.cycle.reserve",
    outcome: "synthetic_cycle_reserved",
    objectId: reservation.reservationId,
    objectVersion: reservation.version,
    state: reservation.state,
  });

  const localAuthority = new SyntheticFreshAuthority();
  localAuthority.addInteraction(j1InteractionId);
  const localReservation = localAuthority.reserve({
    interactionId: j1InteractionId,
    startAuthorizationHash: startAuthorization.startAuthorizationHash,
    sessionEnvelopeHash: prepared.sessionEnvelopeHash,
    idempotencyKey: "66666666666666666666666666666666",
    now: new Date(preparedAt.getTime() + 2_000),
  });
  const fakePayload = canonicalJson({
    interactionId: j1InteractionId,
    requestText: pulledInteraction.requestText,
    consentEnvelopeId: pulledInteraction.consentEnvelope?.consentEnvelopeId,
    orientation,
    sessionEnvelope: prepared.sessionEnvelope,
    snapshotManifestHash: snapshot.manifest.manifestHash,
  });
  const payloadHash = sha256(fakePayload);
  const runtimeTemporary = mkdtempSync(join(realpathSync(tmpdir()), "forme-r4-walkthrough-runtime-"));
  const runtimeWorkspace = join(runtimeTemporary, "workspace");
  mkdirSync(runtimeWorkspace, { recursive: true, mode: 0o700 });
  const runtimeLock = new ProtectedRoomLock({
    root: join(runtimeTemporary, "room-locks"),
    bootId: "synthetic-walkthrough-runtime-boot",
  });
  const runtimeStore = new SyntheticFreshRuntimeStore({
    root: join(runtimeTemporary, "fresh-runtime"),
    workspaceRoot: runtimeWorkspace,
    lock: runtimeLock,
  });
  const runtimeRunId = "run_walkthroughfresh000000000001";
  runtimeStore.begin({
    runId: runtimeRunId,
    roomId: pulledInteraction.roomId,
    interactionId: pulledInteraction.interactionId,
    sessionEnvelopeHash: prepared.sessionEnvelopeHash,
    requestBytes: new TextEncoder().encode(fakePayload),
    snapshotBytes: new TextEncoder().encode(canonicalJson(snapshot.manifest)),
    streamBytes: new TextEncoder().encode("synthetic structured event stream"),
    now: new Date(preparedAt.getTime() + 2_500),
    synthetic: true,
  });
  record("J2", {
    action: "fresh_runtime.begin",
    outcome: "protected_ephemeral_request_snapshot_and_stream",
    objectId: runtimeRunId,
    contentBytes: runtimeStore.runtimeByteCount(runtimeRunId),
  });
  const localPermit = localAuthority.issuePermit({
    interactionId: j1InteractionId,
    reservationId: localReservation.reservationId,
    sessionEnvelopeHash: prepared.sessionEnvelopeHash,
    provider: "OpenAI",
    modelId: prepared.sessionEnvelope.modelId,
    payloadHash,
    dispatchOrdinal: 1,
    idempotencyKey: "77777777777777777777777777777777",
    now: new Date(preparedAt.getTime() + 3_000),
  });
  hostedClock = preparedAt.getTime() + 3_000;
  const hostedPermit = await call("room_operator.dispatch.issue", {
    params: { interactionId: j1InteractionId },
    expectedVersion: 3,
    body: {
      reservationId: reservation.reservationId,
      sessionEnvelopeHash: prepared.sessionEnvelopeHash,
      startAuthorizationHash: startAuthorization.startAuthorizationHash,
      provider: "OpenAI",
      model: prepared.sessionEnvelope.modelId,
      payloadHash,
      ordinal: 1,
    },
  });
  const hostedTransport = field<{ upstreamEnabled: false }>(hostedPermit, "syntheticTransport");
  if (hostedTransport.upstreamEnabled !== false) throw new Error("Gate A walkthrough unexpectedly enabled an upstream transport");
  const consumedPermit = localAuthority.consumePermit({
    interactionId: j1InteractionId,
    permitId: localPermit.permitId,
    payloadHash,
    now: new Date(preparedAt.getTime() + 4_000),
  });
  const fakeTransport = new FakeResponseTransportGate();
  fakeTransport.send({
    permit: consumedPermit,
    payload: fakePayload,
    provider: "OpenAI",
    modelId: prepared.sessionEnvelope.modelId,
    inputTokens: 64,
    outputTokens: 32,
    applicableSpendUsd: 0,
  });
  const broker = new SnapshotQueryBroker(snapshot, new Uint8Array(32).fill(9));
  const hardTransport = new SyntheticHardCeilingTransportGate({
    modelId: prepared.sessionEnvelope.modelId,
    cycleId: "cycle_walkthroughfresh000000000001",
    preparedAt,
    budget: prepared.sessionEnvelope.budget,
    interactionId: j1InteractionId,
    sessionEnvelopeId: prepared.sessionEnvelope.sessionEnvelopeId,
    sessionEnvelopeHash: prepared.sessionEnvelopeHash,
    startAuthorizationHash: startAuthorization.startAuthorizationHash,
    policyHash: snapshot.policy.policyHash,
    outputSchemaHash: prepared.sessionEnvelope.outputSchemaHash,
    snapshotBroker: broker,
  });
  const hardReservation = hardTransport.reserve({
    provider: "OpenAI",
    modelId: prepared.sessionEnvelope.modelId,
    endpointClass: "openai_responses",
    automaticRetryAttempt: false,
    fallbackRequested: false,
    priorTerminalFailure: false,
    usageKnown: true,
    spendKnown: true,
    now: new Date(preparedAt.getTime() + 3_000),
    nextInputTokens: 1_024,
    nextMaxOutputTokens: 32,
    nextWorstCaseSpendUsd: 0,
    payloadHash,
    idempotencyKey: "dispatch_walkthrough000000000001",
  });
  hardTransport.consume({
    reservationId: hardReservation.reservationId,
    payloadHash,
    now: new Date(preparedAt.getTime() + 4_000),
  });
  record("J2", {
    action: "fresh_transport.synthetic_dispatch",
    outcome: "exact_permit_consumed_in_memory_upstream_disabled",
    objectId: field<{ permitId: string }>(hostedPermit, "permit").permitId,
    contentHash: fakeTransport.calls[0]?.payloadHash,
    count: fakeTransport.calls.length,
  });

  const searchResult = broker.evaluate({
    schemaVersion: "snapshot_search.v1",
    pattern: "Owner-approved",
    patternKind: "literal",
  });
  const lineResult = broker.evaluate({
    schemaVersion: "snapshot_line_read.v1",
    canonicalPath: "README.md",
    lineStart: 1,
    lineEnd: 3,
  });
  if (searchResult.status !== "ok" || lineResult.status !== "ok") throw new Error("synthetic Broker query failed");
  const access = broker.aggregate();
  record("J2", {
    action: "snapshot_query_broker.evaluate",
    outcome: "bounded_dynamic_read_and_search",
    objectId: snapshot.manifest.snapshotId,
    contentHash: access.accessDigest,
    contentBytes: access.resultBytes,
    count: access.queryCount,
  });

  const responseText = "Synthetic Fresh candidate grounded in the admitted snapshot; exact Owner review remains required.";
  const eventsForExtraction = [
    { type: "thread_started" as const, threadId: "thread_walkthroughfresh000000000000", turnId: null, provider: "OpenAI", model: prepared.sessionEnvelope.modelId },
    { type: "turn_started" as const, threadId: "thread_walkthroughfresh000000000000", turnId: "turn_walkthroughfresh000000000000", provider: "OpenAI", model: prepared.sessionEnvelope.modelId },
    {
      type: "item_completed" as const,
      threadId: "thread_walkthroughfresh000000000000",
      turnId: "turn_walkthroughfresh000000000000",
      provider: "OpenAI",
      model: prepared.sessionEnvelope.modelId,
      item: { itemType: "agent_message" as const, phase: "final_answer" as const, text: canonicalJson({ responseText }) },
    },
    { type: "turn_completed" as const, threadId: "thread_walkthroughfresh000000000000", turnId: "turn_walkthroughfresh000000000000", provider: "OpenAI", model: prepared.sessionEnvelope.modelId, turnStatus: "completed" as const },
  ];
  const admissionEvidence = finalizeSyntheticFreshAdmission({
    transportGate: hardTransport,
    events: eventsForExtraction,
    processExitCode: 0,
    observedOutputSchemaHash: prepared.sessionEnvelope.outputSchemaHash,
    snapshotBroker: broker,
    outputTokens: 32,
    applicableSpendUsd: 0,
    startedAt: preparedAt,
    completedAt: new Date(preparedAt.getTime() + 4_500),
    expiresAt: new Date(Date.parse(T0) + 7 * 24 * 60 * 60 * 1_000),
  });
  const sessionReceipt = admissionEvidence.sessionReceipt;
  const compilationProjection = store.projection(pulledInteraction.projectionId);
  if (!compilationProjection) throw new Error("trusted current Projection is unavailable at candidate compilation");
  let candidate = extractCandidateFromCompletedTurn({
    events: eventsForExtraction,
    authorizedThreadId: "thread_walkthroughfresh000000000000",
    authorizedTurnId: "turn_walkthroughfresh000000000000",
    expectedProvider: "OpenAI",
    expectedModel: prepared.sessionEnvelope.modelId,
    expectedOutputSchemaHash: prepared.sessionEnvelope.outputSchemaHash,
    admissionEvidence,
    sessionEnvelope: prepared.sessionEnvelope,
    expectedSessionEnvelopeHash: prepared.sessionEnvelopeHash,
    currentInteraction: pulledInteraction,
    currentOriginStateAtCompilation: compilationProjection.lifecycle.ownerState,
    currentTwinBasisHash: twinHash,
    currentPolicyHash: snapshot.policy.policyHash,
    admittedAt: new Date(preparedAt.getTime() + 5_000),
    expiresAt: new Date(Date.parse(T0) + 7 * 24 * 60 * 60 * 1_000),
  });
  record("J2", {
    action: "fresh_events.extract_candidate",
    outcome: "one_completed_authorized_final_only",
    objectId: candidate.candidateId,
    contentHash: candidate.candidateHash,
    contentBytes: utf8Bytes(candidate.responseText),
  });
  const runtimeReceipt = runtimeStore.terminate(
    runtimeRunId,
    "normal",
    new Date(preparedAt.getTime() + 5_250),
  );
  if (runtimeStore.runtimeByteCount(runtimeRunId) !== 0) throw new Error("Fresh runtime bytes survived terminal cleanup");
  record("J2", {
    action: "fresh_runtime.terminate",
    outcome: runtimeReceipt.outcome,
    objectId: runtimeRunId,
    count: 0,
  });
  rmSync(runtimeTemporary, { recursive: true, force: true });

  const temporary = mkdtempSync(join(realpathSync(tmpdir()), "forme-r4-walkthrough-"));
  const workspaceRoot = join(temporary, "workspace");
  const candidateRoot = join(temporary, "candidate-protection");
  mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
  const protector = new SyntheticUserPresenceKeyProtector({
    presenceProof: "synthetic-owner-presence",
    wrappingKey: new Uint8Array(32).fill(7),
  });
  const candidateLock = new ProtectedRoomLock({
    root: join(temporary, "room-locks"),
    bootId: "synthetic-walkthrough-boot",
  });
  const candidateCoordinator = coordinatorForRoomLock(candidateLock);
  const candidateStore = new FileCandidateStore({
    root: candidateRoot,
    workspaceRoot,
    protector,
    coordinator: candidateCoordinator,
  });
  let delivered: OperationResponse;
  try {
    const admitted = await candidateStore.put(candidate);
    if (!candidateStore.hasCiphertext(candidate.candidateId)) throw new Error("encrypted candidate was not persisted");
    let wrongPresenceDenied = false;
    try {
      await createCandidateOwnerReviewPort({
        store: candidateStore,
        confirmUserPresence: () => "wrong-presence",
      }).read({ candidateId: candidate.candidateId, now: new Date(preparedAt.getTime() + 6_000) });
    } catch {
      wrongPresenceDenied = true;
    }
    if (!wrongPresenceDenied) throw new Error("candidate read did not require exact user presence");
    const ownerReview = createCandidateOwnerReviewPort({
      store: candidateStore,
      confirmUserPresence: () => "synthetic-owner-presence",
    });
    const originalCandidate = candidate;
    candidate = await ownerReview.replaceResponseText({
      candidateId: originalCandidate.candidateId,
      expectedHash: admitted.candidateHash,
      responseText: `${originalCandidate.responseText} Owner clarified the closing sentence.`,
      now: new Date(preparedAt.getTime() + 6_500),
    });
    record("J2", {
      action: "candidate_store.owner_replace",
      outcome: "response_text_only_successor_requires_new_approval",
      objectId: candidate.candidateId,
      contentHash: candidate.candidateHash,
      contentBytes: utf8Bytes(candidate.responseText),
    });
    const approval = await ownerReview.approveExact({
      candidateId: candidate.candidateId,
      expectedHash: candidate.candidateHash,
      now: new Date(preparedAt.getTime() + 7_000),
      expiresAt: new Date(preparedAt.getTime() + 10 * 60 * 1_000),
    });
    record("J2", {
      action: "fresh_session.receipt",
      outcome: "body_path_free_access_and_usage_evidence",
      objectId: sessionReceipt.receiptId,
      contentHash: canonicalSha256(sessionReceipt),
      contentBytes: sessionReceipt.sourceResultBytes,
      count: sessionReceipt.dispatches,
    });
    record("J2", {
      action: "candidate_store.approve_exact",
      outcome: "encrypted_outside_workspace_and_user_presence_approved",
      objectId: candidate.candidateId,
      contentHash: approval.artifactHash,
      expiresAt: approval.expiresAt,
    });

    hostedClock = preparedAt.getTime() + 8_000;
    const publicationDelivery = coordinateResponsePublicationV1({
      responseId: `response_${candidate.candidateHash.slice(7, 39)}`,
      publicationAttestationId: `att_${canonicalSha256({ kind: "response_publication", candidateHash: candidate.candidateHash }).slice(7, 39)}`,
      candidate,
      approval,
      binding: {
        bindingId: SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
        roomId: PUBLIC_ROOM_ID,
        secret: new TextEncoder().encode(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
        state: "current",
        expiresAt: "2026-09-02T12:00:00.000Z",
      },
      responseExpiresAt: candidate.expiresAt,
      attestationExpiresAt: approval.expiresAt,
      reader: {
        protocolVersion: "trusted_response_publication_state_reader.v1",
        readCurrentAfterApproval: () => {
          const currentInteraction = store.interaction(candidate.interactionId);
          const currentProjection = store.projection(candidate.projectionId);
          const currentRoom = store.room(candidate.roomId);
          if (!currentInteraction || !currentProjection || !currentRoom) throw new Error("trusted publication state is unavailable");
          return {
            artifactClass: "response",
            observedAt: new Date(hostedClock).toISOString(),
            roomId: currentRoom.room.roomId,
            roomStatus: currentRoom.room.status,
            projectionId: currentProjection.projection.projectionId,
            interactionId: currentInteraction.interaction.interactionId,
            interactionState: currentInteraction.interaction.state === "accepted"
              || currentInteraction.interaction.state === "seen_locally"
              || currentInteraction.interaction.state === "preparing"
              ? currentInteraction.interaction.state
              : "terminal",
            originState: currentProjection.lifecycle.ownerState,
            candidateStoreState: candidateStore.hasCiphertext(candidate.candidateId) ? "protected_current" : "missing",
            candidateHash: candidate.candidateHash,
            twinBasisHash: canonicalSha256(syntheticTwin()),
            snapshotManifestHash: snapshot.manifest.manifestHash,
            sessionReceiptHash: candidate.sessionReceiptHash,
            sourceDisclosureClass: candidate.sourceDisclosureClass,
            policyHash: snapshot.policy.policyHash,
            existingResponseId: currentInteraction.response?.responseId ?? null,
            parentInteractionExpiresAt: currentInteraction.interaction.expiresAt,
          };
        },
      },
    });
    const publicationPort = new FakeSyntheticPublicationPort();
    const publicationOperation = new SyntheticLocalPublicationOperation({
      root: join(temporary, "publication"),
      coordinator: candidateCoordinator,
      port: publicationPort,
    });
    const localPublicationReceipt = await publicationOperation.submit({
      roomId: candidate.roomId,
      delivery: publicationDelivery,
      now: new Date(preparedAt.getTime() + 8_000),
    });
    const recoveredPublicationReceipt = await publicationOperation.submit({
      roomId: candidate.roomId,
      delivery: publicationDelivery,
      now: new Date(preparedAt.getTime() + 8_500),
    });
    if (publicationPort.committedCount() !== 1 || canonicalJson(localPublicationReceipt) !== canonicalJson(recoveredPublicationReceipt)) {
      throw new Error("local publication intent/idempotent receipt did not converge");
    }
    record("J2", {
      action: "local_publication.submit",
      outcome: "durable_intent_one_commit_and_idempotent_receipt",
      objectId: localPublicationReceipt.hostedReceiptId,
      contentHash: localPublicationReceipt.requestHash,
      count: publicationPort.committedCount(),
    });
    delivered = await call("room_operator.response.deliver", {
      expectedVersion: 3,
      body: { delivery: publicationDelivery },
    });
    await candidateStore.cleanup(candidate.candidateId, "published", new Date(preparedAt.getTime() + 8_000));
    if (candidateStore.hasCiphertext(candidate.candidateId) || candidateStore.hasCleanupJournal(candidate.candidateId)) {
      throw new Error("candidate cleanup did not reach a clean terminal state");
    }
    record("J2", {
      action: "candidate_store.cleanup",
      outcome: "published_candidate_ciphertext_and_key_removed",
      objectId: candidate.candidateId,
      contentHash: candidate.candidateHash,
      count: 0,
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  const syntheticNotice = field<{ state: string; externalEmailSent: false }>(delivered, "syntheticNotice");
  record("J2", {
    action: "room_operator.response.deliver",
    outcome: "verified_candidate_approval_receipt_bundle_published",
    objectId: field<string>(delivered, "responseId"),
    objectVersion: field<number>(delivered, "interactionVersion"),
    contentHash: candidate.candidateHash,
    contentBytes: utf8Bytes(candidate.responseText),
    state: syntheticNotice.state,
    externalEmailSent: syntheticNotice.externalEmailSent,
  });

  const polled = await call("interaction.read", { params: { interactionId: j1InteractionId }, secret: j1ReplySecret });
  const polledInteraction = field<{ state: string; response: { body: string } }>(polled, "interaction");
  record("J1", {
    action: "interaction.read",
    outcome: "canonical_reply_poll_ready",
    objectId: j1InteractionId,
    state: polledInteraction.state,
    contentHash: canonicalSha256(polledInteraction.response.body),
    contentBytes: utf8Bytes(polledInteraction.response.body),
  });

  // J3 — a short derivative lets a Guest-owned Agent submit once, never read/delete/delegate/cross Room.
  const j3GrantSecret = "walkthrough_j3_manual_grant_secret_001";
  const j3Grant = await issueGrant("familiar_collaborator", j3GrantSecret, PUBLIC_ROOM_ID, PUBLIC_PROJECTION_ID, true);
  const j3AgentSecret = "walkthrough_j3_agent_derivative_00001";
  const minted = await call("agent_derivative.mint", {
    secret: j3GrantSecret,
    body: {
      agentSecret: j3AgentSecret,
      replySecret: "walkthrough_j3_manual_reply_secret_001",
      deleteSecret: "walkthrough_j3_manual_delete_secret_01",
    },
  });
  const derivative = field<{ derivativeId: string; expiresAt: string }>(minted, "derivative");
  record("J3", {
    action: "agent_derivative.mint",
    outcome: "exact_room_projection_one_use",
    objectId: derivative.derivativeId,
    expiresAt: derivative.expiresAt,
  });
  const j3Request = request(PUBLIC_PROJECTION_ID, "walkthrough_j3_agent");
  const j3Created = await call("interaction.create", { secret: j3AgentSecret, body: j3Request });
  const j3InteractionId = interactionId(j3Created);
  record("J3", {
    action: "interaction.create",
    outcome: "agent_submission_consumed_derivative_and_parent_quota",
    objectId: j3InteractionId,
    count: (store.capability(j3Grant.grantId)?.value as GrantV1).acceptedCount,
    contentHash: canonicalSha256(j3Request.requestBody),
  });
  const denied: string[] = [];
  for (const attempt of [
    () => call("interaction.read", { params: { interactionId: j3InteractionId }, secret: j3AgentSecret }),
    () => call("interaction.delete", { params: { interactionId: j3InteractionId }, secret: j3AgentSecret, expectedVersion: 1 }),
    () => call("agent_derivative.mint", {
      secret: j3AgentSecret,
      body: {
        agentSecret: "walkthrough_nested_agent_secret_001",
        replySecret: "walkthrough_nested_reply_secret_001",
        deleteSecret: "walkthrough_nested_delete_secret_001",
      },
    }),
    () => call("interaction.create", { secret: j3AgentSecret, body: request(PRIVATE_PROJECTION_ID, "walkthrough_j3_cross") }),
    () => call("interaction.create", { secret: j3AgentSecret, body: request(PUBLIC_PROJECTION_ID, "walkthrough_j3_reuse") }),
  ]) {
    try {
      await attempt();
      throw new Error("synthetic derivative boundary unexpectedly allowed an operation");
    } catch (error) {
      denied.push(denialCode(error));
    }
  }
  record("J3", {
    action: "agent_derivative.boundary",
    outcome: "reply_delete_delegate_cross_room_reuse_denied",
    objectId: derivative.derivativeId,
    count: denied.length,
    contentHash: canonicalSha256(denied),
  });
  await close(j3InteractionId);

  // J4 — all four explicit presets, one unresolved lock, shared quota, fixed expiry, and trusted quota + 1.
  const presets: Array<[GrantPresetId, number, number]> = [
    ["one_visit", 1, 1],
    ["short_exchange", 3, 2],
    ["familiar_collaborator", 7, 3],
    ["trusted_collaborator", 7, 10],
  ];
  let trustedGrant: GrantV1 | null = null;
  const trustedSecret = "walkthrough_j4_trusted_grant_secret_001";
  for (const [presetId, days, quota] of presets) {
    const secret = presetId === "trusted_collaborator"
      ? trustedSecret
      : `walkthrough_j4_${presetId}_secret_001`;
    const grant = await issueGrant(presetId, secret, PUBLIC_ROOM_ID, PUBLIC_PROJECTION_ID, presetId === "trusted_collaborator");
    if (presetId === "trusted_collaborator") trustedGrant = grant;
    record("J4", {
      action: `grant.issue.${presetId}`,
      outcome: "fixed_expiry_and_quota",
      objectId: grant.grantId,
      expiresAt: grant.expiresAt,
      count: grant.acceptedQuota,
      contentHash: canonicalSha256({ days, quota, fixed: Date.parse(grant.expiresAt) - Date.parse(grant.issuedAt) }),
    });
  }
  if (!trustedGrant) throw new Error("synthetic trusted fixture was not issued");

  const firstTrustedBody = request(PUBLIC_PROJECTION_ID, "walkthrough_j4_1");
  const retryKey = "55555555555555555555555555555555";
  const firstTrusted = await call("interaction.create", {
    secret: trustedSecret,
    body: firstTrustedBody,
    idempotencyKey: retryKey,
  });
  const firstTrustedReplay = await call("interaction.create", {
    secret: trustedSecret,
    body: firstTrustedBody,
    idempotencyKey: retryKey,
  });
  if (interactionId(firstTrustedReplay) !== interactionId(firstTrusted)) throw new Error("synthetic retry was not idempotent");
  let unresolvedDenial = "";
  try {
    await call("interaction.create", { secret: trustedSecret, body: request(PUBLIC_PROJECTION_ID, "walkthrough_j4_blocked") });
  } catch (error) {
    unresolvedDenial = denialCode(error);
  }
  await close(interactionId(firstTrusted));

  const sharedAgentSecret = "walkthrough_j4_shared_agent_secret_001";
  await call("agent_derivative.mint", {
    secret: trustedSecret,
    body: {
      agentSecret: sharedAgentSecret,
      replySecret: "walkthrough_j4_manual_reply_secret_001",
      deleteSecret: "walkthrough_j4_manual_delete_secret_01",
    },
  });
  const shared = await call("interaction.create", {
    secret: sharedAgentSecret,
    body: request(PUBLIC_PROJECTION_ID, "walkthrough_j4_2_agent"),
  });
  await close(interactionId(shared));
  for (let count = 3; count <= 10; count += 1) {
    const accepted = await call("interaction.create", {
      secret: trustedSecret,
      body: request(PUBLIC_PROJECTION_ID, `walkthrough_j4_${count}`),
    });
    await close(interactionId(accepted));
  }
  let quotaDenial = "";
  try {
    await call("interaction.create", { secret: trustedSecret, body: request(PUBLIC_PROJECTION_ID, "walkthrough_j4_11") });
  } catch (error) {
    quotaDenial = denialCode(error);
  }
  let privateDenial = "";
  try {
    await call("projection.read", { params: { projectionId: PRIVATE_PROJECTION_ID }, secret: trustedSecret });
  } catch (error) {
    privateDenial = denialCode(error);
  }
  const exhausted = store.capability(trustedGrant.grantId)?.value as GrantV1;
  record("J4", {
    action: "trusted_collaborator.exercise",
    outcome: "ten_shared_accepted_then_eleven_denied_no_private_widening",
    objectId: trustedGrant.grantId,
    state: exhausted.state,
    expiresAt: exhausted.expiresAt,
    count: exhausted.acceptedCount,
    denialCode: `${unresolvedDenial}|${quotaDenial}|${privateDenial}`,
    contentHash: canonicalSha256({ unresolvedDenial, quotaDenial, privateDenial }),
  });

  // J5 — Private Room body and submit authority require one exact Grant.
  let noGrantDenial = "";
  try {
    await call("projection.read", { params: { projectionId: PRIVATE_PROJECTION_ID } });
  } catch (error) {
    noGrantDenial = denialCode(error);
  }
  const privateSecret = "walkthrough_j5_private_exact_secret_001";
  const privateGrant = await issueGrant(
    "short_exchange",
    privateSecret,
    PRIVATE_ROOM_ID,
    PRIVATE_PROJECTION_ID,
    false,
  );
  const privateRead = await call("projection.read", {
    params: { projectionId: PRIVATE_PROJECTION_ID },
    secret: privateSecret,
  });
  const privateView = field<{ projection: { projectionId: string; payloadHash: `sha256:${string}` } }>(privateRead, "view");
  record("J5", {
    action: "projection.read.private",
    outcome: "denied_without_grant_then_exact_grant_read",
    objectId: privateView.projection.projectionId,
    denialCode: noGrantDenial,
    contentHash: privateView.projection.payloadHash,
  });
  const privateRequest = request(PRIVATE_PROJECTION_ID, "walkthrough_j5_private");
  const privateCreated = await call("interaction.create", { secret: privateSecret, body: privateRequest });
  const privateInteractionId = interactionId(privateCreated);
  record("J5", {
    action: "interaction.create.private",
    outcome: "exact_private_room_projection_scope_only",
    objectId: privateInteractionId,
    state: field<string>(privateCreated, "state"),
    contentHash: canonicalSha256(privateRequest.requestBody),
    count: (store.capability(privateGrant.grantId)?.value as GrantV1).acceptedCount,
  });
  await close(privateInteractionId);

  const labels: Record<SyntheticWalkthroughJourney["journeyId"], string> = {
    J1: "Manual public Guest",
    J2: "Owner-local deterministic response path",
    J3: "Agent Guest derivative",
    J4: "Familiar and trusted continuation",
    J5: "Exact-Grant Private Room",
  };
  const journeys = (["J1", "J2", "J3", "J4", "J5"] as const).map((journeyId) => {
    const steps = audit.get(journeyId) ?? [];
    const stepHashes = steps.map((step) => canonicalSha256(step));
    return {
      journeyId,
      label: labels[journeyId],
      stepCount: steps.length,
      stepHashes,
      transcriptHash: canonicalSha256(steps),
    } satisfies SyntheticWalkthroughJourney;
  });
  const preimage: Omit<SyntheticR4WalkthroughResult, "aggregateHash"> = {
    schemaVersion: "r4.synthetic_walkthrough.v1" as const,
    packetHash: PACKET_HASH,
    deterministicClock: T0,
    syntheticOnly: true as const,
    effects: {
      networkCalls: 0 as const,
      providerCalls: 0 as const,
      syntheticTransportDispatches: 1 as const,
      externalEmailSends: 0 as const,
      realGuestRecords: 0 as const,
    },
    journeys,
  };
  const result: SyntheticR4WalkthroughResult = {
    ...preimage,
    aggregateHash: canonicalSha256(preimage),
  };
  assertBodyFree(result);
  return result;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const result = await runSyntheticR4Walkthrough();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
