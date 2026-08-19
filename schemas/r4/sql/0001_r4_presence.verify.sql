\set ON_ERROR_STOP on

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

BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY;

DO $forme_r4_verify$
DECLARE
  observed integer;
  expected_name text;
  role_name text;
BEGIN
  IF current_database()<>'forme_r4_gate_b'
     OR current_setting('server_version_num')::integer<>160010
     OR to_regnamespace('forme_r4') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;

  SELECT count(*) INTO observed FROM forme_r4.schema_migrations
  WHERE version=1
    AND migration_sha256=current_setting('forme_r4.migration_sha')
    AND packet_sha256=current_setting('forme_r4.packet_sha')
    AND manifest_sha256=current_setting('forme_r4.manifest_sha')
    AND postgres_version_num=160010 AND rollback_compatible;
  IF observed<>1 THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;

  SELECT count(*) INTO observed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='forme_r4' AND c.relkind='r';
  IF observed<>37 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname='forme_r4' AND t.typtype='d';
  IF observed<>44 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname='forme_r4' AND t.typtype='c'
    AND t.typname IN ('mutation_context_v1','api_result_v1','notification_claim_v1');
  IF observed<>3 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname='forme_r4' AND t.typtype='e';
  IF observed<>0 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='forme_r4';
  IF observed<>60 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='forme_r4' AND c.relkind='v';
  IF observed<>11 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  SELECT count(*) INTO observed FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='forme_r4' AND NOT t.tgisinternal;
  IF observed<>7 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

  FOREACH expected_name IN ARRAY ARRAY[
    'schema_migrations','actor_subjects','actor_roles','third_places','third_place_events',
    'entities','rooms','room_lifecycle_events','encryption_nonces','projections',
    'projection_lifecycle_events','curation_events','room_bindings','pairing_challenges',
    'public_encounters','grants','grant_offers','direct_grant_invites','agent_derivatives',
    'capability_events','interactions','interaction_lifecycle_events',
    'fresh_cycle_reservations','dispatch_permits','responses','response_lifecycle_events',
    'notification_endpoints','notification_challenges','notification_outbox',
    'notification_attempts','room_event_stream','operation_receipts','idempotency_records',
    'rate_buckets','retention_jobs','purge_watermarks','operator_incidents'
  ] LOOP
    IF to_regclass('forme_r4.'||expected_name) IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
    END IF;
  END LOOP;

  FOREACH role_name IN ARRAY ARRAY[
    'forme_r4_migrate','forme_r4_app','forme_r4_janitor','forme_r4_notify','forme_r4_audit'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name
      AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreatedb
      AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls) THEN
      RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='forme_r4' AND grantee IN
      ('forme_r4_app','forme_r4_janitor','forme_r4_notify')
      AND table_name NOT LIKE 'audit_%') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='forme_r4' AND grantee='forme_r4_audit'
      AND table_name NOT LIKE 'audit_%') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='forme_r4' AND (p.prosecdef=false
      OR NOT ('search_path=pg_catalog, forme_r4'=ANY(p.proconfig)))) THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
    WHERE n.nspname='forme_r4' AND acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname<>'plpgsql') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
END
$forme_r4_verify$;

ROLLBACK;
