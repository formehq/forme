import { randomBytes } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  boundedAppend,
  commandVersion,
  safeError,
  terminateProcess,
  type CommandSpec,
} from "./process.ts";
import type {
  RuntimeCapabilities,
  RuntimeDescriptor,
  StructuredRunRequest,
  StructuredRunResult,
} from "./types.ts";

const PINNED_NPX_VERSION = "1.18.1";

export const OPENCODE_CAPABILITIES: RuntimeCapabilities = {
  structuredOutput: true,
  streamedEvents: true,
  applicationPermissions: true,
  // OpenCode's permission rules are valuable policy, but they are not an OS sandbox.
  isolation: "application-permissions",
  sessionResume: true,
  workspaceDiff: true,
  revert: true,
  plugins: true,
  skills: true,
  mcp: true,
  subagents: true,
};

interface ResolveOpenCodeOptions {
  command?: CommandSpec;
  allowNpxFallback?: boolean;
}

interface ResolvedOpenCode {
  command: CommandSpec;
  version: string;
  source: "installed" | "npx" | "override";
}

export function resolveOpenCode(options: ResolveOpenCodeOptions = {}): ResolvedOpenCode {
  if (options.command) {
    return { command: options.command, version: commandVersion(options.command), source: "override" };
  }

  const installed = { command: process.env.OPENCODE_BIN ?? "opencode", args: [] };
  try {
    return { command: installed, version: commandVersion(installed), source: "installed" };
  } catch (installedError) {
    if (!options.allowNpxFallback) throw installedError;
  }

  const npx = { command: "npx", args: ["--yes", `opencode-ai@${PINNED_NPX_VERSION}`] };
  return { command: npx, version: commandVersion(npx, 120_000), source: "npx" };
}

export function inspectOpenCode(options: ResolveOpenCodeOptions = {}): RuntimeDescriptor {
  try {
    const resolved = resolveOpenCode(options);
    return {
      runtime: "opencode",
      label: "OpenCode",
      installed: true,
      version: resolved.version,
      transports: ["http-sse"],
      health: "ready",
      capabilities: OPENCODE_CAPABILITIES,
      detail: resolved.source === "npx" ? `pinned npx fallback (${PINNED_NPX_VERSION})` : undefined,
    };
  } catch (error) {
    return {
      runtime: "opencode",
      label: "OpenCode",
      installed: false,
      transports: ["http-sse"],
      health: "unavailable",
      capabilities: OPENCODE_CAPABILITIES,
      detail: safeError(error),
    };
  }
}

interface ConnectOpenCodeOptions extends ResolveOpenCodeOptions {
  cwd?: string;
  isolateState?: boolean;
  startupTimeoutMs?: number;
}

interface OpenCodeHealth {
  healthy: true;
  version: string;
}

interface OpenCodeSession {
  id: string;
}

interface OpenCodePromptResponse {
  info?: {
    structured?: unknown;
    error?: unknown;
  };
}

const READ_ONLY_PERMISSIONS = [
  { permission: "*", pattern: "*", action: "deny" },
  { permission: "read", pattern: "*", action: "allow" },
  { permission: "glob", pattern: "*", action: "allow" },
  { permission: "grep", pattern: "*", action: "allow" },
  { permission: "list", pattern: "*", action: "allow" },
] as const;

export class OpenCodeServerConnection {
  readonly descriptor: RuntimeDescriptor;
  readonly baseUrl: string;
  readonly openApiPathCount: number;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly authorization: string;
  private readonly stateDirectory: string | undefined;
  private readonly exitHandler: () => void;

  private constructor(
    child: ChildProcessWithoutNullStreams,
    authorization: string,
    stateDirectory: string | undefined,
    descriptor: RuntimeDescriptor,
    baseUrl: string,
    openApiPathCount: number,
  ) {
    this.child = child;
    this.authorization = authorization;
    this.stateDirectory = stateDirectory;
    this.exitHandler = () => this.child.kill("SIGTERM");
    process.once("exit", this.exitHandler);
    this.descriptor = descriptor;
    this.baseUrl = baseUrl;
    this.openApiPathCount = openApiPathCount;
  }

  static async connect(options: ConnectOpenCodeOptions = {}): Promise<OpenCodeServerConnection> {
    const resolved = resolveOpenCode(options);
    const username = "forme";
    const password = randomBytes(24).toString("base64url");
    const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    const stateDirectory = options.isolateState ? mkdtempSync(join(tmpdir(), "forme-opencode-")) : undefined;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      OPENCODE_SERVER_USERNAME: username,
      OPENCODE_SERVER_PASSWORD: password,
      OPENCODE_PURE: "1",
      OPENCODE_DISABLE_AUTOUPDATE: "1",
      OPENCODE_DISABLE_SHARE: "1",
      OPENCODE_DISABLE_LSP_DOWNLOAD: "1",
    };
    if (stateDirectory) {
      for (const name of ["config", "data", "cache"] as const) mkdirSync(join(stateDirectory, name));
      env.XDG_CONFIG_HOME = join(stateDirectory, "config");
      env.XDG_DATA_HOME = join(stateDirectory, "data");
      env.XDG_CACHE_HOME = join(stateDirectory, "cache");
      env.OPENCODE_CONFIG_CONTENT = "{}";
      env.OPENCODE_DISABLE_PROJECT_CONFIG = "1";
    }

    const child = spawn(
      resolved.command.command,
      [...resolved.command.args, "serve", "--hostname=127.0.0.1", "--port=0"],
      {
        cwd: options.cwd ?? process.cwd(),
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      },
    );
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    try {
      const announcedUrl = await waitForServerUrl(child, options.startupTimeoutMs ?? 30_000);
      const parsed = new URL(announcedUrl);
      if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)) {
        throw new Error(`OpenCode announced a non-loopback server: ${parsed.origin}`);
      }
      const baseUrl = `http://127.0.0.1:${parsed.port}`;
      const health = await requestJson<OpenCodeHealth>(baseUrl, authorization, "/global/health", {
        timeoutMs: 10_000,
      });
      if (health.healthy !== true) throw new Error("OpenCode health endpoint did not report healthy=true");
      const doc = await requestJson<{ paths?: Record<string, unknown> }>(baseUrl, authorization, "/doc", {
        timeoutMs: 10_000,
      });
      const pathCount = Object.keys(doc.paths ?? {}).length;
      if (pathCount === 0) throw new Error("OpenCode OpenAPI document contains no paths");

      const descriptor: RuntimeDescriptor = {
        runtime: "opencode",
        label: "OpenCode",
        installed: true,
        version: health.version || resolved.version,
        transports: ["http-sse"],
        health: "ready",
        capabilities: OPENCODE_CAPABILITIES,
        detail: resolved.source === "npx" ? `pinned npx fallback (${PINNED_NPX_VERSION})` : undefined,
      };
      return new OpenCodeServerConnection(child, authorization, stateDirectory, descriptor, baseUrl, pathCount);
    } catch (error) {
      await terminateProcess(child);
      if (stateDirectory) rmSync(stateDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async runStructured(request: StructuredRunRequest): Promise<StructuredRunResult> {
    const query = `?directory=${encodeURIComponent(request.cwd)}`;
    const session = await this.request<OpenCodeSession>(`/session${query}`, {
      method: "POST",
      body: {
        title: "Forme read-only proposal pass",
        agent: "plan",
        permission: READ_ONLY_PERMISSIONS,
      },
      timeoutMs: 30_000,
    });
    if (!session.id) throw new Error("OpenCode returned no session id");

    try {
      const model = parseOpenCodeModel(request.model);
      const response = await this.request<OpenCodePromptResponse>(
        `/session/${encodeURIComponent(session.id)}/message${query}`,
        {
          method: "POST",
          body: {
            agent: "plan",
            ...(model ? { model } : {}),
            format: { type: "json_schema", schema: request.outputSchema, retryCount: 2 },
            parts: [{ type: "text", text: request.prompt }],
          },
          timeoutMs: request.timeoutMs ?? 10 * 60_000,
        },
      );
      if (response.info?.error) {
        throw new Error(`OpenCode structured run failed: ${JSON.stringify(response.info.error).slice(0, 1_000)}`);
      }
      if (response.info?.structured === undefined) {
        throw new Error("OpenCode completed without structured output");
      }
      return { runtime: "opencode", raw: JSON.stringify(response.info.structured), sessionId: session.id };
    } finally {
      await this.request(`/session/${encodeURIComponent(session.id)}${query}`, {
        method: "DELETE",
        timeoutMs: 10_000,
      }).catch(() => undefined);
    }
  }

  request<T>(
    path: string,
    options: { method?: string; body?: unknown; timeoutMs?: number } = {},
  ): Promise<T> {
    return requestJson<T>(this.baseUrl, this.authorization, path, options);
  }

  async close(): Promise<void> {
    process.off("exit", this.exitHandler);
    await terminateProcess(this.child);
    if (this.stateDirectory) rmSync(this.stateDirectory, { recursive: true, force: true });
  }
}

function parseOpenCodeModel(model: string | undefined): { providerID: string; modelID: string } | undefined {
  if (!model) return undefined;
  const separator = model.indexOf("/");
  if (separator <= 0 || separator === model.length - 1) {
    throw new Error("OpenCode --model must be provider/model (for example openai/gpt-5.2)");
  }
  return { providerID: model.slice(0, separator), modelID: model.slice(separator + 1) };
}

async function waitForServerUrl(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const finish = (error?: Error, url?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      child.off("error", onError);
      child.off("exit", onExit);
      if (error) reject(error);
      else resolve(url!);
    };
    const onData = (chunk: string) => {
      output = boundedAppend(output, chunk);
      const match = output.match(/opencode server listening on (https?:\/\/[^\s]+)/);
      if (match?.[1]) finish(undefined, match[1]);
    };
    const onError = (error: Error) => finish(error);
    const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
      finish(new Error(`OpenCode server exited during startup (code=${String(code)}, signal=${String(signal)}): ${output}`));
    const timer = setTimeout(
      () => finish(new Error(`OpenCode server did not become ready within ${timeoutMs}ms: ${output}`)),
      timeoutMs,
    );
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", onError);
    child.once("exit", onExit);
  });
}

async function requestJson<T>(
  baseUrl: string,
  authorization: string,
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: {
      Authorization: authorization,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 1_000);
    throw new Error(`OpenCode ${options.method ?? "GET"} ${path} failed (${response.status}): ${body}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
