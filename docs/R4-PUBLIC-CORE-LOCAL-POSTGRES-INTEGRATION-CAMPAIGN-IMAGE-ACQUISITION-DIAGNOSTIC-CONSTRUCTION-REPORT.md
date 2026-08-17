# R4 #67 Image-Acquisition Diagnostic Construction Report

- Status: **Technical Review Green — repository construction only**
- Date: 2026-08-16
- Outcome: one future one-use image-acquisition diagnostic is constructed and
  machine-auditable; no diagnostic or physical effect was executed
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Owner-visible outcome

The repository can now prepare, under a later separately approved Card/Review,
one fresh one-use diagnostic that answers a narrow question: is the exact
pinned PostgreSQL image already present, and if it is absent, can one anonymous
`linux/arm64` pull produce the exact allowlisted body-free descriptor tuple?

This construction does not run that diagnostic. It does not correct a manifest,
retry the Integration Campaign, create or clean Docker resources, start
PostgreSQL, run SQL, change product runtime, enter Production or activate Gate
C.

## Exact authority

The construction binds:

- Correction Addendum
  `sha256:592f9e2fdb080a3f9605937251943afd2fb2f822c2871b04ae9d13c581d35b6e`,
  HEAD/tree `2fe84edd9d188f35b02b226fa32ce94f5576f8de` /
  `5d6fb3334608ba7032aee45646b868d88ccbd1be`;
- Owner Review
  `sha256:83305354bc03c0fd1a3e945b04d4ceb6d5749f08e2c530f734502dc6921ed3a9`,
  HEAD/tree `eda416c2a3b591cad3fb16608ad78fef2031f174` /
  `859a5cca61d13992fdde184f9d537b049af6cfee`; and
- all nine approved choices, the exact 15-path / three-commit
  `Kiad -> Liad -> Miad` workset and the reserved add-only versioned
  Card/Review paths.

Docker Diagnostic, registry, image pull, cleanup, PostgreSQL, Production and
Gate C remained `NOT_REQUESTED` throughout construction.

## Immutable predecessor truth

The consumed Image-Manifest Diagnostic remains immutable FAILED history:

- Card / Review:
  `sha256:f0a0bf2dbe00e6a1ba2f49b6e2b58898136402e685c3cd0afe8a55883b26fdb8`
  at `6a040deb80dc9c22d131bcf6bb0d2eadbdca7d81`, and
  `sha256:73e6b30cbec9e5abbd52a1bdddf893bf89065c77381b1c6346d903d24ff77c66`
  at `b4aae98488e934d921c1deb5c526286c49d22503`;
- canonical payload
  `sha256:99d17e705204a8e2bb532cffc25ee845eddd29d242f5e518bac78e9b8db39414`;
- root `/Users/zaynw/.forme-r4-image-manifest-diagnostic-f0a0bf2d`,
  device/inode `16777231 / 35062239`, uid `501`, mode `0700`, exact
  four-file forensic closure;
- consumed grant
  `sha256:f497fc8ed003aebf42d975494730f184ba1f93355b6474ff7c3526e2d2533a22`;
- terminal evidence
  `sha256:e149627976e1f2bf1927dbcec25a82e545f8d892d2b5865e288d6941dcbb9ad7`;
- journal `10` /
  `sha256:b9dcfb5134225497d8efc546f3ad7749ee931f29cf2db8e162037832af9a6a86`;
- terminal truth `FAILED / local_postgres_image_manifest_diagnostic_failed /
  IMAGE_MISSING`.

Construction read and mutation counts for that root were both zero.

## Constructed contract

The new family is separate from every campaign and earlier diagnostic grant.
It has strict v1 payload, grant, journal, receipt, prepare and execution
surfaces. The only conditional Docker sequences are:

- cached present: `version -> pre-inspect -> stop`;
- exact missing: `version -> pre-inspect -> one anonymous pull ->
  post-inspect -> stop`.

Ceilings are `version <= 1`, `image.inspect <= 2`, `image.pull <= 1`;
all container, network and volume kinds are zero. Every call is write-ahead,
one-use and no-retry. The isolated Docker home/config is disposable and
credential-free. Persisted observations are body-free fingerprints plus the
eight-field allowlisted tuple. Cache truth distinguishes `PRESENT`,
`ABSENT`, `PARTIAL_OR_UNKNOWN` and `AMBIGUOUS`.

Nonzero, timeout, signal, injected crash, host drift, malformed body,
post-pull missing, reference mismatch, platform mismatch and descriptor
mismatch all consume the sole budget and stop. No branch can continue into a
replacement campaign.

## Committed construction

Kiad is `c6fe1804b1111c19d27da64f7ca76b85c0f12adf`, tree
`3d9202f81cb09dfe9f1a6d70fb7cfb92f47cdb7a`, a direct child of the
approved Review with exactly two modified paths. Its framed G2 is
`sha256:d7f76c1a9af05f25952a65c5e561fa28186df390ac5a66c3416b45ca496b19f8`.

Liad is `95197de9f65469cb52e569245cf4e08190c82471`, tree
`872cbc1fb4c0ea05bcf852ae0cc2d4c50d6469e7`, a direct child of Kiad
with exactly three added evidence paths. Its framed G3 is
`sha256:11131eb2354616482e689fb3fc082d1ac33c7aea2ff8133e57101ac6d5a7922b`.

Machine artifacts:

- index
  `sha256:8da9ebd53e26c91de44ad277db00b5d25b22aa1e3d262dd3db0e9bb7a8bb82e9`;
- strict schema
  `sha256:2aecd08011be498edef3f7da1f27c8fc00850701183325f09dbec9fc4d7f7170`;
- evidence
  `sha256:2b0a029f48e74fb9c1d7f3b5878465b40861cfa8c45528e9a68e5cbbd8cb74f7`;
- committed Kiad audit
  `sha256:cf9714321974530b45be84d5d08887ffde74b8d7c95d9fe5fb5b9f12ef2672a4`;
- committed Liad audit
  `sha256:ca1f83202063b3ba2f08f635b3ae1b263ac0dc9d94b677b7ac4b431050e9fc0e`.

The evidence schema deliberately does not bind its own digest as a const;
machine evidence binds the actual schema hash. No artifact contains its own
future commit hash.

## Validation

| Lane | Result |
|---|---:|
| focused image-acquisition diagnostic, deny-network | 6 / 6 |
| full local PostgreSQL runner, deny-network | 188 / 188 |
| focused non-runner Public Core, deny-network | 85 / 85 |
| all Public Core, deny-network | 440 / 440 |
| all R4 offline | 760 / 760 |
| Gate-B Core, serial | 146 / 146 |
| repository spine | 45 / 45 |

Runner syntax, TypeScript, strict Ajv with 8/8 hostile evidence mutations,
strict grant/journal/receipt hostile matrices, hosted-room no-server-AI,
legacy docs regression and diff checks are Green. The initial parallel
Gate-B Core stress run produced one unrelated Host Binding error-code ordering
failure; the required serial Gate-B Core lane then passed 146/146. Only the
serial result is acceptance evidence.

## Effect audit

Construction changed exactly 15 paths across three commits: Kiad two modified,
Liad three added, Miad one added plus nine modified. Dependency, lockfile, SQL
and mode changes are zero. External network, predecessor-root reads/mutations,
pending or consumed diagnostic grants, Docker CLI/socket/daemon/registry,
image pulls, Docker resource or cleanup effects, PostgreSQL, SQL, product
runtime, Production and Gate C effects are all zero.

## Honest boundary and next step

This is repository Technical Review, not physical observation. The image is not
claimed present, pulled or corrected. The manifest pin is unchanged. Target
PostgreSQL remains unobserved and #67/R4 remains Building.

The next repository-only action is to construct and audit the reserved add-only
Image-Acquisition Diagnostic Card V1 and Owner Review V1. Those documents may
propose one later diagnostic but cannot authorize or execute it. Mandatory
stop:

`LOCAL_POSTGRES_IMAGE_ACQUISITION_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
IMAGE_ACQUISITION_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
