# R4 #67 Docker Diagnostic and Blocked-Cleanup Rescue Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Diagnostic/Rescue Correction Addendum SHA-256:
  `sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9`
- Addendum proposal `D` HEAD / tree:
  `56553e4a1e7bc65516f1f14cbac7e8fab2a53262` /
  `45a8b295d5308766e2bf0a6f4715af0d5c5edaef`
- Baseline failed execution Review `R2` HEAD / tree:
  `6e67c1f1867d73f27674a5f056e0692c5b42d6a3` /
  `60b3d7b124968a20f6ec30700d389849dd277ab2`
- Consumed physical grant: **present, non-retryable**
- Cleanup: **`BLOCKED`**
- New physical execution / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This Review is the short decision surface for the exact Addendum above. It
creates no grant and performs no Docker, OCI, PostgreSQL, SQL, production or
network action. It authorizes nothing until the Owner later approves the
committed Addendum SHA, this Review's externally computed SHA, both exact
single-document HEAD/trees and every choice below.

This file intentionally omits its own SHA-256 and future containing
commit/tree. It also omits every future `Kd/Ld/Md`, Rescue Card/Review,
rescue-grant/receipt and fresh Physical Execution Card/Review hash. Those
values do not yet exist and must not be guessed.

## Nine Owner choices

Exact correction approval accepts all nine choices together:

1. **Accept the failed execution truth.** Bind Card V2
   `sha256:1ca420578f3e16c75b8242d71b93ea7be18baa1815c0f83e610807f9ded7c795`,
   Review V2
   `sha256:e92a125cdf1f8c4df8448836275bd98225ec8ce0b764dd70dfbabc479366e377`,
   canonical payload
   `sha256:773a172f0d756b218de9ecfd7e9c2858a28b6ceb236474d103a4822a4203bf56`,
   consumed grant
   `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`,
   final receipt
   `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`
   and journal count/head `34` /
   `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`.
   The result is exactly `FAILED / cleanup BLOCKED`, not Physical Green.
2. **Preserve one-use and forensic truth.** Never revive the consumed grant,
   reinterpret its unused cleanup ceiling as construction permission, modify
   the old four-entry private root, overwrite either receipt or claim the old
   runner created a resource. The old journal proves create/start/pull/PG/SQL
   counts are zero, while absence remains unproven.
3. **Approve only the closed diagnostic correction.** Add exactly one new
   accepted full line for `container.inspect`:
   `Error: No such object: <exact-container-name>`. Preserve the predecessor
   exact image/container/network/volume lines, status-1, empty-stdout,
   single-line and exact-name requirements. Reject substring/regex/general
   nonzero bypasses, wrong names and every near miss.
4. **Construct a separate cleanup-rescue membrane.** Add dedicated rescue
   prepare/execute APIs without changing general physical prepare/execute.
   Rescue prepare uses a fresh root and one-use grant, binding the corrected
   repo, exact old root/inode/four files, approval receipt, consumed grant,
   final receipt, journal, resource names/label and fresh CLI/socket facts.
   Rescue execute may only inspect, exact-label stop/remove and re-inspect the
   old grant's container/network/volume.
5. **Approve the future rescue ceiling as design only.** A later separately
   approved rescue may use one version call; two inspections each for exact
   container/network/volume; at most one exact-owned container stop/remove,
   network remove and volume remove; every other Docker kind zero. It has one
   pending grant, one consumption and one rescue lifecycle. It has no image,
   create/start, port, credential, `pg`, connection, database, SQL, product,
   production or Gate C authority. This correction approval does not activate
   that ceiling.
6. **Approve exactly fifteen construction paths and three commits.** Require
   the direct chain `R2 -> D -> V -> Kd -> Ld -> Md`. `Kd` modifies only
   runner/test; `Ld` adds only three correction evidence paths; `Md` adds one
   report and modifies only nine named status paths. Total: eleven modified
   plus four added. No alternate path, merge, rename, deletion, mode drift or
   fourth construction commit.
7. **Require strict evidence and hostile validation.** Bind the full failed
   lineage/evidence, committed runner/test aggregate, strict Ajv schema,
   zero-effect evidence and report in a one-way DAG. Require diagnostic near
   misses, rescue grant/receipt mutations, stale root/journal/evidence,
   foreign label, host/root drift, crash, duplicate-consume, wrong topology
   and real-port denial tests. Candidate and committed audits must each be
   `0 Blocker / 0 Important`.
8. **Preserve unrelated bytes and zero construction effects.** Dependencies,
   lock, SQL, application/store/runtime, production configuration, every old
   authority/evidence byte and every unlisted path remain unchanged. No
   repository external network, old cleanup recovery, pending/consumed grant,
   Docker/OCI/PostgreSQL/SQL, production, real data, Provider, messaging,
   deployment, Gate C, push/PR, merge/release or spend effect is authorized.
   Owner `.build` remains unread and unstaged.
9. **Stop before rescue and before a new rehearsal.** After `Kd/Ld/Md` and an
   external committed-`Md` 0B/0I audit, stop for a separately proposed
   Blocked-Cleanup Rescue Card/Review. After a genuinely Green separately
   approved rescue, stop again for a fresh Physical Execution Card/Review V3.
   No correction or rescue result alone makes the PostgreSQL rehearsal Green,
   #67 Done or R4 Done.

## Exact failure and resource bindings

| Binding | Exact value |
|---|---|
| private root | `/private/tmp/forme-r4-pg-9ZGIOLeX` |
| observed device / inode / mode / uid | `16777231 / 32871902 / 0700 / 501` |
| Owner approval receipt | `sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c` |
| consumed grant ID | `b92ae04555cc3d69a16c06ae53b30976` |
| first / final evidence | `sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7` / `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c` |
| container | `forme-r4-public-core-local-b92ae04555cc3d69` |
| network | `forme-r4-public-core-local-net-b92ae04555cc3d69` |
| volume | `forme-r4-public-core-local-vol-b92ae04555cc3d69` |
| exact label | `forme.r4.public-core.local.grant=b92ae04555cc3d69a16c06ae53b30976` |

These observations may be used only as correction fixtures now. A later rescue
prepare must freshly revalidate the path/inode and all four forensic bytes.

## Exact correction workset

### `Kd`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Ld`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-docker-diagnostic-rescue-correction.json`
2. `schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-evidence.schema.json`

### `Md`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total construction workset: exactly fifteen paths, eleven modified and four
added, across exactly three commits. The Addendum and this Review are authority
inputs, not construction artifacts.

The later unique rescue authority paths are:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-OWNER-REVIEW.md`

They are outside the fifteen-path workset and remain future, non-authorized
proposal paths.

## Exact topology

```text
R2 6e67c1f
└─ D 56553e4  Addendum only
   └─ V  this Review only
      └─ Kd  2M runner/test
         └─ Ld  3A machine evidence
            └─ Md  9M + 1A status freeze
               └─ CR  later Rescue Card only
                  └─ RR  later Rescue Review only
```

`R2` is bound by tree
`60b3d7b124968a20f6ec30700d389849dd277ab2`. `D` is its direct
single-path child and is bound by tree
`45a8b295d5308766e2bf0a6f4715af0d5c5edaef`. Any alternate parent, tree,
delta or changed Addendum byte invalidates this Review.

## Required validation

Technical Review Green requires:

- exact committed `R2/D/V/Kd/Ld/Md` parent/tree/path/blob topology;
- exact `Mt/G10t`, Card V2/Review V2, payload, consumed grant, two receipts,
  journal and failed effect-counter bindings;
- full-line diagnostic positives and hostile near misses with zero real Docker;
- strict rescue prepare/grant/consume/receipt positive and mutation matrices;
- exact rescue Docker argv/ceilings, foreign-label denial and post-rescue
  exact-absence proof in injected fakes;
- worktree/root/CLI/socket drift, clock, one-use, crash and no-retry denials;
- strict Ajv positive/mutation validation, committed aggregate, cross-hash,
  local-link, no-self-reference and documentation audits;
- runner, focused Public Core, wildcard Public Core, R4 offline, Gate-B
  successor and spine lanes from final committed bytes;
- syntax, TypeScript, hosted-room no-server-AI and `git diff --check`; and
- source/injected-port proof that real Docker, socket, PostgreSQL, SQL,
  network, Provider and messaging effects are zero.

Historical counts are not new evidence. Final counts must be observed from
committed `Kd` bytes.

## Zero-effect ceiling selected now

| Effect | Maximum after exact correction approval |
|---|---:|
| Construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository/package/source-control external network | `0` |
| New pending / consumed grants | `0 / 0` |
| Remaining old cleanup recovery consumed | `0` |
| Docker CLI / daemon / OCI calls | `0 / 0 / 0` |
| PostgreSQL process / connection / database | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product network / production database or data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

## Exact approval request

The Owner's later approval must externally name all of:

- Addendum SHA-256
  `sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9`;
- `D` HEAD/tree
  `56553e4a1e7bc65516f1f14cbac7e8fab2a53262` /
  `45a8b295d5308766e2bf0a6f4715af0d5c5edaef`;
- this Review's externally computed SHA-256 and direct-child `V` HEAD/tree;
- baseline `R2` HEAD/tree, consumed-grant/final-evidence/journal bindings;
- all nine choices, exact `Kd/Ld/Md` workset, future Rescue Card/Review paths,
  rescue design ceilings and every zero-effect construction ceiling; and
- both mandatory stops below.

Any changed byte or omitted choice requires a newly frozen request.

## Mandatory stops

Before exact correction approval:

`DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_OWNER_APPROVAL_REQUIRED / CLEANUP_RESCUE_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After genuinely Green correction construction and external committed audit:

`LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Correction approval does not authorize rescue, a fresh rehearsal, production,
Gate C, #67 Done or R4 Done.
