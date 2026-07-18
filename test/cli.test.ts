import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { makeGitWorkspace, removeWorkspace, seedProject } from "./helpers.ts";

const cliPath = new URL("../src/cli.ts", import.meta.url).pathname;

function runCli(workspace: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspace,
    encoding: "utf8",
  });
}

function initCliWorkspace(workspace: string): void {
  const result = runCli(workspace, [
    "init",
    "--name", "CLI test workspace",
    "--intent", "Prove owner control through the product surface.",
    "--next", "Set the next owner-confirmed move.",
    "--include", "README.md,src",
  ]);
  assert.equal(result.status, 0, result.stderr);
}

test("CLI observe updates the Owner Frame once and repeats as a no-op", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initCliWorkspace(workspace);

  const args = [
    "observe",
    "--intent", "Owner controls the current intent.",
    "--next", "Review the reconstructed Restart View, then decide whether to accept R1.",
    "--unresolved", "Should R2 add Codex?,Should R2 add OpenCode?",
  ];
  const changed = runCli(workspace, args);
  assert.equal(changed.status, 0, changed.stderr);
  assert.match(changed.stdout, /Revision: 2/);
  assert.match(changed.stdout, /Owner controls the current intent/);
  assert.match(changed.stdout, /Review the reconstructed Restart View, then decide whether to accept R1/);
  assert.match(changed.stdout, /Should R2 add Codex\?/);

  const contract = JSON.parse(readFileSync(join(workspace, ".forme", "workspace.json"), "utf8")) as {
    ownerFrame: { activeIntent: string; nextMove: string; unresolved: string[] };
  };
  assert.deepEqual(contract.ownerFrame, {
    activeIntent: "Owner controls the current intent.",
    nextMove: "Review the reconstructed Restart View, then decide whether to accept R1.",
    unresolved: ["Should R2 add Codex?", "Should R2 add OpenCode?"],
  });

  const repeated = runCli(workspace, args);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.match(repeated.stdout, /Revision: 2/);
  assert.deepEqual(readdirSync(join(workspace, ".forme", "revisions")), ["000001.json", "000002.json"]);
});

test("CLI rejects unknown, misplaced, empty, and duplicate options", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initCliWorkspace(workspace);

  const unknown = runCli(workspace, ["observe", "--nxt", "typo"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown option for observe: --nxt/);

  const misplaced = runCli(workspace, ["status", "--next", "not allowed"]);
  assert.equal(misplaced.status, 1);
  assert.match(misplaced.stderr, /unknown option for status: --next/);

  const empty = runCli(workspace, ["observe", "--next", ""]);
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /--next requires a value/);

  const duplicate = runCli(workspace, ["observe", "--next", "one", "--next", "two"]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /--next may only be provided once/);
});
