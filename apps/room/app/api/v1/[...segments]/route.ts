import { dispatchApi } from "../../../../src/http.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ segments: string[] }>;
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { segments } = await context.params;
  return dispatchApi(request, segments);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
