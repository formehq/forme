import {
  CodexAppServerConnection,
  runCodexExecStructured,
} from "./codex.ts";
import { OpenCodeServerConnection } from "./opencode.ts";
import type { ProposalRuntime, StructuredRunRequest, StructuredRunResult } from "./types.ts";

export function parseProposalRuntime(value: string | undefined): ProposalRuntime {
  const runtime = value || "codex-exec";
  if (runtime === "codex-exec" || runtime === "codex-app-server" || runtime === "opencode") {
    return runtime;
  }
  throw new Error(
    `unknown Forme runtime '${runtime}' (expected codex-exec, codex-app-server, or opencode)`,
  );
}
export async function runStructuredAgent(
  runtime: ProposalRuntime,
  request: StructuredRunRequest,
): Promise<StructuredRunResult> {
  if (runtime === "codex-exec") return runCodexExecStructured(request);

  if (runtime === "codex-app-server") {
    const connection = await CodexAppServerConnection.connect({ requestTimeoutMs: request.timeoutMs });
    try {
      return await connection.runStructured(request);
    } finally {
      await connection.close();
    }
  }

  const connection = await OpenCodeServerConnection.connect({
    cwd: request.cwd,
    allowNpxFallback: true,
  });
  try {
    return await connection.runStructured(request);
  } finally {
    await connection.close();
  }
}
