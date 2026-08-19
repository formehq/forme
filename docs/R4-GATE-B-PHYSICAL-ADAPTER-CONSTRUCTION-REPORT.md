# R4 Gate B Physical Adapter Construction Report

- Finished: 2026-08-08
- Verdict: **YELLOW — PHASE A FAKE-ONLY GREEN; HOST BINDING INCOMPLETE**
- Host-Binding / Adapter Construction Grant: **APPROVED AND CONSUMED ONCE**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**

## Outcome

The approved 48-path physical-construction workset is frozen as implementation
`92c6c3f8896494aed699671a04a93a09fb59087d`, tree
`cf2ce5567c601fff1ad709e565dde41cf9c3540d`. Phase A completed Green within its
fake-only boundary. Exactly one Host Binding attempt then consumed the mode-0600
input at `.forme/gate-b-host-binding-input.v1.json` and stopped with
`HOST_BOUND_PATH_SYMLINKED` before any Host inspector ran. The aggregate result is
therefore Yellow, not a physical Retry approval.

No Owner-supplied value is reproduced in this report.

## Frozen authority and evidence

| Item | Exact value |
| --- | --- |
| Construction Packet | `sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06` |
| Owner Review | `sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9` |
| Approved proposal | HEAD `a45ea061e8e92f247597787e36ecfe52740b216a`, tree `89b28903fc34e985a17e8f3fdc4bfd7d0972880e` |
| Implementation I | HEAD `92c6c3f8896494aed699671a04a93a09fb59087d`, tree `cf2ce5567c601fff1ad709e565dde41cf9c3540d` |
| Construction checkpoint | `sha256:284b7b5eebc46167a75fc8ba4dc3b68be15ec4c7905af7f943d7e2639e78dded` |
| Validation record | `sha256:0c592035cabb53a744f066ea200b775aeba99330eb103171234495e6320837fd` |
| Independent Audit A receipt | `sha256:11d077f2c88fcbbb48bbfc9763ea676785d2a6ffe25834d8015e094f1adfdec9` |
| Independent Audit B receipt | `sha256:d38f7ad3dd7dceaa002023eb3a29fb666515e19db393857f3dca1ba5bb21ac7c` |
| Independent Audit C receipt | `sha256:2b7111df2aa6ae719da2434e5ef39f2a1896448e1efe5c54ff62eeb54cfb18e6` |

## Validation result

| Measure | Observed |
| --- | ---: |
| Approved implementation paths | 48 |
| Offline test files / passed tests | 54 / 468 |
| Physical-runner tests | 49 |
| Host Binding tests | 16 |
| Fake child starts | 72,989 |
| Normal compiler starts | 2 |
| Real PostgreSQL / Codex / sandbox / signing / Keychain / LA / helper / provider effects | 0 |

The Green claim is limited to deterministic fake/fault construction, blocked-start
and cleanup exercises. It is not a PostgreSQL lane Green, real Codex Green, macOS
transient-mechanism Green, deployment Green, or provider end-to-end result.

## The single Host Binding attempt

- Attempts consumed: **1**.
- The fixed mode-0600 input was consumed, zeroized, unlinked, and observed absent.
- Terminal reason: `HOST_BOUND_PATH_SYMLINKED`.
- Stop point: before Docker CLI inspection, Docker Unix-socket inspection, or macOS
  inspection.
- Observed read-only counts, in contract order: **0 / 0 / 0**.
- Cleanup: Green; the input, Construction root, Construction journal, and all
  journal-authorized process groups were observed absent.
- No Host Binding capsule exists and no public Host Binding receipt exists.

This terminal state supplies neither a valid Host Binding nor Retry authority. No
automatic second Host attempt was made.

## Required narrow disclosures

### PostgreSQL SQL corrections

The constructed SQL includes only the two approved narrow corrections:

1. The public/anonymous pending cap excludes Owner Grant interactions.
2. Public accept's 3/day limit uses the real edge bucket inherited when the
   Encounter is issued, rather than a separate bucket per Encounter.

These corrections add no product API, table, operation, or second migration.

### Codex causal limit

The constructed Codex matrix covers exactly four zero-call logical commands and
keeps thread starts, turn starts, provider calls, and real Codex authority at zero.
For initialize, the second `initialized` write may already occur after a valid
response. Unknown future bytes cannot be known in advance, so post-response wire
finality remains unproven. The accepted causal claim, and therefore the aggregate
Codex claim, remains Yellow.

### Synthetic CLI-signing exposure

In a future separately approved Retry, one-run custom Keychain / PKCS#12 synthetic
secrets would briefly appear in local CLI argv. `codesign` may incidentally read the
standard Keychain search list. The construction claims only zero explicit mutation
and equal pre/post metadata; it does not claim that those reads cannot occur.

### Transient macOS claim

The macOS design is only a transient mechanism: a direct helper with no Seatbelt or
kernel-sandbox claim. It is not a persistence, crash-recovery, notarization, or real
provider end-to-end claim.

## Closed effects and publication boundary

- Retry Execution Grant and First Provider-Call Test Grant remain
  **NOT_REQUESTED**.
- Provider sessions / provider bytes / provider spend: **0 / 0 / US$0**.
- Deployment, merge, and public traffic: **none**.
- Before publication, executed push commands and issue updates are **0 / 0**.
  The evidence records one future publication push and two future issue updates as
  plans only; any external outcomes must be recorded later, after they actually
  occur.

The companion Retry manifest is deliberately **NON-APPROVABLE Yellow** and contains
no executable Retry command.

## R2 addendum — approved post-I portability correction

The historical implementation, evidence, and single Host Binding attempt above
remain frozen exactly as recorded. They are not rebound to later code. After that
record was published, the Owner approved a narrow C-layer correction for an Ubuntu
CI portability defect: construction-only temporary roots had assumed the macOS
`/private/tmp` spelling even though Linux canonically exposes `/tmp`.

The correction is the strict linear pair below:

| Layer | HEAD | Tree | Result |
| --- | --- | --- | --- |
| Historical output R | `63ae16940faf17694152cffa12848e62c2933c52` | `ebfd96e7c1003c076d417798e53430891f60f057` | Frozen Yellow record |
| C1 | `63979037c2b43a0ca7e62d3edb9c39b69ab48669` | `4fbea4f69c59c80fe4fcee44fde586b31e9c4318` | Canonical `/tmp` portability correction |
| C2 / final C | `383bf00611eaf180d4146f75e294deca49a4d5b1` | `3b2ef06165975d2fad1e781aedbe04b91af49287` | Unsupported CI Node identity remains fail-closed |

Across `R..C`, exactly these six paths changed:

| Path | SHA-256 at C |
| --- | --- |
| `scripts/r4-gate-b-physical-port.mjs` | `sha256:5d52f3336f722ceb716fe3815ad1696397bb6b834e775fb5d053b93fa707215f` |
| `scripts/r4-gate-b-physical-runner.mjs` | `sha256:20ad515b02972d43bb670bb1363858e55e8690d5c3b8f43f966f87dc1bacf426` |
| `test/r4-gate-b-core/physical-runner.test.ts` | `sha256:2b7568522d17dcd04a9ac73a68cecc10a03fbfc6c90a707500049df729c1d6d1` |
| `schemas/r4/gate-b-core/physical-runner-contract.json` | `sha256:def50fae98a3452c1ac4053cb39168334a6daf930e0edc05cd64cea2875de9e2` |
| `schemas/r4/gate-b-core/artifact-index.json` | `sha256:1d64f9f15fc47490d3ee7c5de5261e967a749055c89753bf95170f726997ea6b` |
| `scripts/r4-doc-audit.mjs` | `sha256:9d8ef86446877637bebda4bb83d96fd3da914523f56ac9ebc82eba609fece283` |

The implementation now derives its system temporary-root authority only from
`realpath(/tmp)`. It does not trust `TMPDIR`, `os.tmpdir()`, or caller input. The
production Phase-A branch/workset gate and blocked-start Node identity checks were
not relaxed. A detached/post-output checkout still stops before a journal, private
root, child process, or external effect; a CI Node binary with unsupported link
identity likewise stops before child start and removes its private test root.

GitHub Actions run
[`31277888019`](https://github.com/formehq/forme/actions/runs/31277888019)
proved the latter fail-closed condition. C2 then taught the offline test to record
that safe refusal without treating it as production authority. Run
[`31278070883`](https://github.com/formehq/forme/actions/runs/31278070883)
completed `npm run check` Green on Ubuntu in 1m24s. Local validation also completed
50/50 physical-runner tests, 130/130 Gate-B Core tests, typecheck, both applicable
documentation audits, and the full 468-test `npm run check` aggregate.

No second Host Binding attempt occurred. The fixed Host input was not inspected,
opened, or read; the historical Yellow observation and evidence hash
`sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e`
remain unchanged. The runner at C is explicitly **NOT_HOST_BOUND**. Retry Execution
and First Provider-Call Test remain **NOT_REQUESTED**, with zero real physical,
provider, deployment, merge, traffic, or spend effects in this correction.
