import { notFound } from "next/navigation";
import { hostedApplication, syntheticModeEnabled } from "../../../../src/runtime.ts";
import { operationDefinition } from "../../../../src/operation-inventory.ts";
import { OwnerControls } from "../../../../src/components/OwnerControls.tsx";

export const dynamic = "force-dynamic";

interface OwnerInteractionPageProps {
  params: Promise<{ interactionId: string }>;
}

export default async function OwnerInteractionPage({ params }: OwnerInteractionPageProps) {
  if (!syntheticModeEnabled()) return <p className="error">Owner identity is not provisioned.</p>;
  const { interactionId } = await params;
  let interaction: Record<string, unknown>;
  try {
    const result = await hostedApplication().run({
      definition: operationDefinition("control.interaction.read"),
      params: { interactionId },
      body: {},
      authorization: null,
      syntheticActor: "controller",
      idempotencyKey: null,
      expectedVersion: null,
    });
    interaction = result.body.interaction as Record<string, unknown>;
  } catch {
    notFound();
  }
  return (
    <article className="projection">
      <p className="eyebrow">Owner review · hosted copy</p>
      <h1>A private signal arrived.</h1>
      <div className="meta">
        <span className="pill">{String(interaction.interactionType)}</span>
        <span className="pill">{String(interaction.consent)}</span>
        <span className={`pill ${["accepted", "seen_locally", "preparing"].includes(String(interaction.state)) ? "pillWarn" : "pillLive"}`}>{String(interaction.state)}</span>
      </div>
      <section className="card cardWide">
        <p className="eyebrow">Guest request · untrusted data</p>
        <p className="projectionBody">{String(interaction.requestText)}</p>
      </section>
      <hr className="divider" />
      <OwnerControls interactionId={interactionId} version={Number(interaction.stateVersion)} state={String(interaction.state)} />
    </article>
  );
}
