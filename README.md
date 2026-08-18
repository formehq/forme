# Forme

Forme explores a controllable digital counterpart that extends an entity across **Continuity, Cognition, Agency, and Presence** without taking away the owner's authorship.

The MVP is a **Living Project Twin** for one real project. It must remember where the project is, notice what it is becoming, act once within an explicit and reversible trust boundary, and produce one controlled collaborator projection. August 25 is a Progress / Vision Sharing checkpoint for this work, not the deadline that decides whether the MVP is complete.

## Current state

### Superseding execution update — 2026-08-17

The approved #77 continuation consumed its one exact image pull and two full
PostgreSQL lifecycles. The first named a constraint-inventory ordering drift;
verify-only commit `f005cbe` proved the same 172 constraints and corrected only
their comparison order. The final lifecycle passed that check, then stopped at
`public_core_unexpected_object_present`. Both runs cleaned exactly, but
restart/rollback proof is still absent. This remains `0 Product Progress` and
#77 is `Needs Decision`; no further pull or lifecycle is authorized. See the
[#77 result](docs/R4-DISPOSABLE-POSTGRES-REHEARSAL-RESULT.md).

Current stop: `DISPOSABLE_POSTGRES_VERIFY_FAILED_CLEAN /
CONSTRAINT_INVENTORY_CORRECTION_PROVEN /
UNEXPECTED_OBJECT_ASSERTION_OBSERVED / LIFECYCLE_BUDGET_EXHAUSTED /
ARCHITECTURE_REVIEW_REQUIRED / PRODUCTION_NOT_REQUESTED /
GATE_C_NOT_REQUESTED`.

### Execution-management reset that preceded #77

R4 execution management has been reset around the #67 user experience. #67 is
`Building / At Risk`; infrastructure proof does not count as product progress.
The existing physical runner and V4 correction chain are frozen as historical
failed-clean evidence. The next possible Enabler is
[#77](https://github.com/formehq/forme/issues/77), one simplified disposable
PostgreSQL rehearsal, limited by a later medium-grained envelope to two working
days and two full lifecycles. This reset authorizes no Docker, PostgreSQL,
production or Gate C action.

Reset stop at that checkpoint: `R4_EXECUTION_MANAGEMENT_RESET_COMPLETE /
DISPOSABLE_POSTGRES_ENABLER_ENVELOPE_REQUIRED /
DOCKER_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

See the [R4 execution management reset](docs/R4-EXECUTION-MANAGEMENT-RESET.md).

### Integration Campaign V4 update before the reset (historical)

Integration Campaign V4 was prepared and consumed once. Docker matched
`29.3.1 / linux/arm64`; the corrected historical container inspect was proven
missing, then historical `network.inspect` returned a second previously
unadmitted body-free missing-object fingerprint. The runner failed closed
before image use, fresh construction, PostgreSQL or SQL. Fresh
container/network/volume are proven absent, all owned residue is zero, and the
terminal root is exact. See the
[V4 outcome](docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V4-OUTCOME.md)
(`sha256:820f9878…f67b`).

All three disposable local lifecycle slots in the confirmed autonomous
envelope are now consumed. There will be no retry. Target PostgreSQL and
catalog remain unobserved; R4 #67 remains Building. The next step is a new
Owner decision on a narrow historical network/volume fingerprint correction
and any new lifecycle budget. Production and Gate C remain closed.

Current stop: `LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V4_FAILED_CLEAN /
LOCAL_LIFECYCLE_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

### Earlier current-state snapshot (historical context)

This repository is an owner-controlled rebuild started on 2026-07-17.

- Completion: **gate-driven; Technical Review plus Owner Experience Acceptance,
  with no date-based substitute**
- Progress / Vision Sharing: **2026-08-25 (Tuesday)** — share the truthful state
  reached by then; a complete or repeatable MVP is not required for the sharing
- Current gate: **R4 Controlled Presence is Building on the real product
  sequence.** R1–R3 are Owner-accepted and #66 completed one real-Twin,
  local-only Projection review. #67 has repository/offline Public Core and
  concrete Local PostgreSQL wiring. The approved Integration Campaign V2
  proved the historical Docker names absent, then failed before PostgreSQL;
  the later image-manifest diagnostic stopped at `IMAGE_MISSING`. The first
  image-acquisition diagnostic was subsequently prepared and consumed once.
  Its sole Docker `version` call returned a body-free `NONZERO / exit 1`, so it
  failed closed before inspect or pull. The Owner reports Docker Desktop was
  not running for that attempt and is running now; the repository records that
  only as Owner context, not as a machine observation. Kiar `3db3060` / Liar
  `3e1b0cb` now freeze a replacement V2 authority path that preserves the
  failed V1 root and may later repeat the same bounded acquisition diagnostic
  only under a fresh one-use approval. Validation is 6/6 focused, 188/188
  runner, 85/85 non-runner, 440/440 Public Core, 760/760 offline, 146/146
  Gate-B Core and 45/45 spine. Replacement construction made zero Docker,
  socket, daemon, registry, pull, cleanup, PostgreSQL or SQL effects. Vault,
  HTTPS transport, production pool/migration, runtime route, traffic and Gate C
  remain false. R4 is not Owner-accepted or Done.
- Integration truth: **R4 is not on `main`.** `main` remains at `7c1f7bd`; the
  current inherited Draft stack is PR #65 at `cbadd8a`, PR #73 at `5e93196`
  and PR #75 at `09401a0`. Local PostgreSQL Wiring Stage A is `bc0b520`;
  APFS nlink correction Kc/Lc are `18e3a32` / `32448cb`; execution-authority
  topology correction Kt/Lt are `f7d3783` / `c699f9d`; Docker diagnostic
  rescue correction Kd/Ld are `0fdf68c` / `62d0c98`; body-free inspect
  diagnostic Kf/Lf are `bd3cdf7` / `7384ef8`; prepare-failure correction
  Kp/Lp are `eaca190` / `7a31dba`; Integration Campaign Ki/Li are
  `76afe10` / `4c20af2`; inspect-missing Kic/Kgc/Lic are
  `1e93280` / `98392bf` / `614202e`; topology verifier correction Kvt/Lvt are
  `85096f6` / `27540be`; image-manifest diagnostic Kmd/Lmd are `32abce2` /
  `b17a44f`; image-acquisition diagnostic Kiad/Liad are `c6fe180` / `95197de`;
  replacement authority Kiar/Liar are `3db3060` / `3e1b0cb`;
  Draft PR #76
  remains the unmerged proposal surface, with its current remote head and CI
  recorded in PR metadata rather than self-bound here. PR #74 is
  merged and changed only the deterministic Linux inode-reuse test fixture; it
  did not change product behavior or #67 authority.
- Host truth: Host Binding attempts 1 and 2 are consumed Yellow history. Attempt
  2 stopped `YELLOW_NO_RETRY / HOST_BINDING_INCOMPLETE_YELLOW` before any Docker
  CLI, local Docker socket, or macOS inspector start (`0 / 0 / 0`), produced no
  Host capsule or public receipt, and cleaned Green. Retry Execution and the
  first provider-call grant remain `NOT_REQUESTED`. Host Setup/Doctor is tracked
  in #71 as an enabler for the later Fresh local Codex slice; it is not #67's
  product milestone or a substitute for a real encounter.
- Production gap: the current Public Core has repository/offline proof and a
  full-history-verifying local Integration Campaign V2 contract, not a PostgreSQL rehearsal
  Green. Historical resource absence remains unknown, all forensic roots are
  retained unchanged, and no Docker resource, PostgreSQL process, database or
  SQL effect ran during correction construction. No production PostgreSQL migration,
  Gate C deployment/provisioning, production Room mutation, public traffic,
  external email, Provider call, production secret or spend has occurred.
- V2 topology verifier correction bindings: index
  `sha256:9a2cce7c176694be205abedd6d3ef5775e345ed7f8871e4b0631c08ad7d99929`,
  schema
  `sha256:31e54f83927a514fe8392c689e9cf1f4105d2b4021ed91a7c0959944992dee7f`,
  evidence
  `sha256:4d469990dd17fefe0478e280c6d4c998a8a5e6058ac3089c4fa496cd7aff5e80`,
  report
  `sha256:e449db8b2a94ea03a16545206e491f78069555bee1bfe7c9b67619ac627cef07`.
  These prove repository construction only.
- Current image-acquisition replacement bindings: index `sha256:f37fd3adccb7b540aaa0ff180237d892b78c1e27f2c64d9686c3f0ff0577c8b3`, schema `sha256:7712430fed5f4feb6e8f53daf53b9aa11ba5046e2f625b2f865fed35880a6130`, evidence `sha256:202e96b8d30a5f4e9e4074415388ddf73c133ceb9101733d8d36db61dc353f88`, report `sha256:2750f690996e2c9e706af312e12832bc833406f0433651e1078522c70d58d156`.
- Current stop: `LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_V2_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

Planning lives in milestone [`R4 Progress & Vision Sharing — 2026-08-25`](https://github.com/formehq/forme/milestone/11), parent epic [#47](https://github.com/formehq/forme/issues/47), completed R1–R3 issues [#49](https://github.com/formehq/forme/issues/49), [#50](https://github.com/formehq/forme/issues/50), and [#51](https://github.com/formehq/forme/issues/51), and the R4 product sequence [#66](https://github.com/formehq/forme/issues/66)–[#70](https://github.com/formehq/forme/issues/70). [#71](https://github.com/formehq/forme/issues/71) is a bounded Setup/Doctor enabler, not a product gate.

The previous implementation remains available at [`archive/v0-prototype-2026-07-17`](https://github.com/formehq/forme/tree/archive/v0-prototype-2026-07-17) and tag [`v0-prototype-final-2026-07-17`](https://github.com/formehq/forme/tree/v0-prototype-final-2026-07-17). It is a reference and parts library, not the default architecture.

## Read order

1. [`docs/PRODUCT.md`](./docs/PRODUCT.md) — highest vision, MVP vision, and scope
2. [`docs/CONTROL.md`](./docs/CONTROL.md) — current state, owner gates, and definition of done
3. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — current #66–#71 sequence,
   dependency order, and scope-protection rules
4. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — confirmed decisions and latest state receipts
5. [`docs/NATIVE-HARNESS-ARCHITECTURE.md`](./docs/NATIVE-HARNESS-ARCHITECTURE.md)
   — the approved Harness/Forme carrier and authority-boundary contract
6. [`docs/AGENCY-TRUST.md`](./docs/AGENCY-TRUST.md) — the Owner-approved
   privacy-first P boundary and proposed delegation/application guidance
7. [`docs/R4-GATE-A-VERIFICATION.md`](./docs/R4-GATE-A-VERIFICATION.md) —
   exact repository evidence, five synthetic journeys, and honest later-gate
   conditions
8. [`docs/R4-TECHNICAL-OWNER-REVIEW.md`](./docs/R4-TECHNICAL-OWNER-REVIEW.md) —
   approved R4 mental model, technical cards, and walkthrough contracts
9. [`docs/README.md`](./docs/README.md) — complete map of frozen Gate B/Host
   history, including both Host Binding attempt envelopes
10. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — initial system boundaries, not a frozen implementation
11. [`Local PostgreSQL Wiring Construction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md),
    [`Physical Rebind Construction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md),
    [`APFS nlink Correction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md),
    [`Execution-Authority Topology Correction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md),
    [`Docker Diagnostic/Rescue Correction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md),
    [`Body-Free Docker Inspect Diagnostic Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md),
    [`Prepare-Failure Correction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-CONSTRUCTION-REPORT.md),
    and [`Integration Campaign Construction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-CONSTRUCTION-REPORT.md)
    — the Phase-1, rebind, repository corrections and current medium-grained campaign stop
12. [`successor Gate C Card`](./docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md)
    — the current non-approvable activation boundary

Repository work is tracked in GitHub. An issue is complete only after technical evidence and owner acceptance are both recorded.

## R1 Continuity — accepted 2026-07-18

R1 uses no model runtime and never writes project sources. It observes only an explicit allowlist, stores relative-path evidence metadata in project-local Git-ignored `.forme/` revisions, and renders a reconstructible Markdown view.

Requirements:

- Node.js 24 or newer
- npm
- Git

From a fresh checkout:

```sh
npm ci
npm run check

npm run forme -- init \
  --workspace . \
  --name "Forme" \
  --intent "Build and owner-accept the deterministic R1 Continuity slice for the Forme MVP." \
  --next "Run the restart-safe Forme repo demo and review the generated Restart View." \
  --include "README.md,AGENTS.md,package.json,package-lock.json,src,schemas,test,docs/PRODUCT.md,docs/CONTROL.md,docs/ROADMAP.md,docs/ARCHITECTURE.md,docs/DECISIONS.md"
```

After an allowlisted source change:

```sh
npm run forme -- observe --workspace .
npm run forme -- status --workspace .
```

The owner can update the project frame through the same observation command:

```sh
npm run forme -- observe --workspace . \
  --intent "Keep the current project intent owner-controlled." \
  --next "Review the reconstructed Restart View." \
  --unresolved "Should R2 add Codex?,Should R2 add OpenCode?"
```

Owner Frame options replace the supplied field; omitted fields keep their current values. Unknown or misplaced CLI options fail instead of being silently ignored.

The owner view is `.forme/restart.md`. Deleting that derived file and running `status` reconstructs it from the latest validated revision selected by `.forme/HEAD`.

## R2 Cognition — accepted 2026-07-18

R2 adds one bounded cross-time cognition loop without giving Codex canonical write authority. It requires an authenticated `codex` CLI. Historical source bodies exist only in the disposable Context Packet sent to OpenAI; the Twin persists evidence coordinates, labeled meaning, corrections, invalidations, and minimal receipts.

Preview the exact body-free manifest before any model call:

```sh
npm run forme -- packet --workspace . \
  --earlier 81a002744156128c1e370bf6b8a3526e72bddbf9 \
  --later 3cc2ac567d22b5b1c5bb1bfd7ed790d3ebd59052 \
  --path docs/DECISIONS.md \
  --earlier-lines 29:33 \
  --later-lines 59:63
```

Run the same packet through the isolated Codex adapter:

```sh
npm run forme -- reflect --workspace . \
  --earlier 81a002744156128c1e370bf6b8a3526e72bddbf9 \
  --later 3cc2ac567d22b5b1c5bb1bfd7ed790d3ebd59052 \
  --path docs/DECISIONS.md \
  --earlier-lines 29:33 \
  --later-lines 59:63
```

Copy the active `ref_...` ID from the generated view and replace its interpretation through the owner surface:

```sh
npm run forme -- correct --workspace . \
  --reflection ref_REPLACE_WITH_ACTIVE_ID \
  --text "The owner-authored corrected interpretation."
```

The real Forme demo admitted an evidence-backed Codex Reflection, then recorded the owner's narrower interpretation in Twin revision 19. The original inference became `superseded`, one dependent output was invalidated, the next Context Packet carried the correction, and restart reconstruction remained byte-identical.

## R3 Bounded Agency — accepted 2026-07-20

R3 adds a body-free Action Context Packet, a schema-only Codex proposer, additive V3 agency state, exact owner approval, and a Forme-only fixed-marker executor with journal recovery, idempotent retry, terminal receipts, and explicit rollback. The test suite and the real Forme revision 21–25 demo exercised proposal, approval, execution, idempotent retry, restart, and exact rollback. The additive `ActionIntentProposalV2` returns one recommendation first, one to three editable judgments, explicit confidence, and a low-confidence `ask_owner` fallback that cannot compile an effect. Existing V1 revisions remain reconstructible. Independent Career CASE-02 supplied the missing owner-experienced product evidence; it did not establish general recommendation accuracy. See [`docs/VALIDATION.md`](./docs/VALIDATION.md).

Preview the packet manifest without calling a model:

```sh
npm run forme -- action-packet --workspace . \
  --goal "Prepare one useful, owner-reviewable next move for the R3 walking slice."
```

After that Owner Frame is confirmed, the owner demo uses separate commands for each authority transition:

```sh
npm run forme -- action-propose --workspace . --goal "..."
npm run forme -- action-approve --workspace . --proposal act_... --effect-hash sha256:...
npm run forme -- action-execute --workspace . --approval apr_...
npm run forme -- action-rollback --workspace . --receipt eff_...
```

## R4 Controlled Presence — Building

The Owner approved the Hybrid Hero Encounter, curated Forme Third Place,
Manual and minimal Agent Guest paths, separate Owner publication and Curator
admission, layered identity, and the no-server-AI topology.

Start with
[`docs/NATIVE-HARNESS-ARCHITECTURE.md`](./docs/NATIVE-HARNESS-ARCHITECTURE.md),
then continue to
[`docs/R4-TECHNICAL-OWNER-REVIEW.md`](./docs/R4-TECHNICAL-OWNER-REVIEW.md).
The first document distinguishes the Native Harness Workbench, Forme Semantic
Spine, Fresh Native Response Session, and Managed Privacy Run. NH1 makes the Native Harness Workbench the
default local carrier, with Codex first for P0 and OpenCode a first-class
architectural compatibility target whose live path remains P1. NH2 separates
ordinary native work from typed,
Forme-authoritative transitions: ordinary results may be offered and admitted
as evidence through a separate contract, but are never auto-ingested. This
architecture approval grants no concrete runtime or tool authority. T1
establishes the public knock and true Private Room. T2 establishes the
API-first Web cockpit, independent per-Room 30-day non-renewing bindings, and
the fixed connector-held `room_operator.v1` bundle. On 2026-08-01 the Owner
selected Fresh Native Response Session (Option 2B) for R4 P0: one new,
non-resumed session per exact Interaction may dynamically read/search only a
sanitized, read-only snapshot of current eligible Forme files plus typed,
body/path-free current Twin orientation. The ordinary
Workbench cannot browse the Guest inbox; the fresh session has no writer,
Web/network tool, connector credential, cross-Room or publish authority; and
its draft still requires exact Owner approval. The old Managed Privacy
response recommendation remains an R2/R3 proof and P1/future sensitive lane;
P0 does not build a trust-tier selector. The Owner approved this exact T3
contract on 2026-08-03. On the same date, the Owner approved the recommended
T4 lifecycle contract: Owner publication and Curator admission remain
separate; never-admitted or unlisted public content remains direct-readable but
loses discovery and new public knocks; stale content is visibly bounded and
cannot receive new Interaction; revoke and retirement fail closed; and
public successors require new Curator admission, while no successor inherits a
Grant. The Owner then approved the full recommended T5 async, notification,
retention, deletion, and P0-cut contract, while preserving familiar
collaborator at 7 days / 3 Interactions and adding a fourth, explicitly
Owner-selected trusted collaborator preset at 7 days / 10 independent
Interactions. The label is never inferred and grants no identity, successor,
cross-Room, or automatic Private Room authority. These approvals were compiled
into Packet v0.2, independently audited, and approved at the exact hash below.
Gate A then implemented only its repository/synthetic boundary.

P0 needs only the minimum Codex integration required by the walking slice. It
does not require every CLI/API/MCP/Skill/Plugin adapter surface or a live
OpenCode path.
The confirmed deployment target is the existing Cloudflare → Caddy → Hetzner
→ PostgreSQL path.

The historical v0.1 Packet is superseded. The current
[`docs/R4-TECHNICAL-CONTROL-PACKET.md`](./docs/R4-TECHNICAL-CONTROL-PACKET.md)
is the reconciled, independently audited v0.2 approval object at
`sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`.
The Owner approved that exact hash on 2026-08-03. The resulting Gate A
implementation and evidence remain technically complete; see
[`docs/R4-GATE-A-VERIFICATION.md`](./docs/R4-GATE-A-VERIFICATION.md). The first
Gate B attempt remains Red/cleaned history, and both later Host Binding attempts
remain consumed Yellow history. Attempt 2 used frozen implementation `J`
`7ae4a24`, stopped before any Host inspector start, produced no capsule/public
receipt, and cleaned Green. It did not open Retry or Provider authority.

The active product path is #66–#70. #66 completed local Projection Owner
acceptance at review hash
`sha256:45414f18e70b0c5e7f3a2f6980b1596835952663dfea2d25d87605b8283d1480`
and PR #72 was integrated into the R4 branch. That exact phase-specific review
is intentionally not reusable as publication authority. #67 is offline
Technical Review Green on Draft PR #73 at `5e93196`; Draft PR #75 at `09401a0`
adds only the public-only production boundary foundation. The exact
[`Durable Public Core Construction Packet`](./docs/R4-PUBLIC-CORE-DURABLE-CONSTRUCTION-PACKET.md)
and its Owner Review were exactly approved on 2026-08-10; Addendum A was
approved on 2026-08-11. That durable-construction snapshot remains historical
Green at `bcd4259`. The current Local PostgreSQL Wiring successor is
repository-only Technical Review Green at `bc0b520`, with exact
[machine-backed evidence](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md)
and a non-approvable [successor Gate C Card](./docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md).
A precisely approved first physical prepare stopped before grant creation on
the invalid fixed APFS nlink contract. After the APFS and topology corrections,
a later approved v3 rehearsal and one cleanup rescue each consumed one grant
and failed closed on exact resource-absence proof. They created no Docker
resource and reached no PostgreSQL or SQL effect. Kf/Lf `bd3cdf7` / `7384ef8`
froze the repository-only body-free observation membrane. Its approved V1
prepare failed before grant creation; Kp/Lp `eaca190` / `7a31dba` now freeze
exact body-free stage classification and rollback. A replacement diagnostic
requires a new bounded integration review. Cleanup, Physical Execution and
Gate C remain later independent gates.
Host Setup/Doctor #71 belongs before the later Fresh local
Codex/provider slice, not before #67's product meaning review. Provider/model
calls, real Guest-data handling, external email, production schema migration,
deployment, spend, production action, secrets, and public traffic remain
unauthorized unless a later exact gate explicitly grants them. August 25 does
not waive any of these gates or trigger a further cut to #67–#70.

## Forme R3 managed action

Only Forme's fixed-marker executor may replace the body between these markers, and only after a separate owner approval bound to the exact effect-plan hash.

<!-- forme:r3-action:start -->
_No approved Forme action is currently applied._
<!-- forme:r3-action:end -->
