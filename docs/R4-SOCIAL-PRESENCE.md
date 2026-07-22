# R4 Social Presence experience brief v0.1

- Status: **Owner Control Packet proposal — not approved or implemented**
- Updated: 2026-07-22
- Working experience names: **Forme Room**, **Twin Encounter**, **Resonance**
- Active issue: [#52](https://github.com/formehq/forme/issues/52)

## Revised user outcome

One real Living Project Twin can meet another person in a clean hosted room. The visitor can understand what the project is becoming, ask one bounded question, leave a useful signal, and optionally bring a small Guest Capsule to discover one meaningful connection. The owner can later receive that interaction without exposing the private workspace or silently turning the visitor's words into Twin truth.

This is a candidate expansion of the committed static-projection slice. It requires owner approval because it adds hosting, model, messaging, audience, persistence, and public-behavior boundaries.

## Product feeling

R4 should feel less like opening a generated project report and more like encountering a living but bounded presence.

```text
Enter
  → Discover what this Twin is becoming
  → Ask, leave a Seed, or bring a Guest Capsule
  → Receive a bounded answer or Resonance artifact
  → Leave a thread the owner can return to
```

The social loop is **Enter → Discover → Resonate → Leave a Seed → Return**.

The differentiator is relational surprise and continuity, not unrestricted chat or decorative animation.

## First audience

The recommended first audience is one owner-invited product or engineering collaborator who does not need local Forme access. The first host is the real Forme project Twin.

The collaborator should be able to answer within three minutes:

- What is Forme trying to become?
- Where is the project now?
- What tension or open question matters?
- Where could I contribute, respond, or continue the relationship?
- What has the Twin not been authorized to say or do?

## First experience

### 1. Meet the Twin

The room opens on a small living field rather than a dashboard. Its primary objects are:

- **Becoming:** the current direction in plain language;
- **Now:** current state and next move;
- **Tensions:** one to three unresolved but shareable questions;
- **Open to:** what kinds of ideas, collaboration, or help are welcome;
- **Boundary:** what remains owner-held and what this presence cannot commit to;
- **Pulse:** projection version, freshness, and a quiet provenance affordance.

### 2. Choose an interaction

- **Ask:** ask a question that can be answered from the published capsule.
- **Leave a Seed:** submit an idea, opportunity, challenge, offer, or question for later owner/Twin review.
- **Find Resonance:** add a lightweight Guest Capsule or another Forme Projection Capsule and receive one shared thread, complement, tension, and suggested next conversation.

### 3. Take away an artifact

The result is a shareable **Resonance Card** or **Connection Thread**, not an endless transcript. It names the two inputs, the capsule versions, uncertainty, and what would require human follow-up.

### 4. Continue asynchronously

The visitor may leave the thread. The owner later sees it as an external signal with its origin and projection version. R4 may prepare a reply draft but may not send or promise on the owner's behalf.

## Guest Capsule

A visitor does not need to install Forme. A lightweight Guest Capsule may contain only:

- display name or pseudonym;
- current focus;
- what the visitor can offer;
- what the visitor is seeking;
- one open question;
- consent for this room and retention choice.

If the visitor already has Forme, the same shape may be compiled from that Twin's allowed projection scope. A Guest Capsule is not presented as a full Living Twin.

## Candidate system shape

```text
Private local workspace
  → Living Project Twin
  → owner-controlled projection allowlist
  → deterministic Projection Capsule compiler
  → publish exact version
  → hosted Forme Room
       ├─ read-only capsule Q&A
       ├─ Guest Capsule resonance
       └─ bounded external signal inbox
  → later owner/Twin review and optional reply
```

The server receives the compiled capsule, optional guest data, generated interaction artifacts, and messages. It receives no private source handle, local repo credential, `.forme/` history, ambient runtime session, or source-writing capability.

## Projection Capsule v0 candidate fields

- capsule ID, schema version, host workspace pseudonymous ID;
- exact base Twin revision and generated/expiry time;
- room identity, title, short description, and visual theme token;
- owner-approved Becoming, Now, Next Move, Tensions, and Open To claims;
- evidence class for each claim: `owner_confirmed`, `inferred_and_allowed`, or `unresolved_and_allowed`;
- freshness and provenance class without private evidence bodies;
- allowed question topics and explicit unavailable topics;
- agency boundary and non-commitment statement;
- revocation/version predecessor metadata;
- content hash and compiler receipt.

Raw source bodies, private corrections, hidden owner notes, credentials, and unallowlisted claims cannot enter the capsule.

## Interaction contracts

### Ask

The server agent receives only the current capsule and the bounded question. It answers from that capsule, names uncertainty, and says when the requested information is unavailable. The answer does not become Twin state automatically.

### Leave a Seed

The server stores a length-bounded typed signal with origin, room, capsule version, creation time, and lifecycle state. Initial states are `received`, `reviewed`, `admitted`, `parked`, `replied`, `closed`, or `deleted`.

### Find Resonance

The server receives exactly two allowed capsules. It returns one structured artifact containing:

- one shared thread;
- one complement;
- one live tension or difference;
- one suggested next conversation;
- uncertainty and unavailable context;
- no commitment, ranking, or private inference about either person.

## Minimum invisible safety

Safety remains plumbing rather than the visual story:

- only an exact compiled capsule is publishable;
- the hosted runtime cannot read the local workspace or Twin store;
- a private canary and every unallowlisted claim remain absent;
- every answer and message binds to a visible capsule version;
- the owner can revoke a room or retire a capsule;
- expiry and Twin/allowlist changes make old capsules visibly stale;
- no source write, external promise, autonomous later message, money, account action, or third-party tool authority;
- bounded input size, rate limits, deletion, and basic abuse handling;
- guest consent and retention choice are explicit.

## Proposed P0 walking slice

- one hosted Forme Room for the real Forme project Twin;
- one deterministic, versioned Projection Capsule compiled locally;
- one invited visitor path with no install requirement;
- the three bounded interactions: Ask, Leave a Seed, and Find Resonance;
- one lightweight Guest Capsule path;
- one shareable Resonance artifact;
- one durable external-signal inbox and owner-visible lifecycle;
- room revocation, capsule expiry, stale-version behavior, and privacy-canary verification;
- one clean, creative responsive visual surface;
- repeatable deployment and three-minute owner/collaborator demo.

## Explicit cuts

- no open social network, discovery feed, follower system, or multiple public rooms;
- no full account system unless hosting makes one unavoidable;
- no server access to private Twin state or local sources;
- no free-form autonomous agent relationship or unlimited chat memory;
- no automatic reply after the owner leaves;
- no automatic admission of external messages into canonical Twin meaning;
- no source effects, GitHub effects, purchases, calendar actions, or commitments;
- no claim of full Twin-to-Twin protocol or identity verification;
- no OpenCode parity requirement for R4.

## Acceptance story

R4 passes product and technical review only if one real collaborator can:

1. open the hosted room without local installation;
2. understand the project direction, current state, one tension, and one contribution opening;
3. ask a bounded question and receive an answer derived only from the exact published capsule;
4. leave a Seed that appears as an untrusted external signal, not confirmed truth;
5. add a Guest Capsule and receive a useful Resonance artifact;
6. see which capsule version and boundary governed the interaction;
7. observe that a retired/stale capsule cannot masquerade as current;
8. confirm that the private canary and unallowlisted source never enter output.

The owner must judge whether the interaction feels like meeting a continuous project presence rather than reading a generated summary or talking to a generic chatbot.

## Recommended owner decisions

1. **Outcome and scope:** replace the static-only R4 experience with one hosted, interactive Forme Room while keeping one real host Twin and one three-minute encounter.
2. **Audience and interaction:** use one invited collaborator first; include Ask, Leave a Seed, and Find Resonance with a lightweight Guest Capsule.
3. **Projection contract:** publish only an exact, versioned Projection Capsule containing owner-allowed current claims, open questions, contribution openings, freshness, and agency boundary.
4. **Authority and data:** let the server answer and create interaction artifacts from published capsules and accept typed signals, but grant it no private-source, source-write, commitment, or autonomous-reply authority.
5. **Lifecycle and acceptance:** require expiry, revocation, stale-version handling, a private canary, a durable signal lifecycle, and one real collaborator's product judgment before R4 is Done.

Approval of all five recommendations authorizes preparation of the technical Control Packet and test plan. Because hosting, persistence, messaging, model access, and public behavior add separate stop-gate choices, it does not by itself authorize implementation until that technical packet names the exact data stores, APIs, credentials, retention, deployment topology, and failure behavior.
