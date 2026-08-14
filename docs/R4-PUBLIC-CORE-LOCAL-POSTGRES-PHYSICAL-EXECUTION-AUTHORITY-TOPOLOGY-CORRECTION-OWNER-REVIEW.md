# R4 #67 Execution Authority Topology Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Topology Correction Addendum SHA-256:
  `sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22`
- Addendum proposal `T` HEAD / tree:
  `e61a2bb1817ac56c9377e161078f46543d8d2411` /
  `88b35f39ce6e7d170309244930129911cc09b230`
- Baseline correction status `Mc` HEAD / tree:
  `6c96f70b43315d5f9b72cb929dc530b36c4ddfde` /
  `e08de32e58c5c05730d69280aae824cb2277ea33`
- Pending or consumed grant: **absent / absent**
- Physical execution: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

This Review is the short decision surface for the exact Addendum above. It
creates no grant and performs no Docker, OCI, PostgreSQL, SQL, production or
network action. It authorizes nothing until the Owner later approves the
committed Addendum SHA, this Review's externally computed SHA, both exact
single-document HEAD/trees and every choice below.

This file intentionally omits its own SHA-256 and its future containing
commit/tree. It also omits every future `Kt/Lt/Mt`, Card, Review, grant and
receipt hash. Those values do not yet exist and must not be guessed.

## Nine Owner choices

Exact approval accepts all nine choices together:

1. **Accept the topology conflict.** At `Mc`, the two original Physical
   Execution Card/Review paths already exist. The corrected runner requires a
   future Card/Review to add those same paths with status `A`, but any
   successor can only produce `M`. The committed verifier therefore rejects
   the otherwise fresh authority before grant preparation.
2. **Preserve the failed authority as history.** Keep the old Card
   `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77`,
   Review
   `sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e`,
   payload
   `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3`
   and private receipt
   `sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a`
   immutable and non-executable. Do not overwrite, revive or reuse them.
3. **Select unique fresh authority paths.** Reserve only
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2.md` and
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md`
   for the later fresh Card and Review. Each later commit must add exactly its
   one mode-100644 path as a direct single-parent child.
4. **Approve exactly fifteen construction paths and three commits.** Require
   the direct chain `Mc → T → U → Kt → Lt → Mt`. `Kt` modifies only runner and
   runner test; `Lt` adds only the three new machine-evidence paths; `Mt` adds
   one report and modifies only the nine named status paths. Total: eleven
   modified plus four added paths. No alternate path, merge, rename, deletion,
   mode drift or fourth construction commit.
5. **Keep the execution contract unchanged.** Preserve canonical execution
   payload v1, grant v3, receipt v3, exact markers and dynamic slots, Docker/
   Pool/SQL ceilings, image/platform/manifest, SQL bytes, catalog contract and
   all production denials. The legacy payload artifact-key names remain, but
   their values must bind the new correction evidence/report and final audit.
6. **Freeze the full historical and successor lineage.** The runner must prove
   failed execution, APFS nlink authority, `Kc/Lc/Mc`, this Addendum and this
   Review before accepting dynamic `Kt/Lt/Mt/C2/R2`. Old paths, old payload,
   old receipt or old `Kc/Lc/Mc` values must never satisfy the new verifier.
7. **Require strict non-self-referential evidence.** Freeze committed runner/
   test bytes and aggregate, strict Ajv 2020 schema and hostile mutations,
   machine evidence, report, current Gate C Card and DECISIONS in a one-way
   hash DAG. Candidate and committed audits must each report 0 Blocker /
   0 Important; no artifact may contain its own hash or a future commit/tree.
8. **Preserve all unrelated bytes and zero effects.** Dependencies, lock, SQL,
   application/store/runtime, production configuration and every unlisted
   authority/evidence artifact remain byte-identical. No repository external
   network, pending/consumed grant, Docker/OCI/PostgreSQL/SQL, production,
   real-data, Provider, messaging, deployment, Gate C, push/PR, merge/release
   or spend effect is authorized. Owner `.build` remains unread and unstaged.
9. **Stop before fresh physical authority.** After `Kt/Lt/Mt` and an external
   committed-`Mt` 0B/0I audit, stop. The later `C2/R2` documents may then be
   proposed, but preparation still requires a separate exact Owner approval.
   No correction result implies Physical Green, #67 Done or R4 Done.

## Exact construction workset

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

The Addendum and this Review are authority inputs, not construction artifacts.
The later `C2/R2` Card/Review are also outside this fifteen-path correction
workset.

## Exact topology

```text
Mc 6c96f70
└─ T e61a2bb  Addendum only
   └─ U  this Review only
      └─ Kt  2M runner/test
         └─ Lt  3A machine evidence
            └─ Mt  9M + 1A status freeze
               └─ C2  later -CARD-V2.md only
                  └─ R2  later -OWNER-REVIEW-V2.md only
```

`Mc` is bound by tree
`e08de32e58c5c05730d69280aae824cb2277ea33`, `G10c`
`sha256:72fe493881c293e6ac60368b8ab490073de1e7c2609a9de83d534dd27ca39bdc`
and committed-audit summary
`sha256:8b01569106b44c94ad3dccb66532910935fe7caa9baca8391b144490940b8ec6`.
`T` is its direct single-path child. Any alternate parent/tree/delta or changed
Addendum byte invalidates this Review.

## Required validation

Technical Review Green requires:

- exact committed `Mc/T/U/Kt/Lt/Mt` parent/tree/path/blob topology;
- exact historical failed Card/Review and APFS correction topology;
- positive future `Mt/C2/R2` versioned-path verification and hostile old-path,
  action, parent, tree, merge, payload, hash, historical-reuse and dirty-tree
  cases;
- canonical payload v1 plus grant/receipt v3 positive and hostile matrices;
- committed aggregate, strict Ajv positive and mutation validation, cross-hash,
  local-link, no-self-reference and docs audits;
- runner, focused Public Core, wildcard Public Core, R4 offline, Gate-B
  successor and spine lanes from final committed bytes;
- syntax, TypeScript, hosted-room no-server-AI and `git diff --check`; and
- injected-port/source-control proof that real Docker, socket, PostgreSQL, SQL,
  network, Provider and messaging effects are all zero.

Historical test counts are not new evidence; final counts must be observed and
recorded from committed `Kt`.

## Zero-effect ceiling

| Effect | Maximum after exact correction approval |
|---|---:|
| Construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository/package/source-control external network | `0` |
| Pending / consumed grants | `0 / 0` |
| Docker CLI / daemon / OCI calls | `0 / 0 / 0` |
| PostgreSQL process / connection / database | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product network / production database or data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

The failed private receipt remains inactive forensic evidence. It is not a
pending grant or reusable approval.

## Exact approval request

The Owner's later approval must externally name all of:

- Addendum SHA-256
  `sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22`;
- `T` HEAD/tree
  `e61a2bb1817ac56c9377e161078f46543d8d2411` /
  `88b35f39ce6e7d170309244930129911cc09b230`;
- this Review's externally computed SHA-256 and direct-child `U` HEAD/tree;
- baseline `Mc` HEAD/tree, `G10c` and committed-audit summary;
- all nine choices, exact `Kt/Lt/Mt` workset, future `C2/R2` paths and every
  zero-effect ceiling; and
- both mandatory stops below.

Any changed byte or omitted choice requires a newly frozen request.

## Mandatory stops

Before exact correction approval:

`EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_OWNER_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After genuinely Green correction construction and external committed audit:

`LOCAL_POSTGRES_EXECUTION_AUTHORITY_TOPOLOGY_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Neither stop makes #67 or R4 Done.
