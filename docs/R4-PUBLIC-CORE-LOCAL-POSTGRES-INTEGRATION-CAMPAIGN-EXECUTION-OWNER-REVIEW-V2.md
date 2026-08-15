# R4 #67 Local PostgreSQL Integration Campaign — Execution Owner Review V2

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Execution Card V2 SHA-256:
  `sha256:1d96cfcf1cdef5131df1b0d150d0b99390ccb985389bc61fafedbc7591c21811`
- Card HEAD / tree:
  `56382c8a378e316b2e5a0a2cf2cf15ac6913d924` /
  `74798475a440acfd5ed342d9bab5928fa1e7f11e`
- Topology correction status HEAD / tree:
  `624437da7b5efb99dbd1347120b33d054447609d` /
  `57d732ecead6f0843b8528139e35614408daf13e`
- Status aggregate:
  `sha256:ceca443af7af415f00ab0ef8c7337916a9df7ce1fc159c72120b664b6d57edce`
- Committed status audit:
  `sha256:ab81bfb69aa0c062af95d8df43506b8ee671e1dc091334409f9a5dafd5f0cb44`
- Canonical authority payload:
  `sha256:ad67c1555bdbb0c1928fb377ad597ac56de9bfd93f2e2df0955c831a0e21a28f`
- Current campaign prepare / cleanup / Physical Execution authority: **NONE**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

This is the single Owner effect-decision surface produced by the approved V2
topology verifier correction. Kvt, Lvt and Mvt are already committed and
technically Green, and Card V2 is its exact add-only child. These Review bytes
perform no external effect. Only a later approval binding this Review's exact
committed SHA-256 and HEAD/tree may authorize prepare and execution.

## The decision in plain language

Approve one disposable local campaign that asks Docker only about the three
exact historical names. It may remove a leftover only when name and frozen
ownership label both match. It must prove all three names absent before
creating anything fresh. It may then run one pinned PostgreSQL rehearsal and
must clean up everything it owns. Any uncertainty, foreign state, mismatch or
cleanup block stops and returns to the Owner; there is no retry.

## Nine choices to approve together

1. **One outcome envelope:** one prepare plus the same binding's one campaign
   consumption; no intermediate prompt inside that campaign.
2. **Complete V2 topology:** require the exact full historical prefix and the
   direct Kvt → Lvt → Mvt → Card V2 → Review V2 chain before grant creation.
3. **Closed versioned authority:** accept only campaign v2
   grant/journal/receipt and reject every old, failed, consumed or mismatched
   authority.
4. **Body-free exact ownership:** observe only bounded Docker metadata and
   stop/remove only exact historical names with the frozen label.
5. **Absence before physical construction:** no fresh stack, PostgreSQL
   connection or SQL until container, network and volume absence is durable.
6. **Frozen local rehearsal:** pinned image/platform, loopback boundary,
   PostgreSQL `160010`, catalog `14 / 207 / 172 / 44`, schema `3 / 3 / 1`, one
   restart and `23 / 20` action contract.
7. **One-use write-ahead/no retry:** each effect attempt is durably reserved;
   at most one diagnostic, one historical cleanup, one construction, one
   anonymous image pull and two cleanup-only physical recoveries.
8. **Exact terminal closure:** Green requires complete observed behavior and
   zero owned Docker/PostgreSQL/credential/runtime/coordinator residue;
   cleanup-blocked requires fresh Owner authority.
9. **No product expansion:** production, Room/Guest/publication, Provider,
   messaging, traffic, deployment, release, spend and Gate C remain zero.

## What one later approval would authorize

- prepare exactly one pending Integration Campaign v2 grant with a fresh
  grant ID, fresh local Docker CLI/socket identities and lifetime at most 24h;
- consume that grant exactly once;
- call only the diagnostic and physical Docker kinds within Card ceilings;
- conditionally remove only exact-owned historical resources and prove absence;
- perform one fresh disposable local PostgreSQL rehearsal within the frozen
  Pool, connection, database, SQL, catalog, action and restart ceilings; and
- perform exact-owned cleanup and freeze body-free terminal evidence.

No result authorizes a second campaign, repair, retry, production action or
Gate C transition.

## What remains unauthorized

Until exact approval, there may be no campaign prepare, forensic-root read or
mutation, Docker CLI/socket/daemon/OCI call, cleanup, PostgreSQL
process/connection/database/SQL action, runtime traffic, production mutation,
Provider/model call, Guest/Room/publication action, external message, deploy,
release or spend.

Approval would not make #67 or R4 Done. A local Green result closes only Local
PostgreSQL Wiring Technical Review. Production still requires Gate C, and MVP
completion still requires a bounded real encounter plus Owner Experience
Acceptance.

## Exact ceiling summary

- campaign prepare / consumption: `1 / 1`
- diagnostic / historical cleanup / physical construction: `1 / 1 / 1`
- physical cleanup-only recoveries: `2`
- anonymous exact-image pull: `1`
- diagnostic Docker: `version=1`, inspect each resource `<=2`, exact-owned
  stop/remove `<=1`, every image/create/start/unlisted kind `0`
- physical Docker: the exact Card vector, including `version=3`,
  `image.inspect=2`, `image.pull=1`, and one create of each fresh resource
- database identities `2`; concurrency `1 / 1 / 1`; readiness `60 / 60`;
  Pools `4 / 124`; connections `124`; schema `3 / 3 / 1`; actions `23 / 20`;
  restart `1`; admin database create `1`

Every ceiling is a maximum, not a quota. Failure or ambiguity consumes the
write-ahead budget and cannot be retried.

## Expected stops

Successful complete rehearsal and cleanup:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Any diagnostic, cleanup, host, clock, ceiling, PostgreSQL, catalog or residue
failure:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_FAILED / OWNER_REVIEW_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Before exact physical approval, the current stop remains:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V2_TOPOLOGY_VERIFIER_CORRECTION_TECHNICAL_REVIEW_GREEN / PHYSICAL_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

## Exact approval bindings

A later approval must name the full SHA-256 and HEAD/tree of this Review once
committed, plus:

- Card V2 `sha256:1d96cfcf1cdef5131df1b0d150d0b99390ccb985389bc61fafedbc7591c21811`,
  HEAD/tree `56382c8a378e316b2e5a0a2cf2cf15ac6913d924` /
  `74798475a440acfd5ed342d9bab5928fa1e7f11e`;
- Mvt HEAD/tree `624437da7b5efb99dbd1347120b33d054447609d` /
  `57d732ecead6f0843b8528139e35614408daf13e`;
- G10t `sha256:ceca443af7af415f00ab0ef8c7337916a9df7ce1fc159c72120b664b6d57edce`;
- committed-Mvt audit
  `sha256:ab81bfb69aa0c062af95d8df43506b8ee671e1dc091334409f9a5dafd5f0cb44`;
  and
- canonical payload
  `sha256:ad67c1555bdbb0c1928fb377ad597ac56de9bfd93f2e2df0955c831a0e21a28f`.

The approval must accept all nine choices and may authorize exactly one
campaign prepare and the same binding's one consumption/lifecycle, at most one
anonymous pull, and all closed write-ahead/no-retry/exact-cleanup ceilings. It
must state Production **NOT_REQUESTED** and Gate C **NOT_REQUESTED**.
