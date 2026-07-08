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
    ["-C", vault, "log", `-n${commits}`, "--name-only", "--format=", "--", "*.md"],
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
    ["-C", vault, "log", `${anchor}..HEAD`, "--name-only", "--format=", "--", "*.md"],
    { encoding: "utf8" },
  );
  return filterMarkdownList(vault, out, maxFiles, excludePrefix);
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
