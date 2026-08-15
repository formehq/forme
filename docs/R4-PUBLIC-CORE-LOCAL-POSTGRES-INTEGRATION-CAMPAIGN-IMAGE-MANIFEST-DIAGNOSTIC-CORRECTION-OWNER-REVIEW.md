# R4 #67 Integration Campaign Image-Manifest Diagnostic Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Construction effect: repository only
- Docker / image pull / cleanup / PostgreSQL / SQL: **NOT_AUTHORIZED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## What you are deciding

The consumed Integration Campaign V2 proved the three historical Docker names
absent, then failed before fresh resource creation because the locally
inspected image's `Descriptor.digest` did not match the pinned linux/arm64
manifest digest. The body-free terminal evidence correctly omitted raw Docker
JSON, but it also means the repository has no trustworthy observed digest from
which to choose a correction.

This Review asks for one medium-grained repository construction outcome: build
a separate one-use, body-free image-manifest diagnostic contract, its synthetic
tests, strict machine evidence, scoped status freeze and final Diagnostic
Card/Review. Approval does not run that diagnostic. It does not authorize a
pull, resource cleanup or another PostgreSQL campaign.

The complete proposal is the
[Image-Manifest Diagnostic Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CORRECTION-ADDENDUM.md).

## Exact proposal binding

| Binding | Exact value |
|---|---|
| correction Addendum SHA | `sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee` |
| Addendum commit HEAD / tree | `e8919ff6474bd3f61a76668da1f1bbc9cae01fc5` / `3ac72ec29feac2f665a271bd79d4ffe33389f794` |
| Addendum parent baseline HEAD / tree | `4611e57e3481b1b309f0d583d013e548d05e0f25` / `0ea6a56a36b32f38f183f9f16ccdd59e20e6d12c` |
| Addendum delta | exactly one added mode-`100644` document |
| failed V2 approval receipt | `sha256:99541d38320a7a2aa4682eb39d3577d467fb68f8f1b78b78ff565b4b8fb4a26e` / `1128` bytes |
| failed consumed campaign grant | `sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582` |
| failed terminal evidence | `sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889` / `9656` bytes |
| failed terminal journal | `17` / `sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b` |
| failure code | inner `local_postgres_image_platform_manifest_invalid`; terminal `local_postgres_integration_campaign_physical_failed` |
| target observation | historical names absent; PostgreSQL/catalog/SQL not observed |

The Addendum is a direct child of the failed V2 Owner Review and adds no
runner, test, schema, dependency, effect authority or current-status claim.
The retained campaign root is immutable and is not read or mutated by this
construction.

## Nine choices

Please accept or reject these as one decision:

1. diagnose the actual bounded image descriptor tuple before changing the
   reference, platform-manifest pin or acceptance rule;
2. reserve at most one future Docker `version` and one exact `image.inspect`
   call, with pull and every resource mutation kind fixed at zero;
3. grant no cleanup, historical-root access or named-resource authority;
4. retain only the exact allowlisted typed tuple and body-free process
   fingerprints, never raw Docker output or arbitrary image fields;
5. use a fresh one-use write-ahead grant/journal/receipt family with no retry;
6. preserve missing, malformed, ambiguous, drift and mismatch outcomes without
   manufacturing a corrected digest;
7. prohibit automatic runner correction, campaign preparation or PostgreSQL
   continuation after the observation;
8. reserve the exact versioned future Diagnostic Card/Review paths named in
   the Addendum; and
9. keep Docker, image pull, cleanup, PostgreSQL, production, real Guest,
   Provider and Gate C effects at zero throughout repository construction.

## Exact construction envelope

Approval authorizes exactly `Kmd → Lmd → Mmd` as three direct single-parent
commits:

- `Kmd`: two modified paths — runner and its focused test;
- `Lmd`: three added paths — artifact index, strict evidence schema and
  machine evidence;
- `Mmd`: one added construction report plus nine modified current-status
  surfaces.

Total: **15 paths = 11 modified + 4 added**. No dependency, lockfile, SQL,
product API, production schema, mode, retained-root or sixteenth path may
change. All validation is synthetic, deny-network and Docker/PG-free.

After the committed Mmd audit is Green, the same repository-only authorization
also permits direct construction and audit of exactly these two proposal docs:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CARD-V1.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-OWNER-REVIEW-V1.md`

Those documents may propose the later one-use diagnostic, but cannot authorize
or execute it themselves.

## Effect ceiling during construction

| Effect | Ceiling |
|---|---:|
| tracked repository paths | exact 15-path construction plus the two later proposal docs |
| commits | exact Kmd / Lmd / Mmd, then Card-only / Review-only |
| network | 0 |
| Docker CLI / socket / daemon / OCI | 0 |
| image inspect / pull | 0 / 0 |
| container / network / volume calls | 0 |
| retained forensic-root reads or writes | 0 |
| cleanup | 0 |
| PostgreSQL / Pool / Client / SQL | 0 |
| product runtime / traffic | 0 |
| production / Provider / messaging / deploy / release / spend | 0 |
| Gate C | 0 |

## What approval does not do

Approval does not retry or reinterpret the failed campaign, inspect the image,
read or modify its retained root, call Docker, pull an image, clean a resource,
start PostgreSQL, run SQL, change the manifest pin, activate production or
enter Gate C. Any future diagnostic requires a fresh exact Owner approval of
the final Card and its direct-child Review.

## Approval mechanics

An exact approval must bind:

1. Addendum SHA and Addendum HEAD/tree above;
2. this Review's externally computed committed SHA and direct-child Review
   HEAD/tree;
3. all nine choices, Kmd/Lmd/Mmd exact 15-path/three-commit envelope and the
   two versioned future Diagnostic Card/Review paths; and
4. all zero-effect boundaries and the mandatory stop below.

This Review intentionally contains neither its own SHA nor its future commit
HEAD/tree. Those values are supplied externally after the single-file commit.

## Mandatory stop

After successful repository construction and committed audit:

`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

No Docker diagnostic, cleanup, replacement campaign, PostgreSQL or Gate C
effect may occur before the later exact approval.
