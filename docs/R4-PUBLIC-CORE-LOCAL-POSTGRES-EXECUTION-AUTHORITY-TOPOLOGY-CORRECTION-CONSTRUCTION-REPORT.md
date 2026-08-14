# R4 #67 Execution-Authority Topology Correction Construction Report

- Status: **TECHNICAL_REVIEW_GREEN**
- Scope: **repository-only correction of the future Physical Execution Card/Review path topology**
- Generated: **2026-08-14**
- Physical Execution: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

This report records the exact repository construction authorized by the
[Topology Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-ADDENDUM.md)
and its
[Owner Review](./R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-OWNER-REVIEW.md).
It does not approve or prepare a physical run. Docker, OCI, PostgreSQL, SQL,
production, deployment, traffic and Gate C effects remain zero.

## Result

The successor verifier no longer asks Git to add the already-existing failed
Physical Execution Card and Review paths. Those two committed documents remain
immutable historical evidence. Future execution authority must instead use
these unique add-only paths:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md`

The canonical execution-authority payload remains
`r4.public-core-local-postgres-execution-authority.v1`; grant v3, receipt v3,
SQL, catalog, Docker/image contract, effect ceilings and cleanup semantics are
unchanged.

## Exact authority and lineage

| Item | Exact binding |
|---|---|
| Baseline `Mc` HEAD / tree | `6c96f70b43315d5f9b72cb929dc530b36c4ddfde` / `e08de32e58c5c05730d69280aae824cb2277ea33` |
| Addendum SHA-256 | `sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22` |
| `T` HEAD / tree | `e61a2bb1817ac56c9377e161078f46543d8d2411` / `88b35f39ce6e7d170309244930129911cc09b230` |
| Owner Review SHA-256 | `sha256:ce5be9d958e45e05450a19d56aa093344f9e28003ca2534ecf0d13e72d3b9c2b` |
| `U` HEAD / tree | `dd9759f8034042fe28ae7c24c7519dc480ffad37` / `2dc809ea52e2e5d3d64346873e773ba55734de85` |
| `Kt` HEAD / tree | `f7d37830044ca2ad098b4c031feb62de77e209c3` / `edbe46a65a5008c3221087e83345407a3a197d5e` |
| `Lt` HEAD / tree | `c699f9d9b023e5185baebbf429a3044bfae0366a` / `53bf1fb2877003251e2468dc7c3e70f2175ae3d6` |

The committed chain is the exact direct, single-parent sequence
`Mc → T → U → Kt → Lt`. `Kt` is exactly two modified paths; `Lt` is
exactly three added paths. The containing `Mt` commit/tree and its external
post-commit audit do not exist when these report bytes are frozen and are not
embedded here.

## Frozen implementation and evidence

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| runner | 378511 | `sha256:c4d6bed15aa2813801feea5026554c436d35b745d724e14c73332688f020a392` |
| runner test | 127389 | `sha256:6371de8ade9695dcb5003a84ff53063974a6eb1d4b8d76accfb28cca94b976d9` |
| [artifact index](../schemas/r4/public-core/local-postgres-execution-authority-topology-correction-artifact-index.json) | 4663 | `sha256:50db6a2f64ca9e9a3f1a600a7d7a37d17fca5c955a57d1ce461cf626d44dc2c5` |
| [strict evidence schema](../schemas/r4/public-core/local-postgres-execution-authority-topology-correction-evidence.schema.json) | 28997 | `sha256:406ece284dc381839265c3b9fc4940e935f64e18444679428ca725c525a19bc3` |
| [machine evidence](./evidence/r4-public-core-local-postgres-execution-authority-topology-correction.json) | 10459 | `sha256:6ed602d102f9bf2399182c17abb2370cc5cd1e8678c5198e9ca76fe5fb6bcd57` |

The committed implementation aggregate `G2t` is
`sha256:3443602d4f7b1561088f6815c8fcbc866ec75f8915eebf94ab7c0cf1d5d359d6`.
The committed evidence aggregate `G3t` is
`sha256:8a34840526c11e5ab3318157992d55180d45da6d3cc649a5d0ad1527ae717535`.

The external committed-`Kt` audit summary is
`sha256:193c18fad8f845c1fbaffdc09aea35f9e3d82cbd7c44651e7b2e0daf3c0a74f0`.
The external committed-`Lt` audit summary is
`sha256:4b313ae973f8dcdd07bb519bf0c2372763b5918e10e71be3f3d214c0e24b7d94`.
Both report 0 Blocker / 0 Important.

## What changed

The implementation commit:

1. freezes the failed unversioned Card/Review as historical paths and blobs;
2. freezes the complete APFS correction and topology-correction ancestry before
   accepting any dynamic successor lineage;
3. requires future Card/Review commits to add exactly the two `-V2.md` paths;
4. reads and hashes the future versioned Card/Review bytes only;
5. preserves the four-ancestor dynamic payload shape from future Review back to
   Card, status, evidence and implementation; and
6. rejects old-path reuse, wrong Git action, parent/tree/path/hash drift,
   merge parents and stale committed/worktree bindings before a physical port.

The implementation did not change application/store/runtime behavior,
dependency or lock bytes, SQL, catalog, grant/receipt formats, effect ceilings,
Docker/image constraints, or production configuration.

## Validation

| Lane | Result |
|---|---:|
| Local PostgreSQL runner, deny-network/fake-only | `142 / 142` |
| Focused non-runner Public Core | `85 / 85` |
| Wildcard Public Core | `394 / 394` |
| R4 offline regression | `714 / 714` |
| Gate-B successor candidate | `145 / 145` |
| Spine regression | `45 / 45` |

Runner syntax, TypeScript, hosted-room no-server-AI, the legacy R4 document
audit and `git diff --check` passed. Strict Ajv 2020-12 accepted the committed
machine evidence and rejected the hostile mutation matrix. Committed Git blobs,
both aggregates, authority lineage, cross-hashes and self-reference exclusions
were recomputed.

One unrelated Gate-B Host Binding assertion failed only while three long suites
were intentionally run concurrently; its immediate standalone rerun passed
`145 / 145`. No affected bytes were in the topology-correction workset and no
failure was hidden or counted as Green.

## Exact workset and documentation boundary

The approved construction is exactly fifteen paths across three commits:
`Kt` two modifications, `Lt` three additions, and `Mt` one report
addition plus nine current-status modifications. Historical machine artifacts
remain byte-identical.

The nine operational status surfaces are aligned by `Mt`, but this report
does not claim every tracked Markdown document is current.
`wholeRepositoryDocumentationCurrentClaimed` remains false. The Owner-owned
`native/macos/.build/` remains unread, untracked and out of scope.

## Effect audit

| Effect | Observed |
|---|---:|
| dependency / lock / SQL changes | `0 / 0 / 0` |
| external network / pending grant / consumed grant | `0 / 0 / 0` |
| Docker CLI / daemon / OCI | `0 / 0 / 0` |
| PostgreSQL process / connection / database identity | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain action | `0 / 0 / 0 / 0` |
| product network / production data / runtime / route / traffic | `0 / 0 / 0 / 0 / 0` |
| real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| deployment / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

No target PostgreSQL server or catalog was observed. Physical Green, product
runtime readiness, traffic readiness, Gate C readiness, #67 Done and R4 Done
all remain false.

## Mandatory stop

After `Mt` is committed and its bytes pass an external 0B/0I audit, the
repository stop is exactly:

`LOCAL_POSTGRES_EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

The next permitted action is only to propose and independently review the
fresh versioned Card and Review. Preparing a grant, calling Docker, starting
PostgreSQL, running SQL, activating production or granting Gate C requires
later, separate exact Owner authority.
