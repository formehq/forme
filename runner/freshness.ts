import { execFileSync } from "node:child_process";
import { hostname } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCard, checkEvent } from "../schema/validate.ts";
import { fingerprint } from "../schema/fingerprint.ts";
import { cardToMarkdown } from "./mirror.ts";
import { DEFAULT_OPTIONS } from "./card.ts";
import { localDate, type RunMetric } from "./metrics.ts";
import {
  commitExecution,
  createExecutionId,
  vaultRelativePath,
  type ExecutionReceipt,
} from "./execution.ts";
import type { Card, Hunk } from "./types.ts";

export type FreshnessKind = "updated" | "as-of" | "weekday";

export interface FreshnessFix {
  content: string;
  hunks: Hunk[];
  kinds: FreshnessKind[];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const WEEKDAY_PATTERN = WEEKDAYS.join("|");

function actualWeekday(isoDate: string): string | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null;
  return WEEKDAYS[date.getUTCDay()]!;
}

function fixWeekdayPairs(line: string): string {
  let out = line.replace(
    new RegExp(`\\b(${WEEKDAY_PATTERN})(,?\\s+)(\\d{4}-\\d{2}-\\d{2})\\b`, "g"),
    (whole, _weekday: string, gap: string, date: string) => {
      const actual = actualWeekday(date);
      return actual ? `${actual}${gap}${date}` : whole;
    },
  );
  out = out.replace(
    new RegExp(`\\b(\\d{4}-\\d{2}-\\d{2})(\\s*\\(\\s*)(${WEEKDAY_PATTERN})(\\s*\\))`, "g"),
    (whole, date: string, open: string, _weekday: string, close: string) => {
      const actual = actualWeekday(date);
      return actual ? `${date}${open}${actual}${close}` : whole;
    },
  );
  return out;
}

function fixUpdatedLine(line: string, today: string, now: Date): string {
  const match = line.match(
    /^(\s*updated\s*:\s*)(["']?)(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})))?(["']?)(\s*)$/i,
  );
  if (!match || match[2] !== match[5]) return line;
  const markerDate = match[4] ? new Date(`${match[3]}T${match[4]}`) : null;
  if (markerDate && !Number.isFinite(markerDate.getTime())) return line;
  const markerLocalDate = markerDate ? localDate(markerDate) : match[3];
  if (markerLocalDate === today) return line;
  const value = match[4] ? now.toISOString() : today;
  return `${match[1]}${match[2]}${value}${match[5]}${match[6]}`;
}

function fixAsOfLine(line: string, today: string): string {
  const match = line.match(
    /^(\s*(?:[-*]\s+)?(?:\*\*)?as of(?::)?(?:\*\*)?\s+)(["']?)(\d{4}-\d{2}-\d{2})(["']?)([.!]?\s*)$/i,
  );
  if (!match || match[2] !== match[4] || match[3] === today) return line;
  return `${match[1]}${match[2]}${today}${match[4]}${match[5]}`;
}

/** Pure detector/fixer. `now` is injected; this function never reads a clock or calls an LLM. */
export function detectTimestampFreshness(content: string, now: Date): FreshnessFix | null {
  const today = localDate(now);
  const lines = content.split("\n");
  const inFrontmatter = new Set<number>();
  if (lines[0]?.replace(/\r$/, "").trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]!.replace(/\r$/, "").trim() === "---") break;
      inFrontmatter.add(i);
    }
  }

  const hunks: Hunk[] = [];
  const kinds = new Set<FreshnessKind>();
  const nextLines = lines.map((raw, i) => {
    const cr = raw.endsWith("\r") ? "\r" : "";
    const before = cr ? raw.slice(0, -1) : raw;
    let after = before;
    if (inFrontmatter.has(i)) {
      const fixed = fixUpdatedLine(after, today, now);
      if (fixed !== after) kinds.add("updated");
      after = fixed;
    }
    const asOf = fixAsOfLine(after, today);
    if (asOf !== after) kinds.add("as-of");
    after = asOf;
    const weekday = fixWeekdayPairs(after);
    if (weekday !== after) kinds.add("weekday");
    after = weekday;
    if (after !== before) hunks.push({ locator: `L${i + 1}`, before, after });
    return after + cr;
  });
  return hunks.length ? { content: nextLines.join("\n"), hunks, kinds: [...kinds] } : null;
}

/** Replace only authorized freshness values, preserving every semantic date and all other text. */
export function normalizeTimestampFreshness(content: string): string {
  const lines = content.split("\n");
  const inFrontmatter = new Set<number>();
  if (lines[0]?.replace(/\r$/, "").trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]!.replace(/\r$/, "").trim() === "---") break;
      inFrontmatter.add(i);
    }
  }
  return lines.map((raw, i) => {
    const cr = raw.endsWith("\r") ? "\r" : "";
    let line = cr ? raw.slice(0, -1) : raw;
    if (inFrontmatter.has(i)) {
      line = line.replace(
        /^(\s*updated\s*:\s*)(["']?)(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})))?(["']?)(\s*)$/i,
        (whole, prefix: string, open: string, _date: string, time: string | undefined, close: string, suffix: string) =>
          open === close ? `${prefix}${open}${time ? "<timestamp>" : "<date>"}${close}${suffix}` : whole,
      );
    }
    line = line.replace(
      /^(\s*(?:[-*]\s+)?(?:\*\*)?as of(?::)?(?:\*\*)?\s+)(["']?)(\d{4}-\d{2}-\d{2})(["']?)([.!]?\s*)$/i,
      (whole, prefix: string, open: string, _date: string, close: string, suffix: string) =>
        open === close ? `${prefix}${open}<date>${close}${suffix}` : whole,
    );
    return fixWeekdayPairs(line) + cr;
  }).join("\n");
}

/** True only when the window delta contains no change outside the authorized class. */
export function isFreshnessOnlyDelta(vault: string, baseRef: string | null, file: string, current: string): boolean {
  if (!baseRef) return false;
  try {
    const before = execFileSync("git", ["-c", "core.quotePath=false", "-C", vault, "show", `${baseRef}:${file}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return normalizeTimestampFreshness(before) === normalizeTimestampFreshness(current);
  } catch {
    return false;
  }
}

export interface FreshnessExecutionInput {
  vault: string;
  outDir: string;
  file: string;
  fix: FreshnessFix;
  now: Date;
  runId: string;
}

export interface FreshnessExecutionResult extends ExecutionReceipt {
  card: Card;
}

function appendLine(path: string, row: unknown): string {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  return existing + JSON.stringify(row) + "\n";
}

export function buildFreshnessCard(input: FreshnessExecutionInput): Card {
  const at = input.now.toISOString();
  const diff = { file: input.file, hunks: input.fix.hunks };
  const fp = fingerprint({ category: "timestamp-freshness", diff });
  const count = input.fix.hunks.length;
  return {
    schemaVersion: "0",
    id: `card_${fp.slice(0, 16)}`,
    origin: { agent: "forme-clock", runId: input.runId, at, host: hostname() },
    from: "forme://local/freshness",
    role: "proposal",
    category: "timestamp-freshness",
    title: count === 1 ? "Forme corrected a stale date marker" : `Forme corrected ${count} stale date markers`,
    summary: "The correction was fully determined by the machine clock or calendar.",
    whyNow: `The machine date is ${localDate(input.now)} and the explicit marker disagreed with it.`,
    recommendation: { choice: "accept", reason: "This freshness-only correction is authorized and reversible." },
    onAccept: "The mechanical date marker is current.",
    evidence: input.fix.hunks.map((h) => ({
      path: input.file,
      locator: h.locator,
      quote: h.before,
      note: "Machine-verifiable date mismatch.",
    })),
    diff,
    options: DEFAULT_OPTIONS.map((o) => ({ ...o })),
    fingerprint: fp,
    createdAt: at,
    stakes: "reversible-ledger",
  };
}

/** Execute one authorized freshness fix with its complete local audit trail. */
export function executeTimestampFreshness(input: FreshnessExecutionInput): FreshnessExecutionResult {
  const card = buildFreshnessCard(input);
  const cardValidation = checkCard(card as unknown as Record<string, unknown>);
  if (!cardValidation.valid) throw new Error(`Authorized card failed schema validation: ${cardValidation.errors.join("; ")}`);

  const executionId = createExecutionId();
  const event = {
    v: "0",
    ts: input.now.toISOString(),
    type: "decision",
    cardId: card.id,
    fingerprint: card.fingerprint,
    choice: "accept",
    actor: "agent_authorized",
    executionId,
  } as const;
  const eventValidation = checkEvent(event as unknown as Record<string, unknown>);
  if (!eventValidation.valid) throw new Error(`Authorized event failed schema validation: ${eventValidation.errors.join("; ")}`);

  const outRel = vaultRelativePath(input.vault, input.outDir);
  const decisionsPath = join(input.outDir, "decisions.jsonl");
  const metricsPath = join(input.outDir, "run-metrics.jsonl");
  const metric: RunMetric = {
    v: "0",
    date: localDate(input.now),
    runId: input.runId,
    proposed: 0,
    suppressed: 0,
    presented: 0,
    rejected: 0,
    dup: 0,
    authorized: 1,
    executionId,
  };
  const receipt = commitExecution(input.vault, {
    executionId,
    message: `forme: authorized freshness ${card.id} - ${card.title}`,
    lockRoot: input.outDir,
    updates: [
      { path: input.file, content: input.fix.content, requireClean: true },
      { path: `${outRel}/cards/${card.id}.json`, content: JSON.stringify(card, null, 2) + "\n" },
      { path: `${outRel}/cards/${card.id}.md`, content: cardToMarkdown(card) },
      { path: `${outRel}/decisions.jsonl`, content: () => appendLine(decisionsPath, event) },
      { path: `${outRel}/run-metrics.jsonl`, content: () => appendLine(metricsPath, metric) },
    ],
  });
  return { ...receipt, card };
}
