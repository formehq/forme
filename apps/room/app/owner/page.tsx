import Link from "next/link";
import { hostedApplication, syntheticModeEnabled } from "../../src/runtime.ts";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  if (!syntheticModeEnabled()) {
    return (
      <section className="projection">
        <p className="eyebrow">Owner control · unavailable</p>
        <h1>No identity adapter is installed.</h1>
        <p>Production Controller and Curator access remains behind Gate C. This build does not fall back to an open dashboard.</p>
      </section>
    );
  }
  const result = await hostedApplication().ownerStatus();
  const rooms = result.body.rooms as Array<Record<string, unknown>>;
  const interactions = result.body.interactions as Array<Record<string, unknown>>;
  const pending = interactions.filter((item) => {
    const interaction = item.interaction as Record<string, unknown>;
    return ["accepted", "seen_locally", "preparing"].includes(String(interaction.state));
  });

  return (
    <>
      <section className="ownerHeader">
        <div>
          <p className="eyebrow">Owner control plane · synthetic</p>
          <h1>State first. Action when needed.</h1>
        </div>
        <span className="pill pillWarn">No production identity · no hosted AI</span>
      </section>
      <div className="grid">
        <section className="card">
          <p className="eyebrow">Room health</p>
          <h2>{rooms.length} exact Rooms</h2>
          <div className="statusList">
            {rooms.map((storedRoom) => {
              const room = storedRoom.room as Record<string, unknown>;
              return (
              <div className="statusRow" key={String(room.roomId)}>
                <p>{String(storedRoom.label)}</p>
                <span className="pill">{String(room.roomKind)} · {String(room.status)}</span>
              </div>
              );
            })}
          </div>
        </section>
        <section className="card">
          <p className="eyebrow">Signal Box</p>
          <h2>{pending.length} waiting</h2>
          <div className="statusList">
            {interactions.map((item) => {
              const interaction = item.interaction as Record<string, unknown>;
              return (
              <div className="statusRow" key={String(interaction.interactionId)}>
                <div>
                  <p>{String(interaction.interactionType)}</p>
                  <Link className="mono" href={`/owner/interactions/${encodeURIComponent(String(interaction.interactionId))}`}>{String(interaction.interactionId)}</Link>
                </div>
                <span className={`pill ${["accepted", "seen_locally", "preparing"].includes(String(interaction.state)) ? "pillWarn" : ""}`}>{String(interaction.state)}</span>
              </div>
              );
            })}
          </div>
        </section>
        <section className="card cardWide">
          <p className="eyebrow">Boundary</p>
          <h2>Management here. Judgment stays local.</h2>
          <p>The hosted surface exposes lifecycle and status through the same canonical API used by Web and CLI. It cannot start Codex or approve outgoing response text.</p>
        </section>
      </div>
    </>
  );
}
