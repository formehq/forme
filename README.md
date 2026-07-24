# Forme harness design archive

This branch preserves the design work that preceded the owner-controlled MVP
rebuild. It is a historical design archive, not a runnable Forme distribution
and not the current source of product or implementation authority.

## Current authority

Current product decisions, architecture, implementation, tests, and roadmap
live on [`main`](https://github.com/formehq/forme/tree/main). Start with:

- `docs/PRODUCT.md`
- `docs/CONTROL.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- the active GitHub gate

If an archived document conflicts with those sources, `main` and the active
owner-approved Control Packet win.

## Why this branch exists

The July 14–15 design work contains useful product lineage and runtime research
that should not disappear merely because the implementation was rebuilt. In
particular, it records:

- the evolution from broad Forme effects to Continuity, Cognition, Agency, and
  Presence;
- the idea of specialized cognitive organs such as Continuity, Reflection,
  Incubation, Timing, Stewardship, Projection, and Verification;
- the boundary between a mature harness runtime such as Codex or OpenCode and
  the Forme-owned Twin, correction, approval, receipt, and projection layers;
- early module, schema, and runtime-gate experiments that informed later R1–R3
  contracts.

The archive lets later humans and agents recover that reasoning without
silently restoring the old architecture.

## Safety and publication status

**Private archive — not public-release safe.**

Some files contain private knowledge-vault note titles, people names, dated
assumptions, and internal provenance. Before any public release:

1. remove or redact `design/reference-index.md`;
2. review the raw brainstorm and decision-state documents for personal context;
3. treat every schema and architecture document as historical unless it has
   been independently re-admitted through the current owner gate;
4. rerun a credential, absolute-path, and privacy scan.

No credential-like strings, email addresses, or absolute `/Users/...` paths
were found by the archive scan performed on 2026-07-24. That mechanical scan
does not make the branch public-safe.

## Reading map

See [`design/README.md`](./design/README.md) for the file-by-file status map.
Runtime experiments are under [`spikes/runtime-gate`](./spikes/runtime-gate).
