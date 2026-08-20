import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { JsonValue } from "../../packages/r4-protocol/src/index.ts";
import {
  FRESH_CANDIDATE_BASE_INSTRUCTIONS,
  FRESH_CANDIDATE_CAPTURED_UPDATE_PLAN_TOOL,
  FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
  FRESH_CANDIDATE_MAXIMUM_THEORETICAL_USD,
  FRESH_CANDIDATE_MAXIMUM_USD,
  FRESH_CANDIDATE_MODEL,
  FRESH_CANDIDATE_OUTPUT_SCHEMA,
  FRESH_CANDIDATE_REASONING_EFFORT,
  buildFreshCandidateAppServerCommand,
  buildSyntheticFreshCandidatePreflightPrompt,
  compileFreshCandidateUpstreamRequest,
  type FreshCandidatePreflightPrompt,
} from "../../packages/r4-codex-adapter/src/index.ts";

function capturedRequest(prompt: FreshCandidatePreflightPrompt): Record<string, JsonValue> {
  return {
    client_metadata: {
      session_id: "session-opaque",
      thread_id: "thread-opaque",
      turn_id: "turn-opaque",
      "x-codex-installation-id": "installation-opaque",
      "x-codex-turn-metadata": "metadata-opaque",
      "x-codex-window-id": "window-opaque",
    },
    include: ["reasoning.encrypted_content"],
    input: [
      { type: "message", role: "developer", content: [{ type: "input_text", text: prompt.orientationText }] },
      { type: "message", role: "user", content: [{ type: "input_text", text: prompt.userPayloadText }] },
    ],
    instructions: FRESH_CANDIDATE_BASE_INSTRUCTIONS,
    model: FRESH_CANDIDATE_MODEL,
    parallel_tool_calls: false,
    prompt_cache_key: "cache-opaque",
    reasoning: { effort: FRESH_CANDIDATE_REASONING_EFFORT },
    store: false,
    stream: true,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        strict: true,
        schema: FRESH_CANDIDATE_OUTPUT_SCHEMA,
        name: "codex_output_schema",
      },
    },
    tool_choice: "auto",
    tools: [FRESH_CANDIDATE_CAPTURED_UPDATE_PLAN_TOOL],
  };
}

function compile(captured: JsonValue, prompt = buildSyntheticFreshCandidatePreflightPrompt()) {
  return compileFreshCandidateUpstreamRequest({ captured, prompt, temporaryRoot: "/private/tmp/forme-test-root" });
}

test("#68 broker rebuilds one deterministic, tool-free, hard-capped upstream envelope", () => {
  const prompt = buildSyntheticFreshCandidatePreflightPrompt();
  const firstCaptured = capturedRequest(prompt);
  const first = compile(firstCaptured, prompt);
  const secondCaptured = capturedRequest(prompt);
  const metadata = secondCaptured.client_metadata as Record<string, JsonValue>;
  for (const key of Object.keys(metadata)) metadata[key] = `different-${key}`;
  secondCaptured.prompt_cache_key = "different-cache-key";
  const second = compile(secondCaptured, prompt);

  assert.equal(second.requestShapeSha256, first.requestShapeSha256);
  assert.equal(first.capturedToolNames[0], "update_plan");
  const request = first.request as Record<string, JsonValue>;
  assert.deepEqual(Object.keys(request).sort(), [
    "input", "instructions", "max_output_tokens", "model", "reasoning", "store", "stream", "text",
  ]);
  assert.equal(request.max_output_tokens, FRESH_CANDIDATE_MAX_OUTPUT_TOKENS);
  assert.ok(first.providerVisibleRequestBytes <= 32_000);
  assert.equal(FRESH_CANDIDATE_MAXIMUM_THEORETICAL_USD, 0.19072);
  assert.ok(FRESH_CANDIDATE_MAXIMUM_THEORETICAL_USD < FRESH_CANDIDATE_MAXIMUM_USD);
  assert.equal(request.model, FRESH_CANDIDATE_MODEL);
  assert.equal(request.store, false);
  assert.equal(request.stream, true);
  assert.equal(Object.hasOwn(request, "tools"), false);
  assert.equal(Object.hasOwn(request, "tool_choice"), false);
  assert.equal(Object.hasOwn(request, "client_metadata"), false);
  assert.equal(Object.hasOwn(request, "prompt_cache_key"), false);
  assert.equal(Object.hasOwn(request, "include"), false);
  assert.match(first.requestShapeSha256, /^sha256:[0-9a-f]{64}$/u);
});

test("#68 broker rejects captured request, tool, metadata, input and path drift before forwarding", () => {
  const prompt = buildSyntheticFreshCandidatePreflightPrompt();

  const extraKey = capturedRequest(prompt);
  extraKey.max_output_tokens = 1;
  assert.throws(() => compile(extraKey, prompt), /FRESH_CAPTURE_KEYS_DRIFT/u);

  const extraTool = capturedRequest(prompt);
  (extraTool.tools as JsonValue[]).push(FRESH_CANDIDATE_CAPTURED_UPDATE_PLAN_TOOL);
  assert.throws(() => compile(extraTool, prompt), /FRESH_CAPTURE_TOOL_SET_DRIFT/u);

  const changedTool = capturedRequest(prompt);
  const tool = structuredClone((changedTool.tools as JsonValue[])[0]) as Record<string, JsonValue>;
  tool.description = "drifted";
  changedTool.tools = [tool];
  assert.throws(() => compile(changedTool, prompt), /FRESH_CAPTURE_TOOL_SET_DRIFT/u);

  const invalidMetadata = capturedRequest(prompt);
  (invalidMetadata.client_metadata as Record<string, JsonValue>).session_id = 7;
  assert.throws(() => compile(invalidMetadata, prompt), /FRESH_CAPTURE_METADATA_DRIFT/u);

  const changedInput = capturedRequest(prompt);
  (changedInput.input as JsonValue[]).push({ type: "message", role: "user", content: [] });
  assert.throws(() => compile(changedInput, prompt), /FRESH_CAPTURE_INPUT_DRIFT/u);

  const leakedPath = capturedRequest(prompt);
  leakedPath.instructions = `${FRESH_CANDIDATE_BASE_INSTRUCTIONS}\n/Users/owner/private`;
  assert.throws(() => compile(leakedPath, prompt), /FRESH_CAPTURE_PATH_LEAK/u);
});

test("#68 broker enforces the conservative input ceiling", () => {
  const base = buildSyntheticFreshCandidatePreflightPrompt();
  const oversized = {
    ...base,
    userPayloadText: "x".repeat(32_000),
  } satisfies FreshCandidatePreflightPrompt;
  assert.throws(() => compile(capturedRequest(oversized), oversized), /FRESH_INPUT_CEILING_EXCEEDED/u);
});

test("#68 native command has one loopback destination, isolated homes and no provider credential", () => {
  const command = buildFreshCandidateAppServerCommand({
    codexNative: "/private/tmp/forme-test-root/codex-native",
    seatbeltProfilePath: "/private/tmp/forme-test-root/seatbelt.sb",
    modelCatalogPath: "/private/tmp/forme-test-root/model-catalog.json",
    sessionRoot: "/private/tmp/forme-test-root/session-root",
    isolatedHome: "/private/tmp/forme-test-root/home",
    isolatedCodexHome: "/private/tmp/forme-test-root/codex-home",
    isolatedTmpdir: "/private/tmp/forme-test-root/tmp",
    capturePort: 43_123,
  });
  assert.equal(command.argv[0], "/usr/bin/sandbox-exec");
  assert.ok(command.argv.includes("CAPTURE_ENDPOINT=localhost:43123"));
  assert.ok(command.argv.includes("model_providers.forme_capture.base_url=\"http://127.0.0.1:43123/v1\""));
  assert.ok(command.argv.includes("--strict-config"));
  assert.equal(command.cwd, "/private/tmp/forme-test-root/session-root");
  assert.equal(command.env.HOME, "/private/tmp/forme-test-root/home");
  assert.equal(command.env.CODEX_HOME, "/private/tmp/forme-test-root/codex-home");
  assert.equal(command.env.CODEX_INTERNAL_APP_SERVER_REMOTE_CONTROL_DISABLED, "1");
  assert.equal(Object.hasOwn(command.env, "OPENAI_API_KEY"), false);
  assert.doesNotMatch(command.argv.join("\n"), /api\.openai\.com/u);
});

test("#68 Seatbelt profile denies external network and descendants without broad file access", () => {
  const profile = readFileSync("schemas/r4/macos/forme-fresh-candidate-preflight.sb", "utf8");
  assert.match(profile, /\(deny default\)/u);
  assert.match(profile, /\(import "dyld-support\.sb"\)/u);
  assert.doesNotMatch(profile, /\(import "system\.sb"\)/u);
  assert.match(profile, /\(deny network\*\)/u);
  assert.match(profile, /\(deny process-fork\)/u);
  assert.match(profile, /\(allow process-exec \(literal \(param "CODEX_NATIVE"\)\)\)/u);
  assert.equal((profile.match(/\(allow network-outbound/gu) ?? []).length, 1);
  assert.doesNotMatch(profile, /\(allow file-read\*\)\s*$/mu);
});
