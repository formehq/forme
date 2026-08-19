# R4 local Public Core activation result

## Superseding outcome — PostgreSQL Green; product bootstrap failed cleanly

Corrected run `fd98766193fb82cb` used the exact current-user Docker socket and
isolated client configuration. It completed the sole approved anonymous pull
of the pinned `linux/arm64` image, created the disposable database resources,
reached PostgreSQL 16.10, applied the exact schema and passed verify.

The run then stopped before the first product-runtime load. The body-free
result reported a generic bootstrap failure; repository diagnosis found an
exact deterministic cause: three synthetic Projection claims were classified
as `inferred_allowed` while omitting the uncertainty text required by the
existing Projection protocol. No Room, binding, Projection delivery,
admission, encounter or Interaction occurred. `runtimeLoads=0`, and exact
container, network, volume and private-root cleanup is Green.

The fixture correction is repository-only, changes no schema, trust boundary
or Owner meaning, and is covered by a direct protocol test. The exact image is
now cached as permitted. The pull/lifecycle authority is consumed and the run
was not repeated.

Current stop: `LOCAL_PUBLIC_CORE_RUNTIME_INTEGRATION_TECHNICAL_REVIEW_GREEN /
EXACT_IMAGE_ACQUIRED / POSTGRES_SCHEMA_VERIFY_GREEN /
PRODUCT_BOOTSTRAP_FAILED_CLEAN /
PROJECTION_PROTOCOL_CORRECTION_REPOSITORY_GREEN /
REPLACEMENT_ACTIVATION_DECISION_REQUIRED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

## Superseding outcome — image acquisition attempt failed cleanly

The approved replacement envelope made its one exact anonymous pull attempt
in run `4f810557bf3ae7df`. Docker returned a body-free nonzero result at
`docker.image.pull`; the pull did not complete and the lifecycle stopped before
container construction or PostgreSQL.

The run created no container, network, volume, private runtime, database,
schema or Guest record and proved all run-owned resources absent. A failed
pull may leave Docker-managed partial layer cache, however, so image-cache
residue is honestly `UNKNOWN`, not claimed absent. The pull and lifecycle
budget are consumed and the command was not repeated.

Repository review found that this new runner used an empty process environment
and implicit Docker socket, unlike the physically proven #77 transport. The
runner is now corrected repository-only to use the exact current-user socket,
an isolated `HOME`/`DOCKER_CONFIG`, closed locale/PATH and explicit call
deadlines. That correction is validated but has made no Docker call.

Current stop: `LOCAL_PUBLIC_CORE_RUNTIME_INTEGRATION_TECHNICAL_REVIEW_GREEN /
IMAGE_ACQUISITION_ATTEMPT_FAILED_CLEAN /
CORRECTED_DOCKER_TRANSPORT_REPOSITORY_GREEN /
NEW_ACTIVATION_DECISION_REQUIRED / OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

## First no-pull outcome

The product-facing Room runtime is now connected to the existing Durable
Public Core through a bounded local activation mode. The Next.js public API,
Third Place and Projection pages can select a loopback PostgreSQL-backed
runtime by an exact private-root environment binding. Synthetic walkthrough
mode remains separate, and an unconfigured build still fails closed.

This is repository Technical Review, not Owner Experience Acceptance and not
Production. The first synthetic local activation rehearsal stopped cleanly
before PostgreSQL because the exact `linux/arm64` image was not present in the
Docker cache and the envelope prohibited pull and retry.

Machine-readable evidence:
[`evidence/r4-local-public-core-activation.json`](./evidence/r4-local-public-core-activation.json).

Current stop: `LOCAL_PUBLIC_CORE_RUNTIME_INTEGRATION_TECHNICAL_REVIEW_GREEN /
LOCAL_ACTIVATION_REHEARSAL_FAILED_CLEAN_IMAGE_NOT_CACHED /
REPLACEMENT_IMAGE_ACQUISITION_DECISION_REQUIRED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

## What is now connected

- The existing 32-action Public Core inventory remains the only application
  surface.
- Public, Controller, Curator, room-operator and Guest-capability requests are
  mapped through a closed local transport membrane.
- Controller, Curator and room-operator secrets, identity material, database
  URL, body key, capability pepper and publication authority are read only
  from an exact canonical private directory (`0700`) containing nine exact
  regular files (`0600`, current uid, one link, no-follow reads).
- PostgreSQL is restricted to an exact `127.0.0.1` URL and a one-connection
  pool.
- The public route ignores caller-supplied synthetic actor and rate-bucket
  headers in local activation mode.
- The Guest UI exposes only `manual_owner_only`: no model, email, automatic
  answer, Provider call or Production identity is introduced.
- The local Harness remains the Owner workbench. The hosted `/owner` surface
  intentionally remains unavailable outside synthetic mode because no
  Production Owner identity adapter has been authorized.

## Repository evidence

- `npm run typecheck`: Green.
- `npm run check`: `45/45` spine, `608/608` R4 and `145/145` Gate-B Core.
- `npm run test:r4:offline`: `608/608`, with external network denied.
- `npm run room:build`: Green under the normal Turbopack path.
- Post-build audit: 18 route chunks, 9 dependency traces, zero model/provider
  packages, zero Owner paths and zero source-reader/process-execution markers.

## Physical rehearsal evidence

Run `541c92f7ea265465` used the exact image reference
`postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
and exact `linux/arm64` platform. Docker was reachable, but the local
`docker.image.inspect` did not find an admissible cached image. Under the
approved no-pull/no-retry rule the run stopped immediately.

- status: `FAILED_CLEAN`
- image pulls: `0`
- schema/verify/runtime loads: `0 / 0 / 0`
- real Guest records, Provider calls, messages, public traffic, Production and
  Gate C effects: all `0`
- container, network, volume and private-root residue: all proven absent

No second invocation is implied by this result. The next effectful decision is
either one exact image acquisition plus one replacement synthetic rehearsal,
or an independently populated exact cache plus one fresh no-pull rehearsal.
Only after that rehearsal is Green should the Owner review publication-stable
copy and the single real `24h / 1 Interaction` encounter.
