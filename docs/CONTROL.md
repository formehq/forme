# Owner technical cockpit

## Current state

Forme is **paused for assumption review** as of 2026-09-17. There is no active
product slice, Enabler, runtime campaign or next implementation action.

The canonical explanation is
[CHECKPOINT-2026-09-17.md](./CHECKPOINT-2026-09-17.md). It records why the
project paused, which experimental evidence remains valid, which assumptions
are under review and what must happen before product work resumes.

## Last technical boundary

- Canonical `main` before the pause contained PRs #78–#84.
- #67 and #68 reached their historical Owner-acceptance conditions.
- #69 remained incomplete. PR #85 proved a live-loopback exact Response
  checkpoint but did not add the durable Public Core/PostgreSQL Response path.
- #70, complete R4 Owner Experience Acceptance and R5 did not occur.
- R4 Controlled Presence is therefore historical unfinished work, not the
  active product gate.

Passing tests, prior approval and successful local or staging proofs remain
evidence of what ran. They are not evidence that the underlying Living Project
Twin or durable judgment assumptions remain accepted.

## Current authority

The pause grants no runtime, provider, server, Guest-data, publication,
deployment, production, messaging, spend or public-traffic authority.

Read-only review, documentation, recovery inspection and reversible local
repository maintenance requested by the Owner are permitted. Do not resume
implementation from #69, #70 or any historical packet without a new Owner
decision.

## Repository state

The cleanup preserves the pre-pause experiment heads under annotated tags in
`checkpoint/2026-09-17/*`. Previously uncommitted root, server-readiness and
Sharing work was committed to tagged archive states before worktree removal.
Frozen packets and evidence remain in place because some are exact audit
fixtures.

The intended settled local state is one worktree on current `main`, a clean
Git index and no project-owned runtime residue.

## Return condition

Return to product development only when the Owner has reviewed the core
assumptions and states:

1. the revised product hypothesis;
2. the accepted relationship between source, observation, judgment, memory and
   task context;
3. the next bounded learning objective; and
4. the effect boundary for any new implementation or experiment.
