import { canonicalJsonBytes, canonicalSha256 } from "../../r4-protocol/src/index.ts";
import type { FakeDispatchOutcome, SyntheticCodexEvent } from "./fake-transport.ts";

export const SYNTHETIC_EVENT_SCHEMA_VERSION = "forme.fake-codex-event.v1" as const;
export const MAX_COMBINED_EVENT_BYTES = 33_554_432;
export const MAX_CANDIDATE_BYTES = 32_768;

const THREAD_ID = /^fixture_thread_[A-Za-z0-9_-]{16,128}$/u;
const TURN_ID = /^fixture_turn_[A-Za-z0-9_-]{16,128}$/u;
const EVENT_KEYS = ["payload", "schemaVersion", "sequence", "threadId", "turnId", "type"] as const;
const EVENT_ORDER = [
  "thread.started", "turn.started", "item.completed", "usage.completed", "turn.completed",
] as const;

export type SyntheticCompletedFixture = Readonly<{
  candidateText: string;
  candidateHash: `sha256:${string}`;
  inputTokens: number;
  outputTokens: number;
  spendUsd: number;
  eventCount: number;
  combinedEventBytes: number;
}>;

export class EventFenceError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "EventFenceError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new EventFenceError(code);
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("EVENT_SHAPE_INVALID");
  return value as Record<string, unknown>;
}

function exactPayload(value: unknown, expected: readonly string[]): Record<string, unknown> {
  const payload = object(value);
  if (!exactKeys(payload, expected)) fail("EVENT_PAYLOAD_SHAPE_INVALID");
  return payload;
}

function safeNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function safeNonnegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function fixtureEvent(input: Readonly<{
  sequence: number;
  threadId: string;
  turnId: string;
  type: (typeof EVENT_ORDER)[number];
  payload: Readonly<Record<string, unknown>>;
}>): SyntheticCodexEvent {
  return Object.freeze({
    schemaVersion: SYNTHETIC_EVENT_SCHEMA_VERSION,
    sequence: input.sequence,
    threadId: input.threadId,
    turnId: input.turnId,
    type: input.type,
    payload: Object.freeze({ ...input.payload }),
  });
}

export function completedFixtureEvents(input: Readonly<{
  threadId: string;
  turnId: string;
  candidateText: string;
  inputTokens: number;
  outputTokens: number;
  spendUsd: number;
}>): readonly SyntheticCodexEvent[] {
  return Object.freeze([
    fixtureEvent({ sequence: 1, threadId: input.threadId, turnId: input.turnId, type: "thread.started", payload: { fixture: true } }),
    fixtureEvent({ sequence: 2, threadId: input.threadId, turnId: input.turnId, type: "turn.started", payload: { status: "in_progress" } }),
    fixtureEvent({ sequence: 3, threadId: input.threadId, turnId: input.turnId, type: "item.completed", payload: { itemType: "agent_message", text: input.candidateText } }),
    fixtureEvent({ sequence: 4, threadId: input.threadId, turnId: input.turnId, type: "usage.completed", payload: {
      inputTokens: input.inputTokens, outputTokens: input.outputTokens,
      spendKnown: true, spendUsd: input.spendUsd, usageKnown: true,
    } }),
    fixtureEvent({ sequence: 5, threadId: input.threadId, turnId: input.turnId, type: "turn.completed", payload: { status: "completed" } }),
  ]);
}

export function selectSyntheticCandidate(input: Readonly<{
  outcome: FakeDispatchOutcome;
  expectedThreadId: string;
  expectedTurnId: string;
  fixtureExitCode: number;
  fixtureStderrBytes: number;
  journalFullyConsumed: boolean;
  maximumInputTokens: number;
  reservedOutputTokens: number;
  reservedSpendUsd: number;
}>): SyntheticCompletedFixture {
  if (
    input.outcome.outcome !== "completed"
    || !THREAD_ID.test(input.expectedThreadId) || !TURN_ID.test(input.expectedTurnId)
    || input.fixtureExitCode !== 0 || input.fixtureStderrBytes !== 0
    || input.journalFullyConsumed !== true
    || !safeNonnegativeInteger(input.maximumInputTokens)
    || !safeNonnegativeInteger(input.reservedOutputTokens)
    || !safeNonnegativeFinite(input.reservedSpendUsd)
  ) fail("EVENT_FENCE_PRECONDITION_FAILED");
  const events = input.outcome.events;
  if (!Array.isArray(events) || events.length !== EVENT_ORDER.length) fail("EVENT_SEQUENCE_INCOMPLETE");
  let combinedEventBytes = 0;
  let candidateText: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let spendUsd: number | null = null;

  events.forEach((raw, index) => {
    const event = object(raw);
    try {
      combinedEventBytes += canonicalJsonBytes(event).length;
    } catch {
      fail("EVENT_SHAPE_INVALID");
    }
    if (!exactKeys(event, EVENT_KEYS)
      || event.schemaVersion !== SYNTHETIC_EVENT_SCHEMA_VERSION
      || event.sequence !== index + 1
      || event.threadId !== input.expectedThreadId
      || event.turnId !== input.expectedTurnId
      || event.type !== EVENT_ORDER[index]) fail("EVENT_IDENTITY_OR_ORDER_MISMATCH");

    if (event.type === "thread.started") {
      const payload = exactPayload(event.payload, ["fixture"]);
      if (payload.fixture !== true) fail("EVENT_PAYLOAD_INVALID");
    } else if (event.type === "turn.started") {
      const payload = exactPayload(event.payload, ["status"]);
      if (payload.status !== "in_progress") fail("EVENT_PAYLOAD_INVALID");
    } else if (event.type === "item.completed") {
      const payload = exactPayload(event.payload, ["itemType", "text"]);
      if (payload.itemType !== "agent_message" || typeof payload.text !== "string") fail("EVENT_CANDIDATE_INVALID");
      const byteCount = new TextEncoder().encode(payload.text).length;
      if (byteCount < 1 || byteCount > MAX_CANDIDATE_BYTES) fail("EVENT_CANDIDATE_INVALID");
      candidateText = payload.text;
    } else if (event.type === "usage.completed") {
      const payload = exactPayload(event.payload, [
        "inputTokens", "outputTokens", "spendKnown", "spendUsd", "usageKnown",
      ]);
      if (payload.usageKnown !== true || payload.spendKnown !== true
        || !safeNonnegativeInteger(payload.inputTokens)
        || !safeNonnegativeInteger(payload.outputTokens)
        || !safeNonnegativeFinite(payload.spendUsd)) fail("EVENT_ACCOUNTING_UNKNOWN");
      inputTokens = payload.inputTokens;
      outputTokens = payload.outputTokens;
      spendUsd = payload.spendUsd;
    } else if (event.type === "turn.completed") {
      const payload = exactPayload(event.payload, ["status"]);
      if (payload.status !== "completed") fail("EVENT_TERMINAL_INVALID");
    } else {
      fail("EVENT_TYPE_DENIED");
    }
  });

  if (combinedEventBytes > MAX_COMBINED_EVENT_BYTES) fail("EVENT_STREAM_TOO_LARGE");
  if (candidateText === null || inputTokens === null || outputTokens === null || spendUsd === null) {
    fail("EVENT_SEQUENCE_INCOMPLETE");
  }
  if (inputTokens > input.maximumInputTokens
    || outputTokens > input.reservedOutputTokens
    || spendUsd > input.reservedSpendUsd + Number.EPSILON) fail("EVENT_ACCOUNTING_EXCEEDED");
  return Object.freeze({
    candidateText,
    candidateHash: canonicalSha256({ schemaVersion: "synthetic_candidate.v1", text: candidateText }),
    inputTokens,
    outputTokens,
    spendUsd,
    eventCount: events.length,
    combinedEventBytes,
  });
}

export function bodyFreeEventFenceEvidence(value: SyntheticCompletedFixture): Readonly<Record<string, unknown>> {
  return Object.freeze({
    schemaVersion: "event_fence_evidence.v1",
    candidateHash: value.candidateHash,
    candidateBytes: new TextEncoder().encode(value.candidateText).length,
    fixtureInputTokens: value.inputTokens,
    fixtureOutputTokens: value.outputTokens,
    fixtureSpendUsd: value.spendUsd,
    eventCount: value.eventCount,
    combinedEventBytes: value.combinedEventBytes,
    providerBytes: 0,
    actualSpendUsd: 0,
  });
}
