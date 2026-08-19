# R4 Gate B Retry Construction Packet v0.1

- Status: **approval candidate; `PROPOSED_NOT_EXECUTED`**
- Parent authority: R4 Technical Control Packet v0.2
- Parent Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Original Gate B Manifest SHA-256:
  `sha256:ba0f9ce389c6668aef5e41fb2e6228d8838d7bea481f942b2a025620d37ad5fa`
- Red execution report SHA-256:
  `sha256:01469865af1cb851ec0167d7493ca16eab827f6be53f8a15659221fd64796e18`
- Red machine evidence SHA-256:
  `sha256:647a87ee00597f8cf3fdf9e8a7ea7b4d3f803a1f562197ed757e61423e894f48`
- Retry Construction Grant: **REQUESTED BY THIS PACKET**
- Retry Execution Grant: **NOT REQUESTED**
- First Provider-Call Test Grant: **NOT REQUESTED**
- Provider sessions / bytes / spend authorized here: **0 / 0 / US$0**

This Packet does not retry Gate B. It authorizes, only after exact Owner
approval, construction and offline review of the runner that a later retry
would use. Docker, a real Codex executable, macOS signing/Keychain, user
presence, and every real runtime probe remain behind a second hash-pinned
Execution Grant.

This file intentionally does not contain its own SHA-256. The separate
low-load Owner Review binds the final byte hash after this Packet freezes.

## 1. What is being corrected

The first Gate B attempt failed before the fixed lane sequence began. A
delegated Codex-lane investigation used a recursive hash search whose scope
included real Codex-home session files. The command emitted paths rather than
file contents or credentials and started no thread, turn, model, account, or
provider request. The read itself violated the approved boundary, so the run
correctly stopped Red.

Two execution-design defects made that incident possible:

1. construction and real probe execution lived under one approval, so a task
   preparing code could also invoke the real runtime;
2. lanes were delegated in parallel, leaving an Agent free to investigate an
   unexpected hash result with a generic filesystem search before the audited
   aggregate runner existed.

The correction is not “be more careful.” It changes the authority shape:

```text
Retry Construction Gate — this Packet
repo-only code + fixture tests + reviewed aggregate runner
no Docker · no real Codex runtime · no signing/Keychain · no test network
                         ↓
return exact hashes + separate Execution Manifest + STOP
                         ↓
Retry Execution Gate — not requested here
one pre-reviewed command · strict serial lanes · no investigation
                         ↓
body-free verdict + cleanup + STOP
                         ↓
First Provider-Call Test Grant — still separately gated
```

## 2. Exact authority ceiling

Approval of this Packet authorizes only:

1. one primary Agent, working serially in the Forme repository, to construct
   the exact repository workset in Section 4;
2. deterministic generation of closed API, local-format, and evidence schemas
   from the already-frozen Gate B inputs;
3. static SQL construction and parser/fixture tests with no database process;
4. in-memory encrypted-field and fake-transport tests using synthetic keys and
   fixture-only thread/turn identifiers;
5. Codex-adapter construction against a fake executable and pinned static
   schema fixtures only;
6. native macOS source construction plus compile/unit tests that create no
   signed app, certificate, Keychain item, user-presence prompt, or sandboxed
   child runtime;
7. construction and adversarial fixture testing of an exact path fence and
   one aggregate runner in dry-run mode;
8. Gate A regression, TypeScript typecheck, offline repository tests, package
   surface checks, and static effect audits;
9. production of a body-free Construction Report and a new exact Retry
   Execution Manifest/Owner Review; and
10. intentional commit, push, Draft PR maintenance, and GitHub project-state
    synchronization without merge.

Approval does **not** authorize:

- invoking, staging, copying, version-checking, asking help from, generating
  schema with, or initializing any real Codex executable;
- reading or enumerating real Codex home, auth, session, rollout, memory,
  config, plugin, Skill, log, state, or account files;
- Docker commands, image download, container, volume, PostgreSQL process, or
  SQL execution;
- building or launching a signed `FormeLocal.app`, creating a certificate or
  Keychain, using Secure Enclave, running Seatbelt/sandbox probes, or asking
  for user presence;
- any network request other than the separately authorized Git/GitHub publish
  actions after local construction completes;
- a Codex thread, turn, model/account lookup, provider request, Guest/source
  body, email/message, hosted/production mutation, production migration,
  deployment/public traffic, production secret, merge, or spend.

Unknown capability, an external read outside the exact policy, an unlisted
file, a new dependency, package-lock drift, a hidden runtime invocation, or
cleanup ambiguity is Red and stops construction.

### 2.1 Provider-accounting boundary

The Owner is using an already-active Codex development task as the engineering
carrier for this repository work. The `0 / 0 / US$0` ceiling in this Packet
means the Forme code under construction may start zero additional Codex/model/
provider sessions and transmit zero runtime bytes. It does not falsely claim
that the existing human-visible development conversation itself uses no model
or provider infrastructure.

The development task receives only repository and synthetic engineering
context authorized for this work. It receives no real Guest body, email,
production credential, or hidden Forme response payload. Any separately
started Agent task, Codex CLI/app-server process, model request, or code-under-
test provider transport counts as a forbidden additional session.

## 3. Baseline and immutable evidence

Construction starts only if all bindings still match:

| Binding | Exact value |
|---|---|
| Branch | `codex/r4-gate-a-build` |
| Baseline commit | `3d3139798ae15e0f9ba267d157d6a84d2e8d0a98` |
| Baseline tree | `8fab1cab971b70939414b15f2836284d06860bbd` |
| Draft PR | `#65` |
| `package-lock.json` | `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |
| Original Gate B artifact index | `sha256:2fc4f5ec2554f43a8c9a0d93950a5ce1198b91555f361af53d80c7664c5b6a9f` |
| Original Gate B artifact aggregate | `sha256:f290ba035efa2eb84d899bf67d4ffb03c523d88556ce96b66f4f3a2862159310` |

These files are immutable during Retry Construction:

- `docs/R4-GATE-B-SCHEMA-RUNTIME-MIGRATION-MANIFEST.md`;
- `docs/R4-GATE-B-OWNER-REVIEW.md`;
- `docs/R4-GATE-B-EXECUTION-REPORT.md`;
- `docs/evidence/r4-gate-b-execution.json`;
- every path in `runtime-boundary.json.repositoryWorkset.frozenInputs`;
- `schemas/r4/gate-b/artifact-index.json`; and
- this Packet and its low-load Owner Review after approval.

The Red report remains historical evidence. A retry must create new report
paths and may never overwrite or relabel the failed attempt.

## 4. Exact construction workset

The original frozen
`schemas/r4/gate-b/runtime-boundary.json.repositoryWorkset` remains the path
authority, with these exact rules:

- the `generatedSchemas`, `sql`, `persistence`, `codexAdapter`, `macos`,
  `runnerScripts`, and `tests` arrays are allowed construction outputs;
- the `modifiableExistingFiles` array is allowed only for wiring commands,
  types, docs audit, and package surface without adding a dependency;
- `frozenInputs`, `immutableApprovalFiles`, and the original
  `reportArtifacts` are read-only;
- no other existing repository file may change unless explicitly listed
  below.

This Packet adds exactly these construction paths:

```text
scripts/r4-gate-b-path-fence.mjs
test/r4-gate-b/path-fence.test.ts
docs/evidence/r4-gate-b-retry-construction.json
docs/R4-GATE-B-RETRY-CONSTRUCTION-REPORT.md
docs/R4-GATE-B-RETRY-EXECUTION-MANIFEST.md
docs/R4-GATE-B-RETRY-EXECUTION-OWNER-REVIEW.md
```

No generated build output, `.forme` transient evidence, test temp root, Swift
`.build`, signing byte, or runtime byte may be committed. `package-lock.json`
must remain byte-identical. Unlisted repository creation is Red.

## 5. Construction execution contract

### 5.1 One principal and strict serial order

Retry Construction uses one primary Agent. It may not delegate implementation,
probe, filesystem investigation, or cleanup to a subagent. No lane may begin
before the previous lane has a committed body-free checkpoint.

The order is fixed:

```text
preflight
→ Gate A regression and protocol replay
→ path-fence implementation and adversarial fixture tests
→ API and local-format schema construction
→ static SQL and role/function contract construction
→ encrypted-field in-memory implementation/tests
→ fake-budget and event-fence implementation/tests
→ Codex adapter against fake executable/static fixtures only
→ native source compile/unit tests only
→ aggregate-runner dry run over synthetic fixtures
→ static audit + package-lock/workset audit
→ Construction Report + exact Retry Execution Manifest
→ cleanup + STOP
```

The primary Agent may inspect a controlled failure only through repository
files, test fixtures, and sanitized runner error codes. It may not widen a
path, recursively search an external root, or invoke a real integration to
“understand” a construction failure.

### 5.2 Repository read boundary

Every construction command must set the Forme repository as its working
directory. Repository reads are limited to:

1. paths tracked by the exact baseline commit;
2. paths in the exact construction workset above; and
3. generated build/test bytes beneath a fresh construction temp root selected
   by the audited runner.

Before use, every path is converted from a repository-relative token to a
canonical real path. Absolute user input, `..`, symlink components, hard-linked
regular files, alternate worktrees, and a resolved path outside these roots
fail before read or write.

Build commands run with an empty inherited environment, isolated `HOME` and
`TMPDIR` under the construction temp root, `GIT_CONFIG_GLOBAL=/dev/null`, and
system Git config disabled. They may read only the preflight-resolved exact
Node/npm/TypeScript, Git, Swift/Xcode, shell, system library, and repository
`node_modules` toolchain roots needed to compile/test. These are executable and
library reads, not search roots. Their versions and resolved-root hashes are
recorded body-free in the Construction Report; drift or an unexpected user
config/cache read is Red.

The existing dependencies must already be present. Construction may not run
`npm ci`, install/update a package, contact a registry, or fall back to a user
cache. The new Swift package must declare zero external package dependencies;
missing toolchain material stops rather than resolving or downloading it.

Generic `find`, `rg`, `grep`, `mdfind`, glob, hash, or inventory commands may
not target the user home, a parent of the repository, the documents directory,
the general temporary directory, filesystem root, or any unspecified path.
Search roots must be literal repository-relative allowlist entries. Empty,
missing, or dynamically expanded roots fail closed.

The policy specifically denies any path whose canonical components contain a
real Codex state root. Construction tests use synthetic directory fixtures to
prove exact-root allow, parent/sibling escape denial, symlink denial, hard-link
denial, empty-root denial, command-substitution denial, and no fallback search.
They do not touch the real denied root.

### 5.3 Real Codex remains absent

The construction lane must not execute `codex`, the JavaScript launcher, the
native binary, or any equivalent copy. It must not call `--version`, `--help`,
schema generation, `app-server`, or `initialize`.

Adapter tests receive a fixture executable under the construction temp root.
The fixture implements only the expected deterministic test protocol and has
no network or access outside synthetic roots. Tests may compare pinned strings,
schemas, and hashes already present in the frozen proposal, but may not
reproduce them from the installed real Codex package.

The later Execution Manifest must select one exact source executable without
search: the launcher and native binary must be resolved from one explicitly
supplied installation root, opened without following links, and matched to the
already-pinned hashes before staging. Failure returns a controlled code and
stops; an Agent may not investigate with a broader search.

### 5.4 Aggregate runner is the future execution surface

Construction must produce one aggregate runner whose exact bytes are frozen
in the later Execution Manifest. The future executing Agent may invoke only
that one reviewed command. The runner itself owns lane order, subprocess
arguments, roots, environment, timeouts, cleanup, and body-free evidence.

If the future runner returns a controlled failure, the Agent may invoke only
the separately pinned cleanup command for that run ID and then stop. It may
not run ad-hoc `rg`, `find`, hash discovery, version/help, Docker, Keychain,
process, or filesystem investigation commands.

The runner must reject provider/model/credential/real-data arguments and must
not accept arbitrary executable, cwd, environment, search-root, or command
arguments.

## 6. What the later Execution Manifest must prove before approval

Retry Construction may finish only by producing a separate, hash-pinned
Execution Manifest and low-load Owner Review that bind:

1. final commit/tree and SHA-256 of every constructed/modified file;
2. exact aggregate and cleanup commands with no arbitrary argument surface;
3. exact serial lane order and body-free checkpoint schema;
4. exact repository/run-root/source-binary allowlists and deny rules;
5. the source launcher/native binary hashes and a no-search staging algorithm;
6. outer network denial and child Seatbelt rules for the zero-call lane;
7. fixed Docker image digest, names, no-network/no-port settings, and cleanup;
8. fixed macOS build/signing/Keychain/user-presence resources and cleanup;
9. exact Green/Yellow/Red rules, including `NOT_RUN` after Red;
10. provider/thread/turn/real-Guest/production/deploy/merge/spend ceilings of
    zero; and
11. a physical-boundary limitation statement for the controlling Agent.

That last statement is mandatory: a child Seatbelt profile can deny the child
Codex process, but it does not physically sandbox a desktop Agent that already
has unrestricted filesystem permission. Under such a host profile, safety also
depends on the Agent invoking only the reviewed runner and performing no
ad-hoc investigation. If the Owner requires kernel-enforced denial for the
controlling Agent itself, Retry Execution must move to a restricted workspace,
container, or filesystem permission profile before approval. Construction may
not claim that this unresolved host limitation is already solved.

## 7. Evidence, verdict, and cleanup

The Construction Report may contain only repository-relative output paths,
hashes, counts, boolean denials, test names/counts, controlled error codes, and
cleanup receipts. It may not contain source bodies, external/absolute paths,
environment values, credentials, real Codex-home observations, prompt or
transcript text, raw runtime output, machine identifiers, or provider payload.

Construction verdicts are:

- **Green:** the exact workset, offline tests, path fence, runner dry run,
  static audit, cleanup, and Execution Manifest all pass;
- **Yellow:** repository construction is reviewable, but the future physical
  orchestration boundary remains unsupported or unprovable; no Execution
  Grant is recommended;
- **Red:** any external read, real runtime invocation, network attempt,
  workset/dependency drift, unlisted effect, test failure hidden by fallback,
  sensitive evidence, or cleanup uncertainty. Stop immediately.

Yellow is a valid Construction result but does not authorize or recommend
execution. Red stops all remaining construction. In every result, partial
unvalidated files and temp roots are removed or explicitly quarantined before
the Owner return gate.

## 8. Owner return gate

After Construction, the Agent returns:

- exact Construction Report and evidence hashes;
- Green/Yellow/Red plus any `NOT_RUN` lanes;
- package-lock/workset/cleanup proof;
- the separate Retry Execution Manifest hash;
- a low-load description of what that execution would physically do; and
- a recommendation on whether Retry Execution should be approved.

It then stops. Construction success never starts Docker, Codex, Keychain,
user presence, PostgreSQL, Gate C, or a provider call. Retry Execution and the
First Provider-Call Test Grant remain separate future Owner decisions.
