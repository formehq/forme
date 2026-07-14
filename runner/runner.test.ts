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
  title: "The Knowledge Map link no longer resolves",
  summary: null,
  whyNow: null,
  recommendationChoice: null,
  recommendationReason: null,
  onAccept: null,
  evidence: [{ path: "04_Index/Home.md", locator: "L7", quote: "[[Knowledge Map]]", note: "The target no longer resolves." }],
  diff: {
    file: "04_Index/Home.md",
    hunks: [{ locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]", all: null }],
  },
  estSeconds: null,
  stakes: null,
});

const v01 = (): AgentCard => ({
  ...base(),
  whyNow: "The canvas was renamed last week, but this link did not move with it.",
  recommendationChoice: "accept",
  recommendationReason: "This restores the link without changing the underlying content.",
  onAccept: "The Knowledge Map entry in Home becomes clickable again.",
});

test("assembleCard produces a valid, fingerprinted card", () => {
  const r = assembleCard(base(), ctx);
  assert.ok(r.validation.valid, r.validation.errors.join("; "));
  assert.match(r.card.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(r.card.id, `card_${r.card.fingerprint.slice(0, 16)}`);
  assert.equal(r.card.role, "proposal");
  assert.equal(r.card.options.length, 3);
  assert.deepEqual(r.card.options.map((option) => option.label), ["Accept", "Park", "Reject"]);
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
  assert.match(md, /> \[!quote\]- Evidence \(expand to verify\)/);
  assert.match(md, /> \[!example\]- Minimal diff/);
  assert.match(md, /> \+ \[\[Knowledge Map\.canvas\|Knowledge Map\]\]/);
  assert.match(md, /\[a\] Accept/);
});

test("v0.1 五段:决策段在前,支撑层折叠在后(#12)", () => {
  const md = cardToMarkdown(assembleCard(v01(), ctx).card);
  assert.match(md, /## Why now\n\nThe canvas was renamed last week/);
  assert.match(md, /## Recommendation\n\n\*\*Accept\*\* · This restores the link/);
  assert.match(md, /## After you decide\n\nThe Knowledge Map entry in Home becomes clickable again\.\nUpdates `04_Index\/Home\.md` \(1 minimal edit\); committed to git and reversible\./);
  // 决策者优先:落子手势出现在折叠证据之前
  assert.ok(md.indexOf("## Decide") < md.indexOf("[!quote]-"));
});

test("v0 卡(无新字段)仍渲染:②③ 整段省略,④ 用确定性事实行", () => {
  const md = cardToMarkdown(assembleCard(base(), ctx).card);
  assert.equal(md.includes("## Why now"), false);
  assert.equal(md.includes("## Recommendation"), false);
  assert.match(md, /## After you decide\n\nUpdates `04_Index\/Home\.md`/);
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
  assert.deepEqual(good.card.recommendation, { choice: "accept", reason: "This restores the link without changing the underlying content." });
  const tampered = { ...good.serializable, recommendation: { choice: "apply", reason: "x" } };
  assert.equal(checkCard(tampered).valid, false);
});

test("same drift → same fingerprint regardless of hunk order", () => {
  const order1: AgentCard = {
    ...base(),
    diff: {
      file: "04_Index/Home.md",
      hunks: [
        { locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]", all: null },
        { locator: "L53", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]", all: null },
      ],
    },
  };
  const order2: AgentCard = {
    ...base(),
    diff: {
      file: "04_Index/Home.md",
      hunks: [
        { locator: "L53", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]", all: null },
        { locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]", all: null },
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
