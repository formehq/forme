# R4 execution management reset

Status: Owner-approved repository and GitHub execution-management correction,
2026-08-17.

## Product result

R4 exists to complete one connected experience:

> a real visitor opens the Public Room, sends one bounded private knock, the
> request becomes durable, a fresh local session prepares a candidate, and the
> Owner decides the exact response.

Infrastructure is useful only when it removes a blocker from that story.

## Current truth

- #67 remains `Building / At Risk`; the complete experience is not in
  Technical Review or Owner Acceptance.
- Integration Campaign V4 is immutable failed-clean history. It reached no
  PostgreSQL or SQL and left exact-owned residue at zero.
- The existing local physical runner and its Correction/Card/Review chain are
  frozen as historical evidence. They receive no routine fingerprint or
  platform-wording extension.
- R4 is not on `main`. At reset start, local HEAD `679176a` was 108 commits and
  151 changed paths beyond the remote Draft PR #76 head; 99 of those paths were
  documents and 33 were schemas. No open PR represents that local line. Draft
  PR #65 is `Needs Decision / Blocked` until the history has a reviewable
  integration shape.
- This reset authorizes repository rules, status reconciliation and GitHub
  metadata only. It authorizes no Docker, PostgreSQL, provider, Guest,
  publication, production, merge, push, spend or Gate C effect.

## Operating model

1. Keep one active Walking Slice: #67.
2. Keep at most one linked Enabler:
   [#77 — simplified disposable local PostgreSQL rehearsal][issue-77].
3. The Enabler receives zero product-progress credit. Progress is the user
   capability added to #67.
4. Ordinary repairs inside an approved envelope do not create new Cards,
   Addenda, Owner Reviews or per-hash approval requests.
5. Two same-boundary failures, two full attempts, two working days without the
   promised result, ambiguous effects, or an Enabler needing another Enabler
   forces `Needs Decision` and an architecture review.
6. Technical Review is automated evidence. Done still requires Owner
   Experience Acceptance.

## Next Enabler contract

The next proposal must produce one repeatable disposable PostgreSQL rehearsal:

- unique run-scoped names and labels;
- synthetic data only;
- cleanup restricted to resources proven owned by that run;
- semantic/structured Docker result handling rather than complete stderr-body
  SHA allowlisting;
- bounded readiness retries only when no ambiguous durable or external effect
  can be replayed;
- schema apply and verification, restart recovery, rollback rehearsal, and
  final exact-owned residue zero;
- one implementation PR and one result report.

Default budget after a separate medium-grained runtime envelope is approved:
two working days and at most two full lifecycles. Failure at that boundary
replaces the approach; it does not start another authority-document tree.

## Owner decision levels

Normal repository implementation, tests, refactors, docs and already bounded
local/synthetic repair are review-by-exception. Stop for the Owner only when:

1. schema, durable meaning or a trust boundary changes;
2. real Guest data, a provider or an external message is used for the first
   time; or
3. production, public traffic or Gate C is requested.

## GitHub control

GitHub Project is the current execution control surface. The active issue,
linked Enabler, integration PR and current-status documents must agree on the
same blocker and next action. Correction details remain evidence or subtasks;
they do not become independent product milestones.

Current stop:

`R4_EXECUTION_MANAGEMENT_RESET_COMPLETE /
DISPOSABLE_POSTGRES_ENABLER_ENVELOPE_REQUIRED /
DOCKER_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

[issue-77]: https://github.com/formehq/forme/issues/77
