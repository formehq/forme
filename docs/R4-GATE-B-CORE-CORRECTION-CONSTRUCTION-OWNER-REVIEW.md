# R4 Gate B Core Correction Construction — 低认知负荷 Owner Review

- 状态：**等待 Owner 审批；尚未开始 Correction Construction**
- Exact Packet：
  [`R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md`](./R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md)
- Packet SHA-256：
  `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6`
- Proposal baseline commit：
  `f2b452aea3f299637022290264543d9ccd44a8e6`
- Proposal baseline tree：
  `5e9b6b8cdf766f26204b902508547b41621f21e7`
- Correction Construction Grant：**REQUESTED**
- Retry Execution Grant：**NOT REQUESTED**
- First Provider-Call Test Grant：**NOT REQUESTED**

本 Review 的 SHA-256 会在 bytes 冻结后由 `CONTROL.md` 和 Owner 对话回执从
文件外绑定，避免把自己的 hash 写进自己。

## 一句话

这次请求的不是“再跑 Gate B”，而是：**先把 Demo 真正需要的那一小段系统做成，
并把以后唯一允许接真机的三个 adapter 用假执行器测试好，然后停下来再给你看。**

我的推荐：**批准 Correction Construction；继续不批准真实 Retry 和第一次
Provider Call。**

## 你可以怎样理解这次施工

我们不再试图在 Demo 前一次证明整套最高架构，而是做一个诚实的 Core：

```text
Guest 看到 Forme Projection
  → 发一个 bounded knock
  → Owner/local 看到 Interaction
  → 本地准备并审阅一次回答
  → Guest 获得 Response / bounded continuation
  → revoke、quota、expiry、recovery 都是真的
```

但下一次零 Provider Retry 仍不是这条正文链的完整贯通。它会分别证明：

1. PostgreSQL 里的 Room/Interaction/Grant/Response 语义真的成立；
2. 真实 Codex 能在零模型调用处被安全启动、限制和清理；
3. signed helper 能在用户确认后审阅一个 synthetic candidate，并在 helper
   内部只做一次 count-and-discard。

`candidate → server publication` 的真实正文 handoff 仍没有被批准或实现，不能用
三项分别 Green 冒充完整 E2E。它要留给之后的 Provider/connector gate。

## 三块具体会造什么

### 1. PostgreSQL Core

- active surface 从 Full 45 项收成 32 项，Web/API/CLI 一起收；
- 被移出的 13 项不会显示、不会返回占位 `503`，而是 pre-parse `404`；
- 32 个真实 API SQL function，加 1 个固定 synthetic setup function 和 6 个
  invariant helper；
- 13 组真实并发 race 计划，以及独立的 event/ACK 语义测试；
- Gate B 只使用固定 synthetic Controller、Curator、Third Place 和 Forme Entity，
  不假装已经有 production identity/onboarding。

Private Room、notification email、Agent derivative、Direct Invite、Room retirement、
production Web→PostgreSQL wiring 仍在 Full/Gate C。

### 2. Codex zero-call boundary

- 新建一份只给 version/help/schema/initialize 使用的 diagnostic Seatbelt profile；
- Construction 只运行 temp-root fake Codex/fake wrapper；
- 不读取或运行真实 Codex，不调用 `/usr/bin/sandbox-exec`；
- 未来即使真实 zero-call 全部干净，也只表示 child mechanism Green；AI lane 和
  aggregate Retry 仍是 Yellow/manual-only。

原因很简单：initialize 可以证明“门和围栏”，不能证明模型真正看到的 tool/source
边界，也没有发生 Provider Call。

### 3. Transient Candidate macOS helper

- 单独的 `FormeCoreLocal` target，不复用旧 persistent Keychain/Secure Enclave
  launcher；
- candidate 第一个 byte 读入前就进入 locked buffer；
- 使用冻结的完整 `ResponseCandidateV1`，一次 user presence、一次 noneditable
  review；
- Retry 中批准后只在 helper 内 count-and-discard，candidate body 不交给 Desktop
  Agent、不落盘；
- cancel、expiry、controlled failure 后丢弃；helper crash 只承诺不可恢复，不假装
 证明所有系统内存已经逐 byte 擦除。

临时 custom-file Keychain 只测试签名 identity 和 synthetic Room binding。如果本机
不支持这套机制，结果是 Yellow、zero launch、无 login/Data Protection Keychain
fallback；不会为了得到 Green 临场放宽。

## 这次批准后会真实发生什么

一个 primary Agent 串行完成：

1. 生成独立 Core schema/index/SQL；
2. 实现 32 项 Core 语义与 active Web/API/CLI cut；
3. 构建 PostgreSQL、Codex、macOS 三个 closed adapter；
4. 只用 fake executor、synthetic fixture、unsigned Swift compile/unit test 验证；
5. 跑 Gate A 和 Full regression，Full assertion 不能删、跳过或降级；
6. 生成 body-free Construction Report 和一份新的 exact Execution Manifest；
7. commit、push、更新 Draft PR，然后停止回来。

## 这次绝不会发生什么

| 动作 | 本次上限 |
|---|---:|
| Docker / PostgreSQL process / SQL execution | 0 / 0 / 0 |
| 真实 Codex / `sandbox-exec` | 0 / 0 |
| Codex thread / turn / provider call | 0 / 0 / 0 |
| Provider bytes / spend | 0 / US$0 |
| signed app / certificate / Keychain / user-presence prompt | 0 / 0 / 0 / 0 |
| candidate body handoff 到 helper 外 | 0 |
| real Guest / email / production mutation | 0 / 0 / 0 |
| deploy / public traffic / merge | 不允许 |

标准 compiler/test 子进程和 temp-root 内 exact fake Codex fixture 是 Construction
测试的一部分；它们不是一次真实 runtime probe。

## 你真正需要判断的五件事

1. 接受 Demo 先做 32-operation public Hero Core，Full target 保留但不冒充完成吗？
2. 接受下一次 Retry 只分别证明三个 physical mechanism，不冒充正文 E2E 吗？
3. 接受 persistent candidate/restart recovery 延后，MVP 先用 transient review 吗？
4. 接受 custom Keychain 或 host 能力不支持时诚实停 Yellow，而不 fallback 吗？
5. 接受这次仍只造和测试机器，真实本机效果以后再批准吗？

我的推荐答案：**五项都接受。**

## 批准后的停止点

Construction 只能返回：

- `CORE_CONSTRUCTED_OFFLINE`：代码、fake adapters、tests、evidence 和 cleanup
  都成立；
- Yellow：代码可审，但某条未来物理边界不够可靠；
- Red：越界、依赖漂移、真实 runtime、敏感 evidence 或 cleanup 失败。

无论哪一种都会回来。Green 也不会自动开始 Docker、真实 Codex、Keychain、
Retry Execution 或 Provider Call。

## 推荐批准文本

本文件冻结后，Owner 对话会给出同时包含 Packet SHA、Owner Review SHA 和 proposal
HEAD/tree 的 exact 文本。其授权结尾必须保持：

```text
Correction Construction Grant APPROVED；Retry Execution Grant NOT REQUESTED；First Provider-Call Test Grant NOT REQUESTED
```

