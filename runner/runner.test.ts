import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleCard } from "./card.ts";
import { cardToMarkdown } from "./mirror.ts";
import { agentOutputSchema } from "./agent-schema.ts";
import type { AgentCard } from "./types.ts";

const ctx = { runId: "run_test", at: "2026-07-04T20:00:00Z", now: "2026-07-04T20:00:01Z" };

const base = (): AgentCard => ({
  category: "broken-link",
  title: "断链",
  summary: null,
  evidence: [{ path: "04_Index/Home.md", locator: "L7", quote: "[[Knowledge Map]]", note: "未解析" }],
  diff: {
    file: "04_Index/Home.md",
    hunks: [{ locator: "L7", before: "[[Knowledge Map]]", after: "[[Knowledge Map.canvas|Knowledge Map]]" }],
  },
  estSeconds: null,
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

test("markdown mirror renders envelope + evidence + diff + gestures", () => {
  const md = cardToMarkdown(assembleCard(base(), ctx).card);
  assert.match(md, /forme: card/);
  assert.match(md, /## 证据/);
  assert.match(md, /```diff/);
  assert.match(md, /\+ \[\[Knowledge Map\.canvas\|Knowledge Map\]\]/);
  assert.match(md, /\[a\] 接受/);
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
