import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  initWorkspace,
  observeWorkspace,
  statusWorkspace,
  type FailurePoint,
} from "../src/store.ts";
import { at, baseInit, makeGitWorkspace, removeWorkspace, seedProject } from "./helpers.ts";

for (const failurePoint of ["pending", "revision", "head", "view"] as const satisfies readonly FailurePoint[]) {
  test(`R1 recovery: ${failurePoint} interruption resumes exactly once`, (context) => {
    const workspace = makeGitWorkspace();
    context.after(() => removeWorkspace(workspace));
    seedProject(workspace);
    initWorkspace(baseInit(workspace));
    writeFileSync(join(workspace, "README.md"), `# Changed at ${failurePoint}\n`);

    assert.throws(
      () => observeWorkspace(workspace, {
        now: at("2026-07-18T12:00:00.000Z"),
        failurePoint,
      }),
      /injected failure/,
    );
    assert.equal(existsSync(join(workspace, ".forme", "pending-transition.json")), true);

    const recovered = statusWorkspace(workspace);
    assert.equal(recovered.revision.revision, 2);
    assert.equal(existsSync(join(workspace, ".forme", "pending-transition.json")), false);
    assert.deepEqual(readdirSync(join(workspace, ".forme", "revisions")), ["000001.json", "000002.json"]);

    const noOp = observeWorkspace(workspace, { now: at("2026-07-18T13:00:00.000Z") });
    assert.equal(noOp.changed, false);
    assert.equal(noOp.revision.revision, 2);
  });
}

test("R1 recovery: malformed pending state fails closed and preserves the prior HEAD", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));
  const headPath = join(workspace, ".forme", "HEAD");
  const headBefore = readFileSync(headPath, "utf8");
  writeFileSync(join(workspace, ".forme", "pending-transition.json"), "{\"schemaVersion\":\"1\",\"bad\":true}\n");

  assert.throws(() => statusWorkspace(workspace), /pending transition contract failed/);
  assert.equal(readFileSync(headPath, "utf8"), headBefore);
});

test("R1 recovery: a stale writer lock is verified and recovered", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));
  writeFileSync(join(workspace, ".forme", "LOCK"), "99999999\n");
  const result = statusWorkspace(workspace);
  assert.equal(result.revision.revision, 1);
  assert.equal(existsSync(join(workspace, ".forme", "LOCK")), false);
});

test("R1 recovery: an active writer lock fails closed", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));
  writeFileSync(join(workspace, ".forme", "LOCK"), `${process.pid}\n`);
  assert.throws(() => statusWorkspace(workspace), /another Forme writer is active/);
});

test("R1 recovery: a revision checksum mismatch cannot replace or render canonical state", (context) => {
  const workspace = makeGitWorkspace();
  context.after(() => removeWorkspace(workspace));
  seedProject(workspace);
  initWorkspace(baseInit(workspace));
  const revisionPath = join(workspace, ".forme", "revisions", "000001.json");
  writeFileSync(revisionPath, `${readFileSync(revisionPath, "utf8")} `);
  assert.throws(() => statusWorkspace(workspace), /HEAD checksum mismatch/);
});
