# History and frozen evidence

Forme preserves chronology without making it the default working memory.

## Recovery points

Two annotated remote tags capture the state before this distillation:

- r4-context-pre-distillation-2026-08-18 — consolidated reviewable integration
  at 034f59b;
- r4-chronology-pre-distillation-2026-08-18 — full local chronology at
  fc10ad2.

Git history, closed pull requests and issue comments retain the rest of the
review trail. The tags are recovery and audit surfaces, not active planning
surfaces.

## Frozen fixture boundary

Several Gate A/Gate B packets, Owner reviews, manifests, reports and JSON
evidence files are read by audits, schemas or physical-runner tests using
exact paths or hashes. Their presence does not make them current authority.

Do not rename, edit or delete those files for tidiness. Change them only as
part of an explicitly scoped contract migration that updates and validates
every consumer.

The consolidated integration branch intentionally omits some large Local
PostgreSQL chronology that remains available from the chronology tag. Do not
copy it back into active context merely to make the tree complete.

## Investigation route

For a lineage question:

1. start from the compact statement in [DECISIONS.md](./DECISIONS.md) or
   [VALIDATION.md](./VALIDATION.md);
2. follow its named issue, pull request, packet or evidence artifact;
3. use Git history or an archive tag for the exact prior bytes;
4. return only the still-current conclusion to active context.

Historical material may prove what happened. It does not grant production,
provider, data, deployment, publication, messaging, spend or merge authority.
