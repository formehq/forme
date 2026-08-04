import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type { SnapshotQueryResultV1, SnapshotQueryV1 } from "../../r4-protocol/src/index.ts";
import type { SnapshotQueryBroker } from "./broker.ts";
import {
  INERT_COORDINATION_TOOL_NAME,
  SNAPSHOT_QUERY_TOOL_NAME,
  assertSyntheticFreshRuntimePolicy,
  type SyntheticFreshRuntimePolicyV1,
} from "./runtime-policy.ts";

export class RestrictedRuntimeDenied extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`restricted_runtime_denied:${code}`);
    this.code = code;
  }
}

/**
 * Gate A's executable fake boundary. It is intentionally tiny: the only
 * callable data operation reads an admitted snapshot root and the optional
 * coordination operation mutates no state. Every other operation enters a
 * concrete adapter method and is rejected before reaching Node's effectful
 * primitive.
 */
export class SyntheticRestrictedRuntimeAdapter {
  readonly policy: SyntheticFreshRuntimePolicyV1;
  readonly snapshotBroker: SnapshotQueryBroker;
  readonly sanitizedEnvironment: Readonly<Record<string, string>>;
  private brokerCalls = 0;
  private inertCalls = 0;
  private effectCount = 0;

  constructor(input: {
    policy: SyntheticFreshRuntimePolicyV1;
    snapshotBroker: SnapshotQueryBroker;
    sanitizedEnvironment?: Readonly<Record<string, string>>;
  }) {
    assertSyntheticFreshRuntimePolicy(input.policy);
    this.policy = input.policy;
    this.snapshotBroker = input.snapshotBroker;
    this.sanitizedEnvironment = Object.freeze({ ...(input.sanitizedEnvironment ?? {}) });
  }

  inventory(): readonly string[] {
    return this.policy.modelCallableTools.map((tool) => tool.name);
  }

  counters(): { brokerCalls: number; inertCalls: number; effectCount: number } {
    return { brokerCalls: this.brokerCalls, inertCalls: this.inertCalls, effectCount: this.effectCount };
  }

  invokeTool(
    name: string,
    input?: SnapshotQueryV1,
  ): SnapshotQueryResultV1 | { status: "recorded_in_memory" } {
    const matches = this.policy.modelCallableTools.filter((tool) => tool.name === name);
    if (matches.length !== 1) throw new RestrictedRuntimeDenied("tool_inventory_mismatch");
    if (name === SNAPSHOT_QUERY_TOOL_NAME) {
      if (input === undefined) throw new RestrictedRuntimeDenied("snapshot_query_missing");
      this.brokerCalls += 1;
      return this.snapshotBroker.evaluate(input);
    }
    if (name === INERT_COORDINATION_TOOL_NAME) {
      this.inertCalls += 1;
      return { status: "recorded_in_memory" };
    }
    throw new RestrictedRuntimeDenied("tool_unavailable");
  }

  denyProtectedRead(code: string): never {
    throw new RestrictedRuntimeDenied(code);
  }

  denyWrite(target: string): never {
    if (existsSync(target)) throw new RestrictedRuntimeDenied("write_target_preexisted");
    // `writeFileSync` is deliberately unreachable. Keeping the primitive in
    // this method makes tests exercise the same operation entry point that a
    // widening implementation would have to change.
    if (false) {
      mkdirSync(resolve(target, ".."), { recursive: true });
      writeFileSync(target, "denied", "utf8");
      this.effectCount += 1;
    }
    throw new RestrictedRuntimeDenied("filesystem_write");
  }

  readEnvironment(name: string): string {
    if (!Object.prototype.hasOwnProperty.call(this.sanitizedEnvironment, name)) {
      throw new RestrictedRuntimeDenied("environment_key_unavailable");
    }
    return this.sanitizedEnvironment[name] ?? "";
  }

  dispatchUnavailable(surface: string): never {
    throw new RestrictedRuntimeDenied(`${surface}_unavailable`);
  }
}
