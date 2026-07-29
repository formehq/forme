import { execFileSync, spawnSync } from "node:child_process";
import { TextDecoder } from "node:util";
import { resolve } from "node:path";
import { assertSafeRelativePath } from "./boundary.ts";
import { assertContextPacket, canonicalJson, sha256 } from "./contracts.ts";
import { loadWorkspaceContract, statusWorkspace } from "./store.ts";
import type {
  ActiveCorrectionContext,
  ContextDocument,
  ContextPacket,
  ContextPacketBuild,
  GitLineEvidence,
  TwinRevisionV2,
  TwinRevisionV3,
  WorkspaceContract,
} from "./types.ts";

const MAX_DOCUMENT_BYTES = 65_536;
const MAX_PACKET_SOURCE_BYTES = 131_072;
const GIT_OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const decoder = new TextDecoder("utf-8", { fatal: true });

export interface LineRange {
  start: number;
  end: number;
}

export interface ContextSelection {
  earlierCommit: string;
  laterCommit: string;
  relativePath: string;
  earlierLines: LineRange;
  laterLines: LineRange;
  task: string;
}

function shortHash(value: string): string {
  return sha256(value).slice("sha256:".length, "sha256:".length + 32);
}

function git(workspaceRoot: string, args: string[], maxBuffer = 256_000): Buffer {
  try {
    return execFileSync("git", args, {
      cwd: workspaceRoot,
      encoding: "buffer",
      maxBuffer,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString("utf8").trim();
    throw new Error(`Git evidence resolution failed${stderr ? `: ${stderr}` : ""}`);
  }
}

function assertReachable(workspaceRoot: string, ancestor: string, descendant: string, message: string): void {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: workspaceRoot,
    stdio: "ignore",
  });
  if (result.status !== 0) throw new Error(message);
}

function fullCommit(workspaceRoot: string, value: string): string {
  if (!GIT_OID.test(value)) throw new Error("R2 commit selectors must be full lowercase Git object IDs");
  const resolved = git(workspaceRoot, ["rev-parse", "--verify", `${value}^{commit}`]).toString("utf8").trim();
  if (!GIT_OID.test(resolved)) throw new Error("Git returned an unsupported commit object ID");
  return resolved;
}

function isAllowlisted(path: string, contract: WorkspaceContract): boolean {
  const sourceRoot = assertSafeRelativePath(contract.source.root, "source root");
  let relativeToSource = path;
  if (sourceRoot !== ".") {
    if (path === sourceRoot) relativeToSource = ".";
    else if (path.startsWith(`${sourceRoot}/`)) relativeToSource = path.slice(sourceRoot.length + 1);
    else return false;
  }
  return contract.source.includePaths.some((included) => {
    const safe = assertSafeRelativePath(included, "include path");
    return relativeToSource === safe || relativeToSource.startsWith(`${safe}/`);
  });
}

function lines(body: string): string[] {
  const split = body.split("\n");
  if (body.endsWith("\n")) split.pop();
  return split;
}

function assertRange(range: LineRange, lineCount: number, label: string): void {
  if (
    !Number.isSafeInteger(range.start)
    || !Number.isSafeInteger(range.end)
    || range.start < 1
    || range.end < range.start
    || range.end > lineCount
  ) {
    throw new Error(`${label} line range ${range.start}:${range.end} is outside the historical document`);
  }
}

function resolveDocument(
  workspaceRoot: string,
  timepointId: "earlier" | "later",
  commit: string,
  relativePath: string,
  range: LineRange,
): { document: ContextDocument; evidence: GitLineEvidence } {
  const treeLine = git(workspaceRoot, ["ls-tree", commit, "--", relativePath]).toString("utf8").trim();
  const match = /^\d+ blob ([a-f0-9]{40}|[a-f0-9]{64})\t/.exec(treeLine);
  if (!match?.[1]) throw new Error(`Git evidence path is not a regular blob at ${commit}: ${relativePath}`);
  const blobHash = match[1];
  const bytes = git(workspaceRoot, ["cat-file", "blob", blobHash], MAX_DOCUMENT_BYTES + 1);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(`Git evidence document must be between 1 and ${MAX_DOCUMENT_BYTES} bytes`);
  }
  let body: string;
  try {
    body = decoder.decode(bytes);
  } catch {
    throw new Error(`Git evidence document is not valid UTF-8 text: ${relativePath}`);
  }
  const documentLines = lines(body);
  assertRange(range, documentLines.length, timepointId);
  const excerpt = documentLines.slice(range.start - 1, range.end).join("\n");
  const committedAt = git(workspaceRoot, ["show", "-s", "--format=%cI", commit]).toString("utf8").trim();
  const evidenceCore = canonicalJson({
    timepointId,
    commit,
    committedAt,
    relativePath,
    blobHash,
    lineStart: range.start,
    lineEnd: range.end,
    excerptHash: sha256(excerpt),
  });
  const document: ContextDocument = {
    timepointId,
    commit,
    committedAt,
    relativePath,
    blobHash,
    sizeBytes: bytes.byteLength,
    body,
  };
  const evidence: GitLineEvidence = {
    schemaVersion: "1",
    evidenceId: `ev_${shortHash(evidenceCore)}`,
    timepointId,
    commit,
    committedAt,
    relativePath,
    blobHash,
    lineStart: range.start,
    lineEnd: range.end,
    excerptHash: sha256(excerpt),
  };
  return { document, evidence };
}

function activeCorrections(revision: TwinRevisionV2 | TwinRevisionV3): ActiveCorrectionContext[] {
  const activeReflectionIds = new Set(
    revision.cognition.reflections
      .filter((reflection) => reflection.status === "corrected")
      .map((reflection) => reflection.reflectionId),
  );
  return revision.cognition.corrections
    .filter((correction) => activeReflectionIds.has(correction.correctedReflectionId))
    .map((correction) => ({
    correctionId: correction.correctionId,
    targetReflectionId: correction.targetReflectionId,
    correctedReflectionId: correction.correctedReflectionId,
    correctionText: correction.correctionText,
    correctedAt: correction.correctedAt,
    }));
}

export function buildContextPacket(workspaceRoot: string, selection: ContextSelection): ContextPacketBuild {
  const root = resolve(workspaceRoot);
  const current = statusWorkspace(root).revision;
  const contract = loadWorkspaceContract(root);
  const relativePath = assertSafeRelativePath(selection.relativePath.replaceAll("\\", "/"), "evidence path");
  if (relativePath === "." || !isAllowlisted(relativePath, contract)) {
    throw new Error(`Git evidence path is outside the workspace source allowlist: ${relativePath}`);
  }
  if (relativePath.split("/").some((segment) => contract.source.excludeNames.includes(segment))) {
    throw new Error(`Git evidence path crosses an excluded boundary: ${relativePath}`);
  }
  const earlierCommit = fullCommit(root, selection.earlierCommit);
  const laterCommit = fullCommit(root, selection.laterCommit);
  if (earlierCommit === laterCommit) throw new Error("R2 requires two distinct Git time points");
  assertReachable(root, earlierCommit, "HEAD", "earlier commit is not reachable from the current HEAD");
  assertReachable(root, laterCommit, "HEAD", "later commit is not reachable from the current HEAD");
  assertReachable(root, earlierCommit, laterCommit, "earlier commit must be an ancestor of later commit");

  const earlier = resolveDocument(root, "earlier", earlierCommit, relativePath, selection.earlierLines);
  const later = resolveDocument(root, "later", laterCommit, relativePath, selection.laterLines);
  const documents = [earlier.document, later.document];
  const evidence = [earlier.evidence, later.evidence];
  const transmittedSourceBytes = documents.reduce((total, document) => total + document.sizeBytes, 0);
  if (transmittedSourceBytes > MAX_PACKET_SOURCE_BYTES) throw new Error("Context Packet exceeds the source byte ceiling");
  const task = selection.task.trim();
  const core = {
    schemaVersion: "1" as const,
    createdAt: current.observedAt,
    baseTwinRevision: current.revision,
    ownerFrame: current.ownerFrame,
    task,
    documents,
    evidence,
    activeCorrections: current.schemaVersion === "1" ? [] : activeCorrections(current),
    allowedEvidenceIds: evidence.map((item) => item.evidenceId),
    constraints: [
      "Use only the supplied documents and evidence IDs.",
      "Identify a cross-time relationship; do not return a two-document summary.",
      "Expose uncertainty and at least one plausible alternative explanation.",
      "Do not request or call tools, commands, files, MCP servers, or web search.",
      "Return only the ReflectionProposalV1 JSON object required by the output schema.",
    ],
  };
  const packet: ContextPacket = {
    ...core,
    packetId: `ctx_${shortHash(canonicalJson(core))}`,
  };
  assertContextPacket(packet);
  const timepointIds = new Set(packet.documents.map((item) => item.timepointId));
  if (timepointIds.size !== 2 || !timepointIds.has("earlier") || !timepointIds.has("later")) {
    throw new Error("Context Packet must contain exactly one earlier and one later document");
  }
  const packetHash = sha256(canonicalJson(packet));
  return {
    packet,
    packetHash,
    manifest: {
      packetId: packet.packetId,
      packetHash,
      baseTwinRevision: packet.baseTwinRevision,
      documents: packet.documents.map(({ body: _body, ...document }) => document),
      evidence: packet.evidence,
      activeCorrectionCount: packet.activeCorrections.length,
      transmittedSourceBytes,
    },
  };
}

export function verifyContextPacket(
  workspaceRoot: string,
  selection: ContextSelection,
  expected: ContextPacketBuild,
): void {
  const rebuilt = buildContextPacket(workspaceRoot, selection);
  if (
    rebuilt.packetHash !== expected.packetHash
    || canonicalJson(rebuilt.packet) !== canonicalJson(expected.packet)
  ) {
    throw new Error("Context Packet changed before admission");
  }
}

export function parseLineRange(value: string, label: string): LineRange {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match?.[1] || !match[2]) throw new Error(`${label} must use START:END`);
  return { start: Number.parseInt(match[1], 10), end: Number.parseInt(match[2], 10) };
}

export function defaultReflectionTask(): string {
  return "Identify one non-trivial pattern, tension, trajectory, or unfinished possibility that depends on both time points and would help the owner decide how Forme should proceed.";
}
