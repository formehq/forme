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
   │          prompt 注入 Taste Rules —— #10;k 条相似历史留 post-W2)
   │         agent 只返回 schema 强制的 JSON(卡面 v0.1 五段字段 —— #12)
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
学习  taste.ts:决策日志 → codex 提炼 → Taste Rules.md       [已建 · #10]
   │  (溯源+置信由代码钉死;规则回注 runner prompt)
   ▼
授权  某类回放一致率 >95% → 影子模式 → 用户确认后自动化      [W5]
   (卡面 recommendation 字段已就位 = 影子模式第一形态 · #12)
```

旁路:**State Diff**(#11)——`state-diff.ts` 确定性采集周数据包 → codex 四段叙事
→ `98_Forme/state-diff-YYYY-MM-DD.md`;`com.forme.statediff` 每周日 18:00 自动产出。

## 组件

| 目录 | 职责 | 状态 |
| --- | --- | --- |
| `schema/` | 卡片 + 事件的 JSON Schema、指纹、AJV 校验、样例 | **已建(#4、#12)** |
| `runner/` | 漂移卡管道(#5/#9/#12)+ taste 提炼器(#10)+ State Diff 生成器(#11) | **已建** |
| `launchd/` | 日跑 + 周日 State Diff 双 plist 模板 + 安装脚本 | **已建(#9、#11)** |
| `console/` | localhost 三卡 + 落子手势 + wake-catchup | 未建(W3) |
| `docs/` | 系统理解面:ARCHITECTURE / DECISIONS / SCHEMA | 进行中(#7) |
| `design/` | 交互稿 + 语气笔记(活文档) | 已有(#1) |

runner 边界按**双调用形态**设计:one-shot exec(Codex,Tier 1 默认)与长驻 server/SDK(OpenCode,Tier 2,#8)。

## 现在能做什么 / 还不能做什么(代码库自己的 State Diff)

**能:**
- 定义并校验一张决策卡 + 一段 decisions.jsonl(`npm run validate` / `npm test`)。
- 从 category + diff 确定性算去重指纹,顺序无关。
- **真跑一轮**:git-delta(排除 `98_Forme/`)→ codex 只读扫描 → 自有 AJV 门 → 指纹抑制(已决名单命中即丢)→ 卡片 JSON + md 镜像落 `98_Forme/cards/`,幂等(#5、#9)。
- 卡面 v0.1 决策者优先五段:whyNow / recommendation / onAccept 进 schema 与镜像;证据+diff 折叠为支撑层(#12)。
- 每轮真 run 落一行 `{date, proposed, suppressed, presented, …}` 到 `98_Forme/run-metrics.jsonl`——重复率曲线有原始数据了(#9)。
- **taste 学习半环**:决策日志 → codex 提炼 → `Taste Rules.md`(零负样本置信钉死 low + cardId 溯源)→ 规则回注 runner prompt(#10)。
- **State Diff 周更**:确定性周数据包 → 四段叙事 → `state-diff-YYYY-MM-DD.md`,周日 launchd 自动产出(#11)。
- launchd 调度:日跑(每日定时 + vault commit 触发 + 登录补跑,≥20h 守卫)+ 周日 State Diff(≥6d 守卫)(#9、#11)。

**还不能:**
- 渲染卡片 / 接受落子 / 记 presented 与 decision 事件(无 console,W3)。
- 规则的「收录/改写/丢弃」确认交互(W3 屏 4)/ k 条相似历史决策注入(post-W2)。
- 影子授权(W5)——但 recommendation 与实际 choice 的对照数据已开始积累。
- parked 卡没有 un-park 机制——目前与 rejected 同样被永久抑制(console 侧解,W3+)。

> 一句话:**采集端 + 学习半环 + 周叙事都通了,缺的是决策端(console)把人的落子接进来。** 下一块 = #12 验收(下一张真卡 v0.1)+ 周日 07-12 第一张真 State Diff,然后 W3 console。
