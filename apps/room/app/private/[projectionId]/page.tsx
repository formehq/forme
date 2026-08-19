import { notFound } from "next/navigation";

interface PrivateProjectionPageProps {
  params: Promise<{ projectionId: string }>;
}

export default async function PrivateProjectionPage({ params }: PrivateProjectionPageProps) {
  // Consume the route shape without reading a Projection. Private Room is a
  // frozen Full target and is intentionally absent from the active Core Web.
  await params;
  notFound();
}
