# ARCHITECTURE — 一页系统图

> 本文描述已经实现的 decision-card/runtime 系统。Living Project Twin 的目标架构、迁移阶段与验证闸门以 [`architecture/HARNESS.md`](./architecture/HARNESS.md) 为准。

Forme = local-first agent,把知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + a/p/r),并从每次决策学 taste。**vault 是唯一真相层**;repo 里只有代码,卡片/日志都写进 vault。

## 一张卡的生命周期(7 步)

```
launchd (StartCalendarInterval 日跑 + WatchPaths 盯 vault   [launchd/ 已建 · #9]
   │      .git/logs/HEAD + RunAtLoad 补跑;额度守卫在 runner --min-hours)
   │  唤醒 → 首卡可见 ≤ 10s(增量指纹只处理 git delta)
   ▼
runner  ──►  runtime boundary                               [runtime/ 已建 · #8/#37]
   │         codex exec | Codex App Server | OpenCode Server
   │         (文件锁串行化跨 job 竞态 —— #22;
   │          先以注入的机器时间检查 timestamp freshness —— #31;
   │          纯 `updated:`/独立 as-of/星期日期错配由代码自执行,
   │          该文件若只有机械日期 delta 则零 Codex 调用;
   │          先答上一轮的 question:reface 只换脸,同指纹回场 —— #21;
   │          agent 只读扫 vault git-delta 找漂移;窗口 = 上次 run 的
   │          HEAD 锚点..HEAD —— #14;排除 98_Forme/;
   │          + 慢层立场参照:02_Wiki 最久未动 N 篇,快慢对照找
   │            claim-drift 思想卡,每轮 ≤1 张机器节流 —— #18;
   │          prompt 注入 Taste Rules —— #10 + 世界层指令/正反例 —— #21;
   │          k 条相似历史留 post-W2)
   │         agent 只返回 schema 强制的 JSON(五段 v0.1 —— #12;stakes v0.2 —— #21)
   ▼
Forme 代码(非 agent)确定性执行:                          [schema/ 已建 · #4]
   ├─ AJV 校验(validate.ts;不信 harness 自觉)
   ├─ 算指纹(fingerprint.ts)
   ├─ 指纹抑制:命中已决名单(decisions.jsonl)→ 静默丢弃  [#9]
   ├─ 可执行性干跑(hunks.ts):accept 会失败的卡 → 打回    [#36]
   │  (歧义/已漂/纯插入;hunk 支持 all=true 全部替换)
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
落子  a / p / r 单键 + 按钮(+ correction 就地修正 after      [已建 · #15/#21/#24]
   │   + question 问一句:不落子,卡转待补 context 态,
   │     下一轮 reface 带解释回场 —— correction 的双胞胎
   │   + note 随任意手势:落子理由一行,park/reject 的理由
   │     是最珍贵的 taste 数据 —— #24)
   ├─ accept → hunk 精确替换(全有或全无)→ 目标 + 卡镜像 + 事件 + metrics
   │   同一 git 提交;`executionId` 同时进事件与 commit trailer
   │   toast 带本次用时(latencyMs 真值上屏 —— #19)
   │   + 撤销窗口 4s(#24):undo 补偿事件,只反向目标文件补丁
   └─ 追加 decisions.jsonl(presented / correction / decision / question / undo;
      每条过自家 AJV 门;latencyMs = 最近 presented → decision 真值)
   ▼
学习  taste.ts:决策日志 → codex 提炼 → Taste Rules.md       [已建 · #10]
   │  (溯源+置信由代码钉死;规则回注 runner prompt)
   ▼
授权  timestamp freshness 已获 owner 明示授权并确定性自执行 [已建 · #31]
   │  actor=agent_authorized;下一张 State Diff 确定性披露;可长期 undo
   └─ 其余类别:回放一致率 >95% → 影子模式 → 用户确认后自动化 [W5]
```

旁路:**State Diff**(#11/#31)——`state-diff.ts` 确定性采集周数据包 → codex 四段叙事,
再由代码把本周 authorized fixes 注入「What changed」→ `98_Forme/state-diff-YYYY-MM-DD.md`;
`com.forme.statediff` 每周日 18:00 自动产出。

## 组件

| 目录 | 职责 | 状态 |
| --- | --- | --- |
| `schema/` | 卡片 + 事件的 JSON Schema、指纹、AJV 校验、样例 | **已建(#4、#12)** |
| `runner/` | 漂移卡管道(#5/#9/#12)+ timestamp 自执行(#31)+ taste 提炼器(#10)+ State Diff(#11) | **已建** |
| `runtime/` | Codex one-shot/App Server + OpenCode authenticated server; structured-output 与 capability boundary | **M0 已建(#8/#37)** |
| `launchd/` | 日跑 + 周日 State Diff + 常驻 console 三 plist;白手套安装/卸载/预检 | **已建(#9、#11、#16、#28)** |
| `console/` | localhost 四视图 + 落子手势 + wake-catchup + 问一句 + Metrics(单页,零框架) | **已建(#15、#16、#19、#21、#26-A、#27;真实落子已发生)** |
| `docs/` | 系统理解面:ARCHITECTURE / DECISIONS / SCHEMA | 进行中(#7) |
| `design/` | 交互稿 + 语气笔记(活文档) | 已有(#1) |
| `schema/twin/` | M0 source/Twin/proposal/runtime/receipt/projection/message contracts | **已纳入** |
| `twin/` | Workspace registry、evidence manifest、Twin state/revisions/snapshots、Continuity view | **M1 进行中** |

runner 的主扫描现在按 capability boundary 选 `codex-exec`(稳定默认)、`codex-app-server` 或 `opencode`。换 harness 不换 Forme 的 AJV、指纹、写入与授权核心;OpenCode 应用权限不冒充 Codex OS sandbox。reface/taste/State Diff 仍待逐项迁移。

## 现在能做什么 / 还不能做什么(代码库自己的 State Diff)

**能:**
- 定义并校验一张决策卡 + 一段 decisions.jsonl(`npm run validate` / `npm test`)。
- 从 category + diff 确定性算去重指纹,顺序无关。
- **真跑一轮**:git-delta(窗口 = 上次 run 的 HEAD 锚点..HEAD,--commits 为手动覆盖 —— #14;排除 `98_Forme/`)→ codex 只读扫描 → 自有 AJV 门 → 指纹抑制(已决名单命中即丢)→ 卡片 JSON + md 镜像落 `98_Forme/cards/`,幂等(#5、#9)。
- **双 harness 主扫描**(#8/#37):同一 agent schema 可走 Codex one-shot、Codex App Server `turn/start.outputSchema` 或 OpenCode `format:json_schema`;Codex App Server 已过真 structured turn,OpenCode 已过隔离 server/health/OpenAPI 与模拟 structured session。`npm run runtime:preflight` 不耗模型验证两套本机协议入口。
- **授权 #1:timestamp freshness 自执行**(#31):仅 frontmatter `updated:`、整行 `as of <date>`、星期/date 错配;机器时间注入,检测+修复零 LLM。机械-only delta 整轮跳过 Codex;混合 delta 先修日期再扫描正文。事件 `actor=agent_authorized`,不进入 owner taste/acceptance;完整回执在下一张 State Diff 确定性出现,且不受 15s 人类撤销窗限制。
- 卡面 v0.1 决策者优先五段:whyNow / recommendation / onAccept 进 schema 与镜像;证据+diff 折叠为支撑层(#12)。
- 每轮真 run 落一行 `{date, proposed, suppressed, presented, …}` 到 `98_Forme/run-metrics.jsonl`——重复率曲线有原始数据了(#9)。
- **taste 学习半环**:决策日志 → codex 提炼 → `Taste Rules.md`(零负样本置信钉死 low + cardId 溯源)→ 规则回注 runner prompt(#10)。
- **State Diff 周更**:确定性周数据包 → 四段叙事 → `state-diff-YYYY-MM-DD.md`,周日 launchd 自动产出(#11)。
- launchd 调度:日跑(每日定时 + vault commit 触发 + 登录补跑,≥20h 守卫)+ 周日 State Diff(≥4d 守卫)(#9、#11)。
- **console 落子全链**(#15):localhost 单页(127.0.0.1:6180,launchd 常驻)渲染三原语(catch-up / 五段卡 / State Diff)→ a/p/r 单键或按钮 + correction 就地修正 → accept 应用最小 diff(全有或全无;目标文件不干净即拒)+ 目标/卡镜像/decision/metrics 原子提交 → latencyMs 有真值。服务器零状态,每请求现读 vault(硬约束 #4)。
- **wake-catchup**(#16,硬约束 #3):开页旧状态秒渲 +「队列截至 X」标注 → 后台增量 run(额度三重护栏)→ 投影自更新。首个 `/api/state` 单次读取 cards/events 后复用于三块投影,响应带 `Server-Timing`;安装健康门的 curl 有自身 timeout、真实 10s deadline 与 Forme 身份校验。常开 tab 回可见自动重投影;最终仍等 owner 连续三天开盖秒表。
- **卡面 v0.2:世界层优先**(#21):世界层闸(账本语域上 title/summary/whyNow 即打回,账本卡豁免)+ 同轮一次 reface 重写机会;stakes 三级(申报+消毒派生)驱动卡面丰俭;prompt 带 66bcc 真实正反例。
- **question 通道**(#21):console 问一句(q 键)→ question 事件(非 decision,指纹不进已决名单)→ 卡转待补 context 态退出队列 → 下一轮 run 先答问题(reface 只换脸,id/指纹/diff 不变)→ 带着「你问过」问答同指纹回场。
- **Metrics 上屏**(#19):落子 toast 带本次用时;Metrics 视图 = 时延中位数 + 最近 20 次分布(按 choice 着色)+ 重复率逐轮条 + 累计抑制率 + 认知含量构成(#18)——全部现读 jsonl,中位数只取现场计时。
- **note 通道 + 撤销窗口**(#24/#31):落子理由随任意手势入 decision 事件;owner toast 4s 内 `u` 撤销;authorized fix 在 State Diff 后仍可撤销。undo 只反向 receipt 中的目标文件补丁,不倒回同提交的卡/事件/metrics;日志继续只追加。
- **修正面板人话化 + 输入防丢**(#26-A/#27):category 中文化;修正只露「改后的样子」,原样折叠;修改后接受与原样接受留备注分流;首次聚焦提示不持久化。收起/面板切换有草稿先确认,a/p/r 按钮与键盘手势会携带面板未提交文字,不再有静默清空路径;park 理由同时作为 vault agent 周会复查的转交信号。
- **claim-drift 思想卡**(#18):快慢层对照(delta 窗口 vs 02_Wiki 最久未动概念笔记),每轮 ≤1 张机器节流,stakes 恒 thought;低 accept 率是预期(负样本饥荒的解药);daily job 常驻 `--slow-layer 4`。
- **runner 跨 job 串行化**(#22):文件锁(mkdir 原子 + 陈锁回收)——daily job 与 console refresh 不再能并发双烧额度。
- **replace-all hunk + 可执行性闸**(#36):hunk 契约加显式 `all: true`(替换 before 每一处;卡面/镜像渲染 all occurrences 标记;correction 保留);runner 写卡前对目标文件干跑 apply,不可执行的卡(歧义/已漂/纯插入)打回计 `unappliable`,不走到人面前。
- **日期语义**(#25):时间戳存 UTC ISO;date-only(run-metrics date、State Diff 文件名/窗口)按本地日切;用户面渲染一律本地时区。
- **白手套冷启动包**(#28 + #29):秒表前 `codex update` + `doctor --json` 当前版硬门(install 时重复校验)→ 任意 git vault 路径 → Node/ChatGPT-plan auth 预检(API key 只作显式 fallback 且只走 stdin)→ unsupported attachment 精确计数同意门 → 真实只读 smoke → 初始化 `98_Forme/`→ 首轮 ≤2 卡保守扫描 → 三 plist 绝对路径固化/校验 → console ≤10s 健康检查;Plus usage limit 在 smoke/首扫中命中时明示 reset/fallback 并在 load job 前退出。单命令卸载保留审计数据。runner 不要求 `02_Wiki/` 或 owner 目录结构,并以 `core.quotePath=false` 正确读取多语言文件名。新卡、reface、State Diff、console 与新 Taste Rules 固定 English-first;证据引用/diff 源文/历史记录不翻译。

**还不能:**
- 规则的「收录/改写/丢弃」确认交互(屏 4 Taste 面板,#20,W5)/ k 条相似历史决策注入(post-W2)。
- 呈现数量的接受率自适应节流(硬约束 #2 的完整形)——现在 = 全部待决卡一次 session。
- 其余类别的影子授权(W5)——timestamp freshness 是 owner 明示授予的窄域第一阶,不外推。
- parked 卡没有 un-park 机制——目前与 rejected 同样被永久抑制(question 是落子前的出口、undo 是落子后 15s 内的出口,但 park 本身仍是终态)。
- correction 只能改 hunk 的 after(v0);纯插入(before 为空)的 diff 拒绝自动应用。

> 一句话:**白手套路径已可预演,第一项 owner 授权也已成为可见、可撤销、零 LLM 的确定性执行。** 待验:干净账户真预演 + API-key 凭据真跑;第一张 claim-drift 继续等慢层轮转;周日 State Diff。
