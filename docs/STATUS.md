# Project status

- Updated: 2026-07-16
- Scope freeze: 2026-08-08
- MVP demo and public launch: 2026-08-15
- Current phase: D2/D3 review and M1 Continuity implementation

## Executive state

Product and architecture understanding are sufficient to build. The active risk is execution coherence: the harness-first design must remain the only roadmap, and the first Living Project Twin vertical slice must replace further abstract design work.

The existing decision-card prototype is a reusable capability layer, not the new product boundary.

## Built and validated

- Local vault/project scanning and git-delta processing.
- Decision cards with schema validation, deterministic fingerprint suppression, accept/park/reject, correction, and ask-one-question.
- Deterministic hunk execution, terminal receipts, rollback, wake-catchup, metrics, State Diff, and Taste Rules v0.
- White-glove macOS installation path and Apple Notes export feasibility spike.
- M0 dual-runtime foundation: Codex one-shot, Codex App Server, and OpenCode server adapters behind a capability boundary.
- Codex App Server real structured turn; OpenCode isolated server/health/OpenAPI and simulated structured session.
- Canonical repository product/status/roadmap/requirements/architecture/handoff documentation and macOS CI.
- M1 local project and notes-mirror connection, relative-path evidence manifest, revisioned Twin state, immutable snapshots, continuity events, and restart/crash reconstruction.

## In progress

- D2/D3 review closure against the implemented M0/M1 boundaries.
- Owner review of the real Forme Project Twin continuity view and one real exported-notes mirror run.
- M2 ContextPacket and evidence-scoped Reflection pass design against real snapshots.

## Not yet complete

- M1 owner-experience acceptance and launchd wake integration; deterministic code and real Forme-project acceptance are complete.
- Cross-time Reflection packet and quality gate.
- Twin-aware corrections and dependent-output invalidation.
- Typed Twin effector transaction and crash-equivalence gate.
- Allowed Projection Scope compiler and privacy canary.
- Non-owner pilot on the new continuity flow.
- Optional mailbox; this remains gated and does not block the MVP.

## Active risks

1. **Reflection variance:** a fluent summary does not satisfy Cognition.
2. **Scope expansion:** interactive projection, web UI, and mailbox can consume the month.
3. **Privacy leakage:** projections and public fixtures must never contain local paths or private source material.
4. **Runtime abstraction drift:** capability declarations must preserve Codex/OpenCode differences.
5. **Management drift:** GitHub milestone and issue state must be reconciled when implementation state changes.

## Next acceptance target

Connect one real local project, create revisioned Twin state and evidence metadata, stop the process, restart it, and render the same durable Now/What Changed/Next Move view without relying on a runtime session.
