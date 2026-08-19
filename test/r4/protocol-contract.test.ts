import assert from "node:assert/strict";
import test from "node:test";
import {
  assessProjectionBasisClaim,
  canonicalJson,
  canonicalSha256,
  canTransitionCuration,
  canTransitionNotice,
  deriveGrantUse,
  deriveProjectionRead,
  derivePublicEncounterUse,
  effectiveExpiry,
  GOLDEN_CANDIDATE,
  GOLDEN_CONSENT,
  GOLDEN_GRANT,
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_BASIS,
  GOLDEN_PROJECTION_LIFECYCLE,
  GOLDEN_PUBLIC_ENCOUNTER,
  GOLDEN_RESPONSE,
  GOLDEN_RESPONSE_PUBLICATION,
  GOLDEN_ROOM,
  GOLDEN_SESSION,
  GOLDEN_SYNTHETIC_FIXTURES,
  GOLDEN_VECTOR_RESULTS,
  GRANT_PRESETS,
  grantExpiryForPreset,
  isSessionEnvelopeConsentSubset,
  parseStrictJson,
  resolveResponseTerminal,
  validateConsentEnvelopeV1,
  validateGrantV1,
  validateProjectionBasisV1,
  validateResponseCandidateV1,
  validateResponsePublicationV1,
  validateResponseV1,
  validateRoomV1,
  validateSessionEnvelopeV1,
  verifyGoldenVectors,
  type GrantPresetId,
  type GrantV1,
  type ProjectionBasisClaimV1,
  type ProjectionLifecycleV1,
  type RoomV1,
  type SessionEnvelopeV1,
} from "../../packages/r4-protocol/src/index.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const BEFORE_EXPIRY = "2026-08-03T12:01:00.000Z";

test("strict canonical JSON rejects duplicate keys, non-NFC, non-finite, surrogates, and non-JSON values", () => {
  assert.equal(canonicalJson(parseStrictJson('{"a":1,"b":[true,null]}')), '{"a":1,"b":[true,null]}');
  assert.throws(() => parseStrictJson('{"a":1,"a":2}'), /duplicate object key/u);
  assert.throws(() => parseStrictJson('{"text":"Café"}'), /NFC-normalized/u);
  assert.throws(() => parseStrictJson("1e9999"), /finite/u);
  assert.throws(() => canonicalJson({ value: Number.NaN }), /finite/u);
  assert.throws(() => canonicalJson({ value: Number.POSITIVE_INFINITY }), /finite/u);
  assert.throws(() => canonicalJson({ value: undefined }), /undefined/u);
  assert.throws(() => canonicalJson({ value: "\ud800" }), /unpaired high surrogate/u);
  assert.equal(canonicalJson({ z: -0, a: "ok" }), '{"a":"ok","z":0}');
});

test("golden fixture canonical hash is pinned and validators reject unknown fields", () => {
  assert.doesNotThrow(() => verifyGoldenVectors());
  assert.equal(
    GOLDEN_VECTOR_RESULTS.canonicalFixtureHash,
    "sha256:2b852e34066066af2119760bee7d5749b4f89dbb634a7851fa4ce2831c754d5e",
  );
  assert.equal(canonicalSha256(GOLDEN_SYNTHETIC_FIXTURES), GOLDEN_VECTOR_RESULTS.canonicalFixtureHash);
  assert.equal(canonicalJson(GOLDEN_SYNTHETIC_FIXTURES), GOLDEN_VECTOR_RESULTS.canonicalFixtureJson);
  assert.doesNotThrow(() => validateRoomV1(GOLDEN_ROOM));
  assert.throws(() => validateRoomV1({ ...GOLDEN_ROOM, ambientAuthority: true }), /field is not allowed/u);
  assert.throws(() => validateConsentEnvelopeV1({ ...GOLDEN_CONSENT, provider: "Another" }), /P0 provider is OpenAI/u);
});

test("Response source disclosure is a system-derived closed provenance class", () => {
  assert.doesNotThrow(() => validateResponseCandidateV1(GOLDEN_CANDIDATE));
  assert.doesNotThrow(() => validateResponsePublicationV1(GOLDEN_RESPONSE_PUBLICATION));
  assert.doesNotThrow(() => validateResponseV1(GOLDEN_RESPONSE, GOLDEN_SYNTHETIC_FIXTURES.interaction));
  for (const invalid of ["manual_owner_only", "owner_verified_private_sources", "synthetic_free_text"]) {
    assert.throws(() => validateResponseCandidateV1({ ...GOLDEN_CANDIDATE, sourceDisclosureClass: invalid }), /expected one of/u);
    assert.throws(() => validateResponsePublicationV1({ ...GOLDEN_RESPONSE_PUBLICATION, sourceDisclosureClass: invalid }), /expected one of/u);
    assert.throws(() => validateResponseV1({ ...GOLDEN_RESPONSE, sourceDisclosureClass: invalid }, GOLDEN_SYNTHETIC_FIXTURES.interaction), /expected one of/u);
  }
  assert.throws(() => validateResponseCandidateV1({
    ...GOLDEN_CANDIDATE,
    sourceDisclosureClass: "manual_owner_authored",
  }), /manual candidate cannot claim/iu);
  assert.throws(() => validateResponseCandidateV1({
    ...GOLDEN_CANDIDATE,
    sessionEnvelopeId: null,
    snapshotManifestHash: null,
  }), /Fresh candidate requires/iu);
});

test("public/private read and Third Place admission matrix preserves direct-read but gates discovery/intake", () => {
  const lifecycle = (overrides: Partial<ProjectionLifecycleV1> = {}): ProjectionLifecycleV1 => ({
    ...GOLDEN_PROJECTION_LIFECYCLE,
    ...overrides,
  });
  const room = (overrides: Partial<RoomV1> = {}): RoomV1 => ({ ...GOLDEN_ROOM, ...overrides });

  assert.equal(deriveProjectionRead(room(), GOLDEN_PROJECTION, lifecycle(), { kind: "public" }, T0).allowed, true);
  assert.equal(deriveProjectionRead(room(), GOLDEN_PROJECTION, lifecycle({ curationState: "not_admitted" }), { kind: "public" }, T0).allowed, true);
  assert.equal(deriveProjectionRead(room(), GOLDEN_PROJECTION, lifecycle({ curationState: "unlisted" }), { kind: "public" }, T0).allowed, true);
  assert.deepEqual(deriveProjectionRead(room(), GOLDEN_PROJECTION, lifecycle({ ownerState: "stale" }), { kind: "public" }, T0), {
    allowed: true,
    code: "projection_stale_read",
    warning: "stale_projection",
  });
  for (const state of ["superseded", "revoked", "expired"] as const) {
    assert.equal(deriveProjectionRead(room(), GOLDEN_PROJECTION, lifecycle({ ownerState: state }), { kind: "public" }, T0).allowed, false);
  }
  assert.equal(deriveProjectionRead(room({ status: "retired" }), GOLDEN_PROJECTION, lifecycle(), { kind: "public" }, T0).code, "room_retired");

  const privateRoom = room({ roomKind: "private_grant_only", interactionMode: "invite_only" });
  assert.equal(deriveProjectionRead(privateRoom, GOLDEN_PROJECTION, lifecycle(), { kind: "public" }, T0).code, "private_grant_required");
  assert.equal(deriveProjectionRead(privateRoom, GOLDEN_PROJECTION, lifecycle(), { kind: "grant", grant: GOLDEN_GRANT }, T0).allowed, true);

  assert.equal(derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, room(), GOLDEN_PROJECTION, lifecycle(), BEFORE_EXPIRY).allowed, true);
  assert.equal(derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, room(), GOLDEN_PROJECTION, lifecycle({ curationState: "unlisted" }), BEFORE_EXPIRY).code, "projection_not_publicly_eligible");
  assert.equal(canTransitionCuration("not_admitted", "admitted"), true);
  assert.equal(canTransitionCuration("unlisted", "admitted"), false, "P0 cannot re-admit the same unlisted version");
});

test("all four continuation presets have exact TTL/quota, accepted-only quota, and one-unresolved lock", () => {
  const expected: Record<GrantPresetId, { days: number; quota: number }> = {
    one_visit: { days: 1, quota: 1 },
    short_exchange: { days: 3, quota: 2 },
    familiar_collaborator: { days: 7, quota: 3 },
    trusted_collaborator: { days: 7, quota: 10 },
  };
  for (const [presetId, contract] of Object.entries(expected) as Array<[GrantPresetId, { days: number; quota: number }]>) {
    assert.equal(GRANT_PRESETS[presetId].acceptedQuota, contract.quota);
    assert.equal(GRANT_PRESETS[presetId].ttlMilliseconds, contract.days * 24 * 60 * 60 * 1_000);
    const expiresAt = grantExpiryForPreset(T0, presetId);
    assert.equal(Date.parse(expiresAt) - Date.parse(T0), contract.days * 24 * 60 * 60 * 1_000);
    const grant: GrantV1 = {
      ...GOLDEN_GRANT,
      presetId,
      acceptedQuota: contract.quota,
      acceptedCount: contract.quota - 1,
      expiresAt,
      unresolvedInteractionId: null,
    };
    assert.doesNotThrow(() => validateGrantV1(grant));
    assert.equal(deriveGrantUse(grant, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, BEFORE_EXPIRY, "submit").allowed, true);
    const exhausted = { ...grant, state: "consumed" as const, acceptedCount: contract.quota };
    assert.equal(deriveGrantUse(exhausted, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, BEFORE_EXPIRY, "read").allowed, true);
    assert.equal(deriveGrantUse(exhausted, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, BEFORE_EXPIRY, "submit").code, "grant_quota_exhausted");
    assert.equal(deriveGrantUse({ ...grant, unresolvedInteractionId: "interaction_unresolvedsynthetic0000000000" }, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, BEFORE_EXPIRY, "submit").code, "unresolved_interaction_exists");
  }
  assert.equal(effectiveExpiry("2026-08-05T00:00:00.000Z", "2026-08-04T00:00:00.000Z"), "2026-08-04T00:00:00.000Z");
});

test("Projection basis eligibility rejects superseded/inactive and non-executed effects while labeling rollback history", () => {
  const base = GOLDEN_PROJECTION_BASIS.claims[0]!;
  const assess = (overrides: Partial<ProjectionBasisClaimV1>) => assessProjectionBasisClaim({ ...base, ...overrides });
  assert.equal(assess({ sourceKind: "owner_frame", semanticStatus: "active", attribution: "owner_confirmed" }).allowed, true);
  assert.equal(assess({ sourceKind: "owner_frame", semanticStatus: "superseded", attribution: "owner_confirmed" }).allowed, false);
  assert.equal(assess({
    sourceKind: "inferred_reflection",
    semanticStatus: "active",
    attribution: "inferred_allowed",
    disclosureClass: "active_inference_with_uncertainty",
    transformationClass: "exact",
  }).warning, "inference_uncertainty_required");
  assert.equal(assess({ sourceKind: "r3_effect", semanticStatus: "proposed" }).allowed, false);
  assert.equal(assess({ sourceKind: "r3_effect", semanticStatus: "approved" }).allowed, false);
  assert.equal(assess({
    sourceKind: "r3_effect",
    semanticStatus: "executed_current",
    disclosureClass: "current_verified_effect",
    transformationClass: "transformed",
    claimText: "A bounded current effect.",
  }).allowed, true);
  assert.equal(assess({
    sourceKind: "r3_effect",
    semanticStatus: "rolled_back",
    disclosureClass: "exact_labeled_history",
    transformationClass: "transformed",
    claimText: "Historically this effect was executed and then rolled back.",
  }).warning, "must_be_labeled_historical");
  assert.equal(assess({ sourceKind: "r3_effect", semanticStatus: "executed_current" }).code, "current_effect_disclosure_invalid");
  assert.equal(assess({ sourceKind: "r3_effect", semanticStatus: "rolled_back" }).code, "rolled_back_disclosure_invalid");
  assert.equal(assess({
    sourceKind: "r3_effect",
    semanticStatus: "executed_current",
    attribution: "inferred_allowed",
    disclosureClass: "current_verified_effect",
    transformationClass: "transformed",
  }).allowed, false);
  assert.equal(assess({
    sourceKind: "r3_effect",
    semanticStatus: "rolled_back",
    attribution: "unresolved_allowed",
    disclosureClass: "exact_labeled_history",
    transformationClass: "transformed",
    claimText: "Historically this effect was executed and rolled back.",
  }).allowed, false);

  const eligibleBySource: ProjectionBasisClaimV1[] = [
    { ...base, sourceKind: "owner_frame", attribution: "owner_confirmed", disclosureClass: "current_owner_frame", transformationClass: "exact", semanticStatus: "active" },
    { ...base, sourceKind: "owner_unresolved", attribution: "unresolved_allowed", disclosureClass: "current_owner_unresolved", transformationClass: "exact", semanticStatus: "active" },
    { ...base, sourceKind: "owner_corrected_reflection", attribution: "owner_confirmed", disclosureClass: "active_owner_corrected_reflection", transformationClass: "exact", semanticStatus: "active" },
    { ...base, sourceKind: "inferred_reflection", attribution: "inferred_allowed", disclosureClass: "active_inference_with_uncertainty", transformationClass: "exact", semanticStatus: "active" },
    { ...base, sourceKind: "projection_owner_wording", attribution: "owner_confirmed", disclosureClass: "exact_owner_projection_wording", transformationClass: "owner_edited", semanticStatus: "active" },
  ];
  for (const eligible of eligibleBySource) {
    assert.equal(assessProjectionBasisClaim(eligible).allowed, true, eligible.sourceKind);
    for (const mutated of [
      { ...eligible, attribution: eligible.attribution === "owner_confirmed" ? "inferred_allowed" as const : "owner_confirmed" as const },
      { ...eligible, disclosureClass: "unbound-disclosure" },
      { ...eligible, transformationClass: eligible.transformationClass === "exact" ? "transformed" as const : "exact" as const },
      { ...eligible, semanticStatus: "invalidated" as const },
    ]) {
      assert.equal(assessProjectionBasisClaim(mutated).allowed, false, `${eligible.sourceKind}:${JSON.stringify(mutated)}`);
    }
  }

  assert.doesNotThrow(() => validateProjectionBasisV1(GOLDEN_PROJECTION_BASIS));
  const invalidBasis = structuredClone(GOLDEN_PROJECTION_BASIS);
  (invalidBasis.claims[0] as { semanticStatus: string }).semanticStatus = "superseded";
  assert.throws(() => validateProjectionBasisV1(invalidBasis), /owner_basis_ineligible/u);
});

test("Session Envelope must be a strict subset of consent; any scope, retention, or budget widening fails", () => {
  assert.equal(isSessionEnvelopeConsentSubset(GOLDEN_SESSION, GOLDEN_CONSENT).allowed, true);
  assert.doesNotThrow(() => validateSessionEnvelopeV1(GOLDEN_SESSION, GOLDEN_CONSENT));
  const changes: Array<{ patch: Partial<SessionEnvelopeV1>; code: string; consent?: typeof GOLDEN_CONSENT }> = [
    { patch: { consentEnvelopeId: "consent_different000000000000000000" }, code: "consent_envelope_mismatch" },
    { patch: { ownerAccountRegime: "wider-account" }, code: "provider_or_account_widened" },
    { patch: { guestCapsuleIncluded: true }, code: "guest_capsule_scope_widened", consent: { ...GOLDEN_CONSENT, guestCapsuleAllowed: false } },
    { patch: { providerRetentionDisclosureHash: `sha256:${"f".repeat(64)}` }, code: "retention_disclosure_changed" },
    {
      patch: { budget: { ...GOLDEN_SESSION.budget, outputTokens: 7_001 } },
      code: "session_budget_widened",
      consent: { ...GOLDEN_CONSENT, maximumBudget: { ...GOLDEN_CONSENT.maximumBudget, outputTokens: 7_000 } },
    },
  ];
  for (const item of changes) {
    const consent = item.consent ?? GOLDEN_CONSENT;
    const widened = {
      ...GOLDEN_SESSION,
      ...(item.consent ? { consentEnvelopeHash: canonicalSha256(consent) } : {}),
      ...item.patch,
    };
    assert.equal(isSessionEnvelopeConsentSubset(widened, consent).code, item.code);
    assert.throws(() => validateSessionEnvelopeV1(widened, consent), new RegExp(item.code, "u"));
  }
});

test("notification recovery and destructive terminal helpers are monotonic and race-explicit", () => {
  assert.equal(canTransitionNotice("ready_pending", "submitting"), true);
  assert.equal(canTransitionNotice("delivery_unknown", "submitting"), false);
  assert.equal(canTransitionNotice("delivery_unknown", "submitting", { providerProvedNotAccepted: true }), true);
  assert.equal(canTransitionNotice("canceled", "ready_pending", { handoffBegan: false }), true);
  assert.equal(canTransitionNotice("canceled", "ready_pending", { handoffBegan: true }), false);
  assert.equal(canTransitionNotice("provider_accepted", "submitting"), false);

  assert.equal(resolveResponseTerminal(["response_expired", "response_revoked"]), "response_revoked");
  assert.equal(resolveResponseTerminal(["origin_revoked", "interaction_deleted", "room_retired"]), "interaction_deleted");
  assert.equal(resolveResponseTerminal([]), null);
});
