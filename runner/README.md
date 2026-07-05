# runner/ — 漂移扫描 + 确定性落盘

W1 Codex 路径已可跑通(issue #5)。runner 把一次 agent run 变成真盘上的卡:

```
node runner/index.ts --vault <vault 路径> [--commits 4] [--max-files 12] [--max-cards 3] [--dry-run] [--model <m>] [--out <dir>]
# 或:FORME_VAULT=<vault> npm run run:once -- --max-cards 3
```

## 管道

1. **`scan.ts`** — 取 vault 最近 N 个 commit 的 markdown git-delta(增量,服务「唤醒 ≤10s」的雏形)。
2. **`agent-schema.ts`** — 生成给 codex 的 `--output-schema`。**故意宽松**:codex 用 OpenAI strict 结构化输出(拒 `pattern`/`minItems`/`format`,且要求每个属性都 required、可选项走 nullable)。它只定形状。
3. **`index.ts`** — `codex exec --sandbox read-only -C <vault> --output-schema … -o …`,拿回**只读 JSON**。agent 全程只读,绝不写盘。
4. **`card.ts` → `assembleCard()`** — 确定性组装:补 id / 信封(origin/from/role)/ 默认 a/p/r / 指纹,再过 **Forme 自己的 AJV**(`schema/validate.ts`,真契约在这里把关,不信 codex 的宽松 schema)。校验不过即丢弃。
5. **`mirror.ts`** — 渲染 markdown 镜像(硬约束 #4)。
6. 落盘:`<vault>/98_Forme/cards/<id>.json` + `<id>.md`;`id` 由指纹派生,重复运行同一漂移**幂等不重写**。

**一切写盘、校验、指纹由本目录代码执行,agent 只读、只返回 JSON**(硬约束 #7)。写入只落 `98_Forme/`,不碰知识层(2026-07-04 边界裁定)。

## W1 边界

- 只做 Codex 一次性调用;OpenCode server/SDK(#8)日后插在同一 `scan → assemble → write` 核心之后(双调用形态)。
- **不写 `decisions.jsonl`**:W1 没有 console,卡是「生成入列」不是「呈现落子」,写 presented 事件会不诚实——事件从 console(W3)呈现/落子时才产生。
- 去重目前只做「同指纹文件已存在则跳过」的幂等;对 rejected/parked 名单的硬过滤留 W2。

数据契约见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`。
