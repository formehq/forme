# R4 Gate B Schema, Runtime, and Migration Manifest v0.1

- Status: **approval candidate; `PROPOSED_NOT_EXECUTED`**
- Parent authority: R4 Technical Control Packet v0.2
- Parent Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Gate A evidence:
  [`R4-GATE-A-VERIFICATION.md`](./R4-GATE-A-VERIFICATION.md)
- Low-load Owner decision surface:
  [`R4-GATE-B-OWNER-REVIEW.md`](./R4-GATE-B-OWNER-REVIEW.md)
- First Provider-Call Test Grant: **NOT REQUESTED**
- Provider sessions / provider bytes / spend authorized here: **0 / 0 / US$0**

This Manifest is the exact next stop gate. It proposes repository construction
and local/ephemeral validation only. Gate A preparation performed isolated,
read-only version/help/schema/initialize-only Codex observations with zero
thread, turn, model, account, or provider request; they are recorded as
preparation facts, not Gate B proof. Nothing here claims that Gate B, SQL,
Docker, the full Codex Gate B probe, macOS signing, Keychain, or a provider
call has run.

## 1. Exact decision and authority ceiling

Approval authorizes only the hash-bound work below:

1. construct the listed Gate B repository files without adding a dependency;
2. generate and validate closed API/local-format schemas;
3. run a fixed disposable PostgreSQL 16.10 instance with synthetic data;
4. test the application-layer encrypted-field adapter with a synthetic key;
5. replay transport budgets against an in-process fake upstream with DNS and
   sockets denied;
6. run the official Codex 0.145.0 **zero-call** capability probe—version, help,
   schema generation, app-server initialize, then exit—with zero thread, turn,
   model, account, or provider request;
7. compile and probe a temporary signed macOS launcher, temporary test
   Keychain, deny-first child profile, user-presence boundary, and cleanup;
8. return only body-free evidence and stop.

Approval does **not** authorize a model/provider call, real Guest or email
address, external message, hosted or production mutation, production schema
migration, deployment, public traffic, production credential, public response,
merge, or spend. Unknown capability, hash drift, new file, new dependency,
unlisted effect, or cleanup ambiguity fails closed.

The eight proposed artifacts in Section 3 are part of this decision. Their
index excludes itself; the Manifest binds both its hash and aggregate. The
Manifest and Owner Review become immutable approval inputs after approval.
Changing either or any indexed artifact requires a new Manifest hash and new
Owner approval.

## 2. Gate A implementation and evidence binding

### 2.1 Code, tree, dependency, and source inventory

| Binding | Exact value |
|---|---|
| Gate A implementation commits | `e8fc2232609741733c1b7aca4729d99112e0a779`, `c23988e2c626a92d6d1a2dfacdce5ad089cdb4f7` |
| Final implementation tree | `fe1071da80310956c11fa0930ec63e710ee1d6e0` |
| Root package | `forme@0.1.0`, private npm workspace |
| Node / npm used for final validation | `v24.14.1` / `11.11.0` |
| Package lock SHA-256 | `d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |
| New Gate B dependency authorized | none |
| Source inventory evidence | `docs/evidence/r4-gate-a-source-inventory.json` |
| Source inventory evidence SHA-256 | `1e12957f4a650078087286c8bbee6f51461c8f68ca188428a99cab19e528af98` |

The exact Gate A source/proposal surface is the **154-file** inventory in
Appendix A. Its sorted `sha256  path` stream hashes to
`sha256:32893d5e820a7066603a0abf6befc842f9fadecc5d810f7a2ccf11ce80a56e1c`.
Generated `.next`, dependencies, transient run bytes, and approval documents
are not source inventory members.

### 2.2 Canonical protocol

The registry contains **39** versioned objects. The Draft 2020-12 bundle has
53 `$defs` total: 39 public protocol objects and 14 supporting definitions.

| Binding | Exact value |
|---|---|
| Bundle | `schemas/r4/protocol.schema.json` |
| Bundle SHA-256 | `e0c4795d5105c8a099d0e725c99834b526444d52468e8a2f064eb350a89178af` |
| Index | `schemas/r4/schema-index.json` |
| Index SHA-256 | `8d772f383267291253af03f0a6ae1f5630296dc52367478b6deed76d3c4577ea` |
| Registry order hash | `sha256:560b404cbae4105d4a59d63c3d68c32ad3493e964d4233d9da68d55bb85484b0` |
| Golden fixture bundle | `sha256:2b852e34066066af2119760bee7d5749b4f89dbb634a7851fa4ce2831c754d5e` |
| Parent Packet in index/package | `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5` |

Gate B may generate storage/API mappings for these bytes. It may not change a
protocol field, enum, limit, canonical hash rule, lifecycle, or authority.

### 2.3 Exact operation map

Gate A implements exactly **45** operation definitions under `/api/v1`: 6
reads and 39 mutations. All **39** mutations require idempotency; 31 also
require the current expected object version. The complete request/result/auth
map is the indexed `schemas/r4/gate-b/operations.md` artifact.

### Public and Guest (13)

`third_place.list`, `projection.read`, `public_encounter.issue`,
`interaction.create`, `interaction.read`, `interaction.delete`,
`notification.set`, `notification.remove`, `notification.verify`,
`grant_offer.accept`, `direct_invite.redeem`, `agent_derivative.mint`,
`room.pair.exchange`.

### Controller (18)

`control.status`, `control.interaction.read`, `room.create`, `room.pair`,
`room.binding.revoke`, `room.mode.set`, `room.retire`, `room.delete`,
`projection.revoke`, `response.revoke`, `grant.issue`, `grant.replace`,
`grant.revoke`, `grant_offer.issue`, `grant_offer.revoke`,
`direct_invite.issue`, `direct_invite.revoke`, `interaction.close`.

### Curator (2)

`curation.admit`, `curation.unlist`.

### `room_operator.v1` (12)

`room_operator.status`, `room_operator.sync`, `room_operator.pull`,
`room_operator.cycle.reserve`, `room_operator.cycle.recover`,
`room_operator.cycle.abandon`, `room_operator.dispatch.issue`,
`room_operator.ack`, `room_operator.projection.deliver`,
`room_operator.response.deliver`, `room_operator.stale.attest`,
`room_operator.local_purge.receipt`.

### 2.4 Gate A technical evidence

| Check | Final result |
|---|---|
| Typecheck | pass |
| R1–R3 spine regression | 45 / 45 pass |
| R4 offline suite | 293 / 293 pass with external network denied |
| Static repository/effect audit | pass; external/provider/email/real-Guest/production counts all zero |
| Room no-AI source assertion | pass |
| Production Next build | pass; 8 routes; standalone asset preparation and build audit pass |
| Five-journey deterministic walkthrough | two byte-identical runs; aggregate `sha256:a09a4ff6208278e43a7d27a49f86c57d0ae302a933c1e6b2e193298cbf16fa56` |
| Real Forme Twin read-only probe | pass; zero source-body bytes |
| Production browser path | pass; deleted/terminal Interaction remains controlled `404 not_found`, never `503` |

Structured Gate A evidence is
`docs/evidence/r4-gate-a-evidence.json` at
`sha256:b2e79265eb92c46c8bb2e6c8fb3f6d0fa334a3eef4c1044a95a5243a646cfe4f`.
The independent implementation/browser audit is
`docs/evidence/r4-gate-a-independent-audit.md` at
`sha256:c0b4284786608904cf6cd576edab773dda89d45648ce2fdabda99b4bd9e3eb3d`.

These results mean Gate A is Green for **Gate B review**, not that R4 is
Owner-accepted, Done, deployed, or ready for a real Guest.

## 3. Frozen Gate B proposal artifacts

| Artifact | SHA-256 | Purpose |
|---|---|---|
| `schemas/r4/gate-b/README.md` | `sha256:e94d9dc6ca3412658ffaa51ddae1e424913b7607b7a76c8d2e40cfee62bd128b` | status and non-execution boundary |
| `schemas/r4/gate-b/codex-zero-call-contract.json` | `sha256:45219c9986bb585a2998f3d2c984213aac83f99f0be2070ab84981633570c845` | official Codex zero-call contract |
| `schemas/r4/gate-b/local-formats.md` | `sha256:f2a32c74c9b55cb15533b991ff8924f5f4e58619dae922c48f8fcddc42c10995` | local roots, records, protection, cleanup |
| `schemas/r4/gate-b/macos/build-recipe.json` | `sha256:93d82da1386adfdbf69521ee7c51fbf57cc8754552cb19ad1f4c6095ea1390de` | temporary launcher/signing/Keychain probe |
| `schemas/r4/gate-b/macos/forme-fresh-response.sb` | `sha256:5f801ddabe277fb29608dff91d4c3c2ded1639a2ee363fd9d7bc866757e263ab` | proposed deny-first Fresh child profile |
| `schemas/r4/gate-b/operations.md` | `sha256:b7de37eecc8809aeccea914e3005b3a3f2e60b2bddb9aefca42addf8c11802e4` | exact 45-action API/auth/schema map |
| `schemas/r4/gate-b/postgres-contract.md` | `sha256:73ad0d23400d0bb7adeabdc0aed5c960de3bc1a180e02cfaa12a68d1056424dc` | exact SQL/function/role/encryption contract |
| `schemas/r4/gate-b/runtime-boundary.json` | `sha256:ad65fc19721f87a3860079af229806d15c8ed2bb72296dc23ba37201a0569450` | complete runner workset/effects/lane order |

| Index binding | Exact value |
|---|---|
| Artifact index | `schemas/r4/gate-b/artifact-index.json` |
| Artifact index SHA-256 | `sha256:2fc4f5ec2554f43a8c9a0d93950a5ce1198b91555f361af53d80c7664c5b6a9f` |
| Artifact count | `8` |
| Artifact aggregate | `sha256:f290ba035efa2eb84d899bf67d4ffb03c523d88556ce96b66f4f3a2862159310` |

These are static contracts, not executable Gate B implementation. There is no
SQL migration, runner, native app, signed artifact, Keychain item, Codex
adapter, Docker resource, or provider session in this proposal commit.

## 4. Exact Gate B construction and local validation

### 4.1 Lane order and repository workset

The authoritative workset and command names are in the indexed
`runtime-boundary.json`. Unlisted file creation is Red. Existing
`package-lock.json` must remain byte-identical. `package.json`, `tsconfig.json`,
and `scripts/r4-doc-audit.mjs` may change only to connect the listed files and
commands without adding dependencies. This Manifest and its Owner Review are
immutable.

Execution order is fixed:

```text
preflight
→ Gate A regression and protocol replay
→ API and local-format schema construction
→ PostgreSQL migration, roles, functions, races, and rollback
→ encrypted-field adapter
→ fake budget and synthetic event fence
→ official Codex zero-call probe
→ macOS physical-boundary probe
→ cleanup, body-free evidence, STOP
```

### 4.2 Disposable PostgreSQL and encrypted fields

| Binding | Exact value |
|---|---|
| Image | `postgres:16.10-bookworm` |
| OCI index digest | `sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74` |
| Linux arm64 manifest | `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf` |
| In-container version | `postgres (PostgreSQL) 16.10` |
| Temporary root | `/private/tmp/forme-r4-gb-e417836bd67b` |
| Container | `forme-r4-gb-e417836bd67b-pg` |
| Volume | `forme-r4-gb-e417836bd67b-pgdata` |
| Database | `forme_r4_gate_b` |
| Container network | `--network none`; no Docker network and no host port |

The indexed PostgreSQL contract fixes 37 tables, named text domains plus
`CHECK` constraints instead of PostgreSQL enum types, exact indexes/functions/
roles/grants, transaction and lock order, preflight, verification, disposable
rollback, and required race tests.

Projection capsule content, Room labels, Interaction/Guest bodies, Response
bodies, notification addresses, and sensitive idempotency recovery results are
application-encrypted before storage. AES-256-GCM uses unique 96-bit nonces,
canonical AAD, a global nonce registry, and a synthetic 32-byte Gate B key
passed by inherited descriptor. No production KMS or production key is
selected.

Downloading the exact public image is the sole network exception. The running
container itself has no network. Digest/version/resource drift aborts before
SQL. Cleanup must prove container, volume, and temporary root absence.

### 4.3 Official Codex 0.145.0 zero-call probe

| Binding | Exact value |
|---|---|
| Distribution | official `@openai/codex@0.145.0`; `codex-cli 0.145.0` |
| JS launcher SHA-256 | `134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477` |
| Darwin arm64 binary SHA-256 | `1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590` |
| Staged binary | `${RUN_ROOT}/install/FormeLocal.app/Contents/Resources/Codex/codex` |
| Generated stable schema | 273 files; aggregate `sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62` |
| Real auth / real Codex home | absent / not mounted |
| Allowed wire requests | `initialize` then `initialized`, then close stdin |
| Authorized thread / turn starts | `0 / 0` |
| Network / provider bytes / spend | denied / `0` / `US$0` |

The probe may run only version, help, official stable schema generation, and
app-server initialize in an empty environment and neutral non-Git directory.
It denies every thread, turn, model, account, config, tool, MCP, plugin, Skill,
hook, browser, web, file, command, process, and remote-listener request.

Even a clean zero-call probe is **Yellow / manual-owner-only** for the AI lane:
initialize-only evidence cannot prove a future model-visible tool inventory or
place a future provider request behind `ResponseTransportGateV1`. It does not
permit Guest bytes to enter Codex. A future actual Fresh Response requires a
new exact grant and stronger evidence; no private Codex fork is silently
authorized.

### 4.4 macOS physical-boundary probe

The pinned host is macOS 26.5.2 build 25F84, arm64, Darwin 25.5.0, Xcode 26.6
build 17F113, Swift 6.3.3. Gate B may create one temporary self-signed test
identity, one custom temporary test Keychain, and one signed/hardened
`FormeLocal.app` inside a fresh 0700 run root. It may show one local
user-presence test window.

The Fresh child reads the staged signed app/Codex bytes and its declared
isolated roots only; it has no network entitlement, listener, generic tool,
descendant exec/fork, live repo, real home, connector secret, candidate key,
or real Guest bytes. Seatbelt is host-specific test evidence, not a universal
production containment claim.

Unsupported custom-Keychain/Secure-Enclave composition, user-presence
cancellation, capture uncertainty, or an unenforceable hard resource ceiling is
Yellow and leaves the AI lane manual-only. Unexpected access, data persistence,
hash drift, or cleanup failure is Red.

### 4.5 Fake budget and synthetic event fence

The budget replay uses an in-process fake upstream with sockets and DNS denied.
It uses fixture-only thread/turn identifiers and starts no real Codex thread or
turn. It tests every boundary and `limit + 1`: 3 dispatches, 128,000 aggregate
input tokens, 8,000 output tokens, 60 minutes, US$1 synthetic incremental
spend, 30-second permits, no retry, and no fallback. A pass still means zero
provider bytes and zero actual spend.

### 4.6 Evidence and cleanup

Final evidence may contain only tool/build hashes, counts, boolean denials,
status/error codes, resource observations, SQL object names, and body-free
cleanup receipts. It may not contain request/response/source text or path,
environment values, credentials, capabilities, prompt/transcript, raw runtime
events, machine identifiers, tool arguments/output, or provider payload.

The exact final repository reports are
`docs/evidence/r4-gate-b-execution.json` and
`docs/R4-GATE-B-EXECUTION-REPORT.md`. Transient evidence is staged only under
the run root and copied to the Git-ignored `.forme/gate-b-evidence/${RUN_ID}`
root after filtering. The approved Manifest and Owner Review are never edited.

## 5. Verdict rules and return gate

- **Green** means one named local/disposable lane passed its exact contract.
  It never means provider-ready or production-ready.
- **Yellow** means a physical capability is unsupported or cannot be proven.
  Independent local lanes may finish, but the Fresh AI lane remains
  `manual_owner_only_available`.
- **Red** means contract drift, forbidden effect, sensitive leak, unexpected
  access, test failure, or cleanup uncertainty. Remaining lanes stop.

After Gate B, the agent must return the body-free execution report, exact
result hashes, Green/Yellow/Red by lane, cleanup proof, and remaining gaps.
It must not start a provider call or Gate C because a local check passed.

## 6. Explicitly deferred to later approval

Gate C still owns real identity and Cloudflare Access binding, Caddy/edge
configuration, production PostgreSQL, backup/restore/log retention, real email
provider, production credentials, deployment, public traffic, real Guest data,
real Room/Projection IDs, public demo activation, and rollback. Any provider
call—before or during Gate C—also needs a separately labeled, hash-bound First
Provider-Call Test Grant.

This Manifest intentionally does not contain its own SHA-256. The low-load
Owner Review binds its final external hash after these bytes freeze.

## Appendix A — exact source and proposal inventory

Inventory order and hashes are mechanically checked by
`npm run r4:docs:audit -- --final`.

<!-- FILE_INVENTORY_BEGIN -->
`README.md`  `sha256:770ef931d95c02f0e7f2380abbd58c68fb3808b281e4fde0dbd46cd441c6b5df`
`apps/room/README.md`  `sha256:7ca578a9a633b7838a982b6a7f2afddd745b43749b9dae729f17a3f45806e305`
`apps/room/app/api/v1/[...segments]/route.ts`  `sha256:4cc64bed96b1430d9f2db2f1f76c74282a7e0eace1aab65cc831f0de946fd75e`
`apps/room/app/g/[interactionId]/page.tsx`  `sha256:428bd6c260ef0fe2881379c82a59a8e21175f72cf0cd7039c7800dc06b3e960c`
`apps/room/app/globals.css`  `sha256:3b0b3521343b66a591dfcddf039d8170df1907e0b03b87d21c695d44fb8360ec`
`apps/room/app/layout.tsx`  `sha256:407a7112b3cbee09ed6739169c7bef1c2f59697b47935999568767b845bb098d`
`apps/room/app/owner/interactions/[interactionId]/page.tsx`  `sha256:b5b513c222cbbeee8df9d7f8bb935b996493c597a6177c3c56d6465ba98cd7a0`
`apps/room/app/owner/page.tsx`  `sha256:568e240aee23349f772e9d19091b14ed55b143a751bfcef9e597549f761c4cdd`
`apps/room/app/p/[projectionId]/page.tsx`  `sha256:2b9f51740237428a8767b0fdd70086b5383b39410e2e9906e447bbf81e32ab7d`
`apps/room/app/page.tsx`  `sha256:a1f3abbe91af6782e9ad0cdad23c32d61c5ee309bc32c9ca9484a2446fb03358`
`apps/room/app/private/[projectionId]/page.tsx`  `sha256:0dcbeb575940de421e7cfce43ec0d350ef46679dc02c8c6a014f8303f544ebe6`
`apps/room/next-env.d.ts`  `sha256:1862ac4bbbc5192d4bf562161df66ea547ed3e67173100656ab606ae9797db2b`
`apps/room/next.config.ts`  `sha256:59660b264fc5923e4db388aab58240bbf1481bb620856f017b06fb46ce96f60d`
`apps/room/package.json`  `sha256:2921d981fd2668a9eacc97e6492c81d1cc12093279d963011bc439a65c5df575`
`apps/room/scripts/assert-no-ai.mjs`  `sha256:fd681cbdf1fc6c7e2c341a502aaad1b7240d0f748bbc3290a7ac1a288b6a151c`
`apps/room/src/application.ts`  `sha256:b5ee42622bbd3e635b967ca5e9c3744ac88f0d5a5a0a98457f71b2949e3b3cdf`
`apps/room/src/components/GuestAsk.tsx`  `sha256:b961b0aecfd98a389fbaf22ae34c1f3e9b819dd681369487b0a30cdcd09ba270`
`apps/room/src/components/GuestStatus.tsx`  `sha256:81ffa566e96c85db1da26600d9f218b2afaeeda0e18c384466af6b60326d420c`
`apps/room/src/components/OwnerControls.tsx`  `sha256:34056b344583af9241774588be28251ffdfc1de41f8b6a21170737122d197bd4`
`apps/room/src/components/PrivateProjection.tsx`  `sha256:2583fd2e34bbd038ec340a883974ca77f2dc39dba0da286f3b91a913c5e3ffd1`
`apps/room/src/components/client-api.ts`  `sha256:e837f7201e42c9b9eaf574e3975f9cf66c58edf425333e88eb12565d22f7e1a6`
`apps/room/src/consent.ts`  `sha256:b628146a5a73483cc506314cf5557bc57c3231a6a1d6636d81c2bcec4b03d785`
`apps/room/src/domain.ts`  `sha256:59a8ccb3d352299f176529482e1878a75bc4a6e5b9309de4d71d0d99ef89df39`
`apps/room/src/http.ts`  `sha256:266417a7dd60f637e65dc291833028898ebf5dc59cfbe4ec1c1ae182d74c781e`
`apps/room/src/offline-control/notification.ts`  `sha256:e635f4bf7f4568f70de1f72d20640204e54942b8725cc7cecd197b87a5daa571`
`apps/room/src/offline-control/public-rate.ts`  `sha256:64157ff93034eaa432a1cd9d9df5ac814a71a418845f124e9289a91cc29597d8`
`apps/room/src/offline-control/retention.ts`  `sha256:823388fdb120cefe521f5e598a423367ebc3fe6f2b9ba56a26937cf92e7e15b1`
`apps/room/src/operation-inventory.ts`  `sha256:d1808495ed8f171415918a91dcd1b4974cda2b3eb32de2aad0a5aecb3da899f9`
`apps/room/src/projection-page.ts`  `sha256:4ea54a1c16016af1add4e10df57670d747b832ea2aaeb9ebfb2fcc67dfc4700d`
`apps/room/src/publication-verifier.ts`  `sha256:417b1544b14201efbedb156aab8783bd3cb8ef671d988a2d1194019d1c16a7e5`
`apps/room/src/redaction.ts`  `sha256:218c18e29482237ec8acfc48bcad94928186c54588a49b124f13e3b9804608b8`
`apps/room/src/runtime.ts`  `sha256:91db00da5d215519e97a39678fcc58c15334f7d0d295268bd389eb3dcae80bab`
`apps/room/src/store.ts`  `sha256:55e6928194e6a98a9c5adb8d11102b7ed20737f6132858e0d44cc854428be36a`
`apps/room/src/synthetic-fixtures.ts`  `sha256:f8822943b349ca0a6a534ea5089897e9d96e334528d956e0d0385a7df2f45e81`
`apps/room/tsconfig.json`  `sha256:9934e924fa14a53615f52764e4291afcc98c73f178724e3c6d573e54edb81028`
`bin/forme.js`  `sha256:f20505d226172e2d2c45b9dbc518fb5fbb93ba900632e9e6e02599c4c7a35170`
`package-lock.json`  `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812`
`package.json`  `sha256:d6d2912fe2ca48cb082ad95993795285f5b0ee39a040c43216434ff27586097f`
`packages/r4-local/package.json`  `sha256:30eaeffec7e27d91b482aa26dad8512c8cf60bcf4b925d6ad8c8c90221c83fbe`
`packages/r4-local/src/body-free.ts`  `sha256:a8fd4e9cf0ef034e30cc210a9a20657cb4e8476efa1a6d3471b79fe24a312f3d`
`packages/r4-local/src/broker.ts`  `sha256:da11c80e4f805055d0e410f5b1b6916ed9663d24b5909cba06d921a42f071234`
`packages/r4-local/src/candidate-event-lifecycle.ts`  `sha256:fdf1beb05e35b9cc35b7afdd0228cd3de30a068d6bbc8bf4fb7b50393f334b3e`
`packages/r4-local/src/candidate-store.ts`  `sha256:7539652642058ca2329edd295313bcb5c7d81a3943c8d4a0a204f7afdf1b6016`
`packages/r4-local/src/capability-probe.ts`  `sha256:76a0df8445df372daf9b3d43c64d92e05de29dd09ecbb1853e92da9e964b5c19`
`packages/r4-local/src/cli.ts`  `sha256:c16fb5ae3903946048f2b93c9b4898b0a6faf2ca19afc8d9aa64357b20c1e313`
`packages/r4-local/src/coordinator.ts`  `sha256:9571016637fe700304e878e7053be529018e3653c4d1d2852425c47a49720bad`
`packages/r4-local/src/fault-injection.ts`  `sha256:98e4d2ed21ef4ad82a711ccafbe0833efcc763748de7e5f8b6328709ed66beb7`
`packages/r4-local/src/fresh-session.ts`  `sha256:5e933deadb1bfc2d529c20fbd379e1f873e923136c225ccfcd4a8f2760e686ce`
`packages/r4-local/src/index.ts`  `sha256:e17136d819d48ae55dd208ac1999cb10eb64c797f012a0547628d5792d9c8a22`
`packages/r4-local/src/ledger.ts`  `sha256:22180b03bb8e728b2910491ef812efa2c1edb8f98efbff431a1be75a98824e4c`
`packages/r4-local/src/lock.ts`  `sha256:a1a8780c6840a5363ca0624a4e768327b503a57f5135d96a4e1465000d729724`
`packages/r4-local/src/persisted-record.ts`  `sha256:9f02bb2ddc4d79f6b4ada97c98e273d951e7674e2e367823a150b6f74827ce64`
`packages/r4-local/src/projection.ts`  `sha256:8198075455603cc74afd01fde0790a2f243fbf04e4bfcb354d10aaef29e073a5`
`packages/r4-local/src/protected-root.ts`  `sha256:631c155cb88062e2f29e241fbfb9817ba4280ab52a6acbe62b6696110f666d3a`
`packages/r4-local/src/publication-operation.ts`  `sha256:641e21dabd1b39ea9f6c9d210f06f32215c76581ed87269ff4f89ca116ef1c2f`
`packages/r4-local/src/publication.ts`  `sha256:7f19759c114e4e6d384847b55f6c3f4ddeb0eba0da2ab98774bed469b80ad34d`
`packages/r4-local/src/real-basis-probe-cli.ts`  `sha256:7c5981f61016b2bf2f9f3c721f9426d47aab8b7b6b0da421ed7f62c07b0c342e`
`packages/r4-local/src/real-basis-probe.ts`  `sha256:c72aa06beb238feace2b5e9f316c4ef1b08a70b2fd0ef41eecf400e3ab33541d`
`packages/r4-local/src/response-session.ts`  `sha256:543a7245e68d411db35a1470fd4f801eaf11f5ed59ee7ed638ec3ac4253f9b80`
`packages/r4-local/src/restricted-runtime-adapter.ts`  `sha256:4b1e86789e4a9282a47908359c20f6e9d5e0dd13c8a4347a1be1ac5b06215af1`
`packages/r4-local/src/runtime-cleanup.ts`  `sha256:ca5b3529fe9e771f9e202b1cfb85bbb75e9fc01cc23af9ca9c86a0cad3407795`
`packages/r4-local/src/runtime-policy.ts`  `sha256:0e4b088f754ae5ddd3ee980323085e8041fb59fbcee0dcfc0250752b10923228`
`packages/r4-local/src/snapshot.ts`  `sha256:fd94617f57e21bdb415f52666c656128f348feea9b43d93473376e52fbc5cc1f`
`packages/r4-local/src/sync.ts`  `sha256:7a187ef66d3dd7b4dd746b1b5890c0903dcdcfa1225a4199ccafbb40c8af440f`
`packages/r4-local/src/types.ts`  `sha256:a27a1567a5760540c3040be4c5fae49d555ff500fd5ffe89e00dc296991551a6`
`packages/r4-local/src/walkthrough.ts`  `sha256:5bad1615920c315f1b6a5bb9dabd8f4613a5d8dd60b56ba7f27ace4e239f2824`
`packages/r4-protocol/README.md`  `sha256:d0678a31638c3741d198d6f7a9b12bd057c9c08107f92378d76463510086463c`
`packages/r4-protocol/src/canonical.ts`  `sha256:e57c5735df2fdcff1121b8159b18aa76c979334072d5205d7e5ffa449e88d3e3`
`packages/r4-protocol/src/constructors.ts`  `sha256:121b6ca8984823300600100cf9fb0c5ae8cf5643112a5a9d4d3dc6b55a55910c`
`packages/r4-protocol/src/golden.ts`  `sha256:e8122aef463601d5081c068a37753e31cb1be02223c9afada1b3794a23c52ffd`
`packages/r4-protocol/src/guards.ts`  `sha256:49766b2817a441fca9b3f48544843d84698adfa507dc4be34719784ee66b5c5d`
`packages/r4-protocol/src/index.ts`  `sha256:e54c0d0129bfd311241dc4ec4b327430755c350a8c39d86657fc156e3d92a635`
`packages/r4-protocol/src/object-validation.ts`  `sha256:c71043c0c4dc1eb8ed0c82035b86c76f6b5f721ac4ee64bd72eab95c8466e950`
`packages/r4-protocol/src/registry.ts`  `sha256:26281eacc03544b45724617004f4bf92772bff392240c8d346dfbbcdcc22b924`
`packages/r4-protocol/src/state.ts`  `sha256:e077eda9b690a1eedc937dc982375629fb518008c546d3f06c99b6a312220b21`
`packages/r4-protocol/src/types.ts`  `sha256:d68d7a30c38c45025465fda0588f990206b1075a5784287a8e2d81cd8e89317b`
`packages/r4-protocol/src/validation.ts`  `sha256:7e48d46b59ac8d3c18f66fb11ca5953c11a828ba28a31e3c3a1691470deddb27`
`schemas/r4/gate-b/README.md`  `sha256:e94d9dc6ca3412658ffaa51ddae1e424913b7607b7a76c8d2e40cfee62bd128b`
`schemas/r4/gate-b/artifact-index.json`  `sha256:2fc4f5ec2554f43a8c9a0d93950a5ce1198b91555f361af53d80c7664c5b6a9f`
`schemas/r4/gate-b/codex-zero-call-contract.json`  `sha256:45219c9986bb585a2998f3d2c984213aac83f99f0be2070ab84981633570c845`
`schemas/r4/gate-b/local-formats.md`  `sha256:f2a32c74c9b55cb15533b991ff8924f5f4e58619dae922c48f8fcddc42c10995`
`schemas/r4/gate-b/macos/build-recipe.json`  `sha256:93d82da1386adfdbf69521ee7c51fbf57cc8754552cb19ad1f4c6095ea1390de`
`schemas/r4/gate-b/macos/forme-fresh-response.sb`  `sha256:5f801ddabe277fb29608dff91d4c3c2ded1639a2ee363fd9d7bc866757e263ab`
`schemas/r4/gate-b/operations.md`  `sha256:b7de37eecc8809aeccea914e3005b3a3f2e60b2bddb9aefca42addf8c11802e4`
`schemas/r4/gate-b/postgres-contract.md`  `sha256:73ad0d23400d0bb7adeabdc0aed5c960de3bc1a180e02cfaa12a68d1056424dc`
`schemas/r4/gate-b/runtime-boundary.json`  `sha256:ad65fc19721f87a3860079af229806d15c8ed2bb72296dc23ba37201a0569450`
`schemas/r4/protocol.schema.json`  `sha256:e0c4795d5105c8a099d0e725c99834b526444d52468e8a2f064eb350a89178af`
`schemas/r4/schema-index.json`  `sha256:8d772f383267291253af03f0a6ae1f5630296dc52367478b6deed76d3c4577ea`
`scripts/deny-external-network.mjs`  `sha256:3f7408486e62a307d32607e13020992e12b0b671afcedce347303113a12fdf7f`
`scripts/r4-doc-audit.mjs`  `sha256:6c3b665b2c9fde0a6ed12f16764be41fbfbe6aef5b8b975266039b1a4b955857`
`scripts/r4-gate-a-static-audit.mjs`  `sha256:ff519e46f69152298b2799f77b9d309aa66559f5f10517096319c0de4ec5cf15`
`scripts/r4-room-build-audit.mjs`  `sha256:686fbbf6ba9d1e704847c5cfb436111426897ce8028224c63d0e55d3a0c8e78e`
`scripts/r4-room-standalone-prepare.mjs`  `sha256:0f6b7d5b5642343f2fab42356f52e96e225a135d565f10da3c680d0680d5acdb`
`scripts/r4-source-inventory.mjs`  `sha256:685a651b1fbd8ad412bc2401999eee64ea498223970bd45249219db1016a640b`
`src/action-context.ts`  `sha256:3df2da75d90cd98a74b7c8aa64297c41412cd05226a3bd4c154335687f903c0d`
`src/action.ts`  `sha256:0b748c818abfc0dbafbd3245ff9d3ad09952b34b95cefc553513086942a914b7`
`src/agency.ts`  `sha256:e9a554538bb7dd57cd184fcb2b918ad067d542e2dbdbd4e9f188410047a5c160`
`src/boundary.ts`  `sha256:aedf1998ce9d6cc13618b9e40d6f582479e5bfc0c500b1cba9c39f77a3268bc3`
`src/cli.ts`  `sha256:65805d95a85f8f9643a1983c8fe21ec35b82d1651966b0dcf82b025cb76010c8`
`src/cognition.ts`  `sha256:be33f494222ab4bc6c53f69b3e05811301a1d979f08ff4b6bc163f782a077711`
`src/context.ts`  `sha256:bc06fa2321cccad26f6b9538bd8dc9a5344d6356ebe5ee557bfb23c5a5f09e42`
`src/contracts.ts`  `sha256:9db3fa4860e7d54bd3af1a7aa9013918b4d8568fc17d1b54a9f71902a455dea6`
`src/reflection.ts`  `sha256:165e54aa5a1bd51b98f1359ca56c416fce80c6a9bdfa1aac562ce6c43b6b99fb`
`src/render.ts`  `sha256:08b52ed6f06e8ee7be90d3d612f32311536a81e78ca48f46d54c741fc7ccee9a`
`src/runtime.ts`  `sha256:d58d022f609be35da7b55a50c766949804df9eb0d6911397eeb05307a1791fcf`
`src/store.ts`  `sha256:12458b82e754281e48b3c620986e611b7612fda4563737699f60fe1ca5f1a1f6`
`src/types.ts`  `sha256:8b5ddfe6477ddd46f8eedbdeb1bc7fccd2b59f0d383e3ec0de877b79f2757aab`
`test/agency.test.ts`  `sha256:a439cbaf744da063871761df1765b094ff69666228a7d8cc7a3c259bfc74f394`
`test/boundary.test.ts`  `sha256:3840870c9e8f9449e9ab1d7f478ba194135b89d7b4394c49b447a8a14582ba31`
`test/cli.test.ts`  `sha256:425703463e6d47d45b09513b2a6608c60d757f305aa391796ab53ec656dbaedb`
`test/cognition.test.ts`  `sha256:fe8e0c6818313dd64f6eaf6e39c3057e6d55de13e9c84552fa18625a700334e5`
`test/continuity.test.ts`  `sha256:9011e377c13fb7cfd22b6abeef87448effa4f7ee9a74f027caeca6fc7a36c29e`
`test/helpers.ts`  `sha256:b7857bb05936745f018de0bd3a04310926910e933faccf558d89470e915b4944`
`test/r4/helpers.ts`  `sha256:e28bc06e57f62783367e305e7ef3d98c7805a0a5674802fe2274be928633a5ce`
`test/r4/hosted-application.test.ts`  `sha256:448e347f805792f7929c61c274929c42aa919b75f44b2f044dcbb0d2a1401ed2`
`test/r4/hosted-capabilities.test.ts`  `sha256:daf3a119230995c7a8ab187e34f01126e48c01a7a116cb5b75569d0d7d270ee3`
`test/r4/hosted-control-races.test.ts`  `sha256:c2ef8f0b0e8e1d36bc88c242469d82381562e7ecb78abbc90c2238bca3a4d81b`
`test/r4/hosted-event-compaction.test.ts`  `sha256:de9e2c41adba99743d10b47f585ef9460256e26c74eb325d6c34b2f91f37d3d8`
`test/r4/hosted-gate-a-hardening.test.ts`  `sha256:d0918de5c5015730de775b55da0b52c6715ce18c7c1895d6cca30dd4bb292924`
`test/r4/hosted-http.test.ts`  `sha256:99cb151250bdf5caf6bdc70bd7acf34e289066959de81c8346e5956d26dcd234`
`test/r4/hosted-lost-response-recovery.test.ts`  `sha256:e46f394662b3157228e8fe9f4fd026703cf8ac9c72577779daa8d9cca718bac8`
`test/r4/hosted-notification-control.test.ts`  `sha256:7cb89e04624bdb1afa14b7881bca523b43744a06408c98163a9db6bd7904149c`
`test/r4/hosted-publication-boundary.test.ts`  `sha256:ba30e7297b0bcf8b13e4d170f6737c137203fdf061583164a89647e69fcb3626`
`test/r4/hosted-publication-helpers.ts`  `sha256:29f94ab163103e466bb9c0797b731f03dd2a8f1a6ed86bac7fa4c70018dd5bbb`
`test/r4/hosted-redaction.test.ts`  `sha256:accfc9cba065818ae5542dfbbccb175d45099137af0fa06a31d0e191e140d46f`
`test/r4/hosted-response-terminal.test.ts`  `sha256:c252af197e2bdda222bd4e288d8a31d63123a06cfca382c14bf6d6164cfe52ee`
`test/r4/hosted-retention-janitor.test.ts`  `sha256:fc7a8a8384f2f9e8510c43f170ade7a63d3e30c60b733453bc2a28dba9aeefb6`
`test/r4/hosted-room-operator-binding.test.ts`  `sha256:c5fe4b585d7f46aa36fd0e982648faf5c05ea99afad303c90321e802c035b994`
`test/r4/hosted-web-agent-parity.test.ts`  `sha256:b74f5d8adbe4fd678549a801f698d78b0adb5ebf6ba24a7182e9c84ccfa04cc6`
`test/r4/local-canary-matrix.test.ts`  `sha256:2574ef780542cb5d5c9c3debef21a558c98d1e9e1339e467dec85c8326c99766`
`test/r4/local-cli.test.ts`  `sha256:1d7d68093c82b403e1f723481c2fd49480d3a016896afb542b8b49af3ba12d98`
`test/r4/local-fresh-session.test.ts`  `sha256:886ef087891728b8e99b3498ab5c5a3a3afbf7fbe25676db6837469e8695a169`
`test/r4/local-gate-a-hardening.test.ts`  `sha256:acfe5e4b00db9ef30a25a0a87252508a3511c26e8ad70d617cf33502d384c3ef`
`test/r4/local-ledger-sync.test.ts`  `sha256:5e01f22741808b69dd8ceac094ded0d7891f73a07343ed4bbc0ae628a3a4b9c3`
`test/r4/local-lock-candidate.test.ts`  `sha256:78af4048f65755cc4d71b280301d999887fa99872a7319cc7c8b64c5e4068f73`
`test/r4/local-projection.test.ts`  `sha256:7748f7e8bb58fb9f4e8db5a6b807daae569be5cc23d6ba7bb96085a7831905f9`
`test/r4/local-publication-operation.test.ts`  `sha256:bdc521f08e3131ab49144f392d45d843e5f9db4b158b223c1b8a5b2e052f5193`
`test/r4/local-response-session.test.ts`  `sha256:7101054a78f3cf3540b58e79d21dd1c3d063d8b140dedbbf7a1fc8b4ac105af0`
`test/r4/local-runtime-cleanup.test.ts`  `sha256:6b81ddc73bcf3294ebc041cab66e711c8e0498340fd436d888cf2fd7102fdef2`
`test/r4/local-snapshot-broker.test.ts`  `sha256:daa671aa8f4b982250b628db26f0c4a726ad3aced315e70a4b51910e5b6b255c`
`test/r4/local-terminal-event-sync.test.ts`  `sha256:da3c3d764acf0b0c8fb088debc4e0df923c6d1ec7b0e615bb04c346c31a8eeb1`
`test/r4/package-surface.test.ts`  `sha256:4b5775a822437aca8119a9a3e9dc85f2d7ce5e5f252ba5cd6a484e2efd6c38d0`
`test/r4/protocol-contract.test.ts`  `sha256:b4664bdff8c142ae738d08356d9b31e42641e5f37b92831702ecdaf25b4be442`
`test/r4/protocol-event-contract.test.ts`  `sha256:5b178ffcb3917d86928eddba1220abb4407db4975c4786e0e33542343ad481d9`
`test/r4/protocol-matrix.test.ts`  `sha256:6ef23cd871b6ed3ef06a3da89d0458882391ed809176eb5343c18e7c36fc90a4`
`test/r4/protocol-successor-scope.test.ts`  `sha256:eb138962ba6476f553e515c4a35b5d8c25eb2e7d234bc8fdb4555022c96c1264`
`test/r4/protocol-time-window.test.ts`  `sha256:37189ccd3bf15a0af5f2766983fa47a6229204e154a900302c48f7d4811ca764`
`test/r4/publication-boundary.test.ts`  `sha256:c5472a303b6418eba4d99acad453a136c44700bd961eafcd258f025056ece6d3`
`test/r4/ui-client-api.test.ts`  `sha256:a1bd49a08bdca29bfdce9731af0aad2cc8357737de36a6ab83408a9759c558c8`
`test/r4/ui-static-safety.test.ts`  `sha256:d220ddd1adfb1e23201d6f026bfd03242ba7ba84865e5b8a3b9fd99e695798c1`
`test/r4/walkthrough.test.ts`  `sha256:eb664535f81ee0814bbec37f0b7194a22a9e36899a0f1bb600eaf50fddc603ac`
`test/recovery.test.ts`  `sha256:6d090371c0f8cf5b38e7ffeeea5f56177a398e1029a3106d734f48dacc4bdc83`
`test/runtime.test.ts`  `sha256:f4101c76ace7db26f641fbce560ddc60195fb5859bf19cf37a395a98b3f1c300`
`tsconfig.json`  `sha256:bff9e14538a2828bed482bf431f9db6683505abfe89d74c305541bff3b0e2d19`
<!-- FILE_INVENTORY_END -->
