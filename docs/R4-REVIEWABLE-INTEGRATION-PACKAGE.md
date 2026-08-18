# R4 consolidated integration package

Status: `LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN /
CONSOLIDATED_MAIN_INTEGRATION_CI_GREEN / PRODUCT_INTEGRATION_REQUIRED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`, 2026-08-18.

## User outcome

Present the current R4 repository result as one understandable integration
change targeting `main`: the offline Public Room boundary, Durable Public Core,
concrete PostgreSQL persistence bridge and physically Green disposable
PostgreSQL proof.

This package removes the persistence blocker. It creates no direct Product
Progress and does not claim that a real visitor can complete the #67 encounter.

## Consolidated review shape

[Draft PR #78](https://github.com/formehq/forme/pull/78) now targets `main`
directly. Its reviewed code baseline is
`5338f04f3d4fa557957af6a5b7ce6bfbcab4c189`. At consolidation time the
main-to-head history contained 63 commits and 352 changed paths; the GitHub
merge tree was byte-identical to the reviewed head tree. Fresh main-base CI
run `32185336840` passed.

The former stacked Draft PRs #65, #73, #75 and #76 are closed without merge.
They remain historical review surfaces. Their branches are not activation or
production authority and no longer form the current review route.

Later documentation-only hygiene commits may move the PR tip while preserving
the reviewed code baseline above. PR metadata and its exact CI checks are the
outer binding for the current tip; this file never self-binds its own commit.

## What the tree proves

### Product persistence

- a closed walking-slice application boundary;
- a concrete `pg` executor and 20-method PostgreSQL application-store bridge;
- exact, data-only snapshot/config membranes;
- the approved public-only policy, retention, one-use and replay contracts;
- PostgreSQL schema, verify and rollback artifacts with fixed catalog
  signatures.

### Disposable physical proof

Final run `69ac02f4e8dfbf01` used the exact PostgreSQL 16 `linux/arm64`
image and passed:

1. schema apply;
2. initial verification;
3. one same-container stop/start;
4. readiness on the freshly observed loopback port;
5. post-restart verification;
6. installation-seed persistence;
7. rollback;
8. schema-absence proof; and
9. exact container, network, volume, credential and runtime cleanup.

The preceding closed diagnostic named only
`public_core_rollback_catalog_manifest_drift`. Rollback lacked the
transaction-local `search_path` already used by schema and verify when
PostgreSQL deparsed equivalent catalog text. Commit `360ed6c` corrected only
that observation context; schema shape, business meaning, inventory and
catalog-signature logic did not change.

## Validation

The reviewed code baseline passes:

- repository spine `45 / 45`;
- R4 `602 / 602`;
- historical Gate-B `145 / 145`;
- focused product persistence `89 / 89`;
- disposable PostgreSQL proof `26 / 26`;
- TypeScript and Room no-AI checks;
- documentation and diff checks; and
- GitHub Actions run `32185336840`.

Independent review found and fixed one ordinary bridge-membrane omission in
commit `c698955b0a8c884de03fe7cea6a550b745192667`: constructor configuration is
exact data-only input, and prepared-store arrays cannot hide non-index
properties or exceed the bounded snapshot size. No SQL, schema, durable data,
runtime authority or physical result changed.

## Data and permission impact

- Synthetic disposable PostgreSQL data only; exact owned residue is zero.
- No production migration, deployment, real/private Guest data, Provider call,
  publication, public traffic, external message, production secret, spend or
  Gate C effect.
- The reviewable branch intentionally omits the large chronological physical
  authority archive. Hash-bound history remains evidence; it is not copied
  back into the integration solely for completeness.

## Remaining product gate

Passing this package is Technical Review, not R4 Done. Before merge and Owner
Experience Acceptance, #67 still needs one separately bounded activation
outcome covering:

1. product runtime wiring;
2. publication and Curator admission;
3. one real bounded Guest encounter;
4. exact response review; and
5. Owner acceptance of the experienced flow.

Draft PR review does not authorize Production or Gate C. The next review
surface should be one medium/large outcome envelope, not another per-file or
per-hash approval chain.
