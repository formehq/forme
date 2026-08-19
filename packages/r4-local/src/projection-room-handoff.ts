import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
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
  assertOpaqueId,
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  validateArtifactApprovalV1,
  validateProjectionBasisV1,
  validateProjectionCapsuleV1,
  type ArtifactApprovalV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
} from "../../r4-protocol/src/index.ts";
import {
  approveProjectionExact,
  compileLocalProjectionProfile,
  compileProjectionDraft,
  type CompiledProjectionDraft,
  type ProjectionClaimSelection,
  type ProjectionDraftInput,
} from "./projection.ts";
import { previewLocalProjection, type LocalProjectionReviewView } from "./projection-review.ts";
import { readVerifiedCurrentTwin } from "./twin-snapshot.ts";

type Sha256 = `sha256:${string}`;

const DAY_MS = 24 * 60 * 60 * 1_000;
const FRESH_MS = 6 * DAY_MS;
const EXPIRES_MS = 7 * DAY_MS;
const MAX_SCHEDULE_DELAY_MS = DAY_MS;
const MAX_RECORD_BYTES = 2 * 1_024 * 1_024;
const HANDOFF_ID = /^handoff_[a-f0-9]{32}$/u;
const SOURCE_CANDIDATE_ID = /^candidate_[a-f0-9]{32}$/u;
const ROOT_PARTS = [".forme", "r4", "room-handoffs"] as const;
const APPROVAL_FILES = ["approval.json", "receipt.json"] as const;

export const NON_PUBLISHABLE_HISTORICAL_SOURCE_REVIEW_SHA256 =
  "sha256:45414f18e70b0c5e7f3a2f6980b1596835952663dfea2d25d87605b8283d1480" as const;

export type LocalRoomHandoffPrepareFault =
  | "after_candidate_stage"
  | "after_current_stage"
  | "after_candidate_commit"
  | "after_current_commit";

export type LocalRoomHandoffApprovalFault =
  | "after_approval_file"
  | "after_approval_stage"
  | "after_approval_commit";

export interface LocalRoomHandoffSourceV1 {
  readonly schemaVersion: "local_room_handoff_source.v1";
  readonly candidateId: string;
  readonly reviewHash: Sha256;
  readonly localOnlyRoomId: string;
  readonly projectionId: string;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly profileInputSha256: Sha256;
  readonly localContentApprovalId: string;
  readonly localContentApprovalSha256: Sha256;
  readonly localContentApprovalReceiptId: string;
  readonly localContentApprovalReceiptSha256: Sha256;
  readonly twinRevisionHash: Sha256;
  readonly publicContentHash: Sha256;
  readonly localContentApprovalReusable: false;
}

export interface LocalRoomHandoffCompiledDraftV1 {
  readonly schemaVersion: "local_room_handoff_compiled_draft.v1";
  readonly input: ProjectionDraftInput;
  readonly inputHash: Sha256;
  readonly capsule: ProjectionCapsuleV1;
  readonly basis: ProjectionBasisV1;
}

export interface LocalRoomHandoffCandidateV1 {
  readonly schemaVersion: "local_room_handoff_candidate.v1";
  readonly handoffId: string;
  readonly source: LocalRoomHandoffSourceV1;
  readonly targetRoomId: string;
  readonly projectionId: string;
  readonly basisId: string;
  readonly publicationAttestationId: string;
  readonly ownerDecisionId: string;
  readonly preparedAt: string;
  readonly scheduledPublishedAt: string;
  readonly freshUntil: string;
  readonly expiresAt: string;
  readonly twinRevision: number;
  readonly twinRevisionHash: Sha256;
  readonly workspaceContractHash: Sha256;
  readonly draftSha256: Sha256;
  readonly capsuleSha256: Sha256;
  readonly basisSha256: Sha256;
  readonly payloadHash: Sha256;
  readonly basisHash: Sha256;
  readonly publicContentHash: Sha256;
  readonly reviewHash: Sha256;
  readonly draft: LocalRoomHandoffCompiledDraftV1;
  readonly sourceLocalApprovalReused: false;
  readonly contentPublicationApproved: false;
  readonly deliveryAuthorized: false;
  readonly roomMutationAuthorized: false;
  readonly localOnly: true;
}

export interface LocalRoomHandoffCurrentPointerV1 {
  readonly schemaVersion: "local_room_handoff_current_pointer.v1";
  readonly handoffId: string;
  readonly targetRoomId: string;
  readonly reviewHash: Sha256;
  readonly twinRevisionHash: Sha256;
}

export interface LocalRoomHandoffPublicationApprovalV1 {
  readonly schemaVersion: "local_room_handoff_publication_approval.v1";
  readonly handoffId: string;
  readonly reviewHash: Sha256;
  readonly sourceLocalApprovalId: string;
  readonly artifactApproval: ArtifactApprovalV1;
  readonly confirmationMethod: "exact_hash_terminal_input";
  readonly sourceLocalApprovalReused: false;
  readonly contentPublicationApproved: true;
  readonly deliveryAuthorized: false;
  readonly roomMutationAuthorized: false;
  readonly localOnly: true;
}

export interface LocalRoomHandoffApprovalReceiptV1 {
  readonly schemaVersion: "local_room_handoff_approval_receipt.v1";
  readonly receiptId: string;
  readonly approvalId: string;
  readonly handoffId: string;
  readonly reviewHash: Sha256;
  readonly candidateSha256: Sha256;
  readonly draftSha256: Sha256;
  readonly artifactApprovalSha256: Sha256;
  readonly approvalSha256: Sha256;
  readonly twinRevisionHash: Sha256;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly roomMutationCalls: 0;
  readonly networkCalls: 0;
  readonly providerCalls: 0;
  readonly hostBindingCalls: 0;
  readonly publicationCalls: 0;
  readonly sourceLocalApprovalReused: false;
  readonly contentPublicationApproved: true;
  readonly deliveryAuthorized: false;
  readonly roomMutationAuthorized: false;
  readonly localOnly: true;
}

export interface LocalRoomHandoffApprovalBundle {
  readonly approval: LocalRoomHandoffPublicationApprovalV1;
  readonly receipt: LocalRoomHandoffApprovalReceiptV1;
}

export type LocalRoomHandoffReviewStatus =
  | "READY_FOR_OWNER_REVIEW"
  | "APPROVED_CURRENT"
  | "STALE_SOURCE"
  | "APPROVED_STALE_SOURCE"
  | "STALE_TWIN"
  | "APPROVED_STALE_TWIN"
  | "NOT_YET_VALID"
  | "APPROVED_NOT_YET_VALID"
  | "PUBLICATION_WINDOW_CLOSED"
  | "STALE_TIME"
  | "APPROVED_STALE_TIME"
  | "EXPIRED"
  | "APPROVED_EXPIRED";

export interface LocalRoomHandoffReviewView {
  readonly status: LocalRoomHandoffReviewStatus;
  readonly candidate: LocalRoomHandoffCandidateV1;
  readonly approval: LocalRoomHandoffApprovalBundle | null;
  readonly preview: string;
}

interface HandoffPaths {
  readonly root: string;
  readonly candidates: string;
  readonly approvals: string;
  readonly current: string;
  readonly currentStage: string;
  readonly lock: string;
  readonly recoveryLock: string;
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

function opaqueId(value: unknown, prefix: string, label: string): string {
  try { assertOpaqueId(value, prefix, label); } catch { throw new Error(`${label} is invalid`); }
  return value;
}

function deterministicId(prefix: string, seed: unknown): string {
  return `${prefix}_${canonicalSha256(seed).slice("sha256:".length, "sha256:".length + 32)}`;
}

function canonicalBytes(value: unknown): string {
  return `${canonicalJson(value)}\n`;
}

function ownedUid(): number | undefined {
  return process.getuid?.();
}

function assertDirectory0700(path: string, label: string): void {
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

function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { mode: 0o700 });
    syncDirectory(dirname(path));
  }
  assertDirectory0700(path, basename(path));
}

function pathsFor(workspaceRoot: string): HandoffPaths {
  const root = resolve(workspaceRoot, ...ROOT_PARTS);
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
  if (realpathSync(root) !== root) throw new Error("Workspace root must be canonical before Room handoff review");
  return root;
}

function ensureRoot(workspaceRoot: string): HandoffPaths {
  const paths = pathsFor(workspaceRoot);
  const stateRoot = resolve(workspaceRoot, ".forme");
  assertDirectory0700(stateRoot, "Forme state root");
  ensureDirectory(join(stateRoot, "r4"));
  ensureDirectory(paths.root);
  ensureDirectory(paths.candidates);
  ensureDirectory(paths.approvals);
  return paths;
}

function verifyRoot(workspaceRoot: string): HandoffPaths {
  const paths = pathsFor(workspaceRoot);
  assertDirectory0700(resolve(workspaceRoot, ".forme"), "Forme state root");
  assertDirectory0700(resolve(workspaceRoot, ".forme", "r4"), "R4 local state root");
  assertDirectory0700(paths.root, "Room handoff review root");
  assertDirectory0700(paths.candidates, "Room handoff candidate root");
  assertDirectory0700(paths.approvals, "Room handoff approval root");
  return paths;
}

function writeCanonicalExclusive(path: string, value: unknown): void {
  const descriptor = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    writeFileSync(descriptor, canonicalBytes(value), "utf8");
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
    const afterPath = lstatSync(path, { bigint: false });
    if (
      after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || afterPath.dev !== after.dev
      || afterPath.ino !== after.ino
    ) throw new Error(`${label} changed during read`);
    let parsed: unknown;
    try { parsed = parseStrictJson(bytes); } catch { throw new Error(`${label} is not strict JSON`); }
    if (bytes !== canonicalBytes(parsed)) throw new Error(`${label} is not canonical one-line JSON`);
    return parsed;
  } finally {
    closeSync(descriptor);
  }
}

function writeLock(path: string, parent: string, pid: number): void {
  const descriptor = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    writeFileSync(descriptor, `${pid}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  syncDirectory(parent);
}

function readLock(path: string): { pid: number; device: number; inode: number } {
  const stat = lstatSync(path, { bigint: false });
  const uid = ownedUid();
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || (stat.mode & 0o777) !== 0o600
    || (uid !== undefined && stat.uid !== uid)
    || (stat.nlink !== 1 && stat.nlink !== 2)
    || stat.size > 32
  ) throw new Error("Room handoff lock is not one trusted 0600 file");
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: false });
    const body = readFileSync(descriptor, "utf8");
    const after = fstatSync(descriptor, { bigint: false });
    const afterPath = lstatSync(path, { bigint: false });
    if (
      before.dev !== stat.dev || before.ino !== stat.ino || before.size !== stat.size
      || after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.mtimeMs !== before.mtimeMs
      || afterPath.dev !== after.dev || afterPath.ino !== after.ino
    ) throw new Error("Room handoff lock changed during read");
    if (!/^[1-9][0-9]*\n$/u.test(body)) throw new Error("Room handoff lock body is invalid");
    const pid = Number.parseInt(body, 10);
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Room handoff lock PID is invalid");
    return { pid, device: after.dev, inode: after.ino };
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

function sameLock(left: { device: number; inode: number }, right: { device: number; inode: number }): boolean {
  return left.device === right.device && left.inode === right.inode;
}

function withLock<T>(workspaceRoot: string, operation: (paths: HandoffPaths) => T): T {
  const paths = ensureRoot(workspaceRoot);
  if (existsSync(paths.recoveryLock)) {
    const recovery = readLock(paths.recoveryLock);
    throw new Error(`Room handoff recovery is incomplete; recover with exact lock PID ${recovery.pid}`);
  }
  try {
    writeLock(paths.lock, paths.root, process.pid);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const lock = readLock(paths.lock);
    throw new Error(pidAlive(lock.pid)
      ? `another Room handoff review operation is active (pid ${lock.pid})`
      : `Room handoff review stopped unexpectedly; recover with exact lock PID ${lock.pid}`);
  }
  try {
    return operation(paths);
  } finally {
    if (existsSync(paths.lock)) {
      const lock = readLock(paths.lock);
      if (lock.pid === process.pid) {
        unlinkSync(paths.lock);
        syncDirectory(paths.root);
      }
    }
  }
}

function validateSelection(value: unknown, label: string): ProjectionClaimSelection {
  const item = record(value, label);
  if (typeof item.slot !== "string" || !["becoming", "now", "nextMove", "tensions", "openTo"].includes(item.slot)) {
    throw new Error(`${label} slot is invalid`);
  }
  if (item.source === "owner_frame") {
    exactKeys(item, ["slot", "source", "field"], label);
    if (item.field !== "activeIntent" && item.field !== "nextMove") throw new Error(`${label} owner field is invalid`);
  } else if (item.source === "owner_unresolved") {
    exactKeys(item, ["slot", "source", "index"], label);
    if (!Number.isSafeInteger(item.index) || (item.index as number) < 0) throw new Error(`${label} unresolved index is invalid`);
  } else if (item.source === "reflection") {
    exactKeys(item, ["slot", "source", "reflectionId"], label);
    opaqueId(item.reflectionId, "ref", `${label} Reflection ID`);
  } else if (item.source === "r3_effect") {
    exactKeys(item, ["slot", "source", "proposalId"], label);
    opaqueId(item.proposalId, "act", `${label} proposal ID`);
  } else if (item.source === "projection_owner_wording") {
    exactKeys(item, ["slot", "source", "text"], label);
    if (
      typeof item.text !== "string" || item.text.length === 0 || item.text.trim() !== item.text
      || item.text.normalize("NFC") !== item.text || Buffer.byteLength(item.text, "utf8") > 8 * 1_024
    ) throw new Error(`${label} public wording is invalid`);
  } else {
    throw new Error(`${label} source is invalid`);
  }
  return structuredClone(item) as unknown as ProjectionClaimSelection;
}

function validateDraftInput(value: unknown): ProjectionDraftInput {
  const input = record(value, "Room handoff draft input");
  exactKeys(input, [
    "roomId", "projectionId", "entityId", "basisId", "publicationAttestationId", "ownerDecisionId", "title",
    "thirdPlaceSummary", "selections", "supportedInteractions", "allowedTopics", "unavailableTopics",
    "expectedResponseLatency", "visualThemeToken", "agencyStatement", "nonCommitmentStatement",
    "projectionPolicyGeneration", "projectionPolicyHash", "publishedAt", "freshUntil", "expiresAt",
  ], "Room handoff draft input");
  opaqueId(input.roomId, "room", "Room handoff target Room ID");
  opaqueId(input.projectionId, "proj", "Room handoff Projection ID");
  opaqueId(input.entityId, "entity", "Room handoff entity ID");
  opaqueId(input.basisId, "basis", "Room handoff basis ID");
  opaqueId(input.publicationAttestationId, "att", "Room handoff publication attestation ID");
  opaqueId(input.ownerDecisionId, "decision", "Room handoff Owner decision ID");
  for (const key of ["title", "thirdPlaceSummary", "expectedResponseLatency", "visualThemeToken", "agencyStatement", "nonCommitmentStatement"] as const) {
    if (typeof input[key] !== "string" || (input[key] as string).length === 0) throw new Error(`Room handoff draft ${key} is invalid`);
  }
  if (!Array.isArray(input.selections) || input.selections.length < 1 || input.selections.length > 20) {
    throw new Error("Room handoff selections must contain between 1 and 20 claims");
  }
  const selections = input.selections.map((item, index) => validateSelection(item, `Room handoff selection ${index}`));
  if (
    !Array.isArray(input.supportedInteractions)
    || input.supportedInteractions.length < 1
    || input.supportedInteractions.length > 3
    || input.supportedInteractions.some((item) => item !== "ask" && item !== "seed" && item !== "resonance")
    || new Set(input.supportedInteractions).size !== input.supportedInteractions.length
  ) throw new Error("Room handoff supported interactions are invalid");
  for (const key of ["allowedTopics", "unavailableTopics"] as const) {
    const items = input[key];
    if (!Array.isArray(items) || items.length < 1 || items.length > 8 || items.some((item) => typeof item !== "string" || item.length === 0)) {
      throw new Error(`Room handoff ${key} are invalid`);
    }
  }
  if (!Number.isSafeInteger(input.projectionPolicyGeneration) || (input.projectionPolicyGeneration as number) < 1) {
    throw new Error("Room handoff policy generation is invalid");
  }
  sha(input.projectionPolicyHash, "Room handoff policy hash");
  timestamp(input.publishedAt, "Room handoff publishedAt");
  timestamp(input.freshUntil, "Room handoff freshUntil");
  timestamp(input.expiresAt, "Room handoff expiresAt");
  return structuredClone({ ...input, selections }) as unknown as ProjectionDraftInput;
}

function validateSource(value: unknown): LocalRoomHandoffSourceV1 {
  const source = record(value, "Room handoff source");
  exactKeys(source, [
    "schemaVersion", "candidateId", "reviewHash", "localOnlyRoomId", "projectionId", "payloadHash", "basisHash", "profileInputSha256",
    "localContentApprovalId", "localContentApprovalSha256", "localContentApprovalReceiptId",
    "localContentApprovalReceiptSha256", "twinRevisionHash", "publicContentHash", "localContentApprovalReusable",
  ], "Room handoff source");
  if (
    source.schemaVersion !== "local_room_handoff_source.v1"
    || typeof source.candidateId !== "string" || !SOURCE_CANDIDATE_ID.test(source.candidateId)
    || source.localContentApprovalReusable !== false
  ) throw new Error("Room handoff source is invalid");
  opaqueId(source.localOnlyRoomId, "room", "Source local-only Room ID");
  opaqueId(source.projectionId, "proj", "Source Projection ID");
  opaqueId(source.localContentApprovalId, "approval", "Source local approval ID");
  opaqueId(source.localContentApprovalReceiptId, "receipt", "Source local receipt ID");
  for (const key of [
    "reviewHash", "payloadHash", "basisHash", "profileInputSha256", "localContentApprovalSha256",
    "localContentApprovalReceiptSha256", "twinRevisionHash", "publicContentHash",
  ] as const) sha(source[key], `Room handoff source ${key}`);
  return structuredClone(source) as unknown as LocalRoomHandoffSourceV1;
}

function compiledDraftRecord(draft: CompiledProjectionDraft): LocalRoomHandoffCompiledDraftV1 {
  return {
    schemaVersion: "local_room_handoff_compiled_draft.v1",
    input: structuredClone(draft.input),
    inputHash: draft.inputHash,
    capsule: structuredClone(draft.capsule),
    basis: structuredClone(draft.basis),
  };
}

function asCompiledDraft(draft: LocalRoomHandoffCompiledDraftV1): CompiledProjectionDraft {
  return {
    input: structuredClone(draft.input),
    inputHash: draft.inputHash,
    capsule: structuredClone(draft.capsule),
    basis: structuredClone(draft.basis),
  };
}

function validateCompiledDraft(value: unknown): LocalRoomHandoffCompiledDraftV1 {
  const draft = record(value, "Room handoff compiled draft");
  exactKeys(draft, ["schemaVersion", "input", "inputHash", "capsule", "basis"], "Room handoff compiled draft");
  if (draft.schemaVersion !== "local_room_handoff_compiled_draft.v1") throw new Error("Room handoff draft schema is invalid");
  const input = validateDraftInput(draft.input);
  const inputHash = sha(draft.inputHash, "Room handoff draft input hash");
  const capsule = validateProjectionCapsuleV1(draft.capsule);
  const basis = validateProjectionBasisV1(draft.basis);
  if (
    inputHash !== canonicalSha256(input)
    || input.roomId !== capsule.roomId || input.roomId !== basis.roomId
    || input.projectionId !== capsule.projectionId || input.projectionId !== basis.projectionId
    || input.entityId !== capsule.entityId
    || input.basisId !== basis.basisId || input.basisId !== capsule.disclosureBasisId
    || input.publicationAttestationId !== capsule.publicationAttestationId
    || input.ownerDecisionId !== basis.ownerDecisionId
    || input.title !== capsule.title || input.thirdPlaceSummary !== capsule.thirdPlaceSummary
    || canonicalJson(input.supportedInteractions) !== canonicalJson(capsule.supportedInteractions)
    || canonicalJson(input.allowedTopics) !== canonicalJson(capsule.allowedTopics)
    || canonicalJson(input.unavailableTopics) !== canonicalJson(capsule.unavailableTopics)
    || input.expectedResponseLatency !== capsule.expectedResponseLatency
    || input.visualThemeToken !== capsule.visualThemeToken
    || input.agencyStatement !== capsule.agencyStatement
    || input.nonCommitmentStatement !== capsule.nonCommitmentStatement
    || input.projectionPolicyGeneration !== basis.projectionPolicyGeneration
    || input.projectionPolicyHash !== basis.projectionPolicyHash
    || input.publishedAt !== capsule.publishedAt || input.freshUntil !== capsule.freshUntil || input.expiresAt !== capsule.expiresAt
    || basis.payloadHash !== capsule.payloadHash
  ) throw new Error("Room handoff compiled draft binding mismatch");
  return Object.freeze({ schemaVersion: "local_room_handoff_compiled_draft.v1", input, inputHash, capsule, basis });
}

function publicContentHash(capsule: ProjectionCapsuleV1): Sha256 {
  return canonicalSha256({
    schemaVersion: "local_room_handoff_public_content.v1",
    entityId: capsule.entityId,
    title: capsule.title,
    thirdPlaceSummary: capsule.thirdPlaceSummary,
    claims: capsule.claims,
    supportedInteractions: capsule.supportedInteractions,
    allowedTopics: capsule.allowedTopics,
    unavailableTopics: capsule.unavailableTopics,
    expectedResponseLatency: capsule.expectedResponseLatency,
    visualThemeToken: capsule.visualThemeToken,
    agencyStatement: capsule.agencyStatement,
    nonCommitmentStatement: capsule.nonCommitmentStatement,
  });
}

function exactReviewEnvelope(candidate: Pick<LocalRoomHandoffCandidateV1, "source" | "targetRoomId" | "draft" | "sourceLocalApprovalReused" | "deliveryAuthorized" | "roomMutationAuthorized">): unknown {
  return {
    schemaVersion: "local_room_handoff_exact_review.v1",
    source: candidate.source,
    targetRoomId: candidate.targetRoomId,
    draft: candidate.draft,
    sourceLocalApprovalReused: candidate.sourceLocalApprovalReused,
    approvalScope: "exact_projection_content_for_future_delivery",
    deliveryAuthorized: candidate.deliveryAuthorized,
    roomMutationAuthorized: candidate.roomMutationAuthorized,
  };
}

function validateCandidate(value: unknown): LocalRoomHandoffCandidateV1 {
  const candidate = record(value, "Room handoff candidate");
  exactKeys(candidate, [
    "schemaVersion", "handoffId", "source", "targetRoomId", "projectionId", "basisId", "publicationAttestationId",
    "ownerDecisionId", "preparedAt", "scheduledPublishedAt", "freshUntil", "expiresAt", "twinRevision", "twinRevisionHash",
    "workspaceContractHash", "draftSha256", "capsuleSha256", "basisSha256", "payloadHash", "basisHash",
    "publicContentHash", "reviewHash", "draft", "sourceLocalApprovalReused", "contentPublicationApproved",
    "deliveryAuthorized", "roomMutationAuthorized", "localOnly",
  ], "Room handoff candidate");
  if (
    candidate.schemaVersion !== "local_room_handoff_candidate.v1"
    || typeof candidate.handoffId !== "string" || !HANDOFF_ID.test(candidate.handoffId)
    || !Number.isSafeInteger(candidate.twinRevision) || (candidate.twinRevision as number) < 1
    || candidate.sourceLocalApprovalReused !== false
    || candidate.contentPublicationApproved !== false
    || candidate.deliveryAuthorized !== false
    || candidate.roomMutationAuthorized !== false
    || candidate.localOnly !== true
  ) throw new Error("Room handoff candidate is invalid");
  const source = validateSource(candidate.source);
  const draft = validateCompiledDraft(candidate.draft);
  opaqueId(candidate.targetRoomId, "room", "Room handoff target Room ID");
  opaqueId(candidate.projectionId, "proj", "Room handoff Projection ID");
  opaqueId(candidate.basisId, "basis", "Room handoff basis ID");
  opaqueId(candidate.publicationAttestationId, "att", "Room handoff publication attestation ID");
  opaqueId(candidate.ownerDecisionId, "decision", "Room handoff Owner decision ID");
  timestamp(candidate.preparedAt, "Room handoff preparedAt");
  timestamp(candidate.scheduledPublishedAt, "Room handoff scheduledPublishedAt");
  timestamp(candidate.freshUntil, "Room handoff freshUntil");
  timestamp(candidate.expiresAt, "Room handoff expiresAt");
  for (const key of [
    "twinRevisionHash", "workspaceContractHash", "draftSha256", "capsuleSha256", "basisSha256", "payloadHash",
    "basisHash", "publicContentHash", "reviewHash",
  ] as const) sha(candidate[key], `Room handoff ${key}`);
  const reviewHash = canonicalSha256(exactReviewEnvelope({
    source,
    targetRoomId: candidate.targetRoomId as string,
    draft,
    sourceLocalApprovalReused: false,
    deliveryAuthorized: false,
    roomMutationAuthorized: false,
  }));
  if (
    candidate.handoffId !== `handoff_${reviewHash.slice("sha256:".length, "sha256:".length + 32)}`
    || candidate.reviewHash !== reviewHash
    || candidate.targetRoomId !== draft.input.roomId
    || candidate.targetRoomId === source.localOnlyRoomId
    || candidate.projectionId !== draft.input.projectionId
    || candidate.projectionId === source.projectionId
    || candidate.basisId !== draft.input.basisId
    || candidate.publicationAttestationId !== draft.input.publicationAttestationId
    || candidate.ownerDecisionId !== draft.input.ownerDecisionId
    || candidate.scheduledPublishedAt !== draft.input.publishedAt
    || candidate.freshUntil !== draft.input.freshUntil
    || candidate.expiresAt !== draft.input.expiresAt
    || Date.parse(candidate.scheduledPublishedAt as string) <= Date.parse(candidate.preparedAt as string)
    || Date.parse(candidate.scheduledPublishedAt as string) - Date.parse(candidate.preparedAt as string) > MAX_SCHEDULE_DELAY_MS
    || Date.parse(candidate.freshUntil as string) - Date.parse(candidate.scheduledPublishedAt as string) !== FRESH_MS
    || Date.parse(candidate.expiresAt as string) - Date.parse(candidate.scheduledPublishedAt as string) !== EXPIRES_MS
    || candidate.twinRevision !== draft.basis.twinRevision
    || candidate.twinRevisionHash !== draft.basis.twinRevisionHash
    || candidate.twinRevisionHash !== source.twinRevisionHash
    || candidate.workspaceContractHash !== draft.basis.workspaceContractHash
    || candidate.draftSha256 !== canonicalSha256(draft)
    || candidate.capsuleSha256 !== canonicalSha256(draft.capsule)
    || candidate.basisSha256 !== canonicalSha256(draft.basis)
    || candidate.payloadHash !== draft.capsule.payloadHash
    || candidate.basisHash !== canonicalSha256(draft.basis)
    || candidate.publicContentHash !== publicContentHash(draft.capsule)
    || candidate.publicContentHash !== source.publicContentHash
    || candidate.payloadHash === source.payloadHash
    || candidate.basisHash === source.basisHash
    || candidate.reviewHash === source.reviewHash
    || draft.basis.localReceiptId !== null
    || draft.basis.hostedReceiptId !== null
  ) throw new Error("Room handoff candidate binding mismatch");
  return Object.freeze({ ...structuredClone(candidate), source, draft }) as unknown as LocalRoomHandoffCandidateV1;
}

function validatePointer(value: unknown): LocalRoomHandoffCurrentPointerV1 {
  const pointer = record(value, "Room handoff current pointer");
  exactKeys(pointer, ["schemaVersion", "handoffId", "targetRoomId", "reviewHash", "twinRevisionHash"], "Room handoff current pointer");
  if (pointer.schemaVersion !== "local_room_handoff_current_pointer.v1" || typeof pointer.handoffId !== "string" || !HANDOFF_ID.test(pointer.handoffId)) {
    throw new Error("Room handoff current pointer is invalid");
  }
  opaqueId(pointer.targetRoomId, "room", "Room handoff pointer Room ID");
  sha(pointer.reviewHash, "Room handoff pointer review hash");
  sha(pointer.twinRevisionHash, "Room handoff pointer Twin hash");
  return structuredClone(pointer) as unknown as LocalRoomHandoffCurrentPointerV1;
}

function validateApproval(value: unknown): LocalRoomHandoffPublicationApprovalV1 {
  const approval = record(value, "Room handoff publication approval");
  exactKeys(approval, [
    "schemaVersion", "handoffId", "reviewHash", "sourceLocalApprovalId", "artifactApproval", "confirmationMethod",
    "sourceLocalApprovalReused", "contentPublicationApproved", "deliveryAuthorized", "roomMutationAuthorized", "localOnly",
  ], "Room handoff publication approval");
  if (
    approval.schemaVersion !== "local_room_handoff_publication_approval.v1"
    || typeof approval.handoffId !== "string" || !HANDOFF_ID.test(approval.handoffId)
    || approval.confirmationMethod !== "exact_hash_terminal_input"
    || approval.sourceLocalApprovalReused !== false
    || approval.contentPublicationApproved !== true
    || approval.deliveryAuthorized !== false
    || approval.roomMutationAuthorized !== false
    || approval.localOnly !== true
  ) throw new Error("Room handoff publication approval is invalid");
  sha(approval.reviewHash, "Room handoff approval review hash");
  opaqueId(approval.sourceLocalApprovalId, "approval", "Room handoff source approval ID");
  const artifactApproval = validateArtifactApprovalV1(approval.artifactApproval);
  return Object.freeze({ ...structuredClone(approval), artifactApproval }) as unknown as LocalRoomHandoffPublicationApprovalV1;
}

function validateReceipt(value: unknown): LocalRoomHandoffApprovalReceiptV1 {
  const receipt = record(value, "Room handoff approval receipt");
  exactKeys(receipt, [
    "schemaVersion", "receiptId", "approvalId", "handoffId", "reviewHash", "candidateSha256", "draftSha256",
    "artifactApprovalSha256", "approvalSha256", "twinRevisionHash", "approvedAt", "expiresAt",
    "roomMutationCalls", "networkCalls", "providerCalls", "hostBindingCalls", "publicationCalls",
    "sourceLocalApprovalReused", "contentPublicationApproved", "deliveryAuthorized", "roomMutationAuthorized", "localOnly",
  ], "Room handoff approval receipt");
  if (
    receipt.schemaVersion !== "local_room_handoff_approval_receipt.v1"
    || typeof receipt.handoffId !== "string" || !HANDOFF_ID.test(receipt.handoffId)
    || [receipt.roomMutationCalls, receipt.networkCalls, receipt.providerCalls, receipt.hostBindingCalls, receipt.publicationCalls].some((count) => count !== 0)
    || receipt.sourceLocalApprovalReused !== false
    || receipt.contentPublicationApproved !== true
    || receipt.deliveryAuthorized !== false
    || receipt.roomMutationAuthorized !== false
    || receipt.localOnly !== true
  ) throw new Error("Room handoff approval receipt is invalid");
  opaqueId(receipt.receiptId, "receipt", "Room handoff receipt ID");
  opaqueId(receipt.approvalId, "approval", "Room handoff approval ID");
  for (const key of ["reviewHash", "candidateSha256", "draftSha256", "artifactApprovalSha256", "approvalSha256", "twinRevisionHash"] as const) {
    sha(receipt[key], `Room handoff receipt ${key}`);
  }
  timestamp(receipt.approvedAt, "Room handoff receipt approvedAt");
  timestamp(receipt.expiresAt, "Room handoff receipt expiresAt");
  return structuredClone(receipt) as unknown as LocalRoomHandoffApprovalReceiptV1;
}

function candidatePath(paths: HandoffPaths, handoffId: string): string {
  if (!HANDOFF_ID.test(handoffId)) throw new Error("invalid Room handoff ID");
  return join(paths.candidates, `${handoffId}.json`);
}

function candidateStagePath(paths: HandoffPaths, handoffId: string): string {
  return join(paths.candidates, `.${handoffId}.json.stage`);
}

function approvalPath(paths: HandoffPaths, handoffId: string): string {
  if (!HANDOFF_ID.test(handoffId)) throw new Error("invalid Room handoff ID");
  return join(paths.approvals, handoffId);
}

function approvalStagePath(paths: HandoffPaths, handoffId: string): string {
  return join(paths.approvals, `.${handoffId}.stage`);
}

function exactDirectoryFiles(path: string, expected: readonly string[], label: string): void {
  assertDirectory0700(path, label);
  const actual = readdirSync(path).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((name, index) => name !== wanted[index])) {
    throw new Error(`${label} has an incomplete or unknown inventory`);
  }
}

function readCandidateFile(path: string): LocalRoomHandoffCandidateV1 {
  const candidate = validateCandidate(readCanonicalFile(path, "Room handoff candidate"));
  const name = basename(path);
  if (name !== `${candidate.handoffId}.json` && name !== `.${candidate.handoffId}.json.stage`) {
    throw new Error("Room handoff candidate filename does not bind its ID");
  }
  return candidate;
}

function readApprovalBundle(path: string, candidate: LocalRoomHandoffCandidateV1): LocalRoomHandoffApprovalBundle {
  exactDirectoryFiles(path, APPROVAL_FILES, "Room handoff approval bundle");
  const approval = validateApproval(readCanonicalFile(join(path, "approval.json"), "Room handoff publication approval"));
  const receipt = validateReceipt(readCanonicalFile(join(path, "receipt.json"), "Room handoff approval receipt"));
  const expectedApprovalId = deterministicId("approval", {
    schemaVersion: "local_room_handoff_publication_approval_id.v1",
    handoffId: candidate.handoffId,
    reviewHash: candidate.reviewHash,
  });
  const expectedOperationId = deterministicId("op", {
    schemaVersion: "local_room_handoff_publication_approval_operation.v1",
    handoffId: candidate.handoffId,
    reviewHash: candidate.reviewHash,
  });
  const expectedReceiptId = deterministicId("receipt", { approval, candidateSha256: canonicalSha256(candidate) });
  if (
    approval.handoffId !== candidate.handoffId
    || approval.reviewHash !== candidate.reviewHash
    || approval.sourceLocalApprovalId !== candidate.source.localContentApprovalId
    || approval.artifactApproval.approvalId !== expectedApprovalId
    || approval.artifactApproval.approvalId === candidate.source.localContentApprovalId
    || approval.artifactApproval.operationId !== expectedOperationId
    || approval.artifactApproval.artifactClass !== "projection"
    || approval.artifactApproval.artifactHash !== candidate.payloadHash
    || approval.artifactApproval.roomId !== candidate.targetRoomId
    || approval.artifactApproval.projectionId !== candidate.projectionId
    || approval.artifactApproval.interactionId !== null
    || approval.artifactApproval.basisHash !== candidate.basisHash
    || approval.artifactApproval.policyHash !== candidate.draft.basis.projectionPolicyHash
    || approval.artifactApproval.expiresAt !== candidate.expiresAt
    || Date.parse(approval.artifactApproval.approvedAt) < Date.parse(candidate.preparedAt)
    || Date.parse(approval.artifactApproval.approvedAt) > Date.parse(candidate.scheduledPublishedAt)
    || receipt.receiptId !== expectedReceiptId
    || receipt.approvalId !== approval.artifactApproval.approvalId
    || receipt.handoffId !== candidate.handoffId
    || receipt.reviewHash !== candidate.reviewHash
    || receipt.candidateSha256 !== canonicalSha256(candidate)
    || receipt.draftSha256 !== candidate.draftSha256
    || receipt.artifactApprovalSha256 !== canonicalSha256(approval.artifactApproval)
    || receipt.approvalSha256 !== canonicalSha256(approval)
    || receipt.twinRevisionHash !== candidate.twinRevisionHash
    || receipt.approvedAt !== approval.artifactApproval.approvedAt
    || receipt.expiresAt !== approval.artifactApproval.expiresAt
  ) throw new Error("Room handoff approval bundle binding mismatch");
  return Object.freeze({ approval, receipt });
}

function safeRemoveStageFile(path: string): void {
  if (!existsSync(path)) return;
  const stat = lstatSync(path, { bigint: false });
  const uid = ownedUid();
  if (
    !stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600
    || (uid !== undefined && stat.uid !== uid)
  ) throw new Error("Room handoff stage residue is not safely removable");
  unlinkSync(path);
  syncDirectory(dirname(path));
}

function safeRemoveApprovalStage(path: string): void {
  if (!existsSync(path)) return;
  assertDirectory0700(path, "Room handoff approval staging directory");
  const entries = readdirSync(path).sort();
  if (entries.some((name) => !APPROVAL_FILES.includes(name as (typeof APPROVAL_FILES)[number]))) {
    throw new Error("Room handoff approval stage has unknown residue");
  }
  for (const name of entries) safeRemoveStageFile(join(path, name));
  rmdirSync(path);
  syncDirectory(dirname(path));
}

function stageCandidate(paths: HandoffPaths, candidate: LocalRoomHandoffCandidateV1, faultAt?: LocalRoomHandoffPrepareFault): void {
  const stage = candidateStagePath(paths, candidate.handoffId);
  safeRemoveStageFile(stage);
  writeCanonicalExclusive(stage, candidate);
  syncDirectory(paths.candidates);
  readCandidateFile(stage);
  if (faultAt === "after_candidate_stage") throw new Error("injected failure after Room handoff candidate stage");
}

function promoteCandidate(paths: HandoffPaths, candidate: LocalRoomHandoffCandidateV1): LocalRoomHandoffCandidateV1 {
  const stage = candidateStagePath(paths, candidate.handoffId);
  const target = candidatePath(paths, candidate.handoffId);
  if (existsSync(target)) {
    const existing = readCandidateFile(target);
    if (canonicalJson(existing) !== canonicalJson(candidate)) throw new Error("immutable Room handoff candidate collision");
    if (existsSync(stage)) {
      const staged = readCandidateFile(stage);
      if (canonicalJson(staged) !== canonicalJson(existing)) throw new Error("immutable Room handoff candidate stage collision");
      safeRemoveStageFile(stage);
    }
    return existing;
  }
  const staged = readCandidateFile(stage);
  if (canonicalJson(staged) !== canonicalJson(candidate)) throw new Error("Room handoff candidate stage drifted");
  renameSync(stage, target);
  syncDirectory(paths.candidates);
  return readCandidateFile(target);
}

function writeCurrentStage(paths: HandoffPaths, pointer: LocalRoomHandoffCurrentPointerV1): void {
  if (existsSync(paths.currentStage)) {
    const staged = validatePointer(readCanonicalFile(paths.currentStage, "Room handoff current pointer stage"));
    if (canonicalJson(staged) === canonicalJson(pointer)) return;
    safeRemoveStageFile(paths.currentStage);
  }
  writeCanonicalExclusive(paths.currentStage, pointer);
  syncDirectory(paths.root);
}

function promoteCurrent(paths: HandoffPaths): LocalRoomHandoffCurrentPointerV1 {
  const staged = validatePointer(readCanonicalFile(paths.currentStage, "Room handoff current pointer stage"));
  const candidate = readCandidateFile(candidatePath(paths, staged.handoffId));
  if (
    staged.reviewHash !== candidate.reviewHash
    || staged.targetRoomId !== candidate.targetRoomId
    || staged.twinRevisionHash !== candidate.twinRevisionHash
  ) throw new Error("Room handoff current pointer stage binding mismatch");
  renameSync(paths.currentStage, paths.current);
  syncDirectory(paths.root);
  return validatePointer(readCanonicalFile(paths.current, "Room handoff current pointer"));
}

function stageApproval(paths: HandoffPaths, bundle: LocalRoomHandoffApprovalBundle, faultAt?: LocalRoomHandoffApprovalFault): void {
  const stage = approvalStagePath(paths, bundle.approval.handoffId);
  safeRemoveApprovalStage(stage);
  mkdirSync(stage, { mode: 0o700 });
  syncDirectory(paths.approvals);
  writeCanonicalExclusive(join(stage, "approval.json"), bundle.approval);
  if (faultAt === "after_approval_file") throw new Error("injected failure after Room handoff approval file");
  writeCanonicalExclusive(join(stage, "receipt.json"), bundle.receipt);
  syncDirectory(stage);
  if (faultAt === "after_approval_stage") throw new Error("injected failure after Room handoff approval stage");
}

function promoteApproval(paths: HandoffPaths, candidate: LocalRoomHandoffCandidateV1, expected?: LocalRoomHandoffApprovalBundle): LocalRoomHandoffApprovalBundle {
  const stage = approvalStagePath(paths, candidate.handoffId);
  const target = approvalPath(paths, candidate.handoffId);
  if (existsSync(target)) {
    const existing = readApprovalBundle(target, candidate);
    if (expected && canonicalJson(existing) !== canonicalJson(expected)) throw new Error("immutable Room handoff approval collision");
    if (existsSync(stage)) {
      const staged = readApprovalBundle(stage, candidate);
      if (canonicalJson(staged) !== canonicalJson(existing)) throw new Error("immutable Room handoff approval stage collision");
      safeRemoveApprovalStage(stage);
    }
    return existing;
  }
  const staged = readApprovalBundle(stage, candidate);
  if (expected && canonicalJson(staged) !== canonicalJson(expected)) throw new Error("Room handoff approval stage drifted");
  renameSync(stage, target);
  syncDirectory(paths.approvals);
  return readApprovalBundle(target, candidate);
}

function recoverStages(paths: HandoffPaths): void {
  const candidateStages = readdirSync(paths.candidates).filter((name) => /^\.handoff_[a-f0-9]{32}\.json\.stage$/u.test(name));
  if (candidateStages.length > 1) throw new Error("multiple unfinished Room handoff candidates require Owner review");
  for (const name of candidateStages) {
    const stage = join(paths.candidates, name);
    let candidate: LocalRoomHandoffCandidateV1;
    try { candidate = readCandidateFile(stage); } catch {
      safeRemoveStageFile(stage);
      continue;
    }
    promoteCandidate(paths, candidate);
    if (!existsSync(paths.currentStage)) {
      writeCurrentStage(paths, {
        schemaVersion: "local_room_handoff_current_pointer.v1",
        handoffId: candidate.handoffId,
        targetRoomId: candidate.targetRoomId,
        reviewHash: candidate.reviewHash,
        twinRevisionHash: candidate.twinRevisionHash,
      });
    }
  }
  if (existsSync(paths.currentStage)) promoteCurrent(paths);
  const approvalStages = readdirSync(paths.approvals).filter((name) => /^\.handoff_[a-f0-9]{32}\.stage$/u.test(name));
  for (const name of approvalStages) {
    const stage = join(paths.approvals, name);
    const entries = readdirSync(stage).sort();
    if (entries.length !== APPROVAL_FILES.length || entries.some((entry, index) => entry !== [...APPROVAL_FILES].sort()[index])) {
      safeRemoveApprovalStage(stage);
      continue;
    }
    const handoffId = name.slice(1, -".stage".length);
    const candidate = readCandidateFile(candidatePath(paths, handoffId));
    promoteApproval(paths, candidate);
  }
}

function currentCandidate(paths: HandoffPaths): LocalRoomHandoffCandidateV1 {
  if (!existsSync(paths.current)) throw new Error("no Room-bound Projection handoff; prepare one first");
  const pointer = validatePointer(readCanonicalFile(paths.current, "Room handoff current pointer"));
  const candidate = readCandidateFile(candidatePath(paths, pointer.handoffId));
  if (
    pointer.reviewHash !== candidate.reviewHash
    || pointer.targetRoomId !== candidate.targetRoomId
    || pointer.twinRevisionHash !== candidate.twinRevisionHash
  ) throw new Error("Room handoff current pointer binding mismatch");
  return candidate;
}

function currentApproval(paths: HandoffPaths, candidate: LocalRoomHandoffCandidateV1): LocalRoomHandoffApprovalBundle | null {
  const path = approvalPath(paths, candidate.handoffId);
  return existsSync(path) ? readApprovalBundle(path, candidate) : null;
}

export function assertPublishableLocalProjectionSourceReview(reviewHash: string): void {
  sha(reviewHash, "Local Projection source review hash");
  if (reviewHash === NON_PUBLISHABLE_HISTORICAL_SOURCE_REVIEW_SHA256) {
    throw new Error("Room handoff denied: non-publishable historical source");
  }
}

function sourceBinding(view: LocalProjectionReviewView): LocalRoomHandoffSourceV1 {
  if (view.status !== "APPROVED_CURRENT" || view.approval === null) {
    throw new Error("Room handoff source must be #66 APPROVED_CURRENT");
  }
  assertPublishableLocalProjectionSourceReview(view.candidate.manifest.reviewHash);
  return {
    schemaVersion: "local_room_handoff_source.v1",
    candidateId: view.candidate.manifest.candidateId,
    reviewHash: view.candidate.manifest.reviewHash,
    localOnlyRoomId: view.candidate.manifest.roomId,
    projectionId: view.candidate.manifest.projectionId,
    payloadHash: view.candidate.manifest.payloadHash,
    basisHash: view.candidate.manifest.basisHash,
    profileInputSha256: view.candidate.manifest.profileInputSha256,
    localContentApprovalId: view.approval.approval.approvalId,
    localContentApprovalSha256: canonicalSha256(view.approval.approval),
    localContentApprovalReceiptId: view.approval.receipt.receiptId,
    localContentApprovalReceiptSha256: canonicalSha256(view.approval.receipt),
    twinRevisionHash: view.candidate.manifest.twinRevisionHash,
    publicContentHash: publicContentHash(view.candidate.capsule),
    localContentApprovalReusable: false,
  };
}

function matchingSource(view: LocalProjectionReviewView, expected: LocalRoomHandoffSourceV1): boolean {
  if (view.approval === null) return false;
  const actual = {
    schemaVersion: "local_room_handoff_source.v1",
    candidateId: view.candidate.manifest.candidateId,
    reviewHash: view.candidate.manifest.reviewHash,
    localOnlyRoomId: view.candidate.manifest.roomId,
    projectionId: view.candidate.manifest.projectionId,
    payloadHash: view.candidate.manifest.payloadHash,
    basisHash: view.candidate.manifest.basisHash,
    profileInputSha256: view.candidate.manifest.profileInputSha256,
    localContentApprovalId: view.approval.approval.approvalId,
    localContentApprovalSha256: canonicalSha256(view.approval.approval),
    localContentApprovalReceiptId: view.approval.receipt.receiptId,
    localContentApprovalReceiptSha256: canonicalSha256(view.approval.receipt),
    twinRevisionHash: view.candidate.manifest.twinRevisionHash,
    publicContentHash: publicContentHash(view.candidate.capsule),
    localContentApprovalReusable: false,
  } satisfies LocalRoomHandoffSourceV1;
  return canonicalJson(actual) === canonicalJson(expected);
}

function reviewStatus(
  candidate: LocalRoomHandoffCandidateV1,
  approval: LocalRoomHandoffApprovalBundle | null,
  source: LocalProjectionReviewView,
  currentTwinHash: Sha256,
  now: Date,
): LocalRoomHandoffReviewStatus {
  const approved = approval !== null;
  if (now.getTime() >= Date.parse(candidate.expiresAt)) return approved ? "APPROVED_EXPIRED" : "EXPIRED";
  if (currentTwinHash !== candidate.twinRevisionHash) return approved ? "APPROVED_STALE_TWIN" : "STALE_TWIN";
  if (now.getTime() < Date.parse(candidate.preparedAt)) return approved ? "APPROVED_NOT_YET_VALID" : "NOT_YET_VALID";
  if (now.getTime() >= Date.parse(candidate.freshUntil)) return approved ? "APPROVED_STALE_TIME" : "STALE_TIME";
  if (!approved && now.getTime() > Date.parse(candidate.scheduledPublishedAt)) return "PUBLICATION_WINDOW_CLOSED";
  if (!matchingSource(source, candidate.source) || (!approved && source.status !== "APPROVED_CURRENT")) {
    return approved ? "APPROVED_STALE_SOURCE" : "STALE_SOURCE";
  }
  return approved ? "APPROVED_CURRENT" : "READY_FOR_OWNER_REVIEW";
}

function visible(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function renderPreview(candidate: LocalRoomHandoffCandidateV1, approval: LocalRoomHandoffApprovalBundle | null, status: LocalRoomHandoffReviewStatus): string {
  const lines = [
    "# Forme Room-bound Projection Publication Review",
    "",
    "LOCAL CEREMONY ONLY — NO DELIVERY — NO ROOM MUTATION — NOT PUBLISHED",
    `Status: ${status}`,
    `Source #66 review: ${candidate.source.reviewHash}`,
    `Target Room: ${candidate.targetRoomId}`,
    `New Projection: ${candidate.projectionId}`,
    `Publication review hash: ${candidate.reviewHash}`,
    `Payload hash: ${candidate.payloadHash}`,
    `Basis hash: ${candidate.basisHash}`,
    `Scheduled publication: ${candidate.scheduledPublishedAt}`,
    `Fresh until: ${candidate.freshUntil}`,
    `Expires at: ${candidate.expiresAt}`,
    "",
    `## ${visible(candidate.draft.capsule.title)}`,
    "",
    visible(candidate.draft.capsule.thirdPlaceSummary),
    "",
  ];
  for (const slot of ["becoming", "now", "nextMove", "tensions", "openTo"] as const) {
    const label = slot === "becoming" ? "Vision & Becoming" : slot === "nextMove" ? "Next Move" : slot === "openTo" ? "Open To" : `${slot[0]?.toUpperCase()}${slot.slice(1)}`;
    lines.push(`### ${label}`, "");
    for (const claim of candidate.draft.capsule.claims.filter((item) => item.slot === slot)) lines.push(`- ${visible(claim.text)}`);
    lines.push("");
  }
  lines.push(
    "### Boundary",
    "",
    `- ${visible(candidate.draft.capsule.agencyStatement)}`,
    `- ${visible(candidate.draft.capsule.nonCommitmentStatement)}`,
    `- Supported interactions: ${candidate.draft.capsule.supportedInteractions.map(visible).join(", ")}`,
    `- Expected response latency: ${visible(candidate.draft.capsule.expectedResponseLatency)}`,
  );
  for (const topic of candidate.draft.capsule.allowedTopics) lines.push(`- Allowed topic: ${visible(topic)}`);
  for (const topic of candidate.draft.capsule.unavailableTopics) lines.push(`- Unavailable: ${visible(topic)}`);
  lines.push(
    "",
    "### Exact publication-review envelope bytes",
    "",
    canonicalJson(exactReviewEnvelope(candidate)),
    "",
    "The #66 local approval is provenance only and is explicitly not reused as publication authority.",
    "This ceremony approves exact content for a possible future delivery; it does not authorize or call any Room.",
    "",
  );
  if (approval) {
    lines.push(
      "Exact publication content approved locally; delivery remains unauthorized.",
      `Approval receipt: ${approval.receipt.receiptId}`,
    );
  } else if (status === "READY_FOR_OWNER_REVIEW") {
    lines.push(
      "To approve these exact Room-bound bytes, enter:",
      `APPROVE PUBLICATION ${candidate.reviewHash}`,
    );
  } else {
    lines.push("This candidate cannot be approved. Prepare again from the current approved #66 Projection and exact current Twin.");
  }
  return `${lines.join("\n")}\n`;
}

function buildView(workspaceRoot: string, paths: HandoffPaths, now: Date): LocalRoomHandoffReviewView {
  const candidate = currentCandidate(paths);
  const approval = currentApproval(paths, candidate);
  const source = previewLocalProjection({ workspaceRoot, now });
  const twin = readVerifiedCurrentTwin(workspaceRoot);
  if (twin.twinRevisionHash === candidate.twinRevisionHash) {
    const rebuilt = compileProjectionDraft({
      revision: twin.revision,
      twinRevisionHash: twin.twinRevisionHash,
      draft: candidate.draft.input,
    });
    if (
      rebuilt.inputHash !== candidate.draft.inputHash
      || canonicalJson(rebuilt.capsule) !== canonicalJson(candidate.draft.capsule)
      || canonicalJson(rebuilt.basis) !== canonicalJson(candidate.draft.basis)
    ) throw new Error("Room handoff candidate no longer recompiles from its exact Twin basis");
  }
  const status = reviewStatus(candidate, approval, source, twin.twinRevisionHash, now);
  return Object.freeze({ candidate, approval, status, preview: renderPreview(candidate, approval, status) });
}

function buildCandidate(
  workspaceRoot: string,
  targetRoomId: string,
  now: Date,
  scheduledPublishedAtValue: Date,
): LocalRoomHandoffCandidateV1 {
  opaqueId(targetRoomId, "room", "Target Room ID");
  const sourceView = previewLocalProjection({ workspaceRoot, now });
  const source = sourceBinding(sourceView);
  const sourceApproval = sourceView.approval;
  if (sourceApproval === null) throw new Error("Room handoff source approval disappeared");
  if (now.getTime() < Date.parse(sourceApproval.approval.approvedAt)) {
    throw new Error("Room handoff preparation cannot precede the #66 content approval");
  }
  if (targetRoomId === sourceView.candidate.capsule.roomId) {
    throw new Error("Room handoff target must replace the #66 local-only Room binding");
  }
  const twin = readVerifiedCurrentTwin(workspaceRoot);
  if (twin.twinRevisionHash !== source.twinRevisionHash) throw new Error("Room handoff source is not the exact current Twin");
  const sourceCompiled = compileLocalProjectionProfile({
    revision: twin.revision,
    twinRevisionHash: twin.twinRevisionHash,
    profile: sourceView.candidate.input,
  });
  if (
    canonicalJson(sourceCompiled.capsule) !== canonicalJson(sourceView.candidate.capsule)
    || canonicalJson(sourceCompiled.basis) !== canonicalJson(sourceView.candidate.basis)
    || sourceCompiled.profileInputHash !== sourceView.candidate.manifest.profileInputHash
  ) throw new Error("#66 source no longer recompiles from the exact current Twin");
  const preparedAt = now.toISOString();
  const scheduledPublishedAt = scheduledPublishedAtValue.toISOString();
  const freshUntil = new Date(scheduledPublishedAtValue.getTime() + FRESH_MS).toISOString();
  const expiresAt = new Date(scheduledPublishedAtValue.getTime() + EXPIRES_MS).toISOString();
  const policy = {
    schemaVersion: "r4.local-room-handoff-policy.v1",
    audience: "public_single",
    sourceReviewHash: source.reviewHash,
    sourceLocalContentApprovalSha256: source.localContentApprovalSha256,
    targetRoomId,
    scheduledPublishedAt,
    projectionFreshnessMilliseconds: FRESH_MS,
    projectionLifetimeMilliseconds: EXPIRES_MS,
    exactOwnerPublicationApprovalRequired: true,
    sourceLocalApprovalReusable: false,
    deliveryAuthorized: false,
    roomMutationAuthorized: false,
    networkAllowed: false,
    providerAllowed: false,
    hostBindingAllowed: false,
  } as const;
  const policyHash = canonicalSha256(policy);
  const seed = {
    schemaVersion: "r4.local-room-handoff-seed.v1",
    source,
    targetRoomId,
    preparedAt,
    scheduledPublishedAt,
    freshUntil,
    expiresAt,
    policyHash,
  };
  const compiled = compileProjectionDraft({
    revision: twin.revision,
    twinRevisionHash: twin.twinRevisionHash,
    draft: {
      ...structuredClone(sourceCompiled.input),
      roomId: targetRoomId,
      projectionId: deterministicId("proj", { seed, role: "room-bound-projection" }),
      basisId: deterministicId("basis", { seed, role: "room-bound-basis" }),
      publicationAttestationId: deterministicId("att", { seed, role: "future-publication-attestation" }),
      ownerDecisionId: deterministicId("decision", { seed, role: "publication-content-decision" }),
      projectionPolicyGeneration: sourceCompiled.input.projectionPolicyGeneration + 1,
      projectionPolicyHash: policyHash,
      publishedAt: scheduledPublishedAt,
      freshUntil,
      expiresAt,
    },
  });
  const draft = compiledDraftRecord(compiled);
  const targetContentHash = publicContentHash(compiled.capsule);
  if (
    targetContentHash !== source.publicContentHash
    || canonicalJson(compiled.capsule.claims) !== canonicalJson(sourceView.candidate.capsule.claims)
    || canonicalJson(compiled.basis.claims) !== canonicalJson(sourceView.candidate.basis.claims)
  ) throw new Error("Room rebinding changed the #66-approved public wording or causal basis");
  const reviewSeed = {
    source,
    targetRoomId,
    draft,
    sourceLocalApprovalReused: false as const,
    deliveryAuthorized: false as const,
    roomMutationAuthorized: false as const,
  };
  const reviewHash = canonicalSha256(exactReviewEnvelope(reviewSeed));
  const candidate: LocalRoomHandoffCandidateV1 = {
    schemaVersion: "local_room_handoff_candidate.v1",
    handoffId: `handoff_${reviewHash.slice("sha256:".length, "sha256:".length + 32)}`,
    source,
    targetRoomId,
    projectionId: compiled.input.projectionId,
    basisId: compiled.input.basisId,
    publicationAttestationId: compiled.input.publicationAttestationId,
    ownerDecisionId: compiled.input.ownerDecisionId,
    preparedAt,
    scheduledPublishedAt,
    freshUntil,
    expiresAt,
    twinRevision: compiled.basis.twinRevision,
    twinRevisionHash: compiled.basis.twinRevisionHash,
    workspaceContractHash: compiled.basis.workspaceContractHash,
    draftSha256: canonicalSha256(draft),
    capsuleSha256: canonicalSha256(compiled.capsule),
    basisSha256: canonicalSha256(compiled.basis),
    payloadHash: compiled.capsule.payloadHash,
    basisHash: canonicalSha256(compiled.basis),
    publicContentHash: targetContentHash,
    reviewHash,
    draft,
    sourceLocalApprovalReused: false,
    contentPublicationApproved: false,
    deliveryAuthorized: false,
    roomMutationAuthorized: false,
    localOnly: true,
  };
  if (
    candidate.projectionId === source.projectionId
    || candidate.payloadHash === source.payloadHash
    || candidate.basisHash === source.basisHash
    || candidate.reviewHash === source.reviewHash
  ) throw new Error("Room handoff did not create a distinct publication candidate");
  return validateCandidate(candidate);
}

export function prepareLocalRoomHandoff(input: {
  workspaceRoot: string;
  targetRoomId: string;
  scheduledPublishedAt: Date;
  now?: Date;
  faultAt?: LocalRoomHandoffPrepareFault;
}): LocalRoomHandoffReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Room handoff preparation time is invalid");
  if (!(input.scheduledPublishedAt instanceof Date) || !Number.isFinite(input.scheduledPublishedAt.getTime())) {
    throw new Error("Room handoff scheduled publication time must be an exact Date");
  }
  const scheduleDelay = input.scheduledPublishedAt.getTime() - now.getTime();
  if (scheduleDelay <= 0 || scheduleDelay > MAX_SCHEDULE_DELAY_MS) {
    throw new Error("Room handoff scheduled publication must be in the future and no more than 24 hours after preparation");
  }
  return withLock(workspaceRoot, (paths) => {
    recoverStages(paths);
    const source = sourceBinding(previewLocalProjection({ workspaceRoot, now }));
    if (existsSync(paths.current)) {
      const existing = currentCandidate(paths);
      if (
        existing.targetRoomId === input.targetRoomId
        && existing.scheduledPublishedAt === input.scheduledPublishedAt.toISOString()
        && canonicalJson(existing.source) === canonicalJson(source)
        && now.getTime() >= Date.parse(existing.preparedAt)
        && now.getTime() < Date.parse(existing.freshUntil)
      ) return buildView(workspaceRoot, paths, now);
    }
    const candidate = buildCandidate(workspaceRoot, input.targetRoomId, now, input.scheduledPublishedAt);
    const target = candidatePath(paths, candidate.handoffId);
    if (existsSync(target)) {
      const existing = readCandidateFile(target);
      if (canonicalJson(existing) !== canonicalJson(candidate)) throw new Error("immutable Room handoff candidate collision");
    } else {
      stageCandidate(paths, candidate, input.faultAt);
    }
    const pointer: LocalRoomHandoffCurrentPointerV1 = {
      schemaVersion: "local_room_handoff_current_pointer.v1",
      handoffId: candidate.handoffId,
      targetRoomId: candidate.targetRoomId,
      reviewHash: candidate.reviewHash,
      twinRevisionHash: candidate.twinRevisionHash,
    };
    writeCurrentStage(paths, pointer);
    if (input.faultAt === "after_current_stage") throw new Error("injected failure after Room handoff current pointer stage");
    if (!existsSync(target)) promoteCandidate(paths, candidate);
    if (input.faultAt === "after_candidate_commit") throw new Error("injected failure after Room handoff candidate commit");
    promoteCurrent(paths);
    if (input.faultAt === "after_current_commit") throw new Error("injected failure after Room handoff current pointer commit");
    return buildView(workspaceRoot, paths, now);
  });
}

export function previewLocalRoomHandoff(input: { workspaceRoot: string; now?: Date }): LocalRoomHandoffReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const paths = verifyRoot(workspaceRoot);
  if (existsSync(paths.recoveryLock)) {
    const lock = readLock(paths.recoveryLock);
    throw new Error(`Room handoff recovery is incomplete; recover with exact lock PID ${lock.pid}`);
  }
  if (existsSync(paths.lock)) {
    const lock = readLock(paths.lock);
    throw new Error(pidAlive(lock.pid)
      ? `another Room handoff review operation is active (pid ${lock.pid})`
      : `Room handoff review stopped unexpectedly; recover with exact lock PID ${lock.pid}`);
  }
  const stages = existsSync(paths.currentStage)
    || readdirSync(paths.candidates).some((name) => name.endsWith(".stage"))
    || readdirSync(paths.approvals).some((name) => name.endsWith(".stage"));
  if (stages) throw new Error("Room handoff review has an unfinished write; rerun prepare/approve or recover explicitly");
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Room handoff preview time is invalid");
  return buildView(workspaceRoot, paths, now);
}

export function approveLocalRoomHandoff(input: {
  workspaceRoot: string;
  confirmation: string;
  now?: Date;
  faultAt?: LocalRoomHandoffApprovalFault;
}): LocalRoomHandoffReviewView {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Room handoff approval time is invalid");
  return withLock(workspaceRoot, (paths) => {
    recoverStages(paths);
    const candidate = currentCandidate(paths);
    const expected = `APPROVE PUBLICATION ${candidate.reviewHash}`;
    if (input.confirmation !== expected) throw new Error("Owner confirmation must match the exact displayed publication review hash");
    const before = buildView(workspaceRoot, paths, now);
    if (before.status === "APPROVED_CURRENT") return before;
    if (before.status !== "READY_FOR_OWNER_REVIEW") throw new Error(`Room handoff is not approvable:${before.status}`);
    const approvalId = deterministicId("approval", {
      schemaVersion: "local_room_handoff_publication_approval_id.v1",
      handoffId: candidate.handoffId,
      reviewHash: candidate.reviewHash,
    });
    if (approvalId === candidate.source.localContentApprovalId) throw new Error("#66 local approval cannot be reused for publication");
    const operationId = deterministicId("op", {
      schemaVersion: "local_room_handoff_publication_approval_operation.v1",
      handoffId: candidate.handoffId,
      reviewHash: candidate.reviewHash,
    });
    const reviewed = approveProjectionExact({
      draft: asCompiledDraft(candidate.draft),
      expectedPayloadHash: candidate.payloadHash,
      expectedBasisHash: candidate.basisHash,
      ownerPresenceConfirmed: true,
      approvalId,
      operationId,
      approvedAt: now.toISOString(),
      expiresAt: candidate.expiresAt,
    });
    const approval: LocalRoomHandoffPublicationApprovalV1 = {
      schemaVersion: "local_room_handoff_publication_approval.v1",
      handoffId: candidate.handoffId,
      reviewHash: candidate.reviewHash,
      sourceLocalApprovalId: candidate.source.localContentApprovalId,
      artifactApproval: reviewed.approval,
      confirmationMethod: "exact_hash_terminal_input",
      sourceLocalApprovalReused: false,
      contentPublicationApproved: true,
      deliveryAuthorized: false,
      roomMutationAuthorized: false,
      localOnly: true,
    };
    const receipt: LocalRoomHandoffApprovalReceiptV1 = {
      schemaVersion: "local_room_handoff_approval_receipt.v1",
      receiptId: deterministicId("receipt", { approval, candidateSha256: canonicalSha256(candidate) }),
      approvalId,
      handoffId: candidate.handoffId,
      reviewHash: candidate.reviewHash,
      candidateSha256: canonicalSha256(candidate),
      draftSha256: candidate.draftSha256,
      artifactApprovalSha256: canonicalSha256(reviewed.approval),
      approvalSha256: canonicalSha256(approval),
      twinRevisionHash: candidate.twinRevisionHash,
      approvedAt: reviewed.approval.approvedAt,
      expiresAt: reviewed.approval.expiresAt,
      roomMutationCalls: 0,
      networkCalls: 0,
      providerCalls: 0,
      hostBindingCalls: 0,
      publicationCalls: 0,
      sourceLocalApprovalReused: false,
      contentPublicationApproved: true,
      deliveryAuthorized: false,
      roomMutationAuthorized: false,
      localOnly: true,
    };
    const bundle = Object.freeze({ approval, receipt });
    stageApproval(paths, bundle, input.faultAt);
    promoteApproval(paths, candidate, bundle);
    if (input.faultAt === "after_approval_commit") throw new Error("injected failure after Room handoff approval commit");
    return buildView(workspaceRoot, paths, now);
  });
}

export function recoverLocalRoomHandoff(input: {
  workspaceRoot: string;
  expectedLockPid: number;
  now?: Date;
}): LocalRoomHandoffReviewView | null {
  const workspaceRoot = canonicalWorkspaceRoot(input.workspaceRoot);
  const paths = verifyRoot(workspaceRoot);
  if (!Number.isSafeInteger(input.expectedLockPid) || input.expectedLockPid <= 0) {
    throw new Error("Room handoff recovery requires the exact positive lock PID");
  }
  let anchor: ReturnType<typeof readLock>;
  if (existsSync(paths.recoveryLock)) {
    anchor = readLock(paths.recoveryLock);
    if (anchor.pid !== input.expectedLockPid) throw new Error("Room handoff recovery PID does not match the anchored stale lock");
  } else {
    if (!existsSync(paths.lock)) throw new Error("Room handoff review has no stale lock to recover");
    const stale = readLock(paths.lock);
    if (stale.pid !== input.expectedLockPid) throw new Error("Room handoff recovery PID does not match the stale lock");
    if (pidAlive(stale.pid)) throw new Error("Room handoff lock process is still active");
    linkSync(paths.lock, paths.recoveryLock);
    syncDirectory(paths.root);
    anchor = readLock(paths.recoveryLock);
    if (!sameLock(anchor, readLock(paths.lock))) throw new Error("Room handoff recovery anchor does not bind the stale lock");
  }
  if (pidAlive(anchor.pid)) throw new Error("Room handoff recovery lock process is still active");
  if (existsSync(paths.lock)) {
    const current = readLock(paths.lock);
    if (!sameLock(anchor, current) && pidAlive(current.pid)) throw new Error("a live Room handoff operation started during recovery");
    unlinkSync(paths.lock);
    syncDirectory(paths.root);
  }
  writeLock(paths.lock, paths.root, process.pid);
  try {
    recoverStages(paths);
    return existsSync(paths.current) ? buildView(workspaceRoot, paths, input.now ?? new Date()) : null;
  } finally {
    if (existsSync(paths.lock)) {
      const current = readLock(paths.lock);
      if (current.pid !== process.pid) throw new Error("Room handoff recovery lock identity changed");
      unlinkSync(paths.lock);
      syncDirectory(paths.root);
    }
    if (existsSync(paths.recoveryLock)) {
      const retained = readLock(paths.recoveryLock);
      if (!sameLock(anchor, retained)) throw new Error("Room handoff recovery anchor identity changed");
      unlinkSync(paths.recoveryLock);
      syncDirectory(paths.root);
    }
  }
}
