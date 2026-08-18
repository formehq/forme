# Agent working agreement

This repository is being rebuilt to keep implementation speed, product
progress, and Owner understanding synchronized. Global Codex preferences come
from `~/.codex/AGENTS.md`; this file adds the stricter Forme contract.

## Before changing anything

1. Read `docs/PRODUCT.md`, `docs/CONTROL.md`, and the active GitHub issue.
   Before runtime, context, file/tool authority, or R4 T3 work, also read
   `docs/NATIVE-HARNESS-ARCHITECTURE.md`.
2. Name the user-visible outcome, current roadmap gate, and distance to the
   next Owner-experience acceptance point.
3. State whether the work creates product progress or is only an Enabler. An
   Enabler reports `0 Product Progress` until a user capability changes.
4. Identify any Owner stop gate and confirm that the current outcome envelope
   covers it.
5. Check that `docs/CONTROL.md`, the active issue, the GitHub Project item, the
   integration PR, and the actual branch describe the same blocker and next
   action before any runtime or external effect.

## Owner stop gates

Do not implement past the proposal stage without explicit Owner confirmation
when a change:

- changes a persisted product schema, migration, retention rule, canonical
  meaning, or trust boundary;
- grants a new class of file, shell, network, provider, publish, messaging,
  credential, spend, production, or public authority;
- changes what Codex or OpenCode may observe or execute;
- changes projection privacy, audience, representation, or authorship rules;
- adds a foundational dependency or deployment topology;
- changes P0 scope, dates, public behavior, or an Owner-accepted product
  contract; or
- expands a one-use or bounded physical-effect ceiling, retries after an
  exhausted ceiling, or acts while effects are ambiguous.

Ordinary repository files, tests, docs, evidence, and Git commits inside an
already confirmed outcome envelope are not separate durable-state decisions.

## Outcome-envelope workflow

Prefer one medium-grained Owner decision over a sequence of ceremonial
per-file, per-commit, per-run, or per-hash approvals.

Before implementation, state one outcome envelope containing:

- the user-visible result and current roadmap gate;
- the bounded workset;
- data, permission, runtime, network, production, publication, spend, and
  other external-effect ceilings;
- validation and Technical Review evidence; and
- the exact exception or acceptance condition that returns control to the
  Owner.

Once the Owner confirms the envelope, proceed autonomously through ordinary
implementation, local/fake tests, body-free diagnostics, contract-preserving
compatibility repairs, evidence freezing, current-status reconciliation, and
local commits. Recomputed hashes, added regression cases, report wording, and
other implementation choices inside the confirmed envelope do not reopen an
Owner gate.

Default Owner touchpoints are:

1. confirm the outcome envelope;
2. review a real exception only if the envelope must change; and
3. perform Owner Experience Acceptance when the result is demonstrable.

A failed test that can be repaired inside the envelope is not a new approval
gate. Passing tests remains Technical Review, not Owner Experience Acceptance.

## Default local disposable integration campaign

The Owner confirmed this standing collaboration default on 2026-08-17. When
the requested outcome is a local, synthetic, loopback-only R4 integration
proof and no narrower envelope is stated, use one campaign with these ceilings:

- up to three working days;
- up to three repository-only repair rounds;
- up to four full disposable lifecycles; and
- up to two acquisition attempts for the same exact approved dependency or
  image digest, only when it is proven absent or the prior acquisition ended
  with a definite non-ambiguous failure.

The campaign includes ordinary repository edits, tests, evidence, current
status docs, local commits, body-free host and Docker diagnostics, exact pinned
image acquisition, synthetic loopback PostgreSQL/SQL, contract-preserving
compatibility repairs, bounded reruns, and exact cleanup. The exact image cache
may remain as named local residue; disposable containers, networks, volumes,
credentials, databases, runtime roots, and coordinator state may not.

Inspect, acquire, re-inspect, and consume the exact dependency in one
continuous campaign whenever feasible. A cache miss discovered before any
runtime resource is created consumes an acquisition attempt, not a full
lifecycle. Do not ask the Owner to approve the pull, the resulting hash, the
repair, and the rerun separately when all remain inside this campaign.

After two failures at the same abstraction boundary, pause physical attempts
and perform an architecture review. Continue autonomously if that review finds
a reversible repair inside the same product meaning, trust boundary, and
remaining budgets. Return to the Owner only if the envelope must change, an
effect is ambiguous, cleanup is unproved, or the campaign budget is exhausted.

This standing campaign never grants real/private data, provider, publication,
messaging, credentials, spend, production, public traffic, push, merge,
deployment, or Gate C authority.

## Anti-ceremony and escalation

- Do not create a new Card, Addendum, Owner Review, issue, or authority tree
  for an ordinary implementation bug, platform wording difference, hash
  refresh, body-free diagnostic variant, or bounded repair.
- Plan runtime envelopes around the complete foreseeable outcome: diagnostic,
  ordinary repair, verification, and exact cleanup. A physical-attempt ceiling
  counts physical attempts, not Owner approvals.
- Keep at most one active Walking Slice and one linked Enabler.
- Unless an approved envelope says otherwise, a non-runtime Enabler has a
  two-working-day and two-full-attempt budget. A local disposable integration
  campaign uses the larger standing ceilings above. Reaching the applicable
  limit without the promised result moves it to `Needs Decision`; do not
  create a child Enabler to extend the same approach.
- Two failures at the same abstraction boundary require architecture review
  before another physical attempt; that review is not itself a new Owner gate
  when its repair remains inside the confirmed campaign.
- Exact hashes are evidence, not units of Owner decision.
- When implementation details are uncertain but the boundary is not, choose
  the most reversible in-envelope path and continue.

## Current-truth hierarchy

Use these surfaces for distinct jobs:

1. `docs/PRODUCT.md` and `docs/ROADMAP.md` — stable product meaning, scope, and
   acceptance sequence;
2. `docs/CONTROL.md` plus the active GitHub issue — current blocker, current
   authority, and next action;
3. the active integration PR — remote bytes and CI truth;
4. evidence, result reports, Cards, Addenda, and Reviews — immutable or dated
   historical proof.

Historical evidence never overrides the current control surfaces. A policy or
reset document must label dated execution snapshots as historical and point
readers to `docs/CONTROL.md` for current truth.

Update only the smallest current-status set during active work. `PRODUCT.md`,
`ROADMAP.md`, and architecture documents change only when product or
architecture truth changes; ordinary attempts update the active issue,
`CONTROL.md`, one result report, and the integration PR when applicable.

Do not claim remote integration, review, or CI for a local-only head. Before a
new runtime effect, the current branch must either be represented by the
active integration PR or be explicitly recorded as local-only in both
`CONTROL.md` and the active issue.

## Non-negotiable boundaries

- The Owner retains final authority over meaning and authorship.
- Runtime sessions are disposable computation, never canonical truth.
- Agent inference remains evidence-backed, uncertain, revisable, and
  invalidatable.
- Under the Owner-approved NH2 two-class boundary, ordinary Native Workbench
  activity may proceed only inside its admitted Harness envelope. Results are
  not automatically Forme meaning or a Forme-authoritative effect.
- Implemented Forme-authoritative writes remain deterministic, authorized,
  inspectable, and reversible where feasible.
- The approved R4 T3/T4/T5 and Demo-critical Core contracts remain product and
  trust constraints. They do not by themselves grant a concrete runtime,
  provider call, Guest-data access, production action, public effect, push,
  merge, or Gate C authority.
- Current operational authority comes from the active confirmed envelope and
  current control surfaces, never from an old Card, Review, Packet, hash, or
  successful historical run.
- Private source existence never implies projection permission.
- Unknown capabilities and invalid outputs fail closed.

## Completion protocol

Every implementation pull request must include:

- the user outcome and MVP-distance change;
- whether it creates product progress or only enables later progress;
- before/after behavior;
- data and permission impact;
- validation evidence and a runnable demo path;
- Enabler time/attempt budget and stop condition when applicable;
- what the Owner should challenge; and
- documentation updates when shared system understanding changed.

Passing tests is Technical Review. Only Owner Experience Acceptance moves a
core slice to Done.
