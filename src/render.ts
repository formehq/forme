import type { SourceChanges, TwinRevision } from "./types.ts";

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
    "",
    "## Evidence Boundary",
    "",
    "This view was rendered only from the committed Twin revision. Forme stored relative paths, hashes, sizes, and timestamps—not source bodies or absolute paths. R1 used no model runtime.",
    "",
    "## Recovery",
    "",
    `Revision ${revision.revision} is the latest validated state selected by HEAD. This Markdown file is derived and can be reconstructed.`,
    ...(revision.warnings.length === 0 ? [] : [
      "",
      "## Observation Warnings",
      "",
      list(revision.warnings, "None"),
    ]),
    "",
  ].join("\n");
}
