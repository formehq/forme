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
- The one linked Enabler #77 is now `Needs Decision / Blocked`. Its approved
  diagnostic/correction budget reached PostgreSQL 16.10, applied the schema,
  passed the complete initial verify and cleaned exactly. The final lifecycle
  then failed at restart readiness before persistence or rollback. All
  pull/diagnostic/correction/lifecycle allowances are consumed. The next
  action is restart-readiness architecture review, not another local retry.
- #71 Setup/Doctor remains Planned for #68 and is not the active #67 Enabler.
- The current local R4 head is not represented by the open Draft PR stack;
  implementation/evidence baseline `a2ce379` is 123 commits and 163 changed
  paths beyond Draft PR #76's head, with this repository-only working-model
  correction layered locally above it. Draft PR #65 is
  `Needs Decision / Blocked` until product code and historical governance
  material are separated into a reviewable integration shape. Do not claim
  remote/CI coverage for either local layer.

## Operating rules

1. At most one active Walking Slice and one linked Enabler.
2. Enablers earn `0 Product Progress`; every update names the user capability
   added or says so explicitly.
3. Prefer one medium-grained result/effect envelope. Ordinary code, tests,
   body-free diagnostics, bounded repair, evidence, docs and local commits
   inside it do not require per-file, per-hash or per-attempt approval.
4. Default Enabler budget: two working days and two full attempts after its
   effect envelope is approved.
5. Two same-boundary failures, exhausted budget, ambiguous effects, or an
   Enabler needing another Enabler moves the work to `Needs Decision` and
   architecture review. Do not create a successor Correction authority tree.
6. Ordinary code, tests, refactors and bounded repairs are review-by-exception.
   Owner decisions are reserved for schema/trust changes, first real
   Guest/provider/message use, expanded physical budgets, ambiguous effects,
   and production/public/Gate C effects.
7. Technical Review is automated evidence. Done requires Owner Experience
   Acceptance.
8. Issue, Project, integration PR and repository current-status surfaces must
   agree before implementation continues.

## Planning checkpoint

2026-08-25 is Progress & Vision Sharing, not a completion deadline. Report the
truthful product capability reached by then.
