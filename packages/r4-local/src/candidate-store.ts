import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  canonicalJson,
  canonicalSha256,
  validateArtifactApprovalV1,
  validateResponseCandidateV1,
} from "../../r4-protocol/src/index.ts";
import { assertBodyFree, stableJson } from "./body-free.ts";
import {
  coordinatorForRoomLock,
  type ProtectedRoomMutationCoordinator,
  type RoomMutationContext,
} from "./coordinator.ts";
import { ProtectedRoomLock } from "./lock.ts";
import { assertProtectedRootDisjoint, ensureProtectedRoot } from "./protected-root.ts";
import {
  isExactIsoTimestamp,
  isPrefixedId,
  isSha256,
  parseExactPersistedRecord,
} from "./persisted-record.ts";
import type {
  ArtifactApproval,
  CandidateCleanupJournal,
  CandidateDenyReason,
  Hash,
  KeyProtector,
  ResponseCandidate,
  StoredCandidateEnvelope,
} from "./types.ts";

export type CandidateCleanupFault =
  | "after_deny"
  | "after_key_destroy"
  | "after_ciphertext_remove"
  | "after_receipt_persist";
export type CandidatePutFault =
  | "after_admission_intent"
  | "after_key_wrap"
  | "after_candidate_persist";
export type CandidateReplaceFault =
  | "after_replacement_intent"
  | "after_successor_key_wrap"
  | "after_successor_stage"
  | "after_old_deny"
  | "after_successor_activate";

const CANDIDATE_DENY_REASONS = new Set<CandidateDenyReason>([
  "owner_denied",
  "owner_replaced",
  "basis_invalidated",
  "interaction_terminal",
  "projection_terminal",
  "response_terminal",
  "room_terminal",
  "cursor_tombstone",
  "published",
  "candidate_expired",
]);

const OWNER_REVIEW = Symbol("local candidate Owner review capability");
const OWNER_REPLACE = Symbol("local candidate Owner replacement capability");

interface CandidateReplacementJournalV1 {
  readonly schemaVersion: "local_candidate_replacement_journal.v1";
  readonly oldCandidateId: string;
  readonly oldCandidateHash: Hash;
  readonly newCandidateId: string;
  readonly newCandidateHash: Hash;
  readonly roomId: string;
  readonly interactionId: string;
  readonly wrappedKeyRef: string;
  readonly phase: "planned" | "key_wrapped" | "staged" | "old_denied" | "successor_active";
  readonly startedAt: string;
  readonly admittedAt: string;
  readonly expiresAt: string;
}

interface CandidateAdmissionIntentV1 {
  readonly schemaVersion: "local_candidate_admission_intent.v1";
  readonly candidateId: string;
  readonly candidateHash: Hash;
  readonly roomId: string;
  readonly interactionId: string;
  readonly wrappedKeyRef: string;
  readonly phase: "planned" | "key_wrapped" | "candidate_persisted";
  readonly startedAt: string;
  readonly expiresAt: string;
}

interface CandidateAdmissionAuthorityV1 {
  readonly schemaVersion: "local_candidate_admission_authority.v1";
  readonly candidateId: string;
  readonly candidateHash: Hash;
  readonly roomId: string;
  readonly interactionId: string;
  readonly wrappedKeyRef: string;
  readonly admittedAt: string;
  readonly expiresAt: string;
}

function assertCandidateDenyReason(value: string): asserts value is CandidateDenyReason {
  if (!CANDIDATE_DENY_REASONS.has(value as CandidateDenyReason)) throw new Error("invalid candidate deny reason");
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function atomicWrite(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
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

function appendDurable(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const descriptor = openSync(path, "a", 0o600);
  try {
    writeFileSync(descriptor, `${stableJson(value)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  syncDirectory(dirname(path));
}

function encodeParts(parts: Uint8Array[]): string {
  return Buffer.concat(parts).toString("base64url");
}

function isCanonicalBase64Url(value: unknown, exactBytes?: number): value is string {
  if (typeof value !== "string" || value.length === 0 || !/^[A-Za-z0-9_-]+$/u.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value && (exactBytes === undefined || decoded.byteLength === exactBytes);
}

type CandidateAad = Pick<
  StoredCandidateEnvelope,
  | "schemaVersion"
  | "candidateId"
  | "sessionEnvelopeId"
  | "roomId"
  | "projectionId"
  | "interactionId"
  | "basisHash"
  | "snapshotManifestHash"
  | "sessionReceiptHash"
  | "sourceDisclosureClass"
  | "policyHash"
  | "candidateHash"
  | "wrappedKey"
  | "admittedAt"
  | "expiresAt"
>;

function candidateAad(value: CandidateAad): CandidateAad {
  return {
    schemaVersion: value.schemaVersion,
    candidateId: value.candidateId,
    sessionEnvelopeId: value.sessionEnvelopeId,
    roomId: value.roomId,
    projectionId: value.projectionId,
    interactionId: value.interactionId,
    basisHash: value.basisHash,
    snapshotManifestHash: value.snapshotManifestHash,
    sessionReceiptHash: value.sessionReceiptHash,
    sourceDisclosureClass: value.sourceDisclosureClass,
    policyHash: value.policyHash,
    candidateHash: value.candidateHash,
    wrappedKey: value.wrappedKey,
    admittedAt: value.admittedAt,
    expiresAt: value.expiresAt,
  };
}

function aadBytes(value: CandidateAad): Buffer {
  return Buffer.from(canonicalJson(candidateAad(value)), "utf8");
}

export class SyntheticUserPresenceKeyProtector implements KeyProtector {
  private readonly expectedPresenceProof: string;
  private readonly wrappingKey: Buffer;
  private readonly keys = new Map<string, string>();

  constructor(input?: { presenceProof?: string; wrappingKey?: Uint8Array }) {
    this.expectedPresenceProof = input?.presenceProof ?? "synthetic-user-presence";
    this.wrappingKey = input?.wrappingKey ? Buffer.from(input.wrappingKey) : randomBytes(32);
  }

  async wrap(key: Uint8Array, reference: string): Promise<string> {
    if (!isPrefixedId(reference, "key")) throw new Error("invalid wrapped key reference");
    if (this.keys.has(reference)) throw new Error("wrapped key reference already exists");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.wrappingKey, iv);
    const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
    this.keys.set(reference, encodeParts([iv, cipher.getAuthTag(), encrypted]));
    return reference;
  }

  async unwrap(wrapped: string, userPresenceProof: string): Promise<Uint8Array> {
    const expected = Buffer.from(this.expectedPresenceProof);
    const actual = Buffer.from(userPresenceProof);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error("local user presence required");
    }
    const encoded = this.keys.get(wrapped);
    if (!encoded) throw new Error("wrapped key is unavailable");
    const bytes = Buffer.from(encoded, "base64url");
    const iv = bytes.subarray(0, 12);
    const tag = bytes.subarray(12, 28);
    const payload = bytes.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", this.wrappingKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(payload), decipher.final()]);
  }

  async destroy(wrapped: string): Promise<void> {
    this.keys.delete(wrapped);
  }

  has(ref: string): boolean {
    return this.keys.has(ref);
  }
}

export interface CandidateOwnerReviewPort {
  read(input: { candidateId: string; now?: Date }): Promise<ResponseCandidate>;
  approveExact(input: {
    candidateId: string;
    expectedHash: Hash;
    now: Date;
    expiresAt: Date;
  }): Promise<ArtifactApproval>;
  replaceResponseText(input: {
    candidateId: string;
    expectedHash: Hash;
    responseText: string;
    now: Date;
    faultAt?: CandidateReplaceFault;
  }): Promise<ResponseCandidate>;
}

export class FileCandidateStore {
  readonly root: string;
  readonly workspaceRoot: string;
  readonly protector: KeyProtector;
  readonly coordinator: ProtectedRoomMutationCoordinator;

  constructor(input: {
    root: string;
    workspaceRoot: string;
    protector: KeyProtector;
    coordinator?: ProtectedRoomMutationCoordinator;
  }) {
    this.root = resolve(input.root);
    this.workspaceRoot = resolve(input.workspaceRoot);
    assertProtectedRootDisjoint(this.root, this.workspaceRoot);
    this.protector = input.protector;
    this.coordinator = input.coordinator ?? coordinatorForRoomLock(new ProtectedRoomLock({
      root: resolve(dirname(this.root), "candidate-room-locks"),
      bootId: `candidate-store-${process.pid}`,
    }));
  }

  private candidatePath(candidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(candidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${candidateId}.candidate.json`);
  }

  private journalPath(candidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(candidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${candidateId}.cleanup.json`);
  }

  private receiptPath(): string {
    return resolve(this.root, "cleanup-receipts.jsonl");
  }

  private replacementJournalPath(oldCandidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(oldCandidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${oldCandidateId}.replacement.json`);
  }

  private admissionIntentPath(candidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(candidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${candidateId}.admission.json`);
  }

  private admissionAuthorityPath(candidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(candidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${candidateId}.admission-authority.json`);
  }

  private replacementStagePath(newCandidateId: string): string {
    if (!/^candidate_[A-Za-z0-9_-]{16,128}$/u.test(newCandidateId)) throw new Error("invalid candidate ID");
    return resolve(this.root, `${newCandidateId}.candidate.staged.json`);
  }

  async put(candidate: ResponseCandidate, faultAt?: CandidatePutFault): Promise<{ candidateId: string; candidateHash: Hash }> {
    const validated = validateResponseCandidateV1(candidate);
    ensureProtectedRoot(this.root, this.workspaceRoot);
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: validated.roomId,
      interactionId: validated.interactionId,
      operationClass: "response_prepare",
      now: new Date(validated.admittedAt),
    });
    try {
      return await this.coordinator.run(validated.roomId, "response_prepare", async () => {
        if (Date.parse(validated.expiresAt) <= Date.parse(validated.admittedAt)) throw new Error("candidate expiry is invalid");
        const path = this.candidatePath(validated.candidateId);
        const intentPath = this.admissionIntentPath(validated.candidateId);
        if (
          existsSync(path)
          || existsSync(intentPath)
          || existsSync(this.admissionAuthorityPath(validated.candidateId))
          || existsSync(this.journalPath(validated.candidateId))
          || this.hasCleanupReceipt(validated.candidateId)
        ) {
          throw new Error("candidate already exists or is denied");
        }
        const plaintext = Buffer.from(canonicalJson(validated), "utf8");
        const key = randomBytes(32);
        const iv = randomBytes(12);
        const wrappedKeyRef = `key_${randomUUID().replaceAll("-", "")}`;
        let intent: CandidateAdmissionIntentV1 = {
          schemaVersion: "local_candidate_admission_intent.v1",
          candidateId: validated.candidateId,
          candidateHash: validated.candidateHash,
          roomId: validated.roomId,
          interactionId: validated.interactionId,
          wrappedKeyRef,
          phase: "planned",
          startedAt: validated.admittedAt,
          expiresAt: validated.expiresAt,
        };
        atomicWrite(intentPath, intent);
        let wrapped = false;
        let committed = false;
        let simulatedPowerLoss = false;
        try {
          if (faultAt === "after_admission_intent") {
            simulatedPowerLoss = true;
            throw new Error("injected candidate put interruption:after_admission_intent");
          }
          const wrappedKey = await this.protector.wrap(key, wrappedKeyRef);
          if (wrappedKey !== wrappedKeyRef) {
            await this.protector.destroy(wrappedKey);
            throw new Error("key protector did not honor the journaled reference");
          }
          wrapped = true;
          intent = { ...intent, phase: "key_wrapped" };
          atomicWrite(intentPath, intent);
          if (faultAt === "after_key_wrap") {
            simulatedPowerLoss = true;
            throw new Error("injected candidate put interruption:after_key_wrap");
          }
          const aad: CandidateAad = {
            schemaVersion: "local_encrypted_response_candidate.v1",
            candidateId: validated.candidateId,
            sessionEnvelopeId: validated.sessionEnvelopeId,
            roomId: validated.roomId,
            projectionId: validated.projectionId,
            interactionId: validated.interactionId,
            basisHash: validated.twinBasisHash,
            snapshotManifestHash: validated.snapshotManifestHash,
            sessionReceiptHash: validated.sessionReceiptHash,
            sourceDisclosureClass: validated.sourceDisclosureClass,
            policyHash: validated.policyHash,
            candidateHash: validated.candidateHash,
            wrappedKey: wrappedKeyRef,
            admittedAt: validated.admittedAt,
            expiresAt: validated.expiresAt,
          };
          const cipher = createCipheriv("aes-256-gcm", key, iv);
          cipher.setAAD(aadBytes(aad));
          const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
          const envelope: StoredCandidateEnvelope = {
            ...aad,
            aadHash: canonicalSha256(aad),
            ciphertext: ciphertext.toString("base64url"),
            iv: iv.toString("base64url"),
            authTag: cipher.getAuthTag().toString("base64url"),
          };
          atomicWrite(path, envelope);
          intent = { ...intent, phase: "candidate_persisted" };
          atomicWrite(intentPath, intent);
          if (faultAt === "after_candidate_persist") {
            simulatedPowerLoss = true;
            throw new Error("injected candidate put interruption:after_candidate_persist");
          }
          this.writeAdmissionAuthority(intent);
          rmSync(intentPath, { force: true });
          syncDirectory(this.root);
          committed = true;
          return { candidateId: candidate.candidateId, candidateHash: candidate.candidateHash };
        } finally {
          key.fill(0);
          plaintext.fill(0);
          if (!committed && !simulatedPowerLoss) {
            rmSync(path, { force: true });
            if (wrapped) await this.protector.destroy(wrappedKeyRef);
            rmSync(intentPath, { force: true });
            syncDirectory(this.root);
          }
        }
      }, new Date(validated.admittedAt));
    } finally {
      interactionLease.release();
    }
  }

  metadata(candidateId: string): Omit<StoredCandidateEnvelope, "ciphertext" | "iv" | "authTag" | "wrappedKey"> {
    this.assertAvailable(candidateId);
    const envelope = this.readEnvelope(candidateId);
    return {
      schemaVersion: envelope.schemaVersion,
      candidateId: envelope.candidateId,
      sessionEnvelopeId: envelope.sessionEnvelopeId,
      roomId: envelope.roomId,
      projectionId: envelope.projectionId,
      interactionId: envelope.interactionId,
      basisHash: envelope.basisHash,
      snapshotManifestHash: envelope.snapshotManifestHash,
      sessionReceiptHash: envelope.sessionReceiptHash,
      sourceDisclosureClass: envelope.sourceDisclosureClass,
      policyHash: envelope.policyHash,
      candidateHash: envelope.candidateHash,
      aadHash: envelope.aadHash,
      admittedAt: envelope.admittedAt,
      expiresAt: envelope.expiresAt,
    };
  }

  async [OWNER_REVIEW](input: {
    candidateId: string;
    userPresenceProof: string;
    now: Date;
  }): Promise<{ candidate: ResponseCandidate; envelopeHash: Hash }> {
    this.assertAvailable(input.candidateId);
    const initial = this.readEnvelope(input.candidateId);
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: initial.roomId,
      interactionId: initial.interactionId,
      operationClass: "response_prepare",
      now: input.now,
    });
    try {
      return await this.coordinator.run(initial.roomId, "candidate_review", async () => {
        this.assertAvailable(input.candidateId);
        const envelope = this.readEnvelope(input.candidateId);
        this.assertEnvelopeBinding(envelope, initial);
        if (Date.parse(envelope.expiresAt) <= input.now.getTime()) throw new Error("candidate_expired");
        const key = Buffer.from(await this.protector.unwrap(envelope.wrappedKey, input.userPresenceProof));
        try {
          // Unwrap may invoke an OS/user-presence boundary. Recheck the
          // tombstone and exact envelope while the same Room+Interaction
          // authorities are still held before exposing plaintext.
          this.assertAvailable(input.candidateId);
          const current = this.readEnvelope(input.candidateId);
          this.assertEnvelopeBinding(current, envelope);
          const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(current.iv, "base64url"));
          decipher.setAAD(aadBytes(current));
          decipher.setAuthTag(Buffer.from(current.authTag, "base64url"));
          const plaintext = Buffer.concat([
            decipher.update(Buffer.from(current.ciphertext, "base64url")),
            decipher.final(),
          ]);
          try {
            const candidate = validateResponseCandidateV1(JSON.parse(plaintext.toString("utf8")));
            this.reconcileCandidateFields(candidate, current);
            this.assertAvailable(input.candidateId);
            this.assertEnvelopeBinding(this.readEnvelope(input.candidateId), current);
            return { candidate, envelopeHash: canonicalSha256(current) };
          } finally {
            plaintext.fill(0);
          }
        } finally {
          key.fill(0);
        }
      }, input.now);
    } finally {
      interactionLease.release();
    }
  }

  async [OWNER_REPLACE](input: {
    candidate: ResponseCandidate;
    expectedEnvelopeHash: Hash;
    responseText: string;
    now: Date;
    faultAt?: CandidateReplaceFault;
  }): Promise<ResponseCandidate> {
    const currentCandidate = validateResponseCandidateV1(input.candidate);
    if (currentCandidate.responseText === input.responseText) throw new Error("candidate replacement must change response text");
    if (input.now.getTime() >= Date.parse(currentCandidate.expiresAt)) throw new Error("candidate_expired");
    const { candidateHash: _oldHash, candidateId: _oldId, responseText: _oldText, ...preserved } = currentCandidate;
    const successorPreimage: Omit<ResponseCandidate, "candidateHash"> = {
      ...preserved,
      candidateId: `candidate_${canonicalSha256({
        replacedCandidateHash: currentCandidate.candidateHash,
        responseText: input.responseText,
      }).slice(7, 39)}`,
      responseText: input.responseText,
    };
    const successor = validateResponseCandidateV1({
      ...successorPreimage,
      candidateHash: canonicalSha256(successorPreimage),
    });
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: currentCandidate.roomId,
      interactionId: currentCandidate.interactionId,
      operationClass: "response_prepare",
      now: input.now,
    });
    try {
      return await this.coordinator.run(currentCandidate.roomId, "candidate_review", async () => {
        this.assertAvailable(currentCandidate.candidateId);
        const currentEnvelope = this.readEnvelope(currentCandidate.candidateId);
        if (
          canonicalSha256(currentEnvelope) !== input.expectedEnvelopeHash
          || currentEnvelope.candidateHash !== currentCandidate.candidateHash
        ) throw new Error("candidate changed before replacement");
        const replacementPath = this.replacementJournalPath(currentCandidate.candidateId);
        const stagePath = this.replacementStagePath(successor.candidateId);
        if (
          existsSync(replacementPath)
          || existsSync(stagePath)
          || existsSync(this.candidatePath(successor.candidateId))
        ) throw new Error("candidate replacement already exists");

        const wrappedKeyRef = `key_${randomUUID().replaceAll("-", "")}`;
        let journal: CandidateReplacementJournalV1 = {
          schemaVersion: "local_candidate_replacement_journal.v1",
          oldCandidateId: currentCandidate.candidateId,
          oldCandidateHash: currentCandidate.candidateHash,
          newCandidateId: successor.candidateId,
          newCandidateHash: successor.candidateHash,
          roomId: currentCandidate.roomId,
          interactionId: currentCandidate.interactionId,
          wrappedKeyRef,
          phase: "planned",
          startedAt: input.now.toISOString(),
          admittedAt: successor.admittedAt,
          expiresAt: successor.expiresAt,
        };
        atomicWrite(replacementPath, journal);
        if (input.faultAt === "after_replacement_intent") {
          throw new Error("injected candidate replacement interruption:after_replacement_intent");
        }

        const plaintext = Buffer.from(canonicalJson(successor), "utf8");
        const key = randomBytes(32);
        const iv = randomBytes(12);
        try {
          const wrappedKey = await this.protector.wrap(key, wrappedKeyRef);
          if (wrappedKey !== wrappedKeyRef) {
            await this.protector.destroy(wrappedKey);
            throw new Error("key protector did not honor the journaled reference");
          }
          journal = { ...journal, phase: "key_wrapped" };
          atomicWrite(replacementPath, journal);
          if (input.faultAt === "after_successor_key_wrap") {
            throw new Error("injected candidate replacement interruption:after_successor_key_wrap");
          }
          const aad: CandidateAad = {
            schemaVersion: "local_encrypted_response_candidate.v1",
            candidateId: successor.candidateId,
            sessionEnvelopeId: successor.sessionEnvelopeId,
            roomId: successor.roomId,
            projectionId: successor.projectionId,
            interactionId: successor.interactionId,
            basisHash: successor.twinBasisHash,
            snapshotManifestHash: successor.snapshotManifestHash,
            sessionReceiptHash: successor.sessionReceiptHash,
            sourceDisclosureClass: successor.sourceDisclosureClass,
            policyHash: successor.policyHash,
            candidateHash: successor.candidateHash,
            wrappedKey: wrappedKeyRef,
            admittedAt: successor.admittedAt,
            expiresAt: successor.expiresAt,
          };
          const cipher = createCipheriv("aes-256-gcm", key, iv);
          cipher.setAAD(aadBytes(aad));
          const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
          atomicWrite(stagePath, {
            ...aad,
            aadHash: canonicalSha256(aad),
            ciphertext: ciphertext.toString("base64url"),
            iv: iv.toString("base64url"),
            authTag: cipher.getAuthTag().toString("base64url"),
          } satisfies StoredCandidateEnvelope);
          // Deliberately inject before the journal phase advances.  Recovery
          // must discover a staged ciphertext using the already-durable
          // intent, which models the formerly uncovered fsync crash window.
          if (input.faultAt === "after_successor_stage") {
            throw new Error("injected candidate replacement interruption:after_successor_stage");
          }
        } finally {
          key.fill(0);
          plaintext.fill(0);
        }
        journal = { ...journal, phase: "staged" };
        atomicWrite(replacementPath, journal);
        this.denyUnlocked(currentCandidate.candidateId, "owner_replaced", input.now);
        journal = { ...journal, phase: "old_denied" };
        atomicWrite(replacementPath, journal);
        if (input.faultAt === "after_old_deny") throw new Error("injected candidate replacement interruption:after_old_deny");
        renameSync(stagePath, this.candidatePath(successor.candidateId));
        syncDirectory(this.root);
        journal = { ...journal, phase: "successor_active" };
        atomicWrite(replacementPath, journal);
        if (input.faultAt === "after_successor_activate") throw new Error("injected candidate replacement interruption:after_successor_activate");
        this.writeAdmissionAuthorityFromReplacement(journal);
        await this.cleanupUnlocked(currentCandidate.candidateId, "owner_replaced", input.now);
        rmSync(replacementPath, { force: true });
        syncDirectory(this.root);
        return successor;
      }, input.now);
    } finally {
      interactionLease.release();
    }
  }

  async reconcileAdmission(
    candidateId: string,
    now = new Date(),
  ): Promise<{ candidateId: string; candidateHash: Hash; outcome: "committed" | "aborted" | "expired" }> {
    const initial = this.readAdmissionIntent(candidateId);
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: initial.roomId,
      interactionId: initial.interactionId,
      operationClass: "candidate_cleanup",
      now,
    });
    try {
      return await this.coordinator.run(initial.roomId, "candidate_cleanup", async () => {
        const intent = this.readAdmissionIntent(candidateId);
        if (canonicalSha256(intent) !== canonicalSha256(initial)) throw new Error("candidate admission intent changed");
        const candidatePath = this.candidatePath(candidateId);
        const expired = now.getTime() >= Date.parse(intent.expiresAt);
        if (existsSync(candidatePath)) {
          const envelope = this.readEnvelopeAt(candidateId, candidatePath);
          if (
            envelope.candidateHash !== intent.candidateHash
            || envelope.roomId !== intent.roomId
            || envelope.interactionId !== intent.interactionId
            || envelope.wrappedKey !== intent.wrappedKeyRef
          ) throw new Error("candidate admission envelope binding mismatch");
          if (expired) {
            this.writeAdmissionAuthority(intent);
            await this.cleanupUnlocked(candidateId, "candidate_expired", now);
          } else {
            this.writeAdmissionAuthority(intent);
          }
          rmSync(this.admissionIntentPath(candidateId), { force: true });
          syncDirectory(this.root);
          return {
            candidateId,
            candidateHash: intent.candidateHash,
            outcome: expired ? "expired" : "committed",
          };
        }
        await this.protector.destroy(intent.wrappedKeyRef);
        rmSync(this.admissionAuthorityPath(candidateId), { force: true });
        rmSync(this.admissionIntentPath(candidateId), { force: true });
        syncDirectory(this.root);
        return {
          candidateId,
          candidateHash: intent.candidateHash,
          outcome: expired ? "expired" : "aborted",
        };
      }, now);
    } finally {
      interactionLease.release();
    }
  }

  async reconcileReplacement(
    oldCandidateId: string,
    now = new Date(),
  ): Promise<{
    candidateId: string;
    candidateHash: Hash;
    outcome: "successor_active" | "old_retained" | "expired";
  }> {
    const initial = this.readReplacementJournal(oldCandidateId);
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: initial.roomId,
      interactionId: initial.interactionId,
      operationClass: "candidate_cleanup",
      now,
    });
    try {
      return await this.coordinator.run(initial.roomId, "candidate_cleanup", async () => {
        let journal = this.readReplacementJournal(oldCandidateId);
        if (canonicalSha256(journal) !== canonicalSha256(initial)) throw new Error("candidate replacement journal changed");
        const replacementPath = this.replacementJournalPath(oldCandidateId);
        const stagePath = this.replacementStagePath(journal.newCandidateId);
        const successorPath = this.candidatePath(journal.newCandidateId);
        if (now.getTime() >= Date.parse(journal.expiresAt)) {
          if (existsSync(stagePath) && existsSync(successorPath)) {
            throw new Error("candidate replacement stage is ambiguous");
          }
          if (existsSync(stagePath)) {
            const stagedEnvelope = this.readEnvelopeAt(journal.newCandidateId, stagePath);
            this.assertReplacementSuccessorBinding(stagedEnvelope, journal);
            await this.protector.destroy(journal.wrappedKeyRef);
            rmSync(stagePath, { force: true });
          } else if (existsSync(successorPath)) {
            const successorEnvelope = this.readEnvelope(journal.newCandidateId);
            this.assertReplacementSuccessorBinding(successorEnvelope, journal);
            await this.protector.destroy(journal.wrappedKeyRef);
            rmSync(successorPath, { force: true });
            rmSync(this.admissionAuthorityPath(journal.newCandidateId), { force: true });
          } else {
            await this.protector.destroy(journal.wrappedKeyRef);
          }
          if (existsSync(this.candidatePath(journal.oldCandidateId)) || existsSync(this.journalPath(journal.oldCandidateId))) {
            await this.cleanupUnlocked(journal.oldCandidateId, "candidate_expired", now);
          }
          rmSync(replacementPath, { force: true });
          syncDirectory(this.root);
          return { candidateId: journal.newCandidateId, candidateHash: journal.newCandidateHash, outcome: "expired" };
        }
        if (journal.phase === "planned" || journal.phase === "key_wrapped") {
          if (existsSync(successorPath)) throw new Error("candidate replacement stage is ambiguous");
          if (!existsSync(stagePath)) {
            await this.protector.destroy(journal.wrappedKeyRef);
            rmSync(replacementPath, { force: true });
            syncDirectory(this.root);
            const oldEnvelope = this.readEnvelope(journal.oldCandidateId);
            if (oldEnvelope.candidateHash !== journal.oldCandidateHash) {
              throw new Error("candidate replacement predecessor mismatch");
            }
            return {
              candidateId: journal.oldCandidateId,
              candidateHash: journal.oldCandidateHash,
              outcome: "old_retained",
            };
          }
          const stagedEnvelope = this.readEnvelopeAt(journal.newCandidateId, stagePath);
          this.assertReplacementSuccessorBinding(stagedEnvelope, journal);
          journal = { ...journal, phase: "staged" };
          atomicWrite(replacementPath, journal);
        }
        if (journal.phase === "staged") {
          const stagedEnvelope = this.readEnvelopeAt(journal.newCandidateId, stagePath);
          this.assertReplacementSuccessorBinding(stagedEnvelope, journal);
          this.denyUnlocked(journal.oldCandidateId, "owner_replaced", now);
          journal = { ...journal, phase: "old_denied" };
          atomicWrite(replacementPath, journal);
        }
        if (journal.phase === "old_denied") {
          if (existsSync(stagePath) === existsSync(successorPath)) {
            throw new Error("candidate replacement stage is ambiguous");
          }
          if (existsSync(stagePath)) {
            const stagedEnvelope = this.readEnvelopeAt(journal.newCandidateId, stagePath);
            this.assertReplacementSuccessorBinding(stagedEnvelope, journal);
            renameSync(stagePath, successorPath);
            syncDirectory(this.root);
          } else {
            this.assertReplacementSuccessorBinding(this.readEnvelope(journal.newCandidateId), journal);
          }
          journal = { ...journal, phase: "successor_active" };
          atomicWrite(replacementPath, journal);
        }
        if (journal.phase !== "successor_active") throw new Error("candidate replacement phase is invalid");
        if (existsSync(stagePath)) throw new Error("candidate replacement stage is ambiguous");
        const successorEnvelope = this.readEnvelope(journal.newCandidateId);
        this.assertReplacementSuccessorBinding(successorEnvelope, journal);
        this.writeAdmissionAuthorityFromReplacement(journal);
        await this.cleanupUnlocked(journal.oldCandidateId, "owner_replaced", now);
        rmSync(replacementPath, { force: true });
        syncDirectory(this.root);
        return {
          candidateId: journal.newCandidateId,
          candidateHash: journal.newCandidateHash,
          outcome: "successor_active",
        };
      }, now);
    } finally {
      interactionLease.release();
    }
  }

  async deny(candidateId: string, reason: CandidateDenyReason, now = new Date()): Promise<CandidateCleanupJournal | null> {
    assertCandidateDenyReason(reason);
    const binding = this.cleanupBinding(candidateId);
    if (!binding) return null;
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: binding.roomId,
      interactionId: binding.interactionId,
      operationClass: "candidate_cleanup",
      now,
    });
    try {
      return await this.coordinator.run(binding.roomId, "candidate_cleanup", () => this.denyUnlocked(candidateId, reason, now), now);
    } finally {
      interactionLease.release();
    }
  }

  async invalidateBasis(input: {
    candidateId: string;
    currentBasisHash: Hash;
    currentPolicyHash: Hash;
    currentSnapshotManifestHash: Hash | null;
    now?: Date;
  }): Promise<boolean> {
    const metadata = this.metadata(input.candidateId);
    if (
      metadata.basisHash === input.currentBasisHash
      && metadata.policyHash === input.currentPolicyHash
      && metadata.snapshotManifestHash === input.currentSnapshotManifestHash
    ) return false;
    await this.deny(input.candidateId, "basis_invalidated", input.now);
    return true;
  }

  async cleanup(
    candidateId: string,
    reason: CandidateDenyReason,
    now = new Date(),
    fault?: CandidateCleanupFault,
    context?: RoomMutationContext,
  ): Promise<void> {
    assertCandidateDenyReason(reason);
    const binding = this.cleanupBinding(candidateId);
    if (!binding) return;
    const interactionLease = this.coordinator.beginInteractionOperation({
      roomId: binding.roomId,
      interactionId: binding.interactionId,
      operationClass: "candidate_cleanup",
      now,
    });
    try {
      if (context) {
        this.coordinator.assertContext(context, binding.roomId);
        await this.cleanupUnlocked(candidateId, reason, now, fault);
      } else {
        await this.coordinator.run(binding.roomId, "candidate_cleanup", async () => {
          await this.cleanupUnlocked(candidateId, reason, now, fault);
        }, now);
      }
    } finally {
      interactionLease.release();
    }
  }

  async reconcile(candidateId: string, now = new Date()): Promise<void> {
    if (existsSync(this.admissionIntentPath(candidateId))) {
      await this.reconcileAdmission(candidateId, now);
      return;
    }
    if (existsSync(this.replacementJournalPath(candidateId))) {
      await this.reconcileReplacement(candidateId, now);
      return;
    }
    if (!existsSync(this.journalPath(candidateId))) return;
    const journal = this.readJournal(candidateId);
    const stale = this.coordinator.interactionLeases.inspect(journal.roomId, journal.interactionId);
    if (stale) this.coordinator.interactionLeases.recoverStale(journal.roomId, journal.interactionId);
    await this.cleanup(candidateId, journal.reason, now);
  }

  async reconcilePending(now = new Date()): Promise<string[]> {
    if (!existsSync(this.root)) return [];
    const reconciled: string[] = [];
    const names = readdirSync(this.root).sort();
    for (const name of names) {
      const match = /^(candidate_[A-Za-z0-9_-]{16,128})\.admission\.json$/u.exec(name);
      if (!match?.[1]) continue;
      await this.reconcileAdmission(match[1], now);
      reconciled.push(match[1]);
    }
    for (const name of names) {
      const match = /^(candidate_[A-Za-z0-9_-]{16,128})\.replacement\.json$/u.exec(name);
      if (!match?.[1] || !existsSync(this.replacementJournalPath(match[1]))) continue;
      await this.reconcileReplacement(match[1], now);
      reconciled.push(match[1]);
    }
    return reconciled;
  }

  candidateIds(): string[] {
    if (!existsSync(this.root)) return [];
    const ids = new Set<string>();
    for (const name of readdirSync(this.root)) {
      const match = /^(candidate_[A-Za-z0-9_-]{16,128})\.(?:candidate|cleanup)\.json$/u.exec(name);
      if (match?.[1]) ids.add(match[1]);
    }
    return [...ids].sort();
  }

  async cleanupMatching(input: {
    roomId: string;
    interactionId?: string;
    projectionId?: string;
    candidateHash?: Hash;
    reason: CandidateDenyReason;
    now?: Date;
    context?: RoomMutationContext;
  }): Promise<string[]> {
    assertCandidateDenyReason(input.reason);
    const cleaned: string[] = [];
    for (const candidateId of this.candidateIds()) {
      const journalPath = this.journalPath(candidateId);
      if (existsSync(journalPath)) {
        const journal = this.readJournal(candidateId);
        if (journal.roomId !== input.roomId) continue;
        if (input.interactionId !== undefined && journal.interactionId !== input.interactionId) continue;
        await this.cleanup(candidateId, journal.reason, input.now, undefined, input.context);
        cleaned.push(candidateId);
        continue;
      }
      const envelope = this.readEnvelope(candidateId);
      if (envelope.roomId !== input.roomId) continue;
      if (input.interactionId !== undefined && envelope.interactionId !== input.interactionId) continue;
      if (input.projectionId !== undefined && envelope.projectionId !== input.projectionId) continue;
      if (input.candidateHash !== undefined && envelope.candidateHash !== input.candidateHash) continue;
      await this.cleanup(candidateId, input.reason, input.now, undefined, input.context);
      cleaned.push(candidateId);
    }
    return cleaned;
  }

  hasCiphertext(candidateId: string): boolean {
    return existsSync(this.candidatePath(candidateId));
  }

  hasCleanupJournal(candidateId: string): boolean {
    return existsSync(this.journalPath(candidateId));
  }

  hasCleanupReceipt(candidateId: string): boolean {
    return this.cleanupReceipt(candidateId) !== null;
  }

  assertProtectedPermissions(): void {
    if (!existsSync(this.root)) return;
    const mode = lstatSync(this.root).mode & 0o777;
    if ((mode & 0o077) !== 0) throw new Error("candidate root permissions are too broad");
  }

  private assertAvailable(candidateId: string): void {
    if (
      existsSync(this.admissionIntentPath(candidateId))
      || existsSync(this.replacementJournalPath(candidateId))
      || this.isPendingReplacementSuccessor(candidateId)
      || existsSync(this.journalPath(candidateId))
      || !existsSync(this.candidatePath(candidateId))
    ) {
      throw new Error("candidate_unavailable");
    }
    this.assertCandidateAuthority(this.readEnvelope(candidateId), this.readAdmissionAuthority(candidateId));
  }

  private cleanupBinding(candidateId: string): { roomId: string; interactionId: string } | null {
    if (existsSync(this.journalPath(candidateId))) {
      const journal = this.readJournal(candidateId);
      return { roomId: journal.roomId, interactionId: journal.interactionId };
    }
    if (existsSync(this.candidatePath(candidateId))) {
      const envelope = this.readEnvelope(candidateId);
      const authority = this.readAdmissionAuthority(candidateId);
      this.assertCandidateAuthority(envelope, authority);
      return { roomId: authority.roomId, interactionId: authority.interactionId };
    }
    if (this.hasCleanupReceipt(candidateId)) return null;
    throw new Error("candidate_unavailable");
  }

  private denyUnlocked(candidateId: string, reason: CandidateDenyReason, now: Date): CandidateCleanupJournal | null {
    const journalPath = this.journalPath(candidateId);
    if (existsSync(journalPath)) return this.readJournal(candidateId);
    if (!existsSync(this.candidatePath(candidateId))) {
      if (this.hasCleanupReceipt(candidateId)) return null;
      throw new Error("candidate_unavailable");
    }
    const envelope = this.readEnvelope(candidateId);
    const authority = this.readAdmissionAuthority(candidateId);
    this.assertCandidateAuthority(envelope, authority);
    const journal: CandidateCleanupJournal = {
      schemaVersion: "r4.candidate-cleanup-journal.v1",
      candidateId,
      roomId: authority.roomId,
      interactionId: authority.interactionId,
      wrappedKeyRef: authority.wrappedKeyRef,
      reason,
      phase: "denied",
      startedAt: now.toISOString(),
    };
    assertBodyFree(journal);
    atomicWrite(journalPath, journal);
    return journal;
  }

  private async cleanupUnlocked(candidateId: string, reason: CandidateDenyReason, now: Date, fault?: CandidateCleanupFault): Promise<void> {
    const journalPath = this.journalPath(candidateId);
    let journal = this.denyUnlocked(candidateId, reason, now);
    if (journal === null) return;
    if (fault === "after_deny") throw new Error("injected candidate cleanup interruption:after_deny");
    await this.protector.destroy(journal.wrappedKeyRef);
    if (fault === "after_key_destroy") throw new Error("injected candidate cleanup interruption:after_key_destroy");
    rmSync(this.candidatePath(candidateId), { force: true });
    rmSync(this.admissionAuthorityPath(candidateId), { force: true });
    syncDirectory(this.root);
    journal = { ...journal, phase: "ciphertext_removed" };
    atomicWrite(journalPath, journal);
    if (fault === "after_ciphertext_remove") throw new Error("injected candidate cleanup interruption:after_ciphertext_remove");
    if (!this.hasCleanupReceipt(candidateId)) {
      const receipt = {
        schemaVersion: "r4.candidate-cleanup-receipt.v1",
        receiptId: `rcp_${canonicalSha256({ candidateId, startedAt: journal.startedAt, reason: journal.reason }).slice(7, 39)}`,
        candidateId,
        roomId: journal.roomId,
        interactionId: journal.interactionId,
        reason: journal.reason,
        completedAt: now.toISOString(),
      };
      assertBodyFree(receipt);
      appendDurable(this.receiptPath(), receipt);
    }
    if (fault === "after_receipt_persist") throw new Error("injected candidate cleanup interruption:after_receipt_persist");
    rmSync(journalPath, { force: true });
    syncDirectory(this.root);
  }

  private cleanupReceipt(candidateId: string): Record<string, unknown> | null {
    if (!existsSync(this.receiptPath())) return null;
    let found: Record<string, unknown> | null = null;
    for (const line of readFileSync(this.receiptPath(), "utf8").split("\n")) {
      if (!line) continue;
      const value = parseExactPersistedRecord(line, [
        "schemaVersion", "receiptId", "candidateId", "roomId", "interactionId", "reason", "completedAt",
      ], "candidate cleanup receipt ledger is malformed");
      if (
        value.schemaVersion !== "r4.candidate-cleanup-receipt.v1"
        || !isPrefixedId(value.receiptId, "rcp")
        || !isPrefixedId(value.candidateId, "candidate")
        || !isPrefixedId(value.roomId, "room")
        || !isPrefixedId(value.interactionId, "interaction")
        || typeof value.reason !== "string"
        || !isExactIsoTimestamp(value.completedAt)
      ) throw new Error("candidate cleanup receipt ledger is malformed");
      assertCandidateDenyReason(value.reason);
      assertBodyFree(value);
      if (value.candidateId === candidateId) {
        if (found) throw new Error("duplicate candidate cleanup receipt");
        found = value;
      }
    }
    return found;
  }

  private readJournal(candidateId: string): CandidateCleanupJournal {
    const value = parseExactPersistedRecord(readFileSync(this.journalPath(candidateId), "utf8"), [
      "schemaVersion", "candidateId", "roomId", "interactionId", "wrappedKeyRef", "reason", "phase", "startedAt",
    ], "candidate cleanup journal is malformed") as unknown as CandidateCleanupJournal;
    if (
      value.schemaVersion !== "r4.candidate-cleanup-journal.v1"
      || value.candidateId !== candidateId
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isPrefixedId(value.wrappedKeyRef, "key")
      || (value.phase !== "denied" && value.phase !== "ciphertext_removed")
      || !isExactIsoTimestamp(value.startedAt)
    ) throw new Error("candidate cleanup journal is malformed");
    assertCandidateDenyReason(value.reason);
    assertBodyFree(value);
    return value;
  }

  private readReplacementJournal(oldCandidateId: string): CandidateReplacementJournalV1 {
    const value = parseExactPersistedRecord(
      readFileSync(this.replacementJournalPath(oldCandidateId), "utf8"),
      [
        "schemaVersion", "oldCandidateId", "oldCandidateHash", "newCandidateId", "newCandidateHash",
        "roomId", "interactionId", "wrappedKeyRef", "phase", "startedAt", "admittedAt", "expiresAt",
      ],
      "candidate replacement journal is malformed",
    ) as unknown as CandidateReplacementJournalV1;
    if (
      value.schemaVersion !== "local_candidate_replacement_journal.v1"
      || value.oldCandidateId !== oldCandidateId
      || !isPrefixedId(value.newCandidateId, "candidate")
      || !/^sha256:[a-f0-9]{64}$/u.test(value.oldCandidateHash)
      || !/^sha256:[a-f0-9]{64}$/u.test(value.newCandidateHash)
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isPrefixedId(value.wrappedKeyRef, "key")
      || !(["planned", "key_wrapped", "staged", "old_denied", "successor_active"] as const).includes(value.phase)
      || !isExactIsoTimestamp(value.startedAt)
      || !isExactIsoTimestamp(value.admittedAt)
      || !isExactIsoTimestamp(value.expiresAt)
      || Date.parse(value.expiresAt) <= Date.parse(value.admittedAt)
    ) throw new Error("candidate replacement journal is malformed");
    assertBodyFree(value);
    return value;
  }

  private readAdmissionIntent(candidateId: string): CandidateAdmissionIntentV1 {
    const value = parseExactPersistedRecord(
      readFileSync(this.admissionIntentPath(candidateId), "utf8"),
      [
        "schemaVersion", "candidateId", "candidateHash", "roomId", "interactionId", "wrappedKeyRef",
        "phase", "startedAt", "expiresAt",
      ],
      "candidate admission intent is malformed",
    ) as unknown as CandidateAdmissionIntentV1;
    if (
      value.schemaVersion !== "local_candidate_admission_intent.v1"
      || value.candidateId !== candidateId
      || !/^sha256:[a-f0-9]{64}$/u.test(value.candidateHash)
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isPrefixedId(value.wrappedKeyRef, "key")
      || !(["planned", "key_wrapped", "candidate_persisted"] as const).includes(value.phase)
      || !isExactIsoTimestamp(value.startedAt)
      || !isExactIsoTimestamp(value.expiresAt)
      || Date.parse(value.expiresAt) <= Date.parse(value.startedAt)
    ) throw new Error("candidate admission intent is malformed");
    assertBodyFree(value);
    return value;
  }

  private writeAdmissionAuthority(intent: CandidateAdmissionIntentV1): void {
    const authority: CandidateAdmissionAuthorityV1 = {
      schemaVersion: "local_candidate_admission_authority.v1",
      candidateId: intent.candidateId,
      candidateHash: intent.candidateHash,
      roomId: intent.roomId,
      interactionId: intent.interactionId,
      wrappedKeyRef: intent.wrappedKeyRef,
      admittedAt: intent.startedAt,
      expiresAt: intent.expiresAt,
    };
    const path = this.admissionAuthorityPath(intent.candidateId);
    if (existsSync(path)) {
      if (canonicalSha256(this.readAdmissionAuthority(intent.candidateId)) !== canonicalSha256(authority)) {
        throw new Error("candidate admission authority binding mismatch");
      }
      return;
    }
    atomicWrite(path, authority);
  }

  private writeAdmissionAuthorityFromReplacement(journal: CandidateReplacementJournalV1): void {
    this.writeAdmissionAuthority({
      schemaVersion: "local_candidate_admission_intent.v1",
      candidateId: journal.newCandidateId,
      candidateHash: journal.newCandidateHash,
      roomId: journal.roomId,
      interactionId: journal.interactionId,
      wrappedKeyRef: journal.wrappedKeyRef,
      phase: "candidate_persisted",
      startedAt: journal.admittedAt,
      expiresAt: journal.expiresAt,
    });
  }

  private readAdmissionAuthority(candidateId: string): CandidateAdmissionAuthorityV1 {
    const value = parseExactPersistedRecord(
      readFileSync(this.admissionAuthorityPath(candidateId), "utf8"),
      [
        "schemaVersion", "candidateId", "candidateHash", "roomId", "interactionId", "wrappedKeyRef",
        "admittedAt", "expiresAt",
      ],
      "candidate admission authority is malformed",
    ) as unknown as CandidateAdmissionAuthorityV1;
    if (
      value.schemaVersion !== "local_candidate_admission_authority.v1"
      || value.candidateId !== candidateId
      || !isSha256(value.candidateHash)
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isPrefixedId(value.wrappedKeyRef, "key")
      || !isExactIsoTimestamp(value.admittedAt)
      || !isExactIsoTimestamp(value.expiresAt)
      || Date.parse(value.expiresAt) <= Date.parse(value.admittedAt)
    ) throw new Error("candidate admission authority is malformed");
    assertBodyFree(value);
    return value;
  }

  private assertCandidateAuthority(
    envelope: StoredCandidateEnvelope,
    authority: CandidateAdmissionAuthorityV1,
  ): void {
    if (
      envelope.candidateId !== authority.candidateId
      || envelope.candidateHash !== authority.candidateHash
      || envelope.roomId !== authority.roomId
      || envelope.interactionId !== authority.interactionId
      || envelope.wrappedKey !== authority.wrappedKeyRef
      || envelope.admittedAt !== authority.admittedAt
      || envelope.expiresAt !== authority.expiresAt
    ) throw new Error("candidate admission authority binding mismatch");
  }

  private assertReplacementSuccessorBinding(
    envelope: StoredCandidateEnvelope,
    journal: CandidateReplacementJournalV1,
  ): void {
    if (
      envelope.candidateId !== journal.newCandidateId
      || envelope.candidateHash !== journal.newCandidateHash
      || envelope.roomId !== journal.roomId
      || envelope.interactionId !== journal.interactionId
      || envelope.wrappedKey !== journal.wrappedKeyRef
      || envelope.admittedAt !== journal.admittedAt
      || envelope.expiresAt !== journal.expiresAt
    ) throw new Error("candidate replacement successor mismatch");
  }

  private isPendingReplacementSuccessor(candidateId: string): boolean {
    if (!existsSync(this.root)) return false;
    for (const name of readdirSync(this.root)) {
      const match = /^(candidate_[A-Za-z0-9_-]{16,128})\.replacement\.json$/u.exec(name);
      if (!match?.[1]) continue;
      if (this.readReplacementJournal(match[1]).newCandidateId === candidateId) return true;
    }
    return false;
  }

  private readEnvelope(candidateId: string): StoredCandidateEnvelope {
    return this.readEnvelopeAt(candidateId, this.candidatePath(candidateId));
  }

  private readEnvelopeAt(candidateId: string, path: string): StoredCandidateEnvelope {
    const expected = [
      "aadHash", "admittedAt", "authTag", "basisHash", "candidateHash", "candidateId", "ciphertext",
      "expiresAt", "interactionId", "iv", "policyHash", "projectionId", "roomId", "schemaVersion",
      "sessionEnvelopeId", "sessionReceiptHash", "snapshotManifestHash", "sourceDisclosureClass", "wrappedKey",
    ];
    const value = parseExactPersistedRecord(
      readFileSync(path, "utf8"), expected, "encrypted candidate contract failed",
    ) as unknown as StoredCandidateEnvelope;
    if (
      value.schemaVersion !== "local_encrypted_response_candidate.v1"
      || value.candidateId !== candidateId
      || (value.sessionEnvelopeId !== null && !isPrefixedId(value.sessionEnvelopeId, "session"))
      || !isPrefixedId(value.roomId, "room")
      || !isPrefixedId(value.projectionId, "proj")
      || !isPrefixedId(value.interactionId, "interaction")
      || !isSha256(value.basisHash)
      || (value.snapshotManifestHash !== null && !isSha256(value.snapshotManifestHash))
      || !isSha256(value.sessionReceiptHash)
      || (
        value.sourceDisclosureClass !== "fresh_native_sanitized_snapshot_owner_reviewed"
        && value.sourceDisclosureClass !== "manual_owner_authored"
      )
      || (
        value.sourceDisclosureClass === "fresh_native_sanitized_snapshot_owner_reviewed"
          ? value.sessionEnvelopeId === null || value.snapshotManifestHash === null
          : value.sessionEnvelopeId !== null || value.snapshotManifestHash !== null
      )
      || !isSha256(value.policyHash)
      || !isSha256(value.candidateHash)
      || !isSha256(value.aadHash)
      || !isPrefixedId(value.wrappedKey, "key")
      || !isCanonicalBase64Url(value.ciphertext)
      || !isCanonicalBase64Url(value.iv, 12)
      || !isCanonicalBase64Url(value.authTag, 16)
      || !isExactIsoTimestamp(value.admittedAt)
      || !isExactIsoTimestamp(value.expiresAt)
      || Date.parse(value.expiresAt) <= Date.parse(value.admittedAt)
      || value.aadHash !== canonicalSha256(candidateAad(value))
    ) throw new Error("encrypted candidate contract failed");
    return value;
  }

  private assertEnvelopeBinding(current: StoredCandidateEnvelope, expected: StoredCandidateEnvelope): void {
    if (canonicalJson(current) !== canonicalJson(expected)) throw new Error("candidate envelope changed during review");
  }

  private reconcileCandidateFields(candidate: ResponseCandidate, envelope: StoredCandidateEnvelope): void {
    if (
      candidate.candidateId !== envelope.candidateId
      || candidate.sessionEnvelopeId !== envelope.sessionEnvelopeId
      || candidate.roomId !== envelope.roomId
      || candidate.projectionId !== envelope.projectionId
      || candidate.interactionId !== envelope.interactionId
      || candidate.twinBasisHash !== envelope.basisHash
      || candidate.snapshotManifestHash !== envelope.snapshotManifestHash
      || candidate.sessionReceiptHash !== envelope.sessionReceiptHash
      || candidate.sourceDisclosureClass !== envelope.sourceDisclosureClass
      || candidate.policyHash !== envelope.policyHash
      || candidate.candidateHash !== envelope.candidateHash
      || candidate.admittedAt !== envelope.admittedAt
      || candidate.expiresAt !== envelope.expiresAt
    ) throw new Error("candidate envelope/plaintext binding mismatch");
  }
}

export function createCandidateOwnerReviewPort(input: {
  store: FileCandidateStore;
  confirmUserPresence: () => Promise<string> | string;
}): CandidateOwnerReviewPort {
  const read = async (candidateId: string, now = new Date()): Promise<ResponseCandidate> => {
    const proof = await input.confirmUserPresence();
    if (typeof proof !== "string" || proof.length === 0) throw new Error("local user presence required");
    return (await input.store[OWNER_REVIEW]({ candidateId, userPresenceProof: proof, now })).candidate;
  };
  return Object.freeze({
    read: async ({ candidateId, now }: { candidateId: string; now?: Date }) => await read(candidateId, now),
    approveExact: async (request: {
      candidateId: string;
      expectedHash: Hash;
      now: Date;
      expiresAt: Date;
    }): Promise<ArtifactApproval> => {
      const candidate = await read(request.candidateId, request.now);
      if (candidate.candidateHash !== request.expectedHash) throw new Error("candidate changed before approval");
      if (request.expiresAt.getTime() <= request.now.getTime()) throw new Error("approval expiry is invalid");
      return validateArtifactApprovalV1({
        schemaVersion: "artifact_approval.v1",
        approvalId: `approval_${randomUUID().replaceAll("-", "")}`,
        artifactClass: "response",
        artifactHash: candidate.candidateHash,
        roomId: candidate.roomId,
        projectionId: candidate.projectionId,
        interactionId: candidate.interactionId,
        basisHash: candidate.twinBasisHash,
        policyHash: candidate.policyHash,
        operationId: `op_${randomUUID().replaceAll("-", "")}`,
        approvedAt: request.now.toISOString(),
        expiresAt: request.expiresAt.toISOString(),
      });
    },
    replaceResponseText: async (request: {
      candidateId: string;
      expectedHash: Hash;
      responseText: string;
      now: Date;
      faultAt?: CandidateReplaceFault;
    }): Promise<ResponseCandidate> => {
      const proof = await input.confirmUserPresence();
      if (typeof proof !== "string" || proof.length === 0) throw new Error("local user presence required");
      const reviewed = await input.store[OWNER_REVIEW]({
        candidateId: request.candidateId,
        userPresenceProof: proof,
        now: request.now,
      });
      if (reviewed.candidate.candidateHash !== request.expectedHash) throw new Error("candidate changed before replacement");
      return await input.store[OWNER_REPLACE]({
        candidate: reviewed.candidate,
        expectedEnvelopeHash: reviewed.envelopeHash,
        responseText: request.responseText,
        now: request.now,
        faultAt: request.faultAt,
      });
    },
  });
}
