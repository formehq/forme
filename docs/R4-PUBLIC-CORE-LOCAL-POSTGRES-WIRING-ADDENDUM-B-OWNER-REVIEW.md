# R4 #67 Local PostgreSQL Wiring Addendum B — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-11
- Addendum B SHA-256:
  `sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f`
- Addendum proposal baseline HEAD / tree:
  `4313bd94e2a81761b4b25824b5eb82aa6396b6be` /
  `67233cc1ff81ec5c73b15cfcaa44fb9424d35d83`
- Prior Construction Packet:
  `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`
- Prior Owner Review:
  `sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca`
- Prior approved review wrapper HEAD / tree:
  `c878a5a534868482672838d39290e3f12e9d3b7f` /
  `d917fb7d2c9ade9b2d8acae5f5e7d4893e0c84c5`
- Gate C activation authority: **NOT_REQUESTED**

This Review is a short decision surface for the exact Addendum bound above.
The Addendum remains the complete authority surface and grants nothing until
the Owner approves its exact SHA-256 together with this Review's externally
computed SHA-256, the Addendum proposal baseline and the final wrapper
commit/tree containing this Review.

This file intentionally omits its own SHA-256 and the final wrapper binding;
both must be supplied externally after its bytes are frozen.

## Decision surface

Approval accepts all of the following together:

1. **One durable field and one check.** Add only
   `interactions.interaction_type text NOT NULL`, without a default, plus the
   dedicated `ck_interactions__type` check admitting exactly `ask`, `seed` or
   `resonance`. No consent column, table, index or unrelated constraint is
   added or changed.
2. **Exact workset and catalog.** Expand Stage A from 14 to exactly 17 paths by
   adding only `schemas/r4/public-core/schema.sql`,
   `schemas/r4/public-core/verify.sql` and
   `schemas/r4/public-core/rollback.sql`. Propagate the correction only through
   the Packet's already-listed PostgreSQL store, application-store bridge,
   local runner and focused tests. The corrected catalog is exactly 14 tables,
   207 columns, 172 constraints and 44 indexes.
3. **Cleanup truth.** Accept the disclosed preparation history: seven
   authorized Stage A paths were transiently changed in parallel lanes, every
   one was restored to the approved wrapper bytes, the bridge lane changed no
   owned Stage A path, and residual Stage A construction changes were zero at
   the Addendum freeze. There was no Docker call, OCI pull, database identity,
   database connection or SQL statement; there was no repository-command,
   package or source-control external-network effect and no product/runtime
   data-plane network effect. The disclosed Owner-directed Codex development
   channel is excluded from those scoped zero-effect claims.
4. **Old bindings invalid.** Treat all three prior SQL hashes listed in
   Addendum Section 5, the 14-path Stage A aggregate and the 206-column /
   171-constraint catalog as obsolete for physical execution. Any grant that
   binds one of them is invalid, cannot be amended or consumed, and must fail
   before Docker.
5. **Phase 1 is offline only.** Permit repository-local schema, bridge,
   PostgreSQL store, runner and test construction within the exact 17-path
   workset, plus injected/fake, deny-network and ordinary regressions. Permit
   freezing new SQL hashes, Stage A bindings and independent review. Permit no
   Docker or daemon access, OCI inspect/pull, PostgreSQL connection, database
   identity, SQL apply/verify/rollback, repository-command/package/source-control
   external network or product/data-plane network, production mutation, real
   data or runtime activation. The existing Owner-directed Codex development
   channel is disclosed and is not product/runtime or command network authority.
6. **Mandatory second approval.** Stop after the new SQL hashes and frozen
   Stage A bindings exist and independent review reports exactly zero Blocker
   and zero Important findings. OCI acquisition, Docker, database access and
   SQL execution remain forbidden until the Owner separately approves an
   exact Physical Rebind request and fresh one-use grant after that stop.

The one-Room model, exact 20 allowed actions, 25 unavailable operations and 14
tables remain unchanged.

## Phase 1 effect ceiling

| Effect | Maximum after exact approval |
|---|---:|
| Repository command / package / source-control external network | `0` |
| Product/data-plane network | `0` |
| Docker CLI / daemon calls | `0 / 0` |
| OCI inspect / pull | `0 / 0` |
| PostgreSQL connections / database identities | `0 / 0` |
| SQL apply / verify / rollback | `0 / 0 / 0` |
| Production or remote database effects | `0` |
| Runtime / route / Vault / HTTPS / traffic activation | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Product/runtime Provider / model / email messages | `0` |
| Deployment / publication / admission | `0 / 0 / 0` |
| Gate C activation | `0` |
| Merge / release / spend | `0 / 0 / US$0` |

Approval of this Review and Addendum does not restore the Packet's prior
physical effect ceiling. In particular, it does not authorize the pinned OCI
pull or disposable local PostgreSQL rehearsal. Those choices belong only to a
future Physical Rebind request.

## Required stop and unchanged false states

The best permitted Phase 1 result is:

`INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

At that stop, all of the following remain false or forbidden:

- Docker, OCI, PostgreSQL and SQL execution authority;
- production driver/pool configuration or migration;
- runtime/API route, Vault, HTTPS transport or traffic activation;
- deployment, publication, admission or real Guest use;
- Gate C readiness or activation;
- #67 Done or R4 Done; and
- merge, release or spend.

## Approval mechanics

Do not approve from this short Review alone. The final request must name:

- Addendum B SHA-256
  `a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f`;
- this Review's externally computed SHA-256;
- Addendum proposal baseline HEAD/tree
  `4313bd94e2a81761b4b25824b5eb82aa6396b6be` /
  `67233cc1ff81ec5c73b15cfcaa44fb9424d35d83`;
- the final wrapper HEAD/tree containing this Review; and
- an explicit approval of the six choices, the Phase 1 zero-effect ceilings,
  the mandatory Physical Rebind stop and the non-Gate-C end state.

Any changed Addendum or Review byte, baseline/wrapper binding, schema semantic,
workset, catalog count, effect ceiling or stop requires a newly frozen request.
