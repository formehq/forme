# R4 #67 Integration Campaign Platform-Select Correction — Owner Review

- Status: **`OWNER_OUTCOME_ENVELOPE_ACCEPTED`**
- Date: 2026-08-16
- User-visible outcome: one Green disposable local PostgreSQL rehearsal
- Construction effect: repository only
- Local lifecycle authority: inherited only from the confirmed local MVP advancement envelope
- Production / real data / public traffic / Gate C: **NOT_AUTHORIZED**

## Decision

The Owner's “好，那我们继续” accepted the recommended local MVP advancement
envelope: the agent may autonomously investigate, implement, test, freeze and
commit the repository correction, then use the remaining bounded local
synthetic lifecycle budget to pursue one disposable PostgreSQL rehearsal
Green. This Review applies that already-confirmed outcome envelope to the exact
Platform-Select Correction Addendum below; it does not create production,
real-data, publication or Gate-C authority.

The failure is now explained without weakening identity checks. Plain
`docker image inspect` selected the top-level OCI image index. Exact
`--platform linux/arm64` selection returned the already-pinned platform
manifest digest and exact `linux/arm64/v8` descriptor. The correction is
therefore an argv selection fix, not a new image, a relaxed digest, an extra
call or a retry.

## Exact Addendum binding

| Binding | Exact value |
|---|---|
| Addendum SHA-256 | `sha256:c338c17b796d911c8cd7f9733193dda4f37515bd0f2e30733b1b6d0f589d560d` |
| Addendum HEAD / tree | `5878e51dbf12999a31f99e72d734bd49a63e9f20` / `ea74620b70369698230ceae9d172c6b7e88e254a` |
| Addendum parent HEAD | `4118a5ec7ae5f1d8a04caeb4cfbcca5715177270` |
| Addendum delta | exactly one added mode-`100644` document |
| selected platform | `linux/arm64` |
| selected manifest digest | `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf` |

The complete proposal is the
[Platform-Select Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-PLATFORM-SELECT-CORRECTION-ADDENDUM.md).

## Accepted choices

All nine Addendum choices are accepted as one bounded outcome:

1. add exact `--platform linux/arm64` selection to every relevant exact-image
   inspect path;
2. retain the exact selected-manifest digest and platform checks;
3. preserve Docker call counts and prohibit retry;
4. keep missing, malformed and mismatched descriptors fail-closed;
5. retain both consumed V2 roots as immutable forensic history;
6. construct exact `Kps -> Lps -> Mps` as 15 paths and three commits;
7. construct only the named versioned Campaign Card/Review V3 afterward;
8. run synthetic, offline, strict-evidence, topology and documentation
   validation before any local lifecycle; and
9. use at most one fresh V3 campaign lifecycle under the confirmed envelope,
   with exact-owned disposable resources, synthetic data and loopback only.

## Exact construction envelope

`Kps` modifies only runner and focused test. `Lps` adds only artifact index,
strict evidence schema and machine evidence. `Mps` adds one report and modifies
the nine current-status surfaces. Total construction is exactly **15 paths / 3
single-parent commits**. Card V3 and direct-child Review V3 are separate
single-file commits after the committed Mps audit.

Repository construction has zero Docker, registry, PostgreSQL, SQL and network
effects. The later V3 campaign may use the already-cached exact image, one
construction lifecycle, exact write-ahead accounting and exact cleanup. It
may not pull again, reuse either failed root, touch foreign resources, use real
data, activate production or enter Gate C.

## Stop conditions

Stop immediately on ambiguous ownership, cleanup uncertainty, authority/hash
drift, unexpected image identity, a second pull requirement, a second
construction attempt, real-data exposure or any production/Gate-C request.

On successful local rehearsal, stop at:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`

This Review intentionally omits its own SHA and future commit HEAD/tree. Those
are computed from its committed bytes and bound by the later V3 authority.
