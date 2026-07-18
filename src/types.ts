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

export interface TwinRevision {
  schemaVersion: "1";
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
