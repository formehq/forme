import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const inventoryRoots = [
  "README.md",
  "bin",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "src",
  "apps/room",
  "packages/r4-local",
  "packages/r4-protocol",
  "schemas/r4",
  "scripts",
  "test",
];
const ignoredNames = new Set([".next", "node_modules", "dist", "coverage"]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function collect(path) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink()) {
    throw new Error(`inventory refuses symbolic link:${relative(root, path)}`);
  }
  if (metadata.isFile()) {
    if (path.endsWith(".tsbuildinfo")) return [];
    return [path];
  }
  if (!metadata.isDirectory()) {
    throw new Error(`inventory refuses non-file entry:${relative(root, path)}`);
  }
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => !ignoredNames.has(entry.name))
    .flatMap((entry) => collect(join(path, entry.name)));
}

export function buildSourceInventory() {
  const paths = inventoryRoots
    .flatMap((path) => collect(join(root, path)))
    .map((path) => relative(root, path))
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const entries = paths.map((path) => ({ path, sha256: sha256(readFileSync(join(root, path))) }));
  const canonicalLines = entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join("");
  return {
    schemaVersion: "r4_gate_a_source_inventory.v1",
    fileCount: entries.length,
    inventorySha256: `sha256:${sha256(canonicalLines)}`,
    entries,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildSourceInventory();
  if (process.argv.includes("--markdown")) {
    for (const entry of report.entries) {
      process.stdout.write(`\`${entry.path}\`  \`sha256:${entry.sha256}\`  \n`);
    }
  } else {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
}
