import { createHmac, timingSafeEqual } from "node:crypto";
import {
  canonicalSha256,
  createProjectionReadViewV1,
  isThirdPlaceDiscoverable,
  validateOperationReceiptV1,
  validateAgentDerivativeV1,
  validateGrantV1,
  validateInteractionV1,
  validateNotificationEndpointV1,
  validateProjectionCapsuleV1,
  validateProjectionLifecycleV1,
  validatePublicEncounterV1,
  validateResponseV1,
  validateRoomV1,
  validateRoomEventV1,
  type AgentDerivativeV1,
  type ApiActorClass,
  type GrantV1,
  type OperationReceiptV1,
  type ProjectionCapsuleV1,
  type ProjectionLifecycleV1,
  type PublicEncounterV1,
  type RoomV1,
  type RoomEventObjectType,
} from "../../../packages/r4-protocol/src/index.ts";
import type {
  HostedEvent,
  OwnerStatusView,
  PublicProjectionView,
  StoredCapability,
  StoredInteraction,
  StoredNotification,
  StoredProjection,
  StoredPairingChallenge,
  StoredRoom,
  StoredRoomOperatorBinding,
} from "./domain.ts";
import { projectionWithPayloadHash } from "./domain.ts";
import { publicInteractionView } from "./redaction.ts";
import {
  SYNTHETIC_PRIVATE_ROOM_ID,
  SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET,
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "./synthetic-fixtures.ts";

export interface StoredOperationResult {
  requestHash: `sha256:${string}`;
  status: number;
  body: Record<string, unknown>;
  sensitiveUntil: string | null;
  expiredStatus: number | null;
  expiredBody: Record<string, unknown> | null;
  retentionExpiresAt: string;
  recoveryKind: "stored_body" | "room_operator_pull" | "notification_current" | "publication_current";
}

export interface HostedEventReplayState {
  readonly highWater: number;
  readonly earliestReplayableSequence: number;
  readonly liveEvents: HostedEvent[];
  readonly tombstoneIds: string[];
}

export interface HostedEventCompactionResult {
  readonly compactedEvents: number;
  readonly reconciliationSnapshots: number;
}

export interface HostedPresenceStore {
  runExclusive<T>(work: () => T | Promise<T>): Promise<T>;
  now(): string;
  nextId(prefix: string): string;
  digestSecret(secret: string): `sha256:${string}`;
  secretMatchesDigest(secret: string, digest: string): boolean;
  room(roomId: string): StoredRoom | null;
  projection(projectionId: string): StoredProjection | null;
  interaction(interactionId: string): StoredInteraction | null;
  interactions(): StoredInteraction[];
  capabilityBySecret(secret: string): StoredCapability | null;
  capability(capabilityId: string): StoredCapability | null;
  capabilities(): StoredCapability[];
  roomOperatorBindingBySecret(secret: string): StoredRoomOperatorBinding | null;
  roomOperatorBinding(bindingId: string): StoredRoomOperatorBinding | null;
  pairingChallenge(pairingId: string): StoredPairingChallenge | null;
  listThirdPlace(): PublicProjectionView[];
  ownerStatus(): OwnerStatusView;
  eventsAfter(roomId: string, sequence: number): HostedEvent[];
  eventReplayState(roomId: string): HostedEventReplayState;
  compactEvents(now?: string): HostedEventCompactionResult;
  notification(interactionId: string): StoredNotification;
  saveRoom(room: StoredRoom): void;
  saveProjection(projection: StoredProjection): void;
  saveInteraction(interaction: StoredInteraction): void;
  saveCapability(capability: StoredCapability): void;
  saveRoomOperatorBinding(binding: StoredRoomOperatorBinding): void;
  savePairingChallenge(pairing: StoredPairingChallenge): void;
  saveNotification(notification: StoredNotification): void;
  appendEvent(roomId: string, eventType: string, objectId: string, objectVersion: number): HostedEvent;
  idempotency(actor: string, operation: string, key: string): StoredOperationResult | null;
  idempotencyEntries(): StoredOperationResult[];
  saveIdempotency(actor: string, operation: string, key: string, result: StoredOperationResult): void;
  auxiliary(key: string): Record<string, unknown> | null;
  auxiliaryEntries(prefix: string): Array<[string, Record<string, unknown>]>;
  saveAuxiliary(key: string, value: Record<string, unknown>): void;
  publicAcceptedCountSince(roomId: string, sinceExclusive: string): number;
  recordPublicAccepted(roomId: string, interactionId: string, acceptedAt: string): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function timestampAfter(now: string, milliseconds: number): string {
  return new Date(Date.parse(now) + milliseconds).toISOString();
}

function capabilityId(capability: StoredCapability): string {
  if (capability.kind === "public_encounter") return capability.value.encounterId;
  if (capability.kind === "grant") return capability.value.grantId;
  return capability.value.derivativeId;
}

function capabilityDigest(capability: StoredCapability): string {
  return capability.value.secretDigest;
}

function equalSha256Digest(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

function eventObjectType(eventType: string): RoomEventObjectType {
  const namespace = eventType.split(".", 1)[0];
  if (namespace === "curation" || namespace === "projection") return "projection";
  if (namespace === "room" || namespace === "interaction" || namespace === "response" || namespace === "grant" || namespace === "notification" || namespace === "purge") {
    return namespace;
  }
  throw new Error(`unsupported hosted event namespace:${namespace ?? ""}`);
}

function eventBodyAvailable(eventType: string): boolean {
  return !new Set([
    "room.retired",
    "room.deleted",
    "projection.superseded",
    "projection.revoked",
    "projection.expired",
    "interaction.closed_without_response",
    "interaction.deleted",
    "interaction.interaction_deleted",
    "interaction.interaction_expired",
    "interaction.origin_revoked",
    "interaction.room_retired",
    "response.response_expired",
    "response.response_revoked",
    "response.origin_revoked",
    "response.interaction_deleted",
    "response.room_retired",
    "grant.replaced",
    "grant.revoked",
    "grant.expired",
    "grant.invalidated",
    "notification.cleared",
  ]).has(eventType) && !eventType.startsWith("purge.");
}

export class SyntheticPresenceStore implements HostedPresenceStore {
  #clock: () => Date;
  #counter = 100;
  #rooms = new Map<string, StoredRoom>();
  #projections = new Map<string, StoredProjection>();
  #interactions = new Map<string, StoredInteraction>();
  #capabilities = new Map<string, StoredCapability>();
  #roomOperatorBindings = new Map<string, StoredRoomOperatorBinding>();
  #pairingChallenges = new Map<string, StoredPairingChallenge>();
  #notifications = new Map<string, StoredNotification>();
  #events = new Map<string, HostedEvent[]>();
  #eventHighWater = new Map<string, number>();
  #eventReconciliation = new Map<string, Map<string, HostedEvent>>();
  #eventTerminalExpiresAt = new Map<string, Map<string, string>>();
  #operations = new Map<string, StoredOperationResult>();
  #auxiliary = new Map<string, Record<string, unknown>>();
  #publicAccepted = new Map<string, Map<string, string>>();
  #tail: Promise<void> = Promise.resolve();

  constructor(clock: () => Date = () => new Date()) {
    this.#clock = clock;
    this.#seed();
  }

  async runExclusive<T>(work: () => T | Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release = (): void => undefined;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  now(): string {
    return this.#clock().toISOString();
  }

  nextId(prefix: string): string {
    this.#counter += 1;
    return `${prefix}_${this.#counter.toString(36).padStart(24, "0")}`;
  }

  digestSecret(secret: string): `sha256:${string}` {
    return `sha256:${createHmac("sha256", "forme-r4-synthetic-only-not-a-production-key")
      .update(secret)
      .digest("hex")}`;
  }

  secretMatchesDigest(secret: string, digest: string): boolean {
    return equalSha256Digest(this.digestSecret(secret), digest);
  }

  room(roomId: string): StoredRoom | null {
    const value = this.#rooms.get(roomId);
    return value ? clone(value) : null;
  }

  projection(projectionId: string): StoredProjection | null {
    const value = this.#projections.get(projectionId);
    return value ? clone(value) : null;
  }

  interaction(interactionId: string): StoredInteraction | null {
    const value = this.#interactions.get(interactionId);
    return value ? clone(value) : null;
  }

  interactions(): StoredInteraction[] {
    return [...this.#interactions.values()].map(clone);
  }

  capabilityBySecret(secret: string): StoredCapability | null {
    let matched: StoredCapability | null = null;
    for (const capability of this.#capabilities.values()) {
      if (this.secretMatchesDigest(secret, capabilityDigest(capability))) matched = capability;
    }
    return matched ? clone(matched) : null;
  }

  capability(id: string): StoredCapability | null {
    const value = this.#capabilities.get(id);
    return value ? clone(value) : null;
  }

  capabilities(): StoredCapability[] {
    return [...this.#capabilities.values()].map(clone);
  }

  roomOperatorBindingBySecret(secret: string): StoredRoomOperatorBinding | null {
    let matched: StoredRoomOperatorBinding | null = null;
    for (const binding of this.#roomOperatorBindings.values()) {
      if (this.secretMatchesDigest(secret, binding.secretDigest)) matched = binding;
    }
    return matched ? clone(matched) : null;
  }

  roomOperatorBinding(bindingId: string): StoredRoomOperatorBinding | null {
    const value = this.#roomOperatorBindings.get(bindingId);
    return value ? clone(value) : null;
  }

  pairingChallenge(pairingId: string): StoredPairingChallenge | null {
    let value = this.#pairingChallenges.get(pairingId);
    if (value && value.state !== "expired" && Date.parse(value.expiresAt) <= Date.parse(this.now())) {
      value = {
        ...value,
        state: "expired",
        exchangeResponse: null,
        version: value.version + 1,
      };
      this.#pairingChallenges.set(pairingId, clone(value));
    }
    return value ? clone(value) : null;
  }

  listThirdPlace(): PublicProjectionView[] {
    const result: PublicProjectionView[] = [];
    for (const stored of this.#projections.values()) {
      const storedRoom = this.#rooms.get(stored.projection.roomId);
      if (!storedRoom || !isThirdPlaceDiscoverable(storedRoom.room, stored.projection, stored.lifecycle, this.now())) continue;
      result.push({
        schemaVersion: "third_place_resident.v1",
        roomLabel: storedRoom.label,
        view: createProjectionReadViewV1(storedRoom.room, stored.projection, stored.lifecycle, { kind: "public" }, this.now()),
      });
    }
    return result.sort((left, right) => left.view.projection.projectionId.localeCompare(right.view.projection.projectionId));
  }

  ownerStatus(): OwnerStatusView {
    return {
      rooms: [...this.#rooms.values()].map(clone),
      projections: [...this.#projections.values()].map(clone),
      interactions: [...this.#interactions.values()].map((stored) => {
        const {
          requestText: _request,
          guestCapsule: _capsule,
          ...bodyFreeInteraction
        } = publicInteractionView(stored.interaction);
        const response = stored.response
          ? (({ body: _body, ...bodyFreeResponse }) => bodyFreeResponse)(clone(stored.response))
          : null;
        return { interaction: bodyFreeInteraction, response };
      }),
      events: [...this.#events.values()].flat().map(clone),
    };
  }

  eventsAfter(roomId: string, sequence: number): HostedEvent[] {
    return (this.#events.get(roomId) ?? []).filter((event) => event.sequence > sequence).map(clone);
  }

  eventReplayState(roomId: string): HostedEventReplayState {
    const retained = this.#events.get(roomId) ?? [];
    const highWater = this.#eventHighWater.get(roomId) ?? 0;
    const earliestReplayableSequence = retained[0]?.sequence ?? highWater + 1;
    const current = [...(this.#eventReconciliation.get(roomId)?.values() ?? [])];
    const liveEvents = current
      .filter((event) => event.bodyAvailable && event.sequence >= earliestReplayableSequence)
      .sort((left, right) => left.sequence - right.sequence)
      .map(clone);
    const tombstoneExpiry = this.#eventTerminalExpiresAt.get(roomId) ?? new Map<string, string>();
    const now = Date.parse(this.now());
    const tombstoneIds = [...new Set(current.filter((event) => !event.bodyAvailable
      && Date.parse(tombstoneExpiry.get(this.#eventObjectKey(event)) ?? event.committedAt) > now).map((event) => event.objectId))]
      .sort((left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
    return { highWater, earliestReplayableSequence, liveEvents, tombstoneIds };
  }

  compactEvents(now = this.now()): HostedEventCompactionResult {
    const cutoff = Date.parse(now) - 37 * 24 * 60 * 60 * 1_000;
    let compactedEvents = 0;
    let reconciliationSnapshots = 0;
    for (const roomId of [...new Set([...this.#events.keys(), ...this.#eventHighWater.keys()])].sort()) {
      this.#purgeExpiredTerminalReconciliation(roomId, now);
      const events = this.#events.get(roomId) ?? [];
      const expired = events.filter((event) => Date.parse(event.committedAt) < cutoff);
      if (expired.length === 0) continue;
      const expiredIds = new Set(expired.map((event) => event.eventId));
      const retained = events.filter((event) => !expiredIds.has(event.eventId));
      const current = [...(this.#eventReconciliation.get(roomId)?.values() ?? [])]
        .filter((event) => event.bodyAvailable && expiredIds.has(event.eventId))
        .sort((left, right) => {
          const leftKey = `${left.objectType}\u0000${left.objectId}`;
          const rightKey = `${right.objectType}\u0000${right.objectId}`;
          return Buffer.compare(Buffer.from(leftKey, "utf8"), Buffer.from(rightKey, "utf8"));
        });
      for (const latest of current) {
        const sequence = (this.#eventHighWater.get(roomId) ?? 0) + 1;
        const snapshot = validateRoomEventV1({
          ...latest,
          eventId: this.nextId("event"),
          sequence,
          committedAt: now,
        });
        retained.push(snapshot);
        this.#eventHighWater.set(roomId, sequence);
        this.#rememberReconciliationEvent(snapshot);
        reconciliationSnapshots += 1;
      }
      retained.sort((left, right) => left.sequence - right.sequence);
      this.#events.set(roomId, retained);
      compactedEvents += expired.length;
    }
    return { compactedEvents, reconciliationSnapshots };
  }

  notification(interactionId: string): StoredNotification {
    return clone(this.#notifications.get(interactionId) ?? {
      endpoint: {
        schemaVersion: "notification_endpoint.v1",
        interactionId,
        state: "absent",
        encryptedAddress: null,
        redactedMarker: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
        verificationSendsThisHour: 0,
        confirmedAt: null,
        version: 1,
      },
      syntheticPlaintextAddress: null,
      challengeId: null,
    });
  }

  saveRoom(room: StoredRoom): void {
    validateRoomV1(room.room);
    this.#rooms.set(room.room.roomId, clone(room));
  }

  saveProjection(projection: StoredProjection): void {
    validateProjectionCapsuleV1(projection.projection);
    validateProjectionLifecycleV1(projection.lifecycle);
    this.#projections.set(projection.projection.projectionId, clone(projection));
  }

  saveInteraction(interaction: StoredInteraction): void {
    validateInteractionV1(interaction.interaction);
    if (interaction.response) validateResponseV1(interaction.response, interaction.interaction);
    this.#interactions.set(interaction.interaction.interactionId, clone(interaction));
  }

  saveCapability(capability: StoredCapability): void {
    if (capability.kind === "public_encounter") validatePublicEncounterV1(capability.value);
    if (capability.kind === "grant") validateGrantV1(capability.value);
    if (capability.kind === "agent_derivative") validateAgentDerivativeV1(capability.value);
    this.#capabilities.set(capabilityId(capability), clone(capability));
  }

  saveRoomOperatorBinding(binding: StoredRoomOperatorBinding): void {
    if (
      binding.schemaVersion !== "synthetic_room_operator_binding.v1"
      || !/^binding_[A-Za-z0-9_-]{16,128}$/u.test(binding.bindingId)
      || !/^room_[A-Za-z0-9_-]{16,128}$/u.test(binding.roomId)
      || !/^sha256:[a-f0-9]{64}$/u.test(binding.secretDigest)
      || !Number.isFinite(Date.parse(binding.pairedAt))
      || !Number.isFinite(Date.parse(binding.expiresAt))
      || Date.parse(binding.expiresAt) <= Date.parse(binding.pairedAt)
      || (binding.state === "active" && binding.revokedAt !== null)
      || (binding.state === "revoked" && binding.revokedAt === null)
      || !Number.isSafeInteger(binding.version)
      || binding.version < 1
    ) throw new Error("invalid synthetic Room operator binding");
    this.#roomOperatorBindings.set(binding.bindingId, clone(binding));
  }

  savePairingChallenge(pairing: StoredPairingChallenge): void {
    if (
      pairing.schemaVersion !== "synthetic_pairing_challenge.v1"
      || !/^pairing_[A-Za-z0-9_-]{16,128}$/u.test(pairing.pairingId)
      || !/^room_[A-Za-z0-9_-]{16,128}$/u.test(pairing.roomId)
      || !/^sha256:[a-f0-9]{64}$/u.test(pairing.pairingCodeDigest)
      || !Number.isFinite(Date.parse(pairing.issuedAt))
      || !Number.isFinite(Date.parse(pairing.expiresAt))
      || Date.parse(pairing.expiresAt) <= Date.parse(pairing.issuedAt)
      || !Number.isSafeInteger(pairing.version)
      || pairing.version < 1
      || (pairing.state === "issued" && (
        pairing.clientPublicKeyHash !== null
        || pairing.bindingId !== null
        || pairing.exchangeResponse !== null
      ))
      || (pairing.state === "exchanged" && (
        !pairing.clientPublicKeyHash
        || !pairing.bindingId
        || !pairing.exchangeResponse
      ))
      || (pairing.state === "expired" && pairing.exchangeResponse !== null)
    ) throw new Error("invalid synthetic pairing challenge");
    this.#pairingChallenges.set(pairing.pairingId, clone(pairing));
  }

  saveNotification(notification: StoredNotification): void {
    validateNotificationEndpointV1(notification.endpoint);
    this.#notifications.set(notification.endpoint.interactionId, clone(notification));
  }

  appendEvent(roomId: string, eventType: string, objectId: string, objectVersion: number): HostedEvent {
    const events = this.#events.get(roomId) ?? [];
    const objectType = eventObjectType(eventType);
    const bodyAvailable = eventBodyAvailable(eventType);
    let payloadHash = canonicalSha256({
      schemaVersion: "room_event_payload.v1",
      roomId,
      objectType,
      objectId,
      eventType,
      objectVersion,
      bodyAvailable,
    });
    if (objectType === "response") {
      for (const stored of this.#interactions.values()) {
        if (stored.response?.responseId === objectId) payloadHash = stored.response.candidateHash;
      }
    }
    const event = validateRoomEventV1({
      schemaVersion: "room_event.v1",
      eventId: this.nextId("event"),
      roomId,
      sequence: (this.#eventHighWater.get(roomId) ?? 0) + 1,
      objectType,
      objectId,
      eventType,
      objectVersion,
      payloadHash,
      committedAt: this.now(),
      bodyAvailable,
    });
    events.push(event);
    this.#events.set(roomId, events);
    this.#eventHighWater.set(roomId, event.sequence);
    this.#rememberReconciliationEvent(event);
    return clone(event);
  }

  #rememberReconciliationEvent(event: HostedEvent): void {
    const current = this.#eventReconciliation.get(event.roomId) ?? new Map<string, HostedEvent>();
    const key = this.#eventObjectKey(event);
    current.set(key, clone(event));
    this.#eventReconciliation.set(event.roomId, current);
    const expiries = this.#eventTerminalExpiresAt.get(event.roomId) ?? new Map<string, string>();
    if (event.bodyAvailable) expiries.delete(key);
    else expiries.set(key, this.#terminalReconciliationExpiry(event));
    this.#eventTerminalExpiresAt.set(event.roomId, expiries);
  }

  #eventObjectKey(event: HostedEvent): string {
    return `${event.objectType}\u0000${event.objectId}`;
  }

  #terminalReconciliationExpiry(event: HostedEvent): string {
    if (event.objectType === "interaction") {
      const interaction = this.#interactions.get(event.objectId);
      if (interaction) return timestampAfter(interaction.interaction.expiresAt, 7 * 24 * 60 * 60 * 1_000);
    }
    return timestampAfter(event.committedAt, 37 * 24 * 60 * 60 * 1_000);
  }

  #purgeExpiredTerminalReconciliation(roomId: string, now: string): void {
    const current = this.#eventReconciliation.get(roomId);
    const expiries = this.#eventTerminalExpiresAt.get(roomId);
    if (!current || !expiries) return;
    for (const [key, expiresAt] of expiries) {
      if (Date.parse(now) < Date.parse(expiresAt)) continue;
      const event = current.get(key);
      if (event && !event.bodyAvailable) current.delete(key);
      expiries.delete(key);
    }
  }

  idempotency(actor: string, operation: string, key: string): StoredOperationResult | null {
    const mapKey = `${actor}\u0000${operation}\u0000${key}`;
    const value = this.#normalizeIdempotency(mapKey);
    return value ? clone(value) : null;
  }

  #normalizeIdempotency(mapKey: string): StoredOperationResult | null {
    let value = this.#operations.get(mapKey);
    if (value && Date.parse(value.retentionExpiresAt) <= Date.parse(this.now())) {
      this.#operations.delete(mapKey);
      return null;
    }
    if (
      value?.sensitiveUntil
      && Date.parse(value.sensitiveUntil) <= Date.parse(this.now())
      && value.expiredBody
      && value.expiredStatus !== null
    ) {
      value = {
        ...value,
        status: value.expiredStatus,
        body: value.expiredBody,
        sensitiveUntil: null,
        expiredStatus: null,
        expiredBody: null,
      };
      this.#operations.set(mapKey, clone(value));
    }
    return value ?? null;
  }

  idempotencyEntries(): StoredOperationResult[] {
    for (const pairingId of this.#pairingChallenges.keys()) this.pairingChallenge(pairingId);
    return [...this.#operations.keys()]
      .map((key) => this.#normalizeIdempotency(key))
      .filter((value): value is StoredOperationResult => value !== null)
      .map(clone);
  }

  saveIdempotency(actor: string, operation: string, key: string, result: StoredOperationResult): void {
    this.#operations.set(`${actor}\u0000${operation}\u0000${key}`, clone(result));
  }

  auxiliary(key: string): Record<string, unknown> | null {
    const value = this.#auxiliary.get(key);
    return value ? clone(value) : null;
  }

  auxiliaryEntries(prefix: string): Array<[string, Record<string, unknown>]> {
    return [...this.#auxiliary.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key, clone(value)]);
  }

  saveAuxiliary(key: string, value: Record<string, unknown>): void {
    this.#auxiliary.set(key, clone(value));
  }

  publicAcceptedCountSince(roomId: string, sinceExclusive: string): number {
    const cutoff = Date.parse(sinceExclusive);
    return [...(this.#publicAccepted.get(roomId)?.values() ?? [])]
      .filter((acceptedAt) => Date.parse(acceptedAt) > cutoff)
      .length;
  }

  recordPublicAccepted(roomId: string, interactionId: string, acceptedAt: string): void {
    const accepted = this.#publicAccepted.get(roomId) ?? new Map<string, string>();
    accepted.set(interactionId, acceptedAt);
    this.#publicAccepted.set(roomId, accepted);
  }

  #seed(): void {
    const now = this.now();
    const freshUntil = timestampAfter(now, 24 * 60 * 60 * 1000);
    const expiresAt = timestampAfter(now, 7 * 24 * 60 * 60 * 1000);
    const entityId = "entity_forme000000000000000000000000";
    const publicProjectionId = "proj_formepublic00000000000000000000";
    const privateProjectionId = "proj_formeprivate0000000000000000000";
    const publicRoom: RoomV1 = {
      schemaVersion: "room.v1",
      roomId: SYNTHETIC_PUBLIC_ROOM_ID,
      entityId,
      roomKind: "third_place_public",
      interactionMode: "public_single",
      status: "active",
      currentProjectionId: publicProjectionId,
      version: 1,
      createdAt: now,
      retiredAt: null,
    };
    const privateRoom: RoomV1 = {
      schemaVersion: "room.v1",
      roomId: SYNTHETIC_PRIVATE_ROOM_ID,
      entityId,
      roomKind: "private_grant_only",
      interactionMode: "invite_only",
      status: "active",
      currentProjectionId: privateProjectionId,
      version: 1,
      createdAt: now,
      retiredAt: null,
    };
    this.saveRoom({ room: publicRoom, label: "Forme Project Room" });
    this.saveRoom({ room: privateRoom, label: "Forme Private Room" });
    this.saveProjection(this.#projectionFixture(publicRoom, publicProjectionId, "Forme", [
      "Forme helps a project remember, interpret, act with bounded authority, and meet collaborators without publishing its private Twin.",
    ], "admitted", now, freshUntil, expiresAt));
    this.saveProjection(this.#projectionFixture(privateRoom, privateProjectionId, "Forme — private collaborator projection", [
      "This synthetic Private Room proves that public familiarity never implies private access.",
    ], "not_admitted", now, freshUntil, expiresAt));
    const bindingExpiresAt = timestampAfter(now, 30 * 24 * 60 * 60 * 1000);
    this.saveRoomOperatorBinding({
      schemaVersion: "synthetic_room_operator_binding.v1",
      bindingId: SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID,
      roomId: publicRoom.roomId,
      secretDigest: this.digestSecret(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET),
      state: "active",
      pairedAt: now,
      expiresAt: bindingExpiresAt,
      revokedAt: null,
      version: 1,
    });
    this.saveRoomOperatorBinding({
      schemaVersion: "synthetic_room_operator_binding.v1",
      bindingId: SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID,
      roomId: privateRoom.roomId,
      secretDigest: this.digestSecret(SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET),
      state: "active",
      pairedAt: now,
      expiresAt: bindingExpiresAt,
      revokedAt: null,
      version: 1,
    });
  }

  #projectionFixture(
    room: RoomV1,
    projectionId: string,
    title: string,
    claimTexts: string[],
    curationState: ProjectionLifecycleV1["curationState"],
    publishedAt: string,
    freshUntil: string,
    expiresAt: string,
  ): StoredProjection {
    const claims: ProjectionCapsuleV1["claims"] = claimTexts.map((text) => ({
      slot: "now",
      text,
      attribution: "owner_confirmed",
      uncertainty: null,
    }));
    const projection = projectionWithPayloadHash({
      schemaVersion: "projection_capsule.v1",
      projectionId,
      roomId: room.roomId,
      entityId: room.entityId,
      title,
      thirdPlaceSummary: room.roomKind === "third_place_public"
        ? "A shallow, current projection of the Living Project Twin."
        : "Only an exact Room and Projection Grant may reveal this Projection.",
      claims,
      supportedInteractions: ["ask", "seed", "resonance"],
      allowedTopics: ["Forme", "R4"],
      unavailableTopics: ["private source bodies"],
      expectedResponseLatency: "Owner-reviewed and asynchronous",
      visualThemeToken: "forme_clean_v1",
      agencyStatement: "A local Forme Agent may prepare a candidate after explicit Owner start.",
      nonCommitmentStatement: "This Projection cannot commit the Owner.",
      disclosureBasisId: this.nextId("basis"),
      publicationAttestationId: this.nextId("att"),
      publishedAt,
      freshUntil,
      expiresAt,
    });
    const lifecycle: ProjectionLifecycleV1 = {
      schemaVersion: "projection_lifecycle.v1",
      projectionId,
      ownerState: "published_fresh",
      curationState,
      current: true,
      version: 1,
      changedAt: publishedAt,
    };
    return { projection, lifecycle };
  }
}

export function operationReceipt(
  store: HostedPresenceStore,
  operation: string,
  targetId: string,
  targetVersion: number,
  requestHash: `sha256:${string}`,
  idempotencyKey: string,
  actorClass: ApiActorClass,
  status: OperationReceiptV1["status"] = "committed",
): OperationReceiptV1 {
  return validateOperationReceiptV1({
    schemaVersion: "operation_receipt.v1",
    receiptId: store.nextId("receipt"),
    actorClass,
    action: operation,
    idempotencyKey,
    canonicalRequestHash: requestHash,
    targetId,
    targetVersion,
    status,
    committedAt: store.now(),
    bodyFreeCode: status === "committed" ? "committed" : status,
  });
}

export function replaceEncounter(
  stored: Extract<StoredCapability, { kind: "public_encounter" }>,
  patch: Partial<PublicEncounterV1>,
): Extract<StoredCapability, { kind: "public_encounter" }> {
  return { ...stored, value: { ...stored.value, ...patch } };
}

export function replaceGrant(
  stored: Extract<StoredCapability, { kind: "grant" }>,
  patch: Partial<GrantV1>,
): Extract<StoredCapability, { kind: "grant" }> {
  return { ...stored, value: { ...stored.value, ...patch } };
}

export function replaceDerivative(
  stored: Extract<StoredCapability, { kind: "agent_derivative" }>,
  patch: Partial<AgentDerivativeV1>,
): Extract<StoredCapability, { kind: "agent_derivative" }> {
  return { ...stored, value: { ...stored.value, ...patch } };
}
