# R4 #67 Integration Campaign Image-Manifest Diagnostic Construction Report

- Status: **`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN`**
- Date: 2026-08-15
- Scope: repository-only Kmd → Lmd → Mmd construction
- Docker diagnostic / image pull / cleanup / PostgreSQL / SQL: **NOT_REQUESTED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Outcome

The repository now contains a separate, body-free, one-use diagnostic engine
for answering one narrow future question: what exact allowlisted identity and
descriptor tuple the pinned Docker CLI/server returns for the already pinned
PostgreSQL image reference on `linux/arm64`.

Construction did not answer that question. It made no Docker CLI call, did not
resolve the Docker socket, did not contact the daemon, did not pull an image,
did not inspect or clean any historical resource, and did not start or connect
to PostgreSQL. The failed V2 campaign root remains immutable and unread by
this construction.

## Exact authority and lineage

| Binding | Exact value |
|---|---|
| Correction Addendum SHA / HEAD / tree | `sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee` / `e8919ff6474bd3f61a76668da1f1bbc9cae01fc5` / `3ac72ec29feac2f665a271bd79d4ffe33389f794` |
| Owner Review SHA / HEAD / tree | `sha256:3af0c155276d6c7946ffb4c5196c61c38067b831e12de41c00c95c249df6b9c4` / `65771be7a1c17ed9170fbe592dae854f6d312759` / `d1b7f0b69634300f5c207b8cdf33823592369ff2` |
| Kmd HEAD / tree / G2 | `32abce27f7c84a83e0d2d1252ab0da5530f88cb0` / `eeaceeda818e7df76effe8b1439be849c7ead86b` / `sha256:a795d00b5875acedc13a320687c660f4c7c475ecf8e54373b6d55ca5e0de053e` |
| Lmd HEAD / tree / G3 | `b17a44f34fa9abde1e6a39504594e875a6d7d7cf` / `2609248dfc6d792c4d36947ff4bd857faaa745cf` / `sha256:a4ff525649dfd622d4171974ed3b43da863c8918e81aad08b546a5a32d00e161` |
| committed-Kmd audit | `sha256:39615ce9ff7717168980cf835b3fc5fd261e38111fd47084413d12a1ce68e763` / 0 Blocker / 0 Important |
| committed-Lmd audit | `sha256:13ec375feb590b8a756d5f2be9f8982e4fb47463043a8a503955a33c82d4c325` / 0 Blocker / 0 Important |

## Frozen machine artifacts

| Artifact | SHA-256 |
|---|---|
| artifact index | `sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c` |
| strict evidence schema | `sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440` |
| machine evidence | `sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011` |
| runner | `sha256:cf4ab4996225b06834dfd8919ea5e0f8d3f602e172e783e69f300065275fa81a` |
| runner test | `sha256:d109b72e11abef24968de02f9fdcc1873da0a9fd4fea1d20cd41960fe31c34b2` |

The strict evidence validates under Ajv 2020-12 with strict schema checks and
rejects top-level, nested, authority, lineage, workset, ceiling, validation,
effect, documentation, readiness and stop mutations. The artifact index and
evidence bind only committed Kmd bytes; neither artifact contains its own hash.

## Constructed diagnostic boundary

The new authority family is independent from all physical, cleanup and
Integration Campaign grants. A later exact Card/Review may authorize at most:

- one prepare, one consumption and one diagnostic lifecycle;
- one `docker version --format {{json .}}` call;
- one `docker image inspect --format {{json .}} <exact pinned reference>` call;
- zero pulls and zero container/network/volume create, start, stop, remove or
  cleanup operations; and
- zero PostgreSQL processes, pools, connections, databases, SQL or product
  runtime effects.

The parser retains only process fingerprints and the eight-field typed tuple:
exact RepoDigest presence, top-level OS/architecture, descriptor digest, media
type, size and descriptor platform OS/architecture. Raw output and unlisted
JSON fields are discarded and buffers are zeroed where feasible. Index digest,
platform-manifest digest and a distinct digest are all recorded as observations
without deciding which value should replace any repository pin.

## Validation

| Lane | Result |
|---|---:|
| focused image-manifest diagnostic, deny-network | 6 / 6 |
| full local PostgreSQL runner, deny-network | 182 / 182 |
| focused non-runner Public Core, deny-network | 85 / 85 |
| all Public Core, deny-network | 434 / 434 |
| all R4 offline | 754 / 754 |
| Gate-B Core | 146 / 146 |
| repository spine | 45 / 45 |

Runner syntax, TypeScript, strict Ajv, hosted-room no-server-AI, legacy docs
regression and diff checks are Green. Tests cover exact tuples, missing image,
missing/non-SHA descriptor, malformed JSON, reference/platform mismatch,
nonzero exit, timeout, signal, CLI/socket drift, strict grant/journal/receipt
mutations, exact argv and zero wider effects.

## Effect audit

Construction changed exactly 15 paths across three commits: Kmd 2 modified,
Lmd 3 added, Mmd 1 added plus 9 modified. Dependency, lockfile and SQL changes
are zero. External network, failed-root reads/mutations, pending or consumed
diagnostic grants, Docker CLI/socket/daemon, image pulls, cleanup, PostgreSQL,
SQL, product runtime, Production and Gate C effects are all zero.

## Honest boundary and next step

This report establishes repository Technical Review only. It does not claim
that the image tuple has been physically observed, that the manifest pin is
corrected, that a replacement campaign is authorized, that PostgreSQL has been
reached, or that #67/R4 is Done.

The next repository step is to construct and independently audit the reserved
versioned Diagnostic Card and Owner Review. No diagnostic prepare or Docker
call may occur until the Owner separately approves their exact committed bytes.

Mandatory stop:

`LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
