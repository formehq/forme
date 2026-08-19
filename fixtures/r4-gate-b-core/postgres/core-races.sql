\set ON_ERROR_STOP on

-- Body-free machine-readable companion for the physical race catalog. This
-- file is not physical race evidence: the successor runner binds the exact
-- setup/A/B/controller/verifier bytes in race-byte-index.json and a future,
-- separately approved Retry must execute them against 32 fresh overlays.
-- Conceptual families (machine expansion lives in race-catalog.json):
-- pairing-exchange-competing-secret; public-encounter-one-use;
-- public-rate-final-slot; grant-offer-accept-vs-revoke;
-- grant-quota-final-slot; fresh-cycle-competing-reservation;
-- dispatch-vs-zero-dispatch-abandon; response-delivery-vs-owner-close;
-- response-delivery-vs-guest-delete; response-delivery-vs-projection-revoke;
-- operator-pull-vs-binding-revoke; curation-unlist-vs-public-encounter;
-- same-key-concurrent-replay.
WITH exact_counts(key,value) AS (VALUES
  ('named_families',13),
  ('executable_cases',16),
  ('ordered_executions',32),
  ('concurrent_core_calls',64),
  ('c09_recovery_calls',4),
  ('expected_core_calls',68),
  ('expected_2xx',39),
  ('expected_controlled_non_2xx',29),
  ('expected_new_receipts',37),
  ('persisted_verifiers',32)
)
SELECT key,value FROM exact_counts ORDER BY key;

WITH race_order(
  order_id,case_id,first_actor,a_http,a_code,b_http,b_code,
  semantic_effect_count,new_receipt_count
) AS (VALUES
  ('C01-A-B','C01','A',200,'pairing_exchanged',410,'pairing_expired',1,1),
  ('C01-B-A','C01','B',410,'pairing_expired',200,'pairing_exchanged',1,1),
  ('C02-A-B','C02','A',201,'interaction_accepted',409,'capability_unavailable',1,1),
  ('C02-B-A','C02','B',409,'capability_unavailable',201,'interaction_accepted',1,1),
  ('C03-A-B','C03','A',201,'interaction_accepted',429,'rate_limited',1,1),
  ('C03-B-A','C03','B',429,'rate_limited',201,'interaction_accepted',1,1),
  ('C04-A-B','C04','A',201,'public_encounter_issued',429,'rate_limited',1,1),
  ('C04-B-A','C04','B',429,'rate_limited',201,'public_encounter_issued',1,1),
  ('C05-A-B','C05','A',201,'public_encounter_issued',429,'rate_limited',1,1),
  ('C05-B-A','C05','B',429,'rate_limited',201,'public_encounter_issued',1,1),
  ('C06-A-B','C06','A',201,'interaction_accepted',429,'rate_limited',1,1),
  ('C06-B-A','C06','B',429,'rate_limited',201,'interaction_accepted',1,1),
  ('C07-A-B','C07','A',201,'grant_offer_accepted',409,'version_conflict',1,1),
  ('C07-B-A','C07','B',409,'version_conflict',200,'grant_offer_revoked',1,1),
  ('C08-A-B','C08','A',201,'interaction_accepted',409,'capability_unavailable',1,1),
  ('C08-B-A','C08','B',409,'capability_unavailable',201,'interaction_accepted',1,1),
  ('C09-A-B','C09','A',200,'cycle_reserved',409,'version_conflict',1,1),
  ('C09-B-A','C09','B',409,'version_conflict',200,'cycle_reserved',1,1),
  ('C10-A-B','C10','A',200,'dispatch_permit_issued',409,'version_conflict',1,1),
  ('C10-B-A','C10','B',409,'version_conflict',200,'cycle_abandoned_zero_dispatch',1,1),
  ('C11-A-B','C11','A',201,'response_delivered',409,'version_conflict',1,1),
  ('C11-B-A','C11','B',409,'version_conflict',200,'interaction_closed',1,1),
  ('C12-A-B','C12','A',201,'response_delivered',409,'version_conflict',1,1),
  ('C12-B-A','C12','B',409,'version_conflict',200,'interaction_deleted',1,1),
  ('C13-A-B','C13','A',201,'response_delivered',200,'projection_revoked',2,2),
  ('C13-B-A','C13','B',409,'version_conflict',200,'projection_revoked',1,1),
  ('C14-A-B','C14','A',200,'interaction_pulled',200,'binding_revoked',2,2),
  ('C14-B-A','C14','B',404,'not_found',200,'binding_revoked',1,1),
  ('C15-A-B','C15','A',200,'projection_unlisted',404,'not_found',1,1),
  ('C15-B-A','C15','B',200,'projection_unlisted',201,'public_encounter_issued',2,2),
  ('C16-A-B','C16','A',201,'public_encounter_issued',201,'public_encounter_issued',1,1),
  ('C16-B-A','C16','B',201,'public_encounter_issued',201,'public_encounter_issued',1,1)
)
SELECT * FROM race_order ORDER BY order_id;

-- Exact future controller protocol: two overlapping READ COMMITTED worker
-- transactions, barrier and Core call as separate statements, first actor held
-- pre-COMMIT, observer proves second is Lock-waiting on first, then two exact
-- COMMIT gates and process-group reap/absence before the persisted verifier.
WITH protocol_fact(key,value) AS (VALUES
  ('worker_isolation','READ COMMITTED'),
  ('barrier_statement_separate','true'),
  ('observer_role','postgres'),
  ('observer_state','active'),
  ('observer_wait_event_type','Lock'),
  ('fresh_overlay_per_order','true'),
  ('process_absence_is_controller_proof','true')
)
SELECT key,value FROM protocol_fact ORDER BY key;

WITH recovery(order_id,winner_http,winner_code,loser_http,loser_code,new_receipts,domain_effects) AS (VALUES
  ('C09-A-B',200,'cycle_recovered',409,'cycle_recovery_mismatch',1,0),
  ('C09-B-A',200,'cycle_recovered',409,'cycle_recovery_mismatch',1,0)
)
SELECT * FROM recovery ORDER BY order_id;

WITH non_race_assertion(ordinal,assertion_id,expected) AS (VALUES
  (1,'room_event_sequence_monotonic','each inserted sequence equals prior high-water plus one'),
  (2,'room_event_identity_exact','event id, sequence and payload hash all match'),
  (3,'ack_high_water_advances','ack N advances the binding-scoped receipt high-water to N'),
  (4,'duplicate_ack_no_op','an already-acked exact event returns 200 without another effect'),
  (5,'out_of_order_ack_rejected','ack above high-water plus one returns 409 ack_out_of_order'),
  (6,'public_pool_cap_issue_parity','cap20 makes public_encounter.issue return 429'),
  (7,'grant_bypasses_public_pool_and_rate','Grant accepts without public_accept row at public limits'),
  (8,'missing_encounter_rate_lineage_closed','409 capability_unavailable, NULL receipt, zero mutation')
)
SELECT ordinal,assertion_id,expected FROM non_race_assertion ORDER BY ordinal;
