# R4 PostgreSQL verify architecture review

Status: `REVIEW_COMPLETE / CONSOLIDATED_CORRECTION_ENVELOPE_REQUIRED`,
2026-08-17.

## Plain-language result

The latest #77 failure is not evidence that the 14-table schema is wrong. The
schema applied twice, the exact 172-constraint inventory was proved, and the
ordering-only correction advanced the next lifecycle to a later assertion.

The larger problem is the shape of verification itself. `verify.sql` contains
18 body-free assertions, but it raises on the first failure. A physical run can
therefore reveal only one assertion even when several catalog assumptions are
wrong. Repeating a patch/run cycle one assertion at a time is the execution
pattern the management reset was intended to stop.

This review makes `0 Product Progress`. It performs no Docker, PostgreSQL, SQL,
provider, Guest, production, publication or Gate C effect.

## What is known

- The exact PostgreSQL 16.10 `linux/arm64` image is cached.
- Schema apply is physically Green.
- `public_core_constraint_inventory_drift` was a comparison-order defect, not
  a schema defect. The same 172 signatures were present.
- Commit `f005cbef7b8f1f08e937f97626defb2c22e5e303` corrected only that ordering.
- The final lifecycle passed the corrected assertion and stopped at
  `public_core_unexpected_object_present`.
- Five assertions after that point remain physically unobserved:
  check-constraint definition, forbidden columns, body-free tables, encrypted
  fields and composite Room scope.
- Every approved run cleaned its exact-owned resources; no lifecycle or pull
  authority remains.

## Architecture findings

### 1. The first-failure protocol causes serial discovery

The 18 `RAISE EXCEPTION` statements are ordered gates. The strict diagnostic
correctly exposes only an allowlisted identifier, but it cannot report the
truth of later predicates after an earlier predicate raises. This is safe but
operationally incomplete.

### 2. The current blocker has one high-confidence, unproven candidate

The broad unexpected-object assertion combines relation shape, an exact
28-type inventory and twelve forbidden object families. Repository DDL creates
exactly 14 tables, 9 explicit indexes and 172 constraints, with no explicit
routine, view/rule, policy, collation, conversion, operator, operator class,
operator family, extended statistic or text-search object.

PostgreSQL automatically creates one composite row type and one array type per
table. The query orders actual `pg_type.typname` values in the internal `name`
domain, but orders expected concatenated signatures as collatable `text` under
the database default locale. The official PostgreSQL image initializes with an
`en_US.utf8` default unless overridden, and the runner does not override the
container locale. This mixed ordering domain is the strongest static candidate
for the observed assertion. It is not yet physical proof because the assertion
does not reveal which subpredicate failed.

### 3. Other fixed inventories have implicit ordering

Table, index, key-constraint, foreign-key, explicit-index and encrypted-field
inventories contain order-sensitive comparisons without an explicit `C`
collation. Those earlier checks passed on the current target, but their contract
is less portable than their fixed expected arrays imply.

The catalog-manifest `string_agg` is different: its current framing and digest
must remain unchanged under the approved boundary. A correction must not alter
the schema shape, catalog-manifest query or stored signature result.

### 4. GitHub #77 is behind the repository truth

The issue still describes the earlier unnamed `P0001` stop. It does not record
the exact pull, the two named assertions, the proven ordering correction, the
exhausted lifecycle budget or the architecture-review next action. Repository,
issue and project control must be reconciled before implementation resumes.

## Recommended consolidated correction path

1. Add one hash-pinned, read-only diagnostic that evaluates every verify
   predicate and returns only a closed ordered list of assertion identifiers.
   It must return no PostgreSQL message, SQL, catalog name or data value.
2. Keep `schema.sql`, `rollback.sql`, schema shape, expected inventory sets and
   the catalog-manifest algorithm/result unchanged.
3. Use repository tests to prove all fixed inventory comparisons have one
   explicit ordering contract and that the diagnostic covers all 18 predicates
   without changing their meaning.
4. Under a later medium-grained runtime envelope, use the cached image and no
   pull for one diagnostic lifecycle. If its complete vector matches the
   reviewed false assumptions, apply one consolidated verify-only correction.
   Otherwise stop without correction.
5. Permit at most one final full lifecycle after that correction to prove
   initial verify, restart persistence, post-restart verify, rollback and exact
   cleanup. There is no third run or assertion-by-assertion continuation.

## Required later runtime boundary

- cached exact image only; image pull `0`;
- diagnostic lifecycle at most `1`;
- corrected full lifecycle at most `1`;
- unique synthetic resources and exact-owned cleanup;
- no real Guest/provider data, production, public traffic, push, merge or Gate
  C effect;
- stop immediately on an unexpected diagnostic vector, ambiguous effect or
  cleanup failure.

## Current stop

`POSTGRES_VERIFY_ARCHITECTURE_REVIEW_COMPLETE /
COMPLETE_BODY_FREE_ASSERTION_VECTOR_REQUIRED /
CONSOLIDATED_CORRECTION_ENVELOPE_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
