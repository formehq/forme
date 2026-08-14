# R4 #67 Body-Free Diagnostic Prepare-Failure Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Correction Addendum SHA-256:
  `sha256:ae774a9233b1b0c5a69d40f1ce19634f9d6ae4b6a264cb7c289548ddc06dc060`
- Correction proposal `H` HEAD / tree:
  `adba739824e92c248c2afe254f083227e9d245b4` /
  `9a7a44bbb03f8c518d883326240bcc8098a538b3`
- V1 Diagnostic Review `FR1` HEAD / tree:
  `ba092d1ecd3f7f45f708dfb27642c1b5aa07c2aa` /
  `2dd9a2df51c2263b602f26adb803ecc10814a969`
- Correction Construction: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Replacement Diagnostic / Cleanup / Physical Execution: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Review is the short decision surface for the exact
[Prepare-Failure Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-ADDENDUM.md).
It creates no grant, does not retry prepare and performs no Docker, socket,
PostgreSQL, SQL, cleanup, production or forensic-root action. It authorizes
nothing until the Owner later approves the committed Addendum SHA/HEAD/tree,
this Review's externally computed SHA/HEAD/tree and all choices below.

This file omits its own SHA-256 and containing commit/tree, every Kp/Lp/Mp
hash, future V2 Card/Review, fresh replacement root, grant, receipt and
journal. Those values do not exist and must not be guessed.

## Eight Owner choices

Exact correction approval accepts all eight choices together:

1. **Freeze V1 as failed before grant creation.** The one V1 prepare
   invocation returned `local_postgres_runner_failed`, left only the exact
   Owner receipt and made zero Docker calls. It may not be retried or called
   Green. Both older FAILED/BLOCKED roots and the fresh failed-prepare root
   remain immutable.
2. **Construct a closed prepare-stage error membrane.** Replace generic raw
   escape with a finite body-free stage enum spanning validation, both
   historical snapshots, authority/host/time/bindings, pending
   open/write/fsync/close/readback/final-root and prepare-receipt serialization.
   Every reachable failure maps to a closed public code/stage with no raw
   stack, path, output, content or errno body.
3. **Preserve exact same-inode rollback.** Any pending file created by a
   failed prepare must be removed only after exact dev/ino/nlink proof and
   directory fsync. Cleanup ambiguity preserves the inode and returns a hard
   failure; owner-only closure may never be inferred.
4. **Require hostile plus real-filesystem fake-port tests.** Cover every stage
   edge, raw exception normalization, final-root drift, rollback, cleanup
   failure, duplicate entry and exact body-free CLI output. Tests must not
   resolve or call the real Docker socket, Docker, PostgreSQL or SQL.
5. **Keep the effect contract unchanged.** Future design remains one Docker
   `version` plus one exact-name `container.inspect`, one lifecycle,
   16777216 bytes per stream, body-free/write-ahead/no-retry, and every other
   Docker, cleanup, PostgreSQL, product, production and Gate C effect zero.
6. **Approve only the exact fifteen-path, three-commit workset.** Kp is two
   modified runner/test paths; Lp is three added machine-evidence paths; Mp is
   one report addition plus nine status modifications. No dependency, lock,
   SQL, schema, historical artifact or unrelated runtime change is allowed.
7. **Require committed evidence and a hard stop.** Strict Ajv, mutation tests,
   all offline lanes, exact topology/hash DAG, committed-byte audit and scoped
   status alignment must pass with construction effects zero. Then stop for a
   new replacement-diagnostic decision.
8. **Make replacement authority V2 and separately approved.** Only new
   add-only `...DIAGNOSTIC-CARD-V2.md` and
   `...DIAGNOSTIC-OWNER-REVIEW-V2.md` may later propose one replacement
   prepare and lifecycle using a new root. This correction approval itself
   authorizes neither prepare nor Docker.

## Exact failed-prepare binding

| Observation | Exact value |
|---|---|
| V1 Card / Review SHA-256 | `sha256:1cd345018dc6ddbf393df873bca01a54fcb75f8e608f9f63a48c9f61fd06319e` / `sha256:324af94569b0c54456e474230bc06b3e7f15573ee97ec4a46c5886d56969abed` |
| FC1 / FR1 HEAD | `0175b455b4b44bef64db42f062903daaa8b08db0` / `ba092d1ecd3f7f45f708dfb27642c1b5aa07c2aa` |
| V1 canonical payload | `sha256:53188dac86131bf4910f06dc8dd64e7f1127d29cd55f21882960ab674a24262d` |
| invocation window | `2026-08-14T19:19:16.357Z` to `2026-08-14T20:19:16.357Z` |
| result / retained root | `local_postgres_runner_failed` / `/private/tmp/forme-r4-body-free-inspect-hbBcXlvY` |
| root device / inode / mode / uid / nlink | `16777231 / 33551700 / 0700 / 501 / 2` |
| exact entry | `owner-approval-receipt` only |
| receipt bytes / SHA-256 | `1072` / `sha256:4baf2407eb68ee5dfe9e5928f7cfd8a4bd3bdb7526c3e4394d0b5d244f924953` |
| pending / consumed grant / journal / evidence | `absent / absent / absent / absent` |
| Docker version / inspect / all others | `0 / 0 / 0` |
| PostgreSQL / SQL / cleanup / production / Gate C | `0 / 0 / 0 / 0 / 0` |

Post-failure read-only snapshot hashes are physical root
`sha256:6f09f04dee8b321fdbab76ecaefa3954bc452672315763e0cd705cf13aa39a38`
and rescue root
`sha256:d7faf685e21e3f82ed3c355f874ae32f2798a321a86c1e45365cbe140edcf115`.
CLI identity is
`sha256:912bd92cac648be65673e26b9aaeeeadbdc80e148ea18fc35dce821613dc710b`
and socket identity is
`sha256:127394d0142f9334ae8d64ae4d9f632e48031bdb8c5fbb2e028b8f38561ecba6`.
These are historical observations, not reusable dynamic V2 grant slots.

## Exact construction workset

The required direct chain is `FR1 -> H -> HV -> Kp -> Lp -> Mp`.
`H/HV` are one-document authority commits outside the workset.

- Kp modifies exactly
  `scripts/r4-public-core-local-postgres.mjs` and
  `test/r4/public-core-local-postgres.test.ts`.
- Lp adds exactly the prepare-failure-correction artifact index, strict
  evidence schema and machine evidence paths named in the Addendum.
- Mp adds the prepare-failure-correction Construction Report and modifies
  exactly `README.md`, `docs/CONTROL.md`, `docs/DECISIONS.md`,
  `docs/README.md`, `docs/NATIVE-HARNESS-ARCHITECTURE.md`, `docs/PRODUCT.md`,
  `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`, `docs/ROADMAP.md` and
  `docs/VALIDATION.md`.

Total is exactly 15 paths: 11 modified plus 4 added across 3 commits. Any
sixteenth path, merge parent, rename, deletion or mode drift stops.

## Zero-effect ceiling

| Effect | Maximum after correction approval |
|---|---:|
| repository construction paths / commits | `15 / 3` |
| forensic-root reads / mutations | `0 / 0` |
| replacement pending / consumed grant | `0 / 0` |
| Docker / socket / OCI / PostgreSQL / SQL | `0 / 0 / 0 / 0 / 0` |
| cleanup / product runtime / production / traffic / Gate C | `0 / 0 / 0 / 0 / 0` |
| dependency / lock / SQL changes | `0 / 0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

## Exact approval mechanics and stop

A later approval must externally bind Addendum SHA/`H` HEAD/tree, this
Review's SHA/`HV` HEAD/tree, all eight choices, exact V1 failure/root/snapshot
facts, Kp/Lp/Mp 15-path/3-commit workset, future V2 paths and every zero-effect
boundary. It must say Correction Construction `APPROVED` while Replacement
Diagnostic, Cleanup, Physical Execution, production and Gate C remain
`NOT_REQUESTED`.

Current stop:

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILED_UNCLASSIFIED / PREPARE_FAILURE_CORRECTION_OWNER_APPROVAL_REQUIRED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Do not implement or retry from this Review alone.
