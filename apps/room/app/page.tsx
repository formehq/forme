import Link from "next/link";
import { HostedRuntimeUnavailable, hostedApplication, syntheticModeEnabled } from "../src/runtime.ts";

export const dynamic = "force-dynamic";

export default async function ThirdPlacePage() {
  if (!syntheticModeEnabled()) {
    return (
      <section className="projection">
        <p className="eyebrow">Fail-closed hosted boundary</p>
        <h1>Third Place is not provisioned.</h1>
        <p>
          This build contains no production database, identity, email, provider, or deployment adapter.
          Set <span className="mono">FORME_R4_SYNTHETIC=1</span> only for the local synthetic walkthrough.
        </p>
      </section>
    );
  }

  let residents: Array<Record<string, unknown>> = [];
  try {
    const result = await hostedApplication().publicThirdPlace();
    residents = result.body.residents as Array<Record<string, unknown>>;
  } catch (error) {
    if (!(error instanceof HostedRuntimeUnavailable)) throw error;
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Forme Third Place · synthetic Gate A</p>
          <h1>Meet what a project is becoming.</h1>
        </div>
        <div className="heroNote">
          <strong>A public square for deliberately shallow projections.</strong>
          <p>Read what an Owner chose to publish. If you need more depth, send a private signal; the deeper Twin remains local.</p>
        </div>
      </section>
      <section aria-labelledby="residents-title">
        <p className="eyebrow">Curated residents · one P0 resident</p>
        <h2 id="residents-title">Present in the room</h2>
        <div className="grid">
          {residents.map((resident) => {
            const view = resident.view as Record<string, unknown>;
            const projection = view.projection as Record<string, unknown>;
            return (
            <article className="card" key={String(projection.projectionId)}>
              <div className="meta">
                <span className="pill pillLive">current</span>
                <span className="pill">Owner published · Curator admitted</span>
              </div>
              <h3>{String(projection.title)}</h3>
              <p>{String(projection.thirdPlaceSummary)}</p>
              <Link className="cardLink" href={`/p/${encodeURIComponent(String(projection.projectionId))}`}>Enter Projection →</Link>
            </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
