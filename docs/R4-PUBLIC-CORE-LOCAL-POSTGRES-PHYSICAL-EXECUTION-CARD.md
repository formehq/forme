# R4 #67 Local PostgreSQL — One-Use Physical Execution Card

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Scope: one disposable, local-only PostgreSQL rehearsal
- Physical execution performed: **false**
- Pending grant created: **false**
- Gate C: **NOT_REQUESTED**
- Production effects: **forbidden**

This Card requests one narrowly bounded Effect-1 approval. It is not an
approval receipt and does not itself authorize grant creation, Docker, OCI,
PostgreSQL or SQL. Its containing commit must add only this file as the direct
child of the frozen Effect-0 status commit. A separate Owner Review must then
be committed as its direct child, independently audited, and precisely
approved by the Owner before the prepare entry may create a pending grant.

This Card intentionally omits its own SHA-256 and commit/tree, the future
Execution Review SHA-256 and commit/tree, the future Owner approval receipt,
and all six fresh dynamic grant values. Embedding those values here would be
self-referential or would claim observations that have not happened.

## Frozen predecessor and evidence

| Artifact | Exact binding |
|---|---|
| Effect-0 status `M` / tree | `42378b5a2a48493acf8edddcd05d19593cb05dd7` / `67b65083ae26163eca0f7bce1faefa90721c749c` |
| `M` parent `L` | `beeb55b662372e2b4f2a16f8768c16905a7a9978` |
| `M` exact delta | 10 paths: 1A / 9M / 0D / 0R |
| `M` aggregate `G10` | `sha256:d3c967d6b7f5a1df2be9e5004792dbd6d94e79fb7b9d6bfd36e9a24d06f8c8d7` |
| External committed-`M` audit summary | `sha256:3c5f01190448d18320317041b09bc293c5302ac3bffe4fadfe772d792c5d546a` |
| Rebind implementation `K` / tree / `G2` | `bcfe3349e01a655c2d52d6abbca0038cc3bff6e2` / `c34372a7cd121f157ade1fa86841fdebc69bb4ed` / `sha256:e1eb1cb173c67d43a451bb45fbe402786ccbee7e542f0f0f618760a1379e9920` |
| Rebind evidence `L` / tree / `G3` | `beeb55b662372e2b4f2a16f8768c16905a7a9978` / `10cb87830e37f8070320df09fb0b0dbdaef3268b` / `sha256:2c1a6587f284398f76543ac3f823b51f739d750666636bfb677fbd11de1ff34b` |
| Runner / runner test | `sha256:4fa4a5deb677b1d31145ad9017b1755183e8c43fcc0dad6a138e4ff789ae742d` / `sha256:20909c0a7237a474bf7ac0049baa6437dfcaa57afa817b5b73c6d0d0d064d13a` |
| Rebind index / schema / evidence | `sha256:b3e95a61af0de08b3ddeb5dab7c92309f97eb8a7991126f47d71d638bea9c554` / `sha256:06eeead4377ebcdd7d7d145e704b0b313ba54a958659f31cba7475be49ac3d27` / `sha256:c9b9e48590d501023eda000f49dd6c1f58b5f757ff07095e035678fbc17acaf3` |
| Rebind Construction Report | `sha256:23a010a39cfa7c093dcf1edd8da2ed4b44730e588ea00460219b63c2683cc43e` |
| Package lock / isolated `pg` closure | `sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f` / `sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4` (145 files / 15 packages) |
| Schema / verify / rollback SQL | `sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8` / `sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd` / `sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4` |
| Static catalog contract | 14 tables / 207 columns / 172 constraints / 44 indexes; `sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4` |

## Requested one-use authority

Approval accepts all of the following together and nothing else:

1. Create exactly one v3 pending grant through the committed prepare entry,
   using a fresh current-uid mode-0700 private root, one no-follow mode-0600
   Owner approval receipt, fresh CLI/socket observations and a lifetime no
   longer than 24 hours.
2. Consume that grant at most once. Permit one construction lifecycle and at
   most two cleanup-only recovery lifecycles. Re-entry or expiry is cleanup
   only; it never grants a second construction attempt.
3. Use only the absolute, hash-pinned Docker CLI, the fresh matching local Unix
   socket, image `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`,
   platform `linux/arm64` and manifest
   `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf`.
   A complete pinned cache may be used; otherwise permit at most one anonymous
   pull. A partial or unknown cache state blocks Physical Green.
4. Create one exact-owned loopback-only stack: at most one container, one
   internal network and one volume, with one random `127.0.0.1` publication,
   one mode-0600 password file mounted read-only and no unrelated-resource
   authority.
5. Create exactly two run-owned database identities A and B. The built-in
   `postgres` database is allowed only for the single bounded `CREATE DATABASE
   B`. Enforce at most one Pool, Client and transaction concurrently.
6. Execute only the frozen sequence: A apply → verify → target-catalog proof →
   20-action synthetic flow; one same-container restart → fresh replay and
   closure; B create → apply → verify → seed-only → rollback → namespace
   absence → reapply → reverify → seed-only. Exact totals are three applies,
   three verifies, one rollback, 23 action invocations / 20 distinct actions,
   one restart and one admin create-database statement.
7. Require `SHOW server_version_num = 160010` before schema/application
   mutation and require physical target-catalog observation to match
   14 / 207 / 172 / 44. Any mismatch, ambiguity or ceiling breach stops new
   non-cleanup effects; there is no repair, weaker test or second attempt.
8. Durably reserve every effect before invocation and publish only a body-free,
   journal-cross-bound v3 result. Cleanup removes exact-owned container,
   network, volume, credential, Docker config, imported runtime and active
   coordinator state. The complete pinned image cache is the only allowed
   daemon residue. Host-identity drift that prevents safe cleanup records
   `BLOCKED` and returns for separate rescue authority.

## Exact effect ceiling

| Effect | Maximum |
|---|---:|
| Construction / cleanup-recovery / total Docker lifecycles | `1 / 2 / 3` |
| OCI pull attempts | `1` |
| Created run-owned databases | `2` |
| Concurrent Pool / Client / transaction | `1 / 1 / 1` |
| Initial / restart readiness attempts | `60 / 60` |
| Operational / total Pool constructions | `4 / 124` |
| Total connection attempts | `124` |
| Schema applies / verifies / rollbacks | `3 / 3 / 1` |
| Domain invocations / distinct actions | `23 / 20` |
| Container restarts / admin create-database statements | `1 / 1` |

Docker call maxima are exact: `version=3`, `image.inspect=2`, `image.pull=1`,
`container.inspect=8`, `container.create=1`, `container.start=2`,
`container.stop=4`, `container.rm=3`, `network.inspect=7`,
`network.create=1`, `network.rm=3`, `volume.inspect=7`, `volume.create=1`,
`volume.rm=3`.

Forbidden throughout: remote Docker or PostgreSQL, non-loopback publication,
production database or data, runtime/route/Vault/HTTPS/traffic activation,
real Room/Projection/Curator/Guest bytes, Provider/model/email calls, deploy,
publication, admission, push/PR, merge, release, Gate C and spend.

## Canonical execution-authority payload

The following marker pair contains exactly one single-line canonical JSON
payload. It freezes static authority through `M`; it contains no self hash and
no future Review or approval-receipt value.

R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_BEGIN
{"artifacts":{"catalog":{"columns":207,"constraints":172,"indexes":44,"tables":14},"catalogContractSha256":"sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4","packageLockSha256":"sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f","pgImportClosureFileCount":145,"pgImportClosurePackageCount":15,"pgImportClosureSha256":"sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4","physicalRebindArtifactIndexSha256":"sha256:b3e95a61af0de08b3ddeb5dab7c92309f97eb8a7991126f47d71d638bea9c554","physicalRebindEvidenceSchemaSha256":"sha256:06eeead4377ebcdd7d7d145e704b0b313ba54a958659f31cba7475be49ac3d27","physicalRebindEvidenceSha256":"sha256:c9b9e48590d501023eda000f49dd6c1f58b5f757ff07095e035678fbc17acaf3","physicalRebindReportSha256":"sha256:23a010a39cfa7c093dcf1edd8da2ed4b44730e588ea00460219b63c2683cc43e","rebindStatusCommittedAuditSummarySha256":"sha256:3c5f01190448d18320317041b09bc293c5302ac3bffe4fadfe772d792c5d546a","rollbackSqlSha256":"sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4","runnerSha256":"sha256:4fa4a5deb677b1d31145ad9017b1755183e8c43fcc0dad6a138e4ff789ae742d","runnerTestSha256":"sha256:20909c0a7237a474bf7ac0049baa6437dfcaa57afa817b5b73c6d0d0d064d13a","schemaSqlSha256":"sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8","verifySqlSha256":"sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd"},"authority":{"addendumBOwnerReviewSha256":"sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2","addendumBSha256":"sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f","addendumCOwnerReviewSha256":"sha256:2aaa4d1243e2813b4030a37bae2cd7f14b41ca29c3814f4bce70c4c0161f65b7","addendumCSha256":"sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d","physicalRebindPacketSha256":"sha256:3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa","physicalRebindReviewSha256":"sha256:9ce9a8dfedca0e85deabb9b490055eda9662e492d3b3b51cabeaab1ec2afc9bf","wiringOwnerReviewSha256":"sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca","wiringPacketSha256":"sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258"},"ceilings":{"dockerCalls":{"container.create":1,"container.inspect":8,"container.rm":3,"container.start":2,"container.stop":4,"image.inspect":2,"image.pull":1,"network.create":1,"network.inspect":7,"network.rm":3,"version":3,"volume.create":1,"volume.inspect":7,"volume.rm":3},"maximumAdminCreateDatabaseStatements":1,"maximumCleanupRecoveryLifecycles":2,"maximumConcurrentClients":1,"maximumConcurrentPools":1,"maximumConcurrentTransactions":1,"maximumConstructionLifecycles":1,"maximumContainerRestarts":1,"maximumCreatedDatabaseIdentities":2,"maximumDistinctDomainActions":20,"maximumDockerLifecycles":3,"maximumDomainActionInvocations":23,"maximumImagePullAttempts":1,"maximumInitialReadinessAttempts":60,"maximumOperationalPoolConstructions":4,"maximumRestartReadinessAttempts":60,"maximumRollbacks":1,"maximumSchemaApplies":3,"maximumTotalConnectionAttempts":124,"maximumTotalPoolConstructions":124,"maximumVerifies":3},"dynamicSlots":["grantId","ownerApprovalReceiptSha256","dockerCliIdentitySha256","socketIdentitySha256","createdAt","expiresAt"],"host":{"dockerCli":"/Applications/Docker.app/Contents/Resources/bin/docker","dockerCliSha256":"sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a","dockerClientVersion":"29.3.1","dockerServerPlatform":"linux/arm64","dockerServerVersion":"29.3.1","imageCachePolicy":"COMPLETE_PINNED_IMAGE_CACHE_MAY_REMAIN_PARTIAL_OR_UNKNOWN_BLOCKS_GREEN","imagePlatform":"linux/arm64","imagePlatformManifest":"sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf","imageReference":"postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"},"lineage":{"addendumBWrapperHead":"1db7b30f38ca6322a3b0ad4be6d537af9cf781e8","addendumBWrapperTree":"1270bbc9beae9c446c83bbfc220e5906800890e3","addendumCWrapperHead":"deb12a045f5d84281bc9da0f110e049748949970","addendumCWrapperTree":"4b9028a942d4ac436527586aee64fbc23ec3488d","physicalRebindPacketHead":"697334c169c9ec69d44ecb38529d7108839f886b","physicalRebindPacketTree":"71c6b4197eed649814276a4536b6a40690eefd05","physicalRebindReviewHead":"1d9d8ec7d419c90777295099d794ff04f8f476ce","physicalRebindReviewTree":"257cc30066e669a456916033d5664fc135b7da3c","rebindEvidenceHead":"beeb55b662372e2b4f2a16f8768c16905a7a9978","rebindEvidenceTree":"10cb87830e37f8070320df09fb0b0dbdaef3268b","rebindImplementationArtifactAggregateSha256":"sha256:e1eb1cb173c67d43a451bb45fbe402786ccbee7e542f0f0f618760a1379e9920","rebindImplementationHead":"bcfe3349e01a655c2d52d6abbca0038cc3bff6e2","rebindImplementationTree":"c34372a7cd121f157ade1fa86841fdebc69bb4ed","rebindStatusHead":"42378b5a2a48493acf8edddcd05d19593cb05dd7","rebindStatusTree":"67b65083ae26163eca0f7bce1faefa90721c749c","stageAArtifactAggregateSha256":"sha256:d25ebe21a75be81371209699f072dc404947b3f2f7fb6a69c12c5c2d71d5e417","stageAHead":"bc0b52023bb19d4e41fc4daa4a1e232961e1a19b","stageATree":"d5cb758467d06bfd7f17b6ae6a34664e659e1e3d","stageBArtifactAggregateSha256":"sha256:cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b","stageBHead":"2b49f6ad939993b9ff6a106fab327529a40fa20d","stageBTree":"b40e967965d9d8878e21f2b5deff5df7aceed7f7"},"localOnly":true,"productionEffectsAllowed":false,"schemaVersion":"r4.public-core-local-postgres-execution-authority.v1"}
R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_END

Canonical payload bytes: `5517`.

Canonical payload SHA-256:
`sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3`.

## Dynamic slots and preparation stop

Only `grantId`, `ownerApprovalReceiptSha256`, `dockerCliIdentitySha256`,
`socketIdentitySha256`, `createdAt` and `expiresAt` may be added dynamically.
The committed prepare entry must derive and validate them; prose or shell
substitution may not widen any static field.

Before preparation, the Owner must precisely approve the final Card SHA-256,
Card commit/tree, Review SHA-256, Review commit/tree, this payload SHA-256,
the requested pull choice and every effect ceiling. Preparation itself must
stop after creating one pending grant and its body-free receipt. Physical
execution remains a separate explicit continuation of that same exact
approval; any binding, host, time, root or receipt drift stops before Docker.

## Result and mandatory stop

Physical Green requires the exact target observation, counts, action digest,
host bindings, cleanup proof and zero active residue required by the frozen
runner. A failed or cleanup-recovered result remains truthful evidence; it
does not authorize retry. A blocked cleanup requires separate rescue authority.

Even a Green local rehearsal does not authorize production, traffic or Gate C.
The mandatory successful stop is:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / GATE_C_NOT_REQUESTED`
