\set ON_ERROR_STOP on

-- R4 Gate B physical race setup template v1. The physical adapter replaces
-- each closed uppercase token from the race catalog before psql sees
-- these bytes. No replacement comes from a caller or environment variable.
-- Controller/Curator/Third Place/Entity basis is installed only by
-- tx_gate_b_core_basis_install before this template is used.
BEGIN;
SET LOCAL ROLE forme_r4_migrate;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '20s';
SELECT CASE
  WHEN '{{CASE_ID}}' IN ('C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16')
  THEN 1 ELSE pg_catalog.current_setting('forme_r4.closed_race_setup_rejected')::integer
END AS exact_catalog_guard \gset r4_setup_guard_
{{EXACT_SCENARIO_SETUP_SQL}}
COMMIT;
