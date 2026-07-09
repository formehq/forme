import { hostname } from "node:os";
import { checkCard, type ValidationResult } from "../schema/validate.ts";
import { fingerprint } from "../schema/fingerprint.ts";
import { effectiveStakes } from "./legibility.ts";
import type { AgentCard, Card, Evidence, Hunk, Option, Origin, Recommendation } from "./types.ts";

/**
 * Deterministic assembly: turn the agent's loose read-only JSON into a full,
 * validated card. Forme code owns everything the agent must not: id, envelope
 * (origin/from/role), the default a/p/r options, the dedup fingerprint, and the
 * final AJV gate. This is the heart of hard constraint #7.
 */

const OPTIONS: Option[] = [
  { id: "accept", label: "接受", hotkey: "a" },
  { id: "park", label: "搁置", hotkey: "p" },
  { id: "reject", label: "拒绝", hotkey: "r" },
];

export function clean<T extends Record<string, unknown>>(o: T): T {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) r[k] = v;
  return r as T;
}

export interface AssembleCtx {
  runId: string;
  at: string;
  model?: string;
  now?: string;
}

export interface Assembled {
  card: Card;
  serializable: Record<string, unknown>;
  validation: ValidationResult;
}

export function assembleCard(ac: AgentCard, ctx: AssembleCtx): Assembled {
  const evidence: Evidence[] = ac.evidence.map((e) =>
    clean({ path: e.path, locator: e.locator ?? undefined, quote: e.quote ?? undefined, note: e.note ?? undefined }),
  );
  const hunks: Hunk[] = ac.diff.hunks.map((h) =>
    clean({ locator: h.locator ?? undefined, before: h.before, after: h.after }),
  );
  const diff = { file: ac.diff.file, hunks };
  const fp = fingerprint({ category: ac.category, diff });
  const origin: Origin = clean({
    agent: "codex",
    model: ctx.model ?? undefined,
    runId: ctx.runId,
    at: ctx.at,
    host: hostname(),
  });

  // recommendation 消毒:choice 不在枚举或缺理由 → 整体丢弃(可选装饰,不拖垮整卡)
  const recommendation: Recommendation | undefined =
    ac.recommendationChoice && ac.recommendationReason &&
    (["accept", "park", "reject"] as const).includes(ac.recommendationChoice as Recommendation["choice"])
      ? { choice: ac.recommendationChoice as Recommendation["choice"], reason: ac.recommendationReason }
      : undefined;

  const card: Card = {
    schemaVersion: "0",
    id: `card_${fp.slice(0, 16)}`,
    origin,
    from: "forme://local/runner",
    role: "proposal",
    category: ac.category,
    title: ac.title,
    summary: ac.summary ?? undefined,
    whyNow: ac.whyNow ?? undefined,
    recommendation,
    onAccept: ac.onAccept ?? undefined,
    evidence,
    diff,
    options: OPTIONS.map((o) => ({ ...o })),
    fingerprint: fp,
    estSeconds: ac.estSeconds ?? undefined,
    createdAt: ctx.now ?? new Date().toISOString(),
    // stakes 消毒(#21):申报合法即用,否则按 category 派生——新卡永远带值
    stakes: effectiveStakes({ category: ac.category, stakes: ac.stakes }),
  };
  const serializable = clean(card as unknown as Record<string, unknown>);
  return { card, serializable, validation: checkCard(serializable) };
}
