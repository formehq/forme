import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["app", "src"];
const forbiddenImports = [
  /^openai(?:\/|$)/,
  /^@ai-sdk(?:\/|$)/,
  /^ai(?:\/|$)/,
  /^@anthropic-ai(?:\/|$)/,
  /^node:child_process$/,
  /^node:fs(?:\/promises)?$/,
];

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if ([".ts", ".tsx", ".js", ".mjs"].includes(extname(entry.name))) result.push(path);
  }
  return result;
}

const violations = [];
for (const root of roots) {
  for (const path of await files(root)) {
    const source = await readFile(path, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)) {
      const specifier = match[2];
      if (specifier && forbiddenImports.some((pattern) => pattern.test(specifier))) {
        violations.push(`${path}: forbidden hosted import ${specifier}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Hosted Room import boundary passed: no model/provider, child-process, or source-reader import path.");
}
