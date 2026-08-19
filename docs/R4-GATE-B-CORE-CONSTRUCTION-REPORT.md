# R4 Gate B Core Correction Construction Report

- Verdict: **YELLOW — REPOSITORY REVIEWABLE**
- Finished: 2026-08-07
- Correction Construction Grant: **APPROVED AND CONSUMED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Provider sessions / bytes / spend: **0 / 0 / US$0**

## 一句话

这一轮把 Core-32 产品表面和 PostgreSQL、Codex、macOS 三条离线机制做成了
可测试的仓库代码，也修掉了几处会造成误判或不完整清理的问题；但现在还没有
一台闭合的“真实执行机器”，所以结果是 **可审查的 Yellow**，不是
`CORE_CONSTRUCTED_OFFLINE`，也不建议直接批准 Retry。

## 已经完成的部分

1. **Core-32 产品表面**：Web、HTTP API 和 CLI 共用 32 个动作（26 mutation、
   6 read、21 个 exact-version mutation）。13 个 Full-only 动作会在 body/auth
   解析前统一 body-free `404`，不会以假能力出现在当前 Core。
2. **PostgreSQL 静态合同**：37 tables、44 domains、3 composites、11 views、
   39 functions；六个 lineage 值由唯一 stdin composer 绑定，basis 只能经
   migrate-only function 安装，setup 的 NULL/context drift fail closed。
   image/platform、`postgres` user、readiness 与 observation validator 也已冻结。
3. **Codex zero-call 机制**：273-file schema inventory 和 result validator 会在
   initialize child 产生前冻结，退出后再复核 inventory；每行 JSONL 在线验证。
   response 前的异常最多只有第一次写；response 后新 chunk 才出现的异常会立即
   stop/cleanup，但可能已经发生第二次 `initialized` 写。deadline → `SIGTERM` →
   bounded `SIGKILL`，只有确认 process group 消失后才从 cleanup journal 移除。
4. **macOS transient helper**：候选正文先进入已锁定的 32 KiB buffer，再解析和
   exact review；JSON escape/Unicode 语义与冻结的 `ResponseCandidateV1`
   对齐；不把正文 materialize 成普通 Swift `String`。helper receipt、最终
   physical evidence、pre-sign bundle 与 post-sign codesign metadata 已分开。
5. **Aggregate dry run**：9 个串行 lane、16 个 injected-fault case、Red stop、
   cleanup-always、body-free checkpoint 与 AI lane closed 均通过 fake-only 检查。

## 为什么仍然是 Yellow

| 尚未闭合的边界 | 当前影响 |
|---|---|
| 13 组 PostgreSQL race 的 exact A/B worker stdin 与 26 份 persisted-state verifier | race artifact 仍是执行说明，不能冒充真实并发计划 |
| host binding、统一 Core physical runner 与 Codex post-response wire finality | 只读绑定路径/hash 后仍没有一条可以直接批准的真实执行入口；也不能预知未来 chunk |
| macOS signed-helper physical executor | 还不能自动完成 assemble/sign/verify/launch/receipt/cleanup |

这三项是 Construction 缺口，不只是“还没在本机跑”。因此本报告明确不把
fake executor 或静态测试升级成物理 Green。

## 验证结果

| 检查 | 结果 |
|---|---:|
| Node tests | 381 passed |
| Swift tests | 19 passed（8 historical Full + 11 Core） |
| TypeScript checks | passed |
| Core dedicated tests | 43 passed |
| Core aggregate lanes / injected faults | 9 / 16 |
| Evidence-hashed construction files | 71 |
| Core artifacts | 18 |
| `package-lock.json` | byte-identical |
| Construction temp root / fake children | absent / absent |

历史 Full Swift target 仍有一条既有的 `SecKeychainOpen` deprecated warning；
它来自未改动的 Full experiment，不是 Core helper 的新依赖。

## 冻结证据

| Artifact | Exact value |
|---|---|
| Approved Construction Packet | `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6` |
| Approved Construction Owner Review | `sha256:2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299` |
| Approved proposal HEAD / tree | `5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e` / `15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f` |
| Machine evidence | `sha256:8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09` |
| 71-file construction aggregate | `sha256:f4bd00354f1c7cd330b421faec735efb83c4f0efbc5f18eabc39923b11d1733d` |
| Core artifact count / aggregate | `18` / `sha256:176005479f74570d872dbfa47ea50acdf2cdf46bdace101b9bf010dfeac9bb66` |
| Immutable Full artifact count / aggregate | `8` / `sha256:f290ba035efa2eb84d899bf67d4ffb03c523d88556ce96b66f4f3a2862159310` |
| Execution Manifest candidate | `sha256:f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74` |
| `package-lock.json` | `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |

Machine-readable detail is in
[`evidence/r4-gate-b-core-construction.json`](./evidence/r4-gate-b-core-construction.json).

## 这一轮明确没有做

- 没有运行 Docker/PostgreSQL、真实 Codex、`sandbox-exec` 或 provider。
- 没有 assemble/sign/launch app，没有 Keychain、LocalAuthentication 或
  Secure Enclave 动作。
- 没有 candidate → publication 正文 bridge、Web → PostgreSQL deployment
  wiring、真实 Guest、邮件、网络、部署或 merge。
- 没有把 persistent candidate / restart recovery、Full-45、Gate C 或整个
  Gate B 声称为 Green。

## 推荐的下一步

不要批准当前 Manifest 的 Retry。下一步应先准备一份单独的
**R4 Gate B Physical Adapter + Host Binding Construction Packet**，只授权：

1. 只读绑定 Docker、Codex 和 macOS tool/package identities；
2. 仓库内补齐统一 physical runner 与 macOS executor，并用 fake 验证；
3. 为 Codex post-response wire finality 选择可证明的策略，否则保留 Yellow；并
   补齐 macOS helper-death / provider-child 区分矩阵；
4. 补齐 13 组 race 的 exact worker bytes 和 persisted-state verifiers；以及
5. 产出一份新的、真正可执行的 Manifest 与低认知负荷 Owner Review。

它仍不授权真实 Docker/Codex/macOS effect、Retry、Provider Call、部署、public
traffic、merge 或 spend。
