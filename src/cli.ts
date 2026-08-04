#!/usr/bin/env node

import { resolve } from "node:path";
import { runActionProposal } from "./agency.ts";
import { buildActionContextPacket } from "./action-context.ts";
import { runReflection } from "./cognition.ts";
import {
  buildContextPacket,
  defaultReflectionTask,
  parseLineRange,
  type ContextSelection,
} from "./context.ts";
import { CodexExecRuntime } from "./runtime.ts";
import { processIo, runR4Cli, unavailableR4Environment } from "../packages/r4-local/src/cli.ts";
import {
  approveAction,
  correctReflection,
  executeAction,
  initWorkspace,
  observeWorkspace,
  rollbackAction,
  statusWorkspace,
} from "./store.ts";

type ParsedOptions = Map<string, string[]>;

const ALLOWED_OPTIONS: Record<string, Set<string>> = {
  init: new Set(["--workspace", "--name", "--intent", "--next", "--unresolved", "--include", "--source-root"]),
  observe: new Set(["--workspace", "--intent", "--next", "--unresolved"]),
  status: new Set(["--workspace"]),
  packet: new Set(["--workspace", "--earlier", "--later", "--path", "--earlier-lines", "--later-lines", "--task"]),
  reflect: new Set(["--workspace", "--earlier", "--later", "--path", "--earlier-lines", "--later-lines", "--task"]),
  correct: new Set(["--workspace", "--reflection", "--text"]),
  "action-packet": new Set(["--workspace", "--goal"]),
  "action-propose": new Set(["--workspace", "--goal"]),
  "action-approve": new Set(["--workspace", "--proposal", "--effect-hash"]),
  "action-execute": new Set(["--workspace", "--approval"]),
  "action-rollback": new Set(["--workspace", "--receipt"]),
};
const LIST_OPTIONS = new Set(["--include", "--unresolved"]);

function parseOptions(command: string, args: string[]): ParsedOptions {
  const allowed = ALLOWED_OPTIONS[command];
  if (!allowed) throw new Error(`unknown command: ${command}`);
  const parsed: ParsedOptions = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!name?.startsWith("--")) throw new Error(`unexpected argument for ${command}: ${name ?? ""}`);
    if (!allowed.has(name)) throw new Error(`unknown option for ${command}: ${name}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    const items = (LIST_OPTIONS.has(name) ? value.split(",") : [value])
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) throw new Error(`${name} requires a non-empty value`);
    parsed.set(name, [...(parsed.get(name) ?? []), ...items]);
  }
  return parsed;
}

function values(options: ParsedOptions, name: string): string[] {
  return options.get(name) ?? [];
}

function option(options: ParsedOptions, name: string): string | undefined {
  const found = values(options, name);
  if (found.length > 1) throw new Error(`${name} may only be provided once`);
  return found[0];
}

function required(options: ParsedOptions, name: string): string {
  const value = option(options, name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function contextSelection(options: ParsedOptions): ContextSelection {
  return {
    earlierCommit: required(options, "--earlier"),
    laterCommit: required(options, "--later"),
    relativePath: required(options, "--path"),
    earlierLines: parseLineRange(required(options, "--earlier-lines"), "--earlier-lines"),
    laterLines: parseLineRange(required(options, "--later-lines"), "--later-lines"),
    task: option(options, "--task") ?? defaultReflectionTask(),
  };
}

function help(): string {
  return [
    "Forme Living Project Twin — R1 Continuity + R2 Cognition + R3 Bounded Agency + R4 Gate A",
    "",
    "Commands:",
    "  init     connect one bounded workspace and create revision 1",
    "  observe  record a meaningful source or owner-frame change",
    "  status   reconstruct and print the current Restart View",
    "  packet   preview the exact cross-time manifest without a model call",
    "  reflect  run one isolated Codex Reflection and admit validated meaning",
    "  correct  replace an active interpretation with owner-authored meaning",
    "  action-packet   preview the body-free R3 Action Context manifest",
    "  action-propose  ask Codex for one schema-only bounded action proposal",
    "  action-approve  owner-approve one exact proposal/effect-plan hash pair",
    "  action-execute  consume one approval through the fixed-marker executor",
    "  action-rollback explicitly restore the approved pre-effect marker body",
    "  room     pair/status/sync/prepare-response/reconcile (adapter-gated)",
    "  guest    inspect/ask/status/delete/agent-token (adapter-gated)",
    "",
    "Init options:",
    "  --workspace <path>       defaults to the current directory",
    "  --name <name>            workspace display name",
    "  --intent <text>          owner-confirmed Active Intent",
    "  --next <text>            owner-confirmed Next Move",
    "  --unresolved <text>      repeatable or comma-separated",
    "  --include <path>         repeatable or comma-separated explicit allowlist",
    "  --source-root <path>     defaults to .",
    "",
    "Observe options:",
    "  --workspace <path>       defaults to the current directory",
    "  --intent <text>          replace the owner-confirmed Active Intent",
    "  --next <text>            replace the owner-confirmed Next Move",
    "  --unresolved <text>      repeatable or comma-separated replacement list",
    "",
    "R2 packet / reflect options:",
    "  --workspace <path>       defaults to the current directory",
    "  --earlier <commit>       full reachable Git commit ID",
    "  --later <commit>         full reachable descendant Git commit ID",
    "  --path <path>            one allowlisted UTF-8 text path",
    "  --earlier-lines <S:E>    cited line range at the earlier commit",
    "  --later-lines <S:E>      cited line range at the later commit",
    "  --task <text>            optional owner Reflection task",
    "",
    "Correct options:",
    "  --reflection <id>        active inferred or corrected Reflection",
    "  --text <text>            owner-authored replacement meaning",
    "",
    "R3 action options:",
    "  --goal <text>             owner-framed goal for packet/proposal",
    "  --proposal <id>           exact act_ proposal ID",
    "  --effect-hash <sha256>    exact effect-plan hash shown in Action Review",
    "  --approval <id>           one-use apr_ approval ID",
    "  --receipt <id>            successful eff_ execution receipt to roll back",
    "",
    "The model never receives canonical write authority. Only Forme may replace the fixed README.md managed block after exact owner approval.",
  ].join("\n");
}

try {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help") {
    console.log(help());
  } else if (command === "room" || command === "guest") {
    await runR4Cli([command, ...args], unavailableR4Environment(), processIo());
  } else {
    const options = parseOptions(command, args);
    const workspaceRoot = resolve(option(options, "--workspace") ?? process.cwd());
    if (command === "init") {
      const result = initWorkspace({
        workspaceRoot,
        name: required(options, "--name"),
        activeIntent: required(options, "--intent"),
        nextMove: required(options, "--next"),
        unresolved: values(options, "--unresolved"),
        sourceRoot: option(options, "--source-root"),
        includePaths: values(options, "--include"),
      });
      console.log(result.view);
    } else if (command === "observe") {
      const activeIntent = option(options, "--intent");
      const nextMove = option(options, "--next");
      const unresolved = options.has("--unresolved") ? values(options, "--unresolved") : undefined;
      const ownerFrame = activeIntent === undefined && nextMove === undefined && unresolved === undefined
        ? undefined
        : { activeIntent, nextMove, unresolved };
      console.log(observeWorkspace(workspaceRoot, { ownerFrame }).view);
    } else if (command === "status") {
      console.log(statusWorkspace(workspaceRoot).view);
    } else if (command === "packet") {
      const packet = buildContextPacket(workspaceRoot, contextSelection(options));
      console.log(JSON.stringify(packet.manifest, null, 2));
    } else if (command === "reflect") {
      const result = runReflection(workspaceRoot, contextSelection(options), new CodexExecRuntime(), {
        onPacket: (packet) => {
          console.error("Forme R2 will send only this approved Context Packet manifest:");
          console.error(JSON.stringify(packet.manifest, null, 2));
        },
      });
      console.log(result.observation.view);
    } else if (command === "correct") {
      console.log(correctReflection(
        workspaceRoot,
        required(options, "--reflection"),
        required(options, "--text"),
      ).view);
    } else if (command === "action-packet") {
      console.log(JSON.stringify(buildActionContextPacket(
        workspaceRoot,
        required(options, "--goal"),
      ).manifest, null, 2));
    } else if (command === "action-propose") {
      const result = runActionProposal(workspaceRoot, required(options, "--goal"), new CodexExecRuntime(), {
        onPacket: (packet) => {
          console.error("Forme R3 will send only this approved Action Context manifest:");
          console.error(JSON.stringify(packet.manifest, null, 2));
        },
      });
      console.log(result.observation.view);
    } else if (command === "action-approve") {
      console.log(approveAction(
        workspaceRoot,
        required(options, "--proposal"),
        required(options, "--effect-hash"),
      ).view);
    } else if (command === "action-execute") {
      console.log(executeAction(workspaceRoot, required(options, "--approval")).observation.view);
    } else if (command === "action-rollback") {
      console.log(rollbackAction(workspaceRoot, required(options, "--receipt")).observation.view);
    }
  }
} catch (error) {
  console.error(`forme: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
