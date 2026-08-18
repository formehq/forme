# R4 execution-management policy and reset checkpoint

Status: Owner-approved execution-management policy, with dated historical
checkpoints from 2026-08-17.

## How to read this document

This file defines the stable operating model introduced by the R4 reset. It is
not the live execution cockpit and should not be rewritten after every local
attempt.

Current truth lives in:

1. [`CONTROL.md`](./CONTROL.md) and active Walking Slice
   [#67](https://github.com/formehq/forme/issues/67);
2. the linked Enabler [#77][issue-77]; and
3. the active integration PR for remote bytes and CI.

Execution details below are dated evidence. They never override those current
control surfaces.

## Product result

R4 exists to complete one connected experience:

> a real visitor opens the Public Room, sends one bounded private knock, the
> request becomes durable, a fresh local session prepares a candidate, and the
> Owner decides the exact response.

Infrastructure is useful only when it removes a blocker from that story.

## #77 outcome checkpoint — 2026-08-17 (historical)

The reset model was exercised through the complete approved #77 budget:

- one medium-grained envelope covered ordinary implementation and repair
  without per-file, per-commit, or per-hash approval;
- isolated PostgreSQL attempts and body-free diagnostics cleaned exactly;
- compatibility work preserved schema shape and business meaning while
  correcting PostgreSQL 16 catalog expression assumptions;
- replacement diagnostic run `0dddf25aee37504c` used the one approved exact
  image pull and evaluated all 18 predicates;
- its only failure, `public_core_unexpected_object_present`, matched the
  reviewed catalog-ordering class;
- one consolidated verify-only correction made fixed inventory comparisons
  use explicit text `C` ordering without changing schema, rollback, expected
  inventory, business meaning, or catalog-manifest results;
- final run `71ac0e393653db72` used the cached image, applied the schema and
  passed initial verify, then failed cleanly at restart readiness;
- post-restart verification, persistence proof and rollback were not reached;
- current-run container, network, volume, credential and runtime-root residue
  is zero; and
- all pull, diagnostic, correction and final-lifecycle allowances are
  consumed. There is no retry under that envelope.

Historical checkpoint stop:

`POSTGRES_VERIFY_CONSOLIDATED_CORRECTION_FINAL_LIFECYCLE_FAILED_CLEAN /
INITIAL_VERIFY_GREEN / RESTART_READINESS_FAILED / ROLLBACK_NOT_REACHED /
EXECUTION_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

## Reset-start checkpoint — 2026-08-17 (historical)

- #67 remained `Building / At Risk`; the complete experience was not in Owner
  Acceptance.
- Integration Campaign V4 became immutable failed-clean history. It reached
  no PostgreSQL or SQL and left exact-owned residue at zero.
- The prior physical runner and Correction/Card/Review chain were frozen as
  historical evidence rather than extended for routine fingerprints.
- At reset start, local HEAD `679176a` was 108 commits and 151 changed paths
  beyond remote Draft PR #76. No open PR represented that local line, and
  Draft PR #65 required a reviewable integration shape.
- The reset itself authorized repository rules, status reconciliation and
  GitHub metadata only. It authorized no Docker, PostgreSQL, provider, Guest,
  publication, production, merge, push, spend or Gate C effect.

Reset-start stop:

`R4_EXECUTION_MANAGEMENT_RESET_COMPLETE /
DISPOSABLE_POSTGRES_ENABLER_ENVELOPE_REQUIRED /
DOCKER_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

## Stable operating model

1. Keep one active Walking Slice: #67.
2. Keep at most one linked Enabler.
3. An Enabler receives zero product-progress credit. Progress is the user
   capability added to the Walking Slice.
4. Prefer one medium-grained result/effect envelope. Once approved, ordinary
   code, tests, body-free diagnostics, bounded repairs, evidence, docs and
   local commits proceed review-by-exception.
5. Exact hashes and regenerated evidence are proof, not separate Owner
   decisions.
6. Ordinary repairs do not create new Cards, Addenda, Owner Reviews, Enablers
   or per-hash approval requests.
7. Two same-boundary failures, two full attempts, two working days without the
   promised result, ambiguous effects, or an Enabler needing another Enabler
   forces `Needs Decision` and architecture review.
8. Technical Review is automated evidence. Done still requires Owner
   Experience Acceptance.

## Original #77 Enabler contract (historical)

#77 was created to produce one repeatable disposable PostgreSQL rehearsal
with:

- unique run-scoped names and labels;
- synthetic data only;
- cleanup restricted to resources proven owned by that run;
- semantic/structured Docker result handling rather than complete stderr-body
  SHA allowlisting;
- bounded readiness retries only when no ambiguous durable or external effect
  could replay;
- schema apply and verification, restart recovery, rollback rehearsal, and
  final exact-owned residue zero; and
- one implementation PR and one concise result report.

Its default budget was two working days and at most two full lifecycles after
runtime-envelope approval. The historical outcome above exhausted its later
approved extensions and returned to `Needs Decision`; it does not authorize a
successor authority tree or another runtime attempt.

## Owner decision levels

Normal repository implementation, tests, refactors, documentation and already
bounded local/synthetic repair are review-by-exception. Return to the Owner
when:

1. product meaning, a persisted schema, durable meaning or a trust boundary
   changes;
2. a new source/provider/effect class, real Guest data or an external message
   is introduced;
3. an approved physical budget or one-use authority must expand;
4. effects are ambiguous; or
5. production, public traffic, push, merge or Gate C is requested.

## Current-truth and GitHub control

GitHub Project is the execution board, while repository documents preserve the
product and architecture contracts:

- `PRODUCT.md` and `ROADMAP.md`: stable product meaning and acceptance order;
- `CONTROL.md` plus the active issue: current blocker and next action;
- active integration PR: remote bytes and CI truth;
- reports, evidence, Cards, Addenda and Reviews: dated or immutable history.

The active issue, linked Enabler, Project fields, integration PR and
`CONTROL.md` must agree before another runtime or external effect. Correction
details remain evidence or subtasks; they do not become independent product
milestones.

[issue-77]: https://github.com/formehq/forme/issues/77
