import { randomUUID } from "node:crypto";
import {
  canonicalJson,
  canonicalSha256,
  validateDispatchPermitV1,
  validateFreshCycleReservationV1,
  validateInteractionV1,
  validateResponseCandidateV1,
  validateSessionEnvelopeV1,
  validateSessionReceiptV1,
  type InteractionV1,
  type ProjectionOwnerState,
  type SessionEnvelopeV1,
} from "../../r4-protocol/src/index.ts";
import { sha256, stableJson } from "./body-free.ts";
import { SnapshotQueryBroker } from "./broker.ts";
import type {
  DispatchPermit,
  FreshCycleReservation,
  FreshSessionEvent,
  Hash,
  ResponseCandidate,
  SessionBudget,
  SessionReceipt,
  SnapshotAccessAggregate,
} from "./types.ts";

interface InteractionAuthority {
  interactionId: string;
  responseEligible: boolean;
  terminal: string | null;
  cycle: FreshCycleReservation | null;
  permits: DispatchPermit[];
  unknownDispatchBurned: boolean;
}

function exactTimestamp(date: Date): string {
  return date.toISOString();
}

function receiptExpiry(completedAt: Date): string {
  return new Date(completedAt.getTime() + 30 * 24 * 60 * 60 * 1_000).toISOString();
}

export class SyntheticFreshAuthority {
  private readonly interactions = new Map<string, InteractionAuthority>();

  addInteraction(interactionId: string): void {
    if (this.interactions.has(interactionId)) throw new Error("Interaction already exists");
    this.interactions.set(interactionId, {
      interactionId,
      responseEligible: true,
      terminal: null,
      cycle: null,
      permits: [],
      unknownDispatchBurned: false,
    });
  }

  reserve(input: {
    interactionId: string;
    startAuthorizationHash: Hash;
    sessionEnvelopeHash: Hash;
    idempotencyKey: string;
    now: Date;
  }): FreshCycleReservation {
    const authority = this.get(input.interactionId);
    if (!authority.responseEligible || authority.terminal) throw new Error("Interaction is not response-eligible");
    if (authority.cycle && authority.cycle.state !== "released_zero_dispatch") {
      if (
        authority.cycle.idempotencyKey === input.idempotencyKey
        && authority.cycle.startAuthorizationHash === input.startAuthorizationHash
        && authority.cycle.sessionEnvelopeHash === input.sessionEnvelopeHash
      ) return structuredClone(authority.cycle);
      throw new Error("Fresh cycle conflict");
    }
    const cycle = validateFreshCycleReservationV1({
      schemaVersion: "fresh_cycle_reservation.v1",
      reservationId: `reservation_${randomUUID().replaceAll("-", "")}`,
      interactionId: input.interactionId,
      startAuthorizationHash: input.startAuthorizationHash,
      sessionEnvelopeHash: input.sessionEnvelopeHash,
      state: "reserved",
      idempotencyKey: input.idempotencyKey,
      reservedAt: exactTimestamp(input.now),
      firstDispatchCommittedAt: null,
      version: 1,
    });
    authority.cycle = cycle;
    authority.permits = [];
    authority.unknownDispatchBurned = false;
    return structuredClone(cycle);
  }

  releaseZeroDispatch(
    interactionId: string,
    attestation: { reservationId: string; transportJournalDispatches: 0 },
  ): FreshCycleReservation {
    const authority = this.get(interactionId);
    const cycle = authority.cycle;
    if (!cycle || cycle.reservationId !== attestation.reservationId) throw new Error("Fresh cycle not found");
    if (cycle.state === "released_zero_dispatch") return structuredClone(cycle);
    if (cycle.state !== "reserved" || authority.permits.length !== 0 || attestation.transportJournalDispatches !== 0) {
      throw new Error("zero-dispatch release denied");
    }
    authority.cycle = validateFreshCycleReservationV1({
      ...cycle,
      state: "released_zero_dispatch",
      version: cycle.version + 1,
    });
    return structuredClone(authority.cycle);
  }

  /**
   * Unknown transport outcome is represented by the canonical irreversible
   * `dispatch_committed` state plus a local fail-closed burn bit. It never
   * invents a second wire state.
   */
  burnUnknownDispatch(interactionId: string, reservationId: string, now = new Date()): FreshCycleReservation {
    const authority = this.get(interactionId);
    const cycle = authority.cycle;
    if (!cycle || cycle.reservationId !== reservationId || cycle.state === "released_zero_dispatch") {
      throw new Error("Fresh cycle not burnable");
    }
    authority.cycle = validateFreshCycleReservationV1({
      ...cycle,
      state: "dispatch_committed",
      firstDispatchCommittedAt: cycle.firstDispatchCommittedAt ?? exactTimestamp(now),
      version: cycle.version + 1,
    });
    authority.unknownDispatchBurned = true;
    return structuredClone(authority.cycle);
  }

  issuePermit(input: {
    interactionId: string;
    reservationId: string;
    sessionEnvelopeHash: Hash;
    provider: "OpenAI";
    modelId: string;
    payloadHash: Hash;
    dispatchOrdinal: number;
    idempotencyKey: string;
    now: Date;
  }): DispatchPermit {
    const authority = this.get(input.interactionId);
    if (!authority.responseEligible || authority.terminal || authority.unknownDispatchBurned) {
      throw new Error("dispatch permit denied by terminal state");
    }
    const cycle = authority.cycle;
    if (
      !cycle
      || cycle.reservationId !== input.reservationId
      || cycle.sessionEnvelopeHash !== input.sessionEnvelopeHash
      || (cycle.state !== "reserved" && cycle.state !== "dispatch_committed")
    ) throw new Error("dispatch permit cycle mismatch");
    const permitId = `permit_${sha256(input.idempotencyKey).slice(7, 39)}`;
    const existing = authority.permits.find((permit) => permit.permitId === permitId);
    if (existing) {
      if (
        existing.payloadHash !== input.payloadHash
        || existing.dispatchOrdinal !== input.dispatchOrdinal
        || existing.modelId !== input.modelId
        || existing.sessionEnvelopeHash !== input.sessionEnvelopeHash
        || existing.startAuthorizationHash !== cycle.startAuthorizationHash
      ) throw new Error("dispatch permit idempotency conflict");
      return structuredClone(existing);
    }
    if (input.dispatchOrdinal !== authority.permits.length + 1 || input.dispatchOrdinal > 3) {
      throw new Error("dispatch ordinal rejected");
    }
    const permit = validateDispatchPermitV1({
      schemaVersion: "dispatch_permit.v1",
      permitId,
      interactionId: input.interactionId,
      reservationId: input.reservationId,
      sessionEnvelopeHash: input.sessionEnvelopeHash,
      startAuthorizationHash: cycle.startAuthorizationHash,
      provider: input.provider,
      modelId: input.modelId,
      payloadHash: input.payloadHash,
      dispatchOrdinal: input.dispatchOrdinal,
      idempotencyKey: input.idempotencyKey,
      issuedAt: exactTimestamp(input.now),
      expiresAt: exactTimestamp(new Date(input.now.getTime() + 30_000)),
      consumedAt: null,
    });
    authority.permits.push(permit);
    if (input.dispatchOrdinal === 1 && cycle.state === "reserved") {
      authority.cycle = validateFreshCycleReservationV1({
        ...cycle,
        state: "dispatch_committed",
        firstDispatchCommittedAt: exactTimestamp(input.now),
        version: cycle.version + 1,
      });
    }
    return structuredClone(permit);
  }

  consumePermit(input: {
    interactionId: string;
    permitId: string;
    payloadHash: Hash;
    now: Date;
  }): DispatchPermit {
    const authority = this.get(input.interactionId);
    const index = authority.permits.findIndex((candidate) => candidate.permitId === input.permitId);
    const permit = index < 0 ? undefined : authority.permits[index];
    if (!permit || permit.payloadHash !== input.payloadHash) throw new Error("dispatch permit mismatch");
    if (permit.consumedAt !== null) throw new Error("dispatch permit already used");
    if (Date.parse(permit.expiresAt) <= input.now.getTime()) throw new Error("dispatch permit expired");
    const consumed = validateDispatchPermitV1({ ...permit, consumedAt: exactTimestamp(input.now) });
    authority.permits[index] = consumed;
    return structuredClone(consumed);
  }

  commitTerminal(interactionId: string, terminal: string): void {
    const authority = this.get(interactionId);
    authority.terminal = terminal;
    authority.responseEligible = false;
  }

  canPublish(interactionId: string): boolean {
    const authority = this.get(interactionId);
    return authority.responseEligible && authority.terminal === null;
  }

  inspect(interactionId: string): InteractionAuthority {
    return structuredClone(this.get(interactionId));
  }

  private get(interactionId: string): InteractionAuthority {
    const authority = this.interactions.get(interactionId);
    if (!authority) throw new Error("Interaction not found");
    return authority;
  }
}

export class FakeResponseTransportGate {
  readonly calls: {
    payloadHash: Hash;
    provider: "OpenAI";
    modelId: string;
    dispatchOrdinal: number;
    inputTokens: number;
    outputTokens: number;
    applicableSpendUsd: number | null;
  }[] = [];
  private readonly sentPermitIds = new Set<string>();

  send(input: {
    permit: DispatchPermit;
    payload: string;
    provider: "OpenAI";
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    applicableSpendUsd: number | null;
  }): void {
    if (
      input.permit.payloadHash !== sha256(input.payload)
      || input.permit.provider !== input.provider
      || input.permit.modelId !== input.modelId
      || input.permit.consumedAt === null
    ) throw new Error("fake transport gate binding mismatch");
    if (this.sentPermitIds.has(input.permit.permitId)) throw new Error("fake transport permit already sent");
    this.sentPermitIds.add(input.permit.permitId);
    this.calls.push({
      payloadHash: input.permit.payloadHash,
      provider: input.provider,
      modelId: input.modelId,
      dispatchOrdinal: input.permit.dispatchOrdinal,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      applicableSpendUsd: input.applicableSpendUsd,
    });
  }
}

export interface SyntheticHardTransportPolicyV1 {
  readonly schemaVersion: "synthetic_hard_transport_policy.v1";
  readonly gate: "gate_a_offline_analogue";
  readonly provider: "OpenAI";
  readonly modelId: string;
  readonly endpointClass: "openai_responses";
  readonly automaticRetry: false;
  readonly providerFallback: false;
  readonly modelFallback: false;
  readonly unknownUsageBehavior: "abort_without_candidate";
  readonly upstreamEnabled: false;
}

export interface SyntheticHardDispatchInput {
  readonly provider: string;
  readonly modelId: string;
  readonly endpointClass: string;
  readonly automaticRetryAttempt: boolean;
  readonly fallbackRequested: boolean;
  readonly priorTerminalFailure: boolean;
  readonly usageKnown: boolean;
  readonly spendKnown: boolean;
  readonly now: Date;
  readonly nextInputTokens: number;
  readonly nextMaxOutputTokens: number;
  readonly nextWorstCaseSpendUsd: number;
  readonly payloadHash: Hash;
  readonly idempotencyKey: string;
}

export interface SyntheticHardDispatchReservationV1 {
  readonly schemaVersion: "synthetic_hard_dispatch_reservation.v1";
  readonly reservationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: Hash;
  readonly dispatchOrdinal: number;
  readonly inputTokens: number;
  readonly maximumOutputTokens: number;
  readonly worstCaseSpendUsd: number;
  readonly cumulativeInputTokens: number;
  readonly cumulativeMaximumOutputTokens: number;
  readonly cumulativeWorstCaseSpendUsd: number;
  readonly state: "reserved" | "consumed";
  readonly reservedAt: string;
  readonly consumedAt: string | null;
  readonly upstreamEnabled: false;
}

export interface SyntheticHardTransportJournalV1 {
  readonly schemaVersion: "synthetic_hard_transport_journal.v1";
  readonly cycleId: string;
  readonly modelId: string;
  readonly preparedAt: string;
  readonly interactionId: string;
  readonly sessionEnvelopeId: string;
  readonly sessionEnvelopeHash: Hash;
  readonly startAuthorizationHash: Hash;
  readonly policyHash: Hash;
  readonly outputSchemaHash: Hash;
  readonly snapshotManifestHash: Hash | null;
  readonly budget: SessionBudget;
  readonly reservations: readonly SyntheticHardDispatchReservationV1[];
}

export const PACKET_P0_HARD_BUDGET: SessionBudget = Object.freeze({
  wallClockSeconds: 3_600,
  providerDispatches: 3,
  inputTokens: 128_000,
  outputTokens: 8_000,
  spend: Object.freeze({ mode: "incremental", maximumUsd: 1 }),
});

/**
 * Fake Gate A transport boundary. It never opens a socket; it proves that the
 * repository-side policy rejects every widening/unknown before recording a
 * synthetic dispatch reservation.
 */
export class SyntheticHardCeilingTransportGate {
  readonly policy: SyntheticHardTransportPolicyV1;
  readonly cycleId: string;
  readonly preparedAt: Date;
  readonly budget: SessionBudget;
  readonly binding: {
    readonly interactionId: string;
    readonly sessionEnvelopeId: string;
    readonly sessionEnvelopeHash: Hash;
    readonly startAuthorizationHash: Hash;
    readonly policyHash: Hash;
    readonly outputSchemaHash: Hash;
  };
  readonly snapshotBroker: SnapshotQueryBroker | null;
  private readonly authorityReservations: SyntheticHardDispatchReservationV1[] = [];

  constructor(input: {
    modelId: string;
    cycleId: string;
    preparedAt: Date;
    budget: SessionBudget;
    interactionId: string;
    sessionEnvelopeId: string;
    sessionEnvelopeHash: Hash;
    startAuthorizationHash: Hash;
    policyHash: Hash;
    outputSchemaHash: Hash;
    snapshotBroker?: SnapshotQueryBroker;
    restore?: SyntheticHardTransportJournalV1;
  }) {
    assertP0HardBudget(input.budget);
    if (!Number.isFinite(input.preparedAt.getTime())) throw new Error("transport preparedAt invalid");
    if (!/^[A-Za-z0-9_-]{16,128}$/u.test(input.cycleId)) throw new Error("transport cycle ID invalid");
    this.policy = {
      schemaVersion: "synthetic_hard_transport_policy.v1",
      gate: "gate_a_offline_analogue",
      provider: "OpenAI",
      modelId: input.modelId,
      endpointClass: "openai_responses",
      automaticRetry: false,
      providerFallback: false,
      modelFallback: false,
      unknownUsageBehavior: "abort_without_candidate",
      upstreamEnabled: false,
    };
    this.cycleId = input.cycleId;
    this.preparedAt = new Date(input.preparedAt);
    this.budget = structuredClone(input.budget);
    for (const hash of [input.sessionEnvelopeHash, input.startAuthorizationHash, input.policyHash, input.outputSchemaHash]) {
      if (!/^sha256:[a-f0-9]{64}$/u.test(hash)) throw new Error("transport authority binding hash invalid");
    }
    this.binding = Object.freeze({
      interactionId: input.interactionId,
      sessionEnvelopeId: input.sessionEnvelopeId,
      sessionEnvelopeHash: input.sessionEnvelopeHash,
      startAuthorizationHash: input.startAuthorizationHash,
      policyHash: input.policyHash,
      outputSchemaHash: input.outputSchemaHash,
    });
    this.snapshotBroker = input.snapshotBroker ?? null;
    if (input.restore) this.restore(input.restore);
  }

  get reservations(): readonly SyntheticHardDispatchReservationV1[] {
    return structuredClone(this.authorityReservations);
  }

  reserve(input: SyntheticHardDispatchInput): SyntheticHardDispatchReservationV1 {
    if (
      input.provider !== this.policy.provider
      || input.modelId !== this.policy.modelId
      || input.endpointClass !== this.policy.endpointClass
    ) throw new Error("transport provider/model/endpoint switch denied");
    if (input.automaticRetryAttempt || input.fallbackRequested || input.priorTerminalFailure) {
      throw new Error("transport retry/fallback denied");
    }
    if (!input.usageKnown || !input.spendKnown) throw new Error("transport unknown usage/spend denied");
    if (!/^[A-Za-z0-9_-]{16,128}$/u.test(input.idempotencyKey)) throw new Error("transport idempotency key invalid");
    const existing = this.authorityReservations.find((item) => item.idempotencyKey === input.idempotencyKey);
    if (existing) {
      if (
        existing.payloadHash !== input.payloadHash
        || existing.inputTokens !== input.nextInputTokens
        || existing.maximumOutputTokens !== input.nextMaxOutputTokens
        || existing.worstCaseSpendUsd !== input.nextWorstCaseSpendUsd
      ) throw new Error("transport idempotency conflict");
      return structuredClone(existing);
    }
    const previous = this.authorityTotals();
    enforceSessionBudget({
      budget: this.budget,
      preparedAt: this.preparedAt,
      now: input.now,
      previousDispatches: previous.dispatches,
      previousInputTokens: previous.inputTokens,
      previousOutputTokens: previous.outputTokens,
      previousSpendUsd: previous.spendUsd,
      nextInputTokens: input.nextInputTokens,
      nextMaxOutputTokens: input.nextMaxOutputTokens,
      nextWorstCaseSpendUsd: input.nextWorstCaseSpendUsd,
    });
    const reservation: SyntheticHardDispatchReservationV1 = {
      schemaVersion: "synthetic_hard_dispatch_reservation.v1",
      reservationId: `reservation_${sha256(stableJson({ cycleId: this.cycleId, idempotencyKey: input.idempotencyKey })).slice(7, 39)}`,
      idempotencyKey: input.idempotencyKey,
      payloadHash: input.payloadHash,
      dispatchOrdinal: previous.dispatches + 1,
      inputTokens: input.nextInputTokens,
      maximumOutputTokens: input.nextMaxOutputTokens,
      worstCaseSpendUsd: input.nextWorstCaseSpendUsd,
      cumulativeInputTokens: previous.inputTokens + input.nextInputTokens,
      cumulativeMaximumOutputTokens: previous.outputTokens + input.nextMaxOutputTokens,
      cumulativeWorstCaseSpendUsd: previous.spendUsd + input.nextWorstCaseSpendUsd,
      state: "reserved",
      reservedAt: input.now.toISOString(),
      consumedAt: null,
      upstreamEnabled: false as const,
    };
    this.authorityReservations.push(reservation);
    return structuredClone(reservation);
  }

  consume(input: { reservationId: string; payloadHash: Hash; now: Date }): SyntheticHardDispatchReservationV1 {
    const index = this.authorityReservations.findIndex((item) => item.reservationId === input.reservationId);
    const reservation = index < 0 ? undefined : this.authorityReservations[index];
    if (!reservation || reservation.payloadHash !== input.payloadHash) throw new Error("transport reservation mismatch");
    if (reservation.state !== "reserved" || reservation.consumedAt !== null) throw new Error("transport reservation already consumed");
    if (!Number.isFinite(input.now.getTime()) || input.now.getTime() < Date.parse(reservation.reservedAt)) {
      throw new Error("transport consume time invalid");
    }
    const consumed: SyntheticHardDispatchReservationV1 = {
      ...reservation,
      state: "consumed",
      consumedAt: input.now.toISOString(),
    };
    this.authorityReservations[index] = consumed;
    return structuredClone(consumed);
  }

  exportJournal(): SyntheticHardTransportJournalV1 {
    return {
      schemaVersion: "synthetic_hard_transport_journal.v1",
      cycleId: this.cycleId,
      modelId: this.policy.modelId,
      preparedAt: this.preparedAt.toISOString(),
      ...this.binding,
      snapshotManifestHash: this.snapshotBroker?.snapshot.manifest.manifestHash ?? null,
      budget: structuredClone(this.budget),
      reservations: structuredClone(this.authorityReservations),
    };
  }

  authorityOwnedSnapshotAccess(broker: SnapshotQueryBroker): SnapshotAccessAggregate {
    if (this.snapshotBroker === null || broker !== this.snapshotBroker) {
      throw new Error("transport SnapshotQueryBroker authority binding mismatch");
    }
    const access = this.snapshotBroker.aggregate();
    const accountedInputTokens = this.authorityTotals().inputTokens;
    // Gate A uses the conservative one-returned-byte == one-input-token
    // analogue. This cannot undercount provider input and therefore proves the
    // Packet ceiling without claiming a provider tokenizer implementation.
    if (access.resultBytes > accountedInputTokens) {
      throw new Error("transport input budget undercounts broker result bytes");
    }
    return access;
  }

  private authorityTotals(): { dispatches: number; inputTokens: number; outputTokens: number; spendUsd: number } {
    return this.authorityReservations.reduce((totals, item) => ({
      dispatches: totals.dispatches + 1,
      inputTokens: totals.inputTokens + item.inputTokens,
      outputTokens: totals.outputTokens + item.maximumOutputTokens,
      spendUsd: totals.spendUsd + item.worstCaseSpendUsd,
    }), { dispatches: 0, inputTokens: 0, outputTokens: 0, spendUsd: 0 });
  }

  private restore(journal: SyntheticHardTransportJournalV1): void {
    if (
      journal.schemaVersion !== "synthetic_hard_transport_journal.v1"
      || journal.cycleId !== this.cycleId
      || journal.modelId !== this.policy.modelId
      || journal.preparedAt !== this.preparedAt.toISOString()
      || journal.interactionId !== this.binding.interactionId
      || journal.sessionEnvelopeId !== this.binding.sessionEnvelopeId
      || journal.sessionEnvelopeHash !== this.binding.sessionEnvelopeHash
      || journal.startAuthorizationHash !== this.binding.startAuthorizationHash
      || journal.policyHash !== this.binding.policyHash
      || journal.outputSchemaHash !== this.binding.outputSchemaHash
      || journal.snapshotManifestHash !== (this.snapshotBroker?.snapshot.manifest.manifestHash ?? null)
      || stableJson(journal.budget) !== stableJson(this.budget)
    ) throw new Error("transport journal binding mismatch");
    for (const [index, raw] of journal.reservations.entries()) {
      if (
        raw.schemaVersion !== "synthetic_hard_dispatch_reservation.v1"
        || raw.dispatchOrdinal !== index + 1
        || raw.reservationId !== `reservation_${sha256(stableJson({ cycleId: this.cycleId, idempotencyKey: raw.idempotencyKey })).slice(7, 39)}`
        || (raw.state === "reserved") !== (raw.consumedAt === null)
      ) throw new Error("transport journal reservation malformed");
      const totals = this.authorityTotals();
      enforceSessionBudget({
        budget: this.budget,
        preparedAt: this.preparedAt,
        now: new Date(raw.reservedAt),
        previousDispatches: totals.dispatches,
        previousInputTokens: totals.inputTokens,
        previousOutputTokens: totals.outputTokens,
        previousSpendUsd: totals.spendUsd,
        nextInputTokens: raw.inputTokens,
        nextMaxOutputTokens: raw.maximumOutputTokens,
        nextWorstCaseSpendUsd: raw.worstCaseSpendUsd,
      });
      if (
        raw.cumulativeInputTokens !== totals.inputTokens + raw.inputTokens
        || raw.cumulativeMaximumOutputTokens !== totals.outputTokens + raw.maximumOutputTokens
        || Math.abs(raw.cumulativeWorstCaseSpendUsd - (totals.spendUsd + raw.worstCaseSpendUsd)) > Number.EPSILON
      ) throw new Error("transport journal cumulative totals mismatch");
      this.authorityReservations.push(structuredClone(raw));
    }
  }
}

function assertP0HardBudget(budget: SessionBudget): void {
  nonNegativeSafeInteger(budget.wallClockSeconds, "wall budget");
  nonNegativeSafeInteger(budget.providerDispatches, "dispatch budget");
  nonNegativeSafeInteger(budget.inputTokens, "input budget");
  nonNegativeSafeInteger(budget.outputTokens, "output budget");
  if (
    budget.wallClockSeconds <= 0
    || budget.wallClockSeconds > PACKET_P0_HARD_BUDGET.wallClockSeconds
    || budget.providerDispatches > PACKET_P0_HARD_BUDGET.providerDispatches
    || budget.inputTokens > PACKET_P0_HARD_BUDGET.inputTokens
    || budget.outputTokens > PACKET_P0_HARD_BUDGET.outputTokens
  ) throw new Error("transport budget widens Packet P0 ceiling");
  if (budget.spend.mode === "incremental") {
    nonNegativeFinite(budget.spend.maximumUsd, "spend budget");
    if (budget.spend.maximumUsd > 1) throw new Error("transport budget widens Packet P0 ceiling");
  } else if (budget.spend.maximumUsd !== null) {
    throw new Error("transport spend budget invalid");
  }
}

function nonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`session ${label} is unknown or invalid`);
}

function nonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`session ${label} is unknown or invalid`);
}

export function enforceSessionBudget(input: {
  budget: SessionBudget;
  preparedAt: Date;
  now: Date;
  previousDispatches: number;
  previousInputTokens: number;
  previousOutputTokens: number;
  previousSpendUsd: number;
  nextInputTokens: number;
  nextMaxOutputTokens: number;
  nextWorstCaseSpendUsd: number;
}): void {
  nonNegativeSafeInteger(input.budget.wallClockSeconds, "wall budget");
  nonNegativeSafeInteger(input.budget.providerDispatches, "dispatch budget");
  nonNegativeSafeInteger(input.budget.inputTokens, "input budget");
  nonNegativeSafeInteger(input.budget.outputTokens, "output budget");
  nonNegativeSafeInteger(input.previousDispatches, "previous dispatch count");
  nonNegativeSafeInteger(input.previousInputTokens, "previous input usage");
  nonNegativeSafeInteger(input.previousOutputTokens, "previous output usage");
  nonNegativeSafeInteger(input.nextInputTokens, "next input usage");
  nonNegativeSafeInteger(input.nextMaxOutputTokens, "next output ceiling");
  nonNegativeFinite(input.previousSpendUsd, "previous spend");
  nonNegativeFinite(input.nextWorstCaseSpendUsd, "next spend reservation");
  if (!Number.isFinite(input.preparedAt.getTime()) || !Number.isFinite(input.now.getTime()) || input.now.getTime() < input.preparedAt.getTime()) {
    throw new Error("session time state is unknown or invalid");
  }
  if (input.now.getTime() - input.preparedAt.getTime() >= input.budget.wallClockSeconds * 1_000) {
    throw new Error("session wall budget exceeded");
  }
  if (input.previousDispatches + 1 > input.budget.providerDispatches) throw new Error("session dispatch budget exceeded");
  if (input.previousInputTokens + input.nextInputTokens > input.budget.inputTokens) throw new Error("session input budget exceeded");
  if (input.previousOutputTokens + input.nextMaxOutputTokens > input.budget.outputTokens) throw new Error("session output budget exceeded");
  if (input.budget.spend.mode === "not_applicable") {
    if (input.previousSpendUsd !== 0 || input.nextWorstCaseSpendUsd !== 0) throw new Error("session spend is not applicable");
  } else if (input.previousSpendUsd + input.nextWorstCaseSpendUsd > input.budget.spend.maximumUsd + Number.EPSILON) {
    throw new Error("session spend budget exceeded");
  }
}

const TRUSTED_FRESH_ADMISSION_EVIDENCE = new WeakMap<object, {
  readonly eventStreamHash: Hash;
  readonly observedOutputSchemaHash: Hash;
  readonly sessionReceipt: SessionReceipt;
  readonly transportJournalHash: Hash;
}>();

export interface TrustedFreshAdmissionEvidenceV1 {
  readonly schemaVersion: "trusted_fresh_admission_evidence.v1";
  readonly eventStreamHash: Hash;
  readonly observedOutputSchemaHash: Hash;
  readonly sessionReceipt: SessionReceipt;
  readonly transportJournalHash: Hash;
}

/**
 * Finalizes Gate A source evidence from authority-owned transport state. The
 * returned object is accepted only by identity; callers cannot substitute a
 * structurally similar receipt/boolean bundle.
 */
export function finalizeSyntheticFreshAdmission(input: {
  transportGate: SyntheticHardCeilingTransportGate;
  events: FreshSessionEvent[];
  processExitCode: number | null;
  observedOutputSchemaHash: Hash;
  snapshotBroker: SnapshotQueryBroker;
  outputTokens: number;
  applicableSpendUsd: number | null;
  startedAt: Date;
  completedAt: Date;
  runtimeVersion?: string;
  expiresAt?: Date;
}): TrustedFreshAdmissionEvidenceV1 {
  if (input.processExitCode !== 0) throw new Error("Fresh admission evidence denied: process exit was not zero");
  const journal = input.transportGate.exportJournal();
  if (journal.reservations.length === 0 || journal.reservations.some((reservation) => reservation.state !== "consumed")) {
    throw new Error("Fresh admission evidence denied: transport journal is not fully consumed/reconciled");
  }
  const inputTokens = journal.reservations.reduce((total, reservation) => total + reservation.inputTokens, 0);
  const maximumOutput = journal.reservations.reduce((total, reservation) => total + reservation.maximumOutputTokens, 0);
  const maximumSpend = journal.reservations.reduce((total, reservation) => total + reservation.worstCaseSpendUsd, 0);
  nonNegativeSafeInteger(input.outputTokens, "actual output usage");
  if (input.outputTokens > maximumOutput) throw new Error("Fresh admission evidence denied: output usage exceeds reservations");
  if (journal.budget.spend.mode === "not_applicable") {
    if (input.applicableSpendUsd !== null) throw new Error("Fresh admission evidence denied: spend is not applicable");
  } else if (
    input.applicableSpendUsd === null
    || !Number.isFinite(input.applicableSpendUsd)
    || input.applicableSpendUsd < 0
    || input.applicableSpendUsd > maximumSpend + Number.EPSILON
  ) throw new Error("Fresh admission evidence denied: spend exceeds reservations");
  if (
    input.startedAt.getTime() < input.transportGate.preparedAt.getTime()
    || input.completedAt.getTime() < input.startedAt.getTime()
    || input.completedAt.getTime() - input.transportGate.preparedAt.getTime() >= input.transportGate.budget.wallClockSeconds * 1_000
  ) throw new Error("Fresh admission evidence denied: chronology outside authority");
  const access = input.transportGate.authorityOwnedSnapshotAccess(input.snapshotBroker);
  const sessionReceipt = candidateSessionReceipt({
    interactionId: input.transportGate.binding.interactionId,
    sessionEnvelopeId: input.transportGate.binding.sessionEnvelopeId,
    sessionEnvelopeHash: input.transportGate.binding.sessionEnvelopeHash,
    provider: "OpenAI",
    modelId: input.transportGate.policy.modelId,
    dispatches: journal.reservations.length,
    inputTokens,
    outputTokens: input.outputTokens,
    applicableSpendUsd: input.applicableSpendUsd,
    policyHash: input.transportGate.binding.policyHash,
    schemaHash: input.transportGate.binding.outputSchemaHash,
    access,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    runtimeVersion: input.runtimeVersion,
    expiresAt: input.expiresAt,
  });
  const immutableReceipt = Object.freeze(structuredClone(sessionReceipt));
  const authorityRecord = Object.freeze({
    eventStreamHash: canonicalSha256(input.events),
    observedOutputSchemaHash: input.observedOutputSchemaHash,
    sessionReceipt: immutableReceipt,
    transportJournalHash: canonicalSha256(journal),
  });
  const evidence: TrustedFreshAdmissionEvidenceV1 = Object.freeze({
    schemaVersion: "trusted_fresh_admission_evidence.v1",
    ...authorityRecord,
  });
  TRUSTED_FRESH_ADMISSION_EVIDENCE.set(evidence, authorityRecord);
  return evidence;
}

export function extractCandidateFromCompletedTurn(input: {
  events: FreshSessionEvent[];
  authorizedThreadId: string;
  authorizedTurnId: string;
  expectedProvider: string;
  expectedModel: string;
  expectedOutputSchemaHash: Hash;
  admissionEvidence: TrustedFreshAdmissionEvidenceV1;
  sessionEnvelope: SessionEnvelopeV1;
  expectedSessionEnvelopeHash: Hash;
  currentInteraction: InteractionV1;
  currentOriginStateAtCompilation: ProjectionOwnerState;
  currentTwinBasisHash: Hash;
  currentPolicyHash: Hash;
  admittedAt: Date;
  expiresAt: Date;
}): ResponseCandidate {
  const authorityEvidence = TRUSTED_FRESH_ADMISSION_EVIDENCE.get(input.admissionEvidence);
  if (!authorityEvidence) {
    throw new Error("candidate denied: untrusted Fresh admission evidence");
  }
  if (authorityEvidence.eventStreamHash !== canonicalSha256(input.events)) {
    throw new Error("candidate denied: event stream evidence mismatch");
  }
  if (authorityEvidence.observedOutputSchemaHash !== input.expectedOutputSchemaHash) {
    throw new Error("candidate denied: output schema hash mismatch");
  }
  let startedThread = false;
  let startedTurn = false;
  let completedTurn = false;
  const finals: string[] = [];
  for (const event of input.events) {
    if (completedTurn) throw new Error("candidate denied: event after turn completion");
    if (event.threadId !== input.authorizedThreadId) throw new Error("candidate denied: wrong thread");
    if (event.turnId !== null && event.turnId !== input.authorizedTurnId) throw new Error("candidate denied: wrong turn");
    if (event.type === "model_rerouted" || (event.provider && event.provider !== input.expectedProvider) || (event.model && event.model !== input.expectedModel)) {
      throw new Error("candidate denied: provider/model reroute");
    }
    if (event.type === "tool_failed") throw new Error("candidate denied: failed tool");
    if (event.type === "thread_started") {
      if (startedThread || startedTurn || event.turnId !== null) throw new Error("candidate denied: thread ordering");
      startedThread = true;
    }
    if (event.type === "turn_started") {
      if (!startedThread || startedTurn) throw new Error("candidate denied: turn ordering");
      startedTurn = true;
    }
    if (event.type === "item_completed" && !startedTurn) throw new Error("candidate denied: item before turn start");
    if (event.type === "item_completed" && event.item?.itemType === "agent_message" && event.item.phase === "final_answer") {
      finals.push(event.item.text);
    }
    if (event.type === "turn_completed") {
      if (!startedTurn || event.turnStatus !== "completed") throw new Error("candidate denied: turn not completed");
      if (completedTurn) throw new Error("candidate denied: duplicate turn completion");
      completedTurn = true;
    }
  }
  if (!startedThread || !startedTurn || !completedTurn || finals.length !== 1) {
    throw new Error("candidate denied: incomplete or ambiguous final answer");
  }
  const exactFinal = finals[0] ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(exactFinal);
  } catch {
    throw new Error("candidate denied: final answer is not exact JSON");
  }
  if (
    parsed === null
    || typeof parsed !== "object"
    || Array.isArray(parsed)
    || Object.keys(parsed).length !== 1
    || typeof (parsed as { responseText?: unknown }).responseText !== "string"
    || canonicalJson(parsed) !== exactFinal
  ) {
    throw new Error("candidate denied: final answer is not canonical JSON");
  }
  const envelope = validateSessionEnvelopeV1(input.sessionEnvelope);
  const envelopeHash = canonicalSha256(envelope);
  const receipt = validateSessionReceiptV1(authorityEvidence.sessionReceipt);
  const interaction = validateInteractionV1(input.currentInteraction);
  if (envelopeHash !== input.expectedSessionEnvelopeHash) throw new Error("candidate denied: Session Envelope hash drift");
  if (
    envelope.interactionId !== interaction.interactionId
    || interaction.consent !== "allow_owner_local_ai"
    || interaction.consentEnvelope === null
    || envelope.consentEnvelopeId !== interaction.consentEnvelope.consentEnvelopeId
    || envelope.consentEnvelopeHash !== canonicalSha256(interaction.consentEnvelope)
    || envelope.sessionEnvelopeId !== receipt.sessionEnvelopeId
    || envelopeHash !== receipt.sessionEnvelopeHash
    || envelope.provider !== input.expectedProvider
    || envelope.modelId !== input.expectedModel
    || envelope.outputSchemaHash !== input.expectedOutputSchemaHash
    || receipt.interactionId !== interaction.interactionId
    || receipt.provider !== input.expectedProvider
    || receipt.modelId !== input.expectedModel
    || receipt.terminalStatus !== "candidate_admitted"
    || receipt.dispatches < 1
    || receipt.policyHash !== input.currentPolicyHash
    || envelope.sourcePolicyHash !== input.currentPolicyHash
    || receipt.schemaHash !== envelope.outputSchemaHash
  ) throw new Error("candidate denied: Session Envelope/receipt/current-state binding drift");
  if (
    interaction.state !== "accepted"
    && interaction.state !== "seen_locally"
    && interaction.state !== "preparing"
  ) throw new Error("candidate denied: Interaction is not response-eligible");
  if (input.currentOriginStateAtCompilation === "revoked") throw new Error("candidate denied: origin revoked");
  if (!(["published_fresh", "stale", "superseded", "expired"] as const).includes(input.currentOriginStateAtCompilation as never)) {
    throw new Error("candidate denied: origin state invalid");
  }
  if (
    !Number.isFinite(input.admittedAt.getTime())
    || !Number.isFinite(input.expiresAt.getTime())
    || input.expiresAt.getTime() <= input.admittedAt.getTime()
    || Date.parse(receipt.finishedAt) >= input.admittedAt.getTime()
    || Date.parse(receipt.startedAt) < Date.parse(interaction.acceptedAt)
    || input.admittedAt.getTime() >= Date.parse(envelope.authorityExpiresAt)
    || input.admittedAt.getTime() >= Date.parse(interaction.expiresAt)
    || input.expiresAt.getTime() > Date.parse(interaction.expiresAt)
    || input.expiresAt.getTime() > Date.parse(receipt.expiresAt)
    || Date.parse(receipt.startedAt) < Date.parse(envelope.preparedAt)
  ) throw new Error("candidate denied: candidate time authority invalid");
  const sessionReceiptHash = canonicalSha256(receipt);
  const responseText = (parsed as { responseText: string }).responseText;
  const candidatePreimage: Omit<ResponseCandidate, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: `candidate_${canonicalSha256({ envelopeHash, sessionReceiptHash, responseText }).slice(7, 39)}`,
    interactionId: interaction.interactionId,
    sessionEnvelopeId: envelope.sessionEnvelopeId,
    roomId: interaction.roomId,
    projectionId: interaction.projectionId,
    originState: input.currentOriginStateAtCompilation,
    responseText,
    sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
    twinBasisHash: input.currentTwinBasisHash,
    snapshotManifestHash: envelope.snapshotManifestHash,
    sessionReceiptHash,
    policyHash: input.currentPolicyHash,
    admittedAt: input.admittedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  };
  return validateResponseCandidateV1({ ...candidatePreimage, candidateHash: canonicalSha256(candidatePreimage) });
}

/** Trusted Owner-authored lane. No model event or Session Envelope is accepted. */
export function buildManualOwnerCandidate(input: {
  currentInteraction: InteractionV1;
  currentOriginStateAtCompilation: ProjectionOwnerState;
  sessionReceipt: SessionReceipt;
  responseText: string;
  currentTwinBasisHash: Hash;
  currentPolicyHash: Hash;
  admittedAt: Date;
  expiresAt: Date;
}): ResponseCandidate {
  const interaction = validateInteractionV1(input.currentInteraction);
  const receipt = validateSessionReceiptV1(input.sessionReceipt);
  if (
    receipt.terminalStatus !== "manual_only"
    || receipt.interactionId !== interaction.interactionId
    || receipt.sessionEnvelopeId !== null
    || receipt.sessionEnvelopeHash !== null
    || receipt.policyHash !== input.currentPolicyHash
  ) throw new Error("manual candidate denied: manual receipt/current-state binding drift");
  if (
    interaction.state !== "accepted"
    && interaction.state !== "seen_locally"
    && interaction.state !== "preparing"
  ) throw new Error("manual candidate denied: Interaction is not response-eligible");
  if (input.currentOriginStateAtCompilation === "revoked") throw new Error("manual candidate denied: origin revoked");
  if (!(["published_fresh", "stale", "superseded", "expired"] as const).includes(input.currentOriginStateAtCompilation as never)) {
    throw new Error("manual candidate denied: origin state invalid");
  }
  if (
    !Number.isFinite(input.admittedAt.getTime())
    || !Number.isFinite(input.expiresAt.getTime())
    || input.expiresAt.getTime() <= input.admittedAt.getTime()
    || Date.parse(receipt.finishedAt) >= input.admittedAt.getTime()
    || Date.parse(receipt.startedAt) < Date.parse(interaction.acceptedAt)
    || input.admittedAt.getTime() >= Date.parse(interaction.expiresAt)
    || input.expiresAt.getTime() > Date.parse(interaction.expiresAt)
    || input.expiresAt.getTime() > Date.parse(receipt.expiresAt)
  ) throw new Error("manual candidate denied: candidate time authority invalid");
  const sessionReceiptHash = canonicalSha256(receipt);
  const preimage: Omit<ResponseCandidate, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: `candidate_${canonicalSha256({
      interactionId: interaction.interactionId,
      sessionReceiptHash,
      responseText: input.responseText,
    }).slice(7, 39)}`,
    interactionId: interaction.interactionId,
    sessionEnvelopeId: null,
    roomId: interaction.roomId,
    projectionId: interaction.projectionId,
    originState: input.currentOriginStateAtCompilation,
    responseText: input.responseText,
    sourceDisclosureClass: "manual_owner_authored",
    twinBasisHash: input.currentTwinBasisHash,
    snapshotManifestHash: null,
    sessionReceiptHash,
    policyHash: input.currentPolicyHash,
    admittedAt: input.admittedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  };
  return validateResponseCandidateV1({ ...preimage, candidateHash: canonicalSha256(preimage) });
}

export function manualOnlyReceipt(input: {
  interactionId: string;
  completedAt: Date;
  startedAt?: Date;
  policyHash?: Hash;
  schemaHash?: Hash;
  runtimeVersion?: string;
  expiresAt?: Date;
}): SessionReceipt {
  return validateSessionReceiptV1({
    schemaVersion: "session_receipt.v1",
    receiptId: `receipt_${randomUUID().replaceAll("-", "")}`,
    interactionId: input.interactionId,
    sessionEnvelopeId: null,
    sessionEnvelopeHash: null,
    startedAt: (input.startedAt ?? input.completedAt).toISOString(),
    finishedAt: input.completedAt.toISOString(),
    provider: null,
    modelId: null,
    terminalStatus: "manual_only",
    dispatches: 0,
    inputTokens: 0,
    outputTokens: 0,
    applicableSpendUsd: null,
    sourceQueryCount: 0,
    sourceResultBytes: 0,
    accessEvidenceDigest: null,
    policyHash: input.policyHash ?? sha256("manual-only-policy"),
    schemaHash: input.schemaHash ?? sha256("manual-only-output-schema"),
    runtimeVersion: input.runtimeVersion ?? "manual-only.v1",
    errorCode: null,
    expiresAt: (input.expiresAt ?? new Date(receiptExpiry(input.completedAt))).toISOString(),
  });
}

export function candidateSessionReceipt(input: {
  interactionId: string;
  sessionEnvelopeId: string;
  sessionEnvelopeHash: Hash;
  provider: "OpenAI";
  modelId: string;
  dispatches: number;
  inputTokens: number;
  outputTokens: number;
  applicableSpendUsd: number | null;
  policyHash: Hash;
  schemaHash: Hash;
  access: SnapshotAccessAggregate;
  startedAt: Date;
  completedAt: Date;
  runtimeVersion?: string;
  expiresAt?: Date;
}): SessionReceipt {
  const receiptHashInput = {
    interactionId: input.interactionId,
    sessionEnvelopeId: input.sessionEnvelopeId,
    sessionEnvelopeHash: input.sessionEnvelopeHash,
    provider: input.provider,
    modelId: input.modelId,
    dispatches: input.dispatches,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    applicableSpendUsd: input.applicableSpendUsd,
    policyHash: input.policyHash,
    schemaHash: input.schemaHash,
    access: input.access,
    runtimeVersion: input.runtimeVersion ?? "synthetic-fresh.v1",
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    expiresAt: input.expiresAt?.toISOString() ?? null,
  };
  return validateSessionReceiptV1({
    schemaVersion: "session_receipt.v1",
    receiptId: `receipt_${sha256(stableJson(receiptHashInput)).slice(7, 39)}`,
    interactionId: input.interactionId,
    sessionEnvelopeId: input.sessionEnvelopeId,
    sessionEnvelopeHash: input.sessionEnvelopeHash,
    startedAt: input.startedAt.toISOString(),
    finishedAt: input.completedAt.toISOString(),
    provider: input.provider,
    modelId: input.modelId,
    terminalStatus: "candidate_admitted",
    dispatches: input.dispatches,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    applicableSpendUsd: input.applicableSpendUsd,
    sourceQueryCount: input.access.queryCount,
    sourceResultBytes: input.access.resultBytes,
    accessEvidenceDigest: input.access.accessDigest,
    policyHash: input.policyHash,
    schemaHash: input.schemaHash,
    runtimeVersion: input.runtimeVersion ?? "synthetic-fresh.v1",
    errorCode: null,
    expiresAt: (input.expiresAt ?? new Date(receiptExpiry(input.completedAt))).toISOString(),
  });
}
