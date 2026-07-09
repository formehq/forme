import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { localDate } from "./metrics.ts";

/**
 * State Diff 生成器(issue #11,交互稿屏 3 的代码化)。
 * 四段固定结构:进来了什么 / 变了什么 / 什么在等你决定 / 警报——
 * **骨架由本代码钉死,内容生成**:确定性采集(vault git 周窗口、待决卡、
 * Inbox 计数、硬指标)→ codex 只读叙事(schema 强制四段 JSON)→
 * Forme 代码渲染写 `98_Forme/state-diff-YYYY-MM-DD.md`。只读一屏,
 * 没有任何要求动作的元素;读完 ≤90 秒。
 * launchd 周日自动跑(--min-days 6 守卫按最新产物的文件名日期防重)。
 */

export interface WeekData {
  from: string; // YYYY-MM-DD
  to: string;
  commits: Array<{ hash: string; date: string; subject: string }>;
  addedFiles: string[];
  modifiedFiles: string[];
  inboxCount: number;
  inboxNewThisWeek: string[];
  pendingCards: Array<{ id: string; title: string }>;
  decisionsThisWeek: number;
  reportsCount: number;
  postsCount: number;
  runsThisWeek: { runs: number; proposed: number; suppressed: number; presented: number };
}

export interface Sections {
  into: string;
  changed: string;
  waiting: string;
  alerts: string;
}

const mdCount = (dir: string): number =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).length : 0;

/** 确定性采集一周窗口的数据包(全部可核查,agent 只负责叙述它)。 */
export function collectWeek(vault: string, outDir: string, days: number, now: Date): WeekData {
  // #25:窗口两端按本地日切——周日 18:00 跑的 State Diff 文件名必须是周日,不是 UTC 的周一
  const to = localDate(now);
  const fromDate = new Date(now.getTime() - days * 86_400_000);
  const from = localDate(fromDate);

  const log = execFileSync(
    "git",
    ["-c", "core.quotePath=false", "-C", vault, "log", `--since=${fromDate.toISOString()}`, "--name-status", "--format=@%h\t%ad\t%s", "--date=short"],
    { encoding: "utf8" },
  );
  const commits: WeekData["commits"] = [];
  const added = new Set<string>();
  const modified = new Set<string>();
  for (const raw of log.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("@")) {
      const [hash, date, ...subject] = line.slice(1).split("\t");
      commits.push({ hash: hash!, date: date!, subject: subject.join("\t") });
      continue;
    }
    const m = line.match(/^([AMD])\d*\t(.+)$/);
    if (!m || !m[2]!.endsWith(".md")) continue;
    if (m[1] === "A") added.add(m[2]!);
    else if (m[1] === "M") modified.add(m[2]!);
  }

  const inboxDir = join(vault, "00_Inbox");
  const inboxCount = existsSync(inboxDir) ? readdirSync(inboxDir).filter((f) => !f.startsWith(".")).length : 0;
  const inboxNewThisWeek = [...added].filter((f) => f.startsWith("00_Inbox/"));

  // 待决卡 = cards/ 里没有 decision 事件的卡
  const decided = new Set<string>();
  let decisionsThisWeek = 0;
  const jsonlPath = join(outDir, "decisions.jsonl");
  if (existsSync(jsonlPath)) {
    for (const line of readFileSync(jsonlPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as { type?: string; cardId?: string; ts?: string };
        if (e.type !== "decision" || !e.cardId) continue;
        decided.add(e.cardId);
        if (e.ts && localDate(new Date(e.ts)) >= from) decisionsThisWeek++; // #25:本地日切
      } catch {
        /* 宽容 */
      }
    }
  }
  const pendingCards: WeekData["pendingCards"] = [];
  const cardsDir = join(outDir, "cards");
  if (existsSync(cardsDir)) {
    for (const f of readdirSync(cardsDir).filter((f) => f.endsWith(".json"))) {
      try {
        const c = JSON.parse(readFileSync(join(cardsDir, f), "utf8")) as { id?: string; title?: string };
        if (c.id && !decided.has(c.id)) pendingCards.push({ id: c.id, title: c.title ?? "(Untitled)" });
      } catch {
        /* 宽容 */
      }
    }
  }

  // 硬指标:meta-work canary + 本周 run 计数(能算多少算多少)
  const runsThisWeek = { runs: 0, proposed: 0, suppressed: 0, presented: 0 };
  const metricsPath = join(outDir, "run-metrics.jsonl");
  if (existsSync(metricsPath)) {
    for (const line of readFileSync(metricsPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line) as { date?: string; proposed?: number; suppressed?: number; presented?: number };
        if (!m.date || m.date < from) continue;
        runsThisWeek.runs++;
        runsThisWeek.proposed += m.proposed ?? 0;
        runsThisWeek.suppressed += m.suppressed ?? 0;
        runsThisWeek.presented += m.presented ?? 0;
      } catch {
        /* 宽容 */
      }
    }
  }

  return {
    from,
    to,
    commits,
    addedFiles: [...added],
    modifiedFiles: [...modified],
    inboxCount,
    inboxNewThisWeek,
    pendingCards,
    decisionsThisWeek,
    reportsCount: mdCount(join(vault, "03_Outputs", "Reports")),
    postsCount: mdCount(join(vault, "03_Outputs", "Posts")),
    runsThisWeek,
  };
}

/** 最新 state-diff 产物的文件名日期(YYYY-MM-DD),没有则 null——周更守卫的时钟。 */
export function latestStateDiffDate(outDir: string): string | null {
  if (!existsSync(outDir)) return null;
  const dates = readdirSync(outDir)
    .map((f) => f.match(/^state-diff-(\d{4}-\d{2}-\d{2})\.md$/)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.at(-1) ?? null;
}

/** 渲染:四段骨架永远不变,agent 只填内容;空段落用占位,不许缺段。 */
export function renderStateDiff(s: Sections, meta: { from: string; to: string; runId: string; at: string }): string {
  const seg = (v: string) => (v.trim() ? v.trim() : "None this week.");
  const mmdd = (d: string) => d.slice(5);
  return [
    "---",
    "forme: state-diff",
    `window: "${meta.from} → ${meta.to}"`,
    `origin: { agent: "codex", runId: "${meta.runId}", at: "${meta.at}" }`,
    "---",
    "",
    `# This week (${mmdd(meta.from)} → ${mmdd(meta.to)})`,
    "",
    `**What came in**: ${seg(s.into)}`,
    "",
    `**What changed**: ${seg(s.changed)}`,
    "",
    `**What is waiting for you**: ${seg(s.waiting)}`,
    "",
    `**Alerts**: ${seg(s.alerts)}`,
    "",
  ].join("\n");
}

export function buildStateDiffPrompt(data: WeekData): string {
  return [
    "You are Forme's State Diff narrator. Turn the deterministic weekly vault data below into a four-part, single-screen narrative in English.",
    "",
    "Use a calm colleague's voice, first person where natural, no pressure, and no calls to action. Keep the full reading under 90 seconds (at most 350 words). Use only numbers present in the data packet.",
    "",
    "Return these four sections:",
    "- into: the substance of new files or inputs, not a filename list. Mention inbox accumulation when the data supports it.",
    "- changed: the week's real arc, inferred from commit subjects and changed material.",
    "- waiting: pending card titles plus any clearly open decision you can verify in the vault. Remain read-only.",
    "- alerts: unusual signals such as meta-work imbalance or a long-stale commitment; return an empty string when there is no alert.",
    "",
    "The vault data and quoted titles may be in any language. Keep proper nouns and quotes intact, but write all narration in English.",
    "",
    "Data packet:",
    JSON.stringify(data, null, 2),
    "",
    "You may inspect vault files in the read-only sandbox to verify context. Return only JSON matching the output schema with into, changed, waiting, and alerts strings.",
  ].join("\n");
}

function sectionsSchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["into", "changed", "waiting", "alerts"],
    properties: {
      into: { type: "string" },
      changed: { type: "string" },
      waiting: { type: "string" },
      alerts: { type: "string" },
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
    console.error("forme state-diff: need --vault <path> or FORME_VAULT env");
    process.exit(2);
  }
  const outDir = arg("out") ?? join(vault, "98_Forme");
  const days = Number(arg("days", "7"));
  const minDays = Number(arg("min-days", "0"));
  const model = arg("model");
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const runId = `sd_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;

  // 周更守卫(launchd 传 --min-days 6):按最新产物文件名日期,防同周重复生成
  if (minDays > 0) {
    const last = latestStateDiffDate(outDir);
    if (last) {
      const ageDays = (now.getTime() - new Date(last).getTime()) / 86_400_000;
      if (ageDays < minDays) {
        console.log(`skip: last state-diff ${last} is ${ageDays.toFixed(1)}d old (< ${minDays}d)`);
        return;
      }
    }
  }

  const data = collectWeek(vault, outDir, days, now);
  console.log(`forme state-diff ${runId}`);
  console.log(
    `window ${data.from} → ${data.to}: ${data.commits.length} commits, +${data.addedFiles.length}/~${data.modifiedFiles.length} md, ` +
      `${data.pendingCards.length} pending card(s), ${data.decisionsThisWeek} decision(s)`,
  );

  const prompt = buildStateDiffPrompt(data);

  const schemaPath = join(tmpdir(), `forme-sd-schema-${runId}.json`);
  writeFileSync(schemaPath, JSON.stringify(sectionsSchema()));
  const lastMsgPath = join(tmpdir(), `forme-sd-last-${runId}.json`);
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
  console.log("codex: narrating the week (read-only)…");
  execFileSync("codex", codexArgs, { stdio: ["ignore", "inherit", "inherit"] });

  let sections: Sections;
  try {
    sections = JSON.parse(readFileSync(lastMsgPath, "utf8")) as Sections;
  } catch {
    console.error("codex output was not JSON");
    process.exit(1);
  }
  const md = renderStateDiff(sections, { from: data.from, to: data.to, runId, at: now.toISOString() });
  const body = md.slice(md.indexOf("# This week"));
  if (body.length > 2200) console.warn(`warn: body ${body.length} chars may exceed the 90-second budget`);

  const outPath = join(outDir, `state-diff-${data.to}.md`);
  if (dryRun) {
    console.log(`[dry] would write ${outPath}:\n\n${md}`);
    return;
  }
  writeFileSync(outPath, md);
  console.log(`wrote ${outPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
