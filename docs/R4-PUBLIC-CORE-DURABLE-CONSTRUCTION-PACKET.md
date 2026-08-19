# R4 #67 Durable Public Core Construction Packet v0.1

- Status: **approval candidate; `PROPOSED_NOT_EXECUTED`**
- Updated: 2026-08-10
- Active product issue: [#67 — Public Room and one real bounded knock](https://github.com/formehq/forme/issues/67)
- Parent authority: R4 Technical Control Packet v0.2
- Parent Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Code baseline commit:
  `09401a08cb26cf9da792307e5f6d7f8ac3c1b3c2`
- Code baseline tree:
  `37c630d239d22cacd12d9d2a545c2e3ba90d9d87`
- Baseline Draft PR: `#75`
- Durable Public Core Construction Grant: **REQUESTED BY THIS PACKET**
- Gate C Activation Grant: **NOT REQUESTED**
- Migration Execution Grant: **NOT REQUESTED**
- Real Room / Guest / publication authority: **NOT REQUESTED**
- Provider / email / external-message authority: **NOT REQUESTED**
- Product/runtime/database/Provider network calls, production effects and spend
  authorized here: **0 / 0 / US$0**
- Source-control proposal maintenance: **one exact branch push and one Draft PR
  create/update under the existing GitHub Project Management Envelope; merge
  remains 0**

This Packet asks for one repository-only construction step. It does not contain
its own SHA-256 or containing proposal commit. A separate low-load Owner Review
binds those values after these bytes are frozen.

## 1. User outcome and exact claim

The construction outcome is deliberately narrower than “Production Ready”:

> The already-approved #67 public-knock semantics gain one closed,
> walking-slice-specific application and PostgreSQL store implementation whose
> durable, transactional, privacy, recovery and retention invariants can be
> tested through injected ports without touching a real database or network.

The implemented path remains:

```text
one public Room
  → one current Owner-approved Projection
  → independent Curator admission
  → one 24-hour / one-use public encounter
  → one encrypted private Interaction
  → exact Room event / sync / pull / ACK
  → body-free receipt and bounded retention
```

Construction Green may claim only:

- `PUBLIC_CORE_APPLICATION_CONSTRUCTED_OFFLINE`;
- `PUBLIC_CORE_STORE_CONSTRUCTED_OFFLINE`; and
- exact repository/fake-executor Technical Review evidence.

It may not claim a live database, Production Ready, traffic readiness, Gate C
readiness, real Presence, a real Guest encounter, or R4 Owner Acceptance.

## 2. Construction-boundary delta

The current `PUBLIC_CORE_CONSTRUCTION_BOUNDARY` has six false readiness facts.
If and only if this Packet's exit criteria pass, implementation may make the
first two facts true:

| Construction fact | After successful construction |
|---|---:|
| production application adapter constructed | `true` |
| durable persistence adapter constructed | `true` |
| credential vault adapter constructed | `false` |
| HTTPS transport adapter constructed | `false` |
| traffic ready | `false` |
| Gate C ready | `false` |

The application/store are constructed against injected, closed ports. The real
driver, pool, DSN, credentials, key resolver, deployment wiring and request
route remain Gate C work. `apps/room/src/runtime.ts` and the production API
route remain fail-closed and are outside this Packet's workset.

## 3. Closed operation surface

The surface must equal the current `PUBLIC_CORE_ACTION_NAMES` exactly: 20
operations, comprising 4 reads and 16 mutations.

### 3.1 Reads

```text
third_place.list
projection.read
interaction.read
room_operator.status
```

### 3.2 Mutations

```text
public_encounter.issue
interaction.create
interaction.delete
room.pair.exchange
room.create
room.pair
room.binding.revoke
room.mode.set
projection.revoke
curation.admit
curation.unlist
room_operator.sync
room_operator.pull
room_operator.ack
room_operator.projection.deliver
room_operator.local_purge.receipt
```

The existing 25 unavailable operations remain unavailable before body or
authentication processing. Construction may not add `control.status`, Fresh
cycle/dispatch, Response, Grant/continuation, positive Private Room, email,
notification, retirement/deletion, invite, Agent Guest or stale-attestation
routes.

Every reachable Room is `third_place_public`. Its intake mode is exactly
`public_single` or `closed`; there is exactly one installation slot and one
Room slot. This is not a general multi-tenant store.

Only `public_encounter.issue` and `interaction.create` require and re-check
`public_single`. `room.mode.set` may close or reopen intake under exact
Controller authority. A closed Room still permits direct Projection reads
under the approved T4 lifecycle plus status, sync, pull, ACK, delete, revoke,
unlist and purge/recovery operations. The below-routing scope guard may not
reject those closing or recovery operations merely because intake is closed.

## 4. Exact data model

The proposed SQL schema is `forme_r4_public_core`. It has exactly these 14
application tables:

1. `installation` — singleton exact entity, Third Place and non-secret config
   lineage; seeded by proposed migration bytes, not by a runtime registry;
2. `rooms` — singleton public Room slot, mode, active state, version, current
   Projection and event high-water;
3. `projections` — encrypted Capsule plus clear lifecycle, hashes, time bounds,
   exact publication-attestation lineage and curation state;
4. `pairing_challenges` — ten-minute one-use challenge, short-lived encrypted
   pairing code plus its keyed digest, encrypted exchange envelope and version;
5. `room_bindings` — exact Room binding, keyed credential digest, current or
   revoked state and non-renewing maximum 30-day expiry;
6. `public_encounters` — exact Room/Projection, keyed secret digest, 24-hour
   maximum, one-use state, unresolved Interaction and rate lineage;
7. `interactions` — encrypted request and optional Guest Capsule, immutable
   consent/origin hashes, reply/delete digests, lifecycle and version;
8. `rate_events` — Room-scoped keyed coarse-bucket digest only; no raw IP,
   user-agent or network identifier;
9. `room_events` — contiguous per-Room sequence, body-free event metadata and
   37-day replay ceiling;
10. `mutation_receipts` — actor-scope/action/idempotency key, request hash,
    closed recovery kind, target/version/status/code and expiry; no arbitrary
    result JSON or body column;
11. `event_acks` — exact binding/event/sequence/hash semantic ACK;
12. `encryption_nonces` — global key-version/nonce/field-version uniqueness;
13. `purge_jobs` — closed target enum and object ID only; no table name,
    column name or dynamic SQL;
14. `retention_health` — singleton janitor watermark and last bounded run.

There are no actor, general entity, general Third Place, Private Room, Grant,
Response, notification, email or generic resource tables. Controller and
Curator identities come from the already-validated production identity
boundary; only their keyed body-free scope digest may enter a receipt.

## 5. Relational invariants

The schema and application must fail closed on every cross-scope composition.
At minimum:

- the single Room is public-only and belongs to the single installation;
- every Projection, admission, binding, encounter, Interaction, event and ACK
  binds the same exact Room through composite keys, not independent ID-only
  foreign keys;
- only one Projection can be current; a successor atomically supersedes the
  old Projection and begins `not_admitted`;
- an unlisted Projection cannot be re-admitted;
- encounter issue and Interaction acceptance both re-check exact
  current/fresh/admitted/public-single state;
- an encounter expires within 24 hours, is accepted at most once, and has at
  most one unresolved Interaction;
- Interaction origin IDs, consent and request hash are immutable;
- encounter, reply, delete, pairing and binding secrets have separate digest
  domains and cannot substitute for one another;
- accepted Interaction, encounter consumption, rate event, Room event,
  receipt and idempotency terminal state commit in one transaction;
- Projection revoke clears current state, invalidates unused encounters,
  terminalizes linked Interaction origin state and creates purge obligations;
- ACK binds the exact event ID, sequence and event hash;
- Room event sequence has no gaps and advances with the Room high-water; and
- cross-Room or wrong-version input fails before mutation.

## 6. Ciphertext and secret contract

Construction creates a production-specific injected cipher contract in
`apps/room/src/public-core-crypto.ts`. It must not modify or reuse the historical
Gate-B synthetic `EncryptedFieldV1` key-ID allowlist.

The encrypted-field contract is:

- `a256gcm.v1` / AES-256-GCM;
- 12-byte nonce and 16-byte authentication tag;
- key version derived only from the resolved PR #75 `bodyEncryptionKey`
  reference; raw key bytes never enter config, JSON, diagnostics or errors;
- exact canonical AAD:

```json
{
  "schemaVersion": "r4_public_core_aad.v1",
  "table": "<closed table>",
  "column": "<closed column>",
  "roomId": "<exact room>",
  "rowId": "<exact object>",
  "objectVersion": 1
}
```

- global `(keyVersion, nonce)` and exact field-version uniqueness inserted in
  the same transaction as ciphertext;
- domain request/payload hash validated independently before use; and
- unknown key, nonce reuse, AAD drift, tag failure or plaintext-hash drift is a
  sanitized fail-closed result with no plaintext fallback.

Room label, Projection Capsule, Interaction request, optional Guest Capsule,
pairing code and sealed pairing exchange are encrypted. The pairing code is a
narrow recoverable-capability exception: until its ten-minute expiry or
consumption, the same transaction stores both its ciphertext and a
domain-separated keyed digest so a lost `room.pair` response can be replayed.
Consumption or expiry atomically clears that ciphertext. Encounter, binding,
reply and delete secrets are digest-only. All digest comparisons are constant
time after the exact indexed lookup. Raw secret or body bytes may not enter
receipts, events, logs or diagnostics.

`interaction.delete` must atomically make ciphertext unreadable and null the
encrypted body fields in the user transaction, then enqueue an idempotent purge
obligation for auxiliary copies. A later janitor is not allowed to postpone
the user-visible deletion guarantee.

## 7. Transaction and lock contract

Each mutation has one named application method and one closed SQL transaction
plan. There is no `save`, arbitrary relation list, generic action executor,
caller-supplied SQL, generic JSON result or callback that can skip invariants.

Before the transaction, the application validates the exact operation schema,
actor lane, Room scope, canonical request hash and expected-version fields.
Inside the transaction, **step 0** inserts-or-finds and locks the exact
`mutation_receipts` idempotency row. That row is locked once; the final receipt
write updates the already-held row and acquires no new receipt lock. All domain
rows then use this global order:

```text
installation
→ room
→ binding or pairing challenge
→ projections ordered by binary ID
→ encounter
→ interaction
→ Room event / ACK
→ purge job / retention health
```

Transactions use PostgreSQL `READ COMMITTED` with explicit `FOR UPDATE` on the
named rows. The Room row serializes event high-water and public rate/pool
counters. Multi-row locks use binary/C ordering over exact IDs.

Every mutation atomically commits:

```text
domain transition
+ body-free Room event when applicable
+ exact action-specific receipt
+ terminal idempotency record
```

Same key plus same canonical request hash reconstructs the exact original
action-specific **body-free** result. Same key plus different hash returns
conflict. A new key cannot repeat a terminal semantic effect.
`room_operator.sync` freezes `(afterSequence, highWater)` in its receipt so
lost-response replay returns the same finite page even if newer events exist.

`room_operator.pull` has an explicit body-bearing recovery rule. Its receipt
stores only the authorized Interaction ID/version, exact body hash and body
expiry. While the exact ciphertext version remains readable, replay decrypts
that same version and verifies the stored hash. Once delete, revoke or
retention has made the body unreadable, the terminal lifecycle wins: replay
returns the exact body-free deleted/revoked/expired reconciliation result and
must never resurrect or retain the former body merely to reproduce an earlier
response. Tests cover pull-response loss both before and after each terminal
transition.

## 8. Rate, retention and recovery

The current #67 rate limits remain exact: public encounter issue is bounded by
the approved hourly/daily buckets; acceptance is bounded per coarse bucket and
by the Room unresolved pool. Construction tests the exact 10/hour, 50/day,
3/day bucket and 20-unresolved Room pool boundaries, including rejection of
the 21st unresolved request.

Retention ceilings are:

| Data | Maximum |
|---|---:|
| pairing code / sealed exchange | 10 minutes |
| public encounter | 24 hours |
| Projection body | 7 days from publication, or earlier supersede/revoke/hard expiry |
| Interaction / optional Guest Capsule body | 30 days |
| rate-event row | 25 hours |
| body-free Room event / ordinary receipt | 37 days |
| Interaction terminal tombstone | original 30-day body ceiling + 7 days |

Never-admitted, unlisted and stale **current** Projection states do not purge
the current body and preserve the approved direct-read lifecycle. Installing a
successor atomically makes the superseded Projection logically unreadable and
body-free, returns only its tombstone externally, and enqueues physical purge;
explicit revoke and hard expiry do the same. Interaction retention is measured
from its original creation time; terminalization does not restart its 30-day
body clock or 37-day tombstone clock.

An injected hourly janitor uses a singleton advisory lock, deterministic
bounded batches and closed purge target kinds. Terminal transitions atomically
make bodies unreadable and enqueue their purge obligation. A purge target of
less than 24 hours is monitored. If `lastSuccessfulPurgeAt` is older than 36
hours, the application rejects all mutations except this closed
closure/recovery allowlist:

```text
interaction.delete
projection.revoke
room.binding.revoke
curation.unlist
room.mode.set (public_single → closed only)
room_operator.sync
room_operator.pull (same-key/same-hash replay of an already committed pull only)
room_operator.ack
room_operator.local_purge.receipt
```

Reads and the listed destructive/recovery actions remain available. A fresh
pull is not recovery: it would decrypt Guest body and advance local exposure,
so it returns a sanitized 503. Only replay of an already committed pull receipt
may use the Section 7 recovery rule. Room create, pair/exchange, mode reopen,
Projection delivery/admission, encounter issue and Interaction create also
return a sanitized 503 during the incident.

Replay before the retained event floor returns the exact body-free 410
reconciliation metadata. High-water, event floor, ACK and receipt recovery are
durable and idempotent.

## 9. Fault and race matrix

All 16 mutations must be tested at these six boundaries:

1. before idempotency reservation;
2. after all locks and current-state rechecks;
3. after domain/body write but before Room event;
4. after Room event but before receipt;
5. after receipt but before commit; and
6. committed response lost.

Every result is either complete rollback or exactly one committed transition.
Required same-key/same-hash and same-key/different-hash cases apply to every
mutation.

Mandatory concurrent/fault cases include:

- Room create/create singleton collision;
- pair/revoke, pair-exchange/exchange, pairing-code lost-response replay and
  pairing-code expiry/consumption clearing;
- Projection same-version delivery, successor delivery, deliver/revoke and
  admit/unlist;
- encounter issue racing unlist, mode close, revoke and expiry;
- Interaction create/create on one encounter and create racing mode/unlist/
  revoke/expiry;
- delete racing pull plus pull-response loss before/after delete, revoke and
  retention expiry;
- sync racing event append and retained-floor advancement;
- ACK/ACK and wrong event hash;
- janitor racing read/delete/revoke;
- nonce reuse, ciphertext/AAD/tag tamper and unknown key;
- restart/reopen recovery and committed lost response;
- wrong Room, wrong binding, malformed input and expected-version drift; and
- every exact rate/pool boundary named in Section 8.

## 10. Exact implementation workset

Approval permits changes only to these paths:

```text
docs/R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md
docs/R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-OWNER-REVIEW.md
docs/R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-REPORT.md
docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md
docs/evidence/r4-public-core-durable-construction.json
apps/room/src/public-core-application.ts
apps/room/src/public-core-store.ts
apps/room/src/public-core-postgres.ts
apps/room/src/public-core-crypto.ts
apps/room/src/public-core-retention.ts
apps/room/src/public-core-policy.ts
schemas/r4/public-core/schema.sql
schemas/r4/public-core/verify.sql
schemas/r4/public-core/rollback.sql
schemas/r4/public-core/construction-evidence.schema.json
schemas/r4/public-core/artifact-index.json
schemas/r4/schema-index.json
test/r4/public-core-application.test.ts
test/r4/public-core-postgres.test.ts
test/r4/public-core-races.test.ts
test/r4/public-core-retention.test.ts
test/r4/public-core-privacy.test.ts
README.md
docs/PRODUCT.md
docs/CONTROL.md
docs/ROADMAP.md
docs/DECISIONS.md
docs/NATIVE-HARNESS-ARCHITECTURE.md
```

The six general docs may receive status/link updates only. Historical
`schemas/r4/sql/**`, `schemas/r4/gate-b-core/**`, evidence, packets and tests are
immutable except ordinary regression execution.

No package or lockfile may change. In particular this Packet does not add
`pg`. `public-core-postgres.ts` implements exact action-specific statements
against a narrow injected `PublicCoreSqlExecutorV1`. A real PostgreSQL driver,
pool, DSN and connection policy belong to Gate C.

`apps/room/src/runtime.ts` and
`apps/room/app/api/v1/[...segments]/route.ts` are not in the workset. Production
runtime remains fail-closed and no HTTP route can reach the new application.

## 11. Authorized development activity

Approval authorizes one primary Agent to:

- implement only the exact workset and closed 20-action surface;
- create proposed SQL/verify/rollback bytes without applying them;
- use injected in-memory transaction, SQL, cipher, clock and fault ports;
- run TypeScript, static SQL/schema, offline/deny-network, existing regression
  and no-server-AI tests;
- produce body-free machine evidence, a Construction Report and a proposed,
  hash-pinned Gate C Activation Card;
- request independent repository-byte audit; and
- commit, push and update one Draft proposal PR after tests pass, without
  merging it.

Standard compiler/test subprocesses are permitted. Tests may use temp-root
files containing synthetic fixtures only. They may not open a socket or start
a database, Docker, Codex, provider, Keychain or production service.

## 12. Explicitly unauthorized

This Packet does not authorize:

- applying any migration or rollback;
- a database process, Docker/container/image/volume or `psql` execution;
- a PostgreSQL driver, pool, DSN or production connection;
- runtime/API route activation;
- product/runtime/data-plane network or HTTPS calls; the only outbound network
  exception is the exact source-control proposal maintenance disclosed in
  Section 11;
- a concrete credential vault, Keychain, secret resolver or secret install;
- production config values or credentials;
- Room create/pair, Projection publication, Curator admission or public traffic;
- real Guest, Interaction, Projection or Owner content;
- Provider/model/Codex execution, email or external message;
- Cloudflare, Caddy, OCI image, deployment, DNS or infrastructure mutation;
- merge, public release, spend or Gate C activation.

Any unlisted path, dependency, action, table, authority, external read/effect or
ambiguous cleanup stops Construction and returns to the Owner.

## 13. Technical Review exit criteria

Construction can report Green only when:

1. the 20/25 action partition remains exact;
2. all 14 tables and no additional application table exist in proposed SQL;
3. schema, verify, rollback and artifact hashes close;
4. every relational, ciphertext, transaction, idempotency, event, rate,
   retention and deletion invariant above has positive and negative evidence;
5. all 16 mutation fault matrices and mandatory races pass under injected
   no-network execution;
6. historical R4 and Gate-B regression remains Green;
7. no secret/body/canary appears in events, receipts, errors, logs or evidence;
8. dependency, runtime route and unauthorized-path scans remain closed;
9. `trafficReady` and `gateCReady` remain false; and
10. independent review reports zero Blocker / Important within the Packet scope.

Green means Technical Review only. It does not complete #67.

## 14. Stop point and next gate

After construction, the Agent must stop with:

- exact implementation commit/tree and workset;
- body-free Construction Report and machine evidence hashes;
- proposed migration/verify/rollback hashes;
- exact test and audit results;
- all six construction/readiness facts; and
- a hash-pinned proposed Gate C Activation Card.

Gate C must separately decide the real PostgreSQL driver/version, pool/DSN,
migration target and rollback, vault/key references, HTTPS transport, exact
Cloudflare/Caddy identity path, Room creation/pairing, publication-stable
Projection, Curator actor, one real Guest, activation window, disable command
and spend. None is implied by Construction Green.

## 15. Owner choices and recommendation

This Packet requests one bundled decision with four explicit parts:

1. approve the exact 20-action, one-Room, 14-table data model;
2. approve the production-specific injected AEAD/keyed-digest contract while
   leaving real keys/vault to Gate C;
3. approve the `>36h` retention-health mutation stop with only the exact
   closure/recovery allowlist above, plus immediate Interaction ciphertext
   nulling and the pull terminal-precedence rule; and
4. approve the exact workset, no new dependency, no generic store and no
   runtime/route activation boundary.

Recommendation: **approve all four together**. If any part changes, freeze new
Packet bytes and return for a new exact approval rather than interpreting a
partial grant.

## 16. Recommended exact approval text

After the Packet and Owner Review bytes are committed and independently
audited, the approval should bind their SHA-256 values plus proposal HEAD/tree:

```text
批准 R4 #67 Durable Public Core Construction Packet
sha256:<packet> 与 Owner Review sha256:<review>；Proposal HEAD <head> tree
<tree>；仅授权该 Packet 的 one-Room / 20-action / 14-table injected durable
application-store、proposed SQL/schema 与 synthetic/ephemeral no-network tests；
仅允许在既有 GitHub Project Management Envelope 下 push 一个精确 proposal
branch 并创建或更新一个 Draft PR；禁止 migration execution、database/Room
mutation、product/runtime/data-plane network、vault/secret installation、
runtime/route activation、deployment、publication/admission、real Guest data、
Provider/email、traffic、merge 与 spend；完成后停在 Technical Review 和
hash-pinned Gate C Card。
```
