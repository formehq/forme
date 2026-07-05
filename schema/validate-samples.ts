import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkCard, checkEvent, type ValidationResult } from "./validate.ts";
import { fingerprint } from "./fingerprint.ts";

/**
 * `npm run validate` — Forme's gate, run over every hand-written sample.
 * Exits non-zero if any card/event fails the schema or if any card's stored
 * fingerprint disagrees with the one recomputed from its category + diff.
 */

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(here, "samples");

let failures = 0;

function report(name: string, r: ValidationResult, extra?: string): void {
  if (r.valid && !extra) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures++;
  console.log(`  FAIL ${name}`);
  for (const e of r.errors) console.log(`         ${e}`);
  if (extra) console.log(`         ${extra}`);
}

const cardFiles = readdirSync(samplesDir)
  .filter((f) => f.startsWith("card-") && f.endsWith(".json"))
  .sort();

console.log("cards:");
for (const f of cardFiles) {
  const card = JSON.parse(readFileSync(join(samplesDir, f), "utf8"));
  const r = checkCard(card);
  let extra: string | undefined;
  if (r.valid) {
    const expected = fingerprint({ category: card.category, diff: card.diff });
    if (expected !== card.fingerprint) {
      extra = `fingerprint mismatch: stored ${card.fingerprint} != computed ${expected}`;
    }
  }
  report(f, r, extra);
}

console.log("decisions.jsonl events:");
const jsonl = readFileSync(join(samplesDir, "decisions.sample.jsonl"), "utf8")
  .trim()
  .split("\n");
jsonl.forEach((line, i) => {
  const ev = JSON.parse(line);
  report(`line ${i + 1} (${ev.type})`, checkEvent(ev));
});

if (failures > 0) {
  console.error(`\n${failures} sample(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll ${cardFiles.length} cards + ${jsonl.length} events valid.`);
