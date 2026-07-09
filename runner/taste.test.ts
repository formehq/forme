import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadTasteRuleLines,
  loadTasteRuleRecords,
  readDecisionLog,
  sampleStats,
  hasNegativeSamples,
  compactStats,
  bannedWordIn,
  buildTastePrompt,
  isEnglishRule,
  vetRules,
  writeTasteRules,
  type AgentRule,
} from "./taste.ts";

const dir = () => mkdtempSync(join(tmpdir(), "forme-taste-"));

const rule = (over: Partial<AgentRule> = {}): AgentRule => ({
  rule: "Keep summaries concise and decision-ready.",
  rationale: "The user accepted concise summaries across eight cards.",
  sourceCardIds: ["card-001", "card-002"],
  confidence: "high",
  confidenceNote: null,
  ...over,
});

test("零负样本时 confidence 一律钉死 low,数据基础写进 note(#10 诚实置信)", () => {
  const stats = sampleStats(
    [
      { cardId: "card-001", choice: "accept" },
      { cardId: "card-002", choice: "accept" },
    ],
    0,
  );
  assert.equal(hasNegativeSamples(stats), false);
  const v = vetRules([rule({ confidence: "high" })], new Set(["card-001", "card-002"]), stats);
  assert.equal(v[0]!.confidence, "low");
  assert.match(v[0]!.confidenceNote, /No negative samples/);
  assert.match(v[0]!.confidenceNote, /2 decisions = 2 accept · 0 reject · 0 park · 0 correction/);
});

test("有负样本时保留 agent 声称的置信;非法置信回落 low", () => {
  const stats = sampleStats(
    [
      { cardId: "a", choice: "accept" },
      { cardId: "b", choice: "reject" },
    ],
    0,
  );
  assert.equal(hasNegativeSamples(stats), true);
  const v = vetRules(
    [rule({ sourceCardIds: ["a", "b"], confidence: "medium" }), rule({ rule: "Use plain language.", sourceCardIds: ["a"], confidence: "very-high" })],
    new Set(["a", "b"]),
    stats,
  );
  assert.equal(v[0]!.confidence, "medium");
  assert.equal(v[1]!.confidence, "low");
});

test("溯源护栏:幻觉 cardId 被过滤;出处清零的规则整条丢弃", () => {
  const stats = sampleStats([{ cardId: "card-001", choice: "accept" }], 0);
  const v = vetRules(
    [rule({ sourceCardIds: ["card-001", "card-999"] }), rule({ rule: "Invent no supporting evidence.", sourceCardIds: ["card-999"] })],
    new Set(["card-001"]),
    stats,
  );
  assert.equal(v.length, 1);
  assert.deepEqual(v[0]!.sources, ["card-001"]);
});

test("forward-only write preserves historical Chinese rules and appends English rules", () => {
  const p = join(dir(), "Taste Rules.md");
  const stats = sampleStats([{ cardId: "c1", choice: "accept" }], 0);
  writeFileSync(p, "# Taste Rules\n\n## R1 · 报告与总结用中文\n\n<!-- Zayn 手记:R1 保留 -->\n");
  const [next] = vetRules([rule({ sourceCardIds: ["c1"] })], new Set(["c1"]), stats);
  writeTasteRules(p, [next!], "2026-07-14", stats);
  const body = readFileSync(p, "utf8");
  assert.match(body, /## R1 · 报告与总结用中文/);
  assert.match(body, /<!-- Zayn 手记:R1 保留 -->/);
  assert.match(body, /## R2 · Keep summaries concise and decision-ready\./);
  assert.deepEqual(loadTasteRuleLines(p), ["报告与总结用中文", "Keep summaries concise and decision-ready."]);
});

test("#13 双层:账本小字由代码渲染,注释块可 round-trip 读回", () => {
  const p = join(dir(), "Taste Rules.md");
  const stats = sampleStats([{ cardId: "c1", choice: "accept" }, { cardId: "c2", choice: "accept" }], 0);
  const vetted = vetRules([rule({ sourceCardIds: ["c1", "c2"], confidence: "high" })], new Set(["c1", "c2"]), stats);
  writeTasteRules(p, vetted, "2026-07-07", stats);
  const md = readFileSync(p, "utf8");
  // 账本小字:一行合并式,置信被钉死为低
  assert.match(md, /\*Based on 2 cards · 2 all-accept decisions, no negative samples → low confidence · distilled 07-07 · reverify after 20 decisions\*/);
  // 存储层完整读回
  const [rec] = loadTasteRuleRecords(p);
  assert.equal(rec!.id, "R1");
  assert.deepEqual(rec!.sources, ["c1", "c2"]);
  assert.equal(rec!.confidence, "low");
  assert.equal(rec!.status, "candidate");
  assert.equal(rec!.added, "2026-07-07");
  assert.equal(rec!.reverifyAfterDecisions, 20);
  assert.ok(rec!.rationale!.length > 0);
});

test("#13 禁词硬闸:系统词上了规则行 → 整条丢弃(不靠 prompt 恳求)", () => {
  assert.equal(bannedWordIn("散落材料归位时接进已有索引"), null);
  assert.equal(bannedWordIn("给 Hub 补 frontmatter 并登记 provenance"), "provenance");
  assert.equal(bannedWordIn("Rewrite the diff hunk after checking the wikilink"), "wikilink");
  assert.equal(isEnglishRule("Write every new rule in English."), true);
  assert.equal(isEnglishRule("新规则写中文"), false);
  const stats = sampleStats([{ cardId: "c1", choice: "accept" }], 0);
  const v = vetRules(
    [
      rule({ rule: "Put the cardId in the Source Index.", sourceCardIds: ["c1"] }),
      rule({ rule: "新提炼规则必须被拒绝", sourceCardIds: ["c1"] }),
      rule({ rule: "Keep one clear source of truth.", sourceCardIds: ["c1"] }),
    ],
    new Set(["c1"]),
    stats,
  );
  assert.equal(v.length, 1);
  assert.equal(v[0]!.rule, "Keep one clear source of truth.");
});

test("compactStats:有负样本时如实分列", () => {
  const s = sampleStats(
    [{ cardId: "a", choice: "accept" }, { cardId: "b", choice: "reject" }, { cardId: "c", choice: "park" }],
    1,
  );
  assert.equal(compactStats(s), "3 decisions (1 accept · 1 reject · 1 park · 1 correction)");
});

test("taste prompt requires English output while treating Chinese history as evidence (#29)", () => {
  const stats = sampleStats([{ cardId: "c1", choice: "accept" }], 0);
  const prompt = buildTastePrompt({ maxRules: 2, stats, digest: ["- c1 · example"], existingRules: ["报告与总结用中文"] });
  assert.match(prompt, /Every new rule must be a single English imperative sentence/);
  assert.match(prompt, /Existing rules may be in any language/);
  assert.match(prompt, /报告与总结用中文/);
});

test("readDecisionLog 宽容:坏行跳过,correction 计数,decision 提取 choice/executed", () => {
  const p = join(dir(), "decisions.jsonl");
  writeFileSync(
    p,
    [
      "not json {",
      JSON.stringify({ v: "0", ts: "t", type: "presented", cardId: "c1", fingerprint: "f" }),
      JSON.stringify({ v: "0", ts: "t", type: "decision", cardId: "c1", fingerprint: "f", choice: "accept", actor: "owner", executed: "abc1234" }),
      JSON.stringify({ v: "0", ts: "t", type: "correction", cardId: "c1", fingerprint: "f", correction: { hunks: [] } }),
    ].join("\n") + "\n",
  );
  const { decisions, corrections } = readDecisionLog(p);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]!.executed, "abc1234");
  assert.equal(corrections, 1);
});

test("readDecisionLog:undo(#24)撤销同卡最近一次 decision——反悔的落子不是 taste", () => {
  const p = join(mkdtempSync(join(tmpdir(), "forme-taste-undo-")), "d.jsonl");
  writeFileSync(
    p,
    [
      JSON.stringify({ v: "0", ts: "t1", type: "decision", cardId: "c1", choice: "park" }),
      JSON.stringify({ v: "0", ts: "t2", type: "undo", cardId: "c1" }),
      JSON.stringify({ v: "0", ts: "t3", type: "decision", cardId: "c1", choice: "reject" }),
      JSON.stringify({ v: "0", ts: "t4", type: "decision", cardId: "c2", choice: "accept" }),
      JSON.stringify({ v: "0", ts: "t5", type: "undo", cardId: "c2" }),
    ].join("\n") + "\n",
  );
  const { decisions } = readDecisionLog(p);
  assert.deepEqual(decisions.map((d) => [d.cardId, d.choice]), [["c1", "reject"]]);
});
