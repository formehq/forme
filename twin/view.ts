import type { ContinuityEvent, TwinClaim, TwinState, WorkspaceRegistry } from "./types.ts";

function firstStatement(claims: TwinClaim[], fallback: string): string {
  return claims[0]?.statement ?? fallback;
}

function list(items: string[], empty: string): string {
  return items.length === 0 ? `- ${empty}` : items.map((item) => `- ${item}`).join("\n");
}

export function renderContinuityView(
  registry: WorkspaceRegistry,
  state: TwinState,
  event: ContinuityEvent | null,
): string {
  const changes = event?.changes ?? { added: [], modified: [], deleted: [] };
  const activeIntent = firstStatement(state.activeIntent, "No active intent has been confirmed yet.");
  const currentState = firstStatement(state.currentState, "No current-state claim is available.");
  const nextMove = state.activeIntent.length > 0
    ? `Continue the confirmed intent: ${activeIntent}`
    : "Confirm the project's active intent before asking an agent to interpret or act.";
  const changeCount = changes.added.length + changes.modified.length + changes.deleted.length;

  return [
    `# ${registry.name} — Living Project Twin`,
    "",
    `Revision: ${state.revision} · Updated: ${state.updatedAt} · Source: ${registry.source.kind}`,
    "",
    "## Now",
    "",
    `- Identity: ${firstStatement(state.identity, registry.name)}`,
    `- Active intent: ${activeIntent}`,
    `- Current state: ${currentState}`,
    "",
    "## What Changed",
    "",
    changeCount === 0 ? "No source change has been recorded since the latest Twin revision." : `${changeCount} source change(s) produced revision ${state.revision}.`,
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
    "",
    "## Next Move",
    "",
    `- ${nextMove}`,
    "",
    "## Evidence Boundary",
    "",
    "This view is reconstructed from Forme-owned state, snapshots, events, and source metadata. Source bodies are not copied into Twin state, and nothing is approved for external projection by default.",
    "",
  ].join("\n");
}
