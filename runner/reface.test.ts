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

test("graftFace:只换脸——id/指纹/diff/evidence 原样,revisedAt 打点,结果过 AJV 门", () => {
  const card = mkCard();
  const grafted = graftFace(
    card,
    {
      title: "@formehq 社媒号还没确认,8.15 发布要用",
      summary: "handle 和 org 都到手了,唯独社媒账号悬着。",
      whyNow: "发布日越来越近。",
      onAccept: "这件事变成一条独立可追的事。",
      answer: null,
    },
    { kind: "gate", hit: "拆成" },
    "2026-07-08T11:00:00Z",
  ) as Record<string, unknown> & Card;
  assert.ok(grafted);
  assert.equal(grafted.id, card.id);
  assert.equal(grafted.fingerprint, card.fingerprint);
  assert.deepEqual(grafted.diff, card.diff);
  assert.deepEqual(grafted.evidence, card.evidence);
  assert.equal(grafted.title, "@formehq 社媒号还没确认,8.15 发布要用");
  assert.equal(grafted.revisedAt, "2026-07-08T11:00:00Z");
  assert.equal("context" in grafted, false); // gate 路径不造问答
  assert.equal(checkCard(grafted).valid, true, checkCard(grafted).errors.join("; "));
});

test("graftFace:question 路径要求 answer 非空——没答案 = 没补上 context,返回 null", () => {
  const card = mkCard();
  const cause = { kind: "question" as const, question: "这跟 8.15 有什么关系?" };
  assert.equal(graftFace(card, { title: "新题", summary: null, whyNow: null, onAccept: null, answer: null }, cause, ctx.now), null);
  assert.equal(graftFace(card, { title: "  ", summary: null, whyNow: null, onAccept: null, answer: "答" }, cause, ctx.now), null);
  const ok = graftFace(
    card,
    { title: "@formehq 还没确认", summary: null, whyNow: null, onAccept: null, answer: "发布入口要用这个号。" },
    cause,
    "2026-07-08T11:00:00Z",
  ) as Record<string, unknown> & Card;
  assert.ok(ok);
  assert.deepEqual(ok.context, { question: "这跟 8.15 有什么关系?", answer: "发布入口要用这个号。" });
  assert.equal("summary" in ok, false); // null 可选项不落盘
  assert.equal(checkCard(ok).valid, true, checkCard(ok).errors.join("; "));
});

test("镜像渲染 v0.2:stakes/revisedAt 进 frontmatter,你问过段带问答", () => {
  const card = mkCard();
  const grafted = graftFace(
    card,
    { title: "@formehq 还没确认", summary: null, whyNow: "发布要用。", onAccept: null, answer: "入口缺一角。" },
    { kind: "question", question: "影响什么" },
    "2026-07-08T11:00:00Z",
  ) as unknown as Card;
  const md = cardToMarkdown(grafted);
  assert.match(md, /stakes: "real-world-action"/);
  assert.match(md, /revisedAt: "2026-07-08T11:00:00Z"/);
  assert.match(md, /## 你问过\n\n> 影响什么\n\n入口缺一角。/);
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

test("buildRefacePrompt:question 带原话,gate 带命中片段,原卡 JSON 在场", () => {
  const card = mkCard();
  const pq = buildRefacePrompt(card, { kind: "question", question: "这件事影响什么?" });
  assert.match(pq, /这件事影响什么?/);
  assert.match(pq, new RegExp(card.id));
  const pg = buildRefacePrompt(card, { kind: "gate", hit: "拆成" });
  assert.match(pg, /「拆成」/);
  assert.match(pg, /answer 返回 null/);
});

test("buildRefacePrompt(#28):英文卡重写时保持英文,不退回 owner 中文默认", () => {
  const card = mkCard();
  card.title = "The launch promise is stale";
  card.summary = "The public date no longer matches the current plan.";
  card.whyNow = "A partner will quote it this week.";
  const prompt = buildRefacePrompt(card, { kind: "gate", hit: "list surgery" });
  assert.match(prompt, /in English/);
  assert.doesNotMatch(prompt, /卡面文案用中文/);
});
