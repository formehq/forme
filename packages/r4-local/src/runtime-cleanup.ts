import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { canonicalSha256, type Sha256 } from "../../r4-protocol/src/index.ts";
import { assertBodyFree, stableJson } from "./body-free.ts";
import type { ProtectedRoomLock } from "./lock.ts";
import {
  coordinatorForRoomLock,
  type InteractionLeaseV1,
  type ProtectedRoomMutationCoordinator,
} from "./coordinator.ts";
import { assertProtectedRootDisjoint, ensureProtectedRoot } from "./protected-root.ts";
import {
  isExactIsoTimestamp,
  isLocalToken,
  isPrefixedId,
  isSha256,
  parseExactPersistedRecord,
} from "./persisted-record.ts";

export type SyntheticFreshTerminal =
  | "normal"
  | "cancel"
  | "timeout"
  | "budget"
  | "schema_failure"
  | "process_kill"
  | "fork_attempt"
  | "huge_output"
  | "machine_crash";

const SYNTHETIC_FRESH_TERMINALS = new Set<SyntheticFreshTerminal>([
  "normal", "cancel", "timeout", "budget", "schema_failure",
  "process_kill", "fork_attempt", "huge_output", "machine_crash",
]);

export type RuntimeCleanupFault = "after_deny" | "after_body_remove" | "after_receipt";
export type RuntimeBeginFault = "after_marker" | "after_request" | "after_snapshot" | "after_stream";

export const SYNTHETIC_SUPERVISOR_LIMITS = {
  wallMilliseconds: 60 * 60 * 1_000,
  cpuMilliseconds: 30 * 60 * 1_000,
  residentBytes: 2 * 1_024 * 1_024 * 1_024,
  processCount: 32,
  fileDescriptors: 128,
  combinedOutputBytes: 32 * 1_024 * 1_024,
} as const;

/** Deterministic Gate A analogue of the outer supervisor's hard-stop matrix. */
export function classifySyntheticSupervisorTerminal(input: {
  wallMilliseconds: number;
  cpuMilliseconds: number;
  residentBytes: number;
  processCount: number;
  fileDescriptors: number;
  combinedOutputBytes: number;
  signal: "none" | "cancel" | "kill";
  schemaValid: boolean;
  budgetValid: boolean;
}): SyntheticFreshTerminal {
  for (const [label, value] of Object.entries(input)) {
    if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`synthetic supervisor observation invalid:${label}`);
    }
  }
  if (input.signal === "kill") return "process_kill";
  if (input.signal === "cancel") return "cancel";
  if (input.processCount > SYNTHETIC_SUPERVISOR_LIMITS.processCount) return "fork_attempt";
  if (input.combinedOutputBytes > SYNTHETIC_SUPERVISOR_LIMITS.combinedOutputBytes) return "huge_output";
  if (
    input.wallMilliseconds >= SYNTHETIC_SUPERVISOR_LIMITS.wallMilliseconds
    || input.cpuMilliseconds > SYNTHETIC_SUPERVISOR_LIMITS.cpuMilliseconds
    || input.residentBytes > SYNTHETIC_SUPERVISOR_LIMITS.residentBytes
    || input.fileDescriptors > SYNTHETIC_SUPERVISOR_LIMITS.fileDescriptors
  ) return "timeout";
  if (!input.budgetValid) return "budget";
  if (!input.schemaValid) return "schema_failure";
  return "normal";
}

export interface FreshRunMarkerV1 {
  readonly schemaVersion: "local_fresh_run_marker.v1";
  readonly runId: string;
  readonly roomId: string;
  readonly interactionId: string;
  readonly sessionEnvelopeHash: Sha256;
  readonly interactionLeaseNonceHash: Sha256;
  readonly ownerBootId: string;
  readonly ownerProcessId: number;
  readonly phase: "active" | "cleanup_required";
  readonly startedAt: string;
  readonly terminal: SyntheticFreshTerminal | null;
}

export interface FreshRunCleanupReceiptV1 {
  readonly schemaVersion: "local_fresh_run_cleanup_receipt.v1";
  readonly receiptId: string;
  readonly runId: string;
  readonly roomId: string;
  readonly interactionId: string;
  readonly sessionEnvelopeHash: Sha256;
  readonly interactionLeaseNonceHash: Sha256;
  readonly terminal: SyntheticFreshTerminal;
  readonly outcome: "runtime_bytes_absent";
  readonly completedAt: string;
}

function validId(value: string, prefix: string): void {
  if (!new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value)) throw new Error(`invalid ${prefix} ID`);
}

function contained(parent: string, child: string): boolean {
  const answer = relative(resolve(parent), resolve(child));
  return answer === "" || (!answer.startsWith("..") && !isAbsolute(answer));
}

function syncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function atomicJson(path: string, value: unknown): void {
  assertBodyFree(value);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, `${stableJson(value)}\n`, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

function byteFile(path: string, value: Uint8Array): void {
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, value);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * Gate A analogue of the protected ephemeral Fresh runtime root. It exercises
 * deny-first cleanup/recovery only; it does not claim to be the Gate B macOS
 * sandbox, launcher, or official Codex runtime.
 */
export class SyntheticFreshRuntimeStore {
  readonly root: string;
  readonly workspaceRoot: string;
  readonly lock: ProtectedRoomLock;
  readonly coordinator: ProtectedRoomMutationCoordinator;
  private readonly activeInteractionLeases = new Map<string, InteractionLeaseV1>();

  constructor(input: {
    root: string;
    workspaceRoot: string;
    lock: ProtectedRoomLock;
    coordinator?: ProtectedRoomMutationCoordinator;
  }) {
    this.root = resolve(input.root);
    this.workspaceRoot = resolve(input.workspaceRoot);
    this.lock = input.lock;
    this.coordinator = input.coordinator ?? coordinatorForRoomLock(input.lock);
    assertProtectedRootDisjoint(this.root, this.workspaceRoot);
  }

  private markerPath(runId: string): string {
    validId(runId, "run");
    return join(this.root, `${runId}.marker.json`);
  }

  private receiptPath(runId: string): string {
    validId(runId, "run");
    return join(this.root, `${runId}.cleanup-receipt.json`);
  }

  private bytesRoot(runId: string): string {
    validId(runId, "run");
    return join(this.root, `${runId}.ephemeral`);
  }

  private readMarker(runId: string): FreshRunMarkerV1 {
    const value = parseExactPersistedRecord(readFileSync(this.markerPath(runId), "utf8"), [
      "schemaVersion", "runId", "roomId", "interactionId", "sessionEnvelopeHash", "interactionLeaseNonceHash",
      "ownerBootId", "ownerProcessId", "phase", "startedAt", "terminal",
    ], "malformed Fresh runtime marker") as unknown as FreshRunMarkerV1;
    if (
      value.schemaVersion !== "local_fresh_run_marker.v1"
      || value.runId !== runId
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isSha256(value.sessionEnvelopeHash)
      || !isSha256(value.interactionLeaseNonceHash)
      || !isLocalToken(value.ownerBootId)
      || !Number.isSafeInteger(value.ownerProcessId)
      || value.ownerProcessId <= 0
      || (value.phase !== "active" && value.phase !== "cleanup_required")
      || !isExactIsoTimestamp(value.startedAt)
      || (value.terminal !== null && !SYNTHETIC_FRESH_TERMINALS.has(value.terminal))
    ) throw new Error("malformed Fresh runtime marker");
    assertBodyFree(value);
    return value;
  }

  begin(input: {
    runId: string;
    roomId: string;
    interactionId: string;
    sessionEnvelopeHash: Sha256;
    requestBytes: Uint8Array;
    snapshotBytes: Uint8Array;
    streamBytes?: Uint8Array;
    now: Date;
    synthetic: true;
    faultAt?: RuntimeBeginFault;
  }): FreshRunMarkerV1 {
    if (input.synthetic !== true) throw new Error("Gate A runtime store accepts synthetic bytes only");
    validId(input.runId, "run");
    validId(input.roomId, "room");
    validId(input.interactionId, "interaction");
    if (!/^sha256:[a-f0-9]{64}$/u.test(input.sessionEnvelopeHash)) throw new Error("invalid Session Envelope hash");
    const total = input.requestBytes.byteLength + input.snapshotBytes.byteLength + (input.streamBytes?.byteLength ?? 0);
    if (total > 12 * 1024 * 1024) throw new Error("synthetic Fresh runtime byte ceiling exceeded");
    ensureProtectedRoot(this.root, this.workspaceRoot);
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: input.roomId,
      interactionId: input.interactionId,
      operationClass: "response_prepare",
      now: input.now,
    });
    const marker: FreshRunMarkerV1 = {
      schemaVersion: "local_fresh_run_marker.v1",
      runId: input.runId,
      roomId: input.roomId,
      interactionId: input.interactionId,
      sessionEnvelopeHash: input.sessionEnvelopeHash,
      interactionLeaseNonceHash: canonicalSha256(interactionLease.record.nonce),
      ownerBootId: this.lock.bootId,
      ownerProcessId: process.pid,
      phase: "active",
      startedAt: input.now.toISOString(),
      terminal: null,
    };
    let retained = false;
    try {
      const result = this.coordinator.runSync(input.roomId, "fresh_runtime_begin", () => {
        if (existsSync(this.markerPath(input.runId)) || existsSync(this.bytesRoot(input.runId)) || existsSync(this.receiptPath(input.runId))) {
          throw new Error("Fresh runtime run already exists");
        }
        let markerCommitted = false;
        try {
          atomicJson(this.markerPath(input.runId), marker);
          markerCommitted = true;
          if (input.faultAt === "after_marker") throw new Error("injected Fresh runtime begin interruption:after_marker");
          const bytesRoot = this.bytesRoot(input.runId);
          mkdirSync(bytesRoot, { recursive: false, mode: 0o700 });
          byteFile(join(bytesRoot, "request.bin"), input.requestBytes);
          if (input.faultAt === "after_request") throw new Error("injected Fresh runtime begin interruption:after_request");
          byteFile(join(bytesRoot, "snapshot.bin"), input.snapshotBytes);
          if (input.faultAt === "after_snapshot") throw new Error("injected Fresh runtime begin interruption:after_snapshot");
          if (input.streamBytes) byteFile(join(bytesRoot, "runtime-stream.bin"), input.streamBytes);
          if (input.faultAt === "after_stream") throw new Error("injected Fresh runtime begin interruption:after_stream");
          syncDirectory(bytesRoot);
          return marker;
        } catch (error) {
          if (markerCommitted) {
            atomicJson(this.markerPath(input.runId), { ...marker, phase: "cleanup_required", terminal: "machine_crash" });
          }
          throw error;
        }
      }, input.now);
      this.activeInteractionLeases.set(input.runId, interactionLease);
      retained = true;
      return result;
    } catch (error) {
      if (existsSync(this.markerPath(input.runId))) {
        this.activeInteractionLeases.set(input.runId, interactionLease);
        retained = true;
      }
      throw error;
    } finally {
      if (!retained) interactionLease.release();
    }
  }

  inspect(): {
    readonly schemaVersion: "local_fresh_runtime_status.v1";
    readonly activeRunIds: readonly string[];
    readonly cleanupRequiredRunIds: readonly string[];
    readonly receiptCount: number;
  } {
    if (!existsSync(this.root)) {
      return { schemaVersion: "local_fresh_runtime_status.v1", activeRunIds: [], cleanupRequiredRunIds: [], receiptCount: 0 };
    }
    const activeRunIds: string[] = [];
    const cleanupRequiredRunIds: string[] = [];
    let receiptCount = 0;
    for (const name of readdirSync(this.root).sort()) {
      const markerMatch = /^(run_[A-Za-z0-9_-]{16,128})\.marker\.json$/u.exec(name);
      if (markerMatch?.[1]) {
        const marker = this.readMarker(markerMatch[1]);
        const ownedByThisRuntime = marker.ownerBootId === this.lock.bootId && marker.ownerProcessId === process.pid;
        (marker.phase === "active" && ownedByThisRuntime ? activeRunIds : cleanupRequiredRunIds).push(marker.runId);
      }
      if (/^run_[A-Za-z0-9_-]{16,128}\.cleanup-receipt\.json$/u.test(name)) receiptCount += 1;
    }
    const status = { schemaVersion: "local_fresh_runtime_status.v1" as const, activeRunIds, cleanupRequiredRunIds, receiptCount };
    assertBodyFree(status);
    return status;
  }

  readSyntheticArtifact(runId: string, name: "request" | "snapshot" | "runtime-stream"): Uint8Array {
    if (name !== "request" && name !== "snapshot" && name !== "runtime-stream") throw new Error("unknown Fresh runtime artifact");
    const routingMarker = this.readMarker(runId);
    return this.coordinator.runSync(routingMarker.roomId, "fresh_runtime_read", () => {
      const marker = this.readMarker(runId);
      if (
        canonicalSha256(marker) !== canonicalSha256(routingMarker)
        || marker.phase !== "active"
        || marker.ownerBootId !== this.lock.bootId
        || marker.ownerProcessId !== process.pid
      ) throw new Error("Fresh runtime bytes are denied pending cleanup");
      return readFileSync(join(this.bytesRoot(runId), `${name}.bin`));
    });
  }

  terminate(runId: string, terminal: SyntheticFreshTerminal, now = new Date(), fault?: RuntimeCleanupFault): FreshRunCleanupReceiptV1 {
    const routingMarker = this.readMarker(runId);
    const interactionLease = this.cleanupLeaseFor(routingMarker, now);
    try {
      return this.coordinator.runSync(routingMarker.roomId, "fresh_runtime_cleanup", () => {
        const marker = this.readMarker(runId);
        if (canonicalSha256(marker) !== canonicalSha256(routingMarker)) throw new Error("Fresh runtime marker changed before cleanup");
        return this.terminateUnlocked(marker, terminal, now, fault);
      }, now);
    } finally {
      if (existsSync(this.markerPath(runId))) {
        this.activeInteractionLeases.set(runId, interactionLease);
      } else {
        interactionLease.release();
        this.activeInteractionLeases.delete(runId);
      }
    }
  }

  reconcile(now = new Date()): FreshRunCleanupReceiptV1[] {
    if (!existsSync(this.root)) return [];
    const receipts: FreshRunCleanupReceiptV1[] = [];
    const runIds = readdirSync(this.root)
      .map((name) => /^(run_[A-Za-z0-9_-]{16,128})\.marker\.json$/u.exec(name)?.[1] ?? null)
      .filter((value): value is string => value !== null)
      .sort();
    for (const runId of runIds) {
      const routingMarker = this.readMarker(runId);
      const interactionLease = this.cleanupLeaseFor(routingMarker, now);
      try {
        receipts.push(this.coordinator.runSync(routingMarker.roomId, "fresh_runtime_reconcile", () => {
          const marker = this.readMarker(runId);
          if (marker.roomId !== routingMarker.roomId || marker.interactionId !== routingMarker.interactionId) {
            throw new Error("Fresh runtime marker changed before reconcile");
          }
          if (existsSync(this.receiptPath(runId)) && !existsSync(this.bytesRoot(runId))) {
            const receipt = this.readReceipt(runId, marker);
            rmSync(this.markerPath(runId));
            syncDirectory(this.root);
            return receipt;
          }
          return this.terminateUnlocked(marker, marker.terminal ?? "machine_crash", now);
        }, now));
      } finally {
        interactionLease.release();
        this.activeInteractionLeases.delete(runId);
      }
    }
    return receipts;
  }

  runtimeByteCount(runId: string): number {
    const root = this.bytesRoot(runId);
    if (!existsSync(root)) return 0;
    return readdirSync(root).reduce((total, name) => total + statSync(join(root, name)).size, 0);
  }

  private terminateUnlocked(
    marker: FreshRunMarkerV1,
    terminal: SyntheticFreshTerminal,
    now: Date,
    fault?: RuntimeCleanupFault,
  ): FreshRunCleanupReceiptV1 {
    const denied: FreshRunMarkerV1 = { ...marker, phase: "cleanup_required", terminal };
    atomicJson(this.markerPath(marker.runId), denied);
    if (fault === "after_deny") throw new Error("injected Fresh runtime cleanup interruption:after_deny");
    rmSync(this.bytesRoot(marker.runId), { recursive: true, force: true });
    syncDirectory(this.root);
    if (fault === "after_body_remove") throw new Error("injected Fresh runtime cleanup interruption:after_body_remove");
    const receipt: FreshRunCleanupReceiptV1 = {
      schemaVersion: "local_fresh_run_cleanup_receipt.v1",
      receiptId: `receipt_${canonicalSha256(denied).slice(7, 39)}`,
      runId: marker.runId,
      roomId: denied.roomId,
      interactionId: denied.interactionId,
      sessionEnvelopeHash: denied.sessionEnvelopeHash,
      interactionLeaseNonceHash: denied.interactionLeaseNonceHash,
      terminal,
      outcome: "runtime_bytes_absent",
      completedAt: now.toISOString(),
    };
    atomicJson(this.receiptPath(marker.runId), receipt);
    if (fault === "after_receipt") throw new Error("injected Fresh runtime cleanup interruption:after_receipt");
    rmSync(this.markerPath(marker.runId));
    syncDirectory(this.root);
    return receipt;
  }

  private readReceipt(runId: string, marker: FreshRunMarkerV1): FreshRunCleanupReceiptV1 {
    const value = parseExactPersistedRecord(readFileSync(this.receiptPath(runId), "utf8"), [
      "schemaVersion", "receiptId", "runId", "roomId", "interactionId", "sessionEnvelopeHash",
      "interactionLeaseNonceHash", "terminal", "outcome", "completedAt",
    ], "malformed Fresh runtime cleanup receipt") as unknown as FreshRunCleanupReceiptV1;
    if (
      value.schemaVersion !== "local_fresh_run_cleanup_receipt.v1"
      || value.runId !== runId
      || value.roomId !== marker.roomId
      || value.interactionId !== marker.interactionId
      || value.sessionEnvelopeHash !== marker.sessionEnvelopeHash
      || value.interactionLeaseNonceHash !== marker.interactionLeaseNonceHash
      || !SYNTHETIC_FRESH_TERMINALS.has(value.terminal)
      || value.outcome !== "runtime_bytes_absent"
      || !/^receipt_[A-Za-z0-9_-]{16,128}$/u.test(value.receiptId)
      || !isExactIsoTimestamp(value.completedAt)
    ) throw new Error("malformed Fresh runtime cleanup receipt");
    assertBodyFree(value);
    return value;
  }

  private cleanupLeaseFor(marker: FreshRunMarkerV1, now: Date): InteractionLeaseV1 {
    const held = this.activeInteractionLeases.get(marker.runId);
    if (held) {
      if (
        held.record.roomId !== marker.roomId
        || held.record.interactionId !== marker.interactionId
        || held.record.operationClass !== "response_prepare"
        || canonicalSha256(held.record.nonce) !== marker.interactionLeaseNonceHash
      ) throw new Error("Fresh runtime Interaction lease binding mismatch");
      return held;
    }
    const stale = this.coordinator.interactionLeases.inspect(marker.roomId, marker.interactionId);
    if (!stale || stale.operationClass !== "response_prepare" || canonicalSha256(stale.nonce) !== marker.interactionLeaseNonceHash) {
      throw new Error("Fresh runtime Interaction lease binding mismatch");
    }
    this.coordinator.interactionLeases.recoverStale(marker.roomId, marker.interactionId);
    return this.coordinator.beginInteractionOperation({
      roomId: marker.roomId,
      interactionId: marker.interactionId,
      operationClass: "candidate_cleanup",
      now,
    });
  }
}
