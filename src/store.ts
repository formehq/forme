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
  assertHeadRecord,
  assertTwinRevision,
  assertWorkspaceContract,
  canonicalJson,
  prettyJson,
  revisionFilename,
  sha256,
} from "./contracts.ts";
import { renderRestartView } from "./render.ts";
import type {
  EvidenceRecord,
  HeadRecord,
  ObservationResult,
  OwnerFrame,
  PendingTransition,
  SourceChanges,
  TwinRevision,
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

    const revision: TwinRevision = {
      schemaVersion: "1",
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
    assertTwinRevision(revision);
    const view = renderRestartView(revision);
    if (ownerFrameChanged) atomicWrite(paths(root).workspace, prettyJson(contract));
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
