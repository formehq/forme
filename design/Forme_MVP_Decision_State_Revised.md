# MVP Decision State — certainties, defaults, open questions

**Status**: living document · maintained by the vault agent · only the owner (Zayn) moves items between sections.  
**Created**: 2026-07-14 (D1 evening) · child of epic #37 · running log: issue #38.  
**Revised**: 2026-07-14 after owner review of the first draft.  
**Purpose**: the single place that records what is settled, what the team may safely draft against, and what is genuinely open. The product doc and the tech doc must trace every material claim back to this file. Anything not traceable here is opinion, not context.

How to read the three states:

- **CONFIRMED** — owner-decided, evidence-validated, or already enforced as a standing product constraint. Build may rely on it.
- **WORKING DEFAULT** — the current recommended interpretation. Safe to draft against, but not yet owner-confirmed.
- **OPEN** — genuinely undecided. Each item includes options, a recommended default, a decide-by date, and what it blocks.

---

## 0 · MVP demo claim

The one-month MVP does **not** attempt to build the full Forme vision. It must make one coherent claim believable:

> A project can maintain a continuous, evolving state beyond any single document or chat session. An agent can understand meaningful changes in what that project is becoming, act within explicit and reversible trust boundaries, and generate a controlled external projection when the owner is absent.

After the 08-15 demo, an observer should believe four things:

1. **Continuity** — the project can carry its state across interruption and tool boundaries.
2. **Cognition** — the agent can notice a meaningful change, tension, or pattern and show its evidence and uncertainty.
3. **Bounded Agency** — the agent can act on that understanding without hiding what changed or removing owner control.
4. **Controlled Presence** — the same living state can produce a current, role-scoped external projection without exposing the private vault.

The demo must feel like **one entity becoming continuous, understandable, actionable, and projectable**, not four unrelated features.

---

## 1 · CONFIRMED

### 1.1 Vision frame

| Item | Source |
| --- | --- |
| Requirements are distilled from **target effects**, not feature lists. The owner rejected the R1–R5 style because it lacked lived meaning. | Owner, 2026-07-14 |
| Highest vision: Forme extends an entity across four dimensions — **Continuity, Cognition, Agency, and Presence**. Its long-term form is a controllable digital counterpart that can understand, maintain, extend, and project the entity without replacing the entity’s authorship. | Highest-vision discussion, 2026-07-13 to 2026-07-14 |
| Twin-to-twin interaction is the horizon, not the current scope. | Highest-vision discussion |
| Forme must not be reduced to a knowledge-maintenance product, a card interface, or a project dashboard. Those may be implementation forms, not the product definition. | Owner clarification, 2026-07-14 |
| The one-month MVP should demonstrate the vision through a **Living Project Twin**, using Forme itself as the first entity. | Owner review, 2026-07-14 |
| **Living Project Twin is adopted as the D4 deliverable and the 08-15 demo frame**, with the state substrate treated as one component rather than the twin itself. | Owner confirmation, 2026-07-15 |
| **Codex and OpenCode are both first-class runtime integration targets.** Forme must preserve each runtime's native advantages instead of reducing both to a lowest-common-denominator experience. | Owner confirmation, 2026-07-15 |

### 1.2 Constitutional floor

These are not optional UX preferences. They are the product’s constitutional constraints.

| Constraint | Meaning |
| --- | --- |
| **Authorship** | Forme may model, assist, and extend the owner, but it may not claim final authority over who the owner is or what the owner means. |
| **Legibility** | As autonomy increases, the owner’s ability to understand, correct, inspect, and reverse system behavior must not decrease. |
| **Reversibility** | Meaningful writes and actions must preserve provenance, receipts, and rollback where feasible. |
| **Non-finality** | Learned rules must remain scoped, evidence-backed, revisable, and capable of aging out. |
| **Controlled Projection** | Private existence in the vault never implies permission to appear in an external projection. |

### 1.3 Hard constraints

| Constraint | Source |
| --- | --- |
| **#7**: the LLM lane is read-only and returns JSON only; every disk write is executed by deterministic Forme code. | 2026-07-04 |
| No product path may rely on users’ Claude subscriptions. Codex and OpenCode are both first-class runtime targets; implementation may be staged, but the architecture must not demote either to an afterthought. SKILL.md remains a portable packaging surface. | 2026-07-04 plus owner update, 2026-07-15 |
| Intelligence must not require a resident process. Demo form = laptop wake-catchup. | Epic #37 / 2026-07-06 |
| Crash-equivalence: a session is a disposable shell; truth lives in the substrate (`decisions.jsonl`, taste rules, project state, snapshots). | 2026-07-13 |
| Runtime products write only to vault `98_Forme/`. | Standing |
| Forme-track surfaces are English from 2026-07-09 forward; owner inputs may remain any language. | 2026-07-09 |
| Pre-public sweep before the repo flips public on 08-15: strip local absolute paths, run privacy sweep, and scrub or remove `design/reference-index.md`. | Standing + 2026-07-14 |
| Conservative by default in the vault: no delete, merge, archive, publish, or externally visible action without owner approval. | Standing |
| **Projection may compile only from an explicit Allowed Projection Scope. It must never read the vault directly at render time.** | Upgraded from previous W4 after privacy review |

### 1.4 Calendar anchors

| Date | Anchor |
| --- | --- |
| **08-15** | INTDEV Expo 3-minute demo + public launch + repo public = MVP round-1 finish line |
| **08-08** | Demo scope freeze |
| ~08-01 | First non-self installs |
| ~08-09 | AI Grant Batch 4 opens; no bespoke material gets made for it |
| End of Aug | Owner leaves the US for Beijing/Shanghai; US in-person window closes |

### 1.5 Facts on the ground

- Built and running: vault scanner, state-diff generator, decision cards, accept executor with receipts and rollback, `decisions.jsonl`, Taste Rules v0, and autonomy lane tier 1.
- Current runtime data: 49 cards, 101 events, 52 decisions, 47 accept, 4 park, 1 reject.
- Cross-time reflection is the highest-variance capability. Ten days of daily runs produced exactly one thought card.
- The current runtime continues through D1–D4 as live requirements data.
- Missing history is not recoverable; schema churn is acceptable.

---

## 2 · WORKING DEFAULTS

### 2.1 Target-effects model

The current candidate effects model is:

- **E1 · 断点即续点**
- **E2 · 熵自己降**
- **E3 · 注意力只花在判断上**
- **E4 · 定期被自己照亮**
- **E5 · 半成品想法不会死**
- **E6 · 你敢放手**
- **E7 · 世界按你的 taste 来找你**
- **E8 · 你不在场时，你仍在场**
- **E9 · 它永远不把你定型**
- **E10 · 上下文随你迁移**
- **E11 · 自主性增长，但控制感不下降**

Current interpretation:

- E1–E3 primarily express **Continuity**
- E4–E5 primarily express **Cognition**
- E6–E7 primarily express **Agency**
- E8 primarily expresses **Presence**
- E9 and E11 form the constitutional floor: **Authorship + Legibility**
- E6 is best understood as an **earned-trust state**, not a standalone feature

This model is safe to draft against, but the owner has not yet confirmed the final wording of all eleven effects.

### 2.2 MVP system shape

| # | Default | Note |
| --- | --- | --- |
| W1 | **MVP core = an evolving project-state substrate + a continuity loop + a judgment boundary.** | The substrate maintains what the project currently is; the loop updates it on meaningful events; the judgment boundary lets the owner confirm, correct, reject, or authorize the system’s interpretation. |
| W2 | The state substrate is not the product itself. It is the source from which restart, reflection, action, and projection emerge. | Prevents the MVP from collapsing into an auto-maintained project brief or dashboard. |
| W3 | Forme itself is the first Living Project Twin. For this MVP it is seeded mainly from Zayn’s context, but architecturally a project twin remains a distinct entity, not merely a projection of the person twin. | Important future entity-model guardrail. |
| W4 | The experience presents as one coherent Forme entity. Implementation may use sequential cognitive passes or specialized agents internally. | Do not expose a “team of bots” in the MVP. |
| W5 | The first timing primitive is the **wake/restart boundary**. The MVP does not build a general timing engine. | This is an explicit timing hypothesis, not just an engineering shortcut. |
| W6 | Only genuinely meaningful events update or surface the twin. “Daily loop” must not imply a mandatory daily briefing or daily owner review. | Avoids repeating the failed Daily Briefing pattern. |
| W7 | Scope gate for any feature: both must be yes: (a) does it strengthen the feeling that the agent continuously understands, maintains, and extends an entity? (b) does the owner genuinely use it in daily life? | Anti-generic and anti-theater gate. |
| W8 | The first connector abstraction accepts either a **local project directory** or an **exported notes mirror**. Original source material remains distinct from normalized, derived, and Forme-owned state. | Apple Notes export evidence in issue #30 already establishes the first notes-mirror case. |
| W9 | Presence decomposes into a private twin, an explicit published projection, an asynchronous mailbox, and a delegation policy. | This is the smallest coherent shape of the owner’s 2026-07-15 projection-interaction direction. |
| W10 | A server-side Projection Agent receives only the published projection, message thread, and delegation policy—not the private twin or raw notes. | Keeps Controlled Projection enforceable if asynchronous interaction enters the MVP. |
| W11 | The shared runtime port defines a small stable lifecycle plus capability negotiation. Codex- and OpenCode-specific strengths remain available through declared capabilities. | “Runtime-neutral, runtime-native,” not forced feature parity. |

### 2.3 Project-state substrate v0

Recommended fields:

1. **Project Identity**
2. **Active Intent / Direction**
3. **Current State**
4. **Timeline**
5. **Confirmed Decisions**
6. **Open Questions**
7. **Unresolved Tensions**
8. **Emerging Patterns**
9. **User Corrections**
10. **Allowed Projection Scope**

Notes:

- **Active Intent / Direction** preserves trajectory, not just status.
- **Unresolved Tensions** must remain distinct from open questions. Some tensions should be held, not solved.
- Timeline may later collapse into Current State if the object needs to stay smaller.
- User Corrections may later be referenced from decision history rather than duplicated.

### 2.4 Internal cognition model

For this MVP, cognition-based multi-agent behavior is implemented as internal passes:

- **Continuity pass** — where the project is, what changed, what is unfinished
- **Reflection pass** — what the project may be becoming, with evidence and uncertainty
- **Action pass** — what bounded action follows from the confirmed understanding
- **Projection pass** — what may be shown externally under an explicit scope
- **Verification pass** — whether the action or projection satisfies deterministic constraints

This is an implementation default, not the final long-term multi-agent architecture.

---

## 3 · OPEN — owner decisions

| ID | Question | Options | Recommended default | Decide by | Blocks |
| --- | --- | --- | --- | --- | --- |
| O2 | Finalize the effects language as E1–E11 grouped under Continuity / Cognition / Agency / Presence, with Authorship / Legibility as floors? | yes / revise / retain earlier frame | Revise once for owner resonance, then confirm | Product-doc review | Product lead section |
| O3 | Projection surface form | (a) deterministic static page · (b) interactive Q&A surface | (a) for 08-15; (b) post-MVP | D3 (~07-21) | Projection implementation |
| O4 | Twin View carrier | (a) markdown console · (b) deterministic local HTML · (c) web app | Keep (a) as daily driver; add (b) only if the core loop lands by 08-01; (c) out of scope | D3 | UI and demo staging |
| O5 | First non-self pilot objective | (a) portability/install · (b) one-project continuity value · (c) full project twin | Test (a) + a narrow form of (b); do not require reflection, projection, or taste convergence | 07-28 | Onboarding and pilot script |
| O6 | Archive `00_Inbox/Forme Brainstorm.md` to `01_Raw/Transcripts/` with provenance header | yes / leave | Yes | Anytime | Nothing |
| O7 | Does the 08-15 build include an asynchronous mailbox interaction, or only preserve the protocol seam? | (a) projection only · (b) invite-only mailbox with owner-approved replies · (c) autonomous twin-to-twin interaction | **(b) only after Scenes 1–3 are real; otherwise ship (a) with the message envelope contract.** | D3 scope lock | Server scope and demo Scene 4 |
| O8 | What is the first published projection entity? | (a) project collaboration projection · (b) personal collaboration profile · (c) both | **(a)** for the one-month MVP; it is narrower, evidence-linked, and consistent with the Living Project Twin frame. | Projection implementation | Projection schema and onboarding copy |

---

## 4 · OPEN — technical questions

| ID | Question | Default | Risk note |
| --- | --- | --- | --- |
| T1 | Reflection mechanism | Snapshot comparison plus selective retrieval from underlying evidence. Inputs should include state snapshots, decision history, repeated language, user corrections, unresolved tensions, and recent artifacts. Output remains read-only JSON with confidence and evidence references. | Snapshot-only reflection may detect state drift but miss the “it sees me” moment. |
| T2 | Reflection success criterion | At least one non-trivial, evidence-backed reflection before 08-08 that the owner judges as more than summary or restatement. | A single thought card is evidence, but not automatically sufficient unless it clears this quality bar. |
| T3 | State format and home | `state.md` for humans + `state.json` for machines in `98_Forme/twin/`; snapshots in `98_Forme/twin/snapshots/YYYY-MM-DD.json`. | Must preserve provenance and crash-equivalence. |
| T4 | Scan scope | Explicit allowlist: `98_Forme/` + named Forme-track notes + Forme repo git log. Never heuristic. | The allowlist is both relevance control and privacy perimeter. |
| T5 | Snapshot cadence | First wake after a meaningful gap + before/after accepted action execution + optional daily snapshot while the experiment runs. | Calendar-time history must start immediately. |
| T6 | Pass orchestration | Extend the existing runner with sequential read-only passes; no daemon, no new infrastructure. | Keep the architecture disposable and inspectable. |
| T7 | Relationship to current runtime | Evolve in place behind `--twin`; vault-wide drift scan continues unchanged in parallel. | Do not break the live evidence layer. |
| T8 | Projection payload | Projection must include current temporal state, explicit agency boundary, freshness, provenance, and unresolved hypotheses. | Without these, Presence degrades into an AI-generated About page. |

---

## 5 · Scene requirements

### Scene 1 · Continuity

At a natural restart boundary, Forme must reconstruct:

- where the project was
- what changed during absence
- active intent
- confirmed decisions
- unresolved tensions
- the most natural next move

Success is not “a good summary.” Success is that the owner can resume without reconstructing the project manually.

### Scene 2 · Cognition

Forme must surface one evidence-backed interpretation that is:

- cross-time
- not obvious from a single note
- explicitly uncertain
- correctable by the owner
- connected to what the project may be becoming

A summary, keyword cluster, or restatement does not count.

### Scene 3 · Bounded Agency

After owner confirmation, Forme may propose and execute one real, bounded action:

- show intended action
- show evidence and reasoning inputs
- show diff before or immediately after
- execute through deterministic code
- record receipt
- support rollback

The point is not automation volume. The point is earned trust.

### Scene 4 · Controlled Presence

Forme generates a current external projection from the Allowed Projection Scope only.

The projection must show:

- what the project is currently becoming
- what changed recently
- what is confirmed
- what remains unresolved
- what the projection may answer
- what still requires Zayn
- last synchronized time
- provenance/freshness state

This must feel like a living, bounded projection of an entity, not a generated landing page.

---

## 6 · Standing risks

- **R1 · Reflection variance**  
  Snapshot history is the only input that cannot be compressed. Start immediately.

- **R2 · Theater risk**  
  Every scene must be part of the owner’s genuine daily workflow. No synthetic “preset but real” path that exists only for the stage.

- **R3 · Product collapse**  
  The state substrate may pull the MVP toward project management, SSOT maintenance, or dashboarding. Re-run the W7 scope gate continuously.

- **R4 · Privacy leakage**  
  Projection must be whitelist-based and deterministic in its source scope.

- **R5 · Presence collapse**  
  A static page can accidentally become a polished About page. Temporal state, agency boundary, freshness, and provenance are mandatory.

- **R6 · Overclaiming reflection**  
  “It sees me” must not be declared from a merely fluent summary.

- **R7 · Entity-model confusion**  
  The Forme project twin is not permanently defined as a slice of Zayn’s person twin.

- **R8 · MVP choice becoming doctrine**  
  Sequential internal passes are a one-month implementation decision, not a final theory of cognition-based multi-agent architecture.

- **R9 · Projection-network scope expansion**  
  The mailbox idea strengthens Presence, but identity, abuse prevention, consent, and delegation can consume the entire MVP. Preserve the protocol seam now; build only the invite-only, owner-approved slice if the private-twin loop is already real.

- **R10 · Lowest-common-denominator runtime abstraction**  
  A shared port can accidentally erase Codex sandbox advantages or OpenCode plugin/provider advantages. Keep the base lifecycle small and expose explicit capability flags.

---

## 7 · Unblocked now

1. Start snapshot history immediately.
2. Draft project-state substrate v0 using the ten-field schema.
3. Mark all source items with provenance and scope.
4. Draft the product doc from the MVP Demo Claim.
5. Run the first reflection pass early, then inspect why it fails.
6. Define the first projection whitelist before building the projection renderer.

---

## 8 · Decision hygiene

- Only the owner moves items into **CONFIRMED**.
- Agent-generated interpretations remain **WORKING DEFAULTS** until reviewed.
- A build artifact does not become a product truth merely because it exists.
- MVP implementation choices must not silently become long-term architecture claims.
- Every external projection must distinguish:
  - confirmed state
  - agent inference
  - unresolved tension
  - owner-only decision

---

## Changelog

- **2026-07-14** — first version created by the vault agent from D1 discussions and runtime data.
- **2026-07-14** — revised after owner review:
  - moved E1–E11 into working-default status
  - separated target effects from constitutional constraints
  - reframed the dossier as a state substrate, not the product
  - added Active Intent and Unresolved Tensions
  - clarified project-twin independence from person-twin projection
  - strengthened reflection inputs and success criteria
  - upgraded projection whitelist to hard constraint
  - clarified wake/restart as the first timing primitive
  - added the MVP Demo Claim and scene-level success requirements
- **2026-07-15** — owner confirmed Living Project Twin and elevated Codex plus OpenCode to first-class runtime targets; added project/notes connector shape, projection-mailbox working defaults, and explicit scope decisions O7–O8.
