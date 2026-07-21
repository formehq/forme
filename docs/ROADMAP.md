# MVP rebuild roadmap

- Updated: 2026-07-20
- MVP complete and repeatable: 2026-08-11
- Demo Day: 2026-08-12
- Scope model: P0 committed, P1 conditional, P2 post-demo
- Current gate: R1 and R2 owner-accepted; R3 bounded control path and V2 Owner Decision Brief pass 44 checks; CASE-02 comparison gate `sha256:5d511…8dece` is prepared and awaits owner approval
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

R3 has satisfied its bounded execution, recovery, rollback, and recommendation-first owner-surface evidence, but not yet its complete exit condition. In the independent Career CASE-02, the exact-hash-approved first Reflection was corrected by the owner at Twin revision 3, and a local preview proves the correction is carried forward automatically. The A0/A1/B recommendation comparison is frozen in gate `sha256:5d5114c24de0681267cb0c4509b456d017bcc29a2a7b39efcbc8d1045378dece` but no comparison call is authorized yet. Technical success alone does not move R3 to Done.

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

Mailbox, server agents, interactive projection, and Twin-to-Twin interaction are not on this critical path.

## Progress rule

Roadmap state changes only with linked evidence:

- `Ready` means the Control Packet is approved.
- `Building` means one outcome is actively implemented.
- `Technical Review` means checks and demo instructions exist.
- `Owner Acceptance` means the owner must experience and judge the result.
- `Done` means technical and owner evidence agree.
