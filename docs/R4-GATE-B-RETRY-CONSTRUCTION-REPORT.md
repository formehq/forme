# R4 Gate B Retry Construction Report

- Status: **COMPLETE — OWNER RETURN GATE**
- Construction verdict: **YELLOW — reviewable repository construction; do not execute**
- Approved Construction Packet:
  `sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7`
- Retry Execution Grant: **NOT REQUESTED**
- First Provider-Call Test Grant: **NOT REQUESTED**
- Provider sessions / bytes / spend: **0 / 0 / US$0**
- Real Codex calls / thread starts / turn starts: **0 / 0 / 0**
- Docker commands / PostgreSQL processes: **0 / 0**
- Keychain operations / user-presence prompts / Seatbelt children: **0 / 0 / 0**

## 口语结论

这轮把 Gate B 的“施工图、零件和总开关”做出来了，而且所有允许在纯本地、
纯 fixture 条件下验证的东西都通过了。它没有重跑 Gate B，也没有碰真实 Codex、
Docker、PostgreSQL、Keychain、签名、弹窗或 Provider。

最终是 **Yellow，而不是 Green**。原因不是离线测试失败，而是总开关的三个真实
物理 lane 仍明确停在受控 Yellow：PostgreSQL 的真实并发 race、Codex 的
Seatbelt 包装、macOS 的签名 + 临时 Keychain + user presence 组合还没有成为一条
经过完整 review 的可执行 adapter。runner 没有用 synthetic 成功掩盖它们。

因此，这份结果适合继续设计和修正，但**不建议批准当前 Retry Execution**。

## Construction baseline

| Binding | Value |
|---|---|
| Commencement commit | `6e8bf486cdc76deeb702f176a72bd8af981567e6` |
| Commencement tree | `aded81af711db529305d261d98dc4e36139c95c2` |
| Implementation baseline | `3d3139798ae15e0f9ba267d157d6a84d2e8d0a98` |
| Implementation baseline tree | `8fab1cab971b70939414b15f2836284d06860bbd` |
| Final code checkpoint | `68e6515322e9d7c278c5bf08db0ea2b9b1df32eb` |
| Final code-checkpoint tree | `3e5136e7cf005f95a4ef4343277d8d3c1ec7b050` |
| `package-lock.json` | `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |
| Immutable hash index | 17 files; aggregate `sha256:94aa16f926fc13c1f5150e3deb8665d42738b25fd4be5f9dc99b77042e3c6cfc` |
| Execution-bearing constructed index | 50 files; aggregate `sha256:50e043df23f338e9798baa600d1cb78e245b925f5efd5958750e437a53f2f5c4` |

The containing documentation commit cannot self-bind its own Git object ID.
Its final commit/tree and this report/evidence SHA are returned at the Owner
gate after the immutable commit and push.

## Lane results

| Lane | Construction result | Evidence meaning |
|---|---|---|
| Preflight | Green | branch, baseline, immutables, package lock, offline dependencies and pinned toolchain matched |
| Gate A regression + protocol replay | Green | typechecks, 45 spine tests, 293 R4 tests, five journeys and static/doc audits passed |
| Path fence | Green | exact roots only; parent/sibling/absolute/symlink/hard-link/dynamic/fallback paths denied |
| API + local schemas | Green | 45 operations, 39 mutations, 6 reads, 31 expected-version operations and 25 local formats bound |
| Static SQL | Green | 37 tables, 44 domains, 3 composites, 60 functions, 11 views, 7 triggers, 48 indexes and 5 roles constructed; runtime deferred |
| Encrypted field | Green | AES-256-GCM, exact AAD, descriptor key, nonce reuse fence and terminal unreadability passed in memory |
| Fake budget + event fence | Green | exact three-dispatch budget, durable journal, completed-event selection and no retry/fallback passed |
| Fake-only Codex adapter | Green | four fixture invocations; real Codex/thread/turn/provider counts remained zero |
| Native source compile/unit | Green | Swift release compile, 8 native unit tests and 4 static native tests passed; no app launched |
| Aggregate runner dry-run | Green | exact nine-lane serial order, Yellow continuation, Red → `NOT_RUN`, cleanup-always and argument denial passed |
| Static workset/package audit | Green | 56/56 Gate B offline tests; no unlisted path, lock drift or generated output |
| Construction report + Execution Manifest | **Yellow** | artifacts are exact and reviewable, but current physical execution adapters are intentionally non-approvable |
| Cleanup | Green | construction Swift/fixture/aggregate temp children removed; final construction root removed before commit |

## Important controlled observations

- The frozen custom-file-Keychain design uses Apple's deprecated `SecKeychain`
  API. It compiles, but a future Secure Enclave composition may be unsupported;
  the code returns Yellow and never falls back to login/Data Protection Keychain.
- User-presence cancellation returns Yellow, not Red, and does not widen authority.
- The native process does not claim its own signature is valid; the aggregate
  runner must verify code signing and entitlements externally.
- The aggregate runner's synthetic Green proves orchestration only. Its current
  physical PostgreSQL, Codex/Seatbelt and macOS/signing branches return explicit
  Yellow codes rather than perform partial or unreviewed probes.
- One hash-index rendering command was initially quoted incorrectly, resulting
  only in controlled command-not-found output; it was corrected without a file,
  network, credential, or external-system effect.

## Verification summary

- Gate A baseline replay: **45/45 spine + 293/293 R4**
- Gate B construction suite: **56/56**, serial, external network denied
- Native tests: **8/8 Swift + 4/4 static**
- Aggregate dry-run: **4 scenarios + 6 denied argument cases**
- Document crosswalk: **47 rows**
- Body-free checkpoint commits before final report: **11**
- Unlisted workset paths: **0**
- Generated `.build`, `.swiftpm`, or runtime-evidence paths remaining: **0**
- Dependency additions / `package-lock.json` drift: **0 / no drift**

## Physical boundary limitation

The Seatbelt profile can constrain the future child Codex process. It does not
kernel-sandbox the desktop Agent controlling the run, because that Agent already
has broad filesystem permission. Safety therefore still depends on the Agent
invoking only the reviewed runner and doing no ad-hoc investigation. If the
Owner requires a physically enforced boundary for the controlling Agent, the
execution must move into a restricted workspace, container, VM, or filesystem
permission profile before any grant.

## Owner return gate

Machine evidence is in
[`docs/evidence/r4-gate-b-retry-construction.json`](./evidence/r4-gate-b-retry-construction.json).
The proposed execution boundary is in
[`docs/R4-GATE-B-RETRY-EXECUTION-MANIFEST.md`](./R4-GATE-B-RETRY-EXECUTION-MANIFEST.md).
The low-load review is in
[`docs/R4-GATE-B-RETRY-EXECUTION-OWNER-REVIEW.md`](./R4-GATE-B-RETRY-EXECUTION-OWNER-REVIEW.md).

This report stops at the Owner gate. It does not authorize Retry Execution,
First Provider Call, Gate C, deployment, public traffic, or merge.
