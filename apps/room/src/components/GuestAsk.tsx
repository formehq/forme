"use client";

import { useState, type FormEvent } from "react";
import {
  SYNTHETIC_BACKUP_RETENTION_DISCLOSURE,
  SYNTHETIC_CONSENT_COPY_HASH,
  SYNTHETIC_CONSENT_COPY_V1,
  SYNTHETIC_PROVIDER_POLICY_HASH,
  SYNTHETIC_PROVIDER_POLICY_URL,
  SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE,
} from "../consent.ts";
import { readClientApiJson, safeClientFailure } from "./client-api.ts";

interface ProjectionInput {
  projectionId: string;
  version: number;
  supportedInteractions: readonly ("ask" | "seed" | "resonance")[];
}

interface GuestAskProps {
  projection: ProjectionInput;
  capabilitySecret?: string;
  runtimeMode?: "synthetic" | "local_public_core";
}

interface GuestAskRecoveryV1 {
  schemaVersion: "guest_ask_browser_recovery.v1";
  encounterSecret: string;
  encounterIdempotencyKey: string;
  interactionIdempotencyKey: string;
  replySecret: string;
  deleteSecret: string;
}

function secret(bytes = 32): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function idempotencyKey(): string {
  return secret(16);
}

function recoveryKey(projectionId: string): string {
  return `forme:r4:ask-recovery:${projectionId}`;
}

function publicRateBucket(projectionId: string): string {
  const key = `forme:r4:public-rate:${projectionId}`;
  const existing = sessionStorage.getItem(key);
  if (isIdempotencyKey(existing)) return existing;
  const created = idempotencyKey();
  sessionStorage.setItem(key, created);
  return created;
}

function newRecovery(): GuestAskRecoveryV1 {
  return {
    schemaVersion: "guest_ask_browser_recovery.v1",
    encounterSecret: secret(),
    encounterIdempotencyKey: idempotencyKey(),
    interactionIdempotencyKey: idempotencyKey(),
    replySecret: secret(),
    deleteSecret: secret(),
  };
}

function isCapability(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);
}

function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{22}$/u.test(value);
}

function readRecovery(projectionId: string): GuestAskRecoveryV1 | null {
  const raw = sessionStorage.getItem(recoveryKey(projectionId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<GuestAskRecoveryV1>;
    if (
      value.schemaVersion !== "guest_ask_browser_recovery.v1"
      || !isCapability(value.encounterSecret)
      || !isIdempotencyKey(value.encounterIdempotencyKey)
      || !isIdempotencyKey(value.interactionIdempotencyKey)
      || !isCapability(value.replySecret)
      || !isCapability(value.deleteSecret)
    ) {
      throw new Error("invalid recovery envelope");
    }
    return value as GuestAskRecoveryV1;
  } catch {
    sessionStorage.removeItem(recoveryKey(projectionId));
    return null;
  }
}

function loadOrCreateRecovery(projectionId: string): GuestAskRecoveryV1 {
  const existing = readRecovery(projectionId);
  if (existing) return existing;
  const created = newRecovery();
  // Persist every client-held recovery capability before the first remote
  // mutation. A retry after a lost HTTP response must reuse the same bytes.
  sessionStorage.setItem(recoveryKey(projectionId), JSON.stringify(created));
  return created;
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return readClientApiJson(response, "The Room did not accept this signal. Check that the Projection is still current and retry.");
}

export function GuestAsk({ projection, capabilitySecret, runtimeMode = "synthetic" }: GuestAskProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const recovery = loadOrCreateRecovery(projection.projectionId);
      let interactionCapability = capabilitySecret;
      if (!interactionCapability) {
        interactionCapability = recovery.encounterSecret;
        await responseJson(await fetch(`/api/v1/projections/${encodeURIComponent(projection.projectionId)}/encounters`, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": recovery.encounterIdempotencyKey,
            "If-Match": String(projection.version),
            "X-Forme-Synthetic-Client-Bucket": publicRateBucket(projection.projectionId),
          },
          body: JSON.stringify({ encounterSecret: interactionCapability }),
        }));
      }
      const result = await responseJson(await fetch("/api/v1/interactions", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${interactionCapability}`,
          "Content-Type": "application/json",
          "Idempotency-Key": recovery.interactionIdempotencyKey,
        },
        body: JSON.stringify({
          projectionId: projection.projectionId,
          interactionType: form.get("interactionType"),
          consent: form.get("consent"),
          requestBody: form.get("requestBody"),
          guestCapsule: null,
          replySecret: recovery.replySecret,
          deleteSecret: recovery.deleteSecret,
        }),
      }));
      const interactionId = String(result.interactionId ?? result.targetId);
      localStorage.setItem(`forme:r4:delete:${interactionId}`, recovery.deleteSecret);
      sessionStorage.removeItem(recoveryKey(projection.projectionId));
      window.location.assign(`/g/${encodeURIComponent(interactionId)}#${recovery.replySecret}`);
    } catch (cause) {
      const message = safeClientFailure(cause, "The Room server could not be reached. Check your connection and retry.");
      setError(`${message} Your recovery capabilities remain in this browser tab; submit the same request again to reconcile a lost response.`);
      setBusy(false);
    }
  }

  return (
    <form className="formStack" onSubmit={submit}>
      <label>
        What would you like this Twin&apos;s Owner to consider?
        <textarea name="requestBody" required maxLength={12 * 1024} placeholder="Ask, seed an idea, or share a resonance…" />
      </label>
      <div className="grid">
        <label className="card">
          Signal type
          <select name="interactionType" defaultValue={projection.supportedInteractions[0]}>
            {projection.supportedInteractions.map((interactionType) => (
              <option key={interactionType} value={interactionType}>
                {interactionType === "ask" ? "Ask" : interactionType === "seed" ? "Seed" : "Resonance"}
              </option>
            ))}
          </select>
        </label>
        <label className="card">
          Local response path
          <select name="consent" defaultValue={runtimeMode === "local_public_core" ? "manual_owner_only" : "allow_owner_local_ai"}>
            {runtimeMode === "synthetic"
              ? <option value="allow_owner_local_ai">Allow one Owner-started local AI session</option>
              : null}
            <option value="manual_owner_only">Owner manual response only</option>
          </select>
        </label>
      </div>
      <div className="notice">
        {runtimeMode === "synthetic" ? (
          <>
            <p>{SYNTHETIC_CONSENT_COPY_V1}</p>
            <details>
              <summary>Exact synthetic policy and retention identifiers</summary>
              <dl className="consentFacts">
                <dt>Provider policy URL</dt><dd className="mono">{SYNTHETIC_PROVIDER_POLICY_URL}</dd>
                <dt>Provider policy hash</dt><dd className="mono">{SYNTHETIC_PROVIDER_POLICY_HASH}</dd>
                <dt>Consent-copy hash</dt><dd className="mono">{SYNTHETIC_CONSENT_COPY_HASH}</dd>
                <dt>Provider retention</dt><dd>{SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE}</dd>
                <dt>Hosted backup</dt><dd>{SYNTHETIC_BACKUP_RETENTION_DISCLOSURE}</dd>
              </dl>
            </details>
          </>
        ) : (
          <p>
            This #67 activation carries one private request to the local Owner. It invokes no model,
            sends no email, and creates no automatic answer. The request remains encrypted in the
            bounded local PostgreSQL activation until the reviewed cleanup or deletion step.
          </p>
        )}
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button disabled={busy} type="submit">{busy ? "Sending privately…" : "Send private signal"}</button>
    </form>
  );
}
