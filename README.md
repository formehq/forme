# Forme

Forme explores a controllable digital counterpart that extends an entity across **Continuity, Cognition, Agency, and Presence** without taking away the owner's authorship.

The MVP is a **Living Project Twin** for one real project. It must remember where the project is, notice what it is becoming, act once within an explicit and reversible trust boundary, and produce one controlled collaborator projection. August 25 is a Progress / Vision Sharing checkpoint for this work, not the deadline that decides whether the MVP is complete.

## Current state

This repository is an owner-controlled rebuild started on 2026-07-17.

- Completion: **gate-driven; Technical Review plus Owner Experience Acceptance,
  with no date-based substitute**
- Progress / Vision Sharing: **2026-08-25 (Tuesday)** — share the truthful state
  reached by then; a complete or repeatable MVP is not required for the sharing
- Current gate: **R4 Controlled Presence is Building on the real product
  sequence, not on Host Binding.** R1–R3 are Owner-accepted and #66 completed
  one real-Twin, local-only Projection review. #67 has repository/offline
  Public Core and Local PostgreSQL wiring, including the concrete `pg`
  executor and 20-method store bridge. One precisely approved disposable
  local rehearsal was prepared and consumed. It observed matching Docker
  client/server `29.3.1` and `linux/arm64`, then stopped on the first exact
  container-absence diagnostic; the cleanup-only recovery also stopped
  `BLOCKED` because absence could not be proven. It created no container,
  network, volume, PostgreSQL process, database, SQL effect or application
  action. The consumed grant cannot be retried. The repository-only Docker
  diagnostic/rescue correction is now Technical Review Green at Kd
  `0fdf68c` and Ld `62d0c98`: it adds one exact accepted diagnostic and an
  inert, separately authorized cleanup-rescue membrane. Cleanup Rescue,
  another Physical Execution and Gate C remain `NOT_REQUESTED`. The next gate
  is a unique Blocked-Cleanup Rescue Card/Review proposal, not Docker
  execution. Vault, HTTPS transport, production pool/migration, runtime route,
  traffic and Gate C readiness remain false. #67 has not created or mutated a
  production Room, deployed, published, admitted a Projection, handled real
  Guest data or run a real public knock. R4 is not Owner-accepted or Done.
- Integration truth: **R4 is not on `main`.** `main` remains at `7c1f7bd`; the
  current inherited Draft stack is PR #65 at `cbadd8a`, PR #73 at `5e93196`
  and PR #75 at `09401a0`. Local PostgreSQL Wiring Stage A is `bc0b520`;
  APFS nlink correction Kc/Lc are `18e3a32` / `32448cb`; execution-authority
  topology correction Kt/Lt are `f7d3783` / `c699f9d`; Docker diagnostic
  rescue correction Kd/Ld are `0fdf68c` / `62d0c98`;
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
- Production gap: the current Public Core has repository/offline proof plus a
  failed disposable local Docker preflight, not a PostgreSQL rehearsal Green.
  One v3 grant was prepared and consumed. Docker version and exact-name inspect
  calls ran, but no Docker resource was created or mutated and no PostgreSQL,
  database or SQL effect ran. Cleanup remains conservatively `BLOCKED`; the
  old forensic root is retained unchanged. The current diagnostic/rescue
  correction is repository-only. No production
  PostgreSQL migration, Gate C deployment/provisioning, production
  Room mutation, public traffic, external email, Provider call, production
  secret, or spend has occurred.
- Docker diagnostic/rescue correction bindings: index
  `sha256:0dc154f786646243a13d500b0a41ae31cbcba42b15d1ed426503bf72d6ba2b4b`,
  schema
  `sha256:57a96cf603e393e1eb8849e2c6a3e7b10f9d143a3c249456936dd48a05d440be`,
  evidence
  `sha256:9a6296c94ab0d4dee89449b7873a6cf04fec3a8e89f64170bca5eda9043a4ee3`,
  report
  `sha256:ccae05f1b44caea794b7b55e4a5bbf9796482dc1ad4d2a7a84771f1ebf9ad19f`.
  These prove repository correction only.
- Current stop: `LOCAL_POSTGRES_DOCKER_DIAGNOSTIC_RESCUE_CORRECTION_TECHNICAL_REVIEW_GREEN / BLOCKED_CLEANUP_RESCUE_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

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
    and [`Docker Diagnostic/Rescue Correction Report`](./docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md)
    — the Phase-1, rebind and repository corrections, exact stop and inputs still required
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
a later approved v3 rehearsal prepared and consumed one grant, observed
matching Docker version/platform and stopped FAILED/BLOCKED on exact resource
absence proof. It created no Docker resource and reached no PostgreSQL or SQL
effect. The current repository-only diagnostic/rescue correction is Green at
Kd/Ld `0fdf68c` / `62d0c98`. A unique Rescue Card/Review and separate exact
approval must precede any cleanup rescue. Another Physical Execution and Gate C
follow only after genuine Rescue Green and their own gates.
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
