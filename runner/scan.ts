import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Incremental drift surface: the markdown files touched in the last N commits.
 * This is the git-delta that keeps a run small (and eventually serves the
 * wake→first-card ≤10s budget). Deleted/renamed-away paths are dropped.
 * Forme 自己的运行时产物(98_Forme/ 下的卡片镜像等)不是漂移面,排除——
 * 否则 runner 会对自己上一轮的输出提卡,自激振荡。
 */
export function recentMarkdownFiles(
  vault: string,
  commits: number,
  maxFiles: number,
  excludePrefix = "98_Forme/",
): string[] {
  const out = execFileSync(
    "git",
    ["-C", vault, "log", `-n${commits}`, "--name-only", "--format=", "--", "*.md"],
    { encoding: "utf8" },
  );
  const files: string[] = [];
  const seen = new Set<string>();
  for (const raw of out.split("\n")) {
    const f = raw.trim();
    if (!f || !f.endsWith(".md") || seen.has(f)) continue;
    if (f.startsWith(excludePrefix)) continue;
    if (!existsSync(join(vault, f))) continue;
    seen.add(f);
    files.push(f);
    if (files.length >= maxFiles) break;
  }
  return files;
}
