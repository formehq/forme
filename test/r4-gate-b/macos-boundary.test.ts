import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const macosPaths = [
  "native/macos/Package.swift",
  "native/macos/Sources/FormeLocal/Launcher.swift",
  "native/macos/Sources/FormeLocal/CodexAdapter.swift",
  "native/macos/Sources/FormeLocal/KeychainProtector.swift",
  "native/macos/Sources/FormeLocal/ReviewWindow.swift",
  "native/macos/Sources/FormeLocal/SandboxProfile.swift",
  "native/macos/Sources/FormeLocal/GateBProbe.swift",
  "native/macos/Sources/FormeLocal/ResourceLimits.swift",
  "native/macos/Sources/FormeLocal/MemoryPipe.swift",
  "native/macos/Resources/Info.plist",
  "native/macos/Resources/FormeLocal.entitlements",
  "native/macos/Tests/FormeLocalTests/BoundaryTests.swift",
] as const;

function source(path: string): string {
  const stat = fs.lstatSync(path);
  assert.equal(stat.isFile(), true);
  assert.equal(stat.isSymbolicLink(), false);
  assert.equal(stat.nlink, 1);
  return fs.readFileSync(path, "utf8");
}

test("the frozen native workset exists with a zero-dependency Swift package", () => {
  for (const path of macosPaths) source(path);
  const manifest = source("native/macos/Package.swift");
  assert.match(manifest, /platforms: \[\.macOS\(\.v26\)\]/u);
  assert.match(manifest, /dependencies: \[\]/u);
  assert.match(manifest, /swiftLanguageModes: \[\.v6\]/u);
  assert.doesNotMatch(manifest, /\.package\s*\(/u);
});

test("the unsigned resources declare the exact app and no entitlements", () => {
  const info = source("native/macos/Resources/Info.plist");
  assert.match(info, /org\.chaostudio\.forme\.gate-b\.local/u);
  assert.match(info, /<key>LSMinimumSystemVersion<\/key>\s*<string>26\.0<\/string>/u);
  assert.match(info, /<key>LSUIElement<\/key>\s*<true\/>/u);
  const entitlements = source("native/macos/Resources/FormeLocal.entitlements");
  assert.match(entitlements, /<dict\/>/u);
  for (const denied of [
    "com.apple.security.get-task-allow",
    "com.apple.security.cs.disable-library-validation",
    "com.apple.security.network.client",
    "com.apple.security.network.server",
  ]) assert.doesNotMatch(entitlements, new RegExp(denied.replaceAll(".", "\\."), "u"));
});

test("native sources encode user presence no fallback bounded pipes and zero provider authority", () => {
  const aggregate = macosPaths.filter((path) => path.endsWith(".swift")).map(source).join("\n");
  for (const required of [
    "kSecAttrTokenIDSecureEnclave",
    ".userPresence",
    "loginKeychainFallbackAllowed = false",
    "MemoryPipeContract.maximumBodyBytes",
    "networkAllowed = false",
    "descendantExecOrForkAllowed = false",
    "authorizedProviderCalls = 0",
    "childSeatbeltProbeHandledByAggregateRunner",
    "signatureVerificationHandledByAggregateRunner",
    "userPresenceCancelled",
    "cleanupCommitted",
  ]) assert.match(aggregate, new RegExp(required.replaceAll(".", "\\."), "u"));
});

test("construction probe can only compile and unit test", () => {
  const script = source("scripts/r4-gate-b-macos-probe.sh");
  assert.match(script, /\/usr\/bin\/swift build/u);
  assert.match(script, /\/usr\/bin\/swift test/u);
  assert.match(script, /GREEN_COMPILE_AND_UNIT_ONLY/u);
  assert.match(script, /"keychainOperations":0/u);
  assert.match(script, /"userPresencePrompts":0/u);
  assert.match(script, /"seatbeltChildren":0/u);
  assert.doesNotMatch(script, /\/usr\/bin\/(?:security|codesign|sandbox-exec|open)(?:\s|$)/u);
  assert.doesNotMatch(script, /swift\s+run|\.build\/release\/FormeLocal/u);
});
