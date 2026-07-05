import { createHash } from "node:crypto";

/**
 * Deterministic dedup identity for a decision card.
 *
 * fingerprint = sha256( category \0 diff.file \0 diffHash )
 * diffHash    = sha256 over the card's hunks, canonically ordered so the same
 *               set of changes always hashes the same regardless of the order
 *               the agent happened to emit them in.
 *
 * This is the whole basis of hard constraint #6 (重复率 → 0): identity comes
 * from deterministic engineering, never from the LLM's self-restraint. Computed
 * by Forme code at write time, not by the agent.
 */

export interface Hunk {
  locator?: string;
  before: string;
  after: string;
}

export interface Diff {
  file: string;
  hunks: Hunk[];
}

const NUL = "\u0000";

function hunkKey(h: Hunk): string {
  return (h.locator ?? "") + NUL + h.before + NUL + h.after;
}

export function diffHash(diff: Diff): string {
  const parts = diff.hunks.map(hunkKey).sort();
  const h = createHash("sha256");
  for (const p of parts) h.update(p + NUL);
  return h.digest("hex");
}

export function fingerprint(input: { category: string; diff: Diff }): string {
  return createHash("sha256")
    .update(input.category + NUL + input.diff.file + NUL + diffHash(input.diff))
    .digest("hex");
}
