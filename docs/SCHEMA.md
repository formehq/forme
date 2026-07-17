# SCHEMA — 决策卡 + decisions.jsonl(v0)

> 下文保留 decision-card 和 decision-event 契约。Living Project Twin 的 M0 contracts 位于 [`schema/twin/`](../schema/twin/README.md),并通过同一个 Forme-owned AJV gate 校验。

数据契约的**单一事实源**。机器可读的权威定义是 `schema/*.json`(AJV 加载的就是它);本文件解释每个字段、指纹算法与事件语义,与 `.json` 同步维护(动了 schema 的会话结束前必须同步本文件)。

- 机器 SSOT:`schema/card.schema.json`、`schema/decision-event.schema.json`(JSON Schema draft 2020-12)
- 指纹算法:`schema/fingerprint.ts`
- 校验器:`schema/validate.ts`(我们自己的 AJV;**不信任何 harness 的自觉**)
- 手写样例:`schema/samples/`(3 张真卡 + 一段 decisions.jsonl)

设计基线:**agent 只读、只返回符合 schema 的 JSON;一切写盘、指纹、校验由 Forme 代码执行**(硬约束 #7)。

---

## 决策卡(card.schema.json)

一张卡 = 一个"等你 accept / park / reject"的提案。**信封形**(`origin/from/role`)为 post-MVP 的 agent relay 预留:一张卡未来可以在 Forme 节点之间转发(硬约束 #5)。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schemaVersion` | `"0"` | 卡 schema 主版本,破坏性变更时 +1 |
| `id` | string | 卡实例 id(跨重生**不稳定**;身份看 `fingerprint`) |
| `origin` | object | **信封**:产出内容的底座 + 运行。`{ agent, model?, runId, at, host? }` |
| `from` | string | **信封**:发出此卡的 Forme 节点身份。MVP 恒为本地节点 |
| `role` | enum | **信封**:relay 协议里的消息角色。v0 恒 `"proposal"`;预留 `digest`(State Diff)/`decision`/`relay`/`ack` |
| `category` | slug | 漂移类别(kebab-case),如 `stale-frontmatter`/`broken-link`/`stale-claim`/`orphan`/`claim-drift`(**#18 思想卡**:立场/判断漂移,stakes 恒派生 thought,每轮 ≤1 张机器节流)。**进指纹** |
| `title` | string | 卡的人读标题。#29 后新卡面 English-first;证据与目标正文不翻译 |
| `summary` | string? | 标题下的可选单行上下文 |
| `evidence[]` | array | 卡为何存在。标题里的每个断言都要在这里落地。渲染成"证据"块 |
| `diff` | object | 提议的**单一最小改动**。由 Forme 代码确定性应用(git 提交以便回滚),渲染成 `-/+` |
| `options[]` | array | 决策手势。MVP 恒为 accept / park / reject |
| `fingerprint` | sha256 hex | 确定性去重键(见下)。由 Forme 代码算,不由 agent 算 |
| `whyNow` | string? | **v0.1(#12)**:为什么现在出现(出身/时机,一句人话)——legibility 准则的界面化,渲染为「为什么现在」段 |
| `recommendation` | object? | **v0.1(#12)**:`{ choice: accept/park/reject, reason }`——agent 亮明的建议 + 一行理由。**影子模式第一形态**:与实际 choice 的对照 = W5 一致率度量;只呈现,绝不自动执行。agent 侧拍平为两个 nullable 字段回传,由 Forme 代码重建 + 消毒(choice 非法即整体丢弃) |
| `onAccept` | string? | **v0.1(#12)**:拍板后会发生什么的一句人话预览;渲染器永远补确定性事实行(目标文件、hunk 数、git 可回滚) |
| `estSeconds` | int? | agent 估的 time-to-decision(秒)。仅参考;真实延迟静默计量 |
| `stakes` | enum? | **v0.2(#21)**:这张卡动的是什么,驱动卡面丰俭与世界层闸豁免。`reversible-ledger`(纯账面修正,卡面保持 10 秒瘦、豁免闸)/ `real-world-action`(影响 vault 之外的事,卡面必须世界层开口)/ `thought`(观点冲突,最厚,#18)。agent 申报 + 代码消毒(非法/缺失按 category 派生;thought 只认显式申报) |
| `revisedAt` | date-time? | **v0.2(#21)**:卡面最近一次被 reface 重写的时刻(闸打回重写或回答问题)。**id/指纹/diff 在 reface 中永不变**。有未答问题且 revisedAt 早于提问 = 卡在「待补 context」态,退出可决队列 |
| `context` | object? | **v0.2(#21)**:question 通道的往返 `{question, answer}`——用户的原话 + agent 的一句直接回答,渲染为「你问过」段(镜像自含,硬约束 #4) |
| `createdAt` | date-time | Forme 写盘此卡的时刻 |

> **卡面五段(镜像渲染次序,#12)**:①是什么(title+summary)②为什么现在(whyNow)③建议(recommendation)④拍板后会发生什么(onAccept+事实行)→ 落子手势 → ⑤证据与 diff 折叠为支撑层(Obsidian 可折叠 callout)。三个新字段全部可选、additive——`schemaVersion` 仍为 `"0"`,v0 卡照常渲染(缺段即省略)。
>
> **v0.2 语言纪律(#21):卡面说事,diff 说账**——title/summary/whyNow 必须说用户世界里的事;账本手术语言(「已完成项」「拆成待办」…)命中即被世界层闸(`runner/legibility.ts`)打回,同轮一次 reface 重写机会,仍不过即弃。纯账本卡(stakes=reversible-ledger)豁免。v0.2 三字段同样可选、additive。

### evidence[] 项
`{ path(必填,vault 相对), locator?(如 "L283" / "frontmatter.status" / "#anchor"), quote?(逐字摘录), note?(一句话为何是证据) }`

### diff
`{ file(必填,vault 相对目标), hunks[] }`。**一张卡 = 一个目标文件**(让指纹 = category+file+diffhash 干净、让每处改动独立可 git 回滚)。同一漂移出现在多个文件 → 多张卡(靠指纹各自去重)。跨文件的"一键改全部"是 post-MVP 的批量卡(role 预留),不在 v0。

### hunk(精确字符串替换)
`{ locator?, before, after, all? }`。在文件里匹配 `before`,替换成 `after`。`before=""` 为纯插入;`after=""` 为删除;两者不能同时为空。消歧三途(#36):匹配唯一直接换;`all: true` = 替换**每一处**出现(重复引用类漂移的表达,0 处仍算 stale 整卡失败);多处且 `locator` 带 `L<行号>` = 换离该行最近的一处。三者全无 → accept 拒绝执行——而这样的卡自 #36 起在 runner 入列前就被可执行性干跑打回,不会走到人面前。确定性可应用、可渲染成 `-/+`(`all` 在 diff 块渲染为 `@@ … · all occurrences @@`)。

### option
`{ id: "accept"|"park"|"reject", label(新卡默认 English), hotkey(单键) }`。**correction(就地修订)不是 option**,是 accept 前对 diff 的编辑,记在 jsonl 的 correction 事件里(read-only 的唯一例外)。

---

## 指纹(fingerprint.ts)——去重的全部基础

```
diffHash    = sha256( 规范排序后的 hunks )        # hunk 顺序无关
fingerprint = sha256( category \0 diff.file \0 diffHash )
```

同一漂移无论 agent 以什么顺序吐 hunk,都得到**同一指纹**。runner 用它对照已决名单做**硬过滤**(`runner/suppress.ts`,#9):`decisions.jsonl` 里任何出现过 `decision` 事件的指纹(accept/park/reject 不分)命中即静默丢弃。名单读取是**宽容解析**——有 `type:"decision"` + `fingerprint` 即生效,不过完整 AJV:抑制是安全网,不能因校验挑剔放过重复卡。重复率→0 靠这段确定性工程,不靠 LLM 自觉(硬约束 #6)。

---

## decisions.jsonl(decision-event.schema.json)——只追加事件日志

taste 学习器的唯一读入。**事件是薄的**:只引 `cardId` + `fingerprint`;category、信封(origin/from/role)等卡侧信息住卡里,不进事件(join key = cardId,分组 key = fingerprint)。每行一个事件,五型:

| type | 何时 | 追加字段 |
| --- | --- | --- |
| `presented` | **卡在 console 实际上屏那一刻**(#15 定案:客户端上报,启动静默计时;不是「写入队列」也不是「打开页面」) | —— |
| `decision` | owner 落子或授权代码自执行 | `choice(a/p/r)` · `actor` · `latencyMs`(owner live 必填=**最近一次** presented→decision 静默延迟;`agent_authorized` 不伪造人类 latency)· `executionId?`(新原子执行凭证)· `executed?`(旧格式 commit hash)· `note?` |
| `correction` | accept 前就地改了 diff(事件先于 decision 落盘) | `correction{ hunks[], note? }`(与 decision.note 两义不混:correction 的 note 说「为什么改」,decision 的 note 说「为什么这样落」) |
| `question` | **v0.2(#21)**:用户发问而非落子(correction 的双胞胎——correction 改 diff,question 改 context)。**不是 decision**:指纹不进已决名单;卡转入待补 context 态,下一轮 run reface 后同指纹回场(不算重复)。事件本身 = 「卡面哪里不 legible」的度量 | `question`(原话) |
| `undo` | **#24/#31 撤销**:owner toast 4s/服务端 15s;`agent_authorized` 在下一张 State Diff 可见后仍可撤。撤销同卡最近一次 decision,补偿事件不删除历史。原子 receipt 只反向目标文件 patch,不倒回卡/日志/metrics | `executed?`(inverse-patch commit hash) |

公共信封:`{ v:"0", ts, type, cardId, fingerprint }`(`ts` 完整 ISO,latency 由 presented→decision 的 ts 差算)。

- **`actor`** = 决策者:`owner`(人)· 预留 `agent_shadow`(影子预决策但仍展示)· `agent_authorized`(授权自动化,仍可撤回)。与卡 envelope 的 `role`(消息角色)**同名不同义、刻意分开**——`actor` 是影子模式日后必需的字段,一步到位。
- **`executionId`**(#31)= `exec_...` 稳定回执 id,同时写入 decision event 与 git commit trailer `Forme-Execution: ...`。新 accept 不在事件里写自己的 commit hash:commit 若包含自己的 hash 会形成不可能求解的自引用。撤销和 run anchor 由 executionId 解析真实 commit;历史 `executed` 仍兼容。
- **`backfilled: true`** = **非现场计时的记录**——历史导入(产品前的人肉决策)和一切绕过 console 的落子(如 vault 侧手动决策后补记事件)都算,可省 `latencyMs`(没有诚实的静默计时就别编)。样例里的 6 条事件即三条种子(#1 comment)的事件化:每卡 presented+decision 一对,`ts` 取真实 commit 时刻,`executed` = 真实应用 commit,`fingerprint` 由该 commit 的真实 diff 反查而来。已知偏差:vault 里 07-06 的两条手写 decision 事件缺 `latencyMs` 又未标 `backfilled`,按本 schema 不合法;日志只追加、不回改,抑制读取宽容所以功能无损——今后非 console 落子请带 `backfilled: true`。
- **写入方(#15 起)**:console 是事件的正规产地,`console/store.ts` 的 `appendEvent` **先过完整 AJV 门再落盘**(不合法即抛)——宽容解析只用于读历史行,自己写的行零豁免。console 收到没有 presented 记录的落子(如 curl 直打)自动按 `backfilled` 记,不编造延迟。

---

## run-metrics.jsonl(非正式契约,#9)

重复率曲线的原始数据,住 `98_Forme/run-metrics.jsonl`,每**真实完成**的 run 追加一行(dry-run 不落点);写入方 `runner/metrics.ts`,形状由其 `RunMetric` 接口定义(无独立 JSON Schema——运行时遥测,不是卡/事件契约):

```
{ v:"0", date(本地日切 YYYY-MM-DD), runId, proposed, suppressed, presented, rejected, dup, head?, executionId?, authorized?, illegible?, unappliable?, refaced?, thought?, backfilled? }
```

`proposed = suppressed + presented + rejected + dup`(普通 agent run 的账要对上;纯 authorized run 四项为 0)。`head`(#14)= 普通 run 的 vault HEAD 锚点。原子授权提交不能在自身内容中记录自身 hash,故用 `executionId` 解析该提交作为下一轮锚点;`authorized`=#31 本轮自执行数,不计 owner acceptance/taste。其余 `illegible`/`refaced`/`thought` 语义不变。`date` 按本地日切(#25);文件 mtime 仍兼任额度守卫时钟,跨 job 并发由 runner 文件锁串行化(#22)。

---

## 改这份契约时

1. 先改 `schema/*.json`(权威),同步本文件的字段表。
2. `npm test` 必须绿(13 项:3 样卡过校验 + 指纹自洽 + 边界拒绝)。
3. `npm run validate` 对所有样例跑一遍 Forme 自己的门。
4. 在 `DECISIONS.md` 追一条 ADR(含日期 + 验证状态)。
