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

**2026-07-06 · 指纹抑制 = 任何已决指纹一律抑制;读取宽容解析 · assumed**
runner 每轮从 `98_Forme/decisions.jsonl` 建抑制名单:出现过 `decision` 事件的指纹(accept/park/reject 不分)命中即静默丢弃、记 `suppressed`。accept 已执行的漂移理论上不会再被提出(before 串已变→指纹必变),仍抑制是双保险;parked 保持抑制直到日后 console 有显式 un-park(post-W2)。读取**故意宽容**(有 `type:"decision"`+`fingerprint` 即生效,不过完整 AJV):抑制是安全网,不能因校验挑剔放过重复卡——现实动机:vault 侧手写的 07-06 落子事件缺 `latencyMs` 又未标 `backfilled`,按 schema 不合法,但必须照样抑制。非 console 路径落的 decision 事件今后应标 `backfilled: true`(语义=非现场计时记录)。(issue #9)

**2026-07-06 · 重复率曲线 = `98_Forme/run-metrics.jsonl`,每真实 run 一行 · assumed**
`{v, date(UTC), runId, proposed, suppressed, presented, rejected, dup, backfilled?}`——前四类计数对得上账(proposed = suppressed+presented+rejected+dup)。dry-run 不落点;W3 之前 `presented` = 写入 cards/ 队列数(呈现=入列)。run-1(07-05)数据点由 session 记录反查补入,标 `backfilled`。该文件 mtime 兼任 launchd 守卫的"上次成功 run"时钟(见下条)。(issue #9)

**2026-07-06 · launchd 日跑 = StartCalendarInterval + WatchPaths(.git/logs/HEAD)+ RunAtLoad;plist 直接 exec node,额度守卫在 runner 本体 · validated-in-use**
plist 只管唤醒(每日定时;vault commit 动 reflog 即工作流边界触发;登录/bootstrap 补跑),跑不跑由 runner 的 `--min-hours`(launchd 传 20)决定:`run-metrics.jsonl` mtime 距今不足即跳过。效果=每日最多一轮真跑,触发点优先落在 vault commit(工作流边界,硬约束 #2 的雏形),手动跑与自动跑共享同一额度窗口、无独立状态文件。**不经 shell wrapper**:第一版走 `run-once.sh` 被 launchd 拒执行(exit 126 exec EPERM)——agent 工具落盘的脚本带 `com.apple.provenance` xattr;plist 直接 exec node 消掉这一类故障,node/codex 路径在 install 时固化进 plist(launchd PATH 极简)。已验证:bootstrap 后 RunAtLoad 拉起,守卫正确跳过(`skip: last run 0.1h ago`,exit 0)。(issue #9)

**2026-07-06 · scan 排除 `98_Forme/` · validated-in-use**
Forme 自己的运行时产物(卡片 md 镜像)不是漂移面;不排除则 runner 会对上一轮输出提卡,自激振荡。git-delta 取文件时按前缀排除,有测试覆盖。(issue #9)

**2026-07-07 · 卡面 v0.1 = 决策者优先五段;schema 只加可选字段 · assumed**
源自 Zayn 07-06 第一条真实设计反馈(v0 真卡「不容易懂 then 决策」,结构机器优先)。五段 = 是什么 → 为什么现在(`whyNow`)→ 建议+一行理由(`recommendation{choice,reason}`,**影子模式第一形态**,与实际 choice 对照留 W5 一致率)→ 拍板后会发生什么(`onAccept` + 渲染器补确定性事实行)→ 证据与 diff 折叠为支撑层(Obsidian 可折叠 callout);落子手势紧跟第 ④ 段,决策不需要滚过证据。三字段全可选、additive,`schemaVersion` 不动;v0 卡照常渲染。agent 侧 recommendation 拍平为两个 nullable string(strict 结构化输出的兼容取舍),Forme 代码重建+消毒(choice 非法即丢 recommendation,不拖垮整卡)。交互稿屏 2 已同步,措辞留 Zayn 过目;下一张真卡以 v0.1 产出后转 validated-in-use。(issue #12)

**2026-07-07 · Taste Rules = 候选规则追加制 md;置信与溯源由代码钉死 · assumed**
`runner/taste.ts`:decisions.jsonl(+卡体上下文)→ codex 只读提炼(schema 强制 JSON)→ Forme 代码消毒渲染追加 `98_Forme/Taste Rules.md`。确定性护栏(不信 LLM 自觉):①溯源——`sourceCardIds` 过滤到真实 cardId,清零即整条丢弃(收割护栏);②诚实置信——样本统计由代码算,**零负样本(无 reject/park/correction)时 confidence 一律钉死 low**,数据基础(如「8 决策 = 8 accept · 0 reject…零负样本——只能刻画『会接受什么』」)写进每条规则。文件人可编辑:再提炼只追加 `## Rn` 块、编号接续、既有文本零改动;条目带 status:candidate(收录/改写/丢弃确认卡 = W3 屏 4)与 reverify:+20 决策(aging 预留)。已生效规则回注 runner prompt(生命周期第 2 步)。(issue #10)

**2026-07-07 · State Diff = 确定性数据包 + agent 四段叙事;骨架代码钉死;周日 launchd 产出 · assumed**
`runner/state-diff.ts`:确定性采集(vault git 周窗口、待决卡=cards/ 无 decision 事件者、00_Inbox 计数、Reports:Posts canary、run-metrics 周汇总)→ codex 只读叙事(schema 强制 into/changed/waiting/alerts 四串)→ 代码渲染 `98_Forme/state-diff-YYYY-MM-DD.md`。四段固定结构由渲染器钉死(agent 加不了段、删不了段,空段占位)——交互稿屏 3「骨架永远不变,内容生成式」的代码化;语气按屏 3(平静、零催促、只读)。调度:`com.forme.statediff` 周日 18:00;**不设 RunAtLoad**——「从未生成过」时守卫(--min-days 6,按最新产物文件名日期)拦不住装机即跑,第一张必须产在周日(睡眠错过唤醒补发,整机关机顺延下周日)。(issue #11)

**2026-07-07 · 人面表面一般原则 = 结论用人话一行,账本降层可查(Taste Rules 先落地) · assumed**
源自 Zayn 07-06 第二条真实反馈(Taste Rules v1「代码术语太重」,与卡面 v0 同病:机器语域上了人类表面)。落地(#13):①**规则行语体**——一行中文祈使句,像用户亲手写进 CLAUDE.md 的指令;提炼 prompt 注入用户手写规则作风格 few-shot(`STYLE_FEWSHOTS`,出自 owner CLAUDE.md/agent memory,经交互稿屏 4 核验非虚构);②**禁词硬闸**——`BANNED_IN_RULE`(provenance/frontmatter/cardId/指纹/schema/jsonl/Hub/Source Index…)由代码检查,命中即整条丢弃,不靠 prompt 恳求;③**账本代码渲染**——「依据 n 卡 · 统计 → 置信 · 提炼日期 · 重验点」合并为规则行下的斜体小字,LLM 不碰账本;④**同文件双层**——md 人读层 = 渲染,`<!-- forme-rule: {...} -->` 注释块 = 结构化存储(id/溯源/置信/时效/rationale;`loadTasteRuleRecords()` 供 W3 重验与确认卡),渲染完全分离留 W3+ console。现有 4 条已就地迁移(id/溯源/置信/added 不变,rationale 叙事降入存储层,规则行重写为用户语体)。**原则适用一切人面表面**(卡/规则/State Diff/console)。Zayn 读后「像我自己会写的规则」即转 validated-in-use。(issue #13;修订 #10 的渲染格式)

**2026-07-07 · State Diff 守卫 --min-days 6 → 4 · validated-in-use**
首次手动真跑(07-07,周二)暴露:6 天守卫会让周中的手动生成扼杀下个周日的自动产出(07-07 → 07-12 仅 5 天)。守卫的真实职责只是防同周双发(唤醒补发间隔 0~1 天),4 天足够,且周日间隔恒为 7 不受影响。模板与装机 plist 已同步。(issue #11 修订)
