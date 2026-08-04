# R4 Gate B Owner Review — 低认知负荷版

- 状态：**等待 Owner 审批；尚未执行 Gate B**
- 上一层已批准 Packet：
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- 完整技术对象：
  [`R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`](./R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md)
- Manifest SHA-256：
  `sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa`
- First Provider-Call Test Grant：**NOT REQUESTED**

## 一句话结论

Gate A 已经把 R4 的产品规则和五段 synthetic 体验做出来了；Gate B 要做
的不是上线，也不是让 Codex 回答 Guest，而是把三个最关键的“目前还是假
的地基”做成可在本机验证的版本，再回来告诉你哪里真的成立、哪里只能
保持手写回复。

我的推荐：**批准 Gate B，但继续不批准第一次模型调用。**

## 我们现在站在哪里

```text
Gate A（已完成 Technical Review）
39 个对象（统一协议）+ 45 个固定动作
+ 无 AI 的 Room Web/API
+ 本地同步/候选回复/清理边界
+ 5 条 synthetic journey
+ 45/45 R1–R3 与 293/293 R4 checks
                ↓
Gate B（这次申请）
把数据库契约做成一次性 PostgreSQL
+ 问官方 Codex 能否形成所需窄门（零模型调用）
+ 把 macOS 本地保护壳作为整体试一次
+ 用纯假的 upstream 撞预算边界
                ↓
回来给你 Green / Yellow / Red 结果
不自动进入模型调用，也不自动上线
```

换句话说：Gate A 证明“Forme 的规则在 repo 里能工作”；Gate B 检查
“这些规则能不能接到更真实的数据库和本地 Harness 边界上”。

## 你批准后具体会发生什么

### 1. 一次性 PostgreSQL：试数据库能不能真正守规则

会下载 hash 固定的 PostgreSQL 16.10 image，在本机启动一个名字固定、
`--network none`、没有 host port 的临时 container 和 volume。里面只有
synthetic 数据和 synthetic key，用完必须删干净。

它主要验证：1/2/3/10 次互动额度、并发只能有一个赢家、Grant/Invite/
Interaction/Response 的状态关系、terminal 后正文不可读、五种数据库角色
不能互相越权，以及敏感字段只能加密落库。

这不是你的生产数据库，也不做 production migration。

### 2. 官方 Codex 零调用检查：先问“这扇窄门能不能存在”

目标固定为官方 `codex-cli 0.145.0`。只允许做：看版本、看 help、生成
官方 schema、启动 app-server 后执行 `initialize`，然后立刻退出。

明确禁止：start thread、start turn、选 model、读取真实 Codex auth、访问
网络、调用 OpenAI、读 Guest 内容、运行 shell/tool/MCP/plugin/browser。

我们想知道官方 Codex 的真实接口是否有机会承载 Forme 的 Fresh Response
边界。因为零调用本身不能证明未来模型实际看到哪些工具、provider transport
能否被 Forme 卡住，所以即使它全部通过，AI lane 的结论也最多是：

> Yellow：目前继续 `manual_owner_only`，下一次真实模型测试仍需单独批准。

这是一个有价值的否定结果，不会被包装成“接入成功”。

### 3. macOS 保护壳：检查隐私边界能不能在物理上组成一条链

会临时编译并签名一个 `FormeLocal.app`，使用临时测试 Keychain 和临时
测试证书，可能显示一次本地 user-presence 确认窗口。它会尝试证明 Fresh
child 看不到 live repo、home、Room credential、candidate key，也不能
联网、监听、fork/exec、写 Guest 正文或留下 transcript。

如果临时 Keychain + Secure Enclave 组合不支持、资源上限说不清、或
屏幕捕获边界无法证明，结论同样是 Yellow/manual-only，而不是降级到 login
Keychain 或较弱的文件权限。

### 4. 假 budget：不花钱地撞一次所有上限

会用内存里的假 upstream 测 3 次 dispatch、128k input、8k output、60
分钟、US$1、30 秒 permit，以及每一项的 `limit + 1`。其中的 thread/turn
ID 只是 synthetic fixture；不会创建真实 Codex thread/turn。

测试通过后仍然是 provider bytes = 0、actual spend = US$0。

## 这次明确不会发生什么

| 动作 | 本次上限 |
|---|---:|
| 模型/provider session | 0 |
| Codex thread / turn | 0 / 0 |
| 发给 provider 的 bytes | 0 |
| 实际 provider spend | US$0 |
| 真实 Guest / email address | 0 bytes / 0 |
| 外部 email / message | 0 |
| hosted / production write | 0 |
| production migration | 0 |
| deploy / public traffic | 0 |
| production credential | 0 |
| merge | 不允许 |

唯一新增的外部网络动作是：如果本机没有指定 image，Docker 可以下载那一
份 hash-pinned public PostgreSQL image。运行中的 container 自己没有网络。

## 对各类用户的体验有什么变化

- Owner：这轮主要看到技术结果，macOS lane 可能弹一次测试确认窗口；没有
  新的真实 inbox，也没有 AI draft。
- Manual Guest：没有真实入口，仍是 synthetic fixture。
- Agent Guest：没有真实 token，也没有 Agent 对服务器的真实互动。
- Curator / Third Place：不会上线，不会产生真实 admit/unlist。

所以 Gate B 不是新的产品 demo。它是在决定：下一轮真实 demo 里，我们
可以放心地使用哪些地基；哪些部分必须先保持 Owner 手写。

## 你真正需要判断的四件事

1. 接受下载并运行那一份 digest 固定、无 host port、用完删除的
   PostgreSQL image 吗？
2. 接受一次临时 macOS build / test Keychain / user-presence 测试吗？
3. 接受“官方 Codex 当前还不能满足窄门，所以 AI lane 暂不开”也可能是
   Gate B 的正确结果吗？
4. 确认本轮仍然不需要任何真实模型/provider 调用吗？

推荐答案：**四项都接受；First Provider-Call Test Grant 保持 NOT
REQUESTED。**

你不需要逐行审 37 张表或 45 个 endpoint。完整 Manifest、8 份静态契约、
154-file source inventory 和 hash index 已经机械互相绑定；独立静态复核
也已关闭文件白名单、Codex 路径、synthetic thread/turn 措辞和 grant token
四个矛盾。

## 批准后的停止点

结果只能是：

- Green：某一项在 exact local/disposable target 上通过；
- Yellow：能力缺失或证据不足，Fresh AI lane 保持 manual-only；
- Red：越权、泄漏、漂移、失败或清理不确定，立刻停。

跑完后必须先回来给你 body-free execution report、每条 lane 的 verdict、
清理证明和剩余缺口。不会因为本地测试通过就自动开始 provider call，
也不会自动进入 Gate C。

## 推荐批准文本

如果以上符合你的判断，下一条可直接使用：

```text
批准 R4 Gate B Schema, Runtime, and Migration Manifest v0.1 sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa；First Provider-Call Test Grant NOT REQUESTED
```

这句话只批准 Manifest 里的 repository construction 与 local/ephemeral
validation。真实模型调用、真实 Guest/email、production migration、部署、
public traffic、production secret、merge 或 spend 仍需新的明确批准。
