import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SOURCE = readFileSync("packages/r4-codex-adapter/src/fresh-candidate-brokered-session.ts", "utf8");
const SCRIPT = readFileSync("scripts/r4-fresh-candidate-synthetic-provider-round-trip.mjs", "utf8");
const CODEX_EXEC_SCRIPT = readFileSync("scripts/r4-fresh-candidate-codex-exec.mjs", "utf8");

test("#68 brokered physical lane is synthetic, loopback-only and candidate-body-free", () => {
  assert.match(SOURCE, /buildSyntheticFreshCandidateProviderSse/u);
  assert.match(SOURCE, /server\.listen\(0, "127\.0\.0\.1"/u);
  assert.match(SOURCE, /providerCalls: 0/u);
  assert.match(SOURCE, /externalNetworkCalls: 0/u);
  assert.match(SOURCE, /persistedCandidateBytes: 0/u);
  assert.match(SOURCE, /responseBody\.fill\(0\)/u);
  assert.match(SOURCE, /brokerState\.captured\?\.fill\(0\)/u);
  assert.doesNotMatch(SOURCE, /api\.openai\.com|OPENAI_API_KEY|openAIResponsesBodyTransport/u);
});

test("#68 synthetic Provider CLI exposes only one exact execute command", () => {
  assert.match(SCRIPT, /process\.argv\.length !== 3 \|\| process\.argv\[2\] !== "execute"/u);
  assert.match(SCRIPT, /runPinnedFreshCandidateSyntheticProviderRoundTrip/u);
  assert.doesNotMatch(SCRIPT, /credential|allow-provider|api\.openai\.com/u);
});

test("#68 Codex exec CLI is exact-envelope, one-invocation and body-free by default", () => {
  assert.match(CODEX_EXEC_SCRIPT, /process\.argv\[2\] === "inspect"/u);
  assert.match(CODEX_EXEC_SCRIPT, /process\.argv\[2\] === "execute-once"/u);
  assert.match(CODEX_EXEC_SCRIPT, /cliInvocationLimit: 1/u);
  assert.match(CODEX_EXEC_SCRIPT, /flag: exclusive \? "wx" : "w"/u);
  assert.match(CODEX_EXEC_SCRIPT, /generateStructuredPacket/u);
  assert.match(CODEX_EXEC_SCRIPT, /candidate: \{ bodyOutputBytes: 0, persistedBodyBytes: 0 \}/u);
  assert.doesNotMatch(CODEX_EXEC_SCRIPT, /OPENAI_API_KEY|CODEX_API_KEY|api\.openai\.com/u);
});
