import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkTwinContract } from "../schema/validate.ts";
import { initWorkspace, refreshWorkspace, statusWorkspace } from "./store.ts";
import type { SourceRecord } from "./types.ts";

const at = (value: string) => () => new Date(value);

function jsonLines<T>(path: string): T[] {
  return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

test("M1 Continuity: connect, detect changes, preserve revisions, and reconstruct after restart", () => {
  const workspace = mkdtempSync(join(tmpdir(), "forme-twin-"));
  const outside = mkdtempSync(join(tmpdir(), "forme-outside-"));
  mkdirSync(join(workspace, "src"));
  writeFileSync(join(workspace, "README.md"), "# Demo\n\nPRIVATE_BODY_MUST_NOT_ENTER_STATE\n");
  writeFileSync(join(workspace, "src", "a.ts"), "export const a = 1;\n");
  writeFileSync(join(workspace, "ignored.bin"), "binary-ish");
  writeFileSync(join(outside, "outside.md"), "outside");
  symlinkSync(join(outside, "outside.md"), join(workspace, "outside-link.md"));

  const initial = initWorkspace({
    workspaceRoot: workspace,
    name: "Demo project",
    intent: "Ship the restart-safe continuity slice.",
    includeExtensions: [".md", ".ts"],
    now: at("2026-07-16T20:00:00.000Z"),
  });
  assert.equal(initial.changed, true);
  assert.equal(initial.state.revision, 1);
  assert.deepEqual(initial.event?.changes.added, ["README.md", "src/a.ts"]);
  assert.match(initial.event?.warnings.join("\n") ?? "", /outside configured extensions/);
  assert.match(initial.event?.warnings.join("\n") ?? "", /symbolic link/);
  assert.match(initial.view, /## Now/);
  assert.match(initial.view, /## What Changed/);
  assert.match(initial.view, /## Next Move/);

  const stateRoot = join(workspace, "98_Forme");
  const statePath = join(stateRoot, "twin", "state.json");
  const viewPath = join(stateRoot, "twin", "state.md");
  const manifestPath = join(stateRoot, "evidence", "manifest.jsonl");
  const stateBody = readFileSync(statePath, "utf8");
  const manifestBody = readFileSync(manifestPath, "utf8");
  assert.doesNotMatch(stateBody, /PRIVATE_BODY_MUST_NOT_ENTER_STATE/);
  assert.doesNotMatch(manifestBody, /PRIVATE_BODY_MUST_NOT_ENTER_STATE/);
  assert.doesNotMatch(stateBody, new RegExp(workspace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const record of jsonLines<SourceRecord>(manifestPath)) {
    assert.equal(checkTwinContract("source-record", record).valid, true);
    assert.equal(record.locator.relativePath.startsWith("/"), false);
    assert.equal(record.locator.relativePath.includes(".."), false);
  }
  const registryRecord = jsonLines<SourceRecord>(manifestPath).find(
    (record) => record.locator.sourceId === "src_forme_workspace_registry",
  );
  const registryBody = readFileSync(join(stateRoot, "workspace.json"));
  assert.equal(registryRecord?.contentHash, `sha256:${createHash("sha256").update(registryBody).digest("hex")}`);
  assert.equal(checkTwinContract("twin-state", initial.state).valid, true);

  const firstSnapshot = readFileSync(join(stateRoot, "twin", "snapshots", "1.json"), "utf8");
  const noop = refreshWorkspace(workspace, { now: at("2026-07-16T21:00:00.000Z") });
  assert.equal(noop.changed, false);
  assert.equal(noop.state.revision, 1);
  assert.deepEqual(readdirSync(join(stateRoot, "twin", "snapshots")), ["1.json"]);

  writeFileSync(join(workspace, "README.md"), "# Demo\n\nUpdated source body.\n");
  mkdirSync(join(workspace, "notes"));
  writeFileSync(join(workspace, "notes", "next.md"), "# Next\n");
  unlinkSync(join(workspace, "src", "a.ts"));
  const updated = refreshWorkspace(workspace, { now: at("2026-07-16T22:00:00.000Z") });
  assert.equal(updated.changed, true);
  assert.equal(updated.state.revision, 2);
  assert.deepEqual(updated.event?.changes, {
    added: ["notes/next.md"],
    modified: ["README.md"],
    deleted: ["src/a.ts"],
  });
  assert.equal(checkTwinContract("twin-state", updated.state).valid, true);
  assert.equal(readFileSync(join(stateRoot, "twin", "snapshots", "1.json"), "utf8"), firstSnapshot);
  assert.equal(jsonLines(join(stateRoot, "twin", "events.jsonl")).length, 2);

  rmSync(statePath);
  rmSync(viewPath);
  const restored = statusWorkspace(workspace);
  assert.equal(restored.state.revision, 2);
  assert.equal(restored.view, updated.view);
  assert.equal(existsSync(statePath), true);
  assert.equal(existsSync(viewPath), true);
});

test("notes mirrors retain normalized provenance and report unsupported files", () => {
  const workspace = mkdtempSync(join(tmpdir(), "forme-notes-twin-"));
  mkdirSync(join(workspace, "mirror"));
  writeFileSync(join(workspace, "mirror", "note.md"), "# Exported note\n");
  writeFileSync(join(workspace, "mirror", "attachment.heic"), "not imported");
  const result = initWorkspace({
    workspaceRoot: workspace,
    sourceRoot: "mirror",
    kind: "notes-export",
    name: "Notes mirror",
    now: at("2026-07-16T23:00:00.000Z"),
  });
  const records = jsonLines<SourceRecord>(join(workspace, "98_Forme", "evidence", "manifest.jsonl"));
  const note = records.find((record) => record.locator.relativePath === "mirror/note.md");
  assert.equal(note?.sourceKind, "notes-export");
  assert.equal(note?.provenanceClass, "normalized");
  assert.match(result.event?.warnings.join("\n") ?? "", /outside configured extensions/);
});

test("an interrupted Twin transition resumes idempotently from every durable boundary", () => {
  for (const failurePoint of ["pending", "manifest", "snapshot", "event"] as const) {
    const workspace = mkdtempSync(join(tmpdir(), `forme-twin-crash-${failurePoint}-`));
    writeFileSync(join(workspace, "README.md"), "# Before\n");
    initWorkspace({
      workspaceRoot: workspace,
      includeExtensions: [".md"],
      now: at("2026-07-17T00:10:00.000Z"),
    });
    writeFileSync(join(workspace, "README.md"), "# After\n");
    assert.throws(() => refreshWorkspace(workspace, {
      now: at("2026-07-17T00:11:00.000Z"),
      failurePoint,
    }), /injected failure/);
    assert.equal(existsSync(join(workspace, "98_Forme", "twin", "pending-transition.json")), true);

    const recovered = statusWorkspace(workspace);
    assert.equal(recovered.state.revision, 2, failurePoint);
    assert.equal(existsSync(join(workspace, "98_Forme", "twin", "pending-transition.json")), false);
    assert.equal(jsonLines(join(workspace, "98_Forme", "twin", "events.jsonl")).length, 2);
    const evidence = jsonLines<SourceRecord>(join(workspace, "98_Forme", "evidence", "manifest.jsonl"));
    assert.equal(new Set(evidence.map((record) => record.evidenceId)).size, evidence.length);

    const noop = refreshWorkspace(workspace, { now: at("2026-07-17T00:12:00.000Z") });
    assert.equal(noop.changed, false);
    assert.equal(noop.state.revision, 2);
  }
});

test("workspace onboarding rejects traversal and a symlinked source root outside the workspace", () => {
  const traversal = mkdtempSync(join(tmpdir(), "forme-traversal-"));
  assert.throws(() => initWorkspace({
    workspaceRoot: traversal,
    sourceRoot: "../outside",
    now: at("2026-07-17T00:00:00.000Z"),
  }), /relative path|contract failed/);
  assert.equal(existsSync(join(traversal, "98_Forme", "workspace.json")), false);

  const workspace = mkdtempSync(join(tmpdir(), "forme-symlink-root-"));
  const outside = mkdtempSync(join(tmpdir(), "forme-symlink-outside-"));
  writeFileSync(join(outside, "note.md"), "outside");
  symlinkSync(outside, join(workspace, "mirror"));
  assert.throws(() => initWorkspace({
    workspaceRoot: workspace,
    sourceRoot: "mirror",
    kind: "notes-export",
    now: at("2026-07-17T00:05:00.000Z"),
  }), /outside the workspace/);
  assert.equal(existsSync(join(workspace, "98_Forme", "workspace.json")), false);
});
