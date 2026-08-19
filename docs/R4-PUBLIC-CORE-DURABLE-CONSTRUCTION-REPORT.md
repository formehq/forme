# R4 #67 Durable Public Core Construction Report

- Status: **`TECHNICAL_REVIEW_GREEN_GATE_C_NOT_REQUESTED`**
- Updated: 2026-08-11
- Active issue: #67 — Public Room and one real bounded knock
- Construction Packet SHA-256:
  `sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31`
- Owner Review SHA-256:
  `sha256:8272df04a9374ca04be3f212cd0bc8b123d138953224c24a66d13d08912887ff`
- Approved wrapper HEAD / tree:
  `d81e6fd3e1de9737d6c6dcf93fe642907654eec8` /
  `4910018a05b5b9d91bc3b3b2463698300e156a2a`
- Stage-A implementation HEAD / tree:
  `bcd4259130627067e1e7cf1974513801545cda35` /
  `7e6c3236c06d63f06e93e8a4d1b69fe0a20bca31`
- Construction Grant and Addendum A: **APPROVED**
- Gate C, migration, deployment, runtime/route activation, publication, real
  Guest, Provider and email grants: **NOT_REQUESTED**

This report records Technical Review Green for repository-only Construction.
It is not production readiness, #67 Done, R4 Done, publication authority or
Owner Experience Acceptance.

## Constructed outcome

The exact Stage-A commit constructs an injected, action-specific application
and durable persistence adapter for:

```text
one public Room
  → one current Owner-approved Projection
  → separate Curator admission
  → one 24-hour / one-use public encounter
  → one encrypted private Interaction
  → Room event / sync / pull / ACK
  → body-free receipt and bounded retention
```

The closed surface is 4 reads and 16 mutations across exactly 20 allowed
actions, with 25 operations explicitly unavailable. The proposed PostgreSQL
schema contains 14 tables, 206 columns, 171 constraints and 44 indexes under
`forme_r4_public_core`. Generic save, caller-supplied SQL, a generic action
executor and arbitrary result JSON are absent.

Addendum A adds only `test/r4/public-core-config.test.ts` to the original
workset. It pins the two constructed facts below and covers the action-aware
`public_single` / `closed` guard. The artifact index therefore contains 16
files, including six focused test files.

## Readiness truth

| Fact | Value |
|---|---:|
| Production application adapter constructed | `true` |
| Durable persistence adapter constructed | `true` |
| Credential vault adapter constructed | `false` |
| HTTPS transport adapter constructed | `false` |
| Traffic ready | `false` |
| Gate C ready | `false` |
| Migration applied | `false` |
| Real database exercised | `false` |
| Runtime or API route activated | `false` |

The first two values describe reviewed repository bytes only. The production
runtime and route remain fail-closed, no PostgreSQL driver was added, and the
SQL was not parsed, applied or deparsed by a target PostgreSQL server.

## Validation ledger

Each number below is recorded by lane. Focused tests overlap the complete R4
regression, so this report intentionally gives no misleading grand total.

| Lane | Physical posture | Exact result |
|---|---|---|
| Six focused Public Core tests | deny-external-network loader | 218 / 218 |
| Six fault boundaries × 16 mutations | deny-external-network loader | 96 / 96 |
| Mandatory race/fault catalog | deny-external-network loader | 13 / 13 families |
| TypeScript | no product/runtime path | PASS |
| Complete R4 offline regression | deny-external-network loader | 550 / 550 |
| Gate-B Core regression | deny-external-network loader | 145 / 145 |
| Spine regression | deny-external-network loader | 45 / 45 |
| Hosted Room no-server-AI check | static | PASS |
| Documentation and diff checks | static | PASS |
| Strict Ajv 2020 machine-evidence validation | static | PASS |
| Stage-A Git-blob/index/workset audit | static | PASS |

The SQL construction audit pins the DDL source contract at
`sha256:2eebb5f582d67b35d11f49b69edeff5fcecf39ee24cfa15b4575b794b5f14559`.
Actual target-PostgreSQL parse/catalog/deparse/runtime verification remains a
Gate C input because this Construction had no database-execution authority.

## Independent review

The embedded independent audit is deliberately scoped only to the Stage-A
implementation commit plus the finalized artifact index. It does not claim to
audit the later evidence/report/Card wrapper that contains its hash.

- Scope: `STAGE_A_IMPLEMENTATION_COMMIT_AND_FINALIZED_ARTIFACT_INDEX_ONLY`
- Blocker / Important: **0 / 0**
- Exact UTF-8 no-trailing-LF summary SHA-256:
  `sha256:64ad203d66be7f815280741be8a094505a5df6b3f1a98d38e2f199646cb35cc0`

The final Stage-B wrapper must receive a separate committed-byte review. That
later audit is bound externally in Draft PR metadata and is not written back
into these bytes.

## Artifact bindings

| Artifact | SHA-256 |
|---|---|
| Construction artifact index | `sha256:b655e87a4ee809e99d86887e95a94642d1430b0f1d2bc6f6c16751808bea4ef1` |
| Non-self-referential Stage-A aggregate | `sha256:c825306a5e20e910e6fdd811d1d3599b59e317baaa18b46c98ba13b8c0c3e44f` |
| Machine evidence | `sha256:864e94151e5bc3864f154d089da7590501dbee7eedb62e61f980118d2e0a4dc5` |
| Proposed `schema.sql` | `sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2` |
| Proposed `verify.sql` | `sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4` |
| Proposed `rollback.sql` | `sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e` |
| Evidence schema | `sha256:2060c6330d4293cc2ecfbca1e1d0a6c4d6b8d6e0921696589ca2874aa52988f0` |
| `package-lock.json` | `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |

## Effect audit

| Effect | Observed construction effect |
|---|---:|
| Database processes / mutations | 0 / 0 |
| Product/runtime/data-plane network calls | 0 |
| Room mutations / publication calls | 0 / 0 |
| Real Guest bytes | 0 |
| Product/runtime Provider calls / external messages | 0 / 0 |
| Secret installs / deployments | 0 / 0 |
| Spend / merges | US$0 / 0 |
| Authorized proposal source-control surface | one branch / Draft PR #76 |

## Stop point

Construction stops here at Technical Review. The proposed
[`R4 Public Core Gate C Activation Card`](./R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
remains non-approvable: it lacks a production-wiring successor, exact
infrastructure inputs, a publication-stable Projection, real actors/window and
a separately approved bounded activation plan. No migration, deployment,
publication, Room/Guest action, traffic or activation may begin from this
report.
