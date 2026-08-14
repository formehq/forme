# R4 #67 Docker Diagnostic and Blocked-Cleanup Rescue Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Scope: repository-only correction of Docker missing-resource diagnostics and construction of a separately authorized cleanup-rescue membrane
- Baseline failed execution Review `R2` HEAD / tree:
  `6e67c1f1867d73f27674a5f056e0692c5b42d6a3` /
  `60b3d7b124968a20f6ec30700d389849dd277ab2`
- Consumed physical grant: **present, permanently non-retryable**
- Physical result: **`FAILED / BLOCKED`**
- New Docker / OCI / PostgreSQL / SQL effects requested now: **0 / 0 / 0 / 0**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Addendum requests only a repository correction. It does not authorize a
new pending grant, reuse of the consumed grant, Docker or OCI calls, cleanup,
PostgreSQL, SQL, production, traffic or Gate C. The failed Card V2, Review V2,
Owner approval receipt, consumed grant, journal and both physical receipts are
immutable historical authority/evidence and may not be overwritten, revived
or represented as a successful rehearsal.

This Addendum intentionally omits its own SHA-256 and containing proposal
HEAD/tree, its future Owner Review SHA-256 and HEAD/tree, and all future
implementation, evidence, status, Rescue Card/Review, rescue grant/receipt and
fresh Physical Execution Card/Review hashes. Those values must be supplied
externally in chronological order.

## 1. Exact failed-execution baseline

The exact repository baseline is:

| Binding | Exact value |
|---|---|
| `Mt` HEAD / tree | `45c372a4225a3f76bb16e4aad112b7f92e2760da` / `f2cf8d4988b19bc2ceadd3003285ff651a9111a2` |
| `G10t` | `sha256:64740beb22cfda60ab61a264fd74b1f0ac6bd390a6a6a6e5c7aea78207212b71` |
| committed-`Mt` audit | `sha256:2e362cc6699f94ec956ca4f625b767f4f61c6627ed7b6470c59061375b76e660` |
| Card V2 SHA / `C2` HEAD / tree | `sha256:1ca420578f3e16c75b8242d71b93ea7be18baa1815c0f83e610807f9ded7c795` / `7a533f4b2cc91070e7bd78cb6c70c1f28524ec38` / `6487d63ae0466c732f1a62ebe5e63f3067ff0e51` |
| Review V2 SHA / `R2` HEAD / tree | `sha256:e92a125cdf1f8c4df8448836275bd98225ec8ce0b764dd70dfbabc479366e377` / `6e67c1f1867d73f27674a5f056e0692c5b42d6a3` / `60b3d7b124968a20f6ec30700d389849dd277ab2` |
| canonical authority payload | `sha256:773a172f0d756b218de9ecfd7e9c2858a28b6ceb236474d103a4822a4203bf56` |
| committed runner / runner test | `sha256:c4d6bed15aa2813801feea5026554c436d35b745d724e14c73332688f020a392` / `sha256:6371de8ade9695dcb5003a84ff53063974a6eb1d4b8d76accfb28cca94b976d9` |

The exact local forensic baseline produced by the approved one-use execution
is:

| Binding | Exact value |
|---|---|
| private root | `/private/tmp/forme-r4-pg-9ZGIOLeX` |
| observed root device / inode / mode / uid | `16777231 / 32871902 / 0700 / 501` |
| Owner approval receipt | 1083 bytes / `sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c` |
| consumed grant / grant ID | 6356 bytes / `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35` / `b92ae04555cc3d69a16c06ae53b30976` |
| first failed receipt | `sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7` |
| final blocked receipt | 7180 bytes / `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c` |
| durable journal | 34 entries / head `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25` |
| final result | `FAILED / local_postgres_cleanup_unproven / BLOCKED` |
| used lifecycles | one construction + one cleanup-only recovery |
| unused old-grant ceiling | one cleanup-only recovery, intentionally not entered |

The private root contains exactly four retained forensic entries:

1. `grant.consumed.json`
2. `journal-v3`
3. `owner-approval-receipt`
4. `physical-evidence.json`

The exact derived old-grant resource identity is:

| Resource | Exact value |
|---|---|
| run ID | `b92ae04555cc3d69` |
| container | `forme-r4-public-core-local-b92ae04555cc3d69` |
| network | `forme-r4-public-core-local-net-b92ae04555cc3d69` |
| volume | `forme-r4-public-core-local-vol-b92ae04555cc3d69` |
| ownership label | `forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976` |

These filesystem identities are historical observations, not permission to
follow a replacement path. A later rescue prepare must freshly revalidate the
same canonical path, device/inode, four-entry closure and every file/hash
before it creates rescue authority.

## 2. Exact observed effect truth

Preparation succeeded once and produced the exact v3 grant. The one allowed
construction lifecycle consumed it. Docker client/server version `29.3.1`
and server platform `linux/arm64` were observed and matched the grant. The
construction then stopped at its first `container.inspect` absence preflight
with body-free code `local_postgres_docker_call_failed`.

The same consumed grant was entered once more under its cleanup-only ceiling.
That recovery performed only exact-name container/network/volume inspections
and ended `local_postgres_cleanup_unproven`. It did not enter a second
construction lifecycle.

The final durable counters are:

| Effect | Actual |
|---|---:|
| prepare / consume | `1 / 1` |
| construction / cleanup-recovery lifecycles | `1 / 1` |
| Docker `version` | `1` |
| Docker container / network / volume inspect | `5 / 4 / 4` |
| Docker image inspect / pull | `0 / 0` |
| container create / start / stop / rm | `0 / 0 / 0 / 0` |
| network create / rm | `0 / 0` |
| volume create / rm | `0 / 0` |
| Pool / connection / database identity | `0 / 0 / 0` |
| schema / verify / rollback / domain action | `0 / 0 / 0 / 0` |
| restart | `0` |
| target PostgreSQL / catalog observed | `false / false` |
| production / product runtime / traffic / Gate C | `0 / 0 / 0 / 0` |

All 14 Docker effect attempts are closed by completions; together with six
authority/lifecycle/observation events they form the 34-entry journal. There is
no open ambiguous attempt. The blocked cleanup counters are conservative
unknown-residue claims, not proof that the runner created a resource. Because
absence was not proven, the repository must not claim cleanup Green or
Physical Green.

## 3. Exact diagnostic conflict

The current runner accepts a missing resource only when Docker returns exit
status `1`, empty stdout and one exact single-line stderr diagnostic. The
closed table is narrower for container/network/volume than for image. In
particular, the image case accepts both daemon-specific and generic
`Error: No such object: ...` forms, while container accepts only
`Error response from daemon: No such container: ...`.

The physical journal proves that the first exact-name container inspection
completed and then failed before network/volume construction preflight. Two
subsequent cleanup passes completed all exact-name inspections but could not
prove absence and issued no remove call. The body-free membrane correctly did
not persist raw stderr, so the evidence supports a narrow missing-diagnostic
compatibility hypothesis but does not prove the exact unaccepted line.

The correction must therefore not add a substring, regex or arbitrary
nonzero-exit bypass. It must:

1. preserve exit-status `1`, empty-stdout, one-line and exact-resource-name
   requirements;
2. accept only a reviewed closed set of full diagnostics emitted by the pinned
   Docker client/daemon for missing image/container/network/volume objects;
3. distinguish body-free `MISSING_EXACT` from `FOUND_OWNED`,
   `FOUND_FOREIGN`, `FAILED` and `AMBIGUOUS` outcomes;
4. reject any diagnostic naming another resource, extra line, prefix/suffix,
   control character, unexpected exit status or nonempty stdout;
5. preserve write-ahead call accounting and pre/post CLI/socket/root identity
   checks; and
6. add hostile tests for every accepted full line and every near miss without
   invoking a real Docker binary or socket.

The corrected closed table is exactly the following, with each placeholder
substituted only by the already-derived exact resource name/reference:

```text
image.inspect:
  Error response from daemon: No such image: <pinned-image-reference>
  Error: No such object: <pinned-image-reference>

container.inspect:
  Error response from daemon: No such container: <exact-container-name>
  Error: No such object: <exact-container-name>

network.inspect:
  Error response from daemon: network <exact-network-name> not found

volume.inspect:
  Error response from daemon: get <exact-volume-name>: no such volume
```

Only the second `container.inspect` line is new. The image, first container,
network and volume lines are the frozen predecessor contract. No generic
object diagnostic is added for network or volume, and no capitalization,
punctuation or whitespace variant is implied.

No diagnostic correction may retroactively make the old receipt Green.

## 4. Separately prepared cleanup-rescue membrane

The corrected runner must add a dedicated rescue prepare/execute pair. The
general physical `prepare` and `physical` entries remain unchanged and may not
consume or reinterpret the old grant.

The later unique authority paths are exactly:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-OWNER-REVIEW.md`

Each must be added in its own direct, single-parent, single-path mode-100644
commit after committed `Md`. They may not overwrite or modify Card V2 or
Review V2.

### 4.1 Rescue prepare

The later exact Rescue Card/Review may authorize one command that:

- creates one fresh current-uid mode-0700 rescue root;
- reads one no-follow current-uid mode-0600 external Owner rescue-approval
  receipt;
- binds the later Rescue Card/Review HEAD/tree/SHA and canonical rescue
  payload;
- binds the corrected runner/test and committed correction evidence/status;
- binds the old private-root canonical path, fresh device/inode/mode/uid,
  exact four-entry closure, Owner receipt SHA, consumed-grant SHA, final blocked
  receipt SHA and journal entry-count/head;
- binds the exact old grant ID, three resource names and ownership label above;
- freshly binds the same absolute Docker CLI bytes/identity, local Unix socket
  identity, client/server version and `linux/arm64` platform;
- creates exactly one strict, no-longer-than-24-hour pending rescue grant; and
- enters zero Docker, OCI, PostgreSQL, SQL or network effects.

Any drift, extra root entry, altered historical byte, changed path/inode,
missing receipt, changed journal head/count, dirty tracked worktree, wrong
current HEAD or expired authority stops before Docker.

### 4.2 Rescue execution

The later rescue grant may be consumed once for exactly one cleanup-rescue
lifecycle. It may use only the original absolute CLI/socket identities and the
three exact resource names. It may:

1. verify Docker version/platform once;
2. inspect the exact container/network/volume;
3. treat only a closed exact `MISSING_EXACT` diagnostic as absence;
4. if an object exists, require the exact ownership label before any mutation;
5. stop the exact owned container only if running;
6. remove only the exact owned container, network and volume, in that order;
7. re-inspect each exact name and require `MISSING_EXACT`; and
8. publish a strict body-free rescue receipt and hash-chained journal.

It may not inspect by list/filter, enumerate unrelated resources, follow a
replacement socket/root, use wildcard names, pull or inspect an image, create
or start a resource, publish a port, mount a secret, import `pg`, connect to
PostgreSQL, execute SQL, allocate a database, enter application/runtime code,
or retry after an ambiguous/foreign/drift result.

The exact future rescue Docker ceilings are:

| Docker call | Maximum |
|---|---:|
| `version` | `1` |
| `container.inspect` | `2` |
| `container.stop` | `1` |
| `container.rm` | `1` |
| `network.inspect` | `2` |
| `network.rm` | `1` |
| `volume.inspect` | `2` |
| `volume.rm` | `1` |
| every other Docker kind | `0` |

A foreign label, malformed diagnostic, host/root drift, ambiguous call or
cleanup uncertainty produces `BLOCKED`, preserves both forensic roots and
requires a new rescue decision. `CLEANUP_RESCUE_GREEN` requires all three
exact names proven absent, zero rescue-local transient residue and an
unchanged old four-entry forensic root. It is cleanup proof only; it is not a
successful PostgreSQL rehearsal.

## 5. Exact authority and construction topology

The requested repository-only chain is:

```text
R2  6e67c1f  failed Physical Execution Review V2
└─ D   add this Diagnostic/Rescue Correction Addendum only
   └─ V   add its Owner Review only
      └─ Kd  modify exactly runner + runner test
         └─ Ld  add exactly three correction evidence paths
            └─ Md  add correction report + modify nine status paths
               └─ CR  later add Blocked-Cleanup Rescue Card only
                  └─ RR  later add Rescue Owner Review only
                     └─ externally approved rescue prepare/execute
```

- `D` and `V` are authority inputs, not construction artifacts.
- `Kd/Ld/Md` are the only construction commits requested now.
- `CR/RR` are future rescue proposal commits and are not authorized now.
- A later fresh Physical Execution Card/Review V3 is permitted only after
  rescue Green and its own evidence/status freeze; it is not part of this
  Addendum.
- Every edge is direct and single-parent. Merge, amend, rebase, squash,
  cherry-pick, replacement, rename, deletion, mode drift or extra path is a
  hard stop.

## 6. Exact fifteen-path correction workset

### `Kd`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Ld`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-docker-diagnostic-rescue-correction.json`
2. `schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-evidence.schema.json`

### `Md`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total correction workset: exactly fifteen paths, eleven modified and four
added, across exactly three commits. This Addendum, its Review and the later
Rescue Card/Review are excluded from that count.

Every dependency, lock, SQL, application/store/runtime, production
configuration, prior machine artifact, Card, Review, private forensic byte and
unlisted tracked path remains unchanged. Owner-owned
`native/macos/.build/` remains unread, unstaged, uncleaned and unchanged.

## 7. Machine evidence and audit chronology

1. Commit `Kd`; run the complete deny-network runner matrix plus exact
   diagnostic, rescue-grant, rescue-receipt, historical-binding, crash,
   concurrency, root/host-drift and zero-real-port tests. Compute a committed
   two-path aggregate and obtain latest-byte and committed-byte 0B/0I audits.
2. Add in `Ld` one strict Ajv 2020-12 evidence schema, one artifact index over
   only committed `Kd` runner/test blobs and one machine evidence record. Bind
   `R2/D/V/Kd`, the failure baseline, validation results, all zero effects and
   an interim stop. Do not bind `Ld` to itself or claim status surfaces current.
3. Commit `Ld` and audit committed bytes. In `Md`, add the Construction Report
   and update exactly nine current-status paths. The report binds `Kd/Ld` and
   their external audits without its own hash, `Md` HEAD/tree, future rescue
   authority or any approval receipt.
4. Commit `Md` and run an external committed-byte audit without writing its
   hash back into `Md`. Only that external audit may be bound by future
   `CR/RR`.
5. Any changed byte invalidates every downstream hash and requires replay
   from that point. Candidate and committed audits must each report
   `0 Blocker / 0 Important`.

The DAG remains one-way: committed `Kd` blobs to index; index and schema to
evidence; index/schema/evidence to report; report to the current Gate C Card;
all five may flow to DECISIONS. No artifact contains its own hash or a future
containing commit/tree.

## 8. Required validation

Technical Review Green requires all of:

- exact committed `R2 -> D -> V -> Kd -> Ld -> Md` topology and deltas;
- exact Card V2/Review V2, `Mt/G10t`, authority payload, old grant, two
  receipts, journal head/count and final `FAILED/BLOCKED` bindings;
- positive and hostile full-line missing-diagnostic matrices for every Docker
  resource kind, including wrong name, extra line, prefix/suffix, control
  character, wrong status and nonempty stdout;
- strict rescue prepare/grant/consume/receipt shapes with missing/extra/type,
  clock, stale root, stale journal, stale evidence, wrong resource/label,
  old runner, wrong HEAD/tree and duplicate-consume denials;
- exact Docker rescue argv/call ceilings and proof that foreign/malformed/
  ambiguous results never mutate a resource;
- root/CLI/socket same-identity checks before and after every rescue call;
- write-ahead attempt/completion, crash recovery, one-use and no-retry tests;
- proof that the old four-entry root is byte-identical after fake rescue;
- strict Ajv positive/mutation validation, cross-hash, local-link,
  no-self-reference, documentation, syntax, TypeScript, hosted-room
  no-server-AI and `git diff --check` lanes; and
- injected-port/source-control proof that all construction tests enter zero
  real Docker CLI/socket, daemon, PostgreSQL, SQL, product network, Provider or
  messaging ports.

Final test counts must be observed from committed `Kd`; historical counts may
not be copied forward as new evidence.

## 9. Effect ceiling for this approval

| Effect | Maximum |
|---|---:|
| Correction construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository/package/source-control external network | `0` |
| New pending / consumed grants | `0 / 0` |
| Remaining old cleanup recovery consumed | `0` |
| Docker CLI / daemon / OCI calls | `0 / 0 / 0` |
| PostgreSQL process / connection / database | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product network / production database or data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

The existing private root is retained forensic evidence outside the
repository. This construction may read only the exact metadata/hashes already
listed for validation fixtures; it may not mutate, clean, relocate or consume
another lifecycle from that root.

## 10. Mandatory stops

Before exact Owner approval of this Addendum and its Review:

`DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_OWNER_APPROVAL_REQUIRED / CLEANUP_RESCUE_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After genuinely Green `Kd/Ld/Md` construction and external committed-`Md`
audit:

`LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a later separately approved and genuinely Green rescue:

`LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

No stop above makes the PostgreSQL rehearsal Green, #67 Done or R4 Done.

## 11. Approval mechanics

The Owner's later correction approval must externally name all of:

- this Addendum's SHA-256 and its direct single-document proposal HEAD/tree;
- the Owner Review SHA-256 and its direct-child single-document HEAD/tree;
- baseline `R2` HEAD/tree;
- final blocked evidence SHA, consumed-grant SHA and journal head/count;
- every choice in the Review, the exact `Kd/Ld/Md` fifteen-path/three-commit
  workset, future `CR/RR` paths and all zero-effect ceilings; and
- the mandatory pre-approval and post-construction stops above.

Any changed byte or omitted choice requires a newly frozen request. Correction
approval does not authorize the later rescue or a fresh physical execution.
