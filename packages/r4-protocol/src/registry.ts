import { ProtocolValidationError, assertRecord } from "./guards.ts";
import {
  validateAgentDerivativeV1,
  validateApiMutationEnvelopeV1,
  validateCursorGoneV1,
  validateDirectGrantInviteV1,
  validateDispatchPermitV1,
  validateFreshCycleReservationV1,
  validateGrantOfferV1,
  validateGuestCapsuleV1,
  validateNotificationEndpointV1,
  validateProjectionLifecycleV1,
  validatePublicEncounterV1,
  validateRoomEventAckReceiptV1,
  validateRoomEventAckV1,
  validateRoomEventBatchV1,
  validateRoomEventV1,
  validateResponseSourcePolicyV1,
  validateResponseSourceSnapshotV1,
  validateRoomOperatorRequestV1,
  validateSnapshotQueryResultV1,
  validateSnapshotQueryV1,
  validateTransportDispatchIntentV1,
} from "./object-validation.ts";
import {
  validateArtifactApprovalV1,
  validateConsentEnvelopeV1,
  validateGrantV1,
  validateHostedPublicationDeliveryV1,
  validateInteractionV1,
  validateOperationReceiptV1,
  validateProjectionBasisV1,
  validateProjectionCapsuleV1,
  validateProjectionReadViewV1,
  validateReadyNoticeV1,
  validateResponseCandidateV1,
  validateResponseOrientationV1,
  validateResponseV1,
  validateRoomV1,
  validateSessionEnvelopeV1,
  validateSessionReceiptV1,
  validateTransportGateDecisionV1,
} from "./validation.ts";
import type { ProtocolObjectV1, ResponseSourcePolicyV1 } from "./types.ts";

export const PROTOCOL_SCHEMA_VERSIONS = [
  "room.v1", "projection_capsule.v1", "projection_lifecycle.v1", "projection_basis.v1",
  "public_encounter.v1", "grant.v1", "grant_offer.v1", "direct_grant_invite.v1", "agent_derivative.v1",
  "guest_capsule.v1", "consent_envelope.v1", "interaction.v1", "response.v1", "artifact_approval.v1",
  "notification_endpoint.v1", "ready_notice.v1", "response_orientation.v1", "response_source_policy.v1",
  "response_source_snapshot.v1", "session_envelope.v1", "response_candidate.v1", "fresh_cycle_reservation.v1",
  "dispatch_permit.v1", "session_receipt.v1", "operation_receipt.v1", "api_mutation_envelope.v1",
  "room_event.v1", "room_event_batch.v1", "cursor_gone.v1", "room_event_ack.v1", "room_event_ack_receipt.v1",
  "projection_read_view.v1", "room_operator_request.v1", "snapshot_line_read.v1", "snapshot_search.v1",
  "snapshot_query_result.v1", "transport_dispatch_intent.v1", "transport_gate_decision.v1",
  "hosted_publication_delivery.v1",
] as const;

export interface ProtocolValidationContextV1 {
  readonly consentEnvelope?: Parameters<typeof validateSessionEnvelopeV1>[1];
  readonly parentInteraction?: Parameters<typeof validateResponseV1>[1];
  readonly sourcePolicy?: ResponseSourcePolicyV1;
}

/** Strict schemaVersion dispatch. Context-dependent objects fail when required context is absent. */
export function validateProtocolObjectV1(value: unknown, context: ProtocolValidationContextV1 = {}): ProtocolObjectV1 {
  assertRecord(value, "$protocolObject");
  switch (value.schemaVersion) {
    case "room.v1": return validateRoomV1(value);
    case "projection_capsule.v1": return validateProjectionCapsuleV1(value);
    case "projection_lifecycle.v1": return validateProjectionLifecycleV1(value);
    case "projection_basis.v1": return validateProjectionBasisV1(value);
    case "public_encounter.v1": return validatePublicEncounterV1(value);
    case "grant.v1": return validateGrantV1(value);
    case "grant_offer.v1": return validateGrantOfferV1(value);
    case "direct_grant_invite.v1": return validateDirectGrantInviteV1(value);
    case "agent_derivative.v1": return validateAgentDerivativeV1(value);
    case "guest_capsule.v1": return validateGuestCapsuleV1(value);
    case "consent_envelope.v1": return validateConsentEnvelopeV1(value);
    case "interaction.v1": return validateInteractionV1(value);
    case "response.v1": {
      if (!context.parentInteraction) throw new ProtocolValidationError("validation_context_required", "$protocolObject", "Response validation requires parentInteraction");
      return validateResponseV1(value, context.parentInteraction);
    }
    case "artifact_approval.v1": return validateArtifactApprovalV1(value);
    case "hosted_publication_delivery.v1": return validateHostedPublicationDeliveryV1(value);
    case "notification_endpoint.v1": return validateNotificationEndpointV1(value);
    case "ready_notice.v1": return validateReadyNoticeV1(value);
    case "response_orientation.v1": return validateResponseOrientationV1(value);
    case "response_source_policy.v1": return validateResponseSourcePolicyV1(value);
    case "response_source_snapshot.v1": {
      if (!context.sourcePolicy) throw new ProtocolValidationError("validation_context_required", "$protocolObject", "source snapshot validation requires sourcePolicy");
      return validateResponseSourceSnapshotV1(value, context.sourcePolicy);
    }
    case "session_envelope.v1": {
      if (!context.consentEnvelope) throw new ProtocolValidationError("validation_context_required", "$protocolObject", "Session Envelope validation requires consentEnvelope");
      return validateSessionEnvelopeV1(value, context.consentEnvelope);
    }
    case "response_candidate.v1": return validateResponseCandidateV1(value);
    case "fresh_cycle_reservation.v1": return validateFreshCycleReservationV1(value);
    case "dispatch_permit.v1": return validateDispatchPermitV1(value);
    case "session_receipt.v1": return validateSessionReceiptV1(value);
    case "operation_receipt.v1": return validateOperationReceiptV1(value);
    case "room_event.v1": return validateRoomEventV1(value);
    case "room_event_batch.v1": return validateRoomEventBatchV1(value);
    case "cursor_gone.v1": return validateCursorGoneV1(value);
    case "room_event_ack.v1": return validateRoomEventAckV1(value);
    case "room_event_ack_receipt.v1": return validateRoomEventAckReceiptV1(value);
    case "api_mutation_envelope.v1": return validateApiMutationEnvelopeV1(value);
    case "projection_read_view.v1": return validateProjectionReadViewV1(value);
    case "room_operator_request.v1": return validateRoomOperatorRequestV1(value);
    case "snapshot_line_read.v1":
    case "snapshot_search.v1": return validateSnapshotQueryV1(value);
    case "snapshot_query_result.v1": return validateSnapshotQueryResultV1(value);
    case "transport_dispatch_intent.v1": return validateTransportDispatchIntentV1(value);
    case "transport_gate_decision.v1": return validateTransportGateDecisionV1(value);
    default: throw new ProtocolValidationError("unknown_schema_version", "$protocolObject.schemaVersion", "unknown R4 protocol object");
  }
}
