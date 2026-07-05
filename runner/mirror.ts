import type { Card } from "./types.ts";

/**
 * Render a card to its markdown mirror. Hard constraint #4: every card has a
 * markdown mirror; the vault is the only truth layer, the UI holds no private
 * state. Frontmatter carries the envelope; the body is human-readable.
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
  L.push(`createdAt: "${card.createdAt}"`);
  L.push("---");
  L.push("");
  L.push(`# ${card.title}`);
  L.push("");
  if (card.summary) {
    L.push(card.summary);
    L.push("");
  }

  L.push("## 证据");
  for (const e of card.evidence) {
    const loc = e.locator ? ` \`${e.locator}\`` : "";
    const note = e.note ? ` — ${e.note}` : "";
    L.push(`- **${e.path}**${loc}${note}`);
    if (e.quote) for (const q of e.quote.split("\n")) L.push(`  > ${q}`);
  }
  L.push("");

  L.push(`## 最小 diff · \`${card.diff.file}\``);
  L.push("```diff");
  for (const h of card.diff.hunks) {
    if (h.locator) L.push(`@@ ${h.locator} @@`);
    if (h.before !== "") for (const l of h.before.split("\n")) L.push(`- ${l}`);
    if (h.after !== "") for (const l of h.after.split("\n")) L.push(`+ ${l}`);
  }
  L.push("```");
  L.push("");

  L.push("## 落子");
  L.push(card.options.map((o) => `\`[${o.hotkey}] ${o.label}\``).join("   "));
  L.push("");
  return L.join("\n");
}
