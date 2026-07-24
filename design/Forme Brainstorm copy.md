# Prompt
我正在尝试完善这样一个图谱来设计Forme Agent Harness, 我们可以一起来brainstorm一下

# Answer
可以，而且我觉得你这张图已经有一个**很清晰的气质**了：它不是在画一个“功能列表”，而是在试图画出 **Forme Agent Harness 作为一个 agent substrate / runtime shell** 的整体形态。

我先说一下我从这张图里读到的东西，再跟你一起往下脑暴。

---

# 1. 我从你这张图里读到的隐含结构

你现在这张图，中心是：

- **Forme Agent Harness**
    

围绕它的元素大概分成几类：

## A. 上层能力 / 产品目标

上面一排像是你希望 Harness 最终支撑出的能力：

- Adaptive Frontend, Interface, Interaction
    
- Adaptive Backend
    
- Vault-Maintain
    
- Needs-Aware
    
- Entropy-Reduce
    
- Auto Context Management
    
- Multi-Agents
    

这组词很关键，因为它们不像“组件”，更像 **emergent capabilities**，也就是：

> Harness 不是为了调用工具而存在，而是为了长出这些能力。

---

## B. 中层执行手段 / agent affordances

贴近 Harness 的是：

- Skills
    
- Plugins
    
- MCPs
    
- (Computer Use)
    
- Tools
    

这说明你在想的是：

> Harness 需要一个统一的 agent capability surface，去接各种不同类型的能力接口。

也就是说，Forme Harness 不是某个单一 agent，而更像 **让 agent 能长出来、被约束、被协调、被维护的壳**。

---

## C. 下层环境信号 / runtime context

底部你写了：

- Time Stamp
    
- Calendar System
    
- Trigger System
    

这说明你已经意识到 Harness 不只是“接收 prompt -> 输出结果”，而是需要有一种 **ongoing runtime**：

- 时间
    
- 事件
    
- 节律
    
- 触发
    
- 外部世界的周期性信号
    

这其实已经是从 chatbot 走向 **daemon / always-on agent runtime** 了。

---

# 2. 我觉得你这张图已经对了，但还缺一层最关键的东西

我觉得你现在这张图里，**“能力层”和“接口层”已经有了**，但中间还缺一层特别关键：

> **Harness 到底在维护什么？**  
> 或者说，agent runtime 的承重对象是什么？

因为如果没有这个，Harness 很容易看起来像：

- tool orchestrator
    
- agent launcher
    
- multi-agent shell
    
- 自动化平台
    

但 **Forme 的独特性** 不在这些词。

Forme 的独特性是它不是为了“完成任务编排”而生的，而是为了**维护一个持续演化的认知实体 / context body**。

所以我会建议你在图里补上一整层：

---

# 3. 我建议加一层：Core State / Cognitive Substrate

在 Forme Agent Harness 的正下方或者内部，加一个承重层，比如叫：

- **Core State**
    
- **Cognitive Substrate**
    
- **Context Substrate**
    
- **Living State Layer**
    
- **Entity Runtime**
    
- **Projection Substrate**
    

如果是更贴近你语言的，我甚至会叫它：

> **Continuity Substrate**

这一层维护的不是传统 memory，而是：

- 当前活跃项目状态
    
- 用户的 long-term context
    
- decision history
    
- taste / judgment patterns
    
- trust boundary
    
- actionability
    
- open loops
    
- external commitments
    
- current needs / energy / direction
    
- self / project / others 的 relationship state
    

也就是说：

```text
Harness 不是直接管理 tools
Harness 是在维护一个持续演化的认知运行时
tools / skills / MCP 只是它延展 agency 的器官
```

这个差别特别重要。

---

# 4. 我会把整张图整理成 5 层

如果我帮你重构这张图，我会让它变成下面这种架构：

---

## Layer 1 — Environment / Signals

最底层，世界如何进入 Harness。

包括：

- Timestamp
    
- Calendar
    
- Trigger System
    
- File Events / Vault Changes
    
- App / OS Events
    
- Messages / Emails / Social Inputs
    
- Manual Input
    
- Sensor / Embodied Signals（以后）
    
- User Presence / Attention / Energy State
    

这一层回答的是：

> 世界发生了什么？  
> 以及什么时候该让 agent 醒来？

---

## Layer 2 — Continuity Substrate

这是 Forme 最独特的层。

包括：

- Identity / Entity State
    
- Project States
    
- Decision History
    
- Taste / Preference Memory
    
- Trust / Permission Boundaries
    
- Open Loops
    
- Context Graph / Working Memory
    
- Projection State
    
- Agent Contracts
    
- Provenance / Audit Trail
    

这一层回答的是：

> agent 实际上在“维护什么东西”？

---

## Layer 3 — Harness Runtime

这一层才是你图里的 “Forme Agent Harness” 本体。

它可以包括：

- Context Assembler
    
- Planner / Router
    
- Agent Executor
    
- Tool Dispatcher
    
- Skill Invocation
    
- MCP Bridge
    
- Plugin Runtime
    
- Computer Use Runtime
    
- State Updater
    
- Verifier / Evaluator
    
- Policy Engine
    
- Multi-agent Coordinator
    

这一层回答的是：

> 拿到环境信号和 continuity substrate 之后，系统如何感知、决策、调度、执行？

---

## Layer 4 — Agentic Capabilities

这是你图里现在写在上方的那些能力，不过我会把它们明确变成“系统长出来的能力”。

例如：

- Vault Maintain
    
- Needs-Aware Assistance
    
- Entropy Reduction
    
- Auto Context Management
    
- Adaptive Backend
    
- Adaptive Frontend / Interaction
    
- Projection Generation
    
- Multi-Agent Collaboration
    
- Wake-Catchup / Restart
    
- Proactive Initiative
    

这一层回答的是：

> Harness 不是做什么组件，而是实际表现出什么能力。

---

## Layer 5 — Surfaces / Projections / Interfaces

最上层是它向谁显现、怎么显现。

包括：

- User Console
    
- Adaptive UI
    
- Role-based Interfaces
    
- Agent-to-Agent Interface
    
- Collaborator Surface
    
- Recruiter / Public Projection
    
- Shadow Actions / Review Queue
    
- Notifications / Intervention Surface
    

这一层回答的是：

> 同一个底层认知实体，以什么形态被看见、被交互、被调用？

---

# 5. 你图里我觉得“最应该补”的模块

如果是继续脑暴，我会优先补以下几个节点，因为它们会让这张图从“agent platform”变成“Forme harness”。

---

## 5.1 Context Assembler / Context Compiler

这个我觉得必须有。

因为 Forme 最大的问题之一不是有没有 context，而是：

> 如何把分散的、不同粒度的、不同时态的 context 在某一时刻编译成一个 agent 可工作的运行时上下文。

你可以叫它：

- Context Assembler
    
- Context Compiler
    
- Runtime Context Builder
    
- Working Context Engine
    

它负责：

- 根据任务 / 时机 / agent 角色
    
- 选择哪些记忆、哪些状态、哪些关系、哪些规则进入当前上下文
    
- 控制上下文窗口
    
- 决定“现在谁该知道什么”
    

这个模块其实是 **Auto Context Management** 的核心引擎。

---

## 5.2 Policy / Permission / Trust Engine

这个也很重要。

因为当你开始讲：

- auto context management
    
- multi-agents
    
- computer use
    
- adaptive backend
    
- proactive behavior
    

你马上就进入了一个高风险区：

> 谁可以看到什么？  
> 谁可以动什么？  
> 什么时候只建议，什么时候可以执行？  
> 哪种 action 需要 review？  
> 哪种 agent 只能 shadow mode？

所以最好单列：

- Trust Engine
    
- Permission Layer
    
- Policy Engine
    
- Agency Ladder
    

这个层定义：

- read / write / propose / execute 权限
    
- per-surface projection boundary
    
- per-agent agency level
    
- confidence threshold
    
- verification requirement
    
- rollback / audit capability
    

没有这层的话，Harness 会显得很强，但不可信。

---

## 5.3 Verification / Closure Engine

这个是 Forme 的灵魂之一。

很多 agent system 都停在：

- 发现问题
    
- 提供建议
    
- 自动执行
    

但 Forme 的独特性一直是：

> **closure / verification / human acceptance bandwidth**

所以这层最好显式存在。

比如：

- Verification Engine
    
- Closure Engine
    
- Acceptance Loop
    
- Decision Memory
    

它负责：

- 将 agent 工作变成可验收对象
    
- 记录 accept / reject / revise
    
- 把 closure 结果写回 taste / policy
    
- 决定哪些事情以后可以自动做
    

这是让 system 从“聪明”变成“长期可信”的关键。

---

## 5.4 Taste / Judgment Model

如果不单列，容易被吞进 memory 里。

但我觉得它对 Forme 太重要了。

你可以加一个：

- Taste Layer
    
- Judgment Model
    
- Preference Compiler
    
- Decision Pattern Memory
    

它不是“用户喜欢蓝色按钮”那种浅层 preference。

而是：

- 这个人如何做判断
    
- 什么表达更像他
    
- 什么不该被过度定型
    
- 什么 ambiguity 应该保留
    
- 哪类 drift 他通常接受
    
- 哪类主动性他会觉得被打扰
    

这层是 future proactive agency 的前提。

---

## 5.5 Initiative / Timing Engine

你图里有 Needs-Aware，但我觉得还可以再具体一点。

真正的难点不只是“aware”，而是：

> **什么时候该出声？什么时候该沉默？**

所以我会加：

- Timing Engine
    
- Initiative Engine
    
- Intervention Policy
    
- Attention-Aware Triggering
    

它负责判断：

- 现在用户在深度工作吗？
    
- 现在需要 proactive 吗？
    
- 现在应该做 weekly catch-up 吗？
    
- 某个 drift 是马上推，还是等下一个 restart moment 再推？
    
- 这个 agent 是该静默维护，还是该主动浮现？
    

这是从 daemon 走向真正 agent 的桥。

---

# 6. 我会建议你重新组织 top row

你现在 top row 是：

- Adaptive Frontend, Interface, Interaction
    
- Adaptive Backend
    
- Vault-Maintain
    
- Needs-Aware
    
- Entropy-Reduce
    

这些都对，但现在还比较“平铺”。

我会建议把它们分成三组。

---

## Group A — Interaction Intelligence

- Adaptive Frontend
    
- Adaptive Interface
    
- Adaptive Interaction
    
- Projection Surfaces
    

## Group B — Cognitive Maintenance

- Vault Maintain
    
- Context Management
    
- Entropy Reduction
    
- Continuity Preservation
    
- Drift Handling
    

## Group C — Agency Intelligence

- Needs-Aware
    
- Timing-Aware
    
- Proactive Initiative
    
- Multi-Agent Coordination
    
- Auto Execution / Shadow Execution
    

这样会更清楚：

> 这是三种不同的智能，不是一排 feature。

---

# 7. “Multi-Agent” 在你图里目前像结果，不像结构

我觉得这里很值得脑暴一下。

你图右边写了：

- Auto Context Management
    
- Multi-Agents
    

这两个词现在像“高级目标”。

但如果要把它变成 harness design，我会追问：

## Multi-Agent 到底分什么工？

Forme 里的多 agent，不应该只是 generic planner/executor 那套，而更可能按“认知职责”分工。

例如：

- **Maintainer Agent**  
    负责 vault consistency、drift、state upkeep
    
- **Context Agent**  
    负责 runtime context assembly、restart、summon relevant memory
    
- **Projection Agent**  
    负责把同一底层状态渲染成不同 role-facing surfaces
    
- **Action Agent**  
    负责执行外部 action、computer use、tools、MCP
    
- **Verification Agent**  
    负责检查 agent 输出是否达标、是否需要 closure
    
- **Taste Agent**  
    负责从 decision history 提炼 judgment rules
    
- **Timing Agent**  
    负责决定何时浮现、何时沉默
    

如果你这么拆，Multi-Agent 就不再是 buzzword，而是：

> 一个围绕 continuity substrate 的专职 agent ecology。

这个很有 Forme 味道。

---

# 8. 我觉得这张图还缺一个最重要的箭头关系

现在这张图更像空间分布，但如果继续完善，最好加入一条核心闭环。

我建议加一个主闭环：

```text
Signals
→ Context Assembly
→ Agent Reasoning / Execution
→ Output / Proposal / Action
→ Verification / Closure
→ Taste / Policy Update
→ Continuity Substrate Update
→ future Context Assembly
```

这个 loop 很重要，因为它告诉别人：

> Harness 不是一次性 orchestration，而是一个会自我更新的系统。

如果只摆组件，不摆闭环，别人容易把它看成“一个 agent 框架图”。

---

# 9. 如果让我直接给你一个“下一版图谱骨架”

我会建议你画成这样：

---

## 中央

**Forme Agent Harness**

---

## 内核层（紧贴中心）

- Context Assembler
    
- Planner / Router
    
- Tool / Skill Runtime
    
- Policy Engine
    
- Verification / Closure Engine
    
- State Updater
    
- Multi-Agent Coordinator
    

---

## 承重层（左下或中心底部）

**Continuity Substrate**

- Working Context
    
- Project States
    
- Decision History
    
- Taste Rules
    
- Trust Boundary
    
- Open Loops
    
- Provenance
    
- Projections
    

---

## 环境输入层（底部）

- Timestamp
    
- Calendar
    
- Trigger System
    
- Vault Events
    
- Messages
    
- Manual Inputs
    
- Energy / Attention Signals
    
- External APIs
    

---

## 能力结果层（顶部）

- Vault Maintain
    
- Auto Context Management
    
- Needs-Aware
    
- Entropy Reduction
    
- Adaptive Backend
    
- Adaptive Frontend / Interaction
    
- Projection Generation
    
- Multi-Agent Collaboration
    

---

## 表面层（左右两侧 / 顶层）

- User Console
    
- Adaptive UI
    
- Shadow Review Queue
    
- Public / Recruiter Projection
    
- Collaborator Interface
    
- Agent-to-Agent Interface
    

---

## 横切层（可以用虚线）

- Trust / Permissions
    
- Agency Ladder
    
- Auditability
    
- Learning from Closure
    

---

# 10. 三个我觉得最值得我们继续一起想的问题

我觉得如果继续 brainstorm，最有价值的是这三个：

## 问题 1

**Harness 的 primary object 到底是什么？**

是：

- tasks？
    
- context？
    
- projects？
    
- decisions？
    
- projections？
    
- 还是 entity state？
    

我倾向于最后一个：**entity state / continuity state**。  
这个决定了整个架构的语义中心。

---

## 问题 2

**Harness 的核心 loop 到底是什么？**

是：

- plan → act？
    
- retrieve → generate？
    
- detect → propose → verify？
    
- maintain → surface → close？
    
- observe → understand → intervene？
    

我觉得 Forme 可能最核心的是：

> **observe → maintain → propose → verify → learn**

而不是经典 agent 的 plan → act。

---

## 问题 3

**Multi-agent 的分工，是按 tool 分，还是按 cognition 分？**

- 按 tool 分：browser agent, file agent, calendar agent
    
- 按 cognition 分：maintainer, timing, verifier, projection, action
    

我觉得后者更有你的体系感。

---

# 11. 如果你愿意，我建议我们下一步可以这样继续

我可以直接陪你做其中一个方向：

### 方向 A：把这张图整理成一版更清晰的架构图

我可以直接帮你输出一个 **文本版结构图**，你可以照着去 Figma 画。

### 方向 B：把 “Forme Agent Harness” 拆成几个核心模块

例如拆成：

- Runtime
    
- Substrate
    
- Agency
    
- Surfaces
    
- Governance
    

然后每个模块下列子项。

### 方向 C：专门讨论 “multi-agent 怎么分工”

帮你定义 Forme 里的 5–7 个专职 agent。

### 方向 D：专门讨论 “Harness 和 Forme product vision 的关系”

避免 Harness 变成一个 generic agent shell，而保持它服务于 Forme 的最高 vision。

---

如果你愿意，我下一条可以直接给你：

**“Forme Agent Harness v0.2 结构图（文本版）”**

我会按你这张图的风格，直接帮你排成一个更完整的骨架。


# Prompt2
这是我的Vault Agent帮我又提炼出来的一些内容：
{那如果我们从forme agent最终达成的目标效果s来切入思考呢？你觉得都会有什么样的目标效果？

好切入。"目标效果"比功能清单离实感近得多——它答的是:Forme 真的成了,你的生活里会观察到什么不一样。

我从全部材料里提炼出九个。每个都给你:一句话效果 + 它从哪来 + 现在离它多远。

---
E1 · 断点即续点。
任何中断之后,几秒钟就回到自己的思路里。不用翻记录,不用重想"我到哪了"。
← R 实验判词、wake-catchup、早晨工作记忆推送 case。
现状:雏形已见(R 10/10),但都是你去问。"它主动接你回来"还没有。

E2 · 熵自己降。
杂务和漂移被默默吸收,你不再积累"该整理了"的负债感。
← 降熵 case(3 个决策盖 20+ 操作)、自主车道、硬定律一。
现状:九个效果里跑得最实的一个。

E3 · 你的注意力只花在判断上。
到你面前的东西全是消化好的决策形状,几秒落一子。
← 硬定律二(吞吐 = 验证带宽)、卡片 21 秒中位。
现状:卡片格式已验证,但只覆盖"漂移"这一类事。

E4 · 定期被自己照亮。
它指出你自己看不见的模式、矛盾、想法的变化——"它看见我了"。
← 愿景第二层、首张思想卡。
现状:发生过一次(07-14)。8-15 前的可证伪检查点就是它。

E5 · 半成品想法不会死。
没成熟到能命名的念头有地方活着,在对的时机回来找你。
← 愿景第二层原文、workshop lane。
现状:未建。现在它们全靠你自己记 Flomo。

E6 · 你敢放手。
把整类事务交出去还睡得着——因为有回执、可撤销、它的自信是被测量过的。
← 授权反转、信任刻度盘、回消息分流。
现状:第一档已活(freshness 车道)。"敢放手"的感觉要靠更大的类目才算数。

E7 · 世界按你的 taste 来找你。
信息、机会、值得试的东西,以"已筛过"的形态主动出现。
← 咖啡店 pipeline、小红书收藏分析、品味菜单。
现状:未建,纯愿景侧。

E8 · 你不在场时,你仍在场。
  别人能进入你认知世界的受控切面,合作者拿上下文不用等你。
  ← 愿景第四层、Lisa 访谈、向外展示当前状态。
  现状:手动原型验证过一次(Lisa),产品未建。

  E9 · 它永远不把你定型。
  用得越久越像你,但你永远能推翻它——而且推翻它正是它变准的养料。
  ← 不可压缩约束、可解释可纠正可撤回、认证老化。
  现状:这不是功能,是横切保证。现在靠纪律,还没变成机制。

  ---
  排在一起看,有个形状:

  - E1-E3 = 归还时间
  - E4-E5 = 扩大认知
  - E6-E7 = 延伸行动
  - E8 = 延伸存在
  - E9 = 底线

  正好是愿景四层 + 一条底线。这说明效果清单和愿景是自洽的——不是我硬凑的。

  这个切入的好处是:选定了北极星效果之后,D1 的问题就变成"为了持续产生这个效果,harness 必须一直在做什么"。每条需求都能倒推回一个你有实感的效果,就不会再出现 R1-R5
  那种悬空感。}

怎么觉得？有没有什么加深理解的？


# Answer
我觉得这次提炼明显比“功能清单”更接近 Forme 的本体。

它开始回答的不是：

> Forme 有哪些模块？

而是：

> 当 Forme 真正存在于一个人的生活里以后，这个人的认知、注意力、行动和存在方式会发生什么变化？

这正是设计 Harness 更合适的切入点。

不过我觉得还可以再往下挖一层。现在这九条已经很好，但里面混合了三种不同性质的东西：

1. **用户可感知的结果**
    
2. **系统获得的能力**
    
3. **产品必须遵守的宪法性约束**
    

把这三种拆开，整个 Vision 会更清晰。

---

# 一、这九条实际不是九个平行效果

它们看起来平行，但内在层级并不完全一样。

## 真正的用户结果

这些是用户能够直接感受到的生活变化：

- E1 断点即续点
    
- E2 熵自己降
    
- E3 注意力只花在判断上
    
- E4 定期被自己照亮
    
- E5 半成品想法不会死
    
- E7 世界按你的 taste 来找你
    
- E8 你不在场时，你仍在场
    

这些都可以被用户直接说出来：

> “我现在不再需要重新进入项目了。”

> “我感觉脑子里没那么多系统债务了。”

> “有些想法是它帮我保活并重新带回来的。”

这些是很好的北极星效果。

---

## 系统关系的成熟状态

E6「你敢放手」稍微不一样。

它不是一个独立能力，而是**用户与系统之间信任关系成熟之后产生的状态**。

Forme 不是做了一个“放手功能”，而是因为它长期做到：

- 行为可预测
    
- 判断可解释
    
- 结果可验收
    
- 错误可撤销
    
- 权限渐进增长
    

用户最终才会产生：

> 我敢把这一类事情交给它。

所以 E6 更像一种高阶结果：

```text
可理解
+ 可验证
+ 可撤销
+ 长期一致
= 用户敢放手
```

它非常重要，但最好把它理解为 **earned trust**，不是一项功能。

---

## 宪法性约束

E9「永远不把你定型」则更不同。

它不是效果，而是这个系统存在的伦理与认识论边界：

> Forme 必须形成对你的理解，但永远不能声称它已经定义了你。

这是一条 constitutional invariant。

它应该横穿所有能力：

- memory 不得成为固定人格档案
    
- taste 不得成为永久偏好锁定
    
- projection 不得代替本人
    
- automation 不得把过去选择永久化
    
- Digital Twin 不得获得对人的解释主权
    

所以我会把 E9 从九条效果里拿出来，放在整个模型底部：

> **Forme may model you, but it may never close the definition of you.**

中文可以更直接：

> **Forme 可以不断形成关于你的模型，但不能拥有对“你是谁”的最终解释权。**

---

# 二、这九条背后其实存在一个更深的递进

Vault Agent 给出的四层已经很对：

- E1–E3 归还时间
    
- E4–E5 扩大认知
    
- E6–E7 延伸行动
    
- E8 延伸存在
    
- E9 底线
    

但我觉得可以把这四层重新命名得更准确。

---

## 第一层：维持连续性

对应：

- E1 断点即续点
    
- E2 熵自己降
    
- E3 注意力只花在判断上
    

这层不是简单的“节省时间”，而是：

> **Forme 帮助一个人维持认知和行动的连续性。**

因为时间被浪费，通常只是表面现象。更深的问题是：

- 上下文断裂
    
- 系统与现实漂移
    
- 注意力被维护性工作吞噬
    
- 工作记忆不断重建
    

所以这层真正归还的不是时间，而是：

> **continuity of agency**

也就是“我仍然沿着同一条意图继续前进”的能力。

我会把这一层称为：

### Continuity Preservation

**持续维持人的认知与行动连续性。**

---

## 第二层：扩大可思考范围

对应：

- E4 定期被自己照亮
    
- E5 半成品想法不会死
    

这一层也不只是“扩大认知”。

更具体地说，Forme 在扩张两种东西：

### 1. 可见范围

它帮助你看到：

- 自己的变化
    
- 隐藏的重复模式
    
- 跨项目连接
    
- 长期矛盾
    
- 尚未显性化的方向
    

### 2. 可保留范围

人的自然认知系统很容易丢弃：

- 低清晰度想法
    
- 不够成熟的直觉
    
- 还没有语言的感受
    
- 暂时无法行动的可能性
    

Forme 让这些不必立刻被压缩、命名或执行，也不会因为不成熟而消失。

所以这层更像：

### Cognitive Expansion

**扩大人能够看见、保留和继续思考的范围。**

这里有一个很深的产品命题：

> 传统知识工具擅长保存已经形成的东西；Forme 应该能够承载尚未形成的东西。

这可能是 Forme 与知识库真正拉开差距的地方。

---

## 第三层：扩大可行动范围

对应：

- E6 你敢放手
    
- E7 世界按你的 taste 来找你
    

这层的共同点是：

> 人不再需要亲自完成所有感知、筛选和执行，自己的判断开始被系统延伸。

E6 是向外执行：

- 维护
    
- 协调
    
- 处理
    
- 沟通
    
- 决策准备
    

E7 是向内筛选：

- 什么值得进入注意力
    
- 什么机会与你匹配
    
- 什么信息符合当前方向
    
- 什么东西应该现在出现
    

所以这不是普通 automation，而是：

### Agency Extension

**把人的判断力和行动力延伸到本人注意力之外。**

关键并不是系统做得更多，而是：

> 它在不稀释你的 authorship 的前提下，让你的 agency 覆盖更大的世界。

---

## 第四层：扩大存在范围

对应 E8：

> 你不在场时，你仍在场。

这是整个 Vision 最接近 Digital Twin 的地方。

它不是：

- 自动回复
    
- 个人主页
    
- AI clone
    
- 静态 profile
    

而是一个人可以把自己的一部分：

- 上下文
    
- 判断
    
- 项目状态
    
- 意图
    
- 可公开认知
    
- 合作边界
    

以受控方式投射出去。

所以更准确的说法是：

### Presence Extension

**让一个人的认知存在突破实时在场的限制。**

你本人不在那个时间、地点或交互界面里，但你的某种真实、受控、可更新的 projection 仍然可以参与交互。

这一步才真正连接到：

```text
个人 Twin
↔ 项目 Twin
↔ 团队 Twin
↔ 其他人的 Twin
```

---

# 三、这几个效果背后有一个统一目标

如果把四层合起来，Forme 的最高目标可能不是“Digital Twin”本身。

Digital Twin 是一种形态。

它真正追求的结果是：

> **让一个人的认知连续性、判断力、行动力与存在，不再被生物注意力和实时在场严格限制。**

这句话可能比 Digital Twin 更接近内核。

因为 Digital Twin 很容易让人想到复制体、人格模拟或者 AI clone。

但 Forme 实际上做的是四种延伸：

```text
Continuity extension
Cognition extension
Agency extension
Presence extension
```

或者中文：

```text
维持连续性
扩大认知
延伸行动
延伸存在
```

这四层最后共同构成的是：

> **Extended Human Agency**

或者更有 Forme 自己特色一点：

> **Continuous Agency**

也就是：

> 人的 agency 不再只存在于“我现在清醒、记得、专注并亲自在线”的时刻。

这可能是你这个产品最深的命题。

---

# 四、我觉得还缺两个目标效果

现在九条已经覆盖很多，但如果以最终 Forme Agent 的结果来思考，我觉得还有两个重要效果尚未完全显性化。

## E10 · 你不必不断向系统重新解释自己

现在 E1 主要是“我回到工作里”。

但还有一种更广泛的断裂：

- 换一个 AI 要重新讲背景
    
- 换一个项目要重新讲目标
    
- 新合作者加入要重新解释历史
    
- 新 agent 出现要重新加载规则
    
- 每个工具都只知道局部的你
    

最终 Forme 应该产生的效果是：

> **你的上下文可以跟着你，而不是你跟着工具重新开始。**

可以叫：

### E10 · 上下文随你迁移

一句话版本：

> 每个新的工具、Agent 和关系，不再意味着一个新的失忆起点。

这会直接连接 Harness 的核心价值：

- context portability
    
- role-scoped context assembly
    
- agent handoff
    
- multi-agent coordination
    
- projection boundary
    

---

## E11 · 你始终知道它为什么这样做

E6 里有信任，但我觉得“可理解”本身值得成为结果。

因为未来复杂 Agent 最大的问题之一可能是：

> 系统越来越能做事，但人越来越不知道它现在在做什么、为什么这么做、它对自己的理解从哪来。

所以最终效果应该是：

> 即使它变得高度自主，你仍然能理解它的判断来源、当前权限和行为轨迹。

可以叫：

### E11 · 自主性增长，但控制感不下降

或者更有感觉一点：

> **它越能行动，你反而越看得清。**

这不是单纯的 audit log。

它意味着系统具备：

- legibility
    
- provenance
    
- agency state visibility
    
- confidence visibility
    
- reversible history
    
- explanation at the right level
    

这与 E9 一起构成 Forme 的信任底座。

---

# 五、这些效果可以直接倒推出 Harness 的持续职责

Vault Agent 说得非常对：

> 为了持续产生这个效果，Harness 必须一直在做什么？

这是接下来最有价值的问题。

我先给你一个倒推版本。

|目标效果|Harness 必须持续做什么|
|---|---|
|E1 断点即续点|保存工作状态、识别中断、编译 restart context、选择合适时机恢复|
|E2 熵自己降|监测漂移、吸收重复维护、整理状态、关闭低风险 open loops|
|E3 注意力只花在判断上|压缩复杂工作、形成 decision-ready object、管理验证成本|
|E4 定期被自己照亮|长期观察模式、比较不同时期、生成非显然反思|
|E5 半成品想法不会死|保存弱信号、维持未成熟状态、判断再浮现时机|
|E6 你敢放手|测量一致率、维护权限、提供回执、支持回滚、渐进授权|
|E7 世界按 taste 来找你|学习判断历史、主动筛选外界、匹配当前需要和长期方向|
|E8 你不在场时仍在场|生成受控 projection、按角色释放上下文、代表实体交互|
|E9 不把你定型|模型可修正、规则会老化、允许矛盾、本人保留最终解释权|
|E10 上下文随你迁移|跨 agent/context handoff、动态上下文编译、权限化传输|
|E11 自主增长但控制感不降|提供行为可见性、来源追踪、权限状态和解释接口|

这张表其实已经可以成为你 Harness 图谱的逻辑骨架。

---

# 六、对 Harness 设计最重要的启发

你原来的图里有：

- Adaptive Frontend
    
- Adaptive Backend
    
- Vault Maintain
    
- Needs-Aware
    
- Entropy Reduce
    
- Auto Context Management
    
- Multi-Agents
    

这些词都没错，但它们仍然比较像 capability labels。

从 E1–E11 倒推以后，我觉得 Harness 应该围绕五个**永续过程**来设计，而不是围绕若干技术模块：

## 1. Continuously Observe

持续感知：

- 人在做什么
    
- 系统发生了什么
    
- 世界进入了什么
    
- 什么东西改变了
    
- 当前是什么状态
    

## 2. Continuously Maintain

持续维持：

- 上下文连续
    
- 项目状态
    
- 知识一致性
    
- open loops
    
- projection freshness
    
- agent contracts
    

## 3. Continuously Interpret

持续理解：

- 什么重要
    
- 什么正在变化
    
- 什么属于 pattern
    
- 什么只是暂时状态
    
- 用户现在真正需要什么
    

## 4. Continuously Negotiate Agency

持续协商：

- 什么由人判断
    
- 什么由 agent 准备
    
- 什么可以影子执行
    
- 什么已经可以授权
    
- 什么权限应该过期或收回
    

## 5. Continuously Project

持续投射：

- 对本人恢复上下文
    
- 对外部人呈现受控切面
    
- 对其他 agent 提供角色化上下文
    
- 在本人不在线时保持有限存在
    

所以 Forme Agent Harness 可能不是传统意义上的：

> Agent execution harness

而更接近：

> **A runtime for continuously maintaining, extending, and projecting an entity’s agency.**

中文：

> **一个持续维持、延伸并投射实体 agency 的运行时。**

---

# 七、我会如何重新整理这套“目标效果”

最终可以压缩成一个更干净的版本：

## Forme 的四个终极效果

### 1. Continuity

**你不会因为中断、时间或工具切换而失去自己。**

- 断点即续点
    
- 熵持续下降
    
- 上下文随你迁移
    
- 注意力只投入真正判断
    

### 2. Cognition

**你能够看见和保留原本超出自身认知带宽的东西。**

- 被自己照亮
    
- 半成品想法持续存活
    
- 长期模式和矛盾变得可见
    

### 3. Agency

**你的判断和行动能够延伸到本人注意力之外。**

- 敢于放手
    
- 世界按 taste 找到你
    
- Agent 可代表你处理和行动
    

### 4. Presence

**你的认知存在不再完全依赖实时本人在场。**

- 合作者可进入受控上下文
    
- Agent 与 Agent 交换实体状态
    
- 不在场时仍然能够有限参与
    

## 两条底线

### Authorship

**它延伸你，但不能取代你对自己的定义与最终判断。**

### Legibility

**它越自主，你越应该看得懂、改得动、收得回来。**

---

最值得继续追的一句，我觉得是：

> **Forme 不是要制造一个替代人的 Agent，而是让人的 agency 获得连续性、尺度和新的存在范围。**

这句话一旦立住，Harness 中的 adaptive UI、context management、multi-agent、taste、vault maintenance、trigger system，就都不再是散落的技术能力，而是服务于同一件事。


# Answer3
可以。按 cognition 来分，我觉得比按工具来分更适合 Forme，因为它能让每个 Agent 对应一种稳定的“认知责任”，而不是对应某个临时接口。

我先给一个初版分法，再说哪些问题值得继续往深处挖。

## 一、Forme 的 Multi-Agent 不该是“多个小工”，而是“多个认知器官”

重点不是：

- 浏览器 Agent
    
- 日历 Agent
    
- 文件 Agent
    
- 邮件 Agent
    

这些更像 tool adapters。

真正的 cognition-based agents 应该围绕“一个实体如何持续存在、理解、判断、行动”来分工。

我会先分成六个核心 Agent。

---

## 1. Continuity Agent

它负责维持“我现在在哪里”。

核心职责：

- 维护 project state
    
- 保存工作断点
    
- 识别中断
    
- 生成 restart context
    
- 做 wake-catchup
    
- 追踪 open loops
    
- 防止不同线程失联
    

它关心的不是“文件里写了什么”，而是：

> 这个实体当前正在延续哪些意图？

它是 E1、E2 的核心承载者。

可以理解为 Forme 的“时间连续器官”。

---

## 2. Reflection Agent

它负责理解“我发生了什么变化”。

核心职责：

- 比较不同时期的判断
    
- 发现思想漂移
    
- 发现长期模式
    
- 识别矛盾
    
- 发现尚未显性化的方向
    
- 形成 pattern reflection
    
- 提醒哪些自我叙事已经过时
    

它不是 summarizer。

它应该能提出类似：

> 你最近三个项目都在从“工具”转向“长期关系型系统”，但你对外仍在用 productivity language。

这是 E4 的主要 Agent。

它更像认知镜面。

---

## 3. Incubation Agent

这个我觉得很值得单独存在。

它负责“尚未成形的东西”。

核心职责：

- 保存弱信号
    
- 识别反复出现但未成形的念头
    
- 不急着分类
    
- 保留矛盾和模糊
    
- 判断什么时候适合重新浮现
    
- 将 fragment 逐渐连成 emerging thread
    

它和 Reflection Agent 不同。

Reflection 看已经形成的轨迹，Incubation 维护还没有形成的可能性。

它是 E5 的核心。

这个 Agent 很可能是 Forme 最不同于传统知识库的一部分，因为传统系统往往只擅长管理已经被清晰命名的对象。

---

## 4. Judgment Agent

它负责学习“你如何落子”。

核心职责：

- 读取 accept / park / reject / correction
    
- 提炼 taste rules
    
- 识别稳定判断模式
    
- 区分临时偏好和长期原则
    
- 测量某类决策的一致率
    
- 提供 shadow prediction
    
- 管理判断规则老化
    

它不替你做最终决定，但它逐渐形成关于你的判断模型。

它是 E3、E6、E7 背后的核心。

它更像 Forme 的判断记忆，而不是事实记忆。

---

## 5. Steward Agent

我会用 Steward，而不是 Maintainer。

因为 maintainer 听起来只是整理文件，steward 更像“受托维护一个活系统”。

职责包括：

- 修复低风险 drift
    
- 维护 provenance
    
- 维护结构一致性
    
- 更新 living docs
    
- 清理 stale state
    
- 执行已授权的重复操作
    
- 维护 projection freshness
    
- 发现系统债务
    

它是“熵自己降”的主要执行者。

Continuity Agent 关心意图是否连续，Steward Agent 关心系统是否还健康。

这两个要分开，否则“项目状态”和“系统卫生”会混在一起。

---

## 6. Projection Agent

它负责一个实体如何在不同关系中显现。

核心职责：

- 按角色生成 context slice
    
- 管理公开 / 私密边界
    
- 维护 collaborator view
    
- 维护 recruiter / public / agent-facing projection
    
- 控制哪些信息可以被谁看到
    
- 将反馈重新带回内部模型
    
- 支持 agent-to-agent handoff
    

它不是 content generator，而是 projection governor。

它是 E8 的核心 Agent。

这个 Agent 最终把 Forme 从“个人内部系统”推向“实体之间通过 twin 交互”。

---

# 二、还可能需要两个横切 Agent

前面六个是认知职责。另有两个我不确定该不该叫独立 Agent，但一定要作为横切机制存在。

## 7. Timing Agent

它负责：

> 什么时候出声，什么时候沉默。

职责包括：

- 判断 intervention timing
    
- 判断用户当前注意力状态
    
- 合并提醒
    
- 延迟非紧急事项
    
- 识别 workflow boundary
    
- 决定 pull 还是 push
    
- 决定某个 idea 何时重新浮现
    

它不是“知道你需要什么”，而是知道“现在是不是应该打扰你”。

很多 proactive agent 的失败，不是内容错，而是 timing 错。

所以 Needs-Aware 最好拆成：

```text
Need detection
+
Timing judgment
```

这两件事不是一回事。

---

## 8. Verification Agent

它负责检查其他 Agent。

职责包括：

- 计算 health metrics
    
- 验证执行结果
    
- 检查 contract 是否满足
    
- 判断是否需要人工 review
    
- 检测 Agent 之间的冲突
    
- 提供 rollback evidence
    
- 记录 confidence 和 provenance
    

它可能不需要“自主思考很多”，但它必须独立于执行 Agent。

否则就是 Agent 自己做、自己验、自己宣布成功。

---

# 三、这些 Agent 之间不应该是平级聊天群

这里是我觉得最值得继续深入的地方。

Multi-Agent 经常被画成：

```text
Agent A ↔ Agent B ↔ Agent C
```

但 Forme 更需要的是一个有结构的认知组织。

我觉得可能有三种关系。

## 1. 同一实体，共享底层状态

所有 Agent 都不是独立人格，它们共享：

- entity state
    
- provenance
    
- decision history
    
- trust boundary
    
- project state
    
- permissions
    

也就是说：

> 多 Agent 是多个认知职能，不是多个独立自我。

这个边界很重要，否则很容易变成“六个 AI 互相聊”。

---

## 2. 每个 Agent 有不同的观察窗口

例如：

- Continuity Agent 看时间、项目状态、open loops
    
- Reflection Agent 看长周期变化
    
- Judgment Agent 看决策史
    
- Steward Agent 看系统结构和 drift
    
- Projection Agent 看角色、权限和关系
    

它们共享 substrate，但不共享同样的 attention scope。

这像一个组织中的不同部门，但更像大脑中不同功能系统。

---

## 3. 最终行动必须经过统一的 agency boundary

不能每个 Agent 都自己执行。

更合理的是：

```text
Agent forms interpretation
→ produces proposal or action request
→ policy / agency layer evaluates
→ execute / shadow / ask / reject
```

也就是说，多 Agent 负责认知分工，但行动权不分散。

否则你很快会遇到：

- 两个 Agent 同时改同一文件
    
- Reflection Agent 把推测写成事实
    
- Projection Agent 泄露内部状态
    
- Steward Agent 清理了 Incubation Agent 正在保留的模糊材料
    

---

# 四、我觉得最值得继续深入的，不止 Multi-Agent

除了 cognition-based multi-agent，我认为还有五个问题非常承重。

## 1. Agent 之间的冲突如何处理

这是最重要的下一步。

例如：

- Steward Agent 想降低熵，删除重复内容
    
- Incubation Agent 认为这些重复是一个尚未成形的 pattern
    
- Projection Agent 想输出一个清晰叙事
    
- Reflection Agent 认为这个人当前仍然矛盾，不应压平
    
- Continuity Agent 想推进项目
    
- Judgment Agent 认为用户最近其实在退避这个方向
    

这种冲突不是 bug，而是 Forme 的本质。

因为人的认知本来就存在多种相互竞争的需要：

- 清晰 vs 保留模糊
    
- 行动 vs 等待
    
- 稳定叙事 vs 允许变化
    
- 自动化 vs authorship
    
- 降熵 vs 保留可能性
    

所以需要一个明确的 conflict model。

可能不是“谁级别高”，而是：

```text
不同认知价值之间的显式张力
→ 形成一个可见的 negotiation object
→ 必要时交给用户判断
```

这可能比普通 multi-agent orchestration 更有 Forme 的味道。

---

## 2. Forme 的“entity state”到底是什么

这是整个 Harness 的数据本体问题。

Agent 们共享什么？

我觉得不应该只是一个 vector database，也不应该只是 markdown 文件。

可能需要把 entity state 分成：

```text
Facts
Current states
Active intentions
Open loops
Decision history
Taste rules
Trust boundaries
Relationships
Projections
Unresolved tensions
Emerging possibilities
```

其中最值得注意的是后三项：

- unresolved tensions
    
- emerging possibilities
    
- projection states
    

这三类数据在普通 agent memory 里很少被认真处理。

但它们对于“不把人定型”非常重要。

---

## 3. 什么叫“理解用户”，什么只是拟合用户

这是 Forme 的认识论核心。

Judgment Agent 最容易出现的问题是：

> 它根据过去十次选择，推断你永远会这样选择。

但人会变化，而且有时推翻自己正是成长的一部分。

所以需要区分：

- stable taste
    
- situational preference
    
- temporary state
    
- experiment
    
- unresolved contradiction
    
- identity-level principle
    

也许每条 learned rule 都应该带：

- evidence
    
- confidence
    
- scope
    
- recency
    
- expiry
    
- counterexamples
    
- user-editability
    

这比“memory item”复杂，但非常关键。

---

## 4. Proactive agency 的真正触发条件

你图里有 Trigger System，但 trigger 不应该只是 cron 或事件。

Forme 的 trigger 应该至少有四类：

### Event trigger

文件变化、日历事件、消息进入。

### State trigger

项目长期停滞、open loop 堆积、系统健康下降。

### Pattern trigger

某种想法第三次出现、某类决策高度稳定。

### Opportunity trigger

外部世界出现一个与当前方向高度匹配的东西。

然后再经过 Timing Agent 判断：

> 现在是否值得打断？

所以：

```text
Trigger ≠ Notification
Trigger → Interpretation → Timing → Intervention
```

---

## 5. “不在场时仍在场”的授权模型

E8 很吸引人，但也是风险最高的一层。

需要区分：

- 展示我的状态
    
- 回答关于我的问题
    
- 代表我表达已有立场
    
- 替我提出建议
    
- 替我做承诺
    
- 替我执行行动
    

这些不是同一个 agency level。

Projection Agent 与 Action Agent 之间必须有明确分界。

否则 Digital Twin 很容易滑向 AI clone。

---

# 五、我会如何组织 Multi-Agent 图谱

你可以先画成三个圈层。

## Inner cognition

- Continuity Agent
    
- Reflection Agent
    
- Incubation Agent
    
- Judgment Agent
    

这四个主要负责理解和维护“内在实体”。

## Operational cognition

- Steward Agent
    
- Timing Agent
    
- Verification Agent
    

负责把理解转化为稳定、可信的系统运行。

## External cognition

- Projection Agent
    
- Action Agent
    
- Liaison / Federation Agent
    

负责与外部人、工具、Agent 和实体交互。

中间共享：

> Continuity Substrate / Entity State

外围统一经过：

> Trust, Policy, Agency Boundary

这样 Multi-Agent 就不是一排并列名称，而是一个认知生态。

---

# 六、一个可能更锋利的定义

你可以暂时把 Forme Multi-Agent 定义成：

> **A set of specialized cognitive agents that share one evolving entity state, but hold distinct responsibilities for continuity, reflection, incubation, judgment, maintenance, timing, verification, and projection.**

中文：

> **Forme 的多 Agent 不是多个独立助手，而是一组围绕同一持续演化实体、承担不同认知职责的专职 Agent。**

再进一步：

> 它们共享同一个“你”，但从不同时间尺度、认知任务和关系边界上理解你。

我觉得这句话能很好地稳住方向。

下一步最值得先深挖的是 **Agent 之间如何冲突、协商和把不确定性交还给用户**。因为一旦这个问题想清楚，Multi-Agent 才不只是 cognition 分工，而真正开始像一个认知系统。


# Prompt3
嗯嗯，我现在听你跟我讨论完只觉得Forme真的是挺复杂&charming的一个想法. 所以如果我想在一个月之内使用Agent编程来做一个MVP Demo，来让人们最能get到Forme到底想带给世人什么，你觉得我们可以划定一个什么样的scope?

# Answer
我会非常克制地切。

你一个月内不是要“做出 Forme”，而是要做出一个让人看完后突然理解：

> **原来未来的个人 Agent，不只是替我做任务，而是在持续理解我、维护我、延伸我。**

所以 MVP Demo 的目标，不该是证明架构完整，而是证明一个此前很难被感知的体验：

> **一个 Agent 真的在连续地跟着一个人生活，并且在正确时刻，把这个人带回自己、照见自己、延伸出去。**

## 我最建议的 Demo Scope

做一个围绕单个真实项目运行的 **Living Project Twin**。

不是管理整个 Vault，不是完整 Digital Twin，也不是多 Agent 平台。

只选一个真实、复杂、会持续变化的项目，比如 Forme 自己，让 Agent 对这个项目做到四件事：

### 1. 它知道你现在在哪里

用户离开项目几天后回来，Agent 主动给出：

- 上次做到哪里
    
- 期间发生了什么变化
    
- 哪些决定已经成立
    
- 哪些东西仍然悬而未决
    
- 现在最自然的下一步是什么
    

这是 **Continuity**。

### 2. 它看见你自己没看见的变化

Agent 不只总结笔记，而是指出一个跨时间形成的 pattern，例如：

> 你过去两周不断把 Forme 从“知识系统”描述成“实体 Agent”，但你的产品结构仍然围绕 Vault 展开。你的 Vision 已经前移，架构还没完全跟上。

这是 **Reflection**。

### 3. 它为你完成一次受控行动

Agent根据它对项目和你的判断，主动准备一项真实工作，例如：

- 重写一段产品定位
    
- 整理下一周开发计划
    
- 更新项目 SSOT
    
- 为一个潜在用户生成定制 Demo context
    
- 给协作者准备一份 project handoff
    

它先展示它准备做什么、依据是什么、改了什么，再由你批准执行。

这是 **Agency**。

### 4. 它生成一个让别人进入项目的受控切面

点击 “Share this project” 后，Agent 生成一个动态页面，让一个不认识你的人快速理解：

- 这个项目是什么
    
- 为什么存在
    
- 最近怎么变化
    
- 当前在做什么
    
- 哪些问题仍然开放
    
- 可以怎样参与
    

这不是静态 landing page，而是项目此刻的投影。

这是 **Presence**。

---

# 为什么这四步最合适

它刚好串起 Forme 最高 Vision 的四层：

```text
Continuity
→ Cognition
→ Agency
→ Presence
```

而且它们不是四个分裂功能，而是一条连续故事：

```text
Agent remembers where you are
→ understands how you are changing
→ acts with your judgment
→ represents the project when you are absent
```

这就是 Forme 最 charming 的地方。

不是某一张卡，不是 Vault maintenance，也不是 multi-agent orchestration，而是：

> **一个数字实体开始获得连续状态、理解、行动和对外存在。**

---

# Demo 最好只讲一个故事

不要做 dashboard tour。

做一个 3–5 分钟的完整场景。

## Demo 情境

你三天没有碰 Forme 项目。

### Scene 1：回来

打开 Forme。

它没有先问“今天需要什么帮助”，而是直接说：

> Welcome back. While you were away, the project moved in three meaningful ways.

然后呈现：

- 最近的新材料
    
- 当前状态变化
    
- 一个仍未关闭的核心问题
    
- 下一步建议
    

用户立刻恢复上下文。

### Scene 2：被看见

Agent 接着指出：

> I think the project itself has changed.

它引用过去几周的若干证据，展示：

- 旧产品理解
    
- 最近的语言变化
    
- 它推断出的新方向
    
- 它的不确定性
    

然后问：

> Is this an actual shift, or am I over-interpreting it?

用户纠正或确认。

这一刻最能让观众感觉：

> 它不是在搜笔记，它在持续形成对这个项目和这个人的理解。

### Scene 3：让它行动

确认方向后，Agent 提议：

> This shift now conflicts with your current project brief and demo narrative. I can update both while preserving the old version and showing you the diff.

用户批准。

Agent：

- 修改文档
    
- 更新当前 project state
    
- 记录判断依据
    
- 给出回执
    
- 保留 rollback
    

这一刻展示的是可信 agency。

### Scene 4：不在场时仍然在场

最后你点击：

> Generate collaborator projection

Forme 生成一个外部页面或对话界面。

另一个人可以问：

- What is Forme becoming?
    
- What decisions are already settled?
    
- Where could I contribute?
    
- What does Zayn still need to decide personally?
    

Projection 只使用允许公开的内容，并明确哪些问题必须交回本人。

这就是 Digital Twin 愿景第一次变得具体。

---

# 一个月内明确不做什么

为了不把自己拖进架构深渊，我建议直接砍掉：

- 完整 Multi-Agent 系统
    
- 全 Vault 泛化
    
- 自动屏幕捕获
    
- 通用 Skill / Plugin marketplace
    
- 自适应 Backend 生成
    
- 真正 always-on daemon 基础设施
    
- 复杂权限系统
    
- 完整 Taste Model
    
- Agent-to-Agent federation
    
- 生产级 Obsidian / Notion 双支持
    
- 通用 Generative UI runtime
    

这些可以在叙事里作为 future architecture，但不能进入这一个月的核心交付。

## Multi-Agent 怎么处理

可以在内部使用多个 agent role，但不要把它做成产品 feature。

例如幕后可以有：

- Continuity pass
    
- Reflection pass
    
- Action pass
    
- Projection pass
    
- Verification pass
    

但用户看到的始终是同一个 Forme。

也就是说：

> 架构上可以 multi-agent，体验上必须 single entity。

否则 Demo 会从“一个持续理解我的 Agent”退化成“几个机器人协作”。

---

# MVP 最小技术边界

## 数据范围

只支持：

- 一个本地 Markdown Vault
    
- 一个指定项目目录
    
- Git history
    
- 一份 decisions log
    
- 少量用户明确标记的外部资料
    

不要一开始读整个数字生活。

## 核心状态对象

只需要维护：

```text
Project Identity
Current State
Timeline
Confirmed Decisions
Open Questions
Emerging Patterns
User Corrections
Allowed Projection Scope
```

这已经足够支撑完整故事。

## 核心运行链

```text
Scan project
→ build current state
→ compare against previous state
→ detect meaningful shift
→ prepare intervention
→ user confirms/corrects
→ execute bounded action
→ update state
→ generate external projection
```

## 界面

一个界面就够：

### Project Twin View

里面只需要五块：

- **Now**
    
- **What Changed**
    
- **What Forme Sees**
    
- **What Forme Can Do**
    
- **Shareable Projection**
    

不用做复杂导航系统。

---

# 一个月的开发节奏

## Week 1：让它真正“知道项目”

建立：

- 项目扫描
    
- 时间线
    
- Git diff
    
- 当前状态生成
    
- 决策与 open questions 提取
    
- 手工校准基准
    

成功标准：

> 你离开一天回来，它能准确告诉你发生了什么。

## Week 2：让它“看见变化”

建立：

- 跨时间 comparison
    
- pattern / contradiction detection
    
- evidence-backed reflection
    
- 用户 correction
    
- inference confidence
    

成功标准：

> 它至少产生一次让你觉得“这个观察不是普通总结”的 insight。

## Week 3：让它“可信地行动”

建立：

- action proposal
    
- diff preview
    
- approval
    
- file update
    
- Git commit
    
- rollback
    
- verification receipt
    

成功标准：

> 你敢让它修改一个真实的 canonical document。

## Week 4：让它“对外存在”

建立：

- public-safe context extraction
    
- collaborator projection
    
- 角色化问答
    
- 权限边界
    
- Demo polish
    
- 预设但真实的数据路径
    

成功标准：

> 一个第一次看到 Forme 的人，能通过 Twin 页面理解项目，并感到这不是普通 portfolio 或 chatbot。

---

# 最关键的 Scope 判定标准

任何功能进入 MVP 前，都问：

> 它是否让观众更强烈地感受到“这个 Agent 在持续理解、维护并延伸一个实体”？

如果只是让系统：

- 更通用
    
- 更自动
    
- 更可配置
    
- 支持更多工具
    
- 看起来更像完整平台
    

但没有增强这份感受，就先不做。

---

# 我会给这个 Demo 一个内部名字

**Forme: A Living Project Twin**

一句话：

> A continuously evolving agent that remembers where a project is, notices what it is becoming, acts within earned trust, and represents it when its creator is absent.

中文：

> 一个持续生长的项目孪生体：它知道项目走到哪里，看见它正在变成什么，在获得信任后替它行动，并在创造者不在场时代表它存在。

这不是最高 Vision 的缩小版说明书。

它是最高 Vision 的一个**完整胚胎**。

哪怕只围绕一个项目，只要 Continuity、Reflection、Agency、Presence 四件事真的连起来，人们就会 get 到 Forme 想带来的世界。