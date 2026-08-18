"use client";

import { useCallback, useEffect, useState } from "react";
import { readClientApiJson, safeClientFailure } from "./client-api.ts";

interface InteractionView {
  interactionId: string;
  state: string;
  stateVersion: number;
  acceptedAt: string;
  expiresAt: string;
  response: { body: string; publishedAt: string } | null;
  grantOffer: {
    schemaVersion: "grant_offer_reply_view.v1";
    offerId: string;
    targetProjectionId: string;
    title: string;
    publicRoomLabel: string | null;
    presetId: string;
    acceptanceExpiresAt: string;
    offeredGrantExpiresAt: string;
  } | null;
}

function normalizeInteraction(value: unknown): InteractionView | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const stateVersion = input.stateVersion ?? input.version;
  if (
    typeof input.interactionId !== "string"
    || typeof input.state !== "string"
    || typeof stateVersion !== "number"
    || !Number.isSafeInteger(stateVersion)
    || typeof input.acceptedAt !== "string"
    || typeof input.expiresAt !== "string"
  ) return null;
  return {
    interactionId: input.interactionId,
    state: input.state,
    stateVersion,
    acceptedAt: input.acceptedAt,
    expiresAt: input.expiresAt,
    response: input.response && typeof input.response === "object" && !Array.isArray(input.response)
      ? input.response as InteractionView["response"]
      : null,
    grantOffer: input.grantOffer && typeof input.grantOffer === "object" && !Array.isArray(input.grantOffer)
      ? input.grantOffer as InteractionView["grantOffer"]
      : null,
  };
}

interface GrantOfferRecoveryV1 {
  schemaVersion: "guest_grant_offer_recovery.v1";
  interactionId: string;
  offer: NonNullable<InteractionView["grantOffer"]>;
  grantSecret: string;
  idempotencyKey: string;
}

function secret(bytes = 16): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function offerRecoveryKey(offerId: string): string {
  return `forme:r4:grant-offer-recovery:${offerId}`;
}

function parseOfferRecovery(raw: string): GrantOfferRecoveryV1 | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GrantOfferRecoveryV1>;
    if (
      parsed.schemaVersion === "guest_grant_offer_recovery.v1"
      && typeof parsed.interactionId === "string"
      && parsed.offer?.schemaVersion === "grant_offer_reply_view.v1"
      && typeof parsed.offer.offerId === "string"
      && typeof parsed.offer.title === "string"
      && typeof parsed.grantSecret === "string"
      && /^[A-Za-z0-9_-]{43}$/u.test(parsed.grantSecret)
      && typeof parsed.idempotencyKey === "string"
      && /^[A-Za-z0-9_-]{22}$/u.test(parsed.idempotencyKey)
    ) return parsed as GrantOfferRecoveryV1;
  } catch {
    // Invalid browser-local recovery is ignored and replaced on the next accept.
  }
  return null;
}

function pendingOfferRecovery(interactionId: string): GrantOfferRecoveryV1 | null {
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (!key?.startsWith("forme:r4:grant-offer-recovery:")) continue;
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? parseOfferRecovery(raw) : null;
    if (parsed?.interactionId === interactionId) return parsed;
  }
  return null;
}

function loadOrCreateOfferRecovery(
  interactionId: string,
  offer: NonNullable<InteractionView["grantOffer"]>,
): GrantOfferRecoveryV1 {
  const key = offerRecoveryKey(offer.offerId);
  const raw = sessionStorage.getItem(key);
  if (raw) {
    const parsed = parseOfferRecovery(raw);
    if (parsed?.interactionId === interactionId && parsed.offer.offerId === offer.offerId) return parsed;
  }
  const recovery: GrantOfferRecoveryV1 = {
    schemaVersion: "guest_grant_offer_recovery.v1",
    interactionId,
    offer,
    grantSecret: secret(32),
    idempotencyKey: secret(16),
  };
  // Persist both bytes before the remote mutation. A lost response can be
  // reconciled with the exact same request without losing the accepted Grant.
  sessionStorage.setItem(key, JSON.stringify(recovery));
  return recovery;
}

export function GuestStatus({ interactionId }: { interactionId: string }) {
  const [interaction, setInteraction] = useState<InteractionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerRecovery, setOfferRecovery] = useState<GrantOfferRecoveryV1 | null>(null);

  const replySecret = useCallback(() => window.location.hash.slice(1), []);
  const refresh = useCallback(async () => {
    const capability = replySecret();
    if (!capability) {
      setError("This page needs the private reply capability kept in the URL fragment.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/interactions/${encodeURIComponent(interactionId)}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${capability}` },
      });
      const value = await readClientApiJson(
        response,
        "This private reply is unavailable. Check that the complete link, including its # fragment, is open in this browser.",
      ) as { interaction?: InteractionView };
      const interaction = normalizeInteraction(value.interaction);
      if (!interaction) throw new Error("invalid response shape");
      setInteraction(interaction);
      setError(null);
    } catch (cause) {
      setError(safeClientFailure(
        cause,
        "The Room server could not be reached. Your private reply link is unchanged; check your connection and retry.",
      ));
    } finally {
      setBusy(false);
    }
  }, [interactionId, replySecret]);

  useEffect(() => {
    setOfferRecovery(pendingOfferRecovery(interactionId));
    void refresh();
  }, [interactionId, refresh]);

  async function deleteInteraction() {
    if (!interaction) return;
    const deleteSecret = localStorage.getItem(`forme:r4:delete:${interactionId}`);
    if (!deleteSecret) {
      setError("The delete capability is not present in this browser.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/interactions/${encodeURIComponent(interactionId)}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${deleteSecret}`,
          "Content-Type": "application/json",
          "Idempotency-Key": secret(),
          "If-Match": String(interaction.stateVersion),
        },
        body: "{}",
      });
      await readClientApiJson(
        response,
        "Delete did not complete. Refresh the latest status and retry with the capability kept in this browser.",
      );
      localStorage.removeItem(`forme:r4:delete:${interactionId}`);
      setInteraction({ ...interaction, state: "interaction_deleted", response: null });
      setNotice("This Interaction and its hosted response were deleted.");
    } catch (cause) {
      setError(safeClientFailure(
        cause,
        "The Room server could not be reached. Nothing was removed from this browser; check your connection and retry.",
      ));
    } finally {
      setBusy(false);
    }
  }

  async function acceptGrantOffer() {
    const offer = interaction?.grantOffer ?? offerRecovery?.offer ?? null;
    if (!interaction || !offer) return;
    const recovery = offerRecovery?.offer.offerId === offer.offerId
      ? offerRecovery
      : loadOrCreateOfferRecovery(interactionId, offer);
    setOfferRecovery(recovery);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/grant-offers/${encodeURIComponent(offer.offerId)}/accept`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${replySecret()}`,
          "Content-Type": "application/json",
          "Idempotency-Key": recovery.idempotencyKey,
          "If-Match": "1",
        },
        body: JSON.stringify({ grantSecret: recovery.grantSecret }),
      });
      const result = await readClientApiJson(
        response,
        "This Grant offer could not be accepted. Refresh its status and retry with the recovery kept in this browser.",
      ) as { grant?: { grantId?: string } };
      const grantId = result.grant?.grantId;
      if (typeof grantId !== "string") throw new Error("invalid response shape");
      localStorage.setItem(`forme:r4:grant:${grantId}`, recovery.grantSecret);
      sessionStorage.removeItem(offerRecoveryKey(offer.offerId));
      setOfferRecovery(null);
      setInteraction({ ...interaction, grantOffer: null });
      setNotice(`Grant accepted for ${offer.title}. Its private capability is stored only in this browser.`);
    } catch (cause) {
      setError(safeClientFailure(
        cause,
        "The Room server could not be reached. The exact Grant recovery remains in this browser tab; retry to reconcile a lost response.",
      ));
    } finally {
      setBusy(false);
    }
  }

  if (!interaction) return <p className={error ? "error" : undefined}>{error ?? "Opening private reply…"}</p>;

  return (
    <div className="formStack" aria-busy={busy}>
      <div className="meta">
        <span className={`pill ${interaction.state === "response_ready" ? "pillLive" : ""}`}>{interaction.state}</span>
        <span className="pill">version {interaction.stateVersion}</span>
      </div>
      {interaction.response ? (
        <section className="card cardWide">
          <p className="eyebrow">Owner-approved response</p>
          <p className="projectionBody">{interaction.response.body}</p>
          <p className="mono">Published {interaction.response.publishedAt}</p>
        </section>
      ) : (
        <div className="notice"><p>Nothing is auto-generated here. The Owner may respond later, or explicitly close without a response.</p></div>
      )}
      {interaction.grantOffer || offerRecovery ? (
        <section className="card cardWide">
          <p className="eyebrow">Owner-offered continuation</p>
          <h2>{(interaction.grantOffer ?? offerRecovery?.offer)?.title}</h2>
          <p>
            {(interaction.grantOffer ?? offerRecovery?.offer)?.publicRoomLabel
              ? `${(interaction.grantOffer ?? offerRecovery?.offer)?.publicRoomLabel} · `
              : "Continuation · "}
            {(interaction.grantOffer ?? offerRecovery?.offer)?.presetId.replaceAll("_", " ")}
          </p>
          <p className="mono">Accept by {(interaction.grantOffer ?? offerRecovery?.offer)?.acceptanceExpiresAt}</p>
          {offerRecovery && !interaction.grantOffer
            ? <p>Acceptance may already have committed. Retry with the exact browser-held bytes to recover its receipt.</p>
            : null}
          <button disabled={busy} onClick={() => void acceptGrantOffer()} type="button">
            {offerRecovery && !interaction.grantOffer ? "Recover Grant acceptance" : "Accept continuation"}
          </button>
        </section>
      ) : null}
      <button className="buttonQuiet" disabled={busy} onClick={() => void refresh()} type="button">{busy ? "Working…" : "Check status"}</button>
      <button className="buttonQuiet" disabled={busy || interaction.state === "interaction_deleted"} onClick={() => void deleteInteraction()} type="button">Delete this Interaction</button>
      {notice ? <p className="success" role="status">{notice}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}
