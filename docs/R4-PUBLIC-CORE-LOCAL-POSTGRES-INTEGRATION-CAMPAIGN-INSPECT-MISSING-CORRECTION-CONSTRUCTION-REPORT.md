# R4 #67 Integration Campaign Inspect-Missing Correction Construction Report

- Status: **`TECHNICAL_REVIEW_GREEN`**
- Date: 2026-08-15
- Scope: repository-only inspect-missing correction, Gate-B concurrency
  validation correction, strict evidence freeze and current-status alignment
- Replacement Integration Campaign: **NOT_REQUESTED**
- Docker / cleanup / PostgreSQL / SQL: **NOT_EXECUTED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Outcome

The Integration Campaign now has one exact body-free parser for production and
fake Docker inspect results. For the pinned Docker CLI `29.3.1`, a missing
image, container, network or volume is recognized only from completed status
`1`, stdout exactly one LF byte and the exact full-line stderr diagnostic for
the requested name. Empty output, CRLF, multiple lines, another name, another
status, signal, timeout, malformed JSON or any other ambiguity remains
`UNKNOWN` and stops before cleanup or physical construction.

The repository test that originally prevented evidence freeze is also
corrected. The shared Gate-B macOS feeder path no longer uses an unrelated
fixed ten-second terminal wait. It waits only within the remaining minimum of
the already-bound absolute authority deadline and helper-start ceiling, plus
the existing two-second cleanup grace. It never retries a feeder or widens the
enclosing authority. Null/error/signal/nonzero/malformed terminal truth and
unproven process-group absence remain fail closed.

The exact default concurrent Gate-B command is Green twice consecutively, and
the complete serial form is Green once. The earlier `144 / 145` ambiguity is
therefore closed without skipping the test or replacing the default command.

This is repository Technical Review only. No replacement campaign grant was
prepared or consumed. No Docker socket was resolved, no Docker CLI or daemon
was called, no cleanup ran, no image was pulled, and no PostgreSQL or SQL
effect occurred.

## Exact authority and topology

| Stage | HEAD / tree | Exact delta |
|---|---|---|
| inspect Addendum | `15536817efe6b0b7a5c8014e912f02429f197ef1` / `503c9432fd2b75fd16857afe58c2eb78a24581da` | one added authority document |
| inspect Review | `7e07672563201d92db14ecf3adcbf5f6ad970b9f` / `34b9fd454725c15710946503af7d8be126fa09ab` | one added review document |
| `Kic` inspect implementation | `1e93280bc3842d40e6f797a38ca4bfa2a2277813` / `14526ed95feae2da6c9c14a89ece48616822e4e8` | `2M` |
| concurrency Addendum | `e21c441a6154f3c08b96ccbf7f0f7b693107b99a` / `8860d06a9ccc821be62bf62ee79cd356b8b7fb52` | one added authority document |
| concurrency Review | `9f178918c416bd3be54e4cbc44e0c64567a78ca1` / `63e69b5594aa9ba6627b825b1ac4aa636e15605e` | one added review document |
| `Kgc` Gate-B correction | `98392bf19356982c884961a1425cd97ff33811bf` / `796684556d04368c3acd3926d0c86992affa205c` | `2M` |
| `Lic` machine evidence | `614202e8765372755f75ce7fa465ef9e550971a8` / `180d6a9fa048e07e72ddbab8e2e4e2e354fb902a` | `3A` |

The exact chain is:

`inspect Addendum → inspect Review → Kic → concurrency Addendum → concurrency Review → Kgc → Lic → candidate Mic`.

All commits are direct, single-parent steps. `Kic` remains immutable predecessor
truth; `Kgc → Lic → Mic` is the exact approved new 15-path / three-commit
construction.

## Frozen artifacts

### Implementation

| Path | Commit | Bytes | SHA-256 |
|---|---|---:|---|
| `scripts/r4-public-core-local-postgres.mjs` | `Kic` | `735755` | `sha256:f012fd876cc49bd14be3519af6aeef98d7451ab29c90c786a7f242f59915984c` |
| `test/r4/public-core-local-postgres.test.ts` | `Kic` | `196175` | `sha256:25e51e491a37e1e048e6bce590c8cf5d08599a4fa8b2fd02cf83a17523280b83` |
| `scripts/r4-gate-b-physical-runner.mjs` | `Kgc` | `656525` | `sha256:8e0a6afca5674975c150a40f6f9dafd9a0b1d84be1d4886a325fd0f88d370184` |
| `test/r4-gate-b-core/physical-runner.test.ts` | `Kgc` | `322161` | `sha256:d2efcb6ea9780b1c8d44bd1d58d4b3d0557baf68845c226226feac5a871dc6a3` |

The framed aggregates are:

- `Kic` G2: `sha256:5dea77a0e5391f3283caab8a9b1d67f4a6ed8758be6be3631bad5283ca530f1f`;
- `Kgc` G2: `sha256:0101d889a77749a0671e26490bf2bb8a1aeab14b8678ce54d959a250388f83b4`.

### Machine evidence

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| artifact index | `6485` | `sha256:d90271f5d15e1b2ac42b23211283257822f74ac9795b244a8db306ed0e157125` |
| strict evidence schema | `13896` | `sha256:942e1ddcf5e65303e5d4a7df02a929d6c04ee5f92a4f8db615670c5aa5c8d204` |
| machine evidence | `11269` | `sha256:4877ab9d24352187cd15ac3a7e88833f4cb5d46d60c324c7b5419572c32a5cf1` |

`Lic` G3 is
`sha256:1dd72f64a6683a50e4f606a9601ab94d674a8b9757082f4318a2b532bec15d39`.
The committed `Kic`, `Kgc` and `Lic` audit summaries are respectively:

- `sha256:7c1ea06b0f7c1422b29ef6eba6a92a063d1e6495e3d7a5cb6adccd535b1bd094`;
- `sha256:aeb46997b467b5471f484de08c543b061e0caed398d9aa6c83200203252f231f`;
- `sha256:3623dafd4f988503955b64206fe7bb292787de7c864ea38bcd5f4f9f5f9dd9e6`.

The schema compiles under strict Ajv 2020-12. Eight structural hostile
mutations fail schema validation; a format-correct but wrong schema digest is
rejected by the separate cross-hash audit, avoiding schema self-reference.

## Validation

| Lane | Result |
|---|---:|
| inspect/campaign focused deny-network | `15 / 15` |
| complete local-PostgreSQL runner | `176 / 176` |
| complete R4 offline | `748 / 748` |
| default concurrent Gate-B Core, committed run 1 | `146 / 146` |
| default concurrent Gate-B Core, committed run 2 | `146 / 146` |
| serial full Gate-B Core | `146 / 146` |
| repository spine | `45 / 45` |

Runner syntax, TypeScript, no-server-AI, source inventory, legacy docs audit,
strict Ajv, cross-hash, exact topology, committed blobs, workset and diff
checks are Green. The candidate `Mic` audit is 0 Blocker / 0 Important before
commit; the post-`Mic` committed audit remains external and is not claimed by
these bytes.

## Effect audit

| Effect | Count |
|---|---:|
| retained forensic-root reads / writes | `0 / 0` |
| Docker socket resolutions / CLI / daemon calls | `0 / 0 / 0` |
| OCI pulls | `0` |
| cleanup calls | `0` |
| PostgreSQL connections / SQL statements | `0 / 0` |
| product runtime / production / public traffic | `0 / 0 / 0` |
| Provider / messages / deploy / release / spend | `0 / 0 / 0 / 0 / 0` |
| Gate C actions | `0` |

The existing failed first-prepare root and consumed r2 campaign root remain
unread and unmodified forensic history. Their V1 grant, terminal evidence and
journal are not retried or reinterpreted.

## What remains false

- fresh Integration Campaign V2 prepared: `false`;
- fresh Integration Campaign V2 consumed: `false`;
- Docker resource absence observed: `false`;
- target PostgreSQL `160010` observed: `false`;
- target catalog `14 / 207 / 172 / 44` observed: `false`;
- disposable local physical Green: `false`;
- production pool/migration/runtime route/traffic: `false`;
- one real bounded Guest encounter Owner-accepted: `false`;
- Gate C ready: `false`;
- #67 or R4 Done: `false`.

## Mandatory stop

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_INSPECT_MISSING_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_INTEGRATION_CAMPAIGN_V2_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Any future V2 prepare, Docker diagnostic/cleanup, PostgreSQL rehearsal,
production action or Gate C action requires a new exact Owner-approved
versioned Execution Card/Review.
