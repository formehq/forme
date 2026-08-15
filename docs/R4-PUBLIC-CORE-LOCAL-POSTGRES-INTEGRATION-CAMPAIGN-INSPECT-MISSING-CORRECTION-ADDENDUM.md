# R4 #67 Integration Campaign Inspect-Missing Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Scope: repository-only correction construction after the consumed Integration Campaign V1 failure
- Docker / cleanup / PostgreSQL / SQL: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Decision in plain language

The first Integration Campaign V1 grant was prepared and consumed exactly
once. Docker `version` completed and matched the pinned host, but the first
historical `container.inspect` stopped with
`local_postgres_docker_call_failed`. Physical construction never began.

This was not a PostgreSQL failure. The campaign implementation still treated a
missing Docker inspect as valid only when `stdout` was the empty string. The
pinned Docker CLI `v29.3.1` uses its template inspector for the campaign's
`--format "{{json .}}"` calls. When no inspected object succeeds, that
inspector flushes one exact LF byte to stdout before returning the joined
status-1 error. The runner therefore rejected the pinned CLI's own deterministic
missing-output frame before it could classify the historical resource.

The repository tests missed this because their Integration Campaign fake port
injected the already-decided enum `MISSING`; it did not pass the real
`status/stdout/stderr` frame through the production parser.

The requested correction is one medium-grained repository outcome: make the
campaign's production and fake diagnostic paths share one body-free parser,
recognize only the exact pinned `v29.3.1` missing frame, preserve a closed
fingerprint when any frame remains unclassified, and make failed receipt
residue truth distinguish `UNKNOWN` from observed existence. It grants no new
campaign run.

## Immutable failed execution truth

| Binding | Exact value |
|---|---|
| repository baseline HEAD / tree | `542a533b2b642e6a26f8923649ecfb4de9b6e58e` / `30a97caffc0b54693a87065e8e0ca5a7b5b322bf` |
| Execution Card V1 SHA / HEAD / tree | `sha256:c44e629b62593d7f80ba24a2efd920ebaacb611fdd99975c2912e4ae0c0e4c34` / `d05faf0b39e35dff795d19ab3661929055e6bbb5` / `68c1f27c443df9c3cdeccf861d2f9400e31a21dd` |
| Owner Review V1 SHA / HEAD / tree | `sha256:74a63a933ec89b991c7ff4403835372bc7fa79af30b2ee2cf5006a9513aee909` / `542a533b2b642e6a26f8923649ecfb4de9b6e58e` / `30a97caffc0b54693a87065e8e0ca5a7b5b322bf` |
| Mi HEAD / tree / G10 | `4c1273cce6568d638d547d4bb6b4866198f8db90` / `1f3b7c187e69d5906b3871d962758e68a77b8338` / `sha256:7c973688d036b5504ecc6eefdf71593a37961b41cab30a439f43ce7d33a30b81` |
| committed-Mi audit | `sha256:af2f0cce1b3b10348c1606404652b894a8317eeab89cd2e8686fb5e6c0e1e4f6` |
| canonical V1 payload | `sha256:4e4a427a281be934e3a07858f842a7bf06e9fe7180c715ff864543f0dc5aa749` |
| failed first prepare root / receipt | `/Users/zaynw/.forme-r4-integration-campaign-c44e629b` / `sha256:1d62c23afd46ac017274189acc67de4ea94ed7ec651b53d38e0d886891f8ec68` / `1116` bytes |
| consumed r2 root | `/Users/zaynw/.forme-r4-integration-campaign-c44e629b-r2` |
| r2 approval receipt | `sha256:d56b2a291c51196bb821f043f11f007baaa942598563785e81a98362f5e50055` / `1300` bytes |
| consumed campaign grant | `sha256:7fdf12a2f7bd195ef07218e724f45708ec0cac93c1175605668678df7c236e81` |
| terminal evidence | `sha256:be312a188ec955f43bb2cb22bd276f1782ceaaa89da0d5c79d582d8f597c0501` / `6599` bytes |
| terminal journal | `7` entries / `sha256:5f22912b70c2b4bf5f9e4007afb27763931d5c158e41a4eebb7f543bf4208a04` / one open `container.inspect` effect |
| terminal phase | diagnostic `1`; historical cleanup `0`; physical construction `0`; physical cleanup recovery `0` |

Both roots remain immutable forensic history. The r2 campaign is consumed and
terminal; it cannot be retried, re-entered, converted into cleanup authority or
used to infer Docker resource existence or absence.

## Pinned external implementation fact

The host grant bound Docker CLI/client/server `29.3.1`. The official Docker CLI
`v29.3.1` tag resolves to commit
`c2be9ccfc3cf0b4c4c4f0a3d5c91dd759ab21256`. Its
[`cli/command/inspect/inspector.go`](https://github.com/docker/cli/blob/c2be9ccfc3cf0b4c4c4f0a3d5c91dd759ab21256/cli/command/inspect/inspector.go)
is Git blob `526cfda9f8c0cf6135baef50ff4ce357b342d6b0`, `6094` bytes,
with byte SHA-256
`e4409bad908d89c0c5eaae64342b2dbb305b7b7ca5cd693bc7e7e0dd54167c1a`.
`TemplateInspector.Flush()` writes exactly `"\n"` when its buffer contains no
successful inspected element. This lookup was read-only primary-source
research; it made no remote mutation.

## Nine correction choices

Owner approval accepts these choices together:

1. **Correct the exact missing frame, not just an error string.** For the
   pinned template-inspect calls, `MISSING` requires completed spawn, status
   `1`, stdout exactly one LF byte, and one existing exact single-line stderr
   diagnostic for the exact resource name. Empty stdout, extra bytes, other
   line endings, another name, another status, signal, timeout or spawn error
   is not `MISSING`.
2. **Cover all template inspect kinds.** Apply the same exact-frame rule to
   image, container, network and volume inspect; do not repair only the first
   observed container call and leave a later identical failure.
3. **Share one body-free parser.** Production and fake campaign paths must
   consume the same raw result contract. Tests may not inject `MISSING`,
   `OWNED`, `FOREIGN`, `UNLABELLED`, `MALFORMED` or `UNKNOWN` downstream of
   parsing.
4. **Retain fingerprints, never bodies.** Every diagnostic result records only
   spawn outcome, exit status/signal, byte counts, SHA-256, UTF-8 validity,
   emptiness, line-ending class and line count for stdout/stderr, plus the
   closed diagnostic/ownership classification. Raw bytes are zeroed and never
   enter logs, errors, receipts, evidence or status docs.
5. **Unknown does not become absence.** An unclassified nonzero result,
   malformed JSON, transport ambiguity or fingerprint mismatch stops before
   cleanup and physical construction. Only exact `MISSING`, or exact found JSON
   with the frozen ownership label followed by exact-owned cleanup and a second
   exact `MISSING`, proves absence.
6. **Use a truthful receipt version.** A new campaign receipt/grant/journal
   version must represent historical and fresh owned residue as
   `PROVEN_ABSENT`, `PROVEN_PRESENT_EXACT_OWNED` or `UNKNOWN`; it must not encode
   an unobserved resource as numeric count `1`. The failed V1 receipt remains
   immutable and is not reinterpreted.
7. **Preserve the one-use physical contract.** PostgreSQL `16.10`, image and
   platform pins, catalog `14 / 207 / 172 / 44`, two database identities,
   apply/verify `3 / 3`, rollback `1`, restart `1`, domain actions `23 / 20`,
   write-ahead, no retry and exact cleanup ceilings remain unchanged.
8. **Use a fresh versioned future authority.** Later effect authority, if
   separately proposed, uses
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-CARD-V2.md`
   and
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-OWNER-REVIEW-V2.md`,
   a fresh private root and a new one-use grant family. It never reuses V1.
9. **Keep every wider effect closed.** This correction is local repository
   construction only. Docker/socket/daemon/OCI, cleanup, PostgreSQL/SQL,
   production/runtime/traffic, publication, Curator admission, real Guest
   data, Provider/model/email, deploy/release/spend and Gate C remain zero.

## Exact repository construction envelope

After this Addendum and its direct-child Owner Review are exactly approved,
ordinary implementation, tests, evidence freezing, documentation
reconciliation and commits may proceed without intermediate Owner approval
inside these exact bounds.

Construct three direct, single-parent commits:

1. `Kic`, modifying exactly:
   - `scripts/r4-public-core-local-postgres.mjs`
   - `test/r4/public-core-local-postgres.test.ts`
2. `Lic`, adding exactly:
   - `schemas/r4/public-core/local-postgres-integration-campaign-inspect-missing-correction-artifact-index.json`
   - `schemas/r4/public-core/local-postgres-integration-campaign-inspect-missing-correction-evidence.schema.json`
   - `docs/evidence/r4-public-core-local-postgres-integration-campaign-inspect-missing-correction.json`
3. `Mic`, adding the correction report and modifying the nine current status
   surfaces:
   - `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-CONSTRUCTION-REPORT.md`
   - `README.md`
   - `docs/CONTROL.md`
   - `docs/DECISIONS.md`
   - `docs/NATIVE-HARNESS-ARCHITECTURE.md`
   - `docs/PRODUCT.md`
   - `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
   - `docs/README.md`
   - `docs/ROADMAP.md`
   - `docs/VALIDATION.md`

The construction workset is exactly **15 paths / 3 commits = 11 modified + 4
added**. Any sixteenth path, mode change, merge commit, dependency change,
historical-root mutation, dynamic allowlist widening or effect call stops.

## Required validation

The correction must prove, from committed bytes:

- exact Addendum/Review and V1 failure lineage, root/grant/evidence/journal
  bindings;
- exact `v29.3.1` one-LF missing frames for image/container/network/volume and
  rejection of empty, CRLF, multiple LF, prefix/suffix, wrong-name, wrong-status
  and nonempty-body near misses;
- status-0 JSON ownership classification and every foreign/unlabelled/malformed
  stop;
- production and fake paths share the same parser and write-ahead call wrapper;
- unclassified output freezes the body-free fingerprint and stops before
  cleanup/physical work;
- truthful V2 residue enums and hostile receipt/journal/schema mutations;
- all existing focused, full offline, Gate-B Core, spine, TypeScript, strict
  Ajv, docs, no-server-AI and diff checks Green;
- committed-byte audit `0 Blocker / 0 Important` after `Mic` without writing the
  post-commit audit back into `Mic`.

All validation is deny-network and uses synthetic buffers. No test may resolve
the real Docker socket, spawn the Docker CLI, create a `pg` Pool/Client, run SQL
or touch either forensic root.

## Mandatory stop

Successful repository correction construction stops at:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_INSPECT_MISSING_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_INTEGRATION_CAMPAIGN_V2_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

A later V2 Card/Review and separate exact Owner approval are required before
creating any pending grant, reading a Docker socket, calling Docker, cleaning a
resource or entering PostgreSQL.
