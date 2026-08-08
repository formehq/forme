import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { buildMacOSPhysicalPlan, macosSyntheticFrame, macosSyntheticFrameBytes, MACOS_PLAN_ORDER, runFakePlan, validateMacOSHelperTerminal, validateMacOSSyntheticFeederCompletion } from "../../scripts/r4-gate-b-physical-port.mjs";
import { validateResponseCandidateV1 } from "../../packages/r4-protocol/src/index.ts";

const root = path.resolve(import.meta.dirname, "../..");
const childEnv = { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", NODE_ENV: "test" } satisfies NodeJS.ProcessEnv;

test("macOS synthetic vector is frozen, canonical and protocol-valid", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "schemas/r4/gate-b-core/macos/transient-candidate-contract.json"), "utf8"));
  const frame = macosSyntheticFrame();
  assert.doesNotThrow(() => validateResponseCandidateV1(frame.candidate));
  assert.equal(macosSyntheticFrameBytes().length, contract.frozenSyntheticVector.frameBytes);
  assert.equal(`sha256:${crypto.createHash("sha256").update(macosSyntheticFrameBytes()).digest("hex")}`, contract.frozenSyntheticVector.frameSha256);
  assert.equal(frame.candidate.candidateHash, contract.frozenSyntheticVector.candidateHash);
});

test("macOS physical plan freezes 15 security, 5 codesign, 10+1+1 and no helper Seatbelt", () => {
  const plan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath }, `sha256:${"a".repeat(64)}`, "b".repeat(32));
  assert.deepEqual(plan.steps.map((entry: { kind: string }) => entry.kind), MACOS_PLAN_ORDER);
  assert.equal(plan.securityCliInvocations, 15);
  assert.equal(plan.codesignCliInvocations, 5);
  assert.equal(plan.opensslCliInvocations, 2);
  assert.equal(plan.customTemporaryKeychainOperations, 12);
  assert.equal(plan.helperSeatbeltApplied, false);
  assert.equal(plan.transientProviderProfileExecutionCount, 0);
  assert.equal(plan.realProviderChildStarts, 0);
});

test("every macOS typed step is cleanup-always under before/after fake faults", async () => {
  const plan = buildMacOSPhysicalPlan({ swiftc: "/synthetic/swiftc", sdkPath: "/synthetic/sdk", codesign: "/usr/bin/codesign", security: "/usr/bin/security", openssl: "/usr/bin/openssl", lsof: "/usr/sbin/lsof", node: process.execPath }, `sha256:${"a".repeat(64)}`, "b".repeat(32));
  for (const faultWindow of ["before", "after"] as const) for (let faultAfter = 1; faultAfter <= plan.steps.length; faultAfter += 1) {
    let cleanups = 0;
    const result = await runFakePlan(plan, { mode: "construction_fake", async execute() {}, async cleanup() { cleanups += 1; return true; } }, { faultAfter, faultWindow });
    assert.equal(result.injectedFault, true);
    assert.equal(result.physicalEffects, 0);
    assert.equal(cleanups, 1);
  }
});

test("fake helper separates receipt-bearing terminals from pre/post-receipt death", () => {
  for (const [mode, expectedExit, terminal, handoff] of [["approve", 0, "approve_exact", 1], ["discard", 0, "discard", 0], ["expired", 0, "authority_expired", 0], ["controlled", 70, "controlled_failure", 0]] as const) {
    const result = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", mode], { cwd: root, encoding: "utf8", env: childEnv });
    assert.equal(result.status, expectedExit);
    assert.equal(result.stderr, "");
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.terminal, terminal);
    assert.equal(receipt.handoffCount, handoff);
    const validated = validateMacOSHelperTerminal({ stdout: Buffer.from(result.stdout), stderr: Buffer.from(result.stderr), exitCode: result.status!, signal: result.signal });
    assert.equal(validated.helperReceiptValidated, true);
  }
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
  }
});

test("synthetic feeder requires exact body-free completion marker and zero exit before EOF release", () => {
  const expectedBytes = macosSyntheticFrameBytes().length;
  {
    const complete = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", "complete"], { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"], env: childEnv });
    assert.equal(complete.status, 0);
    assert.deepEqual(complete.output[3], macosSyntheticFrameBytes());
    assert.equal(complete.output[4]?.toString(), "FRAME_COMPLETE\n");
    assert.equal(validateMacOSSyntheticFeederCompletion({ exitCode: complete.status!, signal: complete.signal, candidateBytesWritten: complete.output[3]!.length, expectedCandidateBytes: expectedBytes, controlBytes: complete.output[4]!, stdoutBytes: complete.output[1]!, stderrBytes: complete.output[2]!, markerObservedBeforeFeederExit: false }).eofReleaseAllowed, true);
    const nonzero = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", "full-nonzero"], { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"], env: childEnv });
    assert.equal(nonzero.status, 72);
    assert.equal(nonzero.output[4]?.length, 0);
    const duplicate = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", "duplicate-marker"], { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"], env: childEnv });
    assert.equal(duplicate.output[4]?.toString(), "FRAME_COMPLETE\nFRAME_COMPLETE\n");
    for (const mode of ["before-byte", "mid-frame", "full-nonzero", "missing-marker", "early-marker", "bad-marker", "duplicate-marker", "candidate-pipe-marker", "stdout-marker", "stderr-marker", "wrong-control-fd"]) {
      const invalid = spawnSync(process.execPath, ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", mode], { cwd: root, stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"], env: childEnv });
      assert.throws(() => validateMacOSSyntheticFeederCompletion({ exitCode: invalid.status ?? -1, signal: invalid.signal, candidateBytesWritten: invalid.output[3]?.length ?? 0, expectedCandidateBytes: expectedBytes, controlBytes: invalid.output[4] ?? Buffer.alloc(0), stdoutBytes: invalid.output[1] ?? Buffer.alloc(0), stderrBytes: invalid.output[2] ?? Buffer.alloc(0), markerObservedBeforeFeederExit: mode === "early-marker" }), /MACOS_FEEDER_/u);
    }
  }
});

test("the production-shaped feeder descriptor writes only into the held helper stdin pipe", async () => {
  const helper = spawn(process.execPath, ["fixtures/r4-gate-b-core/macos/fake-helper-child.mjs", "pipe-reader"], { cwd: root, stdio: ["pipe", "pipe", "pipe"], env: childEnv });
  const helperStdout: Buffer[] = [];
  const helperStderr: Buffer[] = [];
  helper.stdout.on("data", (chunk: Buffer) => helperStdout.push(Buffer.from(chunk)));
  helper.stderr.on("data", (chunk: Buffer) => helperStderr.push(Buffer.from(chunk)));
  const feeder = spawn(process.execPath, ["fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs", "3", "4", "complete"], { cwd: root, stdio: ["ignore", "pipe", "pipe", helper.stdin, "pipe"], env: childEnv });
  const feederStdout: Buffer[] = [];
  const feederStderr: Buffer[] = [];
  const control: Buffer[] = [];
  feeder.stdout!.on("data", (chunk: Buffer) => feederStdout.push(Buffer.from(chunk)));
  feeder.stderr!.on("data", (chunk: Buffer) => feederStderr.push(Buffer.from(chunk)));
  feeder.stdio[4]!.on("data", (chunk: Buffer) => control.push(Buffer.from(chunk)));
  const [feederCode, feederSignal] = await once(feeder, "close") as [number, NodeJS.Signals | null];
  assert.equal(feederCode, 0);
  assert.equal(feederSignal, null);
  assert.equal(Buffer.concat(feederStdout).length, 0);
  assert.equal(Buffer.concat(feederStderr).length, 0);
  assert.equal(Buffer.concat(control).toString("utf8"), "FRAME_COMPLETE\n");
  helper.stdin.end();
  const [helperCode, helperSignal] = await once(helper, "close") as [number, NodeJS.Signals | null];
  assert.equal(helperCode, 0);
  assert.equal(helperSignal, null);
  assert.equal(Buffer.concat(helperStderr).length, 0);
  const observed = JSON.parse(Buffer.concat(helperStdout).toString("utf8"));
  assert.equal(observed.bytes, macosSyntheticFrameBytes().length);
  assert.equal(observed.sha256, `sha256:${crypto.createHash("sha256").update(macosSyntheticFrameBytes()).digest("hex")}`);
  for (const chunks of [helperStdout, helperStderr, feederStdout, feederStderr, control]) for (const chunk of chunks) chunk.fill(0);
});
