import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  validateProjectionBasisV1,
  validateProjectionCapsuleV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
} from "../../r4-protocol/src/index.ts";
import {
  compileLocalProjectionProfile,
  type LocalProjectionProfileInput,
  type LocalProjectionOwnerWordingV1,
} from "./projection.ts";
import { readVerifiedCurrentTwin } from "./twin-snapshot.ts";

type Sha256 = `sha256:${string}`;

const CANDIDATE_FILES = ["basis.json", "capsule.json", "input.json", "manifest.json"] as const;
const APPROVAL_FILES = ["approval.json", "receipt.json"] as const;
const CANDIDATE_ID = /^candidate_[a-f0-9]{32}$/u;
const MAX_RECORD_BYTES = 512 * 1_024;
const REVIEW_ROOT_PARTS = [".forme", "r4", "projections"] as const;

export type LocalProjectionPrepareFault =
  | "after_candidate_manifest"
  | "after_candidate_stage"
  | "after_current_stage"
  | "after_candidate_commit"
  | "after_current_commit";

export type LocalProjectionApprovalFault = "after_approval_file" | "after_approval_stage" | "after_approval_commit";

export interface LocalProjectionCandidateManifestV1 {
  readonly schemaVersion: "local_projection_candidate_manifest.v1";
  readonly candidateId: string;
  readonly projectionId: string;
  readonly roomId: string;
  readonly preparedAt: string;
  readonly expiresAt: string;
  readonly twinRevision: number;
  readonly twinRevisionHash: Sha256;
  readonly workspaceContractHash: Sha256;
  readonly profileInputHash: Sha256;
  readonly profileInputSha256: Sha256;
  readonly capsuleSha256: Sha256;
  readonly basisSha256: Sha256;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly reviewHash: Sha256;
  readonly localOnly: true;
  readonly publicationAuthorized: false;
  readonly roomMutationAuthorized: false;
}

export interface LocalProjectionCurrentPointerV1 {
  readonly schemaVersion: "local_projection_current_pointer.v1";
  readonly candidateId: string;
  readonly reviewHash: Sha256;
  readonly twinRevisionHash: Sha256;
}

export interface LocalProjectionContentApprovalV1 {
  readonly schemaVersion: "local_projection_content_approval.v1";
  readonly approvalId: string;
  readonly candidateId: string;
  readonly projectionId: string;
  readonly reviewHash: Sha256;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly policyHash: Sha256;
  readonly twinRevision: number;
  readonly twinRevisionHash: Sha256;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly confirmationMethod: "exact_hash_terminal_input";
  readonly localOnly: true;
  readonly publicationAuthorized: false;
  readonly roomMutationAuthorized: false;
}

export interface LocalProjectionApprovalReceiptV1 {
  readonly schemaVersion: "local_projection_approval_receipt.v1";
  readonly receiptId: string;
  readonly approvalId: string;
  readonly candidateId: string;
  readonly projectionId: string;
  readonly reviewHash: Sha256;
  readonly candidateManifestSha256: Sha256;
  readonly profileInputSha256: Sha256;
  readonly capsuleSha256: Sha256;
  readonly basisSha256: Sha256;
  readonly approvalSha256: Sha256;
  readonly twinRevisionHash: Sha256;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly roomCalls: 0;
  readonly networkCalls: 0;
  readonly providerCalls: 0;
  readonly hostBindingCalls: 0;
  readonly publicationCalls: 0;
  readonly localOnly: true;
  readonly publicationAuthorized: false;
  readonly roomMutationAuthorized: false;
}

export interface LocalProjectionCandidate {
  readonly manifest: LocalProjectionCandidateManifestV1;
  readonly input: LocalProjectionProfileInput;
  readonly capsule: ProjectionCapsuleV1;
  readonly basis: ProjectionBasisV1;
}

export interface LocalProjectionApprovalBundle {
  readonly approval: LocalProjectionContentApprovalV1;
  readonly receipt: LocalProjectionApprovalReceiptV1;
}

export type LocalProjectionReviewStatus =
  | "READY_FOR_OWNER_REVIEW"
  | "APPROVED_CURRENT"
  | "STALE_TWIN"
  | "APPROVED_STALE"
  | "STALE_TIME"
  | "APPROVED_STALE_TIME"
  | "APPROVED_EXPIRED"
  | "EXPIRED";

export interface LocalProjectionReviewView {
  readonly status: LocalProjectionReviewStatus;
  readonly candidate: LocalProjectionCandidate;
  readonly approval: LocalProjectionApprovalBundle | null;
  readonly preview: string;
}

function ownedUid(): number | undefined {
  return process.getuid?.();
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has an unknown or missing field`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function sha(value: unknown, label: string): Sha256 {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} must be a SHA-256`);
  return value as Sha256;
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value) {
    throw new Error(`${label} must be an exact UTC timestamp`);
  }
  return value;
}

function localId(value: unknown, prefix: string, label: string): string {
  if (typeof value !== "string" || !new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function candidateIdFor(reviewHash: Sha256): string {
  return `candidate_${reviewHash.slice("sha256:".length, "sha256:".length + 32)}`;
}

function reviewHashFor(capsule: ProjectionCapsuleV1, basis: ProjectionBasisV1): Sha256 {
  return canonicalSha256({
    schemaVersion: "local_projection_exact_review.v1",
    capsule,
    basis,
  });
}

function profileMeaningHash(input: LocalProjectionProfileInput): Sha256 {
  return canonicalSha256({ ...input, preparedAt: null });
}

function isDirectory0700(path: string, label: string): void {
  const stat = lstatSync(path, { bigint: false });
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o700) {
    throw new Error(`${label} must be one non-symlink 0700 directory`);
  }
  const uid = ownedUid();
  if (uid !== undefined && stat.uid !== uid) throw new Error(`${label} must be owned by the current user`);
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function writeDurablePidLockExclusive(path: string, parent: string, pid: number): void {
  const descriptor = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, `${pid}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  syncDirectory(parent);
}

function ensureOwnedDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { mode: 0o700 });
    syncDirectory(dirname(path));
  }
  isDirectory0700(path, basename(path));
}

function reviewPaths(workspaceRoot: string): {
  root: string;
  candidates: string;
  approvals: string;
  current: string;
  currentStage: string;
  lock: string;
  recoveryLock: string;
} {
  const root = resolve(workspaceRoot, ...REVIEW_ROOT_PARTS);
  return {
    root,
    candidates: join(root, "candidates"),
    approvals: join(root, "approvals"),
    current: join(root, "current.json"),
    currentStage: join(root, ".current.json.stage"),
    lock: join(root, "LOCK"),
    recoveryLock: join(root, "LOCK.recovery"),
  };
}

function canonicalWorkspaceRoot(workspaceRoot: string): string {
  const root = resolve(workspaceRoot);
  if (realpathSync(root) !== root) throw new Error("Workspace root must be canonical before Projection review");
  return root;
}

function ensureReviewRoot(workspaceRoot: string): ReturnType<typeof reviewPaths> {
  const paths = reviewPaths(workspaceRoot);
  const stateRoot = resolve(workspaceRoot, ".forme");
  isDirectory0700(stateRoot, "Forme state root");
  ensureOwnedDirectory(join(stateRoot, "r4"));
  ensureOwnedDirectory(paths.root);
  ensureOwnedDirectory(paths.candidates);
  ensureOwnedDirectory(paths.approvals);
  return paths;
}

function verifyReviewRoot(workspaceRoot: string): ReturnType<typeof reviewPaths> {
  const paths = reviewPaths(workspaceRoot);
  isDirectory0700(resolve(workspaceRoot, ".forme"), "Forme state root");
  isDirectory0700(resolve(workspaceRoot, ".forme", "r4"), "R4 local state root");
  isDirectory0700(paths.root, "Projection review root");
  isDirectory0700(paths.candidates, "Projection candidate root");
  isDirectory0700(paths.approvals, "Projection approval root");
  return paths;
}

function readStableLock(path: string): { pid: number; device: number; inode: number; nlink: number } {
  const pathStat = lstatSync(path, { bigint: false });
  const uid = ownedUid();
  if (
    !pathStat.isFile()
    || pathStat.isSymbolicLink()
    || (pathStat.mode & 0o777) !== 0o600
    || (uid !== undefined && pathStat.uid !== uid)
    || (pathStat.nlink !== 1 && pathStat.nlink !== 2)
    || pathStat.size > 32
  ) throw new Error("Projection review lock is not one trusted 0600 file");
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: false });
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      throw new Error("Projection review lock identity changed before read");
    }
    const body = readFileSync(descriptor, "utf8");
    const after = fstatSync(descriptor, { bigint: false });
    const afterPath = lstatSync(path, { bigint: false });
    if (
      after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || afterPath.dev !== after.dev
      || afterPath.ino !== after.ino
    ) throw new Error("Projection review lock changed during read");
    if (!/^[1-9][0-9]*\n$/u.test(body)) throw new Error("Projection review lock body is invalid");
    const pid = Number.parseInt(body, 10);
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Projection review lock PID is invalid");
    return { pid, device: after.dev, inode: after.ino, nlink: after.nlink };
  } finally {
    closeSync(descriptor);
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function sameLockIdentity(
  left: { device: number; inode: number },
  right: { device: number; inode: number },
): boolean {
  return left.device === right.device && left.inode === right.inode;
}

function withReviewLock<T>(workspaceRoot: string, operation: (paths: ReturnType<typeof reviewPaths>) => T): T {
  const paths = ensureReviewRoot(workspaceRoot);
  if (existsSync(paths.recoveryLock)) {
    const recovery = readStableLock(paths.recoveryLock);
    throw new Error(`Projection recovery is incomplete; run projection recover --lock-pid ${recovery.pid}`);
  }
  try {
    writeDurablePidLockExclusive(paths.lock, paths.root, process.pid);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const lock = readStableLock(paths.lock);
    throw new Error(pidAlive(lock.pid)
      ? `another Projection review operation is active (pid ${lock.pid})`
      : `Projection review stopped unexpectedly; run projection recover --lock-pid ${lock.pid}`);
  }
  try {
    return operation(paths);
  } finally {
    if (existsSync(paths.lock) && readFileSync(paths.lock, "utf8").trim() === String(process.pid)) {
      unlinkSync(paths.lock);
      syncDirectory(paths.root);
    }
  }
}

function canonicalBytes(value: unknown): string {
  return `${canonicalJson(value)}\n`;
}

function writeCanonicalExclusive(path: string, value: unknown): void {
  const bytes = canonicalBytes(value);
  const descriptor = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    writeFileSync(descriptor, bytes, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function readCanonicalFile(path: string, label: string): unknown {
  const pathStat = lstatSync(path, { bigint: false });
  const uid = ownedUid();
  if (
    !pathStat.isFile()
    || pathStat.isSymbolicLink()
    || pathStat.nlink !== 1
    || (pathStat.mode & 0o777) !== 0o600
    || (uid !== undefined && pathStat.uid !== uid)
    || pathStat.size > MAX_RECORD_BYTES
  ) throw new Error(`${label} is not one owned 0600 regular file`);
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: false });
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      throw new Error(`${label} identity changed before read`);
    }
    const bytes = readFileSync(descriptor, "utf8");
    const after = fstatSync(descriptor, { bigint: false });
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error(`${label} changed during read`);
    }
    let parsed: unknown;
    try { parsed = parseStrictJson(bytes); } catch { throw new Error(`${label} is not strict JSON`); }
    if (bytes !== canonicalBytes(parsed)) throw new Error(`${label} is not canonical one-line JSON`);
    return parsed;
  } finally {
    closeSync(descriptor);
  }
}

function validateProfileInput(value: unknown): LocalProjectionProfileInput {
  const input = record(value, "Projection profile input");
  const isV1 = input.schemaVersion === "local_projection_profile_input.v1";
  const isV2 = input.schemaVersion === "local_projection_profile_input.v2";
  if (!isV1 && !isV2) throw new Error("Projection profile input schema version is invalid");
  const required = isV1
    ? ["schemaVersion", "workspaceName", "openTo", "becomingReflectionId", "effectProposalId", "preparedAt"]
    : ["schemaVersion", "workspaceName", "ownerWording", "becomingReflectionId", "effectProposalId", "preparedAt"];
  const optional = isV1 ? ["title", "summary", "tension"] : ["title", "summary"];
  const keys = Object.keys(input);
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new Error("Projection profile input has an unknown or missing field");
  }
  for (const key of ["workspaceName", "becomingReflectionId", "effectProposalId", "preparedAt", ...optional, ...(isV1 ? ["openTo"] : [])]) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || (input[key] as string).length === 0)) {
      throw new Error(`Projection profile input ${key} is invalid`);
    }
  }
  const scalarLimits: Readonly<Record<string, number>> = {
    workspaceName: 200,
    title: 120,
  };
  const byteLimits: Readonly<Record<string, number>> = {
    summary: 512,
    ...(isV1 ? { openTo: 8 * 1_024, tension: 8 * 1_024 } : {}),
  };
  for (const [key, maximum] of Object.entries(scalarLimits)) {
    const item = input[key];
    if (item === undefined) continue;
    if (typeof item !== "string" || item.trim() !== item || item.normalize("NFC") !== item || [...item].length > maximum) {
      throw new Error(`Projection profile input ${key} is not canonical public text`);
    }
  }
  for (const [key, maximum] of Object.entries(byteLimits)) {
    const item = input[key];
    if (item === undefined) continue;
    if (typeof item !== "string" || item.trim() !== item || item.normalize("NFC") !== item || Buffer.byteLength(item, "utf8") > maximum) {
      throw new Error(`Projection profile input ${key} is not canonical public text`);
    }
  }
  if (isV2) {
    const ownerWording = record(input.ownerWording, "Projection owner wording");
    exactKeys(ownerWording, ["becoming", "now", "nextMove", "tensions", "openTo", "boundary"], "Projection owner wording");
    const publicTextArray = (
      candidate: unknown,
      label: string,
      minimum: number,
      maximum: number,
    ): readonly string[] => {
      if (!Array.isArray(candidate) || candidate.length < minimum || candidate.length > maximum) {
        throw new Error(`${label} must contain between ${minimum} and ${maximum} items`);
      }
      for (const item of candidate) {
        if (
          typeof item !== "string"
          || item.length === 0
          || item.trim() !== item
          || item.normalize("NFC") !== item
          || Buffer.byteLength(item, "utf8") > 8 * 1_024
        ) throw new Error(`${label} is not canonical public text`);
      }
      if (new Set(candidate).size !== candidate.length) throw new Error(`${label} contains a normalized duplicate`);
      return candidate;
    };
    const becoming = publicTextArray(ownerWording.becoming, "Projection owner wording becoming", 1, 8);
    const now = publicTextArray(ownerWording.now, "Projection owner wording now", 0, 4);
    const nextMove = publicTextArray(ownerWording.nextMove, "Projection owner wording nextMove", 0, 3);
    const tensions = publicTextArray(ownerWording.tensions, "Projection owner wording tensions", 1, 4);
    const openTo = publicTextArray(ownerWording.openTo, "Projection owner wording openTo", 1, 4);
    if (becoming.length + now.length + nextMove.length + tensions.length + openTo.length + 4 > 20) {
      throw new Error("Projection owner wording and causal basis exceed 20 claims");
    }
    const boundary = record(ownerWording.boundary, "Projection owner wording boundary");
    exactKeys(boundary, [
      "supportedInteractions", "allowedTopics", "unavailableTopics", "expectedResponseLatency",
      "agencyStatement", "nonCommitmentStatement",
    ], "Projection owner wording boundary");
    if (
      !Array.isArray(boundary.supportedInteractions)
      || boundary.supportedInteractions.length < 1
      || boundary.supportedInteractions.length > 3
      || boundary.supportedInteractions.some((item) => item !== "ask" && item !== "seed" && item !== "resonance")
      || new Set(boundary.supportedInteractions).size !== boundary.supportedInteractions.length
    ) throw new Error("Projection owner wording supportedInteractions is invalid");
    publicTextArray(boundary.allowedTopics, "Projection owner wording allowedTopics", 1, 8);
    publicTextArray(boundary.unavailableTopics, "Projection owner wording unavailableTopics", 1, 8);
    for (const key of ["expectedResponseLatency", "agencyStatement", "nonCommitmentStatement"] as const) {
      const item = boundary[key];
      if (
        typeof item !== "string"
        || item.length === 0
        || item.trim() !== item
        || item.normalize("NFC") !== item
        || Buffer.byteLength(item, "utf8") > 8 * 1_024
      ) throw new Error(`Projection owner wording ${key} is not canonical public text`);
    }
  }
  localId(input.becomingReflectionId, "ref", "Projection becoming Reflection ID");
  localId(input.effectProposalId, "act", "Projection effect proposal ID");
  timestamp(input.preparedAt, "Projection preparedAt");
  return structuredClone(input) as unknown as LocalProjectionProfileInput;
}

function validateCandidateManifest(value: unknown): LocalProjectionCandidateManifestV1 {
  const manifest = record(value, "Projection candidate manifest");
  exactKeys(manifest, [
    "schemaVersion", "candidateId", "projectionId", "roomId", "preparedAt", "expiresAt", "twinRevision",
    "twinRevisionHash", "workspaceContractHash", "profileInputHash", "profileInputSha256", "capsuleSha256",
    "basisSha256", "payloadHash", "basisHash", "reviewHash", "localOnly", "publicationAuthorized",
    "roomMutationAuthorized",
  ], "Projection candidate manifest");
  if (
    manifest.schemaVersion !== "local_projection_candidate_manifest.v1"
    || typeof manifest.candidateId !== "string"
    || !CANDIDATE_ID.test(manifest.candidateId)
    || !Number.isSafeInteger(manifest.twinRevision)
    || (manifest.twinRevision as number) < 1
    || manifest.localOnly !== true
    || manifest.publicationAuthorized !== false
    || manifest.roomMutationAuthorized !== false
  ) throw new Error("Projection candidate manifest is invalid");
  localId(manifest.projectionId, "proj", "Projection ID");
  localId(manifest.roomId, "room", "Room ID");
  timestamp(manifest.preparedAt, "Projection preparedAt");
  timestamp(manifest.expiresAt, "Projection expiresAt");
  for (const key of ["twinRevisionHash", "workspaceContractHash", "profileInputHash", "profileInputSha256", "capsuleSha256", "basisSha256", "payloadHash", "basisHash", "reviewHash"] as const) {
    sha(manifest[key], `Projection ${key}`);
  }
  return structuredClone(manifest) as unknown as LocalProjectionCandidateManifestV1;
}

function validateCurrentPointer(value: unknown): LocalProjectionCurrentPointerV1 {
  const pointer = record(value, "Projection current pointer");
  exactKeys(pointer, ["schemaVersion", "candidateId", "reviewHash", "twinRevisionHash"], "Projection current pointer");
  if (pointer.schemaVersion !== "local_projection_current_pointer.v1" || typeof pointer.candidateId !== "string" || !CANDIDATE_ID.test(pointer.candidateId)) {
    throw new Error("Projection current pointer is invalid");
  }
  sha(pointer.reviewHash, "Projection pointer reviewHash");
  sha(pointer.twinRevisionHash, "Projection pointer twinRevisionHash");
  return structuredClone(pointer) as unknown as LocalProjectionCurrentPointerV1;
}

function validateApproval(value: unknown): LocalProjectionContentApprovalV1 {
  const approval = record(value, "Local Projection approval");
  exactKeys(approval, [
    "schemaVersion", "approvalId", "candidateId", "projectionId", "reviewHash", "payloadHash", "basisHash",
    "policyHash", "twinRevision", "twinRevisionHash", "approvedAt", "expiresAt", "confirmationMethod", "localOnly",
    "publicationAuthorized", "roomMutationAuthorized",
  ], "Local Projection approval");
  if (
    approval.schemaVersion !== "local_projection_content_approval.v1"
    || typeof approval.approvalId !== "string"
    || !/^approval_[a-f0-9]{32}$/u.test(approval.approvalId)
    || typeof approval.candidateId !== "string"
    || !CANDIDATE_ID.test(approval.candidateId)
    || !Number.isSafeInteger(approval.twinRevision)
    || approval.confirmationMethod !== "exact_hash_terminal_input"
    || approval.localOnly !== true
    || approval.publicationAuthorized !== false
    || approval.roomMutationAuthorized !== false
  ) throw new Error("Local Projection approval is invalid");
  localId(approval.projectionId, "proj", "Approved Projection ID");
  for (const key of ["reviewHash", "payloadHash", "basisHash", "policyHash", "twinRevisionHash"] as const) {
    sha(approval[key], `Approval ${key}`);
  }
  timestamp(approval.approvedAt, "Projection approvedAt");
  timestamp(approval.expiresAt, "Projection approval expiresAt");
  return structuredClone(approval) as unknown as LocalProjectionContentApprovalV1;
}

function validateReceipt(value: unknown): LocalProjectionApprovalReceiptV1 {
  const receipt = record(value, "Local Projection approval receipt");
  exactKeys(receipt, [
    "schemaVersion", "receiptId", "approvalId", "candidateId", "projectionId", "reviewHash", "candidateManifestSha256",
    "profileInputSha256", "capsuleSha256", "basisSha256", "approvalSha256", "twinRevisionHash", "approvedAt",
    "expiresAt", "roomCalls", "networkCalls", "providerCalls", "hostBindingCalls", "publicationCalls", "localOnly",
    "publicationAuthorized", "roomMutationAuthorized",
  ], "Local Projection approval receipt");
  if (
    receipt.schemaVersion !== "local_projection_approval_receipt.v1"
    || typeof receipt.receiptId !== "string"
    || !/^receipt_[a-f0-9]{32}$/u.test(receipt.receiptId)
    || typeof receipt.approvalId !== "string"
    || !/^approval_[a-f0-9]{32}$/u.test(receipt.approvalId)
    || typeof receipt.candidateId !== "string"
    || !CANDIDATE_ID.test(receipt.candidateId)
    || [receipt.roomCalls, receipt.networkCalls, receipt.providerCalls, receipt.hostBindingCalls, receipt.publicationCalls].some((item) => item !== 0)
    || receipt.localOnly !== true
    || receipt.publicationAuthorized !== false
    || receipt.roomMutationAuthorized !== false
  ) throw new Error("Local Projection approval receipt is invalid");
  localId(receipt.projectionId, "proj", "Receipt Projection ID");
  for (const key of ["reviewHash", "candidateManifestSha256", "profileInputSha256", "capsuleSha256", "basisSha256", "approvalSha256", "twinRevisionHash"] as const) {
    sha(receipt[key], `Receipt ${key}`);
  }
  timestamp(receipt.approvedAt, "Receipt approvedAt");
  timestamp(receipt.expiresAt, "Receipt expiresAt");
  return structuredClone(receipt) as unknown as LocalProjectionApprovalReceiptV1;
}

function candidateDirectory(paths: ReturnType<typeof reviewPaths>, candidateId: string): string {
  if (!CANDIDATE_ID.test(candidateId)) throw new Error("invalid Projection candidate ID");
  return join(paths.candidates, candidateId);
}

function candidateStageDirectory(paths: ReturnType<typeof reviewPaths>, candidateId: string): string {
  return `${candidateDirectory(paths, candidateId)}.stage`;
}

function approvalDirectory(paths: ReturnType<typeof reviewPaths>, candidateId: string): string {
  if (!CANDIDATE_ID.test(candidateId)) throw new Error("invalid Projection candidate ID");
  return join(paths.approvals, candidateId);
}

function approvalStageDirectory(paths: ReturnType<typeof reviewPaths>, candidateId: string): string {
  return `${approvalDirectory(paths, candidateId)}.stage`;
}

function exactDirectoryFiles(path: string, expected: readonly string[], label: string): void {
  isDirectory0700(path, label);
  const actual = readdirSync(path).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((name, index) => name !== wanted[index])) {
    throw new Error(`${label} has an incomplete or unknown inventory`);
  }
}

function readCandidateAt(path: string): LocalProjectionCandidate {
  exactDirectoryFiles(path, CANDIDATE_FILES, "Projection candidate bundle");
  const manifest = validateCandidateManifest(readCanonicalFile(join(path, "manifest.json"), "Projection candidate manifest"));
  const profileInputValue = readCanonicalFile(join(path, "input.json"), "Projection profile input");
  const profileInput = validateProfileInput(profileInputValue);
  const capsule = validateProjectionCapsuleV1(readCanonicalFile(join(path, "capsule.json"), "Projection capsule"));
  const basis = validateProjectionBasisV1(readCanonicalFile(join(path, "basis.json"), "Projection basis"));
  const reviewHash = reviewHashFor(capsule, basis);
  const preparedMillis = Date.parse(manifest.preparedAt);
  const directoryName = basename(path);
  const claimsBind = capsule.claims.length === basis.claims.length && capsule.claims.every((claim, index) => {
    const basisClaim = basis.claims[index];
    return basisClaim !== undefined
      && basisClaim.slot === claim.slot
      && basisClaim.claimText === claim.text
      && basisClaim.attribution === claim.attribution;
  });
  if (
    (directoryName !== manifest.candidateId && directoryName !== `${manifest.candidateId}.stage`)
    || manifest.candidateId !== candidateIdFor(reviewHash)
    || manifest.reviewHash !== reviewHash
    || manifest.profileInputHash !== profileMeaningHash(profileInput)
    || manifest.profileInputSha256 !== canonicalSha256(profileInput)
    || manifest.capsuleSha256 !== canonicalSha256(capsule)
    || manifest.basisSha256 !== canonicalSha256(basis)
    || manifest.payloadHash !== capsule.payloadHash
    || manifest.basisHash !== canonicalSha256(basis)
    || manifest.projectionId !== capsule.projectionId
    || manifest.roomId !== capsule.roomId
    || manifest.preparedAt !== profileInput.preparedAt
    || manifest.preparedAt !== capsule.publishedAt
    || manifest.expiresAt !== capsule.expiresAt
    || Date.parse(capsule.freshUntil) - preparedMillis !== 23 * 60 * 60 * 1_000
    || Date.parse(capsule.expiresAt) - preparedMillis !== 24 * 60 * 60 * 1_000
    || manifest.twinRevision !== basis.twinRevision
    || manifest.twinRevisionHash !== basis.twinRevisionHash
    || manifest.workspaceContractHash !== basis.workspaceContractHash
    || basis.payloadHash !== capsule.payloadHash
    || basis.projectionId !== capsule.projectionId
    || basis.roomId !== capsule.roomId
    || capsule.disclosureBasisId !== basis.basisId
    || !claimsBind
    || basis.localReceiptId !== null
    || basis.hostedReceiptId !== null
  ) throw new Error("Projection candidate bundle binding mismatch");
  return Object.freeze({ manifest, input: profileInput, capsule, basis });
}

function readApprovalAt(path: string, candidate: LocalProjectionCandidate): LocalProjectionApprovalBundle {
  exactDirectoryFiles(path, APPROVAL_FILES, "Projection approval bundle");
  const approval = validateApproval(readCanonicalFile(join(path, "approval.json"), "Local Projection approval"));
  const receipt = validateReceipt(readCanonicalFile(join(path, "receipt.json"), "Local Projection approval receipt"));
  const expectedApprovalId = `approval_${candidate.manifest.reviewHash.slice("sha256:".length, "sha256:".length + 32)}`;
  const expectedReceiptId = `receipt_${canonicalSha256({ approval, candidate: candidate.manifest }).slice("sha256:".length, "sha256:".length + 32)}`;
  if (
    approval.approvalId !== expectedApprovalId
    || receipt.receiptId !== expectedReceiptId
    || approval.candidateId !== candidate.manifest.candidateId
    || approval.projectionId !== candidate.manifest.projectionId
    || approval.reviewHash !== candidate.manifest.reviewHash
    || approval.payloadHash !== candidate.manifest.payloadHash
    || approval.basisHash !== candidate.manifest.basisHash
    || approval.policyHash !== candidate.basis.projectionPolicyHash
    || approval.twinRevision !== candidate.manifest.twinRevision
    || approval.twinRevisionHash !== candidate.manifest.twinRevisionHash
    || approval.expiresAt !== candidate.manifest.expiresAt
    || Date.parse(approval.approvedAt) < Date.parse(candidate.manifest.preparedAt)
    || Date.parse(approval.approvedAt) >= Date.parse(candidate.manifest.expiresAt)
    || receipt.approvalId !== approval.approvalId
    || receipt.candidateId !== approval.candidateId
    || receipt.projectionId !== approval.projectionId
    || receipt.reviewHash !== approval.reviewHash
    || receipt.candidateManifestSha256 !== canonicalSha256(candidate.manifest)
    || receipt.profileInputSha256 !== candidate.manifest.profileInputSha256
    || receipt.capsuleSha256 !== candidate.manifest.capsuleSha256
    || receipt.basisSha256 !== candidate.manifest.basisSha256
    || receipt.approvalSha256 !== canonicalSha256(approval)
    || receipt.twinRevisionHash !== approval.twinRevisionHash
    || receipt.approvedAt !== approval.approvedAt
    || receipt.expiresAt !== approval.expiresAt
  ) throw new Error("Projection approval bundle binding mismatch");
  return Object.freeze({ approval, receipt });
}

function removeKnownStage(path: string, expected: readonly string[]): void {
  if (!existsSync(path)) return;
  isDirectory0700(path, "Projection staging directory");
  const entries = readdirSync(path).sort();
  if (entries.some((name) => !expected.includes(name))) throw new Error("Projection staging directory has unknown residue");
  for (const name of entries) {
    const target = join(path, name);
    const stat = lstatSync(target, { bigint: false });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) {
      throw new Error("Projection staging residue is not safely removable");
    }
    unlinkSync(target);
  }
  syncDirectory(path);
  rmdirSync(path);
  syncDirectory(dirname(path));
}

function stageCandidate(
  paths: ReturnType<typeof reviewPaths>,
  candidate: LocalProjectionCandidate,
  faultAt?: LocalProjectionPrepareFault,
): string {
  const stage = candidateStageDirectory(paths, candidate.manifest.candidateId);
  if (existsSync(stage)) removeKnownStage(stage, CANDIDATE_FILES);
  mkdirSync(stage, { mode: 0o700 });
  syncDirectory(paths.candidates);
  writeCanonicalExclusive(join(stage, "manifest.json"), candidate.manifest);
  if (faultAt === "after_candidate_manifest") throw new Error("injected failure after candidate manifest");
  writeCanonicalExclusive(join(stage, "input.json"), candidate.input);
  writeCanonicalExclusive(join(stage, "capsule.json"), candidate.capsule);
  writeCanonicalExclusive(join(stage, "basis.json"), candidate.basis);
  syncDirectory(stage);
  readCandidateAt(stage);
  if (faultAt === "after_candidate_stage") throw new Error("injected failure after candidate stage");
  return stage;
}

function writeCurrentStage(paths: ReturnType<typeof reviewPaths>, pointer: LocalProjectionCurrentPointerV1): void {
  if (existsSync(paths.currentStage)) throw new Error("Projection current pointer stage already exists");
  writeCanonicalExclusive(paths.currentStage, pointer);
  syncDirectory(paths.root);
  validateCurrentPointer(readCanonicalFile(paths.currentStage, "Projection current pointer stage"));
}

function promoteCandidate(paths: ReturnType<typeof reviewPaths>, candidate: LocalProjectionCandidate): void {
  const target = candidateDirectory(paths, candidate.manifest.candidateId);
  const stage = candidateStageDirectory(paths, candidate.manifest.candidateId);
  if (existsSync(target)) {
    const existing = readCandidateAt(target);
    if (canonicalJson(existing) !== canonicalJson(candidate)) throw new Error("immutable Projection candidate collision");
    removeKnownStage(stage, CANDIDATE_FILES);
    return;
  }
  renameSync(stage, target);
  syncDirectory(paths.candidates);
  readCandidateAt(target);
}

function promoteCurrent(paths: ReturnType<typeof reviewPaths>): LocalProjectionCurrentPointerV1 {
  const pointer = validateCurrentPointer(readCanonicalFile(paths.currentStage, "Projection current pointer stage"));
  const candidate = readCandidateAt(candidateDirectory(paths, pointer.candidateId));
  if (pointer.reviewHash !== candidate.manifest.reviewHash || pointer.twinRevisionHash !== candidate.manifest.twinRevisionHash) {
    throw new Error("Projection current pointer does not bind its candidate");
  }
  renameSync(paths.currentStage, paths.current);
  syncDirectory(paths.root);
  return validateCurrentPointer(readCanonicalFile(paths.current, "Projection current pointer"));
}

function stageApproval(
  paths: ReturnType<typeof reviewPaths>,
  bundle: LocalProjectionApprovalBundle,
  faultAt?: LocalProjectionApprovalFault,
): string {
  const stage = approvalStageDirectory(paths, bundle.approval.candidateId);
  if (existsSync(stage)) removeKnownStage(stage, APPROVAL_FILES);
  mkdirSync(stage, { mode: 0o700 });
  syncDirectory(paths.approvals);
  writeCanonicalExclusive(join(stage, "approval.json"), bundle.approval);
  if (faultAt === "after_approval_file") throw new Error("injected failure after approval file");
  writeCanonicalExclusive(join(stage, "receipt.json"), bundle.receipt);
  syncDirectory(stage);
  if (faultAt === "after_approval_stage") throw new Error("injected failure after approval stage");
  return stage;
}

function promoteApproval(
  paths: ReturnType<typeof reviewPaths>,
  candidate: LocalProjectionCandidate,
  expected?: LocalProjectionApprovalBundle,
): LocalProjectionApprovalBundle {
  const target = approvalDirectory(paths, candidate.manifest.candidateId);
  const stage = approvalStageDirectory(paths, candidate.manifest.candidateId);
  if (existsSync(target)) {
    const existing = readApprovalAt(target, candidate);
    if (existsSync(stage)) {
      const staged = readApprovalAt(stage, candidate);
      if (canonicalJson(existing) !== canonicalJson(staged)) throw new Error("immutable Projection approval stage collision");
    }
    if (expected && canonicalJson(existing) !== canonicalJson(expected)) throw new Error("immutable Projection approval collision");
    removeKnownStage(stage, APPROVAL_FILES);
    return existing;
  }
  const staged = readApprovalAt(stage, candidate);
  if (expected && canonicalJson(staged) !== canonicalJson(expected)) throw new Error("Projection approval stage drifted");
  renameSync(stage, target);
  syncDirectory(paths.approvals);
  return readApprovalAt(target, candidate);
}

function recoverStages(paths: ReturnType<typeof reviewPaths>): void {
  const candidateStages = readdirSync(paths.candidates).filter((name) => name.endsWith(".stage"));
  if (candidateStages.length > 1) throw new Error("multiple unfinished Projection candidates require Owner review");
  for (const name of candidateStages) {
    const stage = join(paths.candidates, name);
    const entries = readdirSync(stage).sort();
    if (entries.length !== CANDIDATE_FILES.length || entries.some((entry, index) => entry !== [...CANDIDATE_FILES].sort()[index])) {
      removeKnownStage(stage, CANDIDATE_FILES);
      continue;
    }
    const candidate = readCandidateAt(stage);
    if (name !== `${candidate.manifest.candidateId}.stage`) {
      throw new Error("Projection candidate stage name does not bind its manifest");
    }
    promoteCandidate(paths, candidate);
    if (!existsSync(paths.currentStage)) {
      writeCurrentStage(paths, {
        schemaVersion: "local_projection_current_pointer.v1",
        candidateId: candidate.manifest.candidateId,
        reviewHash: candidate.manifest.reviewHash,
        twinRevisionHash: candidate.manifest.twinRevisionHash,
      });
    }
  }
  if (existsSync(paths.currentStage)) promoteCurrent(paths);

  const approvalStages = readdirSync(paths.approvals).filter((name) => name.endsWith(".stage"));
  for (const name of approvalStages) {
    const stage = join(paths.approvals, name);
    const entries = readdirSync(stage).sort();
    if (entries.length !== APPROVAL_FILES.length || entries.some((entry, index) => entry !== [...APPROVAL_FILES].sort()[index])) {
      removeKnownStage(stage, APPROVAL_FILES);
      continue;
    }
    const candidateId = name.slice(0, -".stage".length);
    if (!CANDIDATE_ID.test(candidateId)) throw new Error("Projection approval stage name is invalid");
    const candidate = readCandidateAt(candidateDirectory(paths, candidateId));
    promoteApproval(paths, candidate);
  }
}

function currentCandidate(paths: ReturnType<typeof reviewPaths>): LocalProjectionCandidate {
  if (!existsSync(paths.current)) throw new Error("no local Projection candidate; run projection prepare first");
  const pointer = validateCurrentPointer(readCanonicalFile(paths.current, "Projection current pointer"));
  const candidate = readCandidateAt(candidateDirectory(paths, pointer.candidateId));
  if (pointer.reviewHash !== candidate.manifest.reviewHash || pointer.twinRevisionHash !== candidate.manifest.twinRevisionHash) {
    throw new Error("Projection current pointer binding mismatch");
  }
  return candidate;
}

function currentApproval(paths: ReturnType<typeof reviewPaths>, candidate: LocalProjectionCandidate): LocalProjectionApprovalBundle | null {
  const path = approvalDirectory(paths, candidate.manifest.candidateId);
  return existsSync(path) ? readApprovalAt(path, candidate) : null;
}

function candidateStatus(
  candidate: LocalProjectionCandidate,
  approval: LocalProjectionApprovalBundle | null,
  currentTwinHash: Sha256,
  now: Date,
): LocalProjectionReviewStatus {
  const stale = currentTwinHash !== candidate.manifest.twinRevisionHash;
  const expired = now.getTime() >= Date.parse(candidate.manifest.expiresAt);
  if (expired) return approval ? "APPROVED_EXPIRED" : "EXPIRED";
  if (stale) return approval ? "APPROVED_STALE" : "STALE_TWIN";
  const timeStale = now.getTime() >= Date.parse(candidate.capsule.freshUntil);
  if (timeStale) return approval ? "APPROVED_STALE_TIME" : "STALE_TIME";
  if (approval) return "APPROVED_CURRENT";
  return "READY_FOR_OWNER_REVIEW";
}

function visibleText(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function renderPreview(
  candidate: LocalProjectionCandidate,
  approval: LocalProjectionApprovalBundle | null,
  status: LocalProjectionReviewStatus,
): string {
  const sourceBySlot = new Map<string, string[]>();
  candidate.basis.claims.forEach((claim) => {
    sourceBySlot.set(claim.slot, [...(sourceBySlot.get(claim.slot) ?? []), `${claim.attribution} · ${claim.sourceKind}`]);
  });
  const lines = [
    "# Forme Local Projection Review",
    "",
    "LOCAL ONLY — NOT PUBLISHED — NO ROOM OR CURATOR ACTION",
    `Status: ${status}`,
    `Twin: revision ${candidate.manifest.twinRevision} · ${candidate.manifest.twinRevisionHash}`,
    `Review hash: ${candidate.manifest.reviewHash}`,
    `Payload hash: ${candidate.manifest.payloadHash}`,
    `Basis hash: ${candidate.manifest.basisHash}`,
    `Fresh until: ${candidate.capsule.freshUntil}`,
    `Expires at: ${candidate.capsule.expiresAt}`,
    "",
    `## ${visibleText(candidate.capsule.title)}`,
    "",
    visibleText(candidate.capsule.thirdPlaceSummary),
    "",
  ];
  const slotLabels = {
    becoming: candidate.input.schemaVersion === "local_projection_profile_input.v2" ? "Vision & Becoming" : "Becoming",
    now: "Now",
    nextMove: "Next Move",
    tensions: "Tensions",
    openTo: "Open To",
  } as const;
  for (const slot of ["becoming", "now", "nextMove", "tensions", "openTo"] as const) {
    lines.push(`### ${slotLabels[slot]}`);
    lines.push("");
    const claims = candidate.capsule.claims.filter((claim) => claim.slot === slot);
    claims.forEach((claim, index) => {
      const source = sourceBySlot.get(slot)?.[index] ?? claim.attribution;
      lines.push(`- ${visibleText(claim.text)}`);
      lines.push(`  Attribution: ${source}${claim.uncertainty ? ` · Uncertainty: ${visibleText(claim.uncertainty)}` : ""}`);
    });
    lines.push("");
  }
  lines.push(
    "### Boundary",
    "",
    `- ${visibleText(candidate.capsule.agencyStatement)}`,
    `- ${visibleText(candidate.capsule.nonCommitmentStatement)}`,
    `- Supported interactions: ${candidate.capsule.supportedInteractions.map(visibleText).join(", ")}`,
    `- Expected response latency: ${visibleText(candidate.capsule.expectedResponseLatency)}`,
  );
  for (const topic of candidate.capsule.allowedTopics) lines.push(`- Allowed topic: ${visibleText(topic)}`);
  for (const unavailable of candidate.capsule.unavailableTopics) lines.push(`- Unavailable: ${visibleText(unavailable)}`);
  lines.push(
    "",
    "### Exact local review envelope bytes",
    "",
    "The Review hash above is the SHA-256 of this exact canonical JSON envelope:",
    canonicalJson({
      schemaVersion: "local_projection_exact_review.v1",
      capsule: candidate.capsule,
      basis: candidate.basis,
    }),
    "",
    "#67 must bind a real Room ID and obtain a new exact publication approval; this local approval cannot be reused as publication authority.",
    "",
  );
  if (approval) {
    lines.push(
      "This exact local content is Owner-approved, but publication remains unauthorized.",
      `Local approval receipt: ${approval.receipt.receiptId}`,
    );
  } else if (status === "READY_FOR_OWNER_REVIEW") {
    lines.push(
      "To approve these exact bytes locally, run:",
      "(Run from the same Workspace root used for this preview.)",
      `printf '%s\\n' 'APPROVE ${candidate.manifest.reviewHash}' | npm run forme -- projection approve`,
    );
  } else {
    lines.push("This candidate cannot be approved. Prepare a fresh candidate from the current Twin.");
  }
  return `${lines.join("\n")}\n`;
}

function buildView(workspaceRoot: string, paths: ReturnType<typeof reviewPaths>, now: Date): LocalProjectionReviewView {
  const candidate = currentCandidate(paths);
  const approval = currentApproval(paths, candidate);
  const twin = readVerifiedCurrentTwin(workspaceRoot);
  if (twin.twinRevisionHash === candidate.manifest.twinRevisionHash) {
    const rebuilt = compileLocalProjectionProfile({
      revision: twin.revision,
      twinRevisionHash: twin.twinRevisionHash,
      profile: candidate.input,
    });
    if (
      canonicalJson(rebuilt.capsule) !== canonicalJson(candidate.capsule)
      || canonicalJson(rebuilt.basis) !== canonicalJson(candidate.basis)
      || rebuilt.profileInputHash !== candidate.manifest.profileInputHash
    ) throw new Error("Projection candidate no longer recompiles from its exact Twin basis");
  }
  const status = candidateStatus(candidate, approval, twin.twinRevisionHash, now);
  return Object.freeze({ candidate, approval, status, preview: renderPreview(candidate, approval, status) });
}

export function prepareLocalProjection(input: {
  workspaceRoot: string;
  openTo?: string;
  title?: string;
  summary?: string;
  tension?: string;
  ownerWording?: LocalProjectionOwnerWordingV1;
  becomingReflectionId?: string;
  effectProposalId?: string;
  now?: Date;
  faultAt?: LocalProjectionPrepareFault;
}): LocalProjectionReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  return withReviewLock(workspaceRoot, (paths) => {
    recoverStages(paths);
    const twin = readVerifiedCurrentTwin(workspaceRoot);
    const now = input.now ?? new Date();
    if (input.ownerWording !== undefined && (input.openTo !== undefined || input.tension !== undefined)) {
      throw new Error("Owner wording v2 is mutually exclusive with legacy openTo/tension input");
    }
    if (input.ownerWording === undefined && input.openTo === undefined) {
      throw new Error("Local Projection prepare requires legacy openTo or ownerWording");
    }
    const requestedProfile: LocalProjectionProfileInput = input.ownerWording === undefined
      ? {
        schemaVersion: "local_projection_profile_input.v1",
        workspaceName: twin.contract.name,
        openTo: input.openTo as string,
        preparedAt: now.toISOString(),
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.summary === undefined ? {} : { summary: input.summary }),
        ...(input.tension === undefined ? {} : { tension: input.tension }),
        ...(input.becomingReflectionId === undefined ? {} : { becomingReflectionId: input.becomingReflectionId }),
        ...(input.effectProposalId === undefined ? {} : { effectProposalId: input.effectProposalId }),
      }
      : {
        schemaVersion: "local_projection_profile_input.v2",
        workspaceName: twin.contract.name,
        ownerWording: input.ownerWording,
        preparedAt: now.toISOString(),
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.summary === undefined ? {} : { summary: input.summary }),
        ...(input.becomingReflectionId === undefined ? {} : { becomingReflectionId: input.becomingReflectionId }),
        ...(input.effectProposalId === undefined ? {} : { effectProposalId: input.effectProposalId }),
      };
    if (existsSync(paths.current)) {
      const existing = currentCandidate(paths);
      const desiredMeaning = canonicalSha256({
        ...requestedProfile,
        preparedAt: null,
        becomingReflectionId: input.becomingReflectionId ?? existing.input.becomingReflectionId,
        effectProposalId: input.effectProposalId ?? existing.input.effectProposalId,
      });
      if (
        existing.manifest.twinRevisionHash === twin.twinRevisionHash
        && existing.manifest.profileInputHash === desiredMeaning
        && now.getTime() < Date.parse(existing.capsule.freshUntil)
      ) return buildView(workspaceRoot, paths, now);
    }
    const compiled = compileLocalProjectionProfile({
      revision: twin.revision,
      twinRevisionHash: twin.twinRevisionHash,
      profile: requestedProfile,
    });
    const reviewHash = reviewHashFor(compiled.capsule, compiled.basis);
    const manifest: LocalProjectionCandidateManifestV1 = {
      schemaVersion: "local_projection_candidate_manifest.v1",
      candidateId: candidateIdFor(reviewHash),
      projectionId: compiled.capsule.projectionId,
      roomId: compiled.capsule.roomId,
      preparedAt: compiled.profileInput.preparedAt,
      expiresAt: compiled.capsule.expiresAt,
      twinRevision: compiled.basis.twinRevision,
      twinRevisionHash: compiled.basis.twinRevisionHash,
      workspaceContractHash: compiled.basis.workspaceContractHash,
      profileInputHash: compiled.profileInputHash,
      profileInputSha256: canonicalSha256(compiled.profileInput),
      capsuleSha256: canonicalSha256(compiled.capsule),
      basisSha256: canonicalSha256(compiled.basis),
      payloadHash: compiled.capsule.payloadHash,
      basisHash: canonicalSha256(compiled.basis),
      reviewHash,
      localOnly: true,
      publicationAuthorized: false,
      roomMutationAuthorized: false,
    };
    const candidate = Object.freeze({ manifest, input: compiled.profileInput, capsule: compiled.capsule, basis: compiled.basis });
    const target = candidateDirectory(paths, manifest.candidateId);
    if (existsSync(target)) {
      const existing = readCandidateAt(target);
      if (canonicalJson(existing) !== canonicalJson(candidate)) throw new Error("immutable Projection candidate collision");
    } else {
      stageCandidate(paths, candidate, input.faultAt);
    }
    const pointer: LocalProjectionCurrentPointerV1 = {
      schemaVersion: "local_projection_current_pointer.v1",
      candidateId: manifest.candidateId,
      reviewHash,
      twinRevisionHash: manifest.twinRevisionHash,
    };
    writeCurrentStage(paths, pointer);
    if (input.faultAt === "after_current_stage") throw new Error("injected failure after current pointer stage");
    if (!existsSync(target)) promoteCandidate(paths, candidate);
    if (input.faultAt === "after_candidate_commit") throw new Error("injected failure after candidate commit");
    promoteCurrent(paths);
    if (input.faultAt === "after_current_commit") throw new Error("injected failure after current pointer commit");
    return buildView(workspaceRoot, paths, now);
  });
}

export function previewLocalProjection(input: { workspaceRoot: string; now?: Date }): LocalProjectionReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const paths = verifyReviewRoot(workspaceRoot);
  if (existsSync(paths.recoveryLock)) {
    const recovery = readStableLock(paths.recoveryLock);
    throw new Error(`Projection recovery is incomplete; run projection recover --lock-pid ${recovery.pid}`);
  }
  if (existsSync(paths.lock)) {
    const lock = readStableLock(paths.lock);
    throw new Error(pidAlive(lock.pid)
      ? `another Projection review operation is active (pid ${lock.pid})`
      : `Projection review stopped unexpectedly; run projection recover --lock-pid ${lock.pid}`);
  }
  const hasStage = existsSync(paths.currentStage)
    || readdirSync(paths.candidates).some((name) => name.endsWith(".stage"))
    || readdirSync(paths.approvals).some((name) => name.endsWith(".stage"));
  if (hasStage) {
    throw new Error("Projection review has an unfinished write; rerun the interrupted prepare or approve command to recover it");
  }
  return buildView(workspaceRoot, paths, input.now ?? new Date());
}

export function approveLocalProjection(input: {
  workspaceRoot: string;
  confirmation: string;
  now?: Date;
  faultAt?: LocalProjectionApprovalFault;
}): LocalProjectionReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  return withReviewLock(workspaceRoot, (paths) => {
    recoverStages(paths);
    const now = input.now ?? new Date();
    const candidate = currentCandidate(paths);
    const expectedConfirmation = `APPROVE ${candidate.manifest.reviewHash}`;
    if (input.confirmation !== expectedConfirmation) throw new Error("Owner confirmation must match the exact displayed review hash");
    const before = buildView(workspaceRoot, paths, now);
    if (before.status === "APPROVED_CURRENT") return before;
    if (before.status !== "READY_FOR_OWNER_REVIEW") throw new Error(`Projection is not approvable:${before.status}`);
    const approvedAt = now.toISOString();
    if (
      now.getTime() < Date.parse(candidate.manifest.preparedAt)
      || now.getTime() >= Date.parse(candidate.manifest.expiresAt)
    ) throw new Error("Projection approval time is outside the candidate lifetime");
    const approvalId = `approval_${candidate.manifest.reviewHash.slice("sha256:".length, "sha256:".length + 32)}`;
    const approval: LocalProjectionContentApprovalV1 = {
      schemaVersion: "local_projection_content_approval.v1",
      approvalId,
      candidateId: candidate.manifest.candidateId,
      projectionId: candidate.manifest.projectionId,
      reviewHash: candidate.manifest.reviewHash,
      payloadHash: candidate.manifest.payloadHash,
      basisHash: candidate.manifest.basisHash,
      policyHash: candidate.basis.projectionPolicyHash,
      twinRevision: candidate.manifest.twinRevision,
      twinRevisionHash: candidate.manifest.twinRevisionHash,
      approvedAt,
      expiresAt: candidate.manifest.expiresAt,
      confirmationMethod: "exact_hash_terminal_input",
      localOnly: true,
      publicationAuthorized: false,
      roomMutationAuthorized: false,
    };
    const receipt: LocalProjectionApprovalReceiptV1 = {
      schemaVersion: "local_projection_approval_receipt.v1",
      receiptId: `receipt_${canonicalSha256({ approval, candidate: candidate.manifest }).slice("sha256:".length, "sha256:".length + 32)}`,
      approvalId,
      candidateId: candidate.manifest.candidateId,
      projectionId: candidate.manifest.projectionId,
      reviewHash: candidate.manifest.reviewHash,
      candidateManifestSha256: canonicalSha256(candidate.manifest),
      profileInputSha256: candidate.manifest.profileInputSha256,
      capsuleSha256: candidate.manifest.capsuleSha256,
      basisSha256: candidate.manifest.basisSha256,
      approvalSha256: canonicalSha256(approval),
      twinRevisionHash: candidate.manifest.twinRevisionHash,
      approvedAt,
      expiresAt: candidate.manifest.expiresAt,
      roomCalls: 0,
      networkCalls: 0,
      providerCalls: 0,
      hostBindingCalls: 0,
      publicationCalls: 0,
      localOnly: true,
      publicationAuthorized: false,
      roomMutationAuthorized: false,
    };
    const bundle = Object.freeze({ approval, receipt });
    stageApproval(paths, bundle, input.faultAt);
    if (input.faultAt === "after_approval_stage") throw new Error("injected failure after approval stage");
    promoteApproval(paths, candidate, bundle);
    if (input.faultAt === "after_approval_commit") throw new Error("injected failure after approval commit");
    return buildView(workspaceRoot, paths, now);
  });
}

/**
 * Explicit recovery for a process that died while holding the local review
 * lock. The hard-link anchor keeps the exact dead lock inode named while the
 * Owner-visible recovery completes. No stale lock is silently adopted by a
 * read-only command.
 */
export function recoverLocalProjectionReview(input: {
  workspaceRoot: string;
  expectedLockPid: number;
  now?: Date;
}): LocalProjectionReviewView | null {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const paths = verifyReviewRoot(workspaceRoot);
  if (!Number.isSafeInteger(input.expectedLockPid) || input.expectedLockPid <= 0) {
    throw new Error("Projection recovery requires the exact positive lock PID");
  }
  let anchor: ReturnType<typeof readStableLock>;
  if (existsSync(paths.recoveryLock)) {
    anchor = readStableLock(paths.recoveryLock);
    if (anchor.pid !== input.expectedLockPid) throw new Error("Projection recovery PID does not match the anchored stale lock");
  } else {
    if (!existsSync(paths.lock)) throw new Error("Projection review has no stale lock to recover");
    const stale = readStableLock(paths.lock);
    if (stale.pid !== input.expectedLockPid) throw new Error("Projection recovery PID does not match the stale lock");
    if (pidAlive(stale.pid)) throw new Error("Projection review lock process is still active");
    linkSync(paths.lock, paths.recoveryLock);
    syncDirectory(paths.root);
    anchor = readStableLock(paths.recoveryLock);
    const original = readStableLock(paths.lock);
    if (!sameLockIdentity(anchor, original)) throw new Error("Projection recovery anchor does not bind the stale lock");
  }
  if (pidAlive(anchor.pid)) throw new Error("Projection recovery lock process is still active");

  if (existsSync(paths.lock)) {
    const current = readStableLock(paths.lock);
    if (!sameLockIdentity(anchor, current) && pidAlive(current.pid)) {
      throw new Error("a live Projection operation started during recovery");
    }
    unlinkSync(paths.lock);
    syncDirectory(paths.root);
  }
  writeDurablePidLockExclusive(paths.lock, paths.root, process.pid);
  try {
    recoverStages(paths);
    return existsSync(paths.current) ? buildView(workspaceRoot, paths, input.now ?? new Date()) : null;
  } finally {
    if (existsSync(paths.lock)) {
      const current = readStableLock(paths.lock);
      if (current.pid !== process.pid) throw new Error("Projection recovery lock identity changed");
      unlinkSync(paths.lock);
      syncDirectory(paths.root);
    }
    if (existsSync(paths.recoveryLock)) {
      const retained = readStableLock(paths.recoveryLock);
      if (!sameLockIdentity(anchor, retained)) throw new Error("Projection recovery anchor identity changed");
      unlinkSync(paths.recoveryLock);
      syncDirectory(paths.root);
    }
  }
}
