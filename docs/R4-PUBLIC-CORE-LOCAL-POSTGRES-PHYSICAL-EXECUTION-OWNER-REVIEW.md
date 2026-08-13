# R4 #67 Local PostgreSQL One-Use Physical Execution — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Execution Card SHA-256:
  `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77`
- Execution Card commit / tree:
  `421560cb6ac2fbbf52d104a5b71ade6347d9629f` /
  `2bb4bf20f4892af3f51887e7c7d4f2302b80169d`
- Card parent, Effect-0 status `M` / tree:
  `42378b5a2a48493acf8edddcd05d19593cb05dd7` /
  `67b65083ae26163eca0f7bce1faefa90721c749c`
- Canonical execution-authority payload SHA-256:
  `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3`
- Pending grant created: **false**
- Physical execution performed: **false**
- Gate C: **NOT_REQUESTED**

This Review is the short decision surface for the exact Card above. The Card,
the committed Effect-0 Packet/Review, runner and machine evidence remain the
complete authority and enforcement contract. This Review creates no grant and
performs no Docker, OCI, PostgreSQL or SQL action.

This file intentionally omits its own SHA-256 and its containing Review
commit/tree. Both must be supplied externally after these bytes are committed
and independently audited. It also omits the future private Owner approval
receipt and all fresh dynamic grant values.

## Eight Owner choices

Exact approval accepts all eight choices together:

1. **Accept the frozen predecessor.** Bind Effect-0 `M`
   `42378b5a2a48493acf8edddcd05d19593cb05dd7` / tree
   `67b65083ae26163eca0f7bce1faefa90721c749c`, its exact 1A/9M delta,
   `G10` `sha256:d3c967d6b7f5a1df2be9e5004792dbd6d94e79fb7b9d6bfd36e9a24d06f8c8d7`
   and committed-audit summary
   `sha256:3c5f01190448d18320317041b09bc293c5302ac3bffe4fadfe772d792c5d546a`.
   Bind K/L, runner/test, machine evidence, package lock, isolated `pg`
   closure, current SQL and static catalog exactly as the Card records them.
2. **Accept the two single-document authority commits.** Require the Card to
   be the direct single-path child of `M`, and this Review to be the direct
   single-path child of the Card. Any alternate parent, merge commit, extra
   path, mode drift, changed byte, rebase, amend or replacement invalidates the
   request before grant preparation.
3. **Approve exactly one fresh pending grant.** After this Review is committed
   and precisely approved, allow only the committed prepare entry to create
   one v3 pending grant in a fresh exact private root. The grant lifetime is at
   most 24 hours; `grantId`, approval-receipt hash, fresh Docker CLI/socket
   identity hashes and creation/expiry instants are the only dynamic slots.
4. **Approve one construction lifecycle and bounded recovery.** Allow the
   pending grant to be consumed once for one physical construction lifecycle.
   Allow at most two later cleanup-only recovery lifecycles. Expiry, re-entry,
   crash or an ambiguous non-cleanup effect never authorizes a second pull,
   stack, connection, SQL sequence or construction attempt.
5. **Approve the exact local Docker/image choice.** Require the absolute
   Docker CLI and fresh same-host Unix socket. Use only the pinned PostgreSQL
   image/platform/manifest from the Card. If the complete pinned image is not
   cached, permit at most one anonymous pull attempt. A partial or unknown
   image cache state blocks Physical Green; no login, registry credential,
   remote daemon or unrelated-resource operation is allowed.
6. **Approve the exact PostgreSQL rehearsal.** Permit only one exact-owned
   loopback stack, two run-owned databases, one same-container restart, server
   version `160010`, target catalog `14 / 207 / 172 / 44`, three schema
   applies, three verifies, one rollback, 23 domain invocations / 20 distinct
   actions and one admin create-database statement. Enforce every Pool,
   connection, concurrency and Docker ceiling in the Card. No mismatch is
   repaired or retried.
7. **Require write-ahead truth and exact cleanup.** Reserve and fsync every
   effect before invocation, preserve ambiguous outcomes, publish only the
   strict body-free v3 receipt and remove every exact-owned active resource.
   The complete pinned image cache is the only permitted daemon residue.
   Unsafe host drift produces `BLOCKED` forensic evidence and requires new
   rescue authority rather than replacement-socket adoption or broad cleanup.
8. **Keep production and Gate C closed.** This approval is local disposable
   rehearsal authority only. Production database/data, Vault/HTTPS, runtime or
   API route, traffic, real Room/Projection/Curator/Guest bytes,
   Provider/model/email, deploy/publication/admission, push/PR, merge, release,
   Gate C and spend remain forbidden. A Green rehearsal stops; it does not
   activate or complete #67/R4.

## Exact ceiling selected

| Effect | Maximum |
|---|---:|
| Pending grants / consumption transitions | `1 / 1` |
| Construction / cleanup-recovery / total Docker lifecycles | `1 / 2 / 3` |
| OCI pull attempts | `1` |
| Owned container / network / volume | `1 / 1 / 1` |
| Created run-owned databases | `2` |
| Concurrent Pool / Client / transaction | `1 / 1 / 1` |
| Initial / restart readiness attempts | `60 / 60` |
| Operational / total Pools / total connections | `4 / 124 / 124` |
| Schema apply / verify / rollback | `3 / 3 / 1` |
| Domain invocation / distinct action | `23 / 20` |
| Container restart / admin create-database | `1 / 1` |
| Product or production network | `0` |
| Remote database / production data | `0 / 0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

Docker call maxima remain exactly: `version=3`, `image.inspect=2`,
`image.pull=1`, `container.inspect=8`, `container.create=1`,
`container.start=2`, `container.stop=4`, `container.rm=3`,
`network.inspect=7`, `network.create=1`, `network.rm=3`,
`volume.inspect=7`, `volume.create=1`, `volume.rm=3`.

## Preparation and execution sequence

After exact approval, and only while every committed binding remains exact:

1. create a fresh private root and exact body-only Owner approval receipt;
2. invoke the committed `prepare` entry once, capturing fresh CLI/socket
   identities and a no-longer-than-24-hour UTC window;
3. independently verify the pending-grant hash, exact two-entry root and zero
   physical effects from preparation;
4. invoke the committed physical coordinator once against that pending grant;
5. if interrupted, enter only exact-owned cleanup recovery under the consumed
   grant and its remaining recovery ceiling;
6. freeze the body-free receipt/journal and independently audit committed
   authority, observed effects and terminal cleanup before any later decision.

Any authority, Card/Review, worktree, lock, runtime-source, SQL, CLI, socket,
clock, image, resource, catalog, counter or receipt drift is a hard stop.
Before consumption, it means zero Docker calls. After consumption, it means no
new non-cleanup effects and only exact-owned cleanup where the original host
identity remains safe.

## Exact approval request

The Owner's later exact approval must externally name all of:

- Execution Card SHA-256
  `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77`;
- Card commit/tree
  `421560cb6ac2fbbf52d104a5b71ade6347d9629f` /
  `2bb4bf20f4892af3f51887e7c7d4f2302b80169d`;
- this Review's externally computed SHA-256 and its containing direct-child
  Review commit/tree;
- Effect-0 `M` HEAD/tree, `G10` and committed-audit summary hash;
- canonical authority-payload SHA-256
  `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3`;
- approval of all eight choices, including at most one anonymous pull, every
  ceiling and the no-retry/cleanup-only rules; and
- the mandatory post-Green stop below.

Any changed byte or omitted choice requires a newly frozen request.

## Mandatory stop

Before exact approval:

`ONE_USE_PHYSICAL_EXECUTION_OWNER_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

After a genuinely Green local rehearsal and independent physical-evidence
audit:

`LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN / GATE_C_NOT_REQUESTED`

Neither stop makes #67 or R4 Done.
