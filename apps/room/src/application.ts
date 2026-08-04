import {
  GRANT_PRESETS,
  addMilliseconds,
  canonicalSha256,
  canTransitionInteraction,
  canTransitionProjection,
  createAcceptedInteractionV1,
  createApiMutationEnvelopeV1,
  createProjectionReadViewV1,
  deriveAgentDerivativeUse,
  deriveGrantUse,
  deriveProjectionRead,
  derivePublicEncounterUse,
  effectiveExpiry,
  grantExpiryForPreset,
  resolveResponseTerminal,
  validateDirectGrantInviteV1,
  validateCursorGoneV1,
  validateDispatchPermitV1,
  validateFreshCycleReservationV1,
  validateGrantOfferV1,
  validateGuestCapsuleV1,
  validateHostedPublicationDeliveryV1,
  validateResponseV1,
  validateRoomEventAckReceiptV1,
  validateRoomEventAckV1,
  validateRoomEventBatchV1,
  validateRoomOperatorRequestV1,
  type AgentDerivativeV1,
  type ApiMutationEnvelopeV1,
  type ApiActorClass,
  type ConsentEnvelopeV1,
  type DispatchPermitV1,
  type DirectGrantInviteV1,
  type FreshCycleReservationV1,
  type GrantOfferV1,
  type GrantPresetId,
  type GrantV1,
  type GuestCapsuleV1,
  type HostedPublicationDeliveryV1,
  type InteractionConsent,
  type InteractionType,
  type InteractionV1,
  type ProjectionLifecycleV1,
  type ProjectionReadViewV1,
  type PublicEncounterV1,
  type ResponseV1,
  type ResponseState,
  type RoomV1,
  type RoomOperatorAction,
  type RoomOperatorRequestV1,
  type Sha256,
} from "../../../packages/r4-protocol/src/index.ts";
import type { OperationDefinition } from "./operation-inventory.ts";
import type {
  StoredCapability,
  StoredInteraction,
  StoredProjection,
  StoredRoom,
  StoredRoomOperatorBinding,
} from "./domain.ts";
import { projectionWithPayloadHash } from "./domain.ts";
import { syntheticPairingCredential } from "./synthetic-fixtures.ts";
import { HostedPublicationVerificationError, verifyHostedPublicationForBindingV1 } from "./publication-verifier.ts";
import {
  SYNTHETIC_BACKUP_RETENTION_DISCLOSURE_HASH,
  SYNTHETIC_CONSENT_COPY_HASH,
  SYNTHETIC_PROVIDER_POLICY_HASH,
  SYNTHETIC_PROVIDER_POLICY_URL,
  SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE_HASH,
} from "./consent.ts";
import {
  agentDerivativeView,
  directGrantInviteView,
  grantView,
  notificationEndpointView,
  publicEncounterView,
  publicInteractionView,
} from "./redaction.ts";
import {
  operationReceipt,
  replaceDerivative,
  replaceEncounter,
  replaceGrant,
  type HostedPresenceStore,
  type StoredOperationResult,
} from "./store.ts";
import {
  FakeNotificationProviderSpy,
  NotificationControlError,
  SyntheticNotificationControl,
  type FakeNotificationProvider,
  type NotificationInspection,
  type NotifyFault,
  type NotifyOnceResult,
} from "./offline-control/notification.ts";
import {
  SyntheticPublicRateControl,
  SyntheticPublicRateError,
} from "./offline-control/public-rate.ts";
import {
  SyntheticHourlyJanitor,
  SyntheticRetentionRepository,
  type JanitorHealth,
  type JanitorRunResult,
  type PurgeReceipt,
  type RetentionTarget,
} from "./offline-control/retention.ts";

export interface OperationRequest {
  definition: OperationDefinition;
  params: Record<string, string>;
  body: Record<string, unknown>;
  authorization: string | null;
  syntheticActor: string | null;
  idempotencyKey: string | null;
  expectedVersion: number | null;
  /** Gate A analogue of an edge-derived, per-Room coarse abuse bucket. */
  syntheticClientBucket?: string | null;
}

export interface OperationResponse {
  status: number;
  body: Record<string, unknown>;
}

export class SemanticError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SemanticError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Next's production bundler can materialize the application and route modules
 * as separate copies.  An Error created by one copy then fails an
 * `instanceof` check against the other copy even though it is the same typed
 * semantic failure.  Keep the wire mapping structural and deliberately
 * narrow so expected 4xx results never degrade into an internal 503.
 */
export function isSemanticError(error: unknown): error is SemanticError {
  if (error instanceof SemanticError) return true;
  if (error === null || typeof error !== "object") return false;
  const candidate = error as Partial<SemanticError>;
  return candidate.name === "SemanticError"
    && Number.isInteger(candidate.status)
    && Number(candidate.status) >= 400
    && Number(candidate.status) <= 599
    && typeof candidate.code === "string"
    && /^[a-z][a-z0-9_]{0,95}$/u.test(candidate.code)
    && typeof candidate.message === "string";
}

export interface ExactRoomOperatorScope {
  roomId: string;
  exactTargetId: string;
}

export function assertRoomOperatorBindingScope(
  binding: StoredRoomOperatorBinding,
  scope: ExactRoomOperatorScope,
  now: string,
): void {
  if (
    binding.state !== "active"
    || binding.revokedAt !== null
    || Date.parse(binding.expiresAt) <= Date.parse(now)
    || binding.roomId !== scope.roomId
  ) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
}

export function buildValidatedRoomOperatorRequest(
  binding: StoredRoomOperatorBinding,
  scope: ExactRoomOperatorScope,
  action: RoomOperatorAction,
  mutation: ApiMutationEnvelopeV1 | null,
): RoomOperatorRequestV1 {
  return validateRoomOperatorRequestV1({
    schemaVersion: "room_operator_request.v1",
    bindingId: binding.bindingId,
    roomId: scope.roomId,
    action,
    mutation,
    exactTargetId: scope.exactTargetId,
  });
}

function requiredString(body: Record<string, unknown>, name: string, maximum = 4096): string {
  const value = body[name];
  if (
    typeof value !== "string"
    || value.length === 0
    || value.normalize("NFC") !== value
    || new TextEncoder().encode(value).length > maximum
  ) throw new SemanticError(400, "invalid_request", `${name} is not canonical UTF-8 text within ${maximum} bytes`);
  return value;
}

function optionalString(body: Record<string, unknown>, name: string, maximum = 4096): string | null {
  const value = body[name];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.normalize("NFC") !== value || new TextEncoder().encode(value).length > maximum) {
    throw new SemanticError(400, "invalid_request", `${name} is not canonical UTF-8 text within ${maximum} bytes`);
  }
  return value;
}

function isCanonicalCapabilitySecret(value: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return false;
  try {
    const bytes = Buffer.from(value, "base64url");
    return bytes.byteLength === 32 && bytes.toString("base64url") === value;
  } catch {
    return false;
  }
}

function capabilitySecret(body: Record<string, unknown>, name: string): string {
  const value = requiredString(body, name, 256);
  if (!isCanonicalCapabilitySecret(value)) {
    throw new SemanticError(
      400,
      "invalid_capability_secret",
      `${name} must be canonical unpadded base64url encoding of exactly 32 random bytes`,
    );
  }
  return value;
}

function sha(body: Record<string, unknown>, name: string): Sha256 {
  const value = requiredString(body, name, 80);
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) throw new SemanticError(400, "invalid_hash", `${name} must be a lowercase SHA-256`);
  return value as Sha256;
}

function canonicalValue<T>(
  value: unknown,
  name: string,
  validator: (value: unknown) => T,
): T {
  try {
    return validator(value);
  } catch {
    throw new SemanticError(400, `invalid_${name}`, `${name} is not a canonical R4 object`);
  }
}

function canonicalObject<T>(
  body: Record<string, unknown>,
  name: string,
  validator: (value: unknown) => T,
): T {
  return canonicalValue(body[name], name, validator);
}

function assertExactBodyKeys(body: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(body).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new SemanticError(400, "invalid_request_shape", `Expected exact body keys: ${wanted.join(",")}`);
  }
}

interface ExactRequestShape {
  readonly required: readonly string[];
  readonly optional?: readonly string[];
}

const EXACT_OPERATION_BODY_SHAPES: Readonly<Record<string, ExactRequestShape>> = {
  "third_place.list": { required: [] },
  "projection.read": { required: [] },
  "public_encounter.issue": { required: ["encounterSecret"] },
  "interaction.create": {
    required: ["projectionId", "interactionType", "consent", "requestBody"],
    optional: ["replySecret", "deleteSecret", "guestCapsule"],
  },
  "interaction.read": { required: [] },
  "interaction.delete": { required: [] },
  "notification.set": { required: ["email"] },
  "notification.remove": { required: [] },
  "notification.verify": { required: ["code"] },
  "grant_offer.accept": { required: ["grantSecret"] },
  "direct_invite.redeem": { required: ["grantSecret"] },
  "agent_derivative.mint": { required: ["agentSecret", "replySecret", "deleteSecret"] },
  "control.status": { required: [] },
  "control.interaction.read": { required: [] },
  "room.create": { required: ["entityId", "roomKind", "label"] },
  "room.pair": { required: [] },
  "room.pair.exchange": { required: ["pairingCode", "clientPublicKey"] },
  "room.binding.revoke": { required: [] },
  "room.mode.set": { required: ["interactionMode"] },
  "room.retire": { required: [] },
  "room.delete": { required: [] },
  "projection.revoke": { required: [] },
  "response.revoke": { required: [] },
  "grant.issue": {
    required: ["roomId", "projectionId", "presetId", "grantSecret"],
    optional: ["permitsAgentDerivative", "reentryChainId"],
  },
  "grant.replace": { required: ["grantSecret"], optional: ["presetId", "permitsAgentDerivative"] },
  "grant.revoke": { required: [] },
  "grant_offer.issue": {
    required: ["sourceInteractionId", "roomId", "projectionId", "presetId", "acceptanceExpiresAt", "offeredGrantExpiresAt"],
  },
  "grant_offer.revoke": { required: [] },
  "direct_invite.issue": {
    required: ["roomId", "projectionId", "presetId", "inviteSecret", "acceptanceExpiresAt", "offeredGrantExpiresAt"],
  },
  "direct_invite.revoke": { required: [] },
  "interaction.close": { required: [] },
  "curation.admit": { required: [] },
  "curation.unlist": { required: [] },
  "room_operator.status": { required: ["roomId"] },
  "room_operator.sync": { required: ["roomId", "afterSequence"] },
  "room_operator.pull": { required: [] },
  "room_operator.cycle.reserve": { required: ["startAuthorizationHash", "sessionEnvelopeHash"] },
  "room_operator.cycle.recover": { required: ["reservationId", "startAuthorizationHash", "sessionEnvelopeHash"] },
  "room_operator.cycle.abandon": {
    required: ["reservationId", "startAuthorizationHash", "sessionEnvelopeHash", "transportJournalDispatches"],
  },
  "room_operator.dispatch.issue": {
    required: ["reservationId", "sessionEnvelopeHash", "startAuthorizationHash", "provider", "model", "payloadHash", "ordinal"],
  },
  "room_operator.ack": {
    required: ["schemaVersion", "roomId", "eventId", "sequence", "eventHash", "idempotencyKey"],
  },
  "room_operator.stale.attest": { required: [] },
  "room_operator.local_purge.receipt": { required: ["localBytesAbsent"] },
} as const;

function assertExactRequestKeys(
  value: Record<string, unknown> | Record<string, string>,
  shape: ExactRequestShape,
  label: "body" | "params",
): void {
  const allowed = new Set([...shape.required, ...(shape.optional ?? [])]);
  const actual = Object.keys(value);
  const unknown = actual.filter((key) => !allowed.has(key));
  const missing = shape.required.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0 || missing.length > 0) {
    throw new SemanticError(
      400,
      "invalid_request_shape",
      `Invalid ${label} shape`,
    );
  }
}

function bearer(authorization: string | null): string {
  const match = /^Bearer ([A-Za-z0-9_-]+)$/u.exec(authorization ?? "");
  if (!match?.[1] || !isCanonicalCapabilitySecret(match[1])) {
    throw new SemanticError(404, "not_found", "The requested capability is unavailable");
  }
  return match[1];
}

function assertVersion(actual: number, expected: number | null): void {
  if (expected === null) throw new SemanticError(400, "expected_version_required", "Expected object version is required");
  if (actual !== expected) throw new SemanticError(409, "version_conflict", "Object version changed; inspect and retry explicitly");
}

function capId(capability: StoredCapability): string {
  if (capability.kind === "public_encounter") return capability.value.encounterId;
  if (capability.kind === "grant") return capability.value.grantId;
  return capability.value.derivativeId;
}

function capRoom(capability: StoredCapability): string {
  return capability.value.roomId;
}

function capProjection(capability: StoredCapability): string {
  return capability.value.projectionId;
}

function capState(capability: StoredCapability): PublicEncounterV1["state"] {
  return capability.value.state;
}

function capUnresolved(capability: StoredCapability): string | null {
  if (capability.kind === "agent_derivative") return null;
  return capability.value.unresolvedInteractionId;
}

interface DerivativeRecoveryBinding {
  readonly schemaVersion: "synthetic_derivative_recovery_binding.v1";
  readonly derivativeId: string;
  readonly parentCapabilityId: string;
  readonly roomId: string;
  readonly projectionId: string;
  readonly replyCapabilityDigest: Sha256;
  readonly deleteCapabilityDigest: Sha256;
  readonly state: "bound";
}

function actorClass(request: OperationRequest, capability?: StoredCapability): ApiActorClass {
  if (request.definition.actor === "public") return "public";
  if (request.definition.actor === "controller") return "controller";
  if (request.definition.actor === "curator") return "curator";
  if (request.definition.actor === "room_operator") return "room_operator.v1";
  return capability?.kind === "agent_derivative" ? "guest_agent" : "manual_guest";
}

interface GrantOfferReplyViewV1 {
  readonly schemaVersion: "grant_offer_reply_view.v1";
  readonly offerId: string;
  readonly targetProjectionId: string;
  readonly title: string;
  readonly publicRoomLabel: string | null;
  readonly presetId: GrantPresetId;
  readonly acceptanceExpiresAt: string;
  readonly offeredGrantExpiresAt: string;
}

function responseView(
  stored: StoredInteraction,
  now: string,
  grantOffer: GrantOfferReplyViewV1 | null,
): Record<string, unknown> {
  const interaction = publicInteractionView(stored.interaction);
  const {
    requestText: _request,
    guestCapsule: _capsule,
    ...status
  } = interaction;
  const responseExpired = stored.response !== null
    && stored.response.state === "available"
    && Date.parse(stored.response.expiresAt) <= Date.parse(now);
  return {
    ...status,
    response: interaction.state === "response_ready" && stored.response?.state === "available" && !responseExpired
      ? stored.response
      : null,
    responseState: responseExpired ? "response_expired" : stored.response?.state ?? null,
    grantOffer,
  };
}

export class HostedRoomApplication {
  #store: HostedPresenceStore;
  #notifications: SyntheticNotificationControl;
  #publicRate: SyntheticPublicRateControl;
  #retentionRepository: SyntheticRetentionRepository;
  #retentionJanitor: SyntheticHourlyJanitor;
  #lastRetentionRun: JanitorRunResult | null = null;

  constructor(store: HostedPresenceStore, notificationProvider: FakeNotificationProvider = new FakeNotificationProviderSpy()) {
    this.#store = store;
    this.#notifications = new SyntheticNotificationControl(store, notificationProvider);
    this.#publicRate = new SyntheticPublicRateControl(store);
    this.#retentionRepository = new SyntheticRetentionRepository(store.now());
    this.#retentionJanitor = new SyntheticHourlyJanitor(this.#retentionRepository);
  }

  notificationInspection(interactionId: string): NotificationInspection {
    return this.#notifications.inspect(interactionId);
  }

  retentionInspection(now = this.#store.now()): {
    readonly targets: readonly RetentionTarget[];
    readonly receipts: readonly PurgeReceipt[];
    readonly health: JanitorHealth;
    readonly lastRun: JanitorRunResult | null;
  } {
    return {
      targets: this.#retentionRepository.targets(),
      receipts: this.#retentionRepository.receipts(),
      health: this.#retentionJanitor.health(now),
      lastRun: this.#lastRetentionRun ? structuredClone(this.#lastRetentionRun) : null,
    };
  }

  async runNotifyOnce(now = this.#store.now(), fault?: NotifyFault): Promise<NotifyOnceResult> {
    return this.#notifications.notifyOnce(now, fault);
  }

  async runVerificationNotifyOnce(now = this.#store.now(), fault?: NotifyFault) {
    return this.#notifications.notifyVerificationOnce(now, fault);
  }

  async applyLateNotificationResult(interactionId: string, result: "accepted" | "not_accepted") {
    return this.#store.runExclusive(() => this.#notifications.applyLateAuthenticatedResult(interactionId, result));
  }

  async run(request: OperationRequest): Promise<OperationResponse> {
    this.#assertSyntheticActor(request);
    const operatorBinding = request.definition.actor === "room_operator"
      ? this.#authenticateRoomOperator(request)
      : null;
    this.#assertExactOperationShape(request);
    if (!request.definition.mutating) {
      if (!operatorBinding) return this.#query(request);
      return this.#store.runExclusive(async () => {
        const lockedBinding = this.#reauthenticateExactRoomOperator(request, operatorBinding);
        const operatorRequest = this.#bindRoomOperatorRequest(request, lockedBinding, null);
        const response = await this.#query(request);
        return { ...response, body: { ...response.body, roomOperatorRequestHash: canonicalSha256(operatorRequest) } };
      });
    }
    const key = request.idempotencyKey;
    if (!key || !/^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$/.test(key)) {
      throw new SemanticError(400, "idempotency_key_required", "A client-generated idempotency key with at least 128 bits is required");
    }
    if (request.definition.expectedVersion && request.expectedVersion === null) {
      throw new SemanticError(400, "expected_version_required", "Expected object version is required");
    }
    const actorIdentity = this.#actorIdentity(request, operatorBinding);
    const authenticatedCapability = request.definition.actor === "guest_capability"
      ? this.#store.capabilityBySecret(bearer(request.authorization)) ?? undefined
      : undefined;
    const publicRateBucketDigest = this.#publicRateBucketDigestForMutation(request);
    const envelope = createApiMutationEnvelopeV1({
      actorClass: actorClass(request, authenticatedCapability),
      action: request.definition.name,
      idempotencyKey: key,
      expectedObjectVersion: request.expectedVersion,
      predecessorHash: null,
      payload: publicRateBucketDigest === null
        ? { params: request.params, body: request.body }
        : { params: request.params, body: request.body, publicRateBucketDigest },
    });
    const hash = envelope.canonicalRequestHash;
    return this.#store.runExclusive(async () => {
      const lockedBinding = operatorBinding
        ? this.#reauthenticateExactRoomOperator(request, operatorBinding)
        : null;
      const previous = this.#store.idempotency(actorIdentity, request.definition.name, key);
      if (previous) {
        if (previous.requestHash !== hash) {
          throw new SemanticError(409, "idempotency_conflict", "The same idempotency key was used with different canonical bytes");
        }
        return this.#recoverIdempotentResponse(request, previous);
      }
      const operatorRequest = lockedBinding
        ? this.#bindRoomOperatorRequest(request, lockedBinding, envelope)
        : null;
      const response = await this.#mutate(request, hash);
      if (operatorRequest && lockedBinding) {
        const operatorRequestHash = canonicalSha256(operatorRequest);
        this.#store.saveAuxiliary(`room_operator_audit:${operatorRequestHash}`, {
          schemaVersion: "synthetic_room_operator_audit.v1",
          bindingId: lockedBinding.bindingId,
          roomId: operatorRequest.roomId,
          action: operatorRequest.action,
          exactTargetId: operatorRequest.exactTargetId,
          operatorRequestHash,
          mutationHash: operatorRequest.mutation?.canonicalRequestHash ?? null,
          committedAt: this.#store.now(),
          bodyFree: true,
        });
      }
      const stored = this.#operationRecoveryRecord(request, hash, response);
      this.#store.saveIdempotency(actorIdentity, request.definition.name, key, stored);
      return response;
    });
  }

  async publicThirdPlace(): Promise<OperationResponse> {
    return { status: 200, body: { schemaVersion: "third_place_list.v1", residents: this.#store.listThirdPlace() } };
  }

  async ownerStatus(): Promise<OperationResponse> {
    return { status: 200, body: { schemaVersion: "synthetic_owner_status.v1", ...this.#store.ownerStatus(), synthetic: true } };
  }

  #assertSyntheticActor(request: OperationRequest): void {
    if (request.definition.actor === "controller" && request.syntheticActor !== "controller") {
      throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    }
    if (request.definition.actor === "curator" && request.syntheticActor !== "curator") {
      throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    }
    if (request.definition.actor === "room_operator" && request.syntheticActor !== "room_operator") {
      throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    }
  }

  #assertExactOperationShape(request: OperationRequest): void {
    const expectedParams = [...request.definition.path.matchAll(/:([^/]+)/gu)].map((match) => match[1] ?? "");
    assertExactRequestKeys(request.params, { required: expectedParams }, "params");
    if (
      request.definition.name === "room_operator.projection.deliver"
      || request.definition.name === "room_operator.response.deliver"
    ) return;
    const bodyShape = EXACT_OPERATION_BODY_SHAPES[request.definition.name];
    if (!bodyShape) throw new SemanticError(500, "operation_shape_unregistered", "Operation request shape is not registered");
    assertExactRequestKeys(request.body, bodyShape, "body");
  }

  #reauthenticateExactRoomOperator(
    request: OperationRequest,
    preflight: StoredRoomOperatorBinding,
  ): StoredRoomOperatorBinding {
    const current = this.#authenticateRoomOperator(request);
    if (current.bindingId !== preflight.bindingId) {
      throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    }
    return current;
  }

  #publicRateBucketDigestForMutation(request: OperationRequest): Sha256 | null {
    if (request.definition.name !== "public_encounter.issue") return null;
    const projectionId = request.params.projectionId;
    const clientBucket = request.syntheticClientBucket;
    if (!projectionId || typeof clientBucket !== "string") return null;
    const stored = this.#store.projection(projectionId);
    if (!stored) return null;
    try {
      return this.#publicRate.bucketDigest(stored.projection.roomId, clientBucket);
    } catch {
      throw new SemanticError(400, "invalid_client_bucket", "Synthetic client bucket is invalid");
    }
  }

  #operationRecoveryRecord(
    request: OperationRequest,
    requestHash: Sha256,
    response: OperationResponse,
  ): StoredOperationResult {
    const base: StoredOperationResult = {
      requestHash,
      status: response.status,
      body: response.body,
      sensitiveUntil: null,
      expiredStatus: null,
      expiredBody: null,
      retentionExpiresAt: addMilliseconds(this.#store.now(), 37 * 24 * 60 * 60 * 1_000),
      recoveryKind: "stored_body",
    };
    if (request.definition.name === "room_operator.projection.deliver") {
      const projection = response.body.projection as Record<string, unknown> | undefined;
      return {
        ...base,
        body: {
          schemaVersion: "publication_idempotency_recovery.v1",
          artifactClass: "projection",
          artifactId: projection?.projectionId ?? "",
          receipt: response.body.receipt,
        },
        recoveryKind: "publication_current",
      };
    }
    if (request.definition.name === "room_operator.response.deliver") {
      const delivery = request.body.delivery as { response?: { interactionId?: unknown } } | undefined;
      const interactionId = typeof delivery?.response?.interactionId === "string" ? delivery.response.interactionId : "";
      return {
        ...base,
        body: {
          schemaVersion: "publication_idempotency_recovery.v1",
          artifactClass: "response",
          artifactId: response.body.responseId,
          interactionId,
          interactionVersion: response.body.interactionVersion,
          syntheticNotice: response.body.syntheticNotice,
          receipt: response.body.receipt,
        },
        recoveryKind: "publication_current",
      };
    }
    if (request.definition.name === "room_operator.pull") {
      return {
        ...base,
        body: {
          schemaVersion: "room_operator_pull_recovery.v1",
          interactionId: request.params.interactionId ?? "",
          receipt: response.body.receipt,
        },
        recoveryKind: "room_operator_pull",
      };
    }
    if (request.definition.name === "notification.set" || request.definition.name === "notification.verify") {
      return {
        ...base,
        body: {
          schemaVersion: "notification_idempotency_recovery.v1",
          interactionId: request.params.interactionId ?? "",
          receipt: response.body.receipt,
        },
        recoveryKind: "notification_current",
      };
    }
    if (request.definition.name === "room.pair") {
      const expiresAt = String(response.body.expiresAt ?? "");
      return {
        ...base,
        sensitiveUntil: expiresAt,
        expiredStatus: 410,
        expiredBody: {
          schemaVersion: "synthetic_pairing_recovery_expired.v1",
          pairingId: response.body.pairingId,
          roomId: response.body.roomId,
          expiresAt,
          receipt: response.body.receipt,
        },
      };
    }
    if (request.definition.name === "room.pair.exchange") {
      const pairing = this.#store.pairingChallenge(request.params.pairingId ?? "");
      const sensitiveUntil = pairing?.expiresAt ?? this.#store.now();
      return {
        ...base,
        sensitiveUntil,
        expiredStatus: 410,
        expiredBody: {
          schemaVersion: "synthetic_pairing_exchange_recovery_expired.v1",
          pairingId: request.params.pairingId ?? "",
          roomId: response.body.roomId,
          expiresAt: sensitiveUntil,
          receipt: response.body.receipt,
        },
      };
    }
    return base;
  }

  #recoverIdempotentResponse(
    request: OperationRequest,
    previous: StoredOperationResult,
  ): OperationResponse {
    if (previous.recoveryKind === "stored_body") {
      return { status: previous.status, body: previous.body };
    }
    if (previous.recoveryKind === "publication_current") {
      return this.#recoverPublication(previous);
    }
    if (previous.recoveryKind === "room_operator_pull") {
      const interactionId = request.params.interactionId;
      if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
      const stored = this.#storedInteraction(interactionId);
      if (
        !["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)
        || Date.parse(stored.interaction.expiresAt) <= Date.parse(this.#store.now())
      ) throw new SemanticError(404, "not_found", "Interaction not available");
      return {
        status: previous.status,
        body: {
          schemaVersion: "room_operator_pull_result.v1",
          interaction: stored.interaction,
          receipt: previous.body.receipt,
        },
      };
    }
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#guestInteraction(request);
    if (
      Date.parse(stored.interaction.expiresAt) <= Date.parse(this.#store.now())
      || ["interaction_deleted", "origin_revoked", "room_retired"].includes(stored.interaction.state)
    ) this.#clearNotification(interactionId);
    const endpoint = notificationEndpointView(this.#store.notification(interactionId).endpoint);
    return {
      status: previous.status,
      body: {
        schemaVersion: request.definition.name === "notification.set"
          ? "notification_set_result.v1"
          : "notification_verify_result.v1",
        endpoint,
        receipt: previous.body.receipt,
        syntheticRecovery: { verificationCodeRetained: false, bodyFree: true },
      },
    };
  }

  #recoverPublication(previous: StoredOperationResult): OperationResponse {
    const artifactClass = previous.body.artifactClass;
    const artifactId = previous.body.artifactId;
    const unavailable = (): OperationResponse => ({
      status: 410,
      body: {
        schemaVersion: "publication_recovery_unavailable.v1",
        artifactClass,
        artifactId,
        state: "unavailable",
        receipt: previous.body.receipt,
      },
    });
    if (artifactClass === "projection" && typeof artifactId === "string") {
      const stored = this.#store.projection(artifactId);
      if (!stored) return unavailable();
      const room = this.#store.room(stored.projection.roomId);
      const now = Date.parse(this.#store.now());
      if (
        !room
        || room.room.status !== "active"
        || room.room.currentProjectionId !== artifactId
        || !stored.lifecycle.current
        || stored.lifecycle.ownerState !== "published_fresh"
        || Date.parse(stored.projection.publishedAt) > now
        || now >= Date.parse(stored.projection.freshUntil)
        || now >= Date.parse(stored.projection.expiresAt)
      ) return unavailable();
      return {
        status: previous.status,
        body: { projection: stored.projection, lifecycle: stored.lifecycle, receipt: previous.body.receipt },
      };
    }
    if (artifactClass === "response" && typeof artifactId === "string" && typeof previous.body.interactionId === "string") {
      const stored = this.#store.interaction(previous.body.interactionId);
      const now = Date.parse(this.#store.now());
      if (
        !stored
        || stored.response?.responseId !== artifactId
        || stored.response.state !== "available"
        || stored.interaction.state !== "response_ready"
        || Date.parse(stored.response.expiresAt) <= now
        || Date.parse(stored.interaction.expiresAt) <= now
      ) return unavailable();
      return {
        status: previous.status,
        body: {
          responseId: artifactId,
          interactionVersion: previous.body.interactionVersion,
          syntheticNotice: previous.body.syntheticNotice,
          receipt: previous.body.receipt,
        },
      };
    }
    return unavailable();
  }

  #actorIdentity(request: OperationRequest, operatorBinding: StoredRoomOperatorBinding | null): string {
    if (request.definition.actor === "guest_capability") return `guest:${this.#store.digestSecret(bearer(request.authorization))}`;
    return request.definition.actor === "room_operator"
      ? `room_operator:${operatorBinding?.bindingId ?? "unauthenticated"}`
      : `synthetic:${request.definition.actor}`;
  }

  #authenticateRoomOperator(request: OperationRequest): StoredRoomOperatorBinding {
    const binding = this.#store.roomOperatorBindingBySecret(bearer(request.authorization));
    if (!binding) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    if (
      binding.state !== "active"
      || binding.revokedAt !== null
      || Date.parse(binding.expiresAt) <= Date.parse(this.#store.now())
    ) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    return binding;
  }

  #bindRoomOperatorRequest(
    request: OperationRequest,
    binding: StoredRoomOperatorBinding,
    mutation: ApiMutationEnvelopeV1 | null,
  ): RoomOperatorRequestV1 {
    const { scope, action } = this.#roomOperatorScope(request);
    assertRoomOperatorBindingScope(binding, scope, this.#store.now());
    return buildValidatedRoomOperatorRequest(binding, scope, action, mutation);
  }

  #roomOperatorScope(request: OperationRequest): {
    scope: ExactRoomOperatorScope;
    action: RoomOperatorAction;
  } {
    switch (request.definition.name) {
      case "room_operator.status":
        return this.#directRoomOperatorScope(request, "inspect");
      case "room_operator.sync":
        return this.#directRoomOperatorScope(request, "sync");
      case "room_operator.ack": {
        const ack = canonicalValue(request.body, "room_event_ack", validateRoomEventAckV1);
        return { scope: { roomId: ack.roomId, exactTargetId: ack.eventId }, action: "ack_event" };
      }
      case "room_operator.pull":
        return this.#interactionRoomOperatorScope(request, "pull_exact_request");
      case "room_operator.cycle.reserve":
        return this.#interactionRoomOperatorScope(request, "reserve_fresh_cycle");
      case "room_operator.cycle.recover":
        return this.#interactionRoomOperatorScope(request, "recover_fresh_cycle");
      case "room_operator.cycle.abandon":
        return this.#interactionRoomOperatorScope(request, "abandon_zero_dispatch");
      case "room_operator.dispatch.issue":
        return this.#interactionRoomOperatorScope(request, "issue_dispatch_permit");
      case "room_operator.local_purge.receipt":
        return this.#interactionRoomOperatorScope(request, "attest_local_purge");
      case "room_operator.stale.attest":
        return this.#projectionRoomOperatorScope(request, "attest_stale");
      case "room_operator.projection.deliver": {
        const delivery = this.#publicationDelivery(request, "projection");
        const projection = delivery.projection;
        return {
          scope: { roomId: projection.roomId, exactTargetId: projection.projectionId },
          action: "deliver_projection",
        };
      }
      case "room_operator.response.deliver": {
        const delivery = this.#publicationDelivery(request, "response");
        const response = delivery.response;
        return {
          scope: { roomId: response.roomId, exactTargetId: response.responseId },
          action: "deliver_response",
        };
      }
      default:
        throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    }
  }

  #publicationDelivery<T extends "projection" | "response">(
    request: OperationRequest,
    expectedClass: T,
  ): Extract<HostedPublicationDeliveryV1, { artifactClass: T }> {
    assertExactBodyKeys(request.body, ["delivery"]);
    const delivery = canonicalObject(request.body, "delivery", validateHostedPublicationDeliveryV1);
    if (delivery.artifactClass !== expectedClass) {
      throw new SemanticError(400, "publication_arm_mismatch", "Delivery arm does not match the endpoint");
    }
    const binding = this.#authenticateRoomOperator(request);
    try {
      return verifyHostedPublicationForBindingV1({
        delivery,
        binding,
        bearerSecret: bearer(request.authorization),
        now: this.#store.now(),
      }) as Extract<HostedPublicationDeliveryV1, { artifactClass: T }>;
    } catch (error) {
      if (error instanceof HostedPublicationVerificationError) {
        throw new SemanticError(404, "not_found", "The requested operation is unavailable");
      }
      throw error;
    }
  }

  #directRoomOperatorScope(
    request: OperationRequest,
    action: "inspect" | "sync",
  ): { scope: ExactRoomOperatorScope; action: RoomOperatorAction } {
    const roomId = requiredString(request.body, "roomId", 160);
    this.#storedRoom(roomId);
    return { scope: { roomId, exactTargetId: roomId }, action };
  }

  #interactionRoomOperatorScope(
    request: OperationRequest,
    action: RoomOperatorAction,
  ): { scope: ExactRoomOperatorScope; action: RoomOperatorAction } {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    const stored = this.#store.interaction(interactionId);
    if (!stored) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    return { scope: { roomId: stored.interaction.roomId, exactTargetId: interactionId }, action };
  }

  #projectionRoomOperatorScope(
    request: OperationRequest,
    action: RoomOperatorAction,
  ): { scope: ExactRoomOperatorScope; action: RoomOperatorAction } {
    const projectionId = request.params.projectionId;
    if (!projectionId) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    const stored = this.#store.projection(projectionId);
    if (!stored) throw new SemanticError(404, "not_found", "The requested operation is unavailable");
    return { scope: { roomId: stored.projection.roomId, exactTargetId: projectionId }, action };
  }

  #receipt(request: OperationRequest, hash: Sha256, targetId: string, targetVersion: number, capability?: StoredCapability) {
    return operationReceipt(
      this.#store,
      request.definition.name,
      targetId,
      targetVersion,
      hash,
      request.idempotencyKey ?? "read_only_operation",
      actorClass(request, capability),
    );
  }

  #storedRoom(roomId: string): StoredRoom {
    const room = this.#store.room(roomId);
    if (!room) throw new SemanticError(404, "not_found", "Room not found");
    return room;
  }

  #storedProjection(projectionId: string): StoredProjection {
    const projection = this.#store.projection(projectionId);
    if (!projection) throw new SemanticError(404, "not_found", "Projection not found");
    return projection;
  }

  #storedInteraction(interactionId: string): StoredInteraction {
    const interaction = this.#store.interaction(interactionId);
    if (!interaction) throw new SemanticError(404, "not_found", "Interaction not found");
    return interaction;
  }

  #capability(request: OperationRequest, allowed: StoredCapability["kind"][]): StoredCapability {
    const capability = this.#store.capabilityBySecret(bearer(request.authorization));
    if (!capability || !allowed.includes(capability.kind)) throw new SemanticError(404, "not_found", "Capability not found");
    return capability;
  }

  async #query(request: OperationRequest): Promise<OperationResponse> {
    switch (request.definition.name) {
      case "third_place.list": return this.publicThirdPlace();
      case "projection.read": return this.#readProjection(request);
      case "interaction.read": return this.#readInteraction(request, false);
      case "control.status": return this.ownerStatus();
      case "control.interaction.read": return this.#readInteraction(request, true);
      case "room_operator.status": {
        const roomId = requiredString(request.body, "roomId", 160);
        const storedRoom = this.#storedRoom(roomId);
        const interactions = this.#store.ownerStatus().interactions.filter((item) => item.interaction.roomId === roomId);
        return { status: 200, body: { schemaVersion: "room_operator_status.v1", room: storedRoom.room, interactions, synthetic: true } };
      }
      default: throw new SemanticError(404, "not_found", "Operation not found");
    }
  }

  #readProjection(request: OperationRequest): OperationResponse {
    const projectionId = request.params.projectionId;
    if (!projectionId) throw new SemanticError(404, "not_found", "Projection not found");
    const stored = this.#storedProjection(projectionId);
    const storedRoom = this.#storedRoom(stored.projection.roomId);
    const access = storedRoom.room.roomKind === "private_grant_only"
      ? { kind: "grant" as const, grant: this.#grantForRead(request, stored) }
      : { kind: "public" as const };
    let view: ProjectionReadViewV1;
    try {
      view = createProjectionReadViewV1(storedRoom.room, stored.projection, stored.lifecycle, access, this.#store.now());
    } catch {
      throw new SemanticError(404, "not_found", "Projection not found");
    }
    return { status: 200, body: { view } };
  }

  #grantForRead(request: OperationRequest, stored: StoredProjection): GrantV1 {
    const capability = this.#capability(request, ["grant", "agent_derivative"]);
    if (
      capability.value.roomId !== stored.projection.roomId
      || capability.value.projectionId !== stored.projection.projectionId
    ) {
      throw new SemanticError(404, "not_found", "Projection not found");
    }
    if (capability.kind === "grant") return capability.value;
    if (capability.kind !== "agent_derivative") {
      throw new SemanticError(404, "not_found", "Projection not found");
    }
    const parent = this.#store.capability(capability.value.parentCapabilityId);
    if (!parent || parent.kind !== "grant") throw new SemanticError(404, "not_found", "Projection not found");
    const room = this.#storedRoom(stored.projection.roomId).room;
    const now = this.#store.now();
    const derivativeDecision = deriveAgentDerivativeUse(capability.value, parent.value.state, now, "read");
    const parentDecision = deriveGrantUse(parent.value, room, stored.projection, stored.lifecycle, now, "read");
    if (!derivativeDecision.allowed || !parentDecision.allowed) {
      throw new SemanticError(404, "not_found", "Projection not found");
    }
    return parent.value;
  }

  #readInteraction(request: OperationRequest, controller: boolean): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    const now = this.#store.now();
    if (Date.parse(stored.interaction.expiresAt) <= Date.parse(now)) {
      throw new SemanticError(404, "not_found", "Interaction not found");
    }
    if (["interaction_deleted", "origin_revoked", "room_retired"].includes(stored.interaction.state)) {
      throw new SemanticError(404, "not_found", "Interaction not found");
    }
    if (!controller && !this.#store.secretMatchesDigest(bearer(request.authorization), stored.interaction.replyCapabilityDigest)) {
      throw new SemanticError(404, "not_found", "Interaction not found");
    }
    if (controller) {
      const interaction = publicInteractionView(stored.interaction);
      const response = stored.response?.state === "available" && Date.parse(stored.response.expiresAt) > Date.parse(now)
        ? stored.response
        : null;
      return { status: 200, body: { schemaVersion: "owner_interaction_view.v1", interaction, response } };
    }
    return {
      status: 200,
      body: {
        schemaVersion: "guest_interaction_status.v1",
        interaction: {
          ...responseView(stored, now, this.#grantOfferForReply(stored)),
          notificationEndpoint: notificationEndpointView(this.#store.notification(interactionId).endpoint),
        },
      },
    };
  }

  async #mutate(request: OperationRequest, hash: Sha256): Promise<OperationResponse> {
    switch (request.definition.name) {
      case "public_encounter.issue": return this.#issueEncounter(request, hash);
      case "interaction.create": return this.#createInteraction(request, hash);
      case "interaction.delete": return this.#deleteInteraction(request, hash);
      case "notification.set": return this.#setNotification(request, hash);
      case "notification.remove": return this.#removeNotification(request, hash);
      case "notification.verify": return this.#verifyNotification(request, hash);
      case "agent_derivative.mint": return this.#mintDerivative(request, hash);
      case "room.create": return this.#createRoom(request, hash);
      case "room.pair": return this.#pairRoom(request, hash);
      case "room.pair.exchange": return this.#exchangePairing(request, hash);
      case "room.binding.revoke": return this.#revokeRoomBinding(request, hash);
      case "room.mode.set": return this.#setRoomMode(request, hash);
      case "room.retire": return this.#retireRoom(request, hash);
      case "room.delete": return this.#deleteRoom(request, hash);
      case "room_operator.projection.deliver": return this.#deliverProjection(request, hash);
      case "projection.revoke": return this.#setProjectionOwnerState(request, hash, "revoked");
      case "response.revoke": return this.#revokeResponse(request, hash);
      case "grant.issue": return this.#issueGrant(request, hash);
      case "grant.replace": return this.#replaceGrant(request, hash);
      case "grant.revoke": return this.#revokeGrant(request, hash);
      case "grant_offer.issue": return this.#issueOffer(request, hash, "grant_offer");
      case "grant_offer.revoke": return this.#revokeOffer(request, hash, "grant_offer");
      case "direct_invite.issue": return this.#issueOffer(request, hash, "direct_invite");
      case "direct_invite.revoke": return this.#revokeOffer(request, hash, "direct_invite");
      case "grant_offer.accept": return this.#acceptOffer(request, hash, "grant_offer");
      case "direct_invite.redeem": return this.#acceptOffer(request, hash, "direct_invite");
      case "interaction.close": return this.#closeInteraction(request, hash);
      case "curation.admit": return this.#setCuration(request, hash, "admitted");
      case "curation.unlist": return this.#setCuration(request, hash, "unlisted");
      case "room_operator.sync": return this.#sync(request, hash);
      case "room_operator.pull": return this.#pull(request, hash);
      case "room_operator.cycle.reserve": return this.#reserveCycle(request, hash);
      case "room_operator.cycle.recover": return this.#recoverCycle(request, hash);
      case "room_operator.cycle.abandon": return this.#abandonCycle(request, hash);
      case "room_operator.dispatch.issue": return this.#dispatchPermit(request, hash);
      case "room_operator.ack": return this.#ack(request, hash);
      case "room_operator.response.deliver": return this.#deliverResponse(request, hash);
      case "room_operator.stale.attest": return this.#setProjectionOwnerState(request, hash, "stale");
      case "room_operator.local_purge.receipt": return this.#localPurge(request, hash);
      default: throw new SemanticError(404, "not_found", "Operation not found");
    }
  }

  #issueEncounter(request: OperationRequest, hash: Sha256): OperationResponse {
    const projectionId = request.params.projectionId;
    if (!projectionId) throw new SemanticError(404, "not_found", "Projection not found");
    const stored = this.#storedProjection(projectionId);
    assertVersion(stored.lifecycle.version, request.expectedVersion);
    const room = this.#storedRoom(stored.projection.roomId).room;
    const secret = capabilitySecret(request.body, "encounterSecret");
    const now = this.#store.now();
    const clientBucket = requiredString(
      { syntheticClientBucket: request.syntheticClientBucket },
      "syntheticClientBucket",
      128,
    );
    try {
      this.#publicRate.assertEncounterIssue(room.roomId, clientBucket, now);
    } catch (error) {
      if (error instanceof SyntheticPublicRateError) {
        throw new SemanticError(429, error.code, "Public encounter issuance is temporarily limited");
      }
      if (error instanceof TypeError) throw new SemanticError(400, "invalid_client_bucket", "Synthetic client bucket is invalid");
      throw error;
    }
    const encounter: PublicEncounterV1 = {
      schemaVersion: "public_encounter.v1",
      encounterId: this.#store.nextId("encounter"),
      roomId: room.roomId,
      projectionId,
      secretDigest: this.#store.digestSecret(secret),
      state: "issued",
      issuedAt: now,
      expiresAt: addMilliseconds(now, 24 * 60 * 60 * 1000),
      acceptedCount: 0,
      unresolvedInteractionId: null,
    };
    const decision = derivePublicEncounterUse(encounter, room, stored.projection, stored.lifecycle, now);
    if (!decision.allowed) throw new SemanticError(410, decision.code, "This Projection cannot accept a public encounter");
    const capability: StoredCapability = { kind: "public_encounter", value: encounter, permitsAgentDerivative: true };
    this.#store.saveCapability(capability);
    this.#publicRate.recordEncounterIssue(room.roomId, encounter.encounterId, clientBucket, now);
    return { status: 201, body: { encounter: publicEncounterView(encounter), receipt: this.#receipt(request, hash, encounter.encounterId, 1) } };
  }

  #createInteraction(request: OperationRequest, hash: Sha256): OperationResponse {
    const capability = this.#capability(request, ["public_encounter", "grant", "agent_derivative"]);
    const parent = capability.kind === "agent_derivative"
      ? this.#store.capability(capability.value.parentCapabilityId)
      : capability;
    if (!parent) throw new SemanticError(410, "parent_capability_unavailable", "Parent capability is unavailable");
    const projectionId = requiredString(request.body, "projectionId", 160);
    const storedProjection = this.#storedProjection(projectionId);
    const room = this.#storedRoom(storedProjection.projection.roomId).room;
    if (capRoom(capability) !== room.roomId || capProjection(capability) !== projectionId) {
      throw new SemanticError(404, "not_found", "Capability target not found");
    }
    let decision;
    if (capability.kind === "public_encounter") decision = derivePublicEncounterUse(capability.value, room, storedProjection.projection, storedProjection.lifecycle, this.#store.now());
    else if (capability.kind === "grant") decision = deriveGrantUse(capability.value, room, storedProjection.projection, storedProjection.lifecycle, this.#store.now(), "submit");
    else {
      const derivativeDecision = deriveAgentDerivativeUse(capability.value, capState(parent), this.#store.now());
      const parentDecision = parent.kind === "public_encounter"
        ? derivePublicEncounterUse(parent.value, room, storedProjection.projection, storedProjection.lifecycle, this.#store.now())
        : parent.kind === "grant"
          ? deriveGrantUse(parent.value, room, storedProjection.projection, storedProjection.lifecycle, this.#store.now(), "submit")
          : { allowed: false, code: "invalid_parent_capability", warning: null };
      decision = derivativeDecision.allowed ? parentDecision : derivativeDecision;
    }
    if (!decision.allowed || capUnresolved(parent) !== null) throw new SemanticError(409, decision.allowed ? "unresolved_interaction_exists" : decision.code, "Capability cannot accept a new Interaction");
    const now = this.#store.now();
    const consumesPublicPool = parent.kind === "public_encounter";
    if (
      consumesPublicPool
      && this.#store.publicAcceptedCountSince(room.roomId, addMilliseconds(now, -24 * 60 * 60 * 1000)) >= 20
    ) {
      throw new SemanticError(429, "public_room_pool_exhausted", "This public Room reached its rolling 24-hour accepted limit");
    }
    const interactionType = request.body.interactionType;
    if (interactionType !== "ask" && interactionType !== "seed" && interactionType !== "resonance") throw new SemanticError(400, "invalid_interaction_type", "Interaction type is invalid");
    if (!storedProjection.projection.supportedInteractions.includes(interactionType)) {
      throw new SemanticError(409, "interaction_type_not_supported", "This Projection does not support the selected Interaction type");
    }
    const consent = request.body.consent;
    if (consent !== "allow_owner_local_ai" && consent !== "manual_owner_only") throw new SemanticError(400, "invalid_consent", "Consent choice is invalid");
    const derivativeSubmission = capability.kind === "agent_derivative";
    const replySecret = derivativeSubmission ? null : capabilitySecret(request.body, "replySecret");
    const deleteSecret = derivativeSubmission ? null : capabilitySecret(request.body, "deleteSecret");
    if (
      !derivativeSubmission
      && (
        replySecret === deleteSecret
        || this.#store.secretMatchesDigest(replySecret ?? "", capability.value.secretDigest)
        || this.#store.secretMatchesDigest(deleteSecret ?? "", capability.value.secretDigest)
      )
    ) throw new SemanticError(400, "interaction_recovery_not_distinct", "Reply, delete, and submission capabilities must be distinct");
    const derivativeRecovery = derivativeSubmission
      ? this.#store.auxiliary(`derivative_recovery:${capability.value.derivativeId}`) as unknown as DerivativeRecoveryBinding | null
      : null;
    if (
      derivativeSubmission
      && (
        derivativeRecovery?.schemaVersion !== "synthetic_derivative_recovery_binding.v1"
        || derivativeRecovery.state !== "bound"
        || derivativeRecovery.derivativeId !== capability.value.derivativeId
        || derivativeRecovery.parentCapabilityId !== capability.value.parentCapabilityId
        || derivativeRecovery.roomId !== capability.value.roomId
        || derivativeRecovery.projectionId !== capability.value.projectionId
      )
    ) throw new SemanticError(410, "derivative_recovery_unavailable", "Agent derivative recovery authority is unavailable");
    // The Agent may send decoy reply/delete fields, but they are ignored. The
    // exact digests were pre-bound by the Manual holder during derivative mint.
    const replyCapabilityDigest = derivativeSubmission
      ? derivativeRecovery!.replyCapabilityDigest
      : this.#store.digestSecret(replySecret ?? "");
    const deleteCapabilityDigest = derivativeSubmission
      ? derivativeRecovery!.deleteCapabilityDigest
      : this.#store.digestSecret(deleteSecret ?? "");
    if (consumesPublicPool) {
      try {
        this.#publicRate.assertPublicAccept(room.roomId, parent.value.encounterId, now);
      } catch (error) {
        if (error instanceof SyntheticPublicRateError) {
          throw new SemanticError(429, error.code, "Public Interaction acceptance is temporarily limited");
        }
        throw error;
      }
    }
    let guestCapsule: GuestCapsuleV1 | null = null;
    if (request.body.guestCapsule !== undefined && request.body.guestCapsule !== null) {
      guestCapsule = canonicalObject(request.body, "guestCapsule", validateGuestCapsuleV1);
    }
    const interactionId = this.#store.nextId("interaction");
    const consentEnvelope = consent === "allow_owner_local_ai"
      ? this.#consentEnvelope(interactionId, replyCapabilityDigest, now, guestCapsule !== null)
      : null;
    const interaction = createAcceptedInteractionV1({
      interactionId,
      roomId: room.roomId,
      projectionId,
      originProjectionHash: storedProjection.projection.payloadHash,
      originStateAtAcceptance: storedProjection.lifecycle.ownerState,
      interactionType: interactionType as InteractionType,
      requestText: requiredString(request.body, "requestBody", 12 * 1024),
      guestCapsule,
      consent: consent as InteractionConsent,
      consentEnvelope,
      acceptedAt: now,
      expiresAt: addMilliseconds(now, 30 * 24 * 60 * 60 * 1000),
      replyCapabilityDigest,
      deleteCapabilityDigest,
    });
    const storedInteraction: StoredInteraction = { interaction, originCapabilityId: capId(parent), response: null };
    this.#store.saveInteraction(storedInteraction);
    this.#consumeCapability(capability, parent, interactionId);
    if (derivativeSubmission) {
      this.#store.saveAuxiliary(`derivative_recovery:${capability.value.derivativeId}`, {
        schemaVersion: "synthetic_derivative_recovery_terminal.v1",
        derivativeId: capability.value.derivativeId,
        interactionId,
        state: "consumed",
        bodyFree: true,
      });
    }
    if (consumesPublicPool) {
      this.#store.recordPublicAccepted(room.roomId, interactionId, now);
      this.#publicRate.recordPublicAccept(room.roomId, parent.value.encounterId, interactionId, now);
    }
    this.#store.appendEvent(room.roomId, "interaction.accepted", interactionId, 1);
    return { status: 201, body: { schemaVersion: "interaction_create_result.v1", interactionId, state: interaction.state, expiresAt: interaction.expiresAt, receipt: this.#receipt(request, hash, interactionId, 1, capability) } };
  }

  #consentEnvelope(interactionId: string, replyCapabilityDigest: Sha256, now: string, guestCapsuleAllowed: boolean): ConsentEnvelopeV1 {
    return {
      schemaVersion: "consent_envelope.v1",
      consentEnvelopeId: this.#store.nextId("consent"),
      provider: "OpenAI",
      ownerAccountRegime: "synthetic_test_only_no_provider_call",
      sourceClass: "sanitized_current_forme_snapshot",
      orientationClass: "body_path_free_twin_orientation",
      guestCapsuleAllowed,
      maximumBudget: {
        wallClockSeconds: 3600,
        providerDispatches: 3,
        inputTokens: 128000,
        outputTokens: 8000,
        spend: { mode: "incremental", maximumUsd: 1 },
      },
      providerPolicyUrl: SYNTHETIC_PROVIDER_POLICY_URL,
      providerPolicyHash: SYNTHETIC_PROVIDER_POLICY_HASH,
      providerRetentionDisclosureHash: SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE_HASH,
      backupRetentionDisclosureHash: SYNTHETIC_BACKUP_RETENTION_DISCLOSURE_HASH,
      consentCopyHash: SYNTHETIC_CONSENT_COPY_HASH,
      consentedAt: now,
      replyCapabilityId: `reply_${interactionId.slice("interaction_".length)}`,
      replyCapabilityDigest,
    };
  }

  #consumeCapability(capability: StoredCapability, parent: StoredCapability, interactionId: string): void {
    if (parent.kind === "public_encounter") {
      this.#store.saveCapability(replaceEncounter(parent, {
        acceptedCount: parent.value.acceptedCount + 1,
        unresolvedInteractionId: interactionId,
        state: "consumed",
      }));
    } else if (parent.kind === "grant") {
      const count = parent.value.acceptedCount + 1;
      this.#store.saveCapability(replaceGrant(parent, {
        acceptedCount: count,
        unresolvedInteractionId: interactionId,
        state: count >= parent.value.acceptedQuota ? "consumed" : "issued",
      }));
    }
    if (capability.kind === "agent_derivative") {
      this.#store.saveCapability(replaceDerivative(capability, { acceptedCount: 1, state: "consumed" }));
    }
  }

  #clearUnresolved(capabilityId: string): void {
    const capability = this.#store.capability(capabilityId);
    if (capability?.kind === "public_encounter") this.#store.saveCapability(replaceEncounter(capability, { unresolvedInteractionId: null }));
    if (capability?.kind === "grant") this.#store.saveCapability(replaceGrant(capability, { unresolvedInteractionId: null }));
  }

  #invalidateUnusedPublicEncounters(scope: { roomId?: string; projectionId?: string }): void {
    for (const capability of this.#store.capabilities()) {
      if (capability.kind !== "public_encounter") continue;
      if (scope.roomId && capability.value.roomId !== scope.roomId) continue;
      if (scope.projectionId && capability.value.projectionId !== scope.projectionId) continue;
      if (
        capability.value.state !== "issued"
        || capability.value.acceptedCount !== 0
        || capability.value.unresolvedInteractionId !== null
      ) continue;
      this.#store.saveCapability(replaceEncounter(capability, { state: "invalidated" }));
    }
  }

  #terminalResponse(
    response: ResponseV1 | null,
    terminal: Exclude<ResponseState, "available">,
  ): ResponseV1 | null {
    if (!response) return null;
    const candidates: Array<Exclude<ResponseState, "available">> = [terminal];
    if (response.state !== "available") candidates.push(response.state);
    const state = resolveResponseTerminal(candidates);
    if (!state) return response;
    if (response.state === state && response.body === "[purged]") return response;
    return {
      ...response,
      body: "[purged]",
      state,
      stateVersion: response.stateVersion + 1,
    };
  }

  #clearNotification(interactionId: string): void {
    this.#notifications.destructiveTerminal(interactionId);
  }

  #cascadeInteractions(
    scope: { roomId?: string; projectionId?: string },
    terminal: "origin_revoked" | "room_retired",
  ): void {
    for (const summary of this.#store.ownerStatus().interactions) {
      const item = summary.interaction;
      if (scope.roomId && item.roomId !== scope.roomId) continue;
      if (scope.projectionId && item.projectionId !== scope.projectionId) continue;
      const stored = this.#store.interaction(item.interactionId);
      if (!stored) continue;
      const mayTransition = canTransitionInteraction(stored.interaction.state, terminal);
      const bodyNeedsPurge = stored.interaction.requestText !== "[purged]" || stored.interaction.guestCapsule !== null;
      const nextResponse = this.#terminalResponse(stored.response, terminal);
      const responseChanged = JSON.stringify(nextResponse) !== JSON.stringify(stored.response);
      if (!mayTransition && !bodyNeedsPurge && !responseChanged) continue;
      stored.interaction = {
        ...stored.interaction,
        requestText: "[purged]",
        guestCapsule: null,
        state: mayTransition ? terminal : stored.interaction.state,
        stateVersion: stored.interaction.stateVersion + 1,
      };
      stored.response = nextResponse;
      this.#store.saveInteraction(stored);
      this.#clearUnresolved(stored.originCapabilityId);
      this.#clearNotification(stored.interaction.interactionId);
      this.#store.appendEvent(
        stored.interaction.roomId,
        `interaction.${terminal}`,
        stored.interaction.interactionId,
        stored.interaction.stateVersion,
      );
    }
  }

  #deleteInteraction(request: OperationRequest, hash: Sha256): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    if (!this.#store.secretMatchesDigest(bearer(request.authorization), stored.interaction.deleteCapabilityDigest)) throw new SemanticError(404, "not_found", "Interaction not found");
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (stored.interaction.state === "interaction_deleted") throw new SemanticError(409, "terminal_interaction", "Interaction is already deleted");
    const nextState = canTransitionInteraction(stored.interaction.state, "interaction_deleted")
      ? "interaction_deleted"
      : stored.interaction.state;
    stored.interaction = {
      ...stored.interaction,
      requestText: "[purged]",
      guestCapsule: null,
      state: nextState,
      stateVersion: stored.interaction.stateVersion + 1,
    };
    stored.response = null;
    this.#store.saveInteraction(stored);
    this.#clearUnresolved(stored.originCapabilityId);
    this.#clearNotification(interactionId);
    this.#store.appendEvent(stored.interaction.roomId, "interaction.deleted", interactionId, stored.interaction.stateVersion);
    return { status: 200, body: { schemaVersion: "interaction_delete_result.v1", state: stored.interaction.state, receipt: this.#receipt(request, hash, interactionId, stored.interaction.stateVersion) } };
  }

  #guestInteraction(request: OperationRequest): StoredInteraction {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    if (!this.#store.secretMatchesDigest(bearer(request.authorization), stored.interaction.replyCapabilityDigest)) throw new SemanticError(404, "not_found", "Interaction not found");
    return stored;
  }

  #assertNotificationEnrollmentEligible(stored: StoredInteraction): void {
    const now = Date.parse(this.#store.now());
    if (Date.parse(stored.interaction.expiresAt) <= now) {
      throw new SemanticError(410, "interaction_expired", "Expired Interaction cannot configure notifications");
    }
    if (["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)) return;
    if (
      stored.interaction.state === "response_ready"
      && stored.response?.state === "available"
      && Date.parse(stored.response.expiresAt) > now
    ) return;
    throw new SemanticError(410, "notification_not_eligible", "Notification endpoint is unavailable for this Interaction state");
  }

  #setNotification(request: OperationRequest, hash: Sha256): OperationResponse {
    const stored = this.#guestInteraction(request);
    assertVersion(this.#store.notification(stored.interaction.interactionId).endpoint.version, request.expectedVersion);
    this.#assertNotificationEnrollmentEligible(stored);
    try {
      const pending = this.#notifications.beginVerification(
        stored.interaction.interactionId,
        requiredString(request.body, "email", 320),
      );
      return {
        status: 202,
        body: {
          schemaVersion: "notification_set_result.v1",
          endpoint: notificationEndpointView(pending.endpoint),
          syntheticVerification: {
            challengeId: pending.challengeId,
            code: pending.syntheticCode,
            externalEmailSent: false,
          },
          receipt: this.#receipt(request, hash, stored.interaction.interactionId, pending.endpoint.version),
        },
      };
    } catch (error) {
      if (error instanceof NotificationControlError) throw new SemanticError(409, error.code, error.message);
      throw error;
    }
  }

  #removeNotification(request: OperationRequest, hash: Sha256): OperationResponse {
    const stored = this.#guestInteraction(request);
    assertVersion(this.#store.notification(stored.interaction.interactionId).endpoint.version, request.expectedVersion);
    const endpoint = this.#notifications.removeEndpoint(stored.interaction.interactionId);
    return { status: 200, body: { schemaVersion: "notification_remove_result.v1", endpoint: notificationEndpointView(endpoint), receipt: this.#receipt(request, hash, stored.interaction.interactionId, endpoint.version) } };
  }

  #verifyNotification(request: OperationRequest, hash: Sha256): OperationResponse {
    const stored = this.#guestInteraction(request);
    assertVersion(this.#store.notification(stored.interaction.interactionId).endpoint.version, request.expectedVersion);
    this.#assertNotificationEnrollmentEligible(stored);
    try {
      const endpoint = this.#notifications.confirm(
        stored.interaction.interactionId,
        requiredString(request.body, "code", 16),
      );
      return { status: 200, body: { schemaVersion: "notification_verify_result.v1", endpoint: notificationEndpointView(endpoint), receipt: this.#receipt(request, hash, stored.interaction.interactionId, endpoint.version) } };
    } catch (error) {
      if (error instanceof NotificationControlError) throw new SemanticError(400, error.code, error.message);
      throw error;
    }
  }

  #mintDerivative(request: OperationRequest, hash: Sha256): OperationResponse {
    const parent = this.#capability(request, ["public_encounter", "grant"]);
    if (!parent.permitsAgentDerivative || capState(parent) !== "issued") throw new SemanticError(403, "derivative_denied", "This capability cannot mint an Agent derivative");
    const projection = this.#storedProjection(capProjection(parent));
    const room = this.#storedRoom(capRoom(parent)).room;
    const parentDecision = parent.kind === "public_encounter"
      ? derivePublicEncounterUse(parent.value, room, projection.projection, projection.lifecycle, this.#store.now())
      : deriveGrantUse(parent.value, room, projection.projection, projection.lifecycle, this.#store.now(), "read");
    if (!parentDecision.allowed) throw new SemanticError(409, parentDecision.code, "Parent capability cannot mint an Agent derivative");
    const now = this.#store.now();
    const agentSecret = capabilitySecret(request.body, "agentSecret");
    const replySecret = capabilitySecret(request.body, "replySecret");
    const deleteSecret = capabilitySecret(request.body, "deleteSecret");
    if (new Set([agentSecret, replySecret, deleteSecret]).size !== 3) {
      throw new SemanticError(400, "derivative_recovery_not_distinct", "Agent, reply, and delete secrets must be distinct");
    }
    if (
      this.#store.secretMatchesDigest(replySecret, parent.value.secretDigest)
      || this.#store.secretMatchesDigest(deleteSecret, parent.value.secretDigest)
      || this.#store.secretMatchesDigest(agentSecret, parent.value.secretDigest)
    ) throw new SemanticError(400, "derivative_recovery_reuses_parent", "Derivative secrets must not reuse the parent capability");
    const value: AgentDerivativeV1 = {
      schemaVersion: "agent_derivative.v1",
      derivativeId: this.#store.nextId("derivative"),
      parentCapabilityId: capId(parent),
      parentCapabilityClass: parent.kind === "grant" ? "grant.v1" : "public_encounter.v1",
      roomId: capRoom(parent),
      projectionId: capProjection(parent),
      secretDigest: this.#store.digestSecret(agentSecret),
      state: "issued",
      issuedAt: now,
      expiresAt: effectiveExpiry(addMilliseconds(now, 15 * 60 * 1000), parent.value.expiresAt),
      acceptedCount: 0,
    };
    const derivative: StoredCapability = { kind: "agent_derivative", value, permitsAgentDerivative: false };
    this.#store.saveCapability(derivative);
    const recoveryBinding: DerivativeRecoveryBinding = {
      schemaVersion: "synthetic_derivative_recovery_binding.v1",
      derivativeId: value.derivativeId,
      parentCapabilityId: value.parentCapabilityId,
      roomId: value.roomId,
      projectionId: value.projectionId,
      replyCapabilityDigest: this.#store.digestSecret(replySecret),
      deleteCapabilityDigest: this.#store.digestSecret(deleteSecret),
      state: "bound",
    };
    this.#store.saveAuxiliary(`derivative_recovery:${value.derivativeId}`, { ...recoveryBinding });
    return { status: 201, body: { derivative: agentDerivativeView(value), receipt: this.#receipt(request, hash, value.derivativeId, 1, parent) } };
  }

  #createRoom(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomKind = request.body.roomKind;
    if (roomKind !== "third_place_public" && roomKind !== "private_grant_only") throw new SemanticError(400, "invalid_room_kind", "Room kind is invalid");
    const now = this.#store.now();
    const room: RoomV1 = {
      schemaVersion: "room.v1",
      roomId: this.#store.nextId("room"),
      entityId: requiredString(request.body, "entityId", 160),
      roomKind,
      interactionMode: roomKind === "third_place_public" ? "public_single" : "invite_only",
      status: "active",
      currentProjectionId: null,
      version: 1,
      createdAt: now,
      retiredAt: null,
    };
    this.#store.saveRoom({ room, label: requiredString(request.body, "label", 160) });
    this.#store.appendEvent(room.roomId, "room.created", room.roomId, 1);
    return { status: 201, body: { room, receipt: this.#receipt(request, hash, room.roomId, 1) } };
  }

  #pairRoom(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = request.params.roomId;
    if (!roomId) throw new SemanticError(404, "not_found", "Room not found");
    const room = this.#storedRoom(roomId).room;
    assertVersion(room.version, request.expectedVersion);
    if (room.status !== "active") throw new SemanticError(410, "room_retired", "A retired Room cannot issue a pairing challenge");
    if (Object.keys(request.body).length !== 0) {
      throw new SemanticError(400, "invalid_request", "Pairing challenge issue accepts no connector key material");
    }
    const issuedAt = this.#store.now();
    const pairingId = this.#store.nextId("pairing");
    const expiresAt = addMilliseconds(issuedAt, 10 * 60 * 1000);
    const pairingCode = `FORME-${canonicalSha256({
      schemaVersion: "synthetic_pairing_code_preimage.v1",
      pairingId,
      roomId,
      issuedAt,
      expiresAt,
    }).slice("sha256:".length, "sha256:".length + 20).toUpperCase()}`;
    this.#store.savePairingChallenge({
      schemaVersion: "synthetic_pairing_challenge.v1",
      pairingId,
      roomId,
      pairingCodeDigest: this.#store.digestSecret(pairingCode),
      state: "issued",
      issuedAt,
      expiresAt,
      clientPublicKeyHash: null,
      bindingId: null,
      exchangeResponse: null,
      version: 1,
    });
    return {
      status: 201,
      body: {
        schemaVersion: "synthetic_pairing_challenge_result.v1",
        pairingId,
        roomId,
        pairingCode,
        expiresAt,
        version: 1,
        receipt: this.#receipt(request, hash, pairingId, 1),
      },
    };
  }

  #exchangePairing(request: OperationRequest, hash: Sha256): OperationResponse {
    const pairingId = request.params.pairingId;
    if (!pairingId) throw new SemanticError(404, "not_found", "Pairing challenge not found");
    const pairing = this.#store.pairingChallenge(pairingId);
    if (!pairing) throw new SemanticError(404, "not_found", "Pairing challenge not found");
    const now = this.#store.now();
    if (Date.parse(pairing.expiresAt) <= Date.parse(now)) {
      throw new SemanticError(410, "pairing_expired", "Pairing challenge expired");
    }
    const pairingCode = requiredString(request.body, "pairingCode", 128);
    if (!this.#store.secretMatchesDigest(pairingCode, pairing.pairingCodeDigest)) {
      throw new SemanticError(404, "not_found", "Pairing challenge not found");
    }
    const clientPublicKey = requiredString(request.body, "clientPublicKey", 4096);
    const clientPublicKeyHash = canonicalSha256(clientPublicKey);
    if (pairing.state === "exchanged") {
      if (pairing.clientPublicKeyHash !== clientPublicKeyHash || !pairing.exchangeResponse) {
        throw new SemanticError(409, "pairing_already_consumed", "Pairing challenge was consumed by a different client key");
      }
      return { status: 201, body: pairing.exchangeResponse };
    }
    assertVersion(pairing.version, request.expectedVersion);
    const room = this.#storedRoom(pairing.roomId).room;
    if (room.status !== "active") throw new SemanticError(410, "room_retired", "A retired Room cannot complete pairing");
    const bindingId = this.#store.nextId("binding");
    const credential = syntheticPairingCredential(pairingId, pairing.roomId, clientPublicKeyHash);
    const bindingExpiresAt = addMilliseconds(now, 30 * 24 * 60 * 60 * 1000);
    this.#store.saveRoomOperatorBinding({
      schemaVersion: "synthetic_room_operator_binding.v1",
      bindingId,
      roomId: pairing.roomId,
      secretDigest: this.#store.digestSecret(credential),
      state: "active",
      pairedAt: now,
      expiresAt: bindingExpiresAt,
      revokedAt: null,
      version: 1,
    });
    const sealedCredential = `synthetic-sealed:${canonicalSha256({
      schemaVersion: "synthetic_pairing_sealed_preimage.v1",
      pairingId,
      bindingId,
      roomId: pairing.roomId,
      clientPublicKeyHash,
      bindingExpiresAt,
      credentialDigest: this.#store.digestSecret(credential),
    }).slice("sha256:".length)}`;
    const response = {
      schemaVersion: "synthetic_pairing_exchange_result.v1",
      pairingId,
      bindingId,
      roomId: pairing.roomId,
      expiresAt: bindingExpiresAt,
      sealedCredential,
      version: 1,
      receipt: this.#receipt(request, hash, bindingId, 1),
    };
    this.#store.savePairingChallenge({
      ...pairing,
      state: "exchanged",
      clientPublicKeyHash,
      bindingId,
      exchangeResponse: response,
      version: pairing.version + 1,
    });
    this.#store.appendEvent(pairing.roomId, "room.binding_paired", pairing.roomId, room.version);
    return { status: 201, body: response };
  }

  #revokeRoomBinding(request: OperationRequest, hash: Sha256): OperationResponse {
    const bindingId = request.params.bindingId;
    if (!bindingId) throw new SemanticError(404, "not_found", "Room binding not found");
    const binding = this.#store.roomOperatorBinding(bindingId);
    if (!binding) throw new SemanticError(404, "not_found", "Room binding not found");
    assertVersion(binding.version, request.expectedVersion);
    if (binding.state !== "active") throw new SemanticError(409, "binding_already_revoked", "Room binding is already revoked");
    const revokedAt = this.#store.now();
    const revoked = { ...binding, state: "revoked" as const, revokedAt, version: binding.version + 1 };
    this.#store.saveRoomOperatorBinding(revoked);
    const roomVersion = this.#storedRoom(binding.roomId).room.version;
    this.#store.appendEvent(binding.roomId, "room.binding_revoked", binding.roomId, roomVersion);
    return {
      status: 200,
      body: {
        schemaVersion: "synthetic_room_binding_revoke_result.v1",
        bindingId,
        roomId: binding.roomId,
        state: revoked.state,
        revokedAt,
        version: revoked.version,
        receipt: this.#receipt(request, hash, bindingId, revoked.version),
      },
    };
  }

  #setRoomMode(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = request.params.roomId;
    if (!roomId) throw new SemanticError(404, "not_found", "Room not found");
    const stored = this.#storedRoom(roomId);
    assertVersion(stored.room.version, request.expectedVersion);
    const mode = request.body.interactionMode;
    if (mode !== "public_single" && mode !== "invite_only" && mode !== "closed") throw new SemanticError(400, "invalid_room_mode", "Room interaction mode is invalid");
    if (stored.room.roomKind === "private_grant_only" && mode === "public_single") throw new SemanticError(409, "room_kind_immutable", "Private Room cannot become public");
    stored.room = { ...stored.room, interactionMode: mode, version: stored.room.version + 1 };
    this.#store.saveRoom(stored);
    if (mode !== "public_single") this.#invalidateUnusedPublicEncounters({ roomId });
    this.#store.appendEvent(roomId, "room.mode_changed", roomId, stored.room.version);
    return { status: 200, body: { room: stored.room, receipt: this.#receipt(request, hash, roomId, stored.room.version) } };
  }

  #retireRoom(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = request.params.roomId;
    if (!roomId) throw new SemanticError(404, "not_found", "Room not found");
    const stored = this.#storedRoom(roomId);
    assertVersion(stored.room.version, request.expectedVersion);
    if (stored.room.status === "retired") throw new SemanticError(409, "room_already_retired", "Room is already retired");
    stored.room = { ...stored.room, status: "retired", retiredAt: this.#store.now(), version: stored.room.version + 1 };
    this.#store.saveRoom(stored);
    this.#invalidateUnusedPublicEncounters({ roomId });
    this.#invalidateOffersForTarget({ roomId });
    this.#cascadeInteractions({ roomId }, "room_retired");
    this.#store.appendEvent(roomId, "room.retired", roomId, stored.room.version);
    return { status: 200, body: { room: stored.room, receipt: this.#receipt(request, hash, roomId, stored.room.version) } };
  }

  #deleteRoom(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = request.params.roomId;
    if (!roomId) throw new SemanticError(404, "not_found", "Room not found");
    const stored = this.#storedRoom(roomId);
    assertVersion(stored.room.version, request.expectedVersion);
    if (stored.room.status !== "retired") throw new SemanticError(409, "retire_first", "Room must be retired before delete/purge");
    return { status: 202, body: { schemaVersion: "room_delete_result.v1", state: "purge_pending", receipt: this.#receipt(request, hash, roomId, stored.room.version) } };
  }

  #deliverProjection(request: OperationRequest, hash: Sha256): OperationResponse {
    const delivery = this.#publicationDelivery(request, "projection");
    const projection = delivery.projection;
    const storedRoom = this.#storedRoom(projection.roomId);
    const now = this.#store.now();
    assertVersion(storedRoom.room.version, request.expectedVersion);
    if (storedRoom.room.status !== "active") throw new SemanticError(410, "room_retired", "Room is retired");
    if (projection.entityId !== storedRoom.room.entityId) throw new SemanticError(409, "projection_entity_mismatch", "Projection does not belong to the Room entity");
    if (
      Date.parse(projection.publishedAt) < Date.parse(storedRoom.room.createdAt)
      || projection.publishedAt !== delivery.attestation.issuedAt
    ) throw new SemanticError(409, "projection_chronology_invalid", "Projection publication time does not bind its Room and attestation chronology");
    if (
      Date.parse(projection.publishedAt) > Date.parse(now)
      || Date.parse(projection.freshUntil) <= Date.parse(now)
      || Date.parse(projection.expiresAt) <= Date.parse(now)
    ) throw new SemanticError(410, "projection_not_fresh", "Delivered Projection must be current-time fresh");
    if (this.#store.auxiliary(`publication_attestation:${delivery.attestation.attestationId}`)) {
      throw new SemanticError(409, "publication_attestation_used", "Publication attestation was already consumed");
    }
    return this.#commitProjection(request, hash, storedRoom, delivery, now);
  }

  #commitProjection(
    request: OperationRequest,
    hash: Sha256,
    storedRoom: StoredRoom,
    delivery: Extract<HostedPublicationDeliveryV1, { artifactClass: "projection" }>,
    now: string,
  ): OperationResponse {
    const projection = delivery.projection;
    const roomId = storedRoom.room.roomId;
    if (this.#store.projection(projection.projectionId)) throw new SemanticError(409, "immutable_projection_exists", "Projection ID already exists");
    const previousProjectionId = storedRoom.room.currentProjectionId;
    if (previousProjectionId && previousProjectionId !== projection.projectionId) {
      const previous = this.#storedProjection(previousProjectionId);
      previous.lifecycle = {
        ...previous.lifecycle,
        ownerState: canTransitionProjection(previous.lifecycle.ownerState, "superseded")
          ? "superseded"
          : previous.lifecycle.ownerState,
        current: false,
        version: previous.lifecycle.version + 1,
        changedAt: now,
      };
      this.#store.saveProjection(previous);
      this.#invalidateUnusedPublicEncounters({ projectionId: previousProjectionId });
      this.#invalidateOffersForTarget({ projectionId: previousProjectionId });
      this.#store.appendEvent(roomId, "projection.superseded", previousProjectionId, previous.lifecycle.version);
    }
    const lifecycle: ProjectionLifecycleV1 = {
      schemaVersion: "projection_lifecycle.v1",
      projectionId: projection.projectionId,
      ownerState: "published_fresh",
      curationState: "not_admitted",
      current: true,
      version: 1,
      changedAt: now,
    };
    this.#store.saveProjection({ projection, lifecycle });
    storedRoom.room = { ...storedRoom.room, currentProjectionId: projection.projectionId, version: storedRoom.room.version + 1 };
    this.#store.saveRoom(storedRoom);
    this.#store.saveAuxiliary(`publication_attestation:${delivery.attestation.attestationId}`, {
      schemaVersion: "synthetic_publication_attestation_receipt.v1",
      attestationId: delivery.attestation.attestationId,
      bindingId: delivery.attestation.bindingId,
      roomId: delivery.attestation.roomId,
      artifactClass: delivery.attestation.artifactClass,
      artifactId: delivery.attestation.artifactId,
      artifactHash: delivery.attestation.artifactHash,
      issuedAt: delivery.attestation.issuedAt,
      expiresAt: delivery.attestation.expiresAt,
      bodyFree: true,
    });
    this.#store.appendEvent(roomId, "projection.published", projection.projectionId, 1);
    return { status: 201, body: { projection, lifecycle, receipt: this.#receipt(request, hash, projection.projectionId, 1) } };
  }

  #setProjectionOwnerState(request: OperationRequest, hash: Sha256, ownerState: "stale" | "revoked"): OperationResponse {
    const projectionId = request.params.projectionId;
    if (!projectionId) throw new SemanticError(404, "not_found", "Projection not found");
    const stored = this.#storedProjection(projectionId);
    assertVersion(stored.lifecycle.version, request.expectedVersion);
    if (!canTransitionProjection(stored.lifecycle.ownerState, ownerState)) {
      throw new SemanticError(409, "invalid_projection_transition", `Projection cannot move from ${stored.lifecycle.ownerState} to ${ownerState}`);
    }
    stored.lifecycle = {
      ...stored.lifecycle,
      ownerState,
      current: ownerState === "revoked" ? false : stored.lifecycle.current,
      version: stored.lifecycle.version + 1,
      changedAt: this.#store.now(),
    };
    this.#store.saveProjection(stored);
    this.#invalidateOffersForTarget({ projectionId });
    if (ownerState === "revoked") {
      const room = this.#storedRoom(stored.projection.roomId);
      if (room.room.currentProjectionId === projectionId) {
        room.room = { ...room.room, currentProjectionId: null, version: room.room.version + 1 };
        this.#store.saveRoom(room);
      }
      this.#invalidateUnusedPublicEncounters({ projectionId });
      this.#cascadeInteractions({ projectionId }, "origin_revoked");
    }
    this.#store.appendEvent(stored.projection.roomId, `projection.${ownerState}`, projectionId, stored.lifecycle.version);
    return { status: 200, body: { lifecycle: stored.lifecycle, receipt: this.#receipt(request, hash, projectionId, stored.lifecycle.version) } };
  }

  #continuationTargetStatus(roomId: string, projectionId: string): "available" | "closed" | "invalidated" {
    const room = this.#store.room(roomId);
    const projection = this.#store.projection(projectionId);
    if (!room || !projection || projection.projection.roomId !== roomId) return "invalidated";
    const now = Date.parse(this.#store.now());
    if (
      room.room.status !== "active"
      || room.room.currentProjectionId !== projectionId
      || !projection.lifecycle.current
      || projection.lifecycle.ownerState !== "published_fresh"
      || Date.parse(projection.projection.publishedAt) > now
      || Date.parse(projection.projection.freshUntil) <= now
      || Date.parse(projection.projection.expiresAt) <= now
    ) return "invalidated";
    return room.room.interactionMode === "closed" ? "closed" : "available";
  }

  #effectiveOriginState(projection: StoredProjection, now: string): ProjectionLifecycleV1["ownerState"] {
    if (projection.lifecycle.ownerState === "published_fresh" || projection.lifecycle.ownerState === "stale") {
      if (Date.parse(projection.projection.expiresAt) <= Date.parse(now)) return "expired";
      if (Date.parse(projection.projection.freshUntil) <= Date.parse(now)) return "stale";
    }
    return projection.lifecycle.ownerState;
  }

  #assertContinuationTarget(roomId: string, projectionId: string): void {
    const status = this.#continuationTargetStatus(roomId, projectionId);
    if (status === "closed") throw new SemanticError(409, "room_closed", "Target Room is closed");
    if (status !== "available") throw new SemanticError(410, "target_projection_invalidated", "Target Projection is not current and fresh");
  }

  #normalizeOfferRecord(
    kind: "grant_offer" | "direct_invite",
    id: string,
    raw: Record<string, unknown>,
    persistTerminal = true,
  ): GrantOfferV1 | DirectGrantInviteV1 {
    const value = kind === "grant_offer" ? validateGrantOfferV1(raw) : validateDirectGrantInviteV1(raw);
    if (value.state !== "issued") return value;
    const now = Date.parse(this.#store.now());
    const deadline = kind === "grant_offer"
      ? (value as GrantOfferV1).acceptanceExpiresAt
      : (value as DirectGrantInviteV1).redemptionExpiresAt;
    let terminal: "expired" | "invalidated" | null = null;
    if (Date.parse(deadline) <= now || Date.parse(value.offeredGrantExpiresAt) <= now) {
      terminal = "expired";
    } else if (this.#continuationTargetStatus(value.targetRoomId, value.targetProjectionId) === "invalidated") {
      terminal = "invalidated";
    } else if (kind === "grant_offer") {
      const source = this.#store.interaction((value as GrantOfferV1).sourceInteractionId);
      if (!source || ["interaction_deleted", "origin_revoked", "room_retired"].includes(source.interaction.state)) terminal = "invalidated";
    }
    if (!terminal) return value;
    const normalized = { ...value, state: terminal } as GrantOfferV1 | DirectGrantInviteV1;
    if (persistTerminal) {
      this.#store.saveAuxiliary(`${kind}:${id}`, normalized as unknown as Record<string, unknown>);
    }
    return normalized;
  }

  #grantOfferForReply(stored: StoredInteraction): GrantOfferReplyViewV1 | null {
    for (const [key, raw] of this.#store.auxiliaryEntries("grant_offer:")) {
      const offer = this.#normalizeOfferRecord("grant_offer", key.slice("grant_offer:".length), raw, false) as GrantOfferV1;
      if (offer.sourceInteractionId !== stored.interaction.interactionId || offer.state !== "issued") continue;
      const targetProjection = this.#store.projection(offer.targetProjectionId);
      const targetRoom = this.#store.room(offer.targetRoomId);
      if (!targetProjection || !targetRoom) return null;
      return {
        schemaVersion: "grant_offer_reply_view.v1",
        offerId: offer.offerId,
        targetProjectionId: offer.targetProjectionId,
        title: targetProjection.projection.title,
        publicRoomLabel: targetRoom.room.roomKind === "third_place_public" ? targetRoom.label : null,
        presetId: offer.presetId,
        acceptanceExpiresAt: offer.acceptanceExpiresAt,
        offeredGrantExpiresAt: offer.offeredGrantExpiresAt,
      };
    }
    return null;
  }

  #invalidateOffersForTarget(scope: { roomId?: string; projectionId?: string }): void {
    for (const kind of ["grant_offer", "direct_invite"] as const) {
      const prefix = `${kind}:`;
      for (const [key, raw] of this.#store.auxiliaryEntries(prefix)) {
        const id = key.slice(prefix.length);
        const value = this.#normalizeOfferRecord(kind, id, raw);
        if (value.state !== "issued") continue;
        if (scope.roomId && value.targetRoomId !== scope.roomId) continue;
        if (scope.projectionId && value.targetProjectionId !== scope.projectionId) continue;
        this.#store.saveAuxiliary(key, { ...value, state: "invalidated" });
      }
    }
  }

  #issueGrant(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = requiredString(request.body, "roomId", 160);
    const projectionId = requiredString(request.body, "projectionId", 160);
    const room = this.#storedRoom(roomId).room;
    const projection = this.#storedProjection(projectionId);
    if (projection.projection.roomId !== roomId) throw new SemanticError(404, "not_found", "Grant target not found");
    this.#assertContinuationTarget(roomId, projectionId);
    const presetId = request.body.presetId;
    if (presetId !== "one_visit" && presetId !== "short_exchange" && presetId !== "familiar_collaborator" && presetId !== "trusted_collaborator") throw new SemanticError(400, "invalid_preset", "Grant preset is invalid");
    const now = this.#store.now();
    const reentryChainId = optionalString(request.body, "reentryChainId", 160) ?? this.#store.nextId("chain");
    const permitsAgentDerivative = request.body.permitsAgentDerivative ?? false;
    if (typeof permitsAgentDerivative !== "boolean") throw new SemanticError(400, "invalid_agent_derivation_flag", "permitsAgentDerivative must be boolean");
    const liveInChain = this.#store.capabilities().find((candidate) => candidate.kind === "grant"
      && candidate.value.roomId === roomId
      && candidate.value.projectionId === projectionId
      && candidate.value.reentryChainId === reentryChainId
      && (candidate.value.state === "issued" || candidate.value.state === "consumed")
      && Date.parse(candidate.value.expiresAt) > Date.parse(now));
    if (liveInChain) throw new SemanticError(409, "grant_replacement_required", "A live Grant in this re-entry chain requires explicit replacement");
    const grant: GrantV1 = {
      schemaVersion: "grant.v1",
      grantId: this.#store.nextId("grant"),
      roomId,
      projectionId,
      reentryChainId,
      presetId: presetId as GrantPresetId,
      secretDigest: this.#store.digestSecret(capabilitySecret(request.body, "grantSecret")),
      state: "issued",
      issuedAt: now,
      expiresAt: effectiveExpiry(
        grantExpiryForPreset(now, presetId as GrantPresetId),
        projection.projection.expiresAt,
      ),
      acceptedCount: 0,
      acceptedQuota: GRANT_PRESETS[presetId as GrantPresetId].acceptedQuota,
      unresolvedInteractionId: null,
      agentDerivationAllowed: permitsAgentDerivative,
      replacedGrantId: null,
    };
    const capability: StoredCapability = { kind: "grant", value: grant, permitsAgentDerivative: grant.agentDerivationAllowed };
    this.#store.saveCapability(capability);
    this.#store.appendEvent(roomId, "grant.issued", grant.grantId, 1);
    return { status: 201, body: { grant: grantView(grant), receipt: this.#receipt(request, hash, grant.grantId, 1) } };
  }

  #replaceGrant(request: OperationRequest, hash: Sha256): OperationResponse {
    const grantId = request.params.grantId;
    const prior = grantId ? this.#store.capability(grantId) : null;
    if (!prior || prior.kind !== "grant") throw new SemanticError(404, "not_found", "Grant not found");
    assertVersion(1, request.expectedVersion);
    const now = this.#store.now();
    if (
      (prior.value.state !== "issued" && prior.value.state !== "consumed")
      || Date.parse(prior.value.expiresAt) <= Date.parse(now)
    ) {
      throw new SemanticError(409, "grant_not_replaceable", "Only a live Grant can be replaced");
    }
    if (prior.value.unresolvedInteractionId !== null) {
      throw new SemanticError(409, "unresolved_interaction_exists", "Close the unresolved Interaction before replacing its Grant");
    }
    const siblingLiveGrant = this.#store.capabilities().find((candidate) => candidate.kind === "grant"
      && candidate.value.grantId !== prior.value.grantId
      && candidate.value.roomId === prior.value.roomId
      && candidate.value.projectionId === prior.value.projectionId
      && candidate.value.reentryChainId === prior.value.reentryChainId
      && (candidate.value.state === "issued" || candidate.value.state === "consumed")
      && Date.parse(candidate.value.expiresAt) > Date.parse(now));
    if (siblingLiveGrant) {
      throw new SemanticError(409, "grant_chain_conflict", "The re-entry chain already contains another live Grant");
    }
    this.#assertContinuationTarget(prior.value.roomId, prior.value.projectionId);
    const requestedPreset = request.body.presetId ?? prior.value.presetId;
    if (requestedPreset !== "one_visit" && requestedPreset !== "short_exchange" && requestedPreset !== "familiar_collaborator" && requestedPreset !== "trusted_collaborator") {
      throw new SemanticError(400, "invalid_preset", "Grant preset is invalid");
    }
    const permitsAgentDerivative = request.body.permitsAgentDerivative ?? prior.value.agentDerivationAllowed;
    if (typeof permitsAgentDerivative !== "boolean") throw new SemanticError(400, "invalid_agent_derivation_flag", "permitsAgentDerivative must be boolean");
    const replacement: GrantV1 = {
      schemaVersion: "grant.v1",
      grantId: this.#store.nextId("grant"),
      roomId: prior.value.roomId,
      projectionId: prior.value.projectionId,
      reentryChainId: prior.value.reentryChainId,
      presetId: requestedPreset,
      secretDigest: this.#store.digestSecret(capabilitySecret(request.body, "grantSecret")),
      state: "issued",
      issuedAt: now,
      expiresAt: effectiveExpiry(
        grantExpiryForPreset(now, requestedPreset),
        this.#storedProjection(prior.value.projectionId).projection.expiresAt,
      ),
      acceptedCount: 0,
      acceptedQuota: GRANT_PRESETS[requestedPreset].acceptedQuota,
      unresolvedInteractionId: null,
      agentDerivationAllowed: permitsAgentDerivative,
      replacedGrantId: prior.value.grantId,
    };
    const replaced = replaceGrant(prior, { state: "replaced", unresolvedInteractionId: null });
    this.#store.saveCapability(replaced);
    this.#store.saveCapability({ kind: "grant", value: replacement, permitsAgentDerivative });
    this.#store.appendEvent(prior.value.roomId, "grant.replaced", prior.value.grantId, 2);
    this.#store.appendEvent(prior.value.roomId, "grant.issued", replacement.grantId, 1);
    return {
      status: 201,
      body: {
        grant: grantView(replacement),
        replacedGrantId: prior.value.grantId,
        receipt: this.#receipt(request, hash, replacement.grantId, 1),
      },
    };
  }

  #revokeGrant(request: OperationRequest, hash: Sha256): OperationResponse {
    const grantId = request.params.grantId;
    const capability = grantId ? this.#store.capability(grantId) : null;
    if (!capability || capability.kind !== "grant") throw new SemanticError(404, "not_found", "Grant not found");
    assertVersion(1, request.expectedVersion);
    if (capability.value.state !== "issued" && capability.value.state !== "consumed") {
      throw new SemanticError(409, "grant_terminal", "Grant is already terminal");
    }
    const revoked = replaceGrant(capability, { state: "revoked", unresolvedInteractionId: null });
    this.#store.saveCapability(revoked);
    this.#store.appendEvent(capability.value.roomId, "grant.revoked", capability.value.grantId, 2);
    return { status: 200, body: { grant: grantView(revoked.value), receipt: this.#receipt(request, hash, capability.value.grantId, 2) } };
  }

  #issueOffer(request: OperationRequest, hash: Sha256, kind: "grant_offer" | "direct_invite"): OperationResponse {
    const now = this.#store.now();
    const presetId = requiredString(request.body, "presetId", 64) as GrantPresetId;
    if (!(presetId in GRANT_PRESETS)) throw new SemanticError(400, "invalid_preset", "Grant preset is invalid");
    const roomId = requiredString(request.body, "roomId", 160);
    const projectionId = requiredString(request.body, "projectionId", 160);
    this.#assertContinuationTarget(roomId, projectionId);
    const offeredGrantExpiresAt = requiredString(request.body, "offeredGrantExpiresAt", 64);
    const projectionExpiry = this.#storedProjection(projectionId).projection.expiresAt;
    if (offeredGrantExpiresAt !== effectiveExpiry(grantExpiryForPreset(now, presetId), projectionExpiry)) {
      throw new SemanticError(400, "fixed_grant_expiry_mismatch", "offeredGrantExpiresAt must equal the earlier of the preset window and Projection expiry");
    }
    if (kind === "grant_offer") {
      const sourceInteractionId = requiredString(request.body, "sourceInteractionId", 160);
      const source = this.#storedInteraction(sourceInteractionId);
      if (["interaction_deleted", "origin_revoked", "room_retired"].includes(source.interaction.state)) {
        throw new SemanticError(409, "source_interaction_terminal", "A terminal Interaction cannot receive a GrantOffer");
      }
      for (const [key, raw] of this.#store.auxiliaryEntries("grant_offer:")) {
        const existing = this.#normalizeOfferRecord("grant_offer", key.slice("grant_offer:".length), raw) as GrantOfferV1;
        if (existing.state === "issued" && existing.sourceInteractionId === sourceInteractionId) {
          throw new SemanticError(409, "live_grant_offer_exists", "This Interaction already has one live GrantOffer");
        }
      }
      const offer = canonicalValue({
        schemaVersion: "grant_offer.v1",
        offerId: this.#store.nextId("offer"),
        sourceInteractionId,
        targetRoomId: roomId,
        targetProjectionId: projectionId,
        presetId,
        state: "issued",
        issuedAt: now,
        acceptanceExpiresAt: requiredString(request.body, "acceptanceExpiresAt", 64),
        offeredGrantExpiresAt,
      }, "grantOffer", validateGrantOfferV1);
      if (Date.parse(offer.acceptanceExpiresAt) > Date.parse(offer.offeredGrantExpiresAt)) {
        throw new SemanticError(400, "offer_deadline_after_grant_expiry", "Offer acceptance cannot outlive the fixed Grant expiry");
      }
      this.#store.saveAuxiliary(`grant_offer:${offer.offerId}`, { ...offer });
      return { status: 201, body: { offer, receipt: this.#receipt(request, hash, offer.offerId, 1) } };
    }
    const invite = canonicalValue({
      schemaVersion: "direct_grant_invite.v1",
      inviteId: this.#store.nextId("invite"),
      targetRoomId: roomId,
      targetProjectionId: projectionId,
      presetId,
      secretDigest: this.#store.digestSecret(capabilitySecret(request.body, "inviteSecret")),
      state: "issued",
      issuedAt: now,
      redemptionExpiresAt: requiredString(request.body, "acceptanceExpiresAt", 64),
      offeredGrantExpiresAt,
    }, "directInvite", validateDirectGrantInviteV1);
    if (Date.parse(invite.redemptionExpiresAt) > Date.parse(invite.offeredGrantExpiresAt)) {
      throw new SemanticError(400, "invite_deadline_after_grant_expiry", "Invite redemption cannot outlive the fixed Grant expiry");
    }
    this.#store.saveAuxiliary(`direct_invite:${invite.inviteId}`, { ...invite });
    return { status: 201, body: { invite: directGrantInviteView(invite), receipt: this.#receipt(request, hash, invite.inviteId, 1) } };
  }

  #acceptOffer(request: OperationRequest, hash: Sha256, kind: "grant_offer" | "direct_invite"): OperationResponse {
    const id = request.params.offerId ?? request.params.inviteId;
    const raw = id ? this.#store.auxiliary(`${kind}:${id}`) : null;
    if (!id || !raw) throw new SemanticError(404, "not_found", "Offer not found");
    const offer = this.#normalizeOfferRecord(kind, id, raw);
    if (offer.state !== "issued") throw new SemanticError(410, `${kind}_${offer.state}`, "Offer is no longer available");
    assertVersion(1, request.expectedVersion);
    if (kind === "grant_offer") {
      const source = this.#storedInteraction((offer as GrantOfferV1).sourceInteractionId);
      if (!this.#store.secretMatchesDigest(bearer(request.authorization), source.interaction.replyCapabilityDigest)) {
        throw new SemanticError(404, "not_found", "Offer not found");
      }
    } else if (!this.#store.secretMatchesDigest(bearer(request.authorization), (offer as DirectGrantInviteV1).secretDigest)) {
      throw new SemanticError(404, "not_found", "Offer not found");
    }
    this.#assertContinuationTarget(offer.targetRoomId, offer.targetProjectionId);
    const expiry = offer.offeredGrantExpiresAt;
    const presetId = offer.presetId;
    const grant: GrantV1 = {
      schemaVersion: "grant.v1",
      grantId: this.#store.nextId("grant"),
      roomId: offer.targetRoomId,
      projectionId: offer.targetProjectionId,
      reentryChainId: this.#store.nextId("chain"),
      presetId,
      secretDigest: this.#store.digestSecret(capabilitySecret(request.body, "grantSecret")),
      state: "issued",
      issuedAt: this.#store.now(),
      expiresAt: effectiveExpiry(expiry, this.#storedProjection(offer.targetProjectionId).projection.expiresAt),
      acceptedCount: 0,
      acceptedQuota: GRANT_PRESETS[presetId].acceptedQuota,
      unresolvedInteractionId: null,
      agentDerivationAllowed: true,
      replacedGrantId: null,
    };
    this.#store.saveCapability({ kind: "grant", value: grant, permitsAgentDerivative: true });
    this.#store.saveAuxiliary(`${kind}:${id}`, { ...offer, state: kind === "grant_offer" ? "accepted" : "redeemed" });
    return { status: 201, body: { grant: grantView(grant), receipt: this.#receipt(request, hash, grant.grantId, 1) } };
  }

  #revokeOffer(request: OperationRequest, hash: Sha256, kind: "grant_offer" | "direct_invite"): OperationResponse {
    const id = request.params.offerId ?? request.params.inviteId;
    const raw = id ? this.#store.auxiliary(`${kind}:${id}`) : null;
    if (!id || !raw) throw new SemanticError(404, "not_found", "Offer not found");
    assertVersion(1, request.expectedVersion);
    const value = this.#normalizeOfferRecord(kind, id, raw);
    if (value.state !== "issued") throw new SemanticError(409, `${kind}_terminal`, "Offer is already terminal");
    const revoked = { ...value, state: "owner_revoked" } as GrantOfferV1 | DirectGrantInviteV1;
    this.#store.saveAuxiliary(`${kind}:${id}`, revoked as unknown as Record<string, unknown>);
    return {
      status: 200,
      body: {
        [kind === "grant_offer" ? "offer" : "invite"]: kind === "direct_invite"
          ? directGrantInviteView(revoked as DirectGrantInviteV1)
          : revoked,
        receipt: this.#receipt(request, hash, id, 2),
      },
    };
  }

  #closeInteraction(request: OperationRequest, hash: Sha256): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (!["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)) throw new SemanticError(409, "terminal_interaction", "Interaction is terminal");
    stored.interaction = { ...stored.interaction, state: "closed_without_response", stateVersion: stored.interaction.stateVersion + 1 };
    this.#store.saveInteraction(stored);
    this.#clearUnresolved(stored.originCapabilityId);
    this.#clearNotification(interactionId);
    this.#store.appendEvent(stored.interaction.roomId, "interaction.closed_without_response", interactionId, stored.interaction.stateVersion);
    return { status: 200, body: { schemaVersion: "interaction_close_result.v1", state: stored.interaction.state, receipt: this.#receipt(request, hash, interactionId, stored.interaction.stateVersion) } };
  }

  #setCuration(request: OperationRequest, hash: Sha256, curationState: "admitted" | "unlisted"): OperationResponse {
    const projectionId = request.params.projectionId;
    if (!projectionId) throw new SemanticError(404, "not_found", "Projection not found");
    const stored = this.#storedProjection(projectionId);
    assertVersion(stored.lifecycle.version, request.expectedVersion);
    if (curationState === "admitted") {
      const room = this.#storedRoom(stored.projection.roomId).room;
      const now = Date.parse(this.#store.now());
      if (stored.lifecycle.curationState === "unlisted") throw new SemanticError(409, "successor_required", "An unlisted Projection version cannot be re-admitted");
      if (
        room.roomKind !== "third_place_public"
        || room.status !== "active"
        || room.currentProjectionId !== projectionId
        || !stored.lifecycle.current
        || stored.lifecycle.ownerState !== "published_fresh"
        || Date.parse(stored.projection.publishedAt) > now
        || now >= Date.parse(stored.projection.freshUntil)
        || Date.parse(stored.projection.freshUntil) >= Date.parse(stored.projection.expiresAt)
      ) throw new SemanticError(409, "projection_not_admissible", "Only the exact current, clock-fresh public Projection may be admitted");
    }
    stored.lifecycle = { ...stored.lifecycle, curationState, version: stored.lifecycle.version + 1, changedAt: this.#store.now() };
    this.#store.saveProjection(stored);
    if (curationState === "unlisted") this.#invalidateUnusedPublicEncounters({ projectionId });
    this.#store.appendEvent(stored.projection.roomId, `curation.${curationState}`, projectionId, stored.lifecycle.version);
    return { status: 200, body: { lifecycle: stored.lifecycle, receipt: this.#receipt(request, hash, projectionId, stored.lifecycle.version) } };
  }

  #sync(request: OperationRequest, hash: Sha256): OperationResponse {
    const roomId = requiredString(request.body, "roomId", 160);
    const after = request.body.afterSequence;
    if (!Number.isSafeInteger(after) || Number(after) < 0) throw new SemanticError(400, "invalid_cursor", "afterSequence must be non-negative");
    this.#storedRoom(roomId);
    const replay = this.#store.eventReplayState(roomId);
    const highWater = replay.highWater;
    if (Number(after) > highWater) throw new SemanticError(409, "cursor_ahead", "afterSequence is ahead of the Room event high-water mark");
    if (Number(after) < replay.earliestReplayableSequence - 1) {
      const gone = validateCursorGoneV1({
        schemaVersion: "cursor_gone.v1",
        roomId,
        afterSequence: Number(after),
        highWater,
        earliestReplayableSequence: replay.earliestReplayableSequence,
        liveEvents: replay.liveEvents,
        tombstoneIds: replay.tombstoneIds,
      });
      return { status: 410, body: gone as unknown as Record<string, unknown> };
    }
    const events = this.#store.eventsAfter(roomId, Number(after));
    const batch = validateRoomEventBatchV1({
      schemaVersion: "room_event_batch.v1",
      roomId,
      afterSequence: Number(after),
      highWater,
      events,
    });
    // The wire body is the shared protocol DTO itself. Keeping transport metadata
    // out of this object lets the local port validate the exact same contract.
    return { status: 200, body: batch as unknown as Record<string, unknown> };
  }

  #pull(request: OperationRequest, hash: Sha256): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (
      !["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)
      || Date.parse(stored.interaction.expiresAt) <= Date.parse(this.#store.now())
    ) throw new SemanticError(404, "not_found", "Interaction not available");
    if (stored.interaction.state === "accepted") {
      stored.interaction = {
        ...stored.interaction,
        state: "seen_locally",
        stateVersion: stored.interaction.stateVersion + 1,
      };
      this.#store.saveInteraction(stored);
      this.#store.appendEvent(
        stored.interaction.roomId,
        "interaction.seen_locally",
        interactionId,
        stored.interaction.stateVersion,
      );
    }
    return {
      status: 200,
      body: {
        schemaVersion: "room_operator_pull_result.v1",
        // This exact canonical object is available only to the authenticated,
        // exact-Room Prepare launcher. Guest, Owner-status, Web, and public API
        // views all use publicInteractionView; the local Session validator
        // currently requires the immutable consent/recovery digests.
        interaction: stored.interaction,
        receipt: this.#receipt(request, hash, interactionId, stored.interaction.stateVersion),
      },
    };
  }

  #freshCycleInteraction(request: OperationRequest): StoredInteraction {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (
      !["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)
      || stored.interaction.consent !== "allow_owner_local_ai"
      || stored.response !== null
      || Date.parse(stored.interaction.expiresAt) <= Date.parse(this.#store.now())
    ) throw new SemanticError(410, "interaction_not_eligible", "Interaction cannot use a Fresh response cycle");
    const room = this.#storedRoom(stored.interaction.roomId).room;
    const projection = this.#storedProjection(stored.interaction.projectionId);
    if (room.status !== "active" || projection.lifecycle.ownerState === "revoked") {
      throw new SemanticError(410, "origin_not_eligible", "Interaction origin cannot use a Fresh response cycle");
    }
    return stored;
  }

  #reserveCycle(request: OperationRequest, hash: Sha256): OperationResponse {
    const stored = this.#freshCycleInteraction(request);
    const interactionId = stored.interaction.interactionId;
    if (stored.interaction.state === "accepted") {
      throw new SemanticError(409, "interaction_not_seen_locally", "Pull the Interaction before reserving a Fresh response cycle");
    }
    const previous = this.#store.auxiliary(`cycle:${interactionId}`) as unknown as FreshCycleReservationV1 | null;
    if (previous && previous.state !== "released_zero_dispatch") {
      throw new SemanticError(409, "cycle_already_reserved", "Fresh cycle is already reserved or spent");
    }
    const reservation = validateFreshCycleReservationV1({
      schemaVersion: "fresh_cycle_reservation.v1",
      reservationId: this.#store.nextId("reservation"),
      interactionId,
      startAuthorizationHash: sha(request.body, "startAuthorizationHash"),
      sessionEnvelopeHash: sha(request.body, "sessionEnvelopeHash"),
      state: "reserved",
      idempotencyKey: request.idempotencyKey ?? "",
      reservedAt: this.#store.now(),
      firstDispatchCommittedAt: null,
      version: 1,
    });
    this.#store.saveAuxiliary(`cycle:${interactionId}`, { ...reservation });
    if (stored.interaction.state === "seen_locally") {
      stored.interaction = {
        ...stored.interaction,
        state: "preparing",
        stateVersion: stored.interaction.stateVersion + 1,
      };
      this.#store.saveInteraction(stored);
      this.#store.appendEvent(
        stored.interaction.roomId,
        "interaction.preparing",
        interactionId,
        stored.interaction.stateVersion,
      );
    }
    return { status: 200, body: { reservation, receipt: this.#receipt(request, hash, reservation.reservationId, reservation.version) } };
  }

  #cycleByExactRecovery(request: OperationRequest): FreshCycleReservationV1 {
    const stored = this.#freshCycleInteraction(request);
    const interactionId = stored.interaction.interactionId;
    const reservation = this.#store.auxiliary(`cycle:${interactionId}`) as unknown as FreshCycleReservationV1 | null;
    if (!reservation) throw new SemanticError(404, "cycle_not_found", "Fresh cycle is unavailable");
    if (
      reservation.reservationId !== requiredString(request.body, "reservationId", 160)
      || reservation.startAuthorizationHash !== sha(request.body, "startAuthorizationHash")
      || reservation.sessionEnvelopeHash !== sha(request.body, "sessionEnvelopeHash")
    ) throw new SemanticError(409, "cycle_recovery_mismatch", "Recovery does not bind the exact Fresh cycle");
    return reservation;
  }

  #recoverCycle(request: OperationRequest, hash: Sha256): OperationResponse {
    const reservation = this.#cycleByExactRecovery(request);
    if (reservation.state === "released_zero_dispatch") {
      throw new SemanticError(410, "cycle_released", "Released Fresh cycle cannot be recovered");
    }
    // Recovery is an inspection/reconciliation of the same immutable binding.
    // In particular, a spent cycle remains dispatch_committed and never reopens.
    return { status: 200, body: { reservation, receipt: this.#receipt(request, hash, reservation.reservationId, reservation.version) } };
  }

  #abandonCycle(request: OperationRequest, hash: Sha256): OperationResponse {
    const reservation = this.#cycleByExactRecovery(request);
    if (request.body.transportJournalDispatches !== 0) {
      throw new SemanticError(409, "zero_dispatch_attestation_required", "Fresh cycle release requires an exact zero-dispatch attestation");
    }
    const permits = this.#store.auxiliaryEntries("dispatch:")
      .map(([, value]) => value as unknown as DispatchPermitV1)
      .filter((permit) => permit.interactionId === reservation.interactionId && permit.reservationId === reservation.reservationId);
    if (reservation.state === "released_zero_dispatch") {
      return { status: 200, body: { reservation, receipt: this.#receipt(request, hash, reservation.reservationId, reservation.version) } };
    }
    if (reservation.state !== "reserved" || reservation.firstDispatchCommittedAt !== null || permits.length !== 0) {
      throw new SemanticError(409, "zero_dispatch_release_denied", "A dispatched or spent Fresh cycle cannot be released");
    }
    const released = validateFreshCycleReservationV1({
      ...reservation,
      state: "released_zero_dispatch",
      version: reservation.version + 1,
    });
    this.#store.saveAuxiliary(`cycle:${reservation.interactionId}`, { ...released });
    return { status: 200, body: { reservation: released, receipt: this.#receipt(request, hash, released.reservationId, released.version) } };
  }

  #dispatchPermit(request: OperationRequest, hash: Sha256): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    this.#freshCycleInteraction(request);
    const reservation = this.#store.auxiliary(`cycle:${interactionId}`) as unknown as FreshCycleReservationV1 | null;
    if (!reservation || !["reserved", "dispatch_committed"].includes(reservation.state)) throw new SemanticError(409, "cycle_not_reserved", "Fresh cycle is not reserved");
    if (
      reservation.reservationId !== requiredString(request.body, "reservationId", 160)
      || reservation.sessionEnvelopeHash !== sha(request.body, "sessionEnvelopeHash")
      || reservation.startAuthorizationHash !== sha(request.body, "startAuthorizationHash")
    ) throw new SemanticError(409, "dispatch_cycle_mismatch", "Dispatch does not bind the exact Fresh cycle");
    if (request.body.provider !== "OpenAI") throw new SemanticError(409, "provider_mismatch", "P0 dispatch provider must be OpenAI");
    const ordinal = request.body.ordinal;
    const priorPermits = this.#store.auxiliaryEntries("dispatch:")
      .map(([, value]) => value as unknown as DispatchPermitV1)
      .filter((permit) => permit.interactionId === interactionId && permit.reservationId === reservation.reservationId)
      .sort((left, right) => left.dispatchOrdinal - right.dispatchOrdinal);
    if (!Number.isSafeInteger(ordinal) || Number(ordinal) !== priorPermits.length + 1 || Number(ordinal) > 3) {
      throw new SemanticError(409, "invalid_dispatch_ordinal", "Dispatch ordinal must be the next unused P0 ordinal");
    }
    const now = this.#store.now();
    const permit = validateDispatchPermitV1({
      schemaVersion: "dispatch_permit.v1",
      permitId: this.#store.nextId("permit"),
      interactionId,
      reservationId: reservation.reservationId,
      sessionEnvelopeHash: reservation.sessionEnvelopeHash,
      startAuthorizationHash: reservation.startAuthorizationHash,
      provider: "OpenAI",
      modelId: requiredString(request.body, "model", 128),
      payloadHash: sha(request.body, "payloadHash"),
      dispatchOrdinal: Number(ordinal),
      idempotencyKey: request.idempotencyKey ?? "",
      issuedAt: now,
      expiresAt: addMilliseconds(now, 30_000),
      consumedAt: null,
    });
    if (reservation.state === "reserved") {
      const committed = validateFreshCycleReservationV1({
        ...reservation,
        state: "dispatch_committed",
        firstDispatchCommittedAt: now,
        version: reservation.version + 1,
      });
      this.#store.saveAuxiliary(`cycle:${interactionId}`, { ...committed });
    }
    this.#store.saveAuxiliary(`dispatch:${permit.permitId}`, { ...permit });
    return { status: 201, body: { permit, syntheticTransport: { upstreamEnabled: false }, receipt: this.#receipt(request, hash, permit.permitId, 1) } };
  }

  #ack(request: OperationRequest, hash: Sha256): OperationResponse {
    // ACK is likewise the canonical protocol DTO, not a hosted-only wrapper.
    const ack = canonicalValue(request.body, "room_event_ack", validateRoomEventAckV1);
    if (ack.idempotencyKey !== request.idempotencyKey) throw new SemanticError(409, "ack_idempotency_mismatch", "ACK and mutation idempotency keys differ");
    const event = this.#store.eventsAfter(ack.roomId, ack.sequence - 1).find((candidate) => candidate.sequence === ack.sequence);
    if (!event || event.eventId !== ack.eventId || canonicalSha256(event) !== ack.eventHash) throw new SemanticError(409, "ack_mismatch", "ACK does not match event");
    const ackReceipt = validateRoomEventAckReceiptV1({
      schemaVersion: "room_event_ack_receipt.v1",
      receiptId: this.#store.nextId("receipt"),
      roomId: ack.roomId,
      eventId: ack.eventId,
      sequence: ack.sequence,
      eventHash: ack.eventHash,
      idempotencyKey: ack.idempotencyKey,
      committedAt: this.#store.now(),
    });
    return { status: 200, body: ackReceipt as unknown as Record<string, unknown> };
  }

  #deliverResponse(request: OperationRequest, hash: Sha256): OperationResponse {
    const delivery = this.#publicationDelivery(request, "response");
    const published = delivery.response;
    const interactionId = published.interactionId;
    const stored = this.#storedInteraction(interactionId);
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (!["accepted", "seen_locally", "preparing"].includes(stored.interaction.state)) throw new SemanticError(410, "interaction_not_eligible", "Interaction cannot receive a Response");
    const projection = this.#storedProjection(stored.interaction.projectionId);
    const room = this.#storedRoom(stored.interaction.roomId).room;
    if (room.status !== "active") throw new SemanticError(410, "room_retired", "Interaction Room is retired");
    if (projection.lifecycle.ownerState === "revoked") throw new SemanticError(410, "origin_revoked", "A revoked origin cannot receive a Response");
    const now = this.#store.now();
    const effectiveOriginState = this.#effectiveOriginState(projection, now);
    if (
      published.roomId !== stored.interaction.roomId
      || published.projectionId !== stored.interaction.projectionId
      || published.originStateAtPublication !== effectiveOriginState
    ) throw new SemanticError(409, "response_scope_mismatch", "Response does not bind the current Interaction origin");
    if (
      Date.parse(published.publishedAt) < Date.parse(stored.interaction.acceptedAt)
    ) throw new SemanticError(409, "response_chronology_invalid", "Response publication cannot precede Interaction acceptance");
    if (
      Date.parse(published.publishedAt) > Date.parse(now)
      || Date.parse(published.expiresAt) <= Date.parse(now)
      || Date.parse(published.expiresAt) > Date.parse(stored.interaction.expiresAt)
    ) throw new SemanticError(410, "response_expired", "Response publication is not currently valid");
    if (
      (stored.interaction.consent === "manual_owner_only" && published.sourceDisclosureClass !== "manual_owner_authored")
      || (
        stored.interaction.consent === "allow_owner_local_ai"
        && published.sourceDisclosureClass !== "fresh_native_sanitized_snapshot_owner_reviewed"
        && published.sourceDisclosureClass !== "manual_owner_authored"
      )
    ) throw new SemanticError(409, "source_disclosure_not_consented", "Response source class is outside the exact Interaction consent lane");
    if (this.#store.interactions().some((item) => item.response?.responseId === published.responseId)) {
      throw new SemanticError(409, "immutable_response_exists", "Response ID already exists");
    }
    if (this.#store.auxiliary(`publication_attestation:${delivery.attestation.attestationId}`)) {
      throw new SemanticError(409, "publication_attestation_used", "Publication attestation was already consumed");
    }
    const response = validateResponseV1({
      schemaVersion: "response.v1",
      responseId: published.responseId,
      interactionId,
      roomId: stored.interaction.roomId,
      projectionId: stored.interaction.projectionId,
      body: published.body,
      candidateHash: published.candidateHash,
      originStateAtPublication: published.originStateAtPublication,
      sourceDisclosureClass: published.sourceDisclosureClass,
      localBasisAttestationId: published.localBasisAttestationId,
      approvalAttestationId: delivery.attestation.attestationId,
      publicationReceiptId: this.#store.nextId("receipt"),
      publishedAt: published.publishedAt,
      expiresAt: published.expiresAt,
      state: "available",
      stateVersion: 1,
    }, stored.interaction);
    stored.response = response;
    stored.interaction = { ...stored.interaction, state: "response_ready", stateVersion: stored.interaction.stateVersion + 1 };
    this.#store.saveInteraction(stored);
    this.#store.saveAuxiliary(`publication_attestation:${delivery.attestation.attestationId}`, {
      schemaVersion: "synthetic_publication_attestation_receipt.v1",
      attestationId: delivery.attestation.attestationId,
      bindingId: delivery.attestation.bindingId,
      roomId: delivery.attestation.roomId,
      artifactClass: delivery.attestation.artifactClass,
      artifactId: delivery.attestation.artifactId,
      artifactHash: delivery.attestation.artifactHash,
      issuedAt: delivery.attestation.issuedAt,
      expiresAt: delivery.attestation.expiresAt,
      bodyFree: true,
    });
    this.#clearUnresolved(stored.originCapabilityId);
    this.#store.appendEvent(stored.interaction.roomId, "response.published", response.responseId, 1);
    const readyNotice = this.#notifications.responseAvailable(
      interactionId,
      response.responseId,
      response.expiresAt,
      stored.interaction.expiresAt,
    );
    const syntheticNotice = readyNotice?.state === "ready_pending"
      ? { schemaVersion: "synthetic_notice.v1", state: "ready_pending", bodyFree: true, externalEmailSent: false }
      : { schemaVersion: "synthetic_notice.v1", state: "absent", bodyFree: true, externalEmailSent: false };
    this.#store.saveAuxiliary(`notice:${interactionId}`, syntheticNotice);
    return { status: 201, body: { responseId: response.responseId, interactionVersion: stored.interaction.stateVersion, syntheticNotice, receipt: this.#receipt(request, hash, response.responseId, 1) } };
  }

  #revokeResponse(request: OperationRequest, hash: Sha256): OperationResponse {
    const responseId = request.params.responseId;
    if (!responseId) throw new SemanticError(404, "not_found", "Response not found");
    const stored = this.#store.interactions().find((item) => item.response?.responseId === responseId);
    if (!stored?.response) throw new SemanticError(404, "not_found", "Response not found");
    assertVersion(stored.response.stateVersion, request.expectedVersion);
    if (stored.response.state !== "available") throw new SemanticError(409, "response_terminal", "Response is already terminal");
    stored.response = this.#terminalResponse(stored.response, "response_revoked");
    this.#store.saveInteraction(stored);
    this.#clearNotification(stored.interaction.interactionId);
    this.#store.appendEvent(stored.interaction.roomId, "response.response_revoked", responseId, stored.response?.stateVersion ?? 1);
    return {
      status: 200,
      body: {
        schemaVersion: "response_revoke_result.v1",
        responseState: stored.response?.state ?? "response_revoked",
        receipt: this.#receipt(request, hash, responseId, stored.response?.stateVersion ?? 1),
      },
    };
  }

  #registerDueRetentionTargets(now: string): void {
    const due = (timestamp: string): boolean => Date.parse(timestamp) <= Date.parse(now);
    const register = (kind: RetentionTarget["kind"], targetId: string, terminalAt: string): void => {
      this.#retentionRepository.register({ targetId: `${kind}:${targetId}`, kind, terminalAt });
    };
    const registerNotification = (stored: StoredInteraction, terminalAt: string): void => {
      const interactionId = stored.interaction.interactionId;
      const endpoint = this.#store.notification(interactionId);
      const inspection = this.#notifications.inspect(interactionId);
      const verificationAlreadyDue = endpoint.endpoint.verificationExpiresAt !== null
        && Date.parse(endpoint.endpoint.verificationExpiresAt) <= Date.parse(now);
      if (endpoint.endpoint.encryptedAddress !== null && !verificationAlreadyDue) register("notification_endpoint", interactionId, terminalAt);
      if (inspection.notice?.encryptedDeliveryTarget !== null && inspection.notice !== null) {
        register("notification_delivery_target", `${interactionId}:${inspection.notice.noticeId}`, terminalAt);
      }
      if (!verificationAlreadyDue && inspection.verificationSend && (
        inspection.verificationSend.encryptedDeliveryTarget !== null
        || inspection.verificationSend.encryptedVerificationCode !== null
      )) {
        register("notification_delivery_target", `${interactionId}:${inspection.verificationSend.sendId}`, terminalAt);
      }
    };

    for (const stored of this.#store.interactions()) {
      const interactionDue = due(stored.interaction.expiresAt);
      const responseDue = stored.response?.state === "available" && due(stored.response.expiresAt);
      if (interactionDue) {
        if (stored.interaction.requestText !== "[purged]" || stored.interaction.guestCapsule !== null) {
          register("interaction_body", stored.interaction.interactionId, stored.interaction.expiresAt);
        }
        registerNotification(stored, stored.interaction.expiresAt);
      }
      if (responseDue && stored.response) {
        if (stored.response.body !== "[purged]") register("response_body", stored.response.responseId, stored.response.expiresAt);
        if (!interactionDue) registerNotification(stored, stored.response.expiresAt);
      }
      const endpoint = this.#store.notification(stored.interaction.interactionId);
      if (endpoint.endpoint.verificationExpiresAt && due(endpoint.endpoint.verificationExpiresAt)) {
        if (endpoint.endpoint.encryptedAddress !== null) {
          register("notification_endpoint", stored.interaction.interactionId, endpoint.endpoint.verificationExpiresAt);
        }
        if (endpoint.challengeId) register("verification_challenge", `${stored.interaction.interactionId}:${endpoint.challengeId}`, endpoint.endpoint.verificationExpiresAt);
        const send = this.#notifications.inspect(stored.interaction.interactionId).verificationSend;
        if (send && (send.encryptedDeliveryTarget !== null || send.encryptedVerificationCode !== null)) {
          register("notification_delivery_target", `${stored.interaction.interactionId}:${send.sendId}`, endpoint.endpoint.verificationExpiresAt);
        }
      }
    }
  }

  #purgeActualRetentionTarget(
    target: RetentionTarget,
    now: string,
  ): { outcome: "purged" | "already_absent"; expiredInteraction: boolean; expiredResponse: boolean } {
    const prefix = `${target.kind}:`;
    if (!target.targetId.startsWith(prefix)) throw new Error("retention target kind/id mismatch");
    const exactTargetId = target.targetId.slice(prefix.length);
    if (target.kind === "interaction_body" || target.kind === "guest_capsule") {
      const stored = this.#store.interaction(exactTargetId);
      const present = stored && (target.kind === "interaction_body"
        ? stored.interaction.requestText !== "[purged]" || stored.interaction.guestCapsule !== null
        : stored.interaction.guestCapsule !== null);
      if (!stored || !present) return { outcome: "already_absent", expiredInteraction: false, expiredResponse: false };
      if (Date.parse(stored.interaction.expiresAt) > Date.parse(now)) throw new Error("interaction retention target is not due");
      if (stored.response?.state === "available" && stored.response.body !== "[purged]") {
        throw new Error("response retention target must commit before parent Interaction purge");
      }
      const transitions = !["interaction_expired", "interaction_deleted", "origin_revoked", "room_retired"].includes(stored.interaction.state);
      stored.interaction = {
        ...stored.interaction,
        requestText: "[purged]",
        guestCapsule: null,
        state: transitions ? "interaction_expired" : stored.interaction.state,
        stateVersion: stored.interaction.stateVersion + 1,
      };
      this.#store.saveInteraction(stored);
      this.#clearUnresolved(stored.originCapabilityId);
      if (transitions) {
        this.#store.appendEvent(stored.interaction.roomId, "interaction.interaction_expired", exactTargetId, stored.interaction.stateVersion);
      }
      return { outcome: "purged", expiredInteraction: transitions, expiredResponse: false };
    }
    if (target.kind === "response_body") {
      const stored = this.#store.interactions().find((candidate) => candidate.response?.responseId === exactTargetId);
      if (!stored?.response || stored.response.body === "[purged]") {
        return { outcome: "already_absent", expiredInteraction: false, expiredResponse: false };
      }
      if (Date.parse(stored.response.expiresAt) > Date.parse(now)) throw new Error("response retention target is not due");
      const expiredResponse = this.#terminalResponse(stored.response, "response_expired");
      if (!expiredResponse) throw new Error("response expiry lost its response record");
      stored.response = expiredResponse;
      this.#store.saveInteraction(stored);
      this.#store.appendEvent(stored.interaction.roomId, "response.response_expired", expiredResponse.responseId, expiredResponse.stateVersion);
      return { outcome: "purged", expiredInteraction: false, expiredResponse: true };
    }
    const separator = exactTargetId.indexOf(":");
    const interactionId = separator < 0 ? exactTargetId : exactTargetId.slice(0, separator);
    const recordId = separator < 0 ? null : exactTargetId.slice(separator + 1);
    if (!interactionId) throw new Error("notification retention target is missing its Interaction");
    if (target.kind !== "notification_endpoint" && !recordId) {
      throw new Error("notification retention target is missing its exact record ID");
    }
    const outcome = this.#notifications.purgeRetentionTarget(interactionId, target.kind, recordId);
    return { outcome, expiredInteraction: false, expiredResponse: false };
  }

  async runLifecycleJanitor(
    now = this.#store.now(),
    invocation: "scheduled" | "manual" = "scheduled",
    faults: { readonly failTargetIds?: ReadonlySet<string> } = {},
  ): Promise<{
    schemaVersion: "synthetic_lifecycle_janitor.v1";
    expiredInteractions: number;
    expiredResponses: number;
    bodyFree: true;
  }> {
    let expiredInteractions = 0;
    let expiredResponses = 0;
    const janitorRun = await this.#retentionJanitor.run(now, invocation, {
      failTargetIds: faults.failTargetIds,
      afterLock: async () => this.#store.runExclusive(() => {
        this.#registerDueRetentionTargets(now);
      }),
      purgeTarget: async (target) => this.#store.runExclusive(() => {
        const result = this.#purgeActualRetentionTarget(target, now);
        if (result.expiredInteraction) expiredInteractions += 1;
        if (result.expiredResponse) expiredResponses += 1;
        return result.outcome;
      }),
    });
    if (janitorRun.status !== "advisory_lock_held") {
      await this.#store.runExclusive(() => {
        // Body-free recovery rows and replay compaction share the same explicit
        // scheduled maintenance invocation but do not widen its payload batch.
        void this.#store.idempotencyEntries();
        this.#store.compactEvents(now);
      });
    }
    this.#lastRetentionRun = janitorRun;
    return { schemaVersion: "synthetic_lifecycle_janitor.v1", expiredInteractions, expiredResponses, bodyFree: true };
  }

  #localPurge(request: OperationRequest, hash: Sha256): OperationResponse {
    const interactionId = request.params.interactionId;
    if (!interactionId) throw new SemanticError(404, "not_found", "Interaction not found");
    const stored = this.#storedInteraction(interactionId);
    assertVersion(stored.interaction.stateVersion, request.expectedVersion);
    if (request.body.localBytesAbsent !== true) throw new SemanticError(400, "purge_not_proven", "Local absence attestation is required");
    return { status: 200, body: { schemaVersion: "local_purge_result.v1", localBytesAbsent: true, receipt: this.#receipt(request, hash, interactionId, stored.interaction.stateVersion) } };
  }
}
