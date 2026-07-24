# Knowledge Vault entropy investigation

> **Research status:** owner-supplied read-only investigation captured on 2026-07-22. This is evidence for Stewardship and long-running knowledge-system design, not current Forme product or implementation authority.

## Prompt

调查这个repo(/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB), 然后就Second Brain/Long Running Knowledge Vault/maintaining low entropy来讲，这个repo是怎么组织的？

## Answer
结论：这个 repo 不是一个传统的“分类式 Second Brain”，而是一个 AI 可操作的长期认知系统原型。它的组织核心是：

> 信息成熟度管道 + 双导航层 + 行动层 + 治理层 + Agent 运行时。

它目前呈现出一个很鲜明的状态：**结构熵很低，但时间熵和执行熵仍然偏高。**

```text
Capture
00_Inbox / Clippings / Flomo
        ↓
01_Raw：保真、可追溯
        ↓
02_Wiki：概念 / 项目 / 人 / 问题 / 框架
        ↓
03_Outputs：报告 / 文章 / 对外载体
        ↓
外部反馈与项目结果
        ↺ 回流 Wiki / Action / Raw

横向控制面：
04_Index + Workflows + Contracts + Audits + 98_Forme
```

## 它是怎么组织的

### 1. 按“信息成熟度”组织，而不只是按主题分类

最底层结构是：

- `00_Inbox/`、`Clippings/`：未处理队列。
- `01_Raw/`：保留原始材料、来源、时间和语境。
- `02_Wiki/`：把多个来源压缩成可复用知识。
- `03_Outputs/`：把知识变成报告、文章、项目叙事和公开材料。
- `99_Archive/`：退出当前运行面的材料。

核心循环被明确写成：

```text
Raw Input → Selection → Compression → Concept → Output → Feedback → Better Input
```

见 [Compounding Knowledge System](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/02_Wiki/Concepts/Compounding Knowledge System.md:20>)。

关键点是“Raw 与 synthesis 分层”：AI 可以改写 Wiki，但不应破坏 Raw 的来源真实性。这让系统可以不断重新解释过去，而不必相信某次 AI 总结就是最终版本。

### 2. Wiki 不是单一树状分类，而是 Hub / Support / Endpoint 网络

`02_Wiki/` 又按对象类型拆成：

- `Concepts/`：跨项目复用的判断和概念。
- `Projects/`：有边界、状态、决策和 Next Actions 的现实容器。
- `People/`：反馈、关系、协作和机会节点。
- `Questions/`：允许长期保持未解决。
- `Frameworks/`：可反复调用的判断与治理模型。

概念再通过 `role: hub | support | seed | reference`、`maturity`、`priority` 表达重要度，而不是让每篇笔记看起来都同样重要。

它允许多个中心并存，不强迫所有内容归入一个总理论。[AI Operating Spec](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/AI Operating Spec.md:31>) 明确规定这些只是不同入口。

### 3. 它有两条独立导航线

知识导航：

```text
Home → Topic Map / Knowledge Map → Hub → Support → Endpoint
```

行动导航：

```text
Home → Action Index → Active Work Hub → Operating Plan
     → Next Action → Project / People / Output
```

这是很重要的设计：**“我想理解什么”与“我现在该做什么”不再使用同一套导航。**

[Home](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/Home.md:3>) 是意图路由器；`Topic Map`、Canvas、Bases 负责知识浏览；`Action Index` 和 `Forme Console` 负责当前工作。全局 Graph 被主动降级，因为它容易把链接数量误当成知识结构。

### 4. 重复维护被外部化成可执行协议

`04_Index/Workflows.md` 描述一般流程；[AI Work Contracts](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/AI Work Contracts.md:24>) 则把重复任务写成：

```text
Trigger
→ Inputs
→ Steps
→ Output
→ Human Review
→ Stop Condition
```

目前有 13 个 contract，覆盖 Inbox、Flomo、行动整理、报告回填、People signal、公开安全提炼和 layer drift 等。

其中 C13 很关键：它专门检查“下层材料已经变了，上层概念、项目、行动页和公共叙事是否还停在旧状态”，见 [C13 Vision Drift / Layer Synchronization](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/AI Work Contracts.md:465>)。

### 5. `98_Forme/` 是第二代低熵运行时

这是 repo 最独特的部分。它不再只生成审计报告，而是把发现的问题变成 decision card：

```text
发现冲突或过期信息
→ 提供证据
→ 生成最小 diff
→ Accept / Park / Reject
→ 执行并留下 Git receipt
```

例如 [这张 dangling-task card](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/98_Forme/cards/card_3b4f11c6b765df0b.md:15>) 发现“Post Log 的汇总数字和真实 pipeline 不一致”，然后给出两处最小修改。

这让低熵维护从“AI 写一篇建议报告”变成了“人做一个小判断，机器完成可逆修改”。它还保留 fingerprint、decision log、run metrics 和 Taste Rules，试图逐渐学会哪些低风险修复可以自主执行。

## 从三个视角看

### Second Brain

它把 Second Brain 理解成“外部工作记忆与认知耦合层”，不是记忆替代品，也不是资料仓库。

目标是：

- 在项目中断后恢复 working set。
- 保存判断形成的路径，而不只保存最终结论。
- 让 AI 能区分原始材料、稳定概念、当前行动和历史报告。
- 维持 `continuity, not total memory`。

因此它比传统 PARA 多了 provenance、question、people、trust boundary 和 agent-operating-spec。

### Long-running Knowledge Vault

长期运行依靠四种时间结构：

- Git 保存变更历史与执行凭证。
- Project SSOT / Live Console 保存当前事实。
- Daily Briefing / State Diff 恢复“上次之后发生了什么”。
- Work Contracts 让未来 agent 不依赖聊天记忆。

它甚至记录了一个失败：旧 Daily Briefing 要求人每天填写状态和晚间回顾，7 天内死亡；后来被重写成只读、五分钟以内的 AI briefing，见 [Daily Briefing Workflow](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/Daily Briefing Workflow.md:12>)。

但长期运行目前仍不稳定：[Scheduled Agent Maintenance](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/Scheduled Agent Maintenance.md:18>) 已明确承认定时自动化没有持续运行，真实状态仍是 local on-demand。

### Maintaining Low Entropy

它主要通过这些机制降熵：

- Raw-first，避免输入阶段过度分类。
- Promotion threshold，不把每条笔记升级成 concept。
- Hub 策展，避免依赖噪声很大的全局 Graph。
- `role / maturity / priority`，让概念拥有不同权重。
- 单一事实源、状态标记和 dormant 页面。
- Report backfill，防止报告成为死端。
- Action consolidation，试图避免任务散落。
- Trust Boundary，防止私人材料在压缩过程中意外进入公共面。
- Forme card 的最小 diff、可逆性、证据和 decision receipt。

## 当前真实健康度

现在共有 468 个 Markdown 文件：

- Raw：181
- Wiki：82
- Outputs：94，其中 Reports 88、Posts 6
- Index：23
- Forme runtime：56
- Inbox：10

仓库自带的 health-metrics 在 2026-07-22 给出的结果是：

- 内容笔记孤儿率约 3%：链接结构很好。
- 行动项关闭率约 32%：执行闭环偏弱。
- 距上次 commit 7 天。
- Home 已 13 天未更新。
- Reports 88 vs Posts 6：明显存在 meta-work 吸引子。
- 49 篇 concept 仍全部处于 `seed` 或 `draft`，没有 `developed` / `evergreen`。

而且 [Action Index](</Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/04_Index/Action Index.md:117>) 仍写着“07-13（今天）”和已经过去的 07-14 任务，说明一旦 agent 停跑，live surface 很快产生时间漂移。

所以最准确的总结是：

> 这是一个“低结构熵、高可审计性”的 Second Brain；它已经证明 Agent 能显著降低整理和同步成本，但还没有证明自己能在无人持续推动时长期保持低时间熵。

它最需要的不是更多分类或更多 workflow，而是压缩控制面、建立报告生命周期，并让 Inbox age、action closure、index freshness、commit freshness 成为真正持续运行的硬指标。

本次为只读调查，没有修改 vault；本机未提供可调用的 Obsidian CLI，因此使用了仓库文件、Git 历史和 repo 自带的 health-metrics 脚本。
