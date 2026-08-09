import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import net from "node:net";
import { PassThrough } from "node:stream";
import test from "node:test";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  HOST_BINDING_AUTHORITY,
  HOST_BINDING_INVALIDATION_RULES,
  HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS,
  INSPECTOR_LIMITS,
  RUNTIME_DEPENDENCY_PATHS,
  atomicWritePrivateFile,
  assertHostBindingReattemptActivationGrantHash,
  assertHostBindingCapsuleAuthority,
  buildHostBindingReattemptOutputFrames,
  createHostBindingReattemptActivationGrantFrame,
  createHostBindingFinalRevalidator,
  createProcessHostInspector,
  decodeCanonicalJsonFrameBase64Url,
  decodeHostBindingReattemptEvidenceReceipt,
  finalizeHostBinding,
  finalizeHostBindingReattempt,
  hostBindingReattemptEnvironmentDirectoryIdentitySha256,
  hostBindingReattemptEnvironmentDirectoryIntentSha256,
  inspectConstructionFixtureDirectory,
  inspectConstructionFixtureFile,
  inspectConstructionFixtureSocket,
  observeBoundDirectory,
  observeHostBindingReattemptEnvironmentDirectoryIdentity,
  parseDeveloperRootObservation,
  parseDockerClientVersion,
  parseDockerImageObservation,
  parseDockerVersionObservation,
  parseMacOSArchitecture,
  parseMacOSBuildVersion,
  parseMacOSProductVersion,
  parseOpenSSLVersion,
  parseSdkPathObservation,
  parseSdkVersion,
  parseSwiftVersion,
  parseSwiftcPathObservation,
  privateWriteTemporaryPath,
  readAndConsumeHostBindingInput,
  readAndConsumeHostBindingReattemptInput,
  removeHostBindingInputEnvelope,
  runtimeDependencyLogicalName,
  runtimeDependencyInventory,
  sha256,
  validateDeveloperToolchainRelationship,
  validateHostBindingInputBytes,
  validateHostBindingReattemptInputBytes,
// @ts-expect-error Construction scripts intentionally remain executable ESM.
} from "../../scripts/r4-gate-b-host-binding.mjs";

const inspectorCommand = (stdoutLimitBytes = 512) => ({
  id: "docker-client-version",
  executable: "/synthetic/docker",
  argv: ["--version"],
  deadlineMilliseconds: 1,
  stdoutLimitBytes,
  environment: {},
});

function fakeInspectorProcessPort(mode: "stderr" | "oversize" | "timeout" | "eperm" | "unknown") {
  const events: string[] = [];
  const port = {
    async start() {
      const child = new EventEmitter() as EventEmitter & Record<string, any>;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      for (const [name, stream] of [["stdout", stdout], ["stderr", stderr]] as const) {
        const originalDestroy = stream.destroy.bind(stream);
        stream.destroy = ((error?: Error) => {
          if (!stream.destroyed) events.push(`destroy:${name}`);
          return originalDestroy(error);
        }) as typeof stream.destroy;
      }
      let childClosed = false;
      const closeChild = (code: number, signal: NodeJS.Signals | null) => {
        if (childClosed) return;
        childClosed = true;
        child.emit("close", code, signal);
      };
      child.pid = 41001;
      child.stdout = stdout;
      child.stderr = stderr;
      child.release = async () => {
        events.push("release");
        if (mode === "stderr") stderr.write(Buffer.from("x"));
        else if (mode === "oversize") stdout.write(Buffer.alloc(513, 0x61));
        else if (mode === "eperm" || mode === "unknown") {
          stdout.end(Buffer.from("Docker version 28.3.2, build deadbee\n"));
          setImmediate(() => closeChild(0, null));
        }
      };
      child.abortBeforeRelease = async () => true;
      child.signalGroup = (signal: NodeJS.Signals) => {
        events.push(`signal:${signal}:stdout=${stdout.destroyed}:stderr=${stderr.destroyed}`);
        if (signal === "SIGTERM" && mode !== "timeout") closeChild(143, "SIGTERM");
        if (signal === "SIGKILL") closeChild(137, "SIGKILL");
        return true;
      };
      child.stopAndProveAbsent = async () => {
        events.push(`absence:${mode}`);
        return mode !== "eperm" && mode !== "unknown";
      };
      child.finalizeSlotAfterTerminal = () => { events.push("slot-finalized"); };
      return child;
    },
  };
  return { events, port };
}

function privateRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forme-host-binding-test-"));
  fs.chmodSync(root, 0o700);
  return fs.realpathSync(root);
}

test("v2 canonical frames are strict base64url and Activation Grant binds the input-prepared latch", () => {
  const reattemptSource = Function.prototype.toString.call(finalizeHostBindingReattempt);
  assert.match(reattemptSource, /await finalizeHostBindingWithEnvironmentAuthority\(/u);
  assert.match(reattemptSource, /Object\.freeze\(\{ reattemptRunId: frozen\.reattemptRunId \}\)/u);
  assert.doesNotMatch(reattemptSource, /inspector\.run|command\(/u);
  const receipt = Object.freeze({ schemaVersion: "synthetic.v2", status: "PASS", findingsCount: 0 });
  const receiptText = canonicalJson(receipt);
  const encoded = Buffer.from(receiptText, "utf8").toString("base64url");
  const decoded = decodeCanonicalJsonFrameBase64Url(encoded);
  assert.equal(canonicalJson(decoded.value), receiptText);
  assert.equal(decoded.sha256, sha256(Buffer.from(receiptText, "utf8")));
  assert.equal(Object.isFrozen(decoded.value), true);
  for (const invalid of [`${encoded}=`, Buffer.from(`${receiptText}\n`, "utf8").toString("base64url"), Buffer.from('{"status":"PASS","schemaVersion":"synthetic.v2","findingsCount":0}', "utf8").toString("base64url")]) {
    assert.throws(() => decodeCanonicalJsonFrameBase64Url(invalid), /CANONICAL_FRAME_INVALID/u);
  }

  const fields = {
    activationCardSha256: `sha256:${"1".repeat(64)}`,
    checkpointSha256: `sha256:${"2".repeat(64)}`,
    implementationHead: "3".repeat(40),
    implementationTree: "4".repeat(40),
  };
  const frame = createHostBindingReattemptActivationGrantFrame(fields);
  assert.equal(frame.hostBindingInputPreparedByOwner, true);
  assert.equal(frame.hostBindingAttemptGrant, "APPROVED_ONCE");
  assert.equal(frame.retryExecutionGrant, "NOT_REQUESTED");
  assert.equal(frame.firstProviderCallGrant, "NOT_REQUESTED");
  const expected = sha256(Buffer.from(canonicalJson(frame), "utf8"));
  assert.deepEqual(assertHostBindingReattemptActivationGrantHash(fields, expected), { frame, sha256: expected });
  assert.throws(() => assertHostBindingReattemptActivationGrantHash(fields, `sha256:${"f".repeat(64)}`), /HOST_BINDING_REATTEMPT_ACTIVATION_GRANT_HASH_MISMATCH/u);

  const binding = { implementationHead: "3".repeat(40), implementationTree: "4".repeat(40) };
  const validation = {
    schemaVersion: "r4_gate_b_host_binding_reattempt_validation_receipt.v2",
    ...binding,
    status: "PASS",
    validationAggregateSha256: `sha256:${"5".repeat(64)}`,
    hostBindingInputAccessed: false,
    hostBindingInputPresenceObserved: false,
    dockerReadOnlyCliCalls: 0,
    localDockerUnixSocketRequests: 0,
    macosReadOnlyInspectionCalls: 0,
    realPhysicalEffects: 0,
    retryExecutions: 0,
    providerCalls: 0,
  };
  const validationEncoded = Buffer.from(canonicalJson(validation), "utf8").toString("base64url");
  assert.equal(decodeHostBindingReattemptEvidenceReceipt(validationEncoded, "validation", binding).value.status, "PASS");
  const audit = {
    schemaVersion: "r4_gate_b_host_binding_reattempt_audit_receipt.v2",
    auditClass: "authority-checkpoint-journal-cleanup",
    ...binding,
    status: "PASS",
    findingsCount: 0,
    blockerCount: 0,
    importantCount: 0,
    summarySha256: `sha256:${"6".repeat(64)}`,
  };
  const auditEncoded = Buffer.from(canonicalJson(audit), "utf8").toString("base64url");
  assert.equal(decodeHostBindingReattemptEvidenceReceipt(auditEncoded, "authority-audit", binding).value.auditClass, audit.auditClass);
  assert.throws(() => decodeHostBindingReattemptEvidenceReceipt(auditEncoded, "host-audit", binding), /HOST_BINDING_REATTEMPT_EVIDENCE_KIND_MISMATCH/u);
  assert.throws(() => decodeHostBindingReattemptEvidenceReceipt(validationEncoded, "validation", { ...binding, implementationTree: "7".repeat(40) }), /HOST_BINDING_REATTEMPT_EVIDENCE_BINDING_MISMATCH/u);
});

test("v2 output frames schema-bind attempt authority while retaining the exact 3/2/9 closed plan", () => {
  const digest = (character: string) => `sha256:${character.repeat(64)}`;
  const identity = (index: number) => ({ logicalName: `tool-${index}`, path: `/synthetic/tool-${index}`, sha256: digest((index % 10).toString()), size: 1, mode: 0o755, uid: 501, gid: 20, device: "1", inode: String(index + 1), nlink: 1, mtimeMilliseconds: 1 });
  const boundFiles = Object.freeze(Array.from({ length: 20 }, (_, index) => Object.freeze(identity(index))));
  const directoryIdentity = (directoryPath: string, inode: string) => Object.freeze({ path: directoryPath, size: 1, mode: 0o755, uid: 0, gid: 0, device: "1", inode, nlink: 2, mtimeMilliseconds: 1 });
  const docker = Object.freeze({ cliPath: "/synthetic/docker", socketPath: "/synthetic/docker.sock", socketIdentity: Object.freeze({ size: 1, mode: 0o600, uid: 501, gid: 20, device: "1", inode: "30", nlink: 1, mtimeMilliseconds: 1 }), clientVersion: "28.3.2", clientApiVersion: "1.51", serverVersion: "28.3.2", serverApiVersion: "1.51", serverOs: "linux", serverArch: "arm64", imageReference: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", repoDigest: "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74", localImageId: digest("a"), imageOs: "linux", imageArch: "arm64", imageSizeBytes: 1, unixSocketRequests: 2 });
  const publicDocker = Object.freeze(Object.fromEntries(Object.entries(docker).filter(([key]) => !new Set(["cliPath", "socketPath", "socketIdentity", "imageReference", "unixSocketRequests"]).has(key))));
  const macos = Object.freeze({ platform: "darwin-arm64", productVersion: "26.0", buildVersion: "26A1", architecture: "arm64", developerRoot: "/Library/Developer/CommandLineTools", developerRootIdentity: directoryIdentity("/Library/Developer/CommandLineTools", "31"), sdkPath: "/Library/Developer/CommandLineTools/SDKs/MacOSX26.0.sdk", sdkPathIdentity: directoryIdentity("/Library/Developer/CommandLineTools/SDKs/MacOSX26.0.sdk", "32"), sdkVersion: "26.0", swiftcPath: "/Library/Developer/CommandLineTools/usr/bin/swiftc", swiftVersion: "Apple Swift version 6.2\nTarget: arm64-apple-macosx26.0", opensslVersion: "LibreSSL 3.3.6", nodeVersion: process.version, readOnlyInspectionCalls: 9 });
  const legacy = Object.freeze({
    hostBindingId: "b".repeat(32),
    capsule: Object.freeze({ privateSalt: "c".repeat(64), createdAt: "2026-08-08T00:00:00.000Z", expiresAt: "2026-08-11T00:00:00.000Z", boundFiles, docker, macos }),
    publicReceipt: Object.freeze({ createdAt: "2026-08-08T00:00:00.000Z", expiresAt: "2026-08-11T00:00:00.000Z", platform: "darwin-arm64", tools: Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({ logicalName: `tool-${index}`, version: "byte-bound", sha256: digest((index % 10).toString()) }))), docker: publicDocker }),
  });
  const frozen = Object.freeze({ reattemptRunId: "5cf5b31b5adfceac7fda4d5319db8957", reattemptPacketSha256: "sha256:ee713295af27577edadeeca8c5188d492acec12816ab4e5cf4488f1f6146daf3", reattemptOwnerReviewSha256: "sha256:670338ba6983c77daa70c67741828eedf7666dee5b88aad3fcb5a706af52e445", approvedProposalHead: "af5396bb1ff69d6c2b74fbb5f9e4cea415fb826d", approvedProposalTree: "b7aabaac66156f6d169be1547cc6caa2ea4e8a4e", implementationHead: "c".repeat(40), implementationTree: "d".repeat(40), runtimeDependencyAggregateSha256: digest("1") });
  const output = buildHostBindingReattemptOutputFrames({ frozen, legacy, checkpointSha256: digest("2"), activationCardSha256: digest("3"), activationGrantSha256: digest("4"), consumedAttemptTombstoneSha256: digest("5"), attemptId: "6".repeat(32) });
  try {
    assert.deepEqual(output.capsule.closedCounters, { dockerReadOnlyCliCalls: 3, localDockerUnixSocketRequests: 2, macosReadOnlyInspectionCalls: 9, dockerMutationCalls: 0, credentialsRead: 0, realPhysicalEffects: 0, realCodexCalls: 0, sandboxExecCalls: 0, signingCalls: 0, keychainCalls: 0, localAuthenticationCalls: 0, retryExecutions: 0, providerCalls: 0, externalRuntimeNetworkCalls: 0 });
    assert.equal(output.publicReceipt.hostBindingAttemptGrant, "APPROVED_ONCE");
    assert.equal(output.publicReceipt.retryExecutionGrant, "NOT_REQUESTED");
    assert.equal(output.publicReceipt.firstProviderCallGrant, "NOT_REQUESTED");
    assert.equal(output.capsule.authority.reattemptPacketSha256, frozen.reattemptPacketSha256);
    assert.equal(output.capsuleSha256, sha256(output.capsuleBytes));
    assert.equal(output.publicReceipt.hostBindingCapsuleSha256, output.capsuleSha256);
    assert.equal(output.publicReceiptSha256, sha256(output.publicReceiptBytes));
  } finally { output.capsuleBytes.fill(0); output.publicReceiptBytes.fill(0); }
});

async function listenPrivateUnixSocket(socketPath: string): Promise<net.Server> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolve(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(socketPath);
  });
  fs.chmodSync(socketPath, 0o600);
  return server;
}

async function closeUnixSocket(server: net.Server | null): Promise<void> {
  if (server === null) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function finalRevalidationFixture() {
  const root = fs.realpathSync(fs.mkdtempSync("/tmp/fhb-"));
  fs.chmodSync(root, 0o700);
  const parent = path.join(root, "authority");
  const developerRoot = path.join(parent, "developer-root");
  const sdkPath = path.join(parent, "sdk-path");
  const file = path.join(parent, "bound-tool");
  const socketPath = path.join(parent, "docker.sock");
  fs.mkdirSync(parent, { mode: 0o700 });
  fs.mkdirSync(developerRoot, { mode: 0o700 });
  fs.mkdirSync(sdkPath, { mode: 0o700 });
  fs.writeFileSync(file, "synthetic-bound-file\n", { mode: 0o600 });
  fs.utimesSync(file, 1_700_000_000, 1_700_000_000);
  const fixture = { root, parent, developerRoot, sdkPath, file, socketPath, server: await listenPrivateUnixSocket(socketPath), revalidator: createHostBindingFinalRevalidator() };
  fixture.revalidator.observeBoundFile("synthetic-bound-tool", file, { owner: "current", maximumBytes: 1_048_576 });
  fixture.revalidator.observeDockerSocket(socketPath);
  fixture.revalidator.observeDirectory("developer-root", developerRoot, { owner: "current" });
  fixture.revalidator.observeDirectory("sdk-path", sdkPath, { owner: "current" });
  return fixture;
}

async function removeFinalRevalidationFixture(fixture: Awaited<ReturnType<typeof finalRevalidationFixture>>): Promise<void> {
  try { await closeUnixSocket(fixture.server); }
  finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
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
    assert.equal(observeBoundDirectory(root).path, root);
    assert.throws(() => inspectConstructionFixtureDirectory(root, [root]), /HOST_BOUND_DIRECTORY_OVERLAP/u);
    assert.throws(() => inspectConstructionFixtureSocket(file), /DOCKER_SOCKET_UNSAFE/u);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Docker Host Binding parsers retain only exact bounded public fields", () => {
  assert.equal(parseDockerClientVersion("Docker version 28.3.2, build deadbee\n"), "28.3.2");
  assert.deepEqual(parseDockerVersionObservation('"28.3.2" "1.51" "28.3.2" "1.51" "linux" "arm64"\n'), {
    clientVersion: "28.3.2", clientApiVersion: "1.51", serverVersion: "28.3.2", serverApiVersion: "1.51", serverOs: "linux", serverArch: "arm64",
  });
  const image = parseDockerImageObservation('["mirror.example.com:5000/library/postgres@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"] "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "linux" "arm64" 123456\n');
  assert.equal(image.imageSizeBytes, 123456);
  assert.equal(image.repoDigest, "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74");
  assert.throws(() => parseDockerVersionObservation('"28.3.2" "1.51" "28.3.2" "1.51" "linux" "amd64"\n'), /DOCKER_PLATFORM_UNSUPPORTED/u);
  assert.throws(() => parseDockerVersionObservation('"x" "1" "28.3.2" "1.51" "linux" "arm64"\n'), /DOCKER_VERSION_OBSERVATION_INVALID/u);
  assert.throws(() => parseDockerVersionObservation('"28.3.2" "1.51" "28.3.2" "1.51" "linux" "arm64"'), /HOST_INSPECTOR_OUTPUT_FRAMING/u);
  assert.throws(() => parseDockerImageObservation('[] "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "linux" "arm64" 1\n'), /DOCKER_IMAGE_UNSUPPORTED/u);
  assert.throws(() => parseDockerImageObservation('["postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74","postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"] "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "linux" "arm64" 1\n'), /DOCKER_IMAGE_UNSUPPORTED/u);
});

test("macOS Host Binding parsers and developer relationship are command-specific and closed", () => {
  assert.equal(parseMacOSProductVersion("26.0.1\n"), "26.0.1");
  assert.equal(parseMacOSBuildVersion("25A123a\n"), "25A123a");
  assert.equal(parseMacOSArchitecture("arm64\n"), "arm64");
  const developerRoot = parseDeveloperRootObservation("/Applications/Xcode-26.0.app/Contents/Developer\n");
  const swiftcPath = parseSwiftcPathObservation("/Applications/Xcode-26.0.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc\n");
  const sdkPath = parseSdkPathObservation("/Applications/Xcode-26.0.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX26.0.sdk\n");
  assert.equal(parseSdkVersion("26.0\n"), "26.0");
  assert.equal(validateDeveloperToolchainRelationship({ developerRoot, swiftcPath, sdkPath, sdkVersion: "26.0" }), true);
  assert.equal(parseSwiftVersion("Apple Swift version 6.2.1 (swiftlang-6.2.1 clang-1700.0.1.1)\nTarget: arm64-apple-macosx26.0\n"), "Apple Swift version 6.2.1 (swiftlang-6.2.1 clang-1700.0.1.1)\nTarget: arm64-apple-macosx26.0");
  assert.equal(parseOpenSSLVersion("LibreSSL 3.3.6\n"), "LibreSSL 3.3.6");
  assert.throws(() => parseMacOSProductVersion("15.7\n"), /MACOS_PLATFORM_UNSUPPORTED/u);
  assert.throws(() => parseMacOSBuildVersion("not-a-build\n"), /MACOS_BUILD_VERSION_INVALID/u);
  assert.throws(() => parseMacOSArchitecture("x86_64\n"), /MACOS_PLATFORM_UNSUPPORTED/u);
  assert.throws(() => parseDeveloperRootObservation("/Users/person/toolchain\n"), /DEVELOPER_TOOLCHAIN_UNSUPPORTED/u);
  assert.throws(() => parseSwiftVersion("Apple Swift version 6.2.1\n"), /SWIFT_VERSION_INVALID/u);
  assert.throws(() => validateDeveloperToolchainRelationship({ developerRoot, swiftcPath: "/usr/bin/swiftc", sdkPath }), /DEVELOPER_TOOLCHAIN_UNSUPPORTED/u);
  assert.throws(() => validateDeveloperToolchainRelationship({ developerRoot, swiftcPath, sdkPath, sdkVersion: "26.1" }), /DEVELOPER_TOOLCHAIN_UNSUPPORTED/u);
});

test("runtime bindings have complete dependencies, lowercase collision-resistant names and exact capsule authority", () => {
  assert.ok(RUNTIME_DEPENDENCY_PATHS.includes("schemas/r4/gate-b-core/macos/evidence.schema.json"));
  assert.ok(RUNTIME_DEPENDENCY_PATHS.includes("schemas/r4/gate-b-core/macos/forme-core-transient-response.sb"));
  const names = RUNTIME_DEPENDENCY_PATHS.map(runtimeDependencyLogicalName);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name: string) => /^repo-[0-9a-f]{64}$/u.test(name)));
  const schema = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../../schemas/r4/gate-b-core/host-binding-capsule.schema.json"), "utf8"));
  assert.equal(schema.properties.authority.properties.constructionPacketSha256.const, HOST_BINDING_AUTHORITY.constructionPacketSha256);
  assert.equal(schema.properties.authority.properties.constructionOwnerReviewSha256.const, HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256);
  assert.equal(schema.properties.authority.properties.approvedProposalHead.const, HOST_BINDING_AUTHORITY.approvedProposalHead);
  assert.equal(schema.properties.authority.properties.approvedProposalTree.const, HOST_BINDING_AUTHORITY.approvedProposalTree);
  assert.deepEqual(schema.properties.invalidationRules.const, HOST_BINDING_INVALIDATION_RULES);
  const capsuleAuthority = { authority: { constructionPacketSha256: HOST_BINDING_AUTHORITY.constructionPacketSha256, constructionOwnerReviewSha256: HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256, approvedProposalHead: HOST_BINDING_AUTHORITY.approvedProposalHead, approvedProposalTree: HOST_BINDING_AUTHORITY.approvedProposalTree, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" }, invalidationRules: [...HOST_BINDING_INVALIDATION_RULES] };
  assert.equal(assertHostBindingCapsuleAuthority(capsuleAuthority), true);
  assert.throws(() => assertHostBindingCapsuleAuthority({ ...capsuleAuthority, authority: { ...capsuleAuthority.authority, retryExecutionGrant: "sha256:" + "a".repeat(64) } }), /HOST_BINDING_CAPSULE_AUTHORITY_DRIFT/u);
});

test("Host Binding rejects a checkpoint whose approved Decision Brief hash drifts", async () => {
  const root = privateRoot();
  const runtime = runtimeDependencyInventory();
  const hash = `sha256:${"a".repeat(64)}`;
  const checkpoint = {
    schemaVersion: "r4_gate_b_physical_construction_checkpoint.v1",
    constructionRunId: HOST_BINDING_AUTHORITY.constructionRunId,
    approvedDecisionBriefSha256: `sha256:${"0".repeat(64)}`,
    constructionPacketSha256: HOST_BINDING_AUTHORITY.constructionPacketSha256,
    constructionOwnerReviewSha256: HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256,
    approvedProposalHead: HOST_BINDING_AUTHORITY.approvedProposalHead,
    approvedProposalTree: HOST_BINDING_AUTHORITY.approvedProposalTree,
    implementationHead: "a".repeat(40),
    implementationTree: "b".repeat(40),
    physicalRunnerSha256: hash,
    hostBindingModuleSha256: hash,
    physicalPortSha256: hash,
    runnerContractSha256: hash,
    codexProfileSha256: hash,
    runtimeDependencyCount: runtime.fileCount,
    runtimeDependencyAggregateSha256: runtime.aggregateSha256,
    runtimeDependencies: runtime.files,
    validationAggregateSha256: hash,
    auditReceipts: [],
  };
  const zeroSnapshot = Object.freeze({ dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
  const inspector = Object.freeze({ async run() { throw new Error("LEGACY_FAKE_INSPECTOR_MUST_NOT_RUN"); }, snapshot() { return zeroSnapshot; } });
  try {
    await assert.rejects(finalizeHostBinding({
      repositoryRoot: path.resolve(import.meta.dirname, "../.."),
      constructionRoot: root,
      checkpoint,
      ownerInput: { schemaVersion: "r4_gate_b_host_binding_input.v1", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" },
      inspector,
    }), /HOST_BINDING_CHECKPOINT_DRIFT/u);
    assert.deepEqual(inspector.snapshot(), zeroSnapshot, "legacy v1 keeps the run/snapshot-only fake inspector interface");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Host inspector environment directories are exclusively created, parent-fsynced, identity-journaled and held through inspection", async () => {
  const root = privateRoot();
  const reattemptRunId = "5cf5b31b5adfceac7fda4d5319db8957";
  const records: Array<Record<string, any>> = [];
  const originalFsync = fs.fsyncSync;
  let fsyncCalls = 0;
  let createdRecords = 0;
  fs.fsyncSync = ((descriptor: number) => { fsyncCalls += 1; return originalFsync(descriptor); }) as typeof fs.fsyncSync;
  const inspector = createProcessHostInspector({
    root,
    journal: async (record: Record<string, any>) => {
      records.push(record);
      if (String(record.event).startsWith("environment-directory-created:")) {
        createdRecords += 1;
        assert.equal(fsyncCalls, createdRecords * 2, "each identity record follows the child and held-parent fsyncs");
      }
      return { sequence: records.length - 1 };
    },
  });
  try {
    const prepared = await inspector.prepareEnvironment({ reattemptRunId });
    assert.equal(Object.isFrozen(prepared), true);
    assert.equal(Object.isFrozen(prepared.environment), true);
    assert.equal(Object.isFrozen(prepared.directories), true);
    assert.deepEqual(prepared.environment, {
      HOME: path.join(root, "home"),
      DOCKER_CONFIG: path.join(root, "docker-config"),
      TMPDIR: path.join(root, "tmp"),
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    });
    assert.deepEqual(HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS, [
      { name: "home", environmentKey: "HOME", ownedResource: "host-inspector-environment-home" },
      { name: "docker-config", environmentKey: "DOCKER_CONFIG", ownedResource: "host-inspector-environment-docker-config" },
      { name: "tmp", environmentKey: "TMPDIR", ownedResource: "host-inspector-environment-tmp" },
    ]);
    assert.deepEqual(HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.map((spec: any) => hostBindingReattemptEnvironmentDirectoryIntentSha256(reattemptRunId, spec.name)), [
      "sha256:d77c677e98355377c5cbe6f2445feed409f7b483247c6b96470690c69c04b7cb",
      "sha256:afbfa12c974212a3f27b6d773562805fffc06bfd2540609edc613d11011a6bdb",
      "sha256:aef12cb2e06d0af319e2c77328c7f42b9c482acb696935f6da525bf9c55b65ff",
    ]);
    assert.equal(fsyncCalls, 6);
    assert.equal(createdRecords, 3);
    assert.equal(inspector.assertEnvironmentCurrent(), true);
    assert.deepEqual(inspector.environmentDirectoryObservations(), prepared.directories);
    assert.equal(Object.isFrozen(inspector.environmentDirectoryObservations()), true);
    for (const [index, spec] of HOST_BINDING_ENVIRONMENT_DIRECTORY_SPECS.entries()) {
      const stat = fs.lstatSync(path.join(root, spec.name));
      const identity = observeHostBindingReattemptEnvironmentDirectoryIdentity(reattemptRunId, spec.name, stat);
      const observation = prepared.directories[index];
      assert.equal(Object.isFrozen(spec), true);
      assert.equal(Object.isFrozen(observation), true);
      assert.equal(Object.isFrozen(identity), true);
      assert.equal(identity.reattemptRunId, reattemptRunId);
      assert.equal(identity.directoryName, spec.name);
      assert.equal(identity.ownedResource, spec.ownedResource);
      assert.equal(stat.isDirectory(), true);
      assert.equal(stat.mode & 0o777, 0o700);
      assert.equal(observation.identitySha256, hostBindingReattemptEnvironmentDirectoryIdentitySha256(reattemptRunId, spec.name, stat));
      assert.deepEqual(records[index * 2], {
        lane: "host-binding",
        event: `environment-directory-create-intent:${spec.name}`,
        hostBindingId: null,
        commandShapeSha256: hostBindingReattemptEnvironmentDirectoryIntentSha256(reattemptRunId, spec.name),
        processGroupId: null,
        ownedResources: [spec.ownedResource],
        terminalCode: null,
        cleanupState: "required",
      });
      assert.deepEqual(records[index * 2 + 1], {
        lane: "host-binding",
        event: `environment-directory-created:${spec.name}`,
        hostBindingId: null,
        commandShapeSha256: observation.identitySha256,
        processGroupId: null,
        ownedResources: [spec.ownedResource],
        terminalCode: "CREATED",
        cleanupState: "required",
      });
    }
    const originalHome = path.join(root, "home");
    const displacedHome = path.join(root, "home-held-original");
    fs.renameSync(originalHome, displacedHome);
    fs.mkdirSync(originalHome, { mode: 0o700 });
    fs.writeFileSync(path.join(originalHome, "same-uid-replacement-sentinel"), "preserve\n", { flag: "wx", mode: 0o600 });
    assert.throws(
      () => inspector.assertEnvironmentCurrent(),
      (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_IDENTITY_DRIFT" && error.verdict === "RED_QUARANTINED",
    );
    assert.equal(fs.readFileSync(path.join(originalHome, "same-uid-replacement-sentinel"), "utf8"), "preserve\n");
    assert.equal(fs.lstatSync(displacedHome).isDirectory(), true, "the held original remains independently identifiable");
  } finally {
    fs.fsyncSync = originalFsync;
    assert.equal(inspector.closeEnvironmentAuthority(), true);
    assert.equal(inspector.closeEnvironmentAuthority(), true);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Host inspector environment EEXIST races are quarantined without adopting or deleting the same-UID directory", async () => {
  const root = privateRoot();
  const reattemptRunId = "5cf5b31b5adfceac7fda4d5319db8957";
  const target = path.join(root, "home");
  const sentinel = path.join(target, "same-uid-race-sentinel");
  const records: Array<Record<string, any>> = [];
  const originalMkdir = fs.mkdirSync;
  let injected = false;
  const inspector = createProcessHostInspector({ root, journal: async (record: Record<string, any>) => { records.push(record); return { sequence: records.length - 1 }; } });
  fs.mkdirSync = ((directory: fs.PathLike, options?: fs.MakeDirectoryOptions & { recursive?: false }) => {
    if (!injected && String(directory) === target) {
      injected = true;
      originalMkdir(directory, options as fs.MakeDirectoryOptions);
      fs.writeFileSync(sentinel, "race-winner\n", { flag: "wx", mode: 0o600 });
    }
    return originalMkdir(directory, options as fs.MakeDirectoryOptions);
  }) as typeof fs.mkdirSync;
  try {
    await assert.rejects(
      inspector.prepareEnvironment({ reattemptRunId }),
      (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_PREEXISTS" && error.verdict === "RED_QUARANTINED",
    );
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(sentinel, "utf8"), "race-winner\n");
    assert.deepEqual(records, [{
      lane: "host-binding",
      event: "environment-directory-create-intent:home",
      hostBindingId: null,
      commandShapeSha256: hostBindingReattemptEnvironmentDirectoryIntentSha256(reattemptRunId, "home"),
      processGroupId: null,
      ownedResources: ["host-inspector-environment-home"],
      terminalCode: null,
      cleanupState: "required",
    }]);
    assert.deepEqual(inspector.environmentDirectoryObservations(), []);
  } finally {
    fs.mkdirSync = originalMkdir;
    assert.equal(inspector.closeEnvironmentAuthority(), true);
    assert.equal(fs.readFileSync(sentinel, "utf8"), "race-winner\n", "closing held authority never deletes an unowned race winner");
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Host inspector environment authority shapes fail Red and fsync/close uncertainty preserves the owned directories", async () => {
  const reattemptRunId = "5cf5b31b5adfceac7fda4d5319db8957";
  const malformedRoot = privateRoot();
  const malformedInspector = createProcessHostInspector({ root: malformedRoot });
  try {
    await assert.rejects(
      malformedInspector.prepareEnvironment({ reattemptRunId, extra: true }),
      (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_PREPARE_AUTHORITY_SHAPE" && error.verdict === "RED",
    );
  } finally {
    assert.equal(malformedInspector.closeEnvironmentAuthority(), true);
    fs.rmSync(malformedRoot, { recursive: true, force: true });
  }

  const fsyncRoot = privateRoot();
  const fsyncRecords: any[] = [];
  const fsyncInspector = createProcessHostInspector({ root: fsyncRoot, journal: async (record: any) => { fsyncRecords.push(record); return { sequence: fsyncRecords.length - 1 }; } });
  const originalFsync = fs.fsyncSync;
  let fsyncCalls = 0;
  fs.fsyncSync = ((descriptor: number) => {
    fsyncCalls += 1;
    if (fsyncCalls === 2) throw Object.assign(new Error("synthetic held-parent fsync uncertainty"), { code: "EIO" });
    return originalFsync(descriptor);
  }) as typeof fs.fsyncSync;
  try {
    await assert.rejects(
      fsyncInspector.prepareEnvironment({ reattemptRunId }),
      (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_PREPARE_FAILED" && error.verdict === "RED_QUARANTINED",
    );
    assert.deepEqual(fsyncRecords.map((record) => record.event), ["environment-directory-create-intent:home"]);
    assert.equal(fs.lstatSync(path.join(fsyncRoot, "home")).isDirectory(), true);
    assert.deepEqual(fsyncInspector.environmentDirectoryObservations(), []);
  } finally {
    fs.fsyncSync = originalFsync;
    assert.equal(fsyncInspector.closeEnvironmentAuthority(), true);
    fs.rmSync(fsyncRoot, { recursive: true, force: true });
  }

  const closeRoot = privateRoot();
  const closeInspector = createProcessHostInspector({ root: closeRoot, journal: async (_record: any) => ({ sequence: 0 }) });
  await closeInspector.prepareEnvironment({ reattemptRunId });
  const originalClose = fs.closeSync;
  let injectedCloseFault = false;
  fs.closeSync = ((descriptor: number) => {
    originalClose(descriptor);
    if (!injectedCloseFault) {
      injectedCloseFault = true;
      throw Object.assign(new Error("synthetic close uncertainty"), { code: "EIO" });
    }
  }) as typeof fs.closeSync;
  try {
    assert.throws(
      () => closeInspector.closeEnvironmentAuthority(),
      (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_AUTHORITY_CLOSE_UNCERTAIN" && error.verdict === "RED_QUARANTINED",
    );
    assert.equal(injectedCloseFault, true);
    assert.equal(fs.lstatSync(path.join(closeRoot, "home")).isDirectory(), true);
  } finally {
    fs.closeSync = originalClose;
    assert.equal(closeInspector.closeEnvironmentAuthority(), true);
    fs.rmSync(closeRoot, { recursive: true, force: true });
  }
});

test("Host inspector held environment is revalidated after awaited journals and on exceptional logical starts", async () => {
  const reattemptRunId = "5cf5b31b5adfceac7fda4d5319db8957";
  for (const driftPoint of ["intent-journal", "start-returned-child-drift", "started-journal", "logical-start-failure"] as const) {
    const root = privateRoot();
    const records: any[] = [];
    const target = path.join(root, "home");
    const displaced = path.join(root, "home-held-original");
    const sentinel = path.join(target, `${driftPoint}-replacement`);
    let drifted = false;
    let startCalls = 0;
    let releaseCalls = 0;
    let abortCalls = 0;
    const drift = () => {
      if (drifted) return;
      drifted = true;
      fs.renameSync(target, displaced);
      fs.mkdirSync(target, { mode: 0o700 });
      fs.writeFileSync(sentinel, "preserve\n", { flag: "wx", mode: 0o600 });
    };
    const processPort = {
      async start() {
        startCalls += 1;
        if (driftPoint === "logical-start-failure") {
          drift();
          throw Object.assign(new Error("synthetic observed logical start failure"), { code: "SYNTHETIC_START_FAILURE", verdict: "RED", logicalStartObserved: true, processGroupState: "observed-absent", processGroupId: 43_220 });
        }
        const child = new EventEmitter() as EventEmitter & Record<string, any>;
        child.pid = 43_221;
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.release = async () => { releaseCalls += 1; };
        child.abortBeforeRelease = async () => { abortCalls += 1; return true; };
        child.finalizeSlotAfterTerminal = () => {};
        if (driftPoint === "start-returned-child-drift") drift();
        return child;
      },
    };
    const inspector = createProcessHostInspector({
      root,
      processPort,
      journal: async (record: any) => {
        records.push(record);
        if (record.event === "intent:docker-client-version" && driftPoint === "intent-journal") drift();
        if (record.event === "started:docker-client-version" && driftPoint === "started-journal") drift();
        return { sequence: records.length - 1 };
      },
    });
    try {
      const prepared = await inspector.prepareEnvironment({ reattemptRunId });
      await assert.rejects(
        inspector.run({ ...inspectorCommand(), environment: prepared.environment }, []),
        (error: any) => error.code === "HOST_INSPECTOR_ENVIRONMENT_DIRECTORY_IDENTITY_DRIFT" && error.verdict === "RED_QUARANTINED",
      );
      assert.equal(drifted, true);
      assert.equal(fs.readFileSync(sentinel, "utf8"), "preserve\n");
      if (driftPoint === "intent-journal") {
        assert.equal(startCalls, 0, "the process cannot start after an intent-journal identity drift");
        assert.equal(releaseCalls, 0);
      } else if (driftPoint === "start-returned-child-drift" || driftPoint === "started-journal") {
        assert.equal(startCalls, 1);
        assert.equal(releaseCalls, 0, "the blocked child cannot release after a returned-child or started-journal identity drift");
        assert.equal(abortCalls, 1);
        assert.equal(records.some((record) => record.event === "cleanup-observed-absent:docker-client-version"), true);
      } else {
        assert.equal(startCalls, 1);
        assert.equal(records.some((record) => record.event === "cleanup-observed-absent:docker-client-version"), true);
      }
    } finally {
      assert.equal(inspector.closeEnvironmentAuthority(), true);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("post-inspection final revalidation closes file hash, path-chain, socket and developer-directory drift", async () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, "../../scripts/r4-gate-b-host-binding.mjs"), "utf8");
  const completeSnapshot = source.indexOf("validateHostInspectorSnapshot(inspector.snapshot(), { complete: true });");
  const finalRevalidation = source.indexOf("finalRevalidator.revalidate();", completeSnapshot);
  const randomIdentity = source.indexOf("hostBindingRandom = randomBytes(16)", finalRevalidation);
  const capsuleBytes = source.indexOf("const capsuleBytes = Buffer.from", finalRevalidation);
  assert.ok(completeSnapshot >= 0 && completeSnapshot < finalRevalidation);
  assert.ok(finalRevalidation < randomIdentity && finalRevalidation < capsuleBytes);

  const stable = await finalRevalidationFixture();
  try { assert.equal(stable.revalidator.revalidate(), true); }
  finally { await removeFinalRevalidationFixture(stable); }

  const hashDrift = await finalRevalidationFixture();
  try {
    const before = fs.lstatSync(hashDrift.file);
    fs.writeFileSync(hashDrift.file, "synthetic-bound-fild\n", { flag: "r+" });
    fs.utimesSync(hashDrift.file, 1_700_000_000, 1_700_000_000);
    const after = fs.lstatSync(hashDrift.file);
    assert.equal(after.size, before.size);
    assert.equal(after.ino, before.ino);
    assert.equal(Math.trunc(after.mtimeMs), Math.trunc(before.mtimeMs));
    assert.throws(() => hashDrift.revalidator.revalidate(), (error: any) => error.code === "HOST_BINDING_FINAL_REVALIDATION_DRIFT" && error.verdict === "RED");
  } finally { await removeFinalRevalidationFixture(hashDrift); }

  const pathDrift = await finalRevalidationFixture();
  try {
    const originalFile = fs.lstatSync(pathDrift.file);
    const oldParent = `${pathDrift.parent}.old`;
    fs.renameSync(pathDrift.parent, oldParent);
    fs.mkdirSync(pathDrift.parent, { mode: 0o700 });
    fs.renameSync(path.join(oldParent, path.basename(pathDrift.file)), pathDrift.file);
    assert.equal(fs.lstatSync(pathDrift.file).ino, originalFile.ino);
    assert.throws(() => pathDrift.revalidator.revalidate(), (error: any) => error.code === "HOST_BINDING_FINAL_REVALIDATION_DRIFT" && error.verdict === "RED");
  } finally { await removeFinalRevalidationFixture(pathDrift); }

  const socketDrift = await finalRevalidationFixture();
  try {
    await closeUnixSocket(socketDrift.server);
    socketDrift.server = await listenPrivateUnixSocket(socketDrift.socketPath);
    assert.throws(() => socketDrift.revalidator.revalidate(), (error: any) => error.code === "HOST_BINDING_FINAL_REVALIDATION_DRIFT" && error.verdict === "RED");
  } finally { await removeFinalRevalidationFixture(socketDrift); }

  for (const role of ["developerRoot", "sdkPath"] as const) {
    const directoryDrift = await finalRevalidationFixture();
    try {
      const target = directoryDrift[role];
      fs.renameSync(target, `${target}.old`);
      fs.mkdirSync(target, { mode: 0o700 });
      assert.throws(() => directoryDrift.revalidator.revalidate(), (error: any) => error.code === "HOST_BINDING_FINAL_REVALIDATION_DRIFT" && error.verdict === "RED");
    } finally { await removeFinalRevalidationFixture(directoryDrift); }
  }
});

test("injected Host inspectors close both owned output pipes before TERM and bound escalation", async () => {
  assert.equal(INSPECTOR_LIMITS.termGraceMilliseconds, 2_000);
  assert.equal(INSPECTOR_LIMITS.killGraceMilliseconds, 2_000);
  for (const mode of ["stderr", "oversize", "timeout"] as const) {
    const root = privateRoot();
    const fake = fakeInspectorProcessPort(mode);
    let sequence = 0;
    const inspector = createProcessHostInspector({ root, processPort: fake.port, journal: async () => ({ sequence: sequence++ }) });
    try {
      await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
        assert.equal(error.partialObservation.dockerCliStarts, 1);
        assert.equal(error.partialObservation.localDockerUnixSocketRequests, 0);
        assert.equal(error.partialObservation.macosInspectorStarts, 0);
        assert.equal(error.partialObservation.activeProcessGroups, 0);
        assert.equal(error.partialObservation.unknownProcessGroups, 0);
        return /HOST_INSPECTOR_TERMINAL_INVALID/u.test(error.message);
      });
      const term = fake.events.findIndex((entry) => entry.startsWith("signal:SIGTERM:"));
      assert.ok(term > fake.events.indexOf("destroy:stdout"), `${mode}:${fake.events.join(",")}`);
      assert.ok(term > fake.events.indexOf("destroy:stderr"), `${mode}:${fake.events.join(",")}`);
      assert.equal(fake.events[term], "signal:SIGTERM:stdout=true:stderr=true");
      if (mode === "timeout") {
        const kill = fake.events.findIndex((entry) => entry.startsWith("signal:SIGKILL:"));
        assert.ok(kill > term, fake.events.join(","));
        assert.equal(fake.events[kill], "signal:SIGKILL:stdout=true:stderr=true");
      } else assert.equal(fake.events.some((entry) => entry.startsWith("signal:SIGKILL:")), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("injected Host inspector EPERM and unknown absence remain quarantined with honest partial counters", async () => {
  for (const mode of ["eperm", "unknown"] as const) {
    const root = privateRoot();
    const fake = fakeInspectorProcessPort(mode);
    let sequence = 0;
    const inspector = createProcessHostInspector({ root, processPort: fake.port, journal: async () => ({ sequence: sequence++ }) });
    try {
      await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
        assert.equal(error.verdict, "YELLOW_QUARANTINED");
        assert.deepEqual(error.partialObservation, {
          dockerCliStarts: 1,
          localDockerUnixSocketRequests: 0,
          macosInspectorStarts: 0,
          activeProcessGroups: 1,
          unknownProcessGroups: 1,
          cleanupState: "unknown",
          quarantineState: "quarantined",
        });
        return /HOST_INSPECTOR_GROUP_ABSENCE_UNKNOWN/u.test(error.message);
      });
      assert.ok(fake.events.indexOf(`absence:${mode}`) > fake.events.indexOf("destroy:stderr"), fake.events.join(","));
      assert.deepEqual(inspector.snapshot(), {
        dockerCliStarts: 1,
        localDockerUnixSocketRequests: 0,
        macosInspectorStarts: 0,
        activeProcessGroups: 1,
        unknownProcessGroups: 1,
        cleanupState: "unknown",
        quarantineState: "quarantined",
      });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("process-port internal quarantine is propagated as conservative Host partial observation", async () => {
  const root = privateRoot();
  const processPort = {
    async start() {
      throw Object.assign(new Error("internal quarantine"), { code: "BLOCKED_SUPERVISOR_READY_QUARANTINED", verdict: "RED_QUARANTINED" });
    },
  };
  let sequence = 0;
  const inspector = createProcessHostInspector({ root, processPort, journal: async () => ({ sequence: sequence++ }) });
  try {
    await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
      assert.equal(error.message, "BLOCKED_SUPERVISOR_READY_QUARANTINED");
      assert.equal(error.verdict, "RED_QUARANTINED");
      assert.deepEqual(error.partialObservation, {
        dockerCliStarts: 1,
        localDockerUnixSocketRequests: 0,
        macosInspectorStarts: 0,
        activeProcessGroups: 1,
        unknownProcessGroups: 1,
        cleanupState: "unknown",
        quarantineState: "quarantined",
      });
      return true;
    });
    assert.deepEqual(inspector.snapshot(), {
      dockerCliStarts: 1,
      localDockerUnixSocketRequests: 0,
      macosInspectorStarts: 0,
      activeProcessGroups: 1,
      unknownProcessGroups: 1,
      cleanupState: "unknown",
      quarantineState: "quarantined",
    });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("process-port start metadata durably closes not-started and cleaned logical starts while preserving unknown groups", async () => {
  const cases = [
    { logicalStartObserved: false, processGroupState: "not-started", processGroupId: null, verdict: "RED", expectedStarts: 0, expectedActive: 0, closureEvent: "not-started:docker-client-version", closureTerminal: "NOT_STARTED" },
    { logicalStartObserved: true, processGroupState: "observed-absent", processGroupId: 43_210, verdict: "RED", expectedStarts: 1, expectedActive: 0, closureEvent: "cleanup-observed-absent:docker-client-version", closureTerminal: "ABSENT" },
    { logicalStartObserved: true, processGroupState: "unknown", processGroupId: 43_211, verdict: "RED_QUARANTINED", expectedStarts: 1, expectedActive: 1, closureEvent: null, closureTerminal: null },
  ] as const;
  for (const testCase of cases) {
    const root = privateRoot();
    const processPort = {
      async start() {
        throw Object.assign(new Error("closed start terminal"), { code: "BLOCKED_SUPERVISOR_INJECTED_FAULT", verdict: testCase.verdict, logicalStartObserved: testCase.logicalStartObserved, processGroupState: testCase.processGroupState, processGroupId: testCase.processGroupId });
      },
    };
    const records: any[] = [];
    const inspector = createProcessHostInspector({ root, processPort, journal: async (record: any) => { records.push(record); return { sequence: records.length - 1 }; } });
    try {
      await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
        assert.equal(error.message, "BLOCKED_SUPERVISOR_INJECTED_FAULT");
        assert.equal(error.verdict, testCase.verdict);
        assert.deepEqual(error.partialObservation, {
          dockerCliStarts: testCase.expectedStarts,
          localDockerUnixSocketRequests: 0,
          macosInspectorStarts: 0,
          activeProcessGroups: testCase.expectedActive,
          unknownProcessGroups: testCase.expectedActive,
          cleanupState: testCase.expectedActive === 0 ? "observed-absent" : "unknown",
          quarantineState: testCase.expectedActive === 0 ? "none" : "quarantined",
        });
        return true;
      });
      assert.equal(records[0].event, "intent:docker-client-version");
      if (testCase.closureEvent === null) assert.equal(records.length, 1);
      else assert.deepEqual(records[1], {
        lane: "host-binding",
        event: testCase.closureEvent,
        commandShapeSha256: records[0].commandShapeSha256,
        processGroupId: testCase.processGroupId,
        terminalCode: testCase.closureTerminal,
        cleanupState: "observed-absent",
      });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("process-port start closure journal faults preserve the primary code and counters but quarantine durability", async () => {
  for (const testCase of [
    { logicalStartObserved: false, processGroupState: "not-started", processGroupId: null, expectedStarts: 0, closureEvent: "not-started:docker-client-version" },
    { logicalStartObserved: true, processGroupState: "observed-absent", processGroupId: 43_212, expectedStarts: 1, closureEvent: "cleanup-observed-absent:docker-client-version" },
  ] as const) {
    const root = privateRoot();
    const attemptedEvents: string[] = [];
    const inspector = createProcessHostInspector({
      root,
      processPort: { async start() { throw Object.assign(new Error("closed start terminal"), { code: "BLOCKED_SUPERVISOR_PRIMARY_FAULT", verdict: "RED", ...testCase }); } },
      journal: async (record: any) => {
        attemptedEvents.push(record.event);
        if (record.event === testCase.closureEvent) throw new Error("injected closure append fault");
        return { sequence: attemptedEvents.length - 1 };
      },
    });
    try {
      await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
        assert.equal(error.code, "BLOCKED_SUPERVISOR_PRIMARY_FAULT");
        assert.equal(error.verdict, "RED_QUARANTINED");
        assert.deepEqual(error.partialObservation, {
          dockerCliStarts: testCase.expectedStarts,
          localDockerUnixSocketRequests: 0,
          macosInspectorStarts: 0,
          activeProcessGroups: 0,
          unknownProcessGroups: 0,
          cleanupState: "observed-absent",
          quarantineState: "none",
        });
        return true;
      });
      assert.deepEqual(attemptedEvents, ["intent:docker-client-version", testCase.closureEvent]);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("private publication uses a same-directory temp and leaves neither partial final nor temp on faults", () => {
  const root = privateRoot();
  const parent = path.join(root, "owned");
  fs.mkdirSync(parent, { mode: 0o700 });
  const bytes = Buffer.from("synthetic-private-capsule\n");
  try {
    const successful = path.join(parent, "complete.json");
    atomicWritePrivateFile(successful, bytes, 0o600, { anchor: root });
    assert.deepEqual(fs.readFileSync(successful), bytes);
    assert.equal(fs.lstatSync(successful).mode & 0o777, 0o600);
    assert.deepEqual(fs.readdirSync(parent), ["complete.json"]);
    assert.throws(() => atomicWritePrivateFile(successful, Buffer.from("replacement\n"), 0o600, { anchor: root }), /PRIVATE_WRITE_TARGET_EXISTS/u);
    assert.deepEqual(fs.readFileSync(successful), bytes);

    const crashTarget = path.join(parent, "crash-window.json");
    const crashTemp = privateWriteTemporaryPath(crashTarget);
    assert.equal(crashTemp, path.join(parent, `.crash-window.json.${HOST_BINDING_AUTHORITY.constructionRunId}.tmp`));
    const reattemptRunId = "5cf5b31b5adfceac7fda4d5319db8957";
    const reattemptTarget = path.join(parent, "reattempt.json");
    assert.equal(privateWriteTemporaryPath(reattemptTarget, reattemptRunId), path.join(parent, `.reattempt.json.${reattemptRunId}.tmp`));
    atomicWritePrivateFile(reattemptTarget, bytes, 0o600, { anchor: root, temporaryRunId: reattemptRunId });
    assert.deepEqual(fs.readFileSync(reattemptTarget), bytes);
    assert.equal(fs.existsSync(privateWriteTemporaryPath(reattemptTarget, reattemptRunId)), false);
    fs.unlinkSync(reattemptTarget);
    assert.throws(() => privateWriteTemporaryPath(reattemptTarget, "not-a-run-id"), /PRIVATE_WRITE_TEMPORARY_RUN_ID_INVALID/u);
    const crashBytes = Buffer.from("synthetic-crash-window\n");
    fs.writeFileSync(crashTemp, crashBytes, { flag: "wx", mode: 0o600 });
    assert.throws(() => atomicWritePrivateFile(crashTarget, bytes, 0o600, { anchor: root }), /PRIVATE_WRITE_TEMP_PREEXISTS/u);
    assert.equal(fs.existsSync(crashTarget), false);
    assert.deepEqual(fs.readFileSync(crashTemp), crashBytes);
    fs.unlinkSync(privateWriteTemporaryPath(crashTarget));
    assert.equal(fs.existsSync(crashTemp), false);
    crashBytes.fill(0);

    const linkTarget = path.join(parent, "link-fault.json");
    const linkTemp = privateWriteTemporaryPath(linkTarget);
    const originalLink = fs.linkSync;
    fs.linkSync = ((source: fs.PathLike, destination: fs.PathLike) => {
      if (destination === linkTarget) {
        assert.equal(source, linkTemp);
        assert.equal(path.dirname(String(source)), parent);
        throw Object.assign(new Error("injected link fault"), { code: "EIO" });
      }
      return originalLink(source, destination);
    }) as typeof fs.linkSync;
    try { assert.throws(() => atomicWritePrivateFile(linkTarget, bytes, 0o600, { anchor: root }), /injected link fault/u); }
    finally { fs.linkSync = originalLink; }
    assert.equal(fs.existsSync(linkTarget), false);
    assert.deepEqual(fs.readdirSync(parent), ["complete.json"]);

    const raceTarget = path.join(parent, "publish-race.json");
    const intruder = Buffer.from("same-uid-race-winner\n");
    fs.linkSync = ((source: fs.PathLike, destination: fs.PathLike) => {
      if (destination === raceTarget) fs.writeFileSync(raceTarget, intruder, { flag: "wx", mode: 0o600 });
      return originalLink(source, destination);
    }) as typeof fs.linkSync;
    try { assert.throws(() => atomicWritePrivateFile(raceTarget, bytes, 0o600, { anchor: root }), /PRIVATE_WRITE_TARGET_RACE/u); }
    finally { fs.linkSync = originalLink; }
    assert.deepEqual(fs.readFileSync(raceTarget), intruder);
    assert.equal(fs.existsSync(privateWriteTemporaryPath(raceTarget)), false);
    fs.unlinkSync(raceTarget);
    intruder.fill(0);

    const fsyncTarget = path.join(parent, "parent-fsync-fault.json");
    const originalFsync = fs.fsyncSync;
    let fsyncs = 0;
    fs.fsyncSync = ((descriptor: number) => {
      fsyncs += 1;
      if (fsyncs === 2) throw Object.assign(new Error("injected parent fsync fault"), { code: "EIO" });
      return originalFsync(descriptor);
    }) as typeof fs.fsyncSync;
    try { assert.throws(() => atomicWritePrivateFile(fsyncTarget, bytes, 0o600, { anchor: root }), /injected parent fsync fault/u); }
    finally { fs.fsyncSync = originalFsync; }
    assert.equal(fs.existsSync(fsyncTarget), false);
    assert.equal(fs.existsSync(privateWriteTemporaryPath(fsyncTarget)), false);
    assert.deepEqual(fs.readdirSync(parent), ["complete.json"]);

    const writeTarget = path.join(parent, "write-fault.json");
    const originalWrite = fs.writeSync;
    let writes = 0;
    fs.writeSync = ((descriptor: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position?: number | null) => {
      writes += 1;
      if (writes === 1) return originalWrite(descriptor, buffer, offset, Math.max(1, Math.floor(length / 2)), position ?? null);
      throw Object.assign(new Error("injected write fault"), { code: "EIO" });
    }) as typeof fs.writeSync;
    const longBytes = Buffer.alloc(131_072, 0x61);
    try { assert.throws(() => atomicWritePrivateFile(writeTarget, longBytes, 0o600, { anchor: root }), /injected write fault/u); }
    finally { fs.writeSync = originalWrite; longBytes.fill(0); }
    assert.equal(fs.existsSync(writeTarget), false);
    assert.deepEqual(fs.readdirSync(parent), ["complete.json"]);

    const fstatSwapTarget = path.join(parent, "fstat-swap.json");
    const fstatSwapTemp = privateWriteTemporaryPath(fstatSwapTarget);
    const displacedTemp = path.join(parent, "fstat-swap-displaced");
    const replacement = Buffer.from("same-uid-replacement-preserve\n", "utf8");
    const originalOpen = fs.openSync;
    const originalFstat = fs.fstatSync;
    let createdDescriptor: number | null = null;
    let injected = false;
    fs.openSync = ((target: fs.PathLike, flags: number | string, mode?: fs.Mode) => {
      const descriptor = originalOpen(target, flags, mode);
      if (String(target) === fstatSwapTemp) createdDescriptor = descriptor;
      return descriptor;
    }) as typeof fs.openSync;
    fs.fstatSync = ((descriptor: number, options?: unknown) => {
      if (descriptor === createdDescriptor && !injected) {
        injected = true;
        fs.renameSync(fstatSwapTemp, displacedTemp);
        fs.writeFileSync(fstatSwapTemp, replacement, { flag: "wx", mode: 0o600 });
        throw Object.assign(new Error("injected first temp fstat fault"), { code: "EIO" });
      }
      return originalFstat(descriptor, options as never);
    }) as typeof fs.fstatSync;
    try {
      assert.throws(
        () => atomicWritePrivateFile(fstatSwapTarget, bytes, 0o600, { anchor: root }),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "PRIVATE_WRITE_CLEANUP_FAILED" && "verdict" in error && error.verdict === "RED_QUARANTINED",
      );
    } finally { fs.openSync = originalOpen; fs.fstatSync = originalFstat; }
    assert.equal(injected, true);
    assert.deepEqual(fs.readFileSync(fstatSwapTemp), replacement);
    assert.equal(fs.lstatSync(displacedTemp).isFile(), true);
    assert.equal(fs.existsSync(fstatSwapTarget), false);
    fs.unlinkSync(fstatSwapTemp);
    fs.unlinkSync(displacedTemp);
    replacement.fill(0);

    assert.throws(() => atomicWritePrivateFile(path.join(parent, "wrong-mode"), bytes, 0o644, { anchor: root }), /PRIVATE_WRITE_MODE_INVALID/u);
  } finally {
    bytes.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("private publication durable hooks observe temp, pair, and final in order and hook faults clean only writer-owned identities", () => {
  const root = privateRoot();
  const parent = path.join(root, "owned");
  fs.mkdirSync(parent, { mode: 0o700 });
  const bytes = Buffer.from("synthetic-durable-publication\n", "utf8");
  const expectedSha256 = sha256(bytes);
  type DurableObservation = Readonly<{ sha256: string; identity: Readonly<Record<string, string | number>> }>;
  const assertObservation = (observation: DurableObservation, expectedLinkCount: number) => {
    assert.equal(Object.isFrozen(observation), true);
    assert.equal(Object.isFrozen(observation.identity), true);
    assert.equal(observation.sha256, expectedSha256);
    assert.equal(observation.identity.nlink, expectedLinkCount);
  };
  try {
    const target = path.join(parent, "durable.json");
    const temporary = privateWriteTemporaryPath(target);
    const observations: Array<{ phase: string; observation: DurableObservation }> = [];
    const publication = atomicWritePrivateFile(target, bytes, 0o600, {
      anchor: root,
      onTemporaryDurable(observation: DurableObservation) {
        assertObservation(observation, 1);
        assert.equal(fs.existsSync(target), false);
        assert.equal(fs.lstatSync(temporary).nlink, 1);
        observations.push({ phase: "temporary", observation });
      },
      onLinkDurable(observation: DurableObservation) {
        assertObservation(observation, 2);
        const temporaryIdentity = fs.lstatSync(temporary);
        const finalIdentity = fs.lstatSync(target);
        assert.equal(temporaryIdentity.dev, finalIdentity.dev);
        assert.equal(temporaryIdentity.ino, finalIdentity.ino);
        assert.equal(temporaryIdentity.nlink, 2);
        assert.equal(finalIdentity.nlink, 2);
        observations.push({ phase: "link", observation });
      },
      onPublishedDurable(observation: DurableObservation) {
        assertObservation(observation, 1);
        assert.equal(fs.existsSync(temporary), false);
        assert.equal(fs.lstatSync(target).nlink, 1);
        observations.push({ phase: "published", observation });
      },
    });
    assert.deepEqual(observations.map(({ phase }) => phase), ["temporary", "link", "published"]);
    const firstObservation = observations[0]!;
    assert.ok(observations.every(({ observation }) => observation.identity.device === firstObservation.observation.identity.device && observation.identity.inode === firstObservation.observation.identity.inode));
    assert.deepEqual(publication, observations.at(-1)?.observation);

    const collisionTarget = path.join(parent, "temporary-hook-collision.json");
    const collisionTemporary = privateWriteTemporaryPath(collisionTarget);
    const intruder = Buffer.from("same-uid-hook-collision\n", "utf8");
    try {
      assert.throws(
        () => atomicWritePrivateFile(collisionTarget, bytes, 0o600, {
          anchor: root,
          onTemporaryDurable() {
            fs.writeFileSync(collisionTarget, intruder, { flag: "wx", mode: 0o600 });
            throw new Error("injected temporary durable hook fault");
          },
        }),
        /injected temporary durable hook fault/u,
      );
      assert.deepEqual(fs.readFileSync(collisionTarget), intruder);
      assert.equal(fs.existsSync(collisionTemporary), false);
    } finally { intruder.fill(0); fs.unlinkSync(collisionTarget); }

    for (const phase of ["link", "published"] as const) {
      const faultTarget = path.join(parent, `${phase}-hook-fault.json`);
      const hook = () => { throw new Error(`injected ${phase} durable hook fault`); };
      assert.throws(
        () => atomicWritePrivateFile(faultTarget, bytes, 0o600, {
          anchor: root,
          ...(phase === "link" ? { onLinkDurable: hook } : { onPublishedDurable: hook }),
        }),
        new RegExp(`injected ${phase} durable hook fault`, "u"),
      );
      assert.equal(fs.existsSync(faultTarget), false);
      assert.equal(fs.existsSync(privateWriteTemporaryPath(faultTarget)), false);
    }
  } finally {
    bytes.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a synthetic private input envelope is consumed and durably removed without touching the fixed Host input", () => {
  const root = privateRoot();
  try {
    const inputPath = path.join(root, "synthetic-input.json");
    const value = { schemaVersion: "r4_gate_b_host_binding_input.v1", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" };
    fs.writeFileSync(inputPath, `${canonicalJson(value)}\n`, { mode: 0o600 });
    assert.equal(canonicalJson(readAndConsumeHostBindingInput(inputPath)), canonicalJson(value));
    assert.equal(fs.existsSync(inputPath), false);
    assert.deepEqual(createProcessHostInspector({ root }).snapshot(), { dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("v2 synthetic input reuses the one-read zeroize and durable cleanup core without v1 fallback", () => {
  const root = privateRoot();
  const inputPath = path.join(root, "synthetic-reattempt-input.json");
  const value = { schemaVersion: "r4_gate_b_host_binding_reattempt_input.v2", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" };
  const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
  let inputObservation: Readonly<{ accessed: boolean; openCalls: number; removedOrAbsent: boolean }> | null = null;
  try {
    assert.equal(canonicalJson(validateHostBindingReattemptInputBytes(bytes)), canonicalJson(value));
    assert.throws(() => validateHostBindingInputBytes(bytes), /HOST_BINDING_INPUT_VERSION/u);
    fs.writeFileSync(inputPath, bytes, { mode: 0o600 });
    assert.equal(canonicalJson(readAndConsumeHostBindingReattemptInput(inputPath, { onInputObservation(observation: Readonly<{ accessed: boolean; openCalls: 0 | 1; removedOrAbsent: boolean }>) { inputObservation = observation; } })), canonicalJson(value));
    assert.deepEqual(inputObservation, { accessed: true, openCalls: 1, removedOrAbsent: true });
    assert.equal(Object.isFrozen(inputObservation), true);
    assert.equal(fs.existsSync(inputPath), false);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    bytes.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2 input observations distinguish pre-access, post-open and cleanup fault states without a second read", () => {
  const root = privateRoot();
  const value = { schemaVersion: "r4_gate_b_host_binding_reattempt_input.v2", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" };
  const frame = `${canonicalJson(value)}\n`;
  const assertObservation = (error: any, expected: Readonly<{ accessed: boolean; openCalls: number; removedOrAbsent: boolean }>) => {
    assert.deepEqual(error.inputObservation, expected);
    assert.equal(Object.isFrozen(error.inputObservation), true);
    return true;
  };
  try {
    assert.throws(
      () => readAndConsumeHostBindingReattemptInput("relative-input.json"),
      (error: any) => error.code === "HOST_BINDING_INCOMPLETE_YELLOW" && assertObservation(error, { accessed: false, openCalls: 0, removedOrAbsent: false }),
    );

    const malformed = path.join(root, "malformed-v2.json");
    fs.writeFileSync(malformed, "{}\n", { mode: 0o600 });
    assert.throws(
      () => readAndConsumeHostBindingReattemptInput(malformed),
      (error: any) => error.code === "HOST_BINDING_INCOMPLETE_YELLOW" && assertObservation(error, { accessed: true, openCalls: 1, removedOrAbsent: true }),
    );
    assert.equal(fs.existsSync(malformed), false);

    const readFault = path.join(root, "read-fault-v2.json");
    fs.writeFileSync(readFault, frame, { mode: 0o600 });
    const originalRead = fs.readSync;
    let readInjected = false;
    fs.readSync = ((...args: Parameters<typeof fs.readSync>) => {
      if (!readInjected) { readInjected = true; throw Object.assign(new Error("injected read failure"), { code: "EIO" }); }
      return originalRead(...args);
    }) as typeof fs.readSync;
    try {
      assert.throws(
        () => readAndConsumeHostBindingReattemptInput(readFault),
        (error: any) => error.code === "EIO" && assertObservation(error, { accessed: true, openCalls: 1, removedOrAbsent: true }),
      );
    } finally { fs.readSync = originalRead; }
    assert.equal(fs.existsSync(readFault), false);

    const closeFault = path.join(root, "close-fault-v2.json");
    fs.writeFileSync(closeFault, frame, { mode: 0o600 });
    const originalClose = fs.closeSync;
    let closeInjected = false;
    fs.closeSync = ((descriptor: number) => {
      if (!closeInjected) { closeInjected = true; throw Object.assign(new Error("injected close failure"), { code: "EIO" }); }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try {
      assert.throws(
        () => readAndConsumeHostBindingReattemptInput(closeFault),
        (error: any) => error.code === "HOST_BINDING_INPUT_CLOSE_FAILED" && error.verdict === "RED" && assertObservation(error, { accessed: true, openCalls: 1, removedOrAbsent: true }),
      );
    } finally { fs.closeSync = originalClose; }
    assert.equal(fs.existsSync(closeFault), false);

    const unlinkFault = path.join(root, "unlink-fault-v2.json");
    fs.writeFileSync(unlinkFault, frame, { mode: 0o600 });
    const originalUnlink = fs.unlinkSync;
    fs.unlinkSync = ((target: fs.PathLike) => {
      if (target === unlinkFault) throw Object.assign(new Error("injected unlink failure"), { code: "EPERM" });
      return originalUnlink(target);
    }) as typeof fs.unlinkSync;
    try {
      assert.throws(
        () => readAndConsumeHostBindingReattemptInput(unlinkFault),
        (error: any) => error.code === "HOST_BINDING_INPUT_UNLINK_FAILED" && error.verdict === "RED" && assertObservation(error, { accessed: true, openCalls: 1, removedOrAbsent: false }),
      );
    } finally { fs.unlinkSync = originalUnlink; }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("custom Host input reader closes missing and safely classified invalid inputs without native ENOENT leakage", () => {
  const root = privateRoot();
  const closedIncomplete = (error: any) => {
    assert.equal(error.name, "HostBindingError");
    assert.equal(error.code, "HOST_BINDING_INCOMPLETE_YELLOW");
    assert.equal(error.verdict, "YELLOW_NO_RETRY");
    assert.equal(error.message, "HOST_BINDING_INCOMPLETE_YELLOW");
    assert.equal("errno" in error, false);
    assert.equal("path" in error, false);
    assert.equal("syscall" in error, false);
    return true;
  };
  try {
    const missing = path.join(root, "missing.json");
    assert.throws(() => readAndConsumeHostBindingInput(missing), closedIncomplete);
    assert.equal(fs.existsSync(missing), false);

    const malformed = path.join(root, "malformed.json");
    fs.writeFileSync(malformed, "{}\n", { mode: 0o600 });
    assert.throws(() => readAndConsumeHostBindingInput(malformed), closedIncomplete);
    assert.equal(fs.existsSync(malformed), false);

    const unsafeMode = path.join(root, "unsafe-mode.json");
    fs.writeFileSync(unsafeMode, "{}\n", { mode: 0o644 });
    assert.throws(() => readAndConsumeHostBindingInput(unsafeMode), closedIncomplete);
    assert.equal(fs.existsSync(unsafeMode), false);

    const cleanupFailure = path.join(root, "cleanup-failure.json");
    fs.writeFileSync(cleanupFailure, "{}\n", { mode: 0o600 });
    const originalUnlink = fs.unlinkSync;
    fs.unlinkSync = ((target: fs.PathLike) => {
      if (target === cleanupFailure) throw Object.assign(new Error("injected cleanup failure"), { code: "EPERM" });
      return originalUnlink(target);
    }) as typeof fs.unlinkSync;
    try {
      assert.throws(() => readAndConsumeHostBindingInput(cleanupFailure), (error: any) => error.code === "HOST_BINDING_INPUT_UNLINK_FAILED" && error.verdict === "RED" && error.message === "HOST_BINDING_INPUT_UNLINK_FAILED");
    } finally { fs.unlinkSync = originalUnlink; }

    const closeFailure = path.join(root, "close-failure.json");
    fs.writeFileSync(closeFailure, `${canonicalJson({ schemaVersion: "r4_gate_b_host_binding_input.v1", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" })}\n`, { mode: 0o600 });
    const originalClose = fs.closeSync;
    let injectedClose = false;
    fs.closeSync = ((descriptor: number) => {
      if (!injectedClose) { injectedClose = true; throw Object.assign(new Error("injected close failure"), { code: "EIO" }); }
      return originalClose(descriptor);
    }) as typeof fs.closeSync;
    try { assert.throws(() => readAndConsumeHostBindingInput(closeFailure), (error: any) => error.code === "HOST_BINDING_INPUT_CLOSE_FAILED" && error.verdict === "RED"); }
    finally { fs.closeSync = originalClose; }
    assert.equal(fs.existsSync(closeFailure), false);

    const cleanupOnly = path.join(root, "cleanup-only.json");
    fs.writeFileSync(cleanupOnly, "not-json-and-must-not-be-read", { mode: 0o600 });
    const originalRead = fs.readSync;
    let bodyReads = 0;
    fs.readSync = ((...args: Parameters<typeof fs.readSync>) => { bodyReads += 1; return originalRead(...args); }) as typeof fs.readSync;
    try { assert.equal(removeHostBindingInputEnvelope(cleanupOnly), true); }
    finally { fs.readSync = originalRead; }
    assert.equal(bodyReads, 0);
    assert.equal(fs.existsSync(cleanupOnly), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Host Binding library rejects direct execution before any host input read", () => {
  const result = spawnSync(process.execPath, ["scripts/r4-gate-b-host-binding.mjs"], { cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8", env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } });
  assert.equal(result.status, 64);
  assert.equal(result.stderr, "HOST_BINDING_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  assert.equal(result.stdout, "");
});
