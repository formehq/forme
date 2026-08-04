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
