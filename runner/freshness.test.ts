import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkEvent } from "../schema/validate.ts";
import { resolveExecutionCommit } from "./execution.ts";
import { detectTimestampFreshness, executeTimestampFreshness } from "./freshness.ts";
import { localDate } from "./metrics.ts";

const machineNow = () => new Date(2026, 6, 12, 10, 30, 0);

test("timestamp freshness: injected machine date fixes only the three authorized classes", () => {
  const source = [
    "---",
    "title: Status",
    "updated: 2026-07-01",
    "---",
    "",
    "**As of:** 2026-07-02",
    "Review: Monday, 2026-07-12",
    "Archive: 2026-07-12 (Monday)",
    "The contract as of 2026-07-02 remains binding through 2026-08-01.",
    "",
  ].join("\n");
  const fix = detectTimestampFreshness(source, machineNow());
  assert.ok(fix);
  assert.deepEqual(new Set(fix.kinds), new Set(["updated", "as-of", "weekday"]));
  assert.match(fix.content, /updated: 2026-07-12/);
  assert.match(fix.content, /\*\*As of:\*\* 2026-07-12/);
  assert.match(fix.content, /Review: Sunday, 2026-07-12/);
  assert.match(fix.content, /Archive: 2026-07-12 \(Sunday\)/);
  assert.match(fix.content, /contract as of 2026-07-02 remains binding through 2026-08-01/);
  assert.equal(fix.hunks.length, 4);
});

test("timestamp freshness: semantic and non-frontmatter dates stay out of class", () => {
  const source = [
    "updated: 2026-01-01",
    "Revenue as of 2026-01-01 was audited and must not be rewritten.",
    "The launch moved from 2026-07-16 to 2026-07-18.",
  ].join("\n");
  assert.equal(detectTimestampFreshness(source, machineNow()), null);
});

test("timestamp freshness: ISO updated values preserve timestamp shape", () => {
  const now = machineNow();
  const source = "---\nupdated: \"2026-07-01T08:00:00Z\"\n---\n";
  const fix = detectTimestampFreshness(source, now);
  assert.ok(fix);
  assert.equal(fix.content, `---\nupdated: \"${now.toISOString()}\"\n---\n`);
  assert.equal(detectTimestampFreshness(`---\nupdated: \"${now.toISOString()}\"\n---\n`, now), null);
});

test("authorized freshness execution uses zero Codex calls and commits target + complete audit trail", () => {
  const vault = mkdtempSync(join(tmpdir(), "forme-fresh-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", vault, ...args], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(vault, "status.md"), "---\nupdated: 2026-07-01\n---\n# Status\n");
  writeFileSync(join(vault, "owner.md"), "owner draft v1\n");
  git("add", "-A");
  git("commit", "-qm", "seed");
  writeFileSync(join(vault, "owner.md"), "owner draft v2\n");
  git("add", "owner.md");

  const outDir = join(vault, "98_Forme");
  mkdirSync(join(outDir, "cards"), { recursive: true });
  const fakeBin = mkdtempSync(join(tmpdir(), "forme-no-codex-"));
  const marker = join(fakeBin, "called");
  const fakeCodex = join(fakeBin, "codex");
  writeFileSync(fakeCodex, `#!/bin/sh\ntouch '${marker}'\nexit 91\n`);
  chmodSync(fakeCodex, 0o755);
  const oldPath = process.env.PATH;
  process.env.PATH = `${fakeBin}:${oldPath}`;
  try {
    const fix = detectTimestampFreshness(readFileSync(join(vault, "status.md"), "utf8"), machineNow());
    assert.ok(fix);
    const result = executeTimestampFreshness({
      vault,
      outDir,
      file: "status.md",
      fix,
      now: machineNow(),
      runId: "run_clock_test",
    });

    assert.match(readFileSync(join(vault, "status.md"), "utf8"), /updated: 2026-07-12/);
    assert.equal(existsSync(marker), false);
    const events = readFileSync(join(outDir, "decisions.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(events.length, 1);
    assert.equal(events[0].actor, "agent_authorized");
    assert.equal(events[0].executionId, result.executionId);
    assert.equal("latencyMs" in events[0], false);
    assert.equal(checkEvent(events[0]).valid, true);
    const metric = JSON.parse(readFileSync(join(outDir, "run-metrics.jsonl"), "utf8"));
    assert.equal(metric.authorized, 1);
    assert.equal(metric.executionId, result.executionId);
    assert.ok(readFileSync(join(outDir, "cards", `${result.card.id}.md`), "utf8").includes(result.card.title));

    const names = git("show", "--format=", "--name-only", "HEAD").trim().split("\n").sort();
    assert.deepEqual(names, [
      `98_Forme/cards/${result.card.id}.json`,
      `98_Forme/cards/${result.card.id}.md`,
      "98_Forme/decisions.jsonl",
      "98_Forme/run-metrics.jsonl",
      "status.md",
    ].sort());
    assert.equal(resolveExecutionCommit(vault, result.executionId)?.slice(0, 12), result.executed);
    assert.equal(git("diff", "--cached", "--name-only").trim(), "owner.md");
    assert.equal(git("show", "--format=", "--name-only", "HEAD").includes("owner.md"), false);
  } finally {
    process.env.PATH = oldPath;
  }
});

function initRunnerVault(name: string, before: string, after: string): string {
  const vault = mkdtempSync(join(tmpdir(), name));
  const git = (...args: string[]) => execFileSync("git", ["-C", vault, ...args]);
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(vault, "note.md"), before);
  git("add", "note.md");
  git("commit", "-qm", "seed");
  writeFileSync(join(vault, "note.md"), after);
  git("commit", "-qam", "date drift");
  return vault;
}

test("runner skips Codex for a freshness-only delta, while a semantic date delta still becomes a card", () => {
  const runnerPath = new URL("./index.ts", import.meta.url).pathname;
  const fakeBin = mkdtempSync(join(tmpdir(), "forme-fake-codex-"));
  const marker = join(fakeBin, "called");
  const fakeCodex = join(fakeBin, "codex");
  const agentCard = {
    cards: [{
      category: "stale-claim",
      title: "The audited revenue date changed",
      summary: "The current note now makes a different historical claim.",
      whyNow: "The date changed in the latest vault commit.",
      recommendationChoice: "park",
      recommendationReason: "A semantic date needs owner judgment.",
      onAccept: "The audited date would be restored.",
      evidence: [{ path: "note.md", locator: "L2", quote: "Revenue as of 2025-01-01 was audited.", note: "This is a historical claim, not a freshness marker." }],
      diff: { file: "note.md", hunks: [{ locator: "L2", before: "Revenue as of 2025-01-01 was audited.", after: "Revenue as of 2024-01-01 was audited." }] },
      estSeconds: 20,
      stakes: "real-world-action",
    }],
  };
  writeFileSync(fakeCodex, [
    "#!/usr/bin/env node",
    'const fs = require("node:fs");',
    `fs.writeFileSync(${JSON.stringify(marker)}, "called");`,
    'const args = process.argv.slice(2);',
    'const out = args[args.indexOf("-o") + 1];',
    `fs.writeFileSync(out, ${JSON.stringify(JSON.stringify(agentCard))});`,
  ].join("\n") + "\n");
  chmodSync(fakeCodex, 0o755);
  const env = { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` };

  const today = localDate(new Date());
  const freshnessVault = initRunnerVault(
    "forme-run-fresh-",
    `---\nupdated: ${today}\n---\n# Note\n`,
    "---\nupdated: 2001-01-01\n---\n# Note\n",
  );
  const freshnessRun = spawnSync(process.execPath, [runnerPath, "--vault", freshnessVault, "--commits", "1"], {
    encoding: "utf8",
    env,
  });
  assert.equal(freshnessRun.status, 0, freshnessRun.stderr || freshnessRun.stdout);
  assert.equal(existsSync(marker), false);
  assert.match(freshnessRun.stdout, /self-executed 1 freshness fix; freshness path zero LLM/);

  const semanticVault = initRunnerVault(
    "forme-run-semantic-",
    "# Audit\nRevenue as of 2024-01-01 was audited.\n",
    "# Audit\nRevenue as of 2025-01-01 was audited.\n",
  );
  const semanticRun = spawnSync(process.execPath, [runnerPath, "--vault", semanticVault, "--commits", "1"], {
    encoding: "utf8",
    env,
  });
  assert.equal(semanticRun.status, 0, semanticRun.stderr || semanticRun.stdout);
  assert.equal(readFileSync(marker, "utf8"), "called");
  const cards = readdirSync(join(semanticVault, "98_Forme", "cards")).filter((f) => f.endsWith(".json"));
  assert.equal(cards.length, 1);
  const semanticEvents = join(semanticVault, "98_Forme", "decisions.jsonl");
  assert.equal(existsSync(semanticEvents), false);
});
