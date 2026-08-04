"use client";

import { useEffect, useState } from "react";
import { GuestAsk } from "./GuestAsk.tsx";

interface ProjectionView {
  projectionId: string;
  roomId: string;
  title: string;
  thirdPlaceSummary: string;
  claims: Array<{ slot: string; text: string }>;
  supportedInteractions: Array<"ask" | "seed" | "resonance">;
}

interface LifecycleView { version: number; ownerState: string }

export function PrivateProjection({ projectionId }: { projectionId: string }) {
  const [projection, setProjection] = useState<ProjectionView | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleView | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [capability, setCapability] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function open(secret: string) {
    const response = await fetch(`/api/v1/projections/${encodeURIComponent(projectionId)}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const value = await response.json() as { view?: { projection: ProjectionView; lifecycle: LifecycleView; warning: string | null } };
    if (!response.ok || !value.view) {
      setError("This exact Private Room and Projection Grant is unavailable.");
      return;
    }
    setCapability(secret);
    setProjection(value.view.projection);
    setLifecycle(value.view.lifecycle);
    setWarning(value.view.warning);
    setError(null);
  }

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (fragment) void open(fragment);
  }, []);

  if (projection && lifecycle) {
    return (
      <div className="projection">
        <p className="eyebrow">Private projection · exact Grant</p>
        <h1>{projection.title}</h1>
        <p>{projection.thirdPlaceSummary}</p>
        {projection.claims.map((claim, index) => <p className="projectionBody" key={`${claim.slot}-${index}`}>{claim.text}</p>)}
        <hr className="divider" />
        {warning === null && lifecycle.ownerState === "published_fresh" ? (
          <>
            <h2>Send a private signal</h2>
            <GuestAsk projection={{
              projectionId: projection.projectionId,
              version: lifecycle.version,
              supportedInteractions: projection.supportedInteractions,
            }} capabilitySecret={capability} />
          </>
        ) : (
          <div className="notice"><p>This Projection remains readable under the exact Grant, but it cannot accept a new Interaction.</p></div>
        )}
      </div>
    );
  }

  return (
    <section className="projection">
      <p className="eyebrow">Private Room boundary</p>
      <h1>Exact access only.</h1>
      <p>A public relationship, familiar label, or Third Place visit does not reveal this Projection.</p>
      <form className="formStack" onSubmit={(event) => {
        event.preventDefault();
        const secret = String(new FormData(event.currentTarget).get("grant") ?? "");
        window.location.hash = secret;
        void open(secret);
      }}>
        <label>
          Private Grant capability
          <input name="grant" type="password" autoComplete="off" required />
        </label>
        <button type="submit">Open exact Projection</button>
      </form>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </section>
  );
}
