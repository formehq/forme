# CLAUDE.md — Forme

## 这是什么项目

**Forme**(中文名待定)= local-first agent,把用户知识库的漂移变成 one-decision 卡片(证据 + 最小 diff + accept/park/reject),并从每次决策学习用户的 taste。它是 CCS(Cognitive Continuity System)的产品化;所有核心回路已在 owner 的 vault 上经过 ~6 周自我实验验证。

**当前阶段:W2(重复抑制 + Taste Rules + State Diff 生成器)。** 任务看 GitHub Issues/Milestones(W1→W6);本文件是每个 build 会话的起点——读完即有完整上下文,不需要翻旧会话。

## Canonical 文档(战略层住在 vault;本 repo 不复制、不改写它们)

| 要什么 | 读哪 |
| --- | --- |
| 产品定义(SSOT) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/02_Wiki/Projects/Cognitive Continuity System.md` |
| **MVP spec(建什么/不建什么/为什么)** | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/02_Wiki/Frameworks/CCS MVP Spec.md` |
| Roadmap(硬锚日期) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/Forme Roadmap (Live).md` |
| 实验证据(设计依据) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/CCS Validation v2 - 2026-07-02.md` |
| 调研证据(底座政策/竞品/机制) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/CCS MVP 调研 - 2026-07-01.md` |

日常以 spec 为准;冲突时以 SSOT 为准。

## 架构:一张决策卡的 7 步生命周期

1. **触发**:launchd(WatchPaths 盯 vault + 错过任务唤醒补跑)拉起 runner
2. **Agent run**:`codex exec --json --output-schema` 扫 vault 增量找漂移;prompt 注入 `Taste Rules.md` + k 条相似历史决策
3. **落盘(runner 代码执行,非 agent)**:agent 只返回 schema 强制的 JSON;卡片 JSON + markdown 镜像由 runner 写进 vault;**指纹查重**(category+目标+diff hash)命中 rejected/parked 名单 → 直接丢弃
4. **呈现**:localhost console 渲染固定外观的原语卡;不推送,等用户来(工作流边界)
5. **落子**:单键 a/p/r;diff 应用(git 可回滚);time-to-decision 静默计时;追加 `decisions.jsonl`
6. **学习**:每 ~20 条决策,从 jsonl 提炼人可读规则追加 `Taste Rules.md`(用户可直接编辑)
7. **授权**:某类回放一致率 >95% → 影子模式(预决策但仍展示)→ 用户显式确认后该类自动化

## 硬约束(违反即打回,全部来自已验证定律)

1. 人侧动作 = 只读 + 单手势落子;correction 是唯一例外且可选
2. 每轮呈现的提案数按近期接受率自适应节流;只在工作流边界成批出现
3. 唤醒 → 首卡可见 ≤ 10 秒(增量指纹只处理 delta;可先渲染旧状态并标注)
4. UI 零私有状态:所有卡片有 markdown 镜像;**vault 是唯一真相层**
5. 卡片 schema 从 day 1 信封形(`origin/from/role/category`)——为 post-MVP agent relay 预留
6. 重复率→0 靠确定性工程(指纹 + 硬过滤),不靠 LLM 自觉
7. **Agent 只读、只返回 JSON**:一切写盘由 Forme 确定性代码执行(抹平底座沙箱差异;provenance 出自可审计代码)——2026-07-04 增,见 #8

## 技术基线

- **执行底座 = 三层矩阵(2026-07-04 定)**:Tier 1 默认 Codex CLI(`codex exec --json --output-schema`,`--sandbox workspace-write`);Tier 2 OpenCode(server/SDK 路径,适配器排 W7,见 #8);Tier 3 SKILL.md(Claude Code + OpenCode 均识别)。runner 接口按双调用形态设计(one-shot exec / 长驻 server-SDK);schema 校验用自有 AJV,不信 harness
- **政策事实(已核验 2026-07-04,原文级,见 #2/#3 关闭记录)**:Anthropic 禁产品侧消费级 OAuth(**不得**设计依赖用户 Claude 订阅的产品路径;用户自己的 Claude Code + SKILL.md 显式合规);OpenAI **无**第三方订阅 OAuth 计划——登录委托用户自己的 Codex CLI(headless device-auth 官方支持);每轮 run 小增量 + 支持 API key 档(Plus 额度 15–80 条/5h)
- **调度**:launchd(macOS 首发);**数据**:`decisions.jsonl`(event log,只追加)、`Taste Rules.md`、卡片 JSON + md 镜像
- **License**:公开时 Apache-2.0;**Console 技术栈**:已定=原生 TS + `node:http`,零重框架(2026-07-04,见 `docs/DECISIONS.md`)

## 仓库现状(随进度更新)

- **已建**:`schema/`(卡片 + 事件 JSON Schema、指纹、AJV 校验、样卡 —— #4)· `runner/`(codex exec 真跑 → 自有 AJV 门 → 指纹抑制 → 卡落 `98_Forme/cards/` + run-metrics 数据点 —— #5、#9)· `launchd/`(日跑 + 额度守卫,已装机 —— #9)· `docs/` · `design/` · 工具链(Node 原生 TS,无构建步骤)
- **未建**:`console/`(W3,占位)· Taste Rules 提炼/注入(#10)· State Diff 生成器(#11)
- 一句话:**采集端闭环(调度 → 扫描 → 抑制 → 落卡 → 重复率曲线),决策端未通**;下一块 = #10/#11。详见 `docs/ARCHITECTURE.md` 的"能做/不能做"。

## 常用命令

- `npm install` —— 装依赖(ajv / ajv-formats;首次)
- `npm test` —— schema 测试(`node --test`,13 项:样卡过校验 + 指纹自洽 + 边界拒绝)
- `npm run validate` —— 用 Forme 自己的 AJV 门跑一遍所有样例(卡 + decisions.jsonl)
- `npm run typecheck` —— `tsc --noEmit`(不产出,只查型)
- `gh issue list --milestone "W1 — 骨架 + 第一张真决策卡"` —— 看 W1 任务;关键路径 #4(done)→ #6(done)→ #5

## 会话协议(每个 build 会话遵守)

- 本 repo 的会话**只做 build**;战略问题(定位、范围、优先级)不在这里决定——开 issue 加 label `needs-vault-decision`,周一 vault 周会处理
- 每个 session 结束:更新相关 issue 状态 + 留一行进度 comment(供周会回流 vault)
- **动了架构 / schema / 交互的会话,结束前必须更新对应 `docs/` 文件**(ARCHITECTURE 的「能做/不能做」、DECISIONS 追加一条、SCHEMA 同步)——docs 是 Zayn 的系统理解面,过期即失职(#7 纪律)
- 可以**读** vault 任何文档;**不改 vault 内容 = 不动知识层**(既有各目录的任何文件,回流由 vault 侧会话负责)。**例外:Forme 运行时产物只写 vault 顶层 `98_Forme/`**(卡片 JSON + md 镜像、`decisions.jsonl`、日后 `Taste Rules.md`),其外零写入(2026-07-04 裁定,见 `docs/DECISIONS.md`)
- Commit 简短描述性;repo private 至 W6,发布另有清单

## 公开前清单(W6,~08-18)

- [ ] 本文件的本地绝对路径移除(公开版产品文档进 `docs/`)
- [ ] README 重写为 landing;加 LICENSE(Apache-2.0)
- [ ] 全库隐私扫描(不得含 owner vault 内容样本以外的个人信息)
