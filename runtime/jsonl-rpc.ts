import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { boundedAppend, terminateProcess, type CommandSpec } from "./process.ts";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface RpcNotification {
  method: string;
  params?: unknown;
}

export interface RpcServerRequest {
  id: number | string;
  method: string;
  params?: unknown;
}

export type ServerRequestHandler = (request: RpcServerRequest) => Promise<unknown>;

interface ClientOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
  onServerRequest?: ServerRequestHandler;
}

/** Minimal JSONL request client for Codex App Server's JSON-RPC-like wire format. */
export class JsonLineRpcClient {
  readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly notifications: RpcNotification[] = [];
  private readonly listeners = new Set<(notification: RpcNotification) => void>();
  private readonly requestTimeoutMs: number;
  private readonly onServerRequest?: ServerRequestHandler;
  private nextId = 1;
  private stdoutBuffer = "";
  private stderrTail = "";
  private stopped = false;

  constructor(command: CommandSpec, options: ClientOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.onServerRequest = options.onServerRequest;
    this.child = spawn(command.command, command.args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.consumeStdout(chunk));
    this.child.stderr.on("data", (chunk: string) => {
      this.stderrTail = boundedAppend(this.stderrTail, chunk);
    });
    this.child.once("error", (error) => this.failAll(error));
    this.child.once("exit", (code, signal) => {
      if (this.stopped) return;
      const detail = this.stderrTail.trim();
      this.failAll(
        new Error(
          `runtime process exited before close (code=${String(code)}, signal=${String(signal)})` +
            (detail ? `: ${detail}` : ""),
        ),
      );
    });
  }

  async request<T>(method: string, params?: unknown, timeoutMs = this.requestTimeoutMs): Promise<T> {
    const id = this.nextId++;
    const result = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`runtime request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
    });
    this.write({ id, method, ...(params === undefined ? {} : { params }) });
    return result;
  }

  notify(method: string, params?: unknown): void {
    this.write({ method, ...(params === undefined ? {} : { params }) });
  }

  onNotification(listener: (notification: RpcNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  waitFor(
    method: string,
    predicate: (params: unknown) => boolean = () => true,
    timeoutMs = this.requestTimeoutMs,
  ): Promise<unknown> {
    const existing = this.notifications.findIndex(
      (notification) => notification.method === method && predicate(notification.params),
    );
    if (existing >= 0) return Promise.resolve(this.notifications.splice(existing, 1)[0]?.params);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        dispose();
        reject(new Error(`runtime notification timed out: ${method}`));
      }, timeoutMs);
      const dispose = this.onNotification((notification) => {
        if (notification.method !== method || !predicate(notification.params)) return;
        clearTimeout(timer);
        dispose();
        const index = this.notifications.indexOf(notification);
        if (index >= 0) this.notifications.splice(index, 1);
        resolve(notification.params);
      });
    });
  }

  async close(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.child.stdin.end();
    await terminateProcess(this.child);
    this.failAll(new Error("runtime connection closed"));
  }

  private consumeStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const newline = this.stdoutBuffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message: unknown;
      try {
        message = JSON.parse(line);
      } catch {
        this.failAll(new Error(`runtime emitted non-JSON stdout: ${line.slice(0, 300)}`));
        continue;
      }
      void this.handleMessage(message);
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isRecord(message)) return;
    const method = typeof message.method === "string" ? message.method : undefined;
    const id = typeof message.id === "number" || typeof message.id === "string" ? message.id : undefined;

    if (method && id !== undefined) {
      try {
        if (!this.onServerRequest) throw new Error(`unsupported server request: ${method}`);
        const result = await this.onServerRequest({ id, method, params: message.params });
        this.write({ id, result });
      } catch (error) {
        this.write({
          id,
          error: { code: -32601, message: error instanceof Error ? error.message : String(error) },
        });
      }
      return;
    }

    if (method) {
      const notification = { method, params: message.params };
      this.notifications.push(notification);
      if (this.notifications.length > 250) this.notifications.shift();
      for (const listener of this.listeners) listener(notification);
      return;
    }

    if (typeof id === "number") {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      if (message.error !== undefined) {
        pending.reject(new Error(`runtime RPC error: ${JSON.stringify(message.error).slice(0, 1_000)}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private write(message: unknown): void {
    if (this.stopped || !this.child.stdin.writable) throw new Error("runtime connection is not writable");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
