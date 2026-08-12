# R4 #67 Local PostgreSQL Wiring Addendum C — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-11
- Addendum C SHA-256:
  `sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d`
- Addendum C proposal baseline HEAD / tree:
  `ba61f7434071b759195fd3389b84092b96f3bb0c` /
  `091258d78908a1a2e99542e1a5b835e84b5d3512`
- Prior approved Addendum B:
  `sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f`
- Prior approved Addendum B Owner Review:
  `sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2`
- Prior approved Addendum B wrapper HEAD / tree:
  `1db7b30f38ca6322a3b0ad4be6d537af9cf781e8` /
  `1270bbc9beae9c446c83bbfc220e5906800890e3`
- Gate C activation authority: **NOT_REQUESTED**
- Physical Rebind authority: **NOT_REQUESTED**

This Review is the short decision surface for the exact Addendum C bound
above. Addendum C remains the complete authority surface. Neither document
grants test or implementation changes until the Owner approves the exact
Addendum SHA-256 together with this Review's externally computed SHA-256, the
proposal baseline and the final wrapper HEAD/tree containing this Review.

This file intentionally omits its own SHA-256 and the future final wrapper
value. Both must be supplied externally after these bytes are frozen; embedding
either would create a self-reference.

## Decision surface

Approval accepts all six choices together:

1. **Accept the exact conflict truth.** The Local PostgreSQL successor
   `package-lock.json` is exactly
   `sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`,
   while the unchanged historical Gate-B production verifiers remain bound to
   predecessor
   `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812`.
   The current 141/145 result consists only of one exact Core immutable-hash
   denial and three exact physical package-lock denials before effects.
2. **Permit exactly two test paths.** Expand Addendum B Stage A from 17 to
   exactly 19 paths by adding only the two already tracked files
   `test/r4-gate-b-core/macos-core-adapter.test.ts` and
   `test/r4-gate-b-core/physical-runner.test.ts`. Permit only local imports,
   helpers, names and assertions required for the four lock-conflicted cases.
   Add no other Stage A or Stage B path; retain the prior 17-path authority and
   unchanged nine-path Stage B recording authority.
3. **Require exact successor fail-closed semantics.** Both tests must read and
   hash the current lock without writing, replacing, renaming or mocking it;
   pin the current `8173…` bytes and historical `d7a56…` script constants; and
   reject every other value. Core must accept only
   `CORE_PREFLIGHT_IMMUTABLE_HASH_DRIFT`. The three physical cases must use a
   dedicated exact predicate accepting only
   `PHYSICAL_IMMUTABLE_DRIFT:package-lock.json` with verdict `RED`, while
   retaining the construction-root absence, historical Yellow and zero-call
   assertions. Do not broaden the older post-output predicate.
4. **Do not rebind historical Gate-B.** Keep every Gate-B production script,
   schema, artifact index, evidence file, report, packet, review, decision and
   status document byte-identical. Do not add the successor lock to a Gate-B
   allowlist or verifier. Historical truth remains
   `CORE_REPOSITORY_REVIEWABLE_YELLOW` /
   `HOST_BINDING_INCOMPLETE_YELLOW`; Retry Execution and First Provider Call
   remain `NOT_REQUESTED`. The two successor-overlay test hashes must not be
   written into historical Gate-B evidence or indexes.
5. **Require an honest offline Green.** Require the current successor-worktree
   Gate-B Core candidate regression to pass exactly 145/145, with the four
   expected pre-effect lock denials included as passing assertions. Preserve
   the Addendum B focused, runner, typecheck, full offline, no-AI and diff
   lanes; freeze an exact 19-path Stage A; and require independent latest-byte
   review with zero Blocker and zero Important findings. This is candidate
   regression Green only, not Gate-B authority, readiness or physical Green.
6. **Preserve every effect ceiling and mandatory stop.** Permit no repository-
   command, package or source-control external network; Docker/daemon or OCI;
   PostgreSQL/database or SQL execution; product/data-plane network;
   production/runtime/route/Vault/HTTPS or real data; product/runtime
   Provider/model/email; deployment/publication/admission; merge/release or
   spend. Stop at the unchanged Addendum B Phase 1 result and require a later,
   separately approved Physical Rebind before any physical effect.

## Exact workset amendment

The implementation workset after approval is the existing Addendum B 17-path
Stage A plus exactly these two modifications:

1. `test/r4-gate-b-core/macos-core-adapter.test.ts`
2. `test/r4-gate-b-core/physical-runner.test.ts`

Both are existing tracked files. No production or runtime file is added. The
Stage B workset remains exactly nine paths and retains only its prior recording
authority. Addendum C and this Review are authority inputs, not Stage A or
Stage B artifacts.

## Effect ceiling

| Effect | Maximum after exact approval |
|---|---:|
| Repository command / package / source-control external network | `0` |
| Product/data-plane network | `0` |
| Docker CLI / daemon calls | `0 / 0` |
| OCI inspect / pull | `0 / 0` |
| PostgreSQL connections / database identities | `0 / 0` |
| SQL apply / verify / rollback | `0 / 0 / 0` |
| Production or remote database effects | `0` |
| Runtime / route / Vault / HTTPS / traffic activation | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Product/runtime Provider / model / email messages | `0` |
| Deployment / publication / admission | `0 / 0 / 0` |
| Gate C activation | `0` |
| Merge / release / spend | `0 / 0 / US$0` |

The Owner-directed Codex development/control channel is disclosed and excluded
from the scoped repository-command and product/runtime zero-effect claims. No
external source-control operation is authorized by this Review.

## Validation truth and required stop

Approval does not itself claim 145/145. That result may be recorded only after
the two exact test changes run successfully on the successor worktree. A need
to change a Gate-B script/schema/evidence byte, accept another hash or error,
touch an unlisted path or cause a physical effect is an immediate Owner stop.

The best permitted result remains:

`INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

At that stop, Docker, OCI, PostgreSQL, SQL and production authority remain
closed. Gate C readiness, #67 Done and R4 Done remain false. Merge, release and
spend remain forbidden.

## Approval mechanics

Do not approve from this short Review alone. The final approval request must
name:

- Addendum C SHA-256
  `6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d`;
- this Review's externally computed SHA-256;
- prior approved Addendum B wrapper HEAD/tree
  `1db7b30f38ca6322a3b0ad4be6d537af9cf781e8` /
  `1270bbc9beae9c446c83bbfc220e5906800890e3`;
- Addendum C proposal baseline HEAD/tree
  `ba61f7434071b759195fd3389b84092b96f3bb0c` /
  `091258d78908a1a2e99542e1a5b835e84b5d3512`;
- the externally supplied final wrapper HEAD/tree containing this Review; and
- explicit approval of the six choices, exact 19-path Stage A, unchanged
  nine-path Stage B, zero-effect ceilings and unchanged three-part stop.

Any changed Addendum or Review byte, lineage binding, test semantics, workset,
lock state, effect ceiling or stop requires a newly frozen request.
