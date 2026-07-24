# Stewardship and entropy loop v0.1

- Status: **owner proposal — not yet approved as an implementation contract**
- Updated: 2026-07-23
- Purpose: define how a Living Twin remains useful as its sources, decisions, actions, relationships, and projections accumulate

## Product claim

Continuity without stewardship eventually preserves more stale state, not more useful continuity.

Entropy Reduction is therefore not a Knowledge Vault folder convention or a fifth disconnected feature. It is the metabolism that keeps Continuity, Cognition, Agency, and Presence current and coherent over time.

## Current Forme coverage and gap

The accepted R1–R3 substrate already provides:

- explicit source allowlists and content hashes;
- immutable Twin revisions and restart reconstruction;
- evidence-backed inferred meaning;
- owner correction and dependent-output invalidation;
- revision freshness for proposals and approvals;
- deterministic effects, receipts, recovery, and rollback.

This prevents silent memory loss and stale action. It does **not** yet provide a long-running maintenance system for:

- capture, triage, promotion, demotion, incubation, and archive;
- structural, temporal, semantic, action, or projection drift;
- report backfill and dead-end detection;
- recurring wake and bounded maintenance budgets;
- workspace health metrics;
- taste-rule promotion, aging, and re-certification;
- deciding when ambiguity should be preserved instead of cleaned up.

## Repo, workspace, and Twin

A repo is a source container. It may contain code, notes, documents, files, or a mixture. The Living Twin is the durable, revisioned interpretation and control state derived from bounded sources and owner judgment.

Forme should keep a universal substrate while allowing each workspace to declare a **Stewardship Profile**. The core must not require `00_Inbox`, `02_Wiki`, PARA, Obsidian, or any other one ontology.

### Universal Forme substrate

- source identity, evidence, provenance, and time;
- confirmed, inferred, unresolved, superseded, and invalid state;
- proposals, owner decisions, corrections, grants, receipts, and consequences;
- typed signal and artifact roles;
- freshness and dependency relationships;
- bounded maintenance proposals and effects;
- health observations and review triggers.

### Workspace Stewardship Profile

- artifact roles and lifecycle states;
- authoritative surfaces and single-source-of-truth rules;
- what counts as stale, contradictory, dangling, duplicated, mature, or dormant;
- promotion, demotion, archive, and revalidation conditions;
- allowed maintenance effect types and their agency envelopes;
- event, return, schedule, and threshold triggers;
- a small set of health metrics that matter for this workspace.

## Five kinds of entropy

| Entropy | Example | Forme response |
|---|---|---|
| **Structural** | duplicate artifacts, broken relationships, unclear authority | detect bounded drift; repair mechanically or propose consolidation |
| **Temporal** | stale live surfaces, old plans presented as current, inactive permissions | name freshness, age state, expire or request revalidation |
| **Semantic** | new evidence conflicts with an active interpretation | preserve the conflict, propose a correction, invalidate dependents if admitted |
| **Execution** | open loops accumulate, outputs do not feed back, decisions never close | surface aging and consequence; propose the smallest closure or incubation move |
| **Social / Projection** | public or collaborator-facing state lags behind the private Twin | retire or rebuild the affected Projection Capsule; never read private source at render time |

Low entropy does not mean maximum tidiness. Forme must preserve legitimate ambiguity, unresolved questions, immature ideas, and historical evidence when compression would destroy meaning.

## Canonical stewardship loop

```text
bounded source or external interaction
  → deterministic observation
  → typed signal candidate
  → Reflection / Incubation / Judgment / Stewardship / Timing
  → schema-constrained proposal
  → Agency Gate and owner policy
  → deterministic maintenance effect or explicit non-action
  → verification, receipt, consequence, health delta
  → Twin revision and affected projection lifecycle
```

The runtime may interpret and propose. Forme owns admission, durable meaning, policy, effects, receipts, and lifecycle.

## Signal and meaning lifecycle

The source body remains in its source system. Forme stores the minimum durable control state:

```text
observed evidence
  → candidate signal
  → inferred claim or emerging thread
  → owner-confirmed / policy-admitted state
  → active use
  → superseded, dormant, invalid, or archived
```

No later stage erases the earlier evidence. A signal may remain unresolved indefinitely. Incubation is a first-class outcome, not a failed promotion.

## Trigger model

Long-running does not require an always-awake model session. It requires repeatable triggers against durable state:

- **event:** an admitted source changes or an external signal arrives;
- **return:** the owner opens Forme after an interruption and requests catch-up;
- **schedule:** a bounded local or server job checks named profiles and budgets;
- **threshold:** age, contradiction, backlog, expiry, or consequence crosses a declared limit.

Each run has an input manifest, budget, capability scope, no-op outcome, and receipt. No-op is healthy; the system must not create maintenance work to justify running.

## Example profiles

| Workspace | Example artifact roles | Example drift |
|---|---|---|
| Coding repo | source, test, decision, issue, release, generated artifact | docs disagree with behavior; closed issue remains current; decision is not reflected in code |
| Knowledge vault | capture, raw, concept, question, project, output, archive | raw never promotes; concept remains stale; report becomes a dead end; action index drifts |
| File repo | inbox, working, canonical, derived, published, archive | duplicate versions; missing provenance; old public file remains active |
| Project workspace | intent, decision, action, artifact, relationship, projection | current direction, work, and external story disagree |

## Health and intervention budget

A profile should choose few metrics that cause real intervention. Candidate classes include:

- authoritative-surface freshness;
- open-loop age and closure rate;
- unresolved contradiction age;
- capture or inbox age;
- output-to-source feedback completion;
- projection age relative to its Twin revision;
- proposal acceptance, correction, rejection, and repeated-noise rates;
- owner review burden and time-to-understand.

Metrics inform timing and scope. They do not become vanity dashboards or grant authority.

## MVP relationship

The full stewardship engine is not required before Demo Day. The minimum useful bridge is:

1. R4 accepts external messages only as typed, untrusted Interaction Requests tied to a Projection Capsule version.
2. The server Signal Queue transports and tracks lifecycle; the local Signal Box performs private-context judgment and owner review.
3. Projection compilation consumes active, explicitly allowed Twin claims only.
4. Twin or allowlist change makes affected projections stale, retired, or reconstructible.
5. Approved responses return as bounded capsules; no external request enters Twin meaning automatically.
6. R5 rehearses return/catch-up, projection freshness, expiry, and no-op behavior.
7. Full workspace profiles, automatic wake, maturity pipelines, and authorized routine maintenance remain separately gated follow-up work.

This keeps the R4 social experience from creating an ungoverned inbox while avoiding a pre-demo rebuild of the historical CCS vault runtime.

## Recommended owner decisions

1. Recognize Entropy Reduction as a cross-cutting metabolism for the four product dimensions, not a Vault-specific fifth feature.
2. Keep the Forme substrate repo-agnostic and put domain ontology and drift rules in explicit Workspace Stewardship Profiles.
3. Preserve typed lifecycle states including candidate, inferred, confirmed, active, unresolved, superseded, dormant, invalid, and archived.
4. Treat Incubation and deliberate non-action as valid outcomes; low entropy must not erase meaningful ambiguity.
5. Limit the MVP bridge to projection/message freshness and typed external signals; prepare the full stewardship loop as post-demo product work.

Approval of this proposal would establish the architecture direction and MVP boundary. It would not authorize a scheduler, whole-repo inference, automated cleanup, or autonomous maintenance.
