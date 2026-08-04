# R4 Gate A verification and evidence register

- Status: **working evidence register; Gate A is not yet claimed complete**
- Authority: R4 Technical Control Packet v0.2
- Approved Packet SHA-256:
  `e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Implementation branch: `codex/r4-gate-a-build`
- Gate A implementation commit: `@@GATE_A_COMMIT@@`
- Gate A implementation tree: `@@GATE_A_TREE@@`
- Evidence generated at: `@@EVIDENCE_GENERATED_AT_UTC@@`
- Verification bundle SHA-256: `@@GATE_A_VERIFICATION_SHA256@@`
- Full technical contract:
  [`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md)
- Next proposed gate:
  [`R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`](./R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md)

> `@@UPPER_SNAKE_CASE@@` values are deliberate machine-replaceable
> placeholders. A placeholder is missing evidence, never implied success.
> This file is not approval-ready while any completion-critical placeholder
> remains.

## What this register may and may not prove

Gate A may prove repository behavior with synthetic data, fake
provider/connector/email adapters, local or ephemeral resources, and
content-safe read-only probes. It may prepare exact later-gate artifacts.

Gate A does **not** authorize or prove:

- a real OpenAI/Codex provider call or spend;
- handling a real third-party Guest request or capsule;
- external email or another external message;
- a hosted or production mutation;
- execution of a schema migration;
- deployment, public traffic, a production secret, or production resource;
- the signed/hardened macOS launcher and official Codex adapter as one proven
  physical boundary;
- a real Guest/hosted end-to-end encounter or Owner product acceptance.

The strict evidence labels used below are:

| Label | Meaning |
|---|---|
| `A-OFFLINE` | Must be implemented and proved in Gate A with synthetic/local evidence. |
| `A-PROBE` | May use a content-safe local read-only probe; evidence must stay body/path-free. |
| `B-REPEAT` | Gate A proves a fake/offline analogue; Gate B must repeat against the exact schema/runtime. |
| `B-PHYSICAL` | Cannot be claimed from Gate A; requires the exact Gate B runtime/physical proof. |
| `C-PRODUCTION` | Cannot be claimed before the exact Gate C production grant and evidence. |

Every row begins as `NOT_PROVEN`. A test name, command, log, or hash may replace
its placeholder only after the named evidence has actually run against the
Gate A commit above.

## Zero external effects attestation

The completed Gate A evidence bundle must bind all of these checks to the
implementation commit and record how each was verified.

| Prohibited effect | Required Gate A result | Evidence |
|---|---|---|
| Real model/provider request | zero | `@@ZERO_PROVIDER_CALL_EVIDENCE@@` |
| Incremental provider spend | zero | `@@ZERO_SPEND_EVIDENCE@@` |
| Real third-party Guest body/capsule | zero bytes | `@@ZERO_REAL_GUEST_DATA_EVIDENCE@@` |
| External email/message | zero | `@@ZERO_EXTERNAL_MESSAGE_EVIDENCE@@` |
| Hosted/production mutation | zero | `@@ZERO_HOSTED_MUTATION_EVIDENCE@@` |
| Schema migration execution | zero | `@@ZERO_SCHEMA_MIGRATION_EVIDENCE@@` |
| Deployment/public traffic | zero | `@@ZERO_DEPLOY_PUBLIC_TRAFFIC_EVIDENCE@@` |
| Production secret issuance/use | zero | `@@ZERO_PRODUCTION_SECRET_EVIDENCE@@` |
| Real source content in logs/reports | zero bytes | `@@ZERO_REAL_SOURCE_DISCLOSURE_EVIDENCE@@` |

Overall attestation status: `@@ZERO_EXTERNAL_EFFECTS_STATUS@@`.

## Requirement-to-evidence crosswalk — 47 Packet checks

### S — Existing R1–R3 spine regression (7)

| ID | Packet requirement | Gate | Required evidence | Result |
|---|---|---|---|---|
| S01 | Existing R1–R3 suite remains 45/45. | A-OFFLINE | Exact command and complete result: `@@TEST_S01@@` | `NOT_PROVEN` |
| S02 | R4 weakens none of correction propagation, exact approval, restart, retry, receipt, or rollback guarantees. | A-OFFLINE | Named regression tests and before/after comparison: `@@TEST_S02@@` | `NOT_PROVEN` |
| S03 | One freshly observed real Forme Twin supplies an exact R1 Owner Frame fact, eligible active R2 corrected meaning, and truthful R3 effect/receipt fact to local Projection basis. | A-PROBE | Content-safe local probe with only IDs/hashes/classes in the report: `@@TEST_S03@@` | `NOT_PROVEN` |
| S04 | Superseded/invalidated meaning, proposed or merely approved effects, rolled-back effects presented as current, and invalidated/indeterminate effects are rejected; exact labeled rollback history alone is allowed. | A-OFFLINE | Eligibility-table positive/negative vectors: `@@TEST_S04@@` | `NOT_PROVEN` |
| S05 | A changed Twin revision invalidates an approved candidate; a no-op creates neither revision nor false staleness. | A-OFFLINE | Revision-change and no-op paired tests: `@@TEST_S05@@` | `NOT_PROVEN` |
| S06 | Importing or processing a Guest Interaction creates no Twin revision and admits no Guest content as Twin truth. | A-OFFLINE | Synthetic Interaction/Twin before-after hashes: `@@TEST_S06@@` | `NOT_PROVEN` |
| S07 | A normal Codex Workbench can invoke one minimum Forme CLI/Skill surface and receive durable Twin orientation or body-free Room status without a Forme-built chat shell. | A-OFFLINE + B-PHYSICAL | Gate A CLI contract test: `@@TEST_S07_OFFLINE@@`; later actual Workbench evidence: `@@TEST_S07_GATE_B@@` | `NOT_PROVEN` |

### D — Domain and lifecycle race verification (13)

| ID | Packet requirement | Gate | Required evidence | Result |
|---|---|---|---|---|
| D01 | Validate full per-claim basis/lineage, eligibility, correction/invalidation, effect status, prepublication recheck, identical-payload no-op, and absence of internal Twin/workspace/evidence/policy/source identifiers in hosted Projection/Response. | A-OFFLINE | Golden vectors plus privacy scan: `@@TEST_D01@@` | `NOT_PROVEN` |
| D02 | Exhaustive read/submit matrix spans Room kind/mode, Projection owner and curation state, time, Grant/encounter, and retirement. | A-OFFLINE + B-REPEAT | Generated matrix and coverage count: `@@TEST_D02@@` | `NOT_PROVEN` |
| D03 | Browser HTML and Agent JSON agree on state, bytes, warning, and `Cache-Control: no-store`. | A-OFFLINE + B-REPEAT | Same-decision renderer/API vectors: `@@TEST_D03@@` | `NOT_PROVEN` |
| D04 | All four presets enforce exact expiry/quota, accepted-only charging, retry-free idempotency, one unresolved request, Manual/Agent sharing, and quota+1 rejection. | A-OFFLINE + B-REPEAT | Time/quota property tests: `@@TEST_D04@@` | `NOT_PROVEN` |
| D05 | Agent derivative from public encounter consumes the one use/public pool; derivative from Grant consumes shared quota; Manual holder retains reply/delete and Agent cannot recover or delegate. | A-OFFLINE + B-REPEAT | Parent/derivative authority matrix: `@@TEST_D05@@` | `NOT_PROVEN` |
| D06 | Trusted 7-day/10 preset accepts ten sequential Interactions, rejects the eleventh, and never opens a Private Room. | A-OFFLINE + B-REPEAT | Trusted fixture trace: `@@TEST_D06@@` | `NOT_PROVEN` |
| D07 | Replacement Grant atomically revokes the prior Grant and transfers no unused quota. | A-OFFLINE + B-REPEAT | Both pre/post-state and concurrent vectors: `@@TEST_D07@@` | `NOT_PROVEN` |
| D08 | GrantOffer accept/revoke/expiry/target-successor races pass in both commit orders. | A-OFFLINE + B-REPEAT | Deterministic two-order race suite: `@@TEST_D08@@` | `NOT_PROVEN` |
| D09 | At most one live GrantOffer exists per Interaction; direct invite is one-use; redemption delay never extends fixed offered expiry. | A-OFFLINE + B-REPEAT | Constraint and clock vectors: `@@TEST_D09@@` | `NOT_PROVEN` |
| D10 | Publish versus delete/revoke/retire/expiry passes in both commit orders, with one Response and terminal precedence. | A-OFFLINE + B-REPEAT | Two-order transaction traces: `@@TEST_D10@@` | `NOT_PROVEN` |
| D11 | `close_without_response` versus publish passes in both orders, including quota, candidate, endpoint, and notification outcomes. | A-OFFLINE + B-REPEAT | Cross-object race traces: `@@TEST_D11@@` | `NOT_PROVEN` |
| D12 | Unlist preserves valid Grant/GrantOffer, invalidates unused public encounter, and the same Projection version cannot be re-admitted. | A-OFFLINE + B-REPEAT | Lifecycle transition vectors: `@@TEST_D12@@` | `NOT_PROVEN` |
| D13 | Stale/superseded/expired origins require truthful disclosure; revoked origin rejects a new Response. | A-OFFLINE + B-REPEAT | Origin-state response matrix: `@@TEST_D13@@` | `NOT_PROVEN` |

### F — Local physical boundary and Fresh Session verification (13)

| ID | Packet requirement | Gate | Required evidence | Result |
|---|---|---|---|---|
| F01 | Probe denies Guest store, candidate store, credential, auth home, live repo, sibling/home/vault, socket, write, generic network, cross-Room, connector, and publish. | A-OFFLINE + B-PHYSICAL | Fake-boundary adversarial suite: `@@TEST_F01_OFFLINE@@`; installed-system proof: `@@TEST_F01_GATE_B@@` | `NOT_PROVEN` |
| F02 | The only model-callable data/filesystem tool is bounded `SnapshotQueryBrokerV1`; unavoidable inert coordination tools are inventoried and effectless; shell/interpreter/repo execution/browser/MCP/app/env/Git/config/connector are unavailable. | A-OFFLINE + B-PHYSICAL | Tool inventory and negative probes: `@@TEST_F02@@` | `NOT_PROVEN` |
| F03 | Exact source-policy and secret-policy hashes reject dirty/untracked, symlink, submodule, alternate/worktree escape, binary, generated, unclassifiable, secret/canary, and size overflow; any widening invalidates current authority. | A-OFFLINE + B-REPEAT | One vector per rejection plus policy-hash mutation test: `@@TEST_F03@@` | `NOT_PROVEN` |
| F04 | `SessionEnvelopeV1` is a strict `ConsentEnvelopeV1` subset; provider/account/source/budget/retention widening rejects or becomes manual-only; orientation admits only exact eligible fields and approved preview hash. | A-OFFLINE + B-REPEAT | Schema/property vectors: `@@TEST_F04@@` | `NOT_PROVEN` |
| F05 | Session is new, non-resumed, ephemeral, with no ambient config/instruction/MCP/plugin/hook/Skill/subagent. | A-OFFLINE + B-PHYSICAL | Fake runtime trace: `@@TEST_F05_OFFLINE@@`; official runtime trace: `@@TEST_F05_GATE_B@@` | `NOT_PROVEN` |
| F06 | Double-start, same-key retry, different-envelope conflict, pre-dispatch crash/release, first-dispatch unknown, and post-dispatch crash prove one hosted cycle reservation and at most one automatic draft cycle. | A-OFFLINE + B-REPEAT | State-machine/race suite: `@@TEST_F06@@` | `NOT_PROVEN` |
| F07 | Every dispatch permit is exact payload/session/provider/model/ordinal-bound, 30-second, and one-use; destructive-first sends zero bytes, while permit-first records one disclosed in-flight dispatch and cannot create later send/publish. | A-OFFLINE + B-REPEAT | Both commit orders with fake transport journal: `@@TEST_F07@@` | `NOT_PROVEN` |
| F08 | Candidate extraction accepts only the start-authorized completed turn with exactly one final-answer item and reconciled transport; wrong/partial/duplicate/rerouted/mismatched/nonzero outcomes create no candidate. | A-OFFLINE + B-REPEAT | Complete event-fence vector set: `@@TEST_F08@@` | `NOT_PROVEN` |
| F09 | Manual-only path sends zero provider bytes. | A-OFFLINE + B-REPEAT | Transport spy evidence: `@@TEST_F09@@` | `NOT_PROVEN` |
| F10 | Dispatch/input/output/time/applicable-spend ceilings stop with no provider/model fallback. | A-OFFLINE + B-PHYSICAL | Fake hard-gate boundary vectors: `@@TEST_F10_OFFLINE@@`; official transport proof: `@@TEST_F10_GATE_B@@` | `NOT_PROVEN` |
| F11 | Normal, cancel, timeout, budget, schema failure, process kill, fork/huge output, and machine-crash simulations leave no body-bearing runtime bytes after explicit recovery; read-only startup performs zero cleanup write. | A-OFFLINE + B-PHYSICAL | Cleanup matrix and filesystem diff: `@@TEST_F11@@` | `NOT_PROVEN` |
| F12 | Ordinary Workbench cannot read candidate; terminal/basis invalidation makes it unavailable before cleanup. | A-OFFLINE + B-PHYSICAL | Reverse-isolation and deny-first tests: `@@TEST_F12@@` | `NOT_PROVEN` |
| F13 | Durable receipt binds Session Envelope ID/hash and only body/path-free best-effort aggregates/digest; it never claims a complete byte/file-read manifest. | A-OFFLINE + B-REPEAT | Receipt schema vectors and canary scan: `@@TEST_F13@@` | `NOT_PROVEN` |

### E — Sync, retention, and email verification (11)

| ID | Packet requirement | Gate | Required evidence | Result |
|---|---|---|---|---|
| E01 | Fault injection runs before/after every persist, ACK, cursor, publication, and cleanup step. | A-OFFLINE + B-REPEAT | Enumerated failure-point suite: `@@TEST_E01@@` | `NOT_PROVEN` |
| E02 | Concurrent sync/sync, sync/reconcile, prepare/cleanup, and publish/cleanup serialize under the exact per-Room writer lock; same-Interaction preparation respects its lease; verified stale lock replays once and live/ambiguous owner fails closed. | A-OFFLINE + B-REPEAT | Concurrency and stale-owner suite: `@@TEST_E02@@` | `NOT_PROVEN` |
| E03 | Client-secret and sealed-envelope lost-response recovery works for Interaction, encounter, Grant/offer, derivative, and pairing; same-key/different-hash rejects. | A-OFFLINE + B-REPEAT | One lost-response vector per capability class: `@@TEST_E03@@` | `NOT_PROVEN` |
| E04 | Gap, malformed, wrong-Room, corruption, cursor-410 reconciliation, and 37-day compaction obey the fail-closed/high-water contract; expired/revoked binding has zero network authority. | A-OFFLINE + B-REPEAT | Ordered-stream/reconciliation vectors: `@@TEST_E04@@` | `NOT_PROVEN` |
| E05 | Read-only `status`/`inspect` performs zero event fetch, ACK, receipt write, cursor movement, or hidden reconciliation. | A-OFFLINE + B-REPEAT | Network/write spies and filesystem hash: `@@TEST_E05@@` | `NOT_PROVEN` |
| E06 | Hourly janitor supports duplicate/concurrent/partial/manual recovery, targets under 24 hours, and raises incident beyond 36 hours. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Controlled-clock janitor suite: `@@TEST_E06_OFFLINE@@`; production scheduler proof later: `@@TEST_E06_GATE_C@@` | `NOT_PROVEN` |
| E07 | Offline known expiry blocks startup read; remote early delete purges at next explicit sync. | A-OFFLINE + B-REPEAT | Offline/startup/sync sequence: `@@TEST_E07@@` | `NOT_PROVEN` |
| E08 | Verification code is one-use/expiring/no-authority/no-log; endpoint replacement and confirmation before/after Response create one atomic notice row; replace/remove before handoff and after handoff never creates a second notice. | A-OFFLINE + B-REPEAT | Endpoint/outbox cross-product: `@@TEST_E08@@` | `NOT_PROVEN` |
| E09 | Every destructive terminal around pending/submitting, provider timeout/proven non-acceptance, generic-content scan, post-notice revoke, endpoint/target purge, and honest body-free delivery evidence behaves exactly as specified. | A-OFFLINE + B-REPEAT | Fake-provider state/race suite: `@@TEST_E09@@` | `NOT_PROVEN` |
| E10 | Worker fault after lease/attempt commit but before network and after network but before outcome always reconciles the stable idempotency key and never blindly resends. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Fake-provider crash suite: `@@TEST_E10_OFFLINE@@`; approved provider proof later: `@@TEST_E10_GATE_C@@` | `NOT_PROVEN` |
| E11 | Post-handoff endpoint remove/replace racing definitive non-acceptance sets `no_future_retry`, sends nothing to old/new address, and a late authenticated result refines only body-free state. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Both race orders with fake provider: `@@TEST_E11_OFFLINE@@`; provider proof later: `@@TEST_E11_GATE_C@@` | `NOT_PROVEN` |

### P — Persistence and privacy verification (3)

| ID | Packet requirement | Gate | Required evidence | Result |
|---|---|---|---|---|
| P01 | PostgreSQL constraints, functions, roles, encryption adapter, and authorization matrix are verified rather than relying only on in-memory fakes. | B-REPEAT | Gate A may prepare disposable-store tests; exact SQL/migration/role validation waits for Manifest approval: `@@TEST_P01_GATE_B@@` | `NOT_PROVEN` |
| P02 | Server bundle has no model SDK, provider-call, or source-reader import path. | A-OFFLINE | Dependency graph, bundle scan, and negative source scan: `@@TEST_P02@@` | `NOT_PROVEN` |
| P03 | Private source/Twin, Guest body, credential, reply/verification secret, cross-Room, candidate, and transcript canaries are checked across local files, wire, database, JSON, HTML, errors, and every named log. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Synthetic canary matrix: `@@TEST_P03_OFFLINE@@`; exact runtime/DB and production-log repeats later | `NOT_PROVEN` |

Canaries are tripwires, not proof of semantic privacy.

Crosswalk accounting:

```text
S 7 + D 13 + F 13 + E 11 + P 3 = 47 requirements
```

Automated crosswalk count check: `@@CROSSWALK_COUNT_CHECK@@`.

## Five synthetic user journeys

All journeys use synthetic identities/content, fake external adapters, a local
test server or in-process transport, and no public route. Each journey must
produce a deterministic transcript containing only synthetic bodies and
body-free receipts.

### J1 — Manual public Guest

1. Open synthetic curated Third Place without an account.
2. Read a current/fresh/admitted shallow Forme Project Projection.
3. Obtain and consume one public encounter for a private synthetic request
   and optional small synthetic Guest Capsule.
4. Retain the private reply capability and optionally complete fake email
   confirmation.
5. Poll or receive a fake generic ready notice and read one Response.

Command: `@@JOURNEY_J1_COMMAND@@`

Result/transcript hash: `@@JOURNEY_J1_RESULT@@`

### J2 — Owner local response workflow with fake Fresh runtime

1. Explicit `forme room sync` imports body-free pending status only.
2. One-shot fake protected review receives the exact synthetic request without
   exposing it to the ordinary Workbench surface.
3. Owner start authorization binds consent, origin, orientation, source policy,
   snapshot, fake runtime, and budgets.
4. Fake Fresh runtime uses only bounded broker calls and stores an encrypted
   typed candidate plus body-free receipt.
5. A separate fake one-shot review edits/approves exact outgoing bytes.
6. Fake connector delivers idempotently and cleanup removes candidate bytes.

Command: `@@JOURNEY_J2_COMMAND@@`

Result/transcript hash: `@@JOURNEY_J2_RESULT@@`

This journey proves the repository state machine only. It is not evidence of a
real Codex call or macOS physical containment.

### J3 — Agent Guest derivative

1. Manual capability holder mints a 15-minute one-use derivative.
2. Synthetic Guest-owned Agent reads only the exact Projection JSON.
3. It submits once and consumes the correct parent quota.
4. It cannot read reply, delete, accept offer, delegate, recover, or cross Room.

Command: `@@JOURNEY_J3_COMMAND@@`

Result/transcript hash: `@@JOURNEY_J3_RESULT@@`

### J4 — Familiar and trusted continuation

1. Owner offers each of the four exact presets.
2. Guest accepts a new exact Grant whose fixed expiry does not reset on delay.
3. Independent synthetic questions share quota and allow only one unresolved.
4. Every fake AI-assisted reply uses a new cycle; manual-only uses no fake
   provider dispatch and neither loads a prior request as conversation history.
5. The trusted path accepts ten, rejects eleven, and grants no Private access.

Command: `@@JOURNEY_J4_COMMAND@@`

Result/transcript hash: `@@JOURNEY_J4_RESULT@@`

### J5 — Private Room

1. Direct URL without exact Grant returns no Projection body.
2. Owner separately issues a Private Room Grant.
3. Guest reads/submits only inside the exact Room and Projection.
4. A public familiar/trusted label grants no Private access.

Command: `@@JOURNEY_J5_COMMAND@@`

Result/transcript hash: `@@JOURNEY_J5_RESULT@@`

### Journey aggregate

- Aggregate command: `@@SYNTHETIC_WALKTHROUGH_COMMAND@@`
- Aggregate result: `@@SYNTHETIC_WALKTHROUGH_RESULT@@`
- Deterministic fixture seed/clock: `@@SYNTHETIC_FIXTURE_SEED_CLOCK@@`
- Transcript bundle SHA-256: `@@SYNTHETIC_WALKTHROUGH_SHA256@@`

## R1 → R4 causal-chain evidence

The synthetic walkthrough and content-safe real-Twin probe together must show:

```text
eligible local evidence/correction
  → current Twin revision
  → per-claim Projection basis
  → exact Owner publication approval
  → hosted Projection + optional Curator admission
  → one private Guest Interaction
  → local orientation + fake Fresh/manual judgment
  → exact Owner Response approval + hosted receipt
```

Required evidence:

| Claim | Evidence |
|---|---|
| Real Forme Twin basis is freshly reconstructed without exposing body/path | `@@REAL_TWIN_BODY_FREE_PROBE@@` |
| R1/R2/R3 basis classes are all present and eligible | `@@R1_R2_R3_BASIS_EVIDENCE@@` |
| Invalid/superseded/rolled-back-current claims are rejected | `@@INELIGIBLE_BASIS_EVIDENCE@@` |
| Identical observation/publication is a no-op | `@@NO_OP_EVIDENCE@@` |
| Guest import creates no Twin revision | `@@NO_GUEST_TWIN_REVISION_EVIDENCE@@` |
| Ordinary Workbench surface stays body-free | `@@WORKBENCH_BODY_FREE_EVIDENCE@@` |
| Fake Fresh receipt binds exact envelope and no body/path | `@@FAKE_SESSION_RECEIPT_EVIDENCE@@` |

Gate A does not satisfy the final Packet requirement for one **physically
bounded real Fresh Session**. That remains `B-PHYSICAL` and must stay Yellow
until the exact Manifest-approved proof runs.

## Gate A evidence summary

| Evidence family | Command | Result | Artifact/hash |
|---|---|---|---|
| Typecheck/build/lint | `@@BUILD_CHECK_COMMAND@@` | `@@BUILD_CHECK_RESULT@@` | `@@BUILD_CHECK_ARTIFACT@@` |
| Existing R1–R3 suite | `@@R1_R3_TEST_COMMAND@@` | `@@R1_R3_TEST_RESULT@@` | `@@R1_R3_TEST_ARTIFACT@@` |
| R4 unit/property | `@@R4_UNIT_PROPERTY_COMMAND@@` | `@@R4_UNIT_PROPERTY_RESULT@@` | `@@R4_UNIT_PROPERTY_ARTIFACT@@` |
| R4 lifecycle/race/recovery | `@@R4_RACE_COMMAND@@` | `@@R4_RACE_RESULT@@` | `@@R4_RACE_ARTIFACT@@` |
| R4 privacy/canary | `@@R4_PRIVACY_COMMAND@@` | `@@R4_PRIVACY_RESULT@@` | `@@R4_PRIVACY_ARTIFACT@@` |
| Disposable PostgreSQL preparation tests | `@@EPHEMERAL_PG_COMMAND@@` | `@@EPHEMERAL_PG_RESULT@@` | `@@EPHEMERAL_PG_ARTIFACT@@` |
| Five synthetic journeys | `@@SYNTHETIC_WALKTHROUGH_COMMAND@@` | `@@SYNTHETIC_WALKTHROUGH_RESULT@@` | `@@SYNTHETIC_WALKTHROUGH_SHA256@@` |
| Markdown/link/diff checks | `@@DOC_CHECK_COMMAND@@` | `@@DOC_CHECK_RESULT@@` | `@@DOC_CHECK_ARTIFACT@@` |

Overall Gate A verification verdict: `@@GATE_A_VERDICT_NOT_SET@@`.

Allowed final values are:

- `GREEN_FOR_GATE_B_REVIEW`: every Gate A item is proved and only declared
  Gate B/C conditions remain;
- `YELLOW_GATE_A_INCOMPLETE`: implementation/evidence gaps remain but no
  contract violation is known;
- `RED_CONTRACT_MISMATCH`: implementation contradicts the approved Packet.

## Deliberate later-gate conditions

### Gate B Yellow — exact local schema/runtime proof

- Official Codex adapter must expose the bounded query tool and hard transport,
  model, token, output, time, and cost gate. Failure leaves AI manual-only; it
  does not permit a private fork or prompt-only substitute.
- Signed/hardened macOS launcher, native user-presence review, Keychain/Secure
  Enclave, reverse isolation, outer sandbox, cleanup, and canaries must work as
  one installed system.
- Exact SQL migration, constraints, functions, roles, grants, encryption, lock
  order, preflight, and compatible image rollback must be validated only after
  the Manifest is approved.

### Gate C production facts

- exact origin and Cloudflare/Caddy trust chain;
- actual backup and Cloudflare/Caddy/app/PostgreSQL log horizons;
- exact OpenAI account/consent regime;
- exact email provider, region, recipient/delivery-log retention,
  reconciliation, credential, and spend;
- production migration/deploy/restore/rollback/health/janitor commands;
- real actors/data classes, activation window, public traffic, and disable
  command.

## Completion rule

This register becomes Gate A completion evidence only when:

1. all 47 rows have real evidence and no `NOT_PROVEN` result;
2. all five synthetic journeys pass reproducibly;
3. zero-external-effects attestation is proved;
4. the real Forme Twin probe remains content-safe and body/path-free;
5. every test/evidence artifact binds the same implementation commit/tree;
6. remaining gaps are assigned honestly to Gate B or Gate C;
7. the Gate B Manifest and low-load Owner Review are complete, hash-pinned,
   and contain no unresolved completion-critical placeholder.

Passing Gate A is Technical Review readiness for the next exact stop gate. It
is not R4 Owner Acceptance or R4 Done.
