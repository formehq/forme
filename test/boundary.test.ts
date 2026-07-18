import assert from "node:assert/strict";
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { initWorkspace, observeWorkspace } from "../src/store.ts";
import {
  allStateText,
  baseInit,
  makeGitWorkspace,
  removeWorkspace,
  seedProject,
} from "./helpers.ts";

test("R1 boundary: traversal is rejected before durable state is created", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  writeFileSync(join(workspace, "README.md"), "safe");
  assert.throws(
    () => initWorkspace({ ...baseInit(workspace), includePaths: ["../outside"] }),
    /contract failed|parent traversal|safe relative path/,
  );
  assert.equal(existsSync(join(workspace, ".forme")), false);
});

test("R1 boundary: mandatory state and Git exclusions cannot be explicitly allowlisted", (context) => {
  for (const includePath of [".forme/workspace.json", ".git/config", "node_modules/package/index.js"]) {
    const workspace = makeGitWorkspace();
    context.after(() => removeWorkspace(workspace));
    writeFileSync(join(workspace, "README.md"), "safe");
    assert.throws(
      () => initWorkspace({ ...baseInit(workspace), includePaths: [includePath] }),
      /excluded boundary/,
    );
    assert.equal(existsSync(join(workspace, ".forme")), false);
  }
});

test("R1 boundary: only allowlisted files enter evidence and symlinks never escape", (context) => {
  const workspace = makeGitWorkspace();
  const outside = mkdtempSync(join(tmpdir(), "forme-r1-outside-"));
  context.after(() => {
    removeWorkspace(workspace);
    removeWorkspace(outside);
  });
  seedProject(workspace);
  mkdirSync(join(workspace, "private"));
  writeFileSync(join(workspace, "private", "canary.md"), "OUTSIDE_ALLOWLIST_CANARY");
  writeFileSync(join(outside, "outside.md"), "SYMLINK_ESCAPE_CANARY");
  symlinkSync(join(outside, "outside.md"), join(workspace, "src", "outside-link.md"));

  const result = initWorkspace(baseInit(workspace));
  assert.deepEqual(result.revision.evidence.map((item) => item.relativePath), ["README.md", "src/a.ts"]);
  assert.match(result.revision.warnings.join("\n"), /Skipped symbolic link: src\/outside-link[.]md/);

  const state = allStateText(workspace);
  assert.doesNotMatch(state, /PRIVATE_SOURCE_BODY_CANARY/);
  assert.doesNotMatch(state, /OUTSIDE_ALLOWLIST_CANARY/);
  assert.doesNotMatch(state, /SYMLINK_ESCAPE_CANARY/);
  assert.doesNotMatch(state, new RegExp(workspace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(state, new RegExp(outside.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("R1 boundary: later writes fail closed if the state root stops being Git-ignored", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));
  writeFileSync(join(workspace, ".gitignore"), "");
  assert.throws(() => observeWorkspace(workspace), /must be ignored by Git/);
});
