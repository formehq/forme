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
  INSPECTOR_LIMITS,
  RUNTIME_DEPENDENCY_PATHS,
  atomicWritePrivateFile,
  assertHostBindingCapsuleAuthority,
  createHostBindingFinalRevalidator,
  createProcessHostInspector,
  finalizeHostBinding,
  inspectConstructionFixtureDirectory,
  inspectConstructionFixtureFile,
  inspectConstructionFixtureSocket,
  observeBoundDirectory,
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
  removeHostBindingInputEnvelope,
  runtimeDependencyLogicalName,
  runtimeDependencyInventory,
  sha256,
  validateDeveloperToolchainRelationship,
  validateHostBindingInputBytes,
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
  const inspector = createProcessHostInspector({ root });
  try {
    await assert.rejects(finalizeHostBinding({
      repositoryRoot: path.resolve(import.meta.dirname, "../.."),
      constructionRoot: root,
      checkpoint,
      ownerInput: { schemaVersion: "r4_gate_b_host_binding_input.v1", dockerCli: "/synthetic/docker", dockerUnixSocket: "/synthetic/docker.sock", codexPackageRoot: "/synthetic/codex" },
      inspector,
    }), /HOST_BINDING_CHECKPOINT_DRIFT/u);
    assert.deepEqual(inspector.snapshot(), { dockerCliStarts: 0, localDockerUnixSocketRequests: 0, macosInspectorStarts: 0, activeProcessGroups: 0, unknownProcessGroups: 0, cleanupState: "observed-absent", quarantineState: "none" });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
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

test("process-port start metadata distinguishes cleaned logical starts from unknown groups", async () => {
  for (const [processGroupState, verdict, expectedActive] of [["observed-absent", "RED", 0], ["unknown", "RED_QUARANTINED", 1]] as const) {
    const root = privateRoot();
    const processPort = {
      async start() {
        throw Object.assign(new Error("closed start terminal"), { code: "BLOCKED_SUPERVISOR_INJECTED_FAULT", verdict, logicalStartObserved: true, processGroupState });
      },
    };
    let sequence = 0;
    const inspector = createProcessHostInspector({ root, processPort, journal: async () => ({ sequence: sequence++ }) });
    try {
      await assert.rejects(inspector.run(inspectorCommand(), []), (error: any) => {
        assert.equal(error.message, "BLOCKED_SUPERVISOR_INJECTED_FAULT");
        assert.equal(error.verdict, verdict);
        assert.deepEqual(error.partialObservation, {
          dockerCliStarts: 1,
          localDockerUnixSocketRequests: 0,
          macosInspectorStarts: 0,
          activeProcessGroups: expectedActive,
          unknownProcessGroups: expectedActive,
          cleanupState: expectedActive === 0 ? "observed-absent" : "unknown",
          quarantineState: expectedActive === 0 ? "none" : "quarantined",
        });
        return true;
      });
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
