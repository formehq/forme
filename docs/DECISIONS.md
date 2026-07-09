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

**2026-07-07 · scan 增量窗口 = 上次成功 run 的 HEAD 锚点(anchor..HEAD);--commits 降为手动覆盖 · validated-in-use**
#12 验收暴露:vault 一天多次 commit 时固定 `--commits 4` 窗口 < run 节律(守卫 ~20h),跨文档漂移所需的文件会漏出扫描面。改为:每轮真实 run 在 run-metrics 行里记 `head`(扫描时的 vault HEAD 短 hash),下轮增量 = `git log <head>..HEAD`——窗口自动等于 run 节律,这才是硬约束 #3「增量只处理 delta」的本意。回退链:`--commits` 显式传参 = 手动覆盖 > 锚点缺失(首跑/旧数据)或失效(rebase 后非祖先,`merge-base --is-ancestor` 判)= 回退最近 N commit 窗口。**空窗口从 exit 1 改 exit 0**:锚点模式下「自上次 run 无知识层变更」是日常静默结果(launchd 日志里不该像故障)。已验证:测试覆盖 + 真 vault 只读冒烟(HEAD~8 窗口正确拾回 Console/Spec/Roadmap 三文件,即上次漏扫场景)。(issue #14)

**2026-07-07 · Console 骨架 = node:http 单页,服务器零状态;presented 语义就此定案 · assumed**
`console/`(#15,W3 主菜):`store.ts`(vault 投影:待决队列 = cards/ 无 decision 事件者,cardId+指纹双保险;catch-up 数据包全部从 git/jsonl 推导)+ `apply.ts`(accept 执行路径)+ `server.ts` + `page.ts`(单 HTML,内联 CSS/JS,交互稿屏 1/2/3 三原语)。关键裁定:①**presented = 卡在浏览器实际上屏那一刻**(客户端上报,#9 遗留语义定案),落子 session 一次一卡——latencyMs = 最近一次 presented → decision 的真实间隔才诚实;绕过 console 的落子(curl 等)自动记 `backfilled`,不编造延迟。②**console 写 jsonl 的路径过完整 AJV 门**(appendEvent 不合法即抛)——宽容解析只用于读历史行,自己写的行零豁免。③**accept 执行 = Forme 代码唯一写知识层处**:hunk 精确替换全有或全无(before 消失=卡过期、多匹配用行号 locator 消歧、纯插入 v0 拒绝),git 提交只含目标文件(pathspec commit),hash 进 `executed`;**目标文件不干净即拒绝落子**——回执 commit 不能裹挟用户未提交的编辑(provenance 会撒谎,回滚会误伤)。④correction = accept 前就地改 hunks 的 after + 可选 note,correction 事件先于 decision 落盘。⑤只绑 127.0.0.1 + Host 校验 + POST 强制 application/json(本机写路径的 CSRF/DNS-rebinding 挡板)。⑥零推送零通知零 badge(沉默纪律);「今天不看」永远在且零愧疚。手势形态 = 键盘 a/p/r 与按钮并存(issue 定)。Zayn 用它完成一次真实落子即转 validated-in-use。(issue #15)

**2026-07-07 · AGENTS.md = CLAUDE.md 的 symlink,不做第二份拷贝 · assumed**
AGENTS.md 是 Codex/OpenCode 等底座认的通用入口文件名(Tier 1/2 底座读它),CLAUDE.md 是 Claude Code 入口——同一份 build 上下文,两个门牌。拷贝形态当天就漂了(CLAUDE.md 升 W3 时 AGENTS.md 还停在 W2,被 console 冒烟当场抓到,颇具讽刺);single source of truth 用 symlink 落实,git 原生支持。公开前清单(W6)处理路径时两个名字一起过。

**2026-07-07 · wake-catchup = 旧状态秒渲 +「截至 X」标注 + console 打开触发后台增量 run · validated-in-use**
硬约束 #3(开盖 → 首卡可见 ≤10s)的实现策略(#16):页面**永远不等扫描**——开页即渲染盘上现状,catch-up 卡带「队列截至 HH:MM」标注(asOf = run-metrics mtime 现读,server 重启零丢失);同时客户端上报 `POST /api/refresh`,server 后台 spawn 一轮增量 runner(console 打开 = 用户来了 = 合法拉取时刻,工作流边界之一)。防烧额度三重:①runner 传 `--min-hours 2`(开页拉取的下限,与日跑 20h 共享同一 mtime 时钟);②#14 锚点窗口下无新 commit 的 run 在 codex 之前零成本退出;③server 内去抖(已在飞的刷新直接 already)。刷新态是 server 唯一进程内状态——运维态(一个在飞的子进程),不是数据,不违硬约束 #4。常开 tab 的开盖路径:visibilitychange 回可见且距上次投影 >1min → 重投影 + 补扫(session/State Diff 阅读中不打断)。console 自身以 launchd 常驻(`com.forme.console`,RunAtLoad + KeepAlive,直接 exec node)——「开盖 ≤10s」的前提是 server 一直活着。已验证:装机后真链全通(refresh → 锚点窗口 run(eab7e5f9..00189d60)→ 3 张新卡入列 → asOf 更新);秒表 3 天连续达标留 Zayn 实测。(issue #16)

**2026-07-08 · 卡面 v0.2 = 世界层优先(卡面说事,diff 说账)+ stakes 丰俭 + question 通道 · assumed**
源自 Zayn 07-07 第三次卡面反馈,标本 = card_66bcc(@formehq):卡面全程账本语言(文档手术),世界层事实(账号没确认、8.15 要用)零出现——latencyMs 949s vs 同批世界层清晰卡 12s,legibility 失败首次被产品自己的计时器定量捕获(#21)。三个裁定:①**世界层闸**(`runner/legibility.ts`,与 #13 禁词闸同族)——「世界层名词」无法确定性枚举,取其对偶:**账本手术语域(已完成项/拆成待办/速览/勾选…)在世界层段(title/summary/whyNow)零容忍**,命中即打回;同轮给一次 reface 重写机会(`runner/reface.ts`,codex 只换脸),仍不过即弃、下轮在 v0.2 prompt 下重提——不硬塞难读的卡。纯账本卡豁免(它们的「事」就是账)。②**stakes 随卡申报、代码消毒**——`reversible-ledger / real-world-action / thought` 三级驱动卡面丰俭(账本卡保持 10 秒瘦,不全面加厚);申报非法/缺失按 category 派生(账本类 → ledger,其余 → action;thought 只认显式申报,#18 的地基)。③**question 通道 = correction 的双胞胎**(correction 改 diff,question 改 context):console 发问**不是 decision**——指纹不进已决名单;卡转入「待补 context」态(纯投影推导:有未答问题且 `revisedAt` 早于提问,无任何新增服务器状态),退出可决队列;下一轮 run 的 question 阶段(先于扫描,空窗口也跑;耗了真 codex 就落 metric 行走额度表)对该卡 reface——**只换脸,id/指纹/diff/evidence 永不变**,问答落卡面 `context{question,answer}`(镜像自含,硬约束 #4),同指纹回场不算重复;answer 为空 = 没补上,继续待补下轮重试。不做 chat(有界、异步,守住「决策,不是对话」)。question 事件本身 = legibility 度量;预期副作用 = 自然 park/question 缓解负样本饥荒。验收基线:修复后 dangling-task 类卡回到 ~15s 量级(#21 comment);question 往返走通一次即转 validated-in-use。(issue #21)

**2026-07-08 · Metrics 上屏 = 纯投影,中位数只取现场计时 · assumed**
#19(demo 拍 4 缺口 G1):①落子 toast 加本次用时(「已接受 · commit xxx · 12 秒 · 可回滚」),值 = decide 响应里的 latencyMs 真值,backfilled 落子无值即不显示——不编造延迟的纪律延伸到显示层。②Metrics 视图(console 第四屏):time-to-decision 中位数 + 最近 20 次分布条(按 choice 着色)、重复率逐轮条(入列 vs 抑制+重复)+ 累计抑制率、世界层闸命中/问答往返计数。全部现读 decisions.jsonl + run-metrics.jsonl(`store.metricsData`),进视图时现取现算(落完子看,数字含刚落的这批);服务器仍零状态。中位数**只取现场计时的落子**(backfilled 不进分布)。949s 离群值不截断——线性坐标下它本身就是 legibility 故事(拍 6 素材)。(issue #19)

**2026-07-08 · note 通道对所有 choice 开放 + 撤销窗口 = 补偿事件,日志仍只追加 · assumed**
出身 = #24 实录(07-08 首例真实 park 的理由在 console 丢失,Zayn 手工补录 jsonl;vault 侧当日裁定)。①**note 通道**:decision 事件加可选 `note`——落子理由随任意手势提交,有字就带上;console 卡面常驻一行输入框,placeholder 点明「park/reject 的理由是最珍贵的 taste 数据」;correction 保持原义(带 hunks 的修改后接受,自有 note),两义不混。②**撤销窗口**(#23 并入):toast 停 4 秒可撤(`u` 键),服务端上限 15s 兜底;**undo 是补偿事件,不是删除**——`{type:"undo", cardId, fingerprint, executed?}` 追加进 jsonl,读取方按文件序重放(append-only 日志文件序 = 时间序):store 队列/metrics、runner 指纹抑制、taste 学习器、question 已决名单四处同步「undo 撤销同卡最近一次 decision」;decision → undo → decision 是合法序列,第二条生效。被撤销的 decision 不进 taste、不进时延分布(4 秒内反悔的数据是噪声)、指纹回到未决。③**accept 的撤销走 `git revert`**(不 reset)——vault 历史与事件日志同一姿态,只追加;revert 冲突(窗口内文件又被改)即整个撤销失败,revert commit hash 记进 undo 事件 `executed`(凭证闭环)。④撤销期间手势封禁,防二次按键;undo 后卡重新上屏、presented 重报(计时重新起点,延迟诚实)。(issue #24;#23 并入)

**2026-07-08 · claim-drift 思想卡 = 快慢层对照 + 每轮 ≤1 张机器节流 · assumed**
SSOT 最锋利命题是 notice when your thinking has changed,而 12 张真卡全是库的整洁类(方向审计 07-07)——**思想漂移住在慢层**(02_Wiki 概念笔记几周不动,永远进不了 delta 窗口),增量扫描机械性偏向 hygiene。落地(#18):①新类别 `claim-drift`(立场/判断漂移),stakes 恒派生 `thought`(#21 预留的出生通道);②**快慢层对照**:`--slow-layer N` 把 02_Wiki 里最久没被 commit 动过的 N 篇概念笔记注入 prompt 作立场参照(慢的那端),与 delta 窗口(快的那端)对照找张力;**取窗按日轮转**(窗口起点 = 日序×N mod 总数,无状态确定性;否则每天都是同 N 篇,其余慢层永远进不了对照面),~len/N 天覆盖全慢层一遍;daily launchd job 传 4——对照面常驻,而非另设周扫 job(第 4 个 job 的复杂度不值;若节奏不够再升级);③**每轮 ≤1 张思想卡由代码节流**(认知负载高;prompt 恳求之外的机器闸),入列数记 run-metrics `thought`;④prompt 明示:低 accept 率是预期且受欢迎(reject/park 正是负样本饥荒的解药)、建议允许 park(立场卡不硬推)、diff 允许修正注记但须替换式插入(纯插入 apply v0 拒绝);⑤**认知含量比上仪表**:Metrics 视图加思想/行动/账本构成行(数据 = 盘上卡的 stakes 分桶,零新增存储)——07-07 方向审计从一次性担忧变成常驻仪表。验收留真实使用:W4 内 ≥1 张 claim-drift 真实呈现 + 8.15 前一张值得上台的思想卡。(issue #18)

**2026-07-08 · runner 跨 job 串行化 = 文件锁(mkdir 原子),不是更多 launchd 配置 · validated-in-use**
#22 现象:相邻数分钟两轮完整 run 双倍烧额度。诊断:daily job(WatchPaths)与 console 触发的 refresh 是**两个进程、两个 label**——launchd 的单实例保护与 ThrottleInterval 跨不过 label,而额度守卫的时钟(metrics mtime)在两发并发时是 TOCTOU(都在对方写表前查表)。修法:runner 本体加文件锁(`98_Forme/.runner.lock`,mkdir 原子抢占)——先抢锁再查守卫,拿不到 = 已有 run 在飞,exit 0 静默退出;陈锁(>30min,崩溃残留)回收一次再抢;exit/SIGTERM 清锁。已验证:锁在飞拒绝 + 陈锁回收 + 退出清理三行为真机通过。(issue #22)

**2026-07-08 · 日期语义 = 时间戳存 UTC ISO 不动;date-only 按本地日切;用户面渲染一律本地 · assumed**
#25 现象:18:00 PT 的 run 在 Metrics 里标成"明天"(UTC 日期)。裁定:①存储层时间戳(事件 ts、卡 createdAt/revisedAt、信封 at)保持完整 ISO(UTC),不动;②**date-only 字段的语义是「用户的哪一天」**——run-metrics `date`、State Diff 文件名/周窗口按本地日切(`localDate()`,一个助手全库共用);周日 18:00 的 State Diff 文件名必须是周日,不是 UTC 的周一;③用户面渲染(Metrics 行日期、队列截至标注)一律本地时区。旧行(UTC 日期)不回改——日志只追加,读取宽容。讽刺点自查通过:产品刚出过一张纠 vault 日期语义漂移的卡,自己不能犯同类错。(issue #25)

**2026-07-09 · correction 修承诺不修补丁;未提交文字不得静默消失 · assumed**
源自第四次卡面反馈与五卡复盘(#26-A/#27)。人面裁定:①category slug 全部中文化,未知类别回落「知识漂移」;②修正面板标题 =「哪里不对?」,主路只让用户改「改后的样子」纯文本,`before`/locator/hunk 匹配均降到折叠对照或系统内部;③有说明文字时拆成两个明确意图——「按这个改后接受」产生 correction,「原样接受,字留作备注」只写 decision.note;④首次聚焦提示只活在当前页面会话,不使用 localStorage,不制造 UI 私有真值;⑤收起/面板切换遇到草稿先确认,a/p/r 按钮和键盘手势都先读取面板草稿:accept 应用已编辑内容,park/reject 或问句草稿转写为 decision.note,任何路径都不静默丢字;⑥MVP 不加第四手势,park + note 仍是转交信号,由 vault agent 周会复查。事件 schema 不变;#26-B 的自然语言 `revise` 事件仍留待与富卡同班车。(issue #26-A/#27)
