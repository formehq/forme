# Decision log

Keep this file short. Record only decisions that change product scope, constitutional boundaries, architecture, dates, or collaboration authority.

## 2026-07-17 — Preserve history and restart main

**Decision:** preserve the previous implementation in `archive/v0-prototype-2026-07-17` and tag `v0-prototype-final-2026-07-17`; create a new orphan `main`.

**Reason:** implementation speed exceeded shared owner understanding. A clean root makes every new assumption explicit while retaining the archive as evidence and a parts library.

## 2026-07-17 — Highest vision and MVP relationship

**Decision:** highest vision extends Continuity, Cognition, Agency, and Presence without taking authorship. The MVP is one Living Project Twin that demonstrates each dimension once in a connected story.

**Reason:** removing a dimension makes Forme resemble a familiar chatbot, summary, automation, or private copilot. Scope is controlled by reducing depth, not removing the four-part shape.

## 2026-07-17 — Demo dates

**Decision:** MVP complete and repeatable on 2026-08-11; Demo Day on 2026-08-12. Internal feature freeze begins 2026-08-09.

**Reason:** the previous August 15 plan is superseded. Reliability and rehearsal need protected time before the demo.

## 2026-07-17 — Core and optional scope

**Decision:** P0 is one project, one durable Twin, one Reflection and correction, one reversible action, one static projection, and one real Codex path. Exported notes, deeper OpenCode execution, automatic wake, HTML, and non-owner installation are P1. Mailbox, server agents, and Twin-to-Twin interaction are P2.

**Reason:** P0 preserves the complete product embryo while keeping every dimension narrow enough to finish.

## 2026-07-17 — Owner acceptance is part of Done

**Decision:** tests place a slice in Technical Review; only an owner-experienced demo can move a core issue to Done.

**Reason:** technical completion without shared product understanding caused the reboot.

## 2026-07-17 — Runtime position

**Decision:** Codex is the first live MVP path. OpenCode remains a first-class architectural target but does not require feature parity by Demo Day.

**Reason:** one real runtime is sufficient to prove the product; forced parity would consume the core schedule.

## 2026-07-17 — GitHub planning is gate-based

**Decision:** milestone #11 contains one parent epic, R0–R5 P0 gates, and separately labeled P1 options. Previous open issues are closed as `archive:v0`; they remain historical evidence.

**Reason:** one active P0 issue and explicit owner gates make progress legible and prevent optional work from silently entering the critical path.

## 2026-07-17 — R1 Continuity foundation

**Decision:** the Forme repo is the first real workspace. R1 observation and restart are fully deterministic, with the first live Codex path deferred to R2. R1 durable state is project-local and Git-ignored, and its first owner surface is generated Markdown that never owns canonical state.

**Reason:** Continuity must survive independently of model availability and runtime sessions; the Twin must remain independent of both its storage adapter and its presentation surface. The local, inspectable choices minimize privacy, infrastructure, and UI risk while the product semantics are still being proven.

## 2026-07-18 — R1 implementation contract

**Decision:** R1 uses one TypeScript / Node 24 npm package with Ajv-based persisted JSON Schema validation. It stores a validated workspace contract, immutable full revisions, atomic `HEAD`, reconstructible Markdown, and pending-transition recovery under `.forme/`. Observation is restricted to the explicit Forme repo allowlist. Archive reuse is limited to reviewed path-safety, hashing, no-op, recovery, privacy algorithms, and tests; the old schema and broader modules are not inherited.

**Reason:** this is the smallest implementation that makes Continuity deterministic, inspectable, restart-safe, and independent of both model runtimes and presentation surfaces while preserving a clear migration path for later storage and UI choices.

## 2026-07-18 — R1 owner acceptance

**Decision:** accept R1 Continuity after the real Forme workspace demonstrated bounded observation, owner-controlled Intent and Next Move, meaningful and no-op revisions, read-only source behavior, and byte-identical Restart View reconstruction after process loss. The Owner Demo first exposed a silently ignored CLI control input; R1 was accepted only after that gap was fixed and the complete flow was rerun.

**Reason:** the accepted result is a trustworthy continuity substrate, not a claim that Forme already understands or acts on the project. R2 must pass a new owner Control Packet before Codex visibility, cross-time content evidence, inferred semantic state, correction, or invalidation is introduced.

## 2026-07-18 — R2 cognition contract approved

**Decision:** implement R2 from two explicit reachable Git commits and one allowlisted text path; send only a deterministic packet to an isolated ephemeral `codex exec`; reject every model-generated tool event; admit only schema-valid, evidence-resolvable output as labeled inferred state in `TwinRevisionV2`; and make owner correction create a new revision that supersedes the interpretation and invalidates dependent output.

**Reason:** this is the smallest real cognition loop that can be more valuable than a summary while keeping historical visibility, runtime authority, semantic durability, and owner authorship explicit. Codex supplies mature model invocation; Forme retains evidence resolution, validation, admission, correction, recovery, and canonical state.

## 2026-07-18 — R2 resolves runtime capabilities before source transmission

**Decision:** select the highest-priority visible model from the authenticated Codex catalog, record its exact slug in the receipt, and fail before transmitting the Context Packet when the catalog or packet-only permission profile cannot be verified. Use the OpenAI-supported structured-output schema subset for transport and retain stronger uniqueness, evidence, staleness, and quality checks in Forme.

**Reason:** the first real run proved that a documented generic model name may not be callable through the owner's current ChatGPT authentication and that API structured-output constraints are narrower than local Ajv validation. Runtime capability must be measured in the actual environment, while canonical admission remains independent and stricter.

## 2026-07-18 — R2 owner acceptance

**Decision:** accept R2 Cognition after the real Forme workspace produced an evidence-backed cross-time Reflection, exposed its uncertainty and alternative explanation, and accepted the owner's narrower interpretation through the real correction surface. Twin revision 19 superseded the original Codex inference, invalidated its dependent output, carried the correction into the next Context Packet, and reconstructed the corrected state after restart.

**Reason:** R2 demonstrated a controlled cognition loop rather than a summary feature: Codex could propose bounded meaning, but Forme retained evidence validation, durable admission, staleness control, and owner authority to revise what the project currently means. The single R1 example supports keeping Owner Acceptance as a control path; it does not establish a general law from one case. R3 may now propose one reversible action only against the corrected revision and must pass a new owner stop gate before gaining write authority.
