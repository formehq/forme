export const DEFAULT_PROJECT_EXTENSIONS = [
  ".go",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".py",
  ".rs",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
] as const;

export const DEFAULT_NOTES_EXTENSIONS = [".html", ".json", ".md", ".txt"] as const;

export const DEFAULT_EXCLUDED_DIRECTORIES = [
  ".git",
  ".next",
  ".turbo",
  "98_Forme",
  "build",
  "dist",
  "node_modules",
  "target",
] as const;

export type WorkspaceKind = "project" | "notes-export";

export interface WorkspaceRegistry {
  schemaVersion: "0";
  workspaceId: string;
  twinId: string;
  name: string;
  createdAt: string;
  stateRoot: "98_Forme";
  initialIntent?: string;
  source: {
    connectorId: string;
    kind: WorkspaceKind;
    root: string;
    includeExtensions: string[];
    excludeDirectories: string[];
    maxFileBytes: number;
  };
}

export type SourceChangeKind = "added" | "modified" | "deleted" | "unchanged";

export interface SourceRecord {
  schemaVersion: "0";
  connectorId: string;
  workspaceId: string;
  evidenceId: string;
  sourceKind: "project-file" | "notes-export" | "forme-owned";
  provenanceClass: "original" | "normalized" | "derived" | "forme-owned";
  locator: {
    sourceId: string;
    relativePath: string;
    fragment?: string;
  };
  observedAt: string;
  modifiedAt?: string;
  contentHash: string;
  sizeBytes: number;
  language?: string;
  sensitivity: "private" | "restricted" | "shareable";
  projectionEligibility: "denied" | "pending" | "approved";
  fidelity: {
    status: "exact" | "partial" | "unsupported" | "unreadable";
    issues: string[];
  };
  change: {
    kind: SourceChangeKind;
    cursor: string;
  };
}

export interface TwinClaim {
  claimId: string;
  status: "inferred" | "confirmed" | "disputed" | "superseded" | "unresolved";
  statement: string;
  evidenceRefs: string[];
  confidence?: number;
  createdRevision: number;
  lastEvaluatedRevision: number;
  supersededBy?: string;
  correctionRefs: string[];
  sensitivity: "private" | "restricted" | "shareable";
  projectionEligibility: "denied" | "pending" | "approved";
}

export interface TwinState {
  schemaVersion: "0";
  twinId: string;
  workspaceId: string;
  revision: number;
  updatedAt: string;
  identity: TwinClaim[];
  activeIntent: TwinClaim[];
  currentState: TwinClaim[];
  confirmedDecisions: TwinClaim[];
  openQuestions: TwinClaim[];
  unresolvedTensions: TwinClaim[];
  emergingPatterns: TwinClaim[];
  userCorrections: Array<{
    correctionId: string;
    claimId: string;
    eventRef: string;
  }>;
  allowedProjectionScope: {
    scopeId: string;
    claimIds: string[];
    updatedAt: string;
  };
}

export interface ContinuityChanges {
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface ContinuityEvent {
  schemaVersion: "0";
  eventId: string;
  type: "continuity.updated";
  at: string;
  workspaceId: string;
  twinId: string;
  previousRevision: number | null;
  revision: number;
  cursor: string;
  changes: ContinuityChanges;
  warnings: string[];
}

export interface ScanResult {
  cursor: string;
  currentRecords: SourceRecord[];
  changedRecords: SourceRecord[];
  changes: ContinuityChanges;
  warnings: string[];
}

export interface RefreshResult {
  changed: boolean;
  registry: WorkspaceRegistry;
  state: TwinState;
  event: ContinuityEvent | null;
  view: string;
}
