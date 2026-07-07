import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadTasteRuleLines,
  readDecisionLog,
  sampleStats,
  hasNegativeSamples,
  vetRules,
  writeTasteRules,
  type AgentRule,
} from "./taste.ts";

const dir = () => mkdtempSync(join(tmpdir(), "forme-taste-"));

const rule = (over: Partial<AgentRule> = {}): AgentRule => ({
  rule: "报告与总结用中文",
  rationale: "8 条全部接受中文卡面",
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
  assert.match(v[0]!.confidenceNote, /零负样本/);
  assert.match(v[0]!.confidenceNote, /2 决策 = 2 accept · 0 reject · 0 park · 0 correction/);
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
    [rule({ sourceCardIds: ["a", "b"], confidence: "medium" }), rule({ rule: "另一条", sourceCardIds: ["a"], confidence: "很高" })],
    new Set(["a", "b"]),
    stats,
  );
  assert.equal(v[0]!.confidence, "medium");
  assert.equal(v[1]!.confidence, "low");
});

test("溯源护栏:幻觉 cardId 被过滤;出处清零的规则整条丢弃", () => {
  const stats = sampleStats([{ cardId: "card-001", choice: "accept" }], 0);
  const v = vetRules(
    [rule({ sourceCardIds: ["card-001", "card-999"] }), rule({ rule: "全靠编", sourceCardIds: ["card-999"] })],
    new Set(["card-001"]),
    stats,
  );
  assert.equal(v.length, 1);
  assert.deepEqual(v[0]!.sources, ["card-001"]);
});

test("写盘:首建带头部;再写只追加,编号接续,人编辑部分不动", () => {
  const p = join(dir(), "Taste Rules.md");
  const stats = sampleStats([{ cardId: "c1", choice: "accept" }], 0);
  const [r1, r2] = vetRules([rule({ sourceCardIds: ["c1"] }), rule({ rule: "第二条", sourceCardIds: ["c1"] })], new Set(["c1"]), stats);
  writeTasteRules(p, [r1!], "2026-07-07");
  const first = readFileSync(p, "utf8");
  assert.match(first, /forme: taste-rules/);
  assert.match(first, /## R1 · 报告与总结用中文/);

  // 模拟人肉编辑后再追加
  writeFileSync(p, first + "\n<!-- Zayn 手记:R1 保留 -->\n");
  writeTasteRules(p, [r2!], "2026-07-14");
  const second = readFileSync(p, "utf8");
  assert.match(second, /<!-- Zayn 手记:R1 保留 -->/);
  assert.match(second, /## R2 · 第二条/);
  assert.deepEqual(loadTasteRuleLines(p), ["报告与总结用中文", "第二条"]);
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
