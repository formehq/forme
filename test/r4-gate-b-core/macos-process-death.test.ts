import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { buildMacOSPhysicalPlan, createJournaledMacOSConstructionEffectExecutor, macosSyntheticFrame, macosSyntheticFrameBytes, MACOS_DIRECT_START_PROTOCOL, MACOS_FAKE_CLEANUP_ORDER, MACOS_JOURNAL_FAULT_WINDOWS, MACOS_PLAN_ORDER, runJournaledMacOSFakePlan, validateMacOSDesignatedRequirementObservation, validateMacOSExactEntitlements, validateMacOSHelperTerminal, validateMacOSIdentityInventory, validateMacOSStrictSignatureObservation, validateMacOSSyntheticFeederCompletion } from "../../scripts/r4-gate-b-physical-port.mjs";
import { validateResponseCandidateV1 } from "../../packages/r4-protocol/src/index.ts";

const root = path.resolve(import.meta.dirname, "../..");
const childEnv = { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } satisfies NodeJS.ProcessEnv;
const feederReleaseFrame = Buffer.from(MACOS_DIRECT_START_PROTOCOL.feeder.releaseFrame, "utf8");
const feederArgv = (mode: string) => ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", "5", "6", mode];
function spawnFeederSync(mode: string, releaseBytes = feederReleaseFrame) {
  const owned = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-feeder-gate-"));
  const releasePath = path.join(owned, "release");
  fs.writeFileSync(releasePath, releaseBytes, { mode: 0o600, flag: "wx" });
  const releaseDescriptor = fs.openSync(releasePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    return spawnSync(process.execPath, feederArgv(mode), { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe", "pipe", releaseDescriptor], env: childEnv });
  } finally {
    fs.closeSync(releaseDescriptor);
    fs.rmSync(owned, { recursive: true, force: true });
  }
}
function feederReadyFrame(processID: number) { return `R4_GATE_B_DIRECT_READY_V1 feeder ${processID}\n`; }
function thrownVerdict(operation: () => unknown) {
  try { operation(); }
  catch (error) { return (error as { verdict?: string | null }).verdict ?? null; }
  assert.fail("expected operation to throw");
}

test("macOS synthetic vector is frozen, canonical and protocol-valid", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/macos/transient-candidate-contract.json"), "utf8"));
  const frame = macosSyntheticFrame();
  assert.doesNotThrow(() => validateResponseCandidateV1(frame.candidate));
  assert.equal(macosSyntheticFrameBytes().length, contract.frozenSyntheticVector.frameBytes);
  assert.equal(`sha256:${crypto.createHash("sha256").update(macosSyntheticFrameBytes()).digest("hex")}`, contract.frozenSyntheticVector.frameSha256);
  assert.equal(frame.candidate.candidateHash, contract.frozenSyntheticVector.candidateHash);
});

test("macOS physical plan freezes 15 security, 5 codesign, 10+1+1 and no helper Seatbelt", () => {
  const plan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath, runtimeSourceRoot: root }, `sha256:${"a".repeat(64)}`, "b".repeat(32));
  assert.deepEqual(plan.steps.map((entry: { kind: string }) => entry.kind), MACOS_PLAN_ORDER);
  assert.equal(plan.securityCliInvocations, 15);
  assert.equal(plan.codesignCliInvocations, 5);
  assert.equal(plan.opensslCliInvocations, 2);
  assert.equal(plan.customTemporaryKeychainOperations, 12);
  const deriveKeyCertificate = plan.steps.find((entry: { kind: string }) => entry.kind === "derive-key-certificate")!;
  assert.deepEqual(deriveKeyCertificate.argv.slice(0, 2), ["req", "-quiet"]);
  assert.equal(deriveKeyCertificate.stderrLimitBytes, 0);
  assert.deepEqual(deriveKeyCertificate.ownedOutputs.map((entry: { mode: number }) => entry.mode), [0o600, 0o644]);
  assert.equal(deriveKeyCertificate.outputModeNormalization, "o-nofollow-fchmod-fsync-identity-stable");
  const derivePKCS12 = plan.steps.find((entry: { kind: string }) => entry.kind === "derive-pkcs12")!;
  assert.deepEqual(derivePKCS12.ownedOutputs.map((entry: { mode: number }) => entry.mode), [0o600]);
  const codesignSign = plan.steps.find((entry: { kind: string }) => entry.kind === "codesign-sign")!;
  assert.deepEqual(codesignSign.ownedOutputs.map((entry: { type: string, mode: number }) => [entry.type, entry.mode]), [["directory", 0o755], ["file", 0o644]]);
  assert.match(codesignSign.argv[codesignSign.argv.indexOf("--requirements") + 1], /^=designated =>/u);
  const codesignTestRequirement = plan.steps.find((entry: { kind: string }) => entry.kind === "codesign-test-requirement")!;
  assert.match(codesignTestRequirement.argv[codesignTestRequirement.argv.indexOf("-R") + 1], /^=designated =>/u);
  assert.equal(plan.syntheticCandidateFrameBytes, 1390);
  assert.equal(plan.syntheticCandidateFrameSha256, "sha256:0576ca281013f55670897488801dcfef98fb00db08a303fcbd8a028f97f2c001");
  assert.equal(plan.absoluteAuthorityDeadlineMilliseconds, Date.parse("2026-08-10T00:00:00.000Z"));
  assert.equal(plan.helperSeatbeltApplied, false);
  assert.equal(plan.transientProviderProfileExecutionCount, 0);
  assert.equal(plan.realProviderChildStarts, 0);
  assert.deepEqual(plan.directStartProtocol, MACOS_DIRECT_START_PROTOCOL);
  assert.equal(plan.directStartProtocol.readyTransport, "inherited-pipe-only-no-durable-pid-slot");
  assert.equal(plan.directStartProtocol.normalPathAuthority, "exact-ready-frame-plus-live-child-process-handle");
  assert.equal(plan.directStartProtocol.crashBeforeStartedJournalVerdict, "RED_QUARANTINED");
  assert.equal(plan.directStartProtocol.persistedProcessIdSignalAuthority, false);
  const helperSpawn = plan.steps.find((entry: { kind: string }) => entry.kind === "helper-spawn")!;
  assert.equal(helperSpawn.startProtocol, "self-blocked-direct-helper");
  assert.deepEqual(helperSpawn.descriptorMap, { candidateInput: 0, receiptOutput: 1, diagnosticOutput: 2, readyOutput: 3, releaseInput: 4 });
  assert.equal(helperSpawn.targetStdioCount, 5);
  assert.equal(helperSpawn.releaseFrame, "R4_GATE_B_DIRECT_RELEASE_V1 helper\n");
  const feederSpawn = plan.steps.find((entry: { kind: string }) => entry.kind === "feeder-spawn")!;
  assert.equal(feederSpawn.startProtocol, "self-blocked-direct-feeder");
  assert.deepEqual(feederSpawn.argv.slice(-5), ["3", "4", "5", "6", "complete"]);
  assert.deepEqual(feederSpawn.descriptorMap, { candidateOutput: 3, completionOutput: 4, readyOutput: 5, releaseInput: 6 });
  assert.equal(feederSpawn.targetStdioCount, 7);
  assert.equal(feederSpawn.releaseFrame, "R4_GATE_B_DIRECT_RELEASE_V1 feeder\n");
  assert.equal(thrownVerdict(() => buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath, runtimeSourceRoot: "/private/tmp/forme-missing-runtime-root" }, `sha256:${"a".repeat(64)}`, "b".repeat(32))), "RED");
});

test("macOS physical plan consumes only an exact hash-pinned staged runtime root", () => {
  const owned = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-macos-runtime-snapshot-"));
  const recipePath = "schemas/r4/gate-b-core/macos/build-recipe.json";
  const recipe = JSON.parse(fs.readFileSync(path.join(root, recipePath), "utf8"));
  const stage = (relativePath: string) => {
    const destination = path.join(owned, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.writeFileSync(destination, fs.readFileSync(path.join(root, relativePath)), { mode: 0o600, flag: "wx" });
  };
  try {
    for (const relativePath of [...Object.keys(recipe.inputHashes), recipePath]) stage(relativePath);
    const binding = { swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath, runtimeSourceRoot: fs.realpathSync(owned) };
    const readPinned = (relativePath: string) => {
      const target = path.join(binding.runtimeSourceRoot, relativePath);
      const before = fs.lstatSync(target);
      const descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      try {
        const bytes = fs.readFileSync(descriptor);
        const afterDescriptor = fs.fstatSync(descriptor);
        const afterPath = fs.lstatSync(target);
        assert.equal(afterDescriptor.dev, before.dev); assert.equal(afterDescriptor.ino, before.ino);
        assert.equal(afterPath.dev, before.dev); assert.equal(afterPath.ino, before.ino);
        return bytes;
      } finally { fs.closeSync(descriptor); }
    };
    const plan = buildMacOSPhysicalPlan(binding, `sha256:${"a".repeat(64)}`, "b".repeat(32), readPinned);
    assert.equal(plan.runtimeInputReadMode, "injected-o-nofollow-identity-hash-pinned");
    const readerFailure = new Error("synthetic-pinned-reader-red");
    assert.throws(() => buildMacOSPhysicalPlan(binding, `sha256:${"a".repeat(64)}`, "b".repeat(32), () => { throw readerFailure; }), (error) => error === readerFailure);
    const compile = plan.steps.find((entry: { kind: string }) => entry.kind === "compile")!;
    const feeder = plan.steps.find((entry: { kind: string }) => entry.kind === "feeder-spawn")!;
    assert.equal(compile.argv.filter((entry: string) => entry.endsWith(".swift")).every((entry: string) => entry.startsWith(`${binding.runtimeSourceRoot}${path.sep}`)), true);
    assert.equal(feeder.argv[0], path.join(binding.runtimeSourceRoot, "fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs"));
    assert.equal(plan.steps.some((entry: { argv: string[] }) => entry.argv.some((argument: string) => argument.startsWith(`${root}${path.sep}`))), false);

    const source = path.join(owned, "native/macos/Sources/FormeCoreLocal/CoreLauncher.swift");
    fs.appendFileSync(source, "\n");
    assert.throws(() => buildMacOSPhysicalPlan(binding, `sha256:${"a".repeat(64)}`, "b".repeat(32), readPinned), /MACOS_RECIPE_INPUT_HASH_DRIFT/u);
    assert.equal(thrownVerdict(() => buildMacOSPhysicalPlan(binding, `sha256:${"a".repeat(64)}`, "b".repeat(32), readPinned)), "RED");
  } finally { fs.rmSync(owned, { recursive: true, force: true }); }
});

test("every macOS typed step is cleanup-always on all three journal/effect fault windows", async () => {
  const plan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath, runtimeSourceRoot: root }, `sha256:${"a".repeat(64)}`, "b".repeat(32));
  for (const faultWindow of MACOS_JOURNAL_FAULT_WINDOWS) for (let faultStep = 1; faultStep <= plan.steps.length; faultStep += 1) {
    const executor = createJournaledMacOSConstructionEffectExecutor();
    const result = await runJournaledMacOSFakePlan(plan, executor, { faultStep, faultWindow });
    assert.equal(result.injectedFault, true);
    assert.equal(result.physicalEffects, 0);
    assert.equal(executor.cleanupCalls, 1);
    assert.equal(executor.residueCount, 0);
    const kind = plan.steps[faultStep - 1]!.kind;
    assert.equal(result.journalBeforeCleanup.includes(`intent:${kind}`), true);
    assert.equal(result.journalBeforeCleanup.includes(`effect:${kind}`), faultWindow !== "after-intent-before-effect");
    assert.equal(result.journalBeforeCleanup.includes(`observed:${kind}`), faultWindow === "after-observation");
    assert.deepEqual(executor.journal.filter((entry: string) => entry.startsWith("cleanup:removed:") || entry.startsWith("cleanup:absent:")).map((entry: string) => entry.slice(entry.lastIndexOf(":") + 1)), MACOS_FAKE_CLEANUP_ORDER);
    assert.equal(await executor.cleanup(), true);
    assert.equal(executor.cleanupCalls, 2);
  }
});

test("journal-only macOS restart cleanup conservatively reconstructs unobserved Keychain effects and is idempotent", async () => {
  const plan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath, runtimeSourceRoot: root }, `sha256:${"a".repeat(64)}`, "b".repeat(32));
  const original = createJournaledMacOSConstructionEffectExecutor();
  for (const kind of ["custom-keychain-create", "custom-keychain-import"] as const) {
    const step = plan.steps.find((entry: { kind: string }) => entry.kind === kind)!;
    await original.writeIntent(step);
    await original.applyEffect(step);
    if (kind === "custom-keychain-create") await original.writeObservation(step);
  }
  const recovered = createJournaledMacOSConstructionEffectExecutor(original.journal);
  assert.deepEqual(recovered.residues, ["macos-custom-keychain", "macos-signing-identity"]);
  assert.equal(await recovered.cleanup(), true);
  assert.equal(recovered.residueCount, 0);
  assert.equal(await recovered.cleanup(), true);
  assert.equal(recovered.cleanupCalls, 2);
});

test("macOS identity, strict signature, empty entitlements and DR observations require exact bytes", () => {
  const appPath = "/private/tmp/forme-test/FormeCoreLocal.app";
  const selector = "A".repeat(40);
  const identifier = "org.chaostudio.forme.gate-b.core-local";
  const requirement = `designated => identifier "${identifier}" and certificate leaf = H"${selector}"`;
  const empty = fs.readFileSync(path.join(root, "native/macos/Resources/FormeCoreLocal.entitlements"));
  assert.equal(validateMacOSExactEntitlements({ observedBytes: Buffer.from(empty), expectedBytes: empty }).entitlementsExactEmpty, true);
  assert.throws(() => validateMacOSExactEntitlements({ observedBytes: Buffer.concat([empty, Buffer.from("\n")]), expectedBytes: empty }), /MACOS_CODESIGN_ENTITLEMENTS_NOT_EXACT/u);
  assert.equal(thrownVerdict(() => validateMacOSExactEntitlements({ observedBytes: Buffer.concat([empty, Buffer.from("\n")]), expectedBytes: empty })), "RED");

  const strict = Buffer.from(`${appPath}: valid on disk\n${appPath}: satisfies its Designated Requirement\n`);
  assert.equal(validateMacOSStrictSignatureObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: strict, appPath }).signatureStrictValidated, true);
  assert.throws(() => validateMacOSStrictSignatureObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.concat([strict, Buffer.from("extra\n")]), appPath }), /MACOS_CODESIGN_STRICT_OBSERVATION_INVALID/u);
  assert.equal(thrownVerdict(() => validateMacOSStrictSignatureObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.concat([strict, Buffer.from("extra\n")]), appPath })), "RED");

  const dr = Buffer.from(`Executable=${appPath}/Contents/MacOS/FormeCoreLocal\nIdentifier=${identifier}\nCodeDirectory v=20500 size=512 flags=0x10000(runtime) hashes=8+2 location=embedded\n${requirement}\n`);
  const validated = validateMacOSDesignatedRequirementObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: dr, expectedRequirement: requirement, expectedIdentifier: identifier });
  assert.equal(validated.designatedRequirementExact, true);
  assert.equal(validated.designatedRequirementSha256, `sha256:${crypto.createHash("sha256").update(requirement).digest("hex")}`);
  assert.throws(() => validateMacOSDesignatedRequirementObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.from(`${dr.toString("utf8")}designated => anchor apple\n`), expectedRequirement: requirement, expectedIdentifier: identifier }), /MACOS_CODESIGN_REQUIREMENT_DRIFT/u);
  assert.equal(thrownVerdict(() => validateMacOSDesignatedRequirementObservation({ stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.from(`${dr.toString("utf8")}designated => anchor apple\n`), expectedRequirement: requirement, expectedIdentifier: identifier })), "RED");

  const identity = Buffer.from(`  1) ${selector} "Forme Gate B Synthetic"\n     1 valid identities found\n`);
  assert.equal(validateMacOSIdentityInventory({ stdoutBytes: identity, expectedCertificateSha1: selector }).identityInventoryCount, 1);
  assert.throws(() => validateMacOSIdentityInventory({ stdoutBytes: Buffer.from("     0 valid identities found\n"), expectedCertificateSha1: selector }), /MACOS_IDENTITY_INVENTORY_INVALID/u);
  assert.equal(thrownVerdict(() => validateMacOSIdentityInventory({ stdoutBytes: Buffer.from("     0 valid identities found\n"), expectedCertificateSha1: selector })), "RED");
  assert.throws(() => validateMacOSIdentityInventory({ stdoutBytes: identity, expectedCertificateSha1: "B".repeat(40) }), /MACOS_IDENTITY_INVENTORY_INVALID/u);
  assert.throws(() => validateMacOSIdentityInventory({ stdoutBytes: Buffer.from(`  1) ${selector} "one"\n  2) ${"B".repeat(40)} "two"\n     2 valid identities found\n`), expectedCertificateSha1: selector }), /MACOS_IDENTITY_INVENTORY_INVALID/u);
});

test("fake helper separates receipt-bearing terminals from pre/post-receipt death", () => {
  for (const [mode, expectedExit, terminal, handoff] of [["approve", 0, "approve_exact", 1], ["discard", 0, "discard", 0], ["expired", 0, "authority_expired", 0], ["controlled", 70, "controlled_failure", 0]] as const) {
    const result = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "utf8", env: childEnv });
    assert.equal(result.status, expectedExit);
    assert.equal(result.stderr, "");
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.schemaVersion, "r4.gate-b-core.macos-helper-receipt.v2");
    assert.equal(receipt.terminal, terminal);
    assert.equal(receipt.handoffCount, handoff);
    const validated = validateMacOSHelperTerminal({ stdout: Buffer.from(result.stdout), stderr: Buffer.from(result.stderr), exitCode: result.status!, signal: result.signal });
    assert.equal(validated.helperReceiptValidated, true);
  }
  const drift = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", "candidate-drift"], { cwd: root, encoding: "utf8", env: childEnv });
  assert.equal(drift.status, 70);
  const driftValidated = validateMacOSHelperTerminal({ stdout: Buffer.from(drift.stdout), stderr: Buffer.from(drift.stderr), exitCode: drift.status!, signal: drift.signal });
  assert.equal(driftValidated.terminal, "controlled_failure");
  assert.equal(driftValidated.helperReasonCode, "candidate_binding_drift");
  assert.equal(driftValidated.handoffCount, 0);
  for (const mode of ["dirty-cleanup", "dirty-zeroization"] as const) {
    const dirty = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "buffer", env: childEnv });
    assert.throws(() => validateMacOSHelperTerminal({ stdout: dirty.stdout, stderr: dirty.stderr, exitCode: dirty.status ?? -1, signal: dirty.signal }), /MACOS_HELPER_RECEIPT_SEMANTICS/u);
    assert.equal(thrownVerdict(() => validateMacOSHelperTerminal({ stdout: dirty.stdout, stderr: dirty.stderr, exitCode: dirty.status ?? -1, signal: dirty.signal })), "RED");
  }
  const bodyEffectReceipt = JSON.parse(spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", "approve"], { cwd: root, encoding: "utf8", env: childEnv }).stdout);
  bodyEffectReceipt.candidateBodyFilesCreated = 1;
  const bodyEffectBytes = Buffer.from(`${JSON.stringify(bodyEffectReceipt)}\n`, "utf8");
  assert.equal(thrownVerdict(() => validateMacOSHelperTerminal({ stdout: bodyEffectBytes, stderr: Buffer.alloc(0), exitCode: 0, signal: null })), "RED");
  for (const mode of ["pre-receipt-death", "before-read", "mid-read", "before-la"]) {
    const before = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "buffer", env: childEnv });
    assert.equal(before.status, 64);
    assert.equal(validateMacOSHelperTerminal({ stdout: before.stdout, stderr: before.stderr, exitCode: before.status!, signal: before.signal }).helperReceiptValidated, false);
  }
  for (const mode of ["during-la", "during-review", "post-count-death", "post-receipt-death"]) {
    const death = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "buffer", env: childEnv });
    assert.equal(death.signal, "SIGKILL");
    assert.throws(() => validateMacOSHelperTerminal({ stdout: death.stdout, stderr: death.stderr, exitCode: -1, signal: death.signal }), /MACOS_HELPER_TERMINAL_UNOBSERVED/u);
  }
  for (const mode of ["partial-receipt", "duplicate-receipt", "oversize-receipt", "trailing-receipt", "wrong-exit", "stderr"]) {
    const invalid = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "buffer", env: childEnv });
    assert.throws(() => validateMacOSHelperTerminal({ stdout: invalid.stdout, stderr: invalid.stderr, exitCode: invalid.status ?? -1, signal: invalid.signal }), /MACOS_HELPER_/u);
    assert.equal(thrownVerdict(() => validateMacOSHelperTerminal({ stdout: invalid.stdout, stderr: invalid.stderr, exitCode: invalid.status ?? -1, signal: invalid.signal })), null);
  }
});

test("synthetic feeder requires its exact direct-start release and then exact completion before EOF release", () => {
  const expectedBytes = macosSyntheticFrameBytes().length;
  {
    const complete = spawnFeederSync("complete");
    assert.equal(complete.status, 0);
    assert.deepEqual(complete.output[3], macosSyntheticFrameBytes());
    assert.equal(complete.output[4]?.toString(), `FRAME_COMPLETE ${expectedBytes}\n`);
    assert.equal(complete.output[5]?.toString(), feederReadyFrame(complete.pid));
    assert.equal(validateMacOSSyntheticFeederCompletion({ exitCode: complete.status!, signal: complete.signal, candidateBytesWritten: complete.output[3]!.length, expectedCandidateBytes: expectedBytes, controlBytes: complete.output[4]!, stdoutBytes: complete.output[1]!, stderrBytes: complete.output[2]!, markerObservedBeforeFeederExit: false }).eofReleaseAllowed, true);
    const nonzero = spawnFeederSync("full-nonzero");
    assert.equal(nonzero.status, 72);
    assert.equal(nonzero.output[4]?.length, 0);
    const duplicate = spawnFeederSync("duplicate-marker");
    assert.equal(duplicate.output[4]?.toString(), `FRAME_COMPLETE ${expectedBytes}\nFRAME_COMPLETE ${expectedBytes}\n`);
    for (const mode of ["before-byte", "mid-frame", "full-nonzero", "missing-marker", "early-marker", "bad-marker", "duplicate-marker", "candidate-pipe-marker", "stdout-marker", "stderr-marker", "wrong-control-fd"]) {
      const invalid = spawnFeederSync(mode);
      assert.throws(() => validateMacOSSyntheticFeederCompletion({ exitCode: invalid.status ?? -1, signal: invalid.signal, candidateBytesWritten: invalid.output[3]?.length ?? 0, expectedCandidateBytes: expectedBytes, controlBytes: invalid.output[4] ?? Buffer.alloc(0), stdoutBytes: invalid.output[1] ?? Buffer.alloc(0), stderrBytes: invalid.output[2] ?? Buffer.alloc(0), markerObservedBeforeFeederExit: mode === "early-marker" }), /MACOS_FEEDER_/u);
    }
    for (const malformed of [Buffer.alloc(0), feederReleaseFrame.subarray(0, feederReleaseFrame.length - 1), Buffer.concat([feederReleaseFrame, Buffer.from("x")]), Buffer.from("R4_GATE_B_DIRECT_RELEASE_V1 helper\n")]) {
      const blocked = spawnFeederSync("complete", malformed);
      assert.equal(blocked.status, 65);
      assert.equal(blocked.output[1]?.length, 0);
      assert.equal(blocked.output[2]?.length, 0);
      assert.equal(blocked.output[3]?.length, 0);
      assert.equal(blocked.output[4]?.length, 0);
      assert.equal(blocked.output[5]?.toString(), feederReadyFrame(blocked.pid));
    }
  }
});

test("synthetic feeder emits ready but no candidate or completion byte before parent release", async () => {
  const feeder = spawn(process.execPath, feederArgv("complete"), { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe", "pipe", "pipe"], env: childEnv });
  const feederPipes = feeder.stdio as unknown as Array<NodeJS.ReadWriteStream | null>;
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const candidate: Buffer[] = [];
  const completion: Buffer[] = [];
  const ready: Buffer[] = [];
  feeder.stdout!.on("data", (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
  feeder.stderr!.on("data", (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
  feederPipes[3]!.on("data", (chunk: Buffer) => candidate.push(Buffer.from(chunk)));
  feederPipes[4]!.on("data", (chunk: Buffer) => completion.push(Buffer.from(chunk)));
  feederPipes[5]!.on("data", (chunk: Buffer) => ready.push(Buffer.from(chunk)));
  await once(feederPipes[5]!, "end");
  assert.equal(Buffer.concat(ready).toString("utf8"), feederReadyFrame(feeder.pid!));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(Buffer.concat(candidate).length, 0);
  assert.equal(Buffer.concat(completion).length, 0);
  assert.equal(Buffer.concat(stdout).length, 0);
  assert.equal(Buffer.concat(stderr).length, 0);
  feederPipes[6]!.end(feederReleaseFrame);
  const [code, signal] = await once(feeder, "close") as [number, NodeJS.Signals | null];
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.deepEqual(Buffer.concat(candidate), macosSyntheticFrameBytes());
  assert.equal(Buffer.concat(completion).toString("utf8"), `FRAME_COMPLETE ${macosSyntheticFrameBytes().length}\n`);
  for (const chunks of [stdout, stderr, candidate, completion, ready]) for (const chunk of chunks) chunk.fill(0);
});

test("the production-shaped feeder descriptor writes only into the held helper stdin pipe", async () => {
  const helper = spawn(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", "pipe-reader"], { cwd: root, stdio: ["pipe", "pipe", "pipe"], env: childEnv });
  const helperStdout: Buffer[] = [];
  const helperStderr: Buffer[] = [];
  helper.stdout.on("data", (chunk: Buffer) => helperStdout.push(Buffer.from(chunk)));
  helper.stderr.on("data", (chunk: Buffer) => helperStderr.push(Buffer.from(chunk)));
  const feeder = spawn(process.execPath, feederArgv("complete"), { cwd: root, stdio: ["ignore", "pipe", "pipe", helper.stdin, "pipe", "pipe", "pipe"], env: childEnv });
  const feederPipes = feeder.stdio as unknown as Array<NodeJS.ReadWriteStream | null>;
  const feederStdout: Buffer[] = [];
  const feederStderr: Buffer[] = [];
  const control: Buffer[] = [];
  const ready: Buffer[] = [];
  feeder.stdout!.on("data", (chunk: Buffer) => feederStdout.push(Buffer.from(chunk)));
  feeder.stderr!.on("data", (chunk: Buffer) => feederStderr.push(Buffer.from(chunk)));
  feederPipes[4]!.on("data", (chunk: Buffer) => control.push(Buffer.from(chunk)));
  feederPipes[5]!.on("data", (chunk: Buffer) => ready.push(Buffer.from(chunk)));
  await once(feederPipes[5]!, "end");
  assert.equal(Buffer.concat(ready).toString("utf8"), feederReadyFrame(feeder.pid!));
  feederPipes[6]!.end(feederReleaseFrame);
  const [feederCode, feederSignal] = await once(feeder, "close") as [number, NodeJS.Signals | null];
  assert.equal(feederCode, 0);
  assert.equal(feederSignal, null);
  assert.equal(Buffer.concat(feederStdout).length, 0);
  assert.equal(Buffer.concat(feederStderr).length, 0);
  assert.equal(Buffer.concat(control).toString("utf8"), `FRAME_COMPLETE ${macosSyntheticFrameBytes().length}\n`);
  helper.stdin.end();
  const [helperCode, helperSignal] = await once(helper, "close") as [number, NodeJS.Signals | null];
  assert.equal(helperCode, 0);
  assert.equal(helperSignal, null);
  assert.equal(Buffer.concat(helperStderr).length, 0);
  const observed = JSON.parse(Buffer.concat(helperStdout).toString("utf8"));
  assert.equal(observed.bytes, macosSyntheticFrameBytes().length);
  assert.equal(observed.sha256, `sha256:${crypto.createHash("sha256").update(macosSyntheticFrameBytes()).digest("hex")}`);
  for (const chunks of [helperStdout, helperStderr, feederStdout, feederStderr, control, ready]) for (const chunk of chunks) chunk.fill(0);
});

test("provider-child death is distinct from helper death and only exact full-zero releases completion", () => {
  const owned = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-macos-provider-test-"));
  fs.chmodSync(owned, 0o700);
  const candidate = path.join(owned, "synthetic-frame");
  fs.writeFileSync(candidate, macosSyntheticFrameBytes(), { mode: 0o600, flag: "wx" });
  try {
    for (const mode of ["before-byte", "mid-frame", "full-nonzero", "full-zero"] as const) {
      const result = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-provider-child.mjs", mode, candidate, "4"], { cwd: root, stdio: ["ignore", "pipe", "pipe", "ignore", "pipe"], env: childEnv });
      if (mode === "full-zero") {
        assert.equal(result.status, 0);
        assert.deepEqual(result.output[1], macosSyntheticFrameBytes());
        assert.equal(result.output[4]?.toString("utf8"), `FRAME_COMPLETE ${macosSyntheticFrameBytes().length}\n`);
      } else {
        assert.notEqual(result.status, 0);
        assert.equal(result.output[4]?.length ?? 0, 0);
      }
    }
  } finally { fs.rmSync(owned, { recursive: true, force: true }); }
});
