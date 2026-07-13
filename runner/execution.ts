import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** A deterministic write transaction whose receipt is a single git commit. */
export class ExecutionError extends Error {}

export interface FileUpdate {
  path: string;
  /** A thunk is evaluated after the shared write lock is acquired. */
  content: string | (() => string);
  /** Knowledge-layer targets must be clean before Forme touches them. */
  requireClean?: boolean;
}

export interface CommitExecutionInput {
  executionId: string;
  message: string;
  updates: FileUpdate[];
  /** Existing Forme-owned files to include in the same receipt commit. */
  includePaths?: string[];
  /** Runtime directory shared with append-only event/metric writers. */
  lockRoot?: string;
}

export interface ExecutionReceipt {
  executionId: string;
  executed: string;
  paths: string[];
}

export function createExecutionId(): string {
  return `exec_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
}

const WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));

/** Serialize the short disk-write/commit section across runner and console. */
export function withWriteLock<T>(root: string, fn: () => T, timeoutMs = 5_000): T {
  mkdirSync(root, { recursive: true });
  const lockDir = join(root, ".write.lock");
  const started = Date.now();
  for (;;) {
    try {
      mkdirSync(lockDir);
      break;
    } catch {
      try {
        if (Date.now() - statSync(lockDir).mtimeMs > 30_000) {
          rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        /* The holder may have released it between checks. */
      }
      if (Date.now() - started >= timeoutMs) {
        throw new ExecutionError("another Forme write is still in flight; retry this action");
      }
      Atomics.wait(WAIT_ARRAY, 0, 0, 20);
    }
  }
  try {
    return fn();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

export function vaultRelativePath(vault: string, path: string): string {
  const rel = isAbsolute(path) ? relative(resolve(vault), resolve(path)) : path;
  const normalized = rel.replaceAll("\\", "/").replace(/^\.\//, "");
  const abs = resolve(vault, normalized);
  if (!normalized || normalized === ".." || normalized.startsWith("../") || !abs.startsWith(resolve(vault) + sep)) {
    throw new ExecutionError(`path escapes the vault boundary: ${path}`);
  }
  return normalized;
}

/** All current card mirrors plus the two append-only runtime ledgers. */
export function runtimeArtifactPaths(vault: string, outDir: string): string[] {
  const outRel = vaultRelativePath(vault, outDir);
  const cardsDir = join(vault, outRel, "cards");
  const paths = existsSync(cardsDir)
    ? readdirSync(cardsDir)
      .filter((f) => f.endsWith(".json") || f.endsWith(".md"))
      .map((f) => `${outRel}/cards/${f}`)
    : [];
  for (const f of ["decisions.jsonl", "run-metrics.jsonl"]) {
    if (existsSync(join(vault, outRel, f))) paths.push(`${outRel}/${f}`);
  }
  return paths;
}

function gitError(e: unknown): string {
  return e instanceof Error && "stderr" in e
    ? String((e as { stderr?: unknown }).stderr).trim().slice(0, 300)
    : "";
}

/**
 * Apply every update and commit only the explicit paths. If writing or commit
 * fails, restore the pre-transaction bytes and unstage this transaction.
 */
function commitExecutionUnlocked(vault: string, input: CommitExecutionInput): ExecutionReceipt {
  if (!/^exec_[a-z0-9_]+$/.test(input.executionId)) {
    throw new ExecutionError(`invalid executionId: ${input.executionId}`);
  }
  if (input.updates.length === 0) throw new ExecutionError("an execution needs at least one file update");

  const updates = input.updates.map((u) => ({ ...u, path: vaultRelativePath(vault, u.path) }));
  const updatePaths = new Set(updates.map((u) => u.path));
  if (updatePaths.size !== updates.length) throw new ExecutionError("an execution cannot update the same path twice");

  for (const update of updates) {
    if (!update.requireClean) continue;
    const dirty = execFileSync("git", ["-C", vault, "status", "--porcelain", "--", update.path], {
      encoding: "utf8",
    }).trim();
    if (dirty) {
      throw new ExecutionError(`The target file has uncommitted changes. Commit or restore it before deciding: ${update.path}`);
    }
  }

  const snapshots = new Map<string, Buffer | null>();
  for (const update of updates) {
    const abs = join(vault, update.path);
    snapshots.set(update.path, existsSync(abs) ? readFileSync(abs) : null);
  }
  const includePaths = (input.includePaths ?? [])
    .map((p) => vaultRelativePath(vault, p))
    .filter((p) => existsSync(join(vault, p)));
  const paths = [...new Set([...updates.map((u) => u.path), ...includePaths])];

  try {
    for (const update of updates) {
      const abs = join(vault, update.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, typeof update.content === "function" ? update.content() : update.content);
    }
    execFileSync("git", ["-C", vault, "add", "--", ...paths], { stdio: ["ignore", "ignore", "pipe"] });
    execFileSync(
      "git",
      [
        "-C", vault,
        "commit", "-q",
        "-m", input.message,
        "-m", `Forme-Execution: ${input.executionId}`,
        "--only", "--", ...paths,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (e) {
    for (const [path, bytes] of snapshots) {
      const abs = join(vault, path);
      if (bytes === null) rmSync(abs, { force: true });
      else writeFileSync(abs, bytes);
    }
    try {
      execFileSync("git", ["-C", vault, "reset", "-q", "HEAD", "--", ...paths], { stdio: "ignore" });
    } catch {
      /* The original error is the useful one. */
    }
    const detail = gitError(e);
    throw new ExecutionError(`git commit failed; every updated file was restored${detail ? `: ${detail}` : ""}`);
  }

  const executed = execFileSync("git", ["-C", vault, "rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();
  return { executionId: input.executionId, executed, paths };
}

export function commitExecution(vault: string, input: CommitExecutionInput): ExecutionReceipt {
  return input.lockRoot
    ? withWriteLock(input.lockRoot, () => commitExecutionUnlocked(vault, input))
    : commitExecutionUnlocked(vault, input);
}

/** Resolve a receipt without embedding a commit hash inside its own commit. */
export function resolveExecutionCommit(vault: string, executionId: string): string | null {
  try {
    const out = execFileSync(
      "git",
      ["-C", vault, "log", "-n1", "--format=%H", "--fixed-strings", `--grep=Forme-Execution: ${executionId}`],
      { encoding: "utf8" },
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}
