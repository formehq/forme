# Contributor and agent handoff

This file is the operational starting point for a new human or agent. No private vault access or previous conversation is required.

## Read order

1. [`PRODUCT.md`](./PRODUCT.md)
2. [`STATUS.md`](./STATUS.md)
3. [`ROADMAP.md`](./ROADMAP.md)
4. [`product/REQUIREMENTS.md`](./product/REQUIREMENTS.md)
5. [`architecture/HARNESS.md`](./architecture/HARNESS.md)
6. [`DECISIONS.md`](./DECISIONS.md)

Read component READMEs only for the area being changed.

## Repository map

| Path | Responsibility |
|---|---|
| `runtime/` | Codex/OpenCode execution adapters and capability facts |
| `schema/` | Forme-owned schemas and validation |
| `runner/` | Existing drift-card proposal pipeline and deterministic gates |
| `console/` | Existing local control surface and judgment interactions |
| `twin/` | Living Project Twin workspace, evidence, state, snapshots, and continuity flow |
| `launchd/` | macOS wake/catch-up and installation |
| `docs/` | Canonical product, status, roadmap, architecture, privacy, and handoff context |
| `design/` | Historical interaction/demo artifacts; not the current roadmap |

## Commands

```sh
npm install
npm test
npm run validate
npm run typecheck
npm run runtime:preflight
```

The M1 commands are `npm run twin:init`, `npm run twin:refresh`, and `npm run twin:status`; see [`../twin/README.md`](../twin/README.md).

## Non-negotiable implementation rules

- Agent runtimes are read-only proposal engines. Forme-owned code performs canonical writes.
- Every runtime response is validated independently by Forme.
- Canonical state must survive runtime, session, UI, and process loss.
- Every semantic proposal identifies a base Twin revision and evidence references.
- Meaningful effects require typed scope, authority, idempotency, a terminal receipt, and rollback where feasible.
- Projection code reads only explicit projection manifests, never private sources.
- Unknown capabilities and unknown schema fields fail closed.
- Do not copy private source text, note titles, credentials, or absolute local paths into fixtures, logs, docs, or projections.

## Session protocol

1. Read `STATUS.md` and the relevant requirement IDs.
2. Confirm the change belongs to the current M-slice and name its exit gate.
3. Prefer the smallest end-to-end increment over a broad horizontal abstraction.
4. Add or update contract tests before relying on a runtime or external format.
5. Run tests, validation, and type checking.
6. Update `STATUS.md`, the relevant architecture/decision document, and the related GitHub issue in the same session.
7. Leave the worktree clean or explicitly document the remaining local changes.

## Decision authority

Build work may proceed using the adopted MVP defaults in `PRODUCT.md`. Escalate only when a choice changes the constitutional floor, 08-15 scope, privacy boundary, runtime first-class status, or public external behavior.

Implementation details should be settled with bounded tests and documented decisions rather than additional abstract discussion.
