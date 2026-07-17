# Forme product definition

- Status: canonical MVP frame
- Updated: 2026-07-16
- GitHub epic: [#37](https://github.com/formehq/forme/issues/37)

## What Forme is

Forme is a local-first **Living Project Twin**: durable project state that survives any one document, chat, runtime session, or model. It combines evidence, owner-confirmed meaning, revisable agent inference, bounded action, and controlled external projection.

Forme is not defined by a card interface, a project dashboard, or a generic agent loop. Those are implementation surfaces. The product boundary is the continuous, inspectable project entity.

## MVP claim

The one-month MVP must make one coherent claim believable:

> A project can maintain a continuous, evolving state beyond any single document or chat session. An agent can understand meaningful changes in what that project is becoming, act within explicit and reversible trust boundaries, and generate a controlled external projection when the owner is absent.

The demo proves four connected scenes:

1. **Continuity** — resume the project without manually reconstructing context.
2. **Cognition** — surface a cross-time interpretation with evidence, uncertainty, and correction.
3. **Bounded Agency** — execute one approved, typed, reversible action with a receipt.
4. **Controlled Presence** — compile a current external projection from an explicit allowlist only.

## Constitutional floor

- **Authorship:** Forme may model and assist the owner; it may not claim final authority over the owner's meaning or identity.
- **Legibility:** increasing autonomy must not reduce the ability to understand, correct, inspect, and reverse behavior.
- **Reversibility:** meaningful actions preserve provenance, terminal receipts, and rollback where feasible.
- **Non-finality:** learned claims and rules remain scoped, evidence-backed, revisable, and capable of aging out.
- **Controlled projection:** private existence never implies permission to publish.

## Hard boundaries

- Agent runtimes receive a scoped, read-only context and return schema-constrained proposals.
- Forme-owned deterministic code performs canonical writes.
- Canonical state and append-only events survive runtime and session loss.
- External projections compile from `Allowed Projection Scope`; the renderer has no private-source handle.
- Conservative actions are the default: no delete, merge, archive, publish, or external side effect without explicit authority.
- Product-facing Forme surfaces are English-first; source evidence remains in its original language.
- No product path depends on a user's Claude subscription.

## Runtime position

Codex and OpenCode are both first-class execution runtimes. Forme does not fork either runtime for the MVP and does not rebuild their generic agent loops.

The shared runtime boundary stays small, while adapters retain native capabilities. Codex's OS sandbox and OpenCode's provider/plugin/tool advantages must not be flattened into a misleading lowest-common-denominator abstraction.

Forme owns semantic continuity, evidence, corrections, authorization policy, effectors, receipts, and projections. Runtime sessions are disposable computation.

## Adopted MVP scope defaults

- Projection: deterministic static projection for 08-15; interactive Q&A is post-MVP.
- Twin View: Markdown is the daily driver; local HTML is optional only if the core loop is stable by 08-01; no MVP web application.
- Presence: preserve the mailbox protocol seam. Build an invite-only, owner-approved mailbox only after Continuity, Cognition, and Bounded Agency pass.
- First projection entity: a project collaboration projection, not a general personal profile.
- First non-owner pilot: validate installation/portability and a narrow continuity benefit; do not require the full Twin.

## One-month exclusions

- full-vault or whole-digital-life ingestion;
- a general scheduler or always-on local intelligence daemon;
- unrestricted native Apple Notes write-back;
- public agent discovery or autonomous agent-to-agent federation;
- unrestricted server-side tools or private-Twin access;
- a generic plugin/skill marketplace;
- forced Codex/OpenCode feature parity;
- an upstream runtime fork.

## Golden acceptance story

One real workspace must complete this sequence as one coherent experience:

1. Connect a local project or exported-notes mirror with a provenance manifest.
2. Build or restore a Project Twin at a wake/restart boundary.
3. Show Now, What Changed, and Next Move.
4. Surface one non-trivial cross-time reflection with evidence and uncertainty.
5. Accept an owner correction and invalidate stale dependent output.
6. Propose one bounded action against the corrected Twin revision.
7. Authorize and execute the action through deterministic code, record a receipt, and demonstrate rollback.
8. Compile a versioned projection from Allowed Projection Scope only.

If these steps feel like separate features rather than one entity maintaining continuity, the MVP has failed even if each component works independently.
