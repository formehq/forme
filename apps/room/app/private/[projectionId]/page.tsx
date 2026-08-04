import { PrivateProjection } from "../../../src/components/PrivateProjection.tsx";

interface PrivateProjectionPageProps {
  params: Promise<{ projectionId: string }>;
}

export default async function PrivateProjectionPage({ params }: PrivateProjectionPageProps) {
  const { projectionId } = await params;
  return <PrivateProjection projectionId={projectionId} />;
}
