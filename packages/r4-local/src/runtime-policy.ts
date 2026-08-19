import { canonicalSha256, type Sha256 } from "../../r4-protocol/src/index.ts";

export const SNAPSHOT_QUERY_TOOL_NAME = "SnapshotQueryBrokerV1" as const;
export const INERT_COORDINATION_TOOL_NAME = "update_plan_inert" as const;

export type SyntheticModelCallableToolV1 = {
  readonly name: typeof SNAPSHOT_QUERY_TOOL_NAME | typeof INERT_COORDINATION_TOOL_NAME;
  readonly class: "snapshot_data" | "inert_coordination";
  readonly snapshotRead: boolean;
  readonly filesystemWrite: false;
  readonly commandExecution: false;
  readonly interpreterExecution: false;
  readonly environmentRead: false;
  readonly network: false;
  readonly browserMcpApp: false;
  readonly connector: false;
  readonly publication: false;
  readonly candidateFieldContribution: "evidence_only" | "none";
};

export interface SyntheticFreshRuntimePolicyV1 {
  readonly schemaVersion: "synthetic_fresh_runtime_policy.v1";
  readonly gate: "gate_a_offline_analogue";
  readonly adapter: string;
  readonly runtimeVersion: string;
  readonly sessionCreation: "new";
  readonly resumeAllowed: false;
  readonly ephemeral: true;
  readonly neutralNonGitRoot: true;
  readonly approvalPolicy: "never";
  readonly inheritedEnvironment: "none";
  readonly shellProfiles: false;
  readonly providerAuthInChildEnvironment: false;
  readonly formeSecretsInChildEnvironment: false;
  readonly ambient: {
    readonly ownerHistory: false;
    readonly userConfig: false;
    readonly workspaceInstructions: false;
    readonly rules: false;
    readonly memory: false;
    readonly mcp: false;
    readonly plugins: false;
    readonly hooks: false;
    readonly skills: false;
    readonly subagents: false;
    readonly browser: false;
    readonly imageTools: false;
    readonly genericShell: false;
    readonly genericExec: false;
    readonly git: false;
    readonly connector: false;
  };
  readonly modelCallableTools: readonly SyntheticModelCallableToolV1[];
  readonly policyHash: Sha256;
}

const BROKER_TOOL: SyntheticModelCallableToolV1 = {
  name: SNAPSHOT_QUERY_TOOL_NAME,
  class: "snapshot_data",
  snapshotRead: true,
  filesystemWrite: false,
  commandExecution: false,
  interpreterExecution: false,
  environmentRead: false,
  network: false,
  browserMcpApp: false,
  connector: false,
  publication: false,
  candidateFieldContribution: "evidence_only",
};

const INERT_COORDINATION_TOOL: SyntheticModelCallableToolV1 = {
  name: INERT_COORDINATION_TOOL_NAME,
  class: "inert_coordination",
  snapshotRead: false,
  filesystemWrite: false,
  commandExecution: false,
  interpreterExecution: false,
  environmentRead: false,
  network: false,
  browserMcpApp: false,
  connector: false,
  publication: false,
  candidateFieldContribution: "none",
};

export function buildSyntheticFreshRuntimePolicy(input: {
  adapter: string;
  runtimeVersion: string;
  includeInertCoordinationTool?: boolean;
}): SyntheticFreshRuntimePolicyV1 {
  const preimage: Omit<SyntheticFreshRuntimePolicyV1, "policyHash"> = {
    schemaVersion: "synthetic_fresh_runtime_policy.v1",
    gate: "gate_a_offline_analogue",
    adapter: input.adapter,
    runtimeVersion: input.runtimeVersion,
    sessionCreation: "new",
    resumeAllowed: false,
    ephemeral: true,
    neutralNonGitRoot: true,
    approvalPolicy: "never",
    inheritedEnvironment: "none",
    shellProfiles: false,
    providerAuthInChildEnvironment: false,
    formeSecretsInChildEnvironment: false,
    ambient: {
      ownerHistory: false,
      userConfig: false,
      workspaceInstructions: false,
      rules: false,
      memory: false,
      mcp: false,
      plugins: false,
      hooks: false,
      skills: false,
      subagents: false,
      browser: false,
      imageTools: false,
      genericShell: false,
      genericExec: false,
      git: false,
      connector: false,
    },
    modelCallableTools: [
      BROKER_TOOL,
      ...(input.includeInertCoordinationTool === true ? [INERT_COORDINATION_TOOL] : []),
    ],
  };
  return { ...preimage, policyHash: canonicalSha256(preimage) };
}

function isFalse(value: unknown): value is false {
  return value === false;
}

/**
 * Validates the exact Gate A fake policy. This is evidence about the
 * repository contract only; it is deliberately not an installed Codex or
 * macOS physical-boundary attestation.
 */
export function assertSyntheticFreshRuntimePolicy(policy: SyntheticFreshRuntimePolicyV1): void {
  if (policy.schemaVersion !== "synthetic_fresh_runtime_policy.v1" || policy.gate !== "gate_a_offline_analogue") {
    throw new Error("manual_owner_only_available:runtime_policy_identity");
  }
  if (
    policy.sessionCreation !== "new"
    || policy.resumeAllowed !== false
    || policy.ephemeral !== true
    || policy.neutralNonGitRoot !== true
    || policy.approvalPolicy !== "never"
    || policy.inheritedEnvironment !== "none"
    || policy.shellProfiles !== false
    || policy.providerAuthInChildEnvironment !== false
    || policy.formeSecretsInChildEnvironment !== false
  ) {
    throw new Error("manual_owner_only_available:fresh_launch_contract");
  }
  if (Object.values(policy.ambient).some((value) => !isFalse(value))) {
    throw new Error("manual_owner_only_available:ambient_surface");
  }
  if (new Set(policy.modelCallableTools.map((tool) => tool.name)).size !== policy.modelCallableTools.length) {
    throw new Error("manual_owner_only_available:duplicate_model_tool");
  }
  const dataTools = policy.modelCallableTools.filter((tool) => tool.class === "snapshot_data");
  if (dataTools.length !== 1 || dataTools[0]?.name !== SNAPSHOT_QUERY_TOOL_NAME || dataTools[0].snapshotRead !== true) {
    throw new Error("manual_owner_only_available:snapshot_broker_inventory");
  }
  for (const tool of policy.modelCallableTools) {
    if (tool.name !== SNAPSHOT_QUERY_TOOL_NAME && tool.name !== INERT_COORDINATION_TOOL_NAME) {
      throw new Error(`manual_owner_only_available:unexpected_tool:${String(tool.name)}`);
    }
    if (
      tool.filesystemWrite !== false
      || tool.commandExecution !== false
      || tool.interpreterExecution !== false
      || tool.environmentRead !== false
      || tool.network !== false
      || tool.browserMcpApp !== false
      || tool.connector !== false
      || tool.publication !== false
    ) {
      throw new Error(`manual_owner_only_available:effectful_tool:${tool.name}`);
    }
    if (tool.class === "inert_coordination" && (tool.snapshotRead !== false || tool.candidateFieldContribution !== "none")) {
      throw new Error(`manual_owner_only_available:effectful_coordination_tool:${tool.name}`);
    }
  }
  const { policyHash: _policyHash, ...preimage } = policy;
  if (policy.policyHash !== canonicalSha256(preimage)) {
    throw new Error("manual_owner_only_available:runtime_policy_hash_mismatch");
  }
}
