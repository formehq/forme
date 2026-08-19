\set ON_ERROR_STOP on

-- R4 Gate B disposable presence schema. The externally approved runner must
-- pass packet_sha, manifest_sha, and migration_sha as sha256:... psql values.
\if :{?packet_sha}
\else
  \echo R4_GATE_B_PACKET_SHA_REQUIRED
  \quit
\endif
\if :{?manifest_sha}
\else
  \echo R4_GATE_B_MANIFEST_SHA_REQUIRED
  \quit
\endif
\if :{?migration_sha}
\else
  \echo R4_GATE_B_MIGRATION_SHA_REQUIRED
  \quit
\endif

SET forme_r4.packet_sha TO :'packet_sha';
SET forme_r4.manifest_sha TO :'manifest_sha';
SET forme_r4.migration_sha TO :'migration_sha';

DO $forme_r4_preflight$
BEGIN
  IF current_database() <> 'forme_r4_gate_b'
     OR current_setting('server_version_num')::integer <> 160010
     OR current_user <> 'postgres'
     OR to_regnamespace('forme_r4') IS NULL
     OR current_setting('forme_r4.packet_sha') <> 'sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5'
     OR current_setting('forme_r4.manifest_sha') !~ '^sha256:[0-9a-f]{64}$'
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
REVOKE EXECUTE ON FUNCTION forme_r4.is_encrypted_field_v1(jsonb) FROM PUBLIC;

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
  packet_sha256 forme_r4.sha256_digest NOT NULL,
  manifest_sha256 forme_r4.sha256_digest NOT NULL,
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

CREATE FUNCTION forme_r4.api_unavailable_result()
RETURNS forme_r4.api_result_v1
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, forme_r4
AS $function$
  SELECT ROW(503::smallint,'storage_unavailable',NULL,NULL,NULL,
    jsonb_build_object('code','storage_unavailable'))::forme_r4.api_result_v1
$function$;

CREATE VIEW forme_r4.audit_schema_migrations WITH (security_barrier=true) AS
  SELECT version,migration_name,migration_sha256,packet_sha256,manifest_sha256,applied_at,applied_by,postgres_version_num,rollback_compatible
  FROM forme_r4.schema_migrations;
CREATE VIEW forme_r4.audit_room_lifecycle WITH (security_barrier=true) AS
  SELECT room_id,event_kind,prior_interaction_mode,new_interaction_mode,prior_status,new_status,object_version,committed_at
  FROM forme_r4.room_lifecycle_events;
CREATE VIEW forme_r4.audit_projection_lifecycle WITH (security_barrier=true) AS
  SELECT projection_id,room_id,prior_owner_state,new_owner_state,prior_current,new_current,object_version,committed_at
  FROM forme_r4.projection_lifecycle_events;
CREATE VIEW forme_r4.audit_curation_events WITH (security_barrier=true) AS
  SELECT third_place_id,projection_id,room_id,event_kind,prior_state,new_state,object_version,committed_at
  FROM forme_r4.curation_events;
CREATE VIEW forme_r4.audit_capability_events WITH (security_barrier=true) AS
  SELECT capability_class,capability_id,room_id,projection_id,prior_state,new_state,object_version,committed_at
  FROM forme_r4.capability_events;
CREATE VIEW forme_r4.audit_interaction_lifecycle WITH (security_barrier=true) AS
  SELECT interaction_id,room_id,prior_state,new_state,object_version,committed_at
  FROM forme_r4.interaction_lifecycle_events;
CREATE VIEW forme_r4.audit_response_lifecycle WITH (security_barrier=true) AS
  SELECT response_id,interaction_id,room_id,prior_state,new_state,object_version,committed_at
  FROM forme_r4.response_lifecycle_events;
CREATE VIEW forme_r4.audit_operation_receipts WITH (security_barrier=true) AS
  SELECT receipt_id,room_id,actor_class,action,target_id,target_version,status,body_free_code,committed_at,expires_at
  FROM forme_r4.operation_receipts;
CREATE VIEW forme_r4.audit_room_event_high_water WITH (security_barrier=true) AS
  SELECT room_id,event_high_water,status,version FROM forme_r4.rooms;
CREATE VIEW forme_r4.audit_purge_health WITH (security_barrier=true) AS
  SELECT watermark_name,last_successful_purge_at,last_batch_id,version,updated_at FROM forme_r4.purge_watermarks;
CREATE VIEW forme_r4.audit_operator_incidents WITH (security_barrier=true) AS
  SELECT incident_id,code,room_id,target_kind,target_row_id,opened_at,resolved_at,body_free FROM forme_r4.operator_incidents;

CREATE FUNCTION forme_r4.api_third_place_list()
RETURNS SETOF forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.api_projection_read(
  p_projection_id forme_r4.r4_id,
  p_capability_digest forme_r4.sha256_digest DEFAULT NULL)
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.api_interaction_read(
  p_interaction_id forme_r4.r4_id, p_reply_capability_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.api_control_status(p_subject_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.api_control_interaction_read(
  p_subject_id forme_r4.r4_id, p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.api_room_operator_status(
  p_binding_id forme_r4.r4_id, p_binding_digest forme_r4.sha256_digest,
  p_room_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;

CREATE FUNCTION forme_r4.tx_public_encounter_issue(
  p_ctx forme_r4.mutation_context_v1, p_projection_id forme_r4.r4_id,
  p_encounter_id forme_r4.r4_id, p_secret_digest forme_r4.sha256_digest,
  p_edge_bucket_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_interaction_create(
  p_ctx forme_r4.mutation_context_v1,
  p_submission_class forme_r4.capability_class_d, p_submission_id forme_r4.r4_id,
  p_projection_id forme_r4.r4_id, p_interaction_id forme_r4.r4_id,
  p_interaction_type forme_r4.interaction_type_d,
  p_request_ciphertext forme_r4.encrypted_field_v1, p_request_bytes integer,
  p_request_hash forme_r4.sha256_digest,
  p_guest_capsule_ciphertext forme_r4.encrypted_field_v1,
  p_guest_capsule_bytes integer, p_guest_capsule_hash forme_r4.sha256_digest,
  p_guest_capsule_level forme_r4.guest_capsule_level_d,
  p_consent forme_r4.interaction_consent_d,
  p_consent_envelope jsonb, p_consent_envelope_hash forme_r4.sha256_digest,
  p_reply_capability_id forme_r4.r4_id, p_reply_digest forme_r4.sha256_digest,
  p_delete_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_interaction_delete(
  p_ctx forme_r4.mutation_context_v1, p_interaction_id forme_r4.r4_id,
  p_delete_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_notification_set(
  p_ctx forme_r4.mutation_context_v1, p_interaction_id forme_r4.r4_id,
  p_reply_digest forme_r4.sha256_digest,
  p_address_ciphertext forme_r4.encrypted_field_v1, p_challenge_id forme_r4.r4_id,
  p_code_digest forme_r4.sha256_digest, p_verification_outbox_id forme_r4.r4_id,
  p_target_ciphertext forme_r4.encrypted_field_v1,
  p_verification_code_ciphertext forme_r4.encrypted_field_v1)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_notification_remove(
  p_ctx forme_r4.mutation_context_v1, p_interaction_id forme_r4.r4_id,
  p_reply_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_notification_verify(
  p_ctx forme_r4.mutation_context_v1, p_interaction_id forme_r4.r4_id,
  p_reply_digest forme_r4.sha256_digest, p_code_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_offer_accept(
  p_ctx forme_r4.mutation_context_v1, p_offer_id forme_r4.r4_id,
  p_reply_digest forme_r4.sha256_digest, p_grant_id forme_r4.r4_id,
  p_grant_secret_digest forme_r4.sha256_digest, p_reentry_chain_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_direct_invite_redeem(
  p_ctx forme_r4.mutation_context_v1, p_invite_id forme_r4.r4_id,
  p_invite_digest forme_r4.sha256_digest, p_grant_id forme_r4.r4_id,
  p_grant_secret_digest forme_r4.sha256_digest, p_reentry_chain_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_agent_derivative_mint(
  p_ctx forme_r4.mutation_context_v1,
  p_parent_class forme_r4.capability_class_d, p_parent_id forme_r4.r4_id,
  p_parent_digest forme_r4.sha256_digest, p_derivative_id forme_r4.r4_id,
  p_derivative_digest forme_r4.sha256_digest, p_reply_digest forme_r4.sha256_digest,
  p_delete_digest forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_pair_exchange(
  p_ctx forme_r4.mutation_context_v1, p_pairing_id forme_r4.r4_id,
  p_pairing_code_digest forme_r4.sha256_digest,
  p_client_public_key_hash forme_r4.sha256_digest, p_binding_id forme_r4.r4_id,
  p_binding_secret_digest forme_r4.sha256_digest,
  p_sealed_exchange_envelope bytea, p_sealed_exchange_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;

CREATE FUNCTION forme_r4.tx_room_create(
  p_ctx forme_r4.mutation_context_v1, p_room_id forme_r4.r4_id,
  p_entity_id forme_r4.r4_id, p_room_kind forme_r4.room_kind_d,
  p_home_third_place_id forme_r4.r4_id, p_label_ciphertext forme_r4.encrypted_field_v1)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_pair_issue(
  p_ctx forme_r4.mutation_context_v1, p_room_id forme_r4.r4_id,
  p_pairing_id forme_r4.r4_id, p_pairing_code_digest forme_r4.sha256_digest,
  p_sensitive_recovery_ciphertext forme_r4.encrypted_field_v1)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_binding_revoke(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_mode_set(
  p_ctx forme_r4.mutation_context_v1, p_room_id forme_r4.r4_id,
  p_mode forme_r4.interaction_mode_d)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_retire(
  p_ctx forme_r4.mutation_context_v1, p_room_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_delete(
  p_ctx forme_r4.mutation_context_v1, p_room_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_projection_revoke(
  p_ctx forme_r4.mutation_context_v1, p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_response_revoke(
  p_ctx forme_r4.mutation_context_v1, p_response_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_issue(
  p_ctx forme_r4.mutation_context_v1, p_grant_id forme_r4.r4_id,
  p_room_id forme_r4.r4_id, p_projection_id forme_r4.r4_id,
  p_reentry_chain_id forme_r4.r4_id, p_preset_id forme_r4.grant_preset_id_d,
  p_secret_digest forme_r4.sha256_digest, p_agent_derivation_allowed boolean)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_replace(
  p_ctx forme_r4.mutation_context_v1, p_prior_grant_id forme_r4.r4_id,
  p_new_grant_id forme_r4.r4_id, p_new_secret_digest forme_r4.sha256_digest,
  p_preset_id forme_r4.grant_preset_id_d, p_agent_derivation_allowed boolean)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_revoke(
  p_ctx forme_r4.mutation_context_v1, p_grant_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_offer_issue(
  p_ctx forme_r4.mutation_context_v1, p_offer_id forme_r4.r4_id,
  p_source_interaction_id forme_r4.r4_id, p_target_room_id forme_r4.r4_id,
  p_target_projection_id forme_r4.r4_id, p_preset_id forme_r4.grant_preset_id_d,
  p_acceptance_expires_at timestamptz(3), p_offered_grant_expires_at timestamptz(3))
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_grant_offer_revoke(
  p_ctx forme_r4.mutation_context_v1, p_offer_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_direct_invite_issue(
  p_ctx forme_r4.mutation_context_v1, p_invite_id forme_r4.r4_id,
  p_target_room_id forme_r4.r4_id, p_target_projection_id forme_r4.r4_id,
  p_preset_id forme_r4.grant_preset_id_d, p_invite_digest forme_r4.sha256_digest,
  p_redemption_expires_at timestamptz(3), p_offered_grant_expires_at timestamptz(3))
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_direct_invite_revoke(
  p_ctx forme_r4.mutation_context_v1, p_invite_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_interaction_close(
  p_ctx forme_r4.mutation_context_v1, p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_curation_admit(
  p_ctx forme_r4.mutation_context_v1, p_third_place_id forme_r4.r4_id,
  p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_curation_unlist(
  p_ctx forme_r4.mutation_context_v1, p_third_place_id forme_r4.r4_id,
  p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;

CREATE FUNCTION forme_r4.tx_room_operator_sync(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_room_id forme_r4.r4_id,
  p_after_sequence bigint)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_operator_pull(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_fresh_cycle_reserve(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id, p_start_authorization_hash forme_r4.sha256_digest,
  p_session_envelope_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_fresh_cycle_recover(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id, p_start_authorization_hash forme_r4.sha256_digest,
  p_session_envelope_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_fresh_cycle_abandon_zero_dispatch(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id, p_start_authorization_hash forme_r4.sha256_digest,
  p_session_envelope_hash forme_r4.sha256_digest,
  p_transport_journal_dispatches integer)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_dispatch_permit_issue(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_reservation_id forme_r4.r4_id, p_session_envelope_hash forme_r4.sha256_digest,
  p_start_authorization_hash forme_r4.sha256_digest, p_provider text,
  p_model_id forme_r4.canonical_text, p_payload_hash forme_r4.sha256_digest,
  p_dispatch_ordinal smallint, p_permit_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_room_event_ack(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_room_id forme_r4.r4_id,
  p_event_id forme_r4.r4_id, p_sequence bigint,
  p_event_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_projection_deliver(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_projection_id forme_r4.r4_id,
  p_room_id forme_r4.r4_id, p_entity_id forme_r4.r4_id,
  p_capsule_ciphertext forme_r4.encrypted_field_v1,
  p_capsule_plaintext_bytes integer, p_title_scalar_count integer,
  p_summary_plaintext_bytes integer, p_disclosure_basis_id forme_r4.r4_id,
  p_payload_hash forme_r4.sha256_digest, p_publication_attestation jsonb)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_response_deliver(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_response_id forme_r4.r4_id, p_body_ciphertext forme_r4.encrypted_field_v1,
  p_body_plaintext_bytes integer, p_body_content_hash forme_r4.sha256_digest,
  p_candidate_hash forme_r4.sha256_digest,
  p_publication_payload_hash forme_r4.sha256_digest,
  p_origin_state forme_r4.projection_owner_state_d,
  p_source_disclosure forme_r4.response_source_disclosure_d,
  p_local_basis_attestation_id forme_r4.r4_id,
  p_publication_attestation jsonb)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_projection_attest_stale(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_projection_id forme_r4.r4_id)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.tx_local_purge_receipt(
  p_ctx forme_r4.mutation_context_v1, p_binding_id forme_r4.r4_id,
  p_binding_digest forme_r4.sha256_digest, p_interaction_id forme_r4.r4_id,
  p_local_bytes_absent boolean)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;

CREATE FUNCTION forme_r4.notify_claim_next(p_worker_id uuid)
RETURNS forme_r4.notification_claim_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$
  SELECT ROW('none',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)::forme_r4.notification_claim_v1
$f$;
CREATE FUNCTION forme_r4.notify_record_provider_result(
  p_worker_id uuid, p_attempt_id forme_r4.r4_id, p_result text,
  p_provider_evidence_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.notify_claim_reconciliation(p_worker_id uuid)
RETURNS forme_r4.notification_claim_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$
  SELECT ROW('none',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)::forme_r4.notification_claim_v1
$f$;
CREATE FUNCTION forme_r4.notify_record_reconciliation(
  p_worker_id uuid, p_attempt_id forme_r4.r4_id, p_result text,
  p_provider_evidence_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.notify_apply_late_authenticated_result(
  p_attempt_id forme_r4.r4_id, p_result text,
  p_provider_evidence_hash forme_r4.sha256_digest)
RETURNS forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.janitor_purge_due(
  p_invocation text, p_batch_size integer DEFAULT 100)
RETURNS SETOF forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.janitor_compact_room_events(p_batch_size integer DEFAULT 100)
RETURNS SETOF forme_r4.api_result_v1 LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;
CREATE FUNCTION forme_r4.janitor_health()
RETURNS forme_r4.api_result_v1 LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,forme_r4 AS $f$ SELECT forme_r4.api_unavailable_result() $f$;

REVOKE ALL ON ALL TABLES IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA forme_r4 FROM PUBLIC;
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA forme_r4 FROM PUBLIC;

GRANT USAGE ON TYPE
  forme_r4.r4_id, forme_r4.sha256_digest, forme_r4.idempotency_key,
  forme_r4.canonical_text, forme_r4.encrypted_field_v1,
  forme_r4.actor_subject_state_d, forme_r4.actor_role_kind_d,
  forme_r4.entity_state_d, forme_r4.third_place_state_d,
  forme_r4.third_place_event_kind_d, forme_r4.room_kind_d,
  forme_r4.interaction_mode_d, forme_r4.room_status_d,
  forme_r4.room_lifecycle_event_kind_d, forme_r4.projection_owner_state_d,
  forme_r4.curation_state_d, forme_r4.curation_event_kind_d,
  forme_r4.capability_state_d, forme_r4.grant_preset_id_d,
  forme_r4.grant_offer_state_d, forme_r4.direct_invite_state_d,
  forme_r4.capability_class_d, forme_r4.binding_state_d,
  forme_r4.pairing_state_d, forme_r4.interaction_type_d,
  forme_r4.guest_capsule_level_d, forme_r4.interaction_consent_d,
  forme_r4.interaction_state_d, forme_r4.fresh_cycle_state_d,
  forme_r4.response_state_d, forme_r4.response_source_disclosure_d,
  forme_r4.notification_endpoint_state_d, forme_r4.notification_challenge_state_d,
  forme_r4.notification_semantic_kind_d, forme_r4.notification_notice_state_d,
  forme_r4.notification_attempt_state_d, forme_r4.room_event_object_type_d,
  forme_r4.operation_status_d, forme_r4.idempotency_recovery_kind_d,
  forme_r4.retention_target_kind_d, forme_r4.retention_job_state_d,
  forme_r4.purge_outcome_d, forme_r4.operator_incident_code_d,
  forme_r4.api_actor_class_d, forme_r4.mutation_context_v1,
  forme_r4.api_result_v1, forme_r4.notification_claim_v1
TO forme_r4_app;
GRANT USAGE ON TYPE forme_r4.r4_id,forme_r4.sha256_digest,
  forme_r4.encrypted_field_v1,forme_r4.notification_semantic_kind_d,
  forme_r4.notification_claim_v1,forme_r4.api_result_v1 TO forme_r4_notify;
GRANT USAGE ON TYPE forme_r4.r4_id,forme_r4.api_result_v1 TO forme_r4_janitor;
GRANT USAGE ON TYPE forme_r4.r4_id,forme_r4.sha256_digest,
  forme_r4.canonical_text,forme_r4.api_actor_class_d,
  forme_r4.api_result_v1 TO forme_r4_audit;

GRANT EXECUTE ON FUNCTION forme_r4.api_third_place_list() TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_projection_read(forme_r4.r4_id,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_interaction_read(forme_r4.r4_id,forme_r4.sha256_digest) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_control_status(forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_control_interaction_read(forme_r4.r4_id,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON FUNCTION forme_r4.api_room_operator_status(forme_r4.r4_id,forme_r4.sha256_digest,forme_r4.r4_id) TO forme_r4_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA forme_r4 TO forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.notify_claim_next(uuid) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.notify_record_provider_result(uuid,forme_r4.r4_id,text,forme_r4.sha256_digest) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.notify_claim_reconciliation(uuid) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.notify_record_reconciliation(uuid,forme_r4.r4_id,text,forme_r4.sha256_digest) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.notify_apply_late_authenticated_result(forme_r4.r4_id,text,forme_r4.sha256_digest) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.janitor_purge_due(text,integer) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.janitor_compact_room_events(integer) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.janitor_health() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.api_unavailable_result() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.is_encrypted_field_v1(jsonb) FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.enforce_projection_room_entity() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.enforce_projection_immutability() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.enforce_response_expiry() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.enforce_terminal_unreadability() FROM forme_r4_app;
REVOKE EXECUTE ON FUNCTION forme_r4.enforce_room_event_sequence() FROM forme_r4_app;

GRANT EXECUTE ON FUNCTION forme_r4.notify_claim_next(uuid),
  forme_r4.notify_record_provider_result(uuid,forme_r4.r4_id,text,forme_r4.sha256_digest),
  forme_r4.notify_claim_reconciliation(uuid),
  forme_r4.notify_record_reconciliation(uuid,forme_r4.r4_id,text,forme_r4.sha256_digest),
  forme_r4.notify_apply_late_authenticated_result(forme_r4.r4_id,text,forme_r4.sha256_digest)
TO forme_r4_notify;
GRANT EXECUTE ON FUNCTION forme_r4.janitor_purge_due(text,integer),
  forme_r4.janitor_compact_room_events(integer),forme_r4.janitor_health()
TO forme_r4_janitor;

GRANT SELECT ON
  forme_r4.audit_schema_migrations,forme_r4.audit_room_lifecycle,
  forme_r4.audit_projection_lifecycle,forme_r4.audit_curation_events,
  forme_r4.audit_capability_events,forme_r4.audit_interaction_lifecycle,
  forme_r4.audit_response_lifecycle,forme_r4.audit_operation_receipts,
  forme_r4.audit_room_event_high_water,forme_r4.audit_purge_health,
  forme_r4.audit_operator_incidents
TO forme_r4_audit;
GRANT SELECT ON forme_r4.audit_room_event_high_water,forme_r4.audit_purge_health TO forme_r4_app;
GRANT SELECT ON forme_r4.audit_purge_health TO forme_r4_janitor;

INSERT INTO forme_r4.schema_migrations(
  version,migration_name,migration_sha256,packet_sha256,manifest_sha256,
  applied_by,postgres_version_num,rollback_compatible)
VALUES(1,'r4_presence_v1',:'migration_sha',:'packet_sha',:'manifest_sha',
  session_user,current_setting('server_version_num')::integer,true);

RESET ROLE;
COMMIT;
\else
DO $forme_r4_reapply$
DECLARE row_count integer;
BEGIN
  SELECT count(*) INTO row_count FROM forme_r4.schema_migrations
  WHERE version=1 AND migration_sha256=current_setting('forme_r4.migration_sha')
    AND packet_sha256=current_setting('forme_r4.packet_sha')
    AND manifest_sha256=current_setting('forme_r4.manifest_sha');
  IF row_count<>1 THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;
END
$forme_r4_reapply$;
\endif
