import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Incremental drift surface = the markdown files touched in a git window.
 * 首选窗口是「上次成功 run 以来」(#14:锚点 = run-metrics 最后一行记录的
 * vault HEAD,增量 = anchor..HEAD,窗口自动等于 run 节律,不会漏文件);
 * 锚点缺失或失效(rebase 后不再是祖先)时回退到「最近 N 个 commit」,
 * --commits 显式传参时作为手动覆盖。Deleted/renamed-away paths are dropped.
 * Forme 自己的运行时产物(98_Forme/ 下的卡片镜像等)不是漂移面,排除——
 * 否则 runner 会对自己上一轮的输出提卡,自激振荡。
 */
function filterMarkdownList(
  vault: string,
  raw: string,
  maxFiles: number,
  excludePrefix: string,
): string[] {
  const files: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split("\n")) {
    const f = line.trim();
    if (!f || !f.endsWith(".md") || seen.has(f)) continue;
    if (f.startsWith(excludePrefix)) continue;
    if (!existsSync(join(vault, f))) continue;
    seen.add(f);
    files.push(f);
    if (files.length >= maxFiles) break;
  }
  return files;
}

export function recentMarkdownFiles(
  vault: string,
  commits: number,
  maxFiles: number,
  excludePrefix = "98_Forme/",
): string[] {
  const out = execFileSync(
    "git",
    ["-c", "core.quotePath=false", "-C", vault, "log", `-n${commits}`, "--name-only", "--format=", "--", "*.md"],
    { encoding: "utf8" },
  );
  return filterMarkdownList(vault, out, maxFiles, excludePrefix);
}

/** anchor..HEAD 窗口(#14):自上次成功 run 以来动过的 markdown 文件。 */
export function markdownFilesSince(
  vault: string,
  anchor: string,
  maxFiles: number,
  excludePrefix = "98_Forme/",
): string[] {
  const out = execFileSync(
    "git",
    ["-c", "core.quotePath=false", "-C", vault, "log", `${anchor}..HEAD`, "--name-only", "--format=", "--", "*.md"],
    { encoding: "utf8" },
  );
  return filterMarkdownList(vault, out, maxFiles, excludePrefix);
}

/**
 * 慢层立场参照(#18/#28):指定根目录里**最久没被 commit 动过**的笔记。
 * 思想漂移住在慢层——概念笔记几周不动,永远进不了 delta 窗口;claim-drift
 * 需要「最近的行为/表述 vs 既有立场」的快慢对照,这里取慢的那一端。
 * 一遍 git log(新→旧)记每个文件最近一次被动的次序,按最陈旧排序后取 n 篇;
 * `day` 让取窗按日轮转(窗口起点 = day*n mod 总数)——否则每天都是同 n 篇,
 * 其余慢层永远进不了对照面;轮转无状态、确定性,~len/n 天覆盖全慢层一遍。
 */
export function slowLayerFiles(vault: string, n: number, prefix = "02_Wiki/", day = 0): string[] {
  if (n <= 0) return [];
  const pathspec = prefix || ".";
  const lastTouch = new Map<string, number>(); // 文件 → 首见次序(小 = 最近被动过)
  let order = 0;
  const log = execFileSync("git", ["-c", "core.quotePath=false", "-C", vault, "log", "--name-only", "--format=", "--", pathspec], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  for (const raw of log.split("\n")) {
    const f = raw.trim();
    if (!f || !f.endsWith(".md") || f.startsWith("98_Forme/")) continue;
    if (!lastTouch.has(f)) lastTouch.set(f, order++);
  }
  const existing = execFileSync("git", ["-c", "core.quotePath=false", "-C", vault, "ls-files", "--", pathspec], { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter((f) => f.endsWith(".md") && !f.startsWith("98_Forme/"));
  const touchOf = (f: string) => lastTouch.get(f) ?? Number.MAX_SAFE_INTEGER;
  const sorted = existing.sort((a, b) => touchOf(b) - touchOf(a));
  if (sorted.length <= n) return sorted;
  const start = (day * n) % sorted.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(sorted[(start + i) % sorted.length]!);
  return out;
}

/** 当前 vault HEAD(短 hash)——本轮 run 的窗口上界,记进 run-metrics 作下轮锚点。 */
export function vaultHead(vault: string): string {
  return execFileSync("git", ["-C", vault, "rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

/** 锚点仍可用 = 仍是 HEAD 的祖先(rebase/强推后失效 → 回退 commit 窗口)。 */
export function isUsableAnchor(vault: string, anchor: string): boolean {
  try {
    execFileSync("git", ["-C", vault, "merge-base", "--is-ancestor", anchor, "HEAD"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Commit immediately before a fixed-size fallback window; null means the window reaches the root. */
export function commitWindowBase(vault: string, commits: number): string | null {
  const out = execFileSync(
    "git",
    ["-C", vault, "rev-list", "--max-count=1", `--skip=${Math.max(0, commits)}`, "HEAD"],
    { encoding: "utf8" },
  ).trim();
  return out || null;
}
