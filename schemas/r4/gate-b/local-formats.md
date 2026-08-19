# R4 Gate B exact local formats and resource map

- Status: `PROPOSED_NOT_EXECUTED`
- Authority: R4 Technical Control Packet v0.2
- Approved Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Local format contract version: `forme.r4.local-formats.v1`
- First Provider-Call Test Grant: `NOT_REQUESTED`

This file freezes proposed Gate B local names and boundaries. It does not claim
that a protected launcher, Secure Enclave item, candidate, Codex session, or
provider transport has been created.

## Exact root resolver

`RUN_ID` is `gb_` followed by exactly 32 lowercase hexadecimal characters.
The runner creates one new run root as the canonical real path of
`${TMPDIR}/forme-r4-gate-b/${RUN_ID}` and refuses an existing root, symlink,
hard link, non-owner directory, or path whose real parent is outside the
canonical `${TMPDIR}/forme-r4-gate-b` root.

The exact logical roots inside it are:

```text
build/
install/FormeLocal.app/
workspace/
connector-protection/
candidate-protection/
runtime/
auth/home/
auth/codex-home/
tmp/
keychains/
signing/
staging-evidence/
fake-transport/
```

The roots must be pairwise disjoint after `realpath`. Directories are `0700`;
regular files are `0600` unless the installed executable requires `0500`.
Every JSON record is strict canonical JSON plus one final newline. Durable
creation uses exclusive temporary creation, `fsync(file)`, atomic rename, and
`fsync(parent)`. Unknown or missing fields, duplicate JSON keys, invalid UTF-8,
invalid NFC text, a symlink component, link count other than one, or ambiguous
ownership fail closed.

Only the body-free Room ledger may persist in a normal Workspace. No Guest
body, prompt, orientation, source snapshot text, candidate plaintext,
ciphertext, wrapped key, credential, environment, absolute path, or raw runtime
event may be written under `workspace/`.

## Exact path map and closed record fields

The path tokens below have these exact grammars and denote already-validated
opaque IDs, never unchecked path input:

```text
ROOM_ID             ^room_[A-Za-z0-9_-]{16,128}$
INTERACTION_ID      ^interaction_[A-Za-z0-9_-]{16,128}$
CANDIDATE_ID        ^candidate_[A-Za-z0-9_-]{16,128}$
OLD_CANDIDATE_ID    ^candidate_[A-Za-z0-9_-]{16,128}$
NEW_CANDIDATE_ID    ^candidate_[A-Za-z0-9_-]{16,128}$
JOURNAL_ID          ^journal_[A-Za-z0-9_-]{16,128}$
RUN_LOCAL_ID        ^run_[A-Za-z0-9_-]{16,128}$
CYCLE_ID            ^[A-Za-z0-9_-]{16,128}$
IDEMPOTENCY_KEY     ^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$
```

| Format | Exact relative location | Exact top-level fields | Body-free / lifetime |
|---|---|---|---|
| `r4.local-room-ledger.v1` | `workspace/.forme/room/ledgers/ROOM_ID.json` | `schemaVersion,roomId,bindingId,cursor,highWater,bindingExpiresAt,bindingRevokedAt,events,ackOutbox,receipts,tombstoneIds,gapWarning,quarantine,cleanupRequired,version` | Body-free; the only Workspace-persistent record. |
| `local_room_event_ack_outbox.v1` | Nested only in ledger `ackOutbox[]` | `schemaVersion,ack,serverReceiptId`; `ack` is exact `room_event_ack.v1` | Body-free; removed only after exact receipt reconciliation. |
| `r4.body-free-receipt.v1` | Nested only in ledger `receipts[]` | `schemaVersion,receiptId,roomId,operation,objectId,requestHash,outcome,errorCode,committedAt` | Body-free; `outcome=accepted|no_op|rejected|unavailable|recovered`. |
| `r4.local-lock.v1` | `connector-protection/room-locks/ROOM_ID.lock.json` | `schemaVersion,roomId,operationClass,processId,bootId,startedAt,nonce` | Body-free transient exclusive lock. |
| `r4.local-lock-recovery.v1` | `connector-protection/room-locks/ROOM_ID.lock.json.recovery` | `schemaVersion,roomId` | Body-free transient takeover marker; ambiguous/live owner denies takeover. |
| `local_interaction_lease.v1` | `connector-protection/interaction-leases/ROOM_ID--INTERACTION_ID.lease.json` | `schemaVersion,roomId,interactionId,operationClass,processId,bootId,startedAt,nonce` | Body-free transient; `operationClass=response_prepare|candidate_cleanup`. |
| `local_stale_replay_journal.v1` | `connector-protection/room-replay/ROOM_ID--JOURNAL_ID.json.pending` | `schemaVersion,roomId,journalId,journalHash,replayIdempotencyKey,recoveredOperationClass,recoveredLockNonceHash,startedAt` | Body-free transient; must exist before replay. |
| `local_stale_replay_receipt.v1` | `connector-protection/room-replay/ROOM_ID--JOURNAL_ID.json` | Journal fields except `startedAt`, plus `replayReceiptId,completedAt` | Body-free durable recovery receipt; pending journal is removed only after receipt commit. |
| `local_candidate_admission_intent.v1` | `candidate-protection/CANDIDATE_ID.admission.json` | `schemaVersion,candidateId,candidateHash,roomId,interactionId,wrappedKeyRef,phase,startedAt,expiresAt` | Protected/body-free; `phase=planned|key_wrapped|candidate_persisted`. |
| `local_candidate_admission_authority.v1` | `candidate-protection/CANDIDATE_ID.admission-authority.json` | `schemaVersion,candidateId,candidateHash,roomId,interactionId,wrappedKeyRef,admittedAt,expiresAt` | Protected/body-free authority record. |
| `local_encrypted_response_candidate.v1` | `candidate-protection/CANDIDATE_ID.candidate.json` | `schemaVersion,candidateId,sessionEnvelopeId,roomId,projectionId,interactionId,basisHash,snapshotManifestHash,sessionReceiptHash,sourceDisclosureClass,policyHash,candidateHash,aadHash,ciphertext,iv,authTag,wrappedKey,admittedAt,expiresAt` | Protected ciphertext only; never Workspace. |
| `local_candidate_replacement_journal.v1` | `candidate-protection/OLD_CANDIDATE_ID.replacement.json` | `schemaVersion,oldCandidateId,oldCandidateHash,newCandidateId,newCandidateHash,roomId,interactionId,wrappedKeyRef,phase,startedAt,admittedAt,expiresAt` | Protected/body-free; `phase=planned|key_wrapped|staged|old_denied|successor_active`. |
| `local_encrypted_response_candidate.v1` staged | `candidate-protection/NEW_CANDIDATE_ID.candidate.staged.json` | Same exact candidate envelope fields | Protected ciphertext; renamed active only after the old candidate is denied. |
| `r4.candidate-cleanup-journal.v1` | `candidate-protection/CANDIDATE_ID.cleanup.json` | `schemaVersion,candidateId,roomId,interactionId,wrappedKeyRef,reason,phase,startedAt` | Protected/body-free; deny is committed before key/ciphertext deletion; `phase=denied|ciphertext_removed`. |
| `r4.candidate-cleanup-receipt.v1` | one canonical JSON record per line in `candidate-protection/cleanup-receipts.jsonl` | `schemaVersion,receiptId,candidateId,roomId,interactionId,reason,completedAt` | Body-free append-only cleanup proof. |
| `local_fresh_start_authorization.v1` | Memory only; no filesystem path | `schemaVersion,interactionId,sessionEnvelopeHash,orientationHash,snapshotManifestHash,capabilityProbeHash,runtimePolicyHash,reviewedAt,authorityExpiresAt,startAuthorizationHash` | Protected one-shot authority; never serialized to disk in Gate B. |
| `local_fresh_run_marker.v1` | `runtime/RUN_LOCAL_ID.marker.json` | `schemaVersion,runId,roomId,interactionId,sessionEnvelopeHash,interactionLeaseNonceHash,ownerBootId,ownerProcessId,phase,startedAt,terminal` | Body-free; `phase=active|cleanup_required`. |
| `local_fresh_run_cleanup_receipt.v1` | `runtime/RUN_LOCAL_ID.cleanup-receipt.json` | `schemaVersion,receiptId,runId,roomId,interactionId,sessionEnvelopeHash,interactionLeaseNonceHash,terminal,outcome,completedAt` | Body-free; `outcome=runtime_bytes_absent`. |
| `local_publication_intent.v1` | `connector-protection/publication/IDEMPOTENCY_KEY.intent.json` | `schemaVersion,roomId,requestHash,idempotencyKey,startedAt` | Body-free; committed before submit. |
| `local_publication_receipt.v1` | `connector-protection/publication/IDEMPOTENCY_KEY.receipt.json` | `schemaVersion,roomId,requestHash,idempotencyKey,hostedReceiptId,completedAt` | Body-free; exact replay result. |
| `synthetic_hard_transport_journal.v1` | `fake-transport/CYCLE_ID.journal.json` | `schemaVersion,cycleId,modelId,preparedAt,interactionId,sessionEnvelopeId,sessionEnvelopeHash,startAuthorizationHash,policyHash,outputSchemaHash,snapshotManifestHash,budget,reservations` | Synthetic, local, no socket; destroyed after body-free result commit. |
| `guest_capability_input.v1` | Secure input descriptor only | `schemaVersion,capabilityId,capabilitySecret` | Secret-bearing; never argv, normal stdin, regular stdout, log, or file. |
| `guest_ask_recovery.v1` | Secure input/output descriptor only | `schemaVersion,idempotencyKey,replySecret,deleteSecret` | Manual-holder recovery material; never ordinary stdout. |
| `guest_agent_token_recovery.v1` | Secure input/output descriptor only | `schemaVersion,idempotencyKey,derivativeSecret,replySecret,deleteSecret` | Manual-holder recovery material. |
| `guest_agent_token_secret_bundle.v1` | Dedicated secure output descriptor only | `schemaVersion,manualRecovery,agentShare` | `agentShare` is exact `guest_agent_token_share.v1 {schemaVersion,derivativeSecret}`; only that arm may be handed to an Agent. |

Candidate cleanup `reason` is exactly one of
`owner_denied|owner_replaced|basis_invalidated|interaction_terminal|projection_terminal|response_terminal|room_terminal|cursor_tombstone|published|candidate_expired`.

Fresh cleanup `terminal` is exactly one of
`normal|cancel|timeout|budget|schema_failure|process_kill|fork_attempt|huge_output|machine_crash`.

Protected Room `operationClass` is exactly one of:

```text
room_sync
room_reconcile
response_prepare
candidate_review
candidate_cleanup
publication_submit
publication_reconcile
fresh_runtime_begin
fresh_runtime_read
fresh_runtime_cleanup
fresh_runtime_reconcile
```

## Real Gate B runtime byte rule

Gate A's synthetic cleanup analogue may create
`RUN_LOCAL_ID.ephemeral/request.bin`, `snapshot.bin`, and
`runtime-stream.bin`. A real Gate B launcher **must not create those files**.
Guest request bytes, the selected orientation, body-free runtime events, and
candidate plaintext travel only through bounded anonymous pipes or explicitly
locked memory. The real `runtime/` filesystem may contain only:

- the body-free marker and cleanup receipt above;
- a sanitized source manifest with hashes and sizes but no source text or path;
- the fixed response output schema;
- a non-secret runtime policy/configuration; and
- body-free resource observations.

Any request, capsule, prompt, source text, orientation text, provider payload,
candidate plaintext, raw event stream, or credential found on disk is Red and
stops Gate B.

## Cleanup order and reconciliation

1. Commit deny/cleanup-required authority before attempting destructive work.
2. Terminate the Fresh process group and close every pipe.
3. Destroy the candidate wrapping key before removing candidate ciphertext.
4. Commit and fsync the body-free cleanup receipt.
5. Remove transient journal/marker/staged bytes only after the receipt is
   durable.
6. Reconcile any surviving intent/journal on next explicit startup; no
   read-only inspection may write or auto-recover.
7. Remove the whole Gate B run root only after the evidence index and cleanup
   receipt are durably copied to the Git-ignored evidence root.

Live or ambiguous lock ownership, an invalid record, missing key destruction,
unknown runtime outcome, cleanup uncertainty, or evidence containing a
forbidden body fails closed. It never falls back to an unprotected Workspace
file, login Keychain, inherited Codex home, or generic shell session.

## Gate B schema artifact rule

Gate B may add `schemas/r4/local-formats.schema.json` and
`schemas/r4/local-formats-index.json`. The index must bind every row above with
`schemaVersion,locationPattern,bodyFree,workspaceAllowed,cleanup`. Tests must
prove closed records, exact path containment, permissions, atomicity,
deny-before-delete ordering, crash reconciliation, and that
`r4.local-room-ledger.v1` is the only Workspace-persistent format.
