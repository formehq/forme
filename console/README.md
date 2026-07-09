# console/ — localhost 决策台(#15,W3)

单页,原生 TS + `node:http`,零框架零构建零外部资源(2026-07-04 技术栈裁定)。**服务器零状态**(硬约束 #4):每个请求现读 `98_Forme/` + vault git,UI 只是 vault 的确定性投影;唯一写入 = 往 `decisions.jsonl` 追加事件 + 应用被 accept 的 diff。

```
node console/server.ts --vault <vault 路径> [--port 6180] [--out <dir>]
# 或:FORME_VAULT=<vault> npm run run:console
# 然后开 http://127.0.0.1:6180 —— 开着就行,不推送、不通知,等你来
```

## 四个视图(交互稿屏 1/2/3 + Metrics)

1. **catch-up 卡**(开盖/回归):「你不在的 N 小时」+ 进来/我做的/等你 三行,全部从 git 与 jsonl 推导;`[今天不看]` 永远在且零愧疚;待补 context 的卡单独计数显示。
2. **落子 session**:一次一卡,五段 v0.1 卡面(是什么 → 为什么现在 → 建议 → 拍板后会发生什么 → 落子)+ stakes 徽标 + 「你问过」问答段(#21),证据与 diff 折叠;键盘 `a/p/r` 与按钮并存;`输入修正…` 就地编辑 hunk 的 after + 一句 note(taste 原料);`问一句…`(`q` 键)发问不落子(#21,见下);**note 输入框常驻**(#24)——落子理由随任意手势提交,有字就带上(park/reject 的理由是最珍贵的 taste 数据)。落子 toast 带本次用时(#19)+ **4 秒撤销窗口**(#24,`u` 键;accept 撤销走 git revert,undo 补偿事件进 jsonl,卡重新上屏重新计时)。
3. **State Diff**:最新 `state-diff-*.md` 的只读投影,四段骨架原样。
4. **Metrics**(#19):time-to-decision 中位数 + 最近 20 次分布条(按 choice 着色)、重复率逐轮条(入列 vs 抑制+重复)+ 累计抑制率、世界层闸/问答往返计数、认知含量构成(思想/行动/账本 —— #18)。进视图时现取现算;中位数只取现场计时的落子(backfilled 不编;被撤销的 decision 不进分布)。

## 文件

- **`store.ts`** — vault 投影(`queueState`:可决队列 = cards/ 无 decision 事件且不在待补 context 态者,cardId+指纹双保险;catch-up 数据包;`metricsData` —— #19)+ `appendEvent`(**每条事件先过 Forme 自己的 AJV 门**,不合法即抛——宽容解析只用于读历史行,自己写的行零豁免)。
- **`apply.ts`** — accept 执行路径,**Forme 代码唯一写知识层处**且只发生在人落子 accept 之后:hunk 精确替换全有或全无(before 消失 = 卡过期;多匹配用行号 locator 消歧;纯插入 v0 拒绝),git pathspec 提交只含目标文件,hash 进事件 `executed`(可回滚)。**目标文件有未提交改动即拒绝**——回执 commit 不裹挟用户的编辑。
- **`server.ts`** — 路由:`GET /`(页面)、`GET /api/state`(投影,含 metrics)、`POST /api/presented`(卡实际上屏,静默计时起点)、`POST /api/question`(#21,发问)、`POST /api/decide`(落子,可带 note;correction 事件先于 decision)、`POST /api/undo`(#24,撤销窗口 15s 上限;accept 撤销走 git revert)。只绑 127.0.0.1 + Host 校验 + POST 强制 `application/json`(本机写路径的 CSRF 挡板)。
- **`page.ts`** — 单 HTML,内联 CSS/JS;页面自身不存任何东西。

## question 通道(#21,correction 的双胞胎)

**correction 改 diff,question 改 context。**卡看不懂时按 `q` 问一句:`question` 事件进 jsonl(**不是 decision**——指纹不进已决名单),卡转「待补 context」态退出可决队列(纯投影推导:有未答问题且卡的 `revisedAt` 早于提问);下一轮 runner 先答问题——reface 只换脸(id/指纹/diff 不变),问答落卡面「你问过」段,同指纹回场不算重复。不做 chat:有界、异步,一问一答一次往返。question 事件本身 = 「卡面哪里不 legible」的度量。

## presented / latency 语义(#9 遗留,在此定案)

`presented` 事件 = 卡在浏览器**实际上屏**那一刻(客户端上报,每页加载每卡一次);`latencyMs` = 最近一次 presented → decision 的真实间隔。绕过 console 的落子(curl 直打)没有诚实计时,自动记 `backfilled`,不编造延迟。

## wake-catchup(#16,硬约束 #3:开盖 → 首卡可见 ≤10s)

页面**永远不等扫描**:开页即渲染盘上现状,catch-up 卡带「队列截至 HH:MM」标注(asOf = run-metrics mtime);同时客户端上报 `POST /api/refresh`,server 后台 spawn 一轮增量 runner,完成后投影自更新。防烧额度三重:runner `--min-hours 2`(与日跑 20h 共享 mtime 时钟)· #14 锚点空窗零成本退出 · server 去抖(在飞即 already)。常开 tab 回到可见且距上次投影 >1min → 自动重投影 + 补扫(落子/阅读中不打断)。console 以 launchd 常驻(`com.forme.console`,KeepAlive,`../launchd/install.sh` 一并安装);后台 run 日志在 `~/Library/Logs/forme/console-refresh.log`。

## 当前边界

- 呈现数量无接受率自适应节流(硬约束 #2 完整形,后续);现在 = 全部待决卡一次 session。
- correction 只能改 after,不能增删 hunk;park 无 un-park(与 rejected 同样被指纹永久抑制;question 是落子前的出口、undo 是落子后 15s 内的出口,但 park 仍是终态)。
- question 一卡一问待答(再问覆盖前问);判定全靠显式手势,不做自然语言猜测。
- 屏 4(taste 规则确认)与屏 5(影子授权)未建——Metrics 视图(#19)先补了曲线一半。

事件与卡格式见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`(2026-07-07 两条 + 2026-07-08 两条)。
