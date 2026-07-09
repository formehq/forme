import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildRefacePrompt, graftFace, needsReface, unansweredQuestions } from "./reface.ts";
import { assembleCard } from "./card.ts";
import { checkCard } from "../schema/validate.ts";
import { cardToMarkdown } from "./mirror.ts";
import type { AgentCard, Card } from "./types.ts";

const ctx = { runId: "run_test", at: "2026-07-08T10:00:00Z", now: "2026-07-08T10:00:01Z" };

function mkCard(): Card {
  const ac: AgentCard = {
    category: "dangling-task",
    title: "社媒号确认被塞在已完成的 handle 任务里",
    summary: "已完成项里还藏着一条没做的事。",
    whyNow: "剩余动作没有拆成可追踪待办。",
    recommendationChoice: "accept",
    recommendationReason: "最小两行替换。",
    onAccept: null,
    evidence: [{ path: "Roadmap.md", locator: "L59", quote: "剩 @formehq 顺手确认", note: null }],
    diff: { file: "Roadmap.md", hunks: [{ locator: null, before: "旧行", after: "新行" }] },
    estSeconds: 10,
    stakes: "real-world-action",
  };
  const r = assembleCard(ac, ctx);
  assert.equal(r.validation.valid, true, r.validation.errors.join("; "));
  return r.card;
}

const face = (overrides: Partial<Parameters<typeof graftFace>[1]> = {}): Parameters<typeof graftFace>[1] => ({
  title: "The @formehq account is still unconfirmed",
  summary: null,
  whyNow: null,
  recommendationReason: "Accept to make the remaining launch dependency explicit.",
  onAccept: null,
  evidenceNotes: ["This is the unresolved account reference."],
  answer: null,
  ...overrides,
});

test("graftFace keeps identity, quotes, and diff while rewriting all explanatory prose in English", () => {
  const card = mkCard();
  const grafted = graftFace(
    card,
    face({
      title: "@formehq is still unconfirmed for the August 15 launch",
      summary: "The handle and organization exist, but the social account is unresolved.",
      whyNow: "The launch date is getting closer.",
      onAccept: "The remaining account dependency becomes an explicit action.",
    }),
    { kind: "gate", hit: "拆成" },
    "2026-07-08T11:00:00Z",
  ) as Record<string, unknown> & Card;
  assert.ok(grafted);
  assert.equal(grafted.id, card.id);
  assert.equal(grafted.fingerprint, card.fingerprint);
  assert.deepEqual(grafted.diff, card.diff);
  assert.equal(grafted.evidence[0]!.quote, card.evidence[0]!.quote);
  assert.equal(grafted.evidence[0]!.path, card.evidence[0]!.path);
  assert.equal(grafted.evidence[0]!.note, "This is the unresolved account reference.");
  assert.equal(grafted.title, "@formehq is still unconfirmed for the August 15 launch");
  assert.match(grafted.recommendation!.reason, /remaining launch dependency/);
  assert.equal(grafted.revisedAt, "2026-07-08T11:00:00Z");
  assert.deepEqual(grafted.options.map((option) => option.label), ["Accept", "Park", "Reject"]);
  assert.equal("context" in grafted, false); // gate 路径不造问答
  assert.equal(checkCard(grafted).valid, true, checkCard(grafted).errors.join("; "));
});

test("graftFace:question 路径要求 answer 非空——没答案 = 没补上 context,返回 null", () => {
  const card = mkCard();
  const cause = { kind: "question" as const, question: "这跟 8.15 有什么关系?" };
  assert.equal(graftFace(card, face({ answer: null }), cause, ctx.now), null);
  assert.equal(graftFace(card, face({ title: "  ", answer: "The launch entry needs this account." }), cause, ctx.now), null);
  const ok = graftFace(
    card,
    face({ answer: "The launch entry needs this account." }),
    cause,
    "2026-07-08T11:00:00Z",
  ) as Record<string, unknown> & Card;
  assert.ok(ok);
  assert.deepEqual(ok.context, { question: "这跟 8.15 有什么关系?", answer: "The launch entry needs this account." });
  assert.equal("summary" in ok, false); // null 可选项不落盘
  assert.equal(checkCard(ok).valid, true, checkCard(ok).errors.join("; "));
});

test("镜像渲染 v0.2:stakes/revisedAt 进 frontmatter,你问过段带问答", () => {
  const card = mkCard();
  const grafted = graftFace(
    card,
    face({ whyNow: "The launch needs this account.", answer: "The launch entry is incomplete without it." }),
    { kind: "question", question: "影响什么" },
    "2026-07-08T11:00:00Z",
  ) as unknown as Card;
  const md = cardToMarkdown(grafted);
  assert.match(md, /stakes: "real-world-action"/);
  assert.match(md, /revisedAt: "2026-07-08T11:00:00Z"/);
  assert.match(md, /## You asked\n\n> 影响什么\n\nThe launch entry is incomplete without it\./);
});

test("unansweredQuestions:最新问题存活;已决指纹不回场;宽容解析", () => {
  const p = join(mkdtempSync(join(tmpdir(), "forme-q-")), "decisions.jsonl");
  const fpA = "a".repeat(64);
  const fpB = "b".repeat(64);
  const fpC = "c".repeat(64);
  writeFileSync(p, [
    JSON.stringify({ v: "0", ts: "2026-07-08T01:00:00Z", type: "question", cardId: "cA", fingerprint: fpA, question: "第一问" }),
    JSON.stringify({ v: "0", ts: "2026-07-08T02:00:00Z", type: "question", cardId: "cA", fingerprint: fpA, question: "第二问" }),
    JSON.stringify({ v: "0", ts: "2026-07-08T01:00:00Z", type: "question", cardId: "cB", fingerprint: fpB, question: "B 问" }),
    JSON.stringify({ v: "0", ts: "2026-07-08T03:00:00Z", type: "decision", cardId: "cB", fingerprint: fpB, choice: "reject", actor: "owner", backfilled: true }),
    "这行不是 JSON",
    JSON.stringify({ v: "0", ts: "2026-07-08T04:00:00Z", type: "presented", cardId: "cC", fingerprint: fpC }),
  ].join("\n") + "\n");
  const qs = unansweredQuestions(p);
  assert.equal(qs.length, 1);
  assert.equal(qs[0]!.question, "第二问");
  assert.equal(qs[0]!.fingerprint, fpA);
});

test("needsReface:revisedAt 早于提问(或缺失)才欠一次重写", () => {
  const q = { cardId: "c", fingerprint: "f".repeat(64), question: "?", ts: "2026-07-08T02:00:00Z" };
  assert.equal(needsReface({}, q), true);
  assert.equal(needsReface({ revisedAt: "2026-07-08T01:00:00Z" }, q), true);
  assert.equal(needsReface({ revisedAt: "2026-07-08T03:00:00Z" }, q), false);
});

test("buildRefacePrompt preserves the user's question but requires an English rewrite", () => {
  const card = mkCard();
  const pq = buildRefacePrompt(card, { kind: "question", question: "这件事影响什么?" });
  assert.match(pq, /这件事影响什么?/);
  assert.match(pq, new RegExp(card.id));
  const pg = buildRefacePrompt(card, { kind: "gate", hit: "拆成" });
  assert.match(pg, /ledger phrase '拆成'/);
  assert.match(pg, /return null for answer/);
  assert.match(pg, /every returned product-facing field in English/);
});

test("buildRefacePrompt(#29): even a Chinese historical card is rewritten English-first", () => {
  const card = mkCard();
  const prompt = buildRefacePrompt(card, { kind: "gate", hit: "list surgery" });
  assert.match(prompt, /in English, even when the original card or vault evidence is Chinese/);
  assert.doesNotMatch(prompt.split("Original card JSON:")[0]!, /[\u3400-\u9fff]/u);
});
