# Documentation map

The repository keeps a deliberately small decision surface.

## Current execution truth — management reset, 2026-08-17

R4 is managed as one active Walking Slice (#67) plus at most one linked
Enabler. #67 remains `Building / At Risk`; the complete public encounter has
not reached Technical Review. The historical physical runner and V4 correction
chain are frozen. The next proposal is
[#77](https://github.com/formehq/forme/issues/77), a simplified disposable
PostgreSQL rehearsal with a two-day/two-lifecycle default budget after
separate approval. This reset makes no Docker, PostgreSQL, production or Gate
C effect.

Current stop: `R4_EXECUTION_MANAGEMENT_RESET_COMPLETE /
DISPOSABLE_POSTGRES_ENABLER_ENVELOPE_REQUIRED /
DOCKER_NOT_REQUESTED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

The operating rules are in
[`R4-EXECUTION-MANAGEMENT-RESET.md`](./R4-EXECUTION-MANAGEMENT-RESET.md).

## Integration Campaign V4 truth before the reset (historical)

R4 #67 remains Building and off `main`. Integration Campaign V4 consumed the
final lifecycle in the confirmed local envelope. Docker matched
`29.3.1 / linux/arm64`; the corrected historical container absence matched;
historical network inspection then returned a distinct unknown body-free
missing fingerprint and the runner stopped before PostgreSQL. Fresh resources
are proven absent and owned residue is zero. Terminal evidence is
`sha256:fb44fbd…1166b`; the
[V4 outcome report](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V4-OUTCOME.md)
is `sha256:820f9878…f67b`. Target PostgreSQL/catalog, production traffic and
Gate C remain unobserved/closed.

No lifecycle remains and no retry is authorized. A new Owner decision is
required before a network/volume fingerprint correction or another local run.

Current stop: `LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V4_FAILED_CLEAN /
LOCAL_LIFECYCLE_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

## Earlier execution snapshot (historical context)

Current execution truth (2026-08-16): R0–R3 and #66 are Owner-accepted. #67
has repository/offline Public Core and concrete Local PostgreSQL wiring, but
remains Building and is not on `main`. The one-use Integration Campaign V2 was
prepared and consumed, proved its historical Docker names absent, then failed
closed before PostgreSQL at `local_postgres_image_platform_manifest_invalid`.
A later one-use image-manifest diagnostic was consumed and stopped at
`IMAGE_MISSING`. The first image-acquisition diagnostic was then prepared and
consumed once; Docker `version` completed `NONZERO / exit 1`, so inspect and
pull remained zero. The Owner reports Docker Desktop was not running for that
attempt and is running now, but a replacement must re-observe the host rather
than trust that report as machine evidence. Kiar `3db3060` / Liar `3e1b0cb`
now construct the add-only V2 replacement authority path. Construction made
zero Docker/socket/daemon/registry/pull, cleanup, PostgreSQL and SQL effects.
The replacement diagnostic is not yet approved or executed, so image presence
is still unproved and no manifest pin is corrected.
Production, real Guest data, traffic and Gate C remain closed. No fresh
remote/CI status is asserted here; August 25 remains a Progress / Vision
Sharing checkpoint, not a Done date.

Current image-acquisition replacement bindings: index
`sha256:f37fd3adccb7b540aaa0ff180237d892b78c1e27f2c64d9686c3f0ff0577c8b3`,
schema `sha256:7712430fed5f4feb6e8f53daf53b9aa11ba5046e2f625b2f865fed35880a6130`,
evidence `sha256:202e96b8d30a5f4e9e4074415388ddf73c133ceb9101733d8d36db61dc353f88`,
report `sha256:2750f690996e2c9e706af312e12832bc833406f0433651e1078522c70d58d156`.
Current stop: `LOCAL_POSTGRES_IMAGE_ACQUISITION_REPLACEMENT_AUTHORITY_TECHNICAL_REVIEW_GREEN / IMAGE_ACQUISITION_V2_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

| Document | Question it answers |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | What is Forme, and what must the August 25 MVP demo prove? |
| [`CONTROL.md`](./CONTROL.md) | What is happening now, who decides, and when must work stop? |
| [`ROADMAP.md`](./ROADMAP.md) | What are the gates, deadlines, and feature cut rules? |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Which boundaries must survive implementation choices? |
| [`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md) | Owner-approved NH1/NH2 and exact R4 Fresh Native Response Session T3 contracts: Native Harness Workbench default, Codex-first/OpenCode architectural target, and the two-class native-work/Forme-authority boundary. |
| [`DECISIONS.md`](./DECISIONS.md) | Which important choices have been made, and why? |
| [`VALIDATION.md`](./VALIDATION.md) | What have real demos proved, what remains unproven, and what did owner feedback change? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md) | What did repository-only Physical Rebind Effect 0 construct, validate and leave closed? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md) | How was the invalid fixed APFS directory-link-count contract corrected without weakening root identity or granting execution? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md) | How were future execution authority paths made uniquely add-only while failed authority remained immutable history? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md) | How was the exact missing-container diagnostic corrected and a future cleanup-rescue membrane constructed without executing rescue? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md) | How was a one-use body-free inspect diagnostic constructed without authorizing or calling Docker? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-PREPARE-FAILURE-CORRECTION-CONSTRUCTION-REPORT.md) | How was the failed V1 prepare made stage-exact and body-free without granting a replacement diagnostic? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-CONSTRUCTION-REPORT.md) | How did one medium-grained repository campaign close diagnosis, exact-owned cleanup, absence gating and the frozen rehearsal contract without executing them? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-CONSTRUCTION-REPORT.md) | How were the inspect-missing parser and Gate-B concurrency validation corrected without authorizing a replacement campaign? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V2-TOPOLOGY-VERIFIER-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V2-TOPOLOGY-VERIFIER-CORRECTION-CONSTRUCTION-REPORT.md) | How was the full committed successor topology made executable for V2 Card/Review without authorizing physical execution? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CONSTRUCTION-REPORT.md) | How was the body-free image-manifest diagnostic constructed without authorizing its Docker call, pull, cleanup or PostgreSQL? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CONSTRUCTION-REPORT.md) | How was a separate one-use image-acquisition diagnostic constructed without calling Docker, pulling an image, cleaning resources or touching PostgreSQL? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-CONSTRUCTION-REPORT.md) | How was the failed V1 acquisition authority preserved and a fresh add-only V2 replacement path constructed without calling Docker or touching PostgreSQL? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-FINGERPRINT-CORRECTION-CONSTRUCTION-REPORT.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-FINGERPRINT-CORRECTION-CONSTRUCTION-REPORT.md) | How was the exact V3 body-free missing-object fingerprint admitted without exposing its body, widening effects or claiming PostgreSQL Green? |
| [`R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V4-OUTCOME.md`](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-V4-OUTCOME.md) | What did the final bounded V4 lifecycle prove, where did it stop, and why is a new Owner decision required before any retry? |
| [`AGENCY-TRUST.md`](./AGENCY-TRUST.md) | Owner-approved privacy-first P human-boundary model plus proposed cognitive/delegation application guidance. |
| [`STEWARDSHIP.md`](./STEWARDSHIP.md) | Proposed: how different workspace types maintain low entropy and long-running coherence. |
| [`R4-SOCIAL-PRESENCE.md`](./R4-SOCIAL-PRESENCE.md) | Owner-approved product foundation: the edge-intelligent Forme Room, Projection/Guest/Response Capsules, Signal Box, and no-server-AI topology. |
| [`R4-HERO-ENCOUNTER-DECISION-BRIEF.md`](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md) | Owner-approved product target: the Hybrid encounter, curated Forme Third Place, layered identity, and P0/P1 boundary. |
| [`R4-TECHNICAL-OWNER-REVIEW.md`](./R4-TECHNICAL-OWNER-REVIEW.md) | Owner review record for the now-closed P/T1/T2/T3/T4/T5/NH1/NH2 design decisions, including the four continuation presets and five walkthroughs. |
| [`R4-AGENCY-FIRST-RECALIBRATION.md`](./R4-AGENCY-FIRST-RECALIBRATION.md) | Short audit of the approved minimum-friction Room Operator, Native Harness, Fresh Response Session, public lifecycle, and full T5 boundaries. |
| [`R4-TECHNICAL-CONTROL-PACKET.md`](./R4-TECHNICAL-CONTROL-PACKET.md) | The Owner-approved Gate A boundary: reconciled and independently audited v0.2 compiled from P/T1/T2/T3/T4/T5/NH1/NH2; exact hash `e417836b…adfff5` was approved on 2026-08-03. The file stays byte-frozen while its approval receipt lives in `DECISIONS.md`. |
| [`R4-GATE-A-VERIFICATION.md`](./R4-GATE-A-VERIFICATION.md) | Gate A Technical Review evidence: 47 requirements, deterministic walkthrough, real-Twin body-free probe, browser acceptance, and honest Gate B/C limits. |
| [`R4-GATE-B-OWNER-REVIEW.md`](./R4-GATE-B-OWNER-REVIEW.md) | Historical low-load decision surface for the approved original Gate B Manifest; its First Provider-Call Test Grant remained unrequested. |
| [`R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`](./R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md) | Immutable approved original Gate B boundary; its first execution stopped Red and is recorded separately. |
| [`R4-GATE-B-EXECUTION-REPORT.md`](./R4-GATE-B-EXECUTION-REPORT.md) | Body-free record of the first Gate B attempt: Red read-scope stop, zero provider/thread/turn effects, cleanup proof, and unproven lanes. |
| [`R4-GATE-B-RETRY-OWNER-REVIEW.md`](./R4-GATE-B-RETRY-OWNER-REVIEW.md) | Immutable low-load review for the exact Owner-approved Retry Construction boundary; Retry Execution and provider calls remain closed. |
| [`R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md`](./R4-GATE-B-RETRY-CONSTRUCTION-PACKET.md) | Owner-approved, byte-frozen construction boundary: split runner construction from later execution, enforce serial/no-ad-hoc work, and preserve the controlling-Agent isolation limitation honestly. |
| [`R4-GATE-B-CORRECTION-SCOPE-DECISION-BRIEF.md`](./R4-GATE-B-CORRECTION-SCOPE-DECISION-BRIEF.md) | Owner-approved five-part correction: Demo-critical Core, separate Codex zero-call profile, transient candidate, disclosed procedural controller, and retained pinned public image cache. |
| [`R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md`](./R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-PACKET.md) | Immutable Owner-approved Core Construction boundary: repository-only Demo-critical Core with fake physical adapters; no Retry or Provider authority. |
| [`R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-OWNER-REVIEW.md`](./R4-GATE-B-CORE-CORRECTION-CONSTRUCTION-OWNER-REVIEW.md) | Immutable low-load review for the approved Core Construction grant. |
| [`R4-GATE-B-CORE-CONSTRUCTION-REPORT.md`](./R4-GATE-B-CORE-CONSTRUCTION-REPORT.md) | Published construction evidence: 381 Node and 19 Swift tests, zero physical effects, exact artifact hashes, and an honest Yellow result. |
| [`R4-GATE-B-CORE-EXECUTION-MANIFEST.md`](./R4-GATE-B-CORE-EXECUTION-MANIFEST.md) | Historical non-approvable Core-stage Yellow Manifest: records the constructed Core boundary and the then-open physical/host-binding gaps. |
| [`R4-GATE-B-CORE-EXECUTION-OWNER-REVIEW.md`](./R4-GATE-B-CORE-EXECUTION-OWNER-REVIEW.md) | Historical low-load review of that Core-stage Yellow return; it requested no execution, provider, deploy, merge, or spend grant. |
| [`R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-DECISION-BRIEF.md`](./R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-DECISION-BRIEF.md) | Owner-approved five-part direction: local-only host binding, one unified physical runner, corrected PostgreSQL race semantics, explicit Codex causal limit, and a transient macOS mechanism. Its approval authorized exact Packet preparation only. |
| [`R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-OWNER-REVIEW.md`](./R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-OWNER-REVIEW.md) | Immutable low-load review for the approved and consumed Physical Adapter Construction + one Host Binding grant; Retry/provider authority stayed closed. |
| [`R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-PACKET.md`](./R4-GATE-B-PHYSICAL-ADAPTER-HOST-BINDING-CONSTRUCTION-PACKET.md) | Immutable approved workset and authority for fake-tested physical adapters and exactly one post-checkpoint read-only Host Binding attempt. |
| [`R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md`](./R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md) | Historical attempt-1 result: final implementation `I` `92c6c3f` built/fake-validated; the first Host Binding attempt stopped Yellow before inspectors on a symlinked supplied path, then cleaned Green with zero physical effects and no capsule/public receipt. |
| [`R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md`](./R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md) | Historical post-attempt-1 non-approvable Physical Retry Manifest. No later attempt produced a valid Host Binding capsule, and Retry/provider grants remain `NOT_REQUESTED`. |
| [`R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md`](./R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md) | Low-load review of the Yellow/clean return; it requests no Retry, provider, deploy, merge, public-traffic, or spend authority. |
| [`R4-GATE-B-HOST-BINDING-REATTEMPT-PACKET.md`](./R4-GATE-B-HOST-BINDING-REATTEMPT-PACKET.md) | Immutable approved v0.2 preparation/activation envelope for implementation `J` and exactly one attempt ordinal 2; its embedded proposal status remains historical. |
| [`R4-GATE-B-HOST-BINDING-REATTEMPT-OWNER-REVIEW.md`](./R4-GATE-B-HOST-BINDING-REATTEMPT-OWNER-REVIEW.md) | Immutable low-load review for v0.2. The later approval, Activation Card, consumed Yellow attempt-2 result, and zero effects are recorded in `DECISIONS.md` and `CONTROL.md`, not by rewriting this frozen review. |
| [`reference/architecture-understanding-contract-v0.1.md`](./reference/architecture-understanding-contract-v0.1.md) | Reference only: owner-authored rebuild map retained for shared understanding and historical open questions. |
| [`reference/design-lineage.md`](./reference/design-lineage.md) | Reference only: how the early effects, cognitive-organ model, and harness exploration became the current Living Project Twin architecture. |
| [`research/agent-runtime-strategy-2026-07-15.md`](./research/agent-runtime-strategy-2026-07-15.md) | Research and durable boundary guidance: what Codex/OpenCode own, what Forme owns, and how adapters should deepen without forks or forced parity. |
| [`research/runtime-gate-baseline-2026-07-15.md`](./research/runtime-gate-baseline-2026-07-15.md) | Research only: the dated local Codex/OpenCode reachability probe and the capabilities it did not establish. |
| [`research/vault-entropy-investigation-2026-07-22.md`](./research/vault-entropy-investigation-2026-07-22.md) | Research only: evidence from the prior Knowledge Vault for Stewardship and long-running entropy design. |

Stable product and architecture contracts stay in their named documents.
`NATIVE-HARNESS-ARCHITECTURE.md` is authoritative for the Owner-approved
Harness / Forme carrier and two-class authority boundary. Its approval grants
no concrete runtime or capability envelope, and ordinary Workbench output is
never auto-ingested into Forme. Demo feedback and working judgments enter
`VALIDATION.md` first; only owner-confirmed changes move into `DECISIONS.md` or
alter the stable contracts.

The archive contains research and implementation evidence, but no new-main decision may depend on private notes, an old conversation, or unexplained archived code.
