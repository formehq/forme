import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  HostedRoomApplication,
  isSemanticError,
  SemanticError,
  type OperationResponse,
} from "../../../apps/room/src/application.ts";
import { coreOperationDefinition } from "../../../apps/room/src/core-policy.ts";
import {
  SYNTHETIC_DEFAULT_ENTITY_ID,
  SyntheticPresenceStore,
} from "../../../apps/room/src/store.ts";
import { SYNTHETIC_PUBLIC_ROOM_ID } from "../../../apps/room/src/synthetic-fixtures.ts";
import {
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  validateArtifactApprovalV1,
  validateHostedPublicationDeliveryV1,
} from "../../r4-protocol/src/index.ts";
import {
  parseCoreRoomApiSecureInput,
  type CoreRoomApiSecureInputV1,
} from "./hosted-room-api.ts";
import {
  ProtectedRoomLock,
  type LockLease,
  type LockRecord,
} from "./lock.ts";
import type {
  LocalRoomHandoffApprovalBundle,
  LocalRoomHandoffCandidateV1,
} from "./projection-room-handoff.ts";

export const OFFLINE_ROOM_REHEARSAL_JOURNAL_FILENAME = "offline-room-rehearsal.journal.json";

export const OFFLINE_ROOM_REHEARSAL_MUTATIONS = [
  "room_operator.projection.deliver",
  "curation.admit",
  "public_encounter.issue",
  "interaction.create",
  "room_operator.pull",
] as const;

export const OFFLINE_ROOM_REHEARSAL_READS = [
  "third_place.list",
  "projection.read",
] as const;

export type OfflineRoomRehearsalMutation = typeof OFFLINE_ROOM_REHEARSAL_MUTATIONS[number];
export type OfflineRoomRehearsalRead = typeof OFFLINE_ROOM_REHEARSAL_READS[number];
export type OfflineRoomRehearsalFault =
  | "pending-before-call"
  | "after-call-before-commit"
  | "after-commit"
  | "journal-write-before-rename";

export interface OfflineRoomRehearsalEffects {
  readonly networkCalls: 0;
  readonly modelCalls: 0;
  readonly providerCalls: 0;
  readonly externalPublicationCalls: 0;
  readonly inProcessCoreCalls: number;
}

export interface OfflineRoomRehearsalJournalEntrySummary {
  readonly ordinal: number;
  readonly action: OfflineRoomRehearsalMutation;
  readonly state: "pending" | "committed" | "rejected";
  readonly storageClass: "canonical_public" | "aes_256_gcm";
  readonly requestHash: `sha256:${string}`;
  readonly responseHash: `sha256:${string}` | null;
  readonly rejection: Readonly<{ status: number; code: string }> | null;
  readonly projectionLogicalRehearsalPermitId: string | null;
}

export interface OfflineRoomRehearsalSummary {
  readonly schemaVersion: "offline_room_rehearsal_summary.v1";
  readonly rehearsalOnly: true;
  readonly networkPolicy: "deny_external";
  readonly productionFallbackAllowed: false;
  readonly clock: string;
  readonly seedEntityId: string;
  readonly walkingSliceId: string;
  readonly revision: number;
  readonly distinctProjectionLogicalExecutions: 0 | 1;
  readonly entries: readonly OfflineRoomRehearsalJournalEntrySummary[];
}

export interface OfflineProjectionLogicalRehearsalPermitV1 {
  readonly schemaVersion: "offline_projection_logical_rehearsal_permit.v1";
  readonly permitId: string;
  readonly walkingSliceId: string;
  readonly exactRequestHash: `sha256:${string}`;
  readonly handoffId: string;
  readonly handoffReviewHash: `sha256:${string}`;
  readonly handoffCandidateSha256: `sha256:${string}`;
  readonly handoffPublicationApprovalSha256: `sha256:${string}`;
  readonly artifactApprovalId: string;
  readonly artifactApprovalSha256: `sha256:${string}`;
  readonly approvalReceiptId: string;
  readonly approvalReceiptSha256: `sha256:${string}`;
  readonly authorityMeaning: "logical_rehearsal_only_not_owner_or_delivery_authority";
  readonly rehearsalOnly: true;
  readonly syntheticInProcessOnly: true;
  readonly externalPublicationAllowed: false;
  readonly maximumDistinctLogicalExecutions: 1;
}

/** Legacy compile-only shape; mutate() never accepts it. */
export interface OfflineRoomRehearsalWriterRecoveryV1 {
  readonly schemaVersion: "offline_room_rehearsal_writer_recovery.v1";
  readonly roomId: string;
  readonly operationClass: "room_reconcile";
  readonly processId: number;
  readonly bootId: string;
  readonly startedAt: string;
  readonly nonce: string;
}

export class OfflineRoomRehearsalInjectedCrash extends Error {
  readonly fault: OfflineRoomRehearsalFault;

  constructor(fault: OfflineRoomRehearsalFault) {
    super("OFFLINE_ROOM_REHEARSAL_INJECTED_CRASH");
    this.name = "OfflineRoomRehearsalInjectedCrash";
    this.fault = fault;
  }
}

type Sha256 = `sha256:${string}`;
type EntryState = "pending" | "committed" | "rejected";

interface MutationEnvelope {
  readonly action: OfflineRoomRehearsalMutation;
  readonly input: CoreRoomApiSecureInputV1;
}

interface PublicPayload {
  readonly storageClass: "canonical_public";
  readonly envelope: MutationEnvelope;
}

interface EncryptedPayload {
  readonly storageClass: "aes_256_gcm";
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
  readonly aadHash: Sha256;
}

type StoredPayload = PublicPayload | EncryptedPayload;

interface JournalEntry {
  readonly schemaVersion: "offline_room_operation.v1";
  readonly ordinal: number;
  readonly action: OfflineRoomRehearsalMutation;
  readonly requestHash: Sha256;
  readonly startedAt: string;
  state: EntryState;
  readonly payload: StoredPayload;
  readonly projectionLogicalRehearsalPermit: OfflineProjectionLogicalRehearsalPermitV1 | null;
  responseHash: Sha256 | null;
  rejection: { status: number; code: string } | null;
}

interface JournalDocument {
  readonly schemaVersion: "offline_room_rehearsal_journal.v1";
  readonly rehearsalOnly: true;
  readonly networkPolicy: "deny_external";
  readonly productionFallbackAllowed: false;
  readonly clock: string;
  readonly seedEntityId: string;
  readonly walkingSliceId: string;
  revision: number;
  readonly entries: JournalEntry[];
  integrityHmac: string;
}

interface RehearsalOptions {
  readonly root: string;
  readonly encryptionKey?: Uint8Array;
  readonly now: Date;
  readonly rehearsalEnabled: true;
  readonly walkingSliceId: string;
  readonly seedEntityId?: string;
  readonly staleWriterRecovery?: OfflineRoomRehearsalWriterRecoveryV1;
}

interface MutationOptions {
  readonly faultAt?: OfflineRoomRehearsalFault;
  readonly projectionLogicalRehearsalPermit?: OfflineProjectionLogicalRehearsalPermitV1;
  /** A legacy property is rejected at runtime even when an untyped caller supplies it. */
  readonly projectionExecutionGrant?: never;
}

const MUTATIONS = new Set<string>(OFFLINE_ROOM_REHEARSAL_MUTATIONS);
const READS = new Set<string>(OFFLINE_ROOM_REHEARSAL_READS);
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const HMAC_PATTERN = /^hmac-sha256:[a-f0-9]{64}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const ENTITY_ID_PATTERN = /^entity_[A-Za-z0-9_-]{16,128}$/u;
const WALKING_SLICE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{15,159}$/u;
const REHEARSAL_PERMIT_ID_PATTERN = /^permit_[A-Za-z0-9_-]{16,128}$/u;
const HANDOFF_ID_PATTERN = /^handoff_[a-f0-9]{32}$/u;
const APPROVAL_ID_PATTERN = /^approval_[A-Za-z0-9_-]{16,128}$/u;
const RECEIPT_ID_PATTERN = /^receipt_[A-Za-z0-9_-]{16,128}$/u;
const MAX_JOURNAL_BYTES = 4 * 1024 * 1024;
const WRITER_PROCESS_ID = `offline-room-rehearsal-${process.pid}-${randomBytes(12).toString("hex")}`;
const WRITER_LOCK_DIRECTORY = "writer-lock";

function failClosed(): never {
  throw new Error("OFFLINE_ROOM_REHEARSAL_JOURNAL_INVALID");
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) failClosed();
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length
    || keys.some((key) => !Object.hasOwn(record, key))
  ) failClosed();
  return record;
}

function exactSeedEntityId(value: unknown): string {
  if (typeof value !== "string" || !ENTITY_ID_PATTERN.test(value)) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_SEED_ENTITY_INVALID");
  }
  return value;
}

function exactWalkingSliceId(value: unknown): string {
  if (typeof value !== "string" || !WALKING_SLICE_ID_PATTERN.test(value)) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_WALKING_SLICE_INVALID");
  }
  return value;
}

export function offlineRoomRehearsalRequestHash(actionValue: string, inputValue: unknown): `sha256:${string}` {
  if (!MUTATIONS.has(actionValue)) throw new Error("OFFLINE_ROOM_REHEARSAL_MUTATION_NOT_ALLOWED");
  const parsed = parseCoreRoomApiSecureInput(actionValue, inputValue);
  return canonicalSha256({
    action: parsed.action as OfflineRoomRehearsalMutation,
    input: structuredClone(parsed.input),
  });
}

function logicalPermitPreimage(
  permit: Omit<OfflineProjectionLogicalRehearsalPermitV1, "permitId">,
): Omit<OfflineProjectionLogicalRehearsalPermitV1, "permitId"> {
  return permit;
}

function validateProjectionLogicalRehearsalPermit(
  value: unknown,
  walkingSliceId: string,
  exactRequestHash: Sha256,
): OfflineProjectionLogicalRehearsalPermitV1 {
  const permit = exactRecord(value, [
    "schemaVersion", "permitId", "walkingSliceId", "exactRequestHash", "handoffId",
    "handoffReviewHash", "handoffCandidateSha256", "handoffPublicationApprovalSha256",
    "artifactApprovalId", "artifactApprovalSha256", "approvalReceiptId", "approvalReceiptSha256",
    "authorityMeaning", "rehearsalOnly", "syntheticInProcessOnly", "externalPublicationAllowed",
    "maximumDistinctLogicalExecutions",
  ]);
  if (
    permit.schemaVersion !== "offline_projection_logical_rehearsal_permit.v1"
    || typeof permit.permitId !== "string"
    || !REHEARSAL_PERMIT_ID_PATTERN.test(permit.permitId)
    || permit.walkingSliceId !== walkingSliceId
    || permit.exactRequestHash !== exactRequestHash
    || typeof permit.handoffId !== "string"
    || !HANDOFF_ID_PATTERN.test(permit.handoffId)
    || typeof permit.handoffReviewHash !== "string"
    || !SHA256_PATTERN.test(permit.handoffReviewHash)
    || typeof permit.handoffCandidateSha256 !== "string"
    || !SHA256_PATTERN.test(permit.handoffCandidateSha256)
    || typeof permit.handoffPublicationApprovalSha256 !== "string"
    || !SHA256_PATTERN.test(permit.handoffPublicationApprovalSha256)
    || typeof permit.artifactApprovalId !== "string"
    || !APPROVAL_ID_PATTERN.test(permit.artifactApprovalId)
    || typeof permit.artifactApprovalSha256 !== "string"
    || !SHA256_PATTERN.test(permit.artifactApprovalSha256)
    || typeof permit.approvalReceiptId !== "string"
    || !RECEIPT_ID_PATTERN.test(permit.approvalReceiptId)
    || typeof permit.approvalReceiptSha256 !== "string"
    || !SHA256_PATTERN.test(permit.approvalReceiptSha256)
    || permit.authorityMeaning !== "logical_rehearsal_only_not_owner_or_delivery_authority"
    || permit.rehearsalOnly !== true
    || permit.syntheticInProcessOnly !== true
    || permit.externalPublicationAllowed !== false
    || permit.maximumDistinctLogicalExecutions !== 1
  ) throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_INVALID");
  const normalized = {
    schemaVersion: "offline_projection_logical_rehearsal_permit.v1",
    walkingSliceId,
    exactRequestHash,
    handoffId: permit.handoffId,
    handoffReviewHash: permit.handoffReviewHash as Sha256,
    handoffCandidateSha256: permit.handoffCandidateSha256 as Sha256,
    handoffPublicationApprovalSha256: permit.handoffPublicationApprovalSha256 as Sha256,
    artifactApprovalId: permit.artifactApprovalId,
    artifactApprovalSha256: permit.artifactApprovalSha256 as Sha256,
    approvalReceiptId: permit.approvalReceiptId,
    approvalReceiptSha256: permit.approvalReceiptSha256 as Sha256,
    authorityMeaning: "logical_rehearsal_only_not_owner_or_delivery_authority",
    rehearsalOnly: true,
    syntheticInProcessOnly: true,
    externalPublicationAllowed: false,
    maximumDistinctLogicalExecutions: 1,
  } as const;
  const expectedPermitId = `permit_${canonicalSha256(logicalPermitPreimage(normalized)).slice(7, 39)}`;
  if (permit.permitId !== expectedPermitId) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_INVALID");
  }
  return Object.freeze({ ...normalized, permitId: expectedPermitId });
}

/**
 * Creates a deterministic permit for one distinct synthetic delivery request.
 * This is a programmatic rehearsal fence, not Owner or production authority.
 */
export function createOfflineProjectionLogicalRehearsalPermit(input: {
  readonly walkingSliceId: string;
  readonly deliveryInput: CoreRoomApiSecureInputV1;
  readonly approvedHandoff: {
    readonly candidate: LocalRoomHandoffCandidateV1;
    readonly approval: LocalRoomHandoffApprovalBundle;
  };
}): OfflineProjectionLogicalRehearsalPermitV1 {
  const walkingSliceId = exactWalkingSliceId(input.walkingSliceId);
  const parsed = parseCoreRoomApiSecureInput("room_operator.projection.deliver", input.deliveryInput);
  const request = parsed.input.request;
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_APPROVED_HANDOFF_INVALID");
  }
  const delivery = validateHostedPublicationDeliveryV1((request as Record<string, unknown>).delivery);
  if (delivery.artifactClass !== "projection" || delivery.projection === null) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_APPROVED_HANDOFF_INVALID");
  }
  const { candidate } = input.approvedHandoff;
  const { approval, receipt } = input.approvedHandoff.approval;
  const artifactApproval = validateArtifactApprovalV1(approval.artifactApproval);
  const candidateSha256 = canonicalSha256(candidate);
  const publicationApprovalSha256 = canonicalSha256(approval);
  const artifactApprovalSha256 = canonicalSha256(artifactApproval);
  const approvalReceiptSha256 = canonicalSha256(receipt);
  if (
    candidate.schemaVersion !== "local_room_handoff_candidate.v1"
    || !HANDOFF_ID_PATTERN.test(candidate.handoffId)
    || candidate.contentPublicationApproved !== false
    || candidate.deliveryAuthorized !== false
    || candidate.roomMutationAuthorized !== false
    || candidate.localOnly !== true
    || candidate.draftSha256 !== canonicalSha256(candidate.draft)
    || candidate.capsuleSha256 !== canonicalSha256(candidate.draft.capsule)
    || candidate.basisSha256 !== canonicalSha256(candidate.draft.basis)
    || candidate.payloadHash !== candidate.draft.capsule.payloadHash
    || candidate.basisHash !== canonicalSha256(candidate.draft.basis)
    || canonicalJson(delivery.projection) !== canonicalJson(candidate.draft.capsule)
    || delivery.attestation.roomId !== candidate.targetRoomId
    || delivery.attestation.artifactId !== candidate.projectionId
    || delivery.attestation.artifactHash !== candidate.payloadHash
    || approval.schemaVersion !== "local_room_handoff_publication_approval.v1"
    || approval.handoffId !== candidate.handoffId
    || approval.reviewHash !== candidate.reviewHash
    || approval.sourceLocalApprovalReused !== false
    || approval.contentPublicationApproved !== true
    || approval.deliveryAuthorized !== false
    || approval.roomMutationAuthorized !== false
    || approval.localOnly !== true
    || artifactApproval.artifactClass !== "projection"
    || artifactApproval.artifactHash !== candidate.payloadHash
    || artifactApproval.roomId !== candidate.targetRoomId
    || artifactApproval.projectionId !== candidate.projectionId
    || artifactApproval.basisHash !== candidate.basisHash
    || receipt.schemaVersion !== "local_room_handoff_approval_receipt.v1"
    || receipt.handoffId !== candidate.handoffId
    || receipt.reviewHash !== candidate.reviewHash
    || receipt.approvalId !== artifactApproval.approvalId
    || receipt.candidateSha256 !== candidateSha256
    || receipt.draftSha256 !== candidate.draftSha256
    || receipt.artifactApprovalSha256 !== artifactApprovalSha256
    || receipt.approvalSha256 !== publicationApprovalSha256
    || receipt.approvedAt !== artifactApproval.approvedAt
    || receipt.expiresAt !== artifactApproval.expiresAt
    || receipt.sourceLocalApprovalReused !== false
    || receipt.contentPublicationApproved !== true
    || receipt.deliveryAuthorized !== false
    || receipt.roomMutationAuthorized !== false
    || receipt.roomMutationCalls !== 0
    || receipt.networkCalls !== 0
    || receipt.providerCalls !== 0
    || receipt.hostBindingCalls !== 0
    || receipt.publicationCalls !== 0
    || receipt.localOnly !== true
  ) throw new Error("OFFLINE_ROOM_REHEARSAL_APPROVED_HANDOFF_INVALID");
  const exactRequestHash = offlineRoomRehearsalRequestHash("room_operator.projection.deliver", input.deliveryInput);
  const preimage = {
    schemaVersion: "offline_projection_logical_rehearsal_permit.v1",
    walkingSliceId,
    exactRequestHash,
    handoffId: candidate.handoffId,
    handoffReviewHash: candidate.reviewHash,
    handoffCandidateSha256: candidateSha256,
    handoffPublicationApprovalSha256: publicationApprovalSha256,
    artifactApprovalId: artifactApproval.approvalId,
    artifactApprovalSha256,
    approvalReceiptId: receipt.receiptId,
    approvalReceiptSha256,
    authorityMeaning: "logical_rehearsal_only_not_owner_or_delivery_authority",
    rehearsalOnly: true,
    syntheticInProcessOnly: true,
    externalPublicationAllowed: false,
    maximumDistinctLogicalExecutions: 1,
  } as const;
  return Object.freeze({
    ...preimage,
    permitId: `permit_${canonicalSha256(logicalPermitPreimage(preimage)).slice(7, 39)}`,
  });
}

function isInside(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function prepareRoot(requestedRoot: string): string {
  if (typeof requestedRoot !== "string" || requestedRoot.length === 0) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_ROOT_REQUIRED");
  }
  const systemTemp = realpathSync(tmpdir());
  const root = resolve(requestedRoot);
  if (!isInside(systemTemp, root)) throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_ROOT_REQUIRED");

  const parent = dirname(root);
  if (!existsSync(parent)) throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_PARENT_REQUIRED");
  const parentStat = lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || realpathSync(parent) !== resolve(parent)) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_PARENT_INVALID");
  }
  if (!isInside(systemTemp, realpathSync(parent)) && realpathSync(parent) !== systemTemp) {
    throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_PARENT_INVALID");
  }

  if (!existsSync(root)) mkdirSync(root, { mode: 0o700 });
  const rootStat = lstatSync(root);
  if (
    !rootStat.isDirectory()
    || rootStat.isSymbolicLink()
    || realpathSync(root) !== root
    || (rootStat.mode & 0o077) !== 0
  ) throw new Error("OFFLINE_ROOM_REHEARSAL_TEMP_ROOT_INVALID");
  return root;
}

function writerRecoveryFromRecord(record: LockRecord): OfflineRoomRehearsalWriterRecoveryV1 {
  return Object.freeze({
    schemaVersion: "offline_room_rehearsal_writer_recovery.v1",
    roomId: record.roomId,
    operationClass: "room_reconcile",
    processId: record.processId,
    bootId: record.bootId,
    startedAt: record.startedAt,
    nonce: record.nonce,
  });
}

function validateWriterRecovery(value: unknown): OfflineRoomRehearsalWriterRecoveryV1 {
  let recovery: Record<string, unknown>;
  try {
    recovery = exactRecord(value, [
      "schemaVersion", "roomId", "operationClass", "processId", "bootId", "startedAt", "nonce",
    ]);
  } catch {
    throw new Error("OFFLINE_ROOM_REHEARSAL_WRITER_RECOVERY_INVALID");
  }
  const startedAtMs = typeof recovery.startedAt === "string" ? Date.parse(recovery.startedAt) : Number.NaN;
  if (
    recovery.schemaVersion !== "offline_room_rehearsal_writer_recovery.v1"
    || recovery.roomId !== SYNTHETIC_PUBLIC_ROOM_ID
    || recovery.operationClass !== "room_reconcile"
    || !Number.isSafeInteger(recovery.processId)
    || Number(recovery.processId) <= 0
    || typeof recovery.bootId !== "string"
    || recovery.bootId.length < 1
    || recovery.bootId.length > 256
    || typeof recovery.startedAt !== "string"
    || !Number.isFinite(startedAtMs)
    || new Date(startedAtMs).toISOString() !== recovery.startedAt
    || typeof recovery.nonce !== "string"
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(recovery.nonce)
  ) throw new Error("OFFLINE_ROOM_REHEARSAL_WRITER_RECOVERY_INVALID");
  return Object.freeze({
    schemaVersion: "offline_room_rehearsal_writer_recovery.v1",
    roomId: SYNTHETIC_PUBLIC_ROOM_ID,
    operationClass: "room_reconcile",
    processId: Number(recovery.processId),
    bootId: recovery.bootId,
    startedAt: recovery.startedAt,
    nonce: recovery.nonce,
  });
}

function sameWriterIdentity(record: LockRecord, expected: OfflineRoomRehearsalWriterRecoveryV1): boolean {
  return record.roomId === expected.roomId
    && record.operationClass === expected.operationClass
    && record.processId === expected.processId
    && record.bootId === expected.bootId
    && record.startedAt === expected.startedAt
    && record.nonce === expected.nonce;
}

function processState(processId: number): "live" | "dead" | "ambiguous" {
  try {
    process.kill(processId, 0);
    return "live";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "dead";
    return "ambiguous";
  }
}

function newWriterLock(root: string): ProtectedRoomLock {
  return new ProtectedRoomLock({
    root: join(root, WRITER_LOCK_DIRECTORY),
    bootId: WRITER_PROCESS_ID,
  });
}

export function inspectOfflineRoomRehearsalWriterRecovery(input: {
  readonly root: string;
}): OfflineRoomRehearsalWriterRecoveryV1 | null {
  const root = prepareRoot(input.root);
  const record = newWriterLock(root).inspect(SYNTHETIC_PUBLIC_ROOM_ID);
  return record === null ? null : writerRecoveryFromRecord(record);
}

function acquireWriterLease(
  root: string,
  now: Date,
  requestedRecovery: OfflineRoomRehearsalWriterRecoveryV1 | undefined,
): { readonly writerLock: ProtectedRoomLock; readonly lease: LockLease } {
  if (requestedRecovery === undefined) {
    const writerLock = newWriterLock(root);
    return {
      writerLock,
      lease: writerLock.acquire(SYNTHETIC_PUBLIC_ROOM_ID, "room_reconcile", now),
    };
  }
  const expected = validateWriterRecovery(requestedRecovery);
  let writerLock: ProtectedRoomLock;
  writerLock = new ProtectedRoomLock({
    root: join(root, WRITER_LOCK_DIRECTORY),
    bootId: WRITER_PROCESS_ID,
    isProcessLive: (processId, bootId) => {
      let current: LockRecord | null;
      try {
        current = writerLock.inspect(SYNTHETIC_PUBLIC_ROOM_ID);
      } catch {
        return "ambiguous";
      }
      if (
        current === null
        || processId !== expected.processId
        || bootId !== expected.bootId
        || !sameWriterIdentity(current, expected)
      ) return "ambiguous";
      return processState(processId);
    },
  });
  const takeover = writerLock.takeoverStale(SYNTHETIC_PUBLIC_ROOM_ID, "room_reconcile", now);
  if (!sameWriterIdentity(takeover.recovered, expected)) {
    takeover.lease.release();
    throw new Error("OFFLINE_ROOM_REHEARSAL_WRITER_RECOVERY_IDENTITY_CHANGED");
  }
  return { writerLock, lease: takeover.lease };
}

function keyBytes(value: Uint8Array | undefined): Buffer {
  if (value === undefined) throw new Error("OFFLINE_ROOM_REHEARSAL_KEY_REQUIRED");
  const key = Buffer.from(value);
  if (key.byteLength !== 32) throw new Error("OFFLINE_ROOM_REHEARSAL_KEY_INVALID");
  return key;
}

function derivedKey(key: Buffer, purpose: "encryption" | "integrity"): Buffer {
  return createHmac("sha256", key)
    .update(`forme.offline-room-rehearsal.v1\u0000${purpose}`, "utf8")
    .digest();
}

function documentPreimage(document: JournalDocument): Omit<JournalDocument, "integrityHmac"> {
  return {
    schemaVersion: document.schemaVersion,
    rehearsalOnly: document.rehearsalOnly,
    networkPolicy: document.networkPolicy,
    productionFallbackAllowed: document.productionFallbackAllowed,
    clock: document.clock,
    seedEntityId: document.seedEntityId,
    walkingSliceId: document.walkingSliceId,
    revision: document.revision,
    entries: document.entries,
  };
}

function integrityHmac(document: JournalDocument, key: Buffer): string {
  const digest = createHmac("sha256", derivedKey(key, "integrity"))
    .update("forme.offline-room-rehearsal.journal.v1\u0000", "utf8")
    .update(canonicalJson(documentPreimage(document)), "utf8")
    .digest("hex");
  return `hmac-sha256:${digest}`;
}

function verifyIntegrity(document: JournalDocument, key: Buffer): void {
  if (!HMAC_PATTERN.test(document.integrityHmac)) failClosed();
  const expected = integrityHmac(document, key);
  const suppliedBytes = Buffer.from(document.integrityHmac.slice("hmac-sha256:".length), "hex");
  const expectedBytes = Buffer.from(expected.slice("hmac-sha256:".length), "hex");
  if (suppliedBytes.byteLength !== expectedBytes.byteLength || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    failClosed();
  }
}

function entryAad(entry: Pick<JournalEntry, "ordinal" | "action" | "requestHash" | "startedAt">): Record<string, unknown> {
  return {
    schemaVersion: "offline_room_operation_aad.v1",
    ordinal: entry.ordinal,
    action: entry.action,
    requestHash: entry.requestHash,
    startedAt: entry.startedAt,
  };
}

function isSensitive(envelope: MutationEnvelope): boolean {
  return envelope.input.capability.bearer !== null
    || envelope.action === "public_encounter.issue"
    || envelope.action === "interaction.create"
    || envelope.action === "room_operator.pull"
    || envelope.action === "room_operator.projection.deliver";
}

function encryptEnvelope(
  envelope: MutationEnvelope,
  entry: Pick<JournalEntry, "ordinal" | "action" | "requestHash" | "startedAt">,
  key: Buffer,
): EncryptedPayload {
  const iv = randomBytes(12);
  const aad = Buffer.from(canonicalJson(entryAad(entry)), "utf8");
  const cipher = createCipheriv("aes-256-gcm", derivedKey(key, "encryption"), iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(canonicalJson(envelope), "utf8"),
    cipher.final(),
  ]);
  return {
    storageClass: "aes_256_gcm",
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    aadHash: canonicalSha256(entryAad(entry)),
  };
}

function canonicalEnvelope(value: unknown, expectedAction: string): MutationEnvelope {
  const envelopeRecord = exactRecord(value, ["action", "input"]);
  if (envelopeRecord.action !== expectedAction || !MUTATIONS.has(expectedAction)) failClosed();
  let parsed;
  try {
    parsed = parseCoreRoomApiSecureInput(expectedAction, envelopeRecord.input);
  } catch {
    failClosed();
  }
  return { action: parsed.action as OfflineRoomRehearsalMutation, input: parsed.input };
}

function decryptEnvelope(entry: JournalEntry, key: Buffer): MutationEnvelope {
  if (entry.payload.storageClass === "canonical_public") {
    const envelope = canonicalEnvelope(entry.payload.envelope, entry.action);
    if (isSensitive(envelope)) failClosed();
    return envelope;
  }
  const payload = entry.payload;
  if (
    !BASE64URL_PATTERN.test(payload.iv)
    || !BASE64URL_PATTERN.test(payload.authTag)
    || !BASE64URL_PATTERN.test(payload.ciphertext)
    || !SHA256_PATTERN.test(payload.aadHash)
    || payload.aadHash !== canonicalSha256(entryAad(entry))
  ) failClosed();
  try {
    const iv = Buffer.from(payload.iv, "base64url");
    const authTag = Buffer.from(payload.authTag, "base64url");
    if (iv.byteLength !== 12 || authTag.byteLength !== 16) failClosed();
    const decipher = createDecipheriv("aes-256-gcm", derivedKey(key, "encryption"), iv);
    decipher.setAAD(Buffer.from(canonicalJson(entryAad(entry)), "utf8"));
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = parseStrictJson(plaintext);
    if (canonicalJson(parsed) !== plaintext) failClosed();
    const envelope = canonicalEnvelope(parsed, entry.action);
    if (!isSensitive(envelope)) failClosed();
    return envelope;
  } catch {
    failClosed();
  }
}

function validatePayload(value: unknown): StoredPayload {
  if (value === null || typeof value !== "object" || Array.isArray(value)) failClosed();
  const discriminator = exactRecord(value, Object.hasOwn(value, "envelope")
    ? ["storageClass", "envelope"]
    : ["storageClass", "iv", "authTag", "ciphertext", "aadHash"]);
  if (discriminator.storageClass === "canonical_public") {
    return {
      storageClass: "canonical_public",
      envelope: discriminator.envelope as MutationEnvelope,
    };
  }
  if (discriminator.storageClass !== "aes_256_gcm") failClosed();
  for (const field of ["iv", "authTag", "ciphertext", "aadHash"] as const) {
    if (typeof discriminator[field] !== "string") failClosed();
  }
  return {
    storageClass: "aes_256_gcm",
    iv: discriminator.iv as string,
    authTag: discriminator.authTag as string,
    ciphertext: discriminator.ciphertext as string,
    aadHash: discriminator.aadHash as Sha256,
  };
}

function validateEntry(value: unknown, ordinal: number, walkingSliceId: string): JournalEntry {
  const entry = exactRecord(value, [
    "schemaVersion", "ordinal", "action", "requestHash", "startedAt", "state",
    "payload", "projectionLogicalRehearsalPermit", "responseHash", "rejection",
  ]);
  if (
    entry.schemaVersion !== "offline_room_operation.v1"
    || entry.ordinal !== ordinal
    || typeof entry.action !== "string"
    || !MUTATIONS.has(entry.action)
    || typeof entry.requestHash !== "string"
    || !SHA256_PATTERN.test(entry.requestHash)
    || typeof entry.startedAt !== "string"
    || !Number.isFinite(Date.parse(entry.startedAt))
    || new Date(Date.parse(entry.startedAt)).toISOString() !== entry.startedAt
    || (entry.state !== "pending" && entry.state !== "committed" && entry.state !== "rejected")
  ) failClosed();
  let projectionLogicalRehearsalPermit: OfflineProjectionLogicalRehearsalPermitV1 | null = null;
  if (entry.action === "room_operator.projection.deliver") {
    if (entry.projectionLogicalRehearsalPermit === null) failClosed();
    try {
      projectionLogicalRehearsalPermit = validateProjectionLogicalRehearsalPermit(
        entry.projectionLogicalRehearsalPermit,
        walkingSliceId,
        entry.requestHash as Sha256,
      );
    } catch {
      failClosed();
    }
  } else if (entry.projectionLogicalRehearsalPermit !== null) {
    failClosed();
  }
  const responseHash = entry.responseHash;
  if (responseHash !== null && (typeof responseHash !== "string" || !SHA256_PATTERN.test(responseHash))) failClosed();
  let rejection: JournalEntry["rejection"] = null;
  if (entry.rejection !== null) {
    const rejected = exactRecord(entry.rejection, ["status", "code"]);
    if (
      !Number.isInteger(rejected.status)
      || Number(rejected.status) < 400
      || Number(rejected.status) > 599
      || typeof rejected.code !== "string"
      || !/^[a-z][a-z0-9_]{0,95}$/u.test(rejected.code)
    ) failClosed();
    rejection = { status: Number(rejected.status), code: rejected.code };
  }
  if (
    (entry.state === "pending" && (responseHash !== null || rejection !== null))
    || (entry.state === "committed" && (responseHash === null || rejection !== null))
    || (entry.state === "rejected" && (responseHash !== null || rejection === null))
  ) failClosed();
  return {
    schemaVersion: "offline_room_operation.v1",
    ordinal,
    action: entry.action as OfflineRoomRehearsalMutation,
    requestHash: entry.requestHash as Sha256,
    startedAt: entry.startedAt,
    state: entry.state,
    payload: validatePayload(entry.payload),
    projectionLogicalRehearsalPermit,
    responseHash: responseHash as Sha256 | null,
    rejection,
  };
}

function parseJournal(
  source: string,
  expected: { readonly clock: string; readonly seedEntityId: string; readonly walkingSliceId: string },
  key: Buffer,
): JournalDocument {
  let parsed: unknown;
  try {
    parsed = parseStrictJson(source);
  } catch {
    failClosed();
  }
  if (`${canonicalJson(parsed)}\n` !== source) failClosed();
  const document = exactRecord(parsed, [
    "schemaVersion", "rehearsalOnly", "networkPolicy", "productionFallbackAllowed",
    "clock", "seedEntityId", "walkingSliceId", "revision", "entries", "integrityHmac",
  ]);
  if (
    document.schemaVersion !== "offline_room_rehearsal_journal.v1"
    || document.rehearsalOnly !== true
    || document.networkPolicy !== "deny_external"
    || document.productionFallbackAllowed !== false
    || document.clock !== expected.clock
    || document.seedEntityId !== expected.seedEntityId
    || document.walkingSliceId !== expected.walkingSliceId
    || !Number.isSafeInteger(document.revision)
    || Number(document.revision) < 0
    || !Array.isArray(document.entries)
    || typeof document.integrityHmac !== "string"
  ) failClosed();
  const validated: JournalDocument = {
    schemaVersion: "offline_room_rehearsal_journal.v1",
    rehearsalOnly: true,
    networkPolicy: "deny_external",
    productionFallbackAllowed: false,
    clock: expected.clock,
    seedEntityId: expected.seedEntityId,
    walkingSliceId: expected.walkingSliceId,
    revision: Number(document.revision),
    entries: document.entries.map((entry, index) => validateEntry(entry, index + 1, expected.walkingSliceId)),
    integrityHmac: document.integrityHmac,
  };
  if (validated.entries.filter((entry) => entry.action === "room_operator.projection.deliver").length > 1) failClosed();
  verifyIntegrity(validated, key);
  return validated;
}

function assertJournalFile(path: string): void {
  const stat = lstatSync(path);
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || stat.nlink !== 1
    || (stat.mode & 0o077) !== 0
    || stat.size > MAX_JOURNAL_BYTES
  ) failClosed();
}

function persistJournal(
  path: string,
  document: JournalDocument,
  key: Buffer,
  faultAt?: "before_rename",
): void {
  document.integrityHmac = integrityHmac(document, key);
  const bytes = `${canonicalJson(document)}\n`;
  if (Buffer.byteLength(bytes, "utf8") > MAX_JOURNAL_BYTES) failClosed();
  const root = dirname(path);
  const temporary = join(root, `.offline-room-rehearsal-${randomBytes(12).toString("hex")}.tmp`);
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(descriptor, bytes, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    if (faultAt === "before_rename") {
      throw new OfflineRoomRehearsalInjectedCrash("journal-write-before-rename");
    }
    renameSync(temporary, path);
    const directory = openSync(root, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
    assertJournalFile(path);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function operationRequest(envelope: MutationEnvelope | { action: OfflineRoomRehearsalRead; input: CoreRoomApiSecureInputV1 }) {
  return {
    definition: coreOperationDefinition(envelope.action),
    params: { ...envelope.input.pathParams },
    body: { ...envelope.input.request },
    authorization: envelope.input.capability.bearer === null
      ? null
      : `Bearer ${envelope.input.capability.bearer}`,
    syntheticActor: envelope.input.capability.syntheticActor,
    idempotencyKey: envelope.input.capability.idempotencyKey,
    expectedVersion: envelope.input.capability.expectedVersion,
    syntheticClientBucket: envelope.input.capability.syntheticClientBucket,
  };
}

export class OfflineRoomRehearsal {
  readonly journalPath: string;
  readonly #key: Buffer;
  readonly #writerLock: ProtectedRoomLock;
  readonly #application: HostedRoomApplication;
  readonly #journal: JournalDocument;
  readonly #envelopes: MutationEnvelope[];
  #journalFingerprint: Sha256;
  #inProcessCoreCalls = 0;
  #poisoned = false;
  #queue: Promise<void> = Promise.resolve();

  private constructor(
    journalPath: string,
    key: Buffer,
    writerLock: ProtectedRoomLock,
    application: HostedRoomApplication,
    journal: JournalDocument,
    envelopes: MutationEnvelope[],
  ) {
    this.journalPath = journalPath;
    this.#key = key;
    this.#writerLock = writerLock;
    this.#application = application;
    this.#journal = journal;
    this.#envelopes = envelopes;
    this.#journalFingerprint = canonicalSha256(journal);
  }

  static async open(options: RehearsalOptions): Promise<OfflineRoomRehearsal> {
    if (options.rehearsalEnabled !== true) {
      throw new Error("OFFLINE_ROOM_REHEARSAL_EXPLICIT_ENABLE_REQUIRED");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("OFFLINE_ROOM_REHEARSAL_NON_PRODUCTION_ONLY");
    }
    const key = keyBytes(options.encryptionKey);
    if (!(options.now instanceof Date) || !Number.isFinite(options.now.getTime())) {
      throw new Error("OFFLINE_ROOM_REHEARSAL_FIXED_CLOCK_REQUIRED");
    }
    const clock = options.now.toISOString();
    const seedEntityId = exactSeedEntityId(options.seedEntityId ?? SYNTHETIC_DEFAULT_ENTITY_ID);
    const walkingSliceId = exactWalkingSliceId(options.walkingSliceId);
    const root = prepareRoot(options.root);
    const journalPath = join(root, OFFLINE_ROOM_REHEARSAL_JOURNAL_FILENAME);
    const { writerLock, lease } = acquireWriterLease(
      root,
      new Date(clock),
      options.staleWriterRecovery,
    );
    try {
      let journal: JournalDocument;
      if (existsSync(journalPath)) {
        assertJournalFile(journalPath);
        journal = parseJournal(readFileSync(journalPath, "utf8"), { clock, seedEntityId, walkingSliceId }, key);
      } else {
        journal = {
          schemaVersion: "offline_room_rehearsal_journal.v1",
          rehearsalOnly: true,
          networkPolicy: "deny_external",
          productionFallbackAllowed: false,
          clock,
          seedEntityId,
          walkingSliceId,
          revision: 0,
          entries: [],
          integrityHmac: "",
        };
        persistJournal(journalPath, journal, key);
      }
      const store = new SyntheticPresenceStore(
        () => new Date(clock),
        { seedEntityId },
      );
      const rehearsal = new OfflineRoomRehearsal(
        journalPath,
        key,
        writerLock,
        new HostedRoomApplication(store),
        journal,
        [],
      );
      await rehearsal.#reconstruct();
      return rehearsal;
    } finally {
      lease.release();
    }
  }

  effectCounters(): OfflineRoomRehearsalEffects {
    return Object.freeze({
      networkCalls: 0,
      modelCalls: 0,
      providerCalls: 0,
      externalPublicationCalls: 0,
      inProcessCoreCalls: this.#inProcessCoreCalls,
    });
  }

  journalSummary(): OfflineRoomRehearsalSummary {
    this.#assertUsable();
    const lease = this.#writerLock.acquire(SYNTHETIC_PUBLIC_ROOM_ID, "room_reconcile", new Date(this.#journal.clock));
    try {
      this.#assertUsable();
      this.#assertCurrentJournal();
      return Object.freeze({
        schemaVersion: "offline_room_rehearsal_summary.v1",
        rehearsalOnly: true,
        networkPolicy: "deny_external",
        productionFallbackAllowed: false,
        clock: this.#journal.clock,
        seedEntityId: this.#journal.seedEntityId,
        walkingSliceId: this.#journal.walkingSliceId,
        revision: this.#journal.revision,
        distinctProjectionLogicalExecutions: this.#journal.entries.some((entry) =>
          entry.action === "room_operator.projection.deliver") ? 1 : 0,
        entries: Object.freeze(this.#journal.entries.map((entry) => Object.freeze({
          ordinal: entry.ordinal,
          action: entry.action,
          state: entry.state,
          storageClass: entry.payload.storageClass,
          requestHash: entry.requestHash,
          responseHash: entry.responseHash,
          rejection: entry.rejection === null ? null : Object.freeze({ ...entry.rejection }),
          projectionLogicalRehearsalPermitId: entry.projectionLogicalRehearsalPermit?.permitId ?? null,
        }))),
      });
    } finally {
      lease.release();
    }
  }

  async read(actionValue: string, inputValue: unknown): Promise<OperationResponse> {
    return this.#exclusive(() => this.#withWriterLease(async () => {
      if (!READS.has(actionValue)) throw new Error("OFFLINE_ROOM_REHEARSAL_READ_NOT_ALLOWED");
      const parsed = parseCoreRoomApiSecureInput(actionValue, inputValue);
      const action = parsed.action as OfflineRoomRehearsalRead;
      const result = await this.#call({ action, input: structuredClone(parsed.input) });
      return structuredClone(result);
    }));
  }

  async mutate(
    actionValue: string,
    inputValue: unknown,
    options: MutationOptions = {},
  ): Promise<OperationResponse> {
    return this.#exclusive(() => this.#withWriterLease(async () => {
      if (!MUTATIONS.has(actionValue)) throw new Error("OFFLINE_ROOM_REHEARSAL_MUTATION_NOT_ALLOWED");
      const parsed = parseCoreRoomApiSecureInput(actionValue, inputValue);
      const envelope: MutationEnvelope = {
        action: parsed.action as OfflineRoomRehearsalMutation,
        input: structuredClone(parsed.input),
      };
      const requestHash = canonicalSha256(envelope);
      const hasLegacyProjectionExecutionGrant = Object.hasOwn(options, "projectionExecutionGrant");
      let projectionLogicalRehearsalPermit: OfflineProjectionLogicalRehearsalPermitV1 | null = null;
      if (envelope.action === "room_operator.projection.deliver") {
        if (hasLegacyProjectionExecutionGrant) {
          throw new Error("OFFLINE_ROOM_REHEARSAL_LEGACY_PROJECTION_EXECUTION_GRANT_REJECTED");
        }
        if (options.projectionLogicalRehearsalPermit === undefined) {
          throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_REQUIRED");
        }
        try {
          projectionLogicalRehearsalPermit = validateProjectionLogicalRehearsalPermit(
            options.projectionLogicalRehearsalPermit,
            this.#journal.walkingSliceId,
            requestHash,
          );
        } catch {
          throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_INVALID");
        }
      } else if (
        options.projectionLogicalRehearsalPermit !== undefined
        || hasLegacyProjectionExecutionGrant
      ) {
        throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_NOT_APPLICABLE");
      }
      const idempotencyKey = envelope.input.capability.idempotencyKey;
      const existingIndex = this.#envelopes.findIndex((candidate) =>
        candidate.action === envelope.action
        && candidate.input.capability.idempotencyKey === idempotencyKey);
      if (existingIndex >= 0) {
        const existing = this.#journal.entries[existingIndex];
        if (!existing || existing.requestHash !== requestHash) {
          throw new SemanticError(409, "idempotency_conflict", "The same local idempotency key was used with different canonical bytes");
        }
        if (
          canonicalJson(existing.projectionLogicalRehearsalPermit)
          !== canonicalJson(projectionLogicalRehearsalPermit)
        ) {
          throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_INVALID");
        }
        return this.#executeTerminal(existing, envelope);
      }
      if (
        envelope.action === "room_operator.projection.deliver"
        && this.#journal.entries.some((entry) => entry.action === "room_operator.projection.deliver")
      ) throw new Error("OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_CONSUMED");

      const skeleton = {
        ordinal: this.#journal.entries.length + 1,
        action: envelope.action,
        requestHash,
        startedAt: this.#journal.clock,
      };
      const entry: JournalEntry = {
        schemaVersion: "offline_room_operation.v1",
        ...skeleton,
        state: "pending",
        payload: isSensitive(envelope)
          ? encryptEnvelope(envelope, skeleton, this.#key)
          : { storageClass: "canonical_public", envelope },
        projectionLogicalRehearsalPermit,
        responseHash: null,
        rejection: null,
      };
      this.#journal.entries.push(entry);
      this.#envelopes.push(envelope);
      this.#persistJournalRevision(
        options.faultAt === "journal-write-before-rename" ? "before_rename" : undefined,
      );
      if (options.faultAt === "pending-before-call") {
        throw new OfflineRoomRehearsalInjectedCrash("pending-before-call");
      }

      let result: OperationResponse;
      try {
        result = await this.#call(envelope);
      } catch (error) {
        if (!isSemanticError(error)) throw error;
        if (options.faultAt === "after-call-before-commit") {
          throw new OfflineRoomRehearsalInjectedCrash("after-call-before-commit");
        }
        entry.state = "rejected";
        entry.rejection = { status: error.status, code: error.code };
        this.#persistJournalRevision();
        if (options.faultAt === "after-commit") {
          throw new OfflineRoomRehearsalInjectedCrash("after-commit");
        }
        throw error;
      }
      if (options.faultAt === "after-call-before-commit") {
        throw new OfflineRoomRehearsalInjectedCrash("after-call-before-commit");
      }
      entry.state = "committed";
      entry.responseHash = canonicalSha256(result);
      this.#persistJournalRevision();
      if (options.faultAt === "after-commit") {
        throw new OfflineRoomRehearsalInjectedCrash("after-commit");
      }
      return structuredClone(result);
    }));
  }

  async #exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation, operation);
    this.#queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async #withWriterLease<T>(operation: () => Promise<T>): Promise<T> {
    this.#assertUsable();
    const lease = this.#writerLock.acquire(
      SYNTHETIC_PUBLIC_ROOM_ID,
      "room_reconcile",
      new Date(this.#journal.clock),
    );
    try {
      this.#assertUsable();
      this.#assertCurrentJournal();
      return await operation();
    } finally {
      lease.release();
    }
  }

  #assertUsable(): void {
    if (this.#poisoned) throw new Error("OFFLINE_ROOM_REHEARSAL_INSTANCE_POISONED");
  }

  #assertCurrentJournal(): void {
    if (!existsSync(this.journalPath)) throw new Error("OFFLINE_ROOM_REHEARSAL_STALE_INSTANCE");
    assertJournalFile(this.journalPath);
    const current = parseJournal(
      readFileSync(this.journalPath, "utf8"),
      {
        clock: this.#journal.clock,
        seedEntityId: this.#journal.seedEntityId,
        walkingSliceId: this.#journal.walkingSliceId,
      },
      this.#key,
    );
    if (canonicalSha256(current) !== this.#journalFingerprint) {
      throw new Error("OFFLINE_ROOM_REHEARSAL_STALE_INSTANCE");
    }
  }

  #persistJournalRevision(faultAt?: "before_rename"): void {
    this.#assertUsable();
    this.#journal.revision += 1;
    try {
      persistJournal(this.journalPath, this.#journal, this.#key, faultAt);
      this.#journalFingerprint = canonicalSha256(this.#journal);
    } catch (error) {
      this.#poisoned = true;
      throw error;
    }
  }

  async #call(
    envelope: MutationEnvelope | { action: OfflineRoomRehearsalRead; input: CoreRoomApiSecureInputV1 },
  ): Promise<OperationResponse> {
    this.#inProcessCoreCalls += 1;
    return this.#application.runCore(operationRequest(envelope));
  }

  async #executeTerminal(entry: JournalEntry, envelope: MutationEnvelope): Promise<OperationResponse> {
    if (entry.state === "pending") failClosed();
    try {
      const result = await this.#call(envelope);
      if (entry.state !== "committed" || entry.responseHash !== canonicalSha256(result)) failClosed();
      return structuredClone(result);
    } catch (error) {
      if (!isSemanticError(error)) throw error;
      if (
        entry.state !== "rejected"
        || entry.rejection?.status !== error.status
        || entry.rejection.code !== error.code
      ) failClosed();
      throw error;
    }
  }

  async #reconstruct(): Promise<void> {
    for (const entry of this.#journal.entries) {
      const envelope = decryptEnvelope(entry, this.#key);
      if (entry.requestHash !== canonicalSha256(envelope)) failClosed();
      this.#envelopes.push(envelope);
      if (entry.state === "pending") {
        try {
          const result = await this.#call(envelope);
          entry.state = "committed";
          entry.responseHash = canonicalSha256(result);
        } catch (error) {
          if (!isSemanticError(error)) throw error;
          entry.state = "rejected";
          entry.rejection = { status: error.status, code: error.code };
        }
        this.#persistJournalRevision();
        continue;
      }
      await this.#executeTerminal(entry, envelope).catch((error: unknown) => {
        if (entry.state === "rejected" && isSemanticError(error)) return undefined;
        throw error;
      });
    }
  }
}
