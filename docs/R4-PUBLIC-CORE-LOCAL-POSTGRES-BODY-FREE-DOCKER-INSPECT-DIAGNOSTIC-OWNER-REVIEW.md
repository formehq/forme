# R4 #67 Body-Free Docker Inspect Diagnostic Capture — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Updated: 2026-08-14
- Addendum SHA-256:
  `sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13`
- Addendum proposal `F` HEAD / tree:
  `931dbb7278bb06bf219ae7553b4317db415de0e7` /
  `22db25181c284d980f4e5d9cbf5cd5e3d7c6a725`
- Baseline Rescue Owner Review `RR` HEAD / tree:
  `ac1dfea899f2edff6ec59dd401d8aec6256a485f` /
  `4c93a2bbe68efae13b4caaecfd3f39cdffb9964b`
- Cleanup rescue: **consumed once; `FAILED / BLOCKED`; no retry available**
- New Docker / Physical Execution / Production / Gate C authority:
  **NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED**

This Review is the short decision surface for the committed Addendum above.
It creates no grant and performs no Docker, OCI, PostgreSQL, SQL, cleanup,
production or network action. It authorizes nothing until the Owner later
approves the exact Addendum SHA, this Review's externally computed SHA, the
exact `F` and future `FV` HEAD/trees, and all nine choices below.

This file omits its own SHA-256 and future containing commit/tree. It also
omits every future `Kf/Lf/Mf`, Diagnostic Card/Review, diagnostic grant,
diagnostic receipt and result-driven cleanup-correction hash. Those values do
not yet exist and must not be guessed.

## Nine Owner choices

Exact construction approval accepts all nine choices together:

1. **Accept the failed rescue truth.** Bind Rescue Card
   `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf`,
   Rescue Review
   `sha256:db692b6a074ec60d324ceede4a74136c26a3f53d3eba31c265d7a9f4297ed154`,
   payload
   `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e`,
   consumed rescue grant
   `sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654`,
   final rescue evidence
   `sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979`
   and journal `6` /
   `sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491`.
   The result is exactly `FAILED / local_postgres_docker_call_failed /
   BLOCKED`, not cleanup Green or Physical Green.
2. **Preserve both forensic roots and both consumed grants.** Never revive or
   retry either grant; never modify, remove or reclassify either root or its
   evidence. Bind the old root/inode/four files and the rescue
   root/inode/four files exactly. A later diagnostic prepare must revalidate
   both and stop on any drift.
3. **Approve construction of observation only.** Add a separate body-free
   Docker inspect diagnostic prepare/execute membrane. Preserve general
   physical and cleanup-rescue behavior and the current missing-diagnostic
   table unchanged. Do not add guessed strings, substring/regex matching or a
   generic status-1 absence rule.
4. **Approve the future diagnostic ceiling as design only.** A later,
   separately approved diagnostic may use exactly one Docker `version` and one
   exact-name `container.inspect`; every other Docker kind is zero. It may not
   stop, remove, create, start, pull, inspect network/volume, open a port,
   connect to PostgreSQL or execute SQL. This construction approval does not
   activate that ceiling.
5. **Approve the closed body-free observation contract.** Record only command
   ordinal, write-ahead effect identity, spawn outcome, safe exit/signal
   fields, stdout/stderr byte counts and SHA-256s, UTF-8/empty/line-ending/line
   count classifications, and a closed outcome enum. Raw output bodies and
   arbitrary labels never enter journal, receipt, evidence, logs, errors or
   repository bytes. Observation success never implies resource absence or
   cleanup authority.
6. **Approve exactly fifteen construction paths and three commits.** Require
   the direct chain `RR -> F -> FV -> Kf -> Lf -> Mf`. `Kf` modifies only
   runner/test; `Lf` adds only three machine-evidence paths; `Mf` adds one
   report and modifies only nine status paths. Total: eleven modified plus
   four added. No alternate path, merge, rename, deletion, mode drift or
   fourth construction commit.
7. **Require strict evidence and hostile validation.** Bind committed
   runner/test bytes, both forensic roots, the failed rescue grant/evidence/
   journal and the zero-effect construction in a one-way artifact DAG. Test
   empty/binary/multiline outputs, all spawn outcomes, call ceilings, one-use,
   crash, duplicate consume, expiry, host/root/worktree drift and every
   grant/receipt/journal mutation without touching real Docker or network.
   Candidate and committed audits must each be `0 Blocker / 0 Important`.
8. **Preserve unrelated bytes and zero construction effects.** Dependencies,
   lock, SQL, application/store/runtime, old authority/evidence bytes and every
   unlisted path remain unchanged. No external network, diagnostic grant,
   Docker/socket/OCI/PostgreSQL/SQL, cleanup, production, Provider, deployment,
   push/PR, merge/release or spend effect is authorized. Owner `.build` remains
   unread and unstaged.
9. **Stop before diagnostic execution and before cleanup.** After committed
   `Kf/Lf/Mf` and external 0B/0I audit, stop for a separately proposed
   Diagnostic Card/Review. After an approved diagnostic captures a body-free
   observation, stop again for result review and a new correction proposal.
   No diagnostic construction or observation authorizes cleanup, Physical
   Execution, production, Gate C, #67 Done or R4 Done.

## Exact failed rescue bindings

| Binding | Exact value |
|---|---|
| Rescue Card SHA / `CR` | `sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf` / `fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5` |
| Rescue Review SHA / `RR` | `sha256:db692b6a074ec60d324ceede4a74136c26a3f53d3eba31c265d7a9f4297ed154` / `ac1dfea899f2edff6ec59dd401d8aec6256a485f` |
| rescue authority payload | `sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e` |
| rescue Owner receipt | 1085 bytes / `sha256:21744a1ab338128f912f046159ef4ebdf74b197088bfa4973ff8d6a597e9475d` |
| rescue consumed grant / ID | 4796 bytes / `sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654` / `c89d8f4e678dcf2778925af338bb1180` |
| rescue final evidence | 5109 bytes / `sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979` |
| rescue journal | 6 entries / `sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491` |

The rescue root is
`/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn`, device/inode/mode/uid
`16777231 / 33273981 / 0700 / 501`, with exactly:

1. `cleanup-rescue-evidence.json`
2. `owner-approval-receipt`
3. `rescue-journal-v1`
4. `rescue.consumed.json`

The old blocked root remains
`/private/tmp/forme-r4-pg-9ZGIOLeX`, device/inode/mode/uid
`16777231 / 32871902 / 0700 / 501`, with unchanged consumed grant
`sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35`,
evidence
`sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c`
and journal `34` /
`sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25`.

The exact Docker effects of the rescue were `version = 1`,
`container.inspect = 1`, every other kind `0`. Both calls have durable attempt
and completion entries. Resource counts remain `UNKNOWN`; no cleanup occurred.

## Exact construction workset

### `Kf`: exactly two modified paths

1. `scripts/r4-public-core-local-postgres.mjs`
2. `test/r4/public-core-local-postgres.test.ts`

### `Lf`: exactly three added paths

1. `docs/evidence/r4-public-core-local-postgres-body-free-docker-inspect-diagnostic.json`
2. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-artifact-index.json`
3. `schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-evidence.schema.json`

### `Mf`: one added report and exactly nine modified status paths

1. `README.md`
2. `docs/CONTROL.md`
3. `docs/DECISIONS.md`
4. `docs/README.md`
5. `docs/NATIVE-HARNESS-ARCHITECTURE.md`
6. `docs/PRODUCT.md`
7. `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
8. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md`
9. `docs/ROADMAP.md`
10. `docs/VALIDATION.md`

Total construction workset: exactly fifteen paths, eleven modified and four
added, across exactly three commits. The Addendum and this Review are authority
inputs, not construction artifacts.

The later unique diagnostic authority paths are:

1. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD.md`
2. `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW.md`

They are outside the fifteen-path workset and remain future, non-authorized
proposal paths.

## Exact topology

```text
RR ac1dfea
└─ F 931dbb7  Addendum only
   └─ FV  this Review only
      └─ Kf  2M runner/test
         └─ Lf  3A machine evidence
            └─ Mf  9M + 1A status freeze
               └─ FC  later Diagnostic Card only
                  └─ FR  later Diagnostic Owner Review only
```

`RR` is bound by tree
`4c93a2bbe68efae13b4caaecfd3f39cdffb9964b`. `F` is its direct
single-path child and is bound by tree
`22db25181c284d980f4e5d9cbf5cd5e3d7c6a725`. Any alternate parent, tree,
delta or changed Addendum byte invalidates this Review.

## Exact future diagnostic design ceiling

| Effect | Maximum in a later separately approved diagnostic |
|---|---:|
| diagnostic prepare / consume / lifecycle | `1 / 1 / 1` |
| Docker `version` | `1` |
| Docker `container.inspect` | `1` |
| all other Docker kinds | `0` |
| stop / remove / create / start / pull | `0 / 0 / 0 / 0 / 0` |
| network / volume inspect | `0 / 0` |
| PostgreSQL / connection / database / SQL | `0 / 0 / 0 / 0` |
| old/rescue root mutation | `0 / 0` |
| Physical Execution / production / Gate C | `NOT_REQUESTED / NOT_REQUESTED / NOT_REQUESTED` |

These are design constraints, not present effect authority.

## Zero-effect ceiling selected now

| Effect | Maximum after exact construction approval |
|---|---:|
| Construction paths / commits | `15 / 3` |
| Dependency / lock / SQL changes | `0 / 0 / 0` |
| External network | `0` |
| Pending / consumed diagnostic grants | `0 / 0` |
| Docker / socket / OCI / PostgreSQL / SQL calls | `0 / 0 / 0 / 0 / 0` |
| Cleanup / product / production / traffic / Gate C | `0 / 0 / 0 / 0 / 0` |
| Push / PR / merge / release / spend | `0 / 0 / 0 / 0 / 0` |

## Required validation

Construction Technical Review Green requires:

- exact committed `RR/F/FV/Kf/Lf/Mf` topology and path/mode deltas;
- exact `Md/G10d`, Rescue Card/Review/payload, both consumed grants, both
  evidence records, both journals and both root identities;
- strict body-free observation grant/journal/receipt schemas and hostile
  mutation matrix;
- exact future Docker argv and one-call ceilings with every mutation command
  denied;
- output fingerprint, UTF-8, binary, multiline, timeout, signal, spawn-error,
  root/host/worktree/clock/crash/duplicate tests through injected ports only;
- strict Ajv, aggregate, cross-hash, link, DAG, documentation, syntax,
  TypeScript, no-server-AI and `git diff --check` lanes; and
- candidate and committed independent audits at `0 Blocker / 0 Important`,
  with zero Docker, socket, PostgreSQL, SQL or external-network effects.

## Mandatory stops

Before exact Owner approval:

`BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_OWNER_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After committed construction and independent Green:

`LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_DOCKER_INSPECT_DIAGNOSTIC_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

After a later separately approved body-free diagnostic:

`LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_OBSERVED / DIAGNOSTIC_RESULT_CORRECTION_APPROVAL_REQUIRED / PHYSICAL_EXECUTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

No approval of this Review may be read as diagnostic execution, cleanup,
Physical Execution, production or Gate C authority.

## Exact approval mechanics

A later Owner approval must externally name all of:

- Addendum SHA
  `sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13`
  and `F` HEAD/tree
  `931dbb7278bb06bf219ae7553b4317db415de0e7` /
  `22db25181c284d980f4e5d9cbf5cd5e3d7c6a725`;
- this Review's externally computed SHA-256 and future `FV` HEAD/tree;
- all nine choices, the exact `Kf/Lf/Mf` fifteen-path/three-commit workset,
  future versioned Diagnostic Card/Review paths and every zero-effect boundary;
- `Body-Free Docker Inspect Diagnostic Construction APPROVED`; and
- `Docker Diagnostic NOT_REQUESTED`, `Cleanup NOT_REQUESTED`,
  `Physical Execution NOT_REQUESTED`, `Production NOT_REQUESTED` and
  `Gate C NOT_REQUESTED`.

Any omitted choice, changed byte, alternate path or broader effect requires a
new Addendum/Review.
