import type { Card, Stakes } from "./types.ts";

/**
 * 世界层闸(issue #21,卡面 v0.2)。出身:07-07 晚 Zayn 第三次卡面反馈,
 * 标本 = card_66bcc(@formehq)——标题「社媒号确认被塞在已完成的 handle
 * 任务里」全程在**账本层**说话(文档手术),世界层事实(@formehq 账号没
 * 确认、8.15 发布要用)零出现;latencyMs 949s vs 同批世界层清晰卡 12s。
 *
 * 规则:**卡面说事,diff 说账**——「是什么」(title/summary)与「为什么
 * 现在」(whyNow)必须说用户世界里的事;列表手术语言降到 onAccept 与 diff。
 *
 * 闸与 #13 的规则行禁词闸同族:机器检查,不靠 prompt 恳求。「世界层名词」
 * 无法确定性枚举,取其对偶——**账本语域在世界层段零容忍**:世界层段命中
 * 账本手术词即打回(先给一次 reface 重写机会,仍不过即弃)。纯账本卡
 * (stakes = reversible-ledger)豁免:它们的「事」就是账。
 */

export const STAKES_VALUES: readonly Stakes[] = ["reversible-ledger", "real-world-action", "thought"];

/** 账本类 category:动作只发生在账面上,卡面豁免世界层闸、保持 10 秒瘦。 */
const LEDGER_CATEGORIES = new Set(["stale-frontmatter", "broken-link", "naming-drift"]);

/**
 * 卡的有效 stakes:agent 申报合法就用申报,否则按 category 派生
 * (账本类 → reversible-ledger,其余 → real-world-action;thought 只
 * 认显式申报——#18 思想卡有自己的出生通道)。
 */
export function effectiveStakes(card: Pick<Card, "category"> & { stakes?: string | null }): Stakes {
  if (card.stakes && (STAKES_VALUES as readonly string[]).includes(card.stakes)) return card.stakes as Stakes;
  return LEDGER_CATEGORIES.has(card.category) ? "reversible-ledger" : "real-world-action";
}

/** 账本语域模式:只列纯手术词——世界层标题本来就不会用它们。 */
const LEDGER_SPEECH: RegExp[] = [
  /已完成的?[^,。;\n]{0,12}(任务|项|列表)/, // 「已完成的 handle 任务里」「已完成项里」
  /待办/,
  /拆成/,
  /速览/,
  /勾选/,
  /列表项/,
  /清单里/,
  /条目里/,
  /frontmatter/i,
  /字段(值|里)/,
];

/** 返回文本里第一个命中的账本语域片段,干净则 null。 */
export function ledgerSpeechIn(text: string): string | null {
  for (const re of LEDGER_SPEECH) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

export interface LegibilityResult {
  ok: boolean;
  /** 命中的账本片段(ok 时为 null)。 */
  hit: string | null;
}

/** 世界层闸:检查卡的世界层段(title + summary + whyNow)。 */
export function checkLegibility(
  card: Pick<Card, "category" | "title"> & { stakes?: string | null; summary?: string; whyNow?: string },
): LegibilityResult {
  if (effectiveStakes(card) === "reversible-ledger") return { ok: true, hit: null };
  const worldFace = [card.title, card.summary ?? "", card.whyNow ?? ""].join("\n");
  const hit = ledgerSpeechIn(worldFace);
  return hit ? { ok: false, hit } : { ok: true, hit: null };
}
