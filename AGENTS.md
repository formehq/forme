# Agent working agreement

This repository is being rebuilt to keep implementation speed and owner understanding synchronized.

## Before changing anything

1. Read `docs/PRODUCT.md`, `docs/CONTROL.md`, and the active GitHub issue.
   Before runtime, context, file/tool authority, or R4 T3 work, also read
   `docs/NATIVE-HARNESS-ARCHITECTURE.md`.
2. Name the user-visible outcome and current roadmap gate.
3. Identify whether the change touches an owner stop gate.
4. Keep one pull request to one demonstrable outcome.

## Owner stop gates

Do not implement past the proposal stage without explicit owner confirmation when a change:

- creates or changes durable state;
- changes a schema or trust boundary;
- grants an agent new file, shell, network, publish, or messaging authority;
- changes what Codex or OpenCode may observe or execute;
- changes projection privacy or audience rules;
- adds a foundational dependency;
- changes P0 scope, dates, or public behavior.

## Outcome-envelope workflow

Prefer one medium-grained Owner decision over a sequence of ceremonial
per-file, per-commit, or per-hash approvals.

Before implementation, state an outcome envelope containing:

- the user-visible outcome and current roadmap gate;
- the allowed paths or bounded workset;
- the data, permission, runtime, network, production, publication, spend, and
  other external-effect ceilings;
- the validation and evidence expected at Technical Review; and
- the exact stop or review condition.

Once the Owner confirms that envelope, proceed autonomously inside it through
implementation, local/fake tests, bounded repairs, evidence freezing,
documentation reconciliation, and commits. Recomputed hashes and ordinary
implementation choices inside the confirmed envelope do not reopen an Owner
gate.

Stop and return to the Owner when the work would cross an Owner stop gate,
expand the outcome/workset/effect ceiling, make an external or irreversible
effect not already explicit in the envelope, encounter ambiguous evidence or
an exhausted safety ceiling, or materially change the promised result. A
failed test that can be repaired inside the envelope is not by itself a new
approval gate. Passing tests remains Technical Review, not Owner Experience
Acceptance.

## Non-negotiable boundaries

- The owner retains final authority over meaning and authorship.
- Runtime sessions are disposable computation, never canonical truth.
- Agent inference remains evidence-backed, uncertain, revisable, and invalidatable.
- Under the Owner-approved NH2 two-class boundary, implemented
  Forme-authoritative writes remain deterministic, authorized, inspectable,
  and reversible where feasible.
- Ordinary Native Workbench activity may use harness-native capabilities only
  inside a separately approved runtime envelope. Its results may be offered
  and admitted as evidence only through a separate typed Forme contract; they
  are never auto-ingested as canonical meaning or a Forme-authoritative effect.
- The NH1/NH2 architecture approval grants no concrete runtime, file, shell,
  tool, network, provider, credential, Guest, or Room authority.
- The 2026-08-03 R4 T3 approval fixes the exact Fresh Native Response Session
  contract. The 2026-08-03 T4 approval fixes the recommended public/admission,
  unlist, stale, revoke, retirement, and successor lifecycle contract without
  expanding `room_operator.v1`. The 2026-08-03 full T5 approval fixes explicit
  sync/manual recovery, optional notification-only email, four exact
  continuation presets (24h/1, 3d/2, familiar 7d/3, and Owner-selected trusted
  7d/10), body-retention ceilings, deletion/purge honesty, and the P0 cut.
  These approvals authorized only authority-document and reconciled Control
  Packet preparation. Packet v0.2 is independently audited at
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`.
  The Owner approved those exact bytes on 2026-08-03. Gate A authorizes only
  repository code/docs, synthetic fixtures, local/ephemeral tests, read-only
  probes that expose no real content, and preparation of the next exact
  manifest. A Fresh Native Response provider call, real Guest-data handling,
  schema migration, deployment, spend, production Room mutation, external
  message, secret, or public response capability remains unauthorized.
  Schema/runtime/migration validation and any first provider call require the
  separately approved Gate B Manifest and named test grant; production/public
  action requires Gate C.
- The Owner approved the five recommendations in the 2026-08-07 R4 Gate B
  Correction Scope Decision Brief at
  `sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f`:
  Demo-critical PostgreSQL Core, a separate Codex zero-call diagnostic
  profile, the transient-candidate MVP exception, a disclosed procedural
  controlling-Agent boundary, and retained pinned public PostgreSQL image
  cache. That approval authorizes preparation of an exact Correction Packet
  only. Until that Packet is separately approved, Correction Construction,
  Retry Execution and First Provider Call remain unauthorized. The original
  Full target remains immutable and Core Green must never be called Full
  Green.
- Private source existence never implies projection permission.
- Unknown capabilities and invalid outputs fail closed.

## Completion protocol

Every implementation pull request must include:

- the user outcome;
- before/after behavior;
- data and permission impact;
- validation evidence;
- a runnable demo path;
- what the owner should challenge;
- documentation updates when the system understanding changes.

Passing tests is Technical Review. Only owner experience acceptance moves a core slice to Done.
