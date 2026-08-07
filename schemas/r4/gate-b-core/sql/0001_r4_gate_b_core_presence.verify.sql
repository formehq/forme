\set ON_ERROR_STOP on

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

BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY;

DO $forme_r4_verify$
DECLARE
  observed integer;
  expected_name text;
  role_name text;
BEGIN
  IF current_database()<>'forme_r4_gate_b'
     OR current_setting('server_version_num')::integer<>160010
     OR to_regnamespace('forme_r4') IS NULL
     OR obj_description(to_regnamespace('forme_r4'),'pg_namespace')<>'R4_GATE_B_CORE_SYNTHETIC_ONLY_V1' THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;

  SELECT count(*) INTO observed FROM forme_r4.schema_migrations
  WHERE version=1
    AND migration_sha256=current_setting('forme_r4.migration_sha')
    AND technical_packet_sha256=current_setting('forme_r4.technical_packet_sha')
    AND scope_brief_sha256=current_setting('forme_r4.scope_brief_sha')
    AND construction_packet_sha256=current_setting('forme_r4.construction_packet_sha')
    AND core_basis_sha256=current_setting('forme_r4.core_basis_sha')
    AND execution_manifest_sha256=current_setting('forme_r4.execution_manifest_sha')
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
  IF observed<>39 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;

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

  IF (SELECT count(*) FROM forme_r4.actor_subjects WHERE subject_id IN
      ('subject_gatebcorecontroller0001','subject_gatebcorecurator000001'))<>2
     OR (SELECT count(*) FROM forme_r4.actor_roles WHERE role_assignment_id IN
      ('role_gatebcorecontroller000001','role_gatebcorecurator00000001'))<>2
     OR NOT EXISTS (SELECT 1 FROM forme_r4.third_places WHERE third_place_id='thirdplace_gatebcore000000001' AND slug='forme-demo' AND state='active')
     OR NOT EXISTS (SELECT 1 FROM forme_r4.entities WHERE entity_id='entity_gatebcoreforme00000001' AND controller_subject_id='subject_gatebcorecontroller0001' AND state='active')
     OR NOT EXISTS (SELECT 1 FROM forme_r4.third_place_events WHERE event_id='event_gatebcorethirdplace00001' AND request_hash='sha256:a0b7bfe19e9583c68e715afcd361a06cd3ddb7dc57165efc77188e02ea12d309') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM forme_r4.rooms WHERE room_kind<>'third_place_public')
     OR EXISTS (SELECT 1 FROM forme_r4.agent_derivatives)
     OR EXISTS (SELECT 1 FROM forme_r4.direct_grant_invites)
     OR EXISTS (SELECT 1 FROM forme_r4.notification_endpoints)
     OR EXISTS (SELECT 1 FROM forme_r4.notification_challenges)
     OR EXISTS (SELECT 1 FROM forme_r4.notification_outbox)
     OR EXISTS (SELECT 1 FROM forme_r4.notification_attempts) THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='forme_r4' AND grantee IN
      ('forme_r4_app','forme_r4_janitor','forme_r4_notify')
      AND table_name NOT LIKE 'audit_%') THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  SELECT count(*) INTO observed
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
  JOIN pg_roles r ON r.oid=acl.grantee
  WHERE n.nspname='forme_r4' AND r.rolname='forme_r4_app' AND acl.privilege_type='EXECUTE';
  IF observed<>32 THEN RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
    JOIN pg_roles r ON r.oid=acl.grantee
    WHERE n.nspname='forme_r4' AND r.rolname='forme_r4_app' AND acl.privilege_type='EXECUTE'
      AND p.proname NOT IN (
        'api_third_place_list','api_projection_read','tx_public_encounter_issue',
        'tx_interaction_create','api_interaction_read','tx_interaction_delete',
        'tx_grant_offer_accept','tx_room_pair_exchange','api_control_status',
        'api_control_interaction_read','tx_room_create','tx_room_pair_issue',
        'tx_room_binding_revoke','tx_projection_revoke','tx_response_revoke',
        'tx_grant_revoke','tx_grant_offer_issue','tx_grant_offer_revoke',
        'tx_interaction_close','tx_curation_admit','tx_curation_unlist',
        'api_room_operator_status','tx_room_operator_sync','tx_room_operator_pull',
        'tx_fresh_cycle_reserve','tx_fresh_cycle_recover',
        'tx_fresh_cycle_abandon_zero_dispatch','tx_dispatch_permit_issue',
        'tx_room_event_ack','tx_projection_deliver','tx_response_deliver',
        'tx_local_purge_receipt')) THEN
    RAISE EXCEPTION USING ERRCODE='P4A01', MESSAGE='gate_b_contract_violation';
  END IF;
  IF has_function_privilege('forme_r4_app','forme_r4.tx_gate_b_core_basis_install(forme_r4.mutation_context_v1,forme_r4.sha256_digest)','EXECUTE')
     OR NOT has_function_privilege('forme_r4_migrate','forme_r4.tx_gate_b_core_basis_install(forme_r4.mutation_context_v1,forme_r4.sha256_digest)','EXECUTE') THEN
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
