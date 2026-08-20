import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import {
  assertBodyFree,
  runSyntheticFreshCandidateRehearsal,
} from "../../packages/r4-local/src/index.ts";

test("#68 current Core rehearsal is deterministic, body-free, transient, and upstream-disabled", async () => {
  const first = await runSyntheticFreshCandidateRehearsal();
  const second = await runSyntheticFreshCandidateRehearsal();
  assert.deepEqual(second, first);
  assert.doesNotThrow(() => assertBodyFree(first));
  const { aggregateHash, ...preimage } = first;
  assert.equal(aggregateHash, canonicalSha256(preimage));
  assert.equal(first.verdict, "GREEN_CLEAN");
  assert.equal(first.freshSession.sessionsStarted, 1);
  assert.equal(first.freshSession.resumedSessions, 0);
  assert.equal(first.freshSession.upstreamEnabled, false);
  assert.equal(first.effects.providerCalls, 0);
  assert.equal(first.effects.networkCalls, 0);
  assert.equal(first.effects.publicationCalls, 0);
  assert.equal(first.localReview.decision, "synthetic_discard");
  assert.equal(first.localReview.publicationAuthority, false);
  assert.equal(first.localReview.persistedArtifactBytes, 0);
  assert.equal(first.cleanup.runtimeBytesAfterTerminal, 0);
  assert.equal(first.cleanup.temporaryRootExistsAfterReturn, false);
  assert.doesNotMatch(JSON.stringify(first), /Synthetic Fresh draft|admitted-repository|README\.md|PRODUCT\.md/u);
});

test("#68 rehearsal CLI accepts only the exact execute command", async () => {
  const { execFileSync } = await import("node:child_process");
  const output = execFileSync(process.execPath, ["scripts/r4-fresh-candidate-rehearsal.mjs", "execute"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const result = JSON.parse(output);
  assert.equal(result.schemaVersion, "r4.fresh_candidate_rehearsal.v1");
  assert.equal(result.verdict, "GREEN_CLEAN");
  assert.throws(() => execFileSync(process.execPath, ["scripts/r4-fresh-candidate-rehearsal.mjs", "other"], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
