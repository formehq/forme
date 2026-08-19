# R4 Gate B Core Execution Manifest — non-approvable Yellow candidate

- Artifact version: `v0.2-yellow`
- Construction Packet:
  `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6`
- Correction Construction Grant: `APPROVED AND CONSUMED`
- Retry Execution Grant: `NOT_REQUESTED`
- First Provider-Call Test Grant: `NOT_REQUESTED`
- Recommendation: **do not approve Retry from this Manifest**

## Owner summary

The repository now contains a coherent Core-32 product surface and stronger
offline PostgreSQL, Codex and macOS mechanisms. It does **not** yet contain one
host-bound physical runner that can safely execute those mechanisms. This
Manifest is therefore an exact record of the remaining boundary, not an
execution request.

## What is frozen and reviewable

### Core product surface

- 32 operations: 26 mutations and 6 reads.
- 21 mutations require exact expected version.
- 13 Full-only operations are rejected before body/auth parsing and hidden
  from active Web and CLI.
- Retry, Provider, deployment and merge authority remain closed.

### PostgreSQL mechanism

- Pinned future image/index/platform:
  `postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`,
  arm64 manifest
  `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf`,
  `linux/arm64`, network `none`, zero host ports.
- `psql` is stdin-only with `-X`, `ON_ERROR_STOP=1`, explicit user `postgres`
  and database `forme_r4_gate_b`.
- All six lineage values have one closed composer. The basis is installed only
  by `forme_r4.tx_gate_b_core_basis_install` from the exact basis JSON; no hand
  seed is permitted.
- Container readiness is bounded to 30 `pg_isready` attempts at 250 ms
  intervals, and image evidence must match the pinned index, platform and
  arm64 manifest before schema work.
- Setup `NULL`/context drift returns controlled 409/403 before mutation.

Open boundary: the 13-row race artifact remains a manifest. Exact
scenario-specific controller/A/B stdin, real Core function calls and 26
persistent-state verifiers have not been constructed. A fake observation
validator exists, but fake success is not runtime proof.

### Codex zero-call mechanism

- Version `0.145.0`, four logical commands, six environment keys and a
  273-file schema inventory remain pinned.
- Schema inventory, dialect and local reference closure are validated and the
  exact result validator is compiled before the initialize child is spawned;
  the inventory is revalidated after the child exits.
- Every incoming JSONL line is validated online. Invalid wire observed before
  a valid response permits at most the first client write. A violation arriving
  in a later chunk after the valid response is still terminal and cleaned, but
  may observe the already-sent `initialized` as the second and final write.
- Process cleanup is bounded: deadline → `SIGTERM` → 2 seconds → `SIGKILL` →
  2 seconds. A process group leaves the cleanup journal only after absence is
  observed.
- Construction used only an owned fake wrapper and fake Codex below the
  Construction temp root.

Open boundary: the real package root, host tool identity and a production
Core process adapter/runner are not bound or constructed. That successor must
either freeze a defensible post-response finality strategy or retain this
Yellow limitation; it cannot pretend that an unknown future chunk was known
before `initialized`. Read-only host facts alone would not make this lane
executable.

### macOS transient helper mechanism

- Separate `FormeCoreLocal` target and one accepted command:
  `--gate-b-core-transient-probe`.
- A fixed 32 KiB region is successfully `mlock`ed before the first candidate
  byte read. Controlled terminals zero every Forme-owned candidate buffer;
  crash/AppKit/swap erasure is not claimed.
- The nested candidate is the frozen `ResponseCandidateV1`; `candidateHash`
  is the canonical full candidate hash excluding only `candidateHash`.
- Response text is decoded as canonical JSON into locked memory, validated as
  UTF-8 NFC, then rendered through CoreText without materializing a body-bearing
  Swift `String`. Newline/Unicode parity is shared with the TypeScript
  canonical vector.
- One fresh device-owner presence ceremony precedes one exact, non-editable
  review. Deadline and candidate bytes are checked again before one in-helper
  count-and-discard.
- Pre-sign payload inventory has exactly 3 members. Post-sign inventory must
  additionally contain exactly `Contents/_CodeSignature/CodeResources`.
- Candidate Keychain/Secure Enclave operations remain `0 / 0`.
- Future custom signing accounting is 12 logical operations: 10 lifecycle
  subcommands, 1 identity inventory read and 1 signing private-key use.
  Default/search-list metadata reads are `2 / 2`; mutations and fallbacks are
  zero. A random one-run certificate fingerprint is observed after creation
  and validated before signing; it cannot be precomputed by read-only host
  inspection.
- The helper emits a separately validated, body-free terminal receipt; the
  external adapter—not the helper—must produce final physical evidence.

Open boundary: no host-bound compile/assemble/sign/verify/launch/cleanup
executor exists. No app, identity, Keychain, LocalAuthentication or helper was
physically exercised in Construction.

## Why this is Yellow

| Missing boundary | Consequence |
|---|---|
| PostgreSQL scenario worker bytes + persisted-state verifiers | The 13 races cannot honestly be executed yet. |
| Exact host bindings + closed Core physical runner | Docker/Codex/macOS steps have no single approved invocation machine. |
| macOS signed-helper physical executor | Host binding alone cannot assemble, sign, launch, validate receipt and clean. |

These are construction gaps, not merely missing machine paths. Calling the
current result `CORE_CONSTRUCTED_OFFLINE` or approving Retry would overstate
what exists.

## Required successor

The next artifact should be an **R4 Gate B Physical Adapter + Host Binding
Construction Packet**. Its authority may cover only:

1. read-only binding of exact Docker, Codex and macOS tool/package identities;
2. repo-only construction and fake testing of the missing physical runner;
3. exact 13-scenario race worker/verifier bytes;
4. exact macOS command/argv, helper-receipt validation, certificate derivation
   rule and cleanup journal; and
5. a new self-contained Execution Manifest and low-load Owner Review.

It must still authorize no Docker command, real Codex or `sandbox-exec`, app
assembly/sign/launch, Keychain mutation, LocalAuthentication, Provider Call,
network action, deployment or merge.

## Closed grants

```text
Retry Execution Grant: NOT_REQUESTED
First Provider-Call Test Grant: NOT_REQUESTED
Gate C / deploy / public traffic / merge / spend: NOT_REQUESTED
```
