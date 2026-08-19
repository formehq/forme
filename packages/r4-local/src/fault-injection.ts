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
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { canonicalSha256, type Sha256 } from "../../r4-protocol/src/index.ts";
import { assertBodyFree, stableJson } from "./body-free.ts";

export const GATE_A_FAULT_STEPS = [
  "event_persist",
  "ack_request",
  "ack_receipt_persist",
  "cursor_persist",
  "publication_intent_persist",
  "publication_submit",
  "publication_receipt_persist",
  "cleanup_deny_persist",
  "cleanup_body_remove",
  "cleanup_receipt_persist",
] as const;

export type GateAFaultStep = (typeof GATE_A_FAULT_STEPS)[number];
export type GateAFaultPoint = `before_${GateAFaultStep}` | `after_${GateAFaultStep}`;

export const GATE_A_FAULT_POINTS: readonly GateAFaultPoint[] = GATE_A_FAULT_STEPS.flatMap((step) => [
  `before_${step}` as const,
  `after_${step}` as const,
]);

interface FakeRemoteCommit {
  readonly idempotencyKey: string;
  readonly requestHash: Sha256;
  readonly receiptId: string;
}

/** Stable fake server boundary used to prove response-loss reconciliation. */
export class FakeIdempotentBoundaryPort {
  private readonly commits = new Map<string, FakeRemoteCommit>();
  readonly attempts = new Map<string, number>();

  commit(idempotencyKey: string, requestHash: Sha256): FakeRemoteCommit {
    this.attempts.set(idempotencyKey, (this.attempts.get(idempotencyKey) ?? 0) + 1);
    const existing = this.commits.get(idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) throw new Error("fake boundary idempotency hash conflict");
      return structuredClone(existing);
    }
    const value: FakeRemoteCommit = {
      idempotencyKey,
      requestHash,
      receiptId: `receipt_${canonicalSha256({ idempotencyKey, requestHash }).slice(7, 39)}`,
    };
    this.commits.set(idempotencyKey, value);
    return structuredClone(value);
  }

  committedCount(): number {
    return this.commits.size;
  }
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function atomicJson(path: string, value: unknown): void {
  assertBodyFree(value);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${stableJson(value)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

function trip(selected: GateAFaultPoint | undefined, observed: GateAFaultPoint): void {
  if (selected === observed) throw new Error(`injected Gate A workflow interruption:${observed}`);
}

/**
 * File-backed Gate A analogue for the Packet's persist/ACK/cursor/publication/
 * cleanup recovery matrix. All body bytes are synthetic. No hosted mutation
 * or real connector is reachable from this class.
 */
export class SyntheticGateAFaultWorkflow {
  readonly root: string;
  readonly operationId: string;
  readonly requestHash: Sha256;
  readonly port: FakeIdempotentBoundaryPort;
  cleanupRemoveCount = 0;

  constructor(input: {
    root: string;
    operationId: string;
    requestHash: Sha256;
    port: FakeIdempotentBoundaryPort;
  }) {
    this.root = input.root;
    this.operationId = input.operationId;
    this.requestHash = input.requestHash;
    this.port = input.port;
    if (!/^operation_[A-Za-z0-9_-]{16,128}$/u.test(this.operationId)) throw new Error("invalid operation ID");
  }

  private artifact(step: GateAFaultStep): string {
    return join(this.root, `${this.operationId}.${step}.json`);
  }

  private syntheticBody(): string {
    return join(this.root, `${this.operationId}.synthetic-body.bin`);
  }

  initializeSyntheticBody(bytes: Uint8Array): void {
    if (existsSync(this.syntheticBody())) throw new Error("synthetic fault body already exists");
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const descriptor = openSync(this.syntheticBody(), "wx", 0o600);
    try {
      writeFileSync(descriptor, bytes);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    syncDirectory(this.root);
  }

  readSyntheticBody(): Uint8Array {
    if (existsSync(this.artifact("cleanup_deny_persist"))) throw new Error("synthetic body unavailable:deny_first");
    if (!existsSync(this.syntheticBody())) throw new Error("synthetic body unavailable");
    return readFileSync(this.syntheticBody());
  }

  async run(faultAt?: GateAFaultPoint): Promise<void> {
    for (const step of GATE_A_FAULT_STEPS) {
      if (existsSync(this.artifact(step))) continue;
      trip(faultAt, `before_${step}`);
      if (step === "ack_request" || step === "publication_submit") {
        const idempotencyKey = `${step}_${canonicalSha256({ operationId: this.operationId, requestHash: this.requestHash }).slice(7, 39)}`;
        const result = this.port.commit(idempotencyKey, this.requestHash);
        trip(faultAt, `after_${step}`);
        atomicJson(this.artifact(step), {
          schemaVersion: "synthetic_remote_effect_marker.v1",
          operationId: this.operationId,
          step,
          requestHash: this.requestHash,
          idempotencyKey,
          receiptId: result.receiptId,
        });
        continue;
      }
      if (step === "cleanup_body_remove") {
        if (existsSync(this.syntheticBody())) {
          rmSync(this.syntheticBody());
          this.cleanupRemoveCount += 1;
          syncDirectory(this.root);
        }
        trip(faultAt, `after_${step}`);
      }
      atomicJson(this.artifact(step), {
        schemaVersion: "synthetic_local_effect_marker.v1",
        operationId: this.operationId,
        step,
        requestHash: this.requestHash,
      });
      if (step !== "cleanup_body_remove") trip(faultAt, `after_${step}`);
    }
  }

  inspect(): {
    readonly completedSteps: readonly GateAFaultStep[];
    readonly syntheticBodyPresent: boolean;
    readonly bodyFreeArtifactCount: number;
  } {
    if (!existsSync(this.root)) return { completedSteps: [], syntheticBodyPresent: false, bodyFreeArtifactCount: 0 };
    const completedSteps = GATE_A_FAULT_STEPS.filter((step) => existsSync(this.artifact(step)));
    const artifacts = readdirSync(this.root).filter((name) => name.endsWith(".json"));
    for (const name of artifacts) assertBodyFree(JSON.parse(readFileSync(join(this.root, name), "utf8")));
    return {
      completedSteps,
      syntheticBodyPresent: existsSync(this.syntheticBody()),
      bodyFreeArtifactCount: artifacts.length,
    };
  }
}
