import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  canonicalSha256,
  parseStrictJson,
  type JsonValue,
} from "../../r4-protocol/src/index.ts";
import {
  admitFreshCandidateProviderSse,
  buildSyntheticFreshCandidateProviderSse,
} from "./fresh-candidate-provider-gate.ts";
import {
  FRESH_CANDIDATE_BASE_INSTRUCTIONS,
  FRESH_CANDIDATE_MODEL,
  FRESH_CANDIDATE_OUTPUT_SCHEMA,
  FRESH_CANDIDATE_REASONING_EFFORT,
  buildFreshCandidateAppServerCommand,
  buildPinnedFreshCandidateModelCatalog,
  buildSyntheticFreshCandidatePreflightPrompt,
  compileFreshCandidateUpstreamRequest,
  resolvePinnedCodexNative,
  type FreshCandidatePreflightPrompt,
} from "./fresh-candidate-preflight.ts";

const MAX_JSONL_LINE_BYTES = 1_048_576;
const MAX_CAPTURE_BYTES = 1_048_576;
const ROUND_TRIP_TIMEOUT_MILLISECONDS = 20_000;
const CREDENTIAL_HEADERS = new Set([
  "authorization", "cookie", "openai-organization", "openai-project", "proxy-authorization", "x-api-key",
]);
const ALLOWED_NOTIFICATION_METHODS = new Set([
  "account/rateLimits/updated",
  "deprecationNotice",
  "remoteControl/status/changed",
  "thread/started",
  "thread/settings/updated",
  "thread/status/changed",
  "thread/tokenUsage/updated",
  "turn/started",
  "item/started",
  "item/reasoning/summaryPartAdded",
  "item/reasoning/summaryTextDelta",
  "item/reasoning/textDelta",
  "item/agentMessage/delta",
  "item/completed",
  "turn/completed",
]);
const repositoryRoot = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."));
const profilePath = path.join(repositoryRoot, "schemas/r4/macos/forme-fresh-candidate-preflight.sb");

export class FreshCandidateBrokeredSessionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "FreshCandidateBrokeredSessionError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new FreshCandidateBrokeredSessionError(code);
}

function record(value: JsonValue, code: string): Record<string, JsonValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as Record<string, JsonValue>;
}

function safeText(value: JsonValue | undefined, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) fail(code);
  return value;
}

function writeFrame(child: ChildProcessWithoutNullStreams, value: JsonValue): void {
  const frame = `${canonicalJson(value)}\n`;
  if (Buffer.byteLength(frame, "utf8") > MAX_JSONL_LINE_BYTES) fail("FRESH_ROUND_TRIP_FRAME_TOO_LARGE");
  child.stdin.write(frame);
}

async function terminateProcessGroup(child: ChildProcessWithoutNullStreams): Promise<boolean> {
  const pid = child.pid;
  if (pid === undefined) return true;
  const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
  try { process.kill(-pid, "SIGTERM"); } catch { /* Already absent. */ }
  await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 500))]);
  try { process.kill(-pid, "SIGKILL"); } catch { /* Already absent. */ }
  await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 500))]);
  try { process.kill(-pid, 0); return false; } catch { return true; }
}

interface BrokerState {
  requests: number;
  captured: Buffer | null;
  responseBody: Buffer;
  prompt: FreshCandidatePreflightPrompt;
  requestSha256: `sha256:${string}` | null;
  requestShapeSha256: `sha256:${string}` | null;
  providerVisibleRequestBytes: number;
  providerAdmissionHash: `sha256:${string}` | null;
  resolve(): void;
  reject(error: Error): void;
}

function brokerHandler(state: BrokerState, request: IncomingMessage, response: ServerResponse): void {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "POST" || url.pathname !== "/v1/responses" || url.search !== "") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "FORME_ROUTE_DENIED" } }));
    state.reject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_ROUTE_DENIED"));
    return;
  }
  state.requests += 1;
  if (state.requests !== 1) {
    response.writeHead(409, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "FORME_DISPATCH_REPLAY_DENIED" } }));
    state.reject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_REPLAY_DENIED"));
    return;
  }
  if (Object.keys(request.headers).some((name) => CREDENTIAL_HEADERS.has(name))) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "FORME_CREDENTIAL_HEADER_DENIED" } }));
    state.reject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_CREDENTIAL_DENIED"));
    return;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  request.on("data", (chunk: Buffer) => {
    total += chunk.length;
    if (total > MAX_CAPTURE_BYTES) request.destroy(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_CAPTURE_TOO_LARGE"));
    else chunks.push(Buffer.from(chunk));
  });
  request.once("error", (error) => state.reject(error));
  request.once("end", () => {
    if (total > MAX_CAPTURE_BYTES) return;
    try {
      state.captured = Buffer.concat(chunks);
      for (const chunk of chunks) chunk.fill(0);
      const captured = parseStrictJson(state.captured.toString("utf8"));
      const compiled = compileFreshCandidateUpstreamRequest({ captured, prompt: state.prompt, temporaryRoot: "<physical-root>" });
      const admission = admitFreshCandidateProviderSse(state.responseBody);
      state.requestSha256 = canonicalSha256(compiled.request);
      state.requestShapeSha256 = compiled.requestShapeSha256;
      state.providerVisibleRequestBytes = compiled.providerVisibleRequestBytes;
      state.providerAdmissionHash = canonicalSha256({
        responseTextSha256: admission.responseTextSha256,
        providerResponseIdSha256: admission.providerResponseIdSha256,
        providerBodySha256: admission.providerBodySha256,
        inputTokens: admission.inputTokens,
        outputTokens: admission.outputTokens,
        applicableSpendUsd: admission.applicableSpendUsd,
      });
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "close",
      });
      response.end(state.responseBody, () => state.resolve());
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "FORME_BROKER_ADMISSION_DENIED" } }));
      state.reject(error instanceof Error ? error : new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_BROKER_FAILED"));
    }
  });
}

export interface FreshCandidateSyntheticRoundTripResult {
  readonly schemaVersion: "r4.fresh_candidate_synthetic_provider_round_trip.v1";
  readonly issue: 68;
  readonly verdict: "GREEN_SYNTHETIC_PROVIDER";
  readonly effects: {
    readonly providerCalls: 0;
    readonly externalNetworkCalls: 0;
    readonly syntheticProviderResponses: 1;
    readonly publicationCalls: 0;
  };
  readonly runtime: {
    readonly sessionsStarted: 1;
    readonly resumedSessions: 0;
    readonly turnsCompleted: 1;
    readonly providerDispatches: 0;
    readonly loopbackBrokerRequests: 1;
    readonly notificationCount: number;
    readonly notificationMethods: readonly string[];
  };
  readonly envelope: {
    readonly requestSha256: `sha256:${string}`;
    readonly requestShapeSha256: `sha256:${string}`;
    readonly providerVisibleRequestBytes: number;
    readonly providerAdmissionHash: `sha256:${string}`;
  };
  readonly candidate: {
    readonly candidateBytes: number;
    readonly candidateSha256: `sha256:${string}`;
    readonly completedAgentMessages: 1;
    readonly persistedCandidateBytes: 0;
  };
  readonly cleanup: {
    readonly childProcessGroupAbsent: true;
    readonly capturedRequestBytesAfterReturn: 0;
    readonly providerBodyBytesAfterReturn: 0;
    readonly temporaryRootExistsAfterReturn: false;
  };
  readonly aggregateHash: `sha256:${string}`;
}

export async function runPinnedFreshCandidateSyntheticProviderRoundTrip(
  prompt = buildSyntheticFreshCandidatePreflightPrompt(),
): Promise<FreshCandidateSyntheticRoundTripResult> {
  const temporaryRoot = realpathSync(mkdtempSync("/private/tmp/forme-r4-fresh-roundtrip-"));
  const responseText = "Use one bounded reversible step, then review the exact result before sharing.";
  const responseBody = buildSyntheticFreshCandidateProviderSse(responseText);
  const candidateSha256 = canonicalSha256(responseText);
  let capturedRequestBytesAfterReturn = -1;
  let providerBodyBytesAfterReturn = -1;
  let childAbsent = false;
  let child: ChildProcessWithoutNullStreams | null = null;
  let preimage: Omit<FreshCandidateSyntheticRoundTripResult, "aggregateHash"> | null = null;
  const server = http.createServer();
  let brokerResolve: () => void = () => {};
  let brokerReject: (error: Error) => void = () => {};
  const brokerPromise = new Promise<void>((resolve, reject) => { brokerResolve = resolve; brokerReject = reject; });
  // The broker may fail before turn/start returns. Mark the promise handled
  // immediately while preserving its rejection for the later joined await.
  void brokerPromise.catch(() => {});
  const brokerState: BrokerState = {
    requests: 0,
    captured: null,
    responseBody,
    prompt,
    requestSha256: null,
    requestShapeSha256: null,
    providerVisibleRequestBytes: 0,
    providerAdmissionHash: null,
    resolve: brokerResolve,
    reject: brokerReject,
  };
  server.on("request", (request, response) => brokerHandler(brokerState, request, response));
  try {
    chmodSync(temporaryRoot, 0o700);
    const sessionRoot = path.join(temporaryRoot, "session-root");
    const isolatedHome = path.join(temporaryRoot, "home");
    const isolatedCodexHome = path.join(temporaryRoot, "codex-home");
    const isolatedTmpdir = path.join(temporaryRoot, "tmp");
    for (const directory of [sessionRoot, isolatedHome, isolatedCodexHome, isolatedTmpdir]) mkdirSync(directory, { mode: 0o700 });
    const modelCatalogPath = path.join(temporaryRoot, "model-catalog.json");
    writeFileSync(modelCatalogPath, canonicalJson(buildPinnedFreshCandidateModelCatalog()), { encoding: "utf8", mode: 0o600 });
    const stagedProfilePath = path.join(temporaryRoot, "seatbelt.sb");
    writeFileSync(stagedProfilePath, readFileSync(profilePath), { mode: 0o400, flag: "wx" });
    const codex = resolvePinnedCodexNative();
    const stagedCodexPath = path.join(temporaryRoot, "codex-native");
    copyFileSync(codex.path, stagedCodexPath, fsConstants.COPYFILE_EXCL);
    chmodSync(stagedCodexPath, 0o500);
    const stagedCodexBytes = readFileSync(stagedCodexPath);
    try {
      const stagedCodexSha256 = `sha256:${crypto.createHash("sha256").update(stagedCodexBytes).digest("hex")}`;
      if (stagedCodexSha256 !== codex.sha256) fail("FRESH_ROUND_TRIP_CODEX_DRIFT");
    } finally {
      stagedCodexBytes.fill(0);
    }
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === "string") fail("FRESH_ROUND_TRIP_LISTENER_UNAVAILABLE");
    const command = buildFreshCandidateAppServerCommand({
      codexNative: stagedCodexPath,
      seatbeltProfilePath: stagedProfilePath,
      modelCatalogPath,
      sessionRoot,
      isolatedHome,
      isolatedCodexHome,
      isolatedTmpdir,
      capturePort: address.port,
    });
    const [executable, ...args] = command.argv;
    if (executable !== "/usr/bin/sandbox-exec") fail("FRESH_ROUND_TRIP_COMMAND_DENIED");
    const spawned = spawn(executable, args, {
      cwd: command.cwd,
      env: command.env as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    });
    child = spawned;
    let stdoutBuffer = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let nextId = 0;
    let terminalResolve: () => void = () => {};
    let terminalReject: (error: Error) => void = () => {};
    const terminalPromise = new Promise<void>((resolve, reject) => { terminalResolve = resolve; terminalReject = reject; });
    // Notifications can fail before the turn/start response resolves. Avoid an
    // unhandled-rejection process exit so the outer exact-owned cleanup runs.
    void terminalPromise.catch(() => {});
    const pending = new Map<number, { resolve(value: JsonValue): void; reject(error: Error): void }>();
    const notificationMethods: string[] = [];
    let expectedThreadId = "";
    let expectedTurnId = "";
    let candidateText = "";
    let completedUserMessages = 0;
    let completedAgentMessages = 0;
    let turnCompleted = false;
    const rejectWire = (code: string) => {
      terminalReject(new FreshCandidateBrokeredSessionError(code));
      child?.kill("SIGKILL");
    };
    spawned.stdout.setEncoding("utf8");
    spawned.stdout.on("data", (chunk: string) => {
      stdoutBytes += Buffer.byteLength(chunk, "utf8");
      if (stdoutBytes > 8 * MAX_JSONL_LINE_BYTES) { rejectWire("FRESH_ROUND_TRIP_STDOUT_TOO_LARGE"); return; }
      stdoutBuffer += chunk;
      for (;;) {
        const newline = stdoutBuffer.indexOf("\n");
        if (newline < 0) break;
        const line = stdoutBuffer.slice(0, newline);
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        if (line.length === 0) continue;
        let message: JsonValue;
        try { message = parseStrictJson(line); } catch { rejectWire("FRESH_ROUND_TRIP_JSONL_INVALID"); return; }
        const object = record(message, "FRESH_ROUND_TRIP_JSONL_INVALID");
        if (typeof object.method === "string" && object.id !== undefined) {
          rejectWire("FRESH_ROUND_TRIP_SERVER_REQUEST_DENIED");
          return;
        }
        if (typeof object.id === "number") {
          const entry = pending.get(object.id);
          if (entry === undefined) { rejectWire("FRESH_ROUND_TRIP_RESPONSE_ID_INVALID"); return; }
          pending.delete(object.id);
          if (object.error !== undefined) entry.reject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_REQUEST_FAILED"));
          else entry.resolve(object.result ?? null);
          continue;
        }
        if (typeof object.method !== "string" || !ALLOWED_NOTIFICATION_METHODS.has(object.method)) {
          const methodClass = typeof object.method === "string" && /^[A-Za-z/]+$/u.test(object.method) && object.method.length <= 80
            ? object.method.replaceAll("/", "_")
            : "malformed";
          rejectWire(`FRESH_ROUND_TRIP_NOTIFICATION_DENIED_${methodClass}`);
          return;
        }
        notificationMethods.push(object.method);
        if (object.method === "turn/started") {
          const params = record(object.params ?? null, "FRESH_ROUND_TRIP_TURN_INVALID");
          const turn = record(params.turn ?? null, "FRESH_ROUND_TRIP_TURN_INVALID");
          const observedTurnId = safeText(turn.id, "FRESH_ROUND_TRIP_TURN_INVALID");
          if (params.threadId !== expectedThreadId || (expectedTurnId !== "" && expectedTurnId !== observedTurnId)) {
            rejectWire("FRESH_ROUND_TRIP_TURN_INVALID");
            return;
          }
          expectedTurnId = observedTurnId;
        }
        if (object.method === "item/completed") {
          const params = record(object.params ?? null, "FRESH_ROUND_TRIP_ITEM_INVALID");
          const item = record(params.item ?? null, "FRESH_ROUND_TRIP_ITEM_INVALID");
          if (item.type === "agentMessage") {
            if (
              params.threadId !== expectedThreadId
              || params.turnId !== expectedTurnId
              || (item.phase !== "final_answer" && item.phase !== null && item.phase !== undefined)
              || typeof item.text !== "string"
            ) { rejectWire("FRESH_ROUND_TRIP_CANDIDATE_INVALID"); return; }
            completedAgentMessages += 1;
            candidateText = item.text;
          } else if (item.type === "userMessage") {
            if (params.threadId !== expectedThreadId || params.turnId !== expectedTurnId || completedUserMessages !== 0) {
              rejectWire("FRESH_ROUND_TRIP_USER_MESSAGE_INVALID");
              return;
            }
            completedUserMessages += 1;
          } else if (item.type !== "reasoning") {
            const itemClass = typeof item.type === "string" && /^[A-Za-z]+$/u.test(item.type) && item.type.length <= 40
              ? item.type
              : "malformed";
            rejectWire(`FRESH_ROUND_TRIP_ITEM_TYPE_DENIED_${itemClass}`);
            return;
          }
        }
        if (object.method === "turn/completed") {
          const params = record(object.params ?? null, "FRESH_ROUND_TRIP_TURN_INVALID");
          const turn = record(params.turn ?? null, "FRESH_ROUND_TRIP_TURN_INVALID");
          if (params.threadId !== expectedThreadId || turn.id !== expectedTurnId || turn.status !== "completed") {
            rejectWire("FRESH_ROUND_TRIP_TURN_INVALID");
            return;
          }
          turnCompleted = true;
          terminalResolve();
        }
      }
    });
    spawned.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_JSONL_LINE_BYTES) rejectWire("FRESH_ROUND_TRIP_STDERR_TOO_LARGE");
    });
    spawned.once("close", () => {
      for (const entry of pending.values()) entry.reject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_APP_SERVER_EXITED"));
      pending.clear();
      if (!turnCompleted) terminalReject(new FreshCandidateBrokeredSessionError("FRESH_ROUND_TRIP_APP_SERVER_EXITED"));
    });
    const request = (method: string, params: JsonValue): Promise<JsonValue> => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      writeFrame(spawned, { id, method, params });
    });
    const timer = setTimeout(() => rejectWire("FRESH_ROUND_TRIP_TIMEOUT"), ROUND_TRIP_TIMEOUT_MILLISECONDS);
    try {
      await request("initialize", {
        clientInfo: { name: "forme_fresh_round_trip", title: "Forme Fresh Round Trip", version: "0.1.0" },
        capabilities: { experimentalApi: true, mcpServerOpenaiFormElicitation: false, requestAttestation: false },
      });
      writeFrame(spawned, { method: "initialized", params: {} });
      const threadResult = record(await request("thread/start", {
        model: FRESH_CANDIDATE_MODEL,
        modelProvider: "forme_capture",
        cwd: sessionRoot,
        approvalPolicy: "never",
        sandbox: "read-only",
        baseInstructions: FRESH_CANDIDATE_BASE_INSTRUCTIONS,
        developerInstructions: prompt.orientationText,
        dynamicTools: [],
        environments: [],
        runtimeWorkspaceRoots: [sessionRoot],
        selectedCapabilityRoots: [],
        ephemeral: true,
        allowProviderModelFallback: false,
      }), "FRESH_ROUND_TRIP_THREAD_INVALID");
      const thread = record(threadResult.thread ?? null, "FRESH_ROUND_TRIP_THREAD_INVALID");
      expectedThreadId = safeText(thread.id, "FRESH_ROUND_TRIP_THREAD_INVALID");
      const turnResultPromise = request("turn/start", {
        threadId: expectedThreadId,
        input: [{ type: "text", text: prompt.userPayloadText, text_elements: [] }],
        model: FRESH_CANDIDATE_MODEL,
        effort: FRESH_CANDIDATE_REASONING_EFFORT,
        approvalPolicy: "never",
        cwd: sessionRoot,
        environments: [],
        runtimeWorkspaceRoots: [sessionRoot],
        outputSchema: FRESH_CANDIDATE_OUTPUT_SCHEMA,
      });
      const turnResult = record(await turnResultPromise, "FRESH_ROUND_TRIP_TURN_INVALID");
      const turn = record(turnResult.turn ?? null, "FRESH_ROUND_TRIP_TURN_INVALID");
      const returnedTurnId = safeText(turn.id, "FRESH_ROUND_TRIP_TURN_INVALID");
      if (expectedTurnId !== "" && returnedTurnId !== expectedTurnId) fail("FRESH_ROUND_TRIP_TURN_INVALID");
      expectedTurnId = returnedTurnId;
      await Promise.all([brokerPromise, terminalPromise]);
      if (
        brokerState.requestSha256 === null
        || brokerState.requestShapeSha256 === null
        || brokerState.providerAdmissionHash === null
        || completedUserMessages !== 1
        || completedAgentMessages !== 1
        || candidateText !== canonicalJson({ responseText })
        || canonicalSha256(JSON.parse(candidateText) as JsonValue) !== canonicalSha256({ responseText })
      ) fail("FRESH_ROUND_TRIP_CANDIDATE_MISMATCH");
      const methods = Object.freeze([...new Set(notificationMethods)].sort());
      preimage = {
        schemaVersion: "r4.fresh_candidate_synthetic_provider_round_trip.v1",
        issue: 68,
        verdict: "GREEN_SYNTHETIC_PROVIDER",
        effects: { providerCalls: 0, externalNetworkCalls: 0, syntheticProviderResponses: 1, publicationCalls: 0 },
        runtime: {
          sessionsStarted: 1,
          resumedSessions: 0,
          turnsCompleted: 1,
          providerDispatches: 0,
          loopbackBrokerRequests: brokerState.requests as 1,
          notificationCount: notificationMethods.length,
          notificationMethods: methods,
        },
        envelope: {
          requestSha256: brokerState.requestSha256,
          requestShapeSha256: brokerState.requestShapeSha256,
          providerVisibleRequestBytes: brokerState.providerVisibleRequestBytes,
          providerAdmissionHash: brokerState.providerAdmissionHash,
        },
        candidate: {
          candidateBytes: Buffer.byteLength(responseText, "utf8"),
          candidateSha256,
          completedAgentMessages: completedAgentMessages as 1,
          persistedCandidateBytes: 0,
        },
        cleanup: {
          childProcessGroupAbsent: true,
          capturedRequestBytesAfterReturn: 0,
          providerBodyBytesAfterReturn: 0,
          temporaryRootExistsAfterReturn: false,
        },
      };
      candidateText = "";
    } finally {
      clearTimeout(timer);
    }
  } finally {
    brokerState.captured?.fill(0);
    brokerState.captured = null;
    capturedRequestBytesAfterReturn = 0;
    responseBody.fill(0);
    providerBodyBytesAfterReturn = 0;
    if (child !== null) childAbsent = await terminateProcessGroup(child);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  if (
    preimage === null
    || existsSync(temporaryRoot)
    || !childAbsent
    || capturedRequestBytesAfterReturn !== 0
    || providerBodyBytesAfterReturn !== 0
  ) fail("FRESH_ROUND_TRIP_CLEANUP_FAILED");
  return Object.freeze({ ...preimage, aggregateHash: canonicalSha256(preimage) });
}
