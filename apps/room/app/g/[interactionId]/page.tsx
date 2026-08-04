import { GuestStatus } from "../../../src/components/GuestStatus.tsx";

interface GuestStatusPageProps {
  params: Promise<{ interactionId: string }>;
}

export default async function GuestStatusPage({ params }: GuestStatusPageProps) {
  const { interactionId } = await params;
  return (
    <section className="projection">
      <p className="eyebrow">Private reply capability</p>
      <h1>Your signal, on your URL.</h1>
      <p>Polling this retained capability is canonical. An optional email can only say that a response is ready.</p>
      <GuestStatus interactionId={interactionId} />
    </section>
  );
}
