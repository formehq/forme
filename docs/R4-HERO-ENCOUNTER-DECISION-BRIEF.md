# R4 Hero Encounter, Forme Third Place, and identity — Owner Decision Brief v0.1

- Status: **owner-approved product target; five-card Technical Owner Review active; no implementation authority**
- Updated: 2026-07-26
- Owner approval: **2026-07-25 — all five revised product decisions**
- Active gate: [#52](https://github.com/formehq/forme/issues/52)
- Companion: [`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md)
- Technical Owner review:
  [`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md)

## Decision in one minute

The owner-approved R4 experience is not only “ask a project” or “ask a mentor.”
It is:

> Enter a curated Forme Third Place, meet one bounded living presence, bring a
> small and intentional part of your own context, discover possible resonance,
> and request owner-reviewed depth when the public capsules are insufficient.

For the August P0:

- the **Forme project Twin** remains the one real host and acceptance spine;
- **Forme Third Place** is a publicly viewable but curator-admitted venue, with
  the Forme project as its first resident;
- a **Manual Guest** can browse and leave bounded context or a signal;
- an **Agent Guest** may use its own local agent and selected notes to prepare an
  optional Guest Capsule; Forme does not ingest the notes;
- the server runs no model and cannot infer resonance or speak for either side;
- a deeper Resonance or Response returns through the local Forme Agent and owner
  review;
- accounts prove control and attribution, not that an account is the person or
  that a projection is the whole person.

Owner approval authorizes preparation of a separate technical Control Packet.
It does not authorize accounts, hosting, publishing, note access, public
visibility, message storage, or implementation.

## Vision calibration

The highest vision extends an entity through Continuity, Cognition, Agency, and
Presence. Long-term entities may include people, projects, and teams. Its
deepest claim is about extending human agency beyond memory, attention, and
real-time presence—not creating an AI clone.

The August MVP intentionally proves that vision through one Living Project
Twin. This is a tractable complete embryo, not a claim that Forme may only
represent projects.

Three layers must remain separate:

```text
source container
repo · exported notes · files
        ↓ bounded observation and owner judgment

Twin entity
project · future person facet · future person/team
        ↓ explicit allowed projection scope

relationship projection
collaborator · mentor · public · agent-facing
```

Notes are evidence, not identity. A Personal Projection is a bounded,
owner-admitted facet, not a complete Person Twin.

## The three candidate hero experiences

| Candidate | Three-minute feeling | Strength | Main risk |
|---|---|---|---|
| **Project Ask** | Meet the Forme project and ask it or its owner a question | Strong continuity with R1–R3 | Can feel like a project page plus mailbox |
| **Personal Facet Bootstrap** | Use selected notes to receive a First Reading and publish a personal facet | Strongest immediate “this could be me” feeling | Requires a notes connector and person-claim boundaries; can collapse into an AI profile generator |
| **Hybrid Encounter — recommended** | Meet the Forme project, bring a bounded part of the guest's context, discover resonance, and request reviewed depth | Preserves the real Project Twin while revealing the Person ↔ Project horizon | Needs a small Guest Capsule and clear attribution without pretending the guest already has a Living Twin |

The Mentor Lens remains a valuable instance of a role-scoped personal
projection. It is not the definition of the Room or the required first P0 case.

## Owner-approved encounter shape — exact screens pending

### Before the encounter

The owner has already approved one immutable Forme Project Projection Capsule.
The curator has admitted its Room to the Third Place. No raw repo content,
private evidence, correction body, or local source handle is on the server.

### 00:00–00:30 — enter the Third Place

The guest reaches one clean public place:

> **Forme Third Place**
>
> A curated place to encounter what people, projects, and teams are becoming
> through bounded projections.

The first and initially only resident is the Forme Project Room. Publicly
viewable does not mean open self-publication: the owner controls the capsule and
the curator controls admission to the venue.

### 00:30–01:00 — meet the Forme project

The Room lets the guest understand:

- what Forme is becoming;
- where it is now and what changed;
- one or two live tensions;
- what kinds of contribution or conversation are welcome;
- what the public capsule can support;
- what still requires the owner;
- which exact capsule version and freshness boundary are visible.

It should feel like encountering a current entity, not reading marketing copy.

### 01:00–01:35 — bring a small part of yourself

A Manual Guest may provide a small current-context envelope:

- what I am working on or exploring;
- what I can offer or want help with;
- one question or possible connection.

An Agent Guest may instead use its own local agent to read the public host
capsule and a guest-approved selection of local notes. The guest-side agent may
prepare a versioned Guest Capsule containing only:

- current focus;
- one relevant thread;
- offer or seek;
- one open question;
- source scope, freshness, and consent.

The server receives the admitted Guest Capsule, never the source notes. The
guest does not need Forme continuity, and the capsule does not claim to be a
Person Twin.

### 01:35–02:10 — form a Resonance Request

The guest may submit:

- a question;
- a Seed such as an idea, opportunity, challenge, or introduction;
- a Resonance Request asking where the host and guest context may usefully
  meet.

If a Guest Agent makes a shallow comparison locally, it must be attributed as
the guest agent's interpretation. The server cannot generate, rank, or endorse
the result.

When owner-side depth is requested, the server only validates and queues the
request against the exact host and optional guest capsule versions.

### 02:10–02:45 — return to the living Twin

The local Signal Box receives the request. Nothing active is included
automatically. The owner first approves a manifest naming the exact Owner Frame
fields, corrected Reflections, and allowlisted evidence coordinates that the
local Forme Agent may use to prepare:

- the strongest shared thread;
- one productive difference rather than forced similarity;
- a possible next interaction;
- missing context and uncertainty;
- a response draft whose outgoing content is explicit.

The owner may adjust, approve, decline, park, or request more context. If the
guest selected `allow_owner_local_ai`, the exact bounded, manifest-reviewed
packet—including any selected private evidence—is sent to OpenAI through the
owner's existing local Codex authentication. It is never sent to the Forme
hosted server or published. Unselected private evidence remains local. With
`manual_owner_only`, no guest or private context is sent to OpenAI and the
owner may still write a manual response.

### 02:45–03:00 — receive owner-reviewed depth

The guest receives a Response Capsule or Resonance artifact that clearly says:

- what came from public capsule comparison;
- what was drafted through the host's local Twin;
- what the owner reviewed and approved;
- which versions governed the exchange;
- what remains non-committal or still requires the people involved.

This is the first small experience of two bounded presences meeting without
claiming full Twin-to-Twin federation.

## Forme Third Place

### Product role

The Third Place is a shared venue over Rooms. It is not another Twin and it
does not merge the residents into one canonical state.

```text
private local Twin
  → owner-approved Projection Capsule
  → owner-controlled Room
  → curator admission
  → Forme Third Place
  → public visitor or Agent Guest
```

The Third Place may:

- present admitted Rooms and their current public capsule metadata;
- show who or what the projection represents and its declared scope;
- route a visitor into a Room;
- preserve listing, unlisting, and curation attribution;
- support the same bounded signal route as the Room.

It may not:

- read a private Twin or source workspace;
- edit an owner's capsule;
- infer who a person “really is”;
- run server AI or generate resident answers;
- automatically admit a Room because its capsule is technically valid;
- become a feed, ranking system, follower graph, open directory, or Twin
  marketplace in P0.

### Two distinct approval gates

1. **Owner publication gate:** the Room owner approves the exact Projection
   Capsule that may be published.
2. **Curator admission gate:** the Third Place curator decides whether that Room
   and capsule are admitted to the shared venue.

The same human holds both roles in P0, but the two decisions remain distinct
and separately attributable.

The curator may admit, reject, or unlist a Room, but cannot rewrite its
projection. The owner may publish a successor, revoke a capsule, or retire the
Room. A new capsule does not silently inherit Third Place admission unless the
approved curation policy says so.

### P0 curation

- one public Third Place URL;
- one curator: Zayn;
- one initial resident: the Forme Project Room;
- no public sign-up or self-service listing;
- no additional resident in P0; a later resident would require a direct curator
  invitation and explicit admission;
- no admin dashboard is required if a small operator-controlled allowlist and
  durable curation receipt provide the same control.

“Open” therefore means publicly encounterable, not open submission or open
authority.

## Identity: how does Forme know who is who?

### Current implementation truth

There is currently no hosted Forme identity system:

- no human account or login;
- no public Room owner verification;
- no guest authentication;
- no agent credential;
- no pairing between a local Twin and a hosted Room;
- no real-world identity verification.

The local workspace and Twin have durable technical identity, while the R4
product target names pseudonymous host IDs and guest levels. Those identifiers
do not prove which human controls them. The product identity and access policy
is approved; exact provider, session/token, and pairing mechanics remain for the
technical Control Packet.

### Owner-approved identity model

“Who is who?” is not one field. Forme needs several identities with different
jobs:

| Layer | Question answered | Approved P0 product target | What it does not prove |
|---|---|---|---|
| **Human account** | Who may control, publish, curate, or receive private interaction state? | Invite-only authenticated account for curator and publishers; use a hosted passwordless method rather than building passwords | That the account is the complete person or that every display claim is true |
| **Twin/entity identity** | What continuous entity is Forme maintaining? | One stable Forme Project entity ID in P0 | Human legal identity or public permission |
| **Room identity** | Which social surface and relationship boundary is being visited? | One stable Room ID bound to the host entity and controller | Current capsule content |
| **Projection identity** | Which exact allowed public state was visible? | Immutable capsule ID, version, hash, Projection-scoped public basis ID, freshness, and revocation state | Access to the private Twin or its internal revision |
| **Agent identity** | Which client acted, for whom, and with what scope? | A scoped credential delegated by an authenticated account or guest session, with `acting_for` attribution | That the agent is the human or may use all account authority |
| **Guest identity** | Who sent this signal and how may a response return? | Public browse without login; interaction through an invite or verified reply session; public pseudonym remains optional | A reusable Person Twin |
| **Curator identity** | Who admitted or removed a Room from the Third Place? | The authenticated curator account plus a durable admission/unlisting receipt | Authority to edit the resident's capsule |

The central rule is:

> Account identity proves control and supports attribution. Twin identity
> preserves continuity. Projection identity proves the exact public version.
> None of them alone defines the person.

### Owner-approved P0 access policy

| Action | Approved P0 identity requirement |
|---|---|
| Browse the Third Place or public Room | No account |
| Fetch a public capsule | No account, with basic rate limits |
| Submit a Manual Guest signal | Curator/owner-issued invite or a verified reply session; a public profile is not required |
| Submit through an Agent Guest | A short-lived or narrowly scoped token derived from the same invite/session |
| Publish or revoke a Room capsule | Authenticated publisher account plus an explicitly paired local Forme workspace |
| Admit or unlist a Room in Third Place | Authenticated curator account |

The exact authentication provider and token format belong in the technical
Control Packet. The approved product target is an invite-only passwordless
account for durable operators, not a custom password database and not mandatory
accounts for readers.

### Local-to-hosted pairing

An account login alone should not let arbitrary software claim a local Twin.
The technical packet should evaluate a simple owner-visible pairing ceremony:

1. the authenticated owner creates or claims a Room;
2. the hosted service issues a one-time challenge;
3. the owner explicitly approves that challenge in the local Forme workspace;
4. the local client receives only the publish/signal scopes it needs;
5. either side can revoke the pairing.

This proves authorized control of the local-to-Room connection. It does not
claim legal or biometric identity.

## P0 and later boundaries

### P0 — owner-approved product target

- the existing Forme Project Twin remains the only required Living Twin;
- one curated public Third Place and one Forme Project Room;
- one owner-approved immutable Projection Capsule;
- public Manual Guest browsing;
- one bounded Manual Guest signal path;
- one Agent Guest public-capsule fetch and bounded request path;
- one optional guest-provided capsule accepted as input, without Forme reading
  the guest's notes;
- one owner-reviewed Response or Resonance artifact;
- one curator and invite-only publisher/control identity;
- expiry, revocation, stale-version behavior, private canary, retention choice,
  and durable request/response attribution.

### P1 stretch

- `Exported Notes → Personal Facet Bootstrap`;
- local manifest and fidelity warnings;
- one bounded notes facet rather than whole-vault discovery;
- First Reading, coarse owner correction, and Personal Projection Draft;
- the same Room and projection discipline, without claiming a mature Person
  Twin;
- the first additional curator-invited resident only after the single-Room P0
  is green.

### Explicitly not P0

- native Apple Notes access;
- whole-vault or whole-digital-life ingestion;
- full Person Twin or unified identity model across all roles;
- public self-service sign-up or publication;
- general Room creation, search, ranking, feeds, follows, comments, or DMs;
- verified real-world identity badges;
- autonomous server replies or server-side matching;
- automatic agent-to-agent federation;
- multiple curators, moderation organization, or a security platform.

## Owner-approved five product decisions

1. **Hero and venue — approved:** make the Hero Encounter a Hybrid
   meeting in one curated Forme Third Place; the Forme Project Room is the first
   and only required resident.
2. **Guest and notes boundary — approved:** keep Manual Guest as the
   universal path and Agent Guest as an optional edge-intelligent path. Accept a
   guest-approved capsule, but do not build P0 notes ingestion or a Guest Twin.
3. **Projection and curation — approved:** publish only immutable,
   owner-admitted capsule versions, then apply a separate curator admission gate
   before a Room appears in the Third Place.
4. **Identity — approved:** use invite-only, passwordless accounts for
   durable controllers; allow public reading; require an invite or verified
   reply session for signals; give agents narrowly delegated credentials.
   Account, entity, Room, capsule, agent, guest, and curator identity remain
   distinct.
5. **Topology and lifecycle — approved:** keep all intelligence at the
   owner-local and optional guest edges. The server provides identity/control,
   registry, curation listing, deterministic rendering, signal queueing, and
   response relay with the minimum expiry, revocation, retention, attribution,
   abuse, and privacy controls required for one real encounter.

These approved decisions revise the earlier R4 recommendations by adding the
Third Place, curator/owner double gate, layered identity, and optional Guest
Capsule. They do not change the immutable projection or no-server-AI
principles.

## Approval status and next gate

The 2026-07-25 approval establishes the product target. The Owner now reviews
[`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md). After its
five cards close, agents will reconcile the detailed
[`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md), which
must provide:

- capsule, identity, pairing, curation, request, response, and receipt
  semantics, with exact machine schemas held to a hashed pre-write subgate;
- authentication provider and session/token boundaries;
- hosted stores, retention, deletion, abuse limits, and failure behavior;
- local synchronization and offline/retry behavior;
- deployment topology, operational ownership, tests, and final P0 cuts.

This product brief and the active Owner review do not authorize
implementation. Only the later reconciled and separately approved packet may
authorize repository/fixture work; its hashed Schema & Migration Manifest
remains required before a real durable write, and its Production Deployment &
Provisioning Grant remains required before external messages, deployment,
public visibility, or spend.
