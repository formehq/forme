import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  inspectConstructionFixtureDirectory,
  inspectConstructionFixtureFile,
  inspectConstructionFixtureSocket,
  parseDockerClientVersion,
  parseDockerImageObservation,
  parseDockerVersionObservation,
  sha256,
  validateHostBindingInputBytes,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-host-binding.mjs";

function privateRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forme-host-binding-test-"));
  fs.chmodSync(root, 0o700);
  return fs.realpathSync(root);
}

test("Host Binding input is one canonical closed frame and never carries implementation identity", () => {
  const value = {
    schemaVersion: "r4_gate_b_host_binding_input.v1",
    dockerCli: "/owned/docker",
    dockerUnixSocket: "/owned/docker.sock",
    codexPackageRoot: "/owned/codex",
  };
  const bytes = Buffer.from(`${canonicalJson(value)}\n`);
  assert.equal(canonicalJson(validateHostBindingInputBytes(bytes)), canonicalJson(value));
  assert.throws(() => validateHostBindingInputBytes(Buffer.from(`${JSON.stringify(value)}\n`)), /HOST_BINDING_INPUT_NOT_CANONICAL/u);
  assert.throws(() => validateHostBindingInputBytes(Buffer.from(`${canonicalJson({ ...value, implementationHead: "a".repeat(40) })}\n`)), /HOST_BINDING_INPUT_SHAPE/u);
  assert.throws(() => validateHostBindingInputBytes(Buffer.from(`${canonicalJson({ ...value, dockerCli: "../docker" })}\n`)), /HOST_BINDING_INPUT_PATH_INVALID/u);
  assert.throws(() => validateHostBindingInputBytes(Buffer.concat([bytes, Buffer.from("x")])), /HOST_BINDING_INPUT_FRAMING/u);
});

test("construction fixture identity checks close symlink, hardlink, mode, owner-root overlap and type drift", () => {
  const root = privateRoot();
  try {
    const file = path.join(root, "tool");
    fs.writeFileSync(file, "synthetic-tool\n", { mode: 0o700 });
    const expected = sha256(fs.readFileSync(file));
    assert.equal(inspectConstructionFixtureFile(file, expected).sha256, expected);
    fs.chmodSync(file, 0o722);
    assert.throws(() => inspectConstructionFixtureFile(file), /HOST_BOUND_FILE_UNSAFE/u);
    fs.chmodSync(file, 0o700);
    const hard = path.join(root, "hard");
    fs.linkSync(file, hard);
    assert.throws(() => inspectConstructionFixtureFile(file), /HOST_BOUND_FILE_UNSAFE/u);
    fs.unlinkSync(hard);
    const link = path.join(root, "link");
    fs.symlinkSync(file, link);
    assert.throws(() => inspectConstructionFixtureFile(link), /HOST_BOUND_PATH_SYMLINKED/u);
    assert.equal(inspectConstructionFixtureDirectory(root), root);
    assert.throws(() => inspectConstructionFixtureDirectory(root, [root]), /HOST_BOUND_DIRECTORY_OVERLAP/u);
    assert.throws(() => inspectConstructionFixtureSocket(file), /DOCKER_SOCKET_UNSAFE/u);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Docker Host Binding parsers retain only exact bounded public fields", () => {
  assert.equal(parseDockerClientVersion("Docker version 28.3.2, build deadbee\n"), "28.3.2");
  assert.deepEqual(parseDockerVersionObservation('"28.3.2" "1.51" "28.3.2" "1.51" "linux" "arm64"\n'), {
    clientVersion: "28.3.2", clientApiVersion: "1.51", serverVersion: "28.3.2", serverApiVersion: "1.51", serverOs: "linux", serverArch: "arm64",
  });
  const image = parseDockerImageObservation('["postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"] "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "linux" "arm64" 123456\n');
  assert.equal(image.imageSizeBytes, 123456);
  assert.throws(() => parseDockerVersionObservation('"x" "1" "x" "1" "linux" "amd64"\n'), /DOCKER_PLATFORM_UNSUPPORTED/u);
  assert.throws(() => parseDockerImageObservation('[] "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "linux" "arm64" 1\n'), /DOCKER_IMAGE_UNSUPPORTED/u);
});

test("Host Binding library rejects direct execution before any host input read", () => {
  const result = spawnSync(process.execPath, ["scripts/r4-gate-b-host-binding.mjs"], { cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } });
  assert.equal(result.status, 64);
  assert.equal(result.stderr, "HOST_BINDING_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  assert.equal(result.stdout, "");
});
