# R4 Gate B Host Binding Reattempt Envelope v0.2

- Status: **PROPOSAL — supersedes the unapproved v0.1 proposal; waiting for exact Owner approval**
- Host Binding Reattempt Preparation Grant: **REQUESTED; NOT YET APPROVED**
- Host Binding Attempt Grant: **NOT_REQUESTED**
- Retry Execution Grant: **NOT_REQUESTED**
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Gate C / deploy / public traffic / merge / spend: **NOT_REQUESTED**

## 1. Outcome and governing principle

This Envelope exists to bind the current post-portability code to one fresh,
read-only Host observation without turning a one-machine correction into a
general certification platform.

It follows the approved agency-first rule:

> The Owner approves one exact operating envelope. The Agent may implement,
> test, repair and audit freely inside it. A short Owner activation latch is
> still required after the final executable bytes are visible and before any
> Host input or inspector is touched.

The user-visible objective remains the R4 Controlled Presence path. Host Binding
is a prerequisite, not a product milestone. Preparation Green is not Host Green,
Retry-ready is not Retry, and neither state makes R4 Done.

## 2. Why v0.1 is replaced

The unapproved v0.1 proposal was safe in intent but disproportionate for the
current MVP. It required three audits, a second output commit `M`, eight tracked
pre-attempt outputs and repeated historical lineage in several artifacts. It also
left two executable timing questions unclear: how post-`J` audit hashes enter the
checkpoint, and how a future Owner activation enters the finalizer.

This v0.2 Envelope removes `M`, pre-attempt tracked evidence, navigation-document
updates and one audit. It makes both input channels explicit. Runtime safety is not
reduced.

The following v0.1 proposal was never approved and grants no authority:

| Superseded proposal | Exact value |
| --- | --- |
| P1 HEAD / tree | `b160d03af447bcb51e84030cb1fa15b9711947f0` / `a5161d692726e65db6df4e34b41885d2d8d3e18f` |
| P1 Packet | `sha256:8eec14754d4b91275c0772e5b6d2b10c6b69de921735b9669dd86497a34b13e0` |
| P1 Owner Review | `sha256:5e95c8addfff5a66bfb9037662d8a088103ac377f6dbc5bbd30f24153c4809ea` |

## 3. Frozen historical truth

| Layer | HEAD / tree or hash | Meaning |
| --- | --- | --- |
| Approved Decision Brief | `sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2` | Direction only |
| Consumed Construction Packet | `sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06` | Historical grant, consumed |
| Consumed Construction Review | `sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9` | Historical grant, consumed |
| Consumed proposal | `a45ea061e8e92f247597787e36ecfe52740b216a` / `89b28903fc34e985a17e8f3fdc4bfd7d0972880e` | Historical authority only |
| Implementation `I` | `92c6c3f8896494aed699671a04a93a09fb59087d` / `cf2ce5567c601fff1ad709e565dde41cf9c3540d` | Historical Host observation basis |
| Output `R` | `63ae16940faf17694152cffa12848e62c2933c52` / `ebfd96e7c1003c076d417798e53430891f60f057` | Frozen Yellow result |
| Portability correction `C` | `383bf00611eaf180d4146f75e294deca49a4d5b1` / `3b2ef06165975d2fad1e781aedbe04b91af49287` | Current code correction; not Host-bound |
| Closure `R2` | `3c5ea06b9e8d0813e7d49c115005e1d5efea2d75` / `98d605f0db2260542f649f4dc6582ea3dffbe56a` | C-layer documentation |
| Historical machine evidence | `sha256:ca9500ef9384a00c52444cafe41aee0414f1311f5d9897c2faccbf95466fe42e` | Attempt 1 only |

The sole historical attempt ended `HOST_BOUND_PATH_SYMLINKED` before inspection:

- attempt ordinal: `1`;
- Docker CLI / local socket / macOS inspector starts: `0 / 0 / 0`;
- cleanup: Green;
- input, root, journal and process groups: absent;
- capsule and public receipt: absent;
- Retry, provider and physical effects: zero.

Historical `I` evidence records 468 tests. Current `C` validation records 45 Spine
+ 293 R4 + 131 Gate-B Core = 469 tests. Neither result may be rebound to future
implementation `J`.

## 4. Two stop gates with one stable envelope

```text
P2 proposal + exact Owner approval
  -> Gate P: implement and repair only the closed workset
  -> freeze implementation J
  -> run full offline validation + exactly two independent read-only audits
  -> prepare authenticated checkpoint and body/path-free Activation Card
  -> WAITING_OWNER_ACTIVATION; STOP

Owner reads one short Activation Card and activates its exact hash
  -> Gate H: exactly one read-only Host Binding attempt, ordinal 2
  -> success or failure cleanup
  -> STOP; Retry and provider remain closed
```

Gate P approval is the substantive scope approval. Within its workset, the Agent
may implement, test and correct findings without repeated Owner approval. Gate H
is a short release latch over already approved semantics, not a second design
packet. Any byte change to `J`, checkpoint, validation or audit receipts invalidates
the Activation Card and closes the latch again.

## 5. Gate P authority ceiling

After exact Owner approval, one primary Agent may:

1. edit only the Section 6 workset;
2. add a distinct v2 authority, run root, checkpoint, input, capsule, receipt and
   terminal-evidence namespace;
3. preserve the existing read-only Host inspector and all Retry/physical lanes;
4. run repository-local, denied-network, fake/offline validation;
5. obtain exactly two independent read-only reviews of frozen committed bytes;
6. create one authenticated local checkpoint and one canonical body/path-free
   Activation Card after `J`, validation and both reviews exist;
7. push `J` to the existing Draft PR and report body-free status; and
8. stop at `WAITING_OWNER_ACTIVATION`.

Gate P grants no Host-input existence check, directory listing, stat, open, read,
parse, mutation or removal. It grants no Docker socket/CLI call, macOS Host
inspection, real physical lane, Retry, real Codex/provider call, deployment,
public traffic, merge or spend.

## 6. Exact implementation workset

No existing path may be deleted or renamed. Relative to the approved P2 proposal,
final implementation `J` may contain exactly five added schemas and seven modified
existing files.

Added:

```text
schemas/r4/gate-b-core/host-binding-reattempt-input.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-checkpoint.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-capsule.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-public-receipt.schema.json
schemas/r4/gate-b-core/host-binding-reattempt-evidence.schema.json
```

Modified:

```text
schemas/r4/gate-b-core/physical-runner-contract.json
schemas/r4/gate-b-core/artifact-index.json
scripts/r4-gate-b-host-binding.mjs
scripts/r4-gate-b-physical-runner.mjs
scripts/r4-doc-audit.mjs
test/r4-gate-b-core/host-binding.test.ts
test/r4-gate-b-core/physical-runner.test.ts
```

The physical port, PostgreSQL/Codex/macOS lane code, SQL, native sources,
package manifests/lockfile, workflows, product APIs, `runtime-boundary.json`,
schema README and all historical evidence/output files are immutable.

Permitted changes in the two shared modules are additive v2 authority selection,
preparation/finalization/cleanup entry points and the minimum helpers required by
those paths. The existing inspector command sequence, argv, parsers, limits,
`3 / 2 / 9` accounting, final revalidation, one-read/zeroization behavior,
publication protocol, Retry FSM and physical-lane cleanup must remain mechanically
unchanged or be proven equivalent by the two independent audits.

## 7. Versioned authority and local state

The P2 proposal is the commit containing this Packet and companion Review. Owner
approval must bind its exact HEAD/tree. Its direct parent must be P1
`b160d03af447bcb51e84030cb1fa15b9711947f0`; `P1..P2` must contain only these two
proposal files.

The v2 run ID is:

```text
first32(hex(sha256(UTF8(
  "r4-gate-b-host-binding-reattempt-v2\n" +
  packetSha256 + "\n" + ownerReviewSha256 + "\n" +
  proposalHeadP2 + "\n" + proposalTreeP2 + "\n"
))))
```

Production may use only these ignored/local destinations and their closed,
contract-defined child inventory:

```text
.forme/gate-b-host-binding-reattempt/<runId>/
.forme/gate-b-host-binding-reattempt/<runId>/checkpoint.v2.json
.forme/gate-b-host-binding-reattempt/<runId>/journal.v2.jsonl
.forme/gate-b-host-binding-reattempt/<runId>/blocked-supervisor-pids/<64hex>.jsonl
.forme/gate-b-host-binding-reattempt-input.v2.json
.forme/gate-b-host-binding-reattempt-consumed/<runId>.attempt-2.json
.forme/gate-b-host-bindings-v2/<hostBindingId>.json
docs/evidence/r4-gate-b-host-binding-public.v2.json
```

The schema and runner contract close the exact temp/stage/claim names and root
inventory. Directories are current-user-owned mode `0700`; private files are mode
`0600`; the tracked public receipt is mode `0644`. Creation remains O_EXCL,
no-clobber, no-follow, identity-bound, journaled and file/parent-fsynced. Unknown,
replaced, linked or unowned residue is preserved and Red-quarantined rather than
deleted by name.

Gate-P Green retains only the authenticated root with one final checkpoint. It
removes claim/journal/temp/stage/process resources and proves all groups absent.
The Host input remains unobserved, and the consumed-attempt tombstone does not yet
exist.

## 8. Closed v2 contracts

The five schemas are distinct from v1 and accept no v1 authority fallback. They
use strict canonical JSON and `additionalProperties:false`.

At minimum they bind:

- input: the exact schema version and three Owner-chosen absolute paths;
- checkpoint: all historical rows in Section 3, P2 Packet/Review/HEAD/tree,
  `J`/tree, exact runtime hashes and inventory, validation aggregate, two audit
  receipt hashes, `priorHostBindingAttempts=1`, and
  `additionalHostBindingAttemptCeiling=1`;
- capsule/public receipt: `J`/tree, attempt ordinal `2`, cumulative ceiling `2`,
  attempt ID, binding identity/times, runtime aggregate, closed counters and
  grants; private paths remain capsule-only;
- evidence: closed discriminated shapes for validation, authority audit, Host
  audit, preparation Activation Card, Activation Grant, consumed-attempt tombstone
  and terminal Host result.

The body-free validation receipt binds `J` HEAD/tree, `status=PASS`, the exact
validation aggregate and zero Host/effect counters. Each audit receipt binds `J`,
one distinct audit class, `status=PASS`, `findingsCount=0`, `blockerCount=0`,
`importantCount=0` and a summary hash. The runner validates these claims and their
canonical bytes; the fact that the reviews were independently performed remains an
explicit trusted-Agent procedural claim, not a cryptographic claim.

The attempt ID is derived only after the checkpoint exists:

```text
first32(hex(sha256(UTF8(
  "r4-gate-b-host-binding-reattempt-attempt-v2\n" +
  packetSha256 + "\n" + ownerReviewSha256 + "\n" +
  proposalHeadP2 + "\n" + implementationHeadJ + "\n" +
  checkpointSha256 + "\n"
))))
```

## 9. Executable sequencing

The implementation exposes three closed operations:

```text
prepare-host-binding-reattempt
  --validation-receipt <base64url-canonical-json>
  --authority-audit-receipt <base64url-canonical-json>
  --host-audit-receipt <base64url-canonical-json>

finalize-host-binding-reattempt
  --checkpoint-sha <sha256>
  --activation-card-sha <sha256>
  --activation-grant-sha <sha256>

cleanup-host-binding-reattempt
  --packet-sha <exact-approved-packet-sha>
```

This ordering removes v0.1's audit/checkpoint cycle:

1. Freeze clean implementation `J` and prove `P2..J` is exactly the Section 6
   status/path set.
2. Run validation on `J` and freeze its canonical body-free receipt.
3. Obtain two committed-byte audits with distinct canonical body-free receipts and
   zero Blocker/Important findings.
4. Invoke `prepare-host-binding-reattempt` with the base64url encodings of those
   three canonical JSON receipts. Each decoded receipt is at most 4,096 bytes,
   contains no path/body/identity, has no trailing LF, and must validate against the
   closed evidence schema before its SHA is admitted.
5. The runner revalidates `J`, receipt contents/hashes and the fake/offline
   construction, writes the checkpoint, then emits one canonical Activation Card.
6. Stop. The fixed Host input has not been accessed or observed.

The Activation Card contains no Host path, identity or body. Its exact required
keys are closed by the evidence schema: P2 Packet/Review/HEAD/tree, `J` HEAD/tree,
checkpoint SHA, workset aggregate, the three admitted receipt hashes, attempt ID,
prior/additional/ordinal counters, `hostBindingInputAccessed=false`,
`hostBindingInputPresenceObserved=false`, inspector/effect zero counters, the exact
future read-only ceilings, cleanup contract and all closed grants. It has no clock
or random field. Its bytes are `canonicalJson(card)` encoded as UTF-8 with no LF,
so the finalizer can reconstruct the exact Card and its SHA solely from the
authenticated checkpoint.

The future Owner activation maps to this exact canonical JSON frame, also validated
as the Activation Grant shape of the evidence schema:

```json
{"activationCardSha256":"sha256:<card>","attemptOrdinal":2,"checkpointSha256":"sha256:<checkpoint>","firstProviderCallGrant":"NOT_REQUESTED","hostBindingAttemptGrant":"APPROVED_ONCE","hostBindingInputPreparedByOwner":true,"implementationHead":"<J-head>","implementationTree":"<J-tree>","retryExecutionGrant":"NOT_REQUESTED","schemaVersion":"r4_gate_b_host_binding_activation_grant.v2"}
```

`activationGrantSha256` is the SHA-256 of the UTF-8 canonical frame above with no
trailing LF. The primary Agent may derive it only after the Owner's activation
message exactly matches the Card hash, `J` HEAD/tree, ordinal, grant states and the
explicit `hostBindingInputPreparedByOwner=true` confirmation; the checkpoint field
is then resolved through the already authenticated Card. The Agent
may not synthesize approval. The finalizer reconstructs the same frame from the
authenticated checkpoint and Card, then compares the hash before any input
lifecycle begins.

This hash proves internal frame consistency, not cryptographic Owner identity. As
already disclosed by the approved physical direction, the controlling primary
Agent is the procedural boundary that observes the Owner message and invokes the
finalizer. No signature-backed Owner-authentication claim is made.

## 10. Gate P validation and STOP

Required validation is the smallest set that still proves the changed boundary:

- syntax and type checks;
- denied-network targeted Host/runner tests including fault cleanup;
- one final denied-network `npm run check` on clean `J`;
- applicable physical and draft documentation audits;
- exact name-status/workset and artifact-index checks;
- two independent committed-byte audits:
  - authority/checkpoint/journal/cleanup;
  - Host admission/counters/zeroization/publication.

Gate P returns Green only when the Activation Card reports:

- Host input accessed: `false`;
- Host input presence observed: `false`;
- Docker CLI/socket/macOS inspector starts: `0 / 0 / 0`;
- real physical, Retry and provider effects: `0`;
- capsule/public receipt: absent;
- checkpoint retained and all other owned resources absent; and
- Host Activation, Retry and First Provider Call: closed.

Any failed test or audit may be repaired inside the same workset without another
Owner decision. A changed `J` requires fresh validation, audits, checkpoint and
Activation Card. Scope expansion returns to the Owner.

## 11. Future Gate H — one short activation, not requested now

Gate H may begin only after the Owner receives the exact Activation Card and sends
one activation receipt naming its hash and `J`. No implicit activation exists.

Before touching the input, the finalizer must verify P2, clean exact `J`, checkpoint,
validation, both audits, reconstructed Activation Card, activation receipt, attempt
ID, closed grants and the fixed public-receipt target. A derived capsule target is
checked no-clobber immediately after its ID exists and before publication. Admission
failure must not stat, open, read or remove the input.

The fixed v2 input is mode `0600`, current-user-owned, regular, one link, 1..16,384
bytes, canonical UTF-8 one-line JSON plus one LF and immediate EOF. It contains only
the Docker CLI, local Docker Unix socket and Codex package root. Each path must be
absolute, canonical and non-symlink. The Agent may not search, guess, rewrite,
resolve an alternative, use ambient environment as authority, log or disclose a
value.

The Owner activation must explicitly confirm that the v2 input has been prepared.
After all admission checks but before the first input stat/open, the runner creates
and parent-fsyncs this body/path-free file with O_EXCL:

```text
.forme/gate-b-host-binding-reattempt-consumed/<runId>.attempt-2.json
```

That file is the durable `input-open-intent` and irrevocably consumes attempt 2. It
binds P2, `J`, checkpoint, Activation Card/grant, run/attempt IDs, ordinal `2`, and
the consumption time. Prepare/finalize admission checks it first; if present, no
new attempt under P2 may begin. It is permanent: no normal cleanup, history-retention
action, Gate-P/Gate-H operation or later P2 invocation may remove or replace it. P2
has no purge path. Any future protocol version must continue to treat this exact
tombstone as an irrevocable consumed-attempt authority. A journal record mirrors it
for in-attempt recovery but is not the sole consumption authority.

Only after the tombstone is durable does the runner open the input once. It
zeroizes owned buffers and removes/fsyncs the exact input on every admitted terminal
path. Complete success permits exactly:

| Observation | Complete-success ceiling |
| --- | ---: |
| Docker CLI starts | 3 |
| Local Docker Unix-socket requests | 2 |
| macOS read-only inspector starts | 9 |
| Docker mutation / credentials / real Codex / sandbox / signing / Keychain / LA / provider / external network | 0 |

Missing, invalid, symlinked, drifted or unsupported facts stop Yellow without
search or retry. Wrong-resource risk, scope drift or cleanup uncertainty is Red or
Red-quarantined. Every terminal retains the consumed-attempt tombstone, cleans the
exact input, checkpoint/root/journal and process groups, or preserves uncertain
residue and reports quarantine. Crash cleanup must revalidate the tombstone before
using the journal and must never convert a consumed attempt back into an available
one.

Complete success retains the body/path-free tombstone plus only the private capsule
and body/path-free public receipt listed in Section 7. Failure retains the tombstone
and no publication, unless uncertainty is quarantined. Capsule and receipt bind
exact `J`, attempt ID and bytes; expiry is exactly 72 hours. Any code, runtime,
bound-file, socket, image or artifact drift invalidates them without automatic
refresh.

Success is `HOST_BOUND_YELLOW / WAITING_RETRY_APPROVAL`. Failure also stops. No
path automatically enters Retry or a provider call.

## 12. Approval and activation forms

Approval of this v0.2 Envelope opens Gate P only:

```text
批准 R4 Gate B Host Binding Reattempt Envelope v0.2
sha256:<packet>；批准 Owner Review sha256:<review>；
Proposal P2 <head> tree <tree>；
Host Binding Reattempt Preparation Grant APPROVED；
Host Binding Attempt Grant NOT_REQUESTED；
Retry Execution Grant NOT_REQUESTED；
First Provider-Call Test Grant NOT_REQUESTED。
```

After Gate P returns its Activation Card, the only required Host activation is:

```text
激活 Host Activation Card sha256:<card>，Implementation J <head> tree <tree>；
只允许 attemptOrdinal=2 的一次 read-only Host Binding；
Host Binding reattempt input v2 已由 Owner 准备完成；
Host Binding Attempt Grant APPROVED_ONCE；
Retry Execution 与 First Provider-Call Test 仍 NOT_REQUESTED。
```

No shorter or implied grant is accepted. This proposal itself grants nothing.
