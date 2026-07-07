import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { recentMarkdownFiles } from "./scan.ts";
import { agentOutputSchema } from "./agent-schema.ts";
import { cardToMarkdown } from "./mirror.ts";
import { assembleCard } from "./card.ts";
import { loadSuppressionList } from "./suppress.ts";
import { loadTasteRuleLines } from "./taste.ts";
import { appendRunMetric } from "./metrics.ts";
import type { AgentCard } from "./types.ts";

/**
 * Forme runner (W1, Codex path). Reads the vault git-delta, asks a READ-ONLY
 * codex agent to find drift and return JSON only, then deterministically
 * assembles + validates + fingerprints + writes cards into 98_Forme/. The agent
 * never writes; all provenance and disk writes are Forme code (hard constraint #7).
 *
 * Dual call form: this is the one-shot `codex exec` path; the long-running
 * server/SDK (OpenCode, #8) plugs in behind the same scan → assemble → write core.
 */

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return def;
}
const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

const vault = arg("vault") ?? process.env.FORME_VAULT;
if (!vault) {
  console.error("forme runner: need --vault <path> or FORME_VAULT env");
  process.exit(2);
}
const commits = Number(arg("commits", "4"));
const maxFiles = Number(arg("max-files", "12"));
const maxCards = Number(arg("max-cards", "3"));
const outDir = arg("out") ?? join(vault, "98_Forme");
const model = arg("model");
const dryRun = hasFlag("dry-run");

// 额度守卫(launchd 传 --min-hours 20;手动跑默认 0 = 不拦)。守卫住 runner
// 本体而非 shell wrapper:带 provenance/quarantine xattr 的脚本会被 launchd
// 拒执行(exec EPERM),plist 直接 exec node 就没有中间脚本这一层风险。
// 时钟 = run-metrics.jsonl 的 mtime(只有真实完成的 run 会动它,
// 手动/自动共享同一额度窗口,无独立状态文件)。
const minHours = Number(arg("min-hours", "0"));
if (minHours > 0) {
  try {
    const ageH = (Date.now() - statSync(join(outDir, "run-metrics.jsonl")).mtimeMs) / 3_600_000;
    if (ageH < minHours) {
      console.log(`skip: last run ${ageH.toFixed(1)}h ago (< ${minHours}h quota window)`);
      process.exit(0);
    }
  } catch {
    // 无数据点文件 = 从未真跑过,不拦
  }
}

const at = new Date().toISOString();
const runId = `run_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;

const files = recentMarkdownFiles(vault, commits, maxFiles);
if (files.length === 0) {
  console.error("forme runner: no recent .md files in git delta — nothing to scan");
  process.exit(1);
}
console.log(`forme runner ${runId}`);
console.log(`scan: ${files.length} files from last ${commits} commits of ${vault}`);

const suppression = loadSuppressionList(join(outDir, "decisions.jsonl"));
console.log(
  `suppression list: ${suppression.fingerprints.size} decided fingerprint(s) from ${suppression.events} event(s)` +
    (suppression.unreadable ? ` (${suppression.unreadable} unreadable line(s)!)` : ""),
);

// Taste Rules 注入(#10,生命周期第 2 步):已提炼的规则进 prompt,让提案先过用户口味
const tasteRules = loadTasteRuleLines(join(outDir, "Taste Rules.md"));
if (tasteRules.length) console.log(`taste rules: ${tasteRules.length} rule(s) injected into prompt`);

const schemaPath = join(tmpdir(), `forme-agent-schema-${runId}.json`);
writeFileSync(schemaPath, JSON.stringify(agentOutputSchema()));
const lastMsgPath = join(tmpdir(), `forme-last-${runId}.json`);

const prompt = [
  `你是 Forme 的漂移侦测器,只读扫描下面这批 vault 最近变更的 markdown 文件,找出最多 ${maxCards} 个真实、具体、可用最小 diff 修复的漂移。`,
  "",
  "漂移类别(category,kebab-case):stale-frontmatter / broken-link / stale-claim / orphan / naming-drift / dangling-task 等。",
  "",
  "每张卡(卡面是给决策者读的,五段结构,标题与 summary 不用术语):",
  "- category:类别 slug(kebab-case)",
  "- title:一句话中文标题(用户第一眼读的东西)",
  "- summary:一行上下文(是什么),没有就 null",
  "- whyNow:为什么现在出现这张卡(出身/时机,一句人话),可 null",
  "- recommendationChoice + recommendationReason:你的明确建议(accept/park/reject 之一)+ 一行理由——你已经调查过了,亮明立场,别骑墙",
  "- onAccept:拍板 accept 后会发生什么的一句人话预览(别复述文件路径和回滚说明,系统会补),可 null",
  "- evidence[]:{path(vault 相对), locator(行号/字段/锚点,可 null), quote(逐字摘录,可 null), note(为何是证据,可 null)};标题里每个断言都要有证据",
  "- diff:{file(vault 相对,一张卡只改一个文件), hunks[{locator(可 null), before, after}]};before 必须是文件里逐字存在的字符串,after 是替换;before 为空串表示纯插入;保持最小改动",
  "- estSeconds:估计落子秒数,可 null",
  "",
  ...(tasteRules.length
    ? ["用户已确立的 taste 规则(提案须符合,拿不准就别提):", ...tasteRules.map((r) => `- ${r}`), ""]
    : []),
  "硬规则:你是只读,绝不修改任何文件;before 必须与文件实际内容逐字匹配(会被机器校验,不匹配即丢弃);卡面文案用中文;宁缺毋滥,只报有把握的;没有可靠漂移就返回空数组。",
  "",
  "只返回符合 output schema 的结构化 JSON。最近变更的文件:",
  ...files.map((f) => `- ${f}`),
].join("\n");

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

console.log("codex: running read-only scan (this can take a minute)…");
execFileSync("codex", codexArgs, { stdio: ["ignore", "inherit", "inherit"] });

const raw = readFileSync(lastMsgPath, "utf8");
let agentCards: AgentCard[];
try {
  const parsed = JSON.parse(raw) as { cards?: AgentCard[] };
  agentCards = parsed.cards ?? [];
} catch {
  console.error("codex output was not JSON:\n" + raw.slice(0, 800));
  process.exit(1);
}
console.log(`agent returned ${agentCards.length} candidate card(s)`);

mkdirSync(join(outDir, "cards"), { recursive: true });
let written = 0;
let dup = 0;
let rejected = 0;
let suppressed = 0;

for (const ac of agentCards) {
  const { card, serializable, validation } = assembleCard(ac, { runId, at, model });
  if (!validation.valid) {
    rejected++;
    console.log(`  reject ${ac.category} — ${validation.errors.slice(0, 2).join("; ")}`);
    continue;
  }
  if (suppression.fingerprints.has(card.fingerprint)) {
    suppressed++;
    console.log(`  suppress ${card.id} (${ac.category}) — 指纹已决,静默丢弃`);
    continue;
  }

  const jsonPath = join(outDir, "cards", `${card.id}.json`);
  if (existsSync(jsonPath)) {
    dup++;
    console.log(`  dup    ${card.id} (${ac.category})`);
    continue;
  }
  if (dryRun) {
    written++;
    console.log(`  [dry]  ${card.id} (${ac.category}) — ${ac.title}`);
    continue;
  }
  writeFileSync(jsonPath, JSON.stringify(serializable, null, 2) + "\n");
  writeFileSync(join(outDir, "cards", `${card.id}.md`), cardToMarkdown(card));
  written++;
  console.log(`  write  ${card.id} (${ac.category}) — ${ac.title}`);
}

if (!dryRun) {
  appendRunMetric(join(outDir, "run-metrics.jsonl"), {
    v: "0",
    date: at.slice(0, 10),
    runId,
    proposed: agentCards.length,
    suppressed,
    presented: written,
    rejected,
    dup,
  });
}

console.log(
  `done: ${written} ${dryRun ? "would-write" : "written"}, ${suppressed} suppressed, ${dup} dup, ${rejected} rejected → ${join(outDir, "cards")}`,
);
