# console/ — localhost 决策台(#15,W3)

单页,原生 TS + `node:http`,零框架零构建零外部资源(2026-07-04 技术栈裁定)。**服务器零状态**(硬约束 #4):每个请求现读 `98_Forme/` + vault git,UI 只是 vault 的确定性投影;所有事件与知识层写入都走确定性执行通道。

```
node console/server.ts --vault <vault 路径> [--port 6180] [--out <dir>]
# 或:FORME_VAULT=<vault> npm run run:console
# 然后开 http://127.0.0.1:6180 —— 开着就行,不推送、不通知,等你来
```

## 四个视图(交互稿屏 1/2/3 + Metrics)

1. **catch-up 卡**(开盖/回归):「你不在的 N 小时」+ 进来/我做的/等你 三行,全部从 git 与 jsonl 推导;`[今天不看]` 永远在且零愧疚;待补 context 的卡单独计数显示。
2. **落子 session**:一次一卡,五段 v0.1 卡面(what → why now → recommendation → after you decide → decide)+ stakes/category 英文标签 + `You asked` 问答段(#21),证据与 diff 折叠;键盘 `a/p/r` 与按钮并存。#29 起所有新产品文案固定英文,旧卡正文仍按历史原样显示。修正面板(#26-A)只呈现 `Proposed result`,原样折叠对照;修改后接受与原样接受留备注分开。`Ask…`(`q` 键)发问不落子;note placeholder 明示 Park 理由会转交 agent 复查。草稿确认、手势携带未提交文字与 4 秒 undo 行为保持不变(#27/#24)。
3. **State Diff**:最新 `state-diff-*.md` 的只读投影,四段骨架原样。
4. **Metrics**(#19):time-to-decision 中位数 + 最近 20 次分布条(按 choice 着色)、重复率逐轮条(入列 vs 抑制+重复)+ 累计抑制率、世界层闸/问答往返计数、认知含量构成(思想/行动/账本 —— #18)。进视图时现取现算;中位数只取现场计时的落子(backfilled 不编;被撤销的 decision 不进分布)。

## 文件

- **`store.ts`** — vault 投影(`queueState`:可决队列 = cards/ 无 decision 事件且不在待补 context 态者,cardId+指纹双保险;catch-up 数据包;`metricsData` —— #19)+ `appendEvent`(**每条事件先过 Forme 自己的 AJV 门**,不合法即抛)。`/api/state` 一次读取 cards/events 后在各投影间复用(#16),不重复扫盘。
- **`apply.ts`** — accept 执行路径:hunk 精确替换全有或全无;目标 + 当前卡镜像 + decisions/metrics 以显式 pathspec 同一提交,`executionId` 同时进事件与 commit trailer。目标文件不干净即拒绝;undo 只反向目标 patch,不倒回审计产物(#31)。
- **`server.ts`** — 路由:`GET /`、`GET /api/state`(含 `product:forme` 身份与 `Server-Timing` 投影耗时)、`POST /api/presented`、`POST /api/question`、`POST /api/decide`、`POST /api/undo`。owner 撤销窗服务端 15s;authorized fix 长期可撤。只绑 127.0.0.1 + Host 校验 + POST 强制 `application/json`。
- **`page.ts`** — 单 HTML,内联 CSS/JS;页面不持久化任何私有状态(队列、一次性提示等只活在本页会话,真值仍全来自 vault 投影)。

## question 通道(#21,correction 的双胞胎)

**correction 改 diff,question 改 context。**卡看不懂时按 `q` 问一句:`question` 事件进 jsonl(**不是 decision**——指纹不进已决名单),卡转「待补 context」态退出可决队列(纯投影推导:有未答问题且卡的 `revisedAt` 早于提问);下一轮 runner 先答问题——reface 只换脸(id/指纹/diff 不变),问答落卡面「你问过」段,同指纹回场不算重复。不做 chat:有界、异步,一问一答一次往返。question 事件本身 = 「卡面哪里不 legible」的度量。

## presented / latency 语义(#9 遗留,在此定案)

`presented` 事件 = 卡在浏览器**实际上屏**那一刻(客户端上报,每页加载每卡一次);`latencyMs` = 最近一次 presented → decision 的真实间隔。绕过 console 的落子(curl 直打)没有诚实计时,自动记 `backfilled`,不编造延迟。

## wake-catchup(#16,硬约束 #3:开盖 → 首卡可见 ≤10s)

页面**永远不等扫描**:开页即渲染盘上现状,catch-up 卡带「队列截至 HH:MM」标注;同时客户端上报 `POST /api/refresh`,server 后台 spawn 增量 runner,完成后投影自更新。首投影只读取一次 cards/events 并复用于 catch-up、队列和 metrics;响应带 `Server-Timing` 供代码侧秒表。安装健康门给 curl 自身 1s connect/2s request timeout,按真实 10s deadline 失败,并校验响应 `product=forme`。常开 tab 回可见 >1min 自动重投影;console 由 launchd KeepAlive 常驻。owner 的连续三天开盖秒表仍是最终验收。

## 当前边界

- 呈现数量无接受率自适应节流(硬约束 #2 完整形,后续);现在 = 全部待决卡一次 session。
- correction 只能改 after,不能增删 hunk;park 无 un-park(与 rejected 同样被指纹永久抑制;question 是落子前的出口、undo 是落子后 15s 内的出口,但 park 仍是终态)。
- question 一卡一问待答(再问覆盖前问);判定全靠显式手势,不做自然语言猜测。
- 屏 4(taste 规则确认)与屏 5(影子授权)未建——Metrics 视图(#19)先补了曲线一半。

事件与卡格式见 `docs/SCHEMA.md`;设计取舍见 `docs/DECISIONS.md`(2026-07-07 两条 + 2026-07-08 两条)。
