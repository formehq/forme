# R4 #67 Integration Campaign Image-Acquisition Diagnostic Card V1

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-16
- Outcome: one fresh one-use body-free image-acquisition diagnostic
- Docker Diagnostic / Registry / Image Pull: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup / PostgreSQL / SQL: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

## Owner-visible outcome

The consumed Image-Manifest Diagnostic proved the exact pinned PostgreSQL
image was `IMAGE_MISSING`. This Card proposes one separate local diagnostic
that may inspect that exact reference, make at most one anonymous exact
`linux/arm64` pull only when it is absent, inspect it once afterward, retain a
strict body-free descriptor tuple and stop.

These Card bytes do not prepare or consume a grant, resolve the Docker socket,
call Docker, contact a registry, pull an image, clean a cache or resource,
start PostgreSQL, run SQL, correct a pin, retry a campaign, affect Production
or enter Gate C.

## Exact construction binding

| Binding | Exact value |
|---|---|
| Correction Addendum / Review SHA | `sha256:592f9e2fdb080a3f9605937251943afd2fb2f822c2871b04ae9d13c581d35b6e` / `sha256:83305354bc03c0fd1a3e945b04d4ceb6d5749f08e2c530f734502dc6921ed3a9` |
| Correction Addendum HEAD / tree | `2fe84edd9d188f35b02b226fa32ce94f5576f8de` / `5d6fb3334608ba7032aee45646b868d88ccbd1be` |
| Correction Review HEAD / tree | `eda416c2a3b591cad3fb16608ad78fef2031f174` / `859a5cca61d13992fdde184f9d537b049af6cfee` |
| Kiad HEAD / tree / G2 | `c6fe1804b1111c19d27da64f7ca76b85c0f12adf` / `3d9202f81cb09dfe9f1a6d70fb7cfb92f47cdb7a` / `sha256:d7f76c1a9af05f25952a65c5e561fa28186df390ac5a66c3416b45ca496b19f8` |
| Liad HEAD / tree / G3 | `95197de9f65469cb52e569245cf4e08190c82471` / `872cbc1fb4c0ea05bcf852ae0cc2d4c50d6469e7` / `sha256:11131eb2354616482e689fb3fc082d1ac33c7aea2ff8133e57101ac6d5a7922b` |
| Miad HEAD / tree / G10 | `f7c2e58c15371d08fef0e0f97d5558c3e05cadab` / `8d9ed275da29267a109e1e0cf72d18c940002aad` / `sha256:8001e09e1eac19218170407ea8f5d97ac028fb9b5a8a0b3178e0865f36f4b920` |
| committed-Miad audit | `sha256:295ab843212e14ccedb8b3bfa11d28ef8fa4d700a2c2a0bf639cb8c08e743155` / 0 Blocker / 0 Important |
| index / schema / evidence | `sha256:8da9ebd53e26c91de44ad277db00b5d25b22aa1e3d262dd3db0e9bb7a8bb82e9` / `sha256:2aecd08011be498edef3f7da1f27c8fc00850701183325f09dbec9fc4d7f7170` / `sha256:2b0a029f48e74fb9c1d7f3b5878465b40861cfa8c45528e9a68e5cbbd8cb74f7` |
| report / runner / runner test | `sha256:16ed0f8a78e141063f9943e42c5a8f02e14ad1da4008d576ac788614ba8d0e11` / `sha256:766d87ea00b3bc9863b50c9578314bacb9a50a90b247496aa763fad924f8c152` / `sha256:cb072c2aaac6dac595adab0e01226020694e02dc8eef73732debcdc18dedcccb` |

Miad is the direct child of Liad and changes exactly ten paths: one added
construction report plus nine modified current-status surfaces. The complete
`Kiad -> Liad -> Miad` construction is exactly 15 paths across three commits:
11 modified and four added, with no dependency, lockfile, SQL or mode change.

## Immutable predecessor diagnostic

The consumed Image-Manifest Diagnostic remains bound to:

- Card / Review SHA
  `sha256:f0a0bf2dbe00e6a1ba2f49b6e2b58898136402e685c3cd0afe8a55883b26fdb8`
  / `sha256:73e6b30cbec9e5abbd52a1bdddf893bf89065c77381b1c6346d903d24ff77c66`;
- Card / Review HEAD/tree `6a040deb80dc9c22d131bcf6bb0d2eadbdca7d81`
  / `9774d6dab1af9bd8acea760f8b10e406bef46303` and
  `b4aae98488e934d921c1deb5c526286c49d22503` /
  `72ffc8ce9c19058894864846f5705d1234d7ced8`;
- canonical predecessor payload
  `sha256:99d17e705204a8e2bb532cffc25ee845eddd29d242f5e518bac78e9b8db39414`;
- root `/Users/zaynw/.forme-r4-image-manifest-diagnostic-f0a0bf2d`,
  device/inode `16777231 / 35062239`, uid `501`, mode `0700`, and exact
  four retained entries;
- Owner receipt `sha256:07963ed22fbb1c96c3161bf9bc0527003907920fe44ae57f2954cbf9d1f59445`
  / `1030` bytes;
- consumed grant `sha256:f497fc8ed003aebf42d975494730f184ba1f93355b6474ff7c3526e2d2533a22`
  / `4401` bytes;
- terminal evidence `sha256:e149627976e1f2bf1927dbcec25a82e545f8d892d2b5865e288d6941dcbb9ad7`
  / `6639` bytes; and
- journal `10` / `sha256:b9dcfb5134225497d8efc546f3ad7749ee931f29cf2db8e162037832af9a6a86`.

Its terminal truth remains `FAILED /
local_postgres_image_manifest_diagnostic_failed / IMAGE_MISSING`, with
`version 1`, `image.inspect 1`, `image.pull 0` and every wider effect zero.
The new diagnostic never reads, changes, deletes or reuses that root.

## Canonical authority payload

The line between the two literal markers is canonical JSON without a trailing
line ending. The runner extracts and strictly compares these exact bytes.

R4_LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_AUTHORITY_V1_BEGIN
{"artifacts":{"artifactIndexSha256":"sha256:8da9ebd53e26c91de44ad277db00b5d25b22aa1e3d262dd3db0e9bb7a8bb82e9","committedStatusAuditSha256":"sha256:295ab843212e14ccedb8b3bfa11d28ef8fa4d700a2c2a0bf639cb8c08e743155","constructionReportSha256":"sha256:16ed0f8a78e141063f9943e42c5a8f02e14ad1da4008d576ac788614ba8d0e11","evidenceSchemaSha256":"sha256:2aecd08011be498edef3f7da1f27c8fc00850701183325f09dbec9fc4d7f7170","evidenceSha256":"sha256:2b0a029f48e74fb9c1d7f3b5878465b40861cfa8c45528e9a68e5cbbd8cb74f7","runnerSha256":"sha256:766d87ea00b3bc9863b50c9578314bacb9a50a90b247496aa763fad924f8c152","runnerTestSha256":"sha256:cb072c2aaac6dac595adab0e01226020694e02dc8eef73732debcdc18dedcccb"},"authority":{"correctionAddendumSha256":"sha256:592f9e2fdb080a3f9605937251943afd2fb2f822c2871b04ae9d13c581d35b6e","correctionOwnerReviewSha256":"sha256:83305354bc03c0fd1a3e945b04d4ceb6d5749f08e2c530f734502dc6921ed3a9"},"ceilings":{"dockerCalls":{"container.create":0,"container.inspect":0,"container.rm":0,"container.start":0,"container.stop":0,"image.inspect":2,"image.pull":1,"network.create":0,"network.inspect":0,"network.rm":0,"version":1,"volume.create":0,"volume.inspect":0,"volume.rm":0},"maximumConsumptions":1,"maximumDiagnosticLifecycles":1,"maximumPrepareAttempts":1},"host":{"dockerCli":"/Applications/Docker.app/Contents/Resources/bin/docker","dockerCliSha256":"sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a","dockerClientVersion":"29.3.1","dockerServerPlatform":"linux/arm64","dockerServerVersion":"29.3.1","imagePlatform":"linux/arm64","imageReference":"postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74"},"lineage":{"correctionAddendumHead":"2fe84edd9d188f35b02b226fa32ce94f5576f8de","correctionAddendumTree":"5d6fb3334608ba7032aee45646b868d88ccbd1be","correctionOwnerReviewHead":"eda416c2a3b591cad3fb16608ad78fef2031f174","correctionOwnerReviewTree":"859a5cca61d13992fdde184f9d537b049af6cfee","evidenceHead":"95197de9f65469cb52e569245cf4e08190c82471","evidenceTree":"872cbc1fb4c0ea05bcf852ae0cc2d4c50d6469e7","implementationAggregateSha256":"sha256:d7f76c1a9af05f25952a65c5e561fa28186df390ac5a66c3416b45ca496b19f8","implementationHead":"c6fe1804b1111c19d27da64f7ca76b85c0f12adf","implementationTree":"3d9202f81cb09dfe9f1a6d70fb7cfb92f47cdb7a","statusAggregateSha256":"sha256:8001e09e1eac19218170407ea8f5d97ac028fb9b5a8a0b3178e0865f36f4b920","statusHead":"f7c2e58c15371d08fef0e0f97d5558c3e05cadab","statusTree":"8d9ed275da29267a109e1e0cf72d18c940002aad"},"localOnly":true,"priorDiagnostic":{"consumedGrantByteCount":4401,"consumedGrantSha256":"sha256:f497fc8ed003aebf42d975494730f184ba1f93355b6474ff7c3526e2d2533a22","dockerVersionCount":1,"evidenceByteCount":6639,"evidenceSha256":"sha256:e149627976e1f2bf1927dbcec25a82e545f8d892d2b5865e288d6941dcbb9ad7","imageInspectCount":1,"imagePullCount":0,"journalEntryCount":10,"journalHeadSha256":"sha256:b9dcfb5134225497d8efc546f3ad7749ee931f29cf2db8e162037832af9a6a86","ownerApprovalReceiptByteCount":1030,"ownerApprovalReceiptSha256":"sha256:07963ed22fbb1c96c3161bf9bc0527003907920fe44ae57f2954cbf9d1f59445","predecessorCardHead":"6a040deb80dc9c22d131bcf6bb0d2eadbdca7d81","predecessorCardSha256":"sha256:f0a0bf2dbe00e6a1ba2f49b6e2b58898136402e685c3cd0afe8a55883b26fdb8","predecessorCardTree":"9774d6dab1af9bd8acea760f8b10e406bef46303","predecessorPayloadSha256":"sha256:99d17e705204a8e2bb532cffc25ee845eddd29d242f5e518bac78e9b8db39414","predecessorReviewHead":"b4aae98488e934d921c1deb5c526286c49d22503","predecessorReviewSha256":"sha256:73e6b30cbec9e5abbd52a1bdddf893bf89065c77381b1c6346d903d24ff77c66","predecessorReviewTree":"72ffc8ce9c19058894864846f5705d1234d7ced8","retainedEntries":["image-manifest-diagnostic.consumed.json","image-manifest-diagnostic-evidence.json","image-manifest-diagnostic-journal-v1","owner-approval-receipt"],"root":"/Users/zaynw/.forme-r4-image-manifest-diagnostic-f0a0bf2d","rootDevice":16777231,"rootInode":35062239,"rootMode":"0700","rootUid":501,"terminalClassification":"IMAGE_MISSING","terminalCode":"local_postgres_image_manifest_diagnostic_failed","terminalStatus":"FAILED","widerEffectCount":0},"productionEffectsAllowed":false,"schemaVersion":"r4.public-core-local-postgres-image-acquisition-diagnostic-authority.v1"}
R4_LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_AUTHORITY_V1_END

Canonical payload SHA-256:
`sha256:fe44f267ac9663919a4e63ab075ed85a40bdf48b4128cdffaeed52fb107ec7ea`
/ `4263` bytes. No prose overrides this payload.

## Nine Owner choices

A later exact approval accepts all nine choices together:

1. **Preserve consumed diagnostic truth.** Bind the exact predecessor
   Card/Review, payload, root identity, retained closure, grant, evidence and
   journal. Never read, reuse, mutate, delete or reinterpret that authority.
2. **Acquire only the exact pinned identity.** Permit only
   `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
   on `linux/arm64`; reject tags, fallback references, alternate registries and
   digest substitution.
3. **Authorize one prepare in a fresh membrane.** Permit one fresh canonical
   current-uid mode-0700 root containing only an external Owner approval
   receipt, then one no-follow mode-0600 pending grant. Grant ID, CLI/socket
   identities and timestamps are fresh; lifetime is positive and at most 24
   hours. Prepare makes zero Docker calls.
4. **Authorize one consumption and lifecycle.** Permit one atomic
   pending-to-consumed transition and one diagnostic lifecycle. Duplicate
   consume, retry, replay, re-entry, old-grant reuse or a second lifecycle is
   forbidden.
5. **Permit one closed conditional Docker sequence.** Cached-present is
   `version -> inspect -> stop`. Exact-missing is
   `version -> inspect -> one anonymous pull -> inspect -> stop`. Ceilings are
   version one, inspect two and pull one; every container/network/volume kind
   remains zero.
6. **Keep credentials, network and evidence narrow.** Use a fresh 0700 HOME and
   DOCKER_CONFIG with exact `{"auths":{}}`, cleared ambient proxy/helper
   variables and no login/credentials. Persist only body-free byte counts,
   hashes, line-shape facts, closed outcomes, cache state and the allowlisted
   descriptor tuple.
7. **Make cache residue honest.** Allow only an exact complete image cache or
   Docker-managed partial/unknown residue after ambiguity. Do not remove or
   prune images, and distinguish `PRESENT`, `ABSENT`, `PARTIAL_OR_UNKNOWN` and
   `AMBIGUOUS`.
8. **Require write-ahead and no retry.** Reserve every Docker call durably
   before invocation. Nonzero exit, timeout, signal, crash, malformed body,
   host drift or ambiguity consumes its budget and stops without replay or
   repair.
9. **Do not auto-correct or continue.** The result cannot change the manifest
   pin/rule, prepare a replacement campaign, create/clean resources, reach
   PostgreSQL/SQL, affect product runtime, activate Production or enter Gate C.
   Even a successful tuple returns to the Owner.

## Exact Docker and effect ceilings

| Docker kind | Maximum |
|---|---:|
| `version` | 1 |
| `image.inspect` | 2 |
| `image.pull` | 1 |
| container inspect/create/start/stop/remove | 0 / 0 / 0 / 0 / 0 |
| network inspect/create/remove | 0 / 0 / 0 |
| volume inspect/create/remove | 0 / 0 / 0 |

Maximum prepare attempts, consumptions and diagnostic lifecycles are each one.
There is no retry. The single pull must be anonymous, exact-reference and
Docker-daemon mediated. Failed-root reads/mutations, cleanup, PostgreSQL,
database, SQL, application/domain action, product runtime, Production and Gate
C effects remain zero. A complete exact image cache, or Docker-managed
partial/unknown cache state after ambiguity, is the only allowed daemon
residue.

## Proposed order after a later exact approval

1. Create one fresh diagnostic root containing only the exact external Owner
   approval receipt.
2. Revalidate committed topology and payload, then freshly capture no-follow
   Docker CLI and local socket identities without invoking Docker.
3. Create one pending grant and stop prepare.
4. Consume once and write-ahead the sole diagnostic lifecycle.
5. Require exact client/server `29.3.1` and server platform `linux/arm64`.
6. Inspect the exact pinned reference. If present, retain the tuple and stop.
7. Only if exactly missing, write-ahead and make one anonymous exact-platform
   pull, then inspect once more and retain the body-free outcome.
8. Prove exact four-file forensic closure and stop for independent audit.

## Zero effects of these Card bytes

| Effect | Actual / authorized now |
|---|---:|
| added proposal paths / commits | `1 / 1` |
| diagnostic prepare / pending / consumed grant | `0 / 0 / 0` |
| predecessor-root read / mutation | `0 / 0` |
| Docker CLI / socket / daemon / registry | `0 / 0 / 0 / 0` |
| image inspect / pull / remove / prune | `0 / 0 / 0 / 0` |
| container / network / volume / cleanup | `0 / 0 / 0 / 0` |
| PostgreSQL / SQL / product network | `0 / 0 / 0` |
| Production / Gate C | `0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

These bytes intentionally omit their own SHA/commit/tree, the future Review
SHA/commit/tree, Owner approval receipt, fresh root/host identities, grant ID,
timestamps, pending/consumed grant, journal and diagnostic receipt. A later
approval must externally bind the committed Card and direct-child Review, all
nine choices, canonical payload and exact ceilings.

## Mandatory stop

Until a later exact approval:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
IMAGE_ACQUISITION_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
