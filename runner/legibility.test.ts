import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLegibility, effectiveStakes, ledgerSpeechIn } from "./legibility.ts";

/* 标本 = card_66bcc(@formehq,07-07 Zayn 第三次卡面反馈;latencyMs 949s):
   卡面全程账本语言,世界层事实零出现——这张卡必须被闸打回。 */
const SPECIMEN_66BCC = {
  category: "dangling-task",
  title: "社媒号确认被塞在已完成的 handle 任务里",
  summary: "Roadmap 的已完成项里仍藏着“剩 @formehq 社媒号顺手确认”。",
  whyNow: "handle 购买和 GitHub org 已完成后,剩余动作没有拆成可追踪待办。",
  stakes: null,
};

test("世界层闸:66bcc 真标本(账本语言)被打回,并报出命中片段", () => {
  const r = checkLegibility(SPECIMEN_66BCC);
  assert.equal(r.ok, false);
  assert.ok(r.hit, "应报出命中的账本片段");
});

test("世界层闸:世界层重写版(卡面说事)通过", () => {
  const r = checkLegibility({
    category: "dangling-task",
    title: "@formehq 社媒号还没确认,8.15 发布要用",
    summary: "handle 和 GitHub org 都到手了,唯独社媒账号悬着。",
    whyNow: "发布日越来越近,这个号一天不确认,对外入口就缺一角。",
    stakes: "real-world-action",
  });
  assert.equal(r.ok, true);
  assert.equal(r.hit, null);
});

test("世界层闸:纯账本卡(stale-frontmatter)豁免——它们的事就是账", () => {
  const r = checkLegibility({
    category: "stale-frontmatter",
    title: "frontmatter 的 updated 字段停在 5 月",
    summary: "status 字段里还是 draft。",
    stakes: null,
  });
  assert.equal(r.ok, true);
});

test("effectiveStakes:申报合法即用;非法/缺失按 category 派生;claim-drift 恒为 thought(#18)", () => {
  assert.equal(effectiveStakes({ category: "dangling-task", stakes: "thought" }), "thought");
  assert.equal(effectiveStakes({ category: "dangling-task", stakes: "yolo" }), "real-world-action");
  assert.equal(effectiveStakes({ category: "dangling-task", stakes: null }), "real-world-action");
  assert.equal(effectiveStakes({ category: "broken-link", stakes: null }), "reversible-ledger");
  assert.equal(effectiveStakes({ category: "naming-drift" }), "reversible-ledger");
  assert.equal(effectiveStakes({ category: "stale-claim" }), "real-world-action");
  assert.equal(effectiveStakes({ category: "claim-drift", stakes: null }), "thought"); // #18:思想卡出生通道
  assert.equal(effectiveStakes({ category: "claim-drift", stakes: "垃圾值" }), "thought");
});

test("ledgerSpeechIn:手术词命中;世界层名词(人名/日期/@handle)不误伤", () => {
  assert.ok(ledgerSpeechIn("把它拆成两条"));
  assert.ok(ledgerSpeechIn("已完成的 handle 任务里"));
  assert.ok(ledgerSpeechIn("速览位置不对"));
  assert.equal(ledgerSpeechIn("@formehq 社媒号还没确认,8.15 发布要用"), null);
  assert.equal(ledgerSpeechIn("CCS 验证故事引用的数字停在最旧快照"), null);
});
