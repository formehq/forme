import { createHash } from "node:crypto";

const HOUR_MS = 60 * 60 * 1_000;
const PURGE_TARGET_MS = 24 * HOUR_MS;
const UNHEALTHY_MS = 36 * HOUR_MS;

export type RetentionTargetKind =
  | "interaction_body"
  | "guest_capsule"
  | "response_body"
  | "notification_endpoint"
  | "notification_delivery_target"
  | "verification_challenge";

export interface RetentionTarget {
  readonly targetId: string;
  readonly kind: RetentionTargetKind;
  readonly terminalAt: string;
  readonly payloadPresent: boolean;
  readonly purgedAt: string | null;
  readonly version: number;
}

export interface PurgeReceipt {
  readonly schemaVersion: "synthetic_purge_receipt.v1";
  readonly receiptId: string;
  readonly targetId: string;
  readonly targetKind: RetentionTargetKind;
  readonly terminalAt: string;
  readonly outcome: "purged" | "already_absent" | "failed";
  readonly recordedAt: string;
  readonly bodyFree: true;
}

export interface OperatorIncident {
  readonly schemaVersion: "synthetic_operator_incident.v1";
  readonly incidentId: string;
  readonly code: "purge_target_missed" | "last_successful_purge_stale";
  readonly openedAt: string;
  readonly targetId: string | null;
  readonly bodyFree: true;
}

export interface JanitorHealth {
  readonly healthy: boolean;
  readonly writesHealthy: boolean;
  readonly emailHealthy: boolean;
  readonly lastSuccessfulPurgeAt: string;
  readonly incidents: readonly OperatorIncident[];
}

export interface JanitorRunResult {
  readonly schemaVersion: "synthetic_janitor_run.v1";
  readonly invocation: "scheduled" | "manual";
  readonly status: "completed" | "partial_failure" | "advisory_lock_held";
  readonly batchId: string | null;
  readonly receipts: readonly PurgeReceipt[];
  readonly startedAt: string;
  readonly completedAt: string;
  readonly bodyFree: true;
}

export interface JanitorFaults {
  readonly failTargetIds?: ReadonlySet<string>;
  readonly afterLock?: () => Promise<void>;
  readonly purgeTarget?: (target: RetentionTarget) => Promise<"purged" | "already_absent">;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const RETENTION_KIND_ORDER: Readonly<Record<RetentionTargetKind, number>> = {
  response_body: 0,
  notification_delivery_target: 1,
  notification_endpoint: 2,
  verification_challenge: 3,
  interaction_body: 4,
  guest_capsule: 5,
};

/**
 * Repository-only persistence analogue for Gate A. All records are body-free;
 * the boolean `payloadPresent` stands in for encrypted columns that Gate B
 * must implement in PostgreSQL.
 */
export class SyntheticRetentionRepository {
  #targets = new Map<string, RetentionTarget>();
  #receipts = new Map<string, PurgeReceipt>();
  #incidents = new Map<string, OperatorIncident>();
  #advisoryLock = false;
  #lastSuccessfulPurgeAt: string;

  constructor(initialHealthyAt: string) {
    this.#lastSuccessfulPurgeAt = initialHealthyAt;
  }

  register(target: Omit<RetentionTarget, "payloadPresent" | "purgedAt" | "version">): RetentionTarget {
    const current = this.#targets.get(target.targetId);
    if (current) {
      if (current.kind !== target.kind || current.terminalAt !== target.terminalAt) {
        throw new Error("retention target identity conflict");
      }
      return clone(current);
    }
    const record: RetentionTarget = { ...target, payloadPresent: true, purgedAt: null, version: 1 };
    this.#targets.set(record.targetId, record);
    return clone(record);
  }

  target(targetId: string): RetentionTarget | null {
    const value = this.#targets.get(targetId);
    return value ? clone(value) : null;
  }

  targets(): RetentionTarget[] {
    return [...this.#targets.values()]
      .sort((left, right) => {
        const time = left.terminalAt.localeCompare(right.terminalAt);
        if (time !== 0) return time;
        const leftManaged = left.targetId.startsWith(`${left.kind}:`);
        const rightManaged = right.targetId.startsWith(`${right.kind}:`);
        if (leftManaged && rightManaged) {
          const kind = RETENTION_KIND_ORDER[left.kind] - RETENTION_KIND_ORDER[right.kind];
          if (kind !== 0) return kind;
        }
        return left.targetId.localeCompare(right.targetId);
      })
      .map(clone);
  }

  receipts(): PurgeReceipt[] {
    return [...this.#receipts.values()].sort((left, right) => left.receiptId.localeCompare(right.receiptId)).map(clone);
  }

  incidents(): OperatorIncident[] {
    return [...this.#incidents.values()].sort((left, right) => left.incidentId.localeCompare(right.incidentId)).map(clone);
  }

  lastSuccessfulPurgeAt(): string {
    return this.#lastSuccessfulPurgeAt;
  }

  tryAdvisoryLock(): boolean {
    if (this.#advisoryLock) return false;
    this.#advisoryLock = true;
    return true;
  }

  releaseAdvisoryLock(): void {
    this.#advisoryLock = false;
  }

  pendingBatch(limit: number): RetentionTarget[] {
    return this.targets().filter((target) => target.payloadPresent).slice(0, limit);
  }

  purge(targetId: string, now: string, outcome: PurgeReceipt["outcome"]): PurgeReceipt {
    const target = this.#targets.get(targetId);
    if (!target) throw new Error("retention target absent");
    const receiptId = stableId("purge", `${target.targetId}\u0000${target.terminalAt}`);
    const prior = this.#receipts.get(receiptId);
    if (prior?.outcome === "purged" || prior?.outcome === "already_absent") return clone(prior);
    if (outcome === "failed") {
      const failed: PurgeReceipt = {
        schemaVersion: "synthetic_purge_receipt.v1",
        receiptId,
        targetId,
        targetKind: target.kind,
        terminalAt: target.terminalAt,
        outcome: "failed",
        recordedAt: now,
        bodyFree: true,
      };
      this.#receipts.set(receiptId, failed);
      return clone(failed);
    }
    this.#targets.set(targetId, {
      ...target,
      payloadPresent: false,
      purgedAt: target.purgedAt ?? now,
      version: target.payloadPresent ? target.version + 1 : target.version,
    });
    const receipt: PurgeReceipt = {
      schemaVersion: "synthetic_purge_receipt.v1",
      receiptId,
      targetId,
      targetKind: target.kind,
      terminalAt: target.terminalAt,
      outcome,
      recordedAt: now,
      bodyFree: true,
    };
    this.#receipts.set(receiptId, receipt);
    return clone(receipt);
  }

  recordSuccessfulRun(now: string): void {
    this.#lastSuccessfulPurgeAt = now;
  }

  openIncident(code: OperatorIncident["code"], now: string, targetId: string | null): OperatorIncident {
    const incidentId = stableId("incident", `${code}\u0000${targetId ?? "global"}`);
    const prior = this.#incidents.get(incidentId);
    if (prior) return clone(prior);
    const incident: OperatorIncident = {
      schemaVersion: "synthetic_operator_incident.v1",
      incidentId,
      code,
      openedAt: now,
      targetId,
      bodyFree: true,
    };
    this.#incidents.set(incidentId, incident);
    return clone(incident);
  }
}

export class SyntheticHourlyJanitor {
  #repository: SyntheticRetentionRepository;
  #batchSize: number;

  constructor(repository: SyntheticRetentionRepository, batchSize = 100) {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new TypeError("janitor batch size must be positive");
    this.#repository = repository;
    this.#batchSize = batchSize;
  }

  async run(
    now: string,
    invocation: "scheduled" | "manual" = "scheduled",
    faults: JanitorFaults = {},
  ): Promise<JanitorRunResult> {
    if (!this.#repository.tryAdvisoryLock()) {
      return {
        schemaVersion: "synthetic_janitor_run.v1",
        invocation,
        status: "advisory_lock_held",
        batchId: null,
        receipts: [],
        startedAt: now,
        completedAt: now,
        bodyFree: true,
      };
    }
    try {
      await faults.afterLock?.();
      const batch = this.#repository.pendingBatch(this.#batchSize);
      const batchId = stableId("janitor_batch", batch.map((target) => target.targetId).join("\u0000") || `empty:${now.slice(0, 13)}`);
      const receipts: PurgeReceipt[] = [];
      for (const target of batch) {
        let outcome: PurgeReceipt["outcome"];
        if (faults.failTargetIds?.has(target.targetId) === true) outcome = "failed";
        else if (faults.purgeTarget) {
          try {
            outcome = await faults.purgeTarget(target);
          } catch {
            outcome = "failed";
          }
        } else outcome = target.payloadPresent ? "purged" : "already_absent";
        receipts.push(this.#repository.purge(target.targetId, now, outcome));
      }
      const failed = receipts.some((receipt) => receipt.outcome === "failed");
      if (!failed) this.#repository.recordSuccessfulRun(now);
      this.#recordIncidents(now);
      return {
        schemaVersion: "synthetic_janitor_run.v1",
        invocation,
        status: failed ? "partial_failure" : "completed",
        batchId,
        receipts,
        startedAt: now,
        completedAt: now,
        bodyFree: true,
      };
    } finally {
      this.#repository.releaseAdvisoryLock();
    }
  }

  health(now: string): JanitorHealth {
    this.#recordIncidents(now);
    const stale = Date.parse(now) - Date.parse(this.#repository.lastSuccessfulPurgeAt()) > UNHEALTHY_MS;
    const incidents = this.#repository.incidents();
    return {
      healthy: !stale,
      writesHealthy: !stale,
      emailHealthy: !stale,
      lastSuccessfulPurgeAt: this.#repository.lastSuccessfulPurgeAt(),
      incidents,
    };
  }

  #recordIncidents(now: string): void {
    for (const target of this.#repository.targets()) {
      if (target.payloadPresent && Date.parse(now) - Date.parse(target.terminalAt) >= PURGE_TARGET_MS) {
        this.#repository.openIncident("purge_target_missed", now, target.targetId);
      }
    }
    if (Date.parse(now) - Date.parse(this.#repository.lastSuccessfulPurgeAt()) > UNHEALTHY_MS) {
      this.#repository.openIncident("last_successful_purge_stale", now, null);
    }
  }
}
