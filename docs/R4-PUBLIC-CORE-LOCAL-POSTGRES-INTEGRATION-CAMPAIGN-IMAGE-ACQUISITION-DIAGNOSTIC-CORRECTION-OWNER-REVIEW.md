# R4 #67 Image-Acquisition Diagnostic Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Construction effect: repository only
- Docker / registry / image pull: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup / PostgreSQL / SQL: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

## What you are deciding

The consumed Image-Manifest Diagnostic proved the local Docker host identity
and classified the exact pinned PostgreSQL image as `IMAGE_MISSING`. It used
one `version` and one `image.inspect`, made no pull or wider effect, and closed
with body-free evidence.

This Review asks for one repository-only construction outcome: build and audit
a separate one-use image-acquisition diagnostic whose later physical Card may
inspect the exact image, anonymously pull it at most once only if absent,
inspect once afterward, freeze the body-free manifest tuple and stop. This
approval does not run that diagnostic or authorize network/cache effects.

The complete proposal is the
[Image-Acquisition Diagnostic Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CORRECTION-ADDENDUM.md).

## Exact proposal binding

| Binding | Exact value |
|---|---|
| Addendum SHA | `sha256:592f9e2fdb080a3f9605937251943afd2fb2f822c2871b04ae9d13c581d35b6e` |
| Addendum HEAD / tree | `2fe84edd9d188f35b02b226fa32ce94f5576f8de` / `5d6fb3334608ba7032aee45646b868d88ccbd1be` |
| Addendum parent HEAD / tree | `b4aae98488e934d921c1deb5c526286c49d22503` / `72ffc8ce9c19058894864846f5705d1234d7ced8` |
| Addendum delta | exactly one added mode-`100644` document |
| predecessor Card SHA / HEAD / tree | `sha256:f0a0bf2dbe00e6a1ba2f49b6e2b58898136402e685c3cd0afe8a55883b26fdb8` / `6a040deb80dc9c22d131bcf6bb0d2eadbdca7d81` / `9774d6dab1af9bd8acea760f8b10e406bef46303` |
| predecessor Review SHA / HEAD / tree | `sha256:73e6b30cbec9e5abbd52a1bdddf893bf89065c77381b1c6346d903d24ff77c66` / `b4aae98488e934d921c1deb5c526286c49d22503` / `72ffc8ce9c19058894864846f5705d1234d7ced8` |
| consumed grant | `sha256:f497fc8ed003aebf42d975494730f184ba1f93355b6474ff7c3526e2d2533a22` / `4401` bytes |
| terminal evidence | `sha256:e149627976e1f2bf1927dbcec25a82e545f8d892d2b5865e288d6941dcbb9ad7` / `6639` bytes |
| terminal journal | `10` / `sha256:b9dcfb5134225497d8efc546f3ad7749ee931f29cf2db8e162037832af9a6a86` |
| terminal result | `FAILED / IMAGE_MISSING`; version and first inspect each attempted/completed once |
| wider effects | pull/resource/cleanup/PostgreSQL/SQL all zero |

The proposal is a direct child of the consumed diagnostic Review and adds no
runner, test, schema, dependency, authority or status claim. The forensic root
`/Users/zaynw/.forme-r4-image-manifest-diagnostic-f0a0bf2d` remains immutable,
consumed and outside the proposed construction workset.

## Nine choices

Please accept or reject these as one decision:

1. **Preserve the consumed diagnostic truth.** Bind the exact predecessor
   Card/Review, payload, forensic root, grant, evidence and journal. Never
   reuse, mutate, delete or reinterpret that consumed authority.
2. **Acquire only the exact pinned identity.** Permit no future tag, fallback,
   alternate registry or digest substitution: only
   `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
   on `linux/arm64` is admissible.
3. **Construct one fresh one-use authority family.** Fix one prepare, one
   consumption, one lifecycle, no retry and no campaign/diagnostic-grant reuse;
   dynamic grant lifetime must be positive and no longer than 24 hours.
4. **Fix one conditional Docker sequence.** Allow future ceilings of
   `version <= 1`, pre/post `image.inspect <= 2`, and anonymous
   `image.pull <= 1` only after exact `IMAGE_MISSING`; every
   container/network/volume kind remains zero.
5. **Keep credentials and network narrow.** Require a fresh 0700 HOME and
   DOCKER_CONFIG with exact `{\"auths\":{}}`, cleared ambient proxy/helper
   variables, no login/credentials, and only Docker-mediated network for the
   one exact pull.
6. **Retain body-free facts only.** Persist bounded byte counts/hashes,
   UTF-8/line-shape facts, closed outcomes, cache-before/cache-after state and
   the allowlisted descriptor tuple—never pull progress, raw Docker/registry
   bodies, headers, tokens, credentials or arbitrary fields.
7. **Make cache residue honest.** Allow only the exact pulled image cache, or
   partial/unknown Docker-managed cache residue after ambiguity; forbid image
   remove/prune/cleanup and require closed residue classifications.
8. **Require write-ahead and no retry.** Reserve every Docker effect before
   invocation. Nonzero exit, timeout, signal, crash, malformed body, host drift
   or ambiguity consumes its budget and stops without replay or repair.
9. **Do not auto-correct or continue.** The result cannot change the manifest
   pin/rule, prepare another campaign, create/clean resources, reach PostgreSQL
   or SQL, affect product runtime, activate Production or enter Gate C. Even a
   successful tuple returns to the Owner.

## Exact repository construction envelope

Approval authorizes exactly `Kiad -> Liad -> Miad` as direct single-parent
commits:

- Kiad: two modified paths — runner and its focused test;
- Liad: three added paths — artifact index, strict evidence schema and machine
  evidence;
- Miad: one added construction report plus nine modified current-status
  surfaces.

Total: **15 paths = 11 modified + 4 added**, exactly three commits. No
dependency, lockfile, SQL, production schema, mode, forensic-root or sixteenth
path may change.

### Kiad — two modified

- `scripts/r4-public-core-local-postgres.mjs`
- `test/r4/public-core-local-postgres.test.ts`

### Liad — three added

- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-diagnostic-artifact-index.json`
- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-diagnostic-evidence.schema.json`
- `docs/evidence/r4-public-core-local-postgres-integration-campaign-image-acquisition-diagnostic.json`

### Miad — one added plus nine modified

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CONSTRUCTION-REPORT.md` (added)
- `README.md`
- `docs/CONTROL.md`
- `docs/DECISIONS.md`
- `docs/NATIVE-HARNESS-ARCHITECTURE.md`
- `docs/PRODUCT.md`
- `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/VALIDATION.md`

After committed Miad audit is Green, the same repository-only authority may
construct and audit exactly two direct add-only proposal commits:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V1.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V1.md`

Those later proposal bytes still authorize no Docker or network effect.

## Effect ceiling during construction

| Effect | Ceiling |
|---|---:|
| tracked paths | exact 15-path construction plus two later proposal docs |
| commits | Kiad / Liad / Miad, then Card-only / Review-only |
| forensic-root reads / writes | 0 / 0 |
| pending / consumed acquisition grants | 0 / 0 |
| Docker CLI / socket / daemon / registry | 0 / 0 / 0 / 0 |
| image inspect / pull / remove / prune | 0 / 0 / 0 / 0 |
| container / network / volume calls | 0 |
| cleanup / PostgreSQL / SQL | 0 / 0 / 0 |
| product network / Production / Gate C | 0 / 0 / 0 |
| Provider / messaging / deploy / release / spend | 0 / 0 / 0 / 0 / US$0 |

Repository preparation performed the AGENTS-required read-only check of
GitHub issue #67. It changed no issue, PR, repository, product or runtime
state and grants no registry, product-network, publication or messaging
authority.

## Approval mechanics

An exact approval must externally bind:

1. Addendum SHA/HEAD/tree above;
2. this Review's externally computed SHA and direct-child HEAD/tree;
3. all nine choices, exact Kiad/Liad/Miad 15-path/three-commit envelope and the
   two versioned future Card/Review paths; and
4. all zero-effect construction boundaries and the mandatory stop.

This Review intentionally omits its own SHA/HEAD/tree. Construction approval
does not authorize the later acquisition diagnostic. The pull/cache boundary
must be approved again against the final committed Card and Review.

## Mandatory stop

Before exact construction approval:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CORRECTION_PROPOSAL_READY / CORRECTION_CONSTRUCTION_APPROVAL_REQUIRED / IMAGE_PULL_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After successful repository construction and committed audit:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
