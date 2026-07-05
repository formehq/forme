# ARCHITECTURE — 一页系统图

Forme = local-first agent,把知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + a/p/r),并从每次决策学 taste。**vault 是唯一真相层**;repo 里只有代码,卡片/日志都写进 vault。

## 一张卡的生命周期(7 步)

```
launchd (WatchPaths 盯 vault)                              [调度,未建]
   │  唤醒 → 首卡可见 ≤ 10s(增量指纹只处理 git delta)
   ▼
runner  ──►  codex exec --json --output-schema             [runner/,未建 · #5]
   │         (agent 只读扫 vault 增量找漂移,注入 Taste Rules + k 条相似历史)
   │         agent 只返回符合 card.schema 的 JSON
   ▼
Forme 代码(非 agent)确定性执行:                          [schema/ 已建 · #4]
   ├─ AJV 校验(validate.ts;不信 harness 自觉)
   ├─ 算指纹(fingerprint.ts)
   ├─ 指纹查重:命中 rejected/parked 名单 → 丢弃
   └─ 落盘:卡片 JSON + markdown 镜像 → vault
   ▼
console (localhost)  渲染固定外观原语卡,不推送,等用户来   [console/,未建 · W3]
   ▼
落子  a / p / r(+ 可选就地 correction);静默计时           [W3]
   └─ 追加 decisions.jsonl(presented / decision / correction)
   ▼
学习  每 ~20 条决策 → 提炼人读规则 → Taste Rules.md          [W2]
   ▼
授权  某类回放一致率 >95% → 影子模式 → 用户确认后自动化      [W5]
```

## 组件

| 目录 | 职责 | 状态 |
| --- | --- | --- |
| `schema/` | 卡片 + 事件的 JSON Schema、指纹、AJV 校验、样例 | **已建(#4)** |
| `runner/` | 调 codex exec / OpenCode server,扫漂移,确定性落盘 | 未建(#5) |
| `console/` | localhost 三卡 + 落子手势 + wake-catchup | 未建(W3) |
| `docs/` | 系统理解面:ARCHITECTURE / DECISIONS / SCHEMA | 进行中(#7) |
| `design/` | 交互稿 + 语气笔记(活文档) | 已有(#1) |

runner 边界按**双调用形态**设计:one-shot exec(Codex,Tier 1 默认)与长驻 server/SDK(OpenCode,Tier 2,#8)。

## 现在能做什么 / 还不能做什么(代码库自己的 State Diff)

**能:**
- 定义并校验一张决策卡 + 一段 decisions.jsonl(`npm run validate` / `npm test`)。
- 从 category + diff 确定性算去重指纹,顺序无关。
- 3 张取自真实 vault 漂移的样卡通过校验(S4 / C1 / L1)。

**还不能:**
- 扫 vault 找漂移(无 runner)。
- 跑 codex / 落任何真盘。
- 渲染卡片 / 接受落子(无 console)。
- 去重硬过滤 / taste 学习 / 影子授权(靠 W2+)。
- 被 launchd 调度。

> 一句话:**数据契约成立了,管道还没通。** 下一块是 #5(runner 首跑,产出第一张真盘上的卡)。
