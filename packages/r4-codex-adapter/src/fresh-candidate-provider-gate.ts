import crypto from "node:crypto";
import { request as httpsRequest } from "node:https";

import {
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  type JsonValue,
} from "../../r4-protocol/src/index.ts";
import {
  FRESH_CANDIDATE_INPUT_USD_PER_MILLION_TOKENS,
  FRESH_CANDIDATE_MAX_INPUT_TOKENS,
  FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
  FRESH_CANDIDATE_MAXIMUM_USD,
  FRESH_CANDIDATE_MODEL,
  FRESH_CANDIDATE_OUTPUT_USD_PER_MILLION_TOKENS,
  FRESH_CANDIDATE_WALL_CLOCK_SECONDS,
} from "./fresh-candidate-preflight.ts";

const OPENAI_HOST = "api.openai.com";
const OPENAI_PATH = "/v1/responses";
const MAX_PROVIDER_BODY_BYTES = 2 * 1_024 * 1_024;
const MAX_API_KEY_BYTES = 512;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const ALLOWED_SSE_EVENTS = new Set([
  "response.created",
  "response.in_progress",
  "response.output_item.added",
  "response.content_part.added",
  "response.output_text.delta",
  "response.output_text.done",
  "response.content_part.done",
  "response.output_item.done",
  "response.completed",
]);

export class FreshCandidateProviderGateError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "FreshCandidateProviderGateError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new FreshCandidateProviderGateError(code);
}

function record(value: JsonValue, code: string): Record<string, JsonValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as Record<string, JsonValue>;
}

function safeInteger(value: JsonValue | undefined, maximum: number, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > maximum) fail(code);
  return value as number;
}

function exactResponseText(value: string): string {
  let parsed: JsonValue;
  try {
    parsed = parseStrictJson(value);
  } catch {
    fail("FRESH_PROVIDER_OUTPUT_JSON_INVALID");
  }
  const object = record(parsed, "FRESH_PROVIDER_OUTPUT_JSON_INVALID");
  if (
    Object.keys(object).length !== 1
    || typeof object.responseText !== "string"
    || object.responseText.length < 1
    || object.responseText.length > 1_024
    || Buffer.byteLength(object.responseText, "utf8") > 16_384
    || canonicalJson(object) !== value
  ) fail("FRESH_PROVIDER_OUTPUT_SCHEMA_INVALID");
  return object.responseText;
}

export interface FreshCandidateProviderAdmission {
  readonly responseText: string;
  readonly responseTextSha256: `sha256:${string}`;
  readonly providerResponseIdSha256: `sha256:${string}`;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly applicableSpendUsd: number;
  readonly completedEventCount: 1;
  readonly toolOutputCount: 0;
  readonly providerBodySha256: `sha256:${string}`;
}

interface SseEvent {
  readonly event: string;
  readonly data: string;
}

function parseSseEvents(body: Buffer): readonly SseEvent[] {
  if (body.length === 0 || body.length > MAX_PROVIDER_BODY_BYTES) fail("FRESH_PROVIDER_BODY_SIZE_INVALID");
  const text = body.toString("utf8");
  if (Buffer.byteLength(text, "utf8") !== body.length || text.includes("\0")) fail("FRESH_PROVIDER_BODY_ENCODING_INVALID");
  const normalized = text.replaceAll("\r\n", "\n");
  const events: SseEvent[] = [];
  for (const frame of normalized.split("\n\n")) {
    if (frame.length === 0) continue;
    let event: string | null = null;
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event: ")) {
        if (event !== null) fail("FRESH_PROVIDER_SSE_FRAME_INVALID");
        event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        data.push(line.slice(6));
      } else {
        fail("FRESH_PROVIDER_SSE_FRAME_INVALID");
      }
    }
    if (event === null || data.length !== 1) fail("FRESH_PROVIDER_SSE_FRAME_INVALID");
    events.push(Object.freeze({ event, data: data[0]! }));
  }
  if (events.length === 0 || events.length > 4_096) fail("FRESH_PROVIDER_SSE_EVENT_COUNT_INVALID");
  return Object.freeze(events);
}

export function admitFreshCandidateProviderSse(body: Buffer): FreshCandidateProviderAdmission {
  const providerBodySha256 = `sha256:${crypto.createHash("sha256").update(body).digest("hex")}` as const;
  const events = parseSseEvents(body);
  let completed: Record<string, JsonValue> | null = null;
  for (const frame of events) {
    if (frame.data === "[DONE]") {
      if (frame !== events.at(-1) || frame.event !== "done") fail("FRESH_PROVIDER_DONE_INVALID");
      continue;
    }
    let value: JsonValue;
    try {
      value = parseStrictJson(frame.data);
    } catch {
      fail("FRESH_PROVIDER_EVENT_JSON_INVALID");
    }
    const object = record(value, "FRESH_PROVIDER_EVENT_JSON_INVALID");
    if (object.type !== frame.event) fail("FRESH_PROVIDER_EVENT_TYPE_MISMATCH");
    if (!ALLOWED_SSE_EVENTS.has(frame.event)) fail("FRESH_PROVIDER_EVENT_TYPE_DENIED");
    if (
      frame.event === "error"
      || frame.event === "response.failed"
      || frame.event === "response.incomplete"
      || frame.event.includes("tool_call")
      || frame.event.includes("function_call")
    ) fail("FRESH_PROVIDER_TERMINAL_DENIED");
    if (frame.event === "response.completed") {
      if (completed !== null) fail("FRESH_PROVIDER_COMPLETION_AMBIGUOUS");
      completed = record(object.response ?? null, "FRESH_PROVIDER_COMPLETION_INVALID");
    }
  }
  if (completed === null) fail("FRESH_PROVIDER_COMPLETION_MISSING");
  if (completed.status !== "completed" || completed.model !== FRESH_CANDIDATE_MODEL) {
    fail("FRESH_PROVIDER_COMPLETION_INVALID");
  }
  if (completed.error !== null || completed.incomplete_details !== null) fail("FRESH_PROVIDER_COMPLETION_INVALID");
  const responseId = completed.id;
  if (typeof responseId !== "string" || !/^resp_[A-Za-z0-9_-]{8,200}$/u.test(responseId)) {
    fail("FRESH_PROVIDER_RESPONSE_ID_INVALID");
  }
  const outputs = completed.output;
  if (!Array.isArray(outputs) || outputs.length < 1 || outputs.length > 8) fail("FRESH_PROVIDER_OUTPUT_INVALID");
  const messages: Record<string, JsonValue>[] = [];
  for (const output of outputs) {
    const item = record(output, "FRESH_PROVIDER_OUTPUT_INVALID");
    if (item.type === "reasoning") continue;
    if (item.type !== "message") fail("FRESH_PROVIDER_TOOL_OUTPUT_DENIED");
    messages.push(item);
  }
  if (messages.length !== 1) fail("FRESH_PROVIDER_OUTPUT_AMBIGUOUS");
  const message = messages[0]!;
  if (message.status !== "completed" || message.role !== "assistant" || !Array.isArray(message.content)) {
    fail("FRESH_PROVIDER_OUTPUT_INVALID");
  }
  if (message.content.length !== 1) fail("FRESH_PROVIDER_OUTPUT_AMBIGUOUS");
  const content = record(message.content[0] ?? null, "FRESH_PROVIDER_OUTPUT_INVALID");
  if (content.type !== "output_text" || typeof content.text !== "string") fail("FRESH_PROVIDER_OUTPUT_INVALID");
  const responseText = exactResponseText(content.text);
  const usage = record(completed.usage ?? null, "FRESH_PROVIDER_USAGE_INVALID");
  const inputTokens = safeInteger(usage.input_tokens, FRESH_CANDIDATE_MAX_INPUT_TOKENS, "FRESH_PROVIDER_INPUT_BUDGET_EXCEEDED");
  const outputTokens = safeInteger(usage.output_tokens, FRESH_CANDIDATE_MAX_OUTPUT_TOKENS, "FRESH_PROVIDER_OUTPUT_BUDGET_EXCEEDED");
  const applicableSpendUsd = (
    inputTokens * FRESH_CANDIDATE_INPUT_USD_PER_MILLION_TOKENS
    + outputTokens * FRESH_CANDIDATE_OUTPUT_USD_PER_MILLION_TOKENS
  ) / 1_000_000;
  if (!Number.isFinite(applicableSpendUsd) || applicableSpendUsd > FRESH_CANDIDATE_MAXIMUM_USD) {
    fail("FRESH_PROVIDER_SPEND_BUDGET_EXCEEDED");
  }
  return Object.freeze({
    responseText,
    responseTextSha256: canonicalSha256(responseText),
    providerResponseIdSha256: canonicalSha256(responseId),
    inputTokens,
    outputTokens,
    applicableSpendUsd,
    completedEventCount: 1,
    toolOutputCount: 0,
    providerBodySha256,
  });
}

export interface FreshCandidateProviderDispatchReceipt {
  readonly schemaVersion: "r4.fresh_candidate_provider_dispatch.v1";
  readonly requestSha256: `sha256:${string}`;
  readonly responseTextSha256: `sha256:${string}`;
  readonly providerResponseIdSha256: `sha256:${string}`;
  readonly providerBodySha256: `sha256:${string}`;
  readonly providerDispatches: 1;
  readonly automaticRetries: 0;
  readonly redirectsFollowed: 0;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly applicableSpendUsd: number;
  readonly candidateBytes: number;
}

export type FreshCandidateProviderBodyTransport = (input: Readonly<{
  requestBody: Buffer;
  credential: Buffer;
  signal: AbortSignal;
}>) => Promise<Buffer>;

export async function dispatchFreshCandidateProviderOnce(input: Readonly<{
  request: JsonValue;
  expectedRequestSha256: `sha256:${string}`;
  credential: Buffer;
  signal: AbortSignal;
  transport: FreshCandidateProviderBodyTransport;
  reviewTransientCandidate(responseText: string): Promise<"approve_exact" | "discard">;
}>): Promise<Readonly<{ receipt: FreshCandidateProviderDispatchReceipt; decision: "approve_exact" | "discard" }>> {
  if (!SHA256.test(input.expectedRequestSha256)) fail("FRESH_PROVIDER_REQUEST_AUTHORITY_INVALID");
  if (input.signal.aborted) fail("FRESH_PROVIDER_ABORTED_BEFORE_DISPATCH");
  if (
    input.credential.length < 16
    || input.credential.length > MAX_API_KEY_BYTES
    || [...input.credential].some((byte) => byte < 0x21 || byte > 0x7e)
  ) {
    fail("FRESH_PROVIDER_CREDENTIAL_INVALID");
  }
  const requestBody = Buffer.from(canonicalJson(input.request), "utf8");
  const requestSha256 = canonicalSha256(input.request);
  if (requestSha256 !== input.expectedRequestSha256) {
    requestBody.fill(0);
    fail("FRESH_PROVIDER_REQUEST_AUTHORITY_MISMATCH");
  }
  let providerBody: Buffer | null = null;
  let responseText = "";
  const wallClockSignal = AbortSignal.timeout(FRESH_CANDIDATE_WALL_CLOCK_SECONDS * 1_000);
  const dispatchSignal = AbortSignal.any([input.signal, wallClockSignal]);
  try {
    providerBody = await input.transport({ requestBody, credential: input.credential, signal: dispatchSignal });
    const admission = admitFreshCandidateProviderSse(providerBody);
    responseText = admission.responseText;
    const decision = await input.reviewTransientCandidate(responseText);
    if (decision !== "approve_exact" && decision !== "discard") fail("FRESH_PROVIDER_REVIEW_DECISION_INVALID");
    const receipt: FreshCandidateProviderDispatchReceipt = Object.freeze({
      schemaVersion: "r4.fresh_candidate_provider_dispatch.v1",
      requestSha256,
      responseTextSha256: admission.responseTextSha256,
      providerResponseIdSha256: admission.providerResponseIdSha256,
      providerBodySha256: admission.providerBodySha256,
      providerDispatches: 1,
      automaticRetries: 0,
      redirectsFollowed: 0,
      inputTokens: admission.inputTokens,
      outputTokens: admission.outputTokens,
      applicableSpendUsd: admission.applicableSpendUsd,
      candidateBytes: Buffer.byteLength(responseText, "utf8"),
    });
    return Object.freeze({ receipt, decision });
  } finally {
    requestBody.fill(0);
    providerBody?.fill(0);
    responseText = "";
  }
}

export const openAIResponsesBodyTransport: FreshCandidateProviderBodyTransport = async ({
  requestBody,
  credential,
  signal,
}) => await new Promise<Buffer>((resolve, reject) => {
  if (signal.aborted) {
    reject(new FreshCandidateProviderGateError("FRESH_PROVIDER_ABORTED_BEFORE_DISPATCH"));
    return;
  }
  const authorization = Buffer.concat([Buffer.from("Bearer ", "ascii"), credential]).toString("latin1");
  const request = httpsRequest({
    protocol: "https:",
    hostname: OPENAI_HOST,
    port: 443,
    method: "POST",
    path: OPENAI_PATH,
    headers: {
      authorization,
      accept: "text/event-stream",
      "content-type": "application/json",
      "content-length": requestBody.length,
    },
    signal,
    agent: false,
  }, (response) => {
    if (response.statusCode !== 200 || response.headers["content-type"]?.split(";", 1)[0] !== "text/event-stream") {
      response.resume();
      reject(new FreshCandidateProviderGateError("FRESH_PROVIDER_HTTP_RESPONSE_DENIED"));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    response.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_PROVIDER_BODY_BYTES) {
        response.destroy(new FreshCandidateProviderGateError("FRESH_PROVIDER_BODY_SIZE_INVALID"));
      } else {
        chunks.push(Buffer.from(chunk));
      }
    });
    response.once("error", reject);
    response.once("end", () => {
      const body = Buffer.concat(chunks);
      for (const chunk of chunks) chunk.fill(0);
      resolve(body);
    });
  });
  request.once("error", reject);
  request.end(requestBody);
});

export function buildSyntheticFreshCandidateProviderSse(responseText: string): Buffer {
  const exactText = canonicalJson({ responseText });
  const responseId = "resp_forme_fresh_candidate_synthetic_0001";
  const message = {
    id: "msg_forme_fresh_candidate_synthetic_0001",
    type: "message",
    status: "completed",
    role: "assistant",
    content: [{ type: "output_text", annotations: [], logprobs: [], text: exactText }],
  };
  const response = {
    id: responseId,
    object: "response",
    created_at: 1_777_777_777,
    status: "completed",
    completed_at: 1_777_777_778,
    background: false,
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
    max_tool_calls: null,
    model: FRESH_CANDIDATE_MODEL,
    output: [message],
    parallel_tool_calls: false,
    previous_response_id: null,
    reasoning: { effort: "medium", summary: null },
    service_tier: "default",
    store: false,
    temperature: 1,
    text: { format: { type: "json_schema" } },
    tool_choice: "none",
    tools: [],
    top_logprobs: 0,
    top_p: 1,
    truncation: "disabled",
    usage: {
      input_tokens: 512,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 64,
      output_tokens_details: { reasoning_tokens: 16 },
      total_tokens: 576,
    },
    user: null,
    metadata: {},
  };
  const frames = [
    { event: "response.created", data: { type: "response.created", sequence_number: 0, response: { ...response, status: "in_progress", completed_at: null, output: [], usage: null } } },
    { event: "response.output_item.added", data: { type: "response.output_item.added", sequence_number: 1, output_index: 0, item: { ...message, status: "in_progress", content: [] } } },
    { event: "response.content_part.added", data: { type: "response.content_part.added", sequence_number: 2, item_id: message.id, output_index: 0, content_index: 0, part: { type: "output_text", annotations: [], logprobs: [], text: "" } } },
    { event: "response.output_text.delta", data: { type: "response.output_text.delta", sequence_number: 3, item_id: message.id, output_index: 0, content_index: 0, delta: exactText, logprobs: [] } },
    { event: "response.output_text.done", data: { type: "response.output_text.done", sequence_number: 4, item_id: message.id, output_index: 0, content_index: 0, text: exactText, logprobs: [] } },
    { event: "response.content_part.done", data: { type: "response.content_part.done", sequence_number: 5, item_id: message.id, output_index: 0, content_index: 0, part: message.content[0] } },
    { event: "response.output_item.done", data: { type: "response.output_item.done", sequence_number: 6, output_index: 0, item: message } },
    { event: "response.completed", data: { type: "response.completed", sequence_number: 7, response } },
  ];
  return Buffer.from(frames.map((frame) => `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`).join(""), "utf8");
}
