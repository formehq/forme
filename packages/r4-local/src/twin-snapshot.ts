import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseStrictJson } from "../../r4-protocol/src/index.ts";
import {
  assertHeadRecord,
  assertTwinRevision,
  assertWorkspaceContract,
  canonicalJson,
  sha256,
} from "../../../src/contracts.ts";
import type { HeadRecord, TwinRevision, WorkspaceContract } from "../../../src/types.ts";

const MAX_HEAD_BYTES = 4 * 1_024;
const MAX_WORKSPACE_CONTRACT_BYTES = 256 * 1_024;
const MAX_TWIN_REVISION_BYTES = 16 * 1_024 * 1_024;

export interface VerifiedCurrentTwin {
  readonly workspaceRoot: string;
  readonly head: HeadRecord;
  readonly revision: TwinRevision;
  readonly contract: WorkspaceContract;
  readonly twinRevisionHash: `sha256:${string}`;
}

function sameIdentity(
  left: { dev: number | bigint; ino: number | bigint; size: number | bigint; mtimeMs: number },
  right: { dev: number | bigint; ino: number | bigint; size: number | bigint; mtimeMs: number },
): boolean {
  return String(left.dev) === String(right.dev)
    && String(left.ino) === String(right.ino)
    && String(left.size) === String(right.size)
    && left.mtimeMs === right.mtimeMs;
}

function assertOwnedDirectory0700(path: string, label: string): void {
  const stat = lstatSync(path, { bigint: false });
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o700) {
    throw new Error(`${label} is not one trusted 0700 directory`);
  }
  const uid = process.getuid?.();
  if (uid !== undefined && stat.uid !== uid) throw new Error(`${label} is not owned by the current user`);
}

function assertTwinDirectoryChain(stateRoot: string): void {
  assertOwnedDirectory0700(stateRoot, "Forme state root");
  assertOwnedDirectory0700(join(stateRoot, "revisions"), "Twin revision root");
}

function readStableRegularFile(path: string, maximumBytes: number): string {
  const beforePath = lstatSync(path, { bigint: false });
  const uid = process.getuid?.();
  if (
    !beforePath.isFile()
    || beforePath.isSymbolicLink()
    || beforePath.nlink !== 1
    || (beforePath.mode & 0o777) !== 0o600
    || (uid !== undefined && beforePath.uid !== uid)
  ) {
    throw new Error(`trusted Twin file is not one regular single-link file:${basename(path)}`);
  }
  if (beforePath.size > maximumBytes) throw new Error(`trusted Twin file is too large:${basename(path)}`);
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const beforeFd = fstatSync(descriptor, { bigint: false });
    if (!sameIdentity(beforePath, beforeFd)) throw new Error(`trusted Twin file changed before read:${basename(path)}`);
    const body = readFileSync(descriptor, "utf8");
    const afterFd = fstatSync(descriptor, { bigint: false });
    const afterPath = lstatSync(path, { bigint: false });
    if (!sameIdentity(beforeFd, afterFd) || !sameIdentity(afterFd, afterPath)) {
      throw new Error(`trusted Twin file changed during read:${basename(path)}`);
    }
    if (Buffer.byteLength(body, "utf8") !== afterFd.size) {
      throw new Error(`trusted Twin file read was incomplete:${basename(path)}`);
    }
    return body;
  } finally {
    closeSync(descriptor);
  }
}

function parseObject(body: string, label: string): unknown {
  try {
    return parseStrictJson(body);
  } catch {
    throw new Error(`${label} is not strict JSON`);
  }
}

function assertNoTransitionInFlight(stateRoot: string): void {
  for (const name of ["LOCK", "pending-transition.json", "pending-effect.json"]) {
    if (existsSync(join(stateRoot, name))) {
      throw new Error(`Twin has an in-flight transition:${name}`);
    }
  }
}

/**
 * Read the current canonical Twin without invoking recovery or rewriting any
 * derived view. Projection review must never execute a pending R3 effect just
 * because the Owner asked to preview public wording.
 */
export function readVerifiedCurrentTwin(workspaceRoot: string): VerifiedCurrentTwin {
  const root = resolve(workspaceRoot);
  if (realpathSync(root) !== root) throw new Error("Workspace root must be canonical before Projection review");
  const stateRoot = join(root, ".forme");
  assertTwinDirectoryChain(stateRoot);
  assertNoTransitionInFlight(stateRoot);

  const headPath = join(stateRoot, "HEAD");
  const firstHeadBytes = readStableRegularFile(headPath, MAX_HEAD_BYTES);
  const headValue = parseObject(firstHeadBytes, "Twin HEAD");
  assertHeadRecord(headValue);
  const head = headValue as HeadRecord;

  const contractBytes = readStableRegularFile(join(stateRoot, "workspace.json"), MAX_WORKSPACE_CONTRACT_BYTES);
  const contractValue = parseObject(contractBytes, "Workspace contract");
  assertWorkspaceContract(contractValue);
  const contract = contractValue as WorkspaceContract;

  const revisionPath = join(stateRoot, "revisions", head.file);
  const revisionBytes = readStableRegularFile(revisionPath, MAX_TWIN_REVISION_BYTES);
  if (sha256(revisionBytes) !== head.contentHash) throw new Error("Twin HEAD/revision hash mismatch");
  const revisionValue = parseObject(revisionBytes, "Twin revision");
  assertTwinRevision(revisionValue);
  const revision = revisionValue as TwinRevision;
  if (revision.revision !== head.revision) throw new Error("Twin HEAD revision number mismatch");
  if (revision.workspaceId !== contract.workspaceId) throw new Error("Twin Workspace identity mismatch");
  if (revision.workspaceContractHash !== sha256(canonicalJson(contract))) {
    throw new Error("Twin Workspace contract hash mismatch");
  }
  if (canonicalJson(revision.ownerFrame) !== canonicalJson(contract.ownerFrame)) {
    throw new Error("Twin Owner Frame is not current with its Workspace contract");
  }

  const secondHeadBytes = readStableRegularFile(headPath, MAX_HEAD_BYTES);
  const secondContractBytes = readStableRegularFile(join(stateRoot, "workspace.json"), MAX_WORKSPACE_CONTRACT_BYTES);
  assertTwinDirectoryChain(stateRoot);
  assertNoTransitionInFlight(stateRoot);
  if (secondHeadBytes !== firstHeadBytes) throw new Error("Twin HEAD changed during Projection read");
  if (secondContractBytes !== contractBytes) throw new Error("Workspace contract changed during Projection read");
  return Object.freeze({
    workspaceRoot: root,
    head: structuredClone(head),
    revision: structuredClone(revision),
    contract: structuredClone(contract),
    twinRevisionHash: head.contentHash as `sha256:${string}`,
  });
}
