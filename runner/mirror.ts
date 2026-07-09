import type { Card } from "./types.ts";

const CHOICE_LABEL: Record<string, string> = { accept: "接受", park: "搁置", reject: "拒绝" };

/**
 * Render a card to its markdown mirror. Hard constraint #4: every card has a
 * markdown mirror; the vault is the only truth layer, the UI holds no private
 * state. Frontmatter carries the envelope; the body is human-readable.
 *
 * v0.1(#12,源自 Zayn 07-06 第一条真实设计反馈):**决策者优先五段**——
 * ① 是什么(标题+一句 context)② 为什么现在 ③ 建议+一行理由(影子模式
 * 第一形态)④ 拍板后会发生什么 ⑤ 证据与 diff 折叠为支撑层(Obsidian
 * 可折叠 callout,展开可核查)。落子手势紧跟 ④,决策不需要滚过证据。
 * v0 卡(无新字段)仍能渲染:②③ 缺失即整段省略。
 */
export function cardToMarkdown(card: Card): string {
  const L: string[] = [];
  L.push("---");
  L.push("forme: card");
  L.push(`id: "${card.id}"`);
  L.push(`schemaVersion: "${card.schemaVersion}"`);
  L.push(`category: "${card.category}"`);
  L.push(`fingerprint: "${card.fingerprint}"`);
  L.push(`role: "${card.role}"`);
  L.push(`from: "${card.from}"`);
  L.push(
    `origin: { agent: "${card.origin.agent}", runId: "${card.origin.runId}", at: "${card.origin.at}" }`,
  );
  if (card.estSeconds !== undefined) L.push(`estSeconds: ${card.estSeconds}`);
  if (card.stakes) L.push(`stakes: "${card.stakes}"`);
  L.push(`createdAt: "${card.createdAt}"`);
  if (card.revisedAt) L.push(`revisedAt: "${card.revisedAt}"`);
  L.push("---");
  L.push("");

  // ① 是什么
  L.push(`# ${card.title}`);
  L.push("");
  if (card.summary) {
    L.push(card.summary);
    L.push("");
  }

  // ② 为什么现在(出身/时机)
  if (card.whyNow) {
    L.push("## 为什么现在");
    L.push("");
    L.push(card.whyNow);
    L.push("");
  }

  // ②′ 你问过(#21 question 通道往返:问题与回答都留在镜像里,卡自含)
  if (card.context) {
    L.push("## 你问过");
    L.push("");
    L.push(`> ${card.context.question}`);
    L.push("");
    L.push(card.context.answer);
    L.push("");
  }

  // ③ 建议 + 一行理由
  if (card.recommendation) {
    L.push("## 建议");
    L.push("");
    L.push(`**${CHOICE_LABEL[card.recommendation.choice]}** —— ${card.recommendation.reason}`);
    L.push("");
  }

  // ④ 拍板后会发生什么(agent 一句人话 + 确定性事实行)
  L.push("## 拍板后会发生什么");
  L.push("");
  if (card.onAccept) L.push(card.onAccept);
  L.push(`改 \`${card.diff.file}\`（${card.diff.hunks.length} 处最小改动）;git 提交,可回滚。`);
  L.push("");

  L.push("## 落子");
  L.push("");
  L.push(card.options.map((o) => `\`[${o.hotkey}] ${o.label}\``).join("   "));
  L.push("");

  // ⑤ 支撑层(折叠,展开可核查)
  L.push("> [!quote]- 证据（展开核查）");
  for (const e of card.evidence) {
    const loc = e.locator ? ` \`${e.locator}\`` : "";
    const note = e.note ? ` — ${e.note}` : "";
    L.push(`> - **${e.path}**${loc}${note}`);
    if (e.quote) for (const q of e.quote.split("\n")) L.push(`>   > ${q}`);
  }
  L.push("");
  L.push(`> [!example]- 最小 diff · \`${card.diff.file}\``);
  L.push("> ```diff");
  for (const h of card.diff.hunks) {
    if (h.locator) L.push(`> @@ ${h.locator} @@`);
    if (h.before !== "") for (const l of h.before.split("\n")) L.push(`> - ${l}`);
    if (h.after !== "") for (const l of h.after.split("\n")) L.push(`> + ${l}`);
  }
  L.push("> ```");
  L.push("");
  return L.join("\n");
}
