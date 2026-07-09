import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { clean, DEFAULT_OPTIONS } from "./card.ts";
import type { Card } from "./types.ts";

/**
 * 卡面重写(reface,issue #21)。两个入口,同一条管道:
 *
 * 1. **世界层闸打回**:主扫描里卡面命中账本语域 → 同轮给一次重写机会,
 *    仍不过即弃(下轮在改进后的 prompt 下重提)。
 * 2. **question 通道**:用户在 console 对卡发问(park 的子类,question
 *    事件进 jsonl)→ 卡离开可决队列(待补 context)→ 下一轮 run 带着
 *    世界层解释重写卡面并直接回答问题 → 卡回到队列(同指纹,不算重复)。
 *
 * 不做 chat:有界、异步——一问一答一次往返,答案落在卡面上(vault 镜像
 * 自含,硬约束 #4)。重写只动人读解释与 evidence notes;
 * **id、指纹、diff、evidence quote/path 永不变**——身份与手术属于确定性代码。
 */

export interface RefaceFace {
  title: string;
  summary: string | null;
  whyNow: string | null;
  recommendationReason: string | null;
  onAccept: string | null;
  evidenceNotes: Array<string | null>;
  answer: string | null; // question 通道:对用户问题的一句直接回答
}

export type RefaceCause =
  | { kind: "gate"; hit: string }
  | { kind: "question"; question: string };

/** codex --output-schema:与 agent-schema 同姿态(OpenAI strict,故意宽松)。 */
export function refaceOutputSchema(): unknown {
  const nullableString = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "whyNow", "recommendationReason", "onAccept", "evidenceNotes", "answer"],
    properties: {
      title: { type: "string" },
      summary: nullableString,
      whyNow: nullableString,
      recommendationReason: nullableString,
      onAccept: nullableString,
      evidenceNotes: { type: "array", items: nullableString },
      answer: nullableString,
    },
  };
}

export function buildRefacePrompt(card: Card, cause: RefaceCause): string {
  const L: string[] = [
    "You are Forme's card-face rewriter. The card's identity, evidence quotes, and diff are correct, but its product-facing explanation is not. Read the referenced files only to verify context, then return a rewritten face as JSON.",
    "",
    "Rules (world on the face, ledger below):",
    "- Write every returned product-facing field in English, even when the original card or vault evidence is Chinese or mixed-language.",
    "- title, summary, and whyNow must describe the user's world: what is unresolved, what it blocks, and which commitment or date makes it matter. Do not use list-surgery or implementation language.",
    "- recommendationReason must state a clear English position without repeating the Accept/Park/Reject label. onAccept must say in plain English what accepting changes without repeating file paths or rollback mechanics.",
    "- evidenceNotes must contain one English note per evidence item, in the same order. Do not alter paths, locators, quotes, diff hunks, target, id, or fingerprint.",
    "",
  ];
  if (cause.kind === "question") {
    L.push(
      "The user asked a question instead of deciding. Rewrite the face so it carries the missing context, and answer the question directly in one or two English sentences in answer:",
      `User question: ${cause.question}`,
      "",
    );
  } else {
    L.push(
      `The card failed the world-level gate on ledger phrase '${cause.hit}'. Restore the real-world meaning to the face and return null for answer.`,
      "",
    );
  }
  L.push("Original card JSON:", JSON.stringify(card, null, 2), "", "Return only JSON that satisfies the output schema.");
  return L.join("\n");
}

/**
 * 把重写后的脸接回原卡(纯函数)。id/指纹/diff/evidence/options 原样;
 * revisedAt 打点;question 通道要求 answer 非空(没答案就不算补上 context,
 * 卡继续待补,下轮重试)。返回 null = 重写结果不可用。
 */
export function graftFace(
  card: Card,
  face: RefaceFace,
  cause: RefaceCause,
  now: string,
): Record<string, unknown> | null {
  if (!face.title || !face.title.trim()) return null;
  const answer = face.answer?.trim() || null;
  if (cause.kind === "question" && !answer) return null;
  const evidence = card.evidence.map((item, index) => {
    const note = face.evidenceNotes[index]?.trim();
    const next = { ...item };
    if (note) next.note = note;
    else delete next.note;
    return next;
  });
  const next: Card = {
    ...card,
    title: face.title.trim(),
    summary: face.summary?.trim() || undefined,
    whyNow: face.whyNow?.trim() || undefined,
    recommendation: card.recommendation
      ? { ...card.recommendation, reason: face.recommendationReason?.trim() || card.recommendation.reason }
      : undefined,
    onAccept: face.onAccept?.trim() || undefined,
    evidence,
    options: DEFAULT_OPTIONS.map((option) => ({ ...option })),
    revisedAt: now,
    context:
      cause.kind === "question"
        ? { question: cause.question, answer: answer! }
        : card.context,
  };
  return clean(next as unknown as Record<string, unknown>);
}

/** 一条待答问题:该指纹最新的 question 事件,且其后没有任何 decision。 */
export interface PendingQuestion {
  cardId: string;
  fingerprint: string;
  question: string;
  ts: string;
}

/**
 * 从 decisions.jsonl 读出待答问题(宽容解析,同 suppress 的姿态)。
 * 任何 decision 事件(不分先后)都终结该指纹的问答——已决指纹永不回场。
 */
export function unansweredQuestions(jsonlPath: string): PendingQuestion[] {
  if (!existsSync(jsonlPath)) return [];
  const latest = new Map<string, PendingQuestion>();
  const decided = new Set<string>();
  for (const line of readFileSync(jsonlPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as {
        type?: string;
        cardId?: string;
        fingerprint?: string;
        question?: string;
        ts?: string;
      };
      if (!e.fingerprint) continue;
      if (e.type === "decision") decided.add(e.fingerprint);
      if (e.type === "undo") decided.delete(e.fingerprint); // #24:撤销后回到未决
      if (e.type === "question" && e.question && e.cardId && e.ts) {
        latest.set(e.fingerprint, {
          cardId: e.cardId,
          fingerprint: e.fingerprint,
          question: e.question,
          ts: e.ts,
        });
      }
    } catch {
      /* 宽容 */
    }
  }
  return [...latest.values()].filter((q) => !decided.has(q.fingerprint));
}

/** 卡是否还欠这个问题一次重写(revisedAt 早于提问 = 还没答)。 */
export function needsReface(card: Pick<Card, "revisedAt">, q: PendingQuestion): boolean {
  const revised = card.revisedAt ? Date.parse(card.revisedAt) : 0;
  const asked = Date.parse(q.ts);
  return !Number.isFinite(revised) || revised < asked;
}

/** codex 一次性调用,拿回重写后的脸(与主扫描同款只读 exec 姿态)。 */
export function runRefaceCodex(
  vault: string,
  card: Card,
  cause: RefaceCause,
  opts: { runId: string; model?: string },
): RefaceFace {
  const schemaPath = join(tmpdir(), `forme-reface-schema-${opts.runId}-${card.id}.json`);
  writeFileSync(schemaPath, JSON.stringify(refaceOutputSchema()));
  const lastMsgPath = join(tmpdir(), `forme-reface-${opts.runId}-${card.id}.json`);
  const args = [
    "exec",
    "--sandbox", "read-only",
    "-C", vault,
    "--skip-git-repo-check",
    "--output-schema", schemaPath,
    "-o", lastMsgPath,
  ];
  if (opts.model) args.push("-m", opts.model);
  args.push(buildRefacePrompt(card, cause));
  execFileSync("codex", args, { stdio: ["ignore", "inherit", "inherit"] });
  return JSON.parse(readFileSync(lastMsgPath, "utf8")) as RefaceFace;
}
