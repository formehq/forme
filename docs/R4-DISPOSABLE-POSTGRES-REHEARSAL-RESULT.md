# R4 disposable PostgreSQL rehearsal result

Status: `FAILED_CLEAN / ARCHITECTURE_REVIEW_COMPLETE`, 2026-08-17.

## Plain-language result

The one approved anonymous pull acquired the exact PostgreSQL `linux/arm64`
digest. The first full diagnostic lifecycle applied the complete schema and
named `public_core_constraint_inventory_drift`. It then removed its container,
network, volume, credential and runtime directory.

Repository comparison proved that PostgreSQL had the same 172 constraint
signatures as the fixed contract. Only four array positions differed: the
query sorted by table and constraint name, while the fixed contract sorted the
complete `table|constraint|type` signature. Commit `f005cbe` changed only that
verify ordering to explicit `C` order; the schema, constraint set, business
meaning and catalog-manifest algorithm stayed unchanged.

The final allowed lifecycle passed that assertion, proving the correction,
then stopped at the next body-free assertion:
`public_core_unexpected_object_present`. It also cleaned exactly. Restart,
post-restart verification and rollback were not reached, so Local PostgreSQL
wiring is not Green and this remains `0 Product Progress`.

## Repository proof

- exact pull switch: commit `62ec61403c6432155e248c8448bf45baf657b15c`,
  tree `1a54b5e1203254d10ecff3266fc5e84b06c33be5`;
- verify-only correction: commit `f005cbef7b8f1f08e937f97626defb2c22e5e303`,
  tree `4be485cc5a163123524dd06774b3235d80f416cc`;
- corrected verify SHA-256:
  `f964e22b4a2b0a7989e6286e018d1436c3cec889216a9eb87a06a62e5c27df97`;
- schema and rollback SHA-256 remained `752affd9…cb00` and
  `317c5cab…878d`;
- focused rehearsal tests: `12 / 12` Green;
- constraint inventory static proof: `172 / 172`, with the old comparator's
  exact four-position mismatch locked by regression test;
- offline R4 regression: `587 passed / 0 failed / 111` frozen historical
  physical-runner tests skipped;
- spine/Room typecheck, docs audit and `git diff --check`: Green.

## Diagnostic invocation

- diagnostic run `5198b53151ef8858`: one exact anonymous pull, schema apply
  Green, then `public_core_constraint_inventory_drift`; exact residue `0`;
- final run `c431461828c2a578`: cached image and zero pull, schema apply Green,
  then `public_core_unexpected_object_present`; exact residue `0`;
- Docker host: client/server `29.3.1`, platform `linux/arm64`;
- all approved continuation ceilings are exhausted: pull `1 / 1`, full
  PostgreSQL lifecycles `2 / 2`;
- provider calls, real Guest records, production effects, public traffic and
  Gate C effects: `0`.

## What needs review

Do not run again or apply another narrow catalog patch. The latest assertion
combines several catalog predicates and does not identify which one disagreed.
Static review points to another mixed ordering domain in the `pg_type`
inventory, but that is only a hypothesis. The completed
[architecture review](./R4-POSTGRES-VERIFY-ARCHITECTURE-REVIEW.md) therefore
requires one complete body-free assertion vector before a consolidated
correction and any later final rehearsal. Production, real data, push, merge
and Gate C remain closed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

Current stop:

`POSTGRES_VERIFY_ARCHITECTURE_REVIEW_COMPLETE /
COMPLETE_BODY_FREE_ASSERTION_VECTOR_REQUIRED /
CONSOLIDATED_CORRECTION_ENVELOPE_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
