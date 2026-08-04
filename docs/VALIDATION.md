# Product validation and learning log

- Status: active MVP evidence register
- Updated: 2026-08-03
- Current verdict: **R3 is owner-accepted for the MVP; the privacy-first P
  human-boundary model, R4 T1 public/private Room behavior, T2 Room control
  contract, NH1/NH2, and the exact Fresh Native Response Session T3 contract
  and T4 public lifecycle contract plus full T5 are Owner-approved; four
  continuation presets are fixed—24h/1, 3d/2, familiar 7d/3, and explicitly
  Owner-selected trusted 7d/10. Technical Control Packet v0.2 reconciliation,
  independent audit, and hashing are complete at
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`;
  the Owner approved those exact bytes on 2026-08-03; Gate A repository-only
  implementation is authorized but all R4 behavior remains unimplemented**

This document records what real use has taught us. It is deliberately separate from:

- [`PRODUCT.md`](./PRODUCT.md), which states the product claim and scope;
- [`ARCHITECTURE.md`](./ARCHITECTURE.md), which states durable system boundaries;
- [`NATIVE-HARNESS-ARCHITECTURE.md`](./NATIVE-HARNESS-ARCHITECTURE.md), which
  states the approved Harness/Forme role and two-class authority contract;
- [`CONTROL.md`](./CONTROL.md), which states the current gate and next decision;
- [`DECISIONS.md`](./DECISIONS.md), which records owner-confirmed decisions only.

Feedback, observations, and working judgments enter here first. They move into Product, Architecture, Roadmap, or Decisions only after they change an owner-confirmed contract.

## Current product truth

Three claims must not be collapsed into one:

| Claim | Current evidence | Status |
|---|---|---|
| Forme can constrain one LLM proposal and execute one exact owner-approved effect safely | 41 deterministic checks plus the real revision 21–25 proposal, approval, execute, retry, restart, and rollback path | **Demonstrated within the fixed R3 slice** |
| The R3 proposal was accurate and useful enough to improve an owner decision | CASE-01 missed; in independent CASE-02 the owner found all outputs useful, least preferred the no-correction baseline, and could not meaningfully separate Forme B from the rich manual-correction baseline | **Positive independent evidence; general accuracy still unproven** |
| A Living Project Twin creates differentiated value beyond a mature harness plus LLM | CASE-02 B automatically carried correction with zero historical source bytes and no manual reconstruction while matching the useful corrected direction at current owner resolution | **Mechanically and directionally supported in one independent case** |

Passing the first row did not imply either of the other two. R3 became Done only after the owner explicitly accepted CASE-02's independent positive evidence as sufficient for the MVP. This acceptance remains bounded: it does not establish general recommendation accuracy or a final Career policy.

## Evidence — real R3 owner demo

The bounded path ran against the Forme repo and its durable local Twin:

| Revision | Event | Durable evidence |
|---|---|---|
| 21 | Owner established a fresh R3 frame | Active intent, next move, and two unresolved owner questions became the proposal base |
| 22 | Real Codex proposal admitted | `act_107c8748243c6ef3981e245ca7b0da3a`; `codex-cli 0.144.3`; model `gpt-5.6-sol`; zero tool events; no project source body sent |
| 23 | Owner approved one exact plan | Effect-plan `sha256:1da7ea5bc840ef07ac0a324ca2fa19c5c5ef263fa20a17fa2553189051281bce`; execution before this approval was rejected |
| 24 | Forme executed the fixed README effect | Receipt `eff_7a5ff5588d87b626eb0f8435c601c4c9`; retry was a no-op and restart reconstructed the same executed state |
| 25 | Owner explicitly rolled the effect back | Receipt `eff_4e73ebd064cf44233685ca34a087b107`; the exact original full-file hash was restored and rollback retry was a no-op |

This proves the bounded mechanism exercised in the demo. It does not prove that the proposed Next Move Brief was the right action, that suggestions will remain accurate across different projects, or that the control overhead is justified by recurring value.

## Feedback round 1 — meaning, use-feel, and accuracy

### Owner feedback

After completing the R3 demo, the owner could not responsibly accept or reject the Codex suggestion as a product result:

1. Forme has not yet produced enough use-feel or enough varied cases to make its meaning tangible.
2. The single Codex suggestion looked potentially useful, but one case gave no reliable basis for estimating accuracy.

### Interpretation

This is not a failed executor demo. It reveals a validation mismatch: the demo strongly exercised the control rails but weakly exercised the reason for having those rails.

The approved R3 proposal was also self-referential: it recommended using the R3 Owner Demo as the R3 acceptance gate. That was suitable for testing proposal-to-effect mechanics, but it was a poor case for discovering whether Forme can make a surprising, project-relevant, high-confidence contribution.

### Consequences for acceptance

- Keep the technical evidence; do not rerun the same happy path merely to produce more activity.
- Do not mark R3 Done on safety evidence alone because its exit condition includes owner-experienced usefulness.
- Do not generalize suggestion accuracy from one proposal.
- Evaluate future proposals against a task where the owner already has enough context to judge relevance and where the Twin has meaningful cross-time evidence to use.
- Treat suggestion quality and control-legibility as separate measures. A safe but unhelpful action and a helpful but uncontrollable action both fail Forme's product claim.

## Feedback round 2 — Harness capability versus Forme mechanism

### Direct answer

A mature Harness plus LLM can already reproduce the **visible sequence** of the R3 demo: inspect context, propose a change, ask permission, edit a file, and undo or revert it. Codex exposes non-interactive execution, structured output, sandbox and approval controls; OpenCode exposes Plan/Build modes, permissions, sessions, undo/revert, plugins, and a server API. See the official [Codex CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [Codex approval and security model](https://learn.chatgpt.com/docs/agent-approvals-security), [OpenCode permissions](https://opencode.ai/docs/permissions/), [OpenCode plugins](https://opencode.ai/docs/plugins/), and [OpenCode server API](https://opencode.ai/docs/server/).

The visible sequence is therefore not Forme's differentiation. The distinction is the durable, runtime-independent product contract beneath that sequence.

### Implementation classification

| Current implementation | Classification | Long-term owner |
|---|---|---|
| Launch `codex exec`, isolate `CODEX_HOME`, select a visible model, transport a JSON Schema, parse JSONL, and summarize runtime events | Harness integration glue; partly duplicates mature runtime capability | Codex/OpenCode adapter, using their most stable native API where possible |
| Context and action packet schemas | Mixed: structured transport is generic; the admissible Twin meaning, correction, evidence, and action semantics are Forme-specific | Forme defines semantics; adapter translates transport |
| Immutable Living Project Twin revisions and runtime-independent canonical state | Forme product mechanism | Forme |
| Confirmed/inferred/corrected meaning and correction-driven invalidation | Forme product mechanism | Forme |
| Approval bound to one exact proposal, effect-plan hash, current Twin chain, and one execution | Forme authorization contract, not equivalent to a generic tool permission prompt | Forme |
| Model proposes intent while Forme alone compiles and executes the effect | Forme trust boundary | Forme |
| Atomic writes, hashes, journals, idempotency, and recovery | Standard engineering techniques; not unique inventions | Forme owns the product-level composition and durable receipts; reusable infrastructure may implement it |
| Hash-guarded rollback represented as a new Twin revision | Forme project-state contract; different from session-history undo | Forme |
| CLI and generated Markdown surfaces | Temporary MVP surfaces, not differentiation | Replace as product learning requires |

### The approval distinction

A Harness permission prompt usually asks:

> May this runtime perform this tool call or command now?

The R3 Forme approval asks:

> Does the owner authorize this exact semantic effect, against this exact canonical project state, once?

OpenCode's `allow` / `ask` / `deny` model and Codex's sandbox/approval controls are valuable lower-level controls. They do not by themselves establish a Living Project Twin, bind approval to Forme's semantic revision chain, or make execution and rollback durable product facts.

Likewise, a Harness session is operational working state. The Twin is intended to outlive the session, the model, and eventually the chosen Harness. Implementing Forme inside a Codex or OpenCode plugin would change where the code runs, not who owns these semantics.

### Honest wheel-reinvention judgment

The current R2/R3 adapter contains a bounded amount of wheel reinvention. It was acceptable as an MVP proof because it let Forme enforce a packet-only, zero-tool boundary and measure the real runtime. It should now be treated as a replaceable adapter—not as the start of a home-grown general Harness.

The unique claim is also not that Forme invented hashing, journals, schemas, approvals, or rollback. Its defensible mechanism is their composition around durable project meaning, owner correction, exact semantic authorization, and controlled projection.

The resulting boundary should remain:

```text
Forme product and control plane
  Living Project Twin
  meaning, evidence, correction, invalidation
  context admission
  exact owner authorization
  effect plan, durable receipt, recovery, rollback
  projection policy
                │
        Harness Runtime Adapter
           ┌────┴────┐
        Codex      OpenCode
```

Codex and OpenCode should increasingly own model invocation, provider authentication, sessions, streaming, tool loops, sandboxing, MCP, compaction, cancellation, and runtime events. Forme should not build generic equivalents unless a measured product requirement cannot be expressed through either runtime.

## Combined judgment

The work so far is neither “a new Harness” nor already a proven differentiated product:

- We built a small amount of temporary Harness glue that should shrink over time.
- We implemented real Forme-specific control semantics around the Living Project Twin.
- We demonstrated those semantics mechanically in one narrow action.
- We have not yet demonstrated that a sufficiently rich Twin improves suggestion quality, continuity, or owner judgment enough to justify the additional control system.

The largest near-term product risk is not unsafe execution. It is that Forme becomes **“Codex with an extra approval ledger”** because the Twin remains too thin to create an experience a mature Harness cannot provide on its own.

## Evidence round 3 — R3-V Case 01 prepared

- Date: 2026-07-19
- Status: first B-arm Reflection corrected; approved A0/A1/B next-move comparison completed; blind owner judgment pending
- Lab: `/Users/zaynw/Documents/Projects/forme-r3v-knowledge-lab`
- External calls: one exact-hash-approved Forme Reflection; A0/A1 not run

### Case

The first real comparison uses one Obsidian knowledge note, `CCS MVP Spec.md`, at two committed source time points. The note preserves a useful tension: the CCS product requirements remain a baseline while its original schedule, implementation path, and parts of its authorization model were later superseded by the harness-first Forme pivot.

The source vault remains unchanged. The lab contains only derived committed blobs with stable categorical redactions for the owner name, one candidate user, one external contact/message attribution, an owner-named interface, and travel-phase wording. The manifest retains the original source commits and blobs without storing the redacted source identities.

Career, People notes, diary and relationship material, raw transcripts, attachments, runtime cards, and `decisions.jsonl` remain excluded.

### Comparison contract

The same frozen task will be evaluated through three arms:

- **A0 — Fresh Harness:** two approved note versions, no prior correction or Forme state;
- **A1 — Fresh Harness plus manual correction:** the same material plus the exact owner correction manually reconstructed;
- **B — Forme Twin:** the same evidence, with admitted Reflection, owner correction, and later R3 proposal carried by the Twin.

If B beats A0 but matches A1, the evidence supports continuity/context portability rather than model superiority. If B beats A1, the Twin's semantic contract may improve judgment beyond manual replay. Similar or worse B results weaken the current Forme value claim.

### Installation evidence

The experiment exposed and closed a portability gap before touching model behavior:

- Forme previously had no installable CLI and its default package would include development files and an untracked architecture draft;
- the package now exposes a `forme` binary and an explicit runtime file allowlist;
- `npm pack --dry-run` contains 24 runtime files instead of 46 mixed development files;
- the lab installed `forme@0.1.0` through a local package dependency and successfully ran the installed CLI;
- all 41 Forme checks still pass.

This is packaging and adapter hygiene, not new Harness capability.

### Approved visibility call and result

The owner approved the exact packet hash below for one Forme B-arm Reflection call:

| Field | Value |
|---|---|
| Packet | `ctx_368c0372390b81d329faa012d4897a55` |
| Packet hash | `sha256:69bc286badd7733fcc214bf85f1e40a20106790738598b786ddd2ca7b2be62fd` |
| Base Twin revision | 2 |
| Earlier lab commit | `2a28b9958d8e5b9559593cba212f11604de0ee9b` |
| Later lab commit | `2df5f5109ecadfb75f22e7c895367df876273ab6` |
| Path | `knowledge/ccs/CCS MVP Spec.md` |
| Source bytes | 11,965 earlier + 24,265 later = **36,230 bytes** |
| Evidence | earlier lines `102:119`; later line `29:29` |
| Active corrections at call time | 0 |

The call transmitted both complete redacted note versions, the frozen task, current owner frame, evidence coordinates, and constraints to OpenAI through the owner's authenticated Codex CLI. It did not expose the source vault, any other note, the Forme repo, `.forme`, Career/People material, tools, MCP, web search, shell, or a writer.

The accepted proposal created lab Twin revision 3:

- Reflection: `ref_10a7b1b2894516e6602ff24dd1b2a5ac`;
- runtime receipt: `run_888539343f803e4eafe5d866decd090d`;
- runtime: `codex-cli 0.144.3`, model `gpt-5.6-sol`;
- audit: four runtime events, reported item type `agent_message`, zero tool events, completed turn;
- persistence: source bodies absent from the Twin, source hashes unchanged, byte-identical restart reconstruction, repeated observation no-op at revision 3.

The Reflection says the stable product baseline survived while the original six-week schedule and early card-first authorization assumptions became non-authoritative. It correctly labels medium uncertainty: the schedule pivot is directly supported, while the authorization inversion is visible in the document body but weakly bound to the selected later evidence line.

This was not yet a positive product result. The owner next replayed the inputs and processing path, judged that the authorization conclusion overreached, and admitted a narrower correction. A0, A1, the later correction-aware B proposal, and any R3 action effect remain unrun.

## Feedback round 4 — Owner replay and judgment maturation

### Owner feedback

The owner repeatedly needs a plain-language replay to stay synchronized with the system, and the first R3-V review made the underlying pattern explicit:

1. The owner no longer remembered the complete context or decision history behind the selected historical note, so a precise correction could not responsibly be produced from memory alone.
2. Replaying the exact inputs, model task, conclusion path, and current project state materially improved the owner's ability to judge the Reflection.
3. The clause-level review questions were useful, but too detailed to expect the owner to answer completely and accurately at every review moment.
4. Some product or authorization drift becomes legible only after several outputs accumulate. The owner may first register that “something feels off” and only later identify the exact mistaken assumption—as happened with the earlier card-first strategy.

### Product interpretation

Owner judgment is not a deterministic validator that can be invoked once at proposal time. It is partial, attention-bounded, confidence-varying, and sometimes retrospective. A correction therefore needs to be treated as a **maturing judgment**, not only as one final replacement string.

This strengthens, rather than weakens, the need for owner authority. The system should make imperfect human review safe:

- an unconfirmed model interpretation remains visibly inferred and receives correspondingly limited downstream authority;
- “I cannot judge yet” and “something is off” are valid states, not review failures;
- the owner can accept one clause, contest another, or defer the rest without reconstructing a complete alternative interpretation;
- deferred meaning resurfaces when new evidence conflicts, when the same pattern repeats, or before a consequential action depends on it;
- later correction supersedes prior meaning and invalidates dependent output without pretending the earlier review never happened;
- autonomy may grow only while legibility grows with it. Review burden cannot be the hidden price of agency.

The working product law is:

> **Human correction is sparse, progressive, and sometimes delayed. Forme must preserve enough evidence and consequence history for the owner to notice, revisit, and safely repair meaning after the first review moment.**

### Missing Owner Replay surface

The current generated Reflection exposes the answer but does not yet supply a sufficient decision surface. Before asking for a precise correction, Forme should be able to show, in progressively disclosed layers:

1. **What entered:** exact source paths, versions, scope, exclusions, and whether the model saw full bodies or selected excerpts.
2. **What was asked:** the frozen task, Owner Frame, constraints, and active prior corrections.
3. **Who concluded what:** separate Codex's semantic judgment from Forme's deterministic checks and durable admission.
4. **Why each clause exists:** direct evidence, inferred support, uncertainty, alternative interpretation, and any evidence-binding gap.
5. **What the owner can say now:** confirm, reject, narrow, mark “feels off,” or defer—not only author a complete replacement.
6. **What changes next:** correction preview, superseded meaning, invalidated outputs, and the future packets or actions that will receive the revised meaning.

This is not explanatory polish around the product. It is part of the control surface required by the constitutional Legibility rule. A concise spoken-style summary should be the first layer; exact provenance and clause-level evidence should remain available on demand.

### R3-V Case 01 — working correction, checked against current state

The frozen historical comparison and the current Forme contract must remain separate.

**What the two R3-V source versions support:**

- The original W1–W6 schedule is explicitly superseded by the 07-14 harness-first pivot.
- At that historical moment, the later note explicitly retained the three cards, two laws, substrate tiers, and hard constraints as its requirements baseline.
- The later full document explicitly records an intended authorization trajectory: autonomy where taste is known; cards at uncertain moments; confidence, reversibility, blast radius, and an owner trust dial bound the autonomy radius.
- That authorization text is an owner direction and end-state arc. It does not prove that implementation or active authority had already switched to that model.

**What the 2026-07-19 Forme repo adds:**

- The rebuild's current authority is `docs/PRODUCT.md`, `docs/DECISIONS.md`, and the approved R1–R3 contracts—not the old CCS spec by itself.
- Current P0 is organized around Continuity, Cognition, Bounded Agency, and Controlled Presence. The original three-card product is therefore historical requirements input, not the complete current MVP contract.
- The current R3 authority remains deliberately conservative: one exact owner-approved, deterministic, reversible effect. Trust Dial or confidence-based autonomous execution has not been approved or implemented for this MVP.
- The highest vision still points toward agency through earned trust, and current owner feedback weakens “a card for every action” as an end-state. That supports the Trust Dial idea as a live direction, not as current canonical policy.

Owner-approved correction admitted at lab Twin revision 4:

> For the frozen July source pair, the six-week schedule was explicitly superseded, while the later note declared its product requirements retained at that moment. The note also introduced a proposed authorization trajectory in which cards surface uncertainty and autonomy is bounded by measured confidence, reversibility, blast radius, and an owner trust dial. Treat that as an intended direction, not evidence that the active implementation or all earlier authorization rules had already been replaced. For the current Forme MVP, the rebuilt repo contracts supersede this note as authority: the old three-card scope is design history, and R3 still requires exact owner approval for its one bounded effect.

This correction narrows the Codex Reflection in two places: **“product baseline survived” is time-scoped to the 07-14 pivot**, and **“authorization assumptions became non-authoritative” becomes a proposed trajectory rather than a completed policy transition**.

### Correction and carry-forward evidence

The correction used no model call and changed no source:

- lab Twin revision `4`;
- correction `cor_36d134100d7220b60829809aeedc56f9`;
- active owner-authored Reflection `ref_8024aa6d057325cbef9765f3c64f9c28`;
- original Codex Reflection `ref_10a7b1b2894516e6602ff24dd1b2a5ac` marked `superseded`;
- invalidation `inv_a94b3c8170880d5b85e661ed95a33b56` for one dependent derived output;
- restart/status reconstruction selected the same validated revision 4, and the lab Git worktree remained unchanged.

The next R2 packet preview used base revision 4, the same two Git blobs and evidence coordinates, and reported one active correction. After the lab documentation delta and owner-confirmed next move were observed into Twin revision 5, the current R3 Action Context preview automatically selected the corrected Reflection and correction ID while transmitting zero source bytes:

- Action Context `acx_3f7a0e3139853d1f4494ae6d6bb961b3`;
- hash `sha256:dd073ca0eea72ee0b7d25d83e2debee3b0494c9884b1639502cd38b879f2c764`;
- proposed common goal: against the same concise current-MVP decision frame, select one bounded, owner-reviewable next move for deciding which historical CCS ideas should inform the current MVP without treating the old spec as current authority.

The lab now freezes the pending A0/A1/B product-system comparison in `evaluation/COMPARISON-GATE-02.json`, hash `sha256:563d3270dfed14d0503210ec0f8d16384c135c5b9d6f3885e37d11fd3fbdaf6a`. All arms receive the same current-MVP decision frame and action goal. A0 receives both approved historical bodies and no correction; A1 receives the same bodies plus the exact correction manually; B receives its body-free Action Context with the correction carried automatically. Output quality and manual context-reconstruction cost will be scored separately. Because the owner has already seen the original B Reflection and B intentionally receives a reduced Twin context rather than the complete bodies, this is not a clean model benchmark; it tests the whole continuity and control system.

### Approved comparison calls completed — owner judgment blinded

The owner approved the exact comparison gate hash above. One call per arm then completed under `codex-cli 0.144.3` and `gpt-5.6-sol`:

- every run returned the same six semantic fields through a constrained schema;
- every audit completed with four runtime events, only an `agent_message`, and zero tool events;
- A0 and A1 each received only the two approved complete historical bodies plus the frozen common frame and their declared correction condition;
- B received the approved body-free Action Context, automatically selected the active correction, and transmitted zero historical source bytes;
- B admitted one proposal at lab Twin revision 6; it remains `proposed`, with no owner approval, source effect, or effect receipt;
- the original vault and the lab's five allowlisted source files remained unchanged by the three calls.

The three semantic outputs are reordered and unlabeled in `evaluation/OWNER-SCORE-PACKET-02.md`. The owner may give only a directional reaction—most useful, least useful, or “feels off”—before attempting numeric scores. Arm mapping, token usage, and context-reconstruction cost are recorded separately and should be revealed only after the owner's first product judgment.

### Owner blind judgment and arm reveal

The owner accepted the common direction: old CCS ideas should be selectively judged rather than imported as current authority. The preference order was:

1. **T / A0 — preferred:** Fresh Harness with both full historical bodies and no correction. It supplied a concrete recommended inheritance boundary.
2. **M / A1 — useful secondary:** Fresh Harness with the full bodies and the exact correction manually reconstructed. It exposed three independent hypotheses but left their disposition to the owner.
3. **Q / B — least preferred:** Forme Twin with automatic correction carry-forward and zero historical source bytes. It proposed a broader classification exercise and returned the most judgment work to the owner.

The owner preferred T only conditionally: a recommendation-first agent is valuable if it is mature and accurate. T itself remained hard to understand until the outputs were translated into a lower-cost Chinese comparison layer. Once the owner saw the common direction, actual difference, and expected owner work, the judgment became immediate.

This yields a more precise product requirement:

> Forme should absorb analysis complexity, give one plain-language recommended answer first, expose a small editable decomposition on demand, and ask the owner to supply missing judgment only when low confidence is explicit. Progressive explanation is part of the control surface, not presentation polish.

T and M are complementary rather than exclusive: T is the default recommendation layer; M is the clause-level correction layer beneath it. Q is a legitimate fallback only when the agent names what prevents a responsible recommendation. The required owner review should rise with uncertainty, irreversibility, blast radius, externality, and novelty—not with the amount of analysis the agent performed.

The mapping does not prove that A0 was more accurate. Plausible explanations include:

- A0 retained both full source bodies while B received a semantically compressed Twin context;
- the correction correctly discouraged overclaiming but also pushed A1 and B toward excessive caution;
- prompt framing or ordinary single-run model variance produced the style difference;
- the current Action Context lacks enough durable evidence detail for a bold but grounded recommendation.

The B proposal was never approved or executed. An owner-frame observation advanced the lab Twin to revision 7 and invalidated proposal `act_6bec5284c7350af8afaac3585a345c1f`; approvals and effect receipts remain zero. The negative preference result is preserved rather than repaired after the fact.

### Consequence for the next gate

Do not broaden action authority or move directly into R4. First propose an additive Owner Decision Brief contract:

- recommendation-first by default;
- one to three editable judgment items;
- explicit confidence and a named low-confidence blocking question;
- progressive explanation from 30-second summary to evidence and consequences;
- no change to Context visibility, tools, approval, executor, receipt, or rollback boundaries.

### 2026-07-20 superseding implementation status

The owner approved all five Owner Decision Brief recommendations. `ActionIntentProposalV2` is now implemented additively: V1 remains reconstructible; `recommend` can compile only the existing fixed README effect; low-confidence `ask_owner` persists one blocking question with no effect plan and cannot be approved; and the Restart View progressively exposes the compact answer, editable judgments, then evidence and consequences. TypeScript checking and all 44 tests pass.

This is implementation evidence, not new product-value evidence. No model was called and no new Career note was read or transmitted while implementing the contract. The next gate remains one fresh, non-self-referential R3-V2 case under a separately owner-approved visibility manifest, scored for substantive judgment and owner comprehension cost.

### Evidence round 4 — CASE-02 metadata-only visibility selection prepared

Without opening or content-searching any Career note body, the lab selected one tracked path using file names, byte sizes, and Git metadata only: `03_Outputs/Reports/Career & Opportunity State Diff (Live).md`. The proposed earlier snapshot is commit `2f8b0860f6d6dc5ac87d81ffd269f0e000d8803b`, blob `cd871e1e869822ad6b70849480bd2e41ba695048`, 4,555 bytes; the later snapshot is commit `6ac71bae893ead735477b5789881413dde46f966`, blob `9a4bf94e5c6014ba56cf30e6abe59642a87cce79`, 11,611 bytes. The earlier commit is an ancestor of the later commit and the selected working path is unmodified.

The exact first-gate manifest is `sha256:0db3f411ba9ffe9b24cba791d6e402cf55a196e8b5f4edbfaff0576114738920`. It requests permission only to extract those two Git blobs into the private local lab, apply one stable categorical redaction map, record counts and redacted hashes, and commit the derived artifacts locally. It does not authorize a model call. Every other vault path, uncommitted material, attachment, embed, private-message body, external link, Forme state, effect, network action, or source-vault mutation remains excluded. A second exact transmission gate is mandatory after redaction.

The owner approved that local-extraction gate. The earlier snapshot is now 4,607 redacted bytes (`sha256:e74f3297ff79b76e2dc22a2e4806b44b73987872162d67ed1e6a8fe925afc8f2`) at lab commit `1bb63328836a212a71866047e87b16841427cd61`; the later is 12,108 bytes (`sha256:2cadad4b840bcdcd3b6c651b520fe265d6dc250db0f352d3ece4cc14588e3e07`) at commit `794a77bfb0d660e79f7b618ccf40b836ae51037d`. The stable map performed 139 replacement operations across owner/person, organization, project, platform, contact, role-ID, university/tool, and internal-label categories. Dates, ordering, role shapes, opportunity stages, country-level geography, metrics, and owner decisions were preserved. This remains pseudonymization: someone already familiar with the history might infer identities from the combination of facts.

The CASE-01 Twin's immutable source contract does not include Career. Rewriting it would make stored workspace-contract hashes false and contaminate the independent case with CASE-01 state. The next proposed gate therefore creates a fresh no-remote local Career workspace, initializes a new Twin with only `README.md` and the redacted Career path, and constructs a body-free R2 packet. Exact setup manifest: `sha256:4526ffd973be31210dd30b31a25c72fd1238e42cd71e5c0c581c5eb8a2818871`. It authorizes no model call; the generated packet must return for a separate transmission approval.

The owner approved the setup manifest. The new workspace `/Users/zaynw/Documents/Projects/forme-r3v2-career-lab` has no Git remote, deterministic workspace ID `wsp_08690e7119a4c25d7180434e9f5e4468`, Twin revision 1, and an allowlist containing only `README.md` plus the redacted Career state-diff. Repeated local packet construction is stable at `sha256:007835b6a5c07688467544b06312d16358e616f338cd1f60fd4761868ae71041` and 16,715 transmitted source bytes. No model call occurred during setup.

Visibility gate `sha256:4e3007d5a3d5006ffb54612006b1fbd0bd0486cf50589d84f18753fc9d2bf116` authorized exactly one `gpt-5.6-sol` Forme R2 Reflection call. It exposed only the two complete redacted snapshots, revision-1 Owner Frame, frozen task, and evidence anchors in a disposable packet-only root; it granted no baseline, R3-V2 proposal, correction, effect, retry after state change, or external-action authority.

The approved call completed once with zero tool events. Proposal `sha256:a59023ff073bdd36fbc728d1dfb71066c4cff7c7c334227ed6b12b62150b798a` entered the Twin as inferred Reflection `ref_9c1ec2985372ed4f62906ff1c6e6b715`, advancing the isolated Career Twin from revision 1 to 2. Its durable claim treated `ship → signal → opportunity` as the general mechanism and two ready-to-submit items as a temporary closure backlog, while assigning medium uncertainty and naming referrals, active search, tailored materials, and relaxed geography as an alternative explanation. The owner-facing audit found that the evidence supports a combined signal-generation and opportunity-conversion mechanism but does not establish which factor was primary, and that repeated closure backlog may be a persistent pipeline bottleneck rather than disposable noise.

The owner approved that correction. Without a model call, revision 3 preserved the original Reflection as `superseded`, admitted owner-authored Reflection `ref_711fd70d727e4ecf74f19005590eda09`, recorded correction `cor_e48ac14130ab657777b006908a16719b`, and invalidated derived output `out_733840f942cf86252753cf3f24d4dc2d`. A restart reconstructed the same state, and local ContextPacket preview `sha256:56887632b5a5a44f36e59baa379c970db7fb5f1f2401e9a99efeeed0764c1297` at base revision 3 automatically contained the exact correction. The original vault path and isolated workspace sources remained unchanged; CASE-01 remains at revision 7. No A0/A1, R3-V2 recommendation, effect, or second model call ran.

The owner approved recommendation comparison gate `sha256:5d5114c24de0681267cb0c4509b456d017bcc29a2a7b39efcbc8d1045378dece`. A0 and A1 each received the same two complete redacted bodies (16,715 bytes), with the correction absent versus manually reconstructed; B received body-free Action Context `sha256:73f00fb7acdbd29e2d3fd0c831685fb61714f59e8896c822a4df50497a46ff39` from Twin revision 3 with the correction carried automatically. All three one-attempt `gpt-5.6-sol` calls completed under the V2 recommendation-first contract with four runtime events, one `agent_message`, zero tool events, and no retry. A0 and A1 remained local baselines. B admitted proposal `act_05fecd458a2962fcaa5c0b3f30f49862` at Twin revision 4 with an unapproved effect-plan preview; approval and effect receipts remain zero. README and both Career source blobs remained byte-identical, and the original vault path was untouched.

In blinded review, the owner judged all three reasoning paths grounded and useful as parallel scaffolding. The reveal was: 方案一=A1, 方案二=B, 方案三=A0. The owner leaned slightly toward A1's medium-confidence dual loop and least preferred A0's high-confidence closure-only stage switch, then clarified that A1 and B are extremely close and cannot be separated confidently because the real ship/closure weighting remains unresolved. This is evidence that the correction materially changed later action semantics: both correction-aware outputs preserved the combined mechanism, while the no-correction output made the overcommitted stage-switch recommendation the owner liked least.

B also demonstrates product-level continuity rather than only transport. It used a 3,541-byte Action Context, 9,770 input tokens, zero historical source bytes, and no manual correction reconstruction; A1 used a 20,470-byte context, 14,992 input tokens, both full bodies, and manually copied correction. A1 named somewhat more concrete source-derived directions, but the owner cannot currently say that difference matters. The honest conclusion is positive and bounded: Forme preserved useful corrected direction at lower reconstruction cost, while any remaining semantic-texture gap is only a hypothesis, not an established blocker.

The owner accepted this positive case as satisfying R3's MVP product exit condition. Do not run another model comparison merely to seek a different winner. Twin-context enrichment remains an unproven follow-up rather than a blocker. Closeout revision 5 invalidated B without approval or effect and preserved the ship/closure weighting as unresolved; the next active gate is R4 Control Packet preparation.

## Evidence round 4 — Agency, long-running entropy, and R4 Social Presence reframe

On 2026-07-22 the owner re-entered the project through the highest-vision and MVP comparison, then supplied three connected product challenges.

First, agency should include a conservative pattern-following layer, a collaborative medium-confidence layer with a lower-cost human interface, and a creative layer that can explore more broadly through low-risk, traceable, reversible experiments. The architecture consequence is to separate cognitive mode from effect authority: confidence and historical agreement affect review and calibration, while scope, reversibility, blast radius, externality, recency, and explicit owner grants determine permission.

Second, an owner-supplied investigation of the long-running Knowledge Vault found low structural entropy but high temporal and execution entropy. Its maturity pipeline, dual knowledge/action navigation, work contracts, drift detection, decision cards, receipts, and partial taste learning remain important Forme evidence. The current rebuild has strong revision, correction, invalidation, receipt, and rollback semantics, but it has not implemented capture/promotion/archive, Incubation, Stewardship, health-driven timing, permission aging, or recurring maintenance. The resulting proposal treats Entropy Reduction as the metabolism of all four product dimensions and keeps repo-specific ontology in a Workspace Stewardship Profile.

Third, the owner judged the static, safety-led R4 direction insufficiently social or desirable. The preferred feeling is a simple but creative hosted experience in which another person can meet a Twin, interact, leave a message or signal, and begin to experience future Twin-to-Twin relationships. The product consequence is a proposed Forme Room with one real host Twin, capsule-only Ask, Leave a Seed, a lightweight Guest Capsule, and a Resonance artifact. Essential isolation remains invisible plumbing instead of the main experience narrative.

This feedback does not yet prove:

- that owner decision history can safely predict decisions across categories;
- that the Knowledge Vault mechanisms generalize to arbitrary repos;
- that a hosted room or Resonance artifact is useful or fun to a real collaborator;
- that a server runtime can remain understandable and bounded at acceptable implementation cost;
- that social interaction exposes differentiated Twin value rather than producing a themed chatbot.

At that point, the immediate consequence was documentation and owner review,
not implementation. Three proposal briefs defined the Agency & Trust model,
Stewardship loop, and R4 Social Presence experience. The prior static projection
remained the approved P0 floor until a later owner product decision.

## Evidence round 5 — Mentor Lens and R4 edge-intelligence correction

On 2026-07-23 the owner added a concrete relationship use case and then redrew the proposed Forme Room topology.

The use case came from an INTDEV Studio partner who sometimes wants, while working on a project, to know how his mentor and studio lead—a web master—would judge the situation. The underlying need is not generic advice or a personality imitation. It is access to a trusted person's role-specific judgment patterns at the moment of work, with a clear distinction between a likely lens and the mentor's actual decision.

This suggests a **Mentor Lens** or role-scoped Judgment Projection. A responsible answer would expose the likely lens, current recommendation, variables that could change it, confidence and counterexamples, and the point at which the real mentor should be consulted. It appears closely aligned with the highest vision of projecting bounded human agency, but has not yet been tested with a mentor-authored capsule, a real question, or the mentor's review.

The owner's architecture map then corrected the v0.1 assumption that the Forme server itself should answer from a capsule. The corrected judgment is:

- a server Projection Capsule is intentionally a shallow, immutable snapshot;
- the server provides registry, deterministic rendering, signal queueing, and response relay, with no LLM or host-side inference;
- an Agent Guest brings its own agent to read the capsule and reason locally;
- a Manual Guest uses the website to browse and submit a structured request;
- insufficient public context becomes an asynchronous Interaction Request;
- deeper judgment happens in the local Forme environment, where the local agent may draft and the owner reviews;
- an admitted result returns as a bounded Response Capsule rather than through a live server-to-local tunnel.

The useful mental model is therefore **a reception room connected to the real local Twin by a reviewed mailbox**, not a shallow remote clone. “Signal Box” has two layers: server transport/lifecycle and local private-context judgment. Guest identity depth is also separate from the current Interaction Request; R4 may support anonymous manual guests, lightweight guest profiles, and projections made by non-Forme agents without pretending that every guest has a full Living Twin.

This correction improves conceptual integrity but does not yet prove:

- that the shallow public capsule is useful enough for orientation and discovery;
- that asynchronous review feels alive rather than like decorated email;
- which Guest Capsule fields are worth the privacy and interaction cost;
- whether guest-side shallow Resonance or host-reviewed deep Resonance belongs in P0;
- whether Mentor Lens is accurate, desirable, or sufficiently different from asking a capable agent with the same documents;
- what response latency, notification, identity, retention, and local-sync design real users will tolerate.

At that point, the immediate consequence was to supersede the v0.1
server-agent assumption in the R4 proposal, Architecture, Control, Roadmap,
Product, Agency, and Stewardship maps. It was not implementation approval; the
five corrected product recommendations and a later technical Control Packet
remained stop gates.

## Evidence round 6 — R4 Hero Encounter, Third Place, and identity approval

On 2026-07-25 the owner approved all five revised R4 product decisions after
revisiting the highest Vision, the Living Project Twin MVP, a notes-backed
personal projection, the Mentor Lens, and the desired open social surface.

The approved target is one Hybrid Hero Encounter in a publicly viewable but
curator-admitted Forme Third Place. The Forme Project Room remains the first and
only required resident, preserving the R1–R3 causal spine. A Manual Guest can
browse and submit bounded context or a signal. An Agent Guest can reason at its
own edge and optionally submit a guest-approved capsule without Forme ingesting
the notes or claiming a Guest Twin. Deeper questions and Resonance Requests
return to the local Forme Agent and owner for reviewed response.

The owner also approved two independent social gates and a layered identity
model. In the then-current pre-T1 brief:

- the entity owner approves the exact immutable Projection Capsule;
- the Third Place curator separately admits or removes the Room;
- invite-only accounts prove durable controller authority, not personhood;
- public readers need no account;
- signals used an invite or verified reply session; T1 later superseded this
  only for one bounded public first knock;
- agents receive narrow delegated credentials;
- account, entity, Room, capsule, agent, guest, and curator identity remain
  distinct.

The server still runs no AI. Its product role is limited to the minimum
identity/control, registry, curation listing, deterministic rendering, queue,
relay, expiry, revocation, retention, attribution, abuse, and privacy behavior
needed for one real encounter.

This approval does not prove that the Hybrid encounter is useful or enjoyable,
that guests will share a capsule, that asynchronous Resonance feels alive, or
that the hosted topology fits the schedule. It authorizes only preparation of a
technical Control Packet. No R4 schema, account, Room, public deployment,
message, persistence, note access, local synchronization, or implementation is
authorized yet.

## Evidence round 7 — Public knock and true Private Room correction

On 2026-07-26 the Owner noticed that the first Technical Owner Review applied
one Guest-duration model to both a public Third Place Room and an assumed
Private Forme Room. Reviewing the actual product contract exposed two gaps:
there was no first-class Private Room at all, and the public venue still
required an Owner invite before every signal. The nearest existing
`unlisted/direct URL` behavior was publicly readable by possession of the URL
and therefore was not privacy.

The Owner approved a clearer relationship model:

- a current, fresh, curator-admitted Third Place Room is publicly readable and
  may accept one private public knock within 24 hours per anonymous bearer
  capability/session;
- the system does not claim that anonymous capabilities enforce one request per
  real human, so a bounded Room-level public pool remains necessary;
- public requests and Owner Responses remain private rather than becoming
  comments;
- after review, the Owner may offer a new short pass through the Guest's
  existing private reply capability;
- a true Private Room uses a different Room ID and separately approved
  Projection under the same Forme entity, never enters Third Place, and
  requires an exact Owner Grant to read or interact;
- Curator admission/unlisting controls public discovery, while Owner actions
  control intake mode, Grant issue/revoke, and continuation offers;
- `unlisted` cannot be used as a privacy state; at that round exact unlist
  effects on active Grants and Grant Offers remained a pending T4 decision.
  T4 later closed in Evidence round 14 below.

The useful mental model is **public square plus one doorbell; invited meeting
room for continued private access**. This correction makes the Third Place
approachable without turning it into open chat or a generalized mailbox, and
keeps private content behind a separate positive authorization.

This discussion did not test a real visitor, measure spam or Owner workload,
validate the 20-per-Room rolling-24-hour public pool, or prove that a
three-interaction short pass feels sufficient. It also did not authorize
implementation. At that point T1 closed at the product-contract level while
T2–T5 remained stop gates. T2, T3, and T4 have since closed separately; T5,
the reconciled Technical Control Packet, exact schema/migration manifest, and
production deployment grant remain stop gates. A later Native Harness
architecture clarification inserted NH1/NH2 before T3 without changing this
historical evidence.

## Evidence round 8 — Privacy-first agency direction and proposed formalization

On 2026-07-27 the Owner identified a more fundamental preference behind the
Room/API discussion: Forme should protect the human privacy boundary and
otherwise minimize friction while allowing Twin/Agent agency to become
substantial. A whole-system audit found the direction sound. The Agent also
identified two companion risks for the Owner to judge: an Agent could
impersonate or commit the human, or cause an irreversible/materially
high-impact effect without exposing new private data.

At that point the Owner-stated part was the
privacy-first/minimum-friction direction. The **proposed formalization** taken
into the next Owner review was:

- define the primary perimeter around source/provider/audience domains not
  already covered by an admitted envelope;
- add companion identity/commitment and irreversible-consequence guards plus a
  no-self-expansion rule;
- grant useful persistent, observable, revocable authority inside it;
- use receipts, verification, exception reporting, stop/revoke, and undo where
  feasible instead of repeated ceremonial approval;
- treat confidence and owner-history similarity as calibration, never
  permission;
- interpret “narrow delegation” as an exact perimeter, not a deliberately weak
  set of one-use verbs.

Applied to R4, this changes the pending T2 recommendation from operational sync
plus one-use approval for nearly every management action to one fixed,
exact per-Room `room_operator.v1` scope bundle for routine transport and
deterministic lifecycle enforcement.
It also clarifies that T3's exact context manifest and T5's no-daemon design are
August bootstrap choices, not Forme's long-term agency ceiling. T1 remains
unchanged.

This round records product judgment, not usage evidence. It does not prove that
the proposed Room Operator scope feels safe, that exception-based supervision
is understandable, or that Agent-triggered explicit sync removes enough
friction. At that point those required the exact T2–T5 decisions,
implementation, and owner demo. T2, T3, and T4 have since closed as
governance, but the usage proof remains absent. No R4 implementation was
granted.

## Evidence round 9 — P approval and R1–R4 continuity audit

On 2026-07-28 the Owner approved P for the R4 authority contract:

- privacy is the primary source/provider/audience perimeter;
- representation/commitment and irreversible/material consequence are
  companion guards;
- existing authority cannot expand itself;
- covered work inside an explicit, inspectable, revocable envelope proceeds
  review-by-exception.

This is governance evidence, not usage evidence. The P approval by itself
closes the human-boundary interpretation only; it does not validate the
proposed Room Operator experience or approve T2–T5, schemas, implementation,
provider visibility, hosted mutation, external interaction, deployment, or
spend. T2 was approved separately afterward.

The same round audited whether R1–R3 actually support R4. The state chain is
genuinely additive: V3 retains V2 cognition, R3 action requires an active
Owner-corrected Reflection, and execution/rollback return receipts and source
state to the same Twin. The audit also found one concrete regression gap:
`ContextPacketV1` forwarded active corrections only when the current Twin was
exactly V2, so a later cognition run after V3 promotion silently lost them.
The fix now forwards corrections from every non-V1 Twin and a real
V2-correction → V3-promotion → next-Context-Packet regression raises the suite
from 44 to 45 passing checks.

Architectural continuity does not yet prove the R4 experience. The required
acceptance bridge now demands a real, freshly observed Forme Twin, claim-level
local basis, truthful correction/effect eligibility, stale/no-op behavior, no
automatic Signal-to-Twin admission, and one real
Twin → Projection → Guest Signal → local judgment → Response path. Until that
path runs, R4 product value and interaction quality remain unproven.

## Evidence round 10 — T2 Room control contract approval

On 2026-07-28 the Owner approved the full recommended T2 branch after a
low-cognitive-load review. The accepted mental model is one independently
revocable Room work permit per exact Room—not one credential for an entire
account or workspace:

- hosted Forme is the no-AI GitHub-like Web/API control plane, and private
  reasoning remains local;
- every approved P0 Room semantic operation has one versioned API; P0 CLI
  covers applicable public/Guest operations and `room_operator.v1`, while
  Controller/Curator CLI delegation remains P1;
- one workspace may hold multiple Room bindings, but each binding and
  credential covers one exact Room for 30 days, never auto-renews, and may be
  revoked earlier;
- the connector—not the model—holds the credential;
- the operator may inspect, explicitly sync/pull, ACK/recover, deterministically
  attest stale, and transport only still-current exactly Owner-approved
  Projection/Response artifacts;
- it may not create/discover Rooms, widen scope/audience, issue Grants, change
  intake or Interaction disposition, author Owner content, curate, revoke
  content, retire/delete, or invoke arbitrary tools;
- authenticated Owner Web may see and control content already hosted on the
  server, but never the private Twin or local draft context.

This is governance evidence, not a successful Room usage result. No binding,
credential, API, Room, Projection, hosted record, model run, deployment, or
external interaction was created or exercised. At that round T3–T5 remained
unapproved; T3 and T4 have since closed, while T5, the reconciled Packet, wire
schemas, implementation, and production authority remain unapproved. The old
packet's broader paired-local revoke and `signal:disposition` scopes are
explicitly excluded from T2.

## Evidence round 11 — NH1/NH2 Native Harness architecture approval

On 2026-07-29 the Owner approved NH1 option 1 and NH2 option 1 as recommended:

- the Native Harness Workbench is the default local carrier, with Codex as the
  P0 workbench and OpenCode retained as a first-class architectural
  compatibility target whose live path remains P1;
- Forme integrates through CLI/API/MCP/Skill/Plugin/adapter surfaces rather
  than building a competing local chat shell for the MVP;
- those are architecture-level integration forms, not simultaneous P0
  deliverables; August requires only the minimum Codex-facing path for the
  walking slice and no live OpenCode path;
- ordinary Owner/Harness Workspace activity may use native capabilities only
  inside a separately approved runtime envelope; its results may be offered
  and admitted as evidence only through a separately approved
  source/observation contract, never automatically ingested as Twin meaning or
  a Forme-authoritative effect;
- canonical meaning, correction, authority, Projection/Response scope,
  human-attributed publication or commitment, and claimed Forme
  receipt/rollback guarantees continue through typed Forme contracts;
- P0 Forme-authoritative effects remain narrow and deterministic; later
  Harness-native physical execution requires a separately approved Forme
  envelope, verification, and receipts.

This is architecture-governance evidence, not a successful Native Workbench or
R4 usage result. The exact T3 runtime/source/capability design is now approved,
but no concrete runtime capability, file access, provider call, Guest data,
Room mutation, credential, schema, implementation, deployment, external
action, or spend was exercised or authorized. NH1/NH2 and T3 are closed; T4 is
now also closed separately, while T5 is the active Owner card and
reconciliation of the detailed Technical Control Packet remains open.

## Evidence round 12 — Fresh Native Response Session direction selected

On 2026-08-01 the Owner selected Option 2B as the direction for R4 P0 after
revisiting how Native Harness Mode was expected in the Highest and MVP Vision:

- do not reuse the Owner's current/saved Codex conversation for Guest work;
- start one brand-new, disposable session for one exact Interaction;
- let that session dynamically read/search a sanitized read-only snapshot of
  current eligible Forme files plus typed body/path-free Twin orientation
  instead of asking the Owner to choose an
  exact 32 KiB private-context manifest;
- keep Guest inbox browsing, other Interactions/Rooms, writers, Web/network
  tools, environment secrets, connector credentials, Room mutation, and
  publication outside the session;
- keep the output as a candidate requiring exact Owner publication approval;
- move the Managed Privacy response lane and trust-tier selector to P1/future,
  while preserving accepted R2/R3 Managed Privacy evidence.

The product judgment is that this direction better demonstrates mature
Harness agency and Forme's distinct continuity/authority/presence layer with
less MVP friction. The explicit scope assumption is the Forme project repo,
not a personal Knowledge Vault or highly sensitive source zone.

This round was **direction/architecture evidence only**. No session was run and
no product usefulness, containment, privacy, consent, provider behavior,
deletion, or response quality was validated. At the close of this round on
2026-08-01, full T3 consent, exact source/provider/capability envelope, session
budget, physical boundary and lifecycle still awaited Owner approval; that
contract closed separately on 2026-08-03 in Evidence round 13 below.

## Evidence round 13 — exact Fresh Native Response Session T3 approved

On 2026-08-03 the Owner approved the full recommended T3 contract, not merely
the earlier Option 2B direction. The approved R4 P0 boundary fixes one new,
non-resumed session per exact Interaction; a 60-minute, one-automatic-draft
budget of at most three internal provider dispatches, 128k input tokens, 8k
output tokens, and an applicable US$1 incremental-spend cap; dynamic
read/search only inside a deterministic sanitized read-only snapshot generated
from clean Forme repo HEAD plus a previewed body/path-free Twin orientation;
disclosed Owner-local Codex → OpenAI transport with no provider/model fallback;
physical separation from ambient conversations/config, Git history, other
Rooms and Guest bodies, writers, generic network/tools, connector credentials,
mutation, and publication; explicit Guest consent with a
`manual_owner_only` fallback; and exact Owner approval before separate T2
connector delivery of any outgoing Response.

This is **Owner decision evidence, not runtime or product evidence**. The
approval permits documentation and later Packet reconciliation only. No Fresh
session, source read, provider call, Guest data, Room mutation, schema,
implementation, deployment, external action, production write, or spend was
authorized or exercised, and no containment, response quality, deletion, or
retention claim was validated. T4 subsequently closed through Evidence round
14 below; T5 is now the current Owner gate, and the old Technical Control
Packet remains unreconciled and unapprovable. Repository implementation and
fixture/local tests still wait for a new audited, hashed, separately
Owner-approved Packet; schema/migration and production authority remain later
independent gates.

## Evidence round 14 — R4 T4 public lifecycle contract approved

On 2026-08-03 the Owner approved the full recommended T4 lifecycle contract:

- Owner publication and Curator admission are independent;
- Third Place shows only current, fresh, admitted Projections;
- an unrevoked, unexpired public Projection remains direct-readable when never
  admitted or unlisted, while unlist stops discovery and public knocks;
- unlist invalidates unused public encounter capabilities but does not by
  itself revoke a still-valid exact Owner Grant or `GrantOffer`;
- `GrantOffer` acceptance atomically rechecks source, target, private reply
  authority, expiry, and Room mode and never extends expiry;
- Private Room bodies always require an exact Owner Grant, and P0 never changes
  a Room from public to private in place;
- `invite_only` stops unused public encounters, while `closed` pauses all new
  submissions; neither unlist nor a mode change deletes accepted Interactions;
- stale content is warning-only and read-only until hard expiry, with no new
  public or private Interaction;
- revoke immediately removes the Projection body, hides linked Responses, and
  terminates new response authority for requests bound to that origin;
- retirement ends the entire Room surface and all new writes;
- revoke and retirement leave only body-free Guest status/delete and require
  local purge after the corresponding tombstone is received;
- public successors require fresh Curator admission, no successor inherits a
  Grant, and old stale, superseded, or expired requests may receive only an
  origin-disclosed reviewed Response.

This is **Owner governance evidence, not runtime, safety, or product
evidence**. No lifecycle route, database transaction, expiry clock,
direct-read surface, Grant/GrantOffer recheck, tombstone delivery, local purge,
race recovery, or Guest experience was exercised. It therefore does not prove
that unlisted direct-read is understandable, that stale warnings are noticed,
that revoke propagates promptly, or that accepted requests and Responses
behave correctly under concurrent lifecycle changes.

T4 permits documentation and later Packet reconciliation only. T5 is the
current Owner gate, the existing Technical Control Packet remains unreconciled
and unapprovable, and no schema, implementation, provider call, Guest data,
credential, hosted mutation, external interaction, deployment, production
write, public behavior, or spend has been authorized or validated.

## Evidence round 15 — Guest identity recap and two T5 inputs fixed

On 2026-08-03 the Owner accepted the Guest identity explanation and fixed two
product-facing inputs inside the still-open T5 review:

- P0 Guest continuity remains capability-scoped rather than account-scoped.
  Anonymous Manual Guests hold an exact public encounter and later private
  reply capability; known collaborators and Private Room Guests hold
  Owner-issued exact Room + Projection Grants; Agent Guests use short-lived
  one-shot derivatives. None proves real-world personhood or creates a
  reusable cross-Room Guest identity.
- An exact Interaction may optionally carry a confirmed
  `response_ready_email` endpoint. It sends a generic readiness notice with no
  request/response body, Private Room name, reply URL, token, or secret; it is
  contact metadata rather than identity, authorization, or capability
  recovery. The original private reply URL remains canonical.
- The Owner-facing continuation choices become three capability presets: one
  visit is 24 hours / 1 accepted Interaction, short exchange is 3 days / 2,
  and familiar collaborator is 7 days / 3. Each permits at most one unresolved
  request, remains exact Room + Projection scoped and revocable, and never
  grants Private Room access by familiarity alone.

This is **Owner product/governance evidence, not Guest usage evidence**. No
email was sent, identity verified, pass issued, Interaction accepted, response
delivered, retention process run, provider selected, or user friction
measured. It does not show whether Guests will retain the private reply URL,
whether generic email is sufficient across devices, whether the presets match
real collaborator rhythms, or whether three Interactions feel continuous.

These inputs update the remaining T5 proposal without closing it. Email
provider/log/retention/spend, physical deletion, the overall P0 cut, the
reconciled Packet, schemas, implementation, deployment and production traffic
remain separate unapproved gates.

## Evidence round 16 — Full T5 approved and fourth continuation tier added

Later on 2026-08-03 the Owner approved the complete recommended T5 contract
and made one additive change to the earlier continuation surface:

- familiar collaborator remains 7 days / 3 accepted Interactions;
- trusted collaborator is added as a fourth, explicitly Owner-selected preset
  at 7 days / 10 independent accepted Interactions;
- both remain exact Room + Projection scoped, revocable, limited to one
  unresolved request, shared by Manual and one-shot Agent carriers, and unable
  to follow a successor or unlock a Private Room by label alone. The system may
  not infer the trusted tier from email, identity, history, behavior, or model
  judgment;
- explicit Agent-triggered `room sync` plus manual recovery, reply-URL polling,
  optional notification-only exact-Interaction email, and no Owner-device
  daemon/live-chat/server-AI topology are now closed T5 requirements;
- Interaction and inline Guest Capsule bodies have a 30-day maximum; Response
  and isolated unpublished candidate bodies have a 7-day maximum capped by
  the Interaction. Earlier deletion, expiry, origin revoke, Room retirement,
  or candidate-basis invalidation shortens availability and triggers the
  approved cleanup/purge obligations;
- hosted deletion becomes immediately unreadable, scheduled physical purge
  targets less than 24 hours, and more than 36 hours without a successful purge
  is an operator incident. Fresh-session body artifacts are disposable and
  durable Session Receipts remain body-free/path-free; and
- actual backup, infrastructure-log, and outbound-email provider retention,
  region, secret, delivery-metadata, and spend values must be disclosed in a
  later Production Deployment & Provisioning Grant before real interaction or
  production email. Notes ingestion, Person Twin, open signup, multiple
  required residents, public search/feed, server AI, rich attachments, and
  cross-Room reusable Agent identity stay outside R4 P0.

This is **Owner product/governance evidence, not runtime or usability
evidence**. No email was sent, endpoint verified, pass issued, Interaction
accepted, sync run, Response delivered, body deleted, purge job or incident
monitor exercised, provider called, schema written, application implemented,
or production resource changed. It does not establish that 10 independent
Interactions feel coherent, that the generic notice is sufficient, that local
cleanup is enforceable, or that deletion and offline synchronization races are
correct.

T5 is now closed as design authority. The current stop gate is a newly
reconciled Technical Control Packet compiled from P/T1/T2/T3/T4/T5/NH1/NH2,
independently audited, assigned a new SHA-256, and separately approved by the
Owner. Full T5 approval authorizes documentation and Packet reconciliation
only; implementation, schema/migration, provider calls, real Guest-data
handling, external messaging, deployment, production writes/traffic, public
behavior, and spend remain unauthorized and unvalidated.

## Evidence round 17 — Technical Control Packet v0.2 reconciled and audited

Later on 2026-08-03 the approved P/T1/T2/T3/T4/T5/NH1/NH2 contracts were
compiled into a clean Technical Control Packet v0.2. The exact approval object
is 1,981 lines / 107,235 bytes with SHA-256
`e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`.

Three independent read-only audits returned Green on those exact bytes:

- authority and causal-chain compatibility, including one-use dispatch
  linearization and post-email-handoff `no_future_retry` behavior;
- lifecycle, retention/deletion, email recovery, local locking, Fresh-session
  concurrency, close/offline behavior, and required race tests; and
- physical containment, Codex feasibility, source/origin boundaries,
  transport/budget accounting, candidate extraction, Git snapshot behavior,
  Cloudflare origin expectations, and recovery scope.

The repository verification for this documentation state passes all 45
deterministic tests, Markdown structure and relative-link checks across 22
files, and `git diff --check`.

This is **control-design and audit evidence, not runtime or product
evidence**. No R4 code, schema, migration, provider/model call, real Guest
body, hosted mutation, email, deployment, public traffic, production write, or
spend was created or exercised. The Green audits therefore do not prove
containment on a real Codex invocation, macOS launcher hardening, response
quality, hosted race behavior, email delivery, deletion, restore, or the
three-minute encounter.

The remaining Yellow conditions are deliberately later evidence gates rather
than Packet-approval blockers:

- Gate B must prove that the official Codex adapter can enforce the bounded
  Snapshot Query Broker plus exact transport, model, output, token, and cost
  boundary; otherwise the AI lane remains manual-only;
- Gate B must prove the signed/hardened macOS launcher, native review,
  Keychain, reverse isolation, sandbox, and cleanup as one physical system;
  and
- Gate C must bind the actual production origin, backup/log retention, OpenAI
  account, email provider, real actors/data, and spend before real traffic.

At Evidence round 17, the stop gate was separate Owner approval of the exact
Packet hash. That approval could permit only the bounded Gate A repository
implementation and synthetic/local tests described by the Packet, not Gate B
provider work or Gate C production work. Evidence round 18 records its later
closure.

## Evidence round 18 — Exact Packet approved; Gate A opened

Later on 2026-08-03 the Owner replied “嗯嗯，那我批准” directly to the one
immediately preceding approval object for Technical Control Packet v0.2. The
approval record binds that actual utterance to the only presented object:

```text
批准 R4 Technical Control Packet v0.2 sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5
```

The Packet file itself remains byte-frozen at 1,981 lines / 107,235 bytes and
the same audited SHA-256. The approval therefore opens exactly Gate A:
repository code/docs, synthetic fixtures, local unit/property/integration
tests, ephemeral local PostgreSQL, content-safe read-only capability probes,
and preparation of the next exact Gate B Manifest.

This is **Owner authorization evidence, not implementation or product
evidence**. At the moment of approval no R4 code, schema/migration, provider
call, real Guest data, hosted mutation, email, deployment, production traffic,
secret, or spend had been created or exercised. Gate A completion must produce
new technical evidence and a synthetic/local walkthrough; it cannot claim a
real Room encounter.

The next Owner stop gate is the hash-pinned Gate B Schema, Runtime, and
Migration Manifest. A model call remains forbidden unless that separately
approved Manifest contains and the Owner names the exact First Provider-Call
Test Grant. Real Guest/hosted/production work remains Gate C.

## Follow-up product-learning questions — not R4 blockers

Keep these questions in the validation backlog while R4 proceeds through its own Control Packet:

1. What two or three real, longitudinal cases will make Twin-derived value judgeable rather than merely plausible?
2. What baseline will we compare against: ordinary Codex/OpenCode with the same source material, or a static project summary?
3. What evidence would show that an owner correction materially improves a later proposal?
4. How much approval and review friction is acceptable for the value of the action?
5. Which current runtime glue can be replaced by a native Codex API boundary, and what minimal adapter contract is required for an OpenCode spike?
6. Does R4 Controlled Presence help expose the unique value of one shared Twin, or would it distract from the unresolved usefulness question?
7. Does the Mentor Lens produce recognizably mentor-specific judgment, and does the mentor agree with its boundaries?
8. Does asynchronous capsule exchange feel like a relationship with continuity or merely a themed mailbox?

## Falsification signals

We should reduce or rethink the product claim if repeated real cases show that:

- Twin-derived proposals are no more useful than a fresh Harness session with the same files;
- owner corrections are stored but do not materially change later interpretation or action;
- the approval and provenance burden consistently costs more attention than the action saves;
- most engineering effort continues to reproduce runtime, tool, or session features already supplied by Codex/OpenCode;
- controlled projections are indistinguishable from manually maintained summaries.

## Maintenance rule

For each meaningful owner demo, append one dated evidence round containing:

1. the case and baseline;
2. what the owner actually experienced;
3. technical evidence;
4. product judgment and confidence;
5. what was not proven;
6. the consequence for the next gate.

Do not rewrite prior feedback to fit later architecture. Supersede it explicitly when new evidence changes the judgment.
