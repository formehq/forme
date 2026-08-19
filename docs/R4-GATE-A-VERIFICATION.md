# R4 Gate A verification and evidence register

- Status: **GREEN_FOR_GATE_B_REVIEW**
- Authority: R4 Technical Control Packet v0.2
- Approved Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Implementation branch: `codex/r4-gate-a-build`
- Gate A implementation commit:
  `c23988e2c626a92d6d1a2dfacdce5ad089cdb4f7`
- Gate A implementation tree:
  `fe1071da80310956c11fa0930ec63e710ee1d6e0`
- Evidence generated: `2026-08-04T10:29:12.000Z`
- Structured evidence:
  [`r4-gate-a-evidence.json`](./evidence/r4-gate-a-evidence.json)
- Evidence SHA-256:
  `sha256:b2e79265eb92c46c8bb2e6c8fb3f6d0fa334a3eef4c1044a95a5243a646cfe4f`
- Next proposed gate:
  [Gate B Schema, Runtime, and Migration Manifest](./R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md)

Gate A proves the repository-only system with synthetic data, fake
provider/connector/email adapters, local ephemeral files, a content-safe real
Twin probe, and a local production browser. It does not claim a real model
call, real Guest encounter, database migration, hosted mutation, external
message, deployment, production secret, public traffic, or spend.

## One-screen result

| Check | Result |
|---|---|
| R1–R3 spine | **45/45** |
| R4 offline suite | **293/293** under external-network denial |
| Typecheck | **pass** |
| Production Room build | **8 routes; 18 chunks and 9 traces audited** |
| Five-journey walkthrough | **byte-identical twice** |
| Real Forme Twin probe | **revision 27; body/path-free; reported source bytes 0** |
| Production standalone browser | **pass; no console/error; deleted read is controlled 404, never 503** |
| Independent implementation audit | **Red none; no unresolved Gate A implementation Yellow** |
| Overall | **GREEN_FOR_GATE_B_REVIEW** |

## Zero-external-effects attestation

| Prohibited effect | Gate A observed result | Evidence |
|---|---:|---|
| Real model/provider request | 0 | Static AST/build audit + walkthrough counters |
| Incremental provider spend | US$0 | No provider transport; walkthrough/static audit |
| Real third-party Guest body/capsule | 0 bytes | Synthetic-only fixtures and offline harness |
| External email/message | 0 | Fake notification provider; walkthrough counter |
| Hosted/production mutation | 0 | In-memory/local synthetic store only |
| Schema migration execution | 0 | No executable migration run |
| Deployment/public traffic | 0 | Local `127.0.0.1` browser only |
| Production secret issuance/use | 0 | Synthetic canonical secrets only |
| Real source body in evidence | 0 bytes | Body/path-free Twin probe |

This attestation is scoped to the work recorded in the structured evidence. It
does not infer facts about unobserved production infrastructure.

## Requirement-to-evidence crosswalk — 47 Packet checks

Labels:

- `GREEN_A`: the Gate A analogue is implemented and proved.
- `B_REPEAT_PENDING`: Gate B must repeat the same invariant against the exact
  disposable persistence/runtime.
- `B_PHYSICAL_PENDING`: only an installed official runtime/OS composition can
  prove the physical boundary.
- `C_PRODUCTION_PENDING`: only a separately approved production target can
  prove the fact.
- `DEFERRED_BY_DESIGN_B_REPEAT`: the Packet deliberately forbids this
  execution in Gate A; a complete exact proposal exists for the next stop gate.

| ID | Packet requirement | Gate | Evidence | Result |
|---|---|---|---|---|
| S01 | R1–R3 regression remains 45/45. | A-OFFLINE | `npm run test:spine` → 45/45. | GREEN_A |
| S02 | R4 weakens none of correction, approval, restart, retry, receipt, or rollback. | A-OFFLINE | R1–R3 recovery suites plus R4 recovery/race suites. | GREEN_A |
| S03 | A fresh real Forme Twin supplies eligible R1, corrected R2, and truthful R3 history. | A-PROBE | `r4.real-twin-basis-probe.v1`; revision 27; reported source body bytes 0. | GREEN_A_PROBE |
| S04 | Ineligible current meaning/effects reject; labeled rollback history alone may project. | A-OFFLINE | Protocol eligibility and local Projection positive/negative vectors. | GREEN_A |
| S05 | Twin revision change invalidates a candidate; no-op creates no false staleness. | A-OFFLINE | Local Projection/publication revision and identical-payload vectors. | GREEN_A |
| S06 | Guest processing creates no Twin revision or Twin truth. | A-OFFLINE | `S06` response-orientation test and J2 before/after Twin hash. | GREEN_A |
| S07 | A normal Workbench can use the minimum Forme CLI without a Forme chat shell. | A-OFFLINE + B-PHYSICAL | CLI/package-surface contract is green; actual official Workbench repeat is explicitly Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| D01 | Basis/lineage/eligibility/recheck/no-op/privacy rules hold. | A-OFFLINE | Publication boundary, hosted publication boundary, and canary scans. | GREEN_A |
| D02 | Read/submit matrix covers Room, Projection, time, capability, and retirement. | A-OFFLINE + B-REPEAT | Generated exhaustive protocol matrix. | GREEN_A · B_REPEAT_PENDING |
| D03 | Browser HTML and Agent JSON agree and are no-store. | A-OFFLINE + B-REPEAT | D03 renderer/API parity plus production standalone browser acceptance. | GREEN_A · B_REPEAT_PENDING |
| D04 | All four presets enforce exact expiry, quota, charging, retry, and unresolved rules. | A-OFFLINE + B-REPEAT | Protocol preset properties and J4. | GREEN_A · B_REPEAT_PENDING |
| D05 | Agent derivatives consume parent authority and cannot recover/delegate/reply/delete. | A-OFFLINE + B-REPEAT | Capability and lost-response authority matrices. | GREEN_A · B_REPEAT_PENDING |
| D06 | Trusted 7d/10 accepts ten, rejects eleven, and opens no Private Room. | A-OFFLINE + B-REPEAT | J4 trusted trace. | GREEN_A · B_REPEAT_PENDING |
| D07 | Grant replacement revokes atomically and transfers no unused quota. | A-OFFLINE + B-REPEAT | Concurrent replacement test. | GREEN_A · B_REPEAT_PENDING |
| D08 | GrantOffer accept/revoke/expiry/successor races pass in both orders. | A-OFFLINE + B-REPEAT | Two-order capability race suite. | GREEN_A · B_REPEAT_PENDING |
| D09 | One live offer, one-use invite, and fixed expiry hold. | A-OFFLINE + B-REPEAT | Offer/invite/deadline constraints. | GREEN_A · B_REPEAT_PENDING |
| D10 | Publish vs delete/revoke/retire/expiry has one winner and terminal precedence. | A-OFFLINE + B-REPEAT | Hosted control two-order transaction traces. | GREEN_A · B_REPEAT_PENDING |
| D11 | Close-without-response vs publish has one winner and correct dependent outcomes. | A-OFFLINE + B-REPEAT | Cross-object close/publish traces. | GREEN_A · B_REPEAT_PENDING |
| D12 | Unlist preserves valid continuation, kills unused public encounter, and cannot re-admit. | A-OFFLINE + B-REPEAT | D12 admission/unlist lifecycle vectors. | GREEN_A · B_REPEAT_PENDING |
| D13 | Stale/superseded/expired disclose truth; revoked rejects a new Response. | A-OFFLINE + B-REPEAT | Origin matrix and response terminal suite. | GREEN_A · B_REPEAT_PENDING |
| F01 | Synthetic probe denies every protected root/effect/cross-Room surface. | A-OFFLINE + B-PHYSICAL | Capability denial inventory; installed proof remains Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| F02 | Only bounded SnapshotQueryBroker data operations are model-callable. | A-OFFLINE + B-PHYSICAL | Broker-only adapter negative probes; official inventory remains Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| F03 | Exact snapshot/secret policy rejects every widening and escape. | A-OFFLINE + B-REPEAT | Snapshot adversarial vectors and policy-hash mutation. | GREEN_A · B_REPEAT_PENDING |
| F04 | Session Envelope is a strict Consent subset and orientation is exact. | A-OFFLINE + B-REPEAT | Schema/property and orientation vectors. | GREEN_A · B_REPEAT_PENDING |
| F05 | Session is fresh, non-resumed, ephemeral, and ambient-free. | A-OFFLINE + B-PHYSICAL | Fake runtime policy negatives; official runtime remains Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| F06 | Cycle reservation/retry/crash rules allow at most one automatic draft cycle. | A-OFFLINE + B-REPEAT | Fresh cycle recovery and race suite. | GREEN_A · B_REPEAT_PENDING |
| F07 | Dispatch permits are exact, 30-second, one-use, and race-safe. | A-OFFLINE + B-REPEAT | Permit and destructive-first/permit-first vectors. | GREEN_A · B_REPEAT_PENDING |
| F08 | Candidate extraction accepts only one fully reconciled authorized final. | A-OFFLINE + B-REPEAT | 17 event-fence subcases. | GREEN_A · B_REPEAT_PENDING |
| F09 | Manual-only sends zero provider bytes. | A-OFFLINE + B-REPEAT | Transport spy and receipt test. | GREEN_A · B_REPEAT_PENDING |
| F10 | Dispatch/input/output/time/spend ceilings fail before fake transport. | A-OFFLINE + B-PHYSICAL | Hard-budget boundary vectors; official transport proof remains Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| F11 | All terminal/crash analogues leave no body-bearing runtime bytes after recovery. | A-OFFLINE + B-PHYSICAL | Runtime cleanup and supervisor matrix. | GREEN_A · B_PHYSICAL_PENDING |
| F12 | Workbench cannot read candidate; deny precedes cleanup. | A-OFFLINE + B-PHYSICAL | Candidate reverse-isolation analogue; physical proof remains Gate B. | GREEN_A · B_PHYSICAL_PENDING |
| F13 | Receipt binds exact envelope and only body/path-free aggregate evidence. | A-OFFLINE + B-REPEAT | Session receipt schema and canary scan. | GREEN_A · B_REPEAT_PENDING |
| E01 | Every persist/ACK/cursor/publication/cleanup fault point converges. | A-OFFLINE + B-REPEAT | 20 named before/after fault points. | GREEN_A · B_REPEAT_PENDING |
| E02 | Required Room operations serialize; leases and stale-lock recovery fail closed. | A-OFFLINE + B-REPEAT | Four concurrency pairings plus lock/lease/replay suite. | GREEN_A · B_REPEAT_PENDING |
| E03 | All capability classes recover lost responses; changed bytes reject. | A-OFFLINE + B-REPEAT | Encounter, Interaction, Grant/offer, derivative, invite, and pairing vectors. | GREEN_A · B_REPEAT_PENDING |
| E04 | Stream gaps/corruption/410/compaction/binding expiry follow fail-closed rules. | A-OFFLINE + B-REPEAT | Ledger reconciliation and hosted compaction. | GREEN_A · B_REPEAT_PENDING |
| E05 | Read-only status performs no hidden network or write. | A-OFFLINE + B-REPEAT | Network/write spies and filesystem hash. | GREEN_A · B_REPEAT_PENDING |
| E06 | Janitor handles concurrency, batches, recovery, 24h target, and 36h incident. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Controlled-clock suite including exact batch 100. | GREEN_A · B_REPEAT/C_PRODUCTION_PENDING |
| E07 | Known expiry blocks read; remote terminal purges on explicit sync. | A-OFFLINE + B-REPEAT | Expiry and terminal-event sync sequences. | GREEN_A · B_REPEAT_PENDING |
| E08 | Verification/endpoint/notice cross-product is one-use, bounded, and race-safe. | A-OFFLINE + B-REPEAT | Notification-control cross-product. | GREEN_A · B_REPEAT_PENDING |
| E09 | Destructive and provider terminal paths purge and remain body-free. | A-OFFLINE + B-REPEAT | Notification and response-terminal suites. | GREEN_A · B_REPEAT_PENDING |
| E10 | Worker crashes reconcile stable idempotency and never blindly resend. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Fake-provider crash suite. | GREEN_A · B_REPEAT/C_PRODUCTION_PENDING |
| E11 | Post-handoff replace/remove races prevent unsafe retry and only refine body-free state. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Both race orders and late-result test. | GREEN_A · B_REPEAT/C_PRODUCTION_PENDING |
| P01 | PostgreSQL constraints/functions/roles/encryption must replace fake-only authority. | B-REPEAT | Gate A prepared an exact proposed contract; SQL execution remains forbidden until Gate B approval. | DEFERRED_BY_DESIGN_B_REPEAT |
| P02 | Server source/build has no model/provider/source-reader path. | A-OFFLINE | AST source audit, dependency audit, and 18-chunk/9-trace build audit. | GREEN_A |
| P03 | Named secret/body canaries stay on their allowed surfaces. | A-OFFLINE + B-REPEAT + C-PRODUCTION | Hosted and local surface×canary matrices. | GREEN_A · B_REPEAT/C_PRODUCTION_PENDING |

Crosswalk accounting: `S 7 + D 13 + F 13 + E 11 + P 3 = 47`.

## Repeatable five-journey walkthrough

Command:

```sh
npm run --silent r4:walkthrough
```

The command ran twice with byte-identical JSON.

- deterministic clock: `2026-08-03T12:00:00.000Z`
- aggregate:
  `sha256:a09a4ff6208278e43a7d27a49f86c57d0ae302a933c1e6b2e193298cbf16fa56`
- raw JSON without final newline:
  `sha256:684c2fa3644329c57b270ebfd6cc0de1d94e5418f426009d3fbaef79a86b7e75`
- effects: network 0, provider 0, synthetic transport 1, external email 0,
  real Guest records 0.

| Journey | User-visible story | Steps | Transcript SHA-256 |
|---|---|---:|---|
| J1 | Manual public Guest | 5 | `sha256:686065a03214c4b184697fc659789d71d6f5367c7bab5a6afdfeab1d2cc401d6` |
| J2 | Owner-local deterministic response path | 16 | `sha256:42e00a0bd706d3c09a2e4798b380df14548850746bec78df81c9bddc87a21696` |
| J3 | Agent Guest derivative | 3 | `sha256:494a5741b9f248acbdeb8bcdb94abb18503c105d14cf37ec1cb0fdf9aed1a2f7` |
| J4 | Familiar/trusted continuation | 5 | `sha256:32ff4d6a01f25e3126ba7c73b100b6986ab5637e3f8ae642e715b02a787f536c` |
| J5 | Exact-Grant Private Room | 2 | `sha256:57a1c5569ce3e23be6b668491a637133fc7d98792f14c2d53dc9f6df5231d76f` |

## Real R1 → R4 causal-chain probe

`npm run r4:probe-basis` reconstructed the current real Forme Twin without
reporting source bodies or paths:

- Twin revision 27:
  `sha256:05852a820a60a207296330b4981c0d4ad3f593d26574fef5b335adfc8f5505d3`
- Owner Frame fact:
  `sha256:e7e89c669c7e13c201f6ee3f264ab6345e48703b22c82aa1943e7556523c02f2`
- active corrected Reflection:
  `ref_705992a7ae63e403b601af34d16c5a54`
- truthful R3 proposal/receipt history:
  `act_107c8748243c6ef3981e245ca7b0da3a`,
  `eff_7a5ff5588d87b626eb0f8435c601c4c9`,
  `eff_4e73ebd064cf44233685ca34a087b107`
- Projection basis:
  `sha256:f14317fc4f9ed08a2d5bbb0cb80d12eb32e330539468ad7b674dfb1e3e5ebbae`
- eligible classes: `owner_frame`, `owner_corrected_reflection`,
  `rolled_back_history`
- reported source body bytes: **0**

This is the continuity proof from the already owner-accepted R1–R3 spine into
R4 Projection compilation. It is not a real Guest or provider run.

## Production-browser acceptance

The final focused run used:

```sh
NEXT_TELEMETRY_DISABLED=1 npm run room:build
FORME_R4_SYNTHETIC=1 HOSTNAME=127.0.0.1 PORT=32149 npm run room:start
npm exec --offline --yes agent-browser
```

It confirmed Third Place, public Projection/Guest, Owner control/review,
Private Grant/Projection/Guest, deletion, and terminal unreadability. Unknown
or deleted Interaction reads return `404 not_found`, never internal `503`.
The standalone server emitted no startup warning; browser console/errors were
empty. Focused screenshot:
`sha256:2f756f400579cb98bda02a43e3cf48b85a444ed690f3b91e816a36a81a9b8b14`.

## Deliberate later-gate conditions

Gate B still must prove:

- exact disposable PostgreSQL schema, roles, constraints, functions,
  encryption, migrations, preflight, verification, and cleanup;
- official Codex zero-thread/zero-turn capability facts and whether the desired
  broker-only/provider-gated lane is physically possible;
- the signed/hardened macOS launcher, user-presence, Keychain, reverse
  isolation, sandbox, cleanup, and canaries as one installed composition;
- every `B-REPEAT` row against the exact adapters.

Gate C still owns identity/edge/origin, backup/log retention, real email,
deployment/restore, production database, real Guest data, public traffic, and
any real provider call.

Passing Gate A means **Technical Review readiness**. It is not R4 Owner
Acceptance, R4 Done, Gate B execution authority, or a production grant.
