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
  contract, but authorizes only authority-document and later Control Packet
  reconciliation. Until T4/T5 and a reconciled packet are separately
  Owner-approved, no Fresh Native Response Session implementation, Guest-body
  release, dynamic response-snapshot read, OpenAI call, schema, deployment,
  spend, Room mutation, or response capability is authorized.
  Schema/migration and production deployment/public action still require their
  own later manifest/grant even after a reconciled packet is approved.
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
