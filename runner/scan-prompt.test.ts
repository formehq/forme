import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScanPrompt } from "./scan-prompt.ts";

test("scan prompt is English-first while preserving multilingual evidence and target text (#29)", () => {
  const prompt = buildScanPrompt({
    maxCards: 2,
    files: ["Roadmap.md"],
    slowFiles: [],
    slowRoot: ".",
    tasteRules: [],
  });
  assert.match(prompt, /All newly generated product-facing prose is English regardless of the vault's main language/);
  assert.match(prompt, /Quotes stay verbatim in their original language/);
  assert.match(prompt, /after must fit the target document's language and style/);
  assert.doesNotMatch(prompt, /[\u3400-\u9fff]/u);
});
