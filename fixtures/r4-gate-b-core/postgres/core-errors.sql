\set ON_ERROR_STOP on

-- Controlled failures, terminal unreadability and the remaining Core successes.
SET ROLE forme_r4_app;

DO $fixture$
DECLARE
  result forme_r4.api_result_v1;
  encrypted forme_r4.encrypted_field_v1 := '{"schemaVersion":"a256gcm.v1","algorithm":"AES-256-GCM","keyId":"r4.hosted.gate-b.synthetic.v1","nonce":"CCCCCCCCCCCCCCCC","ciphertext":"U1lOVEhFVElDMg","tag":"DDDDDDDDDDDDDDDDDDDDDD","aadHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb;
  controller_scope forme_r4.sha256_digest := 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
  curator_scope forme_r4.sha256_digest := 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  binding_digest forme_r4.sha256_digest := 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  encounter_two forme_r4.sha256_digest := 'sha256:3131313131313131313131313131313131313131313131313131313131313131';
  encounter_three forme_r4.sha256_digest := 'sha256:4141414141414141414141414141414141414141414141414141414141414141';
  delete_two forme_r4.sha256_digest := 'sha256:3232323232323232323232323232323232323232323232323232323232323232';
BEGIN
  result := forme_r4.tx_room_create(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_room_create_key_00000001','sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',NULL,'20000000-0000-4000-8000-000000000001')::forme_r4.mutation_context_v1,
    'room_gatebcorepublic00000001','entity_gatebcoreforme00000001','third_place_public','thirdplace_gatebcore000000001',encrypted);
  IF (result).http_status<>409 OR (result).code<>'idempotency_conflict' THEN RAISE EXCEPTION 'error_same_key_different_hash_failed'; END IF;

  result := forme_r4.tx_room_create(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_private_room_key_0000001','sha256:3030303030303030303030303030303030303030303030303030303030303030',NULL,'20000000-0000-4000-8000-000000000002')::forme_r4.mutation_context_v1,
    'room_gatebcoreprivate0000001','entity_gatebcoreforme00000001','private_grant_only','thirdplace_gatebcore000000001',encrypted);
  IF (result).http_status<>403 THEN RAISE EXCEPTION 'error_private_room_not_denied'; END IF;

  result := forme_r4.api_room_operator_status('binding_gatebcorewrong000000001',binding_digest,'room_gatebcorepublic00000001');
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_wrong_binding_not_hidden'; END IF;

  result := forme_r4.tx_grant_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_grant_stale_key_000001','sha256:3434343434343434343434343434343434343434343434343434343434343434',2,'20000000-0000-4000-8000-000000000003')::forme_r4.mutation_context_v1,
    'grant_gatebcore0000000000001');
  IF (result).http_status<>409 OR (result).code<>'version_conflict' THEN RAISE EXCEPTION 'error_stale_version_failed'; END IF;

  result := forme_r4.tx_public_encounter_issue(
    ROW('public',NULL,'sha256:3535353535353535353535353535353535353535353535353535353535353535','core_encounter_two_key_000001','sha256:3636363636363636363636363636363636363636363636363636363636363636',2,'20000000-0000-4000-8000-000000000004')::forme_r4.mutation_context_v1,
    'projection_gatebcore000000001','encounter_gatebcore0000000002',encounter_two,'sha256:3737373737373737373737373737373737373737373737373737373737373737');
  IF (result).http_status<>201 THEN RAISE EXCEPTION 'error_fixture_encounter_two_failed'; END IF;
  result := forme_r4.tx_interaction_create(
    ROW('manual_guest',NULL,encounter_two,'core_interaction_two_key_00001','sha256:3838383838383838383838383838383838383838383838383838383838383838',NULL,'20000000-0000-4000-8000-000000000005')::forme_r4.mutation_context_v1,
    'public_encounter','encounter_gatebcore0000000002','projection_gatebcore000000001','interaction_gatebcore000000002','seed',encrypted,64,'sha256:3939393939393939393939393939393939393939393939393939393939393939',NULL,NULL,NULL,'g0_manual','manual_owner_only',NULL,NULL,'reply_gatebcore0000000000002','sha256:4040404040404040404040404040404040404040404040404040404040404040',delete_two);
  IF (result).http_status<>201 THEN RAISE EXCEPTION 'error_fixture_interaction_two_failed'; END IF;
  result := forme_r4.tx_interaction_delete(
    ROW('manual_guest',NULL,delete_two,'core_interaction_delete_0001','sha256:4242424242424242424242424242424242424242424242424242424242424242',1,'20000000-0000-4000-8000-000000000006')::forme_r4.mutation_context_v1,
    'interaction_gatebcore000000002',delete_two);
  IF (result).http_status<>200 OR (result).code<>'interaction_deleted' THEN RAISE EXCEPTION 'error_fixture_delete_failed'; END IF;
  result := forme_r4.api_interaction_read('interaction_gatebcore000000002','sha256:4040404040404040404040404040404040404040404040404040404040404040');
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_deleted_body_still_readable'; END IF;

  result := forme_r4.tx_public_encounter_issue(
    ROW('public',NULL,'sha256:4343434343434343434343434343434343434343434343434343434343434343','core_encounter_three_key_00001','sha256:4445454545454545454545454545454545454545454545454545454545454545',2,'20000000-0000-4000-8000-000000000007')::forme_r4.mutation_context_v1,
    'projection_gatebcore000000001','encounter_gatebcore0000000003',encounter_three,'sha256:4646464646464646464646464646464646464646464646464646464646464646');
  IF (result).http_status<>201 THEN RAISE EXCEPTION 'error_fixture_encounter_three_failed'; END IF;
  result := forme_r4.tx_interaction_create(
    ROW('manual_guest',NULL,encounter_three,'core_interaction_three_key_0001','sha256:4747474747474747474747474747474747474747474747474747474747474747',NULL,'20000000-0000-4000-8000-000000000008')::forme_r4.mutation_context_v1,
    'public_encounter','encounter_gatebcore0000000003','projection_gatebcore000000001','interaction_gatebcore000000003','resonance',encrypted,64,'sha256:4848484848484848484848484848484848484848484848484848484848484848',NULL,NULL,NULL,'g0_manual','manual_owner_only',NULL,NULL,'reply_gatebcore0000000000003','sha256:4949494949494949494949494949494949494949494949494949494949494949','sha256:5050505050505050505050505050505050505050505050505050505050505050');
  IF (result).http_status<>201 THEN RAISE EXCEPTION 'error_fixture_interaction_three_failed'; END IF;
  result := forme_r4.tx_room_operator_pull(
    ROW('room_operator_v1',NULL,binding_digest,'core_pull_three_key_00000001','sha256:5151515151515151515151515151515151515151515151515151515151515151',1,'20000000-0000-4000-8000-000000000009')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000003');
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'error_fixture_pull_three_failed'; END IF;
  result := forme_r4.tx_fresh_cycle_reserve(
    ROW('room_operator_v1',NULL,binding_digest,'core_reserve_three_key_000001','sha256:5252525252525252525252525252525252525252525252525252525252525252',2,'20000000-0000-4000-8000-000000000010')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000003','reservation_gatebcore00000003','sha256:5353535353535353535353535353535353535353535353535353535353535353','sha256:5454545454545454545454545454545454545454545454545454545454545454');
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'error_fixture_reserve_three_failed'; END IF;
  result := forme_r4.tx_dispatch_permit_issue(
    ROW('room_operator_v1',NULL,binding_digest,'core_dispatch_three_key_00001','sha256:5555555555555555555555555555555555555555555555555555555555555555',1,'20000000-0000-4000-8000-000000000011')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000003','reservation_gatebcore00000003','sha256:5454545454545454545454545454545454545454545454545454545454545454','sha256:5353535353535353535353535353535353535353535353535353535353535353','OpenAI','synthetic-model','sha256:5656565656565656565656565656565656565656565656565656565656565656',1,'permit_gatebcore0000000000001');
  IF (result).http_status<>200 OR (result).code<>'dispatch_permit_issued' THEN RAISE EXCEPTION 'error_fixture_dispatch_failed'; END IF;
  result := forme_r4.tx_fresh_cycle_abandon_zero_dispatch(
    ROW('room_operator_v1',NULL,binding_digest,'core_bad_abandon_key_0000001','sha256:5757575757575757575757575757575757575757575757575757575757575757',2,'20000000-0000-4000-8000-000000000012')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000003','reservation_gatebcore00000003','sha256:5353535353535353535353535353535353535353535353535353535353535353','sha256:5454545454545454545454545454545454545454545454545454545454545454',0);
  IF (result).http_status<>409 OR (result).code<>'dispatch_already_committed' THEN RAISE EXCEPTION 'error_dispatch_abandon_race_failed'; END IF;
  result := forme_r4.tx_interaction_close(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_close_three_key_0000001','sha256:5858585858585858585858585858585858585858585858585858585858585858',3,'20000000-0000-4000-8000-000000000013')::forme_r4.mutation_context_v1,
    'interaction_gatebcore000000003');
  IF (result).http_status<>200 OR (result).code<>'interaction_closed' THEN RAISE EXCEPTION 'error_fixture_close_failed'; END IF;

  result := forme_r4.tx_room_event_ack(
    ROW('room_operator_v1',NULL,binding_digest,'core_ack_out_order_key_000001','sha256:5959595959595959595959595959595959595959595959595959595959595959',NULL,'20000000-0000-4000-8000-000000000014')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001','streamevent_interaction_10000000000040008000000000000007',3,'sha256:0707070707070707070707070707070707070707070707070707070707070707');
  IF (result).http_status<>409 OR (result).code<>'ack_out_of_order' THEN RAISE EXCEPTION 'error_ack_order_failed'; END IF;
  result := forme_r4.tx_room_event_ack(
    ROW('room_operator_v1',NULL,binding_digest,'core_ack_projection_key_000001','sha256:6060606060606060606060606060606060606060606060606060606060606060',NULL,'20000000-0000-4000-8000-000000000015')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001','streamevent_projection_10000000000040008000000000000004',2,'sha256:4444444444444444444444444444444444444444444444444444444444444444');
  IF (result).http_status<>200 OR (result).code<>'event_acked' THEN RAISE EXCEPTION 'error_ack_two_failed'; END IF;

  result := forme_r4.tx_curation_unlist(
    ROW('curator','subject_gatebcorecurator000001',curator_scope,'core_curation_unlist_key_0001','sha256:6161616161616161616161616161616161616161616161616161616161616161',2,'20000000-0000-4000-8000-000000000016')::forme_r4.mutation_context_v1,
    'thirdplace_gatebcore000000001','projection_gatebcore000000001');
  IF (result).http_status<>200 OR (result).code<>'projection_unlisted' THEN RAISE EXCEPTION 'error_fixture_unlist_failed'; END IF;
  result := forme_r4.tx_public_encounter_issue(
    ROW('public',NULL,'sha256:6262626262626262626262626262626262626262626262626262626262626262','core_unlisted_encounter_key_001','sha256:6363636363636363636363636363636363636363636363636363636363636363',3,'20000000-0000-4000-8000-000000000017')::forme_r4.mutation_context_v1,
    'projection_gatebcore000000001','encounter_gatebcore0000000004','sha256:6464646464646464646464646464646464646464646464646464646464646464','sha256:6565656565656565656565656565656565656565656565656565656565656565');
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_unlisted_encounter_not_denied'; END IF;

  result := forme_r4.tx_grant_offer_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_accepted_offer_revoke_01','sha256:6666666666666666666666666666666666666666666666666666666666666666',2,'20000000-0000-4000-8000-000000000018')::forme_r4.mutation_context_v1,
    'offer_gatebcore0000000000001');
  IF (result).http_status<>409 OR (result).code<>'offer_unavailable' THEN RAISE EXCEPTION 'error_accepted_offer_revoke_failed'; END IF;
  result := forme_r4.tx_grant_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_grant_revoke_key_000001','sha256:6767676767676767676767676767676767676767676767676767676767676767',1,'20000000-0000-4000-8000-000000000019')::forme_r4.mutation_context_v1,
    'grant_gatebcore0000000000001');
  IF (result).http_status<>200 OR (result).code<>'grant_revoked' THEN RAISE EXCEPTION 'error_fixture_grant_revoke_failed'; END IF;
  result := forme_r4.tx_response_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_response_revoke_key_0001','sha256:6868686868686868686868686868686868686868686868686868686868686868',1,'20000000-0000-4000-8000-000000000020')::forme_r4.mutation_context_v1,
    'response_gatebcore00000000001');
  IF (result).http_status<>200 OR (result).code<>'response_revoked' THEN RAISE EXCEPTION 'error_fixture_response_revoke_failed'; END IF;
  result := forme_r4.tx_projection_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_projection_revoke_key_01','sha256:6969696969696969696969696969696969696969696969696969696969696969',3,'20000000-0000-4000-8000-000000000021')::forme_r4.mutation_context_v1,
    'projection_gatebcore000000001');
  IF (result).http_status<>200 OR (result).code<>'projection_revoked' THEN RAISE EXCEPTION 'error_fixture_projection_revoke_failed'; END IF;
  result := forme_r4.api_projection_read('projection_gatebcore000000001',NULL);
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_revoked_projection_readable'; END IF;
  result := forme_r4.api_interaction_read('interaction_gatebcore000000001','sha256:2222222222222222222222222222222222222222222222222222222222222222');
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_origin_revoked_interaction_readable'; END IF;
  result := forme_r4.tx_room_binding_revoke(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_binding_revoke_key_00001','sha256:7070707070707070707070707070707070707070707070707070707070707070',1,'20000000-0000-4000-8000-000000000022')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001');
  IF (result).http_status<>200 OR (result).code<>'binding_revoked' THEN RAISE EXCEPTION 'error_fixture_binding_revoke_failed'; END IF;
  result := forme_r4.api_room_operator_status('binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001');
  IF (result).http_status<>404 THEN RAISE EXCEPTION 'error_revoked_binding_active'; END IF;
END
$fixture$;

RESET ROLE;
