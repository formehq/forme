import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { loadSuppressionList } from "./suppress.ts";
import { appendRunMetric } from "./metrics.ts";
import { recentMarkdownFiles } from "./scan.ts";

const FP = (c: string) => c.repeat(64);

function writeLog(lines: unknown[]): string {
  const p = join(mkdtempSync(join(tmpdir(), "forme-sup-")), "decisions.jsonl");
  writeFileSync(p, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  return p;
}

test("每种 choice 的 decision 事件都进抑制名单;presented 不进", () => {
  const s = loadSuppressionList(
    writeLog([
      { v: "0", ts: "2026-07-06T00:00:00Z", type: "decision", cardId: "c1", fingerprint: FP("a"), choice: "accept", actor: "owner", latencyMs: 1 },
      { v: "0", ts: "2026-07-06T00:00:00Z", type: "decision", cardId: "c2", fingerprint: FP("b"), choice: "park", actor: "owner", latencyMs: 1 },
      { v: "0", ts: "2026-07-06T00:00:00Z", type: "decision", cardId: "c3", fingerprint: FP("c"), choice: "reject", actor: "owner", latencyMs: 1 },
      { v: "0", ts: "2026-07-06T00:00:00Z", type: "presented", cardId: "c4", fingerprint: FP("d") },
    ]),
  );
  assert.deepEqual(s.fingerprints, new Set([FP("a"), FP("b"), FP("c")]));
  assert.equal(s.events, 4);
});

test("宽容解析:过不了完整 schema 的 decision 行(缺 latencyMs/backfilled)仍然抑制", () => {
  // 真实场景:vault 侧手写的 07-06 落子事件就是这种形态。抑制是安全网,不因校验挑剔放行重复卡。
  const s = loadSuppressionList(
    writeLog([
      { v: "0", ts: "2026-07-06T23:37:46Z", type: "decision", cardId: "c1", fingerprint: FP("e"), choice: "accept", actor: "owner", executed: "e22bfcc" },
    ]),
  );
  assert.ok(s.fingerprints.has(FP("e")));
});

test("非 JSON 行计数 unreadable,不中断;文件不存在 → 空名单", () => {
  const s = loadSuppressionList(
    writeLog(["not json {", { v: "0", ts: "t", type: "decision", cardId: "c", fingerprint: FP("f"), choice: "reject", actor: "owner", latencyMs: 1 }]),
  );
  assert.equal(s.unreadable, 1);
  assert.ok(s.fingerprints.has(FP("f")));
  const empty = loadSuppressionList(join(tmpdir(), "forme-none", "nope.jsonl"));
  assert.equal(empty.fingerprints.size, 0);
});

test("appendRunMetric 追加一行合法 JSON,可累积成曲线", () => {
  const p = join(mkdtempSync(join(tmpdir(), "forme-met-")), "run-metrics.jsonl");
  appendRunMetric(p, { v: "0", date: "2026-07-05", runId: "run_a", proposed: 2, suppressed: 0, presented: 2, rejected: 0, dup: 0, backfilled: true });
  appendRunMetric(p, { v: "0", date: "2026-07-06", runId: "run_b", proposed: 3, suppressed: 1, presented: 2, rejected: 0, dup: 0 });
  const lines = readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.equal(lines[1]!.suppressed, 1);
});

test("scan 排除 98_Forme/:Forme 自己的运行时产物不是漂移面", () => {
  const repo = mkdtempSync(join(tmpdir(), "forme-scan-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(repo, "98_Forme", "cards"), { recursive: true });
  writeFileSync(join(repo, "note.md"), "# note\n");
  writeFileSync(join(repo, "98_Forme", "cards", "card_x.md"), "# card\n");
  git("add", "-A");
  git("commit", "-qm", "seed");
  assert.deepEqual(recentMarkdownFiles(repo, 3, 10), ["note.md"]);
});

test("undo(#24)把指纹移出名单;其后再落子重新进名单", () => {
  const s = loadSuppressionList(
    writeLog([
      { v: "0", ts: "2026-07-09T00:00:00Z", type: "decision", cardId: "c1", fingerprint: FP("a"), choice: "park", actor: "owner", latencyMs: 1 },
      { v: "0", ts: "2026-07-09T00:00:03Z", type: "undo", cardId: "c1", fingerprint: FP("a") },
      { v: "0", ts: "2026-07-09T00:00:10Z", type: "decision", cardId: "c2", fingerprint: FP("b"), choice: "accept", actor: "owner", latencyMs: 1 },
      { v: "0", ts: "2026-07-09T00:00:12Z", type: "undo", cardId: "c2", fingerprint: FP("b") },
      { v: "0", ts: "2026-07-09T00:01:00Z", type: "decision", cardId: "c2", fingerprint: FP("b"), choice: "reject", actor: "owner", latencyMs: 1 },
    ]),
  );
  assert.equal(s.fingerprints.has(FP("a")), false); // 撤销后回到未决,不抑制
  assert.equal(s.fingerprints.has(FP("b")), true); // 撤销后又落了子 → 抑制
});
