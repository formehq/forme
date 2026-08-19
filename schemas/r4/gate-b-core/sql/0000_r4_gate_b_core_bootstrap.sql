\set ON_ERROR_STOP on

-- R4 Gate B Core disposable bootstrap. This file is intentionally psql-only and
-- may be executed only by the separately approved Retry Execution runner.
DO $forme_r4_bootstrap$
DECLARE
  unexpected_schema text;
  unexpected_extension text;
  role_name text;
BEGIN
  IF current_database() <> 'forme_r4_gate_b' THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;
  IF current_setting('server_version_num')::integer <> 160010 THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;
  IF pg_encoding_to_char(getdatabaseencoding()) <> 'UTF8' THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;
  IF to_regnamespace('forme_r4') IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;

  SELECT nspname INTO unexpected_schema
  FROM pg_namespace
  WHERE nspname NOT IN ('public', 'pg_catalog', 'information_schema')
    AND nspname !~ '^pg_toast'
    AND nspname !~ '^pg_temp'
  LIMIT 1;
  IF unexpected_schema IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;

  SELECT extname INTO unexpected_extension
  FROM pg_extension
  WHERE extname <> 'plpgsql'
  LIMIT 1;
  IF unexpected_extension IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
  END IF;

  FOREACH role_name IN ARRAY ARRAY[
    'forme_r4_migrate', 'forme_r4_app', 'forme_r4_janitor',
    'forme_r4_notify', 'forme_r4_audit'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      RAISE EXCEPTION USING ERRCODE = 'P4A04', MESSAGE = 'migration_target_invalid';
    END IF;
  END LOOP;
END
$forme_r4_bootstrap$;

CREATE ROLE forme_r4_migrate
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE forme_r4_app
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE forme_r4_janitor
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE forme_r4_notify
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE forme_r4_audit
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE forme_r4_gate_b FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA forme_r4 AUTHORIZATION forme_r4_migrate;
COMMENT ON SCHEMA forme_r4 IS 'R4_GATE_B_CORE_SYNTHETIC_ONLY_V1';
REVOKE ALL ON SCHEMA forme_r4 FROM PUBLIC;
GRANT USAGE ON SCHEMA forme_r4
  TO forme_r4_app, forme_r4_janitor, forme_r4_notify, forme_r4_audit;

ALTER DEFAULT PRIVILEGES FOR ROLE forme_r4_migrate IN SCHEMA forme_r4
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE forme_r4_migrate IN SCHEMA forme_r4
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE forme_r4_migrate IN SCHEMA forme_r4
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE forme_r4_migrate IN SCHEMA forme_r4
  REVOKE USAGE ON TYPES FROM PUBLIC;
