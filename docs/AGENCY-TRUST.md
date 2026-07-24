# Agency and trust model v0.1

- Status: **owner proposal — not yet approved as an implementation contract**
- Updated: 2026-07-23
- Purpose: separate how Forme reasons from what it may do, then give the owner a low-cost way to expand or reduce agency over time

## Product claim

Forme should earn agency without turning model confidence, historical agreement, or fluent reasoning into permission.

The owner may delegate a bounded class of judgment or effect. Forme must preserve the scope, evidence, recency, counterexamples, receipts, and a path to reduce or revoke that delegation.

## Two different questions

The system must answer these independently:

1. **Cognitive mode:** what kind of judgment is the agent making?
2. **Effect authority:** what may happen in the world because of that judgment?

High confidence may still concern an irreversible or externally meaningful choice. Low-confidence exploration may be safe when it remains isolated, cheap, time-bounded, and reversible. Confidence therefore informs review; it never grants authority by itself.

## Three cognitive modes

| Mode | When it applies | Agent behavior | Owner interaction | Typical effect |
|---|---|---|---|---|
| **Routine / Conservative** | a recent, scoped pattern or owner-authored rule fits closely and counterevidence is absent | repeat the known judgment, surface exceptions, keep a receipt | review anomalies or results rather than reconstruct the reasoning | pre-authorized, low-risk, reversible maintenance |
| **Collaborative** | confidence is medium, judgments compete, or the choice depends on current owner intent | recommend first, expose one to three independently editable judgments, name one blocking question only when necessary | correct an assumption, choose a direction, or approve a bounded action envelope | owner-confirmed action inside a narrow scope |
| **Exploratory / Creative** | the system is searching for a new possibility rather than replaying a known answer | generate alternatives, prototypes, simulations, or experiments; preserve failures and learning | set the experiment boundary and judge results or escalation | isolated, budgeted, time-boxed work with no unapproved external commitment |

Exploratory mode may have broad agency over the **search space** while remaining tightly constrained over real-world effects.

## Effect-authority ladder

Each capability and category advances independently:

```text
observe
  → propose
  → shadow
  → owner-confirmed effect
  → authorized autonomous effect
```

- **Observe:** gather only admitted evidence.
- **Propose:** return a typed recommendation or experiment; create no effect.
- **Shadow:** record what the agent would choose, then compare it with the owner's real decision.
- **Owner-confirmed effect:** execute one exact, current plan after explicit approval.
- **Authorized autonomous effect:** execute only inside an owner-granted category, effect type, budget, time window, and rollback contract.

R3 currently implements only `propose` and one exact `owner-confirmed effect`. It does not implement delegated approval or autonomous execution.

## Agency envelope

An admitted effect must be inside one explicit envelope:

- workspace and capability;
- decision or maintenance category;
- readable and writable scope;
- maximum blast radius;
- reversibility and rollback limit;
- externality, including publishing, messaging, money, identity, or commitments;
- novelty and evidence quality;
- model confidence and named uncertainty;
- owner-rule provenance, shadow sample count, disagreement rate, and counterexamples;
- grant time, expiry, and re-certification trigger;
- action count, cost, and time budget.

Unknown or stale fields fail closed. A permission for one category never generalizes to the owner's identity or to a different workspace.

## Learning from owner history

Owner history is calibration evidence, not silent authorization.

```text
agent shadow decision
  → owner decision and optional reason
  → scoped comparison
  → candidate taste rule with counterexamples
  → owner confirms or edits the rule
  → optional bounded delegation
  → expiry, drift, disagreement, or consequence triggers review
```

Rules for this learning path:

- only real owner decisions, corrections, reversals, and reasons count as owner taste;
- agent-authored shadow or autonomous events never become self-reinforcing taste evidence;
- sparse evidence produces a candidate rule, not a permanent preference;
- recency, negative examples, reversals, and changed context remain visible;
- a rule can age out, become dormant, be narrowed, or be revoked;
- repeated shadow agreement may justify proposing a grant, but the owner still creates the grant.

## Owner interfaces

The interface should match the cognitive mode instead of showing the same approval card for every event.

### Routine

Show what happened, why it was inside the grant, verification, expiry, and undo. Interrupt only on exception, drift, budget exhaustion, or failed verification.

### Collaborative

Use the accepted R3-V2 pattern: one plain-language recommendation, one to three editable judgments, progressive evidence, consequence preview, and one named blocking question only when a responsible recommendation is impossible.

The owner may approve an action envelope instead of approving each mechanical step inside it.

### Exploratory

Show the question being explored, sandbox boundary, budget, stop condition, artifacts produced, and what would require escalation. Review the portfolio and learning rather than every internal generation step.

## R4 boundary

The corrected R4 topology has no server agent. The server may register and render immutable capsules, queue bounded external signals, and relay reviewed responses. It may not infer a host answer, compare people, read the private Twin or workspace, promise on the owner's behalf, publish a new claim, modify source, or autonomously send a later reply.

Reasoning remains at the edges:

- a Guest Agent may interpret the public Projection Capsule locally for its own user;
- the local Forme Agent may use allowed private context to draft a deeper response;
- the owner reviews, adjusts, approves, declines, or parks that response;
- a published Response Capsule carries only the admitted result and its governing versions.

External interaction is evidence for later owner/Twin judgment. It is not authority.

## Mentor Lens

One real candidate use case is a studio partner asking, during a project, “How would my mentor and studio lead judge this?” Forme should represent this as a role-scoped **Judgment Projection**, not a clone or an assertion that the mentor has actually decided.

A useful Mentor Lens response should show:

1. the likely mentor lens;
2. the recommendation under current evidence;
3. the variables that could change it;
4. confidence, counterexamples, and missing context;
5. when to escalate to the real mentor.

The mentor chooses which judgment patterns may be projected. Public context may support a preliminary guest-side reading; private history or consequential judgment routes through the local Forme Agent and mentor review. This use case enters validation, but grants no new R4 authority.

## Recommended owner decisions

1. Approve the separation between cognitive mode and effect authority.
2. Adopt Routine, Collaborative, and Exploratory as the first owner-facing modes.
3. Retain the five-step authority ladder, with per-capability grants rather than one global trust score.
4. Treat shadow history as scoped calibration evidence; require explicit promotion, expiry, and re-certification for autonomous authority.
5. Let creative agency expand inside experiment envelopes while keeping irreversible and external effects separately gated.

Approval of this model would establish architecture and product language only. It would not authorize autonomous execution in the MVP.
