# Owner control panel

- Updated: 2026-07-17
- Active gate: R0 — repository reboot and shared understanding
- Active build issue: none until new GitHub planning is created
- P0 status: not started on the new main
- Next owner decision: approve the first walking-skeleton input, output, durable state, and demo

## Current truth

The new main intentionally contains no product implementation. The previous prototype, runtime adapters, and Continuity code are preserved in the archive. They may be studied and selectively reused only after their role is understood and approved in the active slice.

## Control model

| Layer | Examples | Authority |
|---|---|---|
| Product constitution | vision, authorship, privacy, MVP scope | owner confirmation required |
| Architecture and contracts | durable state, context, permissions, schemas, projection boundary | one-page proposal and owner confirmation before implementation |
| Implementation | files, functions, tests, error handling inside an approved contract | agent may proceed autonomously |
| Maintenance | refactors, CI, dependency hygiene, documentation synchronization | agent may proceed with evidence |

## Slice cadence

Every core slice follows the same loop:

1. **Kickoff:** one-page Control Packet explains user outcome, data flow, agent visibility, authority, persistence, failure recovery, and owner decisions.
2. **Owner gate:** the owner confirms product and contract choices.
3. **Build:** one small end-to-end increment per pull request.
4. **Technical Review:** checks pass and a runnable demo is available.
5. **Owner Acceptance:** the owner experiences the behavior and can explain the important boundaries.
6. **Done:** issue closes only after both forms of evidence exist.

## Stop-the-line triggers

Implementation pauses before crossing any of these boundaries:

- new or changed persistent state;
- a schema or identifier change;
- broader agent context or authority;
- file, shell, network, messaging, or publish access;
- privacy or projection-scope changes;
- a foundational dependency or deployment topology;
- P0/P1/P2 movement or date changes.

## Definition of done

A P0 slice is Done only when:

- the user-visible outcome works on real data;
- deterministic and adversarial checks pass;
- restart/failure behavior is demonstrated where relevant;
- privacy and permission effects are explicit;
- the owner has completed the demo and accepted the experience;
- `CONTROL.md`, `ROADMAP.md`, and the GitHub issue agree.

## Work-in-progress limit

- one active P0 build issue at a time;
- one pull request proves one outcome;
- P1 work starts only when every earlier P0 gate is green;
- no feature begins because it is technically attractive alone.
