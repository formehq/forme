# R4 #67 Local PostgreSQL Physical Rebind — Effect-0 Construction Packet

- Status: **`PROPOSED_NOT_EXECUTED`**
- Updated: 2026-08-12
- Scope: **repository-only runner rebind construction and evidence freeze**
- Proposal baseline HEAD / tree:
  `2b49f6ad939993b9ff6a106fab327529a40fa20d` /
  `b40e967965d9d8878e21f2b5deff5df7aceed7f7`
- One-use local physical execution authority: **NOT_REQUESTED**
- Gate C activation authority: **NOT_REQUESTED**
- Docker, OCI, PostgreSQL, database and SQL execution authority:
  **NOT_REQUESTED**

This Packet proposes the next repository-only construction after Local
PostgreSQL Wiring Phase 1. It does not revive the physical portion of the
original Wiring Packet and grants nothing by itself. Its only proposed
implementation outcome is a committed, deny-network runner rebind plus strict
machine evidence that can later become an input to a separate one-use local
physical-execution approval.

No runner, test, schema, evidence or report byte may change until the Owner
approves this Packet's exact SHA-256, its Owner Review SHA-256, the Packet
proposal commit/tree and the final Review wrapper commit/tree. This Packet and
its Review may be prepared and frozen by two exact local documentation-only
commits. They permit no external source-control operation or physical effect.

## 1. Current truth and mandatory split

Phase 1 is frozen at:

`INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

The current application, PostgreSQL executor, application-store bridge,
corrected SQL and deny-network local runner are constructed. Target PostgreSQL
has not been started, connected to or observed. No current receipt proves a
target catalog, migration, restart, rollback or cleanup rehearsal.

The committed runner is intentionally not executable against the current
19-artifact construction state. Its frozen verifier still:

- binds the Addendum B wrapper
  `1db7b30f38ca6322a3b0ad4be6d537af9cf781e8`;
- expects a 17-path Stage-A delta;
- omits the two Addendum C Gate-B overlay tests; and
- requires the Physical Rebind Packet commit to be the direct child of that
  obsolete Stage-A shape.

The actual Stage-A implementation has 19 paths and is followed by a separate
nine-path Stage-B evidence commit. Editing the runner changes its own bytes,
so an exact physical grant cannot be frozen before the new runner commit and
its evidence wrapper exist. Physical Rebind must therefore be split:

1. **Effect 0 — repository-only rebind construction.** Rebind and test the
   runner, then freeze independent machine evidence. No Docker, PostgreSQL or
   network effect is allowed.
2. **Effect 1 — later one-use local physical execution.** Only after Effect 0
   has committed-byte review with zero Blocker and zero Important findings may
   a new execution Card and Owner Review request a short-lived one-use grant.

Approval of this Packet authorizes only Effect 0. It cannot be cited as an
Effect-1 execution approval.

## 2. Exact authority and construction lineage

| Input | Exact binding |
|---|---|
| Local PostgreSQL Wiring Construction Packet | `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258` |
| Wiring Owner Review | `sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca` |
| Wiring proposal HEAD / tree | `fd3abebec02a762d3e318ddba4415389dfd625a6` / `9f2c226d0e12d6c5747ec3b693c6ac51c7bb2b27` |
| Wiring wrapper HEAD / tree | `c878a5a534868482672838d39290e3f12e9d3b7f` / `d917fb7d2c9ade9b2d8acae5f5e7d4893e0c84c5` |
| Addendum B / Owner Review | `sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f` / `sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2` |
| Addendum B proposal HEAD / tree | `4313bd94e2a81761b4b25824b5eb82aa6396b6be` / `67233cc1ff81ec5c73b15cfcaa44fb9424d35d83` |
| Addendum B wrapper HEAD / tree | `1db7b30f38ca6322a3b0ad4be6d537af9cf781e8` / `1270bbc9beae9c446c83bbfc220e5906800890e3` |
| Addendum C / Owner Review | `sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d` / `sha256:2aaa4d1243e2813b4030a37bae2cd7f14b41ca29c3814f4bce70c4c0161f65b7` |
| Addendum C proposal HEAD / tree | `ba61f7434071b759195fd3389b84092b96f3bb0c` / `091258d78908a1a2e99542e1a5b835e84b5d3512` |
| Addendum C wrapper HEAD / tree | `deb12a045f5d84281bc9da0f110e049748949970` / `4b9028a942d4ac436527586aee64fbc23ec3488d` |
| Phase-1 Stage A `J` HEAD / tree | `bc0b52023bb19d4e41fc4daa4a1e232961e1a19b` / `d5cb758467d06bfd7f17b6ae6a34664e659e1e3d` |
| Stage-A 19-artifact aggregate `G19` | `sha256:d25ebe21a75be81371209699f072dc404947b3f2f7fb6a69c12c5c2d71d5e417` |
| Phase-1 Stage B `S` HEAD / tree | `2b49f6ad939993b9ff6a106fab327529a40fa20d` / `b40e967965d9d8878e21f2b5deff5df7aceed7f7` |
| Stage-B nine-artifact aggregate `G9` | `sha256:cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b` |

`J` is the direct child of the Addendum C wrapper and changes exactly the 19
artifacts in the pinned Phase-1 artifact index. `S` is the direct child of `J`
and changes exactly these nine Stage-B paths:

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
5. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md`
6. `docs/ROADMAP.md`
7. `docs/evidence/r4-public-core-local-postgres-wiring.json`
8. `schemas/r4/public-core/local-postgres-artifact-index.json`
9. `schemas/r4/public-core/local-postgres-wiring-evidence.schema.json`

`G19` and `G9` use unsigned UTF-8 path ordering and the exact record framing
`path bytes, NUL, sha256:<64 lowercase hex>, NUL, decimal Git-blob byte count,
LF`. They are aggregates of committed Git blobs, not worktree bytes.

The Stage-B machine bindings remain exact:

| Artifact | SHA-256 |
|---|---|
| Phase-1 artifact index | `sha256:6e63d94ce473e5d8386c46860a3e398b8331f8955003437576710c49ebe759d9` |
| Phase-1 evidence schema | `sha256:9bc0d1dbf3a1a74a272e17e4f1ad6bce9d0c33b65bcf7d4ae9fc00567f76902f` |
| Phase-1 evidence | `sha256:37a6ce9b39279281dc9a94e9ee166bf4c8b1ee70caefd3168ef556c8ff8f539d` |
| Phase-1 Construction Report | `sha256:060e6d05e91101ee95786600698b699c3796758083a2d862a23d3c907ca9ef14` |
| Successor Gate C Card | `sha256:b63aa612206af85671af44cdad1fac2727e6c0c3fc96459636f59cec8359f5bb` |

## 3. Frozen Effect-0 topology

The only valid construction topology is:

```text
S  Stage-B baseline
└─ P  add this Packet only
   └─ W  add this Owner Review only
      └─ K  modify exactly two runner implementation paths
         └─ L  add exactly three machine-evidence paths
            └─ M  add the report and update nine operational-status paths
```

- `P` must be the direct child of `S` and add only
  `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND.md`.
- `W` must be the direct child of `P` and add only
  `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-OWNER-REVIEW.md`.
- `K` must be the direct child of `W` and modify exactly the two paths in
  Section 4. It may not add, delete, rename or mode-change a path.
- `L` must be the direct child of `K` and add exactly the three machine paths
  in Section 4. It may not modify an existing path.
- `M` must be the direct child of `L`, add the Construction Report and modify
  exactly the nine operational-status paths in Section 4. It may not delete,
  rename or mode-change a path.

No commit may be amended, rebased, squashed, cherry-picked or replaced after a
downstream binding is frozen. A non-direct parent, extra delta, staged foreign
path or changed committed byte is an Owner stop.

A later Effect-1 proposal, not authorized here, must use two new direct-child
authority commits after `M`:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md`

Those later documents must bind final `K`, `L` and `M` bytes and the external
committed-byte acceptance audit of `M`, including its exact UTF-8
no-trailing-LF summary SHA-256. They must receive a separate exact Owner
approval before a pending grant may be created or consumed.

## 4. Exact fifteen-path Effect-0 workset

### Commit `K`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### Commit `L`: exactly three new paths

1. `docs/evidence/r4-public-core-local-postgres-physical-rebind.json`
2. `schemas/r4/public-core/local-postgres-physical-rebind-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-physical-rebind-evidence.schema.json`

### Commit `M`: one new report and exactly nine modified operational-status paths

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

The two authority documents in Section 3 are inputs, not Effect-0 artifacts.
The nine operational-status paths may change only in `M` to bind Effect-0
authority, artifacts, audit truth, readiness and the new mandatory stop. Their
unrelated and historical content must remain byte-identical. This includes the
three documents that Phase-1 evidence explicitly listed as stale and outside
its workset: `docs/README.md`, `docs/PRODUCT.md` and
`docs/NATIVE-HARNESS-ARCHITECTURE.md`. The prior Phase-1 index, schema,
evidence and Construction Report remain historical and immutable.
Every other prior Stage-A and Stage-B artifact, including dependencies, lock
bytes, application/store/crypto code and SQL, remains byte-identical. Runtime
and routes remain untouched. The Owner-owned `native/macos/.build/` remains
outside every workset and must not be read as evidence, staged, cleaned or
changed.

## 5. Required runner rebind

The `K` runner and tests must implement all of the following without weakening
an existing safety membrane.

### 5.1 Preserve predecessor truth

- Bind `J`, its tree, exact 19-path delta and `G19` as the immutable product
  construction baseline.
- Bind `S`, its tree, direct parent `J`, exact nine-path delta and `G9` as the
  immutable Phase-1 evidence baseline.
- Validate the pinned Phase-1 index, schema, evidence, report and Card hashes.
- Keep the current lock, import closure, SQL and catalog bindings in Section 6.
- Reject the old 17-path/Addendum-B-only topology, old 14-path aggregate,
  206-column/171-constraint catalog, obsolete SQL hashes and all v1/v2 grants.
- Do not compare the post-`K` runner worktree to the historical runner blob in
  `J`; instead bind and verify the new runner through `K` and the later grant.

### 5.2 Verify the complete successor topology

The committed verifier must prove `S -> P -> W -> K -> L -> M`, with each
exact parent, tree and delta. The later v3 grant must additionally bind and
prove the two Effect-1 authority commits after `M`. At physical entry, HEAD must be the
later execution Review wrapper, the tracked worktree and index must be clean,
and every executable/source artifact must match its committed binding.

No branch-name test substitutes for commit/tree/blob verification. Git
inspection must remain closed against hooks, filesystem monitors, lazy fetch,
external diff and optional locks, and must not produce network or repository
mutation.

### 5.3 Replace the grant and receipt contracts

The runner must accept only an exact-key
`r4.public-core-local-postgres-grant.v3`. The term Owner approval receipt is a
governance byte binding, not a cryptographic signature claim. The runner must
hash the exact private receipt bytes and bind them to the grant and execution
Review before it creates the pending grant.

The v3 top-level object has exactly these keys:

```text
schemaVersion, grantId, ownerApprovalReceiptSha256, authority, lineage,
artifacts, host, ceilings, localOnly, productionEffectsAllowed, createdAt,
expiresAt
```

`schemaVersion` is the exact v3 string; `grantId` is 32 lowercase hexadecimal
characters; every SHA-256 is prefixed lowercase 64-hex; every Git object is
full lowercase 40-hex; instants are canonical UTC ISO-8601 strings;
`localOnly` is `true`; and `productionEffectsAllowed` is `false`.

`authority` has exactly these keys:

```text
wiringPacketSha256, wiringOwnerReviewSha256,
addendumBSha256, addendumBOwnerReviewSha256,
addendumCSha256, addendumCOwnerReviewSha256,
physicalRebindPacketSha256, physicalRebindReviewSha256,
executionCardSha256, executionReviewSha256,
executionAuthorityPayloadSha256
```

`lineage` has exactly these keys:

```text
addendumBWrapperHead, addendumBWrapperTree,
addendumCWrapperHead, addendumCWrapperTree,
stageAHead, stageATree, stageAArtifactAggregateSha256,
stageBHead, stageBTree, stageBArtifactAggregateSha256,
physicalRebindPacketHead, physicalRebindPacketTree,
physicalRebindReviewHead, physicalRebindReviewTree,
rebindImplementationHead, rebindImplementationTree,
rebindImplementationArtifactAggregateSha256,
rebindEvidenceHead, rebindEvidenceTree,
rebindStatusHead, rebindStatusTree,
executionCardHead, executionCardTree,
executionReviewHead, executionReviewTree
```

`artifacts` has exactly these keys, with `catalog` a closed object containing
only `tables`, `columns`, `constraints` and `indexes`:

```text
physicalRebindArtifactIndexSha256,
physicalRebindEvidenceSchemaSha256,
physicalRebindEvidenceSha256,
physicalRebindReportSha256,
rebindStatusCommittedAuditSummarySha256,
packageLockSha256,
pgImportClosureSha256,
pgImportClosureFileCount,
pgImportClosurePackageCount,
runnerSha256,
runnerTestSha256,
schemaSqlSha256,
verifySqlSha256,
rollbackSqlSha256,
catalogContractSha256,
catalog
```

`host` has exactly these keys:

```text
dockerCli, dockerCliSha256, dockerCliIdentitySha256, dockerClientVersion,
dockerServerVersion, dockerServerPlatform, socketIdentitySha256,
imageReference, imagePlatform, imagePlatformManifest, imageCachePolicy
```

The only accepted image-cache policy is
`COMPLETE_PINNED_IMAGE_CACHE_MAY_REMAIN_PARTIAL_OR_UNKNOWN_BLOCKS_GREEN`.
The CLI is the absolute path in Section 6; client and server versions are both
`29.3.1`; the server platform and image platform are `linux/arm64`. CLI and
socket identity hashes are SHA-256 over canonical JSON with exact keys
`path,dev,ino,uid,gid,mode,nlink,size,mtimeMs`; numeric identity values are
lowercase decimal strings except POSIX `mode`, which is an unprefixed octal
string. The socket record must describe a non-symlink Unix socket with
`nlink=1`; the CLI record must describe the non-symlink regular file opened
and hashed from the same descriptor. These mutable facts are re-observed after
grant consumption. A mismatch stops before pull, creation or PostgreSQL entry.

`ceilings` has exactly these scalar keys and one closed `dockerCalls` object:

```text
maximumConstructionLifecycles = 1
maximumCleanupRecoveryLifecycles = 2
maximumDockerLifecycles = 3
maximumImagePullAttempts = 1
maximumCreatedDatabaseIdentities = 2
maximumConcurrentPools = 1
maximumConcurrentClients = 1
maximumConcurrentTransactions = 1
maximumInitialReadinessAttempts = 60
maximumRestartReadinessAttempts = 60
maximumOperationalPoolConstructions = 4
maximumTotalPoolConstructions = 124
maximumTotalConnectionAttempts = 124
maximumSchemaApplies = 3
maximumVerifies = 3
maximumRollbacks = 1
maximumDomainActionInvocations = 23
maximumDistinctDomainActions = 20
maximumContainerRestarts = 1
maximumAdminCreateDatabaseStatements = 1
```

The exact per-grant Docker call maxima are:

| Kind | Maximum |
|---|---:|
| `version` | `3` |
| `image.inspect` | `2` |
| `image.pull` | `1` |
| `container.inspect` | `8` |
| `container.create` | `1` |
| `container.start` | `2` |
| `container.stop` | `4` |
| `container.rm` | `3` |
| `network.inspect` | `7` |
| `network.create` | `1` |
| `network.rm` | `3` |
| `volume.inspect` | `7` |
| `volume.create` | `1` |
| `volume.rm` | `3` |

All counters are durably enforced across the construction lifecycle and both
cleanup-only recovery lifecycles. There is no `maximumPhysicalAttempts`
field: the single pending-to-consumed transition plus
`maximumConstructionLifecycles = 1` is the sole construction-attempt
authority. The 124 total Pool constructions and connection attempts are at
most 60 initial-readiness Pools, 60 restart-readiness Pools and four
operational Pools. A private counted socket factory must increment durably
before each connect and permit only the exact random `127.0.0.1` port; each
Pool permits at most one connection attempt and no implicit reconnect. The
only connection targets are generated database A, generated database B and
built-in `postgres`; only A and B are run-owned database identities, while
`postgres` is permitted solely for the one bounded `CREATE DATABASE B`
statement.

Every effect-capable attempt uses write-ahead reservation: validate the
persisted counter and ceiling, append and fsync one canonical hash-chain
attempt entry, refresh the durable journal head, and only then invoke the
Docker call, Pool construction/connect, database creation, schema/verify/
rollback statement, domain action or restart call. Completion is a separate
canonical journal entry after the validated result. A crash or timeout between
those entries consumes the attempt budget and records an ambiguous outcome
where completion cannot be proven; it never permits a non-cleanup attempt to
be replayed. Cleanup recovery reloads the durable counters and cannot infer
permission from in-memory progress. A failed reservation or journal write
means the effect call is not entered.

Immediately before every Docker invocation, the runner reopens the absolute
CLI with `O_RDONLY | O_NOFOLLOW`, verifies the grant-bound regular-file
device/inode/mode/uid/nlink/size and hashes the same bounded bytes, then
revalidates the exact local Unix-socket lstat identity. It rechecks the CLI
path identity and socket identity again after the bounded subprocess returns;
post-call drift makes that call's outcome ambiguous. Immediately before every
later non-Docker effect reservation it performs the same CLI-path and socket
identity checks, so host drift cannot be discovered only after more SQL.
There is no PATH lookup, symlink follow or replacement identity adoption. Any
drift forbids new effects; exact-owned cleanup may use only the still-matching
original identities, otherwise it records `BLOCKED`, preserves forensic state
and returns for separate rescue authority.

The later execution Card must contain exactly one canonical-JSON authority
payload between the literal ASCII lines
`R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_BEGIN` and
`R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_END`. The payload is a
closed object with exact schema version
`r4.public-core-local-postgres-execution-authority.v1`; authority values only
through the Physical Rebind Packet/Review; lineage only through `M`; every
artifact value; host-design values except the fresh CLI and socket identities; every
ceiling; the exact array `dynamicSlots` containing only `grantId`,
`ownerApprovalReceiptSha256`, `dockerCliIdentitySha256`,
`socketIdentitySha256`, `createdAt` and `expiresAt`; and the two closed
booleans. It must not contain its own
SHA/HEAD/tree, the execution Review SHA/HEAD/tree or the future Owner approval
receipt hash. Those values are derived from committed topology and private
input by the prepare entry and added only to the grant.
The runner must parse exactly one payload from the committed Card Git blob,
require canonical JSON, hash it into `executionAuthorityPayloadSha256`, and
compare every duplicated grant value. No prose-only grant widening is
accepted.

The runner must export
`prepareLocalPostgresPendingGrantV3({ privateRoot, executionReviewHead,
ownerApprovalReceiptPath, createdAt, expiresAt })` and expose only the exact CLI
equivalent:

```text
prepare --grant-root ABSOLUTE --execution-review-head 40HEX \
  --owner-approval-receipt ABSOLUTE --created-at UTC-INSTANT \
  --expires-at UTC-INSTANT
```

That entry verifies `J/S/P/W/K/L/M`, the execution Card/Review, the canonical
authority payload, current HEAD/index/tracked cleanliness, committed runtime
bytes and a no-follow mode-0600 Owner approval receipt. The supplied receipt
path must resolve exactly to the already-created fixed private-root child
`owner-approval-receipt`; symlinks, hardlinks, alternate basenames and paths
outside the run root fail closed. Before reading it, the private root must be a
real, current-uid, mode-0700, nlink-2 directory containing exactly that one
entry and nothing else; any pending/consumed grant, journal, evidence, secret,
Docker config, imported runtime, lease, draft or unknown entry stops.

The approval receipt must be a current-uid, mode-0600, nlink-1 regular file of
1 through 16,384 bytes. It is opened once with `O_RDONLY | O_NOFOLLOW`; the
same descriptor is fstat-checked before and after one bounded read for stable
device, inode, mode, uid, nlink and size. Bytes must be valid NFC UTF-8 with no
NUL and no trailing LF. They are hashed from that same Buffer, never logged,
then zeroed after grant construction.

The entry resolves and hashes the fresh local socket identity, creates a
random grant id, derives all fixed fields, and writes exactly one mode-0600
pending grant with no-follow, exclusive creation and directory fsync. Final
root entries are exactly the receipt and `grant.pending.json`. It performs no
Docker call, network operation, PostgreSQL connection or SQL. Effect 0
constructs and fake-tests this entry but does not invoke it against the host;
invocation remains Effect 1 authority.

Immediately before the pending write, prepare reads the local UTC wall clock.
The supplied `createdAt` must be within 60 seconds of that observation,
`expiresAt` must be strictly later than both observed time and `createdAt`, and
must be no later than 24 hours after `createdAt`. The exact observed instant is
written into the body-free prepare receipt but is not an extra grant slot.
Every later non-cleanup reservation rechecks that wall time has not moved
before `createdAt - 60 seconds`, has not moved behind the last durable journal
instant and is not later than `expiresAt`; otherwise only cleanup is allowed.

The v3 fields must bind:

- the approved Packet, Review, `P` and `W`;
- Addenda B and C plus their Reviews and wrappers;
- `J` / tree / `G19` and `S` / tree / `G9`;
- `K` / tree / exact two-path aggregate and runner/test hashes;
- `L` / tree / exact three-path delta plus index/schema/evidence hashes;
- `M` / tree / exact ten-path delta plus report hash and operational-status bytes;
- both later Effect-1 authority commits, their document hashes and the exact
  external Owner approval receipt hash;
- `package-lock.json`, the isolated `pg` import closure and its file/package
  counts;
- current schema, verify and rollback SQL plus catalog digest/counts;
- Docker CLI path/hash/version, image reference/platform/manifest and fresh
  local Unix-socket identity;
- grant id, creation/expiry instants, one-use state and exact effect ceilings.

Missing, extra, accessor-hostile, stale, expired or mismatched fields must fail
before the first Docker call. Grant lifetime remains at most 24 hours.
Pending-to-consumed remains an atomic one-use transition. The one coordinator
that owns the exclusive live lease and atomically performs that transition may
continue only its already-started, unexpired construction lifecycle. Any
later or re-entered coordinator, and the consuming coordinator after expiry,
is cleanup-only. A consumed grant never authorizes another construction
lifecycle, pull, connection, SQL statement or database identity; including
after process restart, it authorizes only exact-bound cleanup recovery.

The physical receipt must become
`r4.public-core-local-postgres-physical-result.v3`. Its top level has exactly:

```text
schemaVersion, status, code, cleanupStatus, priorEvidenceSha256,
consumedGrantSha256, authority, lineage, artifacts, hostObservation, effects,
targetObservation, cleanup, journal, readiness, coordinator
```

The closed `authority`, `lineage` and `artifacts` objects mirror the grant.
The other exact nested keys are:

```text
hostObservation:
  dockerCliIdentitySha256, dockerClientVersion, dockerServerVersion,
  dockerServerPlatform, socketIdentitySha256, imageReference, imagePlatform,
  imagePlatformManifest, imagePullAttempted, imagePullOutcome, imageCacheOutcome,
  postgresServerVersionNum

targetObservation:
  catalogOutcome, tables, columns, constraints, indexes,
  catalogContractSha256

effects:
  dockerCallCounts, initialReadinessAttemptCount,
  restartReadinessAttemptCount, poolConstructionAttemptCount,
  poolConstructionCount, connectionAttemptCount,
  connectionTargetCounts, databaseIdentityAttemptCount, databaseIdentityCount,
  schemaApplyAttemptCount, schemaApplyCount, verifyAttemptCount, verifyCount,
  rollbackAttemptCount, rollbackCount, domainActionInvocationAttemptCount,
  domainActionInvocationCount, distinctDomainActionAttemptCount,
  distinctDomainActionAttemptSetSha256, distinctDomainActionCount,
  distinctDomainActionSetSha256,
  containerRestartAttemptCount, containerRestartCount,
  maximumObservedConcurrentPools, maximumObservedConcurrentClients,
  maximumObservedConcurrentTransactions

cleanup:
  ownedContainerCount, ownedNetworkCount, ownedVolumeCount,
  ownedCredentialCount, ownedDockerConfigCount,
  ownedImportedRuntimeCount, activeCoordinatorResidueCount,
  retainedForensicFiles

journal:
  entryCount, headSha256

readiness:
  targetPostgresObserved, productRuntimeEffects, trafficReady, gateCReady

coordinator:
  ownerIdentitySha256, leaseReleased, activeResidueCount
```

`dockerCallCounts` uses exactly the 14 Docker kind keys from the ceiling table.
`connectionTargetCounts` uses exactly `primary`, `rollback` and `admin`.
`retainedForensicFiles` is exactly the ordered array
`["grant.consumed.json","journal-v3","owner-approval-receipt",
"physical-evidence.json"]` after successful evidence publication.

`distinctDomainActionAttemptSetSha256` and `distinctDomainActionSetSha256` use
the distinct attempted and durably completed action identifiers respectively.
Both use the 20 identifiers below, sorted by unsigned UTF-8 bytes, each encoded
as its UTF-8 bytes followed by one LF, including the final LF:

```text
curation.admit
curation.unlist
interaction.create
interaction.delete
interaction.read
projection.read
projection.revoke
public_encounter.issue
room.binding.revoke
room.create
room.mode.set
room.pair
room.pair.exchange
room_operator.ack
room_operator.local_purge.receipt
room_operator.projection.deliver
room_operator.pull
room_operator.status
room_operator.sync
third_place.list
```

The 379-byte frame has exact digest
`sha256:3c4ecb0ee9cc4133c4b31abf638fc1648d29a1f715018d2925a43cf11698a21c`.
It is required for both fields iff the corresponding distinct count is `20`.
If the domain flow was not reached, all four invocation/distinct counts are
`0` and both digests are the exact string `NONE`. Partial distinct counts use
the same framing over their exact sets and are allowed only in FAILED
receipts. A failed action may therefore appear in the attempted set but not
the completed set. Duplicate identifiers never increase a distinct count,
but every invocation increases its write-ahead invocation-attempt count.

The successful flow is exactly 23 invocations: 15 initial walking-flow calls,
one post-restart replay of `room_operator.pull`, and seven closure-flow calls.
The replay duplicates `room_operator.pull`; closure duplicates
`room_operator.status` and `room.mode.set`; the resulting distinct set is the
20 identifiers above. No invocation may be retried.

The exact enums are:

```text
status = GREEN | CLEANUP_RECOVERED | FAILED
cleanupStatus = PROVEN_ABSENT | PROVEN_NO_DOCKER_ENTRY | BLOCKED | NOT_STARTED
imagePullOutcome = NOT_REQUIRED_CACHED | COMPLETED | FAILED | AMBIGUOUS | NOT_REACHED
imageCacheOutcome = VERIFIED_COMPLETE_PINNED | PARTIAL_OR_UNKNOWN | NOT_OBSERVED
postgresServerVersionNum = 160010 | MISMATCH | NOT_OBSERVED | UNKNOWN
catalogOutcome = MATCHED | MISMATCH | NOT_OBSERVED | UNKNOWN
```

For the three Docker version/platform observations, the value is the exact
grant-bound string when observed and matched, or the exact sentinel
`MISMATCH`, `NOT_OBSERVED` or `UNKNOWN`. `postgresServerVersionNum` is `160010`
only after a successful matching `SHOW`, `MISMATCH` only after a successful
safe-integer observation other than `160010`, `NOT_OBSERVED` when no result was
obtained, and `UNKNOWN` only after an ambiguous connection outcome.
`MISMATCH` and `UNKNOWN` are allowed only in a non-GREEN receipt, including a
cleanup-recovery receipt that preserves the durable observation from its
preceding failed lifecycle; raw mismatched version text is never copied into a
code or error field.

`targetObservation` is distinct from the grant-mirroring `artifacts.catalog`.
For `MATCHED`, its four counts are exactly `14 / 207 / 172 / 44` and
`catalogContractSha256` is exactly
`sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4`,
after the current `verify.sql` has validated the full catalog manifest and the
separate count query has matched. For `MISMATCH`, each safely observed count is
a nonnegative safe integer and each unavailable count is `UNKNOWN`; the hash
is `MISMATCH` unless the complete expected contract was independently
validated. For `NOT_OBSERVED` or `UNKNOWN`, all five value fields repeat that
same exact sentinel. `MISMATCH` and `UNKNOWN` are non-GREEN only; raw catalog
rows, names or diagnostic text never enter the receipt.

`code` is an exact known body-free runner code matching
`local_postgres_[a-z0-9_]{1,95}`; Green uses only
`local_postgres_physical_green`, and cleanup recovery uses only
`local_postgres_cleanup_recovered`. All effect/count fields are nonnegative
safe integers; a not-reached action is represented by count `0`, never null or
a string. `priorEvidenceSha256` is exactly the string `NONE` when no prior
receipt exists, otherwise the exact SHA-256 of the canonical prior receipt;
null and an all-zero pseudo-hash are forbidden. `UNKNOWN` is allowed only after
an ambiguous observation in a non-GREEN receipt. A Green or
`CLEANUP_RECOVERED` receipt may not contain null lineage, hash, effect or
cleanup fields.

Green requires `cleanupStatus = PROVEN_ABSENT`, complete pinned image cache,
server version `160010`, `targetPostgresObserved = true`, catalog outcome
`MATCHED` with its exact counts/contract hash, and exactly one of
these complete Docker call vectors, written in the same 14-key order as the
ceiling table:

```text
cached = {version:1,image.inspect:1,image.pull:0,container.inspect:4,
          container.create:1,container.start:2,container.stop:2,
          container.rm:1,network.inspect:3,network.create:1,network.rm:1,
          volume.inspect:3,volume.create:1,volume.rm:1}
pulled = {version:1,image.inspect:2,image.pull:1,container.inspect:4,
          container.create:1,container.start:2,container.stop:2,
          container.rm:1,network.inspect:3,network.create:1,network.rm:1,
          volume.inspect:3,volume.create:1,volume.rm:1}
```

The cached vector requires `imagePullAttempted = false` and
`imagePullOutcome = NOT_REQUIRED_CACHED`; the pulled vector requires
`imagePullAttempted = true` and `imagePullOutcome = COMPLETED`. Both require
`imageCacheOutcome = VERIFIED_COMPLETE_PINNED`. Green further requires each
fresh CLI/socket identity to equal its grant binding, Docker client/server
version `29.3.1`, Docker server platform and image platform `linux/arm64`, and
the exact grant-bound image reference and platform-manifest digest. No required
host observation may be `MISMATCH`, `NOT_OBSERVED` or `UNKNOWN`. Green also
requires `productRuntimeEffects = false`, `trafficReady = false` and
`gateCReady = false`. Each
readiness count in inclusive range `1..60`,
`poolConstructionAttemptCount = poolConstructionCount =
connectionAttemptCount =
initialReadinessAttemptCount + restartReadinessAttemptCount + 4`, and exact
connection targets:

```text
primary = initialReadinessAttemptCount + restartReadinessAttemptCount + 2
rollback = 1
admin = 1
```

Its remaining exact effect attempt/completion counts are database identity
`2/2`, schema apply `3/3`, verify `3/3`, rollback `1/1`, domain action
invocations `23/23`, distinct domain actions `20/20` with both pinned
20-action digests, and container restart `1/1`. All six owned
cleanup counts and both active coordinator-residue counts are zero,
`leaseReleased = true`, and each of the three observed concurrency maxima is
exactly `1`. No cleanup-recovery lifecycle may produce Green.

`CLEANUP_RECOVERED` requires
`cleanupStatus = PROVEN_ABSENT`; it reports every durable prior observation,
uses explicit `NOT_REACHED`/`NOT_OBSERVED` plus integer zero for stages that
never began, and never claims Physical Green. FAILED may use the other cleanup
states and ambiguous outcomes, but an unknown or partial cache can never
satisfy Green. Attempted/completed/verified/ambiguous outcomes are never
inferred from a single boolean.

### 5.4 Close the future physical observation surface

The Effect-0 implementation must construct, but must not execute, exact checks
for the later physical run:

- query and require `SHOW server_version_num` to equal `160010`;
- run that `SHOW` on the first operational primary Pool immediately after
  initial readiness succeeds and before schema apply, verify, catalog queries,
  application construction or any other schema/domain mutation; an absent,
  malformed or mismatched result stops before the first such effect;
- require target catalog `14 tables / 207 columns / 172 constraints /
  44 indexes` and catalog-contract digest
  `sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4`;
- enforce at most 60 initial readiness attempts and at most 60 post-restart
  readiness attempts, with no retry for schema, verify, rollback or domain
  mutations;
- route every `pg` connection through the counted loopback-only socket factory
  and reject an implicit reconnect or a 125th attempt;
- count every Docker call, pull attempt/outcome, connection target, database
  creation, schema apply, verify, rollback, action, restart and cleanup action;
- require exactly 20 distinct domain actions, two run-owned database
  identities and one same-container restart;
- preserve the closed Docker argv, isolated runtime import closure, body-free
  errors, secret/path canaries, ownership labels and loopback-only boundary;
  and
- prove final owned container/network/volume/credential/config/imported-
  runtime and active coordinator residue is zero before Physical Green.

The exact deterministic synthetic fixtures remain SHA-256 derivations under
domains `local-postgres-body-key-v1`,
`local-postgres-capability-pepper-v1` and
`local-postgres-publication-verifier-v1`. The exact preimage is UTF-8 bytes of
the ASCII `sha256:`-prefixed Wiring Packet digest, one NUL byte and the domain.
Each digest yields exactly 32 bytes, enters only injected test constructors,
never comes from environment, Vault or Keychain, and every owned mutable
Buffer is zeroed on every close/failure path.

The random database password's only persistent representation is a run-owned
mode-0600 file mounted read-only at the fixed `POSTGRES_PASSWORD_FILE` target.
Authentication necessarily has bounded transient credential material inside
the coordinator and `pg` driver; the runner must minimize its lifetime, close
all handles and zero every owned mutable Buffer, but must not claim that an
immutable third-party string was zeroed. Secret bytes never enter argv,
environment, daemon metadata, stdout/stderr, logs, journal, errors, receipts or
evidence. The private host source path may enter only the one exact closed
`container create --mount` argv, the exact-owned container's daemon metadata,
and in-process `container inspect` stdout required to validate that mount. It
is discarded after closed parsing and never emitted or persisted to logs,
journal, errors, receipts or evidence. Its in-memory Buffer is zeroed.

After exact-owned cleanup, leases, drafts, candidates, provisional receipts,
credentials, Docker config and imported runtime must be absent. Until the
post-run evidence audit and handoff are complete, the private root may retain
only the consumed grant, canonical hash-chain journal, final body-free receipt
and the no-follow Owner approval receipt. Those forensic bytes are not active
coordinator residue and may be removed only under the later Card's explicit
evidence-retention/cleanup rule. If CLI or socket identity drifts after
consumption, cleanup must not follow a replacement CLI/socket; it reports
`BLOCKED`, preserves forensic state and returns for separately approved rescue
authority.

A failed or ambiguous future OCI pull must be reported truthfully. A complete
exact pinned image cache may remain. Partial or unknown Docker-managed cache
state blocks Physical Green and requires Owner rescue; the runner must not
claim it absent or delete unrelated daemon state. The later execution Card
must explicitly approve this exact risk policy and becomes the separate
local-disposable authority to apply, verify and roll back the current three
SQL artifacts. Neither the invalid old physical grant nor a Gate-C comment can
supply that authority.

## 6. Predecessor and immutable implementation bindings

| Binding | Exact value |
|---|---|
| `package-lock.json` | `sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f` |
| Isolated `pg` import closure | `sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4` / `145` files / `15` packages |
| Phase-1 predecessor runner, superseded only by `K` | `sha256:43f1578bdadf8c21a74337dccb715b7fb1955f967c01901857237c7fdbbd05f1` |
| Phase-1 predecessor runner test, superseded only by `K` | `sha256:b32f58555d599843cd475d19e4fd432bf65e23ed58fbb43960c599fe97e278f3` |
| `schema.sql` | `sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8` |
| `verify.sql` | `sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd` |
| `rollback.sql` | `sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4` |
| Catalog contract | `14 / 207 / 172 / 44`; `sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4` |
| Docker CLI design binding | `/Applications/Docker.app/Contents/Resources/bin/docker`; `sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a` |
| PostgreSQL image design binding | `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74` |
| Image platform / manifest | `linux/arm64`; `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf` |

Only the two explicitly labeled predecessor hashes may change, and only in
`K`; the `K` artifact index must freeze their replacements. Every other value
in this table is immutable during Effect 0.

The Docker values are construction constraints, not fresh host facts or
execution authority. Effect 0 may verify the CLI file bytes by ordinary
filesystem reads, but it may not invoke Docker or inspect the daemon, image
cache, manifest or socket. All mutable host bindings must be observed again
under the later short-lived grant.

The obsolete SQL hashes remain permanently rejected:

- `sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2`
- `sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4`
- `sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e`

## 7. Strict evidence and status freeze

The three `L` files create a new machine-evidence namespace and do not rewrite
Phase-1 history. The ten `M` files then record the committed `K/L` audit and
bring the current cockpit to the new stop without changing historical machine
evidence.

1. The artifact index lists exactly the two committed `K` paths in unsigned
   UTF-8 order, their Git-blob byte counts and SHA-256 values, and a framed
   aggregate. It binds `J`, `S`, `P`, `W` and `K`, but excludes itself, the
   evidence/schema and every `M` file from its aggregate.
2. The JSON Schema is strict Ajv 2020-12 with closed objects and exact
   constants for every known authority, lineage, workset, validation, effect,
   readiness, documentation-scope and stop field. Cross-field/hash checks not
   expressible in JSON Schema require an exact committed-byte audit command
   recorded in evidence.
3. Machine evidence binds the artifact index and evidence-schema hashes,
   exact `K` files, every completed `K` validation command/result, the
   independent committed-`K` audit, candidate-`L` latest-byte audit and all
   zero-effect counters. It must keep target PostgreSQL/catalog observation
   false; catalog counts here are static contract facts only. Its exact stop
   is
   `LOCAL_POSTGRES_PHYSICAL_REBIND_IMPLEMENTATION_EVIDENCE_GREEN /
   STATUS_FREEZE_REQUIRED / GATE_C_NOT_REQUESTED`; it may not claim the final
   Section 12 stop before `M` exists.
4. After `L` is committed, an independent committed-byte audit verifies `L`
   and produces an external exact no-trailing-LF summary/hash. That result is
   an input to `M`; it is not written back into `L`.
5. The `M` Construction Report binds `K`, `L`, index, schema and evidence,
   explains the historical 17/19 mismatch, records the committed `K/L` audit
   and candidate-`M` latest-byte audit, and states the exact stop. It must not
   contain its own hash, the `M` commit/tree, a future execution approval or a
   Physical Green claim.
6. The nine operational-status files bind the current report/machine hashes
   and replace
   only the prior current-status/next-action statements with the exact
   Effect-0 result. Historical sections remain historical. At `L`, machine
   evidence must set `operationalCurrentStatusSurfacesCurrent = false` and
   `wholeRepositoryDocumentationCurrentClaimed = false`, because status freeze
   has not happened yet. After the candidate-`M` audit, the `M` report must
   record scoped operational-status alignment as true for the exact nine paths
   above while retaining `wholeRepositoryDocumentationCurrentClaimed = false`.
   Stable, frozen and historical design/evidence documents outside this
   workset are not silently rewritten or promoted into current execution
   truth.

The one-way hash DAG is index/schema to evidence, evidence/index/schema to
report, report/evidence/index/schema to the Gate C Card, and those downstream
hashes to DECISIONS. The report never binds a cockpit hash; no artifact binds
its own hash or the `M` commit/tree. Both README files, PRODUCT, the Native
Harness architecture, VALIDATION, CONTROL and ROADMAP may link to the current
artifacts but do not introduce a reverse hash edge.

After `M` is committed, a final independent committed-byte audit is external
acceptance evidence. It is not written back into `M`; the later Effect-1 Card
must bind its exact summary hash together with the `M` HEAD/tree. This closes
the audit timing without a self-referential commit chase.

The schema is the single machine schema for Effect-0 construction evidence.
The v3 grant contract remains executable authority enforced by runner
`exactKeys`, constants and invariants. A second standalone grant schema is not
authorized because it would create an unused competing source of truth.

## 8. Required Effect-0 validation

Validation is local and deny-network only. These command strings are exact:

```text
node --check scripts/r4-public-core-local-postgres.mjs
node --import ./scripts/deny-external-network.mjs --test test/r4/public-core-local-postgres.test.ts
node --import ./scripts/deny-external-network.mjs --test test/r4/public-core-application.test.ts test/r4/public-core-privacy.test.ts test/r4/public-core-postgres.test.ts test/r4/public-core-pg-executor.test.ts test/r4/public-core-postgres-application-store.test.ts
node --import ./scripts/deny-external-network.mjs --test test/r4/public-core-*.test.ts
npm run test:r4:offline
npm run test:r4:gate-b-core
node --import ./scripts/deny-external-network.mjs --test test/*.test.ts
npm run typecheck
npm --workspace @forme/room run check:no-ai
npm run r4:docs:audit
git diff --check
```

The evidence schema fixes these commands exactly. It fixes command counts,
failed counts and deny-network flags after the candidate results exist, while
keeping command-count units separate from Node test-result units. It also
records exact committed-blob audit commands for the `S/P/W/K/L/M` topology,
artifact aggregates, hashes, schema validation and mutation rejection.

The validation matrix must include:

- runner syntax and TypeScript checks;
- the full runner fake/fault/concurrency/cleanup suite;
- positive committed-binding verification for `J`, `S`, `P`, `W`, `K`, `L`
  and candidate `M`, plus hostile tests for every parent/tree/path/hash
  substitution;
- exact v3 grant keys and rejection of v1/v2, 17-path, obsolete SQL, stale
  wrapper, wrong closure/count, wrong image/socket and expired grants before
  any Docker entry;
- source/port assertions proving ordinary and fake tests cannot resolve a
  Docker socket, invoke Docker, connect to PostgreSQL or execute SQL;
- focused Public Core, full R4 offline, Gate-B candidate, spine, no-AI and
  documentation regressions;
- strict Ajv validation plus mutations of authority, commands, counts,
  effects, readiness, stop and extra properties;
- a repository documentation-status inventory proving the three previously
  named stale files plus every operational cockpit file are current, links are
  valid and historical proposal/status text is clearly scoped;
- exact committed-blob index/aggregate/hash-DAG checks;
- independent latest-byte audits before each commit;
- committed-byte audits of `K` and `L`, recorded in downstream artifacts; and
- an external committed-byte audit of `M`, bound only by the later Effect-1
  Card, all with zero Blocker and zero Important findings.

Tests may load the already-pinned isolated `pg` import closure locally and may
construct in-memory fake Pool/Client/transaction ports. They must create no
real `pg` Pool, Client or transaction, no network-backed connection, operating-
system socket, database or SQL effect.

## 9. Effect-0 ceilings

| Effect | Maximum after exact approval |
|---|---:|
| Effect-0 tracked construction paths | `15` (`11` modified + `4` new) |
| Effect-0 implementation/evidence/status commits | `3` (`K` + `L` + `M`) |
| Dependency, lock or SQL changes | `0 / 0 / 0` |
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
external source-control maintenance is authorized.

## 10. Future Effect-1 envelope — design only

Effect 0 must construct a runner capable of enforcing this envelope, but this
Packet does not authorize any listed effect:

- one short-lived grant, one physical construction attempt and one concurrent
  exact-owned stack;
- at most three coordinator lifecycles: one construction plus at most two
  cleanup-only recoveries;
- one container, one internal network and one named volume; container create
  at most once and start at most twice for one same-volume restart;
- a random `127.0.0.1` host port only, an isolated Docker home/config and one
  run-owned 0600 password file mounted read-only;
- at most one anonymous pull attempt of the exact pinned image, only if the
  later Owner approval expressly permits it;
- exactly two created run-owned databases, plus the built-in `postgres`
  database solely for one `CREATE DATABASE` operation; at most one open Pool,
  Client or transaction at a time;
- database A: schema apply, verify, target catalog observation, exact synthetic
  23-invocation / 20-distinct-action flow, close, same-container restart,
  fresh graph/pool replay and closure flow;
- database B: create once, schema apply, verify, static seed-only proof,
  rollback, namespace-absence proof, reapply, reverify and seed-only proof;
- exact totals of three schema applies, three verifies and one rollback;
- exact-owned cleanup of container, network, volume, credential, config,
  imported runtime and every active/temporary coordinator artifact; and
- retention only of the four forensic inputs/outputs allowed in Section 5.4,
  with their eventual deletion or handoff explicitly chosen in that later
  approval.

The future Docker command set remains closed to version, exact-image inspect
or pull, and exact-name/label container, network and volume
inspect/create/start/stop/remove. `run`, `exec`, logs, copy, build, compose,
login, context mutation, system prune and unrelated-resource operations remain
forbidden. SQL travels only through the pinned loopback `pg` connection.

## 11. Hard stops

During Effect 0, stop before further non-cleanup mutation if:

- an authority hash, HEAD/tree, parent, path list, artifact hash or aggregate
  differs;
- implementation requires a sixteenth path, a fourth Effect-0 commit or a change
  to historical machine evidence, application semantics, SQL, dependency,
  runtime or route;
- a test resolves a Docker socket, invokes Docker, connects to PostgreSQL,
  executes SQL or performs external network/source-control activity;
- v3 cannot reject every obsolete binding before Docker entry;
- evidence cannot distinguish static contract proof from target observation;
- a validation lane fails for a reason other than an explicitly audited,
  fail-closed historical sentinel; or
- cleanup, untracked ownership or effect truth is ambiguous.

Only exact-owned local construction cleanup and body-free failure evidence
remain authorized after a stop. No weaker test, automatic SQL repair, broader
workset, alternate topology or physical fallback is allowed.

## 12. Required Effect-0 end state

Only these statements may become true:

- the Local PostgreSQL runner is rebound to exact `J/G19`, `S/G9` and the
  successor `P/W/K/L/M` topology;
- the executable v3 grant and physical-result contracts are constructed;
- server-version, effect-count and cleanup requirements are statically and
  deny-network tested; and
- exact Effect-0 construction evidence is frozen and independently audited.

These statements remain false:

- a one-use physical execution grant is approved, created or consumed;
- Docker or the daemon was called;
- the image or platform manifest was inspected or pulled;
- disposable or target PostgreSQL was started, connected to or observed;
- schema, verify, rollback or domain SQL was executed;
- target catalog `14 / 207 / 172 / 44` was physically verified;
- a production pool, migration, Vault, HTTPS transport, runtime/API route or
  traffic path is configured;
- Gate C is ready or approved; and
- #67 or R4 is Done.

The exact mandatory stop is:

`LOCAL_POSTGRES_PHYSICAL_REBIND_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

## 13. Approval mechanics

This Packet intentionally omits its own SHA-256, its proposal commit/tree, the
Owner Review SHA-256 and the final Review wrapper commit/tree. It also omits
all future `K`, `L`, `M`, execution-Card, execution-Review, grant and receipt
hashes.
Embedding them would create self-reference or claim bytes that do not exist.

The exact Owner approval request must externally name:

- this Packet's SHA-256;
- the companion Owner Review's SHA-256;
- Stage-B baseline `S` HEAD/tree and `G9`;
- Packet proposal `P` HEAD/tree;
- final Review wrapper `W` HEAD/tree;
- all Owner Review choices;
- the exact fifteen-path Effect-0 workset and validation requirements;
- every zero-effect ceiling in Section 9; and
- the mandatory three-part stop in Section 12.

Any changed Packet or Review byte, non-direct wrapper, different workset,
effect ceiling, topology or stop requires a newly frozen request. Even after
Effect 0 is Green, the later one-use physical execution remains a separate
Owner decision.
