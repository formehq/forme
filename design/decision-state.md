# MVP Decision State — certainties, defaults, open questions

**Status**: living document · maintained by the vault agent · only the owner (Zayn) moves items between sections.
**Created**: 2026-07-14 (D1 evening) · child of epic #37 · running log: issue #38.
**Purpose**: the single place that records what is settled, what we draft against by default, and what is genuinely open. The product doc and the tech doc must trace every claim back to this file. Anything not traceable here is opinion, not context.

How to read the three states:

- **CONFIRMED** — owner-decided (dated) or evidence-validated. Build may rely on it.
- **WORKING DEFAULT** — vault agent's recommendation. Safe to draft against. Owner strikes it or upgrades it to CONFIRMED at the next review.
- **OPEN** — genuinely undecided. Each has options, a recommended default, a decide-by date, and a list of what it blocks.

---

## 1 · CONFIRMED

### 1.1 Vision & effects

| Item | Source |
| --- | --- |
| Requirements are distilled from **target effects**, not feature lists. Owner rejected the R1–R5 style ("没有实感"). | Owner, 2026-07-14 |
| Target effects **E1–E9** are the accepted top-level frame (E1 断点即续点 · E2 熵自己降 · E3 注意力只花在判断上 · E4 定期被自己照亮 · E5 半成品想法不会死 · E6 你敢放手 · E7 世界按 taste 找你 · E8 不在场仍在场 · E9 永不定型). | Walked with owner 2026-07-14; owner carried them into his own external brainstorm |
| Highest vision = four layers: understands you → thinks with you → acts for you → digital projection. Twin↔twin network is horizon, not scope. | `01_Raw/Transcripts/Forme Highest Vision - 2026-07-13.md` |
| Falsifiable checkpoint before 08-15: at least one "it sees me" thought-card moment. First occurrence already happened 2026-07-14 (thought card #1). | Vision doc + runtime record |

### 1.2 Hard constraints (carried rulings — none new today)

| Constraint | Source |
| --- | --- |
| **#7**: the LLM lane is read-only and returns JSON only; every disk write is executed by deterministic Forme code. | 2026-07-04 |
| No product path may rely on users' Claude subscriptions (Anthropic consumer-OAuth ban; SKILL.md third-party path is the compliant lane). Substrate = three tiers: Codex CLI default / OpenCode Tier 2 (W7) / SKILL.md. | 2026-07-04, issues #2/#3 |
| Intelligence must not require a resident process. Demo form = laptop wake-catchup. | Epic #37 / 2026-07-06 |
| Crash-equivalence: a session is a disposable shell; truth lives in the substrate (decisions.jsonl + taste rules + state). | 2026-07-13 |
| Runtime products write only to vault `98_Forme/`. | Standing |
| Forme-track surfaces are English from 2026-07-09 forward; owner inputs stay any-language. | 2026-07-09 |
| Pre-public sweep before the repo flips public (08-15): strip local absolute paths; privacy sweep; **scrub or remove `design/reference-index.md`** (contains private vault note titles). | Standing + 2026-07-14 |
| Conservative by default in the vault: no delete / merge / archive / publish without owner approval. | Standing |

### 1.3 Calendar (hard anchors)

| Date | Anchor |
| --- | --- |
| **08-15** | INTDEV Expo 3-min demo + public launch + repo public = MVP round-1 finish line |
| **08-08** | Demo scope freeze |
| ~08-01± | First non-self installs (Esther & Lucas rescheduled 07-14; message sent) |
| ~08-09 | AI Grant Batch 4 opens — no bespoke material gets made for it |
| End of Aug | Owner leaves the US for Beijing/Shanghai; US in-person window closes |

### 1.4 Facts on the ground (runtime, as of 2026-07-14)

- Built and running: vault scanner · state-diff generator · decision cards (49) · accept executor with receipts + rollback · `decisions.jsonl` (101 events; 52 decisions = 41 owner + 11 agent-authorized; 47 accept / 4 park / 1 reject) · Taste Rules v0 (4 low-confidence candidates) · autonomy lane tier 1 (freshness) live.
- **Measured variance warning**: cross-time reflection is the highest-variance capability — ten days of daily runs produced exactly one thought card. Any schedule that gives it "one week" is not credible.
- The current runtime keeps running through D1–D4 as live requirements data.

---

## 2 · WORKING DEFAULTS (draft against these; strike at review)

| # | Default | Note |
| --- | --- | --- |
| W1 | **MVP core system = three pieces**: a living dossier (project state object) + a daily loop that maintains it + a judgment interface (cards). Everything else — welcome-back greeting, projection — is an outlet reading from the dossier. | Discussed 2026-07-14; matches brainstorm's minimal chain and the runtime's real shape. Diagram: see artifact "Forme 架构示意" 2026-07-14 |
| W2 | Dossier v0 = 8 fields: Project Identity / Current State / Timeline / Confirmed Decisions / Open Questions / Emerging Patterns / User Corrections / Allowed Projection Scope. | From brainstorm's minimal state object, unmodified |
| W3 | Only **four genuinely new builds**: the dossier, snapshot history, the dossier updater, the projection page. Everything else is retargeting existing runtime code. | Inventory 2026-07-14 |
| W4 | **Projection compiles from the Allowed Projection Scope whitelist only; it never reads the vault directly.** | Proposed 2026-07-14 after the reference-index privacy incident. Recommend upgrading to hard constraint at next review |
| W5 | Effects registry update: adopt **E10** (context migrates with you) and **E11** (autonomy grows, legibility doesn't drop); reclassify **E6** as earned-trust state, not a feature; **E9 + E11** form the constitutional floor (Authorship + Legibility). Four layers renamed **Continuity / Cognition / Agency / Presence**. | From owner's external brainstorm 2026-07-14; vault agent endorses |
| W6 | **Timing engine**: the one organ with zero embryo. First-class D2 discussion item; NOT in this month's scope. v1 relies on a single natural timing hook — the wake/restart moment. | Convergent finding: brainstorm + all vault cases share the "picks its moment" step |
| W7 | Multi-agent = internal passes only (continuity / reflection / action / projection / verification). The experience is always a single entity. | Brainstorm principle, consistent with #7 |
| W8 | Scope gate for any feature, two questions and both must be yes: (a) does it make an observer feel "this agent continuously understands, maintains, and extends an entity"? (b) is it something the owner actually uses in daily life? | (a) from brainstorm; (b) added 2026-07-14 as the anti-theater guard |

---

## 3 · OPEN — owner decisions

| ID | Question | Options | Default (vault agent) | Decide by | Blocks |
| --- | --- | --- | --- | --- | --- |
| **O1** | **North star: adopt "Living Project Twin" (4 scenes: Continuity / Reflection / Agency / Presence, project = Forme itself) as the D4 deliverable and the 08-15 demo shape?** | adopt / reject / modify | **Adopt.** Timeline math works (one month lands on 08-14; W1 and W3 of the four-week rhythm are half-built). Choosing Forme itself as the project makes the project twin a privacy-safe slice of the person twin. | **Now** — it gates the product doc | Product doc framing; D2/D3 convergence; everything below inherits its shape |
| O2 | Projection surface form (Scene 4) | (a) generated static page with curated Q&A · (b) interactive Q&A agent surface | (a) for 08-15; (b) is post-MVP. An order of magnitude cheaper and still lands Presence | D3 (~07-21) | Tech doc §projection; Week-4 estimate |
| O3 | Twin View carrier | (a) markdown console in vault (current) · (b) deterministic generated local HTML view, no server · (c) web app | (a) stays the daily driver; add (b) for the demo **only if** W1–W2 land by 08-01; (c) out of scope | D3 (~07-21) | Tech doc §UI; demo staging |
| O4 | Install scope ~08-01: what do Esther & Lucas actually install? | (a) current card runtime (stable) · (b) project twin pointed at their own project | Plan (a), stretch (b). Decide from D4 progress | 07-28 | Install prep; onboarding material |
| O5 | Upgrade the four-layer effects language (Continuity / Cognition / Agency / Presence + Authorship / Legibility floors) to the product-definition language in SSOT and the product doc? | yes / keep old wording | Yes — but only if the owner reads it with 实感; that is the whole criterion | Product-doc review | Product doc lead section wording |
| O6 | Archive `00_Inbox/Forme Brainstorm.md` → `01_Raw/Transcripts/` with provenance header | yes / leave | Yes (routine intake) | Anytime | Nothing |

---

## 4 · OPEN — technical questions (resolve in D3, build side)

| ID | Question | Default | Risk note |
| --- | --- | --- | --- |
| T1 | **Reflection mechanism** (Scene 2, the highest-risk item) | Daily dossier snapshot → weekly comparison pass (LLM, read-only, JSON out with confidence + evidence refs per #7) → emits a thought/tension card when a threshold is met | Snapshots start **now**; comparison runs weekly from week 1 so variance surfaces early. Demo bar: ≥1 non-trivial evidence-backed reflection before 08-08. Fallback if none by 08-01: Scene 2 uses the real 07-14 thought card |
| T2 | Dossier format & home | `state.md` (human) + `state.json` (machine) twins, like cards; lives in vault `98_Forme/twin/`; snapshots in `98_Forme/twin/snapshots/YYYY-MM-DD.json` | Respects the 98_Forme write boundary |
| T3 | Scan scope for "the Forme project" | Explicit path allowlist in config: `98_Forme/` + named Forme-track wiki/output notes + forme repo git log. Never heuristic | Allowlist doubles as the privacy perimeter |
| T4 | Snapshot cadence | Daily on first wake + before/after any accepted card execution | History is the one non-recoverable input |
| T5 | Pass orchestration on Codex CLI without a daemon | Extend the existing runner: sequential passes, each read-only JSON out; no new infra | Consistent with no-resident-process ruling |
| T6 | Relationship to the existing runner | Evolve in place behind a `--twin` mode; the vault-wide drift scan keeps running unchanged in parallel | Runtime = live data; don't break it |

---

## 5 · Standing risks

- **R1 · Reflection variance.** The only schedule item that cannot be compressed is snapshot history — it accumulates in calendar time. Everything in T1 exists to de-risk this.
- **R2 · Theater risk.** The brainstorm's phrase "preset but real data paths" is the slippery slope. The W8 daily-use gate is the guard: every scene must be something the owner genuinely uses.
- **R3 · Privacy.** Pre-public sweep before 08-15 (see §1.2). The projection whitelist rule (W4) exists because leakage already happened once internally.
- **R4 · Estimation optimism.** The brainstorm allocates one week to "seeing change"; our measured data says ten days for one insight. Scene 2 is an experimental module with a fallback, not a scheduled feature.

---

## 6 · Unblocked now (no open decision gates these)

1. **Start daily snapshots immediately.** Rough schema is fine — schema churn is acceptable, missing history is not recoverable.
2. **Draft dossier v0** (8 fields, W2) from existing runtime data.
3. Product doc draft starts the same day O1 lands.

---

## Changelog

- 2026-07-14 — created by the vault agent from the D1 discussions (effects walk, brainstorm review, architecture comparison) + runtime data.
