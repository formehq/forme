import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import type { ScanResult, SourceRecord, WorkspaceRegistry } from "./types.ts";

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

function inside(base: string, candidate: string): boolean {
  const rel = relative(base, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export function assertSafeRelativePath(path: string, label: string): string {
  const portable = path.replaceAll("\\", "/");
  const normalized = normalize(portable);
  if (
    path.length === 0 ||
    isAbsolute(path) ||
    /^[A-Za-z]:/.test(path) ||
    normalized === ".." ||
    normalized.startsWith(`..${sep}`) ||
    portable.split("/").includes("..")
  ) {
    throw new Error(`${label} must be a relative path without parent traversal`);
  }
  return portablePath(normalized) || ".";
}

export function resolveSourceRoot(workspaceRoot: string, registry: WorkspaceRegistry): string {
  const workspace = realpathSync(workspaceRoot);
  const configured = assertSafeRelativePath(registry.source.root, "source root");
  const candidate = resolve(workspace, configured);
  if (!existsSync(candidate)) throw new Error(`configured source root does not exist: ${configured}`);
  const source = realpathSync(candidate);
  if (!inside(workspace, source)) throw new Error("configured source root resolves outside the workspace");
  const stateRoot = resolve(workspace, registry.stateRoot);
  if (source === stateRoot || inside(stateRoot, source)) {
    throw new Error("the Forme state root cannot be used as a source root");
  }
  return source;
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sourceId(connectorId: string, relativePath: string): string {
  return `src_${digest(`${connectorId}\0${relativePath}`).slice(0, 24)}`;
}

function evidenceId(connectorId: string, relativePath: string, contentHash: string, cursor: string): string {
  return `evd_${digest(`${connectorId}\0${relativePath}\0${contentHash}\0${cursor}`).slice(0, 32)}`;
}

function latestBySource(records: SourceRecord[], connectorId: string): Map<string, SourceRecord> {
  const latest = new Map<string, SourceRecord>();
  for (const record of records) {
    if (record.connectorId === connectorId) latest.set(record.locator.sourceId, record);
  }
  return latest;
}

export function scanWorkspaceSource(
  workspaceRoot: string,
  registry: WorkspaceRegistry,
  previousRecords: SourceRecord[],
  observedAt: string,
): ScanResult {
  const workspace = realpathSync(workspaceRoot);
  const sourceRoot = resolveSourceRoot(workspace, registry);
  const cursor = `scan:${observedAt}`;
  const previous = latestBySource(previousRecords, registry.source.connectorId);
  const seen = new Set<string>();
  const currentRecords: SourceRecord[] = [];
  const changedRecords: SourceRecord[] = [];
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const warnings: string[] = [];
  const extensions = new Set(registry.source.includeExtensions.map((value) => value.toLowerCase()));
  const excluded = new Set([...registry.source.excludeDirectories, registry.stateRoot]);
  let skippedExtensions = 0;
  let skippedLarge = 0;
  let skippedSymlinks = 0;

  const visit = (directory: string): void => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      warnings.push(`Unreadable directory: ${portablePath(relative(workspace, directory)) || "."}`);
      return;
    }
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const relativePath = portablePath(relative(workspace, absolute));
      if (entry.isSymbolicLink()) {
        skippedSymlinks++;
        continue;
      }
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name)) visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!extensions.has(extname(entry.name).toLowerCase())) {
        skippedExtensions++;
        continue;
      }

      let content: Buffer;
      let stats;
      try {
        stats = statSync(absolute);
        if (stats.size > registry.source.maxFileBytes) {
          skippedLarge++;
          continue;
        }
        content = readFileSync(absolute);
      } catch (error) {
        warnings.push(`Unreadable file: ${relativePath}`);
        continue;
      }

      const id = sourceId(registry.source.connectorId, relativePath);
      seen.add(id);
      const hash = `sha256:${digest(content)}`;
      const prior = previous.get(id);
      if (prior && prior.change.kind !== "deleted" && prior.contentHash === hash) {
        currentRecords.push(prior);
        continue;
      }

      const kind = prior && prior.change.kind !== "deleted" ? "modified" : "added";
      const record: SourceRecord = {
        schemaVersion: "0",
        connectorId: registry.source.connectorId,
        workspaceId: registry.workspaceId,
        evidenceId: evidenceId(registry.source.connectorId, relativePath, hash, cursor),
        sourceKind: registry.source.kind === "project" ? "project-file" : "notes-export",
        provenanceClass: registry.source.kind === "project" ? "original" : "normalized",
        locator: { sourceId: id, relativePath },
        observedAt,
        modifiedAt: stats.mtime.toISOString(),
        contentHash: hash,
        sizeBytes: content.byteLength,
        sensitivity: "private",
        projectionEligibility: "denied",
        fidelity: { status: "exact", issues: [] },
        change: { kind, cursor },
      };
      currentRecords.push(record);
      changedRecords.push(record);
      (kind === "added" ? added : modified).push(relativePath);
    }
  };

  visit(sourceRoot);

  for (const prior of [...previous.values()].sort((a, b) => a.locator.relativePath.localeCompare(b.locator.relativePath))) {
    if (prior.change.kind === "deleted" || seen.has(prior.locator.sourceId)) continue;
    const record: SourceRecord = {
      ...prior,
      evidenceId: evidenceId(
        registry.source.connectorId,
        prior.locator.relativePath,
        prior.contentHash,
        `${cursor}:deleted`,
      ),
      observedAt,
      change: { kind: "deleted", cursor },
    };
    changedRecords.push(record);
    deleted.push(prior.locator.relativePath);
  }

  if (skippedExtensions > 0) warnings.push(`Skipped ${skippedExtensions} file(s) outside configured extensions.`);
  if (skippedLarge > 0) warnings.push(`Skipped ${skippedLarge} file(s) above the configured size limit.`);
  if (skippedSymlinks > 0) warnings.push(`Skipped ${skippedSymlinks} symbolic link(s); connectors never follow them.`);

  currentRecords.sort((a, b) => a.locator.relativePath.localeCompare(b.locator.relativePath));
  return {
    cursor,
    currentRecords,
    changedRecords,
    changes: { added, modified, deleted },
    warnings,
  };
}
