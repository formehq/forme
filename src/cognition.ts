import { resolve } from "node:path";
import {
  buildContextPacket,
  verifyContextPacket,
  type ContextSelection,
} from "./context.ts";
import { validateReflectionProposalForPacket } from "./reflection.ts";
import type { ReflectionRuntime } from "./runtime.ts";
import { admitReflection, type CognitionTransitionOptions } from "./store.ts";
import type { ContextPacketBuild, ObservationResult, RuntimeProposalResult } from "./types.ts";

export interface ReflectionRunResult {
  packet: ContextPacketBuild;
  runtime: RuntimeProposalResult;
  observation: ObservationResult;
}

export interface ReflectionRunOptions extends CognitionTransitionOptions {
  onPacket?: (packet: ContextPacketBuild) => void;
}

export function runReflection(
  workspaceRoot: string,
  selection: ContextSelection,
  runtime: ReflectionRuntime,
  options: ReflectionRunOptions = {},
): ReflectionRunResult {
  const root = resolve(workspaceRoot);
  const packet = buildContextPacket(root, selection);
  options.onPacket?.(packet);
  const runtimeResult = runtime.generate(packet.packet, [root]);
  verifyContextPacket(root, selection, packet);
  validateReflectionProposalForPacket(runtimeResult.proposal, packet.packet);
  const observation = admitReflection(root, packet, runtimeResult, options);
  return { packet, runtime: runtimeResult, observation };
}
