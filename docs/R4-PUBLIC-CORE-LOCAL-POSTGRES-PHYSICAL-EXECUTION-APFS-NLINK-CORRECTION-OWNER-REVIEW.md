# R4 #67 APFS nlink Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Correction Addendum SHA-256:
  `sha256:b1ad65b6033eeb0b3848544df596af362e49015613434c4eb2a06ce4f1e80e06`
- Addendum proposal `A` HEAD / tree:
  `04ad36bddbf7d2f62cdfc241f51a5cf817046aff` /
  `006c3bbf7f0a0e988c7afd65b425fbcefc1189b8`
- Baseline failed Execution Review `E` HEAD / tree:
  `e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab` /
  `91f1a0aef6820bd4a145bc6d93acd0bbedc40992`
- Pending or consumed grant: **absent / absent**
- Correction physical effects: **0**
- Gate C: **NOT_REQUESTED**

This Review is the short decision surface for the exact Correction Addendum
above. It authorizes nothing until the Owner later approves the committed
Addendum SHA, this Review's externally computed SHA, both direct-child
commits/trees and every choice below. It does not authorize preparation or
physical execution.

This file intentionally omits its own SHA-256 and its future containing
commit/tree. It also omits every future Kc/Lc/Mc hash. Those values do not yet
exist and must not be guessed or embedded.

## Eight Owner choices

Approval accepts all eight choices together:

1. **Accept the failed-prepare truth.** The precisely approved baseline Card/
   Review reached only `prepare`, which returned
   `local_postgres_private_root_invalid` because a real APFS mode-0700 root
   containing exactly one valid receipt had nlink 3 while the frozen contract
   required 2. No pending grant, grant consumption, journal, Docker home,
   secret or evidence was created; Docker/OCI/PostgreSQL/SQL effects are zero.
2. **Invalidate the failed execution authority.** Keep the old Card, Review,
   canonical payload and private receipt as immutable historical/forensic
   bytes, but make all of them non-executable. They cannot be revived by this
   correction or used to create a corrected pending grant. A fresh Card,
   Review and exact Owner approval are required after correction.
3. **Remove only the fixed directory nlink constant.** Do not replace `2` with
   `3` or another platform constant. Keep the canonical real current-uid
   mode-0700 directory check and require a structurally valid link count of at
   least 2. Capture and revalidate exact path/dev/ino/uid/gid/mode while exact
   entry/type/link-count checks continue to define allowed state transitions.
4. **Preserve and extend the security membrane.** Retain no-follow child
   access, exact pre/post entry sets, stable same-descriptor receipt/pending
   checks, root replacement/alias rejection, partial-write rollback and
   cleanup ambiguity. Add portable real-filesystem and hostile link-count,
   gid/mode/dev/inode/path/extra-entry/replacement tests. Every failure remains
   zero physical effect and may not claim false cleanup.
5. **Approve exactly fifteen correction paths and three construction commits.**
   Require direct chain `E → A → O → Kc → Lc → Mc`. Kc modifies only runner
   and runner test. Lc adds only the three correction machine-evidence paths.
   Mc adds one correction report and modifies only the nine status paths named
   in the Addendum. Total: eleven modified plus four added paths. No alternate
   path, fourth construction commit, rename, deletion or mode change.
6. **Freeze strict evidence without self-reference.** Require the full prior
   deny-network regression matrix plus new APFS/portable/hostile tests;
   committed runner/test aggregate; strict Ajv 2020 schema and mutations;
   Kc/Lc latest-byte and committed-byte audits; one-way index/schema/evidence/
   report/Card/DECISIONS hash DAG; exact status stop; and 0 Blocker /
   0 Important before each downstream freeze.
7. **Preserve all unrelated bytes and effects.** Dependencies, lock, SQL,
   grant/receipt v3, execution payload shape, Docker/Pool/SQL ceilings, image,
   catalog, application/store/runtime/production paths and every prior
   authority/evidence artifact remain byte-identical. No external network,
   pending/consumed grant, Docker/OCI/PostgreSQL/SQL, production, real-data,
   Provider, deployment, Gate C, push/PR, merge/release or spend effect is
   allowed. Owner `.build` remains unread and unstaged.
8. **Stop before fresh execution authority.** After Kc/Lc/Mc and external
   committed-Mc audit are Green, stop at the exact three-part status below.
   Only then may a new one-use Execution Card/Review be proposed and separately
   approved. No correction result implies Physical Green, #67 Done or R4 Done.

## Exact correction workset

### `Kc`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lc`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-apfs-nlink-correction.json`
2. `schemas/r4/public-core/local-postgres-apfs-nlink-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-apfs-nlink-correction-evidence.schema.json`

### `Mc`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

The Addendum and this Review are authority inputs and are not counted among
the fifteen construction paths.

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

The private failed approval receipt remains inactive forensic evidence outside
the repository. It is not a pending grant or reusable approval.

## Required validation and truth

Correction Technical Review Green requires:

- exact single-parent `E → A → O → Kc → Lc → Mc` topology and deltas;
- no fixed production root-nlink equality and no fake expected-count adapter;
- successful real-filesystem prepare proof on the observed APFS host with one
  receipt and truthful nlink 3, while producing only a fake/isolated pending
  file under deny-network tests—not a real approved grant;
- hostile root identity/entry/receipt/pending mutation matrix with zero
  physical ports entered;
- all previously frozen runner/focused/Public-Core/offline/Gate-B/spine,
  syntax/typecheck/no-AI/docs/diff lanes Green;
- strict machine-evidence validation and mutation rejection;
- operational status aligned only in Mc and whole-repository docs-current
  claim retained false; and
- independent candidate and committed audits at 0B/0I.

Target PostgreSQL, Docker/image/daemon observation, SQL execution and target
catalog remain false. No fresh execution authority exists at the correction
stop.

## Exact stop

`LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

## Approval mechanics

The exact Owner approval request must externally name:

- Correction Addendum SHA-256
  `sha256:b1ad65b6033eeb0b3848544df596af362e49015613434c4eb2a06ce4f1e80e06`;
- Addendum proposal `A` HEAD/tree
  `04ad36bddbf7d2f62cdfc241f51a5cf817046aff` /
  `006c3bbf7f0a0e988c7afd65b425fbcefc1189b8`;
- this Review's externally computed SHA-256 and its direct-child wrapper
  HEAD/tree;
- baseline `E` HEAD/tree and exact failed Card/Review/payload/audit/receipt
  hashes;
- all eight choices, exact Kc/Lc/Mc workset, zero-effect table and exact stop.

Any changed byte, omitted choice, non-direct parent, alternate workset or
effect ceiling requires a newly frozen request.
