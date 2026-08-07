\set ON_ERROR_STOP on

-- Body-free race manifest only. It is intentionally not accepted as physical
-- race evidence: exact per-scenario worker call bytes and persistent-state
-- verifiers still require a separately approved physical-adapter construction.
-- A successor must use tracked controller/A/B process groups, actual Core
-- function calls, actor-specific pg_advisory_xact_lock barriers and both
-- release/commit orders.
WITH race_plan(
  ordinal,race_id,barrier,actor_a,actor_b,expected_order_a,expected_order_b,
  commit_orders,cleanup_required
) AS (VALUES
  (1,'pairing-exchange-competing-secret','core-race-01-pairing','public.exchange.secret_a','public.exchange.secret_b','200 pairing_exchanged / 409 controlled','200 pairing_exchanged / 409 controlled',2,true),
  (2,'public-encounter-one-use','core-race-02-encounter','guest.interaction_a','guest.interaction_b','201 interaction_accepted / 409 capability_unavailable','201 interaction_accepted / 409 capability_unavailable',2,true),
  (3,'public-rate-final-slot','core-race-03-rate','guest.final_slot','guest.quota_plus_one','final slot accepted / 429 rate_limited','final slot accepted / 429 rate_limited',2,true),
  (4,'grant-offer-accept-vs-revoke','core-race-04-offer','guest.accept','controller.revoke','winner committed / loser offer_unavailable','winner committed / loser offer_unavailable',2,true),
  (5,'grant-quota-final-slot','core-race-05-grant','guest.quota','guest.quota_plus_one','quota accepted / quota+1 capability_unavailable','quota accepted / quota+1 capability_unavailable',2,true),
  (6,'fresh-cycle-competing-reservation','core-race-06-cycle','operator.reserve_a','operator.reserve_b','200 cycle_reserved / 409 cycle_already_reserved','200 cycle_reserved / 409 cycle_already_reserved',2,true),
  (7,'dispatch-vs-zero-dispatch-abandon','core-race-07-dispatch','operator.dispatch','operator.abandon','dispatch_permit_issued / dispatch_already_committed','cycle_abandoned_zero_dispatch / dispatch_unavailable',2,true),
  (8,'response-delivery-vs-owner-close','core-race-08-owner-close','operator.deliver','controller.close','response_delivered / interaction_not_closable','interaction_closed / response_unavailable',2,true),
  (9,'response-delivery-vs-guest-delete','core-race-09-guest-delete','operator.deliver','guest.delete','response_delivered / terminal_state','interaction_deleted / response_unavailable',2,true),
  (10,'response-delivery-vs-projection-revoke','core-race-10-projection','operator.deliver','controller.projection_revoke','response_delivered then terminalized / controlled','projection_revoked / response_unavailable',2,true),
  (11,'operator-pull-vs-binding-revoke','core-race-11-binding','operator.pull','controller.binding_revoke','pull 200 then revoke 200','revoke 200 then pull 404 not_found',2,true),
  (12,'curation-unlist-vs-public-encounter','core-race-12-curation','curator.unlist','public.encounter','one committed / one controlled','one committed / one controlled',2,true),
  (13,'same-key-concurrent-replay','core-race-13-idempotency','actor.same_request_a','actor.same_request_b','one semantic effect / two identical results','one semantic effect / two identical results',2,true)
)
SELECT ordinal,race_id,barrier,actor_a,actor_b,expected_order_a,expected_order_b,
  commit_orders,cleanup_required,
  'RACE_WORKER_CALL_BYTES_REQUIRE_FOLLOWUP_CONSTRUCTION'::text AS construction_status
FROM race_plan
WHERE ordinal BETWEEN 1 AND 13
ORDER BY ordinal;

-- Exact barrier protocol for every row above:
--   controller: marker intent -> spawn worker A/B process groups -> wait-ready
--   worker: BEGIN ISOLATION LEVEL SERIALIZABLE -> pg_advisory_xact_lock(hashtextextended(barrier,0))
--   controller: release one worker -> observe commit -> release the other
--   controller: validate controlled results + persisted body-free state -> reap
--   repeat with opposite release order -> rollback fixture scope -> prove cleanup

WITH non_race_assertion(ordinal,assertion_id,expected) AS (VALUES
  (1,'room_event_sequence_monotonic','each inserted sequence equals prior high-water plus one'),
  (2,'room_event_identity_exact','event id, sequence and payload hash must all match'),
  (3,'ack_high_water_advances','ack N advances the binding-scoped receipt high-water to N'),
  (4,'duplicate_ack_no_op','an already-acked exact event returns 200 without another effect'),
  (5,'out_of_order_ack_rejected','ack above high-water plus one returns 409 ack_out_of_order')
)
SELECT ordinal,assertion_id,expected FROM non_race_assertion ORDER BY ordinal;
