# Agent runtime strategy — curated 2026-07-15 research

- Status: dated research plus durable architecture guidance
- Curated: 2026-07-24
- Original: [`harness-first/design/agent-runtime-strategy.md`](https://github.com/formehq/forme/blob/harness-first/design/agent-runtime-strategy.md)

This document preserves the useful conclusion of the Codex/OpenCode research:
Forme should consume a mature harness runtime rather than rebuild a generic
agent loop, while keeping durable product meaning and authority outside that
runtime.

Exact commands, versions, APIs, and capability claims are dated. Re-probe them
before implementing or upgrading an adapter.

## Durable decision

- **Codex is the first live MVP runtime.**
- **OpenCode remains a first-class architectural target and P1 live path.**
- **Forme does not require feature parity between them.**
- **The Twin boundary is runtime-neutral; each adapter remains runtime-native.**
- **A runtime session is disposable computation. The Twin is durable semantic
  state.**

This avoids two bad outcomes: rebuilding commodity harness machinery inside
Forme, or reducing mature runtimes to a lowest-common-denominator interface.

## Responsibility split

| Mature runtime | Forme |
| --- | --- |
| model and provider invocation | provider/runtime selection policy |
| native session, turn, streaming, retry, cancellation, and compaction | mapping a run to a bounded Forme operation |
| supported tools, MCP, skills, plugins, and subagents | deciding which capabilities a pass may receive |
| runtime permission prompts and available sandbox mechanisms | product policy and the hard semantic/write boundary |
| low-level messages, diffs, snapshots, and usage events | durable evidence, corrections, approvals, receipts, and recovery |
| generic file or shell capability | deterministic typed effects admitted by Forme |

Neither Codex nor OpenCode is expected to provide Forme's domain guarantees:

- confirmed versus inferred meaning;
- correction propagation and stale-output invalidation;
- revision-bound owner authorization;
- deterministic effect compilation;
- product-level receipts;
- role-scoped projection policy;
- continuity across runtime, session, or model replacement.

## Runtime boundary

```mermaid
flowchart LR
    Twin["Living Project Twin"] --> Context["Scoped Context Packet"]
    Context --> Adapter["Runtime-native adapter"]
    Adapter --> Runtime["Codex or OpenCode"]
    Runtime --> Proposal["Typed proposal"]
    Proposal --> Gate["Forme validation and judgment gate"]
    Gate --> Twin
    Gate --> Effect["Deterministic effect"]
    Effect --> Receipt["Receipt and recovery"]
    Receipt --> Twin
```

Invariant: a runtime may receive a scoped projection and return a proposal. It
may not admit canonical meaning, manufacture owner approval, or bypass Forme's
deterministic writer.

## Integration ladder

Prefer the shallowest upstream-supported boundary that satisfies the product:

1. configuration and permission policy;
2. MCP, skills, or custom tools;
3. plugin hooks;
4. server/SDK adapter;
5. an upstream contribution of a generally useful extension point;
6. native host/core integration;
7. a maintained fork only after every earlier level is proven insufficient.

A fork requires a demonstrated blocker in a core Forme experience and an
explicit maintenance budget. Convenience alone is not enough.

## Small shared port, explicit capabilities

The shared contract should normalize only what Forme needs to control a run:

- inspect runtime identity and capabilities;
- start and cancel one bounded pass;
- receive lifecycle, output, tool, permission, usage, and diff events;
- close disposable runtime resources.

Capabilities must be declared instead of assumed. Examples include structured
output, application permissions, OS containment, session resume, workspace
diff/revert, plugins, skills, MCP, and subagents.

Adapter-native features may remain available behind those declarations. They
must not leak into the canonical Twin contract or silently broaden authority.

## Runtime gate

Both adapters should eventually face the same contract-level questions:

| Gate | Pass condition |
| --- | --- |
| Discovery | Forme identifies the actual runtime/version and can diagnose failure |
| Scoped context | only the approved packet is visible |
| Structured proposal | invalid output cannot enter the Twin |
| Tool boundary | only explicitly admitted tools are callable |
| Unauthorized write | generic write and external paths fail closed |
| Permission lifecycle | runtime prompts map to stable Forme events |
| Cancellation | cancellation cannot leave a hanging or half-admitted effect |
| Crash equivalence | runtime loss cannot create half-written canonical state |
| Receipt correlation | proposal, approval, effect, verification, and diff remain linked |
| Restart | a new session resumes from Twin state, not transcript truth |
| Upgrade contract | upstream changes fail clearly under pinned adapter tests |

The current Codex R2/R3 path already proves a deliberately narrower version of
this boundary: isolated packet visibility, schema-constrained output, zero
model-generated tools, local admission, exact approval, and deterministic
effects. It does not prove a general-purpose Codex adapter or OpenCode parity.

## Dated findings retained from the investigation

The July 15 investigation found supported external integration surfaces for
both runtimes:

- Codex exposed an App Server/CLI boundary suitable for external orchestration;
- OpenCode exposed a client/server model, TypeScript-oriented extension
  surfaces, and an HTTP/SDK path;
- both supplied substantially more generic harness functionality than Forme
  should rebuild;
- the inspected OpenCode configuration required special care around generic
  tools, external directories, plugins, and OS-level containment.

These are research findings, not permanent vendor guarantees. Use official
upstream interfaces, pin the tested version or commit, and protect upgrades
with contract tests.

## What this does not authorize

This strategy does not authorize:

- broader Codex or OpenCode visibility;
- generic shell or file mutation;
- direct runtime writes to the Twin;
- a runtime fork;
- live OpenCode work in P0;
- server-side AI, projection, messaging, or R4 implementation.

Each new visibility, capability, dependency, or effect still returns to the
owner stop gate.
