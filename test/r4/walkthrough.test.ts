import assert from "node:assert/strict";
import test from "node:test";
import { runSyntheticR4Walkthrough } from "../../packages/r4-local/src/walkthrough.ts";

const EXPECTED_AGGREGATE = "sha256:a09a4ff6208278e43a7d27a49f86c57d0ae302a933c1e6b2e193298cbf16fa56";

test("five-journey R4 walkthrough is byte-for-byte repeatable and pinned", async () => {
  const first = await runSyntheticR4Walkthrough();
  const second = await runSyntheticR4Walkthrough();
  assert.deepEqual(second, first);
  assert.equal(first.aggregateHash, EXPECTED_AGGREGATE);
  assert.deepEqual(first.journeys.map((journey) => journey.journeyId), ["J1", "J2", "J3", "J4", "J5"]);
  assert.deepEqual(first.journeys.map((journey) => journey.stepCount), [5, 16, 3, 5, 2]);
  for (const journey of first.journeys) {
    assert.equal(journey.stepHashes.length, journey.stepCount);
    assert.match(journey.transcriptHash, /^sha256:[a-f0-9]{64}$/u);
  }
});

test("walkthrough executes only synthetic in-process effects and no provider, network, email, or real Guest action", async () => {
  const result = await runSyntheticR4Walkthrough();
  assert.equal(result.syntheticOnly, true);
  assert.deepEqual(result.effects, {
    networkCalls: 0,
    providerCalls: 0,
    syntheticTransportDispatches: 1,
    externalEmailSends: 0,
    realGuestRecords: 0,
  });
  assert.equal(
    result.packetHash,
    "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5",
  );
});
