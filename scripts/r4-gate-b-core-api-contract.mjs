import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  CORE_EXCLUDED_OPERATION_NAMES,
  CORE_OPERATION_INVENTORY,
  CORE_OPERATION_NAMES,
} from "../apps/room/src/core-policy.ts";
import { createPathFence } from "./r4-gate-b-path-fence.mjs";

const PACKET_SHA = "sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6";
const SCOPE_SHA = "sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f";
const INPUTS = [
  "schemas/r4/gate-b-core/operations.md",
  "schemas/r4/api-v1.schema.json",
  "schemas/r4/api-v1-index.json",
  "schemas/r4/schema-index.json",
  "apps/room/src/operation-inventory.ts",
  "apps/room/src/core-policy.ts",
];
const OUTPUTS = [
  "schemas/r4/gate-b-core/api-v1.schema.json",
  "schemas/r4/gate-b-core/api-v1-index.json",
];

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function exactObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_INVALID`);
  }
  return value;
}

function parseCoreMap(markdown) {
  const rows = markdown.split("\n").flatMap((line) => {
    const match = /^\| (\d+) \| `([^`]+)` \| `([A-Z]+) ([^`]+)` \| `([^`]+)` \| (yes|no) \| (yes|no) \|$/u.exec(line);
    return match ? [{
      number: Number(match[1]),
      action: match[2],
      method: match[3],
      path: match[4],
      actor: match[5],
      mutating: match[6] === "yes",
      expectedVersion: match[7] === "yes",
    }] : [];
  });
  if (rows.length !== 32) throw new Error("CORE_OPERATION_MAP_COUNT_DRIFT");
  rows.forEach((row, index) => {
    const expected = CORE_OPERATION_INVENTORY[index];
    if (
      row.number !== index + 1
      || !expected
      || row.action !== expected.name
      || row.method !== expected.method
      || row.path !== expected.path
      || row.actor !== expected.actor
      || row.mutating !== expected.mutating
      || row.expectedVersion !== expected.expectedVersion
    ) throw new Error("CORE_OPERATION_MAP_INVENTORY_DRIFT");
  });
  return rows;
}

function localDefinitionName(reference) {
  const prefix = "#/$defs/";
  if (!reference.startsWith(prefix)) return null;
  const name = reference.slice(prefix.length);
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) throw new Error("CORE_SCHEMA_LOCAL_REF_INVALID");
  return name;
}

function internalReferences(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) internalReferences(item, output);
    return output;
  }
  if (value === null || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      const name = localDefinitionName(child);
      if (name) output.add(name);
    } else {
      internalReferences(child, output);
    }
  }
  return output;
}

function selectedOperations(fullIndex) {
  const byAction = new Map(fullIndex.operations.map((operation) => [operation.action, operation]));
  const selected = CORE_OPERATION_NAMES.map((action) => {
    const operation = byAction.get(action);
    if (!operation) throw new Error("CORE_OPERATION_MISSING_FROM_FULL_INDEX");
    return structuredClone(operation);
  });
  if (
    fullIndex.operations.length !== 45
    || CORE_EXCLUDED_OPERATION_NAMES.some((action) => !byAction.has(action))
    || selected.some((operation, index) => operation.method !== CORE_OPERATION_INVENTORY[index]?.method)
  ) throw new Error("CORE_FULL_INDEX_PARTITION_DRIFT");
  return selected;
}

function prunedDefinitions(fullSchema, operations) {
  const definitions = exactObject(fullSchema.$defs, "FULL_SCHEMA_DEFINITIONS");
  const pending = [];
  for (const operation of operations) {
    pending.push(operation.requestRef, ...operation.resultRefs);
  }
  const selected = new Set();
  while (pending.length > 0) {
    const reference = pending.pop();
    if (typeof reference !== "string") throw new Error("CORE_SCHEMA_REFERENCE_INVALID");
    const name = localDefinitionName(reference);
    if (!name || selected.has(name)) continue;
    const definition = definitions[name];
    if (definition === undefined) throw new Error("CORE_SCHEMA_DEFINITION_MISSING");
    selected.add(name);
    for (const dependency of internalReferences(definition)) {
      pending.push(`#/$defs/${dependency}`);
    }
  }
  return Object.fromEntries(
    [...selected].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)))
      .map((name) => [name, definitions[name]]),
  );
}

export function buildCoreContractArtifacts() {
  const operationMap = fs.readFileSync(INPUTS[0], "utf8");
  parseCoreMap(operationMap);
  const fullSchemaBytes = fs.readFileSync(INPUTS[1], "utf8");
  const fullIndexBytes = fs.readFileSync(INPUTS[2], "utf8");
  const protocolIndexBytes = fs.readFileSync(INPUTS[3], "utf8");
  const inventoryBytes = fs.readFileSync(INPUTS[4], "utf8");
  const corePolicyBytes = fs.readFileSync(INPUTS[5], "utf8");
  const fullSchema = exactObject(JSON.parse(fullSchemaBytes), "FULL_SCHEMA");
  const fullIndex = exactObject(JSON.parse(fullIndexBytes), "FULL_INDEX");
  const operations = selectedOperations(fullIndex);
  const coreSchema = {
    $schema: fullSchema.$schema,
    $id: "https://forme.example/schemas/r4/gate-b-core/api-v1.v1.schema.json",
    title: "Forme R4 Demo-critical Core closed API v1 operation schemas",
    $comment: `Core-32 overlay constructed offline under Packet ${PACKET_SHA}; Full remains unchanged.`,
    $defs: prunedDefinitions(fullSchema, operations),
  };
  const schemaBytes = jsonBytes(coreSchema);
  const coreIndex = {
    schemaVersion: "r4.gate-b-core.api-v1-index.v1",
    constructionPacketSha256: PACKET_SHA,
    scopeDecisionBriefSha256: SCOPE_SHA,
    operationMapSha256: sha256(operationMap),
    fullApiBundleSha256: sha256(fullSchemaBytes),
    fullApiIndexSha256: sha256(fullIndexBytes),
    canonicalProtocolRegistrySha256: sha256(protocolIndexBytes),
    operationInventorySha256: sha256(inventoryBytes),
    corePolicySha256: sha256(corePolicyBytes),
    bundleSha256: sha256(schemaBytes),
    operationCount: operations.length,
    mutationCount: operations.filter((operation) => operation.mutating).length,
    readCount: operations.filter((operation) => !operation.mutating).length,
    expectedVersionRequiredCount: operations.filter((operation) => operation.expectedVersion).length,
    operations,
    excludedOperations: [...CORE_EXCLUDED_OPERATION_NAMES],
  };
  if (
    coreIndex.operationCount !== 32
    || coreIndex.mutationCount !== 26
    || coreIndex.readCount !== 6
    || coreIndex.expectedVersionRequiredCount !== 21
  ) throw new Error("CORE_OPERATION_COUNTS_DRIFT");
  return Object.freeze({
    [OUTPUTS[0]]: schemaBytes,
    [OUTPUTS[1]]: jsonBytes(coreIndex),
  });
}

function writeOrCheck(mode) {
  const constructionTempRoot = process.env.FORME_CONSTRUCTION_TEMP_ROOT;
  if (typeof constructionTempRoot !== "string" || constructionTempRoot.length === 0) {
    throw new Error("CONSTRUCTION_TEMP_ROOT_REQUIRED");
  }
  const fence = createPathFence({
    repositoryRoot: fs.realpathSync(process.cwd()),
    constructionTempRoot,
    repositoryAllowlist: [...INPUTS, ...OUTPUTS].map((entry) => ({ path: entry, access: "exact" })),
    tempAllowlist: [{ path: "core-api-generated", access: "tree" }],
  });
  for (const input of INPUTS) fence.resolveRepository(input, { kind: "file" });
  const artifacts = buildCoreContractArtifacts();
  const hashes = {};
  for (const output of OUTPUTS) {
    const target = fence.resolveRepository(output, { mustExist: mode === "check", kind: "file" });
    const bytes = artifacts[output];
    if (typeof bytes !== "string") throw new Error("CORE_ARTIFACT_MISSING");
    if (mode === "write") {
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      fs.writeFileSync(target, bytes, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } else if (fs.readFileSync(target, "utf8") !== bytes) {
      throw new Error("CORE_GENERATED_CONTRACT_DRIFT");
    }
    hashes[output] = sha256(bytes);
  }
  process.stdout.write(jsonBytes({
    schemaVersion: "r4.gate-b-core.api-contract-construction.v1",
    status: "GREEN_OFFLINE",
    mode,
    operationCount: 32,
    mutationCount: 26,
    readCount: 6,
    expectedVersionRequiredCount: 21,
    realEffects: 0,
    hashes,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode !== "write" && mode !== "check") throw new Error("USAGE_WRITE_OR_CHECK");
  writeOrCheck(mode);
}
