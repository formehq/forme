# R4 #67 Image-Acquisition Replacement Authority — Construction Report

- Status: **`TECHNICAL_REVIEW_GREEN_STATUS_FREEZE_IN_PROGRESS`**
- Date: 2026-08-16
- User outcome: one V2-only replacement authority is constructed after the
  consumed V1 diagnostic stopped with Docker Desktop not running
- Docker / Registry / Pull / PostgreSQL / Production / Gate C effects:
  **`0 / 0 / 0 / 0 / 0 / 0`**

## Result

The repository now has a versioned replacement authority for the same bounded
image-acquisition diagnostic. V1 remains immutable consumed history. The V2
runner rejects V1 for new preparation, binds the exact V1 Card/Review/payload
and body-free failed-root evidence, uses distinct V2 grant/journal/evidence
filenames, and preserves the original Docker sequence and ceilings.

No Docker call was made during construction. The Owner's statement that Docker
Desktop is now running is context only; it is not represented as machine
evidence. A later physical V2 run must freshly capture the CLI/socket identities
and prove exact client/server version and platform at its first `version` call.

## Before and after

Before:

- V1 Card/Review were approved and consumed once;
- the lifecycle stopped at `version` with `COMPLETED / NONZERO / exit 1`;
- image inspect and pull counts were zero;
- all Docker resource, cleanup, PostgreSQL and SQL effects were zero;
- V1 could not honestly be reused or retried; and
- current status still described the diagnostic as not executed.

After:

- V1 is a fully bound prior attempt and is rejected as current authority;
- V2 owns new authority/grant/journal/receipt schemas and filenames;
- the physical sequence remains cached `version -> inspect`, or exact missing
  `version -> inspect -> one anonymous pull -> inspect`;
- Docker Desktop launch/restart/reconfiguration remains forbidden;
- repository and fake validation are Green; and
- physical V2 prepare/consumption still require the later exact V2 Card/Review
  Owner approval.

## Exact authority and topology

| Node | HEAD / tree | Exact delta |
|---|---|---|
| V1 Card | `23e4213d934076cc85e4cd16512bdcbc4f7a0483` / `f753b338132db899c9a4a3b7a274ac6c5a67931e` | historical add-only |
| V1 Review | `33fc039675bb990180cb37f85096f217cb523eea` / `8d58dd8e00a728b23f144a9a1263dbd0f3e68e87` | historical add-only |
| correction Addendum | `73ea8d2ab6ced3613756ac727433ed623b0fdb24` / `95d7c1150831bcc2288d80ee650cf8cc3e2b5e0b` | `1A` |
| correction Review | `56e8d29c9c29de0735667efb6be647d7cc1cd57b` / `8557cdc1780478c5cfe75261256c71a579234800` | `1A` |
| Kiar | `3db30607077a1c4fd2aeb87fcf8c9f6d7dfa31cf` / `9457a111e646ca869f403d3020986e5e8b63a63b` | `2M` |
| Liar | `3e1b0cbd5394a2e3452ecb2ef9c0081c72381d9f` / `9999efe25b0c79e8d388b86b82a57297f0ff2533` | `3A` |

The direct single-parent chain is V1 Review -> Addendum -> Review -> Kiar ->
Liar. Miar is the next direct child and freezes one report plus nine active
status surfaces. The complete construction is exactly 15 paths over three
commits: 11 modified and four added.

## Frozen hashes

| Artifact | SHA-256 |
|---|---|
| correction Addendum | `sha256:dd685d694d8ba6a4b14eca1202e3ee4710bf127242591fef0aec30af18d0033f` |
| correction Review | `sha256:62bf1aa8865202980a8ea2fe22e0ca40993aec43752f9f6b5acfa9d29e8cbcda` |
| Kiar runner | `sha256:b6a002c23fe5e7ce0a30bb7a21df488c0d5fbe3af46929325a99cf9f57f3e71d` |
| Kiar test | `sha256:26f8cd26b688cf0e9dc648cc91a1e66712d6630e952f591f31b2ed0b047eec92` |
| Kiar G2 | `sha256:2cca6a811e52df19942fc1b34ae38b66b12f8a5e548aa4defac39cb10159b2ae` |
| artifact index | `sha256:f37fd3adccb7b540aaa0ff180237d892b78c1e27f2c64d9686c3f0ff0577c8b3` |
| evidence schema | `sha256:7712430fed5f4feb6e8f53daf53b9aa11ba5046e2f625b2f865fed35880a6130` |
| machine evidence | `sha256:202e96b8d30a5f4e9e4074415388ddf73c133ceb9101733d8d36db61dc353f88` |
| Liar G3 | `sha256:fc167a02ce82f20fed05ffcf4b666dfc91eb5694553f3f6730c24c1b41c356db` |
| committed-Kiar audit | `sha256:1f154c0e67adcca225d36ad82839615d304485b857ff8f28d26f9b02e3b700e4` |
| committed-Liar audit | `sha256:9553ca01c635f4f9ea7842d15b3ab7b6871ee61c3528c11d22a6c08914b289c3` |

The report intentionally excludes its own SHA, Miar HEAD/tree/aggregate, the
future V2 Card/Review hashes and the future committed-Miar audit. Those are
computed only after their bytes exist and are not backfilled into this report.

## Immutable V1 failure

The V2 payload must bind:

- V1 Card/Review SHA
  `sha256:385f82e5ffd19745da495b5ed6e1f57e33020d5ed71df84ac591b2eb93880a72`
  / `sha256:8da2273700d37e588f943194d5a9c2e2d407ad4a75ac22ca3c3b5a58b449675c`;
- payload `sha256:fe44f267ac9663919a4e63ab075ed85a40bdf48b4128cdffaeed52fb107ec7ea`;
- root `/Users/zaynw/.forme-r4-image-acquisition-diagnostic-385f82e5`,
  device/inode `16777233 / 35611325`, uid `501`, mode `0700`;
- Owner receipt `sha256:63d8cc1fb12aeb0c6dd3d8927a8db90d3799fcb4fae9a598fb0b52d1be013b09`
  / 1086 bytes;
- consumed grant `sha256:76800f6b88c8e024d9ee3e527e3bf285c3163ae39360c903f698547b7cbbb7ba`
  / 5273 bytes;
- terminal evidence `sha256:d1364db823a82d44da0b36044a66538ba47ff5027980843ea65dc69e3dad4afd`
  / 6775 bytes; and
- journal 7 / `sha256:0b2f01174fd8ad418f77558db3acae420278e7afb8ea259d6a76fbbb8309b6aa`.

Construction read this body-free metadata once and changed zero bytes in the
root. The exact retained root remains historical forensic state.

## Validation evidence

| Lane | Result |
|---|---:|
| V2 focused deny-network | `6 / 6` |
| local PostgreSQL runner deny-network | `188 / 188` |
| focused non-runner Public Core | `85 / 85` |
| Public Core deny-network | `440 / 440` |
| complete R4 offline | `760 / 760` |
| Gate-B Core successor | `146 / 146` |
| repository spine | `45 / 45` |
| strict Ajv positive / hostile mutations | `1 / 14 rejected` |
| runner syntax / typecheck / no-AI / docs / diff | `Green` |

All physical diagnostic tests used injected fake adapters under the
deny-external-network loader. No test resolved the real Docker socket, called
the Docker CLI, contacted a registry, opened PostgreSQL or executed SQL.

## Data and permission impact

- durable repository changes: exactly the approved 15-path construction;
- body-bearing data persisted: none;
- V1 forensic root mutations: zero;
- dependency, lockfile and SQL changes: zero;
- new current authority: V2 repository contract only;
- Docker Desktop launch/restart/reconfiguration authority: none;
- physical prepare/consume authority: none until later exact Owner approval;
- Production, public traffic and Gate C authority: none.

## Runnable review path

```sh
node --import ./scripts/deny-external-network.mjs --test \
  --test-name-pattern='image-acquisition (replacement authority proposal|diagnostic)' \
  test/r4/public-core-local-postgres.test.ts
npm run test:r4:offline
npm run typecheck
```

This is a fake/offline review path only. The physical CLI remains closed until
the later V2 Card/Review approval.

## What the Owner should challenge

- whether V1 failure is represented without being rewritten as a daemon fact;
- whether a V2 run is truly separate from retry/reuse of the consumed grant;
- whether Docker Desktop remains externally managed;
- whether the one-pull and zero-resource ceilings are still exact; and
- whether any success wording overclaims PostgreSQL, Production or Gate C.

## Mandatory stop

After Miar committed-byte audit and V2 Card/Review construction:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_V2_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
