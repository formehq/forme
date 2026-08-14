# R4 #67 Body-Free Docker Inspect Diagnostic Prepare-Failure Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Baseline: **Diagnostic Owner Review V1 `FR1`**
- Correction Construction: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Replacement Diagnostic Prepare: **NOT_REQUESTED**
- Docker Diagnostic / Cleanup / Physical Execution: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Addendum proposes repository-only correction construction after the one
approved V1 diagnostic prepare invocation stopped before grant creation with
the unclassified public code `local_postgres_runner_failed`. It does not
authorize a second prepare, create a grant, call Docker, mutate either old
forensic root, delete the fresh failed-prepare root, clean a resource, start
PostgreSQL or grant production/Gate C authority.

The V1 prepare invocation is final and non-retryable. Its empty effect truth
must remain immutable. A replacement prepare, if ever approved, must use new
versioned Card V2/Review V2 bytes and a new fresh root; it may not reuse V1,
the current failed-prepare root or either consumed historical grant.

This file intentionally omits its own SHA-256 and containing commit/tree, the
future Correction Owner Review SHA/commit/tree, all future construction
commits and artifacts, future V2 Card/Review hashes and every replacement
grant/receipt/journal value.

## Exact V1 authority baseline

| Binding | Exact value |
|---|---|
| Diagnostic Card V1 SHA / `FC1` HEAD / tree | `sha256:1cd345018dc6ddbf393df873bca01a54fcb75f8e608f9f63a48c9f61fd06319e` / `0175b455b4b44bef64db42f062903daaa8b08db0` / `d558854441adebad4b72dcc440be06a2d6f4222e` |
| Diagnostic Owner Review V1 SHA / `FR1` HEAD / tree | `sha256:324af94569b0c54456e474230bc06b3e7f15573ee97ec4a46c5886d56969abed` / `ba092d1ecd3f7f45f708dfb27642c1b5aa07c2aa` / `2dd9a2df51c2263b602f26adb803ecc10814a969` |
| canonical V1 payload | `sha256:53188dac86131bf4910f06dc8dd64e7f1127d29cd55f21882960ab674a24262d` |
| `Mf` HEAD / tree / `G10f` | `b0edf295ca556caaa65dfaa6c7c3025e0a32d577` / `a6fcc433397fb75d043080c4926a3179f42a8e10` / `sha256:1f9c2e22408c63559aa0418b08e5dde481fff0a8ecd59460f788bef7f5635993` |
| committed-`Mf` audit | `sha256:9302aabe85d626d004631900df0f00eac0ee0569aa56115967c0b38592b3cca8` |

The approved V1 choices and Docker ceilings remain immutable. They authorized
one prepare invocation and at most one later lifecycle. The prepare invocation
occurred once; because it created no pending grant, no lifecycle could begin.
No wording here restores that invocation or carries its dynamic slots forward.

## Exact failed-prepare truth

| Observation | Exact value |
|---|---|
| invocation time window | `2026-08-14T19:19:16.357Z` to `2026-08-14T20:19:16.357Z` |
| returned public error | `local_postgres_runner_failed` |
| fresh diagnostic root | `/private/tmp/forme-r4-body-free-inspect-hbBcXlvY` |
| root device / inode / mode / uid / nlink | `16777231 / 33551700 / 0700 / 501 / 2` |
| exact retained entries | `owner-approval-receipt` only |
| Owner receipt bytes / SHA-256 | `1072` / `sha256:4baf2407eb68ee5dfe9e5928f7cfd8a4bd3bdb7526c3e4394d0b5d244f924953` |
| pending / consumed diagnostic grant | `absent / absent` |
| diagnostic journal / evidence | `absent / absent` |
| Docker `version` / `container.inspect` calls | `0 / 0` |
| every other Docker call | `0` |
| PostgreSQL / SQL / cleanup / production / Gate C effect | `0 / 0 / 0 / 0 / 0` |

Read-only post-failure probes proved:

- blocked physical-root snapshot
  `sha256:6f09f04dee8b321fdbab76ecaefa3954bc452672315763e0cd705cf13aa39a38`;
- failed rescue-root snapshot
  `sha256:d7faf685e21e3f82ed3c355f874ae32f2798a321a86c1e45365cbe140edcf115`;
- Docker CLI identity
  `sha256:912bd92cac648be65673e26b9aaeeeadbdc80e148ea18fc35dce821613dc710b`;
- local socket identity
  `sha256:127394d0142f9334ae8d64ae4d9f632e48031bdb8c5fbb2e028b8f38561ecba6`;
- committed authority derivation and binding validation both passed; and
- the fresh root still contained only the unchanged Owner receipt.

These facts localize the failure to the prepare path after the read-only
authority/host inputs were available and before any durable pending grant was
left. They do not prove which pending-install, readback, final-root or receipt
serialization substep failed. The generic public code erased that distinction;
guessing a narrower cause is forbidden.

The failed-prepare root is now immutable forensic input. Correction
construction may bind its path/identity/entry/hash facts in fixtures and
documentation, but may not enter, rewrite, delete or reuse it.

## Eight correction choices

Exact approval of this Addendum accepts all eight choices together:

1. **Preserve the V1 failure exactly.** V1 prepare is used, non-retryable and
   produced no grant or Docker call. Preserve the failed-prepare root and both
   older forensic roots unchanged. Never call V1 Green.
2. **Construct only a closed prepare-stage membrane.** Replace generic raw
   prepare escape with a finite body-free stage enum covering input/root,
   Owner receipt, both historical snapshots, authority, CLI, socket, time,
   committed bindings, pending open/write/fsync/close/directory-fsync/readback,
   final root and prepare-receipt serialization. Every reachable failure must
   map to one closed code plus one stage; raw stack, path, content and errno
   bodies remain private.
3. **Keep same-inode rollback exact.** Any created pending inode must either be
   durably installed and returned or be removed by exact dev/ino/nlink proof
   plus directory fsync. Cleanup ambiguity must preserve the inode and return
   a distinct hard failure; it may never claim owner-only closure without
   proof.
4. **Add hostile and real-filesystem validation.** Tests must cover every
   stage before/after edge, raw exception normalization, final-root drift,
   same-inode rollback, cleanup failure, no duplicate prepare, no Docker port,
   and exact body-free CLI output. The ordinary and fake lanes must make zero
   real Docker/socket/PostgreSQL/SQL call.
5. **Do not broaden diagnostic authority.** The future design remains exactly
   one `version` and one exact-name `container.inspect`, 16777216 bytes per
   stream, one lifecycle, write-ahead, body-free output, no retry and every
   other Docker/cleanup/PostgreSQL/product/production effect zero.
6. **Use the exact repository workset below.** Historical machine evidence and
   both V1 authority documents remain byte-identical. Any extra path, mode
   drift, dependency, lock, SQL, schema or runtime behavior change stops.
7. **Require independent committed evidence before effects.** Freeze Kp/Lp/Mp
   in three direct commits, strict-Ajv machine evidence, committed-byte audits
   and scoped status alignment. Construction itself has zero Docker/socket,
   forensic-root, PostgreSQL, SQL, cleanup, production and Gate C effect.
8. **Make any replacement authority additive and versioned.** Only after
   construction passes 0B/0I may a new
   `...BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD-V2.md` and
   `...OWNER-REVIEW-V2.md` be proposed. A later exact Owner approval must bind
   the V1 failure, final correction bytes and a new fresh root. This Addendum
   does not authorize that replacement prepare or lifecycle.

## Exact construction topology and workset

The proposed direct, single-parent sequence is:

```text
FR1 -> H (this Addendum only)
    -> HV (Correction Owner Review only)
    -> Kp (2 modified implementation paths)
    -> Lp (3 added machine-evidence paths)
    -> Mp (1 added report + 9 modified status paths)
```

### `Kp`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lp`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-body-free-docker-inspect-diagnostic-prepare-failure-correction.json`
2. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-prepare-failure-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-prepare-failure-correction-evidence.schema.json`

### `Mp`: one added report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total construction workset is exactly fifteen paths: eleven modified plus
four added, across exactly three commits. `H/HV` are two preceding authority
documents outside that workset.

## Construction validation and zero effects

Required validation includes focused stage-edge tests, the full body-free
diagnostic fake suite, Public Core, R4 offline, Gate-B successor, spine,
TypeScript, no-server-AI, docs, strict Ajv, committed topology/hash-DAG,
mutation tests and `git diff --check`. Test adapters must deny real Docker,
socket, PostgreSQL and SQL access.

| Effect | Maximum during correction construction |
|---|---:|
| construction paths / commits | `15 / 3` |
| dependency / lock / SQL changes | `0 / 0 / 0` |
| failed-prepare or older forensic-root reads/mutations | `0 / 0` |
| pending / consumed diagnostic grants | `0 / 0` |
| Docker / socket / OCI / PostgreSQL / SQL calls | `0 / 0 / 0 / 0 / 0` |
| cleanup / product runtime / production / traffic / Gate C | `0 / 0 / 0 / 0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

## Mandatory stop

Before exact approval:

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILED_UNCLASSIFIED / PREPARE_FAILURE_CORRECTION_OWNER_APPROVAL_REQUIRED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After approved construction and independent committed-byte audit:

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILURE_CORRECTION_TECHNICAL_REVIEW_GREEN / REPLACEMENT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Do not implement, retry prepare, call Docker, clean a resource or create V2
effect authority from this Addendum alone.
