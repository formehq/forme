# R4 #67 Local PostgreSQL Wiring — Addendum C

- Status: **`PROPOSED_NOT_EXECUTED`**
- Updated: 2026-08-11
- Scope: **Gate-B successor-lock regression compatibility only**
- Approved Local PostgreSQL Wiring Construction Packet:
  `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`
- Approved Local PostgreSQL Wiring Owner Review:
  `sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca`
- Approved Addendum B:
  `sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f`
- Approved Addendum B Owner Review:
  `sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2`
- Approved Addendum B wrapper HEAD / tree:
  `1db7b30f38ca6322a3b0ad4be6d537af9cf781e8` /
  `1270bbc9beae9c446c83bbfc220e5906800890e3`
- Gate C activation authority: **NOT_REQUESTED**
- Docker, OCI acquisition, database and SQL execution authority:
  **NOT_REQUESTED**

This Addendum is an authority proposal, not an approval or implementation
grant. It records a regression-validation hard stop reached during the exact
offline Addendum B construction and proposes the narrowest test-only authority
correction.

The Owner's permission to prepare and freeze this proposal permits exactly
this Addendum, its companion Owner Review and the two local documentation-only
freeze commits. It permits no test or implementation edit, no package or lock
change, no external source-control operation and no physical effect. The
existing 17-path Addendum B candidate remains uncommitted and must not enter
either proposal commit.

## 1. Hard-stop discovery

Addendum B correctly authorized an exact 15-entry PostgreSQL dependency-lock
delta. The resulting approved successor `package-lock.json` SHA-256 is:

`sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`

Two historical Gate-B construction scripts remain intentionally bound to the
predecessor lock SHA-256:

`sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812`

Those historical bytes must not be rebound. On the Addendum B candidate, the
exact deny-network Gate-B command therefore reports 141 passing tests and four
failing tests:

- `test/r4-gate-b-core/macos-core-adapter.test.ts` reaches the historical
  preflight first and receives exact code
  `CORE_PREFLIGHT_IMMUTABLE_HASH_DRIFT`;
- three assertions in
  `test/r4-gate-b-core/physical-runner.test.ts` reach the historical physical
  authority check first and receive exact code
  `PHYSICAL_IMMUTABLE_DRIFT:package-lock.json` with verdict `RED`.

The physical authority rejection occurs before construction-root or journal
creation and before any cleanup, process, Docker, database, SQL, provider or
network effect. These four results are correct fail-closed behavior from the
unchanged historical scripts. The failures arise only because their existing
test predicates expect a later historical branch/workset rejection and do not
recognize that the approved successor lock now rejects earlier.

Changing either historical script to accept the successor lock would silently
rebind old Gate-B authority and is forbidden. Treating the four failures as an
unqualified Green would also be false. The minimal correction is to make only
the two tests pin the historical predecessor authority while proving the exact
current successor rejection.

## 2. Current candidate and effect truth

The Addendum B candidate currently changes exactly its authorized 17 Stage A
paths. The focused application, crypto, PostgreSQL, executor and bridge tests
pass 85/85. The local runner's deny-network fake suite passes 66/66, including
the final concurrent recovery snapshot regression. TypeScript, runner syntax
and scoped diff checks pass. Independent review of the current 17-path bytes
reports zero Blocker and zero Important findings apart from this separately
identified Gate-B authority/workset stop.

The Gate-B command itself passes 141/145 and fails only at the four exact
old-lock sentinels above. No Gate-B test or script has been changed. No Stage A
candidate path has been staged or committed.

| Effect | Addendum B construction to this stop | Addendum C preparation at final wrapper freeze |
|---|---:|---:|
| Authorized Stage A candidate paths changed | `17` | `0` |
| Gate-B test paths changed | `0` | `0` |
| Proposal documents created | `0` | `2` |
| Local proposal-only commits | `0` | `2` |
| Repository-command / package / source-control external network | `0` | `0` |
| Docker CLI / daemon calls | `0 / 0` | `0 / 0` |
| OCI inspect / pull | `0 / 0` | `0 / 0` |
| PostgreSQL connections / database identities | `0 / 0` | `0 / 0` |
| SQL apply / verify / rollback | `0 / 0 / 0` | `0 / 0 / 0` |
| Product/data-plane network | `0` | `0` |
| Real Room / Projection / Curator / Guest bytes | `0` | `0` |
| Product/runtime Provider / model / email messages | `0` | `0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` | `0 / 0 / 0 / 0 / US$0` |

The Owner-directed Codex development/control channel is disclosed and excluded
from the scoped repository-command and product/runtime zero-effect claims. The
pre-existing Owner-owned `native/macos/.build/` remains outside the workset and
untouched.

The Addendum C column states the required truth at the final wrapper freeze,
after this Addendum and its Owner Review have each been added by one exact
local documentation-only commit. If that two-document / two-commit truth or
any zero-effect entry is not met, no approval request may be issued.

## 3. Proposed exact test-only correction

After future exact Owner approval, Addendum B Stage A expands from 17 to
exactly 19 paths by adding only:

1. `test/r4-gate-b-core/macos-core-adapter.test.ts`
2. `test/r4-gate-b-core/physical-runner.test.ts`

This narrowly supersedes only the prior Packet requirement that every
historical Gate-B artifact remain byte-identical and Addendum B's statement
that no new test path is added. The supersession applies solely to modifications
of these two already tracked test files. Every other historical Gate-B artifact
remains byte-identical. No other path is added to either workset: the prior 17
Stage A paths retain Addendum B authority, and the unchanged nine-path Stage B
set retains only Addendum B's recording authority.

The two tests must pin both full hashes directly. They must read the current
repository lock bytes exactly once, prove that their SHA-256 is the approved
successor value `8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`,
and prove that the unchanged historical script constants remain the predecessor
value `d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812`.
They may not write, rename, replace or mock the lock.

The macOS test must retain direct assertions for the historical correction
Packet SHA-256, Owner Review SHA-256 and approved proposal HEAD/tree even
though `verifyCoreCorrectionImmutableBindings()` now rejects before returning
its prior result. That call must throw only
`CORE_PREFLIGHT_IMMUTABLE_HASH_DRIFT`.

The three physical cases must retain their historical evidence, Yellow and
zero-call assertions. Calls to `verifyPhaseAAuthority()` and the affected
`constructPhysicalAdapters()` cases must throw only
`PHYSICAL_IMMUTABLE_DRIFT:package-lock.json` with verdict `RED`, with the
construction root absent before and after. Their descriptions must truthfully
identify the current successor-lock pre-effect denial rather than claim that a
later branch/workset rejection was dynamically reached.

No predicate may accept a prefix, generic immutable drift, arbitrary `RED`,
arbitrary error, alternate hash or later failure. The tests must prove that the
historical scripts continue to reject the one exact successor lock before
effects; they must not create an old-or-new production allowlist. In
particular, the three physical cases must use a dedicated exact successor-lock
predicate rather than broaden the existing historical
`isPostOutputAuthorityFailure` predicate with an `OR` branch.

The correction may add focused assertions and local test helpers only inside
the two named files. It may not change production code, the Local PostgreSQL
runner, dependencies, lock bytes, Gate-B scripts, schemas, evidence, reports,
packets, reviews or runtime artifacts.

## 4. Historical authority remains immutable

The following remain historical, unchanged and authoritative only for their
original frozen state:

- `scripts/r4-gate-b-preflight.mjs` continues to bind the predecessor lock;
- `scripts/r4-gate-b-physical-runner.mjs` continues to bind the predecessor
  lock and its original branch/workset authority;
- every file under `schemas/r4/gate-b-core/` remains byte-identical;
- existing Gate-B evidence, reports, packets, reviews, decisions and status
  documents remain byte-identical; and
- the predecessor lock is not superseded, migrated or added to a dual runtime
  allowlist.

The successor lock is approved for the Local PostgreSQL Wiring construction,
not for historical Gate-B execution. A 145/145 result after this correction
means only that the current candidate regression suite proves the exact
historical fail-closed boundary. It does not mean that historical Gate-B
authority was rebound, Gate-B execution became Green, Host Binding completed,
Gate C became ready or any physical effect was approved.

The historical truth remains `CORE_REPOSITORY_REVIEWABLE_YELLOW` and
`HOST_BINDING_INCOMPLETE_YELLOW`. Retry Execution and First Provider Call
remain `NOT_REQUESTED`.

The two modified test hashes belong only to the Local PostgreSQL successor
worktree overlay. They must not be written into a historical Gate-B artifact
index, evidence file, report or manifest and do not constitute a Gate-B
artifact re-freeze.

## 5. Exact validation and audit requirements

After exact approval and the two test-only edits, the candidate must satisfy:

1. `npm run test:r4:gate-b-core` passes exactly 145/145 under the repository's
   deny-network wrapper;
2. the two named test files explicitly assert the exact predecessor script
   constants and the exact current successor lock bytes, rejecting every other
   value;
3. the unchanged historical preflight still rejects the successor lock with
   `CORE_PREFLIGHT_IMMUTABLE_HASH_DRIFT`;
4. the unchanged historical physical runner still rejects it with
   `PHYSICAL_IMMUTABLE_DRIFT:package-lock.json` / `RED` before effects;
5. the Addendum B focused, runner, typecheck, full offline, no-AI and diff
   lanes remain Green;
6. the changed Stage A workset is exactly 19 paths, with only the two paths in
   Section 3 added to the previously approved 17;
7. every Gate-B script/schema/evidence/report byte named in Section 4 is
   unchanged; and
8. independent latest-byte review reports exactly zero Blocker and zero
   Important findings.

The 145 tests must be reported as one current candidate regression lane. They
must not be represented as a rerun of the historical physical construction or
as proof that its old immutable bindings accept the successor candidate.

## 6. Stage B, effects and mandatory stop

The Addendum B nine-path Stage B workset remains unchanged. Those paths may
record the exact Addendum C approval, the 19-path Stage A artifact index and
aggregate, validation truth, independent audit and unchanged stop state. No
other Stage A or Stage B path may change.

This Addendum does not restore or expand any physical authority. Even after
exact approval, all Addendum B Phase 1 ceilings remain in force:

| Effect | Maximum |
|---|---:|
| Repository command / package / source-control external network | `0` |
| Docker CLI / daemon calls | `0 / 0` |
| OCI inspect / pull | `0 / 0` |
| PostgreSQL connection / database identity | `0 / 0` |
| SQL apply / verify / rollback | `0 / 0 / 0` |
| Product/data-plane network | `0` |
| Production or remote database effects | `0` |
| Runtime / route / Vault / HTTPS / traffic activation | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Product/runtime Provider / model / email messages | `0` |
| Deployment / publication / admission | `0 / 0 / 0` |
| Gate C activation | `0` |
| Merge / release / spend | `0 / 0 / US$0` |

If either test requires a production-script change, a third lock state, a
Gate-B schema/evidence rebind, an unlisted path or any physical effect,
construction must stop and return to the Owner.

After the exact 19-path Stage A is frozen and independently audited, work must
stop at:

`INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Physical Rebind, Docker, OCI, PostgreSQL, SQL execution, runtime/route/Vault/
HTTPS activation, real data, production/provider traffic, merge, release and
spend remain separately forbidden. Gate C readiness, #67 Done and R4 Done
remain false. Any changed Addendum byte, broader test
semantics, workset, lock state, effect ceiling or stop requires a new exact
Owner review and approval.
