import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalJson, canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  buildExactResponseLocalEnvelope,
  runTransientExactResponseLocalDelivery,
} from "../../packages/r4-local/src/index.ts";

const RESPONSE = "The project should prioritize completing the controlled-presence loop through one exact Owner-approved Response.";

test("#69 transient manual Owner lane binds, previews and locally delivers exact public bytes", () => {
  let publicBody = "";
  const result = runTransientExactResponseLocalDelivery(RESPONSE, {
    reviewCandidate: (candidate) => {
      assert.equal(candidate.responseText, RESPONSE);
      assert.equal(candidate.sourceDisclosureClass, "manual_owner_authored");
      return "approve_exact";
    },
    reviewPublicDelivery: (delivery) => {
      publicBody = delivery.response?.body ?? "";
      return "deliver_local";
    },
  });
  assert.equal(publicBody, RESPONSE);
  assert.equal(result.verdict, "GREEN_LOCAL_EXACT_RESPONSE_DELIVERED");
  assert.equal(result.sourceDisclosureClass, "manual_owner_authored");
  assert.equal(result.guestObservedBodyHash, canonicalSha256(RESPONSE));
  assert.equal(result.guestObservedBodyBytes, Buffer.byteLength(RESPONSE, "utf8"));
  assert.equal(result.runtime.localDeliveryCalls, 1);
  assert.equal(result.runtime.providerCalls, 0);
  assert.equal(result.runtime.externalNetworkCalls, 0);
  assert.doesNotMatch(canonicalJson(result), new RegExp(RESPONSE, "u"));
});

test("#69 candidate reject and final delivery cancel remain zero-delivery and body-free", () => {
  const rejected = runTransientExactResponseLocalDelivery(RESPONSE, {
    reviewCandidate: () => "reject",
    reviewPublicDelivery: () => { throw new Error("delivery review must not run"); },
  });
  assert.equal(rejected.verdict, "CANDIDATE_REJECTED");
  assert.equal(rejected.runtime.localDeliveryCalls, 0);
  assert.equal(rejected.approvalHash, null);
  const cancelled = runTransientExactResponseLocalDelivery(RESPONSE, {
    reviewCandidate: () => "approve_exact",
    reviewPublicDelivery: () => "cancel",
  });
  assert.equal(cancelled.verdict, "DELIVERY_CANCELLED");
  assert.equal(cancelled.runtime.localDeliveryCalls, 0);
  assert.ok(cancelled.approvalHash);
  for (const value of [rejected, cancelled]) assert.doesNotMatch(canonicalJson(value), new RegExp(RESPONSE, "u"));
});

test("#69 local envelope is deterministic, content-free and grants no external effect", () => {
  const first = buildExactResponseLocalEnvelope();
  const second = buildExactResponseLocalEnvelope();
  assert.deepEqual(second, first);
  assert.match(first.envelopeHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal((first.envelope.authority as { providerCalls: number }).providerCalls, 0);
  assert.equal((first.envelope.authority as { publicTrafficCalls: number }).publicTrafficCalls, 0);
  assert.equal((first.envelope.response as { persistedCandidateBytes: number }).persistedCandidateBytes, 0);
});

test("#69 operational entry takes response text only through local UI and persists body-free receipts", () => {
  const script = readFileSync("scripts/r4-exact-response-local-delivery.mjs", "utf8");
  assert.match(script, /process\.argv\[2\] === "inspect"/u);
  assert.match(script, /process\.argv\[2\] === "execute-once"/u);
  assert.match(script, /collectOwnerResponse/u);
  assert.match(script, /reviewPublicDelivery/u);
  assert.match(script, /flag: exclusive \? "wx" : "w"/u);
  assert.doesNotMatch(script, /OPENAI_API_KEY|CODEX_API_KEY|api\.openai\.com|process\.env/u);
  assert.doesNotMatch(script, new RegExp(RESPONSE, "u"));
});
