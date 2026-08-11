-- R4 #67 Durable Public Core proposed schema.
--
-- CONSTRUCTION ONLY: these bytes are intentionally not wired to a driver and
-- must not be applied before the separately hash-pinned Gate C grant.

BEGIN;

CREATE SCHEMA forme_r4_public_core;
SET LOCAL search_path = pg_catalog, forme_r4_public_core;

CREATE TABLE forme_r4_public_core.installation (
  installation_id text CONSTRAINT pk_installation PRIMARY KEY,
  singleton_slot boolean NOT NULL DEFAULT true,
  third_place_id text NOT NULL,
  entity_id text NOT NULL,
  config_lineage_hash text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT uq_installation__singleton UNIQUE (singleton_slot),
  CONSTRAINT ck_installation__singleton CHECK (singleton_slot),
  CONSTRAINT ck_installation__ids CHECK (
    installation_id ~ '^installation_[A-Za-z0-9_-]{16,128}$'
    AND third_place_id ~ '^thirdplace_[A-Za-z0-9_-]{16,128}$'
    AND entity_id ~ '^entity_[A-Za-z0-9_-]{16,128}$'
  ),
  CONSTRAINT ck_installation__lineage CHECK (config_lineage_hash ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_installation__version CHECK (version >= 1)
);

CREATE TABLE forme_r4_public_core.rooms (
  room_id text CONSTRAINT pk_rooms PRIMARY KEY,
  installation_id text NOT NULL,
  singleton_slot boolean NOT NULL DEFAULT true,
  room_kind text NOT NULL DEFAULT 'third_place_public',
  interaction_mode text NOT NULL DEFAULT 'closed',
  active boolean NOT NULL DEFAULT true,
  label_ciphertext jsonb NOT NULL,
  label_plaintext_bytes integer NOT NULL,
  label_field_version integer NOT NULL DEFAULT 1,
  current_projection_id text NULL,
  version bigint NOT NULL DEFAULT 1,
  event_high_water bigint NOT NULL DEFAULT 0,
  event_replay_floor bigint NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  closed_at timestamptz(3) NULL DEFAULT transaction_timestamp(),
  CONSTRAINT uq_rooms__singleton UNIQUE (singleton_slot),
  CONSTRAINT uq_rooms__scope UNIQUE (room_id, installation_id),
  CONSTRAINT fk_rooms__installation FOREIGN KEY (installation_id)
    REFERENCES forme_r4_public_core.installation (installation_id),
  CONSTRAINT ck_rooms__singleton CHECK (singleton_slot),
  CONSTRAINT ck_rooms__id CHECK (room_id ~ '^room_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_rooms__kind CHECK (room_kind = 'third_place_public'),
  CONSTRAINT ck_rooms__mode CHECK (interaction_mode IN ('public_single', 'closed')),
  CONSTRAINT ck_rooms__active CHECK (active OR interaction_mode = 'closed'),
  CONSTRAINT ck_rooms__closed_at CHECK ((interaction_mode = 'closed') = (closed_at IS NOT NULL)),
  CONSTRAINT ck_rooms__version CHECK (version >= 1),
  CONSTRAINT ck_rooms__high_water CHECK (event_high_water >= 0),
  CONSTRAINT ck_rooms__event_floor CHECK (
    event_replay_floor >= 1 AND event_replay_floor <= event_high_water + 1
  ),
  CONSTRAINT ck_rooms__label_size CHECK (label_plaintext_bytes BETWEEN 1 AND 1024),
  CONSTRAINT ck_rooms__label_field_version CHECK (label_field_version >= 1),
  CONSTRAINT ck_rooms__label_cipher CHECK (
    jsonb_typeof(label_ciphertext) = 'object'
    AND label_ciphertext - ARRAY[
      'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
    ] = '{}'::jsonb
    AND label_ciphertext ?& ARRAY[
      'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
    ]
    AND jsonb_typeof(label_ciphertext->'schemaVersion') = 'string'
    AND jsonb_typeof(label_ciphertext->'algorithm') = 'string'
    AND jsonb_typeof(label_ciphertext->'keyVersion') = 'string'
    AND jsonb_typeof(label_ciphertext->'nonce') = 'string'
    AND jsonb_typeof(label_ciphertext->'ciphertext') = 'string'
    AND jsonb_typeof(label_ciphertext->'tag') = 'string'
    AND jsonb_typeof(label_ciphertext->'aadHash') = 'string'
    AND label_ciphertext->>'schemaVersion' = 'a256gcm.v1'
    AND label_ciphertext->>'algorithm' = 'AES-256-GCM'
    AND label_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
    AND label_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
    AND label_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
    AND length(label_ciphertext->>'ciphertext') = (label_plaintext_bytes * 4 + 2) / 3
    AND CASE length(label_ciphertext->>'ciphertext') % 4
      WHEN 0 THEN true
      WHEN 2 THEN right(label_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
      WHEN 3 THEN right(label_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
      ELSE false END
    AND label_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
    AND label_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
  )
);

CREATE TABLE forme_r4_public_core.projections (
  projection_id text CONSTRAINT pk_projections PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  capsule_ciphertext jsonb NULL,
  capsule_plaintext_bytes integer NOT NULL,
  capsule_field_version integer NOT NULL DEFAULT 1,
  payload_hash text NOT NULL,
  basis_hash text NOT NULL,
  projection_policy_hash text NOT NULL,
  publication_approval_id text NOT NULL,
  publication_approval_hash text NOT NULL,
  publication_attestation_hash text NOT NULL,
  owner_state text NOT NULL DEFAULT 'published_fresh',
  curation_state text NOT NULL DEFAULT 'not_admitted',
  current boolean NOT NULL DEFAULT true,
  body_readable boolean NOT NULL DEFAULT true,
  lifecycle_version bigint NOT NULL DEFAULT 1,
  published_at timestamptz(3) NOT NULL,
  fresh_until timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  superseded_at timestamptz(3) NULL,
  revoked_at timestamptz(3) NULL,
  purged_at timestamptz(3) NULL,
  CONSTRAINT uq_projections__room_scope UNIQUE (projection_id, room_id),
  CONSTRAINT uq_projections__full_scope UNIQUE (projection_id, room_id, installation_id),
  CONSTRAINT uq_projections__publication_approval UNIQUE (publication_approval_id),
  CONSTRAINT fk_projections__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_projections__ids CHECK (
    projection_id ~ '^proj_[A-Za-z0-9_-]{16,128}$'
    AND publication_approval_id ~ '^approval_[A-Za-z0-9_-]{16,128}$'
  ),
  CONSTRAINT ck_projections__capsule_size CHECK (capsule_plaintext_bytes BETWEEN 1 AND 131072),
  CONSTRAINT ck_projections__field_version CHECK (capsule_field_version >= 1),
  CONSTRAINT ck_projections__hashes CHECK (
    payload_hash ~ '^sha256:[0-9a-f]{64}$'
    AND basis_hash ~ '^sha256:[0-9a-f]{64}$'
    AND projection_policy_hash ~ '^sha256:[0-9a-f]{64}$'
    AND publication_approval_hash ~ '^sha256:[0-9a-f]{64}$'
    AND publication_attestation_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_projections__owner_state CHECK (
    owner_state IN ('published_fresh', 'stale', 'superseded', 'revoked', 'expired')
  ),
  CONSTRAINT ck_projections__curation_state CHECK (
    curation_state IN ('not_admitted', 'admitted', 'unlisted')
  ),
  CONSTRAINT ck_projections__chronology CHECK (
    published_at < fresh_until
    AND fresh_until < expires_at
    AND expires_at <= published_at + interval '7 days'
  ),
  CONSTRAINT ck_projections__current CHECK (NOT current OR owner_state IN ('published_fresh', 'stale')),
  CONSTRAINT ck_projections__terminal_body CHECK (
    (body_readable AND capsule_ciphertext IS NOT NULL
      AND owner_state IN ('published_fresh', 'stale'))
    OR (NOT body_readable AND capsule_ciphertext IS NULL
      AND owner_state IN ('superseded', 'revoked', 'expired'))
  ),
  CONSTRAINT ck_projections__terminal_time CHECK (
    (owner_state = 'superseded') = (superseded_at IS NOT NULL)
    AND (owner_state = 'revoked') = (revoked_at IS NOT NULL)
  ),
  CONSTRAINT ck_projections__purged CHECK (purged_at IS NULL OR capsule_ciphertext IS NULL),
  CONSTRAINT ck_projections__capsule_cipher CHECK (
    capsule_ciphertext IS NULL OR (
      jsonb_typeof(capsule_ciphertext) = 'object'
      AND capsule_ciphertext - ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ] = '{}'::jsonb
      AND capsule_ciphertext ?& ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ]
      AND jsonb_typeof(capsule_ciphertext->'schemaVersion') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'algorithm') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'keyVersion') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'nonce') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'ciphertext') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'tag') = 'string'
      AND jsonb_typeof(capsule_ciphertext->'aadHash') = 'string'
      AND capsule_ciphertext->>'schemaVersion' = 'a256gcm.v1'
      AND capsule_ciphertext->>'algorithm' = 'AES-256-GCM'
      AND capsule_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
      AND capsule_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
      AND capsule_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
      AND length(capsule_ciphertext->>'ciphertext') = (capsule_plaintext_bytes * 4 + 2) / 3
      AND CASE length(capsule_ciphertext->>'ciphertext') % 4
        WHEN 0 THEN true
        WHEN 2 THEN right(capsule_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
        WHEN 3 THEN right(capsule_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
        ELSE false END
      AND capsule_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
      AND capsule_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
    )
  )
);

CREATE UNIQUE INDEX uq_projections__one_current
  ON forme_r4_public_core.projections (room_id)
  WHERE current;

ALTER TABLE forme_r4_public_core.rooms
  ADD CONSTRAINT fk_rooms__current_projection
  FOREIGN KEY (current_projection_id, room_id)
  REFERENCES forme_r4_public_core.projections (projection_id, room_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE forme_r4_public_core.pairing_challenges (
  pairing_id text CONSTRAINT pk_pairing_challenges PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  pairing_code_ciphertext jsonb NULL,
  pairing_code_plaintext_bytes integer NOT NULL,
  pairing_code_digest text NOT NULL,
  pairing_code_field_version integer NOT NULL DEFAULT 1,
  exchange_envelope_ciphertext jsonb NULL,
  exchange_envelope_plaintext_bytes integer NULL,
  exchange_envelope_field_version integer NOT NULL DEFAULT 1,
  client_public_key_hash text NULL,
  state text NOT NULL DEFAULT 'issued',
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3) NULL,
  CONSTRAINT uq_pairing_challenges__room_scope UNIQUE (pairing_id, room_id),
  CONSTRAINT fk_pairing_challenges__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_pairing_challenges__id CHECK (
    pairing_id ~ '^pairing_[A-Za-z0-9_-]{16,128}$'
  ),
  CONSTRAINT ck_pairing_challenges__digest CHECK (pairing_code_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_pairing_challenges__client_key CHECK (
    client_public_key_hash IS NULL OR client_public_key_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_pairing_challenges__state CHECK (state IN ('issued', 'exchanged', 'expired')),
  CONSTRAINT ck_pairing_challenges__chronology CHECK (
    created_at < expires_at AND expires_at <= created_at + interval '10 minutes'
  ),
  CONSTRAINT ck_pairing_challenges__terminal_clear CHECK (
    (state = 'issued' AND pairing_code_ciphertext IS NOT NULL
      AND exchange_envelope_ciphertext IS NULL AND consumed_at IS NULL
      AND client_public_key_hash IS NULL)
    OR (state = 'exchanged' AND pairing_code_ciphertext IS NULL
      AND exchange_envelope_ciphertext IS NOT NULL AND consumed_at IS NOT NULL
      AND client_public_key_hash IS NOT NULL)
    OR (state = 'expired' AND pairing_code_ciphertext IS NULL
      AND exchange_envelope_ciphertext IS NULL)
  ),
  CONSTRAINT ck_pairing_challenges__version CHECK (version >= 1),
  CONSTRAINT ck_pairing_challenges__field_versions CHECK (
    pairing_code_field_version >= 1 AND exchange_envelope_field_version >= 1
  ),
  CONSTRAINT ck_pairing_challenges__plaintext_sizes CHECK (
    pairing_code_plaintext_bytes BETWEEN 1 AND 4096
    AND (exchange_envelope_plaintext_bytes IS NULL
      OR exchange_envelope_plaintext_bytes BETWEEN 1 AND 32768)
    AND (state <> 'issued' OR exchange_envelope_plaintext_bytes IS NULL)
    AND (state <> 'exchanged' OR exchange_envelope_plaintext_bytes IS NOT NULL)
  ),
  CONSTRAINT ck_pairing_challenges__pairing_cipher CHECK (
    pairing_code_ciphertext IS NULL OR (
      jsonb_typeof(pairing_code_ciphertext) = 'object'
      AND pairing_code_ciphertext - ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ] = '{}'::jsonb
      AND pairing_code_ciphertext ?& ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ]
      AND jsonb_typeof(pairing_code_ciphertext->'schemaVersion') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'algorithm') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'keyVersion') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'nonce') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'ciphertext') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'tag') = 'string'
      AND jsonb_typeof(pairing_code_ciphertext->'aadHash') = 'string'
      AND pairing_code_ciphertext->>'schemaVersion' = 'a256gcm.v1'
      AND pairing_code_ciphertext->>'algorithm' = 'AES-256-GCM'
      AND pairing_code_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
      AND pairing_code_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
      AND pairing_code_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
      AND length(pairing_code_ciphertext->>'ciphertext') =
        (pairing_code_plaintext_bytes * 4 + 2) / 3
      AND CASE length(pairing_code_ciphertext->>'ciphertext') % 4
        WHEN 0 THEN true
        WHEN 2 THEN right(pairing_code_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
        WHEN 3 THEN right(pairing_code_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
        ELSE false END
      AND pairing_code_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
      AND pairing_code_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
    )
  ),
  CONSTRAINT ck_pairing_challenges__exchange_cipher CHECK (
    exchange_envelope_ciphertext IS NULL OR (
      jsonb_typeof(exchange_envelope_ciphertext) = 'object'
      AND exchange_envelope_ciphertext - ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ] = '{}'::jsonb
      AND exchange_envelope_ciphertext ?& ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ]
      AND jsonb_typeof(exchange_envelope_ciphertext->'schemaVersion') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'algorithm') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'keyVersion') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'nonce') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'ciphertext') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'tag') = 'string'
      AND jsonb_typeof(exchange_envelope_ciphertext->'aadHash') = 'string'
      AND exchange_envelope_ciphertext->>'schemaVersion' = 'a256gcm.v1'
      AND exchange_envelope_ciphertext->>'algorithm' = 'AES-256-GCM'
      AND exchange_envelope_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
      AND exchange_envelope_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
      AND exchange_envelope_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
      AND length(exchange_envelope_ciphertext->>'ciphertext') =
        (exchange_envelope_plaintext_bytes * 4 + 2) / 3
      AND CASE length(exchange_envelope_ciphertext->>'ciphertext') % 4
        WHEN 0 THEN true
        WHEN 2 THEN right(exchange_envelope_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
        WHEN 3 THEN right(exchange_envelope_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
        ELSE false END
      AND exchange_envelope_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
      AND exchange_envelope_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
    )
  )
);

CREATE TABLE forme_r4_public_core.room_bindings (
  binding_id text CONSTRAINT pk_room_bindings PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  credential_digest text NOT NULL,
  capability_bundle text NOT NULL DEFAULT 'room_operator.v1',
  state text NOT NULL DEFAULT 'current',
  version bigint NOT NULL DEFAULT 1,
  paired_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  revoked_at timestamptz(3) NULL,
  CONSTRAINT uq_room_bindings__room_scope UNIQUE (binding_id, room_id),
  CONSTRAINT fk_room_bindings__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_room_bindings__id CHECK (binding_id ~ '^binding_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_room_bindings__credential CHECK (credential_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_room_bindings__bundle CHECK (capability_bundle = 'room_operator.v1'),
  CONSTRAINT ck_room_bindings__state CHECK (state IN ('current', 'revoked', 'expired')),
  CONSTRAINT ck_room_bindings__chronology CHECK (
    paired_at < expires_at AND expires_at <= paired_at + interval '30 days'
  ),
  CONSTRAINT ck_room_bindings__revocation CHECK ((state = 'revoked') = (revoked_at IS NOT NULL)),
  CONSTRAINT ck_room_bindings__version CHECK (version >= 1)
);

CREATE TABLE forme_r4_public_core.rate_events (
  rate_event_id text CONSTRAINT pk_rate_events PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  bucket_kind text NOT NULL,
  bucket_digest text NOT NULL,
  window_start timestamptz(3) NOT NULL,
  window_end timestamptz(3) NOT NULL,
  event_ordinal integer NOT NULL,
  recorded_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  expires_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_rate_events__ordinal UNIQUE (
    room_id, bucket_kind, bucket_digest, window_start, event_ordinal
  ),
  CONSTRAINT uq_rate_events__room_scope UNIQUE (rate_event_id, room_id),
  CONSTRAINT fk_rate_events__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_rate_events__id CHECK (rate_event_id ~ '^rate_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_rate_events__kind CHECK (
    bucket_kind IN ('encounter_issue_hour', 'encounter_issue_day', 'interaction_accept_day')
  ),
  CONSTRAINT ck_rate_events__digest CHECK (bucket_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_rate_events__window CHECK (
    (bucket_kind = 'encounter_issue_hour' AND window_end = window_start + interval '1 hour')
    OR (bucket_kind IN ('encounter_issue_day', 'interaction_accept_day')
      AND window_end = window_start + interval '24 hours')
  ),
  CONSTRAINT ck_rate_events__limit CHECK (
    (bucket_kind = 'encounter_issue_hour' AND event_ordinal BETWEEN 1 AND 10)
    OR (bucket_kind = 'encounter_issue_day' AND event_ordinal BETWEEN 1 AND 50)
    OR (bucket_kind = 'interaction_accept_day' AND event_ordinal BETWEEN 1 AND 3)
  ),
  CONSTRAINT ck_rate_events__retention CHECK (
    expires_at >= window_end
    AND expires_at >= recorded_at
    AND expires_at <= recorded_at + interval '25 hours'
  )
);

CREATE TABLE forme_r4_public_core.public_encounters (
  encounter_id text CONSTRAINT pk_public_encounters PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  projection_id text NOT NULL,
  encounter_secret_digest text NOT NULL,
  issuance_bucket_digest text NOT NULL,
  hourly_rate_event_id text NOT NULL,
  daily_rate_event_id text NOT NULL,
  state text NOT NULL DEFAULT 'issued',
  consumed_interaction_id text NULL,
  version bigint NOT NULL DEFAULT 1,
  issued_at timestamptz(3) NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3) NULL,
  invalidated_at timestamptz(3) NULL,
  CONSTRAINT uq_public_encounters__room_projection UNIQUE (encounter_id, room_id, projection_id),
  CONSTRAINT fk_public_encounters__projection FOREIGN KEY (projection_id, room_id, installation_id)
    REFERENCES forme_r4_public_core.projections (projection_id, room_id, installation_id),
  CONSTRAINT fk_public_encounters__hourly_rate FOREIGN KEY (hourly_rate_event_id, room_id)
    REFERENCES forme_r4_public_core.rate_events (rate_event_id, room_id),
  CONSTRAINT fk_public_encounters__daily_rate FOREIGN KEY (daily_rate_event_id, room_id)
    REFERENCES forme_r4_public_core.rate_events (rate_event_id, room_id),
  CONSTRAINT ck_public_encounters__ids CHECK (
    encounter_id ~ '^encounter_[A-Za-z0-9_-]{16,128}$'
    AND hourly_rate_event_id ~ '^rate_[A-Za-z0-9_-]{16,128}$'
    AND daily_rate_event_id ~ '^rate_[A-Za-z0-9_-]{16,128}$'
    AND (consumed_interaction_id IS NULL
      OR consumed_interaction_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$')
  ),
  CONSTRAINT ck_public_encounters__secret CHECK (encounter_secret_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_public_encounters__bucket CHECK (issuance_bucket_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_public_encounters__state CHECK (state IN ('issued', 'consumed', 'invalidated', 'expired')),
  CONSTRAINT ck_public_encounters__chronology CHECK (
    issued_at < expires_at AND expires_at <= issued_at + interval '24 hours'
  ),
  CONSTRAINT ck_public_encounters__consumption CHECK (
    (state = 'consumed') = (consumed_interaction_id IS NOT NULL AND consumed_at IS NOT NULL)
  ),
  CONSTRAINT ck_public_encounters__invalidation CHECK (
    (state = 'invalidated') = (invalidated_at IS NOT NULL)
  ),
  CONSTRAINT ck_public_encounters__version CHECK (version >= 1)
);

CREATE TABLE forme_r4_public_core.interactions (
  interaction_id text CONSTRAINT pk_interactions PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  encounter_id text NOT NULL,
  origin_projection_id text NOT NULL,
  request_ciphertext jsonb NULL,
  guest_capsule_ciphertext jsonb NULL,
  request_plaintext_bytes integer NOT NULL,
  guest_capsule_plaintext_bytes integer NULL,
  request_field_version integer NOT NULL DEFAULT 1,
  guest_capsule_field_version integer NOT NULL DEFAULT 1,
  request_hash text NOT NULL,
  guest_capsule_hash text NULL,
  consent_hash text NOT NULL,
  origin_projection_payload_hash text NOT NULL,
  reply_secret_digest text NULL,
  delete_secret_digest text NULL,
  state text NOT NULL DEFAULT 'accepted',
  body_readable boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL,
  body_expires_at timestamptz(3) NOT NULL,
  tombstone_expires_at timestamptz(3) NOT NULL,
  pulled_at timestamptz(3) NULL,
  local_purge_received_at timestamptz(3) NULL,
  deleted_at timestamptz(3) NULL,
  purged_at timestamptz(3) NULL,
  CONSTRAINT uq_interactions__encounter UNIQUE (encounter_id),
  CONSTRAINT uq_interactions__room_scope UNIQUE (interaction_id, room_id),
  CONSTRAINT uq_interactions__consumed_lineage UNIQUE (
    interaction_id, encounter_id, room_id, origin_projection_id
  ),
  CONSTRAINT fk_interactions__origin_projection
    FOREIGN KEY (origin_projection_id, room_id, installation_id)
    REFERENCES forme_r4_public_core.projections (projection_id, room_id, installation_id),
  CONSTRAINT fk_interactions__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_interactions__ids CHECK (
    interaction_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$'
    AND encounter_id ~ '^encounter_[A-Za-z0-9_-]{16,128}$'
    AND origin_projection_id ~ '^proj_[A-Za-z0-9_-]{16,128}$'
  ),
  CONSTRAINT ck_interactions__hashes CHECK (
    request_hash ~ '^sha256:[0-9a-f]{64}$'
    AND (guest_capsule_hash IS NULL OR guest_capsule_hash ~ '^sha256:[0-9a-f]{64}$')
    AND consent_hash ~ '^sha256:[0-9a-f]{64}$'
    AND origin_projection_payload_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_interactions__secret_digests CHECK (
    (reply_secret_digest IS NULL OR reply_secret_digest ~ '^hmac-sha256:[0-9a-f]{64}$')
    AND (delete_secret_digest IS NULL OR delete_secret_digest ~ '^hmac-sha256:[0-9a-f]{64}$')
  ),
  CONSTRAINT ck_interactions__state CHECK (
    state IN ('accepted', 'seen_locally', 'interaction_deleted', 'origin_revoked', 'interaction_expired')
  ),
  CONSTRAINT ck_interactions__retention CHECK (
    created_at < body_expires_at
    AND body_expires_at <= created_at + interval '30 days'
    AND tombstone_expires_at = body_expires_at + interval '7 days'
  ),
  CONSTRAINT ck_interactions__terminal_body CHECK (
    (body_readable AND state IN ('accepted', 'seen_locally') AND request_ciphertext IS NOT NULL)
    OR (NOT body_readable AND state IN ('interaction_deleted', 'origin_revoked', 'interaction_expired')
      AND request_ciphertext IS NULL AND guest_capsule_ciphertext IS NULL)
  ),
  CONSTRAINT ck_interactions__deleted CHECK ((state = 'interaction_deleted') = (deleted_at IS NOT NULL)),
  CONSTRAINT ck_interactions__local_purge CHECK (
    local_purge_received_at IS NULL OR local_purge_received_at >= created_at
  ),
  CONSTRAINT ck_interactions__purged CHECK (
    purged_at IS NULL OR (request_ciphertext IS NULL AND guest_capsule_ciphertext IS NULL)
  ),
  CONSTRAINT ck_interactions__version CHECK (version >= 1),
  CONSTRAINT ck_interactions__field_versions CHECK (
    request_field_version >= 1 AND guest_capsule_field_version >= 1
  ),
  CONSTRAINT ck_interactions__plaintext_sizes CHECK (
    request_plaintext_bytes BETWEEN 1 AND 32768
    AND (guest_capsule_plaintext_bytes IS NULL
      OR guest_capsule_plaintext_bytes BETWEEN 1 AND 4096)
    AND (NOT body_readable
      OR ((guest_capsule_ciphertext IS NULL) = (guest_capsule_plaintext_bytes IS NULL)
        AND (guest_capsule_ciphertext IS NULL) = (guest_capsule_hash IS NULL)))
  ),
  CONSTRAINT ck_interactions__request_cipher CHECK (
    request_ciphertext IS NULL OR (
      jsonb_typeof(request_ciphertext) = 'object'
      AND request_ciphertext - ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ] = '{}'::jsonb
      AND request_ciphertext ?& ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ]
      AND jsonb_typeof(request_ciphertext->'schemaVersion') = 'string'
      AND jsonb_typeof(request_ciphertext->'algorithm') = 'string'
      AND jsonb_typeof(request_ciphertext->'keyVersion') = 'string'
      AND jsonb_typeof(request_ciphertext->'nonce') = 'string'
      AND jsonb_typeof(request_ciphertext->'ciphertext') = 'string'
      AND jsonb_typeof(request_ciphertext->'tag') = 'string'
      AND jsonb_typeof(request_ciphertext->'aadHash') = 'string'
      AND request_ciphertext->>'schemaVersion' = 'a256gcm.v1'
      AND request_ciphertext->>'algorithm' = 'AES-256-GCM'
      AND request_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
      AND request_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
      AND request_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
      AND length(request_ciphertext->>'ciphertext') = (request_plaintext_bytes * 4 + 2) / 3
      AND CASE length(request_ciphertext->>'ciphertext') % 4
        WHEN 0 THEN true
        WHEN 2 THEN right(request_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
        WHEN 3 THEN right(request_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
        ELSE false END
      AND request_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
      AND request_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
    )
  ),
  CONSTRAINT ck_interactions__guest_cipher CHECK (
    guest_capsule_ciphertext IS NULL OR (
      jsonb_typeof(guest_capsule_ciphertext) = 'object'
      AND guest_capsule_ciphertext - ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ] = '{}'::jsonb
      AND guest_capsule_ciphertext ?& ARRAY[
        'schemaVersion','algorithm','keyVersion','nonce','ciphertext','tag','aadHash'
      ]
      AND jsonb_typeof(guest_capsule_ciphertext->'schemaVersion') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'algorithm') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'keyVersion') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'nonce') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'ciphertext') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'tag') = 'string'
      AND jsonb_typeof(guest_capsule_ciphertext->'aadHash') = 'string'
      AND guest_capsule_ciphertext->>'schemaVersion' = 'a256gcm.v1'
      AND guest_capsule_ciphertext->>'algorithm' = 'AES-256-GCM'
      AND guest_capsule_ciphertext->>'keyVersion' ~ '^keyv_[a-f0-9]{32}$'
      AND guest_capsule_ciphertext->>'nonce' ~ '^[A-Za-z0-9_-]{16}$'
      AND guest_capsule_ciphertext->>'ciphertext' ~ '^[A-Za-z0-9_-]+$'
      AND length(guest_capsule_ciphertext->>'ciphertext') =
        (guest_capsule_plaintext_bytes * 4 + 2) / 3
      AND CASE length(guest_capsule_ciphertext->>'ciphertext') % 4
        WHEN 0 THEN true
        WHEN 2 THEN right(guest_capsule_ciphertext->>'ciphertext',1) ~ '^[AQgw]$'
        WHEN 3 THEN right(guest_capsule_ciphertext->>'ciphertext',1) ~ '^[AEIMQUYcgkosw048]$'
        ELSE false END
      AND guest_capsule_ciphertext->>'tag' ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
      AND guest_capsule_ciphertext->>'aadHash' ~ '^sha256:[0-9a-f]{64}$'
    )
  )
);

ALTER TABLE forme_r4_public_core.public_encounters
  ADD CONSTRAINT fk_public_encounters__consumed_interaction
  FOREIGN KEY (consumed_interaction_id, encounter_id, room_id, projection_id)
  REFERENCES forme_r4_public_core.interactions (
    interaction_id, encounter_id, room_id, origin_projection_id
  )
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE forme_r4_public_core.room_events (
  event_id text CONSTRAINT pk_room_events PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  sequence bigint NOT NULL,
  event_kind text NOT NULL,
  object_id text NOT NULL,
  object_version bigint NOT NULL,
  event_hash text NOT NULL,
  committed_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  expires_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_room_events__sequence UNIQUE (room_id, sequence),
  CONSTRAINT uq_room_events__ack_scope UNIQUE (event_id, room_id, sequence, event_hash),
  CONSTRAINT fk_room_events__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_room_events__id CHECK (event_id ~ '^event_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_room_events__object_id CHECK (
    (event_kind IN ('room_created','room_mode_set')
      AND object_id ~ '^room_[A-Za-z0-9_-]{16,128}$')
    OR (event_kind = 'pairing_issued'
      AND object_id ~ '^pairing_[A-Za-z0-9_-]{16,128}$')
    OR (event_kind IN ('pairing_exchanged','binding_revoked')
      AND object_id ~ '^binding_[A-Za-z0-9_-]{16,128}$')
    OR (event_kind IN ('projection_delivered','projection_revoked','curation_admitted','curation_unlisted')
      AND object_id ~ '^proj_[A-Za-z0-9_-]{16,128}$')
    OR (event_kind = 'encounter_issued'
      AND object_id ~ '^encounter_[A-Za-z0-9_-]{16,128}$')
    OR (event_kind IN ('interaction_accepted','interaction_deleted','local_purge_receipted')
      AND object_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$')
  ),
  CONSTRAINT ck_room_events__sequence CHECK (sequence >= 1),
  CONSTRAINT ck_room_events__object_version CHECK (object_version >= 1),
  CONSTRAINT ck_room_events__kind CHECK (
    event_kind IN (
      'room_created', 'room_mode_set', 'pairing_issued', 'pairing_exchanged',
      'binding_revoked', 'projection_delivered', 'projection_revoked',
      'curation_admitted', 'curation_unlisted', 'encounter_issued',
      'interaction_accepted', 'interaction_deleted', 'local_purge_receipted'
    )
  ),
  CONSTRAINT ck_room_events__hash CHECK (event_hash ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_room_events__retention CHECK (
    expires_at = committed_at + interval '37 days'
  )
);

CREATE TABLE forme_r4_public_core.mutation_receipts (
  receipt_id text CONSTRAINT pk_mutation_receipts PRIMARY KEY,
  room_id text NOT NULL,
  actor_class text NOT NULL,
  actor_scope_digest text NOT NULL,
  action_name text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  recovery_kind text NOT NULL,
  target_id text NULL,
  related_target_id text NULL,
  target_version bigint NULL,
  status text NOT NULL DEFAULT 'reserved',
  http_status smallint NULL,
  result_code text NULL,
  sync_after_sequence bigint NULL,
  sync_high_water bigint NULL,
  sync_replay_floor bigint NULL,
  sync_result_kind text NULL,
  sync_event_ids text[] NULL,
  sync_event_sequences bigint[] NULL,
  sync_event_kinds text[] NULL,
  sync_object_ids text[] NULL,
  sync_object_versions bigint[] NULL,
  sync_event_hashes text[] NULL,
  sync_event_committed_ats text[] NULL,
  sync_tombstone_ids text[] NULL,
  sync_tombstone_expires_ats text[] NULL,
  pull_interaction_id text NULL,
  pull_request_field_version integer NULL,
  pull_body_hash text NULL,
  pull_guest_field_version integer NULL,
  pull_guest_hash text NULL,
  pull_body_expires_at timestamptz(3) NULL,
  pull_terminal_state text NULL,
  source_expires_at timestamptz(3) NULL,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  committed_at timestamptz(3) NULL,
  expires_at timestamptz(3) NOT NULL,
  CONSTRAINT uq_mutation_receipts__idempotency UNIQUE (
    actor_scope_digest, action_name, idempotency_key
  ),
  CONSTRAINT fk_mutation_receipts__room FOREIGN KEY (room_id)
    REFERENCES forme_r4_public_core.rooms (room_id)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT ck_mutation_receipts__ids CHECK (
    receipt_id ~ '^receipt_[A-Za-z0-9_-]{16,128}$'
    AND room_id ~ '^room_[A-Za-z0-9_-]{16,128}$'
    AND (related_target_id IS NULL OR related_target_id ~ '^binding_[A-Za-z0-9_-]{16,128}$')
    AND (pull_interaction_id IS NULL
      OR pull_interaction_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$')
  ),
  CONSTRAINT ck_mutation_receipts__actor CHECK (
    actor_class IN ('public', 'guest_capability', 'controller', 'curator', 'room_operator')
  ),
  CONSTRAINT ck_mutation_receipts__scope_digest CHECK (actor_scope_digest ~ '^hmac-sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_mutation_receipts__action CHECK (
    action_name IN (
      'public_encounter.issue', 'interaction.create', 'interaction.delete',
      'room.pair.exchange', 'room.create', 'room.pair', 'room.binding.revoke',
      'room.mode.set', 'projection.revoke', 'curation.admit', 'curation.unlist',
      'room_operator.sync', 'room_operator.pull', 'room_operator.ack',
      'room_operator.projection.deliver', 'room_operator.local_purge.receipt'
    )
  ),
  CONSTRAINT ck_mutation_receipts__actor_action CHECK (
    (actor_class = 'public' AND action_name IN ('public_encounter.issue', 'room.pair.exchange'))
    OR (actor_class = 'guest_capability' AND action_name IN ('interaction.create', 'interaction.delete'))
    OR (actor_class = 'controller' AND action_name IN (
      'room.create', 'room.pair', 'room.binding.revoke', 'room.mode.set', 'projection.revoke'
    ))
    OR (actor_class = 'curator' AND action_name IN ('curation.admit', 'curation.unlist'))
    OR (actor_class = 'room_operator' AND action_name IN (
      'room_operator.sync', 'room_operator.pull', 'room_operator.ack',
      'room_operator.projection.deliver', 'room_operator.local_purge.receipt'
    ))
  ),
  CONSTRAINT ck_mutation_receipts__idempotency_key CHECK (
    idempotency_key = normalize(idempotency_key, NFC)
    AND octet_length(idempotency_key) BETWEEN 16 AND 256
    AND idempotency_key ~ '^[A-Za-z0-9._:-]+$'
  ),
  CONSTRAINT ck_mutation_receipts__request_hash CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT ck_mutation_receipts__recovery CHECK (
    recovery_kind IN (
      'body_free', 'pairing_issue', 'pairing_exchange', 'sync_window',
      'interaction_pull', 'pull_terminal'
    )
  ),
  CONSTRAINT ck_mutation_receipts__recovery_action CHECK (
    (action_name = 'room.pair' AND recovery_kind = 'pairing_issue')
    OR (action_name = 'room.pair.exchange' AND recovery_kind = 'pairing_exchange')
    OR (action_name = 'room_operator.sync' AND recovery_kind = 'sync_window')
    OR (action_name = 'room_operator.pull'
      AND recovery_kind IN ('interaction_pull', 'pull_terminal'))
    OR (action_name NOT IN (
      'room.pair', 'room.pair.exchange', 'room_operator.sync', 'room_operator.pull'
    ) AND recovery_kind = 'body_free')
  ),
  CONSTRAINT ck_mutation_receipts__status CHECK (status IN ('reserved', 'committed')),
  CONSTRAINT ck_mutation_receipts__terminal CHECK ((
    (status = 'reserved' AND committed_at IS NULL AND source_expires_at IS NULL
      AND http_status IS NULL AND result_code IS NULL AND target_id IS NULL
      AND related_target_id IS NULL AND target_version IS NULL)
    OR (status = 'committed' AND committed_at IS NOT NULL
      AND source_expires_at IS NOT NULL AND http_status IS NOT NULL AND result_code IS NOT NULL
      AND target_id IS NOT NULL AND target_version IS NOT NULL)
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__result_contract CHECK ((
    status = 'reserved' OR
    (action_name = 'public_encounter.issue' AND http_status = 201 AND result_code = 'encounter_issued') OR
    (action_name = 'interaction.create' AND http_status = 201 AND result_code = 'interaction_created') OR
    (action_name = 'interaction.delete' AND http_status = 200 AND result_code = 'interaction_deleted') OR
    (action_name = 'room.pair.exchange' AND http_status = 201 AND result_code = 'pairing_exchanged') OR
    (action_name = 'room.create' AND http_status = 201 AND result_code = 'room_created') OR
    (action_name = 'room.pair' AND http_status = 201 AND result_code = 'pairing_issued') OR
    (action_name = 'room.binding.revoke' AND http_status = 200 AND result_code = 'binding_revoked') OR
    (action_name = 'room.mode.set' AND http_status = 200 AND result_code = 'room_mode_set') OR
    (action_name = 'projection.revoke' AND http_status = 200 AND result_code = 'projection_revoked') OR
    (action_name = 'curation.admit' AND http_status = 200 AND result_code = 'projection_admitted') OR
    (action_name = 'curation.unlist' AND http_status = 200 AND result_code = 'projection_unlisted') OR
    (action_name = 'room_operator.sync' AND (
      (sync_result_kind = 'event_batch' AND http_status = 200 AND result_code = 'event_batch')
      OR (sync_result_kind = 'cursor_gone' AND http_status = 410 AND result_code = 'cursor_gone')
    )) OR
    (action_name = 'room_operator.pull' AND (
      (recovery_kind = 'interaction_pull' AND http_status = 200 AND result_code = 'interaction_pulled')
      OR (recovery_kind = 'pull_terminal' AND http_status = 410 AND result_code = 'pull_terminal')
    )) OR
    (action_name = 'room_operator.ack' AND http_status = 200 AND result_code = 'event_acked') OR
    (action_name = 'room_operator.projection.deliver'
      AND http_status = 201 AND result_code = 'projection_delivered') OR
    (action_name = 'room_operator.local_purge.receipt'
      AND http_status = 200 AND result_code = 'local_purge_recorded')
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__target_kind CHECK ((
    status = 'reserved' OR
    (action_name = 'public_encounter.issue' AND target_id ~ '^encounter_[A-Za-z0-9_-]{16,128}$') OR
    (action_name IN ('interaction.create','interaction.delete','room_operator.pull',
      'room_operator.local_purge.receipt')
      AND target_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$') OR
    (action_name IN ('room.pair','room.pair.exchange')
      AND target_id ~ '^pairing_[A-Za-z0-9_-]{16,128}$') OR
    (action_name IN ('room.create','room.mode.set','room_operator.sync')
      AND target_id ~ '^room_[A-Za-z0-9_-]{16,128}$') OR
    (action_name = 'room.binding.revoke' AND target_id ~ '^binding_[A-Za-z0-9_-]{16,128}$') OR
    (action_name IN ('projection.revoke','curation.admit','curation.unlist',
      'room_operator.projection.deliver') AND target_id ~ '^proj_[A-Za-z0-9_-]{16,128}$') OR
    (action_name = 'room_operator.ack' AND target_id ~ '^ack_[A-Za-z0-9_-]{16,128}$')
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__sync_window CHECK ((
    status = 'reserved' OR recovery_kind <> 'sync_window'
    OR (sync_after_sequence IS NOT NULL AND sync_high_water IS NOT NULL
      AND sync_replay_floor IS NOT NULL AND sync_result_kind IN ('event_batch','cursor_gone')
      AND sync_event_ids IS NOT NULL AND sync_event_sequences IS NOT NULL
      AND sync_event_kinds IS NOT NULL AND sync_object_ids IS NOT NULL
      AND sync_object_versions IS NOT NULL AND sync_event_hashes IS NOT NULL
      AND sync_event_committed_ats IS NOT NULL AND sync_tombstone_ids IS NOT NULL
      AND sync_tombstone_expires_ats IS NOT NULL
      AND sync_after_sequence >= 0 AND sync_replay_floor >= 1
      AND ((sync_result_kind = 'event_batch' AND sync_after_sequence >= sync_replay_floor - 1
          AND sync_high_water >= sync_after_sequence AND cardinality(sync_tombstone_ids) = 0)
        OR (sync_result_kind = 'cursor_gone' AND sync_after_sequence < sync_replay_floor - 1
          AND sync_high_water >= sync_replay_floor - 1))
      AND cardinality(sync_event_ids) <= 256 AND cardinality(sync_tombstone_ids) <= 256
      AND cardinality(sync_event_ids) = cardinality(sync_event_sequences)
      AND cardinality(sync_event_ids) = cardinality(sync_event_kinds)
      AND cardinality(sync_event_ids) = cardinality(sync_object_ids)
      AND cardinality(sync_event_ids) = cardinality(sync_object_versions)
      AND cardinality(sync_event_ids) = cardinality(sync_event_hashes)
      AND cardinality(sync_event_ids) = cardinality(sync_event_committed_ats)
      AND cardinality(sync_tombstone_ids) = cardinality(sync_tombstone_expires_ats)
      AND cardinality(sync_event_ids) = sync_high_water -
        CASE WHEN sync_result_kind = 'cursor_gone' THEN sync_replay_floor - 1
             ELSE sync_after_sequence END
      AND (cardinality(sync_event_sequences) = 0 OR (
        sync_event_sequences[1] =
          CASE WHEN sync_result_kind = 'cursor_gone' THEN sync_replay_floor
               ELSE sync_after_sequence + 1 END
        AND sync_event_sequences[cardinality(sync_event_sequences)] = sync_high_water
      ))
      AND array_position(sync_event_ids,NULL) IS NULL
      AND array_position(sync_event_sequences,NULL) IS NULL
      AND array_position(sync_event_kinds,NULL) IS NULL
      AND array_position(sync_object_ids,NULL) IS NULL
      AND array_position(sync_object_versions,NULL) IS NULL
      AND array_position(sync_event_hashes,NULL) IS NULL
      AND array_position(sync_event_committed_ats,NULL) IS NULL
      AND array_position(sync_tombstone_ids,NULL) IS NULL
      AND array_position(sync_tombstone_expires_ats,NULL) IS NULL
      AND sync_event_kinds <@ ARRAY[
        'room_created','room_mode_set','pairing_issued','pairing_exchanged','binding_revoked',
        'projection_delivered','projection_revoked','curation_admitted','curation_unlisted',
        'encounter_issued','interaction_accepted','interaction_deleted','local_purge_receipted'
      ]::text[]
      AND (cardinality(sync_event_ids) = 0 OR
        array_to_string(sync_event_ids,',') ~ '^event_[A-Za-z0-9_-]{16,128}(,event_[A-Za-z0-9_-]{16,128})*$')
      AND (cardinality(sync_object_ids) = 0 OR array_to_string(sync_object_ids,',') ~
        '^(room|pairing|binding|proj|encounter|interaction)_[A-Za-z0-9_-]{16,128}(,(room|pairing|binding|proj|encounter|interaction)_[A-Za-z0-9_-]{16,128})*$')
      AND (cardinality(sync_event_hashes) = 0 OR array_to_string(sync_event_hashes,',') ~
        '^sha256:[0-9a-f]{64}(,sha256:[0-9a-f]{64})*$')
      AND (cardinality(sync_event_committed_ats) = 0 OR array_to_string(sync_event_committed_ats,',') ~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z(,[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)*$')
      AND (cardinality(sync_tombstone_ids) = 0 OR array_to_string(sync_tombstone_ids,',') ~
        '^(proj|interaction)_[A-Za-z0-9_-]{16,128}(,(proj|interaction)_[A-Za-z0-9_-]{16,128})*$')
      AND (cardinality(sync_tombstone_expires_ats) = 0
        OR array_to_string(sync_tombstone_expires_ats,',') ~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z(,[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)*$')
      AND 0 < ALL(sync_event_sequences) AND 0 < ALL(sync_object_versions))
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__pull_recovery CHECK ((
    status = 'reserved' OR recovery_kind <> 'interaction_pull'
    OR (pull_interaction_id IS NOT NULL
      AND pull_request_field_version IS NOT NULL
      AND pull_body_hash IS NOT NULL
      AND pull_body_expires_at IS NOT NULL
      AND pull_interaction_id = target_id AND pull_request_field_version >= 1
      AND pull_body_hash ~ '^sha256:[0-9a-f]{64}$'
      AND ((pull_guest_field_version IS NULL AND pull_guest_hash IS NULL)
        OR (pull_guest_field_version IS NOT NULL AND pull_guest_hash IS NOT NULL
          AND pull_guest_field_version >= 1 AND pull_guest_hash ~ '^sha256:[0-9a-f]{64}$'))
      AND source_expires_at = pull_body_expires_at
      AND pull_terminal_state IS NULL)
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__pull_terminal CHECK ((
    status = 'reserved' OR recovery_kind <> 'pull_terminal'
    OR (http_status = 410 AND result_code = 'pull_terminal'
      AND pull_terminal_state IN (
        'interaction_deleted', 'origin_revoked', 'interaction_expired'
      ))
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__pairing_recovery CHECK ((
    status = 'reserved'
    OR (recovery_kind = 'pairing_issue' AND target_id IS NOT NULL AND related_target_id IS NULL)
    OR (recovery_kind = 'pairing_exchange' AND target_id IS NOT NULL
      AND related_target_id IS NOT NULL)
    OR (recovery_kind NOT IN ('pairing_issue', 'pairing_exchange')
      AND related_target_id IS NULL)
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__closed_shape CHECK ((
    (status = 'reserved' AND target_id IS NULL AND related_target_id IS NULL
      AND target_version IS NULL AND pull_interaction_id IS NULL
      AND pull_request_field_version IS NULL AND pull_body_hash IS NULL
      AND pull_guest_field_version IS NULL AND pull_guest_hash IS NULL
      AND pull_body_expires_at IS NULL AND pull_terminal_state IS NULL
      AND sync_after_sequence IS NULL AND sync_high_water IS NULL AND sync_replay_floor IS NULL
      AND sync_result_kind IS NULL AND sync_event_ids IS NULL AND sync_event_sequences IS NULL
      AND sync_event_kinds IS NULL AND sync_object_ids IS NULL AND sync_object_versions IS NULL
      AND sync_event_hashes IS NULL AND sync_event_committed_ats IS NULL
      AND sync_tombstone_ids IS NULL AND sync_tombstone_expires_ats IS NULL)
    OR (status = 'committed' AND (
      (recovery_kind IN ('body_free','pairing_issue','pairing_exchange')
        AND sync_after_sequence IS NULL AND sync_high_water IS NULL AND sync_replay_floor IS NULL
        AND sync_result_kind IS NULL AND sync_event_ids IS NULL AND sync_event_sequences IS NULL
        AND sync_event_kinds IS NULL AND sync_object_ids IS NULL AND sync_object_versions IS NULL
        AND sync_event_hashes IS NULL AND sync_event_committed_ats IS NULL
        AND sync_tombstone_ids IS NULL AND sync_tombstone_expires_ats IS NULL
        AND pull_interaction_id IS NULL AND pull_request_field_version IS NULL
        AND pull_body_hash IS NULL AND pull_guest_field_version IS NULL
        AND pull_guest_hash IS NULL AND pull_body_expires_at IS NULL
        AND pull_terminal_state IS NULL)
      OR (recovery_kind = 'sync_window' AND related_target_id IS NULL
        AND pull_interaction_id IS NULL AND pull_request_field_version IS NULL
        AND pull_body_hash IS NULL AND pull_guest_field_version IS NULL
        AND pull_guest_hash IS NULL AND pull_body_expires_at IS NULL
        AND pull_terminal_state IS NULL)
      OR (recovery_kind = 'interaction_pull' AND related_target_id IS NULL
        AND sync_after_sequence IS NULL AND sync_high_water IS NULL AND sync_replay_floor IS NULL
        AND sync_result_kind IS NULL AND sync_event_ids IS NULL AND sync_event_sequences IS NULL
        AND sync_event_kinds IS NULL AND sync_object_ids IS NULL AND sync_object_versions IS NULL
        AND sync_event_hashes IS NULL AND sync_event_committed_ats IS NULL
        AND sync_tombstone_ids IS NULL AND sync_tombstone_expires_ats IS NULL
        AND pull_terminal_state IS NULL)
      OR (recovery_kind = 'pull_terminal' AND related_target_id IS NULL
        AND sync_after_sequence IS NULL AND sync_high_water IS NULL AND sync_replay_floor IS NULL
        AND sync_result_kind IS NULL AND sync_event_ids IS NULL AND sync_event_sequences IS NULL
        AND sync_event_kinds IS NULL AND sync_object_ids IS NULL AND sync_object_versions IS NULL
        AND sync_event_hashes IS NULL AND sync_event_committed_ats IS NULL
        AND sync_tombstone_ids IS NULL AND sync_tombstone_expires_ats IS NULL
        AND pull_interaction_id IS NULL AND pull_request_field_version IS NULL
        AND pull_body_hash IS NULL AND pull_guest_field_version IS NULL
        AND pull_guest_hash IS NULL AND pull_body_expires_at IS NULL
        AND pull_terminal_state IS NOT NULL)
    ))
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__retention CHECK ((
    created_at < expires_at AND expires_at <= created_at + interval '37 days'
    AND ((status = 'reserved' AND source_expires_at IS NULL
          AND expires_at = created_at + interval '37 days')
      OR (status = 'committed' AND source_expires_at = expires_at
        AND committed_at >= created_at AND committed_at < expires_at
        AND ((recovery_kind IN ('pairing_issue','pairing_exchange')
              AND expires_at <= created_at + interval '10 minutes')
          OR (recovery_kind IN ('sync_window','interaction_pull','pull_terminal')
              AND expires_at <= created_at + interval '37 days')
          OR (recovery_kind = 'body_free'
              AND expires_at = created_at + interval '37 days'))))
  ) IS TRUE),
  CONSTRAINT ck_mutation_receipts__target_version CHECK (target_version IS NULL OR target_version >= 1)
);

CREATE TABLE forme_r4_public_core.event_acks (
  ack_id text CONSTRAINT pk_event_acks PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  binding_id text NOT NULL,
  event_id text NOT NULL,
  sequence bigint NOT NULL,
  event_hash text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  acked_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT uq_event_acks__semantic UNIQUE (binding_id, event_id, sequence, event_hash),
  CONSTRAINT fk_event_acks__binding FOREIGN KEY (binding_id, room_id)
    REFERENCES forme_r4_public_core.room_bindings (binding_id, room_id),
  CONSTRAINT fk_event_acks__event FOREIGN KEY (event_id, room_id, sequence, event_hash)
    REFERENCES forme_r4_public_core.room_events (event_id, room_id, sequence, event_hash),
  CONSTRAINT fk_event_acks__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_event_acks__ids CHECK (
    ack_id ~ '^ack_[A-Za-z0-9_-]{16,128}$'
    AND binding_id ~ '^binding_[A-Za-z0-9_-]{16,128}$'
    AND event_id ~ '^event_[A-Za-z0-9_-]{16,128}$'
  ),
  CONSTRAINT ck_event_acks__version CHECK (version >= 1)
);

CREATE TABLE forme_r4_public_core.encryption_nonces (
  key_version text NOT NULL,
  nonce bytea NOT NULL,
  table_name text NOT NULL,
  row_id text NOT NULL,
  column_name text NOT NULL,
  field_version integer NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT pk_encryption_nonces PRIMARY KEY (key_version, nonce),
  CONSTRAINT uq_encryption_nonces__field UNIQUE (
    table_name, row_id, column_name, field_version
  ),
  CONSTRAINT ck_encryption_nonces__nonce CHECK (octet_length(nonce) = 12),
  CONSTRAINT ck_encryption_nonces__key_version CHECK (key_version ~ '^keyv_[a-f0-9]{32}$'),
  CONSTRAINT ck_encryption_nonces__field_version CHECK (field_version >= 1),
  CONSTRAINT ck_encryption_nonces__closed_field CHECK (
    (table_name = 'rooms' AND column_name = 'label_ciphertext'
      AND row_id ~ '^room_[A-Za-z0-9_-]{16,128}$')
    OR (table_name = 'projections' AND column_name = 'capsule_ciphertext'
      AND row_id ~ '^proj_[A-Za-z0-9_-]{16,128}$')
    OR (table_name = 'pairing_challenges' AND column_name IN (
      'pairing_code_ciphertext', 'exchange_envelope_ciphertext'
    ) AND row_id ~ '^pairing_[A-Za-z0-9_-]{16,128}$')
    OR (table_name = 'interactions' AND column_name IN (
      'request_ciphertext', 'guest_capsule_ciphertext'
    ) AND row_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$')
  )
);

CREATE TABLE forme_r4_public_core.purge_jobs (
  purge_job_id text CONSTRAINT pk_purge_jobs PRIMARY KEY,
  room_id text NOT NULL,
  installation_id text NOT NULL,
  target_kind text NOT NULL,
  target_object_id text NOT NULL,
  target_field_version integer NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz(3) NOT NULL DEFAULT transaction_timestamp(),
  due_at timestamptz(3) NOT NULL,
  claimed_at timestamptz(3) NULL,
  completed_at timestamptz(3) NULL,
  CONSTRAINT uq_purge_jobs__target UNIQUE (target_kind, target_object_id, target_field_version),
  CONSTRAINT fk_purge_jobs__room FOREIGN KEY (room_id, installation_id)
    REFERENCES forme_r4_public_core.rooms (room_id, installation_id),
  CONSTRAINT ck_purge_jobs__id CHECK (purge_job_id ~ '^purge_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_purge_jobs__target CHECK (
    target_kind IN (
      'pairing_material', 'public_encounter', 'projection_body',
      'interaction_body', 'rate_event', 'room_event', 'mutation_receipt',
      'interaction_tombstone'
    )
    AND (
      (target_kind = 'pairing_material'
        AND target_object_id ~ '^pairing_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind = 'public_encounter'
        AND target_object_id ~ '^encounter_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind = 'projection_body'
        AND target_object_id ~ '^proj_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind IN ('interaction_body','interaction_tombstone')
        AND target_object_id ~ '^interaction_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind = 'rate_event'
        AND target_object_id ~ '^rate_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind = 'room_event'
        AND target_object_id ~ '^event_[A-Za-z0-9_-]{16,128}$')
      OR (target_kind = 'mutation_receipt'
        AND target_object_id ~ '^receipt_[A-Za-z0-9_-]{16,128}$')
    )
  ),
  CONSTRAINT ck_purge_jobs__state CHECK (state IN ('pending', 'claimed', 'completed', 'failed')),
  CONSTRAINT ck_purge_jobs__attempts CHECK (attempt_count BETWEEN 0 AND 100),
  CONSTRAINT ck_purge_jobs__deadline CHECK (
    created_at <= due_at AND due_at < created_at + interval '24 hours'
  ),
  CONSTRAINT ck_purge_jobs__completion CHECK ((state = 'completed') = (completed_at IS NOT NULL)),
  CONSTRAINT ck_purge_jobs__field_version CHECK (target_field_version >= 1)
);

CREATE TABLE forme_r4_public_core.retention_health (
  health_id text CONSTRAINT pk_retention_health PRIMARY KEY,
  singleton_slot boolean NOT NULL DEFAULT true,
  last_run_started_at timestamptz(3) NULL,
  last_successful_purge_at timestamptz(3) NOT NULL,
  last_run_completed_at timestamptz(3) NULL,
  last_failure_code text NULL,
  version bigint NOT NULL DEFAULT 1,
  CONSTRAINT uq_retention_health__singleton UNIQUE (singleton_slot),
  CONSTRAINT ck_retention_health__singleton CHECK (singleton_slot),
  CONSTRAINT ck_retention_health__id CHECK (health_id ~ '^retention_[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT ck_retention_health__version CHECK (version >= 1),
  CONSTRAINT ck_retention_health__failure_code CHECK (
    last_failure_code IS NULL OR last_failure_code ~ '^[a-z][a-z0-9_]{0,95}$'
  )
);

CREATE INDEX ix_projections__public_discovery
  ON forme_r4_public_core.projections (room_id, curation_state, fresh_until, expires_at)
  WHERE current AND body_readable;
CREATE INDEX ix_pairing_challenges__expiry
  ON forme_r4_public_core.pairing_challenges (room_id, expires_at)
  WHERE state = 'issued';
CREATE INDEX ix_room_bindings__current
  ON forme_r4_public_core.room_bindings (room_id, expires_at)
  WHERE state = 'current';
CREATE INDEX ix_public_encounters__active
  ON forme_r4_public_core.public_encounters (room_id, projection_id, expires_at)
  WHERE state = 'issued';
CREATE INDEX ix_interactions__unresolved_pool
  ON forme_r4_public_core.interactions (room_id, created_at, interaction_id)
  WHERE state IN ('accepted', 'seen_locally');
CREATE INDEX ix_room_events__replay
  ON forme_r4_public_core.room_events (room_id, sequence);
CREATE INDEX ix_mutation_receipts__expiry
  ON forme_r4_public_core.mutation_receipts (expires_at);
CREATE INDEX ix_purge_jobs__bounded_batch
  ON forme_r4_public_core.purge_jobs (state, due_at, purge_job_id COLLATE "C")
  WHERE state IN ('pending', 'failed');

-- Persist the exact catalog shape produced by these hash-pinned bytes. The
-- source-contract digest is independently pinned by the adapter, verifier,
-- rollback guard, and static tests; it is not learned back from this mutable
-- comment. The target PostgreSQL major owns the catalog-md5 canonical deparse.
DO $catalog_manifest$
DECLARE
  manifest_digest text;
BEGIN
  SELECT pg_catalog.md5(string_agg(signature, E'\n' ORDER BY signature))
    INTO manifest_digest
    FROM (
      SELECT 'relation|' || c.relname || '|' || c.relkind || '|' || c.relpersistence || '|' ||
             c.relispartition::text || '|' || c.relrowsecurity::text || '|' ||
             c.relforcerowsecurity::text AS signature
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'forme_r4_public_core'
      UNION ALL
      SELECT 'column|' || c.relname || '|' || a.attnum::text || '|' || a.attname || '|' ||
             t.typname || '|' || a.atttypmod::text || '|' || a.attnotnull::text || '|' ||
             a.attidentity || '|' || a.attgenerated || '|' ||
             COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid, false), '-')
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       WHERE n.nspname = 'forme_r4_public_core'
         AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      UNION ALL
      SELECT 'constraint|' || owner.relname || '|' || constraint_row.conname || '|' ||
             constraint_row.contype || '|' || constraint_row.condeferrable::text || '|' ||
             constraint_row.condeferred::text || '|' || constraint_row.convalidated::text || '|' ||
             constraint_row.connoinherit::text || '|' ||
             pg_catalog.pg_get_constraintdef(constraint_row.oid, false)
        FROM pg_catalog.pg_constraint constraint_row
        JOIN pg_catalog.pg_class owner ON owner.oid = constraint_row.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
       WHERE n.nspname = 'forme_r4_public_core'
      UNION ALL
      SELECT 'index|' || owner.relname || '|' || idx.relname || '|' || access_method.amname || '|' ||
             index_row.indisunique::text || '|' || index_row.indisprimary::text || '|' ||
             index_row.indisvalid::text || '|' || index_row.indisready::text || '|' ||
             index_row.indislive::text || '|' || index_row.indisclustered::text || '|' ||
             index_row.indisreplident::text || '|' ||
             pg_catalog.pg_get_indexdef(index_row.indexrelid)
        FROM pg_catalog.pg_index index_row
        JOIN pg_catalog.pg_class idx ON idx.oid = index_row.indexrelid
        JOIN pg_catalog.pg_class owner ON owner.oid = index_row.indrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
        JOIN pg_catalog.pg_am access_method ON access_method.oid = idx.relam
       WHERE n.nspname = 'forme_r4_public_core'
      UNION ALL
      SELECT 'type|' || item.typname || '|' || item.typtype || '|' || item.typcategory
        FROM pg_catalog.pg_type item
        JOIN pg_catalog.pg_namespace n ON n.oid = item.typnamespace
       WHERE n.nspname = 'forme_r4_public_core'
    ) catalog_rows;

  EXECUTE pg_catalog.format(
    'COMMENT ON SCHEMA forme_r4_public_core IS %L',
    'r4.public-core.catalog-manifest.v2:contract-sha256:' ||
      '2eebb5f582d67b35d11f49b69edeff5fcecf39ee24cfa15b4575b794b5f14559' ||
      ':catalog-md5:' || manifest_digest
  );
END
$catalog_manifest$;

-- These two rows establish exactly one installation slot and one janitor
-- watermark. They carry no credential, body, Room, Projection, or Guest data.
INSERT INTO forme_r4_public_core.installation (
  installation_id, third_place_id, entity_id, config_lineage_hash
) VALUES (
  'installation_forme_public_core_v1',
  'thirdplace_forme_public_core_v1',
  'entity_forme_public_core_v1',
  'sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31'
);

INSERT INTO forme_r4_public_core.retention_health (
  health_id, last_successful_purge_at
) VALUES (
  'retention_health_public_core_v1',
  transaction_timestamp()
);

COMMIT;
