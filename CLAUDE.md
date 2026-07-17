# CLAUDE.md — Forme

## What This Project Is

**Forme** (Chinese product name TBD) is a local-first agent that turns drift in a user's knowledge base into one-decision cards: evidence, a minimal diff, and accept/park/reject. It learns the user's taste from each decision. Forme is the product form of CCS (Cognitive Continuity System); its core loops were validated through roughly six weeks of self-experimentation in the owner's vault.

**Current stage: W4 (Metrics + replay eval + first non-owner user + demo video).** Work is tracked in GitHub Issues and milestones (W1 through W6). This file is the starting point for every build session; reading it should provide enough context without old chat history.

## Canonical Documents

Strategic truth lives in the vault. Do not copy or rewrite these documents in this repo.

| Need | Read |
| --- | --- |
| Product definition (SSOT) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/02_Wiki/Projects/Cognitive Continuity System.md` |
| **MVP spec (what, exclusions, rationale)** | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/02_Wiki/Frameworks/CCS MVP Spec.md` |
| Roadmap (hard dates) | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/Forme Roadmap (Live).md` |
| Validation evidence | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/CCS Validation v2 - 2026-07-02.md` |
| Research evidence | `/Users/zaynw/Documents/Obsidian/Zayn-Knowledge-DB/03_Outputs/Reports/CCS MVP 调研 - 2026-07-01.md` |

Use the MVP spec for daily work. When documents conflict, the SSOT wins.

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
4. The UI owns no private truth. Every card has a Markdown mirror; the vault is the sole truth layer.
5. The card schema is envelope-shaped from day one (`origin/from/role/category`) for post-MVP agent relay.
6. Repetition approaches zero through deterministic fingerprints and hard filters, not LLM self-restraint.
7. **The agent is read-only and returns JSON only.** Forme's deterministic code performs every write, normalizing harness sandbox differences and keeping provenance auditable.

## Technical Baseline

- **Execution is a capability matrix (revised 2026-07-16):** the stable default is `codex-exec`; `codex-app-server` and `opencode` are working opt-in proposal runtimes behind `runtime/`. Codex provides an OS-enforced read-only sandbox; OpenCode provides application permission rules and therefore must not be represented as equivalent isolation. Both provide native structured output, while Forme still validates with its own AJV and performs every write. SKILL.md remains a portable instruction surface, not a runtime security boundary.
- **Provider policy facts (verified 2026-07-04):** Anthropic forbids product-side consumer OAuth, so no product path may depend on a user's Claude subscription. User-operated Claude Code plus SKILL.md is compliant. OpenAI has no third-party subscription OAuth plan; users authenticate their own Codex CLI, including official headless device auth. Runs stay incremental and API-key mode remains available.
- **Scheduling:** launchd for the first macOS release.
- **Data:** append-only `decisions.jsonl`, `Taste Rules.md`, and card JSON/Markdown mirrors.
- **License:** Apache-2.0 at public release.
- **Console:** native TypeScript plus `node:http`, with no heavy framework (see `docs/DECISIONS.md`).
- **Product language:** English-first from 2026-07-09 (#29), forward-only. New cards, console copy, State Diffs, and distilled Taste Rules are English. Historical cards, events, rules, design notes, quotes, paths, and target-file text are not translated. Localization is a W7+ question.

## Repository Status

- **Built:** `schema/` (card v0/v0.1/v0.2 and five event types); `runtime/` (Codex one-shot + App Server and OpenCode authenticated server adapters, capability matrix, deterministic protocol tests, live preflight); `runner/` (file-lock serialization, deterministic timestamp-freshness self-execution, runtime-selectable main scan, AJV gate, fingerprint suppression, appliability dry-run gate with replace-all hunks, world-level legibility gate and one reface attempt, question-before-scan, rotating slow-layer claim-drift, local date boundaries, taste distillation, and State Diff); `console/` (catch-up, five-part card, State Diff, Metrics, a/p/r, human correction panel, ask-one-question, decision notes, draft-loss guards, atomic execution receipts, four-second owner undo plus authorized-fix undo, wake-catchup); `launchd/` (three jobs plus white-glove preflight/install/uninstall); `docs/`; `design/`; native TypeScript tooling.
- **White-glove path (#28):** arbitrary git vault path, Unicode-safe filename scans, pre-clock current-Codex update/doctor gate, ChatGPT-plan primary auth with explicit API-key fallback, Plus-limit fail-safe before jobs load, unsupported-attachment consent count, real read-only smoke, cold-start cap of two cards, structure-neutral slow-layer fallback, validated plists, console health check, one-command uninstall, and operator/privacy runbooks.
- **English-first switch (#29):** new product surfaces are English; evidence quotes and vault edits preserve source language; English ledger-jargon gates cover card faces and future Taste Rules; pre-switch metrics remain in place as a different experimental condition.
- **Not built:** Taste confirmation panel/screen 4 (#20, W5), the complete acceptance-rate adaptive presentation throttle, un-park, and similar-history injection.
- **Current acceptance work:** clean-account/spare-Mac white-glove stopwatch, one authorized real API-key run, first naturally rotated claim-drift card, and Sunday State Diff.

## Common Commands

- `npm install` — install dependencies on first use.
- `npm test` — run all schema, runner, console, and launchd tests.
- `npm run validate` — validate every sample card and event with Forme's AJV gate.
- `npm run typecheck` — run `tsc --noEmit`.
- `npm run runtime:preflight` — initialize Codex App Server and verify an isolated authenticated OpenCode server without making a model call.
- `npm run run:console -- --vault <v>` — start the decision console at `http://127.0.0.1:6180` (or use `FORME_VAULT`).
- `gh issue list --milestone "W4 — Metrics + 回放 eval + 第一个非自己用户 + demo 视频"` — list current milestone work.

## Build Session Protocol

- Repo sessions build only. Strategic questions about positioning, scope, or priority become issues labeled `needs-vault-decision` and return to the Monday vault review.
- At the end of every session, update the related issue state and leave a concise progress comment for vault-side weekly review.
- When architecture, schema, or interaction changes, update the corresponding `docs/` file before ending: `ARCHITECTURE.md` capabilities/boundaries, a new `DECISIONS.md` entry, and `SCHEMA.md` when the contract changes. Stale docs are a build failure (#7).
- You may read any vault document. Do not edit the vault knowledge layer. The only exception is Forme runtime output under the vault's top-level `98_Forme/` directory. No other vault path may be written.
- Keep commits short and descriptive. The repo remains private until W6; public-release work has a separate checklist.

## Public Release Checklist (W6, around 08-18)

- [ ] Remove local absolute paths from this file; move public product guidance into `docs/`.
- [ ] Rewrite README as the landing page and add Apache-2.0 LICENSE.
- [ ] Run a full privacy scan; no owner-vault personal information may appear beyond approved samples.
