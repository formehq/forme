import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import { applyHunksToContent, ApplyError } from "./apply.ts";
import { checkAppliable } from "../runner/hunks.ts";
import { appendEvent, readEvents, pendingCards, queueState, catchUpData, metricsData, effectiveDecisions } from "./store.ts";
import { createConsoleServer } from "./server.ts";
import { assembleCard } from "../runner/card.ts";
import { detectTimestampFreshness, executeTimestampFreshness } from "../runner/freshness.ts";
import type { AgentCard, Card } from "../runner/types.ts";

/* ---------- 纯函数:hunk 应用 ---------- */

test("applyHunksToContent:唯一匹配替换;多 hunk 顺序应用", () => {
  const out = applyHunksToContent("a1\nb2\nc3\n", [
    { before: "a1", after: "A1" },
    { before: "c3", after: "C3" },
  ]);
  assert.equal(out, "A1\nb2\nC3\n");
});

test("applyHunksToContent:before 已不存在(内容又漂了)→ 整卡失败", () => {
  assert.throws(() => applyHunksToContent("x\n", [{ before: "不在了", after: "y" }]), ApplyError);
});

test("applyHunksToContent:多处匹配 + 行号 locator 消歧;无 locator 则拒绝", () => {
  const content = "- 条目\n中间\n- 条目\n";
  assert.throws(() => applyHunksToContent(content, [{ before: "- 条目", after: "- 改" }]), ApplyError);
  const out = applyHunksToContent(content, [{ locator: "L3", before: "- 条目", after: "- 改" }]);
  assert.equal(out, "- 条目\n中间\n- 改\n");
});

test("applyHunksToContent:纯插入(before 为空)v0 拒绝自动应用", () => {
  assert.throws(() => applyHunksToContent("x\n", [{ before: "", after: "插入" }]), ApplyError);
});

test("applyHunksToContent(#36):all=true 替换每一处;0 处仍算 stale 整卡失败", () => {
  const content = "[[a](u)] x [[a](u)]\n[[a](u)]\n";
  const out = applyHunksToContent(content, [{ before: "[[a](u)]", after: "[a](u)", all: true }]);
  assert.equal(out, "[a](u) x [a](u)\n[a](u)\n");
  assert.throws(() => applyHunksToContent("x\n", [{ before: "不在了", after: "y", all: true }]), ApplyError);
  // all 只对自己那个 hunk 生效,后续 hunk 语义不变(多处无消歧仍拒绝)
  assert.throws(
    () => applyHunksToContent("k k\n", [{ before: "k", after: "K" }]),
    ApplyError,
  );
});

test("checkAppliable(#36):入列前干跑——可执行放行,歧义/文件不存在打回", () => {
  const vault = mkdtempSync(join(tmpdir(), "forme-appl-"));
  writeFileSync(join(vault, "note.md"), "same\nsame\n");
  const cardFor = (hunks: object[], file = "note.md") =>
    ({ diff: { file, hunks } }) as unknown as Card;
  assert.equal(checkAppliable(vault, cardFor([{ before: "same", after: "改", all: true }])).ok, true);
  const ambiguous = checkAppliable(vault, cardFor([{ before: "same", after: "改" }]));
  assert.equal(ambiguous.ok, false);
  assert.match((ambiguous as { error: string }).error, /appears 2 times/);
  assert.equal(checkAppliable(vault, cardFor([{ before: "x", after: "y" }], "gone.md")).ok, false);
});

/* ---------- 事件门:console 自己的写路径不宽容 ---------- */

test("appendEvent:不合法事件被 AJV 门拦下,绝不落盘", () => {
  const p = join(mkdtempSync(join(tmpdir(), "forme-evt-")), "decisions.jsonl");
  assert.throws(() =>
    appendEvent(p, {
      v: "0", ts: new Date().toISOString(), type: "decision",
      cardId: "c1", fingerprint: "a".repeat(64),
      choice: "accept", actor: "owner", // 缺 latencyMs 且未标 backfilled → 非法
    }),
  );
  assert.equal(existsSync(p), false);
});

/* ---------- fixture:临时 git vault + 真组装的卡 ---------- */

function mkVault(): string {
  const repo = mkdtempSync(join(tmpdir(), "forme-con-"));
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  for (const [f, body] of [
    ["note-a.md", "# A\n\nupdated: 2026-07-04\n\n正文。\n"],
    ["note-b.md", "# B\n\n- [ ] 待办一\n"],
    ["note-c.md", "# C\n\n旧口径的一句话。\n"],
    ["note-d.md", "# D\n\n再一句旧话。\n"],
    ["note-e.md", "# E\n\n第五句。\n"],
  ] as const) {
    writeFileSync(join(repo, f), body);
  }
  git("add", "-A");
  git("commit", "-qm", "seed vault");
  mkdirSync(join(repo, "98_Forme", "cards"), { recursive: true });
  return repo;
}

function seedCard(repo: string, category: string, file: string, before: string, after: string): Card {
  const ac: AgentCard = {
    category,
    title: `测试卡:${file}`,
    summary: null,
    whyNow: "测试场景",
    recommendationChoice: "accept",
    recommendationReason: "测试推荐",
    onAccept: null,
    evidence: [{ path: file, locator: null, quote: null, note: null }],
    diff: { file, hunks: [{ locator: null, before, after, all: null }] },
    estSeconds: 10,
    stakes: null,
  };
  const { card, serializable, validation } = assembleCard(ac, { runId: "run_test", at: "2026-07-07T00:00:00.000Z" });
  assert.equal(validation.valid, true, validation.errors.join("; "));
  writeFileSync(join(repo, "98_Forme", "cards", `${card.id}.json`), JSON.stringify(serializable, null, 2) + "\n");
  return card;
}

async function startServer(vault: string, extra: Partial<Parameters<typeof createConsoleServer>[0]> = {}) {
  const server = createConsoleServer({ vault, ...extra });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const get = async (p: string) => (await fetch(base + p)).json();
  const post = async (p: string, body: unknown, ct = "application/json") => {
    const r = await fetch(base + p, { method: "POST", headers: { "content-type": ct }, body: JSON.stringify(body) });
    return { status: r.status, data: (await r.json()) as Record<string, unknown> };
  };
  return { server, base, get, post, close: () => new Promise((r) => server.close(r)) };
}

/* ---------- 端到端:完整落子流(真 HTTP、真 git、真 AJV) ---------- */

test("console 端到端:presented → accept/park/correction/backfilled 四种落子路径", async () => {
  const vault = mkVault();
  const jsonl = join(vault, "98_Forme", "decisions.jsonl");
  const cardA = seedCard(vault, "stale-frontmatter", "note-a.md", "updated: 2026-07-04", "updated: 2026-07-07");
  const cardB = seedCard(vault, "dangling-task", "note-b.md", "- [ ] 待办一", "- [x] 待办一");
  const cardC = seedCard(vault, "stale-claim", "note-c.md", "旧口径的一句话。", "agent 起草的新话。");
  const cardD = seedCard(vault, "stale-claim", "note-d.md", "再一句旧话。", "新话。");
  const t = await startServer(vault);
  try {
    // 页面与投影
    const page = await fetch(t.base + "/");
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /Review cards|forme/);
    // #26-A/#27:人话表面 + 未提交草稿的两条预防性护栏常驻页面脚本
    assert.match(pageHtml, /Open task/);
    assert.match(pageHtml, /What is off\?/);
    assert.match(pageHtml, /Proposed result/);
    assert.match(pageHtml, /Original \(expand to compare\)/);
    assert.match(pageHtml, /Accept original, keep text as note/);
    assert.match(pageHtml, /Discard it and close/);
    assert.match(pageHtml, /Unused revision draft/);
    assert.match(pageHtml, /A note on Park hands this back to your agent for review/);
    assert.match(pageHtml, /Ask without deciding/);
    assert.match(pageHtml, /<kbd>u<\/kbd>Undo/);
    assert.match(pageHtml, /Cognitive mix/);
    assert.doesNotMatch(pageHtml, /before 必须原样匹配/);
    let state = (await t.get("/api/state")) as { pending: Card[]; catchUp: { pending: { count: number }; sinceTs: string | null } };
    assert.equal(state.pending.length, 4);
    assert.equal(state.catchUp.pending.count, 4);
    assert.equal(state.catchUp.sinceTs, null); // 还没有任何事件 = 第一次来

    // ① accept:presented → decide → diff 应用 + git 回执 + latency 真值
    assert.equal((await t.post("/api/presented", { cardId: cardA.id })).status, 200);
    writeFileSync(join(vault, "98_Forme", "run-metrics.jsonl"), JSON.stringify({
      v: "0", date: "2026-07-07", runId: "r_accept", proposed: 4,
      suppressed: 0, presented: 4, rejected: 0, dup: 0,
    }) + "\n");
    const acc = await t.post("/api/decide", { cardId: cardA.id, choice: "accept" });
    assert.equal(acc.status, 200, JSON.stringify(acc.data));
    assert.match(String(acc.data.executed), /^[0-9a-f]{7,40}$/);
    assert.ok(Number(acc.data.latencyMs) >= 0);
    assert.match(readFileSync(join(vault, "note-a.md"), "utf8"), /updated: 2026-07-07/);
    const subject = execFileSync("git", ["-C", vault, "log", "-1", "--format=%s"], { encoding: "utf8" });
    assert.match(subject, new RegExp(`forme: accept ${cardA.id}`));
    const committed = execFileSync("git", ["-C", vault, "show", "--format=", "--name-only", "HEAD"], { encoding: "utf8" });
    for (const path of [
      "note-a.md",
      `98_Forme/cards/${cardA.id}.json`,
      "98_Forme/decisions.jsonl",
      "98_Forme/run-metrics.jsonl",
    ]) assert.ok(committed.split("\n").includes(path), `${path} was not in the atomic accept commit`);
    const acceptedEvent = readEvents(jsonl).find((e) => e.type === "decision" && e.cardId === cardA.id)!;
    assert.match(acceptedEvent.executionId ?? "", /^exec_/);
    assert.equal(acceptedEvent.executed, undefined);
    // 已落子的卡再打 → 409(队列投影也随之更新)
    assert.equal((await t.post("/api/decide", { cardId: cardA.id, choice: "accept" })).status, 409);
    state = (await t.get("/api/state")) as typeof state;
    assert.equal(state.pending.length, 3);

    // ② park:只记事件,文件一个字不动
    await t.post("/api/presented", { cardId: cardB.id });
    assert.equal((await t.post("/api/decide", { cardId: cardB.id, choice: "park" })).status, 200);
    assert.match(readFileSync(join(vault, "note-b.md"), "utf8"), /- \[ \] 待办一/);

    // ③ correction:先记 correction 事件,再按修正后的 hunks 应用
    await t.post("/api/presented", { cardId: cardC.id });
    const corr = await t.post("/api/decide", {
      cardId: cardC.id,
      choice: "accept",
      note: "按我的版本接受",
      correction: { hunks: [{ before: "旧口径的一句话。", after: "我自己的口径。" }], note: "用我的 voice" },
    });
    assert.equal(corr.status, 200, JSON.stringify(corr.data));
    assert.match(readFileSync(join(vault, "note-c.md"), "utf8"), /我自己的口径。/);

    // ④ 没有 presented 的落子(绕过 console 的路径)→ backfilled,不编造延迟
    const back = await t.post("/api/decide", { cardId: cardD.id, choice: "reject" });
    assert.equal(back.status, 200);
    assert.equal(back.data.latencyMs, null);

    // 事件日志复查:全部行过完整 schema 门,顺序与语义正确
    const events = readEvents(jsonl);
    const types = events.map((e) => e.type);
    assert.deepEqual(types, ["presented", "decision", "presented", "decision", "presented", "correction", "decision", "decision"]);
    const decC = events.filter((e) => e.cardId === cardC.id);
    assert.equal(decC[1]!.type, "correction");
    assert.equal(decC[1]!.correction!.note, "用我的 voice");
    assert.equal(decC[2]!.choice, "accept");
    assert.equal(decC[2]!.note, "按我的版本接受");
    assert.ok(decC[2]!.latencyMs! >= 0);
    const decD = events.find((e) => e.cardId === cardD.id && e.type === "decision")!;
    assert.equal(decD.backfilled, true);
    assert.equal(decD.latencyMs, undefined);
    assert.equal(pendingCards(join(vault, "98_Forme"), events).length, 0);

    // catch-up 数据包:落子之后再来,sinceTs 有值、decidedTotal=4
    const cu = catchUpData(vault, join(vault, "98_Forme"), new Date());
    assert.equal(cu.decidedTotal, 4);
    assert.ok(cu.sinceTs);
  } finally {
    await t.close();
  }
});

test("console 拒绝不干净的目标文件:回执 commit 不裹挟用户未提交的编辑", async () => {
  const vault = mkVault();
  const card = seedCard(vault, "stale-claim", "note-e.md", "第五句。", "改过的第五句。");
  appendFileSync(join(vault, "note-e.md"), "用户没提交的手改。\n");
  const t = await startServer(vault);
  try {
    const r = await t.post("/api/decide", { cardId: card.id, choice: "accept" });
    assert.equal(r.status, 422);
    assert.match(String(r.data.error), /uncommitted changes/);
    // 文件除用户手改外原样;没有 decision 事件,卡还在队列里
    assert.match(readFileSync(join(vault, "note-e.md"), "utf8"), /第五句。/);
    const events = readEvents(join(vault, "98_Forme", "decisions.jsonl"));
    assert.equal(events.filter((e) => e.type === "decision").length, 0);
    const state = (await t.get("/api/state")) as { pending: Card[] };
    assert.equal(state.pending.length, 1);
  } finally {
    await t.close();
  }
});

test("wake-catchup(#16):旧状态先渲染(freshness.asOf),refresh 后台跑、去抖、完成后投影更新", async () => {
  const vault = mkVault();
  const metricsPath = join(vault, "98_Forme", "run-metrics.jsonl");
  const logPath = join(vault, "refresh-test.log");
  // 假「后台 runner」:睡 300ms 后追加一行 run-metrics(模拟真实 run 完成动 asOf 时钟)
  const fakeCmd = [
    process.execPath,
    "-e",
    'setTimeout(() => { require("node:fs").appendFileSync(process.argv[1], JSON.stringify({v:"0",date:"2026-07-07",runId:"r_bg",proposed:0,suppressed:0,presented:0,rejected:0,dup:0,head:"abc"}) + "\\n"); }, 300)',
    metricsPath,
  ];
  const t = await startServer(vault, { refreshCmd: fakeCmd, refreshLog: logPath });
  try {
    // 从未真跑过:asOf null,页面照样能渲染(旧状态优先,不等扫描)
    const projectionStarted = performance.now();
    const initialResponse = await fetch(t.base + "/api/state");
    const initialElapsed = performance.now() - projectionStarted;
    assert.equal(initialResponse.status, 200);
    assert.ok(initialElapsed < 10_000, `initial state projection took ${initialElapsed.toFixed(1)}ms`);
    assert.match(initialResponse.headers.get("server-timing") ?? "", /^forme-state;dur=\d+(?:\.\d+)?$/);
    let s = (await initialResponse.json()) as { product: string; freshness: { asOf: string | null; refreshing: boolean } };
    assert.equal(s.product, "forme");
    assert.equal(s.freshness.asOf, null);
    assert.equal(s.freshness.refreshing, false);

    // 触发刷新:started;去抖:第二次 already;期间 refreshing = true
    const r1 = await t.post("/api/refresh", {});
    assert.equal(r1.status, 200);
    assert.equal(r1.data.started, true);
    const r2 = await t.post("/api/refresh", {});
    assert.equal(r2.data.already, true);
    s = (await t.get("/api/state")) as typeof s;
    assert.equal(s.freshness.refreshing, true);

    // 完成后:refreshing 归零、exitCode 0、asOf 从 null 变为真时刻(投影自然更新)
    await new Promise((r) => setTimeout(r, 700));
    const s2 = (await t.get("/api/state")) as {
      freshness: { asOf: string | null; refreshing: boolean; lastRefresh: { exitCode: number | null } };
    };
    assert.equal(s2.freshness.refreshing, false);
    assert.equal(s2.freshness.lastRefresh.exitCode, 0);
    assert.ok(s2.freshness.asOf);
    // 完成后可再次触发(新一轮 started,不是 already)
    assert.equal((await t.post("/api/refresh", {})).data.started, true);
  } finally {
    await t.close();
  }
});

test("question 通道(#21):问 → 待补 context 退出队列 → reface 回场 → 落子,全往返", async () => {
  const vault = mkVault();
  const outDir = join(vault, "98_Forme");
  const jsonl = join(outDir, "decisions.jsonl");
  const card = seedCard(vault, "stale-claim", "note-c.md", "旧口径的一句话。", "新话。");
  const t = await startServer(vault);
  try {
    // 上屏后发问:不是 decision——指纹不进已决名单
    await t.post("/api/presented", { cardId: card.id });
    const q = await t.post("/api/question", { cardId: card.id, question: "这句话现在还有人引用吗?" });
    assert.equal(q.status, 200, JSON.stringify(q.data));
    let events = readEvents(jsonl);
    const qe = events.find((e) => e.type === "question")!;
    assert.equal(qe.question, "这句话现在还有人引用吗?");
    assert.equal(qe.cardId, card.id);

    // 卡进入待补 context 态:退出可决队列,但没被永久抑制
    let queue = queueState(outDir, events);
    assert.equal(queue.pending.length, 0);
    assert.equal(queue.awaiting.length, 1);
    assert.equal(queue.awaiting[0]!.id, card.id);
    const cu = catchUpData(vault, outDir, new Date());
    assert.equal(cu.pending.count, 0);
    assert.equal(cu.awaitingContext, 1);
    // 待补态的卡不可落子(它不在可决队列里)
    assert.equal((await t.post("/api/decide", { cardId: card.id, choice: "accept" })).status, 409);

    // 模拟下一轮 runner reface:同 id 同指纹,卡面带上问答,revisedAt 晚于提问
    const cardPath = join(outDir, "cards", `${card.id}.json`);
    const onDisk = JSON.parse(readFileSync(cardPath, "utf8")) as Card;
    onDisk.title = "这句旧口径还挂在对外文档里";
    onDisk.revisedAt = new Date(Date.now() + 60_000).toISOString();
    onDisk.context = { question: "这句话现在还有人引用吗?", answer: "对外 README 还在引用这一段,口径不改就继续扩散。" };
    writeFileSync(cardPath, JSON.stringify(onDisk, null, 2) + "\n");

    // 卡回到可决队列(同指纹,不算重复),带着问答;正常落子收尾
    queue = queueState(outDir, readEvents(jsonl));
    assert.equal(queue.pending.length, 1);
    assert.equal(queue.pending[0]!.context!.answer.includes("README"), true);
    await t.post("/api/presented", { cardId: card.id });
    const dec = await t.post("/api/decide", { cardId: card.id, choice: "accept" });
    assert.equal(dec.status, 200, JSON.stringify(dec.data));
    assert.ok(Number(dec.data.latencyMs) >= 0);
    events = readEvents(jsonl);
    assert.deepEqual(events.map((e) => e.type), ["presented", "question", "presented", "decision"]);

    // question 事件门:空问题 400;已决卡再问 409
    assert.equal((await t.post("/api/question", { cardId: card.id, question: "  " })).status, 409); // 已落子
    const card2 = seedCard(vault, "stale-claim", "note-d.md", "再一句旧话。", "新话。");
    assert.equal((await t.post("/api/question", { cardId: card2.id, question: "" })).status, 400);
    assert.equal((await t.post("/api/question", { cardId: "card_nope", question: "?" })).status, 409);
  } finally {
    await t.close();
  }
});

test("metricsData(#19):时延中位数取现场真值,backfilled 不计;重复率按轮累计", () => {
  const vault = mkVault();
  const outDir = join(vault, "98_Forme");
  const jsonl = join(outDir, "decisions.jsonl");
  const fp = (c: string) => c.repeat(64);
  seedCard(vault, "stale-frontmatter", "note-a.md", "updated: 2026-07-04", "updated: 2026-07-08"); // → 账本
  seedCard(vault, "dangling-task", "note-b.md", "- [ ] 待办一", "- [x] 待办一"); // → 行动
  for (const e of [
    { v: "0", ts: "2026-07-08T01:00:00Z", type: "presented", cardId: "c1", fingerprint: fp("a") },
    { v: "0", ts: "2026-07-08T01:00:10Z", type: "decision", cardId: "c1", fingerprint: fp("a"), choice: "accept", actor: "owner", latencyMs: 10_000, executed: "abcdef1" },
    { v: "0", ts: "2026-07-08T01:01:00Z", type: "question", cardId: "c2", fingerprint: fp("b"), question: "?" },
    { v: "0", ts: "2026-07-08T02:00:00Z", type: "decision", cardId: "c3", fingerprint: fp("c"), choice: "park", actor: "owner", latencyMs: 30_000 },
    { v: "0", ts: "2026-07-08T03:00:00Z", type: "decision", cardId: "c4", fingerprint: fp("d"), choice: "reject", actor: "owner", backfilled: true },
  ]) {
    appendEvent(jsonl, e as Parameters<typeof appendEvent>[1]);
  }
  writeFileSync(join(outDir, "run-metrics.jsonl"), [
    JSON.stringify({ v: "0", date: "2026-07-07", runId: "r1", proposed: 3, suppressed: 0, presented: 3, rejected: 0, dup: 0 }),
    JSON.stringify({ v: "0", date: "2026-07-08", runId: "r2", proposed: 4, suppressed: 2, presented: 1, rejected: 0, dup: 1, illegible: 1, refaced: 1 }),
  ].join("\n") + "\n");

  const m = metricsData(outDir);
  assert.deepEqual(m.decided, { total: 3, accept: 1, park: 1, reject: 1 });
  assert.equal(m.questions, 1);
  assert.equal(m.latency.count, 2); // backfilled 那次没有诚实计时,不进分布
  assert.equal(m.latency.medianMs, 20_000);
  assert.equal(m.latency.recent.length, 2);
  assert.equal(m.runs.length, 2);
  assert.deepEqual(m.totals, { proposed: 7, suppressedPlusDup: 3 });
  assert.equal(m.runs[1]!.illegible, 1);
  assert.equal(m.runs[1]!.refaced, 1);
  assert.deepEqual(m.cognition, { thought: 0, action: 1, ledger: 1 }); // #18:认知含量按 stakes 分桶
});

test("note 通道 + 撤销窗口(#24):理由随任意手势;undo 补偿事件;accept 撤销走 git revert", async () => {
  const vault = mkVault();
  const outDir = join(vault, "98_Forme");
  const jsonl = join(outDir, "decisions.jsonl");
  const cardA = seedCard(vault, "dangling-task", "note-b.md", "- [ ] 待办一", "- [x] 待办一");
  const cardB = seedCard(vault, "stale-claim", "note-c.md", "旧口径的一句话。", "新话。");
  const t = await startServer(vault);
  try {
    // ① park + note:理由进 decision 事件(不是 correction)
    await t.post("/api/presented", { cardId: cardA.id });
    const parked = await t.post("/api/decide", { cardId: cardA.id, choice: "park", note: "  两个 follow-up 还没有承接,先不动。 " });
    assert.equal(parked.status, 200, JSON.stringify(parked.data));
    let events = readEvents(jsonl);
    const dec1 = events.find((e) => e.type === "decision" && e.cardId === cardA.id)!;
    assert.equal(dec1.note, "两个 follow-up 还没有承接,先不动。"); // trim 后入账
    assert.equal(dec1.choice, "park");

    // ② undo park:补偿事件,卡回队列;taste/抑制视角它未被决过
    const undo1 = await t.post("/api/undo", { cardId: cardA.id });
    assert.equal(undo1.status, 200, JSON.stringify(undo1.data));
    events = readEvents(jsonl);
    assert.equal(events.at(-1)!.type, "undo");
    assert.equal(effectiveDecisions(events).length, 0);
    assert.equal(queueState(outDir, events).pending.length, 2); // 卡回来了
    // 没有可撤销的落子 → 409(连按两次 u)
    assert.equal((await t.post("/api/undo", { cardId: cardA.id })).status, 409);

    // ③ 撤销后再落子是合法序列(decision → undo → decision,第二条生效)
    await t.post("/api/presented", { cardId: cardA.id });
    assert.equal((await t.post("/api/decide", { cardId: cardA.id, choice: "reject", note: "看过了,不需要。" })).status, 200);
    events = readEvents(jsonl);
    assert.equal(effectiveDecisions(events).length, 1);
    assert.equal(effectiveDecisions(events)[0]!.choice, "reject");

    // ④ accept → undo:git revert 回滚,文件复原,undo 事件带 revert 凭证
    const before = readFileSync(join(vault, "note-c.md"), "utf8");
    await t.post("/api/presented", { cardId: cardB.id });
    const acc = await t.post("/api/decide", { cardId: cardB.id, choice: "accept" });
    assert.equal(acc.status, 200);
    assert.match(readFileSync(join(vault, "note-c.md"), "utf8"), /新话。/);
    const undo2 = await t.post("/api/undo", { cardId: cardB.id });
    assert.equal(undo2.status, 200, JSON.stringify(undo2.data));
    assert.match(String(undo2.data.reverted), /^[0-9a-f]{7,40}$/);
    assert.equal(readFileSync(join(vault, "note-c.md"), "utf8"), before); // 内容复原
    const subject = execFileSync("git", ["-C", vault, "log", "-1", "--format=%s"], { encoding: "utf8" });
    assert.match(subject, /Revert/);
    events = readEvents(jsonl);
    const undoEv = events.at(-1)!;
    assert.equal(undoEv.type, "undo");
    assert.equal(undoEv.executed, String(undo2.data.reverted));
    assert.equal(queueState(outDir, events).pending.some((c) => c.id === cardB.id), true);

    // ⑤ 窗口已过 → 409(手工补一条 20 秒前的 decision)
    appendEvent(jsonl, {
      v: "0", ts: new Date(Date.now() - 20_000).toISOString(), type: "decision",
      cardId: cardB.id, fingerprint: cardB.fingerprint, choice: "park", actor: "owner", backfilled: true,
    });
    const late = await t.post("/api/undo", { cardId: cardB.id });
    assert.equal(late.status, 409);
    assert.match(String(late.data.error), /undo window/);
  } finally {
    await t.close();
  }
});

test("agent_authorized freshness execution remains undoable after the owner undo window", async () => {
  const vault = mkVault();
  const outDir = join(vault, "98_Forme");
  const clockPath = join(vault, "clock.md");
  writeFileSync(clockPath, "---\nupdated: 2026-07-04\n---\n# Clock\n");
  execFileSync("git", ["-C", vault, "add", "clock.md"]);
  execFileSync("git", ["-C", vault, "commit", "-qm", "add clock fixture"]);
  const before = readFileSync(clockPath, "utf8");
  const now = new Date(Date.now() - 60_000);
  const fix = detectTimestampFreshness(before, now);
  assert.ok(fix);
  const executed = executeTimestampFreshness({
    vault,
    outDir,
    file: "clock.md",
    fix,
    now,
    runId: "run_old_clock",
  });
  assert.notEqual(readFileSync(clockPath, "utf8"), before);

  const t = await startServer(vault);
  try {
    const undo = await t.post("/api/undo", { cardId: executed.card.id });
    assert.equal(undo.status, 200, JSON.stringify(undo.data));
    assert.equal(readFileSync(clockPath, "utf8"), before);
    const events = readEvents(join(outDir, "decisions.jsonl"));
    assert.equal(events.at(-1)!.type, "undo");
    assert.equal(effectiveDecisions(events).length, 0);
  } finally {
    await t.close();
  }
});

test("console 写路径的门:非 JSON content-type 415;未知卡 409;非法 choice 400", async () => {
  const vault = mkVault();
  const card = seedCard(vault, "stale-claim", "note-e.md", "第五句。", "改。");
  const t = await startServer(vault);
  try {
    assert.equal((await t.post("/api/decide", { cardId: card.id, choice: "accept" }, "text/plain")).status, 415);
    assert.equal((await t.post("/api/decide", { cardId: "card_nope", choice: "accept" })).status, 409);
    assert.equal((await t.post("/api/decide", { cardId: card.id, choice: "yolo" })).status, 400);
    assert.equal((await t.post("/api/decide", { cardId: card.id, choice: "park", correction: { hunks: [] } })).status, 400);
  } finally {
    await t.close();
  }
});
