# R4 disposable PostgreSQL rehearsal result

Status: `FAILED_CLEAN / COMPLETE_VECTOR_NOT_OBSERVED`, 2026-08-17.

## Plain-language result

The complete 18-predicate body-free diagnostic reached repository Technical
Review Green at commit `934e760`. Its single cached-image invocation, run
`58fde18b4ff6cde3`, observed Docker `29.3.1 / linux/arm64` but found the exact
image absent. It made no pull, created no resource and reached no PostgreSQL or
SQL. All exact-owned names and the private runtime root are absent. Because no
assertion vector was observed, the conditional correction and final lifecycle
remain locked.

Earlier in the same #77 history, the one approved anonymous pull acquired the
exact PostgreSQL `linux/arm64` digest. The first full diagnostic lifecycle
applied the complete schema and named `public_core_constraint_inventory_drift`.
It then removed its container, network, volume, credential and runtime
directory.

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
- complete assertion-vector construction: commit
  `934e76009c4628c557f533e5e5bc0657d6071b04`, tree
  `0823d0ca15bf1dff391ccb4b985fa634352cef67`, derived diagnostic SQL
  `sha256:395403c01b38f259f76a986af84a9cc7082cfbd01b90ec79522bb2a65c9fb8fc`;
- current validation: focused `16/16`, offline R4
  `591/591` with `111` historical physical skips, spine `45/45`, Gate-B Core
  final rerun `146/146`, typecheck/docs/diff Green.

## Diagnostic invocation

- diagnostic run `5198b53151ef8858`: one exact anonymous pull, schema apply
  Green, then `public_core_constraint_inventory_drift`; exact residue `0`;
- final run `c431461828c2a578`: cached image and zero pull, schema apply Green,
  then `public_core_unexpected_object_present`; exact residue `0`;
- complete-vector run `58fde18b4ff6cde3`: cached-only image inspect reported
  exact image absent; zero pull, zero resource creation, zero PostgreSQL/SQL,
  exact residue `0`;
- Docker host: client/server `29.3.1`, platform `linux/arm64`;
- all approved continuation ceilings are exhausted: pull `1 / 1`, full
  PostgreSQL lifecycles `2 / 2`;
- provider calls, real Guest records, production effects, public traffic and
  Gate C effects: `0`.

## What needs review

Do not rerun or apply a catalog patch. The complete vector remains unobserved
because the exact cache entry disappeared. A new Owner decision would need to
choose whether one exact pull plus one replacement diagnostic and the retained
conditional final lifecycle are worthwhile. Production, real data, push,
merge and Gate C remain closed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

Current stop:

`POSTGRES_VERIFY_ASSERTION_VECTOR_DIAGNOSTIC_FAILED_CLEAN /
EXACT_IMAGE_NOT_CACHED / DIAGNOSTIC_INVOCATION_CONSUMED /
COMPLETE_VECTOR_NOT_OBSERVED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
