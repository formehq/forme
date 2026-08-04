# R4 agency-first recalibration v0.2

- Status: **P privacy-first human-boundary interpretation and T2 Room control
  contract Owner-approved on 2026-07-28; T1 stays approved; Native Harness
  roles plus NH1/NH2 Owner-approved on 2026-07-29; Fresh Native Response
  Session (Option 2B) selected as the R4 P0 direction on 2026-08-01 and its
  exact T3 contract Owner-approved on 2026-08-03; T4 public lifecycle contract
  Owner-approved on 2026-08-03; T5 notification-only email and continuation
  presets are fixed while its remaining terms and implementation remain
  unapproved**
- Updated: 2026-08-03
- Purpose: distinguish the authority Forme should grant now from useful
  long-term agency, without turning the August MVP into a policy-engine project

## One-sentence rule

> Protect the admitted human privacy boundary; inside it, give the Twin and
> Agent the broadest useful, observable, revocable freedom with the least
> necessary friction.

In practical terms, the Owner approves an **operating envelope**, not every API
call:

```text
Owner defines exact boundary
  → Agent operates freely inside it
  → every Forme-authoritative mutation is verified and receipted
  → Web shows state, scope, exceptions, stop/revoke, and undo where feasible
  → new boundary or material consequence returns to the Owner
```

## What the whole-R4 audit found

| R4 area | Earlier center of gravity | Agency-first correction | August P0 |
|---|---|---|---|
| T1 Guest continuity | short exact capabilities and no successor inheritance | keep the clear public/private perimeter; later allow owner-defined relationship envelopes across compatible successors | **Approved topology, clarified P0 surface.** One public knock; Owner-facing continuation presets of 24h/1, 3d/2, or 7d/3; exact Projection binding; familiarity is not Private Room authority |
| T2 Room control | paired Agent handles sync; most management requires a 15-minute one-use action approval | use a fixed standing exact per-Room `room_operator.v1` scope bundle for routine transport and deterministic lifecycle enforcement; Web is a supervisory cockpit | **Owner-approved.** Fixed 30-day, non-renewing, independently revocable binding; no dynamic policy/grant object |
| T3 response drafting | every draft requires Guest choice, Owner start, and exact manifest | approve one source/provider/capability perimeter, then let one fresh session dynamically find useful project context inside it | **Owner-approved exact contract.** One new/non-resumed session per Interaction, sanitized read-only clean-HEAD Forme snapshot + previewed typed body/path-free Twin orientation, bounded disclosed Codex → OpenAI transport, no other Guest/Room, writer, generic network, credential, mutation or publish authority, and exact Owner approval before T2 delivery; Managed exact-manifest mode moves to P1/future. This is design authority only, not implementation authority. |
| T4 lifecycle | every new Projection/Response is separately approved; successor never inherits | deterministic safety enforcement can run automatically; later allow policy-compatible content and successor publication | **Owner-approved exact contract.** Discovery, direct public reading, Grants, freshness, and emergency removal remain separate: unlist stops discovery/public knock but not valid exact Grants or Offers; stale is warning-only with no new Interaction; revoke/retire remove bodies and require tombstone-driven local purge; no successor inherits a Grant and every public successor needs new admission. This is design authority only, not implementation authority. |
| T5 async operation | Owner explicitly runs sync; no daemon or notification | the Agent's standard Room workflow invokes typed sync without asking the Owner; add one low-friction Guest notice without creating account/auth continuity | **Agent-triggered explicit sync plus manual recovery; optional exact-Interaction generic response-ready email.** Read-only CLI commands do not hide writes; email carries no body/reply secret and cannot recover authority |

This audit does not reopen T1 by implication. Any future successor-following
Grant, longer Agent Guest delegation, or standing Response policy requires an
explicit later decision.

## P0 standing Room Operator

The Owner-approved T2 contract encodes one fixed versioned scope bundle
on the local connector's exact RoomBinding. It creates no new policy table,
delegation chain, or custom-verb UI:

```text
room_operator.v1
  target: one exact RoomBinding + Room
  duration: 30 days from pairing, no auto-renew, or earlier revocation
  expansion: impossible from inside the grant
  evidence: mutation receipts + idempotency + owner-visible history
```

The preset may:

- inspect the exact Room, Projection, lifecycle, health, and receipts;
- pull accepted Interactions and lifecycle tombstones;
- acknowledge deterministic import/delivery and perform idempotent recovery;
- record a local deterministic purge receipt only after verifying the local
  body is absent; P0 does not add a hosted purge-ACK API;
- push only a Projection or Response carrying a still-current exact local Owner
  approval attestation;
- mark a Projection stale only as a deterministic attestation that the exact
  canonical local Twin HEAD is newer than its basis;
- perform typed `room sync` when the Agent's standard Room workflow requests
  it; read-only CLI commands never pull private bytes or create durable writes.

This is useful standing operational authority, not a Controller account. The
preset may not:

- pair a new Workspace or Room, discover other Rooms, or expand its own scope;
- create or bind another Room;
- widen an audience or change a public Room into a Private Room;
- issue a new Private Room/relationship Grant or broaden a Guest's authority;
- change intake mode, dispose/decline an Interaction, or publish a new
  human-attributed judgment;
- revoke Projection or Response content;
- create a new human-attributed claim, promise, or externally binding action;
- admit a Room into Third Place unless Curator authority was separately
  delegated;
- irreversibly retire a Room, erase durable evidence, or execute an arbitrary
  API/tool/code request.

For P0, a boundary action executes directly under the stepped-up
Owner/Curator Web session against the same versioned API. Handoff of an exact
boundary action back to an Agent through a `ControlActionGrant` is P1; it is
not a new P0 schema or recovery path.

## Why this is still bounded

The exact Room is the outer wall. Credentials do not inherit Controller
account power, discover sibling Rooms, or cross entities. Scope expansion
cannot be self-approved. Server-side authorization rechecks target, lifecycle,
expected version, idempotency, and current revocation on every mutation.
The raw credential belongs to the deterministic connector, not the model;
hosted receipts name the RoomBinding principal, while local receipts may also
name the initiating Agent run.

The Owner can always:

- inspect what the Agent may do and what it did;
- revoke the binding or let it expire;
- narrow it only by revoking and re-pairing the fixed bundle;
- see exceptions and failed verification;
- undo reversible effects or emergency-stop hosted exposure.

This is analogous to installing a narrowly scoped GitHub App on one repository:
the installation may perform useful recurring operations there, while adding
another repository or permission returns to the human.

## P0 hard boundaries

The August MVP still asks for explicit human judgment at these points:

- admitting a source/provider/audience outside the current envelope;
- every P0 Projection publication and every outward Response require a
  still-current exact Owner approval; policy-compatible successors are
  post-MVP;
- a new Room, Room binding, Private audience, Grant class, or scope expansion;
- Third Place admission when no separate standing Curator envelope exists;
- irreversible retire/delete or another materially high-impact effect;
- production deployment, public traffic, durable migration, external writes,
  and spend under the separate production grants.

These are meaningful human choices. Sync, deterministic ACK/retry/status, exact
Owner-approved transport, and deterministic staleness enforcement are not.

## What intentionally waits

These ideas fit the philosophy but should not enter the August critical path:

- a general visual policy/envelope builder;
- an optional exact-content Managed Privacy lane and user-facing trust tiers
  for sensitive personal/vault sources;
- policy-compatible automatic Projection successor publication or Curator
  re-admission;
- automatic outward Twin/Agent replies under a standing representation policy;
- longer-lived Guest Agent identity or reusable cross-session delegation;
- relationship Grants that follow compatible Projection successors;
- resident background daemon, push wakeup, live chat, or multi-Room automation;
- arbitrary user-defined Room Operator verbs.
- Agent handoff of boundary actions through a short `ControlActionGrant`.
- persistent-until-revoked RoomBinding lifetime or automatic renewal.
- standing safe-direction intake narrowing or internal signal parking. P0
  leaves both on the Web because their lifecycle semantics are not yet
  validated, not because privacy-first agency forbids them.

P0 proves one fixed standing Room workflow—typed sync → deterministic
ACK/stale → exact Owner-approved delivery → receipt—and one real binding revoke
path. The later product generalizes the same contract rather than replacing it.

## Decision effect

This document:

- records the Owner-approved P privacy-first/minimum-friction human-boundary
  model;
- records the approved T2 Room Operator application and NH1/NH2 Native Harness
  architecture, plus the selected Option 2B direction and Owner-approved exact
  T3 contract and Owner-approved exact T4 public lifecycle contract, while
  preserving T5 and later implementation gates;
- preserves the approved T1 product behavior and all existing R1–R3 evidence;
- grants documentation and later Packet-reconciliation authority only, with no
  R4 implementation, Fresh session, provider call, Guest data, credential,
  Room mutation, schema, deployment, public behavior, external message,
  durable production write, or spend.

The approved Native Harness decisions are recorded in
[`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md). T5's
notification/contact and continuation-preset inputs are fixed; its remaining
terms are now the current Owner decision surface in
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md). Once T5
closes, the detailed Technical Control Packet must encode all approved
boundaries, be independently audited, receive a new hash, and return for
separate Owner approval before implementation.
