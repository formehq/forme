# R4 Gate B Execution Report — Red Stop

- Verdict: **RED — stopped and cleaned**
- Run: `gb_11bbff9ad7d2806c3c8948eed1538695`
- Approved Manifest:
  `sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa`
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Provider sessions / bytes / spend: **0 / 0 / US$0**
- Codex thread / turn starts: **0 / 0**
- Real Guest bytes / external messages / production writes / deploys / merges:
  **0 / 0 / 0 / 0 / 0**

## 口语结论

Gate B 没有继续跑完，也不能算通过。

在 Codex lane 的施工前调查中，一次本应只查冻结测试材料的只读 hash
搜索，把真实 Codex home 中的 session 文件也纳入了读取范围。输出没有包含
文件正文或凭据，也没有发生模型调用，但“读取真实 Codex home”本身就是本
轮明确禁止的动作。因此我们没有把它解释成小问题，而是按 Manifest 立即
判 Red、停止其余 lane 并清理。

这次 Red 说明的不是 Forme 产品机制失败，也不是 Codex 已被证明不可接入；
它说明当前 Gate B 执行编排没有把调查工具的读取范围物理锁得足够窄。

## 发生了什么

1. Manifest、package lock、Git/GitHub 基线和宿主版本 preflight 全部匹配。
2. 三个互不重叠的施工任务被并行准备。
3. Codex 任务在排查冻结 schema aggregate 时执行了范围过宽的只读搜索。
4. 真实 Codex session 文件进入读取范围；只返回路径，未返回正文或凭据。
5. 没有启动 Codex thread、turn、model、account 或 provider request。
6. Red stop 生效；PostgreSQL、加密、fake budget 和 macOS 等后续验证没有继续。
7. 所有未验证的部分施工文件被删除，临时资源被复核为 absent。

并行提前调查也意味着固定 lane 顺序没有得到完整执行。这个事实与读取范围
违规一起保留为 Red，而不是在事后补跑测试来掩盖。

## Lane 结果

| Lane | Verdict | 含义 |
|---|---|---|
| Preflight | Green | 批准对象、基线和宿主绑定匹配 |
| Gate A regression + protocol | Not run | Red 后禁止补跑 |
| API + local formats | Not run | 未验证的部分文件已删除 |
| PostgreSQL | Not run | 未创建 container、volume 或数据库 |
| Encrypted field | Not run | 未验证的部分文件已删除 |
| Fake budget + event fence | Not run | fake upstream calls 为 0 |
| Codex zero-call | **Red** | 真实 Codex home 进入只读搜索范围；正式 probe 未完成 |
| macOS physical boundary | Not run | 未 build、未签名、未建 Keychain、未请求 user presence |
| Cleanup | Green | 已证明临时资源和部分文件 absent |

`Not run` 不是 Yellow，也不是隐含通过；它只是 Red stop 后的诚实状态。

## Verification status

- Gate A full regression：`NOT_RUN_RED_STOP`
- Gate B static audit：`NOT_RUN_RED_STOP`
- 批准基线 `e215dd3` 的 GitHub CI：`SUCCESS`
- 本 Red report commit 的 CI：证据冻结时为 `PENDING_EXTERNAL`

Red 规则不允许在事件后补跑剩余 lane 来制造“整体看起来还是绿”的印象。
报告 commit 仍会经过 PR 的标准 repository CI；最终结果单独记录在 PR / Issue
收据中，不回写并循环改变这份执行证据。

## Cleanup proof

- 事件临时 schema root：absent
- Manifest run parent：absent
- 固定 PostgreSQL temp root：absent
- 固定 container / volume：absent / absent
- PostgreSQL image：未下载
- FormeLocal Gate B process：absent
- 临时 app / Keychain / signing identity：从未创建
- 未验证的 repo workset 文件：4 个，全部删除
- `package-lock.json`：保持批准时 hash，不变

清理证明只保留 boolean、计数与受控状态；没有保存搜索返回的真实路径、正文、
credential、环境值、prompt、transcript 或 raw tool output。

## 当前技术结论

Gate B 的数据库、加密、budget、Codex 和 macOS 地基仍然都**没有被证明**。
Native Harness AI lane 必须继续保持：

```text
manual_owner_only_available
```

目前不应该准备 First Provider-Call Test Grant。正确顺序应当是先获得一份新的
Gate B retry 授权，用严格串行执行、固定允许路径和显式拒绝 real Codex home
的 wrapper，重新得到一次干净的 zero-call 结果，然后再判断是否值得提出模型
调用提案。

## Owner return gate

本报告只关闭本次 Red execution attempt，不批准重试、Gate C 或任何 provider
call。下一步需要 Owner 在看到本报告后决定：是否准备一份范围更窄、修正执行
编排的 Gate B Retry Proposal。

机器可读证据：
[`docs/evidence/r4-gate-b-execution.json`](./evidence/r4-gate-b-execution.json)
