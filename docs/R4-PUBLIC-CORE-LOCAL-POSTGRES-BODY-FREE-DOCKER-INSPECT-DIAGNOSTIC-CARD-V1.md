# R4 #67 Body-Free Docker Inspect Diagnostic Card V1

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Scope: **one local-only, body-free Docker inspect diagnostic**
- Docker Diagnostic: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup / Physical Execution: **NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Card proposes one narrowly bounded, observation-only diagnostic. It is
not an approval receipt, creates no grant and performs no Docker, socket,
PostgreSQL, SQL, cleanup, product, production or Gate C effect.

Both earlier one-use grants are consumed and permanently non-retryable. The
physical rehearsal remains `FAILED / cleanup BLOCKED`; the cleanup rescue
remains `FAILED / local_postgres_docker_call_failed / BLOCKED`. This Card
cannot revive either grant, clean a resource, reinterpret either receipt or
claim that PostgreSQL, the catalog, cleanup, Physical Green or Gate C is
ready.

This file intentionally omits its own SHA-256 and containing commit/tree, the
future Diagnostic Owner Review SHA-256 and commit/tree, the external Owner
approval receipt, fresh diagnostic root, grant ID, Docker CLI file identity,
local socket identity, timestamps, pending/consumed grant hashes, diagnostic
journal/receipt hashes and every later cleanup, Physical Execution or Gate C
binding. Those values must arise in chronological order and be bound
externally.

## Exact construction baseline

| Binding | Exact value |
|---|---|
| Cleanup Rescue Owner Review `RR` HEAD / tree | `ac1dfea899f2edff6ec59dd401d8aec6256a485f` / `4c93a2bbe68efae13b4caaecfd3f39cdffb9964b` |
| Diagnostic Addendum SHA / `F` HEAD / tree | `sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13` / `931dbb7278bb06bf219ae7553b4317db415de0e7` / `22db25181c284d980f4e5d9cbf5cd5e3d7c6a725` |
| Diagnostic Construction Review SHA / `FV` HEAD / tree | `sha256:a3dbb56df2fefbb05eef9a1175c49b9afb1a83982909309d5ba230c735222579` / `fcb1a5bc20832bdc63d0c7cfd6ff49ed1cf20e9e` / `1541a8dbd4d425b7faeebd66fa417a035f10f5b3` |
| Path-Correction Addendum SHA / `G` HEAD / tree | `sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00` / `0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb` / `50e5bcc3b6dcec268f619e3b8399cc92e323da70` |
| Path-Correction Review SHA / `GV` HEAD / tree | `sha256:a7448857f699507babb31477e67e6cf1491d3297a74ed1479de92300e00be1f7` / `725b02338db4aa53517929c28912ef2092732631` / `e3a4d568a1c9ba9e47c87d01e4b7129687aa13f1` |
| diagnostic implementation `Kf` HEAD / tree / `G2f` | `bd3cdf71055136dce2731d7da3bef9dc89e6f4d7` / `66af8e43a3372d6d871a1a778b4822b8a7307a16` / `sha256:9909862f7016dfc8074408d4b59a9d6b1eb394b9e894e458d900243324ef8bd4` |
| diagnostic evidence `Lf` HEAD / tree / `G3f` | `7384ef89e70209657f1bb8714d9f708004bacc13` / `fb3539a4013679c7cf1626eedc4e4227b4c55ca4` / `sha256:b51e1e01bc2bd2228ddb5a4d84ff58d002e65c30bd977e135f2215591c3e59ff` |
| diagnostic status `Mf` HEAD / tree / `G10f` | `b0edf295ca556caaa65dfaa6c7c3025e0a32d577` / `a6fcc433397fb75d043080c4926a3179f42a8e10` / `sha256:1f9c2e22408c63559aa0418b08e5dde481fff0a8ecd59460f788bef7f5635993` |
| committed-`Mf` audit | `sha256:9302aabe85d626d004631900df0f00eac0ee0569aa56115967c0b38592b3cca8` |
| runner / runner test | `sha256:32e0a5d9f325d08a0691efe6145a6f494e3bcac880790e12c2fa1474ee5ecb5e` / `sha256:9739145a2b872194c02be9d9a0b4c7b148e3f2935c3db6cd408ded7d1ebeed46` |
| artifact index | `sha256:c61143957b8323609f93420013a207ae1a3f72ce7a6e5d7b32b3fc10a411ade8` |
| strict evidence schema / evidence | `sha256:0462c9cd5f921e76610e377211015735c064e9a5ef73ffd653a02b735fdc5bd9` / `sha256:8b3443916e3660913704dffe3d6d89fc47882d582c43ebc985aebcda90cd5149` |
| [Construction Report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md) | `sha256:0d4911b1e26671c33d016deb6f5fa92be542add857216f72397e15e1294800da` |

The required proposal topology is the direct, single-parent sequence
`Mf -> FC1 -> FR1`. This Card must be the sole mode-100644 addition in its
commit. The Review must be the sole mode-100644 addition in the next commit.
Any merge parent, alternate parent/tree, changed ancestor byte, extra path,
modification, rename, deletion or mode drift stops before grant preparation.

## Immutable FAILED/BLOCKED truth

The first forensic root is
`/private/tmp/forme-r4-pg-9ZGIOLeX`, device/inode/mode/uid
`16777231 / 32871902 / 0700 / 501`, with exactly
`grant.consumed.json`, `journal-v3`, `owner-approval-receipt` and
`physical-evidence.json`. Its consumed grant is
`sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`,
its final evidence is
`sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`
and its journal is 34 entries with head
`sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`.

The cleanup-rescue forensic root is
`/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn`, device/inode/mode/uid
`16777231 / 33273981 / 0700 / 501`, with exactly
`cleanup-rescue-evidence.json`, `owner-approval-receipt`,
`rescue-journal-v1` and `rescue.consumed.json`. Its consumed grant is
`sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654`,
its final evidence is
`sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979`
and its journal is 6 entries with head
`sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491`.

Both roots are read-only forensic inputs. Diagnostic prepare must freshly
prove their canonical paths, identities, exact four-entry closures and bound
bytes without mutating them. Resource absence remains unknown. No historical
container, network or volume may be stopped, removed, created or changed.

## Canonical diagnostic authority payload

The following marker pair and the single canonical JSON line between it are
machine-consumed. The payload SHA-256 is
`sha256:53188dac86131bf4910f06dc8dd64e7f1127d29cd55f21882960ab674a24262d`
over exactly 5600 UTF-8 bytes with no line feed.

R4_LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_AUTHORITY_V1_BEGIN
{"artifacts":{"diagnosticArtifactIndexSha256":"sha256:c61143957b8323609f93420013a207ae1a3f72ce7a6e5d7b32b3fc10a411ade8","diagnosticEvidenceSchemaSha256":"sha256:0462c9cd5f921e76610e377211015735c064e9a5ef73ffd653a02b735fdc5bd9","diagnosticEvidenceSha256":"sha256:8b3443916e3660913704dffe3d6d89fc47882d582c43ebc985aebcda90cd5149","diagnosticReportSha256":"sha256:0d4911b1e26671c33d016deb6f5fa92be542add857216f72397e15e1294800da","diagnosticStatusCommittedAuditSummarySha256":"sha256:9302aabe85d626d004631900df0f00eac0ee0569aa56115967c0b38592b3cca8","runnerSha256":"sha256:32e0a5d9f325d08a0691efe6145a6f494e3bcac880790e12c2fa1474ee5ecb5e","runnerTestSha256":"sha256:9739145a2b872194c02be9d9a0b4c7b148e3f2935c3db6cd408ded7d1ebeed46"},"authority":{"constructionAddendumSha256":"sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13","constructionOwnerReviewSha256":"sha256:a3dbb56df2fefbb05eef9a1175c49b9afb1a83982909309d5ba230c735222579","pathCorrectionAddendumSha256":"sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00","pathCorrectionOwnerReviewSha256":"sha256:a7448857f699507babb31477e67e6cf1491d3297a74ed1479de92300e00be1f7"},"blocked":{"consumedGrantBytes":6356,"consumedGrantSha256":"sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35","finalEvidenceBytes":7180,"finalEvidenceSha256":"sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c","firstEvidenceSha256":"sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7","grantId":"b92ae04555cc3d69a16c06ae53b30976","journalEntryCount":34,"journalHeadSha256":"sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25","ownerApprovalReceiptBytes":1083,"ownerApprovalReceiptSha256":"sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c","privateRoot":"/private/tmp/forme-r4-pg-9ZGIOLeX","resources":{"container":"forme-r4-public-core-local-b92ae04555cc3d69","labelKey":"forme.r4.public-core.local.grant","labelValue":"b92ae04555cc3d69a16c06ae53b30976","network":"forme-r4-public-core-local-net-b92ae04555cc3d69","runId":"b92ae04555cc3d69","volume":"forme-r4-public-core-local-vol-b92ae04555cc3d69"},"rootDev":"16777231","rootEntries":["grant.consumed.json","journal-v3","owner-approval-receipt","physical-evidence.json"],"rootIno":"32871902","rootMode":"0700","rootUid":"501"},"ceilings":{"dockerCalls":{"container.create":0,"container.inspect":1,"container.rm":0,"container.start":0,"container.stop":0,"image.inspect":0,"image.pull":0,"network.create":0,"network.inspect":0,"network.rm":0,"version":1,"volume.create":0,"volume.inspect":0,"volume.rm":0},"maximumDiagnosticLifecycles":1,"maximumOutputBytesPerStream":16777216},"failedRescue":{"cleanupStatus":"BLOCKED","code":"local_postgres_docker_call_failed","consumedGrantBytes":4796,"consumedGrantSha256":"sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654","dockerCallCounts":{"container.create":0,"container.inspect":1,"container.rm":0,"container.start":0,"container.stop":0,"image.inspect":0,"image.pull":0,"network.create":0,"network.inspect":0,"network.rm":0,"version":1,"volume.create":0,"volume.inspect":0,"volume.rm":0},"finalEvidenceBytes":5109,"finalEvidenceSha256":"sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979","grantId":"c89d8f4e678dcf2778925af338bb1180","journalEntryCount":6,"journalHeadSha256":"sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491","oldForensicRootUnchanged":true,"ownerApprovalReceiptBytes":1085,"ownerApprovalReceiptSha256":"sha256:21744a1ab338128f912f046159ef4ebdf74b197088bfa4973ff8d6a597e9475d","privateRoot":"/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn","rootDev":"16777231","rootEntries":["cleanup-rescue-evidence.json","owner-approval-receipt","rescue-journal-v1","rescue.consumed.json"],"rootIno":"33273981","rootMode":"0700","rootUid":"501","status":"FAILED"},"host":{"dockerCli":"/Applications/Docker.app/Contents/Resources/bin/docker","dockerCliSha256":"sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a","dockerClientVersion":"29.3.1","dockerServerPlatform":"linux/arm64","dockerServerVersion":"29.3.1"},"lineage":{"cleanupRescueOwnerReviewHead":"ac1dfea899f2edff6ec59dd401d8aec6256a485f","cleanupRescueOwnerReviewTree":"4c93a2bbe68efae13b4caaecfd3f39cdffb9964b","constructionAddendumHead":"931dbb7278bb06bf219ae7553b4317db415de0e7","constructionAddendumTree":"22db25181c284d980f4e5d9cbf5cd5e3d7c6a725","constructionOwnerReviewHead":"fcb1a5bc20832bdc63d0c7cfd6ff49ed1cf20e9e","constructionOwnerReviewTree":"1541a8dbd4d425b7faeebd66fa417a035f10f5b3","diagnosticEvidenceHead":"7384ef89e70209657f1bb8714d9f708004bacc13","diagnosticEvidenceTree":"fb3539a4013679c7cf1626eedc4e4227b4c55ca4","diagnosticImplementationArtifactAggregateSha256":"sha256:9909862f7016dfc8074408d4b59a9d6b1eb394b9e894e458d900243324ef8bd4","diagnosticImplementationHead":"bd3cdf71055136dce2731d7da3bef9dc89e6f4d7","diagnosticImplementationTree":"66af8e43a3372d6d871a1a778b4822b8a7307a16","diagnosticStatusHead":"b0edf295ca556caaa65dfaa6c7c3025e0a32d577","diagnosticStatusTree":"a6fcc433397fb75d043080c4926a3179f42a8e10","pathCorrectionAddendumHead":"0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb","pathCorrectionAddendumTree":"50e5bcc3b6dcec268f619e3b8399cc92e323da70","pathCorrectionOwnerReviewHead":"725b02338db4aa53517929c28912ef2092732631","pathCorrectionOwnerReviewTree":"e3a4d568a1c9ba9e47c87d01e4b7129687aa13f1"},"localOnly":true,"productionEffectsAllowed":false,"schemaVersion":"r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-authority.v1"}
R4_LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_AUTHORITY_V1_END

No prose overrides this payload. Missing, extra, reordered, non-canonical or
changed payload bytes invalidate the Card.

## Nine Owner choices

A later exact diagnostic approval accepts all nine choices together:

1. **Preserve both FAILED/BLOCKED histories.** Bind both consumed grants,
   roots, receipts and journal heads exactly as above. Neither old grant may
   be retried or reinterpreted, and neither root may be changed.
2. **Bind the exact construction and payload.** Bind `Kf/Lf/Mf`,
   `G2f/G3f/G10f`, committed-`Mf` audit, index/schema/evidence/report,
   runner/test and the canonical payload above. Require direct
   `Mf -> FC1 -> FR1` single-parent, single-path additions and a clean tracked
   worktree. Any byte, topology or Git-action drift stops before prepare.
3. **Authorize one diagnostic prepare only within its membrane.** Permit one
   fresh current-uid mode-0700 diagnostic root and one no-follow mode-0600
   pending diagnostic grant, with one external Owner approval receipt, random
   grant ID and lifetime greater than zero and no longer than 24 hours.
   Prepare may read and hash the two exact forensic roots, observe the fixed
   Docker CLI file identity and local Unix socket identity, but it must make
   zero Docker calls and mutate neither forensic root.
4. **Authorize one consumption and one lifecycle only.** The pending grant may
   transition to consumed once and enter exactly one diagnostic lifecycle.
   Duplicate consume, retry, replay, re-entry as a new lifecycle, reuse of an
   old grant or creation of cleanup authority is forbidden.
5. **Permit only two exact Docker calls.** Permit one `version` call and one
   exact-name `container.inspect` call for
   `forme-r4-public-core-local-b92ae04555cc3d69`. Image, network and volume
   calls; container create/start/stop/remove; list/filter/wildcard discovery;
   and every unlisted Docker call remain zero.
6. **Capture body-free facts only.** Persist only bounded stdout/stderr byte
   counts, SHA-256 digests, UTF-8 and line-shape facts, closed spawn/result
   classifications and safe ownership classification. Never persist raw
   stdout, stderr, arbitrary label bodies, secrets or credentials. Clear raw
   output buffers after in-memory classification. Each stream is capped at
   16777216 bytes.
7. **Require write-ahead and no retry.** Reserve each Docker call durably
   before invocation. A crash, timeout, signal, spawn ambiguity, host drift or
   unclassified result consumes its call budget and publishes only truthful
   failed evidence; it cannot replay Docker or broaden the diagnostic.
8. **Keep diagnostic separate from cleanup and execution.** This approval
   authorizes no stop/remove/create/start/pull, no PostgreSQL process,
   connection, database or SQL, no application/domain/runtime action and no
   production, public, Provider, traffic or Gate C effect. Observation is not
   resource-absence proof and cannot be converted into cleanup authority.
9. **Require exact forensic closure and stop.** The diagnostic root may retain
   only its consumed grant, Owner receipt, hash-chained journal and body-free
   final evidence. Both old forensic roots must remain byte- and
   identity-stable. After independent receipt audit, stop for a new Owner
   decision; Cleanup, Physical Execution, production and Gate C remain
   `NOT_REQUESTED`.

## Proposed prepare and diagnostic order

After this Card and its Review are committed and independently audited, one
later exact Owner approval may authorize this closed sequence:

1. from exact `FR1` and a clean tracked worktree, create one fresh diagnostic
   root containing only the external Owner approval receipt;
2. revalidate both immutable forensic roots and every authority, lineage,
   artifact, payload, runner/test and host-design binding;
3. observe the no-follow absolute Docker CLI file identity and canonical local
   Unix socket identity without calling Docker;
4. create one strict pending diagnostic grant and stop prepare;
5. consume that grant once, write-ahead the diagnostic lifecycle and the
   Docker `version` call;
6. require exact client/server `29.3.1` and `linux/arm64`, then write-ahead one
   exact-name `container.inspect` call;
7. record only the body-free fingerprints and closed classifications; and
8. prove the two old roots unchanged and the fresh diagnostic root in exact
   terminal forensic closure.

No diagnostic outcome grants cleanup. A found exact-owned container, exact
absence diagnostic, foreign ownership, malformed body, ambiguity or host
drift is evidence for the next human decision only.

## Exact Docker ceiling

| Call kind | Maximum |
|---|---:|
| `version` | 1 |
| `container.inspect` | 1 |
| image inspect/pull | 0 / 0 |
| container create/start/stop/remove | 0 / 0 / 0 / 0 |
| network inspect/create/remove | 0 / 0 / 0 |
| volume inspect/create/remove | 0 / 0 / 0 |
| every other Docker kind | 0 |

There is no cleanup, retry or second lifecycle. A failed or ambiguous call
cannot be called diagnostic Green merely because no mutation was requested.

## Effect ceiling of these Card bytes

| Effect | Authorized by these Card bytes |
|---|---:|
| repository mutation beyond this one proposal path | 0 |
| pending / consumed diagnostic grants | 0 / 0 |
| forensic-root read / mutation | 0 / 0 |
| Docker CLI / socket / daemon / OCI calls | 0 / 0 / 0 / 0 |
| cleanup / PostgreSQL process / connection / database | 0 / 0 / 0 / 0 |
| SQL apply / verify / rollback / domain | 0 / 0 / 0 / 0 |
| product network / production data / runtime / route / traffic | 0 / 0 / 0 / 0 / 0 |
| real Room / Projection / Curator / Guest bytes | 0 |
| Provider / model / email | 0 / 0 / 0 |
| deploy / publication / admission / Gate C | 0 / 0 / 0 / 0 |
| push / PR / merge / release / spend | 0 / 0 / 0 / 0 / US$0 |

The later approval, if any, must separately name this Card SHA/commit/tree,
the Review SHA/commit/tree, payload SHA, all nine choices and the exact
prepare/diagnostic ceiling. No approval may be inferred from repository
history or prior Owner messages.

## Mandatory stops

Until a later exact approval, remain at:

`LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_DOCKER_INSPECT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After one separately approved diagnostic lifecycle and independent receipt
audit, stop for a new Owner decision. Diagnostic evidence alone authorizes no
cleanup, Physical Execution, production activation or Gate C.

Do not prepare or consume a diagnostic grant from this Card alone.
