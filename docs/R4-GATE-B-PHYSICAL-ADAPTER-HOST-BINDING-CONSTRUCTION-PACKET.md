# R4 Gate B Physical Adapter + Host Binding Construction Packet v0.1

- Status: **PROPOSAL — exact bytes not yet Owner-approved**
- Prepared: 2026-08-07
- Approved Decision Brief:
  `sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2`
- Approved Brief proposal HEAD/tree:
  `8f027876af37815f110028763eda1d7cb9679679` /
  `f4903e52d0b158085810969c2173520b41082bcd`
- Packet Preparation: **AUTHORIZED AND CONSUMED BY THIS PROPOSAL**
- Host-Binding / Adapter Construction Grant:
  **REQUESTED BY THIS PROPOSAL; NOT YET APPROVED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Gate C / deployment / public traffic / merge / spend: **NOT_REQUESTED**

This Packet translates the five approved recommendations into one bounded
Construction. It does not authorize itself. Construction may begin only after
the Owner approves the exact SHA-256 of this file, the companion Owner Review,
and the proposal commit/tree that contains both.

## 1. Outcome and honest claim

The Construction has two irreversible-in-order checkpoints:

```text
approved Packet proposal commit/tree
  → Phase A: repository/fake Physical Adapter Construction
  → tests/audits Green
  → implementation checkpoint commit/tree I
  → Phase B: one read-only Host-Binding Finalization against I
  → local 72-hour capsule + body-free public receipt
  → output/evidence commit R
  → push existing Draft PR → STOP
```

Phase B never precedes Phase A. The local capsule binds implementation commit/
tree `I` and exact runner/input hashes, not the later report commit `R`; adding
the public receipt therefore cannot invalidate its own binding.

The strongest possible Construction result is:

```text
PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW
POSTGRES_RETRY_READY_YELLOW
CODEX_RETRY_READY_YELLOW_WITH_CAUSAL_FINALITY_UNPROVEN
MACOS_RETRY_READY_YELLOW
GATE_B_RETRY_READY_YELLOW
```

This means only that one closed physical runner and its three adapters are
implemented, fake-tested, and bound to one short-lived local host capsule. It
does not mean that Docker/PostgreSQL, Codex/Seatbelt, signing/Keychain/LA or the
helper has run. It does not make any Core lane Green and never opens Retry.

Other controlled returns are:

- `ADAPTER_CONSTRUCTION_YELLOW`: reviewable repository bytes, but Phase A is
  incomplete or a fake/static boundary remains ambiguous; Phase B does not run;
- `HOST_BINDING_INCOMPLETE_YELLOW`: Phase A is Green but the fixed Owner input
  is absent/invalid or a permitted host fact cannot be closed;
- `YELLOW_NO_RETRY`: the bound host/tool/cache shape is unsupported or differs
  from the Packet; no fallback, search, install, pull or second attempt;
- `RED`: scope drift, unlisted read/effect, TCP/SSH Docker, credential/config
  access, arbitrary command/path/env, dependency drift, sensitive evidence,
  cleanup uncertainty that remains after exact cleanup, or any closed-grant
  violation.

Green/Yellow/Red all return to the Owner. None grants Execution.

## 2. Approved lineage and immutable truth

Construction begins from the future Owner-approved Packet proposal commit,
whose parent lineage contains these immutable facts:

| Artifact | Exact SHA-256 |
|---|---|
| Technical Control Packet v0.2 | `e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5` |
| Core Correction Construction Packet | `5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6` |
| Core Construction Report | `4369c5bf7f95e805b440c47a5d2908b091d74c14ab0b322a39d663978c570f40` |
| Core machine evidence | `8153a74a2d3f1724ffb3a71c7dc694b21dee5fd3e89731d82c910864819c3d09` |
| Non-approvable Core Execution Manifest | `f743f8f17daa3aa4d12805cc12563c94a1e3e3343ab4069e4ce351058bcc0b74` |
| Core Execution Owner Review | `332c86ab3ec7612dfa7a107eaf95358dccc7843d0c7b97befddb096b5e3307d6` |
| Approved successor Decision Brief | `89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2` |
| `package-lock.json` | `d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |

The original Full target, prior Gate B packets/reports, prior Core evidence and
the approved Decision Brief remain byte-immutable. The current Core SQL hash
`6bace220f1de958469938d876ff346981ccc16006423e7265f62f8fe0b357fcd`
is a baseline, not a claim that its public-pool interpretation is final. This
Packet authorizes exactly two narrow SQL source corrections in Section 8 and
no other product-surface or Full semantic change.

## 3. Exact authority ceiling

### 3.1 What a later explicit Construction Grant would allow

One primary mutating Agent may:

1. edit only the Section 4 workset;
2. implement the unified runner, typed physical ports, two narrow Core SQL
   corrections, race catalog/composers, validators and fake fault tests;
3. run repository-local static/unit/compiler tests, including unsigned Swift
   compilation into owned temp output and owned fake child subprocesses;
4. create candidate implementation commits only as needed for audit fixes,
   then designate the one all-clear final checkpoint as `I` and change no
   implementation byte afterward;
5. open exactly one fixed local Owner-input envelope and run the bounded,
   read-only Host-Binding commands in Section 6 once;
6. create one Git-ignored 72-hour local capsule, one body-free tracked receipt,
   Report/evidence/Manifest/Owner Review, and a final output commit `R`;
7. run final validation, push the implementation lineage ending at `I` plus
   output commit `R` to the existing
   `codex/r4-gate-a-build` Draft PR, update #52/#47, and stop.

Up to three read-only audit Agents may inspect only repository bytes at each
committed Phase A candidate and again before final publish. They may not
run Host Binding, physical adapters, system tools, Docker, Codex, signing or LA;
they may not edit files. Only the primary Agent may invoke the exact runner.

### 3.2 What remains forbidden

Construction authorizes zero:

- Docker container/volume/network creation, image pull/build/login/push,
  PostgreSQL process or SQL execution;
- real Codex or `/usr/bin/sandbox-exec` invocation, thread, turn, provider,
  prompt, connector, model, account, network or spend;
- physical macOS app compile port, app assembly/sign/launch, certificate,
  Keychain mutation/read, LocalAuthentication, UI or candidate handoff;
- real Guest/Room/email data, hosted/production mutation, Gate C, deployment,
  public traffic or merge;
- package/dependency/install/update/registry access, arbitrary host discovery,
  shell command, PATH search, environment dump or fallback.

The only new real runtime host interaction is Phase B's exact read-only
inspection over fixed files and the Owner-pinned Unix-socket Docker transport,
plus the local input/capsule filesystem lifecycle. Final approved Git push and
GitHub issue updates remain disclosed publication/network effects. There is
zero provider/model/connector or external-runtime network authority. Normal
compiler/test/Git activity and approved repository writes are development-
carrier effects, not physical-lane proof. A Unix socket does not prove that the
Docker daemon shares the host kernel; no such locality claim is made.

### 3.3 One attempt and STOP

Phase A and Phase B each have one attempt under one future Construction Grant.
A failed/unsupported Phase B may clean and report Yellow but may not search for
another binary/socket/package, edit the Owner input, install, start Docker
Desktop, refresh, retry or broaden scope. Rebinding after expiry/drift requires
a new Owner-approved read-only Host-Binding grant.

## 4. Exact repository workset

Every tracked path not listed here is read-only. New tracked files outside the
exact list are Red. No existing file may be deleted or renamed.

### 4.1 New contract, fixture, module and test paths

```text
schemas/r4/gate-b-core/host-binding-input.schema.json
schemas/r4/gate-b-core/host-binding-capsule.schema.json
schemas/r4/gate-b-core/host-binding-public-receipt.schema.json
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/physical-construction-evidence.schema.json
schemas/r4/gate-b-core/physical-construction-checkpoint.schema.json
schemas/r4/gate-b-core/physical-retry-evidence.schema.json
schemas/r4/gate-b-core/postgres/physical-adapter-contract.json
schemas/r4/gate-b-core/postgres/race-catalog.json
schemas/r4/gate-b-core/postgres/race-byte-index.json
schemas/r4/gate-b-core/macos/physical-adapter-contract.json

scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-port.mjs
scripts/r4-gate-b-physical-runner.mjs

fixtures/r4-gate-b-core/macos/fake-provider-child.mjs
fixtures/r4-gate-b-core/macos/fake-helper-child.mjs
fixtures/r4-gate-b-core/macos/synthetic-feeder.mjs
fixtures/r4-gate-b-core/postgres/core-race-setup.sql
fixtures/r4-gate-b-core/postgres/core-race-worker.sql
fixtures/r4-gate-b-core/postgres/core-race-verify.sql

test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/physical-runner.test.ts
test/r4-gate-b-core/postgres-races.test.ts
test/r4-gate-b-core/macos-process-death.test.ts
```

`scripts/r4-gate-b-host-binding.mjs` and
`scripts/r4-gate-b-physical-port.mjs` are library modules, not standalone
physical CLIs. Direct execution must reject before any read/effect. The only
successor physical control entry is the new closed
`scripts/r4-gate-b-physical-runner.mjs`; the historical runner remains
regression evidence and does not expose its production ports.

### 4.2 Existing implementation paths allowed to change

```text
schemas/r4/gate-b-core/README.md
schemas/r4/gate-b-core/artifact-index.json
schemas/r4/gate-b-core/runtime-boundary.json
schemas/r4/gate-b-core/postgres-contract.md
schemas/r4/gate-b-core/codex-zero-call-contract.json
schemas/r4/gate-b-core/sql/0001_r4_gate_b_core_presence.sql
schemas/r4/gate-b-core/macos/build-recipe.json
schemas/r4/gate-b-core/macos/transient-candidate-contract.json

fixtures/r4-gate-b-core/postgres/core-happy-path.sql
fixtures/r4-gate-b-core/postgres/core-errors.sql
fixtures/r4-gate-b-core/postgres/core-races.sql

packages/r4-codex-adapter/src/zero-call-physical.ts

scripts/r4-doc-audit.mjs
scripts/r4-gate-b-path-fence.mjs
scripts/r4-gate-b-core-postgres.mjs
scripts/r4-gate-b-codex-probe.mjs
scripts/r4-gate-b-macos-core.mjs

test/r4-gate-b-core/postgres-static.test.ts
test/r4-gate-b-core/postgres-adapter.test.ts
test/r4-gate-b-core/codex-physical-adapter.test.ts
test/r4-gate-b-core/macos-core-adapter.test.ts

native/macos/Sources/FormeCoreLocal/CoreLauncher.swift
native/macos/Sources/FormeCoreLocal/CoreLockedMemory.swift
native/macos/Sources/FormeCoreLocal/CorePhysicalEvidence.swift
native/macos/Sources/FormeCoreLocal/CoreProcessSupervisor.swift
native/macos/Sources/FormeCoreLocal/CountingHandoffPort.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateReviewWindow.swift
native/macos/Sources/FormeCoreLocal/TransientCandidateSession.swift
native/macos/Sources/FormeCoreLocal/UserPresenceAuthorizer.swift
native/macos/Tests/FormeCoreLocalTests/TransientCandidateTests.swift
```

Core API/Web/CLI surface files, Full SQL/native files, Full profiles,
`native/macos/Package.swift`, `package.json`, `package-lock.json`, `tsconfig*`,
application dependencies and GitHub workflows are immutable. The existing
Core zero-call and transient profiles are also immutable; this Construction
binds/tests them but may not widen them.

The historical `schemas/r4/gate-b-core/evidence.schema.json` and
`schemas/r4/gate-b-core/macos/evidence.schema.json` remain byte-immutable so
published Core evidence stays reconstructible. All new future physical-lane
fields validate only through the distinct required
`physical-retry-evidence.schema.json` root/version; no `oneOf` reinterpretation
of a historical schema is permitted.

### 4.3 Construction output paths

```text
docs/evidence/r4-gate-b-physical-adapter-construction.json
docs/evidence/r4-gate-b-host-binding-public.json
docs/R4-GATE-B-PHYSICAL-ADAPTER-CONSTRUCTION-REPORT.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-MANIFEST.md
docs/R4-GATE-B-PHYSICAL-RETRY-EXECUTION-OWNER-REVIEW.md

README.md
docs/README.md
docs/CONTROL.md
docs/ROADMAP.md
docs/DECISIONS.md
```

Output docs may record the result only after implementation commit `I` is
frozen. They may not alter code/contracts or rewrite historical evidence.

### 4.4 Local-only ignored paths

```text
.forme/gate-b-host-binding-input.v1.json
.forme/gate-b-host-bindings/<hostBindingId>.json
.forme/gate-b-physical-construction/<runId>/
.forme/gate-b-physical-construction/<runId>/construction-checkpoint.v1.json
.forme/gate-b-physical-construction/<runId>/journal.v1.jsonl
```

The parent `.forme/` is already repository-root Git-ignored. Input, capsule,
checkpoint and journal are mode `0600`; their parents and run root are mode
`0700`. None may be staged, committed, printed or copied into tracked evidence.

## 5. Construction lifecycle and implementation checkpoint

### 5.1 Preflight

Before any edit, the primary controlling Agent procedurally verifies the
external Owner approval and repository state:

- exact Owner approval receipt: Packet SHA, companion Review SHA, proposal
  HEAD/tree and `Host-Binding / Adapter Construction Grant APPROVED`;
- Retry and First Provider-Call grants remain `NOT_REQUESTED`;
- branch is `codex/r4-gate-a-build`, upstream exists, worktree/index are clean,
  proposal HEAD/tree are exact, and no alternate worktree is involved;
- every immutable artifact/hash in Section 2, workset, dependency/lock hash and
  denied-root rule is exact.

The external approval fact is not cryptographically discoverable by the new
runner. After it exists, `construct-physical-adapters` mechanically rechecks
the Packet/Review/proposal bytes, repository/workset/hash state and compiled
authority ceiling before its first fake child. Phase A neither requires, stats nor
opens the Host-Binding input. The Agent never infers or searches for its three
paths.

### 5.2 Phase A exact serial order

```text
preflight
→ create owned 0700 construction temp root
→ freeze prior Core/Full/package-lock aggregates
→ implement two narrow PostgreSQL SQL source corrections
→ build 16-case / 32-order race catalog, composers and byte index
→ build closed PostgreSQL physical port behind injected fake executor
→ bind Codex physical spawn port to host-capsule types behind fake executor
→ build macOS closed typed physical plan, validators and fake death matrix
→ build unified runner / journals / cleanup / evidence validators
→ runner mechanically rechecks file/repo/workset authority
→ run offline/unit/type/Swift/regression/static-effect tests
→ verify exact workset, dependency and denied-effect counts
→ commit candidate implementation checkpoint
→ three read-only repository audits of those exact committed bytes
→ if any finding: correct, rerun all validation, commit replacement candidate,
  and reset all three audits
→ all-clear candidate becomes final I
→ prove clean worktree and freeze I HEAD/tree + runner/contract hashes
→ atomically write/fsync construction-checkpoint.v1.json containing approved
  Packet/proposal hashes, final I HEAD/tree, exact runner/contract/profile
  hashes, completed-validation aggregate and all three all-clear audit hashes
→ reopen/validate the checkpoint schema and prove worktree/index remain clean
```

No Host-Binding input/target or local capsule is stat'd or opened before final
`I`. No code/contract change is allowed after final `I`. A test failure or Red
stops all later non-cleanup work. A reviewable unsupported fake boundary
returns `ADAPTER_CONSTRUCTION_YELLOW` and Phase B does not start.

### 5.3 Phase B and output commit

With `I` clean/frozen, the same exact runner may once:

```text
if approval supplied three exact paths, primary Agent serializes only those
  path strings into the fixed input envelope; otherwise require the existing
  Owner-prepared envelope or return HOST_INPUT_NOT_READY_YELLOW before Phase B
→ validate exact checkpoint with no extra field and bind final I HEAD/tree from
  it, never from input; missing/hash/repo drift stops before input open
open/validate fixed Owner input with O_NOFOLLOW and bounded read
→ execute Section 6 read-only inspectors only
→ zeroize input buffer and unlink the fixed input envelope
→ write/fsync/rename one 0600 local capsule bound to I
→ write body-free public receipt into owned temp output
→ revalidate I tree + exact runner/profile/contract hashes
→ generate evidence/Report/next Manifest/Owner Review
→ commit output/docs checkpoint R
→ run final docs/static/workset/capsule-publication audits
→ push I and R to the existing Draft PR
→ update #52/#47 → STOP
```

If binding is unsupported, no valid capsule is published; the input is still
zeroized/unlinked, body-free Yellow evidence is produced, and the Agent stops.
The implementation checkpoint remains reviewable. No automatic second attempt
or alternate host input exists.

## 6. Exact Host-Binding contract

### 6.1 Owner input

The fixed input validates
`schemas/r4/gate-b-core/host-binding-input.schema.json`, is canonical UTF-8 JSON
plus exactly one LF, `additionalProperties=false`, at most 16 KiB, and contains
exactly:

```json
{
  "schemaVersion": "r4_gate_b_host_binding_input.v1",
  "dockerCli": "<Owner-supplied absolute path>",
  "dockerUnixSocket": "<Owner-supplied absolute path>",
  "codexPackageRoot": "<Owner-supplied absolute path>"
}
```

No extra field, environment substitution, tilde, relative component, NUL,
`..`, symlink component, hard-linked regular file, repo/run-root overlap or
path discovery is accepted. The Owner may place this file manually, or include
the three exact strings in the future approval receipt and authorize the
primary Agent to serialize only those strings to this fixed path after final
`I`. The binder obtains implementation commit/tree only from the frozen Phase A
checkpoint and combines them with the input; it rejects any repo/checkpoint
drift. Nothing in this Packet authorizes choosing paths for the Owner.

Phase B opens the envelope once with `O_NOFOLLOW`, performs one bounded read,
requires EOF within the 16-KiB cap, validates canonical bytes/schema, then
overwrites the owned input buffer and unlinks the envelope on every terminal.

### 6.2 Filesystem identity checks

Every executable/file path is opened no-follow. Every ancestor/component is
lstat'd, canonical, non-symlink and stable before/after use. Codex package root
and leaves must be current-UID-owned. Fixed Apple system tools may be UID zero
or current UID; Docker CLI, Node and resolved `swiftc` may likewise be UID zero
or current UID, with exact owner recorded privately. Every executable/regular
leaf is single-link and not group/other-writable; ancestors require stable
non-symlink identity rather than current-user ownership. The Unix socket must
have expected current-UID/root ownership and be non-world-writable. Source fd
identity, size, mode, owner, mtime and SHA-256 are rechecked after each bounded
read. TOCTOU, mount/path replacement or permission drift is Yellow before a
read-only command and Red after any unexpected effect.

### 6.3 Docker read-only binding

The Docker CLI and socket come only from Owner input. Exactly three CLI
processes are permitted, each with the absolute CLI, isolated empty
`HOME/DOCKER_CONFIG/TMPDIR`, exact neutral cwd, `shell:false`, fixed minimal
`PATH=/usr/bin:/bin:/usr/sbin:/sbin`, no other inherited env, bounded stdout/
stderr and deadline. Every daemon-touching call also has explicit
`--host unix://<exact-socket>`:

1. `docker --version` — client version only;
2. `docker --host unix://… version --format
   '{{json .Client.Version}} {{json .Client.APIVersion}}
   {{json .Server.Version}} {{json .Server.APIVersion}}
   {{json .Server.Os}} {{json .Server.Arch}}'` — stdout exposes only those
   six sanitized fields;
3. `docker --host unix://… image inspect --format
   '{{json .RepoDigests}} {{json .Id}} {{json .Os}}
   {{json .Architecture}} {{json .Size}}'` for exactly
   `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
   — retain only matching RepoDigest, local image ID, `linux/arm64` and size.

The binder may not read Docker config/context/credential stores, enumerate
containers/images/volumes/networks, accept TCP/SSH, pull, login, start Docker
Desktop or mutate the daemon. Image absence/mismatch is `YELLOW_NO_RETRY`.
The approved MVP claim is the pinned index digest + observed local image ID +
OS/arch. It does not claim that Host Binding independently re-proved the
historical arm64 descriptor digest.

### 6.4 Codex and Seatbelt byte binding

Only these two files under the Owner-supplied package root may be opened:

```text
bin/codex.js
vendor/aarch64-apple-darwin/codex/codex
```

They must match respectively:

```text
sha256:134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477
sha256:1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590
```

The JS launcher is evidence only and never executed. The target remains
official `0.145.0`, but Host Binding does not run Codex to re-report a version;
the future Retry's first Seatbelt-wrapped command must return exactly
`codex-cli 0.145.0\n` or stop Yellow before later Codex commands.

`/usr/bin/sandbox-exec` and the tracked Core zero-call profile are stat/hash
bound only. Host Binding does not execute Seatbelt or Codex.

### 6.5 macOS/Node tool binding

Only these fixed system tools plus the xcrun-resolved `swiftc` may be stat/hash
bound:

```text
/usr/bin/sw_vers
/usr/bin/uname
/usr/bin/xcode-select
/usr/bin/xcrun
/usr/bin/codesign
/usr/bin/security
/usr/bin/openssl
/usr/sbin/lsof
<exact process.execPath Node binary>
<xcrun-resolved swiftc under Xcode.app or CommandLineTools>
```

The bounded read-only command allowlist is:

```text
/usr/bin/sw_vers -productVersion
/usr/bin/sw_vers -buildVersion
/usr/bin/uname -m
/usr/bin/xcode-select -p
/usr/bin/xcrun --find swiftc
/usr/bin/xcrun --sdk macosx --show-sdk-path
/usr/bin/xcrun --sdk macosx --show-sdk-version
<resolved swiftc> --version
/usr/bin/openssl version
```

The numeric inspector envelope is frozen:

| Logical call | Deadline | Stdout ceiling | Required terminal |
|---|---:|---:|---|
| Docker client `--version` | 5s | 512B | exit 0, stderr 0, exact version parser |
| Docker sanitized client/server version | 5s | 2KiB | exit 0, stderr 0, exact six-field parser |
| Docker pinned image observation | 5s | 4KiB | exit 0, stderr 0, exact five-field parser |
| Each of the nine macOS/SDK/version calls | 5s | 4KiB | exit 0, stderr 0, command-specific bounded parser |

Each call gets a fresh detached process group. The binder fsyncs intent before
spawn and PID/group after spawn; timeout/output/parse failure closes pipes,
TERM 2s → KILL 2s → reap → proves absence using the Section 9.4 semantics.
Unknown absence follows the same quarantine rule. These exact limits and every
command-specific parser must be frozen in `physical-runner-contract.json`
before final `I`; otherwise Phase B is forbidden.

Outputs stay in the local capsule; public evidence keeps only
`darwin-arm64`, tool versions/hashes and closed booleans. Every inspector uses
`shell:false`, the same exact neutral cwd, isolated `HOME/TMPDIR`, fixed minimal
PATH and no inherited `DEVELOPER_DIR`, `SDKROOT`, `TOOLCHAINS`, Docker context,
credential or other environment key. Host Binding may not
invoke `codesign`, `security`, `lsof`, `system_profiler`, `ioreg`, `scutil`,
`hostname`, `whoami`, `which`, `env`, shell, Keychain commands,
`canEvaluatePolicy`, GUI/session inspection or process enumeration. Binding a
compiler driver/SDK identity does not prove a hermetic transitive toolchain or
reproducible executable hash.

The canonical developer root and resolved `swiftc` must remain below either
`/Applications/Xcode*.app/Contents/Developer/` or
`/Library/Developer/CommandLineTools/`; another or user-home developer root is
unsupported Yellow and its path is never published.

### 6.6 Local capsule and public receipt

The capsule validates
`schemas/r4/gate-b-core/host-binding-capsule.schema.json` and is canonical JSON
plus exactly one LF with schema `r4_gate_b_host_binding_capsule.v1`. Before
serialization the binder generates
one 128-bit random lowercase-hex `hostBindingId` and one private 256-bit salt.
The document contains those values, local raw paths/identities, tool
observations, implementation `I`, exact runner/profile/contract hashes,
`createdAt`, fixed `expiresAt=createdAt+72h` and invalidation rules. It does not
contain its own hash. `capsuleSha256` is computed over the final exact file
bytes after the atomic write and is stored only in the tracked receipt/evidence
and future grant/Manifest binding, avoiding a self-referential digest.
The private salt remains in the local capsule so the public file hash is not an
unsalted dictionary commitment to likely path strings; the salt itself is
never tracked or printed.

The tracked public receipt validates
`schemas/r4/gate-b-core/host-binding-public-receipt.schema.json` and contains
only logical tool names, public versions,
byte SHA-256, `darwin-arm64`, Docker sanitized version/OS/arch, bound local
image ID/digest, implementation commit/tree, capsule SHA/ID/times and closed
booleans. It contains no raw/path hash, hostname, username, home/account,
credential/config, inode/dev, Codex installation ID, Keychain/LA/device detail,
environment or command output.

Future Retry preflight must re-open/re-hash every bound file, compare the local
capsule canonical hash, implementation `I`, runner/profile/contract hashes and
expiry. Any drift/expiry invalidates without refresh or fallback.

## 7. Unified runner and closed physical ports

`scripts/r4-gate-b-physical-runner.mjs` is the only successor physical entry.
The historical `scripts/r4-gate-b-runner.mjs` remains immutable and cannot
construct/import the new production ports. The successor runner accepts only
these exact modes:

```text
construct-physical-adapters
finalize-host-binding
cleanup-construction --construction-packet-sha <exact approved sha256>
execute-core-retry --manifest-sha <sha256>
  --execution-grant <same sha256> --host-binding-id <32 lowercase hex>
cleanup-core-retry --manifest-sha <sha256>
  --execution-grant <same sha256> --host-binding-id <same id>
```

The first two modes accept zero arguments and read only fixed Packet-derived
checkpoint/input locations. The three parameterized shapes reject missing,
reordered, repeated or extra arguments. The `execution-grant` value is an exact
mechanical equality token for the Manifest hash; the controlling Agent, not the
runner, procedurally verifies the external Owner reply before invocation. The
runner cannot independently authenticate conversation history.

Construction `runId` is the first 32 lowercase hex characters of
`SHA256("r4-gate-b-physical-construction:" + approvedPacketSha256 +
approvedProposalHead + approvedProposalTree)`. Its run root and journal are
therefore derivable for cleanup without a caller path or directory search.

The two internal modules reject direct execution. There is no generic command,
executable, cwd, env, path, SQL, model/provider, prompt/source, credential,
candidate, resource name or fallback parameter. Layout/resource names derive
only from exact Manifest/grant/capsule/run ID. Production port factories are
private to the runner and require all three independent bindings:

```text
future Execution Manifest hash
future Retry Execution Grant hash
valid unexpired Host Binding Capsule hash
```

`packages/r4-codex-adapter/src/zero-call-physical.ts` may expose only pure
types, validators and orchestration accepted by historical regression tests;
it cannot import/export/construct the successor production spawn factory.

Only effect-producing factories require a currently valid Manifest/grant/
capsule. `cleanup-construction` derives its exact run/journal from the approved
Packet hash. `cleanup-core-retry` authenticates the existing journal and its
recorded exact owned IDs/labels; expiry, drift or consumed authority forbids new
effects but never forbids TERM/remove/drop cleanup. Neither cleanup constructs
a production lane port.

Construction can inject only typed fake `HostInspector`, `ProcessExecutor`,
`Clock`, `DockerPort`, `CodexSpawnPort`, `MacOSPhysicalPort` and cleanup ports.
Tests cannot reach production factories. The runner order is fixed:

```text
preflight + grant/capsule/repo revalidation
→ fresh 0700 run root + intent-before-effect journal
→ PostgreSQL lane
→ Codex zero-call lane
→ macOS transient-helper lane
→ cleanup-always
→ body-free evidence
→ STOP
```

Red stops later non-cleanup lanes. A lane Yellow may continue only when the
next lane is independent and final aggregate remains Yellow. The controlling
Desktop Agent is the already-approved procedural boundary: it may invoke the
exact runner and, after failure, the exact cleanup once, then stop. It cannot
investigate the host. Kernel isolation of the controlling Agent is not claimed.

## 8. PostgreSQL physical-adapter Construction

### 8.1 Exact claim and two narrow SQL source corrections

Phase A may modify only `0001_r4_gate_b_core_presence.sql` for these two
approved corrections plus its successor-Packet lineage constant:

1. both active-pool queries in `tx_public_encounter_issue` and
   `tx_interaction_create` count only
   `origin_capability_class='public_encounter'` with state in
   `accepted|seen_locally|preparing`; inside `tx_interaction_create`, the whole
   active-pool/public-accept check and `public_accept` insert execute only when
   `p_submission_class='public_encounter'`; Grant interactions skip both public
   rate mechanisms and retain the existing Grant version/quota behavior;
2. the public branch resolves exactly one issuance row from
   `rate_buckets` where `scope='encounter_issue'`,
   `source_object_id=p_submission_id`, and `room_id=v_room_id`; its
   `bucket_digest` becomes the only digest for public-accept 3/day count and
   insert. Missing/mismatched lineage returns body-free
   `(httpStatus=409, code='capability_unavailable',
   targetId=p_submission_id, targetVersion=cap_version, receipt=NULL,
   body={"code":"capability_unavailable"})`, with no mutation, idempotency,
   event or actor-scope fallback.

`scope_brief_sha` remains the original Core scope Brief
`c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f`.
`construction_packet_sha` becomes the future Owner-approved SHA of this exact
Packet. `migration_sha` is derived from the final corrected SQL bytes by the
existing closed composer. No column/table/API operation or second migration is
added; every future race order starts from a fresh overlay.

The fixtures must prove:

- public active count 19 permits one create and rejects the other at 20;
- public active count 20 makes `public_encounter.issue` return 429;
- two prior public accepts plus two normally issued Encounters sharing the
  real issuance edge bucket permit one create and reject the other at 3;
- missing issuance lineage returns the exact controlled 409 with no receipt;
- a Grant succeeds and writes no public rate row even when the public pool is
  20 and the public-accept bucket is 3.

Phase A applies none of these SQL bytes to a database. Its maximum claim is
`POSTGRES_PHYSICAL_ADAPTER_CONSTRUCTED_OFFLINE / POSTGRES_RETRY_READY_YELLOW`.

### 8.2 Machine race catalog and exact count definitions

The existing 13 conceptual families expand into 16 executable cases because
the four rate edges become separate cases. Each case runs both orders from its
own clean overlay: 32 executions, 64 A/B Core calls and 32 persisted verifiers.
Case C09 then makes one winner-ID recover and one loser-ID recover after each
order, adding four Core calls. Exact totals are:

```text
Core calls                         68
2xx controlled results             39
controlled non-2xx results         29
new receipt/idempotency pairs      37
persisted-state verifiers          32
```

`semanticEffectCount` and `newReceiptCount` are separate fields. A successful
C09 recover creates one no-op receipt/idempotency pair but changes no domain
version/event. Setup, observer, verifier and rollback SQL are not Core calls.

`A→B` means: A's Core statement returns while A remains pre-COMMIT; B reaches
`CALL_STARTED` and an exact observer proves B is lock-blocked by A's uncommitted
transaction; only then does the controller commit A and allow B to finish.
`B→A` is symmetric. `E` below is the A/B pair's new receipt/idempotency count.
Every rejected arm has receipt `NULL` and zero idempotency/event/domain effect.

The machine catalog freezes these function pairs:

| Case | A function | B function |
|---|---|---|
| C01 | `tx_room_pair_exchange` | `tx_room_pair_exchange` |
| C02 | `tx_interaction_create` | `tx_interaction_create` |
| C03 | `tx_interaction_create` | `tx_interaction_create` |
| C04 | `tx_public_encounter_issue` | `tx_public_encounter_issue` |
| C05 | `tx_public_encounter_issue` | `tx_public_encounter_issue` |
| C06 | `tx_interaction_create` | `tx_interaction_create` |
| C07 | `tx_grant_offer_accept` | `tx_grant_offer_revoke` |
| C08 | `tx_interaction_create` | `tx_interaction_create` |
| C09 | `tx_fresh_cycle_reserve` | `tx_fresh_cycle_reserve` |
| C10 | `tx_dispatch_permit_issue` | `tx_fresh_cycle_abandon_zero_dispatch` |
| C11 | `tx_response_deliver` | `tx_interaction_close` |
| C12 | `tx_response_deliver` | `tx_interaction_delete` |
| C13 | `tx_response_deliver` | `tx_projection_revoke` |
| C14 | `tx_room_operator_pull` | `tx_room_binding_revoke` |
| C15 | `tx_curation_unlist` | `tx_public_encounter_issue` |
| C16 | `tx_public_encounter_issue` | `tx_public_encounter_issue` |

Every worker uses `SET LOCAL ROLE forme_r4_app` and an exact basis actor/context
for that function. No generic actor/function name survives into generated
bytes. C16 uses identical business parameters, actor scope, idempotency key,
canonical hash, Encounter ID/secret/edge bucket and distinct correlation IDs;
the first winner's stored target/version/receipt/body is returned byte-exact by
the replay. Reversing order may change the winner correlation-derived receipt,
so each order has its own frozen verifier.

### 8.3 Exact 32-order result table

| Order | A result | B result | E | Required persisted delta |
|---|---|---|---:|---|
| C01 A→B | `200 pairing_exchanged` | `410 pairing_expired` | 1 | pairing v1→exchanged v2; only binding A active v1 |
| C01 B→A | `410 pairing_expired` | `200 pairing_exchanged` | 1 | pairing exchanged v2; only binding B active v1 |
| C02 A→B | `201 interaction_accepted` | `409 capability_unavailable` | 1 | Encounter consumed/count1/unresolved=A/v2; only Interaction A accepted v1; lifecycle+stream+public_accept each +1 |
| C02 B→A | `409 capability_unavailable` | `201 interaction_accepted` | 1 | symmetric winner B; same event/rate deltas |
| C03 A→B | `201 interaction_accepted` | `429 rate_limited` | 1 | setup19→public active20; A consumed/accepted; B Encounter remains issued; lifecycle+stream+public_accept +1 |
| C03 B→A | `429 rate_limited` | `201 interaction_accepted` | 1 | symmetric winner B; public active20 |
| C04 A→B | `201 public_encounter_issued` | `429 rate_limited` | 1 | hourly same-bucket 9→10; only Encounter/rate A |
| C04 B→A | `429 rate_limited` | `201 public_encounter_issued` | 1 | hourly same-bucket 9→10; only B |
| C05 A→B | `201 public_encounter_issued` | `429 rate_limited` | 1 | daily same-bucket 49→50 while hourly guard <10; only A |
| C05 B→A | `429 rate_limited` | `201 public_encounter_issued` | 1 | daily 49→50; only B |
| C06 A→B | `201 interaction_accepted` | `429 rate_limited` | 1 | public-accept 2→3 through real issuance bucket; A consumed/accepted; B Encounter issued |
| C06 B→A | `429 rate_limited` | `201 interaction_accepted` | 1 | symmetric winner B; public-accept=3 |
| C07 A→B | `201 grant_offer_accepted` | `409 version_conflict` | 1 | Offer accepted O+1; one Grant issued v1 |
| C07 B→A | `409 version_conflict` | `200 grant_offer_revoked` | 1 | Offer owner_revoked O+1; no Grant |
| C08 A→B | `201 interaction_accepted` | `409 capability_unavailable` | 1 | Grant q-1→q/consumed/G+1/unresolved=A; only Interaction A; lifecycle+stream +1; public rate +0 |
| C08 B→A | `409 capability_unavailable` | `201 interaction_accepted` | 1 | symmetric winner B; public rate +0 |
| C09 A→B | `200 cycle_reserved` | `409 version_conflict` | 1 | only reservation A v1; Interaction seen_locally→preparing I+1 |
| C09 B→A | `409 version_conflict` | `200 cycle_reserved` | 1 | only reservation B v1; same Interaction delta |
| C10 A→B | `200 dispatch_permit_issued` | `409 version_conflict` | 1 | reservation dispatch_committed R+1; one permit; Interaction remains preparing |
| C10 B→A | `409 version_conflict` | `200 cycle_abandoned_zero_dispatch` | 1 | reservation released_zero_dispatch R+1; no permit; Interaction preparing→seen_locally I+1 |
| C11 A→B | `201 response_delivered` | `409 version_conflict` | 1 | Interaction response_ready I+1; Response available v1/readable; response lifecycle+stream +1 |
| C11 B→A | `409 version_conflict` | `200 interaction_closed` | 1 | Interaction closed_without_response I+1/unreadable; interaction lifecycle +1; no Response |
| C12 A→B | `201 response_delivered` | `409 version_conflict` | 1 | Interaction response_ready I+1; Response available/readable; response lifecycle+stream +1 |
| C12 B→A | `409 version_conflict` | `200 interaction_deleted` | 1 | Interaction deleted I+1/unreadable; interaction lifecycle +1; no Response |
| C13 A→B | `201 response_delivered` | `200 projection_revoked` | 2 | Projection revoked/current=false/unreadable P+1; Room current=NULL/+1; Interaction response_ready I+1→origin_revoked I+2; Response available v1→origin_revoked v2/unreadable; receipts2, response+projection lifecycle, stream+1 |
| C13 B→A | `409 version_conflict` | `200 projection_revoked` | 1 | Projection revoked P+1; Room +1; Interaction origin_revoked I+1; projection lifecycle +1; no Response/stream |
| C14 A→B | `200 interaction_pulled` | `200 binding_revoked` | 2 | Interaction accepted→seen_locally I+1; Binding revoked B+1; receipts2 |
| C14 B→A | `404 not_found` | `200 binding_revoked` | 1 | Interaction remains accepted I; Binding revoked B+1 |
| C15 A→B | `200 projection_unlisted` | `404 not_found` | 1 | Projection unlisted P+1; curation event +1; no Encounter/rate |
| C15 B→A | `200 projection_unlisted` | `201 public_encounter_issued` | 2 | Projection unlisted P+1; Encounter issued v1; curation event+1; encounter_issue rate+1 |
| C16 A→B | `201 public_encounter_issued` | `201 public_encounter_issued` (exact stored replay) | 1 | one Encounter/rate/receipt/idempotency; same winner target/version/receipt/body returned twice; Projection/Room unchanged |
| C16 B→A | `201 public_encounter_issued` (exact stored replay) | `201 public_encounter_issued` | 1 | symmetric single effect under B winner |

After each C09 order, exact winner-ID `tx_fresh_cycle_recover` returns
`200 cycle_recovered`, creates one no-op receipt/idempotency and changes no
domain version/event; loser-ID recover returns
`409 cycle_recovery_mismatch`, receipt `NULL`, zero effect.

Every persisted SQL verifier asserts absence of extra dispatch/response/
binding/grant/rate rows; exact state/version/high-water/event/receipt
identities; and terminal `body_readable=false` where required. The controller
protocol separately proves worker/controller/observer process-group absence
after COMMIT_ACK/reap and before rollback/evidence. Fixture
guards keep every non-target limit below threshold. C03 public-accept stays
below3; C04/C05 active pool stays below20 and the other time window below its
threshold; C06 active pool stays below20; C08 deliberately sets public pool20/
public-accept3 to prove Grant bypass; C15 keeps issuance limits below threshold.

### 8.4 READ COMMITTED controller handshake

Each order executes:

```text
rollback → bootstrap → corrected migration → basis-install function
→ migrate-role exact synthetic scenario setup
→ A/B overlapping race → optional C09 recoveries
→ order-specific persisted verifier → rollback
```

Controller/Curator/Third Place/Entity basis rows may come only from
`tx_gate_b_core_basis_install`. The migrate role may prepare exact dynamic
synthetic scenario rows/timestamps/quota/rate edges, never those basis entities.

The controller holds two session advisory start locks derived from exact
`runId/caseId/order/actor`, then starts persistent-stdin A/B worker process
groups. Each worker runs:

```text
BEGIN ISOLATION LEVEL READ COMMITTED
SET LOCAL ROLE forme_r4_app
emit READY <actor> <backendPid>
SELECT pg_advisory_xact_lock(<actorStartKey>)   # separate statement
emit CALL_STARTED <actor>
execute one exact Core SELECT                  # separate statement
validate exact result arm in-process
emit POST_CALL <actor>; remain pre-COMMIT
await exact COMMIT instruction
COMMIT; emit COMMIT_ACK <actor>
```

The controller releases first's start lock and waits for `POST_CALL`; releases
second's start lock and waits for `CALL_STARTED`; then one exact observer
session, using the existing `postgres` role and never `forme_r4_app`, executes
one allowlisted SELECT for `secondPid`. It accepts exactly one row with
`pid=secondPid`, `state='active'`, `wait_event_type='Lock'`, firstPid present in
`pg_blocking_pids(secondPid)`, and no unexpected blocker PID. Query bytes/hash
belong to the controller protocol byte index; no specific `wait_event` name is
frozen because row-lock waits may transition tuple→transactionid. Silence/
timer is never overlap proof. If second reaches `POST_CALL` before first
COMMIT, the case is Red. Controller commits/reaps first, lets second finish,
commits/reaps second, then verifies persistence. The reverse order swaps actors.

READY/start/CALL_STARTED/POST_CALL/observer/COMMIT_ACK each have 5s deadlines;
worker `lock_timeout=15s`, `statement_timeout=20s`,
`idle_in_transaction_session_timeout=20s`; case total 30s; lane total 15m.
Unexpected stdout/stderr, SQLSTATE, `40001`, deadlock, lock timeout, uncertain
commit or observer ambiguity is Red and cleanup-always.

### 8.5 Closed future Docker/PostgreSQL plan

Construction creates this typed plan behind an injected fake executor; it does
not run it:

```text
revalidate host capsule + bound local image ID
→ exact-name collision checks only
→ docker volume create with run label
→ docker create --pull=never --name <exact-run-name>
   --label <exact-run-label> --platform linux/arm64 --network none
   --env POSTGRES_DB=forme_r4_gate_b
   --env POSTGRES_HOST_AUTH_METHOD=trust
   --volume <exact-volume>:/var/lib/postgresql/data
   <pinned-index-reference>
→ marker → docker start → marker
→ pg_isready, max30 attempts, 250ms interval
→ stdin-only docker exec /usr/bin/psql
→ happy/errors/event-ACK matrix → rollback
→ all 32 fresh-overlay race orders + verifiers
→ final clean reapply/verify/rollback
→ cleanup container/volume/workers/run root
```

Every Docker call uses the bound absolute CLI, explicit local Unix host,
isolated empty `HOME/DOCKER_CONFIG/TMPDIR`, no shell/PATH and content-addressed
image. `psql` is `/usr/bin/psql -X --no-password --set ON_ERROR_STOP=1
--username postgres --dbname forme_r4_gate_b` under explicit container user
`postgres`; SQL is stdin-only. All six lineage variables come from one closed
composer. No host `psql`, hand seed, wildcard/resource enumeration or image
pull exists. Zero published ports is enforced by the absence of every publish/
expose flag, not by an invented Docker option.

The race byte index binds 16 setup inputs, 32 A/B worker input pairs, four
order-specific C09 recovery inputs/results, 32 controller protocols and 32
persisted verifiers to canonical hashes. The three
tracked SQL templates generate these bytes from the machine catalog; no hidden
future SQL file or ad-hoc interpolation is permitted.

Future cleanup order is worker/controller/observer TERM→2s→KILL→2s→reap/
absence, rollback/drop synthetic database state, exact label/name-bound
container removal, volume removal and run-root removal. The pre-existing pinned
public image cache may remain and is not runner-owned. Any unknown worker,
container/volume label mismatch or cleanup ambiguity is Red.

## 9. Codex zero-call physical-adapter Construction

### 9.1 Exact claim and immutable inputs

Construction turns the current fake-only `CodexSpawnPort` into one production
port reachable only through the unified runner. It does not invoke that port.
The physical Retry, if separately approved, may prove only:

```text
CODEX_ZERO_CALL_PHYSICAL_OBSERVED_GREEN
causalFinality=UNPROVEN_ACCEPTED
postResponseFinalityProven=false
aiLaneEnabled=false
aggregateVerdict=YELLOW
```

The existing Core Seatbelt profile remains byte-immutable at:

```text
schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb
sha256:0c6dc1dda5c97f9d3773bc2ccbd49b28c8ba1b02f7f6b55180db7b2672a9d2ce
```

The profile is a deny-default, no-network, no-fork zero-call profile. It is
not the macOS UI helper's sandbox. Construction may validate its bytes and
substitution surface but may not widen it. A future host/runtime inability to
establish the exact initial-exec/no-fork shape is Yellow before Codex starts.

Future staging is no-search and fd-bound: after capsule revalidation, the
runner opens only the bound native Codex and immutable profile with
`O_NOFOLLOW`, copies from those already-open fds into `O_EXCL` owned files at
mode `0500` and `0600`, fsyncs, re-stats and re-hashes them, and rejects any
overwrite or identity drift. The JS launcher remains hash evidence only and is
never staged/executed.

### 9.2 Closed argv, environment and process shape

The production port uses `shell:false`, stdio pipes and one new detached
process group. Every logical argv begins exactly:

```text
/usr/bin/sandbox-exec
-f <stagedProfile>
-D STAGED_CODEX=<stagedNativeCodex>
-D STAGED_PROFILE=<stagedProfile>
-D SCHEMA_ROOT=<schemaRoot>
-D ISOLATED_HOME=<isolatedHome>
-D ISOLATED_CODEX_HOME=<isolatedCodexHome>
-D ISOLATED_TMPDIR=<isolatedTmp>
-D NEUTRAL_CWD=<neutralCwd>
--
```

and has exactly one of four ordered tails:

```text
<stagedNativeCodex> --version
<stagedNativeCodex> app-server --help
<stagedNativeCodex> app-server generate-json-schema --out <schemaRoot>
<stagedNativeCodex> app-server --listen stdio://
```

`cwd` is exactly `<neutralCwd>`. The child environment contains exactly six
keys and inherits nothing:

```text
HOME=<isolatedHome>
CODEX_HOME=<isolatedCodexHome>
TMPDIR=<isolatedTmp>
PATH=/usr/bin:/bin:/usr/sbin:/sbin
NO_COLOR=1
CODEX_DISABLE_ANALYTICS=1
```

Deadlines and stdout ceilings are respectively `5s/256B`, `5s/1MiB`,
`30s/1MiB` and `10s/4MiB aggregate + 1MiB per line`. Every command must exit
zero with stderr zero. Version stdout is exactly `codex-cli 0.145.0\n`; schema
generation stdout is zero. The initialize process exit grace is defined in
Section 9.3; after its exact second-write/end call, the group must exit within
2s or enter bounded termination.

The fake port validates the complete logical argv/env/cwd before substituting
only argv element zero with a canonical owned fake wrapper. The wrapper must
`exec`-replace itself with the exact fake Codex child. No fake may loosen any
logical production argument, environment key, deadline or output ceiling.

### 9.3 One-reader receive-buffer and causal boundary

One serialized listener exclusively owns one bounded stdout receive buffer.
For each delivered chunk it parses every complete LF-framed JSON message
already present before making any second-write decision. It never awaits,
sleeps or uses a quiet-period timer between parsing and that decision.

Exactly one optional `remoteControl/status/changed:disabled` notification is
accepted only before the exact initialize response. Identity fields are
stripped in owned memory. A server request, another/duplicate notification,
duplicate response, unknown method, malformed/oversize frame, or any complete
frame or partial byte after the response is a violation.

A valid id-zero response is only a response candidate until all currently
received complete frames are consumed, no violation exists and the receive
buffer is exactly empty. Only then may the client write `initialized`.
Transport chunk boundaries and elapsed silence are never finality evidence.

Write one is the immutable canonical initialize-request JSON plus one LF and
leaves stdin open. When—and only when—the preceding predicate closes, write
two is exactly `child.stdin.end(<canonical initialized JSON plus one LF>)` in
that same serialized listener turn, with no await/timer between predicate and
call. The 2s exit grace begins at that call. A write/end error forbids every
later write and enters bounded cleanup.

- a violation observed before the second write permits at most one client
  write and forbids `initialized`;
- invalid bytes first delivered after the second write permit at most two
  total client writes;
- after any violation there are zero later writes, then terminate/cleanup;
- valid but not-yet-delivered future bytes remain causally unknowable, so even
  a clean observation records `UNPROVEN_ACCEPTED` and never claims finality.

The generated schema inventory is exactly 273 files with aggregate
`sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62`.
Its exact dialect, reference closure and selected InitializeResponse schema
compile before the initialize child starts. The same frozen validator graph
validates the returned result; a post-run inventory/hash check detects schema
TOCTOU. Any count/hash/dialect/ref/selected-schema drift stops closed.

### 9.4 Start authority and bounded supervision

There are exactly four ordered start-authority slots: version, help, schema and
initialize. A slot is consumed immediately before the one runner `spawn` call.
Failure makes all later slots `NOT_RUN`; there is no retry, restart, fifth
canary or alternate executable. Evidence records both
`processStartSlotsConsumed` and `processGroupsStarted`, each `0..4`; clean is
exactly `4/4` with exit codes `[0,0,0,0]`.

Before every start, the runner fsyncs intent; after obtaining the PID it fsyncs
the exact group ID. Terminal handling closes all pipes, sends TERM to the exact
group, waits at most 2s, sends KILL if still present, waits at most 2s, reaps
the leader and proves the group absent. `EPERM` means present/signal not
delivered, `ESRCH` means absent, and unknown/error is never absence. A journal
group entry is cleared only after observed absence. Wrong-process risk is Red;
unknown absence first returns interim `YELLOW_QUARANTINED` with only the one
exact cleanup available. If cleanup then proves absence, final may be Yellow;
if it remains unknown, final is `RED_QUARANTINED`.

### 9.5 Future physical evidence and clean predicate

The successor schema adds these required body-free bindings to the existing
Core zero-call evidence:

```text
hostBindingId, hostBindingCapsuleSha256
implementationHead, implementationTree
runnerSha256, codexPortSha256
hostBindingRevalidated
processStartSlotsConsumed, processGroupsStarted
receiveBufferEmptyBeforeSecondWrite
preSecondWriteViolationObserved, postSecondWriteViolationObserved
causalFinality, postResponseFinalityProven
networkAuthority, networkTransmittedBytes
networkSyscallAttemptAbsenceClaimed
journalAggregateSha256, cleanupStatus
```

All fields are required and extra fields reject. Public evidence contains no
path/stat/PID/raw wire/argv/env/schema contents or private inventory line. A
clean Codex observation additionally requires exact 0.145.0, the frozen schema
aggregate and generated validator, two client writes, one response, zero server
requests, empty receive buffer before write two, no observed violation, four
groups with clean exits, zero stderr/schema stdout, all groups absent and
cleanup Green. Thread starts, turn starts, provider requests/bytes, network
authority/transmitted bytes and AI enablement remain zero.

`networkSyscallAttemptAbsenceClaimed=false`: the profile and observed zero
network authority do not prove that no denied syscall was attempted.

### 9.6 Required offline fake matrix

Construction must cover at least:

1. exact argv/env/cwd bijection and mutation-before-spawn rejection;
2. failures after each start proving `1/2/3/4` ceilings and no later start;
3. nonzero/stderr/timeout/oversize, TERM-respecting, TERM-ignoring-to-KILL,
   EPERM/ESRCH/unknown semantics and adversarial descendant cleanup;
4. notification-before-response clean; invalid/request-before-response;
   response plus invalid full line or partial byte in one chunk; invalid next
   chunk after write two; notification after response; duplicate response;
   malformed, oversize or trailing buffer;
5. generated inventory/dialect/reference/selected-schema drift and schema
   replacement between preflight and validation;
6. isolated `CODEX_HOME` allowlist, write escape and private canary detection;
7. faults on both sides of every journal intent/effect marker, idempotent
   cleanup, evidence-schema rejection and body/path/identity canary audit;
8. owned raw help/wire/identity buffers zeroized on success and every error
   path, without claiming V8/GC/runtime-wide erasure.

Construction invokes neither real Codex nor `/usr/bin/sandbox-exec`; fake
children exist only in the owned temp root and are absent at return.

## 10. macOS transient-mechanism physical-adapter Construction

### 10.1 Exact claim and typed future plan

Construction builds and fake-tests a closed macOS executor. Normal Swift unit
tests may compile unsigned test binaries in owned temporary output, but the
new physical port performs zero real compile/assemble/sign/verify/Keychain/LA/
launch operations and retains no `.app` bundle.

The future physical plan is exactly:

```text
revalidate Host Binding + source/build-recipe hashes
→ direct swiftc compile into owned root
→ filesystem-API assemble exact .app payload
→ recursive pre-sign inventory
→ pre default/search-list metadata snapshots
→ derive one-run self-signed cert/key/PKCS#12
→ custom file Keychain exact 10+1+1 sequence
→ codesign hardened runtime + verify signature/requirements/entitlements
→ recursive post-sign inventory
→ direct-spawn exact Contents/MacOS/FormeCoreLocal
→ runtime PID/path/code-identity check
→ synthetic feeder EOF commit gate
→ at most one LA ceremony, at most one review, and optional one
  count-and-discard only on approve_exact
→ validate exact raw body-free helper receipt
→ cleanup + post metadata/absence proof
```

Every atomic operation is a typed enum case with closed absolute executable,
argv, cwd, environment, input/output cap, deadline and expected exit. There is
no generic process API, shell, PATH, `open`, fallback or caller-supplied argv.
Construction injects a fake executor and tests every effect-before/after fault.

Before implementation checkpoint `I`, the physical-adapter contract freezes
every Swift/OpenSSL/security/codesign/lsof/helper/feeder command as an exact
absolute executable plus argv, isolated env, cwd, stdin source, output ceiling,
deadline and exit parser. OpenSSL config-template bytes and every generated-
file mode are hash-bound. No Retry-time option selection is allowed; the later
Manifest can only bind already-frozen command-shape hashes.

The OpenSSL config template is embedded in an allowed contract/module and
hash-bound there; no unlisted tracked template may appear. Before final `I`, an
allowed contract/fixture also freezes the one synthetic candidate vector and
deterministic frame composer. Retry accepts no candidate/body/timestamp input.

The macOS Host Binding is Retry-ready only on `darwin-arm64`, macOS 26 or newer,
a compatible macOS SDK, and a compiler that accepts the Swift 6.2 package
language mode. Otherwise it returns `YELLOW_NO_RETRY` without fallback.

### 10.2 Compile, bundle and signature binding

The pre-sign bundle contains exactly:

```text
Contents/Info.plist
Contents/MacOS/FormeCoreLocal
Contents/Resources/forme-core-transient-response.sb
```

The post-sign inventory contains those three plus exactly
`Contents/_CodeSignature/CodeResources`. Recursive inventory rejects extra
file/directory, symlink, hardlink, owner/mode or case/path drift. The executable
has separate unsigned-compiled and post-sign hashes. Random certificate,
identity selector, designated requirement and signed-bundle hashes are observed
and validated in the same future run; Host Binding cannot predict them.

Pre-sign allowed directories are exactly `Contents`, `Contents/MacOS` and
`Contents/Resources`; post-sign additionally allows exactly
`Contents/_CodeSignature`. The file sets remain exactly the listed three/four
members. No other directory or case-variant path is accepted.

The one-run signing identity is self-signed and proves only pinned-host
integrity of this synthetic mechanism. The adapter computes certificate DER
SHA-1 as the in-memory `codesign` selector and DER SHA-256 for evidence, then
constructs this exact dynamic requirement:

```text
designated => identifier "org.chaostudio.forme.gate-b.core-local"
              and certificate leaf = H"<exact 40-hex DER SHA-1>"
```

Signing uses exact `--keychain <owned-custom-keychain>`, `--sign <selector>`,
`--options runtime`, `--timestamp=none`, the exact empty entitlements plist and
the exact requirement; no `--deep`. Verification includes strict signature,
empty entitlements, hardened runtime, identifier and the same exact test
requirement. It does not claim Team ID, notarization, Gatekeeper trust,
production distribution or reproducible transitive toolchain bytes.

### 10.3 Exact custom-Keychain 10+1+1 sequence

The only future Keychain mutation is the owned one-run custom file Keychain.
Its ten `security` lifecycle subcommands are exactly:

1. `create-keychain` at the owned explicit path;
2. `unlock-keychain` at that path;
3. `import` exactly one PKCS#12 with `-f pkcs12 -x` and trusted application
   limited to `/usr/bin/codesign`;
4. `set-key-partition-list` for the one signing key with
   `apple-tool:,apple:`;
5. `add-generic-password` for one synthetic Room-binding canary;
6. `find-generic-password` for that canary, status only and never `-w`;
7. `delete-generic-password` for that canary;
8. `delete-identity` using the observed exact certificate SHA-1 selector;
9. `lock-keychain` at the exact path;
10. `delete-keychain` at the exact path.

The additional `+1` is one `find-identity -v -p codesigning` inventory read
restricted to the exact custom Keychain, requiring exactly one matching
identity. The final `+1` is the one `/usr/bin/codesign` private-key use. Zero or
two identities or selector/certificate drift stops before helper launch.

The clean temporal order is lifecycle 1–6 → identity inventory `+1` → codesign
private-key invocation `+1` → helper/review/receipt → lifecycle 7–10 during
cleanup. Thus the identity and custom Keychain cannot be deleted before
signing. `customTemporaryKeychainOperations=12` counts twelve logical clean-
path CLI invocations; it does not claim that `codesign` performs only one
internal cryptographic operation. Partial/fault paths record the exact number
of completed invocations rather than reporting twelve.

This `10+1+1` is the custom-Keychain accounting domain, not the total process
count. Separately, the clean path has four read-only `security` metadata
queries (default pre/post=2; search-list pre/post=2) and four read-only
`codesign` verification/display invocations (strict signature, entitlements,
designated requirement and exact test requirement). Clean totals are therefore
15 `security` CLI invocations and five `codesign` CLI invocations including the
one sign. These read-only calls do not increment
`customTemporaryKeychainOperations`; only an unlisted invocation is forbidden.
The physical contract freezes and evidence separately counts every component.

Default-Keychain metadata and search-list metadata are each read exactly once
before and once after (`2/2`) and compared by bounded canonical hash. The
runner issues zero explicit mutation command against login/default/Data
Protection/search-list Keychains and never adds/defaults the custom path.
Because `codesign --keychain` constrains identity lookup but may still consult
standard Keychains for chain construction, this proves only zero explicit
mutation plus equal pre/post metadata, not zero incidental reads or continuous
absence of internal transient change.

The custom-Keychain password, PKCS#12 passphrase, partition password and
synthetic binding secret are one-run synthetic values passed to the frozen CLI
argv. The private key, certificate and PKCS#12 briefly exist only in the owned
run root. This accepted MVP exposure includes no candidate, Owner credential or
production secret; secrets/material never enter journal, evidence or stdout/
stderr and are removed in cleanup. Unsupported import/signing behavior returns
Yellow with helper launch zero; there is no login/Data Protection fallback.

### 10.4 Candidate pipe, runtime identity and EOF commit gate

The signed helper is direct-spawned in an owned process group with its stdin
pipe open and candidate bytes not yet released. Before release, the supervisor
checks the live PID's exact executable path and post-sign executable hash and
correlates them with the already completed static signature/requirement
verification. This consumes no sixth `codesign` invocation. At the frozen
pre-body checkpoint, PID-scoped `INET/INET6` network sockets observed must be
zero. This does not claim zero Unix/XPC/Mach IPC or continuous monitoring. The
binding is procedural and same-user, not a race-proof kernel launcher claim.

The supervisor never reads the candidate body. A synthetic Node feeder owns the
exact frame in one bounded `Buffer`, writes only to the inherited pipe and
explicitly overwrites its owned bytes on every controlled terminal. It does not
claim `mlock`, V8/GC-wide erasure or crash zeroization. The supervisor retains
a duplicate write FD. The feeder sends its completion marker over a separate
body-free control FD, never the candidate pipe/stdout/stderr. After the feeder
writes all bytes, only exact exit zero plus that marker allows the supervisor
to close the guard FD and let the helper observe EOF. Feeder exit before a
byte, mid-frame, or after full bytes with nonzero status terminates the helper
first, closes all FDs and performs cleanup; it cannot trigger LA or handoff.

The helper allocates and successfully `mlock`s a fixed `<=32KiB` region before
reading the first byte, then performs bounded `read(2)` calls only into that
region. If the region fills, one one-byte locked sentinel read proves EOF or
rejects oversize; this is one bounded ingress operation, not a claim of one
syscall. It rejects trailing bytes and validates the exact nested frozen
`ResponseCandidateV1`/canonical candidate hash. Explicit Forme-owned parser,
canonicalization and CoreText bridge buffers remain bounded/locked and are
zeroized on controlled terminals. No candidate file, supervisor body buffer,
stdout/stderr body or body-bearing handoff outside the helper is allowed.

The claim is deliberately narrow: it excludes universal AppKit/OS copies,
swap, crash diagnostics, V8/Swift runtime copies and parent/OS/power-loss
erasure. After helper/process death Forme exposes no process/restart recovery
path for those bytes; it does not claim crash-time memory erasure or that OS/
diagnostic/swap copies are unrecoverable.

### 10.5 LocalAuthentication, review and helper receipt

The helper creates one fresh `LAContext`, sets credential reuse to zero, calls
`.deviceOwnerAuthentication` with the exact reason
`Approve this exact Forme demo response for one synthetic handoff.`, permits at most one
ceremony and invalidates the context. LA unavailable/cancel/ambiguous returns
Yellow and no handoff when a validated receipt proves that count. It records no
NSError, biometric, device, account or UI-session facts.

The authority deadline is the earliest of candidate expiry, Session Envelope
expiry, Interaction expiry and helper-start plus 15 minutes. The helper owns a
deadline timer; it rechecks before LA, immediately after LA/before opening the
review, and before approve, never extending authority. At expiry it stops an
active modal review, invalidates any active `LAContext`, and returns
`authority_expired`. Window close means `discard`. The outer hard-timeout guard
may fire only after the authority deadline plus a fixed 2s receipt/exit grace;
authority remains zero throughout that grace. Termination there or helper
death is Yellow/unknown and is never relabeled `authority_expired` or discard. The
window is noneditable and exact approve performs one in-helper
`CountingHandoffPort` count-and-discard only; no real connector/provider
receives a body.

On a receipt-bearing terminal, helper stdout is `1..4096` bytes containing
exactly one canonical UTF-8 JSON receipt followed by exactly one LF; there is
no trailing byte and stderr is exactly zero. Expected exits are zero for
`approve_exact`, `discard` and `authority_expired`; 70 for a receipt-bearing
`controlled_failure`. A pre-receipt launcher/argv/setup failure exits 64 with
stdout and stderr both exactly zero. Normal exit means `WIFEXITED` with that
terminal-specific code. A signal, wrong code, stderr byte, malformed/missing/
trailing receipt leaves presence/handoff unknown. The outer adapter hashes the
exact framed stdout bytes, validates schema/version/terminal/reason, and
cross-checks presence count, handoff count, controlled zeroization, cleanup and
exit. It never hashes `JSON.stringify(parsedObject)` as a substitute for wire
bytes.

The outer evidence schema must encode the uncertain case exactly:

```text
helperReceiptSha256: null | sha256
helperReceiptValidated: boolean
presenceCeremonies: null | integer(0..1)
presenceCeremoniesObserved: boolean
handoffCount: null | integer(0..1)
handoffCountObserved: boolean
helperControlledZeroizationPassed: null | boolean
helperCleanupPassed: null | boolean
outerCleanupPassed: boolean
```

Without a validated receipt, its hash is null/validated false; presence,
handoff and helper-only cleanup/zeroization are null with observed counts false.
Outer cleanup remains independently observed. In particular, death after an
in-helper count but before receipt may not be recorded as zero or one. A
validated non-approve receipt requires handoff zero; clean approve requires
exactly one presence and one count, both observed, plus helper and outer cleanup
Green.

### 10.6 Required fake/death matrix and verdicts

Construction must fake every atomic plan step and both sides of its journal
marker, plus:

- unsafe pre/post-sign inventory, 0/2 identity, certificate/selector/
  designated-requirement/entitlement/signature mismatch and unexpected
  default/search metadata change;
- candidate first-byte-before-mlock, 32KiB boundary, oversize/trailing,
  UTF-8/NFC/canonical-hash drift, post-review mutation and deadline races;
- feeder death before byte, mid-frame, after full frame with nonzero, and exact
  full frame plus exit zero;
- missing/early/duplicate/malformed completion marker, candidate-pipe marker,
  stdout/stderr marker and wrong control FD, each proving no EOF release/LA/
  handoff and complete cleanup;
- helper death before read, mid-read, before/during LA, during review,
  post-count/pre-receipt and post-receipt/pre-exit;
- partial/duplicate/oversize/trailing receipt, wrong exit and any stderr;
- window close, authority expiry, LA cancel/unavailable, controlled discard,
  cleanup retry/idempotency and process/resource absence;
- explicit separation of provider-child abnormal death while helper remains
  alive from helper death, without claiming parent SIGKILL/power-loss cleanup.

The future evidence also fixes:

```text
helperSeatbeltApplied=false
transientProviderProfileExecutionCount=0
realProviderChildStarts=0
```

The bundled transient-response profile is an inert, byte-bound resource for a
later provider-child gate and is never applied to `FormeCoreLocal` here.
`fake-provider-child.mjs` is Construction-only fault injection and never enters
the future zero-provider Retry plan.

Future macOS cleanup is exact: stop feeder writes/close every pipe and guard FD
→ TERM 2s/KILL 2s/reap helper+feeder groups → prove absence (`ESRCH` absent,
`EPERM` present, other unknown) → delete canary if created → delete imported
identity if created → lock/delete the custom Keychain → zeroize/unlink config,
key, cert, DER, PKCS#12 and raw owned buffers → remove app/build/runtime roots →
take post default/search snapshots and require pre/post equality → prove all
owned resources absent.

Future verdicts are:

- `GREEN_TRANSIENT_MACOS_MECHANISM_ONLY`: exact signed helper, runtime identity,
  one synthetic frame, one device-owner ceremony, exact noneditable review,
  one in-helper count-and-discard, validated receipt and complete cleanup;
- Yellow: unsupported custom Keychain/import/signing, LA unavailable/cancel,
  authority expiry/discard, controlled helper failure, or abnormal child/helper
  death with no boundary escape and complete cleanup; unknown counts stay null;
- Red: bundle/signature/candidate binding drift, unexpected login/default/Data
  Protection/search-list mutation or fallback, wrong process/path, body/canary
  escape, residue or cleanup uncertainty.

Even the Green transient mechanism leaves the Full persistent lane
`UNPROVEN_POST_DEMO`, First Provider Call closed and aggregate Yellow. It does
not prove real Guest/Room/provider/publication E2E, persistence/restart/crash
recovery, submitted-unknown reconciliation, Secure Enclave candidate storage,
production signing/notarization, helper Seatbelt or Desktop Agent kernel
isolation.

## 11. Unified journal, evidence and cleanup

### 11.1 Intent-before-effect journal

Phase A fake runs, Phase B Host Binding and the future Retry all use the same
closed journal schema. Construction writes only
`.forme/gate-b-physical-construction/<runId>/journal.v1.jsonl`; a future Retry
uses an equivalent journal under its separately Manifest-derived run root.
Each owned append-only canonical JSONL journal is `0600` below one fresh
canonical `0700` root. Every record has exactly:

```text
schemaVersion, sequence, previousRecordSha256
runId, manifestSha256, hostBindingId
lane, event, commandShapeSha256, processGroupId
ownedResources, terminalCode, cleanupState
```

Nullable fields are explicit and extra fields reject. The first record has
`previousRecordSha256=null`; each later record hashes the immediately previous
exact canonical record bytes. In Phase A `manifestSha256` and `hostBindingId`
are null. In Phase B the Manifest remains null and hostBindingId remains null
until capsule creation. A future Retry requires both non-null. The journal
aggregate is `SHA256(concatenated exact LF-framed record bytes)`.

Each record is fsync'd before the possible effect; parent directories are
fsync'd after resource creation. The journal stores only
logical owned-resource tags, deterministic names and local process-group IDs.
It stores no raw path, argv/env/output, SQL/wire/schema/body, candidate/prompt/
source, credential/secret, package/machine/user identity or private inventory.

An intent must contain enough deterministic owned identity for cleanup if the
process dies after effect but before observation. Corrupt, missing or ambiguous
authority records never permit a new effect; they expose only exact cleanup.

### 11.2 Construction machine evidence

`docs/evidence/r4-gate-b-physical-adapter-construction.json` validates
`schemas/r4/gate-b-core/physical-construction-evidence.schema.json`, is
canonical JSON with `additionalProperties=false`, and binds at minimum:

```text
schemaVersion, generatedAt, status, reasonCode
approvedDecisionBriefSha256, constructionPacketSha256,
constructionOwnerReviewSha256
approvedProposalHead, approvedProposalTree
implementationHead, implementationTree
hostBindingAdapterConstructionGrant
packageLockSha256, immutableCoreAggregateSha256, immutableFullAggregateSha256
physicalRunnerSha256, hostBindingModuleSha256, physicalPortSha256
postgresMigrationSha256, postgresRaceCatalogSha256,
postgresRaceByteIndexSha256
codexPortSha256, codexProfileSha256
macosPhysicalContractSha256, macosBuildRecipeSha256
constructedFileCount, constructedFilesAggregateSha256
postgresNamedFamilies, postgresExecutableCases, postgresOrderedExecutions
postgresExpectedCoreCalls, postgresExpected2xx,
postgresExpectedControlledNon2xx, postgresExpectedNewReceipts,
postgresPersistedVerifierPlans
offlineTestFiles, offlineTestsPassed, deterministicStressRuns
fakeChildStarts, normalCompilerTestStarts
dockerReadOnlyCliCalls, localDockerUnixSocketRequests,
macosReadOnlyInspectionCalls, gitPushCommands, githubIssuesUpdated,
publicationPushPlanned, githubIssueUpdatesPlanned
dockerMutationCalls, postgresCalls
realCodexCalls, sandboxExecCalls, threadStarts, turnStarts, providerCalls
macosPhysicalCompileCalls, appAssemblyCalls, codesignCalls, securityCalls,
localAuthenticationCalls, helperLaunches, candidateHandoffs
hostBindingAttempted, hostBindingId, hostBindingCapsuleSha256,
hostBindingPublicReceiptSha256, hostBindingExpiresAt
constructionRunRootAbsent, fakeProcessGroupsAbsent,
bindingInputAbsent, constructionJournalAbsent, cleanupStatus
retryExecutionGrant, firstProviderCallGrant, aggregateVerdict
```

`hostBindingAdapterConstructionGrant=APPROVED`, while Retry and First Provider
remain `NOT_REQUESTED`. PostgreSQL expected Core calls equal exactly 68; an
extra call fails rather than satisfying a minimum.

Construction physical-effect counters are fixed at zero except Phase B's
declared read-only tool calls and owned input/capsule/journal lifecycle. A clean
Host Binding runs exactly three Docker read-only CLI
processes, exactly two Owner-pinned Unix-socket daemon requests, and nine macOS
read-only version/SDK processes. Because tracked machine evidence is frozen
before publication, it requires `gitPushCommands=0`, `githubIssuesUpdated=0`,
`publicationPushPlanned=1` and `githubIssueUpdatesPlanned=2`. It executes zero
Codex, Seatbelt, codesign, security, lsof, Docker mutation, PostgreSQL, LA or
helper process. Actual push/#52/#47 outcomes are returned externally after
publication and are never back-written into the pre-publication evidence.

The evidence retains hashes and counts, never private Host Binding fields.
`constructedFileCount/aggregate` cover only the Phase A implementation workset
at immutable `I`; they exclude this evidence and all later Report/Manifest/
Review bytes, avoiding self-reference. The public receipt precedes and may be
hashed by the evidence. Report/Manifest/Owner Review/evidence hashes are
returned externally and cross-bound by the companion Review rather than
recursively embedded. A report claim is invalid if any byte/hash/count differs.

### 11.3 Public Host-Binding receipt

The body-free tracked receipt is produced only from a successfully validated
local capsule. It binds capsule SHA/ID/expiry, implementation `I`, public tool
versions/hashes/platform classes and closed booleans. It cannot reconstruct a
raw local path or stable account/machine identity. The receipt is not authority
to execute and contains explicit:

```text
retryExecutionGrant=NOT_REQUESTED
firstProviderCallGrant=NOT_REQUESTED
providerCalls=0
providerNetworkAuthority=0
externalRuntimeNetworkAuthority=0
localDockerUnixSocketRequests=2
aggregateVerdict=YELLOW
```

### 11.4 Cleanup and residue rules

Cleanup is mandatory and idempotent on Green, Yellow, Red, timeout, cancel and
every injected fault. It uses only journaled exact owned identities—never
`ps`, `find`, wildcard deletion, directory discovery or arbitrary caller path.

Construction cleanup order is:

1. stop new starts/writes and close owned descriptors;
2. TERM→2s→KILL→2s→reap every fake/process group and prove absence;
3. zero owned Buffer/Uint8Array/Swift buffers where observable;
4. remove fake schemas/HOME/CODEX_HOME/TMPDIR/neutral cwd, fake app/build/
   certificate/Keychain artifacts, PostgreSQL fake roots and journals;
5. zeroize and remove the fixed Owner input envelope;
6. on failed/partial binding, remove partial capsule/temp receipt; on success,
   retain only the declared 72-hour local capsule and tracked public receipt;
7. prove construction root and construction journal absent and emit the body-free
   cleanup summary.

No V8/GC/AppKit/OS-wide erasure is claimed. First-observed unknown process/
resource absence is interim `YELLOW_QUARANTINED` and exposes one exact cleanup
invocation only. If that cleanup still cannot prove absence, the final result
is `RED_QUARANTINED`; external-path effect, sensitive residue, wrong-process
risk or other cleanup uncertainty is immediately Red.

Future Retry cleanup additionally follows each lane's Section 8–10 ordering.
The pinned pre-existing Docker image cache may remain and is declared
non-runner-owned; every container, volume, synthetic DB state, child group,
custom Keychain, signing material, app bundle and run root must be absent.

## 12. Required Construction verification

Phase A cannot reach its implementation checkpoint until all of the following
are Green:

1. exact workset, immutable historical hashes, dependency/lock/package and
   denied-surface audits;
2. JSON Schema validation, canonical hash/ref closure and generated artifact
   index consistency;
3. Host binder tests for relative/NUL/`..`, symlink/hardlink/owner/mode/type,
   fd/path replacement, bounded output, unsafe socket/remote endpoint,
   Docker/Codex/tool/hash/platform drift, capsule TTL and every revalidation
   field;
4. PostgreSQL SQL/static semantics, 16-case/32-order catalog-byte bijection,
   exact 39/29/37 aggregates, two-order overlap protocol, all stage faults,
   cleanup and three deterministic full-catalog fake stress runs;
5. Codex four-start supervision, schema/wire causal matrix, buffer cleanup,
   journal faults and isolated-write/canary boundary;
6. macOS closed plan, pre/post-sign inventory, 10+1+1 operation accounting,
   Keychain fallback denial, raw receipt validation, LA/review terminals,
   candidate/feeder/helper death matrix and cleanup;
7. unified runner direct-import/direct-execution denial, grant/capsule/Manifest
   mismatch, lane-stop ordering, cleanup-always and public-evidence canaries;
8. all pre-existing repository R1–R4 checks, TypeScript checks, Swift tests,
   docs audit and `git diff --check`.

Fake stress means deterministic injected executors only. It cannot increment a
real physical-effect counter or be cited as Docker/PostgreSQL, Codex/Seatbelt,
signing/Keychain/LA or helper evidence.

After each candidate implementation commit, three independent read-only audits
review PostgreSQL, Codex/unified-runner and macOS/authority boundaries. Any
Blocker or Important claim mismatch creates a replacement candidate inside the
approved workset and resets validation/audits. Only an all-clear candidate is
designated final `I`; before Phase B the auditors confirm its commit/tree equals
the accepted candidate and that no implementation byte changed. Auditors do
not run the project, host inspectors or physical adapters.

## 13. Successor Retry Manifest requirements

The Construction output Manifest is a proposal, never self-approving. It binds:

- exact implementation `I` and output/report commit `R` lineage;
- Packet, machine evidence, local capsule and public receipt hashes;
- capsule expiry and every invalidation rule;
- one exact unified runner command and zero caller-selected lane/path/env;
- exact future physical order, command-shape hashes, deadlines, output ceilings,
  counters, verdict predicates and cleanup plan from Sections 7–11;
- PostgreSQL's pinned local image ID + all 32 fresh-overlay executions;
- Codex's four zero-call starts and explicit causal-finality exception;
- macOS's synthetic-only frame, one possible LA prompt and transient-mechanism-
  only claim;
- `Retry Execution Grant NOT_REQUESTED` and
  `First Provider-Call Test Grant NOT_REQUESTED`.

Its strongest recommendation may be a separately approvable, zero-provider
Retry whose aggregate ceiling remains Yellow. Expired/drifted Host Binding,
unsupported local capability or unresolved cleanup makes it non-approvable.
No Manifest may request provider authority together with the first physical
Retry.

## 14. Exact verdict table

| Condition | Construction return | What it means |
|---|---|---|
| Phase A fake/static/regression Green at immutable `I`, before Host Binding | `ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN` | Internal checkpoint only; no lane has run |
| Phase A Green + exact one Host Binding closed + cleanup Green | `PHYSICAL_ADAPTERS_CONSTRUCTED_HOST_BOUND_YELLOW` | Separately reviewable Retry proposal may be prepared |
| Owner input absent/invalid or permitted local tool/cache unsupported | `HOST_BINDING_INCOMPLETE_YELLOW` / `YELLOW_NO_RETRY` | Stop; no search, fallback or Retry recommendation |
| Adapter/fake matrix incomplete but no escaped effect | `ADAPTER_CONSTRUCTION_YELLOW` | Return reviewable gap; Phase B does not run |
| First unknown owned-process/resource absence | `YELLOW_QUARANTINED` | Expose one exact cleanup only; no later lane/effect |
| Unlisted read/effect, TCP/SSH Docker, real lane call, sensitive publication, wrong process/resource, or absence still unknown after cleanup | `RED` / `RED_QUARANTINED` | Preserve exact quarantine evidence and stop |

`ADAPTER_CONSTRUCTION_CHECKPOINT_GREEN` is not a public Gate B Green. Even the
strongest final return has aggregate `YELLOW`, because no physical Retry and no
provider call occurred.

## 15. Owner return and approval boundary

This proposal must return with:

1. exact Packet SHA-256;
2. exact companion low-load Owner Review SHA-256;
3. exact proposal HEAD/tree containing both;
4. a plain-language disclosure of the two narrow SQL corrections, Codex causal
   limit, synthetic CLI-signing exposure and transient macOS claim;
5. confirmation that no Host Binding or physical adapter ran, the requested
   Construction Grant is not yet approved, and Retry/provider grants remain
   `NOT_REQUESTED`.

An Owner approval of these proposal bytes may authorize only the bounded
`Host-Binding / Adapter Construction` described here. It does not approve the
later Retry Manifest or any provider call. The Construction Grant must name the
exact Packet/Review/proposal hashes and either name the three Owner-chosen path
strings or confirm that the fixed Host Binding input is prepared. Otherwise
Phase A may still finish and preserve final `I`, but the runner returns
`HOST_INPUT_NOT_READY_YELLOW` before Phase B and performs no Host Binding.

After Construction, the Agent returns the implementation/output commit/tree,
evidence/Report/Manifest/Review/capsule-public-receipt hashes, actual pre-
publication test/effect counts, external push/#52/#47 outcomes, capsule expiry
and next closed decision. Then it stops.
