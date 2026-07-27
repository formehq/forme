# R4 Forme Room experience and protocol brief v0.4

- Status: **owner-approved product foundation; public/private Room correction
  approved; T2–T5 Technical Owner Review active**
- Updated: 2026-07-26
- Owner approval: **2026-07-25 — five revised R4 product decisions; 2026-07-26 —
  public encounter + Private Room correction**
- Working experience names: **Forme Room**, **Projection Capsule**, **Signal Box**, **Resonance**
- Active issue: [#52](https://github.com/formehq/forme/issues/52)
- Owner-approved companion decision brief:
  [`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md)
- Technical Owner review:
  [`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md)

## What changed from v0.1

The first proposal placed a bounded answering agent on the server. The owner's system map corrects that assumption:

- the hosted Projection Capsule is intentionally a shallow, immutable snapshot;
- the server does not run an LLM or answer as the owner;
- an Agent Guest brings its own agent and reasons locally from the public capsule;
- a Manual Guest reads the room and submits a request through the website;
- questions that exceed the capsule become asynchronous signals to the private local Twin and owner;
- deeper responses return as reviewed, versioned capsules rather than through a live server-to-local tunnel.

This correction now forms part of the owner-approved R4 product target. It
supersedes the v0.1 server-agent assumption but does not authorize R4
implementation.

The Owner added a second correction on 2026-07-26:

- a Third Place Room is publicly readable and may accept one bounded public
  knock per anonymous bearer capability/session;
- the request and response remain private;
- continued interaction requires a new Owner short pass;
- a real Private Room has a different Room ID and separately approved
  Projection, and requires an Owner Grant for reading and interaction;
- unlisted is a public discovery state, not a substitute for privacy.

## Revised user outcome

One real Living Project Twin can publish a current, bounded presence in a clean hosted room. A visitor can understand what the project is becoming, bring their own context, and discover where a useful interaction might begin.

The room can support two kinds of visitor:

- a **Manual Guest** reads the public room and may use one public encounter to
  leave a structured question, Seed, or introduction;
- an **Agent Guest** uses its own agent to fetch the public capsule, reason locally, and submit a deeper request only when the capsule is insufficient.

The owner later receives deeper requests in the local Forme environment. The
local Forme Agent may prepare a draft only from the exact Owner-selected,
manifest-reviewed subset of local Twin context and allowlisted evidence, with
no ambient repo access. The owner reviews, adjusts, approves, declines, or
parks it. The resulting response is published as a bounded Response Capsule.
The Owner may then offer a short continuation against the same public
Projection or a separately approved Private Room; it is never an automatic
access upgrade.

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
       └── immutable Projection Capsule ──> public Room + Third Place <──── public web / Guest Agent
                                      └──> Private Room <──────── Owner Grant

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

The Third Place is publicly viewable. The first interacting guest and product
judge may be an owner-invited product or engineering collaborator, but their
first public knock does not technically require a prior interaction invite.
They do not need local Forme access. The first host is the real Forme project
Twin.

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
- **Knock once:** while the Owner has selected `public_single`, submit one
  private Interaction Request through a 24-hour one-use public encounter.
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

The server queues the request with its capsule version. The local Forme Agent
and owner later review it. An approved answer returns as a **Response
Capsule**. Independently, the Owner may create a hosted `GrantOffer` shown
beside reply/status; it is not embedded in or dependent on the immutable
Response Capsule. The Guest sees and accepts it through the existing private
reply capability, which idempotently creates a new short pass without placing
a raw invite in the Response body. A richer Relationship Capsule remains later
scope. There is no permanent live tunnel into the private repo.

## Guest depth

Guest identity and interaction payload are separate contracts.

Room access is a third, independent contract:

- `third_place_public` uses public reading and optionally one public knock;
- `private_grant_only` uses a different Room ID and separately approved
  Projection, and returns no body without a valid Owner Grant;
- a short pass on a public Room extends private interaction only; it does not
  reveal a Private Room.

Public Rooms may use `public_single`, `invite_only`, or `closed`; Private Rooms
may use only `invite_only` or `closed`. Every transition away from
`public_single` permanently invalidates unused public capabilities. `closed`
pauses still-unexpired Owner Grants without extending them.

### Guest Capsule levels

- **G0 — anonymous/manual:** no reusable capsule; the visitor supplies only
  the current request, and the server returns a private reply capability after
  accepting it. The system can enforce one acceptance per bearer capability,
  not one per verified human.
- **G1 — lightweight guest:** display name or pseudonym, current focus, offer, seek, one open question, and retention consent.
- **G2 — agent projection:** a versioned capsule produced by any guest-side agent. It does not require Forme continuity, but it must declare source, scope, freshness, and consent.
- **Future — Forme projection:** a guest may explicitly provide an allowed capsule from their own Living Twin. This is not required for R4 P0.

### Interaction Request

An Interaction Request separately records:

- P0 request type: `ask`, `seed`, or `resonance`;
- host room and exact Projection Capsule version;
- guest level and optional Guest Capsule reference;
- bounded request body;
- fixed P0 response depth `owner_reviewed`;
- retention consent and creation time.

Reply route/capability, account/session/network metadata, and mutable lifecycle
state stay in the server envelope, never the immutable Interaction Request.
This prevents “who the guest is” from being confused with “what the guest asks
now.”

## Projection Capsule v0 product fields

- capsule ID, schema version, Room/entity identity, generated time, expiry, and
  predecessor;
- a Projection-scoped disclosure basis ID, never a private workspace ID,
  internal Twin revision, policy hash, or evidence ID;
- title, short description, and visual theme token;
- owner-approved Becoming, Now, Next Move, Tensions, and Open To claims;
- evidence class per claim: `owner_confirmed`, `inferred_allowed`, or
  `unresolved_allowed`;
- freshness and provenance class without private evidence bodies;
- supported interactions, allowed topics, explicit unavailable topics, and expected latency;
- agency boundary and non-commitment statement;
- server-derived lifecycle metadata, content hash, and privacy-safe publication
  attestation.

Raw source bodies, private corrections, hidden owner notes, credentials, and unallowlisted claims cannot enter the capsule.
The full compiler and Owner-approval receipts remain local.

“Continuously updated” means the local agent may continually prepare a candidate. The server receives a new immutable version only after the owner or a separately approved publication policy admits it. The server never observes a mutable stream of the private Twin.

## Interaction contracts

### Public exploration and Agent Guest reasoning

The server returns exact capsule bytes and metadata. A Guest Agent may reason locally for its user, but its interpretation is not a statement by the host. Server responses contain no model-generated host judgment.

### Public knock and private continuation

When the Owner selects `public_single`, the server may issue one anonymous
capability bound to the exact current, fresh, curator-admitted public
Projection. It expires after 24 hours or with the Projection and can accept one
Interaction. Capability issuance and final submission both recheck admission,
freshness, Owner intake mode, and Room capacity. Requests and Responses remain
private.

The Owner may later create a `GrantOffer` bound to the accepted Interaction and
an exact target Room + Projection + preset. The Guest accepts through the
existing private reply capability. This creates a new Grant rather than
mutating the public encounter. It is a separate hosted object, at most one live
per Interaction in P0. Acceptance rechecks the offer, reply authority, exact
target lifecycle, and intake mode. Source deletion/revoke/retirement or target
successor/expiry/revoke/retirement invalidates it; exact unlist behavior remains
part of pending T4.

### Private Room

A `private_grant_only` Room has its own stable Room ID and separately
Owner-approved bounded Projection. It never enters Third Place. Both reading
and submitting require an active exact Room + Projection Grant; a direct URL
alone returns no body. `single_encounter` permits one accepted Interaction
within 24 hours, while `short_pass` permits at most three within an
Owner-selected 24 hours, three days, or seven days. All are capped by the
Projection lifecycle and permit at most one unresolved request at a time.

An Agent path requires `manual_plus_one_shot_agent`. Its 15-minute,
one-use derivative token binds the exact Room + Projection and permits only one
exact Projection read plus one Interaction create. It shares the Manual quota
and cannot read replies, delete, delegate again, or recover a Manual credential.

### Ask or request deeper information

If the public capsule is insufficient, the server validates and queues a typed Interaction Request. The local Signal Box binds it to its origin and capsule version. The local Forme Agent may consult private allowed context to draft a response; the owner decides whether and what to publish.

### Leave a Seed

The server stores a length-bounded, typed signal. The normative P0 transport
states proposed by the Technical Control Packet are `queued`, `imported`,
`parked`, `responded`, `declined`, `expired`, `origin_revoked`,
`room_retired`, and `interaction_deleted`. `imported` means only that the local
Signal Box durably received it. Admission into Twin meaning is a separate
local decision and is not a server lifecycle state.

### Find Resonance

Two useful depths exist, but only one is a Forme P0 feature:

- **guest-side shallow resonance:** a Guest-owned Agent may compare public host
  and guest capsules at its own edge. Forme permits this use of public data but
  does not build or endorse the inference;
- **host-reviewed deep resonance — P0:** a request enters the Signal Box, the
  local Forme Agent prepares a draft from explicitly allowed context, and the
  owner reviews the returned artifact.

The hosted server performs neither depth.

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
- the owner can revoke a Projection or Response and retire a Room;
- expiry and Twin/allowlist changes make old capsules visibly stale;
- no source write, external promise, autonomous later message, money, account action, or third-party tool authority;
- bounded input, rate limits, deletion, and basic abuse handling;
- guest consent and retention choice are explicit.

## Owner-approved P0 product walking slice — T1 closed, T2–T5 active

- one curated, publicly viewable Forme Third Place with the real Forme Project
  Room as its first and only required resident;
- one 24-hour/one-accepted-interaction public encounter while the Owner selects
  `public_single`;
- one separately identified `private_grant_only` Room path over the same Forme
  Twin, with its own approved Projection and Owner Grant;
- one accepted `GrantOffer` continuation or direct Owner invite fixture;
- one deterministic, versioned Projection Capsule compiled locally;
- one owner publication gate and separate curator admission gate;
- one deterministic registry, curation listing, and visual renderer with no
  server AI;
- one invite-only durable controller identity and narrowly delegated Agent
  credential path; public reading requires no account;
- one Manual Guest public-knock path and one grant-gated private path;
- one Agent Guest API path for fetching a capsule and submitting a request;
- one durable server Signal Queue and local Signal Box import;
- one owner-reviewed Response Capsule returned through the relay;
- one small Guest Capsule path;
- at most one approved Resonance path;
- Projection revocation, Room retirement, capsule expiry, stale-version
  behavior, and privacy-canary verification;
- one clean, creative responsive visual surface;
- repeatable deployment and a three-minute owner/collaborator demo.

## Explicit cuts

- no server-side LLM, synthetic owner answer, or generic chat runtime;
- no open social network, discovery feed, follower system, or multiple public rooms;
- no public sign-up, self-service Room creation, identity network, or custom
  password system beyond the one invite-only controller path;
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
4. a Manual Guest or Agent Guest can send one public insufficient-scope
   question as a typed private signal without a prior Owner invite;
5. the local Forme Agent prepares a private-context draft and the owner can adjust, approve, decline, or park it;
6. an approved Response Capsule reaches the right guest without exposing the private source;
7. the Owner can offer a short continuation, and the Guest can accept it through
   the reply capability without gaining any other Room or Projection;
8. a Private Room returns no Projection body and accepts no request without its
   exact Owner Grant, while that exact Grant successfully permits the bounded
   Projection read and one accepted request;
9. all parties can see which capsule versions and boundaries governed the exchange;
10. a stale, superseded, expired, or revoked capsule cannot masquerade as
   current, and a retired Room cannot remain listed;
11. the private canary and unallowlisted source never enter output.

The owner and collaborator must judge whether this feels like encountering and continuing a real project relationship rather than reading a summary, using email with decoration, or talking to a generic chatbot.

## Owner-approved product decisions and 2026-07-26 correction

1. **Hero and venue:** use one Hybrid Hero Encounter in one curated Forme
   Third Place, with the Forme Project Room as the first and only required
   resident.
2. **Guest and notes boundary:** keep Manual Guest as the universal path and
   Agent Guest as an optional edge-intelligent path. Accept a guest-approved
   capsule, but do not build P0 notes ingestion or a Guest Twin.
3. **Projection and curation:** publish only immutable owner-admitted capsule
   versions, then apply a separate curator admission gate before a Room appears
   in the Third Place.
4. **Identity:** use invite-only passwordless accounts for durable controllers,
   allow public reading, give agents narrowly delegated credentials, and keep
   account, entity, Room, capsule, agent, guest, and curator identity distinct.
   The original requirement for an invite or verified reply before every
   signal is superseded only for one bounded public first encounter.
5. **Topology and lifecycle:** keep intelligence at the owner-local and
   optional guest edges. The server provides only the minimum
   identity/control, registry, curation listing, deterministic rendering,
   queueing, relay, expiry, revocation, retention, attribution, abuse, and
   privacy controls required for one real encounter.

On 2026-07-26 the Owner approved one public/private access correction:

- Third Place public reading follows the admitted Projection lifecycle rather
  than a Guest TTL;
- one public encounter capability may accept one private request within 24
  hours; it is not verified human identity;
- Owner intake modes are `public_single`, `invite_only`, and `closed`;
- continuation requires a new short pass, delivered to anonymous Guests through
  an Interaction-bound Grant Offer and private reply capability;
- a true Private Room uses a different Room ID and Projection, never enters
  Third Place, and requires an Owner Grant to read or interact;
- `unlisted` is not a privacy state. Exact unlist effects on active Grants and
  Grant Offers remain in pending T4 rather than this approved T1 correction.

These decisions establish the product target only. The active
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md) closes the
remaining T2–T5 Owner-facing technical choices. Agents must then rewrite the
[`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md) for the
confirmed deployment target and Guest decision, re-audit it, and present a new
exact hash. Schema/migration and production deployment remain separate later
gates. No current document grants implementation authority.

## Product-expression questions that remain during technical review

- the first real visitor and exact on-screen Hybrid encounter;
- publication cadence and owner review policy;
- whether Mentor Lens becomes the first demo case;
- the exact creative visual language of the Third Place and Room.

T1 closes Guest ingress and Room exposure. T2–T5 close the remaining identity,
external visibility, lifecycle, retention, hosting-integration, and P0
Resonance answers. Product-expression questions may continue without weakening
those gates.
