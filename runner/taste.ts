import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

/**
 * Taste Rules 提炼器 v0(issue #10,生命周期第 6 步)。
 * decisions.jsonl(+ 卡体上下文)→ codex headless 提炼(只返回 JSON)→
 * Forme 代码消毒并渲染追加 `98_Forme/Taste Rules.md`(人可读、人可编辑)。
 *
 * 确定性护栏(不信 LLM 自觉):
 * - 溯源:规则的 sourceCardIds 过滤到真实出现过的 cardId,过滤后为空即丢弃;
 * - 诚实置信:样本统计由代码算;零负样本(无 reject/park/correction)时
 *   confidence 一律钉死 low,并把数据基础写进每条规则——8 条全 accept 只能
 *   刻画「会接受什么」,刻画不了「会拒绝什么」。
 * - 规则是候选:收录/改写/丢弃确认卡是 W3 console 的事(交互稿屏 4)。
 *
 * 表达层(#13,Zayn 07-06 反馈,一般原则「结论用人话一行,账本降层可查」):
 * - 规则行 = 一行祈使句,像用户亲手写进 CLAUDE.md 的指令;系统词硬禁
 *   (BANNED_IN_RULE,含即丢——机器检查,不靠 prompt 恳求);
 * - 账本(依据/统计/置信/时效)由代码渲染成规则行下的降层小字,LLM 不碰;
 * - 同文件双层:md 人读层 = 渲染,`<!-- forme-rule: {...} -->` 注释块 = 存储
 *   (供注入与重验;渲染完全分离留 W3+ console)。
 */

export interface DecisionRow {
  cardId: string;
  choice: string;
  executed?: string;
  backfilled?: boolean;
}

export interface SampleStats {
  decisions: number;
  accept: number;
  park: number;
  reject: number;
  corrections: number;
}

export interface AgentRule {
  rule: string;
  rationale: string;
  sourceCardIds: string[];
  confidence: string;
  confidenceNote: string | null;
}

export interface VettedRule {
  rule: string;
  rationale: string;
  sources: string[];
  confidence: "low" | "medium" | "high";
  confidenceNote: string;
}

/**
 * 用户手写规则(风格 few-shot,#13):出自 owner 的 CLAUDE.md 与 agent memory,
 * 经交互稿屏 4 核验为非虚构(2026-07-04)。机器写的规则要读起来像这些。
 */
export const STYLE_FEWSHOTS: string[] = [
  "报告与总结用中文;路径、属性名、英文概念题名不动",
  "删除 / 合并 / 归档 / 发布必须人批(保守默认)",
  "私密与关系类材料不做转化,停在 Inbox 等本人",
  "自我呈现文案默认 honest-humble,主动砍浮夸",
  "写回 = 填真 gap,不复读已有内容;单一事实源",
  "先核验事实,再写回;只 stage 任务相关文件",
  "开发期不新增 vault 文档;产物优先代码 / demo",
];

/** 规则行禁词表(#13):系统语域不许上人读层。小写比对;命中即整条丢弃。 */
const BANNED_IN_RULE = [
  "provenance", "frontmatter", "cardid", "card_", "card-0",
  "fingerprint", "指纹", "jsonl", "schema", "hub", "source index", "sourcecardid",
  "wikilink", "diff hunk", "locator", "metadata field", "commit hash",
];

/** 返回规则行里第一个命中的禁词,干净则 null。 */
export function bannedWordIn(rule: string): string | null {
  const lower = rule.toLowerCase();
  return BANNED_IN_RULE.find((w) => lower.includes(w)) ?? null;
}

/** Existing historical rules may be Chinese; newly extracted rules must be English. */
export function isEnglishRule(rule: string): boolean {
  return /[A-Za-z]/.test(rule) && !/[\u3400-\u9fff]/u.test(rule);
}

/** 从 Taste Rules.md 提取规则行(`## Rn · 规则`)——runner prompt 注入用。 */
export function loadTasteRuleLines(path: string): string[] {
  if (!existsSync(path)) return [];
  const rules: string[] = [];
  for (const m of readFileSync(path, "utf8").matchAll(/^## R\d+ · (.+)$/gm)) rules.push(m[1]!.trim());
  return rules;
}

export interface RuleRecord {
  id: string;
  sources: string[];
  confidence: string;
  status: string;
  added: string;
  reverifyAfterDecisions: number;
  rationale?: string;
  stats?: string;
}

/** 读注释块存储层(`<!-- forme-rule: {...} -->`)——W3 重验/确认卡的读入。宽容解析。 */
export function loadTasteRuleRecords(path: string): RuleRecord[] {
  if (!existsSync(path)) return [];
  const records: RuleRecord[] = [];
  for (const m of readFileSync(path, "utf8").matchAll(/<!-- forme-rule: (\{.*?\}) -->/g)) {
    try {
      records.push(JSON.parse(m[1]!) as RuleRecord);
    } catch {
      /* 人编辑弄坏一条存档不致命 */
    }
  }
  return records;
}

/** 宽容读事件日志:decision 行 + correction 计数(同 suppress 的姿态)。
 *  undo(#24)按文件序撤销同卡最近一次 decision——4 秒内反悔的落子不是 taste。 */
export function readDecisionLog(jsonlPath: string): { decisions: DecisionRow[]; corrections: number } {
  const decisions: DecisionRow[] = [];
  let corrections = 0;
  if (!existsSync(jsonlPath)) return { decisions, corrections };
  for (const line of readFileSync(jsonlPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as Record<string, unknown>;
      if (e.type === "correction") corrections++;
      if (e.type === "decision" && typeof e.cardId === "string" && typeof e.choice === "string") {
        // Authorized/shadow executions are system behavior, not owner taste.
        if (e.actor === "agent_authorized" || e.actor === "agent_shadow") continue;
        decisions.push({
          cardId: e.cardId,
          choice: e.choice,
          executed: typeof e.executed === "string" ? e.executed : undefined,
          backfilled: e.backfilled === true,
        });
      }
      if (e.type === "undo" && typeof e.cardId === "string") {
        for (let i = decisions.length - 1; i >= 0; i--) {
          if (decisions[i]!.cardId === e.cardId) {
            decisions.splice(i, 1);
            break;
          }
        }
      }
    } catch {
      /* 非 JSON 行不致命 */
    }
  }
  return { decisions, corrections };
}

export function sampleStats(decisions: DecisionRow[], corrections: number): SampleStats {
  const count = (c: string) => decisions.filter((d) => d.choice === c).length;
  return {
    decisions: decisions.length,
    accept: count("accept"),
    park: count("park"),
    reject: count("reject"),
    corrections,
  };
}

export const hasNegativeSamples = (s: SampleStats): boolean =>
  s.reject + s.park + s.corrections > 0;

export function statsLine(s: SampleStats): string {
  return `${s.decisions} decision${s.decisions === 1 ? "" : "s"} = ${s.accept} accept · ${s.reject} reject · ${s.park} park · ${s.corrections} correction`;
}

/** 确定性消毒:溯源过滤 + 置信钉死 + 规则行禁词(#13)。 */
export function vetRules(agentRules: AgentRule[], knownCardIds: Set<string>, stats: SampleStats): VettedRule[] {
  const negatives = hasNegativeSamples(stats);
  const vetted: VettedRule[] = [];
  for (const r of agentRules) {
    const rule = r.rule?.trim();
    if (!rule) continue;
    if (!isEnglishRule(rule)) continue;
    if (bannedWordIn(rule)) continue; // 系统词上了人读层 = 表达层不合格,整条丢弃(#13)
    const sources = [...new Set(r.sourceCardIds ?? [])].filter((id) => knownCardIds.has(id));
    if (sources.length === 0) continue; // 无真实出处 = 不可溯源,丢弃(收割护栏)
    const claimed = (["low", "medium", "high"] as const).find((c) => c === r.confidence) ?? "low";
    const confidence = negatives ? claimed : "low";
    const noteParts = [
      `Data basis: ${statsLine(stats)}`,
      ...(negatives ? [] : ["No negative samples: this can describe what the user accepts, not what they reject"]),
      ...(r.confidenceNote ? [r.confidenceNote.trim()] : []),
    ];
    vetted.push({ rule, rationale: r.rationale?.trim() || "(No rationale supplied)", sources, confidence, confidenceNote: noteParts.join("; ") });
  }
  return vetted;
}

const HEADER = [
  "---",
  "forme: taste-rules",
  "---",
  "",
  "# Taste Rules (editable)",
  "",
  "> Each rule is one plain-language instruction. Forme renders its evidence, confidence, and aging ledger below it; the comment block is machine-readable storage.",
  "> You may rewrite, delete, or reorder this file directly. Your edit is final. Until the confirm/rewrite/discard interaction ships, every generated entry remains a candidate.",
  "> Rules can expire. Reverify them against new decisions at the stated checkpoint.",
  "",
  "",
].join("\n");

/** 账本压缩统计:降层小字里的一段,全由代码措辞。 */
export function compactStats(stats: SampleStats): string {
  if (!hasNegativeSamples(stats)) return `${stats.decisions} all-accept decision${stats.decisions === 1 ? "" : "s"}, no negative samples`;
  return `${stats.decisions} decision${stats.decisions === 1 ? "" : "s"} (${stats.accept} accept · ${stats.reject} reject · ${stats.park} park · ${stats.corrections} correction${stats.corrections === 1 ? "" : "s"})`;
}

/**
 * 渲染(#13 双层):规则行(人话)→ 账本小字(斜体一行,代码措辞)→
 * 注释块(结构化存储:溯源/置信/时效/rationale,机器读)。
 */
export function renderRuleBlocks(rules: VettedRule[], startIndex: number, date: string, stats: SampleStats): string {
  const L: string[] = [];
  rules.forEach((r, i) => {
    const id = `R${startIndex + i}`;
    const record: RuleRecord = {
      id,
      sources: r.sources,
      confidence: r.confidence,
      status: "candidate",
      added: date,
      reverifyAfterDecisions: 20,
      rationale: r.rationale,
      stats: statsLine(stats),
    };
    L.push(`## ${id} · ${r.rule}`);
    L.push("");
    L.push(`*Based on ${r.sources.length} card${r.sources.length === 1 ? "" : "s"} · ${compactStats(stats)} → ${r.confidence} confidence · distilled ${date.slice(5)} · reverify after 20 decisions*`);
    L.push(`<!-- forme-rule: ${JSON.stringify(record)} -->`);
    L.push("");
  });
  return L.join("\n");
}

/** 写盘:不存在则建全文档;存在则只追加规则块(人编辑的部分一个字不动)。 */
export function writeTasteRules(path: string, rules: VettedRule[], date: string, stats: SampleStats): { startIndex: number } {
  const existing = loadTasteRuleLines(path).length;
  const blocks = renderRuleBlocks(rules, existing + 1, date, stats);
  if (existsSync(path)) appendFileSync(path, "\n" + blocks);
  else writeFileSync(path, HEADER + blocks);
  return { startIndex: existing + 1 };
}

// ---------- CLI(headless codex 真跑) ----------

function agentRulesSchema(): unknown {
  // strict-safe:全 required、可选走 nullable、无 pattern/minItems(同 agent-schema.ts 的两层契约)
  return {
    type: "object",
    additionalProperties: false,
    required: ["rules"],
    properties: {
      rules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rule", "rationale", "sourceCardIds", "confidence", "confidenceNote"],
          properties: {
            rule: { type: "string" },
            rationale: { type: "string" },
            sourceCardIds: { type: "array", items: { type: "string" } },
            confidence: { type: "string" },
            confidenceNote: { type: ["string", "null"] },
          },
        },
      },
    },
  };
}

export function buildTastePrompt(input: {
  maxRules: number;
  stats: SampleStats;
  digest: string[];
  existingRules: string[];
}): string {
  const { maxRules, stats, digest, existingRules } = input;
  return [
    `You are Forme's taste distiller. Derive at most ${maxRules} actionable preferences or boundaries from the vault owner's real decision history. Do not merely restate individual cards.`,
    "",
    "Every new rule must be a single English imperative sentence that reads like something the user would put in their own agent instructions. A person who has never seen Forme must be able to follow it.",
    "Do not put system or storage terms such as provenance, frontmatter, cardId, fingerprint, schema, JSONL, wikilink, diff hunk, locator, Hub, or Source Index in the rule line. The deterministic gate will discard such rules. Use the user's world-level language instead.",
    "",
    "Historical user-written style examples follow. They may be Chinese or mixed-language; imitate their directness and specificity, not their language:",
    ...STYLE_FEWSHOTS.map((rule) => `- ${rule}`),
    "",
    `Sample statistics: ${statsLine(stats)}.`,
    ...(hasNegativeSamples(stats)
      ? []
      : ["There are no negative samples: all decisions are accept. Derive only what the user tends to accept, do not invent rejection boundaries, and set every confidence to low."]),
    "",
    "Decision records (cardId · card context · choice · execution commit):",
    ...digest,
    "",
    "For seed decisions whose card body is unavailable, you may inspect the accepted change with git show <commit> in the read-only sandbox.",
    "",
    ...(existingRules.length
      ? ["Existing rules may be in any language. Do not duplicate or paraphrase them; propose only genuinely new rules:", ...existingRules.map((rule) => `- ${rule}`), ""]
      : []),
    "For each rule return: rule (one plain-English imperative); rationale (English machine-facing evidence describing the shared pattern); sourceCardIds (real cardIds from the records, at least one); confidence (low, medium, or high); confidenceNote (nullable English text).",
    "Do not put statistics, confidence, or aging information in rule. Forme renders that ledger below the rule deterministically.",
    "Prefer no rule over a weak rule. Require support from at least two decisions; return an empty rules array when no reliable pattern exists. Return only JSON matching the output schema.",
  ].join("\n");
}

function main(): void {
  const arg = (name: string, def?: string): string | undefined => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
  };
  const vault = arg("vault") ?? process.env.FORME_VAULT;
  if (!vault) {
    console.error("forme taste: need --vault <path> or FORME_VAULT env");
    process.exit(2);
  }
  const outDir = arg("out") ?? join(vault, "98_Forme");
  const maxRules = Number(arg("max-rules", "5"));
  const model = arg("model");
  const dryRun = process.argv.includes("--dry-run");
  const runId = `taste_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
  const date = new Date().toISOString().slice(0, 10);

  const { decisions, corrections } = readDecisionLog(join(outDir, "decisions.jsonl"));
  if (decisions.length === 0) {
    console.error("forme taste: no decisions yet — nothing to distill");
    process.exit(1);
  }
  const stats = sampleStats(decisions, corrections);
  const knownCardIds = new Set(decisions.map((d) => d.cardId));
  const existingRules = loadTasteRuleLines(join(outDir, "Taste Rules.md"));
  console.log(`forme taste ${runId}`);
  console.log(`data: ${statsLine(stats)}; ${existingRules.length} existing rule(s)`);

  // 每条决策一行摘要;卡体存盘的补上下文,种子决策给 executed commit 让 agent 自己 git show
  const digest = decisions.map((d) => {
    const cardPath = join(outDir, "cards", `${d.cardId}.json`);
    let ctx = "(seed decision; card body unavailable)";
    if (existsSync(cardPath)) {
      try {
        const c = JSON.parse(readFileSync(cardPath, "utf8")) as { category?: string; title?: string; diff?: { file?: string } };
        ctx = `${c.category} · '${c.title}' · target ${c.diff?.file}`;
      } catch {
        /* 卡体读不动就退回占位 */
      }
    }
    return `- ${d.cardId} · ${ctx} · choice=${d.choice}${d.executed ? ` · execution commit ${d.executed}` : ""}`;
  });

  const prompt = buildTastePrompt({ maxRules, stats, digest, existingRules });

  const schemaPath = join(tmpdir(), `forme-taste-schema-${runId}.json`);
  writeFileSync(schemaPath, JSON.stringify(agentRulesSchema()));
  const lastMsgPath = join(tmpdir(), `forme-taste-last-${runId}.json`);
  const codexArgs = [
    "exec",
    "--sandbox", "read-only",
    "-C", vault,
    "--skip-git-repo-check",
    "--output-schema", schemaPath,
    "-o", lastMsgPath,
  ];
  if (model) codexArgs.push("-m", model);
  codexArgs.push(prompt);
  console.log("codex: distilling taste rules (read-only)…");
  execFileSync("codex", codexArgs, { stdio: ["ignore", "inherit", "inherit"] });

  let agentRules: AgentRule[];
  try {
    agentRules = (JSON.parse(readFileSync(lastMsgPath, "utf8")) as { rules?: AgentRule[] }).rules ?? [];
  } catch {
    console.error("codex output was not JSON");
    process.exit(1);
  }
  const vetted = vetRules(agentRules, knownCardIds, stats).slice(0, maxRules);
  console.log(`agent proposed ${agentRules.length}, vetted ${vetted.length}`);
  for (const r of vetted) console.log(`  R? · ${r.rule} [${r.confidence}] ← ${r.sources.join(",")}`);
  if (vetted.length === 0) {
    console.log("no vetted rules — Taste Rules.md untouched");
    return;
  }
  if (dryRun) {
    console.log("[dry] would append to " + join(outDir, "Taste Rules.md"));
    return;
  }
  const { startIndex } = writeTasteRules(join(outDir, "Taste Rules.md"), vetted, date, stats);
  console.log(`wrote R${startIndex}…R${startIndex + vetted.length - 1} → ${join(outDir, "Taste Rules.md")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
