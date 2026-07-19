import { resolve } from "node:path";
import { buildActionContextPacket, verifyActionContextPacket } from "./action-context.ts";
import { validateActionProposalForPacket } from "./action.ts";
import type { ActionRuntime } from "./runtime.ts";
import { admitActionProposal, type ActionTransitionOptions } from "./store.ts";
import type {
  ActionContextPacketBuild,
  ActionRuntimeProposalResult,
  ObservationResult,
} from "./types.ts";

export interface ActionProposalRunResult {
  packet: ActionContextPacketBuild;
  runtime: ActionRuntimeProposalResult;
  observation: ObservationResult;
}

export interface ActionProposalRunOptions extends ActionTransitionOptions {
  onPacket?: (packet: ActionContextPacketBuild) => void;
}

export function runActionProposal(
  workspaceRoot: string,
  actionGoal: string,
  runtime: ActionRuntime,
  options: ActionProposalRunOptions = {},
): ActionProposalRunResult {
  const root = resolve(workspaceRoot);
  const packet = buildActionContextPacket(root, actionGoal);
  options.onPacket?.(packet);
  const runtimeResult = runtime.generateAction(packet.packet, [root]);
  verifyActionContextPacket(root, actionGoal, packet);
  validateActionProposalForPacket(runtimeResult.proposal, packet.packet);
  const observation = admitActionProposal(root, packet, runtimeResult, options);
  return { packet, runtime: runtimeResult, observation };
}
