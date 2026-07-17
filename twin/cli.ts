import { resolve } from "node:path";
import { initWorkspace, refreshWorkspace, statusWorkspace } from "./store.ts";
import type { WorkspaceKind } from "./types.ts";

function usage(): string {
  return `Forme Living Project Twin — M1 Continuity

Usage:
  npm run twin:init -- --workspace PATH [--source RELATIVE_PATH] [--kind project|notes-export] [--name NAME] [--intent TEXT]
  npm run twin:refresh -- --workspace PATH
  npm run twin:status -- --workspace PATH

Init options:
  --extensions .md,.txt,.json   Explicit file-extension allowlist
  --max-file-bytes N            Per-file read ceiling (default 1048576)

The source root must stay inside the workspace. Connectors never follow symbolic links and Forme writes only under 98_Forme/.
`;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const command = process.argv[2];
const args = process.argv.slice(3);

try {
  if (!command || command === "help" || args.includes("--help")) {
    console.log(usage());
    process.exit(0);
  }
  const workspace = resolve(option(args, "--workspace") ?? "");
  if (!option(args, "--workspace")) throw new Error("--workspace is required");

  if (command === "init") {
    const kindValue = option(args, "--kind") ?? "project";
    if (kindValue !== "project" && kindValue !== "notes-export") {
      throw new Error("--kind must be project or notes-export");
    }
    const maxFileBytesValue = option(args, "--max-file-bytes");
    const maxFileBytes = maxFileBytesValue === undefined ? undefined : Number.parseInt(maxFileBytesValue, 10);
    if (maxFileBytes !== undefined && (!Number.isSafeInteger(maxFileBytes) || maxFileBytes <= 0)) {
      throw new Error("--max-file-bytes must be a positive integer");
    }
    const extensionsValue = option(args, "--extensions");
    const result = initWorkspace({
      workspaceRoot: workspace,
      sourceRoot: option(args, "--source"),
      kind: kindValue as WorkspaceKind,
      name: option(args, "--name"),
      intent: option(args, "--intent"),
      includeExtensions: extensionsValue?.split(",").map((value) => value.trim()).filter(Boolean),
      maxFileBytes,
    });
    console.log(result.view);
  } else if (command === "refresh") {
    console.log(refreshWorkspace(workspace).view);
  } else if (command === "status") {
    console.log(statusWorkspace(workspace).view);
  } else {
    throw new Error(`unknown command: ${command}`);
  }
} catch (error) {
  console.error(`forme twin: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
