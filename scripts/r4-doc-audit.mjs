import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { OPERATION_INVENTORY } from "../apps/room/src/operation-inventory.ts";
import {
  GOLDEN_FIXTURE_BUNDLE_SHA256,
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  verifyGoldenVectors,
} from "../packages/r4-protocol/src/index.ts";
import { PROTOCOL_SCHEMA_VERSIONS } from "../packages/r4-protocol/src/registry.ts";
import { buildSourceInventory } from "./r4-source-inventory.mjs";
import { RUNTIME_DEPENDENCY_PATHS } from "./r4-gate-b-host-binding.mjs";

const root = resolve(import.meta.dirname, "..");
const finalMode = process.argv.includes("--final");
const retryConstructionMode = process.argv.includes("--retry-construction");
const coreConstructionMode = process.argv.includes("--core-construction");
const physicalConstructionMode = process.argv.includes("--physical-construction") || process.argv.includes("--physical-construction-final");
const physicalConstructionFinalMode = process.argv.includes("--physical-construction-final");
const files = {
  packet: "docs/R4-TECHNICAL-CONTROL-PACKET.md",
  verification: "docs/R4-GATE-A-VERIFICATION.md",
  manifest: "docs/R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md",
  ownerReview: "docs/R4-GATE-B-OWNER-REVIEW.md",
};
const expectedPacket = "e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5";
const expectedPacketValue = `sha256:${expectedPacket}`;
const gateBArtifactIndexPath = "schemas/r4/gate-b/artifact-index.json";
const expectedGateBArtifactPaths = [
  "schemas/r4/gate-b/README.md",
  "schemas/r4/gate-b/codex-zero-call-contract.json",
  "schemas/r4/gate-b/local-formats.md",
  "schemas/r4/gate-b/macos/build-recipe.json",
  "schemas/r4/gate-b/macos/forme-fresh-response.sb",
  "schemas/r4/gate-b/operations.md",
  "schemas/r4/gate-b/postgres-contract.md",
  "schemas/r4/gate-b/runtime-boundary.json",
];

function text(path) {
  return readFileSync(join(root, path), "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function filesBelow(relativeRoot) {
  const absoluteRoot = join(root, relativeRoot);
  function collect(path) {
    const metadata = lstatSync(path);
    if (metadata.isSymbolicLink()) throw new Error(`Gate B artifact is a symbolic link:${relative(root, path)}`);
    if (metadata.isFile()) return [relative(root, path)];
    if (!metadata.isDirectory()) throw new Error(`Gate B artifact is not a regular file:${relative(root, path)}`);
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => collect(join(path, entry.name)));
  }
  return collect(absoluteRoot).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

const documents = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, text(path)]));
const packetHash = sha256(documents.packet);
if (packetHash !== expectedPacket) throw new Error(`approved Packet hash drifted:${packetHash}`);

const gateBArtifactIndex = JSON.parse(text(gateBArtifactIndexPath));
if (gateBArtifactIndex.schemaVersion !== "r4.gate-b.proposed-artifact-index.v1") {
  throw new Error("Gate B artifact index schema version drifted");
}
if (gateBArtifactIndex.status !== "PROPOSED_NOT_EXECUTED") {
  throw new Error("Gate B artifact index claims an executed state");
}
if (gateBArtifactIndex.approvedPacketSha256 !== expectedPacketValue) {
  throw new Error("Gate B artifact index Packet binding drifted");
}
if (gateBArtifactIndex.firstProviderCallTestGrant !== "NOT_REQUESTED") {
  throw new Error("Gate B artifact index opened the provider-call grant");
}

const actualGateBFiles = filesBelow("schemas/r4/gate-b");
const expectedGateBFiles = [...expectedGateBArtifactPaths, gateBArtifactIndexPath].sort((left, right) =>
  Buffer.compare(Buffer.from(left), Buffer.from(right)),
);
if (JSON.stringify(actualGateBFiles) !== JSON.stringify(expectedGateBFiles)) {
  throw new Error(`Gate B proposed artifact set drifted:${actualGateBFiles.join(",")}`);
}

const indexedPaths = gateBArtifactIndex.files?.map((entry) => entry.path) ?? [];
if (JSON.stringify(indexedPaths) !== JSON.stringify(expectedGateBArtifactPaths)) {
  throw new Error(`Gate B artifact index path/order drifted:${indexedPaths.join(",")}`);
}
const gateBArtifactLines = gateBArtifactIndex.files.map((entry) => {
  const actual = `sha256:${sha256(text(entry.path))}`;
  if (entry.sha256 !== actual) throw new Error(`Gate B artifact hash drifted:${entry.path}:${actual}`);
  return `${entry.sha256}  ${entry.path}\n`;
});
const gateBArtifactAggregate = `sha256:${sha256(gateBArtifactLines.join(""))}`;
if (gateBArtifactIndex.fileCount !== expectedGateBArtifactPaths.length) {
  throw new Error(`Gate B artifact count drifted:${gateBArtifactIndex.fileCount}`);
}
if (gateBArtifactIndex.aggregateSha256 !== gateBArtifactAggregate) {
  throw new Error(`Gate B artifact aggregate drifted:${gateBArtifactAggregate}`);
}

const gateBJsonArtifacts = [
  "schemas/r4/gate-b/runtime-boundary.json",
  "schemas/r4/gate-b/codex-zero-call-contract.json",
  "schemas/r4/gate-b/macos/build-recipe.json",
].map((path) => [path, JSON.parse(text(path))]);
for (const [path, artifact] of gateBJsonArtifacts) {
  if (artifact.status !== "PROPOSED_NOT_EXECUTED") throw new Error(`Gate B JSON status drifted:${path}`);
  if (artifact.authority?.approvedPacketSha256 !== expectedPacketValue) throw new Error(`Gate B JSON Packet drifted:${path}`);
  if (artifact.authority?.firstProviderCallTestGrant !== "NOT_REQUESTED") {
    throw new Error(`Gate B JSON provider-call grant drifted:${path}`);
  }
}
for (const path of expectedGateBArtifactPaths.filter((path) => !path.endsWith(".json"))) {
  const artifact = text(path);
  if (!artifact.includes("PROPOSED_NOT_EXECUTED")) throw new Error(`Gate B text status missing:${path}`);
  if (!artifact.includes(expectedPacketValue)) throw new Error(`Gate B text Packet missing:${path}`);
  if (!artifact.includes("NOT_REQUESTED") && !artifact.includes("NOT REQUESTED")) {
    throw new Error(`Gate B text provider-call grant missing:${path}`);
  }
  if (artifact.includes("@@") || artifact.includes("PENDING_FINAL")) throw new Error(`Gate B artifact placeholder:${path}`);
}

const operationRows = text("schemas/r4/gate-b/operations.md")
  .split("\n")
  .filter((line) => /^\|\s*\d+\s*\|/u.test(line))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
if (operationRows.length !== OPERATION_INVENTORY.length) {
  throw new Error(`Gate B operation row count drifted:${operationRows.length}`);
}
const authByActor = {
  public: new Set(["PUBLIC", "PROJECTION", "PAIR_CODE"]),
  guest_capability: new Set(["SUBMIT", "REPLY", "DELETE", "PARENT_CAP", "INVITE"]),
  controller: new Set(["CONTROLLER"]),
  curator: new Set(["CURATOR"]),
  room_operator: new Set(["ROOM_OPERATOR"]),
};
for (const [index, definition] of OPERATION_INVENTORY.entries()) {
  const row = operationRows[index];
  const action = row[1]?.replaceAll("`", "");
  const methodAndPath = /^`(GET|POST|PUT|DELETE) ([^`]+)`$/u.exec(row[2] ?? "");
  const auth = /`([^`]+)`/u.exec(row[3] ?? "")?.[1];
  if (
    row[0] !== String(index + 1) ||
    action !== definition.name ||
    methodAndPath?.[1] !== definition.method ||
    methodAndPath?.[2] !== definition.path ||
    !authByActor[definition.actor]?.has(auth) ||
    row[6] !== (definition.mutating ? "yes" : "no") ||
    row[7] !== (definition.expectedVersion ? "required" : "not-required")
  ) {
    throw new Error(`Gate B operation map drifted at row ${index + 1}:${definition.name}`);
  }
}

const runtimeBoundary = gateBJsonArtifacts[0][1];
const postgresContract = text("schemas/r4/gate-b/postgres-contract.md");
for (const value of [
  runtimeBoundary.postgresResources.temporaryRoot,
  runtimeBoundary.postgresResources.dockerContainerName,
  runtimeBoundary.postgresResources.dockerVolumeName,
  runtimeBoundary.postgresResources.databaseName,
]) {
  if (!postgresContract.includes(value)) throw new Error(`PostgreSQL resource contract drifted:${value}`);
}
if (runtimeBoundary.postgresResources.dockerNetworkMode !== "none" || !postgresContract.includes("--network none")) {
  throw new Error("PostgreSQL network isolation contract drifted");
}

const expectedRows = [
  ...Array.from({ length: 7 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 13 }, (_, index) => `D${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 13 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 11 }, (_, index) => `E${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 3 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`),
];
const actualRows = [...documents.verification.matchAll(/^\| ([SDFEP]\d{2}) \|/gmu)].map((match) => match[1]);
if (JSON.stringify(actualRows) !== JSON.stringify(expectedRows)) {
  throw new Error(`verification crosswalk mismatch:${actualRows.join(",")}`);
}

for (const [name, document] of Object.entries(documents)) {
  for (const match of document.matchAll(/\[[^\]]+\]\(\.\/([^\s)#]+)(?:#[^)]+)?\)/gu)) {
    const target = match[1];
    if (!target || !existsSync(join(root, dirname(files[name]), target))) {
      throw new Error(`broken local link:${files[name]}:${target ?? "missing"}`);
    }
  }
}

if (!documents.manifest.includes("First Provider-Call Test Grant: **NOT REQUESTED**")) {
  throw new Error("Gate B Manifest does not keep the provider-call grant closed");
}
if (!documents.ownerReview.includes("First Provider-Call Test Grant：**NOT REQUESTED**")) {
  throw new Error("Owner Review does not keep the provider-call grant closed");
}

// Historical Gate B final bindings intentionally describe the immutable Full
// source inventory. Core Construction has its own exact workset/hash audit
// below, so re-applying the Full inventory assertion would require mutating the
// frozen historical Manifest merely because the additive Core overlay exists.
if (finalMode && !coreConstructionMode) {
  const unresolved = [];
  for (const [name, document] of Object.entries(documents)) {
    if (document.includes("@@")) unresolved.push(`${name}:machine-placeholder`);
    if (document.includes("PENDING_FINAL")) unresolved.push(`${name}:pending-final-hash`);
  }
  if (documents.verification.includes("`NOT_PROVEN`")) unresolved.push("verification:not-proven");
  if (unresolved.length > 0) throw new Error(`unresolved final documentation:${unresolved.join(",")}`);

  const sourceInventory = buildSourceInventory();
  const protocolBundleText = text("schemas/r4/protocol.schema.json");
  const protocolIndexText = text("schemas/r4/schema-index.json");
  const protocolBundle = JSON.parse(protocolBundleText);
  const protocolIndex = JSON.parse(protocolIndexText);
  const protocolBundleHash = sha256(protocolBundleText);
  const protocolIndexHash = sha256(protocolIndexText);
  const definitionCount = Object.keys(protocolBundle.$defs ?? {}).length;
  const registryOrderHash = canonicalSha256(PROTOCOL_SCHEMA_VERSIONS);
  verifyGoldenVectors();
  const manifestHash = `sha256:${sha256(documents.manifest)}`;
  const gateBArtifactIndexHash = `sha256:${sha256(text(gateBArtifactIndexPath))}`;
  const familyCounts = Object.fromEntries(
    ["public_guest", "controller", "curator", "room_operator"].map((family) => [
      family,
      OPERATION_INVENTORY.filter((operation) => operation.family === family).length,
    ]),
  );
  const mutationCount = OPERATION_INVENTORY.filter((operation) => operation.mutating).length;
  const expectedInventoryMarkdown = sourceInventory.entries
    .map((entry) => `\`${entry.path}\`  \`sha256:${entry.sha256}\``)
    .join("\n");
  const inventoryMatch = /<!-- FILE_INVENTORY_BEGIN -->\n([\s\S]*?)\n<!-- FILE_INVENTORY_END -->/u.exec(documents.manifest);

  const finalBindings = [
    [documents.manifest.includes(`contains **${PROTOCOL_SCHEMA_VERSIONS.length}** versioned objects`), "manifest:protocol-object-count"],
    [documents.manifest.includes(`${definitionCount} \`$defs\` total`), "manifest:protocol-definition-count"],
    [documents.manifest.includes(`Bundle SHA-256 | \`${protocolBundleHash}\``), "manifest:protocol-bundle-hash"],
    [documents.manifest.includes(`Index SHA-256 | \`${protocolIndexHash}\``), "manifest:protocol-index-hash"],
    [documents.manifest.includes(`Registry order hash | \`${registryOrderHash}\``), "manifest:registry-order-hash"],
    [documents.manifest.includes(`Golden fixture bundle | \`${GOLDEN_FIXTURE_BUNDLE_SHA256}\``), "manifest:golden-fixture-hash"],
    [protocolIndex.objectCount === PROTOCOL_SCHEMA_VERSIONS.length, "schema-index:object-count"],
    [protocolIndex.bundleSha256 === `sha256:${protocolBundleHash}`, "schema-index:bundle-hash"],
    [protocolIndex.protocolSchemaVersionsSha256 === registryOrderHash, "schema-index:registry-order-hash"],
    [documents.manifest.includes(`**${sourceInventory.fileCount}-file**`), "manifest:source-file-count"],
    [documents.manifest.includes(sourceInventory.inventorySha256), "manifest:source-inventory-hash"],
    [inventoryMatch?.[1] === expectedInventoryMarkdown, "manifest:source-inventory-appendix"],
    [documents.manifest.includes(`implements exactly **${OPERATION_INVENTORY.length}** operation`), "manifest:operation-count"],
    [documents.manifest.includes(`All **${mutationCount}** mutations`), "manifest:mutation-count"],
    [documents.manifest.includes(`### Public and Guest (${familyCounts.public_guest})`), "manifest:public-guest-count"],
    [documents.manifest.includes(`### Controller (${familyCounts.controller})`), "manifest:controller-count"],
    [documents.manifest.includes(`### Curator (${familyCounts.curator})`), "manifest:curator-count"],
    [documents.manifest.includes(`### \`room_operator.v1\` (${familyCounts.room_operator})`), "manifest:room-operator-count"],
    [documents.manifest.includes(`Artifact index SHA-256 | \`${gateBArtifactIndexHash}\``), "manifest:gate-b-artifact-index-hash"],
    [documents.manifest.includes(`Artifact aggregate | \`${gateBArtifactAggregate}\``), "manifest:gate-b-artifact-aggregate"],
    [documents.ownerReview.includes(manifestHash), "owner-review:manifest-hash"],
    [documents.ownerReview.includes(`${PROTOCOL_SCHEMA_VERSIONS.length} 个对象`), "owner-review:protocol-object-count"],
    [documents.ownerReview.includes(`${OPERATION_INVENTORY.length} 个固定动作`), "owner-review:operation-count"],
  ];
  const drift = finalBindings.filter(([passed]) => !passed).map(([, name]) => name);
  if (drift.length > 0) throw new Error(`final documentation binding drift:${drift.join(",")}`);
}

let retryConstruction = null;
if (retryConstructionMode) {
  const commencementCommit = "6e8bf486cdc76deeb702f176a72bd8af981567e6";
  const constructionPacketPath = "docs/R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md";
  const constructionEvidencePath = "docs/evidence/r4-gate-b-retry-construction.json";
  const constructionEvidence = JSON.parse(text(constructionEvidencePath));
  const allowed = new Set([
    ...runtimeBoundary.repositoryWorkset.generatedSchemas,
    ...runtimeBoundary.repositoryWorkset.sql,
    ...runtimeBoundary.repositoryWorkset.persistence,
    ...runtimeBoundary.repositoryWorkset.codexAdapter,
    ...runtimeBoundary.repositoryWorkset.macos,
    ...runtimeBoundary.repositoryWorkset.runnerScripts,
    ...runtimeBoundary.repositoryWorkset.tests,
    ...runtimeBoundary.repositoryWorkset.modifiableExistingFiles,
    "scripts/r4-gate-b-path-fence.mjs",
    "test/r4-gate-b/path-fence.test.ts",
    constructionEvidencePath,
    "docs/R4-GATE-B-RETRY-CONSTRUCTION-REPORT.md",
    "docs/R4-GATE-B-RETRY-EXECUTION-MANIFEST.md",
    "docs/R4-GATE-B-RETRY-EXECUTION-OWNER-REVIEW.md",
  ]);
  const gitEnvironment = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  const git = (arguments_) => execFileSync("/usr/bin/git", arguments_, {
    cwd: root,
    env: gitEnvironment,
    encoding: "utf8",
    maxBuffer: 4_194_304,
  });
  const committed = git(["diff", "--name-only", `${commencementCommit}..HEAD`, "--"])
    .split("\n").filter(Boolean);
  const unstaged = git(["diff", "--name-only", "--"])
    .split("\n").filter(Boolean);
  const staged = git(["diff", "--cached", "--name-only", "--"])
    .split("\n").filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--"])
    .split("\n").filter(Boolean);
  const changedPaths = [...new Set([...committed, ...unstaged, ...staged, ...untracked])]
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const unlisted = changedPaths.filter((path) => !allowed.has(path));
  if (unlisted.length > 0) throw new Error(`Retry Construction unlisted workset:${unlisted.join(",")}`);
  const unhashed = changedPaths.filter((path) =>
    path !== constructionEvidencePath
      && !Object.prototype.hasOwnProperty.call(constructionEvidence.constructedFiles, path));
  if (unhashed.length > 0) throw new Error(`Retry Construction changed path missing hash:${unhashed.join(",")}`);
  if (changedPaths.includes("package-lock.json")) throw new Error("Retry Construction package-lock changed");
  if (sha256(text("package-lock.json")) !== runtimeBoundary.repositoryWorkset.packageLockMustRemainSha256) {
    throw new Error("Retry Construction package-lock hash drifted");
  }
  if (sha256(text(constructionPacketPath)) !== "4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7") {
    throw new Error("Retry Construction Packet hash drifted");
  }
  for (const [path, expected] of Object.entries(constructionEvidence.immutableBindings)) {
    const actual = `sha256:${sha256(readFileSync(join(root, path)))}`;
    if (actual !== expected) throw new Error(`Retry Construction immutable drifted:${path}`);
  }
  for (const [path, expected] of Object.entries(constructionEvidence.constructedFiles)) {
    if (!allowed.has(path)) throw new Error(`Retry Construction evidence path unlisted:${path}`);
    const metadata = lstatSync(join(root, path));
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
      throw new Error(`Retry Construction constructed path unsafe:${path}`);
    }
    const actual = `sha256:${sha256(readFileSync(join(root, path)))}`;
    if (actual !== expected) throw new Error(`Retry Construction constructed hash drifted:${path}`);
  }
  for (const generatedPath of [
    "native/macos/.build",
    "native/macos/.swiftpm",
    ".forme/gate-b-evidence",
  ]) {
    if (existsSync(join(root, generatedPath))) throw new Error(`Retry Construction generated output remains:${generatedPath}`);
  }
  const checkpointLog = git(["log", "--format=%s%x00%b%x00", `${commencementCommit}..HEAD`, "--"])
    .split("\u0000");
  const subjects = [];
  for (let index = 0; index + 1 < checkpointLog.length; index += 2) {
    const subject = checkpointLog[index]?.trim();
    const body = checkpointLog[index + 1]?.trim();
    if (!subject) continue;
    if (!subject.startsWith("[R4 Gate B Retry] Checkpoint ") || body !== "") {
      throw new Error(`Retry Construction checkpoint commit invalid:${subject}`);
    }
    subjects.push(subject);
  }
  if (subjects.length !== 11) throw new Error(`Retry Construction checkpoint count drifted:${subjects.length}`);
  retryConstruction = {
    schemaVersion: "r4_gate_b_retry_static_audit.v1",
    changedPathCount: changedPaths.length,
    constructedHashCount: Object.keys(constructionEvidence.constructedFiles).length,
    immutableHashCount: Object.keys(constructionEvidence.immutableBindings).length,
    checkpointCommitCount: subjects.length,
    packageLockUnchanged: true,
    unlistedPathCount: 0,
    generatedOutputRemainingCount: 0,
    status: "passed",
  };
}

let coreConstruction = null;
if (coreConstructionMode) {
  const commencementCommit = "5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e";
  const evidencePath = "docs/evidence/r4-gate-b-core-construction.json";
  const reportPath = "docs/R4-GATE-B-CORE-CONSTRUCTION-REPORT.md";
  const executionManifestPath = "docs/R4-GATE-B-CORE-EXECUTION-MANIFEST.md";
  const executionOwnerReviewPath = "docs/R4-GATE-B-CORE-EXECUTION-OWNER-REVIEW.md";
  const newPaths = [
    "schemas/r4/gate-b-core/README.md", "schemas/r4/gate-b-core/operations.md",
    "schemas/r4/gate-b-core/api-v1.schema.json", "schemas/r4/gate-b-core/api-v1-index.json",
    "schemas/r4/gate-b-core/postgres-contract.md", "schemas/r4/gate-b-core/core-basis.json",
    "schemas/r4/gate-b-core/runtime-boundary.json", "schemas/r4/gate-b-core/artifact-index.json",
    "schemas/r4/gate-b-core/evidence.schema.json", "schemas/r4/gate-b-core/codex-zero-call-contract.json",
    "schemas/r4/gate-b-core/sql/0000_r4_gate_b_core_bootstrap.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.verify.sql",
    "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.rollback.sql",
    "schemas/r4/gate-b-core/macos/transient-candidate-contract.json",
    "schemas/r4/gate-b-core/macos/build-recipe.json",
    "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb",
    "schemas/r4/gate-b-core/macos/forme-core-transient-response.sb",
    "schemas/r4/gate-b-core/macos/evidence.schema.json",
    "fixtures/r4-gate-b-core/postgres/core-happy-path.sql",
    "fixtures/r4-gate-b-core/postgres/core-errors.sql",
    "fixtures/r4-gate-b-core/postgres/core-races.sql",
    "fixtures/r4-gate-b-core/codex/initialize-result.json",
    "packages/r4-codex-adapter/src/zero-call-physical.ts", "packages/r4-local/src/hosted-room-api.ts",
    "apps/room/src/core-policy.ts", "scripts/r4-gate-b-core-api-contract.mjs",
    "scripts/r4-gate-b-core-postgres.mjs", "scripts/r4-gate-b-macos-core.mjs",
    "test/r4-gate-b-core/api-contract.test.ts", "test/r4-gate-b-core/postgres-static.test.ts",
    "test/r4-gate-b-core/postgres-adapter.test.ts", "test/r4-gate-b-core/surface-parity.test.ts",
    "test/r4-gate-b-core/web-cli-surface.test.ts", "test/r4-gate-b-core/codex-physical-adapter.test.ts",
    "test/r4-gate-b-core/macos-core-adapter.test.ts",
    "native/macos/Sources/FormeCoreLocal/CoreLauncher.swift",
    "native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift",
    "native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift",
    "native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift",
    "native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift",
    "native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift",
    "native/macos/Sources/FormeCoreLocal/CoreSandboxProfile.swift",
    "native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift",
    "native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift",
    "native/macos/Resources/FormeCoreLocal.Info.plist", "native/macos/Resources/FormeCoreLocal.entitlements",
    "native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift",
    evidencePath, reportPath, executionManifestPath, executionOwnerReviewPath,
  ];
  const modifiable = [
    "package.json", "tsconfig.json", "src/cli.ts", "scripts/r4-doc-audit.mjs",
    "scripts/r4-gate-b-preflight.mjs", "scripts/r4-gate-b-runner.mjs", "scripts/r4-gate-b-cleanup.mjs",
    "scripts/r4-gate-b-codex-probe.mjs", "packages/r4-codex-adapter/src/app-server-probe.ts",
    "packages/r4-codex-adapter/src/index.ts", "packages/r4-local/src/cli.ts", "packages/r4-local/src/index.ts",
    "apps/room/src/operation-inventory.ts", "apps/room/src/http.ts", "apps/room/src/application.ts",
    "apps/room/src/projection-page.ts", "apps/room/src/components/GuestStatus.tsx",
    "apps/room/src/components/OwnerControls.tsx", "apps/room/src/components/client-api.ts",
    "apps/room/app/page.tsx", "apps/room/app/layout.tsx", "apps/room/app/owner/page.tsx",
    "apps/room/app/owner/interactions/[interactionId]/page.tsx", "apps/room/app/private/[projectionId]/page.tsx",
    "native/macos/Package.swift", "test/r4-gate-b/codex-adapter.test.ts",
    "test/r4-gate-b/macos-boundary.test.ts", "test/r4/hosted-http.test.ts",
    "test/r4/hosted-web-agent-parity.test.ts", "test/r4/ui-static-safety.test.ts", "test/r4/local-cli.test.ts",
  ];
  const allowed = new Set([...newPaths, ...modifiable]);
  const gitEnvironment = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (arguments_) => execFileSync("/usr/bin/git", arguments_, { cwd: root, env: gitEnvironment, encoding: "utf8", maxBuffer: 8_388_608 });
  const changedPaths = [...new Set([
    ...git(["diff", "--name-only", `${commencementCommit}..HEAD`, "--"]).split("\n"),
    ...git(["diff", "--name-only", "--"]).split("\n"),
    ...git(["diff", "--cached", "--name-only", "--"]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard", "--"]).split("\n"),
  ].filter(Boolean))].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const unlisted = changedPaths.filter((path) => !allowed.has(path));
  if (unlisted.length > 0) throw new Error(`Core Construction unlisted workset:${unlisted.join(",")}`);
  if (changedPaths.includes("package-lock.json") || sha256(text("package-lock.json")) !== "d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812") {
    throw new Error("Core Construction package-lock drifted");
  }
  for (const [path, expected] of [
    ["docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md", "5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6"],
    ["docs/R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-OWNER-REVIEW.md", "2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299"],
  ]) if (sha256(readFileSync(join(root, path))) !== expected) throw new Error(`Core immutable approval drifted:${path}`);

  const evidence = JSON.parse(text(evidencePath));
  if (!existsSync(join(root, executionOwnerReviewPath))) throw new Error("Core Execution Owner Review missing");
  const schema = JSON.parse(text("schemas/r4/gate-b-core/evidence.schema.json"));
  const ajv = new Ajv2020({ strict: true, strictSchema: true, allErrors: true });
  if (!ajv.compile(schema)(evidence)) throw new Error(`Core evidence schema mismatch:${JSON.stringify(ajv.errors)}`);
  for (const [path, expected] of Object.entries(evidence.immutableBindings)) {
    const actual = `sha256:${sha256(readFileSync(join(root, path)))}`;
    if (actual !== expected) throw new Error(`Core immutable evidence drifted:${path}`);
  }
  for (const [path, expected] of Object.entries(evidence.constructedFiles)) {
    if (!allowed.has(path)) throw new Error(`Core evidence path unlisted:${path}`);
    const metadata = lstatSync(join(root, path));
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) throw new Error(`Core constructed path unsafe:${path}`);
    const actual = `sha256:${sha256(readFileSync(join(root, path)))}`;
    if (actual !== expected) throw new Error(`Core constructed hash drifted:${path}`);
  }
  const outputPaths = new Set([evidencePath, reportPath, executionManifestPath, executionOwnerReviewPath]);
  const unhashed = changedPaths.filter((path) => !outputPaths.has(path) && !Object.prototype.hasOwnProperty.call(evidence.constructedFiles, path));
  if (unhashed.length > 0) throw new Error(`Core changed path missing evidence hash:${unhashed.join(",")}`);

  const artifactIndexPath = "schemas/r4/gate-b-core/artifact-index.json";
  const artifactIndex = JSON.parse(text(artifactIndexPath));
  const actualArtifacts = filesBelow("schemas/r4/gate-b-core").filter((path) => path !== artifactIndexPath);
  const indexedArtifacts = artifactIndex.files.map((entry) => entry.path);
  if (JSON.stringify(actualArtifacts) !== JSON.stringify(indexedArtifacts)) throw new Error("Core artifact index path drift");
  const artifactLines = artifactIndex.files.map((entry) => {
    const actual = `sha256:${sha256(readFileSync(join(root, entry.path)))}`;
    if (actual !== entry.sha256) throw new Error(`Core artifact hash drift:${entry.path}`);
    return `${actual.slice(7)}  ${entry.path}\n`;
  }).join("");
  if (artifactIndex.fileCount !== actualArtifacts.length || artifactIndex.aggregateSha256 !== `sha256:${sha256(artifactLines)}`) throw new Error("Core artifact aggregate drift");
  if (artifactIndex.retryExecutionGrant !== "NOT_REQUESTED" || artifactIndex.firstProviderCallTestGrant !== "NOT_REQUESTED") throw new Error("Core artifact index opens an execution grant");

  for (const generatedPath of ["native/macos/.build", "native/macos/.swiftpm", ".forme/gate-b-evidence"]) {
    if (existsSync(join(root, generatedPath))) throw new Error(`Core generated output remains:${generatedPath}`);
  }
  for (const path of [evidencePath, reportPath, executionManifestPath, executionOwnerReviewPath]) {
    const value = text(path);
    if (value.includes("@@") || value.includes("PENDING_FINAL")) throw new Error(`Core output placeholder:${path}`);
    if (/synthetic-machine-secret|synthetic-install-secret|process-secret-machine|process-secret-install|Use the narrow reversible experiment first/u.test(value)) throw new Error(`Core output contains synthetic body/identity canary:${path}`);
    if (!value.includes("NOT_REQUESTED") && !value.includes("NOT REQUESTED")) throw new Error(`Core output grant closure missing:${path}`);
  }
  const boundary = JSON.parse(text("schemas/r4/gate-b-core/runtime-boundary.json"));
  if (boundary.status !== "CORE_REPOSITORY_REVIEWABLE_YELLOW" || boundary.continuity.aggregateRetryVerdict !== "YELLOW" || boundary.authority.retryExecutionGrant !== "NOT_REQUESTED" || boundary.authority.firstProviderCallTestGrant !== "NOT_REQUESTED") throw new Error("Core runtime claim drift");
  coreConstruction = {
    schemaVersion: "r4.gate-b-core.static-audit.v1",
    changedPathCount: changedPaths.length,
    constructedHashCount: Object.keys(evidence.constructedFiles).length,
    immutableHashCount: Object.keys(evidence.immutableBindings).length,
    artifactCount: actualArtifacts.length,
    packageLockUnchanged: true,
    unlistedPathCount: 0,
    generatedOutputRemainingCount: 0,
    retryExecutionGrant: "NOT_REQUESTED",
    firstProviderCallTestGrant: "NOT_REQUESTED",
    status: "passed",
  };
}

let physicalConstruction = null;
if (physicalConstructionMode) {
  const proposalHead = "a45ea061e8e92f247597787e36ecfe52740b216a";
  const proposalTree = "89b28903fc34e985a17e8f3fdc4bfd7d0972880e";
  const historicalImplementationHead = "92c6c3f8896494aed699671a04a93a09fb59087d";
  const historicalImplementationTree = "cf2ce5567c601fff1ad709e565dde41cf9c3540d";
  const historicalOutputHead = "63ae16940faf17694152cffa12848e62c2933c52";
  const historicalOutputTree = "ebfd96e7c1003c076d417798e53430891f60f057";
  const correctionPaths = new Set([
    "schemas/r4/gate-b-core/artifact-index.json",
    "schemas/r4/gate-b-core/physical-runner-contract.json",
    "scripts/r4-doc-audit.mjs",
    "scripts/r4-gate-b-physical-port.mjs",
    "scripts/r4-gate-b-physical-runner.mjs",
    "test/r4-gate-b-core/physical-runner.test.ts",
  ]);
  const correctionOutputPaths = new Set([
    "docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md",
    "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md",
    "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md",
  ]);
  const physicalEvidenceAuthority = Object.freeze({
    approvedDecisionBriefSha256: "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2",
    constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
    constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
    approvedProposalHead: proposalHead,
    approvedProposalTree: proposalTree,
    hostBindingAdapterConstructionGrant: "APPROVED",
    packageLockSha256: "sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812",
    immutableCoreAggregateSha256: "sha256:f4bd00354f1c7cd330b421faec735efb83c4f0efbc5f18eabc39923b11d1733d",
    immutableFullAggregateSha256: "sha256:f290ba035efa2eb84d899bf67d4ffb03c523d88556ce96b66f4f3a2862159310",
    codexProfileSha256: "sha256:0c6dc1dda5c97f9d3773bc2ccbd49b28c8ba1b02f7f6b55180db7b2672a9d2ce",
    retryExecutionGrant: "NOT_REQUESTED",
    firstProviderCallGrant: "NOT_REQUESTED",
  });
  const physicalEvidenceStaticCounters = Object.freeze({
    postgresNamedFamilies: 13,
    postgresExecutableCases: 16,
    postgresOrderedExecutions: 32,
    postgresExpectedCoreCalls: 68,
    postgresExpected2xx: 39,
    postgresExpectedControlledNon2xx: 29,
    postgresExpectedNewReceipts: 37,
    postgresPersistedVerifierPlans: 32,
    deterministicStressRuns: 3,
    gitPushCommands: 0,
    githubIssuesUpdated: 0,
    publicationPushPlanned: 1,
    githubIssueUpdatesPlanned: 2,
  });
  const physicalEvidenceZeroEffectCounters = Object.freeze({
    dockerMutationCalls: 0,
    postgresCalls: 0,
    realCodexCalls: 0,
    sandboxExecCalls: 0,
    threadStarts: 0,
    turnStarts: 0,
    providerCalls: 0,
    macosPhysicalCompileCalls: 0,
    appAssemblyCalls: 0,
    codesignCalls: 0,
    securityCalls: 0,
    localAuthenticationCalls: 0,
    helperLaunches: 0,
    candidateHandoffs: 0,
  });
  const implementationHashPaths = Object.freeze({
    physicalRunnerSha256: "scripts/r4-gate-b-physical-runner.mjs",
    hostBindingModuleSha256: "scripts/r4-gate-b-host-binding.mjs",
    physicalPortSha256: "scripts/r4-gate-b-physical-port.mjs",
    postgresMigrationSha256: "schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql",
    postgresRaceCatalogSha256: "schemas/r4/gate-b-core/postgres/race-catalog.json",
    postgresRaceByteIndexSha256: "schemas/r4/gate-b-core/postgres/race-byte-index.json",
    codexPortSha256: "packages/r4-codex-adapter/src/zero-call-physical.ts",
    codexProfileSha256: "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb",
    macosPhysicalContractSha256: "schemas/r4/gate-b-core/macos/physical-adapter-contract.json",
    macosBuildRecipeSha256: "schemas/r4/gate-b-core/macos/build-recipe.json",
  });
  const packetPath = "docs/R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-PACKET.md";
  const reviewPath = "docs/R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-OWNER-REVIEW.md";
  const evidencePath = "docs/evidence/r4-gate-b-physical-adapter-construction.json";
  const publicReceiptPath = "docs/evidence/r4-gate-b-host-binding-public.json";
  const outputPaths = new Set([
    evidencePath, publicReceiptPath,
    "docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md",
    "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md",
    "docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md",
    "README.md", "docs/README.md", "docs/CONTROL.md", "docs/ROADMAP.md", "docs/DECISIONS.md",
  ]);
  const requiredOutputPaths = new Set([...outputPaths].filter((value) => value !== publicReceiptPath));
  let correctionHead = null;
  let correctionOutputHead = null;
  const allowed = new Set(`
schemas/r4/gate-b-core/host-binding-input.schema.json
schemas/r4/gate-b-core/host-binding-capsule.schema.json
schemas/r4/gate-b-core/host-binding-public-receipt.schema.json
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/physical-construction-evidence.schema.json
schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json
schemas/r4/gate-b-core/physical-retry-evidence.schema.json
schemas/r4/gate-b-core/postgres/physical-adapter-contract.json
schemas/r4/gate-b-core/postgres/race-catalog.json
schemas/r4/gate-b-core/postgres/race-byte-index.json
schemas/r4/gate-b-core/macos/physical-adapter-contract.json
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-port.mjs
scripts/r4-gate-b-physical-runner.mjs
fixtures/r4-gate-b-core/macos/fake-provider-child.mjs
fixtures/r4-gate-b-core/macos/fake-helper-child.mjs
fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs
fixtures/r4-gate-b-core/postgres/core-race-setup.sql
fixtures/r4-gate-b-core/postgres/core-race-worker.sql
fixtures/r4-gate-b-core/postgres/core-race-verify.sql
test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/physical-runner.test.ts
test/r4-gate-b-core/postgres-races.test.ts
test/r4-gate-b-core/macos-process-death.test.ts
schemas/r4/gate-b-core/README.md
schemas/r4/gate-b-core/artifact-index.json
schemas/r4/gate-b-core/runtime-boundary.json
schemas/r4/gate-b-core/postgres-contract.md
schemas/r4/gate-b-core/codex-zero-call-contract.json
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql
schemas/r4/gate-b-core/macos/build-recipe.json
schemas/r4/gate-b-core/macos/transient-candidate-contract.json
fixtures/r4-gate-b-core/postgres/core-happy-path.sql
fixtures/r4-gate-b-core/postgres/core-errors.sql
fixtures/r4-gate-b-core/postgres/core-races.sql
packages/r4-codex-adapter/src/zero-call-physical.ts
scripts/r4-doc-audit.mjs
scripts/r4-gate-b-path-fence.mjs
scripts/r4-gate-b-core-postgres.mjs
scripts/r4-gate-b-codex-probe.mjs
scripts/r4-gate-b-macos-core.mjs
test/r4-gate-b-core/postgres-static.test.ts
test/r4-gate-b-core/postgres-adapter.test.ts
test/r4-gate-b-core/codex-physical-adapter.test.ts
test/r4-gate-b-core/macos-core-adapter.test.ts
native/macos/Sources/FormeCoreLocal/CoreLauncher.swift
native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift
native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift
native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift
native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift
native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift
native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift
docs/evidence/r4-gate-b-physical-adapter-construction.json
docs/evidence/r4-gate-b-host-binding-public.json
docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md
README.md
docs/README.md
docs/CONTROL.md
docs/ROADMAP.md
docs/DECISIONS.md
  `.trim().split("\n"));
  const gitEnvironment = { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (arguments_) => execFileSync("/usr/bin/git", arguments_, { cwd: root, env: gitEnvironment, encoding: "utf8", maxBuffer: 16_777_216 });
  const gitBytes = (arguments_) => execFileSync("/usr/bin/git", arguments_, { cwd: root, env: gitEnvironment, maxBuffer: 16_777_216 });
  const gitBlob = (head, relativePath) => gitBytes(["cat-file", "blob", `${head}:${relativePath}`]);
  const rawPathSort = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  const committedPaths = (from, to) => git(["diff", "--name-only", `${from}..${to}`, "--"]).split("\n").filter(Boolean).sort(rawPathSort);
  const exactPathSet = (observed, expected) => observed.length === expected.size && observed.every((value) => expected.has(value));
  const headLine = git(["rev-list", "--parents", "-n", "1", "HEAD"]).trim().split(" ");
  let reviewTip = headLine[0];
  if (headLine.length === 3 && git(["merge-base", historicalImplementationHead, headLine[2]]).trim() === historicalImplementationHead) reviewTip = headLine[2];
  if (git(["rev-parse", `${proposalHead}^{tree}`]).trim() !== proposalTree) throw new Error("Physical Construction proposal tree drifted");
  if (sha256(readFileSync(join(root, packetPath))) !== "7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06") throw new Error("Physical Construction Packet drifted");
  if (sha256(readFileSync(join(root, reviewPath))) !== "27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9") throw new Error("Physical Construction Owner Review drifted");
  const changedPaths = [...new Set([
    ...git(["diff", "--name-only", `${proposalHead}..${reviewTip}`, "--"]).split("\n"),
    ...git(["diff", "--name-only", "--"]).split("\n"),
    ...git(["diff", "--cached", "--name-only", "--"]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard", "--"]).split("\n"),
  ].filter(Boolean))].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const unlisted = changedPaths.filter((value) => !allowed.has(value));
  if (unlisted.length > 0) throw new Error(`Physical Construction unlisted workset:${unlisted.join(",")}`);
  if (changedPaths.includes("package-lock.json") || sha256(text("package-lock.json")) !== "d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812") throw new Error("Physical Construction package-lock drifted");
  for (const [immutablePath, expected] of [
    ["schemas/r4/gate-b-core/evidence.schema.json", "34bda9a95ea6aa13047aa12c25f656e051a95c107416d4a2c50c20ba2343a9e1"],
    ["schemas/r4/gate-b-core/macos/evidence.schema.json", "08eb1e8331ddcb1fd1c6c84762ad285550420a9ef685394db2415c033b53f81f"],
    ["schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb", "0c6dc1dda5c97f9d3773bc2ccbd49b28c8ba1b02f7f6b55180db7b2672a9d2ce"],
  ]) if (sha256(readFileSync(join(root, immutablePath))) !== expected) throw new Error(`Physical Construction immutable drift:${immutablePath}`);
  const artifactIndexPath = "schemas/r4/gate-b-core/artifact-index.json";
  const artifactIndex = JSON.parse(text(artifactIndexPath));
  const actualArtifacts = filesBelow("schemas/r4/gate-b-core").filter((value) => value !== artifactIndexPath);
  const indexedArtifacts = artifactIndex.files.map((entry) => entry.path);
  if (JSON.stringify(actualArtifacts) !== JSON.stringify(indexedArtifacts)) throw new Error("Physical Core artifact index path drift");
  const artifactLines = artifactIndex.files.map((entry) => {
    const actual = `sha256:${sha256(readFileSync(join(root, entry.path)))}`;
    if (actual !== entry.sha256) throw new Error(`Physical Core artifact hash drift:${entry.path}`);
    return `${actual.slice(7)}  ${entry.path}\n`;
  }).join("");
  if (artifactIndex.fileCount !== actualArtifacts.length || artifactIndex.aggregateSha256 !== `sha256:${sha256(artifactLines)}`) throw new Error("Physical Core artifact aggregate drift");
  if (artifactIndex.retryExecutionGrant !== "NOT_REQUESTED" || artifactIndex.firstProviderCallTestGrant !== "NOT_REQUESTED") throw new Error("Physical artifact index opened grant");
  for (const schemaPath of [
    "schemas/r4/gate-b-core/host-binding-input.schema.json",
    "schemas/r4/gate-b-core/host-binding-capsule.schema.json",
    "schemas/r4/gate-b-core/host-binding-public-receipt.schema.json",
    "schemas/r4/gate-b-core/physical-construction-evidence.schema.json",
    "schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json",
    "schemas/r4/gate-b-core/physical-retry-evidence.schema.json",
  ]) new Ajv2020({ strict: true, strictSchema: true, allErrors: true, validateFormats: false }).compile(JSON.parse(text(schemaPath)));
  const boundary = JSON.parse(text("schemas/r4/gate-b-core/runtime-boundary.json"));
  if (boundary.status !== "PHYSICAL_ADAPTERS_CONSTRUCTED_OFFLINE_RETRY_NOT_REQUESTED" || boundary.authority.hostBindingAdapterConstructionGrant !== "APPROVED" || boundary.authority.retryExecutionGrant !== "NOT_REQUESTED" || boundary.authority.firstProviderCallTestGrant !== "NOT_REQUESTED" || boundary.continuity.aggregateRetryVerdict !== "YELLOW") throw new Error("Physical runtime boundary claim drift");
  let implementationFileCount = null;
  if (physicalConstructionFinalMode) {
    if (git(["rev-parse", `${historicalImplementationHead}^{tree}`]).trim() !== historicalImplementationTree) throw new Error("Physical historical implementation tree drifted");
    if (git(["rev-parse", `${historicalOutputHead}^{tree}`]).trim() !== historicalOutputTree) throw new Error("Physical historical output tree drifted");
    const historicalOutputLine = git(["rev-list", "--parents", "-n", "1", historicalOutputHead]).trim().split(" ");
    if (historicalOutputLine.length !== 2 || historicalOutputLine[1] !== historicalImplementationHead || !exactPathSet(committedPaths(historicalImplementationHead, historicalOutputHead), requiredOutputPaths)) throw new Error("Physical historical I-to-R lineage drifted");
    const reviewTipLine = git(["rev-list", "--parents", "-n", "1", reviewTip]).trim().split(" ");
    if (reviewTipLine.length !== 2) throw new Error("Physical correction review tip is not a single-parent commit");
    const tipPaths = committedPaths(reviewTipLine[1], reviewTip);
    if (exactPathSet(tipPaths, correctionOutputPaths)) {
      correctionOutputHead = reviewTip;
      correctionHead = reviewTipLine[1];
    } else {
      correctionHead = reviewTip;
    }
    const correctionCommits = git(["rev-list", "--ancestry-path", "--reverse", `${historicalOutputHead}..${correctionHead}`]).split("\n").filter(Boolean);
    let expectedCorrectionParent = historicalOutputHead;
    for (const commit of correctionCommits) {
      const correctionLine = git(["rev-list", "--parents", "-n", "1", commit]).trim().split(" ");
      if (correctionLine.length !== 2 || correctionLine[1] !== expectedCorrectionParent) throw new Error("Physical post-I correction commit chain drifted");
      expectedCorrectionParent = commit;
    }
    if (correctionCommits.length < 1 || expectedCorrectionParent !== correctionHead || !exactPathSet(committedPaths(historicalOutputHead, correctionHead), correctionPaths)) throw new Error("Physical post-I correction lineage drifted");
    if (correctionOutputHead === null && reviewTip !== correctionHead) throw new Error("Physical correction output lineage drifted");
    for (const value of requiredOutputPaths) if (!existsSync(join(root, value))) throw new Error(`Physical output missing:${value}`);
    const readCanonicalJson = (relativePath, label) => {
      const bytes = readFileSync(join(root, relativePath));
      if (bytes.length < 2 || bytes.at(-1) !== 0x0a) throw new Error(`${label} is not one LF-framed canonical JSON value`);
      const sourceBytes = bytes.subarray(0, -1);
      const source = sourceBytes.toString("utf8");
      if (!Buffer.from(source, "utf8").equals(sourceBytes)) throw new Error(`${label} is not valid UTF-8`);
      const value = parseStrictJson(source);
      if (!Buffer.from(`${canonicalJson(value)}\n`, "utf8").equals(bytes)) throw new Error(`${label} is not exact canonical JSON`);
      return value;
    };
    const evidence = readCanonicalJson(evidencePath, "Physical evidence");
    const evidenceSchema = JSON.parse(text("schemas/r4/gate-b-core/physical-construction-evidence.schema.json"));
    const evidenceAjv = new Ajv2020({ strict: true, strictSchema: true, allErrors: true, validateFormats: false });
    const validateEvidence = evidenceAjv.compile(evidenceSchema);
    if (!validateEvidence(evidence)) throw new Error(`Physical evidence schema mismatch:${JSON.stringify(validateEvidence.errors)}`);
    for (const [key, expected] of Object.entries(physicalEvidenceAuthority)) {
      if (evidence[key] !== expected) throw new Error(`Physical evidence authority drift:${key}`);
    }
    for (const [key, expected] of Object.entries(physicalEvidenceStaticCounters)) {
      if (evidence[key] !== expected) throw new Error(`Physical evidence static counter drift:${key}`);
    }
    for (const [key, expected] of Object.entries(physicalEvidenceZeroEffectCounters)) {
      if (evidence[key] !== expected) throw new Error(`Physical evidence zero-effect counter drift:${key}`);
    }
    if (evidence.hostBindingAttempted === false) {
      for (const [key, expected] of Object.entries({
        dockerReadOnlyCliCalls: 0,
        localDockerUnixSocketRequests: 0,
        macosReadOnlyInspectionCalls: 0,
        hostBindingId: null,
        hostBindingCapsuleSha256: null,
        hostBindingPublicReceiptSha256: null,
        hostBindingExpiresAt: null,
        bindingInputAbsent: null,
      })) if (evidence[key] !== expected) throw new Error(`Physical Phase-A NOT_INSPECTED drift:${key}`);
    }
    if (evidence.status === "PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW") {
      for (const [key, expected] of Object.entries({ dockerReadOnlyCliCalls: 3, localDockerUnixSocketRequests: 2, macosReadOnlyInspectionCalls: 9, hostBindingAttempted: true, bindingInputAbsent: true })) {
        if (evidence[key] !== expected) throw new Error(`Physical Host Binding clean counter drift:${key}`);
      }
    }
    const publicReceiptPresent = existsSync(join(root, publicReceiptPath));
    if (evidence.hostBindingPublicReceiptSha256 === null) {
      if (publicReceiptPresent) throw new Error("Host Binding public receipt exists without an evidence binding");
    } else {
      if (!publicReceiptPresent) throw new Error(`Physical output missing:${publicReceiptPath}`);
      const receipt = readCanonicalJson(publicReceiptPath, "Host Binding public receipt");
      const receiptSchema = JSON.parse(text("schemas/r4/gate-b-core/host-binding-public-receipt.schema.json"));
      const validateReceipt = evidenceAjv.compile(receiptSchema);
      if (!validateReceipt(receipt)) throw new Error(`Host Binding public receipt schema mismatch:${JSON.stringify(validateReceipt.errors)}`);
      if (`sha256:${sha256(readFileSync(join(root, publicReceiptPath)))}` !== evidence.hostBindingPublicReceiptSha256) throw new Error("Host Binding public receipt evidence hash drift");
      for (const [evidenceKey, receiptKey] of Object.entries({ hostBindingId: "hostBindingId", hostBindingCapsuleSha256: "hostBindingCapsuleSha256", hostBindingExpiresAt: "expiresAt", implementationHead: "implementationHead", implementationTree: "implementationTree" })) {
        if (evidence[evidenceKey] !== receipt[receiptKey]) throw new Error(`Host Binding public receipt cross-binding drift:${evidenceKey}`);
      }
      const runtimeDependencies = RUNTIME_DEPENDENCY_PATHS.map((runtimePath) => Object.freeze({ path: runtimePath, sha256: `sha256:${sha256(gitBlob(evidence.implementationHead, runtimePath))}` }));
      const runtimeDependencyAggregateSha256 = `sha256:${sha256(Buffer.from(`${canonicalJson(runtimeDependencies)}\n`, "utf8"))}`;
      if (receipt.runtimeDependencyAggregateSha256 !== runtimeDependencyAggregateSha256) throw new Error("Host Binding public receipt runtime dependency aggregate drift");
    }
    if (evidence.implementationHead !== historicalImplementationHead || evidence.implementationTree !== historicalImplementationTree || git(["rev-parse", `${evidence.implementationHead}^{tree}`]).trim() !== evidence.implementationTree || git(["merge-base", proposalHead, evidence.implementationHead]).trim() !== proposalHead || git(["merge-base", evidence.implementationHead, reviewTip]).trim() !== evidence.implementationHead) throw new Error("Physical implementation lineage drift");
    const postImplementationPaths = [...new Set([
      ...git(["diff", "--name-only", `${evidence.implementationHead}..${reviewTip}`, "--"]).split("\n"),
      ...git(["diff", "--name-only", "--"]).split("\n"),
      ...git(["diff", "--cached", "--name-only", "--"]).split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard", "--"]).split("\n"),
    ].filter(Boolean))];
    const postImplementationNonOutputs = postImplementationPaths.filter((value) => !outputPaths.has(value) && !correctionPaths.has(value));
    if (postImplementationNonOutputs.length > 0) throw new Error(`Physical bytes changed after implementation I:${postImplementationNonOutputs.join(",")}`);
    if (`sha256:${sha256(gitBlob(evidence.implementationHead, "package-lock.json"))}` !== physicalEvidenceAuthority.packageLockSha256) throw new Error("Physical implementation package-lock drift");
    const implementationPathBytes = gitBytes(["diff", "--name-only", "-z", `${proposalHead}..${evidence.implementationHead}`, "--"]);
    if (implementationPathBytes.length > 0 && implementationPathBytes.at(-1) !== 0x00) throw new Error("Physical implementation path frame drift");
    const implementationPaths = [];
    let pathStart = 0;
    for (let index = 0; index < implementationPathBytes.length; index += 1) {
      if (implementationPathBytes[index] !== 0x00) continue;
      const rawPath = implementationPathBytes.subarray(pathStart, index);
      if (rawPath.length === 0) throw new Error("Physical implementation empty path");
      const value = rawPath.toString("utf8");
      if (!Buffer.from(value, "utf8").equals(rawPath)) throw new Error("Physical implementation path is not valid UTF-8");
      implementationPaths.push(value);
      pathStart = index + 1;
    }
    implementationPaths.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
    const implementationUnlisted = implementationPaths.filter((value) => !allowed.has(value));
    if (implementationUnlisted.length > 0) throw new Error(`Physical implementation unlisted workset:${implementationUnlisted.join(",")}`);
    const implementationOutputs = implementationPaths.filter((value) => outputPaths.has(value));
    if (implementationOutputs.length > 0) throw new Error(`Physical implementation I contains Phase-B output:${implementationOutputs.join(",")}`);
    for (const [key, implementationPath] of Object.entries(implementationHashPaths)) {
      const actual = `sha256:${sha256(gitBlob(evidence.implementationHead, implementationPath))}`;
      if (evidence[key] !== actual) throw new Error(`Physical implementation blob hash drift:${key}:${implementationPath}`);
    }
    const implementationLines = Buffer.concat(implementationPaths.map((value) => {
      const blobSha256 = sha256(gitBlob(evidence.implementationHead, value));
      return Buffer.from(`sha256:${blobSha256}  ${value}\n`, "utf8");
    }));
    implementationFileCount = implementationPaths.length;
    if (evidence.constructedFileCount !== implementationPaths.length || evidence.constructedFilesAggregateSha256 !== `sha256:${sha256(implementationLines)}`) throw new Error("Physical implementation aggregate drift");
    const presentOutputPaths = [...requiredOutputPaths, ...(publicReceiptPresent ? [publicReceiptPath] : [])];
    for (const value of presentOutputPaths) {
      const output = text(value);
      if (output.includes("@@") || output.includes("PENDING_FINAL") || output.includes("__PACKET_SHA256__")) throw new Error(`Physical output placeholder:${value}`);
    }
  }
  physicalConstruction = {
    schemaVersion: "r4_gate_b_physical_static_audit.v1",
    phase: physicalConstructionFinalMode ? "final" : "phase-a",
    historicalImplementationHead: physicalConstructionFinalMode ? historicalImplementationHead : null,
    historicalOutputHead: physicalConstructionFinalMode ? historicalOutputHead : null,
    correctionHead,
    correctionOutputHead,
    runnerAfterCorrectionHostBound: false,
    changedPathCount: changedPaths.length,
    implementationFileCount,
    artifactCount: actualArtifacts.length,
    unlistedPathCount: 0,
    packageLockUnchanged: true,
    retryExecutionGrant: "NOT_REQUESTED",
    firstProviderCallGrant: "NOT_REQUESTED",
    status: "passed",
  };
}

const report = {
  schemaVersion: "r4_gate_document_audit.v1",
  mode: physicalConstructionMode ? (physicalConstructionFinalMode ? "physical-construction-final" : "physical-construction-phase-a") : finalMode ? (coreConstructionMode ? "core-construction-final" : "final") : "draft",
  approvedPacketSha256: `sha256:${packetHash}`,
  crosswalkRowCount: actualRows.length,
  localLinksChecked: Object.values(documents).reduce(
    (count, document) => count + [...document.matchAll(/\[[^\]]+\]\(\.\/[^)]+\)/gu)].length,
    0,
  ),
  firstProviderCallGrant: "not_requested",
  ...(retryConstruction === null ? {} : { retryConstruction }),
  ...(coreConstruction === null ? {} : { coreConstruction }),
  ...(physicalConstruction === null ? {} : { physicalConstruction }),
  status: "passed",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
