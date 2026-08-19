# R4 Gate B Core Execution — Owner Review

- Review type: **NON-APPROVABLE YELLOW**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Gate C / deploy / public traffic / merge / spend: **NOT_REQUESTED**

## 先说结论

这一轮值得保留，但**现在不要批准 Retry**。

我们已经把 Core-32 和三条离线机制做成了可以审查、可以测试的仓库代码；不过
系统还没有一条闭合的真实执行入口，所以现在最准确的状态是：

> 设计和离线施工明显前进了；真实试跑还没准备好。

这份 Review 只帮助 Owner 理解结果，不请求任何执行授权。

## 你可以把现在理解成什么

- **产品壳已经对齐**：Web、API、CLI 都只暴露当前 MVP 需要的 32 个动作。
- **三个部件已有离线样机**：PostgreSQL、Codex、macOS 都有合同、fake adapter
  和失败测试。
- **还缺装配线**：这些部件尚未由一台 host-bound physical runner 串成可安全
  执行的一次 Retry。

## 为什么不是 Green

1. PostgreSQL 的 13 组 race 仍缺 exact A/B worker bytes 和 persisted-state
   verifier；现在只有诚实的执行说明。
2. Docker、Codex 和 macOS 还没有统一 physical runner，也没有绑定本机 exact
   tool/package identity。
3. macOS 还缺 signed-helper executor，以及 helper-death / provider-child 的剩余
   离线区分矩阵。
4. Codex 有一个必须保留的因果边界：如果合法 response 已经到达并触发
   `initialized`，未知消息随后才从新的 chunk 到达，系统可以立即终止并清理，
   但不可能事先知道未来 chunk。原 Packet 中“所有 invalid wire 都最多一次写”
   的绝对表述在异步流上不可实现；当前实现把 response 前异常冻结为最多一次写，
   response 后异常冻结为最多两次写、异常出现后零次新增写，并保持 Yellow。

## 本次证据绑定

| Artifact | Exact value |
|---|---|
| Approved Construction Packet | `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6` |
| Approved Construction Owner Review | `sha256:2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299` |
| Approved proposal HEAD / tree | `5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e` / `15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f` |
| Construction implementation commit / tree | `2b0b0cf4dedccec3781470ee8fc51ea3fff1254b` / `069458f059b9a15e63cb9ef72ca62192e7b68b15` |
| Construction Report | `sha256:4369c5bf7f95e805b440c47a5d2908b091d74c14ab0b322a39d663978c570f40` |
| Machine evidence | `sha256:8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09` |
| Non-approvable Execution Manifest | `sha256:f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74` |

验证结果是 381 个 Node tests、19 个 Swift tests、TypeScript passed；真实
Docker/PostgreSQL/Codex/Seatbelt/signing/Keychain/LocalAuthentication/provider/network
effect 都是 0。Construction temp root 和 fake children 已清理。

## 推荐的下一步

当前只推荐一件事：另行准备并审查一份
**R4 Gate B Physical Adapter + Host Binding Construction Packet**。

它应先补齐 physical runner、race worker/verifier、Codex post-response 策略和
macOS executor，再返回一份新的 exact Manifest。只有那一轮通过后，才值得讨论
是否批准一次 zero-provider Retry。

当前无需、也不应从本 Review 推导出 Retry、Provider Call、部署或 merge 权限。
