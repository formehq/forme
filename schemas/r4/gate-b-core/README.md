# R4 Gate B Demo-critical Core

- Status: `CORE_REPOSITORY_REVIEWABLE_YELLOW`
- Construction authority: R4 Gate B Core Correction Construction Packet v0.1
- Construction Packet SHA-256:
  `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6`
- Scope Brief SHA-256:
  `sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f`
- Retry Execution Grant: `NOT_REQUESTED`
- First Provider-Call Test Grant: `NOT_REQUESTED`

This directory is a separate Demo-critical Core overlay. It does not modify or
complete the frozen Full Gate B target. Core exposes exactly 32 operations for
one public Hero Encounter and keeps 13 Full-only operations absent from the
active API, Web and CLI.

Construction here was repository-only. Its PostgreSQL, Codex and macOS plans
used injected fake executors. A tracked Core artifact is not evidence that
Docker, PostgreSQL, real Codex, `sandbox-exec`, signing, Keychain,
LocalAuthentication, a provider, a Guest, deployment or public traffic ran.

The repository mechanisms are reviewable, but `CORE_CONSTRUCTED_OFFLINE` is
not claimed. Three boundaries remain open: exact per-scenario PostgreSQL race
worker/verifier bytes, host-bound Codex/PostgreSQL runner construction, and a
host-bound macOS signed-helper executor. The present Execution Manifest is
therefore deliberately non-approvable.

The generated operation bundle is defined by [`operations.md`](./operations.md)
and checked by `scripts/r4-gate-b-core-api-contract.mjs`. The original Full
contracts remain under `schemas/r4/gate-b/`, `schemas/r4/sql/` and
`schemas/r4/api-v1*.json` as immutable compatibility evidence.

The current map of what exists versus what remains physically closed is
[`runtime-boundary.json`](./runtime-boundary.json). The artifact inventory is
[`artifact-index.json`](./artifact-index.json), and the strict construction and
future physical evidence shapes are in [`evidence.schema.json`](./evidence.schema.json)
and [`macos/evidence.schema.json`](./macos/evidence.schema.json).
