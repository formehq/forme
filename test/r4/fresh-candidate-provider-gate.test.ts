import assert from "node:assert/strict";
import test from "node:test";

import {
  admitFreshCandidateProviderSse,
  buildSyntheticFreshCandidateProviderSse,
  dispatchFreshCandidateProviderOnce,
} from "../../packages/r4-codex-adapter/src/index.ts";
import { canonicalJson, canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";

const REQUEST = Object.freeze({
  model: "gpt-5.6-sol",
  input: "synthetic exact request",
  stream: true,
  max_output_tokens: 1_024,
});
const REQUEST_HASH = canonicalSha256(REQUEST);
const CREDENTIAL = Buffer.from("sk-synthetic-not-a-real-provider-credential", "utf8");

function mutateCompleted(body: Buffer, mutate: (response: Record<string, unknown>) => void): Buffer {
  const frames = body.toString("utf8").split("\n\n").filter(Boolean);
  const index = frames.findIndex((frame) => frame.startsWith("event: response.completed\n"));
  assert.notEqual(index, -1);
  const lines = frames[index]!.split("\n");
  const event = JSON.parse(lines[1]!.slice("data: ".length)) as { response: Record<string, unknown> };
  mutate(event.response);
  frames[index] = `${lines[0]}\ndata: ${JSON.stringify(event)}`;
  return Buffer.from(`${frames.join("\n\n")}\n\n`, "utf8");
}

test("#68 Provider gate admits one exact structured candidate and body-free usage", () => {
  const body = buildSyntheticFreshCandidateProviderSse("Take one bounded reversible step.");
  const admitted = admitFreshCandidateProviderSse(body);
  assert.equal(admitted.responseText, "Take one bounded reversible step.");
  assert.equal(admitted.inputTokens, 512);
  assert.equal(admitted.outputTokens, 64);
  assert.equal(admitted.applicableSpendUsd, 0.00448);
  assert.equal(admitted.completedEventCount, 1);
  assert.equal(admitted.toolOutputCount, 0);
  assert.match(admitted.responseTextSha256, /^sha256:[0-9a-f]{64}$/u);
  body.fill(0);
});

test("#68 Provider gate rejects tool output, budget drift and ambiguous completion", () => {
  const base = buildSyntheticFreshCandidateProviderSse("Bounded response.");

  const tool = mutateCompleted(base, (response) => {
    response.output = [{ type: "function_call", name: "unexpected" }];
  });
  assert.throws(() => admitFreshCandidateProviderSse(tool), /FRESH_PROVIDER_TOOL_OUTPUT_DENIED/u);

  const overBudget = mutateCompleted(base, (response) => {
    response.usage = { input_tokens: 512, output_tokens: 1_025 };
  });
  assert.throws(() => admitFreshCandidateProviderSse(overBudget), /FRESH_PROVIDER_OUTPUT_BUDGET_EXCEEDED/u);

  const duplicated = Buffer.concat([base, Buffer.from(base.toString("utf8").split("\n\n").filter((frame) => frame.startsWith("event: response.completed\n"))[0] + "\n\n")]);
  assert.throws(() => admitFreshCandidateProviderSse(duplicated), /FRESH_PROVIDER_COMPLETION_AMBIGUOUS/u);

  for (const bytes of [base, tool, overBudget, duplicated]) bytes.fill(0);
});

test("#68 Provider dispatch is one-shot, hash-authorized and returns no candidate body", async () => {
  let dispatches = 0;
  let reviews = 0;
  const result = await dispatchFreshCandidateProviderOnce({
    request: REQUEST,
    expectedRequestSha256: REQUEST_HASH,
    credential: CREDENTIAL,
    signal: new AbortController().signal,
    transport: async ({ requestBody, credential }) => {
      dispatches += 1;
      assert.equal(requestBody.toString("utf8"), canonicalJson(REQUEST));
      assert.equal(credential, CREDENTIAL);
      return buildSyntheticFreshCandidateProviderSse("Review this exact transient candidate.");
    },
    reviewTransientCandidate: async (responseText) => {
      reviews += 1;
      assert.equal(responseText, "Review this exact transient candidate.");
      return "discard";
    },
  });
  assert.equal(dispatches, 1);
  assert.equal(reviews, 1);
  assert.equal(result.decision, "discard");
  assert.equal(result.receipt.providerDispatches, 1);
  assert.equal(result.receipt.automaticRetries, 0);
  assert.equal(result.receipt.redirectsFollowed, 0);
  assert.equal(JSON.stringify(result).includes("Review this exact transient candidate."), false);

  await assert.rejects(dispatchFreshCandidateProviderOnce({
    request: REQUEST,
    expectedRequestSha256: canonicalSha256({ drift: true }),
    credential: CREDENTIAL,
    signal: new AbortController().signal,
    transport: async () => {
      dispatches += 1;
      return buildSyntheticFreshCandidateProviderSse("must not dispatch");
    },
    reviewTransientCandidate: async () => "discard",
  }), /FRESH_PROVIDER_REQUEST_AUTHORITY_MISMATCH/u);
  assert.equal(dispatches, 1);
});

test("#68 Provider dispatch aborts before transport and never retries", async () => {
  let dispatches = 0;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(dispatchFreshCandidateProviderOnce({
    request: REQUEST,
    expectedRequestSha256: REQUEST_HASH,
    credential: CREDENTIAL,
    signal: controller.signal,
    transport: async () => {
      dispatches += 1;
      return buildSyntheticFreshCandidateProviderSse("must not dispatch");
    },
    reviewTransientCandidate: async () => "discard",
  }), /FRESH_PROVIDER_ABORTED_BEFORE_DISPATCH/u);
  assert.equal(dispatches, 0);
});
