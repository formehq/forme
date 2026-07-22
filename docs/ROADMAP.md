# MVP rebuild roadmap

- Updated: 2026-07-22
- MVP complete and repeatable: 2026-08-11
- Demo Day: 2026-08-12
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R3 is owner-accepted; the R4 Social Presence product proposal is prepared for owner review, with no projection, hosting, messaging, or server implementation authorized
- GitHub: [milestone #11](https://github.com/formehq/forme/milestone/11) · [parent epic #47](https://github.com/formehq/forme/issues/47)

## Gates

| Gate | Window | Outcome | Exit condition |
|---|---|---|---|
| R0 — Reboot | Jul 17–20 | archived history, clean main, shared product/control frame, new GitHub plan | owner can explain the repo and approves the first walking-skeleton contract |
| R1 — Continuity | Jul 21–25 | connect one project, preserve bounded evidence and durable state, reconstruct a useful view | real restart demo accepted by owner |
| R2 — Cognition | Jul 26–31 | one multi-timepoint Reflection with uncertainty, correction, and invalidation | owner judges it more valuable than a summary |
| R3 — Bounded Agency | Aug 1–4 | one corrected-revision proposal, approval, typed effect, receipt, verification, rollback | real artifact changes and rolls back safely |
| R4 — Controlled Presence | Aug 5–7 | one versioned static collaborator projection from an allowlist | private canary cannot enter output |
| R5 — Demo hardening | Aug 8–11 | clean install/run, privacy sweep, failure rehearsal, three-minute story | release candidate repeats reliably; no new features |

R3 is Done and owner-accepted for the MVP. It satisfied bounded execution, recovery, rollback, the recommendation-first owner surface, and one independent positive usefulness case. In Career CASE-02 the owner found all three outputs useful, least preferred the no-correction baseline, and judged the rich manual-correction baseline and zero-source-body Forme output extremely close with only a slight A1 lean. The closeout did not turn that recommendation into Career policy: ship/closure weighting remains unresolved, B was invalidated without approval or effect, and general recommendation accuracy remains unproven. The R4 Social Presence product decision is now active; implementation remains stopped.

## R4 replan proposal — owner decision pending

The approved P0 floor remains one versioned static collaborator projection from an explicit allowlist. The owner has proposed a more social walking slice: host that projection as a Forme Room, let one invited collaborator ask a bounded question, leave a Seed, and optionally bring a lightweight Guest Capsule to produce a Resonance artifact.

The candidate expansion adds hosting, model, message persistence, audience, retention, abuse, and public-behavior decisions. The product proposal is in [`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md). If approved, a separate technical Control Packet must still name the exact deployment topology, stores, APIs, credentials, retention, runtime visibility, failure behavior, and cut order before implementation.

The cut order is:

1. preserve the deterministic versioned Projection Capsule and revocation/freshness contract;
2. preserve one real hosted room and one invited collaborator encounter;
3. preserve one durable external signal path;
4. cut visual flourish before interaction coherence;
5. cut open-ended chat, accounts, multiple rooms, autonomous replies, and full Twin-to-Twin identity before any control boundary is weakened.

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
```

Full mailbox automation, autonomous server agents, open-ended interactive projection, and a general Twin-to-Twin protocol remain outside the critical path. The pending R4 proposal admits only one hosted room, bounded capsule interactions, a lightweight Guest Capsule, and typed external signals if separately approved.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
