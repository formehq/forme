import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { commitWindowBase, recentMarkdownFiles, markdownFilesSince, slowLayerFiles, vaultHead, isUsableAnchor } from "./scan.ts";
import { agentOutputSchema } from "./agent-schema.ts";
import { cardToMarkdown } from "./mirror.ts";
import { assembleCard } from "./card.ts";
import { loadSuppressionList } from "./suppress.ts";
import { loadTasteRuleLines } from "./taste.ts";
import { appendRunMetric, lastRunAnchor, localDate } from "./metrics.ts";
import {
  buildFreshnessCard,
  detectTimestampFreshness,
  executeTimestampFreshness,
  isFreshnessOnlyDelta,
} from "./freshness.ts";
import { resolveExecutionCommit } from "./execution.ts";
import { checkLegibility } from "./legibility.ts";
import { checkAppliable } from "./hunks.ts";
import { graftFace, needsReface, runRefaceCodex, unansweredQuestions, type RefaceCause } from "./reface.ts";
import { checkCard } from "../schema/validate.ts";
import { isColdStart, coldStartPolicy } from "./cold-start.ts";
import { buildScanPrompt } from "./scan-prompt.ts";
import { parseProposalRuntime, runStructuredAgent } from "../runtime/index.ts";
import type { AgentCard, Card } from "./types.ts";

/**
 * Forme runner. Reads the vault git-delta, asks a READ-ONLY harness runtime
 * to find drift and return structured JSON, then deterministically
 * assembles + validates + fingerprints + writes cards into 98_Forme/. The agent
 * never writes; all provenance and disk writes are Forme code (hard constraint #7).
 *
 * Runtime selection only changes the model/harness boundary. The same
 * scan → assemble → validate → write core applies to Codex and OpenCode.
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
const requestedMaxCards = Number(arg("max-cards", "3"));
const requestedSlowLayer = Number(arg("slow-layer", "0")); // #18:注入 n 篇慢层概念笔记作立场参照
const slowRoot = arg("slow-root", "02_Wiki/")!; // #28:旧安装兼容;新安装按 vault 自动探测
const outDir = arg("out") ?? join(vault, "98_Forme");
const model = arg("model");
const proposalRuntime = parseProposalRuntime(arg("runtime", process.env.FORME_RUNTIME ?? "codex-exec"));
const dryRun = hasFlag("dry-run");
const coldStart = isColdStart(outDir);
const { maxCards, slowLayer } = coldStartPolicy(requestedMaxCards, requestedSlowLayer, coldStart);

// #22:跨 job 串行锁。daily job 与 console 触发的 refresh 是两个进程,launchd
// 的单实例保护跨不过 label——两发并发时守卫时钟(metrics mtime)是 TOCTOU,
// 会双倍烧额度。mkdir 原子抢锁;陈锁(>30min,崩溃残留;一轮 codex 只要几分钟)
// 回收一次再抢;拿不到 = 已有 run 在飞,静默退出(exit 0,不是故障)。
mkdirSync(outDir, { recursive: true });
const lockDir = join(outDir, ".runner.lock");
function acquireLock(): boolean {
  try {
    mkdirSync(lockDir);
    return true;
  } catch {
    try {
      if (Date.now() - statSync(lockDir).mtimeMs > 30 * 60_000) {
        rmSync(lockDir, { recursive: true, force: true });
        mkdirSync(lockDir);
        return true;
      }
    } catch {
      /* 竞争中被别的进程抢走/回收 */
    }
    return false;
  }
}
if (!acquireLock()) {
  console.log("skip: another Forme run is in flight (lock held; serialized by #22)");
  process.exit(0);
}
if (coldStart) {
  console.log(`cold start: no cards/decisions/taste yet; first batch capped at ${maxCards}, slow layer deferred`);
}
process.on("exit", () => {
  try {
    rmSync(lockDir, { recursive: true, force: true });
  } catch {
    /* 已清 */
  }
});
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => process.exit(130));

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
    console.log(`  drop reface ${card.id} — rewritten title or answer is empty`);
    return false;
  }
  const v = checkCard(grafted);
  if (!v.valid) {
    console.log(`  drop reface ${card.id} — ${v.errors.slice(0, 2).join("; ")}`);
    return false;
  }
  const gate = checkLegibility(grafted as unknown as Card);
  if (!gate.ok) {
    console.log(`  drop reface ${card.id} — ledger phrase '${gate.hit}' remains on the world-level face`);
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
    console.log(`questions: ${pendingQuestions.length} card(s) await context (rewrites skipped in dry-run)`);
  } else {
    console.log(`questions: ${pendingQuestions.length} card(s) await context (#21)`);
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
          console.log(`  reface ${q.cardId} — returned to the queue with context (question: '${q.question.slice(0, 40)}')`);
        } else {
          console.log(`  card ${q.cardId} still awaits context; retry next run`);
        }
      } catch (e) {
        console.log(`  reface error ${q.cardId} — ${String(e instanceof Error ? e.message : e)}`);
      }
    }
  }
}

// #14:增量窗口默认「上次成功 run 以来」(锚点 = run-metrics 最后记录的 HEAD),
// 窗口自动等于 run 节律,vault 一天多次 commit 也不漏文件(硬约束 #3 的本意)。
// --commits 显式传参 = 手动覆盖;锚点缺失(首跑/旧数据)或失效(rebase)→ 回退。
let head = vaultHead(vault);
const anchorRef = commitsExplicit ? null : lastRunAnchor(metricsPath);
const anchor = anchorRef?.head ?? (
  anchorRef?.executionId ? resolveExecutionCommit(vault, anchorRef.executionId) : null
);
let files: string[];
let windowDesc: string;
let windowBase: string | null;
if (anchor && isUsableAnchor(vault, anchor)) {
  files = markdownFilesSince(vault, anchor, maxFiles);
  windowDesc = `since last run (${anchor}..${head})`;
  windowBase = anchor;
} else {
  files = recentMarkdownFiles(vault, commits, maxFiles);
  windowDesc = commitsExplicit
    ? `last ${commits} commits (manual override)`
    : `last ${commits} commits (no usable anchor)`;
  windowBase = commitWindowBase(vault, commits);
}
const suppression = loadSuppressionList(join(outDir, "decisions.jsonl"));
let authorized = 0;
if (files.length > 0) {
  const machineNow = new Date();
  const llmFiles: string[] = [];
  for (const file of files) {
    const source = readFileSync(join(vault, file), "utf8");
    const fix = detectTimestampFreshness(source, machineNow);
    if (!fix) {
      llmFiles.push(file);
      continue;
    }
    const freshnessOnly = isFreshnessOnlyDelta(vault, windowBase, file, source);
    const freshnessRunId = `${runId}_clock_${authorized + 1}`;
    const candidate = buildFreshnessCard({ vault, outDir, file, fix, now: machineNow, runId: freshnessRunId });
    if (suppression.fingerprints.has(candidate.fingerprint)) {
      console.log(`freshness: suppress ${candidate.id} — fingerprint already decided`);
      if (!freshnessOnly) llmFiles.push(file);
      continue;
    }
    if (dryRun) {
      console.log(`freshness: [dry] would self-execute ${fix.hunks.length} machine-time correction(s) in ${file} (zero LLM)`);
      if (!freshnessOnly) llmFiles.push(file);
      continue;
    }
    const result = executeTimestampFreshness({ vault, outDir, file, fix, now: machineNow, runId: freshnessRunId });
    authorized++;
    suppression.fingerprints.add(result.card.fingerprint);
    console.log(
      `freshness: self-executed ${fix.hunks.length} correction(s) in ${file} ` +
      `(actor=agent_authorized, execution=${result.executionId}, zero LLM)`,
    );
    if (!freshnessOnly) llmFiles.push(file);
  }
  files = llmFiles;
  if (authorized > 0) head = vaultHead(vault);
}

if (files.length === 0) {
  // 日常静默结果(如窗口里只有 98_Forme/ 自己的产物),不是错误。
  // 但 reface 花了真 codex → 落一行数据点,让额度 mtime 时钟诚实走表。
  if (refaced > 0) {
    appendRunMetric(metricsPath, {
      v: "0", date: localDate(new Date()), runId,
      proposed: 0, suppressed: 0, presented: 0, rejected: 0, dup: 0,
      head, refaced,
    });
  }
  console.log(`forme runner: no remaining knowledge-layer .md in window ${windowDesc} — nothing to scan` +
    (authorized ? ` (self-executed ${authorized} freshness fix${authorized === 1 ? "" : "es"}; freshness path zero LLM)` : "") +
    (refaced ? ` (refaced ${refaced})` : ""));
  process.exit(0);
}
// #18:慢层立场参照——思想漂移住在慢层(概念笔记几周不动,永远进不了
// delta 窗口),claim-drift 需要「最近变更 vs 既有立场」的快慢对照。
// 取窗按日轮转:~len/n 天覆盖全部慢层一遍,不永远盯着最陈旧的同几篇。
const slowFiles = slowLayer > 0
  ? slowLayerFiles(vault, slowLayer, slowRoot, Math.floor(Date.now() / 86_400_000)).filter(
      (f) => !files.includes(f),
    )
  : [];
console.log(`forme runner ${runId}`);
console.log(
  `scan: ${files.length} files, window = ${windowDesc}` +
    (slowFiles.length ? `, slow-layer = ${slowFiles.length}` : "") +
    `, vault = ${vault}`,
);

console.log(
  `suppression list: ${suppression.fingerprints.size} decided fingerprint(s) from ${suppression.events} event(s)` +
    (suppression.unreadable ? ` (${suppression.unreadable} unreadable line(s)!)` : ""),
);

// Taste Rules 注入(#10,生命周期第 2 步):已提炼的规则进 prompt,让提案先过用户口味
const tasteRules = loadTasteRuleLines(join(outDir, "Taste Rules.md"));
if (tasteRules.length) console.log(`taste rules: ${tasteRules.length} rule(s) injected into prompt`);

const prompt = buildScanPrompt({ maxCards, files, slowFiles, slowRoot, tasteRules });
console.log(`${proposalRuntime}: running read-only structured scan (this can take a minute)…`);
const runtimeResult = await runStructuredAgent(proposalRuntime, {
  cwd: vault,
  prompt,
  outputSchema: agentOutputSchema(),
  ...(model ? { model } : {}),
});
const raw = runtimeResult.raw;
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
let unappliable = 0; // #36:accept 干跑失败数(不可执行的卡不入列)
let thoughtWritten = 0; // #18:思想卡每轮 ≤1(认知负载高,不刷屏)

for (const ac of agentCards) {
  const { card, serializable, validation } = assembleCard(ac, { runId, at, model });
  if (!validation.valid) {
    rejected++;
    console.log(`  reject ${ac.category} — ${validation.errors.slice(0, 2).join("; ")}`);
    continue;
  }
  if (suppression.fingerprints.has(card.fingerprint)) {
    suppressed++;
    console.log(`  suppress ${card.id} (${ac.category}) — fingerprint already decided`);
    continue;
  }

  const jsonPath = join(outDir, "cards", `${card.id}.json`);
  if (existsSync(jsonPath)) {
    dup++;
    console.log(`  dup    ${card.id} (${ac.category})`);
    continue;
  }

  // #36 可执行性干跑:accept 时会失败的卡(匹配歧义/内容已漂/纯插入)不入列——
  // 不可执行的提案不该走到人面前才 422;漂移还在,下轮在新 prompt 下重提。
  const appliability = checkAppliable(vault, card);
  if (!appliability.ok) {
    unappliable++;
    rejected++;
    console.log(`  unappliable ${card.id} (${ac.category}) — ${appliability.error}`);
    continue;
  }

  // #18 思想卡节流:每轮最多 1 张(prompt 恳求之外的机器闸)
  if (card.stakes === "thought" && thoughtWritten >= 1) {
    rejected++;
    console.log(`  throttle ${card.id} (${ac.category}) — at most one thought card per run`);
    continue;
  }

  // #21 世界层闸:账本语域上了世界层段(账本卡豁免)→ 同轮一次重写机会,
  // 仍不过即弃——漂移还在,下轮在世界层 prompt 下重提,不硬塞难读的卡。
  const gate = checkLegibility(card);
  if (!gate.ok) {
    illegible++;
    console.log(`  illegible ${card.id} (${ac.category}) — ledger phrase '${gate.hit}' reached the world-level face`);
    if (!dryRun) {
      try {
        if (refaceAndWrite(card, { kind: "gate", hit: gate.hit! })) {
          written++;
          if (card.stakes === "thought") thoughtWritten++;
          console.log(`  rewrite ${card.id} — world-level rewrite passed and entered the queue`);
          continue;
        }
      } catch (e) {
        console.log(`  rewrite error ${card.id} — ${String(e instanceof Error ? e.message : e)}`);
      }
    }
    rejected++;
    console.log(`  reject ${card.id} — face failed${dryRun ? " (rewrite skipped in dry-run)" : " after rewrite"}; retry next run`);
    continue;
  }

  if (dryRun) {
    written++;
    if (card.stakes === "thought") thoughtWritten++;
    console.log(`  [dry]  ${card.id} (${ac.category}) — ${ac.title}`);
    continue;
  }
  writeFileSync(jsonPath, JSON.stringify(serializable, null, 2) + "\n");
  writeFileSync(join(outDir, "cards", `${card.id}.md`), cardToMarkdown(card));
  written++;
  if (card.stakes === "thought") thoughtWritten++;
  console.log(`  write  ${card.id} (${ac.category}) — ${ac.title}`);
}

if (!dryRun) {
  appendRunMetric(metricsPath, {
    v: "0",
    date: localDate(new Date()), // #25:本地日切
    runId,
    proposed: agentCards.length,
    suppressed,
    presented: written,
    rejected,
    dup,
    head, // #14:下轮增量窗口的锚点(本轮扫描时的 vault HEAD)
    ...(illegible ? { illegible } : {}), // #21:世界层闸命中数(legibility 曲线原料)
    ...(unappliable ? { unappliable } : {}), // #36:可执行性闸命中数
    ...(refaced ? { refaced } : {}), // #21:question 通道重写数
    ...(thoughtWritten ? { thought: thoughtWritten } : {}), // #18:思想卡入列数(认知含量原料)
  });
}

console.log(
  `done: ${written} ${dryRun ? "would-write" : "written"}, ${suppressed} suppressed, ${dup} dup, ${rejected} rejected` +
    (illegible ? `, ${illegible} illegible` : "") +
    (unappliable ? `, ${unappliable} unappliable` : "") +
    (refaced ? `, ${refaced} refaced` : "") +
    ` → ${join(outDir, "cards")}`,
);
