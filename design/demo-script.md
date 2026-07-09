# 3 分钟 Demo 剧本 v0(#17)

> **场合**:8.15 INTDEV Expo AI Meetup,3 分钟 talk/demo,Forme 首秀。
> **底稿**:spec「3 分钟 demo 脚本」六拍;屏幕素材 = console 真界面 + Zayn vault 真数据(样稿不造数)。
> **台词状态:全部是脚手架、非终稿**——结构归 agent,voice 归 Zayn,上台前须用自己的话重写(Taste Rules 屏 4 第 8 条的自我应用)。中文备稿在括号里,现场英文为主。
> **活文档**:W5 起每周真机排练一次,按排练摩擦修订;时长按实测校准。

## 总预算:180 秒

| 拍 | 时长 | 累计 |
| --- | --- | --- |
| 开场 hook | 15s | 0:15 |
| 1 丢笔记 | 20s | 0:35 |
| 2 触发 run | 15s | 0:50 |
| 3 卡出现 | 40s | 1:30 |
| 4 单键落子 | 25s | 1:55 |
| 5 State Diff | 25s | 2:20 |
| 6 Taste 面板 | 30s | 2:50 |
| 收尾 | 10s | 3:00 |

## 逐拍

### 开场 hook(15s)

- **说**:"Your notes drift. Facts go stale, todos hide in finished lists, links rot. Forme turns that drift into one-decision cards — and learns your taste from every decision."(你的笔记会漂移;Forme 把漂移变成一张张一次决策的卡,并从每次落子学你的 taste。)
- **屏**:console catch-up 卡已开着——「你不在的 N 小时」。
- **现状**:✅ 屏 1 已建(#15/#16)。

### 拍 1 · 往 vault 丢几条乱笔记(20s)

- **说**:"I just dump notes into my vault — plain markdown, my own Obsidian, no new habits."(我只管往自己的 vault 丢笔记,零新习惯。)
- **屏**:Obsidian 里贴一条乱笔记进 Inbox,commit(vault 是 git repo;commit = 工作流边界)。
- **现状**:✅(演示笔记提前备好,内容真实——不造漂移,选一条真积压)。

### 拍 2 · 定时/唤醒触发一轮 run(15s)

- **说**:"A local agent wakes on schedule or when I commit — read-only, it can only propose."(本地 agent 定时/commit 触发,只读,只能提案。)
- **屏**:console catch-up 卡的「队列截至 X · 后台补扫中…」标注(#16 的 refresh 徽标),或终端 tail 一眼 runner 日志。
- **现状**:✅(#9 launchd + #16 console 触发)。**时长风险**:真跑 1-3 分钟,现场不等——话术直接接"这是今早那轮跑出来的",切到已就位的队列(spec:demo 用常驻实例,真数据)。

### 拍 3 · 卡出现:证据 + 最小 diff(40s,重心拍)

- **说**:"Each card is one decision: what it is, why now, its recommendation, and what happens if I say yes. Evidence and the exact diff are right there, folded."(一张卡 = 一个决策:是什么、为什么现在、它的建议、拍板后会怎样;证据和逐字 diff 折叠在下面。)
- **屏**:落子 session,一张真卡走五段;展开证据 callout 指一眼逐字引文,展开 diff 指一眼 -/+。
- **现状**:✅ 五段 v0.1(#12/#15),真卡管够。

### 拍 4 · 单键落子,time-to-decision 计数(25s)

- **说**:"One key. Applied, committed, reversible. It silently timed that decision — my median is seconds, not mornings."(一个键:已应用、已提交、可回滚。它悄悄计了时——我的中位决策是秒级,不是一上午。)
- **屏**:按 `a` → toast「已接受 · commit xxx · 12 秒 · 可回滚」→ 自动进下一张;讲中位数时切 Metrics 视图(时延分布条 + 重复率曲线)。
- **现状**:✅ 全通(#19 已建,07-08):toast 带本次用时;Metrics 视图有中位数 + 最近 20 次分布 + 重复率逐轮曲线可指。949s 离群条本身就是拍 6 的 legibility 故事素材(它逼出了 #21)。

### 拍 5 · State Diff 一屏叙事(25s)

- **说**:"Weekly, it tells me what came in, what changed, what's waiting, what's alarming — one screen, 90 seconds."(每周一屏:进来了什么、变了什么、什么在等我、什么在报警。)
- **屏**:console State Diff 视图,当周真产物(骨架代码钉死,内容生成)。
- **现状**:✅(#11 + #15;周日自动产出)。

### 拍 6 · Taste 面板(30s,demo 高潮)

- **说**:"And this rule? It learned it from my decision history — with the receipts. Duplicate proposals trend to zero by construction; shadow agreement is how it earns autonomy, one category at a time."(这条规则是它从我的决策史里自己学到的,带凭证;重复率靠工程归零,影子一致率是它挣得自动化的方式。)
- **屏**:**理想**=Taste 面板(当前规则 + 待确认规则卡 + 重复率曲线↓ + 影子一致率↑);**当前 fallback**=Metrics 视图(重复率曲线已上屏,#19)+ Obsidian 打开 `Taste Rules.md`(4 条人话规则 + 降层账本,真实存在)。
- **现状**:⚠️ 曲线半上屏(重复率在 Metrics 视图可指,#19);**缺口 G2:console 无 Taste 面板视图**(屏 4 规则确认交互 + 影子一致率)→ W5。

### 收尾(10s)

- **说**:"Local-first, your vault is the only truth, the agent never writes — it proposes, you decide. I'm my own first user, six weeks of receipts."(local-first,vault 是唯一真相,agent 永远只提案;我自己是第一个用户,六周凭证在案。)
- **屏**:回到 catch-up 卡(队列清零的那一屏)。

## 缺口清单(验收:每个缺口有归属)

| # | 缺口 | 影响拍 | 归属 |
| --- | --- | --- | --- |
| ~~G1~~ | ~~time-to-decision 上屏 + Metrics 卡~~ **已收(#19,07-08)**:toast 带用时,Metrics 视图有中位数/分布/重复率曲线 | 拍 4 ✅ 拍 6(曲线部分)✅ | ~~W4~~ 完成 |
| G2 | Taste 面板 console 视图:当前规则 + 屏 4 规则确认卡 + 影子一致率 | 拍 6(fallback = Metrics 曲线 + md 文件) | **W5**(#20) |

**当前可走通:开场 + 拍 1/2/3/4/5 完整,拍 6 走 Metrics 曲线 + md fallback——5 拍达标(#17 验收线之上)。**

## 排练检查单(每次真机排练前)

- [ ] 常驻实例活着(`launchctl print gui/$UID/com.forme.console`;`curl 127.0.0.1:6180/api/state`)
- [ ] 队列里有 2-3 张**真**待决卡(前一晚别清空);State Diff 是当周的
- [ ] 演示笔记选好(真积压,非造)+ 网断了也能跑(全 local,应无碍——验证一次)
- [ ] 投影配色检查(console 深浅色两套都过一遍)
- [ ] 兜底:六拍各一张截图,放 deck 备用
- [ ] 秒表全程,超 3:00 先砍拍 2 的话术(并进拍 1)
