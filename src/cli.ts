#!/usr/bin/env node

import { resolve } from "node:path";
import { initWorkspace, observeWorkspace, statusWorkspace } from "./store.ts";

function values(args: string[], name: string): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      result.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      index += 1;
    }
  }
  return result;
}

function option(args: string[], name: string): string | undefined {
  return values(args, name)[0];
}

function required(args: string[], name: string): string {
  const value = option(args, name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function help(): string {
  return [
    "Forme R1 Continuity",
    "",
    "Commands:",
    "  init     connect one bounded workspace and create revision 1",
    "  observe  record a meaningful source or owner-frame change",
    "  status   reconstruct and print the current Restart View",
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
    "R1 invokes no model and never writes project sources.",
  ].join("\n");
}

try {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help") {
    console.log(help());
  } else {
    const workspaceRoot = resolve(option(args, "--workspace") ?? process.cwd());
    if (command === "init") {
      const result = initWorkspace({
        workspaceRoot,
        name: required(args, "--name"),
        activeIntent: required(args, "--intent"),
        nextMove: required(args, "--next"),
        unresolved: values(args, "--unresolved"),
        sourceRoot: option(args, "--source-root"),
        includePaths: values(args, "--include"),
      });
      console.log(result.view);
    } else if (command === "observe") {
      console.log(observeWorkspace(workspaceRoot).view);
    } else if (command === "status") {
      console.log(statusWorkspace(workspaceRoot).view);
    } else {
      throw new Error(`unknown command: ${command}`);
    }
  }
} catch (error) {
  console.error(`forme: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
