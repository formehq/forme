import type {
  ArtifactApprovalV1,
  DispatchPermitV1,
  FreshCycleReservationV1,
  ResponseCandidateV1,
  ResponseSourcePolicyV1,
  ResponseSourceSnapshotV1,
  CursorGoneV1,
  RoomEventAckReceiptV1,
  RoomEventAckV1,
  RoomEventBatchV1,
  RoomEventV1,
  SessionBudgetV1,
  SessionReceiptV1,
  Sha256,
  SnapshotFileV1,
} from "../../r4-protocol/src/types.ts";
import type { RoomMutationContext } from "./coordinator.ts";

export type Hash = Sha256;
export type ResponseCandidate = ResponseCandidateV1;
export type ArtifactApproval = ArtifactApprovalV1;
export type DispatchPermit = DispatchPermitV1;
export type FreshCycleReservation = FreshCycleReservationV1;
export type SessionBudget = SessionBudgetV1;
export type SessionReceipt = SessionReceiptV1;

export type BodyFreeRoomEvent = RoomEventV1;
export type RoomEventBatch = RoomEventBatchV1;
export type CursorGone = CursorGoneV1;
export type AckResult = RoomEventAckReceiptV1;

export interface AckOutboxEntry {
  schemaVersion: "local_room_event_ack_outbox.v1";
  ack: RoomEventAckV1;
  serverReceiptId: string | null;
}

export interface BodyFreeReceipt {
  schemaVersion: "r4.body-free-receipt.v1";
  receiptId: string;
  roomId: string;
  operation: string;
  objectId: string | null;
  requestHash: Hash;
  outcome: "accepted" | "no_op" | "rejected" | "unavailable" | "recovered";
  errorCode: string | null;
  committedAt: string;
}

export interface BodyFreeRoomLedger {
  schemaVersion: "r4.local-room-ledger.v1";
  roomId: string;
  bindingId: string;
  cursor: number;
  highWater: number;
  bindingExpiresAt: string;
  bindingRevokedAt: string | null;
  events: BodyFreeRoomEvent[];
  ackOutbox: AckOutboxEntry[];
  receipts: BodyFreeReceipt[];
  tombstoneIds: string[];
  gapWarning: {
    earliestReplayableSequence: number;
    observedAt: string;
  } | null;
  quarantine: {
    errorCode: string;
    eventId: string | null;
    observedAt: string;
  } | null;
  cleanupRequired: boolean;
  version: number;
}

export interface RoomSyncPort {
  fetchEvents(roomId: string, afterSequence: number): Promise<RoomEventBatch | CursorGone>;
  acknowledge(request: RoomEventAckV1): Promise<AckResult>;
}

/** Runs after durable event persistence and before ACK/cursor advancement. */
export interface RoomEventLifecycle {
  apply(event: RoomEventV1, now: Date, context?: RoomMutationContext): Promise<void>;
  applyTombstone?(roomId: string, tombstoneId: string, now: Date, context?: RoomMutationContext): Promise<void>;
}

export interface RoomStatusPort {
  inspectRoom(roomId: string): Promise<{
    roomId: string;
    roomVersion: number;
    lifecycle: string;
    projectionId: string | null;
    projectionVersion: number | null;
  }>;
}

export type SyncFaultPoint =
  | "before_fetch"
  | "after_fetch"
  | "before_event_persist"
  | "after_event_persist"
  | "before_ack"
  | "after_ack"
  | "before_ack_receipt_persist"
  | "after_ack_receipt_persist"
  | "before_cursor_persist"
  | "after_cursor_persist";

export interface SyncOptions {
  now?: () => Date;
  faultAt?: SyncFaultPoint;
}

export interface StoredCandidateEnvelope {
  schemaVersion: "local_encrypted_response_candidate.v1";
  candidateId: string;
  sessionEnvelopeId: string | null;
  roomId: string;
  projectionId: string;
  interactionId: string;
  basisHash: Hash;
  snapshotManifestHash: Hash | null;
  sessionReceiptHash: Hash;
  sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed" | "manual_owner_authored";
  policyHash: Hash;
  candidateHash: Hash;
  aadHash: Hash;
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedKey: string;
  admittedAt: string;
  expiresAt: string;
}

export type CandidateDenyReason =
  | "owner_denied"
  | "owner_replaced"
  | "basis_invalidated"
  | "interaction_terminal"
  | "projection_terminal"
  | "response_terminal"
  | "room_terminal"
  | "cursor_tombstone"
  | "published"
  | "candidate_expired";

export interface CandidateCleanupJournal {
  schemaVersion: "r4.candidate-cleanup-journal.v1";
  candidateId: string;
  roomId: string;
  interactionId: string;
  wrappedKeyRef: string;
  reason: CandidateDenyReason;
  phase: "denied" | "ciphertext_removed";
  startedAt: string;
}

export interface KeyProtector {
  /**
   * Persist `key` under the caller-chosen reference.  The reference is chosen
   * and journaled before this call so a machine crash can never create an
   * undiscoverable Keychain/keystore entry.
   */
  wrap(key: Uint8Array, reference: string): Promise<string>;
  unwrap(wrapped: string, userPresenceProof: string): Promise<Uint8Array>;
  destroy(wrapped: string): Promise<void>;
}

export interface SnapshotFile extends SnapshotFileV1 {
  text: string;
}

/**
 * Ephemeral in-memory view used by the Broker. `manifest` and `policy` are the
 * only persisted/transmitted contracts; source text is never part of a second
 * wire schema.
 */
export interface ResponseSourceSnapshot {
  manifest: ResponseSourceSnapshotV1;
  policy: ResponseSourcePolicyV1;
  files: readonly SnapshotFile[];
}

export interface SnapshotAccessAggregate {
  queryCount: number;
  resultCount: number;
  resultBytes: number;
  accessDigest: Hash;
}

export interface BrokerReadResult {
  path: string;
  lineStart: number;
  lineEnd: number;
  text: string;
}

export interface BrokerSearchMatch {
  path: string;
  line: number;
  excerpt: string;
}

export interface FreshSessionEvent {
  type: "thread_started" | "turn_started" | "item_completed" | "turn_completed" | "model_rerouted" | "tool_failed";
  threadId: string;
  turnId: string | null;
  item?: {
    itemType: "agent_message" | "coordination";
    phase: "final_answer" | "commentary" | "none";
    text: string;
  };
  turnStatus?: "completed" | "failed" | "interrupted";
  provider?: string;
  model?: string;
}
