# Agency and human-boundary model v0.2

- Status: **privacy-first P human-boundary interpretation and T2 Room control
  envelope Owner-approved for R4 on 2026-07-28; T3–T5 and implementation remain
  subject to separate Owner review**
- Updated: 2026-07-28
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
identified below is separately Owner-approved T2. Other cognitive-mode,
delegation, and long-term application guidance remains proposed unless an
exact mechanism is separately approved. Neither P nor T2 silently creates a
credential or authorizes implementation.

This is neither “ask before everything” nor “let the Agent do anything.”
Forme's job is to make the boundary real: exact scope, audience, attribution,
effect class, lifetime, receipts, exceptions, and a reliable stop/revocation
path, with undo where feasible.

“Narrow delegation” describes the **perimeter**, not a deliberately weak
interior. An exact Room, purpose, audience, and consequence class may contain
many useful routine verbs. A one-click grant for every mechanical action is
not safer when it merely trains the owner to approve prompts without thinking.

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

The August P0 may still use conservative bootstrap mechanisms—an exact context
manifest before the first private drafting path, no background daemon, and
Owner review of every outward Response—because they make one safe path
buildable by August 11. They are schedule choices, not the long-term agency
philosophy. Later policy-compatible context use, successor publication,
responses, relationship grants, and background work should be able to run
inside explicit standing envelopes.

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
exact Room authority envelope. Neither approval by itself authorizes an Agent
runtime, credential issuance, private source/provider visibility, hosted
mutation, external message, deployment, or spend. T3–T5, the reconciled
Control Packet, schemas/migrations, implementation, and production grants
remain separate gates.
