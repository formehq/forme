import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { recentMarkdownFiles, markdownFilesSince, vaultHead, isUsableAnchor } from "./scan.ts";
import { agentOutputSchema } from "./agent-schema.ts";
import { cardToMarkdown } from "./mirror.ts";
import { assembleCard } from "./card.ts";
import { loadSuppressionList } from "./suppress.ts";
import { loadTasteRuleLines } from "./taste.ts";
import { appendRunMetric, lastRunHead } from "./metrics.ts";
import { checkLegibility } from "./legibility.ts";
import { graftFace, needsReface, runRefaceCodex, unansweredQuestions, type RefaceCause } from "./reface.ts";
import { checkCard } from "../schema/validate.ts";
import type { AgentCard, Card } from "./types.ts";

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
const commitsExplicit = hasFlag("commits"); // #14:显式传参 = 手动覆盖增量锚点
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
const metricsPath = join(outDir, "run-metrics.jsonl");
const minHours = Number(arg("min-hours", "0"));
if (minHours > 0) {
  try {
    const ageH = (Date.now() - statSync(metricsPath).mtimeMs) / 3_600_000;
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

/** 重写一张卡的脸并落盘(#21;question 与闸打回共用)。true = 已入列。 */
function refaceAndWrite(card: Card, cause: RefaceCause): boolean {
  const face = runRefaceCodex(vault!, card, cause, { runId, model });
  const grafted = graftFace(card, face, cause, new Date().toISOString());
  if (!grafted) {
    console.log(`  reface 弃 ${card.id} — 重写结果不可用(标题或答案为空)`);
    return false;
  }
  const v = checkCard(grafted);
  if (!v.valid) {
    console.log(`  reface 弃 ${card.id} — ${v.errors.slice(0, 2).join("; ")}`);
    return false;
  }
  const gate = checkLegibility(grafted as unknown as Card);
  if (!gate.ok) {
    console.log(`  reface 弃 ${card.id} — 重写后仍命中账本语域「${gate.hit}」`);
    return false;
  }
  writeFileSync(join(outDir, "cards", `${card.id}.json`), JSON.stringify(grafted, null, 2) + "\n");
  writeFileSync(join(outDir, "cards", `${card.id}.md`), cardToMarkdown(grafted as unknown as Card));
  return true;
}

// #21 question 通道:先答上一轮的问题,再找新漂移。用户发问 = 主动拉取,
// 优先级最高;这个阶段与扫描窗口无关(窗口为空也要答)。已决指纹不回场。
let refaced = 0;
const pendingQuestions = unansweredQuestions(join(outDir, "decisions.jsonl"));
if (pendingQuestions.length) {
  if (dryRun) {
    console.log(`questions: ${pendingQuestions.length} 张卡在等世界层解释(dry-run 跳过重写)`);
  } else {
    console.log(`questions: ${pendingQuestions.length} 张卡在等世界层解释(#21)`);
    for (const q of pendingQuestions.slice(0, maxCards)) {
      const cardPath = join(outDir, "cards", `${q.cardId}.json`);
      if (!existsSync(cardPath)) continue;
      let card: Card;
      try {
        card = JSON.parse(readFileSync(cardPath, "utf8")) as Card;
      } catch {
        continue;
      }
      if (!needsReface(card, q)) continue;
      try {
        if (refaceAndWrite(card, { kind: "question", question: q.question })) {
          refaced++;
          console.log(`  reface ${q.cardId} — 已带解释回队列(问:「${q.question.slice(0, 40)}」)`);
        } else {
          console.log(`  卡 ${q.cardId} 继续待补,下轮重试`);
        }
      } catch (e) {
        console.log(`  reface 出错 ${q.cardId} — ${String(e instanceof Error ? e.message : e)}`);
      }
    }
  }
}

// #14:增量窗口默认「上次成功 run 以来」(锚点 = run-metrics 最后记录的 HEAD),
// 窗口自动等于 run 节律,vault 一天多次 commit 也不漏文件(硬约束 #3 的本意)。
// --commits 显式传参 = 手动覆盖;锚点缺失(首跑/旧数据)或失效(rebase)→ 回退。
const head = vaultHead(vault);
const anchor = commitsExplicit ? null : lastRunHead(metricsPath);
let files: string[];
let windowDesc: string;
if (anchor && isUsableAnchor(vault, anchor)) {
  files = markdownFilesSince(vault, anchor, maxFiles);
  windowDesc = `since last run (${anchor}..${head})`;
} else {
  files = recentMarkdownFiles(vault, commits, maxFiles);
  windowDesc = commitsExplicit
    ? `last ${commits} commits (manual override)`
    : `last ${commits} commits (no usable anchor)`;
}
if (files.length === 0) {
  // 日常静默结果(如窗口里只有 98_Forme/ 自己的产物),不是错误。
  // 但 reface 花了真 codex → 落一行数据点,让额度 mtime 时钟诚实走表。
  if (refaced > 0) {
    appendRunMetric(metricsPath, {
      v: "0", date: at.slice(0, 10), runId,
      proposed: 0, suppressed: 0, presented: 0, rejected: 0, dup: 0,
      head, refaced,
    });
  }
  console.log(`forme runner: no knowledge-layer .md in window ${windowDesc} — nothing to scan` +
    (refaced ? ` (refaced ${refaced})` : ""));
  process.exit(0);
}
console.log(`forme runner ${runId}`);
console.log(`scan: ${files.length} files, window = ${windowDesc}, vault = ${vault}`);

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
  "- stakes:这张卡动的是什么——reversible-ledger(纯账面修正:frontmatter、断链、命名)/ real-world-action(接受后影响 vault 之外的事:对外承诺、要做的事、时间点)/ thought(观点或立场层面的冲突,拿不准就别用)",
  "- recommendationChoice + recommendationReason:你的明确建议(accept/park/reject 之一)+ 一行理由——你已经调查过了,亮明立场,别骑墙",
  "- onAccept:拍板 accept 后会发生什么的一句人话预览(别复述文件路径和回滚说明,系统会补),可 null",
  "- evidence[]:{path(vault 相对), locator(行号/字段/锚点,可 null), quote(逐字摘录,可 null), note(为何是证据,可 null)};标题里每个断言都要有证据",
  "- diff:{file(vault 相对,一张卡只改一个文件), hunks[{locator(可 null), before, after}]};before 必须是文件里逐字存在的字符串,after 是替换;before 为空串表示纯插入;保持最小改动",
  "- estSeconds:估计落子秒数,可 null",
  "",
  "卡面语言(v0.2,世界层优先——**卡面说事,diff 说账**):",
  "- title / summary / whyNow 必须说**用户世界里的事**:什么事没落地、卡着谁、什么时间点要用;哪一行怎么改、在哪个列表里,这些账本细节一律降到 onAccept 与 diff,不许出现在世界层段(会被机器闸检查,命中账本手术词即打回)。",
  "- 反例(真实打回样本):「社媒号确认被塞在已完成的 handle 任务里」——只说了列表手术,没说这件事是什么。",
  "- 正例:「@formehq 社媒号还没确认,8.15 发布要用」——先说世界里什么事悬着,手术细节留给 diff。",
  "- 丰俭随 stakes:reversible-ledger 卡面保持瘦(10 秒可决,一句话账面事实即可);real-world-action 必须给足世界层背景;不要全面加厚——大多数卡应该 10 秒可决。",
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
let illegible = 0;

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

  // #21 世界层闸:账本语域上了世界层段(账本卡豁免)→ 同轮一次重写机会,
  // 仍不过即弃——漂移还在,下轮在世界层 prompt 下重提,不硬塞难读的卡。
  const gate = checkLegibility(card);
  if (!gate.ok) {
    illegible++;
    console.log(`  illegible ${card.id} (${ac.category}) — 账本语域「${gate.hit}」上了世界层段`);
    if (!dryRun) {
      try {
        if (refaceAndWrite(card, { kind: "gate", hit: gate.hit! })) {
          written++;
          console.log(`  rewrite ${card.id} — 世界层重写通过,已入列`);
          continue;
        }
      } catch (e) {
        console.log(`  rewrite 出错 ${card.id} — ${String(e instanceof Error ? e.message : e)}`);
      }
    }
    rejected++;
    console.log(`  reject ${card.id} — 卡面不合格${dryRun ? "(dry-run 不重写)" : ",重写未通过"};弃,下轮重提`);
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
  appendRunMetric(metricsPath, {
    v: "0",
    date: at.slice(0, 10),
    runId,
    proposed: agentCards.length,
    suppressed,
    presented: written,
    rejected,
    dup,
    head, // #14:下轮增量窗口的锚点(本轮扫描时的 vault HEAD)
    ...(illegible ? { illegible } : {}), // #21:世界层闸命中数(legibility 曲线原料)
    ...(refaced ? { refaced } : {}), // #21:question 通道重写数
  });
}

console.log(
  `done: ${written} ${dryRun ? "would-write" : "written"}, ${suppressed} suppressed, ${dup} dup, ${rejected} rejected` +
    (illegible ? `, ${illegible} illegible` : "") +
    (refaced ? `, ${refaced} refaced` : "") +
    ` → ${join(outDir, "cards")}`,
);
