# ARCHITECTURE — 一页系统图

Forme = local-first agent,把知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + a/p/r),并从每次决策学 taste。**vault 是唯一真相层**;repo 里只有代码,卡片/日志都写进 vault。

## 一张卡的生命周期(7 步)

```
launchd (StartCalendarInterval 日跑 + WatchPaths 盯 vault   [launchd/ 已建 · #9]
   │      .git/logs/HEAD + RunAtLoad 补跑;额度守卫在 run-once.sh)
   │  唤醒 → 首卡可见 ≤ 10s(增量指纹只处理 git delta)
   ▼
runner  ──►  codex exec --json --output-schema             [runner/ 已建 · #5]
   │         (agent 只读扫 vault git-delta 找漂移;排除 98_Forme/;
   │          Taste Rules + k 条相似历史注入留 W2 后段)
   │         agent 只返回 schema 强制的 JSON
   ▼
Forme 代码(非 agent)确定性执行:                          [schema/ 已建 · #4]
   ├─ AJV 校验(validate.ts;不信 harness 自觉)
   ├─ 算指纹(fingerprint.ts)
   ├─ 指纹抑制:命中已决名单(decisions.jsonl)→ 静默丢弃  [#9]
   ├─ 落盘:卡片 JSON + markdown 镜像 → vault/98_Forme/
   └─ 记数据点:run-metrics.jsonl(重复率曲线原料)         [#9]
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
| `runner/` | 调 codex exec,扫 git-delta,指纹抑制,确定性落盘 + 数据点 | **已建(#5、#9)** |
| `launchd/` | 日跑 plist 模板 + 额度守卫 wrapper + 安装脚本 | **已建(#9)** |
| `console/` | localhost 三卡 + 落子手势 + wake-catchup | 未建(W3) |
| `docs/` | 系统理解面:ARCHITECTURE / DECISIONS / SCHEMA | 进行中(#7) |
| `design/` | 交互稿 + 语气笔记(活文档) | 已有(#1) |

runner 边界按**双调用形态**设计:one-shot exec(Codex,Tier 1 默认)与长驻 server/SDK(OpenCode,Tier 2,#8)。

## 现在能做什么 / 还不能做什么(代码库自己的 State Diff)

**能:**
- 定义并校验一张决策卡 + 一段 decisions.jsonl(`npm run validate` / `npm test`)。
- 从 category + diff 确定性算去重指纹,顺序无关。
- **真跑一轮**:git-delta(排除 `98_Forme/`)→ codex 只读扫描 → 自有 AJV 门 → 指纹抑制(已决名单命中即丢)→ 卡片 JSON + md 镜像落 `98_Forme/cards/`,幂等(#5、#9)。
- 每轮真 run 落一行 `{date, proposed, suppressed, presented, …}` 到 `98_Forme/run-metrics.jsonl`——重复率曲线有原始数据了(#9)。
- launchd 日跑:每日定时 + vault commit 触发 + 登录补跑,`run-once.sh` 守卫保证 ≥20h 才真跑一轮(#9)。

**还不能:**
- 渲染卡片 / 接受落子 / 记 presented 与 decision 事件(无 console,W3)。
- taste 学习(Taste Rules 提炼与注入)/ State Diff 生成器(W2 后段 #10、#11)。
- 影子授权(W5)。
- parked 卡没有 un-park 机制——目前与 rejected 同样被永久抑制(console 侧解,W3+)。

> 一句话:**采集端闭环了(调度 → 扫描 → 抑制 → 落卡 → 曲线),决策端还没通。** 下一块是 W2 的 taste/state-diff(#10、#11),再到 W3 console。
