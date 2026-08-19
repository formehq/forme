import Link from "next/link";
import { HostedRuntimeUnavailable, roomApplication, roomRuntimeMode } from "../src/runtime.ts";
import { coreOperationDefinition } from "../src/core-policy.ts";

export const dynamic = "force-dynamic";

export default async function ThirdPlacePage() {
  const mode = roomRuntimeMode();
  if (mode === "unavailable") {
    return (
      <section className="projection">
        <p className="eyebrow">Fail-closed hosted boundary</p>
        <h1>Third Place is not provisioned.</h1>
        <p>
          This build contains no active Room runtime. Set <span className="mono">FORME_R4_SYNTHETIC=1</span> only
          for the synthetic walkthrough, or install the separately bounded loopback activation runtime.
        </p>
      </section>
    );
  }

  let residents: Array<Record<string, unknown>> = [];
  try {
    const result = await (await roomApplication()).runCore({
      definition: coreOperationDefinition("third_place.list"),
      params: {},
      body: {},
      authorization: null,
      syntheticActor: null,
      idempotencyKey: null,
      expectedVersion: null,
      syntheticClientBucket: null,
    });
    residents = result.body.residents as Array<Record<string, unknown>>;
  } catch (error) {
    if (!(error instanceof HostedRuntimeUnavailable)) throw error;
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Forme Third Place · {mode === "synthetic" ? "synthetic walkthrough" : "local durable activation"}</p>
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
            const view = resident.view as Record<string, unknown> | undefined;
            const projection = (view?.projection ?? resident.projection) as Record<string, unknown>;
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
