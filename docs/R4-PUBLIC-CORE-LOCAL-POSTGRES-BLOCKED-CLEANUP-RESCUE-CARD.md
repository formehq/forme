# R4 #67 Blocked-Cleanup Rescue Card

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Scope: **one local-only, exact-owned cleanup rescue for the historical FAILED/BLOCKED PostgreSQL rehearsal**
- Cleanup Rescue: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Further Physical Execution: **NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Card proposes one narrowly bounded cleanup rescue. It is not an approval
receipt and creates no grant. It does not call Docker, inspect the daemon,
touch the historical forensic root, import `pg`, connect to PostgreSQL, run
SQL, enter application/runtime code, activate production or request Gate C.

The historical v3 Physical Execution grant is consumed and permanently
non-retryable. Its result remains exactly
`FAILED / local_postgres_cleanup_unproven / BLOCKED`. This Card cannot revive
that grant, reinterpret its unused ceiling, rewrite either physical receipt or
retroactively claim that the old rehearsal was Green.

This file intentionally omits its own SHA-256 and containing commit/tree, the
future Rescue Owner Review SHA-256 and commit/tree, the external Owner
approval receipt, fresh rescue root and grant ID, fresh Docker CLI/socket
identity observations, timestamps, pending/consumed rescue-grant hashes,
rescue journal/receipt hashes and every later Physical Execution or Gate C
binding. Those values must arise in chronological order and be bound
externally.

## Exact correction baseline

| Binding | Exact value |
|---|---|
| failed Physical Execution Review `R2` HEAD / tree | `6e67c1f1867d73f27674a5f056e0692c5b42d6a3` / `60b3d7b124968a20f6ec30700d389849dd277ab2` |
| Correction Addendum SHA / `D` HEAD / tree | `sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9` / `56553e4a1e7bc65516f1f14cbac7e8fab2a53262` / `45a8b295d5308766e2bf0a6f4715af0d5c5edaef` |
| Correction Owner Review SHA / `V` HEAD / tree | `sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4` / `eb38eff55c2360b51df13dceb896680ec4440479` / `96abe090ac364a973d1b9bc6edc3e5ea70af4d6e` |
| corrected implementation `Kd` HEAD / tree | `0fdf68c7c786085189c3df0787df07f366c6df5b` / `5f091925b8b48cbd515700b275465506a391ccde` |
| corrected implementation aggregate `G2d` | `sha256:25dba2e75ca042e8c20e096ddaf9f5ee24506fab678a0a0f33366edd8ecebe22` |
| correction evidence `Ld` HEAD / tree | `62d0c98d7052998b7bb69b76c83f60576091836b` / `4673f445021f0d4a92c6e01e4bdccbb303141e0a` |
| correction status `Md` HEAD / tree | `32027d539cf043d14c6970ea9844a0e49fb284aa` / `5cae21de32d54d967e52fc96a53645ca73082dfc` |
| `G10d` | `sha256:15339dbc10ecfd60dd5cd27e47b58d9284682873eb02afffa0c63d75dc4c1334` |
| committed-`Md` audit | `sha256:d175d42b0768e0d4d216de98a49c9e038bc4cdd2df7312f794bb9a2c19036afd` |
| runner / runner test | `sha256:42d1c7b6640fd984a702922685cfc92181966318b7801606d17cacbf40b77f08` / `sha256:2c600732115b1e755a13af9fffd074b90831da69ea24beb1dde0635b16862cbd` |
| artifact index | `sha256:0dc154f786646243a13d500b0a41ae31cbcba42b15d1ed426503bf72d6ba2b4b` |
| strict evidence schema / evidence | `sha256:57a96cf603e393e1eb8849e2c6a3e7b10f9d143a3c249456936dd48a05d440be` / `sha256:9a6296c94ab0d4dee89449b7873a6cf04fec3a8e89f64170bca5eda9043a4ee3` |
| [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md) | `sha256:ccae05f1b44caea794b7b55e4a5bbf9796482dc1ad4d2a7a84771f1ebf9ad19f` |

The required proposal topology is the direct, single-parent sequence
`Md -> Rescue Card -> Rescue Owner Review`. This Card must be the sole
mode-100644 addition in its commit. The Review must be the sole mode-100644
addition in the next commit. Any merge parent, alternate parent/tree, changed
ancestor byte, extra path, modification, rename, deletion or mode drift stops
before grant preparation.

## Immutable historical FAILED/BLOCKED truth

| Binding | Exact value |
|---|---|
| Card V2 / Review V2 SHA-256 | `sha256:1ca420578f3e16c75b8242d71b93ea7be18baa1815c0f83e610807f9ded7c795` / `sha256:e92a125cdf1f8c4df8448836275bd98225ec8ce0b764dd70dfbabc479366e377` |
| canonical Physical Execution payload | `sha256:773a172f0d756b218de9ecfd7e9c2858a28b6ceb236474d103a4822a4203bf56` |
| historical private root | `/private/tmp/forme-r4-pg-9ZGIOLeX` |
| root device / inode / mode / uid | `16777231 / 32871902 / 0700 / 501` |
| exact root entries | `grant.consumed.json`, `journal-v3`, `owner-approval-receipt`, `physical-evidence.json` |
| Owner approval receipt | 1083 bytes / `sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c` |
| consumed grant / grant ID | 6356 bytes / `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35` / `b92ae04555cc3d69a16c06ae53b30976` |
| first failed receipt | `sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7` |
| final blocked receipt | 7180 bytes / `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c` |
| durable journal | 34 entries / `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25` |
| result | `FAILED / local_postgres_cleanup_unproven / BLOCKED` |

The historical root is read-only forensic input. Rescue prepare must freshly
prove its canonical path, device/inode, mode, uid, exact four-entry closure and
every bound byte/hash. It may not follow a replacement path, repair the old
journal, remove an old entry or publish rescue state into that root.

The exact historical resource identities are:

| Resource | Exact value |
|---|---|
| run ID | `b92ae04555cc3d69` |
| container | `forme-r4-public-core-local-b92ae04555cc3d69` |
| network | `forme-r4-public-core-local-net-b92ae04555cc3d69` |
| volume | `forme-r4-public-core-local-vol-b92ae04555cc3d69` |
| ownership label | `forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976` |

No list/filter/wildcard discovery or alternate name is allowed.

## Canonical rescue authority payload

The following marker pair and the single canonical JSON line between it are
machine-consumed. The payload SHA-256 is
`sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e`
over exactly 3818 UTF-8 bytes with no line feed.

R4_LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_AUTHORITY_V1_BEGIN
{"artifacts":{"correctionArtifactIndexSha256":"sha256:0dc154f786646243a13d500b0a41ae31cbcba42b15d1ed426503bf72d6ba2b4b","correctionEvidenceSchemaSha256":"sha256:57a96cf603e393e1eb8849e2c6a3e7b10f9d143a3c249456936dd48a05d440be","correctionEvidenceSha256":"sha256:9a6296c94ab0d4dee89449b7873a6cf04fec3a8e89f64170bca5eda9043a4ee3","correctionReportSha256":"sha256:ccae05f1b44caea794b7b55e4a5bbf9796482dc1ad4d2a7a84771f1ebf9ad19f","correctionStatusCommittedAuditSummarySha256":"sha256:d175d42b0768e0d4d216de98a49c9e038bc4cdd2df7312f794bb9a2c19036afd","runnerSha256":"sha256:42d1c7b6640fd984a702922685cfc92181966318b7801606d17cacbf40b77f08","runnerTestSha256":"sha256:2c600732115b1e755a13af9fffd074b90831da69ea24beb1dde0635b16862cbd"},"authority":{"correctionAddendumSha256":"sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9","correctionOwnerReviewSha256":"sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4"},"blocked":{"consumedGrantBytes":6356,"consumedGrantSha256":"sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35","finalEvidenceBytes":7180,"finalEvidenceSha256":"sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c","firstEvidenceSha256":"sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7","grantId":"b92ae04555cc3d69a16c06ae53b30976","journalEntryCount":34,"journalHeadSha256":"sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25","ownerApprovalReceiptBytes":1083,"ownerApprovalReceiptSha256":"sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c","privateRoot":"/private/tmp/forme-r4-pg-9ZGIOLeX","resources":{"container":"forme-r4-public-core-local-b92ae04555cc3d69","labelKey":"forme.r4.public-core.local.grant","labelValue":"b92ae04555cc3d69a16c06ae53b30976","network":"forme-r4-public-core-local-net-b92ae04555cc3d69","runId":"b92ae04555cc3d69","volume":"forme-r4-public-core-local-vol-b92ae04555cc3d69"},"rootDev":"16777231","rootEntries":["grant.consumed.json","journal-v3","owner-approval-receipt","physical-evidence.json"],"rootIno":"32871902","rootMode":"0700","rootUid":"501"},"ceilings":{"dockerCalls":{"container.create":0,"container.inspect":2,"container.rm":1,"container.start":0,"container.stop":1,"image.inspect":0,"image.pull":0,"network.create":0,"network.inspect":2,"network.rm":1,"version":1,"volume.create":0,"volume.inspect":2,"volume.rm":1},"maximumCleanupRescueLifecycles":1},"host":{"dockerCli":"/Applications/Docker.app/Contents/Resources/bin/docker","dockerCliSha256":"sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a","dockerClientVersion":"29.3.1","dockerServerPlatform":"linux/arm64","dockerServerVersion":"29.3.1"},"lineage":{"correctionAddendumHead":"56553e4a1e7bc65516f1f14cbac7e8fab2a53262","correctionAddendumTree":"45a8b295d5308766e2bf0a6f4715af0d5c5edaef","correctionEvidenceHead":"62d0c98d7052998b7bb69b76c83f60576091836b","correctionEvidenceTree":"4673f445021f0d4a92c6e01e4bdccbb303141e0a","correctionImplementationArtifactAggregateSha256":"sha256:25dba2e75ca042e8c20e096ddaf9f5ee24506fab678a0a0f33366edd8ecebe22","correctionImplementationHead":"0fdf68c7c786085189c3df0787df07f366c6df5b","correctionImplementationTree":"5f091925b8b48cbd515700b275465506a391ccde","correctionOwnerReviewHead":"eb38eff55c2360b51df13dceb896680ec4440479","correctionOwnerReviewTree":"96abe090ac364a973d1b9bc6edc3e5ea70af4d6e","correctionStatusHead":"32027d539cf043d14c6970ea9844a0e49fb284aa","correctionStatusTree":"5cae21de32d54d967e52fc96a53645ca73082dfc","failedExecutionReviewHead":"6e67c1f1867d73f27674a5f056e0692c5b42d6a3","failedExecutionReviewTree":"60b3d7b124968a20f6ec30700d389849dd277ab2"},"localOnly":true,"productionEffectsAllowed":false,"schemaVersion":"r4.public-core-local-postgres-cleanup-rescue-authority.v1"}
R4_LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_AUTHORITY_V1_END

No prose overrides this payload. Missing, extra, reordered, non-canonical or
changed payload bytes invalidate the Card.

## Fresh rescue prepare — proposed, not authorized yet

After the Card and Review are committed and independently audited, a later
exact Owner approval may authorize one prepare command only. Prepare must:

1. start from the exact Rescue Review commit and a clean tracked worktree;
2. create one fresh current-uid mode-0700 rescue root containing only the
   no-follow current-uid mode-0600 external Owner rescue-approval receipt;
3. freshly revalidate the historical root and exact four retained bytes
   without mutating them;
4. derive and validate the Card/Review topology, payload, all correction
   artifacts and committed-Md audit;
5. freshly observe the same absolute Docker CLI bytes/identity and local Unix
   socket identity without calling Docker;
6. create exactly one strict `r4.public-core-local-postgres-cleanup-rescue-grant.v1`
   pending grant with a random 32-hex grant ID and lifetime greater than zero
   and no longer than 24 hours; and
7. stop with zero Docker, OCI, PostgreSQL, SQL, product, production, network or
   Gate C effect.

Any old-root, authority, repository, CLI/socket, receipt or entry drift stops
before a pending grant. Prepare may not repair either root, inspect Docker or
infer approval from this Card.

## One cleanup-rescue lifecycle — proposed, not authorized yet

The same later exact Owner approval may authorize consumption of that one
pending rescue grant for exactly one lifecycle. The closed order is:

1. consume the rescue grant once and write-ahead every Docker call;
2. verify exact Docker client/server `29.3.1` and `linux/arm64` once;
3. inspect the exact historical container;
4. if present, require the exact ownership label, stop it only if running and
   remove only that container; then re-inspect and require `MISSING_EXACT`;
5. inspect the exact historical network; if present, require the exact label,
   remove only it and re-inspect to `MISSING_EXACT`;
6. inspect the exact historical volume; if present, require the exact label,
   remove only it and re-inspect to `MISSING_EXACT`; and
7. prove zero rescue-local transient residue, preserve the old four-entry root
   unchanged, and publish one strict body-free receipt plus hash-chained
   journal in the rescue root.

The exact Docker maxima are:

| Call kind | Maximum |
|---|---:|
| `version` | 1 |
| `container.inspect` / `network.inspect` / `volume.inspect` | 2 / 2 / 2 |
| `container.stop` / `container.rm` | 1 / 1 |
| `network.rm` / `volume.rm` | 1 / 1 |
| image inspect/pull | 0 / 0 |
| container create/start | 0 / 0 |
| network/volume create | 0 / 0 |
| every other Docker kind | 0 |

There is no retry. A process crash or ambiguous call consumes its call budget
and may be entered only to publish truthful `BLOCKED` evidence; it must never
replay Docker. A foreign/missing ownership label, wrong full diagnostic,
wrong name, extra output, host/root drift, timeout, signal or any unproven
state stops all mutation and retains forensic evidence.

## Closed diagnostics and ownership

Only the exact full-line, exact-name `MISSING_EXACT` diagnostics frozen in the
corrected runner are accepted. Container absence may be either:

- `Error response from daemon: No such container: <exact-container-name>`
- `Error: No such object: <exact-container-name>`

Network and volume retain only their predecessor full lines. Substrings,
regexes, another resource name, extra line, prefix/suffix, control character,
unexpected status or nonempty stdout are rejected. Any found resource must
carry exactly
`forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976`
before stop/remove.

## Success, failure and evidence truth

`CLEANUP_RESCUE_GREEN` requires all three exact historical names proven
absent, exact Docker counters within ceiling, no open effect, zero
rescue-local transient residue, exactly four retained rescue forensic entries
and the old four-entry forensic root unchanged.

Green proves cleanup only. It does not prove that PostgreSQL 16.10 ran, that
the catalog matched 14 / 207 / 172 / 44, that schema/app/verify/restart/
rollback/domain flow ran, or that production/runtime/traffic/Gate C is ready.

Any foreign, malformed, ambiguous or drift result is `BLOCKED`, preserves both
roots, and requires a new rescue decision. No failed or blocked result can be
called Green merely because the runner created no resource.

## Effect ceiling of this proposal

| Effect | Authorized by these Card bytes |
|---|---:|
| repository mutation | 0 |
| pending / consumed rescue grants | 0 / 0 |
| old forensic-root mutation | 0 |
| Docker CLI / daemon / OCI calls | 0 / 0 / 0 |
| PostgreSQL process / connection / database | 0 / 0 / 0 |
| SQL apply / verify / rollback / domain | 0 / 0 / 0 / 0 |
| product network / production data / runtime / route / traffic | 0 / 0 / 0 / 0 / 0 |
| real Room / Projection / Curator / Guest bytes | 0 |
| Provider / model / email | 0 / 0 / 0 |
| deploy / publication / admission / Gate C | 0 / 0 / 0 / 0 |
| push / PR / merge / release / spend | 0 / 0 / 0 / 0 / US$0 |

The later approval, if any, must separately name this Card SHA/commit/tree,
the Review SHA/commit/tree, payload SHA, exact choices and physical rescue
ceiling. No approval may be inferred from repository history or prior Owner
messages.

## Mandatory stops

Until a later exact approval, remain at:

`LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a genuinely Green separately approved rescue and independent receipt
audit, stop exactly at:

`LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Do not prepare or execute rescue from this Card alone. Do not begin a fresh
Physical Execution, production activation or Gate C.
