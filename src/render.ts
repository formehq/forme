import { renderManagedBody } from "./action.ts";
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

function actionSection(proposals: ActionProposalRecord[]): string[] {
  if (proposals.length === 0) return ["No R3 action proposal has been admitted."];
  return proposals.flatMap((record, index) => [
    ...(index === 0 ? [] : [""]),
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
  ]);
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
      ...actionSection(revision.agency.proposals),
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
