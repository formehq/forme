import type {
  AgentDerivativeV1,
  ConsentEnvelopeV1,
  DirectGrantInviteV1,
  GrantV1,
  InteractionV1,
  NotificationEndpointV1,
  PublicEncounterV1,
} from "../../../packages/r4-protocol/src/index.ts";

export type PublicEncounterViewV1 = Omit<PublicEncounterV1, "secretDigest">;
export type GrantViewV1 = Omit<GrantV1, "secretDigest">;
export type AgentDerivativeViewV1 = Omit<AgentDerivativeV1, "secretDigest">;
export type DirectGrantInviteViewV1 = Omit<DirectGrantInviteV1, "secretDigest">;
export type PublicConsentEnvelopeV1 = Omit<ConsentEnvelopeV1, "replyCapabilityDigest">;
export type PublicInteractionV1 = Omit<InteractionV1, "replyCapabilityDigest" | "deleteCapabilityDigest" | "consentEnvelope"> & {
  readonly consentEnvelope: PublicConsentEnvelopeV1 | null;
};
export type NotificationEndpointViewV1 = Omit<NotificationEndpointV1, "encryptedAddress">;

export function publicEncounterView(value: PublicEncounterV1): PublicEncounterViewV1 {
  const { secretDigest: _secretDigest, ...view } = structuredClone(value);
  return view;
}

export function grantView(value: GrantV1): GrantViewV1 {
  const { secretDigest: _secretDigest, ...view } = structuredClone(value);
  return view;
}

export function agentDerivativeView(value: AgentDerivativeV1): AgentDerivativeViewV1 {
  const { secretDigest: _secretDigest, ...view } = structuredClone(value);
  return view;
}

export function directGrantInviteView(value: DirectGrantInviteV1): DirectGrantInviteViewV1 {
  const { secretDigest: _secretDigest, ...view } = structuredClone(value);
  return view;
}

export function publicInteractionView(value: InteractionV1): PublicInteractionV1 {
  const {
    replyCapabilityDigest: _replyCapabilityDigest,
    deleteCapabilityDigest: _deleteCapabilityDigest,
    consentEnvelope,
    ...view
  } = structuredClone(value);
  if (consentEnvelope === null) return { ...view, consentEnvelope: null };
  const { replyCapabilityDigest: _nestedReplyCapabilityDigest, ...publicConsentEnvelope } = consentEnvelope;
  return { ...view, consentEnvelope: publicConsentEnvelope };
}

export function notificationEndpointView(value: NotificationEndpointV1): NotificationEndpointViewV1 {
  const { encryptedAddress: _encryptedAddress, ...view } = structuredClone(value);
  return view;
}
