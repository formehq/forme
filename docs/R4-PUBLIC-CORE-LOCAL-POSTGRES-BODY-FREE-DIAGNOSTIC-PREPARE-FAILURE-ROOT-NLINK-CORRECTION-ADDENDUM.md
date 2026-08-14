# R4 #67 Prepare-Failure Root nlink Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Scope: **correct one pre-approval forensic-root observation**
- Correction Construction / Replacement Diagnostic: **NOT_AUTHORIZED / NOT_REQUESTED**
- Docker / Cleanup / Physical Execution / Gate C: **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**

This Addendum corrects one observation in the committed but unapproved
Prepare-Failure Correction Addendum and Review. It authorizes no
implementation, retry, root mutation, Docker call or cleanup.

## Exact predecessor bindings

| Binding | Exact value |
|---|---|
| Prepare-Failure Addendum SHA / `H` HEAD / tree | `sha256:ae774a9233b1b0c5a69d40f1ce19634f9d6ae4b6a264cb7c289548ddc06dc060` / `adba739824e92c248c2afe254f083227e9d245b4` / `9a7a44bbb03f8c518d883326240bcc8098a538b3` |
| Prepare-Failure Review SHA / `HV` HEAD / tree | `sha256:258a1fea0bf77d2be4aa09f655575c8c9afba5ab3f188e9189eb80cc1662eaaa` / `ea49e9926bbb786197e4df75d7f242179a4b3a72` / `9b6ff1447c38c36da7c821c64ebeb7723329a162` |

Both predecessor documents say the failed-prepare root's nlink is exactly 2.
That value came from the empty root immediately after `mktemp`, before the
Owner receipt was installed. The committed final audit, after the failed
prepare and with the one retained receipt present, observed nlink 3.

## Corrected forensic truth

The root remains `/private/tmp/forme-r4-body-free-inspect-hbBcXlvY`, device
`16777231`, inode `33551700`, mode `0700`, uid `501`. It contains exactly one
entry, the 1072-byte mode-0600 regular file `owner-approval-receipt`, SHA-256
`4baf2407eb68ee5dfe9e5928f7cfd8a4bd3bdb7526c3e4394d0b5d244f924953`.
Current directory nlink is 3.

For this APFS root, nlink is an observed filesystem fact, not an exact stable
closure count. Correction construction must require a real, non-symlink,
current-uid mode-0700 directory with nlink at least 2, while exact entry
closure is proved independently by no-follow identity checks plus sorted
`readdir`. It must not infer entry count from nlink or rewrite history to say
the post-receipt root had nlink 2.

All other H/HV values and eight choices remain unchanged. In particular the
prepare attempt remains used, no pending/consumed grant exists, Docker calls
remain zero and the root remains immutable.

## Corrected topology and approval

The proposal chain becomes:

`FR1 -> H -> HV -> N (this Addendum only) -> NV (Review only) -> Kp -> Lp -> Mp`

`N/NV` are authority documents outside the exact 15-path/3-commit
construction workset. A later approval must bind H/HV and N/NV together,
accept this nlink correction and all eight original choices, and keep every
effect boundary unchanged.

Current stop:

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILED_UNCLASSIFIED / ROOT_NLINK_CORRECTION_OWNER_APPROVAL_REQUIRED / CORRECTION_CONSTRUCTION_NOT_STARTED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Do not implement or retry from this Addendum alone.
