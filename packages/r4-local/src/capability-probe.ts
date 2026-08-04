import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  canonicalSha256,
  validateResponseSourceSnapshotV1,
} from "../../r4-protocol/src/index.ts";
import { SnapshotQueryBroker } from "./broker.ts";
import { sha256, stableJson } from "./body-free.ts";
import { RestrictedRuntimeDenied, SyntheticRestrictedRuntimeAdapter } from "./restricted-runtime-adapter.ts";
import {
  assertSyntheticFreshRuntimePolicy,
  buildSyntheticFreshRuntimePolicy,
  type SyntheticFreshRuntimePolicyV1,
} from "./runtime-policy.ts";
import type { Hash } from "./types.ts";
import { RESPONSE_SOURCE_POLICY } from "./snapshot.ts";

export const REQUIRED_DENIALS = [
  "guest_store_read",
  "candidate_store_read",
  "credential_read",
  "auth_home_read",
  "live_repo_read",
  "sibling_root_read",
  "home_or_vault_read",
  "filesystem_write",
  "local_socket",
  "command_network",
  "generic_network",
  "generic_shell_or_exec",
  "interpreter_execution",
  "repository_code_execution",
  "connector_call",
  "cross_room_read",
  "publish_or_room_mutation",
  "browser_mcp_app_tool",
  "inherited_secret_environment",
  "parent_git_or_config_discovery",
  "symlink_escape",
] as const;

export interface CapabilityProbeResult {
  schemaVersion: "r4.capability-probe.v1";
  adapter: string;
  runtimeVersion: string;
  syntheticOnly: boolean;
  probedAt: string;
  denied: Record<(typeof REQUIRED_DENIALS)[number], boolean>;
  attempts: Array<{
    name: (typeof REQUIRED_DENIALS)[number];
    expected: "denied";
    observed: "denied" | "allowed_or_ambiguous";
    syntheticVector: true;
    errorCode: string;
    sideEffectCount: number;
  }>;
  modelCallableTools: string[];
  runtimePolicy: SyntheticFreshRuntimePolicyV1;
  toolChecks: {
    brokerCallCount: 1;
    inertCallCount: 0 | 1;
    effectCount: 0;
  };
  bodyFreeEvidenceHash: Hash;
}

export function buildSyntheticCapabilityProbe(input: {
  adapter: string;
  runtimeVersion: string;
  probedAt: string;
  includeInertCoordinationTool?: boolean;
}): CapabilityProbeResult {
  const runtimePolicy = buildSyntheticFreshRuntimePolicy({
    adapter: input.adapter,
    runtimeVersion: input.runtimeVersion,
    includeInertCoordinationTool: input.includeInertCoordinationTool,
  });
  const fixtureRoot = mkdtempSync(join(tmpdir(), "forme-r4-restricted-probe-"));
  const writeTarget = join(fixtureRoot, "denied-write.txt");
  const admittedText = "synthetic admitted snapshot";
  const manifestPreimage = {
    schemaVersion: "response_source_snapshot.v1" as const,
    snapshotId: "snapshot_restrictedprobe0000001",
    repositoryHead: "0".repeat(40),
    repositoryTreeHash: canonicalSha256("synthetic-probe-tree"),
    policyId: RESPONSE_SOURCE_POLICY.policyId,
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    files: [{ canonicalPath: "README.md", contentHash: canonicalSha256(admittedText), byteCount: Buffer.byteLength(admittedText) }],
    fileCount: 1,
    totalBytes: Buffer.byteLength(admittedText),
    createdAt: input.probedAt,
  };
  const manifest = validateResponseSourceSnapshotV1({
    ...manifestPreimage,
    manifestHash: canonicalSha256(manifestPreimage),
  }, RESPONSE_SOURCE_POLICY);
  const snapshotBroker = new SnapshotQueryBroker({
    manifest,
    policy: RESPONSE_SOURCE_POLICY,
    files: [{ ...manifest.files[0]!, text: admittedText }],
  }, Buffer.alloc(32, 0x5a));
  const boundary = new SyntheticRestrictedRuntimeAdapter({ policy: runtimePolicy, snapshotBroker });
  let attempts: CapabilityProbeResult["attempts"];
  let modelCallableTools: string[];
  let toolChecks: CapabilityProbeResult["toolChecks"];
  try {
    const admitted = boundary.invokeTool("SnapshotQueryBrokerV1", {
      schemaVersion: "snapshot_line_read.v1",
      canonicalPath: "README.md",
      lineStart: 1,
      lineEnd: 1,
    });
    if (!("schemaVersion" in admitted) || admitted.status !== "ok" || admitted.resultText !== admittedText) {
      throw new Error("synthetic SnapshotQueryBrokerV1 did not read admitted snapshot");
    }
    if (input.includeInertCoordinationTool === true) boundary.invokeTool("update_plan_inert");
    attempts = REQUIRED_DENIALS.map((name) => {
      const before = boundary.counters().effectCount;
      let observed: "denied" | "allowed_or_ambiguous" = "allowed_or_ambiguous";
      let errorCode = "operation_was_not_denied";
      try {
        switch (name) {
          case "filesystem_write": boundary.denyWrite(writeTarget); break;
          case "symlink_escape": boundary.denyProtectedRead("symlink_escape"); break;
          case "inherited_secret_environment": boundary.readEnvironment("FORME_SYNTHETIC_SECRET"); break;
          case "local_socket":
          case "command_network":
          case "generic_network":
          case "generic_shell_or_exec":
          case "interpreter_execution":
          case "repository_code_execution":
          case "connector_call":
          case "publish_or_room_mutation":
          case "browser_mcp_app_tool":
          case "parent_git_or_config_discovery": boundary.dispatchUnavailable(name); break;
          default: boundary.denyProtectedRead(name);
        }
      } catch (error) {
        if (error instanceof RestrictedRuntimeDenied) {
          observed = "denied";
          errorCode = error.code;
        }
      }
      const sideEffectCount = boundary.counters().effectCount - before + (existsSync(writeTarget) ? 1 : 0);
      return { name, expected: "denied" as const, observed, syntheticVector: true as const, errorCode, sideEffectCount };
    });
    modelCallableTools = [...boundary.inventory()];
    const counters = boundary.counters();
    toolChecks = {
      brokerCallCount: 1,
      inertCallCount: counters.inertCalls as 0 | 1,
      effectCount: counters.effectCount as 0,
    };
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
  const denied = Object.fromEntries(attempts.map((attempt) => [attempt.name, attempt.observed === "denied" && attempt.sideEffectCount === 0])) as CapabilityProbeResult["denied"];
  const evidence = {
    adapter: input.adapter,
    runtimeVersion: input.runtimeVersion,
    syntheticOnly: true,
    denied,
    attempts,
    modelCallableTools,
    runtimePolicy,
    toolChecks,
  };
  return {
    schemaVersion: "r4.capability-probe.v1",
    ...evidence,
    probedAt: input.probedAt,
    bodyFreeEvidenceHash: sha256(stableJson(evidence)),
  };
}

export function assertCapabilityProbe(result: CapabilityProbeResult): void {
  if (!result.syntheticOnly) {
    throw new Error("Gate A accepts only a synthetic/read-only capability probe; real certification belongs to Gate B");
  }
  for (const name of REQUIRED_DENIALS) {
    if (result.denied[name] !== true) throw new Error(`manual_owner_only_available:${name}`);
  }
  if (result.attempts.length !== REQUIRED_DENIALS.length) {
    throw new Error("manual_owner_only_available:probe_vector_count");
  }
  for (const name of REQUIRED_DENIALS) {
    const attempts = result.attempts.filter((attempt) => attempt.name === name);
    if (
      attempts.length !== 1
      || attempts[0]?.expected !== "denied"
      || attempts[0].observed !== "denied"
      || attempts[0].syntheticVector !== true
      || attempts[0].errorCode.length === 0
      || attempts[0].sideEffectCount !== 0
    ) {
      throw new Error(`manual_owner_only_available:probe_vector:${name}`);
    }
  }
  assertSyntheticFreshRuntimePolicy(result.runtimePolicy);
  const exactInventory = result.runtimePolicy.modelCallableTools.map((tool) => tool.name);
  if (stableJson(result.modelCallableTools) !== stableJson(exactInventory)) {
    throw new Error("manual_owner_only_available:tool_inventory_mismatch");
  }
  if (result.modelCallableTools.filter((name) => name === "SnapshotQueryBrokerV1").length !== 1) {
    throw new Error("manual_owner_only_available:snapshot_broker_inventory");
  }
  if (
    result.modelCallableTools.filter((name) => name === "update_plan_inert").length > 1
    || result.toolChecks.brokerCallCount !== 1
    || result.toolChecks.inertCallCount !== (result.modelCallableTools.includes("update_plan_inert") ? 1 : 0)
    || result.toolChecks.effectCount !== 0
  ) {
    throw new Error("manual_owner_only_available:tool_operation_evidence");
  }
  const evidence = {
    adapter: result.adapter,
    runtimeVersion: result.runtimeVersion,
    syntheticOnly: result.syntheticOnly,
    denied: result.denied,
    attempts: result.attempts,
    modelCallableTools: result.modelCallableTools,
    runtimePolicy: result.runtimePolicy,
    toolChecks: result.toolChecks,
  };
  if (result.bodyFreeEvidenceHash !== sha256(stableJson(evidence))) {
    throw new Error("manual_owner_only_available:probe_evidence_hash_mismatch");
  }
}
