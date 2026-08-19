"use client";

import { useState } from "react";
import { readClientApiJson, safeClientFailure } from "./client-api.ts";

function key(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function OwnerControls({ interactionId, version, state }: { interactionId: string; version: number; state: string }) {
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function close() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(`/api/v1/control/interactions/${encodeURIComponent(interactionId)}/close`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key(),
          "If-Match": String(version),
          "X-Forme-Synthetic-Actor": "controller",
        },
        body: "{}",
      });
      await readClientApiJson(
        response,
        "Close did not complete. Reload Owner Control to get the latest state, then retry.",
      );
      setResult({ kind: "success", text: "The Interaction was closed without a response." });
    } catch (cause) {
      setResult({
        kind: "error",
        text: safeClientFailure(
          cause,
          "The Room server could not be reached. No confirmed change was received; reload Owner Control before retrying.",
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="formStack" aria-busy={busy}>
      <div className="notice"><p>The hosted Owner surface can inspect and control lifecycle. It cannot draft or approve outgoing Response text; that stays in the protected local ceremony.</p></div>
      <button className="buttonQuiet" disabled={busy || !["accepted", "seen_locally", "preparing"].includes(state)} onClick={() => void close()} type="button">Close without response</button>
      {result ? <p className={result.kind === "success" ? "success" : "error"} role={result.kind === "success" ? "status" : "alert"}>{result.text}</p> : null}
    </div>
  );
}
