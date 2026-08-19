import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBodyFree,
  assertCapabilityProbe,
  buildSyntheticCapabilityProbe,
  buildManualOwnerCandidate,
  candidateSessionReceipt,
  enforceSessionBudget,
  extractCandidateFromCompletedTurn,
  FakeResponseTransportGate,
  finalizeSyntheticFreshAdmission,
  manualOnlyReceipt,
  REQUIRED_DENIALS,
  sha256,
  SnapshotQueryBroker,
  SyntheticFreshAuthority,
  SyntheticHardCeilingTransportGate,
  type TrustedFreshAdmissionEvidenceV1,
  type FreshSessionEvent,
  type SessionBudget,
} from "../../packages/r4-local/src/index.ts";
import {
  canonicalJson,
  canonicalSha256,
  GOLDEN_INTERACTION,
  GOLDEN_SESSION,
  type InteractionV1,
  type SessionEnvelopeV1,
} from "../../packages/r4-protocol/src/index.ts";
import { INTERACTION_ID, NOW, syntheticSnapshot } from "./helpers.ts";

const START_HASH = sha256("start-authorization");
const ENVELOPE_HASH = sha256("session-envelope");
const MODEL = "synthetic-no-provider-model";
const OUTPUT_SCHEMA_HASH = sha256("response-candidate-output-schema");

function authorityWithCycle(): {
  authority: SyntheticFreshAuthority;
  reservationId: string;
} {
  const authority = new SyntheticFreshAuthority();
  authority.addInteraction(INTERACTION_ID);
  const cycle = authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: START_HASH,
    sessionEnvelopeHash: ENVELOPE_HASH,
    idempotencyKey: "cycle-key-synthetic-0001",
    now: NOW,
  });
  return { authority, reservationId: cycle.reservationId };
}

test("synthetic capability probe covers every physical denial and fails manual-only on ambiguity", () => {
  const valid = buildSyntheticCapabilityProbe({
    adapter: "synthetic-no-process",
    runtimeVersion: "0.0.0-test",
    probedAt: NOW.toISOString(),
  });
  assert.deepEqual(Object.keys(valid.denied).sort(), [...REQUIRED_DENIALS].sort());
  assert.doesNotThrow(() => assertCapabilityProbe(valid));
  assert.doesNotThrow(() => assertBodyFree(valid));

  for (const denial of REQUIRED_DENIALS) assert.equal(valid.denied[denial], true);
  assert.throws(() => assertCapabilityProbe({ ...valid, syntheticOnly: false }), /Gate A accepts only/u);
});

test("Fresh cycle reservation is one exact cycle: same-key retry is stable and envelope/start conflicts fail", () => {
  const { authority, reservationId } = authorityWithCycle();
  const retry = authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: START_HASH,
    sessionEnvelopeHash: ENVELOPE_HASH,
    idempotencyKey: "cycle-key-synthetic-0001",
    now: new Date(NOW.getTime() + 1_000),
  });
  assert.equal(retry.reservationId, reservationId);
  assert.throws(() => authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: sha256("different-start"),
    sessionEnvelopeHash: ENVELOPE_HASH,
    idempotencyKey: "cycle-key-synthetic-0002",
    now: NOW,
  }), /Fresh cycle conflict/u);
  assert.throws(() => authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: START_HASH,
    sessionEnvelopeHash: sha256("different-envelope"),
    idempotencyKey: "cycle-key-synthetic-0001",
    now: NOW,
  }), /Fresh cycle conflict/u);
});

test("proven zero-dispatch crash releases the slot for a newly reviewed start; unknown dispatch burns it", () => {
  const releasedHarness = authorityWithCycle();
  const released = releasedHarness.authority.releaseZeroDispatch(INTERACTION_ID, {
    reservationId: releasedHarness.reservationId,
    transportJournalDispatches: 0,
  });
  assert.equal(released.state, "released_zero_dispatch");
  const replacement = releasedHarness.authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: sha256("new-owner-review"),
    sessionEnvelopeHash: sha256("new-envelope"),
    idempotencyKey: "cycle-key-replacement",
    now: new Date(NOW.getTime() + 1_000),
  });
  assert.notEqual(replacement.reservationId, releasedHarness.reservationId);

  const burnedHarness = authorityWithCycle();
  const burned = burnedHarness.authority.burnUnknownDispatch(INTERACTION_ID, burnedHarness.reservationId, NOW);
  assert.equal(burned.state, "dispatch_committed");
  assert.throws(() => burnedHarness.authority.reserve({
    interactionId: INTERACTION_ID,
    startAuthorizationHash: sha256("retry-after-unknown"),
    sessionEnvelopeHash: ENVELOPE_HASH,
    idempotencyKey: "retry-after-unknown",
    now: NOW,
  }), /Fresh cycle conflict/u);
});

test("dispatch permit binds payload/session/provider/model/ordinal, expires in 30s, and is one-use", () => {
  const { authority, reservationId } = authorityWithCycle();
  const payload = "synthetic outbound payload—not sent";
  const payloadHash = sha256(payload);
  const permit = authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash,
    dispatchOrdinal: 1,
    idempotencyKey: "permit-key-synthetic-0001",
    now: NOW,
  });
  assert.equal(Date.parse(permit.expiresAt) - Date.parse(permit.issuedAt), 30_000);
  const retry = authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash,
    dispatchOrdinal: 1,
    idempotencyKey: "permit-key-synthetic-0001",
    now: new Date(NOW.getTime() + 5_000),
  });
  assert.equal(retry.permitId, permit.permitId);
  assert.throws(() => authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash: sha256("different"),
    dispatchOrdinal: 1,
    idempotencyKey: "permit-key-synthetic-0001",
    now: NOW,
  }), /idempotency conflict/u);
  assert.throws(() => authority.consumePermit({
    interactionId: INTERACTION_ID,
    permitId: permit.permitId,
    payloadHash,
    now: new Date(NOW.getTime() + 30_000),
  }), /expired/u);

  const consumed = authority.consumePermit({
    interactionId: INTERACTION_ID,
    permitId: permit.permitId,
    payloadHash,
    now: new Date(NOW.getTime() + 29_999),
  });
  assert.notEqual(consumed.consumedAt, null);
  assert.throws(() => authority.consumePermit({
    interactionId: INTERACTION_ID,
    permitId: permit.permitId,
    payloadHash,
    now: new Date(NOW.getTime() + 29_999),
  }), /already used/u);

  const transport = new FakeResponseTransportGate();
  transport.send({
    permit: consumed,
    payload,
    provider: "OpenAI",
    modelId: MODEL,
    inputTokens: 10,
    outputTokens: 5,
    applicableSpendUsd: 0.01,
  });
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0]?.payloadHash, payloadHash);
  assert.throws(() => transport.send({
    permit: consumed,
    payload,
    provider: "OpenAI",
    modelId: MODEL,
    inputTokens: 10,
    outputTokens: 5,
    applicableSpendUsd: 0.01,
  }), /already sent/u);
});

test("permit-vs-destructive terminal race honors whichever commits first without granting publication", () => {
  const destructiveFirst = authorityWithCycle();
  destructiveFirst.authority.commitTerminal(INTERACTION_ID, "deleted");
  assert.throws(() => destructiveFirst.authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId: destructiveFirst.reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash: sha256("payload"),
    dispatchOrdinal: 1,
    idempotencyKey: "destructive-first",
    now: NOW,
  }), /terminal state/u);

  const permitFirst = authorityWithCycle();
  const payload = "already disclosed exact payload";
  const permit = permitFirst.authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId: permitFirst.reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash: sha256(payload),
    dispatchOrdinal: 1,
    idempotencyKey: "permit-first-synthetic",
    now: NOW,
  });
  permitFirst.authority.commitTerminal(INTERACTION_ID, "revoked");
  const consumed = permitFirst.authority.consumePermit({
    interactionId: INTERACTION_ID,
    permitId: permit.permitId,
    payloadHash: sha256(payload),
    now: new Date(NOW.getTime() + 1_000),
  });
  assert.notEqual(consumed.consumedAt, null, "permit-first exact bytes remain disclosed/in-flight");
  assert.equal(permitFirst.authority.canPublish(INTERACTION_ID), false);
  assert.throws(() => permitFirst.authority.issuePermit({
    interactionId: INTERACTION_ID,
    reservationId: permitFirst.reservationId,
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    payloadHash: sha256("later payload"),
    dispatchOrdinal: 2,
    idempotencyKey: "later-send-synthetic",
    now: NOW,
  }), /terminal state/u);
});

const BUDGET: SessionBudget = {
  providerDispatches: 3,
  inputTokens: 128_000,
  outputTokens: 8_000,
  wallClockSeconds: 60 * 60,
  spend: { mode: "incremental", maximumUsd: 1 },
};

test("all Fresh dispatch/input/output/wall/spend ceilings fail before transport", () => {
  const base = {
    budget: BUDGET,
    preparedAt: NOW,
    now: new Date(NOW.getTime() + 1_000),
    previousDispatches: 0,
    previousInputTokens: 0,
    previousOutputTokens: 0,
    previousSpendUsd: 0,
    nextInputTokens: 1,
    nextMaxOutputTokens: 1,
    nextWorstCaseSpendUsd: 0.01,
  };
  assert.doesNotThrow(() => enforceSessionBudget(base));
  assert.throws(() => enforceSessionBudget({ ...base, previousDispatches: 3 }), /dispatch budget/u);
  assert.throws(() => enforceSessionBudget({ ...base, previousInputTokens: 128_000 }), /input budget/u);
  assert.throws(() => enforceSessionBudget({ ...base, previousOutputTokens: 8_000 }), /output budget/u);
  assert.throws(() => enforceSessionBudget({ ...base, now: new Date(NOW.getTime() + BUDGET.wallClockSeconds * 1_000) }), /wall budget/u);
  assert.throws(() => enforceSessionBudget({ ...base, previousSpendUsd: 1 }), /spend budget/u);
});

function validEvents(candidateText: string): FreshSessionEvent[] {
  return [
    { type: "thread_started", threadId: "thr_fresh01", turnId: null, provider: "OpenAI", model: MODEL },
    { type: "turn_started", threadId: "thr_fresh01", turnId: "trn_fresh01" },
    {
      type: "item_completed",
      threadId: "thr_fresh01",
      turnId: "trn_fresh01",
      item: { itemType: "agent_message", phase: "final_answer", text: candidateText },
    },
    { type: "turn_completed", threadId: "thr_fresh01", turnId: "trn_fresh01", turnStatus: "completed" },
  ];
}

test("candidate extraction admits exactly one authorized completed final and rejects ambiguity/failure", async (t) => {
  const interaction = structuredClone(GOLDEN_INTERACTION);
  const session: SessionEnvelopeV1 = { ...structuredClone(GOLDEN_SESSION), modelId: MODEL };
  const sessionHash = canonicalSha256(session);
  const encoded = canonicalJson({ responseText: "System-bound Fresh response." });
  const baseEvents = validEvents(encoded);
  const admissionBroker = new SnapshotQueryBroker(syntheticSnapshot(), Buffer.alloc(32, 8));
  const hardGate = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_extraction000000001",
    preparedAt: NOW,
    budget: BUDGET,
    interactionId: interaction.interactionId,
    sessionEnvelopeId: session.sessionEnvelopeId,
    sessionEnvelopeHash: sessionHash,
    startAuthorizationHash: START_HASH,
    policyHash: session.sourcePolicyHash,
    outputSchemaHash: session.outputSchemaHash,
    snapshotBroker: admissionBroker,
  });
  const transportReservation = hardGate.reserve({
    provider: "OpenAI",
    modelId: MODEL,
    endpointClass: "openai_responses",
    automaticRetryAttempt: false,
    fallbackRequested: false,
    priorTerminalFailure: false,
    usageKnown: true,
    spendKnown: true,
    now: NOW,
    nextInputTokens: 1_024,
    nextMaxOutputTokens: 5,
    nextWorstCaseSpendUsd: 0,
    payloadHash: sha256("exact-model-payload"),
    idempotencyKey: "dispatch_extraction0000001",
  });
  hardGate.consume({ reservationId: transportReservation.reservationId, payloadHash: transportReservation.payloadHash, now: NOW });
  admissionBroker.evaluate({ schemaVersion: "snapshot_search.v1", pattern: "one", patternKind: "literal" });
  const evidence = finalizeSyntheticFreshAdmission({
    transportGate: hardGate,
    events: baseEvents,
    processExitCode: 0,
    observedOutputSchemaHash: session.outputSchemaHash,
    snapshotBroker: admissionBroker,
    outputTokens: 5,
    applicableSpendUsd: 0,
    startedAt: NOW,
    completedAt: new Date(NOW.getTime() + 1_000),
  });
  const receipt = evidence.sessionReceipt;
  const extract = (
    events: FreshSessionEvent[],
    options: {
      evidence?: TrustedFreshAdmissionEvidenceV1;
      envelope?: SessionEnvelopeV1;
      interaction?: InteractionV1;
      originState?: InteractionV1["originStateAtAcceptance"];
    } = {},
  ) => extractCandidateFromCompletedTurn({
      events,
      authorizedThreadId: "thr_fresh01",
      authorizedTurnId: "trn_fresh01",
      expectedProvider: "OpenAI",
      expectedModel: MODEL,
      expectedOutputSchemaHash: session.outputSchemaHash,
      admissionEvidence: options.evidence ?? evidence,
      sessionEnvelope: options.envelope ?? session,
      expectedSessionEnvelopeHash: sessionHash,
      currentInteraction: options.interaction ?? interaction,
      currentOriginStateAtCompilation: options.originState ?? "published_fresh",
      currentTwinBasisHash: sha256("current-twin"),
      currentPolicyHash: session.sourcePolicyHash,
      admittedAt: new Date(NOW.getTime() + 2_000),
      expiresAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1_000),
    });
  const extracted = extract(validEvents(encoded));
  assert.equal(extracted.responseText, "System-bound Fresh response.");
  assert.equal(extracted.sourceDisclosureClass, "fresh_native_sanitized_snapshot_owner_reviewed");
  assert.equal(extracted.sessionReceiptHash, canonicalSha256(receipt));
  for (const originState of ["published_fresh", "stale", "superseded", "expired"] as const) {
    assert.equal(extract(validEvents(encoded), { originState }).originState, originState);
  }
  assert.throws(() => extract(validEvents(encoded), { originState: "revoked" }), /origin revoked/u);

  const cases: Array<{
    name: string;
    events: FreshSessionEvent[];
    options?: Parameters<typeof extract>[1];
  }> = [
    { name: "forged caller evidence", events: validEvents(encoded), options: { evidence: structuredClone(evidence) } },
    { name: "wrong thread", events: validEvents(encoded).map((event, index) => index === 2 ? { ...event, threadId: "thr_wrong01" } : event) },
    { name: "wrong turn", events: validEvents(encoded).map((event, index) => index === 1 ? { ...event, turnId: "trn_wrong01" } : event) },
    { name: "turn before thread", events: [validEvents(encoded)[1]!, validEvents(encoded)[0]!, ...validEvents(encoded).slice(2)] },
    { name: "duplicate final", events: [...validEvents(encoded).slice(0, 3), validEvents(encoded)[2]!, validEvents(encoded)[3]!] },
    { name: "missing final", events: [validEvents(encoded)[0]!, validEvents(encoded)[1]!, validEvents(encoded)[3]!] },
    { name: "interrupted", events: validEvents(encoded).map((event) => event.type === "turn_completed" ? { ...event, turnStatus: "interrupted" } : event) },
    { name: "failed tool", events: [...validEvents(encoded).slice(0, 2), { type: "tool_failed", threadId: "thr_fresh01", turnId: "trn_fresh01" }, ...validEvents(encoded).slice(2)] },
    { name: "rerouted", events: [...validEvents(encoded).slice(0, 2), { type: "model_rerouted", threadId: "thr_fresh01", turnId: "trn_fresh01", provider: "Other", model: MODEL }, ...validEvents(encoded).slice(2)] },
    { name: "final after completion", events: [validEvents(encoded)[0]!, validEvents(encoded)[1]!, validEvents(encoded)[3]!, validEvents(encoded)[2]!] },
    { name: "non JSON", events: validEvents("NOT JSON") },
    { name: "extra model authority", events: validEvents(canonicalJson({ responseText: "x", sourceDisclosureClass: "manual_owner_authored" })) },
    { name: "model claims full candidate", events: validEvents(canonicalJson(extracted)) },
    { name: "trailing junk", events: validEvents(`${encoded} trailing`) },
    { name: "duplicate JSON key", events: validEvents('{"responseText":"one","responseText":"two"}') },
    { name: "envelope drift", events: validEvents(encoded), options: { envelope: { ...session, modelId: "other-model" } } },
    { name: "manual Interaction cannot use Fresh", events: validEvents(encoded), options: { interaction: { ...interaction, consent: "manual_owner_only", consentEnvelope: null } } },
  ];
  for (const item of cases) {
    await t.test(item.name, () => {
      assert.throws(() => extract(item.events, item.options));
    });
  }
  const unresolvedBroker = new SnapshotQueryBroker(syntheticSnapshot(), Buffer.alloc(32, 9));
  const unresolvedGate = new SyntheticHardCeilingTransportGate({
    modelId: MODEL,
    cycleId: "cycle_unresolved000000001",
    preparedAt: NOW,
    budget: BUDGET,
    interactionId: interaction.interactionId,
    sessionEnvelopeId: session.sessionEnvelopeId,
    sessionEnvelopeHash: sessionHash,
    startAuthorizationHash: START_HASH,
    policyHash: session.sourcePolicyHash,
    outputSchemaHash: session.outputSchemaHash,
    snapshotBroker: unresolvedBroker,
  });
  unresolvedGate.reserve({
    provider: "OpenAI", modelId: MODEL, endpointClass: "openai_responses", automaticRetryAttempt: false,
    fallbackRequested: false, priorTerminalFailure: false, usageKnown: true, spendKnown: true, now: NOW,
    nextInputTokens: 1, nextMaxOutputTokens: 1, nextWorstCaseSpendUsd: 0, payloadHash: sha256("unresolved"),
    idempotencyKey: "dispatch_unresolved000001",
  });
  assert.throws(() => finalizeSyntheticFreshAdmission({
    transportGate: unresolvedGate,
    events: baseEvents,
    processExitCode: 0,
    observedOutputSchemaHash: session.outputSchemaHash,
    snapshotBroker: unresolvedBroker,
    outputTokens: 0,
    applicableSpendUsd: 0,
    startedAt: NOW,
    completedAt: NOW,
  }), /not fully consumed/u);
});

test("manual-only path records zero provider/model/usage and candidate receipt remains body/path-free", () => {
  const manualInteraction: InteractionV1 = {
    ...structuredClone(GOLDEN_INTERACTION),
    consent: "manual_owner_only",
    consentEnvelope: null,
  };
  const manual = manualOnlyReceipt({
    interactionId: manualInteraction.interactionId,
    completedAt: NOW,
    policyHash: sha256("manual-current-policy"),
  });
  assert.equal(manual.provider, null);
  assert.equal(manual.modelId, null);
  assert.equal(manual.dispatches, 0);
  assert.equal(manual.inputTokens, 0);
  assert.equal(manual.outputTokens, 0);
  assert.equal(manual.applicableSpendUsd, null);
  assert.equal(manual.sessionEnvelopeId, null);
  assert.equal(manual.sessionEnvelopeHash, null);
  assert.doesNotThrow(() => assertBodyFree(manual));
  const manualCandidate = buildManualOwnerCandidate({
    currentInteraction: manualInteraction,
    currentOriginStateAtCompilation: "published_fresh",
    sessionReceipt: manual,
    responseText: "Owner-authored response with no model participation.",
    currentTwinBasisHash: sha256("manual-current-twin"),
    currentPolicyHash: sha256("manual-current-policy"),
    admittedAt: new Date(NOW.getTime() + 1_000),
    expiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.equal(manualCandidate.sourceDisclosureClass, "manual_owner_authored");
  assert.equal(manualCandidate.sessionEnvelopeId, null);
  assert.equal(manualCandidate.snapshotManifestHash, null);
  assert.equal(manualCandidate.sessionReceiptHash, canonicalSha256(manual));
  for (const originState of ["published_fresh", "stale", "superseded", "expired"] as const) {
    assert.equal(buildManualOwnerCandidate({
      currentInteraction: manualInteraction,
      currentOriginStateAtCompilation: originState,
      sessionReceipt: manual,
      responseText: "Owner-authored response with no model participation.",
      currentTwinBasisHash: sha256("manual-current-twin"),
      currentPolicyHash: sha256("manual-current-policy"),
      admittedAt: new Date(NOW.getTime() + 1_000),
      expiresAt: new Date(NOW.getTime() + 60_000),
    }).originState, originState);
  }
  assert.throws(() => buildManualOwnerCandidate({
    currentInteraction: manualInteraction,
    currentOriginStateAtCompilation: "revoked",
    sessionReceipt: manual,
    responseText: "revoked must fail",
    currentTwinBasisHash: sha256("manual-current-twin"),
    currentPolicyHash: sha256("manual-current-policy"),
    admittedAt: new Date(NOW.getTime() + 1_000),
    expiresAt: new Date(NOW.getTime() + 60_000),
  }), /origin revoked/u);
  assert.throws(() => buildManualOwnerCandidate({
    currentInteraction: manualInteraction,
    currentOriginStateAtCompilation: "published_fresh",
    sessionReceipt: candidateSessionReceipt({
      interactionId: manualInteraction.interactionId,
      sessionEnvelopeId: GOLDEN_SESSION.sessionEnvelopeId,
      sessionEnvelopeHash: canonicalSha256(GOLDEN_SESSION),
      provider: "OpenAI",
      modelId: GOLDEN_SESSION.modelId,
      dispatches: 1,
      inputTokens: 1,
      outputTokens: 1,
      applicableSpendUsd: 0,
      policyHash: sha256("manual-current-policy"),
      schemaHash: GOLDEN_SESSION.outputSchemaHash,
      access: { queryCount: 0, resultCount: 0, resultBytes: 0, accessDigest: sha256("fresh-access") },
      startedAt: NOW,
      completedAt: NOW,
    }),
    responseText: "Fresh cannot claim manual.",
    currentTwinBasisHash: sha256("manual-current-twin"),
    currentPolicyHash: sha256("manual-current-policy"),
    admittedAt: new Date(NOW.getTime() + 1_000),
    expiresAt: new Date(NOW.getTime() + 60_000),
  }), /manual receipt/u);

  const access = {
    queryCount: 2,
    resultCount: 3,
    resultBytes: 120,
    accessDigest: sha256("path-bearing events aggregated with keyed digest"),
  };
  const receipt = candidateSessionReceipt({
    interactionId: INTERACTION_ID,
    sessionEnvelopeId: "session_freshsynthetic0001",
    sessionEnvelopeHash: ENVELOPE_HASH,
    provider: "OpenAI",
    modelId: MODEL,
    dispatches: 1,
    inputTokens: 100,
    outputTokens: 20,
    applicableSpendUsd: 0.02,
    policyHash: sha256("policy"),
    schemaHash: sha256("schema"),
    access,
    startedAt: new Date(NOW.getTime() - 1_000),
    completedAt: NOW,
  });
  assert.doesNotThrow(() => assertBodyFree(receipt));
  assert.doesNotMatch(JSON.stringify(receipt), /README|docs\/|Synthetic candidate body/u);
  assert.equal(receipt.accessEvidenceDigest, access.accessDigest);
  assert.equal(receipt.sourceQueryCount, access.queryCount);
  assert.equal(receipt.sourceResultBytes, access.resultBytes);
});
