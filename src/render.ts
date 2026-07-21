import { markdownText, renderManagedBody } from "./action.ts";
import type { ActionProposalRecord, ReflectionRecord, SourceChanges, TwinRevision } from "./types.ts";

function list(items: string[], empty: string): string {
  return items.length === 0 ? `- ${empty}` : items.map((item) => `- ${item}`).join("\n");
}

function changeSection(changes: SourceChanges): string[] {
  const count = changes.added.length + changes.modified.length + changes.deleted.length;
  return [
    count === 0 ? "No source-file change was recorded in this revision." : `${count} source-file change(s) produced this revision.`,
    "",
    "### Added",
    "",
    list(changes.added, "None"),
    "",
    "### Modified",
    "",
    list(changes.modified, "None"),
    "",
    "### Deleted",
    "",
    list(changes.deleted, "None"),
  ];
}

function reflectionSection(reflections: ReflectionRecord[]): string[] {
  const active = reflections.filter((item) => item.status === "inferred" || item.status === "corrected");
  if (active.length === 0) return ["No active Reflection has been admitted."];
  return active.flatMap((reflection, index) => [
    ...(index === 0 ? [] : [""]),
    `### ${reflection.reflectionId}`,
    "",
    `- Status: ${reflection.status}`,
    `- Authored by: ${reflection.authoredBy}`,
    `- Relation: ${reflection.relationType}`,
    `- Claim: ${reflection.claim}`,
    ...(reflection.uncertainty ? [
      `- Uncertainty: ${reflection.uncertainty.level} — ${reflection.uncertainty.rationale}`,
    ] : []),
    ...(reflection.alternativeExplanation ? [
      `- Alternative: ${reflection.alternativeExplanation}`,
    ] : []),
    `- Implication: ${reflection.implication}`,
    ...(reflection.ownerQuestion ? [`- Owner question: ${reflection.ownerQuestion}`] : []),
    "",
    "Evidence:",
    ...reflection.evidence.map((item) => (
      `- ${item.evidenceId}: ${item.commit.slice(0, 12)} · ${item.relativePath}:${item.lineStart}-${item.lineEnd} · blob ${item.blobHash.slice(0, 12)}`
    )),
  ]);
}

function actionSection(proposals: ActionProposalRecord[], reflections: ReflectionRecord[]): string[] {
  if (proposals.length === 0) return ["No R3 action proposal has been admitted."];
  return proposals.flatMap((record, index) => {
    const prefix = index === 0 ? [] : [""];
    if (record.proposal.schemaVersion === "1") {
      if (record.effectPlan === null || record.effectPlanHash === null) {
        throw new Error("V1 action proposal is missing its effect plan");
      }
      return [
        ...prefix,
        `### ${record.proposal.proposalId}`,
        "",
        `- Status: ${record.status}`,
        `- Action kind: ${record.proposal.actionKind}`,
        `- Target: ${record.effectPlan.targetPath} · marker ${record.effectPlan.markerId}`,
        `- Proposal hash: ${record.proposalHash}`,
        `- Effect-plan hash: ${record.effectPlanHash}`,
        `- Before file hash: ${record.effectPlan.beforeFileHash}`,
        `- After file hash: ${record.effectPlan.afterFileHash}`,
        `- Why this action: ${record.proposal.rationale}`,
        `- Approval: ${record.approvalId ?? "Not approved"}`,
        `- Effect receipts: ${record.effectReceiptIds.length === 0 ? "None" : record.effectReceiptIds.join(", ")}`,
        "",
        "Exact managed-block preview:",
        "",
        "```markdown",
        renderManagedBody(record.proposal, record.effectPlan.effectId, record.correctedReflectionId).trim(),
        "```",
      ];
    }

    const proposal = record.proposal;
    const correctedReflection = reflections.find((item) => item.reflectionId === record.correctedReflectionId);
    const topAnswer = proposal.mode === "recommend"
      ? [`**Recommendation:** ${markdownText(proposal.recommendation ?? "")}`]
      : [`**Owner input needed:** ${markdownText(proposal.blockingQuestion ?? "")}`];
    const decisionItems = proposal.decisionItems.flatMap((item, itemIndex) => [
      `${itemIndex + 1}. **Judgment:** ${markdownText(item.judgment)}`,
      `   - Recommended choice: ${markdownText(item.recommendedChoice)}`,
      `   - Reason: ${markdownText(item.reason)}`,
      `   - Alternatives: ${item.alternatives.map(markdownText).join(" / ")}`,
    ]);
    const evidence = correctedReflection?.evidence.map((item) => (
      `- ${item.evidenceId}: ${item.commit.slice(0, 12)} · ${item.relativePath}:${item.lineStart}-${item.lineEnd} · blob ${item.blobHash.slice(0, 12)}`
    )) ?? ["- Corrected Reflection evidence is unavailable"];
    const effectDetails = record.effectPlan === null || record.effectPlanHash === null
      ? [
        "- Downstream consequence: no effect plan was compiled; this question cannot be approved or executed.",
      ]
      : [
        `- Downstream consequence: exact approval would authorize only ${record.effectPlan.targetPath} · marker ${record.effectPlan.markerId}.`,
        `- Effect-plan hash: ${record.effectPlanHash}`,
        `- Before file hash: ${record.effectPlan.beforeFileHash}`,
        `- After file hash: ${record.effectPlan.afterFileHash}`,
        "",
        "Exact managed-block preview:",
        "",
        "```markdown",
        renderManagedBody(proposal, record.effectPlan.effectId, record.correctedReflectionId).trim(),
        "```",
      ];
    return [
      ...prefix,
      `### ${proposal.proposalId} · Owner Decision Brief`,
      "",
      "#### Layer 1 — 30-second answer",
      "",
      `**${markdownText(proposal.plainLanguageSummary)}**`,
      "",
      ...topAnswer,
      "",
      `- Confidence: ${proposal.confidence.level}`,
      `- Why now: ${markdownText(proposal.whyNow)}`,
      `- Status: ${record.status}`,
      "",
      "<details>",
      "<summary>Layer 2 — editable judgment items</summary>",
      "",
      ...decisionItems,
      "",
      `- Success check: ${markdownText(proposal.successCheck)}`,
      `- Owner challenge: ${markdownText(proposal.ownerChallenge)}`,
      "",
      "</details>",
      "",
      "<details>",
      "<summary>Layer 3 — evidence, uncertainty, provenance, and consequences</summary>",
      "",
      `- Confidence basis: ${markdownText(proposal.confidence.rationale)}`,
      `- Corrected Reflection: ${record.correctedReflectionId}`,
      `- Owner correction: ${record.correctionId}`,
      "",
      "Evidence carried by that corrected Reflection:",
      ...evidence,
      "",
      `- Proposal hash: ${record.proposalHash}`,
      `- Context packet hash: ${record.packetHash}`,
      `- Runtime receipt: ${record.runtimeReceiptId}`,
      `- Approval: ${record.approvalId ?? "Not approved"}`,
      `- Effect receipts: ${record.effectReceiptIds.length === 0 ? "None" : record.effectReceiptIds.join(", ")}`,
      ...effectDetails,
      "",
      "</details>",
    ];
  });
}

export function renderRestartView(revision: TwinRevision): string {
  return [
    "# Living Project Twin — Restart View",
    "",
    `Workspace: ${revision.workspaceId} · Revision: ${revision.revision} · Observed: ${revision.observedAt}`,
    "",
    "## Now",
    "",
    `- Active intent: ${revision.ownerFrame.activeIntent}`,
    `- Tracked files: ${revision.evidence.length}`,
    "",
    "## What Changed",
    "",
    ...changeSection(revision.changes),
    "",
    "## Unresolved",
    "",
    list(revision.ownerFrame.unresolved, "None confirmed by the owner"),
    "",
    "## Next Move",
    "",
    `- ${revision.ownerFrame.nextMove}`,
    ...(revision.schemaVersion !== "1" ? [
      "",
      "## Reflection",
      "",
      ...reflectionSection(revision.cognition.reflections),
      "",
      "## Owner Corrections and Invalidation",
      "",
      `- Corrections recorded: ${revision.cognition.corrections.length}`,
      `- Dependent outputs invalidated: ${revision.cognition.invalidations.length}`,
      ...revision.cognition.corrections.map((item) => (
        `- ${item.correctionId}: ${item.targetReflectionId} → ${item.correctedReflectionId}`
      )),
    ] : []),
    ...(revision.schemaVersion === "3" ? [
      "",
      "## Action Review",
      "",
      ...actionSection(revision.agency.proposals, revision.cognition.reflections),
      "",
      "## Agency Receipts",
      "",
      `- Owner approvals: ${revision.agency.approvals.length}`,
      `- Effect receipts: ${revision.agency.effectReceipts.length}`,
      `- Action invalidations: ${revision.agency.invalidations.length}`,
      ...revision.agency.effectReceipts.map((item) => (
        `- ${item.receiptId}: ${item.operation} · ${item.status} · observed ${item.observedHash}`
      )),
    ] : []),
    "",
    "## Evidence Boundary",
    "",
    revision.schemaVersion === "1"
      ? "This view was rendered only from the committed Twin revision. Forme stored relative paths, hashes, sizes, and timestamps—not source bodies or absolute paths. R1 used no model runtime."
      : revision.schemaVersion === "2"
        ? "This view was rendered only from the committed Twin revision. R2 persisted evidence coordinates, inferred or corrected meaning, and minimal runtime receipts—not historical source bodies, absolute paths, Codex transcripts, or session state."
        : "This view was rendered only from the committed Twin revision. R3 additionally persisted bounded action fields, approval/effect hashes, and body-free receipts—not README source bodies, Codex transcripts, shell commands, or Git authority.",
    "",
    "## Recovery",
    "",
    `Revision ${revision.revision} (schema v${revision.schemaVersion}) is the latest validated state selected by HEAD. This Markdown file is derived and can be reconstructed.`,
    ...(revision.warnings.length === 0 ? [] : [
      "",
      "## Observation Warnings",
      "",
      list(revision.warnings, "None"),
    ]),
    "",
  ].join("\n");
}
