# R4 Gate B Retry Construction — 低认知负荷 Owner Review

- 状态：**等待 Owner 审批；尚未开始 Retry Construction**
- Retry Construction Packet：
  [`R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md`](./R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md)
- Packet SHA-256：
  `sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7`
- Retry Execution Grant：**NOT REQUESTED**
- First Provider-Call Test Grant：**NOT REQUESTED**

## 一句话结论

这次不是重新运行 Gate B，而是先把“未来唯一允许运行的机器”造好、测试好、
冻结 hash，再回来给你看。

我的推荐：**批准 Retry Construction；继续不批准 Retry Execution 和第一次
模型调用。**

## 为什么不能直接再跑一次

上一次的问题不是 Codex 回答错了，也不是数据库失败了。问题发生在施工过程：
Agent 在 runner 还不存在时，为调查一个 hash 差异扩大了文件搜索范围，读到了
真实 Codex home。虽然没有输出正文或凭据、没有模型调用，但已经违反边界。

如果我们只说“下次小心”，实际上没有改变系统。修正后的结构是：

```text
现在批准：Construction
只写代码、fixture、测试和总 runner
禁止真实 Codex / Docker / Keychain / 网络 probe
               ↓
回来给你一份所有文件都带 hash 的 Execution Manifest
               ↓
以后另行决定：Execution
只准运行一个审计过的总命令，不准临场调查
               ↓
更以后才可能讨论：第一次 Provider Call
```

## 你批准后会发生什么

一个 primary Agent 按固定顺序工作，不把实现或调查分给 subagent：

1. 先跑现有 Gate A 回归，确认基线没坏；
2. 先做 path fence，证明搜索只能落在 repo allowlist 和 synthetic temp root；
3. 构建 API/local schema、SQL、加密、fake budget、Codex adapter 和 macOS
   source；
4. Codex adapter 只对 fake executable 和静态 fixture 测试；
5. macOS 只编译和跑 unit test，不签名、不建 Keychain、不弹确认窗口；
6. 构建一个 aggregate runner，并且只以 dry-run/synthetic 模式测试；
7. 冻结所有实现 hash，生成另一份 Retry Execution Manifest；
8. commit、push、更新 Draft PR，然后停止回来。

这会让我们知道“即将运行什么”，但不会运行真实地基。

## 这次明确不会发生什么

| 动作 | 本次上限 |
|---|---:|
| 真实 Codex executable 调用 | 0 |
| Codex thread / turn | 0 / 0 |
| 新的 code-under-test provider session | 0 |
| Provider bytes / spend | 0 / US$0 |
| Docker / image / container / volume | 0 |
| PostgreSQL process / SQL execution | 0 / 0 |
| 签名 app / certificate / Keychain | 0 / 0 / 0 |
| user-presence prompt | 0 |
| 真实 Guest / email | 0 / 0 |
| hosted / production / deploy / public traffic | 0 |
| merge | 不允许 |

Git/GitHub push 和 Draft PR 状态同步只在施工完成后发生。标准 CI 不是 Forme
runtime probe。

## 一个需要诚实保留的限制

未来的 child Codex 可以被 Seatbelt 限制，但当前 Codex Desktop Agent 本身拥有
较宽的本地文件权限。我们不能用一个 child sandbox 假装主 Agent 也被内核
隔离了。

这次 Construction 的修正办法是：禁止 subagent、禁止 repo 外搜索、完全不
运行真实 probe。未来 Execution 的修正办法是：Agent 只能启动一个已经审计、
hash 固定的总 runner；失败后只能 cleanup 然后停止，不能临场搜索。

如果你要求主 Agent 自身也必须有 kernel-enforced 文件隔离，那么未来
Execution 还需要进入受限 workspace/container/permission profile。Construction
会把这个限制原样写进下一份 Review，不会声称已经解决。

## 你真正需要判断的四件事

1. 接受把“造 runner”和“运行 runner”拆成两次独立批准吗？
2. 接受 Construction 更慢一点，但只用一个 primary Agent 严格串行吗？
3. 接受这轮即使 Green，也不会自动碰 Docker、Codex 或 Keychain 吗？
4. 接受未来 Execution Review 必须再次呈现主 Agent 物理隔离的真实限制吗？

我的推荐答案：**四项都接受。**

## 批准后的停止点

Construction 最终只能返回：

- Green：runner、path fence、offline tests、hash index 和 cleanup 都成立；
- Yellow：代码可审，但未来执行的物理边界还不足，不推荐 Execution；
- Red：发生外部读取、真实 runtime 调用、网络、workset 漂移或清理不确定，
  立即停。

无论哪一种，都必须先回来。Green 也不会自动获得 Retry Execution Grant。

## 推荐批准文本

如果以上符合你的判断，下一条可以直接使用：

```text
批准 R4 Gate B Retry Construction Packet v0.1 sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7；Retry Execution Grant NOT REQUESTED；First Provider-Call Test Grant NOT REQUESTED
```

这句话只批准 repo-only Construction、offline/synthetic tests、Draft PR
维护和下一份 Execution Manifest 的准备。它不批准 Docker、真实 Codex、
Keychain、PostgreSQL execution、Retry Execution、Gate C、provider call、真实
Guest/email、部署、生产修改、merge 或 spend。
