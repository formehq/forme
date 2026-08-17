# Decision log

Keep this file short. Record only decisions that change product scope, constitutional boundaries, architecture, dates, or collaboration authority.

## 2026-08-16 — Construct one bounded image-acquisition diagnostic

**Decision:** preserve the consumed Image-Manifest Diagnostic and its
`IMAGE_MISSING` result as immutable history, while constructing a separate
one-use Image-Acquisition Diagnostic family. Kiad
`c6fe1804b1111c19d27da64f7ca76b85c0f12adf` and Liad
`95197de9f65469cb52e569245cf4e08190c82471` freeze strict v1 grant,
journal, receipt, prepare and execution surfaces. The diagnostic may later use
one `version`, at most two exact pinned `image inspect` calls and, only after
an exact missing result, at most one anonymous `linux/arm64` pull. Machine
bindings are index
`sha256:8da9ebd53e26c91de44ad277db00b5d25b22aa1e3d262dd3db0e9bb7a8bb82e9`,
schema `sha256:2aecd08011be498edef3f7da1f27c8fc00850701183325f09dbec9fc4d7f7170`,
evidence `sha256:2b0a029f48e74fb9c1d7f3b5878465b40861cfa8c45528e9a68e5cbbd8cb74f7`
and report
`sha256:16ed0f8a78e141063f9943e42c5a8f02e14ad1da4008d576ac788614ba8d0e11`.

**Authority:** construction is repository-only. Docker Diagnostic, registry,
image pull, cleanup, PostgreSQL, replacement campaign, Production and Gate C
remain `NOT_REQUESTED`. The next action is the reserved add-only versioned
Card/Review followed by a separate exact Owner decision. Mandatory stop:
`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
IMAGE_ACQUISITION_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

**Reason:** the previous diagnostic proved the image was missing but had no
pull authority. A separate closed acquisition envelope can answer whether one
exact anonymous pull produces the pinned descriptor without silently turning
diagnosis into a campaign retry.

## 2026-08-15 — Diagnose the pinned image descriptor before another campaign

**Decision:** after the one-use Integration Campaign V2 failed closed at
`local_postgres_image_platform_manifest_invalid`, construct a separate
body-free image-manifest diagnostic before changing any manifest pin or
acceptance predicate. Kmd `32abce27f7c84a83e0d2d1252ab0da5530f88cb0`
and Lmd `b17a44f34fa9abde1e6a39504594e875a6d7d7cf` freeze one future
`version` plus one exact pinned `image inspect` maximum, a strict typed tuple,
one-use write-ahead state and zero pull/resource/cleanup/PostgreSQL/SQL
authority. Machine bindings are index
`sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c`,
schema `sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440`,
evidence `sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011`
and report `sha256:490256a560bb3b910d38214c9190365ac64b087100cb3d17bd7ced353f631559`.

**Authority:** the approved construction is repository-only. The diagnostic,
image pull, cleanup, replacement campaign, Production and Gate C remain
`NOT_REQUESTED`. The next step is an add-only versioned Diagnostic Card/Review
and a separate exact Owner decision. Mandatory stop:
`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

**Reason:** the failed campaign receipt intentionally retained no raw Docker
body or descriptor digest. Treating an unobserved value as corrected would
weaken the trust boundary; the smallest honest next effect is a bounded,
body-free observation that cannot continue the campaign automatically.

## 2026-07-17 — Preserve history and restart main

**Decision:** preserve the previous implementation in `archive/v0-prototype-2026-07-17` and tag `v0-prototype-final-2026-07-17`; create a new orphan `main`.

**Reason:** implementation speed exceeded shared owner understanding. A clean root makes every new assumption explicit while retaining the archive as evidence and a parts library.

## 2026-07-17 — Highest vision and MVP relationship

**Decision:** highest vision extends Continuity, Cognition, Agency, and Presence without taking authorship. The MVP is one Living Project Twin that demonstrates each dimension once in a connected story.

**Reason:** removing a dimension makes Forme resemble a familiar chatbot, summary, automation, or private copilot. Scope is controlled by reducing depth, not removing the four-part shape.

## 2026-07-17 — Demo dates

**Decision:** MVP complete and repeatable on 2026-08-11; Demo Day on 2026-08-12. Internal feature freeze begins 2026-08-09.

**Status:** superseded by the 2026-08-03 schedule decision below.

**Reason:** the previous August 15 plan was superseded. Reliability and rehearsal needed protected time before the demo.

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
active Grants and Grant Offers were not fixed by this T1 decision and were left
for the then-pending T4 lifecycle review; T4 later closed below.

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

**Effect:** NH1/NH2 are closed. At that point revised R4 T3 was the active,
still-unapproved Owner decision; T4/T5 and detailed Control Packet
reconciliation remained open. This approval classifies architecture only. It grants no concrete
runtime, file, shell, tool, provider, Guest, Room, credential, implementation,
deployment, external action, or spend authority.

## 2026-08-01 — R4 T3 selects Fresh Native Response Session direction

**Decision:** select Option 2B as the R4 P0 direction. One exact Interaction
will use one brand-new, non-resumed Fresh Native Response Session rather than
the Owner's current conversation or a file-by-file Managed Privacy picker. The
session should receive the exact request and a typed body/path-free current
Twin orientation, then dynamically read/search only a sanitized read-only
snapshot of current eligible Forme files. P0 excludes Git history. Its output
remains a candidate requiring exact Owner publication
approval and separate T2 connector transport.

The former Managed Privacy Response Lane recommendation is superseded for R4
P0 and deferred to P1/future sensitive or exact-content use. R2/R3's Managed
Privacy proof remains valid. P0 will not build a Managed/Native trust-tier
selector.

**Reason:** this better demonstrates the Highest Vision's harness-native
agency and reduces MVP friction and schedule scope. Codex can discover
relevant project context as a mature Harness, while Forme still binds the work
to one Twin, Interaction, human boundary, approval, and receipt chain.

**Effect:** this is a direction decision, not final T3 approval. The rewritten
T3 still requires explicit Owner approval of Guest consent, exact source/
provider/capability envelope, fresh-session budget, physical Guest-store and
credential isolation, output authority, deletion, and retention. Until that,
T4/T5, and a reconciled Control Packet are approved, no new runtime
capability, provider call, Guest data handling, schema, implementation,
deployment, external action, or spend is authorized.

## 2026-08-03 — R4 T3 Fresh Native Response Session exact contract approved

**Decision:** approve the full recommended Fresh Native Response Session T3
contract. Each exact Interaction may eventually use one brand-new,
non-resumed, 60-minute response-preparation session with one automatic draft
cycle of at most three internal provider dispatches, 128k input tokens, 8k
output tokens, and an applicable US$1 incremental-spend cap. It may dynamically
read/search only a deterministic sanitized read-only snapshot generated from
clean Forme repo HEAD plus a previewed, body/path-free current Twin orientation;
Git history, ambient conversations/config/instructions, other Rooms or Guest
bodies, writers, generic network/tools, connector credentials, mutation, and
publication remain outside the envelope. OpenAI through the disclosed
Owner-local Codex transport is the only provider path, with no provider/model
fallback. Guest consent covers that bounded processing, with
`manual_owner_only` as the non-AI fallback. Every output remains an untrusted
candidate and exact Owner approval of the current outgoing content is still
required before separate T2 connector delivery.

**Reason:** this closes the previously selected Option 2B direction as an
honest, inspectable R4 P0 contract: mature Harness agency may discover useful
context inside one approved perimeter, while Forme preserves Interaction/Twin
binding, physical Guest-store and credential separation, expiry, human
authorship, and deterministic publication authority. It avoids both a
file-by-file context picker and a misleading claim that Forme knows every byte
the provider inspected.

**Effect:** T3 is closed and authoritative for R4 P0. This approval authorizes
documentation and later Technical Control Packet reconciliation only. At the
time of this approval T4 was the current Owner gate and T5 remained open; T4
later closed below. The existing packet is still
unreconciled and cannot be approved or implemented. No Fresh session,
provider call, Guest-data handling, Room mutation, schema/migration,
repository implementation, deployment, external action, production write, or
spend is authorized. After T4/T5 close, a new exact Packet must be audited,
hashed, and separately approved before repository implementation or
fixture/local tests may begin; schema/migration and production grants remain
later independent gates.

## 2026-08-03 — R4 T4 public lifecycle contract approved

**Decision:** approve the full recommended T4 lifecycle contract. Owner
publication and Curator admission remain independent: Third Place lists only
the exact current, fresh, curator-admitted Projection. An Owner-published,
unrevoked and unexpired `third_place_public` Projection remains readable by
direct URL when never admitted or later unlisted, but only a current, fresh,
admitted Projection in a `public_single` Room may accept a new public knock.

Curator unlist removes Third Place discovery, stops new public knocks, and
immediately invalidates every unused public encounter capability. It does not
act as an Owner revoke: an existing Owner-issued Grant remains usable only
within its original Room + Projection scope, expiry, quota, interaction mode,
and Projection lifecycle. An already-issued `GrantOffer` also survives unlist
alone. Acceptance must atomically recheck private reply authority, offer
expiry, that the source has not been deleted or revoked and its Room has not
retired, that the exact target Projection remains current, fresh, and
unrevoked, and that the target Room is neither retired nor `closed`;
acceptance never extends the original expiry.

A Private Room never enters Third Place and returns no Projection body from a
direct URL without a valid exact Owner Grant. P0 does not convert a public
Room to private in place: the Owner must revoke the public Projection and
create a different Room ID with a separately approved private Projection.
`invite_only` rejects and permanently invalidates unused public encounters
while preserving valid Grants; `closed` does the same to unused public
encounters and pauses every new submission without extending Grant expiry.
Unlist and interaction-mode changes do not delete already-accepted
Interactions, which may still complete an Owner-reviewed Response.

A stale public Projection may remain direct-readable only with a dominant
warning until its seven-day hard expiry; a still-valid Private Guest Grant may
likewise read only with a stale warning. Neither lane may accept a new
Interaction. Projection revoke immediately stops serving its body, hides every
linked published Response, reduces old Guest access to body-free
status/delete, and requires the local Presence to purge request and linked
Response bodies after its tombstone arrives. Room retirement ends the Room
and all new writes, hides hosted Projection and Response bodies, leaves old
Guests only body-free status/delete, and requires equivalent local purge after
the retirement tombstone.

Every public successor requires a new Curator admission, and no public or
private successor inherits a Guest Grant. An already-accepted request whose
origin later becomes stale, superseded, or expired may receive one
Owner-reviewed Response only with the origin state explicitly disclosed. A
request bound to a revoked origin cannot receive a new Response.

**Reason:** this keeps public discovery, Owner-controlled relationship
authority, content freshness, and emergency privacy revocation as separate
concepts. A Curator may remove something from the shared place without
silently cancelling an Owner relationship; accepted work is not lost merely
because listing or intake changes; and revoke/retire remain strong,
body-removing privacy stops. Exact Projection-bound Grants and fresh successor
admission prevent access from silently following changed content.

**Effect:** T4 is closed and authoritative for later R4 Packet reconciliation;
T5 becomes the current Owner gate. This approval may update authority
documentation and later be compiled into a new Technical Control Packet after
T5. It supersedes conflicting T4 proposals in the existing unreconciled
packet, but does not approve that packet or any low-level schema, transaction,
route, caching, or storage mechanism.

No Room, Projection, Grant, GrantOffer, Interaction, or Response is created,
read, mutated, revoked, or retired by this approval. It changes none of the
approved P/T1/T2/NH1/NH2/T3 boundaries and grants no new connector or model
authority. T5 synchronization/deletion/retention mechanics, the reconciled
and separately Owner-approved Control Packet, schemas/migrations, repository
implementation, runtime/provider calls, Guest-data handling, credentials,
hosted mutation, external messaging, deployment, production writes, public
behavior, and spend remain unauthorized.

## 2026-08-03 — T5 Guest notification and continuation inputs fixed

**Decision:** while T5 remains open as a whole, fix two of its product-facing
inputs. First, P0 may offer an optional, confirmed
`response_ready_email` endpoint bound to one exact Interaction. It sends only
a generic response-ready notice, lives in a mutable hosted notification
envelope, expires/deletes with its parent, and carries no request/response
body, Private Room name, reply URL, reply token, or secret. A separate
single-purpose, short-lived, one-use address-verification code may bind the
endpoint but grants no Room/body/reply authority and is deleted after use or
expiry. Email is contact—not a
Guest account, person identity, authorization, capability recovery,
deduplication key, trust signal, or cross-Room relationship record. The
original private reply capability remains the only reply/status authority and
polling fallback.

Second, present Owner-issued continuation as three exact capability presets:
one visit is 24 hours / 1 accepted Interaction, short exchange is 3 days / 2,
and familiar collaborator is 7 days / 3. All remain bound to one exact Room +
Projection, permit at most one unresolved request, are revocable, and never
follow a successor. The labels are not inferred trust levels. Familiarity does
not grant Private Room access; private reading and interaction still require a
separate exact Private Room Grant. Manual and one-shot Agent carriers share the
same quota.

**Reason:** response-ready email removes unnecessary polling without creating
a Guest account system or exposing hosted content through email. Fixed presets
make relationship continuity legible to the Owner while staying inside T1's
approved maximum seven-day/three-Interaction envelope.

**Effect:** these two inputs are authoritative for the remaining T5 review and
later Control Packet reconciliation. They do not close T5, select an email
provider, approve provider logs/retention/spend, or authorize implementation,
external messaging, Guest-data handling, schema, deployment, public behavior,
or production traffic. A reusable email login/magic link, more than three
Interactions, longer duration, successor-following access, conversation
thread, or persistent/cross-Room Guest identity requires a new Owner decision.

## 2026-08-03 — Full T5 approved; trusted-collaborator preset added

**Decision:** approve the complete recommended T5 async, notification,
deletion, retention, production-disclosure, and P0-cut contract, with one
additive continuation amendment. The earlier familiar-collaborator preset
remains 7 days / 3 accepted Interactions. Add a fourth
`trusted_collaborator` preset at 7 days / 10 independent accepted
Interactions. It is selected explicitly by the Owner rather than inferred from
an email address, name, history, behavior, model judgment, or account state.
Like the other presets, it is bound to one exact Room + Projection, permits at
most one unresolved request, is revocable, shares quota between Manual and
one-shot Agent carriers, never follows a successor, and grants no identity,
cross-Room authority, or automatic Private Room access. Each Interaction keeps
its own private reply capability, deletion right, and at most one Response; the
larger quota does not create a conversation thread.

The full T5 contract also fixes these requirements:

- the Agent's standard Room workflow explicitly invokes typed `room sync`,
  with the same command available for Owner recovery; read-only commands do
  not hide a pull or durable write, and the retained private reply URL remains
  canonical;
- an optional confirmed exact-Interaction `response_ready_email` endpoint may
  send one generic response-ready notice, but it carries no hosted body,
  Private Room name, reply URL/token/secret, identity, trust, deduplication,
  recovery, or cross-Room authority. A short-lived, one-use, single-purpose
  verification code may bind the address but grants no content/reply access;
- P0 adds no Owner-device daemon, live chat, WebSocket, remote local tunnel, or
  server AI;
- Interaction and inline Guest Capsule bodies have a 30-day maximum;
  Response bodies have a 7-day maximum and never outlive the Interaction.
  Only an isolated typed unpublished candidate may persist locally for at most
  7 days and never beyond its Interaction. Earlier deletion, expiry, origin
  revoke, Room retirement, or candidate-basis invalidation shortens those
  maxima immediately;
- Fresh Native Response Session transcript/model-tool log/crash/runtime bodies
  are disposable computation, not durable Forme state. Normal completion and
  startup recovery clean them before further use; durable Session Receipts are
  body-free and path-free;
- hosted deletion makes content immediately unreadable. Scheduled physical
  purge targets less than 24 hours; more than 36 hours since a successful
  purge is an operator incident. Offline local state learns earlier remote
  deletion at the next explicit sync and must fail closed on known expiry;
- before any production interaction, the Production Deployment & Provisioning
  Grant must disclose the actual backup horizon, Cloudflare/Caddy/app/
  PostgreSQL log retention, and exact outbound email provider, region,
  recipient/log retention, secret handling, delivery metadata, and incremental
  spend. Production email stays disabled until those values are approved;
- deletion cannot recall content already read or copied by the Owner or other
  people, provider-accepted/in-flight bytes, received email, or a backup still
  inside its disclosed retention horizon; and
- R4 P0 does not add notes ingestion, Person Twin, open signup, multiple
  required residents, public search/feed, server AI, rich attachments, or a
  reusable cross-Room Agent identity.

**Reason:** this completes the bounded asynchronous encounter honestly while
allowing a real collaborator relationship to continue with less repeated
approval friction. The fourth preset answers the later Owner judgment that a
trusted collaborator may need substantially more independent exchanges inside
the same narrow, revocable boundary; it does not convert familiarity into
system-inferred trust or broader access.

**Effect:** T5 is closed as Owner-approved design authority. This entry
supersedes only the earlier partial entry's statements that T5 remained open
and that more than three Interactions still required a future Owner decision;
the historical entry and its 7-day/3-Interaction familiar tier remain valid
evidence. The current stop gate is a newly reconciled Technical Control Packet
that compiles P/T1/T2/T3/T4/T5/NH1/NH2, passes independent audit, receives a
new SHA-256, and is separately approved by the Owner. This decision authorizes
documentation and Packet reconciliation only. It authorizes no repository
implementation, schema or migration, provider call, real Guest-data handling,
credential, hosted mutation, external email/message, deployment, production
traffic or write, public behavior, or spend.

## 2026-08-03 — Demo schedule extended seven days

**Status:** superseded by the 2026-08-10 schedule decision below.

**Decision:** internal feature freeze moves to 2026-08-16, the MVP must be
complete and repeatable on 2026-08-18, and Demo Day moves to Wednesday,
2026-08-19. Product scope and authority gates remain unchanged.

**Reason:** the presentation moved by one week. The added time protects R4
implementation and R5 rehearsal; it does not silently admit P1 work or weaken
any Owner stop gate.

## 2026-08-03 — R4 Technical Control Packet v0.2 approved; Gate A opened

**Decision:** approve the exact independently audited R4 Technical Control
Packet v0.2 at
`sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
(1,981 lines / 107,235 bytes at commit
`074833edf7db7629455ff620654bfde0aed454c6`, tree
`b8f59e464072c689ee3b76617070e6f048fc0952`). The Owner's actual reply was
“嗯嗯，那我批准,” sent directly after the one approval request that named
this exact object and its authorization boundary. The normalized receipt is:

```text
批准 R4 Technical Control Packet v0.2 sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5
```

The Packet file remains byte-frozen; this external decision record preserves
the approved hash rather than modifying the approval object after approval.

**Reason:** P/T1/T2/T3/T4/T5/NH1/NH2 are closed, all three independent Packet
audit lanes are Green, no Red condition remains, and the three Yellow
conditions are deliberately assigned to Gate B physical/runtime proof or Gate
C production facts rather than hidden inside Gate A.

**Effect:** Gate A is authorized. Agents may create repository code/docs,
synthetic fixtures, local unit/property/integration tests, an ephemeral local
PostgreSQL test instance, content-safe read-only capability probes, and the
next exact Gate B Manifest. They may commit and push that work on a dedicated
branch and maintain a Draft PR, but may not merge the implementation without
later review. This approval authorizes no provider/model call, real Guest data,
external email, hosted mutation, schema migration, deployment, public traffic,
production secret, or spend. The next Owner stop gate is the hash-pinned Gate
B Schema, Runtime, and Migration Manifest; any first provider call additionally
requires the separately named First Provider-Call Test Grant, and real
Guest/production work remains Gate C.

## 2026-08-04 — Gate B v0.1 approved without a provider-call grant; first attempt stopped Red

**Decision:** approve the exact R4 Gate B Schema, Runtime, and Migration
Manifest v0.1 at
`sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa`,
while explicitly keeping the First Provider-Call Test Grant `NOT_REQUESTED`.
The exact Owner receipt was:

```text
批准 R4 Gate B Schema, Runtime, and Migration Manifest v0.1 sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa；First Provider-Call Test Grant NOT REQUESTED
```

**Reason:** Gate A had made the product rules repeatable in the repository;
Gate B was intended to test whether those rules could attach to disposable
PostgreSQL, encrypted fields, a zero-call official Codex boundary, fake
budgets, and a macOS physical boundary without entering a provider call or
production.

**Effect and result:** the approval opened only the exact local/disposable
Manifest work. During delegated Codex-lane preconstruction investigation, a
read-only hash search widened into real Codex-home session files. It emitted
paths but no file contents or credentials and started zero Codex threads,
turns, models, accounts, or provider requests. The read itself violated the
approved boundary, so the attempt stopped Red before the fixed lane sequence
completed. All remaining lanes are `NOT_RUN`; four unvalidated partial files
were removed; cleanup is Green; standard PR CI passed. Provider sessions/
bytes/spend, real Guest data, production writes, deploys, and merges are all
zero.

The Red report closes only that attempt. It does not authorize retry,
construction, execution, Gate C, or a provider call. The next Owner decision
is a separately hash-pinned Retry Construction Packet that splits runner
construction from later execution and keeps both Retry Execution and First
Provider-Call Test Grant closed.

## 2026-08-04 — Gate B Retry Construction v0.1 approved; execution remains closed

**Decision:** approve exact R4 Gate B Retry Construction Packet v0.1 at
`sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7`,
while explicitly keeping both Retry Execution Grant and First Provider-Call
Test Grant `NOT_REQUESTED`. The exact Owner receipt was:

```text
批准 R4 Gate B Retry Construction Packet v0.1 sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7；Retry Execution Grant NOT REQUESTED；First Provider-Call Test Grant NOT REQUESTED
```

**Reason:** the first Gate B attempt showed that constructing the integration
and exercising real runtimes under one authority made investigation scope too
wide. The replacement boundary first builds and audits one deterministic
runner without touching those runtimes, then returns a separate exact
Execution Manifest for another Owner decision.

**Effect:** one primary Agent may work serially inside the exact repository
workset to build schemas, static SQL, in-memory encrypted-field and fake-budget
logic, a fixture-only Codex adapter, unsigned native source/unit tests, an
adversarial path fence, and an aggregate runner dry run. It may publish the
body-free Construction Report and next Execution proposal without merge.

This approval starts no construction by itself. It authorizes no Docker, real
Codex executable, PostgreSQL execution, signing/Keychain, user presence, test
network, additional Agent task during Construction, provider call, real Guest
or email, Gate C, deployment, production mutation, merge, or spend. After
Construction, Green/Yellow/Red all return to the Owner; none opens Retry
Execution automatically. The Packet and low-load Owner Review remain
byte-frozen at their approved bytes.

## 2026-08-07 — Gate B Demo-critical Core scope correction approved

**Decision:** approve all five recommendations in the exact R4 Gate B
Correction Scope Decision Brief at
`sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f`:

1. implement a truthful Demo-critical PostgreSQL Core before the original
   Full-45/53-function/27-category target;
2. use a separate zero-call diagnostic Seatbelt profile without widening the
   real Fresh Session profile;
3. use a transient-candidate macOS MVP exception and leave persistent
   candidate protection/recovery post-demo;
4. accept and disclose the controlling Desktop Agent as a procedural boundary
   while kernel-constraining the child; and
5. remove every owned PostgreSQL runtime resource while allowing the exact
   pinned public image cache to remain.

The exact Owner receipt was:

```text
批准 R4 Gate B Correction Scope Decision Brief 五项推荐；只授权准备 exact Correction Packet；Correction Construction、Retry Execution 与 First Provider-Call Test Grant 均 NOT REQUESTED
```

**Reason:** deeper read-only review found that the remaining Yellow lanes were
not three simple wiring gaps. Most PostgreSQL surface functions were semantic
stubs, the pinned-real Codex branch still inherited fixture assumptions, and
the custom-Keychain/persistent-Secure-Enclave composition was unimplemented
and possibly unsupported. Connecting those pieces without a scope correction
could create a misleading physical result.

**Effect:** the original Technical Control Packet and Full target remain
immutable but incomplete. The active Demo claim becomes one public Hero
Encounter with real Core database semantics, a separately classified Codex
zero-call diagnostic and an explicit transient-candidate exception. Core Green
must never be labeled Full Green. This decision authorizes preparation of one
exact Core Correction Construction Packet only. It authorizes no repository
Construction, Docker/PostgreSQL execution, real Codex, sandbox-exec, signing,
Keychain, LocalAuthentication/user presence, provider call, real Guest data,
Gate C, deployment, merge, public traffic or spend.

## 2026-08-07 — Gate B Core Correction Construction approved; physical execution remains closed

**Decision:** approve exact R4 Gate B Core Correction Construction Packet v0.1
at
`sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6`
and its Owner Review at
`sha256:2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299`,
bound to proposal HEAD/tree
`5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e` /
`15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f`. The Owner granted Correction
Construction while explicitly keeping Retry Execution and First Provider-Call
Test `NOT_REQUESTED`. The exact receipt was:

```text
批准 R4 Gate B Core Correction Construction Packet v0.1 sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6；批准 Owner Review sha256:2ad228be60be0730056a4c1195b2ce1be8db11ee9e308e4bc4559edc226bb299；Proposal HEAD 5ccfcf1aaea0f1c5f164e29d91237c6e1842df6e tree 15aa88dcd33719f9c8a0c9c0455d1c7ecdf8a60f；Correction Construction Grant APPROVED；Retry Execution Grant NOT REQUESTED；First Provider-Call Test Grant NOT REQUESTED
```

**Reason:** the approved scope correction needed a repository-reviewable Core
mechanism before any new physical attempt: a Demo-critical PostgreSQL Core
implementation, a separate Codex zero-call boundary, and a transient macOS
candidate path, all tested behind fake effect ports. Later successor review may
still correct the Core interpretation without rewriting this historical grant.

**Effect:** the authorized Construction completed and was published at review
HEAD/tree `0e6a1a27e43adc54a4997ae98fda54dcda25da2e` /
`b8d3d64dec3d0d6901ae72e127f0476ac75f14db`. The final check passed 381 Node
and 19 Swift tests. Docker/PostgreSQL runtime calls, real Codex/Seatbelt,
thread/turn/provider/network, app signing/launch, Keychain and user-presence
effects all remained zero. The body-free machine evidence is
`sha256:8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09`;
the Construction Report is
`sha256:4369c5bf7f95e805b440c47a5d2908b091d74c14ab0b322a39d663978c570f40`.
The returned Execution Manifest
`sha256:f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74`
is intentionally non-approvable Yellow. This completed Construction does not
open Host Binding, physical adapter Construction, Retry, Provider Call, Gate C,
deployment, merge, public traffic or spend.

## 2026-08-07 — Physical Adapter + Host Binding direction approved; exact Construction remains gated

**Decision:** approve all five recommendations in the exact R4 Gate B Physical
Adapter + Host Binding Decision Brief at
`sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2`,
bound to proposal HEAD/tree
`8f027876af37815f110028763eda1d7cb9679679` /
`f4903e52d0b158085810969c2173520b41082bcd`. The exact Owner receipt was:

```text
批准 R4 Gate B Physical Adapter + Host Binding Decision Brief sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2 五项推荐；Proposal HEAD 8f027876af37815f110028763eda1d7cb9679679 tree f4903e52d0b158085810969c2173520b41082bcd；只授权准备 exact Construction Packet；Host-Binding / Adapter Construction、Retry Execution 与 First Provider-Call Test Grant 均 NOT_REQUESTED
```

**Reason:** the current Core repository/fake mechanisms are not yet one safely
executable machine. The approved direction first constructs one unified runner
and three closed physical adapters behind fake effects, freezes its
implementation bytes, and only then permits a separately approved bounded
read-only binding to Owner-chosen Docker, Codex and macOS tools. It also makes
the PostgreSQL public-pool/race corrections, Codex causal limit and transient
macOS CLI-signing tradeoff explicit rather than overstating Yellow evidence.

**Effect:** this approval authorizes preparation of the exact successor
Construction Packet and low-load Owner Review only. It authorizes no repository
Construction, host inspection, Docker/PostgreSQL execution, real Codex/
Seatbelt, signing/Keychain/LocalAuthentication, Retry, provider call, real
Guest/Room data, Gate C, deployment, merge, public traffic or spend. Those
proposal bytes must return with exact hashes and commit/tree before the Owner
may open the requested Host-Binding / Adapter Construction Grant.

## 2026-08-08 — Physical Adapter Construction built; sole Host Binding attempt returned Yellow

**Decision:** the Owner approved exact R4 Gate B Physical Adapter + Host Binding
Construction Packet v0.1 at
`sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06`
and its immutable Owner Review at
`sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9`,
bound to proposal HEAD/tree
`a45ea061e8e92f247597787e36ecfe52740b216a` /
`89b28903fc34e985a17e8f3fdc4bfd7d0972880e`. The fixed Host Binding input was
prepared, the Host-Binding / Adapter Construction Grant was `APPROVED`, and
Retry Execution and First Provider-Call Test remained `NOT_REQUESTED`. That
grant authorized exactly one Construction + Host Binding sequence and is now
consumed; it does not authorize a re-run or Retry.

**Reason:** the approved boundary first needed one byte-frozen, fake-validated
physical machine, then one bounded read-only attempt to bind it to the
Owner-supplied local environment. A binding identity failure must return to the
Owner without relaxing file identity, starting inspectors, or converting the
Construction grant into Retry authority.

**Effect:** Physical Adapter Construction completed at final implementation
`I` / tree
`92c6c3f8896494aed699671a04a93a09fb59087d` /
`cf2ce5567c601fff1ad709e565dde41cf9c3540d`. The unified runner, corrected
PostgreSQL race machine, Codex zero-call lane and transient macOS lane were
built and fake-validated with zero real physical effects. Exactly one approved
Host Binding attempt then found a supplied binding path symlinked before any
inspector start and returned Yellow. The input was consumed and removed;
Docker CLI starts were `0/3`, local Docker socket requests `0/2`, and macOS
inspector starts `0/9`. Cleanup is Green, no Host Binding capsule or body-free
public receipt was created, and Retry/provider effects remained zero. No retry
occurred. The result is recorded in the
[`Physical Adapter Construction Report`](./R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md),
the non-approvable
[`Physical Retry Execution Manifest`](./R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md)
and its returned
[`Owner Review`](./R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md).

## 2026-08-09 — Host Binding Reattempt v0.2 approved; attempt 2 returned Yellow without inspectors

**Decision:** approve the exact R4 Gate B Host Binding Reattempt Envelope v0.2
at
`sha256:ee713295af27577edadeeca8c5188d492acec12816ab4e5cf4488f1f6146daf3`,
its Owner Review at
`sha256:670338ba6983c77daa70c67741828eedf7666dee5b88aad3fcb5a706af52e445`,
and the preparation grant bound to proposal `af5396bb1ff69d6c2b74fbb5f9e4cea415fb826d`
/ tree `b7aabaac66156f6d169be1547cc6caa2ea4e8a4e`. Host Binding Attempt,
Retry Execution and First Provider-Call Test remained `NOT_REQUESTED` during
preparation. Final implementation `J`
`7ae4a241117b842eb5d5de49061e7178dde4aec3` / tree
`a40045cad65c8875953f720ad6c9a192ad670458` then produced Activation Card
`sha256:4be3de82061ad3dd10219ad8020b00c0e6f9f19795899bef6bde363026015af6`.
The Owner activated that exact Card for one read-only Host Binding attempt with
`attemptOrdinal=2`; Retry Execution and First Provider-Call Test remained
`NOT_REQUESTED`.

**Reason:** the prior one-shot grant was consumed and could not be silently
reused for the post-portability executable bytes. The lean v0.2 envelope bound
one final implementation and one Owner-supplied input while retaining a hard
stop before Retry or Provider authority. Host Binding remained a prerequisite
check, not the Controlled Presence product outcome.

**Effect:** attempt 2 terminated
`YELLOW_NO_RETRY / HOST_BINDING_INCOMPLETE_YELLOW` before any Docker CLI, local
Docker socket, or macOS inspector started (`0 / 0 / 0`). It produced no Host
capsule or body-free public receipt and cleanup is Green. Attempt 2 is consumed;
there is no automatic retry. No Retry, Provider, Guest, Room, deploy, public
traffic or spend effect occurred.

## 2026-08-09 — GitHub project management envelope approved; Host work demoted to an enabler

**Decision:** approve Forme GitHub Project Management Envelope v1. Within the
existing R4/R5 Vision and scope, Codex may maintain Issues, Project, Milestones,
labels, PR metadata, task decomposition and priority, and may synchronize
already approved and audited implementation facts. It may not change product
Vision, merge a PR, deploy, publish publicly, call a Provider, widen privacy or
permission boundaries, or create spend. Scope change, external effect and Owner
Experience Acceptance remain Owner decisions.

**Reason:** project control should keep each implementation attached to the one
Living Project Twin story without returning routine task bookkeeping to the
Owner. Host Binding had accumulated disproportionate project weight even though
it is a local prerequisite rather than the R4 user outcome.

**Effect:** #66–#70 now express the R4 product sequence: local Projection,
Public Room/knock, Fresh candidate, exact Response delivery, and bounded
continuation. #71 tracks a time-boxed Setup/Doctor enabler. Host work is not the
#67 critical path and cannot substitute for one real public encounter.

## 2026-08-10 — #66 local Projection Owner acceptance completed; PR #72 integrated outside main

**Decision:** accept the #66 local Projection experience for exact review hash
`sha256:45414f18e70b0c5e7f3a2f6980b1596835952663dfea2d25d87605b8283d1480`,
Twin revision 29 at
`sha256:c527b65fa55f7db852776002114f7a22e93a6b178e3c68e076baaa5a400ddfd4`,
and immutable local receipt `receipt_57a7c38df5120a590996dad29040b72e`.
Restart reconstruction returned `APPROVED_CURRENT` with the same bindings. The
Owner separately approved PR #72, which merged at
`87e59791fef320f0b437d59f4acb9fa9a7d8344b` into
`codex/r4-gate-a-build`, not into `main`.

**Reason:** the Owner experienced and accepted a truthful, bounded public-content
shape with Vision & Becoming, Now, Next Move, Tensions, Open To and explicit
interaction boundaries. The local review proves content review and restart
continuity without conflating those semantics with publication authority.

**Effect:** #66 is Done. Its approval remains
`publicationAuthorized=false` and `roomMutationAuthorized=false`; all Room,
network, Provider, Host Binding and publication counters were zero. Its exact
copy refers to #66/#67 as temporary phases, so it is explicitly non-publishable
and cannot be reused by #67. A publication-stable successor and a new exact
Room-bound publication approval are required.

## 2026-08-10 — #67 offline Technical Review Green; production Public Core and Owner encounter remain open

**Decision:** treat commit `eabfe82a2cc58f8fd87558e5504d4515af9f9f88`
as the initial offline Technical Review evidence for #67 only. The stacked
Draft PR #73 now carries that proof at
`5e93196033166d7f2cd64e23ba3750ed88bd9740`. It proves the
local approved-Projection → Room-bound reapproval seam, immutable local
receipt/recovery, an in-process Public Core rehearsal through independent
curation and one 24-hour/one-use knock to durable local pull, and the richer
visitor rendering. It does not prove production publication or complete #67.

**Reason:** synthetic/fake closure is the safe first proof layer, but the R4
Definition of Done still requires one real visitor encounter and Owner
Experience Acceptance. The project must not rename offline mechanism evidence
as Presence.

**Effect:** the original 319 deny-network R4 tests, typecheck, no-server-AI
check and independent audits remain valid evidence. The current stacked full
check is Green at 45/45 + 339/339 + 145/145. No production PostgreSQL migration,
Gate C deployment/provisioning, Room creation or mutation, publication,
Curator admission, real Guest data, public traffic, Provider, Host, external
email, production secret or spend occurred. #67 remains In Progress. `main`
remains `7c1f7bd00e7307fa3695386ed7f55b52db88c97b`. Draft integration PR #65
is at `cbadd8a`, Draft PR #73 at `5e93196`, and the public-only boundary
foundation on Draft PR #75 at `09401a0`; all three are CLEAN / CI Green and
unmerged. PR #74 is merged and repaired only the deterministic Linux
inode-reuse fixture. None of these facts constitutes production activation or
Owner Experience Acceptance.

## 2026-08-10 — August 25 schedule and Demo-critical R4 execution cut confirmed

**Decision:** move repeatable-ready to 2026-08-24 and Demo Day to Tuesday,
2026-08-25. Continue the already approved Demo-critical Core claim: the live
August story must include one real public Room, one public knock, one Fresh
local Response candidate, one exact Owner-approved Response, one public
`24h / 1 Interaction` continuation and a negative Private-Room boundary. It
does not require the positive Private Room/Grant path, notification email,
Agent Guest, or the `3d/2`, `7d/3`, and `7d/10` continuation presets.

**Reason:** the additional calendar time is for completing the same connected
Presence story and rehearsing it, not for restoring every Full surface or
building a general Room platform. The product keeps all four MVP dimensions
while reducing depth inside R4.

**Effect:** R4 runs through 2026-08-21 and R5 hardening runs 2026-08-22 through
2026-08-24. The positive Private/notification/multi-preset surfaces remain the
approved post-demo architecture target. Demo-critical Green must never be
reported as Full Green. This decision changes no privacy, Provider, deployment,
publication, merge or spend authority; those exact gates remain closed.

## 2026-08-10 — August 25 reframed as Progress / Vision Sharing; current R4 scope preserved

**Decision:** August 25 is a Progress / Vision Sharing checkpoint, not a hard
deadline for a complete or repeatable MVP. Remove the date-driven Aug 20–24
cut/freeze sequence. Continue the already selected #67 → #68 → #69 → #70
walking slice without dropping a link merely to fit the sharing date.
Completion remains gate-driven: passing tests establishes Technical Review,
and the real causal experience becomes Done only through Owner Experience
Acceptance.

**Reason:** the sharing is now primarily an honest account of the product
Vision and the state actually reached. Preserving the connected Presence story
is more important than manufacturing date-shaped completion or presenting
offline mechanisms as a real encounter.

**Effect:** this supersedes the hard completion, cut and R5 calendar windows in
the immediately preceding schedule decision; it changes no product, privacy,
schema, Provider, deployment, publication, merge, external-effect or spend
authority. It does not restore the positive Private Room/Grant path, optional
email, Agent Guest, `3d/2`, `7d/3`, `7d/10`, or other Full surfaces to the
current R4/R5 execution scope. Those remain approved architecture/future scope
unless the Owner opens a separate scope decision. R5 begins after real R4 Owner
Experience Acceptance, not automatically on a calendar date.

## 2026-08-10 — R4 #67 Durable Public Core repository construction approved

**Decision:** approve the exact Durable Public Core Construction Packet
`sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31`
and Owner Review
`sha256:8272df04a9374ca04be3f212cd0bc8b123d138953224c24a66d13d08912887ff`,
bound to Packet baseline `4841c32f07d3e6810cb023387cefa0562b85b777` /
tree `abc24d75345637886f3252caf3d8eeec7c6ec6be` and frozen wrapper
`d81e6fd3e1de9737d6c6dcf93fe642907654eec8` / tree
`4910018a05b5b9d91bc3b3b2463698300e156a2a`.

**Authorized outcome:** construct only the one-Room / 20-action / 14-table
injected durable Public Core application/store, proposed SQL/schema, and
synthetic/ephemeral deny-network evidence in the Packet's exact workset.
Maintain the same exact proposal branch and Draft PR #76; do not merge.

**Still closed:** migration execution, real database or Room mutation,
product/runtime/data-plane network, vault or secret installation, runtime/API
route activation, deployment, publication/admission, real Guest data,
Provider/email, traffic, merge and spend. Construction must stop at Technical
Review plus a hash-pinned proposed Gate C Card; it cannot make #67 or R4 Done.

## 2026-08-11 — R4 #67 Durable Public Core Construction Addendum A approved

**Decision:** extend the exact Durable Public Core Construction workset by one
test file only: `test/r4/public-core-config.test.ts`. That test may change the
expected `productionApplicationAdapterConstructed` and
`durablePersistenceAdapterConstructed` facts to `true` and must cover the
action-aware `public_single` / `closed` Room guard. The existing construction
evidence schema, machine evidence, artifact index and this decision record may
record the Addendum; the config test becomes the sixteenth indexed artifact.

**Reason:** the repository-only application and durable persistence adapters
have now been constructed and independently reviewed, while the previously
frozen config test still asserted their pre-construction state. Addendum A
allows the evidence boundary to state that narrow fact without turning
constructed code into activated infrastructure.

**Effect:** exactly two construction facts may become `true`. The credential
vault adapter, transport adapter, `trafficReady` and `gateCReady` facts remain
`false`. Runtime and route wiring, a database driver, migration execution,
database or Room mutation, product/runtime/data-plane network, real Guest data,
publication/admission, vault or secret installation, deployment, Provider,
merge and spend remain unauthorized. The stop point remains Technical Review
and a hash-pinned, non-approvable Gate C Card; #67 and R4 remain open.

## 2026-08-11 — R4 #67 Durable Public Core Construction reached Technical Review Green

**Decision:** record repository-only Construction as Technical Review Green at
Stage-A commit `bcd4259130627067e1e7cf1974513801545cda35` / tree
`7e6c3236c06d63f06e93e8a4d1b69fe0a20bca31`. The 16-artifact aggregate is
`sha256:c825306a5e20e910e6fdd811d1d3599b59e317baaa18b46c98ba13b8c0c3e44f`;
machine evidence is
`sha256:864e94151e5bc3864f154d089da7590501dbee7eedb62e61f980118d2e0a4dc5`;
the Construction Report is
`sha256:452c1c17a6cbd8a0dfab56a29654a94088978b9f483c6e837a319426dcbea657`;
and the non-approvable Gate C Card is
`sha256:dcc2fb79a96d37eba8b1b0fb276a9ee0b01a436501520e224650cabeaf2e73f6`.

**Reason:** the exact one-Room / 20-action / 14-table application, durable
persistence, proposed SQL, crypto, retention and synthetic fault/race evidence
passed the frozen validation matrix and independent Stage-A/index review with
zero Blocker and zero Important findings. Addendum A reconciles the two
constructed facts without changing activation authority.

**Effect:** application and durable persistence construction are `true`;
credential vault, transport, `trafficReady` and `gateCReady` remain `false`.
No PostgreSQL process or migration, driver, runtime/route activation, database
or Room mutation, product/runtime/data-plane network call,
publication/admission, real Guest byte, secret install, deployment,
product/runtime Provider/email call, merge or spend occurred.
#67 and R4 remain open; the next artifact is a separately authorized and
independently reviewed production-wiring successor, not activation of the
current Card.

## 2026-08-11 — R4 #67 Local PostgreSQL Wiring Phase 1 reached its exact stop

**Decision:** record the Owner-approved Local PostgreSQL Wiring Construction
Packet `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`
and Review `sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca`,
Addendum B `sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f`
and Review `sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2`,
and Addendum C `sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d`
and Review `sha256:2aaa4d1243e2813b4030a37bae2cd7f14b41ca29c3814f4bce70c4c0161f65b7`.
Their last authority wrapper is `deb12a045f5d84281bc9da0f110e049748949970` /
tree `4b9028a942d4ac436527586aee64fbc23ec3488d`.

**Result:** exact Stage A `bc0b52023bb19d4e41fc4daa4a1e232961e1a19b` /
tree `d5cb758467d06bfd7f17b6ae6a34664e659e1e3d` freezes 19 artifacts
(6 added / 13 modified) with aggregate
`sha256:d25ebe21a75be81371209699f072dc404947b3f2f7fb6a69c12c5c2d71d5e417`.
The application, durable persistence, concrete `pg` executor and 20-method
application-store bridge are constructed. The corrected committed static SQL
contract is 14 tables / 207 columns / 172 constraints / 44 indexes, including
`interactions.interaction_type text NOT NULL` with its exact three-value check.
It is not a target PostgreSQL observation.

Machine evidence `sha256:37a6ce9b39279281dc9a94e9ee166bf4c8b1ee70caefd3168ef556c8ff8f539d`
validates against schema
`sha256:9bc0d1dbf3a1a74a272e17e4f1ad6bce9d0c33b65bcf7d4ae9fc00567f76902f`;
the 19-artifact index is
`sha256:6e63d94ce473e5d8386c46860a3e398b8331f8955003437576710c49ebe759d9`.
The [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md)
is `sha256:060e6d05e91101ee95786600698b699c3796758083a2d862a23d3c907ca9ef14`;
the successor [Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
is `sha256:b63aa612206af85671af44cdad1fac2727e6c0c3fc96459636f59cec8359f5bb`.

**Validation and boundary:** focused, runner, complete Public Core, full offline,
current-successor Gate-B candidate and spine lanes pass 85/85, 66/66, 318/318,
638/638, 145/145 and 45/45 respectively; TypeScript and static checks pass;
independent Stage-A/index audit reports 0 Blocker / 0 Important. The Gate-B
145/145 result proves four exact pre-effect successor-lock denials and does not
rebind historical Gate-B authority or change its Yellow state. No repository
command/package/source-control external network, Docker/OCI, PostgreSQL/SQL,
product data-plane, production/runtime/real-data, product Provider/model/email,
deployment/publication/admission, push/PR, merge/release or spend effect
occurred in Phase 1.

**Stop:** `INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`. The current runner
still binds the prior 17-path wrapper and cannot physically consume this
19-path state. Physical Rebind requires a new exact Packet, Review and Owner
approval. Gate C, #67 Done and R4 Done remain false.

## 2026-08-13 — R4 #67 Physical Rebind Effect 0 reached Technical Review Green

**Decision:** record the Owner-approved repository-only Physical Rebind
construction at implementation K `bcfe3349e01a655c2d52d6abbca0038cc3bff6e2` /
tree `c34372a7cd121f157ade1fa86841fdebc69bb4ed` and evidence L
`beeb55b662372e2b4f2a16f8768c16905a7a9978` / tree
`10cb87830e37f8070320df09fb0b0dbdaef3268b`.

**Authority and artifacts:** Packet
`sha256:3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa`
and Owner Review
`sha256:9ce9a8dfedca0e85deabb9b490055eda9662e492d3b3b51cabeaab1ec2afc9bf`;
artifact index
`sha256:b3e95a61af0de08b3ddeb5dab7c92309f97eb8a7991126f47d71d638bea9c554`;
strict evidence schema
`sha256:06eeead4377ebcdd7d7d145e704b0b313ba54a958659f31cba7475be49ac3d27`;
machine evidence
`sha256:c9b9e48590d501023eda000f49dd6c1f58b5f757ff07095e035678fbc17acaf3`;
[Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md)
`sha256:23a010a39cfa7c093dcf1edd8da2ed4b44730e588ea00460219b63c2683cc43e`;
successor [Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
`sha256:e12b2fc8c86bb9c82d8df560f9feeb7ed75817bb14bfba342580cd2ec56f69a0`.
Committed K/L audit summaries are
`sha256:0d87de0d35468577eec9dde967f7c5d6d4b5db4b3442231e0254e329096ada00`
and
`sha256:bccef86f5103b56f5ea1672aa276cb9d0c41f6ae58e10b8ba193eebd1ce54d69`.

**Validation:** exact deny-network lanes pass 139/139, 85/85, 391/391,
711/711, 145/145 and 45/45. Runner syntax, TypeScript, no-server-AI, legacy
documentation regression, strict Ajv/mutations, committed blob/hash-DAG and
diff checks pass with 0 Blocker / 0 Important.

**Effect:** the runner now rejects obsolete 17-path/14-artifact/v1/v2 authority
and constructs the v3 one-use grant/receipt, durable effect ledger, bounded
cleanup recovery and identity-drift stops. It does not prove a physical run.
Repository-command/package/source-control network, Docker/OCI,
PostgreSQL/database/SQL, product network/production/runtime/real-data,
Provider/model/email, deploy/publication/admission, Gate C, push/PR,
merge/release and spend effects are all zero.

**Stop:** `LOCAL_POSTGRES_PHYSICAL_REBIND_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`.
A new Physical Execution Card, Owner Review and exact Owner approval must bind
the final status commit and its external committed-byte audit before any
pending grant or physical effect. #67 and R4 remain open.

## 2026-08-13 — APFS nlink correction reached repository Technical Review Green

**Decision:** record the failed one-use Physical Execution prepare as
historical zero-effect evidence and accept only the precisely approved
repository correction. The failed Card
`sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77`,
Review `sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e`,
canonical payload and private receipt
`sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a`
are non-executable and cannot authorize a corrected pending grant.

**Result:** Kc `18e3a325cceabdf5168b5ffb328ee2580b069a76` / tree
`184d9a4147fbb9baea22b1303ca24a09c2687a79` and Lc
`32448cb962c823d39205cc83d11aa3f6571cf65d` / tree
`02b377385a0e68a60021f878027f41ab34399f63` remove only the fixed directory
link-count equality. Stable identity remains exact path/dev/ino/uid/gid/mode;
the exact entry and no-follow membranes remain closed. Index
`sha256:d3b2ce01350636bbcd6fbde1ee938c6cd5c55f7b8d5e38e72fa4f6dbd5d67056`,
schema `sha256:1cbd487272b052ef9116e473249824476b954e4e07818eb7d90b6079ffd6826a`,
evidence `sha256:19788c80464ca23e03d5dab6aaf8d810c8541362f414e96d25ab7b9495a1300c`
and [Correction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md)
`sha256:0c462d2798c61c4a12a085e465f360c888b234e897fd0a3d8dd5c6e0c9e0e175`
freeze the result. The current non-approvable successor
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:986dfecbd439bdb36e1a0f23041c249cf556382a5e4eb2acd2e1daea4dc9c1ce`.
Committed Kc/Lc audit summaries are
`sha256:eadd61948def5d6f14e8cab56bc06a30c8807d3711157876b12ab63a6bf5eb00`
and `sha256:01344b279f87b722a9898bda40b27c226e9a67ae24742ecbed82724b86bce58f`.

**Validation and effect:** deny-network lanes pass 141/141, 85/85, 393/393,
713/713, 145/145 and 45/45. Strict Ajv, authority topology, committed blobs,
syntax, TypeScript, no-server-AI, docs and diff checks pass. Pending/consumed
grants, Docker/OCI/PostgreSQL/SQL, production/runtime/traffic/Gate C,
push/PR/merge/release and spend effects are zero.

**Stop:** `LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`.
Only a fresh Card, Review and exact Owner approval bound to committed Mc and
its external audit may open a later local physical attempt. #67 and R4 remain
open.
## 2026-08-13 — execution-authority topology correction reached repository Technical Review Green

**Decision:** accept the precisely approved Topology Correction Addendum
`sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22`
and Owner Review
`sha256:ce5be9d958e45e05450a19d56aa093344f9e28003ca2534ecf0d13e72d3b9c2b`.
The failed unversioned Physical Execution Card/Review remain immutable
historical evidence. Any future authority proposal must add the unique
`PHYSICAL-EXECUTION-CARD-V2.md` and
`PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md` paths. This decision grants
repository construction only; Physical Execution and Gate C are not requested.

**Result:** Kt `f7d37830044ca2ad098b4c031feb62de77e209c3` / tree
`edbe46a65a5008c3221087e83345407a3a197d5e` and Lt
`c699f9d9b023e5185baebbf429a3044bfae0366a` / tree
`53bf1fb2877003251e2468dc7c3e70f2175ae3d6` freeze the corrected verifier,
historical lineage and versioned add-only successor contract. G2t is
`sha256:3443602d4f7b1561088f6815c8fcbc866ec75f8915eebf94ab7c0cf1d5d359d6`;
G3t is
`sha256:8a34840526c11e5ab3318157992d55180d45da6d3cc649a5d0ad1527ae717535`.
The index
`sha256:50db6a2f64ca9e9a3f1a600a7d7a37d17fca5c955a57d1ce461cf626d44dc2c5`,
schema
`sha256:406ece284dc381839265c3b9fc4940e935f64e18444679428ca725c525a19bc3`,
evidence
`sha256:6ed602d102f9bf2399182c17abb2370cc5cd1e8678c5198e9ca76fe5fb6bcd57`
and [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md)
`sha256:99a0c1e119ff9324e2cfec292db7c8ea4f08fff26a7d71ffdf6922dd66efaf64`
freeze the machine and human evidence. The current non-approvable
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:b8474436e2e83e2b918ff34e469c4d6b4c9d3f93291b17318f4a0056f612a53f`.
Committed Kt/Lt audit summaries are
`sha256:193c18fad8f845c1fbaffdc09aea35f9e3d82cbd7c44651e7b2e0daf3c0a74f0`
and
`sha256:4b313ae973f8dcdd07bb519bf0c2372763b5918e10e71be3f3d214c0e24b7d94`.

**Validation and effect:** deny-network lanes pass 142/142, 85/85, 394/394,
714/714, 145/145 and 45/45. Strict Ajv, complete committed topology,
committed blobs, syntax, TypeScript, no-server-AI, docs and diff checks pass.
Canonical payload v1, grant v3, receipt v3, SQL, dependencies, locks and
effect ceilings are unchanged. Pending/consumed grants,
Docker/OCI/PostgreSQL/SQL, production/runtime/traffic/Gate C,
push/PR/merge/release and spend effects are zero.

**Stop:** `LOCAL_POSTGRES_EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`.
Only the fresh versioned Card/Review proposal may be constructed next. Grant
preparation or physical execution still requires a later separate exact Owner
approval. #67 and R4 remain open.

## 2026-08-14 — Docker diagnostic/rescue correction reached repository Technical Review Green

**Decision:** preserve the consumed v3 Physical Execution and its final
`FAILED / cleanup BLOCKED` result as immutable history, and accept only the
precisely approved repository correction. The Docker Diagnostic and
Blocked-Cleanup Rescue Correction Addendum is
`sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9`;
its Owner Review is
`sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4`.
This decision grants no cleanup rescue, further Physical Execution or Gate C.

**Historical physical truth:** Card V2
`sha256:1ca420578f3e16c75b8242d71b93ea7be18baa1815c0f83e610807f9ded7c795`
and Review V2
`sha256:e92a125cdf1f8c4df8448836275bd98225ec8ce0b764dd70dfbabc479366e377`
authorized one v3 prepare and one disposable local rehearsal. Grant
`sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`
was prepared and consumed. Docker client/server `29.3.1` and `linux/arm64`
matched; the run then failed on the first exact container-absence diagnostic.
The cleanup-only recovery also stopped `BLOCKED`. Final evidence is
`sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`;
the journal is 34 entries with head
`sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`.
No Docker resource was created or mutated and PostgreSQL/SQL/domain counts are
zero. The consumed grant cannot be retried or converted into rescue authority.

**Result:** Kd `0fdf68c7c786085189c3df0787df07f366c6df5b` / tree
`5f091925b8b48cbd515700b275465506a391ccde` and Ld
`62d0c98d7052998b7bb69b76c83f60576091836b` / tree
`4673f445021f0d4a92c6e01e4bdccbb303141e0a` freeze the exact diagnostic
correction and inert future rescue membrane. G2d is
`sha256:25dba2e75ca042e8c20e096ddaf9f5ee24506fab678a0a0f33366edd8ecebe22`;
G3d is
`sha256:6a0ee94a92e7b5f153c269300e98f1a86108c63e4b3f8a88f951b1648fb3c749`.
The artifact index is
`sha256:0dc154f786646243a13d500b0a41ae31cbcba42b15d1ed426503bf72d6ba2b4b`;
the strict schema is
`sha256:57a96cf603e393e1eb8849e2c6a3e7b10f9d143a3c249456936dd48a05d440be`;
machine evidence is
`sha256:9a6296c94ab0d4dee89449b7873a6cf04fec3a8e89f64170bca5eda9043a4ee3`;
the [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md)
is `sha256:ccae05f1b44caea794b7b55e4a5bbf9796482dc1ad4d2a7a84771f1ebf9ad19f`;
and the current non-approvable
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:80174c78baf223f7a7f2e7129749f7a4b00ca3f3d6cef72ce1f6c3952b564f8d`.
Committed Kd/Ld audit summaries are
`sha256:450160411b61707c244bbe2e7de3d22ede0aa2a0d27cb2c469fc7e05e0eafdc7`
and
`sha256:0de8f47a573d2a1f00836881858166bc5db2d0e541ab2e02c4b43989a739c94a`.

**Validation and effect:** exact deny-network lanes pass 151/151, 85/85,
403/403, 723/723, 145/145 and 45/45. Strict Ajv, authority topology,
committed blobs, full-line diagnostic positives/near misses, future rescue
grant/receipt, crash recovery, root/host drift, real-port denial, syntax,
TypeScript, no-server-AI, docs and diff checks pass with 0 Blocker / 0
Important. This construction made zero external-network, old-root, pending or
consumed rescue-grant, Docker/OCI, PostgreSQL/SQL, production/runtime/traffic,
Provider/model/email, deploy/publication/admission/Gate C, push/PR,
merge/release or spend effects.

**Stop:** `LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
Only the unique Blocked-Cleanup Rescue Card/Review proposal may be constructed
next. Rescue prepare/execute requires a later separate exact Owner approval;
another Physical Execution and Gate C remain still-later independent gates.
#67 and R4 remain open.

## 2026-08-14 — body-free Docker inspect diagnostic construction reached repository Technical Review Green

**Decision:** preserve both consumed one-use grants, both forensic roots and
both `FAILED / BLOCKED` receipts as immutable history. Accept the precisely
approved Body-Free Docker Inspect Diagnostic Capture Addendum
`sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13`,
its Owner Review
`sha256:a3dbb56df2fefbb05eef9a1175c49b9afb1a83982909309d5ba230c735222579`,
the Authority-Path Correction Addendum
`sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00`
and its Owner Review
`sha256:a7448857f699507babb31477e67e6cf1491d3297a74ed1479de92300e00be1f7`.
The correction selects only the future versioned `-CARD-V1.md` and
`-OWNER-REVIEW-V1.md` effect-authority paths. This decision grants repository
construction only; Docker Diagnostic, cleanup, Physical Execution, production
and Gate C are not requested.

**Historical rescue truth:** Rescue grant
`sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654`
was consumed once. Final evidence is
`sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979`;
the journal is 6 entries with head
`sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491`.
The result remains `FAILED / local_postgres_docker_call_failed / BLOCKED`.
No Docker resource was created, started, stopped or removed; no PostgreSQL,
SQL or domain effect ran; resource absence remains unknown. The earlier
physical grant/evidence/journal remain separately frozen and non-retryable.

**Result:** Kf `bd3cdf71055136dce2731d7da3bef9dc89e6f4d7` / tree
`66af8e43a3372d6d871a1a778b4822b8a7307a16` and Lf
`7384ef89e70209657f1bb8714d9f708004bacc13` / tree
`fb3539a4013679c7cf1626eedc4e4227b4c55ca4` freeze the strict one-use,
write-ahead, no-retry body-free diagnostic membrane. G2f is
`sha256:9909862f7016dfc8074408d4b59a9d6b1eb394b9e894e458d900243324ef8bd4`;
G3f is
`sha256:b51e1e01bc2bd2228ddb5a4d84ff58d002e65c30bd977e135f2215591c3e59ff`.
The artifact index is
`sha256:c61143957b8323609f93420013a207ae1a3f72ce7a6e5d7b32b3fc10a411ade8`;
the strict schema is
`sha256:0462c9cd5f921e76610e377211015735c064e9a5ef73ffd653a02b735fdc5bd9`;
machine evidence is
`sha256:8b3443916e3660913704dffe3d6d89fc47882d582c43ebc985aebcda90cd5149`;
the [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md)
is `sha256:0d4911b1e26671c33d016deb6f5fa92be542add857216f72397e15e1294800da`;
and the current non-approvable
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:2ec719b52f7fe730d616e7347401abc4cb453c67a0c8ee5c326cd83d832d135e`.
Committed Kf/Lf audit summaries are
`sha256:3614d5fc8d023c343c6c60b8be5a21569177f1c86be5007cc3feb122788e9edd`
and
`sha256:a5282e9c0ba83ee92cec45c06b7801a43b22822aa586aaebd67d47ff527efba4`.

**Validation and effect:** exact deny-network lanes pass 160/160, 85/85,
410/410, 732/732, 145/145 and 45/45. Strict Ajv, four authority steps,
committed blobs, body-free fingerprints, hostile grant/journal/receipt,
consume/journal/call crash, duplicate consume, expiry and drift, syntax,
TypeScript, no-server-AI, docs and diff checks pass with 0 Blocker / 0
Important. Construction made zero external-network, forensic-root, pending or
consumed diagnostic-grant, Docker/socket/OCI, PostgreSQL/SQL,
production/runtime/traffic, Provider/model/email,
deploy/publication/admission/Gate C, push/PR, merge/release or spend effects.

**Stop:** `LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_DOCKER_INSPECT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
Only the versioned Diagnostic Card V1/Review V1 proposal may be constructed
next. Diagnostic prepare/execute, cleanup, another Physical Execution,
production and Gate C each require later separate exact Owner authority. #67
and R4 remain open.

## 2026-08-14 — failed V1 diagnostic prepare corrected; outcome-envelope collaboration adopted

**Decision:** preserve the approved Diagnostic Card V1/Review V1 and failed
pre-grant `prepare` as immutable history. Accept the bounded repository
correction authorized by Prepare-Failure Addendum
`sha256:ae774a9233b1b0c5a69d40f1ce19634f9d6ae4b6a264cb7c289548ddc06dc060`,
Owner Review
`sha256:258a1fea0bf77d2be4aa09f655575c8c9afba5ab3f188e9189eb80cc1662eaaa`,
Root-nlink Addendum
`sha256:5f573a18da85cb13f46d887e06a24d31a4acc390e9673432a185850e44645f5b`
and Owner Review
`sha256:9697d3171451518f7445dbf80b5f0b7545ef6b68649bb4541c18267278933b1c`.
The result identifies 19 closed prepare stages, returns body-free failure codes
and preserves exact same-inode rollback without authorizing a replacement
diagnostic.

**Result:** Kp `eaca190eb36fa45ea12077956a4a4b1433102c16` / tree
`ec98c83bab6c12be04e7c02e1738ed113da73f64` and Lp
`7a31dbaa385be561acac4fc21f017a804be4a68c` / tree
`d6e2dc39b693091069ed92f6bcef8ce79e533cc4` form exact `2M` then `3A`
commits. G2p is
`sha256:84254f0f408be406b8e87a3468dbb0f67abfc49b183abf65db6fa74f4d6929e0`;
G3p is
`sha256:6aec3a9e4c867403ec7e3f0c08f4892aa40129b39a83850a4eb04d6894538a26`.
The artifact index is
`sha256:7854774fc10c58e5da6475fc97da6997102822fd406f6abdb0d8cbf209794bc0`;
the strict schema is
`sha256:2a44cf5e6a8f19ed1d8db4ed75b533c5fb42c650f76dea03cf885ca86b55a532`;
machine evidence is
`sha256:58a56f97e6eb79ed6c7871c5dd2bb98eeab44283151ffaedfbfa703d38b8d8a1`;
the [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-CONSTRUCTION-REPORT.md)
is `sha256:1ab67cdd1b0c0c8359570c74999a21fb77a86943de4aeca21a531a54679d8aac`;
and the current non-approvable
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:50300238c5cf28bd9dfd42fcaea3d22ae6d0038a3c8d0e0f54547332ed86356e`.
Committed Kp/Lp audit summaries are
`sha256:28a08418c5964143584d8bdb3b26621950efc6c17b9143acbdb66be563a2c55e`
and
`sha256:18c40a216a286cd8fef1a7112cd7d206bc9d50b1d3f81546a7f56c108882364f`.

**Validation and effect:** deny-network lanes pass 162/162, 734/734,
145/145 and 45/45. TypeScript, strict Ajv, nine hostile evidence mutations,
cross-hashes, docs and diff checks are Green. Repository construction made
zero external-network, Docker/socket/OCI, forensic-root, PostgreSQL/SQL,
runtime/traffic, production, Provider/message, deploy/publication/admission,
release or spend effects.

**Collaboration rule:** future work should use Owner-approved outcome
envelopes. Within an exact outcome, path/effect ceiling and stop condition,
the agent may implement, test, repair, freeze evidence, reconcile current
status documents and commit without returning for per-file, per-commit or
recomputed-hash approval. Review returns when authority, durable state, schema
or trust boundaries expand; an external effect begins; scope/date/public
behavior changes; evidence becomes ambiguous; or a ceiling/failure stop is
reached. This reduces ceremonial approval without weakening Owner authority.

**Stop:** `LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILURE_CORRECTION_TECHNICAL_REVIEW_GREEN / REPLACEMENT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
The next review is a medium-grained local integration campaign. No replacement
diagnostic, cleanup, Physical Execution, production action or Gate C action is
authorized by this decision. #67 and R4 remain open.

## 2026-08-15 — Local PostgreSQL Integration Campaign reached repository Technical Review Green

**Decision:** accept the Owner-approved medium-grained outcome envelope and all
nine choices in the committed Construction Packet
`sha256:1bfcb75483b359d335812b573b42e3eac0ce669c734295248f2447daf5262d50`
and Owner Review
`sha256:3ad46ae641bdc1573341ff1221f27589c480b7bad9f4fe41e2a5641758d3296f`.
The approval authorized exactly 15 paths and three repository-only commits,
while keeping replacement diagnostic, cleanup, Physical Execution, production
and Gate C not requested.

**Result:** Ki `76afe10ee53b81f316dbc48bd4e412771e2ae0c7` / tree
`49ab93f6c3ef5b57488d4dda244aad527a9dafd6` freezes the exact `2M` campaign
runner/test delta. Li `4c20af20b24f21cce4566ba6c511e5ac39b527df` / tree
`621943118f9f4699b57bed954bfb602cdd125361` freezes the exact `3A` machine
evidence delta. G2 is
`sha256:5a8faefbb7e5014e16e786269c5fae36f56b9900e2a162e8a3633e698154eacc`;
G3 is
`sha256:6e9c4f9394c70641fd4fb75d378ef75d6f82ccae37c4f7557d5020ac1d3a8868`.
The artifact index is
`sha256:937a31206a914bbff1203435816fe058653cd225883041a0d56854eba4bf260a`;
the strict schema is
`sha256:537598a79c107bb297e3777dbacc2367426470d10baed14d662bbb8ca666d2bb`;
machine evidence is
`sha256:526476f0779411f5d4b94c650cbbef2c58a540c773ca7cbd115bde32edd24ea3`;
the [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-CONSTRUCTION-REPORT.md)
is `sha256:a608fae0e17122badccccb1cd8daef07d9ae7bd08f5b85d25739f2e7635e9dd2`;
and the current non-approvable [Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
is `sha256:deeb16cff4c6ba3082306bbf7c62f7f45a193260a1ee94cd8b344fbae4b296b4`.
Committed Ki/Li audit summaries are
`sha256:c1f5aafb2df9ac07c21fa72f652801f97ba2987d3c52e82d5c312823ef5bab4e`
and
`sha256:9bafd4a36e5261679ba54fb179c68d69bc89ce1283eab4cb2ddbea0811a0dcc1`.

**Constructed contract:** one future one-use campaign may, only after a
separate exact execution approval, perform a body-free diagnostic over the
three historical exact names, remove only exact-owned resources, prove all
three absent, and run the frozen disposable PostgreSQL rehearsal. It uses a
closed v1 grant/journal/receipt family, write-ahead reservations, one campaign
consumption, one diagnostic, at most one historical cleanup, one physical
construction, at most two cleanup-only physical recoveries, one anonymous
image pull and no retry. Foreign, unlabelled, malformed, unknown, ambiguous,
expired, drifted or ceiling-exhausted state stops.

**Validation and effect:** focused campaign tests pass 14/14; the complete R4
offline regression passes 747/747; Gate-B Core passes 145/145; spine passes
45/45. Strict Ajv, 11 hostile evidence mutations, committed topology and blob
bindings, 48 write-ahead crash cases, clock/host/headroom/recovery ceilings,
TypeScript, no-server-AI, inventory, docs and diff checks pass with 0 Blocker /
0 Important. Construction made zero forensic-root, campaign-grant,
Docker/socket/OCI, PostgreSQL/SQL, production/runtime/traffic,
Provider/model/email, deploy/publication/admission/Gate C, push/PR,
merge/release or spend effects.

**Stop:** `LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_LOCAL_INTEGRATION_CAMPAIGN_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
Only the final versioned Integration Campaign Execution Card/Owner Review may
be added next. Campaign prepare/execute, cleanup, production and Gate C require
a later separate exact Owner approval. #67 and R4 remain open.

## 2026-08-15 — inspect-missing and Gate-B concurrency corrections reached repository Technical Review Green

**Decision:** accept the Owner-approved Integration Campaign Inspect-Missing
Correction and Gate-B Concurrency Validation Correction as one closed
repository-only successor. The inspect correction Addendum/Review are
`sha256:a43fbb5ac8e795ab6b6bf51507d3489c9e803161419af50179d7f7e9bed97505`
and
`sha256:ed73deb10f3ec9dcd5501f6d25f40ec7b140838494521ddd4cc9574b95afe324`.
The concurrency Addendum
`sha256:f18dce72f2a53ce11e530499156852e815c132093962ab7bdd5cee6dec587ae7`
at `e21c441a6154f3c08b96ccbf7f0f7b693107b99a` / tree
`8860d06a9ccc821be62bf62ee79cd356b8b7fb52` and Owner Review
`sha256:310c408393dc7aff38c935137f89690096869b3259c3e28bc03325b4dfd225c7`
at `9f178918c416bd3be54e4cbc44e0c64567a78ca1` / tree
`63e69b5594aa9ba6627b825b1ac4aa636e15605e` authorize exactly Kgc → Lic →
Mic, 15 paths and three commits, with all external effects zero.

**Result:** Kic `1e93280bc3842d40e6f797a38ca4bfa2a2277813` / tree
`14526ed95feae2da6c9c14a89ece48616822e4e8` freezes the shared pinned
inspect parser; its G2 is
`sha256:5dea77a0e5391f3283caab8a9b1d67f4a6ed8758be6be3631bad5283ca530f1f`.
Kgc `98392bf19356982c884961a1425cd97ff33811bf` / tree
`796684556d04368c3acd3926d0c86992affa205c` freezes the authority-deadline
feeder wait without retry; its G2 is
`sha256:0101d889a77749a0671e26490bf2bb8a1aeab14b8678ce54d959a250388f83b4`.
Lic `614202e8765372755f75ce7fa465ef9e550971a8` / tree
`180d6a9fa048e07e72ddbab8e2e4e2e354fb902a` freezes the strict three-file
machine evidence delta; G3 is
`sha256:1dd72f64a6683a50e4f606a9601ab94d674a8b9757082f4318a2b532bec15d39`.
The artifact index, schema, evidence and
[Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-CONSTRUCTION-REPORT.md)
are respectively
`sha256:d90271f5d15e1b2ac42b23211283257822f74ac9795b244a8db306ed0e157125`,
`sha256:942e1ddcf5e65303e5d4a7df02a929d6c04ee5f92a4f8db615670c5aa5c8d204`,
`sha256:4877ab9d24352187cd15ac3a7e88833f4cb5d46d60c324c7b5419572c32a5cf1`
and
`sha256:f1009d82c42edb480bee96dd0df3c1381a5f177325c9c181c4daf2e505b2e78d`.
Committed Kic/Kgc/Lic audit summaries are
`sha256:7c1ea06b0f7c1422b29ef6eba6a92a063d1e6495e3d7a5cb6adccd535b1bd094`,
`sha256:aeb46997b467b5471f484de08c543b061e0caed398d9aa6c83200203252f231f`
and
`sha256:3623dafd4f988503955b64206fe7bb292787de7c864ea38bcd5f4f9f5f9dd9e6`.
The current non-approvable
[Gate C Card](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md) is
`sha256:9b28a9fc61417f31de26a45b6ecc320019c375f9ca1fe233573cb151b09be05a`.

**Validation and effect:** focused correction tests pass 15/15, the complete
local PostgreSQL runner 176/176, the complete R4 offline suite 748/748, Gate-B
146/146 twice under default concurrency and once serially, and spine 45/45.
Strict Ajv, hostile evidence mutations, committed topology and blobs,
TypeScript, no-server-AI, inventory, docs and diff checks are Green with 0
Blocker / 0 Important. Construction made zero forensic-root, grant,
Docker/socket/OCI, cleanup, PostgreSQL/SQL, production/runtime/traffic,
Provider/message, deployment/publication/admission/Gate C, push/PR,
merge/release or spend effects.

**Stop:** `LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_INSPECT_MISSING_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_INTEGRATION_CAMPAIGN_V2_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
Only a fresh versioned V2 Integration Campaign Execution Card/Owner Review may
be constructed next. Replacement Campaign, Docker, cleanup, PostgreSQL,
production and Gate C each require later separate exact Owner authority. #67
and R4 remain open.

## 2026-08-15 — Integration Campaign V2 topology verifier correction reached repository Technical Review Green

**Decision:** accept the Owner-approved repository-only V2 topology verifier
correction as the executable bridge from the actual committed Integration
Campaign history to future versioned V2 authority. The Owner authorized runner
and test correction, strict evidence and status freeze, and direct construction
and audit of the add-only V2 Card/Review. Docker, cleanup, PostgreSQL,
production and Gate C remain unrequested.

**Result:** Kvt `85096f689ed89fef97c7781c2d84d813097cadae` / tree
`1af3bea05f683863c5e93ecd4351bfcd2dbbf499` is the exact two-path direct
child of Mic `eb209d314a1084069a15fd4c819cf5e4d5760b77`; G2 is
`sha256:85c3882e4bdd18cb05432712e643cd68485a0a6693a95671d72cad0a36c398bf`.
It verifies the complete V1 Review → Inspect Addendum/Review → Kic →
Concurrency Addendum/Review → Kgc → Lic → Mic prefix and then requires Mic →
Kvt → Lvt → Mvt → Card V2 → Review V2. Lvt
`27540be8753424b841a79b785bfa658911cbfbb1` / tree
`a978e0ba70d69844242cf7b0ca627c861091e89a` is the exact three-addition
direct child; G3 is
`sha256:e9b439cb6fbafa339991ea6cb56a59efb3eba1273633b399da57dc4986ba417f`.
The artifact index, strict schema, evidence and
[Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V2-TOPOLOGY-VERIFIER-CORRECTION-CONSTRUCTION-REPORT.md)
are respectively
`sha256:9a2cce7c176694be205abedd6d3ef5775e345ed7f8871e4b0631c08ad7d99929`,
`sha256:31e54f83927a514fe8392c689e9cf1f4105d2b4021ed91a7c0959944992dee7f`,
`sha256:4d469990dd17fefe0478e280c6d4c998a8a5e6058ac3089c4fa496cd7aff5e80`
and
`sha256:e449db8b2a94ea03a16545206e491f78069555bee1bfe7c9b67619ac627cef07`.
Committed Kvt/Lvt audit summaries are
`sha256:a3415dca563387720991bb0c29f4a38c692b2032e3877149008d499f5b91145c`
and
`sha256:cc80574dfbe4dabecfbba6814ed47d8a7531e3891b95d18f2587666101d05813`.

**Validation and effect:** committed topology passes 1/1; local PostgreSQL
runner 176/176; R4 offline 748/748; Gate-B 146/146 twice under default
concurrency and once serially; spine 45/45. Strict Ajv and eight hostile
machine-evidence mutations, syntax, TypeScript, no-AI boundary, inventory,
docs and diff checks are Green. Construction made zero forensic-root, network,
Docker/socket/OCI, cleanup, PostgreSQL/SQL, product runtime, production,
traffic, provider, message, deployment, release, spend or Gate C effects.

**Stop:** `LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V2_TOPOLOGY_VERIFIER_CORRECTION_TECHNICAL_REVIEW_GREEN / V2_CARD_REVIEW_CONSTRUCTION_APPROVED / PHYSICAL_EXECUTION_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
The next repository actions are the two add-only V2 authority documents. Any
prepare or physical campaign still requires a later separate exact Owner
approval. #67 and R4 remain open.

## 2026-08-16 — Image-Acquisition V2 replacement authority reached repository Technical Review Green

**Decision:** preserve the consumed Image-Acquisition Diagnostic V1 as failed,
non-retryable history and accept the repository-only replacement authority
construction. V1 consumed grant
`sha256:76800f6b88c8e024d9ee3e527e3bf285c3163ae39360c903f698547b7cbbb7ba`
produced terminal evidence
`sha256:d1364db823a82d44da0b36044a66538ba47ff5027980843ea65dc69e3dad4afd`
and journal `7` / head
`sha256:0b2f01174fd8ad418f77558db3acae420278e7afb8ea259d6a76fbbb8309b6aa`.
Its sole Docker `version` call completed `NONZERO / exit 1`; image inspect,
pull, resource, cleanup, PostgreSQL and SQL calls were zero. The Owner reports
Docker Desktop was not running for that attempt and is running now. That
statement is retained as Owner context only; the next authorized diagnostic
must establish its own machine observation.

**Result:** replacement Addendum/Review hashes are
`sha256:dd685d694d8ba6a4b14eca1202e3ee4710bf127242591fef0aec30af18d0033f`
and
`sha256:62bf1aa8865202980a8ea2fe22e0ca40993aec43752f9f6b5acfa9d29e8cbcda`.
Kiar `3db30607077a1c4fd2aeb87fcf8c9f6d7dfa31cf` / tree
`9457a111e646ca869f403d3020986e5e8b63a63b` freezes the exact two-path
runner/test replacement; G2 is
`sha256:2cca6a811e52df19942fc1b34ae38b66b12f8a5e548aa4defac39cb10159b2ae`.
Liar `3e1b0cbd5394a2e3452ecb2ef9c0081c72381d9f` / tree
`9999efe25b0c79e8d388b86b82a57297f0ff2533` freezes the exact three-file
machine-evidence delta; G3 is
`sha256:fc167a02ce82f20fed05ffcf4b666dfc91eb5694553f3f6730c24c1b41c356db`.
The artifact index, strict schema, evidence and
[Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-CONSTRUCTION-REPORT.md)
are respectively
`sha256:f37fd3adccb7b540aaa0ff180237d892b78c1e27f2c64d9686c3f0ff0577c8b3`,
`sha256:7712430fed5f4feb6e8f53daf53b9aa11ba5046e2f625b2f865fed35880a6130`,
`sha256:202e96b8d30a5f4e9e4074415388ddf73c133ceb9101733d8d36db61dc353f88`
and
`sha256:2750f690996e2c9e706af312e12832bc833406f0433651e1078522c70d58d156`.
Committed Kiar/Liar audit summaries are
`sha256:1f154c0e67adcca225d36ad82839615d304485b857ff8f28d26f9b02e3b700e4`
and
`sha256:9553ca01c635f4f9ea7842d15b3ab7b6871ee61c3528c11d22a6c08914b289c3`.

**Validation and effect:** focused replacement tests pass 6/6; the full local
PostgreSQL runner 188/188; focused non-runner Public Core 85/85; Public Core
440/440; R4 offline 760/760; Gate-B Core 146/146; spine 45/45. Strict Ajv and
14 hostile evidence mutations, syntax, TypeScript, no-AI, docs and diff checks
are Green. Construction read the retained V1 body-free root once, mutated it
zero times, and made zero replacement grant, Docker/socket/daemon/registry,
pull, cleanup, PostgreSQL/SQL, production/runtime/traffic, provider/message,
deployment/publication/admission/Gate C, push/PR, merge/release or spend
effects.

**Stop:** `LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_V2_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
Only the two reserved add-only V2 Card/Review documents may follow. Diagnostic
prepare/consumption still requires one separate exact Owner approval. #67 and
R4 remain open.
