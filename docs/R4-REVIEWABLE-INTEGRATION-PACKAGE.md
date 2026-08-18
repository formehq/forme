# R4 reviewable integration package

Status: `LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN /
REVIEWABLE_INTEGRATION_BRANCH_REFRESH_APPROVED / MERGE_NOT_REQUESTED`,
2026-08-18.

## User outcome

Present the current Durable Public Core and physically Green disposable
PostgreSQL boundary as one reviewable #67 integration change. A reviewer should
not need to reconstruct the historical one-use Card/Addendum/Review chain.

This package creates no direct Product Progress. It makes the already-built
product persistence boundary reviewable so #67 can proceed to integration,
activation and one Owner-experienced Guest encounter.

## What is now proven

Final local run `69ac02f4e8dfbf01` used the exact PostgreSQL 16
`linux/arm64` digest and passed:

1. schema apply;
2. initial verify;
3. one same-container stop/start;
4. restart readiness on the freshly observed loopback port;
5. post-restart verify;
6. installation-seed persistence;
7. rollback apply;
8. schema-absence proof; and
9. exact container, network, volume, credential and runtime cleanup.

The preceding body-free diagnostic evaluated all 10 rollback guards and named
only `public_core_rollback_catalog_manifest_drift`. The catalog was unchanged:
rollback lacked the transaction-local `search_path` used by schema and verify
when PostgreSQL deparsed catalog text. Commit `360ed6c` corrected only that
observation context. It changed no table, constraint, business meaning,
inventory or catalog-signature algorithm.

Production, real/private data, provider/public effects and Gate C remained
zero. The exact image may remain in the local cache; every disposable runtime
resource is absent.

## Three review slices

The historical local line is too large to review as one chronological diff.
The integration branch therefore preserves three conceptual slices:

1. **Product persistence.** The `public-core-*` application, Postgres store and
   executor, the three SQL artifacts, contract tests and package bindings.
2. **Disposable proof.** The bounded rehearsal runner, focused tests, concise
   result and machine evidence. This is development infrastructure, not a
   product capability.
3. **Operating truth.** The working agreement and the small current-status
   surfaces that explain the present gate and Owner-review path.

The already-constructed branch begins directly above Draft PR #76 head
`c831b4d5253049c4581d3c576aea59648d699d97` with these three commits:

1. product persistence `30822612145e46dee6c9210e484abf2715907f3b`;
2. disposable PostgreSQL proof `773ac10b2cd47fb5584a93412cb8bf588e6b3510`;
3. operating truth `1aa5c18a06a60bd3b3fc1fbac750ee8f75edcc52`.

The approved refresh adds only the later proof-closing implementation/evidence
and current operating truth. Historical authority documents and failed-run
artifacts remain outside the review branch as archive evidence.

## Validation and demo

Current source validation before the branch refresh:

- focused disposable PostgreSQL tests: `26 / 26`;
- offline R4 regression: `602 passed / 0 failed / 111` historical skips;
- spine and Room TypeScript checks: Green;
- document audit and `git diff --check`: Green;
- final physical proof: `GREEN`, exact-owned residue `0`.

Runnable repository-only proof:

```sh
node --import ./scripts/deny-external-network.mjs --test test/r4/disposable-postgres-rehearsal.test.ts
```

The Draft PR must also run the product persistence tests, full offline R4,
typecheck and document audit against its own bytes. Remote CI is not inferred
until that branch is pushed and checked.

## Owner review focus

- Is the product-persistence slice understandable without the governance
  archive?
- Does the typed PostgreSQL adapter preserve the already-approved privacy,
  one-use, replay, retention and rollback contracts?
- Does the result clearly distinguish Enabler Green from #67 Product Progress?
- Is the next activation boundary explicit enough to prevent an accidental
  Production, publication, real Guest or Gate C effect?

Passing this review is Technical Review only. Merge remains separately
controlled. The next user-visible acceptance point is one real Public Room and
bounded Guest knock, not another PostgreSQL rehearsal.

Current stop:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN /
REVIEWABLE_INTEGRATION_DRAFT_PR_REQUIRED / MERGE_NOT_REQUESTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
