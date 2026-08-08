# R4 Gate B Host Binding Reattempt Preparation — Owner Review

- Status: **PROPOSAL — waiting for exact Owner approval**
- Exact Preparation Packet:
  `sha256:8eec14754d4b91275c0772e5b6d2b10c6b69de921735b9669dd86497a34b13e0`
- Host Binding Reattempt Preparation Grant: **REQUESTED; NOT YET APPROVED**
- Host Binding Attempt Grant: **NOT_REQUESTED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**

## 一句话结论

推荐批准“先造一张新的、只属于当前代码的插头身份证”，但现在不要再次读取 Host
input，也不要运行 Host Binding。

旧 Host Binding 不能直接重按：它的一次性授权已经消费，临时 checkpoint 已清理，
而 C-layer 又改变了 runner 字节。如果复用旧 authority，就会把新代码伪装成旧代码
的观察结果。

## 为什么拆成两道门

```text
Gate P（本次提案）
  只改窄 workset、跑 fake/offline 测试、冻结新代码 J、产生新 checkpoint
  再用 J 的单父输出提交 M 发布 evidence + Attempt Manifest/Review
  Host input 完全不碰，是否存在也不观察
  ↓ STOP，交还 Owner

Gate H（未来另行批准）
  Owner 同时审核 J、M、checkpoint、evidence 和 Attempt Manifest/Review
  准备新的 fixed input
  只允许一次 read-only Host Binding
  ↓ STOP，仍不自动 Retry
```

这样 Owner 在任何真实 Host inspection 发生前，能先看到最终 executable bytes、测试、
checkpoint 和独立审计。Preparation Green 不会自动升级成 Host Binding authority。

## 历史事实保持原样

| 项目 | Exact value |
| --- | --- |
| Historical implementation I / tree | `92c6c3f8896494aed699671a04a93a09fb59087d` / `cf2ce5567c601fff1ad709e565dde41cf9c3540d` |
| Historical output R / tree | `63ae16940faf17694152cffa12848e62c2933c52` / `ebfd96e7c1003c076d417798e53430891f60f057` |
| Final portability C / tree | `383bf00611eaf180d4146f75e294deca49a4d5b1` / `3b2ef06165975d2fad1e781aedbe04b91af49287` |
| R2 preparation basis / tree | `3c5ea06b9e8d0813e7d49c115005e1d5efea2d75` / `98d605f0db2260542f649f4dc6582ea3dffbe56a` |
| Historical machine evidence | `sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e` |

旧结果仍是：Host attempt `1`、terminal `HOST_BOUND_PATH_SYMLINKED`、inspectors
`0 / 0 / 0`、cleanup Green、无 capsule/public receipt、无 Retry/provider effect。
它不会被重新绑定到 C 或未来 J。

当前权威 CI 实际为 45 Spine + 293 R4 + 131 Gate-B Core = 469 tests。历史 I 的
468-test evidence 仍正确；R2 Report 中当前 C 的 130/468 是少计一个新测试的文案误差，
不是 Host 或产品结论变化。

## 本次批准会允许什么

只允许在 14 个精确实现/测试路径内增加独立 v2 reattempt authority、checkpoint、
capsule、receipt 和 evidence contract，并跑 denied-network fake/offline 验证。然后冻结
新 implementation J；其单父 output commit M 只能写三份 body-free
evidence/Manifest/Review和五份导航文档，然后 push Draft PR，STOP。

Preparation 阶段明确要求：

- fixed Host input 不被 stat/open/read，presence/absence 保持 unobserved；
- Docker CLI/socket/macOS inspector starts 为 `0 / 0 / 0`；
- 不运行 Docker/PostgreSQL、real Codex、signing、Keychain、LA 或 provider；
- 不创建 capsule/public receipt；
- 不部署、不 merge、不产生 public traffic 或 spend。

## 未来一次 Host Binding 的边界

这份 Review 不批准它，只把边界提前写清：未来必须由另一个 Owner 回执同时绑定
P/J/M 的 head/tree、checkpoint、preparation evidence、Attempt Manifest/Review 和恰好
三份无 Blocker/Important 的审计。Owner 另行准备新的 v2 mode-0600 envelope，里面
只有三个 canonical、非 symlink 的绝对路径。Agent不搜索、不猜、不 fallback、不打印。

完整成功才允许 3 次 Docker CLI、2 次本地 Unix-socket request、9 次 macOS read-only
inspection，并产生一个最多72小时的本机 capsule和一份body/path-free public receipt。
任何不支持或 drift 都停止并清理，不自动重试。成功仍然只是 Yellow/Retry-ready，
不是 Retry，更不是 R4 Done。

历史 Host attempt count 是 `1`。未来 Gate H 最多再增加 `1` 次，累计 ceiling=`2`；
durable `input-open-intent` 一旦写下，即使 controller 随后 crash 也算消耗。任何
pre-input terminal同样 STOP并重新交还Owner，不会自动再按一次。

## 我的建议

批准这份 Preparation Packet 与 Review，先完成 Gate P。等 J 和 Attempt Manifest 返回
后，再决定是否准备新 input 并批准一次 Gate H。

不要在本次回执里提供三个 path，也不要批准 Retry 或 provider call。

## 推荐批准格式

提交冻结后，请使用 Agent 返回的 exact values：

```text
批准 R4 Gate B Host Binding Reattempt Preparation Packet v0.1
sha256:<exact-packet-sha>；批准 Owner Review sha256:<exact-review-sha>；
Proposal HEAD <exact-proposal-head> tree <exact-proposal-tree>；
Host Binding Reattempt Preparation Grant APPROVED；
Host Binding Attempt Grant NOT_REQUESTED；
Retry Execution Grant NOT_REQUESTED；
First Provider-Call Test Grant NOT_REQUESTED。
```
