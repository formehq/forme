import assert from "node:assert/strict";
import test from "node:test";
import {
  GOLDEN_AGENT_DERIVATIVE,
  GOLDEN_DIRECT_INVITE,
  GOLDEN_GRANT,
  GOLDEN_INTERACTION,
  GOLDEN_PUBLIC_ENCOUNTER,
} from "../../packages/r4-protocol/src/index.ts";
import {
  agentDerivativeView,
  directGrantInviteView,
  grantView,
  publicEncounterView,
  publicInteractionView,
} from "../../apps/room/src/redaction.ts";

function assertNoSecretDigest(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("secretDigest"), false);
  assert.equal(serialized.includes("replyCapabilityDigest"), false);
  assert.equal(serialized.includes("deleteCapabilityDigest"), false);
}

test("all public capability DTOs remove keyed secret digests without mutating storage objects", () => {
  const inputs = [GOLDEN_PUBLIC_ENCOUNTER, GOLDEN_GRANT, GOLDEN_AGENT_DERIVATIVE, GOLDEN_DIRECT_INVITE];
  const views = [
    publicEncounterView(GOLDEN_PUBLIC_ENCOUNTER),
    grantView(GOLDEN_GRANT),
    agentDerivativeView(GOLDEN_AGENT_DERIVATIVE),
    directGrantInviteView(GOLDEN_DIRECT_INVITE),
  ];
  for (const view of views) assertNoSecretDigest(view);
  for (const input of inputs) assert.equal("secretDigest" in input, true);
});

test("Interaction views redact both outer recovery digests and the nested consent digest", () => {
  const view = publicInteractionView(GOLDEN_INTERACTION);
  assertNoSecretDigest(view);
  assert.equal(view.requestText, GOLDEN_INTERACTION.requestText);
  assert.equal(view.consentEnvelope?.consentCopyHash, GOLDEN_INTERACTION.consentEnvelope?.consentCopyHash);
  assert.equal("replyCapabilityDigest" in (GOLDEN_INTERACTION.consentEnvelope ?? {}), true);
});
