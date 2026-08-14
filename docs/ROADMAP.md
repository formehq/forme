# MVP rebuild roadmap

- Updated: 2026-08-13
- Completion: gate-driven through Technical Review and Owner Experience
  Acceptance; there is no calendar-date substitute for Done
- Progress / Vision Sharing: 2026-08-25 (Tuesday) — share the truthful state
  reached by then; complete/repeatable MVP delivery is not required that day
- Scope model: P0 committed, P1 conditional, P2 future/separate scope decision
- APFS nlink correction bindings: index
  `sha256:d3b2ce01350636bbcd6fbde1ee938c6cd5c55f7b8d5e38e72fa4f6dbd5d67056`,
  schema
  `sha256:1cbd487272b052ef9116e473249824476b954e4e07818eb7d90b6079ffd6826a`,
  evidence
  `sha256:19788c80464ca23e03d5dab6aaf8d810c8541362f414e96d25ab7b9495a1300c`,
  report
  `sha256:0c462d2798c61c4a12a085e465f360c888b234e897fd0a3d8dd5c6e0c9e0e175`.
- Current stop: `LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`.
- Current gate: R0–R3 are Done and Owner-accepted. R4 design and Gate A
  repository mechanisms are complete. #66 local Projection review is Done and
  Owner-accepted; PR #72 is integrated into the R4 branch. #67 is offline
  Technical Review Green on Draft PR #73, and Draft PR #75 adds the public-only
  production-boundary foundation. Local PostgreSQL Wiring is frozen at
  `bc0b520`. The first physical prepare stopped before grant creation because
  a valid APFS receipt-only root reported nlink 3 while the frozen contract
  required 2; all physical effects stayed zero. The approved repository-only
  correction is Technical Review Green at Kc `18e3a32` / Lc `32448cb`, with
  exact stop `LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN /
  FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`; #67
  remains In Progress until
  later activation and one real Public Room / bounded
  Guest knock pass their gates and Owner Experience Acceptance. #68 Fresh local
  Codex candidate, #69 exact Response delivery, #70 bounded continuation and
  #71 Setup/Doctor remain open. Host Binding attempts 1 and 2 are consumed
  Yellow history; attempt 2 stopped before all Host inspectors at `0 / 0 / 0`,
  produced no capsule/receipt and cleaned Green. It is not #67's critical path.
  Retry Execution and First Provider-Call remain `NOT_REQUESTED`.
- Production truth: Public Core is repository/offline proof only. The concrete
  `pg` executor and application-store bridge are constructed, and the committed
  static catalog contract is `14 / 207 / 172 / 44`; no target PostgreSQL
  catalog has been observed and no disposable local rehearsal has run. Effect
  0 constructed the v3 runner/evidence. The failed prepare and correction both
  made zero Docker/OCI/PostgreSQL/SQL effects. No production PostgreSQL migration, Gate C deployment/provisioning,
  production Room
  mutation, public publication/admission, real Guest data, Provider call,
  external email, production secret, public traffic or spend has occurred.
  The accepted #66 phase-specific review `sha256:45414f18…1480` is not
  publishable. The Owner approved the exact walking-slice-specific Durable
  Public Core Construction Packet/Review on 2026-08-10 and Addendum A on
  2026-08-11. Repository-only Construction is Technical Review Green, with the
  application and durable persistence facts true. Local wiring adds the
  constructed executor and bridge without making the vault, HTTPS transport,
  production pool/migration, runtime route, traffic or Gate C facts true.
  Activation later requires publication-stable Owner
  wording and a new exact Room-bound publication approval.
- Active R4 execution claim: the current #67–#70 walking slice proves one
  public `24h / 1 Interaction` continuation and a negative Private-Room
  boundary. It will not be cut merely to fit the August 25 sharing. The
  positive Private Room/Grant path, the `3d/2`, `7d/3`, and `7d/10` presets,
  email, Agent Guest and other Full surfaces remain outside the current R4/R5
  scope. Demo-critical Green must not be called Full Green.
- Integration truth: R4 is not on `main`. `main` remains `7c1f7bd`; PR #72 was
  merged into the stacked R4 line. Draft PR #65 is at `cbadd8a`, Draft PR #73
  at `5e93196`, and Draft PR #75 at `09401a0`. Construction Stage A is
  `bcd4259`; the current Local PostgreSQL Wiring Stage A is `bc0b520`. Draft PR
  #76 remains unmerged and its current remote/CI state is recorded in PR
  metadata. PR #74 is merged and changes only the deterministic Linux
  inode-reuse test fixture, not product behavior or #67 authority.
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Current · dependency-driven | Demo-critical execution: one curated Third Place with one public Forme Project Room, one public knock, one reviewed Response, one public 24h/1 continuation, a negative Private-Room boundary, and one minimum Native Workbench → Forme call. The complete Private/notification/multi-preset target below remains outside the current R4/R5 scope | a normal Codex session retrieves durable Twin orientation/body-free typed status; one separate fresh/non-resumed response session dynamically searches only a sanitized read-only snapshot of current eligible Forme files plus typed body/path-free Twin orientation and returns an Owner-approved draft; excluded-root, secret, write, network, connector, and cross-Room canaries stay inaccessible; public request → local review → exact Response → 24h/1 continuation passes Owner acceptance and is labeled Demo-critical rather than Full Green |
| R5 — Hardening | After R4 Owner Experience Acceptance | clean install/run, privacy sweep, failure rehearsal, and repeatable story | release candidate repeats reliably; no new features |

R3 is Done and Owner-accepted for the MVP. The R4 Social Presence product
target, T1/T2, NH1/NH2 and exact T3/T4/T5 contracts remain Owner-approved.
Gate A is implemented and verified. Gate B/Core/physical construction and two
Host Binding attempts remain bounded technical history; neither Yellow attempt
produced a valid Host capsule or opened Retry/Provider authority. The product
line has moved to #66–#70: #66 is Owner-accepted, #67 is offline Technical
Review Green, and the complete real encounter remains unproven. #71 is a
time-boxed local prerequisite for the later Fresh Codex slice, not a replacement
for the Controlled Presence experience. R5 has not started.

## R4 owner-approved product target — current #67–#70 execution path

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

For the frozen Full architecture target only, if the Owner later opens a
separate scope-change decision, the protection order remains. This is not the
current execution scope and does not restore its positive Private path:

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

## Current scope and scheduling rules

- **Now:** all P1 work remains out; one active R4 product slice plus at most one
  time-boxed enabler.
- **No date-driven cut:** preserve the complete current #67 → #68 → #69 → #70
  causal slice. August 25 does not authorize dropping a link or weakening a
  control boundary.
- **No scope restoration by implication:** positive Private Room/Grant,
  optional email, Agent Guest, additional continuation presets and other Full
  surfaces remain outside the current R4/R5 execution scope unless the Owner
  opens a separate scope decision.
- **R5 starts by dependency, not date:** begin hardening only after the real R4
  chain reaches Owner Experience Acceptance; until then, tests remain
  Technical Review evidence.
- **August 25:** present an honest Progress / Vision Sharing at whatever gate
  is actually complete. Do not relabel offline proof as real Presence or a
  partial chain as Done.

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
  → #67 offline Room/knock rehearsal [Technical Review ✓ · PR #73 `5e93196`]
  → public-only boundary foundation [Technical Review ✓ · PR #75 `09401a0`]
  → Durable Public Core Construction Packet [Owner approved ✓ · PR #76]
  → walking-slice-specific durable Public Core application/store [Technical Review ✓ · Stage A `bcd4259`]
  → Local PostgreSQL Wiring + interaction-type correction [repository Technical Review ✓ · Stage A `bc0b520`]
  → Physical Rebind proposal and Owner approval [approved ✓]
  → Physical Rebind Effect-0 construction [Technical Review ✓ · K/L `bcfe334`/`beeb55b`]
  → first one-use Physical Execution prepare [stopped pre-grant · APFS nlink contract error · effects 0]
  → APFS nlink correction [Technical Review ✓ · Kc/Lc `18e3a32`/`32448cb`]
  → fresh one-use Physical Execution Card + Review + Owner approval [required · not requested]
  → publication-stable successor + Room-bound exact approval
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
but not from its phase-specific accepted bytes. A narrowly scoped Durable
Public Core Construction Packet and Review are exactly Owner-approved;
Addendum A and the Local PostgreSQL Wiring Packet/Addenda B/C are approved.
The repository-only executor/bridge and corrected static SQL contract are
Technical Review Green at Stage-A `bc0b520`. The rebind remains historical at
K/L `bcfe334` / `beeb55b`, and the APFS nlink correction is current at Kc/Lc
`18e3a32` / `32448cb`, as recorded in the
[`Construction Report`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md).
The current Effect-0 result is the
[`Physical Rebind Construction Report`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md).
The current correction result is the
[`APFS nlink Correction Report`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md).
The hash-pinned [`Gate C Card`](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
remains non-approvable. One-use Physical Execution comes next; later production inputs
must still cover setup, deployment, publication, Curator
admission and one real knock; activation also requires a publication-stable
successor and new exact Room-bound approval. #71 is sequenced before #68 only
if the Fresh local Codex path still needs local Host Setup/Doctor. Real
execution, Provider calls, production durable writes, public actions and spend
remain separate later decisions. R4 cannot enter Owner Acceptance until the
full public request → local review → exact Response → bounded continuation
story is experienced. August 25 changes none of these gates.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
