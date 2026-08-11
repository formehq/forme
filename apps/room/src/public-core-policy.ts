import {
  OPERATION_INVENTORY,
  operationDefinition,
  type OperationDefinition,
} from "./operation-inventory.ts";

/**
 * The target production slice for #67 stops after one durable public knock
 * reaches the Owner. This file defines that future allowlist; the construction
 * boundary below separately records which repository-only adapters exist and
 * that none of them is wired for traffic yet.
 * The target is intentionally narrower than the historical Gate B Core-32
 * surface, which also rehearsed future Response and Grant mechanics.
 */
export const PUBLIC_CORE_POLICY_ID = "r4_public_room_knock_core.v1" as const;

/** Construction truth for this slice; none of these can be inferred from config alone. */
export const PUBLIC_CORE_CONSTRUCTION_BOUNDARY = Object.freeze({
  schemaVersion: "r4_public_core_construction_boundary.v1" as const,
  productionApplicationAdapterConstructed: true as const,
  durablePersistenceAdapterConstructed: true as const,
  credentialVaultAdapterConstructed: false as const,
  transportAdapterConstructed: false as const,
  trafficReady: false as const,
  gateCReady: false as const,
});

export const PUBLIC_CORE_ACTION_NAMES = [
  "third_place.list",
  "projection.read",
  "public_encounter.issue",
  "interaction.create",
  "interaction.read",
  "interaction.delete",
  "room.pair.exchange",
  "room.create",
  "room.pair",
  "room.binding.revoke",
  "room.mode.set",
  "projection.revoke",
  "curation.admit",
  "curation.unlist",
  "room_operator.status",
  "room_operator.sync",
  "room_operator.pull",
  "room_operator.ack",
  "room_operator.projection.deliver",
  "room_operator.local_purge.receipt",
] as const;

export type PublicCoreActionName = typeof PUBLIC_CORE_ACTION_NAMES[number];

/**
 * Every existing R4 operation outside the #67 public-knock slice is named
 * here.  New inventory entries cannot become production actions by accident:
 * the partition assertion below fails module startup until this list and its
 * review evidence are updated together.
 */
export const PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES = [
  "notification.set",
  "notification.remove",
  "notification.verify",
  "grant_offer.accept",
  "direct_invite.redeem",
  "agent_derivative.mint",
  "control.status",
  "control.interaction.read",
  "room.retire",
  "room.delete",
  "response.revoke",
  "grant.issue",
  "grant.replace",
  "grant.revoke",
  "grant_offer.issue",
  "grant_offer.revoke",
  "direct_invite.issue",
  "direct_invite.revoke",
  "interaction.close",
  "room_operator.cycle.reserve",
  "room_operator.cycle.recover",
  "room_operator.cycle.abandon",
  "room_operator.dispatch.issue",
  "room_operator.response.deliver",
  "room_operator.stale.attest",
] as const;

export const PUBLIC_CORE_UNAVAILABLE_CAPABILITY_FAMILIES = [
  "full_surface",
  "fresh_response_session",
  "response",
  "grant_or_continuation",
  "private_room",
  "email_or_notification",
] as const;

export type PublicCoreUnavailableCapabilityFamily =
  typeof PUBLIC_CORE_UNAVAILABLE_CAPABILITY_FAMILIES[number];

const ACTION_SET = new Set<string>(PUBLIC_CORE_ACTION_NAMES);
const UNAVAILABLE_SET = new Set<string>(PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES);

function fail(code: string): never {
  throw new PublicCorePolicyError(code);
}

export class PublicCorePolicyError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicCorePolicyError";
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; code: string }> {
    return Object.freeze({ name: this.name, code: this.code });
  }
}

function assertClosedPartition(): void {
  if (
    PUBLIC_CORE_ACTION_NAMES.length !== 20
    || PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES.length !== 25
    || new Set(PUBLIC_CORE_ACTION_NAMES).size !== PUBLIC_CORE_ACTION_NAMES.length
    || new Set(PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES).size !== PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES.length
    || OPERATION_INVENTORY.length !== PUBLIC_CORE_ACTION_NAMES.length + PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES.length
  ) {
    fail("R4_PUBLIC_CORE_POLICY_PARTITION_DRIFT");
  }

  for (const operation of OPERATION_INVENTORY) {
    if (ACTION_SET.has(operation.name) === UNAVAILABLE_SET.has(operation.name)) {
      fail("R4_PUBLIC_CORE_POLICY_PARTITION_DRIFT");
    }
  }

  const forbiddenFragments = [
    "notification",
    "direct_invite",
    "agent_derivative",
    "grant",
    "response",
    "cycle.",
    "dispatch.",
  ];
  if (PUBLIC_CORE_ACTION_NAMES.some((name) => forbiddenFragments.some((fragment) => name.includes(fragment)))) {
    fail("R4_PUBLIC_CORE_POLICY_SCOPE_DRIFT");
  }
}

assertClosedPartition();

export const PUBLIC_CORE_OPERATION_INVENTORY: readonly OperationDefinition[] = Object.freeze(
  PUBLIC_CORE_ACTION_NAMES.map((name) => operationDefinition(name)),
);

export function isPublicCoreAction(value: string): value is PublicCoreActionName {
  return ACTION_SET.has(value);
}

export function assertPublicCoreAction(value: string): OperationDefinition {
  if (!isPublicCoreAction(value)) fail("R4_PUBLIC_CORE_ACTION_UNAVAILABLE");
  return operationDefinition(value);
}

export interface PublicCoreRoomScopeInput {
  readonly roomKind: unknown;
  readonly interactionMode: unknown;
  readonly capabilityKind?: unknown;
}

export interface PublicCoreRoomScope {
  readonly roomKind: "third_place_public";
  readonly interactionMode: "public_single";
  readonly capabilityKind: "public_encounter" | "room_pairing" | "room_operator" | null;
}

export interface PublicCoreActionRoomScope {
  readonly roomKind: "third_place_public";
  readonly interactionMode: "public_single" | "closed";
  readonly capabilityKind: "public_encounter" | "room_pairing" | "room_operator" | null;
}

/**
 * A second, below-routing guard for any operation that has resolved a Room.
 * Callers omit capabilityKind for Controller/Curator reads and mutations.
 */
export function assertPublicCoreRoomScope(input: PublicCoreRoomScopeInput): PublicCoreRoomScope {
  const keys = Object.keys(input);
  if (keys.some((key) => !["roomKind", "interactionMode", "capabilityKind"].includes(key))) {
    fail("R4_PUBLIC_CORE_SCOPE_INVALID");
  }
  if (input.roomKind !== "third_place_public" || input.interactionMode !== "public_single") {
    fail("R4_PUBLIC_CORE_SCOPE_UNAVAILABLE");
  }
  const capabilityKind = input.capabilityKind ?? null;
  if (
    capabilityKind !== null
    && capabilityKind !== "public_encounter"
    && capabilityKind !== "room_pairing"
    && capabilityKind !== "room_operator"
  ) {
    fail("R4_PUBLIC_CORE_SCOPE_UNAVAILABLE");
  }
  return Object.freeze({
    roomKind: "third_place_public",
    interactionMode: "public_single",
    capabilityKind,
  });
}

/**
 * Action-aware construction guard. A closed public Room remains reachable for
 * direct reads and exact closure/recovery operations; only issuing a new
 * encounter or accepting a new Interaction requires open public intake.
 */
export function assertPublicCoreRoomScopeForAction(
  action: string,
  input: PublicCoreRoomScopeInput,
): PublicCoreActionRoomScope {
  assertPublicCoreAction(action);
  const keys = Object.keys(input);
  if (keys.some((key) => !["roomKind", "interactionMode", "capabilityKind"].includes(key))) {
    fail("R4_PUBLIC_CORE_SCOPE_INVALID");
  }
  if (
    input.roomKind !== "third_place_public"
    || (input.interactionMode !== "public_single" && input.interactionMode !== "closed")
  ) {
    fail("R4_PUBLIC_CORE_SCOPE_UNAVAILABLE");
  }
  const capabilityKind = input.capabilityKind ?? null;
  if (
    capabilityKind !== null
    && capabilityKind !== "public_encounter"
    && capabilityKind !== "room_pairing"
    && capabilityKind !== "room_operator"
  ) {
    fail("R4_PUBLIC_CORE_SCOPE_UNAVAILABLE");
  }
  if (
    (action === "public_encounter.issue" || action === "interaction.create")
    && input.interactionMode !== "public_single"
  ) {
    fail("R4_PUBLIC_CORE_INTAKE_CLOSED");
  }
  return Object.freeze({
    roomKind: "third_place_public",
    interactionMode: input.interactionMode,
    capabilityKind,
  });
}
