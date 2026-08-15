# R4 #67 Integration Campaign Image-Manifest Diagnostic Card V1

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Scope: one future body-free local image-manifest diagnostic
- Image pull / cleanup / PostgreSQL / SQL: **NOT_REQUESTED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## User-visible outcome

This Card proposes one narrow local observation: ask the already-pinned Docker
client and server for their version tuple, then inspect the already-pinned
PostgreSQL image reference and retain only an allowlisted eight-field
descriptor tuple plus body-free process fingerprints. The observation is meant
to distinguish an index digest, a platform-manifest digest, a missing image,
or an invalid/mismatched descriptor without guessing a correction.

These Card bytes do not prepare or consume a grant, call Docker, inspect or
pull an image, read the failed campaign root, clean a resource, start
PostgreSQL, run SQL, change a pin, retry the campaign, activate Production or
enter Gate C.

## Exact frozen construction

| Binding | Exact value |
|---|---|
| Correction Addendum SHA / HEAD / tree | `sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee` / `e8919ff6474bd3f61a76668da1f1bbc9cae01fc5` / `3ac72ec29feac2f665a271bd79d4ffe33389f794` |
| Correction Owner Review SHA / HEAD / tree | `sha256:3af0c155276d6c7946ffb4c5196c61c38067b831e12de41c00c95c249df6b9c4` / `65771be7a1c17ed9170fbe592dae854f6d312759` / `d1b7f0b69634300f5c207b8cdf33823592369ff2` |
| Kmd HEAD / tree / G2 | `32abce27f7c84a83e0d2d1252ab0da5530f88cb0` / `eeaceeda818e7df76effe8b1439be849c7ead86b` / `sha256:a795d00b5875acedc13a320687c660f4c7c475ecf8e54373b6d55ca5e0de053e` |
| Lmd HEAD / tree / G3 | `b17a44f34fa9abde1e6a39504594e875a6d7d7cf` / `2609248dfc6d792c4d36947ff4bd857faaa745cf` / `sha256:a4ff525649dfd622d4171974ed3b43da863c8918e81aad08b546a5a32d00e161` |
| Mmd HEAD / tree / G10 | `0bfd7139a994f8d80816102abd8a850fbabe5922` / `2ed471b10829242768ab7e0afbd88eb31b9f7fb2` / `sha256:c232e3c12a53e0ea6b7ee2c23659a52415a1e246034401e98fde7dbe20f521b4` |
| committed-Mmd audit | `sha256:a261641f484b591a97cba19d82231d30fd0b979cdf55413f8e6f0e7646c71e29` / 0 Blocker / 0 Important |
| index / schema / evidence | `sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c` / `sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440` / `sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011` |
| report / runner / runner test | `sha256:490256a560bb3b910d38214c9190365ac64b087100cb3d17bd7ced353f631559` / `sha256:cf4ab4996225b06834dfd8919ea5e0f8d3f602e172e783e69f300065275fa81a` / `sha256:d109b72e11abef24968de02f9fdcc1873da0a9fd4fea1d20cd41960fe31c34b2` |

Mmd is the direct child of Lmd and changes exactly ten paths: one added
construction report and nine modified current-status surfaces. The complete
construction is exactly 15 paths across Kmd/Lmd/Mmd: 11 modified and four
added, with no dependency, lockfile, SQL or mode change.

## Failed campaign truth

The immutable failed V2 campaign binding is:

- root `/Users/zaynw/.forme-r4-integration-campaign-v2-1d96cfcf`;
- Owner approval receipt `sha256:99541d38320a7a2aa4682eb39d3577d467fb68f8f1b78b78ff565b4b8fb4a26e`
  / `1128` bytes;
- consumed grant `sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582`;
- terminal evidence `sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889`
  / `9656` bytes;
- journal `17` / `sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b`;
- terminal `FAILED / local_postgres_integration_campaign_physical_failed`,
  inner failure `local_postgres_image_platform_manifest_invalid`;
- the three historical resource names were absent, while PostgreSQL,
  catalog and SQL were not observed.

The diagnostic does not enter, read, modify, reuse or reinterpret that root.

## Canonical authority payload

The line between the two literal markers is canonical JSON without a trailing
line ending. The runner extracts and strictly compares these exact bytes.

R4_LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_AUTHORITY_V1_BEGIN
{"artifacts":{"artifactIndexSha256":"sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c","committedStatusAuditSha256":"sha256:a261641f484b591a97cba19d82231d30fd0b979cdf55413f8e6f0e7646c71e29","constructionReportSha256":"sha256:490256a560bb3b910d38214c9190365ac64b087100cb3d17bd7ced353f631559","evidenceSchemaSha256":"sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440","evidenceSha256":"sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011","runnerSha256":"sha256:cf4ab4996225b06834dfd8919ea5e0f8d3f602e172e783e69f300065275fa81a","runnerTestSha256":"sha256:d109b72e11abef24968de02f9fdcc1873da0a9fd4fea1d20cd41960fe31c34b2"},"authority":{"correctionAddendumSha256":"sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee","correctionOwnerReviewSha256":"sha256:3af0c155276d6c7946ffb4c5196c61c38067b831e12de41c00c95c249df6b9c4"},"ceilings":{"dockerCalls":{"container.create":0,"container.inspect":0,"container.rm":0,"container.start":0,"container.stop":0,"image.inspect":1,"image.pull":0,"network.create":0,"network.inspect":0,"network.rm":0,"version":1,"volume.create":0,"volume.inspect":0,"volume.rm":0},"maximumConsumptions":1,"maximumDiagnosticLifecycles":1,"maximumPrepareAttempts":1},"failedCampaign":{"approvalReceiptByteCount":1128,"approvalReceiptSha256":"sha256:99541d38320a7a2aa4682eb39d3577d467fb68f8f1b78b78ff565b4b8fb4a26e","consumedGrantSha256":"sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582","evidenceByteCount":9656,"evidenceSha256":"sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889","historicalResourcesAbsent":true,"innerFailureCode":"local_postgres_image_platform_manifest_invalid","journalEntryCount":17,"journalHeadSha256":"sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b","root":"/Users/zaynw/.forme-r4-integration-campaign-v2-1d96cfcf","targetPostgresObserved":false,"terminalCode":"local_postgres_integration_campaign_physical_failed","terminalStatus":"FAILED"},"host":{"dockerCli":"/Applications/Docker.app/Contents/Resources/bin/docker","dockerCliSha256":"sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a","dockerClientVersion":"29.3.1","dockerServerPlatform":"linux/arm64","dockerServerVersion":"29.3.1","imageReference":"postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"},"lineage":{"correctionAddendumHead":"e8919ff6474bd3f61a76668da1f1bbc9cae01fc5","correctionAddendumTree":"3ac72ec29feac2f665a271bd79d4ffe33389f794","correctionOwnerReviewHead":"65771be7a1c17ed9170fbe592dae854f6d312759","correctionOwnerReviewTree":"d1b7f0b69634300f5c207b8cdf33823592369ff2","evidenceHead":"b17a44f34fa9abde1e6a39504594e875a6d7d7cf","evidenceTree":"2609248dfc6d792c4d36947ff4bd857faaa745cf","implementationAggregateSha256":"sha256:a795d00b5875acedc13a320687c660f4c7c475ecf8e54373b6d55ca5e0de053e","implementationHead":"32abce27f7c84a83e0d2d1252ab0da5530f88cb0","implementationTree":"eeaceeda818e7df76effe8b1439be849c7ead86b","statusAggregateSha256":"sha256:c232e3c12a53e0ea6b7ee2c23659a52415a1e246034401e98fde7dbe20f521b4","statusHead":"0bfd7139a994f8d80816102abd8a850fbabe5922","statusTree":"2ed471b10829242768ab7e0afbd88eb31b9f7fb2"},"localOnly":true,"productionEffectsAllowed":false,"schemaVersion":"r4.public-core-local-postgres-image-manifest-diagnostic-authority.v1"}
R4_LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_AUTHORITY_V1_END

Canonical payload SHA-256:
`sha256:99d17e705204a8e2bb532cffc25ee845eddd29d242f5e518bac78e9b8db39414`.
No prose overrides this payload.

## Nine Owner choices

A later exact approval accepts all nine choices together:

1. **Observe before correcting.** Diagnose the actual bounded image tuple
   before changing the image reference, platform-manifest pin or acceptance
   rule. No observed digest is automatically selected as the correction.
2. **Bind the exact construction and authority.** Bind Kmd/Lmd/Mmd,
   G2/G3/G10, committed-Mmd audit, index/schema/evidence/report, runner/test,
   this canonical payload and direct `Mmd -> Card -> Review` single-parent,
   single-path additions. Any byte, topology or tracked-worktree drift stops
   before prepare.
3. **Authorize one prepare inside a fresh membrane.** Permit one fresh,
   canonical, current-uid mode-0700 diagnostic root containing only one
   external Owner approval receipt, then one no-follow mode-0600 pending
   grant. Its random ID and fresh CLI/socket identities are dynamic; its
   lifetime is greater than zero and no more than 24 hours. Prepare makes zero
   Docker calls and does not read the failed campaign root.
4. **Authorize one consumption and lifecycle.** Permit one pending-to-consumed
   transition and exactly one diagnostic lifecycle. Duplicate consumption,
   retry, replay, re-entry, an old grant or a second lifecycle is forbidden.
5. **Permit exactly two possible Docker calls.** Permit at most one
   `docker version --format {{json .}}` and, only after exact host validation,
   one `docker image inspect --format {{json .}}` of the exact pinned
   reference. Image pull and all container/network/volume calls remain zero.
6. **Retain body-free facts only.** Persist only bounded stdout/stderr sizes,
   SHA-256 fingerprints, UTF-8/line-shape facts, closed result classifications
   and the allowlisted tuple: RepoDigest presence, top-level OS/architecture,
   descriptor digest/media type/size/platform OS/platform architecture. Raw
   output and unlisted fields are discarded; buffers are zeroed where
   feasible.
7. **Require write-ahead and no retry.** Durably reserve each Docker call
   before invocation. Nonzero exit, timeout, signal, malformed output,
   ambiguity or CLI/socket drift consumes its budget and may publish only
   truthful failed evidence; no Docker call may be replayed.
8. **Keep observation separate from action.** The diagnostic cannot pull an
   image, mutate or clean a resource, read or change the historical root,
   change repository pins, prepare a replacement campaign, start PostgreSQL,
   run SQL, affect product runtime or enter Production/Gate C.
9. **Require exact forensic closure and stop.** The fresh root may retain only
   its consumed grant, Owner receipt, hash-chained journal and final body-free
   evidence. After independent receipt audit, stop for a new Owner decision;
   no outcome implies correction or further authority.

## Exact Docker and effect ceilings

| Docker kind | Maximum |
|---|---:|
| `version` | 1 |
| `image.inspect` | 1 |
| `image.pull` | 0 |
| container inspect/create/start/stop/remove | 0 / 0 / 0 / 0 / 0 |
| network inspect/create/remove | 0 / 0 / 0 |
| volume inspect/create/remove | 0 / 0 / 0 |

Maximum prepare attempts, consumptions and diagnostic lifecycles are each one.
All unlisted Docker commands, cleanup, PostgreSQL processes/pools/connections,
databases, SQL, application/domain actions and product-network effects are
zero. Production data, real Guest data, Provider/model/email, deploy,
publication, admission, push, PR, merge, release and spend are zero.

## Proposed order after a later exact approval

1. From the Review direct child and a clean tracked worktree, create one fresh
   diagnostic root containing only the external Owner approval receipt.
2. Revalidate the complete committed topology and canonical payload, then
   freshly observe the no-follow Docker CLI and local Unix socket identities
   without invoking Docker.
3. Create one pending grant and stop prepare.
4. Consume once; write-ahead the sole diagnostic lifecycle and version call.
5. Require exact client/server `29.3.1` and server platform `linux/arm64`.
6. Write-ahead one exact pinned-reference image inspect; persist only the
   closed body-free observation.
7. Prove exact four-file terminal closure and stop for independent audit.

## Effect ceiling of these Card bytes

| Effect | Actual / authorized now |
|---|---:|
| added proposal paths / commits | `1 / 1` |
| diagnostic prepare / pending / consumed grant | `0 / 0 / 0` |
| failed-root read / mutation | `0 / 0` |
| Docker CLI / socket / daemon / OCI | `0 / 0 / 0 / 0` |
| image inspect / pull | `0 / 0` |
| cleanup / PostgreSQL / SQL | `0 / 0 / 0` |
| product network / Production / Gate C | `0 / 0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

These bytes intentionally omit their own SHA/commit/tree, the future Review
SHA/commit/tree, Owner approval receipt, fresh root/host identities, grant ID,
timestamps, pending/consumed grant, journal and diagnostic receipt. A later
approval must externally bind the committed Card and direct-child Review, all
nine choices, the canonical payload and exact ceilings.

## Mandatory stop

Until a later exact approval:

`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
