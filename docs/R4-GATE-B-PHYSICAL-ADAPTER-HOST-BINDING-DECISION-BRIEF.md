# R4 Gate B Physical Adapter + Host Binding — Owner Decision Brief

- Status: **PROPOSAL — recommendations not yet Owner-approved**
- Prepared: 2026-08-07
- Current result: **Gate B Core Construction returned repository-reviewable Yellow**
- Host-Binding / Adapter Construction Grant: **NOT_REQUESTED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Gate C / deploy / public traffic / merge / spend: **NOT_REQUESTED**

## 先说人话

上一轮已经把三个部件做到了“代码和假执行器可以检查”：

- PostgreSQL 有当前 Core SQL 和 fake mechanism，但两处产品语义仍需 Owner 定义；
- Codex 有 zero-call 的协议、隔离和进程清理骨架；
- macOS 有 transient candidate helper。

但它们还没有被做成一台能安全试跑的真实机器：真实工具没有绑定，三条 physical
lane 没有一只唯一总开关，PostgreSQL race 说明书也还没有变成真实可执行测试。
所以当前 Yellow 是诚实的，不能直接批准 Retry。

下一步建议是：**先批准施工蓝图，再做一次“先造转接器、再只读认插头、仍不通电”
的 Construction。**

```text
当前 Core Yellow
  → 仓库内构造唯一 physical runner / adapters，并只用 fake effects 验证
  → 冻结 implementation commit/tree + runner hashes
  → 只读绑定这台 Demo Mac 的 exact 工具，并写本机 capsule
  → 返回一份新的 Yellow Manifest 给 Owner
  → 未来才可能单独批准一次 zero-provider Retry
```

这份 Brief 的五个判断可以这样低成本理解：

| # | 你在批准什么 | 批准 Brief 后立即产生 effect？ |
|---|---|---|
| 1 | 下一轮先造 fake-tested adapter，再做少量 exact host inspection | 否 |
| 2 | absolute host path 只留在 72h 本机 capsule | 否 |
| 3 | 只留一只总开关，并接受 Codex post-response finality 仍未被证明 | 否 |
| 4 | 修正 PostgreSQL 的 public-pool 与并发结果定义 | 否 |
| 5 | 接受 transient macOS CLI signing 的明确 Demo 风险与窄证明 | 否 |

其中 Decision 4 是产品语义纠正；Decision 3/5 是我们不伪装成已经证明的本机机制/
风险边界。未来 Construction 若另获批准，才会运行少量 exact、只读 host inspection
并写 Forme-owned local capsule；它仍不会启动 Codex、container、database 或 AI。

批准本 Brief **只允许准备 exact Construction Packet**。它不会读取新的 host facts，
不会运行 Docker/Codex，不会签名、碰 Keychain 或弹出人脸/指纹提示。

## 当前冻结基线

| Artifact | Exact value |
|---|---|
| Published review HEAD / tree | `0e6a1a27e43adc54a4997ae98fda54dcda25da2e` / `b8d3d64dec3d0d6901ae72e127f0476ac75f14db` |
| Core Construction Report | `sha256:4369c5bf7f95e805b440c47a5d2908b091d74c14ab0b322a39d663978c570f40` |
| Core machine evidence | `sha256:8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09` |
| Non-approvable Execution Manifest | `sha256:f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74` |
| Core Execution Owner Review | `sha256:332c86ab3ec7612dfa7a107eaf95358dccc7843d0c7b97befddb096b5e3307d6` |

这份 Brief 不改写上述证据，也不会把 Yellow 重新叫成 Green。

## Decision 1 — 下一轮是“Adapter Construction → Host-Binding Finalization”

### 推荐：批准

未来 exact Packet 严格串行两段：

1. **Adapter Construction**：先在 repo 内补统一 physical runner、lane adapters、
   PostgreSQL race workers 和 fake tests；全部 fake/static checks Green 后，冻结
   implementation commit/tree 与 exact runner/input hashes；
2. **Host-Binding Finalization**：只对这个 immutable implementation basis 只读确认
   exact Docker client/local daemon/cache image、Codex package、Node、macOS/Xcode
   tools，并生成 local capsule + body-free public receipt。

Host Binding 只允许最小事实：工具 realpath/stat/hash/version、`darwin-arm64`、本地
Unix Docker socket 的类型/权限、sanitized client/server/API/OS/arch，以及 exact
pinned cached image 的 digest/ID/OS/arch。它不读 Docker credentials/context、
`~/.docker`、hostname/username、任意环境变量、Keychain identity/default/search
list、LocalAuthentication capability 或其他进程；不接受 TCP/SSH Docker，不 pull，
不启动 Docker Desktop，不创建 container/volume。

第一段任何 fake/static check 失败，第二段不开始。第二段任何 binding 不支持或不闭合，
都返回 Yellow 并停止。Public receipt可以在后续 docs-only commit发布，但 capsule 绑定
的是冻结的 implementation basis与runner hashes，不会被报告 commit 自我失效。
除approved repo writes与normal tests外，Host inspection与写local capsule是这一
Construction唯一新增的host interaction；真实Docker/PostgreSQL/Codex/macOS runtime
effect仍为零。

## Decision 2 — Host Binding 只留在本机，Git 只保存指纹

### 推荐：批准

Host Binding Capsule 放在 Git-ignored、mode `0700/0600` 的：

```text
.forme/gate-b-host-bindings/<hostBindingId>.json
```

本机 capsule 可以包含 runner 必需的 absolute paths。Git、PR、Report 和公共
evidence 只保存 logical tool、公开版本/hash、platform class、capsule canonical
hash、created/expiry/invalidation；不保存 raw path、hostname、username、home、account、
credential、inode/dev、Codex installation ID 或 machine name。

有效期固定 **72 hours**。tool bytes/path identity/immutable implementation basis/
runner hash/mode/owner/capsule hash任一 drift 都失效，不能自动刷新或 fallback。

Codex root 由 Owner 在未来 gate 提供一个 absolute root。binder 只允许其中 exact
`bin/codex.js` 与 `vendor/aarch64-apple-darwin/codex/codex`，严格 pin `0.145.0`；
不做 PATH/HOME/package-manager 搜索，不枚举 `~/.codex`，版本 drift 只返回 Yellow。

## Decision 3 — 只有一只总开关，并诚实接受 Codex 的因果边界

### 推荐：批准

下一轮只构造一个统一 Gate B physical runner。未来即使 Retry 获批，控制 Agent 也
只能调用 exact runner 或 exact cleanup，不能单独取得 PostgreSQL/Codex/macOS
production port，也不能传 arbitrary command/cwd/env/path/provider/model/prompt/
credential/source/fallback。

```text
Manifest + Grant + repo binding
  → local Host Binding revalidation
  → fresh 0700 run root + intent-before-effect journal
  → PostgreSQL → Codex zero-call → macOS transient helper
  → cleanup-always → body-free evidence → STOP
```

同时冻结 Codex 能真正证明的边界：

```text
第二次写决策前已收到任何额外 byte/line/violation → 不写 initialized，writes 最多 1
第二次写完成后才新到达 invalid bytes            → writes 最多 2
观察到 violation 后                              → 新 writes 0，terminate/cleanup
尚未到达的未来 bytes                             → finality UNPROVEN_ACCEPTED
```

第二次写之前必须证明当前 receive buffer 完全为空；transport chunk boundary不能成为
合同。不使用“安静 N ms”来伪装未来不会再有消息。未来 clean run 最多叫
`CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN`，并同时记录
`causalFinality=UNPROVEN_ACCEPTED`、`aiLaneEnabled=false`；aggregate 仍 Yellow。
Authority ceiling是 0..4 个 Codex/Seatbelt process starts；clean success必须 exactly 4。
thread/start、turn/start、provider request、network authority与transmitted bytes均为0；
不声称从未发生被Seatbelt拒绝的network syscall attempt。

## Decision 4 — PostgreSQL 保留 13 个概念 family，但按真实语义执行 16 个 case

### 推荐：批准

当前 13-row race artifact 只是说明书，而且把四种 rate edge 压成了一个 generic row。
展开后净增3个 executable cases，推荐冻结为：

- 13 个 named race families；
- family #3 展开为 active-pool 20、hourly 10、daily 50、public-accept 3；
- 合计 **16 cases × 2 commit orders = 32 executions**；
- 64 个 concurrent Core calls；cycle recovery 再加 4 个，最低 **68 calls**；
- 32 个 order-specific persisted-state verifiers。

每个 order 都从干净 overlay 开始：

```text
rollback → bootstrap → migration → basis → synthetic scenario setup
→ A/B race → persisted verifier → rollback
```

Worker 使用 `READ COMMITTED`；barrier 与 Core call 是两个独立 SQL statement。
未来 Packet必须冻结真实 overlapping-transaction handshake：Controller持有run/case/
order/actor-derived session locks；A/B worker各自 `BEGIN`、body-free READY、start release、
CALL_STARTED、Core statement、post-call/pre-COMMIT hold、commit release/ACK，且每个阶段
有deadline、TERM→KILL→absence与reap。不能把先完整跑A再完整跑B冒充physical race。
Basis仍只能通过setup function安装；migrate role只可准备exact synthetic race rows/
timestamps，不能手写Controller/Curator/Third Place/Entity。

### 推荐的语义与实现纠正

1. **保留 If-Match/version precedence，纠正 expected arms，不为了测试调换这些检查。**
   例如 cycle reserve loser接受`version_conflict`；#10–#12某些顺序允许两个不同操作
   都成功。Successor Packet必须交付32-row exact table：A/B HTTP+code、effect count、
   version/event/receipt/post-state，不允许用`controlled`兜底；#1 loser明确为
   `410 pairing_expired`，#4/#6/#7/#8/#9明确version precedence。
2. **把“20”纠正为仅 anonymous/public-encounter 的 active-unresolved backlog cap。**
   Owner-issued Grant interactions仍不占池；这保留已批准的public/private隔离，只把
   rolling-24h改为更适合Demo运营的“当前待处理上限”。因此需要一项窄SQL修正：当前
   SQL误把所有origin都计入。Race从19开始并发两次`interaction.create`；另加一个
   cap=20时`public_encounter.issue → 429`的非race parity assertion。
3. **修复 public-accept 3/day 的真实bucket lineage。** 当前create错误使用每个
   encounter各自的actor scope，无法跨encounter累计3/day。窄SQL修正必须从正常
   encounter issuance保存的edge bucket继承；fixture也必须经过真实issued-encounter
   lineage，禁止手seed相同digest来造假Green。

这些纠正不降低并发安全：每个operation仍最多一次、失败方无意外副作用、最终状态/
version/event/receipt必须精确。它们让实现、产品contract和证明重新对齐。

本 Construction 成功也只能得到
`POSTGRES_PHYSICAL_ADAPTER_CONSTRUCTED_OFFLINE / POSTGRES_RETRY_READY_YELLOW`。
只有另行批准的真实 Docker/PostgreSQL Retry 全部通过并清理后，才可给该 exact
host/image/run 一个 `POSTGRES_CORE_LANE_GREEN`。

## Decision 5 — macOS 采用 Demo 可行的 transient 机制，并把不证明的部分写清

### 推荐：批准

未来 exact Packet 使用以下 MVP 形状：

- direct launch signed `Contents/MacOS/FormeCoreLocal`，不用 `open`；
- helper 本身不套 Seatbelt；现有 deny-default profile只属于未来 provider child；
- one-run self-signed identity + hardened runtime + frozen dynamic designated
  requirement；证书当场产生、同一 run 观察/验证，无法在 Host Binding 预知；
- 使用 exact OpenSSL/`security`/`codesign` CLI序列。custom-Keychain/PKCS#12/
  partition/canary等**仅synthetic** secrets会短暂出现在本机process argv；private
  key/cert/PKCS#12会短暂存在owned run root。它们不得进入journal/evidence并必须清理；
  candidate、Owner credential和production secret均不进入这些surface；
- `codesign --keychain`只限制 identity lookup，chain building 仍可能读取标准
  Keychain search list。我们只声称 runner 对 login/default Keychain **零显式 mutation**
  且 pre/post metadata hash 相等，不声称整个 OS 零 incidental read；
- custom Keychain 序列必须逐项列出；当前候选为 10 个 lifecycle subcommands +
  1 次 exact identity inventory + 1 次 signing-key use，不能只写一个“12”魔法数字；
- fresh `.deviceOwnerAuthentication` 最多一次，reuse=0；总绝对 deadline 15 分钟；
  window close=`discard`，absolute authority deadline=`authority_expired`；outer hard
  timeout/helper death只能Yellow/unknown，不能伪造成discard；
- candidate 只经 synthetic feeder memory → inherited pipe → helper locked buffers/UI；
  parent/supervisor不读正文。direct spawn后先验证runtime PID/path/code identity；feeder
  exact exit=0后parent才关闭EOF commit gate；
- exact approve 才 one-count-and-discard。helper 死在 count 后、receipt 前时 evidence
  的helperReceipt=`null/validated=false`，presence/handoff均写
  `unknown/null + observed=false`，不伪造0；
- receipt validator必须hash helper实际canonical stdout frame：exact UTF-8 JSON + one
  LF、bounded size、no trailing/stderr，并cross-check outer/helper terminal、presence、
  handoff、zeroization、cleanup与normal exit；不能hash parsed object再`JSON.stringify`；
- custom-Keychain/import/signing unsupported时Yellow、helper launch=0、no login/Data
  Protection fallback且cleanup必须Green；LA cancel/unavailable/ambiguous时Yellow，只有
  validated receipt才可声称handoff=0；
- cleanup uncertainty、signature/bundle drift、unexpected login/default/Data Protection/
  search-list explicit mutation或fallback、owned custom-Keychain residue、正文escape均Red。

Construction只构造closed typed plan、fake executor、process-death/fault matrix、receipt/
evidence validators和cleanup journal。Normal compiler/unit tests可在owned temp output
编译unsigned Swift；新的physical compile/assemble/sign/verify/launch port保持fake-only，
不assemble/sign/launch/retain `.app`，不创建certificate/Keychain，不调用LA，也不接
real provider/Guest/Room。

未来一次完整 physical clean run最多证明
`GREEN_TRANSIENT_MACOS_MECHANISM_ONLY`：exact-source helper在一台 host 的一次
synthetic run中被签名/绑定，经一次 user presence 显示 exact non-editable response、
在 helper 内 count-and-discard，并清除 owned signing/runtime resources。它不证明
provider/Guest/Room/publication E2E、persistent candidate、production Team ID/
notarization/Gatekeeper、helper Seatbelt、OS/power crash cleanup或 universal memory/swap
erasure；Full lane继续 `UNPROVEN_POST_DEMO`，aggregate继续 Yellow。

## 五项推荐的总效果

五项批准后，下一份 exact Packet只会请求：

- bounded read-only Host Binding；
- repo 内 unified runner / physical adapters / PostgreSQL race construction；
- repo 内对 public-pool origin filter 与 public-accept bucket lineage 的两项 exact、
  narrow Core migration SQL source correction；
- fake executors、normal compiler/unit tests、fault injection、static audits；
- local-only Host Binding Capsule 与 body-free public receipt；
- 新 Yellow Manifest、Report、machine evidence 和低负担 Owner Review；
- validation 后 commit/push、更新 Draft PR/GitHub，然后 STOP。

它不会运行 Docker/PostgreSQL或把SQL apply到任何database；也不会请求real Codex/
Seatbelt、app signing/launch、Keychain/LA、real Guest、email、Room mutation、provider/
network、Retry、First Provider Call、Gate C、deployment、public traffic、merge或spend。

## 推荐 Owner 回复

实际批准必须在外部回复中绑定冻结后的Brief SHA-256与proposal HEAD/tree。语义核心是：

```text
批准 R4 Gate B Physical Adapter + Host Binding Decision Brief 五项推荐；
只授权准备 exact Construction Packet；Host-Binding / Adapter Construction、
Retry Execution 与 First Provider-Call Test Grant 均 NOT_REQUESTED
```

这句话只会打开下一份文档准备，不会开始 Host Binding 或任何 physical effect。
