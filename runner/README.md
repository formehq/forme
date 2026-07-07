# runner/ — 漂移扫描 + 确定性落盘

W1 Codex 路径已跑通(#5),W2 全链就位:指纹抑制(#9)、taste 提炼(#10)、State Diff(#11)、卡面 v0.1(#12)。runner 把一次 agent run 变成真盘上的卡:

```
node runner/index.ts --vault <vault 路径> [--commits 4] [--max-files 12] [--max-cards 3] [--dry-run] [--model <m>] [--out <dir>]
# 或:FORME_VAULT=<vault> npm run run:once -- --max-cards 3
```

## 管道

1. **`scan.ts`** — 取 vault 最近 N 个 commit 的 markdown git-delta(增量,服务「唤醒 ≤10s」的雏形);**排除 `98_Forme/`**——Forme 自己的运行时产物不是漂移面,否则会对上一轮输出提卡自激。
2. **`agent-schema.ts`** — 生成给 codex 的 `--output-schema`。**故意宽松**:codex 用 OpenAI strict 结构化输出(拒 `pattern`/`minItems`/`format`,且要求每个属性都 required、可选项走 nullable)。它只定形状。
3. **`index.ts`** — `codex exec --sandbox read-only -C <vault> --output-schema … -o …`,拿回**只读 JSON**。agent 全程只读,绝不写盘。
4. **`card.ts` → `assembleCard()`** — 确定性组装:补 id / 信封(origin/from/role)/ 默认 a/p/r / 指纹,再过 **Forme 自己的 AJV**(`schema/validate.ts`,真契约在这里把关,不信 codex 的宽松 schema)。校验不过即丢弃。
5. **`suppress.ts`** — 指纹抑制(#9,硬约束 #6):从 `<vault>/98_Forme/decisions.jsonl` 读已决名单(任何 `decision` 事件的指纹,accept/park/reject 不分),命中即静默丢弃、计 `suppressed`。解析宽容(抑制是安全网,不因 schema 挑剔放行重复卡)。
6. **`mirror.ts`** — 渲染 markdown 镜像(硬约束 #4);**卡面 v0.1 决策者优先五段**(#12):是什么 → 为什么现在 → 建议 → 拍板后会发生什么 → 落子;证据+diff 折叠为支撑层。
7. 落盘:`<vault>/98_Forme/cards/<id>.json` + `<id>.md`;`id` 由指纹派生,重复运行同一漂移**幂等不重写**。
8. **`metrics.ts`** — 真实 run 末尾追加 `{date, proposed, suppressed, presented, rejected, dup}` 到 `<vault>/98_Forme/run-metrics.jsonl`(重复率曲线原料;dry-run 不落点)。

**一切写盘、校验、指纹由本目录代码执行,agent 只读、只返回 JSON**(硬约束 #7)。写入只落 `98_Forme/`,不碰知识层(2026-07-04 边界裁定)。

## 姊妹管道(同一套「确定性采集 → agent 只读 JSON → 代码落盘」骨架)

- **`taste.ts`**(#10、#13)—— `node runner/taste.ts --vault <v>`:决策日志(+卡体上下文)→ codex 提炼 → 追加 `98_Forme/Taste Rules.md`。护栏全在代码:sourceCardIds 溯源过滤(清零即弃)、零负样本时 confidence 钉死 low、**规则行禁词硬闸**(系统词上人读层即整条丢弃)、追加制不动人编辑的文本。**表达层双层**(#13,「结论用人话一行,账本降层可查」):规则行 = 用户语体祈使句(prompt 注入 `STYLE_FEWSHOTS` = owner 手写规则作风格样例);账本(依据/统计/置信/时效)由代码渲染成斜体小字;`<!-- forme-rule: {...} -->` 注释块 = 结构化存储(`loadTasteRuleRecords()` 供 W3 重验/确认卡)。已生效规则由 `loadTasteRuleLines()` 回注 runner prompt。
- **`state-diff.ts`**(#11)—— `node runner/state-diff.ts --vault <v> [--min-days 4] [--dry-run]`:周数据包(git 周窗口 / 待决卡 / Inbox / Reports:Posts / run 汇总)→ codex 四段叙事 → `98_Forme/state-diff-YYYY-MM-DD.md`;四段骨架由渲染器钉死。

## 调度(launchd,#9 + #11)

`../launchd/install.sh <vault> [日跑小时] [周日小时]` 装两个 job,plist 均**直接 exec node**(不经 shell wrapper——带 provenance xattr 的脚本会被 launchd 拒执行):

- `com.forme.runner`:每日定时 + vault commit 触发(WatchPaths 盯 `.git/logs/HEAD`,工作流边界)+ 登录补跑(RunAtLoad);守卫 `--min-hours 20`(`run-metrics.jsonl` mtime 时钟,手动/自动共享额度窗口)。
- `com.forme.statediff`:每周日 18:00;守卫 `--min-days 4`(最新产物文件名日期);**无 RunAtLoad**(第一张必须产在周日;睡眠错过唤醒补发,整机关机顺延下周日)。

日志在 `~/Library/Logs/forme/{runner,statediff}.log`;卸载命令见 `install.sh` 头注释。

## 当前边界

- 只做 Codex 一次性调用;OpenCode server/SDK(#8)日后插在同一 `scan → assemble → write` 核心之后(双调用形态)。
- **不写 `decisions.jsonl`**:还没有 console,卡是「生成入列」不是「呈现落子」,写 presented 事件会不诚实——事件从 console(W3)呈现/落子时才产生。
- parked 与 rejected 同样被永久抑制;un-park 机制随 console(W3+)。
- k 条相似历史决策注入 prompt 留 post-W2(Taste Rules 注入已通,#10)。

数据契约见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`。
