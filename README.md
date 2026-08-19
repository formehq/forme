# Forme

Forme is an Owner-controlled Living Project Twin: a local-first semantic spine
that preserves project continuity, helps the Owner think, supports bounded
action and can create a controlled social presence without surrendering
authorship or trust.

## Current position

R1 Continuity, R2 Cognition and R3 Bounded Agency are Owner-accepted. R4
Controlled Presence is the active product gate.

The repository contains a reviewable local Room, Durable Public Core and
PostgreSQL adapter. Synthetic repository tests and disposable persistence
proofs are Green. The product outcome is not yet complete: the full synthetic
Guest flow, a deployment-shaped integration decision and one
Owner-experienced Guest encounter remain open in
[Issue #67](https://github.com/formehq/forme/issues/67).

The project is currently at a clean-restart integration checkpoint. Historical
control packets and evidence remain available, but the default working set is
deliberately small and ordinary engineering now proceeds inside one
outcome-level boundary rather than through per-file or per-attempt approval.
Draft PR #78 is the candidate R4 development baseline; integrating it would
not complete #67 or imply Owner Experience Acceptance. No production access,
public traffic, provider call, real/private Guest data, deployment, merge or
Gate C authority follows from the local proofs.

## Start here

Read [docs/CONTEXT.md](docs/CONTEXT.md). It defines the default context set,
truth hierarchy and the boundary between active contracts and historical
evidence.

The shortest ordinary route is:

1. [docs/PRODUCT.md](docs/PRODUCT.md) — what Forme is and what the MVP must
   prove;
2. [docs/CONTROL.md](docs/CONTROL.md) — current gate, blocker and next
   acceptance point;
3. [docs/ROADMAP.md](docs/ROADMAP.md) — stable gate and dependency order;
4. the active GitHub issue and integration pull request — live execution
   state.

Architecture, trust and R4 encounter contracts are opened conditionally from
[docs/CONTEXT.md](docs/CONTEXT.md), not read by default for every task.

## Local development

Requirements: Node.js 24+ and npm.

    npm ci
    npm run check

Useful bounded entry points:

    npm run room:dev
    npm run r4:walkthrough
    npm run r4:docs:audit

Runtime rehearsals can create local resources and are not implied by a normal
test run. Use only the explicitly approved campaign for those effects.

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
