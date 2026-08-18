# R4 PostgreSQL complete assertion-vector result

Status: `FINAL_LIFECYCLE_FAILED_CLEAN / EXECUTION_BUDGET_EXHAUSTED`,
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

## Physical diagnostic and final outcome

Replacement diagnostic run `0dddf25aee37504c` used the one authorized exact
image pull, applied the schema and evaluated all 18 predicates. Its complete
closed vector contained only `public_core_unexpected_object_present`, exactly
the reviewed PostgreSQL catalog-ordering class. It removed its container,
network, volume, credential and runtime root.

Commit `e8db0e47bccdf51d47cc98f0ce17278bc5ea1115` then made one consolidated
verify-only correction: every fixed inventory comparison now converts to text
and uses explicit `C` ordering. Schema, rollback, expected sets, business
meaning and the catalog-manifest query/result stayed unchanged. All repository
validation lanes passed.

Final run `71ac0e393653db72` physically proved schema apply and the corrected
initial verify. It stopped after the one required container restart because
bounded restart readiness exhausted. Post-restart verify, persistence proof
and rollback were not reached. The run pulled no image and again removed every
exact-owned resource and runtime byte. The final lifecycle and all run budgets
are consumed; there is no retry under this envelope.

## User-visible outcome

The #77 development command can now evaluate all 18 committed Public Core
verify predicates in one read-only PostgreSQL transaction. It returns only an
ordered subset of the 18 predefined assertion identifiers plus fixed
structural counts. It does not return arbitrary PostgreSQL messages, SQL,
catalog names or data values.

The catalog correction is now physically proved by the initial verify, but
this remains `0 Product Progress` because restart persistence and rollback are
still unproved.

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
- replacement image pull: `1 / 1`; final lifecycle image pull: `0`;
- provider, Guest, production, public traffic and Gate C effects: `0`;
- push and merge: not requested.

## Frozen repository bindings

- schema: `sha256:752affd9c237edf0469ec1486269ad68f46b3b83f93d63d80666f0d20984cb00`;
- corrected verify source:
  `sha256:1b05175a925a2a8c614976c0e70700b6f9b7dab1fd59557d0eef6edb0f64c85e`;
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
- replacement entry commit/tree: `16bd930a3e0171c9d5b26d1d09cdbb1111be5f24` /
  `6a4daf093a2c8355fa393487bf0aaacf5ea2e45a`;
- consolidated correction commit/tree:
  `e8db0e47bccdf51d47cc98f0ce17278bc5ea1115` /
  `5618016267368b52f47204fd06d6f187205584df`.

## Validation evidence

- focused #77 harness: `17 passed / 0 failed`;
- offline R4: `593 passed / 0 failed / 111` frozen historical physical tests
  skipped;
- spine: `45 passed / 0 failed`;
- Gate-B Core: one unrelated concurrent path-chain test initially failed, then
  passed both in isolation and in the full rerun; final full result
  `146 passed / 0 failed`;
- spine and Room typecheck, docs audit and `git diff --check`: Green.

## Runnable path and challenge points

Both authorized commands are consumed and must not be repeated. The Owner
should challenge any claim that the restart or rollback was proved: the final
receipt says initial verify `1`, restart `1`, restart persistence `false`,
rollback `false`, and exact cleanup `true`.

## Current stop

`POSTGRES_VERIFY_CONSOLIDATED_CORRECTION_FINAL_LIFECYCLE_FAILED_CLEAN /
INITIAL_VERIFY_GREEN / RESTART_READINESS_FAILED / ROLLBACK_NOT_REACHED /
EXECUTION_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
