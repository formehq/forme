# Project checkpoint — 2026-09-17

## Status

Forme is **paused for assumption review**. This is a deliberate checkpoint,
not a release, a completion claim or an abandonment of the project.

No R4 or R5 implementation is active. Historical plans, approvals, envelopes,
packets and successful runs do not authorize another runtime, provider,
server, publication, deployment or external effect.

## Why the project paused

The implementation produced useful evidence, but it also challenged a core
assumption behind the Living Project Twin: that an LLM can safely help maintain
durable project judgment through repeated summarization and context reuse.

Early summaries stayed close to Owner judgment. Across repeated synthesis and
context compaction, however, small interpretive differences became larger and
the boundary between source, observation, inference and Owner judgment became
less reliable. A coherent compacted context could preserve the model's own
earlier interpretation while drifting from the original meaning.

The central lesson is:

> Long context is not long-term judgment. AI-generated judgments must not
> recursively canonize themselves.

This is potentially an architectural problem, not a prompt or storage-size
problem. Continuing R4 would create more implementation momentum on top of an
unsettled cognitive foundation.

## Evidence that remains valid

The pause does not erase what the project actually demonstrated:

- project state survived real interruption and restart;
- source-aware reflection, Owner correction and stale-output invalidation were
  exercised;
- one bounded action used an explicit plan, approval, deterministic execution,
  receipt and rollback evidence;
- local and isolated R4 experiments kept public Projection, Guest interaction
  and private Owner context as distinct authorities;
- the deterministic Room and persistence boundaries survived synthetic
  lifecycle, restart, retry and exact-owned cleanup tests;
- one fresh Codex session produced a transient candidate without receiving
  publication authority;
- exact Response delivery crossed local, HTTP and live-loopback boundaries in
  staged technical proofs.

These are historical experimental results. They do not establish that the
current Living Project Twin architecture, MVP causal story or R4 product
direction should continue unchanged.

## Assumptions now under review

1. **Durable judgment** — whether AI should maintain a long-lived judgment
   list at all, and which judgments may enter it.
2. **Memory admission** — how evidence, observations, candidate interpretations,
   Owner-authored judgments and task-specific context must be separated.
3. **Context compilation** — whether a Twin should be a canonical persistent
   self or a bounded view compiled from reliable sources for a current task.
4. **Compaction drift** — how recursive summarization and context compaction
   change meaning across time, even when each local step appears reasonable.
5. **Living Project Twin** — whether Continuity, Cognition, Agency and Presence
   still form the right single product object.
6. **Social Presence** — whether the Room/Projection direction answers a real
   need, and whether it was attempted before the underlying Twin was stable.

## Learning provisionally retained

Two principles remain useful working hypotheses while the larger product is
reviewed:

- **Agency is boundary, not steps.** Humans define the outcome, information
  perimeter, audience, consequence, budget and revocation path. Covered
  mechanical work should not require ceremonial approval at every step.
- **Presence is projection, not impersonation.** A project may be encounterable
  through an explicitly selected projection without exposing its private
  context or giving an AI authority to turn a draft into the Owner's promise.

These principles remain subject to the same review as the rest of the product.

## Last implementation boundary

- Canonical `main` before this checkpoint includes PRs #78–#84 at
  `a13cdcab8559b442c24f3cab248da00661b9e555`.
- #67 and #68 reached their historical Owner-acceptance conditions.
- #69 remained incomplete: PR #85 proved a live loopback Response checkpoint,
  but the durable Public Core/PostgreSQL Response path was not completed.
- #70 and R4 Owner Experience Acceptance were not completed.
- R4 Controlled Presence was therefore never accepted as a complete product
  outcome, and R5 did not begin.

## Repository and operational freeze

The pause cleanup preserves experiment heads under annotated tags in
`checkpoint/2026-09-17/*`. Previously uncommitted root, server-readiness and
Sharing states were captured as tagged archive commits before their worktrees
were removed.

Historical Gate packets, manifests, reviews and exact evidence remain in their
existing paths because some are frozen fixtures used by audits. Their presence
does not make them current authority.

At the checkpoint there is no active Forme runtime, Docker container, Docker
network, Docker volume, staging campaign, provider grant, deployment,
publication or public-traffic authority.

## Conditions for resuming product development

Do not resume from #69 or #70 by default. Before further product implementation:

1. review the original Highest Vision and identify which claims still feel
   true without reference to the existing roadmap;
2. define an explicit model for source, evidence, observation, candidate
   interpretation, Owner judgment and working context;
3. decide what may become durable, who or what may promote it, how it ages and
   how it is invalidated;
4. run focused experiments on recursive judgment drift and context compaction;
5. decide whether the Twin is persistent canonical state, a compiled view, or
   another product shape;
6. only then reconsider Agency, Social Presence, the MVP and a new roadmap.

Resumption requires an explicit Owner decision that states the revised
assumptions and the next learning objective. Old issue order and historical
approval are not a restart mechanism.

