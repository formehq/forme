# R4 #67 Integration Campaign — Image-Acquisition Replacement Authority Correction Addendum

- Status: **`OWNER_OUTCOME_ENVELOPE_CONFIRMED_REPOSITORY_CONSTRUCTION_ONLY`**
- Date: 2026-08-16
- User-visible outcome: replace the consumed V1 diagnostic authority with one
  versioned V2 authority that can run only after a later exact Owner approval
- Correction Construction: **APPROVED_BY_OWNER_OUTCOME_ENVELOPE**
- Replacement Diagnostic / Docker / Registry / Image Pull:
  **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup / PostgreSQL / SQL: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

## Why this correction exists

The approved Image-Acquisition Diagnostic V1 was prepared and consumed once.
It stopped at its first `version` call with a body-free `NONZERO` observation.
It made no image inspect or pull call and produced no Docker resource,
PostgreSQL, SQL, product, Production or Gate C effect. The Owner later stated
that Docker Desktop had not been started for that attempt and is now started.

That human statement explains the operational precondition but does not alter
the committed evidence, prove the current daemon state, restore the consumed
grant or authorize a retry. V1 remains immutable consumed history. A new run
therefore needs a new versioned authority path, not reuse of V1 bytes or its
forensic root.

This Addendum authorizes repository construction only. It does not start or
restart Docker Desktop, probe the current socket, call Docker, contact a
registry, pull an image or run PostgreSQL. The future V2 lifecycle must still
prove the exact Docker client/server/platform contract itself.

## Immutable V1 terminal truth

| Binding | Exact value |
|---|---|
| V1 Card SHA / HEAD / tree | `sha256:385f82e5ffd19745da495b5ed6e1f57e33020d5ed71df84ac591b2eb93880a72` / `23e4213d934076cc85e4cd16512bdcbc4f7a0483` / `f753b338132db899c9a4a3b7a274ac6c5a67931e` |
| V1 Review SHA / HEAD / tree | `sha256:8da2273700d37e588f943194d5a9c2e2d407ad4a75ac22ca3c3b5a58b449675c` / `33fc039675bb990180cb37f85096f217cb523eea` / `8d58dd8e00a728b23f144a9a1263dbd0f3e68e87` |
| V1 canonical payload | `sha256:fe44f267ac9663919a4e63ab075ed85a40bdf48b4128cdffaeed52fb107ec7ea` |
| retained root | `/Users/zaynw/.forme-r4-image-acquisition-diagnostic-385f82e5` |
| root device / inode / uid / mode | `16777233 / 35611325 / 501 / 0700` |
| Owner receipt SHA / bytes | `sha256:63d8cc1fb12aeb0c6dd3d8927a8db90d3799fcb4fae9a598fb0b52d1be013b09 / 1086` |
| consumed grant SHA / bytes | `sha256:76800f6b88c8e024d9ee3e527e3bf285c3163ae39360c903f698547b7cbbb7ba / 5273` |
| terminal evidence SHA / bytes | `sha256:d1364db823a82d44da0b36044a66538ba47ff5027980843ea65dc69e3dad4afd / 6775` |
| journal entries / head | `7 / sha256:0b2f01174fd8ad418f77558db3acae420278e7afb8ea259d6a76fbbb8309b6aa` |
| terminal status / code | `FAILED / local_postgres_image_acquisition_diagnostic_failed` |
| version observation | `COMPLETED / NONZERO / exit 1` |
| Docker calls | `version 1; image.inspect 0; image.pull 0; every resource kind 0` |
| wider effects / local residue | `0 / 0` |

The retained entries are exactly the consumed grant, terminal evidence,
journal directory and Owner approval receipt. Construction may bind the
body-free metadata above but may not mutate, delete, reuse or reinterpret the
root. The Owner's later explanation is recorded as context, not substituted
for the terminal evidence.

## Nine construction choices

The confirmed outcome envelope accepts all nine choices together:

1. **Treat V1 as consumed history.** V1 is not reopened, retried, repaired or
   reclassified. Its root and four retained entries stay immutable.
2. **Create a V2 authority family.** The runner accepts only V2 authority,
   grant, journal and receipt schemas and rejects V1 for new prepare or
   consumption. V2 binds the full V1 Card/Review/payload/root/grant/evidence/
   journal truth above.
3. **Preserve the physical sequence.** V2 changes authority topology, not the
   Docker plan: `version -> inspect -> stop` when cached, or
   `version -> inspect -> one anonymous exact pull -> inspect -> stop` when
   exactly missing. No extra probe, retry or fallback is added.
4. **Keep the host precondition explicit.** Docker Desktop must already be
   running. The agent may not start, restart, upgrade, log in to or reconfigure
   it. A later V2 run freshly captures CLI/socket identities and verifies exact
   client/server `29.3.1` and `linux/arm64` at the first call.
5. **Construct an exact two-path implementation commit.** `Kiar` modifies only
   the runner and its focused test. It adds the V1-to-V2 lineage, prior-attempt
   binding, V1 rejection and V2 fake/deny-network coverage. It changes no SQL,
   dependency, lockfile or product behavior.
6. **Freeze exact machine evidence.** `Liar`, the direct child of `Kiar`, adds
   only a strict artifact index, strict JSON Schema and machine evidence. It
   records construction/static truth only; Docker, registry, image cache and
   target PostgreSQL remain unobserved.
7. **Reconcile the current status once.** `Miar`, the direct child of `Liar`,
   adds one construction report and modifies the nine active status surfaces.
   Historical V1 and earlier documents remain byte-frozen.
8. **Require independent committed-byte review.** Focused/full offline tests,
   typecheck, strict Ajv, hostile mutation, exact Git topology, diff and docs
   checks must be Green. Construction effect audit must remain zero for
   Docker/socket/registry/pull/PostgreSQL/SQL/network/Production/Gate C.
9. **Stop before physical authority.** After committed `Miar` audit, construct
   one add-only V2 Card and one direct-child V2 Owner Review. Neither document
   creates a grant. A later exact Owner approval is still required before one
   fresh V2 prepare and lifecycle.

## Exact construction topology and workset

The required direct, single-parent chain is:

`V1 Review -> Addendum -> Addendum Review -> Kiar -> Liar -> Miar -> V2 Card -> V2 Review`

`Kiar` modifies exactly two paths:

- `scripts/r4-public-core-local-postgres.mjs`
- `test/r4/public-core-local-postgres.test.ts`

`Liar` adds exactly three paths:

- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-replacement-artifact-index.json`
- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-replacement-evidence.schema.json`
- `docs/evidence/r4-public-core-local-postgres-integration-campaign-image-acquisition-replacement.json`

`Miar` adds one report and modifies nine current-status surfaces:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-CONSTRUCTION-REPORT.md`
- `README.md`
- `docs/CONTROL.md`
- `docs/DECISIONS.md`
- `docs/NATIVE-HARNESS-ARCHITECTURE.md`
- `docs/PRODUCT.md`
- `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/VALIDATION.md`

The construction workset is exactly 15 distinct paths across three commits:
11 modified and four added. The later authority documents are separate add-only
commits:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V2.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V2.md`

## V2 contract floor

The V2 payload must bind the correction Addendum/Review, committed
`Kiar/Liar/Miar`, their aggregates and machine artifacts, and every immutable
V1 terminal value above. Dynamic slots are limited to the external Owner
approval receipt hash, fresh canonical root, grant ID, fresh CLI/socket
identities and timestamps with positive lifetime no greater than 24 hours.

V2 filenames are versioned and cannot collide with V1:

- `image-acquisition-diagnostic-v2.pending.json`
- `image-acquisition-diagnostic-v2.consumed.json`
- `image-acquisition-diagnostic-journal-v2`
- `image-acquisition-diagnostic-evidence-v2.json`

The V2 Docker ceilings remain exact:

| kind | maximum |
|---|---:|
| `version` | 1 |
| `image.inspect` | 2 |
| `image.pull` | 1 |
| every container/network/volume kind | 0 |

Maximum prepare attempts, consumptions and diagnostic lifecycles are each one.
Every Docker call is write-ahead. Nonzero, timeout, signal, malformed output,
identity drift, crash or ambiguity consumes its budget and stops. There is no
retry, fallback tag, alternate registry, credential, login, prune, image
remove, cleanup, PostgreSQL, SQL or continuation into the campaign.

## Construction validation and evidence

Technical Review must prove:

- exact V1 Review -> Addendum -> Review -> Kiar -> Liar -> Miar lineage;
- exact 2 / 3 / 10 deltas and 15-path union;
- committed blob hashes and framed aggregates;
- V2 exact-key schemas, V1 rejection, one-use consume and write-ahead journal;
- exact V1 failure binding and forbidden old-root mutation;
- unchanged cached and one-pull Docker plans and zero resource ceilings;
- prepare/fake tests make zero real Docker/socket/registry/PostgreSQL/SQL call;
- focused, complete R4 offline, Gate-B serial, repository spine, typecheck,
  strict Ajv, docs audit and diff check Green; and
- all repository-construction external effects zero.

Passing these checks is Technical Review only. It does not claim the Docker
daemon is currently reachable, the image exists, the pull succeeds, the
manifest is corrected, PostgreSQL is observed, Production is ready or Gate C
is approved.

## Zero effects of these bytes

| Effect | Actual / authorized now |
|---|---:|
| proposal paths / commits | `1 / 1` |
| runner/test/evidence/status construction | `0` |
| V2 Card/Review | `0` |
| V1 root read / mutation | `body-free metadata already observed / 0` |
| grant prepare / consume / lifecycle | `0 / 0 / 0` |
| Docker CLI / socket / daemon / registry / pull | `0 / 0 / 0 / 0 / 0` |
| cleanup / PostgreSQL / SQL / product network | `0 / 0 / 0 / 0` |
| Production / Gate C | `0 / 0` |
| push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

## Mandatory stops

Before repository construction review:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_CORRECTION_PROPOSAL_READY / CORRECTION_CONSTRUCTION_IN_PROGRESS / PHYSICAL_EXECUTION_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After independently audited `Miar` and committed V2 Card/Review:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_V2_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
