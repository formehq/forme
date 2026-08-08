import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const sourcePaths = Object.freeze([
  "native/macos/Sources/FormeCoreLocal/CoreLauncher.swift",
  "native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift",
  "native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift",
  "native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift",
  "native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift",
  "native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift",
  "native/macos/Sources/FormeCoreLocal/CoreSandboxProfile.swift",
  "native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift",
  "native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift",
]);
const resourcePaths = Object.freeze([
  "native/macos/Resources/FormeCoreLocal.Info.plist",
  "native/macos/Resources/FormeCoreLocal.entitlements",
  "schemas/r4/gate-b-core/macos/forme-core-transient-response.sb",
]);
const contractPath = "schemas/r4/gate-b-core/macos/transient-candidate-contract.json";
const evidenceSchemaPath = "schemas/r4/gate-b-core/macos/evidence.schema.json";
const recipePath = "schemas/r4/gate-b-core/macos/build-recipe.json";
const preSignPayloadMembers = Object.freeze([
  "Contents/Info.plist",
  "Contents/MacOS/FormeCoreLocal",
  "Contents/Resources/forme-core-transient-response.sb",
]);
const postSignBundleMembers = Object.freeze([...preSignPayloadMembers, "Contents/_CodeSignature/CodeResources"]);

const effectOrder = Object.freeze([
  "compile", "assembleBundle", "snapshotKeychainMetadata", "createTemporaryKeychain",
  "createOneSigningIdentity", "signAndVerifyBundle", "launchExactHelper",
  "collectBodyFreeEvidence", "cleanupAndVerifyAbsence",
]);

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function sha256(value) { return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`; }

function exactRead(relative) {
  if (![...sourcePaths, ...resourcePaths, contractPath, evidenceSchemaPath, recipePath, "native/macos/Package.swift", "native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift"].includes(relative)) fail("MACOS_CORE_PATH_DENIED");
  const target = path.join(repositoryRoot, ...relative.split("/"));
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || fs.realpathSync(target) !== target) fail("MACOS_CORE_PATH_UNSAFE");
  return fs.readFileSync(target);
}

export function expectedCoreMacOSBuildRecipe() {
  const hashes = Object.fromEntries([...sourcePaths, ...resourcePaths, contractPath, evidenceSchemaPath].map((relative) => [relative, sha256(exactRead(relative))]));
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.macos-build-recipe.v1",
    status: "CONSTRUCTED_NOT_EXECUTED",
    minimumOS: "macOS 26.0",
    swiftPackage: "native/macos/Package.swift",
    product: "FormeCoreLocal",
    target: "FormeCoreLocal",
    bundleIdentifier: "org.chaostudio.forme.gate-b.core-local",
    bundleExecutable: "FormeCoreLocal",
    acceptedArguments: ["--gate-b-core-transient-probe"],
    preSignPayloadMembers,
    postSignBundleMembers,
    codesignGeneratedMembers: ["Contents/_CodeSignature/CodeResources"],
    entitlements: "native/macos/Resources/FormeCoreLocal.entitlements",
    entitlementDictionaryEntryCount: 0,
    effectOrder,
    effectAuthority: {
      constructionExecutor: "fake_only",
      correctionConstructionGranted: true,
      retryExecutionGranted: false,
      firstProviderCallGranted: false,
      realProcessEffects: 0,
      securityFrameworkEffects: 0,
      localAuthenticationEffects: 0,
      networkEffects: 0,
      providerCalls: 0,
    },
    signingScope: {
      mechanism: "future_one_run_custom_file_keychain_probe",
      identityCount: 1,
      candidateBytesAllowed: false,
      fallbackToLoginKeychain: false,
      fallbackToDataProtectionKeychain: false,
      metadataReadCounts: { defaultKeychain: 2, keychainSearchList: 2 },
      customTemporaryKeychainOperations: 12,
      customOperationBreakdown: { securityLifecycleSubcommands: 10, identityInventoryReads: 1, signingPrivateKeyUses: 1 },
      certificateFingerprintBinding: "OBSERVE_AFTER_ONE_RUN_CREATION_THEN_VALIDATE_BEFORE_SIGNING",
      physicalAdapterStatus: "PHYSICAL_ADAPTER_CONSTRUCTED_OFFLINE_RETRY_NOT_REQUESTED",
    },
    claims: {
      candidatePersistence: false,
      persistentRecovery: false,
      crashZeroization: false,
      bodyBearingHandoffOutsideHelper: false,
      productionSigning: false,
      notarization: false,
    },
    inputHashes: hashes,
    compiledExecutableSha256: null,
    preSignPayloadInventorySha256: null,
    signedBundleInventorySha256: null,
  });
}

export function buildCoreMacOSEffectPlan() {
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.macos-effect-plan.v1",
    steps: effectOrder.map((effect) => Object.freeze({
      effect,
      absoluteExecutableToken: `MANIFEST_PINNED_${effect}`,
      argumentShapeToken: `EXACT_${effect}`,
      shellAllowed: false,
      arbitraryInputAllowed: false,
    })),
    candidateKeychainOperations: 0,
    candidateSecureEnclaveOperations: 0,
    customTemporaryKeychainOperations: 12,
    providerCalls: 0,
    networkCalls: 0,
  });
}

export async function executeCoreMacOSPlanWithInjectedExecutor(executor, { faultAfter = null, faultWindow = "before" } = {}) {
  if (!executor || executor.mode !== "construction_fake" || typeof executor.execute !== "function" || Object.keys(executor).some((key) => !["mode", "execute", "checkpoint", "cleanup"].includes(key))) fail("MACOS_CORE_EXECUTOR_DENIED");
  if (faultAfter !== null && (!Number.isInteger(faultAfter) || faultAfter < 0)) fail("MACOS_CORE_FAULT_INDEX_INVALID");
  if (!["before", "after"].includes(faultWindow)) fail("MACOS_CORE_FAULT_WINDOW_INVALID");
  const plan = buildCoreMacOSEffectPlan();
  let completed = 0;
  let primary = null;
  try {
    for (let index = 0; index < plan.steps.length; index += 1) {
      if (faultAfter === index && faultWindow === "before") fail("MACOS_CORE_INJECTED_FAULT_BEFORE_EFFECT");
      const step = plan.steps[index];
      await executor.execute(step);
      if (faultAfter === index && faultWindow === "after") fail("MACOS_CORE_INJECTED_FAULT_AFTER_EFFECT_BEFORE_MARKER");
      if (typeof executor.checkpoint === "function") await executor.checkpoint(Object.freeze({ kind: "marker-update", completedEffect: step.effect, bodyFree: true }));
      completed += 1;
    }
  } catch (error) { primary = error; }
  finally { if (typeof executor.cleanup === "function") await executor.cleanup(); }
  if (primary) throw primary;
  return Object.freeze({ completed, realProcesses: 0, securityFrameworkCalls: 0, localAuthenticationCalls: 0, networkCalls: 0, providerCalls: 0, cleanupPassed: true });
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code);
  return value;
}

export function validateCoreBundleInventory(entries, phase) {
  if (!Array.isArray(entries) || !["pre-sign", "post-sign"].includes(phase)) fail("MACOS_CORE_BUNDLE_INVENTORY_INVALID");
  const expected = phase === "pre-sign" ? preSignPayloadMembers : postSignBundleMembers;
  const modes = Object.freeze({
    "Contents/Info.plist": "0600",
    "Contents/MacOS/FormeCoreLocal": "0500",
    "Contents/Resources/forme-core-transient-response.sb": "0600",
    "Contents/_CodeSignature/CodeResources": "0600",
  });
  const normalized = entries.map((entry) => {
    const value = exactKeys(entry, ["path", "type", "mode", "linkCount", "ownerMatches"], "MACOS_CORE_BUNDLE_INVENTORY_INVALID");
    if (typeof value.path !== "string" || value.type !== "file" || value.mode !== modes[value.path] || value.linkCount !== 1 || value.ownerMatches !== true) fail("MACOS_CORE_BUNDLE_MEMBER_UNSAFE");
    return value.path;
  }).sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  const sortedExpected = [...expected].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  if (normalized.length !== sortedExpected.length || normalized.some((value, index) => value !== sortedExpected[index])) fail("MACOS_CORE_BUNDLE_INVENTORY_DRIFT");
  return Object.freeze({ phase, memberCount: normalized.length, inventorySha256: sha256(normalized.map((value) => `${value}\n`).join("")) });
}

export function validateCoreSigningObservation(value, expected) {
  const observation = exactKeys(value, [
    "identityInventoryCount", "certificateFingerprintSha256", "signatureVerified", "entitlementsVerified",
    "entitlementsSha256", "designatedRequirementSha256", "executableSha256", "preSignPayloadInventorySha256", "postSignBundleInventorySha256",
  ], "MACOS_CORE_SIGNING_OBSERVATION_INVALID");
  const binding = exactKeys(expected, ["entitlementsSha256", "designatedRequirementSha256", "executableSha256", "preSignPayloadInventorySha256", "postSignBundleInventorySha256"], "MACOS_CORE_SIGNING_BINDING_INVALID");
  if (observation.identityInventoryCount !== 1 || observation.signatureVerified !== true || observation.entitlementsVerified !== true || !/^sha256:[0-9a-f]{64}$/u.test(observation.certificateFingerprintSha256)) fail("MACOS_CORE_SIGNING_OBSERVATION_INVALID");
  for (const key of Object.keys(binding)) if (observation[key] !== binding[key]) fail("MACOS_CORE_SIGNING_BINDING_MISMATCH");
  return Object.freeze({ identityInventoryCount: 1, certificateFingerprintObservedAfterCreation: true, signingBindingValid: true });
}

export function validateCoreKeychainObservation(value) {
  const observation = exactKeys(value, [
    "candidateKeychainOperations", "candidateSecureEnclaveOperations", "loginKeychainMutations", "dataProtectionKeychainMutations",
    "defaultKeychainMetadataReads", "keychainSearchListMetadataReads", "customTemporaryKeychainOperations",
    "securityLifecycleSubcommands", "identityInventoryReads", "signingPrivateKeyUses", "allCustomCommandsPinnedToExactPath",
    "loginFallbackUsed", "dataProtectionFallbackUsed",
  ], "MACOS_CORE_KEYCHAIN_OBSERVATION_INVALID");
  const expected = {
    candidateKeychainOperations: 0,
    candidateSecureEnclaveOperations: 0,
    loginKeychainMutations: 0,
    dataProtectionKeychainMutations: 0,
    defaultKeychainMetadataReads: 2,
    keychainSearchListMetadataReads: 2,
    customTemporaryKeychainOperations: 12,
    securityLifecycleSubcommands: 10,
    identityInventoryReads: 1,
    signingPrivateKeyUses: 1,
    allCustomCommandsPinnedToExactPath: true,
    loginFallbackUsed: false,
    dataProtectionFallbackUsed: false,
  };
  for (const [key, expectedValue] of Object.entries(expected)) if (observation[key] !== expectedValue) fail("MACOS_CORE_KEYCHAIN_OBSERVATION_DRIFT");
  return Object.freeze({ ...expected });
}

export function validateCoreHelperReceipt(value) {
  const receipt = exactKeys(value, [
    "schemaVersion", "terminal", "reasonCode", "handoffCount", "presenceCeremonies", "candidateBodyFilesCreated",
    "candidateBodyStdoutBytes", "candidateBodyStderrBytes", "bodyBearingHandoffOutsideHelper", "providerCalls", "networkCalls",
    "controlledZeroizationPassed", "crashZeroizationClaimed", "persistentCandidateRecoverySupported", "cleanupPassed",
    "fullPersistentLaneStatusChanged", "aggregateVerdict",
  ], "MACOS_CORE_HELPER_RECEIPT_INVALID");
  const terminals = new Set(["approve_exact", "discard", "authority_expired", "controlled_failure"]);
  if (receipt.schemaVersion !== "r4.gate-b-core.macos-helper-receipt.v1" || !terminals.has(receipt.terminal) || receipt.reasonCode !== receipt.terminal) fail("MACOS_CORE_HELPER_RECEIPT_INVALID");
  for (const key of ["candidateBodyFilesCreated", "candidateBodyStdoutBytes", "candidateBodyStderrBytes", "bodyBearingHandoffOutsideHelper", "providerCalls", "networkCalls"]) if (receipt[key] !== 0) fail("MACOS_CORE_HELPER_RECEIPT_BODY_LEAK");
  if (![0, 1].includes(receipt.handoffCount) || ![0, 1].includes(receipt.presenceCeremonies) || typeof receipt.controlledZeroizationPassed !== "boolean" || typeof receipt.cleanupPassed !== "boolean" || receipt.crashZeroizationClaimed !== false || receipt.persistentCandidateRecoverySupported !== false || receipt.fullPersistentLaneStatusChanged !== false || receipt.aggregateVerdict !== "YELLOW") fail("MACOS_CORE_HELPER_RECEIPT_INVALID");
  if (receipt.terminal === "approve_exact" && (receipt.handoffCount !== 1 || receipt.presenceCeremonies !== 1 || receipt.controlledZeroizationPassed !== true || receipt.cleanupPassed !== true)) fail("MACOS_CORE_HELPER_RECEIPT_INVALID");
  if (receipt.terminal !== "approve_exact" && receipt.handoffCount !== 0) fail("MACOS_CORE_HELPER_RECEIPT_INVALID");
  return Object.freeze({ terminal: receipt.terminal, helperReceiptSha256: sha256(JSON.stringify(receipt)) });
}

function auditSources() {
  const sources = Object.fromEntries(sourcePaths.map((relative) => [relative, exactRead(relative).toString("utf8")]));
  const all = Object.values(sources).join("\n");
  const packageSource = exactRead("native/macos/Package.swift").toString("utf8");
  const tests = exactRead("native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift").toString("utf8");
  for (const token of [".executable(name: \"FormeCoreLocal\"", "name: \"FormeCoreLocalTests\"", "path: \"Sources/FormeCoreLocal\""]) if (!packageSource.includes(token)) fail("MACOS_CORE_TARGET_NOT_SEPARATE");
  for (const forbidden of ["import Security", "SecKeyCreate", "SecItemAdd", "SecItemCopyMatching", "SecKeychain", "SecureEnclave.P256", "KeychainProtector", "GateBProbe.runLive", "URLSession", "NWListener", "NWConnection"]) if (all.includes(forbidden)) fail("MACOS_CORE_FORBIDDEN_LINKAGE");
  for (const forbidden of ["text.string =", "NSString(bytesNoCopy:"]) if (all.includes(forbidden)) fail("MACOS_CORE_UNTRACKED_RESPONSE_STRING");
  for (const required of [
    "--gate-b-core-transient-probe", "deviceOwnerAuthentication", "touchIDAuthenticationAllowableReuseDuration = 0",
    "Approve this exact Forme demo response for one synthetic handoff.", "mlock", "firstByteRead",
    "candidate.zeroize()", "bodyBearingDescriptorCount = 0", "crashZeroizationClaimed = false",
    "persistentCandidateRecoverySupported = false",
  ]) if (!all.includes(required)) fail("MACOS_CORE_REQUIRED_CONTROL_MISSING");
  if (sources["native/macos/Sources/FormeCoreLocal/CoreLauncher.swift"].indexOf("CoreLauncherCommand.parse") > sources["native/macos/Sources/FormeCoreLocal/CoreLauncher.swift"].indexOf("runDescriptor")) fail("MACOS_CORE_COMMAND_NOT_PRE_READ");
  if (sources["native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift"].indexOf("lockOperation(allocated") > sources["native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift"].indexOf("Darwin.read")) fail("MACOS_CORE_MLOCK_ORDER_DRIFT");
  for (const token of [
    "testWrongHashBindingDuplicateTrailingAndLateRejectBeforePresence", "testMlockPrecedesFirstByteAndEveryOwnedBufferZeroizes",
    "testCanonicalUnicodeAndEscapesAreDecodedBeforeExactReview", "testDescriptorBoundaryIsExactlyThirtyTwoKiBAndRejectsOneTrailingByte",
    "testDeadlineIsRecheckedAfterReviewBeforeHandoff", "testClosedFakeEffectPlanAndEveryFaultCleans",
  ]) if (!tests.includes(token)) fail("MACOS_CORE_TEST_MATRIX_MISSING");
  return Object.freeze({ sourceCount: sourcePaths.length, sourceHashes: Object.fromEntries(Object.entries(sources).map(([name, value]) => [name, sha256(value)])) });
}

export function inspectCoreMacOSConstruction() {
  const contract = JSON.parse(exactRead(contractPath).toString("utf8"));
  const evidenceSchema = JSON.parse(exactRead(evidenceSchemaPath).toString("utf8"));
  const helperReceiptSchema = evidenceSchema.$defs?.helperReceipt;
  if (contract.maximumFrameBytes !== 32_768 || contract.maximumResponseTextBytes !== 16_384 || contract.candidateKeychainOperations !== 0 || contract.candidateSecureEnclaveOperations !== 0 || contract.bodyBearingHandoffOutsideHelper !== 0 || contract.persistentRecoverySupported !== false || contract.responseTextReviewSemantics?.requiredEncoding !== "valid UTF-8 NFC" || contract.responseTextReviewSemantics?.swiftStringBodyMaterialization !== false) fail("MACOS_CORE_CONTRACT_DRIFT");
  if (helperReceiptSchema.properties?.schemaVersion?.const !== "r4.gate-b-core.macos-helper-receipt.v1" || helperReceiptSchema.additionalProperties !== false) fail("MACOS_CORE_HELPER_RECEIPT_SCHEMA_DRIFT");
  const expectedRecipe = expectedCoreMacOSBuildRecipe();
  const actualRecipe = JSON.parse(exactRead(recipePath).toString("utf8"));
  if (JSON.stringify(actualRecipe) !== JSON.stringify(expectedRecipe)) fail("MACOS_CORE_BUILD_RECIPE_DRIFT");
  const audit = auditSources();
  return Object.freeze({
    schemaVersion: "r4.gate-b-core.macos-construction.v1",
    status: "GREEN_FAKE_EXECUTOR_AND_SWIFT_TESTS_ONLY",
    swiftSourceCount: audit.sourceCount,
    effectPlanStepCount: effectOrder.length,
    realProcesses: 0,
    signingCalls: 0,
    keychainCalls: 0,
    localAuthenticationCalls: 0,
    candidateSecureEnclaveOperations: 0,
    candidateKeychainOperations: 0,
    providerCalls: 0,
    networkCalls: 0,
    fullPersistentLaneStatusChanged: false,
    aggregateVerdict: "YELLOW",
    fileHashes: { ...audit.sourceHashes, [contractPath]: sha256(exactRead(contractPath)), [evidenceSchemaPath]: sha256(exactRead(evidenceSchemaPath)), [recipePath]: sha256(exactRead(recipePath)) },
  });
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("MACOS_CORE_COMMAND_INVALID");
  process.stdout.write(`${JSON.stringify(inspectCoreMacOSConstruction())}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
