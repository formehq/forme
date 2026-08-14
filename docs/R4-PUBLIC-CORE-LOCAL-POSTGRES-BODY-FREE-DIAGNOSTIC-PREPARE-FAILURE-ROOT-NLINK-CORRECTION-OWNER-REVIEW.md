# R4 #67 Prepare-Failure Root nlink Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- nlink Correction Addendum SHA-256:
  `sha256:5f573a18da85cb13f46d887e06a24d31a4acc390e9673432a185850e44645f5b`
- correction proposal `N` HEAD / tree:
  `ef08c586eaa4aab6a125d7a8d533362c6986faf8` /
  `39bd34d6ad65c15ddffe5944048e51dbeb4b4793`
- Prepare-Failure Review `HV` HEAD / tree:
  `ea49e9926bbb786197e4df75d7f242179a4b3a72` /
  `9b6ff1447c38c36da7c821c64ebeb7723329a162`
- Construction / replacement prepare / Docker / cleanup: **NOT_AUTHORIZED / NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**

This Review asks for one narrow correction together with the eight choices in
the existing Prepare-Failure Correction Review. It creates no grant, does not
enter the retained root and performs no Docker, socket, PostgreSQL or cleanup
action. It omits its own SHA and containing `NV` commit/tree.

## Four correction choices

1. **Correct the observation chronology.** nlink 2 was observed on the empty
   root before installing the Owner receipt. The final one-entry root currently
   reports nlink 3. H/HV's final-root nlink 2 statement is superseded.
2. **Keep stable identity exact.** The canonical path, device `16777231`, inode
   `33551700`, mode `0700`, uid `501`, exact sole receipt name, 1072 bytes and
   receipt SHA
   `sha256:4baf2407eb68ee5dfe9e5928f7cfd8a4bd3bdb7526c3e4394d0b5d244f924953`
   remain exact. The root is immutable.
3. **Use nlink only as a lower-bound safety check.** Construction must require
   a real current-uid mode-0700 directory with nlink at least 2. Exact closure
   comes from no-follow identity checks and sorted `readdir`, never from nlink.
4. **Preserve everything else.** Accept all eight H/HV correction choices,
   exact Kp/Lp/Mp 15-path/3-commit workset, future V2 paths and zero-effect
   boundaries. The V1 prepare remains used; replacement diagnostic, cleanup,
   Physical Execution, production and Gate C remain `NOT_REQUESTED`.

## Exact combined binding

| Binding | Exact value |
|---|---|
| H SHA / HEAD / tree | `sha256:ae774a9233b1b0c5a69d40f1ce19634f9d6ae4b6a264cb7c289548ddc06dc060` / `adba739824e92c248c2afe254f083227e9d245b4` / `9a7a44bbb03f8c518d883326240bcc8098a538b3` |
| HV SHA / HEAD / tree | `sha256:258a1fea0bf77d2be4aa09f655575c8c9afba5ab3f188e9189eb80cc1662eaaa` / `ea49e9926bbb786197e4df75d7f242179a4b3a72` / `9b6ff1447c38c36da7c821c64ebeb7723329a162` |
| N SHA / HEAD / tree | `sha256:5f573a18da85cb13f46d887e06a24d31a4acc390e9673432a185850e44645f5b` / `ef08c586eaa4aab6a125d7a8d533362c6986faf8` / `39bd34d6ad65c15ddffe5944048e51dbeb4b4793` |

The exact chain is `FR1 -> H -> HV -> N -> NV`; every step is a direct,
single-parent, one-path mode-100644 addition. Construction may begin only
after a later approval also names this Review's externally computed SHA and
`NV` HEAD/tree.

## Stop and approval mechanics

A later approval must accept all four choices here and all eight H/HV choices,
bind all four authority documents, approve only Kp/Lp/Mp correction
construction, and explicitly keep Replacement Diagnostic, Cleanup, Physical
Execution, production and Gate C `NOT_REQUESTED`.

Current stop:

`LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_FAILED_UNCLASSIFIED / PREPARE_FAILURE_CORRECTION_OWNER_APPROVAL_REQUIRED / REPLACEMENT_DIAGNOSTIC_NOT_REQUESTED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Do not implement or retry from this Review alone.
