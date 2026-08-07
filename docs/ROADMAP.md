# MVP rebuild roadmap

- Updated: 2026-08-07
- MVP complete and repeatable: 2026-08-18
- Demo Day: 2026-08-19 (Wednesday)
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R3 is owner-accepted; the privacy-first/minimum-friction P
  human-boundary model, R4 product target, T1 public/private Room correction,
  T2 Room control contract, and NH1/NH2 architecture contract are
  owner-approved; the Fresh Native Response Session exact T3 contract and T4
  public lifecycle contract and full T5 async / deletion / retention / P0-cut
  contract are also owner-approved; four bounded continuation presets are
  fixed—24h/1, 3d/2, familiar 7d/3, and Owner-selected trusted 7d/10. The first
  Control Packet v0.1 is superseded; reconciled v0.2 passed independent audits
  at `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`.
  The Owner approved those exact bytes on 2026-08-03. Gate A repository-only
  implementation and Technical Review are complete. The Owner later approved
  Gate B Manifest
  `sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa`,
  but its first attempt stopped
  Red/cleaned after a real Codex-home read-scope violation. The Owner then
  approved the construction-only Retry Packet
  `sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7`.
  Retry Construction completed at `d6374ed` with Green offline/static lanes,
  Green cleanup and a Yellow aggregate verdict. Its Retry Execution Manifest
  is explicitly not recommended. A later read-only review found that the next
  correction must choose a truthful Demo-critical semantic cut rather than
  merely wire three physical adapters. The active Owner input is
  [`R4-GATE-B-CORRECTION-SCOPE-DECISION-BRIEF.md`](./R4-GATE-B-CORRECTION-SCOPE-DECISION-BRIEF.md)
  at `sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f`.
  Retry Execution is not requested. Provider calls,
  real Guest data, production migration, deployment, spend, production Room
  mutation, external email, production secrets, and public traffic remain
  unauthorized
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Aug 5–14 | one curated Third Place with a public Forme Project Room, one public knock, a bounded Private Room path, one reviewed continuation, an optional body-free response-ready email notice, and one minimum Native Workbench → Forme call | a normal Codex session retrieves durable Twin orientation/body-free typed status; one separate fresh/non-resumed response session dynamically searches only a sanitized read-only snapshot of current eligible Forme files plus typed body/path-free Twin orientation and returns an Owner-approved draft; excluded-root, secret, write, network, connector, and cross-Room canaries stay inaccessible; public request → local review → optional notice → response → 1/2/3/10-Interaction bounded Grant lifecycle passes owner acceptance |
| R5 — Demo hardening | Aug 15–18 | clean install/run, privacy sweep, failure rehearsal, three-minute story | release candidate repeats reliably; no new features |

R3 is Done and owner-accepted for the MVP. It satisfied bounded execution, recovery, rollback, the recommendation-first owner surface, and one independent positive usefulness case. In Career CASE-02 the owner found all three proposals useful, least preferred the no-correction baseline, and judged the rich manual-correction baseline and zero-source-body Forme output extremely close with only a slight A1 lean. The closeout did not turn that recommendation into Career policy: ship/closure weighting remains unresolved, B was invalidated without approval or effect, and general recommendation accuracy remains unproven. The R4 Social Presence product target, T1 public/private Room correction, T2 Room control contract, NH1/NH2 architecture contract, Fresh Native Response Session exact T3 contract, T4 public lifecycle contract, and full T5 contract are owner-approved. Gate A is technically implemented and verified. The first Gate B attempt is Red/cleaned; Retry Construction is Yellow/cleaned and proves the repository/offline mechanism, not runtime readiness. A five-part Core-versus-Full scope decision is now pending before any exact correction Packet or Retry Execution.

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
- **Aug 14:** unfinished P1 work leaves the demo.
- **Aug 16:** hard feature freeze; only blockers, privacy, reliability, and rehearsal remain.
- **Aug 18:** release candidate only.

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
  → Correction Scope Decision Brief [Owner decision pending]
  → exact Core Correction Packet [not prepared]
  → corrected Retry Execution [not requested]
```

Full mailbox automation, any server-side AI, open-ended interactive projection,
and a general Twin-to-Twin protocol remain outside the critical path. The
approved R4 product target admits only one curated Third Place, one Forme
Project Room as the required public resident, one bounded Private Room access
path over the same Twin, Manual and Agent Guest entry paths, bounded capsule
exchange, one optional lightweight Guest Capsule, and typed external signals.
Gate A repository code/docs, synthetic/local tests, and evidence remain
complete. The first approved Gate B attempt is preserved as Red/cleaned.
Retry Construction is preserved as Yellow/cleaned: it built and verified the
offline runner, but physical review found that PostgreSQL semantic completion,
real Codex diagnostic containment and macOS candidate-protection scope require
an Owner cut before another Packet. The recommended cut keeps one real hero
encounter exact and hides/defers unimplemented surfaces rather than returning
placeholders under a broad P0 claim.
Real execution, First Provider-Call Test Grant, production durable writes,
public actions, and spend remain separate later decisions.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
