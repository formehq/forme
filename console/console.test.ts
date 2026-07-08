import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import { applyHunksToContent, ApplyError } from "./apply.ts";
import { appendEvent, readEvents, pendingCards, catchUpData } from "./store.ts";
import { createConsoleServer } from "./server.ts";
import { assembleCard } from "../runner/card.ts";
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
    diff: { file, hunks: [{ locator: null, before, after }] },
    estSeconds: 10,
  };
  const { card, serializable, validation } = assembleCard(ac, { runId: "run_test", at: "2026-07-07T00:00:00.000Z" });
  assert.equal(validation.valid, true, validation.errors.join("; "));
  writeFileSync(join(repo, "98_Forme", "cards", `${card.id}.json`), JSON.stringify(serializable, null, 2) + "\n");
  return card;
}

async function startServer(vault: string) {
  const server = createConsoleServer({ vault });
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
    assert.match(await page.text(), /进入落子|forme/);
    let state = (await t.get("/api/state")) as { pending: Card[]; catchUp: { pending: { count: number }; sinceTs: string | null } };
    assert.equal(state.pending.length, 4);
    assert.equal(state.catchUp.pending.count, 4);
    assert.equal(state.catchUp.sinceTs, null); // 还没有任何事件 = 第一次来

    // ① accept:presented → decide → diff 应用 + git 回执 + latency 真值
    assert.equal((await t.post("/api/presented", { cardId: cardA.id })).status, 200);
    const acc = await t.post("/api/decide", { cardId: cardA.id, choice: "accept" });
    assert.equal(acc.status, 200, JSON.stringify(acc.data));
    assert.match(String(acc.data.executed), /^[0-9a-f]{7,40}$/);
    assert.ok(Number(acc.data.latencyMs) >= 0);
    assert.match(readFileSync(join(vault, "note-a.md"), "utf8"), /updated: 2026-07-07/);
    const subject = execFileSync("git", ["-C", vault, "log", "-1", "--format=%s"], { encoding: "utf8" });
    assert.match(subject, new RegExp(`forme: accept ${cardA.id}`));
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
    assert.match(String(r.data.error), /未提交/);
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
