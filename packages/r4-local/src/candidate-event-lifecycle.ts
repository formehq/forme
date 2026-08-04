import { validateRoomEventV1, type RoomEventV1 } from "../../r4-protocol/src/index.ts";
import type { FileCandidateStore } from "./candidate-store.ts";
import type { CandidateDenyReason, RoomEventLifecycle } from "./types.ts";
import type { RoomMutationContext } from "./coordinator.ts";

const INTERACTION_DESTRUCTIVE_TERMINALS = new Set([
  "interaction.closed_without_response",
  "interaction.deleted",
  "interaction.interaction_deleted",
  "interaction.interaction_expired",
  "interaction.origin_revoked",
  "interaction.room_retired",
]);

const PROJECTION_INVALIDATING_TERMINALS = new Set([
  "projection.stale",
  "projection.superseded",
  "projection.revoked",
  "projection.expired",
]);

const RESPONSE_TERMINALS = new Set([
  "response.published",
  "response.response_expired",
  "response.response_revoked",
  "response.origin_revoked",
  "response.interaction_deleted",
  "response.room_retired",
  "response.expired",
  "response.revoked",
]);

const ROOM_DESTRUCTIVE_TERMINALS = new Set([
  "room.retired",
  "room.deleted",
]);

/**
 * Applies only body-free invalidation metadata. This hook is deliberately
 * placed between durable local event persistence and hosted ACK. A cleanup
 * crash leaves the candidate journal in its deny-first phase; replaying the
 * same pending ACK finishes that journal before the ACK can advance.
 */
export class CandidateRoomEventLifecycle implements RoomEventLifecycle {
  readonly candidates: FileCandidateStore;

  constructor(candidates: FileCandidateStore) {
    this.candidates = candidates;
  }

  async apply(rawEvent: RoomEventV1, now: Date, context?: RoomMutationContext): Promise<void> {
    const event = validateRoomEventV1(rawEvent);
    if (
      (event.objectType === "room" && ROOM_DESTRUCTIVE_TERMINALS.has(event.eventType))
      || event.objectType === "purge"
    ) {
      await this.candidates.cleanupMatching({ roomId: event.roomId, reason: "room_terminal", now, context });
      return;
    }
    if (event.objectType === "interaction" && INTERACTION_DESTRUCTIVE_TERMINALS.has(event.eventType)) {
      await this.candidates.cleanupMatching({
        roomId: event.roomId,
        interactionId: event.objectId,
        reason: "interaction_terminal",
        now,
        context,
      });
      return;
    }
    if (event.objectType === "projection" && PROJECTION_INVALIDATING_TERMINALS.has(event.eventType)) {
      await this.candidates.cleanupMatching({
        roomId: event.roomId,
        projectionId: event.objectId,
        reason: "projection_terminal",
        now,
        context,
      });
      return;
    }
    if (event.objectType === "response" && RESPONSE_TERMINALS.has(event.eventType)) {
      // Response events intentionally expose no Interaction/body. The
      // response lifecycle payload hash is the only permitted exact local
      // candidate correlation when a candidate still exists.
      await this.candidates.cleanupMatching({
        roomId: event.roomId,
        candidateHash: event.payloadHash,
        reason: event.eventType === "response.published" ? "published" : "response_terminal",
        now,
        context,
      });
    }
  }

  async applyTombstone(roomId: string, tombstoneId: string, now: Date, context?: RoomMutationContext): Promise<void> {
    const reason: CandidateDenyReason = "cursor_tombstone";
    if (tombstoneId.startsWith("room_")) {
      await this.candidates.cleanupMatching({ roomId, reason, now, context });
    } else if (tombstoneId.startsWith("interaction_")) {
      await this.candidates.cleanupMatching({ roomId, interactionId: tombstoneId, reason, now, context });
    } else if (tombstoneId.startsWith("proj_")) {
      await this.candidates.cleanupMatching({ roomId, projectionId: tombstoneId, reason, now, context });
    }
  }
}
