# R4 Gate B Schema, Runtime, and Migration Manifest v0.1

- Status: **approval candidate for exact local/ephemeral validation; not yet
  approved or executed**
- Parent authority: R4 Technical Control Packet v0.2
- Parent Packet SHA-256:
  `e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Gate A evidence:
  [`R4-GATE-A-VERIFICATION.md`](./R4-GATE-A-VERIFICATION.md)
- Owner decision surface:
  [`R4-GATE-B-OWNER-REVIEW.md`](./R4-GATE-B-OWNER-REVIEW.md)
- First Provider-Call Test Grant: **NOT REQUESTED**
- Authorized provider sessions / bytes / spend if this Manifest is approved:
  **0 / 0 / US$0**

This file deliberately does not contain its own SHA-256 or the Git commit that
contains it. Both are external approval-card values; embedding either would
create a self-reference. The approval card must bind this file's final
SHA-256, the containing commit/tree, and the final Gate A evidence hash.

## 1. Exact decision and stop boundary

Gate A implemented the R4 contract with synthetic identities and content,
in-memory hosted persistence, fake provider/connector/email boundaries, and
local temporary files. Gate B is allowed to replace only four fake boundaries
with **local or disposable validation targets**:

1. an exact PostgreSQL 16 migration, role/grant model, transaction/constraint
   proof, and application-layer encrypted-field adapter in a disposable
   container;
2. a zero-provider-call capability probe against the exact official Codex
   build named below;
3. a macOS test launcher/protection build that proves—or fails closed on—the
   physical boundary named by the Packet; and
4. a fake upstream transport replay that proves hard dispatch, token, output,
   time, and spend accounting without opening a network connection.

Approval authorizes repository files, local compilation, synthetic test
secrets, a temporary test Keychain, an ephemeral Docker network/container/
volume, the pinned public PostgreSQL image download, and body-free technical
evidence for those four tasks. It does **not** authorize a model call, a real
Guest or email address, an external message, hosted/production mutation,
production migration, deployment/public traffic, production credential, merge,
or spend.

Any missing command, missing hash, unsupported host capability, unexpected
network/tool surface, test failure, or version drift stops that lane. No prompt,
command allowlist, private Codex fork, or weaker substitute is allowed.

## 2. Current Gate A implementation binding

### 2.1 Toolchain and dependency lock

| Item | Exact Gate A value |
|---|---|
| Repository package | `forme@0.1.0`, private npm workspace |
| Node contract | `>=24.0.0`; observed validation host `v24.14.1` |
| npm | `11.11.0`; lockfile format `3` |
| TypeScript | `7.0.2` |
| Next.js Node runtime | `16.3.0`; self-hosted Node target, not Vercel runtime |
| React / React DOM | `19.2.8` / `19.2.8` |
| Validation | `ajv@8.20.0`, `ajv-formats@3.0.1` |
| Type packages | `@types/node@24.13.3`, `@types/react@19.2.18`, `@types/react-dom@19.2.4` |
| Test runner | Node built-in `node:test`; no Jest/Vitest/property-test runtime |
| Cryptography | Node built-in `node:crypto`; no third-party crypto package |
| Database/model/email SDK | none in Gate A |
| Root lockfile SHA-256 | `d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |
| Root `package.json` SHA-256 | `ef5e5817ea510d0fc808676e62bff874b618c2fd88b602846891290015052374` |

The lockfile is the complete transitive dependency authority. Gate B adds no
npm package. A lockfile change invalidates this Manifest.

### 2.2 Canonical protocol and golden vectors

The current external protocol registry contains **38** versioned objects. The
single Draft 2020-12 bundle contains those 38 objects plus 12 supporting
definitions (50 `$defs` total).

| Binding | Exact value |
|---|---|
| Bundle | `schemas/r4/protocol.schema.json` |
| Bundle SHA-256 | `da8653dbabd435f8e6be012a988ee1343c39e8c0c354e060ffec2591f4004011` |
| Index | `schemas/r4/schema-index.json` |
| Index SHA-256 | `6112c872203950ba12a09d3f44a9eb453a73fe5b8552d7e6cdc6657e63fda51c` |
| Registry order hash | `sha256:d9a8e2ab94968aa4fa21e1a2299e9f494b6e918f732c9d70998cfbcb7fe49403` |
| Golden fixture bundle | `sha256:884763fc607c98d7ff7772853cf9beaaa1c567b6bd2b9ad97ded5c7cbf020515` |
| Canonical sample | `{"a":"é","b":2}` → `sha256:06c264c46ad5ada9493abd3aa2383fb205ae99d7d0bad40b03a43bfec8a1b8de` |
| Parent Packet embedded by index/package | `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5` |

Exact registry order:

```text
room.v1
projection_capsule.v1
projection_lifecycle.v1
projection_basis.v1
public_encounter.v1
grant.v1
grant_offer.v1
direct_grant_invite.v1
agent_derivative.v1
guest_capsule.v1
consent_envelope.v1
interaction.v1
response.v1
artifact_approval.v1
notification_endpoint.v1
ready_notice.v1
response_orientation.v1
response_source_policy.v1
response_source_snapshot.v1
session_envelope.v1
response_candidate.v1
fresh_cycle_reservation.v1
dispatch_permit.v1
session_receipt.v1
operation_receipt.v1
api_mutation_envelope.v1
room_event.v1
room_event_batch.v1
cursor_gone.v1
room_event_ack.v1
room_event_ack_receipt.v1
projection_read_view.v1
room_operator_request.v1
snapshot_line_read.v1
snapshot_search.v1
snapshot_query_result.v1
transport_dispatch_intent.v1
transport_gate_decision.v1
```

The two protocol interfaces are:

- `SnapshotQueryBrokerV1` = `SnapshotLineReadV1` |
  `SnapshotSearchV1` → `SnapshotQueryResultV1`;
- `ResponseTransportGateV1` = `TransportDispatchIntentV1` →
  `TransportGateDecisionV1`.

Gate B may replay these exact bytes and add SQL/storage mappings. It may not
change a field, enum, limit, hash rule, or semantic transition. Any such change
returns to an Owner stop gate with a new Manifest.

### 2.3 Current source/snapshot/broker policy hashes

| Policy | Exact Gate A value |
|---|---|
| `ResponseSourcePolicyV1` | `sha256:614377dde9f392b97947cd100e356d6342a204fefb6b4d84d5090ca4debc40b6` |
| secret-pattern policy | `sha256:8bb3a1ec21b0e88e88d8292ff1b28578bcc76aa6a2c4c49508fde4eafeee967f` |
| broker policy | `sha256:7945102051b25afdc5181470f0f32a0b62c08cec551f0566775a68da3a6f62a1` |
| file / total snapshot ceiling | 512 KiB / 8 MiB |
| one line read | 200 lines and 32 KiB |
| one search | 256-byte pattern, 100 matches, 64 KiB result, 500 ms target |
| regex state | RE2 is unavailable in Gate A; every `re2` request is denied |

Gate B may either prove a concrete RE2-compatible engine without changing the
limits or retain literal-only search. It may not fall back to JavaScript
`RegExp`.

### 2.4 Exact repository file inventory

The Gate A source inventory is the **90-file** path/SHA-256 list in Appendix A;
the SHA-256 of the exact `shasum` output (including sorted paths and newlines)
is `fd27d41a8abfe672264c374608faa1f584779b26bf66f669d063ec6a73149a2e`.
It covers
the root build/CLI files and every non-generated file under
`packages/r4-protocol`, `packages/r4-local`, `apps/room`, `schemas/r4`,
`scripts`, and `test/r4`. `.next`, `node_modules`, `*.tsbuildinfo`, temporary
evidence, and the two decision documents are excluded because they are build
output, dependencies, or self-changing approval bytes.

Inventory method:

```text
LC_ALL=C find <listed roots> -type f \
  ! -path '*/node_modules/*' ! -path '*/.next/*' ! -name '*.tsbuildinfo' \
  -print0 | sort -z | xargs -0 shasum -a 256
```

## 3. Current API and action map

The canonical prefix is `/api/v1`. Gate A implements exactly **43** operation
definitions. All 37 mutations require a client idempotency key with at least
128 bits; the application canonicalizes `{actor, action, expectedVersion,
params, body}` through `ApiMutationEnvelopeV1`. Routes marked `v` also require
the current object version. Gate A Controller/Curator/Room-operator identity is
synthetic header injection only; real Access assertions are Gate C.

Exact implementation binding: `apps/room/src/operation-inventory.ts` at
`sha256:5482345bbd5569d2639e3e801697ae908cd37b849c29e62251e38beb905028cb`
and `apps/room/src/application.ts` at
`sha256:9f136cbcab6f954917f0f5476d30c0dba99ebd7455a3a49f77cf3d76ea6271df`.

### Public and Guest (12)

| Action | Method and path | Actor / version |
|---|---|---|
| `third_place.list` | `GET /third-place/projections` | public |
| `projection.read` | `GET /projections/:projectionId` | public or exact Grant |
| `public_encounter.issue` | `POST /projections/:projectionId/encounters` | public, `v` |
| `interaction.create` | `POST /interactions` | exact Guest capability |
| `interaction.read` | `GET /interactions/:interactionId` | exact reply capability |
| `interaction.delete` | `DELETE /interactions/:interactionId` | exact delete/reply capability, `v` |
| `notification.set` | `PUT /interactions/:interactionId/notification` | exact reply capability, `v` |
| `notification.remove` | `DELETE /interactions/:interactionId/notification` | exact reply capability, `v` |
| `notification.verify` | `POST /interactions/:interactionId/notification/verify` | verification capability, `v` |
| `grant_offer.accept` | `POST /grant-offers/:offerId/accept` | exact reply capability, `v` |
| `direct_invite.redeem` | `POST /direct-invites/:inviteId/redeem` | one-use invite, `v` |
| `agent_derivative.mint` | `POST /agent-derivatives` | allowed Manual capability |

### Controller and Curator (19)

| Action | Method and path | Actor / version |
|---|---|---|
| `control.status` | `GET /control/status` | Controller |
| `control.interaction.read` | `GET /control/interactions/:interactionId` | Controller |
| `room.create` | `POST /control/rooms` | Controller |
| `room.pair` | `POST /control/rooms/:roomId/pairings` | Controller, `v` |
| `room.mode.set` | `POST /control/rooms/:roomId/mode` | Controller, `v` |
| `room.retire` | `POST /control/rooms/:roomId/retire` | Controller, `v` |
| `room.delete` | `DELETE /control/rooms/:roomId` | Controller, `v` |
| `projection.revoke` | `POST /control/projections/:projectionId/revoke` | Controller, `v` |
| `response.revoke` | `POST /control/responses/:responseId/revoke` | Controller, `v` |
| `grant.issue` | `POST /control/grants` | Controller |
| `grant.replace` | `POST /control/grants/:grantId/replacements` | Controller, `v` |
| `grant.revoke` | `POST /control/grants/:grantId/revoke` | Controller, `v` |
| `grant_offer.issue` | `POST /control/grant-offers` | Controller |
| `grant_offer.revoke` | `POST /control/grant-offers/:offerId/revoke` | Controller, `v` |
| `direct_invite.issue` | `POST /control/direct-invites` | Controller |
| `direct_invite.revoke` | `POST /control/direct-invites/:inviteId/revoke` | Controller, `v` |
| `interaction.close` | `POST /control/interactions/:interactionId/close` | Controller, `v` |
| `curation.admit` | `POST /curation/projections/:projectionId/admit` | Curator, `v` |
| `curation.unlist` | `POST /curation/projections/:projectionId/unlist` | Curator, `v` |

### `room_operator.v1` (12)

| Action | Method and path | Exact purpose / version |
|---|---|---|
| `room_operator.status` | `GET /room-operator/status` | body-free exact Room status |
| `room_operator.sync` | `POST /room-operator/sync` | `RoomEventBatchV1` only |
| `room_operator.pull` | `POST /room-operator/interactions/:interactionId/pull` | protected exact-body pull, `v` |
| `room_operator.cycle.reserve` | `POST /room-operator/interactions/:interactionId/cycle/reserve` | exact start/envelope, `v` |
| `room_operator.cycle.recover` | `POST /room-operator/interactions/:interactionId/cycle/recover` | same reservation only, `v` |
| `room_operator.cycle.abandon` | `POST /room-operator/interactions/:interactionId/cycle/abandon` | zero-dispatch release, `v` |
| `room_operator.dispatch.issue` | `POST /room-operator/interactions/:interactionId/dispatch-permits` | exact 30-second permit, `v` |
| `room_operator.ack` | `POST /room-operator/events/ack` | `RoomEventAckV1` / receipt |
| `room_operator.projection.deliver` | `POST /room-operator/projections/deliver` | exact capsule+basis+approval, `v` |
| `room_operator.response.deliver` | `POST /room-operator/responses/deliver` | exact candidate+approval, `v` |
| `room_operator.stale.attest` | `POST /room-operator/projections/:projectionId/stale` | deterministic attestation, `v` |
| `room_operator.local_purge.receipt` | `POST /room-operator/interactions/:interactionId/local-purge` | verified local absence, `v` |

Current application request/result wrappers that are not among the 38 protocol
objects remain **Gate A synthetic DTOs**, not stable production wire contracts.
Gate B persistence work must map the canonical objects and operation receipts
without widening these 43 actions. Gate C later binds real auth, origins,
headers, rate buckets, and deployment facts.

## 4. Current local formats and honest limits

| Format / location class | Gate A bytes and rule | Status entering Gate B |
|---|---|---|
| `r4.local-room-ledger.v1` | one canonical JSON file per Room; cursor, high-water, body-free events, ACK outbox, receipts, tombstones, quarantine, cleanup flag, version; atomic `0600` write + fsync | implemented synthetic/local |
| `local_room_event_ack_outbox.v1` | exact `RoomEventAckV1` plus body-free server receipt ID | implemented |
| `r4.body-free-receipt.v1` | Room/action/object/request hash/outcome/error/time only | implemented |
| `local_encrypted_response_candidate.v1` | outside Workspace; AES-256-GCM ciphertext, 96-bit IV, tag, wrapped-key reference, exact Room/Projection/Interaction/basis/policy/candidate hashes and expiry | implemented with synthetic in-memory key protector only |
| `r4.candidate-cleanup-journal.v1` | deny first → destroy key → remove ciphertext → receipt; idempotent reconcile | implemented |
| `r4.candidate-cleanup-receipt.v1` | append-only body-free JSONL | implemented |
| `r4.local-lock.v1` | one `O_EXCL` Room lock with process/boot/nonce/operation/time; live or ambiguous owner fails closed | implemented local analogue |
| `local_fresh_start_authorization.v1` | exact Interaction/session/orientation/snapshot/probe/runtime hashes and 60-minute authority | implemented, no real launcher |
| `local_fresh_run_marker.v1` | body-free active/cleanup-required marker; synthetic runtime bytes live only in a disjoint temp root | implemented fake runtime only |
| `local_fresh_run_cleanup_receipt.v1` | terminal class and `runtime_bytes_absent` | implemented fake runtime only |
| Guest CLI secure input | capability/body via stdin descriptor; locally generated recovery secrets leave only the dedicated secret output, never ordinary stdout/argv | implemented interface/fake-port proof |

The current `SyntheticUserPresenceKeyProtector`, `SyntheticPresenceStore`,
synthetic actor headers, plaintext-in-memory fake notification address, and
`FakeResponseTransportGate` are explicitly **not** production adapters. Gate B
may validate their real local/SQL counterparts only as specified below.

## 5. Exact Gate B repository work and validation

The paths and commands in this section are the complete Gate B work request.
They do not exist as proof merely because this Manifest names them. After
approval, their implementation and result hashes must be returned for review.

### 5.1 Disposable PostgreSQL 16 and encrypted fields

#### Runtime pin

| Item | Exact value |
|---|---|
| Docker client/server observed for preparation | `29.3.1` / `29.3.1` |
| Image tag identity used to resolve the pin | `postgres:16.10-bookworm` |
| OCI index digest | `sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74` |
| Linux arm64/v8 manifest digest | `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf` |
| Required in-container version assertion | `postgres (PostgreSQL) 16.10` |
| Network | disposable Docker bridge only; no host port and no public listener |
| Authentication | synthetic trust inside that isolated disposable network only |

The registry digest lookup performed while preparing this Manifest was
read-only. The image was not pulled or run. Approval permits the pinned image
download and local ephemeral run; digest/version mismatch stops before SQL.

#### Exact files Gate B may add

```text
schemas/r4/sql/0001_r4_presence.sql
schemas/r4/sql/0001_r4_presence.verify.sql
packages/r4-persistence/package.json
packages/r4-persistence/src/encrypted-field.ts
packages/r4-persistence/src/index.ts
scripts/r4-gate-b-postgres.mjs
test/r4-gate-b/postgres-schema.test.ts
test/r4-gate-b/encrypted-field.test.ts
```

No other database package, ORM, migration framework, or networked database
service is authorized. `r4-persistence` uses Node built-ins; SQL is executed by
the pinned container's `psql`.

#### Exact schema namespace and table set

Schema: `forme_r4`. Migration ledger: `forme_r4.schema_migrations`.

```text
actor_subjects, actor_roles,
third_places, third_place_events,
entities, rooms, room_lifecycle_events,
projections, projection_lifecycle_events, curation_events,
room_bindings, pairing_challenges,
public_encounters,
grants, grant_offers, direct_grant_invites, agent_derivatives,
capability_events,
interactions, interaction_lifecycle_events,
fresh_cycle_reservations, dispatch_permits,
responses, response_lifecycle_events,
notification_endpoints, notification_challenges,
notification_outbox, notification_attempts,
room_event_stream, operation_receipts, idempotency_records,
rate_buckets, retention_jobs, purge_watermarks, operator_incidents
```

Every protocol-bearing row stores its `schema_version`, opaque ID, canonical
payload hash, lifecycle/version columns, and timestamps. Private plaintext is
forbidden. Exact encrypted columns are:

```text
interactions.request_ciphertext
interactions.guest_capsule_ciphertext
responses.body_ciphertext
notification_endpoints.address_ciphertext
notification_outbox.target_ciphertext
```

The SQL must enforce, with constraints/indexes/functions and two-order race
tests rather than comments:

- immutable Room kind and allowed mode/status combinations;
- one current Projection per Room and monotonic curation/owner lifecycle;
- one unresolved Interaction per capability/re-entry chain;
- accepted-only shared 1/2/3/10 quota and rolling public 20/24h pool;
- one live continuation Grant per exact Room/Projection/re-entry chain;
- replacement revokes prior and transfers no quota;
- one live GrantOffer per Interaction; invite/offer one-use and fixed expiry;
- one Fresh cycle and one current Response per Interaction;
- exact idempotency replay, different-hash `409`, terminal precedence, and no
  body readability after a destructive terminal;
- contiguous per-Room sequence/high-water and exact ACK identity;
- one semantic ready notice, lease/reconciliation/no-future-retry monotonicity;
- 30-day Interaction, 7-day Response, 37-day body-free receipt/tombstone, and
  Room-life high-water constraints without retaining body/address/secret.

Global transactional lock order is:

```text
Room advisory key
→ Room row
→ Projection row
→ capability / Grant / re-entry row (opaque ID byte order)
→ Interaction row
→ Fresh-cycle / dispatch-permit row
→ Response row
→ notification endpoint / outbox row
→ idempotency row
→ Room event high-water row
→ retention / purge row
```

Janitor first takes one dedicated advisory lock, then uses the same per-Room
order in deterministic bounded batches. A transaction may skip an absent class
but never invert the order.

#### Exact roles and grant intent

All are `NOINHERIT`; only disposable synthetic login wrappers may assume them.

| Role | Allowed | Explicitly denied |
|---|---|---|
| `forme_r4_migrate` | create/alter/drop only `forme_r4`; own migration ledger during one-shot apply | other DB/schema, server role/config, network, application run |
| `forme_r4_app` | execute semantic transaction functions; select body-free/status views; no direct DDL | role/DDL, raw key, cross-purpose audit/janitor/notify |
| `forme_r4_janitor` | execute `purge_due` and write body-free purge receipts/watermark/incidents | decrypt/read plaintext, actor/capability issuance, notify |
| `forme_r4_notify` | claim/reconcile notification outbox and attempts through exact functions | Room/Projection/Interaction body tables except one encrypted target returned by claim function |
| `forme_r4_audit` | select body-free audit views only | ciphertext columns, mutation, secrets, roles/DDL |

The application-layer encrypted envelope is `a256gcm.v1`: AES-256-GCM, random
96-bit nonce, 128-bit tag, key ID
`r4.hosted.gate-b.synthetic.v1`, and canonical AAD:

```json
{"schemaVersion":"encrypted_field_aad.v1","table":"<exact table>","rowId":"<opaque id>","column":"<exact column>","roomId":"<room id>","objectVersion":1}
```

The 32-byte synthetic key enters through a dedicated inherited file descriptor,
never argv, source, stdout, or evidence. Tests cover round trip, wrong key,
tamper, truncation, nonce duplication detection, cross-row/column/Room swap,
error redaction, terminal unreadability, and a full disk/JSON/error canary scan.
The key and container/volume/network are destroyed at the end. This does not
select a production KMS or production key.

Exact commands to add and then run:

```text
npm run r4:gate-b:postgres
npm run r4:gate-b:encrypted-field
```

Both commands fail if the Docker target is not the exact pinned digest/version,
if any host port is published, or if teardown leaves the named Gate B resources.

### 5.2 Official Codex zero-call adapter proof

#### Exact preparation-time runtime identity

| Item | Exact value |
|---|---|
| Distribution | official npm `@openai/codex@0.145.0` / `codex-cli 0.145.0` |
| JS launcher SHA-256 | `134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477` |
| Darwin arm64 binary SHA-256 | `1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590` |
| Code-mode host SHA-256 | `c75e27ea296ede4025959e4f66772c283261f28d95b1f27be4d8ef07aabe9bce` |
| Adapter candidate | `codex app-server --listen stdio://` and generated official JSON Schema |
| Session/thread/turn count | zero |
| Model ID | none selected; a model is forbidden in this Manifest |
| Account/auth regime | isolated empty `CODEX_HOME`; Owner auth is not mounted or read |
| Transport | OS-denied; no OpenAI or other network endpoint reachable |

Exact files Gate B may add:

```text
packages/r4-codex-adapter/package.json
packages/r4-codex-adapter/src/app-server-probe.ts
packages/r4-codex-adapter/src/event-fence.ts
packages/r4-codex-adapter/src/index.ts
scripts/r4-gate-b-codex-probe.mjs
test/r4-gate-b/codex-adapter.test.ts
fixtures/r4-gate-b/codex-app-server-0.145.0-schema.sha256
```

Exact command:

```text
npm run r4:gate-b:codex-probe
```

The command may run only version/help, official schema generation, app-server
`initialize`, effective-config/tool inventory, and hostile no-network/no-file
capability probes. Its launcher guard rejects every `thread/start`,
`turn/start`, `exec`, model request, auth lookup, remote listener, websocket,
MCP/plugin/Skill/hook/browser/web/image/subagent surface, and any non-stdio
transport. It runs from a neutral non-Git temporary root with `env -i`, empty
`HOME`/`CODEX_HOME`, isolated `TMPDIR`, analytics off, no inherited secrets,
and outer network denial.

Pass requires proof that the official surface can expose only
`SnapshotQueryBrokerV1` (plus an inventoried effectless coordination primitive,
if unavoidable), can keep generic shell/exec and every other tool absent, and
can place every future provider transport behind
`ResponseTransportGateV1`. Schema/help output alone is not a pass.

If official 0.145.0 cannot do that, result is Yellow
`manual_owner_only_available`. The command must not launch a turn to “see if it
works,” weaken the boundary, use MCP as an unreviewed escape hatch, or fork
Codex. A different Codex version/adapter/hash requires a new Manifest.

### 5.3 macOS physical-boundary proof

Preparation host identity:

| Item | Exact value |
|---|---|
| macOS | `26.5.2` build `25F84`, arm64 |
| Kernel | Darwin `25.5.0` |
| Xcode | `26.6` build `17F113` |
| Swift | Apple Swift `6.3.3` targeting `arm64-apple-macosx26.0` |
| Seatbelt probe binary | `/usr/bin/sandbox-exec` |
| Keychain CLI | `/usr/bin/security` |

Exact files Gate B may add:

```text
native/macos/Package.swift
native/macos/Sources/FormeLocal/Launcher.swift
native/macos/Sources/FormeLocal/CodexAdapter.swift
native/macos/Sources/FormeLocal/KeychainProtector.swift
native/macos/Sources/FormeLocal/ReviewWindow.swift
native/macos/Sources/FormeLocal/SandboxProfile.swift
native/macos/Resources/forme-fresh-response.sb
native/macos/Resources/FormeLocal.entitlements
native/macos/Tests/FormeLocalTests/BoundaryTests.swift
scripts/r4-gate-b-macos-probe.sh
test/r4-gate-b/macos-boundary.test.ts
```

Exact command:

```text
npm run r4:gate-b:macos-probe
```

The test build uses a temporary local test code-signing identity and temporary
test Keychain only. It may create a synthetic user-presence item and show one
native local confirmation window. It may not touch the login credential used
by Codex, create a production certificate/access group, read any real Room or
Guest bytes, register a daemon/agent/MCP/app/browser tool, or open a listener.
All artifacts live below the command's temporary root and are deleted after
the body-free result is committed.

Pass requires one composed result, not separate optimistic checks:

- signed hash-checked launcher, hardened runtime, library validation, and
  debugger/dynamic-library-injection denial;
- Keychain/Secure-Enclave-backed non-exportable test key with local user
  presence for candidate decrypt and no silent approval path;
- one-shot request/start and candidate-review windows, 15-minute expiry,
  no pasteboard/export/listener/history/external asset, and capture exclusion
  where the platform actually supports it;
- disjoint Workspace, connector, candidate, runtime, and isolated auth roots;
- locked memory/anonymous bounded pipes for Guest/orientation/event bytes and
  no body-bearing prompt/history/telemetry/crash/core file;
- outer sandbox denial of live repo, sibling/home/vault, writes, local socket,
  command/generic network, connector, browser/MCP/tool surface, parent Git/
  config, Keychain export, attach, injection, replacement, symlink escape,
  fork bomb, and huge output;
- 60 wall minutes, 30 CPU minutes, 2 GiB RSS, 32 processes, 128 FDs, and
  32 MiB event+stderr ceilings;
- normal/cancel/timeout/budget/schema/process-kill/fork/huge-output/machine-
  crash cleanup, with deny before deletion and read-only startup doing no write.

Any failed, unavailable, or ambiguous component produces only
`manual_owner_only_available`; Guest bytes do not enter Codex. A local test
identity proves the mechanism, not a future production signing identity. Gate C
must pin the installed production identity without weakening these results.

### 5.4 Fake hard-budget and event-fence replay

Exact files Gate B may add:

```text
packages/r4-codex-adapter/src/fake-transport.ts
test/r4-gate-b/fake-transport-budget.test.ts
test/r4-gate-b/event-fence.test.ts
```

Exact command:

```text
npm run r4:gate-b:fake-budget
```

The fake upstream is an in-process function with a call counter; sockets and
DNS are denied. Tests must prove: maximum 3 dispatches, 128,000 aggregate input
tokens, 8,000 aggregate output tokens, 60-minute authority, US$1 incremental
worst-case spend, exact provider/model/payload/ordinal/start/session binding,
30-second one-use permits, journal-before-call, destructive-first zero calls,
permit-first one disclosed in-flight call, unknown outcome burns the cycle,
no reroute/fallback/retry, and candidate extraction only from the exact
completed authorized turn. Every boundary value and `limit + 1` must run.

Because this is a fake upstream, a passing count is still **0 provider bytes
and US$0**.

### 5.5 Aggregate command and allowed artifacts

After the four commands exist, the only aggregate entry point is:

```text
npm run r4:gate-b
```

It must run, in order: final Gate A regression, schema/golden replay,
PostgreSQL migration+roles+encryption, fake budget/event fence, Codex zero-call
probe, and macOS boundary probe. It stops on first failure and never converts a
Yellow physical result into Green.

Body-free evidence may be written only below the Git-ignored local root
`.forme/gate-b-evidence/<run-id>/`; it may contain tool/build hashes, object
counts, boolean denials, test counts, status/error codes, timing/resource
aggregates, SQL object/constraint/role names, container digest, and cleanup
receipts. It may not contain bodies, source paths, environment values, secrets,
addresses, prompts, transcripts, tool arguments/output, Codex auth, or raw
provider events. The final review commit may copy only a body-free summary and
artifact hashes into `docs/`.

## 6. Evidence classification and expected outcomes

| Lane | Current fact | Gate B result required |
|---|---|---|
| Protocol / state machines | Gate A synthetic implementation; exact 38-object bundle and golden hash above | repeat exact bytes; no semantic drift |
| Hosted persistence | in-memory `SyntheticPresenceStore`; no SQL/migration executed | disposable SQL constraints, roles, encryption, races pass |
| Local stores / recovery | file-backed synthetic analogues | keep exact formats; prove physical adapter or fail manual-only |
| Codex | exact 0.145.0 binary observed; no session started | zero-call capability proof; unsupported means manual-only |
| macOS protection | only fake probe/runtime currently | composed test proof; failure means manual-only |
| Provider transport | fake counter only | hard-budget fake replay; still zero provider bytes |
| Production | absent by design | remains Gate C; no production claim |

The only acceptable audit colors after Gate B execution are:

- **Green:** exact local/disposable evidence passed;
- **Yellow:** official Codex or macOS physical composition is unavailable or
  ambiguous, with the AI lane hard-disabled and manual Owner response retained;
- **Red:** protocol/authority drift, privacy leak, unexpected effect, or failed
  fail-closed behavior. Red stops all R4 progress and is not approvable.

Known Yellow facts at approval time:

1. Official Codex 0.145.0 has not yet proved the required broker-only and
   transport-gated surface.
2. The signed/hardened macOS launcher, native user presence, Keychain/Secure
   Enclave, sandbox, reverse isolation, cleanup, and canaries have not yet
   passed as one installed test system.
3. Production origin/auth/log/backup/OpenAI-account/email/deploy facts are
   intentionally absent and remain Gate C.

## 7. First Provider-Call Test Grant — NOT REQUESTED

```text
Status: NOT REQUESTED
Authorized sessions: 0
Authorized provider bytes: 0
Authorized spend: US$0
Authorized model ID: none
Authorized Guest/source body: none
```

No model is selected because no model is called. A later first-call grant must
be a separate hashable approval object that pins the exact model/account/
transport, one Owner-authored synthetic request hash, explicitly previewed
Forme snapshot/orientation hashes, complete budgets, session count, and
aggregate spend. Nothing in this Manifest implies that future grant.

## 8. Gate C facts deliberately absent

Still forbidden and unknown: production commit/image, domain/origins,
Cloudflare Access audiences/subjects/MFA, Caddy trust chain, production DB
roles/secrets/migration, installed production signing identity/access group,
real OpenAI account/retention/consent, email provider/region/recipient logs,
backup/log horizons, production WAF/rates, deploy/restore/rollback/health/
janitor commands, real actors/data/Room IDs, public activation window, and the
intake-disable command.

Gate B success therefore does not mean deployed, usable by a real Guest, or
Owner-accepted.

## 9. Approval object

Approval is valid only when the external decision card names:

- this Manifest's final SHA-256;
- its containing Git commit and tree;
- the final Gate A evidence file SHA-256 and `GREEN_FOR_GATE_B_REVIEW` result;
- independent audit result `Red = none`;
- the exact authorization/non-authorization boundary above; and
- `First Provider-Call Test Grant: NOT REQUESTED`.

Exact recommended phrase:

```text
批准 R4 Gate B Schema, Runtime, and Migration Manifest v0.1 sha256:<external-final-file-sha256>；First Provider-Call Test Grant NOT REQUESTED
```

After approval, run only Section 5, return with body-free evidence, and stop.
Do not call a model, use real Guest/email data, send a message, mutate hosted or
production state, execute a production migration, deploy, expose public
traffic, issue a production secret, merge, or spend.

## Appendix A — exact Gate A path/SHA-256 inventory

The final inventory is regenerated after the Gate A implementation bytes stop
changing. The external approval card must reject the Manifest if this appendix
does not match the containing Git tree.

<!-- FILE_INVENTORY_BEGIN -->
`apps/room/README.md`  `sha256:7ca578a9a633b7838a982b6a7f2afddd745b43749b9dae729f17a3f45806e305`
`apps/room/app/api/v1/[...segments]/route.ts`  `sha256:4cc64bed96b1430d9f2db2f1f76c74282a7e0eace1aab65cc831f0de946fd75e`
`apps/room/app/g/[interactionId]/page.tsx`  `sha256:428bd6c260ef0fe2881379c82a59a8e21175f72cf0cd7039c7800dc06b3e960c`
`apps/room/app/globals.css`  `sha256:917864b3e135318a313245526c8ae4c3f994de070cfd40a3b9a488fd72c5b344`
`apps/room/app/layout.tsx`  `sha256:407a7112b3cbee09ed6739169c7bef1c2f59697b47935999568767b845bb098d`
`apps/room/app/owner/interactions/[interactionId]/page.tsx`  `sha256:b5b513c222cbbeee8df9d7f8bb935b996493c597a6177c3c56d6465ba98cd7a0`
`apps/room/app/owner/page.tsx`  `sha256:568e240aee23349f772e9d19091b14ed55b143a751bfcef9e597549f761c4cdd`
`apps/room/app/p/[projectionId]/page.tsx`  `sha256:ad97823931e0e9638291a587350bfec0c31ddabf41cbe86df3e3633b8746e3f8`
`apps/room/app/page.tsx`  `sha256:a1f3abbe91af6782e9ad0cdad23c32d61c5ee309bc32c9ca9484a2446fb03358`
`apps/room/app/private/[projectionId]/page.tsx`  `sha256:0dcbeb575940de421e7cfce43ec0d350ef46679dc02c8c6a014f8303f544ebe6`
`apps/room/next-env.d.ts`  `sha256:1862ac4bbbc5192d4bf562161df66ea547ed3e67173100656ab606ae9797db2b`
`apps/room/next.config.ts`  `sha256:59660b264fc5923e4db388aab58240bbf1481bb620856f017b06fb46ce96f60d`
`apps/room/package.json`  `sha256:2921d981fd2668a9eacc97e6492c81d1cc12093279d963011bc439a65c5df575`
`apps/room/scripts/assert-no-ai.mjs`  `sha256:fd681cbdf1fc6c7e2c341a502aaad1b7240d0f748bbc3290a7ac1a288b6a151c`
`apps/room/src/application.ts`  `sha256:9f136cbcab6f954917f0f5476d30c0dba99ebd7455a3a49f77cf3d76ea6271df`
`apps/room/src/components/GuestAsk.tsx`  `sha256:dc4048bef8dd42fa72b492021c7127bd28ab7e81b1ed59d9e90a736a39d149ec`
`apps/room/src/components/GuestStatus.tsx`  `sha256:8b796b3ba7d14261285f157673015a80c1f2e79cac3ab7ef3c14697e97867c52`
`apps/room/src/components/OwnerControls.tsx`  `sha256:540121eb7f668e46581077303ed06ccd3646c1673581081baecb8b4612950997`
`apps/room/src/components/PrivateProjection.tsx`  `sha256:88e213b5c1ae2a87f5618956cc84337f7ffb5039300bf34bac9bf7265e07402f`
`apps/room/src/domain.ts`  `sha256:72ff67492eb7652c299a2a14befa02b0bd093c71013309c4cb0e41855f75ef29`
`apps/room/src/http.ts`  `sha256:2bf5368349685b330f9efef234df90eadf1ad67a4dc5da2894cb48b997269668`
`apps/room/src/offline-control/notification.ts`  `sha256:086245645751592e868ade455c11763c1c56228734f8075c031f8579d86f8893`
`apps/room/src/offline-control/retention.ts`  `sha256:3413d3fe3fd145e4a6329fab7958ea5253afb12093e395b3a6365187e5217328`
`apps/room/src/operation-inventory.ts`  `sha256:5482345bbd5569d2639e3e801697ae908cd37b849c29e62251e38beb905028cb`
`apps/room/src/runtime.ts`  `sha256:91db00da5d215519e97a39678fcc58c15334f7d0d295268bd389eb3dcae80bab`
`apps/room/src/store.ts`  `sha256:de557e2ca574a9caa299029c7be0dad10f6295abe25e632b493099bbb71d60ea`
`apps/room/tsconfig.json`  `sha256:9934e924fa14a53615f52764e4291afcc98c73f178724e3c6d573e54edb81028`
`package-lock.json`  `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812`
`package.json`  `sha256:ef5e5817ea510d0fc808676e62bff874b618c2fd88b602846891290015052374`
`packages/r4-local/package.json`  `sha256:30eaeffec7e27d91b482aa26dad8512c8cf60bcf4b925d6ad8c8c90221c83fbe`
`packages/r4-local/src/body-free.ts`  `sha256:ab22b08828fc66a493c86059d226c1a03f266bd9a23ff7c9326ca2913b0f9ad1`
`packages/r4-local/src/broker.ts`  `sha256:7248dc0d740dcd6dc9123678da0ed4208e857558354540237f458635f38bb1a6`
`packages/r4-local/src/candidate-event-lifecycle.ts`  `sha256:bdf94e2bb464200cc1a25a944b63fb42bc40458516334bf594ded1e18b21a217`
`packages/r4-local/src/candidate-store.ts`  `sha256:e7ba83b10e9d13ce34226804d0446b49f8441b71fc033019980b62f32b9b8b07`
`packages/r4-local/src/capability-probe.ts`  `sha256:b0534a8262e6fbd6d27a0837464bae889bd8cb925bb21c234bff067a6d6a6cae`
`packages/r4-local/src/cli.ts`  `sha256:302cce5f62f46b582e240c13be31f764b3bbf98fcb9481bcf97460fe4670fd14`
`packages/r4-local/src/fresh-session.ts`  `sha256:663894e0493d25fc27c77fc6a66b7fea5065ec341ad0828928571f9244977209`
`packages/r4-local/src/index.ts`  `sha256:b59ac30638e845a8fe49d86ae0a6157c9296490ee7d7b82128a2ecca623aa702`
`packages/r4-local/src/ledger.ts`  `sha256:bcf48ab6f0e1c6f917247d84cb0fa348de27668e7dd62143df8a27143864f087`
`packages/r4-local/src/lock.ts`  `sha256:17c31dcbf0412fd6840dbf7f6f4af1b00278cf6c45865a2b81db49d51e99aa19`
`packages/r4-local/src/projection.ts`  `sha256:0e30b52ed866f898c084c88b4a4df935215dc62fb1cff5adf8132947fbae7cd1`
`packages/r4-local/src/real-basis-probe-cli.ts`  `sha256:7c5981f61016b2bf2f9f3c721f9426d47aab8b7b6b0da421ed7f62c07b0c342e`
`packages/r4-local/src/real-basis-probe.ts`  `sha256:c72aa06beb238feace2b5e9f316c4ef1b08a70b2fd0ef41eecf400e3ab33541d`
`packages/r4-local/src/response-session.ts`  `sha256:543a7245e68d411db35a1470fd4f801eaf11f5ed59ee7ed638ec3ac4253f9b80`
`packages/r4-local/src/runtime-cleanup.ts`  `sha256:39c26c55ffad9dacd615a20e5827ff145c5a2026820ebc130e8003ad053a805a`
`packages/r4-local/src/snapshot.ts`  `sha256:57dc3df6615429ed1c9fddc2d217945337b9172d804cc88b469e031ad8ad7d4a`
`packages/r4-local/src/sync.ts`  `sha256:05a9a56a6cd788b56ca23eac850b2c4864f491b8059c4d6c5d704b8b2172a5e4`
`packages/r4-local/src/types.ts`  `sha256:6997b04ede01d5e77a3da5110e267687e0f1d082fd25c338c2060f340548d053`
`packages/r4-local/src/walkthrough.ts`  `sha256:3829ab24be051aa2a02b35309e75a3c9fc145d387add34daacb388689e8537cd`
`packages/r4-protocol/README.md`  `sha256:d0678a31638c3741d198d6f7a9b12bd057c9c08107f92378d76463510086463c`
`packages/r4-protocol/src/canonical.ts`  `sha256:e57c5735df2fdcff1121b8159b18aa76c979334072d5205d7e5ffa449e88d3e3`
`packages/r4-protocol/src/constructors.ts`  `sha256:121b6ca8984823300600100cf9fb0c5ae8cf5643112a5a9d4d3dc6b55a55910c`
`packages/r4-protocol/src/golden.ts`  `sha256:abdb4aadc7997c4b27d37c7749964a4ea46cd42ec9b66af21dc9ea9aa87f8ebf`
`packages/r4-protocol/src/guards.ts`  `sha256:49766b2817a441fca9b3f48544843d84698adfa507dc4be34719784ee66b5c5d`
`packages/r4-protocol/src/index.ts`  `sha256:e54c0d0129bfd311241dc4ec4b327430755c350a8c39d86657fc156e3d92a635`
`packages/r4-protocol/src/object-validation.ts`  `sha256:c71043c0c4dc1eb8ed0c82035b86c76f6b5f721ac4ee64bd72eab95c8466e950`
`packages/r4-protocol/src/registry.ts`  `sha256:b027c504445226fe233c05da513da0a16b1bb5c3c8800aadef7d958a335c080f`
`packages/r4-protocol/src/state.ts`  `sha256:0cc62b3917f955751fb61d43b2abff13beeb15c40abf4a9dc49df424b841539c`
`packages/r4-protocol/src/types.ts`  `sha256:c2a84ee7cdbaadf42d2684ac88a6ab31f2ec834af08f5667019c0d3e6c0f4b4d`
`packages/r4-protocol/src/validation.ts`  `sha256:d7d3055def94cdf086f064c56377ca6269114127733abce9f86660d179f2256d`
`schemas/r4/protocol.schema.json`  `sha256:da8653dbabd435f8e6be012a988ee1343c39e8c0c354e060ffec2591f4004011`
`schemas/r4/schema-index.json`  `sha256:6112c872203950ba12a09d3f44a9eb453a73fe5b8552d7e6cdc6657e63fda51c`
`scripts/deny-external-network.mjs`  `sha256:3f7408486e62a307d32607e13020992e12b0b671afcedce347303113a12fdf7f`
`scripts/r4-gate-a-static-audit.mjs`  `sha256:eb9552e44bf9b7607f550fabc43de79edcd8e5fd961e8ca2c11b3ea5ba3612fc`
`src/cli.ts`  `sha256:65805d95a85f8f9643a1983c8fe21ec35b82d1651966b0dcf82b025cb76010c8`
`test/r4/helpers.ts`  `sha256:d5dd1e49f4493b92b90c99e929248a70afd3bfd9ff97816af1a9ececa64eafc1`
`test/r4/hosted-application.test.ts`  `sha256:c5ec1372da2e7252b629022a89a72307cf6634d1abb97e8f3e2eff5100b345e4`
`test/r4/hosted-capabilities.test.ts`  `sha256:3d63a0b77b4f193a9dca09f703a65119e160feb5d8b3278ffae886e9ea6e0a49`
`test/r4/hosted-control-races.test.ts`  `sha256:37fa03d47d6a5b4d3bbae3cb2a66224556e234e08953662a811e84d14846d1c7`
`test/r4/hosted-http.test.ts`  `sha256:660c2afc63c8d32b6f33f52a7cf9895aaaf72e7c1262dcc3aaaa8469a42920de`
`test/r4/hosted-lost-response-recovery.test.ts`  `sha256:1053dd1425370e32ba7dbd7ce244c4a873e743655d4fd424f43ba49604890c5d`
`test/r4/hosted-notification-control.test.ts`  `sha256:8135bd1ee9680c6deeb32cf55a6c4500aaee0066e50b728df0368f1c777be387`
`test/r4/hosted-response-terminal.test.ts`  `sha256:bece3a8774b8972a6946a8e00fb339d5ff4a512a825bf5f2410175fcaf799ab1`
`test/r4/hosted-retention-janitor.test.ts`  `sha256:fc7a8a8384f2f9e8510c43f170ade7a63d3e30c60b733453bc2a28dba9aeefb6`
`test/r4/local-cli.test.ts`  `sha256:330da89f3eaa09e6774e8d07d0c52e84ee0e0c7771f92f503fc6abdef172c100`
`test/r4/local-fresh-session.test.ts`  `sha256:ede2bd565eac03fe5b8c93159d696b37de9731c3f61426cb9da955ce349be61d`
`test/r4/local-ledger-sync.test.ts`  `sha256:8ae1dc1832b6d8fe794e2869fac89183a794615b4cc09b0e0e877bb9d051c484`
`test/r4/local-lock-candidate.test.ts`  `sha256:b4f9afb2353e77a45c3d093591fd4f9bca1e72da7ae201a65890208769e2235a`
`test/r4/local-projection.test.ts`  `sha256:7748f7e8bb58fb9f4e8db5a6b807daae569be5cc23d6ba7bb96085a7831905f9`
`test/r4/local-response-session.test.ts`  `sha256:7a59b6d1d8e3944a38f1efd3ad5f10f69360e6158b88d93120f3e7c8a93d2cad`
`test/r4/local-runtime-cleanup.test.ts`  `sha256:fd3f8756dc4a571b83abd0fc90466766e99813500ccb495e1359081a51473ac3`
`test/r4/local-snapshot-broker.test.ts`  `sha256:ef493119f0e47d3582337f7edb423c6319006a54fb9b2b261a6a184740a8b456`
`test/r4/local-terminal-event-sync.test.ts`  `sha256:8a255d8e7b373e0f9bb87043839ac0e905efd45ac958dd20422942bef1b27122`
`test/r4/protocol-contract.test.ts`  `sha256:2d02b129d148b55b4b68d03d009e8c99ee5d24e7b791e40a5b37cd6911ae423b`
`test/r4/protocol-event-contract.test.ts`  `sha256:5b178ffcb3917d86928eddba1220abb4407db4975c4786e0e33542343ad481d9`
`test/r4/protocol-matrix.test.ts`  `sha256:42e9f058a65583c0b9a2e299ec720146fa8af757a1248bdf483195835d2a2c4a`
`test/r4/protocol-successor-scope.test.ts`  `sha256:eb138962ba6476f553e515c4a35b5d8c25eb2e7d234bc8fdb4555022c96c1264`
`test/r4/protocol-time-window.test.ts`  `sha256:37189ccd3bf15a0af5f2766983fa47a6229204e154a900302c48f7d4811ca764`
`test/r4/walkthrough.test.ts`  `sha256:85883f3184f539f550b5e5eec11c878dfa30741e0f367a9b7179390b64547a47`
`tsconfig.json`  `sha256:b43fe6c8df013674a7f323bcdcf59f1bb7c54f44a4f1d407f4d85148fcec2dfe`
<!-- FILE_INVENTORY_END -->
