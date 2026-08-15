# R4 #67 Local PostgreSQL Integration Campaign — Execution Owner Review V1

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Execution Card V1 SHA-256:
  `sha256:c44e629b62593d7f80ba24a2efd920ebaacb611fdd99975c2912e4ae0c0e4c34`
- Card HEAD / tree:
  `d05faf0b39e35dff795d19ab3661929055e6bbb5` /
  `68c1f27c443df9c3cdeccf861d2f9400e31a21dd`
- Construction status HEAD / tree:
  `4c1273cce6568d638d547d4bb6b4866198f8db90` /
  `1f3b7c187e69d5906b3871d962758e68a77b8338`
- Construction status aggregate:
  `sha256:7c973688d036b5504ecc6eefdf71593a37961b41cab30a439f43ce7d33a30b81`
- Committed construction-status audit:
  `sha256:af2f0cce1b3b10348c1606404652b894a8317eeab89cd2e8686fb5e6c0e1e4f6`
- Canonical authority payload:
  `sha256:4e4a427a281be934e3a07858f842a7bf06e9fe7180c715ff864543f0dc5aa749`
- Current diagnostic / cleanup / Physical Execution authority: **NONE**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This is the single Owner decision surface promised by the approved Integration
Campaign repository construction. The implementation, machine evidence and
current-status freeze are already committed and technically Green. These Review
bytes still perform no external effect. Only a later approval that binds this
Review's committed SHA-256 and HEAD/tree can authorize prepare and execution.

## The decision in plain language

Approve one disposable local campaign that first asks Docker only what exists
under the three exact historical names. It may remove a leftover only when both
the exact name and frozen ownership label match. It must prove all three names
absent before creating anything fresh. It may then run one pinned PostgreSQL
rehearsal and must clean up everything it owns. Any uncertainty, foreign state,
mismatch or cleanup block stops and comes back to the Owner; there is no retry.

## Nine choices to approve together

1. **One outcome envelope:** one prepare plus the same binding's one campaign
   consumption; no intermediate prompt inside that campaign.
2. **Closed versioned authority:** accept only campaign grant/journal/receipt
   v1 and reject every older, failed, consumed or mismatched authority.
3. **Body-free diagnostic:** observe only bounded Docker version and exact-name
   resource shape, ownership/classification and hashes; no body or logs.
4. **Exact-owned cleanup:** stop/remove only exact historical names with the
   frozen label; foreign, unlabelled, malformed or ambiguous state stops.
5. **Absence-before-physical:** no fresh stack, PostgreSQL connection or SQL is
   allowed until container, network and volume absence are durably proven.
6. **Frozen local rehearsal:** preserve the pinned image/platform, loopback
   boundary, PostgreSQL `160010`, catalog `14 / 207 / 172 / 44`, schema
   `3 / 3 / 1`, one restart and `23 / 20` action contract.
7. **One-use write-ahead/no retry:** every effect attempt is durably reserved;
   at most one diagnostic, one historical cleanup, one construction, one
   anonymous image pull and two cleanup-only physical recoveries.
8. **Exact terminal closure:** Green requires complete observed behavior and
   zero owned Docker/PostgreSQL/credential/runtime/coordinator residue;
   cleanup-blocked requires fresh Owner authority.
9. **No product expansion:** production, Room/Guest/publication, Provider,
   messaging, traffic, deploy, release, spend and Gate C remain zero.

## What one approval would authorize

After the exact approval receipt is created, the runner may:

- prepare exactly one pending Integration Campaign grant with a fresh grant ID,
  fresh local Docker CLI/socket identities and a lifetime of at most 24 hours;
- consume that grant exactly once;
- call only the diagnostic and physical Docker command kinds within the exact
  Card ceilings;
- conditionally remove only exact-owned historical resources and prove their
  absence;
- perform one fresh disposable local PostgreSQL rehearsal within the frozen
  Pool, connection, database, SQL, catalog, action and restart ceilings; and
- perform exact-owned cleanup and freeze body-free terminal evidence.

No successful or failed result authorizes a second campaign, repair, retry,
production action or Gate C transition.

## What remains unauthorized

Until the exact approval is given, there may be no campaign prepare, forensic
root read or mutation, Docker CLI/socket/daemon/OCI call, cleanup, PostgreSQL
process/connection/database/SQL action, runtime traffic, production mutation,
Provider/model call, Guest/Room/publication action, external message, deploy,
release or spend.

Approval also does not make #67 or R4 Done. A local Green result closes only
the Local PostgreSQL Wiring Technical Review. Production still requires Gate C,
and MVP completion still requires a bounded real encounter plus Owner
Experience Acceptance.

## Exact effect ceiling summary

- campaign prepare / consumption: `1 / 1`
- diagnostic / historical cleanup / physical construction: `1 / 1 / 1`
- physical cleanup-only recoveries: `2`
- anonymous exact-image pull: `1`
- diagnostic Docker calls: `version=1`, inspect each kind `<=2`, exact-owned
  stop/remove `<=1`, every image/create/start/unlisted kind `0`
- fresh physical Docker calls: exact Card vector, including `version=3`,
  `image.inspect=2`, `image.pull=1`, one create of each resource and no unlisted
  kind
- database identities `2`; concurrency `1 / 1 / 1`; readiness `60 / 60`;
  Pools `4 / 124`; connections `124`; schema `3 / 3 / 1`; actions `23 / 20`;
  restart `1`; admin database create `1`

Every ceiling is a maximum, not a quota to spend. Failure or ambiguity consumes
the applicable write-ahead budget and cannot be retried.

## Expected stops

Successful complete rehearsal and cleanup:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Any diagnostic, cleanup, host, clock, ceiling, PostgreSQL, catalog or residue
failure:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_FAILED / OWNER_REVIEW_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Before exact Owner approval, the current stop remains:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_LOCAL_INTEGRATION_CAMPAIGN_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

## Exact approval wording

Approve only if all nine choices are accepted. The approval must name the full
SHA-256 and HEAD/tree of this Review once committed, in addition to these fixed
bindings:

- Card V1 `sha256:c44e629b62593d7f80ba24a2efd920ebaacb611fdd99975c2912e4ae0c0e4c34`,
  HEAD/tree `d05faf0b39e35dff795d19ab3661929055e6bbb5` /
  `68c1f27c443df9c3cdeccf861d2f9400e31a21dd`;
- Mi HEAD/tree `4c1273cce6568d638d547d4bb6b4866198f8db90` /
  `1f3b7c187e69d5906b3871d962758e68a77b8338`;
- G10 `sha256:7c973688d036b5504ecc6eefdf71593a37961b41cab30a439f43ce7d33a30b81`;
- committed-Mi audit
  `sha256:af2f0cce1b3b10348c1606404652b894a8317eeab89cd2e8686fb5e6c0e1e4f6`;
  and
- canonical payload
  `sha256:4e4a427a281be934e3a07858f842a7bf06e9fe7180c715ff864543f0dc5aa749`.

The approval should authorize exactly one campaign prepare and the same
binding's one consumption/lifecycle, accept at most one anonymous pull and all
closed write-ahead/no-retry/exact-cleanup ceilings, and state explicitly:
Production **NOT_REQUESTED**; Gate C **NOT_REQUESTED**.
