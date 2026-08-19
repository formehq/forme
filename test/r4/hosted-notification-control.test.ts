import assert from "node:assert/strict";
import test from "node:test";
import {
  FakeNotificationProviderSpy,
  GENERIC_RESPONSE_READY_NOTICE,
  GENERIC_VERIFICATION_NOTICE,
  NotificationControlError,
  SyntheticNotificationControl,
  type FakeNoticeHandoff,
  type FakeNotificationProvider,
} from "../../apps/room/src/offline-control/notification.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const INTERACTION_ID = "interaction_notification0000000000001";
const RESPONSE_ID = "response_notification000000000000001";
const RESPONSE_EXPIRES = "2026-08-04T12:00:00.000Z";
const INTERACTION_EXPIRES = "2026-08-10T12:00:00.000Z";

function fixture() {
  let clock = new Date(T0);
  const store = new SyntheticPresenceStore(() => clock);
  const provider = new FakeNotificationProviderSpy();
  const control = new SyntheticNotificationControl(store, provider);
  return {
    store,
    provider,
    control,
    advance(milliseconds: number) { clock = new Date(clock.getTime() + milliseconds); },
  };
}

class BlockingVerificationProvider implements FakeNotificationProvider {
  readonly entered: Promise<void>;
  #markEntered: () => void = () => undefined;
  #release: () => void = () => undefined;
  readonly #released: Promise<void>;

  constructor() {
    this.entered = new Promise<void>((resolve) => { this.#markEntered = resolve; });
    this.#released = new Promise<void>((resolve) => { this.#release = resolve; });
  }

  release(): void { this.#release(); }

  async handoff(_input: FakeNoticeHandoff): Promise<"unknown"> {
    this.#markEntered();
    await this.#released;
    return "unknown";
  }

  async reconcile(): Promise<"not_accepted"> { return "not_accepted"; }
}

function errorCode(work: () => unknown, code: string): void {
  assert.throws(work, (error: unknown) => {
    assert.ok(error instanceof NotificationControlError);
    assert.equal(error.code, code);
    return true;
  });
}

function confirm(
  control: SyntheticNotificationControl,
  interactionId = INTERACTION_ID,
  address = "synthetic-guest@example.invalid",
): void {
  const pending = control.beginVerification(interactionId, address);
  control.confirm(interactionId, pending.syntheticCode);
}

test("E08 verification is 15-minute, one-use, max-five-attempt, max-three-send, and address stays sealed", () => {
  const expired = fixture();
  const pending = expired.control.beginVerification(INTERACTION_ID, "expiry@example.invalid");
  assert.equal(pending.endpoint.verificationExpiresAt, "2026-08-03T12:15:00.000Z");
  assert.doesNotMatch(JSON.stringify(pending.endpoint), /expiry@example\.invalid/u);
  assert.equal(pending.endpoint.redactedMarker, "email_***", "marker is domain-neutral");
  expired.advance(15 * 60 * 1_000);
  errorCode(() => expired.control.confirm(INTERACTION_ID, pending.syntheticCode), "verification_expired");
  assert.equal(expired.control.inspect(INTERACTION_ID).challengePresent, false, "expired code evidence is no longer usable");

  const attempts = fixture();
  attempts.control.beginVerification(INTERACTION_ID, "attempts@example.invalid");
  for (let index = 1; index <= 4; index += 1) {
    errorCode(() => attempts.control.confirm(INTERACTION_ID, "111111"), "verification_failed");
  }
  errorCode(() => attempts.control.confirm(INTERACTION_ID, "111111"), "verification_attempts_exhausted");
  assert.equal(attempts.control.inspect(INTERACTION_ID).endpoint.state, "cleared");

  const oneUse = fixture();
  const valid = oneUse.control.beginVerification(INTERACTION_ID, "one-use@example.invalid");
  oneUse.control.confirm(INTERACTION_ID, valid.syntheticCode);
  errorCode(() => oneUse.control.confirm(INTERACTION_ID, valid.syntheticCode), "verification_unavailable");

  const sends = fixture();
  for (let index = 1; index <= 3; index += 1) {
    sends.control.beginVerification(INTERACTION_ID, `send-${index}@example.invalid`);
  }
  errorCode(
    () => sends.control.beginVerification(INTERACTION_ID, "send-4@example.invalid"),
    "verification_send_rate_limited",
  );
  sends.advance(60 * 60 * 1_000 + 1);
  assert.equal(sends.control.beginVerification(INTERACTION_ID, "send-after-window@example.invalid").endpoint.verificationSendsThisHour, 1);
});

test("E06 notification retention purges only the exact selected physical record", () => {
  const instance = fixture();
  const pending = instance.control.beginVerification(INTERACTION_ID, "exact-retention@example.invalid");
  const send = instance.control.inspect(INTERACTION_ID).verificationSend;
  assert.ok(send);

  assert.equal(
    instance.control.purgeRetentionTarget(INTERACTION_ID, "notification_delivery_target", "verification_send_not_selected"),
    "already_absent",
  );
  assert.notEqual(instance.control.inspect(INTERACTION_ID).verificationSend?.encryptedDeliveryTarget, null);
  assert.equal(
    instance.control.purgeRetentionTarget(INTERACTION_ID, "notification_delivery_target", send.sendId),
    "purged",
  );
  assert.equal(instance.control.inspect(INTERACTION_ID).verificationSend?.encryptedDeliveryTarget, null);
  assert.notEqual(instance.control.inspect(INTERACTION_ID).endpoint.encryptedAddress, null, "delivery-target purge cannot collateral-purge the endpoint");
  assert.equal(instance.control.inspect(INTERACTION_ID).challengePresent, true, "delivery-target purge cannot collateral-purge the challenge");

  assert.equal(
    instance.control.purgeRetentionTarget(INTERACTION_ID, "verification_challenge", "challenge_not_selected"),
    "already_absent",
  );
  assert.equal(instance.control.inspect(INTERACTION_ID).challengePresent, true);
  assert.equal(
    instance.control.purgeRetentionTarget(INTERACTION_ID, "verification_challenge", pending.challengeId),
    "purged",
  );
  assert.equal(instance.control.inspect(INTERACTION_ID).challengePresent, false);
  assert.notEqual(instance.control.inspect(INTERACTION_ID).endpoint.encryptedAddress, null);
  assert.equal(instance.control.purgeRetentionTarget(INTERACTION_ID, "notification_endpoint", null), "purged");
  assert.equal(instance.control.inspect(INTERACTION_ID).endpoint.encryptedAddress, null);
});

test("E09-E10 confirmation before/after Response creates one semantic row; pending replacement/removal can re-arm only before handoff", () => {
  const before = fixture();
  confirm(before.control);
  const noticeBefore = before.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  assert.equal(noticeBefore?.state, "ready_pending");
  const duplicate = before.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  assert.equal(duplicate?.noticeId, noticeBefore?.noticeId);
  assert.equal(before.store.auxiliaryEntries("notification_control:notice:").length, 1);

  const after = fixture();
  assert.equal(after.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES), null);
  confirm(after.control);
  const noticeAfter = after.control.inspect(INTERACTION_ID).notice;
  assert.equal(noticeAfter?.state, "ready_pending");

  const firstId = noticeAfter?.noticeId;
  const replacement = after.control.beginVerification(INTERACTION_ID, "replacement@example.invalid");
  assert.equal(after.control.inspect(INTERACTION_ID).notice?.state, "canceled");
  after.control.confirm(INTERACTION_ID, replacement.syntheticCode);
  assert.equal(after.control.inspect(INTERACTION_ID).notice?.noticeId, firstId);
  assert.equal(after.control.inspect(INTERACTION_ID).notice?.state, "ready_pending");
  after.control.removeEndpoint(INTERACTION_ID);
  assert.equal(after.control.inspect(INTERACTION_ID).notice?.state, "canceled");
  assert.equal(after.control.inspect(INTERACTION_ID).notice?.encryptedDeliveryTarget, null);
});

test("E10 outbox persists stable attempt/key before fake handoff and crash recovery reconciles before any resend", async () => {
  const beforeNetwork = fixture();
  confirm(beforeNetwork.control);
  beforeNetwork.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  await assert.rejects(
    beforeNetwork.control.notifyOnce(T0, "after_attempt_persist_before_fake_provider"),
    /after attempt persist/u,
  );
  const persisted = beforeNetwork.control.inspect(INTERACTION_ID).notice;
  assert.equal(persisted?.state, "submitting");
  assert.ok(persisted?.stableAttemptId);
  assert.ok(persisted?.providerIdempotencyKey);
  assert.equal(beforeNetwork.provider.handoffs.length, 0);
  beforeNetwork.advance(61_000);
  const recovered = await beforeNetwork.control.notifyOnce();
  assert.equal(recovered.reconciledBeforeHandoff, true);
  assert.equal(beforeNetwork.provider.reconciliations.length, 1);
  assert.equal(beforeNetwork.provider.handoffs.length, 1);
  assert.equal(recovered.outcome, "provider_accepted");

  const afterNetwork = fixture();
  confirm(afterNetwork.control);
  afterNetwork.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  await assert.rejects(
    afterNetwork.control.notifyOnce(T0, "after_fake_provider_before_outcome"),
    /after fake provider handoff/u,
  );
  assert.equal(afterNetwork.provider.handoffs.length, 1);
  afterNetwork.advance(61_000);
  const reconciled = await afterNetwork.control.notifyOnce();
  assert.equal(reconciled.outcome, "provider_accepted");
  assert.equal(reconciled.reconciledBeforeHandoff, true);
  assert.equal(afterNetwork.provider.handoffs.length, 1, "accepted attempt is never blindly resent");
  assert.equal(afterNetwork.provider.externalMessageCount, 0, "Gate A fake emits zero external messages");
});

test("E08 verification-send journal uses the same stable attempt, lease, and reconcile-before-resend recovery", async () => {
  const beforeNetwork = fixture();
  beforeNetwork.control.beginVerification(INTERACTION_ID, "verification-before@example.invalid");
  await assert.rejects(
    beforeNetwork.control.notifyVerificationOnce(T0, "after_attempt_persist_before_fake_provider"),
    /verification crash after attempt persist/u,
  );
  const persisted = beforeNetwork.control.inspect(INTERACTION_ID).verificationSend;
  assert.equal(persisted?.state, "submitting");
  assert.ok(persisted?.stableAttemptId);
  assert.ok(persisted?.providerIdempotencyKey);
  assert.equal(beforeNetwork.provider.handoffs.length, 0);
  beforeNetwork.advance(61_000);
  const recovered = await beforeNetwork.control.notifyVerificationOnce();
  assert.equal(recovered.reconciledBeforeHandoff, true);
  assert.equal(recovered.outcome, "provider_accepted");
  assert.equal(beforeNetwork.provider.reconciliations.length, 1);
  assert.equal(beforeNetwork.provider.handoffs.length, 1);
  const retry = beforeNetwork.provider.handoffs[0];
  assert.equal(retry?.semanticKind, "verification_code");
  assert.equal(retry?.content, GENERIC_VERIFICATION_NOTICE);
  assert.equal(retry?.stableAttemptId, persisted?.stableAttemptId);
  assert.equal(retry?.providerIdempotencyKey, persisted?.providerIdempotencyKey);
  assert.doesNotMatch(JSON.stringify(retry), /verification-before@example\.invalid/u);
  assert.equal(Object.values(retry ?? {}).includes("000000"), false, "raw verification code never enters provider evidence");
  assert.deepEqual({
    target: recovered.send?.encryptedDeliveryTarget,
    code: recovered.send?.encryptedVerificationCode,
    retry: recovered.send?.noFutureRetry,
  }, { target: null, code: null, retry: true });

  const afterNetwork = fixture();
  afterNetwork.control.beginVerification(INTERACTION_ID, "verification-after@example.invalid");
  await assert.rejects(
    afterNetwork.control.notifyVerificationOnce(T0, "after_fake_provider_before_outcome"),
    /verification crash after fake provider handoff/u,
  );
  const crashed = afterNetwork.control.inspect(INTERACTION_ID).verificationSend;
  assert.equal(crashed?.state, "submitting");
  assert.equal(afterNetwork.provider.handoffs.length, 1);
  afterNetwork.advance(61_000);
  const reconciled = await afterNetwork.control.notifyVerificationOnce();
  assert.equal(reconciled.outcome, "provider_accepted");
  assert.equal(reconciled.reconciledBeforeHandoff, true);
  assert.equal(afterNetwork.provider.handoffs.length, 1, "accepted verification handoff is never blindly resent");
  assert.equal(afterNetwork.provider.externalMessageCount, 0, "Gate A fake emits zero external messages");
});

test("E08 endpoint removal commits while a verification provider handoff is blocked", async () => {
  let clock = new Date(T0);
  const store = new SyntheticPresenceStore(() => clock);
  const provider = new BlockingVerificationProvider();
  const control = new SyntheticNotificationControl(store, provider);
  control.beginVerification(INTERACTION_ID, "verification-race@example.invalid");
  const worker = control.notifyVerificationOnce();
  await provider.entered;
  await store.runExclusive(() => control.removeEndpoint(INTERACTION_ID));
  const duringHandoff = control.inspect(INTERACTION_ID).verificationSend;
  assert.deepEqual({
    state: duringHandoff?.state,
    target: duringHandoff?.encryptedDeliveryTarget,
    code: duringHandoff?.encryptedVerificationCode,
    retry: duringHandoff?.noFutureRetry,
  }, {
    state: "delivery_unknown",
    target: null,
    code: null,
    retry: true,
  });
  provider.release();
  assert.equal((await worker).outcome, "delivery_unknown");
  assert.equal(control.inspect(INTERACTION_ID).endpoint.state, "cleared");
});

test("E09-E11 destructive/post-handoff terminal paths purge target, disable retry, and allow body-free late refinement only", async () => {
  const pending = fixture();
  confirm(pending.control);
  pending.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  const canceled = pending.control.destructiveTerminal(INTERACTION_ID);
  assert.deepEqual(
    { state: canceled?.state, target: canceled?.encryptedDeliveryTarget, retry: canceled?.noFutureRetry },
    { state: "canceled", target: null, retry: true },
  );
  assert.equal((await pending.control.notifyOnce()).outcome, "idle");

  const handedOff = fixture();
  confirm(handedOff.control);
  handedOff.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  await assert.rejects(
    handedOff.control.notifyOnce(T0, "after_attempt_persist_before_fake_provider"),
    /after attempt persist/u,
  );
  const terminal = handedOff.control.removeEndpoint(INTERACTION_ID);
  assert.equal(terminal.state, "cleared");
  const unknown = handedOff.control.inspect(INTERACTION_ID).notice;
  assert.deepEqual(
    { state: unknown?.state, target: unknown?.encryptedDeliveryTarget, retry: unknown?.noFutureRetry },
    { state: "delivery_unknown", target: null, retry: true },
  );
  errorCode(
    () => handedOff.control.beginVerification(INTERACTION_ID, "replacement-after-handoff@example.invalid"),
    "endpoint_handoff_already_began",
  );
  assert.equal((await handedOff.control.notifyOnce()).outcome, "idle");
  const refined = handedOff.control.applyLateAuthenticatedResult(INTERACTION_ID, "not_accepted");
  assert.equal(refined.state, "failed");
  assert.equal(refined.encryptedDeliveryTarget, null);
  assert.equal(refined.noFutureRetry, true);
});

test("E11 provider ambiguity is terminal no-retry and the only fake payload is generic content", async () => {
  const instance = fixture();
  instance.provider.setNextResult("unknown");
  confirm(instance.control);
  instance.control.responseAvailable(INTERACTION_ID, RESPONSE_ID, RESPONSE_EXPIRES, INTERACTION_EXPIRES);
  const result = await instance.control.notifyOnce();
  assert.equal(result.outcome, "delivery_unknown");
  assert.equal(result.notice?.noFutureRetry, true);
  assert.equal(result.notice?.encryptedDeliveryTarget, null);
  assert.equal(instance.provider.handoffs.length, 1);
  const payload = instance.provider.handoffs[0];
  assert.ok(payload);
  assert.equal(payload.content, GENERIC_RESPONSE_READY_NOTICE);
  assert.doesNotMatch(payload.content, /Room|request|answer|https?:|token|secret|interaction_|response_/u);
  assert.doesNotMatch(payload.encryptedDeliveryTarget, /synthetic-guest@example\.invalid/u);
  assert.equal(instance.provider.externalMessageCount, 0);

  const late = instance.control.applyLateAuthenticatedResult(INTERACTION_ID, "accepted");
  assert.equal(late.state, "provider_accepted");
  assert.equal(late.encryptedDeliveryTarget, null);
  assert.equal(late.noFutureRetry, true);
});
