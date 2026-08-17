# R4 #67 Integration Campaign Platform-Select Correction — Construction Report

- Status: **`TECHNICAL_REVIEW_GREEN`**
- Date: 2026-08-16
- User outcome: reach one Green disposable local PostgreSQL rehearsal
- Current gate: R4 #67 Local PostgreSQL wiring
- Physical execution observed by this construction: **NO**
- Production / Gate C: **NOT_REQUESTED / NOT_REQUESTED**

## Outcome

The correction is constructed and committed without weakening image identity.
Every exact-image inspect used by the main physical plan, the body-free
manifest diagnostic and the acquisition diagnostic now selects
`--platform linux/arm64` before applying the existing exact repo-digest,
selected-manifest-digest and descriptor-platform checks.

This closes the explained `PLATFORM_MISMATCH`: the failed V2 acquisition saw
the top-level OCI index because no platform was selected. A bounded read-only
local probe showed that exact platform selection returns the already-frozen
manifest `sha256:a64c3894…8faf` with `linux/arm64/v8`. No digest, image
reference, call count or retry rule changed.

## Authority and topology

- Addendum: `5878e51dbf12999a31f99e72d734bd49a63e9f20` / tree
  `ea74620b70369698230ceae9d172c6b7e88e254a` / SHA
  `sha256:c338c17b796d911c8cd7f9733193dda4f37515bd0f2e30733b1b6d0f589d560d`.
- Review: `e548933a598c9e62c99dc0caaf4c52b7bf13ff32` / tree
  `75c73c16c81ee3dafd082dfac3bf4758068f474f` / SHA
  `sha256:f2eec2aef67784f08567abc6bf2354e906a61c92527cc9813b6315a6030466a8`.
- Kps: `8af66535eb37925d9286c8b6d4f14501d372e4c5` / tree
  `274c364c493bfd808555a60eabeac60ed4464d00` / two modified paths / G2
  `sha256:f48f2a8d82527423f32a7eabd1f727c31b277f57c7b9cac1d4e24e0f0650bb4c`.
- Lps: `10fbc3c799adf9e7071b85c9889ae3830909f478` / tree
  `4c6dfe871ffb20813e8516b64fcf82a3aff991ba` / three added paths / G3
  `sha256:a50a34b881e8323dabb92eb00b64ef61773bd7313cab725645768f6234ac5238`.
- Committed Lps audit summary SHA:
  `sha256:f49de2922dccaa4327cc6dcb2f292f82e2cbeedc0274670b2ea64ead52ec2368`.

Mps is this report plus nine current-status modifications. It remains a single
direct child of Lps and completes the exact 15-path / three-commit workset.
This report intentionally omits its own SHA and Mps HEAD/tree; those are
computed from committed bytes and bound by the later V3 Card.

## Machine artifacts

| Artifact | SHA-256 |
|---|---|
| artifact index | `sha256:3944b11ddf9c0d35f13f3528c3b48ea29d9419cd59da9baef4abc33e5fb10270` |
| strict evidence schema | `sha256:49725136be39360c4d90a15b976f5d7076538f0227b55ca664ad8624e8546410` |
| machine evidence | `sha256:8f1c5aedc4144c00bb04cf049c164772f5e048ead46365740f371eb98196c43b` |
| runner | `sha256:b1b86023efdbd70f0344af41d16393bd9d5fbc3a00ff82fb31f123ef567fcd33` |
| focused test | `sha256:c974734eee248f95e9b9418d6298d632667fdf554b904c38330374b19464e658` |

The strict evidence validates under Ajv 2020 strict mode and rejects eight
independent authority, lineage, correction, effect, readiness and extra-key
mutations.

## Validation

- platform-select focused: 4/4;
- Integration Campaign focused: 14/14;
- local PostgreSQL runner: 188/188;
- full R4 offline: 760/760;
- Gate-B Core: 146/146;
- repository spine: 45/45;
- runner syntax, TypeScript, hosted no-AI, docs audit, source inventory and
  diff checks: Green;
- source inventory: 303 files /
  `sha256:5d8c73ce311b8127ca342ad577ef8081526c78b1fdeee2b2fe2002a15a363cc8`.

All test lanes are fake/local and deny-network. They demonstrate contract and
cleanup behavior; they do not claim a real PostgreSQL observation.

## Effects and remaining distance

Construction performed repository writes only. Docker CLI/socket/daemon,
registry, image pull, cleanup, PostgreSQL, SQL, product runtime, production and
Gate C effects were all zero. Both failed V2 roots remain immutable.

The next bounded step is to freeze a V3 Execution Card and direct-child Review,
prepare a fresh root, and consume exactly one campaign lifecycle. Only a real
Green lifecycle can establish target PostgreSQL `160010`, catalog
`14/207/172/44`, the 20-action application flow, restart replay, rollback
rehearsal and final owned residue zero.

## Stop

`LOCAL_POSTGRES_PLATFORM_SELECT_CORRECTION_CONSTRUCTION_TECHNICAL_REVIEW_GREEN /
LOCAL_V3_CAMPAIGN_AUTHORITY_FREEZE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`
