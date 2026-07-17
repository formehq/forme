# Agent working agreement

This repository is being rebuilt to keep implementation speed and owner understanding synchronized.

## Before changing anything

1. Read `docs/PRODUCT.md`, `docs/CONTROL.md`, and the active GitHub issue.
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
- Canonical writes are deterministic, authorized, inspectable, and reversible where feasible.
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
