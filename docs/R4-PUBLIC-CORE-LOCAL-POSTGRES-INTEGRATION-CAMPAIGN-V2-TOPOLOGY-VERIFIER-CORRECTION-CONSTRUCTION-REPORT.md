# R4 Public Core Local PostgreSQL Integration Campaign V2 Topology Verifier Correction Construction Report

- Status: `STATUS_FREEZE_CANDIDATE`
- Date: 2026-08-15
- Active issue: #67 — Public Room and one real bounded knock
- Scope: repository-only verifier correction, machine evidence, status freeze, and later add-only V2 Card/Review construction
- Physical execution: `NOT_REQUESTED`
- Production: `NOT_REQUESTED`
- Gate C: `NOT_REQUESTED`

## Outcome

The committed local PostgreSQL campaign runner now verifies the actual complete
successor history before it can accept a V2 authority. The old verifier skipped
the committed inspect implementation, concurrency Addendum/Review, Gate-B
implementation, evidence freeze and status freeze. That simplified topology
could never accept an honestly constructed V2 Card/Review.

Kvt corrects that fail-closed mismatch. It verifies:

```text
V1 Review
  -> Inspect-Missing Addendum
  -> Inspect-Missing Review
  -> Kic
  -> Gate-B Concurrency Addendum
  -> Gate-B Concurrency Review
  -> Kgc
  -> Lic
  -> Mic
  -> Kvt
  -> Lvt
  -> Mvt
  -> Card V2
  -> Review V2
```

Every historical node before Kvt is pinned by full commit/tree/blob or
aggregate identity and exact parent/delta. Future V2 authority is valid only as
the two add-only direct children after the exact Kvt/Lvt/Mvt chain. No grant,
Docker call, cleanup operation or PostgreSQL connection was created by this
construction.

## Exact construction lineage

| Layer | HEAD | Tree | Parent | Delta / aggregate |
|---|---|---|---|---|
| Mic predecessor status | `eb209d314a1084069a15fd4c819cf5e4d5760b77` | `09e95f7d13873303dff81fcf5ec29433c8e589dd` | `614202e8765372755f75ce7fa465ef9e550971a8` | 10 paths; `sha256:c088d756b29f330dc31f626ab9fa4a33984f7c4afa92213c5f2c122349624cb5` |
| Kvt implementation | `85096f689ed89fef97c7781c2d84d813097cadae` | `1af3bea05f683863c5e93ecd4351bfcd2dbbf499` | Mic | 2M; `sha256:85c3882e4bdd18cb05432712e643cd68485a0a6693a95671d72cad0a36c398bf` |
| Lvt evidence | `27540be8753424b841a79b785bfa658911cbfbb1` | `a978e0ba70d69844242cf7b0ca627c861091e89a` | Kvt | 3A; `sha256:e9b439cb6fbafa339991ea6cb56a59efb3eba1273633b399da57dc4986ba417f` |

Kvt changed exactly:

- `scripts/r4-public-core-local-postgres.mjs` — 741883 bytes,
  `sha256:7f02a4b506705565245ba5b5424dbd0f730b246a3682903aade6f88b7455df91`;
- `test/r4/public-core-local-postgres.test.ts` — 200151 bytes,
  `sha256:564def945514618ac82c9cba82d4adcc206417676f1c54caa83a0fba72143246`.

## Machine evidence

| Artifact | SHA-256 |
|---|---|
| artifact index | `sha256:9a2cce7c176694be205abedd6d3ef5775e345ed7f8871e4b0631c08ad7d99929` |
| strict evidence schema | `sha256:31e54f83927a514fe8392c689e9cf1f4105d2b4021ed91a7c0959944992dee7f` |
| machine evidence | `sha256:4d469990dd17fefe0478e280c6d4c998a8a5e6058ac3089c4fa496cd7aff5e80` |

The strict Ajv 2020-12 candidate-Lvt audit passed with 0 Blocker / 0
Important and rejected eight authority, lineage, validation, effect,
readiness, documentation and stop mutations. The committed Kvt audit summary
is `sha256:a3415dca563387720991bb0c29f4a38c692b2032e3877149008d499f5b91145c`
(549 bytes). The committed Lvt audit summary is
`sha256:cc80574dfbe4dabecfbba6814ed47d8a7531e3891b95d18f2587666101d05813`
(574 bytes). Both summaries are UTF-8 with no trailing LF and remain outside
the repository to avoid self-reference.

## Validation

| Lane | Result |
|---|---:|
| committed topology focused | 1 / 1 Green |
| local PostgreSQL runner under deny-network | 176 / 176 Green |
| complete R4 offline regression | 748 / 748 Green |
| Gate-B default concurrent run 1 | 146 / 146 Green |
| Gate-B default concurrent run 2 | 146 / 146 Green |
| Gate-B serial run | 146 / 146 Green |
| repository spine | 45 / 45 Green |
| Node syntax, TypeScript, no-AI boundary, inventory, docs regression, diff check | Green |

All ordinary and fake tests remained inside the injected, deny-network
boundary. No test resolved the Docker socket or contacted a Docker daemon or
PostgreSQL server.

## Effect audit

The correction changed no dependency, lockfile, SQL, product schema or
production code. During construction and validation:

- external network calls: 0;
- forensic-root reads/writes: 0 / 0;
- Docker CLI/daemon/socket calls: 0 / 0 / 0;
- OCI pulls and cleanup calls: 0 / 0;
- PostgreSQL connections and SQL statements: 0 / 0;
- product runtime, production, public traffic, provider, message, deployment,
  release and spend effects: 0.

## Honest boundary

This construction proves that a future V2 Card/Review can be verified against
the actual repository history. It does not prove Docker resource absence, a
running PostgreSQL server, catalog `14 / 207 / 172 / 44`, the synthetic domain
flow, cleanup, production readiness or Gate C readiness.

Mvt updates only the nine scoped operational status surfaces plus this report.
Its committed-byte acceptance audit is external and is not written back into
Mvt. The later V2 Card and Review are each separate add-only direct-child
commits and authorize nothing until the Owner separately approves their exact
bytes.

After committed Mvt acceptance, the repository stop is:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V2_TOPOLOGY_VERIFIER_CORRECTION_TECHNICAL_REVIEW_GREEN / V2_CARD_REVIEW_CONSTRUCTION_APPROVED / PHYSICAL_EXECUTION_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
