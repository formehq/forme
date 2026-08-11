import {
  PUBLIC_CORE_ACTION_NAMES,
  type PublicCoreActionName,
} from "./public-core-policy.ts";

const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const PUBLIC_CORE_RETENTION_CEILINGS_MS = Object.freeze({
  pairingMaterial: 10 * MINUTE_MS,
  publicEncounter: 24 * HOUR_MS,
  projectionBody: 7 * DAY_MS,
  interactionBody: 30 * DAY_MS,
  rateEvent: 25 * HOUR_MS,
  roomEventOrOrdinaryReceipt: 37 * DAY_MS,
  interactionTerminalTombstone: 37 * DAY_MS,
  purgeTarget: 24 * HOUR_MS,
  mutationStopAfter: 36 * HOUR_MS,
} as const);

export type PublicCoreRetainedDataKind =
  | "interaction_body"
  | "interaction_terminal_tombstone"
  | "mutation_receipt"
  | "pairing_material"
  | "projection_body"
  | "public_encounter"
  | "rate_event"
  | "room_event";

export type PublicCorePurgeTargetKind =
  | "interaction_body"
  | "interaction_tombstone"
  | "mutation_receipt"
  | "pairing_material"
  | "projection_body"
  | "public_encounter"
  | "rate_event"
  | "room_event";

const PURGE_KIND_ORDER: Readonly<Record<PublicCorePurgeTargetKind, number>> = Object.freeze({
  pairing_material: 0,
  public_encounter: 1,
  projection_body: 2,
  interaction_body: 3,
  rate_event: 4,
  room_event: 5,
  mutation_receipt: 6,
  interaction_tombstone: 7,
});

const READ_ACTIONS = new Set<PublicCoreActionName>([
  "third_place.list",
  "projection.read",
  "interaction.read",
  "room_operator.status",
]);

export interface PublicCoreRetentionHealthV1 {
  readonly schemaVersion: "r4_public_core_retention_health.v1";
  readonly lastSuccessfulPurgeAt: string;
}

export interface PublicCoreRetentionGateInput {
  readonly action: PublicCoreActionName;
  readonly now: string;
  readonly health: PublicCoreRetentionHealthV1;
  readonly roomModeTransition?: Readonly<{
    from: "closed" | "public_single";
    to: "closed" | "public_single";
  }>;
  readonly pullReplay?: Readonly<{
    committedReceipt: boolean;
    sameKeyAndHash: boolean;
  }>;
}

export interface PublicCoreProjectionRetentionInput {
  readonly publicationAt: string;
  readonly hardExpiresAt: string;
  readonly now: string;
  readonly lifecycle: "current" | "revoked" | "superseded";
  readonly admission: "admitted" | "not_admitted" | "unlisted";
  readonly freshness: "fresh" | "stale";
}

export interface PublicCoreProjectionRetentionDecisionV1 {
  readonly schemaVersion: "r4_public_core_projection_retention_decision.v1";
  readonly bodyReadable: boolean;
  readonly externallyTombstoned: boolean;
  readonly enqueuePurge: boolean;
  readonly reason: "current" | "hard_expired" | "retention_expired" | "revoked" | "superseded";
  readonly bodyDeadline: string;
}

export interface PublicCorePullRetentionInput {
  readonly interactionCreatedAt: string;
  readonly now: string;
  readonly bodyState: "deleted" | "origin_revoked" | "readable";
  readonly bodyVersion: number;
  readonly health: PublicCoreRetentionHealthV1;
  readonly replay: Readonly<{
    committedReceipt: boolean;
    sameKeyAndHash: boolean;
  }>;
}

export type PublicCorePullRetentionDecisionV1 =
  | Readonly<{
      schemaVersion: "r4_public_core_pull_retention_decision.v1";
      kind: "body";
      bodyReadable: true;
      bodyVersion: number;
      reason: "fresh" | "committed_replay";
    }>
  | Readonly<{
      schemaVersion: "r4_public_core_pull_retention_decision.v1";
      kind: "body_free_reconciliation";
      bodyReadable: false;
      bodyVersion: number;
      reason: "deleted" | "expired" | "revoked";
    }>;

export interface PublicCorePurgeTargetV1 {
  readonly jobId: string;
  readonly targetKind: PublicCorePurgeTargetKind;
  readonly targetId: string;
  readonly terminalAt: string;
  readonly purgeDueAt: string;
  readonly version: number;
}

export interface PublicCorePurgeResultV1 {
  readonly schemaVersion: "r4_public_core_purge_result.v1";
  readonly jobId: string;
  readonly targetKind: PublicCorePurgeTargetKind;
  readonly targetId: string;
  readonly outcome: "already_absent" | "failed" | "purged";
  readonly recordedAt: string;
  readonly bodyFree: true;
}

export interface PublicCoreJanitorPortV1 {
  tryAcquireSingletonAdvisoryLock(lockName: "forme_r4_public_core_retention.v1"): Promise<boolean>;
  listDueTargets(input: Readonly<{
    now: string;
    limit: number;
    targetKinds: readonly PublicCorePurgeTargetKind[];
  }>): Promise<Readonly<{
    targets: readonly PublicCorePurgeTargetV1[];
    hasMore: boolean;
  }>>;
  purgeTarget(target: PublicCorePurgeTargetV1): Promise<"already_absent" | "purged">;
  recordPurgeResult(result: PublicCorePurgeResultV1): Promise<void>;
  recordSuccessfulPurgeAt(now: string): Promise<void>;
  releaseSingletonAdvisoryLock(lockName: "forme_r4_public_core_retention.v1"): Promise<void>;
}

export interface PublicCoreJanitorRunV1 {
  readonly schemaVersion: "r4_public_core_janitor_run.v1";
  readonly status: "advisory_lock_held" | "backlog_remaining" | "completed" | "partial_failure";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly results: readonly PublicCorePurgeResultV1[];
  readonly bodyFree: true;
}

export class PublicCoreRetentionError extends Error {
  readonly code: string;
  readonly statusCode: 503;

  constructor(code: string) {
    super(code);
    this.name = "PublicCoreRetentionError";
    this.code = code;
    this.statusCode = 503;
  }

  toJSON(): Readonly<{ name: string; code: string; statusCode: 503 }> {
    return Object.freeze({ name: this.name, code: this.code, statusCode: this.statusCode });
  }
}

function fail(code: string): never {
  throw new PublicCoreRetentionError(code);
}

function instant(value: unknown): number {
  if (typeof value !== "string") fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  }
  return parsed;
}

function iso(value: number): string {
  if (!Number.isSafeInteger(value)) fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  return new Date(value).toISOString();
}

function retentionCeiling(kind: PublicCoreRetainedDataKind): number {
  switch (kind) {
    case "pairing_material": return PUBLIC_CORE_RETENTION_CEILINGS_MS.pairingMaterial;
    case "public_encounter": return PUBLIC_CORE_RETENTION_CEILINGS_MS.publicEncounter;
    case "projection_body": return PUBLIC_CORE_RETENTION_CEILINGS_MS.projectionBody;
    case "interaction_body": return PUBLIC_CORE_RETENTION_CEILINGS_MS.interactionBody;
    case "rate_event": return PUBLIC_CORE_RETENTION_CEILINGS_MS.rateEvent;
    case "room_event":
    case "mutation_receipt": return PUBLIC_CORE_RETENTION_CEILINGS_MS.roomEventOrOrdinaryReceipt;
    case "interaction_terminal_tombstone": return PUBLIC_CORE_RETENTION_CEILINGS_MS.interactionTerminalTombstone;
  }
}

/**
 * Every deadline is anchored to original creation/publication. Passing a later
 * terminal time cannot restart an Interaction's 30/37-day clocks.
 */
export function publicCoreRetentionDeadline(kind: PublicCoreRetainedDataKind, originalAt: string): string {
  return iso(instant(originalAt) + retentionCeiling(kind));
}

export function isPublicCorePurgeHealthStale(input: Readonly<{
  now: string;
  health: PublicCoreRetentionHealthV1;
}>): boolean {
  if (input.health.schemaVersion !== "r4_public_core_retention_health.v1") {
    fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  }
  const now = instant(input.now);
  const lastSuccess = instant(input.health.lastSuccessfulPurgeAt);
  if (lastSuccess > now) fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  return now - lastSuccess > PUBLIC_CORE_RETENTION_CEILINGS_MS.mutationStopAfter;
}

function isExactClosingTransition(input: PublicCoreRetentionGateInput): boolean {
  return input.roomModeTransition?.from === "public_single" && input.roomModeTransition.to === "closed";
}

function isExactCommittedPullReplay(input: PublicCoreRetentionGateInput): boolean {
  return input.pullReplay?.committedReceipt === true && input.pullReplay.sameKeyAndHash === true;
}

/**
 * Reads are never blocked here. When the purge watermark is older than 36h,
 * only the Packet's exact closure/recovery mutations remain reachable.
 */
export function assertPublicCoreMutationAllowedByRetention(input: PublicCoreRetentionGateInput): void {
  if (!PUBLIC_CORE_ACTION_NAMES.includes(input.action)) fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  if (READ_ACTIONS.has(input.action) || !isPublicCorePurgeHealthStale(input)) return;

  const allowed = input.action === "interaction.delete"
    || input.action === "projection.revoke"
    || input.action === "room.binding.revoke"
    || input.action === "curation.unlist"
    || input.action === "room_operator.sync"
    || input.action === "room_operator.ack"
    || input.action === "room_operator.local_purge.receipt"
    || (input.action === "room.mode.set" && isExactClosingTransition(input))
    || (input.action === "room_operator.pull" && isExactCommittedPullReplay(input));

  if (!allowed) fail("R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED");
}

export function resolvePublicCoreProjectionRetention(
  input: PublicCoreProjectionRetentionInput,
): PublicCoreProjectionRetentionDecisionV1 {
  const now = instant(input.now);
  const publication = instant(input.publicationAt);
  const hardExpiry = instant(input.hardExpiresAt);
  if (publication > now || hardExpiry <= publication) fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  if (!["current", "revoked", "superseded"].includes(input.lifecycle)) {
    fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  }
  if (!["admitted", "not_admitted", "unlisted"].includes(input.admission)) {
    fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  }
  if (!["fresh", "stale"].includes(input.freshness)) fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");

  const retentionExpiry = publication + PUBLIC_CORE_RETENTION_CEILINGS_MS.projectionBody;
  const bodyDeadline = Math.min(hardExpiry, retentionExpiry);
  let reason: PublicCoreProjectionRetentionDecisionV1["reason"] = "current";
  if (input.lifecycle === "revoked") reason = "revoked";
  else if (input.lifecycle === "superseded") reason = "superseded";
  else if (now >= hardExpiry) reason = "hard_expired";
  else if (now >= retentionExpiry) reason = "retention_expired";

  const bodyReadable = reason === "current";
  return Object.freeze({
    schemaVersion: "r4_public_core_projection_retention_decision.v1",
    bodyReadable,
    externallyTombstoned: !bodyReadable,
    enqueuePurge: !bodyReadable,
    reason,
    bodyDeadline: iso(bodyDeadline),
  });
}

/**
 * Terminal state is checked before replay. A committed pull may reconstruct
 * its exact body only while that exact Interaction version remains readable.
 */
export function resolvePublicCorePullRetention(
  input: PublicCorePullRetentionInput,
): PublicCorePullRetentionDecisionV1 {
  const now = instant(input.now);
  const createdAt = instant(input.interactionCreatedAt);
  if (
    createdAt > now
    || !Number.isSafeInteger(input.bodyVersion)
    || input.bodyVersion < 1
    || !["deleted", "origin_revoked", "readable"].includes(input.bodyState)
  ) {
    fail("R4_PUBLIC_CORE_RETENTION_INPUT_INVALID");
  }

  // Purge-health admission is evaluated before terminal reconciliation. During
  // an incident, the Packet permits only an already-committed exact replay;
  // a fresh pull cannot use a deleted/revoked/expired body as a side door into
  // the otherwise closed mutation lane.
  assertPublicCoreMutationAllowedByRetention({
    action: "room_operator.pull",
    now: input.now,
    health: input.health,
    pullReplay: input.replay,
  });

  const terminalReason = input.bodyState === "deleted"
    ? "deleted"
    : input.bodyState === "origin_revoked"
      ? "revoked"
      : now >= createdAt + PUBLIC_CORE_RETENTION_CEILINGS_MS.interactionBody
        ? "expired"
        : null;
  if (terminalReason !== null) {
    return Object.freeze({
      schemaVersion: "r4_public_core_pull_retention_decision.v1",
      kind: "body_free_reconciliation",
      bodyReadable: false,
      bodyVersion: input.bodyVersion,
      reason: terminalReason,
    });
  }

  return Object.freeze({
    schemaVersion: "r4_public_core_pull_retention_decision.v1",
    kind: "body",
    bodyReadable: true,
    bodyVersion: input.bodyVersion,
    reason: input.replay.committedReceipt && input.replay.sameKeyAndHash ? "committed_replay" : "fresh",
  });
}

function assertPurgeTarget(value: PublicCorePurgeTargetV1, now: number): void {
  if (
    typeof value.jobId !== "string"
    || typeof value.targetId !== "string"
    || typeof value.targetKind !== "string"
    || !/^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u.test(value.jobId)
    || !/^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$/u.test(value.targetId)
    || !Object.hasOwn(PURGE_KIND_ORDER, value.targetKind)
    || !Number.isSafeInteger(value.version)
    || value.version < 1
  ) {
    fail("R4_PUBLIC_CORE_JANITOR_TARGET_INVALID");
  }
  const terminalAt = instant(value.terminalAt);
  const purgeDueAt = instant(value.purgeDueAt);
  if (
    purgeDueAt < terminalAt
    || purgeDueAt - terminalAt >= PUBLIC_CORE_RETENTION_CEILINGS_MS.purgeTarget
    || purgeDueAt > now
  ) {
    fail("R4_PUBLIC_CORE_JANITOR_TARGET_INVALID");
  }
}

function compareTargets(left: PublicCorePurgeTargetV1, right: PublicCorePurgeTargetV1): number {
  const compareBinary = (a: string, b: string): number => Buffer.compare(Buffer.from(a), Buffer.from(b));
  const due = compareBinary(left.purgeDueAt, right.purgeDueAt);
  if (due !== 0) return due;
  const kind = PURGE_KIND_ORDER[left.targetKind] - PURGE_KIND_ORDER[right.targetKind];
  if (kind !== 0) return kind;
  const target = compareBinary(left.targetId, right.targetId);
  return target !== 0 ? target : compareBinary(left.jobId, right.jobId);
}

const JANITOR_LOCK = "forme_r4_public_core_retention.v1" as const;
const PURGE_TARGET_KINDS = Object.freeze(Object.keys(PURGE_KIND_ORDER) as PublicCorePurgeTargetKind[]);

type CapturedJanitorPortV1 = Readonly<{
  [Key in keyof PublicCoreJanitorPortV1]: PublicCoreJanitorPortV1[Key];
}>;

function snapshotExactDataRecord(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  errorCode: string,
): Readonly<Record<string, unknown>> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) fail(errorCode);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(errorCode);
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) fail(errorCode);
    const stringKeys = keys as string[];
    if (
      requiredKeys.some((key) => !stringKeys.includes(key))
      || stringKeys.some((key) => !requiredKeys.includes(key) && !optionalKeys.includes(key))
    ) {
      fail(errorCode);
    }
    const owned = Object.create(null) as Record<string, unknown>;
    for (const key of stringKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) fail(errorCode);
      owned[key] = descriptor.value;
    }
    return Object.freeze(owned);
  } catch {
    fail(errorCode);
  }
}

function snapshotJanitorInput(value: unknown): Readonly<{
  now: string;
  batchSize: number;
  port: unknown;
}> {
  const record = snapshotExactDataRecord(
    value,
    ["now", "port"],
    ["batchSize"],
    "R4_PUBLIC_CORE_JANITOR_INPUT_INVALID",
  );
  if (
    typeof record.now !== "string"
    || (record.batchSize !== undefined && typeof record.batchSize !== "number")
  ) {
    fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
  }
  return Object.freeze({
    now: record.now,
    batchSize: record.batchSize ?? 100,
    port: record.port,
  });
}

function snapshotPurgeTarget(value: unknown): PublicCorePurgeTargetV1 {
  const record = snapshotExactDataRecord(
    value,
    ["jobId", "targetKind", "targetId", "terminalAt", "purgeDueAt", "version"],
    [],
    "R4_PUBLIC_CORE_JANITOR_BATCH_INVALID",
  );
  return Object.freeze({
    jobId: record.jobId,
    targetKind: record.targetKind,
    targetId: record.targetId,
    terminalAt: record.terminalAt,
    purgeDueAt: record.purgeDueAt,
    version: record.version,
  }) as PublicCorePurgeTargetV1;
}

function snapshotDueTargetPage(
  value: unknown,
  batchSize: number,
): Readonly<{ targets: readonly PublicCorePurgeTargetV1[]; hasMore: boolean }> {
  const record = snapshotExactDataRecord(
    value,
    ["targets", "hasMore"],
    [],
    "R4_PUBLIC_CORE_JANITOR_BATCH_INVALID",
  );
  if (!Array.isArray(record.targets) || typeof record.hasMore !== "boolean") {
    fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
  }
  let targets: readonly PublicCorePurgeTargetV1[];
  try {
    if (Object.getPrototypeOf(record.targets) !== Array.prototype) {
      fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(record.targets, "length");
    if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) {
      fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
    }
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > batchSize) {
      fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
    }
    const keys = Reflect.ownKeys(record.targets);
    const expectedKeys = [
      ...Array.from({ length }, (_, index) => String(index)),
      "length",
    ];
    if (
      keys.length !== expectedKeys.length
      || keys.some((key, index) => key !== expectedKeys[index])
    ) {
      fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
    }
    const owned: PublicCorePurgeTargetV1[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(record.targets, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
      }
      owned.push(snapshotPurgeTarget(descriptor.value));
    }
    targets = Object.freeze(owned);
  } catch {
    fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
  }
  if (record.hasMore && targets.length !== batchSize) {
    fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
  }
  return Object.freeze({ targets, hasMore: record.hasMore });
}

function captureJanitorPort(port: unknown): CapturedJanitorPortV1 {
  if ((typeof port !== "object" && typeof port !== "function") || port === null) {
    fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
  }

  const capture = (name: keyof PublicCoreJanitorPortV1): ((...args: unknown[]) => unknown) => {
    try {
      let owner: object | null = port as object;
      const seen = new Set<object>();
      let depth = 0;
      while (owner !== null) {
        if (seen.has(owner) || depth >= 32) fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
        seen.add(owner);
        depth += 1;
        const descriptor = Object.getOwnPropertyDescriptor(owner, name);
        if (descriptor !== undefined) {
          if (!Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function") {
            fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
          }
          const method = descriptor.value as (...args: unknown[]) => unknown;
          return (...args: unknown[]): unknown => Reflect.apply(method, port, args);
        }
        owner = Object.getPrototypeOf(owner);
      }
    } catch {
      fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
    }
    fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
  };

  return Object.freeze({
    tryAcquireSingletonAdvisoryLock: capture("tryAcquireSingletonAdvisoryLock"),
    listDueTargets: capture("listDueTargets"),
    purgeTarget: capture("purgeTarget"),
    recordPurgeResult: capture("recordPurgeResult"),
    recordSuccessfulPurgeAt: capture("recordSuccessfulPurgeAt"),
    releaseSingletonAdvisoryLock: capture("releaseSingletonAdvisoryLock"),
  }) as CapturedJanitorPortV1;
}

/** Runs no timer and opens no resource; scheduling and persistence are injected. */
export async function runPublicCoreHourlyJanitor(input: Readonly<{
  now: string;
  batchSize?: number;
  port: PublicCoreJanitorPortV1;
}>): Promise<PublicCoreJanitorRunV1> {
  const ownedInput = snapshotJanitorInput(input);
  const now = instant(ownedInput.now);
  const batchSize = ownedInput.batchSize;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    fail("R4_PUBLIC_CORE_JANITOR_INPUT_INVALID");
  }
  const port = captureJanitorPort(ownedInput.port);

  let acquired: boolean;
  try {
    acquired = await port.tryAcquireSingletonAdvisoryLock(JANITOR_LOCK);
  } catch {
    fail("R4_PUBLIC_CORE_JANITOR_FAILED");
  }
  if (acquired !== true && acquired !== false) fail("R4_PUBLIC_CORE_JANITOR_FAILED");
  if (!acquired) {
    return Object.freeze({
      schemaVersion: "r4_public_core_janitor_run.v1",
      status: "advisory_lock_held",
      startedAt: ownedInput.now,
      completedAt: ownedInput.now,
      results: Object.freeze([]),
      bodyFree: true,
    });
  }

  const results: PublicCorePurgeResultV1[] = [];
  let runFailure: PublicCoreRetentionError | null = null;
  let backlogRemaining = false;
  try {
    let page: Readonly<{ targets: readonly PublicCorePurgeTargetV1[]; hasMore: boolean }>;
    try {
      page = snapshotDueTargetPage(await port.listDueTargets({
        now: ownedInput.now,
        limit: batchSize,
        targetKinds: PURGE_TARGET_KINDS,
      }), batchSize);
    } catch {
      fail("R4_PUBLIC_CORE_JANITOR_FAILED");
    }
    if (
      page === null
      || typeof page !== "object"
      || Array.isArray(page)
      || !Array.isArray(page.targets)
      || typeof page.hasMore !== "boolean"
    ) {
      fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
    }
    backlogRemaining = page.hasMore;
    const ordered = [...page.targets];
    for (const target of ordered) assertPurgeTarget(target, now);
    ordered.sort(compareTargets);
    const seenJobs = new Set<string>();
    const seenTargets = new Set<string>();
    for (const target of ordered) {
      const targetKey = `${target.targetKind}:${target.targetId}`;
      if (seenJobs.has(target.jobId) || seenTargets.has(targetKey)) {
        fail("R4_PUBLIC_CORE_JANITOR_BATCH_INVALID");
      }
      seenJobs.add(target.jobId);
      seenTargets.add(targetKey);
      let outcome: PublicCorePurgeResultV1["outcome"];
      try {
        outcome = await port.purgeTarget(target);
        if (outcome !== "purged" && outcome !== "already_absent") {
          outcome = "failed";
        }
      } catch {
        outcome = "failed";
      }
      const result: PublicCorePurgeResultV1 = Object.freeze({
        schemaVersion: "r4_public_core_purge_result.v1",
        jobId: target.jobId,
        targetKind: target.targetKind,
        targetId: target.targetId,
        outcome,
        recordedAt: ownedInput.now,
        bodyFree: true,
      });
      try {
        await port.recordPurgeResult(result);
      } catch {
        fail("R4_PUBLIC_CORE_JANITOR_FAILED");
      }
      results.push(result);
    }
    if (!page.hasMore && !results.some((result) => result.outcome === "failed")) {
      try {
        await port.recordSuccessfulPurgeAt(ownedInput.now);
      } catch {
        fail("R4_PUBLIC_CORE_JANITOR_FAILED");
      }
    }
  } catch (error) {
    let safeCode = "R4_PUBLIC_CORE_JANITOR_FAILED";
    try {
      if (error instanceof PublicCoreRetentionError) {
        const candidateCode = error.code;
        if (new Set([
          "R4_PUBLIC_CORE_JANITOR_TARGET_INVALID",
          "R4_PUBLIC_CORE_JANITOR_BATCH_INVALID",
          "R4_PUBLIC_CORE_JANITOR_FAILED",
        ]).has(candidateCode)) {
          safeCode = candidateCode;
        }
      }
    } catch {
      safeCode = "R4_PUBLIC_CORE_JANITOR_FAILED";
    }
    runFailure = new PublicCoreRetentionError(safeCode);
  } finally {
    try {
      await port.releaseSingletonAdvisoryLock(JANITOR_LOCK);
    } catch {
      runFailure = new PublicCoreRetentionError("R4_PUBLIC_CORE_JANITOR_FAILED");
    }
  }
  if (runFailure) throw runFailure;
  return Object.freeze({
    schemaVersion: "r4_public_core_janitor_run.v1",
    status: results.some((result) => result.outcome === "failed")
      ? "partial_failure"
      : backlogRemaining
        ? "backlog_remaining"
        : "completed",
    startedAt: ownedInput.now,
    completedAt: ownedInput.now,
    results: Object.freeze(results),
    bodyFree: true,
  });
}
