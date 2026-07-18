import assert from "node:assert/strict";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { initWorkspace, observeWorkspace, statusWorkspace } from "../src/store.ts";
import { at, baseInit, makeGitWorkspace, removeWorkspace, seedProject } from "./helpers.ts";

test("R1 Continuity: init, change, no-op, and restart reconstruction stay deterministic", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);

  const initial = initWorkspace(baseInit(workspace));
  assert.equal(initial.changed, true);
  assert.equal(initial.revision.revision, 1);
  assert.equal(initial.revision.previousRevision, null);
  assert.deepEqual(initial.revision.changes, {
    added: ["README.md", "src/a.ts"],
    modified: [],
    deleted: [],
  });
  assert.match(initial.view, /## Now/);
  assert.match(initial.view, /## What Changed/);
  assert.match(initial.view, /## Unresolved/);
  assert.match(initial.view, /## Next Move/);

  const headPath = join(workspace, ".forme", "HEAD");
  const viewPath = join(workspace, ".forme", "restart.md");
  const headBefore = readFileSync(headPath, "utf8");
  const viewBefore = readFileSync(viewPath, "utf8");
  const noOp = observeWorkspace(workspace, { now: at("2026-07-18T09:00:00.000Z") });
  assert.equal(noOp.changed, false);
  assert.equal(noOp.revision.revision, 1);
  assert.equal(readFileSync(headPath, "utf8"), headBefore);
  assert.equal(readFileSync(viewPath, "utf8"), viewBefore);
  assert.deepEqual(readdirSync(join(workspace, ".forme", "revisions")), ["000001.json"]);

  writeFileSync(join(workspace, "README.md"), "# Demo\n\nUpdated source body.\n");
  mkdirSync(join(workspace, "src", "nested"));
  writeFileSync(join(workspace, "src", "nested", "b.ts"), "export const b = 2;\n");
  unlinkSync(join(workspace, "src", "a.ts"));
  const changed = observeWorkspace(workspace, { now: at("2026-07-18T10:00:00.000Z") });
  assert.equal(changed.changed, true);
  assert.equal(changed.revision.revision, 2);
  assert.equal(changed.revision.previousRevision, 1);
  assert.deepEqual(changed.revision.changes, {
    added: ["src/nested/b.ts"],
    modified: ["README.md"],
    deleted: ["src/a.ts"],
  });

  rmSync(viewPath);
  const restarted = statusWorkspace(workspace);
  assert.equal(restarted.revision.revision, 2);
  assert.equal(restarted.view, changed.view);
  assert.equal(readFileSync(viewPath, "utf8"), changed.view);
  assert.deepEqual(readdirSync(join(workspace, ".forme", "revisions")), ["000001.json", "000002.json"]);
});

test("R1 Continuity: an owner-frame change creates a revision without inventing source changes", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));

  const contractPath = join(workspace, ".forme", "workspace.json");
  const contract = JSON.parse(readFileSync(contractPath, "utf8")) as {
    ownerFrame: { nextMove: string };
  };
  contract.ownerFrame.nextMove = "Demonstrate the reconstructed Markdown view.";
  writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
  const result = observeWorkspace(workspace, { now: at("2026-07-18T11:00:00.000Z") });
  assert.equal(result.revision.revision, 2);
  assert.deepEqual(result.revision.changes, { added: [], modified: [], deleted: [] });
  assert.match(result.view, /Demonstrate the reconstructed Markdown view/);
});
