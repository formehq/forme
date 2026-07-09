import { readFileSync, readdirSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { checkEvent } from "../schema/validate.ts";
import { latestStateDiffDate } from "../runner/state-diff.ts";
import { effectiveStakes } from "../runner/legibility.ts";
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
  type: "presented" | "decision" | "correction" | "question";
  cardId: string;
  fingerprint: string;
  choice?: "accept" | "park" | "reject";
  latencyMs?: number;
  actor?: "owner" | "agent_shadow" | "agent_authorized";
  executed?: string;
  correction?: { hunks: Hunk[]; note?: string };
  question?: string; // #21:用户对卡发的问题(卡进入待补 context 态)
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
      if (c && c.id && c.fingerprint && c.diff) {
        if (!c.stakes) c.stakes = effectiveStakes(c); // 旧卡按 category 派生(#21)
        cards.push(c);
      }
    } catch {
      /* 宽容 */
    }
  }
  return cards.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** 每指纹最新未终结的 question ts(有 decision 的指纹不算——已决不回场)。 */
function openQuestionTs(events: DecisionEvent[]): Map<string, string> {
  const latest = new Map<string, string>();
  const decided = new Set<string>();
  for (const e of events) {
    if (!e.fingerprint) continue;
    if (e.type === "decision") decided.add(e.fingerprint);
    if (e.type === "question") latest.set(e.fingerprint, e.ts);
  }
  for (const fp of decided) latest.delete(fp);
  return latest;
}

/** 卡是否在「待补 context」态(#21):有未答问题,且卡面尚未因之重写。 */
function isAwaitingContext(card: Card, openQ: Map<string, string>): boolean {
  const qts = openQ.get(card.fingerprint);
  if (!qts) return false;
  const revised = card.revisedAt ? Date.parse(card.revisedAt) : NaN;
  return !(Number.isFinite(revised) && revised >= Date.parse(qts));
}

export interface QueueState {
  /** 可决队列:没有 decision 事件、也不在待补 context 态的卡。 */
  pending: Card[];
  /** 待补 context(#21):发过问、等下一轮 run 带解释回来的卡。 */
  awaiting: Card[];
}

/** 队列投影(cardId 与 fingerprint 双保险)。 */
export function queueState(outDir: string, events: DecisionEvent[]): QueueState {
  const decidedIds = new Set<string>();
  const decidedFps = new Set<string>();
  for (const e of events) {
    if (e.type !== "decision") continue;
    if (e.cardId) decidedIds.add(e.cardId);
    if (e.fingerprint) decidedFps.add(e.fingerprint);
  }
  const openQ = openQuestionTs(events);
  const undecided = loadCards(outDir).filter(
    (c) => !decidedIds.has(c.id) && !decidedFps.has(c.fingerprint),
  );
  return {
    pending: undecided.filter((c) => !isAwaitingContext(c, openQ)),
    awaiting: undecided.filter((c) => isAwaitingContext(c, openQ)),
  };
}

/** 待决队列(兼容旧签名;新代码用 queueState)。 */
export function pendingCards(outDir: string, events: DecisionEvent[]): Card[] {
  return queueState(outDir, events).pending;
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
  awaitingContext: number; // #21:发过问、等下一轮带解释回来的卡数
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

  const queue = queueState(outDir, events);
  return {
    sinceTs,
    awayHours: sinceMs ? (now.getTime() - sinceMs) / 3_600_000 : null,
    commits,
    mdTouched: mdSet.size,
    runs,
    pending: {
      count: queue.pending.length,
      estSeconds: queue.pending.reduce((s, c) => s + (c.estSeconds ?? 30), 0),
    },
    awaitingContext: queue.awaiting.length,
    decidedTotal,
  };
}

/* ---------- Metrics(#19):数据早已在盘,这里只是投影 ---------- */

export interface MetricsData {
  decided: { total: number; accept: number; park: number; reject: number };
  questions: number; // question 事件总数(#21:legibility 度量)
  latency: {
    count: number; // 有现场计时真值的落子数(backfilled 不算)
    medianMs: number | null;
    recent: Array<{ ts: string; latencyMs: number; choice: string }>; // 最近 20 次
  };
  runs: Array<{
    date: string;
    proposed: number;
    presented: number;
    suppressed: number;
    rejected: number;
    dup: number;
    illegible?: number;
    refaced?: number;
  }>;
  totals: { proposed: number; suppressedPlusDup: number };
}

/** Metrics 投影:时延来自 decisions.jsonl 真值,重复率曲线来自 run-metrics.jsonl。 */
export function metricsData(outDir: string): MetricsData {
  const decided = { total: 0, accept: 0, park: 0, reject: 0 };
  let questions = 0;
  const timed: Array<{ ts: string; latencyMs: number; choice: string }> = [];
  for (const e of readEvents(join(outDir, "decisions.jsonl"))) {
    if (e.type === "question") questions++;
    if (e.type !== "decision") continue;
    decided.total++;
    if (e.choice === "accept") decided.accept++;
    else if (e.choice === "park") decided.park++;
    else if (e.choice === "reject") decided.reject++;
    if (typeof e.latencyMs === "number" && !e.backfilled) {
      timed.push({ ts: e.ts, latencyMs: e.latencyMs, choice: e.choice ?? "" });
    }
  }
  const sorted = timed.map((t) => t.latencyMs).sort((a, b) => a - b);
  const medianMs = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]!
      : Math.round((sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2)
    : null;

  const runs: MetricsData["runs"] = [];
  const totals = { proposed: 0, suppressedPlusDup: 0 };
  const metricsPath = join(outDir, "run-metrics.jsonl");
  if (existsSync(metricsPath)) {
    for (const line of readFileSync(metricsPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line) as MetricsData["runs"][number] & { backfilled?: boolean };
        if (!m.date) continue;
        const row = {
          date: m.date,
          proposed: m.proposed ?? 0,
          presented: m.presented ?? 0,
          suppressed: m.suppressed ?? 0,
          rejected: m.rejected ?? 0,
          dup: m.dup ?? 0,
          ...(m.illegible ? { illegible: m.illegible } : {}),
          ...(m.refaced ? { refaced: m.refaced } : {}),
        };
        runs.push(row);
        totals.proposed += row.proposed;
        totals.suppressedPlusDup += row.suppressed + row.dup;
      } catch {
        /* 宽容 */
      }
    }
  }
  return {
    decided,
    questions,
    latency: { count: timed.length, medianMs, recent: timed.slice(-20) },
    runs,
    totals,
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
