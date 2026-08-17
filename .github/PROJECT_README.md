# Forme MVP execution board

## Authority

This board executes the repository product authority. It does not rewrite
`PRODUCT.md`, `CONTROL.md`, `ROADMAP.md`, `NATIVE-HARNESS-ARCHITECTURE.md` or
the approved R4 product contracts.

## North star

Complete one connected R4 experience: Public Room → bounded private knock →
durable local pull → fresh candidate → exact Owner response → bounded
continuation and negative Private boundary.

## Current focus — 2026-08-17

- R0–R3 and #66 are Done and Owner-accepted.
- #67 is the one active Walking Slice: `Building / At Risk`.
- The historical Integration Campaign V4 failed cleanly before PostgreSQL and
  exhausted its lifecycle budget. Its runner and Correction/Card/Review chain
  are frozen as evidence.
- The one linked Enabler #77 is now `Needs Decision / Blocked`. Its approved
  two lifecycles reached isolated PostgreSQL 16.10 and cleaned exactly, but
  both failed at the first hash-pinned schema batch. The second returned
  PostgreSQL `42725 / op_error`. No third lifecycle or schema correction is
  authorized; the next action is a schema-compatibility architecture review.
- #71 Setup/Doctor remains Planned for #68 and is not the active #67 Enabler.
- The current local R4 head is not represented by the open Draft PR stack;
  Draft PR #65 is `Needs Decision / Blocked` until product code and historical
  governance material are separated into a reviewable integration shape. Do
  not claim remote/CI coverage for the current local head.

## Operating rules

1. At most one active Walking Slice and one linked Enabler.
2. Enablers earn `0 Product Progress`; every update names the user capability
   added or says so explicitly.
3. Default Enabler budget: two working days and two full attempts after its
   effect envelope is approved.
4. Two same-boundary failures, exhausted budget, ambiguous effects, or an
   Enabler needing another Enabler moves the work to `Needs Decision` and
   architecture review. Do not create a successor Correction authority tree.
5. Ordinary code, tests, refactors and bounded repairs are review-by-exception.
   Owner decisions are reserved for schema/trust changes, first real
   Guest/provider/message use, and production/public/Gate C effects.
6. Technical Review is automated evidence. Done requires Owner Experience
   Acceptance.
7. Issue, Project, integration PR and repository current-status surfaces must
   agree before implementation continues.

## Planning checkpoint

2026-08-25 is Progress & Vision Sharing, not a completion deadline. Report the
truthful product capability reached by then.
