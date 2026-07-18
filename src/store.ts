import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertSafeRelativePath, scanWorkspace } from "./boundary.ts";
import {
  assertContextPacket,
  assertHeadRecord,
  assertReflectionProposal,
  assertTwinRevision,
  assertWorkspaceContract,
  canonicalJson,
  prettyJson,
  revisionFilename,
  sha256,
} from "./contracts.ts";
import { renderRestartView } from "./render.ts";
import { validateReflectionProposalForPacket } from "./reflection.ts";
import type {
  CognitionState,
  ContextPacketBuild,
  CorrectionRecord,
  EvidenceRecord,
  HeadRecord,
  InvalidationRecord,
  ObservationResult,
  OwnerFrame,
  PendingTransition,
  ReflectionRecord,
  RuntimeProposalResult,
  RuntimeReceipt,
  SourceChanges,
  TwinRevision,
  TwinRevisionV2,
  WorkspaceContract,
} from "./types.ts";

const STATE_ROOT = ".forme";
const DEFAULT_EXCLUDES = [".git", ".forme", "node_modules", "dist", "coverage", "build", "target"];

export type FailurePoint = "pending" | "revision" | "head" | "view";

interface ClockOptions {
  now?: () => Date;
}

interface StoreOptions extends ClockOptions {
  failurePoint?: FailurePoint;
  ownerFrame?: Partial<OwnerFrame>;
}

export interface CognitionTransitionOptions extends ClockOptions {
  failurePoint?: FailurePoint;
}

export interface InitWorkspaceOptions extends ClockOptions {
  workspaceRoot: string;
  name: string;
  activeIntent: string;
  nextMove: string;
  unresolved?: string[];
  sourceRoot?: string;
  includePaths: string[];
  excludeNames?: string[];
  maxFileBytes?: number;
  workspaceId?: string;
}

function paths(workspaceRoot: string): {
  root: string;
  workspace: string;
  head: string;
  revisions: string;
  view: string;
  pending: string;
  lock: string;
} {
  const root = join(resolve(workspaceRoot), STATE_ROOT);
  return {
    root,
    workspace: join(root, "workspace.json"),
    head: join(root, "HEAD"),
    revisions: join(root, "revisions"),
    view: join(root, "restart.md"),
    pending: join(root, "pending-transition.json"),
    lock: join(root, "LOCK"),
  };
}

function timestamp(options: ClockOptions): string {
  return (options.now?.() ?? new Date()).toISOString();
}

function shortHash(value: string): string {
  return sha256(value).slice("sha256:".length, "sha256:".length + 32);
}

function emptyCognition(): CognitionState {
  return { reflections: [], corrections: [], invalidations: [], runtimeReceipts: [] };
}

function cognitionFrom(revision: TwinRevision): CognitionState {
  return structuredClone(revision.schemaVersion === "2" ? revision.cognition : emptyCognition());
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, content, { encoding: "utf8" });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    rmSync(temporary, { force: true });
  }
}

function parseJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`invalid JSON in ${basename(path)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertGitIgnored(workspaceRoot: string): void {
  const result = spawnSync("git", ["check-ignore", "-q", "--", `${STATE_ROOT}/`], {
    cwd: workspaceRoot,
    stdio: "ignore",
  });
  if (result.status !== 0) throw new Error(`${STATE_ROOT}/ must be ignored by Git before Forme state is created`);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function acquireLock(path: string): void {
  try {
    writeFileSync(path, `${process.pid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const body = readFileSync(path, "utf8").trim();
  const pid = Number.parseInt(body, 10);
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Forme writer lock is malformed and cannot be recovered safely");
  if (pidAlive(pid)) throw new Error(`another Forme writer is active with process ${pid}`);
  rmSync(path);
  writeFileSync(path, `${process.pid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

function withLock<T>(workspaceRoot: string, operation: () => T): T {
  const state = paths(workspaceRoot);
  acquireLock(state.lock);
  try {
    return operation();
  } finally {
    if (existsSync(state.lock) && readFileSync(state.lock, "utf8").trim() === String(process.pid)) {
      rmSync(state.lock);
    }
  }
}

export function loadWorkspaceContract(workspaceRoot: string): WorkspaceContract {
  const value = parseJson(paths(workspaceRoot).workspace);
  assertWorkspaceContract(value);
  return value;
}

function readHead(path: string): HeadRecord | null {
  if (!existsSync(path)) return null;
  const value = parseJson(path);
  assertHeadRecord(value);
  return value;
}

function readCurrentRevision(workspaceRoot: string): TwinRevision | null {
  const state = paths(workspaceRoot);
  const head = readHead(state.head);
  if (!head) return null;
  const revisionPath = join(state.revisions, head.file);
  if (!existsSync(revisionPath)) throw new Error(`HEAD references missing revision ${head.file}`);
  const body = readFileSync(revisionPath, "utf8");
  if (sha256(body) !== head.contentHash) throw new Error(`HEAD checksum mismatch for ${head.file}`);
  const value = JSON.parse(body) as unknown;
  assertTwinRevision(value);
  if (value.revision !== head.revision) throw new Error("HEAD revision does not match its snapshot");
  return value;
}

function revisionBody(revision: TwinRevision): string {
  assertTwinRevision(revision);
  return prettyJson(revision);
}

function applyPending(workspaceRoot: string, pending: PendingTransition, failurePoint?: FailurePoint): void {
  const state = paths(workspaceRoot);
  assertTwinRevision(pending.revision);
  if (pending.schemaVersion !== "1" || pending.view !== renderRestartView(pending.revision)) {
    throw new Error("pending transition contract failed");
  }
  const body = revisionBody(pending.revision);
  const filename = revisionFilename(pending.revision.revision);
  const destination = join(state.revisions, filename);
  if (existsSync(destination) && readFileSync(destination, "utf8") !== body) {
    throw new Error(`immutable revision ${pending.revision.revision} already contains different state`);
  }
  if (!existsSync(destination)) atomicWrite(destination, body);
  if (failurePoint === "revision") throw new Error("injected failure after revision write");

  const head: HeadRecord = {
    schemaVersion: "1",
    revision: pending.revision.revision,
    file: filename,
    contentHash: sha256(body),
  };
  assertHeadRecord(head);
  atomicWrite(state.head, prettyJson(head));
  if (failurePoint === "head") throw new Error("injected failure after HEAD write");

  atomicWrite(state.view, pending.view);
  if (failurePoint === "view") throw new Error("injected failure after view write");
  rmSync(state.pending, { force: true });
}

function readPending(path: string): PendingTransition {
  const value = parseJson(path);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("pending transition contract failed");
  const pending = value as Partial<PendingTransition>;
  if (pending.schemaVersion !== "1" || typeof pending.view !== "string") {
    throw new Error("pending transition contract failed");
  }
  assertTwinRevision(pending.revision);
  return pending as PendingTransition;
}

function recoverPending(workspaceRoot: string): void {
  const state = paths(workspaceRoot);
  if (existsSync(state.pending)) applyPending(workspaceRoot, readPending(state.pending));
}

function persistTransition(
  workspaceRoot: string,
  revision: TwinRevision,
  view: string,
  failurePoint?: FailurePoint,
): void {
  const state = paths(workspaceRoot);
  const pending: PendingTransition = { schemaVersion: "1", revision, view };
  atomicWrite(state.pending, prettyJson(pending));
  if (failurePoint === "pending") throw new Error("injected failure after pending transition write");
  applyPending(workspaceRoot, pending, failurePoint);
}

function evidenceMeaning(evidence: EvidenceRecord[]): string {
  return canonicalJson(evidence.map(({ relativePath, contentHash, sizeBytes }) => ({ relativePath, contentHash, sizeBytes })));
}

function ownerFrameMeaning(ownerFrame: OwnerFrame): string {
  return canonicalJson(ownerFrame);
}

function mergeOwnerFrame(current: OwnerFrame, update: Partial<OwnerFrame>): OwnerFrame {
  return {
    activeIntent: update.activeIntent === undefined ? current.activeIntent : update.activeIntent.trim(),
    nextMove: update.nextMove === undefined ? current.nextMove : update.nextMove.trim(),
    unresolved: update.unresolved === undefined
      ? current.unresolved
      : update.unresolved.map((item) => item.trim()).filter(Boolean),
  };
}

function changes(previous: EvidenceRecord[], current: EvidenceRecord[]): SourceChanges {
  const before = new Map(previous.map((item) => [item.relativePath, item]));
  const after = new Map(current.map((item) => [item.relativePath, item]));
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  for (const item of current) {
    const prior = before.get(item.relativePath);
    if (!prior) added.push(item.relativePath);
    else if (prior.contentHash !== item.contentHash || prior.sizeBytes !== item.sizeBytes) modified.push(item.relativePath);
  }
  for (const item of previous) {
    if (!after.has(item.relativePath)) deleted.push(item.relativePath);
  }
  return { added, modified, deleted };
}

export function initWorkspace(options: InitWorkspaceOptions): ObservationResult {
  const workspaceRoot = resolve(options.workspaceRoot);
  assertGitIgnored(workspaceRoot);
  const state = paths(workspaceRoot);
  if (existsSync(state.root)) throw new Error(`${STATE_ROOT}/ already exists; use observe or status`);
  const includePaths = [...new Set(options.includePaths.map((item) => item.replaceAll("\\", "/")))].sort();
  const excludeNames = [...new Set([...DEFAULT_EXCLUDES, ...(options.excludeNames ?? [])])].sort();
  const excluded = new Set(excludeNames);
  const sourceRoot = assertSafeRelativePath(options.sourceRoot ?? ".", "source root");
  if (sourceRoot.split("/").some((segment) => excluded.has(segment))) {
    throw new Error(`source root crosses an excluded boundary: ${sourceRoot}`);
  }
  for (const includePath of includePaths) {
    const safe = assertSafeRelativePath(includePath, "include path");
    if (safe === ".") throw new Error("include path must name an explicit file or directory, not the whole source root");
    if (safe.split("/").some((segment) => excluded.has(segment))) {
      throw new Error(`include path crosses an excluded boundary: ${safe}`);
    }
  }
  const contract: WorkspaceContract = {
    schemaVersion: "1",
    workspaceId: options.workspaceId ?? `wsp_${randomUUID().replaceAll("-", "")}`,
    name: options.name.trim(),
    createdAt: timestamp(options),
    source: {
      root: sourceRoot,
      includePaths,
      excludeNames,
      maxFileBytes: options.maxFileBytes ?? 1_048_576,
      followSymlinks: false,
    },
    ownerFrame: {
      activeIntent: options.activeIntent.trim(),
      nextMove: options.nextMove.trim(),
      unresolved: (options.unresolved ?? []).map((item) => item.trim()).filter(Boolean),
    },
  };
  assertWorkspaceContract(contract);
  mkdirSync(state.revisions, { recursive: true, mode: 0o700 });
  atomicWrite(state.workspace, prettyJson(contract));
  return observeWorkspace(workspaceRoot, options);
}

export function observeWorkspace(workspaceRoot: string, options: StoreOptions = {}): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    let contract = loadWorkspaceContract(root);
    const previous = readCurrentRevision(root);
    let ownerFrameChanged = false;
    if (options.ownerFrame) {
      const updatedContract: WorkspaceContract = {
        ...contract,
        ownerFrame: mergeOwnerFrame(contract.ownerFrame, options.ownerFrame),
      };
      assertWorkspaceContract(updatedContract);
      ownerFrameChanged = ownerFrameMeaning(updatedContract.ownerFrame) !== ownerFrameMeaning(contract.ownerFrame);
      contract = updatedContract;
    }
    const scan = scanWorkspace(root, contract);
    const contractHash = sha256(canonicalJson(contract));
    const unchanged = previous
      && previous.workspaceContractHash === contractHash
      && evidenceMeaning(previous.evidence) === evidenceMeaning(scan.evidence)
      && ownerFrameMeaning(previous.ownerFrame) === ownerFrameMeaning(contract.ownerFrame);
    if (unchanged) {
      const view = renderRestartView(previous);
      const state = paths(root);
      if (!existsSync(state.view) || readFileSync(state.view, "utf8") !== view) atomicWrite(state.view, view);
      return { changed: false, revision: previous, view };
    }

    const baseRevision = {
      workspaceId: contract.workspaceId,
      revision: (previous?.revision ?? 0) + 1,
      previousRevision: previous?.revision ?? null,
      observedAt: timestamp(options),
      workspaceContractHash: contractHash,
      evidence: scan.evidence,
      changes: changes(previous?.evidence ?? [], scan.evidence),
      ownerFrame: contract.ownerFrame,
      warnings: scan.warnings,
    };
    const revision: TwinRevision = previous?.schemaVersion === "2"
      ? { schemaVersion: "2", ...baseRevision, cognition: structuredClone(previous.cognition) }
      : { schemaVersion: "1", ...baseRevision };
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    if (ownerFrameChanged) atomicWrite(paths(root).workspace, prettyJson(contract));
    persistTransition(root, revision, view, options.failurePoint);
    return { changed: true, revision, view };
  });
}

export function admitReflection(
  workspaceRoot: string,
  packetBuild: ContextPacketBuild,
  runtime: RuntimeProposalResult,
  options: CognitionTransitionOptions = {},
): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  assertContextPacket(packetBuild.packet);
  assertReflectionProposal(runtime.proposal);
  validateReflectionProposalForPacket(runtime.proposal, packetBuild.packet);
  if (packetBuild.packetHash !== sha256(canonicalJson(packetBuild.packet))) {
    throw new Error("Context Packet hash does not match its canonical content");
  }
  if (runtime.audit.toolEventCount !== 0 || !runtime.audit.turnCompleted) {
    throw new Error("unauthorized or incomplete runtime audit cannot enter the Twin");
  }
  return withLock(root, () => {
    recoverPending(root);
    loadWorkspaceContract(root);
    const current = readCurrentRevision(root);
    if (!current) throw new Error("workspace has no committed Twin revision");
    if (current.revision !== packetBuild.packet.baseTwinRevision) {
      throw new Error("Reflection proposal base revision is stale");
    }
    const cognition = cognitionFrom(current);
    if (cognition.reflections.some((item) => item.proposalId === runtime.proposal.proposalId)) {
      throw new Error("Reflection proposal has already been admitted");
    }
    const proposalHash = sha256(canonicalJson(runtime.proposal));
    const receiptId = `run_${shortHash(canonicalJson({
      packetHash: packetBuild.packetHash,
      proposalHash,
      cliVersion: runtime.cliVersion,
      model: runtime.model,
    }))}`;
    const reflectionId = `ref_${shortHash(canonicalJson({
      proposalId: runtime.proposal.proposalId,
      proposalHash,
      receiptId,
    }))}`;
    const dependentOutputId = `out_${shortHash(`restart-view:${reflectionId}`)}`;
    const receipt: RuntimeReceipt = {
      receiptId,
      adapter: "codex-exec",
      cliVersion: runtime.cliVersion,
      model: runtime.model,
      packetHash: packetBuild.packetHash,
      proposalHash,
      baseTwinRevision: packetBuild.packet.baseTwinRevision,
      validationResult: "accepted",
      completedAt: runtime.completedAt,
      audit: runtime.audit,
    };
    const evidenceById = new Map(packetBuild.packet.evidence.map((item) => [item.evidenceId, item]));
    const reflection: ReflectionRecord = {
      reflectionId,
      status: "inferred",
      authoredBy: "codex",
      baseTwinRevision: packetBuild.packet.baseTwinRevision,
      claim: runtime.proposal.claim,
      relationType: runtime.proposal.relationType,
      evidence: runtime.proposal.evidenceIds.map((id) => {
        const evidence = evidenceById.get(id);
        if (!evidence) throw new Error(`Reflection evidence disappeared before admission: ${id}`);
        return evidence;
      }),
      uncertainty: runtime.proposal.uncertainty,
      alternativeExplanation: runtime.proposal.alternativeExplanation,
      implication: runtime.proposal.implication,
      ownerQuestion: runtime.proposal.ownerQuestion,
      proposalId: runtime.proposal.proposalId,
      runtimeReceiptId: receiptId,
      dependentOutputIds: [dependentOutputId],
      supersedesReflectionId: null,
      supersededByReflectionId: null,
      createdAt: runtime.completedAt,
    };
    cognition.reflections.push(reflection);
    cognition.runtimeReceipts.push(receipt);
    const revision: TwinRevisionV2 = {
      schemaVersion: "2",
      workspaceId: current.workspaceId,
      revision: current.revision + 1,
      previousRevision: current.revision,
      observedAt: timestamp(options),
      workspaceContractHash: current.workspaceContractHash,
      evidence: current.evidence,
      changes: { added: [], modified: [], deleted: [] },
      ownerFrame: current.ownerFrame,
      warnings: current.warnings,
      cognition,
    };
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    persistTransition(root, revision, view, options.failurePoint);
    return { changed: true, revision, view };
  });
}

export function correctReflection(
  workspaceRoot: string,
  targetReflectionId: string,
  correctionText: string,
  options: CognitionTransitionOptions = {},
): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  const text = correctionText.trim();
  if (text.length === 0 || text.length > 4000) throw new Error("owner correction must be between 1 and 4000 characters");
  return withLock(root, () => {
    recoverPending(root);
    loadWorkspaceContract(root);
    const current = readCurrentRevision(root);
    if (!current || current.schemaVersion !== "2") throw new Error("workspace has no R2 Reflection to correct");
    const cognition = cognitionFrom(current);
    const targetIndex = cognition.reflections.findIndex((item) => item.reflectionId === targetReflectionId);
    const target = cognition.reflections[targetIndex];
    if (!target) throw new Error(`unknown Reflection: ${targetReflectionId}`);
    if (target.status !== "inferred" && target.status !== "corrected") {
      throw new Error(`Reflection is not active and cannot be corrected: ${targetReflectionId}`);
    }
    const correctedAt = timestamp(options);
    const correctionId = `cor_${shortHash(canonicalJson({
      targetReflectionId,
      text,
      baseTwinRevision: current.revision,
    }))}`;
    const correctedReflectionId = `ref_${shortHash(canonicalJson({ correctionId, text }))}`;
    const correctedOutputId = `out_${shortHash(`restart-view:${correctedReflectionId}`)}`;
    cognition.reflections[targetIndex] = {
      ...target,
      status: "superseded",
      supersededByReflectionId: correctedReflectionId,
    };
    const corrected: ReflectionRecord = {
      reflectionId: correctedReflectionId,
      status: "corrected",
      authoredBy: "owner",
      baseTwinRevision: current.revision,
      claim: text,
      relationType: target.relationType,
      evidence: target.evidence,
      uncertainty: null,
      alternativeExplanation: null,
      implication: "Future proposals must use this owner-authored correction as active context.",
      ownerQuestion: null,
      proposalId: null,
      runtimeReceiptId: null,
      dependentOutputIds: [correctedOutputId],
      supersedesReflectionId: target.reflectionId,
      supersededByReflectionId: null,
      createdAt: correctedAt,
    };
    const correction: CorrectionRecord = {
      correctionId,
      targetReflectionId: target.reflectionId,
      correctedReflectionId,
      correctionText: text,
      authority: "owner",
      baseTwinRevision: current.revision,
      correctedAt,
    };
    const invalidations: InvalidationRecord[] = target.dependentOutputIds.map((targetId) => ({
      invalidationId: `inv_${shortHash(canonicalJson({ targetId, correctionId }))}`,
      targetType: "derived-output",
      targetId,
      causedByCorrectionId: correctionId,
      reason: "Owner correction superseded the interpretation used to derive this output.",
      invalidatedAt: correctedAt,
    }));
    cognition.reflections.push(corrected);
    cognition.corrections.push(correction);
    cognition.invalidations.push(...invalidations);
    const revision: TwinRevisionV2 = {
      schemaVersion: "2",
      workspaceId: current.workspaceId,
      revision: current.revision + 1,
      previousRevision: current.revision,
      observedAt: correctedAt,
      workspaceContractHash: current.workspaceContractHash,
      evidence: current.evidence,
      changes: { added: [], modified: [], deleted: [] },
      ownerFrame: current.ownerFrame,
      warnings: current.warnings,
      cognition,
    };
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    persistTransition(root, revision, view, options.failurePoint);
    return { changed: true, revision, view };
  });
}

export function statusWorkspace(workspaceRoot: string): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    loadWorkspaceContract(root);
    const revision = readCurrentRevision(root);
    if (!revision) throw new Error("workspace has no committed Twin revision");
    const view = renderRestartView(revision);
    const state = paths(root);
    if (!existsSync(state.view) || readFileSync(state.view, "utf8") !== view) atomicWrite(state.view, view);
    return { changed: false, revision, view };
  });
}
