# MVP rebuild roadmap

- Updated: 2026-07-25
- MVP complete and repeatable: 2026-08-11
- Demo Day: 2026-08-12
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R3 is owner-accepted; the R4 Hero Encounter, curated Third
  Place, and layered identity product target are owner-approved; the technical
  Control Packet is next, with no projection, hosting, identity, messaging,
  synchronization, or server implementation authorized
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Aug 5–7 | one curated Third Place with the Forme Project Room, a versioned Projection Capsule, and one reviewed encounter | private canary stays absent and the real request → local review → response lifecycle passes owner acceptance |
| R5 — Demo hardening | Aug 8–11 | clean install/run, privacy sweep, failure rehearsal, three-minute story | release candidate repeats reliably; no new features |

R3 is Done and owner-accepted for the MVP. It satisfied bounded execution, recovery, rollback, the recommendation-first owner surface, and one independent positive usefulness case. In Career CASE-02 the owner found all three outputs useful, least preferred the no-correction baseline, and judged the rich manual-correction baseline and zero-source-body Forme output extremely close with only a slight A1 lean. The closeout did not turn that recommendation into Career policy: ship/closure weighting remains unresolved, B was invalidated without approval or effect, and general recommendation accuracy remains unproven. The R4 Social Presence product target is now owner-approved; implementation remains stopped at technical Control Packet preparation.

## R4 owner-approved product target — technical decision pending

The approved R4 target is one publicly viewable but curator-admitted Forme
Third Place containing the Forme Project Room. A Manual Guest can browse and
leave bounded context or a signal. An Agent Guest can fetch the public capsule,
reason at its own edge, and optionally submit a guest-approved capsule. A deeper
question or Resonance Request returns to the local Forme Agent and owner for a
reviewed response.

Owner publication and curator admission are separate decisions even when the
same human performs both in P0. Accounts prove control and attribution, not
personhood; public reading needs no account; durable publishers and curators
are invite-only; Agent Guests receive narrow delegated credentials. The server
runs no AI.

The approved product target is documented in
[`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md) and
[`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md).
A separate technical Control Packet must still name exact topology, stores,
APIs, authentication, pairing, retention, synchronization, notifications,
failure handling, tests, and cut order before implementation.

The cut order is:

1. preserve the deterministic versioned Projection Capsule and revocation/freshness contract;
2. preserve one real hosted Room inside the curated Third Place and one
   collaborator encounter;
3. preserve one durable request → local review → response path;
4. cut visual flourish before interaction coherence;
5. cut native notes onboarding, additional residents, public sign-up, search,
   feed, open-ended chat, autonomous replies, and full Twin-to-Twin identity
   before any control boundary is weakened.

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
  → owner publication + curator admission
  → Third Place / Forme Room
  → bounded signal → local review → response
```

Full mailbox automation, any server-side AI, open-ended interactive projection,
and a general Twin-to-Twin protocol remain outside the critical path. The
approved R4 product target admits only one curated Third Place, one Forme
Project Room, Manual and Agent Guest entry paths, bounded capsule exchange, one
optional lightweight Guest Capsule, and typed external signals. None may be
implemented until the technical Control Packet is approved.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
