# R4 #67 Public Core Gate C Activation Card

- Status: **`PROPOSED_NOT_APPROVABLE_INPUTS_REQUIRED`**
- Updated: 2026-08-11
- Scope: **#67 only — one durable public Room through one bounded knock reaching the local Owner**
- Construction implementation HEAD / tree:
  `bcd4259130627067e1e7cf1974513801545cda35` /
  `7e6c3236c06d63f06e93e8a4d1b69fe0a20bca31`
- Construction artifact aggregate:
  `sha256:c825306a5e20e910e6fdd811d1d3599b59e317baaa18b46c98ba13b8c0c3e44f`
- Construction evidence / report:
  `sha256:864e94151e5bc3864f154d089da7590501dbee7eedb62e61f980118d2e0a4dc5` /
  `sha256:452c1c17a6cbd8a0dfab56a29654a94088978b9f483c6e837a319426dcbea657`
- Independent Stage-A/index audit summary SHA-256:
  `sha256:64ad203d66be7f815280741be8a094505a5df6b3f1a98d38e2f199646cb35cc0`
- Gate C Activation Grant: **NOT_REQUESTED**
- Migration Execution Grant: **NOT_REQUESTED**
- Deployment / runtime-route activation grants: **NOT_REQUESTED**
- Room mutation / publication / Curator admission grants: **NOT_REQUESTED**
- Real Guest / traffic grants: **NOT_REQUESTED**
- Provider / email / external-message grants: **NOT_REQUESTED**
- Merge / public-release / spend grants: **NOT_REQUESTED**

This Card is a requirements and stop object, not an approval request. It
contains no secret, credential, private path, Guest body or production value.
It grants nothing, and no shortened or implied approval may activate it.

The Card does not contain its own SHA-256 or the commit/tree that contains its
final bytes. A future activation request must bind the frozen Card SHA-256,
containing HEAD/tree and every exact input below in a separate Owner approval.

## Frozen authority lineage

| Authority | Binding |
|---|---|
| R4 Technical Control Packet v0.2 | `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5` |
| Durable Construction Packet | `sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31` |
| Durable Construction Owner Review | `sha256:8272df04a9374ca04be3f212cd0bc8b123d138953224c24a66d13d08912887ff` |
| Packet baseline HEAD / tree | `4841c32f07d3e6810cb023387cefa0562b85b777` / `abc24d75345637886f3252caf3d8eeec7c6ec6be` |
| Approved wrapper HEAD / tree | `d81e6fd3e1de9737d6c6dcf93fe642907654eec8` / `4910018a05b5b9d91bc3b3b2463698300e156a2a` |
| Addendum A | `APPROVED` — config test is artifact 12 of 16; readiness is exactly 2 constructed / 4 false |
| Stage-A Construction HEAD / tree | `bcd4259130627067e1e7cf1974513801545cda35` / `7e6c3236c06d63f06e93e8a4d1b69fe0a20bca31` |
| Proposed SQL / verify / rollback | `sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2` / `sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4` / `sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e` |

Any changed implementation, dependency, SQL, production configuration,
deployment artifact, publication artifact, actor, window, command or audit
invalidates the future activation surface and requires newly frozen bytes.

## What Construction can establish

Construction establishes only:

- the exact 4-read / 16-mutation public-only application surface;
- action-specific durable store and PostgreSQL transaction plans;
- proposed 14-table SQL, verify and rollback bytes;
- injected AEAD, keyed-digest, deletion and retention behavior;
- offline fault, race, idempotency and privacy evidence; and
- zero real database, product/runtime/data-plane network, Room, publication,
  Guest and spend effects.

Construction cannot establish a real driver or pool, a migrated database,
credential vault, HTTPS transport, origin trust, runtime route, deployment,
traffic safety, real Presence or Owner Experience Acceptance.

## Readiness facts that remain closed

| Fact | Gate C Card state |
|---|---:|
| Credential vault adapter constructed | `false` |
| HTTPS transport adapter constructed | `false` |
| Production driver/pool wired | `false` |
| Proposed migration applied | `false` |
| Production route active | `false` |
| Traffic ready | `false` |
| Gate C ready | `false` |
| Real Room / Projection / Curator receipt | absent / absent / absent |
| Real Guest Interaction | absent |

## Inputs required before an activation-ready successor

Every item below must be exact and hash-pinned. References replace secret
values; raw secrets never enter this Card, config, diagnostics or logs.

### 1. Production artifact and runtime

- `REQUIRED_UNSET_PRODUCTION_WIRING_HEAD_AND_TREE`
- exact PostgreSQL driver name, version, integrity and dependency-lock hash;
- exact runtime/API-route wiring preserving the 20 allowed / 25 unavailable
  operation partition;
- OCI registry/repository/image digest and SBOM hash;
- exact Compose service/network names, deploy command and health command; and
- production-wiring tests and independent zero-Blocker/zero-Important audits.

### 2. PostgreSQL and recovery

- exact account, host, cluster, database, schema and server version;
- migrator, application and verifier roles plus exact grants;
- pool size, timeouts, TLS verification and connection policy;
- DSN reference, never a raw DSN;
- preflight, one migration command and exact read-only verify command;
- backup horizon, backup receipt and current restore evidence; and
- compatible image rollback command plus the separately bounded empty-state
  SQL rollback command.

### 3. Vault, crypto and local binding

- database URL, body-encryption key, capability-pepper and publication-verifier
  references and versions;
- hosted secret resolver and access identity;
- local exact-Room credential-vault adapter;
- key/credential rotation and revocation commands; and
- evidence that raw key, credential, capability and body bytes cannot enter
  config serialization, receipts, events, errors or named logs.

### 4. Edge, identity and HTTPS transport

- exact public origin and Cloudflare account/zone/hostname;
- Access issuer, distinct control/approve audiences, distinct
  Controller/Curator subjects and MFA policy;
- exact per-hostname Tunnel or origin-only protection mechanism;
- Caddy listener, upstream route, source allowlist and proxy-header stripping;
- origin-boundary and Access-assertion verifier material references;
- fixed-origin HTTPS transport, TLS, timeout, redirect and response-size policy;
  and
- direct-origin, other-customer, forged-header and wrong-audience negative
  evidence.

### 5. Operations, retention and incident response

- exact application rate and WAF values;
- hourly janitor schedule and retention-health alert;
- Cloudflare, Caddy, application and PostgreSQL log fields and retention;
- retention and backup declarations;
- incident owner/contact and secret-rotation procedure;
- independent edge kill switch and application closure commands; and
- exact incremental infrastructure spend ceiling.

### 6. Room, publication and actors

- exact installation, Third Place, entity and public Room IDs;
- Room creation in `closed` mode;
- one ten-minute pairing ceremony and one 30-day non-renewing Room binding;
- a fresh publication-stable successor built from the current Twin, not the
  non-publishable #66 phase approval;
- exact capsule, basis, payload, public-content, policy, Twin-revision,
  publication approval and receipt hashes plus publication/fresh/expiry times;
- a new Room-bound exact Owner publication approval; and
- a separate Curator approve-lane action and durable admission receipt, even if
  the same human holds both P0 roles.

### 7. One real Guest window

- one designated consenting real collaborator represented in shared evidence
  only by an opaque/hash-bound identifier;
- exact consent and disclosure copy;
- exact approved data classes and retention/deletion disposition;
- activation start, end and timezone;
- intended evidence: public understanding plus one private bounded knock;
- physical exposure ceiling: either the existing approved rate/pool ceiling is
  explicitly accepted, or a separately constructed one-window global latch is
  approved; “one Guest” must not be presented as a current hard runtime cap;
  and
- no promised Response, Provider processing or email under #67.

## Future staged execution — not authorized by this Card

An activation-ready successor may authorize these stages under one exact
Owner-approved envelope. Each stage stops on mismatch; later authority is not
inferred from an earlier successful stage.

1. **Zero-effect admission:** recompute all hashes, verify the clean exact
   deployment artifact, references, audits, backup/restore evidence and
   rehearsed disable paths. Failure leaves all external effect counts zero.
2. **Closed provisioning:** deny public ingress, create the backup, execute one
   exact migration, run read-only verification for 14 tables, one installation,
   one retention-health row and zero Rooms, deploy the pinned image, then pass
   health, janitor, privacy and edge-negative checks.
3. **Closed Room bootstrap:** create one `third_place_public` Room in `closed`,
   complete one pairing/exchange, and verify one current exact-Room binding.
   No public encounter or Guest byte exists.
4. **Closed publication:** revalidate the current Twin, exact successor,
   approval, policy and time bounds; deliver only those bytes; record the Owner
   publication and separate Curator admission; keep intake closed while public
   rendering, Agent JSON and private-canary absence are verified.
5. **Bounded intake:** open `public_single` only for the exact window; the
   designated real Guest reads and submits the bounded private knock; close
   intake immediately after the accepted Interaction or at the deadline.
6. **Local arrival and stop:** permit only exact sync, pull and ACK into the
   local Owner lane, apply the approved retain/delete disposition, produce
   body-free receipts, and stop at #67 Owner/Guest Experience Review.

## Disable and rollback contract

Before intake opens, both disable paths must have exact commands, named actors,
expected body-free output and a successful rehearsal receipt:

1. an edge kill switch that denies public ingress even when the app or database
   is unhealthy; and
2. application closure that changes `public_single → closed`, followed where
   required by unlist/revoke and Room-binding revoke.

The proposed `rollback.sql` first performs exact catalog, external-dependency
and empty-state preflight checks. It explicitly breaks only the two declared
internal dependency cycles, then drops the schema objects in reverse order with
`RESTRICT`; it never uses `CASCADE`. It may be authorized only before any Room
or real Guest data exists. After Room bootstrap or any real Guest byte, normal
rollback must close ingress, restore a schema-compatible pinned image, preserve
evidence, and use typed delete/revoke/purge operations. Destruction of
production data requires a new explicit Owner grant.

Any fault after Guest intake consumes the approved activation attempt. No
silent retry, second Guest, reopened window or repeated publication is implied.

## Zero-effect authority of these bytes

| Effect | Authorized now |
|---|---:|
| Dependency or production-wiring mutation | 0 |
| Migration / database process / database mutation | 0 / 0 / 0 |
| Deployment / route activation / public traffic | 0 / 0 / 0 |
| Secret or credential installation | 0 |
| Room create/pair/mode/revoke actions | 0 |
| Projection delivery/publication/admission | 0 |
| Real Guest records or bytes | 0 |
| Product/runtime Provider or model calls | 0 |
| Email or external messages | 0 |
| Merge or public release | 0 |
| Spend | US$0 |

## Experience boundary

The future #67 experience must show one real collaborator can understand the
project's direction, current state, tension and contribution opening, then send
one private knock tied to the exact visible Projection and have it arrive at
the local Owner without exposing a private canary, excluded source, credential
or another Room.

That would complete only the #67 arrival slice. It would not authorize or prove
#68 Fresh candidate generation, #69 exact Response delivery, #70 continuation,
the positive Private Room path, Provider/email behavior, full R4 Owner
Acceptance or R4 Done.

## Stop

Do not approve or activate this version. Construction evidence is frozen and
Technical Review is Green; the next step is to prepare and independently review
a production-wiring successor containing every required exact input above. The
later Owner decision must name that successor Card SHA-256, its containing
HEAD/tree, production artifact, Projection approval, actors, activation window,
disable/rollback commands, effect ceilings and spend. Until then, all Gate C
effects remain `NOT_REQUESTED`.
