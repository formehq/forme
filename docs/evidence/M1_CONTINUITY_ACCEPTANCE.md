# M1 Continuity acceptance — Forme project workspace

- Date: 2026-07-16
- Workspace kind: local project
- Result: deterministic acceptance passed; owner experience review pending

## Real-workspace result

The Forme repository was connected as its own first Project Twin with an explicit active intent.

- Revision 1 recorded 110 allowlisted source files.
- The state root was created under ignored local `98_Forme/` storage.
- A second refresh with no source-content change kept revision 1.
- Event count remained 1 and the immutable snapshot set remained `[1.json]`.
- `Now / What Changed / Next Move` reconstructed without a model or runtime session.
- Source bodies and absolute workspace paths were absent from state and evidence records.
- Every claim remained projection-ineligible by default.

## Automated acceptance

The M1 suite covers:

- local-project and exported-notes connector modes;
- stable relative source identity and immutable evidence observations;
- added, modified, deleted, and no-op scans;
- Twin state schema validation and immutable revision snapshots;
- deleting current `state.json` and `state.md`, then reconstructing them from a snapshot;
- source traversal rejection and refusal to follow file or directory symlinks;
- source-body and absolute-path non-leakage;
- injected interruption after pending transaction, evidence manifest, snapshot, and event, with idempotent recovery and no duplicate ledger entries.

## Remaining M1 work

- Owner review of whether the Markdown view actually reduces restart cost.
- One real exported-notes mirror run; the connector is currently validated with fixtures and the existing Apple Notes export spike.
- Wake/catch-up integration with the existing launchd path. The current CLI establishes the durable semantics first.
