import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  addMilliseconds,
  validateNotificationEndpointV1,
  validateReadyNoticeV1,
  type NotificationEndpointV1,
  type ReadyNoticeV1,
} from "../../../../packages/r4-protocol/src/index.ts";
import type { HostedPresenceStore } from "../store.ts";

/**
 * Gate A never sends email. This is the complete, generic notice body a later
 * approved provider adapter may receive. Keeping it here gives the repository
 * tests a byte-level privacy tripwire without importing a mail SDK.
 */
export const GENERIC_RESPONSE_READY_NOTICE =
  "A Forme response is ready. Open the private reply link you previously saved.";
export const GENERIC_VERIFICATION_NOTICE =
  "A Forme notification verification handoff was requested.";

const CHALLENGE_TTL_MS = 15 * 60 * 1_000;
const SEND_WINDOW_MS = 60 * 60 * 1_000;
const LEASE_MS = 60 * 1_000;
const RECONCILIATION_MS = 24 * 60 * 60 * 1_000;
const SYNTHETIC_CODE = "000000";
const KEY = createHash("sha256").update("forme-r4-gate-a-synthetic-notification-key").digest();

type ProviderResult = "accepted" | "not_accepted" | "unknown";

export interface FakeNoticeHandoff {
  readonly semanticKind: "response_ready" | "verification_code";
  readonly stableAttemptId: string;
  readonly providerIdempotencyKey: string;
  readonly encryptedDeliveryTarget: string;
  readonly encryptedVerificationCode: string | null;
  readonly content: typeof GENERIC_RESPONSE_READY_NOTICE | typeof GENERIC_VERIFICATION_NOTICE;
}

export interface FakeNotificationProvider {
  handoff(input: FakeNoticeHandoff): Promise<ProviderResult>;
  reconcile(providerIdempotencyKey: string): Promise<ProviderResult>;
}

/** A local spy only. `externalMessageCount` is intentionally immutable zero. */
export class FakeNotificationProviderSpy implements FakeNotificationProvider {
  readonly handoffs: FakeNoticeHandoff[] = [];
  readonly reconciliations: string[] = [];
  readonly externalMessageCount = 0;
  #result: ProviderResult;
  #results = new Map<string, ProviderResult>();

  constructor(result: ProviderResult = "accepted") {
    this.#result = result;
  }

  setNextResult(result: ProviderResult): void {
    this.#result = result;
  }

  setKnownResult(providerIdempotencyKey: string, result: ProviderResult): void {
    this.#results.set(providerIdempotencyKey, result);
  }

  async handoff(input: FakeNoticeHandoff): Promise<ProviderResult> {
    this.handoffs.push(structuredClone(input));
    const result = this.#result;
    this.#results.set(input.providerIdempotencyKey, result);
    return result;
  }

  async reconcile(providerIdempotencyKey: string): Promise<ProviderResult> {
    this.reconciliations.push(providerIdempotencyKey);
    return this.#results.get(providerIdempotencyKey) ?? "not_accepted";
  }
}

interface ChallengeRecord {
  readonly schemaVersion: "synthetic_notification_challenge.v1";
  readonly challengeId: string;
  readonly interactionId: string;
  readonly codeDigest: string;
  readonly expiresAt: string;
  readonly used: boolean;
  readonly attempts: number;
}

interface SendWindowRecord {
  readonly schemaVersion: "synthetic_notification_send_window.v1";
  readonly sentAt: readonly string[];
}

interface ResponseWindow {
  readonly schemaVersion: "synthetic_notification_response_window.v1";
  readonly responseId: string;
  readonly responseExpiresAt: string;
  readonly interactionExpiresAt: string;
}

type VerificationSendState =
  | "ready_pending"
  | "submitting"
  | "provider_accepted"
  | "delivery_unknown"
  | "failed"
  | "canceled";

export interface VerificationSendRecord {
  readonly schemaVersion: "synthetic_verification_send.v1";
  readonly sendId: string;
  readonly interactionId: string;
  readonly challengeId: string;
  readonly state: VerificationSendState;
  readonly encryptedDeliveryTarget: string | null;
  readonly encryptedVerificationCode: string | null;
  readonly stableAttemptId: string | null;
  readonly providerIdempotencyKey: string | null;
  readonly attemptNumber: number;
  readonly leaseExpiresAt: string | null;
  readonly reconciliationDeadline: string | null;
  readonly noFutureRetry: boolean;
  readonly version: number;
}

export interface NotificationInspection {
  readonly endpoint: NotificationEndpointV1;
  readonly notice: ReadyNoticeV1 | null;
  readonly verificationSend: VerificationSendRecord | null;
  readonly challengePresent: boolean;
}

export interface NotificationRetentionResult {
  readonly expiredChallenges: number;
  readonly clearedEncryptedTargets: number;
}

export type NotificationRetentionTargetKind =
  | "notification_endpoint"
  | "notification_delivery_target"
  | "verification_challenge";

export class NotificationControlError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type NotifyFault = "after_attempt_persist_before_fake_provider" | "after_fake_provider_before_outcome";

export interface NotifyOnceResult {
  readonly outcome: "idle" | "provider_accepted" | "failed" | "delivery_unknown";
  readonly notice: ReadyNoticeV1 | null;
  readonly reconciledBeforeHandoff: boolean;
}

export interface VerificationNotifyOnceResult {
  readonly outcome: "idle" | "provider_accepted" | "failed" | "delivery_unknown";
  readonly send: VerificationSendRecord | null;
  readonly reconciledBeforeHandoff: boolean;
}

type ReadyWorkPhase =
  | { readonly kind: "result"; readonly result: NotifyOnceResult }
  | { readonly kind: "handoff"; readonly notice: ReadyNoticeV1; readonly reconciledBeforeHandoff: boolean }
  | { readonly kind: "reconcile"; readonly notice: ReadyNoticeV1 };

type VerificationWorkPhase =
  | { readonly kind: "result"; readonly result: VerificationNotifyOnceResult }
  | { readonly kind: "handoff"; readonly send: VerificationSendRecord; readonly reconciledBeforeHandoff: boolean }
  | { readonly kind: "reconcile"; readonly send: VerificationSendRecord };

function minTimestamp(...values: readonly string[]): string {
  return values.reduce((left, right) => Date.parse(left) <= Date.parse(right) ? left : right);
}

function seal(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `synthetic-aes-gcm:${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

function unseal(value: string): string {
  const prefix = "synthetic-aes-gcm:";
  if (!value.startsWith(prefix)) throw new NotificationControlError("invalid_delivery_target", "Synthetic target is malformed");
  const bytes = Buffer.from(value.slice(prefix.length), "base64url");
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const ciphertext = bytes.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function challengeKey(interactionId: string): string {
  return `notification_control:challenge:${interactionId}`;
}

function sendsKey(interactionId: string): string {
  return `notification_control:sends:${interactionId}`;
}

function noticeKey(interactionId: string): string {
  return `notification_control:notice:${interactionId}`;
}

function responseKey(interactionId: string): string {
  return `notification_control:response:${interactionId}`;
}

function verificationSendKey(challengeId: string): string {
  return `notification_control:verification_send:${challengeId}`;
}

function challengeFrom(value: Record<string, unknown> | null): ChallengeRecord | null {
  return value?.schemaVersion === "synthetic_notification_challenge.v1"
    ? value as unknown as ChallengeRecord
    : null;
}

function noticeFrom(value: Record<string, unknown> | null): ReadyNoticeV1 | null {
  return value ? validateReadyNoticeV1(value) : null;
}

function responseFrom(value: Record<string, unknown> | null): ResponseWindow | null {
  return value?.schemaVersion === "synthetic_notification_response_window.v1"
    ? value as unknown as ResponseWindow
    : null;
}

function verificationSendFrom(value: Record<string, unknown> | null): VerificationSendRecord | null {
  return value?.schemaVersion === "synthetic_verification_send.v1"
    ? value as unknown as VerificationSendRecord
    : null;
}

export class SyntheticNotificationControl {
  readonly provider: FakeNotificationProvider;
  #store: HostedPresenceStore;

  constructor(store: HostedPresenceStore, provider: FakeNotificationProvider = new FakeNotificationProviderSpy()) {
    this.#store = store;
    this.provider = provider;
  }

  inspect(interactionId: string): NotificationInspection {
    return {
      endpoint: this.#store.notification(interactionId).endpoint,
      notice: noticeFrom(this.#store.auxiliary(noticeKey(interactionId))),
      verificationSend: this.#latestVerificationSend(interactionId),
      challengePresent: challengeFrom(this.#store.auxiliary(challengeKey(interactionId))) !== null,
    };
  }

  /**
   * Scheduled physical-retention pass. The application calls this while it
   * holds the hosted store lock; no plaintext is returned or recorded.
   */
  purgeExpiredRetention(interactionIds: readonly string[], now = this.#store.now()): NotificationRetentionResult {
    let expiredChallenges = 0;
    let clearedEncryptedTargets = 0;
    for (const interactionId of interactionIds) {
      const stored = this.#store.notification(interactionId);
      const challenge = challengeFrom(this.#store.auxiliary(challengeKey(interactionId)));
      if (!challenge || Date.parse(challenge.expiresAt) > Date.parse(now)) continue;
      const verificationSend = this.#latestVerificationSend(interactionId);
      if (
        stored.endpoint.encryptedAddress !== null
        || (verificationSend?.encryptedDeliveryTarget ?? null) !== null
        || (verificationSend?.encryptedVerificationCode ?? null) !== null
      ) clearedEncryptedTargets += 1;
      this.#expireChallenge(interactionId, stored.endpoint);
      expiredChallenges += 1;
    }
    return { expiredChallenges, clearedEncryptedTargets };
  }

  purgeRetentionTarget(
    interactionId: string,
    kind: NotificationRetentionTargetKind,
    recordId: string | null,
  ): "purged" | "already_absent" {
    const stored = this.#store.notification(interactionId);
    if (kind === "notification_endpoint") {
      if (recordId !== null) throw new Error("notification endpoint retention target has an unexpected record ID");
      if (stored.endpoint.encryptedAddress === null) return "already_absent";
      const endpoint = validateNotificationEndpointV1({
        ...stored.endpoint,
        state: "cleared",
        encryptedAddress: null,
        redactedMarker: null,
        verificationExpiresAt: null,
        confirmedAt: null,
        version: stored.endpoint.version + 1,
      });
      this.#store.saveNotification({ ...stored, endpoint, syntheticPlaintextAddress: null });
      return "purged";
    }
    if (kind === "verification_challenge") {
      const challenge = challengeFrom(this.#store.auxiliary(challengeKey(interactionId)));
      if (!challenge || challenge.challengeId !== recordId) return "already_absent";
      this.#store.saveAuxiliary(challengeKey(interactionId), {
        schemaVersion: "synthetic_notification_challenge_terminal.v1",
      });
      this.#store.saveNotification({ ...stored, challengeId: null, syntheticPlaintextAddress: null });
      return "purged";
    }

    const notice = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    const send = this.#store.auxiliaryEntries("notification_control:verification_send:")
      .map(([, raw]) => verificationSendFrom(raw))
      .find((candidate): candidate is VerificationSendRecord => candidate?.interactionId === interactionId && candidate.sendId === recordId);
    const noticePresent = notice?.noticeId === recordId && notice.encryptedDeliveryTarget !== null;
    const sendPresent = send !== undefined && (send.encryptedDeliveryTarget !== null || send.encryptedVerificationCode !== null);
    if (!noticePresent && !sendPresent) return "already_absent";
    if (noticePresent && notice) {
      const state = notice.state === "ready_pending"
        ? "canceled"
        : notice.state === "submitting"
          ? "delivery_unknown"
          : notice.state;
      this.#saveNotice({
        ...notice,
        state,
        encryptedDeliveryTarget: null,
        leaseExpiresAt: null,
        noFutureRetry: true,
        version: notice.version + 1,
      });
    }
    if (sendPresent && send) {
      const state = send.state === "ready_pending"
        ? "canceled"
        : send.state === "submitting"
          ? "delivery_unknown"
          : send.state;
      this.#saveVerificationSend({
        ...send,
        state,
        encryptedDeliveryTarget: null,
        encryptedVerificationCode: null,
        leaseExpiresAt: null,
        noFutureRetry: true,
        version: send.version + 1,
      });
    }
    return "purged";
  }

  beginVerification(interactionId: string, address: string, now = this.#store.now()): {
    endpoint: NotificationEndpointV1;
    challengeId: string;
    syntheticCode: string;
  } {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address)) {
      throw new NotificationControlError("invalid_email", "Email endpoint is invalid");
    }
    const priorNotice = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    if (priorNotice && (priorNotice.stableAttemptId !== null || ["submitting", "provider_accepted", "delivery_unknown", "failed"].includes(priorNotice.state))) {
      this.#clearEndpoint(interactionId);
      throw new NotificationControlError("endpoint_handoff_already_began", "A handed-off notice cannot move to a replacement address");
    }
    if (priorNotice?.state === "ready_pending") this.#cancelPending(priorNotice);

    const priorSends = (this.#store.auxiliary(sendsKey(interactionId)) as unknown as SendWindowRecord | null)?.sentAt ?? [];
    const cutoff = Date.parse(now) - SEND_WINDOW_MS;
    const currentSends = priorSends.filter((timestamp) => Date.parse(timestamp) > cutoff);
    if (currentSends.length >= 3) {
      throw new NotificationControlError("verification_send_rate_limited", "At most three verification sends are allowed per Interaction per hour");
    }
    this.#retireVerificationSends(interactionId);
    const challengeId = this.#store.nextId("challenge");
    const challenge: ChallengeRecord = {
      schemaVersion: "synthetic_notification_challenge.v1",
      challengeId,
      interactionId,
      codeDigest: this.#store.digestSecret(`verification:${challengeId}:${SYNTHETIC_CODE}`),
      expiresAt: addMilliseconds(now, CHALLENGE_TTL_MS),
      used: false,
      attempts: 0,
    };
    const current = this.#store.notification(interactionId);
    const encryptedAddress = seal(address);
    const endpoint = validateNotificationEndpointV1({
      ...current.endpoint,
      state: "verification_pending",
      encryptedAddress,
      redactedMarker: "email_***",
      verificationExpiresAt: challenge.expiresAt,
      verificationAttempts: 0,
      verificationSendsThisHour: currentSends.length + 1,
      confirmedAt: null,
      version: current.endpoint.version + 1,
    });
    this.#store.saveNotification({ endpoint, syntheticPlaintextAddress: null, challengeId });
    this.#store.saveAuxiliary(challengeKey(interactionId), { ...challenge });
    this.#store.saveAuxiliary(sendsKey(interactionId), {
      schemaVersion: "synthetic_notification_send_window.v1",
      sentAt: [...currentSends, now],
    });
    this.#saveVerificationSend({
      schemaVersion: "synthetic_verification_send.v1",
      sendId: this.#store.nextId("verification_send"),
      interactionId,
      challengeId,
      state: "ready_pending",
      encryptedDeliveryTarget: encryptedAddress,
      encryptedVerificationCode: seal(SYNTHETIC_CODE),
      stableAttemptId: null,
      providerIdempotencyKey: null,
      attemptNumber: 0,
      leaseExpiresAt: null,
      reconciliationDeadline: null,
      noFutureRetry: false,
      version: 1,
    });
    return { endpoint, challengeId, syntheticCode: SYNTHETIC_CODE };
  }

  confirm(interactionId: string, code: string, now = this.#store.now()): NotificationEndpointV1 {
    const stored = this.#store.notification(interactionId);
    const challenge = challengeFrom(this.#store.auxiliary(challengeKey(interactionId)));
    if (!challenge || challenge.used || stored.endpoint.state !== "verification_pending") {
      throw new NotificationControlError("verification_unavailable", "Verification challenge is unavailable");
    }
    if (Date.parse(now) >= Date.parse(challenge.expiresAt)) {
      this.#expireChallenge(interactionId, stored.endpoint);
      throw new NotificationControlError("verification_expired", "Verification challenge expired");
    }
    const attempts = challenge.attempts + 1;
    const correct = this.#store.secretMatchesDigest(
      `verification:${challenge.challengeId}:${code}`,
      challenge.codeDigest,
    );
    if (!correct) {
      const endpoint = validateNotificationEndpointV1({ ...stored.endpoint, verificationAttempts: attempts, version: stored.endpoint.version + 1 });
      if (attempts >= 5) {
        this.#expireChallenge(interactionId, endpoint);
        throw new NotificationControlError("verification_attempts_exhausted", "Verification challenge exhausted five attempts");
      }
      this.#store.saveNotification({ ...stored, endpoint });
      this.#store.saveAuxiliary(challengeKey(interactionId), { ...challenge, attempts });
      throw new NotificationControlError("verification_failed", "Verification code is invalid");
    }
    const endpoint = validateNotificationEndpointV1({
      ...stored.endpoint,
      state: "confirmed",
      verificationExpiresAt: null,
      verificationAttempts: attempts,
      confirmedAt: now,
      version: stored.endpoint.version + 1,
    });
    this.#store.saveNotification({ ...stored, endpoint, challengeId: null });
    this.#store.saveAuxiliary(challengeKey(interactionId), {
      schemaVersion: "synthetic_notification_challenge_terminal.v1",
      challengeId: challenge.challengeId,
      outcome: "used",
    });
    this.#retireVerificationSends(interactionId);
    const response = responseFrom(this.#store.auxiliary(responseKey(interactionId)));
    if (response) this.#enqueue(interactionId, response, endpoint);
    return endpoint;
  }

  removeEndpoint(interactionId: string): NotificationEndpointV1 {
    this.#retireVerificationSends(interactionId);
    const notice = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    if (notice?.state === "ready_pending") this.#cancelPending(notice);
    else if (notice?.state === "submitting") {
      this.#saveNotice({ ...notice, state: "delivery_unknown", encryptedDeliveryTarget: null, leaseExpiresAt: null, noFutureRetry: true, version: notice.version + 1 });
    } else if (notice?.state === "delivery_unknown" && !notice.noFutureRetry) {
      this.#saveNotice({ ...notice, encryptedDeliveryTarget: null, leaseExpiresAt: null, noFutureRetry: true, version: notice.version + 1 });
    }
    return this.#clearEndpoint(interactionId);
  }

  responseAvailable(
    interactionId: string,
    responseId: string,
    responseExpiresAt: string,
    interactionExpiresAt: string,
  ): ReadyNoticeV1 | null {
    const response: ResponseWindow = {
      schemaVersion: "synthetic_notification_response_window.v1",
      responseId,
      responseExpiresAt,
      interactionExpiresAt,
    };
    this.#store.saveAuxiliary(responseKey(interactionId), { ...response });
    const endpoint = this.#store.notification(interactionId).endpoint;
    if (endpoint.state !== "confirmed") return noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    return this.#enqueue(interactionId, response, endpoint);
  }

  destructiveTerminal(interactionId: string): ReadyNoticeV1 | null {
    this.#retireVerificationSends(interactionId);
    const notice = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    let next = notice;
    if (notice?.state === "ready_pending") {
      next = this.#saveNotice({ ...notice, state: "canceled", encryptedDeliveryTarget: null, noFutureRetry: true, version: notice.version + 1 });
    } else if (notice?.state === "submitting") {
      next = this.#saveNotice({ ...notice, state: "delivery_unknown", encryptedDeliveryTarget: null, leaseExpiresAt: null, noFutureRetry: true, version: notice.version + 1 });
    } else if (notice?.state === "delivery_unknown" && (!notice.noFutureRetry || notice.encryptedDeliveryTarget !== null)) {
      next = this.#saveNotice({ ...notice, encryptedDeliveryTarget: null, leaseExpiresAt: null, noFutureRetry: true, version: notice.version + 1 });
    }
    this.#clearEndpoint(interactionId);
    this.#store.saveAuxiliary(responseKey(interactionId), { schemaVersion: "synthetic_response_terminal.v1" });
    return next;
  }

  async notifyOnce(now = this.#store.now(), fault?: NotifyFault): Promise<NotifyOnceResult> {
    let phase = await this.#store.runExclusive(() => this.#prepareReadyWork(now));
    for (;;) {
      if (phase.kind === "result") return phase.result;
      if (phase.kind === "handoff") {
        if (fault === "after_attempt_persist_before_fake_provider") {
          throw new Error(phase.reconciledBeforeHandoff
            ? "synthetic crash after reconciled attempt persist"
            : "synthetic crash after attempt persist");
        }
        return this.#executeReadyHandoff(phase, fault);
      }
      let reconciliation: ProviderResult;
      try {
        reconciliation = await this.provider.reconcile(phase.notice.providerIdempotencyKey ?? "");
      } catch {
        reconciliation = "unknown";
      }
      const candidate = phase.notice;
      phase = await this.#store.runExclusive(() => this.#completeReadyReconciliation(candidate, reconciliation, now));
    }
  }

  async notifyVerificationOnce(now = this.#store.now(), fault?: NotifyFault): Promise<VerificationNotifyOnceResult> {
    let phase = await this.#store.runExclusive(() => this.#prepareVerificationWork(now));
    for (;;) {
      if (phase.kind === "result") return phase.result;
      if (phase.kind === "handoff") {
        if (fault === "after_attempt_persist_before_fake_provider") {
          throw new Error(phase.reconciledBeforeHandoff
            ? "synthetic verification crash after reconciled attempt persist"
            : "synthetic verification crash after attempt persist");
        }
        return this.#executeVerificationHandoff(phase, fault);
      }
      let reconciliation: ProviderResult;
      try {
        reconciliation = await this.provider.reconcile(phase.send.providerIdempotencyKey ?? "");
      } catch {
        reconciliation = "unknown";
      }
      const candidate = phase.send;
      phase = await this.#store.runExclusive(() => this.#completeVerificationReconciliation(candidate, reconciliation, now));
    }
  }

  #prepareVerificationWork(now: string): VerificationWorkPhase {
    const candidates = this.#store.auxiliaryEntries("notification_control:verification_send:")
      .map(([, raw]) => verificationSendFrom(raw))
      .filter((send): send is VerificationSendRecord => send !== null)
      .sort((left, right) => left.sendId.localeCompare(right.sendId));
    const candidate = candidates.find((send) => send.state === "ready_pending"
      || ((send.state === "submitting" || send.state === "delivery_unknown")
        && !send.noFutureRetry
        && (send.leaseExpiresAt === null || Date.parse(send.leaseExpiresAt) <= Date.parse(now))));
    if (!candidate) return { kind: "result", result: { outcome: "idle", send: null, reconciledBeforeHandoff: false } };
    if (candidate.state === "ready_pending") {
      const claimed = this.#claimVerification(candidate, now, false);
      return claimed.state === "submitting"
        ? { kind: "handoff", send: claimed, reconciledBeforeHandoff: false }
        : { kind: "result", result: this.#verificationResult(claimed, false) };
    }
    if (!candidate.providerIdempotencyKey) {
      throw new NotificationControlError("attempt_evidence_missing", "Verification handoff evidence is missing");
    }
    return { kind: "reconcile", send: candidate };
  }

  #completeVerificationReconciliation(
    candidate: VerificationSendRecord,
    reconciliation: ProviderResult,
    now: string,
  ): VerificationWorkPhase {
    const current = verificationSendFrom(this.#store.auxiliary(verificationSendKey(candidate.challengeId)));
    if (!current || current.stableAttemptId !== candidate.stableAttemptId || current.providerIdempotencyKey !== candidate.providerIdempotencyKey) {
      return { kind: "result", result: { outcome: "idle", send: current, reconciledBeforeHandoff: true } };
    }
    if (current.state === "delivery_unknown" && current.noFutureRetry) {
      if (reconciliation === "accepted") return { kind: "result", result: this.#verificationResult(this.#terminalVerification(current, "provider_accepted"), true) };
      if (reconciliation === "not_accepted") return { kind: "result", result: this.#verificationResult(this.#terminalVerification(current, "failed"), true) };
      return { kind: "result", result: this.#verificationResult(current, true) };
    }
    if (["provider_accepted", "failed", "canceled"].includes(current.state)) {
      return { kind: "result", result: this.#verificationResult(current, true) };
    }
    if (current.state !== "submitting" && current.state !== "delivery_unknown") {
      return { kind: "result", result: { outcome: "idle", send: current, reconciledBeforeHandoff: true } };
    }
    if (reconciliation === "accepted") {
      return { kind: "result", result: this.#verificationResult(this.#terminalVerification(current, "provider_accepted"), true) };
    }
    if (reconciliation === "unknown") {
      return { kind: "result", result: this.#verificationResult(this.#terminalVerification(current, "delivery_unknown"), true) };
    }
    if (
      (current.reconciliationDeadline !== null && Date.parse(current.reconciliationDeadline) <= Date.parse(now))
      || current.attemptNumber >= 2
      || current.encryptedDeliveryTarget === null
      || current.encryptedVerificationCode === null
    ) {
      return { kind: "result", result: this.#verificationResult(this.#terminalVerification(current, "failed"), true) };
    }
    const reclaimed = this.#claimVerification(current, now, true);
    return reclaimed.state === "submitting"
      ? { kind: "handoff", send: reclaimed, reconciledBeforeHandoff: true }
      : { kind: "result", result: this.#verificationResult(reclaimed, true) };
  }

  async #executeVerificationHandoff(
    phase: Extract<VerificationWorkPhase, { kind: "handoff" }>,
    fault?: NotifyFault,
  ): Promise<VerificationNotifyOnceResult> {
    const send = phase.send;
    if (
      send.encryptedDeliveryTarget === null
      || send.encryptedVerificationCode === null
      || send.stableAttemptId === null
      || send.providerIdempotencyKey === null
    ) {
      return this.#store.runExclusive(() => this.#verificationResult(this.#terminalVerification(send, "failed"), phase.reconciledBeforeHandoff));
    }
    let result: ProviderResult = "unknown";
    let providerThrew = false;
    try {
      void unseal(send.encryptedDeliveryTarget);
      void unseal(send.encryptedVerificationCode);
      result = await this.provider.handoff({
        semanticKind: "verification_code",
        stableAttemptId: send.stableAttemptId,
        providerIdempotencyKey: send.providerIdempotencyKey,
        encryptedDeliveryTarget: send.encryptedDeliveryTarget,
        encryptedVerificationCode: send.encryptedVerificationCode,
        content: GENERIC_VERIFICATION_NOTICE,
      });
    } catch {
      providerThrew = true;
    }
    if (fault === "after_fake_provider_before_outcome") throw new Error("synthetic verification crash after fake provider handoff");
    return this.#store.runExclusive(() => this.#completeVerificationHandoff(send, result, providerThrew, phase.reconciledBeforeHandoff));
  }

  #completeVerificationHandoff(
    claimed: VerificationSendRecord,
    result: ProviderResult,
    providerThrew: boolean,
    reconciledBeforeHandoff: boolean,
  ): VerificationNotifyOnceResult {
    const current = verificationSendFrom(this.#store.auxiliary(verificationSendKey(claimed.challengeId)));
    if (!current || current.stableAttemptId !== claimed.stableAttemptId || current.providerIdempotencyKey !== claimed.providerIdempotencyKey) {
      return { outcome: "idle", send: current, reconciledBeforeHandoff };
    }
    if (current.state === "delivery_unknown" && current.noFutureRetry) {
      if (!providerThrew && result === "accepted") return this.#verificationResult(this.#terminalVerification(current, "provider_accepted"), reconciledBeforeHandoff);
      if (!providerThrew && result === "not_accepted") return this.#verificationResult(this.#terminalVerification(current, "failed"), reconciledBeforeHandoff);
      return this.#verificationResult(current, reconciledBeforeHandoff);
    }
    if (["provider_accepted", "failed", "canceled"].includes(current.state)) return this.#verificationResult(current, reconciledBeforeHandoff);
    if (current.state !== "submitting") return { outcome: "idle", send: current, reconciledBeforeHandoff };
    if (providerThrew) {
      const unknown = this.#saveVerificationSend({ ...current, state: "delivery_unknown", leaseExpiresAt: null, version: current.version + 1 });
      return { outcome: "delivery_unknown", send: unknown, reconciledBeforeHandoff };
    }
    if (result === "accepted") return this.#verificationResult(this.#terminalVerification(current, "provider_accepted"), reconciledBeforeHandoff);
    if (result === "not_accepted") return this.#verificationResult(this.#terminalVerification(current, "failed"), reconciledBeforeHandoff);
    return this.#verificationResult(this.#terminalVerification(current, "delivery_unknown"), reconciledBeforeHandoff);
  }

  #claimVerification(send: VerificationSendRecord, now: string, retry: boolean): VerificationSendRecord {
    const challenge = challengeFrom(this.#store.auxiliary(challengeKey(send.interactionId)));
    if (
      !challenge
      || challenge.challengeId !== send.challengeId
      || challenge.used
      || Date.parse(challenge.expiresAt) <= Date.parse(now)
      || send.encryptedDeliveryTarget === null
      || send.encryptedVerificationCode === null
    ) return this.#terminalVerification(send, "failed");
    const deadline = minTimestamp(addMilliseconds(now, RECONCILIATION_MS), challenge.expiresAt);
    return this.#saveVerificationSend({
      ...send,
      state: "submitting",
      stableAttemptId: send.stableAttemptId ?? this.#store.nextId("verification_attempt"),
      providerIdempotencyKey: send.providerIdempotencyKey ?? `forme-verification-${send.sendId}`,
      attemptNumber: retry ? send.attemptNumber + 1 : 1,
      leaseExpiresAt: addMilliseconds(now, LEASE_MS),
      reconciliationDeadline: send.reconciliationDeadline ?? deadline,
      version: send.version + 1,
    });
  }

  #verificationResult(send: VerificationSendRecord, reconciledBeforeHandoff: boolean): VerificationNotifyOnceResult {
    if (send.state === "provider_accepted") return { outcome: "provider_accepted", send, reconciledBeforeHandoff };
    if (send.state === "failed") return { outcome: "failed", send, reconciledBeforeHandoff };
    if (send.state === "delivery_unknown") return { outcome: "delivery_unknown", send, reconciledBeforeHandoff };
    return { outcome: "idle", send, reconciledBeforeHandoff };
  }

  #terminalVerification(
    send: VerificationSendRecord,
    state: "provider_accepted" | "delivery_unknown" | "failed",
  ): VerificationSendRecord {
    return this.#saveVerificationSend({
      ...send,
      state,
      encryptedDeliveryTarget: null,
      encryptedVerificationCode: null,
      leaseExpiresAt: null,
      noFutureRetry: true,
      version: send.version + 1,
    });
  }

  #prepareReadyWork(now: string): ReadyWorkPhase {
    const candidates = this.#store.auxiliaryEntries("notification_control:notice:")
      .map(([, raw]) => validateReadyNoticeV1(raw))
      .sort((left, right) => left.interactionId.localeCompare(right.interactionId));
    const candidate = candidates.find((notice) => notice.state === "ready_pending"
      || ((notice.state === "submitting" || notice.state === "delivery_unknown")
        && !notice.noFutureRetry
        && (notice.leaseExpiresAt === null || Date.parse(notice.leaseExpiresAt) <= Date.parse(now))));
    if (!candidate) return { kind: "result", result: { outcome: "idle", notice: null, reconciledBeforeHandoff: false } };

    if (candidate.state === "ready_pending") {
      const claimed = this.#claim(candidate, now, false);
      return claimed.state === "submitting"
        ? { kind: "handoff", notice: claimed, reconciledBeforeHandoff: false }
        : { kind: "result", result: this.#readyResult(claimed, false) };
    }

    if (!candidate.providerIdempotencyKey) {
      throw new NotificationControlError("attempt_evidence_missing", "Handoff evidence is missing");
    }
    return { kind: "reconcile", notice: candidate };
  }

  #completeReadyReconciliation(candidate: ReadyNoticeV1, reconciliation: ProviderResult, now: string): ReadyWorkPhase {
    const current = noticeFrom(this.#store.auxiliary(noticeKey(candidate.interactionId)));
    if (!current || current.stableAttemptId !== candidate.stableAttemptId || current.providerIdempotencyKey !== candidate.providerIdempotencyKey) {
      return { kind: "result", result: { outcome: "idle", notice: current, reconciledBeforeHandoff: true } };
    }
    if (current.state === "delivery_unknown" && current.noFutureRetry) {
      if (reconciliation === "accepted") return { kind: "result", result: this.#readyResult(this.#terminalDelivery(current, "provider_accepted"), true) };
      if (reconciliation === "not_accepted") return { kind: "result", result: this.#readyResult(this.#terminalDelivery(current, "failed"), true) };
      return { kind: "result", result: this.#readyResult(current, true) };
    }
    if (["provider_accepted", "failed", "canceled"].includes(current.state)) {
      return { kind: "result", result: this.#readyResult(current, true) };
    }
    if (current.state !== "submitting" && current.state !== "delivery_unknown") {
      return { kind: "result", result: { outcome: "idle", notice: current, reconciledBeforeHandoff: true } };
    }
    if (reconciliation === "accepted") {
      return { kind: "result", result: this.#readyResult(this.#terminalDelivery(current, "provider_accepted"), true) };
    }
    if (reconciliation === "unknown") {
      return { kind: "result", result: this.#readyResult(this.#terminalDelivery(current, "delivery_unknown"), true) };
    }
    if (
      (current.reconciliationDeadline !== null && Date.parse(current.reconciliationDeadline) <= Date.parse(now))
      || current.attemptNumber >= 2
      || current.encryptedDeliveryTarget === null
    ) {
      return { kind: "result", result: this.#readyResult(this.#terminalDelivery(current, "failed"), true) };
    }
    const reclaimed = this.#claim(current, now, true);
    return reclaimed.state === "submitting"
      ? { kind: "handoff", notice: reclaimed, reconciledBeforeHandoff: true }
      : { kind: "result", result: this.#readyResult(reclaimed, true) };
  }

  async #executeReadyHandoff(phase: Extract<ReadyWorkPhase, { kind: "handoff" }>, fault?: NotifyFault): Promise<NotifyOnceResult> {
    const notice = phase.notice;
    if (notice.encryptedDeliveryTarget === null || notice.stableAttemptId === null || notice.providerIdempotencyKey === null) {
      return this.#store.runExclusive(() => this.#readyResult(this.#terminalDelivery(notice, "failed"), phase.reconciledBeforeHandoff));
    }
    let result: ProviderResult = "unknown";
    let providerThrew = false;
    try {
      // Plaintext exists only transiently at this synthetic adapter boundary.
      void unseal(notice.encryptedDeliveryTarget);
      result = await this.provider.handoff({
        semanticKind: "response_ready",
        stableAttemptId: notice.stableAttemptId,
        providerIdempotencyKey: notice.providerIdempotencyKey,
        encryptedDeliveryTarget: notice.encryptedDeliveryTarget,
        encryptedVerificationCode: null,
        content: GENERIC_RESPONSE_READY_NOTICE,
      });
    } catch {
      providerThrew = true;
    }
    if (fault === "after_fake_provider_before_outcome") throw new Error("synthetic crash after fake provider handoff");
    return this.#store.runExclusive(() => this.#completeReadyHandoff(notice, result, providerThrew, phase.reconciledBeforeHandoff));
  }

  #completeReadyHandoff(
    claimed: ReadyNoticeV1,
    result: ProviderResult,
    providerThrew: boolean,
    reconciledBeforeHandoff: boolean,
  ): NotifyOnceResult {
    const current = noticeFrom(this.#store.auxiliary(noticeKey(claimed.interactionId)));
    if (!current || current.stableAttemptId !== claimed.stableAttemptId || current.providerIdempotencyKey !== claimed.providerIdempotencyKey) {
      return { outcome: "idle", notice: current, reconciledBeforeHandoff };
    }
    if (current.state === "delivery_unknown" && current.noFutureRetry) {
      if (!providerThrew && result === "accepted") return this.#readyResult(this.#terminalDelivery(current, "provider_accepted"), reconciledBeforeHandoff);
      if (!providerThrew && result === "not_accepted") return this.#readyResult(this.#terminalDelivery(current, "failed"), reconciledBeforeHandoff);
      return this.#readyResult(current, reconciledBeforeHandoff);
    }
    if (["provider_accepted", "failed", "canceled"].includes(current.state)) return this.#readyResult(current, reconciledBeforeHandoff);
    if (current.state !== "submitting") return { outcome: "idle", notice: current, reconciledBeforeHandoff };
    if (providerThrew) {
      const unknown = this.#saveNotice({ ...current, state: "delivery_unknown", leaseExpiresAt: null, version: current.version + 1 });
      return { outcome: "delivery_unknown", notice: unknown, reconciledBeforeHandoff };
    }
    if (result === "accepted") return this.#readyResult(this.#terminalDelivery(current, "provider_accepted"), reconciledBeforeHandoff);
    if (result === "not_accepted") return this.#readyResult(this.#terminalDelivery(current, "failed"), reconciledBeforeHandoff);
    return this.#readyResult(this.#terminalDelivery(current, "delivery_unknown"), reconciledBeforeHandoff);
  }

  #readyResult(notice: ReadyNoticeV1, reconciledBeforeHandoff: boolean): NotifyOnceResult {
    if (notice.state === "provider_accepted") return { outcome: "provider_accepted", notice, reconciledBeforeHandoff };
    if (notice.state === "failed") return { outcome: "failed", notice, reconciledBeforeHandoff };
    if (notice.state === "delivery_unknown") return { outcome: "delivery_unknown", notice, reconciledBeforeHandoff };
    return { outcome: "idle", notice, reconciledBeforeHandoff };
  }

  applyLateAuthenticatedResult(interactionId: string, result: "accepted" | "not_accepted"): ReadyNoticeV1 {
    const notice = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    if (!notice || notice.state !== "delivery_unknown" || !notice.noFutureRetry) {
      throw new NotificationControlError("late_result_not_applicable", "Only final delivery_unknown evidence may be refined");
    }
    return this.#terminalDelivery(notice, result === "accepted" ? "provider_accepted" : "failed");
  }

  #enqueue(interactionId: string, response: ResponseWindow, endpoint: NotificationEndpointV1): ReadyNoticeV1 | null {
    if (endpoint.state !== "confirmed" || endpoint.encryptedAddress === null) return null;
    const prior = noticeFrom(this.#store.auxiliary(noticeKey(interactionId)));
    if (prior && prior.stableAttemptId !== null) return prior;
    if (prior && prior.state !== "canceled") return prior;
    const notice = validateReadyNoticeV1({
      schemaVersion: "ready_notice.v1",
      noticeId: prior?.noticeId ?? this.#store.nextId("notice"),
      interactionId,
      responseId: response.responseId,
      state: "ready_pending",
      encryptedDeliveryTarget: endpoint.encryptedAddress,
      stableAttemptId: null,
      providerIdempotencyKey: null,
      attemptNumber: 0,
      leaseExpiresAt: null,
      reconciliationDeadline: null,
      noFutureRetry: false,
      version: (prior?.version ?? 0) + 1,
    });
    return this.#saveNotice(notice);
  }

  #claim(notice: ReadyNoticeV1, now: string, retry: boolean): ReadyNoticeV1 {
    if (notice.encryptedDeliveryTarget === null) throw new NotificationControlError("delivery_target_absent", "Notice has no delivery target");
    const response = responseFrom(this.#store.auxiliary(responseKey(notice.interactionId)));
    if (!response) throw new NotificationControlError("response_window_absent", "Notice has no response window");
    const deadline = minTimestamp(
      addMilliseconds(now, RECONCILIATION_MS),
      response.responseExpiresAt,
      response.interactionExpiresAt,
    );
    if (Date.parse(deadline) <= Date.parse(now)) return this.#terminalDelivery(notice, "failed");
    return this.#saveNotice({
      ...notice,
      state: "submitting",
      stableAttemptId: notice.stableAttemptId ?? this.#store.nextId("attempt"),
      providerIdempotencyKey: notice.providerIdempotencyKey ?? `forme-notice-${notice.noticeId}`,
      attemptNumber: retry ? notice.attemptNumber + 1 : 1,
      leaseExpiresAt: addMilliseconds(now, LEASE_MS),
      reconciliationDeadline: notice.reconciliationDeadline ?? deadline,
      version: notice.version + 1,
    });
  }

  #terminalDelivery(notice: ReadyNoticeV1, state: "provider_accepted" | "delivery_unknown" | "failed"): ReadyNoticeV1 {
    const result = this.#saveNotice({
      ...notice,
      state,
      encryptedDeliveryTarget: null,
      leaseExpiresAt: null,
      noFutureRetry: true,
      version: notice.version + 1,
    });
    this.#clearEndpoint(notice.interactionId);
    return result;
  }

  #cancelPending(notice: ReadyNoticeV1): ReadyNoticeV1 {
    return this.#saveNotice({ ...notice, state: "canceled", encryptedDeliveryTarget: null, noFutureRetry: false, version: notice.version + 1 });
  }

  #saveNotice(notice: ReadyNoticeV1): ReadyNoticeV1 {
    const canonical = validateReadyNoticeV1(notice);
    this.#store.saveAuxiliary(noticeKey(canonical.interactionId), canonical as unknown as Record<string, unknown>);
    return canonical;
  }

  #saveVerificationSend(send: VerificationSendRecord): VerificationSendRecord {
    const canonical = structuredClone(send);
    this.#store.saveAuxiliary(verificationSendKey(canonical.challengeId), canonical as unknown as Record<string, unknown>);
    return canonical;
  }

  #latestVerificationSend(interactionId: string): VerificationSendRecord | null {
    return this.#store.auxiliaryEntries("notification_control:verification_send:")
      .map(([, raw]) => verificationSendFrom(raw))
      .filter((send): send is VerificationSendRecord => send?.interactionId === interactionId)
      .sort((left, right) => right.sendId.localeCompare(left.sendId))[0] ?? null;
  }

  #retireVerificationSends(interactionId: string): void {
    const sends = this.#store.auxiliaryEntries("notification_control:verification_send:")
      .map(([, raw]) => verificationSendFrom(raw))
      .filter((send): send is VerificationSendRecord => send?.interactionId === interactionId);
    for (const send of sends) {
      if (send.state === "ready_pending") {
        this.#saveVerificationSend({
          ...send,
          state: "canceled",
          encryptedDeliveryTarget: null,
          encryptedVerificationCode: null,
          noFutureRetry: true,
          version: send.version + 1,
        });
      } else if (send.state === "submitting") {
        this.#saveVerificationSend({
          ...send,
          state: "delivery_unknown",
          encryptedDeliveryTarget: null,
          encryptedVerificationCode: null,
          leaseExpiresAt: null,
          noFutureRetry: true,
          version: send.version + 1,
        });
      } else if (send.state === "delivery_unknown" && (!send.noFutureRetry || send.encryptedDeliveryTarget !== null || send.encryptedVerificationCode !== null)) {
        this.#saveVerificationSend({
          ...send,
          encryptedDeliveryTarget: null,
          encryptedVerificationCode: null,
          leaseExpiresAt: null,
          noFutureRetry: true,
          version: send.version + 1,
        });
      }
    }
  }

  #clearEndpoint(interactionId: string): NotificationEndpointV1 {
    const stored = this.#store.notification(interactionId);
    if (stored.endpoint.state === "cleared" && stored.endpoint.encryptedAddress === null) return stored.endpoint;
    const endpoint = validateNotificationEndpointV1({
      ...stored.endpoint,
      state: "cleared",
      encryptedAddress: null,
      redactedMarker: null,
      verificationExpiresAt: null,
      confirmedAt: null,
      version: stored.endpoint.version + 1,
    });
    this.#store.saveNotification({ endpoint, syntheticPlaintextAddress: null, challengeId: null });
    return endpoint;
  }

  #expireChallenge(interactionId: string, endpoint: NotificationEndpointV1): void {
    this.#retireVerificationSends(interactionId);
    const cleared = validateNotificationEndpointV1({
      ...endpoint,
      state: "cleared",
      encryptedAddress: null,
      redactedMarker: null,
      verificationExpiresAt: null,
      confirmedAt: null,
      version: endpoint.version + 1,
    });
    this.#store.saveNotification({ endpoint: cleared, syntheticPlaintextAddress: null, challengeId: null });
    this.#store.saveAuxiliary(challengeKey(interactionId), { schemaVersion: "synthetic_notification_challenge_terminal.v1" });
  }
}
