# R4 Forme Room experience and protocol brief v0.2

- Status: **owner-authored architecture correction captured; product decisions still pending**
- Updated: 2026-07-23
- Working experience names: **Forme Room**, **Projection Capsule**, **Signal Box**, **Resonance**
- Active issue: [#52](https://github.com/formehq/forme/issues/52)

## What changed from v0.1

The first proposal placed a bounded answering agent on the server. The owner's system map corrects that assumption:

- the hosted Projection Capsule is intentionally a shallow, immutable snapshot;
- the server does not run an LLM or answer as the owner;
- an Agent Guest brings its own agent and reasons locally from the public capsule;
- a Manual Guest reads the room and submits a request through the website;
- questions that exceed the capsule become asynchronous signals to the private local Twin and owner;
- deeper responses return as reviewed, versioned capsules rather than through a live server-to-local tunnel.

This correction is a product and architecture proposal. It supersedes the v0.1 server-agent assumption but does not authorize R4 implementation.

## Revised user outcome

One real Living Project Twin can publish a current, bounded presence in a clean hosted room. A visitor can understand what the project is becoming, bring their own context, and discover where a useful interaction might begin.

The room can support two kinds of visitor:

- a **Manual Guest** reads the public room and leaves a structured question, Seed, or introduction;
- an **Agent Guest** uses its own agent to fetch the public capsule, reason locally, and submit a deeper request only when the capsule is insufficient.

The owner later receives deeper requests in the local Forme environment. The local Forme Agent may prepare a draft from the private repo and Twin history, but the owner reviews, adjusts, approves, declines, or parks it. The resulting response is published as a bounded Response Capsule.

## The simplest mental model

Forme Room is not a remote copy of the person or project. It is a reception room connected to the real local Twin by a reviewed mailbox.

```text
Owner Local                         Server                         Guest edge

private repo + Twin
       │
 local Forme Agent
       │ proposes
 owner publication gate
       │
       └── immutable Projection Capsule ──> registry + room <──── web / Guest Agent

local Signal Box <────────────────────── signal queue <────────── deeper request
       │
 local Agent drafts
 owner reviews
       │
       └──── reviewed Response Capsule ──> response relay ───────> guest
```

The server is a **Capsule Registry + deterministic Room Renderer + Signal Queue/Response Relay**. Intelligence lives at the owner-local edge and, optionally, the guest edge.

## Product feeling

R4 should feel less like opening a generated report and more like encountering a living but bounded presence:

```text
Enter
  → Orient to what this Twin is becoming
  → Discover a useful thread
  → Reason locally or leave a structured signal
  → Receive a reviewed response later when deeper context is needed
  → Continue the relationship
```

The differentiator is relational continuity and earned depth, not unrestricted real-time chat.

## First audience

The recommended first audience is one owner-invited product or engineering collaborator who does not need local Forme access. The first host is the real Forme project Twin.

Within three minutes, the collaborator should be able to answer:

- What is Forme trying to become?
- Where is the project now?
- What tension or open question matters?
- Where could I contribute, respond, or continue the relationship?
- What can this public capsule answer, and what requires the owner?

## First experience

### 1. Meet the Twin

The room opens on a small living field rather than a dashboard. Its primary objects are:

- **Becoming:** the current direction in plain language;
- **Now:** current state and next move;
- **Tensions:** one to three unresolved but shareable questions;
- **Open to:** welcome ideas, collaboration, or help;
- **Boundary:** unavailable topics and what remains owner-held;
- **Interaction:** which request types are accepted and expected reply latency;
- **Pulse:** capsule version, freshness, and quiet provenance.

The snapshot is shallow by design, but it must support four useful jobs: **orientation, discovery, routing, and boundary-setting**. It must not collapse into marketing copy.

### 2. Choose an interaction

- **Explore:** browse the published capsule and its open threads.
- **Ask:** ask a question. A Guest Agent may answer for its user from the public capsule; a manual or deeper question becomes an Interaction Request.
- **Leave a Seed:** submit an idea, opportunity, challenge, offer, or question for later local review.
- **Find Resonance:** compare a Guest Capsule with the host capsule, either shallowly on the guest's own agent or deeply through reviewed host-side processing.

### 3. Route insufficient context honestly

When a question exceeds the capsule, the server returns a deterministic boundary response rather than inventing an answer. It may offer:

- continue from the available public context;
- send a deeper request to the owner;
- attach or revise a Guest Capsule;
- stop without retaining the draft.

### 4. Continue asynchronously

The server queues the request with its capsule version. The local Forme Agent and owner later review it. An approved answer returns as a **Response Capsule** or, when both sides intentionally exchange more context, a richer **Relationship Capsule**. There is no permanent live tunnel into the private repo.

## Guest depth

Guest identity and interaction payload are separate contracts.

### Guest Capsule levels

- **G0 — anonymous/manual:** no reusable capsule; the visitor supplies only the current request and reply route.
- **G1 — lightweight guest:** display name or pseudonym, current focus, offer, seek, one open question, and retention consent.
- **G2 — agent projection:** a versioned capsule produced by any guest-side agent. It does not require Forme continuity, but it must declare source, scope, freshness, and consent.
- **Future — Forme projection:** a guest may explicitly provide an allowed capsule from their own Living Twin. This is not required for R4 P0.

### Interaction Request

An Interaction Request separately records:

- request type: `ask`, `seed`, `resonance`, or `disclosure_request`;
- host room and exact Projection Capsule version;
- guest level and optional Guest Capsule reference;
- bounded request body;
- requested response depth and reply route;
- retention consent, creation time, and lifecycle state.

This prevents “who the guest is” from being confused with “what the guest asks now.”

## Projection Capsule v0 candidate fields

- capsule ID, schema version, and pseudonymous host workspace ID;
- exact base Twin revision, generated time, expiry, and predecessor;
- room identity, title, short description, and visual theme token;
- owner-approved Becoming, Now, Next Move, Tensions, and Open To claims;
- evidence class per claim: `owner_confirmed`, `inferred_and_allowed`, or `unresolved_and_allowed`;
- freshness and provenance class without private evidence bodies;
- supported interactions, allowed topics, explicit unavailable topics, and expected latency;
- agency boundary and non-commitment statement;
- revocation metadata, content hash, and compiler receipt.

Raw source bodies, private corrections, hidden owner notes, credentials, and unallowlisted claims cannot enter the capsule.

“Continuously updated” means the local agent may continually prepare a candidate. The server receives a new immutable version only after the owner or a separately approved publication policy admits it. The server never observes a mutable stream of the private Twin.

## Interaction contracts

### Public exploration and Agent Guest reasoning

The server returns exact capsule bytes and metadata. A Guest Agent may reason locally for its user, but its interpretation is not a statement by the host. Server responses contain no model-generated host judgment.

### Ask or request deeper information

If the public capsule is insufficient, the server validates and queues a typed Interaction Request. The local Signal Box binds it to its origin and capsule version. The local Forme Agent may consult private allowed context to draft a response; the owner decides whether and what to publish.

### Leave a Seed

The server stores a length-bounded, typed signal. Initial lifecycle states are `received`, `reviewed`, `admitted`, `parked`, `replied`, `closed`, or `deleted`. Admission into the Twin is a separate local decision.

### Find Resonance

Two useful depths remain candidates:

- **guest-side shallow resonance:** the Guest Agent compares public host and guest capsules locally;
- **host-reviewed deep resonance:** a request enters the Signal Box, the local Forme Agent prepares a draft from explicitly allowed context, and the owner reviews the returned artifact.

R4 P0 still needs to decide whether one or both depths are included.

## Two-layer Signal Box

“Signal Box” has two connected but distinct parts:

1. the **server Signal Queue** is transport and lifecycle state only;
2. the **local Signal Box** is where private context, judgment, drafting, and owner review occur.

The server cannot promote a message into Twin truth, infer a private answer, or grant authority. A later local policy could pre-authorize narrow routine replies, but that would require its own scoped authority decision; it is not part of this proposal.

## Mentor Lens use case

A real candidate use case came from an INTDEV Studio partner who sometimes wants to know, during project work, “How would my mentor and studio lead judge this?”

Forme should frame this as a **role-scoped Judgment Projection**, not a clone or imitation. The mentor publishes only the judgment patterns they intentionally want collaborators to use. A useful response would contain:

1. the likely mentor lens;
2. the recommendation under current evidence;
3. the variables that could change it;
4. confidence, counterexamples, and missing context;
5. when to escalate to the real mentor.

The public capsule might support a preliminary guest-side reading. A decision needing project history or genuine mentor judgment becomes a reviewed deeper request. This is high-potential product evidence, but it is not yet an R4 P0 requirement.

## Minimum invisible safety

Safety remains plumbing rather than the visual story:

- only an exact compiled capsule is publishable;
- the server has no model, private workspace handle, Twin store, or source credential;
- a private canary and every unallowlisted claim remain absent;
- every request and response binds to visible capsule versions;
- the owner can revoke a room or retire a capsule;
- expiry and Twin/allowlist changes make old capsules visibly stale;
- no source write, external promise, autonomous later message, money, account action, or third-party tool authority;
- bounded input, rate limits, deletion, and basic abuse handling;
- guest consent and retention choice are explicit.

## Proposed P0 walking slice

- one hosted Forme Room for the real Forme project Twin;
- one deterministic, versioned Projection Capsule compiled locally;
- one deterministic registry and visual renderer with no server AI;
- one Manual Guest path for reading and submitting a signal;
- one Agent Guest API path for fetching a capsule and submitting a request;
- one durable server Signal Queue and local Signal Box import;
- one owner-reviewed Response Capsule returned through the relay;
- one small Guest Capsule path;
- at most one approved Resonance path;
- room revocation, capsule expiry, stale-version behavior, and privacy-canary verification;
- one clean, creative responsive visual surface;
- repeatable deployment and a three-minute owner/collaborator demo.

## Explicit cuts

- no server-side LLM, synthetic owner answer, or generic chat runtime;
- no open social network, discovery feed, follower system, or multiple public rooms;
- no full account system unless hosting makes one unavoidable;
- no server access to private Twin state or local sources;
- no permanent server-to-local tunnel or unlimited chat memory;
- no automatic admission of external messages into canonical Twin meaning;
- no source effects, GitHub effects, purchases, calendar actions, or commitments;
- no claim of a complete Twin-to-Twin protocol or verified identity;
- no OpenCode parity requirement for R4.

## Acceptance story

R4 passes product and technical review only if:

1. one real collaborator opens the hosted room without local Forme;
2. they understand the direction, current state, one tension, and one contribution opening;
3. an Agent Guest fetches the exact capsule and can reason locally from it;
4. a Manual Guest or Agent Guest can send an insufficient-scope question as a typed signal;
5. the local Forme Agent prepares a private-context draft and the owner can adjust, approve, decline, or park it;
6. an approved Response Capsule reaches the right guest without exposing the private source;
7. all parties can see which capsule versions and boundaries governed the exchange;
8. a stale or retired capsule cannot masquerade as current;
9. the private canary and unallowlisted source never enter output.

The owner and collaborator must judge whether this feels like encountering and continuing a real project relationship rather than reading a summary, using email with decoration, or talking to a generic chatbot.

## Recommended owner decisions

1. **Outcome and scope:** use one hosted Forme Room as a reception room and relay for one real host Twin and one three-minute encounter.
2. **Guest modes:** support both a Manual Guest website path and an Agent Guest API path; Forme continuity is optional for the guest.
3. **Projection contract:** publish only immutable, owner-admitted Projection Capsule versions; local continuous preparation does not imply live server synchronization.
4. **Authority and topology:** run no AI on the server; keep intelligence at the owner-local and optional guest edges, connected through a two-layer Signal Box and reviewed capsule exchange.
5. **Lifecycle and acceptance:** require expiry, revocation, stale-version handling, a private canary, durable request/response lifecycle, and one real collaborator's product judgment before R4 is Done.

Approval of all five recommendations would establish the product target only. A separate technical Control Packet must still name exact schemas, stores, APIs, authentication, retention, local synchronization, notification behavior, deployment topology, failure handling, tests, and P0 cuts before implementation.

## Open decisions to close next

- exact public Projection Capsule fields and useful depth;
- the single hero interaction and first real visitor;
- Manual Guest identity, reply, waiting, and notification behavior;
- which Resonance depth, if any, belongs in P0;
- publication cadence and owner review policy;
- authentication, retention, deletion, and abuse floor;
- local Signal Box synchronization and offline behavior;
- Response Capsule and Relationship Capsule contracts;
- whether Mentor Lens becomes the first demo case;
- deployment topology and operational ownership.
