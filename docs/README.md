# Forme project guide

This directory is the canonical entry point for product, architecture, status, and handoff context. A new contributor should not need private notes or old chat history to understand the project.

## Start here

1. [`PRODUCT.md`](./PRODUCT.md) — what Forme is, the MVP claim, constraints, and scope defaults.
2. [`STATUS.md`](./STATUS.md) — what is built, in progress, blocked, and next.
3. [`ROADMAP.md`](./ROADMAP.md) — D1–D4 design phases, M0–M5 build slices, dates, and gates.
4. [`HANDOFF.md`](./HANDOFF.md) — repository map, commands, and session protocol.

## Product and design

- [`product/REQUIREMENTS.md`](./product/REQUIREMENTS.md) — traceable MVP requirements and acceptance story.
- [`architecture/FUNCTIONAL_DECOMPOSITION.md`](./architecture/FUNCTIONAL_DECOMPOSITION.md) — stable responsibilities and migration map.
- [`architecture/HARNESS.md`](./architecture/HARNESS.md) — Living Project Twin architecture and verification gates.
- [`architecture/RUNTIME_STRATEGY.md`](./architecture/RUNTIME_STRATEGY.md) — Codex/OpenCode boundary and capability strategy.

## Existing implementation references

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the currently implemented card/runtime system.
- [`DECISIONS.md`](./DECISIONS.md) — append-only architecture decision log.
- [`SCHEMA.md`](./SCHEMA.md) — current decision-card and event contracts.
- [`PRIVACY.md`](./PRIVACY.md) — local data and release privacy boundary.
- [`WHITE_GLOVE_INSTALL.md`](./WHITE_GLOVE_INSTALL.md) — operator installation path for the existing prototype.

## Acceptance evidence

- [`evidence/M1_CONTINUITY_ACCEPTANCE.md`](./evidence/M1_CONTINUITY_ACCEPTANCE.md) — deterministic and real Forme-project M1 results.

## Source-of-truth rule

Repository documents are the build source of truth. Private research notes may provide evidence, but no implementation decision may depend on an inaccessible local path. When code and docs disagree, treat the mismatch as a build failure and reconcile it in the same change.
