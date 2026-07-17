import { execFileSync, type ChildProcess } from "node:child_process";

export interface CommandSpec {
  command: string;
  args: string[];
}

export function commandVersion(spec: CommandSpec, timeoutMs = 10_000): string {
  return execFileSync(spec.command, [...spec.args, "--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

export function boundedAppend(current: string, chunk: string, limit = 8_000): string {
  const next = current + chunk;
  return next.length <= limit ? next : next.slice(next.length - limit);
}

export async function terminateProcess(child: ChildProcess, graceMs = 1_500): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  let timeout: NodeJS.Timeout | undefined;
  const timer = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => resolve("timeout"), graceMs);
  });
  const outcome = await Promise.race([exited.then(() => "exit" as const), timer]);
  if (timeout) clearTimeout(timeout);
  if (outcome === "timeout") {
    child.kill("SIGKILL");
    await Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, 500))]);
  }
}

export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const home = process.env.HOME;
  return (home ? message.replaceAll(home, "~") : message).slice(0, 1_000);
}
