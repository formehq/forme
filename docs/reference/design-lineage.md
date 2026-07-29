# Forme design lineage

- Status: reference only; not an implementation contract
- Updated: 2026-07-24
- Historical source: [`harness-first` design archive](https://github.com/formehq/forme/tree/harness-first)

This document preserves the important ideas that led to the current Living
Project Twin architecture without making the early brainstorm or its proposed
schemas authoritative.

## The shortest history

The design began with a broad question: what would an agent harness need to do
for a person or project to remain continuous, think across time, act with
earned trust, and remain present when the owner is absent?

The early exploration described many target effects and possible agents. Those
ideas later converged into the current four dimensions:

1. **Continuity** — preserve enough state to resume without reconstructing the
   project from a chat transcript.
2. **Cognition** — notice change, tension, pattern, and unfinished possibility
   across time.
3. **Agency** — turn judgment into bounded action without losing authorship or
   legibility.
4. **Presence** — expose a current, permissioned projection rather than a copy
   of the private owner or workspace.

The August MVP deliberately proves one narrow scene in each dimension. It does
not attempt to implement every agent or effect named in the original vision.

## Two layers that must not collapse

The lineage becomes easier to understand when split into two layers:

```text
mature harness runtime
model calls · sessions · tools · streaming · cancellation · permissions
                         ↓
Forme semantic spine
Twin · evidence · corrections · owner judgment · effects · receipts · projection
```

Codex or OpenCode can perform sophisticated work without Forme. Forme becomes
distinct where temporary runtime activity is admitted into a durable model of
what the entity currently means, what the owner has corrected, and what the
system is allowed to do or show.

The early Harness was imagined as a complete operational body, including
sessions, files, shell, tools, Skills, MCP, plugins, subagents, permissions,
and ongoing runtime interaction. During the rebuild, R2/R3 deliberately
narrowed the first proof to an exact packet, zero-tool pass and a deterministic
Forme effect. That narrowing proved visibility, admission, correction, and
receipts; it did not reject the Native Harness shape from the Highest Vision.

The Owner confirmed this lineage clarification on 2026-07-28. The current
authority is
[`../NATIVE-HARNESS-ARCHITECTURE.md`](../NATIVE-HARNESS-ARCHITECTURE.md):
Native Harness Workbench, Forme Semantic Spine, and Managed Privacy Run are
distinct roles, while NH1/NH2 remain open decisions. This reference records
history and grants no runtime or implementation authority.

## Specialized agents were cognitive organs

The brainstorm's “multi-agent” idea did not mean a collection of autonomous
services chatting with one another. It described specialized cognitive
responsibilities that share one underlying entity state:

| Cognitive organ | Intended responsibility | Current position |
| --- | --- | --- |
| Continuity | preserve current intent, interruption state, and restart context | R1 implemented and owner-accepted |
| Reflection | compare evidence across time and surface meaningful change | R2 implemented and owner-accepted |
| Judgment | reason about tradeoffs and propose a recommendation | partially exercised in R2/R3; accuracy remains bounded and revisable |
| Verification | check evidence, permissions, effects, and closure | cross-cutting in R1–R3 validation, receipts, and recovery |
| Stewardship | reduce entropy and maintain the workspace over time | product/architecture proposal; not active authority |
| Projection | compile a role-scoped, owner-admitted external view | R4 product gate; implementation not authorized |
| Incubation | keep unfinished ideas alive until new evidence makes them useful | highest-vision horizon |
| Timing | choose when an observation or possibility deserves attention | highest-vision horizon |

These may eventually become separate runtime passes or agents. They do not
need separate identities, state stores, or effect authority. All meaningful
actions still converge through one Forme-owned agency boundary.

## The ideas intentionally kept for later

### Incubation

Continuity prevents context from being lost. Incubation goes further: it keeps
an unresolved possibility alive without forcing premature closure. A future
implementation would need evidence that an idea became newly actionable,
not merely a reminder schedule.

### Timing

A useful agent must decide not only what is relevant but when interruption is
worth its cost. Event, state, pattern, and opportunity triggers were identified
as candidate inputs. No general Timing Engine belongs in the August MVP; the
restart moment is the one natural timing hook already in scope.

### Cognitive conflict

Continuity may prefer stability, Reflection may surface tension, Incubation may
prefer waiting, and Agency may prefer acting. The early design correctly
identified that these should not resolve conflict by majority vote or
unstructured agent conversation. A future design needs explicit arbitration,
evidence, confidence, consequence, and owner-escalation rules before the shared
agency boundary.

### One entity, several projections

The long-term vision permits different role-scoped views of the same private
Twin. A projection is not another canonical Twin and cannot silently gain more
truth or authority than the owner admitted. The R4 proposal explores only the
first bounded social surface.

## What the rebuild changed

The rebuild retained the product spine while rejecting premature architecture:

- it replaced the former fixed `98_Forme/` layout with a project-local,
  contract-driven Twin;
- it implemented one vertical slice at a time rather than the old broad M0–M5
  module plan;
- it made owner correction, stale-output invalidation, exact approval,
  deterministic effects, and recovery concrete before expanding autonomy;
- it selected Codex as the first live runtime while preserving an
  OpenCode-compatible boundary instead of forcing early parity;
- it moved server-side intelligence out of the current R4 proposal: the server
  is proposed as a registry, renderer, queue, and relay, while deeper judgment
  returns to the local Twin and owner.

## Source and promotion rules

The preserved source material includes the [raw brainstorm](https://github.com/formehq/forme/blob/harness-first/design/Forme%20Brainstorm%20copy.md),
early [requirements](https://github.com/formehq/forme/blob/harness-first/design/requirements-v1.md),
[functional decomposition](https://github.com/formehq/forme/blob/harness-first/design/functional-decomposition-v1.md),
and [architecture proposal](https://github.com/formehq/forme/blob/harness-first/design/harness-architecture-v1.md).

Use them to recover intent, questions, and alternatives. Do not copy an old
schema, date, permission, server topology, or module plan into implementation
without comparing it with `PRODUCT.md`, `CONTROL.md`, `ARCHITECTURE.md`, and
the active owner-approved Control Packet.
