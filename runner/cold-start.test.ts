import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { coldStartPolicy, isColdStart } from "./cold-start.ts";

test("cold start: absent or empty runtime stays blank; first batch caps at two and defers slow layer", () => {
  const out = join(mkdtempSync(join(tmpdir(), "forme-cold-")), "98_Forme");
  assert.equal(isColdStart(out), true);
  mkdirSync(join(out, "cards"), { recursive: true });
  writeFileSync(join(out, "decisions.jsonl"), "\n");
  writeFileSync(join(out, "Taste Rules.md"), "\n");
  writeFileSync(join(out, "run-metrics.jsonl"), '{"date":"2026-07-09","cardsWritten":0}\n');
  assert.equal(isColdStart(out), true);
  assert.deepEqual(coldStartPolicy(5, 4, true), { maxCards: 2, slowLayer: 0 });
  assert.deepEqual(coldStartPolicy(1, 4, true), { maxCards: 1, slowLayer: 0 });
});

test("cold start ends as soon as any durable runtime truth exists", () => {
  const base = mkdtempSync(join(tmpdir(), "forme-warm-"));
  const out = join(base, "98_Forme");
  mkdirSync(join(out, "cards"), { recursive: true });
  writeFileSync(join(out, "cards", "card_x.json"), "{}\n");
  assert.equal(isColdStart(out), false);
  assert.deepEqual(coldStartPolicy(3, 4, false), { maxCards: 3, slowLayer: 4 });
});
