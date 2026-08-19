# Forme working agreement

Forme is operated by outcomes, not by per-file or per-attempt approval.

## Start

Read `docs/CONTEXT.md`, `docs/CONTROL.md`, the active issue and the active pull
request. State one user-visible outcome and the boundary for the work.

Inside that boundary, proceed autonomously through implementation, tests,
refactors, local synthetic runs, reversible repairs, documentation, commits
and updates to the active pull request. A failed test, changed hash or ordinary
implementation choice is not a new Owner decision.

## Return to the Owner only when

- product meaning, authorship, privacy or another trust boundary would change;
- real/private data, a provider call, production, public traffic, publication,
  messaging, credentials, spend or a merge would be used;
- a destructive or meaning-changing durable migration is required;
- effects are ambiguous, owned cleanup cannot be proved, or the promised
  outcome must materially change; or
- the result is ready for Owner Experience Acceptance.

Ordinary additive schema work, local disposable infrastructure and bounded
diagnostics remain engineering work when they are already inside the stated
outcome and use synthetic data with exact-owned cleanup.

## Keep the project legible

- Keep one active product outcome. Add an Enabler only for a concrete blocker.
- Passing tests means Technical Review, not product Done.
- A merge integrates reviewable code; it does not close the product issue or
  imply Owner acceptance.
- Replace current status in `docs/CONTROL.md`; do not append chronology.
- Put live progress in the active issue and pull request. Keep historical
  detail in Git, frozen evidence or `docs/HISTORY.md`.
- Do not revive an old Packet, Card, Addendum, grant or hash as current
  authority.

## Report

Use three normal touchpoints: outcome/boundary at the start, a message only if
a real return condition appears, and a final evidence-backed handoff.
