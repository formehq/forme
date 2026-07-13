# ARCHITECTURE — 一页系统图

Forme = local-first agent,把知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + a/p/r),并从每次决策学 taste。**vault 是唯一真相层**;repo 里只有代码,卡片/日志都写进 vault。

## 一张卡的生命周期(7 步)

```
launchd (StartCalendarInterval 日跑 + WatchPaths 盯 vault   [launchd/ 已建 · #9]
   │      .git/logs/HEAD + RunAtLoad 补跑;额度守卫在 runner --min-hours)
   │  唤醒 → 首卡可见 ≤ 10s(增量指纹只处理 git delta)
   ▼
runner  ──►  codex exec --json --output-schema             [runner/ 已建 · #5]
   │         (文件锁串行化跨 job 竞态 —— #22;
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
   ├─ accept → hunk 精确替换(全有或全无)→ git 提交回执 executed
   │   toast 带本次用时(latencyMs 真值上屏 —— #19)
   │   + 撤销窗口 4s(#24):undo 补偿事件,accept 走 git revert
   └─ 追加 decisions.jsonl(presented / correction / decision / question / undo;
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
| `launchd/` | 日跑 + 周日 State Diff + 常驻 console 三 plist;白手套安装/卸载/预检 | **已建(#9、#11、#16、#28)** |
| `console/` | localhost 四视图 + 落子手势 + wake-catchup + 问一句 + Metrics(单页,零框架) | **已建(#15、#16、#19、#21、#26-A、#27;真实落子已发生)** |
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
- **Metrics 上屏**(#19):落子 toast 带本次用时;Metrics 视图 = 时延中位数 + 最近 20 次分布(按 choice 着色)+ 重复率逐轮条 + 累计抑制率 + 认知含量构成(#18)——全部现读 jsonl,中位数只取现场计时。
- **note 通道 + 撤销窗口**(#24):落子理由随任意手势入 decision 事件;toast 4s 内 `u` 撤销——undo 补偿事件(日志仍只追加),accept 撤销走 git revert,四处读取方(队列/抑制/taste/question)同步生效判定。
- **修正面板人话化 + 输入防丢**(#26-A/#27):category 中文化;修正只露「改后的样子」,原样折叠;修改后接受与原样接受留备注分流;首次聚焦提示不持久化。收起/面板切换有草稿先确认,a/p/r 按钮与键盘手势会携带面板未提交文字,不再有静默清空路径;park 理由同时作为 vault agent 周会复查的转交信号。
- **claim-drift 思想卡**(#18):快慢层对照(delta 窗口 vs 02_Wiki 最久未动概念笔记),每轮 ≤1 张机器节流,stakes 恒 thought;低 accept 率是预期(负样本饥荒的解药);daily job 常驻 `--slow-layer 4`。
- **runner 跨 job 串行化**(#22):文件锁(mkdir 原子 + 陈锁回收)——daily job 与 console refresh 不再能并发双烧额度。
- **日期语义**(#25):时间戳存 UTC ISO;date-only(run-metrics date、State Diff 文件名/窗口)按本地日切;用户面渲染一律本地时区。
- **白手套冷启动包**(#28 + #29):秒表前 `codex update` + `doctor --json` 当前版硬门(install 时重复校验)→ 任意 git vault 路径 → Node/ChatGPT-plan auth 预检(API key 只作显式 fallback 且只走 stdin)→ unsupported attachment 精确计数同意门 → 真实只读 smoke → 初始化 `98_Forme/`→ 首轮 ≤2 卡保守扫描 → 三 plist 绝对路径固化/校验 → console ≤10s 健康检查;Plus usage limit 在 smoke/首扫中命中时明示 reset/fallback 并在 load job 前退出。单命令卸载保留审计数据。runner 不要求 `02_Wiki/` 或 owner 目录结构,并以 `core.quotePath=false` 正确读取多语言文件名。新卡、reface、State Diff、console 与新 Taste Rules 固定 English-first;证据引用/diff 源文/历史记录不翻译。

**还不能:**
- 规则的「收录/改写/丢弃」确认交互(屏 4 Taste 面板,#20,W5)/ k 条相似历史决策注入(post-W2)。
- 呈现数量的接受率自适应节流(硬约束 #2 的完整形)——现在 = 全部待决卡一次 session。
- 影子授权(W5)——但 recommendation 与实际 choice 的对照数据已开始积累。
- parked 卡没有 un-park 机制——目前与 rejected 同样被永久抑制(question 是落子前的出口、undo 是落子后 15s 内的出口,但 park 本身仍是终态)。
- correction 只能改 hunk 的 after(v0);纯插入(before 为空)的 diff 拒绝自动应用。

> 一句话:**第二台 Mac 的白手套路径已把 English-first 一并固化(#28/#29):首用户从第一张卡开始就看到真实产品,不存在装机后语言迁移。** 待验:Zayn 干净账户真预演 + API-key 凭据真跑;第一张 claim-drift 继续等慢层轮转;周日 State Diff。下一块 = 07-21 首用户装机。
