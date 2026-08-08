# R4 Gate B Core PostgreSQL contract

Status: `POSTGRES_PHYSICAL_ADAPTER_CONSTRUCTED_OFFLINE`. No Docker command,
PostgreSQL process, SQL execution, network request or database mutation is
evidence for this file.

The disposable Core overlay retains the frozen 37-table, 44-domain,
3-composite skeleton. Exactly 32 Core API functions are executable by
`forme_r4_app`; six invariant helpers and the migrate-only basis installer make
39 functions and 11 body-free audit views. Raw-table grants remain closed.

## Two approved source corrections

The successor migration makes only these two product-semantic corrections:

1. both active-20 checks count only active unresolved interactions whose origin
   is `public_encounter`; Owner-issued Grants bypass this pool and all
   `public_accept` rate reads/writes;
2. public interaction acceptance inherits its 3/day edge bucket from the
   unique normal `encounter_issue` lineage row for that encounter. Missing or
   mismatched lineage returns the exact body-free `409 capability_unavailable`
   tuple with no receipt or mutation. There is no actor-scope fallback.

The setup basis remains available only through
`tx_gate_b_core_basis_install`. Synthetic race scaffolding may create only the
exact dynamic rows/timestamps needed for a case; it may not hand-seed the
Controller, Curator, Third Place or Forme Entity.

## Executable race proof plan

The machine catalog keeps 13 named families but expands the four independent
rate edges, producing 16 cases × two controlled commit orders = 32 fresh
overlays. Those overlays contain exactly 64 concurrent A/B calls. C09 adds four
winner/loser recovery calls, so the complete Retry plan is exactly 68 Core
calls: 39 2xx, 29 controlled non-2xx, 37 new receipt/idempotency pairs and 32
persisted-state verifiers.

Each worker uses `READ COMMITTED`. The barrier and Core call are separate SQL
statements in one transaction. The controller proves overlapping transactions
through a PostgreSQL observer that sees the second backend active on a lock and
blocked by the first backend before releasing the first COMMIT. Sequential
A-then-B execution cannot satisfy the protocol. Every order then checks exact
result arms, versions, receipts, events/high-water marks, absence of rejected
side effects and process-group absence before rollback.

The aggregates are observations, not catalog arithmetic: every inline-validated
worker emits one body-free `RESULT` token, every recovery emits one same-shape
`RECOVERY_RESULT` token, and every exact
persisted verifier emits one `VERIFIED` token carrying that order's new-receipt
count. A future runner must reduce 64 worker plus four recovery tokens to
68/39/29 and the 32 verifier tokens to 37; deriving those values only from the
expected catalog is forbidden.

## Future physical execution

The closed runner pins
`postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`,
`linux/arm64`, `--pull=never`, `--network none`, zero published ports and
database `forme_r4_gate_b`. Every Docker call uses the Owner-pinned Unix socket;
every `psql` call is stdin-only with `-X`, `--no-password`,
`ON_ERROR_STOP=1`, user `postgres`, and all six lineage variables.
Repository-derived SQL/catalog/template bytes enter the plan only through
`readRuntimeFile(relativePath)`. In production that reader must serve a
pre-opened, no-follow, hash-pinned snapshot; the plan may not reread worktree
paths after that snapshot is frozen.

The future exact order is collision checks → owned volume/container creation →
bounded readiness → baseline migration/happy/error/ACK/rollback → non-race
public boundary checks → all 32 fresh race overlays → clean reapply/verify/
rollback → exact label-bound cleanup and absence proof. The pinned image may
remain as a pre-existing cache; the runner-owned container, volume, workers and
run root may not.

Only a separately approved Retry that completes this exact plan may claim
`POSTGRES_CORE_LANE_GREEN`, and that claim binds only its exact host capsule,
image and run. Construction and Host Binding alone remain Yellow.
