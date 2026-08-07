# R4 Gate B Core PostgreSQL contract

Status: `CORE_CONSTRUCTED_STATIC_ONLY`. No Docker command, PostgreSQL process,
SQL execution, network request or real data effect is evidence for this file.

This is a separate disposable Core migration overlay. It leaves the frozen
Full migration untouched and retains its compatible 37-table, 44-domain,
3-composite skeleton. Only the 32 approved Core API functions are executable
by `forme_r4_app`. Together with six invariant helpers and the migrate-only
`tx_gate_b_core_basis_install`, the Core schema has exactly 39 functions and
11 body-free audit views.

## Authority boundary

- `forme_r4_app` receives zero raw-table grants and exactly 32 function grants.
- `forme_r4_migrate` alone can call the setup-only basis function.
- `forme_r4_notify` and `forme_r4_janitor` receive no Core semantic function.
- `forme_r4_audit` can select only the 11 `audit_*` views.
- `PUBLIC` receives no table, sequence or function privilege.
- Every function is `SECURITY DEFINER` with
  `search_path = pg_catalog, forme_r4`.

The migration ledger binds the approved Technical Packet, Correction Scope
Decision Brief, Core Correction Construction Packet, exact Core basis, future
Execution Manifest and migration byte hashes. The bootstrap and rollback guard
the exact disposable database, PostgreSQL `16.10`, role flags and schema marker
`R4_GATE_B_CORE_SYNTHETIC_ONLY_V1`.

## Core behavior

The setup function accepts only the exact synthetic Controller context and
`sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35`.
It creates exactly two subjects, two role assignments, one Third Place and its
created event, and one Forme Entity. It creates no Room and no forged
Room-scoped receipt. Exact replay is a no-op; altered, partial or extraneous
state is rejected. Every nullable setup field is checked with
`IS DISTINCT FROM`, and a direct-SQL negative fixture proves the intended
closed 409/403 results before the one valid basis install.

Product mutations use exact actor/scope checks, row locks, optimistic version
checks where the operation map requires `If-Match`, Room-scoped receipts and
same-key hash conflict detection. Core-specific cuts are enforced again below
HTTP routing: public Rooms only, current public Projection only, no
AgentDerivative, no notification, no Direct Invite and no Full-only lifecycle
operation.

Terminal Projection, Interaction and Response transitions make their body
unreadable. Pairing, encounter use, GrantOffer acceptance, Grant quota,
Fresh-cycle reservation/abandon/dispatch, Response publication, event sequence
and ACK ordering are represented by database constraints plus locked function
transitions.

## Later physical proof

The closed plan pins `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`,
its arm64 manifest, `linux/arm64`, network `none`, zero host ports and database
`forme_r4_gate_b`. SQL is stdin-only through
`psql -X --set ON_ERROR_STOP=1 --username postgres`; the composer binds all
six lineage values, derives the basis call from the exact basis JSON, and the
plan requires a bounded `pg_isready` gate plus closed image-observation
validation before migration.

The later separately approved Execution must run bootstrap → migration → exact
basis → verify → success/errors → all 13 concurrent race families in both
commit orders → verify → rollback to empty v0 → reapply/basis/verify → cleanup.
Static parsing, fake executor output and the race plan are construction
evidence only; none is PostgreSQL runtime evidence. The 13-row race file is a
manifest, not executable race proof. Exact scenario-specific worker function
call bytes and persistent-state verifiers are still missing, so a successor
physical-adapter Construction grant must close them before Retry can be
recommended.
