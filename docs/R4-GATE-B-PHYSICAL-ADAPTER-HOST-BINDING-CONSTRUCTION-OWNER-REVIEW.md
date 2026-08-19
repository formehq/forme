# R4 Gate B Physical Adapter + Host Binding Construction — Owner Review

- Status: **PROPOSAL — waiting for Owner approval**
- Prepared: 2026-08-07
- Exact Construction Packet:
  `sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06`
- Approved parent Decision Brief:
  `sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2`
- Host-Binding / Adapter Construction Grant:
  **REQUESTED BY THIS PROPOSAL; NOT YET APPROVED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**

## 一句话版本

下一轮不是“把 Demo 跑起来”，而是先把三根还没接上的真实转接器造好，并只读确认
这台 Mac 上将来要用的 exact 工具。完成后仍然是 Yellow，再由你单独决定要不要真的
按一次 Retry。

```text
现在：三套 repo/fake 机制，但还不是一台可安全通电的机器
下一轮：造唯一总开关 + 三套 physical adapters + fake/fault tests
然后：只读确认 Owner 指定的 Docker / Codex / macOS 工具
返回：72h 本机 capsule + 新 Yellow Manifest
不会：启动 DB/Codex、签名、碰 Keychain、弹指纹/人脸或调用 AI
```

## 这份长 Packet 实际锁死了什么

### 1. 只有一只总开关

未来控制 Agent 只能调用统一 runner，不能自己拿一条 shell 命令、路径、模型或参数去
操作某一 lane。顺序固定为 PostgreSQL → Codex zero-call → macOS helper → cleanup。

### 2. PostgreSQL 不再拿说明书冒充 race test

它会把当前 13 个概念 family 展开成真正可执行的：

```text
16 cases × 2 orders = 32 次并发顺序
68 次 Core 调用
32 份持久状态校验
```

同时落两项你已批准的窄纠正：

- “20 个待处理上限”只算 public/anonymous interaction，不算 Owner Grant；
- public accept 的 3/day 使用 Encounter 签发时继承的真实 edge bucket，不再错误地
  每个 Encounter 单独计数。

没有新增产品 API、表、operation 或第二份 migration。

### 3. Codex 只证明它真的观察到的部分

未来 zero-call 最多启动四个受控进程：version、help、schema、initialize。不会开 thread、
turn 或 provider call。系统会在第二次写之前清空并检查当前已收到的数据，但不会用
“等安静几毫秒”假装未来绝不会再来一个 byte。

所以即使这条 lane 将来 clean，也会同时写：

```text
observed green
future-byte finality unproven
AI disabled
aggregate Yellow
```

### 4. macOS 只做一次 synthetic 的机制证明

未来 Retry 若另获批准，会临时编译并签一个 helper，用一次 device-owner authentication
展示一份 synthetic response；Owner 点 exact approve 后只在 helper 内 count-and-discard，
不会把正文交给 provider 或真实 connector。

这里保留三条刻意透明的 Demo 权衡：

- one-run custom Keychain / PKCS#12 的 synthetic secrets 会短暂出现在本机 CLI argv；
- `codesign` 可能顺带读取标准 Keychain search list，我们只证明零显式 mutation 和
  前后 metadata 相同；
- helper 直接运行，不宣称被 Seatbelt 或 Desktop Agent 的 kernel sandbox 包住。

这些都不涉及 candidate、Owner credential 或 production secret；所有 owned signing
材料必须清理。它也不证明持久化、崩溃恢复、notarization 或真实 provider E2E。

### 5. Host Binding 是短期本机插头说明，不进 Git

你之后要指定三个 exact absolute path：Docker CLI、local Docker Unix socket、Codex
package root。系统不搜索、不猜、不 fallback。私有 path/identity 只进入 mode 0600、
Git-ignored、72 小时有效的本机 capsule；Git 只保留公开版本/hash和 capsule 指纹。

## 批准后会发生什么

只有在你另外明确给出 exact Packet/Review/proposal hashes、批准
`Host-Binding / Adapter Construction Grant`，并在回执中给出三个 exact path 或准备好
固定 Host Binding input 后，Agent
才可以：

1. 在批准 workset 内实现 adapters、两项窄 SQL 纠正、fake/fault tests；
2. 测试全部通过后先冻结 implementation commit/tree；
3. 再做一次 bounded read-only Host Binding；
4. 产出本机 capsule、body-free receipt、新 Yellow Manifest/Report/Review，push Draft PR；
5. STOP，把 Retry 决策交还给你。

## 批准后仍不会发生什么

- 不运行 Docker/PostgreSQL，不 apply SQL；
- 不运行真实 Codex/Seatbelt，不创建 thread/turn，不调用 provider；
- 不 assemble/sign/launch app，不读写 Keychain，不调用 LA；
- 不使用真实 Guest/Room/candidate，不部署、不 merge、不产生 public traffic/spend；
- 不自动批准 Retry，也不把任何 lane 叫成产品级 Green。

## 你现在真正需要判断的

没有新增第六个产品选择。你只需要确认：上面这些是对已批准五项建议的准确、足够窄的
施工翻译；并接受下一轮的结果仍是一份“可以决定是否试跑”的 Yellow，而不是 Demo
已经完成。

我的推荐：**批准 exact Packet 与本 Review；等三个 Owner-chosen path 被准备好时，再在
同一条明确回执里打开一次 Host-Binding / Adapter Construction Grant。Retry 与 First
Provider Call 继续关闭。**

## 推荐批准格式

冻结 proposal commit/tree 后，使用 Agent 返回的 exact values：

```text
批准 R4 Gate B Physical Adapter + Host Binding Construction Packet v0.1
sha256:<exact-packet-sha>；批准 Owner Review sha256:<exact-review-sha>；
Proposal HEAD <exact-head> tree <exact-tree>；
Host Binding input at .forme/gate-b-host-binding-input.v1.json is prepared
from the three Owner-chosen exact paths；
Host-Binding / Adapter Construction Grant APPROVED；
Retry Execution Grant NOT_REQUESTED；
First Provider-Call Test Grant NOT_REQUESTED
```

如果三个 path 尚未准备好，可以先只批准 Packet/Review，继续保持 Construction Grant
`NOT_REQUESTED`；这不会触发任何 host read 或代码施工。
