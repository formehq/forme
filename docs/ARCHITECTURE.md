# ARCHITECTURE — 一页系统图

Forme = local-first agent,把知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + a/p/r),并从每次决策学 taste。**vault 是唯一真相层**;repo 里只有代码,卡片/日志都写进 vault。

## 一张卡的生命周期(7 步)

```
launchd (StartCalendarInterval 日跑 + WatchPaths 盯 vault   [launchd/ 已建 · #9]
   │      .git/logs/HEAD + RunAtLoad 补跑;额度守卫在 runner --min-hours)
   │  唤醒 → 首卡可见 ≤ 10s(增量指纹只处理 git delta)
   ▼
runner  ──►  codex exec --json --output-schema             [runner/ 已建 · #5]
   │         (先答上一轮的 question:reface 只换脸,同指纹回场 —— #21;
   │          agent 只读扫 vault git-delta 找漂移;窗口 = 上次 run 的
   │          HEAD 锚点..HEAD —— #14;排除 98_Forme/;
   │          prompt 注入 Taste Rules —— #10 + 世界层指令/正反例 —— #21;
   │          k 条相似历史留 post-W2)
   │         agent 只返回 schema 强制的 JSON(五段 v0.1 —— #12;stakes v0.2 —— #21)
   ▼
Forme 代码(非 agent)确定性执行:                          [schema/ 已建 · #4]
   ├─ AJV 校验(validate.ts;不信 harness 自觉)
   ├─ 算指纹(fingerprint.ts)
   ├─ 指纹抑制:命中已决名单(decisions.jsonl)→ 静默丢弃  [#9]
   ├─ 世界层闸(legibility.ts):账本语域上世界层段 → 打回  [#21]
   │  (同轮一次 reface 重写机会;账本卡豁免;卡面说事,diff 说账)
   ├─ 落盘:卡片 JSON + markdown 镜像 → vault/98_Forme/
   └─ 记数据点:run-metrics.jsonl(重复率曲线原料)         [#9]
   ▼
console (localhost 单页,node:http,服务器零状态;           [console/ 已建 · #15/#16]
   │    launchd 常驻 com.forme.console,KeepAlive)
   │   四视图:catch-up 卡(屏 1)/ Decision 卡五段(屏 2)/ State Diff(屏 3)
   │          / Metrics(时延中位数 + 分布、重复率曲线 —— #19)
   │   presented 事件 = 卡实际上屏时上报(静默计时起点;语义定案 #15)
   │   wake-catchup(#16,硬约束 #3):旧状态秒渲 +「队列截至 X」标注,
   │   开页触发后台增量 run(--min-hours 2 + 锚点空窗零成本 + 去抖)
   ▼
落子  a / p / r 单键 + 按钮(+ correction 就地修正 after      [已建 · #15/#21]
   │   + question 问一句:不落子,卡转待补 context 态,
   │     下一轮 reface 带解释回场 —— correction 的双胞胎)
   ├─ accept → hunk 精确替换(全有或全无)→ git 提交回执 executed
   │   toast 带本次用时(latencyMs 真值上屏 —— #19)
   └─ 追加 decisions.jsonl(presented / correction / decision / question;
      每条过自家 AJV 门;latencyMs = 最近 presented → decision 真值)
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
| `console/` | localhost 四视图 + 落子手势 + wake-catchup + 问一句 + Metrics(单页,零框架) | **已建(#15、#16、#19、#21;真实落子已发生)** |
| `docs/` | 系统理解面:ARCHITECTURE / DECISIONS / SCHEMA | 进行中(#7) |
| `design/` | 交互稿 + 语气笔记(活文档) | 已有(#1) |

runner 边界按**双调用形态**设计:one-shot exec(Codex,Tier 1 默认)与长驻 server/SDK(OpenCode,Tier 2,#8)。

## 现在能做什么 / 还不能做什么(代码库自己的 State Diff)

**能:**
- 定义并校验一张决策卡 + 一段 decisions.jsonl(`npm run validate` / `npm test`)。
- 从 category + diff 确定性算去重指纹,顺序无关。
- **真跑一轮**:git-delta(窗口 = 上次 run 的 HEAD 锚点..HEAD,--commits 为手动覆盖 —— #14;排除 `98_Forme/`)→ codex 只读扫描 → 自有 AJV 门 → 指纹抑制(已决名单命中即丢)→ 卡片 JSON + md 镜像落 `98_Forme/cards/`,幂等(#5、#9)。
- 卡面 v0.1 决策者优先五段:whyNow / recommendation / onAccept 进 schema 与镜像;证据+diff 折叠为支撑层(#12)。
- 每轮真 run 落一行 `{date, proposed, suppressed, presented, …}` 到 `98_Forme/run-metrics.jsonl`——重复率曲线有原始数据了(#9)。
- **taste 学习半环**:决策日志 → codex 提炼 → `Taste Rules.md`(零负样本置信钉死 low + cardId 溯源)→ 规则回注 runner prompt(#10)。
- **State Diff 周更**:确定性周数据包 → 四段叙事 → `state-diff-YYYY-MM-DD.md`,周日 launchd 自动产出(#11)。
- launchd 调度:日跑(每日定时 + vault commit 触发 + 登录补跑,≥20h 守卫)+ 周日 State Diff(≥4d 守卫)(#9、#11)。
- **console 落子全链**(#15):localhost 单页(127.0.0.1:6180,launchd 常驻)渲染三原语(catch-up / 五段卡 / State Diff)→ a/p/r 单键或按钮 + correction 就地修正 → accept 应用最小 diff(全有或全无;目标文件不干净即拒)+ git 提交回执 → presented/correction/decision 事件过 AJV 门追加 jsonl,latencyMs 有真值(首批:123s/15s/18s,07-08 Zayn 真实 session)。服务器零状态,每请求现读 vault(硬约束 #4)。
- **wake-catchup**(#16,硬约束 #3):开页旧状态秒渲 +「队列截至 X」标注 → 后台增量 run(额度三重护栏)→ 投影自更新;常开 tab 回可见自动重投影;真链已验证(refresh → 锚点 run → 3 卡入列)。
- **卡面 v0.2:世界层优先**(#21):世界层闸(账本语域上 title/summary/whyNow 即打回,账本卡豁免)+ 同轮一次 reface 重写机会;stakes 三级(申报+消毒派生)驱动卡面丰俭;prompt 带 66bcc 真实正反例。
- **question 通道**(#21):console 问一句(q 键)→ question 事件(非 decision,指纹不进已决名单)→ 卡转待补 context 态退出队列 → 下一轮 run 先答问题(reface 只换脸,id/指纹/diff 不变)→ 带着「你问过」问答同指纹回场。
- **Metrics 上屏**(#19):落子 toast 带本次用时;Metrics 视图 = 时延中位数 + 最近 20 次分布(按 choice 着色)+ 重复率逐轮条 + 累计抑制率——全部现读 jsonl,中位数只取现场计时。

**还不能:**
- 规则的「收录/改写/丢弃」确认交互(屏 4 Taste 面板,#20,W5)/ k 条相似历史决策注入(post-W2)。
- 呈现数量的接受率自适应节流(硬约束 #2 的完整形)——现在 = 全部待决卡一次 session。
- 影子授权(W5)——但 recommendation 与实际 choice 的对照数据已开始积累。
- parked 卡没有 un-park 机制——目前与 rejected 同样被永久抑制(question 是「先别落子」的出口,但 park 本身仍是终态)。
- correction 只能改 hunk 的 after(v0);纯插入(before 为空)的 diff 拒绝自动应用。

> 一句话:**七步生命周期在真实使用中闭合,且第一条 legibility 定量证据(66bcc 949s)已长成机制——世界层闸 + question 通道 + Metrics 上屏(#21/#19)。** 待验:下一批行动类卡回到 ~15s 量级(#21 验收基线)+ question 真实往返一次;W3 剩开盖 ≤10s 秒表 3 天(#16)。下一块 = 屏 4 Taste 面板(#20,W5)+ #18 思想卡(stakes=thought 地基已就位)。
