export interface OwnerFrame {
  activeIntent: string;
  nextMove: string;
  unresolved: string[];
}

export interface SourceBoundary {
  root: string;
  includePaths: string[];
  excludeNames: string[];
  maxFileBytes: number;
  followSymlinks: false;
}

export interface WorkspaceContract {
  schemaVersion: "1";
  workspaceId: string;
  name: string;
  createdAt: string;
  source: SourceBoundary;
  ownerFrame: OwnerFrame;
}

export interface EvidenceRecord {
  relativePath: string;
  contentHash: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface SourceChanges {
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface TwinRevisionBase {
  workspaceId: string;
  revision: number;
  previousRevision: number | null;
  observedAt: string;
  workspaceContractHash: string;
  evidence: EvidenceRecord[];
  changes: SourceChanges;
  ownerFrame: OwnerFrame;
  warnings: string[];
}

export interface TwinRevisionV1 extends TwinRevisionBase {
  schemaVersion: "1";
}

export type RelationType = "pattern" | "tension" | "trajectory" | "unfinished";
export type UncertaintyLevel = "low" | "medium" | "high";
export type ReflectionStatus = "inferred" | "corrected" | "superseded" | "invalidated";

export interface GitLineEvidence {
  schemaVersion: "1";
  evidenceId: string;
  timepointId: "earlier" | "later";
  commit: string;
  committedAt: string;
  relativePath: string;
  blobHash: string;
  lineStart: number;
  lineEnd: number;
  excerptHash: string;
}

export interface ContextDocument {
  timepointId: "earlier" | "later";
  commit: string;
  committedAt: string;
  relativePath: string;
  blobHash: string;
  sizeBytes: number;
  body: string;
}

export interface ActiveCorrectionContext {
  correctionId: string;
  targetReflectionId: string;
  correctedReflectionId: string;
  correctionText: string;
  correctedAt: string;
}

export interface ContextPacket {
  schemaVersion: "1";
  packetId: string;
  createdAt: string;
  baseTwinRevision: number;
  ownerFrame: OwnerFrame;
  task: string;
  documents: ContextDocument[];
  evidence: GitLineEvidence[];
  activeCorrections: ActiveCorrectionContext[];
  allowedEvidenceIds: string[];
  constraints: string[];
}

export interface ReflectionProposal {
  schemaVersion: "1";
  proposalId: string;
  baseTwinRevision: number;
  claim: string;
  relationType: RelationType;
  evidenceIds: string[];
  uncertainty: {
    level: UncertaintyLevel;
    rationale: string;
  };
  alternativeExplanation: string;
  implication: string;
  ownerQuestion: string;
}

export interface RuntimeAuditSummary {
  eventCount: number;
  itemTypes: string[];
  toolEventCount: number;
  turnCompleted: boolean;
  inputTokens: number;
  outputTokens: number;
}

export interface RuntimeReceipt {
  receiptId: string;
  adapter: "codex-exec";
  cliVersion: string;
  model: string;
  packetHash: string;
  proposalHash: string;
  baseTwinRevision: number;
  validationResult: "accepted";
  completedAt: string;
  audit: RuntimeAuditSummary;
}

export interface ReflectionRecord {
  reflectionId: string;
  status: ReflectionStatus;
  authoredBy: "codex" | "owner";
  baseTwinRevision: number;
  claim: string;
  relationType: RelationType;
  evidence: GitLineEvidence[];
  uncertainty: ReflectionProposal["uncertainty"] | null;
  alternativeExplanation: string | null;
  implication: string;
  ownerQuestion: string | null;
  proposalId: string | null;
  runtimeReceiptId: string | null;
  dependentOutputIds: string[];
  supersedesReflectionId: string | null;
  supersededByReflectionId: string | null;
  createdAt: string;
}

export interface CorrectionRecord {
  correctionId: string;
  targetReflectionId: string;
  correctedReflectionId: string;
  correctionText: string;
  authority: "owner";
  baseTwinRevision: number;
  correctedAt: string;
}

export interface InvalidationRecord {
  invalidationId: string;
  targetType: "derived-output";
  targetId: string;
  causedByCorrectionId: string;
  reason: string;
  invalidatedAt: string;
}

export interface CognitionState {
  reflections: ReflectionRecord[];
  corrections: CorrectionRecord[];
  invalidations: InvalidationRecord[];
  runtimeReceipts: RuntimeReceipt[];
}

export interface TwinRevisionV2 extends TwinRevisionBase {
  schemaVersion: "2";
  cognition: CognitionState;
}

export type TwinRevision = TwinRevisionV1 | TwinRevisionV2;

export interface HeadRecord {
  schemaVersion: "1";
  revision: number;
  file: string;
  contentHash: string;
}

export interface PendingTransition {
  schemaVersion: "1";
  revision: TwinRevision;
  view: string;
}

export interface ObservationResult {
  changed: boolean;
  revision: TwinRevision;
  view: string;
}

export interface ContextPacketBuild {
  packet: ContextPacket;
  packetHash: string;
  manifest: {
    packetId: string;
    packetHash: string;
    baseTwinRevision: number;
    documents: Omit<ContextDocument, "body">[];
    evidence: GitLineEvidence[];
    activeCorrectionCount: number;
    transmittedSourceBytes: number;
  };
}

export interface RuntimeProposalResult {
  proposal: ReflectionProposal;
  cliVersion: string;
  model: string;
  completedAt: string;
  audit: RuntimeAuditSummary;
}
