import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  commitExecution,
  createExecutionId,
  ExecutionError,
  vaultRelativePath,
  type FileUpdate,
} from "../runner/execution.ts";
import { applyHunksToContent, ApplyError } from "../runner/hunks.ts";
import type { Card, Hunk } from "../runner/types.ts";

/**
 * accept 的执行路径(生命周期第 5 步):把卡的最小 diff 确定性应用到 vault
 * 文件,git 提交作为回执(executionId → commit,可回滚)。这是 Forme 代码
 * 唯一一处写知识层——且只发生在**人已落子 accept** 之后,agent 永远只读。
 *
 * 全有或全无:任何 hunk 应用不了(内容又漂了 / 匹配歧义 / 纯插入)就整卡
 * 失败,文件一个字不动;git 提交失败则把原内容原样放回。
 *
 * hunk 匹配语义住 runner/hunks.ts(#36)——runner 入列前用同一份语义干跑,
 * 不可执行的卡不会走到这里。
 */

export { applyHunksToContent, ApplyError };

export interface ApplyReceipt {
  file: string;
  hunks: number;
  executed: string; // 回执 commit(短 hash)
  executionId: string;
}

export interface ApplyCardOpts {
  executionId?: string;
  artifactUpdates?: FileUpdate[];
  includePaths?: string[];
  lockRoot?: string;
}

export function applyCardDiff(vault: string, card: Card, hunks: Hunk[], opts: ApplyCardOpts = {}): ApplyReceipt {
  const rel = vaultRelativePath(vault, card.diff.file);
  const original = readFileSync(join(vault, rel), "utf8");
  const next = applyHunksToContent(original, hunks);
  try {
    const receipt = commitExecution(vault, {
      executionId: opts.executionId ?? createExecutionId(),
      message: `forme: accept ${card.id} - ${card.title}`,
      updates: [{ path: rel, content: next, requireClean: true }, ...(opts.artifactUpdates ?? [])],
      includePaths: opts.includePaths,
      lockRoot: opts.lockRoot,
    });
    return { file: rel, hunks: hunks.length, executed: receipt.executed, executionId: receipt.executionId };
  } catch (e) {
    if (e instanceof ExecutionError) throw new ApplyError(e.message);
    throw e;
  }
}

/**
 * 撤销一次已执行的 accept(#24/#31):新原子回执还包含审计产物,所以只把
 * 该 commit 的目标文件 patch 反向应用;旧单文件回执仍可整 commit revert。
 * 历史只追加,冲突时整次撤销失败。返回 inverse commit 的短 hash。
 */
export function revertCommit(vault: string, hash: string, targetFile?: string): string {
  let selectiveRel: string | null = null;
  try {
    if (targetFile) {
      const rel = vaultRelativePath(vault, targetFile);
      selectiveRel = rel;
      const dirty = execFileSync("git", ["-C", vault, "status", "--porcelain", "--", rel], { encoding: "utf8" }).trim();
      if (dirty) throw new ApplyError(`Undo failed because the target file has uncommitted changes: ${rel}`);
      const patch = execFileSync("git", ["-C", vault, "diff", "--binary", `${hash}^`, hash, "--", rel]);
      if (patch.length === 0) throw new ApplyError(`Undo failed because the receipt has no change for ${rel}`);
      execFileSync("git", ["-C", vault, "apply", "--reverse", "--index", "--whitespace=nowarn", "-"], {
        input: patch,
        stdio: ["pipe", "ignore", "pipe"],
      });
      const originalSubject = execFileSync("git", ["-C", vault, "log", "-1", "--format=%s", hash], { encoding: "utf8" }).trim();
      execFileSync(
        "git",
        ["-C", vault, "commit", "-q", "-m", `Revert \"${originalSubject}\"`, "--only", "--", rel],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
    } else {
      // Legacy receipts contained only the target file, so whole-commit revert is safe.
      execFileSync("git", ["-C", vault, "revert", "--no-edit", hash], {
        stdio: ["ignore", "ignore", "pipe"],
      });
    }
  } catch (e) {
    if (e instanceof ApplyError) throw e;
    if (selectiveRel) {
      try {
        execFileSync("git", ["-C", vault, "restore", "--source=HEAD", "--staged", "--worktree", "--", selectiveRel], {
          stdio: "ignore",
        });
      } catch {
        /* Fall through to the original conflict error. */
      }
    }
    try {
      execFileSync("git", ["-C", vault, "revert", "--abort"], { stdio: "ignore" });
    } catch {
      /* 没有进行中的 revert 就算了 */
    }
    const msg = e instanceof Error && "stderr" in e ? String((e as { stderr?: unknown }).stderr) : "";
    throw new ApplyError(`Undo failed because the inverse patch conflicted; the file may have changed again${msg ? `: ${msg.trim().slice(0, 200)}` : ""}`);
  }
  return execFileSync("git", ["-C", vault, "rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();
}
