# console/ — localhost 落子台

**状态:骨架占位(W3 填充)。**

固定外观的原语卡渲染 + 单键落子(a/p/r)+ wake-catchup。不推送,等用户来(工作流边界)。

**技术栈决定(2026-07-04,见 `docs/DECISIONS.md`):原生 TS + `node:http`,零重框架。** UI 是 vault 的确定性投影(硬约束 #4:零私有状态、每卡有 markdown 镜像),不需要 React/Next。W3 动工时若被推翻转 `revised`。

读取:vault 里的卡片 JSON。写入:`decisions.jsonl`(presented / decision / correction)+ 应用被 accept 的 diff(git 提交以便回滚)。事件与卡格式见 `docs/SCHEMA.md`。
