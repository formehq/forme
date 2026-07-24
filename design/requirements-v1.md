# Forme Harness Requirements v1

- Status: Draft for D1 completion
- Updated: 2026-07-15
- Parent: GitHub epic #37, D1 running log #38
- Decision authority: `Forme_MVP_Decision_State_Revised.md`
- Evidence map: `reference-index.md`

## 1. Purpose

The MVP must make one coherent claim believable:

> A project can maintain a continuous, evolving state beyond any single document or agent session. An agent can detect meaningful change, operate through an explicit judgment boundary, execute a bounded and reversible action, and produce a controlled external projection.

The four proof scenes are Continuity, Cognition, Bounded Agency, and Controlled Presence. They must use one evolving Twin and one evidence spine rather than four disconnected demos.

## 2. Requirement language

- **MUST** is required for MVP acceptance or a constitutional boundary.
- **SHOULD** is the current implementation default and may change with recorded evidence.
- **MAY** is optional or interface-constraining future scope.
- A requirement marked **OPEN-GATED** may be designed but not included in the 08-15 build until the named owner decision is closed.

## 3. Constitutional requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| C-01 | Forme MUST preserve owner authorship: agent interpretations remain proposals until confirmed or covered by explicit authorization. | Every inferred claim records status and can be corrected; no agent output silently becomes confirmed state. | Decision State §1.2 Authorship; Reference §A/§I |
| C-02 | Forme MUST keep behavior legible as autonomy increases. | Each meaningful action exposes its proposal, inputs, authority, result, and receipt. | Decision State §1.2 Legibility; Reference §C/§G |
| C-03 | Meaningful writes MUST be reversible where technically feasible. | Action receipts identify effects and rollback state; unsupported rollback is explicit before approval. | Decision State §1.2 Reversibility; Reference §C/§G |
| C-04 | Learned claims and rules MUST be scoped, evidence-backed, revisable, and able to age out. | Claims include evidence, confidence/status, scope, and freshness or supersession state. | Decision State §1.2 Non-finality; Reference §A/§E |
| C-05 | Private source existence MUST NOT imply projection permission. | Projection compiler accepts only an explicit Allowed Projection Scope; a test proves private source data is unavailable at render time. | Decision State §1.2–§1.3; Reference §I |
| C-06 | The LLM lane MUST be read-only and return schema-constrained data. Forme deterministic code performs every write. | Runtime is denied direct canonical writes; invalid output fails Forme-owned validation; effects execute outside the model loop. | Decision State §1.3; Reference §I |
| C-07 | Runtime sessions MUST be disposable. | Killing and replacing a runtime session preserves confirmed Twin state and does not duplicate an effect. | Decision State §1.3 crash-equivalence; Reference §I |
| C-08 | MVP intelligence MUST NOT require a resident process. | Wake/restart catch-up reconstructs the current state from durable data. | Decision State §1.3/§2.2 W5 |
| C-09 | Source reads MUST use an explicit allowlist. | Connector configuration enumerates roots and exclusions; outside-path reads fail closed. | Decision State §4 T4; Reference §I |
| C-10 | Codex and OpenCode MUST both remain first-class integration targets. | Shared lifecycle contract plus capability declarations exist for both; runtime-specific strengths are not erased. | Decision State §1.1/§1.3; Runtime Strategy |

## 4. Continuity requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| CON-01 | Forme MUST create a bounded workspace from either a local project directory or an exported notes mirror. | A fixture for each source type produces the same normalized source manifest interface. | Decision State §2.2 W8; issue #30; Reference §D/§G |
| CON-02 | Import MUST preserve provenance and distinguish original, normalized, derived, and Forme-owned data. | Every evidence reference resolves to a source record; normalized files never masquerade as originals. | Decision State §1.2/§7; Reference §I |
| CON-03 | A connector MUST report unsupported, locked, unreadable, or fidelity-limited items rather than silently dropping them. | Import summary contains counts and consent state; Apple Notes fixtures cover unsupported attachments. | Issue #30 evidence; Reference §G |
| CON-04 | The Twin MUST maintain Project Identity, Active Intent, Current State, Confirmed Decisions, Open Questions, Unresolved Tensions, Emerging Patterns, User Corrections, and Allowed Projection Scope. | State schema and human projection contain all required fields or explicit empty states. | Decision State §2.3 |
| CON-05 | At a wake/restart boundary Forme MUST reconstruct where the project was, what changed, active intent, unresolved state, and the most natural next move. | Golden scenario resumes after session deletion without manual context reconstruction. | Decision State §5 Scene 1; Reference §D Layer 1 |
| CON-06 | Only meaningful events SHOULD update or surface the Twin. | Mechanical or duplicate changes are deterministically suppressed; no mandatory daily briefing is emitted. | Decision State §2.2 W6; Reference §C/§G |
| CON-07 | Snapshot history MUST start before reflection claims depend on it. | Timestamped state snapshots exist before/after accepted actions and across meaningful wake gaps. | Decision State §4 T5; §6 R1 |

## 5. Cognition requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| COG-01 | Forme MUST be able to produce an interpretation that depends on evidence across time, not a single artifact. | At least one reflection cites multiple dated evidence items and cannot be reproduced from only the latest item. | Decision State §5 Scene 2; §4 T1–T2 |
| COG-02 | A reflection MUST expose evidence, uncertainty, and whether it is confirmed, inferred, disputed, or superseded. | Schema validation and UI fixture cover all statuses. | Decision State §5 Scene 2; §8 |
| COG-03 | The owner MUST be able to confirm, correct, reject, or leave unresolved an interpretation. | Each path produces an append-only event and deterministic state transition. | Decision State §2.2 W1; Reference §C/§G |
| COG-04 | A correction MUST affect later context and invalidate dependent projections or actions when required. | Correcting a claim marks dependent drafts stale and prevents execution against the old base revision. | Decision State §2.3 User Corrections; §8 |
| COG-05 | Fluent summary, clustering, or restatement MUST NOT count as successful reflection. | Evaluation rubric explicitly rejects these outputs. | Decision State §5 Scene 2; §6 R6 |

## 6. Bounded Agency requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| AG-01 | An agent MUST express a requested action as a structured proposal against a known Twin revision. | Proposal includes evidence, intended effects, preconditions, reversibility, and base revision. | Decision State §5 Scene 3; Reference §D Layer 3 |
| AG-02 | Forme deterministic code MUST validate and execute the effect. | The same proposal produces a deterministic dry-run and execution result; the runtime cannot call the writer directly. | Decision State §1.3 hard constraint #7 |
| AG-03 | Execution MUST be idempotent and crash-equivalent. | Replaying the same effect key does not duplicate mutation; crash injection at each boundary yields either no effect or one complete receipt. | Decision State §1.3 crash-equivalence |
| AG-04 | Every meaningful effect MUST create an append-only receipt correlated to proposal, authority, before/after state, and runtime run. | Receipt fixture resolves every correlation ID and verifies final state. | Decision State §5 Scene 3; Reference §C/§G |
| AG-05 | Authorization MUST consider confidence, reversibility, and blast radius. | Policy fixture demonstrates ask/allow/deny outcomes and cannot be overridden by the model. | Epic #37; Reference §D Layer 3 |
| AG-06 | Delete, merge, archive, publish, external messaging, and externally visible actions MUST require owner approval by default. | Policy tests deny each action without explicit approval or a recorded narrow authorization grant. | Decision State §1.3 |
| AG-07 | The first MVP action SHOULD modify a Forme-owned project-state or plan artifact rather than arbitrary source material. | Scene 3 completes through one narrow effector and rollback path. | Decision State §5 Scene 3; current build evidence in Reference §G |

## 7. Controlled Presence requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| PRE-01 | A projection MUST compile only from an explicit Allowed Projection Scope. | Renderer has no private-vault/source handle; a canary secret outside scope never appears. | Decision State §1.3; Reference §I |
| PRE-02 | A projection MUST be versioned, revocable, audience-scoped, and linked to its source Twin revision. | Projection fixture includes version, audience, published/revoked state, and source revision. | Decision State §2.2 W9–W10; owner direction 2026-07-15 |
| PRE-03 | A projection MUST distinguish confirmed claims, unresolved hypotheses, freshness, provenance class, and agency boundary. | Scene 4 fixture renders each class and names what still requires the owner. | Decision State §4 T8; §5 Scene 4 |
| PRE-04 | A server-side Projection Agent MUST receive only the published projection, message thread, and delegation policy. | Server invocation test contains no private evidence payload or local path. | Decision State §2.2 W10 |
| PRE-05 | The architecture MUST preserve an asynchronous agent-message envelope and mailbox seam. | A message contract references a projection version and cannot mutate the receiving Twin directly. | Decision State §2.2 W9; Reference §D Layer 4 |
| PRE-06 | **OPEN-GATED by O7:** an MVP mailbox, if built, MUST be invite-only and require owner approval for outbound replies. | Unauthorized send and recursive agent-loop tests fail closed. | Decision State §3 O7; §6 R9 |
| PRE-07 | Full autonomous twin-to-twin federation, public discovery, and unrestricted auto-replies MUST remain out of the one-month core. | No MVP acceptance path depends on these capabilities. | Brainstorm MVP exclusions; Decision State §3 O7 |

## 8. Runtime requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| RT-01 | Forme MUST define a small runtime-neutral lifecycle for inspect, start/connect, run, permission response, cancel, and close. | Codex and OpenCode smoke adapters satisfy the same contract tests. | Runtime Strategy |
| RT-02 | Each runtime MUST declare capabilities rather than assume feature parity. | Descriptor records structured output, permission, sandbox, resume, diff/revert, plugin, skill, MCP, and subagent support. | Decision State §2.2 W11 |
| RT-03 | Forme MUST validate all runtime output with its own schema validator. | Invalid and adversarial fixtures are rejected independently of runtime guarantees. | Decision State §1.3; current main architecture |
| RT-04 | Runtime context MUST contain only the minimum Twin slice and evidence references needed for the pass. | Golden test verifies excluded private claims are absent from the runtime request. | Decision State §4 T4; Reference §I |
| RT-05 | Generic write, shell, task, and external-directory abilities MUST be denied unless a specific pass requires and contains them. | Unauthorized-write suite passes on both adapters; unknown capabilities fail closed. | Runtime Strategy security boundary |
| RT-06 | A runtime crash, cancellation, or restart MUST result in an explicit terminal execution state. | No orphan permission or effect remains after injected failure. | Decision State §1.3; Runtime Strategy gate |
| RT-07 | Runtime versions MUST be pinned and protected by contract tests. | Upstream schema drift fails in CI with a diagnosable adapter error. | Runtime Strategy gate |
| RT-08 | Forme SHOULD first deepen the runtime that best serves the active scene while keeping the other adapter's smoke and contract path healthy. | Planning does not require complete feature parity before Scene 1 works. | Owner runtime direction, 2026-07-15 |

## 9. Operational and experience requirements

| ID | Requirement | Acceptance evidence | Trace |
|---|---|---|---|
| UX-01 | Product-facing Forme surfaces MUST be English-first; source quotes and evidence remain in their original language. | Snapshot tests cover mixed-language evidence without translation. | Decision State §1.3 |
| UX-02 | The UI MUST own no private truth. | Restarting the UI reconstructs every view from durable state and receipts. | Existing hard constraint; Reference §G |
| UX-03 | The first useful state MUST appear within the existing wake-catchup budget or clearly show stale-but-readable state while updating. | Measured wake scenario reports time to visible state and freshness. | Reference §B/§G |
| UX-04 | Sensitive values, source content, note titles, and local absolute paths MUST not enter logs, fixtures, public artifacts, or projection payloads without explicit approval. | Privacy scan and canary fixtures pass before public release. | Decision State §1.3; Reference §I |
| UX-05 | The MVP SHOULD present one coherent Forme entity even if internal passes or runtimes differ. | Scene transitions do not expose a bot team or require the user to route cognitive roles. | Decision State §2.2 W4 |

## 10. Explicit one-month exclusions

The following are not required for the 08-15 core:

- a general scheduler or always-on local daemon;
- full-vault or whole-digital-life ingestion;
- unrestricted native write-back to Apple Notes;
- a complete multi-agent product surface;
- a public agent directory;
- autonomous twin-to-twin federation;
- unrestricted server-side tools or access to the private Twin;
- a generic skill/plugin marketplace;
- forced runtime feature parity;
- an upstream runtime fork.

## 11. MVP acceptance story

One golden workspace must complete this sequence:

1. Import a local project directory or notes mirror with a provenance manifest.
2. Build or restore a Project Twin at a wake boundary.
3. Show what changed, what remains unresolved, and the next natural move.
4. Surface one cross-time interpretation with evidence and uncertainty.
5. Accept an owner correction and invalidate stale dependent output.
6. Produce one bounded action proposal against the corrected revision.
7. Obtain authority, execute through deterministic code, write a receipt, and demonstrate rollback.
8. Compile a versioned external projection from Allowed Projection Scope only.
9. Optionally, if O7 closes in favor of the mailbox, receive one invite-only message and generate an owner-approved reply draft using only that projection.

If steps 1–8 feel like separate features rather than one entity maintaining continuity, the MVP has failed even if every component works independently.

## 12. Requirements still gated by owner decisions

Only these decisions should interrupt implementation:

- O3: static projection versus interactive Q&A for 08-15;
- O4: Twin View carrier;
- O7: mailbox in the build versus protocol seam only;
- O8: project collaboration projection versus personal collaboration profile.

All other technical uncertainty should be resolved through bounded spikes and acceptance tests rather than additional abstract discussion.
