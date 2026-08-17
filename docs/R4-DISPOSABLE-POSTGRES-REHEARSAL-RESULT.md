# R4 disposable PostgreSQL rehearsal result

Status: `VERIFY_CONTRACT_REVIEW_REQUIRED`, 2026-08-17.

## Plain-language result

The approved PostgreSQL 16 compatibility correction worked: the single new
cached-image lifecycle applied the complete Core schema successfully. That
proves the earlier `42725 / op_error` came from the catalog-signature
expressions that lacked explicit text casts. The correction preserved the
signature fields, order and separators; only type resolution changed.

The rehearsal is still **not Green**. It stopped at the first read-only verify
batch with project-defined PostgreSQL error `P0001` from `exec_stmt_raise`.
That means one of our verify assertions disagrees with the schema PostgreSQL
actually produced. The body-free result does not expose the named assertion,
so no exact verify correction is claimed. Restart persistence and rollback
were not reached.

The run used the already cached exact image, performed no pull, and removed
its unique container, network, volume, credential and runtime directory. This
Enabler still adds `0 Product Progress`, but the open problem has moved from
schema execution to verify-contract diagnosis.

## Before and after

- Before correction: two isolated runs failed at the first schema batch; the
  second returned `42725 / op_error`.
- Repository correction: all catalog signature identifiers and PostgreSQL
  internal `"char"` fields now convert explicitly to text in schema, verify
  and rollback. Removing only those casts reconstructs the prior shared frame
  exactly.
- After correction: schema apply completes on PostgreSQL 16.10; the first
  read-only verify raises `P0001` before restart or rollback.
- Observed again: Docker `29.3.1 / 29.3.1 / linux/arm64`, exact cached image,
  PostgreSQL server `160010`, loopback publication and exact cleanup.

## Attempt and effect accounting

The original budget was two full lifecycles and one anonymous exact-image
pull; all were consumed by the two schema failures. The compatibility envelope
then authorized exactly one cached-image lifecycle and zero pulls. That final
lifecycle is also consumed and finished `FAILED_CLEAN`, with current-run
container/network/volume and local credential/runtime residue at zero.

Only synthetic seed data was in scope. Historical V1–V4 resources and roots,
real Guest data, provider calls, production, public traffic and Gate C were
untouched. The exact pinned image cache remains, as the envelope allowed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

## What needs review

Do not run Docker again. The next task is repository-only: determine which
named `P0001` assertion in `verify.sql` rejects the successfully applied
schema, using static comparison or a separately approved body-free diagnostic
that can preserve the assertion identifier. Any change to the verify contract
or schema remains an Owner stop gate. Do not create a child Enabler or revive
the historical physical runner.

## Validation

- focused current harness and Public Core tests: `51 / 51` Green;
- offline R4 regression: `584 passed / 0 failed / 111 historical physical-runner tests intentionally skipped`;
- spine and Room TypeScript checks: Green;
- documentation audit and `git diff --check`: Green.

Current stop:

`DISPOSABLE_POSTGRES_SCHEMA_COMPATIBILITY_CORRECTION_PROVEN /
INITIAL_VERIFY_FAILED_CLEAN / CORRECTION_LIFECYCLE_BUDGET_EXHAUSTED /
VERIFY_CONTRACT_REVIEW_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
