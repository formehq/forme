import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  BROKER_POLICY_HASH,
  buildResponseSourceSnapshot,
  isEligibleSnapshotPath,
  MAX_SNAPSHOT_FILE_BYTES,
  MAX_SNAPSHOT_TOTAL_BYTES,
  RESPONSE_SECRET_POLICY_HASH,
  RESPONSE_SOURCE_POLICY_HASH,
  SnapshotQueryBroker,
  TRUSTED_GIT_EXECUTABLE,
  sha256,
  snapshotPathlessReceiptFields,
  stableJson,
} from "../../packages/r4-local/src/index.ts";
import { createGitRepo, git, removeRoot, syntheticSnapshot, temporaryRoot } from "./helpers.ts";

test("snapshot policy is exact, narrow, deterministic, clean-HEAD, and object-bound", () => {
  const root = createGitRepo({
    "README.md": "# Synthetic\n",
    "package-lock.json": "{}\n",
    "docs/guide.md": "Guide\n",
    "src/main.ts": "export const value = 1;\n",
    "AGENTS.md": "must never enter snapshot\n",
    ".env.synthetic": "FORME_PRIVATE_CANARY\n",
    "notes/private.md": "out of allowlist\n",
    "dist/generated.ts": "excluded build output\n",
  });
  try {
    assert.match(RESPONSE_SOURCE_POLICY_HASH, /^sha256:[a-f0-9]{64}$/u);
    assert.match(RESPONSE_SECRET_POLICY_HASH, /^sha256:[a-f0-9]{64}$/u);
    const capturedAt = new Date("2026-08-03T12:00:00.000Z");
    const first = buildResponseSourceSnapshot(root, capturedAt);
    const second = buildResponseSourceSnapshot(root, capturedAt);
    assert.equal(first.manifest.manifestHash, second.manifest.manifestHash);
    assert.equal(first.manifest.snapshotId, second.manifest.snapshotId);
    assert.deepEqual(first.files.map((file) => file.canonicalPath), [
      "README.md",
      "docs/guide.md",
      "package-lock.json",
      "src/main.ts",
    ]);
    assert.equal(first.files.find((file) => file.canonicalPath === "src/main.ts")?.text, "export const value = 1;\n");
    assert.equal(first.manifest.totalBytes, first.files.reduce((total, file) => total + file.byteCount, 0));
    assert.doesNotMatch(JSON.stringify(first), /must never enter|FORME_PRIVATE_CANARY|out of allowlist|excluded build/u);

    assert.equal(isEligibleSnapshotPath("docs/a.md"), true);
    assert.equal(isEligibleSnapshotPath("packages/a/src/a.ts"), true);
    assert.equal(isEligibleSnapshotPath("AGENTS.md"), false);
    assert.equal(isEligibleSnapshotPath("../README.md"), false);
    assert.equal(isEligibleSnapshotPath("docs/a.exe"), false);
    assert.equal(isEligibleSnapshotPath("packages/vendor/a.ts"), false);
  } finally {
    removeRoot(root);
  }
});

test("dirty or untracked eligible content rejects the whole snapshot; ineligible dirt does not widen it", () => {
  const dirty = createGitRepo({ "README.md": "clean\n", "docs/a.md": "clean\n" });
  try {
    writeFileSync(join(dirty, "docs/a.md"), "dirty\n");
    assert.throws(() => buildResponseSourceSnapshot(dirty), /requires clean eligible HEAD/u);
  } finally {
    removeRoot(dirty);
  }

  const untracked = createGitRepo();
  try {
    mkdirSync(join(untracked, "docs"));
    writeFileSync(join(untracked, "docs/untracked.md"), "untracked\n");
    assert.throws(() => buildResponseSourceSnapshot(untracked), /requires clean eligible HEAD/u);
  } finally {
    removeRoot(untracked);
  }

  const ineligible = createGitRepo();
  try {
    mkdirSync(join(ineligible, "notes"));
    writeFileSync(join(ineligible, "notes/private.md"), "untracked but outside source policy\n");
    assert.doesNotThrow(() => buildResponseSourceSnapshot(ineligible));
  } finally {
    removeRoot(ineligible);
  }
});

test("snapshot rejects symlink, submodule-mode, binary, generated, secret, non-NFC, and per-file overflow", async (t) => {
  await t.test("symlink", () => {
    const root = createGitRepo();
    try {
      mkdirSync(join(root, "docs"));
      symlinkSync("../README.md", join(root, "docs/link.md"));
      git(root, ["add", "docs/link.md"]);
      git(root, ["commit", "--quiet", "-m", "synthetic symlink"]);
      assert.throws(() => buildResponseSourceSnapshot(root), /symlink rejected/u);
    } finally { removeRoot(root); }
  });

  await t.test("submodule mode", () => {
    const root = createGitRepo();
    const submodule = createGitRepo({ "README.md": "synthetic submodule\n" });
    try {
      git(root, ["-c", "protocol.file.allow=always", "submodule", "add", "--quiet", submodule, "packages/submodule.md"]);
      git(root, ["commit", "--quiet", "-m", "synthetic gitlink"]);
      assert.throws(() => buildResponseSourceSnapshot(root), /submodule rejected/u);
    } finally {
      removeRoot(root);
      removeRoot(submodule);
    }
  });

  const badFiles: Array<{ name: string; bytes: string | Buffer; pattern: RegExp }> = [
    { name: "binary", bytes: Buffer.from([0x61, 0x00, 0x62]), pattern: /binary content rejected/u },
    { name: "generated", bytes: "// @generated\nexport const x = 1;\n", pattern: /generated content rejected/u },
    { name: "secret", bytes: "const key = 'sk-synthetic0123456789';\n", pattern: /secret\/canary content rejected/u },
    { name: "non-nfc", bytes: "Cafe\u0301\n", pattern: /non-NFC content rejected/u },
    { name: "oversize", bytes: Buffer.alloc(MAX_SNAPSHOT_FILE_BYTES + 1, 0x61), pattern: /file size exceeded/u },
  ];
  for (const fixture of badFiles) {
    await t.test(fixture.name, () => {
      const root = createGitRepo({ "README.md": "ok\n", "src/bad.ts": fixture.bytes });
      try {
        assert.throws(() => buildResponseSourceSnapshot(root), fixture.pattern);
      } finally { removeRoot(root); }
    });
  }
});

test("snapshot rejects total size overflow and exact-root/worktree boundary escape", () => {
  const files: Record<string, Buffer | string> = { "README.md": "ok\n" };
  for (let index = 0; index < 17; index += 1) {
    files[`docs/large-${index}.txt`] = Buffer.alloc(512 * 1024, 0x61 + (index % 20));
  }
  const large = createGitRepo(files);
  try {
    assert.throws(() => buildResponseSourceSnapshot(large), /total size exceeded/u);
    assert.equal(MAX_SNAPSHOT_TOTAL_BYTES, 8 * 1024 * 1024);
  } finally { removeRoot(large); }

  const nested = createGitRepo({ "README.md": "ok\n", "docs/a.md": "a\n" });
  try {
    assert.throws(() => buildResponseSourceSnapshot(join(nested, "docs")), /exact Git worktree root/u);
  } finally { removeRoot(nested); }

  const source = createGitRepo();
  const worktreeParent = temporaryRoot("worktree-parent");
  const worktree = join(worktreeParent, "linked");
  try {
    git(source, ["worktree", "add", "--quiet", "--detach", worktree]);
    assert.throws(() => buildResponseSourceSnapshot(worktree), /Git (?:common )?directory escapes/u);
  } finally {
    try { git(source, ["worktree", "remove", "--force", worktree]); } catch { /* already absent */ }
    removeRoot(worktreeParent);
    removeRoot(source);
  }
});

test("snapshot rejects a Git object alternate even when the worktree is otherwise clean", () => {
  const root = createGitRepo({ "README.md": "clean synthetic repo\n" });
  const alternate = temporaryRoot("git-object-alternate");
  try {
    mkdirSync(join(root, ".git", "objects", "info"), { recursive: true });
    mkdirSync(join(alternate, "objects"), { recursive: true });
    writeFileSync(join(root, ".git", "objects", "info", "alternates"), `${join(alternate, "objects")}\n`);
    assert.throws(() => buildResponseSourceSnapshot(root), /alternate|Git.*escape/u);
  } finally {
    removeRoot(alternate);
    removeRoot(root);
  }
});

test("snapshot builder ignores a poisoned process PATH and invokes only approved absolute Git", () => {
  const root = createGitRepo({ "README.md": "trusted Git path\n" });
  const poison = temporaryRoot("poisoned-git-path");
  const fakeGit = join(poison, "git");
  const marker = `${fakeGit}.invoked`;
  const previousPath = process.env.PATH;
  try {
    writeFileSync(fakeGit, "#!/bin/sh\n: > \"$0.invoked\"\nexit 99\n", "utf8");
    chmodSync(fakeGit, 0o755);
    process.env.PATH = `${poison}:${previousPath ?? ""}`;
    assert.equal(TRUSTED_GIT_EXECUTABLE, "/usr/bin/git");
    assert.doesNotThrow(() => buildResponseSourceSnapshot(root));
    assert.equal(existsSync(marker), false, "Workspace/PATH-selected fake Git must never execute");
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    removeRoot(poison);
    removeRoot(root);
  }
});

test("SnapshotQueryBroker enforces manifest path, line, byte, regex, match, and aggregate limits", () => {
  const manyLines = Array.from({ length: 240 }, (_, index) => `line ${index + 1} needle`).join("\n");
  const broker = new SnapshotQueryBroker(syntheticSnapshot([
    { path: "README.md", text: manyLines },
    { path: "docs/other.md", text: "alpha\nbeta" },
  ]), Buffer.alloc(32, 9));

  const read = broker.readLines("README.md", 1, 200);
  assert.equal(read.lineStart, 1);
  assert.equal(read.lineEnd, 200);
  assert.equal(read.text.split("\n").length, 200);
  assert.throws(() => broker.readLines("README.md", 1, 201), /exceeds 200 lines/u);
  assert.throws(() => broker.readLines("../README.md", 1, 1), /path rejected/u);
  assert.throws(() => broker.readLines("/README.md", 1, 1), /path rejected/u);
  assert.throws(() => broker.readLines("docs\\other.md", 1, 1), /path rejected/u);
  assert.throws(() => broker.readLines("docs/missing.md", 1, 1), /outside the snapshot manifest/u);

  const literal = broker.search({ pattern: "needle", mode: "literal" });
  assert.equal(literal.length, 100);
  assert.equal(literal[0]?.path, "README.md");
  assert.throws(() => broker.search({ pattern: "a".repeat(257), mode: "literal" }), /pattern is invalid/u);
  assert.throws(() => broker.search({ pattern: "a", mode: "regex" }), /RE2 engine unavailable/u);

  const aggregate = broker.aggregate();
  assert.equal(aggregate.queryCount, 9, "successful, rejected, and invalid direct attempts all consume authority budget");
  assert.equal(aggregate.resultCount, 101);
  assert.ok(aggregate.resultBytes > 0);
  assert.match(aggregate.accessDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(BROKER_POLICY_HASH, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(BROKER_POLICY_HASH, sha256(stableJson({
    schemaVersion: "r4.snapshot-query-broker.v1",
    read: { maxLines: 200, maxBytes: 32 * 1024 },
    search: { maxPatternBytes: 256, maxMatches: 100, maxBytes: 64 * 1024, maxMilliseconds: 500 },
    aggregate: { maxQueries: 256, maxResultBytes: 128 * 1024, rejectedAndTimeoutAttemptsConsumeQueryBudget: true },
    regex: "denied-until-exact-RE2-engine-is-approved-in-Gate-B",
  })));
});

test("broker rejects one line over 32 KiB and durable snapshot receipt fields are path-free", () => {
  const snapshot = syntheticSnapshot([{ path: "docs/large.md", text: "x".repeat(32 * 1024 + 1) }]);
  const broker = new SnapshotQueryBroker(snapshot, Buffer.alloc(32, 1));
  assert.throws(() => broker.readLines("docs/large.md", 1, 1), /exceeds 32 KiB/u);
  const receipt = snapshotPathlessReceiptFields(snapshot);
  assert.equal(receipt.snapshotManifestHash, snapshot.manifest.manifestHash);
  assert.equal(receipt.fileCount, 1);
  assert.equal("files" in receipt, false);
  assert.equal("path" in receipt, false);
  assert.doesNotMatch(JSON.stringify(receipt), /docs\/large\.md/u);
});

test("Broker aborts literal search at the injected 500 ms deadline and closes its aggregate query budget", () => {
  const clock = [0, 0, 0, 500];
  const timed = new SnapshotQueryBroker(
    syntheticSnapshot([{ path: "README.md", text: "one\ntwo\nthree" }]),
    Buffer.alloc(32, 2),
    { nowMilliseconds: () => clock.shift() ?? 500 },
  );
  const timeout = timed.evaluate({ schemaVersion: "snapshot_search.v1", pattern: "three", patternKind: "literal" });
  assert.equal(timeout.status, "timeout");
  assert.equal(timeout.bodyFreeErrorCode, "snapshot_query_timeout");
  assert.equal(timeout.resultText, null);
  assert.equal(timed.aggregate().queryCount, 1, "a timeout consumes a query attempt");

  const bounded = new SnapshotQueryBroker(
    syntheticSnapshot([{ path: "README.md", text: "x" }]),
    Buffer.alloc(32, 3),
  );
  for (let index = 0; index < 256; index += 1) {
    assert.equal(bounded.evaluate({
      schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
    }).status, "ok");
  }
  const exhausted = bounded.evaluate({
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
  });
  assert.equal(exhausted.status, "rejected");
  assert.equal(bounded.aggregate().queryCount, 256);

  const invalid = new SnapshotQueryBroker(
    syntheticSnapshot([{ path: "README.md", text: "x" }]),
    Buffer.alloc(32, 4),
  );
  for (let index = 0; index < 256; index += 1) {
    assert.equal(invalid.evaluate({
      schemaVersion: "snapshot_line_read.v1",
      canonicalPath: `docs/missing-${index}.md`,
      lineStart: 1,
      lineEnd: 1,
    }).status, "not_found");
  }
  assert.equal(invalid.evaluate({
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
  }).status, "rejected", "invalid attempts cannot bypass the closed aggregate cap");
  assert.equal(invalid.aggregate().queryCount, 256);

  const resultBytes = new SnapshotQueryBroker(
    syntheticSnapshot([{ path: "README.md", text: "x".repeat(32 * 1024) }]),
    Buffer.alloc(32, 5),
  );
  for (let index = 0; index < 4; index += 1) {
    assert.equal(resultBytes.evaluate({
      schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
    }).status, "ok");
  }
  assert.equal(resultBytes.evaluate({
    schemaVersion: "snapshot_line_read.v1", canonicalPath: "README.md", lineStart: 1, lineEnd: 1,
  }).status, "rejected");
  assert.equal(resultBytes.aggregate().resultBytes, 128 * 1024);
});
