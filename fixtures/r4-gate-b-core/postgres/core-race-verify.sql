\set ON_ERROR_STOP on

-- R4 Gate B persisted verifier template v1. The adapter injects one exact,
-- case/order-specific read-only assertion block from the closed byte index.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL ROLE forme_r4_audit;
SET LOCAL statement_timeout = '20s';
SELECT CASE
  WHEN '{{CASE_ID}}' IN ('C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16')
   AND '{{ORDER_ID}}' IN ('A-B','B-A')
  THEN 1 ELSE pg_catalog.current_setting('forme_r4.closed_race_verifier_rejected')::integer
END AS exact_catalog_guard;
{{EXACT_PERSISTED_ASSERTION_SQL}}
COMMIT;
