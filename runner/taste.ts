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

/** 从 Taste Rules.md 提取规则行(`## Rn · 规则`)——runner prompt 注入用。 */
export function loadTasteRuleLines(path: string): string[] {
  if (!existsSync(path)) return [];
  const rules: string[] = [];
  for (const m of readFileSync(path, "utf8").matchAll(/^## R\d+ · (.+)$/gm)) rules.push(m[1]!.trim());
  return rules;
}

/** 宽容读事件日志:decision 行 + correction 计数(同 suppress 的姿态)。 */
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
        decisions.push({
          cardId: e.cardId,
          choice: e.choice,
          executed: typeof e.executed === "string" ? e.executed : undefined,
          backfilled: e.backfilled === true,
        });
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
  return `${s.decisions} 决策 = ${s.accept} accept · ${s.reject} reject · ${s.park} park · ${s.corrections} correction`;
}

/** 确定性消毒:溯源过滤 + 置信钉死。 */
export function vetRules(agentRules: AgentRule[], knownCardIds: Set<string>, stats: SampleStats): VettedRule[] {
  const negatives = hasNegativeSamples(stats);
  const vetted: VettedRule[] = [];
  for (const r of agentRules) {
    const rule = r.rule?.trim();
    if (!rule) continue;
    const sources = [...new Set(r.sourceCardIds ?? [])].filter((id) => knownCardIds.has(id));
    if (sources.length === 0) continue; // 无真实出处 = 不可溯源,丢弃(收割护栏)
    const claimed = (["low", "medium", "high"] as const).find((c) => c === r.confidence) ?? "low";
    const confidence = negatives ? claimed : "low";
    const noteParts = [
      `数据基础 ${statsLine(stats)}`,
      ...(negatives ? [] : ["零负样本——只能刻画「会接受什么」,刻画不了「会拒绝什么」"]),
      ...(r.confidenceNote ? [r.confidenceNote.trim()] : []),
    ];
    vetted.push({ rule, rationale: r.rationale?.trim() || "(agent 未给依据)", sources, confidence, confidenceNote: noteParts.join(";") });
  }
  return vetted;
}

const HEADER = [
  "---",
  "forme: taste-rules",
  "---",
  "",
  "# Taste Rules(人可编辑)",
  "",
  "> Forme 每 ~20 条决策提炼一批候选规则**追加**到这里;整份文件你可以直接改写、删除、重排——",
  "> 你的编辑就是最终裁决。规则的「收录/改写/丢弃」确认卡是 W3 console 的交互(交互稿屏 4),",
  "> 在那之前所有条目 status 都是 candidate。规则会过期:reverify 到点后须用新决策重验(aging)。",
  "",
  "",
].join("\n");

export function renderRuleBlocks(rules: VettedRule[], startIndex: number, date: string): string {
  const L: string[] = [];
  rules.forEach((r, i) => {
    L.push(`## R${startIndex + i} · ${r.rule}`);
    L.push("");
    L.push(`- 依据:${r.rationale}`);
    L.push(`- 出处:${r.sources.join(" · ")}`);
    L.push(`- confidence:${r.confidence} —— ${r.confidenceNote}`);
    L.push(`- status:candidate · added ${date} · reverify:+20 决策后`);
    L.push("");
  });
  return L.join("\n");
}

/** 写盘:不存在则建全文档;存在则只追加规则块(人编辑的部分一个字不动)。 */
export function writeTasteRules(path: string, rules: VettedRule[], date: string): { startIndex: number } {
  const existing = loadTasteRuleLines(path).length;
  const blocks = renderRuleBlocks(rules, existing + 1, date);
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
    let ctx = "(卡体未存盘的种子决策)";
    if (existsSync(cardPath)) {
      try {
        const c = JSON.parse(readFileSync(cardPath, "utf8")) as { category?: string; title?: string; diff?: { file?: string } };
        ctx = `${c.category} · 「${c.title}」 · 目标 ${c.diff?.file}`;
      } catch {
        /* 卡体读不动就退回占位 */
      }
    }
    return `- ${d.cardId} · ${ctx} · choice=${d.choice}${d.executed ? ` · 执行 commit ${d.executed}` : ""}`;
  });

  const prompt = [
    `你是 Forme 的 taste 提炼器,从用户(vault 主人)的真实决策记录里提炼最多 ${maxRules} 条人可读的 taste 规则(中文一句话,可执行的偏好/边界,不是对单卡的复述)。`,
    "",
    `样本统计(如实面对):${statsLine(stats)}。`,
    ...(hasNegativeSamples(stats)
      ? []
      : ["注意:零负样本——所有决策都是 accept。你只能提炼「用户会接受什么」;不要编造「用户会拒绝什么」类规则;confidence 一律填 low。"]),
    "",
    "决策记录(cardId · 卡上下文 · 落子 · 执行 commit):",
    ...digest,
    "",
    "卡体未存盘的种子决策,可在 vault 里 `git show <commit>` 查看被接受的真实改动(你是只读沙箱,git 读操作可用)。",
    "",
    ...(existingRules.length
      ? ["已有规则(别重复、别换皮复述;只提真正新的):", ...existingRules.map((r) => `- ${r}`), ""]
      : []),
    "每条规则:rule(一句话)· rationale(从哪些决策的什么共性得出)· sourceCardIds(上面列表里真实的 cardId,≥1)· confidence(low/medium/high)· confidenceNote(可 null)。",
    "宁缺毋滥:共性不足 2 条决策支撑的规则别提;没有可靠规则就返回空数组。只返回符合 output schema 的 JSON。",
  ].join("\n");

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
  const { startIndex } = writeTasteRules(join(outDir, "Taste Rules.md"), vetted, date);
  console.log(`wrote R${startIndex}…R${startIndex + vetted.length - 1} → ${join(outDir, "Taste Rules.md")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
