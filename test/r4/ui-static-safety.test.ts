import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const GUEST_ASK = readFileSync(new URL("../../apps/room/src/components/GuestAsk.tsx", import.meta.url), "utf8");
const GUEST_STATUS = readFileSync(new URL("../../apps/room/src/components/GuestStatus.tsx", import.meta.url), "utf8");
const OWNER_CONTROLS = readFileSync(new URL("../../apps/room/src/components/OwnerControls.tsx", import.meta.url), "utf8");

test("Guest ask persists exact recovery capabilities before its first remote mutation", () => {
  const persistence = GUEST_ASK.indexOf("sessionStorage.setItem(recoveryKey(projectionId), JSON.stringify(created))");
  const firstMutation = GUEST_ASK.indexOf("await responseJson(await fetch(");
  const deletePersistence = GUEST_ASK.indexOf("localStorage.setItem(`forme:r4:delete:${interactionId}`");
  const recoveryRemoval = GUEST_ASK.indexOf("sessionStorage.removeItem(recoveryKey(projection.projectionId))");

  assert.ok(persistence >= 0 && persistence < firstMutation);
  assert.ok(deletePersistence > firstMutation && deletePersistence < recoveryRemoval);
});

test("Guest ask renders only declared interactions and the exact consent-copy constants", () => {
  assert.match(GUEST_ASK, /projection\.supportedInteractions\.map/u);
  assert.match(GUEST_ASK, /\{SYNTHETIC_CONSENT_COPY_V1\}/u);
  assert.match(GUEST_ASK, /\{SYNTHETIC_CONSENT_COPY_HASH\}/u);
  assert.match(GUEST_ASK, /\{SYNTHETIC_PROVIDER_POLICY_HASH\}/u);
  assert.match(GUEST_ASK, /\{SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE\}/u);
  assert.match(GUEST_ASK, /\{SYNTHETIC_BACKUP_RETENTION_DISCLOSURE\}/u);
});

test("Guest and Owner async controls clear busy state through finally blocks", () => {
  assert.equal((GUEST_STATUS.match(/finally \{\s+setBusy\(false\);\s+\}/gu) ?? []).length, 3);
  assert.equal((OWNER_CONTROLS.match(/finally \{\s+setBusy\(false\);\s+\}/gu) ?? []).length, 1);
  assert.doesNotMatch(GUEST_STATUS, /setNotification|\/notification/u);
});

test("GrantOffer acceptance pre-persists a 32-byte Grant capability and idempotency key before mutation", () => {
  const persistence = GUEST_STATUS.indexOf("sessionStorage.setItem(key, JSON.stringify(recovery))");
  const mutation = GUEST_STATUS.indexOf("/accept`, {");
  const grantPersistence = GUEST_STATUS.indexOf("localStorage.setItem(`forme:r4:grant:${grantId}`");
  const recoveryRemoval = GUEST_STATUS.indexOf("sessionStorage.removeItem(offerRecoveryKey(offer.offerId))");
  assert.ok(persistence >= 0 && persistence < mutation);
  assert.ok(grantPersistence > mutation && grantPersistence < recoveryRemoval);
  assert.match(GUEST_STATUS, /grantSecret: secret\(32\)/u);
});

test("interactive API errors do not render arbitrary server messages", () => {
  for (const source of [GUEST_ASK, GUEST_STATUS, OWNER_CONTROLS]) {
    assert.doesNotMatch(source, /error\?\.message|error\.message/u);
    assert.match(source, /safeClientFailure/u);
  }
});
