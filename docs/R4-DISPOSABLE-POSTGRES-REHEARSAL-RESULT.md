# R4 disposable PostgreSQL rehearsal result

Status: `FAILED_CLEAN / RESTART_PERSISTENCE_GREEN / ROLLBACK_GUARD_UNIDENTIFIED`,
2026-08-17 through 2026-08-18.

## Plain-language result

The larger local campaign materially narrowed #77. The exact PostgreSQL 16
image was acquired once. Run `eec5b2c54651d075` exposed a startup-handshake
disconnect, and run `ac4b54f5c5fe0be8` proved schema plus initial verify before
Docker assigned the restarted container a new random loopback port. Two
bounded repository corrections closed those two controller defects.

Runs `2be1317fe91bd165` and `7dca9ef5bf763039` then both applied the exact
schema, passed initial verify, restarted the same owned container, reached
restart readiness on its freshly observed loopback port, passed post-restart
verify and proved seed persistence. This is the first direct physical proof of
that complete chain in the simplified harness.

Both runs stopped at the rollback guard with the same body-free PostgreSQL
diagnostic: `P0001 / ERROR / exec_stmt_raise`. The third and final repository
repair aligned rollback's table/index inventory ordering with verify's explicit
text `C` ordering, but the final lifecycle returned the same closed diagnostic.
The result membrane does not identify which allowlisted rollback guard raised
it, so another blind SQL change or fifth lifecycle would be guesswork.

Every run removed its exact-owned container, network, volume, credential and
runtime directory. The final run used the cached image and performed no pull.
Production, real/private data, provider/public effects and Gate C remained
zero. The campaign budget is exhausted at repository repairs `3 / 3`, full
lifecycles `4 / 4`, acquisition attempts `1 / 2` and pulls `1`.

Repository validation after the final repair is Green: focused rehearsal
`22 / 22`, offline R4 `598 / 598` with `111` frozen historical skips,
TypeScript, documentation audit and `git diff --check`.

## Next bounded decision

Do not rerun the current harness. The next useful change is a strict body-free
rollback-assertion vector that reports only the predefined rollback guard ID.
A future medium-sized campaign can then use one diagnostic lifecycle, make at
most one contract-preserving rollback-only correction if the result warrants
it, and use at most one final lifecycle. That is a new campaign boundary, not
an ordinary retry.

Current stop:

`LOCAL_DISPOSABLE_POSTGRES_CAMPAIGN_FAILED_CLEAN /
SCHEMA_INITIAL_VERIFY_RESTART_POST_RESTART_VERIFY_PERSISTENCE_GREEN /
ROLLBACK_GUARD_UNIDENTIFIED / EXECUTION_BUDGET_EXHAUSTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

## Historical pre-campaign result

## Repository-only restart-readiness correction

The retained v1 result cannot identify which readiness layer failed: it did not
persist the 30 attempted restart probes and did not record a post-start running
state or stable-port proof. The Owner-approved repository correction replaces
that blind spot with result v2: exact failed attempt counts, seven closed
body-free readiness outcomes, a shared production/test controller, and a
post-restart running-container plus freshly observed loopback-port check.
Docker may assign a new random host port when the same exact container starts
again; the controller binds the restart probe to that newly proven single
loopback port. The gate is bounded to at most 60 attempts and 60 seconds.

This correction used no Docker, socket, PostgreSQL or SQL effect and does not
reinterpret the old run. It is organized for review in
[`R4-REVIEWABLE-INTEGRATION-PACKAGE.md`](./R4-REVIEWABLE-INTEGRATION-PACKAGE.md).

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
- replacement diagnostic entry: commit `16bd930a3e0171c9d5b26d1d09cdbb1111be5f24`,
  tree `6a4daf093a2c8355fa393487bf0aaacf5ea2e45a`;
- consolidated inventory-ordering correction: commit
  `e8db0e47bccdf51d47cc98f0ce17278bc5ea1115`, tree
  `5618016267368b52f47204fd06d6f187205584df`, corrected verify
  `sha256:1b05175a925a2a8c614976c0e70700b6f9b7dab1fd59557d0eef6edb0f64c85e`;
- current validation: focused `22/22`, offline R4
  `598/598` with `111` historical physical skips, spine `45/45`, Gate-B Core
  final rerun `146/146`, typecheck/docs/diff Green.

## Diagnostic invocation

- diagnostic run `5198b53151ef8858`: one exact anonymous pull, schema apply
  Green, then `public_core_constraint_inventory_drift`; exact residue `0`;
- final run `c431461828c2a578`: cached image and zero pull, schema apply Green,
  then `public_core_unexpected_object_present`; exact residue `0`;
- complete-vector run `58fde18b4ff6cde3`: cached-only image inspect reported
  exact image absent; zero pull, zero resource creation, zero PostgreSQL/SQL,
  exact residue `0`;
- replacement vector run `0dddf25aee37504c`: one exact pull, schema apply,
  all `18/18` assertions evaluated, sole identifier
  `public_core_unexpected_object_present`, exact residue `0`;
- final run `71ac0e393653db72`: cached image, schema apply and initial verify
  Green, one restart, then `disposable_postgres_readiness_exhausted` at
  `postgres.readiness.restart`; rollback not reached; exact residue `0`;
- Docker host: client/server `29.3.1`, platform `linux/arm64`;
- all replacement ceilings are exhausted: pull `1 / 1`, diagnostic `1 / 1`,
  consolidated correction `1 / 1`, final lifecycle `1 / 1`;
- provider calls, real Guest records, production effects, public traffic and
  Gate C effects: `0`.

## Historical review stop (superseded by the local campaign above)

Do not rerun. The catalog-expression correction is physically proved through
the initial verify, but restart readiness, post-restart verification,
persistence and rollback are not Green. A new Owner decision is required for
any further diagnosis or lifecycle. Production, real data, push, merge and
Gate C remain closed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

Current stop:

`POSTGRES_VERIFY_CONSOLIDATED_CORRECTION_FINAL_LIFECYCLE_FAILED_CLEAN /
INITIAL_VERIFY_GREEN / RESTART_READINESS_FAILED / ROLLBACK_NOT_REACHED /
EXECUTION_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

Repository stop:

`POSTGRES_RESTART_READINESS_CONTROLLER_REPOSITORY_GREEN /
REVIEWABLE_INTEGRATION_PACKAGE_READY / PHYSICAL_EXECUTION_NOT_REQUESTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
