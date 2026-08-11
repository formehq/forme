# R4 #67 Durable Public Core Construction — Owner Review v0.1

- Status: **AWAITING EXACT OWNER APPROVAL**
- Prepared: 2026-08-10
- Product issue: [#67 — Public Room and one real bounded knock](https://github.com/formehq/forme/issues/67)
- Construction Packet:
  [`R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md`](./R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md)
- Packet SHA-256:
  `sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31`
- Packet proposal baseline HEAD:
  `4841c32f07d3e6810cb023387cefa0562b85b777`
- Packet proposal baseline tree:
  `abc24d75345637886f3252caf3d8eeec7c6ec6be`
- Durable Public Core Construction Grant: **REQUESTED**
- Gate C / migration / deployment / publication / Provider grants:
  **NOT REQUESTED**

This review does not contain its own SHA-256 or the final wrapper commit/tree
that contains it. Those exact values are computed only after these bytes are
frozen and are supplied together in the approval request. The baseline above
is the immutable parent commit/tree that contains the Packet itself.

## What this would achieve

Forme would gain the smallest durable server-side Core needed by the current
R4 story:

```text
one public Room
  → one approved Projection
  → independent Curator admission
  → one 24-hour / one-use visitor knock
  → one encrypted private Interaction
  → one durable local pull / ACK trail
```

The result is an **offline-constructed and testable application/store**, not a
live service. It still cannot receive traffic, create a real Room, publish the
Projection, contact a visitor or call a model.

## Why this is the next step

The current stack already proves the content review, Room-bound handoff,
visitor-facing UI and a complete offline rehearsal. What it deliberately does
not yet have is durable production-shaped state underneath those semantics.

This construction fills that single gap without reopening the Product Vision
or turning R4 into a general platform build.

## The four choices

Approval means approving all four as one envelope:

1. **One Room, 20 actions, 14 tables.** Build only the existing public-knock
   operation surface and the minimum relational state it requires. No generic
   Room platform, Private Room, Response, email or Agent Guest surface.
2. **Encrypted bodies, injected keys.** Use a production-specific AEAD and
   keyed-digest contract, but inject fake executors and key ports in tests.
   Real keys, vaults and secret installation remain Gate C work.
3. **Retention fails closed.** If purge health is more than 36 hours stale,
   stop new mutations that can create or expose body data. Keep only the exact
   destructive/recovery operations needed to close existing state. Deleted,
   revoked, expired or superseded bodies never reappear through replay.
4. **No hidden activation.** Add no PostgreSQL driver, generic store, runtime
   route or production wiring. All tests remain synthetic/ephemeral and
   physically denied network access. The only outbound exception is one exact
   proposal branch push and one Draft PR create/update under the already
   approved GitHub management envelope; merge remains forbidden.

Recommendation: **approve the bundle**. These choices preserve the thin
walking slice while giving Gate C something concrete and auditable to activate.

## What remains impossible under this approval

| Effect | Authorized count |
|---|---:|
| Migration execution or database mutation | 0 |
| Product/runtime/database/Provider network or HTTPS calls | 0 |
| Source-control proposal push / Draft PR create or update | 1 exact branch / 1 Draft PR |
| Real Room creation, pairing or binding | 0 |
| Projection publication or Curator admission | 0 |
| Real Guest data or visitor contact | 0 |
| Provider, model or email calls | 0 |
| Secret or vault installation | 0 |
| Deployment, traffic or spend | 0 |
| PR merge | 0 |

The current production runtime stays fail-closed. The existing `trafficReady`
and `gateCReady` facts remain `false` even if Construction is technically
Green.

## Stop point

After implementation and independent review, Codex must stop at:

- exact implementation commit/tree and workset;
- proposed SQL/schema and evidence hashes;
- all offline tests and fault/race results;
- an explicit readiness table that still says no traffic and no Gate C; and
- a hash-pinned **proposed Gate C Activation Card**.

Technical Review Green will not close #67. A later Gate C approval and the
Owner's real Room/visitor experience are separate decisions.

## Decision surface

Approve only by sending the exact approval statement supplied alongside this
frozen Review hash and final wrapper commit/tree. Any changed Packet, Review,
Packet proposal baseline, final wrapper or narrower or broader authority
requires a newly frozen approval request.
