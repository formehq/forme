# Project status

- Updated: 2026-07-16
- Scope freeze: 2026-08-08
- MVP demo and public launch: 2026-08-15
- Current phase: D1–D3 consolidation and M0 runtime foundation

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

## In progress

- Canonical repository documentation and handoff surface.
- M0 contracts and automated contract validation.
- Dual-runtime foundation review and merge: [PR #39](https://github.com/formehq/forme/pull/39).
- M1 Continuity vertical slice: workspace registry, source manifest, Twin state, snapshots, restart reconstruction, and Now/What Changed/Next Move.

## Not yet complete

- A complete Living Project Twin acceptance scene under the new requirements.
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
