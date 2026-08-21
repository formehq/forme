import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  actionIntentProposalJsonSchema,
  assertActionIntentProposal,
  canonicalJson,
  reflectionProposalJsonSchema,
} from "./contracts.ts";
import { expectedActionProposalId, validateActionProposalForPacket } from "./action.ts";
import { expectedProposalId, validateReflectionProposalForPacket } from "./reflection.ts";
import type {
  ActionContextPacket,
  ActionIntentProposal,
  ActionRuntimeProposalResult,
  ContextPacket,
  ReflectionProposal,
  RuntimeAuditSummary,
  RuntimeProposalResult,
} from "./types.ts";

const DEFAULT_TIMEOUT_MS = 300_000;
const ALLOWED_ITEM_TYPES = new Set(["agent_message", "reasoning"]);

export interface ReflectionRuntime {
  generate(packet: ContextPacket, forbiddenPaths?: string[]): RuntimeProposalResult;
}

export interface ActionRuntime {
  generateAction(packet: ActionContextPacket, forbiddenPaths?: string[]): ActionRuntimeProposalResult;
}

interface CodexRuntimeOptions {
  executable?: string;
  model?: string;
  timeoutMs?: number;
  now?: () => Date;
}

interface CatalogModel {
  slug?: unknown;
  visibility?: unknown;
  priority?: unknown;
}

interface AuditedOutput {
  finalMessage: string;
  audit: RuntimeAuditSummary;
}

function configArgs(model: string): string[] {
  const values = [
    "project_doc_max_bytes=0",
    'web_search="disabled"',
    'default_permissions="forme-r2"',
    'permissions.forme-r2.filesystem={":minimal"="read", ":workspace_roots"={"."="read"}}',
    "permissions.forme-r2.network.enabled=false",
    "features.shell_tool=false",
    "features.multi_agent=false",
    "features.apps=false",
    "features.goals=false",
    "features.hooks=false",
    "features.remote_plugin=false",
    "features.memories=false",
    "features.shell_snapshot=false",
    `model=${JSON.stringify(model)}`,
    'model_reasoning_effort="medium"',
  ];
  return values.flatMap((value) => ["-c", value]);
}

function isolatedEnvironment(codexHome: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, CODEX_HOME: codexHome, CODEX_CI: "1" };
  for (const name of [
    "CODEX_PERMISSION_PROFILE",
    "CODEX_THREAD_ID",
    "CODEX_INTERNAL_ORIGINATOR_OVERRIDE",
    "CODEX_SHELL",
  ]) {
    delete environment[name];
  }
  return environment;
}

function initializeCodexHome(codexHome: string): void {
  const ownerCodexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
  const auth = join(ownerCodexHome, "auth.json");
  if (!existsSync(auth)) throw new Error("Codex authentication is unavailable; run `codex login` before using the model runtime");
  symlinkSync(auth, join(codexHome, "auth.json"));
}

function processFailure(label: string, status: number | null, stderr: string): Error {
  const detail = stderr.trim().slice(0, 2000);
  return new Error(`${label} failed with status ${status ?? "unknown"}${detail ? `: ${detail}` : ""}`);
}

function safeRuntimeFailureDetail(output: string): string {
  const messages: string[] = [];
  for (const line of output.split("\n").filter(Boolean)) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.type !== "error" && event.type !== "turn.failed") continue;
      if (typeof event.message === "string") messages.push(event.message);
      const error = event.error as Record<string, unknown> | undefined;
      if (typeof error?.message === "string") messages.push(error.message);
      else if (typeof event.error === "string") messages.push(event.error);
    } catch {
      // Non-JSON output is deliberately omitted so packet or agent text cannot leak through errors.
    }
  }
  return [...new Set(messages)].join("; ").slice(0, 2000);
}

export function selectCodexModel(catalog: unknown, requested?: string): string {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Codex model catalog returned an unsupported shape");
  }
  const models = (catalog as { models?: unknown }).models;
  if (!Array.isArray(models)) throw new Error("Codex model catalog contains no model list");
  const visible = (models as CatalogModel[])
    .filter((model) => (
      typeof model.slug === "string"
      && model.visibility === "list"
      && typeof model.priority === "number"
    ))
    .sort((left, right) => (left.priority as number) - (right.priority as number));
  if (requested) {
    if (!visible.some((model) => model.slug === requested)) {
      throw new Error(`requested Codex model is not available to the authenticated account: ${requested}`);
    }
    return requested;
  }
  const selected = visible[0]?.slug;
  if (typeof selected !== "string") throw new Error("Codex model catalog has no visible supported model");
  return selected;
}

export function inspectCapabilityProbe(output: string, packetRoot: string, forbiddenPaths: string[]): void {
  let value: unknown;
  try {
    value = JSON.parse(output) as unknown;
  } catch {
    throw new Error("Codex capability probe did not return valid JSON");
  }
  if (!Array.isArray(value)) throw new Error("Codex capability probe returned an unsupported shape");
  const textParts: string[] = [];
  const collect = (item: unknown): void => {
    if (typeof item === "string") {
      textParts.push(item);
    } else if (Array.isArray(item)) {
      item.forEach(collect);
    } else if (item && typeof item === "object") {
      Object.values(item as Record<string, unknown>).forEach(collect);
    }
  };
  collect(value);
  const serialized = textParts.join("\n");
  const visibleRoot = realpathSync(packetRoot);
  if (
    !serialized.includes(`<workspace_roots><root>${visibleRoot}</root></workspace_roots>`)
    || !serialized.includes('<permission_profile type="managed"><file_system type="restricted">')
    || !serialized.includes('<entry access="read"><special>:minimal</special></entry>')
    || !serialized.includes(`<entry access="read"><path>${visibleRoot}</path></entry>`)
  ) {
    throw new Error("Codex cannot prove the required packet-only readable-root profile");
  }
  if (serialized.includes('type="unrestricted"') || serialized.includes('<entry access="write">')) {
    throw new Error("Codex capability probe exposed write or unrestricted filesystem access");
  }
  for (const path of forbiddenPaths) {
    const candidates = new Set([resolve(path)]);
    if (existsSync(path)) candidates.add(realpathSync(path));
    for (const candidate of candidates) {
      if (candidate !== visibleRoot && serialized.includes(candidate)) {
        throw new Error(`Codex capability probe exposed a forbidden path: ${candidate}`);
      }
    }
  }
}

export function auditCodexJsonl(output: string): AuditedOutput {
  const itemTypes = new Set<string>();
  let eventCount = 0;
  let toolEventCount = 0;
  let turnCompleted = false;
  let inputTokens = 0;
  let outputTokens = 0;
  let finalMessage = "";
  for (const line of output.split("\n").filter(Boolean)) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      throw new Error("Codex runtime emitted non-JSON audit output");
    }
    eventCount += 1;
    const type = typeof event.type === "string" ? event.type : "";
    if (type === "error" || type === "turn.failed") throw new Error(`Codex runtime emitted ${type}`);
    if (type === "turn.completed") {
      turnCompleted = true;
      const usage = event.usage as Record<string, unknown> | undefined;
      inputTokens = typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
      outputTokens = typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;
    }
    if (type.startsWith("item.")) {
      const item = event.item as Record<string, unknown> | undefined;
      const itemType = typeof item?.type === "string" ? item.type : "unknown";
      itemTypes.add(itemType);
      if (!ALLOWED_ITEM_TYPES.has(itemType)) toolEventCount += 1;
      if (type === "item.completed" && itemType === "agent_message" && typeof item?.text === "string") {
        finalMessage = item.text;
      }
    }
  }
  if (!turnCompleted) throw new Error("Codex runtime did not complete its turn");
  if (toolEventCount !== 0) {
    throw new Error(`Codex runtime used an unauthorized item type: ${[...itemTypes].filter((item) => !ALLOWED_ITEM_TYPES.has(item)).join(", ")}`);
  }
  if (!finalMessage) throw new Error("Codex runtime did not emit a final proposal");
  return {
    finalMessage,
    audit: {
      eventCount,
      itemTypes: [...itemTypes].sort(),
      toolEventCount,
      turnCompleted,
      inputTokens,
      outputTokens,
    },
  };
}

export interface StructuredRuntimeResult {
  proposal: unknown;
  cliVersion: string;
  model: string;
  completedAt: string;
  audit: RuntimeAuditSummary;
}

export class CodexExecRuntime implements ReflectionRuntime, ActionRuntime {
  readonly #executable: string;
  readonly #requestedModel: string | undefined;
  readonly #timeoutMs: number;
  readonly #now: () => Date;

  constructor(options: CodexRuntimeOptions = {}) {
    this.#executable = options.executable ?? "codex";
    this.#requestedModel = options.model;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#now = options.now ?? (() => new Date());
  }

  generate(packet: ContextPacket, forbiddenPaths: string[] = []): RuntimeProposalResult {
    const result = this.#generateStructured({
      packet,
      forbiddenPaths,
      schema: reflectionProposalJsonSchema(),
      schemaFilename: "reflection-proposal-v1.schema.json",
      packetFilename: "context-packet.json",
      prompt: [
        "Act only as Forme's bounded cognition function.",
        "Use the ContextPacketV1 supplied on stdin as the complete and only project evidence.",
        "Infer one cross-time relationship that is more useful than a summary.",
        "Cite both allowed evidence IDs, expose uncertainty and an alternative explanation, and ask one correction question.",
        `Set proposalId exactly to ${expectedProposalId(packet)} and baseTwinRevision exactly to ${packet.baseTwinRevision}.`,
        "Do not call tools or request more context. Return only the JSON object required by ReflectionProposalV1.",
      ].join(" "),
    });
    validateReflectionProposalForPacket(result.proposal, packet);
    return { ...result, proposal: result.proposal as ReflectionProposal };
  }

  generateAction(packet: ActionContextPacket, forbiddenPaths: string[] = []): ActionRuntimeProposalResult {
    const result = this.#generateStructured({
      packet,
      forbiddenPaths,
      schema: actionIntentProposalJsonSchema(),
      schemaFilename: "action-intent-proposal-v2.schema.json",
      packetFilename: "action-context-packet.json",
      prompt: [
        "Act only as Forme's bounded schema-only action proposer.",
        "Use the ActionContextPacketV1 supplied on stdin as the complete and only project context.",
        "Return a recommendation-first Owner Decision Brief: one plain-language answer followed by one to three independently editable judgment items with recommended choices, reasons, and bounded alternatives.",
        "Use mode recommend by default. Use ask_owner only when one named uncertainty blocks a responsible recommendation; then set confidence to low, recommendation to null, and supply exactly one blockingQuestion. In recommend mode, supply one recommendation and set blockingQuestion to null.",
        "Expose confidence and its rationale, why the decision matters now, a success check, and one way the owner should challenge the result.",
        "Never propose a path, patch, command, tool call, Markdown document, or file body.",
        `Set proposalId exactly to ${expectedActionProposalId(packet)}, baseTwinRevision exactly to ${packet.baseTwinRevision}, and actionKind exactly to render_next_move_brief.v1.`,
        "Do not call tools or request more context. Return only the JSON object required by ActionIntentProposalV2.",
      ].join(" "),
    });
    assertActionIntentProposal(result.proposal);
    validateActionProposalForPacket(result.proposal, packet);
    return { ...result, proposal: result.proposal as ActionIntentProposal };
  }

  generateStructuredPacket(options: {
    packet: unknown;
    forbiddenPaths?: string[];
    schema: object;
    schemaFilename: string;
    packetFilename: string;
    prompt: string;
  }): StructuredRuntimeResult {
    return this.#generateStructured({
      ...options,
      forbiddenPaths: options.forbiddenPaths ?? [],
    });
  }

  #generateStructured(options: {
    packet: unknown;
    forbiddenPaths: string[];
    schema: object;
    schemaFilename: string;
    packetFilename: string;
    prompt: string;
  }): StructuredRuntimeResult {
    const codexHome = mkdtempSync(join(tmpdir(), "forme-codex-home-"));
    const packetRoot = mkdtempSync(join(tmpdir(), "forme-packet-"));
    try {
      initializeCodexHome(codexHome);
      const environment = isolatedEnvironment(codexHome);
      const version = spawnSync(this.#executable, ["--version"], {
        encoding: "utf8",
        env: environment,
        timeout: 10_000,
      });
      if (version.status !== 0) throw processFailure("Codex version probe", version.status, version.stderr);
      const cliVersion = version.stdout.trim();

      const catalogResult = spawnSync(this.#executable, ["debug", "models"], {
        cwd: packetRoot,
        encoding: "utf8",
        env: environment,
        timeout: 30_000,
        maxBuffer: 4_000_000,
      });
      if (catalogResult.status !== 0) {
        throw processFailure("Codex model catalog probe", catalogResult.status, catalogResult.stderr);
      }
      let catalog: unknown;
      try {
        catalog = JSON.parse(catalogResult.stdout) as unknown;
      } catch {
        throw new Error("Codex model catalog probe did not return valid JSON");
      }
      const model = selectCodexModel(catalog, this.#requestedModel);

      const probe = spawnSync(
        this.#executable,
        ["debug", "prompt-input", ...configArgs(model), "FORME_PACKET_ONLY_CAPABILITY_PROBE"],
        {
          cwd: packetRoot,
          encoding: "utf8",
          env: environment,
          timeout: 30_000,
          maxBuffer: 4_000_000,
        },
      );
      if (probe.status !== 0) throw processFailure("Codex capability probe", probe.status, probe.stderr);
      inspectCapabilityProbe(probe.stdout, packetRoot, options.forbiddenPaths);

      const schemaPath = join(packetRoot, options.schemaFilename);
      writeFileSync(schemaPath, `${JSON.stringify(options.schema, null, 2)}\n`, { mode: 0o600 });
      writeFileSync(join(packetRoot, options.packetFilename), `${JSON.stringify(options.packet, null, 2)}\n`, { mode: 0o600 });
      const execution = spawnSync(
        this.#executable,
        [
          "exec",
          "--ephemeral",
          "--json",
          "--color", "never",
          "--ignore-user-config",
          "--ignore-rules",
          "--skip-git-repo-check",
          "--strict-config",
          "--output-schema", schemaPath,
          "--model", model,
          "-C", packetRoot,
          ...configArgs(model),
          options.prompt,
        ],
        {
          cwd: packetRoot,
          encoding: "utf8",
          env: environment,
          input: canonicalJson(options.packet),
          timeout: this.#timeoutMs,
          maxBuffer: 16_000_000,
        },
      );
      if (execution.status !== 0) {
        const detail = safeRuntimeFailureDetail(execution.stdout);
        throw processFailure("Codex execution", execution.status, detail || execution.stderr);
      }
      const audited = auditCodexJsonl(execution.stdout);
      let proposal: unknown;
      try {
        proposal = JSON.parse(audited.finalMessage) as unknown;
      } catch {
        throw new Error("Codex final message is not a JSON structured proposal");
      }
      return {
        proposal,
        cliVersion,
        model,
        completedAt: this.#now().toISOString(),
        audit: audited.audit,
      };
    } finally {
      rmSync(packetRoot, { recursive: true, force: true });
      rmSync(codexHome, { recursive: true, force: true });
    }
  }
}
