# R4 Gate B Physical Retry Execution Manifest — NON-APPROVABLE Yellow

- Artifact status: **NON-APPROVABLE YELLOW**
- Implementation: `92c6c3f8896494aed699671a04a93a09fb59087d`
- Implementation tree: `cf2ce5567c601fff1ad709e565dde41cf9c3540d`
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Recommendation: **DO NOT EXECUTE**

## Why this is not executable

Phase A completed Green only inside the fake-only construction boundary. Exactly
one authorized Host Binding attempt consumed the mode-0600 input at
`.forme/gate-b-host-binding-input.v1.json`, then stopped at
`HOST_BOUND_PATH_SYMLINKED` before any Host inspector ran. Its read-only counts were
**0 / 0 / 0**. Cleanup completed Green: the input, Construction root, Construction
journal, and journal-authorized process groups were absent.

No Host Binding capsule exists and no public Host Binding receipt was produced.
Consequently this document intentionally contains no Retry authority marker, no
executable Retry command, and no private path or Owner-supplied value.

## Frozen review basis

| Item | Exact value |
| --- | --- |
| Implementation I / tree | `92c6c3f8896494aed699671a04a93a09fb59087d` / `cf2ce5567c601fff1ad709e565dde41cf9c3540d` |
| Approved implementation workset | 48 paths |
| Construction checkpoint | `sha256:284b7b5eebc46167a75fc8ba4dc3b68be15ec4c7905af7f943d7e2639e78dded` |
| Validation record | `sha256:0c592035cabb53a744f066ea200b775aeba99330eb103171234495e6320837fd` |
| Independent Audit A receipt | `sha256:11d077f2c88fcbbb48bbfc9763ea676785d2a6ffe25834d8015e094f1adfdec9` |
| Independent Audit B receipt | `sha256:d38f7ad3dd7dceaa002023eb3a29fb666515e19db393857f3dca1ba5bb21ac7c` |
| Independent Audit C receipt | `sha256:2b7111df2aa6ae719da2434e5ef39f2a1896448e1efe5c54ff62eeb54cfb18e6` |
| Offline validation | 54 files / 468 tests; physical runner 49; Host Binding 16 |
| Construction process observations | 72,989 fake starts; 2 normal compiler starts |

## Constructed lanes, not executed

### PostgreSQL

The offline construction covers the closed PostgreSQL execution/cleanup plan, but
no Docker or PostgreSQL effect occurred. It includes two narrow SQL corrections:
the public/anonymous pending cap excludes Owner Grant, and public accept's 3/day
limit uses the real edge bucket inherited at Encounter issuance rather than a
per-Encounter bucket. These corrections add no product API, table, operation, or
second migration.

### Codex

Exactly four zero-call logical commands are constructed, with zero thread, turn,
provider, and real Codex calls. During initialize, the second `initialized` write
may already follow a valid response. Future bytes cannot be known in advance;
post-response wire finality is unproven, so the causal and aggregate claims remain
Yellow.

### macOS

The future synthetic signing plan exposes one-run custom Keychain / PKCS#12
synthetic secrets briefly in local CLI argv, and `codesign` may incidentally read
the standard Keychain search list. Only zero explicit mutation and equal pre/post
metadata are claimed. The mechanism is transient and runs a direct helper; it makes
no Seatbelt or kernel-sandbox claim and proves neither persistence, crash recovery,
notarization, nor real provider end-to-end behavior.

## Authority and external-effects boundary

- Retry execution: **NOT_REQUESTED; not authorized; not performed**.
- First provider-call test: **NOT_REQUESTED; not authorized; not performed**.
- Deployment / merge / spend: **none / none / US$0**.
- Provider sessions / bytes / calls: **0 / 0 / 0**.
- Before publication, executed push commands / issue updates: **0 / 0**. One push
  and two issue updates remain future publication plans only; external outcomes are
  reportable only after they occur.

Any future Host Binding attempt or Retry requires a new, explicit Owner decision.
This manifest grants neither.

## R2 portability-correction notice

An Owner-approved post-I C layer now ends at
`383bf00611eaf180d4146f75e294deca49a4d5b1`, tree
`3b2ef06165975d2fad1e781aedbe04b91af49287`. Its only purpose was to replace the
macOS-only `/private/tmp` spelling with the canonical `realpath(/tmp)` authority in
the six approved construction/contract/audit paths and to preserve fail-closed
testing on GitHub's unsupported hardlinked Node runtime.

The historical implementation I, output R, evidence, and one-time Yellow Host
Binding attempt remain bound to their original commits and were not rerun or
reinterpreted. In particular:

- the fixed Host input was not inspected, opened, or read again;
- no capsule or public receipt was created;
- the runner after C is **NOT_HOST_BOUND**;
- Retry Execution and First Provider-Call Test remain **NOT_REQUESTED**;
- this manifest still contains no executable Retry command.

Ubuntu run
[`31278070883`](https://github.com/formehq/forme/actions/runs/31278070883)
completed `npm run check` Green after the earlier run
[`31277888019`](https://github.com/formehq/forme/actions/runs/31277888019)
correctly exposed the unsupported Node-file identity as a pre-child fail-closed
condition. Neither run performed Docker, PostgreSQL, real Codex, signing, Keychain,
LocalAuthentication, provider, deployment, or network effects.

The C layer does not grant authority to use this manifest. A future Retry still
requires a new successful Host Binding and a new explicit Owner grant.
