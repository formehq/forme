# DECISIONS — 设计决策日志(ADR-lite)

只追加。一段一条:**日期 · 标题 · 决定 · 理由 · 验证状态**(`assumed` / `validated-in-use` / `revised`)。系统事实住这里,战略住 vault,不双写。

---

**2026-07-04 · 仓库骨架 = runner / schema / console / docs / design · assumed**
四个顶层功能目录 + `design/`(交互稿)。卡片 JSON 与 md 镜像不进 repo——它们是运行时产物,住 vault(硬约束 #4:vault 是唯一真相层)。`.gitignore` 排掉 `node_modules/` 和一切 `*.local` 运行时输出。(issue #6)

**2026-07-04 · 工具链 = Node 原生 TS,无构建步骤 · validated-in-use**
Node ≥ 22.18 直接跑 `.ts`(type-stripping),不引 tsx / bundler。测试用内置 `node --test`;类型检查用 `tsc --noEmit`(`erasableSyntaxOnly` + `verbatimModuleSyntax`,保证 strip 安全)。理由:CLAUDE.md「勿引重框架」;W1 只需能校验 schema。已验证:`npm test` 13 项绿、`npm run validate`、`npm run typecheck` 均通过。(issue #6)

**2026-07-04 · 校验器 = 自有 AJV(Ajv2020) · validated-in-use**
schema 是 draft 2020-12,故用 `ajv/dist/2020`。开 `strict`,但关 `strictTypes` / `strictRequired`(后者对 if/then 引用父层 required 属性误报)。设计基线:agent 只返回 JSON,admissibility 由 Forme 代码判,**不信 harness 自觉**(issue #4 vault 侧备忘)。(issue #4)

**2026-07-04 · diff 表示 = 精确字符串 before/after hunks(非 unified diff) · assumed**
每个 hunk 是"匹配 before → 换成 after"的精确替换。理由:(1) 对 MVP 漂移(frontmatter 翻转、wikilink 改写、断言更新)确定性可应用;(2) 天然渲染成 `-/+`,与交互稿卡面同构;(3) git 提交即可回滚。代价:表达不了大重构/纯行移动——留给 post-MVP 的 `unifiedDiff` 变体。待 #5 runner 落地后转 validated-in-use。(issue #4)

**2026-07-04 · 一张卡 = 一个目标文件 · assumed**
`diff.file` 单数;指纹 = category + file + diffHash 因此干净,每处改动独立可回滚。同一漂移跨多文件 → 多张卡(各自去重),而非一张跨文件卡。"一键改全部"是 post-MVP 批量卡(envelope `role` 已预留)。(issue #4)

**2026-07-04 · 指纹 = sha256(category ∥ file ∥ diffHash),hunk 顺序无关 · validated-in-use**
diffHash 先把 hunks 规范排序再哈希,故同一组改动无论 agent 吐出顺序如何都得同一指纹——去重靠这段确定性工程,不靠 LLM(硬约束 #6)。已验证:顺序无关性 + category/file/diff 任一变则指纹变,均有测试覆盖。(issue #4)

**2026-07-04 · decisions.jsonl = presented / decision / correction 三型;latency 落在 decision 上 · assumed**
"latency"信号实现为 decision 事件的 `latencyMs`(= presented→decision 的静默计时),而非独立事件;presented 事件保留,可重算。correction 是 read-only 的唯一例外,记其编辑后的 hunks + 可选 note(taste 规则的原料)。理由:避免把已在 decision 上的延迟二次记录。(issue #4)

**2026-07-04 · Console 技术栈 = 原生 TS + node:http,零框架 · assumed**
localhost console(W3)用 Node 内置 http + 原生 TS + 极简客户端脚本,不引 React/Next 等重框架。理由:CLAUDE.md Day-1 倾向 + 硬约束 #4(UI 零私有状态、卡有 md 镜像)——UI 是 vault 的确定性投影,不需要重前端。与 spec 无冲突,未升 needs-vault-decision。W3 动工时若被推翻则转 revised。(issue #6)

**2026-07-04 · License = Apache-2.0(公开时应用) · assumed**
`package.json` 已标 `Apache-2.0`;LICENSE 文件在 W6 公开清单里补。(issue #6,承 vault 侧既有决定)

**2026-07-04 · vault 写入边界 = 仅 `98_Forme/` · assumed**
会话协议「不改 vault 内容」裁定为:不动知识层(既有各目录任何文件)。Forme 运行时产物(卡片 JSON + md 镜像、`decisions.jsonl`、日后 `Taste Rules.md`)只写 vault 顶层 `98_Forme/`,其外零写入。已转录进 CLAUDE.md 会话协议。#5 runner 落地后转 validated-in-use。(vault 侧裁定,承 #5)

**2026-07-04 · decisions.jsonl 保持事件日志,种子对齐 schema(非反之) · validated-in-use**
撤回「runner 对齐 #1 种子格式」——spec 承诺 event-log 形态(relay/同步友好),单条终态记录表达不了 park→再决策的生命周期(要么破坏 append-only,要么退化回事件语义)。#1 的三条种子是**去范式化的历史数据快照,不是 schema**。据此微调 event schema(非重构):①`decision` 加可选 `executed`(应用 diff 的 commit hash,种子里唯一值得吸的字段);②决策者字段命名 `actor`,枚举 `owner`/`agent_shadow`/`agent_authorized`——不撞卡 envelope 的 `role`(消息角色),且是影子模式必需字段,一步到位;③**事件反范式化**:去掉 denormalized `category`,事件只引 `cardId`+`fingerprint`,category/信封住卡里;④backfilled 记录可省 `latencyMs`(人肉阶段未计时)。三条种子已事件化导入 `schema/samples/decisions.sample.jsonl`(每卡 presented+decision 一对,`ts`/`executed`/`fingerprint` 均由真实 vault commit 反查,标 `backfilled`)。已验证:18 项测试绿。(issue #4;修订本文件上一条「三型」ADR)
