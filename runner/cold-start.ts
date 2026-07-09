import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function hasContent(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    return readFileSync(path, "utf8").trim().length > 0;
  } catch {
    return false;
  }
}

/** Operational metrics alone do not make a vault warm; user-facing/learned truth does. */
export function isColdStart(outDir: string): boolean {
  const cardsDir = join(outDir, "cards");
  const hasCards = existsSync(cardsDir) && readdirSync(cardsDir).some((f) => f.endsWith(".json"));
  return (
    !hasCards &&
    !hasContent(join(outDir, "decisions.jsonl")) &&
    !hasContent(join(outDir, "Taste Rules.md"))
  );
}

export function coldStartPolicy(
  requestedMaxCards: number,
  requestedSlowLayer: number,
  cold: boolean,
): { maxCards: number; slowLayer: number } {
  if (!cold) return { maxCards: requestedMaxCards, slowLayer: requestedSlowLayer };
  return {
    maxCards: Math.min(Math.max(0, requestedMaxCards), 2),
    slowLayer: 0,
  };
}
