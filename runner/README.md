# runner/ — 漂移扫描 + 确定性落盘

W1 Codex 路径已跑通(#5),W2 指纹抑制闭环已生效(#9)。runner 把一次 agent run 变成真盘上的卡:

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
6. **`mirror.ts`** — 渲染 markdown 镜像(硬约束 #4)。
7. 落盘:`<vault>/98_Forme/cards/<id>.json` + `<id>.md`;`id` 由指纹派生,重复运行同一漂移**幂等不重写**。
8. **`metrics.ts`** — 真实 run 末尾追加 `{date, proposed, suppressed, presented, rejected, dup}` 到 `<vault>/98_Forme/run-metrics.jsonl`(重复率曲线原料;dry-run 不落点)。

**一切写盘、校验、指纹由本目录代码执行,agent 只读、只返回 JSON**(硬约束 #7)。写入只落 `98_Forme/`,不碰知识层(2026-07-04 边界裁定)。

## 调度(launchd,#9)

`../launchd/install.sh <vault> [hour]` 装 `com.forme.runner`:每日定时(StartCalendarInterval)+ vault commit 触发(WatchPaths 盯 `.git/logs/HEAD`,工作流边界)+ 登录补跑(RunAtLoad)。plist **直接 exec node**(不经 shell wrapper——带 provenance xattr 的脚本会被 launchd 拒执行),真跑与否由 runner 自己的 `--min-hours 20` 守卫决定:`run-metrics.jsonl` 的 mtime 距今不足即跳过——每日最多一轮,手动/自动共享同一额度窗口。日志在 `~/Library/Logs/forme/runner.log`;卸载命令见 `install.sh` 头注释。

## 当前边界

- 只做 Codex 一次性调用;OpenCode server/SDK(#8)日后插在同一 `scan → assemble → write` 核心之后(双调用形态)。
- **不写 `decisions.jsonl`**:还没有 console,卡是「生成入列」不是「呈现落子」,写 presented 事件会不诚实——事件从 console(W3)呈现/落子时才产生。
- parked 与 rejected 同样被永久抑制;un-park 机制随 console(W3+)。
- Taste Rules / 相似历史注入 prompt 留 W2 后段(#10)。

数据契约见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`。
