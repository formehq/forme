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
