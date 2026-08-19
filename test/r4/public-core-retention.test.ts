import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_CORE_RETENTION_CEILINGS_MS,
  PublicCoreRetentionError,
  assertPublicCoreMutationAllowedByRetention,
  isPublicCorePurgeHealthStale,
  publicCoreRetentionDeadline,
  resolvePublicCoreProjectionRetention,
  resolvePublicCorePullRetention,
  runPublicCoreHourlyJanitor,
  type PublicCoreJanitorPortV1,
  type PublicCorePurgeResultV1,
  type PublicCorePurgeTargetV1,
  type PublicCoreRetentionHealthV1,
} from "../../apps/room/src/public-core-retention.ts";
import {
  PUBLIC_CORE_ACTION_NAMES,
  type PublicCoreActionName,
} from "../../apps/room/src/public-core-policy.ts";

const T0 = "2026-08-10T12:00:00.000Z";
const READS = new Set<PublicCoreActionName>([
  "third_place.list",
  "projection.read",
  "interaction.read",
  "room_operator.status",
]);

function at(milliseconds: number): string {
  return new Date(Date.parse(T0) + milliseconds).toISOString();
}

function health(lastSuccessfulPurgeAt = T0): PublicCoreRetentionHealthV1 {
  return {
    schemaVersion: "r4_public_core_retention_health.v1",
    lastSuccessfulPurgeAt,
  };
}

function expectRetentionError(error: unknown, code: string, canary = "RETENTION_PRIVATE_CANARY"): boolean {
  assert.ok(error instanceof PublicCoreRetentionError);
  assert.equal(error.code, code);
  assert.equal(error.statusCode, 503);
  assert.equal(`${String(error)}\n${JSON.stringify(error)}`.includes(canary), false);
  return true;
}

test("#67 retention deadlines use exact ceilings and Interaction terminalization never restarts the original clock", () => {
  assert.deepEqual(PUBLIC_CORE_RETENTION_CEILINGS_MS, {
    pairingMaterial: 10 * 60 * 1_000,
    publicEncounter: 24 * 60 * 60 * 1_000,
    projectionBody: 7 * 24 * 60 * 60 * 1_000,
    interactionBody: 30 * 24 * 60 * 60 * 1_000,
    rateEvent: 25 * 60 * 60 * 1_000,
    roomEventOrOrdinaryReceipt: 37 * 24 * 60 * 60 * 1_000,
    interactionTerminalTombstone: 37 * 24 * 60 * 60 * 1_000,
    purgeTarget: 24 * 60 * 60 * 1_000,
    mutationStopAfter: 36 * 60 * 60 * 1_000,
  });
  assert.equal(publicCoreRetentionDeadline("pairing_material", T0), at(10 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("public_encounter", T0), at(24 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("projection_body", T0), at(7 * 24 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("interaction_body", T0), at(30 * 24 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("rate_event", T0), at(25 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("room_event", T0), at(37 * 24 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("mutation_receipt", T0), at(37 * 24 * 60 * 60 * 1_000));
  assert.equal(publicCoreRetentionDeadline("interaction_terminal_tombstone", T0), at(37 * 24 * 60 * 60 * 1_000));
});

test("never-admitted, unlisted, and stale current Projections remain readable; supersede, revoke, hard expiry, and ceiling are immediate tombstones", () => {
  for (const admission of ["not_admitted", "unlisted", "admitted"] as const) {
    for (const freshness of ["fresh", "stale"] as const) {
      const decision = resolvePublicCoreProjectionRetention({
        publicationAt: T0,
        hardExpiresAt: at(10 * 24 * 60 * 60 * 1_000),
        now: at(24 * 60 * 60 * 1_000),
        lifecycle: "current",
        admission,
        freshness,
      });
      assert.equal(decision.bodyReadable, true);
      assert.equal(decision.externallyTombstoned, false);
      assert.equal(decision.enqueuePurge, false);
      assert.equal(decision.reason, "current");
    }
  }

  for (const lifecycle of ["superseded", "revoked"] as const) {
    const decision = resolvePublicCoreProjectionRetention({
      publicationAt: T0,
      hardExpiresAt: at(10 * 24 * 60 * 60 * 1_000),
      now: at(60 * 60 * 1_000),
      lifecycle,
      admission: "admitted",
      freshness: "fresh",
    });
    assert.deepEqual(
      { readable: decision.bodyReadable, tombstone: decision.externallyTombstoned, purge: decision.enqueuePurge, reason: decision.reason },
      { readable: false, tombstone: true, purge: true, reason: lifecycle },
    );
  }

  const hardExpired = resolvePublicCoreProjectionRetention({
    publicationAt: T0,
    hardExpiresAt: at(2 * 24 * 60 * 60 * 1_000),
    now: at(2 * 24 * 60 * 60 * 1_000),
    lifecycle: "current",
    admission: "unlisted",
    freshness: "stale",
  });
  assert.equal(hardExpired.reason, "hard_expired");
  assert.equal(hardExpired.bodyReadable, false);

  const retentionExpired = resolvePublicCoreProjectionRetention({
    publicationAt: T0,
    hardExpiresAt: at(10 * 24 * 60 * 60 * 1_000),
    now: at(7 * 24 * 60 * 60 * 1_000),
    lifecycle: "current",
    admission: "not_admitted",
    freshness: "stale",
  });
  assert.equal(retentionExpired.reason, "retention_expired");
  assert.equal(retentionExpired.bodyDeadline, at(7 * 24 * 60 * 60 * 1_000));
});

test(">36h stale purge health stops every fresh mutation except the exact closure/recovery allowlist", () => {
  const exactly36h = at(PUBLIC_CORE_RETENTION_CEILINGS_MS.mutationStopAfter);
  const stale = at(PUBLIC_CORE_RETENTION_CEILINGS_MS.mutationStopAfter + 1);
  assert.equal(isPublicCorePurgeHealthStale({ now: exactly36h, health: health() }), false);
  assert.equal(isPublicCorePurgeHealthStale({ now: stale, health: health() }), true);

  for (const action of PUBLIC_CORE_ACTION_NAMES) {
    assert.doesNotThrow(() => assertPublicCoreMutationAllowedByRetention({
      action,
      now: exactly36h,
      health: health(),
    }));
  }

  const alwaysAllowed = new Set<PublicCoreActionName>([
    "interaction.delete",
    "projection.revoke",
    "room.binding.revoke",
    "curation.unlist",
    "room_operator.sync",
    "room_operator.ack",
    "room_operator.local_purge.receipt",
  ]);
  for (const action of PUBLIC_CORE_ACTION_NAMES) {
    if (READS.has(action) || alwaysAllowed.has(action)) {
      assert.doesNotThrow(() => assertPublicCoreMutationAllowedByRetention({ action, now: stale, health: health() }));
      continue;
    }
    if (action === "room.mode.set") {
      assert.doesNotThrow(() => assertPublicCoreMutationAllowedByRetention({
        action,
        now: stale,
        health: health(),
        roomModeTransition: { from: "public_single", to: "closed" },
      }));
      assert.throws(() => assertPublicCoreMutationAllowedByRetention({
        action,
        now: stale,
        health: health(),
        roomModeTransition: { from: "closed", to: "public_single" },
      }), (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED"));
      continue;
    }
    if (action === "room_operator.pull") {
      assert.doesNotThrow(() => assertPublicCoreMutationAllowedByRetention({
        action,
        now: stale,
        health: health(),
        pullReplay: { committedReceipt: true, sameKeyAndHash: true },
      }));
      for (const pullReplay of [
        { committedReceipt: false, sameKeyAndHash: true },
        { committedReceipt: true, sameKeyAndHash: false },
        { committedReceipt: false, sameKeyAndHash: false },
      ]) {
        assert.throws(() => assertPublicCoreMutationAllowedByRetention({
          action,
          now: stale,
          health: health(),
          pullReplay,
        }), (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED"));
      }
      continue;
    }
    assert.throws(
      () => assertPublicCoreMutationAllowedByRetention({ action, now: stale, health: health() }),
      (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED"),
      `${action} must be stopped during a purge-health incident`,
    );
  }
});

test("pull recovery decrypts only a readable exact version; delete, revoke, and retention terminal state win over replay", () => {
  const healthyNow = at(60 * 60 * 1_000);
  assert.deepEqual(resolvePublicCorePullRetention({
    interactionCreatedAt: T0,
    now: healthyNow,
    bodyState: "readable",
    bodyVersion: 3,
    health: health(),
    replay: { committedReceipt: false, sameKeyAndHash: false },
  }), {
    schemaVersion: "r4_public_core_pull_retention_decision.v1",
    kind: "body",
    bodyReadable: true,
    bodyVersion: 3,
    reason: "fresh",
  });

  const staleNow = at(40 * 60 * 60 * 1_000);
  assert.throws(() => resolvePublicCorePullRetention({
    interactionCreatedAt: T0,
    now: staleNow,
    bodyState: "readable",
    bodyVersion: 3,
    health: health(),
    replay: { committedReceipt: false, sameKeyAndHash: false },
  }), (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED"));

  const replay = resolvePublicCorePullRetention({
    interactionCreatedAt: T0,
    now: staleNow,
    bodyState: "readable",
    bodyVersion: 3,
    health: health(),
    replay: { committedReceipt: true, sameKeyAndHash: true },
  });
  assert.equal(replay.kind, "body");
  assert.equal(replay.reason, "committed_replay");

  for (const [bodyState, reason] of [
    ["deleted", "deleted"],
    ["origin_revoked", "revoked"],
  ] as const) {
    assert.throws(() => resolvePublicCorePullRetention({
      interactionCreatedAt: T0,
      now: staleNow,
      bodyState,
      bodyVersion: 3,
      health: health(),
      replay: { committedReceipt: false, sameKeyAndHash: false },
    }), (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_RETENTION_MUTATION_STOPPED"));

    const terminal = resolvePublicCorePullRetention({
      interactionCreatedAt: T0,
      now: staleNow,
      bodyState,
      bodyVersion: 3,
      health: health(),
      replay: { committedReceipt: true, sameKeyAndHash: true },
    });
    assert.deepEqual(terminal, {
      schemaVersion: "r4_public_core_pull_retention_decision.v1",
      kind: "body_free_reconciliation",
      bodyReadable: false,
      bodyVersion: 3,
      reason,
    });
  }

  const retentionExpired = resolvePublicCorePullRetention({
    interactionCreatedAt: T0,
    now: at(PUBLIC_CORE_RETENTION_CEILINGS_MS.interactionBody),
    bodyState: "readable",
    bodyVersion: 3,
    health: health(at(PUBLIC_CORE_RETENTION_CEILINGS_MS.interactionBody)),
    replay: { committedReceipt: true, sameKeyAndHash: true },
  });
  assert.equal(retentionExpired.kind, "body_free_reconciliation");
  assert.equal(retentionExpired.reason, "expired");
});

class FakeJanitorPort implements PublicCoreJanitorPortV1 {
  readonly targets: PublicCorePurgeTargetV1[];
  readonly results: PublicCorePurgeResultV1[] = [];
  readonly purgeOrder: string[] = [];
  readonly failIds = new Set<string>();
  successfulAt: string | null = null;
  lockHeld = false;
  releaseCount = 0;
  hasMore = false;
  purgeBarrier: (() => Promise<void>) | null = null;

  constructor(targets: PublicCorePurgeTargetV1[]) {
    this.targets = targets;
  }

  async tryAcquireSingletonAdvisoryLock(): Promise<boolean> {
    if (this.lockHeld) return false;
    this.lockHeld = true;
    return true;
  }

  async listDueTargets(input: { now: string; limit: number }): Promise<Readonly<{
    targets: readonly PublicCorePurgeTargetV1[];
    hasMore: boolean;
  }>> {
    assert.equal(input.limit <= 100, true);
    return { targets: this.targets.slice(0, input.limit), hasMore: this.hasMore };
  }

  async purgeTarget(target: PublicCorePurgeTargetV1): Promise<"already_absent" | "purged"> {
    this.purgeOrder.push(target.targetId);
    await this.purgeBarrier?.();
    if (this.failIds.has(target.targetId)) throw new Error("PURGE_ADAPTER_PRIVATE_CANARY");
    return "purged";
  }

  async recordPurgeResult(result: PublicCorePurgeResultV1): Promise<void> {
    this.results.push(result);
  }

  async recordSuccessfulPurgeAt(now: string): Promise<void> {
    this.successfulAt = now;
  }

  async releaseSingletonAdvisoryLock(): Promise<void> {
    this.lockHeld = false;
    this.releaseCount += 1;
  }
}

function purgeTarget(
  suffix: string,
  targetKind: PublicCorePurgeTargetV1["targetKind"],
  dueOffset = 60 * 60 * 1_000,
): PublicCorePurgeTargetV1 {
  return {
    jobId: `purge_job_${suffix.repeat(24)}`,
    targetKind,
    targetId: `target_${suffix.repeat(24)}`,
    terminalAt: T0,
    purgeDueAt: at(dueOffset),
    version: 1,
  };
}

test("injected hourly janitor takes one advisory lock, sorts a bounded batch deterministically, and records only body-free outcomes", async () => {
  const projection = purgeTarget("p", "projection_body");
  const pairing = purgeTarget("a", "pairing_material");
  const interaction = purgeTarget("i", "interaction_body", 30 * 60 * 1_000);
  const port = new FakeJanitorPort([projection, pairing, interaction]);
  const now = at(2 * 60 * 60 * 1_000);
  const result = await runPublicCoreHourlyJanitor({ now, batchSize: 3, port });

  assert.equal(result.status, "completed");
  assert.deepEqual(port.purgeOrder, [interaction.targetId, pairing.targetId, projection.targetId]);
  assert.equal(port.successfulAt, now);
  assert.equal(port.releaseCount, 1);
  assert.equal(port.lockHeld, false);
  assert.equal(result.results.every((entry) => entry.bodyFree), true);
  assert.equal(JSON.stringify(result).includes("PURGE_ADAPTER_PRIVATE_CANARY"), false);

  const upper = purgeTarget("Z", "projection_body");
  const lower = purgeTarget("a", "projection_body");
  const binaryPort = new FakeJanitorPort([lower, upper]);
  await runPublicCoreHourlyJanitor({ now, batchSize: 2, port: binaryPort });
  assert.deepEqual(binaryPort.purgeOrder, [upper.targetId, lower.targetId]);

  const backlogPort = new FakeJanitorPort([purgeTarget("b", "projection_body")]);
  backlogPort.hasMore = true;
  const backlog = await runPublicCoreHourlyJanitor({ now, batchSize: 1, port: backlogPort });
  assert.equal(backlog.status, "backlog_remaining");
  assert.equal(backlogPort.successfulAt, null);
});

test("janitor partial failure leaves the success watermark unchanged and concurrent duplicate invocation is effectless", async () => {
  const failed = purgeTarget("f", "interaction_body");
  const port = new FakeJanitorPort([failed]);
  port.failIds.add(failed.targetId);
  const partial = await runPublicCoreHourlyJanitor({ now: at(2 * 60 * 60 * 1_000), port });
  assert.equal(partial.status, "partial_failure");
  assert.equal(partial.results[0]?.outcome, "failed");
  assert.equal(port.successfulAt, null);
  assert.equal(JSON.stringify(partial).includes("PURGE_ADAPTER_PRIVATE_CANARY"), false);

  const heldPort = new FakeJanitorPort([purgeTarget("h", "projection_body")]);
  let release!: () => void;
  let entered!: () => void;
  const enteredPurge = new Promise<void>((resolve) => { entered = resolve; });
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  heldPort.purgeBarrier = async () => {
    entered();
    await barrier;
  };
  const first = runPublicCoreHourlyJanitor({ now: at(2 * 60 * 60 * 1_000), port: heldPort });
  await enteredPurge;
  const duplicate = await runPublicCoreHourlyJanitor({ now: at(2 * 60 * 60 * 1_000), port: heldPort });
  assert.equal(duplicate.status, "advisory_lock_held");
  assert.equal(duplicate.results.length, 0);
  release();
  assert.equal((await first).status, "completed");
  assert.equal(heldPort.releaseCount, 1);
});

test("janitor rejects an unbounded or >=24h purge target and sanitizes injected port failure", async () => {
  const late = purgeTarget("l", "projection_body", PUBLIC_CORE_RETENTION_CEILINGS_MS.purgeTarget);
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(PUBLIC_CORE_RETENTION_CEILINGS_MS.purgeTarget + 1),
      port: new FakeJanitorPort([late]),
    }),
    (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_JANITOR_TARGET_INVALID"),
  );

  const throwingPort = new FakeJanitorPort([]);
  throwingPort.listDueTargets = async () => { throw new Error("JANITOR_LIST_PRIVATE_CANARY"); };
  await assert.rejects(
    runPublicCoreHourlyJanitor({ now: at(60 * 60 * 1_000), port: throwingPort }),
    (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_JANITOR_FAILED", "JANITOR_LIST_PRIVATE_CANARY"),
  );
  assert.equal(throwingPort.releaseCount, 1);

  const methodGetterCanary = "JANITOR_METHOD_GETTER_PRIVATE_CANARY";
  let methodGetterAccessed = false;
  const methodGetterPort = new FakeJanitorPort([]);
  Object.defineProperty(methodGetterPort, "tryAcquireSingletonAdvisoryLock", {
    configurable: true,
    get(): never {
      methodGetterAccessed = true;
      throw new Error(methodGetterCanary);
    },
  });
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(60 * 60 * 1_000),
      port: methodGetterPort,
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_INPUT_INVALID",
      methodGetterCanary,
    ),
  );
  assert.equal(methodGetterAccessed, false);

  const descriptorTrapCanary = "JANITOR_DESCRIPTOR_TRAP_PRIVATE_CANARY";
  const descriptorTrapPort = new Proxy(new FakeJanitorPort([]), {
    getOwnPropertyDescriptor(target, property): PropertyDescriptor | undefined {
      if (property === "tryAcquireSingletonAdvisoryLock") throw new Error(descriptorTrapCanary);
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(60 * 60 * 1_000),
      port: descriptorTrapPort,
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_INPUT_INVALID",
      descriptorTrapCanary,
    ),
  );

  const inputGetterCanary = "JANITOR_INPUT_GETTER_PRIVATE_CANARY";
  let inputGetterReads = 0;
  const inputWithGetter = { port: new FakeJanitorPort([]) } as unknown as {
    now: string;
    port: PublicCoreJanitorPortV1;
  };
  Object.defineProperty(inputWithGetter, "now", {
    enumerable: true,
    get(): string {
      inputGetterReads += 1;
      throw new Error(inputGetterCanary);
    },
  });
  await assert.rejects(
    runPublicCoreHourlyJanitor(inputWithGetter),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_INPUT_INVALID",
      inputGetterCanary,
    ),
  );
  assert.equal(inputGetterReads, 0);

  const targetMutationCanary = "JANITOR_TARGET_MUTATION_PRIVATE_CANARY";
  const ownedTargetPort = new FakeJanitorPort([purgeTarget("o", "projection_body")]);
  ownedTargetPort.purgeTarget = async (target): Promise<"purged"> => {
    assert.equal(Object.isFrozen(target), true);
    assert.throws(() => {
      (target as { targetId: string }).targetId = targetMutationCanary;
    });
    return "purged";
  };
  const ownedTargetRun = await runPublicCoreHourlyJanitor({
    now: at(2 * 60 * 60 * 1_000),
    port: ownedTargetPort,
  });
  assert.equal(JSON.stringify(ownedTargetRun).includes(targetMutationCanary), false);

  const pageGetterCanary = "JANITOR_PAGE_GETTER_PRIVATE_CANARY";
  const pageGetterPort = new FakeJanitorPort([]);
  pageGetterPort.listDueTargets = async () => {
    const page = { hasMore: false } as {
      targets: readonly PublicCorePurgeTargetV1[];
      hasMore: boolean;
    };
    Object.defineProperty(page, "targets", {
      enumerable: true,
      get(): never { throw new Error(pageGetterCanary); },
    });
    return page;
  };
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: pageGetterPort,
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_FAILED",
      pageGetterCanary,
    ),
  );

  const boxedKindPort = new FakeJanitorPort([{
    ...purgeTarget("k", "projection_body"),
    targetKind: Object("projection_body"),
  } as unknown as PublicCorePurgeTargetV1]);
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: boxedKindPort,
    }),
    (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_JANITOR_TARGET_INVALID"),
  );
  assert.equal(boxedKindPort.purgeOrder.length, 0);

  const arrayPrototypeCanary = "JANITOR_ARRAY_PROTOTYPE_PRIVATE_CANARY";
  const arrayPrototypePort = new FakeJanitorPort([]);
  arrayPrototypePort.listDueTargets = async () => {
    const targets = [purgeTarget("y", "projection_body")];
    Object.setPrototypeOf(targets, { toJSON: () => arrayPrototypeCanary });
    return { targets, hasMore: false };
  };
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: arrayPrototypePort,
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_FAILED",
      arrayPrototypeCanary,
    ),
  );

  let cyclicPort!: PublicCoreJanitorPortV1;
  cyclicPort = new Proxy({}, {
    getOwnPropertyDescriptor(): undefined { return undefined; },
    getPrototypeOf(): object { return cyclicPort as unknown as object; },
  }) as PublicCoreJanitorPortV1;
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: cyclicPort,
    }),
    (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_JANITOR_INPUT_INVALID"),
  );

  const inheritedName = {
    ...purgeTarget("c", "projection_body"),
    targetKind: "constructor",
  } as unknown as PublicCorePurgeTargetV1;
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: new FakeJanitorPort([inheritedName]),
    }),
    (error: unknown) => expectRetentionError(error, "R4_PUBLIC_CORE_JANITOR_TARGET_INVALID"),
  );

  const getterCanary = "JANITOR_TARGET_GETTER_PRIVATE_CANARY";
  const getterTarget = purgeTarget("g", "projection_body") as PublicCorePurgeTargetV1 & { jobId: string };
  Object.defineProperty(getterTarget, "jobId", {
    enumerable: true,
    get(): never {
      const error = new PublicCoreRetentionError("R4_PUBLIC_CORE_JANITOR_TARGET_INVALID");
      error.name = getterCanary;
      throw error;
    },
  });
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: new FakeJanitorPort([getterTarget]),
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_FAILED",
      getterCanary,
    ),
  );

  const codeGetterCanary = "JANITOR_ERROR_CODE_GETTER_CANARY";
  const codeGetterTarget = purgeTarget("q", "projection_body") as PublicCorePurgeTargetV1 & { jobId: string };
  Object.defineProperty(codeGetterTarget, "jobId", {
    enumerable: true,
    get(): never {
      const error = new PublicCoreRetentionError("R4_PUBLIC_CORE_JANITOR_TARGET_INVALID");
      Object.defineProperty(error, "code", {
        get(): never { throw new Error(codeGetterCanary); },
      });
      throw error;
    },
  });
  await assert.rejects(
    runPublicCoreHourlyJanitor({
      now: at(2 * 60 * 60 * 1_000),
      port: new FakeJanitorPort([codeGetterTarget]),
    }),
    (error: unknown) => expectRetentionError(
      error,
      "R4_PUBLIC_CORE_JANITOR_FAILED",
      codeGetterCanary,
    ),
  );
});
