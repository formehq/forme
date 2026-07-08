import { readFileSync, readdirSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { checkEvent } from "../schema/validate.ts";
import { latestStateDiffDate } from "../runner/state-diff.ts";
import type { Card, Hunk } from "../runner/types.ts";

/**
 * Console 的数据层(issue #15)。硬约束 #4:UI 零私有状态——这里没有任何
 * 自己的存储,全部是 vault(98_Forme/ + git)的按需投影;唯一的写入是往
 * decisions.jsonl 追加事件,且**每条事件先过 Forme 自己的 AJV 门**再落盘
 * (这条写路径归我们所有,不宽容;宽容解析只用于读别人写的历史行)。
 */

export interface DecisionEvent {
  v: "0";
  ts: string;
  type: "presented" | "decision" | "correction";
  cardId: string;
  fingerprint: string;
  choice?: "accept" | "park" | "reject";
  latencyMs?: number;
  actor?: "owner" | "agent_shadow" | "agent_authorized";
  executed?: string;
  correction?: { hunks: Hunk[]; note?: string };
  backfilled?: boolean;
}

/** 读事件日志(宽容:读不动的行跳过——历史里有 vault 侧手写的非标行)。 */
export function readEvents(jsonlPath: string): DecisionEvent[] {
  if (!existsSync(jsonlPath)) return [];
  const events: DecisionEvent[] = [];
  for (const line of readFileSync(jsonlPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as DecisionEvent;
      if (e && typeof e === "object" && typeof e.type === "string") events.push(e);
    } catch {
      /* 宽容 */
    }
  }
  return events;
}

/** 追加一条事件——先过自家 AJV,不合法即抛,绝不落盘。 */
export function appendEvent(jsonlPath: string, event: DecisionEvent): void {
  const r = checkEvent(event as unknown as Record<string, unknown>);
  if (!r.valid) throw new Error(`事件没过 schema 门:${r.errors.join("; ")}`);
  mkdirSync(dirname(jsonlPath), { recursive: true });
  appendFileSync(jsonlPath, JSON.stringify(event) + "\n");
}

/** cards/ 里的全部卡(宽容读;按 createdAt 升序 = 先来先决)。 */
export function loadCards(outDir: string): Card[] {
  const dir = join(outDir, "cards");
  if (!existsSync(dir)) return [];
  const cards: Card[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const c = JSON.parse(readFileSync(join(dir, f), "utf8")) as Card;
      if (c && c.id && c.fingerprint && c.diff) cards.push(c);
    } catch {
      /* 宽容 */
    }
  }
  return cards.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** 待决队列 = 没有 decision 事件的卡(cardId 与 fingerprint 双保险)。 */
export function pendingCards(outDir: string, events: DecisionEvent[]): Card[] {
  const decidedIds = new Set<string>();
  const decidedFps = new Set<string>();
  for (const e of events) {
    if (e.type !== "decision") continue;
    if (e.cardId) decidedIds.add(e.cardId);
    if (e.fingerprint) decidedFps.add(e.fingerprint);
  }
  return loadCards(outDir).filter((c) => !decidedIds.has(c.id) && !decidedFps.has(c.fingerprint));
}

/** 该卡最近一次 presented 的时刻——静默计时的起点(没有就是 null)。 */
export function lastPresentedTs(events: DecisionEvent[], cardId: string): string | null {
  let ts: string | null = null;
  for (const e of events) if (e.type === "presented" && e.cardId === cardId) ts = e.ts;
  return ts;
}

export interface CatchUp {
  sinceTs: string | null; // 上次落子/看卡的时刻(事件日志里最新 ts);null = 第一次来
  awayHours: number | null;
  commits: number; // 自那以来 vault 的 commit 数
  mdTouched: number; // 其中动过的知识层 md 数(排除 98_Forme/)
  runs: { runs: number; proposed: number; suppressed: number };
  pending: { count: number; estSeconds: number };
  decidedTotal: number;
}

/** catch-up 卡(交互稿屏 1)的数据包——全部从 vault 推导,可核查。 */
export function catchUpData(vault: string, outDir: string, now: Date): CatchUp {
  const events = readEvents(join(outDir, "decisions.jsonl"));
  let sinceMs = 0;
  let decidedTotal = 0;
  for (const e of events) {
    const t = Date.parse(e.ts);
    if (Number.isFinite(t) && t > sinceMs) sinceMs = t;
    if (e.type === "decision") decidedTotal++;
  }
  const sinceTs = sinceMs ? new Date(sinceMs).toISOString() : null;

  let commits = 0;
  const mdSet = new Set<string>();
  if (sinceTs) {
    const log = execFileSync(
      "git",
      ["-C", vault, "log", `--since=${sinceTs}`, "--name-only", "--format=@%h"],
      { encoding: "utf8" },
    );
    for (const raw of log.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("@")) commits++;
      else if (line.endsWith(".md") && !line.startsWith("98_Forme/")) mdSet.add(line);
    }
  }

  const runs = { runs: 0, proposed: 0, suppressed: 0 };
  const metricsPath = join(outDir, "run-metrics.jsonl");
  const sinceDate = sinceTs ? sinceTs.slice(0, 10) : "";
  if (existsSync(metricsPath)) {
    for (const line of readFileSync(metricsPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line) as { date?: string; proposed?: number; suppressed?: number };
        if (!m.date || m.date < sinceDate) continue;
        runs.runs++;
        runs.proposed += m.proposed ?? 0;
        runs.suppressed += m.suppressed ?? 0;
      } catch {
        /* 宽容 */
      }
    }
  }

  const queue = pendingCards(outDir, events);
  return {
    sinceTs,
    awayHours: sinceMs ? (now.getTime() - sinceMs) / 3_600_000 : null,
    commits,
    mdTouched: mdSet.size,
    runs,
    pending: {
      count: queue.length,
      estSeconds: queue.reduce((s, c) => s + (c.estSeconds ?? 30), 0),
    },
    decidedTotal,
  };
}

/** 最新一张 State Diff(原文 markdown;console 只是它的投影)。 */
export function latestStateDiff(outDir: string): { date: string; markdown: string } | null {
  const date = latestStateDiffDate(outDir);
  if (!date) return null;
  try {
    return { date, markdown: readFileSync(join(outDir, `state-diff-${date}.md`), "utf8") };
  } catch {
    return null;
  }
}
