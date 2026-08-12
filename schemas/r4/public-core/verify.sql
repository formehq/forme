-- R4 #67 Durable Public Core proposed verification.
-- Read-only by contract; Physical Rebind must hash-pin these bytes before any
-- use. Gate C is not requested.

BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path = pg_catalog, forme_r4_public_core;

DO $verify$
DECLARE
  actual_tables text[];
  actual_indexes text[];
  actual_constraints text[];
  actual_encrypted_fields text[];
  actual_catalog_manifest text;
  stored_catalog_manifest text;
  expected_catalog_contract_sha256 constant text :=
    'sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4';
  expected_tables constant text[] := ARRAY[
    'encryption_nonces',
    'event_acks',
    'installation',
    'interactions',
    'mutation_receipts',
    'pairing_challenges',
    'projections',
    'public_encounters',
    'purge_jobs',
    'rate_events',
    'retention_health',
    'room_bindings',
    'room_events',
    'rooms'
  ];
  expected_indexes constant text[] := ARRAY[
    'ix_interactions__unresolved_pool', 'ix_mutation_receipts__expiry',
    'ix_pairing_challenges__expiry', 'ix_projections__public_discovery',
    'ix_public_encounters__active', 'ix_purge_jobs__bounded_batch',
    'ix_room_bindings__current', 'ix_room_events__replay',
    'pk_encryption_nonces', 'pk_event_acks', 'pk_installation', 'pk_interactions',
    'pk_mutation_receipts', 'pk_pairing_challenges', 'pk_projections',
    'pk_public_encounters', 'pk_purge_jobs', 'pk_rate_events',
    'pk_retention_health', 'pk_room_bindings', 'pk_room_events', 'pk_rooms',
    'uq_encryption_nonces__field', 'uq_event_acks__semantic',
    'uq_installation__singleton', 'uq_interactions__consumed_lineage',
    'uq_interactions__encounter', 'uq_interactions__room_scope',
    'uq_mutation_receipts__idempotency',
    'uq_pairing_challenges__room_scope', 'uq_projections__full_scope',
    'uq_projections__one_current', 'uq_projections__publication_approval',
    'uq_projections__room_scope', 'uq_public_encounters__room_projection',
    'uq_purge_jobs__target', 'uq_rate_events__ordinal', 'uq_rate_events__room_scope',
    'uq_retention_health__singleton', 'uq_room_bindings__room_scope',
    'uq_room_events__ack_scope', 'uq_room_events__sequence',
    'uq_rooms__scope', 'uq_rooms__singleton'
  ];
  expected_constraint_csv constant text :=
    'encryption_nonces|ck_encryption_nonces__closed_field|c,encryption_nonces|ck_encryption_nonces__field_version|c,encryption_nonces|ck_encryption_nonces__key_version|c,encryption_nonces|ck_encryption_nonces__nonce|c,encryption_nonces|pk_encryption_nonces|p,encryption_nonces|uq_encryption_nonces__field|u' || ',' ||
    'event_acks|ck_event_acks__ids|c,event_acks|ck_event_acks__version|c,event_acks|fk_event_acks__binding|f,event_acks|fk_event_acks__event|f,event_acks|fk_event_acks__room|f,event_acks|pk_event_acks|p,event_acks|uq_event_acks__semantic|u' || ',' ||
    'installation|ck_installation__ids|c,installation|ck_installation__lineage|c,installation|ck_installation__singleton|c,installation|ck_installation__version|c,installation|pk_installation|p,installation|uq_installation__singleton|u' || ',' ||
    'interactions|ck_interactions__deleted|c,interactions|ck_interactions__field_versions|c,interactions|ck_interactions__guest_cipher|c,interactions|ck_interactions__hashes|c,interactions|ck_interactions__ids|c,interactions|ck_interactions__local_purge|c,interactions|ck_interactions__plaintext_sizes|c,interactions|ck_interactions__purged|c,interactions|ck_interactions__request_cipher|c,interactions|ck_interactions__retention|c,interactions|ck_interactions__secret_digests|c,interactions|ck_interactions__state|c,interactions|ck_interactions__terminal_body|c,interactions|ck_interactions__type|c,interactions|ck_interactions__version|c,interactions|fk_interactions__origin_projection|f,interactions|fk_interactions__room|f,interactions|pk_interactions|p,interactions|uq_interactions__consumed_lineage|u,interactions|uq_interactions__encounter|u,interactions|uq_interactions__room_scope|u' || ',' ||
    'mutation_receipts|ck_mutation_receipts__action|c,mutation_receipts|ck_mutation_receipts__actor_action|c,mutation_receipts|ck_mutation_receipts__actor|c,mutation_receipts|ck_mutation_receipts__closed_shape|c,mutation_receipts|ck_mutation_receipts__idempotency_key|c,mutation_receipts|ck_mutation_receipts__ids|c,mutation_receipts|ck_mutation_receipts__pairing_recovery|c,mutation_receipts|ck_mutation_receipts__pull_recovery|c,mutation_receipts|ck_mutation_receipts__pull_terminal|c,mutation_receipts|ck_mutation_receipts__recovery_action|c,mutation_receipts|ck_mutation_receipts__recovery|c,mutation_receipts|ck_mutation_receipts__request_hash|c,mutation_receipts|ck_mutation_receipts__result_contract|c,mutation_receipts|ck_mutation_receipts__retention|c,mutation_receipts|ck_mutation_receipts__scope_digest|c,mutation_receipts|ck_mutation_receipts__status|c,mutation_receipts|ck_mutation_receipts__sync_window|c,mutation_receipts|ck_mutation_receipts__target_kind|c,mutation_receipts|ck_mutation_receipts__target_version|c,mutation_receipts|ck_mutation_receipts__terminal|c,mutation_receipts|fk_mutation_receipts__room|f,mutation_receipts|pk_mutation_receipts|p,mutation_receipts|uq_mutation_receipts__idempotency|u' || ',' ||
    'pairing_challenges|ck_pairing_challenges__chronology|c,pairing_challenges|ck_pairing_challenges__client_key|c,pairing_challenges|ck_pairing_challenges__digest|c,pairing_challenges|ck_pairing_challenges__exchange_cipher|c,pairing_challenges|ck_pairing_challenges__field_versions|c,pairing_challenges|ck_pairing_challenges__id|c,pairing_challenges|ck_pairing_challenges__pairing_cipher|c,pairing_challenges|ck_pairing_challenges__plaintext_sizes|c,pairing_challenges|ck_pairing_challenges__state|c,pairing_challenges|ck_pairing_challenges__terminal_clear|c,pairing_challenges|ck_pairing_challenges__version|c,pairing_challenges|fk_pairing_challenges__room|f,pairing_challenges|pk_pairing_challenges|p,pairing_challenges|uq_pairing_challenges__room_scope|u' || ',' ||
    'projections|ck_projections__capsule_cipher|c,projections|ck_projections__capsule_size|c,projections|ck_projections__chronology|c,projections|ck_projections__curation_state|c,projections|ck_projections__current|c,projections|ck_projections__field_version|c,projections|ck_projections__hashes|c,projections|ck_projections__ids|c,projections|ck_projections__owner_state|c,projections|ck_projections__purged|c,projections|ck_projections__terminal_body|c,projections|ck_projections__terminal_time|c,projections|fk_projections__room|f,projections|pk_projections|p,projections|uq_projections__full_scope|u,projections|uq_projections__publication_approval|u,projections|uq_projections__room_scope|u' || ',' ||
    'public_encounters|ck_public_encounters__bucket|c,public_encounters|ck_public_encounters__chronology|c,public_encounters|ck_public_encounters__consumption|c,public_encounters|ck_public_encounters__ids|c,public_encounters|ck_public_encounters__invalidation|c,public_encounters|ck_public_encounters__secret|c,public_encounters|ck_public_encounters__state|c,public_encounters|ck_public_encounters__version|c,public_encounters|fk_public_encounters__consumed_interaction|f,public_encounters|fk_public_encounters__daily_rate|f,public_encounters|fk_public_encounters__hourly_rate|f,public_encounters|fk_public_encounters__projection|f,public_encounters|pk_public_encounters|p,public_encounters|uq_public_encounters__room_projection|u' || ',' ||
    'purge_jobs|ck_purge_jobs__attempts|c,purge_jobs|ck_purge_jobs__completion|c,purge_jobs|ck_purge_jobs__deadline|c,purge_jobs|ck_purge_jobs__field_version|c,purge_jobs|ck_purge_jobs__id|c,purge_jobs|ck_purge_jobs__state|c,purge_jobs|ck_purge_jobs__target|c,purge_jobs|fk_purge_jobs__room|f,purge_jobs|pk_purge_jobs|p,purge_jobs|uq_purge_jobs__target|u' || ',' ||
    'rate_events|ck_rate_events__digest|c,rate_events|ck_rate_events__id|c,rate_events|ck_rate_events__kind|c,rate_events|ck_rate_events__limit|c,rate_events|ck_rate_events__retention|c,rate_events|ck_rate_events__window|c,rate_events|fk_rate_events__room|f,rate_events|pk_rate_events|p,rate_events|uq_rate_events__ordinal|u,rate_events|uq_rate_events__room_scope|u' || ',' ||
    'retention_health|ck_retention_health__failure_code|c,retention_health|ck_retention_health__id|c,retention_health|ck_retention_health__singleton|c,retention_health|ck_retention_health__version|c,retention_health|pk_retention_health|p,retention_health|uq_retention_health__singleton|u' || ',' ||
    'room_bindings|ck_room_bindings__bundle|c,room_bindings|ck_room_bindings__chronology|c,room_bindings|ck_room_bindings__credential|c,room_bindings|ck_room_bindings__id|c,room_bindings|ck_room_bindings__revocation|c,room_bindings|ck_room_bindings__state|c,room_bindings|ck_room_bindings__version|c,room_bindings|fk_room_bindings__room|f,room_bindings|pk_room_bindings|p,room_bindings|uq_room_bindings__room_scope|u' || ',' ||
    'room_events|ck_room_events__hash|c,room_events|ck_room_events__id|c,room_events|ck_room_events__kind|c,room_events|ck_room_events__object_id|c,room_events|ck_room_events__object_version|c,room_events|ck_room_events__retention|c,room_events|ck_room_events__sequence|c,room_events|fk_room_events__room|f,room_events|pk_room_events|p,room_events|uq_room_events__ack_scope|u,room_events|uq_room_events__sequence|u' || ',' ||
    'rooms|ck_rooms__active|c,rooms|ck_rooms__closed_at|c,rooms|ck_rooms__event_floor|c,rooms|ck_rooms__high_water|c,rooms|ck_rooms__id|c,rooms|ck_rooms__kind|c,rooms|ck_rooms__label_cipher|c,rooms|ck_rooms__label_field_version|c,rooms|ck_rooms__label_size|c,rooms|ck_rooms__mode|c,rooms|ck_rooms__singleton|c,rooms|ck_rooms__version|c,rooms|fk_rooms__current_projection|f,rooms|fk_rooms__installation|f,rooms|pk_rooms|p,rooms|uq_rooms__scope|u,rooms|uq_rooms__singleton|u';
  expected_key_constraint_csv constant text :=
    'encryption_nonces|pk_encryption_nonces|p|key_version+nonce,encryption_nonces|uq_encryption_nonces__field|u|table_name+row_id+column_name+field_version,event_acks|pk_event_acks|p|ack_id,event_acks|uq_event_acks__semantic|u|binding_id+event_id+sequence+event_hash,installation|pk_installation|p|installation_id,installation|uq_installation__singleton|u|singleton_slot,interactions|pk_interactions|p|interaction_id,interactions|uq_interactions__consumed_lineage|u|interaction_id+encounter_id+room_id+origin_projection_id,interactions|uq_interactions__encounter|u|encounter_id,interactions|uq_interactions__room_scope|u|interaction_id+room_id,mutation_receipts|pk_mutation_receipts|p|receipt_id,mutation_receipts|uq_mutation_receipts__idempotency|u|actor_scope_digest+action_name+idempotency_key,pairing_challenges|pk_pairing_challenges|p|pairing_id,pairing_challenges|uq_pairing_challenges__room_scope|u|pairing_id+room_id,projections|pk_projections|p|projection_id,projections|uq_projections__full_scope|u|projection_id+room_id+installation_id,projections|uq_projections__publication_approval|u|publication_approval_id,projections|uq_projections__room_scope|u|projection_id+room_id,public_encounters|pk_public_encounters|p|encounter_id,public_encounters|uq_public_encounters__room_projection|u|encounter_id+room_id+projection_id,purge_jobs|pk_purge_jobs|p|purge_job_id,purge_jobs|uq_purge_jobs__target|u|target_kind+target_object_id+target_field_version,rate_events|pk_rate_events|p|rate_event_id,rate_events|uq_rate_events__ordinal|u|room_id+bucket_kind+bucket_digest+window_start+event_ordinal,rate_events|uq_rate_events__room_scope|u|rate_event_id+room_id,retention_health|pk_retention_health|p|health_id,retention_health|uq_retention_health__singleton|u|singleton_slot,room_bindings|pk_room_bindings|p|binding_id,room_bindings|uq_room_bindings__room_scope|u|binding_id+room_id,room_events|pk_room_events|p|event_id,room_events|uq_room_events__ack_scope|u|event_id+room_id+sequence+event_hash,room_events|uq_room_events__sequence|u|room_id+sequence,rooms|pk_rooms|p|room_id,rooms|uq_rooms__scope|u|room_id+installation_id,rooms|uq_rooms__singleton|u|singleton_slot';
  expected_foreign_key_csv constant text :=
    'event_acks|fk_event_acks__binding|binding_id+room_id|room_bindings|binding_id+room_id|N|N,event_acks|fk_event_acks__event|event_id+room_id+sequence+event_hash|room_events|event_id+room_id+sequence+event_hash|N|N,event_acks|fk_event_acks__room|room_id+installation_id|rooms|room_id+installation_id|N|N,interactions|fk_interactions__origin_projection|origin_projection_id+room_id+installation_id|projections|projection_id+room_id+installation_id|N|N,interactions|fk_interactions__room|room_id+installation_id|rooms|room_id+installation_id|N|N,mutation_receipts|fk_mutation_receipts__room|room_id|rooms|room_id|D|I,pairing_challenges|fk_pairing_challenges__room|room_id+installation_id|rooms|room_id+installation_id|N|N,projections|fk_projections__room|room_id+installation_id|rooms|room_id+installation_id|N|N,public_encounters|fk_public_encounters__consumed_interaction|consumed_interaction_id+encounter_id+room_id+projection_id|interactions|interaction_id+encounter_id+room_id+origin_projection_id|D|I,public_encounters|fk_public_encounters__daily_rate|daily_rate_event_id+room_id|rate_events|rate_event_id+room_id|N|N,public_encounters|fk_public_encounters__hourly_rate|hourly_rate_event_id+room_id|rate_events|rate_event_id+room_id|N|N,public_encounters|fk_public_encounters__projection|projection_id+room_id+installation_id|projections|projection_id+room_id+installation_id|N|N,purge_jobs|fk_purge_jobs__room|room_id+installation_id|rooms|room_id+installation_id|N|N,rate_events|fk_rate_events__room|room_id+installation_id|rooms|room_id+installation_id|N|N,room_bindings|fk_room_bindings__room|room_id+installation_id|rooms|room_id+installation_id|N|N,room_events|fk_room_events__room|room_id+installation_id|rooms|room_id+installation_id|N|N,rooms|fk_rooms__current_projection|current_projection_id+room_id|projections|projection_id+room_id|D|I,rooms|fk_rooms__installation|installation_id|installation|installation_id|N|N';
  expected_explicit_index_csv constant text :=
    'interactions|ix_interactions__unresolved_pool|N|room_id+created_at+interaction_id,mutation_receipts|ix_mutation_receipts__expiry|N|expires_at,pairing_challenges|ix_pairing_challenges__expiry|N|room_id+expires_at,projections|ix_projections__public_discovery|N|room_id+curation_state+fresh_until+expires_at,projections|uq_projections__one_current|U|room_id,public_encounters|ix_public_encounters__active|N|room_id+projection_id+expires_at,purge_jobs|ix_purge_jobs__bounded_batch|N|state+due_at+purge_job_id,room_bindings|ix_room_bindings__current|N|room_id+expires_at,room_events|ix_room_events__replay|N|room_id+sequence';
BEGIN
  SELECT array_agg(table_name::text ORDER BY table_name)
    INTO actual_tables
    FROM information_schema.tables
    WHERE table_schema = 'forme_r4_public_core'
      AND table_type = 'BASE TABLE';

  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_table_inventory_drift';
  END IF;

  SELECT array_agg(indexname::text ORDER BY indexname)
    INTO actual_indexes FROM pg_catalog.pg_indexes
   WHERE schemaname = 'forme_r4_public_core';
  IF actual_indexes IS DISTINCT FROM expected_indexes THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_index_inventory_drift';
  END IF;

  SELECT array_agg(
           (owner.relname || '|' || c.conname || '|' || c.contype)::text
           ORDER BY owner.relname, c.conname
         )
    INTO actual_constraints
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
   WHERE n.nspname = 'forme_r4_public_core';

  IF actual_constraints IS DISTINCT FROM string_to_array(expected_constraint_csv, ',') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_constraint_inventory_drift';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (NOT c.convalidated OR NOT c.conislocal OR c.coninhcount <> 0
         OR pg_catalog.pg_get_constraintdef(c.oid, false) IS NULL)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_constraint_definition_drift';
  END IF;

  IF (
    SELECT array_agg(signature ORDER BY signature)
      FROM (
        SELECT owner.relname || '|' || c.conname || '|' || c.contype || '|' ||
               array_to_string(ARRAY(
                 SELECT a.attname
                   FROM unnest(c.conkey) WITH ORDINALITY key(attnum, ordinal)
                   JOIN pg_catalog.pg_attribute a
                     ON a.attrelid = c.conrelid AND a.attnum = key.attnum
                  ORDER BY key.ordinal
               ), '+') AS signature
          FROM pg_catalog.pg_constraint c
          JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
          JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
         WHERE n.nspname = 'forme_r4_public_core'
           AND c.contype IN ('p', 'u')
      ) key_constraints
  ) IS DISTINCT FROM string_to_array(expected_key_constraint_csv, ',') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_key_constraint_definition_drift';
  END IF;

  IF (
    SELECT array_agg(signature ORDER BY signature)
      FROM (
        SELECT owner.relname || '|' || c.conname || '|' ||
               array_to_string(ARRAY(
                 SELECT a.attname
                   FROM unnest(c.conkey) WITH ORDINALITY key(attnum, ordinal)
                   JOIN pg_catalog.pg_attribute a
                     ON a.attrelid = c.conrelid AND a.attnum = key.attnum
                  ORDER BY key.ordinal
               ), '+') || '|' || referenced.relname || '|' ||
               array_to_string(ARRAY(
                 SELECT a.attname
                   FROM unnest(c.confkey) WITH ORDINALITY key(attnum, ordinal)
                   JOIN pg_catalog.pg_attribute a
                     ON a.attrelid = c.confrelid AND a.attnum = key.attnum
                  ORDER BY key.ordinal
               ), '+') || '|' ||
               CASE WHEN c.condeferrable THEN 'D' ELSE 'N' END || '|' ||
               CASE WHEN c.condeferred THEN 'I' ELSE 'N' END AS signature
          FROM pg_catalog.pg_constraint c
          JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
          JOIN pg_catalog.pg_class referenced ON referenced.oid = c.confrelid
          JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
         WHERE n.nspname = 'forme_r4_public_core'
           AND c.contype = 'f'
      ) foreign_keys
  ) IS DISTINCT FROM string_to_array(expected_foreign_key_csv, ',') OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND c.contype = 'f'
       AND (c.confmatchtype <> 's' OR c.confupdtype <> 'a' OR c.confdeltype <> 'a')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_foreign_key_definition_drift';
  END IF;

  IF (
    SELECT array_agg(signature ORDER BY signature)
      FROM (
        SELECT owner.relname || '|' || idx.relname || '|' ||
               CASE WHEN i.indisunique THEN 'U' ELSE 'N' END || '|' ||
               array_to_string(ARRAY(
                 SELECT a.attname
                   FROM unnest(i.indkey) WITH ORDINALITY key(attnum, ordinal)
                   JOIN pg_catalog.pg_attribute a
                     ON a.attrelid = i.indrelid AND a.attnum = key.attnum
                  ORDER BY key.ordinal
               ), '+') AS signature
          FROM pg_catalog.pg_index i
          JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
          JOIN pg_catalog.pg_class owner ON owner.oid = i.indrelid
          JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
          LEFT JOIN pg_catalog.pg_constraint c ON c.conindid = i.indexrelid
         WHERE n.nspname = 'forme_r4_public_core'
           AND c.oid IS NULL
      ) explicit_indexes
  ) IS DISTINCT FROM string_to_array(expected_explicit_index_csv, ',') OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_catalog.pg_class owner ON owner.oid = i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
      JOIN pg_catalog.pg_am am ON am.oid = idx.relam
     WHERE n.nspname = 'forme_r4_public_core'
       AND (
         am.amname <> 'btree'
         OR NOT i.indisvalid OR NOT i.indisready OR NOT i.indislive
         OR i.indisclustered OR i.indisreplident
         OR i.indnatts <> i.indnkeyatts
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_index_definition_drift';
  END IF;

  IF (
    SELECT count(*) FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = idx.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND i.indpred IS NOT NULL
  ) <> 7 OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = idx.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (
         (idx.relname IN (
           'uq_projections__one_current', 'ix_projections__public_discovery',
           'ix_pairing_challenges__expiry', 'ix_room_bindings__current',
           'ix_public_encounters__active', 'ix_interactions__unresolved_pool',
           'ix_purge_jobs__bounded_batch'
         ) AND i.indpred IS NULL)
         OR (idx.relname IN (
           'ix_room_events__replay', 'ix_mutation_receipts__expiry'
         ) AND i.indpred IS NOT NULL)
       )
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_catalog.pg_attribute a
        ON a.attrelid = i.indrelid AND a.attname = 'purge_job_id'
     WHERE idx.relname = 'ix_purge_jobs__bounded_batch'
       AND i.indcollation[2] = '"C"'::pg_catalog.regcollation
       AND i.indkey[2] = a.attnum
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_index_predicate_or_collation_drift';
  END IF;

  IF EXISTS (
    WITH expected(table_name, fingerprint) AS (VALUES
      ('installation', '1:installation_id:text:-1:N:-|2:singleton_slot:boolean:-1:N:true|3:third_place_id:text:-1:N:-|4:entity_id:text:-1:N:-|5:config_lineage_hash:text:-1:N:-|6:version:bigint:-1:N:1|7:created_at:timestamptz:3:N:transaction_timestamp()'),
      ('rooms', '1:room_id:text:-1:N:-|2:installation_id:text:-1:N:-|3:singleton_slot:boolean:-1:N:true|4:room_kind:text:-1:N:''third_place_public''::text|5:interaction_mode:text:-1:N:''closed''::text|6:active:boolean:-1:N:true|7:label_ciphertext:jsonb:-1:N:-|8:label_plaintext_bytes:integer:-1:N:-|9:label_field_version:integer:-1:N:1|10:current_projection_id:text:-1:Y:-|11:version:bigint:-1:N:1|12:event_high_water:bigint:-1:N:0|13:event_replay_floor:bigint:-1:N:1|14:created_at:timestamptz:3:N:transaction_timestamp()|15:closed_at:timestamptz:3:Y:transaction_timestamp()'),
      ('projections', '1:projection_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:capsule_ciphertext:jsonb:-1:Y:-|5:capsule_plaintext_bytes:integer:-1:N:-|6:capsule_field_version:integer:-1:N:1|7:payload_hash:text:-1:N:-|8:basis_hash:text:-1:N:-|9:projection_policy_hash:text:-1:N:-|10:publication_approval_id:text:-1:N:-|11:publication_approval_hash:text:-1:N:-|12:publication_attestation_hash:text:-1:N:-|13:owner_state:text:-1:N:''published_fresh''::text|14:curation_state:text:-1:N:''not_admitted''::text|15:current:boolean:-1:N:true|16:body_readable:boolean:-1:N:true|17:lifecycle_version:bigint:-1:N:1|18:published_at:timestamptz:3:N:-|19:fresh_until:timestamptz:3:N:-|20:expires_at:timestamptz:3:N:-|21:superseded_at:timestamptz:3:Y:-|22:revoked_at:timestamptz:3:Y:-|23:purged_at:timestamptz:3:Y:-'),
      ('pairing_challenges', '1:pairing_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:pairing_code_ciphertext:jsonb:-1:Y:-|5:pairing_code_plaintext_bytes:integer:-1:N:-|6:pairing_code_digest:text:-1:N:-|7:pairing_code_field_version:integer:-1:N:1|8:exchange_envelope_ciphertext:jsonb:-1:Y:-|9:exchange_envelope_plaintext_bytes:integer:-1:Y:-|10:exchange_envelope_field_version:integer:-1:N:1|11:client_public_key_hash:text:-1:Y:-|12:state:text:-1:N:''issued''::text|13:version:bigint:-1:N:1|14:created_at:timestamptz:3:N:transaction_timestamp()|15:expires_at:timestamptz:3:N:-|16:consumed_at:timestamptz:3:Y:-'),
      ('room_bindings', '1:binding_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:credential_digest:text:-1:N:-|5:capability_bundle:text:-1:N:''room_operator.v1''::text|6:state:text:-1:N:''current''::text|7:version:bigint:-1:N:1|8:paired_at:timestamptz:3:N:-|9:expires_at:timestamptz:3:N:-|10:revoked_at:timestamptz:3:Y:-'),
      ('rate_events', '1:rate_event_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:bucket_kind:text:-1:N:-|5:bucket_digest:text:-1:N:-|6:window_start:timestamptz:3:N:-|7:window_end:timestamptz:3:N:-|8:event_ordinal:integer:-1:N:-|9:recorded_at:timestamptz:3:N:transaction_timestamp()|10:expires_at:timestamptz:3:N:-'),
      ('public_encounters', '1:encounter_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:projection_id:text:-1:N:-|5:encounter_secret_digest:text:-1:N:-|6:issuance_bucket_digest:text:-1:N:-|7:hourly_rate_event_id:text:-1:N:-|8:daily_rate_event_id:text:-1:N:-|9:state:text:-1:N:''issued''::text|10:consumed_interaction_id:text:-1:Y:-|11:version:bigint:-1:N:1|12:issued_at:timestamptz:3:N:-|13:expires_at:timestamptz:3:N:-|14:consumed_at:timestamptz:3:Y:-|15:invalidated_at:timestamptz:3:Y:-'),
      ('interactions', '1:interaction_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:encounter_id:text:-1:N:-|5:origin_projection_id:text:-1:N:-|6:interaction_type:text:-1:N:-|7:request_ciphertext:jsonb:-1:Y:-|8:guest_capsule_ciphertext:jsonb:-1:Y:-|9:request_plaintext_bytes:integer:-1:N:-|10:guest_capsule_plaintext_bytes:integer:-1:Y:-|11:request_field_version:integer:-1:N:1|12:guest_capsule_field_version:integer:-1:N:1|13:request_hash:text:-1:N:-|14:guest_capsule_hash:text:-1:Y:-|15:consent_hash:text:-1:N:-|16:origin_projection_payload_hash:text:-1:N:-|17:reply_secret_digest:text:-1:Y:-|18:delete_secret_digest:text:-1:Y:-|19:state:text:-1:N:''accepted''::text|20:body_readable:boolean:-1:N:true|21:version:bigint:-1:N:1|22:created_at:timestamptz:3:N:-|23:body_expires_at:timestamptz:3:N:-|24:tombstone_expires_at:timestamptz:3:N:-|25:pulled_at:timestamptz:3:Y:-|26:local_purge_received_at:timestamptz:3:Y:-|27:deleted_at:timestamptz:3:Y:-|28:purged_at:timestamptz:3:Y:-'),
      ('room_events', '1:event_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:sequence:bigint:-1:N:-|5:event_kind:text:-1:N:-|6:object_id:text:-1:N:-|7:object_version:bigint:-1:N:-|8:event_hash:text:-1:N:-|9:committed_at:timestamptz:3:N:transaction_timestamp()|10:expires_at:timestamptz:3:N:-'),
      ('mutation_receipts', '1:receipt_id:text:-1:N:-|2:room_id:text:-1:N:-|3:actor_class:text:-1:N:-|4:actor_scope_digest:text:-1:N:-|5:action_name:text:-1:N:-|6:idempotency_key:text:-1:N:-|7:request_hash:text:-1:N:-|8:recovery_kind:text:-1:N:-|9:target_id:text:-1:Y:-|10:related_target_id:text:-1:Y:-|11:target_version:bigint:-1:Y:-|12:status:text:-1:N:''reserved''::text|13:http_status:smallint:-1:Y:-|14:result_code:text:-1:Y:-|15:sync_after_sequence:bigint:-1:Y:-|16:sync_high_water:bigint:-1:Y:-|17:sync_replay_floor:bigint:-1:Y:-|18:sync_result_kind:text:-1:Y:-|19:sync_event_ids:text[]:-1:Y:-|20:sync_event_sequences:bigint[]:-1:Y:-|21:sync_event_kinds:text[]:-1:Y:-|22:sync_object_ids:text[]:-1:Y:-|23:sync_object_versions:bigint[]:-1:Y:-|24:sync_event_hashes:text[]:-1:Y:-|25:sync_event_committed_ats:text[]:-1:Y:-|26:sync_tombstone_ids:text[]:-1:Y:-|27:sync_tombstone_expires_ats:text[]:-1:Y:-|28:pull_interaction_id:text:-1:Y:-|29:pull_request_field_version:integer:-1:Y:-|30:pull_body_hash:text:-1:Y:-|31:pull_guest_field_version:integer:-1:Y:-|32:pull_guest_hash:text:-1:Y:-|33:pull_body_expires_at:timestamptz:3:Y:-|34:pull_terminal_state:text:-1:Y:-|35:source_expires_at:timestamptz:3:Y:-|36:created_at:timestamptz:3:N:transaction_timestamp()|37:committed_at:timestamptz:3:Y:-|38:expires_at:timestamptz:3:N:-'),
      ('event_acks', '1:ack_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:binding_id:text:-1:N:-|5:event_id:text:-1:N:-|6:sequence:bigint:-1:N:-|7:event_hash:text:-1:N:-|8:version:bigint:-1:N:1|9:acked_at:timestamptz:3:N:transaction_timestamp()'),
      ('encryption_nonces', '1:key_version:text:-1:N:-|2:nonce:bytea:-1:N:-|3:table_name:text:-1:N:-|4:row_id:text:-1:N:-|5:column_name:text:-1:N:-|6:field_version:integer:-1:N:-|7:created_at:timestamptz:3:N:transaction_timestamp()'),
      ('purge_jobs', '1:purge_job_id:text:-1:N:-|2:room_id:text:-1:N:-|3:installation_id:text:-1:N:-|4:target_kind:text:-1:N:-|5:target_object_id:text:-1:N:-|6:target_field_version:integer:-1:N:-|7:state:text:-1:N:''pending''::text|8:attempt_count:integer:-1:N:0|9:created_at:timestamptz:3:N:transaction_timestamp()|10:due_at:timestamptz:3:N:-|11:claimed_at:timestamptz:3:Y:-|12:completed_at:timestamptz:3:Y:-'),
      ('retention_health', '1:health_id:text:-1:N:-|2:singleton_slot:boolean:-1:N:true|3:last_run_started_at:timestamptz:3:Y:-|4:last_successful_purge_at:timestamptz:3:N:-|5:last_run_completed_at:timestamptz:3:Y:-|6:last_failure_code:text:-1:Y:-|7:version:bigint:-1:N:1')
    ), actual AS (
      SELECT c.relname::text AS table_name,
             string_agg(
               a.attnum::text || ':' || a.attname || ':' ||
               CASE t.typname
                 WHEN 'bool' THEN 'boolean'
                 WHEN 'int2' THEN 'smallint'
                 WHEN 'int4' THEN 'integer'
                 WHEN 'int8' THEN 'bigint'
                 WHEN '_text' THEN 'text[]'
                 WHEN '_int8' THEN 'bigint[]'
                 ELSE t.typname
               END || ':' || a.atttypmod::text || ':' ||
               CASE WHEN a.attnotnull THEN 'N' ELSE 'Y' END || ':' ||
               COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid, true), '-'),
               '|' ORDER BY a.attnum
             ) AS fingerprint
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       WHERE n.nspname = 'forme_r4_public_core'
         AND c.relkind = 'r'
         AND a.attnum > 0
         AND NOT a.attisdropped
       GROUP BY c.relname
    )
    SELECT 1
      FROM expected e
      FULL JOIN actual a USING (table_name)
     WHERE e.fingerprint IS DISTINCT FROM a.fingerprint
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_column_definition_drift';
  END IF;

  SELECT pg_catalog.obj_description(n.oid, 'pg_namespace')
    INTO stored_catalog_manifest
    FROM pg_catalog.pg_namespace n
   WHERE n.nspname = 'forme_r4_public_core';

  SELECT 'r4.public-core.catalog-manifest.v2:contract-' ||
         expected_catalog_contract_sha256 || ':catalog-md5:' ||
         pg_catalog.md5(string_agg(signature, E'\n' ORDER BY signature))
    INTO actual_catalog_manifest
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

  IF stored_catalog_manifest IS DISTINCT FROM actual_catalog_manifest THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_catalog_manifest_drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM forme_r4_public_core.installation
     WHERE installation_id = 'installation_forme_public_core_v1'
       AND singleton_slot
       AND third_place_id = 'thirdplace_forme_public_core_v1'
       AND entity_id = 'entity_forme_public_core_v1'
       AND config_lineage_hash = 'sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31'
       AND version = 1
  ) OR (SELECT count(*) FROM forme_r4_public_core.installation) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM forme_r4_public_core.retention_health
        WHERE health_id = 'retention_health_public_core_v1'
          AND singleton_slot AND version = 1
          AND last_run_started_at IS NULL AND last_run_completed_at IS NULL
          AND last_failure_code IS NULL
     )
     OR (SELECT count(*) FROM forme_r4_public_core.retention_health) <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_singleton_seed_invalid';
  END IF;

  IF EXISTS (SELECT 1 FROM forme_r4_public_core.rooms)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.projections)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.pairing_challenges)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.room_bindings)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.public_encounters)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.interactions)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.rate_events)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.room_events)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.mutation_receipts)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.event_acks)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.encryption_nonces)
     OR EXISTS (SELECT 1 FROM forme_r4_public_core.purge_jobs) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_unexpected_durable_rows';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (
         c.relkind NOT IN ('r', 'i')
         OR c.relpersistence <> 'p'
         OR c.relispartition
         OR c.relrowsecurity
         OR c.relforcerowsecurity
       )
  ) OR (
    SELECT array_agg((t.typname || '|' || t.typtype)::text ORDER BY t.typname)
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'forme_r4_public_core'
  ) IS DISTINCT FROM (
    SELECT array_agg(signature ORDER BY signature)
      FROM (
        SELECT table_name || '|c' AS signature
          FROM unnest(expected_tables) AS item(table_name)
        UNION ALL
        SELECT '_' || table_name || '|b' AS signature
          FROM unnest(expected_tables) AS item(table_name)
      ) expected_types
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (
         (t.typtype = 'c' AND NOT EXISTS (
           SELECT 1 FROM pg_catalog.pg_class c
            WHERE c.oid = t.typrelid AND c.relname = t.typname AND c.relkind = 'r'
         ))
         OR (t.typtype = 'b' AND NOT EXISTS (
           SELECT 1 FROM pg_catalog.pg_type element
            WHERE element.oid = t.typelem AND t.typname = '_' || element.typname
         ))
       )
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger trigger
    JOIN pg_catalog.pg_class owner ON owner.oid = trigger.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND NOT trigger.tgisinternal
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_rewrite rule
    JOIN pg_catalog.pg_class owner ON owner.oid = rule.ev_class
    JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy policy
    JOIN pg_catalog.pg_class owner ON owner.oid = policy.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_collation item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.collnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_conversion item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.connamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_operator item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.oprnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_opclass item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.opcnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_opfamily item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.opfnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_statistic_ext item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.stxnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_ts_config item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.cfgnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_ts_dict item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.dictnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_ts_parser item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.prsnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_ts_template item
    JOIN pg_catalog.pg_namespace n ON n.oid = item.tmplnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_unexpected_object_present';
  END IF;

  IF (
    SELECT count(*)
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND c.contype = 'c'
       AND c.conname IN (
         'ck_rooms__label_cipher', 'ck_projections__capsule_cipher',
         'ck_pairing_challenges__pairing_cipher', 'ck_pairing_challenges__exchange_cipher',
         'ck_interactions__request_cipher', 'ck_interactions__guest_cipher'
       )
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%schemaVersion%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%algorithm%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%keyVersion%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%nonce%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%ciphertext%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%tag%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '%aadHash%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '% - ARRAY[%'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) LIKE '% ?& ARRAY[%'
       AND (
         length(pg_catalog.pg_get_constraintdef(c.oid, false))
         - length(replace(pg_catalog.pg_get_constraintdef(c.oid, false), 'jsonb_typeof', ''))
       ) / length('jsonb_typeof') = 8
       AND (
         length(pg_catalog.pg_get_constraintdef(c.oid, false))
         - length(replace(pg_catalog.pg_get_constraintdef(c.oid, false), '''string''', ''))
       ) / length('''string''') >= 7
  ) <> 6 OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
     WHERE owner.relname = 'purge_jobs'
       AND c.conname = 'ck_purge_jobs__deadline'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) ~ 'due_at[[:space:]]*<[[:space:]]*'
       AND pg_catalog.pg_get_constraintdef(c.oid, false) !~ 'due_at[[:space:]]*<='
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_check_constraint_definition_drift';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'forme_r4_public_core'
      AND column_name IN (
        'raw_ip', 'ip_address', 'user_agent', 'request_body', 'result_json',
        'raw_secret', 'credential', 'table_name_dynamic', 'column_name_dynamic'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_forbidden_column_present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'forme_r4_public_core'
      AND table_name IN ('room_events', 'mutation_receipts', 'rate_events')
      AND data_type IN ('json', 'jsonb', 'bytea')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_body_free_table_drift';
  END IF;

  SELECT array_agg((table_name || '.' || column_name)::text ORDER BY table_name, column_name)
    INTO actual_encrypted_fields
    FROM information_schema.columns
    WHERE table_schema = 'forme_r4_public_core'
      AND data_type = 'jsonb';

  IF actual_encrypted_fields IS DISTINCT FROM ARRAY[
    'interactions.guest_capsule_ciphertext',
    'interactions.request_ciphertext',
    'pairing_challenges.exchange_envelope_ciphertext',
    'pairing_challenges.pairing_code_ciphertext',
    'projections.capsule_ciphertext',
    'rooms.label_ciphertext'
  ]::text[] THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_encrypted_field_inventory_drift';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'forme_r4_public_core'
      AND c.contype = 'f'
      AND c.conname IN (
        'fk_projections__room', 'fk_pairing_challenges__room',
        'fk_room_bindings__room', 'fk_rate_events__room',
        'fk_public_encounters__projection',
        'fk_public_encounters__hourly_rate', 'fk_public_encounters__daily_rate',
        'fk_public_encounters__consumed_interaction',
        'fk_interactions__origin_projection',
        'fk_interactions__room', 'fk_room_events__room',
        'fk_event_acks__binding', 'fk_event_acks__event',
        'fk_event_acks__room', 'fk_purge_jobs__room'
      )
  ) <> 15 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_composite_room_scope_drift';
  END IF;
END
$verify$;

SELECT
  'PUBLIC_CORE_SCHEMA_PROPOSED_VERIFIED'::text AS status,
  14::integer AS application_table_count,
  0::integer AS migration_executions,
  false AS traffic_ready,
  false AS gate_c_ready;

ROLLBACK;
