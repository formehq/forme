# R4 Gate B PostgreSQL Contract v0.1

- Status: **PROPOSED_NOT_EXECUTED**
- Parent authority: `R4 Technical Control Packet v0.2`
- Parent Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- First Provider-Call Test Grant: **NOT_REQUESTED**
- Authorized provider sessions / bytes / spend: **0 / 0 / US$0**
- Database target: disposable local PostgreSQL `16.10`, synthetic data only

This is the exact proposed PostgreSQL construction and validation contract for
Gate B. It is a design input, not an executed migration, passing test result,
production plan, or authorization to create a real Room. It authorizes no
model/provider call, email, real Guest data, hosted mutation, production
migration, deployment, public traffic, production credential, or spend.

## 1. Fixed construction choices

1. The schema namespace is `forme_r4`; the disposable database is
   `forme_r4_gate_b`.
2. PostgreSQL enum types are prohibited. Every closed set is a named `text`
   domain with an exact `CHECK (VALUE IN (...))` constraint.
3. Application-layer encryption is AES-256-GCM. PostgreSQL stores ciphertext
   envelopes and body-free metadata only; it never receives an encryption key
   or plaintext private field.
4. Random AES-GCM nonces are registered globally in
   `forme_r4.encryption_nonces`; `(key_id, nonce)` is unique across every table
   and column.
5. All Projection Capsules and Room labels are encrypted uniformly, including
   public values, so a Private Room can never enter a plaintext storage path.
6. Verification-code handoff and lost-response-sensitive idempotency results
   use bounded encrypted transient fields.
7. The runtime roles have no direct raw-table authority. Semantic mutation,
   notification, janitor, and audit authority is separated by exact functions
   and views.
8. Gate B uses no ORM, database SDK, PostgreSQL extension, Redis, networked
   database service, or new npm dependency.

## 2. Exact proposed file set

The Gate B PostgreSQL and encrypted-field lane may add only:

```text
schemas/r4/sql/0000_r4_gate_b_bootstrap.sql
schemas/r4/sql/0001_r4_presence.sql
schemas/r4/sql/0001_r4_presence.verify.sql
schemas/r4/sql/0001_r4_presence.rollback.sql

packages/r4-persistence/src/encrypted-field.ts
packages/r4-persistence/src/index.ts

scripts/r4-gate-b-postgres.mjs
scripts/r4-gate-b-encrypted-field.mjs
test/r4-gate-b/postgres-schema.test.ts
test/r4-gate-b/encrypted-field.test.ts
```

That lane may modify only:

```text
package.json
tsconfig.json
```

The hash-approved Manifest and Owner Review are immutable Gate B inputs. This
lane may not edit either approval object.

It must not add `packages/r4-persistence/package.json`. The existing
`packages/*` npm workspace would otherwise change the workspace graph and
invalidate the dependency lock. `package-lock.json` must remain byte-identical
to its approved Gate A hash. Root `package.json` may add scripts and include
`packages/r4-persistence` in its package file list, but may not add or change a
dependency.

## 3. SQL naming, scalar types, and closed sets

All identifiers below are schema-qualified by `forme_r4`. Constraint names use
`pk_`, `fk_`, `uq_`, and `ck_`; explicit indexes use `ix_`. Every timestamp is
`timestamptz(3)`. Server `transaction_timestamp()` is authoritative for a
semantic transaction. Historic timestamps supplied inside an already
schema-validated protocol object are rechecked against server time.

### 3.1 Scalar domains

```sql
r4_id text
  CHECK (
    VALUE = normalize(VALUE, NFC)
    AND octet_length(VALUE) BETWEEN 18 AND 160
    AND VALUE ~ '^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$'
  )

sha256_digest text
  CHECK (VALUE ~ '^sha256:[0-9a-f]{64}$')

idempotency_key text
  CHECK (
    VALUE = normalize(VALUE, NFC)
    AND octet_length(VALUE) <= 256
    AND (
      VALUE ~ '^[A-Fa-f0-9]{32,}$'
      OR VALUE ~ '^[A-Za-z0-9_-]{22,}$'
    )
  )

canonical_text text
  CHECK (VALUE = normalize(VALUE, NFC))

encrypted_field_v1 jsonb
  CHECK (forme_r4.is_encrypted_field_v1(VALUE))
```

`is_encrypted_field_v1` accepts an object with exactly these seven keys:

```json
{
  "schemaVersion": "a256gcm.v1",
  "algorithm": "AES-256-GCM",
  "keyId": "r4.hosted.gate-b.synthetic.v1",
  "nonce": "canonical unpadded base64url encoding of exactly 12 bytes",
  "ciphertext": "canonical unpadded base64url ciphertext",
  "tag": "canonical unpadded base64url encoding of exactly 16 bytes",
  "aadHash": "sha256 followed by 64 lowercase hexadecimal digits"
}
```

The function rejects missing/unknown keys, non-string members, noncanonical
base64url, a wrong algorithm/version/key ID, wrong nonce/tag lengths, an empty
ciphertext, and a malformed AAD hash.

### 3.2 Named text domains for closed sets

Each item below is a `text` domain with the exact listed `VALUE IN` check. No
PostgreSQL enum is created.

```text
actor_subject_state_d:
  active, revoked

actor_role_kind_d:
  controller, curator

entity_state_d:
  active, retired

third_place_state_d:
  active, closed

third_place_event_kind_d:
  created, closed

room_kind_d:
  third_place_public, private_grant_only

interaction_mode_d:
  public_single, invite_only, closed

room_status_d:
  active, retired

room_lifecycle_event_kind_d:
  created, mode_set, retired, deleted

projection_owner_state_d:
  published_fresh, stale, superseded, revoked, expired

curation_state_d:
  not_admitted, admitted, unlisted

curation_event_kind_d:
  admitted, unlisted

capability_state_d:
  issued, consumed, revoked, replaced, expired, invalidated

grant_preset_id_d:
  one_visit, short_exchange, familiar_collaborator, trusted_collaborator

grant_offer_state_d:
  issued, accepted, owner_revoked, expired, invalidated

direct_invite_state_d:
  issued, redeemed, owner_revoked, expired, invalidated

capability_class_d:
  public_encounter, grant, agent_derivative

binding_state_d:
  active, revoked, expired

pairing_state_d:
  issued, exchanged, expired

interaction_type_d:
  ask, seed, resonance

guest_capsule_level_d:
  g0_manual, g1_lightweight, g2_agent_projection

interaction_consent_d:
  allow_owner_local_ai, manual_owner_only

interaction_state_d:
  accepted, seen_locally, preparing, response_ready,
  closed_without_response, interaction_expired, interaction_deleted,
  origin_revoked, room_retired

fresh_cycle_state_d:
  reserved, dispatch_committed, released_zero_dispatch

response_state_d:
  available, response_expired, response_revoked, origin_revoked,
  interaction_deleted, room_retired

response_source_disclosure_d:
  fresh_native_sanitized_snapshot_owner_reviewed, manual_owner_authored

notification_endpoint_state_d:
  absent, verification_pending, confirmed, cleared

notification_challenge_state_d:
  pending, used, expired, exhausted, replaced, canceled

notification_semantic_kind_d:
  response_ready, verification_code

notification_notice_state_d:
  ready_pending, submitting, canceled, provider_accepted,
  delivery_unknown, failed

notification_attempt_state_d:
  submitting, provider_accepted, proved_not_accepted,
  delivery_unknown, failed

room_event_object_type_d:
  room, projection, interaction, response, grant, notification, purge

operation_status_d:
  committed, no_op, rejected, terminal

idempotency_recovery_kind_d:
  body_free, encrypted_transient, room_operator_pull,
  notification_current, publication_current

retention_target_kind_d:
  room_label, projection_capsule, interaction_request, guest_capsule,
  response_body, notification_endpoint, notification_delivery_target,
  verification_challenge, verification_code, pairing_exchange_envelope,
  idempotency_sensitive_result

retention_job_state_d:
  pending, claimed, completed, failed

purge_outcome_d:
  purged, already_absent, failed

operator_incident_code_d:
  purge_target_missed, last_successful_purge_stale

api_actor_class_d:
  public, manual_guest, guest_agent, controller, curator,
  room_operator_v1, janitor, notifier
```

### 3.3 Composite function types

```sql
mutation_context_v1 (
  actor_class api_actor_class_d,
  actor_subject_id r4_id,
  actor_scope_digest sha256_digest,
  idempotency_key idempotency_key,
  canonical_request_hash sha256_digest,
  expected_object_version bigint,
  correlation_id uuid
)

api_result_v1 (
  http_status smallint,
  code text,
  target_id r4_id,
  target_version bigint,
  receipt_id r4_id,
  result jsonb
)

notification_claim_v1 (
  outcome text,
  outbox_id r4_id,
  attempt_id r4_id,
  semantic_kind notification_semantic_kind_d,
  provider_idempotency_key text,
  encrypted_delivery_target encrypted_field_v1,
  encrypted_verification_code encrypted_field_v1,
  lease_expires_at timestamptz(3),
  reconciliation_deadline timestamptz(3)
)
```

Nullable fields in these composites remain SQL `NULL`; no sentinel ID, hash,
or timestamp is permitted.

## 4. Exact table contract

In the definitions below, columns are `NOT NULL` unless explicitly marked
`NULL`. Defaults are exact. Protocol-bearing rows include `schema_version`, a
canonical object or payload hash, a version/lifecycle field, and timestamps.

### 4.1 Migration and actor authority

```text
schema_migrations
  version integer PK
  migration_name canonical_text UNIQUE
  migration_sha256 sha256_digest UNIQUE
  packet_sha256 sha256_digest
  manifest_sha256 sha256_digest
  applied_at timestamptz(3) DEFAULT transaction_timestamp()
  applied_by name
  postgres_version_num integer
  rollback_compatible boolean DEFAULT false

actor_subjects
  subject_id r4_id PK
  schema_version text CHECK = 'actor_subject.v1'
  issuer_hash sha256_digest
  provider_subject_hash sha256_digest
  state actor_subject_state_d DEFAULT 'active'
  version bigint DEFAULT 1 CHECK >= 1
  created_at timestamptz(3) DEFAULT transaction_timestamp()
  revoked_at timestamptz(3) NULL
  UNIQUE (issuer_hash, provider_subject_hash)
  CHECK state='active' iff revoked_at IS NULL

actor_roles
  role_assignment_id r4_id PK
  subject_id r4_id FK actor_subjects
  role actor_role_kind_d
  granted_at timestamptz(3) DEFAULT transaction_timestamp()
  granted_by_subject_id r4_id NULL FK actor_subjects
  revoked_at timestamptz(3) NULL
  version bigint DEFAULT 1 CHECK >= 1
```

`uq_actor_roles__active` is unique on `(subject_id, role)` where
`revoked_at IS NULL`.

### 4.2 Third Place, entity, Room, and nonce registry

```text
third_places
  third_place_id r4_id PK
  schema_version text CHECK = 'third_place.v1'
  slug canonical_text UNIQUE CHECK octet_length BETWEEN 1 AND 80
  public_label canonical_text CHECK octet_length BETWEEN 1 AND 256
  state third_place_state_d DEFAULT 'active'
  version bigint DEFAULT 1 CHECK >= 1
  created_at timestamptz(3) DEFAULT transaction_timestamp()
  closed_at timestamptz(3) NULL
  CHECK state='active' iff closed_at IS NULL

third_place_events
  event_id r4_id PK
  third_place_id r4_id FK third_places
  event_kind third_place_event_kind_d
  prior_state third_place_state_d NULL
  new_state third_place_state_d
  actor_subject_id r4_id FK actor_subjects
  object_version bigint CHECK >= 1
  request_hash sha256_digest
  committed_at timestamptz(3) DEFAULT transaction_timestamp()

entities
  entity_id r4_id PK
  schema_version text CHECK = 'hosted_entity.v1'
  controller_subject_id r4_id FK actor_subjects
  public_display_label canonical_text CHECK octet_length BETWEEN 1 AND 256
  state entity_state_d DEFAULT 'active'
  version bigint DEFAULT 1 CHECK >= 1
  created_at timestamptz(3) DEFAULT transaction_timestamp()
  retired_at timestamptz(3) NULL
  CHECK state='active' iff retired_at IS NULL

rooms
  room_id r4_id PK
  schema_version text CHECK = 'room.v1'
  entity_id r4_id FK entities
  home_third_place_id r4_id NULL FK third_places
  label_ciphertext encrypted_field_v1
  label_object_version integer DEFAULT 1 CHECK >= 1
  room_kind room_kind_d
  interaction_mode interaction_mode_d
  status room_status_d DEFAULT 'active'
  current_projection_id r4_id NULL
  version bigint DEFAULT 1 CHECK >= 1
  event_high_water bigint DEFAULT 0 CHECK >= 0
  created_at timestamptz(3) DEFAULT transaction_timestamp()
  retired_at timestamptz(3) NULL
  deleted_at timestamptz(3) NULL
  CHECK private_grant_only implies home_third_place_id IS NULL
  CHECK private_grant_only implies interaction_mode IN ('invite_only','closed')
  CHECK status='active' iff retired_at IS NULL
  CHECK deleted_at IS NULL OR retired_at IS NOT NULL

room_lifecycle_events
  event_id r4_id PK
  room_id r4_id FK rooms
  event_kind room_lifecycle_event_kind_d
  prior_interaction_mode interaction_mode_d NULL
  new_interaction_mode interaction_mode_d
  prior_status room_status_d NULL
  new_status room_status_d
  prior_deleted boolean NULL
  new_deleted boolean
  actor_subject_id r4_id FK actor_subjects
  object_version bigint CHECK >= 1
  request_hash sha256_digest
  committed_at timestamptz(3) DEFAULT transaction_timestamp()
  UNIQUE (room_id, object_version)
  CHECK created iff prior mode/status/deleted are all NULL,
        new status='active', new_deleted=false, and object_version=1
  CHECK mode_set iff prior/new modes are distinct,
        prior/new status='active', and prior/new deleted=false
  CHECK retired iff prior status='active', new status='retired',
        prior/new modes are equal, and prior/new deleted=false
  CHECK deleted iff prior/new status='retired',
        prior/new modes are equal, prior_deleted=false, and new_deleted=true

encryption_nonces
  key_id canonical_text
  nonce bytea CHECK octet_length(nonce)=12
  table_name name
  row_id r4_id
  column_name name
  field_version integer CHECK >= 1
  created_at timestamptz(3) DEFAULT transaction_timestamp()
  PRIMARY KEY (key_id, nonce)
  UNIQUE (table_name, row_id, column_name, field_version)
```

Every ciphertext insert/replacement first inserts its decoded 12-byte nonce in
the same transaction. A duplicate `(key_id, nonce)` returns body-free
`409 encryption_nonce_reused`. Registry rows remain while the key ID can decrypt
any retained ciphertext; ordinary purge does not delete them.

### 4.3 Projection and curation

```text
projections
  projection_id r4_id PK
  schema_version text CHECK = 'projection_capsule.v1'
  room_id r4_id FK rooms
  entity_id r4_id FK entities
  capsule_ciphertext encrypted_field_v1 NULL
  capsule_object_version integer DEFAULT 1 CHECK >= 1
  capsule_plaintext_bytes integer CHECK BETWEEN 1 AND 32768
  title_scalar_count integer CHECK BETWEEN 1 AND 120
  summary_plaintext_bytes integer CHECK BETWEEN 0 AND 512
  disclosure_basis_id r4_id
  publication_attestation_id r4_id UNIQUE
  payload_hash sha256_digest
  owner_state projection_owner_state_d DEFAULT 'published_fresh'
  curation_state curation_state_d DEFAULT 'not_admitted'
  current boolean DEFAULT true
  lifecycle_version bigint DEFAULT 1 CHECK >= 1
  published_at timestamptz(3)
  fresh_until timestamptz(3)
  expires_at timestamptz(3)
  changed_at timestamptz(3)
  body_readable boolean DEFAULT true
  purged_at timestamptz(3) NULL
  UNIQUE (projection_id, room_id)
  CHECK published_at <= fresh_until <= expires_at
  CHECK expires_at <= published_at + interval '7 days'
  CHECK body_readable implies capsule_ciphertext IS NOT NULL
  CHECK purged_at IS NULL OR capsule_ciphertext IS NULL

projection_lifecycle_events
  event_id r4_id PK
  projection_id r4_id FK projections
  room_id r4_id FK rooms
  prior_owner_state projection_owner_state_d NULL
  new_owner_state projection_owner_state_d
  prior_current boolean NULL
  new_current boolean
  object_version bigint CHECK >= 1
  actor_class api_actor_class_d
  actor_subject_id r4_id NULL FK actor_subjects
  request_hash sha256_digest
  committed_at timestamptz(3)

curation_events
  event_id r4_id PK
  third_place_id r4_id FK third_places
  projection_id r4_id FK projections
  room_id r4_id FK rooms
  event_kind curation_event_kind_d
  prior_state curation_state_d
  new_state curation_state_d
  curator_subject_id r4_id FK actor_subjects
  object_version bigint CHECK >= 1
  request_hash sha256_digest
  committed_at timestamptz(3)
  UNIQUE (third_place_id, projection_id, event_kind)
```

`uq_projections__room_current` is unique on `(room_id)` where `current`.
After `projections` exists, add the deferred composite FK
`fk_rooms__current_projection` from `(current_projection_id, room_id)` to
`projections(projection_id, room_id)`.

Constraint triggers enforce:

- `projections.entity_id = rooms.entity_id`;
- Private projections remain `not_admitted`;
- curation is only `not_admitted → admitted → unlisted`;
- an unlisted version cannot be re-admitted;
- only the exact active public Room's current, fresh, unrevoked Projection may
  become admitted;
- content, basis, attestation, and payload hash are immutable;
- successor publication supersedes the prior current Projection atomically;
- stale remains current; superseded/revoked/expired does not;
- terminal state sets `body_readable=false` before purge scheduling.

### 4.4 Pairing and bindings

```text
room_bindings
  binding_id r4_id PK
  schema_version text CHECK = 'room_operator_binding.v1'
  room_id r4_id FK rooms
  pairing_id r4_id UNIQUE
  scope_version text CHECK = 'room_operator.v1'
  secret_digest sha256_digest UNIQUE
  client_public_key_hash sha256_digest
  state binding_state_d DEFAULT 'active'
  paired_at timestamptz(3)
  expires_at timestamptz(3)
  revoked_at timestamptz(3) NULL
  version bigint DEFAULT 1 CHECK >= 1
  CHECK paired_at < expires_at <= paired_at + interval '30 days'
  CHECK state='active' iff revoked_at IS NULL

pairing_challenges
  pairing_id r4_id PK
  schema_version text CHECK = 'pairing_challenge.v1'
  room_id r4_id FK rooms
  pairing_code_digest sha256_digest UNIQUE
  state pairing_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  client_public_key_hash sha256_digest NULL
  binding_id r4_id NULL FK room_bindings
  sealed_exchange_envelope bytea NULL
  sealed_exchange_hash sha256_digest NULL
  version bigint DEFAULT 1 CHECK >= 1
  CHECK issued_at < expires_at
  CHECK issued implies client key/binding/envelope/hash all NULL
  CHECK exchanged implies client key/binding/envelope/hash all NOT NULL
  CHECK expired implies sealed_exchange_envelope IS NULL
```

The pairing code is never stored plaintext. Its same-key recoverable issuance
result is stored only in encrypted `idempotency_records` and cleared no later
than the challenge expiry. The exchange envelope is already sealed to the
connector public key and is not an `a256gcm.v1` field.

### 4.5 Guest capabilities

```text
public_encounters
  encounter_id r4_id PK
  schema_version text CHECK = 'public_encounter.v1'
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  secret_digest sha256_digest
  state capability_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  accepted_count smallint DEFAULT 0 CHECK BETWEEN 0 AND 1
  unresolved_interaction_id r4_id NULL
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK expires_at <= issued_at + interval '24 hours'

grants
  grant_id r4_id PK
  schema_version text CHECK = 'grant.v1'
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  reentry_chain_id r4_id
  preset_id grant_preset_id_d
  secret_digest sha256_digest
  state capability_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  accepted_count smallint DEFAULT 0 CHECK >= 0
  accepted_quota smallint
  unresolved_interaction_id r4_id NULL
  agent_derivation_allowed boolean
  replaced_grant_id r4_id NULL FK grants
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK accepted_count <= accepted_quota
  CHECK preset/quota is exactly one_visit/1, short_exchange/2,
        familiar_collaborator/3, or trusted_collaborator/10

grant_offers
  offer_id r4_id PK
  schema_version text CHECK = 'grant_offer.v1'
  source_interaction_id r4_id FK interactions DEFERRABLE
  target_room_id r4_id FK rooms
  target_projection_id r4_id FK projections
  preset_id grant_preset_id_d
  state grant_offer_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  acceptance_expires_at timestamptz(3)
  offered_grant_expires_at timestamptz(3)
  accepted_grant_id r4_id NULL FK grants
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK acceptance_expires_at <= offered_grant_expires_at

direct_grant_invites
  invite_id r4_id PK
  schema_version text CHECK = 'direct_grant_invite.v1'
  target_room_id r4_id FK rooms
  target_projection_id r4_id FK projections
  preset_id grant_preset_id_d
  secret_digest sha256_digest UNIQUE
  state direct_invite_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  redemption_expires_at timestamptz(3)
  offered_grant_expires_at timestamptz(3)
  redeemed_grant_id r4_id NULL FK grants
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK redemption_expires_at <= offered_grant_expires_at

agent_derivatives
  derivative_id r4_id PK
  schema_version text CHECK = 'agent_derivative.v1'
  parent_capability_class capability_class_d
  parent_capability_id r4_id
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  secret_digest sha256_digest
  bound_reply_capability_digest sha256_digest
  bound_delete_capability_digest sha256_digest
  state capability_state_d DEFAULT 'issued'
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  accepted_count smallint DEFAULT 0 CHECK BETWEEN 0 AND 1
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK parent class IN ('public_encounter','grant')
  CHECK expires_at <= issued_at + interval '15 minutes'
  CHECK derivative/reply/delete digests are pairwise distinct

capability_events
  event_id r4_id PK
  capability_class capability_class_d
  capability_id r4_id
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  prior_state capability_state_d NULL
  new_state capability_state_d
  object_version bigint CHECK >= 1
  issuance_secret_digest sha256_digest NULL
  actor_class api_actor_class_d
  request_hash sha256_digest
  committed_at timestamptz(3)
  UNIQUE (capability_class, capability_id, object_version)
```

Exact partial uniqueness:

```text
uq_capability_events__issuance_secret
  UNIQUE (issuance_secret_digest)
  WHERE issuance_secret_digest IS NOT NULL

uq_grants__live_chain
  UNIQUE (room_id, projection_id, reentry_chain_id)
  WHERE state IN ('issued','consumed')

uq_grant_offers__live_source
  UNIQUE (source_interaction_id)
  WHERE state='issued'
```

Expired live-state rows are normalized to `expired` inside the same locked
transaction before a conflicting chain is created.

### 4.6 Interactions and Fresh cycles

```text
interactions
  interaction_id r4_id PK
  schema_version text CHECK = 'interaction.v1'
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  origin_projection_hash sha256_digest
  origin_state_at_acceptance projection_owner_state_d
  origin_capability_class capability_class_d
  origin_capability_id r4_id
  submission_derivative_id r4_id NULL FK agent_derivatives
  unresolved_scope_id r4_id
  interaction_type interaction_type_d
  request_ciphertext encrypted_field_v1 NULL
  request_object_version integer DEFAULT 1 CHECK >= 1
  request_plaintext_bytes integer CHECK BETWEEN 1 AND 12288
  request_content_hash sha256_digest
  guest_capsule_ciphertext encrypted_field_v1 NULL
  guest_capsule_object_version integer NULL CHECK >= 1
  guest_capsule_plaintext_bytes integer NULL CHECK BETWEEN 0 AND 4096
  guest_capsule_hash sha256_digest NULL
  guest_capsule_level guest_capsule_level_d
  consent interaction_consent_d
  consent_envelope jsonb NULL
  consent_envelope_hash sha256_digest NULL
  accepted_at timestamptz(3)
  expires_at timestamptz(3)
  reply_capability_id r4_id
  reply_capability_digest sha256_digest UNIQUE
  delete_capability_digest sha256_digest UNIQUE
  state interaction_state_d DEFAULT 'accepted'
  state_version bigint DEFAULT 1 CHECK >= 1
  body_readable boolean DEFAULT true
  terminal_at timestamptz(3) NULL
  purged_at timestamptz(3) NULL
  canonical_object_hash sha256_digest
  UNIQUE (interaction_id, room_id)
  CHECK expires_at <= accepted_at + interval '30 days'
  CHECK reply digest <> delete digest
  CHECK manual_owner_only iff consent envelope/hash are NULL
  CHECK allow_owner_local_ai iff consent envelope/hash are NOT NULL
  CHECK capsule ciphertext is NULL iff capsule bytes/hash/version are NULL
  CHECK body_readable implies request_ciphertext IS NOT NULL
  CHECK purged_at IS NULL OR request/capsule ciphertext are NULL

interaction_lifecycle_events
  event_id r4_id PK
  interaction_id r4_id FK interactions
  room_id r4_id FK rooms
  prior_state interaction_state_d NULL
  new_state interaction_state_d
  object_version bigint CHECK >= 1
  actor_class api_actor_class_d
  actor_subject_id r4_id NULL FK actor_subjects
  request_hash sha256_digest
  committed_at timestamptz(3)

fresh_cycle_reservations
  reservation_id r4_id PK
  schema_version text CHECK = 'fresh_cycle_reservation.v1'
  interaction_id r4_id FK interactions
  start_authorization_hash sha256_digest
  session_envelope_hash sha256_digest
  state fresh_cycle_state_d
  idempotency_key idempotency_key
  reserved_at timestamptz(3)
  first_dispatch_committed_at timestamptz(3) NULL
  released_at timestamptz(3) NULL
  version bigint DEFAULT 1 CHECK >= 1
  canonical_object_hash sha256_digest
  CHECK dispatch_committed implies first dispatch timestamp NOT NULL
  CHECK released_zero_dispatch implies first dispatch timestamp NULL
  CHECK released_zero_dispatch iff released_at IS NOT NULL

dispatch_permits
  permit_id r4_id PK
  schema_version text CHECK = 'dispatch_permit.v1'
  interaction_id r4_id FK interactions
  reservation_id r4_id FK fresh_cycle_reservations
  session_envelope_hash sha256_digest
  start_authorization_hash sha256_digest
  provider text CHECK = 'OpenAI'
  model_id canonical_text CHECK octet_length BETWEEN 1 AND 256
  payload_hash sha256_digest
  dispatch_ordinal smallint CHECK BETWEEN 1 AND 3
  idempotency_key idempotency_key
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  consumed_at timestamptz(3) NULL
  canonical_object_hash sha256_digest
  UNIQUE (reservation_id, dispatch_ordinal)
  CHECK issued_at < expires_at <= issued_at + interval '30 seconds'
```

Exact partial uniqueness:

```text
uq_interactions__unresolved_scope
  UNIQUE (unresolved_scope_id)
  WHERE state IN ('accepted','seen_locally','preparing')

uq_fresh_cycles__active
  UNIQUE (interaction_id)
  WHERE state IN ('reserved','dispatch_committed')

uq_fresh_cycles__spent
  UNIQUE (interaction_id)
  WHERE state='dispatch_committed'
```

A proven `released_zero_dispatch` reservation can be followed by a newly
reviewed reservation. No Interaction can have two active or two dispatch-spent
automatic cycles.

### 4.7 Responses

```text
responses
  response_id r4_id PK
  schema_version text CHECK = 'response.v1'
  interaction_id r4_id UNIQUE FK interactions
  room_id r4_id FK rooms
  projection_id r4_id FK projections
  body_ciphertext encrypted_field_v1 NULL
  body_object_version integer DEFAULT 1 CHECK >= 1
  body_plaintext_bytes integer CHECK BETWEEN 1 AND 16384
  body_content_hash sha256_digest
  candidate_hash sha256_digest
  publication_payload_hash sha256_digest
  origin_state_at_publication projection_owner_state_d
  source_disclosure_class response_source_disclosure_d
  local_basis_attestation_id r4_id
  approval_attestation_id r4_id UNIQUE
  publication_receipt_id r4_id UNIQUE
  published_at timestamptz(3)
  expires_at timestamptz(3)
  state response_state_d DEFAULT 'available'
  state_version bigint DEFAULT 1 CHECK >= 1
  body_readable boolean DEFAULT true
  terminal_at timestamptz(3) NULL
  purged_at timestamptz(3) NULL
  canonical_object_hash sha256_digest
  CHECK expires_at <= published_at + interval '7 days'
  CHECK body_readable implies body_ciphertext IS NOT NULL
  CHECK purged_at IS NULL OR body_ciphertext IS NULL

response_lifecycle_events
  event_id r4_id PK
  response_id r4_id FK responses
  interaction_id r4_id FK interactions
  room_id r4_id FK rooms
  prior_state response_state_d NULL
  new_state response_state_d
  object_version bigint CHECK >= 1
  actor_class api_actor_class_d
  actor_subject_id r4_id NULL FK actor_subjects
  request_hash sha256_digest
  committed_at timestamptz(3)
```

A deferred constraint trigger enforces `response.expires_at <=
interaction.expires_at`. Terminal precedence is exactly:

```text
interaction_deleted
→ room_retired
→ origin_revoked
→ response_revoked
→ response_expired
```

Terminal transition sets `body_readable=false` before creating the purge job.

### 4.8 Notification state and outbox

```text
notification_endpoints
  interaction_id r4_id PK FK interactions
  schema_version text CHECK = 'notification_endpoint.v1'
  state notification_endpoint_state_d DEFAULT 'absent'
  address_ciphertext encrypted_field_v1 NULL
  address_object_version integer NULL CHECK >= 1
  redacted_marker text NULL CHECK = 'email_***'
  verification_expires_at timestamptz(3) NULL
  verification_attempts smallint DEFAULT 0 CHECK BETWEEN 0 AND 5
  verification_sends_this_hour smallint DEFAULT 0 CHECK BETWEEN 0 AND 3
  confirmed_at timestamptz(3) NULL
  version bigint DEFAULT 1 CHECK >= 1
  updated_at timestamptz(3) DEFAULT transaction_timestamp()
  CHECK absent/cleared implies address/version/expiry/confirmed all NULL
  CHECK verification_pending implies address/version/expiry NOT NULL
  CHECK confirmed implies address/version/confirmed NOT NULL and expiry NULL

notification_challenges
  challenge_id r4_id PK
  interaction_id r4_id FK interactions
  code_digest sha256_digest NULL
  state notification_challenge_state_d DEFAULT 'pending'
  issued_at timestamptz(3)
  expires_at timestamptz(3)
  attempts smallint DEFAULT 0 CHECK BETWEEN 0 AND 5
  used_at timestamptz(3) NULL
  terminal_at timestamptz(3) NULL
  version bigint DEFAULT 1 CHECK >= 1
  CHECK expires_at <= issued_at + interval '15 minutes'
  CHECK pending implies code_digest IS NOT NULL
  CHECK non-pending implies code_digest IS NULL

notification_outbox
  outbox_id r4_id PK
  schema_version text CHECK = 'notification_outbox.v1'
  semantic_kind notification_semantic_kind_d
  interaction_id r4_id FK interactions
  response_id r4_id NULL FK responses
  challenge_id r4_id NULL FK notification_challenges
  state notification_notice_state_d DEFAULT 'ready_pending'
  target_ciphertext encrypted_field_v1 NULL
  target_object_version integer NULL CHECK >= 1
  verification_code_ciphertext encrypted_field_v1 NULL
  verification_code_object_version integer NULL CHECK >= 1
  current_attempt_id r4_id NULL
  reconciliation_deadline timestamptz(3) NULL
  no_future_retry boolean DEFAULT false
  version bigint DEFAULT 1 CHECK >= 1
  created_at timestamptz(3)
  updated_at timestamptz(3)
  terminal_at timestamptz(3) NULL
  CHECK response_ready implies response NOT NULL and challenge/code NULL
  CHECK verification_code implies challenge/code NOT NULL and response NULL
  CHECK ready_pending implies target NOT NULL and current_attempt_id NULL
  CHECK accepted/failed/canceled implies target NULL
  CHECK final no_future_retry implies target/code NULL

notification_attempts
  attempt_id r4_id PK
  outbox_id r4_id UNIQUE FK notification_outbox
  state notification_attempt_state_d DEFAULT 'submitting'
  provider_idempotency_key canonical_text UNIQUE
  handoff_count smallint DEFAULT 1 CHECK BETWEEN 1 AND 2
  lease_owner uuid
  lease_acquired_at timestamptz(3)
  lease_expires_at timestamptz(3)
  reconciliation_deadline timestamptz(3)
  provider_evidence_hash sha256_digest NULL
  provider_result_at timestamptz(3) NULL
  created_at timestamptz(3)
  updated_at timestamptz(3)
  version bigint DEFAULT 1 CHECK >= 1
  CHECK lease_expires_at > lease_acquired_at
  CHECK reconciliation_deadline > lease_acquired_at
```

Exact partial uniqueness:

```text
uq_notification_challenges__pending
  UNIQUE (interaction_id) WHERE state='pending'

uq_notification_outbox__ready_semantic
  UNIQUE (interaction_id) WHERE semantic_kind='response_ready'
```

The outbox owns the exact encrypted target/code snapshot. Provider work occurs
outside the transaction and outside all database locks.

### 4.9 Ordered events, receipts, rates, and retention

```text
room_event_stream
  room_id r4_id FK rooms
  sequence bigint CHECK >= 1
  event_id r4_id UNIQUE
  schema_version text CHECK = 'room_event.v1'
  object_type room_event_object_type_d
  object_id r4_id
  event_type canonical_text CHECK octet_length BETWEEN 3 AND 128
  object_version bigint CHECK >= 1
  payload_hash sha256_digest
  committed_at timestamptz(3)
  body_available boolean
  reconciliation_snapshot boolean DEFAULT false
  terminal_tombstone_expires_at timestamptz(3) NULL
  PRIMARY KEY (room_id, sequence)

operation_receipts
  receipt_id r4_id PK
  schema_version text CHECK = 'operation_receipt.v1'
  room_id r4_id FK rooms
  actor_class api_actor_class_d
  actor_subject_id r4_id NULL FK actor_subjects
  actor_scope_digest sha256_digest
  action canonical_text CHECK octet_length BETWEEN 1 AND 128
  idempotency_key idempotency_key
  canonical_request_hash sha256_digest
  target_id r4_id
  target_version bigint CHECK >= 1
  status operation_status_d
  body_free_code canonical_text CHECK octet_length BETWEEN 1 AND 128
  result_body_free jsonb
  committed_at timestamptz(3)
  expires_at timestamptz(3)

idempotency_records
  room_id r4_id FK rooms
  actor_scope_digest sha256_digest
  action canonical_text
  idempotency_key idempotency_key
  canonical_request_hash sha256_digest
  http_status smallint
  result_code canonical_text
  recovery_kind idempotency_recovery_kind_d
  body_free_result jsonb NULL
  sensitive_result_ciphertext encrypted_field_v1 NULL
  sensitive_result_object_version integer NULL CHECK >= 1
  sensitive_expires_at timestamptz(3) NULL
  expired_http_status smallint NULL
  expired_body_free_result jsonb NULL
  receipt_id r4_id FK operation_receipts
  created_at timestamptz(3)
  retention_expires_at timestamptz(3)
  PRIMARY KEY (actor_scope_digest, action, idempotency_key)
  CHECK encrypted_transient iff sensitive ciphertext/version/expiry NOT NULL
  CHECK retention_expires_at <= created_at + interval '37 days'

rate_buckets
  rate_event_id r4_id PK
  room_id r4_id FK rooms
  scope text CHECK IN ('encounter_issue','public_accept')
  bucket_digest sha256_digest
  source_object_id r4_id
  committed_at timestamptz(3)
  expires_at timestamptz(3)
  UNIQUE (scope, source_object_id)
  CHECK expires_at <= committed_at + interval '24 hours'

retention_jobs
  retention_job_id r4_id PK
  room_id r4_id FK rooms
  target_kind retention_target_kind_d
  target_row_id r4_id
  target_column name NULL
  terminal_at timestamptz(3)
  due_at timestamptz(3)
  slo_deadline_at timestamptz(3)
  state retention_job_state_d DEFAULT 'pending'
  lease_owner uuid NULL
  lease_expires_at timestamptz(3) NULL
  attempt_count integer DEFAULT 0 CHECK >= 0
  last_error_code canonical_text NULL
  payload_present boolean DEFAULT true
  purged_at timestamptz(3) NULL
  outcome purge_outcome_d NULL
  version bigint DEFAULT 1 CHECK >= 1
  created_at timestamptz(3)
  UNIQUE (target_kind, target_row_id, target_column, terminal_at)
  CHECK due_at >= terminal_at
  CHECK slo_deadline_at = terminal_at + interval '24 hours'
  CHECK completed implies payload_present=false and outcome NOT NULL

purge_watermarks
  watermark_name text PK CHECK = 'hosted_janitor'
  last_successful_purge_at timestamptz(3)
  last_batch_id r4_id NULL
  version bigint DEFAULT 1 CHECK >= 1
  updated_at timestamptz(3)

operator_incidents
  incident_id r4_id PK
  code operator_incident_code_d
  room_id r4_id NULL FK rooms
  target_kind retention_target_kind_d NULL
  target_row_id r4_id NULL
  opened_at timestamptz(3)
  resolved_at timestamptz(3) NULL
  body_free boolean DEFAULT true CHECK = true
  UNIQUE (code, target_kind, target_row_id)
```

## 5. Exact indexes

Every PK/UNIQUE constraint has the explicit corresponding btree name
`pk_<table>` or `uq_<table>__<purpose>`. Every FK column receives a btree index
unless it is already the leading part of an index below.

```text
ix_actor_roles__active
  actor_roles(subject_id, role) WHERE revoked_at IS NULL

ix_rooms__entity
  rooms(entity_id)
ix_rooms__third_place
  rooms(home_third_place_id) WHERE home_third_place_id IS NOT NULL
ix_rooms__active_kind
  rooms(room_kind, room_id) WHERE status='active'
ix_room_lifecycle_events__room_time
  room_lifecycle_events(room_id, committed_at, event_id)

ix_projections__room_owner_time
  projections(room_id, owner_state, expires_at)
ix_projections__discovery
  projections(room_id, curation_state, fresh_until, expires_at)
  WHERE current AND owner_state='published_fresh'
ix_projection_events__version
  projection_lifecycle_events(projection_id, object_version)
ix_curation_events__place_time
  curation_events(third_place_id, committed_at, projection_id)

ix_room_bindings__active
  room_bindings(room_id, expires_at) WHERE state='active'
ix_pairing_challenges__expiry
  pairing_challenges(room_id, expires_at) WHERE state='issued'

ix_public_encounters__scope_state
  public_encounters(room_id, projection_id, state, expires_at)
ix_grants__scope_state
  grants(room_id, projection_id, state, expires_at)
ix_grants__chain
  grants(room_id, projection_id, reentry_chain_id, issued_at)
ix_grant_offers__target
  grant_offers(target_room_id, target_projection_id, state,
               acceptance_expires_at)
ix_direct_invites__target
  direct_grant_invites(target_room_id, target_projection_id, state,
                       redemption_expires_at)
ix_agent_derivatives__parent
  agent_derivatives(parent_capability_class, parent_capability_id, state,
                    expires_at)
ix_capability_events__version
  capability_events(capability_class, capability_id, object_version)

ix_interactions__room_state_time
  interactions(room_id, state, expires_at)
ix_interactions__projection
  interactions(projection_id, accepted_at)
ix_interactions__origin
  interactions(origin_capability_class, origin_capability_id)
ix_interaction_events__version
  interaction_lifecycle_events(interaction_id, object_version)
ix_cycles__interaction_time
  fresh_cycle_reservations(interaction_id, reserved_at)
ix_dispatch_permits__interaction_ordinal
  dispatch_permits(interaction_id, dispatch_ordinal)

ix_responses__room_state_time
  responses(room_id, state, expires_at)
ix_response_events__version
  response_lifecycle_events(response_id, object_version)

ix_notification_challenges__expiry
  notification_challenges(interaction_id, expires_at)
ix_notification_outbox__claim
  notification_outbox(state, updated_at, outbox_id)
  WHERE state IN ('ready_pending','submitting','delivery_unknown')
ix_notification_attempts__lease
  notification_attempts(state, lease_expires_at, attempt_id)

ix_room_events__event
  room_event_stream(event_id)
ix_room_events__replay
  room_event_stream(room_id, sequence, committed_at)
ix_room_events__object_latest
  room_event_stream(room_id, object_type, object_id, sequence DESC)

ix_operation_receipts__room_time
  operation_receipts(room_id, committed_at)
ix_operation_receipts__expiry
  operation_receipts(expires_at)
ix_idempotency_records__expiry
  idempotency_records(retention_expires_at)
ix_rate_buckets__count
  rate_buckets(room_id, scope, bucket_digest, committed_at)
ix_retention_jobs__claim
  retention_jobs(state, due_at, room_id, target_kind, target_row_id)
  WHERE state IN ('pending','failed')
ix_operator_incidents__open
  operator_incidents(opened_at) WHERE resolved_at IS NULL
```

## 6. Exact function surface

All functions are `SECURITY DEFINER`, owned by `forme_r4_migrate`, set
`search_path = pg_catalog, forme_r4`, and have `EXECUTE` revoked from `PUBLIC`.
All API mutations run in an application-opened `SERIALIZABLE` transaction and
return `api_result_v1`. Expected semantic failures are returned, not raised as
raw database messages.

### 6.1 Read-only functions

```sql
api_third_place_list() RETURNS SETOF api_result_v1

api_projection_read(
  p_projection_id r4_id,
  p_capability_digest sha256_digest DEFAULT NULL
) RETURNS api_result_v1

api_interaction_read(
  p_interaction_id r4_id,
  p_reply_capability_digest sha256_digest
) RETURNS api_result_v1

api_control_status(p_subject_id r4_id) RETURNS api_result_v1

api_control_interaction_read(
  p_subject_id r4_id,
  p_interaction_id r4_id
) RETURNS api_result_v1

api_room_operator_status(
  p_binding_id r4_id,
  p_binding_digest sha256_digest,
  p_room_id r4_id
) RETURNS api_result_v1
```

They create no receipt, fetch no event batch, advance no cursor, normalize no
state, perform no purge, and acquire no mutation lock.

### 6.2 Public and Guest mutations

```sql
tx_public_encounter_issue(
  p_ctx mutation_context_v1, p_projection_id r4_id,
  p_encounter_id r4_id, p_secret_digest sha256_digest,
  p_edge_bucket_digest sha256_digest
) RETURNS api_result_v1

tx_interaction_create(
  p_ctx mutation_context_v1,
  p_submission_class capability_class_d, p_submission_id r4_id,
  p_projection_id r4_id, p_interaction_id r4_id,
  p_interaction_type interaction_type_d,
  p_request_ciphertext encrypted_field_v1, p_request_bytes integer,
  p_request_hash sha256_digest,
  p_guest_capsule_ciphertext encrypted_field_v1,
  p_guest_capsule_bytes integer, p_guest_capsule_hash sha256_digest,
  p_guest_capsule_level guest_capsule_level_d,
  p_consent interaction_consent_d,
  p_consent_envelope jsonb, p_consent_envelope_hash sha256_digest,
  p_reply_capability_id r4_id, p_reply_digest sha256_digest,
  p_delete_digest sha256_digest
) RETURNS api_result_v1

tx_interaction_delete(
  p_ctx mutation_context_v1, p_interaction_id r4_id,
  p_delete_digest sha256_digest
) RETURNS api_result_v1

tx_notification_set(
  p_ctx mutation_context_v1, p_interaction_id r4_id,
  p_reply_digest sha256_digest,
  p_address_ciphertext encrypted_field_v1, p_challenge_id r4_id,
  p_code_digest sha256_digest, p_verification_outbox_id r4_id,
  p_target_ciphertext encrypted_field_v1,
  p_verification_code_ciphertext encrypted_field_v1
) RETURNS api_result_v1

tx_notification_remove(
  p_ctx mutation_context_v1, p_interaction_id r4_id,
  p_reply_digest sha256_digest
) RETURNS api_result_v1

tx_notification_verify(
  p_ctx mutation_context_v1, p_interaction_id r4_id,
  p_reply_digest sha256_digest, p_code_digest sha256_digest
) RETURNS api_result_v1

tx_grant_offer_accept(
  p_ctx mutation_context_v1, p_offer_id r4_id,
  p_reply_digest sha256_digest, p_grant_id r4_id,
  p_grant_secret_digest sha256_digest, p_reentry_chain_id r4_id
) RETURNS api_result_v1

tx_direct_invite_redeem(
  p_ctx mutation_context_v1, p_invite_id r4_id,
  p_invite_digest sha256_digest, p_grant_id r4_id,
  p_grant_secret_digest sha256_digest, p_reentry_chain_id r4_id
) RETURNS api_result_v1

tx_agent_derivative_mint(
  p_ctx mutation_context_v1,
  p_parent_class capability_class_d, p_parent_id r4_id,
  p_parent_digest sha256_digest, p_derivative_id r4_id,
  p_derivative_digest sha256_digest, p_reply_digest sha256_digest,
  p_delete_digest sha256_digest
) RETURNS api_result_v1

tx_room_pair_exchange(
  p_ctx mutation_context_v1, p_pairing_id r4_id,
  p_pairing_code_digest sha256_digest,
  p_client_public_key_hash sha256_digest, p_binding_id r4_id,
  p_binding_secret_digest sha256_digest,
  p_sealed_exchange_envelope bytea,
  p_sealed_exchange_hash sha256_digest
) RETURNS api_result_v1
```

### 6.3 Controller and Curator mutations

```sql
tx_room_create(
  p_ctx mutation_context_v1, p_room_id r4_id, p_entity_id r4_id,
  p_room_kind room_kind_d, p_home_third_place_id r4_id,
  p_label_ciphertext encrypted_field_v1
) RETURNS api_result_v1

tx_room_pair_issue(
  p_ctx mutation_context_v1, p_room_id r4_id, p_pairing_id r4_id,
  p_pairing_code_digest sha256_digest,
  p_sensitive_recovery_ciphertext encrypted_field_v1
) RETURNS api_result_v1

tx_room_binding_revoke(
  p_ctx mutation_context_v1, p_binding_id r4_id
) RETURNS api_result_v1

tx_room_mode_set(
  p_ctx mutation_context_v1, p_room_id r4_id,
  p_mode interaction_mode_d
) RETURNS api_result_v1

tx_room_retire(p_ctx mutation_context_v1, p_room_id r4_id)
  RETURNS api_result_v1
tx_room_delete(p_ctx mutation_context_v1, p_room_id r4_id)
  RETURNS api_result_v1
tx_projection_revoke(p_ctx mutation_context_v1, p_projection_id r4_id)
  RETURNS api_result_v1
tx_response_revoke(p_ctx mutation_context_v1, p_response_id r4_id)
  RETURNS api_result_v1

tx_grant_issue(
  p_ctx mutation_context_v1, p_grant_id r4_id, p_room_id r4_id,
  p_projection_id r4_id, p_reentry_chain_id r4_id,
  p_preset_id grant_preset_id_d, p_secret_digest sha256_digest,
  p_agent_derivation_allowed boolean
) RETURNS api_result_v1

tx_grant_replace(
  p_ctx mutation_context_v1, p_prior_grant_id r4_id,
  p_new_grant_id r4_id, p_new_secret_digest sha256_digest,
  p_preset_id grant_preset_id_d,
  p_agent_derivation_allowed boolean
) RETURNS api_result_v1

tx_grant_revoke(p_ctx mutation_context_v1, p_grant_id r4_id)
  RETURNS api_result_v1

tx_grant_offer_issue(
  p_ctx mutation_context_v1, p_offer_id r4_id,
  p_source_interaction_id r4_id, p_target_room_id r4_id,
  p_target_projection_id r4_id, p_preset_id grant_preset_id_d,
  p_acceptance_expires_at timestamptz(3),
  p_offered_grant_expires_at timestamptz(3)
) RETURNS api_result_v1

tx_grant_offer_revoke(p_ctx mutation_context_v1, p_offer_id r4_id)
  RETURNS api_result_v1

tx_direct_invite_issue(
  p_ctx mutation_context_v1, p_invite_id r4_id,
  p_target_room_id r4_id, p_target_projection_id r4_id,
  p_preset_id grant_preset_id_d, p_invite_digest sha256_digest,
  p_redemption_expires_at timestamptz(3),
  p_offered_grant_expires_at timestamptz(3)
) RETURNS api_result_v1

tx_direct_invite_revoke(p_ctx mutation_context_v1, p_invite_id r4_id)
  RETURNS api_result_v1
tx_interaction_close(p_ctx mutation_context_v1, p_interaction_id r4_id)
  RETURNS api_result_v1
tx_curation_admit(
  p_ctx mutation_context_v1, p_third_place_id r4_id,
  p_projection_id r4_id
) RETURNS api_result_v1
tx_curation_unlist(
  p_ctx mutation_context_v1, p_third_place_id r4_id,
  p_projection_id r4_id
) RETURNS api_result_v1
```

### 6.4 `room_operator.v1` mutations

```sql
tx_room_operator_sync(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_room_id r4_id,
  p_after_sequence bigint
) RETURNS api_result_v1

tx_room_operator_pull(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id
) RETURNS api_result_v1

tx_fresh_cycle_reserve(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_reservation_id r4_id, p_start_authorization_hash sha256_digest,
  p_session_envelope_hash sha256_digest
) RETURNS api_result_v1

tx_fresh_cycle_recover(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_reservation_id r4_id, p_start_authorization_hash sha256_digest,
  p_session_envelope_hash sha256_digest
) RETURNS api_result_v1

tx_fresh_cycle_abandon_zero_dispatch(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_reservation_id r4_id, p_start_authorization_hash sha256_digest,
  p_session_envelope_hash sha256_digest,
  p_transport_journal_dispatches integer
) RETURNS api_result_v1

tx_dispatch_permit_issue(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_reservation_id r4_id, p_session_envelope_hash sha256_digest,
  p_start_authorization_hash sha256_digest, p_provider text,
  p_model_id canonical_text, p_payload_hash sha256_digest,
  p_dispatch_ordinal smallint, p_permit_id r4_id
) RETURNS api_result_v1

tx_room_event_ack(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_room_id r4_id,
  p_event_id r4_id, p_sequence bigint, p_event_hash sha256_digest
) RETURNS api_result_v1

tx_projection_deliver(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_projection_id r4_id,
  p_room_id r4_id, p_entity_id r4_id,
  p_capsule_ciphertext encrypted_field_v1,
  p_capsule_plaintext_bytes integer, p_title_scalar_count integer,
  p_summary_plaintext_bytes integer, p_disclosure_basis_id r4_id,
  p_payload_hash sha256_digest, p_publication_attestation jsonb
) RETURNS api_result_v1

tx_response_deliver(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_response_id r4_id, p_body_ciphertext encrypted_field_v1,
  p_body_plaintext_bytes integer, p_body_content_hash sha256_digest,
  p_candidate_hash sha256_digest,
  p_publication_payload_hash sha256_digest,
  p_origin_state projection_owner_state_d,
  p_source_disclosure response_source_disclosure_d,
  p_local_basis_attestation_id r4_id,
  p_publication_attestation jsonb
) RETURNS api_result_v1

tx_projection_attest_stale(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_projection_id r4_id
) RETURNS api_result_v1

tx_local_purge_receipt(
  p_ctx mutation_context_v1, p_binding_id r4_id,
  p_binding_digest sha256_digest, p_interaction_id r4_id,
  p_local_bytes_absent boolean
) RETURNS api_result_v1
```

### 6.5 Notification and janitor functions

```sql
notify_claim_next(p_worker_id uuid)
  RETURNS notification_claim_v1

notify_record_provider_result(
  p_worker_id uuid, p_attempt_id r4_id, p_result text,
  p_provider_evidence_hash sha256_digest
) RETURNS api_result_v1

notify_claim_reconciliation(p_worker_id uuid)
  RETURNS notification_claim_v1

notify_record_reconciliation(
  p_worker_id uuid, p_attempt_id r4_id, p_result text,
  p_provider_evidence_hash sha256_digest
) RETURNS api_result_v1

notify_apply_late_authenticated_result(
  p_attempt_id r4_id, p_result text,
  p_provider_evidence_hash sha256_digest
) RETURNS api_result_v1

janitor_purge_due(
  p_invocation text, p_batch_size integer DEFAULT 100
) RETURNS SETOF api_result_v1

janitor_compact_room_events(
  p_batch_size integer DEFAULT 100
) RETURNS SETOF api_result_v1

janitor_health() RETURNS api_result_v1
```

Notification result is exactly `accepted`, `definitively_not_accepted`,
`unknown`, or `failed`. Janitor invocation is exactly `scheduled` or `manual`;
batch size is `1..100`.

## 7. Stable error and transaction contract

Allowed HTTP statuses are `200`, `201`, `202`, `400`, `401`, `403`, `404`,
`409`, `410`, `413`, `429`, and sanitized `503`. Cross-Room, wrong-secret, and
existence-sensitive failures return `404 not_found`.

The closed body-free error catalog is:

```text
not_found
invalid_request
invalid_request_shape
invalid_capability_secret
invalid_hash
invalid_client_bucket
invalid_room_kind
invalid_room_mode
invalid_interaction_type
invalid_consent
invalid_preset
invalid_agent_derivation_flag
invalid_cursor
invalid_dispatch_ordinal
invalid_email
payload_too_large
expected_version_required
version_conflict
idempotency_conflict
encryption_nonce_reused
immutable_projection_exists
immutable_response_exists
publication_attestation_used
publication_arm_mismatch
projection_entity_mismatch
projection_scope_mismatch
projection_chronology_invalid
response_scope_mismatch
response_chronology_invalid
source_disclosure_not_consented
interaction_type_not_supported
interaction_recovery_not_distinct
derivative_recovery_not_distinct
derivative_recovery_reuses_parent
unresolved_interaction_exists
grant_replacement_required
grant_not_replaceable
grant_chain_conflict
grant_terminal
live_grant_offer_exists
source_interaction_terminal
fixed_grant_expiry_mismatch
offer_deadline_after_grant_expiry
invite_deadline_after_grant_expiry
terminal_interaction
response_terminal
invalid_projection_transition
successor_required
projection_not_admissible
room_kind_immutable
room_already_retired
retire_first
binding_already_revoked
pairing_already_consumed
cycle_already_reserved
cycle_recovery_mismatch
cycle_not_reserved
dispatch_cycle_mismatch
provider_mismatch
zero_dispatch_attestation_required
zero_dispatch_release_denied
ack_idempotency_mismatch
ack_mismatch
cursor_ahead
endpoint_handoff_already_began
verification_failed
verification_attempts_exhausted
verification_send_rate_limited
late_result_not_applicable
room_retired
room_closed
projection_not_yet_published
projection_not_fresh
projection_superseded
projection_revoked
projection_expired
target_projection_invalidated
private_grant_required
parent_capability_unavailable
parent_capability_inactive
encounter_consumed
encounter_revoked
encounter_replaced
encounter_expired
encounter_invalidated
grant_quota_exhausted
grant_revoked
grant_replaced
grant_expired
grant_invalidated
derivative_consumed
derivative_revoked
derivative_replaced
derivative_expired
derivative_invalidated
derivative_recovery_unavailable
interaction_expired
interaction_not_eligible
interaction_not_seen_locally
origin_not_eligible
origin_revoked
response_expired
pairing_expired
cycle_not_found
cycle_released
notification_not_eligible
verification_unavailable
verification_expired
purge_not_proven
public_encounter_hourly_limited
public_encounter_daily_limited
public_accept_daily_limited
public_room_pool_exhausted
service_unhealthy
storage_unavailable
integrity_violation
```

Unexpected database errors expose only the caller correlation ID and sanitized
`503 integrity_violation` or `503 storage_unavailable`. Raw SQL, constraint
name, table name, stack, ciphertext, or out-of-scope ID is never returned.
Internal invariant SQLSTATEs are exactly:

```text
P4A01 gate_b_contract_violation
P4A02 lock_order_violation
P4A03 ciphertext_invalid
P4A04 migration_target_invalid
```

Same actor/action/key plus same request hash returns the original recovery
result. Same key plus different request hash returns `409 idempotency_conflict`.
A new key cannot repeat a terminal semantic effect.

## 8. Global lock order

Every semantic transaction uses:

```text
1. per-Room transaction advisory lock
2. Room row
3. Projection row
4. capability / Grant / re-entry rows in bytewise C opaque-ID order
5. Interaction row
6. Fresh-cycle rows, then dispatch-permit rows
7. Response row
8. notification endpoint, outbox, then attempt rows
9. idempotency row
10. Room event high-water / append position
11. retention job / purge watermark rows
```

Rules:

- Multiple Rooms are locked in `COLLATE "C"` ID order.
- A missing class is skipped; order is never inverted.
- Notification candidate selection is an unlocked read, followed by exact Room
  lock and full recheck before claim.
- No provider/fake-provider work occurs under a database lock.
- Janitor first takes its singleton lock, then exact Room locks in C order.
- Idempotency is checked non-locking before work and inserted/locked at step 9.
  A concurrent uniqueness/serialization loser rolls its whole transaction back;
  the app retries exactly once and obtains replay or conflict.
- Event append locks `rooms.event_high_water`, increments once, and inserts the
  matching sequence before commit.

Advisory keys are fixed:

```text
Room namespace:    (1180126532, hashtext(room_id))
Janitor singleton: (1180126532, 1)
Event compaction:  (1180126532, 2)
```

## 9. Encryption and AAD

Gate B encryption is exactly:

```text
AES-256-GCM
32-byte synthetic key
random 12-byte nonce
16-byte authentication tag
key ID r4.hosted.gate-b.synthetic.v1
```

Canonical AAD is:

```json
{
  "column": "exact SQL column name",
  "objectVersion": 1,
  "roomId": "exact Room ID",
  "rowId": "exact row ID",
  "schemaVersion": "encrypted_field_aad.v1",
  "table": "exact unqualified table name"
}
```

`objectVersion` is the encrypted-field generation, not the lifecycle version.
Immutable Room label, Projection Capsule, Interaction request/capsule, and
Response body use `1`. Notification address, target, and verification code
increment when that same row receives replacement ciphertext. An idempotency
sensitive result uses `1`.

Encrypted columns are exactly:

```text
rooms.label_ciphertext
projections.capsule_ciphertext
interactions.request_ciphertext
interactions.guest_capsule_ciphertext
responses.body_ciphertext
notification_endpoints.address_ciphertext
notification_outbox.target_ciphertext
notification_outbox.verification_code_ciphertext
idempotency_records.sensitive_result_ciphertext
```

The key enters Node through one dedicated inherited file descriptor. It never
appears in argv, environment, source, stdout, evidence, SQL, Docker settings,
or a database row. Plaintext is validated and byte-counted before encryption.

Required crypto tests cover round trip, wrong key, modified nonce/tag/body/key
ID/AAD, truncation, noncanonical encoding, same- and cross-table nonce reuse,
row/column/Room/version swap, terminal unreadability, and absence of plaintext
from database output, disk, JSON, errors, and evidence.

## 10. Roles, grants, and revokes

The disposable bootstrap creates exactly:

```text
forme_r4_migrate
forme_r4_app
forme_r4_janitor
forme_r4_notify
forme_r4_audit
```

Each is `NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
NOREPLICATION NOBYPASSRLS`.

Bootstrap revokes:

```sql
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE forme_r4_gate_b FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA forme_r4 AUTHORIZATION forme_r4_migrate;
REVOKE ALL ON SCHEMA forme_r4 FROM PUBLIC;
GRANT USAGE ON SCHEMA forme_r4
  TO forme_r4_app, forme_r4_janitor, forme_r4_notify, forme_r4_audit;
```

`forme_r4_migrate` receives no database `CREATE`; it owns only `forme_r4` and
objects inside it. Default privileges revoke all table access, function
execution, and type use from `PUBLIC` before positive grants.

| Object | migrate | app | janitor | notify | audit |
|---|---:|---:|---:|---:|---:|
| raw tables/sequences | owner | none | none | none | none |
| required domains/composites | owner | USAGE | required only | required only | USAGE |
| API read functions | owner | EXECUTE | none | none | none |
| API semantic functions | owner | EXECUTE | none | none | none |
| `janitor_*` | owner | none | EXECUTE | none | none |
| `notify_*` | owner | none | none | EXECUTE | none |
| body-free audit views | owner | approved status views | health view | none | SELECT |
| ciphertext notification claim | owner | none | none | EXECUTE | none |
| DDL/role/database settings | schema owner | none | none | none | none |

Audit views are exactly:

```text
audit_schema_migrations
audit_room_lifecycle
audit_projection_lifecycle
audit_curation_events
audit_capability_events
audit_interaction_lifecycle
audit_response_lifecycle
audit_operation_receipts
audit_room_event_high_water
audit_purge_health
audit_operator_incidents
```

They exclude every ciphertext, authority digest, private label, body, address,
verification code, client key, sensitive idempotency result, raw IP/full user
agent, and source path. Migration ends with explicit global revocation followed
by exact positive grants; PostgreSQL defaults are never treated as proof.

## 11. Exact disposable PostgreSQL resources

```text
container: forme-r4-gb-e417836bd67b-pg
volume:    forme-r4-gb-e417836bd67b-pgdata
database:  forme_r4_gate_b
temp root: /private/tmp/forme-r4-gb-e417836bd67b
```

Image identity:

```text
tag: postgres:16.10-bookworm
OCI index: sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74
linux/arm64 manifest: sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf
required postgres --version: postgres (PostgreSQL) 16.10
```

The runner creates the temp root with mode `0700` and installs cleanup before
creating any resource. Exact construction command:

```sh
docker pull --platform linux/arm64 \
  postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74

docker volume create forme-r4-gb-e417836bd67b-pgdata

docker run --detach \
  --name forme-r4-gb-e417836bd67b-pg \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m \
  --tmpfs /var/run/postgresql:rw,noexec,nosuid,nodev,size=16m \
  --mount type=volume,src=forme-r4-gb-e417836bd67b-pgdata,dst=/var/lib/postgresql/data \
  --env POSTGRES_DB=forme_r4_gate_b \
  --env POSTGRES_USER=postgres \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74 \
  -c listen_addresses='' \
  -c logging_collector=off \
  -c log_statement=none \
  -c log_min_error_statement=panic
```

There is no bridge/network resource, host port, `--publish`, host network, or
socket visible outside the container. SQL is injected only through:

```sh
docker exec --interactive forme-r4-gb-e417836bd67b-pg \
  psql -X --set ON_ERROR_STOP=1 --dbname forme_r4_gate_b
```

Pre-SQL checks assert exact image/index/platform/version, `NetworkMode=none`,
empty `NetworkSettings.Ports`, empty `listen_addresses`, and the exact resource
names above.

Cleanup, including signals and failures, is exactly:

```sh
docker rm --force forme-r4-gb-e417836bd67b-pg
docker volume rm --force forme-r4-gb-e417836bd67b-pgdata
rm -rf /private/tmp/forme-r4-gb-e417836bd67b
```

The runner fails unless container/volume/temp-root absence is verified and the
synthetic key descriptor is closed.

## 12. Migration, preflight, verification, and rollback

### 12.1 Bootstrap preflight

`0000_r4_gate_b_bootstrap.sql` aborts unless:

```text
current_database() = forme_r4_gate_b
server_version_num = 160010
database encoding = UTF8
current_user = postgres
forme_r4 schema absent
all five forme_r4_* roles absent
no non-system schema except public
no non-system extension
```

It creates only the five NOLOGIN roles, the `forme_r4` schema, and the exact
revokes/grants above.

### 12.2 Forward migration

`0001_r4_presence.sql`:

1. requires the exact Packet SHA shown at the top of this contract;
2. requires a concrete externally approved Manifest SHA-256 argument and
   validates it as `sha256_digest`; it is not hard-coded because the parent
   Manifest deliberately cannot contain its own hash;
3. `SET ROLE forme_r4_migrate`;
4. begins one transaction;
5. creates every domain, composite, table, constraint, trigger, index,
   function, view, revoke, and grant named here;
6. inserts ledger version `1` with the exact supplied hashes;
7. performs catalog assertions;
8. commits atomically.

Reapply with identical hashes is a body-free no-op. Version `1` with any
different migration/Packet/Manifest hash raises `P4A04` before mutation.

### 12.3 Verification

`0001_r4_presence.verify.sql` proves:

- exact PostgreSQL version, schema, 37-table inventory, domains, composites,
  functions, views, triggers, constraints, indexes, roles, and privileges;
- zero PostgreSQL enum types under `forme_r4`;
- no unexpected extension or object;
- no raw-table access by app/audit/janitor/notify;
- no cross-purpose function execution;
- every FK has its required index;
- every closed set rejects an unknown text value;
- lifecycle, preset/quota, expiry, one-live, one-unresolved, one-offer,
  one-cycle, one-Response, and one-ready-notice constraints;
- Room/Projection/Interaction/Response immutability and terminal precedence;
- global nonce reuse detection across different columns/tables;
- terminal unreadability before physical purge;
- contiguous per-Room events, ACK identity, cursor `410`, and 37-day
  compaction;
- same-key replay and different-hash `409`;
- body-free errors and audit views.

### 12.4 Disposable rollback

`0001_r4_presence.rollback.sql` is not a production down migration. It aborts
unless the database/resource identity, migration/Packet/Manifest hashes, and
synthetic-only markers match, and no role owns an object outside `forme_r4`.
It then drops only `forme_r4 CASCADE` and the five exact roles, leaving the
database and `public` schema intact, and proves their absence.

Compatibility proof is exactly:

```text
empty disposable v0
→ bootstrap
→ atomic v1 apply
→ verify
→ disposable rollback to empty v0
→ bootstrap
→ identical v1 reapply
→ identical catalog/hash verify
```

There is no prior SQL-backed production version, so rolling N/N-1 production
compatibility is not claimed. Production rollback/restore remains Gate C.

## 13. Required test list

`postgres-schema.test.ts` must prove:

1. preflight rejection on wrong database/version/platform/digest, network
   mode, port, existing schema/role, or extension;
2. bootstrap/apply/verify/rollback/absence/reapply/verify;
3. exact catalog and zero-enum inventory;
4. the role/GRANT/REVOKE matrix with `SET ROLE`;
5. direct raw writes fail under every runtime role;
6. Room kind/mode/status and immutable-kind constraints;
7. Projection successor/owner/curation graphs;
8. all four Grant presets, accepted-only quota, `quota+1`, replacement, and no
   quota transfer;
9. concurrent replacement and offer/invite accept/revoke commit orders;
10. one unresolved scope under concurrent submission;
11. public rolling `20/24h`, `10/hour`, `50/day`, and `3/day` limits;
12. Fresh reserve/recover/release/dispatch races;
13. 30-second, next-ordinal, one-use dispatch permits;
14. publish versus close/delete/revoke/retire in both commit orders;
15. one Response, origin disclosure, and terminal precedence;
16. notification enqueue before/after confirmation and one semantic row;
17. claim persist/commit before fake-provider phase;
18. endpoint replace/remove before and after handoff;
19. lease-expiry reconciliation without blind resend;
20. verification three-send/five-attempt/one-use/expiry constraints and
    encrypted code snapshot;
21. late provider result refines only body-free state;
22. event sequence, ACK, `410`, terminal tombstone, and 37-day compaction;
23. hourly janitor duplicate/concurrent/partial-failure behavior;
24. immediate deny plus idempotent physical purge, 24-hour target, and 36-hour
    incident boundary;
25. lost-response recovery for encounter, Interaction, Grant, offer, invite,
    derivative, pairing, Projection, Response, and notification;
26. same-key/different-hash rejection;
27. no external network, provider, email, real data, or production resource.

`encrypted-field.test.ts` must prove all Section 9 cases and scan container
filesystem, database output, `psql` stdout/stderr, Node errors, and evidence for
synthetic canaries representing a private Projection, Private Room label,
Guest request/capsule, Response, address, verification code, pairing recovery
value, and capability/reply/delete secret. Any hit is Red.

Parallel race tests use concurrent `docker exec ... psql` processes and
database barriers/advisory locks. No database library is added.

## 14. Gate C values deliberately absent

This contract does not choose a production KMS/HSM, production key rotation,
login-wrapper roles or secrets, Cloudflare Access identity values, production
PostgreSQL host/network/TLS, backup horizon, restore/deploy/rollback command,
email provider/region/log policy, scheduler, production logs, real actor/Room
IDs, or public activation window. Those cannot responsibly be fixed by a
disposable Gate B schema test and remain Gate C.

Gate B success under this contract would mean only that the exact local,
synthetic PostgreSQL mechanism passed. It would not mean deployed, production
ready, usable by a real Guest, or Owner-accepted as R4 complete.
