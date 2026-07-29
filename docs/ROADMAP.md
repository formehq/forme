# MVP rebuild roadmap

- Updated: 2026-07-28
- MVP complete and repeatable: 2026-08-11
- Demo Day: 2026-08-12
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R3 is owner-accepted; the privacy-first/minimum-friction P
  human-boundary model, R4 product target, T1 public/private Room correction,
  and T2 Room control contract are owner-approved; Native Harness roles are
  clarified, NH1/NH2 must close before paused T3, T4/T5 remain in the
  [Technical Owner Review](./R4-TECHNICAL-OWNER-REVIEW.md), and the first
  Control Packet is unreconciled; no projection,
  hosting, identity, messaging, synchronization, persistence, spend, or
  server implementation is authorized
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Aug 5–7 | one curated Third Place with a public Forme Project Room, one public knock, a bounded Private Room path, and one reviewed continuation | private canary stays absent and public request → local review → response → bounded Grant lifecycle passes owner acceptance |
| R5 — Demo hardening | Aug 8–11 | clean install/run, privacy sweep, failure rehearsal, three-minute story | release candidate repeats reliably; no new features |

R3 is Done and owner-accepted for the MVP. It satisfied bounded execution, recovery, rollback, the recommendation-first owner surface, and one independent positive usefulness case. In Career CASE-02 the owner found all three outputs useful, least preferred the no-correction baseline, and judged the rich manual-correction baseline and zero-source-body Forme output extremely close with only a slight A1 lean. The closeout did not turn that recommendation into Career policy: ship/closure weighting remains unresolved, B was invalidated without approval or effect, and general recommendation accuracy remains unproven. The R4 Social Presence product target, T1 public/private Room correction, and T2 Room control contract are owner-approved; implementation remains stopped at NH1/NH2, revised T3, T4/T5, and later packet reconciliation.

## R4 owner-approved product target — T1/T2 closed, NH1/NH2 next

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
closed. Native Harness roles are clarified; NH1/NH2 remain decisions and T3 is
paused behind them, while T4/T5 also remain open.

The approved product target is documented in
[`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md) and
[`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md).
The Harness/Forme role clarification and NH1/NH2 are in
[`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md). T1 and T2
are recorded in
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md). Its remaining
cards cover the paused Managed Privacy T3, public lifecycle promises, and the
async/retention/P0 boundary. The first detailed
[`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md) must then
be rewritten for the confirmed existing deployment path and re-audited.
Exact schemas/migrations and production deployment remain separate later
gates. No current document grants implementation authority.

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
- **Aug 7:** unfinished P1 work leaves the demo.
- **Aug 9:** hard feature freeze; only blockers, privacy, reliability, and rehearsal remain.
- **Aug 11:** release candidate only.

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
  → NH1 default local carrier
  → NH2 ordinary work / Forme-authoritative effect boundary
  → reframed T3 provider-visibility contract
  → T4/T5
  → reconciled Technical Control Packet
```

Full mailbox automation, any server-side AI, open-ended interactive projection,
and a general Twin-to-Twin protocol remain outside the critical path. The
approved R4 product target admits only one curated Third Place, one Forme
Project Room as the required public resident, one bounded Private Room access
path over the same Twin, Manual and Agent Guest entry paths, bounded capsule
exchange, one optional lightweight Guest Capsule, and typed external signals.
None may be
implemented until the technical Control Packet is approved; real durable writes
then wait for the Schema & Migration Manifest, and production/public/spend
actions wait for the Production Deployment & Provisioning Grant.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
