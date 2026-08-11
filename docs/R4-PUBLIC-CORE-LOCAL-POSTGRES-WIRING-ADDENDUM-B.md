# R4 #67 Local PostgreSQL Wiring — Addendum B

- Status: **`PROPOSED_NOT_EXECUTED`**
- Updated: 2026-08-11
- Scope: **interaction-type durability correction and offline construction only**
- Approved Construction Packet:
  `sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258`
- Approved Owner Review:
  `sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca`
- Approved review wrapper HEAD / tree:
  `c878a5a534868482672838d39290e3f12e9d3b7f` /
  `d917fb7d2c9ade9b2d8acae5f5e7d4893e0c84c5`
- Gate C activation authority: **NOT_REQUESTED**
- Docker, OCI acquisition, database and SQL execution authority:
  **NOT_REQUESTED**

This Addendum is an authority proposal, not an approval or execution grant. It
records a mandatory hard stop found while constructing the approved Packet and
proposes the narrowest durable correction. The Owner's permission to prepare
this proposal permits exactly this document and no construction effect.

No schema, source, test, runner, dependency, lock, Docker, database, network or
source-control mutation may be performed under this proposal. Future authority
is deliberately split into an offline Addendum Construction approval and a
later, separately hash-pinned Physical Rebind approval.

## 1. Hard-stop discovery

The exact application contract requires `interactionType` in the durable
interaction view returned by `interaction.read`, and in successful
`room_operator.pull` plus same-key recovery while its exact retained
ciphertext remains readable. Both paths must survive process/object-graph
reconstruction. After interaction body ciphertexts have been removed at a
terminal state, `interaction.read` must still return the exact body-free view;
pull follows the already-frozen terminal reconciliation precedence rather than
reconstructing a body-bearing success.

The approved 14-table PostgreSQL catalog has no durable column that records the
selected interaction type. None of the existing carriers can recover it
without changing an already-frozen semantic or losing restart safety:

- `consent_hash` is exactly the canonical hash of consent and may not be
  repurposed;
- request and Guest-capsule ciphertexts represent their exact raw canonical
  bodies and may be cleared while the body-free interaction view remains;
- request and capsule hashes authenticate those exact bodies and may not carry
  additional metadata;
- mutation receipts and Room events retain hashes, identifiers, versions and
  kinds, not the selected interaction type;
- a Projection's supported-interaction set does not identify which member was
  selected; and
- opaque identifiers, caller resupply or process-local maps are not durable,
  authoritative restart carriers.

Therefore there is no schema-preserving, restart-safe implementation of the
approved application response contract. The Packet's SQL/schema-edit hard stop
was correctly reached. Construction must not invent an encoding, weaken the
response, wrap a body ciphertext, infer from an opaque identifier or retain a
process-local substitute.

## 2. Effects at the hard stop

The bridge lane stopped before changing its owned Stage A paths. Other
parallel, authorized construction lanes had already made temporary changes
before the blocker was reported. Cleanup then restored every construction
path to the approved wrapper bytes.

The exact transient construction set was seven paths:

- `apps/room/package.json` and `package-lock.json` reproduced the approved
  offline dependency closure, then returned byte-for-byte to baseline;
- `apps/room/src/public-core-application.ts`,
  `apps/room/src/public-core-crypto.ts` and
  `test/r4/public-core-privacy.test.ts` contained partial compatibility work,
  then returned byte-for-byte to baseline; and
- `scripts/r4-public-core-local-postgres.mjs` and
  `test/r4/public-core-local-postgres.test.ts` were temporarily created,
  exercised only through the deny-network fake lane, then deleted.

No executor or application-store bridge file was created. The following table
separates occurred activity from residual state after cleanup:

| Effect | Occurred before stop | Residual after cleanup |
|---|---:|---:|
| Authorized Stage A paths temporarily changed | `7` | `0` |
| Dependency manifest / lock paths temporarily changed | `1 / 1` | `0 / 0` |
| SQL artifacts changed | `0` | `0` |
| Docker CLI calls / OCI pulls | `0 / 0` | `0 / 0` |
| Containers / networks / volumes | `0 / 0 / 0` | `0 / 0 / 0` |
| Database identities / connections / SQL statements | `0 / 0 / 0` | `0 / 0 / 0` |
| Registry or product/data-plane network | `0` | `0` |
| Runtime, route, Vault, Provider or traffic activation | `0` | `0` |
| Real Room, Projection, Curator or Guest bytes | `0` | `0` |
| Construction-phase commit, push, PR or merge | `0 / 0 / 0 / 0` | `0 / 0 / 0 / 0` |

The only repository mutation permitted by proposal-preparation authority is
this Addendum file. At its freeze point, the tracked working tree differs from
the approved wrapper only by this proposal; the pre-existing Owner-owned
`native/macos/.build/` remains untouched and untracked. No physical resource
was created and no old or new SQL was executed.

## 3. Proposed minimal durable correction

After future exact Owner approval of this Addendum's SHA-256, Addendum
Construction may make only this schema-semantic change to
`forme_r4_public_core.interactions`:

```sql
interaction_type text NOT NULL

CONSTRAINT ck_interactions__type CHECK (
  interaction_type IN ('ask', 'seed', 'resonance')
)
```

The column has no default. Creation must bind the validated selected type, and
every named read, pull and same-key recovery result that returns an interaction
view must select and validate it through a closed three-value membrane. Null,
unknown, accessor-hostile or mutable driver values must fail closed. Fresh
process/object-graph and terminal-body-removal tests must prove that the value
is recovered from PostgreSQL rather than caller input or process memory.

`interaction.read` must select complete body-free metadata for active and
terminal/expired rows. Initial pull and both pull recovery kinds must carry the
complete receipt-bound interaction view while ciphertext remains readable.
Consent may be reconstructed only by constant-time comparison with the two
exact canonical consent-hash preimages; an unknown hash fails closed. A later
local-purge-only version increment must not rewrite a prior receipt's view, and
same-key replay must preserve whether `localPurgeReceivedAt` was null or set at
the original commit.

No consent column is added. The existing `consent_hash` meaning and validation
remain exact. No table, index or unrelated constraint is added or changed.

The corrected exact catalog contract is:

| Catalog object | Exact count |
|---|---:|
| Tables | `14` |
| Columns | `207` |
| Constraints | `172` |
| Indexes | `44` |

The one-Room model, exact 20 allowed actions and 25 unavailable operations
remain unchanged.

## 4. Exact workset amendment

The approved Packet's Stage A workset expands from 14 to exactly 17 paths by
adding only:

1. `schemas/r4/public-core/schema.sql`
2. `schemas/r4/public-core/verify.sql`
3. `schemas/r4/public-core/rollback.sql`

All three SQL artifacts must be newly frozen together. The schema artifact may
add only the column and dedicated check above; verify and rollback may change
only as required to bind, verify and safely reverse that exact corrected local
schema contract.

Within the Packet's original 14 Stage A paths, this correction may be
propagated only through the already-listed PostgreSQL store, application-store
bridge, local runner and their already-listed focused tests. It may add the
named input/result fields, exact SQL binds/selects, closed row validation and
restart/reopen coverage required by Section 3. It does not add any new
application, runtime, route, driver, crypto, package, lock or test path.

The Packet's nine Stage B evidence/status paths remain unchanged and may only
record the eventual exact Addendum approval, corrected artifact hashes,
catalog proof, audits and honest stop state. No unlisted path may change.

## 5. Superseded SQL bindings and invalid grant

For corrected construction, these previously bound SQL hashes are obsolete and
must not be executed or placed in a new physical grant:

| Artifact | Obsolete SHA-256 |
|---|---|
| `schema.sql` | `869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2` |
| `verify.sql` | `9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4` |
| `rollback.sql` | `526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e` |

The approved Packet remains historical authority evidence, but its narrower
permission to execute those exact local SQL bytes is no longer usable. Any
pending, unconsumed or recreated physical grant that binds an obsolete SQL
hash, the 14-path Stage A aggregate, or the 206-column / 171-constraint catalog
is invalid and must fail before Docker. It may not be amended in place,
consumed, reissued or treated as cleanup authority. No physical grant is
created by this Addendum.

## 6. Authority split and mandatory stops

### Phase 1 — Addendum Construction

This phase may begin only after the Owner approves this Addendum's exact
SHA-256 and explicitly accepts the one-column correction, 17-path Stage A
workset, corrected catalog counts, obsolete bindings and this two-phase stop.

That future approval permits repository-local, offline construction only:

- edit the exact 17-path Stage A workset within the narrower semantics above;
- run injected/fake, deny-network, focused and existing regression tests that
  do not invoke Docker or connect to a database;
- freeze the new `schema.sql`, `verify.sql` and `rollback.sql` SHA-256 values;
- freeze the resulting Stage A HEAD/tree, exact 17-path artifact aggregate,
  runner/import closure and unchanged dependency-lock binding; and
- obtain independent review with exactly zero Blocker and zero Important
  findings.

The existing Codex development/control channel used by the Owner to direct and
review this work is explicitly disclosed and is not a product/runtime effect
or a repository command's network authority. Phase 1 grants no additional
external connector, package, source-control or product data-plane call.

Even after that exact approval, Phase 1 permits:

| Effect | Maximum |
|---|---:|
| Repository command / package / source-control external network | `0` |
| Docker CLI calls / Docker daemon access | `0 / 0` |
| OCI inspect or pull | `0` |
| PostgreSQL connection / database identity | `0 / 0` |
| SQL apply / verify / rollback | `0 / 0 / 0` |
| Product/data-plane network | `0` |
| Production migration or database mutation | `0` |
| Runtime, route, Vault, HTTPS or traffic activation | `0` |
| Real Room, Projection, Curator or Guest data | `0` |
| Product/runtime Provider/model/email messages | `0` |
| Merge / release / spend | `0 / 0 / US$0` |

Phase 1 must stop after the new SQL hashes and frozen Stage A bindings exist
and the independent review reports `0 Blocker / 0 Important`. A failing test,
catalog/count drift, need for another column/table/index/constraint, change to
the 20/25 action surface, unlisted path or any required physical effect is an
earlier hard stop.

### Phase 2 — Physical Rebind

Docker, OCI acquisition, PostgreSQL connection and any SQL execution remain
forbidden until a separate Physical Rebind request is prepared, independently
reviewed and exactly approved by the Owner after the Phase 1 stop.

That request must bind at least:

- this Addendum and its exact Owner approval;
- the new three SQL SHA-256 values;
- the corrected 14 / 207 / 172 / 44 catalog contract;
- the clean Stage A HEAD/tree and exact 17-path artifact aggregate;
- the reviewed runner/import closure and unchanged pinned lock;
- the independent `0 Blocker / 0 Important` result; and
- a fresh, one-use physical grant schema that rejects every obsolete binding.

Only that later approval may decide whether to restore the Packet's one exact
pinned anonymous OCI pull and disposable loopback PostgreSQL rehearsal. It may
not be inferred from the prior Packet approval or this Addendum Construction
approval.

## 7. Unchanged closed boundaries and final state

This Addendum does not authorize Gate C, production migration, a production
driver or pool, runtime/API route activation, Vault or secret installation,
HTTPS transport, public traffic, deployment, publication/admission, real Guest
data, Provider/email use, merge, release or spend. It does not make #67 or R4
Done.

The exact action and topology boundaries remain one Room, 20 allowed actions,
25 unavailable operations and 14 tables. The Packet's body-free error,
ciphertext, replay, Room-binding, retention, hostile-membrane and cleanup
requirements remain in force except where this Addendum narrowly supersedes
SQL immutability, the three obsolete SQL hashes, the Stage A path count and the
catalog column/constraint counts.

The best possible Phase 1 end state is:

`INTERACTION_TYPE_SCHEMA_CORRECTION_TECHNICAL_REVIEW_GREEN /
PHYSICAL_REBIND_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Any changed Addendum byte, broader schema semantic, workset, catalog count,
effect ceiling, authority split or stop requires a new exact Owner review and
approval.
