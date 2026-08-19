import { addMilliseconds, compareTimestamps } from "./guards.ts";
import type {
  AgentDerivativeV1,
  CapabilityState,
  ConsentEnvelopeV1,
  CurationState,
  FreshCycleState,
  GrantOfferState,
  GrantPresetId,
  GrantV1,
  InteractionState,
  NoticeState,
  NotificationEndpointState,
  ProjectionBasisClaimV1,
  ProjectionCapsuleV1,
  ProjectionLifecycleV1,
  ProjectionOwnerState,
  PublicEncounterV1,
  ResponseState,
  RoomV1,
  SessionBudgetV1,
  SessionEnvelopeV1,
  UtcTimestamp,
} from "./types.ts";

export interface ProtocolDecision {
  readonly allowed: boolean;
  readonly code: string;
  readonly warning: string | null;
}

function allow(code = "allowed", warning: string | null = null): ProtocolDecision {
  return { allowed: true, code, warning };
}

function deny(code: string): ProtocolDecision {
  return { allowed: false, code, warning: null };
}

export const GRANT_PRESETS: Readonly<Record<GrantPresetId, { readonly ttlMilliseconds: number; readonly acceptedQuota: number }>> = {
  one_visit: { ttlMilliseconds: 24 * 60 * 60 * 1_000, acceptedQuota: 1 },
  short_exchange: { ttlMilliseconds: 3 * 24 * 60 * 60 * 1_000, acceptedQuota: 2 },
  familiar_collaborator: { ttlMilliseconds: 7 * 24 * 60 * 60 * 1_000, acceptedQuota: 3 },
  trusted_collaborator: { ttlMilliseconds: 7 * 24 * 60 * 60 * 1_000, acceptedQuota: 10 },
};

export function grantExpiryForPreset(issuedAt: UtcTimestamp, presetId: GrantPresetId): UtcTimestamp {
  return addMilliseconds(issuedAt, GRANT_PRESETS[presetId].ttlMilliseconds);
}

export function effectiveExpiry(...timestamps: readonly UtcTimestamp[]): UtcTimestamp {
  if (timestamps.length === 0) throw new TypeError("effectiveExpiry requires at least one timestamp");
  return timestamps.reduce((earliest, value) => compareTimestamps(value, earliest) < 0 ? value : earliest);
}

const PROJECTION_TRANSITIONS: Readonly<Record<ProjectionOwnerState, readonly ProjectionOwnerState[]>> = {
  published_fresh: ["stale", "superseded", "revoked", "expired"],
  stale: ["superseded", "revoked", "expired"],
  superseded: [],
  revoked: [],
  expired: [],
};

const CURATION_TRANSITIONS: Readonly<Record<CurationState, readonly CurationState[]>> = {
  not_admitted: ["admitted"],
  admitted: ["unlisted"],
  unlisted: [],
};

const GRANT_OFFER_TRANSITIONS: Readonly<Record<GrantOfferState, readonly GrantOfferState[]>> = {
  issued: ["accepted", "owner_revoked", "expired", "invalidated"],
  accepted: [],
  owner_revoked: [],
  expired: [],
  invalidated: [],
};

const INTERACTION_TRANSITIONS: Readonly<Record<InteractionState, readonly InteractionState[]>> = {
  accepted: ["seen_locally", "preparing", "response_ready", "closed_without_response", "interaction_expired", "interaction_deleted", "origin_revoked", "room_retired"],
  seen_locally: ["preparing", "response_ready", "closed_without_response", "interaction_expired", "interaction_deleted", "origin_revoked", "room_retired"],
  preparing: ["response_ready", "closed_without_response", "interaction_expired", "interaction_deleted", "origin_revoked", "room_retired"],
  response_ready: ["interaction_deleted", "origin_revoked", "room_retired"],
  closed_without_response: ["interaction_deleted", "origin_revoked", "room_retired"],
  interaction_expired: ["interaction_deleted", "origin_revoked", "room_retired"],
  interaction_deleted: [],
  origin_revoked: ["interaction_deleted", "room_retired"],
  room_retired: [],
};

const RESPONSE_TRANSITIONS: Readonly<Record<ResponseState, readonly ResponseState[]>> = {
  available: ["response_expired", "response_revoked", "origin_revoked", "interaction_deleted", "room_retired"],
  response_expired: ["origin_revoked", "interaction_deleted", "room_retired"],
  response_revoked: ["origin_revoked", "interaction_deleted", "room_retired"],
  origin_revoked: ["interaction_deleted", "room_retired"],
  interaction_deleted: ["room_retired"],
  room_retired: [],
};

const ENDPOINT_TRANSITIONS: Readonly<Record<NotificationEndpointState, readonly NotificationEndpointState[]>> = {
  absent: ["verification_pending"],
  verification_pending: ["confirmed", "cleared", "verification_pending"],
  confirmed: ["verification_pending", "cleared"],
  cleared: ["verification_pending"],
};

const NOTICE_TRANSITIONS: Readonly<Record<NoticeState, readonly NoticeState[]>> = {
  absent: ["ready_pending"],
  ready_pending: ["submitting", "canceled"],
  submitting: ["provider_accepted", "delivery_unknown", "failed"],
  canceled: ["ready_pending"],
  provider_accepted: [],
  delivery_unknown: ["submitting", "provider_accepted", "failed"],
  failed: [],
};

const FRESH_TRANSITIONS: Readonly<Record<FreshCycleState, readonly FreshCycleState[]>> = {
  unreserved: ["reserved"],
  reserved: ["dispatch_committed", "released_zero_dispatch"],
  dispatch_committed: [],
  released_zero_dispatch: [],
};

export function canTransitionProjection(from: ProjectionOwnerState, to: ProjectionOwnerState): boolean {
  return PROJECTION_TRANSITIONS[from].includes(to);
}

export function canTransitionCuration(from: CurationState, to: CurationState): boolean {
  return CURATION_TRANSITIONS[from].includes(to);
}

export function canTransitionGrantOffer(from: GrantOfferState, to: GrantOfferState): boolean {
  return GRANT_OFFER_TRANSITIONS[from].includes(to);
}

export function canTransitionInteraction(from: InteractionState, to: InteractionState): boolean {
  return INTERACTION_TRANSITIONS[from].includes(to);
}

export function canTransitionResponse(from: ResponseState, to: ResponseState): boolean {
  return RESPONSE_TRANSITIONS[from].includes(to);
}

export function canTransitionEndpoint(from: NotificationEndpointState, to: NotificationEndpointState): boolean {
  return ENDPOINT_TRANSITIONS[from].includes(to);
}

export function canTransitionNotice(
  from: NoticeState,
  to: NoticeState,
  context: { readonly providerProvedNotAccepted?: boolean; readonly handoffBegan?: boolean } = {},
): boolean {
  if (!NOTICE_TRANSITIONS[from].includes(to)) return false;
  if (from === "delivery_unknown" && to === "submitting") return context.providerProvedNotAccepted === true;
  if (from === "canceled" && to === "ready_pending") return context.handoffBegan !== true;
  return true;
}

export function canTransitionFreshCycle(from: FreshCycleState, to: FreshCycleState): boolean {
  return FRESH_TRANSITIONS[from].includes(to);
}

export function isInteractionUnresolved(state: InteractionState): boolean {
  return state === "accepted" || state === "seen_locally" || state === "preparing";
}

export function responseTerminalPrecedence(state: Exclude<ResponseState, "available">): number {
  switch (state) {
    case "interaction_deleted": return 1;
    case "room_retired": return 2;
    case "origin_revoked": return 3;
    case "response_revoked": return 4;
    case "response_expired": return 5;
  }
}

export function resolveResponseTerminal(
  states: readonly Exclude<ResponseState, "available">[],
): Exclude<ResponseState, "available"> | null {
  return states.reduce<Exclude<ResponseState, "available"> | null>((winner, state) => {
    if (winner === null || responseTerminalPrecedence(state) < responseTerminalPrecedence(winner)) return state;
    return winner;
  }, null);
}

function projectionScopeAligned(
  room: RoomV1,
  capsule: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
): boolean {
  return capsule.roomId === room.roomId
    && capsule.entityId === room.entityId
    && capsule.projectionId === lifecycle.projectionId;
}

function projectionIsCurrent(room: RoomV1, lifecycle: ProjectionLifecycleV1): boolean {
  return lifecycle.current && room.currentProjectionId === lifecycle.projectionId;
}

export function isThirdPlaceDiscoverable(
  room: RoomV1,
  capsule: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
  now: UtcTimestamp,
): boolean {
  return room.roomKind === "third_place_public" &&
    room.status === "active" &&
    projectionScopeAligned(room, capsule, lifecycle) &&
    projectionIsCurrent(room, lifecycle) &&
    lifecycle.ownerState === "published_fresh" &&
    lifecycle.curationState === "admitted" &&
    compareTimestamps(now, capsule.publishedAt) >= 0 &&
    compareTimestamps(now, capsule.freshUntil) < 0 &&
    compareTimestamps(now, capsule.expiresAt) < 0;
}

export function deriveProjectionRead(
  room: RoomV1,
  capsule: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
  access: { readonly kind: "public" } | { readonly kind: "grant"; readonly grant: GrantV1 },
  now: UtcTimestamp,
): ProtocolDecision {
  if (!projectionScopeAligned(room, capsule, lifecycle)) return deny("projection_scope_mismatch");
  if (compareTimestamps(now, capsule.publishedAt) < 0) return deny("projection_not_yet_published");
  if (compareTimestamps(now, capsule.expiresAt) >= 0) return deny("projection_expired");
  if (room.status === "retired") return deny("room_retired");
  if (!projectionIsCurrent(room, lifecycle) || lifecycle.ownerState === "superseded") return deny("projection_superseded");
  if (lifecycle.ownerState === "revoked") return deny("projection_revoked");
  if (lifecycle.ownerState === "expired") return deny("projection_expired");

  if (room.roomKind === "private_grant_only") {
    if (access.kind !== "grant") return deny("private_grant_required");
    const grantDecision = deriveGrantUse(access.grant, room, capsule, lifecycle, now, "read");
    if (!grantDecision.allowed) return grantDecision;
  }
  if (lifecycle.ownerState === "stale" || compareTimestamps(now, capsule.freshUntil) >= 0) return allow("projection_stale_read", "stale_projection");
  return allow("projection_readable");
}

export function deriveGrantUse(
  grant: GrantV1,
  room: RoomV1,
  capsule: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
  now: UtcTimestamp,
  operation: "read" | "submit",
): ProtocolDecision {
  if (!projectionScopeAligned(room, capsule, lifecycle)) return deny("projection_scope_mismatch");
  if (grant.roomId !== room.roomId || grant.projectionId !== capsule.projectionId || grant.projectionId !== lifecycle.projectionId) return deny("grant_scope_mismatch");
  if (grant.state !== "issued" && !(operation === "read" && grant.state === "consumed")) {
    return deny(grant.state === "consumed" ? "grant_quota_exhausted" : `grant_${grant.state}`);
  }
  if (compareTimestamps(now, grant.issuedAt) < 0) return deny("grant_not_yet_issued");
  if (compareTimestamps(now, grant.expiresAt) >= 0) return deny("grant_expired");
  if (compareTimestamps(now, capsule.publishedAt) < 0) return deny("projection_not_yet_published");
  if (compareTimestamps(now, capsule.expiresAt) >= 0) return deny("projection_expired");
  if (room.status !== "active") return deny("room_retired");
  if (!projectionIsCurrent(room, lifecycle)) return deny("projection_superseded");
  if (lifecycle.ownerState === "revoked" || lifecycle.ownerState === "superseded" || lifecycle.ownerState === "expired") {
    return deny(`projection_${lifecycle.ownerState}`);
  }
  if (operation === "read") {
    if (room.roomKind === "private_grant_only" && (lifecycle.ownerState === "stale" || compareTimestamps(now, capsule.freshUntil) >= 0)) {
      return allow("private_stale_read", "stale_projection");
    }
    return allow("grant_read");
  }
  if (room.interactionMode === "closed") return deny("room_closed");
  if (lifecycle.ownerState !== "published_fresh" || compareTimestamps(now, capsule.freshUntil) >= 0) return deny("projection_not_fresh");
  if (grant.acceptedCount >= grant.acceptedQuota) return deny("grant_quota_exhausted");
  if (grant.unresolvedInteractionId !== null) return deny("unresolved_interaction_exists");
  return allow("grant_submit");
}

export function derivePublicEncounterUse(
  encounter: PublicEncounterV1,
  room: RoomV1,
  capsule: ProjectionCapsuleV1,
  lifecycle: ProjectionLifecycleV1,
  now: UtcTimestamp,
): ProtocolDecision {
  if (!projectionScopeAligned(room, capsule, lifecycle)) return deny("projection_scope_mismatch");
  if (encounter.roomId !== room.roomId || encounter.projectionId !== capsule.projectionId || encounter.projectionId !== lifecycle.projectionId) return deny("encounter_scope_mismatch");
  if (encounter.state !== "issued") return deny(`encounter_${encounter.state}`);
  if (compareTimestamps(now, encounter.issuedAt) < 0) return deny("encounter_not_yet_issued");
  if (compareTimestamps(now, encounter.expiresAt) >= 0) return deny("encounter_expired");
  if (room.roomKind !== "third_place_public" || room.status !== "active" || room.interactionMode !== "public_single") {
    return deny("public_encounter_unavailable");
  }
  if (!isThirdPlaceDiscoverable(room, capsule, lifecycle, now)) return deny("projection_not_publicly_eligible");
  if (encounter.acceptedCount >= 1) return deny("encounter_consumed");
  if (encounter.unresolvedInteractionId !== null) return deny("unresolved_interaction_exists");
  return allow("public_encounter_submit");
}

export function deriveAgentDerivativeUse(
  derivative: AgentDerivativeV1,
  parentState: CapabilityState,
  now: UtcTimestamp,
  operation: "read" | "submit" = "submit",
): ProtocolDecision {
  if (derivative.state !== "issued") return deny(`derivative_${derivative.state}`);
  if (parentState !== "issued" && !(operation === "read" && parentState === "consumed")) {
    return deny("parent_capability_inactive");
  }
  if (compareTimestamps(now, derivative.issuedAt) < 0) return deny("derivative_not_yet_issued");
  if (compareTimestamps(now, derivative.expiresAt) >= 0) return deny("derivative_expired");
  if (derivative.acceptedCount >= 1) return deny("derivative_consumed");
  return allow(operation === "read" ? "agent_derivative_read" : "agent_derivative_submit");
}

export function assessProjectionBasisClaim(claim: ProjectionBasisClaimV1): ProtocolDecision {
  switch (claim.sourceKind) {
    case "owner_frame":
      return claim.semanticStatus === "active"
        && claim.attribution === "owner_confirmed"
        && claim.disclosureClass === "current_owner_frame"
        && claim.transformationClass === "exact"
        ? allow("owner_basis_eligible") : deny("owner_basis_ineligible");
    case "owner_unresolved":
      return claim.semanticStatus === "active"
        && claim.attribution === "unresolved_allowed"
        && claim.disclosureClass === "current_owner_unresolved"
        && claim.transformationClass === "exact"
        ? allow("owner_unresolved_eligible") : deny("owner_unresolved_ineligible");
    case "owner_corrected_reflection":
      return claim.semanticStatus === "active"
        && claim.attribution === "owner_confirmed"
        && claim.disclosureClass === "active_owner_corrected_reflection"
        && claim.transformationClass === "exact"
        ? allow("corrected_reflection_eligible") : deny("corrected_reflection_ineligible");
    case "inferred_reflection":
      return claim.semanticStatus === "active"
        && claim.attribution === "inferred_allowed"
        && claim.disclosureClass === "active_inference_with_uncertainty"
        && claim.transformationClass === "exact"
        ? allow("inferred_reflection_eligible", "inference_uncertainty_required")
        : deny("inferred_reflection_ineligible");
    case "r3_effect":
      if (claim.semanticStatus === "executed_current") {
        return claim.attribution === "owner_confirmed"
          && claim.disclosureClass === "current_verified_effect"
          && claim.transformationClass === "transformed"
          ? allow("current_effect_eligible")
          : deny("current_effect_disclosure_invalid");
      }
      if (claim.semanticStatus === "rolled_back") {
        const explicitlyHistorical = /histor(?:y|ically)|rolled back/iu.test(claim.claimText);
        return claim.attribution === "owner_confirmed"
          && claim.disclosureClass === "exact_labeled_history"
          && claim.transformationClass === "transformed"
          && explicitlyHistorical
          ? allow("rolled_back_history_only", "must_be_labeled_historical")
          : deny("rolled_back_disclosure_invalid");
      }
      return deny("effect_basis_ineligible");
    case "projection_owner_wording":
      return claim.semanticStatus === "active"
        && claim.attribution === "owner_confirmed"
        && claim.disclosureClass === "exact_owner_projection_wording"
        && claim.transformationClass === "owner_edited"
        ? allow("owner_wording_eligible") : deny("owner_wording_ineligible");
  }
}

export function isSessionBudgetSubset(session: SessionBudgetV1, consent: SessionBudgetV1): boolean {
  if (session.wallClockSeconds > consent.wallClockSeconds ||
    session.providerDispatches > consent.providerDispatches ||
    session.inputTokens > consent.inputTokens ||
    session.outputTokens > consent.outputTokens) return false;
  if (consent.spend.mode === "not_applicable") return session.spend.mode === "not_applicable";
  return session.spend.mode === "incremental" && session.spend.maximumUsd <= consent.spend.maximumUsd;
}

export function isSessionEnvelopeConsentSubset(session: SessionEnvelopeV1, consent: ConsentEnvelopeV1): ProtocolDecision {
  if (session.consentEnvelopeId !== consent.consentEnvelopeId) return deny("consent_envelope_mismatch");
  if (session.provider !== consent.provider || session.ownerAccountRegime !== consent.ownerAccountRegime) {
    return deny("provider_or_account_widened");
  }
  if (session.sourceClass !== consent.sourceClass || session.orientationClass !== consent.orientationClass) {
    return deny("source_scope_widened");
  }
  if (session.guestCapsuleIncluded && !consent.guestCapsuleAllowed) return deny("guest_capsule_scope_widened");
  if (session.providerRetentionDisclosureHash !== consent.providerRetentionDisclosureHash) {
    return deny("retention_disclosure_changed");
  }
  if (!isSessionBudgetSubset(session.budget, consent.maximumBudget)) return deny("session_budget_widened");
  return allow("session_is_consent_subset");
}

export function validateP0Budget(budget: SessionBudgetV1): ProtocolDecision {
  if (budget.wallClockSeconds <= 0 || budget.wallClockSeconds > 3_600) return deny("wall_clock_budget_exceeded");
  if (budget.providerDispatches < 0 || budget.providerDispatches > 3) return deny("dispatch_budget_exceeded");
  if (budget.inputTokens < 0 || budget.inputTokens > 128_000) return deny("input_token_budget_exceeded");
  if (budget.outputTokens < 0 || budget.outputTokens > 8_000) return deny("output_token_budget_exceeded");
  if (budget.spend.mode === "incremental" && (budget.spend.maximumUsd < 0 || budget.spend.maximumUsd > 1)) {
    return deny("spend_budget_exceeded");
  }
  return allow("budget_within_p0_ceiling");
}

export function projectionPayloadExpired(capsule: ProjectionCapsuleV1, now: UtcTimestamp): boolean {
  return compareTimestamps(now, capsule.expiresAt) >= 0;
}
