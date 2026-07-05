# runner/ — 漂移扫描 + 确定性落盘

**状态:骨架占位(issue #5 填充)。**

runner 是把 agent run 变成真盘上一张卡的那段确定性代码:

1. 增量拉取 vault 的 git delta(服务「唤醒 ≤ 10s」)。
2. 调 agent 找漂移 —— 按**双调用形态**设计:
   - one-shot exec:`codex exec --json --output-schema`(Tier 1 默认,`--sandbox workspace-write`)
   - 长驻 server/SDK:OpenCode `session.prompt` + json_schema(Tier 2,#8)
3. 拿回 agent 的**只读 JSON** → `schema/validate.ts` 校验 → `schema/fingerprint.ts` 算指纹 → 指纹查重丢弃命中项 → 写卡片 JSON + markdown 镜像进 vault。

**一切写盘、校验、指纹由本目录代码执行,agent 只读、只返回 JSON**(硬约束 #7)。数据契约见 `docs/SCHEMA.md`。
