import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("installable root package includes the R4 CLI implementation and protocol it imports", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    files?: unknown;
  };
  assert.ok(Array.isArray(packageJson.files));
  assert.equal(packageJson.files.includes("src"), true);
  assert.equal(packageJson.files.includes("packages/r4-local"), true);
  assert.equal(packageJson.files.includes("packages/r4-protocol"), true);
  assert.equal(packageJson.files.includes("schemas"), true);
});
