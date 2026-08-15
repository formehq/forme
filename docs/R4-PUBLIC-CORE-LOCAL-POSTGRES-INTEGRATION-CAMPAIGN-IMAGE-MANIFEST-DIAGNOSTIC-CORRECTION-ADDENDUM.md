# R4 #67 Integration Campaign Image-Manifest Diagnostic Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Scope: repository-only diagnostic construction after the consumed Integration Campaign V2 failure
- Docker / image pull / cleanup / PostgreSQL / SQL: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Decision in plain language

The one approved Integration Campaign V2 grant was prepared and consumed
exactly once. Its bounded historical diagnostic proved the frozen container,
network and volume names absent. The physical rehearsal then stopped while
validating the pinned PostgreSQL image, before any fresh Docker resource,
PostgreSQL connection or SQL action was authorized by the runner's fixed
sequence.

The immediate error was
`local_postgres_image_platform_manifest_invalid`. The current runner compares
Docker image-inspect field `Descriptor.digest` directly with the separately
pinned linux/arm64 manifest digest. The terminal campaign receipt deliberately
does not retain raw Docker output or the observed descriptor digest, so the
repository cannot honestly determine whether the mismatch is stale image
metadata, Docker CLI descriptor semantics, a wrong manifest pin or another
closed parser condition. Guessing a replacement digest or weakening the check
would cross the trust boundary.

The requested correction is one repository-only construction outcome: add a
separate, body-free, one-use image-manifest diagnostic contract that can later
observe exactly the pinned image with one `image.inspect` call and retain only
the minimum typed metadata needed to decide the next repository correction.
It does not authorize that Docker call, a pull, cleanup or another PostgreSQL
campaign.

## Immutable failed V2 execution truth

| Binding | Exact value |
|---|---|
| repository baseline HEAD / tree | `4611e57e3481b1b309f0d583d013e548d05e0f25` / `0ea6a56a36b32f38f183f9f16ccdd59e20e6d12c` |
| Execution Card V2 SHA / HEAD / tree | `sha256:1d96cfcf1cdef5131df1b0d150d0b99390ccb985389bc61fafedbc7591c21811` / `56382c8a378e316b2e5a0a2cf2cf15ac6913d924` / `74798475a440acfd5ed342d9bab5928fa1e7f11e` |
| Owner Review V2 SHA / HEAD / tree | `sha256:d6e936df53e0a33318436b24c96837d75a0b275cd0748d6d4c60691c5ffe97d1` / `4611e57e3481b1b309f0d583d013e548d05e0f25` / `0ea6a56a36b32f38f183f9f16ccdd59e20e6d12c` |
| Mvt HEAD / tree / G10t | `624437da7b5efb99dbd1347120b33d054447609d` / `57d732ecead6f0843b8528139e35614408daf13e` / `sha256:ceca443af7af415f00ab0ef8c7337916a9df7ce1fc159c72120b664b6d57edce` |
| committed-Mvt audit | `sha256:ab81bfb69aa0c062af95d8df43506b8ee671e1dc091334409f9a5dafd5f0cb44` |
| canonical V2 payload | `sha256:ad67c1555bdbb0c1928fb377ad597ac56de9bfd93f2e2df0955c831a0e21a28f` |
| consumed V2 root | `/Users/zaynw/.forme-r4-integration-campaign-v2-1d96cfcf` |
| V2 approval receipt | `sha256:99541d38320a7a2aa4682eb39d3577d467fb68f8f1b78b78ff565b4b8fb4a26e` / `1128` bytes |
| consumed campaign grant | `sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582` |
| terminal evidence | `sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889` / `9656` bytes |
| terminal journal | `17` entries / `sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b` / one open `physical:rehearsal` reservation |
| historical observation | container / network / volume all `PROVEN_ABSENT` |
| physical observation | rehearsal attempt `1`, completion `0`; target PostgreSQL not observed |
| terminal status | `FAILED / local_postgres_integration_campaign_physical_failed` |

The consumed root remains immutable forensic history. Its grant cannot be
retried, refreshed, converted into diagnostic authority or used to infer the
unrecorded descriptor digest. The frozen image cache is allowed historical
daemon state, but its current completeness is not inferred by this Addendum.

## Exact diagnostic question

The later diagnostic may answer only this closed question:

> For the exact local image reference
> `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`,
> what bounded image-inspect identity and descriptor tuple does the already
> pinned Docker CLI/server return on `linux/arm64`?

The typed result may retain only:

- whether the exact RepoDigest is present;
- top-level `Os` and `Architecture` as exact closed values;
- `Descriptor.digest` as `sha256:<64hex>` or a closed missing/invalid sentinel;
- descriptor media type, size and platform `os`/`architecture` through closed
  bounded fields;
- spawn outcome, exit status/signal, byte counts, SHA-256, UTF-8 validity,
  line counts and line-ending class; and
- exact CLI/socket identity, write-ahead journal head and terminal cleanup-free
  forensic closure.

It may not retain raw stdout/stderr, image configuration, environment,
history, layers, labels, mounts, credentials, registry tokens or arbitrary
JSON fields.

## Nine correction choices

Owner approval accepts these choices together:

1. **Diagnose before correcting.** Do not change the image reference, platform
   manifest pin or acceptance predicate until an authorized diagnostic records
   the actual bounded tuple.
2. **One exact image inspection.** The future diagnostic permits one Docker
   `version` call and one exact `image inspect --format {{json .}}` call for the
   frozen reference. Every pull, create, start, stop, remove, network, volume,
   container, build, login and unlisted Docker kind remains zero.
3. **No cleanup authority.** The diagnostic never inspects or mutates named
   containers, networks or volumes and never enters either retained forensic
   campaign root. It creates no Docker-owned resource.
4. **Body-free typed evidence.** Raw process output is parsed in memory,
   reduced to the exact allowlisted tuple and fingerprints, zeroed where
   feasible and never emitted to logs, errors, receipts, evidence or status
   documents.
5. **One-use write-ahead state.** A fresh private root, exact Owner receipt,
   fresh CLI/socket identities, one pending-to-consumed transition and a
   write-ahead journal protect the diagnostic. Failure or ambiguity consumes
   the authority; there is no retry.
6. **Truthful missing and ambiguity states.** A missing image, malformed JSON,
   absent descriptor, non-SHA digest, platform mismatch, timeout, signal,
   spawn ambiguity or host drift is retained as a closed body-free outcome and
   stops. It is never converted into a corrected manifest value.
7. **No automatic campaign continuation.** Even a clean observation cannot
   amend the runner, mint a campaign grant or start PostgreSQL. A later
   repository correction and separately approved campaign remain required.
8. **Fresh versioned future authority.** Reserve
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CARD-V1.md`
   and
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-OWNER-REVIEW-V1.md`
   for the later effect proposal.
9. **Keep wider effects closed.** During repository construction Docker,
   socket/daemon/OCI, image pull, cleanup, PostgreSQL/SQL, product runtime,
   traffic, publication, real Guest data, Provider/model/email, deployment,
   release, spend, Production and Gate C remain zero.

## Exact repository construction envelope

After this Addendum and its direct-child Owner Review are exactly approved,
implementation, tests, evidence freezing, scoped documentation reconciliation
and final Diagnostic Card/Review construction may proceed without intermediate
Owner approval inside these exact bounds.

Construct three direct, single-parent commits:

1. `Kmd`, modifying exactly:
   - `scripts/r4-public-core-local-postgres.mjs`
   - `test/r4/public-core-local-postgres.test.ts`
2. `Lmd`, adding exactly:
   - `schemas/r4/public-core/local-postgres-integration-campaign-image-manifest-diagnostic-artifact-index.json`
   - `schemas/r4/public-core/local-postgres-integration-campaign-image-manifest-diagnostic-evidence.schema.json`
   - `docs/evidence/r4-public-core-local-postgres-integration-campaign-image-manifest-diagnostic.json`
3. `Mmd`, adding the construction report and modifying the nine current status
   surfaces:
   - `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CONSTRUCTION-REPORT.md`
   - `README.md`
   - `docs/CONTROL.md`
   - `docs/DECISIONS.md`
   - `docs/NATIVE-HARNESS-ARCHITECTURE.md`
   - `docs/PRODUCT.md`
   - `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
   - `docs/README.md`
   - `docs/ROADMAP.md`
   - `docs/VALIDATION.md`

The construction workset is exactly **15 paths / 3 commits = 11 modified + 4
added**. Any sixteenth path, dependency/lockfile/SQL change, mode change, merge
commit, forensic-root mutation or effect call stops.

## Required implementation behavior

The repository construction must provide:

- a closed versioned diagnostic grant, journal, prepare receipt and terminal
  evidence contract distinct from every physical/campaign/cleanup authority;
- exact Card/Review/committed-lineage verification before grant creation;
- a raw-result parser shared by fake and real diagnostic ports;
- absolute pinned Docker CLI and local-owned Unix-socket identity checks before
  prepare and immediately before/after each later Docker call;
- strict process argv and environment closure, bounded output, deadline and
  write-ahead attempt/completion accounting;
- exact one-use consumption and terminal retained-root allowlist;
- no access to either historical campaign root; and
- a receipt validator that cross-binds authority, host, call counters,
  fingerprints, typed tuple, journal head/count and zero resource effects.

## Required validation

All repository validation is synthetic and deny-network. It must prove:

- exact predecessor chain and the failed V2 root/grant/evidence/journal
  bindings without reading the retained root during ordinary tests;
- strict grant/journal/receipt schemas and hostile missing/extra/type/value
  mutation rejection;
- exact successful descriptor tuples for index-digest, platform-manifest and
  distinct-digest fixtures without deciding which one is correct;
- missing image, malformed JSON, missing/non-SHA descriptor, platform mismatch,
  timeout, signal, nonzero exit and CLI/socket drift outcomes;
- raw bodies and unlisted Docker fields never survive the parser boundary;
- one version plus one image-inspect maximum, with every pull/resource/cleanup
  call kind statically and dynamically denied;
- prepare is Docker-free and all fake/full tests resolve no real socket, spawn
  no Docker CLI, create no `pg` Pool/Client and run no SQL;
- all focused/full offline, Gate-B Core, spine, TypeScript, strict Ajv, docs,
  no-server-AI and diff checks Green; and
- committed-byte audit `0 Blocker / 0 Important` after `Mmd`, without writing
  the post-commit audit back into `Mmd`.

## Mandatory stops

Successful repository construction and audit stop at:

`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

An authorized diagnostic, regardless of result, must later stop at:

`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_OBSERVED / REPOSITORY_CORRECTION_REVIEW_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

No result directly authorizes a replacement campaign, cleanup, PostgreSQL or
Gate C.
