# R4 #67 Body-Free Docker Inspect Diagnostic Authority-Path Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Path-Correction Addendum SHA-256:
  `sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00`
- Path-Correction proposal `G` HEAD / tree:
  `0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb` /
  `50e5bcc3b6dcec268f619e3b8399cc92e323da70`
- Baseline Diagnostic Construction Review `FV` HEAD / tree:
  `fcb1a5bc20832bdc63d0c7cfd6ff49ed1cf20e9e` /
  `1541a8dbd4d425b7faeebd66fa417a035f10f5b3`
- Diagnostic construction / execution / cleanup: **NOT_STARTED / NOT_REQUESTED / NOT_REQUESTED**
- Physical Execution / Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**

This Review is the exact decision surface for one future-path correction. It
creates no grant and performs no Docker, socket, PostgreSQL, SQL, cleanup,
production or network action. It authorizes nothing until the Owner approves
the committed Addendum SHA, this Review's externally computed SHA, exact
`G/GV` HEAD/trees and all four choices below.

It omits its own SHA-256 and containing commit/tree, plus all future
`Kf/Lf/Mf`, Diagnostic Card/Review, grant and receipt hashes.

## Four Owner choices

1. **Accept the collision finding.** The approved future
   `...DIAGNOSTIC-OWNER-REVIEW.md` path is already the immutable construction
   Owner Review at `FV`; it cannot later be added again without modifying the
   approved file and invalidating topology.
2. **Select the exact versioned replacement paths.** The only future
   diagnostic effect-authority paths become:
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD-V1.md`
   and
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW-V1.md`.
   Both must later be single-path mode-100644 additions after committed `Mf`.
3. **Insert only the two correction-authority commits.** The corrected chain
   is `RR -> F -> FV -> G -> GV -> Kf -> Lf -> Mf -> FC1 -> FR1`.
   `G/GV` are authority inputs outside the construction workset. `Kf/Lf/Mf`
   remains exactly fifteen paths, eleven modified plus four added, across
   exactly three commits.
4. **Preserve every other choice and zero-effect boundary.** The failed rescue
   truth, both forensic roots, consumed grants, body-free observation contract,
   future `version=1/container.inspect=1` design ceiling, no-guessed-diagnostic
   rule, strict validation, no cleanup and all Physical Execution/production/
   Gate C stops remain unchanged. Construction still has zero Docker, socket,
   PostgreSQL, SQL and external-network effects.

## Exact corrected topology

```text
RR ac1dfea
└─ F 931dbb7
   └─ FV fcb1a5b
      └─ G 0a9c306  Path-Correction Addendum only
         └─ GV  this Review only
            └─ Kf  2M runner/test
               └─ Lf  3A machine evidence
                  └─ Mf  9M + 1A status freeze
                     └─ FC1  later Diagnostic Card V1 only
                        └─ FR1  later Diagnostic Owner Review V1 only
```

`FV` is bound by tree
`1541a8dbd4d425b7faeebd66fa417a035f10f5b3`. `G` is its direct,
single-parent, one-path mode-100644 child and is bound by tree
`50e5bcc3b6dcec268f619e3b8399cc92e323da70`. Any alternate parent, tree,
delta or changed Addendum byte invalidates this Review.

## Preserved construction workset

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

## Zero-effect ceiling

| Effect | Maximum after exact correction approval |
|---|---:|
| Construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| External network | `0` |
| Diagnostic pending / consumed grants | `0 / 0` |
| Docker / socket / OCI / PostgreSQL / SQL calls | `0 / 0 / 0 / 0 / 0` |
| Cleanup / production / traffic / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / 0` |

## Mandatory stop and approval mechanics

Before exact Owner approval:

`BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_AUTHORITY_PATH_CORRECTION_OWNER_APPROVAL_REQUIRED / DIAGNOSTIC_CONSTRUCTION_NOT_STARTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

A later approval must externally name:

- Addendum SHA
  `sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00`
  and `G` HEAD/tree
  `0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb` /
  `50e5bcc3b6dcec268f619e3b8399cc92e323da70`;
- this Review's externally computed SHA-256 and future `GV` HEAD/tree;
- all four choices, corrected `FC1/FR1` paths, preserved `Kf/Lf/Mf` workset
  and all zero-effect boundaries;
- `Diagnostic Authority-Path Correction APPROVED`; and
- `Docker Diagnostic NOT_REQUESTED`, `Cleanup NOT_REQUESTED`,
  `Physical Execution NOT_REQUESTED`, `Production NOT_REQUESTED` and
  `Gate C NOT_REQUESTED`.

After approval, construction may resume at `Kf`. This correction never
authorizes the future diagnostic effect itself.
