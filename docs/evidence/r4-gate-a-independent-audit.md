# R4 Gate A independent audit record

- Status: `CLOSED_GREEN_FOR_GATE_B_REVIEW`
- Approved Packet:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Final implementation commit:
  `c23988e2c626a92d6d1a2dfacdce5ad089cdb4f7`
- Final implementation tree:
  `fe1071da80310956c11fa0930ec63e710ee1d6e0`

## Review verdict

- Contract Red: **none**.
- Unresolved Gate A implementation Yellow: **none**.
- Deliberate Gate B physical/repeat conditions: remain open and are not
  counted as Gate A defects.
- First Provider-Call Test Grant: **NOT REQUESTED**.

## Material findings closed before freeze

The implementation review found and closed gaps in exact secret width and
separation, candidate admission/replacement recovery, actual
`SnapshotQueryBrokerV1` wiring and budgets, origin-state disclosure,
publication delivery, Grant replacement/derivative semantics, notification
outbox recovery and purge, admission clocks, expected-version enforcement,
accepted → seen-locally → preparing lifecycle, janitor batch/retry behavior,
AST/built-output audits, HTML/JSON parity, concurrent replacement, direct
lost-response recovery, and golden-vector verification.

The final browser pass then exposed one production-bundle-only problem:
expected `SemanticError` failures from a duplicated Next module instance were
falling through an `instanceof` check and becoming `503 service_unavailable`.
The fix introduced a narrow structural semantic-error guard, preserved the
approved terminal-unreadability contract (`404 not_found` after deletion),
added regression tests, and changed the local production command to the real
standalone server. The clean rerun had no console/browser errors and never
returned the erroneous 503.

## Manifest audit correction

The first Gate B draft was not approval-grade because it repeated stale
38-object/43-operation/90-file counts and described future SQL/runtime work
without enough exactness. The final proposal therefore binds the actual
39-object/53-definition protocol, all 45 operations, and separate hashable
PostgreSQL, local-format, Codex zero-call, macOS, and runner contracts. It also
adds the previously missing encrypted Projection/Room-label handling,
verification-code and idempotency sensitive recovery, and cross-table nonce
reuse prevention. These are proposed Gate B bytes only; none were executed in
Gate A.
