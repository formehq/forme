# Paused-project context contract

This is the re-entry surface while Forme is paused for assumption review.

## Default read set

Read only:

1. [CHECKPOINT-2026-09-17.md](./CHECKPOINT-2026-09-17.md);
2. [CONTROL.md](./CONTROL.md);
3. the status note and relevant section of [PRODUCT.md](./PRODUCT.md);
4. [VALIDATION.md](./VALIDATION.md) when evaluating what was actually proved;
5. [DECISIONS.md](./DECISIONS.md) when reviewing a specific prior assumption.

Do not preload the full R4 chronology, Gate packets, evidence files or old
issue comments. They are historical investigation material, not working
memory.

## Current truth hierarchy

1. The checkpoint and cockpit define the paused state.
2. Current Owner statements define which assumptions are being reconsidered.
3. Product and architecture documents describe the first build phase's product
   hypothesis.
4. Tests, receipts, Git history and issue/PR records prove only what happened.
5. Historical approvals and successful runs grant no new authority.

If two surfaces disagree, prefer the newer pause checkpoint and preserve the
older statement as historical evidence rather than silently reconciling it
into a new judgment.

## Open conditionally

| Review question | Add this material |
|---|---|
| prior product hypothesis | [PRODUCT.md](./PRODUCT.md) and [ROADMAP.md](./ROADMAP.md) |
| memory, cognition or durable semantic state | [ARCHITECTURE.md](./ARCHITECTURE.md) and relevant Git history |
| approval, agency or human friction | [AGENCY-TRUST.md](./AGENCY-TRUST.md) |
| Harness and response-session boundary | [NATIVE-HARNESS-ARCHITECTURE.md](./NATIVE-HARNESS-ARCHITECTURE.md) |
| Room, Projection or Social Presence | [R4-SOCIAL-PRESENCE.md](./R4-SOCIAL-PRESENCE.md) |
| exact chronology or audit | [HISTORY.md](./HISTORY.md), named evidence and archive tags |

## Working mode

The repository agreement is [AGENTS.md](../AGENTS.md). Read-only analysis,
assumption review and reversible maintenance may proceed within the Owner's
request. Do not infer a new product direction from the old roadmap or turn an
open issue into an active task.

## Context discipline

The pause itself reflects a context lesson: more accumulated summaries do not
necessarily produce better long-term judgment. Keep source, observation,
candidate interpretation, Owner judgment and current task context visibly
distinct. Never promote an AI-generated synthesis merely because it is already
present in repository memory.
