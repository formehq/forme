# R4 #67 Local PostgreSQL — APFS nlink Correction Construction Report

- Status: **TECHNICAL_REVIEW_GREEN**
- Updated: 2026-08-13
- Scope: repository-only APFS directory-link-count correction
- Physical execution: **NOT_RUN**
- Fresh one-use Physical Execution approval: **REQUIRED**
- Gate C: **NOT_REQUESTED**

This report freezes the approved `Kc → Lc → Mc` repository correction. It is
not a Physical Green receipt and grants no Docker, OCI, PostgreSQL, SQL,
production, runtime, route, traffic or Gate C authority. The failed Execution
Card, Review, canonical payload and private receipt remain immutable history
and are not executable after this correction.

The report intentionally omits its own SHA-256, the containing `Mc` HEAD/tree,
all status-document hashes, a committed-`Mc` audit hash and any future
Execution Card/Review or approval receipt. Those values cannot be known from
this report without self-reference.

## Exact authority and failed-prepare truth

| Binding | Exact value |
|---|---|
| Failed Execution Card HEAD / tree | `421560cb6ac2fbbf52d104a5b71ade6347d9629f` / `2bb4bf20f4892af3f51887e7c7d4f2302b80169d` |
| Failed Execution Card SHA-256 | `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77` |
| Failed Execution Review HEAD / tree | `e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab` / `91f1a0aef6820bd4a145bc6d93acd0bbedc40992` |
| Failed Execution Review SHA-256 | `sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e` |
| Canonical execution payload | 5517 bytes / `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3` |
| Failed private approval receipt | 863 bytes / `sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a` |
| Failed prepare | APFS root with one receipt had nlink 3; frozen runner required 2; result `local_postgres_private_root_invalid` |
| Failed-prepare effects | no pending/consumed grant; Docker/OCI/PostgreSQL/SQL `0 / 0 / 0 / 0` |
| Correction Addendum HEAD / tree | `04ad36bddbf7d2f62cdfc241f51a5cf817046aff` / `006c3bbf7f0a0e988c7afd65b425fbcefc1189b8` |
| Correction Addendum SHA-256 | `sha256:b1ad65b6033eeb0b3848544df596af362e49015613434c4eb2a06ce4f1e80e06` |
| Correction Owner Review HEAD / tree | `5ec9521e6c16c76ce3cd10ab9f6a1c8acad74544` / `513bf389aebb03bfc86464693facd2257084b5e4` |
| Correction Owner Review SHA-256 | `sha256:a33d6e8b70783e756169af0256f8f5f749461187fb79f343540788df70540bd6` |
| Correction authority audit summary | `sha256:e9206957b8af58e17156720065f6f84d3aa68aaafc351bc59eba2c3e5ac80f2f` |

## Committed construction

The required direct chain exists through the committed construction bytes:

```text
E e91e4fb → A 04ad36b → O 5ec9521
                             └─ Kc 18e3a32 (2M)
                                  └─ Lc 32448cb (3A)
                                       └─ Mc status freeze (this report + nine status updates)
```

### `Kc` implementation

- HEAD / tree / parent:
  `18e3a325cceabdf5168b5ffb328ee2580b069a76` /
  `184d9a4147fbb9baea22b1303ca24a09c2687a79` /
  `5ec9521e6c16c76ce3cd10ab9f6a1c8acad74544`.
- Exact delta: two modified mode-100644 paths, no add/delete/rename/mode drift.
- Runner: 372277 bytes /
  `sha256:4383a52908d7d51d3cac8d549212fa0e7f80c61796123f38280a47421c169b75`.
- Runner test: 120964 bytes /
  `sha256:8cc713943f973272aabfd5b3c3e838543e62a632f3917c2585239aac41c648f1`.
- G2c: `sha256:56e2e3b10236e693bf7813c3c97e0acbb6c897123c37918cfda9d8609294e130`.
- Committed audit summary:
  `sha256:eadd61948def5d6f14e8cab56bc06a30c8807d3711157876b12ab63a6bf5eb00`.

The implementation removes only the fixed directory-`nlink` equality and the
fake expected-count adapter. A root remains an absolute canonical real
current-uid mode-0700 directory with a structurally valid link count of at
least 2. Stable root identity is exact path/dev/ino/uid/gid/mode; directory
`nlink` is excluded because authorized child creation/removal can change it.
Exact child-entry, no-follow, receipt/pending identity, replacement, symlink,
partial-write and cleanup-failure membranes remain fail-closed.

### `Lc` machine evidence

- HEAD / tree / parent:
  `32448cb962c823d39205cc83d11aa3f6571cf65d` /
  `02b377385a0e68a60021f878027f41ab34399f63` /
  `18e3a325cceabdf5168b5ffb328ee2580b069a76`.
- Exact delta: three added mode-100644 paths.
- Artifact index: 4568 bytes /
  `sha256:d3b2ce01350636bbcd6fbde1ee938c6cd5c55f7b8d5e38e72fa4f6dbd5d67056`.
- Strict evidence schema: 20504 bytes /
  `sha256:1cbd487272b052ef9116e473249824476b954e4e07818eb7d90b6079ffd6826a`.
- Machine evidence: 8918 bytes /
  `sha256:19788c80464ca23e03d5dab6aaf8d810c8541362f414e96d25ab7b9495a1300c`.
- G3c: `sha256:ca82c68b1c065db2d2adfac81229106a34048e9a220341cd946fd7263f0bcc2d`.
- Committed audit summary:
  `sha256:01344b279f87b722a9898bda40b27c226e9a67ae24742ecbed82724b86bce58f`.
- Strict Ajv 2020 positive validation and 13 mutation groups passed from
  committed blobs.

## Validation result

All tests were deny-network/fake-only. Counts are final `Kc` counts, not the
historical Physical Rebind totals.

| Lane | Passed / total |
|---|---:|
| Local PostgreSQL runner | `141 / 141` |
| Focused non-runner Public Core | `85 / 85` |
| Wildcard Public Core | `393 / 393` |
| R4 offline | `713 / 713` |
| Gate-B successor | `145 / 145` |
| Spine | `45 / 45` |

Runner syntax, TypeScript, hosted-room no-server-AI, legacy R4 document audit
and `git diff --check` also passed. The portable filesystem case observed
Darwin/APFS nlink 3 with one receipt and nlink 4 after the fake pending child;
the unauthorized entry transition, gid/mode/dev/inode/path replacement,
symlink/alias, extra-entry, partial-write and cleanup ambiguity cases remained
fail-closed with zero real effects.

## Effect and readiness truth

Construction made zero external-network, pending/consumed grant, Docker CLI,
Docker daemon, OCI, PostgreSQL process/connection/database, SQL
apply/verify/rollback/domain, production data, runtime/route/Vault/HTTPS,
traffic, real actor, Provider/model/email, deploy/publication/admission/Gate C,
push/PR/merge/release or spend effects.

Therefore:

- corrected runner construction: **true**;
- disposable local PostgreSQL execution: **false**;
- Docker/image/daemon observation: **false**;
- target PostgreSQL/server/catalog observation: **false**;
- production Pool/migration/runtime/route/traffic: **false**;
- Physical Green: **false**;
- Gate C ready: **false**;
- #67 Done / R4 Done: **false / false**.

The nine operational status surfaces are aligned by `Mc`, but this report does
not claim every tracked repository document is current. Historical authority
and evidence documents retain their dated truth.

## Mandatory stop

`LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

The only allowed next proposal is a fresh one-use Physical Execution Card and
Owner Review that bind committed `Mc` and its external committed-byte audit.
No pending grant or physical execution may begin from the failed Card, Review,
payload or private receipt.
