import fs from "node:fs";
import path from "node:path";
import { canonicalJson, canonicalSha256 } from "../../r4-protocol/src/index.ts";

export const FIXTURE_MODEL_ID = "forme-gate-b-no-provider-model.v1" as const;
export const FIXTURE_PROVIDER = "OpenAI" as const;
export const FAKE_BUDGET = Object.freeze({
  wallClockMilliseconds: 3_600_000,
  providerDispatches: 3,
  aggregateInputTokens: 128_000,
  aggregateOutputTokens: 8_000,
  incrementalMaximumUsd: 1,
  permitTtlMilliseconds: 30_000,
} as const);

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const CYCLE_ID = /^[A-Za-z0-9_-]{16,128}$/u;
const R4_ID = /^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u;
const IDEMPOTENCY_KEY = /^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$/u;
const REQUEST_KEYS = [
  "automaticRetryAttempt", "cycleId", "dispatchOrdinal", "fallbackRequested",
  "idempotencyKey", "inputTokens", "interactionId", "modelId", "outputTokensReserved",
  "payloadHash", "permitIssuedAtMilliseconds", "priorTerminalFailure", "provider",
  "reservationId", "schemaVersion", "sessionEnvelopeHash", "sessionEnvelopeId",
  "spendKnown", "spendReservedUsd", "startAuthorizationHash",
  "terminalAuthorityCommitted", "usageKnown",
] as const;
const PERMIT_KEYS = [
  "dispatchOrdinal", "idempotencyKey", "interactionId", "issuedAtMilliseconds",
  "modelId", "payloadHash", "provider", "reservationId", "schemaVersion",
  "sessionEnvelopeHash", "sessionEnvelopeId", "startAuthorizationHash",
] as const;

export type SyntheticHardTransportJournalV1 = Readonly<{
  schemaVersion: "synthetic_hard_transport_journal.v1";
  cycleId: string;
  modelId: typeof FIXTURE_MODEL_ID;
  preparedAt: string;
  interactionId: string;
  sessionEnvelopeId: string;
  sessionEnvelopeHash: `sha256:${string}`;
  startAuthorizationHash: `sha256:${string}`;
  policyHash: `sha256:${string}`;
  outputSchemaHash: `sha256:${string}`;
  snapshotManifestHash: `sha256:${string}`;
  budget: typeof FAKE_BUDGET;
  reservations: readonly FakeReservation[];
}>;

export type FakeReservation = Readonly<{
  reservationId: string;
  dispatchOrdinal: number;
  idempotencyKey: string;
  requestHash: `sha256:${string}`;
  payloadHash: `sha256:${string}`;
  inputTokens: number;
  outputTokensReserved: number;
  spendReservedUsd: number;
  permitIssuedAtMilliseconds: number;
  committedAtMilliseconds: number;
  state: "prepared" | "completed" | "delivery_unknown";
}>;

export type FakeDispatchRequest = Readonly<{
  schemaVersion: "fake_dispatch_request.v1";
  cycleId: string;
  interactionId: string;
  reservationId: string;
  sessionEnvelopeId: string;
  sessionEnvelopeHash: `sha256:${string}`;
  startAuthorizationHash: `sha256:${string}`;
  provider: typeof FIXTURE_PROVIDER;
  modelId: typeof FIXTURE_MODEL_ID;
  payloadHash: `sha256:${string}`;
  dispatchOrdinal: number;
  idempotencyKey: string;
  permitIssuedAtMilliseconds: number;
  usageKnown: boolean;
  spendKnown: boolean;
  inputTokens: number;
  outputTokensReserved: number;
  spendReservedUsd: number;
  automaticRetryAttempt: boolean;
  fallbackRequested: boolean;
  priorTerminalFailure: boolean;
  terminalAuthorityCommitted: boolean;
}>;

export type FakeDispatchPermit = Readonly<{
  schemaVersion: "fake_dispatch_permit.v1";
  interactionId: string;
  reservationId: string;
  sessionEnvelopeId: string;
  sessionEnvelopeHash: `sha256:${string}`;
  startAuthorizationHash: `sha256:${string}`;
  provider: typeof FIXTURE_PROVIDER;
  modelId: typeof FIXTURE_MODEL_ID;
  payloadHash: `sha256:${string}`;
  dispatchOrdinal: number;
  idempotencyKey: string;
  issuedAtMilliseconds: number;
}>;

export type SyntheticCodexEvent = Readonly<Record<string, unknown>>;

export type FakeDispatchOutcome = Readonly<{
  outcome: "completed" | "delivery_unknown";
  reservationId: string;
  dispatchOrdinal: number;
  replayed: boolean;
  events: readonly SyntheticCodexEvent[];
}>;

export interface JournalSink {
  commit(journal: SyntheticHardTransportJournalV1): void;
}

export interface FakeUpstream {
  readonly callCount: number;
  dispatch(request: FakeDispatchRequest): readonly SyntheticCodexEvent[];
}

export class FakeTransportError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "FakeTransportError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new FakeTransportError(code);
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function exactTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    && Number.isFinite(Date.parse(value));
}

function safeNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function safeNonnegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function safeUsd(value: unknown): value is number {
  return safeNonnegativeFinite(value)
    && Number.isSafeInteger(Math.round((value as number) * 1_000_000))
    && Math.abs((value as number) * 1_000_000 - Math.round((value as number) * 1_000_000)) <= 0.000001;
}

function currentUid(): number {
  if (typeof process.getuid !== "function") fail("FAKE_JOURNAL_ROOT_INVALID");
  return process.getuid();
}

function assertHash(value: unknown): asserts value is `sha256:${string}` {
  if (typeof value !== "string" || !SHA256.test(value)) fail("FAKE_BINDING_INVALID");
}

function assertDispatchRequest(value: unknown): asserts value is FakeDispatchRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, REQUEST_KEYS)) {
    fail("FAKE_REQUEST_SHAPE_INVALID");
  }
  const request = value as Partial<FakeDispatchRequest>;
  if (
    request.schemaVersion !== "fake_dispatch_request.v1"
    || typeof request.cycleId !== "string" || !CYCLE_ID.test(request.cycleId)
    || typeof request.interactionId !== "string" || !R4_ID.test(request.interactionId)
    || typeof request.reservationId !== "string" || !R4_ID.test(request.reservationId)
    || typeof request.sessionEnvelopeId !== "string" || !R4_ID.test(request.sessionEnvelopeId)
    || request.provider !== FIXTURE_PROVIDER || request.modelId !== FIXTURE_MODEL_ID
    || !safeNonnegativeInteger(request.dispatchOrdinal) || request.dispatchOrdinal < 1
    || typeof request.idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(request.idempotencyKey)
    || !safeNonnegativeInteger(request.permitIssuedAtMilliseconds)
    || typeof request.usageKnown !== "boolean" || typeof request.spendKnown !== "boolean"
    || !safeNonnegativeInteger(request.inputTokens)
    || !safeNonnegativeInteger(request.outputTokensReserved)
    || !safeUsd(request.spendReservedUsd)
    || typeof request.automaticRetryAttempt !== "boolean"
    || typeof request.fallbackRequested !== "boolean"
    || typeof request.priorTerminalFailure !== "boolean"
    || typeof request.terminalAuthorityCommitted !== "boolean"
  ) fail("FAKE_REQUEST_VALUE_INVALID");
  assertHash(request.sessionEnvelopeHash);
  assertHash(request.startAuthorizationHash);
  assertHash(request.payloadHash);
}

function assertDispatchPermit(value: unknown): asserts value is FakeDispatchPermit {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !exactKeys(value, PERMIT_KEYS)) {
    fail("FAKE_PERMIT_SHAPE_INVALID");
  }
  const permit = value as Partial<FakeDispatchPermit>;
  if (
    permit.schemaVersion !== "fake_dispatch_permit.v1"
    || typeof permit.interactionId !== "string" || !R4_ID.test(permit.interactionId)
    || typeof permit.reservationId !== "string" || !R4_ID.test(permit.reservationId)
    || typeof permit.sessionEnvelopeId !== "string" || !R4_ID.test(permit.sessionEnvelopeId)
    || permit.provider !== FIXTURE_PROVIDER || permit.modelId !== FIXTURE_MODEL_ID
    || !safeNonnegativeInteger(permit.dispatchOrdinal) || permit.dispatchOrdinal < 1
    || typeof permit.idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(permit.idempotencyKey)
    || !safeNonnegativeInteger(permit.issuedAtMilliseconds)
  ) fail("FAKE_PERMIT_VALUE_INVALID");
  assertHash(permit.sessionEnvelopeHash);
  assertHash(permit.startAuthorizationHash);
  assertHash(permit.payloadHash);
}

export function createFakeDispatchPermit(request: FakeDispatchRequest): FakeDispatchPermit {
  assertDispatchRequest(request);
  return Object.freeze({
    schemaVersion: "fake_dispatch_permit.v1",
    interactionId: request.interactionId,
    reservationId: request.reservationId,
    sessionEnvelopeId: request.sessionEnvelopeId,
    sessionEnvelopeHash: request.sessionEnvelopeHash,
    startAuthorizationHash: request.startAuthorizationHash,
    provider: request.provider,
    modelId: request.modelId,
    payloadHash: request.payloadHash,
    dispatchOrdinal: request.dispatchOrdinal,
    idempotencyKey: request.idempotencyKey,
    issuedAtMilliseconds: request.permitIssuedAtMilliseconds,
  });
}

function assertJournal(value: SyntheticHardTransportJournalV1): void {
  if (
    value.schemaVersion !== "synthetic_hard_transport_journal.v1"
    || !CYCLE_ID.test(value.cycleId)
    || value.modelId !== FIXTURE_MODEL_ID
    || !exactTimestamp(value.preparedAt)
    || !R4_ID.test(value.interactionId)
    || !R4_ID.test(value.sessionEnvelopeId)
    || !SHA256.test(value.sessionEnvelopeHash)
    || !SHA256.test(value.startAuthorizationHash)
    || !SHA256.test(value.policyHash)
    || !SHA256.test(value.outputSchemaHash)
    || !SHA256.test(value.snapshotManifestHash)
    || value.budget !== FAKE_BUDGET
    || !Array.isArray(value.reservations)
  ) fail("FAKE_JOURNAL_INVALID");
}

export function createSyntheticJournal(input: Readonly<{
  cycleId: string;
  preparedAt: string;
  interactionId: string;
  sessionEnvelopeId: string;
  sessionEnvelopeHash: `sha256:${string}`;
  startAuthorizationHash: `sha256:${string}`;
  policyHash: `sha256:${string}`;
  outputSchemaHash: `sha256:${string}`;
  snapshotManifestHash: `sha256:${string}`;
}>): SyntheticHardTransportJournalV1 {
  const journal: SyntheticHardTransportJournalV1 = Object.freeze({
    schemaVersion: "synthetic_hard_transport_journal.v1",
    cycleId: input.cycleId,
    modelId: FIXTURE_MODEL_ID,
    preparedAt: input.preparedAt,
    interactionId: input.interactionId,
    sessionEnvelopeId: input.sessionEnvelopeId,
    sessionEnvelopeHash: input.sessionEnvelopeHash,
    startAuthorizationHash: input.startAuthorizationHash,
    policyHash: input.policyHash,
    outputSchemaHash: input.outputSchemaHash,
    snapshotManifestHash: input.snapshotManifestHash,
    budget: FAKE_BUDGET,
    reservations: Object.freeze([]),
  });
  assertJournal(journal);
  return journal;
}

export class InMemoryJournalSink implements JournalSink {
  readonly commits: SyntheticHardTransportJournalV1[] = [];
  readonly order: string[] = [];
  failNextCommit = false;

  commit(journal: SyntheticHardTransportJournalV1): void {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      fail("FAKE_JOURNAL_COMMIT_FAILED");
    }
    assertJournal(journal);
    const snapshot = structuredClone(journal) as SyntheticHardTransportJournalV1;
    this.commits.push(Object.freeze(snapshot));
    this.order.push(`journal:${journal.reservations.at(-1)?.state ?? "initial"}`);
  }
}

export class AtomicJournalFileSink implements JournalSink {
  readonly #root: string;
  readonly #target: string;
  #commitCount = 0;

  constructor(input: Readonly<{ root: string; cycleId: string }>) {
    if (typeof input.root !== "string" || !path.isAbsolute(input.root) || !CYCLE_ID.test(input.cycleId)) {
      fail("FAKE_JOURNAL_ROOT_INVALID");
    }
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(input.root);
    } catch {
      fail("FAKE_JOURNAL_ROOT_INVALID");
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== currentUid() || (stat.mode & 0o077) !== 0) fail("FAKE_JOURNAL_ROOT_INVALID");
    const real = fs.realpathSync(input.root);
    if (real !== path.resolve(input.root)) fail("FAKE_JOURNAL_ROOT_INVALID");
    this.#root = real;
    this.#target = path.join(real, `${input.cycleId}.journal.json`);
  }

  commit(journal: SyntheticHardTransportJournalV1): void {
    assertJournal(journal);
    const pending = `${this.#target}.pending`;
    if (fs.existsSync(pending)) fail("FAKE_JOURNAL_AMBIGUOUS_PENDING");
    if (fs.existsSync(this.#target)) {
      const prior = fs.lstatSync(this.#target);
      if (!prior.isFile() || prior.isSymbolicLink() || prior.uid !== currentUid() || prior.nlink !== 1 || (prior.mode & 0o077) !== 0) {
        fail("FAKE_JOURNAL_TARGET_UNSAFE");
      }
    }
    const bytes = Buffer.from(`${canonicalJson(journal)}\n`, "utf8");
    const descriptor = fs.openSync(pending, "wx", 0o600);
    try {
      fs.fchmodSync(descriptor, 0o600);
      fs.writeFileSync(descriptor, bytes);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
      bytes.fill(0);
    }
    fs.renameSync(pending, this.#target);
    this.#fsyncRoot();
    this.#commitCount += 1;
  }

  destroyAfterBodyFreeCommit(): void {
    if (fs.existsSync(`${this.#target}.pending`)) fail("FAKE_JOURNAL_AMBIGUOUS_PENDING");
    if (fs.existsSync(this.#target)) fs.unlinkSync(this.#target);
    this.#fsyncRoot();
    if (fs.existsSync(this.#target)) fail("FAKE_JOURNAL_CLEANUP_FAILED");
  }

  #fsyncRoot(): void {
    const descriptor = fs.openSync(this.#root, fs.constants.O_RDONLY);
    try {
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  }

  get target(): string {
    return this.#target;
  }

  get commitCount(): number {
    return this.#commitCount;
  }
}

export class AuthorityOwnedFakeUpstream implements FakeUpstream {
  #callCount = 0;
  readonly #factory: (request: FakeDispatchRequest) => readonly SyntheticCodexEvent[];
  readonly order: string[];
  failUnknown = false;

  constructor(
    factory: (request: FakeDispatchRequest) => readonly SyntheticCodexEvent[],
    order: string[] = [],
  ) {
    this.#factory = factory;
    this.order = order;
  }

  dispatch(request: FakeDispatchRequest): readonly SyntheticCodexEvent[] {
    this.#callCount += 1;
    this.order.push("upstream:dispatch");
    if (this.failUnknown) fail("FAKE_UPSTREAM_UNKNOWN_OUTCOME");
    return this.#factory(request);
  }

  get callCount(): number {
    return this.#callCount;
  }
}

function frozenJournalWith(
  journal: SyntheticHardTransportJournalV1,
  reservations: readonly FakeReservation[],
): SyntheticHardTransportJournalV1 {
  return Object.freeze({ ...journal, reservations: Object.freeze([...reservations]) });
}

export class FakeTransportGate {
  #journal: SyntheticHardTransportJournalV1;
  readonly #sink: JournalSink;
  readonly #upstream: FakeUpstream;
  readonly #now: () => number;
  readonly #startMilliseconds: number;
  readonly #replays = new Map<string, Readonly<{ requestHash: string; outcome: FakeDispatchOutcome }>>();
  #burned = false;

  constructor(input: Readonly<{
    journal: SyntheticHardTransportJournalV1;
    sink: JournalSink;
    upstream: FakeUpstream;
    now: () => number;
    startMilliseconds: number;
  }>) {
    assertJournal(input.journal);
    if (!safeNonnegativeInteger(input.startMilliseconds)) fail("FAKE_CLOCK_INVALID");
    this.#journal = input.journal;
    this.#sink = input.sink;
    this.#upstream = input.upstream;
    this.#now = input.now;
    this.#startMilliseconds = input.startMilliseconds;
    this.#sink.commit(this.#journal);
  }

  dispatch(value: unknown, permitValue: unknown): FakeDispatchOutcome {
    assertDispatchRequest(value);
    assertDispatchPermit(permitValue);
    const request = value;
    const permit = permitValue;
    this.#assertBinding(request, permit);
    const requestHash = canonicalSha256(request);
    const replay = this.#replays.get(request.idempotencyKey);
    if (replay) {
      if (replay.requestHash !== requestHash) fail("FAKE_IDEMPOTENCY_CONFLICT");
      return Object.freeze({ ...replay.outcome, replayed: true });
    }
    if (this.#burned) fail("FAKE_CYCLE_BURNED");
    const now = this.#now();
    if (!safeNonnegativeInteger(now) || now < this.#startMilliseconds) fail("FAKE_CLOCK_INVALID");
    if (now - this.#startMilliseconds >= FAKE_BUDGET.wallClockMilliseconds) fail("FAKE_WALL_BUDGET_EXCEEDED");
    const permitAge = now - request.permitIssuedAtMilliseconds;
    if (permitAge < 0 || permitAge >= FAKE_BUDGET.permitTtlMilliseconds) fail("FAKE_PERMIT_EXPIRED");
    if (!request.usageKnown || !request.spendKnown) fail("FAKE_ACCOUNTING_UNKNOWN");
    if (request.automaticRetryAttempt || request.fallbackRequested || request.priorTerminalFailure) fail("FAKE_RETRY_OR_FALLBACK_DENIED");
    if (request.terminalAuthorityCommitted) fail("FAKE_TERMINAL_AUTHORITY_WINS");
    const expectedOrdinal = this.#journal.reservations.length + 1;
    if (request.dispatchOrdinal !== expectedOrdinal || request.dispatchOrdinal > FAKE_BUDGET.providerDispatches) fail("FAKE_DISPATCH_ORDINAL_DENIED");
    const totals = this.#journal.reservations.reduce((sum, item) => ({
      input: sum.input + item.inputTokens,
      output: sum.output + item.outputTokensReserved,
      spendMicroUsd: sum.spendMicroUsd + Math.round(item.spendReservedUsd * 1_000_000),
    }), { input: 0, output: 0, spendMicroUsd: 0 });
    if (totals.input + request.inputTokens > FAKE_BUDGET.aggregateInputTokens) fail("FAKE_INPUT_BUDGET_EXCEEDED");
    if (totals.output + request.outputTokensReserved > FAKE_BUDGET.aggregateOutputTokens) fail("FAKE_OUTPUT_BUDGET_EXCEEDED");
    const spendMicroUsd = totals.spendMicroUsd + Math.round(request.spendReservedUsd * 1_000_000);
    if (spendMicroUsd > FAKE_BUDGET.incrementalMaximumUsd * 1_000_000) fail("FAKE_SPEND_BUDGET_EXCEEDED");

    const prepared: FakeReservation = Object.freeze({
      reservationId: request.reservationId,
      dispatchOrdinal: request.dispatchOrdinal,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      payloadHash: request.payloadHash,
      inputTokens: request.inputTokens,
      outputTokensReserved: request.outputTokensReserved,
      spendReservedUsd: request.spendReservedUsd,
      permitIssuedAtMilliseconds: request.permitIssuedAtMilliseconds,
      committedAtMilliseconds: now,
      state: "prepared",
    });
    this.#journal = frozenJournalWith(this.#journal, [...this.#journal.reservations, prepared]);
    this.#sink.commit(this.#journal);

    try {
      const events = this.#upstream.dispatch(request);
      const completed = Object.freeze({ ...prepared, state: "completed" as const });
      this.#journal = frozenJournalWith(this.#journal, [...this.#journal.reservations.slice(0, -1), completed]);
      this.#sink.commit(this.#journal);
      const outcome: FakeDispatchOutcome = Object.freeze({
        outcome: "completed", reservationId: request.reservationId,
        dispatchOrdinal: request.dispatchOrdinal, replayed: false,
        events: Object.freeze([...events]),
      });
      this.#replays.set(request.idempotencyKey, Object.freeze({ requestHash, outcome }));
      return outcome;
    } catch {
      const unknown = Object.freeze({ ...prepared, state: "delivery_unknown" as const });
      this.#journal = frozenJournalWith(this.#journal, [...this.#journal.reservations.slice(0, -1), unknown]);
      this.#sink.commit(this.#journal);
      this.#burned = true;
      const outcome: FakeDispatchOutcome = Object.freeze({
        outcome: "delivery_unknown", reservationId: request.reservationId,
        dispatchOrdinal: request.dispatchOrdinal, replayed: false,
        events: Object.freeze([]),
      });
      this.#replays.set(request.idempotencyKey, Object.freeze({ requestHash, outcome }));
      return outcome;
    }
  }

  #assertBinding(request: FakeDispatchRequest, permit: FakeDispatchPermit): void {
    if (
      request.cycleId !== this.#journal.cycleId
      || request.interactionId !== this.#journal.interactionId
      || request.sessionEnvelopeId !== this.#journal.sessionEnvelopeId
      || request.sessionEnvelopeHash !== this.#journal.sessionEnvelopeHash
      || request.startAuthorizationHash !== this.#journal.startAuthorizationHash
      || request.provider !== FIXTURE_PROVIDER
      || request.modelId !== this.#journal.modelId
      || permit.interactionId !== request.interactionId
      || permit.reservationId !== request.reservationId
      || permit.sessionEnvelopeId !== request.sessionEnvelopeId
      || permit.sessionEnvelopeHash !== request.sessionEnvelopeHash
      || permit.startAuthorizationHash !== request.startAuthorizationHash
      || permit.provider !== request.provider
      || permit.modelId !== request.modelId
      || permit.payloadHash !== request.payloadHash
      || permit.dispatchOrdinal !== request.dispatchOrdinal
      || permit.idempotencyKey !== request.idempotencyKey
      || permit.issuedAtMilliseconds !== request.permitIssuedAtMilliseconds
    ) fail("FAKE_BINDING_MISMATCH");
  }

  get journal(): SyntheticHardTransportJournalV1 {
    return this.#journal;
  }

  get callCount(): number {
    return this.#upstream.callCount;
  }

  get fullyConsumed(): boolean {
    return this.#journal.reservations.every((item) => item.state === "completed" || item.state === "delivery_unknown");
  }

  bodyFreeSummary(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      schemaVersion: "fake_transport_summary.v1",
      cycleIdHash: canonicalSha256(this.#journal.cycleId),
      dispatchCount: this.#journal.reservations.length,
      fakeUpstreamCallCount: this.callCount,
      fullyConsumed: this.fullyConsumed,
      burned: this.#burned,
      journalHash: canonicalSha256(JSON.parse(canonicalJson(this.#journal))),
      providerBytes: 0,
      actualSpendUsd: 0,
    });
  }
}
