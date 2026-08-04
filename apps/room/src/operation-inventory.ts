export type OperationFamily = "public_guest" | "controller" | "curator" | "room_operator";
export type ActorClass = "public" | "guest_capability" | "controller" | "curator" | "room_operator";

export interface OperationDefinition {
  name: string;
  family: OperationFamily;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  actor: ActorClass;
  mutating: boolean;
  expectedVersion: boolean;
}

export const OPERATION_INVENTORY = [
  { name: "third_place.list", family: "public_guest", method: "GET", path: "/third-place/projections", actor: "public", mutating: false, expectedVersion: false },
  { name: "projection.read", family: "public_guest", method: "GET", path: "/projections/:projectionId", actor: "public", mutating: false, expectedVersion: false },
  { name: "public_encounter.issue", family: "public_guest", method: "POST", path: "/projections/:projectionId/encounters", actor: "public", mutating: true, expectedVersion: true },
  { name: "interaction.create", family: "public_guest", method: "POST", path: "/interactions", actor: "guest_capability", mutating: true, expectedVersion: false },
  { name: "interaction.read", family: "public_guest", method: "GET", path: "/interactions/:interactionId", actor: "guest_capability", mutating: false, expectedVersion: false },
  { name: "interaction.delete", family: "public_guest", method: "DELETE", path: "/interactions/:interactionId", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "notification.set", family: "public_guest", method: "PUT", path: "/interactions/:interactionId/notification", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "notification.remove", family: "public_guest", method: "DELETE", path: "/interactions/:interactionId/notification", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "notification.verify", family: "public_guest", method: "POST", path: "/interactions/:interactionId/notification/verify", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "grant_offer.accept", family: "public_guest", method: "POST", path: "/grant-offers/:offerId/accept", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "direct_invite.redeem", family: "public_guest", method: "POST", path: "/direct-invites/:inviteId/redeem", actor: "guest_capability", mutating: true, expectedVersion: true },
  { name: "agent_derivative.mint", family: "public_guest", method: "POST", path: "/agent-derivatives", actor: "guest_capability", mutating: true, expectedVersion: false },

  { name: "control.status", family: "controller", method: "GET", path: "/control/status", actor: "controller", mutating: false, expectedVersion: false },
  { name: "control.interaction.read", family: "controller", method: "GET", path: "/control/interactions/:interactionId", actor: "controller", mutating: false, expectedVersion: false },
  { name: "room.create", family: "controller", method: "POST", path: "/control/rooms", actor: "controller", mutating: true, expectedVersion: false },
  { name: "room.pair", family: "controller", method: "POST", path: "/control/rooms/:roomId/pairings", actor: "controller", mutating: true, expectedVersion: true },
  { name: "room.pair.exchange", family: "public_guest", method: "POST", path: "/pairings/:pairingId/exchange", actor: "public", mutating: true, expectedVersion: true },
  { name: "room.binding.revoke", family: "controller", method: "POST", path: "/control/room-bindings/:bindingId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "room.mode.set", family: "controller", method: "POST", path: "/control/rooms/:roomId/mode", actor: "controller", mutating: true, expectedVersion: true },
  { name: "room.retire", family: "controller", method: "POST", path: "/control/rooms/:roomId/retire", actor: "controller", mutating: true, expectedVersion: true },
  { name: "room.delete", family: "controller", method: "DELETE", path: "/control/rooms/:roomId", actor: "controller", mutating: true, expectedVersion: true },
  { name: "projection.revoke", family: "controller", method: "POST", path: "/control/projections/:projectionId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "response.revoke", family: "controller", method: "POST", path: "/control/responses/:responseId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "grant.issue", family: "controller", method: "POST", path: "/control/grants", actor: "controller", mutating: true, expectedVersion: false },
  { name: "grant.replace", family: "controller", method: "POST", path: "/control/grants/:grantId/replacements", actor: "controller", mutating: true, expectedVersion: true },
  { name: "grant.revoke", family: "controller", method: "POST", path: "/control/grants/:grantId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "grant_offer.issue", family: "controller", method: "POST", path: "/control/grant-offers", actor: "controller", mutating: true, expectedVersion: false },
  { name: "grant_offer.revoke", family: "controller", method: "POST", path: "/control/grant-offers/:offerId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "direct_invite.issue", family: "controller", method: "POST", path: "/control/direct-invites", actor: "controller", mutating: true, expectedVersion: false },
  { name: "direct_invite.revoke", family: "controller", method: "POST", path: "/control/direct-invites/:inviteId/revoke", actor: "controller", mutating: true, expectedVersion: true },
  { name: "interaction.close", family: "controller", method: "POST", path: "/control/interactions/:interactionId/close", actor: "controller", mutating: true, expectedVersion: true },

  { name: "curation.admit", family: "curator", method: "POST", path: "/curation/projections/:projectionId/admit", actor: "curator", mutating: true, expectedVersion: true },
  { name: "curation.unlist", family: "curator", method: "POST", path: "/curation/projections/:projectionId/unlist", actor: "curator", mutating: true, expectedVersion: true },

  { name: "room_operator.status", family: "room_operator", method: "GET", path: "/room-operator/status", actor: "room_operator", mutating: false, expectedVersion: false },
  { name: "room_operator.sync", family: "room_operator", method: "POST", path: "/room-operator/sync", actor: "room_operator", mutating: true, expectedVersion: false },
  { name: "room_operator.pull", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/pull", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.cycle.reserve", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/cycle/reserve", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.cycle.recover", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/cycle/recover", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.cycle.abandon", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/cycle/abandon", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.dispatch.issue", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/dispatch-permits", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.ack", family: "room_operator", method: "POST", path: "/room-operator/events/ack", actor: "room_operator", mutating: true, expectedVersion: false },
  { name: "room_operator.projection.deliver", family: "room_operator", method: "POST", path: "/room-operator/projections/deliver", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.response.deliver", family: "room_operator", method: "POST", path: "/room-operator/responses/deliver", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.stale.attest", family: "room_operator", method: "POST", path: "/room-operator/projections/:projectionId/stale", actor: "room_operator", mutating: true, expectedVersion: true },
  { name: "room_operator.local_purge.receipt", family: "room_operator", method: "POST", path: "/room-operator/interactions/:interactionId/local-purge", actor: "room_operator", mutating: true, expectedVersion: true },
] as const satisfies readonly OperationDefinition[];

function pattern(path: string): RegExp {
  const source = path
    .split("/")
    .map((part) => (part.startsWith(":") ? "([^/]+)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${source}$`);
}

export function matchOperation(method: string, path: string): {
  definition: OperationDefinition;
  params: Record<string, string>;
} | null {
  for (const definition of OPERATION_INVENTORY) {
    if (definition.method !== method) continue;
    const match = pattern(definition.path).exec(path);
    if (!match) continue;
    const keys = definition.path.split("/").filter((part) => part.startsWith(":"));
    const params: Record<string, string> = {};
    keys.forEach((key, index) => {
      const value = match[index + 1];
      if (value) params[key.slice(1)] = decodeURIComponent(value);
    });
    return { definition, params };
  }
  return null;
}

export function operationDefinition(name: string): OperationDefinition {
  const definition = OPERATION_INVENTORY.find((item) => item.name === name);
  if (!definition) throw new Error(`Unknown R4 operation: ${name}`);
  return definition;
}
