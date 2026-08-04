# R4 Gate B Owner Review — 低认知负荷版

- 状态：**待 Owner 按最终 Manifest hash 审批；当前没有执行 Gate B 的权限**
- 上一层已批准 Packet：
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- 本次完整技术对象：
  [`R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`](./R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md)
- 本次 Manifest 最终 SHA-256：`PENDING_FINAL_MANIFEST_SHA256`
- First Provider-Call Test Grant：**NOT REQUESTED**

## 先说人话结论

这一次不是“让 Forme 真正回复一个 Guest”，而是给目前的假系统换上
三块更接近真实世界的地基，然后在本机试压：

```text
现在（Gate A）
假数据库 + 假 Codex + 假保护层
已经用 synthetic case 跑产品规则
              ↓
这次想批准的 Gate B
一次性 PostgreSQL
+ 官方 Codex 的零调用能力检查
+ macOS 本地保护壳测试
+ 仍然是假 transport 的硬预算测试
              ↓
跑完回来给你结果
仍不上线、仍不用真实 Guest、仍不调用模型
```

我的推荐是：**按这个 Manifest 批准 Gate B，但明确不批准第一次模型
调用。**

## 现在已经有什么

Gate A 已经把 R4 的“规则和动作形状”放进 repo：

- 一套 38 个对象的统一协议，连 Room、Projection、Grant、Interaction、
  Response、Fresh Session、event/ACK 和 receipt 都在同一套 hash 规则里；
- 一个本地 Room 控制和同步层：普通 Workbench 只保存 body-free 状态，
  Guest 正文不会自动进 Twin；
- 一个候选回复保险箱的假实现：candidate 先加密，Owner 另一步批准 exact
  bytes，terminal event 先让它不可读再清理；
- 一个没有 AI 的 Room Web/API 假服务器，共 43 个固定动作；
- 五条 synthetic journey 和 R1–R3 回归的证据入口。

但这里的关键词还是“**假实现 / repo 证明**”：Hosted store 仍在内存里，
Keychain/macOS launcher 仍没有成为真的物理边界，Codex 也没有被实际接入
Fresh Response。

## 你批准后，我会被允许做哪四件事

### 1. 在一次性 PostgreSQL 里试真的数据约束

会下载并运行一份 hash 固定的 PostgreSQL 16.10 Docker image；它不开放
host port，用完删除 container、network 和 volume。

会验证这些不是“代码自觉”，而是数据库也能守住：

- 1 / 2 / 3 / 10 次 quota；
- 一个 capability 同时只能有一个 unresolved Interaction；
- Grant replacement 不继承剩余次数；
- offer / invite / publish / delete / revoke 的并发只能有一个赢家；
- Room event 顺序、idempotency、terminal precedence；
- Guest request、Response、email address 只以加密列落库；
- app / migration / janitor / notification / audit 五个角色不能互相越权。

这里用的全部是假数据和临时 key，不碰你的生产数据库。

### 2. 问官方 Codex：“你能不能真的只留下这扇窄门？”

目标固定为本机现有的官方 `codex-cli 0.145.0`。检查只允许：版本、help、
官方 app-server schema、初始化和能力表面；**不能 start thread/turn，不能读
你的 Codex auth，也不能连接 OpenAI。**

我们真正要知道的是：官方 Codex 能不能做到只让 Fresh Session 使用
`SnapshotQueryBrokerV1`，同时把 shell、exec、MCP、browser、web、plugin、
其他文件和任意 network 都拿掉；未来每次 provider transport 又能不能先
经过 Forme 的 hard gate。

如果做不到，答案不是“凑合一下”，而是：

> R4 的 AI 回复通道保持关闭，只保留 Owner 手写回复。

### 3. 在 macOS 上把“物理边界”作为一个整体试一次

会编译一个测试 launcher，使用临时测试签名和临时 Keychain item，验证：

- Owner presence 不能被普通 Agent 静默代替；
- candidate key 不能被 Workbench 导出；
- Guest bytes 不落进 live repo、普通 transcript、stdout 或磁盘日志；
- Fresh process 看不到 home/vault/sibling/credential/candidate store；
- 写文件、socket、command network、attach/injection、binary replacement、
  symlink escape、fork/huge output 都被挡住；
- cancel、timeout、crash 后仍是先 deny、再清理、可恢复。

这一步可能出现一次本地 user-presence 确认窗口。它不创建 daemon，不开
本地 Web listener，也不用你的真实 Room/Codex credential。

如果其中任何一块失败或说不清，仍然回到 `manual_owner_only`。

### 4. 用完全假的 upstream 再撞一次预算边界

会把 3 次 dispatch、128k input、8k output、60 分钟、US$1、30 秒 permit
等每个边界和 `limit + 1` 都跑一遍。upstream 只是内存函数计数器，socket
和 DNS 都关着，所以通过后仍然是 provider bytes = 0、spend = US$0。

## 这一次明确不会发生什么

| 不会发生的动作 | 本次上限 |
|---|---:|
| OpenAI / Codex model session | 0 |
| 发给 provider 的 bytes | 0 |
| provider spend | US$0 |
| 真实 Guest request / capsule | 0 bytes |
| 对外 email / message | 0 |
| hosted / production write | 0 |
| production migration | 0 |
| deploy / public traffic | 0 |
| production secret / signing identity | 0 |
| merge R4 implementation | 不允许 |

下载 hash-pinned PostgreSQL public image、创建本机临时 Docker 资源、编译
测试 binary、创建临时测试 Keychain/certificate 是本次唯一新增的本机副
作用；它们的名字、范围和清理都固定在 Manifest 里。

## 你真正需要记住的三个 Yellow

### Yellow 1：官方 Codex 可能没有我们需要的“窄门”

它现在很接近 Forme 要的 harness，但“接近”不等于物理上能只暴露 broker
并卡住 provider transport。Gate B 就是把这件事测清楚。

失败结果：**AI lane 关闭，Owner 仍可手写回复。**

### Yellow 2：macOS 的几块保护可能无法组合成一整条链

签名、Keychain/user presence、reverse isolation、sandbox、无正文落盘、
cleanup 必须一起成立，不能各测一块然后拼出一个乐观结论。

失败结果：**Guest bytes 不进入 Codex，Owner 仍可手写回复。**

### Yellow 3：生产世界仍然完全没批准

域名、Cloudflare/Caddy、真实账号、production DB、backup/log、email
provider、deploy 和真实 Guest 都还是 Gate C。

所以 Gate B 通过，只代表“这套系统值得进入下一张上线许可”，不代表
Forme Room 已经能给朋友使用。

## 各类用户会感受到什么变化

- Owner：Gate B 期间主要看到技术验证；可能需要在 macOS 测试里确认一次
  user-presence。不会出现真实 Guest inbox，也不会产生 AI 回复。
- Manual Guest：没有真实入口；只存在 synthetic fixture。
- Agent Guest：没有真实 token；只测试固定 action 和权限边界。
- Curator / Third Place：没有真实上线、admit 或 unlist 动作。

因此这轮不是一个新的产品 demo，而是把“以后能安全地跑真实 demo”的
地基从推测变成可验证结果。

## 我建议你只 challenge 四个问题

1. 你是否接受下载并运行一份 digest 固定、无 host port、用完删除的
   PostgreSQL Docker image？
2. 你是否接受 Gate B 最好的结果之一可能是“官方 Codex 当前做不到，AI
   lane 暂不开”？
3. 你是否接受一次测试用的 macOS user-presence 确认窗口和临时测试
   Keychain/signing artifact？
4. 你是否确认这次仍然不需要任何真实模型调用？

推荐答案：**四项都接受；First Provider-Call Test Grant 保持 NOT
REQUESTED。**

## 批准后怎么收口

Agent 只能按固定顺序运行：

```text
Gate A regression
→ schema/golden replay
→ disposable PostgreSQL + roles + encryption
→ fake budget/event fence
→ official Codex zero-call probe
→ macOS boundary probe
→ body-free evidence
→ STOP
```

结果只可能是：

- Green：这一项在 exact local/disposable target 上通过；
- Yellow：物理能力做不到或不确定，AI lane 自动保持 manual-only；
- Red：违反已批准 contract 或泄漏/越权，立即停止并回来纠正。

这轮不会因为测试通过就自动进入 provider call，更不会自动进入 Gate C。

## 最终批准对象

批准前请确认：

- Gate A evidence 是 `GREEN_FOR_GATE_B_REVIEW`；
- 独立 audit 是 `Red = none`；
- 完整 Manifest 与本 Brief 的边界一致；
- 上方 `PENDING_FINAL_MANIFEST_SHA256` 已换成最终 hash；
- First Provider-Call Test Grant 仍是 `NOT REQUESTED`。

届时推荐直接回复：

```text
批准 R4 Gate B Schema, Runtime, and Migration Manifest v0.1 sha256:PENDING_FINAL_MANIFEST_SHA256；First Provider-Call Test Grant NOT REQUESTED
```

这句话只批准 Manifest 里的 local/ephemeral validation。任何 model call、
真实 Guest/email、hosted/production mutation、migration、deploy/public
traffic、production secret、merge 或 spend 前，都必须再次停下来问你。
