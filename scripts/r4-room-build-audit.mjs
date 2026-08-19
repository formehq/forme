import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = join(root, "apps/room/.next/server");

function filesUnder(directory) {
  const output = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) output.push(...filesUnder(path));
    else output.push(path);
  }
  return output;
}

let buildFiles;
try {
  buildFiles = filesUnder(serverRoot);
} catch {
  throw new Error("Room build audit requires apps/room/.next/server; run the Next build first");
}

const traceFiles = buildFiles.filter((file) => file.endsWith(".nft.json"));
const routeChunks = buildFiles.filter((file) => {
  const path = relative(serverRoot, file);
  return path.startsWith("app/") && [".js", ".mjs", ".cjs"].includes(extname(file));
});
if (traceFiles.length === 0 || routeChunks.length === 0) {
  throw new Error("Room build audit found no server dependency traces or route chunks");
}

const forbiddenPackage = /(?:^|\/)node_modules\/(?:openai|ai|@ai-sdk|@anthropic-ai|@google\/generative-ai|cohere-ai|@mistralai|groq-sdk|langchain|@langchain|nodemailer|resend|@sendgrid)(?:\/|$)/u;
const ownerPath = /(?:\/Users\/zaynw\/|Zayn-Knowledge-DB|Obsidian\/)/u;
const forbiddenRuntime = /["'](?:node:)?(?:child_process|fs(?:\/promises)?|http|https|net|tls|dgram|dns|cluster|worker_threads|vm|module)["']|Bun\.(?:spawn|spawnSync)|Deno\.(?:Command|run)|process\.(?:binding|dlopen)/u;
const violations = [];

for (const file of traceFiles) {
  const raw = readFileSync(file, "utf8");
  let trace;
  try {
    trace = JSON.parse(raw);
  } catch {
    violations.push(`${relative(root, file)}:invalid_trace_json`);
    continue;
  }
  const entries = Array.isArray(trace.files) ? trace.files : [];
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const normalized = entry.replaceAll("\\", "/");
    if (forbiddenPackage.test(normalized)) violations.push(`${relative(root, file)}:forbidden_package:${normalized}`);
    if (ownerPath.test(normalized)) violations.push(`${relative(root, file)}:owner_path:${normalized}`);
  }
}

for (const file of routeChunks) {
  const source = readFileSync(file, "utf8");
  if (forbiddenPackage.test(source)) violations.push(`${relative(root, file)}:forbidden_package_marker`);
  if (ownerPath.test(source)) violations.push(`${relative(root, file)}:owner_path_marker`);
  if (forbiddenRuntime.test(source)) violations.push(`${relative(root, file)}:source_reader_or_process_execution_marker`);
}

if (violations.length > 0) {
  throw new Error(`Room post-build boundary failed:\n${violations.join("\n")}`);
}

console.log(JSON.stringify({
  schemaVersion: "r4_room_build_audit.v1",
  routeChunkCount: routeChunks.length,
  dependencyTraceCount: traceFiles.length,
  modelOrProviderPackageCount: 0,
  ownerPathCount: 0,
  sourceReaderOrProcessExecutionMarkerCount: 0,
  status: "passed_post_build_boundary",
}, null, 2));
