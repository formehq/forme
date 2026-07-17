export type HarnessRuntime = "codex" | "opencode";

export type RuntimeTransport = "one-shot" | "jsonl-rpc" | "http-sse";

export type IsolationLevel = "os-sandbox" | "application-permissions" | "none";

/**
 * Capabilities are facts the Forme kernel can branch on. They are deliberately
 * separate from product authorization: a runtime may be able to write while a
 * Forme pass is still constrained to read-only proposal generation.
 */
export interface RuntimeCapabilities {
  structuredOutput: boolean;
  streamedEvents: boolean;
  applicationPermissions: boolean;
  isolation: IsolationLevel;
  sessionResume: boolean;
  workspaceDiff: boolean;
  revert: boolean;
  plugins: boolean;
  skills: boolean;
  mcp: boolean;
  subagents: boolean;
}

export interface RuntimeDescriptor {
  runtime: HarnessRuntime;
  label: string;
  installed: boolean;
  version?: string;
  transports: RuntimeTransport[];
  health: "ready" | "unavailable";
  capabilities: RuntimeCapabilities;
  detail?: string;
}

export type ProposalRuntime = "codex-exec" | "codex-app-server" | "opencode";

export interface StructuredRunRequest {
  cwd: string;
  prompt: string;
  outputSchema: unknown;
  model?: string;
  timeoutMs?: number;
}

export interface StructuredRunResult {
  runtime: ProposalRuntime;
  raw: string;
  sessionId?: string;
}
