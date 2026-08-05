import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AuthorityOwnedFakeUpstream,
  FAKE_BUDGET,
  FIXTURE_MODEL_ID,
  FakeTransportGate,
  InMemoryJournalSink,
  createFakeDispatchPermit,
  createSyntheticJournal,
} from "../packages/r4-codex-adapter/src/fake-transport.ts";
import {
  bodyFreeEventFenceEvidence,
  completedFixtureEvents,
  selectSyntheticCandidate,
} from "../packages/r4-codex-adapter/src/event-fence.ts";

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const constructedPaths = Object.freeze([
  "packages/r4-codex-adapter/src/fake-transport.ts",
  "packages/r4-codex-adapter/src/event-fence.ts",
  "scripts/r4-gate-b-fake-budget.mjs",
  "test/r4-gate-b/fake-transport-budget.test.ts",
  "test/r4-gate-b/event-fence.test.ts",
]);
const runtimeBoundaryPath = "schemas/r4/gate-b/runtime-boundary.json";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function exactRead(relativePath) {
  if (![...constructedPaths, runtimeBoundaryPath].includes(relativePath)) fail("FAKE_BUDGET_PATH_NOT_ALLOWLISTED");
  const candidate = path.join(root, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(candidate) !== candidate) {
    fail("FAKE_BUDGET_PATH_UNSAFE");
  }
  return fs.readFileSync(candidate, "utf8");
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function staticAudit(fakeTransport, eventFence) {
  const combined = `${fakeTransport}\n${eventFence}`;
  for (const pattern of [
    /node:(?:net|http|https|tls|dns)/u,
    /https?:\/\//u,
    /child_process|spawn\(|exec\(/u,
    /fetch\(|WebSocket/u,
    /process\.env|process\.argv/u,
    /automaticRetryAttempt:\s*true/u,
  ]) if (pattern.test(combined)) fail("FAKE_BUDGET_EFFECT_SURFACE_DRIFT");
  for (const token of [
    "journal", "FAKE_DISPATCH_ORDINAL_DENIED", "FAKE_ACCOUNTING_UNKNOWN",
    "FAKE_TERMINAL_AUTHORITY_WINS", "FAKE_CYCLE_BURNED",
    "EVENT_IDENTITY_OR_ORDER_MISMATCH", "EVENT_ACCOUNTING_UNKNOWN",
    "MAX_CANDIDATE_BYTES", "providerBytes: 0", "actualSpendUsd: 0",
  ]) if (!combined.includes(token)) fail("FAKE_BUDGET_CONTROL_DRIFT");
}

const H = (digit) => `sha256:${digit.repeat(64)}`;

export function inspectFakeBudgetConstruction() {
  const files = Object.fromEntries(constructedPaths.map((name) => [name, exactRead(name)]));
  const boundary = JSON.parse(exactRead(runtimeBoundaryPath));
  const expected = boundary.fakeTransportBudget;
  if (
    expected.fixtureModelId !== FIXTURE_MODEL_ID
    || expected.wallClockSeconds * 1000 !== FAKE_BUDGET.wallClockMilliseconds
    || expected.providerDispatches !== FAKE_BUDGET.providerDispatches
    || expected.aggregateInputTokens !== FAKE_BUDGET.aggregateInputTokens
    || expected.aggregateOutputTokens !== FAKE_BUDGET.aggregateOutputTokens
    || expected.incrementalMaximumUsd !== FAKE_BUDGET.incrementalMaximumUsd
    || expected.permitTtlSeconds * 1000 !== FAKE_BUDGET.permitTtlMilliseconds
    || expected.automaticRetry !== false || expected.providerFallback !== false
    || expected.modelFallback !== false
  ) fail("FAKE_BUDGET_AUTHORITY_DRIFT");
  staticAudit(
    files["packages/r4-codex-adapter/src/fake-transport.ts"],
    files["packages/r4-codex-adapter/src/event-fence.ts"],
  );

  const start = 1_000_000;
  const threadId = "fixture_thread_abcdefghijklmnop";
  const turnId = "fixture_turn_abcdefghijklmnop";
  const sink = new InMemoryJournalSink();
  const upstream = new AuthorityOwnedFakeUpstream((request) => completedFixtureEvents({
    threadId, turnId, candidateText: `synthetic candidate ${request.dispatchOrdinal}`,
    inputTokens: request.inputTokens, outputTokens: request.outputTokensReserved,
    spendUsd: request.spendReservedUsd,
  }));
  const journal = createSyntheticJournal({
    cycleId: "cycle_abcdefghijklmnop", preparedAt: new Date(start).toISOString(),
    interactionId: "interaction_abcdefghijklmnop",
    sessionEnvelopeId: "session_envelope_abcdefghijklmnop",
    sessionEnvelopeHash: H("1"), startAuthorizationHash: H("2"),
    policyHash: H("3"), outputSchemaHash: H("4"), snapshotManifestHash: H("5"),
  });
  const gate = new FakeTransportGate({ journal, sink, upstream, now: () => start, startMilliseconds: start });
  let last;
  for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
    const request = {
      schemaVersion: "fake_dispatch_request.v1",
      cycleId: journal.cycleId, interactionId: journal.interactionId,
      reservationId: `reservation_${String.fromCharCode(96 + ordinal).repeat(16)}`,
      sessionEnvelopeId: journal.sessionEnvelopeId,
      sessionEnvelopeHash: journal.sessionEnvelopeHash,
      startAuthorizationHash: journal.startAuthorizationHash,
      provider: "OpenAI", modelId: FIXTURE_MODEL_ID, payloadHash: H(String(ordinal)),
      dispatchOrdinal: ordinal, idempotencyKey: String(ordinal).repeat(32),
      permitIssuedAtMilliseconds: start, usageKnown: true, spendKnown: true,
      inputTokens: 1, outputTokensReserved: 1, spendReservedUsd: 0,
      automaticRetryAttempt: false, fallbackRequested: false,
      priorTerminalFailure: false, terminalAuthorityCommitted: false,
    };
    last = gate.dispatch(request, createFakeDispatchPermit(request));
  }
  if (!last) fail("FAKE_BUDGET_SMOKE_FAILED");
  const selected = selectSyntheticCandidate({
    outcome: last, expectedThreadId: threadId, expectedTurnId: turnId,
    fixtureExitCode: 0, fixtureStderrBytes: 0, journalFullyConsumed: gate.fullyConsumed,
    maximumInputTokens: 1, reservedOutputTokens: 1, reservedSpendUsd: 0,
  });
  const eventEvidence = bodyFreeEventFenceEvidence(selected);
  return Object.freeze({
    schemaVersion: "r4_gate_b_fake_budget_static.v1",
    status: "GREEN_FAKE_ONLY",
    fakeCalls: gate.callCount,
    providerCalls: 0,
    providerBytes: 0,
    actualSpendUsd: 0,
    socketCalls: 0,
    journalCommitCount: sink.commits.length,
    journalFullyConsumed: gate.fullyConsumed,
    eventCount: eventEvidence.eventCount,
    candidateBytes: eventEvidence.candidateBytes,
    constructedFileHashes: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, digest(value)])),
  });
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("FAKE_BUDGET_COMMAND_INVALID");
  process.stdout.write(`${JSON.stringify(inspectFakeBudgetConstruction())}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
