# Agency and human-boundary model v0.4

- Status: **privacy-first P human-boundary interpretation and T2 Room control
  envelope Owner-approved for R4 on 2026-07-28; NH1/NH2 Owner-approved on
  2026-07-29; Fresh Native Response Session (Option 2B) selected as the R4 P0
  direction on 2026-08-01 and its exact T3 contract Owner-approved on
  2026-08-03; T4 public lifecycle and the complete T5 async, notification,
  deletion, retention, and P0-cut contract Owner-approved on 2026-08-03;
  Packet v0.2 is reconciled and independently audited at
  `sha256:e417836b…adfff5`; implementation stays subject to separate exact
  Owner approval**
- Updated: 2026-08-03
- Purpose: maximize useful Twin/Agent agency inside human-defined boundaries
  while keeping privacy, authorship, consequence, and revocation under human
  control

## Product claim

The Owner's stated direction is **privacy-first agency with minimum
friction**:

> The human approves the boundary, not every step. Inside an explicit,
> inspectable, revocable boundary, the Twin and Agent should have the broadest
> useful freedom and the least necessary friction.

The **Privacy-first human boundary** section below is the Owner-approved P
formalization of that direction for R4. The exact R4 Room Operator envelope
identified below is separately Owner-approved T2; the Fresh Native Response
Session is Owner-approved T3; and the public lifecycle split is Owner-approved
T4. The async/notification/deletion/retention/P0-cut boundary is
Owner-approved T5. Other cognitive-mode, delegation, and long-term application
guidance remains proposed unless an exact mechanism is separately approved.
None of P/T2/T3/T4/T5 silently creates a credential or authorizes
implementation.

This is neither “ask before everything” nor “let the Agent do anything.”
Forme's job is to make the boundary real: exact scope, audience, attribution,
effect class, lifetime, receipts, exceptions, and a reliable stop/revocation
path, with undo where feasible.

“Narrow delegation” describes the **perimeter**, not a deliberately weak
interior. An exact Room, purpose, audience, and consequence class may contain
many useful routine verbs. A one-click grant for every mechanical action is
not safer when it merely trains the owner to approve prompts without thinking.

## Native capability is not Forme authority

A mature Codex/OpenCode workbench may have files, shell, tools, MCP, Skills,
plugins, subagents, and native permission prompts. Those capabilities are the
Agent's operational body; their existence does not establish a Forme source,
provider, audience, representation, consequence, or delegation envelope.

The Owner-confirmed architecture therefore separates:

- **Native Harness Workbench** — performs operational work inside an exact
  Owner-admitted runtime envelope;
- **Forme Semantic Spine** — owns Twin meaning, correction, policy, authority,
  receipts, and projection;
- **Fresh Native Response Session** — the selected R4 P0 response profile:
  one new transcript for one exact Interaction, with dynamic read/search only
  inside a sanitized read-only current Forme source snapshot plus typed
  body/path-free Twin orientation and no other Guest,
  writer, network tool, credential, Room or publish authority;
- **Managed Privacy Run** — uses an exact packet/no-ambient-tools profile when
  the product needs an exact manifest of Forme-selected private/workspace
  content. Runtime-owned instructions, schema, and metadata remain separately
  disclosed.

The Owner-approved NH1 contract makes the Native Harness Workbench the default
local carrier, with Codex as the P0 workbench and OpenCode as a first-class
architectural compatibility target whose live path remains P1. The approved
NH2 contract keeps two classes distinct:
ordinary Owner/Harness Workspace work inside a separately approved native
runtime envelope remains ordinary work. Its results may be offered and admitted
as evidence only through a separately approved source/observation contract;
they are not automatically ingested. Canonical meaning, correction, authority,
projection, representation, and claimed Forme effect guarantees continue
through typed Forme contracts. NH1/NH2 by themselves create no concrete
runtime envelope or capability. A Native Workbench never gains the T2 connector
credential, Guest content, or Room authority merely because it can read a
Workspace. The Owner-approved T3 contract permits a future explicit
`Prepare response` path to release one exact request to its bounded Fresh
Native Response Session after the later implementation gates close; it grants
no current capability, and the exception never grants ordinary sessions
Guest-inbox access. See
[`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md).

## Privacy-first human boundary

Privacy is the primary perimeter: once a source/provider/audience domain is
explicitly admitted, Forme should not re-ask about every file or operation
inside it. Two companion guards prevent the Agent from speaking for or
irreversibly binding the human without reintroducing routine approval
friction. A final meta-rule prevents an envelope from expanding itself.

The approved model requires explicit human authorization to **establish or
widen** an envelope across one of these boundaries:

1. **Information and audience — primary perimeter:** admitting a source zone,
   provider, person, Room, or disclosure policy not already covered by the
   current envelope.
2. **Authorship, identity, and commitment** — claiming to be the human,
   publishing a new human-attributed judgment, making a promise, entering an
   agreement, spending money, or otherwise binding the owner.
3. **Irreversible or materially high-impact consequence** — destructive
   deletion, non-recoverable publication, large blast radius, or an effect
   whose downside cannot be contained by the current envelope.
4. **Authority expansion — boundary-integrity rule:** adding a wider
   Workspace, Room, audience, Agent, capability class, budget, or delegation.
   Creating an attenuated derivative token is not expansion when the current
   envelope explicitly grants that delegation right; net-new or wider
   authority cannot authorize itself.

Other people's privacy and consent are part of the same perimeter.
Guest-provided content cannot be sent beyond the provider/disclosure terms
presented to and accepted by the Guest.

Inside that perimeter, routine covered work—including reversible operations
and explicitly predelegated deterministic safety enforcement—should be
**review by exception**: execute, verify, receipt, and notify; interrupt only
for boundary-relevant ambiguity, material drift, failed verification,
exhausted budget, changed audience, or a boundary crossing.

## Two independent questions

The system must answer these separately:

1. **Cognitive mode:** what kind of judgment is the Agent making?
2. **Effect envelope:** what information and actions has the human already
   admitted?

High confidence cannot create authority. Historical agreement cannot create
authority. Conversely, low-confidence exploration can have substantial agency
inside a cheap, isolated, time-bounded sandbox. Confidence changes how Forme
explains and escalates; it does not decide permission.

## Three cognitive modes

| Mode | When it applies | Agent behavior | Owner interaction | Typical effect |
|---|---|---|---|---|
| **Routine / Conservative** | a recent scoped rule or pattern fits and counterevidence is absent | carry out the known class of work, preserve receipts, surface exceptions | review anomalies or results | standing, low-risk, reversible maintenance |
| **Collaborative** | judgments compete or current owner intent materially matters | recommend, expose one to three editable judgments, name a genuinely blocking question | correct an assumption or set/adjust an envelope | work inside a current owner-confirmed direction |
| **Exploratory / Creative** | the system is searching for a new possibility | generate alternatives, prototypes, simulations, or experiments; retain learning | set the sandbox, budget, and escalation boundary; judge results | broad search agency with constrained outward effects |

Exploratory mode may have broad freedom over the **search space** while still
having no authority to expose private material or commit the owner.

## Authority states, not a mandatory maturity ladder

Forme recognizes these useful states per capability:

```text
observe
  → propose
  → shadow
  → owner-confirmed exact effect
  → standing delegated envelope
```

These are not a mandatory onboarding sequence. The owner may directly grant a
standing envelope when the boundary is already understood. Shadow history is
an optional calibration tool, not a prerequisite and never a silent promotion
mechanism.

- **Observe:** gather only admitted evidence.
- **Propose:** return a typed recommendation or experiment; create no effect.
- **Shadow:** record what the Agent would choose and compare it with the
  owner's actual decision.
- **Owner-confirmed exact effect:** execute one current exact plan.
- **Standing delegated envelope:** perform a useful class of operations until
  revocation, an optional explicit expiry, drift, budget exhaustion, or another
  escalation trigger.

R3 demonstrated one exact owner-confirmed effect. That was the smallest safe
MVP proof of deterministic effect, receipt, recovery, and rollback; it is not
Forme's constitutional ceiling for future agency.

## Agency envelope

A durable delegation should make these fields inspectable:

- exact Workspace/entity/Room and purpose;
- readable sources and provider visibility;
- audience and disclosure policy;
- allowed effect classes and safe-direction operations;
- authorship, representation, and commitment limits;
- maximum blast radius, cost, action count, and time budget;
- reversibility, verification, and rollback limits;
- lifetime—persistent-until-revoked or explicit expiry—plus pause and
  re-certification triggers;
- uncertainty, drift, counterexamples, and escalation policy;
- receipts, notifications, and owner-visible history;
- whether and how an Agent may create narrower derivative authority.

Unknown or stale boundary fields fail closed. Authority for one Room never
generalizes through an account, filesystem path, Git remote, current working
directory, model confidence, or a credential for another Room.

Within a valid envelope, the default is not “ask again.” The default is:

```text
act
  → verify
  → record receipt
  → inform or summarize
  → stop only on exception or boundary crossing
```

## Learning from owner history

Owner history is calibration evidence, not authorization:

```text
Agent shadow decision
  → Owner decision and optional reason
  → scoped comparison
  → candidate taste rule with counterexamples
  → Owner confirms, edits, or ignores the rule
  → optional delegated envelope
  → expiry, drift, disagreement, or consequence triggers review
```

- only real owner decisions, corrections, reversals, and reasons count as
  owner taste;
- Agent-authored events never become self-reinforcing taste evidence;
- sparse evidence produces a candidate, not a permanent preference;
- recency, negative examples, reversals, and changed context stay visible;
- a rule may age out, become dormant, narrow, or be revoked;
- agreement history may justify *suggesting* an envelope, but cannot create it.

## Owner interfaces

The owner surface should be a cockpit, not a queue of ceremonial approvals.

### Routine

Show what happened, why it fit the envelope, verification, remaining
budget/lifetime, and undo where feasible. Interrupt only on exception.

### Collaborative

Use the accepted R3-V2 pattern: one plain-language recommendation, one to three
editable judgments, progressive evidence, consequence preview, and one
blocking question only when a responsible recommendation is impossible. Let
the owner adjust a boundary or direction, then allow the Agent to carry the
mechanical work through.

### Exploratory

Show the question, sandbox, budget, stop condition, produced artifacts, and
what would require escalation. Review the portfolio and learning, not every
internal generation.

## R4 application

R4 keeps intelligence at the edges and runs no server AI. The hosted Forme
Room is an API-first control plane: shared state, permissions, queues,
lifecycle, receipts, and a human Web cockpit. It does not read the private
Twin or invent an Owner answer.

The Owner-approved T2 contract is a standing, revocable, exact per-Room
**Room Operator envelope** for routine transport and deterministic lifecycle
enforcement: one independently revocable binding per Room, valid for 30 days
without automatic renewal, with its raw credential held only by the
deterministic connector.
The Web surface supervises status, scope, exceptions, lifetime, and emergency
stop. It should not require the Owner to approve each sync, pull, ACK,
idempotent recovery, exact Owner-approved artifact push, or deterministic stale
attestation.

Explicit boundary authorization remains for a new Room or audience, scope
expansion, private context/provider visibility outside the current envelope,
human-attributed publication or commitment,
Curator admission unless separately delegated, and irreversible retirement or
deletion.

The Owner-approved T3 contract gives the August P0 one conservative outer
boundary—one exact Interaction,
fresh session, sanitized read-only current Forme source snapshot, typed
body/path-free Twin orientation, named provider, bounded lifetime,
physical secret/cross-Room isolation, and Owner review of every outward
Response—while allowing dynamic context discovery inside it. It does not build
an exact-context picker or trust-tier selector. A Managed Privacy lane remains
future work for sensitive sources. These are schedule choices, not the
long-term agency philosophy. Later policy-compatible context use, successor
publication, responses, relationship grants, and background work should be
able to run inside explicit standing envelopes.

The Owner-approved T4 contract keeps discovery authority, relationship access,
freshness, and emergency privacy stops distinct. Curator unlist removes Third
Place discovery and unused public encounters without silently revoking a
still-valid exact Owner Grant or `GrantOffer`; a direct URL to an unrevoked,
unexpired public Projection remains readable even when never admitted or
unlisted. Stale content becomes warning-only and cannot accept a new
Interaction. Projection revoke and Room retirement remove hosted bodies and
require local Presence to purge request and linked Response bodies after the
corresponding tombstone arrives. No successor inherits a Guest Grant, so
continued grant-based access requires a new exact Grant; a public successor
also requires new Curator admission. These are
lifecycle requirements for the later reconciled Packet, not authority for the
current connector, model, or repository to perform them.

The Owner-approved T5 contract makes low-friction asynchronous operation part
of that same bounded agency model. The Agent's standard Room workflow may
explicitly invoke typed `room sync` without another per-call approval; Owner
manual sync remains the recovery path, and read-only commands never hide a
pull or durable write. P0 has no daemon, live chat, WebSocket, or remote local
tunnel. One exact Interaction may use a confirmed notification-only email,
but the endpoint carries no body/reply authority and never becomes identity or
cross-Room relationship evidence.

Continuation is a fixed Owner-issued envelope, not an inferred trust score:
24h/1, 3d/2, familiar collaborator 7d/3, or Owner-selected trusted
collaborator 7d/10. `trusted` neither proves personhood nor unlocks a Private
Room; that still requires an exact Room + Projection Grant. Hosted
Interaction/inline Guest Capsule bodies have a 30-day maximum, published
Response bodies a seven-day maximum, and an isolated unpublished local
candidate a seven-day maximum. Fresh Session body-bearing runtime roots are
cleaned after normal completion or before a later session following crash.
Earlier terminal state, deletion, expiry, or invalidation shortens these
ceilings. The actual backup, infrastructure-log, and email-provider retention
regimes remain production facts that must be disclosed and approved before
production interaction or email is enabled.

The exact P0/future split is maintained in
[`R4-AGENCY-FIRST-RECALIBRATION.md`](./R4-AGENCY-FIRST-RECALIBRATION.md).

## Policy-compiled egress

Long-term, a content-bearing publish or response API should accept only a
**policy-compiled artifact**: exact Room, audience, governing policy
generation, source/disclosure attestation, content hash, attribution class,
and receipt lineage.

This allows the policy boundary—not repeated button presses or accidental
model/tool separation—to remain the durable safety fence. The current P0
body-free/no-tools split is a useful defense-in-depth implementation but not a
permanent limit on Twin/Agent usefulness.

## Mentor Lens

One candidate use case is a studio partner asking, during a project, “How would
my mentor and studio lead judge this?” Forme should represent this as a
role-scoped **Judgment Projection**, not a clone or a claim that the mentor has
actually decided.

A useful Mentor Lens response should show:

1. the likely mentor lens;
2. the recommendation under current evidence;
3. the variables that could change it;
4. confidence, counterexamples, and missing context;
5. when to escalate to the real mentor.

The mentor chooses what patterns and audiences enter the envelope. A Twin may
freely apply those admitted patterns inside it, but new private history,
consequential commitment, or an assertion that “the mentor decided” crosses
the human boundary and returns to the real mentor.

## What these approvals do not do

The approved P model changes Forme's guiding architecture; T2 closes the first
exact Room authority envelope; NH1/NH2 close the default local carrier and
ordinary-work/Forme-authority classification; exact T3 now closes the R4 P0
response session/source/provider/capability/consent boundary as design
authority; and T4 closes the public/unlist/stale/revoke/retire lifecycle
contract; T5 closes async operation, notification, deletion, retention, local
session/candidate cleanup, and the final P0 cut. None of these approvals instantiates that runtime or authorizes a
Fresh session, file read, provider call, credential issuance, private Guest
data, Room mutation, external message, schema, implementation, deployment, or
spend. T3/T4/T5 grant documentation and later Packet-reconciliation authority
  only. Reconciled Control Packet v0.2 passed independent audit at
  `sha256:e417836b…adfff5`; separate Owner approval is current, while schemas/migrations, implementation,
and production grants remain later separate gates.
