\set ON_ERROR_STOP on

-- R4 Gate B Core disposable presence schema. A separately approved runner
-- must bind every lineage hash as a sha256:... psql value.
\if :{?technical_packet_sha}
\else
  \echo R4_GATE_B_CORE_TECHNICAL_PACKET_SHA_REQUIRED
  \quit
\endif
\if :{?scope_brief_sha}
\else
  \echo R4_GATE_B_CORE_SCOPE_BRIEF_SHA_REQUIRED
  \quit
\endif
\if :{?construction_packet_sha}
\else
  \echo R4_GATE_B_CORE_CONSTRUCTION_PACKET_SHA_REQUIRED
  \quit
\endif
\if :{?core_basis_sha}
\else
  \echo R4_GATE_B_CORE_BASIS_SHA_REQUIRED
  \quit
\endif
\if :{?execution_manifest_sha}
\else
  \echo R4_GATE_B_CORE_EXECUTION_MANIFEST_SHA_REQUIRED
  \quit
\endif
\if :{?migration_sha}
\else
  \echo R4_GATE_B_MIGRATION_SHA_REQUIRED
  \quit
\endif

SET forme_r4.technical_packet_sha TO :'technical_packet_sha';
SET forme_r4.scope_brief_sha TO :'scope_brief_sha';
SET forme_r4.construction_packet_sha TO :'construction_packet_sha';
SET forme_r4.core_basis_sha TO :'core_basis_sha';
SET forme_r4.execution_manifest_sha TO :'execution_manifest_sha';
SET forme_r4.migration_sha TO :'migration_sha';

DO $forme_r4_preflight$
BEGIN
  IF current_database() <> 'forme_r4_gate_b'
     OR current_setting('server_version_num')::integer <> 160010
     OR current_user <> 'postgres'
     OR to_regnamespace('forme_r4') IS NULL
     OR current_setting('forme_r4.technical_packet_sha') <> 'sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5'
     OR current_setting('forme_r4.scope_brief_sha') <> 'sha256:c20e987cfb7ff7cc2b73c1d13584a8d7955bd5c3407369bed3a98ce37700f86f'
     OR current_setting('forme_r4.construction_packet_sha') <> 'sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06'
     OR current_setting('forme_r4.core_basis_sha') <> 'sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35'
     OR current_setting('forme_r4.execution_manifest_sha') !~ '^sha256:[0-9a-f]{64}$'
     OR current_setting('forme_r4.migration_sha') !~ '^sha256:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;
END
$forme_r4_preflight$;

SELECT CASE WHEN to_regclass('forme_r4.schema_migrations') IS NULL
  THEN 'true' ELSE 'false' END AS forme_r4_apply_required \gset

\if :forme_r4_apply_required
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL ROLE forme_r4_migrate;
SET LOCAL search_path = pg_catalog, forme_r4;

CREATE FUNCTION forme_r4.is_encrypted_field_v1(value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
  SELECT jsonb_typeof(value) = 'object'
    AND (SELECT count(*) FROM jsonb_object_keys(value)) = 7
    AND value ?& ARRAY['schemaVersion','algorithm','keyId','nonce','ciphertext','tag','aadHash']
    AND value->>'schemaVersion' = 'a256gcm.v1'
    AND value->>'algorithm' = 'AES-256-GCM'
    AND value->>'keyId' = 'r4.hosted.gate-b.synthetic.v1'
    AND value->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
    AND value->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
    AND value->>'tag' ~ '^[A-Za-z0-9_-]{22}$'
    AND value->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
$function$;

CREATE DOMAIN forme_r4.r4_id AS text
  CONSTRAINT ck_r4_id CHECK (
    VALUE = normalize(VALUE, NFC)
    AND octet_length(VALUE) BETWEEN 18 AND 160
    AND VALUE ~ '^[a-z][a-z0-9_]*_[A-Za-z0-9_-]{16,128}$'
  );
CREATE DOMAIN forme_r4.sha256_digest AS text
  CONSTRAINT ck_sha256_digest CHECK (VALUE ~ '^sha256:[0-9a-f]{64}$');
CREATE DOMAIN forme_r4.idempotency_key AS text
  CONSTRAINT ck_idempotency_key CHECK (
    VALUE = normalize(VALUE, NFC) AND octet_length(VALUE) <= 256
    AND (VALUE ~ '^[A-Fa-f0-9]{32,}$' OR VALUE ~ '^[A-Za-z0-9_-]{22,}$')
  );
CREATE DOMAIN forme_r4.canonical_text AS text
  CONSTRAINT ck_canonical_text CHECK (VALUE = normalize(VALUE, NFC));
CREATE DOMAIN forme_r4.encrypted_field_v1 AS jsonb
  CONSTRAINT ck_encrypted_field_v1 CHECK (forme_r4.is_encrypted_field_v1(VALUE));

CREATE DOMAIN forme_r4.actor_subject_state_d AS text CHECK (VALUE IN ('active','revoked'));
CREATE DOMAIN forme_r4.actor_role_kind_d AS text CHECK (VALUE IN ('controller','curator'));
CREATE DOMAIN forme_r4.entity_state_d AS text CHECK (VALUE IN ('active','retired'));
CREATE DOMAIN forme_r4.third_place_state_d AS text CHECK (VALUE IN ('active','closed'));
CREATE DOMAIN forme_r4.third_place_event_kind_d AS text CHECK (VALUE IN ('created','closed'));
CREATE DOMAIN forme_r4.room_kind_d AS text CHECK (VALUE IN ('third_place_public','private_grant_only'));
CREATE DOMAIN forme_r4.interaction_mode_d AS text CHECK (VALUE IN ('public_single','invite_only','closed'));
CREATE DOMAIN forme_r4.room_status_d AS text CHECK (VALUE IN ('active','retired'));
CREATE DOMAIN forme_r4.room_lifecycle_event_kind_d AS text CHECK (VALUE IN ('created','mode_set','retired','deleted'));
CREATE DOMAIN forme_r4.projection_owner_state_d AS text CHECK (VALUE IN ('published_fresh','stale','superseded','revoked','expired'));
CREATE DOMAIN forme_r4.curation_state_d AS text CHECK (VALUE IN ('not_admitted','admitted','unlisted'));
CREATE DOMAIN forme_r4.curation_event_kind_d AS text CHECK (VALUE IN ('admitted','unlisted'));
CREATE DOMAIN forme_r4.capability_state_d AS text CHECK (VALUE IN ('issued','consumed','revoked','replaced','expired','invalidated'));
CREATE DOMAIN forme_r4.grant_preset_id_d AS text CHECK (VALUE IN ('one_visit','short_exchange','familiar_collaborator','trusted_collaborator'));
CREATE DOMAIN forme_r4.grant_offer_state_d AS text CHECK (VALUE IN ('issued','accepted','owner_revoked','expired','invalidated'));
CREATE DOMAIN forme_r4.direct_invite_state_d AS text CHECK (VALUE IN ('issued','redeemed','owner_revoked','expired','invalidated'));
CREATE DOMAIN forme_r4.capability_class_d AS text CHECK (VALUE IN ('public_encounter','grant','agent_derivative'));
CREATE DOMAIN forme_r4.binding_state_d AS text CHECK (VALUE IN ('active','revoked','expired'));
CREATE DOMAIN forme_r4.pairing_state_d AS text CHECK (VALUE IN ('issued','exchanged','expired'));
CREATE DOMAIN forme_r4.interaction_type_d AS text CHECK (VALUE IN ('ask','seed','resonance'));
CREATE DOMAIN forme_r4.guest_capsule_level_d AS text CHECK (VALUE IN ('g0_manual','g1_lightweight','g2_agent_projection'));
CREATE DOMAIN forme_r4.interaction_consent_d AS text CHECK (VALUE IN ('allow_owner_local_ai','manual_owner_only'));
CREATE DOMAIN forme_r4.interaction_state_d AS text CHECK (VALUE IN ('accepted','seen_locally','preparing','response_ready','closed_without_response','interaction_expired','interaction_deleted','origin_revoked','room_retired'));
CREATE DOMAIN forme_r4.fresh_cycle_state_d AS text CHECK (VALUE IN ('reserved','dispatch_committed','released_zero_dispatch'));
CREATE DOMAIN forme_r4.response_state_d AS text CHECK (VALUE IN ('available','response_expired','response_revoked','origin_revoked','interaction_deleted','room_retired'));
CREATE DOMAIN forme_r4.response_source_disclosure_d AS text CHECK (VALUE IN ('fresh_native_sanitized_snapshot_owner_reviewed','manual_owner_authored'));
CREATE DOMAIN forme_r4.notification_endpoint_state_d AS text CHECK (VALUE IN ('absent','verification_pending','confirmed','cleared'));
CREATE DOMAIN forme_r4.notification_challenge_state_d AS text CHECK (VALUE IN ('pending','used','expired','exhausted','replaced','canceled'));
CREATE DOMAIN forme_r4.notification_semantic_kind_d AS text CHECK (VALUE IN ('response_ready','verification_code'));
CREATE DOMAIN forme_r4.notification_notice_state_d AS text CHECK (VALUE IN ('ready_pending','submitting','canceled','provider_accepted','delivery_unknown','failed'));
CREATE DOMAIN forme_r4.notification_attempt_state_d AS text CHECK (VALUE IN ('submitting','provider_accepted','proved_not_accepted','delivery_unknown','failed'));
CREATE DOMAIN forme_r4.room_event_object_type_d AS text CHECK (VALUE IN ('room','projection','interaction','response','grant','notification','purge'));
CREATE DOMAIN forme_r4.operation_status_d AS text CHECK (VALUE IN ('committed','no_op','rejected','terminal'));
CREATE DOMAIN forme_r4.idempotency_recovery_kind_d AS text CHECK (VALUE IN ('body_free','encrypted_transient','room_operator_pull','notification_current','publication_current'));
CREATE DOMAIN forme_r4.retention_target_kind_d AS text CHECK (VALUE IN ('room_label','projection_capsule','interaction_request','guest_capsule','response_body','notification_endpoint','notification_delivery_target','verification_challenge','verification_code','pairing_exchange_envelope','idempotency_sensitive_result'));
CREATE DOMAIN forme_r4.retention_job_state_d AS text CHECK (VALUE IN ('pending','claimed','completed','failed'));
CREATE DOMAIN forme_r4.purge_outcome_d AS text CHECK (VALUE IN ('purged','already_absent','failed'));
CREATE DOMAIN forme_r4.operator_incident_code_d AS text CHECK (VALUE IN ('purge_target_missed','last_successful_purge_stale'));
CREATE DOMAIN forme_r4.api_actor_class_d AS text CHECK (VALUE IN ('public','manual_guest','guest_agent','controller','curator','room_operator_v1','janitor','notifier'));

CREATE TYPE forme_r4.mutation_context_v1 AS (
  actor_class forme_r4.api_actor_class_d,
  actor_subject_id forme_r4.r4_id,
  actor_scope_digest forme_r4.sha256_digest,
  idempotency_key forme_r4.idempotency_key,
  canonical_request_hash forme_r4.sha256_digest,
  expected_object_version bigint,
  correlation_id uuid
);
CREATE TYPE forme_r4.api_result_v1 AS (
  http_status smallint, code text, target_id forme_r4.r4_id,
  target_version bigint, receipt_id forme_r4.r4_id, result jsonb
);
CREATE TYPE forme_r4.notification_claim_v1 AS (
  outcome text, outbox_id forme_r4.r4_id, attempt_id forme_r4.r4_id,
  semantic_kind forme_r4.notification_semantic_kind_d,
  provider_idempotency_key text,
  encrypted_delivery_target forme_r4.encrypted_field_v1,
  encrypted_verification_code forme_r4.encrypted_field_v1,
  lease_expires_at timestamptz(3), reconciliation_deadline timestamptz(3)
);

CREATE TABLE forme_r4.schema_migrations (
  version integer CONSTRAINT pk_schema_migrations PRIMARY KEY,
  migration_name forme_r4.canonical_text NOT NULL CONSTRAINT uq_schema_migrations__name UNIQUE,
  migration_sha256 forme_r4.sha256_digest NOT NULL CONSTRAINT uq_schema_migrations__sha UNIQUE,
  technical_packet_sha256 forme_r4.sha256_digest NOT NULL,
  scope_brief_sha256 forme_r4.sha256_digest NOT NULL,
  construction_packet_sha256 forme_r4.sha256_digest NOT NULL,
  core_basis_sha256 forme_r4.sha256_digest NOT NULL,
  execution_manifest_sha256 forme_r4.sha256_digest NOT NULL,
  applied_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  applied_by name NOT NULL,
  postgres_version_num integer NOT NULL,
  rollback_compatible boolean NOT NULL DEFAULT false
);

CREATE TABLE forme_r4.actor_subjects (
  subject_id forme_r4.r4_id CONSTRAINT pk_actor_subjects PRIMARY KEY,
  schema_version text NOT NULL CONSTRAINT ck_actor_subjects__schema CHECK (schema_version='actor_subject.v1'),
  issuer_hash forme_r4.sha256_digest NOT NULL,
  provider_subject_hash forme_r4.sha256_digest NOT NULL,
  state forme_r4.actor_subject_state_d NOT NULL DEFAULT 'active',
  version bigint NOT NULL DEFAULT 1 CONSTRAINT ck_actor_subjects__version CHECK (version>=1),
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  revoked_at timestamptz(3) NULL,
  CONSTRAINT uq_actor_subjects__issuer_subject UNIQUE (issuer_hash,provider_subject_hash),
  CONSTRAINT ck_actor_subjects__state CHECK ((state='active')=(revoked_at IS NULL))
);
CREATE TABLE forme_r4.actor_roles (
  role_assignment_id forme_r4.r4_id CONSTRAINT pk_actor_roles PRIMARY KEY,
  subject_id forme_r4.r4_id NOT NULL CONSTRAINT fk_actor_roles__subject REFERENCES forme_r4.actor_subjects,
  role forme_r4.actor_role_kind_d NOT NULL,
  granted_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  granted_by_subject_id forme_r4.r4_id NULL CONSTRAINT fk_actor_roles__granted_by REFERENCES forme_r4.actor_subjects,
  revoked_at timestamptz(3) NULL,
  version bigint NOT NULL DEFAULT 1 CONSTRAINT ck_actor_roles__version CHECK (version>=1)
);
CREATE UNIQUE INDEX uq_actor_roles__active ON forme_r4.actor_roles(subject_id,role) WHERE revoked_at IS NULL;
CREATE INDEX ix_actor_roles__active ON forme_r4.actor_roles(subject_id,role) WHERE revoked_at IS NULL;

CREATE TABLE forme_r4.third_places (
  third_place_id forme_r4.r4_id CONSTRAINT pk_third_places PRIMARY KEY,
  schema_version text NOT NULL CONSTRAINT ck_third_places__schema CHECK (schema_version='third_place.v1'),
  slug forme_r4.canonical_text NOT NULL CONSTRAINT uq_third_places__slug UNIQUE
    CONSTRAINT ck_third_places__slug CHECK (octet_length(slug) BETWEEN 1 AND 80),
  public_label forme_r4.canonical_text NOT NULL CONSTRAINT ck_third_places__label CHECK (octet_length(public_label) BETWEEN 1 AND 256),
  state forme_r4.third_place_state_d NOT NULL DEFAULT 'active',
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  closed_at timestamptz(3) NULL,
  CONSTRAINT ck_third_places__state CHECK ((state='active')=(closed_at IS NULL))
);
CREATE TABLE forme_r4.third_place_events (
  event_id forme_r4.r4_id CONSTRAINT pk_third_place_events PRIMARY KEY,
  third_place_id forme_r4.r4_id NOT NULL CONSTRAINT fk_third_place_events__place REFERENCES forme_r4.third_places,
  event_kind forme_r4.third_place_event_kind_d NOT NULL,
  prior_state forme_r4.third_place_state_d NULL,
  new_state forme_r4.third_place_state_d NOT NULL,
  actor_subject_id forme_r4.r4_id NOT NULL CONSTRAINT fk_third_place_events__actor REFERENCES forme_r4.actor_subjects,
  object_version bigint NOT NULL CHECK (object_version>=1),
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp()
);
CREATE TABLE forme_r4.entities (
  entity_id forme_r4.r4_id CONSTRAINT pk_entities PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='hosted_entity.v1'),
  controller_subject_id forme_r4.r4_id NOT NULL CONSTRAINT fk_entities__controller REFERENCES forme_r4.actor_subjects,
  public_display_label forme_r4.canonical_text NOT NULL CHECK (octet_length(public_display_label) BETWEEN 1 AND 256),
  state forme_r4.entity_state_d NOT NULL DEFAULT 'active',
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  retired_at timestamptz(3) NULL,
  CONSTRAINT ck_entities__state CHECK ((state='active')=(retired_at IS NULL))
);
CREATE TABLE forme_r4.rooms (
  room_id forme_r4.r4_id CONSTRAINT pk_rooms PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='room.v1'),
  entity_id forme_r4.r4_id NOT NULL CONSTRAINT fk_rooms__entity REFERENCES forme_r4.entities,
  home_third_place_id forme_r4.r4_id NULL CONSTRAINT fk_rooms__third_place REFERENCES forme_r4.third_places,
  label_ciphertext forme_r4.encrypted_field_v1 NOT NULL,
  label_object_version integer NOT NULL DEFAULT 1 CHECK (label_object_version>=1),
  room_kind forme_r4.room_kind_d NOT NULL,
  interaction_mode forme_r4.interaction_mode_d NOT NULL,
  status forme_r4.room_status_d NOT NULL DEFAULT 'active',
  current_projection_id forme_r4.r4_id NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  event_high_water bigint NOT NULL DEFAULT 0 CHECK (event_high_water>=0),
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  retired_at timestamptz(3) NULL,
  deleted_at timestamptz(3) NULL,
  CONSTRAINT ck_rooms__private_place CHECK (room_kind<>'private_grant_only' OR home_third_place_id IS NULL),
  CONSTRAINT ck_rooms__private_mode CHECK (room_kind<>'private_grant_only' OR interaction_mode IN ('invite_only','closed')),
  CONSTRAINT ck_rooms__status CHECK ((status='active')=(retired_at IS NULL)),
  CONSTRAINT ck_rooms__delete_after_retire CHECK (deleted_at IS NULL OR retired_at IS NOT NULL)
);
CREATE TABLE forme_r4.room_lifecycle_events (
  event_id forme_r4.r4_id CONSTRAINT pk_room_lifecycle_events PRIMARY KEY,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_room_lifecycle_events__room REFERENCES forme_r4.rooms,
  event_kind forme_r4.room_lifecycle_event_kind_d NOT NULL,
  prior_interaction_mode forme_r4.interaction_mode_d NULL,
  new_interaction_mode forme_r4.interaction_mode_d NOT NULL,
  prior_status forme_r4.room_status_d NULL,
  new_status forme_r4.room_status_d NOT NULL,
  prior_deleted boolean NULL,
  new_deleted boolean NOT NULL,
  actor_subject_id forme_r4.r4_id NOT NULL CONSTRAINT fk_room_lifecycle_events__actor REFERENCES forme_r4.actor_subjects,
  object_version bigint NOT NULL CHECK (object_version>=1),
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT uq_room_lifecycle_events__version UNIQUE(room_id,object_version)
);
CREATE TABLE forme_r4.encryption_nonces (
  key_id forme_r4.canonical_text NOT NULL,
  nonce bytea NOT NULL CHECK (octet_length(nonce)=12),
  table_name name NOT NULL,
  row_id forme_r4.r4_id NOT NULL,
  column_name name NOT NULL,
  field_version integer NOT NULL CHECK (field_version>=1),
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT pk_encryption_nonces PRIMARY KEY(key_id,nonce),
  CONSTRAINT uq_encryption_nonces__field UNIQUE(table_name,row_id,column_name,field_version)
);

CREATE INDEX ix_rooms__entity ON forme_r4.rooms(entity_id);
CREATE INDEX ix_rooms__third_place ON forme_r4.rooms(home_third_place_id) WHERE home_third_place_id IS NOT NULL;
CREATE INDEX ix_rooms__active_kind ON forme_r4.rooms(room_kind,room_id) WHERE status='active';
CREATE INDEX ix_room_lifecycle_events__room_time ON forme_r4.room_lifecycle_events(room_id,committed_at,event_id);

CREATE TABLE forme_r4.projections (
  projection_id forme_r4.r4_id CONSTRAINT pk_projections PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='projection_capsule.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_projections__room REFERENCES forme_r4.rooms,
  entity_id forme_r4.r4_id NOT NULL CONSTRAINT fk_projections__entity REFERENCES forme_r4.entities,
  capsule_ciphertext forme_r4.encrypted_field_v1 NULL,
  capsule_object_version integer NOT NULL DEFAULT 1 CHECK (capsule_object_version>=1),
  capsule_plaintext_bytes integer NOT NULL CHECK (capsule_plaintext_bytes BETWEEN 1 AND 32768),
  title_scalar_count integer NOT NULL CHECK (title_scalar_count BETWEEN 1 AND 120),
  summary_plaintext_bytes integer NOT NULL CHECK (summary_plaintext_bytes BETWEEN 0 AND 512),
  disclosure_basis_id forme_r4.r4_id NOT NULL,
  publication_attestation_id forme_r4.r4_id NOT NULL CONSTRAINT uq_projections__attestation UNIQUE,
  payload_hash forme_r4.sha256_digest NOT NULL,
  owner_state forme_r4.projection_owner_state_d NOT NULL DEFAULT 'published_fresh',
  curation_state forme_r4.curation_state_d NOT NULL DEFAULT 'not_admitted',
  current boolean NOT NULL DEFAULT true,
  lifecycle_version bigint NOT NULL DEFAULT 1 CHECK (lifecycle_version>=1),
  published_at timestamptz(3) NOT NULL,
  fresh_until timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  changed_at timestamptz(3) NOT NULL,
  body_readable boolean NOT NULL DEFAULT true,
  purged_at timestamptz(3) NULL,
  CONSTRAINT uq_projections__id_room UNIQUE(projection_id,room_id),
  CONSTRAINT ck_projections__chronology CHECK (published_at<=fresh_until AND fresh_until<=expires_at AND expires_at<=published_at+interval '7 days'),
  CONSTRAINT ck_projections__readable CHECK (NOT body_readable OR capsule_ciphertext IS NOT NULL),
  CONSTRAINT ck_projections__purged CHECK (purged_at IS NULL OR capsule_ciphertext IS NULL)
);
CREATE UNIQUE INDEX uq_projections__room_current ON forme_r4.projections(room_id) WHERE current;
ALTER TABLE forme_r4.rooms ADD CONSTRAINT fk_rooms__current_projection
  FOREIGN KEY(current_projection_id,room_id)
  REFERENCES forme_r4.projections(projection_id,room_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE forme_r4.projection_lifecycle_events (
  event_id forme_r4.r4_id CONSTRAINT pk_projection_lifecycle_events PRIMARY KEY,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_projection_events__projection REFERENCES forme_r4.projections,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_projection_events__room REFERENCES forme_r4.rooms,
  prior_owner_state forme_r4.projection_owner_state_d NULL,
  new_owner_state forme_r4.projection_owner_state_d NOT NULL,
  prior_current boolean NULL,
  new_current boolean NOT NULL,
  object_version bigint NOT NULL CHECK (object_version>=1),
  actor_class forme_r4.api_actor_class_d NOT NULL,
  actor_subject_id forme_r4.r4_id NULL CONSTRAINT fk_projection_events__actor REFERENCES forme_r4.actor_subjects,
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL
);
CREATE TABLE forme_r4.curation_events (
  event_id forme_r4.r4_id CONSTRAINT pk_curation_events PRIMARY KEY,
  third_place_id forme_r4.r4_id NOT NULL CONSTRAINT fk_curation_events__place REFERENCES forme_r4.third_places,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_curation_events__projection REFERENCES forme_r4.projections,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_curation_events__room REFERENCES forme_r4.rooms,
  event_kind forme_r4.curation_event_kind_d NOT NULL,
  prior_state forme_r4.curation_state_d NOT NULL,
  new_state forme_r4.curation_state_d NOT NULL,
  curator_subject_id forme_r4.r4_id NOT NULL CONSTRAINT fk_curation_events__curator REFERENCES forme_r4.actor_subjects,
  object_version bigint NOT NULL CHECK (object_version>=1),
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_curation_events__transition UNIQUE(third_place_id,projection_id,event_kind),
  CONSTRAINT ck_curation_events__graph CHECK (
    (event_kind='admitted' AND prior_state='not_admitted' AND new_state='admitted') OR
    (event_kind='unlisted' AND prior_state='admitted' AND new_state='unlisted')
  )
);
CREATE INDEX ix_projections__room_owner_time ON forme_r4.projections(room_id,owner_state,expires_at);
CREATE INDEX ix_projections__discovery ON forme_r4.projections(room_id,curation_state,fresh_until,expires_at)
  WHERE current AND owner_state='published_fresh';
CREATE INDEX ix_projection_events__version ON forme_r4.projection_lifecycle_events(projection_id,object_version);
CREATE INDEX ix_curation_events__place_time ON forme_r4.curation_events(third_place_id,committed_at,projection_id);

CREATE TABLE forme_r4.room_bindings (
  binding_id forme_r4.r4_id CONSTRAINT pk_room_bindings PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='room_operator_binding.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_room_bindings__room REFERENCES forme_r4.rooms,
  pairing_id forme_r4.r4_id NOT NULL CONSTRAINT uq_room_bindings__pairing UNIQUE,
  scope_version text NOT NULL CHECK (scope_version='room_operator.v1'),
  secret_digest forme_r4.sha256_digest NOT NULL CONSTRAINT uq_room_bindings__secret UNIQUE,
  client_public_key_hash forme_r4.sha256_digest NOT NULL,
  state forme_r4.binding_state_d NOT NULL DEFAULT 'active',
  paired_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  revoked_at timestamptz(3) NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  CONSTRAINT ck_room_bindings__expiry CHECK (paired_at<expires_at AND expires_at<=paired_at+interval '30 days'),
  CONSTRAINT ck_room_bindings__state CHECK ((state='active')=(revoked_at IS NULL))
);
CREATE TABLE forme_r4.pairing_challenges (
  pairing_id forme_r4.r4_id CONSTRAINT pk_pairing_challenges PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='pairing_challenge.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_pairing_challenges__room REFERENCES forme_r4.rooms,
  pairing_code_digest forme_r4.sha256_digest NOT NULL CONSTRAINT uq_pairing_challenges__code UNIQUE,
  state forme_r4.pairing_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  client_public_key_hash forme_r4.sha256_digest NULL,
  binding_id forme_r4.r4_id NULL CONSTRAINT fk_pairing_challenges__binding REFERENCES forme_r4.room_bindings,
  sealed_exchange_envelope bytea NULL,
  sealed_exchange_hash forme_r4.sha256_digest NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  CONSTRAINT ck_pairing_challenges__expiry CHECK (issued_at<expires_at),
  CONSTRAINT ck_pairing_challenges__shape CHECK (
    (state='issued' AND client_public_key_hash IS NULL AND binding_id IS NULL AND sealed_exchange_envelope IS NULL AND sealed_exchange_hash IS NULL)
    OR (state='exchanged' AND client_public_key_hash IS NOT NULL AND binding_id IS NOT NULL AND sealed_exchange_envelope IS NOT NULL AND sealed_exchange_hash IS NOT NULL)
    OR (state='expired' AND sealed_exchange_envelope IS NULL)
  )
);
CREATE INDEX ix_room_bindings__active ON forme_r4.room_bindings(room_id,expires_at) WHERE state='active';
CREATE INDEX ix_pairing_challenges__expiry ON forme_r4.pairing_challenges(room_id,expires_at) WHERE state='issued';

CREATE TABLE forme_r4.public_encounters (
  encounter_id forme_r4.r4_id CONSTRAINT pk_public_encounters PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='public_encounter.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_public_encounters__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_public_encounters__projection REFERENCES forme_r4.projections,
  secret_digest forme_r4.sha256_digest NOT NULL,
  state forme_r4.capability_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  accepted_count smallint NOT NULL DEFAULT 0 CHECK (accepted_count BETWEEN 0 AND 1),
  unresolved_interaction_id forme_r4.r4_id NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_public_encounters__expiry CHECK (expires_at<=issued_at+interval '24 hours')
);
CREATE TABLE forme_r4.grants (
  grant_id forme_r4.r4_id CONSTRAINT pk_grants PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='grant.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_grants__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_grants__projection REFERENCES forme_r4.projections,
  reentry_chain_id forme_r4.r4_id NOT NULL,
  preset_id forme_r4.grant_preset_id_d NOT NULL,
  secret_digest forme_r4.sha256_digest NOT NULL,
  state forme_r4.capability_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  accepted_count smallint NOT NULL DEFAULT 0 CHECK (accepted_count>=0),
  accepted_quota smallint NOT NULL,
  unresolved_interaction_id forme_r4.r4_id NULL,
  agent_derivation_allowed boolean NOT NULL,
  replaced_grant_id forme_r4.r4_id NULL CONSTRAINT fk_grants__replaced REFERENCES forme_r4.grants,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_grants__quota_count CHECK (accepted_count<=accepted_quota),
  CONSTRAINT ck_grants__preset_quota CHECK (
    (preset_id='one_visit' AND accepted_quota=1) OR
    (preset_id='short_exchange' AND accepted_quota=2) OR
    (preset_id='familiar_collaborator' AND accepted_quota=3) OR
    (preset_id='trusted_collaborator' AND accepted_quota=10)
  )
);
CREATE TABLE forme_r4.direct_grant_invites (
  invite_id forme_r4.r4_id CONSTRAINT pk_direct_grant_invites PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='direct_grant_invite.v1'),
  target_room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_direct_invites__room REFERENCES forme_r4.rooms,
  target_projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_direct_invites__projection REFERENCES forme_r4.projections,
  preset_id forme_r4.grant_preset_id_d NOT NULL,
  secret_digest forme_r4.sha256_digest NOT NULL CONSTRAINT uq_direct_invites__secret UNIQUE,
  state forme_r4.direct_invite_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  redemption_expires_at timestamptz(3) NOT NULL,
  offered_grant_expires_at timestamptz(3) NOT NULL,
  redeemed_grant_id forme_r4.r4_id NULL CONSTRAINT fk_direct_invites__grant REFERENCES forme_r4.grants,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_direct_invites__expiry CHECK (redemption_expires_at<=offered_grant_expires_at)
);
CREATE TABLE forme_r4.agent_derivatives (
  derivative_id forme_r4.r4_id CONSTRAINT pk_agent_derivatives PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='agent_derivative.v1'),
  parent_capability_class forme_r4.capability_class_d NOT NULL,
  parent_capability_id forme_r4.r4_id NOT NULL,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_agent_derivatives__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_agent_derivatives__projection REFERENCES forme_r4.projections,
  secret_digest forme_r4.sha256_digest NOT NULL,
  bound_reply_capability_digest forme_r4.sha256_digest NOT NULL,
  bound_delete_capability_digest forme_r4.sha256_digest NOT NULL,
  state forme_r4.capability_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  accepted_count smallint NOT NULL DEFAULT 0 CHECK (accepted_count BETWEEN 0 AND 1),
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_agent_derivatives__parent CHECK (parent_capability_class IN ('public_encounter','grant')),
  CONSTRAINT ck_agent_derivatives__expiry CHECK (expires_at<=issued_at+interval '15 minutes'),
  CONSTRAINT ck_agent_derivatives__digests CHECK (
    secret_digest<>bound_reply_capability_digest AND secret_digest<>bound_delete_capability_digest
    AND bound_reply_capability_digest<>bound_delete_capability_digest)
);
CREATE TABLE forme_r4.capability_events (
  event_id forme_r4.r4_id CONSTRAINT pk_capability_events PRIMARY KEY,
  capability_class forme_r4.capability_class_d NOT NULL,
  capability_id forme_r4.r4_id NOT NULL,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_capability_events__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_capability_events__projection REFERENCES forme_r4.projections,
  prior_state forme_r4.capability_state_d NULL,
  new_state forme_r4.capability_state_d NOT NULL,
  object_version bigint NOT NULL CHECK (object_version>=1),
  issuance_secret_digest forme_r4.sha256_digest NULL,
  actor_class forme_r4.api_actor_class_d NOT NULL,
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_capability_events__version UNIQUE(capability_class,capability_id,object_version)
);
CREATE UNIQUE INDEX uq_capability_events__issuance_secret ON forme_r4.capability_events(issuance_secret_digest) WHERE issuance_secret_digest IS NOT NULL;
CREATE UNIQUE INDEX uq_grants__live_chain ON forme_r4.grants(room_id,projection_id,reentry_chain_id) WHERE state IN ('issued','consumed');
CREATE INDEX ix_public_encounters__scope_state ON forme_r4.public_encounters(room_id,projection_id,state,expires_at);
CREATE INDEX ix_grants__scope_state ON forme_r4.grants(room_id,projection_id,state,expires_at);
CREATE INDEX ix_grants__chain ON forme_r4.grants(room_id,projection_id,reentry_chain_id,issued_at);
CREATE INDEX ix_direct_invites__target ON forme_r4.direct_grant_invites(target_room_id,target_projection_id,state,redemption_expires_at);
CREATE INDEX ix_agent_derivatives__parent ON forme_r4.agent_derivatives(parent_capability_class,parent_capability_id,state,expires_at);
CREATE INDEX ix_capability_events__version ON forme_r4.capability_events(capability_class,capability_id,object_version);

CREATE TABLE forme_r4.interactions (
  interaction_id forme_r4.r4_id CONSTRAINT pk_interactions PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='interaction.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_interactions__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_interactions__projection REFERENCES forme_r4.projections,
  origin_projection_hash forme_r4.sha256_digest NOT NULL,
  origin_state_at_acceptance forme_r4.projection_owner_state_d NOT NULL,
  origin_capability_class forme_r4.capability_class_d NOT NULL,
  origin_capability_id forme_r4.r4_id NOT NULL,
  submission_derivative_id forme_r4.r4_id NULL CONSTRAINT fk_interactions__derivative REFERENCES forme_r4.agent_derivatives,
  unresolved_scope_id forme_r4.r4_id NOT NULL,
  interaction_type forme_r4.interaction_type_d NOT NULL,
  request_ciphertext forme_r4.encrypted_field_v1 NULL,
  request_object_version integer NOT NULL DEFAULT 1 CHECK (request_object_version>=1),
  request_plaintext_bytes integer NOT NULL CHECK (request_plaintext_bytes BETWEEN 1 AND 12288),
  request_content_hash forme_r4.sha256_digest NOT NULL,
  guest_capsule_ciphertext forme_r4.encrypted_field_v1 NULL,
  guest_capsule_object_version integer NULL CHECK (guest_capsule_object_version>=1),
  guest_capsule_plaintext_bytes integer NULL CHECK (guest_capsule_plaintext_bytes BETWEEN 0 AND 4096),
  guest_capsule_hash forme_r4.sha256_digest NULL,
  guest_capsule_level forme_r4.guest_capsule_level_d NOT NULL,
  consent forme_r4.interaction_consent_d NOT NULL,
  consent_envelope jsonb NULL,
  consent_envelope_hash forme_r4.sha256_digest NULL,
  accepted_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  reply_capability_id forme_r4.r4_id NOT NULL,
  reply_capability_digest forme_r4.sha256_digest NOT NULL CONSTRAINT uq_interactions__reply UNIQUE,
  delete_capability_digest forme_r4.sha256_digest NOT NULL CONSTRAINT uq_interactions__delete UNIQUE,
  state forme_r4.interaction_state_d NOT NULL DEFAULT 'accepted',
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version>=1),
  body_readable boolean NOT NULL DEFAULT true,
  terminal_at timestamptz(3) NULL,
  purged_at timestamptz(3) NULL,
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT uq_interactions__id_room UNIQUE(interaction_id,room_id),
  CONSTRAINT ck_interactions__expiry CHECK (expires_at<=accepted_at+interval '30 days'),
  CONSTRAINT ck_interactions__recovery_distinct CHECK (reply_capability_digest<>delete_capability_digest),
  CONSTRAINT ck_interactions__consent CHECK (
    (consent='manual_owner_only' AND consent_envelope IS NULL AND consent_envelope_hash IS NULL)
    OR (consent='allow_owner_local_ai' AND consent_envelope IS NOT NULL AND consent_envelope_hash IS NOT NULL)
  ),
  CONSTRAINT ck_interactions__capsule_shape CHECK (
    (guest_capsule_ciphertext IS NULL)=(guest_capsule_plaintext_bytes IS NULL)
    AND (guest_capsule_ciphertext IS NULL)=(guest_capsule_hash IS NULL)
    AND (guest_capsule_ciphertext IS NULL)=(guest_capsule_object_version IS NULL)
  ),
  CONSTRAINT ck_interactions__readable CHECK (NOT body_readable OR request_ciphertext IS NOT NULL),
  CONSTRAINT ck_interactions__purged CHECK (purged_at IS NULL OR (request_ciphertext IS NULL AND guest_capsule_ciphertext IS NULL))
);
CREATE UNIQUE INDEX uq_interactions__unresolved_scope ON forme_r4.interactions(unresolved_scope_id)
  WHERE state IN ('accepted','seen_locally','preparing');

CREATE TABLE forme_r4.grant_offers (
  offer_id forme_r4.r4_id CONSTRAINT pk_grant_offers PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='grant_offer.v1'),
  source_interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_grant_offers__interaction REFERENCES forme_r4.interactions DEFERRABLE,
  target_room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_grant_offers__room REFERENCES forme_r4.rooms,
  target_projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_grant_offers__projection REFERENCES forme_r4.projections,
  preset_id forme_r4.grant_preset_id_d NOT NULL,
  state forme_r4.grant_offer_state_d NOT NULL DEFAULT 'issued',
  issued_at timestamptz(3) NOT NULL,
  acceptance_expires_at timestamptz(3) NOT NULL,
  offered_grant_expires_at timestamptz(3) NOT NULL,
  accepted_grant_id forme_r4.r4_id NULL CONSTRAINT fk_grant_offers__grant REFERENCES forme_r4.grants,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_grant_offers__expiry CHECK (acceptance_expires_at<=offered_grant_expires_at)
);
CREATE UNIQUE INDEX uq_grant_offers__live_source ON forme_r4.grant_offers(source_interaction_id) WHERE state='issued';
CREATE INDEX ix_grant_offers__target ON forme_r4.grant_offers(target_room_id,target_projection_id,state,acceptance_expires_at);

CREATE TABLE forme_r4.interaction_lifecycle_events (
  event_id forme_r4.r4_id CONSTRAINT pk_interaction_lifecycle_events PRIMARY KEY,
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_interaction_events__interaction REFERENCES forme_r4.interactions,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_interaction_events__room REFERENCES forme_r4.rooms,
  prior_state forme_r4.interaction_state_d NULL,
  new_state forme_r4.interaction_state_d NOT NULL,
  object_version bigint NOT NULL CHECK (object_version>=1),
  actor_class forme_r4.api_actor_class_d NOT NULL,
  actor_subject_id forme_r4.r4_id NULL CONSTRAINT fk_interaction_events__actor REFERENCES forme_r4.actor_subjects,
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL
);
CREATE TABLE forme_r4.fresh_cycle_reservations (
  reservation_id forme_r4.r4_id CONSTRAINT pk_fresh_cycle_reservations PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='fresh_cycle_reservation.v1'),
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_fresh_cycles__interaction REFERENCES forme_r4.interactions,
  start_authorization_hash forme_r4.sha256_digest NOT NULL,
  session_envelope_hash forme_r4.sha256_digest NOT NULL,
  state forme_r4.fresh_cycle_state_d NOT NULL,
  idempotency_key forme_r4.idempotency_key NOT NULL,
  reserved_at timestamptz(3) NOT NULL,
  first_dispatch_committed_at timestamptz(3) NULL,
  released_at timestamptz(3) NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_fresh_cycles__state CHECK (
    (state='reserved' AND first_dispatch_committed_at IS NULL AND released_at IS NULL)
    OR (state='dispatch_committed' AND first_dispatch_committed_at IS NOT NULL AND released_at IS NULL)
    OR (state='released_zero_dispatch' AND first_dispatch_committed_at IS NULL AND released_at IS NOT NULL)
  )
);
CREATE TABLE forme_r4.dispatch_permits (
  permit_id forme_r4.r4_id CONSTRAINT pk_dispatch_permits PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='dispatch_permit.v1'),
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_dispatch_permits__interaction REFERENCES forme_r4.interactions,
  reservation_id forme_r4.r4_id NOT NULL CONSTRAINT fk_dispatch_permits__reservation REFERENCES forme_r4.fresh_cycle_reservations,
  session_envelope_hash forme_r4.sha256_digest NOT NULL,
  start_authorization_hash forme_r4.sha256_digest NOT NULL,
  provider text NOT NULL CHECK (provider='OpenAI'),
  model_id forme_r4.canonical_text NOT NULL CHECK (octet_length(model_id) BETWEEN 1 AND 256),
  payload_hash forme_r4.sha256_digest NOT NULL,
  dispatch_ordinal smallint NOT NULL CHECK (dispatch_ordinal BETWEEN 1 AND 3),
  idempotency_key forme_r4.idempotency_key NOT NULL,
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3) NULL,
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT uq_dispatch_permits__ordinal UNIQUE(reservation_id,dispatch_ordinal),
  CONSTRAINT ck_dispatch_permits__expiry CHECK (issued_at<expires_at AND expires_at<=issued_at+interval '30 seconds')
);
CREATE UNIQUE INDEX uq_fresh_cycles__active ON forme_r4.fresh_cycle_reservations(interaction_id)
  WHERE state IN ('reserved','dispatch_committed');
CREATE UNIQUE INDEX uq_fresh_cycles__spent ON forme_r4.fresh_cycle_reservations(interaction_id)
  WHERE state='dispatch_committed';
CREATE INDEX ix_interactions__room_state_time ON forme_r4.interactions(room_id,state,expires_at);
CREATE INDEX ix_interactions__projection ON forme_r4.interactions(projection_id,accepted_at);
CREATE INDEX ix_interactions__origin ON forme_r4.interactions(origin_capability_class,origin_capability_id);
CREATE INDEX ix_interaction_events__version ON forme_r4.interaction_lifecycle_events(interaction_id,object_version);
CREATE INDEX ix_cycles__interaction_time ON forme_r4.fresh_cycle_reservations(interaction_id,reserved_at);
CREATE INDEX ix_dispatch_permits__interaction_ordinal ON forme_r4.dispatch_permits(interaction_id,dispatch_ordinal);

CREATE TABLE forme_r4.responses (
  response_id forme_r4.r4_id CONSTRAINT pk_responses PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='response.v1'),
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT uq_responses__interaction UNIQUE
    CONSTRAINT fk_responses__interaction REFERENCES forme_r4.interactions,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_responses__room REFERENCES forme_r4.rooms,
  projection_id forme_r4.r4_id NOT NULL CONSTRAINT fk_responses__projection REFERENCES forme_r4.projections,
  body_ciphertext forme_r4.encrypted_field_v1 NULL,
  body_object_version integer NOT NULL DEFAULT 1 CHECK (body_object_version>=1),
  body_plaintext_bytes integer NOT NULL CHECK (body_plaintext_bytes BETWEEN 1 AND 16384),
  body_content_hash forme_r4.sha256_digest NOT NULL,
  candidate_hash forme_r4.sha256_digest NOT NULL,
  publication_payload_hash forme_r4.sha256_digest NOT NULL,
  origin_state_at_publication forme_r4.projection_owner_state_d NOT NULL,
  source_disclosure_class forme_r4.response_source_disclosure_d NOT NULL,
  local_basis_attestation_id forme_r4.r4_id NOT NULL,
  approval_attestation_id forme_r4.r4_id NOT NULL CONSTRAINT uq_responses__approval UNIQUE,
  publication_receipt_id forme_r4.r4_id NOT NULL CONSTRAINT uq_responses__publication_receipt UNIQUE,
  published_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  state forme_r4.response_state_d NOT NULL DEFAULT 'available',
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version>=1),
  body_readable boolean NOT NULL DEFAULT true,
  terminal_at timestamptz(3) NULL,
  purged_at timestamptz(3) NULL,
  canonical_object_hash forme_r4.sha256_digest NOT NULL,
  CONSTRAINT ck_responses__expiry CHECK (expires_at<=published_at+interval '7 days'),
  CONSTRAINT ck_responses__readable CHECK (NOT body_readable OR body_ciphertext IS NOT NULL),
  CONSTRAINT ck_responses__purged CHECK (purged_at IS NULL OR body_ciphertext IS NULL)
);
CREATE TABLE forme_r4.response_lifecycle_events (
  event_id forme_r4.r4_id CONSTRAINT pk_response_lifecycle_events PRIMARY KEY,
  response_id forme_r4.r4_id NOT NULL CONSTRAINT fk_response_events__response REFERENCES forme_r4.responses,
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_response_events__interaction REFERENCES forme_r4.interactions,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_response_events__room REFERENCES forme_r4.rooms,
  prior_state forme_r4.response_state_d NULL,
  new_state forme_r4.response_state_d NOT NULL,
  object_version bigint NOT NULL CHECK (object_version>=1),
  actor_class forme_r4.api_actor_class_d NOT NULL,
  actor_subject_id forme_r4.r4_id NULL CONSTRAINT fk_response_events__actor REFERENCES forme_r4.actor_subjects,
  request_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL
);
CREATE INDEX ix_responses__room_state_time ON forme_r4.responses(room_id,state,expires_at);
CREATE INDEX ix_response_events__version ON forme_r4.response_lifecycle_events(response_id,object_version);

CREATE TABLE forme_r4.notification_endpoints (
  interaction_id forme_r4.r4_id CONSTRAINT pk_notification_endpoints PRIMARY KEY
    CONSTRAINT fk_notification_endpoints__interaction REFERENCES forme_r4.interactions,
  schema_version text NOT NULL CHECK (schema_version='notification_endpoint.v1'),
  state forme_r4.notification_endpoint_state_d NOT NULL DEFAULT 'absent',
  address_ciphertext forme_r4.encrypted_field_v1 NULL,
  address_object_version integer NULL CHECK (address_object_version>=1),
  redacted_marker text NULL CHECK (redacted_marker='email_***'),
  verification_expires_at timestamptz(3) NULL,
  verification_attempts smallint NOT NULL DEFAULT 0 CHECK (verification_attempts BETWEEN 0 AND 5),
  verification_sends_this_hour smallint NOT NULL DEFAULT 0 CHECK (verification_sends_this_hour BETWEEN 0 AND 3),
  confirmed_at timestamptz(3) NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  updated_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT ck_notification_endpoints__shape CHECK (
    (state IN ('absent','cleared') AND address_ciphertext IS NULL AND address_object_version IS NULL AND verification_expires_at IS NULL AND confirmed_at IS NULL)
    OR (state='verification_pending' AND address_ciphertext IS NOT NULL AND address_object_version IS NOT NULL AND verification_expires_at IS NOT NULL AND confirmed_at IS NULL)
    OR (state='confirmed' AND address_ciphertext IS NOT NULL AND address_object_version IS NOT NULL AND verification_expires_at IS NULL AND confirmed_at IS NOT NULL)
  )
);
CREATE TABLE forme_r4.notification_challenges (
  challenge_id forme_r4.r4_id CONSTRAINT pk_notification_challenges PRIMARY KEY,
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_notification_challenges__interaction REFERENCES forme_r4.interactions,
  code_digest forme_r4.sha256_digest NULL,
  state forme_r4.notification_challenge_state_d NOT NULL DEFAULT 'pending',
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  used_at timestamptz(3) NULL,
  terminal_at timestamptz(3) NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  CONSTRAINT ck_notification_challenges__expiry CHECK (expires_at<=issued_at+interval '15 minutes'),
  CONSTRAINT ck_notification_challenges__shape CHECK ((state='pending')=(code_digest IS NOT NULL))
);
CREATE UNIQUE INDEX uq_notification_challenges__pending ON forme_r4.notification_challenges(interaction_id) WHERE state='pending';
CREATE TABLE forme_r4.notification_outbox (
  outbox_id forme_r4.r4_id CONSTRAINT pk_notification_outbox PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='notification_outbox.v1'),
  semantic_kind forme_r4.notification_semantic_kind_d NOT NULL,
  interaction_id forme_r4.r4_id NOT NULL CONSTRAINT fk_notification_outbox__interaction REFERENCES forme_r4.interactions,
  response_id forme_r4.r4_id NULL CONSTRAINT fk_notification_outbox__response REFERENCES forme_r4.responses,
  challenge_id forme_r4.r4_id NULL CONSTRAINT fk_notification_outbox__challenge REFERENCES forme_r4.notification_challenges,
  state forme_r4.notification_notice_state_d NOT NULL DEFAULT 'ready_pending',
  target_ciphertext forme_r4.encrypted_field_v1 NULL,
  target_object_version integer NULL CHECK (target_object_version>=1),
  verification_code_ciphertext forme_r4.encrypted_field_v1 NULL,
  verification_code_object_version integer NULL CHECK (verification_code_object_version>=1),
  current_attempt_id forme_r4.r4_id NULL,
  reconciliation_deadline timestamptz(3) NULL,
  no_future_retry boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  created_at timestamptz(3) NOT NULL,
  updated_at timestamptz(3) NOT NULL,
  terminal_at timestamptz(3) NULL,
  CONSTRAINT ck_notification_outbox__semantic CHECK (
    (semantic_kind='response_ready' AND response_id IS NOT NULL AND challenge_id IS NULL AND verification_code_ciphertext IS NULL)
    OR (semantic_kind='verification_code' AND response_id IS NULL AND challenge_id IS NOT NULL AND verification_code_ciphertext IS NOT NULL)
  ),
  CONSTRAINT ck_notification_outbox__ready CHECK (state<>'ready_pending' OR (target_ciphertext IS NOT NULL AND current_attempt_id IS NULL)),
  CONSTRAINT ck_notification_outbox__terminal CHECK (state NOT IN ('provider_accepted','failed','canceled') OR target_ciphertext IS NULL),
  CONSTRAINT ck_notification_outbox__no_retry CHECK (NOT no_future_retry OR (target_ciphertext IS NULL AND verification_code_ciphertext IS NULL))
);
CREATE UNIQUE INDEX uq_notification_outbox__ready_semantic ON forme_r4.notification_outbox(interaction_id) WHERE semantic_kind='response_ready';
CREATE TABLE forme_r4.notification_attempts (
  attempt_id forme_r4.r4_id CONSTRAINT pk_notification_attempts PRIMARY KEY,
  outbox_id forme_r4.r4_id NOT NULL CONSTRAINT uq_notification_attempts__outbox UNIQUE
    CONSTRAINT fk_notification_attempts__outbox REFERENCES forme_r4.notification_outbox,
  state forme_r4.notification_attempt_state_d NOT NULL DEFAULT 'submitting',
  provider_idempotency_key forme_r4.canonical_text NOT NULL CONSTRAINT uq_notification_attempts__provider_key UNIQUE,
  handoff_count smallint NOT NULL DEFAULT 1 CHECK (handoff_count BETWEEN 1 AND 2),
  lease_owner uuid NOT NULL,
  lease_acquired_at timestamptz(3) NOT NULL,
  lease_expires_at timestamptz(3) NOT NULL,
  reconciliation_deadline timestamptz(3) NOT NULL,
  provider_evidence_hash forme_r4.sha256_digest NULL,
  provider_result_at timestamptz(3) NULL,
  created_at timestamptz(3) NOT NULL,
  updated_at timestamptz(3) NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  CONSTRAINT ck_notification_attempts__lease CHECK (lease_expires_at>lease_acquired_at),
  CONSTRAINT ck_notification_attempts__reconcile CHECK (reconciliation_deadline>lease_acquired_at)
);
ALTER TABLE forme_r4.notification_outbox ADD CONSTRAINT fk_notification_outbox__attempt
  FOREIGN KEY(current_attempt_id) REFERENCES forme_r4.notification_attempts(attempt_id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX ix_notification_challenges__expiry ON forme_r4.notification_challenges(interaction_id,expires_at);
CREATE INDEX ix_notification_outbox__claim ON forme_r4.notification_outbox(state,updated_at,outbox_id)
  WHERE state IN ('ready_pending','submitting','delivery_unknown');
CREATE INDEX ix_notification_attempts__lease ON forme_r4.notification_attempts(state,lease_expires_at,attempt_id);

CREATE TABLE forme_r4.room_event_stream (
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_room_events__room REFERENCES forme_r4.rooms,
  sequence bigint NOT NULL CHECK (sequence>=1),
  event_id forme_r4.r4_id NOT NULL CONSTRAINT uq_room_events__event UNIQUE,
  schema_version text NOT NULL CHECK (schema_version='room_event.v1'),
  object_type forme_r4.room_event_object_type_d NOT NULL,
  object_id forme_r4.r4_id NOT NULL,
  event_type forme_r4.canonical_text NOT NULL CHECK (octet_length(event_type) BETWEEN 3 AND 128),
  object_version bigint NOT NULL CHECK (object_version>=1),
  payload_hash forme_r4.sha256_digest NOT NULL,
  committed_at timestamptz(3) NOT NULL,
  body_available boolean NOT NULL,
  reconciliation_snapshot boolean NOT NULL DEFAULT false,
  terminal_tombstone_expires_at timestamptz(3) NULL,
  CONSTRAINT pk_room_event_stream PRIMARY KEY(room_id,sequence)
);
CREATE TABLE forme_r4.operation_receipts (
  receipt_id forme_r4.r4_id CONSTRAINT pk_operation_receipts PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='operation_receipt.v1'),
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_operation_receipts__room REFERENCES forme_r4.rooms,
  actor_class forme_r4.api_actor_class_d NOT NULL,
  actor_subject_id forme_r4.r4_id NULL CONSTRAINT fk_operation_receipts__actor REFERENCES forme_r4.actor_subjects,
  actor_scope_digest forme_r4.sha256_digest NOT NULL,
  action forme_r4.canonical_text NOT NULL CHECK (octet_length(action) BETWEEN 1 AND 128),
  idempotency_key forme_r4.idempotency_key NOT NULL,
  canonical_request_hash forme_r4.sha256_digest NOT NULL,
  target_id forme_r4.r4_id NOT NULL,
  target_version bigint NOT NULL CHECK (target_version>=1),
  status forme_r4.operation_status_d NOT NULL,
  body_free_code forme_r4.canonical_text NOT NULL CHECK (octet_length(body_free_code) BETWEEN 1 AND 128),
  result_body_free jsonb NOT NULL,
  committed_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL
);
CREATE TABLE forme_r4.idempotency_records (
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_idempotency_records__room REFERENCES forme_r4.rooms,
  actor_scope_digest forme_r4.sha256_digest NOT NULL,
  action forme_r4.canonical_text NOT NULL,
  idempotency_key forme_r4.idempotency_key NOT NULL,
  canonical_request_hash forme_r4.sha256_digest NOT NULL,
  http_status smallint NOT NULL,
  result_code forme_r4.canonical_text NOT NULL,
  recovery_kind forme_r4.idempotency_recovery_kind_d NOT NULL,
  body_free_result jsonb NULL,
  sensitive_result_ciphertext forme_r4.encrypted_field_v1 NULL,
  sensitive_result_object_version integer NULL CHECK (sensitive_result_object_version>=1),
  sensitive_expires_at timestamptz(3) NULL,
  expired_http_status smallint NULL,
  expired_body_free_result jsonb NULL,
  receipt_id forme_r4.r4_id NOT NULL CONSTRAINT fk_idempotency_records__receipt REFERENCES forme_r4.operation_receipts,
  created_at timestamptz(3) NOT NULL,
  retention_expires_at timestamptz(3) NOT NULL,
  CONSTRAINT pk_idempotency_records PRIMARY KEY(actor_scope_digest,action,idempotency_key),
  CONSTRAINT ck_idempotency_records__sensitive CHECK (
    (recovery_kind='encrypted_transient')=
    (sensitive_result_ciphertext IS NOT NULL AND sensitive_result_object_version IS NOT NULL AND sensitive_expires_at IS NOT NULL)
  ),
  CONSTRAINT ck_idempotency_records__retention CHECK (retention_expires_at<=created_at+interval '37 days')
);
CREATE TABLE forme_r4.rate_buckets (
  rate_event_id forme_r4.r4_id CONSTRAINT pk_rate_buckets PRIMARY KEY,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_rate_buckets__room REFERENCES forme_r4.rooms,
  scope text NOT NULL CHECK (scope IN ('encounter_issue','public_accept')),
  bucket_digest forme_r4.sha256_digest NOT NULL,
  source_object_id forme_r4.r4_id NOT NULL,
  committed_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_rate_buckets__scope_source UNIQUE(scope,source_object_id),
  CONSTRAINT ck_rate_buckets__expiry CHECK (expires_at<=committed_at+interval '24 hours')
);
CREATE TABLE forme_r4.retention_jobs (
  retention_job_id forme_r4.r4_id CONSTRAINT pk_retention_jobs PRIMARY KEY,
  room_id forme_r4.r4_id NOT NULL CONSTRAINT fk_retention_jobs__room REFERENCES forme_r4.rooms,
  target_kind forme_r4.retention_target_kind_d NOT NULL,
  target_row_id forme_r4.r4_id NOT NULL,
  target_column name NULL,
  terminal_at timestamptz(3) NOT NULL,
  due_at timestamptz(3) NOT NULL,
  slo_deadline_at timestamptz(3) NOT NULL,
  state forme_r4.retention_job_state_d NOT NULL DEFAULT 'pending',
  lease_owner uuid NULL,
  lease_expires_at timestamptz(3) NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count>=0),
  last_error_code forme_r4.canonical_text NULL,
  payload_present boolean NOT NULL DEFAULT true,
  purged_at timestamptz(3) NULL,
  outcome forme_r4.purge_outcome_d NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  created_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_retention_jobs__target UNIQUE NULLS NOT DISTINCT(target_kind,target_row_id,target_column,terminal_at),
  CONSTRAINT ck_retention_jobs__due CHECK (due_at>=terminal_at AND slo_deadline_at=terminal_at+interval '24 hours'),
  CONSTRAINT ck_retention_jobs__completed CHECK (state<>'completed' OR (NOT payload_present AND outcome IS NOT NULL))
);
CREATE TABLE forme_r4.purge_watermarks (
  watermark_name text CONSTRAINT pk_purge_watermarks PRIMARY KEY CHECK (watermark_name='hosted_janitor'),
  last_successful_purge_at timestamptz(3) NOT NULL,
  last_batch_id forme_r4.r4_id NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
  updated_at timestamptz(3) NOT NULL
);
CREATE TABLE forme_r4.operator_incidents (
  incident_id forme_r4.r4_id CONSTRAINT pk_operator_incidents PRIMARY KEY,
  code forme_r4.operator_incident_code_d NOT NULL,
  room_id forme_r4.r4_id NULL CONSTRAINT fk_operator_incidents__room REFERENCES forme_r4.rooms,
  target_kind forme_r4.retention_target_kind_d NULL,
  target_row_id forme_r4.r4_id NULL,
  opened_at timestamptz(3) NOT NULL,
  resolved_at timestamptz(3) NULL,
  body_free boolean NOT NULL DEFAULT true CHECK (body_free=true),
  CONSTRAINT uq_operator_incidents__target UNIQUE NULLS NOT DISTINCT(code,target_kind,target_row_id)
);
CREATE INDEX ix_room_events__event ON forme_r4.room_event_stream(event_id);
CREATE INDEX ix_room_events__replay ON forme_r4.room_event_stream(room_id,sequence,committed_at);
CREATE INDEX ix_room_events__object_latest ON forme_r4.room_event_stream(room_id,object_type,object_id,sequence DESC);
CREATE INDEX ix_operation_receipts__room_time ON forme_r4.operation_receipts(room_id,committed_at);
CREATE INDEX ix_operation_receipts__expiry ON forme_r4.operation_receipts(expires_at);
CREATE INDEX ix_idempotency_records__expiry ON forme_r4.idempotency_records(retention_expires_at);
CREATE INDEX ix_rate_buckets__count ON forme_r4.rate_buckets(room_id,scope,bucket_digest,committed_at);
CREATE INDEX ix_retention_jobs__claim ON forme_r4.retention_jobs(state,due_at,room_id,target_kind,target_row_id)
  WHERE state IN ('pending','failed');
CREATE INDEX ix_operator_incidents__open ON forme_r4.operator_incidents(opened_at) WHERE resolved_at IS NULL;

CREATE FUNCTION forme_r4.enforce_projection_room_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE
  room_entity forme_r4.r4_id;
  kind forme_r4.room_kind_d;
BEGIN
  SELECT entity_id, room_kind INTO room_entity, kind
  FROM forme_r4.rooms WHERE room_id=NEW.room_id FOR KEY SHARE;
  IF room_entity IS NULL OR room_entity<>NEW.entity_id THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF kind='private_grant_only' AND NEW.curation_state<>'not_admitted' THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  RETURN NEW;
END
$function$;
CREATE TRIGGER tr_projections__room_entity
  BEFORE INSERT OR UPDATE ON forme_r4.projections
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_projection_room_entity();

CREATE FUNCTION forme_r4.enforce_projection_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
BEGIN
  IF OLD.room_id IS DISTINCT FROM NEW.room_id
     OR OLD.entity_id IS DISTINCT FROM NEW.entity_id
     OR OLD.capsule_ciphertext IS DISTINCT FROM NEW.capsule_ciphertext
     OR OLD.disclosure_basis_id IS DISTINCT FROM NEW.disclosure_basis_id
     OR OLD.publication_attestation_id IS DISTINCT FROM NEW.publication_attestation_id
     OR OLD.payload_hash IS DISTINCT FROM NEW.payload_hash THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  RETURN NEW;
END
$function$;
CREATE TRIGGER tr_projections__immutable
  BEFORE UPDATE ON forme_r4.projections
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_projection_immutability();

CREATE FUNCTION forme_r4.enforce_response_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE interaction_expiry timestamptz(3);
BEGIN
  SELECT expires_at INTO interaction_expiry FROM forme_r4.interactions
  WHERE interaction_id=NEW.interaction_id FOR KEY SHARE;
  IF interaction_expiry IS NULL OR NEW.expires_at>interaction_expiry THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  RETURN NULL;
END
$function$;
CREATE CONSTRAINT TRIGGER tr_responses__interaction_expiry
  AFTER INSERT OR UPDATE ON forme_r4.responses DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_response_expiry();

CREATE FUNCTION forme_r4.enforce_terminal_unreadability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
BEGIN
  IF TG_TABLE_NAME='projections'
     AND NEW.owner_state IN ('superseded','revoked','expired')
     AND NEW.body_readable THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  ELSIF TG_TABLE_NAME='interactions'
     AND NEW.state IN ('closed_without_response','interaction_expired','interaction_deleted','origin_revoked','room_retired')
     AND NEW.body_readable THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  ELSIF TG_TABLE_NAME='responses'
     AND NEW.state<>'available' AND NEW.body_readable THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  RETURN NEW;
END
$function$;
CREATE TRIGGER tr_projections__terminal_unreadable BEFORE INSERT OR UPDATE ON forme_r4.projections
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_terminal_unreadability();
CREATE TRIGGER tr_interactions__terminal_unreadable BEFORE INSERT OR UPDATE ON forme_r4.interactions
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_terminal_unreadability();
CREATE TRIGGER tr_responses__terminal_unreadable BEFORE INSERT OR UPDATE ON forme_r4.responses
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_terminal_unreadability();

CREATE FUNCTION forme_r4.enforce_room_event_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE prior_high_water bigint;
BEGIN
  SELECT event_high_water INTO prior_high_water FROM forme_r4.rooms
  WHERE room_id=NEW.room_id FOR UPDATE;
  IF prior_high_water IS NULL OR NEW.sequence<>prior_high_water+1 THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  UPDATE forme_r4.rooms SET event_high_water=NEW.sequence WHERE room_id=NEW.room_id;
  RETURN NEW;
END
$function$;
CREATE TRIGGER tr_room_events__contiguous BEFORE INSERT ON forme_r4.room_event_stream
  FOR EACH ROW EXECUTE FUNCTION forme_r4.enforce_room_event_sequence();

-- Eleven body-free audit views. Runtime callers never receive raw table grants.
CREATE VIEW forme_r4.audit_schema_migrations WITH (security_barrier=true) AS
  SELECT version,migration_name,migration_sha256,technical_packet_sha256,
    scope_brief_sha256,construction_packet_sha256,core_basis_sha256,
    execution_manifest_sha256,applied_at,applied_by,postgres_version_num,
    rollback_compatible
  FROM forme_r4.schema_migrations;
CREATE VIEW forme_r4.audit_room_lifecycle WITH (security_barrier=true) AS
  SELECT room_id,event_kind,prior_interaction_mode,new_interaction_mode,
    prior_status,new_status,object_version,committed_at
  FROM forme_r4.room_lifecycle_events;
CREATE VIEW forme_r4.audit_projection_lifecycle WITH (security_barrier=true) AS
  SELECT projection_id,room_id,prior_owner_state,new_owner_state,prior_current,
    new_current,object_version,committed_at FROM forme_r4.projection_lifecycle_events;
CREATE VIEW forme_r4.audit_curation_events WITH (security_barrier=true) AS
  SELECT third_place_id,projection_id,room_id,event_kind,prior_state,new_state,
    object_version,committed_at FROM forme_r4.curation_events;
CREATE VIEW forme_r4.audit_capability_events WITH (security_barrier=true) AS
  SELECT capability_class,capability_id,room_id,projection_id,prior_state,new_state,
    object_version,committed_at FROM forme_r4.capability_events;
CREATE VIEW forme_r4.audit_interaction_lifecycle WITH (security_barrier=true) AS
  SELECT interaction_id,room_id,prior_state,new_state,object_version,committed_at
  FROM forme_r4.interaction_lifecycle_events;
CREATE VIEW forme_r4.audit_response_lifecycle WITH (security_barrier=true) AS
  SELECT response_id,interaction_id,room_id,prior_state,new_state,object_version,
    committed_at FROM forme_r4.response_lifecycle_events;
CREATE VIEW forme_r4.audit_operation_receipts WITH (security_barrier=true) AS
  SELECT receipt_id,room_id,actor_class,action,target_id,target_version,status,
    body_free_code,committed_at,expires_at FROM forme_r4.operation_receipts;
CREATE VIEW forme_r4.audit_room_event_high_water WITH (security_barrier=true) AS
  SELECT room_id,event_high_water,status,version FROM forme_r4.rooms;
CREATE VIEW forme_r4.audit_purge_health WITH (security_barrier=true) AS
  SELECT watermark_name,last_successful_purge_at,last_batch_id,version,updated_at
  FROM forme_r4.purge_watermarks;
CREATE VIEW forme_r4.audit_operator_incidents WITH (security_barrier=true) AS
  SELECT incident_id,code,room_id,target_kind,target_row_id,opened_at,resolved_at,
    body_free FROM forme_r4.operator_incidents;

-- Migrate-only, exact synthetic Core basis. It deliberately creates no Room,
-- operation receipt or idempotency row.
CREATE FUNCTION forme_r4.tx_gate_b_core_basis_install(
  p_ctx forme_r4.mutation_context_v1,
  p_basis_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE
  business_rows bigint;
  exact_rows boolean;
  result_body jsonb := jsonb_build_object(
    'schemaVersion','gate_b_core_basis_install_result.v1',
    'eventId','event_gatebcorethirdplace00001');
BEGIN
  IF p_ctx IS NULL
     OR p_basis_hash IS DISTINCT FROM 'sha256:eabd968569b8245a7d6ed15493a3e79a59c913304e8d429169bf611b3d173d35'
     OR (p_ctx).idempotency_key IS DISTINCT FROM 'gate_b_core_basis_install_v1'
     OR (p_ctx).canonical_request_hash IS DISTINCT FROM 'sha256:a0b7bfe19e9583c68e715afcd361a06cd3ddb7dc57165efc77188e02ea12d309' THEN
    RETURN ROW(409::smallint,'gate_b_core_basis_request_conflict',NULL,NULL,NULL,
      jsonb_build_object('code','gate_b_core_basis_request_conflict'))::forme_r4.api_result_v1;
  END IF;
  IF (p_ctx).actor_class IS DISTINCT FROM 'controller'
     OR (p_ctx).actor_subject_id IS DISTINCT FROM 'subject_gatebcorecontroller0001'
     OR (p_ctx).actor_scope_digest IS DISTINCT FROM 'sha256:b6c733e7298f287d559ee69afa6a0fdd6312248388c5db493ee3c80a2b2d5993'
     OR (p_ctx).expected_object_version IS NOT NULL
     OR (p_ctx).correlation_id IS DISTINCT FROM '8a7b8a0f-44d5-4c5e-a1b2-8b77b7e0c401'::uuid THEN
    RETURN ROW(403::smallint,'gate_b_core_basis_context_denied',NULL,NULL,NULL,
      jsonb_build_object('code','gate_b_core_basis_context_denied'))::forme_r4.api_result_v1;
  END IF;

  LOCK TABLE forme_r4.actor_subjects,forme_r4.actor_roles,forme_r4.third_places,
    forme_r4.third_place_events,forme_r4.entities,forme_r4.rooms,
    forme_r4.room_lifecycle_events,forme_r4.encryption_nonces,forme_r4.projections,
    forme_r4.projection_lifecycle_events,forme_r4.curation_events,
    forme_r4.room_bindings,forme_r4.pairing_challenges,forme_r4.public_encounters,
    forme_r4.grants,forme_r4.direct_grant_invites,forme_r4.agent_derivatives,
    forme_r4.capability_events,forme_r4.interactions,forme_r4.grant_offers,
    forme_r4.interaction_lifecycle_events,forme_r4.fresh_cycle_reservations,
    forme_r4.dispatch_permits,forme_r4.responses,forme_r4.response_lifecycle_events,
    forme_r4.notification_endpoints,forme_r4.notification_challenges,
    forme_r4.notification_outbox,forme_r4.notification_attempts,
    forme_r4.room_event_stream,forme_r4.operation_receipts,
    forme_r4.idempotency_records,forme_r4.rate_buckets,forme_r4.retention_jobs,
    forme_r4.purge_watermarks,forme_r4.operator_incidents IN EXCLUSIVE MODE;

  SELECT
    (SELECT count(*) FROM forme_r4.actor_subjects)+
    (SELECT count(*) FROM forme_r4.actor_roles)+
    (SELECT count(*) FROM forme_r4.third_places)+
    (SELECT count(*) FROM forme_r4.third_place_events)+
    (SELECT count(*) FROM forme_r4.entities)+
    (SELECT count(*) FROM forme_r4.rooms)+
    (SELECT count(*) FROM forme_r4.room_lifecycle_events)+
    (SELECT count(*) FROM forme_r4.encryption_nonces)+
    (SELECT count(*) FROM forme_r4.projections)+
    (SELECT count(*) FROM forme_r4.projection_lifecycle_events)+
    (SELECT count(*) FROM forme_r4.curation_events)+
    (SELECT count(*) FROM forme_r4.room_bindings)+
    (SELECT count(*) FROM forme_r4.pairing_challenges)+
    (SELECT count(*) FROM forme_r4.public_encounters)+
    (SELECT count(*) FROM forme_r4.grants)+
    (SELECT count(*) FROM forme_r4.direct_grant_invites)+
    (SELECT count(*) FROM forme_r4.agent_derivatives)+
    (SELECT count(*) FROM forme_r4.capability_events)+
    (SELECT count(*) FROM forme_r4.interactions)+
    (SELECT count(*) FROM forme_r4.grant_offers)+
    (SELECT count(*) FROM forme_r4.interaction_lifecycle_events)+
    (SELECT count(*) FROM forme_r4.fresh_cycle_reservations)+
    (SELECT count(*) FROM forme_r4.dispatch_permits)+
    (SELECT count(*) FROM forme_r4.responses)+
    (SELECT count(*) FROM forme_r4.response_lifecycle_events)+
    (SELECT count(*) FROM forme_r4.notification_endpoints)+
    (SELECT count(*) FROM forme_r4.notification_challenges)+
    (SELECT count(*) FROM forme_r4.notification_outbox)+
    (SELECT count(*) FROM forme_r4.notification_attempts)+
    (SELECT count(*) FROM forme_r4.room_event_stream)+
    (SELECT count(*) FROM forme_r4.operation_receipts)+
    (SELECT count(*) FROM forme_r4.idempotency_records)+
    (SELECT count(*) FROM forme_r4.rate_buckets)+
    (SELECT count(*) FROM forme_r4.retention_jobs)+
    (SELECT count(*) FROM forme_r4.purge_watermarks)+
    (SELECT count(*) FROM forme_r4.operator_incidents)
  INTO business_rows;

  IF business_rows=0 THEN
    INSERT INTO forme_r4.actor_subjects(subject_id,schema_version,issuer_hash,provider_subject_hash)
    VALUES
      ('subject_gatebcorecontroller0001','actor_subject.v1','sha256:11be35a7bc87b2b2569b7615d9c15980a5be36934f7cd377634a6b752760fee2','sha256:877f7b87a8dbc2ae30bd6d0d7917f083cfd9f86b6cf45e1abada5c034d0f9eb6'),
      ('subject_gatebcorecurator000001','actor_subject.v1','sha256:77c2c89119d707640c13182ebd59e0cd43acb08c48396b6638a66b69e7d9cf27','sha256:3c9e8546880091ba65e4f1b4c1463d3d4df308f7ee8189e8b61f15621ed2f1b0');
    INSERT INTO forme_r4.actor_roles(role_assignment_id,subject_id,role,granted_by_subject_id)
    VALUES
      ('role_gatebcorecontroller000001','subject_gatebcorecontroller0001','controller',NULL),
      ('role_gatebcorecurator00000001','subject_gatebcorecurator000001','curator','subject_gatebcorecontroller0001');
    INSERT INTO forme_r4.third_places(third_place_id,schema_version,slug,public_label)
    VALUES('thirdplace_gatebcore000000001','third_place.v1','forme-demo','Forme Third Place');
    INSERT INTO forme_r4.third_place_events(event_id,third_place_id,event_kind,prior_state,new_state,actor_subject_id,object_version,request_hash)
    VALUES('event_gatebcorethirdplace00001','thirdplace_gatebcore000000001','created',NULL,'active','subject_gatebcorecontroller0001',1,(p_ctx).canonical_request_hash);
    INSERT INTO forme_r4.entities(entity_id,schema_version,controller_subject_id,public_display_label)
    VALUES('entity_gatebcoreforme00000001','hosted_entity.v1','subject_gatebcorecontroller0001','Forme');
    RETURN ROW(201::smallint,'gate_b_core_basis_installed','thirdplace_gatebcore000000001',1,NULL,result_body)::forme_r4.api_result_v1;
  END IF;

  SELECT business_rows=7
    AND EXISTS (SELECT 1 FROM forme_r4.actor_subjects WHERE subject_id='subject_gatebcorecontroller0001' AND schema_version='actor_subject.v1' AND issuer_hash='sha256:11be35a7bc87b2b2569b7615d9c15980a5be36934f7cd377634a6b752760fee2' AND provider_subject_hash='sha256:877f7b87a8dbc2ae30bd6d0d7917f083cfd9f86b6cf45e1abada5c034d0f9eb6' AND state='active' AND version=1 AND revoked_at IS NULL)
    AND EXISTS (SELECT 1 FROM forme_r4.actor_subjects WHERE subject_id='subject_gatebcorecurator000001' AND schema_version='actor_subject.v1' AND issuer_hash='sha256:77c2c89119d707640c13182ebd59e0cd43acb08c48396b6638a66b69e7d9cf27' AND provider_subject_hash='sha256:3c9e8546880091ba65e4f1b4c1463d3d4df308f7ee8189e8b61f15621ed2f1b0' AND state='active' AND version=1 AND revoked_at IS NULL)
    AND EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE role_assignment_id='role_gatebcorecontroller000001' AND subject_id='subject_gatebcorecontroller0001' AND role='controller' AND granted_by_subject_id IS NULL AND revoked_at IS NULL AND version=1)
    AND EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE role_assignment_id='role_gatebcorecurator00000001' AND subject_id='subject_gatebcorecurator000001' AND role='curator' AND granted_by_subject_id='subject_gatebcorecontroller0001' AND revoked_at IS NULL AND version=1)
    AND EXISTS (SELECT 1 FROM forme_r4.third_places WHERE third_place_id='thirdplace_gatebcore000000001' AND schema_version='third_place.v1' AND slug='forme-demo' AND public_label='Forme Third Place' AND state='active' AND version=1 AND closed_at IS NULL)
    AND EXISTS (SELECT 1 FROM forme_r4.third_place_events WHERE event_id='event_gatebcorethirdplace00001' AND third_place_id='thirdplace_gatebcore000000001' AND event_kind='created' AND prior_state IS NULL AND new_state='active' AND actor_subject_id='subject_gatebcorecontroller0001' AND object_version=1 AND request_hash=(p_ctx).canonical_request_hash)
    AND EXISTS (SELECT 1 FROM forme_r4.entities WHERE entity_id='entity_gatebcoreforme00000001' AND schema_version='hosted_entity.v1' AND controller_subject_id='subject_gatebcorecontroller0001' AND public_display_label='Forme' AND state='active' AND version=1 AND retired_at IS NULL)
  INTO exact_rows;
  IF exact_rows THEN
    RETURN ROW(200::smallint,'gate_b_core_basis_already_installed','thirdplace_gatebcore000000001',1,NULL,result_body)::forme_r4.api_result_v1;
  END IF;
  RETURN ROW(409::smallint,'gate_b_core_basis_state_conflict',NULL,NULL,NULL,
    jsonb_build_object('code','gate_b_core_basis_state_conflict'))::forme_r4.api_result_v1;
END
$function$;

-- Core reads expose only public/current rows or an exact authenticated scope.
CREATE FUNCTION forme_r4.api_third_place_list()
RETURNS SETOF forme_r4.api_result_v1
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
  SELECT ROW(200::smallint,'ok',NULL,NULL,NULL,
    jsonb_build_object(
      'schemaVersion','third_place_list.v1',
      'residents',COALESCE(jsonb_agg(jsonb_build_object(
        'schemaVersion','projection_capsule.v1',
        'projectionId',p.projection_id,
        'roomId',p.room_id,
        'entityId',p.entity_id,
        'title','Synthetic encrypted projection',
        'thirdPlaceSummary','Synthetic Gate B Core projection',
        'claims',jsonb_build_array(jsonb_build_object('claim','Synthetic Core projection','confidence','high','basis','owner-approved synthetic delivery')),
        'supportedInteractions',jsonb_build_array('ask','seed','resonance'),
        'allowedTopics',jsonb_build_array('Forme'),
        'unavailableTopics','[]'::jsonb,
        'expectedResponseLatency','Owner reviewed; asynchronous',
        'visualThemeToken','forme-core',
        'agencyStatement','A shallow, owner-published snapshot.',
        'nonCommitmentStatement','This projection cannot make commitments for its Owner.',
        'disclosureBasisId',p.disclosure_basis_id,
        'publicationAttestationId',p.publication_attestation_id,
        'payloadHash',p.payload_hash,
        'publishedAt',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'freshUntil',to_char(p.fresh_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'expiresAt',to_char(p.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) ORDER BY p.published_at DESC),'[]'::jsonb)))::forme_r4.api_result_v1
  FROM forme_r4.projections p
  JOIN forme_r4.rooms r ON r.room_id=p.room_id
  JOIN forme_r4.third_places t ON t.third_place_id=r.home_third_place_id
  WHERE r.room_kind='third_place_public' AND r.status='active'
    AND t.state='active' AND p.current AND p.curation_state='admitted'
    AND p.owner_state IN ('published_fresh','stale') AND p.body_readable
    AND p.expires_at>statement_timestamp()
$function$;

CREATE FUNCTION forme_r4.api_projection_read(
  p_projection_id forme_r4.r4_id,
  p_capability_digest forme_r4.sha256_digest DEFAULT NULL)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE p forme_r4.projections%ROWTYPE; r forme_r4.rooms%ROWTYPE;
BEGIN
  SELECT * INTO p FROM forme_r4.projections WHERE projection_id=p_projection_id;
  IF NOT FOUND THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p.room_id;
  IF r.room_kind<>'third_place_public' OR NOT p.current OR p.curation_state<>'admitted'
     OR p.owner_state NOT IN ('published_fresh','stale') OR NOT p.body_readable
     OR p.expires_at<=statement_timestamp() THEN
    RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1;
  END IF;
  RETURN ROW(200::smallint,'ok',p.projection_id,p.lifecycle_version,NULL,
    jsonb_build_object('view',jsonb_build_object(
      'schemaVersion','projection_read_view.v1',
      'room',jsonb_build_object('schemaVersion','room.v1','roomId',r.room_id,'entityId',r.entity_id,'roomKind',r.room_kind,'interactionMode',r.interaction_mode,'status',r.status,'currentProjectionId',r.current_projection_id,'version',r.version,'createdAt',to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'retiredAt',NULL),
      'projection',jsonb_build_object('schemaVersion','projection_capsule.v1','projectionId',p.projection_id,'roomId',p.room_id,'entityId',p.entity_id,'title','Synthetic encrypted projection','thirdPlaceSummary','Synthetic Gate B Core projection','claims',jsonb_build_array(jsonb_build_object('claim','Synthetic Core projection','confidence','high','basis','owner-approved synthetic delivery')),'supportedInteractions',jsonb_build_array('ask','seed','resonance'),'allowedTopics',jsonb_build_array('Forme'),'unavailableTopics','[]'::jsonb,'expectedResponseLatency','Owner reviewed; asynchronous','visualThemeToken','forme-core','agencyStatement','A shallow, owner-published snapshot.','nonCommitmentStatement','This projection cannot make commitments for its Owner.','disclosureBasisId',p.disclosure_basis_id,'publicationAttestationId',p.publication_attestation_id,'payloadHash',p.payload_hash,'publishedAt',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'freshUntil',to_char(p.fresh_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(p.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      'lifecycle',jsonb_build_object('schemaVersion','projection_lifecycle.v1','ownerState',p.owner_state,'curationState',p.curation_state,'current',p.current,'lifecycleVersion',p.lifecycle_version,'changedAt',to_char(p.changed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      'warning',CASE WHEN p.owner_state='stale' THEN to_jsonb('stale_projection'::text) ELSE 'null'::jsonb END,
      'cacheControl','no-store')))::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.api_interaction_read(
  p_interaction_id forme_r4.r4_id,
  p_reply_capability_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE i forme_r4.interactions%ROWTYPE;
BEGIN
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id;
  IF NOT FOUND OR i.reply_capability_digest<>p_reply_capability_digest OR NOT i.body_readable THEN
    RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1;
  END IF;
  RETURN ROW(200::smallint,'ok',i.interaction_id,i.state_version,NULL,
    jsonb_build_object('schemaVersion','guest_interaction_status.v1','interaction',
      jsonb_build_object('schemaVersion','interaction.v1','interactionId',i.interaction_id,'roomId',i.room_id,'projectionId',i.projection_id,'originProjectionHash',i.origin_projection_hash,'originStateAtAcceptance',i.origin_state_at_acceptance,'interactionType',i.interaction_type,'requestText','[synthetic encrypted request]','guestCapsule',NULL,'consent',i.consent,'consentEnvelope',i.consent_envelope,'acceptedAt',to_char(i.accepted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(i.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'replyCapabilityDigest',i.reply_capability_digest,'deleteCapabilityDigest',i.delete_capability_digest,'state',i.state,'stateVersion',i.state_version)))::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.api_control_status(p_subject_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM forme_r4.actor_subjects s JOIN forme_r4.actor_roles a USING(subject_id)
    WHERE s.subject_id=p_subject_id AND s.state='active' AND a.role='controller' AND a.revoked_at IS NULL) THEN
    RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1;
  END IF;
  RETURN ROW(200::smallint,'ok',NULL,NULL,NULL,'{}'::jsonb)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.api_control_interaction_read(
  p_subject_id forme_r4.r4_id,p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; response_body jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM forme_r4.actor_subjects s JOIN forme_r4.actor_roles a USING(subject_id)
    WHERE s.subject_id=p_subject_id AND s.state='active' AND a.role='controller' AND a.revoked_at IS NULL) THEN
    RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1;
  END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id;
  IF NOT FOUND OR NOT i.body_readable THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT jsonb_build_object('schemaVersion','response.v1','responseId',x.response_id,'interactionId',x.interaction_id,'roomId',x.room_id,'projectionId',x.projection_id,'body','[synthetic encrypted response]','candidateHash',x.candidate_hash,'originStateAtPublication',x.origin_state_at_publication,'sourceDisclosureClass',x.source_disclosure_class,'localBasisAttestationId',x.local_basis_attestation_id,'approvalAttestationId',x.approval_attestation_id,'publicationReceiptId',x.publication_receipt_id,'publishedAt',to_char(x.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(x.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'state',x.state,'stateVersion',x.state_version)
    INTO response_body FROM forme_r4.responses x WHERE x.interaction_id=i.interaction_id AND x.body_readable;
  RETURN ROW(200::smallint,'ok',i.interaction_id,i.state_version,NULL,
    jsonb_build_object('schemaVersion','owner_interaction_view.v1','interaction',jsonb_build_object('schemaVersion','interaction.v1','interactionId',i.interaction_id,'roomId',i.room_id,'projectionId',i.projection_id,'originProjectionHash',i.origin_projection_hash,'originStateAtAcceptance',i.origin_state_at_acceptance,'interactionType',i.interaction_type,'requestText','[synthetic encrypted request]','guestCapsule',NULL,'consent',i.consent,'consentEnvelope',i.consent_envelope,'acceptedAt',to_char(i.accepted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(i.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'replyCapabilityDigest',i.reply_capability_digest,'deleteCapabilityDigest',i.delete_capability_digest,'state',i.state,'stateVersion',i.state_version),'response',response_body))::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.api_room_operator_status(
  p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,
  p_room_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE r forme_r4.rooms%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id
    AND room_id=p_room_id AND secret_digest=p_binding_digest AND state='active'
    AND expires_at>statement_timestamp()) THEN
    RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1;
  END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p_room_id AND room_kind='third_place_public';
  IF NOT FOUND THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  RETURN ROW(200::smallint,'ok',r.room_id,r.version,NULL,
    jsonb_build_object('schemaVersion','room_operator_status.v1','room',jsonb_build_object('schemaVersion','room.v1','roomId',r.room_id,'entityId',r.entity_id,'roomKind',r.room_kind,'interactionMode',r.interaction_mode,'status',r.status,'currentProjectionId',r.current_projection_id,'version',r.version,'createdAt',to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'retiredAt',NULL),'interactions','[]'::jsonb,'synthetic',true,'roomOperatorRequestHash',p_binding_digest))::forme_r4.api_result_v1;
END
$function$;
REVOKE EXECUTE ON FUNCTION forme_r4.is_encrypted_field_v1(jsonb) FROM PUBLIC;

CREATE FUNCTION forme_r4.tx_room_create(
  p_ctx forme_r4.mutation_context_v1,p_room_id forme_r4.r4_id,
  p_entity_id forme_r4.r4_id,p_room_kind forme_r4.room_kind_d,
  p_home_third_place_id forme_r4.r4_id,p_label_ciphertext forme_r4.encrypted_field_v1)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE replay record; receipt forme_r4.r4_id; event_id forme_r4.r4_id;
  result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001'
     OR (p_ctx).expected_object_version IS NOT NULL
     OR p_entity_id<>'entity_gatebcoreforme00000001'
     OR p_home_third_place_id<>'thirdplace_gatebcore000000001'
     OR p_room_kind<>'third_place_public'
     OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM forme_r4.entities WHERE entity_id=p_entity_id AND state='active')
     OR NOT EXISTS (SELECT 1 FROM forme_r4.third_places WHERE third_place_id=p_home_third_place_id AND state='active') THEN
    RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1;
  END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i
    JOIN forme_r4.operation_receipts o ON o.receipt_id=i.receipt_id
    WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room.create' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN
    IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF;
    RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1;
  END IF;
  IF EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=p_room_id) THEN RETURN ROW(409::smallint,'already_exists',p_room_id,NULL,NULL,jsonb_build_object('code','already_exists'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.rooms(room_id,schema_version,entity_id,home_third_place_id,label_ciphertext,room_kind,interaction_mode)
    VALUES(p_room_id,'room.v1',p_entity_id,p_home_third_place_id,p_label_ciphertext,'third_place_public','public_single');
  event_id:=('event_room_create_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  INSERT INTO forme_r4.room_lifecycle_events(event_id,room_id,event_kind,prior_interaction_mode,new_interaction_mode,prior_status,new_status,prior_deleted,new_deleted,actor_subject_id,object_version,request_hash)
    VALUES(event_id,p_room_id,'created',NULL,'public_single',NULL,'active',NULL,false,(p_ctx).actor_subject_id,1,(p_ctx).canonical_request_hash);
  INSERT INTO forme_r4.room_event_stream(room_id,sequence,event_id,schema_version,object_type,object_id,event_type,object_version,payload_hash,committed_at,body_available)
    VALUES(p_room_id,1,('streamevent_room_create_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,'room_event.v1','room',p_room_id,'room.created',1,(p_ctx).canonical_request_hash,committed,false);
  receipt:=('receipt_room_create_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('room',jsonb_build_object('schemaVersion','room.v1','roomId',p_room_id,'entityId',p_entity_id,'roomKind','third_place_public','interactionMode','public_single','status','active','currentProjectionId',NULL,'version',1,'createdAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'retiredAt',NULL),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room.create','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_room_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','room_created'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'room.create',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_room_id,1,'committed','room_created',jsonb_build_object('code','room_created'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at)
    VALUES(p_room_id,(p_ctx).actor_scope_digest,'room.create',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'room_created','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'room_created',p_room_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_room_pair_issue(
  p_ctx forme_r4.mutation_context_v1,p_room_id forme_r4.r4_id,
  p_pairing_id forme_r4.r4_id,p_pairing_code_digest forme_r4.sha256_digest,
  p_sensitive_recovery_ciphertext forme_r4.encrypted_field_v1)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE r forme_r4.rooms%ROWTYPE; replay record; receipt forme_r4.r4_id;
  result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001'
     OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN
    RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1;
  END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p_room_id FOR UPDATE;
  IF NOT FOUND OR r.room_kind<>'third_place_public' OR r.status<>'active' THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id)
    WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room.pair' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN
    IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF;
    RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1;
  END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM r.version THEN RETURN ROW(409::smallint,'version_conflict',p_room_id,r.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.pairing_challenges(pairing_id,schema_version,room_id,pairing_code_digest,state,issued_at,expires_at)
    VALUES(p_pairing_id,'pairing_challenge.v1',p_room_id,p_pairing_code_digest,'issued',committed,committed+interval '10 minutes');
  receipt:=('receipt_room_pair_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('schemaVersion','room_pair_result.v1','pairingId',p_pairing_id,'roomId',p_room_id,'pairingCode','SYNTHETIC-RECOVERY-VIA-SECURE-CALLER','expiresAt',to_char((committed+interval '10 minutes') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',1,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room.pair','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_pairing_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','pairing_issued'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'room.pair',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_pairing_id,1,'committed','pairing_issued',jsonb_build_object('code','pairing_issued'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,sensitive_result_ciphertext,sensitive_result_object_version,sensitive_expires_at,expired_http_status,expired_body_free_result,receipt_id,created_at,retention_expires_at)
    VALUES(p_room_id,(p_ctx).actor_scope_digest,'room.pair',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'pairing_issued','encrypted_transient',NULL,p_sensitive_recovery_ciphertext,1,committed+interval '10 minutes',410,jsonb_build_object('schemaVersion','room_pair_recovery_expired.v1','pairingId',p_pairing_id,'code','recovery_expired'),receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'pairing_issued',p_pairing_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_room_pair_exchange(
  p_ctx forme_r4.mutation_context_v1,p_pairing_id forme_r4.r4_id,
  p_pairing_code_digest forme_r4.sha256_digest,p_client_public_key_hash forme_r4.sha256_digest,
  p_binding_id forme_r4.r4_id,p_binding_secret_digest forme_r4.sha256_digest,
  p_sealed_exchange_envelope bytea,p_sealed_exchange_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE pairing forme_r4.pairing_challenges%ROWTYPE; replay record;
  receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'public' OR (p_ctx).actor_subject_id IS NOT NULL THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO pairing FROM forme_r4.pairing_challenges WHERE pairing_id=p_pairing_id FOR UPDATE;
  IF NOT FOUND OR pairing.pairing_code_digest<>p_pairing_code_digest THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id)
    WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room.pair.exchange' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN
    IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF;
    RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1;
  END IF;
  IF pairing.state<>'issued' OR pairing.expires_at<=committed THEN RETURN ROW(410::smallint,'pairing_expired',p_pairing_id,pairing.version,NULL,jsonb_build_object('code','pairing_expired'))::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM pairing.version THEN RETURN ROW(409::smallint,'version_conflict',p_pairing_id,pairing.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.room_bindings(binding_id,schema_version,room_id,pairing_id,scope_version,secret_digest,client_public_key_hash,state,paired_at,expires_at)
    VALUES(p_binding_id,'room_operator_binding.v1',pairing.room_id,pairing.pairing_id,'room_operator.v1',p_binding_secret_digest,p_client_public_key_hash,'active',committed,committed+interval '30 days');
  UPDATE forme_r4.pairing_challenges SET state='exchanged',client_public_key_hash=p_client_public_key_hash,binding_id=p_binding_id,sealed_exchange_envelope=p_sealed_exchange_envelope,sealed_exchange_hash=p_sealed_exchange_hash,version=version+1 WHERE pairing_id=p_pairing_id;
  receipt:=('receipt_pair_exchange_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('schemaVersion','room_pair_exchange_result.v1','pairingId',p_pairing_id,'bindingId',p_binding_id,'roomId',pairing.room_id,'expiresAt',to_char((committed+interval '30 days') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'sealedCredential','SYNTHETIC-SEALED-BY-CALLER','version',1,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room.pair.exchange','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_binding_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','pairing_exchanged'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',pairing.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room.pair.exchange',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_binding_id,1,'committed','pairing_exchanged',jsonb_build_object('code','pairing_exchanged'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at)
    VALUES(pairing.room_id,(p_ctx).actor_scope_digest,'room.pair.exchange',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'pairing_exchanged','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'pairing_exchanged',p_binding_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_projection_deliver(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest,p_projection_id forme_r4.r4_id,
  p_room_id forme_r4.r4_id,p_entity_id forme_r4.r4_id,
  p_capsule_ciphertext forme_r4.encrypted_field_v1,p_capsule_plaintext_bytes integer,
  p_title_scalar_count integer,p_summary_plaintext_bytes integer,
  p_disclosure_basis_id forme_r4.r4_id,p_payload_hash forme_r4.sha256_digest,
  p_publication_attestation jsonb)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE r forme_r4.rooms%ROWTYPE; replay record; receipt forme_r4.r4_id;
  committed timestamptz(3):=transaction_timestamp(); attestation_id forme_r4.r4_id;
  result_body jsonb; next_sequence bigint;
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR p_entity_id<>'entity_gatebcoreforme00000001'
     OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=p_room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN
    RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1;
  END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p_room_id FOR UPDATE;
  IF NOT FOUND OR r.room_kind<>'third_place_public' OR r.entity_id<>p_entity_id OR r.status<>'active' THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id)
    WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room_operator.projection.deliver' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN
    IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF;
    RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1;
  END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM r.version THEN RETURN ROW(409::smallint,'version_conflict',p_room_id,r.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF jsonb_typeof(p_publication_attestation)<>'object' OR p_publication_attestation->>'schemaVersion'<>'publication_attestation.v1'
     OR p_publication_attestation->>'artifactClass'<>'projection' OR p_publication_attestation->>'artifactId'<>p_projection_id
     OR p_publication_attestation->>'roomId'<>p_room_id OR p_publication_attestation->>'bindingId'<>p_binding_id
     OR p_publication_attestation->>'artifactHash'<>p_payload_hash THEN
    RETURN ROW(422::smallint,'attestation_invalid',p_projection_id,NULL,NULL,jsonb_build_object('code','attestation_invalid'))::forme_r4.api_result_v1;
  END IF;
  attestation_id:=(p_publication_attestation->>'attestationId')::forme_r4.r4_id;
  IF r.current_projection_id IS NOT NULL THEN
    UPDATE forme_r4.projections SET current=false,owner_state='superseded',body_readable=false,lifecycle_version=lifecycle_version+1,changed_at=committed
      WHERE projection_id=r.current_projection_id AND current;
  END IF;
  INSERT INTO forme_r4.projections(projection_id,schema_version,room_id,entity_id,capsule_ciphertext,capsule_plaintext_bytes,title_scalar_count,summary_plaintext_bytes,disclosure_basis_id,publication_attestation_id,payload_hash,owner_state,curation_state,current,lifecycle_version,published_at,fresh_until,expires_at,changed_at)
    VALUES(p_projection_id,'projection_capsule.v1',p_room_id,p_entity_id,p_capsule_ciphertext,p_capsule_plaintext_bytes,p_title_scalar_count,p_summary_plaintext_bytes,p_disclosure_basis_id,attestation_id,p_payload_hash,'published_fresh','not_admitted',true,1,committed,committed+interval '24 hours',LEAST(committed+interval '7 days',(p_publication_attestation->>'expiresAt')::timestamptz),committed);
  UPDATE forme_r4.rooms SET current_projection_id=p_projection_id,version=version+1 WHERE room_id=p_room_id;
  INSERT INTO forme_r4.projection_lifecycle_events(event_id,projection_id,room_id,prior_owner_state,new_owner_state,prior_current,new_current,object_version,actor_class,actor_subject_id,request_hash,committed_at)
    VALUES(('event_projection_deliver_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_projection_id,p_room_id,NULL,'published_fresh',NULL,true,1,(p_ctx).actor_class,NULL,(p_ctx).canonical_request_hash,committed);
  next_sequence:=r.event_high_water+1;
  INSERT INTO forme_r4.room_event_stream(room_id,sequence,event_id,schema_version,object_type,object_id,event_type,object_version,payload_hash,committed_at,body_available)
    VALUES(p_room_id,next_sequence,('streamevent_projection_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,'room_event.v1','projection',p_projection_id,'projection.delivered',1,p_payload_hash,committed,true);
  receipt:=('receipt_projection_deliver_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('projection',jsonb_build_object('schemaVersion','projection_capsule.v1','projectionId',p_projection_id,'roomId',p_room_id,'entityId',p_entity_id,'title','Synthetic encrypted projection','thirdPlaceSummary','Synthetic Gate B Core projection','claims',jsonb_build_array(jsonb_build_object('claim','Synthetic Core projection','confidence','high','basis','owner-approved synthetic delivery')),'supportedInteractions',jsonb_build_array('ask','seed','resonance'),'allowedTopics',jsonb_build_array('Forme'),'unavailableTopics','[]'::jsonb,'expectedResponseLatency','Owner reviewed; asynchronous','visualThemeToken','forme-core','agencyStatement','A shallow, owner-published snapshot.','nonCommitmentStatement','This projection cannot make commitments for its Owner.','disclosureBasisId',p_disclosure_basis_id,'publicationAttestationId',attestation_id,'payloadHash',p_payload_hash,'publishedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'freshUntil',to_char((committed+interval '24 hours') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(LEAST(committed+interval '7 days',(p_publication_attestation->>'expiresAt')::timestamptz) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'lifecycle',jsonb_build_object('schemaVersion','projection_lifecycle.v1','ownerState','published_fresh','curationState','not_admitted','current',true,'lifecycleVersion',1,'changedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.projection.deliver','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_projection_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','projection_delivered'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.projection.deliver',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_projection_id,1,'committed','projection_delivered',jsonb_build_object('code','projection_delivered'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at)
    VALUES(p_room_id,(p_ctx).actor_scope_digest,'room_operator.projection.deliver',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'projection_delivered','publication_current',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'projection_delivered',p_projection_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_curation_admit(
  p_ctx forme_r4.mutation_context_v1,p_third_place_id forme_r4.r4_id,p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
DECLARE p forme_r4.projections%ROWTYPE; replay record; receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'curator' OR (p_ctx).actor_subject_id<>'subject_gatebcorecurator000001'
     OR p_third_place_id<>'thirdplace_gatebcore000000001'
     OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='curator' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO p FROM forme_r4.projections WHERE projection_id=p_projection_id FOR UPDATE;
  IF NOT FOUND OR NOT p.current OR p.owner_state NOT IN ('published_fresh','stale')
     OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=p.room_id AND home_third_place_id=p_third_place_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='curation.admit' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM p.lifecycle_version THEN RETURN ROW(409::smallint,'version_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF p.curation_state<>'not_admitted' THEN RETURN ROW(409::smallint,'curation_state_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','curation_state_conflict'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.projections SET curation_state='admitted',lifecycle_version=lifecycle_version+1,changed_at=committed WHERE projection_id=p_projection_id;
  INSERT INTO forme_r4.curation_events VALUES(('event_curation_admit_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_third_place_id,p_projection_id,p.room_id,'admitted','not_admitted','admitted',(p_ctx).actor_subject_id,p.lifecycle_version+1,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_curation_admit_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('lifecycle',jsonb_build_object('schemaVersion','projection_lifecycle.v1','ownerState',p.owner_state,'curationState','admitted','current',p.current,'lifecycleVersion',p.lifecycle_version+1,'changedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','curation.admit','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_projection_id,'targetVersion',p.lifecycle_version+1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','projection_admitted'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'curation.admit',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_projection_id,p.lifecycle_version+1,'committed','projection_admitted',jsonb_build_object('code','projection_admitted'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p.room_id,(p_ctx).actor_scope_digest,'curation.admit',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'projection_admitted','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'projection_admitted',p_projection_id,p.lifecycle_version+1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_curation_unlist(
  p_ctx forme_r4.mutation_context_v1,p_third_place_id forme_r4.r4_id,p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE p forme_r4.projections%ROWTYPE; replay record; receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'curator' OR (p_ctx).actor_subject_id<>'subject_gatebcorecurator000001' OR p_third_place_id<>'thirdplace_gatebcore000000001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='curator' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO p FROM forme_r4.projections WHERE projection_id=p_projection_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=p.room_id AND home_third_place_id=p_third_place_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='curation.unlist' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM p.lifecycle_version THEN RETURN ROW(409::smallint,'version_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF p.curation_state<>'admitted' THEN RETURN ROW(409::smallint,'curation_state_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','curation_state_conflict'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.projections SET curation_state='unlisted',lifecycle_version=lifecycle_version+1,changed_at=committed WHERE projection_id=p_projection_id;
  INSERT INTO forme_r4.curation_events VALUES(('event_curation_unlist_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_third_place_id,p_projection_id,p.room_id,'unlisted','admitted','unlisted',(p_ctx).actor_subject_id,p.lifecycle_version+1,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_curation_unlist_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('lifecycle',jsonb_build_object('schemaVersion','projection_lifecycle.v1','ownerState',p.owner_state,'curationState','unlisted','current',p.current,'lifecycleVersion',p.lifecycle_version+1,'changedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','curation.unlist','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_projection_id,'targetVersion',p.lifecycle_version+1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','projection_unlisted'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'curation.unlist',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_projection_id,p.lifecycle_version+1,'committed','projection_unlisted',jsonb_build_object('code','projection_unlisted'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p.room_id,(p_ctx).actor_scope_digest,'curation.unlist',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'projection_unlisted','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'projection_unlisted',p_projection_id,p.lifecycle_version+1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_public_encounter_issue(
  p_ctx forme_r4.mutation_context_v1,p_projection_id forme_r4.r4_id,
  p_encounter_id forme_r4.r4_id,p_secret_digest forme_r4.sha256_digest,
  p_edge_bucket_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE p forme_r4.projections%ROWTYPE; r forme_r4.rooms%ROWTYPE; replay record; receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'public' OR (p_ctx).actor_subject_id IS NOT NULL THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO p FROM forme_r4.projections WHERE projection_id=p_projection_id FOR UPDATE;
  IF NOT FOUND OR NOT p.current OR p.curation_state<>'admitted' OR p.owner_state NOT IN ('published_fresh','stale') OR p.expires_at<=committed THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p.room_id FOR UPDATE;
  IF r.room_kind<>'third_place_public' OR r.status<>'active' OR r.interaction_mode<>'public_single' THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='public_encounter.issue' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM p.lifecycle_version THEN RETURN ROW(409::smallint,'version_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF (SELECT count(*) FROM forme_r4.interactions WHERE room_id=p.room_id AND origin_capability_class='public_encounter' AND state IN ('accepted','seen_locally','preparing'))>=20
     OR (SELECT count(*) FROM forme_r4.rate_buckets WHERE room_id=p.room_id AND scope='encounter_issue' AND bucket_digest=p_edge_bucket_digest AND committed_at>committed-interval '1 hour')>=10
     OR (SELECT count(*) FROM forme_r4.rate_buckets WHERE room_id=p.room_id AND scope='encounter_issue' AND bucket_digest=p_edge_bucket_digest AND committed_at>committed-interval '24 hours')>=50 THEN
    RETURN ROW(429::smallint,'rate_limited',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','rate_limited'))::forme_r4.api_result_v1;
  END IF;
  INSERT INTO forme_r4.public_encounters(encounter_id,schema_version,room_id,projection_id,secret_digest,state,issued_at,expires_at,canonical_object_hash)
    VALUES(p_encounter_id,'public_encounter.v1',p.room_id,p_projection_id,p_secret_digest,'issued',committed,LEAST(committed+interval '24 hours',p.expires_at),(p_ctx).canonical_request_hash);
  INSERT INTO forme_r4.rate_buckets VALUES(('rate_encounter_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p.room_id,'encounter_issue',p_edge_bucket_digest,p_encounter_id,committed,committed+interval '24 hours');
  receipt:=('receipt_encounter_issue_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('encounter',jsonb_build_object('schemaVersion','public_encounter.v1','encounterId',p_encounter_id,'roomId',p.room_id,'projectionId',p_projection_id,'secret','SYNTHETIC-SECRET-HELD-BY-CALLER','issuedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(LEAST(committed+interval '24 hours',p.expires_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','public_encounter.issue','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_encounter_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','public_encounter_issued'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'public_encounter.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_encounter_id,1,'committed','public_encounter_issued',jsonb_build_object('code','public_encounter_issued'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p.room_id,(p_ctx).actor_scope_digest,'public_encounter.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'public_encounter_issued','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'public_encounter_issued',p_encounter_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_interaction_create(
  p_ctx forme_r4.mutation_context_v1,p_submission_class forme_r4.capability_class_d,
  p_submission_id forme_r4.r4_id,p_projection_id forme_r4.r4_id,
  p_interaction_id forme_r4.r4_id,p_interaction_type forme_r4.interaction_type_d,
  p_request_ciphertext forme_r4.encrypted_field_v1,p_request_bytes integer,
  p_request_hash forme_r4.sha256_digest,p_guest_capsule_ciphertext forme_r4.encrypted_field_v1,
  p_guest_capsule_bytes integer,p_guest_capsule_hash forme_r4.sha256_digest,
  p_guest_capsule_level forme_r4.guest_capsule_level_d,p_consent forme_r4.interaction_consent_d,
  p_consent_envelope jsonb,p_consent_envelope_hash forme_r4.sha256_digest,
  p_reply_capability_id forme_r4.r4_id,p_reply_digest forme_r4.sha256_digest,
  p_delete_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE v_room_id forme_r4.r4_id; v_edge_bucket_digest forme_r4.sha256_digest; cap_version bigint; cap_expiry timestamptz(3); cap_count integer; cap_quota integer;
  replay record; receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp(); next_sequence bigint;
BEGIN
  IF (p_ctx).actor_class NOT IN ('manual_guest','guest_agent') OR (p_ctx).actor_subject_id IS NOT NULL
     OR p_submission_class NOT IN ('public_encounter','grant') OR (p_ctx).expected_object_version IS NOT NULL THEN
    RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1;
  END IF;
  IF p_submission_class='public_encounter' THEN
    SELECT e.room_id,e.version,e.expires_at,e.accepted_count,1 INTO v_room_id,cap_version,cap_expiry,cap_count,cap_quota
      FROM forme_r4.public_encounters e WHERE e.encounter_id=p_submission_id AND e.projection_id=p_projection_id
        AND e.secret_digest=(p_ctx).actor_scope_digest FOR UPDATE;
  ELSE
    SELECT g.room_id,g.version,g.expires_at,g.accepted_count,g.accepted_quota INTO v_room_id,cap_version,cap_expiry,cap_count,cap_quota
      FROM forme_r4.grants g WHERE g.grant_id=p_submission_id AND g.projection_id=p_projection_id
        AND g.secret_digest=(p_ctx).actor_scope_digest FOR UPDATE;
  END IF;
  IF v_room_id IS NULL THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  IF p_submission_class='public_encounter' THEN
    SELECT bucket_digest INTO v_edge_bucket_digest
      FROM forme_r4.rate_buckets
      WHERE room_id=v_room_id AND scope='encounter_issue' AND source_object_id=p_submission_id;
    IF NOT FOUND THEN
      RETURN ROW(409::smallint,'capability_unavailable',p_submission_id,cap_version,NULL,jsonb_build_object('code','capability_unavailable'))::forme_r4.api_result_v1;
    END IF;
  END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='interaction.create' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  PERFORM 1 FROM forme_r4.rooms WHERE rooms.room_id=v_room_id AND room_kind='third_place_public' AND status='active' FOR UPDATE;
  IF NOT FOUND OR cap_expiry<=committed OR cap_count>=cap_quota
     OR NOT EXISTS (SELECT 1 FROM forme_r4.projections WHERE projection_id=p_projection_id AND room_id=v_room_id AND current AND curation_state='admitted' AND owner_state IN ('published_fresh','stale') AND body_readable AND expires_at>committed)
     OR EXISTS (SELECT 1 FROM forme_r4.interactions WHERE unresolved_scope_id=p_submission_id AND state IN ('accepted','seen_locally','preparing')) THEN
    RETURN ROW(409::smallint,'capability_unavailable',p_submission_id,cap_version,NULL,jsonb_build_object('code','capability_unavailable'))::forme_r4.api_result_v1;
  END IF;
  IF p_submission_class='public_encounter' THEN
    IF (SELECT count(*) FROM forme_r4.interactions WHERE interactions.room_id=v_room_id AND origin_capability_class='public_encounter' AND state IN ('accepted','seen_locally','preparing'))>=20
       OR (SELECT count(*) FROM forme_r4.rate_buckets WHERE rate_buckets.room_id=v_room_id AND scope='public_accept' AND bucket_digest=v_edge_bucket_digest AND committed_at>committed-interval '24 hours')>=3 THEN
      RETURN ROW(429::smallint,'rate_limited',p_projection_id,NULL,NULL,jsonb_build_object('code','rate_limited'))::forme_r4.api_result_v1;
    END IF;
  END IF;
  IF p_submission_class='public_encounter' THEN
    UPDATE forme_r4.public_encounters SET state='consumed',accepted_count=1,unresolved_interaction_id=p_interaction_id,version=version+1 WHERE encounter_id=p_submission_id;
  ELSE
    UPDATE forme_r4.grants SET accepted_count=accepted_count+1,state=CASE WHEN accepted_count+1>=accepted_quota THEN 'consumed' ELSE 'issued' END,unresolved_interaction_id=p_interaction_id,version=version+1 WHERE grant_id=p_submission_id;
  END IF;
  INSERT INTO forme_r4.interactions(interaction_id,schema_version,room_id,projection_id,origin_projection_hash,origin_state_at_acceptance,origin_capability_class,origin_capability_id,unresolved_scope_id,interaction_type,request_ciphertext,request_plaintext_bytes,request_content_hash,guest_capsule_ciphertext,guest_capsule_object_version,guest_capsule_plaintext_bytes,guest_capsule_hash,guest_capsule_level,consent,consent_envelope,consent_envelope_hash,accepted_at,expires_at,reply_capability_id,reply_capability_digest,delete_capability_digest,state,state_version,canonical_object_hash)
    SELECT p_interaction_id,'interaction.v1',v_room_id,p_projection_id,p.payload_hash,p.owner_state,p_submission_class,p_submission_id,p_submission_id,p_interaction_type,p_request_ciphertext,p_request_bytes,p_request_hash,p_guest_capsule_ciphertext,CASE WHEN p_guest_capsule_ciphertext IS NULL THEN NULL ELSE 1 END,p_guest_capsule_bytes,p_guest_capsule_hash,p_guest_capsule_level,p_consent,p_consent_envelope,p_consent_envelope_hash,committed,LEAST(committed+interval '7 days',cap_expiry),p_reply_capability_id,p_reply_digest,p_delete_digest,'accepted',1,(p_ctx).canonical_request_hash FROM forme_r4.projections p WHERE p.projection_id=p_projection_id;
  INSERT INTO forme_r4.interaction_lifecycle_events VALUES(('event_interaction_create_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_interaction_id,v_room_id,NULL,'accepted',1,(p_ctx).actor_class,NULL,(p_ctx).canonical_request_hash,committed);
  SELECT event_high_water+1 INTO next_sequence FROM forme_r4.rooms WHERE rooms.room_id=v_room_id;
  INSERT INTO forme_r4.room_event_stream VALUES(v_room_id,next_sequence,('streamevent_interaction_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,'room_event.v1','interaction',p_interaction_id,'interaction.accepted',1,(p_ctx).canonical_request_hash,committed,true,false,NULL);
  IF p_submission_class='public_encounter' THEN
    INSERT INTO forme_r4.rate_buckets VALUES(('rate_accept_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,v_room_id,'public_accept',v_edge_bucket_digest,p_interaction_id,committed,committed+interval '24 hours');
  END IF;
  receipt:=('receipt_interaction_create_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('schemaVersion','interaction_create_result.v1','interactionId',p_interaction_id,'state','accepted','expiresAt',to_char(LEAST(committed+interval '7 days',cap_expiry) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','interaction.create','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_interaction_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','interaction_accepted'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',v_room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'interaction.create',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_interaction_id,1,'committed','interaction_accepted',jsonb_build_object('code','interaction_accepted'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(v_room_id,(p_ctx).actor_scope_digest,'interaction.create',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'interaction_accepted','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'interaction_accepted',p_interaction_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_interaction_delete(
  p_ctx forme_r4.mutation_context_v1,p_interaction_id forme_r4.r4_id,p_delete_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; result_body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class NOT IN ('manual_guest','guest_agent') OR (p_ctx).actor_subject_id IS NOT NULL THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR i.delete_capability_digest<>p_delete_digest OR (p_ctx).actor_scope_digest<>p_delete_digest THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='interaction.delete' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF i.state IN ('interaction_deleted','interaction_expired','origin_revoked','room_retired') THEN RETURN ROW(409::smallint,'terminal_state',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','terminal_state'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.interactions SET state='interaction_deleted',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE interaction_id=p_interaction_id;
  UPDATE forme_r4.responses SET state='interaction_deleted',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE interaction_id=p_interaction_id AND state='available';
  INSERT INTO forme_r4.interaction_lifecycle_events VALUES(('event_interaction_delete_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_interaction_id,i.room_id,i.state,'interaction_deleted',i.state_version+1,(p_ctx).actor_class,NULL,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_interaction_delete_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('schemaVersion','interaction_delete_result.v1','state','interaction_deleted','receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','interaction.delete','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_interaction_id,'targetVersion',i.state_version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','interaction_deleted'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'interaction.delete',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_interaction_id,i.state_version+1,'terminal','interaction_deleted',jsonb_build_object('code','interaction_deleted'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'interaction.delete',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'interaction_deleted','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'interaction_deleted',p_interaction_id,i.state_version+1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_grant_offer_accept(
  p_ctx forme_r4.mutation_context_v1,p_offer_id forme_r4.r4_id,
  p_reply_digest forme_r4.sha256_digest,p_grant_id forme_r4.r4_id,
  p_grant_secret_digest forme_r4.sha256_digest,p_reentry_chain_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE o forme_r4.grant_offers%ROWTYPE; i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; result_body jsonb; quota smallint; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class NOT IN ('manual_guest','guest_agent') OR (p_ctx).actor_subject_id IS NOT NULL OR (p_ctx).actor_scope_digest<>p_reply_digest THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO o FROM forme_r4.grant_offers WHERE offer_id=p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=o.source_interaction_id AND reply_capability_digest=p_reply_digest FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,r.target_id,r.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts r USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='grant_offer.accept' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM o.version THEN RETURN ROW(409::smallint,'version_conflict',p_offer_id,o.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF o.state<>'issued' OR o.acceptance_expires_at<=committed THEN RETURN ROW(409::smallint,'offer_unavailable',p_offer_id,o.version,NULL,jsonb_build_object('code','offer_unavailable'))::forme_r4.api_result_v1; END IF;
  quota:=CASE o.preset_id WHEN 'one_visit' THEN 1 WHEN 'short_exchange' THEN 2 WHEN 'familiar_collaborator' THEN 3 ELSE 10 END;
  INSERT INTO forme_r4.grants(grant_id,schema_version,room_id,projection_id,reentry_chain_id,preset_id,secret_digest,state,issued_at,expires_at,accepted_count,accepted_quota,agent_derivation_allowed,version,canonical_object_hash)
    VALUES(p_grant_id,'grant.v1',o.target_room_id,o.target_projection_id,p_reentry_chain_id,o.preset_id,p_grant_secret_digest,'issued',committed,o.offered_grant_expires_at,0,quota,false,1,(p_ctx).canonical_request_hash);
  UPDATE forme_r4.grant_offers SET state='accepted',accepted_grant_id=p_grant_id,version=version+1 WHERE offer_id=p_offer_id;
  receipt:=('receipt_offer_accept_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  result_body:=jsonb_build_object('grant',jsonb_build_object('schemaVersion','grant.v1','grantId',p_grant_id,'roomId',o.target_room_id,'projectionId',o.target_projection_id,'reentryChainId',p_reentry_chain_id,'presetId',o.preset_id,'secret','SYNTHETIC-SECRET-HELD-BY-CALLER','state','issued','issuedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(o.offered_grant_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptedCount',0,'acceptedQuota',quota,'agentDerivationAllowed',false,'version',1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','grant_offer.accept','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_grant_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','grant_offer_accepted'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',o.target_room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'grant_offer.accept',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_grant_id,1,'committed','grant_offer_accepted',jsonb_build_object('code','grant_offer_accepted'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(o.target_room_id,(p_ctx).actor_scope_digest,'grant_offer.accept',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'grant_offer_accepted','body_free',result_body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'grant_offer_accepted',p_grant_id,1,receipt,result_body)::forme_r4.api_result_v1;
END
$function$;

CREATE FUNCTION forme_r4.tx_room_binding_revoke(p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE b forme_r4.room_bindings%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO b FROM forme_r4.room_bindings WHERE binding_id=p_binding_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=b.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room.binding.revoke' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM b.version THEN RETURN ROW(409::smallint,'version_conflict',p_binding_id,b.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF b.state<>'active' THEN RETURN ROW(409::smallint,'terminal_state',p_binding_id,b.version,NULL,jsonb_build_object('code','terminal_state'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.room_bindings SET state='revoked',revoked_at=committed,version=version+1 WHERE binding_id=p_binding_id;
  receipt:=('receipt_binding_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','room_binding_revoke_result.v1','bindingId',p_binding_id,'roomId',b.room_id,'state','revoked','revokedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',b.version+1,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room.binding.revoke','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_binding_id,'targetVersion',b.version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','binding_revoked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',b.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'room.binding.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_binding_id,b.version+1,'terminal','binding_revoked',jsonb_build_object('code','binding_revoked'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(b.room_id,(p_ctx).actor_scope_digest,'room.binding.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'binding_revoked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'binding_revoked',p_binding_id,b.version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_projection_revoke(p_ctx forme_r4.mutation_context_v1,p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE p forme_r4.projections%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO p FROM forme_r4.projections WHERE projection_id=p_projection_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=p.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='projection.revoke' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM p.lifecycle_version THEN RETURN ROW(409::smallint,'version_conflict',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF p.owner_state IN ('revoked','expired','superseded') THEN RETURN ROW(409::smallint,'terminal_state',p_projection_id,p.lifecycle_version,NULL,jsonb_build_object('code','terminal_state'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.projections SET owner_state='revoked',current=false,body_readable=false,lifecycle_version=lifecycle_version+1,changed_at=committed WHERE projection_id=p_projection_id;
  UPDATE forme_r4.rooms SET current_projection_id=NULL,version=version+1 WHERE room_id=p.room_id AND current_projection_id=p_projection_id;
  UPDATE forme_r4.interactions SET state='origin_revoked',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE projection_id=p_projection_id AND state IN ('accepted','seen_locally','preparing','response_ready');
  UPDATE forme_r4.responses SET state='origin_revoked',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE projection_id=p_projection_id AND state='available';
  INSERT INTO forme_r4.projection_lifecycle_events VALUES(('event_projection_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_projection_id,p.room_id,p.owner_state,'revoked',p.current,false,p.lifecycle_version+1,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_projection_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('lifecycle',jsonb_build_object('schemaVersion','projection_lifecycle.v1','ownerState','revoked','curationState',p.curation_state,'current',false,'lifecycleVersion',p.lifecycle_version+1,'changedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','projection.revoke','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_projection_id,'targetVersion',p.lifecycle_version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','projection_revoked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'projection.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_projection_id,p.lifecycle_version+1,'terminal','projection_revoked',jsonb_build_object('code','projection_revoked'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p.room_id,(p_ctx).actor_scope_digest,'projection.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'projection_revoked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'projection_revoked',p_projection_id,p.lifecycle_version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_response_revoke(p_ctx forme_r4.mutation_context_v1,p_response_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE x forme_r4.responses%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO x FROM forme_r4.responses WHERE response_id=p_response_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=x.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='response.revoke' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM x.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_response_id,x.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF x.state<>'available' THEN RETURN ROW(409::smallint,'terminal_state',p_response_id,x.state_version,NULL,jsonb_build_object('code','terminal_state'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.responses SET state='response_revoked',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE response_id=p_response_id;
  INSERT INTO forme_r4.response_lifecycle_events VALUES(('event_response_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_response_id,x.interaction_id,x.room_id,'available','response_revoked',x.state_version+1,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_response_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','response_revoke_result.v1','responseState','response_revoked','receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','response.revoke','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_response_id,'targetVersion',x.state_version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','response_revoked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',x.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'response.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_response_id,x.state_version+1,'terminal','response_revoked',jsonb_build_object('code','response_revoked'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(x.room_id,(p_ctx).actor_scope_digest,'response.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'response_revoked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'response_revoked',p_response_id,x.state_version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_grant_revoke(p_ctx forme_r4.mutation_context_v1,p_grant_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE g forme_r4.grants%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO g FROM forme_r4.grants WHERE grant_id=p_grant_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=g.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='grant.revoke' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM g.version THEN RETURN ROW(409::smallint,'version_conflict',p_grant_id,g.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF g.state IN ('revoked','replaced','expired','invalidated') THEN RETURN ROW(409::smallint,'terminal_state',p_grant_id,g.version,NULL,jsonb_build_object('code','terminal_state'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.grants SET state='revoked',version=version+1 WHERE grant_id=p_grant_id;
  receipt:=('receipt_grant_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('grant',jsonb_build_object('schemaVersion','grant.v1','grantId',p_grant_id,'roomId',g.room_id,'projectionId',g.projection_id,'reentryChainId',g.reentry_chain_id,'presetId',g.preset_id,'secret','REDACTED','state','revoked','issuedAt',to_char(g.issued_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(g.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptedCount',g.accepted_count,'acceptedQuota',g.accepted_quota,'agentDerivationAllowed',g.agent_derivation_allowed,'version',g.version+1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','grant.revoke','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_grant_id,'targetVersion',g.version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','grant_revoked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',g.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'grant.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_grant_id,g.version+1,'terminal','grant_revoked',jsonb_build_object('code','grant_revoked'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(g.room_id,(p_ctx).actor_scope_digest,'grant.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'grant_revoked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'grant_revoked',p_grant_id,g.version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_grant_offer_issue(
  p_ctx forme_r4.mutation_context_v1,p_offer_id forme_r4.r4_id,
  p_source_interaction_id forme_r4.r4_id,p_target_room_id forme_r4.r4_id,
  p_target_projection_id forme_r4.r4_id,p_preset_id forme_r4.grant_preset_id_d,
  p_acceptance_expires_at timestamptz(3),p_offered_grant_expires_at timestamptz(3))
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR (p_ctx).expected_object_version IS NOT NULL OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_source_interaction_id FOR UPDATE;
  IF NOT FOUND OR i.room_id<>p_target_room_id OR i.projection_id<>p_target_projection_id OR i.state<>'response_ready' OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms r JOIN forme_r4.projections p ON p.projection_id=r.current_projection_id WHERE r.room_id=p_target_room_id AND r.room_kind='third_place_public' AND r.status='active' AND p.projection_id=p_target_projection_id AND p.current) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='grant_offer.issue' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF p_acceptance_expires_at<=committed OR p_acceptance_expires_at>p_offered_grant_expires_at OR p_offered_grant_expires_at>committed+interval '30 days' THEN RETURN ROW(422::smallint,'expiry_invalid',p_offer_id,NULL,NULL,jsonb_build_object('code','expiry_invalid'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.grant_offers(offer_id,schema_version,source_interaction_id,target_room_id,target_projection_id,preset_id,state,issued_at,acceptance_expires_at,offered_grant_expires_at,version,canonical_object_hash)
    VALUES(p_offer_id,'grant_offer.v1',p_source_interaction_id,p_target_room_id,p_target_projection_id,p_preset_id,'issued',committed,p_acceptance_expires_at,p_offered_grant_expires_at,1,(p_ctx).canonical_request_hash);
  receipt:=('receipt_offer_issue_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('offer',jsonb_build_object('schemaVersion','grant_offer.v1','offerId',p_offer_id,'sourceInteractionId',p_source_interaction_id,'targetRoomId',p_target_room_id,'targetProjectionId',p_target_projection_id,'presetId',p_preset_id,'state','issued','issuedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptanceExpiresAt',to_char(p_acceptance_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'offeredGrantExpiresAt',to_char(p_offered_grant_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptedGrantId',NULL,'version',1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','grant_offer.issue','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_offer_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','grant_offer_issued'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_target_room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'grant_offer.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_offer_id,1,'committed','grant_offer_issued',jsonb_build_object('code','grant_offer_issued'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p_target_room_id,(p_ctx).actor_scope_digest,'grant_offer.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'grant_offer_issued','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'grant_offer_issued',p_offer_id,1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_grant_offer_revoke(p_ctx forme_r4.mutation_context_v1,p_offer_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE g forme_r4.grant_offers%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO g FROM forme_r4.grant_offers WHERE offer_id=p_offer_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=g.target_room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='grant_offer.revoke' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM g.version THEN RETURN ROW(409::smallint,'version_conflict',p_offer_id,g.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF g.state<>'issued' THEN RETURN ROW(409::smallint,'offer_unavailable',p_offer_id,g.version,NULL,jsonb_build_object('code','offer_unavailable'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.grant_offers SET state='owner_revoked',version=version+1 WHERE offer_id=p_offer_id;
  receipt:=('receipt_offer_revoke_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('offer',jsonb_build_object('schemaVersion','grant_offer.v1','offerId',p_offer_id,'sourceInteractionId',g.source_interaction_id,'targetRoomId',g.target_room_id,'targetProjectionId',g.target_projection_id,'presetId',g.preset_id,'state','owner_revoked','issuedAt',to_char(g.issued_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptanceExpiresAt',to_char(g.acceptance_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'offeredGrantExpiresAt',to_char(g.offered_grant_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'acceptedGrantId',g.accepted_grant_id,'version',g.version+1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','grant_offer.revoke','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_offer_id,'targetVersion',g.version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','grant_offer_revoked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',g.target_room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'grant_offer.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_offer_id,g.version+1,'terminal','grant_offer_revoked',jsonb_build_object('code','grant_offer_revoked'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(g.target_room_id,(p_ctx).actor_scope_digest,'grant_offer.revoke',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'grant_offer_revoked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'grant_offer_revoked',p_offer_id,g.version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_interaction_close(p_ctx forme_r4.mutation_context_v1,p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'controller' OR (p_ctx).actor_subject_id<>'subject_gatebcorecontroller0001' OR NOT EXISTS (SELECT 1 FROM forme_r4.actor_roles WHERE subject_id=(p_ctx).actor_subject_id AND role='controller' AND revoked_at IS NULL) THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=i.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='interaction.close' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF i.state NOT IN ('accepted','seen_locally','preparing') OR EXISTS (SELECT 1 FROM forme_r4.responses WHERE interaction_id=p_interaction_id) THEN RETURN ROW(409::smallint,'interaction_not_closable',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','interaction_not_closable'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.interactions SET state='closed_without_response',state_version=state_version+1,body_readable=false,terminal_at=committed WHERE interaction_id=p_interaction_id;
  INSERT INTO forme_r4.interaction_lifecycle_events VALUES(('event_interaction_close_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_interaction_id,i.room_id,i.state,'closed_without_response',i.state_version+1,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).canonical_request_hash,committed);
  receipt:=('receipt_interaction_close_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','interaction_close_result.v1','state','closed_without_response','receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','interaction.close','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_interaction_id,'targetVersion',i.state_version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','interaction_closed'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,(p_ctx).actor_subject_id,(p_ctx).actor_scope_digest,'interaction.close',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_interaction_id,i.state_version+1,'terminal','interaction_closed',jsonb_build_object('code','interaction_closed'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'interaction.close',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'interaction_closed','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'interaction_closed',p_interaction_id,i.state_version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_room_operator_sync(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest,p_room_id forme_r4.r4_id,p_after_sequence bigint)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE r forme_r4.rooms%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR (p_ctx).expected_object_version IS NOT NULL OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=p_room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO r FROM forme_r4.rooms WHERE room_id=p_room_id AND room_kind='third_place_public';
  IF NOT FOUND OR p_after_sequence<0 OR p_after_sequence>r.event_high_water THEN RETURN ROW(409::smallint,'cursor_invalid',p_room_id,r.event_high_water,NULL,jsonb_build_object('code','cursor_invalid'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room_operator.sync' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  receipt:=('receipt_operator_sync_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  SELECT jsonb_build_object('schemaVersion','room_event_batch.v1','roomId',p_room_id,'afterSequence',p_after_sequence,'highWaterSequence',r.event_high_water,'events',COALESCE(jsonb_agg(jsonb_build_object('schemaVersion','room_event.v1','eventId',e.event_id,'roomId',e.room_id,'sequence',e.sequence,'objectType',e.object_type,'objectId',e.object_id,'eventType',e.event_type,'objectVersion',e.object_version,'payloadHash',e.payload_hash,'committedAt',to_char(e.committed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyAvailable',e.body_available,'reconciliationSnapshot',e.reconciliation_snapshot) ORDER BY e.sequence),'[]'::jsonb),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.sync','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_room_id,'targetVersion',GREATEST(r.event_high_water,1),'status','no_op','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','room_events_synced')) INTO body FROM forme_r4.room_event_stream e WHERE e.room_id=p_room_id AND e.sequence>p_after_sequence;
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.sync',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_room_id,GREATEST(r.event_high_water,1),'no_op','room_events_synced',jsonb_build_object('code','room_events_synced','highWater',r.event_high_water),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p_room_id,(p_ctx).actor_scope_digest,'room_operator.sync',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'room_events_synced','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'room_events_synced',p_room_id,GREATEST(r.event_high_water,1),receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_room_operator_pull(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed FOR UPDATE) OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=i.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.pull' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF i.state='accepted' THEN UPDATE forme_r4.interactions SET state='seen_locally',state_version=state_version+1 WHERE interaction_id=p_interaction_id; ELSE RETURN ROW(409::smallint,'interaction_not_pullable',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','interaction_not_pullable'))::forme_r4.api_result_v1; END IF;
  receipt:=('receipt_operator_pull_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','room_operator_pull_result.v1','interaction',jsonb_build_object('schemaVersion','interaction.v1','interactionId',i.interaction_id,'roomId',i.room_id,'projectionId',i.projection_id,'originProjectionHash',i.origin_projection_hash,'originStateAtAcceptance',i.origin_state_at_acceptance,'interactionType',i.interaction_type,'requestText','[synthetic encrypted request]','guestCapsule',NULL,'consent',i.consent,'consentEnvelope',i.consent_envelope,'acceptedAt',to_char(i.accepted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(i.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'replyCapabilityDigest',i.reply_capability_digest,'deleteCapabilityDigest',i.delete_capability_digest,'state','seen_locally','stateVersion',i.state_version+1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.pull','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_interaction_id,'targetVersion',i.state_version+1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','interaction_pulled'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.pull',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_interaction_id,i.state_version+1,'committed','interaction_pulled',jsonb_build_object('code','interaction_pulled'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.pull',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'interaction_pulled','room_operator_pull',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'interaction_pulled',p_interaction_id,i.state_version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_fresh_cycle_reserve(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id,p_start_authorization_hash forme_r4.sha256_digest,p_session_envelope_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; existing forme_r4.fresh_cycle_reservations%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=i.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.cycle.reserve' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF i.state NOT IN ('seen_locally','preparing') THEN RETURN ROW(409::smallint,'interaction_not_reservable',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','interaction_not_reservable'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO existing FROM forme_r4.fresh_cycle_reservations WHERE interaction_id=p_interaction_id AND state IN ('reserved','dispatch_committed') FOR UPDATE;
  IF FOUND THEN RETURN ROW(409::smallint,'cycle_already_reserved',existing.reservation_id,existing.version,NULL,jsonb_build_object('code','cycle_already_reserved'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.fresh_cycle_reservations VALUES(p_reservation_id,'fresh_cycle_reservation.v1',p_interaction_id,p_start_authorization_hash,p_session_envelope_hash,'reserved',(p_ctx).idempotency_key,committed,NULL,NULL,1,(p_ctx).canonical_request_hash);
  UPDATE forme_r4.interactions SET state='preparing',state_version=state_version+1 WHERE interaction_id=p_interaction_id;
  receipt:=('receipt_cycle_reserve_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('reservation',jsonb_build_object('schemaVersion','fresh_cycle_reservation.v1','reservationId',p_reservation_id,'interactionId',p_interaction_id,'startAuthorizationHash',p_start_authorization_hash,'sessionEnvelopeHash',p_session_envelope_hash,'state','reserved','reservedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.cycle.reserve','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_reservation_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','cycle_reserved'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.cycle.reserve',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_reservation_id,1,'committed','cycle_reserved',jsonb_build_object('code','cycle_reserved'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.cycle.reserve',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'cycle_reserved','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'cycle_reserved',p_reservation_id,1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_fresh_cycle_recover(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id,p_start_authorization_hash forme_r4.sha256_digest,p_session_envelope_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE c forme_r4.fresh_cycle_reservations%ROWTYPE; i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO c FROM forme_r4.fresh_cycle_reservations WHERE interaction_id=p_interaction_id AND state IN ('reserved','dispatch_committed') FOR UPDATE;
  IF NOT FOUND OR c.reservation_id<>p_reservation_id OR c.start_authorization_hash<>p_start_authorization_hash OR c.session_envelope_hash<>p_session_envelope_hash THEN RETURN ROW(409::smallint,'cycle_recovery_mismatch',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','cycle_recovery_mismatch'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.cycle.recover' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM c.version THEN RETURN ROW(409::smallint,'version_conflict',p_reservation_id,c.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  receipt:=('receipt_cycle_recover_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('reservation',jsonb_build_object('schemaVersion','fresh_cycle_reservation.v1','reservationId',c.reservation_id,'interactionId',c.interaction_id,'startAuthorizationHash',c.start_authorization_hash,'sessionEnvelopeHash',c.session_envelope_hash,'state',c.state,'reservedAt',to_char(c.reserved_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',c.version),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.cycle.recover','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',c.reservation_id,'targetVersion',c.version,'status','no_op','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','cycle_recovered'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.cycle.recover',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,c.reservation_id,c.version,'no_op','cycle_recovered',jsonb_build_object('code','cycle_recovered'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.cycle.recover',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'cycle_recovered','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'cycle_recovered',c.reservation_id,c.version,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_fresh_cycle_abandon_zero_dispatch(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id,p_start_authorization_hash forme_r4.sha256_digest,p_session_envelope_hash forme_r4.sha256_digest,p_transport_journal_dispatches integer)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE c forme_r4.fresh_cycle_reservations%ROWTYPE; i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR p_transport_journal_dispatches<>0 THEN RETURN ROW(409::smallint,'zero_dispatch_required',p_reservation_id,NULL,NULL,jsonb_build_object('code','zero_dispatch_required'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO c FROM forme_r4.fresh_cycle_reservations WHERE reservation_id=p_reservation_id AND interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR c.start_authorization_hash<>p_start_authorization_hash OR c.session_envelope_hash<>p_session_envelope_hash THEN RETURN ROW(409::smallint,'cycle_recovery_mismatch',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','cycle_recovery_mismatch'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.cycle.abandon' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM c.version THEN RETURN ROW(409::smallint,'version_conflict',p_reservation_id,c.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF c.state<>'reserved' OR EXISTS (SELECT 1 FROM forme_r4.dispatch_permits WHERE reservation_id=p_reservation_id) THEN RETURN ROW(409::smallint,'dispatch_already_committed',p_reservation_id,c.version,NULL,jsonb_build_object('code','dispatch_already_committed'))::forme_r4.api_result_v1; END IF;
  UPDATE forme_r4.fresh_cycle_reservations SET state='released_zero_dispatch',released_at=committed,version=version+1 WHERE reservation_id=p_reservation_id;
  UPDATE forme_r4.interactions SET state='seen_locally',state_version=state_version+1 WHERE interaction_id=p_interaction_id AND state='preparing';
  receipt:=('receipt_cycle_abandon_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('reservation',jsonb_build_object('schemaVersion','fresh_cycle_reservation.v1','reservationId',c.reservation_id,'interactionId',c.interaction_id,'startAuthorizationHash',c.start_authorization_hash,'sessionEnvelopeHash',c.session_envelope_hash,'state','released_zero_dispatch','reservedAt',to_char(c.reserved_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',c.version+1),'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.cycle.abandon','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',c.reservation_id,'targetVersion',c.version+1,'status','terminal','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','cycle_abandoned_zero_dispatch'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.cycle.abandon',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,c.reservation_id,c.version+1,'terminal','cycle_abandoned_zero_dispatch',jsonb_build_object('code','cycle_abandoned_zero_dispatch'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.cycle.abandon',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'cycle_abandoned_zero_dispatch','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'cycle_abandoned_zero_dispatch',c.reservation_id,c.version+1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_dispatch_permit_issue(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,
  p_interaction_id forme_r4.r4_id,p_reservation_id forme_r4.r4_id,p_session_envelope_hash forme_r4.sha256_digest,
  p_start_authorization_hash forme_r4.sha256_digest,p_provider text,p_model_id forme_r4.canonical_text,
  p_payload_hash forme_r4.sha256_digest,p_dispatch_ordinal smallint,p_permit_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE c forme_r4.fresh_cycle_reservations%ROWTYPE; i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR p_provider<>'OpenAI' OR p_dispatch_ordinal NOT BETWEEN 1 AND 3 THEN RETURN ROW(422::smallint,'dispatch_invalid',p_permit_id,NULL,NULL,jsonb_build_object('code','dispatch_invalid'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO c FROM forme_r4.fresh_cycle_reservations WHERE reservation_id=p_reservation_id AND interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR c.start_authorization_hash<>p_start_authorization_hash OR c.session_envelope_hash<>p_session_envelope_hash THEN RETURN ROW(409::smallint,'cycle_recovery_mismatch',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','cycle_recovery_mismatch'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.dispatch.issue' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM c.version THEN RETURN ROW(409::smallint,'version_conflict',p_reservation_id,c.version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF c.state<>'reserved' OR EXISTS (SELECT 1 FROM forme_r4.dispatch_permits WHERE reservation_id=p_reservation_id AND dispatch_ordinal=p_dispatch_ordinal) THEN RETURN ROW(409::smallint,'dispatch_unavailable',p_reservation_id,c.version,NULL,jsonb_build_object('code','dispatch_unavailable'))::forme_r4.api_result_v1; END IF;
  INSERT INTO forme_r4.dispatch_permits VALUES(p_permit_id,'dispatch_permit.v1',p_interaction_id,p_reservation_id,p_session_envelope_hash,p_start_authorization_hash,p_provider,p_model_id,p_payload_hash,p_dispatch_ordinal,(p_ctx).idempotency_key,committed,committed+interval '30 seconds',NULL,(p_ctx).canonical_request_hash);
  UPDATE forme_r4.fresh_cycle_reservations SET state='dispatch_committed',first_dispatch_committed_at=committed,version=version+1 WHERE reservation_id=p_reservation_id;
  receipt:=('receipt_dispatch_issue_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('permit',jsonb_build_object('schemaVersion','dispatch_permit.v1','permitId',p_permit_id,'interactionId',p_interaction_id,'reservationId',p_reservation_id,'provider',p_provider,'modelId',p_model_id,'payloadHash',p_payload_hash,'dispatchOrdinal',p_dispatch_ordinal,'issuedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char((committed+interval '30 seconds') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'syntheticTransport',true,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.dispatch.issue','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_permit_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','dispatch_permit_issued'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.dispatch.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_permit_id,1,'committed','dispatch_permit_issued',jsonb_build_object('code','dispatch_permit_issued'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.dispatch.issue',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'dispatch_permit_issued','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'dispatch_permit_issued',p_permit_id,1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_room_event_ack(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,
  p_room_id forme_r4.r4_id,p_event_id forme_r4.r4_id,p_sequence bigint,p_event_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE replay record; receipt forme_r4.r4_id; body jsonb; last_ack bigint; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR (p_ctx).expected_object_version IS NOT NULL OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=p_room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=p_room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  PERFORM 1 FROM forme_r4.room_event_stream WHERE room_id=p_room_id AND event_id=p_event_id AND sequence=p_sequence AND payload_hash=p_event_hash;
  IF NOT FOUND THEN RETURN ROW(409::smallint,'event_mismatch',p_event_id,NULL,NULL,jsonb_build_object('code','event_mismatch'))::forme_r4.api_result_v1; END IF;
  SELECT i.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records i JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE i.actor_scope_digest=(p_ctx).actor_scope_digest AND i.action='room_operator.ack' AND i.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  SELECT COALESCE(max(target_version),0) INTO last_ack FROM forme_r4.operation_receipts WHERE room_id=p_room_id AND actor_scope_digest=(p_ctx).actor_scope_digest AND action='room_operator.ack';
  IF p_sequence<=last_ack THEN RETURN ROW(200::smallint,'event_already_acked',p_event_id,p_sequence,NULL,jsonb_build_object('schemaVersion','room_event_ack_receipt.v1','roomId',p_room_id,'eventId',p_event_id,'sequence',p_sequence,'highWaterSequence',last_ack,'status','no_op'))::forme_r4.api_result_v1; END IF;
  IF p_sequence<>last_ack+1 THEN RETURN ROW(409::smallint,'ack_out_of_order',p_event_id,p_sequence,NULL,jsonb_build_object('code','ack_out_of_order','expectedSequence',last_ack+1))::forme_r4.api_result_v1; END IF;
  receipt:=('receipt_event_ack_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','room_event_ack_receipt.v1','roomId',p_room_id,'eventId',p_event_id,'sequence',p_sequence,'highWaterSequence',p_sequence,'status','committed','receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.ack','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_event_id,'targetVersion',p_sequence,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','event_acked'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',p_room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.ack',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_event_id,p_sequence,'committed','event_acked',jsonb_build_object('code','event_acked','highWater',p_sequence),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(p_room_id,(p_ctx).actor_scope_digest,'room_operator.ack',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'event_acked','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'event_acked',p_event_id,p_sequence,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_response_deliver(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,
  p_interaction_id forme_r4.r4_id,p_response_id forme_r4.r4_id,p_body_ciphertext forme_r4.encrypted_field_v1,
  p_body_plaintext_bytes integer,p_body_content_hash forme_r4.sha256_digest,p_candidate_hash forme_r4.sha256_digest,
  p_publication_payload_hash forme_r4.sha256_digest,p_origin_state forme_r4.projection_owner_state_d,
  p_source_disclosure forme_r4.response_source_disclosure_d,p_local_basis_attestation_id forme_r4.r4_id,
  p_publication_attestation jsonb)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; publication_receipt forme_r4.r4_id; approval_id forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp(); expiry timestamptz(3); next_sequence bigint;
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' THEN RETURN ROW(403::smallint,'forbidden',NULL,NULL,NULL,jsonb_build_object('code','forbidden'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed FOR UPDATE) OR NOT EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_id=i.room_id AND room_kind='third_place_public') THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.response.deliver' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  IF i.state NOT IN ('seen_locally','preparing') OR EXISTS (SELECT 1 FROM forme_r4.responses WHERE interaction_id=p_interaction_id) OR p_origin_state='revoked' THEN RETURN ROW(409::smallint,'response_unavailable',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','response_unavailable'))::forme_r4.api_result_v1; END IF;
  IF jsonb_typeof(p_publication_attestation)<>'object' OR p_publication_attestation->>'schemaVersion'<>'publication_attestation.v1' OR p_publication_attestation->>'artifactClass'<>'response' OR p_publication_attestation->>'artifactId'<>p_response_id OR p_publication_attestation->>'roomId'<>i.room_id OR p_publication_attestation->>'bindingId'<>p_binding_id OR p_publication_attestation->>'artifactHash'<>p_publication_payload_hash THEN RETURN ROW(422::smallint,'attestation_invalid',p_response_id,NULL,NULL,jsonb_build_object('code','attestation_invalid'))::forme_r4.api_result_v1; END IF;
  approval_id:=(p_publication_attestation->>'attestationId')::forme_r4.r4_id;
  publication_receipt:=('publication_receipt_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  expiry:=LEAST(i.expires_at,committed+interval '7 days',(p_publication_attestation->>'expiresAt')::timestamptz);
  INSERT INTO forme_r4.responses(response_id,schema_version,interaction_id,room_id,projection_id,body_ciphertext,body_plaintext_bytes,body_content_hash,candidate_hash,publication_payload_hash,origin_state_at_publication,source_disclosure_class,local_basis_attestation_id,approval_attestation_id,publication_receipt_id,published_at,expires_at,state,state_version,body_readable,canonical_object_hash)
    VALUES(p_response_id,'response.v1',p_interaction_id,i.room_id,i.projection_id,p_body_ciphertext,p_body_plaintext_bytes,p_body_content_hash,p_candidate_hash,p_publication_payload_hash,p_origin_state,p_source_disclosure,p_local_basis_attestation_id,approval_id,publication_receipt,committed,expiry,'available',1,true,(p_ctx).canonical_request_hash);
  UPDATE forme_r4.interactions SET state='response_ready',state_version=state_version+1 WHERE interaction_id=p_interaction_id;
  INSERT INTO forme_r4.response_lifecycle_events VALUES(('event_response_deliver_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,p_response_id,p_interaction_id,i.room_id,NULL,'available',1,(p_ctx).actor_class,NULL,(p_ctx).canonical_request_hash,committed);
  SELECT event_high_water+1 INTO next_sequence FROM forme_r4.rooms WHERE room_id=i.room_id;
  INSERT INTO forme_r4.room_event_stream VALUES(i.room_id,next_sequence,('streamevent_response_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id,'room_event.v1','response',p_response_id,'response.delivered',1,p_publication_payload_hash,committed,true,false,NULL);
  receipt:=('receipt_response_deliver_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('responseId',p_response_id,'interactionVersion',i.state_version+1,'syntheticNotice',true,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.response.deliver','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_response_id,'targetVersion',1,'status','committed','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','response_delivered'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.response.deliver',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_response_id,1,'committed','response_delivered',jsonb_build_object('code','response_delivered'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.response.deliver',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,201,'response_delivered','publication_current',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(201::smallint,'response_delivered',p_response_id,1,receipt,body)::forme_r4.api_result_v1;
END $function$;

CREATE FUNCTION forme_r4.tx_local_purge_receipt(
  p_ctx forme_r4.mutation_context_v1,p_binding_id forme_r4.r4_id,p_binding_digest forme_r4.sha256_digest,
  p_interaction_id forme_r4.r4_id,p_local_bytes_absent boolean)
RETURNS forme_r4.api_result_v1 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, forme_r4 AS $function$
DECLARE i forme_r4.interactions%ROWTYPE; replay record; receipt forme_r4.r4_id; body jsonb; committed timestamptz(3):=transaction_timestamp();
BEGIN
  IF (p_ctx).actor_class<>'room_operator_v1' OR NOT p_local_bytes_absent THEN RETURN ROW(422::smallint,'local_purge_unproved',p_interaction_id,NULL,NULL,jsonb_build_object('code','local_purge_unproved'))::forme_r4.api_result_v1; END IF;
  SELECT * INTO i FROM forme_r4.interactions WHERE interaction_id=p_interaction_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM forme_r4.room_bindings WHERE binding_id=p_binding_id AND room_id=i.room_id AND secret_digest=p_binding_digest AND state='active' AND expires_at>committed) THEN RETURN ROW(404::smallint,'not_found',NULL,NULL,NULL,jsonb_build_object('code','not_found'))::forme_r4.api_result_v1; END IF;
  SELECT x.*,o.target_id,o.target_version INTO replay FROM forme_r4.idempotency_records x JOIN forme_r4.operation_receipts o USING(receipt_id) WHERE x.actor_scope_digest=(p_ctx).actor_scope_digest AND x.action='room_operator.local_purge.receipt' AND x.idempotency_key=(p_ctx).idempotency_key;
  IF FOUND THEN IF replay.canonical_request_hash<>(p_ctx).canonical_request_hash THEN RETURN ROW(409::smallint,'idempotency_conflict',NULL,NULL,NULL,jsonb_build_object('code','idempotency_conflict'))::forme_r4.api_result_v1; END IF; RETURN ROW(replay.http_status,replay.result_code,replay.target_id,replay.target_version,replay.receipt_id,replay.body_free_result)::forme_r4.api_result_v1; END IF;
  IF (p_ctx).expected_object_version IS DISTINCT FROM i.state_version THEN RETURN ROW(409::smallint,'version_conflict',p_interaction_id,i.state_version,NULL,jsonb_build_object('code','version_conflict'))::forme_r4.api_result_v1; END IF;
  receipt:=('receipt_local_purge_'||replace((p_ctx).correlation_id::text,'-',''))::forme_r4.r4_id;
  body:=jsonb_build_object('schemaVersion','room_operator_local_purge_receipt_result.v1','localBytesAbsent',true,'receipt',jsonb_build_object('schemaVersion','operation_receipt.v1','receiptId',receipt,'actorClass',(p_ctx).actor_class,'action','room_operator.local_purge.receipt','idempotencyKey',(p_ctx).idempotency_key,'canonicalRequestHash',(p_ctx).canonical_request_hash,'targetId',p_interaction_id,'targetVersion',i.state_version,'status','no_op','committedAt',to_char(committed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bodyFreeCode','local_purge_recorded'));
  INSERT INTO forme_r4.operation_receipts VALUES(receipt,'operation_receipt.v1',i.room_id,(p_ctx).actor_class,NULL,(p_ctx).actor_scope_digest,'room_operator.local_purge.receipt',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,p_interaction_id,i.state_version,'no_op','local_purge_recorded',jsonb_build_object('code','local_purge_recorded'),committed,committed+interval '37 days');
  INSERT INTO forme_r4.idempotency_records(room_id,actor_scope_digest,action,idempotency_key,canonical_request_hash,http_status,result_code,recovery_kind,body_free_result,receipt_id,created_at,retention_expires_at) VALUES(i.room_id,(p_ctx).actor_scope_digest,'room_operator.local_purge.receipt',(p_ctx).idempotency_key,(p_ctx).canonical_request_hash,200,'local_purge_recorded','body_free',body,receipt,committed,committed+interval '37 days');
  RETURN ROW(200::smallint,'local_purge_recorded',p_interaction_id,i.state_version,receipt,body)::forme_r4.api_result_v1;
END $function$;

REVOKE ALL ON ALL TABLES IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA forme_r4 FROM PUBLIC;

GRANT USAGE ON TYPE
  forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.idempotency_key,
  forme_r4.canonical_text,forme_r4.encrypted_field_v1,
  forme_r4.actor_subject_state_d,forme_r4.actor_role_kind_d,
  forme_r4.entity_state_d,forme_r4.third_place_state_d,
  forme_r4.third_place_event_kind_d,forme_r4.room_kind_d,
  forme_r4.interaction_mode_d,forme_r4.room_status_d,
  forme_r4.room_lifecycle_event_kind_d,forme_r4.projection_owner_state_d,
  forme_r4.curation_state_d,forme_r4.curation_event_kind_d,
  forme_r4.capability_state_d,forme_r4.grant_preset_id_d,
  forme_r4.grant_offer_state_d,forme_r4.direct_invite_state_d,
  forme_r4.capability_class_d,forme_r4.binding_state_d,
  forme_r4.pairing_state_d,forme_r4.interaction_type_d,
  forme_r4.guest_capsule_level_d,forme_r4.interaction_consent_d,
  forme_r4.interaction_state_d,forme_r4.fresh_cycle_state_d,
  forme_r4.response_state_d,forme_r4.response_source_disclosure_d,
  forme_r4.notification_endpoint_state_d,forme_r4.notification_challenge_state_d,
  forme_r4.notification_semantic_kind_d,forme_r4.notification_notice_state_d,
  forme_r4.notification_attempt_state_d,forme_r4.room_event_object_type_d,
  forme_r4.operation_status_d,forme_r4.idempotency_recovery_kind_d,
  forme_r4.retention_target_kind_d,forme_r4.retention_job_state_d,
  forme_r4.purge_outcome_d,forme_r4.operator_incident_code_d,
  forme_r4.api_actor_class_d,forme_r4.mutation_context_v1,
  forme_r4.api_result_v1,forme_r4.notification_claim_v1
TO forme_r4_app;
GRANT USAGE ON TYPE forme_r4.r4_id,forme_r4.sha256_digest,
  forme_r4.canonical_text,forme_r4.api_actor_class_d,forme_r4.api_result_v1
TO forme_r4_audit;

GRANT EXECUTE ON FUNCTION forme_r4.api_third_place_list() TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_projection_read(forme_r4.r4_id,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_public_encounter_issue(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_interaction_create(forme_r4.mutation_context_v1,forme_r4.capability_class_d,forme_r4.r4_id,forme_r4.r4_id,forme_r4.r4_id,forme_r4.interaction_type_d,forme_r4.encrypted_field_v1,integer,forme_r4.sha256_digest,forme_r4.encrypted_field_v1,integer,forme_r4.sha256_digest,forme_r4.guest_capsule_level_d,forme_r4.interaction_consent_d,jsonb,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_interaction_read(forme_r4.r4_id,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_interaction_delete(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_grant_offer_accept(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_pair_exchange(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.sha256_digest,bytea,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_control_status(forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_control_interaction_read(forme_r4.r4_id,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_create(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id,forme_r4.room_kind_d,forme_r4.r4_id,forme_r4.encrypted_field_v1) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_pair_issue(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.encrypted_field_v1) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_binding_revoke(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_projection_revoke(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_response_revoke(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_grant_revoke(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_grant_offer_issue(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id,forme_r4.r4_id,forme_r4.r4_id,forme_r4.grant_preset_id_d,timestamptz,timestamptz) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_grant_offer_revoke(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_interaction_close(forme_r4.mutation_context_v1,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_curation_admit(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_curation_unlist(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_room_operator_status(forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_operator_sync(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,bigint) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_operator_pull(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_fresh_cycle_reserve(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_fresh_cycle_recover(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_fresh_cycle_abandon_zero_dispatch(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest,integer) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_dispatch_permit_issue(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.sha256_digest,text,forme_r4.canonical_text,forme_r4.sha256_digest,smallint,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_room_event_ack(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,bigint,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_projection_deliver(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.r4_id,forme_r4.encrypted_field_v1,integer,integer,integer,forme_r4.r4_id,forme_r4.sha256_digest,jsonb) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_response_deliver(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,forme_r4.r4_id,forme_r4.encrypted_field_v1,integer,forme_r4.sha256_digest,forme_r4.sha256_digest,forme_r4.sha256_digest,forme_r4.projection_owner_state_d,forme_r4.response_source_disclosure_d,forme_r4.r4_id,jsonb) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.tx_local_purge_receipt(forme_r4.mutation_context_v1,forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id,boolean) TO forme_r4_app;

GRANT EXECUTE ON FUNCTION forme_r4.tx_gate_b_core_basis_install(forme_r4.mutation_context_v1,forme_r4.sha256_digest) TO forme_r4_migrate;
GRANT SELECT ON forme_r4.audit_schema_migrations,forme_r4.audit_room_lifecycle,
  forme_r4.audit_projection_lifecycle,forme_r4.audit_curation_events,
  forme_r4.audit_capability_events,forme_r4.audit_interaction_lifecycle,
  forme_r4.audit_response_lifecycle,forme_r4.audit_operation_receipts,
  forme_r4.audit_room_event_high_water,forme_r4.audit_purge_health,
  forme_r4.audit_operator_incidents TO forme_r4_audit;

INSERT INTO forme_r4.schema_migrations(
  version,migration_name,migration_sha256,technical_packet_sha256,
  scope_brief_sha256,construction_packet_sha256,core_basis_sha256,
  execution_manifest_sha256,applied_by,postgres_version_num,rollback_compatible)
VALUES(1,'r4_gate_b_core_presence_v1',:'migration_sha',:'technical_packet_sha',
  :'scope_brief_sha',:'construction_packet_sha',:'core_basis_sha',
  :'execution_manifest_sha',session_user,current_setting('server_version_num')::integer,true);

RESET ROLE;
COMMIT;
\else
DO $forme_r4_core_reapply$
DECLARE row_count integer;
BEGIN
  SELECT count(*) INTO row_count FROM forme_r4.schema_migrations
  WHERE version=1 AND migration_sha256=current_setting('forme_r4.migration_sha')
    AND technical_packet_sha256=current_setting('forme_r4.technical_packet_sha')
    AND scope_brief_sha256=current_setting('forme_r4.scope_brief_sha')
    AND construction_packet_sha256=current_setting('forme_r4.construction_packet_sha')
    AND core_basis_sha256=current_setting('forme_r4.core_basis_sha')
    AND execution_manifest_sha256=current_setting('forme_r4.execution_manifest_sha');
  IF row_count<>1 THEN RAISE EXCEPTION USING ERRCODE='P4A04',MESSAGE='migration_target_invalid'; END IF;
END
$forme_r4_core_reapply$;
\endif
