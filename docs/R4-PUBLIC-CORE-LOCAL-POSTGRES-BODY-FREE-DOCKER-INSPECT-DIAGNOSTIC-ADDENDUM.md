# R4 #67 Body-Free Docker Inspect Diagnostic Capture Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Scope: repository-only construction of a one-use, read-only Docker inspect
  diagnostic capture membrane
- Baseline Rescue Owner Review `RR` HEAD / tree:
  `ac1dfea899f2edff6ec59dd401d8aec6256a485f` /
  `4c93a2bbe68efae13b4caaecfd3f39cdffb9964b`
- Blocked-cleanup rescue grant: **consumed, permanently non-retryable**
- Blocked-cleanup rescue result: **`FAILED / BLOCKED`**
- New Docker / OCI / PostgreSQL / SQL effects requested now: **0 / 0 / 0 / 0**
- Physical Execution / Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**

This Addendum requests only a repository construction. It does not authorize
another cleanup rescue, reuse of either consumed grant, Docker or OCI calls,
PostgreSQL, SQL, production, traffic or Gate C. The old physical root, failed
physical evidence, rescue root, rescue consumed grant, rescue journal and
rescue evidence are immutable forensic inputs. None may be overwritten,
deleted, reclassified as Green or used as authority for a new effect.

The correction deliberately does **not** add a guessed Docker error string and
does not broaden the current exact diagnostic table. Its sole purpose is to
construct a later, separately approved, body-free diagnostic that can record
the exact shape and cryptographic fingerprints of one Docker
`container.inspect` result without persisting stdout or stderr bodies.

This Addendum omits its own SHA-256 and containing commit/tree, its future
Owner Review SHA-256 and commit/tree, and every future implementation,
evidence, status, Diagnostic Card/Review, diagnostic grant/receipt and later
cleanup-correction hash. Those values must be created and bound in
chronological order.

## 1. Exact repository and authority baseline

| Binding | Exact value |
|---|---|
| `Md` HEAD / tree | `32027d539cf043d14c6970ea9844a0e49fb284aa` / `5cae21de32d54d967e52fc96a53645ca73082dfc` |
| `G10d` | `sha256:15339dbc10ecfd60dd5cd27e47b58d9284682873eb02afffa0c63d75dc4c1334` |
| committed-`Md` audit | `sha256:d175d42b0768e0d4d216de98a49c9e038bc4cdd2df7312f794bb9a2c19036afd` |
| Rescue Card SHA / `CR` HEAD / tree | `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf` / `fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5` / `4bebb6ea518b9b86e0fed75b9b09925cfc013c91` |
| Rescue Review SHA / `RR` HEAD / tree | `sha256:db692b6a074ec60d324ceede4a74136c26a3f53d3eba31c265d7a9f4297ed154` / `ac1dfea899f2edff6ec59dd401d8aec6256a485f` / `4c93a2bbe68efae13b4caaecfd3f39cdffb9964b` |
| Rescue authority payload | `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e` |
| committed runner / runner test | `sha256:42d1c7b6640fd984a702922685cfc92181966318b7801606d17cacbf40b77f08` / `sha256:2c600732115b1e755a13af9fffd074b90831da69ea24beb1dde0635b16862cbd` |

`CR` is the direct, single-parent, one-path mode-100644 child of `Md`. `RR`
is the direct, single-parent, one-path mode-100644 child of `CR`. Any changed
parent, tree, path, mode or committed authority byte invalidates this proposal.

## 2. Exact failed rescue result

The approved rescue prepare succeeded once, and the same pending grant was
consumed once for the only authorized cleanup-rescue lifecycle.

### 2.1 Fresh rescue authority and root

| Binding | Exact value |
|---|---|
| rescue root | `/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn` |
| root device / inode / mode / uid | `16777231 / 33273981 / 0700 / 501` |
| Owner rescue-approval receipt | 1085 bytes / `sha256:21744a1ab338128f912f046159ef4ebdf74b197088bfa4973ff8d6a597e9475d` |
| consumed rescue grant | 4796 bytes / `sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654` |
| rescue grant ID | `c89d8f4e678dcf2778925af338bb1180` |
| rescue evidence | 5109 bytes / `sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979` |
| rescue journal | 6 entries / head `sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491` |
| final result | `FAILED / local_postgres_docker_call_failed / BLOCKED` |

The rescue root contains exactly four retained forensic entries:

1. `cleanup-rescue-evidence.json`
2. `owner-approval-receipt`
3. `rescue-journal-v1`
4. `rescue.consumed.json`

The rescue evidence records `rescueLocalResidueCount = 0`; these four retained
files are forensic evidence, not an active Docker, PostgreSQL or coordinator
residue.

### 2.2 Old blocked root remains unchanged

| Binding | Exact value |
|---|---|
| old private root | `/private/tmp/forme-r4-pg-9ZGIOLeX` |
| device / inode / mode / uid | `16777231 / 32871902 / 0700 / 501` |
| old Owner receipt | `sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c` |
| old consumed grant | `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35` |
| old final evidence | `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c` |
| old journal | 34 entries / head `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25` |

The old root still contains exactly `grant.consumed.json`, `journal-v3`,
`owner-approval-receipt` and `physical-evidence.json`. Its exact resource
bindings remain:

| Resource | Exact value |
|---|---|
| grant ID | `b92ae04555cc3d69a16c06ae53b30976` |
| container | `forme-r4-public-core-local-b92ae04555cc3d69` |
| network | `forme-r4-public-core-local-net-b92ae04555cc3d69` |
| volume | `forme-r4-public-core-local-vol-b92ae04555cc3d69` |
| ownership label | `forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976` |

Neither root may be followed if its path, device, inode, owner, mode, exact
entries or bound files drift. A later diagnostic prepare must revalidate both
roots without modifying either one.

## 3. Exact observed Docker truth

The rescue journal contains exactly:

1. `grant.consumed`
2. `rescue.lifecycle_started`
3. `docker.attempt` for `version`
4. `docker.completed` for `version`
5. `docker.attempt` for `container.inspect`
6. `docker.completed` for `container.inspect`

The evidence reports:

| Docker kind | Actual count |
|---|---:|
| `version` | `1` |
| `container.inspect` | `1` |
| every other Docker kind | `0` |

Docker client/server `29.3.1` and server platform `linux/arm64` matched the
grant. The exact-name `container.inspect` call completed with a stable CLI and
socket, then produced a non-success result that did not satisfy the frozen
missing-resource diagnostic predicate. The body-free runner discarded raw
stdout and stderr, so the evidence cannot distinguish among an unexpected
status, unexpected stdout or a new stderr spelling. It is therefore valid to
say only that the frozen diagnostic predicate did not match.

No stop, remove, network inspect, volume inspect, image operation, create,
start, port, PostgreSQL, connection, SQL, application, product, production,
traffic or Gate C effect occurred. Resource absence remains unknown.

## 4. Why guessing is forbidden

The previous correction added a reviewed full-line Docker diagnostic variant,
but the next exact call still did not match. Adding another guessed string,
accepting substrings, treating every exit status `1` as absence or replaying
the consumed rescue would turn an unknown outcome into a false cleanup proof.

The next construction must instead freeze a diagnostic observation format
that is useful without carrying output bodies. It must preserve the current
diagnostic table unchanged until a later observed fingerprint is reviewed.

## 5. Body-free diagnostic construction

The corrected runner must add a **separate** prepare/execute pair. It must not
alter general physical prepare/execute or cleanup-rescue prepare/execute
semantics.

### 5.1 Later diagnostic prepare

A future separately approved Diagnostic Card/Review may authorize one prepare
that:

- creates one fresh current-uid mode-0700 diagnostic root;
- reads one no-follow current-uid mode-0600 external Owner approval receipt;
- binds the future Diagnostic Card/Review HEAD/tree/SHA and canonical payload;
- binds final committed construction runner/test/evidence/status artifacts;
- binds both forensic roots and every exact identity/hash/count listed above;
- freshly binds the approved absolute Docker CLI bytes/file identity and local
  Unix socket identity;
- creates exactly one pending diagnostic grant with lifetime at most 24 hours;
  and
- performs zero Docker, OCI, PostgreSQL, SQL or network calls.

### 5.2 Later diagnostic execution

The future diagnostic grant may be consumed once for one diagnostic lifecycle.
It permits only:

1. one exact Docker `version` call; and
2. one exact-name `container.inspect` call for
   `forme-r4-public-core-local-b92ae04555cc3d69`.

Every other Docker command kind has ceiling zero. No stop, remove, create,
start, pull, port, network inspect, volume inspect, PostgreSQL, SQL or cleanup
operation is permitted. The old root, rescue root and named Docker resources
must remain unchanged.

### 5.3 Exact body-free observation

The diagnostic receipt must never persist or emit stdout/stderr bodies. For
each of the two calls it records only closed, body-free fields:

- command kind and exact invocation ordinal;
- write-ahead attempt and completion identity;
- spawn outcome `COMPLETED | TIMED_OUT | SIGNALED | SPAWN_ERROR | UNKNOWN`;
- exit status as a safe integer or exact `NOT_AVAILABLE` sentinel;
- signal name from a closed allowlist or exact `NONE | UNKNOWN` sentinel;
- stdout/stderr byte counts, each bounded by the runner's fixed output cap;
- `sha256:<64hex>` over the exact stdout and stderr bytes;
- UTF-8 validity booleans;
- empty booleans;
- LF/CRLF/other line-ending classification;
- line counts; and
- diagnostic classification
  `MATCHED_EXISTING_MISSING | FOUND_JSON | UNCLASSIFIED_NONZERO |
  AMBIGUOUS_TRANSPORT | CONTRACT_INVALID`.

For `FOUND_JSON`, the runner may parse in memory and record only body-free
ownership classification `OWNED | FOREIGN | UNLABELLED | MALFORMED`; it must
not persist the JSON body or arbitrary label values. Raw buffers are cleared
after hashing/parsing and may not enter logs, errors, journal, receipt,
evidence, command arguments or repository files.

The journal must reserve the call before invocation and complete it only after
the return status/output buffers and post-call CLI/socket/root identities are
known. A timeout, signal, spawn error, identity drift or unclassifiable return
is still a terminal diagnostic observation; it never authorizes cleanup.

### 5.4 One-use and closure rules

- pending to consumed is one atomic transition;
- no retry, replacement call or second lifecycle is allowed;
- clock, root, Owner receipt, HEAD/worktree, CLI and socket drift stop before a
  new Docker reservation;
- journal and evidence are canonical, strict, no-follow, current-uid files;
- final diagnostic root retains exactly consumed grant, journal, Owner receipt
  and diagnostic evidence;
- transient Docker config/home files are removed before terminal evidence;
- the receipt must prove both original forensic roots unchanged; and
- diagnostic success means only **observation captured**, never cleanup Green,
  Physical Green, production readiness or Gate C readiness.

## 6. Exact repository construction topology

After external approval of this Addendum and its future Review, construction
must be exactly:

```text
RR ac1dfea
└─ F   Addendum only
   └─ FV  Owner Review only
      └─ Kf  2M runner/test
         └─ Lf  3A machine evidence
            └─ Mf  9M + 1A status freeze
               └─ FC  later Diagnostic Card only
                  └─ FR  later Diagnostic Owner Review only
```

Every edge is direct, single-parent and exact-path. No merge, alternate parent,
rename, deletion, mode change or fourth construction commit is allowed.

### `Kf`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lf`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-body-free-docker-inspect-diagnostic.json`
2. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-evidence.schema.json`

### `Mf`: one added report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total construction workset: exactly fifteen paths, eleven modified and four
added, across exactly three commits. This Addendum and its Review are authority
inputs outside that workset.

The later unique diagnostic authority paths are:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW.md`

They remain future proposal paths and are not authorized by construction.

## 7. Machine evidence and audit chronology

`Lf` must use one strict JSON Schema, one artifact index and one machine
evidence record. All objects are closed with `additionalProperties: false`.
The index binds committed `Kf` bytes and aggregate but not its own hash. The
schema uses a SHA pattern/reference for its own future hash. Evidence binds the
final index and schema hashes but not its own hash or `Lf` commit.

`Lf` records committed-`Kf` and candidate-`Lf` audits only. The committed-`Lf`
audit is external and becomes an input to the `Mf` report. The `Mf` report does
not bind itself, Card/status hashes, `Mf` HEAD/tree or post-`Mf` audit. The Gate
C Card binds the finalized report; `DECISIONS` is written last and may bind the
final Gate C Card. Committed-`Mf` audit remains external for the future
Diagnostic Card. No artifact may preclaim a later audit.

Machine evidence must keep all of the following false:

- diagnostic grant prepared or consumed;
- Docker diagnostic executed;
- cleanup rescue Green;
- resource absence proven;
- physical execution performed;
- target PostgreSQL or catalog observed;
- product runtime, traffic or Gate C ready;
- #67 Done or R4 Done; and
- whole-repository documentation current.

## 8. Required validation

Technical Review Green requires:

- exact committed `RR/F/FV/Kf/Lf/Mf` parent/tree/path/blob topology;
- exact `Md/G10d`, rescue Card/Review/payload and both forensic-root bindings;
- exact committed runner/test aggregate and immutable predecessor artifacts;
- strict grant/receipt/journal schemas and missing/extra/type/accessor mutation
  matrices;
- output-fingerprint tests covering empty, UTF-8, invalid UTF-8, LF, CRLF,
  multiline, status, timeout, signal, spawn error, truncation and wrong names;
- proof that fake tests never invoke a real Docker binary, socket, PostgreSQL,
  SQL or network API;
- write-ahead, crash, duplicate consume, expiry, clock rollback, Owner receipt,
  root, CLI, socket, HEAD/worktree and forensic-drift denials;
- exact one-call ceilings and denial of every cleanup or mutation command;
- strict Ajv positive and hostile mutation tests;
- focused/full Public Core, R4 offline, Gate-B successor, syntax, TypeScript,
  hosted-room no-server-AI, docs/link/hash-DAG and `git diff --check`; and
- independent committed-byte `0 Blocker / 0 Important` audits after each
  frozen construction boundary.

Historical counts are not new validation. Final counts must be observed from
committed `Kf` bytes. No validation command may call Docker, inspect the live
socket, read PostgreSQL, use external network or access Owner `.build`.

## 9. Zero-effect ceiling selected now

| Effect | Maximum after exact construction approval |
|---|---:|
| Construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository/package/source-control external network | `0` |
| Diagnostic pending / consumed grants | `0 / 0` |
| Docker CLI / daemon / socket / OCI calls | `0 / 0 / 0 / 0` |
| Cleanup stop / remove / inspect | `0 / 0 / 0` |
| PostgreSQL process / connection / database | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product network / production data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / push / PR / merge / release / spend | `0 / 0 / 0 / 0 / 0 / 0` |
| Physical Execution / Gate C | `NOT_REQUESTED / NOT_REQUESTED` |

Any sixteenth construction path, fourth construction commit, external effect,
Docker call, altered historical byte or broader semantic change is a hard
stop requiring new authority.

## 10. Mandatory stops

Before exact Owner approval of this Addendum and its Review:

`BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_OWNER_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After exact `Kf/Lf/Mf` construction and independent committed-byte Green:

`LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_DOCKER_INSPECT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a later separately approved diagnostic captures a terminal body-free
observation:

`LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_OBSERVED / DIAGNOSTIC_RESULT_CORRECTION_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

No state in this Addendum authorizes cleanup, Physical Execution, production
or Gate C.
