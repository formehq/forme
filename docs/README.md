# Documentation map

The repository keeps a deliberately small decision surface.

Current execution truth (2026-08-15): R0–R3 and #66 are Owner-accepted. #67
has repository/offline Public Core and concrete Local PostgreSQL wiring, but
remains Building and is not on `main`. The one-use Integration Campaign V2 was
prepared and consumed, proved its historical Docker names absent, then failed
closed before PostgreSQL at `local_postgres_image_platform_manifest_invalid`.
Kmd `32abce2` / Lmd `b17a44f` now construct a separate body-free
image-manifest diagnostic that may later call only `version` and one exact
pinned `image inspect`. Construction made zero Docker/socket/daemon/image pull,
cleanup, PostgreSQL and SQL effects and did not read or mutate the failed root.
The diagnostic itself is not approved or executed, so the descriptor tuple is
still unobserved and no manifest pin is corrected. Production, real Guest data,
traffic and Gate C remain closed. No fresh remote/CI status is asserted here;
August 25 remains a Progress / Vision Sharing checkpoint, not a Done date.

Current image-manifest diagnostic bindings: index
`sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c`,
schema `sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440`,
evidence `sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011`,
report `sha256:490256a560bb3b910d38214c9190365ac64b087100cb3d17bd7ced353f631559`.
Current stop: `LOCAL_POSTGRES_IMAGE_MANIFEST_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / IMAGE_MANIFEST_DIAGNOSTIC_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.

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
