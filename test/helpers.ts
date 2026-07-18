import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { InitWorkspaceOptions } from "../src/store.ts";

export const FIXED_WORKSPACE_ID = "wsp_0123456789abcdef0123456789abcdef";

export function at(value: string): () => Date {
  return () => new Date(value);
}

export function makeGitWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "forme-r1-"));
  execFileSync("git", ["init", "-q"], { cwd: workspace });
  writeFileSync(join(workspace, ".gitignore"), "/.forme/\n");
  return workspace;
}

export function removeWorkspace(workspace: string): void {
  rmSync(workspace, { recursive: true, force: true });
}

export function baseInit(workspaceRoot: string): InitWorkspaceOptions {
  return {
    workspaceRoot,
    name: "Forme test workspace",
    activeIntent: "Prove deterministic project continuity.",
    nextMove: "Verify restart from the latest valid revision.",
    unresolved: ["How should later cognition enter without owning state?"],
    includePaths: ["README.md", "src"],
    workspaceId: FIXED_WORKSPACE_ID,
    now: at("2026-07-18T08:00:00.000Z"),
  };
}

export function seedProject(workspace: string): void {
  mkdirSync(join(workspace, "src"));
  writeFileSync(join(workspace, "README.md"), "# Demo\n\nPRIVATE_SOURCE_BODY_CANARY\n");
  writeFileSync(join(workspace, "src", "a.ts"), "export const a = 1;\n");
}

function filesUnder(root: string): string[] {
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) result.push(path);
    }
  };
  if (statSync(root).isDirectory()) visit(root);
  return result.sort();
}

export function allStateText(workspace: string): string {
  return filesUnder(join(workspace, ".forme"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
}
