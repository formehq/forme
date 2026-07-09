import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleCard } from "./card.ts";
import { cardToMarkdown } from "./mirror.ts";
import { agentOutputSchema } from "./agent-schema.ts";
import { checkCard } from "../schema/validate.ts";
import type { AgentCard } from "./types.ts";

const ctx = { runId: "run_test", at: "2026-07-04T20:00:00Z", now: "2026-07-04T20:00:01Z" };

const base = (): AgentCard => ({
  category: "broken-link",
  title: "断链",
  summary: null,
  whyNow: null,
  recommendationChoice: null,
  recommendationReason: null,
  onAccept: null,
  evidence: [{ path: "04_Index/Home.md", locator: "L7", quote: "[[Knowledge Map]]", note: "未解析" }],
  diff: {
    file: "04_Index/Home.md",
    hunks: [{ locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" }],
  },
  estSeconds: null,
  stakes: null,
});

const v01 = (): AgentCard => ({
  ...base(),
  whyNow: "上周你把 canvas 改了名,这条链接当时没跟上。",
  recommendationChoice: "accept",
  recommendationReason: "纯链接修复,不动内容。",
  onAccept: "Home 的 Key Maps 链接恢复可点。",
});

test("assembleCard produces a valid, fingerprinted card", () => {
  const r = assembleCard(base(), ctx);
  assert.ok(r.validation.valid, r.validation.errors.join("; "));
  assert.match(r.card.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(r.card.id, `card_${r.card.fingerprint.slice(0, 16)}`);
  assert.equal(r.card.role, "proposal");
  assert.equal(r.card.options.length, 3);
});

test("null optionals are stripped from the serialized card", () => {
  const r = assembleCard(base(), ctx);
  assert.equal("summary" in r.serializable, false);
  assert.equal("estSeconds" in r.serializable, false);
});

test("Forme owns provenance the agent never sets", () => {
  const r = assembleCard(base(), ctx);
  assert.equal(r.card.origin.agent, "codex");
  assert.equal(r.card.origin.runId, "run_test");
  assert.equal(r.card.from, "forme://local/runner");
  assert.equal(r.card.schemaVersion, "0");
});

test("an agent card our AJV rejects (empty evidence) is caught", () => {
  const bad: AgentCard = { ...base(), evidence: [] };
  assert.equal(assembleCard(bad, ctx).validation.valid, false);
});

test("markdown mirror renders envelope + folded evidence/diff + gestures", () => {
  const md = cardToMarkdown(assembleCard(base(), ctx).card);
  assert.match(md, /forme: card/);
  assert.match(md, /> \[!quote\]- 证据（展开核查）/);
  assert.match(md, /> \[!example\]- 最小 diff/);
  assert.match(md, /> \+ \[\[Knowledge Map\.canvas\|Knowledge Map\]\]/);
  assert.match(md, /\[a\] 接受/);
});

test("v0.1 五段:决策段在前,支撑层折叠在后(#12)", () => {
  const md = cardToMarkdown(assembleCard(v01(), ctx).card);
  assert.match(md, /## 为什么现在\n\n上周你把 canvas 改了名/);
  assert.match(md, /## 建议\n\n\*\*接受\*\* —— 纯链接修复,不动内容。/);
  assert.match(md, /## 拍板后会发生什么\n\nHome 的 Key Maps 链接恢复可点。\n改 `04_Index\/Home\.md`（1 处最小改动）;git 提交,可回滚。/);
  // 决策者优先:落子手势出现在折叠证据之前
  assert.ok(md.indexOf("## 落子") < md.indexOf("[!quote]-"));
});

test("v0 卡(无新字段)仍渲染:②③ 整段省略,④ 用确定性事实行", () => {
  const md = cardToMarkdown(assembleCard(base(), ctx).card);
  assert.equal(md.includes("## 为什么现在"), false);
  assert.equal(md.includes("## 建议"), false);
  assert.match(md, /## 拍板后会发生什么\n\n改 `04_Index\/Home\.md`/);
});

test("recommendation 消毒:choice 不在枚举 → 整体丢弃,卡仍有效", () => {
  const r = assembleCard({ ...v01(), recommendationChoice: "apply" }, ctx);
  assert.ok(r.validation.valid);
  assert.equal(r.card.recommendation, undefined);
  assert.equal("recommendation" in r.serializable, false);
});

test("v0.1 字段过自有 AJV 门;坏 recommendation 直接过门会被拒", () => {
  const good = assembleCard(v01(), ctx);
  assert.ok(good.validation.valid);
  assert.deepEqual(good.card.recommendation, { choice: "accept", reason: "纯链接修复,不动内容。" });
  const tampered = { ...good.serializable, recommendation: { choice: "apply", reason: "x" } };
  assert.equal(checkCard(tampered).valid, false);
});

test("same drift → same fingerprint regardless of hunk order", () => {
  const order1: AgentCard = {
    ...base(),
    diff: {
      file: "04_Index/Home.md",
      hunks: [
        { locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" },
        { locator: "L53", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" },
      ],
    },
  };
  const order2: AgentCard = {
    ...base(),
    diff: {
      file: "04_Index/Home.md",
      hunks: [
        { locator: "L53", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" },
        { locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" },
      ],
    },
  };
  assert.equal(assembleCard(order1, ctx).card.fingerprint, assembleCard(order2, ctx).card.fingerprint);
});

test("agent output schema is strict-safe (all props required, no pattern/minItems)", () => {
  const schema = agentOutputSchema() as Record<string, any>;
  const card = schema.properties.cards.items;
  assert.deepEqual(new Set(card.required), new Set(Object.keys(card.properties)));
  const json = JSON.stringify(schema);
  assert.equal(/"pattern"|"minItems"|"format"|"minLength"/.test(json), false);
});
