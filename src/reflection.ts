import { assertContextPacket, assertReflectionProposal, canonicalJson, sha256 } from "./contracts.ts";
import type { ContextPacket, ReflectionProposal } from "./types.ts";

const MAX_PROPOSAL_BYTES = 16_384;

export function expectedProposalId(packet: ContextPacket): string {
  const digest = sha256(canonicalJson({
    packetId: packet.packetId,
    packetHash: sha256(canonicalJson(packet)),
    baseTwinRevision: packet.baseTwinRevision,
  })).slice("sha256:".length, "sha256:".length + 32);
  return `prp_${digest}`;
}

export function validateReflectionProposalForPacket(
  proposal: unknown,
  packet: ContextPacket,
): asserts proposal is ReflectionProposal {
  assertContextPacket(packet);
  assertReflectionProposal(proposal);
  if (proposal.proposalId !== expectedProposalId(packet)) {
    throw new Error("Reflection proposal ID does not match the deterministic Context Packet ID");
  }
  if (proposal.baseTwinRevision !== packet.baseTwinRevision) {
    throw new Error("Reflection proposal is stale for the Context Packet base revision");
  }
  if (Buffer.byteLength(canonicalJson(proposal), "utf8") > MAX_PROPOSAL_BYTES) {
    throw new Error("Reflection proposal exceeds the output byte ceiling");
  }
  if (new Set(proposal.evidenceIds).size !== proposal.evidenceIds.length) {
    throw new Error("Reflection proposal evidence IDs must be unique");
  }
  const allowed = new Set(packet.allowedEvidenceIds);
  for (const evidenceId of proposal.evidenceIds) {
    if (!allowed.has(evidenceId)) throw new Error(`Reflection proposal cites evidence outside the packet: ${evidenceId}`);
  }
  const citedTimepoints = new Set(
    packet.evidence
      .filter((item) => proposal.evidenceIds.includes(item.evidenceId))
      .map((item) => item.timepointId),
  );
  if (!citedTimepoints.has("earlier") || !citedTimepoints.has("later")) {
    throw new Error("Reflection proposal must cite evidence from both time points");
  }
  if (proposal.claim.trim() === proposal.implication.trim()) {
    throw new Error("Reflection proposal implication must add decision value beyond the claim");
  }
  if (proposal.claim.trim() === proposal.alternativeExplanation.trim()) {
    throw new Error("Reflection proposal alternative must challenge rather than repeat the claim");
  }
}
