import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  canonicalSha256,
  validateResponseSourcePolicyV1,
  validateResponseSourceSnapshotV1,
  type ResponseSourcePolicyV1,
  type ResponseSourceSnapshotV1,
} from "../../r4-protocol/src/index.ts";
import { sha256 } from "./body-free.ts";
import type { ResponseSourceSnapshot, SnapshotFile } from "./types.ts";

export const RESPONSE_SOURCE_POLICY_VERSION = "response_source_policy.v1";
export const RESPONSE_SECRET_POLICY_VERSION = "forme_response_secret_patterns.v1";
export const MAX_SNAPSHOT_FILE_BYTES = 512 * 1024;
export const MAX_SNAPSHOT_TOTAL_BYTES = 8 * 1024 * 1024;
/** Gate A launcher-approved system Git; never resolved through Workspace/PATH. */
export const TRUSTED_GIT_EXECUTABLE = "/usr/bin/git";

const ROOT_FILES = ["README.md", "tsconfig.json"];
const ROOT_PREFIXES = ["docs/", "src/", "schemas/", "test/", "apps/", "packages/"];
const EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".mjs", ".cjs",
  ".css", ".scss", ".html", ".sql", ".yaml", ".yml", ".toml",
]);
const EXCLUDED_SEGMENTS = new Set([
  "node_modules", ".next", "dist", "build", "coverage", ".cache", "cache", "vendor", "vendored", "generated",
]);
const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /FORME_(?:PRIVATE|GUEST|CREDENTIAL|TRANSCRIPT)_CANARY/u,
  /(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{12,}/u,
  /(?:password|api[_-]?key|client[_-]?secret)\s*[:=]\s*["']?[^\s"']{8,}/iu,
];

export const RESPONSE_SECRET_POLICY_HASH = canonicalSha256({
  schemaVersion: RESPONSE_SECRET_POLICY_VERSION,
  patterns: SECRET_PATTERNS.map((pattern) => pattern.source),
});

const RESPONSE_SOURCE_POLICY_PREIMAGE: Omit<ResponseSourcePolicyV1, "policyHash"> = {
  schemaVersion: "response_source_policy.v1",
  policyId: "policy_response_source_v1",
  allowedRootFiles: ["README.md", "package*.json", "tsconfig.json"],
  allowedDirectoryRoots: ROOT_PREFIXES,
  allowedExtensions: [...EXTENSIONS],
  maximumFileBytes: MAX_SNAPSHOT_FILE_BYTES,
  maximumTotalBytes: MAX_SNAPSHOT_TOTAL_BYTES,
  secretPatternPolicyVersion: RESPONSE_SECRET_POLICY_VERSION,
  secretPatternPolicyHash: RESPONSE_SECRET_POLICY_HASH,
};

export const RESPONSE_SOURCE_POLICY = validateResponseSourcePolicyV1({
  ...RESPONSE_SOURCE_POLICY_PREIMAGE,
  policyHash: canonicalSha256(RESPONSE_SOURCE_POLICY_PREIMAGE),
});
export const RESPONSE_SOURCE_POLICY_HASH = RESPONSE_SOURCE_POLICY.policyHash;

function git(root: string, args: string[], encoding: "utf8"): string;
function git(root: string, args: string[], encoding: "buffer"): Buffer;
function git(root: string, args: string[], encoding: "utf8" | "buffer"): string | Buffer {
  const env = {
    PATH: "/usr/bin:/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    HOME: root,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    NODE_ENV: process.env.NODE_ENV ?? "test",
  };
  if (!existsSync(TRUSTED_GIT_EXECUTABLE) || !lstatSync(TRUSTED_GIT_EXECUTABLE).isFile()) {
    throw new Error("approved absolute Git executable is unavailable");
  }
  const result = execFileSync(TRUSTED_GIT_EXECUTABLE, args, {
    cwd: root,
    env,
    encoding: encoding === "utf8" ? "utf8" : undefined,
    maxBuffer: 16 * 1024 * 1024,
  });
  return encoding === "utf8" ? String(result) : Buffer.from(result);
}

export function isEligibleSnapshotPath(path: string): boolean {
  if (path.length === 0 || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) return false;
  if (path === "AGENTS.md" || path.startsWith(".git/") || path === ".git" || path.startsWith(".codex/") || path.startsWith(".forme/")) return false;
  if (basename(path).startsWith(".env")) return false;
  const segments = path.split("/");
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return false;
  const atRoot = !path.includes("/");
  if (atRoot && (ROOT_FILES.includes(path) || /^package.*\.json$/u.test(path))) return true;
  if (!ROOT_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (/\.(?:lock|lockb)$/u.test(path) || path.endsWith("-lock.json")) return false;
  return EXTENSIONS.has(extname(path).toLowerCase());
}

function assertRepoBoundary(repoRoot: string): { root: string; head: string; tree: string } {
  const root = resolve(repoRoot);
  const top = resolve(git(root, ["rev-parse", "--show-toplevel"], "utf8").trim());
  if (top !== root) throw new Error("snapshot root must be the exact Git worktree root");
  const gitDirRaw = git(root, ["rev-parse", "--git-dir"], "utf8").trim();
  const gitDir = resolve(root, gitDirRaw);
  const gitDirRelation = relative(root, gitDir);
  if (gitDirRelation.startsWith(`..${sep}`) || gitDirRelation === ".." || isAbsolute(gitDirRelation)) {
    throw new Error("Git directory escapes the snapshot root");
  }
  const commonRaw = git(root, ["rev-parse", "--git-common-dir"], "utf8").trim();
  const common = resolve(root, commonRaw);
  const relation = relative(root, common);
  if (relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation)) {
    throw new Error("Git common directory escapes the snapshot root");
  }
  const alternateFiles = new Set([
    resolve(gitDir, "objects", "info", "alternates"),
    resolve(common, "objects", "info", "alternates"),
  ]);
  if ([...alternateFiles].some((path) => existsSync(path))) {
    throw new Error("Git object alternates are not permitted for a response snapshot");
  }
  const head = git(root, ["rev-parse", "HEAD"], "utf8").trim();
  const tree = git(root, ["rev-parse", "HEAD^{tree}"], "utf8").trim();
  if (!/^[a-f0-9]{40,64}$/u.test(head) || !/^[a-f0-9]{40,64}$/u.test(tree)) throw new Error("invalid Git HEAD/tree");
  return { root, head, tree };
}

function dirtyEligiblePaths(root: string): string[] {
  const output = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], "buffer");
  const fields = output.toString("utf8").split("\0").filter(Boolean);
  const paths: string[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    const status = field.slice(0, 2);
    const path = field.slice(3);
    if (isEligibleSnapshotPath(path)) paths.push(path);
    if (status.includes("R") || status.includes("C")) {
      const second = fields[index + 1];
      if (second && isEligibleSnapshotPath(second)) paths.push(second);
      index += 1;
    }
  }
  return [...new Set(paths)].sort();
}

function decodeText(bytes: Buffer, path: string): string {
  if (bytes.includes(0)) throw new Error(`snapshot binary content rejected:${path}`);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`snapshot non-UTF-8 content rejected:${path}`);
  }
  if (text.normalize("NFC") !== text) throw new Error(`snapshot non-NFC content rejected:${path}`);
  if (/^(?:\/\/|#|<!--)\s*@generated\b/imu.test(text)) throw new Error(`snapshot generated content rejected:${path}`);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) throw new Error(`snapshot secret/canary content rejected:${path}`);
  }
  return text;
}

export function buildResponseSourceSnapshot(repoRoot: string, createdAt = new Date()): ResponseSourceSnapshot {
  const { root, head, tree } = assertRepoBoundary(repoRoot);
  const dirty = dirtyEligiblePaths(root);
  if (dirty.length > 0) throw new Error(`snapshot requires clean eligible HEAD:${dirty.join(",")}`);

  const treeOutput = git(root, ["ls-tree", "-r", "-z", "--full-tree", head], "buffer").toString("utf8");
  const entries = treeOutput.split("\0").filter(Boolean).map((entry) => {
    const match = /^(\d+) ([^ ]+) ([a-f0-9]+)\t(.+)$/u.exec(entry);
    if (!match) throw new Error("unclassifiable Git tree entry");
    return { mode: match[1] ?? "", type: match[2] ?? "", object: match[3] ?? "", path: match[4] ?? "" };
  });

  const files: SnapshotFile[] = [];
  let totalBytes = 0;
  for (const entry of entries.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)))) {
    if (!isEligibleSnapshotPath(entry.path)) continue;
    if (entry.mode === "120000") throw new Error(`snapshot symlink rejected:${entry.path}`);
    if (entry.mode === "160000" || entry.type === "commit") throw new Error(`snapshot submodule rejected:${entry.path}`);
    if (entry.type !== "blob" || !/^100[0-7]{3}$/u.test(entry.mode)) throw new Error(`snapshot unclassifiable entry:${entry.path}`);
    const worktreePath = resolve(root, entry.path);
    const relation = relative(root, worktreePath);
    if (relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation)) throw new Error("snapshot path escape");
    const stat = lstatSync(worktreePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`snapshot filesystem identity rejected:${entry.path}`);
    const objectBytes = git(root, ["cat-file", "blob", entry.object], "buffer");
    if (objectBytes.length > MAX_SNAPSHOT_FILE_BYTES) throw new Error(`snapshot file size exceeded:${entry.path}`);
    const workingBytes = readFileSync(worktreePath);
    if (!workingBytes.equals(objectBytes)) throw new Error(`snapshot working tree differs from HEAD:${entry.path}`);
    const text = decodeText(objectBytes, entry.path);
    totalBytes += objectBytes.length;
    if (totalBytes > MAX_SNAPSHOT_TOTAL_BYTES) throw new Error("snapshot total size exceeded");
    files.push({
      canonicalPath: entry.path,
      contentHash: sha256(objectBytes),
      byteCount: objectBytes.length,
      text,
    });
  }
  if (files.length === 0) throw new Error("snapshot contains no eligible files");
  // Close the build-time TOCTOU window before admitting the manifest. The
  // captured bytes already came from exact Git objects; this second pass proves
  // the same HEAD/tree and eligible worktree identity remained current through
  // the complete capture.
  const finalBoundary = assertRepoBoundary(root);
  if (finalBoundary.head !== head || finalBoundary.tree !== tree) {
    throw new Error("snapshot HEAD/tree changed during capture");
  }
  const finalDirty = dirtyEligiblePaths(root);
  if (finalDirty.length > 0) throw new Error(`snapshot became dirty during capture:${finalDirty.join(",")}`);
  for (const file of files) {
    const worktreePath = resolve(root, file.canonicalPath);
    const stat = lstatSync(worktreePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`snapshot filesystem identity changed:${file.canonicalPath}`);
    if (sha256(readFileSync(worktreePath)) !== file.contentHash) {
      throw new Error(`snapshot content changed during capture:${file.canonicalPath}`);
    }
  }
  const snapshotIdBasis = {
    repositoryHead: head,
    repositoryTreeHash: sha256(git(root, ["cat-file", "tree", tree], "buffer")),
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    createdAt: createdAt.toISOString(),
    files: files.map(({ canonicalPath, contentHash, byteCount }) => ({ canonicalPath, contentHash, byteCount })),
  };
  const snapshotId = `snapshot_${canonicalSha256(snapshotIdBasis).slice(7, 39)}`;
  const manifestPreimage: Omit<ResponseSourceSnapshotV1, "manifestHash"> = {
    schemaVersion: "response_source_snapshot.v1",
    snapshotId,
    repositoryHead: head,
    repositoryTreeHash: snapshotIdBasis.repositoryTreeHash,
    policyId: RESPONSE_SOURCE_POLICY.policyId,
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    files: snapshotIdBasis.files,
    fileCount: files.length,
    totalBytes,
    createdAt: snapshotIdBasis.createdAt,
  };
  const manifest = validateResponseSourceSnapshotV1({
    ...manifestPreimage,
    manifestHash: canonicalSha256(manifestPreimage),
  }, RESPONSE_SOURCE_POLICY);
  return {
    manifest,
    policy: RESPONSE_SOURCE_POLICY,
    files,
  };
}
