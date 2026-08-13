# R4 #67 Local PostgreSQL Physical Rebind — Effect-0 Construction Report

- Status: **TECHNICAL_REVIEW_GREEN**
- Updated: 2026-08-13
- Scope: repository-only Physical Rebind construction
- Effect-1 one-use physical execution: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**
- Whole-repository documentation current: **false**

## Outcome

The Owner-approved Effect-0 Physical Rebind construction is committed and
reviewable. The runner now binds the 19-artifact Stage-A implementation, the
nine-path Stage-B evidence freeze, the Packet/Review authority chain, the
committed implementation (K), and the committed machine-evidence freeze
(L). It constructs a strict v3 pending-grant/receipt membrane, durable
write-ahead effect accounting, exact cleanup recovery and deny-network fake
validation.

This is not a physical rehearsal. Docker, OCI, PostgreSQL, SQL, production,
runtime, traffic and Gate C effects remain zero. No target PostgreSQL server or
catalog was observed.

## Authority and topology

The approved authority artifacts are:

| Artifact | Exact binding |
|---|---|
| Physical Rebind Packet | `sha256:3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa` |
| Physical Rebind Owner Review | `sha256:9ce9a8dfedca0e85deabb9b490055eda9662e492d3b3b51cabeaab1ec2afc9bf` |
| Packet commit / tree (P) | `697334c169c9ec69d44ecb38529d7108839f886b` / `71c6b4197eed649814276a4536b6a40690eefd05` |
| Review commit / tree (W) | `1d9d8ec7d419c90777295099d794ff04f8f476ce` / `257cc30066e669a456916033d5664fc135b7da3c` |

The exact direct-child chain is:

`S 2b49f6a… → P 697334c… → W 1d9d8ec… → K bcfe334… → L beeb55b…`

| Commit | HEAD / tree | Parent | Exact delta |
|---|---|---|---|
| Stage A (J) | `bc0b52023bb19d4e41fc4daa4a1e232961e1a19b` / `d5cb758467d06bfd7f17b6ae6a34664e659e1e3d` | `deb12a045f5d84281bc9da0f110e049748949970` | 19 paths, 6A / 13M |
| Stage B (S) | `2b49f6ad939993b9ff6a106fab327529a40fa20d` / `b40e967965d9d8878e21f2b5deff5df7aceed7f7` | `bc0b52023bb19d4e41fc4daa4a1e232961e1a19b` | 9 paths, 4A / 5M |
| Implementation (K) | `bcfe3349e01a655c2d52d6abbca0038cc3bff6e2` / `c34372a7cd121f157ade1fa86841fdebc69bb4ed` | `1d9d8ec7d419c90777295099d794ff04f8f476ce` | 2 paths, 2M |
| Evidence freeze (L) | `beeb55b662372e2b4f2a16f8768c16905a7a9978` / `10cb87830e37f8070320df09fb0b0dbdaef3268b` | `bcfe3349e01a655c2d52d6abbca0038cc3bff6e2` | 3 paths, 3A |

The historical 17-path/Addendum-B-only runner topology and old 14-path
aggregate were predecessor constraints, not the current construction truth.
The new runner rejects those obsolete bindings, the 206-column /
171-constraint catalog and the three obsolete SQL hashes.

## Committed artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Runner | 365649 | `sha256:4fa4a5deb677b1d31145ad9017b1755183e8c43fcc0dad6a138e4ff789ae742d` |
| Runner test | 117885 | `sha256:20909c0a7237a474bf7ac0049baa6437dfcaa57afa817b5b73c6d0d0d064d13a` |
| Physical Rebind artifact index | 7070 | `sha256:b3e95a61af0de08b3ddeb5dab7c92309f97eb8a7991126f47d71d638bea9c554` |
| Physical Rebind evidence schema | 51991 | `sha256:06eeead4377ebcdd7d7d145e704b0b313ba54a958659f31cba7475be49ac3d27` |
| Physical Rebind machine evidence | 14742 | `sha256:c9b9e48590d501023eda000f49dd6c1f58b5f757ff07095e035678fbc17acaf3` |

The two implementation blobs use aggregate
`sha256:e1eb1cb173c67d43a451bb45fbe402786ccbee7e542f0f0f618760a1379e9920`.
The three evidence blobs use aggregate
`sha256:2c1a6587f284398f76543ac3f823b51f739d750666636bfb677fbd11de1ff34b`.

Immutable bindings remain:

- package lock `sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`;
- isolated `pg` closure
  `sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4`,
  145 files / 15 packages;
- current schema / verify / rollback SQL
  `sha256:a0040e8c…eec8` / `sha256:807cdaf0…f9bd` /
  `sha256:67bfe857…24a4`;
- static catalog contract 14 tables / 207 columns / 172 constraints /
  44 indexes, digest `sha256:a6d6738d…c63e4`.

## Constructed physical contract

The runner constructs, but has not consumed:

- exact v3 grant and receipt shapes plus canonical execution-Card payload;
- one construction lifecycle and at most two cleanup-only recoveries;
- one-use pending-to-consumed authority and a maximum 24-hour lifetime;
- write-ahead reservations for every Docker, Pool/connect, database, SQL,
  domain-action and restart attempt;
- a 124-Pool/connection ceiling, two created database identities, three schema
  applies, three verifies, one rollback, 23 domain invocations / 20 distinct
  actions, and one restart;
- exact Docker argv and call ceilings, loopback-only random publication,
  same-container restart and zero unrelated-resource authority;
- per-effect CLI/socket/root identity drift stops, crash-safe grant anchoring,
  truth-preserving observation and receipt validation;
- exact cleanup closure, post-expiry cleanup-only recovery and a hard stop
  before a third cleanup recovery.

All host/image/target facts in this report are design bindings only.
Target PostgreSQL observation remains false.

## Validation

The exact Packet validation matrix passed on committed (K) bytes:

| Lane | Result |
|---|---:|
| runner fake/fault/concurrency/cleanup | 139 / 139 |
| focused non-runner Public Core | 85 / 85 |
| complete Public Core | 391 / 391 |
| R4 offline | 711 / 711 |
| Gate-B successor candidate | 145 / 145 |
| spine | 45 / 45 |

Runner syntax, TypeScript, no-server-AI, legacy documentation regression and
diff-check passed. The evidence validates under strict Ajv 2020-12 and rejects
authority, count, effect, readiness, stop and extra-property mutations.

Committed-(K) audit summary SHA:
`sha256:0d87de0d35468577eec9dde967f7c5d6d4b5db4b3442231e0254e329096ada00`.

Committed-(L) audit summary SHA:
`sha256:bccef86f5103b56f5ea1672aa276cb9d0c41f6ae58e10b8ba193eebd1ce54d69`.

Both committed audits report 0 Blocker / 0 Important. The candidate-(M)
latest-byte audit immediately before report freeze also reports 0 Blocker /
0 Important: exact ten-path workset, full machine/report bindings, one-way hash
DAG, strict Ajv, local links, legacy documentation regression and diff-check
all pass. The final committed-(M) audit remains external and will be bound only
by a later Effect-1 Card.

## Effect and documentation audit

All scoped Effect-0 external/physical counters are zero: repository-command,
package and source-control network; Docker CLI/daemon; OCI inspect/pull;
PostgreSQL process/connection/database; SQL apply/verify/rollback/domain;
product data plane; production database; runtime/route/Vault/HTTPS/traffic;
real Room/Projection/Curator/Guest bytes; Provider/model/email;
deployment/publication/admission; Gate C; push/PR; merge/release/spend.

This status commit aligns the exact nine operational current-status files.
Stable and historical documents outside the workset are not rewritten, so
`wholeRepositoryDocumentationCurrentClaimed` remains false.

## Readiness and stop

Constructed now: runner rebind, v3 authority/receipt, committed topology
verification, durable counters, observation truth and cleanup recovery.

Still false: physical execution, Docker/OCI/PostgreSQL/SQL observation,
target catalog, production pool/migration, Vault/HTTPS, runtime route,
traffic, Gate C, #67 Done and R4 Done.

Exact stop:

`LOCAL_POSTGRES_PHYSICAL_REBIND_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

The next permissible action is to prepare a separate one-use Physical
Execution Card and Owner Review that bind committed (K/L/M) plus the external
committed-(M) audit. No pending grant, Docker call, PostgreSQL connection,
SQL execution or Gate C activation is authorized by this report.
