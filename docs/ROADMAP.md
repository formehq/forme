# MVP rebuild roadmap

- Updated: 2026-08-10
- MVP complete and repeatable: 2026-08-24
- Demo Day: 2026-08-25 (Tuesday)
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R0–R3 are Done and Owner-accepted. R4 design and Gate A
  repository mechanisms are complete. #66 local Projection review is Done and
  Owner-accepted; PR #72 is integrated into the R4 branch. #67 is offline
  Technical Review Green on Draft PR #73 and remains In Progress until one
  real Public Room / bounded Guest knock passes Owner Experience Acceptance.
  #68 Fresh local Codex candidate, #69 exact Response delivery, #70 bounded
  continuation and #71 Setup/Doctor remain open. Host Binding attempts 1 and 2
  are consumed Yellow history; attempt 2 stopped before all Host inspectors at
  `0 / 0 / 0`, produced no capsule/receipt and cleaned Green. It is not #67's
  critical path. Retry Execution and First Provider-Call remain
  `NOT_REQUESTED`.
- Production truth: Public Core is repository/offline proof only. No production
  PostgreSQL migration, Gate C deployment/provisioning, production Room
  mutation, public publication/admission, real Guest data, Provider call,
  external email, production secret, public traffic or spend has occurred.
  The accepted #66 phase-specific review `sha256:45414f18…1480` is not
  publishable; #67 first needs publication-stable Owner wording and a new exact
  Room-bound publication approval.
- Active Demo-critical execution claim: the August 25 walking slice proves one
  public `24h / 1 Interaction` continuation and a negative Private-Room boundary.
  The positive Private Room/Grant path, the `3d/2`, `7d/3`, and `7d/10` presets,
  email, Agent Guest and other Full surfaces remain the approved post-demo
  architecture target. Demo-critical Green must not be called Full Green.
- Integration truth: R4 is not on `main`. `main` remains `7c1f7bd`; PR #72 was
  merged only into `codex/r4-gate-a-build` at `87e5979`; #67 is `eabfe82` on
  Draft PR #73. Integration Draft PR #65 currently has one Red Linux CI check
  while PR #73 is Green.
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Aug 5–21 | Demo-critical execution: one curated Third Place with one public Forme Project Room, one public knock, one reviewed Response, one public 24h/1 continuation, a negative Private-Room boundary, and one minimum Native Workbench → Forme call. The complete Private/notification/multi-preset target below remains post-demo | a normal Codex session retrieves durable Twin orientation/body-free typed status; one separate fresh/non-resumed response session dynamically searches only a sanitized read-only snapshot of current eligible Forme files plus typed body/path-free Twin orientation and returns an Owner-approved draft; excluded-root, secret, write, network, connector, and cross-Room canaries stay inaccessible; public request → local review → exact Response → 24h/1 continuation passes Owner acceptance and is labeled Demo-critical rather than Full Green |
| R5 — Demo hardening | Aug 22–24 | clean install/run, privacy sweep, failure rehearsal, three-minute story | release candidate repeats reliably; no new features |

R3 is Done and Owner-accepted for the MVP. The R4 Social Presence product
target, T1/T2, NH1/NH2 and exact T3/T4/T5 contracts remain Owner-approved.
Gate A is implemented and verified. Gate B/Core/physical construction and two
Host Binding attempts remain bounded technical history; neither Yellow attempt
produced a valid Host capsule or opened Retry/Provider authority. The product
line has moved to #66–#70: #66 is Owner-accepted, #67 is offline Technical
Review Green, and the complete real encounter remains unproven. #71 is a
time-boxed local prerequisite for the later Fresh Codex slice, not a replacement
for the Controlled Presence experience. R5 has not started.

## R4 owner-approved product target — Gate A Technical Review complete

The approved R4 target is one publicly viewable but curator-admitted Forme
Third Place containing the Forme Project Room. A Manual Guest can browse and
leave bounded context or a signal. An Agent Guest can fetch the public capsule,
reason at its own edge, and optionally submit a guest-approved capsule. A deeper
question or Resonance Request returns to the local Forme Agent and owner for a
reviewed response.

While the Owner selects `public_single`, a visitor may use one anonymous
24-hour capability to send one private public knock. Continued interaction
requires a new Owner short pass. A true Private Room has a different Room ID
and separately approved Projection, never enters Third Place, and requires an
exact Owner Grant for reading and interaction.

The Owner has fixed the P0 continuation presentation as capability—not
identity or inferred trust—presets: one visit (24 hours / 1 Interaction), short
exchange (3 days / 2), familiar collaborator (7 days / 3), and trusted
collaborator (7 days / 10 independent Interactions). Familiar and trusted are
both explicitly Owner-selected labels; neither grants successor inheritance or
private access. A Private Room still needs its own exact Grant.
An exact Interaction may also carry an optional confirmed email endpoint for
one generic response-ready notice. The notice contains no body, Room name,
reply URL, token, or secret and cannot create or recover authority; the private
reply URL and polling remain canonical.

Owner publication and curator admission are separate decisions even when the
same human performs both in P0. Accounts prove control and attribution, not
personhood; public reading needs no account; durable publishers and curators
are invite-only; Agent Guests receive bounded, revocable delegated
credentials. The server runs no AI.

The approved P model keeps the human boundary exact while removing ceremonial
per-operation approval inside it. The approved T2 P0 contract is one fixed
standing `room_operator.v1` scope bundle per exact
Room for typed sync, deterministic receipt/recovery, exact Owner-approved
artifact delivery, and deterministic stale attestation. The Agent's standard
Room workflow calls sync explicitly; read-only commands do not hide writes and
no background daemon is required. The companion human-boundary guards are
approved; the T2 authority, verbs, scopes, and 30-day non-renewing lifetime are
closed. The approved NH1 contract makes the Native Harness Workbench the
default local carrier, with Codex first for P0 and OpenCode a first-class
architectural compatibility target whose live path remains P1. The approved
NH2 contract separates ordinary native work from typed Forme-authoritative
transitions: ordinary results may only be offered and admitted as evidence
through a separate contract, never auto-ingested. Those approvals grant no
concrete runtime, file, shell, tool, provider, credential, Guest, or Room
authority. On 2026-08-01 the Owner selected one Fresh Native Response Session
per Interaction as the R4 P0 direction and moved the Managed Privacy response
lane/trust-tier selector to P1/future. On 2026-08-03 the Owner approved the
exact T3 consent, source/provider/capability, session budget, physical
isolation and lifecycle contract. On 2026-08-03 the Owner also approved T4:
Third Place discovery requires a current, fresh, admitted Projection;
unlisted/never-admitted public Projections remain direct-readable but accept no
new public knock; stale Projections have at most seven days of warning-only
direct-read and no new Interaction; revoke or Room retirement immediately
hides Projection and linked published Response bodies. Curator unlist does not
revoke an otherwise-valid Owner Grant or GrantOffer. The full recommended T5
contract is also Owner-approved and now governs explicit sync/manual recovery,
notification-only email, body-retention ceilings, deletion/purge honesty,
production disclosure requirements, and the P0 cut.

The approved product target is documented in
[`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md) and
[`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md).
The approved Harness/Forme role and NH1/NH2 boundary are in
[`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md). T1 and T2
are recorded in
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md). That brief also
records the approved exact T3 Fresh Native Response Session, T4 lifecycle, and
full T5 contracts. The detailed
[`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md) v0.2 was
rewritten for the confirmed existing deployment path, independently audited,
fixed at `sha256:e417836b…adfff5`, and Owner-approved on 2026-08-03. It grants
only Gate A repository work. Exact runtime/schema/migration validation and
production deployment remain separate later gates.

The cut order is:

1. preserve the deterministic versioned Projection Capsule and revocation/freshness contract;
2. preserve one real public Room inside the curated Third Place, one public
   knock, and one exact grant-gated Private Room path;
3. preserve one durable request → local review → response → optional
   continuation path;
4. cut visual flourish before interaction coherence;
5. cut native notes onboarding, additional residents, public sign-up, search,
   feed, open-ended chat, autonomous replies, and full Twin-to-Twin identity
   before any control boundary is weakened.

“Cut autonomous replies” means no P0 standing policy for publishing new
Owner-attributed content. It does not mean cutting routine agency inside the
approved Room Operator envelope.

## Cut rules

- **Jul 25:** if R1 is not owner-accepted, all P1 work pauses.
- **Jul 31:** if R2 is not owner-accepted, no optional feature starts.
- **Aug 4:** if R3 is incomplete, reduce the action to one Forme-owned artifact; do not broaden effectors.
- **Now:** all P1 work remains out; one active R4 product slice plus at most one
  time-boxed enabler.
- **Aug 20:** the Public Core, Fresh candidate and exact Response path through
  #69 must be stable; cut optional email, visual flourish and implementation
  depth before weakening the chain or a control boundary.
- **Aug 21:** #70 proves the one public 24h/1 continuation and negative Private
  boundary, completing the Demo-critical R4 chain or triggering the declared
  fallback instead of hidden scope expansion.
- **Aug 22:** R5 and hard feature freeze begin; only blockers, privacy,
  reliability and rehearsal remain.
- **Aug 24:** release candidate only and repeatable-ready.

## Dependency order

```text
bounded source
  → durable Twin
  → scoped context
  → evidence-backed Reflection
  → owner correction and invalidation
  → revision-bound action proposal
  → deterministic effect and receipt
  → allowlist-only projection
  → public Room: owner publication + curator admission
    OR Private Room: owner publication + exact Guest Grant
  → public knock or grant-gated signal
  → local review → response → optional Grant Offer
```

The active R4 decision dependency is:

```text
Native Harness role clarification
  → NH1 default local carrier [closed]
  → NH2 ordinary work / Forme-authoritative effect boundary [closed]
  → Option 2B Fresh Native Response Session direction [selected]
  → exact T3 consent/session/source/capability contract [closed]
  → T4 public lifecycle [closed]
  → T5 async / deletion / retention / P0 cut [closed]
  → reconciled Technical Control Packet v0.2 audit/hash ✓ → Owner approval ✓
  → Gate A repository implementation + Technical Review ✓
  → Gate B v0.1 approval ✓ → first execution RED/CLEAN
  → Retry Construction Packet ✓ → Construction YELLOW/CLEAN ✓
  → Correction Scope Decision Brief [Owner approved ✓]
  → exact Core Correction Construction Packet [Owner approved ✓]
  → Core repo-only Construction [YELLOW · published ✓]
  → Physical Adapter + Host Binding Decision Brief [Owner approved ✓]
  → exact successor Construction Packet + Review [Owner approved ✓]
  → Physical Adapter Construction [built/fake-validated at I ✓]
  → Host Binding attempt 1 [YELLOW · input consumed · cleanup GREEN]
  → lean reattempt J + Activation Card [approved/activated ✓]
  → Host Binding attempt 2 [YELLOW_NO_RETRY · 0/0/0 · cleanup GREEN]
  → #66 local Projection [Owner accepted ✓ · PR #72 integrated]
  → #67 offline Room/knock rehearsal [Technical Review ✓ · Draft PR #73]
  → publication-stable successor + Room-bound exact approval [next]
  → Gate C production Public Core + one real knock [not requested]
  → #68 Fresh candidate → #69 exact Response
  → #70 public 24h/1 continuation + negative Private boundary [open]
  → R4 Owner Experience Acceptance
```

Full mailbox automation, any server-side AI, open-ended interactive projection,
and a general Twin-to-Twin protocol remain outside the critical path. The
approved R4 product target admits only one curated Third Place, one Forme
Project Room as the required public resident, one bounded Private Room access
path over the same Twin, Manual and Agent Guest entry paths, bounded capsule
exchange, one optional lightweight Guest Capsule, and typed external signals.
Gate A and the later offline/Core mechanisms remain complete technical
evidence. The first Gate B execution is Red/cleaned history; Retry Construction,
Core Construction and Physical Adapter Construction are Yellow/offline history.
Both Host Binding attempts are consumed Yellow and produced no valid capsule or
public receipt. They do not block #67's product meaning/review and do not grant
Retry or Provider authority.

The current walking slice starts from #66's accepted local content mechanism,
but not from its phase-specific accepted bytes. #67 requires a publication-
stable successor, a new exact Room-bound approval, then a separate Gate C
envelope for production Public Core setup, deployment, publication, Curator
admission and one real knock. #71 is sequenced before #68 only if the Fresh
local Codex path still needs local Host Setup/Doctor. Real execution, Provider
calls, production durable writes, public actions and spend remain separate
later decisions. R4 cannot enter Owner Acceptance until the full public request
→ local review → exact Response → bounded continuation story is experienced.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
