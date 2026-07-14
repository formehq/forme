import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Card, Hunk } from "./types.ts";

/**
 * hunk 应用的纯函数层(#36):console accept 与 runner 的入列前干跑共用同一份
 * 语义——「accept 会怎么执行」在写卡时就用同一个函数回答,不可执行的卡不入列。
 * 住 runner/ 是依赖方向决定的:console 依赖 runner,反向不行。
 */

export class ApplyError extends Error {}

/**
 * 按 hunk 精确字符串替换。三种消歧途径,全无则拒绝(全有或全无,不猜):
 * 匹配唯一 → 直接换;`all: true` → 每一处都换(重复引用类漂移的表达);
 * 多处且有 `L<行号>` locator → 换离该行最近的一处。
 */
export function applyHunksToContent(content: string, hunks: Hunk[]): string {
  let out = content;
  for (const [i, h] of hunks.entries()) {
    const tag = `hunk ${i + 1}${h.locator ? `（${h.locator}）` : ""}`;
    if (h.before === "") {
      throw new ApplyError(`${tag}: pure insertions (empty before) are not auto-applied in v0; edit the vault manually`);
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
      throw new ApplyError(`${tag}: before no longer exists in the file; the content moved again and this card is stale`);
    }
    if (h.all) {
      out = out.split(h.before).join(h.after);
      continue;
    }
    let at = hits[0]!;
    if (hits.length > 1) {
      const line = h.locator?.match(/L(\d+)/)?.[1];
      if (!line) {
        throw new ApplyError(
          `${tag}: before appears ${hits.length} times; set "all": true to change every occurrence, or add L<line> to the locator`,
        );
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

/**
 * 入列前干跑(#36):对目标文件的当前内容跑一遍 applyHunksToContent,
 * 会在 accept 时 422 的卡(歧义/内容已漂/纯插入/文件不存在)当场打回,
 * 不让不可执行的提案走到人面前。只读,不落盘。
 */
export function checkAppliable(vault: string, card: Card): { ok: true } | { ok: false; error: string } {
  try {
    const content = readFileSync(join(vault, card.diff.file), "utf8");
    applyHunksToContent(content, card.diff.hunks);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
