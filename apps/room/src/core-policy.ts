import {
  OPERATION_INVENTORY,
  matchOperationInInventory,
  operationDefinition,
  type OperationDefinition,
} from "./operation-inventory.ts";

export const CORE_OPERATION_NAMES = [
  "third_place.list",
  "projection.read",
  "public_encounter.issue",
  "interaction.create",
  "interaction.read",
  "interaction.delete",
  "grant_offer.accept",
  "room.pair.exchange",
  "control.status",
  "control.interaction.read",
  "room.create",
  "room.pair",
  "room.binding.revoke",
  "projection.revoke",
  "response.revoke",
  "grant.revoke",
  "grant_offer.issue",
  "grant_offer.revoke",
  "interaction.close",
  "curation.admit",
  "curation.unlist",
  "room_operator.status",
  "room_operator.sync",
  "room_operator.pull",
  "room_operator.cycle.reserve",
  "room_operator.cycle.recover",
  "room_operator.cycle.abandon",
  "room_operator.dispatch.issue",
  "room_operator.ack",
  "room_operator.projection.deliver",
  "room_operator.response.deliver",
  "room_operator.local_purge.receipt",
] as const;

export type CoreOperationName = typeof CORE_OPERATION_NAMES[number];

export const CORE_EXCLUDED_OPERATION_NAMES = [
  "notification.set",
  "notification.remove",
  "notification.verify",
  "direct_invite.redeem",
  "agent_derivative.mint",
  "room.mode.set",
  "room.retire",
  "room.delete",
  "grant.issue",
  "grant.replace",
  "direct_invite.issue",
  "direct_invite.revoke",
  "room_operator.stale.attest",
] as const;

const CORE_NAME_SET = new Set<string>(CORE_OPERATION_NAMES);
const CORE_EXCLUDED_NAME_SET = new Set<string>(CORE_EXCLUDED_OPERATION_NAMES);

export const CORE_OPERATION_INVENTORY: readonly OperationDefinition[] = Object.freeze(
  CORE_OPERATION_NAMES.map((name) => operationDefinition(name)),
);

if (
  CORE_OPERATION_INVENTORY.length !== 32
  || CORE_OPERATION_INVENTORY.filter((operation) => operation.mutating).length !== 26
  || CORE_OPERATION_INVENTORY.filter((operation) => !operation.mutating).length !== 6
  || CORE_OPERATION_INVENTORY.filter((operation) => operation.expectedVersion).length !== 21
  || new Set(CORE_OPERATION_NAMES).size !== CORE_OPERATION_NAMES.length
  || new Set(CORE_EXCLUDED_OPERATION_NAMES).size !== CORE_EXCLUDED_OPERATION_NAMES.length
  || OPERATION_INVENTORY.length !== CORE_OPERATION_NAMES.length + CORE_EXCLUDED_OPERATION_NAMES.length
) {
  throw new Error("R4_CORE_OPERATION_INVENTORY_DRIFT");
}

for (const operation of OPERATION_INVENTORY) {
  if (CORE_NAME_SET.has(operation.name) === CORE_EXCLUDED_NAME_SET.has(operation.name)) {
    throw new Error("R4_CORE_OPERATION_PARTITION_DRIFT");
  }
}

export function isCoreOperationName(value: string): value is CoreOperationName {
  return CORE_NAME_SET.has(value);
}

export function matchCoreOperation(method: string, path: string): {
  definition: OperationDefinition;
  params: Record<string, string>;
} | null {
  return matchOperationInInventory(CORE_OPERATION_INVENTORY, method, path);
}

export function coreOperationDefinition(name: string): OperationDefinition {
  if (!isCoreOperationName(name)) throw new Error("R4_CORE_OPERATION_NOT_FOUND");
  return operationDefinition(name);
}
