import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AppServerProbeError,
  guardClientMessage,
  initializeMessage,
  initializedMessage,
  runAppServerProbe,
  validatePinnedCodexFixtures,
} from "../../packages/r4-codex-adapter/src/app-server-probe.ts";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { cleanupFakeCodexFixture, createFakeCodexFixture } from "../../scripts/r4-gate-b-codex-probe.mjs";

function temporaryRoot(): string {
  const value = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  if (!value) throw new Error("CONSTRUCTION_TEMP_ROOT_REQUIRED");
  return value;
}

async function expectProbeCode(promise: Promise<unknown>, expected?: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppServerProbeError);
    if (expected) assert.equal(error.code, expected);
    assert.equal(error.message, error.code);
    assert.doesNotMatch(error.stack ?? "", /fixture-machine|fixture-installation/u);
    return true;
  });
}

test("pinned static fixtures bind Codex 0.145.0 and denied families", () => {
  const pins = validatePinnedCodexFixtures();
  assert.match(pins.schemaPinHash, /^[0-9a-f]{64}$/u);
  assert.match(pins.methodPinHash, /^[0-9a-f]{64}$/u);
  assert.ok(pins.deniedMethodCount >= 30);
});

test("client guard permits only initialize and initialized before writer invocation", () => {
  let writes = 0;
  const guardedWrite = (message: unknown) => {
    const line = guardClientMessage(message);
    writes += 1;
    return line;
  };
  assert.match(guardedWrite(initializeMessage()), /"method":"initialize"/u);
  assert.match(guardedWrite(initializedMessage()), /"method":"initialized"/u);
  assert.equal(writes, 2);
  for (const method of [
    "thread/start", "turn/start", "model/list", "account/read", "tool/requestUserInput",
    "fs/readFile", "process/start", "plugin/list", "mcpServer/list", "browser/open",
  ]) {
    assert.throws(() => guardedWrite({ id: 1, method, params: {} }), /CODEX_CLIENT_METHOD_DENIED_BEFORE_WRITE/u);
    assert.equal(writes, 2);
  }
  assert.throws(() => guardedWrite({ ...initializeMessage(), extra: true }), /CODEX_CLIENT_MESSAGE_DENIED/u);
  assert.equal(writes, 2);
});

test("clean fixture executable runs four allowed invocations with zero thread turn or provider calls", async () => {
  const fixture = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    const result = await runAppServerProbe({
      root: fixture.root,
      authority: { mode: "fixture", sha256: fixture.executableSha256 },
      expectedHelpSha256: fixture.expectedHelpSha256,
      expectedSchema: fixture.expectedSchema,
    });
    assert.equal(result.classification, "FIXTURE_GREEN");
    assert.equal(result.schemaFileCount, 3);
    assert.equal(result.clientWrites, 2);
    assert.equal(result.serverRequests, 0);
    assert.equal(result.threadStarts, 0);
    assert.equal(result.turnStarts, 0);
    assert.equal(result.providerCalls, 0);
    assert.equal(result.providerBytes, 0);
    assert.equal(result.stderrBytes, 0);
    assert.equal(result.exitCode, 0);
    assert.equal(result.disabledRemoteControlNotificationCount, 1);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /fixture-machine|fixture-installation|neutral-cwd|fixture-state/u);
    assert.deepEqual(fs.readdirSync(path.join(fixture.root, "auth/fixture-state")), []);
    assert.deepEqual(fs.readdirSync(path.join(fixture.root, "tmp/codex")), []);
  } finally {
    cleanupFakeCodexFixture(fixture.root);
  }
});

test("wrong hash mode symlink and hard link deny before fixture spawn", async () => {
  const wrongHash = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    await expectProbeCode(runAppServerProbe({
      root: wrongHash.root,
      authority: { mode: "fixture", sha256: "0".repeat(64) },
      expectedHelpSha256: wrongHash.expectedHelpSha256,
      expectedSchema: wrongHash.expectedSchema,
    }), "CODEX_EXECUTABLE_HASH_MISMATCH");
    assert.deepEqual(fs.readdirSync(path.join(wrongHash.root, "build/schema")), []);
  } finally {
    cleanupFakeCodexFixture(wrongHash.root);
  }

  const wrongMode = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    fs.chmodSync(path.join(wrongMode.root, "bin/fixture-codex"), 0o700);
    await expectProbeCode(runAppServerProbe({
      root: wrongMode.root,
      authority: { mode: "fixture", sha256: wrongMode.executableSha256 },
      expectedHelpSha256: wrongMode.expectedHelpSha256,
      expectedSchema: wrongMode.expectedSchema,
    }), "CODEX_EXECUTABLE_MODE_INVALID");
  } finally {
    cleanupFakeCodexFixture(wrongMode.root);
  }

  const linked = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    const executable = path.join(linked.root, "bin/fixture-codex");
    const target = path.join(linked.root, "bin/fixture-target");
    fs.renameSync(executable, target);
    fs.linkSync(target, executable);
    await expectProbeCode(runAppServerProbe({
      root: linked.root,
      authority: { mode: "fixture", sha256: linked.executableSha256 },
      expectedHelpSha256: linked.expectedHelpSha256,
      expectedSchema: linked.expectedSchema,
    }), "CODEX_FIXTURE_PATH_UNSAFE");
  } finally {
    cleanupFakeCodexFixture(linked.root);
  }

  const symlinked = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    const executable = path.join(symlinked.root, "bin/fixture-codex");
    const target = path.join(symlinked.root, "bin/fixture-target");
    fs.renameSync(executable, target);
    fs.symlinkSync(target, executable);
    await expectProbeCode(runAppServerProbe({
      root: symlinked.root,
      authority: { mode: "fixture", sha256: symlinked.executableSha256 },
      expectedHelpSha256: symlinked.expectedHelpSha256,
      expectedSchema: symlinked.expectedSchema,
    }), "CODEX_FIXTURE_PATH_UNSAFE");
  } finally {
    cleanupFakeCodexFixture(symlinked.root);
  }
});

test("server requests unknown notifications duplicates malformed output stderr and nonzero exit fail closed", async () => {
  for (const behavior of [
    "server_request", "unknown_notification", "duplicate_notification",
    "unexpected_shape", "malformed", "stderr", "nonzero",
  ]) {
    const fixture = createFakeCodexFixture(temporaryRoot(), behavior);
    try {
      await expectProbeCode(runAppServerProbe({
        root: fixture.root,
        authority: { mode: "fixture", sha256: fixture.executableSha256 },
        expectedHelpSha256: fixture.expectedHelpSha256,
        expectedSchema: fixture.expectedSchema,
      }));
    } finally {
      cleanupFakeCodexFixture(fixture.root);
    }
  }
});

test("schema inventory drift fails before app-server handshake", async () => {
  const fixture = createFakeCodexFixture(temporaryRoot(), "clean");
  try {
    await expectProbeCode(runAppServerProbe({
      root: fixture.root,
      authority: { mode: "fixture", sha256: fixture.executableSha256 },
      expectedHelpSha256: fixture.expectedHelpSha256,
      expectedSchema: { ...fixture.expectedSchema, aggregateSha256: "0".repeat(64) },
    }), "CODEX_SCHEMA_FIXTURE_MISMATCH");
  } finally {
    cleanupFakeCodexFixture(fixture.root);
  }
});
