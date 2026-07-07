import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { collectWeek, renderStateDiff, latestStateDiffDate } from "./state-diff.ts";

function fixtureVault(): { vault: string; outDir: string } {
  const vault = mkdtempSync(join(tmpdir(), "forme-sd-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", vault, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(vault, "00_Inbox"), { recursive: true });
  mkdirSync(join(vault, "03_Outputs", "Reports"), { recursive: true });
  mkdirSync(join(vault, "03_Outputs", "Posts"), { recursive: true });
  const outDir = join(vault, "98_Forme");
  mkdirSync(join(outDir, "cards"), { recursive: true });
  writeFileSync(join(vault, "00_Inbox", "clip.md"), "# clip\n");
  writeFileSync(join(vault, "03_Outputs", "Reports", "r1.md"), "# r\n");
  writeFileSync(join(vault, "03_Outputs", "Reports", "r2.md"), "# r\n");
  writeFileSync(join(vault, "03_Outputs", "Posts", "p1.md"), "# p\n");
  writeFileSync(join(outDir, "cards", "card_dec.json"), JSON.stringify({ id: "card_dec", title: "已决的卡" }));
  writeFileSync(join(outDir, "cards", "card_open.json"), JSON.stringify({ id: "card_open", title: "待决的卡" }));
  writeFileSync(
    join(outDir, "decisions.jsonl"),
    JSON.stringify({ v: "0", ts: "2026-07-06T00:00:00Z", type: "decision", cardId: "card_dec", fingerprint: "f", choice: "accept", actor: "owner" }) + "\n",
  );
  writeFileSync(
    join(outDir, "run-metrics.jsonl"),
    [
      JSON.stringify({ v: "0", date: "2026-07-05", runId: "r1", proposed: 2, suppressed: 0, presented: 2, rejected: 0, dup: 0 }),
      JSON.stringify({ v: "0", date: "2001-01-01", runId: "r0", proposed: 9, suppressed: 9, presented: 9, rejected: 0, dup: 0 }),
    ].join("\n") + "\n",
  );
  git("add", "-A");
  git("commit", "-qm", "week seed");
  return { vault, outDir };
}

test("collectWeek:git 周窗口 + 待决卡 + Inbox/指标计数全确定性", () => {
  const { vault, outDir } = fixtureVault();
  const d = collectWeek(vault, outDir, 7, new Date("2026-07-12T18:00:00Z"));
  assert.equal(d.commits.length, 1);
  assert.equal(d.commits[0]!.subject, "week seed");
  assert.ok(d.addedFiles.includes("00_Inbox/clip.md"));
  assert.equal(d.inboxCount, 1);
  assert.deepEqual(d.inboxNewThisWeek, ["00_Inbox/clip.md"]);
  assert.deepEqual(d.pendingCards, [{ id: "card_open", title: "待决的卡" }]);
  assert.equal(d.decisionsThisWeek, 1);
  assert.equal(d.reportsCount, 2);
  assert.equal(d.postsCount, 1);
  // 窗口外的 run-metrics 行不计入
  assert.deepEqual(d.runsThisWeek, { runs: 1, proposed: 2, suppressed: 0, presented: 2 });
});

test("renderStateDiff:四段骨架永远齐;空段用占位;窗口进 frontmatter", () => {
  const md = renderStateDiff(
    { into: "7 条 Flomo", changed: "W2 开", waiting: "2 张卡", alerts: "" },
    { from: "2026-07-05", to: "2026-07-12", runId: "sd_test", at: "2026-07-12T18:00:00Z" },
  );
  assert.match(md, /window: "2026-07-05 → 2026-07-12"/);
  assert.match(md, /# 本周（07-05 → 07-12）/);
  for (const label of ["进来了什么", "变了什么", "什么在等你决定", "警报"]) assert.match(md, new RegExp(`\\*\\*${label}\\*\\*:`));
  assert.match(md, /\*\*警报\*\*:——（本周无）/);
});

test("latestStateDiffDate:取最新文件名日期,周更守卫的时钟", () => {
  const dir = mkdtempSync(join(tmpdir(), "forme-sd-out-"));
  assert.equal(latestStateDiffDate(dir), null);
  writeFileSync(join(dir, "state-diff-2026-07-05.md"), "x");
  writeFileSync(join(dir, "state-diff-2026-07-12.md"), "x");
  writeFileSync(join(dir, "not-a-diff.md"), "x");
  assert.equal(latestStateDiffDate(dir), "2026-07-12");
});
