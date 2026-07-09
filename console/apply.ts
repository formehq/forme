import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { Card, Hunk } from "../runner/types.ts";

/**
 * accept 的执行路径(生命周期第 5 步):把卡的最小 diff 确定性应用到 vault
 * 文件,git 提交作为回执(executed = commit hash,可回滚)。这是 Forme 代码
 * 唯一一处写知识层——且只发生在**人已落子 accept** 之后,agent 永远只读。
 *
 * 全有或全无:任何 hunk 应用不了(内容又漂了 / 匹配歧义 / 纯插入)就整卡
 * 失败,文件一个字不动;git 提交失败则把原内容原样放回。
 */

export class ApplyError extends Error {}

/** 纯函数:按 hunk 精确字符串替换。匹配歧义时用 locator 的行号消歧。 */
export function applyHunksToContent(content: string, hunks: Hunk[]): string {
  let out = content;
  for (const [i, h] of hunks.entries()) {
    const tag = `hunk ${i + 1}${h.locator ? `（${h.locator}）` : ""}`;
    if (h.before === "") {
      throw new ApplyError(`${tag}:纯插入(before 为空)v0 不支持自动应用,请在 vault 侧手动处理`);
    }
    const hits: number[] = [];
    let from = 0;
    for (;;) {
      const at = out.indexOf(h.before, from);
      if (at < 0) break;
      hits.push(at);
      from = at + 1;
    }
    if (hits.length === 0) {
      throw new ApplyError(`${tag}:before 在文件里已不存在——内容又漂了,这张卡过期了`);
    }
    let at = hits[0]!;
    if (hits.length > 1) {
      const line = h.locator?.match(/L(\d+)/)?.[1];
      if (!line) {
        throw new ApplyError(`${tag}:before 出现 ${hits.length} 次且 locator 无行号,无法消歧`);
      }
      const target = Number(line);
      const lineOf = (p: number) => out.slice(0, p).split("\n").length;
      at = hits.reduce((best, cur) =>
        Math.abs(lineOf(cur) - target) < Math.abs(lineOf(best) - target) ? cur : best,
      );
    }
    out = out.slice(0, at) + h.after + out.slice(at + h.before.length);
  }
  return out;
}

export interface ApplyReceipt {
  file: string;
  hunks: number;
  executed: string; // 回执 commit(短 hash)
}

export function applyCardDiff(vault: string, card: Card, hunks: Hunk[]): ApplyReceipt {
  const rel = card.diff.file;
  const abs = resolve(vault, rel);
  if (!abs.startsWith(resolve(vault) + sep)) throw new ApplyError(`diff.file 越出 vault 边界:${rel}`);

  // 目标文件必须干净:回执 commit 只能包含这张卡的改动,
  // 不能把用户未提交的编辑一起裹进去(provenance 会撒谎,回滚会误伤)
  const dirty = execFileSync("git", ["-C", vault, "status", "--porcelain", "--", rel], {
    encoding: "utf8",
  }).trim();
  if (dirty) {
    throw new ApplyError(`目标文件有未提交的改动,先在 vault 侧提交或还原它再落子:${rel}`);
  }

  const original = readFileSync(abs, "utf8");
  const next = applyHunksToContent(original, hunks);
  writeFileSync(abs, next);
  try {
    execFileSync(
      "git",
      ["-C", vault, "commit", "-q", "-m", `forme: accept ${card.id} — ${card.title}`, "--", rel],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (e) {
    writeFileSync(abs, original); // 不留半执行状态
    const msg = e instanceof Error && "stderr" in e ? String((e as { stderr?: unknown }).stderr) : "";
    throw new ApplyError(`git 提交失败,文件已还原${msg ? `:${msg.trim().slice(0, 200)}` : ""}`);
  }
  const executed = execFileSync("git", ["-C", vault, "rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();
  return { file: rel, hunks: hunks.length, executed };
}

/**
 * 撤销一次已执行的 accept(#24 撤销窗口):`git revert` 回执 commit——
 * 历史只追加(与事件日志同一姿态),不用 reset 抹历史。revert 冲突
 * (窗口这几秒里文件又被人改了)则 abort 还原,整个撤销失败。
 * 返回 revert commit 的短 hash(记进 undo 事件的 executed,凭证闭环)。
 */
export function revertCommit(vault: string, hash: string): string {
  try {
    execFileSync("git", ["-C", vault, "revert", "--no-edit", hash], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    try {
      execFileSync("git", ["-C", vault, "revert", "--abort"], { stdio: "ignore" });
    } catch {
      /* 没有进行中的 revert 就算了 */
    }
    const msg = e instanceof Error && "stderr" in e ? String((e as { stderr?: unknown }).stderr) : "";
    throw new ApplyError(`撤销失败(revert 冲突,文件可能又被改过)${msg ? `:${msg.trim().slice(0, 200)}` : ""}`);
  }
  return execFileSync("git", ["-C", vault, "rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();
}
