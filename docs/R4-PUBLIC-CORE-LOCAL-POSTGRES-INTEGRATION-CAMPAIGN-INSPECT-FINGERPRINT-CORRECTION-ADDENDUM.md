# R4 Public Core Local PostgreSQL Integration Campaign Inspect-Fingerprint Correction Addendum

Status: proposal under the already confirmed local MVP outcome envelope

Date: 2026-08-16

## User-visible outcome and gate

The outcome remains one Green disposable local PostgreSQL rehearsal for R4
#67. Production, real Guest data, publication, traffic and Gate C remain
closed. This correction does not widen the Docker, PostgreSQL or SQL ceiling.

## Exact observed failure

Integration Campaign V3 was prepared once and its one-use grant was consumed
once at root
`/Users/zaynw/.forme-r4-integration-campaign-v3-37adbcbb`.

- approval receipt: `sha256:52adccc8e0ef20048e423aaa54615296753fbaf2497a905a98a3c82f3b4dddcf`
  / `1801` bytes;
- consumed grant: `sha256:b172216dc673fe42456b94f3e64790e7866ec097c59039a4952ccc8ea2714fa7`;
- terminal evidence: `sha256:06c21a912e1082078ccd14d36b68e564f979fbde3b7133e3743bbe8886026cac`
  / `10460` bytes;
- journal: `9` entries / head
  `sha256:696c92d3f404e4ea44d315c4bb1eb86f8e1ae9b1c7c6ffbda616bd488223b9b5`.

Docker `version` matched `29.3.1` on `linux/arm64`. The first read-only
historical `container.inspect` completed with exit `1`, but its missing-object
diagnostic used a body-free frame not present in the literal allowlist:

- spawn `COMPLETED`, signal `NONE`, exact command kind
  `container.inspect`, ordinal `1`, exact target
  `forme-r4-public-core-local-b92ae04555cc3d69`;
- stdout: UTF-8, `1` byte, one `LF`,
  `sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b`;
- stderr: UTF-8, `105` bytes, one `LF`,
  `sha256:36557984fb7353759773898446bc48f3ccc9ad3489f53f5b52ee2c7b3cdf83f3`.

The runner therefore classified the resource as `UNKNOWN` and stopped with
`local_postgres_docker_call_failed`. That was the correct fail-closed outcome.
No fresh container/network/volume was created; all three fresh resource states
are `PROVEN_ABSENT`; PostgreSQL, SQL and the physical rehearsal were not
reached; credential, Docker-config, imported-runtime and coordinator residue
are all zero. Historical absence remains unproved.

## Exact correction

The runner may classify the captured frame as `MISSING_EXACT` only when every
field above matches and the command target is the exact plan-bound container.
The stderr body is never admitted, logged or persisted. The existing literal
missing messages remain valid. Any change to command kind, target, exit,
signal, UTF-8 status, byte count, line framing or either SHA-256 remains
`UNKNOWN` and fails closed.

The implementation must add a closed body-free classifier shared by the real
Docker port and injected tests. Tests must prove the positive captured tuple
and one mutation of every field, plus the existing literal paths and all
Integration Campaign regression lanes.

## Repository construction

Use three direct-child commits after a one-file Addendum and one-file Owner
Review:

1. `Kif`: modify exactly
   `scripts/r4-public-core-local-postgres.mjs` and
   `test/r4/public-core-local-postgres.test.ts`;
2. `Lif`: add exactly one artifact index, one strict evidence schema and one
   machine-evidence JSON under the existing R4 schema/evidence roots;
3. `Mif`: add one construction report and update exactly the nine active
   current-status surfaces already used by the platform-select correction.

The successor execution authority must use fresh versioned Integration
Campaign Card/Review paths and bind the failed V3 root/evidence/grant/journal,
the correction Addendum/Review, Kif/Lif/Mif and every existing immutable
artifact/host/effect ceiling. It must not revive or retry V3.

## Effects and stop

Correction construction has zero Docker, socket, registry, network,
PostgreSQL, SQL, product-runtime, production, publication, traffic, Provider,
message, deployment, release, spend and Gate C effects.

After committed-byte audit, stop at:

`LOCAL_POSTGRES_INSPECT_FINGERPRINT_CORRECTION_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
FINAL_LOCAL_CAMPAIGN_AUTHORITY_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
