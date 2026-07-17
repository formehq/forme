# Living Project Twin contracts

These JSON Schemas are Forme-owned M0 contracts. They define the stable boundaries used by the Living Project Twin implementation.

## Contracts

| File | Boundary |
|---|---|
| `source-record.schema.json` | Project/notes connector → evidence store |
| `twin-state.schema.json` | Twin event reducer → durable semantic state |
| `runtime-event.schema.json` | Codex/OpenCode adapter → Forme orchestrator |
| `agent-proposal.schema.json` | Read-only agent lane → Forme proposal gate |
| `action-receipt.schema.json` | Deterministic effector → receipt ledger/Twin transition |
| `published-projection.schema.json` | Private Twin → Presence service |
| `agent-message.schema.json` | Forme identity/mailbox → another Forme identity/mailbox |

## Non-negotiable properties

- Unknown fields fail validation.
- Runtime-native identifiers remain metadata and never become Twin identity.
- Proposals reference a `baseRevision` and cannot declare themselves confirmed.
- Only a terminal action receipt may advance canonical state after an effect.
- Published projections contain approved claims, never raw source material or local paths.
- Agent messages are untrusted inputs and cannot mutate a receiving Twin directly.

Positive fixtures live in `samples/`. Adversarial and negative fixtures should be added when these contracts move into the implementation branch with AJV-based tests.
