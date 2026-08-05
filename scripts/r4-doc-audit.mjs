import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { OPERATION_INVENTORY } from "../apps/room/src/operation-inventory.ts";
import {
  GOLDEN_FIXTURE_BUNDLE_SHA256,
  canonicalSha256,
  verifyGoldenVectors,
} from "../packages/r4-protocol/src/index.ts";
import { PROTOCOL_SCHEMA_VERSIONS } from "../packages/r4-protocol/src/registry.ts";
import { buildSourceInventory } from "./r4-source-inventory.mjs";

const root = resolve(import.meta.dirname, "..");
const finalMode = process.argv.includes("--final");
const retryConstructionMode = process.argv.includes("--retry-construction");
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

if (finalMode) {
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
  if (subjects.length !== 10) throw new Error(`Retry Construction checkpoint count drifted:${subjects.length}`);
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

const report = {
  schemaVersion: "r4_gate_document_audit.v1",
  mode: finalMode ? "final" : "draft",
  approvedPacketSha256: `sha256:${packetHash}`,
  crosswalkRowCount: actualRows.length,
  localLinksChecked: Object.values(documents).reduce(
    (count, document) => count + [...document.matchAll(/\[[^\]]+\]\(\.\/[^)]+\)/gu)].length,
    0,
  ),
  firstProviderCallGrant: "not_requested",
  ...(retryConstruction === null ? {} : { retryConstruction }),
  status: "passed",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
