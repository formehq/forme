import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { buildCoreMacOSEffectPlan, executeCoreMacOSPlanWithInjectedExecutor, expectedCoreMacOSBuildRecipe, inspectCoreMacOSConstruction, validateCoreBundleInventory, validateCoreHelperReceipt, validateCoreKeychainObservation, validateCoreSigningObservation } from "../../scripts/r4-gate-b-macos-core.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { CORE_AGGREGATE_LANE_ORDER, parseRunnerArguments, runCoreConstructionDryRun } from "../../scripts/r4-gate-b-runner.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { CORE_CLEANUP_ORDER, buildCoreCleanupPlan, executeCoreCleanupPlanWithInjectedExecutor, validateCoreBodyFreeMarker } from "../../scripts/r4-gate-b-cleanup.mjs";
// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { verifyCoreCorrectionImmutableBindings } from "../../scripts/r4-gate-b-preflight.mjs";

test("Core macOS target is separate, fake-only and never upgrades the Full persistent lane", () => {
  const result = inspectCoreMacOSConstruction();
  assert.equal(result.status, "GREEN_FAKE_EXECUTOR_AND_SWIFT_TESTS_ONLY");
  assert.equal(result.swiftSourceCount, 9);
  assert.equal(result.effectPlanStepCount, 9);
  assert.equal(result.realProcesses, 0);
  assert.equal(result.signingCalls, 0);
  assert.equal(result.keychainCalls, 0);
  assert.equal(result.localAuthenticationCalls, 0);
  assert.equal(result.candidateSecureEnclaveOperations, 0);
  assert.equal(result.candidateKeychainOperations, 0);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.networkCalls, 0);
  assert.equal(result.fullPersistentLaneStatusChanged, false);
  assert.equal(result.aggregateVerdict, "YELLOW");
});

test("closed macOS effect plan is exact and rejects production or arbitrary executors", async () => {
  const plan = buildCoreMacOSEffectPlan();
  assert.deepEqual(plan.steps.map((step: { effect: string }) => step.effect), [
    "compile", "assembleBundle", "snapshotKeychainMetadata", "createTemporaryKeychain",
    "createOneSigningIdentity", "signAndVerifyBundle", "launchExactHelper",
    "collectBodyFreeEvidence", "cleanupAndVerifyAbsence",
  ]);
  for (const step of plan.steps) {
    assert.equal(step.shellAllowed, false);
    assert.equal(step.arbitraryInputAllowed, false);
    assert.match(step.absoluteExecutableToken, /^MANIFEST_PINNED_/u);
  }
  let cleanupCount = 0;
  const result = await executeCoreMacOSPlanWithInjectedExecutor({
    mode: "construction_fake",
    async execute() {},
    async checkpoint(value: { bodyFree: boolean }) { assert.equal(value.bodyFree, true); },
    async cleanup() { cleanupCount += 1; },
  });
  assert.equal(result.completed, 9);
  assert.equal(result.realProcesses, 0);
  assert.equal(result.securityFrameworkCalls, 0);
  assert.equal(result.localAuthenticationCalls, 0);
  assert.equal(cleanupCount, 1);
  await assert.rejects(executeCoreMacOSPlanWithInjectedExecutor({ mode: "production", async execute() {} }), /MACOS_CORE_EXECUTOR_DENIED/u);
  await assert.rejects(executeCoreMacOSPlanWithInjectedExecutor({ mode: "construction_fake", async execute() {}, executable: "/bin/sh" }), /MACOS_CORE_EXECUTOR_DENIED/u);
});

test("every before/after fake macOS effect fault still cleans idempotently", async () => {
  for (const faultWindow of ["before", "after"] as const) {
    for (let faultAfter = 0; faultAfter < 9; faultAfter += 1) {
      let cleanupCount = 0;
      await assert.rejects(executeCoreMacOSPlanWithInjectedExecutor({
        mode: "construction_fake",
        async execute() {},
        async cleanup() { cleanupCount += 1; },
      }, { faultAfter, faultWindow }), /MACOS_CORE_INJECTED_FAULT/u);
      assert.equal(cleanupCount, 1);
    }
  }
});

test("bundle recipe separates the three pre-sign payload members from required codesign metadata", () => {
  const recipe = JSON.parse(fs.readFileSync("schemas/r4/gate-b-core/macos/build-recipe.json", "utf8"));
  assert.deepEqual(recipe, expectedCoreMacOSBuildRecipe());
  assert.deepEqual(recipe.acceptedArguments, ["--gate-b-core-transient-probe"]);
  assert.deepEqual(recipe.preSignPayloadMembers, [
    "Contents/Info.plist", "Contents/MacOS/FormeCoreLocal", "Contents/Resources/forme-core-transient-response.sb",
  ]);
  assert.deepEqual(recipe.postSignBundleMembers, [
    "Contents/Info.plist", "Contents/MacOS/FormeCoreLocal", "Contents/Resources/forme-core-transient-response.sb",
    "Contents/_CodeSignature/CodeResources",
  ]);
  assert.deepEqual(recipe.codesignGeneratedMembers, ["Contents/_CodeSignature/CodeResources"]);
  assert.equal(recipe.entitlementDictionaryEntryCount, 0);
  assert.equal(recipe.effectAuthority.retryExecutionGranted, false);
  assert.equal(recipe.effectAuthority.firstProviderCallGranted, false);
  assert.equal(recipe.compiledExecutableSha256, null);
  assert.equal(recipe.preSignPayloadInventorySha256, null);
  assert.equal(recipe.signedBundleInventorySha256, null);
  const entitlements = fs.readFileSync("native/macos/Resources/FormeCoreLocal.entitlements", "utf8");
  assert.match(entitlements, /<dict\/>/u);
  assert.doesNotMatch(entitlements, /com\.apple\.security|keychain-access-groups/u);
});

test("bundle, signing, Keychain and helper-receipt validators fail closed on every important drift", () => {
  const preMembers = [
    ["Contents/Info.plist", "0600"],
    ["Contents/MacOS/FormeCoreLocal", "0500"],
    ["Contents/Resources/forme-core-transient-response.sb", "0600"],
  ].map(([memberPath, mode]) => ({ path: memberPath, type: "file", mode, linkCount: 1, ownerMatches: true }));
  const codeResources = { path: "Contents/_CodeSignature/CodeResources", type: "file", mode: "0600", linkCount: 1, ownerMatches: true };
  assert.equal(validateCoreBundleInventory(preMembers, "pre-sign").memberCount, 3);
  assert.equal(validateCoreBundleInventory([...preMembers, codeResources], "post-sign").memberCount, 4);
  assert.throws(() => validateCoreBundleInventory([...preMembers, { ...codeResources, type: "symlink" }], "post-sign"), /MACOS_CORE_BUNDLE_MEMBER_UNSAFE/u);
  assert.throws(() => validateCoreBundleInventory([...preMembers, codeResources, { ...codeResources, path: "Contents/extra" }], "post-sign"), /MACOS_CORE_BUNDLE_/u);
  assert.throws(() => validateCoreBundleInventory(preMembers.map((entry, index) => index === 0 ? { ...entry, linkCount: 2 } : entry), "pre-sign"), /MACOS_CORE_BUNDLE_MEMBER_UNSAFE/u);

  const hash = (digit: string) => `sha256:${digit.repeat(64)}`;
  const binding = {
    entitlementsSha256: hash("1"), designatedRequirementSha256: hash("2"), executableSha256: hash("3"),
    preSignPayloadInventorySha256: hash("4"), postSignBundleInventorySha256: hash("5"),
  };
  const signing = {
    identityInventoryCount: 1, certificateFingerprintSha256: hash("6"), signatureVerified: true, entitlementsVerified: true,
    ...binding,
  };
  assert.equal(validateCoreSigningObservation(signing, binding).signingBindingValid, true);
  assert.throws(() => validateCoreSigningObservation({ ...signing, identityInventoryCount: 0 }, binding), /MACOS_CORE_SIGNING_OBSERVATION_INVALID/u);
  assert.throws(() => validateCoreSigningObservation({ ...signing, designatedRequirementSha256: hash("7") }, binding), /MACOS_CORE_SIGNING_BINDING_MISMATCH/u);

  const keychain = {
    candidateKeychainOperations: 0, candidateSecureEnclaveOperations: 0, loginKeychainMutations: 0, dataProtectionKeychainMutations: 0,
    defaultKeychainMetadataReads: 2, keychainSearchListMetadataReads: 2, customTemporaryKeychainOperations: 12,
    securityLifecycleSubcommands: 10, identityInventoryReads: 1, signingPrivateKeyUses: 1, allCustomCommandsPinnedToExactPath: true,
    loginFallbackUsed: false, dataProtectionFallbackUsed: false,
  };
  assert.equal(validateCoreKeychainObservation(keychain).customTemporaryKeychainOperations, 12);
  assert.throws(() => validateCoreKeychainObservation({ ...keychain, identityInventoryReads: 0 }), /MACOS_CORE_KEYCHAIN_OBSERVATION_DRIFT/u);
  assert.throws(() => validateCoreKeychainObservation({ ...keychain, loginFallbackUsed: true }), /MACOS_CORE_KEYCHAIN_OBSERVATION_DRIFT/u);

  const receipt = {
    schemaVersion: "r4.gate-b-core.macos-helper-receipt.v1", terminal: "approve_exact", reasonCode: "approve_exact",
    handoffCount: 1, presenceCeremonies: 1, candidateBodyFilesCreated: 0, candidateBodyStdoutBytes: 0,
    candidateBodyStderrBytes: 0, bodyBearingHandoffOutsideHelper: 0, providerCalls: 0, networkCalls: 0,
    controlledZeroizationPassed: true, crashZeroizationClaimed: false, persistentCandidateRecoverySupported: false,
    cleanupPassed: true, fullPersistentLaneStatusChanged: false, aggregateVerdict: "YELLOW",
  };
  assert.equal(validateCoreHelperReceipt(receipt).terminal, "approve_exact");
  assert.throws(() => validateCoreHelperReceipt({ ...receipt, candidateBodyStdoutBytes: 1 }), /MACOS_CORE_HELPER_RECEIPT_BODY_LEAK/u);
  assert.throws(() => validateCoreHelperReceipt({ ...receipt, schemaVersion: "unknown.v1" }), /MACOS_CORE_HELPER_RECEIPT_INVALID/u);
  assert.throws(() => validateCoreHelperReceipt({ ...receipt, terminal: "discard", reasonCode: "discard", handoffCount: 1 }), /MACOS_CORE_HELPER_RECEIPT_INVALID/u);
});

test("frozen TypeScript canonical candidate matches the Swift Unicode parity vector", () => {
  const responseText = "Line one\n中文 café\t\\quoted\\";
  const candidate = {
    admittedAt: "2026-08-07T12:00:00.000Z",
    candidateId: "candidate_cccccccccccccccccccccccccccccccc",
    expiresAt: "2026-08-08T12:00:00.000Z",
    interactionId: "interaction_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
    originState: "published_fresh",
    policyHash: `sha256:${"f".repeat(64)}`,
    projectionId: "proj_pppppppppppppppppppppppppppppppp",
    responseText,
    roomId: "room_rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    schemaVersion: "response_candidate.v1",
    sessionEnvelopeId: "session_ssssssssssssssssssssssssssssssss",
    sessionReceiptHash: `sha256:${"e".repeat(64)}`,
    snapshotManifestHash: `sha256:${"d".repeat(64)}`,
    sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
    twinBasisHash: `sha256:${"b".repeat(64)}`,
  };
  const hash = (value: string) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
  const candidateHash = hash(canonicalJson(candidate));
  assert.equal(candidateHash, "sha256:d750a6493e142fa3bc93ed9487d182e5c6e68070ba9cabc0bf6455d02b55fad8");
  const frame = canonicalJson({
    candidate: { ...candidate, candidateHash },
    reservationId: "reservation_vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
    schemaVersion: "transient_candidate_frame.v1",
    sessionEnvelopeHash: `sha256:${"1".repeat(64)}`,
    startAuthorizationHash: `sha256:${"a".repeat(64)}`,
  });
  assert.equal(hash(frame), "sha256:ad030d5f1c9bfcfd827c038cc097649a97494463c7c44abf532212b354a51add");
});

test("Core source cannot reach legacy Full launcher, candidate Keychain, provider or network code", () => {
  const root = "native/macos/Sources/FormeCoreLocal";
  const source = fs.readdirSync(root).sort().map((name) => fs.readFileSync(`${root}/${name}`, "utf8")).join("\n");
  assert.doesNotMatch(source, /import Security|SecItemAdd|SecKeyCreate|SecKeychain|KeychainProtector|GateBProbe\.runLive|URLSession|NWConnection|NWListener/u);
  assert.match(source, /candidateKeychainOperations = 0/u);
  assert.match(source, /candidateSecureEnclaveOperations = 0/u);
  assert.match(source, /bodyBearingHandoffOutsideHelper = 0/u);
  assert.match(source, /persistentCandidateRecoverySupported = false/u);
  assert.match(source, /crashZeroizationClaimed = false/u);
});

test("Core aggregate construction stays Yellow, serial, zero-effect and cleanup-always", async () => {
  const result = await runCoreConstructionDryRun();
  assert.equal(result.status, "CORE_REPOSITORY_REVIEWABLE_YELLOW");
  assert.equal(result.verdict, "YELLOW");
  assert.deepEqual(result.blockers, [
    "postgres_race_worker_call_bytes_and_persistent_verifiers",
    "host_binding_and_core_physical_runner",
    "macos_signed_helper_physical_executor",
  ]);
  assert.equal(result.laneCount, CORE_AGGREGATE_LANE_ORDER.length);
  assert.equal(result.injectedFaultCaseCount, 16);
  assert.equal(result.cleanupAlwaysRan, true);
  assert.equal(result.aiLaneEnabled, false);
  assert.equal(result.retryExecutionGranted, false);
  assert.equal(result.firstProviderCallGranted, false);
  for (const key of ["realCodexCalls", "sandboxExecCalls", "dockerCommands", "postgresProcesses", "signingCalls", "keychainOperations", "localAuthenticationCalls", "secureEnclaveOperations", "providerCalls", "networkCalls"] as const) assert.equal(result[key], 0, key);
  assert.deepEqual(parseRunnerArguments(["dry-run-core"]), { mode: "dry-run-core" });
});

test("Core preflight binds the exact approved Packet, Owner Review and proposal lineage", () => {
  const binding = verifyCoreCorrectionImmutableBindings();
  assert.equal(binding.packetSha256, "sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6");
  assert.equal(binding.ownerReviewSha256, "sha256:2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299");
  assert.equal(binding.approvedProposalHead, "5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e");
  assert.equal(binding.approvedProposalTree, "15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f");
});

test("Core marker is body-free and its exact nine-step cleanup is idempotent under every fault", async () => {
  const marker = {
    schemaVersion: "r4.gate-b-core.run-marker.v1",
    runID: "r4gbcore-0123456789abcdef",
    executionManifestSha256: `sha256:${"1".repeat(64)}`,
    phase: "cleanup_required",
    cleanupState: "required",
    dockerContainerOwned: true,
    dockerVolumeOwned: true,
    processGroupIDs: [4242, 4243],
    helperOwned: true,
    customKeychainOwned: true,
    syntheticRoomBindingOwned: true,
    terminalCode: "SYNTHETIC_FAULT",
  };
  assert.deepEqual(validateCoreBodyFreeMarker(marker), marker);
  assert.deepEqual(buildCoreCleanupPlan(marker).order, CORE_CLEANUP_ORDER);
  for (let faultAfter = 0; faultAfter < CORE_CLEANUP_ORDER.length; faultAfter += 1) {
    const observed: string[] = [];
    const result = await executeCoreCleanupPlanWithInjectedExecutor(marker, {
      mode: "construction_fake",
      async execute(step: { kind: string; bodyFree: boolean }) { assert.equal(step.bodyFree, true); observed.push(step.kind); },
    }, { faultAfter });
    assert.equal(result.cleanupPassed, true);
    assert.equal(result.realEffects, 0);
    assert.deepEqual(observed.slice(-CORE_CLEANUP_ORDER.length), CORE_CLEANUP_ORDER);
  }
  assert.throws(() => validateCoreBodyFreeMarker({ ...marker, candidateHash: `sha256:${"a".repeat(64)}` }), /CORE_CLEANUP_MARKER_INVALID|BODY_BEARING/u);
});
