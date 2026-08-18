# Documentation map

This page is the short route into Forme's repository documentation. The repo
contains current operating truth, stable product/architecture contracts and
dated evidence. Those are intentionally different things.

## Current state — local product runtime integrated, 2026-08-18

The guest-facing Room now has a bounded local activation mode connected to the
Durable Public Core and loopback PostgreSQL adapter. Repository validation and
the normal Room production build are Green. The first no-pull synthetic
activation rehearsal stopped before PostgreSQL because the exact image was not
cached and cleaned all owned artifacts.

#67 remains `Building / At Risk`: replacement synthetic activation and one
Owner-experienced Guest encounter remain open. Production, Provider use,
public deployment and Gate C remain closed. Start with the
[`activation result`](./R4-LOCAL-PUBLIC-CORE-ACTIVATION-RESULT.md), then the top
of [`CONTROL.md`](./CONTROL.md).

Current stop: `LOCAL_PUBLIC_CORE_RUNTIME_INTEGRATION_TECHNICAL_REVIEW_GREEN /
LOCAL_ACTIVATION_REHEARSAL_FAILED_CLEAN_IMAGE_NOT_CACHED /
REPLACEMENT_IMAGE_ACQUISITION_DECISION_REQUIRED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

## Current state — consolidated integration, 2026-08-18

The disposable PostgreSQL Enabler (#77) is Technical Review Green. The exact
schema/restart/persistence/rollback rehearsal completed with owned residue
zero. That removes the local persistence blocker but adds no direct Product
Progress.

The reviewed repository result is now one
[Draft integration PR #78](https://github.com/formehq/forme/pull/78) targeting
`main`. Its reviewed code baseline is `5338f04`; PR metadata is authoritative
for the current tip and CI after later documentation-only commits. The former
stacked Draft PRs #65, #73, #75 and #76 are closed, unmerged historical review
surfaces.

#67 remains `Building / At Risk`. Product runtime activation,
publication/admission and one Owner-experienced Guest encounter remain open.
Production, real/private Guest data, Provider calls, public traffic and Gate C
are not authorized by repository integration.

Current stop: `LOCAL_POSTGRES_WIRING_TECHNICAL_REVIEW_GREEN /
CONSOLIDATED_MAIN_INTEGRATION_CI_GREEN / PRODUCT_INTEGRATION_REQUIRED /
OWNER_EXPERIENCE_ACCEPTANCE_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

## Read this first

| Document | Use it for |
|---|---|
| [`CONTROL.md`](./CONTROL.md) | Current gate, next action and Owner stop conditions. Read the top current section first. |
| [`PRODUCT.md`](./PRODUCT.md) | Highest Vision, MVP claim, P0/P1/P2 scope and the real #67 acceptance story. |
| [`ROADMAP.md`](./ROADMAP.md) | Dependency order, scope protection and what follows R4. |
| [Issue #67](https://github.com/formehq/forme/issues/67) | Live walking-slice status and Owner-facing acceptance checklist. |
| [Draft PR #78](https://github.com/formehq/forme/pull/78) | Current remote bytes, review discussion and CI. |
| [`VALIDATION.md`](./VALIDATION.md) | Append-only product learning and evidence register. Read its top verdict unless auditing history. |
| [`R4-REVIEWABLE-INTEGRATION-PACKAGE.md`](./R4-REVIEWABLE-INTEGRATION-PACKAGE.md) | What the consolidated integration proves and what it deliberately does not prove. |

## Stable product and architecture contracts

These documents remain valid beyond one execution attempt:

| Document | Contract |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Durable system boundaries. |
| [`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md) | Owner-approved Harness/Forme carrier, NH1/NH2 and Fresh Native Response Session boundary. |
| [`AGENCY-TRUST.md`](./AGENCY-TRUST.md) | Privacy-first, minimum-friction human boundary. |
| [`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md) | Room, Projection, Guest, Response and no-server-AI product foundation. |
| [`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md) | Owner-approved Hybrid encounter and Demo-critical cut. |
| [`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md) | Byte-frozen Gate A control boundary approved on 2026-08-03. |
| [`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md) | Closed P/T1–T5/NH1/NH2 review record. |
| [`R4-EXECUTION-MANAGEMENT-RESET.md`](./R4-EXECUTION-MANAGEMENT-RESET.md) | Stable medium-envelope and review-by-exception operating policy. |

## Current evidence

- [`R4-LOCAL-PUBLIC-CORE-ACTIVATION-RESULT.md`](./R4-LOCAL-PUBLIC-CORE-ACTIVATION-RESULT.md)
  records the product runtime integration and the first failed-clean no-pull
  activation rehearsal.
- [`evidence/r4-local-public-core-activation.json`](./evidence/r4-local-public-core-activation.json)
  is its machine-readable repository, effect and cleanup evidence.
- [`R4-DISPOSABLE-POSTGRES-REHEARSAL-RESULT.md`](./R4-DISPOSABLE-POSTGRES-REHEARSAL-RESULT.md)
  records the physically Green disposable PostgreSQL 16 lifecycle.
- [`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json)
  is its machine-readable evidence.
- [`R4-POSTGRES-VERIFY-ARCHITECTURE-REVIEW.md`](./R4-POSTGRES-VERIFY-ARCHITECTURE-REVIEW.md)
  and [`R4-POSTGRES-VERIFY-ASSERTION-VECTOR-RESULT.md`](./R4-POSTGRES-VERIFY-ASSERTION-VECTOR-RESULT.md)
  explain the PostgreSQL 16 catalog-expression diagnosis.
- [`R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md`](./R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md),
  its [`Owner Review`](./R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-OWNER-REVIEW.md)
  and [`Construction Report`](./R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-REPORT.md)
  preserve the Durable Public Core repository boundary.

## Logs are not entry points

Three intentionally long files preserve chronology:

- [`DECISIONS.md`](./DECISIONS.md) is the append-only Owner decision log;
- [`VALIDATION.md`](./VALIDATION.md) is the append-only learning/evidence log;
- [`CONTROL.md`](./CONTROL.md) contains the current cockpit followed by
  completed R1–R4 control packets and historical checkpoints.

Do not read them end-to-end for ordinary re-entry. Start at the top current
section and follow a dated historical section only when investigating lineage.
Their length is not a signal that every old checkpoint is still active.

## Historical material intentionally omitted from current integration tree

The reviewable integration deliberately excluded the large chronological
Local PostgreSQL authority archive. Historical references in mutable status
documents therefore route here instead of pretending the omitted file is
present.

The omitted family includes the former
`R4-PUBLIC-CORE-LOCAL-POSTGRES-*` wiring, Physical Rebind, APFS correction,
execution-topology correction, Docker diagnostic/rescue and Integration
Campaign reports. Their exact names, hashes and outcomes remain recorded in
[`DECISIONS.md`](./DECISIONS.md), [`VALIDATION.md`](./VALIDATION.md), the
physically Green source chronology and Git history. They are evidence, not
current authority, and should not be copied back merely to make the active PR
larger.

The R4 Gate A/Gate B documents that are present in this tree are likewise
dated or byte-frozen evidence unless their own header explicitly says they are
current.

## Reference and research

- [`reference/architecture-understanding-contract-v0.1.md`](./reference/architecture-understanding-contract-v0.1.md)
  is an owner-authored rebuild reference.
- [`reference/design-lineage.md`](./reference/design-lineage.md) explains how
  the early model became the current Living Project Twin architecture.
- [`research/`](./research/) contains dated research, not product authority.
- [`STEWARDSHIP.md`](./STEWARDSHIP.md) remains a proposal.

## Documentation maintenance rule

1. Current status belongs at the top of `CONTROL.md`, the active issue and the
   active integration PR.
2. Stable meaning belongs in Product, Roadmap or Architecture only after an
   Owner-confirmed change.
3. Evidence and decisions are append-only; mark superseded sections as dated
   history rather than rewriting their claims.
4. Do not move or edit byte-frozen authority documents solely for tidiness.
5. Every relative Markdown link in the active integration tree must resolve.
