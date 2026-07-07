import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

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
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now.getTime() - days * 86_400_000);
  const from = fromDate.toISOString().slice(0, 10);

  const log = execFileSync(
    "git",
    ["-C", vault, "log", `--since=${fromDate.toISOString()}`, "--name-status", "--format=@%h\t%ad\t%s", "--date=short"],
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
        if (e.ts && e.ts.slice(0, 10) >= from) decisionsThisWeek++;
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
        if (c.id && !decided.has(c.id)) pendingCards.push({ id: c.id, title: c.title ?? "(无标题)" });
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
  const seg = (v: string) => (v.trim() ? v.trim() : "——（本周无）");
  const mmdd = (d: string) => d.slice(5);
  return [
    "---",
    "forme: state-diff",
    `window: "${meta.from} → ${meta.to}"`,
    `origin: { agent: "codex", runId: "${meta.runId}", at: "${meta.at}" }`,
    "---",
    "",
    `# 本周（${mmdd(meta.from)} → ${mmdd(meta.to)}）`,
    "",
    `**进来了什么**:${seg(s.into)}`,
    "",
    `**变了什么**:${seg(s.changed)}`,
    "",
    `**什么在等你决定**:${seg(s.waiting)}`,
    "",
    `**警报**:${seg(s.alerts)}`,
    "",
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

  const prompt = [
    "你是 Forme 的 State Diff 叙事器。下面是 vault 主人这一周的确定性数据包(全部可核查),把它写成四段一屏叙事。",
    "",
    "语气(交互稿屏 3):平静同事腔、第一人称我/你、零催促、只读——没有任何要求动作的字眼;总量读完 ≤90 秒(四段合计 ≤350 字);具体数字直接用数据包里的,不要编造。",
    "",
    "四段各自要什么:",
    "- into(进来了什么):新增文件/输入的实质,不是文件名罗列;Inbox 有积压就点到",
    "- changed(变了什么):这周真实发生的演化叙事(从 commit subjects 提炼主线,可用 → 串联)",
    "- waiting(什么在等你决定):待决卡(标题列出)+ 数据包之外你在 vault 里看到的明确 open decision(如 Console 的「等 Zayn 决定」小节;只读)",
    "- alerts(警报):异常信号,如 meta-work canary(Reports:Posts 比值)、长期未动的承诺;没有就返回空串",
    "",
    "数据包:",
    JSON.stringify(data, null, 2),
    "",
    "你在 vault 只读沙箱里,可翻任何文件核对。只返回符合 output schema 的 JSON(into/changed/waiting/alerts 四个字符串,markdown 行内语法可用)。",
  ].join("\n");

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
  const body = md.slice(md.indexOf("# 本周"));
  if (body.length > 1600) console.warn(`warn: body ${body.length} chars — 可能超 90 秒预算`);

  const outPath = join(outDir, `state-diff-${data.to}.md`);
  if (dryRun) {
    console.log(`[dry] would write ${outPath}:\n\n${md}`);
    return;
  }
  writeFileSync(outPath, md);
  console.log(`wrote ${outPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
