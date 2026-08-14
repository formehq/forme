# R4 #67 Blocked-Cleanup Rescue — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Rescue Card SHA-256:
  `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf`
- Rescue Card commit `CR` HEAD / tree:
  `fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5` /
  `4bebb6ea518b9b86e0fed75b9b09925cfc013c91`
- correction status `Md` HEAD / tree:
  `32027d539cf043d14c6970ea9844a0e49fb284aa` /
  `5cae21de32d54d967e52fc96a53645ca73082dfc`
- canonical rescue authority payload:
  `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e`
- Cleanup Rescue: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Further Physical Execution / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Review is the short decision surface for the exact
[Blocked-Cleanup Rescue Card](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-CARD.md).
It creates no pending grant and performs no Docker, OCI, PostgreSQL, SQL,
network, production or forensic-root effect. It authorizes nothing until the
Owner later approves the committed Card SHA/HEAD/tree, this Review's externally
computed SHA/HEAD/tree and every choice below.

This file intentionally omits its own SHA-256 and future containing commit/tree,
the Owner approval receipt, fresh rescue-root and host identities, pending or
consumed rescue grant, rescue journal/receipt and every later Physical
Execution or Gate C hash. They do not yet exist and must not be guessed.

## Nine Owner choices

Exact rescue approval accepts all nine choices together:

1. **Preserve the FAILED/BLOCKED truth.** Bind consumed physical grant
   `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`,
   first failed evidence
   `sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7`,
   final blocked evidence
   `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`
   and journal 34 /
   `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`.
   The old grant is permanently consumed; the old rehearsal remains
   `FAILED / cleanup BLOCKED`, never Green.
2. **Bind the exact correction and payload.** Bind Kd/Ld/Md, G2d/G10d,
   committed-Md audit, index/schema/evidence/report, runner/test and canonical
   payload
   `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e`
   exactly as listed below. Require direct
   `Md -> CR -> RR` single-parent, single-path additions and a clean tracked
   worktree. Any byte, topology or Git-action drift stops before prepare.
3. **Authorize one rescue prepare only within its membrane.** Permit creation
   of one fresh current-uid mode-0700 rescue root and one no-follow mode-0600
   pending `cleanup-rescue-grant.v1`, with one external Owner rescue-approval
   receipt, random grant ID and lifetime no longer than 24 hours. Prepare must
   freshly revalidate the old canonical root/inode/four files and fresh
   CLI/socket identities, but it may not call Docker or mutate the old root.
4. **Authorize one consumption and one lifecycle only.** The pending rescue
   grant may transition to consumed once and enter exactly one cleanup-rescue
   lifecycle. Duplicate consume, re-entry, retry, second lifecycle or reuse of
   the old physical grant is forbidden.
5. **Approve only exact-name, exact-label cleanup.** Permit one Docker version
   check and exact-name container/network/volume inspections. A present object
   must carry exactly
   `forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976`
   before any mutation. Permit only exact-owned container stop/remove, network
   remove and volume remove followed by exact absence re-inspection. Foreign,
   wrong-name, wildcard/list/filter or uncertain ownership is `BLOCKED`.
6. **Approve the exact Docker ceilings and nothing else.** Maximum calls are
   version 1; container/network/volume inspect 2 each; container stop/remove 1
   each; network/volume remove 1 each. Image inspect/pull, container
   create/start, network/volume create and every unlisted Docker kind are zero.
   No port, secret, credential, `pg`, PostgreSQL, database, SQL, application or
   production effect is allowed.
7. **Require write-ahead, no replay and exact diagnostics.** Every Docker call
   reserves its durable counter before invocation. A crash or ambiguous result
   consumes that budget and may only publish truthful `BLOCKED` evidence; it
   may not replay Docker. Only the corrected full-line, status-1,
   empty-stdout, single-line, exact-name missing diagnostics are
   `MISSING_EXACT`; every near miss stops mutation.
8. **Require exact cleanup and forensic evidence.** Rescue Green requires all
   three exact names proven absent, zero open effects, zero rescue-local
   transient residue, exactly four retained rescue forensic entries and the
   old four-entry forensic root unchanged. Failure, foreign ownership, host or
   root drift, malformed output or uncertainty preserves both roots and
   returns `BLOCKED` for a new rescue decision.
9. **Stop before another rehearsal or Gate C.** Cleanup Rescue Green proves
   absence only. It does not prove PostgreSQL 16.10, target catalog
   14 / 207 / 172 / 44, apply/verify/restart/rollback/domain flow, production
   runtime, traffic, #67 Done or R4 Done. After Green, stop for a fresh
   one-use Physical Execution Card/Review V3. Physical Execution and Gate C
   remain `NOT_REQUESTED` now.

## Exact correction and historical bindings

| Binding | Exact value |
|---|---|
| `R2` HEAD / tree | `6e67c1f1867d73f27674a5f056e0692c5b42d6a3` / `60b3d7b124968a20f6ec30700d389849dd277ab2` |
| Correction Addendum / Review SHA | `sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9` / `sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4` |
| Kd HEAD / tree / G2d | `0fdf68c7c786085189c3df0787df07f366c6df5b` / `5f091925b8b48cbd515700b275465506a391ccde` / `sha256:25dba2e75ca042e8c20e096ddaf9f5ee24506fab678a0a0f33366edd8ecebe22` |
| Ld HEAD / tree | `62d0c98d7052998b7bb69b76c83f60576091836b` / `4673f445021f0d4a92c6e01e4bdccbb303141e0a` |
| Md HEAD / tree / G10d | `32027d539cf043d14c6970ea9844a0e49fb284aa` / `5cae21de32d54d967e52fc96a53645ca73082dfc` / `sha256:15339dbc10ecfd60dd5cd27e47b58d9284682873eb02afffa0c63d75dc4c1334` |
| committed-Md audit | `sha256:d175d42b0768e0d4d216de98a49c9e038bc4cdd2df7312f794bb9a2c19036afd` |
| index / schema / evidence | `sha256:0dc154f786646243a13d500b0a41ae31cbcba42b15d1ed426503bf72d6ba2b4b` / `sha256:57a96cf603e393e1eb8849e2c6a3e7b10f9d143a3c249456936dd48a05d440be` / `sha256:9a6296c94ab0d4dee89449b7873a6cf04fec3a8e89f64170bca5eda9043a4ee3` |
| report / runner / test | `sha256:ccae05f1b44caea794b7b55e4a5bbf9796482dc1ad4d2a7a84771f1ebf9ad19f` / `sha256:42d1c7b6640fd984a702922685cfc92181966318b7801606d17cacbf40b77f08` / `sha256:2c600732115b1e755a13af9fffd074b90831da69ea24beb1dde0635b16862cbd` |
| Rescue Card SHA / CR HEAD / tree | `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf` / `fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5` / `4bebb6ea518b9b86e0fed75b9b09925cfc013c91` |
| canonical rescue payload | `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e` |

The old private root is
`/private/tmp/forme-r4-pg-9ZGIOLeX`, device/inode/mode/uid
`16777231 / 32871902 / 0700 / 501`, with exactly
`grant.consumed.json`, `journal-v3`, `owner-approval-receipt` and
`physical-evidence.json`. The old container/network/volume are exactly:

- `forme-r4-public-core-local-b92ae04555cc3d69`
- `forme-r4-public-core-local-net-b92ae04555cc3d69`
- `forme-r4-public-core-local-vol-b92ae04555cc3d69`

The fixed Docker host contract is absolute CLI
`/Applications/Docker.app/Contents/Resources/bin/docker`, bytes
`sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a`,
client/server `29.3.1` and platform `linux/arm64`. CLI file identity and local
socket identity remain fresh prepare-time fields and cannot be supplied by
this Review.

## Exact approval mechanics

A later approval must externally name all of:

- Rescue Card SHA
  `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf`
  and CR HEAD/tree
  `fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5` /
  `4bebb6ea518b9b86e0fed75b9b09925cfc013c91`;
- this Review's externally computed SHA-256 and its direct-child RR HEAD/tree;
- Md/G10d/committed-Md audit and canonical payload SHA;
- all nine choices, exact historical root/evidence/resource bindings, Docker
  call ceilings, one-use/no-retry/write-ahead/exact-cleanup rules; and
- explicit authority for one rescue prepare plus the same binding's one
  cleanup-rescue consumption/lifecycle, while keeping Physical Execution,
  production and Gate C `NOT_REQUESTED`.

Any changed byte, omitted choice, alternate path or broader effect requires a
new Card/Review. Approval of correction construction is not rescue approval.

## Zero effects of Card and Review construction

| Effect | Actual / authorized now |
|---|---:|
| added proposal paths / commits | `2 / 2` |
| pending / consumed rescue grants | `0 / 0` |
| old forensic-root reads or mutations | `0 / 0` |
| Docker CLI / daemon / OCI | `0 / 0 / 0` |
| PostgreSQL process / connection / database | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| product network / production / runtime / traffic | `0 / 0 / 0 / 0` |
| Provider / model / email | `0 / 0 / 0` |
| deployment / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

## Mandatory stops

Before a later exact Owner approval:

`LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a genuinely Green separately approved rescue and independent receipt
audit:

`LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Do not prepare or consume a rescue grant from this Review alone. Do not begin
a fresh Physical Execution or Gate C.
