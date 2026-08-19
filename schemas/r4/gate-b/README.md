# R4 Gate B proposed artifacts

- Status: `PROPOSED_NOT_EXECUTED`
- Authority: R4 Technical Control Packet v0.2
- Approved Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- First Provider-Call Test Grant: `NOT_REQUESTED`

These files freeze the exact inputs proposed for Gate B review. Gate A may
parse, lint, hash, and inspect them. Their presence does **not** authorize or
claim execution of SQL, Docker, Codex sessions or turns, macOS signing,
Keychain access, external network, provider calls, schema migration, hosted
mutation, email, deployment, secrets, spend, or production traffic.

The authoritative human review is
[`docs/R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`](../../../docs/R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md).
That Manifest binds the byte hash of every file below. A mismatch fails closed.

## Artifact set

| Artifact | Purpose | Gate A action | Earliest execution |
|---|---|---|---|
| `operations.md` | Exact 45-operation HTTP/action/schema map | parse/hash only | Gate B |
| `local-formats.md` | Exact local durable/transient format and protection map | parse/hash only | Gate B |
| `runtime-boundary.json` | Fixed disposable resources, effect ceilings, lane order, and stop conditions | JSON parse/hash only | Gate B |
| `codex-zero-call-contract.json` | Official Codex 0.145.0 capability probe boundary with zero thread/turn/model calls | JSON parse/hash only | Gate B |
| `macos/forme-fresh-response.sb` | Proposed parameterized deny-first Seatbelt profile | text lint/hash only | Gate B |
| `macos/build-recipe.json` | Exact temporary launcher/signing/Keychain test recipe | JSON parse/hash only | Gate B |
| `postgres-contract.md` | Exact proposed SQL/table/function/role/encryption/resource/test contract | parse/hash only | Gate B |
| `artifact-index.json` | Hash index over every other proposal artifact in this directory | verify only | never executed |

There is deliberately no executable SQL, runner, native binary, certificate,
Keychain item, Docker resource, or Codex adapter in this Gate A artifact set.
Those are Gate B construction outputs only if the Owner later approves the
hash-pinned Manifest.

## Non-self-referential hash rule

`artifact-index.json` excludes itself and hashes every other artifact above.
The Manifest records the index hash and aggregate hash. The low-load Owner
Review records the final Manifest SHA-256. Changing any proposed artifact
therefore requires a new index, a new Manifest hash, and a new Owner approval.
