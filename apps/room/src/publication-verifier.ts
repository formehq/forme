import { createHmac, timingSafeEqual } from "node:crypto";
import {
  canonicalJsonBytes,
  validateHostedPublicationDeliveryV1,
  type HostedPublicationDeliveryV1,
  type PublicationAttestationV1,
} from "../../../packages/r4-protocol/src/index.ts";
import type { StoredRoomOperatorBinding } from "./domain.ts";

export class HostedPublicationVerificationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`hosted_publication_verification_failed:${code}`);
    this.code = code;
  }
}

function deny(code: string): never {
  throw new HostedPublicationVerificationError(code);
}

function preimage(attestation: PublicationAttestationV1) {
  return {
    domain: "forme.r4.publication-attestation.v1",
    schemaVersion: attestation.schemaVersion,
    attestationId: attestation.attestationId,
    bindingId: attestation.bindingId,
    roomId: attestation.roomId,
    artifactClass: attestation.artifactClass,
    artifactId: attestation.artifactId,
    artifactHash: attestation.artifactHash,
    issuedAt: attestation.issuedAt,
    expiresAt: attestation.expiresAt,
  } as const;
}

/** Hosted-only verifier: no local source, basis, approval, or Workspace imports. */
export function verifyHostedPublicationForBindingV1(input: {
  delivery: unknown;
  binding: StoredRoomOperatorBinding;
  bearerSecret: string;
  now: string;
}): HostedPublicationDeliveryV1 {
  const delivery = validateHostedPublicationDeliveryV1(input.delivery);
  const { attestation } = delivery;
  const nowMs = Date.parse(input.now);
  if (
    input.binding.state !== "active"
    || input.binding.revokedAt !== null
    || input.binding.bindingId !== attestation.bindingId
    || input.binding.roomId !== attestation.roomId
    || Date.parse(input.binding.expiresAt) <= nowMs
  ) deny("binding_not_current");
  if (
    Date.parse(attestation.issuedAt) > nowMs
    || Date.parse(attestation.expiresAt) <= nowMs
    || Date.parse(attestation.expiresAt) > Date.parse(input.binding.expiresAt)
  ) deny("attestation_not_current");

  const expectedHex = createHmac("sha256", new TextEncoder().encode(input.bearerSecret))
    .update(canonicalJsonBytes(preimage(attestation)))
    .digest("hex");
  const actualHex = attestation.hmacSha256.slice("sha256:".length);
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) deny("hmac_mismatch");
  return delivery;
}
