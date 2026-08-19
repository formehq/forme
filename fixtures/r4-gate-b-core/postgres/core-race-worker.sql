\set ON_ERROR_STOP on

-- R4 Gate B worker template v1. Barrier acquisition and Core call are two
-- different SQL statements so READ COMMITTED takes a fresh statement snapshot.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE forme_r4_app;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '20s';
SET LOCAL idle_in_transaction_session_timeout = '20s';
SELECT 'READY {{ACTOR}} ' || pg_catalog.pg_backend_pid()::text AS body_free_marker \gset r4_ready_
\echo :r4_ready_body_free_marker
SELECT pg_catalog.pg_advisory_xact_lock({{ACTOR_START_KEY}}::bigint) AS held \gset r4_start_lock_
SELECT 'CALL_STARTED {{ACTOR}}' AS body_free_marker \gset r4_call_
\echo :r4_call_body_free_marker
{{EXACT_CORE_CALL_SQL}}
\gset r4_result_
SELECT CASE
  WHEN :'r4_result_http_status'::integer={{EXPECTED_HTTP}}
   AND :'r4_result_code'='{{EXPECTED_CODE}}'
   AND (CASE WHEN {{EXPECT_RECEIPT}} THEN :'r4_result_receipt_id'<>'' ELSE :'r4_result_receipt_id'='' END)
   AND (CASE WHEN {{EXPECT_TARGET_NULL}} THEN :'r4_result_target_id'='' ELSE :'r4_result_target_id'='{{EXPECTED_EXACT_TARGET}}' END)
   AND (CASE WHEN {{EXPECT_VERSION_NULL}} THEN :'r4_result_target_version'='' ELSE :'r4_result_target_version'='{{EXPECTED_EXACT_VERSION}}' END)
   AND (CASE WHEN '{{EXPECTED_EXACT_RECEIPT}}'='' THEN true ELSE :'r4_result_receipt_id'='{{EXPECTED_EXACT_RECEIPT}}' END)
  THEN 'POST_CALL {{ACTOR}}'
  ELSE pg_catalog.current_setting('forme_r4.closed_race_result_rejected')
END AS body_free_marker \gset r4_post_
\echo :r4_post_body_free_marker
SELECT CASE WHEN :'r4_result_receipt_id'='' THEN 0 ELSE 1 END AS receipt_present \gset r4_receipt_
\echo RESULT {{ACTOR}} :r4_result_http_status :r4_result_code :r4_receipt_receipt_present
{{RESULT_BODY_OUTPUT}}
-- COMMIT_GATE {{ACTOR}}
SELECT CASE WHEN :'r4_commit_gate'='COMMIT {{ACTOR}}' THEN 1 ELSE pg_catalog.current_setting('forme_r4.closed_race_commit_rejected')::integer END AS exact_commit_gate \gset r4_commit_
COMMIT;
\echo COMMIT_ACK {{ACTOR}}
