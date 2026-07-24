import { assertActionContextPacket, canonicalJson, sha256 } from "./contracts.ts";
import { statusWorkspace } from "./store.ts";
import type { ActionContextPacket, ActionContextPacketBuild } from "./types.ts";

function shortHash(value: string): string {
  return sha256(value).slice("sha256:".length, "sha256:".length + 32);
}

export function buildActionContextPacket(workspaceRoot: string, actionGoal: string): ActionContextPacketBuild {
  const goal = actionGoal.trim();
  if (goal.length === 0 || goal.length > 2000) throw new Error("action goal must be between 1 and 2000 characters");
  const current = statusWorkspace(workspaceRoot).revision;
  if (current.schemaVersion === "1") throw new Error("R3 requires an owner-corrected R2 Reflection");
  const active = current.cognition.reflections.filter((item) => item.status === "corrected" && item.authoredBy === "owner");
  if (active.length !== 1) throw new Error("R3 requires exactly one active owner-corrected Reflection");
  if (current.schemaVersion === "3" && current.agency.proposals.some((item) => item.status === "proposed" || item.status === "approved")) {
    throw new Error("R3 already has an active action proposal");
  }
  if (current.schemaVersion === "3" && current.agency.proposals.some((item) => item.status === "executed" || item.status === "indeterminate")) {
    throw new Error("R3 fixed action surface is not available until the executed action is rolled back or the indeterminate state is resolved");
  }
  const reflection = active[0];
  if (!reflection) throw new Error("R3 requires an active owner-corrected Reflection");
  const correction = current.cognition.corrections.find((item) => item.correctedReflectionId === reflection.reflectionId);
  if (!correction) throw new Error("active corrected Reflection has no owner correction record");
  const core = {
    createdAt: current.observedAt,
    baseTwinRevision: current.revision,
    ownerFrame: current.ownerFrame,
    actionGoal: goal,
    correctedReflection: {
      reflectionId: reflection.reflectionId,
      claim: reflection.claim,
      relationType: reflection.relationType,
      implication: reflection.implication,
      evidence: reflection.evidence,
      correctionId: correction.correctionId,
      correctedAt: correction.correctedAt,
    },
    capability: {
      actionKind: "render_next_move_brief.v1" as const,
      targetPath: "README.md" as const,
      markerId: "forme:r3-action" as const,
    },
    constraints: [
      "Return only the bounded Owner Decision Brief fields; never propose a path, patch, command, tool call, or raw file body.",
      "Recommend by default with one to three editable judgments; ask one blocking owner question only when confidence is low.",
      "Treat the owner-corrected Reflection and Owner Frame as the complete decision context.",
      "A recommendation has no authority until the owner separately approves its exact compiled effect-plan hash; ask_owner cannot compile or receive that approval.",
    ],
  };
  const packet: ActionContextPacket = {
    schemaVersion: "1",
    packetId: `acx_${shortHash(canonicalJson(core))}`,
    ...core,
  };
  assertActionContextPacket(packet);
  const packetHash = sha256(canonicalJson(packet));
  return {
    packet,
    packetHash,
    manifest: {
      packetId: packet.packetId,
      packetHash,
      baseTwinRevision: packet.baseTwinRevision,
      correctedReflectionId: reflection.reflectionId,
      correctionId: correction.correctionId,
      actionKind: packet.capability.actionKind,
      targetPath: packet.capability.targetPath,
      transmittedSourceBytes: 0,
    },
  };
}

export function verifyActionContextPacket(
  workspaceRoot: string,
  actionGoal: string,
  expected: ActionContextPacketBuild,
): void {
  const rebuilt = buildActionContextPacket(workspaceRoot, actionGoal);
  if (canonicalJson(rebuilt) !== canonicalJson(expected)) {
    throw new Error("Action Context Packet changed before admission");
  }
}
