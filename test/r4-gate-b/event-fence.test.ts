import assert from "node:assert/strict";
import test from "node:test";
import {
  EventFenceError,
  MAX_CANDIDATE_BYTES,
  bodyFreeEventFenceEvidence,
  completedFixtureEvents,
  selectSyntheticCandidate,
} from "../../packages/r4-codex-adapter/src/event-fence.ts";
import type { FakeDispatchOutcome, SyntheticCodexEvent } from "../../packages/r4-codex-adapter/src/fake-transport.ts";

const THREAD_ID = "fixture_thread_abcdefghijklmnop";
const TURN_ID = "fixture_turn_abcdefghijklmnop";
const CANDIDATE = "FORME_PRIVATE_CANARY_synthetic_candidate";

function events(overrides: { candidateText?: string; inputTokens?: number; outputTokens?: number; spendUsd?: number } = {}) {
  return completedFixtureEvents({
    threadId: THREAD_ID,
    turnId: TURN_ID,
    candidateText: overrides.candidateText ?? CANDIDATE,
    inputTokens: overrides.inputTokens ?? 100,
    outputTokens: overrides.outputTokens ?? 20,
    spendUsd: overrides.spendUsd ?? 0.1,
  });
}

function outcome(value: readonly SyntheticCodexEvent[] = events(), replayed = false): FakeDispatchOutcome {
  return Object.freeze({
    outcome: "completed",
    reservationId: "reservation_abcdefghijklmnop",
    dispatchOrdinal: 1,
    replayed,
    events: Object.freeze([...value]),
  });
}

function select(value: FakeDispatchOutcome = outcome(), overrides: Partial<Parameters<typeof selectSyntheticCandidate>[0]> = {}) {
  return selectSyntheticCandidate({
    outcome: value,
    expectedThreadId: THREAD_ID,
    expectedTurnId: TURN_ID,
    fixtureExitCode: 0,
    fixtureStderrBytes: 0,
    journalFullyConsumed: true,
    maximumInputTokens: 128_000,
    reservedOutputTokens: 8_000,
    reservedSpendUsd: 1,
    ...overrides,
  });
}

function expectDenied(action: () => unknown): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof EventFenceError);
    assert.match(error.code, /^EVENT_[A-Z0-9_]+$/u);
    assert.equal(error.message, error.code);
    assert.doesNotMatch(error.stack ?? "", /FORME_PRIVATE_CANARY/u);
    return true;
  });
}

function mutate(index: number, change: Record<string, unknown>): readonly SyntheticCodexEvent[] {
  const value = structuredClone(events()) as Array<Record<string, unknown>>;
  value[index] = { ...value[index], ...change };
  return value;
}

test("only the exact completed fixture turn yields the synthetic candidate", () => {
  const selected = select();
  assert.equal(selected.candidateText, CANDIDATE);
  assert.equal(selected.inputTokens, 100);
  assert.equal(selected.outputTokens, 20);
  assert.equal(selected.spendUsd, 0.1);
  assert.equal(selected.eventCount, 5);
  assert.match(selected.candidateHash, /^sha256:[0-9a-f]{64}$/u);
  const evidence = bodyFreeEventFenceEvidence(selected);
  assert.equal(JSON.stringify(evidence).includes(CANDIDATE), false);
  assert.equal(evidence.providerBytes, 0);
  assert.equal(evidence.actualSpendUsd, 0);
});

test("same-key replay can reuse the same completed fixture without a new call", () => {
  const selected = select(outcome(events(), true));
  assert.equal(selected.candidateText, CANDIDATE);
  assert.equal(selected.eventCount, 5);
});

test("other fixture thread turn schema sequence and event type are denied", () => {
  const cases = [
    mutate(2, { threadId: "fixture_thread_qrstuvwxyzABCDEF" }),
    mutate(2, { turnId: "fixture_turn_qrstuvwxyzABCDEF" }),
    mutate(2, { schemaVersion: "forme.fake-codex-event.v2" }),
    mutate(2, { sequence: 9 }),
    mutate(2, { type: "tool.completed", payload: { tool: "shell" } }),
  ];
  for (const value of cases) expectDenied(() => select(outcome(value)));
});

test("partial late duplicate-terminal and unknown-field streams are denied", () => {
  expectDenied(() => select(outcome(events().slice(0, -1))));
  expectDenied(() => select(outcome([...events(), events()[4] as SyntheticCodexEvent])));
  const duplicate = structuredClone(events()) as Array<Record<string, unknown>>;
  duplicate[3] = structuredClone(duplicate[4]) as Record<string, unknown>;
  expectDenied(() => select(outcome(duplicate)));
  const unknown = mutate(2, { payload: { itemType: "agent_message", text: CANDIDATE, extra: true } });
  expectDenied(() => select(outcome(unknown)));
});

test("unknown or exceeded accounting is denied", () => {
  const unknownUsage = structuredClone(events()) as Array<Record<string, unknown>>;
  unknownUsage[3] = {
    ...unknownUsage[3],
    payload: { inputTokens: 100, outputTokens: 20, spendKnown: true, spendUsd: 0.1, usageKnown: false },
  };
  expectDenied(() => select(outcome(unknownUsage)));
  expectDenied(() => select(outcome(events({ inputTokens: 101 })), { maximumInputTokens: 100 }));
  expectDenied(() => select(outcome(events({ outputTokens: 21 })), { reservedOutputTokens: 20 }));
  expectDenied(() => select(outcome(events({ spendUsd: 0.100001 })), { reservedSpendUsd: 0.1 }));
});

test("nonzero exit stderr unconsumed journal and unknown outcome are denied", () => {
  expectDenied(() => select(outcome(), { fixtureExitCode: 1 }));
  expectDenied(() => select(outcome(), { fixtureStderrBytes: 1 }));
  expectDenied(() => select(outcome(), { journalFullyConsumed: false }));
  const unknownOutcome = { ...outcome(), outcome: "delivery_unknown", events: [] } as FakeDispatchOutcome;
  expectDenied(() => select(unknownOutcome));
});

test("candidate result bytes allow 32768 and deny 32769", () => {
  const allowed = "a".repeat(MAX_CANDIDATE_BYTES);
  assert.equal(select(outcome(events({ candidateText: allowed }))).candidateText.length, MAX_CANDIDATE_BYTES);
  expectDenied(() => select(outcome(events({ candidateText: "a".repeat(MAX_CANDIDATE_BYTES + 1) }))));
});
