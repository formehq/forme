# Owner technical cockpit

- Updated: 2026-07-17
- Active gate: **R0 — owner-approved; documentation publication pending**
- Active issue: [#48 — Approve the walking-skeleton Control Packet](https://github.com/formehq/forme/issues/48)
- P0 implementation: **not started on the new main**
- First real workspace: **Forme repo — owner confirmed**
- Next action: publish the approved R1 contract, then prepare the exact R1 implementation proposal

This is the owner's single re-entry page. Read it before implementation details. It should answer, in a few minutes: what Forme is, where the build is, what truth is durable, what an agent may see or change, and what the owner must decide next.

## Product claim

The August MVP is one Living Project Twin for one real project:

> It remembers where the project is, notices what it is becoming, acts once within explicit and reversible trust, and produces one controlled collaborator projection.

The four required effects are **Continuity, Cognition, Bounded Agency, and Controlled Presence**. They are one causal story built on one Twin, not four disconnected features.

## You are here

```text
R0 Shared understanding   ✓ OWNER APPROVED · PUBLICATION PENDING
  ↓ publish the approved contract
R1 Continuity             ← NEXT: implementation proposal and build
  ↓
R2 Cognition              Codex Reflection → correction → invalidation
  ↓
R3 Bounded Agency         approved effect → receipt → rollback
  ↓
R4 Controlled Presence    allowlist → static collaborator projection
  ↓
R5 Demo hardening         clean run → privacy → recovery → rehearsal
```

Current truth:

- the new `main` intentionally has no product implementation;
- the previous implementation is preserved in the archive as evidence and a parts library;
- archived code is not the default architecture and is not reused without an explicit contract;
- #47 tracks the whole MVP; #48 records the now-approved R0 Control Packet;
- the R1 implementation proposal must expose the exact schema, directory, language, and foundational dependencies before crossing any relevant stop gate.

## System map

```mermaid
flowchart LR
    Owner["Owner<br/>intent · correction · approval"]
    Source["Bounded project sources<br/>Forme repo first"]

    subgraph Forme["Forme owns continuity and control"]
        Observe["R1 Deterministic observation"]
        Twin["Living Project Twin<br/>durable state · revisions · evidence<br/>confirmed / inferred / unresolved"]
        Context["R2 Scoped Context Packet"]
        Gate["Validation · policy · owner judgment"]
        Effect["R3 Deterministic effect<br/>verify · receipt · rollback"]
        Scope["R4 Projection allowlist"]
    end

    subgraph Runtime["Replaceable harness runtime"]
        Codex["Codex — P0 live path"]
        OpenCode["OpenCode — compatible boundary<br/>P1 live path"]
    end

    subgraph Surfaces["Experiences derived from the same Twin"]
        Restart["R1 Restart View"]
        Reflection["R2 Reflection"]
        Review["R3 Action Review"]
        Projection["R4 Collaborator Projection"]
    end

    Source --> Observe --> Twin
    Owner -->|"intent / correction"| Twin
    Twin --> Restart --> Owner
    Twin --> Context --> Codex
    Context -.-> OpenCode
    Codex -->|"typed proposal only"| Gate
    OpenCode -.->|"typed proposal only"| Gate
    Gate -->|"admitted interpretation"| Twin
    Twin --> Reflection --> Owner
    Owner -->|"explicit approval"| Gate
    Gate --> Review
    Gate --> Effect -->|"bounded change"| Source
    Effect -->|"receipt"| Twin
    Twin --> Scope --> Projection
```

### How to read the map

- **Sources** say what happened in files; they remain authoritative for their own content.
- **The Twin** is Forme's durable, versioned understanding of the project. It is not a chat transcript, runtime session, file copy, or summary page.
- **Codex and OpenCode** are replaceable cognition runtimes. They receive scoped context and return proposals; they do not own the Twin or write canonical state directly.
- **The gate and executor** keep interpretation probabilistic but effects deterministic, authorized, inspectable, and reversible where feasible.
- **Surfaces** are views of one Twin. They must not create private parallel truths.

## Owner architecture checksum

The owner has decision-grade technical understanding of a slice when these five questions have clear answers:

1. **Input:** What enters Forme?
2. **Durability:** What becomes durable, and where does it live?
3. **Visibility:** What can Codex or OpenCode see?
4. **Authority:** What may an agent change, and who approves it?
5. **Recovery:** After interruption, failure, or a wrong interpretation, what survives and how is it corrected or reversed?

If these cannot be answered in roughly five minutes, implementation pauses and this cockpit or the active Control Packet must be repaired.

## Active Control Packet — R1 walking skeleton

- Status: **owner-approved on 2026-07-17; pending publication**

### User outcome

After connecting the Forme repo, the owner can leave, restart the process, and recover a human-readable view of the project's current intent and observed change without reconstructing context from a chat session.

### Proposed first flow

```text
Forme repo
  → explicit source root and exclusions
  → deterministic bounded observation
  → durable Project Twin revision
  → Markdown Restart View
  → one source change
  → next meaningful revision
  → process stop and restart
  → reconstruct the same current view
```

### Five-question contract

| Question | R1 proposal |
|---|---|
| What enters? | One explicitly selected workspace: the Forme repo. Observation follows an explicit root and exclusions; no vault-wide discovery and no symlink escape. |
| What becomes durable? | Workspace identity, source boundary, owner-entered Active Intent, revision, evidence metadata/provenance, observation events or snapshot, and the minimum state needed to reconstruct the view. Source bodies are not copied into the Twin by default. |
| What can the runtime see? | R1 uses no Codex or OpenCode reasoning. The first live Codex context begins in R2 through a scoped Context Packet. |
| What may the agent change? | R1 observation is read-only toward project sources. Deterministic Forme code may create or update only the approved, project-local state and generated view. |
| How does recovery work? | Canonical state survives process and runtime loss. A no-op observation does not create a new revision. Interrupted writes must not replace the last valid state; restart reconstructs from the last valid revision. |

### First persistence and surface proposal

- keep Forme-owned state in a project-local, Git-ignored directory;
- keep the durable representation machine-readable and inspectable;
- render the first owner surface as Markdown;
- keep runtime sessions and transcripts disposable;
- do not select the final long-term database, package topology, or UI framework in R1.

### Five-minute owner demo

1. Start from a clean Forme repo checkout and connect it with explicit boundaries.
2. Enter or confirm the project's Active Intent.
3. Run observation and open revision 1 of the Restart View.
4. Make one meaningful allowed source change and run observation again.
5. Confirm revision 2 explains the observed change; run a no-op refresh and confirm it creates no revision.
6. Stop the process, discard runtime/session context, restart, and reconstruct the same current view from durable state.
7. Confirm the project source was never modified by the observation path.

### Owner decisions

Confirmed:

- **First real workspace:** use the Forme repo.
- **Runtime boundary:** keep R1 fully deterministic and introduce the first real Codex path only in R2.
- **Persistence boundary:** use project-local, Git-ignored durable state. R1 durability covers process and runtime loss, not project-directory or machine loss.
- **First surface:** use a generated Markdown Restart View. It is a rendering of the Twin, never canonical state.

These choices make the R1 Control Packet ready. They do not approve the exact schema, directory name, programming language, dependency set, or package topology; those must be proposed only as the walking skeleton requires them.

## Owner–agent working agreement

| Responsibility | Owner | Agent |
|---|---|---|
| Product meaning, trust, privacy, scope, public behavior | decides | explains options and recommends |
| Durable state, schemas, permissions, runtime visibility | confirms before implementation | proposes a bounded contract and stops at the gate |
| Implementation inside an approved contract | need not review every function | may proceed autonomously with tests and evidence |
| User experience acceptance | experiences, challenges, accepts | supplies a runnable demo and explains the map delta |
| Architecture drift | decides whether the contract changes | must expose drift; never rewrites intent to match code silently |

The operating loop is:

```text
owner defines meaning and boundaries
  → agent proposes a Control Packet with a recommendation
  → owner confirms architecture-changing choices
  → agent builds one demonstrable outcome
  → checks and demo provide technical evidence
  → owner experiences and accepts
  → cockpit records what changed in the shared system model
```

Passing checks moves a slice to **Technical Review**. A P0 slice becomes **Done** only after the owner can experience the behavior and retain the important technical model.

## Stop-the-line boundaries

Implementation returns to the owner before it:

- creates or changes persistent state or a schema;
- broadens file, shell, network, messaging, or publish authority;
- changes what Codex or OpenCode may observe or execute;
- changes privacy, projection audience, or a trust boundary;
- adds a foundational dependency or deployment topology;
- changes P0/P1/P2 scope, dates, or public behavior;
- makes code, a runtime transcript, or a surface into a new source of truth.

## Re-entry and reporting protocol

Every core implementation update reports the same eight items:

1. user-visible outcome;
2. current roadmap gate;
3. map delta — which system box or connection changed;
4. durable-state delta;
5. visibility and authority delta;
6. validation and five-minute demo path;
7. what the owner should challenge or decide;
8. whether the shared architecture model changed.

If a change is only an internal refactor, the report says explicitly: **no owner-visible architecture change**.

## Detailed references

- [`PRODUCT.md`](./PRODUCT.md) — product vision, constitutional floor, and Demo Day acceptance story
- [`ROADMAP.md`](./ROADMAP.md) — R0–R5 schedule, dependencies, and cut rules
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — durable boundaries between Forme and agent runtimes
- [`DECISIONS.md`](./DECISIONS.md) — confirmed product, date, scope, and architecture decisions
- [GitHub milestone #11](https://github.com/formehq/forme/milestone/11) — execution deadline
- [GitHub epic #47](https://github.com/formehq/forme/issues/47) — complete P0 and P1 issue map
