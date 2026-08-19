# Forme MVP execution board

## Authority

This board executes the repository product authority. It does not rewrite
`PRODUCT.md`, `CONTROL.md`, `ROADMAP.md`, `NATIVE-HARNESS-ARCHITECTURE.md` or
the approved R4 product contracts.

## North star

Complete one connected R4 experience: Public Room → bounded private knock →
durable local pull → fresh candidate → exact Owner response → bounded
continuation and negative Private boundary.

## Current focus — 2026-08-18

- R0–R3 and #66 are Done and Owner-accepted.
- #67 is the one active Walking Slice: `Building / At Risk`.
- #77 is Technical Review Green: its disposable PostgreSQL lifecycle passed
  schema, restart, persistence, rollback and exact cleanup. It is closed as a
  local persistence Enabler and contributes `0 Product Progress` by itself.
- The product runtime is repository Green and has physically passed its
  PostgreSQL schema/verify boundary. The complete synthetic Room flow and one
  Owner-experienced Guest encounter remain open.
- Repeated cached-only misses establish cache volatility, not a persistence
  regression. Docker cache is no longer a readiness prerequisite.
- The next linked Enabler is the repository-defined, read-only existing-server
  readiness inventory for Cloudflare → Caddy → Hetzner → PostgreSQL.
  Live server access and isolated staging remain unapproved.
- #71 Setup/Doctor remains Planned for #68 and is not the active #67 Enabler.
- The local branch is ahead of its remote tracking branch. The GitHub issue,
  Project item and integration PR have not been refreshed by this
  repository-only change, so no new remote synchronization or CI is claimed.

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
