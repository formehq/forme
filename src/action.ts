import { canonicalJson, sha256 } from "./contracts.ts";
import type { ActionContextPacket, ActionIntentProposal, EffectPlan } from "./types.ts";

export const R3_TARGET_PATH = "README.md" as const;
export const R3_MARKER_ID = "forme:r3-action" as const;
export const R3_START_MARKER = "<!-- forme:r3-action:start -->";
export const R3_END_MARKER = "<!-- forme:r3-action:end -->";
export const R3_PLACEHOLDER_BODY = "\n_No approved Forme action is currently applied._\n";

const MAX_PROPOSAL_BYTES = 16_384;

function shortHash(value: string): string {
  return sha256(value).slice("sha256:".length, "sha256:".length + 32);
}

function assertSafeRenderedText(value: string, label: string): void {
  if (value.includes("\0") || value.includes("<!--") || value.includes("-->")) {
    throw new Error(`${label} contains a forbidden marker or control sequence`);
  }
}

export function markdownText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll("\\", "\\\\")
    .replace(/([`*_{}\[\]()#+.!|>-])/g, "\\$1")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function expectedActionProposalId(packet: ActionContextPacket): string {
  return `act_${shortHash(canonicalJson({
    packetId: packet.packetId,
    packetHash: sha256(canonicalJson(packet)),
    baseTwinRevision: packet.baseTwinRevision,
  }))}`;
}

export function validateActionProposalForPacket(
  proposal: ActionIntentProposal,
  packet: ActionContextPacket,
): void {
  if (proposal.proposalId !== expectedActionProposalId(packet)) {
    throw new Error("Action proposal ID does not match the deterministic Action Context Packet ID");
  }
  if (proposal.baseTwinRevision !== packet.baseTwinRevision) {
    throw new Error("Action proposal is stale for the Action Context Packet base revision");
  }
  if (proposal.actionKind !== packet.capability.actionKind) {
    throw new Error("Action proposal requested a capability outside the packet");
  }
  if (Buffer.byteLength(canonicalJson(proposal), "utf8") > MAX_PROPOSAL_BYTES) {
    throw new Error("Action proposal exceeds the output byte ceiling");
  }
  if (proposal.schemaVersion === "1") {
    for (const [label, value] of Object.entries({
      rationale: proposal.rationale,
      title: proposal.title,
      whyNow: proposal.whyNow,
      nextMove: proposal.nextMove,
      successCheck: proposal.successCheck,
      ownerChallenge: proposal.ownerChallenge,
    })) assertSafeRenderedText(value, label);
    return;
  }
  for (const [label, value] of Object.entries({
    plainLanguageSummary: proposal.plainLanguageSummary,
    recommendation: proposal.recommendation ?? "",
    blockingQuestion: proposal.blockingQuestion ?? "",
    confidenceRationale: proposal.confidence.rationale,
    whyNow: proposal.whyNow,
    successCheck: proposal.successCheck,
    ownerChallenge: proposal.ownerChallenge,
  })) assertSafeRenderedText(value, label);
  proposal.decisionItems.forEach((item, itemIndex) => {
    assertSafeRenderedText(item.judgment, `decisionItems[${itemIndex}].judgment`);
    assertSafeRenderedText(item.recommendedChoice, `decisionItems[${itemIndex}].recommendedChoice`);
    assertSafeRenderedText(item.reason, `decisionItems[${itemIndex}].reason`);
    item.alternatives.forEach((alternative, alternativeIndex) => {
      assertSafeRenderedText(alternative, `decisionItems[${itemIndex}].alternatives[${alternativeIndex}]`);
    });
  });
}

export function managedBody(fileBody: string): string {
  const starts = fileBody.split(R3_START_MARKER).length - 1;
  const ends = fileBody.split(R3_END_MARKER).length - 1;
  if (starts !== 1 || ends !== 1) throw new Error("README.md must contain exactly one Forme R3 managed block");
  const start = fileBody.indexOf(R3_START_MARKER) + R3_START_MARKER.length;
  const end = fileBody.indexOf(R3_END_MARKER);
  if (end < start) throw new Error("README.md Forme R3 markers are out of order");
  return fileBody.slice(start, end);
}

export function replaceManagedBody(fileBody: string, body: string): string {
  managedBody(fileBody);
  const start = fileBody.indexOf(R3_START_MARKER) + R3_START_MARKER.length;
  const end = fileBody.indexOf(R3_END_MARKER);
  return `${fileBody.slice(0, start)}${body}${fileBody.slice(end)}`;
}

export function renderManagedBody(
  proposal: ActionIntentProposal,
  effectId: string,
  correctedReflectionId: string,
): string {
  if (proposal.schemaVersion === "2") {
    if (proposal.mode === "ask_owner" || proposal.recommendation === null) {
      throw new Error("ask_owner proposals cannot render an effect body");
    }
    const decisionItems = proposal.decisionItems.flatMap((item, index) => [
      `${index + 1}. **${markdownText(item.judgment)}**`,
      `   - Recommended: ${markdownText(item.recommendedChoice)}`,
      `   - Why: ${markdownText(item.reason)}`,
      `   - Alternatives: ${item.alternatives.map(markdownText).join(" / ")}`,
    ]);
    return [
      "",
      "### Owner Decision Brief",
      "",
      `**30-second answer:** ${markdownText(proposal.plainLanguageSummary)}`,
      "",
      `**Recommendation:** ${markdownText(proposal.recommendation)}`,
      "",
      `**Why now:** ${markdownText(proposal.whyNow)}`,
      "",
      "#### Editable judgment items",
      "",
      ...decisionItems,
      "",
      `**Success check:** ${markdownText(proposal.successCheck)}`,
      "",
      `**Owner challenge:** ${markdownText(proposal.ownerChallenge)}`,
      "",
      `<sub>Forme R3 · Twin revision ${proposal.baseTwinRevision} · ${correctedReflectionId} · ${effectId} · ${proposal.proposalId}</sub>`,
      "",
    ].join("\n");
  }
  return [
    "",
    `### ${markdownText(proposal.title)}`,
    "",
    `**Why now:** ${markdownText(proposal.whyNow)}`,
    "",
    `**Next move:** ${markdownText(proposal.nextMove)}`,
    "",
    `**Success check:** ${markdownText(proposal.successCheck)}`,
    "",
    `**Owner challenge:** ${markdownText(proposal.ownerChallenge)}`,
    "",
    `<sub>Forme R3 · Twin revision ${proposal.baseTwinRevision} · ${correctedReflectionId} · ${effectId} · ${proposal.proposalId}</sub>`,
    "",
  ].join("\n");
}

export function compileEffectPlan(
  fileBody: string,
  proposal: ActionIntentProposal,
  correctedReflectionId: string,
): EffectPlan {
  if (proposal.schemaVersion === "2" && proposal.mode === "ask_owner") {
    throw new Error("ask_owner proposals cannot compile an effect plan");
  }
  const beforeBody = managedBody(fileBody);
  if (beforeBody !== R3_PLACEHOLDER_BODY) {
    throw new Error("README.md Forme R3 block is not the approved empty placeholder");
  }
  const beforeFileHash = sha256(fileBody);
  const proposalHash = sha256(canonicalJson(proposal));
  const effectId = `efp_${shortHash(canonicalJson({ proposalHash, beforeFileHash, markerId: R3_MARKER_ID }))}`;
  const afterBody = renderManagedBody(proposal, effectId, correctedReflectionId);
  const afterFile = replaceManagedBody(fileBody, afterBody);
  return {
    schemaVersion: "1",
    effectId,
    actionKind: "render_next_move_brief.v1",
    proposalId: proposal.proposalId,
    baseTwinRevision: proposal.baseTwinRevision,
    correctedReflectionId,
    targetPath: R3_TARGET_PATH,
    markerId: R3_MARKER_ID,
    beforeFileHash,
    beforeBlockHash: sha256(beforeBody),
    afterFileHash: sha256(afterFile),
    afterBlockHash: sha256(afterBody),
    idempotencyKey: `idem_${shortHash(canonicalJson({ effectId, afterFileHash: sha256(afterFile) }))}`,
  };
}

export function materializeExecution(
  fileBody: string,
  proposal: ActionIntentProposal,
  plan: EffectPlan,
): string {
  if (sha256(fileBody) !== plan.beforeFileHash || sha256(managedBody(fileBody)) !== plan.beforeBlockHash) {
    throw new Error("README.md no longer matches the approved effect precondition");
  }
  const result = replaceManagedBody(fileBody, renderManagedBody(proposal, plan.effectId, plan.correctedReflectionId));
  if (sha256(result) !== plan.afterFileHash || sha256(managedBody(result)) !== plan.afterBlockHash) {
    throw new Error("compiled effect no longer matches its approved hashes");
  }
  return result;
}

export function materializeRollback(fileBody: string, plan: EffectPlan): string {
  if (sha256(fileBody) !== plan.afterFileHash || sha256(managedBody(fileBody)) !== plan.afterBlockHash) {
    throw new Error("README.md no longer matches the rollback precondition");
  }
  const result = replaceManagedBody(fileBody, R3_PLACEHOLDER_BODY);
  if (sha256(result) !== plan.beforeFileHash || sha256(managedBody(result)) !== plan.beforeBlockHash) {
    throw new Error("rollback output no longer matches the original approved hashes");
  }
  return result;
}
