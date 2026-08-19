# R4 existing-server readiness inventory

- Status: **repository-only inventory plan; live server state unobserved**
- Date: **2026-08-18**
- Walking Slice: **#67 Public Room / bounded private knock**
- Product Progress in this planning change: **0**

## Why this is now the next Enabler

The disposable PostgreSQL boundary has already passed schema apply, restart,
persistence, rollback and exact cleanup. The product runner has separately
reached and passed its PostgreSQL schema/verify boundary. Repeated later cache
misses show that Docker image retention is volatile; they do not invalidate
either proof and must not become a product readiness gate.

The next useful uncertainty is deployment-shaped: whether the Owner's existing
server can host an isolated, synthetic R4 staging slice without changing
Production traffic. This document defines the inventory only. It does not read
the server, create state, deploy, pull an image, run SQL or authorize Gate C.

## Confirmed design contract

The approved target remains:

`Cloudflare → Caddy → Hetzner → self-hosted Next.js Node app → PostgreSQL`

- Caddy is the application's only HTTP entry.
- One immutable application image provides `app`, one-shot `migrate` and
  one-shot `janitor` commands.
- The application joins the existing `app_net` and database network; browsers
  cannot reach PostgreSQL directly.
- PostgreSQL is the authoritative hosted store for R4 P0; Redis is not added.
- Migration is a separate hash-checked step, never an application-startup side
  effect.
- Merge is not deploy. A Production promotion must bind an exact commit,
  schema manifest and immutable image digest under a later Production grant.

These are design facts, not observations of today's server.

## Live facts that remain unknown

The inventory must resolve each item to `MATCH`, `MISSING` or `UNKNOWN` without
recording secret values:

| Area | Exact facts needed |
|---|---|
| Hetzner host | account/reference, host alias, OS/architecture, access identity and resource headroom |
| Caddy | version, active config reference, listener, upstream route, source allowlist and proxy-header policy |
| Application artifact | registry/repository, immutable digest, platform, SBOM and health command |
| Compose/runtime | exact service names, `app_net`, database network, volumes and restart policy |
| PostgreSQL | host/cluster/database/schema/version/extensions and network reachability class |
| Database authority | separate migrator, application and verifier roles plus exact grants |
| Connection policy | TLS verification, pool/timeouts and body-free DSN reference |
| Recovery | backup horizon, latest backup receipt, restore evidence and compatible image rollback path |
| Cloudflare | account/zone/hostnames, origin protection, Access issuer/audiences and MFA policy |
| Secrets | resolver, reference names, access identity and rotation procedure; never raw values |
| Operations | log fields/retention, janitor schedule, alerts, incident owner and kill switches |
| Isolated staging | namespace, synthetic-only database/roles, resource/spend ceiling, cleanup and rollback |

## Proposed read-only inventory envelope

A later Owner-confirmed envelope should bind the exact host aliases, access
identity, allowed command list and body-free output schema. It may read only
metadata needed for the table above. It must not:

- print or persist secret, DSN, token, key, body or real Guest bytes;
- write files or configuration on the server;
- restart services, create resources, pull images or deploy;
- run a migration, mutate PostgreSQL or alter roles/grants;
- change Cloudflare, Caddy, DNS, routes, traffic or Production state; or
- push, merge, publish or request Gate C.

The result is one body-free inventory artifact plus a recommendation:
`STAGING_READY`, `REPAIRABLE_GAPS`, or `ARCHITECTURE_DECISION_REQUIRED`.

## Later isolated-staging envelope

Only after a Green inventory may a separate envelope create an isolated
service/network/database/role namespace, use synthetic data, run one exact
migration/verify/application lifecycle and clean up exactly. It must keep
public DNS and Production traffic closed. Because this would use remote access,
credentials and durable server state, it remains an Owner stop gate.

## Current stop

`LOCAL_DOCKER_PERSISTENCE_PROOF_SUFFICIENT /
PRODUCT_RUNTIME_REPOSITORY_GREEN /
SERVER_READINESS_INVENTORY_PLAN_REPOSITORY_GREEN /
LIVE_SERVER_READ_APPROVAL_REQUIRED /
ISOLATED_STAGING_NOT_REQUESTED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED /
PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
