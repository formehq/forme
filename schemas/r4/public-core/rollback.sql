-- R4 #67 Durable Public Core proposed rollback.
-- Never execute without the separately approved Physical Rebind target and
-- rollback grant. Gate C is not requested.
-- The guard refuses teardown after any durable use; only the exact two install
-- seeds created by schema.sql are eligible for removal.

BEGIN;

DO $rollback_guard$
DECLARE
  actual_tables text[];
  actual_indexes text[];
  durable_rows bigint;
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
BEGIN
  IF to_regnamespace('forme_r4_public_core') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_schema_absent';
  END IF;

  SELECT array_agg(table_name::text ORDER BY table_name::text COLLATE "C")
    INTO actual_tables
    FROM information_schema.tables
    WHERE table_schema = 'forme_r4_public_core'
      AND table_type = 'BASE TABLE';

  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_inventory_drift';
  END IF;

  SELECT array_agg(indexname::text ORDER BY indexname::text COLLATE "C")
    INTO actual_indexes FROM pg_catalog.pg_indexes
   WHERE schemaname = 'forme_r4_public_core';
  IF actual_indexes IS DISTINCT FROM expected_indexes THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_index_inventory_drift';
  END IF;

  IF (
    SELECT count(*)
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ) <> 207 OR (
    SELECT count(*)
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
  ) <> 172 OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class owner ON owner.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (NOT c.convalidated OR NOT c.conislocal OR c.coninhcount <> 0)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_definition_drift';
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
      SELECT 'relation|' || c.relname::text || '|' || c.relkind::text || '|' || c.relpersistence::text || '|' ||
             c.relispartition::text || '|' || c.relrowsecurity::text || '|' ||
             c.relforcerowsecurity::text AS signature
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'forme_r4_public_core'
      UNION ALL
      SELECT 'column|' || c.relname::text || '|' || a.attnum::text || '|' || a.attname::text || '|' ||
             t.typname::text || '|' || a.atttypmod::text || '|' || a.attnotnull::text || '|' ||
             a.attidentity::text || '|' || a.attgenerated::text || '|' ||
             COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid, false), '-')
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       WHERE n.nspname = 'forme_r4_public_core'
         AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      UNION ALL
      SELECT 'constraint|' || owner.relname::text || '|' || constraint_row.conname::text || '|' ||
             constraint_row.contype::text || '|' || constraint_row.condeferrable::text || '|' ||
             constraint_row.condeferred::text || '|' || constraint_row.convalidated::text || '|' ||
             constraint_row.connoinherit::text || '|' ||
             pg_catalog.pg_get_constraintdef(constraint_row.oid, false)
        FROM pg_catalog.pg_constraint constraint_row
        JOIN pg_catalog.pg_class owner ON owner.oid = constraint_row.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = owner.relnamespace
       WHERE n.nspname = 'forme_r4_public_core'
      UNION ALL
      SELECT 'index|' || owner.relname::text || '|' || idx.relname::text || '|' || access_method.amname::text || '|' ||
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
      SELECT 'type|' || item.typname::text || '|' || item.typtype::text || '|' || item.typcategory::text
        FROM pg_catalog.pg_type item
        JOIN pg_catalog.pg_namespace n ON n.oid = item.typnamespace
       WHERE n.nspname = 'forme_r4_public_core'
    ) catalog_rows;

  IF stored_catalog_manifest IS DISTINCT FROM actual_catalog_manifest THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_catalog_manifest_drift';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'forme_r4_public_core'
       AND (c.relkind NOT IN ('r', 'i') OR c.relpersistence <> 'p' OR c.relispartition)
  ) OR (
    SELECT count(*) FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'forme_r4_public_core'
  ) <> 28 OR EXISTS (
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
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_unexpected_object';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint dependent
      JOIN pg_catalog.pg_class referenced ON referenced.oid = dependent.confrelid
      JOIN pg_catalog.pg_namespace referenced_namespace
        ON referenced_namespace.oid = referenced.relnamespace
      JOIN pg_catalog.pg_class owner ON owner.oid = dependent.conrelid
      JOIN pg_catalog.pg_namespace owner_namespace ON owner_namespace.oid = owner.relnamespace
     WHERE dependent.contype = 'f'
       AND referenced_namespace.nspname = 'forme_r4_public_core'
       AND owner_namespace.nspname <> 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_depend dependency
      JOIN pg_catalog.pg_rewrite rule
        ON dependency.classid = 'pg_catalog.pg_rewrite'::pg_catalog.regclass
       AND dependency.objid = rule.oid
      JOIN pg_catalog.pg_class dependent_relation ON dependent_relation.oid = rule.ev_class
      JOIN pg_catalog.pg_namespace dependent_namespace
        ON dependent_namespace.oid = dependent_relation.relnamespace
      JOIN pg_catalog.pg_class referenced_relation
        ON dependency.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
       AND dependency.refobjid = referenced_relation.oid
      JOIN pg_catalog.pg_namespace referenced_namespace
        ON referenced_namespace.oid = referenced_relation.relnamespace
     WHERE referenced_namespace.nspname = 'forme_r4_public_core'
       AND dependent_namespace.nspname <> 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_depend dependency
      JOIN pg_catalog.pg_proc dependent_routine
        ON dependency.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
       AND dependency.objid = dependent_routine.oid
      JOIN pg_catalog.pg_namespace dependent_namespace
        ON dependent_namespace.oid = dependent_routine.pronamespace
      JOIN pg_catalog.pg_type referenced_type
        ON dependency.refclassid = 'pg_catalog.pg_type'::pg_catalog.regclass
       AND dependency.refobjid = referenced_type.oid
      JOIN pg_catalog.pg_namespace referenced_namespace
        ON referenced_namespace.oid = referenced_type.typnamespace
     WHERE referenced_namespace.nspname = 'forme_r4_public_core'
       AND dependent_namespace.nspname <> 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_depend dependency
      JOIN pg_catalog.pg_class dependent_relation
        ON dependency.classid = 'pg_catalog.pg_class'::pg_catalog.regclass
       AND dependency.objid = dependent_relation.oid
      JOIN pg_catalog.pg_namespace dependent_namespace
        ON dependent_namespace.oid = dependent_relation.relnamespace
      JOIN pg_catalog.pg_class referenced_relation
        ON dependency.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
       AND dependency.refobjid = referenced_relation.oid
      JOIN pg_catalog.pg_namespace referenced_namespace
        ON referenced_namespace.oid = referenced_relation.relnamespace
     WHERE referenced_namespace.nspname = 'forme_r4_public_core'
       AND dependent_namespace.nspname <> 'forme_r4_public_core'
       AND dependent_namespace.nspname NOT IN ('pg_catalog', 'pg_toast', 'information_schema')
       AND dependency.deptype IN ('a', 'n')
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_inherits inheritance
      JOIN pg_catalog.pg_class parent ON parent.oid = inheritance.inhparent
      JOIN pg_catalog.pg_namespace parent_namespace ON parent_namespace.oid = parent.relnamespace
      JOIN pg_catalog.pg_class child ON child.oid = inheritance.inhrelid
      JOIN pg_catalog.pg_namespace child_namespace ON child_namespace.oid = child.relnamespace
     WHERE parent_namespace.nspname = 'forme_r4_public_core'
       AND child_namespace.nspname <> 'forme_r4_public_core'
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_publication_rel publication_relation
      JOIN pg_catalog.pg_class published ON published.oid = publication_relation.prrelid
      JOIN pg_catalog.pg_namespace published_namespace ON published_namespace.oid = published.relnamespace
     WHERE published_namespace.nspname = 'forme_r4_public_core'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_external_dependency';
  END IF;

  IF (SELECT count(*) FROM forme_r4_public_core.installation) <> 1 OR NOT EXISTS (
    SELECT 1 FROM forme_r4_public_core.installation
     WHERE installation_id = 'installation_forme_public_core_v1'
       AND singleton_slot
       AND third_place_id = 'thirdplace_forme_public_core_v1'
       AND entity_id = 'entity_forme_public_core_v1'
       AND config_lineage_hash = 'sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31'
       AND version = 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_installation_seed_drift';
  END IF;

  IF (SELECT count(*) FROM forme_r4_public_core.retention_health) <> 1 OR NOT EXISTS (
    SELECT 1 FROM forme_r4_public_core.retention_health
     WHERE health_id = 'retention_health_public_core_v1'
       AND singleton_slot AND version = 1
       AND last_run_started_at IS NULL
       AND last_run_completed_at IS NULL
       AND last_failure_code IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_retention_seed_drift';
  END IF;

  SELECT
      (SELECT count(*) FROM forme_r4_public_core.rooms)
    + (SELECT count(*) FROM forme_r4_public_core.projections)
    + (SELECT count(*) FROM forme_r4_public_core.pairing_challenges)
    + (SELECT count(*) FROM forme_r4_public_core.room_bindings)
    + (SELECT count(*) FROM forme_r4_public_core.public_encounters)
    + (SELECT count(*) FROM forme_r4_public_core.interactions)
    + (SELECT count(*) FROM forme_r4_public_core.rate_events)
    + (SELECT count(*) FROM forme_r4_public_core.room_events)
    + (SELECT count(*) FROM forme_r4_public_core.mutation_receipts)
    + (SELECT count(*) FROM forme_r4_public_core.event_acks)
    + (SELECT count(*) FROM forme_r4_public_core.encryption_nonces)
    + (SELECT count(*) FROM forme_r4_public_core.purge_jobs)
    INTO durable_rows;

  IF durable_rows <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'public_core_rollback_durable_rows_present';
  END IF;
END
$rollback_guard$;

-- Break only the two declared internal cycles, then let RESTRICT defend every
-- remaining edge. Any missed external dependency aborts the whole transaction.
ALTER TABLE forme_r4_public_core.public_encounters
  DROP CONSTRAINT fk_public_encounters__consumed_interaction RESTRICT;
ALTER TABLE forme_r4_public_core.rooms
  DROP CONSTRAINT fk_rooms__current_projection RESTRICT;

DROP TABLE forme_r4_public_core.event_acks RESTRICT;
DROP TABLE forme_r4_public_core.mutation_receipts RESTRICT;
DROP TABLE forme_r4_public_core.room_events RESTRICT;
DROP TABLE forme_r4_public_core.purge_jobs RESTRICT;
DROP TABLE forme_r4_public_core.public_encounters RESTRICT;
DROP TABLE forme_r4_public_core.interactions RESTRICT;
DROP TABLE forme_r4_public_core.rate_events RESTRICT;
DROP TABLE forme_r4_public_core.pairing_challenges RESTRICT;
DROP TABLE forme_r4_public_core.room_bindings RESTRICT;
DROP TABLE forme_r4_public_core.projections RESTRICT;
DROP TABLE forme_r4_public_core.rooms RESTRICT;
DROP TABLE forme_r4_public_core.encryption_nonces RESTRICT;
DROP TABLE forme_r4_public_core.retention_health RESTRICT;
DROP TABLE forme_r4_public_core.installation RESTRICT;
DROP SCHEMA forme_r4_public_core RESTRICT;

COMMIT;
