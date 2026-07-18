import { readFileSync, readdirSync, realpathSync, statSync, lstatSync } from "node:fs";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { sha256 } from "./contracts.ts";
import type { EvidenceRecord, WorkspaceContract } from "./types.ts";

const ALWAYS_EXCLUDED = new Set([".git", ".forme", "node_modules", "dist", "coverage", "build", "target"]);

export interface ScanResult {
  evidence: EvidenceRecord[];
  warnings: string[];
}

function portablePath(value: string): string {
  return value.split(sep).join("/");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function inside(base: string, candidate: string): boolean {
  const rel = relative(base, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export function assertSafeRelativePath(value: string, label: string): string {
  if (value.length === 0 || value.includes("\0") || isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error(`${label} must be a safe relative path`);
  }
  const portable = value.replaceAll("\\", "/");
  const normalized = posix.normalize(portable);
  if (normalized === ".." || normalized.startsWith("../") || portable.split("/").includes("..")) {
    throw new Error(`${label} must not contain parent traversal`);
  }
  return normalized;
}

function displayPath(workspace: string, absolute: string): string {
  return portablePath(relative(workspace, absolute)) || ".";
}

export function scanWorkspace(workspaceRoot: string, contract: WorkspaceContract): ScanResult {
  const workspace = realpathSync(resolve(workspaceRoot));
  const excluded = new Set([...ALWAYS_EXCLUDED, ...contract.source.excludeNames]);
  const configuredRoot = assertSafeRelativePath(contract.source.root, "source root");
  if (configuredRoot.split("/").some((segment) => excluded.has(segment))) {
    throw new Error(`source root crosses an excluded boundary: ${configuredRoot}`);
  }
  const candidateRoot = resolve(workspace, configuredRoot);
  const rootStats = lstatSync(candidateRoot);
  if (rootStats.isSymbolicLink()) throw new Error("source root must not be a symbolic link");
  const sourceRoot = realpathSync(candidateRoot);
  if (!inside(workspace, sourceRoot)) throw new Error("source root resolves outside the workspace");
  if (sourceRoot === resolve(workspace, ".forme") || inside(resolve(workspace, ".forme"), sourceRoot)) {
    throw new Error("the Forme state root cannot be observed as a source");
  }

  const evidence = new Map<string, EvidenceRecord>();
  const warnings: string[] = [];

  const addFile = (absolute: string): void => {
    const relativePath = displayPath(workspace, absolute);
    let stats;
    let body: Buffer;
    try {
      stats = statSync(absolute);
      if (stats.size > contract.source.maxFileBytes) {
        warnings.push(`Skipped oversized file: ${relativePath}`);
        return;
      }
      body = readFileSync(absolute);
    } catch {
      warnings.push(`Skipped unreadable file: ${relativePath}`);
      return;
    }
    evidence.set(relativePath, {
      relativePath,
      contentHash: sha256(body),
      sizeBytes: body.byteLength,
      modifiedAt: stats.mtime.toISOString(),
    });
  };

  const visit = (directory: string): void => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => compareText(left.name, right.name));
    } catch {
      warnings.push(`Skipped unreadable directory: ${displayPath(workspace, directory)}`);
      return;
    }
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const relativePath = displayPath(workspace, absolute);
      if (entry.isSymbolicLink()) {
        warnings.push(`Skipped symbolic link: ${relativePath}`);
      } else if (entry.isDirectory()) {
        if (!excluded.has(entry.name)) visit(absolute);
      } else if (entry.isFile()) {
        addFile(absolute);
      }
    }
  };

  for (const includePath of [...contract.source.includePaths].sort()) {
    const safe = assertSafeRelativePath(includePath, "include path");
    if (safe === ".") throw new Error("include path must name an explicit file or directory, not the whole source root");
    if (safe.split("/").some((segment) => excluded.has(segment))) {
      throw new Error(`include path crosses an excluded boundary: ${safe}`);
    }
    const candidate = resolve(sourceRoot, safe);
    if (!inside(sourceRoot, candidate)) throw new Error(`include path resolves outside the source root: ${safe}`);
    let stats;
    try {
      stats = lstatSync(candidate);
    } catch {
      warnings.push(`Missing include path: ${safe}`);
      continue;
    }
    if (stats.isSymbolicLink()) {
      warnings.push(`Skipped symbolic link: ${displayPath(workspace, candidate)}`);
    } else if (stats.isDirectory()) {
      if (excluded.has(posix.basename(safe))) warnings.push(`Skipped excluded directory: ${safe}`);
      else visit(candidate);
    } else if (stats.isFile()) {
      addFile(candidate);
    } else {
      warnings.push(`Skipped unsupported entry: ${safe}`);
    }
  }

  return {
    evidence: [...evidence.values()].sort((left, right) => compareText(left.relativePath, right.relativePath)),
    warnings: [...new Set(warnings)].sort(compareText),
  };
}
