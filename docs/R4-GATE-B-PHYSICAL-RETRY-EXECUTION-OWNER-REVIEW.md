# R4 Gate B Physical Retry Execution — Owner Review

- Review type: **NON-APPROVABLE YELLOW**
- Host-Binding / Adapter Construction Grant: **APPROVED AND CONSUMED ONCE**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Recommendation: **do not approve or execute Retry from this return**

## 先说结论

这次 Construction 值得保留：最终 implementation `I` 已完成 fake-only 施工、
完整验证和三份独立 committed-byte 审计。但唯一一次 Host Binding 在任何 inspector
启动前发现 Owner 输入所绑定的路径是符号链接，因此按合同停止为
`HOST_BOUND_PATH_SYMLINKED`。

这不是可忽略的小配置问题，也不能靠 Agent 搜索或换路径绕过。输入已清零并删除，
cleanup 是 Green；没有 capsule、没有 public receipt、没有 Retry，也没有 provider
call。因此当前 Manifest 是一份**不可批准的 Yellow 记录**，不是执行请求。

## 已经闭合的部分

- Phase A 在 48 个批准路径内完成，最终 `I`/tree 为
  `92c6c3f8896494aed699671a04a93a09fb59087d` /
  `cf2ce5567c601fff1ad709e565dde41cf9c3540d`。
- 54 个测试文件中的 468 个测试通过；其中 physical runner 49 个、Host Binding
  16 个。两次正常 compiler start 与 72,989 次 fake child observation 都在批准的
  Construction 边界内。
- PostgreSQL、Codex 与 macOS 三份 committed-byte 审计均为 PASS，0 Blocker、
  0 Important。
- 两项批准的 PostgreSQL SQL 解释已施工：anonymous/public pending cap 排除 Owner
  Grant；public accept 的 3/day 限制使用 Encounter 签发时继承的真实 edge bucket。
- Codex 仍诚实保留 post-response future-chunk 因果限制；macOS 仍只声明 transient
  direct-helper mechanism，并披露 synthetic CLI-signing exposure。

## 唯一 Host Binding 的结果

| 项目 | 结果 |
| --- | --- |
| Host Binding attempts | `1`（不可重试） |
| Terminal | `HOST_BOUND_PATH_SYMLINKED` |
| Docker CLI / Unix socket / macOS inspector starts | `0 / 0 / 0` |
| Input / Construction root / journal / fake process groups | absent / absent / absent / absent |
| Cleanup | `GREEN` |
| Local capsule / tracked public receipt | none / none |
| PostgreSQL / real Codex / signing / Keychain / LA / helper / provider effects | `0` |

本 Review 不复述任何 Owner-supplied path、主机身份或私有 inventory。

## 精确证据绑定

| Artifact | Exact value |
| --- | --- |
| Approved Construction Packet | `sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06` |
| Approved Construction Owner Review | `sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9` |
| Approved proposal HEAD / tree | `a45ea061e8e92f247597787e36ecfe52740b216a` / `89b28903fc34e985a17e8f3fdc4bfd7d0972880e` |
| Final implementation I / tree | `92c6c3f8896494aed699671a04a93a09fb59087d` / `cf2ce5567c601fff1ad709e565dde41cf9c3540d` |
| Construction checkpoint | `sha256:284b7b5eebc46167a75fc8ba4dc3b68be15ec4c7905af7f943d7e2639e78dded` |
| Validation aggregate | `sha256:0c592035cabb53a744f066ea200b775aeba99330eb103171234495e6320837fd` |
| PostgreSQL audit receipt | `sha256:11d077f2c88fcbbb48bbfc9763ea676785d2a6ffe25834d8015e094f1adfdec9` |
| Codex/unified audit receipt | `sha256:d38f7ad3dd7dceaa002023eb3a29fb666515e19db393857f3dca1ba5bb21ac7c` |
| macOS/authority audit receipt | `sha256:2b7111df2aa6ae719da2434e5ef39f2a1896448e1efe5c54ff62eeb54cfb18e6` |
| Machine evidence | `sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e` |
| Historical R Construction Report | `sha256:d2899bc56f27fe91874e16583cac6da861b86be86956a82bedd995869777cb46` |
| Historical R Non-approvable Retry Manifest | `sha256:eb884dd118b7e8ae783031f084ed7fb2bebf726ff49e1a1dd75a2491ddf14cf8` |

## R2：批准的 C-layer 可移植性纠错

历史 `I`、输出 `R`、machine evidence 和唯一一次 Host Binding Yellow 结果保持不变，
也没有被投射到新代码上。Owner 后续只批准了一个窄 C layer，用来修复 Ubuntu CI
没有 macOS `/private/tmp` 拼写的问题，并保留所有生产 fail-closed 边界。

| 项目 | Exact value |
| --- | --- |
| Historical output R / tree | `63ae16940faf17694152cffa12848e62c2933c52` / `ebfd96e7c1003c076d417798e53430891f60f057` |
| C1 / tree | `63979037c2b43a0ca7e62d3edb9c39b69ab48669` / `4fbea4f69c59c80fe4fcee44fde586b31e9c4318` |
| Final C / tree | `383bf00611eaf180d4146f75e294deca49a4d5b1` / `3b2ef06165975d2fad1e781aedbe04b91af49287` |
| Historical evidence | `sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e`（未改变） |
| R2 Construction Report | `sha256:aa679d5be2fb040aff80123d21a3383013f198377a6778ef421d0e3e96bbd1a2` |
| R2 Non-approvable Retry Manifest | `sha256:3356a5a6dff3e8a0bbc92355b7615b40fa09b2a353e2bc050bc7bcb63e124ec5` |
| Final Ubuntu CI | [`31278070883`](https://github.com/formehq/forme/actions/runs/31278070883) — `npm run check` Green |

`R..C` 累计只改了六个已批准路径：physical port、physical runner、对应测试、runner
contract、artifact index 和 doc audit。系统临时目录只取 `realpath(/tmp)`；不信任
`TMPDIR`、`os.tmpdir()` 或调用者输入。生产 branch/workset gate 和 Node 文件身份检查
均未放宽。detached/post-output checkout 会在创建 journal/root 或产生 effect 之前拒绝；
GitHub 托管 Node 的 hardlink 身份不受支持时，也会在 child start 前安全拒绝并清理测试
root。

第一次 C CI
[`31277888019`](https://github.com/formehq/forme/actions/runs/31277888019)
正是因为这条严格 Node 身份检查而停止；C2 只让测试把这种安全拒绝记录为预期结果，
没有给它生产 authority。第二次 CI 全绿。C 层之后 runner 的状态明确是
**NOT_HOST_BOUND**。

没有第二次 Host Binding：fixed Host input 未被 stat/open/read，没有新 capsule 或 public
receipt，也没有执行 Retry、Docker/PostgreSQL、real Codex、signing、Keychain、LA、
provider、部署、merge、traffic 或 spend。Retry Execution 与 First Provider-Call Test 仍为
**NOT_REQUESTED**。

## Owner 的下一步边界

当前不需要、也不应批准 Retry 或 First Provider Call。若 Owner 希望继续，只能另行
批准一次新的 read-only Host Binding，并准备新的 fixed input envelope；新的批准必须
重新明确 exact authority，Agent 仍不得搜索、推断或替换 Owner 路径。只有新的 Host
Binding 成功产生有效 capsule 和 public receipt 后，才值得生成一份真正可批准的
zero-provider Retry Manifest。

本 Review 不授权 Retry、Provider Call、部署、public traffic、merge 或 spend。
