# R4 #67 Local PostgreSQL Physical Rebind — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-12
- Physical Rebind Packet SHA-256:
  `sha256:3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa`
- Packet proposal `P` HEAD / tree:
  `697334c169c9ec69d44ecb38529d7108839f886b` /
  `71c6b4197eed649814276a4536b6a40690eefd05`
- Phase-1 Stage-B baseline `S` HEAD / tree:
  `2b49f6ad939993b9ff6a106fab327529a40fa20d` /
  `b40e967965d9d8878e21f2b5deff5df7aceed7f7`
- Stage-B nine-artifact aggregate `G9`:
  `sha256:cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b`
- One-use local physical execution authority: **NOT_REQUESTED**
- Gate C activation authority: **NOT_REQUESTED**

This Review is the short decision surface for the exact Packet above. The
Packet remains the complete authority and implementation contract. Neither
document authorizes a runner, test, evidence or status change until the Owner
approves the exact Packet SHA-256 together with this Review's externally
computed SHA-256, `S`, `P` and the final Review wrapper `W` HEAD/tree.

This file intentionally omits its own SHA-256 and the future `W` HEAD/tree.
Both must be supplied externally after these bytes are frozen; embedding
either would create self-reference.

## Six Owner choices

Approval accepts all six choices together:

1. **Accept the mandatory Effect-0 / Effect-1 split.** The Phase-1 runner is
   correctly frozen to the predecessor 17-path/Addendum-B topology, while the
   current construction is `J/G19` followed by `S/G9`. Rebinding the runner
   changes its own bytes, so repository construction and one-use physical
   execution cannot share one approval. Approve only Effect 0 now. Effect 1,
   Docker, OCI, PostgreSQL and SQL remain separately approvable later.
2. **Approve exactly fifteen Effect-0 paths and three commits.** Require the
   direct-child chain `S -> P -> W -> K -> L -> M`. `K` modifies only the two
   runner paths; `L` adds only the three machine-evidence paths; `M` adds one
   report and modifies only nine operational-status paths. Total: exactly
   eleven modified plus four new paths. The two authority documents are
   inputs, not Effect-0 artifacts. No fourth construction commit, sixteenth
   path, rename, deletion or mode change is allowed.
3. **Approve the closed v3 construction contract.** Require the Packet's exact
   grant/receipt keys, canonical execution-Card payload, prepare API/CLI,
   no-follow private-root and approval-receipt membrane, fresh CLI/socket
   identity, at-most-24-hour one-use lifetime, atomic consume, durable
   write-ahead counters and cleanup-only recovery. Require the exact
   23-invocation / 20-distinct-action contract, cached/pulled Docker vectors,
   bounded readiness/connection formulas, current SQL/catalog bindings and
   separate physical target-catalog observation. Reject v1/v2, the 17-path/
   Addendum-B-only topology, the old 14-path aggregate, obsolete SQL and every
   missing, extra or mismatched binding before Docker entry.
4. **Freeze the future physical safety envelope as design only.** Construct
   checks for one exact-owned loopback stack, at most one pinned anonymous OCI
   pull, one construction plus at most two cleanup-only lifecycles, two
   run-owned databases, one same-container restart, PostgreSQL `16.10`, exact
   `14 / 207 / 172 / 44` target catalog, three schema applies, three verifies,
   one rollback, exact action flow and exact-owned cleanup. Complete pinned
   image cache is the only permitted daemon residue; partial/unknown cache or
   identity drift blocks Green and returns for separate rescue authority. This
   choice does not authorize any of those effects.
5. **Require strict offline evidence and status alignment.** Run every exact
   deny-network/offline/typecheck/no-AI/docs/diff lane in the Packet; hostile-
   test every authority, lineage, grant, crash, concurrency, cleanup and
   evidence boundary; freeze `K`, then `L`, then `M`; and require independent
   latest-byte and committed-byte audits with zero Blocker and zero Important
   findings. `L` must retain its interim status; only `M` may align the exact
   nine operational-status surfaces. The post-`M` acceptance audit remains
   external and is bound only by a later Effect-1 Card.
6. **Preserve zero effects and the exact stop.** Permit no repository-command,
   package or source-control external network; Docker/daemon or OCI;
   PostgreSQL/database or SQL; production/runtime/route/Vault/HTTPS/traffic;
   real data; product/runtime Provider/model/email; deployment/publication/
   admission; push/PR; Gate C; merge/release or spend. Stop only at
   `LOCAL_POSTGRES_PHYSICAL_REBIND_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
   ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`.

## Exact Effect-0 workset

### `K`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `L`: exactly three new paths

1. `docs/evidence/r4-public-core-local-postgres-physical-rebind.json`
2. `schemas/r4/public-core/local-postgres-physical-rebind-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-physical-rebind-evidence.schema.json`

### `M`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Every other application, runtime, route, dependency, lock, SQL, schema,
historical authority/evidence and product path remains byte-identical.

## Effect-0 ceiling

| Effect | Maximum after exact approval |
|---|---:|
| Tracked construction paths | `15` (`11` modified + `4` new) |
| Construction commits | `3` (`K` + `L` + `M`) |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository-command / package / source-control external network | `0` |
| Push / PR | `0 / 0` |
| Docker CLI / daemon calls | `0 / 0` |
| OCI inspect / pull | `0 / 0` |
| PostgreSQL processes / connections / database identities | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain statements | `0 / 0 / 0 / 0` |
| Product/data-plane network | `0` |
| Production or remote database effects | `0` |
| Runtime / route / Vault / HTTPS / traffic activation | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Product/runtime Provider / model / email messages | `0` |
| Deployment / publication / admission | `0 / 0 / 0` |
| Gate C activation | `0` |
| Merge / release / spend | `0 / 0 / US$0` |

The Owner-directed Codex development/control channel is disclosed and excluded
from the scoped repository-command and product/runtime zero-effect claims. No
external source-control operation is authorized.

## Required truth at the stop

Approval does not claim that the runner is already rebound. If Effect 0
completes and its external committed-byte audit is Green, only the following
new statements may become true:

- the runner is bound to exact `J/G19`, `S/G9` and `P/W/K/L/M`;
- v3 grant/receipt and future safety checks are constructed and deny-network
  tested; and
- Effect-0 machine evidence and the scoped operational-status cockpit are
  frozen and independently audited.

Docker, OCI, PostgreSQL, SQL, target-catalog observation and a one-use physical
grant remain false. Production pool/migration, runtime/API route, Vault, HTTPS,
public traffic and Gate C remain false. #67 and R4 remain open; merge, release
and spend remain forbidden.

## Approval mechanics

Do not approve from this short Review alone. The final exact approval request
must externally name:

- Packet SHA-256
  `3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa`;
- this Review's externally computed SHA-256;
- Stage-B baseline `S` HEAD/tree
  `2b49f6ad939993b9ff6a106fab327529a40fa20d` /
  `b40e967965d9d8878e21f2b5deff5df7aceed7f7` and `G9`
  `cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b`;
- Packet proposal `P` HEAD/tree
  `697334c169c9ec69d44ecb38529d7108839f886b` /
  `71c6b4197eed649814276a4536b6a40690eefd05`;
- the externally supplied final Review wrapper `W` HEAD/tree; and
- explicit approval of all six choices, the exact fifteen-path/three-commit
  workset, every Effect-0 zero ceiling and the exact three-part stop.

Any changed Packet or Review byte, non-direct parent, alternate workset,
effect ceiling, topology or stop requires a newly frozen request. Effect 1
remains a later, separate Owner decision even after Effect 0 is Green.
