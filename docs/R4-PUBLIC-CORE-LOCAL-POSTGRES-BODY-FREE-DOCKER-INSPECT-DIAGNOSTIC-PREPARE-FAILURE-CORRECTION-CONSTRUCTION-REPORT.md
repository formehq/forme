# R4 #67 — Body-Free Diagnostic Prepare-Failure Correction Construction Report

- Status: **Technical Review Green; replacement diagnostic, Physical Execution and Gate C not requested**
- Date: 2026-08-14
- Issue: [#67 — Public Room and one real bounded knock](https://github.com/formehq/forme/issues/67)
- Final stop: `LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILURE_CORRECTION_TECHNICAL_REVIEW_GREEN / REPLACEMENT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

## Outcome

The repository now classifies every approved body-free diagnostic `prepare`
failure at one of 19 closed stages. The direct CLI returns a body-free code and
stage rather than collapsing an unexpected failure to
`local_postgres_runner_failed`. Ordinary failures remove only the exact
same-inode pending grant and restore the root to its Owner receipt; a rollback
failure is reported separately and retains the pending bytes truthfully.

This is a repository correction, not a successful Docker diagnostic. It did
not prepare or consume a grant, resolve the Docker socket, call Docker, touch
either historical forensic root, connect to PostgreSQL, run SQL, change the
product runtime, deploy, publish, admit a Guest or open Gate C.

## Why this was necessary

The approved Diagnostic Card V1/Review V1 authorized one `prepare` and one
body-free diagnostic lifecycle. The fresh prepare failed before grant creation
at `/private/tmp/forme-r4-body-free-inspect-hbBcXlvY` and returned only the
generic code `local_postgres_runner_failed`. The retained root contains exactly
one 1,072-byte Owner receipt with SHA-256
`4baf2407b90fe8f1da54b9dcb12eb9071fe2e07c4fcad5a420b1ee29a8f924953`.
Docker, PostgreSQL and SQL effects were zero.

The root's current device/inode/mode/uid are
`16777231 / 33551700 / 0700 / 501`. Its observed nlink is `3`; the approved
follow-up correction treats nlink only as a lower-bound safety observation
(`>=2`) and uses no-follow identity plus exact sorted entries for closure.

## Authority

Repository construction was bounded by:

| Authority | SHA-256 |
|---|---|
| Prepare-Failure Correction Addendum | `ae774a9233b1b0c5a69d40f1ce19634f9d6ae4b6a264cb7c289548ddc06dc060` |
| Prepare-Failure Owner Review | `258a1fea0bf77d2be4aa09f655575c8c9afba5ab3f188e9189eb80cc1662eaaa` |
| Root-nlink Correction Addendum | `5f573a18da85cb13f46d887e06a24d31a4acc390e9673432a185850e44645f5b` |
| Root-nlink Owner Review | `9697d3171451518f7445dbf80b5f0b7545ef6b68649bb4541c18267278933b1c` |

The Owner also confirmed the outcome envelope: complete the bounded
repository implementation, tests, evidence, status reconciliation and commits
without returning for ceremonial hash-by-hash approval. Replacement diagnostic
execution, cleanup, Physical Execution, production and Gate C remain separate
stop gates.

## Exact construction lineage

| Step | HEAD | Tree | Parent | Delta |
|---|---|---|---|---|
| baseline | `0d2d1666e66fde08f65dfd94926639703691af38` | `420545387651dc832eed695cc066f3046f18369a` | — | — |
| `Kp` implementation | `eaca190eb36fa45ea12077956a4a4b1433102c16` | `ec98c83bab6c12be04e7c02e1738ed113da73f64` | `0d2d1666e66fde08f65dfd94926639703691af38` | `2M` |
| `Lp` evidence | `7a31dbaa385be561acac4fc21f017a804be4a68c` | `d6e2dc39b693091069ed92f6bcef8ce79e533cc4` | `eaca190eb36fa45ea12077956a4a4b1433102c16` | `3A` |

`Kp`'s framed two-blob aggregate is
`sha256:84254f0f408be406b8e87a3468dbb0f67abfc49b183abf65db6fa74f4d6929e0`.
`Lp`'s framed three-blob aggregate is
`sha256:6aec3a9e4c867403ec7e3f0c08f4892aa40129b39a83850a4eb04d6894538a26`.

## Frozen artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `scripts/r4-public-core-local-postgres.mjs` | 597087 | `e027e71dc071d2917c7d9db4e7bf35cbf9c3eb81792f0ba96a8bcdd3ca883e39` |
| `test/r4/public-core-local-postgres.test.ts` | 164594 | `a777b6c5ef5d419d993c11891a72484eddbad681177d66cfdd6ed4632713cb87` |
| artifact index | 3846 | `7854774fc10c58e5da6475fc97da6997102822fd406f6abdb0d8cbf209794bc0` |
| strict evidence schema | 10317 | `2a44cf5e6a8f19ed1d8db4ed75b533c5fb42c650f76dea03cf885ca86b55a532` |
| machine evidence | 8003 | `58a56f97e6eb79ed6c7871c5dd2bb98eeab44283151ffaedfbfa703d38b8d8a1` |

The committed-`Kp` audit summary is
`sha256:28a08418c5964143584d8bdb3b26621950efc6c17b9143acbdb66be563a2c55e`.
The committed-`Lp` audit summary is
`sha256:18c40a216a286cd8fef1a7112cd7d206bc9d50b1d3f81546a7f56c108882364f`.

## Closed prepare membrane

The implementation recognizes exactly these stages:

`INPUT`, `PRIVATE_ROOT`, `OWNER_APPROVAL_RECEIPT`,
`BLOCKED_ROOT_SNAPSHOT`, `FAILED_RESCUE_ROOT_SNAPSHOT`, `AUTHORITY`,
`DOCKER_CLI`, `DOCKER_SOCKET`, `TIME`, `COMMITTED_BINDINGS`, `PENDING_OPEN`,
`PENDING_WRITE`, `PENDING_FILE_FSYNC`, `PENDING_CLOSE`,
`PENDING_DIRECTORY_FSYNC`, `PENDING_READBACK`, `FINAL_ROOT`,
`PREPARE_RECEIPT`, and `PENDING_ROLLBACK`.

The ordinary code is
`local_postgres_body_free_diagnostic_prepare_failed`; the distinct rollback
code is
`local_postgres_body_free_diagnostic_prepare_rollback_failed`. Both are
body-free. The tests cover failures immediately before and after every stage,
the exact CLI JSON surface, same-inode cleanup, and truthful retained state
when rollback itself cannot be proven.

## Validation

| Lane | Result |
|---|---:|
| local PostgreSQL runner, deny-network | `162 / 162` |
| complete R4 offline regression | `734 / 734` |
| Gate-B Core successor candidate | `145 / 145` |
| repository spine | `45 / 45` |
| TypeScript | Green |
| strict Ajv 2020-12 | Green |
| hostile evidence mutations | `9 / 9` rejected |
| legacy docs regression | Green |
| diff check | Green |

The tests are fake/local and deny external networking. A fake Green result is
not a Docker, PostgreSQL or catalog observation.

## Effect audit

All of these stayed zero: external network; Docker CLI, socket, daemon and OCI;
historical-root mutation; pending or consumed diagnostic grants; PostgreSQL
processes, connections, databases and SQL; schema apply/verify/rollback;
product runtime and traffic; production; Provider/model/email; deploy,
publication, admission, release and spend.

## Current product and integration truth

- R1–R3 are Owner-accepted; R4 remains Building.
- #66 is Owner-accepted; #67 remains In Progress.
- Public Core and its application/store/`pg` bridge are repository/offline
  Technical Review evidence, not a working production Room.
- No local PostgreSQL rehearsal has reached PostgreSQL. Static catalog
  `14 / 207 / 172 / 44` is still a contract, not a target observation.
- The branch is not on `main` and this local correction is not yet published to
  a remote PR. Remote CI therefore has not tested these bytes.
- The high-level #67 → #68 → #69 → #70 plan remains correct; #67's detailed
  GitHub status must be updated from the older construction state.

## Review boundary

This report completes the bounded correction outcome. The next review should
be medium-grained: decide whether to authorize a larger local integration
campaign whose first effect is a replacement body-free diagnostic and whose
exit is PostgreSQL rehearsal evidence. Do not ask the Owner to approve normal
implementation commits or recomputed hashes inside an already approved
envelope. Do stop for new durable state, trust/schema/runtime authority,
external effects, scope/date/public-behavior changes, ambiguous evidence or a
failed ceiling.

## Mandatory stop

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILURE_CORRECTION_TECHNICAL_REVIEW_GREEN / REPLACEMENT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

No replacement diagnostic prepare/consume, Docker call, cleanup, Physical
Execution, production action or Gate C action is authorized by this report.
