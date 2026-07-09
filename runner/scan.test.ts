import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { markdownFilesSince, recentMarkdownFiles, slowLayerFiles, vaultHead, isUsableAnchor } from "./scan.ts";
import { lastRunHead, appendRunMetric, localDate } from "./metrics.ts";

/** 临时 git vault:两批 commit,中间取锚点(= #14 的「上次 run」时刻)。 */
function fixture(): { repo: string; anchor: string } {
  const repo = mkdtempSync(join(tmpdir(), "forme-scan14-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(repo, "old.md"), "# old\n");
  git("add", "-A");
  git("commit", "-qm", "c1: old");
  const anchor = vaultHead(repo);
  // 锚点之后:知识层文件 + Forme 自己的产物 + 非 md
  writeFileSync(join(repo, "new-a.md"), "# a\n");
  git("add", "-A");
  git("commit", "-qm", "c2: a");
  mkdirSync(join(repo, "98_Forme", "cards"), { recursive: true });
  writeFileSync(join(repo, "98_Forme", "cards", "card_x.md"), "# card\n");
  writeFileSync(join(repo, "new-b.md"), "# b\n");
  writeFileSync(join(repo, "data.txt"), "not md\n");
  git("add", "-A");
  git("commit", "-qm", "c3: b + card");
  return { repo, anchor };
}

test("markdownFilesSince:只取锚点之后的知识层 md;98_Forme/ 与非 md 排除", () => {
  const { repo, anchor } = fixture();
  const files = markdownFilesSince(repo, anchor, 10).sort();
  assert.deepEqual(files, ["new-a.md", "new-b.md"]); // old.md 在锚点前,不进窗口
});

test("markdownFilesSince:锚点 = HEAD → 空窗口(自上次 run 无新 commit 的日常静默)", () => {
  const { repo } = fixture();
  assert.deepEqual(markdownFilesSince(repo, vaultHead(repo), 10), []);
});

test("isUsableAnchor:真锚点可用;垃圾 ref 不可用(→ 回退 commit 窗口)", () => {
  const { repo, anchor } = fixture();
  assert.equal(isUsableAnchor(repo, anchor), true);
  assert.equal(isUsableAnchor(repo, "deadbeef1234"), false);
});

test("lastRunHead:取最后一条带 head 的行;旧格式行(无 head)与坏行跳过", () => {
  const p = join(mkdtempSync(join(tmpdir(), "forme-lrh-")), "run-metrics.jsonl");
  assert.equal(lastRunHead(p), null); // 文件不存在 = 首跑
  appendRunMetric(p, { v: "0", date: "2026-07-05", runId: "r1", proposed: 1, suppressed: 0, presented: 1, rejected: 0, dup: 0 });
  assert.equal(lastRunHead(p), null); // 旧格式,无锚点
  appendRunMetric(p, { v: "0", date: "2026-07-07", runId: "r2", proposed: 1, suppressed: 0, presented: 1, rejected: 0, dup: 0, head: "abc123abc123" });
  writeFileSync(p, "not json {\n", { flag: "a" });
  assert.equal(lastRunHead(p), "abc123abc123");
});

test("回退窗口 recentMarkdownFiles 行为不变(含 98_Forme 排除)", () => {
  const { repo } = fixture();
  assert.deepEqual(recentMarkdownFiles(repo, 3, 10).sort(), ["new-a.md", "new-b.md", "old.md"]);
  assert.deepEqual(recentMarkdownFiles(repo, 3, 1), ["new-b.md"]); // maxFiles 截断,最近优先
});

test("slowLayerFiles(#18):取 02_Wiki 里最久没被 commit 动过的概念笔记,最陈旧优先", () => {
  const repo = mkdtempSync(join(tmpdir(), "forme-slow-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(repo, "02_Wiki", "Concepts"), { recursive: true });
  writeFileSync(join(repo, "02_Wiki", "Concepts", "stale-idea.md"), "# 立场 A\n");
  writeFileSync(join(repo, "02_Wiki", "mid.md"), "# mid\n");
  writeFileSync(join(repo, "02_Wiki", "note.txt"), "非 md\n");
  git("add", "-A");
  git("commit", "-qm", "c1: 概念层初始");
  writeFileSync(join(repo, "02_Wiki", "fresh.md"), "# fresh\n");
  git("add", "-A");
  git("commit", "-qm", "c2: fresh 进来");
  writeFileSync(join(repo, "02_Wiki", "mid.md"), "# mid v2\n");
  git("add", "-A");
  git("commit", "-qm", "c3: mid 被动过");
  // 最陈旧 = stale-idea(c1 后再没动过);其次 fresh(c2);mid 最新(c3)
  assert.deepEqual(slowLayerFiles(repo, 2), ["02_Wiki/Concepts/stale-idea.md", "02_Wiki/fresh.md"]);
  assert.deepEqual(slowLayerFiles(repo, 0), []); // 不开就是不开
  // 日轮转:第 1 天窗口起点后移(mod 总数),wrap 回最陈旧——不永远盯同几篇
  assert.deepEqual(slowLayerFiles(repo, 2, "02_Wiki/", 1), ["02_Wiki/mid.md", "02_Wiki/Concepts/stale-idea.md"]);
  assert.deepEqual(slowLayerFiles(repo, 2, "02_Wiki/", 3), slowLayerFiles(repo, 2, "02_Wiki/", 0)); // 周期回归
});

test("slowLayerFiles(#28):未知 vault 可从根目录取慢层,且永远排除 98_Forme", () => {
  const repo = mkdtempSync(join(tmpdir(), "forme-slow-root-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(repo, "Ideas"), { recursive: true });
  mkdirSync(join(repo, "98_Forme", "cards"), { recursive: true });
  writeFileSync(join(repo, "Ideas", "principle.md"), "# Principle\n");
  writeFileSync(join(repo, "98_Forme", "cards", "mirror.md"), "# Runtime\n");
  git("add", "-A");
  git("commit", "-qm", "seed");
  assert.deepEqual(slowLayerFiles(repo, 10, "."), ["Ideas/principle.md"]);
});

test("multilingual vault paths stay readable instead of Git quotePath escapes (#28/#29)", () => {
  const repo = mkdtempSync(join(tmpdir(), "forme-unicode-path-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(repo, "概念"), { recursive: true });
  writeFileSync(join(repo, "路线图.md"), "# 路线图\n");
  writeFileSync(join(repo, "概念", "原则.md"), "# 原则\n");
  git("add", "-A");
  git("commit", "-qm", "seed multilingual paths");
  assert.deepEqual(recentMarkdownFiles(repo, 1, 10).sort(), ["概念/原则.md", "路线图.md"]);
  assert.deepEqual(slowLayerFiles(repo, 10, ".").sort(), ["概念/原则.md", "路线图.md"]);
});

test("localDate(#25):按本地日切,不是 UTC 日期", () => {
  // 本地构造的午夜/深夜时刻,无论测试机时区如何,本地日期都应是构造时的那天
  assert.equal(localDate(new Date(2026, 6, 8, 23, 30)), "2026-07-08");
  assert.equal(localDate(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
});
