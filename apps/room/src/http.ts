import { randomUUID } from "node:crypto";
import { parseStrictJson } from "../../../packages/r4-protocol/src/index.ts";
import { HostedRuntimeUnavailable, hostedApplication } from "./runtime.ts";
import { matchOperation } from "./operation-inventory.ts";
import { isSemanticError, SemanticError } from "./application.ts";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method === "GET") {
    const values: Record<string, unknown> = {};
    new URL(request.url).searchParams.forEach((value, key) => {
      if (Object.hasOwn(values, key)) {
        throw new SemanticError(400, "duplicate_query_key", "GET query keys must be unique");
      }
      values[key] = /^\d+$/.test(value) ? Number(value) : value;
    });
    return values;
  }
  const type = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (type !== "application/json") throw new SemanticError(400, "json_required", "Request body must use application/json");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 64 * 1024) throw new SemanticError(413, "request_too_large", "Request exceeds the synthetic API ceiling");
  let value: unknown;
  try {
    value = parseStrictJson(raw);
  } catch {
    throw new SemanticError(400, "invalid_json", "Request body is not valid JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SemanticError(400, "invalid_request", "Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function expectedVersion(request: Request): number | null {
  const raw = request.headers.get("if-match");
  if (raw === null) return null;
  const normalized = raw.replace(/^"|"$/g, "");
  if (!/^\d+$/.test(normalized)) throw new SemanticError(400, "invalid_expected_version", "If-Match must contain an integer object version");
  return Number(normalized);
}

export async function dispatchApi(request: Request, segments: string[]): Promise<Response> {
  const correlationId = randomUUID();
  try {
    const path = `/${segments.map(encodeURIComponent).join("/")}`;
    const match = matchOperation(request.method, path);
    if (!match) return json(404, { error: { code: "not_found", correlationId } });
    const body = await requestBody(request);
    const result = await hostedApplication().run({
      definition: match.definition,
      params: match.params,
      body,
      authorization: request.headers.get("authorization"),
      syntheticActor: request.headers.get("x-forme-synthetic-actor"),
      idempotencyKey: request.headers.get("idempotency-key"),
      expectedVersion: expectedVersion(request),
      syntheticClientBucket: request.headers.get("x-forme-synthetic-client-bucket"),
    });
    return json(result.status, result.body);
  } catch (error) {
    if (isSemanticError(error)) {
      return json(error.status, { error: { code: error.code, message: error.message, correlationId } });
    }
    if (error instanceof HostedRuntimeUnavailable) {
      return json(503, { error: { code: "hosted_runtime_unavailable", correlationId } });
    }
    return json(503, { error: { code: "service_unavailable", correlationId } });
  }
}
