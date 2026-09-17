# Forme

The first Forme build phase explored an Owner-controlled Living Project Twin:
a local-first semantic spine intended to preserve project continuity, help the
Owner think, support bounded action and create a controlled social presence
without surrendering authorship or trust. That product hypothesis is now under
review.

## Current position

**Paused for assumption review as of 2026-09-17.** The project is at an
intentional checkpoint while the Owner re-examines the original product and
memory assumptions behind the Living Project Twin.

R1–R3 produced accepted historical experiments. R4 stopped before complete
Owner Experience Acceptance: `main` contains the integrated work through PR
#84, while the later live-loopback checkpoint from PR #85 was preserved but
not merged. No R4 or R5 implementation is active.

The central open question is whether repeated LLM synthesis and context
compaction can safely maintain durable project judgment. Current evidence
suggests that source, observation, candidate interpretation, Owner judgment
and task context need stronger separation, and that the Twin architecture may
require fundamental revision.

Read [the 2026-09-17 checkpoint](docs/CHECKPOINT-2026-09-17.md) before treating
the product hypothesis, roadmap or historical approvals as current direction.

## Start here

Read [the checkpoint](docs/CHECKPOINT-2026-09-17.md), then
[docs/CONTEXT.md](docs/CONTEXT.md). They define the paused state, the default
context set and the boundary between historical evidence and current belief.

The shortest ordinary route is:

1. [docs/CHECKPOINT-2026-09-17.md](docs/CHECKPOINT-2026-09-17.md) — why work
   paused, what remains evidence and what must be reconsidered;
2. [docs/PRODUCT.md](docs/PRODUCT.md) — the product hypothesis under review;
3. [docs/CONTROL.md](docs/CONTROL.md) — the current paused operating state;
4. [docs/VALIDATION.md](docs/VALIDATION.md) — validated experiments and open
   falsification questions.

Architecture, trust and R4 encounter contracts are opened conditionally from
[docs/CONTEXT.md](docs/CONTEXT.md), not read by default for every task.

## Local development

The commands below remain as reproducibility surfaces. The project pause does
not authorize a runtime rehearsal, provider call, server action or continuation
of R4; run them only inside a newly stated review or experiment boundary.

Requirements: Node.js 24+ and npm.

    npm ci
    npm run check

Useful bounded entry points:

    npm run room:dev
    npm run r4:walkthrough
    npm run r4:docs:audit

Runtime rehearsals create disposable local resources and are not implied by a
normal test run. Keep them loopback-only, synthetic-data-only and exact-owned;
the explicit `:pull` variant may acquire only its digest-pinned public image.

## Repository map

- apps/room — Guest-facing Room
- packages/r4-local — local product orchestration and walking slice
- packages/r4-persistence — Durable Public Core persistence boundary
- packages/r4-protocol — R4 contracts
- native/macos — native Harness boundary
- schemas — machine-readable contracts
- docs — product, architecture, control and frozen evidence

The repository is private and pre-release. Local Green is evidence, not
production readiness or Owner acceptance.

## Forme R3 managed action

Only Forme's fixed-marker executor may replace the body between these markers, and only after a separate owner approval bound to the exact effect-plan hash.

<!-- forme:r3-action:start -->
_No approved Forme action is currently applied._
<!-- forme:r3-action:end -->
