import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalJson, canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  buildExactResponseLoopbackEnvelopeV1,
  runExactResponseLoopbackRehearsalV1,
// The bounded ceremony is an executable .mjs artifact; importing it here
// exercises the same implementation used by the Owner touchpoint.
// @ts-expect-error -- intentional executable artifact import.
} from "../../scripts/r4-exact-response-loopback-rehearsal.mjs";

const RESPONSE = "The synthetic project should complete one exact loopback Response before continuation.";
const SOURCE = readFileSync("scripts/r4-exact-response-loopback-rehearsal.mjs", "utf8");
const HTTP_SOURCE = readFileSync("apps/room/src/http.ts", "utf8");

test("#69 exact approved Response crosses the real HTTP parser and reaches only its originating synthetic Guest", async () => {
  let reviewedCandidate = "";
  let reviewedPublicBody = "";
  const result = await runExactResponseLoopbackRehearsalV1(RESPONSE, {
    reviewCandidate(candidate: { responseText: string; sourceDisclosureClass: string }) {
      reviewedCandidate = candidate.responseText;
      assert.equal(candidate.sourceDisclosureClass, "manual_owner_authored");
      return "approve_exact";
    },
    reviewPublicDelivery(delivery: { response: { body: string } | null }) {
      reviewedPublicBody = delivery.response?.body ?? "";
      return "deliver_loopback";
    },
  });
  assert.equal(reviewedCandidate, RESPONSE);
  assert.equal(reviewedPublicBody, RESPONSE);
  assert.equal(result.verdict, "GREEN_LOOPBACK_EXACT_RESPONSE_DELIVERED");
  assert.equal(result.guestObservedBodyHash, canonicalSha256(RESPONSE));
  assert.equal(result.guestObservedBodyBytes, Buffer.byteLength(RESPONSE, "utf8"));
  assert.equal(result.runtime.loopbackHttpDispatches, 6);
  assert.equal(result.runtime.hostedDeliveryAttempts, 2, "lost local response is retried once with the exact idempotency key");
  assert.equal(result.runtime.hostedResponseCommits, 1);
  assert.equal(result.runtime.persistedCandidateBytes, 0);
  assert.equal(result.runtime.externalNetworkCalls, 0);
  assert.equal(result.runtime.publicTrafficCalls, 0);
  assert.doesNotMatch(canonicalJson(result), new RegExp(RESPONSE, "u"));
});

test("#69 reject and final cancel make no hosted Response", async () => {
  const rejected = await runExactResponseLoopbackRehearsalV1(RESPONSE, {
    reviewCandidate: () => "reject",
    reviewPublicDelivery: () => { throw new Error("delivery review must not run"); },
  });
  const cancelled = await runExactResponseLoopbackRehearsalV1(RESPONSE, {
    reviewCandidate: () => "approve_exact",
    reviewPublicDelivery: () => "cancel",
  });
  assert.equal(rejected.verdict, "CANDIDATE_REJECTED");
  assert.equal(cancelled.verdict, "DELIVERY_CANCELLED");
  for (const result of [rejected, cancelled]) {
    assert.equal(result.runtime.hostedDeliveryAttempts, 0);
    assert.equal(result.runtime.hostedResponseCommits, 0);
    assert.equal(result.runtime.localDeliveryCalls, 0);
    assert.doesNotMatch(canonicalJson(result), new RegExp(RESPONSE, "u"));
  }
});

test("#69 approved byte drift fails before HTTP delivery", async () => {
  const result = await runExactResponseLoopbackRehearsalV1(RESPONSE, {
    reviewCandidate: () => "approve_exact",
    reviewPublicDelivery: () => "deliver_loopback",
  }, { scenario: "byte_drift" });
  assert.equal(result.verdict, "GREEN_APPROVED_BYTE_DRIFT_DENIED");
  assert.equal(result.runtime.hostedDeliveryAttempts, 0);
  assert.equal(result.runtime.hostedResponseCommits, 0);
});

for (const scenario of ["interaction_deleted", "origin_revoked"] as const) {
  test(`#69 ${scenario} wins before hosted delivery and leaves no Guest Response`, async () => {
    const result = await runExactResponseLoopbackRehearsalV1(RESPONSE, {
      reviewCandidate: () => "approve_exact",
      reviewPublicDelivery: () => "deliver_loopback",
    }, { scenario });
    assert.equal(result.verdict, "GREEN_DESTRUCTIVE_STATE_WON");
    assert.equal(result.runtime.hostedDeliveryAttempts, 1);
    assert.equal(result.runtime.hostedResponseCommits, 0);
    assert.equal(result.guestObservedBodyBytes, 0);
  });
}

test("#69 loopback envelope is deterministic, content-free and grants no external effect", () => {
  const first = buildExactResponseLoopbackEnvelopeV1();
  const second = buildExactResponseLoopbackEnvelopeV1();
  assert.deepEqual(second, first);
  assert.match(first.envelopeHash, /^sha256:[0-9a-f]{64}$/u);
  const serialized = canonicalJson(first);
  assert.doesNotMatch(serialized, new RegExp(RESPONSE, "u"));
  assert.equal(first.envelope.authority.externalNetworkCalls, 0);
  assert.equal(first.envelope.authority.publicTrafficCalls, 0);
  assert.equal(first.envelope.authority.providerCalls, 0);
  assert.equal(first.envelope.response.persistedCandidateBytes, 0);
});

test("#69 operational entry uses the Next HTTP membrane and keeps runtime text out of code and ledgers", () => {
  assert.match(HTTP_SOURCE, /dispatchLocalSyntheticRoomApiV1/u);
  assert.match(SOURCE, /dispatchLocalSyntheticRoomApiV1/u);
  assert.match(SOURCE, /faultAt: "after_submit"/u);
  assert.match(SOURCE, /reviewCandidate/u);
  assert.match(SOURCE, /reviewPublicDelivery/u);
  assert.match(SOURCE, /execute-once/u);
  assert.match(SOURCE, /flag: exclusive \? "wx" : "w"/u);
  assert.doesNotMatch(SOURCE, /OPENAI_API_KEY|CODEX_API_KEY|api\.openai\.com|fetch\(|process\.env/u);
  assert.doesNotMatch(SOURCE, new RegExp(RESPONSE, "u"));
});
