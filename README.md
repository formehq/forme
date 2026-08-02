# Forme

Forme explores a controllable digital counterpart that extends an entity across **Continuity, Cognition, Agency, and Presence** without taking away the owner's authorship.

The August 12 MVP is a **Living Project Twin** for one real project. It must remember where the project is, notice what it is becoming, act once within an explicit and reversible trust boundary, and produce one controlled collaborator projection.

## Current state

This repository is an owner-controlled rebuild started on 2026-07-17.

- MVP complete and repeatable: **2026-08-11**
- Demo Day: **2026-08-12**
- Current gate: **R4 — privacy-first/minimum-friction P human-boundary model,
  T1 public/private Room correction, and T2 Room control contract approved;
  NH1/NH2 approved; Fresh Native Response Session (Option 2B) selected as the
  R4 P0 direction; its exact T3 contract is the current unapproved Technical
  Owner Review gate, with T4/T5 and packet reconciliation still open**
- Product implementation: **R1–R3 owner-accepted; the R4 product target,
  public-knock/private-Grant correction, P boundary model, and T2 Room control
  contract are approved; NH1 option 1 and NH2 option 1 were Owner-approved on
  2026-07-29, but grant no concrete runtime, file, shell, tool, provider,
  credential, Guest, or Room authority; the 2026-08-01 Option 2B direction
  grants no capability; exact T3–T5 and the first technical
  packet still require Owner review and reconciliation to the confirmed
  self-host target; no R4 implementation or production action is authorized**

Planning lives in milestone [`MVP Rebuild — Demo 2026-08-12`](https://github.com/formehq/forme/milestone/11), parent epic [#47](https://github.com/formehq/forme/issues/47), completed R1–R3 issues [#49](https://github.com/formehq/forme/issues/49), [#50](https://github.com/formehq/forme/issues/50), and [#51](https://github.com/formehq/forme/issues/51), and active R4 issue [#52](https://github.com/formehq/forme/issues/52).

The previous implementation remains available at [`archive/v0-prototype-2026-07-17`](https://github.com/formehq/forme/tree/archive/v0-prototype-2026-07-17) and tag [`v0-prototype-final-2026-07-17`](https://github.com/formehq/forme/tree/v0-prototype-final-2026-07-17). It is a reference and parts library, not the default architecture.

## Read order

1. [`docs/PRODUCT.md`](./docs/PRODUCT.md) — highest vision, MVP vision, and scope
2. [`docs/CONTROL.md`](./docs/CONTROL.md) — current state, owner gates, and definition of done
3. [`docs/NATIVE-HARNESS-ARCHITECTURE.md`](./docs/NATIVE-HARNESS-ARCHITECTURE.md)
   — the approved Harness/Forme carrier and authority-boundary contract
4. [`docs/AGENCY-TRUST.md`](./docs/AGENCY-TRUST.md) — the Owner-approved
   privacy-first P boundary and proposed delegation/application guidance
5. [`docs/R4-TECHNICAL-OWNER-REVIEW.md`](./docs/R4-TECHNICAL-OWNER-REVIEW.md) —
   current R4 mental model, agency-formalization check, technical cards, and
   walkthroughs
6. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — dates, slices, and cut rules
7. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — initial system boundaries, not a frozen implementation
8. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — short decision record

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

## R4 Controlled Presence — Option 2B direction selected, exact T3 next

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
P0 does not build a trust-tier selector. The exact T3 contract is now the
current unapproved gate.

P0 needs only the minimum Codex integration required by the walking slice. It
does not require every CLI/API/MCP/Skill/Plugin adapter surface or a live
OpenCode path.
The confirmed deployment target is the existing Cloudflare → Caddy → Hetzner
→ PostgreSQL path.

The first
[`docs/R4-TECHNICAL-CONTROL-PACKET.md`](./docs/R4-TECHNICAL-CONTROL-PACKET.md)
is now an unreconciled implementation appendix, not an approvable exact object.
After exact T3–T5 close, agents will rewrite and re-audit it. No R4
repository implementation or production action is currently authorized.

## Forme R3 managed action

Only Forme's fixed-marker executor may replace the body between these markers, and only after a separate owner approval bound to the exact effect-plan hash.

<!-- forme:r3-action:start -->
_No approved Forme action is currently applied._
<!-- forme:r3-action:end -->
