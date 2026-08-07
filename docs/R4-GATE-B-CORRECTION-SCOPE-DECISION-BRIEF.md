# R4 Gate B Correction Scope — Owner Decision Brief

- Status: **OWNER DECISION REQUIRED — NO GRANT REQUESTED**
- Updated: 2026-08-07
- Current R4 state: **Gate A Green; Retry Construction Yellow and cleaned**
- Retry Execution Grant: **NOT REQUESTED**
- First Provider-Call Test Grant: **NOT REQUESTED**
- Construction / Docker / real Codex / signing / Keychain authority: **0**

## 一句话

昨天我们把下一步理解成“补三根 physical adapter 线”。更仔细的代码复核表明，
真正的问题更深：**我们需要先决定 MVP 要把哪一小段真实系统做完整，而不是把
一个仍有占位语义的全系统接上电。**

我的推荐是：把 Gate B 分成 **Demo-critical Core** 和 **Post-demo Full**。Core
先分别证明真实数据库/Room control 语义和真实 Codex zero-call child boundary；
随后仍需单独批准的一次 Provider Test，才可能把两者连成 database → Codex →
Owner review。其余能力明确不暴露、不伪装成已经实现。

本 Brief 只请求产品/架构方向判断。批准五项推荐后，下一步才是准备一份 exact、
hash-pinned Correction Packet。它本身不授权 Construction 或 Execution。

## 为什么需要纠正昨天的理解

### 1. PostgreSQL 不只是缺 Docker wiring

已经完成的是完整 schema 骨架、对象/权限清点和静态 race 模型。更深复核发现：

- 53 个正式 SQL surface function 中，51 个统一返回
  `503 storage_unavailable`；
- 另外 2 个 notification claim 固定返回 `none`；
- 8 个 race 目前是内存中的预设结果，不是真实并发 SQL；
- 冻结合同要求 27 类真实数据库验证，而不仅是 8 个 race；
- cleanup marker 目前也没有在 Docker resource 创建前后持久更新。

因此，只把 Docker 接进 runner 最多证明“PostgreSQL 16.10 可以安装这份骨架”，
不能证明 Room lifecycle、Grant、Interaction、Response、idempotency、rate limit、
terminal precedence 或 cleanup 的真实语义。

证据入口：
[`0001_r4_presence.sql`](../schemas/r4/sql/0001_r4_presence.sql)、
[`postgres-contract.md`](../schemas/r4/gate-b/postgres-contract.md)、
[`r4-gate-b-postgres.mjs`](../scripts/r4-gate-b-postgres.mjs)。

### 2. Codex 的 `pinned_staged` 仍是 fixture extension

现有 fake adapter 很有价值，但真实路径还没有物理成立：

- runner 的 Codex lane 直接返回 controlled Yellow；
- 四条真实命令仍会直接 spawn，没有 Seatbelt composition；
- real initialize response 仍按 fixture-only shape 判断；
- 批准合同、Node probe、Swift plan 使用三套不同的 schema/tmp 路径；
- 当前 Fresh Session profile 不允许写 zero-call schema root，不能直接复用；
- timeout 没有完整 process-group reap 和 survivor proof。

正确的 correction 是新增一份独立、hash-pinned 的 **zero-call diagnostic
Seatbelt profile**，不污染未来真正的 Fresh Session profile。即使 clean zero-call
通过，它仍只是 Yellow：它证明“真实 Codex 可以被安全启动并在模型调用前停住”，
不证明 provider transport 或未来 tool inventory 已经安全。

证据入口：
[`app-server-probe.ts`](../packages/r4-codex-adapter/src/app-server-probe.ts)、
[`codex-zero-call-contract.json`](../schemas/r4/gate-b/codex-zero-call-contract.json)、
[`forme-fresh-response.sb`](../schemas/r4/gate-b/macos/forme-fresh-response.sb)。

### 3. macOS 的原设计可能在本机能力上不成立

现有 native source/unit tests 证明了规则形状，但不是物理证据：

- runner 没有 signing/Keychain adapter；
- custom-file Keychain + persistent Secure Enclave key 是 deprecated/可能不支持的
  组合；
- `userPresenceRequested` 目前来自静态 boolean，不是一次被观察到的系统动作；
- signature/Seatbelt evidence 有 hard-coded external-verification boolean；
- empty entitlements 不等于网络被 OS 物理拒绝；
- cleanup 尚未逐项删除 Keychain/Secure Enclave resource 并证明无残留。

如果坚持原始 persistent-candidate 设计，可能花掉大量时间后仍只能得到 Yellow。
更适合 Demo 的方向是：先证明 signed helper、Seatbelt、user presence、内存中
transient candidate 和 crash/cleanup；persistent candidate store 与正式
code-identity/access-group 绑定继续明确延后。

证据入口：
[`KeychainProtector.swift`](../native/macos/Sources/FormeLocal/KeychainProtector.swift)、
[`GateBProbe.swift`](../native/macos/Sources/FormeLocal/GateBProbe.swift)、
[`build-recipe.json`](../schemas/r4/gate-b/macos/build-recipe.json)。

## 仍然有效、无需推倒重来的部分

这不是说上一轮白做了。下面这些仍是可复用且已经验证的地基：

- exact path fence 与 repo/external-root denial；
- closed API/local/evidence schema；
- PostgreSQL 对象、role、grant、constraint 的静态骨架；
- AES-256-GCM field envelope、AAD、nonce 和内存清理；
- fake budget、event fence、no-retry/no-fallback；
- fake-only Codex wire guard、method denial 和 body-free evidence；
- native source、review authority、resource limits 和 cleanup contract；
- aggregate runner 的 serial、Yellow continuation、Red → `NOT_RUN` 和
  cleanup-always 语义。

上一轮 Yellow 是正确的。需要纠正的是我们对“离真实运行还有多远”的口头估计，
不是把 Yellow 改判成 Red。

## 五个 Owner 决策

### D1 — PostgreSQL 做完整合同，还是先做真实 Hero Slice？

**Option A — Full Contract**

在 Demo 前完成全部 53 个 surface function、27 类 runtime test 和全部 race。
架构最完整，但很可能挤压真实 Room 体验、Owner Demo 和 R5 hardening。

**Option B — Demo-critical Core（推荐）**

下一份 Packet 先固定一个足以完成三分钟 Room Encounter 的 exact operation set：

```text
synthetic Controller + Curator Gate B identity basis
→ Entity + public Room creation
→ exact Room pairing/binding
→ Projection delivery + Curator admission
→ current Projection / Third Place read
→ one bounded public knock
→ Owner/local control reads the Interaction
→ one response candidate and Owner disposition
→ exact Response delivery
→ one bounded continuation Grant lifecycle
→ revoke / terminal unreadability / idempotent recovery
```

这个集合里的 SQL 和 race 必须真实；Gate B 使用同一 Core function surface 创建
fixed synthetic setup，不接受绕过 API/SQL 语义的手写 seed。生产 Controller/Curator
身份值仍属 Gate C。其余 endpoint 在 P0 中不注册、不展示，也不以 `503` 假装成
已支持。完整 53-function/27-category 合同移到 Post-demo Full。原 Gate B 全合同
继续标记未完成，不能借 Core Green 冒充 Full Green。

**Option C — Docker Smoke Only**

只证明 schema 可以安装/回滚。它不能支撑真实 Room，因此不推荐。

### D2 — Codex zero-call 用哪种物理 profile？

**推荐：新增独立 diagnostic Seatbelt profile。**

它只服务 version/help/schema/initialize 四条 zero-call 命令，允许写 exact schema、
isolated HOME/CODEX_HOME/tmp，拒绝网络、Workspace、connector、candidate、任意
command 和 descendant。真正的 Fresh Session profile 保持独立，不为诊断流程
扩大权限。

clean zero-call 仍返回 Yellow/manual-owner-only；First Provider Call 继续是另一个
Owner gate。

### D3 — macOS candidate protection 在 MVP 做到哪一层？

**Option A — 原 persistent design**

继续要求 custom-file Keychain + persistent Secure Enclave candidate key + fixed
code identity/access group。它最接近最高合同，但需要正式签名/entitlement 设计，
并可能在当前 host 上不受支持。

**Option B — Transient Candidate MVP（推荐）**

- signed one-run helper；
- child Codex 受 Seatbelt；
- candidate 只存在于 locked memory 和 one-shot Owner review window；
- user cancel、crash 或 authority expiry 直接丢弃 candidate，绝不落盘；
- synthetic Room binding / temporary signing material 仍须可清理；
- persistent candidate recovery、正式 signing identity、Data Protection Keychain /
  access group 明确留到 post-demo。

这降低的是“未批准 candidate 跨进程/重启恢复能力”，不是隐私边界。Demo 不会
声称 transient candidate 可以恢复。它同时是对已批准 T3/T5 中 encrypted
persistent candidate、最长七日保留、crash reconciliation 和 submitted-unknown
recovery 保证的 **显式 MVP superseding exception**；这些能力在 Core 中是
unavailable，而不是暗中换一种实现。

### D4 — 控制整个执行的 Desktop Agent 是否也必须被内核隔离？

**推荐：MVP 接受 procedural controller boundary。**

child Codex 必须被 Seatbelt 物理限制；控制 runner 的 Desktop Agent 只允许调用
一个 hash-pinned command，失败后只能 cleanup + stop，不准临场调查。我们继续
明确披露：这个主 Agent 本身仍有较宽文件权限。

若要求主 Agent 也必须 kernel-enforced，则需专用本地用户、restricted workspace
或 VM。这会成为一个独立基础设施项目，不建议放进 8 月 19 日路径。

### D5 — disposable PostgreSQL image cache 如何处理？

**推荐：允许 exact pinned image 留在本机 cache。**

未来 Execution 必须清除 container、volume、database worker 和 run root；如果
本机原来没有该 image，pull 产生的 content-addressed cache 可以保留。自动删除
可能破坏共享 cache，也难以在 crash 后可靠判断 ownership。最终证据必须披露
image cache 可能保留，但它只含公开 PostgreSQL image，不含 synthetic database。

## Scope amendment honesty

D1 Option B 和 D3 Option B 是有意的 **MVP proof/claim scope amendment**，不是对
已经批准的 Technical Control Packet v0.2 进行静默改写。v0.2 的原始 bytes 与
Full target 保持不可变；下一份 exact Correction Packet 必须明确列出：

- Demo-critical Core 在 8 月 19 日前具体证明什么；
- Full contract 中哪些能力被隐藏并移到 post-demo；
- Transient Candidate 失去了哪些跨崩溃/重启恢复承诺；以及
- operation inventory、JSON schema/index、HTTP dispatcher、Web/CLI exposure、
  excluded-route behavior 和 tests 如何一起缩到同一个 Core surface；以及
- Core Green 绝不等于原 Full Gate B Green。

在 Owner 批准本 Brief 和之后的 exact Packet 之前，原批准边界继续生效，任何
runtime correction 或 physical execution 都没有权限。

## 推荐后的 Gate 结构

```text
现在：Owner 批准五项方向
  ↓
准备 exact Gate B Core Correction Packet + hash
  ↓ Owner 再批准
repo-only Construction：真实语义代码 + 三个 fake-executor physical adapters
  ↓ STOP，返回 corrected Execution Manifest
  ↓ Owner 再批准
一次真实 Core Retry Execution：synthetic data / zero provider call
  ↓ STOP
准备 exact First Provider-Call Test Grant
  ↓ Owner 再批准
一次 synthetic / non-Guest provider test
  ↓ STOP
准备 exact Gate C Production/Activation Grant
  ↓ Owner 再批准
deployment + real Room activation + Owner Demo
```

## 对产品的意义

这次 scope correction 不是为了少做安全，而是为了让 P0 的可见能力都是真的：

- Guest 真能看到一个 current Projection；
- public knock 真能成为一个 durable Interaction；
- Owner/local Agent 真能读取、判断和回复；
- continuation 真受 exact Grant/quota/expiry 控制；
- Codex zero-call diagnostic child 的实际边界真被测过；真正 Fresh Session 的
  provider/tool boundary 仍等待单独 Provider Test；
- 没做完的能力不会出现在 UI/API 中假装可用。

最高 Vision 中的完整 Room OS、persistent candidate continuity、完整 45-operation
surface 和 general Twin-to-Twin protocol 都保留，但不再要求一次 Demo 同时证明。

## 时间判断

如果选择推荐方向，当前建议节奏是：

| 日期 | 目标 |
|---|---|
| Aug 7 | Owner scope decision；冻结 exact Correction Packet |
| Aug 8–11 | Gate B Core repo-only Construction |
| Aug 12 | Owner review；如批准则跑一次 zero-provider Retry Execution |
| Aug 13–14 | 如另行批准：First Provider Test；准备 Gate C Production/Activation Packet |
| Aug 15–18 | R5 privacy/recovery/rehearsal；Aug 16 后不加 feature |
| Aug 19 | Demo Day |

这是可行但偏紧的路径。Gate C 还包括 deployment、Cloudflare/Caddy、production
PostgreSQL、backup/log 与 activation controls，不会因 Provider Test 自动获批。
static Projection + manual Owner response 仍保留为 Demo fallback；不得用 fallback
冒充 Fresh Session 已 Green。

## 推荐决策

1. 批准 D1 Option B：Demo-critical PostgreSQL Core；Full 合同 post-demo。
2. 批准 D2：独立 zero-call diagnostic Seatbelt profile。
3. 批准 D3 Option B：Transient Candidate MVP；persistent protection post-demo。
4. 批准 D4：MVP 接受并披露 procedural controller boundary。
5. 批准 D5：允许 pinned public image cache 保留；其余 runtime resources 全清。

批准这些方向只允许我准备下一份 exact Correction Packet，不允许修改 runtime
code、运行 Docker/real Codex/signing/Keychain、开始 Retry Execution、调用
Provider、进入 Gate C、部署、merge 或 spend。

## 推荐批准文本

```text
批准 R4 Gate B Correction Scope Decision Brief 五项推荐；只授权准备 exact Correction Packet；Correction Construction、Retry Execution 与 First Provider-Call Test Grant 均 NOT REQUESTED
```
