# Product

- Status: owner-approved product frame plus owner-stated privacy-first,
  minimum-friction agency direction; R4 public/private Room correction
  approved, T2–T5 technical Owner review active
- Updated: 2026-07-27
- MVP complete: 2026-08-11
- Demo Day: 2026-08-12

## Highest vision

Forme extends an entity across four dimensions:

- **Continuity** — preserve intent and context across interruption, tools, and time.
- **Cognition** — notice change, tension, pattern, and unfinished possibility across time.
- **Agency** — extend judgment and action beyond the owner's immediate
  attention through explicit, bounded, revocable delegation.
- **Presence** — project a current, bounded part of the entity when the owner is not present.

Its deepest claim is not an AI clone. It is that human agency need not exist only while a person remembers, focuses, and is online.

Long-term forms may include person, project, and team Twins; specialized cognitive agents; taste and incubation; role-scoped projections; and Twin-to-Twin interaction. These are a horizon, not the August MVP scope.

## Constitutional floor

- **Authorship:** Forme may model and assist an owner; it may not claim final authority over the owner's meaning or identity.
- **Legibility:** greater autonomy must not reduce the ability to understand, correct, inspect, and reverse behavior.
- **Reversibility:** meaningful effects preserve provenance, receipts, and rollback where feasible.
- **Non-finality:** learned claims remain scoped, evidence-backed, uncertain, revisable, and able to age out.
- **Controlled projection:** private existence never implies permission to publish.
- **Privacy-first agency:** once a source/provider/audience domain is explicitly
  admitted, Twin and Agent should receive the broadest useful freedom inside it
  instead of asking for approval at every mechanical step.
- **Minimum necessary friction:** explicit authorization is required to
  establish or widen a boundary; work already covered by it is
  review-by-exception.

The current recommended interpretation is **agency-forward and
boundary-strict**, not approval-forward and not agent-unbounded. “Narrowly
delegated” means the target, audience, identity, effect class, budget, and
revocation boundary are exact; it does not mean the Agent must receive only one
tiny verb or one click at a time. Confidence, owner-history similarity, account
login, filesystem access, or authority in another Room never creates
permission by itself.

[`AGENCY-TRUST.md`](./AGENCY-TRUST.md) records the Owner's stated direction and
proposes companion authorship/consequence guards plus a no-self-expansion
meta-rule. That formalization and its exact runtime mechanics still require
Owner review and a Control Packet. [`STEWARDSHIP.md`](./STEWARDSHIP.md) remains
a proposal for Entropy Reduction as the metabolism that keeps all four
dimensions coherent.

## MVP vision

The MVP is one Living Project Twin for one real project:

> It remembers where the project is, notices what it is becoming, acts once within explicit and reversible trust, and produces one controlled collaborator projection.

The demo is one causal story, not four feature demos:

1. **Continuity** — return after interruption and recover Now, What Changed, unresolved state, and Next Move.
2. **Cognition** — surface one non-trivial cross-time reflection with evidence and uncertainty.
3. **Bounded Agency** — accept an owner correction, then propose and execute one approved reversible action against the corrected state.
4. **Controlled Presence** — compile a current collaborator projection from an explicit allowlist only.

Without Continuity, Forme is a disposable chatbot. Without Cognition, it is a project summary. Without Agency, it is an observer. Without Presence, it remains a private copilot. Each dimension must appear once; depth is cut before a dimension is removed.

## Scope

### P0 — committed demo core

- one local project as the canonical demo input;
- durable project state that survives process and runtime loss;
- a legible Now / What Changed / Next Move view;
- one evidence-backed cross-time reflection;
- owner correction and stale-output invalidation;
- one approved, typed, deterministic, reversible action;
- one required public versioned allowlist-only Projection Capsule and one
  separately approved private fixture Capsule over the same Twin;
- one publicly viewable, curator-admitted Forme Third Place containing the
  Forme Project Room;
- one public 24-hour/one-interaction Guest knock, one grant-gated Private Room
  path over the same Twin, one minimal Agent Guest capsule/request path, and
  one owner-reviewed Response or Resonance;
- invite-only durable controller identity with public reading that requires no
  account;
- one real Codex execution path;
- a repeatable demo from a clean checkout with a privacy check.

### P1 — optional, admitted only when P0 is green

- bounded `Exported Notes → Personal Facet Bootstrap`, not general notes
  ingestion;
- a real OpenCode execution path beyond the compatibility boundary;
- background or push-triggered wake/catch-up beyond Agent-invoked typed sync;
- local HTML Twin view;
- first non-owner installation rehearsal;
- first additional curator-invited Third Place resident after the required
  public-resident P0 is green.

### P2 — after Demo Day

- generalized mailbox and longer-lived Relationship Capsules;
- Agent-to-Agent or Twin-to-Twin interaction beyond the bounded R4 exchange;
- open-ended interactive projection Q&A;
- native Apple Notes integration;
- whole-vault or whole-digital-life ingestion;
- public self-service Room creation, discovery, multiple workspaces, general
  automation, or a plugin marketplace.

## Owner-approved R4 product target — T1 closed, T2–T5 active

On 2026-07-25 the owner approved a more social R4 target. One curated,
publicly viewable **Forme Third Place** contains the Forme Project Room as its
first and only required resident. A Manual Guest can browse and leave bounded
context or a signal. An Agent Guest can fetch the public capsule, reason at its
own edge, and optionally submit a guest-approved capsule. Questions or
Resonance Requests requiring deeper context return asynchronously to the local
Forme Agent and owner, then may come back as a reviewed Response Capsule.

The owner controls the projection's exact content and disclosure policy; the
Third Place curator separately controls admission to the shared venue.
Accounts prove control and attribution, not personhood or complete identity.
Public reading requires no account. Durable controllers are invite-only. The
current pending T2
recommendation interprets their bounded Agent credentials as exact,
Room-scoped, revocable authority that is useful and persistent inside its
approved boundary rather than reduced to repeated per-action approval.

The 2026-07-26 correction makes the public venue approachable rather than only
viewable. While the Owner selects `public_single`, an anonymous bearer
capability may submit one private request within 24 hours. Continued
interaction requires a new Owner short pass. A true Private Room is a different
Room with a separately approved Projection; it never enters Third Place and
requires an Owner Grant for both reading and interaction. Public
request/response bodies do not become comments, and unlisted public content
does not become private.

The server target is identity/control, registry, curation listing,
deterministic rendering, signal queueing, and response relay—not AI
conversational authority. The product target is approved, but implementation
remains unauthorized. The Owner first reviews
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md); agents then
reconcile those decisions into a new exact
[`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md).
Exact machine schemas and migrations remain a separately hashed pre-write
manifest; production deployment, external writes, and spend remain a separate
Production Deployment & Provisioning Grant.
The versioned static projection remains the schedule fallback floor.

The agency-first recalibration of the still-open R4 technical cards is recorded
in [`R4-AGENCY-FIRST-RECALIBRATION.md`](./R4-AGENCY-FIRST-RECALIBRATION.md).
It does not reopen the approved T1 public/private topology or authorize R4
implementation.

## Golden acceptance story

One real workspace must complete this sequence without hidden manual reconstruction:

1. Connect the project and establish explicit source boundaries.
2. Build durable state and reconstruct it after runtime/process loss.
3. Show current intent, meaningful change, unresolved state, and next move.
4. Produce one reflection that depends on evidence from multiple time points.
5. Accept an owner correction and invalidate output based on the old interpretation.
6. Propose one bounded effect against the corrected revision.
7. Approve, execute, receipt, verify, and roll back that effect.
8. Compile one versioned projection from allowed claims only; a private canary
   must remain absent.
9. Publish the exact approved capsule into the Forme Project Room and admit the
   Room to the curated Third Place through a separate curator decision.
10. Receive one bounded public Manual or Agent Guest knock tied to the exact
    visible capsule version, without requiring a prior Owner invite.
11. Return one owner-reviewed Response or Resonance without exposing private
    source, confusing agent attribution, or bypassing revocation and retention
    controls.
12. Offer one bounded continuation through the private reply capability and
    prove that a separately approved Private Room remains unreadable without
    its exact Owner Grant.

The MVP fails if these steps feel like unrelated AI features instead of one project becoming continuous, understandable, actionable, and projectable.
