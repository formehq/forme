import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertSafeRelativePath, scanWorkspace } from "./boundary.ts";
import {
  compileEffectPlan,
  managedBody,
  materializeExecution,
  materializeRollback,
  R3_PLACEHOLDER_BODY,
  R3_TARGET_PATH,
  validateActionProposalForPacket,
} from "./action.ts";
import {
  assertActionContextPacket,
  assertActionIntentProposal,
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
  ActionApprovalRecord,
  ActionContextPacketBuild,
  ActionExecutionResult,
  ActionInvalidationRecord,
  ActionProposalRecord,
  ActionRuntimeProposalResult,
  AgencyState,
  CognitionState,
  ContextPacketBuild,
  CorrectionRecord,
  EvidenceRecord,
  EffectReceipt,
  HeadRecord,
  InvalidationRecord,
  ObservationResult,
  OwnerFrame,
  PendingTransition,
  PendingEffect,
  ReflectionRecord,
  RuntimeProposalResult,
  RuntimeReceipt,
  SourceChanges,
  TwinRevision,
  TwinRevisionV2,
  TwinRevisionV3,
  WorkspaceContract,
} from "./types.ts";

const STATE_ROOT = ".forme";
const DEFAULT_EXCLUDES = [".git", ".forme", "node_modules", "dist", "coverage", "build", "target"];

export type FailurePoint = "pending" | "revision" | "head" | "view";
export type EffectFailurePoint = "effect-pending" | "effect-write" | "effect-revision" | "effect-head" | "effect-view";

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

export interface ActionTransitionOptions extends ClockOptions {
  failurePoint?: FailurePoint | EffectFailurePoint;
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
  pendingEffect: string;
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
    pendingEffect: join(root, "pending-effect.json"),
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

function emptyAgency(): AgencyState {
  return { proposals: [], approvals: [], runtimeReceipts: [], effectReceipts: [], invalidations: [] };
}

function cognitionFrom(revision: TwinRevision): CognitionState {
  return structuredClone(revision.schemaVersion === "1" ? emptyCognition() : revision.cognition);
}

function agencyFrom(revision: TwinRevision): AgencyState {
  return structuredClone(revision.schemaVersion === "3" ? revision.agency : emptyAgency());
}

function invalidateActiveAgency(
  agency: AgencyState,
  causedByTwinRevision: number,
  invalidatedAt: string,
  reason: string,
  causedByCorrectionId: string | null = null,
): void {
  for (const proposal of agency.proposals) {
    if (proposal.status !== "proposed" && proposal.status !== "approved") continue;
    proposal.status = "invalidated";
    const approval = agency.approvals.find((item) => item.approvalId === proposal.approvalId);
    if (approval?.status === "approved") {
      approval.status = "invalidated";
      approval.consumedAt = invalidatedAt;
    }
    agency.invalidations.push({
      invalidationId: `ainv_${shortHash(canonicalJson({
        proposalId: proposal.proposal.proposalId,
        causedByTwinRevision,
        causedByCorrectionId,
      }))}`,
      proposalId: proposal.proposal.proposalId,
      causedByCorrectionId,
      causedByTwinRevision,
      reason,
      invalidatedAt,
    });
  }
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

function atomicWriteSource(path: string, content: string): void {
  const mode = statSync(path).mode & 0o777;
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, "wx", mode);
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

    const observedAt = timestamp(options);
    const baseRevision = {
      workspaceId: contract.workspaceId,
      revision: (previous?.revision ?? 0) + 1,
      previousRevision: previous?.revision ?? null,
      observedAt,
      workspaceContractHash: contractHash,
      evidence: scan.evidence,
      changes: changes(previous?.evidence ?? [], scan.evidence),
      ownerFrame: contract.ownerFrame,
      warnings: scan.warnings,
    };
    const revision: TwinRevision = previous?.schemaVersion === "3"
      ? (() => {
          const agency = agencyFrom(previous);
          invalidateActiveAgency(
            agency,
            baseRevision.revision,
            observedAt,
            "A later source or Owner Frame observation broke the action proposal revision chain.",
          );
          return {
          schemaVersion: "3",
          ...baseRevision,
          cognition: structuredClone(previous.cognition),
          agency,
          };
        })()
      : previous?.schemaVersion === "2"
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
    const revisionBase = {
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
    const revision: TwinRevisionV2 | TwinRevisionV3 = current.schemaVersion === "3"
      ? (() => {
          const agency = agencyFrom(current);
          invalidateActiveAgency(
            agency,
            revisionBase.revision,
            revisionBase.observedAt,
            "A later Reflection admission broke the action proposal revision chain.",
          );
          return { schemaVersion: "3" as const, ...revisionBase, agency };
        })()
      : { schemaVersion: "2", ...revisionBase };
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
    if (!current || current.schemaVersion === "1") throw new Error("workspace has no R2 Reflection to correct");
    const cognition = cognitionFrom(current);
    const agency = agencyFrom(current);
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
    const actionInvalidations: ActionInvalidationRecord[] = [];
    for (const proposal of agency.proposals) {
      if (
        proposal.correctedReflectionId === target.reflectionId
        && (proposal.status === "proposed" || proposal.status === "approved")
      ) {
        proposal.status = "invalidated";
        const approval = agency.approvals.find((item) => item.approvalId === proposal.approvalId);
        if (approval?.status === "approved") {
          approval.status = "invalidated";
          approval.consumedAt = correctedAt;
        }
        actionInvalidations.push({
          invalidationId: `ainv_${shortHash(canonicalJson({ proposalId: proposal.proposal.proposalId, correctionId }))}`,
          proposalId: proposal.proposal.proposalId,
          causedByCorrectionId: correctionId,
          causedByTwinRevision: current.revision + 1,
          reason: "Owner correction superseded the active meaning used by this action proposal.",
          invalidatedAt: correctedAt,
        });
      }
    }
    agency.invalidations.push(...actionInvalidations);
    const revisionBase = {
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
    const revision: TwinRevisionV2 | TwinRevisionV3 = current.schemaVersion === "3"
      ? { schemaVersion: "3", ...revisionBase, agency }
      : { schemaVersion: "2", ...revisionBase };
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    persistTransition(root, revision, view, options.failurePoint);
    return { changed: true, revision, view };
  });
}

function persistenceFailure(point: FailurePoint | EffectFailurePoint | undefined): FailurePoint | undefined {
  return point === "pending" || point === "revision" || point === "head" || point === "view" ? point : undefined;
}

function targetFile(workspaceRoot: string, contract: WorkspaceContract, revision: TwinRevision): string {
  if (contract.source.root !== ".") throw new Error("R3 requires README.md at the workspace root");
  if (!revision.evidence.some((item) => item.relativePath === R3_TARGET_PATH)) {
    throw new Error("README.md is not an existing allowlisted source in the current Twin revision");
  }
  const target = join(workspaceRoot, R3_TARGET_PATH);
  const stats = lstatSync(target);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("R3 target must be a regular non-symlink README.md");
  return target;
}

function assertWorkspaceMatchesRevision(
  workspaceRoot: string,
  contract: WorkspaceContract,
  revision: TwinRevision,
): void {
  const scan = scanWorkspace(workspaceRoot, contract);
  if (evidenceMeaning(scan.evidence) !== evidenceMeaning(revision.evidence)) {
    throw new Error("workspace sources changed outside the current Twin revision; run observe before continuing");
  }
}

function nextV3Revision(
  current: TwinRevision,
  observedAt: string,
  agency: AgencyState,
  evidence: EvidenceRecord[] = current.evidence,
  sourceChanges: SourceChanges = { added: [], modified: [], deleted: [] },
): TwinRevisionV3 {
  return {
    schemaVersion: "3",
    workspaceId: current.workspaceId,
    revision: current.revision + 1,
    previousRevision: current.revision,
    observedAt,
    workspaceContractHash: current.workspaceContractHash,
    evidence,
    changes: sourceChanges,
    ownerFrame: current.ownerFrame,
    warnings: current.warnings,
    cognition: cognitionFrom(current),
    agency,
  };
}

export function admitActionProposal(
  workspaceRoot: string,
  packetBuild: ActionContextPacketBuild,
  runtime: ActionRuntimeProposalResult,
  options: ActionTransitionOptions = {},
): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  assertActionContextPacket(packetBuild.packet);
  assertActionIntentProposal(runtime.proposal);
  validateActionProposalForPacket(runtime.proposal, packetBuild.packet);
  if (packetBuild.packetHash !== sha256(canonicalJson(packetBuild.packet))) {
    throw new Error("Action Context Packet hash does not match its canonical content");
  }
  if (runtime.audit.toolEventCount !== 0 || !runtime.audit.turnCompleted) {
    throw new Error("unauthorized or incomplete action runtime audit cannot enter the Twin");
  }
  return withLock(root, () => {
    recoverPending(root);
    recoverPendingEffect(root);
    const contract = loadWorkspaceContract(root);
    const current = readCurrentRevision(root);
    if (!current || current.schemaVersion === "1") throw new Error("R3 requires an owner-corrected R2 Reflection");
    if (current.revision !== packetBuild.packet.baseTwinRevision) throw new Error("Action proposal base revision is stale");
    const activeReflection = current.cognition.reflections.find((item) => (
      item.reflectionId === packetBuild.packet.correctedReflection.reflectionId
      && item.status === "corrected"
      && item.authoredBy === "owner"
    ));
    const activeCorrection = current.cognition.corrections.find((item) => (
      item.correctionId === packetBuild.packet.correctedReflection.correctionId
      && item.correctedReflectionId === activeReflection?.reflectionId
    ));
    if (!activeReflection || !activeCorrection) throw new Error("Action proposal no longer has an active owner-corrected Reflection");
    assertWorkspaceMatchesRevision(root, contract, current);
    const target = targetFile(root, contract, current);
    const plan = compileEffectPlan(readFileSync(target, "utf8"), runtime.proposal, activeReflection.reflectionId);
    const effectPlanHash = sha256(canonicalJson(plan));
    const proposalHash = sha256(canonicalJson(runtime.proposal));
    const agency = agencyFrom(current);
    if (agency.proposals.some((item) => item.proposal.proposalId === runtime.proposal.proposalId)) {
      throw new Error("Action proposal has already been admitted");
    }
    if (agency.proposals.some((item) => item.status === "proposed" || item.status === "approved")) {
      throw new Error("another R3 action proposal is already active");
    }
    const receiptId = `run_${shortHash(canonicalJson({
      packetHash: packetBuild.packetHash,
      proposalHash,
      cliVersion: runtime.cliVersion,
      model: runtime.model,
      kind: "action",
    }))}`;
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
    const record: ActionProposalRecord = {
      proposal: runtime.proposal,
      proposalHash,
      packetHash: packetBuild.packetHash,
      correctedReflectionId: activeReflection.reflectionId,
      correctionId: activeCorrection.correctionId,
      runtimeReceiptId: receiptId,
      effectPlan: plan,
      effectPlanHash,
      admittedRevision: current.revision + 1,
      status: "proposed",
      approvalId: null,
      effectReceiptIds: [],
      createdAt: runtime.completedAt,
    };
    agency.proposals.push(record);
    agency.runtimeReceipts.push(receipt);
    const revision = nextV3Revision(current, timestamp(options), agency);
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    persistTransition(root, revision, view, persistenceFailure(options.failurePoint));
    return { changed: true, revision, view };
  });
}

export function approveAction(
  workspaceRoot: string,
  proposalId: string,
  effectPlanHash: string,
  options: ActionTransitionOptions = {},
): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    recoverPendingEffect(root);
    const contract = loadWorkspaceContract(root);
    const current = readCurrentRevision(root);
    if (!current || current.schemaVersion !== "3") throw new Error("workspace has no R3 action proposal");
    const agency = agencyFrom(current);
    const record = agency.proposals.find((item) => item.proposal.proposalId === proposalId);
    if (!record) throw new Error(`unknown action proposal: ${proposalId}`);
    if (record.status !== "proposed") throw new Error(`action proposal cannot be approved from status ${record.status}`);
    if (current.revision !== record.admittedRevision) throw new Error("action proposal revision chain is no longer unbroken");
    if (record.effectPlanHash !== effectPlanHash) throw new Error("owner approval effect-plan hash does not match the proposed effect");
    if (sha256(canonicalJson(record.effectPlan)) !== effectPlanHash) throw new Error("stored effect plan hash is invalid");
    assertWorkspaceMatchesRevision(root, contract, current);
    const target = targetFile(root, contract, current);
    const body = readFileSync(target, "utf8");
    if (
      sha256(body) !== record.effectPlan.beforeFileHash
      || sha256(managedBody(body)) !== record.effectPlan.beforeBlockHash
    ) throw new Error("README.md changed after effect compilation");
    const approvedAt = timestamp(options);
    const approvalId = `apr_${shortHash(canonicalJson({
      proposalId,
      proposalHash: record.proposalHash,
      effectPlanHash,
      baseTwinRevision: current.revision,
    }))}`;
    const approval: ActionApprovalRecord = {
      approvalId,
      proposalId,
      proposalHash: record.proposalHash,
      effectPlanHash,
      authority: "owner",
      baseTwinRevision: current.revision,
      approvedAt,
      status: "approved",
      consumedAt: null,
    };
    record.status = "approved";
    record.approvalId = approvalId;
    agency.approvals.push(approval);
    const revision = nextV3Revision(current, approvedAt, agency);
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    persistTransition(root, revision, view, persistenceFailure(options.failurePoint));
    return { changed: true, revision, view };
  });
}

function readPendingEffect(path: string): PendingEffect {
  const value = parseJson(path);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("pending effect contract failed");
  const pending = value as Record<string, unknown>;
  const keys = Object.keys(pending).sort();
  const expected = [
    "approvalId", "baseTwinRevision", "createdAt", "effectPlanHash", "effectReceiptId", "operation",
    "proposalId", "resultTwinRevision", "schemaVersion",
  ].sort();
  if (
    canonicalJson(keys) !== canonicalJson(expected)
    || pending.schemaVersion !== "1"
    || (pending.operation !== "execute" && pending.operation !== "rollback")
    || typeof pending.proposalId !== "string" || !/^act_[a-f0-9]{32}$/.test(pending.proposalId)
    || typeof pending.approvalId !== "string" || !/^apr_[a-f0-9]{32}$/.test(pending.approvalId)
    || typeof pending.effectReceiptId !== "string" || !/^eff_[a-f0-9]{32}$/.test(pending.effectReceiptId)
    || typeof pending.effectPlanHash !== "string" || !/^sha256:[a-f0-9]{64}$/.test(pending.effectPlanHash)
    || !Number.isSafeInteger(pending.baseTwinRevision) || (pending.baseTwinRevision as number) < 1
    || pending.resultTwinRevision !== (pending.baseTwinRevision as number) + 1
    || typeof pending.createdAt !== "string" || Number.isNaN(Date.parse(pending.createdAt))
  ) throw new Error("pending effect contract failed");
  return pending as unknown as PendingEffect;
}

function effectTransitionFailure(point: FailurePoint | EffectFailurePoint | undefined): FailurePoint | undefined {
  if (point === "effect-revision") return "revision";
  if (point === "effect-head") return "head";
  if (point === "effect-view") return "view";
  return undefined;
}

function applyPendingEffect(
  workspaceRoot: string,
  pending: PendingEffect,
  failurePoint?: FailurePoint | EffectFailurePoint,
): EffectReceipt {
  const state = paths(workspaceRoot);
  const current = readCurrentRevision(workspaceRoot);
  if (!current || current.schemaVersion !== "3") throw new Error("pending effect has no R3 base revision");
  const already = current.agency.effectReceipts.find((item) => item.receiptId === pending.effectReceiptId);
  if (already) {
    rmSync(state.pendingEffect, { force: true });
    return already;
  }
  if (current.revision !== pending.baseTwinRevision) throw new Error("pending effect base revision is no longer current");
  const contract = loadWorkspaceContract(workspaceRoot);
  const agency = agencyFrom(current);
  const record = agency.proposals.find((item) => item.proposal.proposalId === pending.proposalId);
  const approval = agency.approvals.find((item) => item.approvalId === pending.approvalId);
  if (!record || !approval || record.approvalId !== approval.approvalId) {
    throw new Error("pending effect cannot resolve its proposal and approval");
  }
  if (record.effectPlanHash !== pending.effectPlanHash || approval.effectPlanHash !== pending.effectPlanHash) {
    throw new Error("pending effect hash no longer matches its approval");
  }
  const target = targetFile(workspaceRoot, contract, current);
  let body = readFileSync(target, "utf8");
  const plan = record.effectPlan;
  const expectedBeforeHash = pending.operation === "execute" ? plan.beforeFileHash : plan.afterFileHash;
  const expectedAfterHash = pending.operation === "execute" ? plan.afterFileHash : plan.beforeFileHash;
  let observedHash = sha256(body);
  let status: EffectReceipt["status"] = "succeeded";
  if (observedHash === expectedBeforeHash) {
    assertWorkspaceMatchesRevision(workspaceRoot, contract, current);
    body = pending.operation === "execute"
      ? materializeExecution(body, record.proposal, plan)
      : materializeRollback(body, plan);
    atomicWriteSource(target, body);
    observedHash = sha256(body);
    if (failurePoint === "effect-write") throw new Error("injected failure after effect source write");
  } else if (observedHash !== expectedAfterHash) {
    status = "indeterminate";
  }
  const receipt: EffectReceipt = {
    receiptId: pending.effectReceiptId,
    operation: pending.operation,
    effectId: plan.effectId,
    proposalId: pending.proposalId,
    approvalId: pending.approvalId,
    effectPlanHash: pending.effectPlanHash,
    baseTwinRevision: pending.baseTwinRevision,
    resultTwinRevision: pending.resultTwinRevision,
    targetPath: R3_TARGET_PATH,
    expectedBeforeHash,
    expectedAfterHash,
    observedHash,
    status,
    completedAt: pending.createdAt,
  };
  record.effectReceiptIds.push(receipt.receiptId);
  if (status === "indeterminate") {
    record.status = "indeterminate";
  } else if (pending.operation === "execute") {
    record.status = "executed";
  } else {
    record.status = "rolled-back";
  }
  if (pending.operation === "execute") {
    approval.status = "consumed";
    approval.consumedAt = pending.createdAt;
  }
  agency.effectReceipts.push(receipt);
  let evidence = current.evidence;
  let sourceChanges: SourceChanges = { added: [], modified: [], deleted: [] };
  if (status === "succeeded") {
    const scan = scanWorkspace(workspaceRoot, contract);
    const changed = changes(current.evidence, scan.evidence);
    if (
      changed.added.length !== 0
      || changed.deleted.length !== 0
      || canonicalJson(changed.modified) !== canonicalJson([R3_TARGET_PATH])
    ) throw new Error("effect observed source changes outside the fixed README.md target");
    evidence = scan.evidence;
    sourceChanges = changed;
  }
  const revision = nextV3Revision(current, pending.createdAt, agency, evidence, sourceChanges);
  assertTwinRevision(revision);
  const view = renderRestartView(revision);
  persistTransition(workspaceRoot, revision, view, effectTransitionFailure(failurePoint));
  rmSync(state.pendingEffect, { force: true });
  return receipt;
}

function recoverPendingEffect(workspaceRoot: string): void {
  const state = paths(workspaceRoot);
  if (existsSync(state.pendingEffect)) applyPendingEffect(workspaceRoot, readPendingEffect(state.pendingEffect));
}

function beginEffect(
  workspaceRoot: string,
  operation: "execute" | "rollback",
  proposalId: string,
  approvalId: string,
  effectPlanHash: string,
  options: ActionTransitionOptions,
): ActionExecutionResult {
  const state = paths(workspaceRoot);
  const current = readCurrentRevision(workspaceRoot);
  if (!current || current.schemaVersion !== "3") throw new Error("workspace has no R3 action state");
  const completed = current.agency.effectReceipts.find((item) => (
    item.operation === operation
    && item.proposalId === proposalId
    && item.approvalId === approvalId
    && item.status === "succeeded"
  ));
  if (completed) {
    const view = renderRestartView(current);
    return { changed: false, observation: { changed: false, revision: current, view }, receipt: completed };
  }
  const createdAt = timestamp(options);
  const pending: PendingEffect = {
    schemaVersion: "1",
    operation,
    proposalId,
    approvalId,
    effectReceiptId: `eff_${shortHash(canonicalJson({ operation, proposalId, approvalId, effectPlanHash, base: current.revision }))}`,
    effectPlanHash,
    baseTwinRevision: current.revision,
    resultTwinRevision: current.revision + 1,
    createdAt,
  };
  atomicWrite(state.pendingEffect, prettyJson(pending));
  if (options.failurePoint === "effect-pending") throw new Error("injected failure after effect journal write");
  const receipt = applyPendingEffect(workspaceRoot, pending, options.failurePoint);
  const revision = readCurrentRevision(workspaceRoot);
  if (!revision) throw new Error("effect completed without a Twin revision");
  return {
    changed: true,
    observation: { changed: true, revision, view: renderRestartView(revision) },
    receipt,
  };
}

export function executeAction(
  workspaceRoot: string,
  approvalId: string,
  options: ActionTransitionOptions = {},
): ActionExecutionResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    recoverPendingEffect(root);
    const current = readCurrentRevision(root);
    if (!current || current.schemaVersion !== "3") throw new Error("workspace has no R3 approval");
    const approval = current.agency.approvals.find((item) => item.approvalId === approvalId);
    if (!approval) throw new Error(`unknown action approval: ${approvalId}`);
    const record = current.agency.proposals.find((item) => item.proposal.proposalId === approval.proposalId);
    if (!record) throw new Error("approval has no action proposal");
    const priorReceipt = current.agency.effectReceipts.find((item) => item.operation === "execute" && item.approvalId === approvalId);
    if (priorReceipt?.status === "succeeded") {
      const view = renderRestartView(current);
      return { changed: false, observation: { changed: false, revision: current, view }, receipt: priorReceipt };
    }
    if (approval.status !== "approved" || record.status !== "approved") throw new Error("action approval is not executable");
    if (current.revision !== approval.baseTwinRevision + 1) throw new Error("action approval revision chain is no longer unbroken");
    return beginEffect(root, "execute", approval.proposalId, approvalId, approval.effectPlanHash, options);
  });
}

export function rollbackAction(
  workspaceRoot: string,
  executionReceiptId: string,
  options: ActionTransitionOptions = {},
): ActionExecutionResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    recoverPendingEffect(root);
    const current = readCurrentRevision(root);
    if (!current || current.schemaVersion !== "3") throw new Error("workspace has no R3 execution to roll back");
    const execution = current.agency.effectReceipts.find((item) => item.receiptId === executionReceiptId);
    if (!execution || execution.operation !== "execute" || execution.status !== "succeeded") {
      throw new Error("rollback requires one successful execution receipt");
    }
    const priorRollback = current.agency.effectReceipts.find((item) => (
      item.operation === "rollback" && item.proposalId === execution.proposalId && item.status === "succeeded"
    ));
    if (priorRollback) {
      const view = renderRestartView(current);
      return { changed: false, observation: { changed: false, revision: current, view }, receipt: priorRollback };
    }
    const record = current.agency.proposals.find((item) => item.proposal.proposalId === execution.proposalId);
    if (!record || record.status !== "executed") throw new Error("action is not in an executed state");
    if (current.revision !== execution.resultTwinRevision) throw new Error("rollback revision chain is no longer unbroken");
    return beginEffect(root, "rollback", execution.proposalId, execution.approvalId, execution.effectPlanHash, options);
  });
}

export function statusWorkspace(workspaceRoot: string): ObservationResult {
  const root = resolve(workspaceRoot);
  assertGitIgnored(root);
  return withLock(root, () => {
    recoverPending(root);
    recoverPendingEffect(root);
    loadWorkspaceContract(root);
    const revision = readCurrentRevision(root);
    if (!revision) throw new Error("workspace has no committed Twin revision");
    const view = renderRestartView(revision);
    const state = paths(root);
    if (!existsSync(state.view) || readFileSync(state.view, "utf8") !== view) atomicWrite(state.view, view);
    return { changed: false, revision, view };
  });
}
