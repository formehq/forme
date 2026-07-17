# MVP roadmap

- Updated: 2026-07-16
- Source of truth: this file plus [`STATUS.md`](./STATUS.md)
- Owner epic: [#37](https://github.com/formehq/forme/issues/37)

## Fixed dates

| Date | Commitment |
|---|---|
| 2026-07-17 | D1 requirements locked for implementation |
| 2026-07-19 | D2 functional decomposition accepted |
| 2026-07-21 | D3 architecture and scope review |
| 2026-07-22 | D4 implementation becomes the only active phase |
| 2026-08-01 | Target for first non-owner continuity install |
| 2026-08-08 | Demo scope freeze |
| 2026-08-15 | Three-minute demo, public launch, and repository-public target |

## Design phases

| Phase | Deliverable | Current state |
|---|---|---|
| D1 | Traceable requirements and golden acceptance story | Complete and canonical |
| D2 | Stable functional boundaries and migration map | Complete and canonical |
| D3 | Technical architecture, runtime strategy, contracts, and verification gates | Complete; 08-15 scope locked |
| D4 | M0–M4 implementation and demo hardening | M0 and M1 merged; M1 experience validation plus M2 next |

## Build slices

| Slice | Outcome | Exit gate |
|---|---|---|
| M0 — Contracts and runtime gate | Forme-owned contracts plus healthy Codex/OpenCode adapter paths | Schemas and adapter tests pass; policy differences are explicit |
| M1 — Continuity | Project/notes connector, evidence manifest, Twin state, snapshots, restart view | Runtime/session deletion does not lose state; Now/Changed/Next is reconstructable |
| M2 — Cognition | Cross-time reflection with evidence, uncertainty, correction, and invalidation | Owner accepts one reflection as more than summary |
| M3 — Bounded Agency | One typed effect with approval, idempotency, receipt, crash recovery, and rollback | Real Forme-owned artifact changes and rolls back safely |
| M4 — Controlled Presence | Whitelist-only, versioned static projection | Out-of-scope privacy canary cannot enter output |
| M5 — Optional mailbox | Invite-only message and owner-approved reply draft | Starts only after M1–M3 pass and explicit scope remains |

## Critical path

```text
workspace registry
  → connector and evidence IDs
  → Twin state and revisions
  → scoped context packet
  → runtime proposal
  → judgment event
  → typed effector and receipt
  → projection scope and compiler
```

Mailbox work is never on the private-Twin critical path.

## Delivery sequence

- **Now through 07-21:** canonical docs, M0 contracts, dual-runtime merge, M1 skeleton.
- **07-22 through 07-28:** complete M1 and run it on the Forme repository plus one notes-mirror fixture.
- **07-29 through 08-03:** M2 reflection and M3 bounded action.
- **08-04 through 08-07:** M4 static projection, privacy canary, install rehearsal, and golden scenario.
- **08-08:** freeze scope. Mailbox is cut unless M1–M3 are already green.
- **08-09 through 08-14:** reliability, privacy sweep, demo rehearsal, public documentation, and release packaging only.

## Scope rule

A feature enters the MVP only if it strengthens the feeling that Forme continuously understands, maintains, and extends one entity **and** it participates in a real daily workflow. Otherwise it is deferred even when technically interesting.
