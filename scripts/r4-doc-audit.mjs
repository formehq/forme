import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
const files = {
  packet: "docs/R4-TECHNICAL-CONTROL-PACKET.md",
  verification: "docs/R4-GATE-A-VERIFICATION.md",
  manifest: "docs/R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md",
  ownerReview: "docs/R4-GATE-B-OWNER-REVIEW.md",
};
const expectedPacket = "e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5";

function text(path) {
  return readFileSync(join(root, path), "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const documents = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, text(path)]));
const packetHash = sha256(documents.packet);
if (packetHash !== expectedPacket) throw new Error(`approved Packet hash drifted:${packetHash}`);

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
  const familyCounts = Object.fromEntries(
    ["public_guest", "controller", "curator", "room_operator"].map((family) => [
      family,
      OPERATION_INVENTORY.filter((operation) => operation.family === family).length,
    ]),
  );
  const mutationCount = OPERATION_INVENTORY.filter((operation) => operation.mutating).length;
  const expectedInventoryMarkdown = sourceInventory.entries
    .map((entry) => `\`${entry.path}\`  \`sha256:${entry.sha256}\`  `)
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
    [documents.ownerReview.includes(manifestHash), "owner-review:manifest-hash"],
    [documents.ownerReview.includes(`${PROTOCOL_SCHEMA_VERSIONS.length} 个对象`), "owner-review:protocol-object-count"],
    [documents.ownerReview.includes(`${OPERATION_INVENTORY.length} 个固定动作`), "owner-review:operation-count"],
  ];
  const drift = finalBindings.filter(([passed]) => !passed).map(([, name]) => name);
  if (drift.length > 0) throw new Error(`final documentation binding drift:${drift.join(",")}`);
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
  status: "passed",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
