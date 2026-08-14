# R4 #67 Physical Execution Authority Topology Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Scope: repository-only correction of the fresh Physical Execution Card/Review path topology
- Baseline correction status `Mc` HEAD / tree:
  `6c96f70b43315d5f9b72cb929dc530b36c4ddfde` /
  `e08de32e58c5c05730d69280aae824cb2277ea33`
- Pending or consumed grant: **absent / absent**
- Docker / OCI / PostgreSQL / SQL effects: **0 / 0 / 0 / 0**
- Gate C: **NOT_REQUESTED**

This Addendum requests only a repository correction. It does not authorize a
pending grant, physical execution, Docker, OCI, PostgreSQL, SQL, production,
traffic or Gate C. The failed Physical Execution Card and Owner Review remain
immutable historical authority artifacts and may not be overwritten, revived
or treated as fresh approval.

This Addendum intentionally omits its own SHA-256 and containing proposal
HEAD/tree, its future Owner Review SHA-256 and HEAD/tree, and all future
implementation, evidence, status, Card, Review, grant and receipt hashes. Those
values must be supplied externally in chronological order.

## 1. Exact current truth

The APFS nlink correction reached repository Technical Review Green without a
new physical attempt. Its committed baseline is:

| Binding | Exact value |
|---|---|
| `Mc` HEAD / tree / parent | `6c96f70b43315d5f9b72cb929dc530b36c4ddfde` / `e08de32e58c5c05730d69280aae824cb2277ea33` / `32448cb962c823d39205cc83d11aa3f6571cf65d` |
| `Mc` exact delta | ten paths: `9M / 1A`, all mode 100644 |
| `G10c` | `sha256:72fe493881c293e6ac60368b8ab490073de1e7c2609a9de83d534dd27ca39bdc` |
| committed-`Mc` audit summary | `sha256:8b01569106b44c94ad3dccb66532910935fe7caa9baca8391b144490940b8ec6` |
| `Kc` HEAD / tree | `18e3a325cceabdf5168b5ffb328ee2580b069a76` / `184d9a4147fbb9baea22b1303ca24a09c2687a79` |
| corrected runner | 372277 bytes / `sha256:4383a52908d7d51d3cac8d549212fa0e7f80c61796123f38280a47421c169b75` |
| corrected runner test | 120964 bytes / `sha256:8cc713943f973272aabfd5b3c3e838543e62a632f3917c2585239aac41c648f1` |
| `G2c` / committed-`Kc` audit | `sha256:56e2e3b10236e693bf7813c3c97e0acbb6c897123c37918cfda9d8609294e130` / `sha256:eadd61948def5d6f14e8cab56bc06a30c8807d3711157876b12ab63a6bf5eb00` |
| `Lc` HEAD / tree | `32448cb962c823d39205cc83d11aa3f6571cf65d` / `02b377385a0e68a60021f878027f41ab34399f63` |
| correction index | `sha256:d3b2ce01350636bbcd6fbde1ee938c6cd5c55f7b8d5e38e72fa4f6dbd5d67056` |
| correction schema | `sha256:1cbd487272b052ef9116e473249824476b954e4e07818eb7d90b6079ffd6826a` |
| correction evidence | `sha256:19788c80464ca23e03d5dab6aaf8d810c8541362f414e96d25ab7b9495a1300c` |
| correction report | `sha256:0c462d2798c61c4a12a085e465f360c888b234e897fd0a3d8dd5c6e0c9e0e175` |
| committed-`Lc` audit | `sha256:01344b279f87b722a9898bda40b27c226e9a67ae24742ecbed82724b86bce58f` |

The current mandatory stop is:

`LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

No corrected pending grant exists. Target PostgreSQL, target catalog, Docker
host facts and Physical Green remain unobserved.

## 2. Exact conflict

Two immutable historical paths already exist at `Mc`:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md`

Their failed historical bindings are:

| Artifact | HEAD / tree | SHA-256 |
|---|---|---|
| failed Card | `421560cb6ac2fbbf52d104a5b71ade6347d9629f` / `2bb4bf20f4892af3f51887e7c7d4f2302b80169d` | `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77` |
| failed Review | `e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab` / `91f1a0aef6820bd4a145bc6d93acd0bbedc40992` | `sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e` |
| failed canonical payload | — | 5517 bytes / `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3` |
| failed private receipt | — | 863 bytes / `sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a` |

The committed corrected runner nevertheless requires its future dynamic Card
and Review commits to add those same two paths with Git status `A`. Because the
paths already exist, a successor commit can only modify them with status `M`.
The runner's `exactCommitStep` rejects that delta before grant preparation.

Deleting and re-adding the files in one commit still produces `M` against the
parent tree. A separate deletion, rebase, amend, replacement object, path
alias, verifier bypass or reuse of the failed bytes would break the approved
single-parent lineage or historical truth. No such workaround is authorized.

## 3. Approved correction design

The correction must do exactly all of the following:

1. Preserve the failed Card/Review paths and committed bytes as immutable
   historical evidence. Continue verifying their exact historical
   HEAD/tree/blob bindings.
2. Introduce two unique successor paths for future authority:
   - `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2.md`
   - `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md`
3. Update only the runner and runner test in the implementation commit so the
   dynamic fresh Card/Review verifier, committed-blob reader and authority
   derivation use the two `-V2.md` paths. Both future authority commits must be
   direct, single-parent, single-path, mode-100644 additions.
4. Preserve the canonical execution-authority payload schema version
   `r4.public-core-local-postgres-execution-authority.v1`, grant v3, receipt
   v3, marker lines, dynamic slots, effect ceilings, SQL, image, Docker and
   catalog contract. A filename correction is not a grant-format expansion.
5. Freeze the exact historical chain through failed execution, APFS nlink
   authority, `Kc/Lc/Mc`, this Addendum and its Owner Review before accepting
   any dynamic successor lineage. No old Card/Review, payload or receipt may
   satisfy the fresh `-V2.md` checks.
6. Give the new construction its own machine evidence and status report. The
   legacy payload field names `physicalRebindArtifactIndexSha256`,
   `physicalRebindEvidenceSchemaSha256`,
   `physicalRebindEvidenceSha256`, `physicalRebindReportSha256` and
   `rebindStatusCommittedAuditSummarySha256` remain structurally unchanged but
   must bind the new topology-correction artifacts and final status audit.
7. Keep the existing four-ancestor dynamic shape from future Review to Card,
   status, evidence and implementation commits. The future Card payload must
   bind the final `Kt/Lt/Mt` HEAD/tree/aggregate and new runner/test hashes;
   the runner must reject every old `Kc/Lc/Mc` substitution.
8. Add positive committed-binding coverage plus hostile old-path, wrong
   action (`A` versus `M`), parent/tree, merge, path, hash, payload, historical
   reuse and worktree-drift cases. Every deny-network/fake test must enter zero
   real Docker, socket, PostgreSQL or SQL ports.
9. Stop after repository correction. Only after committed `Mt` and an external
   0B/0I audit may a fresh `-V2.md` Card and Review be proposed. Those later
   documents still require a separate exact Owner approval before preparation.

## 4. Exact authority and construction topology

The required direct, single-parent chain is:

```text
Mc 6c96f70  APFS nlink correction status
└─ T   add this Topology Correction Addendum only
   └─ U   add the Topology Correction Owner Review only
      └─ Kt  modify exactly runner + runner test
         └─ Lt  add exactly three topology-correction evidence paths
            └─ Mt  add correction report + modify nine status paths
               └─ C2  later add fresh -CARD-V2.md only
                  └─ R2  later add fresh -OWNER-REVIEW-V2.md only
```

- `T` and `U` are authority inputs, not construction artifacts.
- `Kt/Lt/Mt` are the only construction commits requested by this Addendum.
- `C2/R2` are future proposal commits, not authorized for preparation or
  execution by the topology-correction approval.
- Every edge is direct and single-parent. Merge, amend, rebase, squash,
  cherry-pick, replacement, rename, deletion, mode drift or extra path is a
  hard stop.

## 5. Exact fifteen-path construction workset

### `Kt`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lt`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-execution-authority-topology-correction.json`
2. `schemas/r4/public-core/local-postgres-execution-authority-topology-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-execution-authority-topology-correction-evidence.schema.json`

### `Mt`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total construction workset: exactly fifteen paths, eleven modified and four
added, across exactly three commits. The two authority documents and the later
`C2/R2` proposal documents are excluded from this count.

Every dependency, lock, SQL, application/store/runtime, production
configuration, prior machine artifact and historical authority document not
listed above remains byte-identical. The Owner-owned
`native/macos/.build/` remains out of scope and must not be read, staged,
cleaned or changed.

## 6. Machine evidence and audit chronology

The correction must use a non-self-referential `Kt → Lt → Mt` freeze:

1. Commit `Kt`; run the complete deny-network validation matrix plus the new
   committed-topology/path tests. Compute the committed two-path aggregate and
   obtain an external latest-byte and committed-byte 0B/0I audit.
2. Add in `Lt` one strict Ajv 2020-12 evidence schema, one artifact index over
   only the committed `Kt` runner/test blobs, and one machine evidence record.
   The evidence binds `Mc/T/U/Kt`, exact validations, all zero effects and the
   interim stop. It does not bind itself or claim current status surfaces.
3. Commit `Lt`; audit only committed blobs. Add in `Mt` the Construction
   Report and update exactly nine current-status paths. The report binds
   `Kt/Lt` and their external audits without self hash, `Mt` HEAD/tree, a
   future Card/Review or any approval receipt.
4. Commit `Mt`; run an external committed-byte audit without writing its hash
   back into `Mt`. Only that external audit may be bound by future `C2/R2`.
5. Any byte change invalidates every downstream hash and requires replay from
   that point. Candidate and committed audits must each report 0 Blocker /
   0 Important.

The artifact DAG must remain one-way: committed `Kt` blobs to index; index and
schema to evidence; index/schema/evidence to report; report to the current
Gate C Card; all five may flow to DECISIONS. No artifact may contain its own
hash or a future containing commit/tree.

## 7. Required validation

Technical Review Green requires all of:

- exact committed `Mc → T → U → Kt → Lt → Mt` topology and deltas;
- exact historical failed Card/Review and APFS correction lineage/blobs;
- future `Mt → C2 → R2` verifier contract using only the versioned paths;
- rejection of old paths, old Card/Review/payload/receipt, `M` substitutions,
  missing/extra paths, merge parents, wrong trees/hashes and stale worktrees;
- canonical payload v1 and grant/receipt v3 positive and hostile matrices;
- committed runner/test aggregate, strict Ajv positive validation and hostile
  mutations, cross-hash audit, local-link audit and no self-reference;
- all previously frozen runner, focused Public Core, wildcard Public Core,
  R4 offline, Gate-B successor and spine lanes;
- syntax, TypeScript, hosted-room no-server-AI, legacy docs and
  `git diff --check`; and
- source-control proof that no real Docker socket/CLI, daemon, PostgreSQL,
  SQL, network, production, Provider or messaging port was entered.

Counts must be recorded from the final committed `Kt` bytes. Historical counts
may not be copied forward as if newly observed.

## 8. Effect ceiling

| Effect | Maximum |
|---|---:|
| Correction construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository-command / package / source-control external network | `0` |
| Pending / consumed grants | `0 / 0` |
| Docker CLI / daemon / OCI calls | `0 / 0 / 0` |
| PostgreSQL process / connection / database identities | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product network / production database or data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

The failed private approval receipt remains inactive forensic evidence outside
the repository. It is not a pending grant and cannot be reused.

## 9. Mandatory stops

Before exact Owner approval of this Addendum and its Review:

`EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_OWNER_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After genuinely Green `Kt/Lt/Mt` construction and external committed-`Mt`
audit:

`LOCAL_POSTGRES_EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Neither stop makes Physical Green, #67 Done or R4 Done.

## 10. Approval mechanics

The later exact Owner approval request must externally name:

- this Addendum SHA-256 and its direct-child proposal `T` HEAD/tree;
- the Owner Review SHA-256 and its direct-child wrapper `U` HEAD/tree;
- baseline `Mc` HEAD/tree/parent, `G10c` and committed audit hash;
- the failed Card/Review/payload/receipt hashes and zero-effect truth;
- all nine correction rules in Section 3;
- exact `Kt/Lt/Mt` topology, fifteen-path workset and future `C2/R2` paths;
- every zero-effect ceiling; and
- both exact stops in Section 9.

Any changed byte, omitted choice, alternate path, topology or effect ceiling
requires a newly frozen request.
