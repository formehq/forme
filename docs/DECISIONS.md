# Decision log

Keep this file short. Record only decisions that change product scope, constitutional boundaries, architecture, dates, or collaboration authority.

## 2026-07-17 — Preserve history and restart main

**Decision:** preserve the previous implementation in `archive/v0-prototype-2026-07-17` and tag `v0-prototype-final-2026-07-17`; create a new orphan `main`.

**Reason:** implementation speed exceeded shared owner understanding. A clean root makes every new assumption explicit while retaining the archive as evidence and a parts library.

## 2026-07-17 — Highest vision and MVP relationship

**Decision:** highest vision extends Continuity, Cognition, Agency, and Presence without taking authorship. The MVP is one Living Project Twin that demonstrates each dimension once in a connected story.

**Reason:** removing a dimension makes Forme resemble a familiar chatbot, summary, automation, or private copilot. Scope is controlled by reducing depth, not removing the four-part shape.

## 2026-07-17 — Demo dates

**Decision:** MVP complete and repeatable on 2026-08-11; Demo Day on 2026-08-12. Internal feature freeze begins 2026-08-09.

**Reason:** the previous August 15 plan is superseded. Reliability and rehearsal need protected time before the demo.

## 2026-07-17 — Core and optional scope

**Decision:** P0 is one project, one durable Twin, one Reflection and correction, one reversible action, one static projection, and one real Codex path. Exported notes, deeper OpenCode execution, automatic wake, HTML, and non-owner installation are P1. Mailbox, server agents, and Twin-to-Twin interaction are P2.

**Reason:** P0 preserves the complete product embryo while keeping every dimension narrow enough to finish.

## 2026-07-17 — Owner acceptance is part of Done

**Decision:** tests place a slice in Technical Review; only an owner-experienced demo can move a core issue to Done.

**Reason:** technical completion without shared product understanding caused the reboot.

## 2026-07-17 — Runtime position

**Decision:** Codex is the first live MVP path. OpenCode remains a first-class architectural target but does not require feature parity by Demo Day.

**Reason:** one real runtime is sufficient to prove the product; forced parity would consume the core schedule.

## 2026-07-17 — GitHub planning is gate-based

**Decision:** milestone #11 contains one parent epic, R0–R5 P0 gates, and separately labeled P1 options. Previous open issues are closed as `archive:v0`; they remain historical evidence.

**Reason:** one active P0 issue and explicit owner gates make progress legible and prevent optional work from silently entering the critical path.

## 2026-07-17 — R1 Continuity foundation

**Decision:** the Forme repo is the first real workspace. R1 observation and restart are fully deterministic, with the first live Codex path deferred to R2. R1 durable state is project-local and Git-ignored, and its first owner surface is generated Markdown that never owns canonical state.

**Reason:** Continuity must survive independently of model availability and runtime sessions; the Twin must remain independent of both its storage adapter and its presentation surface. The local, inspectable choices minimize privacy, infrastructure, and UI risk while the product semantics are still being proven.

## 2026-07-18 — R1 implementation contract

**Decision:** R1 uses one TypeScript / Node 24 npm package with Ajv-based persisted JSON Schema validation. It stores a validated workspace contract, immutable full revisions, atomic `HEAD`, reconstructible Markdown, and pending-transition recovery under `.forme/`. Observation is restricted to the explicit Forme repo allowlist. Archive reuse is limited to reviewed path-safety, hashing, no-op, recovery, privacy algorithms, and tests; the old schema and broader modules are not inherited.

**Reason:** this is the smallest implementation that makes Continuity deterministic, inspectable, restart-safe, and independent of both model runtimes and presentation surfaces while preserving a clear migration path for later storage and UI choices.

## 2026-07-18 — R1 owner acceptance

**Decision:** accept R1 Continuity after the real Forme workspace demonstrated bounded observation, owner-controlled Intent and Next Move, meaningful and no-op revisions, read-only source behavior, and byte-identical Restart View reconstruction after process loss. The Owner Demo first exposed a silently ignored CLI control input; R1 was accepted only after that gap was fixed and the complete flow was rerun.

**Reason:** the accepted result is a trustworthy continuity substrate, not a claim that Forme already understands or acts on the project. R2 must pass a new owner Control Packet before Codex visibility, cross-time content evidence, inferred semantic state, correction, or invalidation is introduced.

## 2026-07-18 — R2 cognition contract approved

**Decision:** implement R2 from two explicit reachable Git commits and one allowlisted text path; send only a deterministic packet to an isolated ephemeral `codex exec`; reject every model-generated tool event; admit only schema-valid, evidence-resolvable output as labeled inferred state in `TwinRevisionV2`; and make owner correction create a new revision that supersedes the interpretation and invalidates dependent output.

**Reason:** this is the smallest real cognition loop that can be more valuable than a summary while keeping historical visibility, runtime authority, semantic durability, and owner authorship explicit. Codex supplies mature model invocation; Forme retains evidence resolution, validation, admission, correction, recovery, and canonical state.

## 2026-07-18 — R2 resolves runtime capabilities before source transmission

**Decision:** select the highest-priority visible model from the authenticated Codex catalog, record its exact slug in the receipt, and fail before transmitting the Context Packet when the catalog or packet-only permission profile cannot be verified. Use the OpenAI-supported structured-output schema subset for transport and retain stronger uniqueness, evidence, staleness, and quality checks in Forme.

**Reason:** the first real run proved that a documented generic model name may not be callable through the owner's current ChatGPT authentication and that API structured-output constraints are narrower than local Ajv validation. Runtime capability must be measured in the actual environment, while canonical admission remains independent and stricter.

## 2026-07-18 — R2 owner acceptance

**Decision:** accept R2 Cognition after the real Forme workspace produced an evidence-backed cross-time Reflection, exposed its uncertainty and alternative explanation, and accepted the owner's narrower interpretation through the real correction surface. Twin revision 19 superseded the original Codex inference, invalidated its dependent output, carried the correction into the next Context Packet, and reconstructed the corrected state after restart.

**Reason:** R2 demonstrated a controlled cognition loop rather than a summary feature: Codex could propose bounded meaning, but Forme retained evidence validation, durable admission, staleness control, and owner authority to revise what the project currently means. The single R1 example supports keeping Owner Acceptance as a control path; it does not establish a general law from one case. R3 may now propose one reversible action only against the corrected revision and must pass a new owner stop gate before gaining write authority.

## 2026-07-18 — R3 bounded agency contract approved

**Decision:** implement the first R3 effect as `render_next_move_brief.v1` against one fixed Forme-managed block in `README.md`. Codex may return only a bounded structured intent proposal through the existing isolated no-tools runtime boundary. Forme compiles the exact effect; a separate one-use owner approval binds its hash and Twin revision; `TwinRevisionV3` records proposals, approvals, terminal execution and rollback receipts; and a Forme-only exact-marker executor uses atomic replacement, journal recovery, idempotent retry, verification, and hash-guarded rollback without Git authority.

**Reason:** this is the smallest action that visibly changes a real project artifact while preserving the architectural separation between probabilistic proposal and deterministic effect. A Twin-only action is retained as the schedule fallback because it proves less agency; GitHub and other external actions remain deferred because they add network, credentials, remote idempotency, messaging, and broader rollback risk.

## 2026-07-18 — R3 enters Technical Review

**Decision:** treat the approved R3 walking slice as technically implemented after 41 checks passed, including the schema-only runtime boundary, additive V3 state, exact one-use approval, fixed-marker source effect, five injected recovery boundaries, indeterminate-state handling, idempotent retry, correction invalidation, and hash-guarded rollback. Do not mark R3 Done and do not perform a real action until the owner supplies a fresh R3 Owner Frame and experiences the complete demo.

**Reason:** the implementation now proves the mechanism under synthetic, bounded tests without broadening Codex or Forme authority. The reboot's Definition of Done still requires the owner to understand and judge the real proposal, preview, approval, effect, receipt, recovery, and rollback loop.

## 2026-07-20 — R3-V2 Owner Decision Brief approved

**Decision:** make the R3 proposal recommendation-first by default, with one plain-language answer and one to three independently editable judgment items. Permit `ask_owner` only at low confidence with one named blocking question and no effect plan. Render evidence, uncertainty, provenance, and consequences progressively beneath the compact answer. Preserve all existing Context, runtime, writer, exact approval, executor, receipt, and rollback authority boundaries, and retain reconstruction of V1 proposals.

**Reason:** the first R3-V comparison showed that the owner values a concrete recommendation but needs a lower-cost explanation and a clause-level correction surface. A neutral question-first output returned too much analysis work to the owner. This changes the decision surface without treating model confidence as permission or claiming that recommendation accuracy has already been proven.

## 2026-07-20 — R3 MVP product acceptance

**Decision:** accept R3 Bounded Agency for the MVP and move the active gate to R4 Control Packet preparation. The independent Career CASE-02 is sufficient positive product evidence: owner correction materially changed the later recommendation, and the body-free Forme arm automatically preserved that corrected direction without manual reconstruction. Close R3 without approving or executing the experimental Career proposal. Preserve ship/closure weighting and its switching signals as unresolved owner judgments rather than inventing a policy. Treat richer Twin decision texture as an unproven follow-up, not an R3 blocker.

**Reason:** the bounded mechanism was already demonstrated end to end, while CASE-02 added the missing owner-experienced usefulness evidence. The owner found all outputs useful, least preferred the no-correction baseline, and could not meaningfully separate the rich manual-correction baseline from Forme at the current judgment resolution. This is enough to validate the MVP mechanism, but not enough to claim general recommendation accuracy or adopt one Career strategy.

## 2026-07-25 — R4 Hero Encounter, Third Place, and identity target

**Decision:** approve all five revised R4 product decisions. The August target is
one Hybrid Hero Encounter in a publicly viewable but curator-admitted Forme
Third Place, with the Forme Project Room as its first and only required
resident. Manual Guest remains the universal path; an Agent Guest may reason at
its own edge and submit an optional guest-approved capsule without Forme
ingesting notes or claiming a Guest Twin. Projection publication requires
immutable owner-admitted content followed by a distinct curator admission.
Invite-only controller accounts, public reading, invited or verified-reply
signals, and narrowly delegated Agent credentials keep account, entity, Room,
capsule, agent, guest, and curator identity distinct. Durable controller
accounts are passwordless; the exact provider remains a technical decision. The
server runs no AI. This supersedes the 2026-07-17 scope decision only for the
bounded R4 static-projection → signal → local review → response exchange.
Generalized mailbox behavior, any server-side agent, and full Twin-to-Twin
interaction remain P2 or later.

**Reason:** the Hybrid encounter preserves the owner-accepted Living Project
Twin spine while making the Person ↔ Project horizon perceptible. A curated
Third Place provides an open social surface without turning P0 into a public
network. Layered identity answers control and attribution without claiming that
an account or projection is the whole person. Product approval authorizes only
preparation of the technical Control Packet; no R4 visibility, identity,
hosting, publishing, persistence, messaging, notes access, or implementation is
authorized yet.

## 2026-07-26 — R4 public encounter and Private Room correction

**Decision:** supersede only the 2026-07-25 requirement that every Guest signal
must begin with an Owner invite or verified reply session. A current, fresh,
curator-admitted Third Place Room may accept one private Interaction within 24
hours from each issued anonymous bearer `public_encounter`; this is one
acceptance per capability/session, not verified one-per-human identity. The
Owner may then offer a new short pass through the Interaction's private reply
capability. A real Private Room uses a different Room ID and separately
Owner-approved Projection, can never enter Third Place, and requires an exact
Owner Grant for both reading and interaction. Curator admission/unlisting
controls public discovery; Owner actions control intake mode, Grant issue and
revoke, and Grant Offers. `unlisted` does not mean private, and public
Interaction/Response bodies do not become comments. Exact unlist effects on
active Grants and Grant Offers are not fixed by this T1 decision and remain in
the pending T4 lifecycle review.

**Reason:** a public Third Place that requires a private invitation before the
first interaction behaves like a display cabinet rather than an approachable
third space. One bounded public knock creates the intended sense of play and
encounter without creating public chat, a Guest account system, or open-ended
mailbox authority. Separately grant-gating a true Private Room preserves a
clear relationship boundary and prevents an unlisted public URL from being
mistaken for privacy. This correction changes the product contract only; it
authorizes no R4 implementation, durable write, deployment, public endpoint, or
external interaction.

## 2026-07-27 — Privacy-first, minimum-friction agency direction

**Owner-stated direction:** make this part of Forme's product principle:
protect the admitted human privacy boundary, then give Twin and Agent as much
useful freedom as possible inside it with as little friction as possible.
Human authorization should establish the boundary rather than be repeated for
every mechanical action. This direction does not grant any runtime authority
by itself.

**Recommended interpretation at the time:** use companion guards for human
authorship/commitment and irreversible/materially high-impact consequences,
plus a no-self-expansion rule for authority. Apply the direction to open R4 T2
by considering a fixed standing exact per-Room `room_operator.v1` scope bundle
for routine transport and lifecycle enforcement. Keep T1 unchanged and treat
T3's exact manifest and T5's no-daemon operation as P0 bootstrap choices rather
than the long-term ceiling. The Owner approved this boundary interpretation as
P on 2026-07-28. At that point, exact T2 verbs, T3–T5, and all R4
implementation were still pending; T2 was approved separately below.

**Reason:** approval friction should correspond to a real human choice, not to
the number of mechanical API calls. Repeatedly asking for sync, ACK, retry, or
deterministic staleness enforcement weakens practical agency without widening
privacy protection. The companion guards were initially recorded as the
Agent's recommended interpretation because an Agent can speak for or
irreversibly bind a human without leaking new private data. Nothing here
authorizes a runtime credential, private visibility, provider call, hosted
mutation, message, deployment, production write, or spend.

## 2026-07-28 — P human-boundary interpretation approved for R4

**Decision:** approve privacy as the primary source/provider/audience perimeter,
with companion guards for human representation/commitment and
irreversible/materially high-impact consequences, plus a no-self-expansion
rule. Inside an explicit, inspectable, revocable envelope, covered operations
run review-by-exception: act, verify, receipt, and report; return to the Owner
for a boundary crossing, material drift, failed verification, exhausted budget,
or another named exception.

**Reason:** privacy is Forme's primary human perimeter, but privacy alone does
not prevent an Agent from speaking for the Owner, irreversibly binding them, or
expanding its own authority. These companion guards protect those human
boundaries without turning routine API calls into ceremonial approvals.

**Effect:** this closes P and makes the four-part boundary interpretation an
R4 architecture invariant. It does not approve the proposed
`room_operator.v1` verb list or lifetime, T3 private-context visibility, T4
lifecycle behavior, T5 synchronization/retention behavior, a reconciled R4
Control Packet, any R4 implementation, provider call, credential, hosted
mutation, external message, deployment, production write, or spend.

## 2026-07-28 — T2 Room control contract approved for R4

**Decision:** approve hosted Forme as a GitHub-like management/control/status
plane over one versioned API contract, with Web as the P0 human cockpit and a
thin CLI/typed gateway for applicable public, Guest, and
`room_operator.v1` operations. Private Twin reasoning and drafting remain
local. Each Owner-controlled pairing creates one independently revocable
`RoomBinding` and credential for one exact Room; a workspace may hold multiple
bindings, but no credential spans Rooms or creates a hosted workspace identity.

Approve one fixed `room_operator.v1` bundle for 30 days from pairing, with no
automatic renewal and earlier Owner revocation. It may inspect exact
Room/Projection/status/health/receipts, explicitly sync/pull accepted
Interactions and tombstones, ACK deterministic import/delivery, recover
idempotently, record a local purge receipt after verifying local deletion,
deliver only a still-current exactly Owner-approved Projection/Response, and
attest stale only when the canonical local Twin HEAD is newer than the exact
Projection basis. Every mutation retains exact target, expected version,
idempotency, verification, and receipt checks.

The credential belongs to the deterministic connector and never enters a model
prompt, model environment, or generic tool result. The bundle cannot pair,
create or discover Rooms, widen scope/audience, issue Grants, change intake or
Interaction disposition, create new Owner-attributed content, curate, revoke
content, irreversibly retire/delete, or invoke arbitrary tools. P0
Controller/Curator boundary actions remain explicit stepped-up Web actions
against the same API; Agent handoff for those actions remains P1. Anywhere Web
Control may inspect and control already-hosted content but cannot read the
private Twin, invoke the local Agent, or bypass exact local publication
approval.

**Reason:** this gives the Agent meaningful standing agency for routine Room
transport and deterministic lifecycle enforcement without turning every sync,
ACK, retry, or already-approved delivery into a new approval prompt. Exact
Room scope, short lifetime, independent revocation, connector-held credentials,
and prohibition on self-expansion preserve the approved P boundary.

**Effect:** this closes T2 only. T3 private provider/context visibility, T4
public lifecycle behavior, T5 synchronization/retention mechanics, the
reconciled Technical Control Packet, schemas/migrations, implementation,
credential issuance, deployment, production writes, external interaction, and
spend remain unapproved. Exact auth provider, hostnames, token/wire format,
secret-storage adapter, and re-pair/rotation race behavior remain later
implementation/production decisions. The old packet's broader paired-local
revoke and `signal:disposition` verbs are explicitly not part of this approval.

## 2026-07-28 — Native Harness roles clarified; NH1/NH2 remain open

**Decision:** confirm the architecture correction that a mature
Codex/OpenCode **Native Harness Workbench**, the **Forme Semantic Spine**, and a
Forme-controlled **Managed Privacy Run** are distinct roles. The Harness may
provide the operational body—sessions, files, shell, tools, Skills, MCP,
plugins, subagents, permissions, and runtime interaction. Forme owns the
durable Twin, evidence, corrections, authority, product-level receipts,
projection, and continuity across runtime loss. A packet-only/no-tools run is
one exact-Forme-selected-content execution profile, not the permanent
definition of every Forme Agent.

**Reason:** the Highest Vision expected Forme to use a mature Harness rather
than rebuild its workbench. The one-month MVP and accepted R2/R3 slices narrowed
the first proofs to exact packets and deterministic effects. Those proofs are
valid, but treating their narrow adapter as the whole system would erase native
Harness value and accidentally turn the pending R4 T3 context recommendation
into a global Agent architecture.

**Effect:** R1–R3 acceptance and T2 remain unchanged. T3 is paused until the
Owner closes NH1 (default local carrier) and NH2 (ordinary Workspace work
versus Forme-authoritative effect). This clarification does not approve the
Native Workbench as the P0 default, any file/shell/tool/provider visibility,
generic writes, Room access, private Guest content, schema, implementation,
deployment, external action, or spend. The authoritative role model and the
two open decision cards are in
[`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md).

## 2026-07-29 — NH1/NH2 Native Harness architecture approved

**Decision:** approve NH1 option 1 and NH2 option 1 as recommended. The Native
Harness Workbench is the default local carrier: Codex is the P0 workbench,
OpenCode remains a first-class architectural compatibility target whose live
path is P1, and Forme integrates through CLI/API/MCP/Skill/Plugin/adapter
surfaces instead of building a competing local chat shell for the MVP. Those
are supported integration forms, not simultaneous P0 deliverables: August
requires only the minimum Codex-facing integration for the walking slice and
no live OpenCode path.

Use the two-class authority boundary. Ordinary Owner/Harness Workspace work may
run only inside a separately approved native runtime envelope. Its results may
be offered and admitted as evidence only under a separately approved
source/observation contract; neither the work nor its output automatically
becomes Twin meaning or a Forme-authoritative effect. Canonical meaning,
correction, agency envelopes, Projection/Response scope, human-attributed
publication or commitment, and any effect for which Forme claims
authorization, recovery, rollback, or receipt guarantees continue through a
typed Forme contract. P0 Forme-authoritative effects retain narrow
deterministic effectors. Later physical execution may reuse Harness-native
tools only inside a separately approved Forme envelope with independent
verification and receipts.

**Reason:** this restores the Highest Vision's harness-native operating shape
without discarding the exact visibility, correction, authority, and effect
guarantees proven by R1–R3. It keeps mature workbench capability and durable
Forme authority distinct instead of rebuilding Codex/OpenCode or treating
every native file edit as canonical Forme meaning.

**Effect:** NH1/NH2 are closed. Revised R4 T3 is now the active, still
unapproved Owner decision; T4/T5 and detailed Control Packet reconciliation
remain open. This approval classifies architecture only. It grants no concrete
runtime, file, shell, tool, provider, Guest, Room, credential, implementation,
deployment, external action, or spend authority.
