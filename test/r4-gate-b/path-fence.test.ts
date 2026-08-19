import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { PathFenceError, createPathFence } from "../../scripts/r4-gate-b-path-fence.mjs";

function expectCode(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof PathFenceError);
    const fenced = error as Error & { code: string };
    assert.equal(fenced.code, code);
    assert.equal(fenced.message, code);
    return true;
  });
}

function withFixture(run: (fixture: {
  base: string;
  repository: string;
  temporary: string;
  outside: string;
}) => void): void {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-path-fence-"));
  fs.chmodSync(base, 0o700);
  const repository = path.join(base, "repository");
  const temporary = path.join(base, "construction-temp");
  const outside = path.join(base, "outside");
  fs.mkdirSync(repository, { mode: 0o700 });
  fs.mkdirSync(temporary, { mode: 0o700 });
  fs.mkdirSync(outside, { mode: 0o700 });
  try {
    run({ base, repository, temporary, outside });
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

function fixtureFence(repository: string, temporary: string) {
  return createPathFence({
    repositoryRoot: repository,
    constructionTempRoot: temporary,
    repositoryAllowlist: [
      { path: "allowed.txt", access: "exact" },
      { path: "tree", access: "tree" },
    ],
    tempAllowlist: [{ path: "synthetic", access: "tree" }],
  });
}

test("path fence allows only exact roots and literal allowlisted paths", () => {
  withFixture(({ repository, temporary }) => {
    fs.writeFileSync(path.join(repository, "allowed.txt"), "fixture", { mode: 0o600 });
    fs.mkdirSync(path.join(temporary, "synthetic"), { mode: 0o700 });
    fs.writeFileSync(path.join(temporary, "synthetic", "input.json"), "{}", {
      mode: 0o600,
    });
    const fence = fixtureFence(repository, temporary);

    assert.equal(
      fence.resolveRepository("allowed.txt", { kind: "file" }),
      path.join(repository, "allowed.txt"),
    );
    assert.equal(
      fence.resolveTemp("synthetic/input.json", { kind: "file" }),
      path.join(temporary, "synthetic", "input.json"),
    );
    assert.equal(
      fence.resolveRepository("tree/planned.json", { mustExist: false, kind: "file" }),
      path.join(repository, "tree", "planned.json"),
    );
  });
});

test("path fence denies parent, sibling, absolute, and alternate-root escapes", () => {
  withFixture(({ repository, temporary, outside }) => {
    fs.writeFileSync(path.join(outside, "canary.txt"), "canary", { mode: 0o600 });
    const fence = fixtureFence(repository, temporary);

    expectCode(
      () => fence.resolveRepository("../outside/canary.txt"),
      "PATH_TOKEN_TRAVERSAL",
    );
    expectCode(
      () => fence.resolveRepository(path.join(outside, "canary.txt")),
      "PATH_TOKEN_NOT_RELATIVE_LITERAL",
    );
    expectCode(() => fence.resolveRepository("sibling.txt"), "PATH_NOT_ALLOWLISTED");
    expectCode(
      () => fence.resolveRepository("tree/../../outside/canary.txt"),
      "PATH_TOKEN_TRAVERSAL",
    );
  });
});

test("path fence denies symlink components and hard-linked regular files", () => {
  withFixture(({ repository, temporary, outside }) => {
    fs.mkdirSync(path.join(repository, "tree"), { mode: 0o700 });
    fs.writeFileSync(path.join(outside, "canary.txt"), "canary", { mode: 0o600 });
    fs.symlinkSync(path.join(outside, "canary.txt"), path.join(repository, "tree", "link"));
    fs.linkSync(path.join(outside, "canary.txt"), path.join(repository, "tree", "hard"));
    const fence = fixtureFence(repository, temporary);

    expectCode(
      () => fence.resolveRepository("tree/link", { kind: "file" }),
      "PATH_SYMLINK_COMPONENT",
    );
    expectCode(
      () => fence.resolveRepository("tree/hard", { kind: "file" }),
      "PATH_HARD_LINKED_REGULAR_FILE",
    );
  });
});

test("path fence denies empty roots, overlap, empty allowlists, and denied components", () => {
  withFixture(({ repository, temporary }) => {
    expectCode(
      () =>
        createPathFence({
          repositoryRoot: "",
          constructionTempRoot: temporary,
          repositoryAllowlist: [{ path: "allowed.txt", access: "exact" }],
          tempAllowlist: [{ path: "synthetic", access: "tree" }],
        }),
      "REPOSITORY_ROOT_NOT_ABSOLUTE",
    );
    expectCode(
      () =>
        createPathFence({
          repositoryRoot: repository,
          constructionTempRoot: repository,
          repositoryAllowlist: [{ path: "allowed.txt", access: "exact" }],
          tempAllowlist: [{ path: "synthetic", access: "tree" }],
        }),
      "ROOTS_OVERLAP",
    );
    expectCode(
      () =>
        createPathFence({
          repositoryRoot: repository,
          constructionTempRoot: temporary,
          repositoryAllowlist: [],
          tempAllowlist: [{ path: "synthetic", access: "tree" }],
        }),
      "REPOSITORY_ALLOWLIST_EMPTY",
    );

    const fence = fixtureFence(repository, temporary);
    expectCode(
      () => fence.resolveRepository(".codex/session.json", { mustExist: false }),
      "PATH_TOKEN_DENIED_COMPONENT",
    );
    expectCode(
      () => fence.resolveRepository("tree/codex-home/session.json", { mustExist: false }),
      "PATH_TOKEN_DENIED_COMPONENT",
    );
  });
});

test("path fence denies command substitution, globs, dynamic roots, and fallback search", () => {
  withFixture(({ repository, temporary }) => {
    const fence = fixtureFence(repository, temporary);

    expectCode(
      () => fence.resolveRepository("tree/$(touch_marker)"),
      "PATH_TOKEN_NOT_CLOSED_LITERAL",
    );
    expectCode(
      () => fence.resolveRepository("tree/`touch_marker`"),
      "PATH_TOKEN_NOT_CLOSED_LITERAL",
    );
    expectCode(
      () => fence.resolveRepository("tree/*.json"),
      "PATH_TOKEN_NOT_CLOSED_LITERAL",
    );
    expectCode(() => fence.resolveRepository(""), "PATH_TOKEN_EMPTY");
    expectCode(
      () => fence.resolveRepository("tree/missing.json", { kind: "file" }),
      "PATH_MISSING",
    );
    expectCode(
      () => fence.resolveRepository("missing.json", { mustExist: false }),
      "PATH_NOT_ALLOWLISTED",
    );
  });
});
