import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AtomicJournalFileSink,
  AuthorityOwnedFakeUpstream,
  FAKE_BUDGET,
  FIXTURE_MODEL_ID,
  FakeTransportError,
  FakeTransportGate,
  InMemoryJournalSink,
  createFakeDispatchPermit,
  createSyntheticJournal,
  type FakeDispatchRequest,
} from "../../packages/r4-codex-adapter/src/fake-transport.ts";

const START = 1_000_000;
const H = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;

function journal() {
  return createSyntheticJournal({
    cycleId: "cycle_abcdefghijklmnop",
    preparedAt: new Date(START).toISOString(),
    interactionId: "interaction_abcdefghijklmnop",
    sessionEnvelopeId: "session_envelope_abcdefghijklmnop",
    sessionEnvelopeHash: H("1"),
    startAuthorizationHash: H("2"),
    policyHash: H("3"),
    outputSchemaHash: H("4"),
    snapshotManifestHash: H("5"),
  });
}

function request(ordinal = 1, overrides: Partial<FakeDispatchRequest> = {}): FakeDispatchRequest {
  return {
    schemaVersion: "fake_dispatch_request.v1",
    cycleId: "cycle_abcdefghijklmnop",
    interactionId: "interaction_abcdefghijklmnop",
    reservationId: `reservation_${String.fromCharCode(96 + ordinal).repeat(16)}`,
    sessionEnvelopeId: "session_envelope_abcdefghijklmnop",
    sessionEnvelopeHash: H("1"),
    startAuthorizationHash: H("2"),
    provider: "OpenAI",
    modelId: FIXTURE_MODEL_ID,
    payloadHash: H(String(ordinal)),
    dispatchOrdinal: ordinal,
    idempotencyKey: String(ordinal).repeat(32),
    permitIssuedAtMilliseconds: START,
    usageKnown: true,
    spendKnown: true,
    inputTokens: 1,
    outputTokensReserved: 1,
    spendReservedUsd: 0,
    automaticRetryAttempt: false,
    fallbackRequested: false,
    priorTerminalFailure: false,
    terminalAuthorityCommitted: false,
    ...overrides,
  };
}

function expectCode(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof FakeTransportError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    return true;
  });
}

function fixture(now = START, factory: (sink: InMemoryJournalSink) => AuthorityOwnedFakeUpstream = () => new AuthorityOwnedFakeUpstream(() => [])) {
  const sink = new InMemoryJournalSink();
  const upstream = factory(sink);
  const gate = new FakeTransportGate({ journal: journal(), sink, upstream, now: () => now, startMilliseconds: START });
  return { gate, sink, upstream };
}

test("journal commit precedes each fake call and ordinals 1 through 3 are the only dispatches", () => {
  const { gate, sink, upstream } = fixture(START, (journalSink) => new AuthorityOwnedFakeUpstream(() => {
    assert.equal(journalSink.commits.at(-1)?.reservations.at(-1)?.state, "prepared");
    return [];
  }));
  for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
    const value = request(ordinal);
    const outcome = gate.dispatch(value, createFakeDispatchPermit(value));
    assert.equal(outcome.outcome, "completed");
    assert.equal(outcome.replayed, false);
  }
  const fourth = request(4);
  expectCode(() => gate.dispatch(fourth, createFakeDispatchPermit(fourth)), "FAKE_DISPATCH_ORDINAL_DENIED");
  assert.equal(upstream.callCount, 3);
  assert.equal(gate.callCount, 3);
  assert.equal(gate.fullyConsumed, true);
  assert.equal(sink.commits.length, 7);
  assert.deepEqual(sink.commits.at(-1)?.reservations.map((item) => item.state), ["completed", "completed", "completed"]);
});

test("same-key replay is call-free and different canonical bytes conflict", () => {
  const { gate, upstream } = fixture();
  const first = request();
  const permit = createFakeDispatchPermit(first);
  gate.dispatch(first, permit);
  const replay = gate.dispatch(first, permit);
  assert.equal(replay.replayed, true);
  assert.equal(upstream.callCount, 1);
  const changed = request(1, { payloadHash: H("9") });
  expectCode(() => gate.dispatch(changed, createFakeDispatchPermit(changed)), "FAKE_IDEMPOTENCY_CONFLICT");
  assert.equal(upstream.callCount, 1);
});

test("journal persistence failure prevents the fake upstream call", () => {
  const { gate, sink, upstream } = fixture();
  sink.failNextCommit = true;
  const value = request();
  expectCode(() => gate.dispatch(value, createFakeDispatchPermit(value)), "FAKE_JOURNAL_COMMIT_FAILED");
  assert.equal(upstream.callCount, 0);
});

test("atomic journal file is 0600 body-free and destroyed only after body-free commit", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-fake-journal-"));
  fs.chmodSync(root, 0o700);
  const sink = new AtomicJournalFileSink({ root, cycleId: "cycle_abcdefghijklmnop" });
  const upstream = new AuthorityOwnedFakeUpstream(() => []);
  const gate = new FakeTransportGate({ journal: journal(), sink, upstream, now: () => START, startMilliseconds: START });
  try {
    const value = request();
    gate.dispatch(value, createFakeDispatchPermit(value));
    const stat = fs.lstatSync(sink.target);
    assert.equal(stat.isFile(), true);
    assert.equal(stat.nlink, 1);
    assert.equal(stat.mode & 0o777, 0o600);
    assert.equal(path.basename(sink.target), "cycle_abcdefghijklmnop.journal.json");
    const stored = fs.readFileSync(sink.target, "utf8");
    assert.equal(stored.endsWith("\n"), true);
    const parsed = JSON.parse(stored) as { schemaVersion: string; reservations: Array<{ state: string }> };
    assert.equal(parsed.schemaVersion, "synthetic_hard_transport_journal.v1");
    assert.deepEqual(parsed.reservations.map((item) => item.state), ["completed"]);
    assert.doesNotMatch(stored, /FORME_PRIVATE_CANARY|requestBody|candidateText/u);
    const receipt = gate.bodyFreeSummary();
    assert.equal(receipt.fullyConsumed, true);
    sink.destroyAfterBodyFreeCommit();
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("input output spend wall-clock and permit TTL boundaries are exact", () => {
  const cases: Array<{
    name: string;
    now: number;
    allowed: Partial<FakeDispatchRequest>;
    denied: Partial<FakeDispatchRequest>;
    code: string;
  }> = [
    { name: "input", now: START, allowed: { inputTokens: 128_000 }, denied: { inputTokens: 128_001 }, code: "FAKE_INPUT_BUDGET_EXCEEDED" },
    { name: "output", now: START, allowed: { outputTokensReserved: 8_000 }, denied: { outputTokensReserved: 8_001 }, code: "FAKE_OUTPUT_BUDGET_EXCEEDED" },
    { name: "spend", now: START, allowed: { spendReservedUsd: 1 }, denied: { spendReservedUsd: 1.000001 }, code: "FAKE_SPEND_BUDGET_EXCEEDED" },
    { name: "wall", now: START + 3_599_999, allowed: { permitIssuedAtMilliseconds: START + 3_599_999 }, denied: { permitIssuedAtMilliseconds: START + 3_599_999 }, code: "FAKE_WALL_BUDGET_EXCEEDED" },
    { name: "ttl", now: START + 29_999, allowed: {}, denied: { permitIssuedAtMilliseconds: START - 1 }, code: "FAKE_PERMIT_EXPIRED" },
  ];
  for (const item of cases) {
    const allowedFixture = fixture(item.now);
    const allowed = request(1, item.allowed);
    allowedFixture.gate.dispatch(allowed, createFakeDispatchPermit(allowed));
    assert.equal(allowedFixture.upstream.callCount, 1, item.name);

    const deniedNow = item.name === "wall" ? START + FAKE_BUDGET.wallClockMilliseconds : item.now;
    const deniedFixture = fixture(deniedNow);
    const denied = request(1, item.denied);
    expectCode(() => deniedFixture.gate.dispatch(denied, createFakeDispatchPermit(denied)), item.code);
    assert.equal(deniedFixture.upstream.callCount, 0, item.name);
  }
});

test("unknown or invalid accounting denies without a fake call", () => {
  const inputs: Array<[Partial<FakeDispatchRequest>, string]> = [
    [{ usageKnown: false }, "FAKE_ACCOUNTING_UNKNOWN"],
    [{ spendKnown: false }, "FAKE_ACCOUNTING_UNKNOWN"],
    [{ inputTokens: Number.NaN }, "FAKE_REQUEST_VALUE_INVALID"],
    [{ outputTokensReserved: -1 }, "FAKE_REQUEST_VALUE_INVALID"],
    [{ spendReservedUsd: Number.POSITIVE_INFINITY }, "FAKE_REQUEST_VALUE_INVALID"],
  ];
  for (const [change, code] of inputs) {
    const { gate, upstream } = fixture();
    const value = request(1, change);
    expectCode(() => gate.dispatch(value, createFakeDispatchPermit(value)), code);
    assert.equal(upstream.callCount, 0);
  }
});

test("every permit binding mismatch denies before call", () => {
  const fields: Array<keyof ReturnType<typeof createFakeDispatchPermit>> = [
    "interactionId", "reservationId", "sessionEnvelopeId", "sessionEnvelopeHash",
    "startAuthorizationHash", "provider", "modelId", "payloadHash",
    "dispatchOrdinal", "idempotencyKey", "issuedAtMilliseconds",
  ];
  for (const field of fields) {
    const { gate, upstream } = fixture();
    const value = request();
    const permit = { ...createFakeDispatchPermit(value) } as Record<string, unknown>;
    if (field === "dispatchOrdinal" || field === "issuedAtMilliseconds") permit[field] = (permit[field] as number) + 1;
    else if (field === "provider") permit[field] = "Other";
    else if (field === "modelId") permit[field] = "other-model";
    else if (field.toLowerCase().includes("hash")) permit[field] = H("9");
    else permit[field] = `${String(permit[field])}x`;
    expectCode(() => gate.dispatch(value, permit), field === "provider" || field === "modelId" ? "FAKE_PERMIT_VALUE_INVALID" : "FAKE_BINDING_MISMATCH");
    assert.equal(upstream.callCount, 0, field);
  }
});

test("retry fallback prior failure and destructive-first terminal authority deny", () => {
  const cases: Array<[Partial<FakeDispatchRequest>, string]> = [
    [{ automaticRetryAttempt: true }, "FAKE_RETRY_OR_FALLBACK_DENIED"],
    [{ fallbackRequested: true }, "FAKE_RETRY_OR_FALLBACK_DENIED"],
    [{ priorTerminalFailure: true }, "FAKE_RETRY_OR_FALLBACK_DENIED"],
    [{ terminalAuthorityCommitted: true }, "FAKE_TERMINAL_AUTHORITY_WINS"],
  ];
  for (const [change, code] of cases) {
    const { gate, upstream } = fixture();
    const value = request(1, change);
    expectCode(() => gate.dispatch(value, createFakeDispatchPermit(value)), code);
    assert.equal(upstream.callCount, 0);
  }
});

test("unknown outcome burns the cycle without automatic replacement dispatch", () => {
  const { gate, upstream } = fixture();
  upstream.failUnknown = true;
  const first = request();
  const permit = createFakeDispatchPermit(first);
  const outcome = gate.dispatch(first, permit);
  assert.equal(outcome.outcome, "delivery_unknown");
  assert.equal(outcome.events.length, 0);
  assert.equal(gate.dispatch(first, permit).replayed, true);
  const second = request(2);
  expectCode(() => gate.dispatch(second, createFakeDispatchPermit(second)), "FAKE_CYCLE_BURNED");
  assert.equal(upstream.callCount, 1);
  assert.deepEqual(gate.journal.reservations.map((item) => item.state), ["delivery_unknown"]);
  const summary = gate.bodyFreeSummary();
  assert.equal(summary.providerBytes, 0);
  assert.equal(summary.actualSpendUsd, 0);
  assert.equal(JSON.stringify(summary).includes(first.interactionId), false);
});
