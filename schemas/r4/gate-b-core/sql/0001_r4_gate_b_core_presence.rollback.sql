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

DO $forme_r4_rollback_guard$
DECLARE role_name text;
BEGIN
  IF current_database()<>'forme_r4_gate_b'
     OR current_setting('server_version_num')::integer<>160010
     OR current_user<>'postgres'
     OR obj_description(to_regnamespace('forme_r4'),'pg_namespace')<>'R4_GATE_B_CORE_SYNTHETIC_ONLY_V1'
     OR NOT EXISTS (
       SELECT 1 FROM forme_r4.schema_migrations WHERE version=1
       AND migration_sha256=current_setting('forme_r4.migration_sha')
       AND technical_packet_sha256=current_setting('forme_r4.technical_packet_sha')
       AND scope_brief_sha256=current_setting('forme_r4.scope_brief_sha')
       AND construction_packet_sha256=current_setting('forme_r4.construction_packet_sha')
       AND core_basis_sha256=current_setting('forme_r4.core_basis_sha')
       AND execution_manifest_sha256=current_setting('forme_r4.execution_manifest_sha')
       AND rollback_compatible
     ) THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;

  FOREACH role_name IN ARRAY ARRAY[
    'forme_r4_migrate','forme_r4_app','forme_r4_janitor','forme_r4_notify','forme_r4_audit'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name
      AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreatedb
      AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls) THEN
      RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_roles r ON r.oid=c.relowner
      WHERE r.rolname=role_name AND n.nspname<>'forme_r4'
        AND n.nspname NOT IN ('pg_catalog','information_schema')
    ) THEN
      RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
    END IF;
  END LOOP;
END
$forme_r4_rollback_guard$;

DROP SCHEMA forme_r4 CASCADE;
DROP ROLE forme_r4_app;
DROP ROLE forme_r4_janitor;
DROP ROLE forme_r4_notify;
DROP ROLE forme_r4_audit;
DROP ROLE forme_r4_migrate;

DO $forme_r4_rollback_absence$
DECLARE role_name text;
BEGIN
  IF to_regnamespace('forme_r4') IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
  END IF;
  FOREACH role_name IN ARRAY ARRAY[
    'forme_r4_migrate','forme_r4_app','forme_r4_janitor','forme_r4_notify','forme_r4_audit'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      RAISE EXCEPTION USING ERRCODE='P4A04', MESSAGE='migration_target_invalid';
    END IF;
  END LOOP;
END
$forme_r4_rollback_absence$;
