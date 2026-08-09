# R4 Gate B Host Binding Reattempt Envelope v0.2 — Owner Review

- Status: **PROPOSAL — waiting for exact Owner approval**
- Exact Envelope:
  `sha256:ee713295af27577edadeeca8c5188d492acec12816ab4e5cf4488f1f6146daf3`
- Host Binding Reattempt Preparation Grant: **REQUESTED; NOT YET APPROVED**
- Host Binding Attempt Grant: **NOT_REQUESTED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**

## 一句话结论

推荐批准这份精简 Envelope：它允许 Agent 在固定的 12 个代码/schema/test
路径内自主完成当前代码的 rebind 准备，但最终代码 `J` 出现后必须停下来。你只需看一张
不含私密路径的 Activation Card，再决定是否激活一次 read-only Host Binding。

它不批准 Host inspection、Retry、provider、部署或 merge。

## 为什么不是直接重跑旧代码

旧 Construction/Host grant 已经消费，旧 checkpoint 也已清理。历史 `I` 的唯一 Host
attempt 在 symlink 检查处结束；它只能证明旧 `I`，不能证明修过 CI portability 的当前
代码 `C`。把新观察写进旧 authority 会造成证据重绑定。

所以这次必须有独立 v2 run/checkpoint/attempt identity，但不需要建设完整的通用认证
平台。

## 相比未批准 v0.1 删掉了什么

未批准的 v0.1 proposal `b160d03…` 从未产生 authority。本 v0.2 删除：

- Gate-P 输出提交 `M`；
- pre-attempt Manifest/Owner Review 和 tracked preparation evidence；
- README、CONTROL、ROADMAP、DECISIONS 等五份提前状态更新；
- `runtime-boundary.json` 与 schema README 修改；
- 第三份独立审计；
- `J` 与 `M` 间重复 Git-object revalidation。

Gate P 最后只留下 `J`、本地 authenticated checkpoint 和一张 canonical
body/path-free Activation Card。Host 结束后再单独更新真实结果文档。

## 没有删掉的安全边界

- 旧 grant、run ID、checkpoint、input、capsule 和 receipt 永不复用；
- P2、`C/R2`、`J`、runtime、validation 和两份审计精确绑定；
- Gate P 期间 fixed Host input 不 stat/open/read/remove，存在性保持 unobserved；
- `J` 冻结后才产生 checkpoint 和 Activation Card；
- 你激活 exact Card 前，Host inspector 不可运行；
- input 只有三个 canonical、非 symlink 的绝对路径，mode `0600`，不搜索、不猜、
  不 fallback、不打印；
- durable `input-open-intent` 后即消费 attempt 2，crash 也不自动重试；
- input 首次 stat/open 前会 O_EXCL 写入独立、body-free 的 consumed-attempt
  tombstone；任何终态都永久保留它，P2 没有 purge 路径，不能靠清理或 retention
  重新获得 attempt 2；
- complete success ceiling 仍是 Docker CLI/socket/macOS `3 / 2 / 9`；
- Docker mutation、credentials、real Codex、sandbox、signing、Keychain、LA、provider、
  external network 全部为 `0`；
- no-follow、no-clobber、identity-bound journal、zeroization、cleanup-always 和
  Red-quarantine 保持；
- Host 的任何终态都 STOP；Retry/provider 仍需以后新的 Owner 决定。

## 两次真正需要你的地方

### 1. 现在：批准稳定 Envelope

这一次决定“可以改什么、必须证明什么、绝对不能做什么”。批准后，Agent 可在 workset
内实现、测试、修复审计问题，不再逐项请示。

```text
P2 approval
  -> implement/fix/test/audit J autonomously
  -> authenticated checkpoint + Activation Card
  -> WAITING_OWNER_ACTIVATION
```

### 2. 以后：激活一张具体 Card

Card 用一页以内的人话和机器字段告诉你：最终 `J` 是什么、改了哪些路径、验证与两份
审计是否 Green、Host ceiling 是什么、input 是否仍未触碰。Card 由 checkpoint
确定性重建；验证和审计则提供受 schema 约束的 body-free receipt，而不是三个裸哈希。
你只需决定是否放行这一张 Card 的一次只读检查。

如果 `J` 任一字节、checkpoint、validation 或审计变化，旧 Card 自动失效。你不是重新
审一遍 Packet，只是在最终 executable bytes 可见后释放一次 latch。

## 历史事实保持不变

| 项目 | 事实 |
| --- | --- |
| Historical `I` / tree | `92c6c3f8896494aed699671a04a93a09fb59087d` / `cf2ce5567c601fff1ad709e565dde41cf9c3540d` |
| Historical `R` / tree | `63ae16940faf17694152cffa12848e62c2933c52` / `ebfd96e7c1003c076d417798e53430891f60f057` |
| Final `C` / tree | `383bf00611eaf180d4146f75e294deca49a4d5b1` / `3b2ef06165975d2fad1e781aedbe04b91af49287` |
| `R2` / tree | `3c5ea06b9e8d0813e7d49c115005e1d5efea2d75` / `98d605f0db2260542f649f4dc6582ea3dffbe56a` |
| Historical evidence | `sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e` |
| Historical attempt | ordinal 1; `HOST_BOUND_PATH_SYMLINKED`; inspectors `0/0/0`; cleanup Green |
| Current code | 469 offline tests; explicitly not Host-bound |

无 capsule/public receipt，无 Retry/provider effect。v0.2 不改写历史 attempt 1，也不把它
重新绑定到 `C`、`R2` 或未来 `J`。

## 时间与预期结果

保守预计 Gate P 的实现、完整回归和两份审计需要约 2–4 个专注工作日；如果没有新的
边界缺口会更快。Gate H 本身是分钟级只读检查。

Gate H Green 的状态仍是 `HOST_BOUND_YELLOW / WAITING_RETRY_APPROVAL`。产品下一步才是
单独决定是否运行 Retry 和一次真实 Codex/provider path；R4 仍需真实 public knock →
reviewed response → continuation 才能 Owner-accepted。

## 现在建议批准什么

冻结 P2 commit 后，使用 Agent 返回的 exact HEAD/tree 和 Review hash：

```text
批准 R4 Gate B Host Binding Reattempt Envelope v0.2
sha256:ee713295af27577edadeeca8c5188d492acec12816ab4e5cf4488f1f6146daf3；
批准 Owner Review sha256:<exact-review-sha>；
Proposal P2 <head> tree <tree>；
Host Binding Reattempt Preparation Grant APPROVED；
Host Binding Attempt Grant NOT_REQUESTED；
Retry Execution Grant NOT_REQUESTED；
First Provider-Call Test Grant NOT_REQUESTED。
```

不要在这条批准里提供三个 Host path。未来 Activation Card 的一句话激活格式是：

```text
激活 Host Activation Card sha256:<card>，Implementation J <head> tree <tree>；
只允许 attemptOrdinal=2 的一次 read-only Host Binding；
Host Binding reattempt input v2 已由 Owner 准备完成；
Host Binding Attempt Grant APPROVED_ONCE；
Retry Execution 与 First Provider-Call Test 仍 NOT_REQUESTED。
```
