# R4 #67 Local PostgreSQL Wiring Construction Packet

- Status: **`PROPOSED_NOT_EXECUTED`**
- Updated: 2026-08-11
- Scope: **#67 only — local, synthetic, disposable PostgreSQL wiring rehearsal**
- Baseline HEAD / tree:
  `c831b4d5253049c4581d3c576aea59648d699d97` /
  `90f8ad8903dba982d2e1d11db1ec31ec1ab99f57`
- Gate C activation authority: **NOT_REQUESTED**
- Production migration, deployment, publication, real Guest, Provider, merge
  and spend authority: **NOT_REQUESTED**

This Packet proposes the next repository and localhost-only construction after
Durable Public Core Technical Review Green. It grants nothing by itself. No
dependency, source, Docker, database, network or GitHub mutation may begin
until the Owner approves this Packet's exact SHA-256, its Owner Review
SHA-256, the Packet baseline commit/tree and the final review wrapper
commit/tree.

## 1. Authority lineage

| Authority or evidence | Exact binding |
|---|---|
| Durable Construction Packet | `sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31` |
| Durable Construction Owner Review | `sha256:8272df04a9374ca04be3f212cd0bc8b123d138953224c24a66d13d08912887ff` |
| Durable Construction Stage-A HEAD / tree | `bcd4259130627067e1e7cf1974513801545cda35` / `7e6c3236c06d63f06e93e8a4d1b69fe0a20bca31` |
| Durable Construction final wrapper HEAD / tree | `c831b4d5253049c4581d3c576aea59648d699d97` / `90f8ad8903dba982d2e1d11db1ec31ec1ab99f57` |
| Durable Construction artifact aggregate | `sha256:c825306a5e20e910e6fdd811d1d3599b59e317baaa18b46c98ba13b8c0c3e44f` |
| Durable Construction evidence / report | `sha256:864e94151e5bc3864f154d089da7590501dbee7eedb62e61f980118d2e0a4dc5` / `sha256:452c1c17a6cbd8a0dfab56a29654a94088978b9f483c6e837a319426dcbea657` |
| Current non-approvable Gate C Card | `sha256:dcc2fb79a96d37eba8b1b0fb276a9ee0b01a436501520e224650cabeaf2e73f6` |

The approved Addendum A remains exact: the production-shaped application and
durable persistence adapters are constructed, while credential vault,
transport, traffic and Gate C readiness remain false.

## 2. Intended outcome

Construct and test, without activating production runtime routes:

```text
PublicCoreApplicationV1
  -> exact 20-method PublicCoreApplicationStoreV1 bridge
  -> PublicCorePostgresStoreV1
  -> concrete pg executor / pool
  -> disposable local PostgreSQL 16.10
```

The rehearsal must prove that the already-reviewed one-Room / 20-action /
14-table design can cross a real PostgreSQL driver and target server while
preserving the closed action surface, ciphertext boundary, exact replay,
retention, Room lifecycle and body-free error contract.

The final honest state is:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / GATE_C_NOT_REQUESTED`

It is not production readiness, Gate C readiness, #67 Done, R4 Done,
publication authority or Owner Experience Acceptance.

## 3. Frozen dependency proposal

Only these direct dependency additions are proposed:

| Package | Placement | Exact version | Cached tarball integrity |
|---|---|---:|---|
| `pg` | `apps/room` dependency | `8.23.0` | `sha512-Ip2EQCngowJLGOfCwkFhPXU7/ljlhn6Rxlmy4XYfL2Y+vyRM59+8uR2xqRWKdYmbXmxCFOAmKxBuSUCdF34qLg==` |
| `@types/pg` | `apps/room` devDependency | `8.21.0` | `sha512-AYdtudzabjLZgVgRZmAnU8bAnVUXzuJX2IYHeSIiIHm68olD+LgQYCGWdtcNYnP0uq9c4S4NibVG3Ni7VbKW7Q==` |

Lock generation and clean materialization are pinned to Node `v24.14.1`, npm `11.11.0` and these three
commands, executed in order:

```text
npm install --offline --ignore-scripts --no-audit --no-fund --package-lock-only --save-exact --workspace @forme/room pg@8.23.0
npm install --offline --ignore-scripts --no-audit --no-fund --package-lock-only --save-exact --save-dev --workspace @forme/room @types/pg@8.21.0
npm ci --offline --ignore-scripts --no-audit --no-fund
```

An isolated detached-worktree rehearsal using the current baseline and local
npm cache resolved exactly this new lock closure:

| Package | Version | Integrity |
|---|---:|---|
| `@types/pg` | `8.21.0` | `sha512-AYdtudzabjLZgVgRZmAnU8bAnVUXzuJX2IYHeSIiIHm68olD+LgQYCGWdtcNYnP0uq9c4S4NibVG3Ni7VbKW7Q==` |
| `pg` | `8.23.0` | `sha512-Ip2EQCngowJLGOfCwkFhPXU7/ljlhn6Rxlmy4XYfL2Y+vyRM59+8uR2xqRWKdYmbXmxCFOAmKxBuSUCdF34qLg==` |
| `pg-cloudflare` | `1.4.0` | `sha512-Vo7z/6rrQYxpNRylp4Tlob2elzbh+N/MOQbxFVWCxS7oEx6jF53GTJFxK2WWpKuBRkmiin4Mt+xofFDjx09R0A==` |
| `pg-connection-string` | `2.14.0` | `sha512-XwWDGcLRGCXAR8F/AM5bG7Q+A3Wm2s6QeEjlOKZLlH3UYcguiqCWKyWXVag5TLTIjR7oOJUY8kcADaZgWPyLeg==` |
| `pg-int8` | `1.0.1` | `sha512-WCtabS6t3c8SkpDBUlb1kjOs7l66xsGdKpIPZsg4wR+B3+u9UAum2odSsF9tnvxg80h4ZxLWMy4pRjOsFIqQpw==` |
| `pg-pool` | `3.14.0` | `sha512-gKtPkFdQPU3DksooVLi9LsjZxrsBUZIpa+7aVx+LV5pNh0KzP4Zleud2po+ConrxbuXGBJ6Hfer6hdgpIBpBaw==` |
| `pg-protocol` | `1.16.0` | `sha512-sILXutLVjCLjcDuOmvhX5e2Z4cS5qG/6Bu3VkpFwdf/633ElGLpEh9bgmuI5I4sqKqkifQiGyiCcx1HdtrK7tg==` |
| `pg-types` | `2.2.0` | `sha512-qTAAlrEsl8s4OiEQY69wDvcMIdQN6wdz5ojQiOy6YRMuynxenON0O5oCpJI6lshc6scgAY8qvJ2On/p+CXY0GA==` |
| `pgpass` | `1.0.5` | `sha512-FdW9r/jQZhSeohs1Z3sI1yxFQNFvMcnmfuj4WBMUTxOrAyLMaTcE1aAMBiTlbMNaXvBCQuVi0R7hd8udDSP7ug==` |
| `postgres-array` | `2.0.0` | `sha512-VpZrUqU5A69eQyW2c5CA1jtLecCsN2U/bD6VilrFDWq5+5UIEVO7nazS3TEcHf1zuPYO/sqGvUvW62g86RXZuA==` |
| `postgres-bytea` | `1.0.1` | `sha512-5+5HqXnsZPE65IJZSMkZtURARZelel2oXUEO8rH83VS/hxH5vv1uHquPg5wZs8yMAfdv971IU+kcPUczi7NVBQ==` |
| `postgres-date` | `1.0.7` | `sha512-suDmjLVQg78nMK2UZ454hAG+OAW+HQPZ6n++TNDUX+L0+uUlLywnoxJKDou51Zm+zTCjrCl0Nq6J9C5hP9vK/Q==` |
| `postgres-interval` | `1.2.0` | `sha512-9ZhXKM/rw350N1ovuWHbGxnGh/SNJ4cnxHiM0rxE4VN41wsg8P8zWn9hv/buK00RP4WvlOyr/RBDiptyxVbkZQ==` |
| `split2` | `4.2.0` | `sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==` |
| `xtend` | `4.0.2` | `sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==` |

The resulting predicted `package-lock.json` SHA-256 is
`sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`.
The same detached-worktree rehearsal materialized the complete dependency tree
from cache with the pinned lock, lifecycle scripts disabled and no network;
`npm ls pg @types/pg --all --depth=1` resolved only
`@forme/room -> pg@8.23.0 / @types/pg@8.21.0`, and the lock hash remained
byte-identical.
The construction must reproduce this exact closure and hash before source
implementation begins. Any missing cache entry, npm version drift, package,
version, integrity or lock mismatch stops before implementation.

No other package, global install, registry resolution, package-manager upgrade
or lockfile rewrite is authorized.

The first two commands run in the construction worktree and may change only
the two tracked manifest/lock paths. The third command runs only after a Stage
A candidate commit, inside a run-owned mode-`0700` detached worktree; it
materializes the complete exact monorepo lock tree, including the fifteen new
entries above and every unchanged baseline entry, into that detached
worktree's ignored `node_modules`. It must not delete or rebuild the Owner's
shared working-tree `node_modules`.

The tracked-path workset does not treat the detached worktree's ignored
`node_modules` bytes or npm's user cache as source artifacts. Construction may
read the existing npm cache; it may not run cache verification, garbage
collection, global installation or cache repair. Any run-owned npm log/temp
path must be redirected to the detached mode-`0700` root. The detached
worktree, its `node_modules` and logs must be removed after validation. Final
evidence must prove that the only new lock entries are the fifteen frozen
entries above, only the two tracked manifest/lock paths changed for dependency
materialization, and the lock hash stayed exact after tests.

## 4. Frozen PostgreSQL artifact proposal

The only downloadable runtime artifact is:

| Field | Exact value |
|---|---|
| Label | `postgres:16.10-bookworm` |
| OCI reference | `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74` |
| Platform | `linux/arm64` |
| Platform manifest | `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf` |

The host inspection found no local PostgreSQL binary and no cached copy of
this image. After exact Owner approval, one anonymous pull of only this pinned
artifact is allowed. The only approved Docker CLI is the real file
`/Applications/Docker.app/Contents/Resources/bin/docker`, SHA-256
`10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a`,
client/server `29.3.1`, with server `linux/arm64`. The `/usr/local/bin/docker`
symlink may be inspected but never invoked as the execution authority.

Every Docker CLI call must use an exact absolute CLI path. Before clearing the
environment, the runner obtains the invoking uid's home from
`os.userInfo().homedir`, validates it as an absolute current-owned directory,
appends the fixed relative path `.docker/run/docker.sock`, and validates the
result as a current-owned local Unix socket. The absolute socket path remains
private in process memory; its SHA-256 may enter a body-free receipt, but the
path itself must not enter source, logs, errors or evidence. The runner then
passes the already-resolved absolute value as explicit `--host unix://...`
argv; it never expands the isolated child `HOME` to choose a daemon. Every
call also uses a cleared
environment that contains no inherited `DOCKER_HOST`, `DOCKER_CONTEXT`, `DOCKER_TLS`,
`DOCKER_TLS_VERIFY`, `DOCKER_CERT_PATH`, proxy, registry or credential-helper
variable. The socket must resolve to a current-owned local Unix socket beneath
the Owner's home; TCP, SSH and context fallback are forbidden. The runner must
use a separate run-owned mode-`0700` `HOME` and `DOCKER_CONFIG` whose exact
plain JSON contains only an empty `auths` object and no credential store,
helper, plugin, context or registry entry. It must never read the Owner's
normal Docker config.

Registry login, ambient Docker credential reads, other image pulls, package
installation, Docker Desktop installation or Docker settings changes are
forbidden. The isolated home/config must be deleted and its absence proven.
The exact public image cache may remain after rehearsal; every run-owned
container, network, volume, database and credential must be removed.

Docker Desktop must already be running. Codex must not start, restart, upgrade,
log in to or reconfigure Docker Desktop.

## 5. Exact construction workset

Stage A implementation may change exactly these fourteen paths:

1. `apps/room/package.json`
2. `package-lock.json`
3. `apps/room/src/public-core-pg-executor.ts` — new
4. `apps/room/src/public-core-postgres-application-store.ts` — new
5. `apps/room/src/public-core-postgres.ts`
6. `apps/room/src/public-core-application.ts`
7. `apps/room/src/public-core-crypto.ts`
8. `scripts/r4-public-core-local-postgres.mjs` — new
9. `test/r4/public-core-pg-executor.test.ts` — new
10. `test/r4/public-core-postgres-application-store.test.ts` — new
11. `test/r4/public-core-local-postgres.test.ts` — new
12. `test/r4/public-core-application.test.ts`
13. `test/r4/public-core-postgres.test.ts`
14. `test/r4/public-core-privacy.test.ts`

Stage B evidence and status may change exactly these nine paths:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md` — new
2. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
3. `docs/evidence/r4-public-core-local-postgres-wiring.json` — new
4. `schemas/r4/public-core/local-postgres-wiring-evidence.schema.json` — new
5. `schemas/r4/public-core/local-postgres-artifact-index.json` — new
6. `docs/DECISIONS.md`
7. `docs/CONTROL.md`
8. `docs/ROADMAP.md`
9. `README.md`

The Packet and Owner Review proposal files are authority inputs, not Stage A
or Stage B construction outputs.

No unlisted path may change. In particular these remain byte-identical:

- `apps/room/src/runtime.ts`;
- `apps/room/app/api/v1/[...segments]/route.ts`;
- production config, identity and policy files except for reading their frozen
  interfaces;
- credential-vault and HTTPS connector modules;
- the three proposed SQL artifacts and every historical Gate-B artifact; and
- all files under `native/macos/.build/`.

## 6. Application-to-PostgreSQL bridge contract

The bridge must be action-specific and total over the existing exact 4-read /
16-mutation allowlist. It must not expose a generic SQL executor, generic save,
arbitrary result JSON, caller-provided SQL or environment/DSN fallback.

Required properties:

- the concrete executor owns one injected `pg` Pool or Client interface and
  enforces `READ COMMITTED`, one callback, exact COMMIT or ROLLBACK and release;
- connection, query, transaction, callback, cleanup and ambiguous-commit
  errors cross a fixed body-free membrane;
- caller, driver and row objects are descriptor-snapshotted before validation;
- all 20 application-store methods map to the existing named PostgreSQL store
  methods and exact closed result unions;
- encryption, keyed digests, IDs, secrets, timestamps and event hashes use the
  reviewed production-specific contracts, with no plaintext fallback;
- the only crypto-surface change may add a narrowly authenticated decryption
  path for SQL fields that store the existing canonical body hash rather than
  a separate raw-plaintext hash: AES-GCM tag and exact AAD validate first,
  plaintext remains inside the sanitized callback, then the exact canonical
  body hash must match before a typed value can leave; this path may not weaken
  nonce, tag, AAD, size, key-version, error or zeroization rules;
- every Room-operator action derives a keyed binding-credential digest from
  the supplied authorization secret and compares it against the exact current
  `room_bindings.credential_digest` inside its named SQL transaction; an
  embedded binding ID, an in-memory secret map or a prior process-local lookup
  is never authority;
- replay remains deterministic across a new application, bridge, Pool and
  process-local object graph; and
- SQL-created Rooms begin `closed`; only the exact action-aware mode transition
  may open `public_single` for intake.

If bridge construction proves that the application contract or prepared SQL
cannot represent the same approved semantics, changes are allowed only within
the listed application/PostgreSQL source paths and must preserve the exact
20/25 action partition and 14-table schema. Any required SQL/schema semantic
change stops and returns to the Owner; the three SQL files are immutable in
this grant.

## 7. Disposable physical rehearsal

The physical runner may perform at most three sequential lifecycles with at
most one owned stack present at a time:

- resource prefix: `forme-r4-public-core-local-` plus a run-owned random ID;
- one temporary container, one internal Docker network and one named volume;
- no shared, pre-existing or unrelated Docker resource;
- one randomly assigned `127.0.0.1` host port mapped to PostgreSQL 5432;
- at most two exact run-owned temporary database identities total across the
  complete approved attempt, with at most one open Pool/Client/transaction at
  a time and no new identity allocated by a retry;
- one random, run-scoped local database password supplied through a mode-`0600`
  run-owned secret file and `POSTGRES_PASSWORD_FILE`, never through argv,
  ordinary environment values, Docker labels, repository, logs, evidence or
  error text; and
- synthetic one-Room / one-knock fixtures only.

The host secret file may enter the container only through an exact read-only
bind mount from the run-owned temp root to
`/run/secrets/forme-r4-postgres-password`; the container receives only
`POSTGRES_PASSWORD_FILE=/run/secrets/forme-r4-postgres-password`. The mount
source and file are deleted after the owned container is removed. Inspect,
logs and evidence must retain neither the host source path nor secret bytes.

Body encryption, capability digests and publication verification use only
public deterministic test fixtures derived as 32-byte SHA-256 values from the
Owner-approved Packet SHA-256 plus the separate fixed domains
`local-postgres-body-key-v1`, `local-postgres-capability-pepper-v1` and
`local-postgres-publication-verifier-v1`. They are injected directly into the
test-only constructors, never through environment, argv, config refs, Vault or
Keychain, and their in-memory Buffers are zeroed after the run. They are not
production secrets or valid production references and must not appear in logs
or evidence.

The runner must first prove exact image identity and resource-name absence. It
must reject public bind addresses, fixed host ports, a non-empty target,
unexpected Docker state, image drift or cleanup ambiguity.

### Physical execution latch

Before the first real Docker call, the Stage A source, fake runner tests,
typecheck, no-AI boundary and an independent pre-physical committed-byte audit
must be Green. That audit freezes the clean Stage A HEAD/tree, exact 14-path
artifact aggregate, package-lock hash, runner SHA-256 and full local import
closure, and confirms that its Docker command surface contains only:

- `version`;
- `image inspect` and the single `image pull --platform linux/arm64` of the
  pinned reference;
- exact-name `container inspect/create/start/stop/rm`;
- exact-name `network inspect/create --internal/rm`; and
- exact-name `volume inspect/create/rm`.

`run`, `exec`, `logs`, `cp`, `build`, `compose`, `login`, `context`, `system`,
`prune` and every other Docker command are unavailable. Every allowed command
has a closed argv builder; resource names, labels, image, mount, bind address,
health check and cleanup flags are module constants or validated run IDs, never
caller strings.

After exact Owner approval, the construction coordinator may create one
canonical-JSON, mode-`0600` grant under the run-owned private temp root with
exact keys:

```text
schemaVersion, grantId, ownerApprovalSha256, packetSha256,
ownerReviewSha256, frozenWrapperHead, frozenWrapperTree, stageAHead,
stageATree, stageAArtifactAggregateSha256, packageLockSha256, runnerSha256,
schemaSqlSha256, verifySqlSha256, rollbackSqlSha256, socketIdentitySha256,
imageReference, maximumPhysicalAttempts, maximumDockerLifecycles,
localOnly, productionEffectsAllowed, createdAt, expiresAt
```

The fixed values are `schemaVersion = r4.public-core-local-postgres-grant.v1`,
`maximumPhysicalAttempts = 1`, `maximumDockerLifecycles = 3`,
`localOnly = true`, `productionEffectsAllowed = false`; `expiresAt` must be no
more than 24 hours after `createdAt`. All hashes and commit IDs bind the exact
Owner-approved request, committed implementation/import closure, lock and SQL
bytes. Immediately before grant consumption and every physical entry, the
runner verifies the exact clean Stage A commit/tree, all 14 Git blobs,
aggregate, lock, runner/import closure and SQL hashes. Before the first Docker
call, it atomically renames `grant.pending.json` to `grant.consumed.json` with
exclusive no-replace semantics. Missing, expired, changed or recreated grants
fail before Docker. The body-free consumed-grant hash persists through restart
and cleanup until Stage B evidence records it; only then may the private temp
grant file be removed.

An already-consumed grant denies every new construction attempt, image pull,
resource create/start and SQL action. It authorizes only one cleanup-recovery
coordinator using the same Stage A/runner/lock/SQL/socket bindings and remaining
lifecycle budget. Resource names and labels derive only from `grantId`; a
mode-`0600` append-only hash-chained local journal records each exact owned
resource transition. Cleanup recovery may inspect, stop and remove only those
deterministically named, correctly labelled resources and delete the exact
run-owned secret/config/temp files. It cannot pull, create, start, connect,
apply SQL or allocate another identity. The journal and consumed grant remain
until Stage B records their body-free hashes and proves owned-resource absence.

The coordinator captures the daemon socket's lstat identity before grant
creation: non-symlink Unix-socket type, device, inode, uid, gid, mode, nlink,
size and millisecond mtime. Its path+identity SHA-256 is written into the grant.
The runner revalidates every field before each Docker call and stores only the
hash in receipts. Identity drift stops all new Docker calls and reports cleanup
as blocked rather than following a replacement socket.

The three immutable SQL files contain historical comments that prohibit
execution before a separately hash-pinned Gate C grant. Exact Owner approval
of this Packet is the narrower, separately hash-pinned **local disposable SQL
rehearsal execution and rollback grant** that supersedes those comments only
for the two exact run-owned local database identities and exact hashes named
here. It is not Gate C Activation and grants no production, remote, hosted or
persistent database use.

The physical sequence is:

1. create owned resources and wait for bounded local readiness;
2. apply the existing exact schema bytes
   `sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2`;
3. execute the exact read-only verify bytes
   `sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4`;
4. prove the 14-table / 206-column / 171-constraint / 44-index catalog;
5. run the synthetic application-to-database walking flow and the required
   replay, race, retention and recovery checks;
6. stop and restart the same exact owned container once against the same named
   volume, then replace the Pool/application object graph and prove durable
   replay without allocating a new resource identity;
7. close every Pool/Client to the first database, then create the second
   run-owned database, apply and verify the exact schema,
   then prove it contains only the declared installation and retention-health
   seed rows and no Room or other durable data;
8. on that seed-only state, run the exact rollback bytes
   `sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e`,
   prove the namespace is absent, then reapply and reverify; and
9. remove every owned database credential, container, network, volume and
   temporary file, then prove exact absence.

The pinned image cache may remain. The three-lifecycle ceiling includes the
initial physical run and at most two cleanup/recovery lifecycles; it is not
three independent attempts. SQL, catalog, canary, authority or scope mismatch
does not permit a retry. Cleanup failure or uncertain ownership is a hard
stop; no broad or best-effort cleanup command is permitted.

## 8. Required validation

At minimum the frozen result must include:

- executor commit, rollback, callback-once, release, timeout, disconnect and
  committed-response-lost tests;
- hostile Pool, Client, query row, getter, Proxy, symbol, canary and mutable
  alias tests;
- exact coverage of all 20 bridge methods and 25 unavailable operations;
- wrong, revoked, cross-Room and replayed binding secrets fail inside the SQL
  transaction after a fresh process/object-graph reconstruction;
- same-key/same-hash recovery and same-key/different-hash conflict for every
  mutation;
- real target-PostgreSQL schema parse, verify, catalog and empty rollback;
- one closed Room to admitted Projection to 24-hour/one-use encounter to
  encrypted Interaction to sync/pull/ACK to closure/purge synthetic flow;
- restart/reopen durability, concurrent terminal races, event continuity,
  nonce uniqueness, ciphertext/AAD, rate and retention-health checks;
- no plaintext/body/secret/capability canary in SQL diagnostics, driver
  errors, receipts, events, logs or evidence;
- ordinary `npm test`, `npm run test:r4`, deny-network and CI commands never
  pull an image, start Docker or connect to PostgreSQL; the physical test file
  exercises only injected plans/fakes unless the separately approved runner is
  invoked through the consumed exact local grant defined above;
- full existing Public Core, R4 offline, Gate-B Core, spine, typecheck,
  no-server-AI, docs and diff regressions; and
- an independent frozen-byte audit with zero Blocker and zero Important.

No validation count or Green state may be predicted before execution.

## 9. Exact effect ceiling

| Effect | Maximum authorized after exact approval |
|---|---:|
| npm registry calls | 0 |
| Dependency lifecycle scripts / global installs | 0 / 0 |
| Anonymous OCI pulls | 1 exact pinned PostgreSQL artifact |
| Ambient Docker config / registry login / credential reads | 0 / 0 / 0 |
| Product/data-plane network | loopback only |
| Concurrent owned Docker stack | 1 |
| Sequential Docker lifecycles | 3 |
| Run-owned temporary databases | 2 |
| Production or remote database effects | 0 |
| Runtime/API route activation | 0 |
| Vault/Keychain or production secret installation | 0 |
| Real Room, Projection, Curator or Guest bytes | 0 |
| Product/runtime Provider/model/email and non-source-control external messages | 0 |
| Deployment, public traffic or spend | 0 / 0 / US$0 |
| Source-control proposal | 1 new stacked branch and 1 Draft PR |
| Merge or public release | 0 |

The one OCI pull and the later proposal push/PR maintenance are the only
external-network exceptions. All test data-plane traffic is loopback. No raw
credential, DSN, secret, Guest body or private path may enter source control,
stdout, logs, diagnostics or evidence.

## 10. Stop and recovery rules

Immediately stop all non-cleanup and non-evidence mutation on:

- dependency cache, integrity or lock drift;
- unexpected image, Docker resource, public bind, external connection or
  credential access;
- SQL parse, catalog, verify or rollback mismatch;
- a required SQL/schema semantic change;
- action-surface, Room-scope, encryption, retention or replay drift;
- private canary or raw credential exposure;
- an unlisted file/effect; or
- cleanup ownership or absence that cannot be proven.

A failed physical attempt must still perform the mandatory exact-owned cleanup
and record a body-free failure receipt; those two actions remain authorized
after the stop. It may not silently pull again, change the
image, repair SQL, weaken a test or open another effect path.

## 11. Required final truth

Only after all validation and independent review may the result state:

| Fact | Required final value |
|---|---:|
| Production-shaped application adapter constructed | `true` |
| Durable persistence adapter constructed | `true` |
| Concrete `pg` executor and application-store bridge constructed | `true` |
| Disposable local PostgreSQL schema/verify/restart/empty rollback exercised | `true` |
| Credential vault adapter constructed | `false` |
| HTTPS transport adapter constructed | `false` |
| Production driver/pool configured | `false` |
| Production migration applied | `false` |
| Runtime/API route active | `false` |
| Traffic ready | `false` |
| Gate C ready | `false` |
| Real Room / publication / Guest evidence | absent / absent / absent |
| Owned container / network / volume / credential after cleanup | `0 / 0 / 0 / 0` |

The hash-pinned Gate C Card may be advanced only to a new non-approvable
successor that records the local rehearsal. Production infrastructure,
actors, publication-stable content, vault, HTTPS/edge, deployment, activation
window, disable commands and spend inputs remain separately missing.

## 12. Source-control stop

After Technical Review Green, the exact construction branch may be pushed as
`codex/r4-public-core-local-postgres-wiring` and one stacked Draft PR may be
created or updated against `codex/r4-durable-public-core-packet`. Neither this
Packet nor a Green local rehearsal authorizes merging PR #76, merging the new
Draft PR, altering other branches, publishing a release or changing GitHub
Project completion state.

## 13. Owner decision surface

The Owner must approve all six choices together or construction does not
start:

1. exact offline `pg` / `@types/pg` dependencies and lock closure;
2. one anonymous pull of the exact PostgreSQL image, with only its public image
   cache allowed to remain;
3. the canonical-body authenticated decryption path and in-transaction
   binding-credential authorization boundary, without a SQL/schema change;
4. the public deterministic crypto fixtures, exact local SQL rehearsal grant,
   one-use physical grant and closed Docker command surface;
5. the exact 14-path Stage A and nine-path Stage B worksets plus bounded local
   Docker/database effects; and
6. the final stop at Local PostgreSQL Wiring Technical Review Green with every
   production, traffic and Gate C fact still false.

Any changed Packet byte, Owner Review byte, baseline/wrapper binding,
dependency, image, workset, effect ceiling or stop condition requires a new
frozen request and new exact Owner approval.
