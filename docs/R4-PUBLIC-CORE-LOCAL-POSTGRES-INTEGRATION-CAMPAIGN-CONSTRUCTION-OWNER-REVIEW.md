# R4 #67 Local PostgreSQL Integration Campaign — Construction Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-14
- Construction Packet SHA-256:
  `sha256:1bfcb75483b359d335812b573b42e3eac0ce669c734295248f2447daf5262d50`
- Packet HEAD / tree:
  `1f5b9476d891d348161d4a43d918b53873a809e2` /
  `3f42dc6707d2438bd3ad92e17de938210027c80e`
- Packet parent HEAD / tree:
  `1e46cb589e7cdebb1566d28bbdd6e13cd4066946` /
  `a7bd77c67bb5b002cbcf6c56495e1b24fba09262`
- Replacement Diagnostic: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Physical Execution: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This is the Owner's low-load decision surface for the repository construction
envelope. It does not create an effect grant. Approval lets the agent build and
audit the campaign inside the exact 15-path/three-commit workset without
returning for intermediate implementation or hash approvals. The completed
implementation must still produce one final versioned Execution Card/Review
and return for one separate effect approval before any forensic-root read,
Docker/socket call, cleanup or PostgreSQL activity.

## What changes for the Owner

Today, progress is stopped before a replacement diagnostic. Under the proposed
construction, the next effect decision will be one coherent question:

> May one local-only, one-use campaign diagnose the exact historical resource
> names, remove only exact-owned leftovers if needed, and—only after proving a
> clean host—run one disposable PostgreSQL rehearsal, with no retry and exact
> cleanup?

The Owner will not be asked to approve the implementation commit, evidence
commit and status commit separately. The Owner still controls the later
external effect and every production/public gate.

## Nine choices to approve together

1. **Outcome envelope:** approve repository construction from campaign runner
   through tests, machine evidence, status reconciliation and three commits.
2. **One campaign state machine:** introduce a new closed grant/journal/receipt
   family; reject reuse of all consumed or failed V1/V2 authorities.
3. **Body-free diagnostic:** future observation is limited to Docker version
   plus exact-name container/network/volume inspection and bounded
   hashes/shape/classification facts.
4. **Ownership-gated cleanup:** only a resource whose exact name and frozen
   historical grant label both match may be stopped or removed. Foreign,
   unlabelled, malformed or ambiguous results stop.
5. **Absence-before-physical:** all three historical resource names must be
   durably proven absent before any fresh stack is created.
6. **Frozen physical semantics:** preserve the pinned image/platform,
   loopback-only stack, PostgreSQL `160010`, catalog `14 / 207 / 172 / 44`,
   `3 / 3 / 1` schema sequence, one restart and `23 / 20` action contract.
7. **One-use write-ahead:** one future consumption, one diagnostic, at most one
   historical cleanup, one physical construction and at most two cleanup-only
   physical recoveries; failure consumes budget and cannot retry.
8. **Exact terminal closure:** Green requires zero owned runtime/resource/
   credential/coordinator residue; cleanup-blocked returns for new rescue
   authority.
9. **Product gates remain closed:** production, Room/publication/Curator/Guest,
   Provider/model/email, traffic, deployment, release, spend and Gate C remain
   zero.

## Exact construction workset

Approval authorizes exactly three direct, single-parent commits after this
Review:

| Commit | Paths | Delta |
|---|---|---:|
| `Ki` implementation | runner + runner test | `2M` |
| `Li` machine evidence | campaign index + strict schema + evidence | `3A` |
| `Mi` status freeze | report + nine current status surfaces | `1A / 9M` |

Total: 15 paths, `4A / 11M / 0D / 0R`, no mode change. The exact paths are
enumerated in the Packet. Dependencies, lockfile, SQL and every historical
authority/evidence byte remain unchanged.

The future effect proposal is limited to two later add-only paths:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-CARD-V1.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-OWNER-REVIEW-V1.md`

Those future files are not authorized to execute anything by this approval.

## Future effect shape being constructed

The construction must encode these phase rules:

```text
diagnose exact container/network/volume names
  ├─ all MISSING ──────────────────────────────┐
  ├─ exact OWNED → remove exact-owned → absent┤
  └─ foreign/unlabelled/malformed/ambiguous → STOP
                                               ↓
                              one fresh disposable PostgreSQL rehearsal
                                               ↓
                          GREEN + zero residue, or exact failed-closed STOP
```

The diagnostic/historical-cleanup Docker maxima are: `version=1`, each inspect
`<=2`, each exact historical remove `<=1`, container stop `<=1`, and every
image/create/start/unlisted call `0`.

The fresh physical maxima remain the frozen V2 values: `version=3`,
`image.inspect=2`, `image.pull=1`, `container.inspect=8`,
`container.create=1`, `container.start=2`, `container.stop=4`,
`container.rm=3`, `network.inspect=7`, `network.create=1`, `network.rm=3`,
`volume.inspect=7`, `volume.create=1`, `volume.rm=3`.

These are design ceilings for fake-tested construction, not current effect
authority.

## What approval does not mean

Approval does not:

- retry the failed V1 diagnostic prepare or either consumed grant;
- read or mutate the three forensic roots;
- resolve the Docker socket or call Docker;
- stop/remove/create/start a Docker resource or pull an image;
- start PostgreSQL, connect, create databases or run SQL;
- modify dependencies, lockfile, SQL or production/runtime code outside the
  exact runner workset;
- push, create/update a PR, merge, deploy, publish, admit a Guest, send a
  message, call a Provider, release or spend; or
- make Gate C, #67 or R4 ready or Done.

## What to challenge

Challenge this proposal if any of these are wrong:

1. A found resource should always return for another Owner decision even when
   its exact name and historical grant label prove it is campaign-owned.
2. Diagnostic, conditional cleanup and physical rehearsal are too much to bind
   under one later one-use authority.
3. The exact-owned cleanup ceilings are too broad or too narrow.
4. A Green PostgreSQL rehearsal should not be the campaign's local Technical
   Review exit.
5. The Owner wants to review intermediate implementation commits despite the
   new outcome-envelope workflow.

Absent one of those objections, the Packet's recommended choices are the
minimum coherent way to advance locally without weakening the effect boundary.

## Approval wording

A sufficient approval may be conversational rather than a long hash recital:

> Approve the Local PostgreSQL Integration Campaign Construction outcome
> envelope and all nine choices in the committed Packet/Review. Authorize the
> exact 15-path, three-commit repository construction only. Replacement
> diagnostic, cleanup, Physical Execution, production and Gate C remain not
> requested; return once with the final Execution Card/Review before effects.

The execution tooling will later bind the exact committed Packet/Review hashes
and final construction hashes; this conversational approval does not waive
those machine checks.

## Mandatory stop

Before approval:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_OWNER_APPROVAL_REQUIRED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After approved construction reaches independent Technical Review Green:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_LOCAL_INTEGRATION_CAMPAIGN_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Do not begin `Ki` or any external effect from these Review bytes alone. The
Owner's explicit approval message is still required.
