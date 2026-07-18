#!/usr/bin/env node

import { resolve } from "node:path";
import { runReflection } from "./cognition.ts";
import {
  buildContextPacket,
  defaultReflectionTask,
  parseLineRange,
  type ContextSelection,
} from "./context.ts";
import { CodexExecRuntime } from "./runtime.ts";
import { correctReflection, initWorkspace, observeWorkspace, statusWorkspace } from "./store.ts";

type ParsedOptions = Map<string, string[]>;

const ALLOWED_OPTIONS: Record<string, Set<string>> = {
  init: new Set(["--workspace", "--name", "--intent", "--next", "--unresolved", "--include", "--source-root"]),
  observe: new Set(["--workspace", "--intent", "--next", "--unresolved"]),
  status: new Set(["--workspace"]),
  packet: new Set(["--workspace", "--earlier", "--later", "--path", "--earlier-lines", "--later-lines", "--task"]),
  reflect: new Set(["--workspace", "--earlier", "--later", "--path", "--earlier-lines", "--later-lines", "--task"]),
  correct: new Set(["--workspace", "--reflection", "--text"]),
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
    "Forme Living Project Twin — R1 Continuity + R2 Cognition",
    "",
    "Commands:",
    "  init     connect one bounded workspace and create revision 1",
    "  observe  record a meaningful source or owner-frame change",
    "  status   reconstruct and print the current Restart View",
    "  packet   preview the exact cross-time manifest without a model call",
    "  reflect  run one isolated Codex Reflection and admit validated meaning",
    "  correct  replace an active interpretation with owner-authored meaning",
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
    "Forme never grants the model canonical write authority or writes project sources.",
  ].join("\n");
}

try {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help") {
    console.log(help());
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
    }
  }
} catch (error) {
  console.error(`forme: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
