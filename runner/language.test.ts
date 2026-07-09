import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cardLanguageInstruction, detectTextLanguage, detectVaultLanguage } from "./language.ts";

test("card language follows the vault evidence instead of an owner default", () => {
  assert.equal(detectTextLanguage("这是一个以中文为主的知识库，记录项目判断、行动和长期方向。".repeat(4)), "zh");
  assert.equal(detectTextLanguage("This vault records product decisions, commitments, and long-term working assumptions. ".repeat(4)), "en");
  assert.equal(detectTextLanguage("项目 decision: ship the beta next week，然后复盘 retention signal。".repeat(3)), "mixed");
  assert.match(cardLanguageInstruction("en"), /in English/);
  assert.doesNotMatch(cardLanguageInstruction("en"), /使用简体中文/);
});

test("detectVaultLanguage reads only the selected git-window files", () => {
  const vault = mkdtempSync(join(tmpdir(), "forme-lang-"));
  writeFileSync(join(vault, "english.md"), "# Product direction\n\nWe will test the smallest useful workflow before adding automation.\n".repeat(3));
  writeFileSync(join(vault, "中文.md"), "# 产品方向\n\n先验证最小工作流，再增加自动化。\n".repeat(3));
  assert.equal(detectVaultLanguage(vault, ["english.md"]), "en");
  assert.equal(detectVaultLanguage(vault, ["中文.md"]), "zh");
  assert.equal(detectVaultLanguage(vault, ["../outside.md"]), "mixed");
});
