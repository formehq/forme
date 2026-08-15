# R4 #67 Integration Campaign Image-Acquisition Diagnostic Correction Addendum

- Status: **`OWNER_DECISION_REQUIRED`**
- Date: 2026-08-15
- Proposed outcome: one repository construction for a later one-use image
  acquisition plus body-free manifest observation
- Current physical truth: **`IMAGE_MISSING`**
- Image pull / Docker diagnostic / PostgreSQL: **NOT_REQUESTED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Why this correction exists

The separately approved Image-Manifest Diagnostic was prepared and consumed
exactly once. Docker client/server `29.3.1` and `linux/arm64` matched, then the
one permitted exact `image.inspect` classified the pinned PostgreSQL reference
as `IMAGE_MISSING`. The diagnostic made no pull, resource, cleanup,
PostgreSQL or SQL effect and ended in exact four-entry forensic closure.

This is useful negative evidence but does not reveal the linux/arm64 descriptor
digest. The repository therefore still cannot safely change the platform
manifest pin or its acceptance rule, and the consumed Integration Campaign V2
cannot be retried. The next coherent result is one acquisition diagnostic:
inspect the exact reference, pull it anonymously at most once only when absent,
inspect it once afterward, retain a body-free tuple, and stop. It is not a
replacement PostgreSQL campaign.

## Exact predecessor and terminal evidence

| Binding | Exact value |
|---|---|
| proposal baseline HEAD / tree | `b4aae98488e934d921c1deb5c526286c49d22503` / `72ffc8ce9c19058894864846f5705d1234d7ced8` |
| Image-Manifest Diagnostic Card SHA / HEAD / tree | `sha256:f0a0bf2dbe00e6a1ba2f49b6e2b58898136402e685c3cd0afe8a55883b26fdb8` / `6a040deb80dc9c22d131bcf6bb0d2eadbdca7d81` / `9774d6dab1af9bd8acea760f8b10e406bef46303` |
| Image-Manifest Diagnostic Review SHA / HEAD / tree | `sha256:73e6b30cbec9e5abbd52a1bdddf893bf89065c77381b1c6346d903d24ff77c66` / `b4aae98488e934d921c1deb5c526286c49d22503` / `72ffc8ce9c19058894864846f5705d1234d7ced8` |
| canonical predecessor payload | `sha256:99d17e705204a8e2bb532cffc25ee845eddd29d242f5e518bac78e9b8db39414` |
| diagnostic root | `/Users/zaynw/.forme-r4-image-manifest-diagnostic-f0a0bf2d` |
| root identity / closure | device `16777231`, inode `35062239`, uid `501`, mode `0700`; exact four retained entries |
| Owner approval receipt | `sha256:07963ed22fbb1c96c3161bf9bc0527003907920fe44ae57f2954cbf9d1f59445` / `1030` bytes |
| consumed diagnostic grant | `sha256:f497fc8ed003aebf42d975494730f184ba1f93355b6474ff7c3526e2d2533a22` / `4401` bytes |
| terminal evidence | `sha256:e149627976e1f2bf1927dbcec25a82e545f8d892d2b5865e288d6941dcbb9ad7` / `6639` bytes |
| journal | `10` / `sha256:b9dcfb5134225497d8efc546f3ad7749ee931f29cf2db8e162037832af9a6a86` |
| terminal result | `FAILED / local_postgres_image_manifest_diagnostic_failed / IMAGE_MISSING` |
| Docker effects | `version 1/1`, `image.inspect 1/1`; every other kind `0/0` |
| wider effects | pull `0`; resource `0`; cleanup `0`; PostgreSQL `0`; SQL `0` |

The root, consumed grant, receipt, journal and evidence are immutable forensic
history. The construction proposed here may bind their hashes but may not read,
modify, delete, reuse or reinterpret their bytes. `FAILED` remains the truthful
terminal status; it is not converted to Green by this Addendum.

## Nine recommended choices

Please accept or reject these as one medium-grained decision:

1. **Preserve the consumed diagnostic truth.** Bind the exact predecessor
   Card/Review, payload, root, grant, evidence and journal above. The old grant
   remains consumed and the old root remains immutable and outside the new
   workspace.
2. **Acquire only the exact pinned identity.** The sole admissible image input
   remains
   `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
   on exact platform `linux/arm64`. Tags, alternate registries, fallback
   references and digest substitution are forbidden.
3. **Use one fresh one-use authority family.** Construct a distinct strict
   grant/journal/receipt/prepare/runner path with one prepare, one consumption,
   one lifecycle, lifetime greater than zero and no more than 24 hours, and no
   reuse of any campaign or earlier diagnostic grant.
4. **Use one closed conditional Docker sequence.** Permit one exact Docker
   `version`, one pre-pull exact `image.inspect`, at most one anonymous
   `image.pull --platform linux/arm64` only after an exact `IMAGE_MISSING`, and
   exactly one post-pull `image.inspect` only after a completed pull. Thus
   `version <= 1`, `image.inspect <= 2`, `image.pull <= 1`; every
   container/network/volume kind remains zero.
5. **Keep credentials and network narrow.** Use a fresh mode-0700 HOME and
   DOCKER_CONFIG whose sole config body is `{\"auths\":{}}`; clear proxy,
   credential-helper and ambient Docker variables; forbid login and registry
   credentials. The only allowed external network is Docker daemon mediation
   of that single anonymous pull.
6. **Retain body-free observations only.** Persist closed call outcomes,
   stdout/stderr byte counts and SHA-256 fingerprints, UTF-8/line-shape facts,
   cache-before/cache-after state and the exact allowlisted descriptor tuple.
   Never persist pull progress, raw Docker JSON, registry bodies, headers,
   tokens, credentials, arbitrary labels or unlisted image fields.
7. **Make cache residue explicit.** A complete exact pulled image cache, or
   Docker-managed partial/unknown cache residue after an ambiguous pull, is the
   only allowed daemon residue. No prune, image remove or cleanup is permitted;
   terminal evidence must distinguish `PRESENT`, `ABSENT`,
   `PARTIAL_OR_UNKNOWN` and `AMBIGUOUS` honestly.
8. **Require write-ahead, no retry and exact stop.** Reserve every Docker call
   before invocation. A nonzero exit, timeout, signal, crash, malformed body,
   host drift or ambiguous pull consumes its budget. No call or lifecycle may
   be replayed, and no failure may be repaired inside the same authority.
9. **Do not auto-correct or continue the campaign.** The observation may not
   rewrite the manifest pin or acceptance rule, prepare another campaign,
   create/clean resources, start PostgreSQL, run SQL, affect product runtime,
   activate Production or enter Gate C. A successful body-free tuple still
   stops for Owner review.

## Proposed repository construction

Approval would authorize one repository-only construction chain
`Kiad -> Liad -> Miad`, each a direct single-parent commit:

### Kiad — exact two modified paths

- `scripts/r4-public-core-local-postgres.mjs`
- `test/r4/public-core-local-postgres.test.ts`

Kiad implements and exhaustively tests the new authority family, exact
pre-inspect/missing/pull/post-inspect state machine, anonymous isolated Docker
configuration, write-ahead accounting, body-free evidence, cache-residue
truth, crash/ambiguity/host-drift behavior and zero wider effects. It must not
weaken or rewrite any prior runner/grant/receipt contract.

### Liad — exact three added paths

- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-diagnostic-artifact-index.json`
- `schemas/r4/public-core/local-postgres-integration-campaign-image-acquisition-diagnostic-evidence.schema.json`
- `docs/evidence/r4-public-core-local-postgres-integration-campaign-image-acquisition-diagnostic.json`

Liad freezes committed Kiad bytes, complete predecessor lineage, strict
machine evidence, synthetic validation counts, zero construction effects and
an interim `STATUS_FREEZE_REQUIRED` stop. It cannot claim that an image was
pulled or observed.

### Miad — one added report plus nine modified status surfaces

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

Total construction workset: **15 paths = 11 modified + 4 added**, across
exactly three commits. No dependency, lockfile, SQL, production schema, file
mode, historical evidence/root or sixteenth path may change.

After committed Miad audit is Green, the same repository-only construction
authority may create and audit two direct add-only proposal commits:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V1.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V1.md`

Those future documents may propose one physical acquisition diagnostic but
cannot authorize or execute it.

## Validation required for Technical Review

The construction must prove from committed bytes:

- exact predecessor Card/Review/root/grant/evidence/journal bindings;
- exact Addendum -> Review -> Kiad -> Liad -> Miad topology and path deltas;
- strict payload, grant, journal, receipt and final-root key sets;
- cached-present path: one inspect, zero pull, no second inspect;
- missing path: first inspect -> one pull -> one post-pull inspect;
- pull nonzero, timeout, signal, crash and host drift consume the sole pull and
  never re-enter or retry;
- post-pull missing/malformed/reference/platform/descriptor mismatch remains
  truthful failed evidence and never changes a pin;
- exact Docker argv/environment, empty auth config, no login/helper/proxy,
  body-free output and write-ahead-before-effect ordering;
- every container/network/volume/cleanup/PostgreSQL/SQL/product port remains
  zero under ordinary and hostile tests; and
- focused/full deny-network fake suites, full R4 offline, Gate-B Core,
  repository spine, TypeScript, strict Ajv, no-server-AI, docs and diff checks
  are Green.

Synthetic tests may not invoke the real Docker CLI, resolve the real socket,
contact a registry, pull an image or create real PostgreSQL objects.

## Effect ceiling of this construction approval

| Effect | Ceiling |
|---|---:|
| tracked repository paths | exact 15-path construction plus two future proposal docs |
| commits | Kiad / Liad / Miad, then Card-only / Review-only |
| reads or writes to the consumed diagnostic root | 0 / 0 |
| pending / consumed acquisition grants | 0 / 0 |
| Docker CLI / socket / daemon / registry | 0 / 0 / 0 / 0 |
| image inspect / pull / remove / prune | 0 / 0 / 0 / 0 |
| container / network / volume calls | 0 |
| cleanup / PostgreSQL / SQL | 0 / 0 / 0 |
| product network / Production / Gate C | 0 / 0 / 0 |
| Provider / messaging / deploy / release / spend | 0 / 0 / 0 / 0 / US$0 |

## What approval would not do

Construction approval would not inspect or pull an image, access either
forensic root, create a grant, call Docker, clean a cache/resource, start
PostgreSQL, run SQL, correct the manifest pin, retry Integration Campaign V2,
activate Production or enter Gate C. The future physical effect remains a
separate Owner gate because it adds external network and durable Docker cache
authority.

## Approval mechanics

An exact construction approval must externally bind:

1. this Addendum's committed SHA/HEAD/tree;
2. its direct-child Owner Review SHA/HEAD/tree;
3. all nine choices, exact Kiad/Liad/Miad 15-path/three-commit workset and the
   two versioned future Card/Review paths; and
4. the complete zero-effect construction boundary and mandatory stop.

This Addendum intentionally omits its own SHA and future commit/tree. No
approval may be inferred from prior campaign or diagnostic authority.

## Mandatory stops

Before construction approval:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CORRECTION_PROPOSAL_READY / CORRECTION_CONSTRUCTION_APPROVAL_REQUIRED / IMAGE_PULL_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After successful repository construction and committed audit:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
