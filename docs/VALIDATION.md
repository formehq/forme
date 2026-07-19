# Product validation and learning log

- Status: active MVP evidence register
- Updated: 2026-07-18
- Current verdict: **R3's bounded control mechanism is demonstrated; Forme's product value and suggestion quality are not yet validated**

This document records what real use has taught us. It is deliberately separate from:

- [`PRODUCT.md`](./PRODUCT.md), which states the product claim and scope;
- [`ARCHITECTURE.md`](./ARCHITECTURE.md), which states durable system boundaries;
- [`CONTROL.md`](./CONTROL.md), which states the current gate and next decision;
- [`DECISIONS.md`](./DECISIONS.md), which records owner-confirmed decisions only.

Feedback, observations, and working judgments enter here first. They move into Product, Architecture, Roadmap, or Decisions only after they change an owner-confirmed contract.

## Current product truth

Three claims must not be collapsed into one:

| Claim | Current evidence | Status |
|---|---|---|
| Forme can constrain one LLM proposal and execute one exact owner-approved effect safely | 41 deterministic checks plus the real revision 21–25 proposal, approval, execute, retry, restart, and rollback path | **Demonstrated within the fixed R3 slice** |
| The R3 proposal was accurate and useful enough to improve an owner decision | The proposal looked plausibly useful, but the owner lacked enough use-feel, comparison cases, and confidence to judge its accuracy | **Unproven** |
| A Living Project Twin creates differentiated value beyond a mature harness plus LLM | The architecture contains distinct Twin, correction, approval, receipt, and projection contracts, but the Twin has not yet accumulated enough longitudinal experience to make that difference felt | **Architecturally plausible; product-unproven** |

Passing the first row does not imply either of the other two. R3 therefore remains in Owner Acceptance rather than Done.

## Evidence — real R3 owner demo

The bounded path ran against the Forme repo and its durable local Twin:

| Revision | Event | Durable evidence |
|---|---|---|
| 21 | Owner established a fresh R3 frame | Active intent, next move, and two unresolved owner questions became the proposal base |
| 22 | Real Codex proposal admitted | `act_107c8748243c6ef3981e245ca7b0da3a`; `codex-cli 0.144.3`; model `gpt-5.6-sol`; zero tool events; no project source body sent |
| 23 | Owner approved one exact plan | Effect-plan `sha256:1da7ea5bc840ef07ac0a324ca2fa19c5c5ef263fa20a17fa2553189051281bce`; execution before this approval was rejected |
| 24 | Forme executed the fixed README effect | Receipt `eff_7a5ff5588d87b626eb0f8435c601c4c9`; retry was a no-op and restart reconstructed the same executed state |
| 25 | Owner explicitly rolled the effect back | Receipt `eff_4e73ebd064cf44233685ca34a087b107`; the exact original full-file hash was restored and rollback retry was a no-op |

This proves the bounded mechanism exercised in the demo. It does not prove that the proposed Next Move Brief was the right action, that suggestions will remain accurate across different projects, or that the control overhead is justified by recurring value.

## Feedback round 1 — meaning, use-feel, and accuracy

### Owner feedback

After completing the R3 demo, the owner could not responsibly accept or reject the Codex suggestion as a product result:

1. Forme has not yet produced enough use-feel or enough varied cases to make its meaning tangible.
2. The single Codex suggestion looked potentially useful, but one case gave no reliable basis for estimating accuracy.

### Interpretation

This is not a failed executor demo. It reveals a validation mismatch: the demo strongly exercised the control rails but weakly exercised the reason for having those rails.

The approved R3 proposal was also self-referential: it recommended using the R3 Owner Demo as the R3 acceptance gate. That was suitable for testing proposal-to-effect mechanics, but it was a poor case for discovering whether Forme can make a surprising, project-relevant, high-confidence contribution.

### Consequences for acceptance

- Keep the technical evidence; do not rerun the same happy path merely to produce more activity.
- Do not mark R3 Done on safety evidence alone because its exit condition includes owner-experienced usefulness.
- Do not generalize suggestion accuracy from one proposal.
- Evaluate future proposals against a task where the owner already has enough context to judge relevance and where the Twin has meaningful cross-time evidence to use.
- Treat suggestion quality and control-legibility as separate measures. A safe but unhelpful action and a helpful but uncontrollable action both fail Forme's product claim.

## Feedback round 2 — Harness capability versus Forme mechanism

### Direct answer

A mature Harness plus LLM can already reproduce the **visible sequence** of the R3 demo: inspect context, propose a change, ask permission, edit a file, and undo or revert it. Codex exposes non-interactive execution, structured output, sandbox and approval controls; OpenCode exposes Plan/Build modes, permissions, sessions, undo/revert, plugins, and a server API. See the official [Codex CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [Codex approval and security model](https://learn.chatgpt.com/docs/agent-approvals-security), [OpenCode permissions](https://opencode.ai/docs/permissions/), [OpenCode plugins](https://opencode.ai/docs/plugins/), and [OpenCode server API](https://opencode.ai/docs/server/).

The visible sequence is therefore not Forme's differentiation. The distinction is the durable, runtime-independent product contract beneath that sequence.

### Implementation classification

| Current implementation | Classification | Long-term owner |
|---|---|---|
| Launch `codex exec`, isolate `CODEX_HOME`, select a visible model, transport a JSON Schema, parse JSONL, and summarize runtime events | Harness integration glue; partly duplicates mature runtime capability | Codex/OpenCode adapter, using their most stable native API where possible |
| Context and action packet schemas | Mixed: structured transport is generic; the admissible Twin meaning, correction, evidence, and action semantics are Forme-specific | Forme defines semantics; adapter translates transport |
| Immutable Living Project Twin revisions and runtime-independent canonical state | Forme product mechanism | Forme |
| Confirmed/inferred/corrected meaning and correction-driven invalidation | Forme product mechanism | Forme |
| Approval bound to one exact proposal, effect-plan hash, current Twin chain, and one execution | Forme authorization contract, not equivalent to a generic tool permission prompt | Forme |
| Model proposes intent while Forme alone compiles and executes the effect | Forme trust boundary | Forme |
| Atomic writes, hashes, journals, idempotency, and recovery | Standard engineering techniques; not unique inventions | Forme owns the product-level composition and durable receipts; reusable infrastructure may implement it |
| Hash-guarded rollback represented as a new Twin revision | Forme project-state contract; different from session-history undo | Forme |
| CLI and generated Markdown surfaces | Temporary MVP surfaces, not differentiation | Replace as product learning requires |

### The approval distinction

A Harness permission prompt usually asks:

> May this runtime perform this tool call or command now?

The R3 Forme approval asks:

> Does the owner authorize this exact semantic effect, against this exact canonical project state, once?

OpenCode's `allow` / `ask` / `deny` model and Codex's sandbox/approval controls are valuable lower-level controls. They do not by themselves establish a Living Project Twin, bind approval to Forme's semantic revision chain, or make execution and rollback durable product facts.

Likewise, a Harness session is operational working state. The Twin is intended to outlive the session, the model, and eventually the chosen Harness. Implementing Forme inside a Codex or OpenCode plugin would change where the code runs, not who owns these semantics.

### Honest wheel-reinvention judgment

The current R2/R3 adapter contains a bounded amount of wheel reinvention. It was acceptable as an MVP proof because it let Forme enforce a packet-only, zero-tool boundary and measure the real runtime. It should now be treated as a replaceable adapter—not as the start of a home-grown general Harness.

The unique claim is also not that Forme invented hashing, journals, schemas, approvals, or rollback. Its defensible mechanism is their composition around durable project meaning, owner correction, exact semantic authorization, and controlled projection.

The resulting boundary should remain:

```text
Forme product and control plane
  Living Project Twin
  meaning, evidence, correction, invalidation
  context admission
  exact owner authorization
  effect plan, durable receipt, recovery, rollback
  projection policy
                │
        Harness Runtime Adapter
           ┌────┴────┐
        Codex      OpenCode
```

Codex and OpenCode should increasingly own model invocation, provider authentication, sessions, streaming, tool loops, sandboxing, MCP, compaction, cancellation, and runtime events. Forme should not build generic equivalents unless a measured product requirement cannot be expressed through either runtime.

## Combined judgment

The work so far is neither “a new Harness” nor already a proven differentiated product:

- We built a small amount of temporary Harness glue that should shrink over time.
- We implemented real Forme-specific control semantics around the Living Project Twin.
- We demonstrated those semantics mechanically in one narrow action.
- We have not yet demonstrated that a sufficiently rich Twin improves suggestion quality, continuity, or owner judgment enough to justify the additional control system.

The largest near-term product risk is not unsafe execution. It is that Forme becomes **“Codex with an extra approval ledger”** because the Twin remains too thin to create an experience a mature Harness cannot provide on its own.

## Validation questions for the next development decision

Before broadening R3 or moving blindly into R4, the next plan should answer:

1. What two or three real, longitudinal cases will make Twin-derived value judgeable rather than merely plausible?
2. What baseline will we compare against: ordinary Codex/OpenCode with the same source material, or a static project summary?
3. What evidence would show that an owner correction materially improves a later proposal?
4. How much approval and review friction is acceptable for the value of the action?
5. Which current runtime glue can be replaced by a native Codex API boundary, and what minimal adapter contract is required for an OpenCode spike?
6. Does R4 Controlled Presence help expose the unique value of one shared Twin, or would it distract from the unresolved usefulness question?

## Falsification signals

We should reduce or rethink the product claim if repeated real cases show that:

- Twin-derived proposals are no more useful than a fresh Harness session with the same files;
- owner corrections are stored but do not materially change later interpretation or action;
- the approval and provenance burden consistently costs more attention than the action saves;
- most engineering effort continues to reproduce runtime, tool, or session features already supplied by Codex/OpenCode;
- controlled projections are indistinguishable from manually maintained summaries.

## Maintenance rule

For each meaningful owner demo, append one dated evidence round containing:

1. the case and baseline;
2. what the owner actually experienced;
3. technical evidence;
4. product judgment and confidence;
5. what was not proven;
6. the consequence for the next gate.

Do not rewrite prior feedback to fit later architecture. Supersede it explicitly when new evidence changes the judgment.
