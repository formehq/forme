# R4 #67 Local PostgreSQL Physical Execution — APFS nlink Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-13
- Scope: repository-only correction of the private-root directory link-count contract
- Baseline Execution Review `E` HEAD / tree:
  `e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab` /
  `91f1a0aef6820bd4a145bc6d93acd0bbedc40992`
- Pending grant created: **false**
- Owner approval consumed: **false**
- Docker / OCI / PostgreSQL / SQL effects: **0 / 0 / 0 / 0**
- Gate C: **NOT_REQUESTED**

This Addendum requests only a repository correction. It does not authorize a
pending grant, physical execution, Docker, OCI, PostgreSQL or SQL. The exact
Execution Card and Review at the baseline remain immutable historical
authority artifacts, but they are no longer executable because the runner and
their canonical payload bind a private-root precondition that the observed
APFS host cannot satisfy. They may not be reused or revived after correction;
a new Card, Review and exact Owner approval are required.

This Addendum intentionally omits its own SHA-256 and commit/tree, its future
Owner Review SHA-256 and commit/tree, and all future implementation/evidence/
status hashes. Those values must be supplied externally in the correct order.

## 1. Exact failed-prepare truth

The Owner precisely approved the baseline one-use Physical Execution Card and
Review. The runner then attempted only its zero-Docker `prepare` entry.

| Artifact or fact | Exact value |
|---|---|
| Execution Card HEAD / tree | `421560cb6ac2fbbf52d104a5b71ade6347d9629f` / `2bb4bf20f4892af3f51887e7c7d4f2302b80169d` |
| Execution Card SHA-256 | `sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77` |
| Execution Review HEAD / tree | `e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab` / `91f1a0aef6820bd4a145bc6d93acd0bbedc40992` |
| Execution Review SHA-256 | `sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e` |
| Canonical execution payload | 5517 bytes / `sha256:207e2c81a88cafd8b2802c8ec92bb9aa2d52d6142bf24cff82fd0d5a40f33eb3` |
| Authority committed-byte audit | `sha256:7edc5a9bc03bba8801f6adbb3e812a18636d95486b4135acd59ce45d9e3ef08b` |
| Owner approval receipt | 863 bytes / `sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a`, NFC UTF-8, no NUL, no trailing LF, mode 0600, nlink 1 |
| Private-root observation | real current-uid mode-0700 APFS directory, exactly one `owner-approval-receipt`, directory nlink 3 |
| Frozen precondition | exact directory nlink 2 while the same directory contains exactly one receipt |
| Prepare result | `local_postgres_private_root_invalid` |
| Post-failure entries | exactly `owner-approval-receipt`; no pending/consumed grant, journal, Docker home/config, secret, imported runtime or evidence |

The failed prepare did not consume the grant because no pending grant existed.
It did not consume the one physical construction lifecycle and did not enter a
Docker, network, PostgreSQL or SQL port. The approval receipt is retained only
as private forensic evidence. Its bytes do not authorize a later corrected
runner.

## 2. Root cause

The frozen Packet requires a real current-uid mode-0700, **nlink-2** directory
that already contains exactly one regular receipt. The committed production
prepare entry repeats that requirement with `expectedRootNlink: 2n` before it
can derive authority or observe the Docker socket.

On the observed APFS host, a newly created empty directory reports nlink 2;
after the sole regular receipt is created, the same directory reports nlink 3.
The sole-entry, receipt type/mode/owner/nlink and realpath checks all pass, but
the fixed directory count rejects the valid state. Moving the same exact state
between `/private/tmp`, the user home, Documents and the private Codex area does
not change the behavior. This is a contract error, not host drift and not a
reason to forge stat data or weaken another membrane.

Directory link-count semantics are filesystem-specific and may legitimately
change when this workflow adds or removes authorized child entries. Therefore
no replacement exact constant (`2`, `3` or another value) is portable or
correct.

## 3. Approved correction design

The correction must do exactly all of the following:

1. Remove the fixed production `expectedRootNlink: 2n` equality and remove the
   fake adapter's ability to substitute an expected directory link count.
2. Keep `assertPrivateDirectory` fail-closed: absolute canonical path, real
   non-symlink directory, current uid, mode 0700 and a structurally valid
   directory link count of at least 2.
3. Capture one root identity containing exact path, device, inode, uid, gid
   and mode. Directory nlink is an observation, not an authority constant and
   is excluded from cross-phase identity equality because authorized child
   creation/removal can change it.
4. Revalidate that root identity before and after every approval-receipt read,
   authority derivation, CLI/socket observation, committed-binding check,
   pending write/cleanup, directory fsync and final root-entry check. A changed
   path, dev, inode, uid, gid or mode fails before further effects and never
   adopts the replacement.
5. Retain the exact entry-state membrane: before prepare, exactly one
   `owner-approval-receipt`; after successful prepare, exactly the receipt plus
   `grant.pending.json`. Every child remains no-follow, current-uid, exact
   mode/type/link-count/identity and same-descriptor validated. Unknown entries
   remain a hard stop.
6. Preserve all symlink, alias, root-replacement, same-path replacement,
   pending partial-write rollback, cleanup-failure truth and approval-receipt
   mutation denials. Do not replace them with a simple `nlink >= 2` test.
7. Add a portable filesystem test that observes the real link count of a
   temporary mode-0700 root containing one receipt and proves prepare does not
   require one universal count. On Darwin/APFS the observed regression value
   must be 3; on other supported filesystems their truthful value is accepted
   only while every stronger identity and exact-entry assertion passes.
8. Add hostile tests for directory link-count change without an authorized
   entry transition, gid/mode/dev/inode/path drift, extra entries, replacement
   before pending publication and cleanup ambiguity. Each must produce zero
   Docker/OCI/PostgreSQL/SQL effects and no false-clean claim.

The correction may not change grant v3, receipt v3, the canonical execution
payload shape, Docker/Pool/SQL ceilings, image choice, SQL bytes, catalog
contract, application/store/runtime code or production boundary.

## 4. Exact correction topology

The required direct, single-parent chain is:

```text
E  frozen failed Execution Review
└─ A  add this Addendum only
   └─ O  add the Correction Owner Review only
      └─ Kc  modify exactly runner + runner test
         └─ Lc  add exactly three correction machine-evidence paths
            └─ Mc  add correction report + modify nine status paths
```

- `A` must be the direct child of `E` and add only this file.
- `O` must be the direct child of `A` and add only
  `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-OWNER-REVIEW.md`.
- `Kc`, `Lc` and `Mc` must each be direct single-parent children with the exact
  deltas below. No merge, amend, rebase, squash, cherry-pick, replacement,
  rename, deletion or mode drift is accepted.

## 5. Exact fifteen-path correction workset

### `Kc`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lc`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-apfs-nlink-correction.json`
2. `schemas/r4/public-core/local-postgres-apfs-nlink-correction-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-apfs-nlink-correction-evidence.schema.json`

### `Mc`: one new report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total correction workset: exactly fifteen paths, eleven modified and four
added, across exactly three construction commits. The two authority documents
are inputs, not construction artifacts.

Every prior Stage-A/Stage-B/Effect-0 machine artifact, Packet, Review,
Construction Report, Execution Card/Review, dependency, lock, SQL,
application/store/runtime path and production configuration remains
byte-identical. The Owner-owned `native/macos/.build/` remains out of scope and
must not be read, staged, cleaned or changed.

## 6. Machine evidence and audit chronology

The correction repeats the non-self-referential `Kc → Lc → Mc` freeze:

1. Commit `Kc`; run the complete prior deny-network validation matrix plus the
   new portable/APFS and hostile root-identity cases. Produce a committed-byte
   two-path aggregate and independent 0B/0I audit.
2. Add in `Lc` one strict Ajv 2020-12 evidence schema, one artifact index over
   only committed `Kc` runner/test blobs, and one machine evidence record. The
   evidence binds `E/A/O/Kc`, the failed-prepare facts, all validations, zero
   effects and the interim stop. It does not bind itself or claim status
   surfaces are current.
3. Commit `Lc`, audit only committed blobs, then add in `Mc` the Correction
   Report and update exactly nine current-status paths. The report binds Kc/Lc
   and their external audits without self hash, Mc HEAD/tree or a future
   execution grant. A final committed-`Mc` audit remains external.
4. Any byte change invalidates every downstream hash and requires replay from
   that point. Candidate and committed audits must each report 0 Blocker /
   0 Important.

Required validation includes the complete previously frozen lanes (runner,
focused Public Core, wildcard Public Core, R4 offline, Gate-B successor,
spine, syntax, TypeScript, no-server-AI, legacy docs and diff-check), strict
schema/mutation tests, exact Git topology/blob aggregates and source-control
zero-effect checks. All fake tests remain deny-network and must not resolve or
invoke the real Docker socket, daemon, PostgreSQL or SQL.

## 7. Effect ceiling

| Effect | Maximum |
|---|---:|
| Correction construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| Repository-command / package / source-control external network | `0` |
| Pending or consumed grants | `0 / 0` |
| Docker CLI / daemon calls | `0 / 0` |
| OCI inspect / pull | `0 / 0` |
| PostgreSQL process / connection / database identity | `0 / 0 / 0` |
| SQL apply / verify / rollback / domain | `0 / 0 / 0 / 0` |
| Product or production network/database/data | `0` |
| Runtime / route / Vault / HTTPS / traffic | `0 / 0 / 0 / 0 / 0` |
| Real Room / Projection / Curator / Guest bytes | `0` |
| Provider / model / email | `0 / 0 / 0` |
| Deploy / publication / admission / Gate C | `0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / US$0` |

The failed private approval receipt may remain outside the repository only as
forensic evidence. It is inactive, may not be converted into a grant and is
not an exception to any zero-effect ceiling.

## 8. Invalidation and mandatory stop

After correction, the failed Execution Card
`sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77`,
Review
`sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e`
and private approval receipt
`sha256:0652fe3ac3125335728788bacc3e1cc2cee4a0f4b2417db662fb0a898fd6dd2a`
remain historical and non-executable. No successor may infer authority from
them or merely patch their payload.

The exact post-correction stop is:

`LOCAL_POSTGRES_APFS_NLINK_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_ONE_USE_PHYSICAL_EXECUTION_APPROVAL_REQUIRED / GATE_C_NOT_REQUESTED`

Only after `Mc` and its external committed-byte audit are frozen may a fresh
Execution Card and Review be proposed. Even that later approval remains local
and disposable; production and Gate C stay separate.

## 9. Approval mechanics

The exact Owner approval request must externally name:

- this Addendum's SHA-256 and its single-path proposal HEAD/tree;
- the Correction Owner Review SHA-256 and its single-path wrapper HEAD/tree;
- baseline `E` HEAD/tree and the failed Card/Review/payload/audit hashes;
- the failed receipt hash and exact zero-effect outcome;
- all eight correction rules in Section 3;
- the exact `Kc/Lc/Mc` topology and fifteen-path workset;
- every zero-effect ceiling; and
- the exact three-part stop in Section 8.

Any changed byte, omitted choice, alternate path, topology or effect ceiling
requires a newly frozen request.
