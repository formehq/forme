import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import babelParser from "next/dist/compiled/babel/parser.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedPacket = "e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5";

function bytes(name) {
  return readFileSync(join(root, name));
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function filesUnder(directory) {
  const absolute = join(root, directory);
  const output = [];
  for (const name of readdirSync(absolute)) {
    if (name === "node_modules" || name === ".next" || name === "dist" || name === "coverage") continue;
    const file = join(absolute, name);
    if (statSync(file).isDirectory()) output.push(...filesUnder(relative(root, file)));
    else output.push(file);
  }
  return output.sort();
}

function sourceFiles(directory) {
  return filesUnder(directory).filter((file) => [".ts", ".tsx", ".js", ".mjs"].includes(extname(file)));
}

function inspectSource(file, source) {
  let ast;
  try {
    ast = babelParser.parse(source, {
      sourceType: "unambiguous",
      errorRecovery: false,
      allowAwaitOutsideFunction: true,
      plugins: extname(file) === ".tsx" ? ["typescript", "jsx"] : ["typescript"],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`static audit parser rejected ${file}:${detail}`);
  }
  const moduleSpecifiers = [];
  const dynamicModuleLoads = [];
  const nonLocalFetches = [];
  const processExecutionCalls = [];

  function staticSpecifier(node) {
    return node?.type === "StringLiteral" ? node.value : null;
  }

  function memberName(node) {
    if (node?.type !== "MemberExpression" && node?.type !== "OptionalMemberExpression") return null;
    const object = node.object?.type === "Identifier" ? node.object.name : null;
    const property = node.computed
      ? staticSpecifier(node.property)
      : node.property?.type === "Identifier" ? node.property.name : null;
    return object && property ? `${object}.${property}` : null;
  }

  function recordModuleCall(node, label) {
    const args = node.arguments ?? [];
    const specifier = args.length === 1 ? staticSpecifier(args[0]) : null;
    if (specifier !== null) moduleSpecifiers.push(specifier);
    else dynamicModuleLoads.push(label);
  }

  const stack = [ast.program];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type)) {
      const specifier = staticSpecifier(node.source);
      if (specifier !== null) moduleSpecifiers.push(specifier);
    } else if (node.type === "TSImportType") {
      const specifier = staticSpecifier(node.argument);
      if (specifier !== null) moduleSpecifiers.push(specifier);
      else dynamicModuleLoads.push("import(type-expression)");
    } else if (node.type === "TSExternalModuleReference") {
      const specifier = staticSpecifier(node.expression);
      if (specifier !== null) moduleSpecifiers.push(specifier);
      else dynamicModuleLoads.push("require(type-expression)");
    } else if (node.type === "ImportExpression") {
      const specifier = staticSpecifier(node.source);
      if (specifier !== null) moduleSpecifiers.push(specifier);
      else dynamicModuleLoads.push("import(expression)");
    } else if (node.type === "CallExpression" || node.type === "OptionalCallExpression" || node.type === "NewExpression") {
      const callee = node.callee;
      const directName = callee?.type === "Identifier" ? callee.name : null;
      const member = memberName(callee);
      if (callee?.type === "Import") recordModuleCall(node, "import(expression)");
      else if (directName === "require") recordModuleCall(node, "require(expression)");
      else if (member === "require.resolve") recordModuleCall(node, "require.resolve(expression)");

      if (directName === "fetch") {
        const first = node.arguments?.[0];
        const localString = staticSpecifier(first)?.startsWith("/") === true;
        const localTemplate = first?.type === "TemplateLiteral"
          && first.quasis?.[0]?.value?.raw?.startsWith("/") === true;
        if (!localString && !localTemplate) nonLocalFetches.push("fetch(non-local)");
      }
      if (
        ["eval", "Function"].includes(directName)
        || ["Bun.spawn", "Bun.spawnSync", "Deno.Command", "Deno.run", "process.binding", "process.dlopen"].includes(member)
      ) processExecutionCalls.push(member ?? directName);
    }

    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments", "errors"].includes(key)) continue;
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) {
          if (value[index] && typeof value[index] === "object") stack.push(value[index]);
        }
      } else if (value && typeof value === "object") stack.push(value);
    }
  }
  return { moduleSpecifiers, dynamicModuleLoads, nonLocalFetches, processExecutionCalls };
}

function aggregate(fileNames) {
  const digest = createHash("sha256");
  for (const file of fileNames.sort()) {
    digest.update(relative(root, file));
    digest.update("\0");
    digest.update(readFileSync(file));
    digest.update("\0");
  }
  return digest.digest("hex");
}

const packetHash = sha(bytes("docs/R4-TECHNICAL-CONTROL-PACKET.md"));
if (packetHash !== expectedPacket) throw new Error(`approved Packet hash drifted:${packetHash}`);

const protocolFiles = sourceFiles("packages/r4-protocol/src");
const protocolImportViolations = [];
for (const file of protocolFiles) {
  const source = readFileSync(file, "utf8");
  for (const specifier of inspectSource(file, source).moduleSpecifiers) {
    if (!specifier.startsWith("./")) protocolImportViolations.push(specifier);
  }
}
if (protocolImportViolations.length > 0) throw new Error(`protocol package has non-relative imports:${[...new Set(protocolImportViolations)].join(",")}`);

const roomPackage = JSON.parse(bytes("apps/room/package.json"));
const roomDependencies = Object.keys(roomPackage.dependencies ?? {}).sort();
const allowedRoomDependencies = ["next", "react", "react-dom"];
if (JSON.stringify(roomDependencies) !== JSON.stringify(allowedRoomDependencies)) {
  throw new Error(`hosted dependency boundary widened:${roomDependencies.join(",")}`);
}

const roomFiles = [
  ...sourceFiles("apps/room/app"),
  ...sourceFiles("apps/room/src"),
  join(root, "apps/room/next.config.ts"),
].sort();
const forbiddenHostedImports = /^(?:(?:node:)?(?:child_process|fs|http|https|net|tls|dgram|dns|cluster|worker_threads|vm|module)|openai|ai|@ai-sdk|@anthropic-ai|@google\/generative-ai|cohere-ai|@mistralai|groq-sdk|langchain|@langchain|nodemailer|resend|@sendgrid)(?:\/|$)/u;

const adversarialModuleFixtures = [
  ['import "node:fs";', "node:fs"],
  ['import value from "node:child_process";', "node:child_process"],
  ['export { value } from "node:http";', "node:http"],
  ['const value = require("node:fs/promises");', "node:fs/promises"],
  ['const value = require.resolve("openai");', "openai"],
  ['const value = import("@ai-sdk/openai");', "@ai-sdk/openai"],
  ['const a = "/*"; import "node:fs"; const b = "*/";', "node:fs"],
  ['const a=/[/*]/; import "node:fs"; const b=/[*/]/;', "node:fs"],
];
for (const [source, wanted] of adversarialModuleFixtures) {
  const found = inspectSource("synthetic-adversarial.ts", source).moduleSpecifiers;
  if (!found.includes(wanted) || !forbiddenHostedImports.test(wanted)) {
    throw new Error(`static audit self-test missed forbidden module spelling:${source}`);
  }
}
if (inspectSource("synthetic-adversarial.ts", '/* import "node:fs"; */ export const safe = true;').moduleSpecifiers.length !== 0) {
  throw new Error("static audit self-test treated a comment as executable import syntax");
}
for (const source of ['require(runtimeName);', 'import(runtimeName);']) {
  if (inspectSource("synthetic-adversarial.ts", source).dynamicModuleLoads.length !== 1) {
    throw new Error(`static audit self-test missed dynamic module load:${source}`);
  }
}
if (inspectSource("synthetic-adversarial.ts", 'fetch(providerUrl);').nonLocalFetches.length !== 1) {
  throw new Error("static audit self-test missed dynamic external fetch");
}
if (inspectSource("synthetic-adversarial.ts", 'Bun.spawn(["provider"]);').processExecutionCalls.length !== 1) {
  throw new Error("static audit self-test missed process execution");
}

const hostedImportViolations = [];
const externalFetchViolations = [];
const dynamicModuleLoadViolations = [];
const processExecutionViolations = [];
for (const file of roomFiles) {
  const source = readFileSync(file, "utf8");
  const inspection = inspectSource(file, source);
  for (const specifier of inspection.moduleSpecifiers) {
    if (forbiddenHostedImports.test(specifier)) hostedImportViolations.push(specifier);
  }
  if (inspection.nonLocalFetches.length > 0) externalFetchViolations.push(relative(root, file));
  if (inspection.dynamicModuleLoads.length > 0) dynamicModuleLoadViolations.push(relative(root, file));
  if (inspection.processExecutionCalls.length > 0) processExecutionViolations.push(relative(root, file));
}
if (hostedImportViolations.length > 0) throw new Error(`hosted forbidden import:${[...new Set(hostedImportViolations)].join(",")}`);
if (externalFetchViolations.length > 0) throw new Error(`hosted non-local fetch:${externalFetchViolations.join(",")}`);
if (dynamicModuleLoadViolations.length > 0) throw new Error(`hosted dynamic module load:${dynamicModuleLoadViolations.join(",")}`);
if (processExecutionViolations.length > 0) throw new Error(`hosted process execution:${processExecutionViolations.join(",")}`);

const gateAFiles = [
  ...sourceFiles("packages/r4-local/src"),
  ...sourceFiles("packages/r4-protocol/src"),
  ...roomFiles,
  ...sourceFiles("test/r4"),
].filter((file) => !file.includes("/.next/") && !file.includes("/node_modules/"));
const absoluteOwnerReferences = gateAFiles.filter((file) => /\/Users\/zaynw\/|Zayn-Knowledge-DB|Obsidian\//u.test(readFileSync(file, "utf8")));
if (absoluteOwnerReferences.length > 0) throw new Error("R4 Gate A source contains a real Owner filesystem reference");

const migrationFiles = filesUnder("apps/room").filter((file) => extname(file) === ".sql");
if (migrationFiles.length > 0) throw new Error("Gate A unexpectedly contains an executable schema migration");

const report = {
  schemaVersion: "r4_gate_a_static_audit.v1",
  approvedPacketSha256: `sha256:${packetHash}`,
  protocol: {
    fileCount: protocolFiles.length,
    aggregateSha256: `sha256:${aggregate(protocolFiles)}`,
    nonRelativeImportCount: 0,
  },
  hosted: {
    fileCount: roomFiles.length,
    aggregateSha256: `sha256:${aggregate(roomFiles)}`,
    dependencyCount: roomDependencies.length,
    modelProviderDependencyCount: 0,
    sourceReaderImportCount: 0,
    processExecutionImportCount: 0,
    externalFetchLiteralCount: 0,
    dynamicModuleLoadCount: 0,
  },
  authorizedEffects: {
    realProviderCallCount: 0,
    providerSpendUsd: 0,
    realGuestByteCount: 0,
    externalMessageCount: 0,
    hostedProductionMutationCount: 0,
    schemaMigrationExecutionCount: 0,
    deploymentOrPublicTrafficCount: 0,
    productionSecretIssuanceCount: 0,
  },
  migrationFileCount: migrationFiles.length,
  realOwnerReferenceCount: 0,
  status: "passed_static_repository_boundary",
};

console.log(JSON.stringify(report, null, 2));
