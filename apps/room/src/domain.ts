import {
  canonicalSha256,
  validateProjectionCapsuleV1,
  type ProjectionCapsuleV1,
  type RoomEventV1,
} from "../../../packages/r4-protocol/src/index.ts";
import type {
  AgentDerivativeV1,
  DirectGrantInviteV1,
  GrantV1,
  InteractionV1,
  NotificationEndpointV1,
  OperationReceiptV1,
  ProjectionLifecycleV1,
  ProjectionReadViewV1,
  PublicEncounterV1,
  ResponseV1,
  RoomV1,
} from "../../../packages/r4-protocol/src/index.ts";
import type { PublicInteractionV1 } from "./redaction.ts";

export type {
  InteractionConsent as ConsentChoice,
  InteractionType,
  OperationReceiptV1 as OperationReceipt,
  ProjectionOwnerState as ProjectionState,
  RoomKind,
  RoomV1,
} from "../../../packages/r4-protocol/src/index.ts";

export interface StoredRoom {
  room: RoomV1;
  label: string;
}

export interface StoredProjection {
  projection: ProjectionCapsuleV1;
  lifecycle: ProjectionLifecycleV1;
}

export interface StoredInteraction {
  interaction: InteractionV1;
  originCapabilityId: string;
  response: ResponseV1 | null;
}

export type StoredCapability =
  | { kind: "public_encounter"; value: PublicEncounterV1; permitsAgentDerivative: true }
  | { kind: "grant"; value: GrantV1; permitsAgentDerivative: boolean }
  | { kind: "agent_derivative"; value: AgentDerivativeV1; permitsAgentDerivative: false };

export interface StoredDirectInvite {
  invite: DirectGrantInviteV1;
}

export interface StoredNotification {
  endpoint: NotificationEndpointV1;
  syntheticPlaintextAddress: string | null;
  challengeId: string | null;
}

export interface StoredRoomOperatorBinding {
  schemaVersion: "synthetic_room_operator_binding.v1";
  bindingId: string;
  roomId: string;
  secretDigest: `sha256:${string}`;
  state: "active" | "revoked";
  pairedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  version: number;
}

export interface StoredPairingChallenge {
  schemaVersion: "synthetic_pairing_challenge.v1";
  pairingId: string;
  roomId: string;
  pairingCodeDigest: `sha256:${string}`;
  state: "issued" | "exchanged" | "expired";
  issuedAt: string;
  expiresAt: string;
  clientPublicKeyHash: `sha256:${string}` | null;
  bindingId: string | null;
  exchangeResponse: Record<string, unknown> | null;
  version: number;
}

export type HostedEvent = RoomEventV1;

export interface PublicProjectionView {
  schemaVersion: "third_place_resident.v1";
  roomLabel: string;
  view: ProjectionReadViewV1;
}

export interface OwnerStatusView {
  rooms: StoredRoom[];
  projections: StoredProjection[];
  interactions: Array<{
    interaction: Omit<PublicInteractionV1, "requestText" | "guestCapsule">;
    response: Omit<ResponseV1, "body"> | null;
  }>;
  events: HostedEvent[];
}

export type { OperationReceiptV1, ProjectionCapsuleV1, ProjectionLifecycleV1, ResponseV1 };

export function projectionWithPayloadHash(
  preimage: Omit<ProjectionCapsuleV1, "payloadHash">,
): ProjectionCapsuleV1 {
  return validateProjectionCapsuleV1({ ...preimage, payloadHash: canonicalSha256(preimage) });
}
