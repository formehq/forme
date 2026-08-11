# R4 #67 Local PostgreSQL Wiring — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-11
- Construction Packet SHA-256:
  `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`
- Packet proposal baseline HEAD / tree:
  `fd3abebec02a762d3e318ddba4415389dfd625a6` /
  `9f2c226d0e12d6c5747ec3b693c6ac51c7bb2b27`
- Durable Construction baseline HEAD / tree:
  `c831b4d5253049c4581d3c576aea59648d699d97` /
  `90f8ad8903dba982d2e1d11db1ec31ec1ab99f57`
- Gate C activation authority: **NOT_REQUESTED**

This Review is intentionally short. The Packet is the complete authority
surface. Approval must bind the exact Packet SHA above, this Review's external
SHA-256, the Packet proposal baseline and the final wrapper commit/tree that
contains this Review. This file does not contain its own hash or final wrapper
binding.

## What this builds

One local-only bridge from the already-reviewed Public Core application to a
real `pg` driver and disposable PostgreSQL 16.10:

```text
reviewed application/store semantics
  -> concrete pg executor + exact 20-method bridge
  -> disposable localhost PostgreSQL
  -> apply / verify / walking flow / restart / empty rollback / cleanup
```

It remains test-only and default-off. Production runtime/API routes, Vault,
HTTPS transport, real Room/Projection/Guest data and public traffic remain
absent.

## Six Owner choices

Approval accepts all six choices together:

1. **Dependencies.** Add exactly `pg@8.23.0`, `@types/pg@8.21.0` and the
   Packet's frozen 15-entry total lock delta including those two direct entries,
   entirely from the local npm
   cache with scripts and registry network disabled. The predicted lock hash is
   `sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f`.
2. **One public image acquisition.** Permit one anonymous pull of only
   `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
   for `linux/arm64`; keep only that exact public image cache afterward.
3. **Crypto and Room authority.** Permit the narrowly authenticated
   canonical-body decrypt path and require every Room-operator action to verify
   the keyed binding credential inside its named SQL transaction. No schema or
   SQL artifact may change.
4. **Local physical rehearsal.** Permit the Packet's public deterministic test
   crypto fixtures, two exact local database identities, one consumed physical
   grant, closed Docker command set, same-container restart, exact SQL
   apply/verify/rollback and mandatory exact-owned cleanup.
5. **Workset and effects.** Permit exactly 14 Stage A tracked paths and nine
   Stage B tracked paths, one loopback-only Docker/PostgreSQL stack, one stacked
   proposal branch and one Draft PR. Ordinary tests and CI remain fake-only.
6. **Stop.** Stop at
   `LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / GATE_C_NOT_REQUESTED`.
   Production configuration, migration, route, traffic and Gate C remain false;
   #67 and R4 remain open; merge remains forbidden.

## External and physical effects

| Effect | Maximum if approved |
|---|---:|
| npm registry calls / dependency scripts | `0 / 0` |
| Anonymous OCI acquisition | `1` exact pinned PostgreSQL image |
| Product/data-plane network | loopback only |
| Concurrent owned Docker stacks | `1` |
| Physical attempts / sequential lifecycles | `1 / 3` |
| Exact run-owned database identities | `2` |
| Production/remote database effects | `0` |
| Runtime/route/Vault/HTTPS activation | `0 / 0 / 0 / 0` |
| Real Room/Projection/Curator/Guest bytes | `0` |
| Product/runtime Provider/model/email messages | `0` |
| Source-control proposal | one new stacked branch + one Draft PR |
| Merge / release / spend | `0 / 0 / US$0` |

The Docker CLI and socket are host-bound and revalidated. Ambient Docker
configuration and credentials are not read. The random database password is a
run-owned secret file; test crypto material is deterministic and explicitly
non-production. All owned containers, networks, volumes, databases,
credentials, configs and temp worktrees must be absent at the end. The pinned
public image cache may remain.

## Hard stops

Stop all non-cleanup/non-evidence work and return to the Owner if any of these
occurs:

- dependency, integrity, lock, implementation or committed-byte drift;
- unexpected image, Docker/socket identity, public bind or external network;
- SQL parse/catalog/verify/rollback mismatch or any required SQL/schema edit;
- action, Room, crypto, binding, replay, retention or privacy drift;
- raw credential/private canary exposure;
- unlisted file/effect; or
- uncertain ownership or cleanup.

No automatic schema repair, alternate image, second physical attempt, weaker
test, repeated pull or broader cleanup is authorized.

## Preparation disclosure

During read-only host feasibility work, an agent mistakenly ran one offline
`npm cache verify`. It did not contact the network or change repository bytes,
but garbage-collected 544 stale cache entries / 1,210,692,037 bytes from the
Owner's user npm cache. The required dependency closure was subsequently
revalidated from cache in an isolated detached worktree, including a clean
offline `npm ci`; the repository remained unchanged except for these proposal
documents. No further cache maintenance is authorized.

## Required end state

If Green, only these new statements become true:

- concrete `pg` executor and 20-method application-store bridge constructed;
- disposable local PostgreSQL schema/verify/container-restart/empty-rollback
  rehearsal exercised; and
- exact-owned cleanup proven.

These remain false:

- credential-vault adapter constructed;
- HTTPS transport adapter constructed;
- production driver/pool configured;
- production migration applied;
- runtime/API route active;
- traffic ready; and
- Gate C ready.

## Approval mechanics

Do not approve from a shortened summary. The final request must name:

- Packet SHA-256 `be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`;
- this Review's SHA-256;
- Durable Construction baseline `c831b4d5253049c4581d3c576aea59648d699d97` /
  tree `90f8ad8903dba982d2e1d11db1ec31ec1ab99f57`;
- Packet proposal baseline `fd3abebec02a762d3e318ddba4415389dfd625a6` /
  tree `9f2c226d0e12d6c5747ec3b693c6ac51c7bb2b27`;
- final wrapper HEAD/tree containing this Review; and
- an explicit statement approving the six choices, one pinned OCI pull,
  local disposable SQL rehearsal grant, exact worksets/effect ceilings and
  non-Gate-C stop.

Any changed Packet or Review byte, baseline/wrapper binding, dependency,
image, workset, effect ceiling or stop requires a newly frozen request.
