import { createHash } from "node:crypto";

/**
 * Gate A fixtures only. These values are deliberately public test material and
 * must never be accepted when the synthetic runtime flag is disabled.
 */
export const SYNTHETIC_PUBLIC_ROOM_ID = "room_formepublic00000000000000000000";
export const SYNTHETIC_PRIVATE_ROOM_ID = "room_formeprivate0000000000000000000";

export const SYNTHETIC_PUBLIC_ROOM_OPERATOR_BINDING_ID = "binding_formepublic00000000000000000000";
export const SYNTHETIC_PRIVATE_ROOM_OPERATOR_BINDING_ID = "binding_formeprivate0000000000000000000";

export function syntheticCapabilitySecret(label: string): string {
  if (/^[A-Za-z0-9_-]+$/u.test(label)) {
    const bytes = Buffer.from(label, "base64url");
    if (bytes.byteLength === 32 && bytes.toString("base64url") === label) return label;
  }
  return createHash("sha256").update(`forme-r4-synthetic-capability\u0000${label}`).digest("base64url");
}

const SYNTHETIC_CAPABILITY_BODY_FIELDS = new Set([
  "agentSecret",
  "deleteSecret",
  "encounterSecret",
  "grantSecret",
  "inviteSecret",
  "replySecret",
]);

/** Keeps named Gate A fixtures readable while exercising the real wire format. */
export function syntheticCapabilityRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(body);
  for (const [key, value] of Object.entries(result)) {
    if (SYNTHETIC_CAPABILITY_BODY_FIELDS.has(key) && typeof value === "string") {
      result[key] = syntheticCapabilitySecret(value);
    }
  }
  return result;
}

export const SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET = syntheticCapabilitySecret("public-room-operator");
export const SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET = syntheticCapabilitySecret("private-room-operator");

export function syntheticRoomOperatorSecret(roomId: string): string {
  if (roomId === SYNTHETIC_PUBLIC_ROOM_ID) return SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET;
  if (roomId === SYNTHETIC_PRIVATE_ROOM_ID) return SYNTHETIC_PRIVATE_ROOM_OPERATOR_SECRET;
  throw new Error(`No synthetic room_operator.v1 fixture is bound to Room ${roomId}`);
}

export function syntheticPairingCredential(
  pairingId: string,
  roomId: string,
  clientPublicKeyHash: string,
): string {
  return createHash("sha256")
    .update(`forme-r4-synthetic-pairing\u0000${pairingId}\u0000${roomId}\u0000${clientPublicKeyHash}`)
    .digest("base64url");
}
