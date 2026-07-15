# Reference Index — vault information base for the harness design (D1–D4)

> **Generated 2026-07-14** by a full-vault sweep: 517 files scanned (3 parallel read-only agents + synthesis), ~180 collected here.
> **Purpose**: the shared information base for the harness-first design phases (epic #37). D1 walks the cases in §D against the vision in §A; D2 decomposes against §B/§F/§G; D3 designs against §F/§H.
> **Paths** are vault-relative under the owner vault root (machine-local; see CLAUDE.md).
> **★** = load-bearing; unmarked = supporting; cluster lines = weak-but-real signal.
>
> ⚠️ **PRE-PUBLIC SWEEP ITEM**: this file contains private vault note titles and people names. It must be removed or scrubbed before the repo goes public (08-15 checklist).

## A. North star (vision)

- ★ `01_Raw/Transcripts/Forme Highest Vision - 2026-07-13.md` — the fullest articulation: 4 layers (understand → think with → act for → projection), twin↔twin network, "agency grows from long-term trust + judgment consistency + explicit authorization", "not another you" boundary.
- ★ `02_Wiki/Concepts/AI Twin.md` — judgment *fidelity* not memory; evaluation model (fidelity / robustness / boundary-awareness / reason-traceability / correction-loop / negative-examples); "which decisions must never be delegated."
- ★ `02_Wiki/Concepts/Knowledge Base as Cognitive Observatory.md` — person-as-superposition, projections, "continuity not total memory", human = judgment / system = storage-connection-recall.
- `01_Raw/Transcripts/Feeling to CCS.md` — "closure/verification interface = the control panel of the agent era"; "agent throughput ceiling = human verification bandwidth."
- `01_Raw/Project Materials/Cognitive Continuity System/CCS Project Materials Index.md` — the CCS predecessor: personal cognitive OS, Sense→Parse→Structure→Output, Morning Briefing as first MVP, "reduce context-restart cost."
- `01_Raw/Flomo/超级个体定义.md` — the user archetype (one person running a full business loop); `01_Raw/Flomo/My soul is half outside the world.md` — the externalization premise in one line.

## B. Product definition (binding scope)

- ★ `02_Wiki/Projects/Cognitive Continuity System.md` — **SSOT**. Core Loop, 16+ pillars, cognitive-primitive registry (6+3), two hard laws, agency ladder + 07-13 authorization inversion, GenUI guardrail, open decision points.
- ★ `02_Wiki/Frameworks/CCS MVP Spec.md` — requirements baseline (07-14 pivot banner supersedes the schedule, NOT the scope): 3 primitive cards + Taste panel, constrained-GenUI console, three-tier substrate, wake-catchup, agency dials, hard constraints #1–#7, loop addendum, relay post-MVP.
- `02_Wiki/Frameworks/CCS Product Baseline.md` — 13-pillar appendix; universal-vs-user-specific split; functional-decomposition scaffold for D2.
- `04_Index/个人输入品味菜单.md` — the taste-menu prototype (state × keyword × medium recommendation), pillar C12 in live form.

## C. Validated evidence (what is proven / falsified)

Core spine:
- ★ `03_Outputs/Reports/CCS Validation v2 - 2026-07-02.md` — FROZEN FINAL 07-14. Two hard laws, four experiments (C/E/V/R all 🟢, R=10/10), v1 falsifications re-checked, honest limits. The harness must not contradict this.
- ★ `99_Archive/目前Vault的四点观察.md` — the founding charter: four observations absorbed into C/V/R/E, incl. "human-side sync cost must → 0 (read-only, <5 min/day)" and the falsified static-navigation assumption.
- ★ `03_Outputs/Reports/CCS 回路修正与实验设计 - 2026-06-12.md` — where the four experiments were designed; negative-results catalog; Comprehension + Verification-economics as pillars 15/16.
- `03_Outputs/Reports/CCS Experiment Status (Live).md` — live handoff brief addressed to the agent: verified/falsified constraints, canonical doc map, agent boundaries. A proto-harness operating brief.
- `03_Outputs/Reports/Recall Log.md` — the raw R dataset (recall = right answer + right granularity + right moment).

Direct precursors of the harness:
- ★ `03_Outputs/Reports/Vault Agent Layer Drift Detection - 2026-06-03.md` — early spec of the drift-detection loop that became the card runner (workflow + guardrails).
- `03_Outputs/Reports/Vault 深度运行审计 - 2026-06-12.md` — catalog of failure modes the harness must detect.
- `03_Outputs/Reports/Recurring Work Externalization - 2026-05-31.md` — which recurring owner work should become scheduled agent jobs.
- `03_Outputs/Reports/AI Twin 判断实践 - Zayn Archive Interface 审稿 - 2026-06-04.md` — the prose ancestor of Taste Rules: judgment-replication with negative examples.
- `03_Outputs/Reports/Forme Skills Ecosystem Notes - 2026-07-12.md` — Skills/Plugins/MCP as packaging: "Tier-3 substrate is literally a SKILL.md"; runbook-as-code direction.

Context (commercial/strategy, sets external constraints):
- `03_Outputs/Reports/CCS MVP 调研 - 2026-07-01.md` — competitive landscape + intelligence-mechanism ROI ranking.
- `03_Outputs/Reports/CCS Commercialization Assessment - 2026-06-03.md` · `CCS 融资路径调研 - 2026-06-29.md` · `Forme Roadmap (Live).md` · `CCS Knowledge Layer Validation - 2026-06-03.md` · `Cognitive Continuity System Project Brief.md` · `Second Brain Product Discovery - 2026-05-26.md` · `外部化认知系统 - 2026-05-26.md` · `Knowledge Base as Social Interface.md`.
- Audit-loop instances (the propose→approve pattern in practice): `Concept Health Check - 2026-07-13.md` · `Weekly Review - 2026-07-13.md` (decision-receipt block) · `Trust Boundary Review - 2026-05-24.md` · `Vault Semantic Connectivity Audit - 2026-05-24.md` · `Concept Notes Quality Audit.md` · `Concept Health Check - 2026-05-24.md`.

## D. Cases — desired agent behavior, grouped by vision layer (D1 walk order)

### Layer 1 · understands you
- `01_Raw/Flomo/Second Brain长期工作记忆.md` — morning proactive push restores prior-day working memory before a deliverable (recall at the right moment).
- `01_Raw/Flomo/Second Brain与ChatGPT上下文.md` — context federation across AI surfaces.
- `01_Raw/Flomo/注意力与时间分配.md` + `02_Wiki/Concepts/Energy-Aware Scheduling.md` — energy/attention as a first-class state dimension feeding timing.
- `02_Wiki/Questions/How can AI preserve cognitive continuity without total memory?.md` — "restore enough context for the next move"; smallest-useful-context-packet.
- `02_Wiki/Concepts/Personal Context Engine.md` — context stack, pull-vs-push, relevance/timing/compression/trust.

### Layer 2 · thinks with you
- ★ First thought card (claim-drift, accepted 07-14; in `98_Forme/` + decisions.jsonl) — the product detecting that an old formulation no longer represents the owner.
- ★ `04_Index/Pattern Map.md` — load-bearing NEGATIVE result: static map falsified; correct rebirth = active entropy-reducing reflection (Pattern Reflection primitive).
- `01_Raw/Transcripts/David - Spiritual Entropy and Judgment.md` — judgment as "ancestry of a moment"; the twin needs a corpus that backs judgment, not just memory.
- `01_Raw/Flomo/Compound Meaning闭环.md` — input→structure→reuse→decision→better-input; the compounding loop to automate.
- `01_Raw/Flomo/机制与强执行力.md` — "机制 = 维持态, 强执行 = 相变"; support state changes, not only maintenance.
- `02_Wiki/Questions/What makes an AI Twin faithful rather than merely similar?.md` — faithful = preserves judgment-relevant structure + knows when to defer.

### Layer 3 · acts for you
- ★ `00_Inbox/Agent 自主整合与降熵 Case - 2026-07-14.md` — **flagship, same-day**: agent-led entropy reduction under graded authorization (pre-authorized lane / one-approval / per-item); human spent 3 decisions on 20+ ops; names authorization = confidence × reversibility × blast-radius; includes a time-delayed self-governance clause.
- ★ 回消息哲学 cluster: `01_Raw/Flomo/回消息哲学.md` (three-tier response system, confirmation-vs-reply) + `回消息哲学与Second Brain.md` (agent auto-replies non-urgent; human-in-loop for what matters) + `AI代写消息的边界.md` (the Azusa incident — AI-written msgs beget AI-written replies; own words for people who deserve care).
- ★ Autonomy lane in production: 11 `agent_authorized` executions with commit receipts (98_Forme/decisions.jsonl, 07-13→14) — grant → issue → silent execution in <4 days.
- `01_Raw/Flomo/Second Brain Task Agent设想.md` — long-horizon goal tracking that calls a specialist 法律Agent (delegation + sub-agent routing).
- `01_Raw/Flomo/西雅图咖啡店发现Pipeline.md` — autonomous taste loop: discover → filter by taste → notify → human tries → map/curate (includes a collaborator's taste).
- `01_Raw/Flomo/小红书收藏分析场景.md` — agent decides research to do from saved posts; end-of-day proactive prompt.
- `01_Raw/Flomo/手机使用机制.md` — proactive intervention ("external force > willpower") — the far edge of the acting-for-you spectrum.
- `01_Raw/Flomo/Spotify音乐分类场景.md` — ephemeral mini-app spun up for a one-shot taste-driven task (generative UI meets action).

### Layer 4 · projections (horizon for v1 — constrains interfaces, gets no build scope)
- `01_Raw/Transcripts/Lisa Vault Interaction Transcript - 2026-05-31.md` + `Lisa Knowledge Base Feedback - 2026-05-31.md` — a friend talking to the public-safe KB interface; role-guided entry in practice.
- `02_Wiki/Projects/Zayn Archive Interface.md` (+ `01_Raw/Project Materials/Zayn Archive Interface/…Index.md`) — the living public-projection prototype, user-tested (`01_Raw/Flomo/Chang Xie Archive Interface User Testing.md`).
- `01_Raw/Flomo/AI Twin筛选候选人.md` — Noah Liu's AI Twin screening 1500+ applicants; the judgment-replication 母题.
- `01_Raw/Flomo/向外展示当前状态.md` — status broadcast without becoming a black box.
- `01_Raw/Flomo/Second Brain送礼场景.md` — twin-to-twin: a friend's SB gives gift hints.
- `01_Raw/Flomo/Aroom Cafe Meetup与知识库展示.md` — David user-tests the vault; flags the privacy problem.

### Multi-agent / twin network (post-MVP, interface-constraining)
- `01_Raw/Flomo/CCS 多 Agent 分工与互相通信.md` + `02_Wiki/Concepts/Multi-Agent Knowledge Division.md` — topic-specialist agents that ask each other when knowledge runs out.

## E. Taste corpus (owner judgment evidence — feeds the taste bootstrap, #34)

- ★ `01_Raw/Flomo/训练建筑师性 - 给混沌赋形的能力.md` — the deepest single source on the owner's design judgment (form-giving, constraint-as-form, taxonomy-as-taste, self-critique ritual). Root of the name *Forme* (with `02_Wiki/Concepts/Architect-ness.md`).
- ★ `01_Raw/Flomo/聪明的系统 - Taste 与 Agency (Claude refined).md` + `(原版).md` — the agency ladder源头: dæmon / daimonion / Maxwell's demon; the two problems (how to hand taste to an agent; when it may act).
- `02_Wiki/Concepts/AI Judgment Replication.md` — taste-model spec: source-traces → meaning-radicals → relational-graph → judgment-in-context → human-correction; endorse-not-imitate.
- Aesthetics: `审美连续统 - 理性与感性的共同源头.md` · `Undifferentiated Aesthetic Continuum 解构.md` · `Creative视角的作品集评价.md` ("非如此不可") · `Creative判断体系来源.md` · `我想做一个什么样的 Studio.md` · `朋友眼中的建筑师与设计.md` · `INTDEV Demo Day复盘.md` (contrarian: taste forms by suffering through experience) · `02_Wiki/Concepts/Creative Judgment.md` · `Authorship.md`.
- Anti-flattening (what the twin must NOT do): ★ `01_Raw/Diary/Lucas谈不可琢磨性与活着感.md` + `01_Raw/Flomo/不可快速压缩的人.md` + `灵性作为不可压缩的感知能力.md` + `02_Wiki/Concepts/Productive Opacity.md` — preserve unfinished, un-nameable, still-changing states.
- Feedback weighting: `01_Raw/Flomo/外部认可与内部衡量器.md` (Impact = Praise × Credibility; reactions are data, not verdicts) + `外部反馈与AI判断边界.md` (AI perception must be externally validated).
- Voice/worldview: `01_Raw/Transcripts/Linguistic Pattern - 2026-05-29.md` (bilingual code-switching) · `反现代灵性宣言.md` · `灵性的集大成者.md` · `02_Wiki/Concepts/Bilingual Cognition.md` · `01_Raw/Flomo/Inter-Connection思维织网.md` · 康德 pair (`康德 - 知识始于经验但不来源于经验.md`, `康德 - 时间作为直觉.md`).
- Secondary (flagged by sweep as career/personal but taste-relevant if the taste layer expands): `03_Outputs/Reports/Zayn Working Model - 2026-05-24.md` · `工作偏好罗盘 - 2026-06-15.md` · `有趣与无聊交互模式 - 2026-05-26.md` · `Self Presentation and Language Pattern - 2026-05-29.md` · `稳定交付能力 - 2026-06-04.md` · `Lucas 不可琢磨性与活着感 - 2026-06-06.md`.

## F. Structural references (harness / agent / industry)

- ★ `01_Raw/Articles/Codex CLI & Loop Engineering.md` — the blueprint clipping: Codex harness 6 layers, runtime contract (input / read-env / act / request-auth / write-back); Loop Engineering 5 blocks + memory spine; loop interface `schedule/discover/plan/act/verify/commit`.
- ★ `00_Inbox/Codex & Claude Code Docs Index.md` — curated official-docs map for both substrates (CLI, sandbox/approvals, AGENTS.md, MCP, subagents, hooks, skills, `llms.txt` machine indexes). Primary doc map for D3.
- ★ `01_Raw/Transcripts/Proactive Agent by Claude.md` — initiative locus, 3 layers (perceive/reason/act), 2 axes (who initiates × propose-vs-act), "主动性给系统,决定权给人", discipline of silence.
- `01_Raw/Articles/2026-06-21 - Proactive AI 业界扫描与CCS关系 - Perplexity.md` — when-to-speak: workflow-boundary intervention, mixed-initiative, control layer.
- `01_Raw/Articles/2026-06-18 - Generative UI 业界扫描与CCS关系 - Perplexity.md` + `02_Wiki/Concepts/Generative UI as CCS Rendering Layer.md` — constrained GenUI: fixed primitives, model chooses/fills/triggers only.
- Agent taxonomy: `01_Raw/Flomo/Autonomous Agent定义.md` (6 necessary conditions) · `Cognitive Agent定义.md` (Observe→Think→Decide→Act→Evaluate) · `02_Wiki/Concepts/Autonomous Agent.md` ("where should it act alone") · `Cognitive Agent.md` · `Second Brain Task Agent.md` · `Research Agent.md`.
- Interaction primitives: `02_Wiki/Concepts/AI Product Interaction.md` (7 patterns + evaluation model) · `AI产品新型交互.md` · `Content Remix.md` · `Context-Linked Workflow.md` ("agent-read context ≠ human-read context") · `Boredom as Interaction Breakdown.md` (keep the loop participatory).
- System framing: `02_Wiki/Concepts/AI-native OS.md` · `LLM Knowledge Base.md` · `Compounding Knowledge System.md` · `Personal Knowledge Management.md` · `State Drift.md` · `Graph Theory.md` · `01_Raw/Flomo/认知风格与外部系统.md` ("agent runtime, 个人操作系统") · `Second Brain维护痛点.md` (why manual PKM collapses) · `01_Raw/Transcripts/Obsidian Vault UX Refinement.md` (AI as Navigator+Operator+Thinking-Partner).
- Strategy color: `01_Raw/Articles/A frontier without an ecosystem is not stable.md` (taste portability across substrates) · `GPT 5.6 vs. Fable 5.md` (model routing) · `01_Raw/Flomo/Agent Harness架构设计.md` (thin seed, flags the topic) · `00_Inbox/小红书视频选题.md` (owner's own agent-orchestration workflow as content) · `01_Raw/Flomo/Embodied Hardware与CCS输入接口.md` (future Sense inputs).

## G. The living prototype (the vault agent = unproductized Forme)

- ★ `AI Operating Spec.md` — the richest harness-behavior reference: operating mindset, intent routing, repeated-work externalization, trust boundary, conservative defaults.
- ★ `04_Index/Workflows.md` — full workflow router with per-workflow "AI can do / human must judge" splits + default-auto vs default-forbidden lists. A permission spec in production.
- ★ `04_Index/AI Work Contracts.md` — 13 executable contracts (C1–C13), each with trigger/goal/inputs/steps/human-review/stop-condition. The contract-registry pillar working today.
- ★ `04_Index/Scheduled Agent Maintenance.md` — allowed-auto / requires-confirmation / do-not-automate-yet. Agency defaults in production.
- `04_Index/Forme Console.md` — the live dogfood log (dated, through 07-14) · `04_Index/Forme Build Workflow.md` — two-space protocol governance · `04_Index/Daily Briefing Workflow.md` — read-only comprehension sync + "any protocol that asks the human to write will die" · `04_Index/Flomo Sync Workflow.md` — ingest connector spec (validate-before-ack) · `AGENTS.md` + `CLAUDE.md` + `Human Operating Spec.md` + `README.md`.
- Navigation/action surfaces: `Home.md` · `Topic Map.md` · `Action Index.md` · `Career Action Console.md` ("console = do not read"; self-check kills meta-work) · `People Index.md` · `Open Questions.md` · `Routine Workflow Bundle.md` · the `.base` files + `Knowledge Map.canvas`.
- Invocation patterns: `05_Templates/AI Prompts/` (Triage / Navigate / Audit / Upgrade / Cluster→Writing) · `Concept Audit Template.md` · `Weekly Review Template.md` · `Flomo Sync Run Report Template.md`.
- ★ Failure exhibit: `05_Templates/Daily Briefing Template.md` — the human-fill briefing that died in 7 days; the concrete corpse behind hard law #1.

## H. Runtime dataset (98_Forme/ snapshot, 2026-07-14)

- **49 cards** (JSON + MD mirror pairs). Categories: stale-claim 21 · timestamp-freshness 11 · dangling-task 10 · stale-frontmatter 3 · orphan 1 · naming-drift 1 · claim-drift 1 · broken-link 1. Stakes: reversible-ledger 20 · real-world-action 10 · thought 1 · absent (older schema) 18.
- **decisions.jsonl: 101 events** — decision 52 (owner 41, agent_authorized 11) · presented 43 · correction 4 · question 2. Choices: accept 47 · park 4 · reject 1. 30 rows carry corrections; 2 q-key round-trips.
- **run-metrics.jsonl: 25 runs** (07-05 → 07-14), funnel proposed→suppressed→presented→rejected + dup/illegible/thought/authorized counters + head hash.
- **Taste Rules.md: 4 rules** (R1–R4), all confidence low / status candidate / re-verify after 20 decisions; human edit = final arbiter.
- **state-diff-2026-07-07.md** — the weekly wake-briefing artifact (incl. meta-work canary alert).
- Firsts on record: first full loop 07-06 · first park + first advice-disagreement 07-09 · first correction 07-09 · first authorized executions 07-13 · first reject + first thought card 07-14.

## I. Constraints & boundaries (binding on any design)

- ★ `02_Wiki/Frameworks/Trust Boundary Model.md` — four layers (Raw-Private → Synthesized-Private → Public-Pattern → Public-Artifact); "observe patterns, don't expose raw intimacy"; AI-perception-is-hypothesis.
- ★ `02_Wiki/Frameworks/Role-Guided Social Interface.md` — role-based external-entry ACL (6 roles); the projection ACL model relay reuses.
- `02_Wiki/Frameworks/Collaborative Ownership Boundary.md` + `01_Raw/Transcripts/合作项目中的责权边界.md` — "feedback open, ownership clear"; decision-rights model for human-vs-agent authority.
- `02_Wiki/Concepts/Replying Philosophy.md` — AI-drafted personal replies weaken authenticity; boundary for any outbound lane.
- Boundary questions: `02_Wiki/Questions/What public-private boundary should a cognitive observatory use?.md` · `How can private patterns become public writing without overexposure?.md`.
- Standing rulings (recorded in SSOT/spec/epic #37): no harness fork; official substrate surfaces only; hard constraint #7 (LLM lane read-only, writes via deterministic code); crash-equivalence; `98_Forme/` = only vault write surface; evidence-driven (not tenure-driven) autonomy; certification aging.

## J. Parked / coverage notes

- `01_Raw/Transcripts/Lucas Feedback on CCS.md` — **parked by owner order**, not summarized, not an input until unparked. (Epic #37 cited it under `00_Inbox/` — actual location is `01_Raw/Transcripts/`.)
- Excluded as off-track after inspection: career-track reports & consoles, portfolio/outreach drafts, personal-life Flomo (~60 notes), rent/health/hobby items. Full sweep coverage: 517 files, all inspected at frontmatter+structure level minimum.
- Six personal-model reports (Zayn Working Model etc., listed in §E) sit on the career side but are flagged as secondary taste inputs.
