# runner/ — 漂移扫描 + 确定性落盘

W1 Codex 路径已跑通(#5),W2 全链就位:指纹抑制(#9)、taste 提炼(#10)、State Diff(#11)、卡面 v0.1(#12)。runner 把一次 agent run 变成真盘上的卡:

```
node runner/index.ts --vault <vault 路径> [--commits N] [--max-files 12] [--max-cards 3] [--slow-layer N] [--slow-root <vault-relative-dir>] [--dry-run] [--model <m>] [--out <dir>]
# 或:FORME_VAULT=<vault> npm run run:once -- --max-cards 3
```

**跨 job 串行锁(#22)**:进程一启动先抢 `98_Forme/.runner.lock`(mkdir 原子)——daily job 与 console 触发的 refresh 是两个 label,launchd 的单实例保护跨不过去,额度守卫的 mtime 时钟在并发下是 TOCTOU;拿不到锁 = 已有 run 在飞,exit 0 静默退出;陈锁(>30min)回收。

## 管道

1. **`scan.ts`** — 取 markdown git-delta(增量,服务「唤醒 ≤10s」的雏形)。**窗口 = 上次成功 run 以来**(#14):锚点 = run-metrics 最后记录的 vault HEAD,增量 = `anchor..HEAD`,窗口自动等于 run 节律;`--commits N` 显式传参 = 手动覆盖,锚点缺失(首跑)或失效(rebase)时回退最近 N commit。空窗口 = 日常静默结果(exit 0)。**排除 `98_Forme/`**——Forme 自己的运行时产物不是漂移面,否则会对上一轮输出提卡自激。**慢层立场参照**(#18/#28):`--slow-layer N --slow-root <dir>` 追加指定根目录里最久没被 commit 动过的 N 篇笔记进 prompt(取窗按日轮转,~len/N 天覆盖一遍);安装器见到 `02_Wiki/` 就沿用,否则取 vault 根目录,不预设用户结构。
2. **`agent-schema.ts`** — 生成给 codex 的 `--output-schema`。**故意宽松**:codex 用 OpenAI strict 结构化输出(拒 `pattern`/`minItems`/`format`,且要求每个属性都 required、可选项走 nullable)。它只定形状。
3. **`index.ts`** — `codex exec --sandbox read-only -C <vault> --output-schema … -o …`,拿回**只读 JSON**。agent 全程只读,绝不写盘。扫描之前先跑 **question 阶段**(#21):上一轮用户在 console 发问的卡(待补 context)逐张 reface——空窗口也要答;耗了真 codex 就落 metric 行走额度表。prompt v0.2 带世界层指令 + 66bcc 正反例 + stakes 分级。**空白冷启动**(#28)由盘上事实判定(零卡/零 decisions/零 Taste Rules;只有运维 metrics 不算变暖):首批硬限 ≤2 卡、慢层延后、空 Taste 不注入。**English-first**(#29):所有新卡与 reface 的人读说明固定英文;证据 quote、路径、专名与 diff 源文逐字保留,历史卡不回写。
4. **`card.ts` → `assembleCard()`** — 确定性组装:补 id / 信封(origin/from/role)/ 默认 a/p/r / 指纹 / stakes 消毒(#21:申报非法按 category 派生),再过 **Forme 自己的 AJV**(`schema/validate.ts`,真契约在这里把关,不信 codex 的宽松 schema)。校验不过即丢弃。
5. **`suppress.ts`** — 指纹抑制(#9,硬约束 #6):从 `<vault>/98_Forme/decisions.jsonl` 读已决名单(任何 `decision` 事件的指纹,accept/park/reject 不分),命中即静默丢弃、计 `suppressed`。解析宽容(抑制是安全网,不因 schema 挑剔放行重复卡)。**question 事件不是 decision**——发过问的指纹不进名单,reface 后同指纹回场不算重复。**undo 把指纹移出名单**(#24:撤销后回到未决;按文件序重放)。
6. **`hunks.ts`** — **可执行性干跑**(#36):hunk 匹配语义(唯一匹配 / `all: true` 全部替换 / `L<行号>` 消歧)的纯函数层,console accept 与入列前干跑共用;写卡前对目标文件当前内容干跑一遍,accept 时会失败的卡(歧义/内容已漂/纯插入)当场打回、计 `unappliable`——不可执行的提案不走到人面前。
7. **`legibility.ts`** — **世界层闸**(#21,与 #13 禁词闸同族):「卡面说事,diff 说账」——账本手术语域(已完成项/拆成待办/速览…)上了世界层段(title/summary/whyNow)即打回;同轮给一次 reface 重写机会,仍不过即弃(下轮重提)。纯账本卡(stakes=reversible-ledger,按 category 派生豁免面)不检查:它们的「事」就是账。
8. **`reface.ts`** — 卡面重写(#21,闸打回与 question 共用):codex **只换脸**(title/summary/whyNow/onAccept + 问答 context),id/指纹/diff/evidence 永不变;question 路径要求 answer 非空,否则卡继续待补下轮重试。
9. **`mirror.ts`** — 渲染 markdown 镜像(硬约束 #4);**卡面 v0.1 决策者优先五段**(#12):是什么 → 为什么现在 →(你问过,#21)→ 建议 → 拍板后会发生什么 → 落子;证据+diff 折叠为支撑层;stakes/revisedAt 进 frontmatter。
10. 落盘:`<vault>/98_Forme/cards/<id>.json` + `<id>.md`;`id` 由指纹派生,重复运行同一漂移**幂等不重写**(reface 是对同 id 卡的显式覆写,唯一例外)。
11. **`metrics.ts`** — 真实 run 末尾追加 `{date, proposed, suppressed, presented, rejected, dup, head, illegible?, unappliable?, refaced?, thought?}` 到 `<vault>/98_Forme/run-metrics.jsonl`(重复率曲线原料 + 下轮增量锚点 + legibility/认知含量原料;dry-run 不落点)。**date 按本地日切**(#25;`localDate()` 是全库共用的日切助手)。

**一切写盘、校验、指纹由本目录代码执行,agent 只读、只返回 JSON**(硬约束 #7)。写入只落 `98_Forme/`,不碰知识层(2026-07-04 边界裁定)。

## 姊妹管道(同一套「确定性采集 → agent 只读 JSON → 代码落盘」骨架)

- **`taste.ts`**(#10、#13、#29)—— `node runner/taste.ts --vault <v>`:决策日志(+卡体上下文)→ codex 提炼 → 追加 `98_Forme/Taste Rules.md`。护栏全在代码:sourceCardIds 溯源过滤(清零即弃)、零负样本时 confidence 钉死 low、**规则行禁词硬闸**(中英系统词上人读层即整条丢弃)、**新规则英文硬闸**、追加制不动既有文本。旧中文规则是历史证据,不翻译;新提炼规则与账本小字固定英文。`<!-- forme-rule: {...} -->` 注释块继续是结构化存储。
- **`state-diff.ts`**(#11)—— `node runner/state-diff.ts --vault <v> [--min-days 4] [--dry-run]`:周数据包(git 周窗口 / 待决卡 / Inbox / Reports:Posts / run 汇总)→ codex 四段叙事 → `98_Forme/state-diff-YYYY-MM-DD.md`;四段骨架由渲染器钉死。

## 调度(launchd,#9 + #11)

`../launchd/install.sh <vault> [日跑小时] [周日小时]` 装三个 job,plist 均**直接 exec node**(不经 shell wrapper——带 provenance xattr 的脚本会被 launchd 拒执行)。#28 白手套路径会先做 Codex auth smoke + 保守首跑,详见 `docs/WHITE_GLOVE_INSTALL.md`:

- `com.forme.runner`:每日定时 + vault commit 触发(WatchPaths 盯 `.git/logs/HEAD`,工作流边界)+ 登录补跑(RunAtLoad);守卫 `--min-hours 20`(`run-metrics.jsonl` mtime 时钟,手动/自动共享额度窗口;跨 job 并发由文件锁串行化 —— #22)+ `--slow-layer 4`(思想卡对照面 —— #18)。
- `com.forme.statediff`:每周日 18:00;守卫 `--min-days 4`(最新产物文件名日期);**无 RunAtLoad**(第一张必须产在周日;睡眠错过唤醒补发,整机关机顺延下周日)。
- `com.forme.console`:常驻 127.0.0.1:6180(RunAtLoad + KeepAlive,#16);打开页面即触发后台增量 run(`--min-hours 2`,同一 mtime 时钟)。

日志在 `~/Library/Logs/forme/{runner,statediff,console}.log`;`../launchd/uninstall.sh` 一条命令停 job + 删 plist,保留 vault 的 `98_Forme/` 供审计。

## 当前边界

- 只做 Codex 一次性调用;OpenCode server/SDK(#8)日后插在同一 `scan → assemble → write` 核心之后(双调用形态)。
- **runner 仍不写 `decisions.jsonl`**:卡是「生成入列」;presented/decision/correction/question 事件由 `console/`(#15/#21)在实际呈现与落子时产生。
- parked 与 rejected 同样被永久抑制;question 是「先别落子」的出口,但 park 本身仍是终态(un-park 后续)。
- k 条相似历史决策注入 prompt 留 post-W2(Taste Rules 注入已通,#10)。
- 世界层闸是词表启发式(账本手术语域的对偶),不做语义判断;词表随真实误伤/漏放修订。

数据契约见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`。
