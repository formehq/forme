import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkCard, checkEvent } from "./validate.ts";
import { fingerprint, diffHash } from "./fingerprint.ts";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(here, "samples");

const cardFiles = readdirSync(samplesDir)
  .filter((f) => f.startsWith("card-") && f.endsWith(".json"))
  .sort();

const loadCard = (f: string) =>
  JSON.parse(readFileSync(join(samplesDir, f), "utf8"));

test("three hand-written sample cards exist", () => {
  assert.equal(cardFiles.length, 3, `expected 3 sample cards, found ${cardFiles.length}`);
});

for (const f of cardFiles) {
  test(`card ${f} passes schema`, () => {
    const r = checkCard(loadCard(f));
    assert.ok(r.valid, `errors:\n${r.errors.join("\n")}`);
  });

  test(`card ${f} fingerprint matches its category + diff`, () => {
    const card = loadCard(f);
    assert.equal(card.fingerprint, fingerprint({ category: card.category, diff: card.diff }));
  });
}

test("every decisions.jsonl sample event passes schema", () => {
  const lines = readFileSync(join(samplesDir, "decisions.sample.jsonl"), "utf8")
    .trim()
    .split("\n");
  assert.ok(lines.length > 0);
  lines.forEach((line, i) => {
    const r = checkEvent(JSON.parse(line));
    assert.ok(r.valid, `line ${i + 1} errors:\n${r.errors.join("\n")}`);
  });
});

test("fingerprint is stable and order-independent across hunks", () => {
  const a = { category: "broken-link", diff: { file: "x.md", hunks: [
    { locator: "L1", before: "a", after: "b" },
    { locator: "L2", before: "c", after: "d" },
  ] } };
  const b = { category: "broken-link", diff: { file: "x.md", hunks: [
    { locator: "L2", before: "c", after: "d" },
    { locator: "L1", before: "a", after: "b" },
  ] } };
  assert.equal(fingerprint(a), fingerprint(b), "hunk order must not change identity");
});

test("fingerprint changes when category, file, or diff changes", () => {
  const base = { category: "broken-link", diff: { file: "x.md", hunks: [{ before: "a", after: "b" }] } };
  const diffCat = { ...base, category: "orphan" };
  const diffFile = { category: "broken-link", diff: { file: "y.md", hunks: [{ before: "a", after: "b" }] } };
  const diffBody = { category: "broken-link", diff: { file: "x.md", hunks: [{ before: "a", after: "c" }] } };
  const fp = fingerprint(base);
  assert.notEqual(fp, fingerprint(diffCat));
  assert.notEqual(fp, fingerprint(diffFile));
  assert.notEqual(fp, fingerprint(diffBody));
  assert.match(fp, /^[a-f0-9]{64}$/);
  assert.notEqual(diffHash(base.diff), diffHash(diffBody.diff));
});

test("a malformed card is rejected", () => {
  const bad = { ...loadCard(cardFiles[0]!), role: "not-a-role" };
  assert.equal(checkCard(bad).valid, false);
});

test("a hunk that is empty on both sides is rejected", () => {
  const card = loadCard(cardFiles[0]!);
  card.diff.hunks = [{ before: "", after: "" }];
  assert.equal(checkCard(card).valid, false);
});

test("a decision event missing latencyMs is rejected", () => {
  const bad = {
    v: "0",
    ts: "2026-07-04T09:00:00Z",
    type: "decision",
    cardId: "x",
    fingerprint: "f".repeat(64),
    category: "stale-claim",
    choice: "accept",
  };
  assert.equal(checkEvent(bad).valid, false);
});
