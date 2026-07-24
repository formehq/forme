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

export type ActionKind = "render_next_move_brief.v1";
export type ActionProposalStatus = "proposed" | "approved" | "executed" | "rolled-back" | "invalidated" | "indeterminate";

export interface ActionContextPacket {
  schemaVersion: "1";
  packetId: string;
  createdAt: string;
  baseTwinRevision: number;
  ownerFrame: OwnerFrame;
  actionGoal: string;
  correctedReflection: {
    reflectionId: string;
    claim: string;
    relationType: RelationType;
    implication: string;
    evidence: GitLineEvidence[];
    correctionId: string;
    correctedAt: string;
  };
  capability: {
    actionKind: ActionKind;
    targetPath: "README.md";
    markerId: "forme:r3-action";
  };
  constraints: string[];
}

export interface ActionIntentProposalV1 {
  schemaVersion: "1";
  proposalId: string;
  baseTwinRevision: number;
  actionKind: ActionKind;
  rationale: string;
  title: string;
  whyNow: string;
  nextMove: string;
  successCheck: string;
  ownerChallenge: string;
}

export type ActionProposalMode = "recommend" | "ask_owner";
export type RecommendationConfidence = "low" | "medium" | "high";

export interface ActionDecisionItem {
  judgment: string;
  recommendedChoice: string;
  reason: string;
  alternatives: string[];
}

export interface ActionIntentProposalV2 {
  schemaVersion: "2";
  proposalId: string;
  baseTwinRevision: number;
  actionKind: ActionKind;
  mode: ActionProposalMode;
  plainLanguageSummary: string;
  recommendation: string | null;
  blockingQuestion: string | null;
  confidence: {
    level: RecommendationConfidence;
    rationale: string;
  };
  decisionItems: ActionDecisionItem[];
  whyNow: string;
  successCheck: string;
  ownerChallenge: string;
}

export type ActionIntentProposal = ActionIntentProposalV1 | ActionIntentProposalV2;

export interface ActionContextPacketBuild {
  packet: ActionContextPacket;
  packetHash: string;
  manifest: {
    packetId: string;
    packetHash: string;
    baseTwinRevision: number;
    correctedReflectionId: string;
    correctionId: string;
    actionKind: ActionKind;
    targetPath: "README.md";
    transmittedSourceBytes: 0;
  };
}

export interface ActionRuntimeProposalResult {
  proposal: ActionIntentProposal;
  cliVersion: string;
  model: string;
  completedAt: string;
  audit: RuntimeAuditSummary;
}

export interface EffectPlan {
  schemaVersion: "1";
  effectId: string;
  actionKind: ActionKind;
  proposalId: string;
  baseTwinRevision: number;
  correctedReflectionId: string;
  targetPath: "README.md";
  markerId: "forme:r3-action";
  beforeFileHash: string;
  beforeBlockHash: string;
  afterFileHash: string;
  afterBlockHash: string;
  idempotencyKey: string;
}

export interface ActionProposalRecord {
  proposal: ActionIntentProposal;
  proposalHash: string;
  packetHash: string;
  correctedReflectionId: string;
  correctionId: string;
  runtimeReceiptId: string;
  effectPlan: EffectPlan | null;
  effectPlanHash: string | null;
  admittedRevision: number;
  status: ActionProposalStatus;
  approvalId: string | null;
  effectReceiptIds: string[];
  createdAt: string;
}

export interface ActionApprovalRecord {
  approvalId: string;
  proposalId: string;
  proposalHash: string;
  effectPlanHash: string;
  authority: "owner";
  baseTwinRevision: number;
  approvedAt: string;
  status: "approved" | "consumed" | "invalidated";
  consumedAt: string | null;
}

export interface EffectReceipt {
  receiptId: string;
  operation: "execute" | "rollback";
  effectId: string;
  proposalId: string;
  approvalId: string;
  effectPlanHash: string;
  baseTwinRevision: number;
  resultTwinRevision: number;
  targetPath: "README.md";
  expectedBeforeHash: string;
  expectedAfterHash: string;
  observedHash: string;
  status: "succeeded" | "indeterminate";
  completedAt: string;
}

export interface ActionInvalidationRecord {
  invalidationId: string;
  proposalId: string;
  causedByCorrectionId: string | null;
  causedByTwinRevision: number;
  reason: string;
  invalidatedAt: string;
}

export interface AgencyState {
  proposals: ActionProposalRecord[];
  approvals: ActionApprovalRecord[];
  runtimeReceipts: RuntimeReceipt[];
  effectReceipts: EffectReceipt[];
  invalidations: ActionInvalidationRecord[];
}

export interface TwinRevisionV3 extends TwinRevisionBase {
  schemaVersion: "3";
  cognition: CognitionState;
  agency: AgencyState;
}

export type TwinRevision = TwinRevisionV1 | TwinRevisionV2 | TwinRevisionV3;

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

export interface PendingEffect {
  schemaVersion: "1";
  operation: "execute" | "rollback";
  proposalId: string;
  approvalId: string;
  effectReceiptId: string;
  effectPlanHash: string;
  baseTwinRevision: number;
  resultTwinRevision: number;
  createdAt: string;
}

export interface ActionExecutionResult {
  changed: boolean;
  observation: ObservationResult;
  receipt: EffectReceipt;
}
