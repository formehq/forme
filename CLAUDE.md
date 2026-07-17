# CLAUDE.md — Forme

## What This Project Is

**Forme** is a local-first Living Project Twin: durable semantic project state that survives any one document, chat, runtime session, or model. It separates evidence, confirmed meaning, revisable inference, bounded action, and controlled external projection. The existing decision-card system is a validated control primitive inside the Twin, not the product boundary.

**Current stage: D2/D3 review plus M1 real-workspace acceptance and M2 preparation.** The harness-first pivot in GitHub issue #37 replaces the former W4–W6 plan. Scope freezes on 2026-08-08; the MVP demo and public-launch target is 2026-08-15. This file and `docs/` must provide enough context without private notes or old chat history.

## Canonical Documents

Repository documents are the build source of truth. Private research can provide evidence, but implementation may not depend on an inaccessible local path.

| Need | Read |
| --- | --- |
| Product definition and scope defaults | `docs/PRODUCT.md` |
| Current implementation state | `docs/STATUS.md` |
| Dates, slices, and gates | `docs/ROADMAP.md` |
| MVP requirements | `docs/product/REQUIREMENTS.md` |
| Living Project Twin architecture | `docs/architecture/HARNESS.md` |
| Runtime integration strategy | `docs/architecture/RUNTIME_STRATEGY.md` |
| Handoff and session protocol | `docs/HANDOFF.md` |

Start at `docs/README.md`. When code and docs conflict, reconcile them in the same change.

## Architecture: Seven Steps in a Decision Card's Life

1. **Trigger:** launchd watches the vault and runs missed work after wake.
2. **Agent run:** the runtime boundary asks Codex or OpenCode for schema-constrained JSON while the harness remains read-only. The prompt injects `Taste Rules.md` and, later, k similar historical decisions.
3. **Deterministic write:** the agent returns schema-constrained JSON only. The runner writes card JSON and Markdown mirrors. A fingerprint (category + target + diff hash) that matches a rejected or parked decision is discarded.
4. **Presentation:** the localhost console renders fixed card primitives. There are no notifications; cards wait at the workflow boundary.
5. **Decision:** one gesture (a/p/r) applies the diff when accepted, keeps git rollback available, silently measures time-to-decision, and appends to `decisions.jsonl`.
6. **Learning:** about every 20 decisions, the system distills readable rules into `Taste Rules.md`, which the user can edit directly.
7. **Authorization:** when replay consistency for a category exceeds 95%, it enters shadow mode. Full automation requires explicit user approval.

## Hard Constraints

Violating any of these is a rejection. They come from validated behavior, not preference.

1. The human side is read-only plus one decision gesture. Optional correction is the only exception.
2. Proposal count adapts to recent acceptance rate and appears in batches only at workflow boundaries.
3. Wake to first visible card is at most 10 seconds. Process only the delta; render existing state first when needed.
4. The UI owns no private truth. Durable Forme-owned state and append-only events are the truth layer; Markdown views are reconstructable projections.
5. The card schema is envelope-shaped from day one (`origin/from/role/category`) for post-MVP agent relay.
6. Repetition approaches zero through deterministic fingerprints and hard filters, not LLM self-restraint.
7. **The agent is read-only and returns JSON only.** Forme's deterministic code performs every write, normalizing harness sandbox differences and keeping provenance auditable.

## Technical Baseline

- **Execution is a capability matrix (revised 2026-07-16):** the stable default is `codex-exec`; `codex-app-server` and `opencode` are working opt-in proposal runtimes behind `runtime/`. Codex provides an OS-enforced read-only sandbox; OpenCode provides application permission rules and therefore must not be represented as equivalent isolation. Both provide native structured output, while Forme still validates with its own AJV and performs every write. SKILL.md remains a portable instruction surface, not a runtime security boundary.
- **Provider policy facts (verified 2026-07-04):** Anthropic forbids product-side consumer OAuth, so no product path may depend on a user's Claude subscription. User-operated Claude Code plus SKILL.md is compliant. OpenAI has no third-party subscription OAuth plan; users authenticate their own Codex CLI, including official headless device auth. Runs stay incremental and API-key mode remains available.
- **Scheduling:** launchd for the first macOS release.
- **Data:** append-only events and receipts plus revisioned Twin state, snapshots, `decisions.jsonl`, Taste Rules, and reconstructable Markdown views.
- **License:** Apache-2.0 at public release.
- **Console:** native TypeScript plus `node:http`, with no heavy framework (see `docs/DECISIONS.md`).
- **Product language:** English-first from 2026-07-09 (#29), forward-only. New cards, console copy, State Diffs, and distilled Taste Rules are English. Historical cards, events, rules, design notes, quotes, paths, and target-file text are not translated. Localization is a W7+ question.

## Repository Status

- **Built:** `schema/` (card/event contracts plus eight Living Project Twin contracts); `runtime/` (Codex one-shot + App Server and OpenCode authenticated server adapters, capability matrix, deterministic protocol tests, live preflight); `twin/` (workspace registry, project/notes-mirror connectors, evidence manifest, revisioned state, immutable snapshots, crash-safe transition recovery, and reconstructable Continuity view); `runner/` (file-lock serialization, deterministic timestamp-freshness self-execution, runtime-selectable main scan, AJV gate, fingerprint suppression, appliability dry-run gate with replace-all hunks, world-level legibility gate and one reface attempt, question-before-scan, rotating slow-layer claim-drift, local date boundaries, taste distillation, and State Diff); `console/` (catch-up, five-part card, State Diff, Metrics, a/p/r, human correction panel, ask-one-question, decision notes, draft-loss guards, atomic execution receipts, four-second owner undo plus authorized-fix undo, wake-catchup); `launchd/` (three jobs plus white-glove preflight/install/uninstall); canonical `docs/`; macOS CI; native TypeScript tooling.
- **White-glove path (#28):** arbitrary git vault path, Unicode-safe filename scans, pre-clock current-Codex update/doctor gate, ChatGPT-plan primary auth with explicit API-key fallback, Plus-limit fail-safe before jobs load, unsupported-attachment consent count, real read-only smoke, cold-start cap of two cards, structure-neutral slow-layer fallback, validated plists, console health check, one-command uninstall, and operator/privacy runbooks.
- **English-first switch (#29):** new product surfaces are English; evidence quotes and vault edits preserve source language; English ledger-jargon gates cover card faces and future Taste Rules; pre-switch metrics remain in place as a different experimental condition.
- **Not built:** cross-time Reflection gate, Twin-aware correction invalidation, typed Twin effector transaction, projection compiler, and optional mailbox. Legacy gaps such as Taste confirmation remain deferred unless they serve the new slices.
- **Current acceptance work:** run M1 on the real Forme repository and one exported-notes mirror, close D2/D3 review, then build the M2 ContextPacket and Reflection quality gate.

## Common Commands

- `npm install` — install dependencies on first use.
- `npm test` — run all schema, runner, console, and launchd tests.
- `npm run validate` — validate every sample card and event with Forme's AJV gate.
- `npm run typecheck` — run `tsc --noEmit`.
- `npm run runtime:preflight` — initialize Codex App Server and verify an isolated authenticated OpenCode server without making a model call.
- `npm run twin:init -- --workspace <path> --name <name> --intent <text>` — connect one local project or notes mirror and create revision 1.
- `npm run twin:refresh -- --workspace <path>` — record meaningful source changes as a new Twin revision.
- `npm run twin:status -- --workspace <path>` — reconstruct the durable Now / What Changed / Next Move view without a runtime session.
- `npm run run:console -- --vault <v>` — start the decision console at `http://127.0.0.1:6180` (or use `FORME_VAULT`).
- `gh issue view 37` — read the active harness-first epic and implementation phase.

## Build Session Protocol

- Repo sessions build against `docs/PRODUCT.md`, `docs/STATUS.md`, and `docs/ROADMAP.md`. Escalate only choices that change the constitutional floor, 08-15 scope, privacy boundary, runtime first-class status, or public behavior.
- At the end of every session, update the related issue and `docs/STATUS.md` when implementation state changes.
- When architecture, schema, or interaction changes, update the corresponding `docs/` file before ending: `ARCHITECTURE.md` capabilities/boundaries, a new `DECISIONS.md` entry, and `SCHEMA.md` when the contract changes. Stale docs are a build failure (#7).
- Treat user source workspaces as read-only. Forme may write only inside the configured Forme-owned state root (currently `98_Forme/`) or through an explicitly authorized typed effector.
- Keep commits short and descriptive. The repo remains private until W6; public-release work has a separate checklist.

## Public Release Checklist (08-15)

- [x] Remove local absolute paths from this file; move product guidance into `docs/`.
- [ ] Rewrite README as the landing page and add Apache-2.0 LICENSE.
- [ ] Run a full privacy scan; no owner-vault personal information may appear beyond approved samples.
