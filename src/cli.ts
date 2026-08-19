#!/usr/bin/env node

import { readSync } from "node:fs";
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
import { processIo, runR4CoreCli, unavailableR4Environment } from "../packages/r4-local/src/cli.ts";
import {
  approveLocalProjection,
  prepareLocalProjection,
  previewLocalProjection,
  recoverLocalProjectionReview,
} from "../packages/r4-local/src/projection-review.ts";
import {
  approveLocalRoomHandoff,
  prepareLocalRoomHandoff,
  previewLocalRoomHandoff,
  recoverLocalRoomHandoff,
} from "../packages/r4-local/src/projection-room-handoff.ts";
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
  "projection-prepare": new Set([
    "--workspace", "--title", "--summary", "--open-to", "--tension", "--becoming-reflection", "--effect",
    "--becoming", "--now-wording", "--next-wording", "--interaction", "--allowed-topic", "--unavailable-topic",
    "--response-latency", "--agency-statement", "--non-commitment",
  ]),
  "projection-preview": new Set(["--workspace"]),
  "projection-approve": new Set(["--workspace"]),
  "projection-recover": new Set(["--workspace", "--lock-pid"]),
  "projection-room-prepare": new Set(["--workspace", "--room", "--publish-at"]),
  "projection-room-preview": new Set(["--workspace"]),
  "projection-room-approve": new Set(["--workspace"]),
  "projection-room-recover": new Set(["--workspace", "--lock-pid"]),
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

function requiredValues(options: ParsedOptions, name: string): string[] {
  const found = values(options, name);
  if (found.length === 0) throw new Error(`${name} is required at least once`);
  return found;
}

function projectionInteractions(options: ParsedOptions): ("ask" | "seed" | "resonance")[] {
  return requiredValues(options, "--interaction").map((value) => {
    if (value !== "ask" && value !== "seed" && value !== "resonance") {
      throw new Error("--interaction must be ask, seed, or resonance");
    }
    return value;
  });
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

function projectionOptions(action: string, args: string[]): ParsedOptions {
  if (action !== "prepare" && action !== "preview" && action !== "approve" && action !== "recover") {
    throw new Error("usage: forme projection prepare|preview|approve|recover");
  }
  return parseOptions(`projection-${action}`, args);
}

function projectionRoomOptions(action: string, args: string[]): ParsedOptions {
  if (action !== "prepare" && action !== "preview" && action !== "approve" && action !== "recover") {
    throw new Error("usage: forme projection room prepare|preview|approve|recover");
  }
  return parseOptions(`projection-room-${action}`, args);
}

function exactUtcDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} must be one exact UTC ISO-8601 timestamp`);
  }
  return parsed;
}

function ownerExactConfirmation(kind: "local-projection" | "room-publication"): string {
  const bytes = Buffer.alloc(129);
  try {
    let length = 0;
    while (length < bytes.byteLength) {
      const read = readSync(0, bytes, length, 1, null);
      if (read === 0) break;
      length += read;
      if (bytes[length - 1] === 0x0a) break;
    }
    if (length > 128) throw new Error("Projection approval input is too large");
    const value = bytes.subarray(0, length).toString("utf8");
    const valid = kind === "local-projection"
      ? /^APPROVE sha256:[a-f0-9]{64}\n?$/u.test(value)
      : /^APPROVE PUBLICATION sha256:[a-f0-9]{64}\n?$/u.test(value);
    if (!valid) {
      const expected = kind === "local-projection"
        ? "APPROVE sha256:<64 hex>"
        : "APPROVE PUBLICATION sha256:<64 hex>";
      throw new Error(`type the exact displayed \`${expected}\` line on standard input`);
    }
    return value.endsWith("\n") ? value.slice(0, -1) : value;
  } finally {
    bytes.fill(0);
  }
}

function help(): string {
  return [
    "Forme Living Project Twin — R1 Continuity + R2 Cognition + R3 Bounded Agency + R4 Controlled Presence",
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
    "  projection prepare/preview/approve/recover one local-only exact Projection review",
    "  projection room prepare/preview/approve/recover one Room-bound content handoff (no delivery)",
    "  room     pair/status/sync/prepare-response/reconcile/api (adapter-gated)",
    "  guest    inspect/ask/status/delete (adapter-gated)",
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
    "R4 local Projection options:",
    "  projection prepare --open-to <text> [--title/--summary/--tension <text>]  legacy v1",
    "  projection prepare --becoming <text> ...                              Owner wording v2",
    "    --becoming <text>          repeatable Vision & Becoming claim (at least one)",
    "    --now-wording <text>       repeatable current-state claim",
    "    --next-wording <text>      repeatable next-move claim",
    "    --tension <text>           repeatable live tension (at least one)",
    "    --open-to <text>           repeatable invitation (at least one)",
    "    --interaction <ask|seed|resonance>  repeatable supported interaction (at least one)",
    "    --allowed-topic <text>     repeatable public topic (at least one)",
    "    --unavailable-topic <text> repeatable unavailable topic (at least one)",
    "    --response-latency <text>  exact expected response latency",
    "    --agency-statement <text>  exact public agency boundary",
    "    --non-commitment <text>    exact public non-commitment boundary",
    "  --becoming-reflection <id> optional exact active Owner-corrected Reflection",
    "  --effect <id>              optional exact verified current/rolled-back R3 proposal",
    "  projection preview",
    "  projection approve        reads exact `APPROVE sha256:<hash>` from stdin",
    "  projection recover --lock-pid <pid>  explicitly recover one dead writer",
    "  projection room prepare --room <room_id> --publish-at <UTC timestamp>",
    "  projection room preview",
    "  projection room approve   reads exact `APPROVE PUBLICATION sha256:<hash>` from stdin",
    "  projection room recover --lock-pid <pid>",
    "    This is a local exact-content ceremony only; it never delivers or mutates a Room.",
    "",
    "The model never receives canonical write authority. Only Forme may replace the fixed README.md managed block after exact owner approval.",
  ].join("\n");
}

try {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help") {
    console.log(help());
  } else if (command === "room" || command === "guest") {
    await runR4CoreCli([command, ...args], unavailableR4Environment(), processIo());
  } else if (command === "projection") {
    const [action, ...projectionArgs] = args;
    if (!action) throw new Error("usage: forme projection prepare|preview|approve|recover|room");
    if (action === "room") {
      const [roomAction, ...roomArgs] = projectionArgs;
      if (!roomAction) throw new Error("usage: forme projection room prepare|preview|approve|recover");
      const options = projectionRoomOptions(roomAction, roomArgs);
      const workspaceRoot = resolve(option(options, "--workspace") ?? process.cwd());
      if (roomAction === "prepare") {
        process.stdout.write(prepareLocalRoomHandoff({
          workspaceRoot,
          targetRoomId: required(options, "--room"),
          scheduledPublishedAt: exactUtcDate(required(options, "--publish-at"), "--publish-at"),
        }).preview);
      } else if (roomAction === "preview") {
        process.stdout.write(previewLocalRoomHandoff({ workspaceRoot }).preview);
      } else if (roomAction === "approve") {
        process.stdout.write(approveLocalRoomHandoff({
          workspaceRoot,
          confirmation: ownerExactConfirmation("room-publication"),
        }).preview);
      } else {
        const lockPidText = required(options, "--lock-pid");
        if (!/^[1-9][0-9]*$/u.test(lockPidText)) throw new Error("--lock-pid must be one exact positive decimal PID");
        const recovered = recoverLocalRoomHandoff({
          workspaceRoot,
          expectedLockPid: Number.parseInt(lockPidText, 10),
        });
        process.stdout.write(recovered?.preview ?? "Room handoff lock recovered; no candidate was committed. Run projection room prepare.\n");
      }
    } else {
      const options = projectionOptions(action, projectionArgs);
      const workspaceRoot = resolve(option(options, "--workspace") ?? process.cwd());
      if (action === "prepare") {
        const title = option(options, "--title");
        const summary = option(options, "--summary");
        const becomingReflectionId = option(options, "--becoming-reflection");
        const effectProposalId = option(options, "--effect");
        const common = {
          workspaceRoot,
          ...(title === undefined ? {} : { title }),
          ...(summary === undefined ? {} : { summary }),
          ...(becomingReflectionId === undefined ? {} : { becomingReflectionId }),
          ...(effectProposalId === undefined ? {} : { effectProposalId }),
        };
        const becoming = values(options, "--becoming");
        if (becoming.length === 0) {
          const v2OnlyOption = [
            "--now-wording", "--next-wording", "--interaction", "--allowed-topic", "--unavailable-topic",
            "--response-latency", "--agency-statement", "--non-commitment",
          ].find((name) => options.has(name));
          if (v2OnlyOption) throw new Error(`${v2OnlyOption} requires at least one --becoming`);
        }
        const view = becoming.length > 0
          ? prepareLocalProjection({
            ...common,
            ownerWording: {
              becoming,
              now: values(options, "--now-wording"),
              nextMove: values(options, "--next-wording"),
              tensions: requiredValues(options, "--tension"),
              openTo: requiredValues(options, "--open-to"),
              boundary: {
                supportedInteractions: projectionInteractions(options),
                allowedTopics: requiredValues(options, "--allowed-topic"),
                unavailableTopics: requiredValues(options, "--unavailable-topic"),
                expectedResponseLatency: required(options, "--response-latency"),
                agencyStatement: required(options, "--agency-statement"),
                nonCommitmentStatement: required(options, "--non-commitment"),
              },
            },
          })
          : prepareLocalProjection({
            ...common,
            openTo: required(options, "--open-to"),
            ...(option(options, "--tension") === undefined ? {} : { tension: option(options, "--tension") }),
          });
        process.stdout.write(view.preview);
      } else if (action === "preview") {
        process.stdout.write(previewLocalProjection({ workspaceRoot }).preview);
      } else if (action === "approve") {
        process.stdout.write(approveLocalProjection({
          workspaceRoot,
          confirmation: ownerExactConfirmation("local-projection"),
        }).preview);
      } else {
        const lockPidText = required(options, "--lock-pid");
        if (!/^[1-9][0-9]*$/u.test(lockPidText)) throw new Error("--lock-pid must be one exact positive decimal PID");
        const lockPid = Number.parseInt(lockPidText, 10);
        const recovered = recoverLocalProjectionReview({ workspaceRoot, expectedLockPid: lockPid });
        process.stdout.write(recovered?.preview ?? "Projection lock recovered; no candidate was committed. Run projection prepare.\n");
      }
    }
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
