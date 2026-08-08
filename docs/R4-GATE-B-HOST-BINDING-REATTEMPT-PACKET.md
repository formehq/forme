# R4 Gate B Host Binding Reattempt Preparation Packet v0.1

- Status: **PROPOSAL — exact bytes not yet Owner-approved**
- Prepared: 2026-08-08
- Current branch: `codex/r4-gate-a-build`
- Host Binding Reattempt Preparation Grant: **REQUESTED BY THIS PROPOSAL; NOT YET APPROVED**
- Host Binding Attempt Grant: **NOT_REQUESTED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Gate C / deploy / public traffic / merge / spend: **NOT_REQUESTED**

This Packet prepares a new, independently versioned authority and checkpoint for
one possible future read-only Host Binding attempt. It does not authorize itself,
does not read or create the fixed Host input, and does not authorize the attempt.

## 1. Why a preparation gate is required

The historical Construction and sole Host Binding attempt are complete, immutable
facts. The attempt consumed its one-shot grant, stopped Yellow at
`HOST_BOUND_PATH_SYMLINKED`, and removed its checkpoint/root during Green cleanup.
The later C layer then changed the runner's temporary-root and CI fail-closed bytes.

Consequently, calling the existing `finalize-host-binding` entry again would be
both non-executable and dishonest:

- the historical checkpoint no longer exists;
- the existing checkpoint/capsule schemas and runtime constants bind the consumed
  historical Packet, Review, proposal, and run ID;
- the historical Phase-A authority rejects the post-output C/R2 lineage before
  any input read; and
- the historical Host observation is bound to implementation `I`, not to C.

This Packet therefore forbids reusing, reconstructing, or relabeling the old
checkpoint, capsule, public receipt, run ID, input envelope, or one-shot grant.

## 2. Exact two-gate lifecycle

```text
this proposal + Owner approval
  → Gate P: construct a versioned rebind controller and checkpoint path
  → offline/fake validation + committed-byte audits
  → freeze new executable basis J and its retained private checkpoint
  → direct-child output commit M: body-free evidence + Attempt Manifest/Review
  → STOP; Host input was not accessed and its presence remains unobserved

later exact Owner approval of J + M + checkpoint + Attempt Manifest/Review
  → Gate H: prepare one new fixed mode-0600 input envelope
  → one read-only Host Binding attempt
  → capsule/public receipt on success, or honest Yellow/Red + cleanup
  → STOP; no Retry
```

Gate P and Gate H are separate Owner decisions. Approval of this Packet may open
Gate P only. It cannot open Gate H, Retry, or provider authority.

## 3. Frozen historical and current basis

| Layer | HEAD | Tree | Meaning |
| --- | --- | --- | --- |
| Historical implementation I | `92c6c3f8896494aed699671a04a93a09fb59087d` | `cf2ce5567c601fff1ad709e565dde41cf9c3540d` | Sole historical Host observation basis |
| Historical output R | `63ae16940faf17694152cffa12848e62c2933c52` | `ebfd96e7c1003c076d417798e53430891f60f057` | Frozen Yellow result |
| Final portability C | `383bf00611eaf180d4146f75e294deca49a4d5b1` | `3b2ef06165975d2fad1e781aedbe04b91af49287` | Canonical `/tmp` + CI fail-closed code |
| R2/current preparation basis | `3c5ea06b9e8d0813e7d49c115005e1d5efea2d75` | `98d605f0db2260542f649f4dc6582ea3dffbe56a` | C-layer closure documents |

The predecessor authority is frozen, consumed, and never accepted as new
reattempt authority:

| Predecessor authority | Exact value |
| --- | --- |
| Approved Physical Adapter + Host Binding Decision Brief | `sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2` |
| Consumed Construction Packet | `sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06` |
| Consumed Construction Owner Review | `sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9` |
| Consumed approved proposal HEAD / tree | `a45ea061e8e92f247597787e36ecfe52740b216a` / `89b28903fc34e985a17e8f3fdc4bfd7d0972880e` |

Historical machine evidence remains exactly
`sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e`.
It is not rebound to C, R2, or future J. No public Host receipt currently exists.

The authoritative current CI count is 45 Spine + 293 R4 + 131 Gate-B Core = 469
tests. Historical I evidence remains 468 tests; the R2 Report's C-layer sentence
that repeats 130/468 is a one-test editorial undercount, not a rewritten historical
measurement or a grant.

## 4. Gate P authority ceiling

After exact Owner approval, one primary Agent may:

1. edit only the Section 5 implementation workset;
2. add a distinct v2 reattempt input/checkpoint/capsule/receipt/evidence namespace;
3. add a closed preparation entry that validates the approved proposal and current
   C/R2 basis, runs the existing fake/offline construction proofs, and writes a new
   private checkpoint without reading or statting any Host input;
4. add a distinct finalization entry that remains unreachable without a later exact
   Gate-H grant and the new checkpoint;
5. preserve all production branch/workset, no-follow, identity, journal,
   cleanup-always, zeroization, one-read, and strongest-verdict checks;
6. run repository-local checks with denied external network and fake effects only;
7. freeze implementation J, obtain exactly three read-only committed-byte audits
   with 0 Blocker/Important, then create one direct-child output commit M containing
   only the Section 5.3 paths;
8. publish M, push the Draft PR, update #52/#47, and stop.

Gate P authorizes no Host-input existence check, directory listing, stat, open,
read, parse, unlink, or preparation. It also authorizes zero Docker socket or CLI
calls, macOS system-tool inspection, real physical lane, Retry, provider, deployment,
merge, public traffic, or spend.

## 5. Exact Gate P implementation workset

No existing path may be deleted or renamed. Every tracked path not listed here is
read-only.

### 5.1 New versioned schemas

```text
schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-checkpoint.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-capsule.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-public-receipt.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json
```

The historical v1 schemas remain byte-immutable and reconstructible from their
committed blobs. The v2 schemas must bind this Packet/Review/proposal, a new derived
run ID, implementation J/tree, exact runtime hashes, validation aggregate, and new
audit receipts. They may not accept historical v1 authority as an alternative.

The root keys are closed and required as follows:

- input: `schemaVersion`, `dockerCli`, `dockerUnixSocket`, `codexPackageRoot`;
- checkpoint: `schemaVersion`, `reattemptRunId`, all four exact predecessor
  authority rows above, historical I/tree, R/tree, C/tree, R2/tree, new
  preparation Packet/Review/proposal HEAD/tree, J/tree, runner/host/contract/
  profile hashes, runtime dependency count/list/aggregate, validation aggregate,
  exactly three audit receipt hashes, `priorHostBindingAttempts=1`,
  `additionalHostBindingAttemptCeiling=1`, and both closed grants;
- capsule: `schemaVersion`, closed authority, `attemptOrdinal=2`, cumulative attempt
  ceiling `2`, binding ID/times, executable J/tree, review/output M/tree, private
  bound paths, runtime inventory, platform/tools/Docker facts, closed-boundary
  counters, and closed grants;
- public receipt: the capsule's body/path-free authority, ID/hash/times, J/tree,
  M/tree, runtime aggregate, public platform/tools/Docker facts, attempt
  ordinal/ceiling, closed-boundary counters, and closed grants; and
- preparation evidence: Packet/Review/proposal, J/tree/checkpoint hash, runtime and
  validation aggregates, exactly three audit receipts, exact test/counter results,
  `hostBindingInputAccessed=false`, `hostBindingInputPresenceObserved=false`, zero
  inspector/effect counters, and closed grants.

The attempt-result frame additionally requires `schemaVersion`, `attemptId`,
`attemptOrdinal`, terminal `status`, `code`, `verdict`, actual Docker CLI/socket/
macOS inspector start maxima, input-intent/read/zeroized/absent observations,
root/journal/process-group cleanup observations, capsule/receipt hashes or explicit
absence, provider/network/effect counters, and every closed grant.

All schemas use `additionalProperties:false`, exact version consts ending in `.v2`,
strict canonical JSON, closed enums, and no compatibility `oneOf` with v1.

### 5.2 Existing implementation and tests

```text
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/artifact-index.json
schemas/r4/gate-b-core/runtime-boundary.json
schemas/r4/gate-b-core/README.md
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-runner.mjs
scripts/r4-doc-audit.mjs
test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/physical-runner.test.ts
```

`scripts/r4-gate-b-physical-port.mjs`, PostgreSQL/Codex/macOS lane implementations,
SQL, native sources, package manifests/lockfile, workflows, product APIs, and all
historical evidence/output files are immutable in Gate P.

Because the runner and host-binding module are shared files, their permitted hunks
are semantically fenced. Changes may only add v2 authority selection, Gate-P
checkpoint preparation, Gate-H finalization/cleanup plumbing, and shared helpers
needed by those paths. The existing 3/2/9 inspector sequence, command shapes,
parsers, byte/time limits, final revalidation, one-read/zeroization behavior, and
publication protocol may not weaken. PostgreSQL/Codex/macOS production plans,
arguments, FSMs, Retry execution/cleanup call graph, and effect counters must remain
identical to C under a mechanical source-diff audit.

### 5.3 Gate P output paths

```text
docs/R4-GATE-B-HOST-BINDING-REATTEMPT-ATTEMPT-MANIFEST.md
docs/R4-GATE-B-HOST-BINDING-REATTEMPT-ATTEMPT-OWNER-REVIEW.md
docs/evidence/r4-gate-b-host-binding-reattempt-preparation.json
README.md
docs/README.md
docs/CONTROL.md
docs/ROADMAP.md
docs/DECISIONS.md
```

These eight outputs may be written only as commit M after J is frozen and audited.
M must have J as its single parent and contain exactly this output path set, with no
code/schema/contract byte. They must contain no private path, Host identity, input
value, credential, inode/device, username, hostname, or machine name.

### 5.4 Exact local-only authority and retained state

The new reattempt run ID is:

```text
first32(hex(sha256(UTF8(
  "r4-gate-b-host-binding-reattempt-v2\n" +
  preparationPacketSha256 + "\n" + preparationOwnerReviewSha256 + "\n" +
  approvedProposalHead + "\n" + approvedProposalTree + "\n"
))))
```

Only these ignored local paths are authorized:

```text
.forme/gate-b-host-binding-reattempt/<runId>/
.forme/gate-b-host-binding-reattempt/<runId>/checkpoint.v2.json
.forme/gate-b-host-binding-reattempt/<runId>/.checkpoint.v2.json.<runId>.tmp
.forme/gate-b-host-binding-reattempt/<runId>/checkpoint-claim.v2.jsonl
.forme/gate-b-host-binding-reattempt/<runId>/journal.v2.jsonl
.forme/gate-b-host-binding-reattempt/<runId>/capsule.stage
.forme/gate-b-host-binding-reattempt/<runId>/public-receipt.stage
.forme/gate-b-host-binding-reattempt/<runId>/home/
.forme/gate-b-host-binding-reattempt/<runId>/docker-config/
.forme/gate-b-host-binding-reattempt/<runId>/tmp/
.forme/gate-b-host-binding-reattempt/<runId>/blocked-supervisor-pids/
.forme/gate-b-host-binding-reattempt/<runId>/blocked-supervisor-pids/<64-lowercase-hex>.jsonl
.forme/gate-b-host-binding-reattempt-input.v2.json
.forme/gate-b-host-bindings-v2/<hostBindingId>.json
.forme/gate-b-host-bindings-v2/.<hostBindingId>.json.<runId>.tmp
docs/evidence/.r4-gate-b-host-binding-public.v2.json.<runId>.tmp
```

Directories are current-user-owned mode `0700`; private files are mode `0600`;
the final tracked public receipt is mode `0644`. All creation is O_EXCL/no-clobber,
no-follow, identity-bound, file+parent-fsynced, and journaled before effect.

The `<64-lowercase-hex>.jsonl` component is the deterministic start ID with its
fixed `sha256:` prefix removed; no other ready-slot name is valid. The closed
production root inventory is the exact subset implied by the authenticated journal
phase. This local list governs production reattempt state. Existing C-bound fake
matrix, compiler, and Swift test roots may continue only under their previously
approved canonical-system-temp mechanisms and must be absent after each test.

Gate-P Green retains exactly the authenticated 0700 reattempt root containing one
0600 `checkpoint.v2.json`; its ownership-claim journal has been durably removed.
All process groups, temporary/stage files, and other roots are proven absent. Host
input is not accessed and its presence/absence is unobserved. Gate-P failure removes
only identity-proven owned resources or preserves/quarantines uncertainty.

## 6. Required Gate P mechanics

The implementation must expose three mutually closed operations:

```text
prepare-host-binding-reattempt
finalize-host-binding-reattempt
  --attempt-manifest-sha <exact-sha256>
  --implementation-head <exact-J>
  --output-head <exact-M>
cleanup-host-binding-reattempt --packet-sha <exact approved sha>
```

During Gate P only `prepare-host-binding-reattempt` and bounded cleanup may be
invoked. The finalization entry must reject before input access unless all of these
are exact:

- later Gate-H approval receipt and Attempt Manifest/Review/evidence hashes;
- J commit/tree, M commit/tree, and a clean branch/worktree at exact HEAD=M;
- M has J as its single parent and `J..M` is exactly the Section 5.3 outputs;
- new checkpoint/capsule/receipt schema versions and run ID;
- runner, host-binding module, contract, profile, runtime inventory, validation,
  and audit hashes;
- checkpoint/root/journal ownership and identity; and
- Retry and provider grants still `NOT_REQUESTED`.

The checkpoint binds executable J. The finalizer runs only at M, then reads every
J-bound runtime byte from the Git object database and compares its hash with the
current M worktree before and after inspection/publication. M is review/output
authority only and cannot replace J as the executable basis.

Preparation must run the full existing fake/fault construction matrix or an exact
superset, plus `npm run check`, typecheck, syntax checks, denied-network targeted
tests, both applicable documentation audits, workset/name-status checks, cleanup
fault injection, and exactly three independent committed-byte reviews, each with
0 Blocker/Important. It then writes the private checkpoint under the deterministic
0700 root using the existing no-clobber, journaled, identity-bound protocol and
stops without Host input access.

## 7. Future Gate H boundary — specified now, not requested

A later Attempt Manifest must bind P, J/tree, M/tree, the checkpoint hash,
Packet/Review, preparation evidence, runtime aggregate, exactly three audit
receipts, prior attempt count `1`, one additional-attempt ceiling, and an exact
attempt identifier. Only then may the Owner separately prepare:

```text
attemptId = first32(hex(sha256(UTF8(
  "r4-gate-b-host-binding-reattempt-attempt-v2\n" +
  preparationPacketSha256 + "\n" + preparationOwnerReviewSha256 + "\n" +
  approvedProposalHead + "\n" + implementationHeadJ + "\n" +
  checkpointSha256 + "\n"
))))
```

The Attempt Manifest binds this value; M and the Manifest are deliberately absent
from its preimage to avoid self-reference.

```text
.forme/gate-b-host-binding-reattempt-input.v2.json
```

The file must be mode `0600`, current-user-owned, regular, one link, 1..16,384
bytes, exact UTF-8 canonical one-line JSON with one LF and EOF immediately after it.
Duplicate keys, trailing bytes, extra fields, or non-NFC strings are rejected. Its
schema version is `r4_gate_b_host_binding_reattempt_input.v2`; it contains exactly
three Owner-chosen absolute paths: Docker CLI, local Docker Unix socket, and Codex
package root. Every supplied path must already be its canonical non-symlink
spelling. The Agent may not search, resolve alternatives, edit the envelope, use
ambient PATH/HOME/TMPDIR as path authority or discovery, or disclose values. The
inspector still injects its contract-fixed minimal PATH plus isolated owned HOME,
DOCKER_CONFIG, and TMPDIR; none is inherited from ambient state.

One later Gate-H attempt may perform only the already constructed read-only Host
inspection sequence:

- Docker CLI starts: exactly `3` on complete success;
- local Docker Unix-socket requests: exactly `2` on complete success;
- macOS read-only inspector starts: exactly `9` on complete success;
- Docker mutation, credentials/config access, real Codex, sandbox execution,
  signing, Keychain, LocalAuthentication, provider, and external-runtime network:
  exactly `0`.

The historical attempt count is `1`; Gate H authorizes at most one additional
attempt, so the cumulative ceiling is `2`. The additional attempt is irrevocably
consumed only when `input-open-intent` is durably journaled. A controller crash
after that marker is still consumed. Any pre-input terminal also stops and requires
a new Owner decision; it is never automatically retried.

The input is opened once only after that durable intent, then its owned buffers are
zeroized and the exact envelope is unlinked/fsynced on every terminal path. Missing,
invalid, symlinked, drifted, or unsupported facts return Yellow and do not retry or
search. Wrong-resource risk, scope drift, or cleanup uncertainty is
Red/Red-quarantined. Only after exact Gate-H admission succeeds may any input
lifecycle begin. Wrong arguments, missing/mismatched approval/Manifest, or any
pre-admission invocation must not stat, open, read, or remove the Owner input.
After admission, every Gate-H terminal removes the exact input without reading its
body when still pre-open, removes checkpoint/root/journal, and proves process-group
absence, or preserves/quarantines uncertain residue. The cleanup CLI may remove the
input only from an authenticated durable `input-open-intent`. Complete success
retains only the capsule and public receipt listed below.

Complete success may create only:

```text
.forme/gate-b-host-bindings-v2/<hostBindingId>.json
docs/evidence/r4-gate-b-host-binding-public.v2.json
```

The capsule is local, mode `0600`, path-bearing, with
`expiresAt = createdAt + 259200 seconds` exactly.
The tracked receipt is body/path-free. Both bind J/tree, M/tree, attemptId, and exact
bytes. Success is still Yellow/Retry-ready only; it does not execute Retry.

Expiry, J or M drift, runtime dependency drift, bound-file/path identity drift,
socket identity drift, Docker image identity drift, or capsule/receipt byte drift
invalidates the binding without refresh, search, fallback, or automatic rebind.

Gate H returns one canonical body-free stdout result/error frame. The v2 evidence
schema closes that frame as either preparation or attempt evidence without accepting
v1 authority. On failure this Packet authorizes no tracked result file; a later
docs-only return may publish the captured hash only under its own exact output gate.
On success the only immediate tracked Host artifact is the v2 public receipt above.

## 8. Gate P validation and STOP

Gate P returns Green only for repository/fake preparation and exact checkpoint
construction. It must report:

- Host input accessed: `false`;
- Docker CLI/socket/macOS inspector starts: `0 / 0 / 0`;
- real physical, Retry, provider, deploy, traffic, merge, and spend effects: `0`;
- new capsule/public receipt: absent;
- cleanup: Green or an honest quarantined terminal; and
- Host Binding Attempt, Retry, and First Provider Call: `NOT_REQUESTED`.

After publishing the Attempt Manifest/Review, the Agent stops. It may not ask the
Owner for paths in logs or chat, inspect `.forme`, or proceed to Gate H implicitly.

The later Gate-H Owner receipt must quote exact Packet/Review, P/J/M heads and
trees, checkpoint/evidence/Attempt Manifest/Attempt Review hashes, attempt ordinal
`2`, additional ceiling `1`, and `Host Binding Attempt Grant APPROVED`, while Retry
and First Provider Call remain `NOT_REQUESTED`. No shorter approval is accepted.

Recommended future Gate-H form:

```text
批准一次 R4 Gate B Host Binding Reattempt；Preparation Packet
sha256:<packet>；Owner Review sha256:<review>；Proposal P <head> tree <tree>；
Implementation J <head> tree <tree>；Output M <head> tree <tree>；
Checkpoint sha256:<checkpoint>；Preparation evidence sha256:<evidence>；
Attempt Manifest sha256:<manifest>；Attempt Owner Review sha256:<attempt-review>；
Validation sha256:<validation>；Audit receipts <A> <B> <C>；Attempt ID <id>；
Host Binding reattempt input v2 is prepared；Host Binding Attempt Grant APPROVED；
Retry Execution Grant NOT_REQUESTED；First Provider-Call Test Grant NOT_REQUESTED。
```

## 9. Approval required to open Gate P

Approval must quote the exact Packet SHA, companion Review SHA, proposal HEAD/tree,
and these closed grants. Recommended form:

```text
批准 R4 Gate B Host Binding Reattempt Preparation Packet v0.1
sha256:<exact-packet-sha>；批准 Owner Review sha256:<exact-review-sha>；
Proposal HEAD <exact-proposal-head> tree <exact-proposal-tree>；
Host Binding Reattempt Preparation Grant APPROVED；
Host Binding Attempt Grant NOT_REQUESTED；
Retry Execution Grant NOT_REQUESTED；
First Provider-Call Test Grant NOT_REQUESTED。
```

This approval would authorize Gate P only. A future Gate-H approval must be a new
message binding J and the Attempt Manifest; it cannot be inferred from this one.
