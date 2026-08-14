# R4 #67 Local PostgreSQL Integration Campaign — Construction Packet

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-14
- Scope: repository-only construction of one medium-grained local integration campaign
- Replacement Diagnostic: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Cleanup: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Physical Execution: **NOT_AUTHORIZED_BY_THESE_BYTES**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Decision in plain language

Stop asking the Owner to approve every implementation commit and every hash.
Construct one bounded local campaign that can later, under one separate exact
effect approval, move through this closed sequence:

1. run one body-free diagnostic over the exact historical container, network
   and volume names;
2. if and only if an existing resource proves the exact frozen historical
   ownership label, remove that exact-owned resource and prove absence;
3. only after all three historical names are proven absent, run one fresh
   disposable PostgreSQL rehearsal; and
4. finish with either complete local wiring evidence and zero owned residue or
   one exact fail-closed result that cannot retry.

This Packet requests repository construction only. It does not approve a
pending grant, forensic-root read, Docker/socket call, cleanup, image pull,
PostgreSQL process, SQL, production action or Gate C.

## Why a campaign is the right granularity

The earlier workflow separated construction, diagnostic, cleanup and physical
rehearsal into many hash-specific approvals. That made every safe correction
legible, but it also turned implementation chronology into the Owner's work.
The current [working agreement](../AGENTS.md) now uses an outcome envelope:
the Owner approves the outcome, workset, effect ceilings, validation and stop;
ordinary implementation, repair, evidence and commits then proceed inside it.

The campaign preserves the important safety boundary: repository construction
is approved first; after final implementation hashes exist, one versioned
Execution Card/Review and one exact Owner approval may authorize the entire
conditional local effect. There is no effect approval hidden in this Packet.

## Frozen baseline

| Binding | Exact value |
|---|---|
| baseline HEAD / tree | `1e46cb589e7cdebb1566d28bbdd6e13cd4066946` / `a7bd77c67bb5b002cbcf6c56495e1b24fba09262` |
| baseline parent / status commit | `852744e7e1210c5faf1968b257c4221c1693ebf4` / `852744e7e1210c5faf1968b257c4221c1693ebf4` |
| prepare-correction `Kp` HEAD / tree | `eaca190eb36fa45ea12077956a4a4b1433102c16` / `ec98c83bab6c12be04e7c02e1738ed113da73f64` |
| prepare-correction `Lp` HEAD / tree | `7a31dbaa385be561acac4fc21f017a804be4a68c` / `d6e2dc39b693091069ed92f6bcef8ce79e533cc4` |
| `G2p` / `G3p` | `sha256:84254f0f408be406b8e87a3468dbb0f67abfc49b183abf65db6fa74f4d6929e0` / `sha256:6aec3a9e4c867403ec7e3f0c08f4892aa40129b39a83850a4eb04d6894538a26` |
| correction index / schema / evidence | `sha256:7854774fc10c58e5da6475fc97da6997102822fd406f6abdb0d8cbf209794bc0` / `sha256:2a44cf5e6a8f19ed1d8db4ed75b533c5fb42c650f76dea03cf885ca86b55a532` / `sha256:58a56f97e6eb79ed6c7871c5dd2bb98eeab44283151ffaedfbfa703d38b8d8a1` |
| correction report | `sha256:1ab67cdd1b0c0c8359570c74999a21fb77a86943de4aeca21a531a54679d8aac` |
| current Gate C Card | `sha256:50300238c5cf28bd9dfd42fcaea3d22ae6d0038a3c8d0e0f54547332ed86356e` |
| outcome-envelope working agreement | `sha256:ccc70923866c4b24babe8bd4648020410ea9ff38e1ce956827a6abe34464fda0` |

The baseline is clean except the Owner-owned ignored/untracked
`native/macos/.build/`, whose contents are outside this campaign and must not be
read, staged, changed or removed.

## Immutable failed histories

The implementation must continue to bind and reject reuse of:

- physical consumed grant
  `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`,
  final evidence
  `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`
  and journal `34` /
  `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`;
- rescue consumed grant
  `sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654`,
  final evidence
  `sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979`
  and journal `6` /
  `sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491`;
- Diagnostic Card V1
  `sha256:1cd345018dc6ddbf393df873bca01a54fcb75f8e608f9f63a48c9f61fd06319e`,
  Review V1
  `sha256:324af94569b0c54456e474230bc06b3e7f15573ee97ec4a46c5886d56969abed`
  and payload
  `sha256:53188dac86131bf4910f06dc8dd64e7f1127d29cd55f21882960ab674a24262d`;
- the failed V1 prepare root
  `/private/tmp/forme-r4-body-free-inspect-hbBcXlvY`, identity
  `16777231 / 33551700 / 0700 / 501`, containing exactly its 1,072-byte Owner
  receipt with SHA-256
  `4baf2407b90fe8f1da54b9dcb12eb9071fe2e07c4fcad5a420b1ee29a8f924953`.

The two consumed grants and the failed V1 prepare authority are permanently
non-retryable. The three historical roots are read-only forensic inputs.

## Nine construction choices

Owner approval accepts these choices together:

1. **Use one outcome envelope.** Construction may proceed from runner/test
   through evidence, status reconciliation and commits without new per-file,
   per-test, per-commit or recomputed-hash approval, so long as it remains
   inside the exact workset and zero-effect ceiling below.
2. **Build one campaign state machine.** The runner must use one new closed
   campaign grant/journal/receipt family. It must not revive or reinterpret the
   V1 diagnostic or prior physical/rescue grants.
3. **Keep diagnosis body-free and read-only.** The future diagnostic phase may
   inspect only Docker version and the exact historical container, network and
   volume names. It may retain only bounded byte counts, hashes, line/JSON
   shape and closed ownership/classification facts, never raw output bodies or
   arbitrary labels.
4. **Make cleanup conditional on exact ownership.** `MISSING` continues;
   `OWNED` permits only the exact matching historical name whose
   `forme.r4.public-core.local.grant` label equals the frozen physical grant;
   `FOREIGN`, `UNLABELLED`, `MALFORMED`, `UNKNOWN`, host drift or ambiguity
   stops without cleanup or physical execution.
5. **Require absence before construction.** The future physical phase cannot
   begin until container, network and volume are each durably proven absent
   after diagnostic/conditional cleanup. No inferred or body-text absence is
   sufficient.
6. **Reuse the already frozen physical rehearsal semantics.** Preserve the
   pinned PostgreSQL image/platform, loopback-only stack, two database
   identities, server version `160010`, static catalog `14 / 207 / 172 / 44`,
   three apply/verify passes, one rollback, one restart and 23/20 domain-action
   contract. Rebind it to the final campaign implementation rather than the
   consumed V2 physical authority.
7. **Reserve every effect before invocation.** One campaign consumption, one
   diagnostic phase, at most one conditional cleanup phase, one physical
   construction phase and at most two cleanup-only physical recoveries are
   permitted. A crash, timeout, signal, ambiguity or exhausted ceiling consumes
   the relevant budget and never grants retry.
8. **Close evidence and residue exactly.** Final Green requires zero owned
   container/network/volume, secret, imported runtime, Docker config and
   active coordinator residue. The pinned image cache is the only allowed
   Docker residue. A cleanup-blocked result stops for new rescue authority.
9. **Preserve product gates.** This campaign is local disposable integration
   only. Production database, runtime route, Room mutation, publication,
   Curator admission, real Guest data, Provider/model/email, public traffic,
   deploy, release, spend and Gate C remain zero and separately gated.

## Exact repository construction topology

After this Packet and its Review are committed and exactly approved, construct
three direct, single-parent commits:

1. `Ki`: modify exactly
   `scripts/r4-public-core-local-postgres.mjs` and
   `test/r4/public-core-local-postgres.test.ts`;
2. `Li`: add exactly
   `schemas/r4/public-core/local-postgres-integration-campaign-artifact-index.json`,
   `schemas/r4/public-core/local-postgres-integration-campaign-evidence.schema.json`
   and
   `docs/evidence/r4-public-core-local-postgres-integration-campaign.json`;
3. `Mi`: add
   `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-CONSTRUCTION-REPORT.md`
   and modify exactly `README.md`, `docs/CONTROL.md`, `docs/DECISIONS.md`,
   `docs/README.md`, `docs/NATIVE-HARNESS-ARCHITECTURE.md`, `docs/PRODUCT.md`,
   `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`, `docs/ROADMAP.md` and
   `docs/VALIDATION.md`.

Total construction is exactly 15 paths across three commits: `4A / 11M / 0D /
0R`, with no mode change. Historical machine evidence and authority documents
remain byte-frozen.

The later effect-authority proposal paths are reserved but are not part of the
construction workset:

- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-CARD-V1.md`
- `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-OWNER-REVIEW-V1.md`

They must be direct add-only successors of final committed `Mi`, bind final
runner/evidence/status hashes, and return for one exact Owner approval. No
intermediate implementation approval is required.

## Future effect design ceiling

Construction must encode and fake-test the following ceiling. These Packet
bytes do not authorize consuming it.

### Campaign authority

| Effect | Maximum |
|---|---:|
| pending campaign grants / consumption | `1 / 1` |
| diagnostic / historical cleanup / physical construction phases | `1 / 1 / 1` |
| physical cleanup-only recovery phases | `2` |
| anonymous pinned-image pulls | `1` |
| concurrent Pools / Clients / transactions | `1 / 1 / 1` |
| fresh run-owned container / network / volume | `1 / 1 / 1` |
| fresh run-owned databases | `2` |

### Diagnostic and historical cleanup sub-ceiling

| Docker call | Maximum |
|---|---:|
| `version` | `1` |
| `container.inspect` | `2` |
| `network.inspect` | `2` |
| `volume.inspect` | `2` |
| `container.stop` | `1` |
| `container.rm` | `1` |
| `network.rm` | `1` |
| `volume.rm` | `1` |
| every image/create/start/unlisted call | `0` |

The second inspect of a kind is available only after exact-owned cleanup and
must prove absence. Missing resources spend only the first inspect. Stop/remove
is forbidden for any resource without the exact historical name and label.

### Fresh physical sub-ceiling

Preserve the V2 physical maxima: `version=3`, `image.inspect=2`,
`image.pull=1`, `container.inspect=8`, `container.create=1`,
`container.start=2`, `container.stop=4`, `container.rm=3`,
`network.inspect=7`, `network.create=1`, `network.rm=3`,
`volume.inspect=7`, `volume.create=1`, `volume.rm=3`.

Preserve readiness `60 / 60`, operational/total Pool construction `4 / 124`,
connection attempts `124`, schema apply/verify/rollback `3 / 3 / 1`, domain
invocations/distinct actions `23 / 20`, restart `1` and admin database create
`1`. Per-phase counters prevent spending historical-cleanup quota on fresh
physical resources or vice versa.

## Required validation

Before `Ki` may freeze, the runner/test must prove with injected fakes and no
real socket or Docker/PostgreSQL port:

- exact authority topology and committed-byte binding through this Packet and
  Review;
- strict closed grant, journal, receipt and canonical payload schemas;
- all diagnostic classifications for container/network/volume;
- exact-owned conditional cleanup, foreign/unlabelled/malformed denial and
  absence-before-physical gating;
- write-ahead crash edges before/after every externally effectful call;
- one-use, no-retry, expiry, host identity, clock rollback, journal headroom,
  duplicate/re-entry and cleanup-recovery ceilings;
- exact PostgreSQL sequence, SQL hashes, catalog counts, concurrency and final
  zero-residue rules;
- hostile receipt/grant/journal mutations and cross-binding;
- zero Docker/socket/PostgreSQL/network effects in ordinary tests.

Run at least the local runner deny-network suite, complete `test:r4:offline`,
`test:r4:gate-b-core`, `test:spine`, `typecheck`, strict Ajv plus mutation
matrix, docs audit and diff checks. Any Red, unbound executable byte, unlisted
path or weaker test stops inside construction and does not expand authority.

## Zero-effect ceiling of this construction decision

| Effect | Authorized by this Packet/Review construction envelope |
|---|---:|
| repository paths | exact 15 above |
| construction commits | exact 3 above |
| dependency / lock / SQL changes | `0 / 0 / 0` |
| forensic-root reads / mutations | `0 / 0` |
| pending / consumed campaign grants | `0 / 0` |
| Docker CLI / socket / daemon / OCI | `0 / 0 / 0 / 0` |
| PostgreSQL process / connection / database / SQL | `0 / 0 / 0 / 0` |
| product runtime / production / traffic / Gate C | `0 / 0 / 0 / 0` |
| Provider / message / deploy / publication / release / spend | `0 / 0 / 0 / 0 / 0 / US$0` |

## Stops

Before exact Owner approval of this Packet and Review:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_OWNER_APPROVAL_REQUIRED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After repository construction and committed-byte Technical Review Green:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_LOCAL_INTEGRATION_CAMPAIGN_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a later approved campaign reaches complete physical Green:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

A body-free diagnostic ambiguity, foreign/unlabelled resource, cleanup block,
host drift, ceiling breach or physical mismatch instead stops with exact failed
evidence and `OWNER_REVIEW_REQUIRED`. It cannot retry or continue to the next
phase. No campaign outcome makes #67 or R4 Done; production activation and one
real Guest encounter remain later gates.
