# R4 disposable PostgreSQL rehearsal result

Status: `NEEDS_DECISION`, 2026-08-17.

## Plain-language result

The simplified path did what the reset intended: it got past the historical
Docker authority machinery and reached a real isolated PostgreSQL 16.10
server twice. The exact pinned image is now cached, the host and loopback port
worked, and both runs removed their unique container, network, volume,
credential and runtime directory.

It did **not** reach PostgreSQL Green. Both runs stopped on the first execution
of the currently hash-pinned Core schema. The second run returned structured
PostgreSQL code `42725` from routine `op_error`: an overloaded SQL operator
could not be selected uniquely. Schema apply did not complete, so verify,
restart proof and rollback rehearsal correctly did not run.

This Enabler adds `0 Product Progress`. It replaces an infrastructure mystery
with a specific schema-compatibility decision.

## Before and after

- Before: repeated historical campaigns had not reached PostgreSQL and Docker
  output classification dominated the work.
- After: `npm run r4:postgres:rehearse` is an ordinary, isolated development
  command with semantic Docker handling, unique ownership labels, loopback
  publication, bounded readiness, exact SQL bindings and exact-owned cleanup.
- Observed: Docker Desktop `29.3.1 / 29.3.1 / linux/arm64`, exact PostgreSQL
  image and PostgreSQL server version `160010` all matched.
- Still open: the current schema bytes cannot be applied to that target.

## Attempt and effect accounting

The approved budget was two full lifecycles and one anonymous exact-image
pull. Both lifecycles are consumed; the first performed the one pull and the
second used the cache. Both finished `FAILED_CLEAN` with current-run
container/network/volume and local credential/runtime residue at zero.

Only synthetic seed data was in scope. Historical V1–V4 resources and roots,
real Guest data, provider calls, production, public traffic and Gate C were
untouched. The exact pinned image cache remains, as the envelope allowed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

## What needs review

The PostgreSQL code is deterministic enough to require schema review, not a
third Docker retry. `42725 / op_error` means operator ambiguity. The strongest
current inference is the catalog-manifest `DO` block, where PostgreSQL internal
catalog types are concatenated into text without explicit casts. That exact
expression has not yet been proven, so it must be treated as a review target,
not a completed diagnosis.

Any correction changes hash-pinned schema/verify/rollback bytes and durable
database meaning. Per the approved envelope, that crosses an Owner stop gate.
The next decision is one narrow schema-compatibility review; do not create a
child Enabler or another Card/Addendum chain, and do not allocate another
physical lifecycle until that review chooses the correction and validation
method.

## Validation

- dedicated harness tests: `9 / 9` Green;
- final harness plus related Public Core PostgreSQL suite: `69 / 69` Green;
- spine and Room TypeScript checks: Green;
- documentation audit and `git diff --check`: Green.

Current stop:

`DISPOSABLE_POSTGRES_REHEARSAL_FAILED_CLEAN /
TWO_LIFECYCLE_BUDGET_EXHAUSTED / SCHEMA_COMPATIBILITY_REVIEW_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
