import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonLineRpcClient } from "./jsonl-rpc.ts";
import { commandVersion, safeError, type CommandSpec } from "./process.ts";
import type {
  RuntimeCapabilities,
  RuntimeDescriptor,
  StructuredRunRequest,
  StructuredRunResult,
} from "./types.ts";

export const CODEX_CAPABILITIES: RuntimeCapabilities = {
  structuredOutput: true,
  streamedEvents: true,
  applicationPermissions: true,
  isolation: "os-sandbox",
  sessionResume: true,
  workspaceDiff: true,
  revert: true,
  plugins: true,
  skills: true,
  mcp: true,
  subagents: true,
};

export function codexCommand(): CommandSpec {
  return { command: process.env.CODEX_BIN ?? "codex", args: [] };
}

export function inspectCodex(command = codexCommand()): RuntimeDescriptor {
  try {
    return {
      runtime: "codex",
      label: "OpenAI Codex",
      installed: true,
      version: commandVersion(command),
      transports: ["one-shot", "jsonl-rpc"],
      health: "ready",
      capabilities: CODEX_CAPABILITIES,
    };
  } catch (error) {
    return {
      runtime: "codex",
      label: "OpenAI Codex",
      installed: false,
      transports: ["one-shot", "jsonl-rpc"],
      health: "unavailable",
      capabilities: CODEX_CAPABILITIES,
      detail: safeError(error),
    };
  }
}

interface ConnectCodexOptions {
  command?: CommandSpec;
  requestTimeoutMs?: number;
}

interface ThreadStartResponse {
  thread: { id: string };
}

interface TurnStartResponse {
  turn: { id: string };
}

interface TurnCompletedParams {
  threadId: string;
  turn: {
    id: string;
    status: string;
    error?: unknown;
    items: Array<{ type?: string; text?: string }>;
  };
}

interface ItemCompletedParams {
  threadId: string;
  turnId: string;
  item: { type?: string; text?: string; phase?: string };
}

export class CodexAppServerConnection {
  readonly descriptor: RuntimeDescriptor;
  private readonly rpc: JsonLineRpcClient;
  private readonly exitHandler: () => void;
  private constructor(
    rpc: JsonLineRpcClient,
    descriptor: RuntimeDescriptor,
  ) {
    this.rpc = rpc;
    this.descriptor = descriptor;
    this.exitHandler = () => this.rpc.child.kill("SIGTERM");
    process.once("exit", this.exitHandler);
  }

  static async connect(options: ConnectCodexOptions = {}): Promise<CodexAppServerConnection> {
    const command = options.command ?? codexCommand();
    const descriptor = inspectCodex(command);
    if (!descriptor.installed) throw new Error(descriptor.detail ?? "Codex is unavailable");

    const rpc = new JsonLineRpcClient(
      { command: command.command, args: [...command.args, "app-server"] },
      { requestTimeoutMs: options.requestTimeoutMs ?? 30_000, env: process.env },
    );
    try {
      await rpc.request("initialize", {
        clientInfo: { name: "forme", title: "Forme", version: "0.0.0" },
        capabilities: { experimentalApi: false },
      });
      rpc.notify("initialized");
      return new CodexAppServerConnection(rpc, descriptor);
    } catch (error) {
      await rpc.close();
      throw error;
    }
  }

  async runStructured(request: StructuredRunRequest): Promise<StructuredRunResult> {
    const timeoutMs = request.timeoutMs ?? 10 * 60_000;
    const thread = await this.rpc.request<ThreadStartResponse>(
      "thread/start",
      {
        cwd: request.cwd,
        approvalPolicy: "never",
        sandbox: "read-only",
        ephemeral: true,
        ...(request.model ? { model: request.model } : {}),
      },
      timeoutMs,
    );
    if (!thread.thread?.id) throw new Error("Codex App Server returned no thread id");

    let streamedFinal: string | undefined;
    const dispose = this.rpc.onNotification((notification) => {
      if (notification.method !== "item/completed") return;
      const value = notification.params as Partial<ItemCompletedParams> | undefined;
      if (
        value?.threadId === thread.thread.id &&
        value.item?.type === "agentMessage" &&
        typeof value.item.text === "string"
      ) {
        streamedFinal = value.item.text;
      }
    });

    let turn: TurnStartResponse;
    let completed: TurnCompletedParams;
    try {
      turn = await this.rpc.request<TurnStartResponse>(
        "turn/start",
        {
          threadId: thread.thread.id,
          input: [{ type: "text", text: request.prompt }],
          outputSchema: request.outputSchema,
          ...(request.model ? { model: request.model } : {}),
        },
        timeoutMs,
      );
      if (!turn.turn?.id) throw new Error("Codex App Server returned no turn id");

      completed = (await this.rpc.waitFor(
        "turn/completed",
        (params) => {
          const value = params as Partial<TurnCompletedParams> | undefined;
          return value?.threadId === thread.thread.id && value.turn?.id === turn.turn.id;
        },
        timeoutMs,
      )) as TurnCompletedParams;
    } finally {
      dispose();
    }

    if (completed.turn.status !== "completed") {
      throw new Error(`Codex turn ${completed.turn.status}: ${JSON.stringify(completed.turn.error).slice(0, 1_000)}`);
    }
    const message = [...completed.turn.items]
      .reverse()
      .find((item) => item.type === "agentMessage" && typeof item.text === "string");
    const raw = streamedFinal ?? message?.text;
    if (!raw) throw new Error("Codex completed without a final structured message");

    return { runtime: "codex-app-server", raw, sessionId: thread.thread.id };
  }

  close(): Promise<void> {
    process.off("exit", this.exitHandler);
    return this.rpc.close();
  }
}

export function runCodexExecStructured(
  request: StructuredRunRequest,
  command = codexCommand(),
): StructuredRunResult {
  const directory = mkdtempSync(join(tmpdir(), "forme-codex-exec-"));
  const schemaPath = join(directory, "output.schema.json");
  const outputPath = join(directory, "last-message.json");
  writeFileSync(schemaPath, JSON.stringify(request.outputSchema));
  const args = [
    ...command.args,
    "exec",
    "--sandbox", "read-only",
    "-C", request.cwd,
    "--skip-git-repo-check",
    "--output-schema", schemaPath,
    "-o", outputPath,
  ];
  if (request.model) args.push("-m", request.model);
  args.push(request.prompt);

  try {
    execFileSync(command.command, args, {
      stdio: ["ignore", "inherit", "inherit"],
      timeout: request.timeoutMs ?? 10 * 60_000,
    });
    return { runtime: "codex-exec", raw: readFileSync(outputPath, "utf8") };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
