# R4 PostgreSQL complete assertion-vector result

Status: `REPLACEMENT_REPOSITORY_TECHNICAL_REVIEW_GREEN / DIAGNOSTIC_AUTHORIZED`,
2026-08-17.

## Replacement envelope

The Owner authorized one exact anonymous image pull followed by one replacement
complete-vector diagnostic. The exact CLI is
`npm run r4:postgres:diagnose:pull`. Repository tests prove this is the only
diagnostic-with-pull argument shape, performs at most one pull and two image
inspects, and cannot fall through to a second pull. The prior failed-clean
cache-only invocation remains immutable history.

If and only if the complete vector contains reviewed PostgreSQL 16 catalog
expression assumptions, the same envelope permits one consolidated verify-only
correction and at most one final cached-image lifecycle. No third run exists.

## Physical diagnostic outcome

The single authorized invocation, run `58fde18b4ff6cde3`, observed Docker
client/server `29.3.1` on `linux/arm64`, then proved that the exact image digest
was not cached. It stopped before resource creation, PostgreSQL and SQL. Image
pulls were `0`; the exact container, network and volume names were absent and
the private runtime root was removed. The complete assertion vector was not
observed, so neither the conditional correction nor the final lifecycle is
unlocked.

## User-visible outcome

The #77 development command can now evaluate all 18 committed Public Core
verify predicates in one read-only PostgreSQL transaction. It returns only an
ordered subset of the 18 predefined assertion identifiers plus fixed
structural counts. It does not return arbitrary PostgreSQL messages, SQL,
catalog names or data values.

No Docker, PostgreSQL or SQL effect was made while constructing and validating
this repository result. This remains `0 Product Progress` until the disposable
rehearsal proves restart persistence and rollback.

## Before and after

- Before: `verify.sql` raised on the first false predicate, so one physical run
  could reveal at most one assertion.
- After: the diagnostic is derived deterministically from the exact hash-pinned
  `verify.sql`; each of its 18 existing `P0001` raises becomes one closed
  NOTICE, every predicate retains the same bytes and order, and one exact
  completion marker proves the vector reached the end.
- The ordinary full rehearsal remains fail-fast and unchanged in meaning.
- The diagnostic has a separate `npm run r4:postgres:diagnose` entry, refuses
  image pull, starts at most one disposable container lifecycle and always
  attempts exact-owned cleanup.

## Data and permission impact

- schema shape, expected inventories, catalog-manifest algorithm/result,
  rollback and business meaning: unchanged;
- synthetic local data only;
- image pull: `0`;
- provider, Guest, production, public traffic and Gate C effects: `0`;
- push and merge: not requested.

## Frozen repository bindings

- schema: `sha256:752affd9c237edf0469ec1486269ad68f46b3b83f93d63d80666f0d20984cb00`;
- verify source: `sha256:f964e22b4a2b0a7989e6286e018d1436c3cec889216a9eb87a06a62e5c27df97`;
- rollback: `sha256:317c5cabc0af6d368fdb3d7d5e03ea97de2a58414bbd382883ee0fffd5c6878d`;
- derived diagnostic SQL:
  `sha256:395403c01b38f259f76a986af84a9cc7082cfbd01b90ec79522bb2a65c9fb8fc`;
- runner candidate:
  `sha256:edee318bae6cf070631afb21aa9eca305150d8434ebd81f15bc7a2c6a5057aab`;
- test candidate:
  `sha256:84973553ad3ea9bfe870683a251dd6a9df1a8c878b2eaabfe9aa71e51187b914`;
- replacement runner candidate:
  `sha256:e4315d2835e1fbb4554dbfd3c558f14e6d45db984a7e737c2482e3be0c26a30b`;
- replacement test candidate:
  `sha256:62d8155fbeb1d149287fb9138dfd0be0760718906ad9b282c26253f27339f2bb`.

## Validation evidence

- focused #77 harness: `17 passed / 0 failed`;
- offline R4: `592 passed / 0 failed / 111` frozen historical physical tests
  skipped;
- spine: `45 passed / 0 failed`;
- Gate-B Core: one unrelated concurrent path-chain test initially failed, then
  passed both in isolation and in the full rerun; final full result
  `146 passed / 0 failed`;
- spine and Room typecheck, docs audit and `git diff --check`: Green.

## Runnable path and challenge points

The replacement command is `npm run r4:postgres:diagnose:pull`. It is authorized
once and must not be repeated.

The Owner should challenge any result that is not
`DIAGNOSTIC_COMPLETE_CLEAN`, does not report `evaluatedAssertionCount: 18`,
contains an identifier outside the closed list, reports an image pull, or
fails exact container/network/volume/runtime cleanup. Such a result stops the
envelope and cannot authorize a verify correction.

## Current stop

`POSTGRES_VERIFY_ASSERTION_VECTOR_REPLACEMENT_REPOSITORY_TECHNICAL_REVIEW_GREEN /
ONE_EXACT_IMAGE_PULL_AUTHORIZED / ONE_REPLACEMENT_DIAGNOSTIC_AUTHORIZED /
CONDITIONAL_CONSOLIDATED_VERIFY_ONLY_CORRECTION /
ONE_FINAL_LIFECYCLE_CONDITIONAL / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.
