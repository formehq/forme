# R4 #67 Integration Campaign Platform-Select Correction Addendum

- Status: **`OWNER_OUTCOME_ENVELOPE_CONFIRMED_LOCAL_MVP_ADVANCEMENT`**
- Date: 2026-08-16
- User-visible outcome: reach one Green disposable local PostgreSQL rehearsal
- Current gate: R4 #67 Local PostgreSQL wiring
- Repository correction: **APPROVED_WITHIN_LOCAL_MVP_ADVANCEMENT_ENVELOPE**
- Local lifecycle ceiling: **at most three total after the envelope; one already consumed**
- Production / real data / public traffic / Gate C: **NOT_AUTHORIZED**

## Why this correction exists

Image-Acquisition Diagnostic V2 proved Docker client/server `29.3.1` on
`linux/arm64`, observed the exact image absent, completed the one allowed
anonymous pull, then failed closed because plain `docker image inspect`
returned the top-level OCI image-index descriptor. That descriptor correctly
had no platform field, so the strict classifier returned
`PLATFORM_MISMATCH`.

One subsequent local, read-only, exact-reference probe added
`--platform linux/arm64`. Docker then returned the selected OCI image
manifest descriptor:

- digest
  `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf`;
- media type `application/vnd.oci.image.manifest.v1+json`;
- descriptor platform `linux / arm64 / v8`;
- image config `linux / arm64`; and
- exact repo digest present.

This is the already frozen platform-manifest digest. The correction therefore
does not weaken platform identity. It makes Docker perform the platform
selection before the existing exact digest/platform checks.

## Confirmed outcome envelope

The Owner accepted the recommended “local MVP furthest advancement” mode with
“好，那我们继续”. Inside the goal of reaching a disposable local PostgreSQL
rehearsal Green, the agent may autonomously investigate, implement, test,
freeze repository evidence, commit, and use at most three strict local
synthetic lifecycles. Production, real secrets/data, external publication,
foreign-resource cleanup, major product/schema/trust-boundary expansion and
ambiguous cleanup remain hard stops.

One of those lifecycles was consumed by Image-Acquisition Diagnostic V2. This
Addendum permits repository construction of the platform-select correction and
one fresh V3 campaign authority. It does not itself prepare or consume a grant.

## Immutable failed evidence

### Integration Campaign V2

- Card/Review/payload:
  `sha256:1d96cfcf1cdef5131df1b0d150d0b99390ccb985389bc61fafedbc7591c21811` /
  `sha256:d6e936df53e0a33318436b24c96837d75a0b275cd0748d6d4c60691c5ffe97d1` /
  `sha256:ad67c1555bdbb0c1928fb377ad597ac56de9bfd93f2e2df0955c831a0e21a28f`;
- root `/Users/zaynw/.forme-r4-integration-campaign-v2-1d96cfcf`,
  device/inode `16777233 / 34760555`, uid `501`, mode `0700`;
- consumed grant
  `sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582`;
- evidence
  `sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889`;
- journal `17` /
  `sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b`;
- terminal `FAILED / local_postgres_integration_campaign_physical_failed`;
  historical names absent, PostgreSQL/SQL zero.

### Image-Acquisition Diagnostic V2

- Card/Review/payload:
  `sha256:03954591d737ff89ffd8bdd61a366cdbeed8691c0d7519abbebde154ae3d142a` /
  `sha256:0cdfad9f1ab7da65692fe5ed3ca02c0c6060610b4233f3e74824e851c276aa50` /
  `sha256:a70b3ae15087d5640d23bcacef33a8f3c32c3e4ae1d9eb69d174e9bbe1fd4662`;
- root
  `/Users/zaynw/.forme-r4-image-acquisition-diagnostic-v2-03954591`,
  device/inode `16777233 / 35759622`, uid `501`, mode `0700`;
- consumed grant
  `sha256:874a96a348de7886e9e80d4f8ceaa8351b5e3a3f08c62032d2a8ca3028d060e2`;
- evidence
  `sha256:f8887a53641f73c344d3fe265940611a46ad1e38b076c39fd5f903951faee992`;
- journal `16` /
  `sha256:8a38c7f2a4946f67ee68bd29d1ea10ff8eb5a6d2d60589f5b590b0e19e9a0371`;
- Docker calls `version 1 / inspect 2 / pull 1`, every resource kind zero;
- terminal post-inspect tuple: exact repo digest, image `linux/arm64`,
  top-level index descriptor, missing descriptor platform; PostgreSQL/SQL zero.

Both roots remain immutable forensic history.

## Nine choices

1. Add `--platform linux/arm64` to every exact-image inspect in the
   acquisition and physical campaign paths.
2. Keep the exact index reference and require the selected descriptor digest
   `a64c…8faf`; do not accept the index descriptor as the platform manifest.
3. Preserve all existing Docker call counts; this is an argv correction, not
   an extra call or retry.
4. Reject missing, mismatched or malformed selected descriptors exactly as
   before.
5. Bind both consumed V2 roots and body-free receipts into V3 history; never
   reuse or mutate them.
6. Construct Kps as exactly runner/test, Lps as exactly index/schema/evidence,
   and Mps as one report plus nine current-status surfaces.
7. Add only versioned
   `INTEGRATION-CAMPAIGN-EXECUTION-CARD-V3.md` and direct-child Review V3.
8. Validate fake cached/pull/platform-mismatch paths, full offline suites,
   strict evidence, committed topology, no-AI, docs and diff.
9. Under the confirmed local envelope, V3 may prepare and consume once in a
   fresh root. It may touch only exact-owned disposable resources, synthetic
   PostgreSQL data and loopback; Production and Gate C stay closed.

## Construction topology

`Acquisition Review V2 -> Addendum -> Review -> Kps -> Lps -> Mps -> Campaign Card V3 -> Campaign Review V3`

Kps modifies exactly:

- `scripts/r4-public-core-local-postgres.mjs`
- `test/r4/public-core-local-postgres.test.ts`

Lps adds exactly:

- `schemas/r4/public-core/local-postgres-integration-campaign-platform-select-correction-artifact-index.json`
- `schemas/r4/public-core/local-postgres-integration-campaign-platform-select-correction-evidence.schema.json`
- `docs/evidence/r4-public-core-local-postgres-integration-campaign-platform-select-correction.json`

Mps adds one construction report and modifies the nine current status surfaces,
for exactly 15 paths and three commits overall.

## Effect ceiling

Repository construction has Docker/registry/PostgreSQL/SQL/network/Production/
Gate-C effects zero. The later V3 campaign retains the existing one-use,
write-ahead, no-retry, exact-cleanup ceilings. The cached image path permits no
additional pull. Only exact-owned disposable container/network/volume and two
synthetic databases may exist during the campaign; final owned residue must be
zero.

## Stop

`LOCAL_POSTGRES_PLATFORM_SELECT_CORRECTION_CONSTRUCTION_IN_PROGRESS /
LOCAL_V3_CAMPAIGN_ENVELOPE_CONFIRMED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
