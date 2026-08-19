\set ON_ERROR_STOP on

-- Synthetic-only Core Hero Path. The runner installs the exact basis first.
SET ROLE forme_r4_app;

DO $fixture$
DECLARE
  result forme_r4.api_result_v1;
  encrypted forme_r4.encrypted_field_v1 := '{"schemaVersion":"a256gcm.v1","algorithm":"AES-256-GCM","keyId":"r4.hosted.gate-b.synthetic.v1","nonce":"AAAAAAAAAAAAAAAA","ciphertext":"U1lOVEhFVElD","tag":"BBBBBBBBBBBBBBBBBBBBBB","aadHash":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}'::jsonb;
  controller_scope forme_r4.sha256_digest := 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
  curator_scope forme_r4.sha256_digest := 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  binding_digest forme_r4.sha256_digest := 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  encounter_digest forme_r4.sha256_digest := 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
  reply_digest forme_r4.sha256_digest := 'sha256:2222222222222222222222222222222222222222222222222222222222222222';
  delete_digest forme_r4.sha256_digest := 'sha256:3333333333333333333333333333333333333333333333333333333333333333';
  projection_hash forme_r4.sha256_digest := 'sha256:4444444444444444444444444444444444444444444444444444444444444444';
BEGIN
  result := forme_r4.tx_room_create(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_room_create_key_00000001','sha256:0101010101010101010101010101010101010101010101010101010101010101',NULL,'10000000-0000-4000-8000-000000000001')::forme_r4.mutation_context_v1,
    'room_gatebcorepublic00000001','entity_gatebcoreforme00000001','third_place_public','thirdplace_gatebcore000000001',encrypted);
  IF (result).http_status<>201 OR (result).code<>'room_created' THEN RAISE EXCEPTION 'happy_room_create_failed'; END IF;

  result := forme_r4.tx_room_create(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_room_create_key_00000001','sha256:0101010101010101010101010101010101010101010101010101010101010101',NULL,'10000000-0000-4000-8000-000000000001')::forme_r4.mutation_context_v1,
    'room_gatebcorepublic00000001','entity_gatebcoreforme00000001','third_place_public','thirdplace_gatebcore000000001',encrypted);
  IF (result).http_status<>201 OR (result).code<>'room_created' THEN RAISE EXCEPTION 'happy_room_replay_failed'; END IF;

  result := forme_r4.tx_room_pair_issue(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_room_pair_key_000000001','sha256:0202020202020202020202020202020202020202020202020202020202020202',1,'10000000-0000-4000-8000-000000000002')::forme_r4.mutation_context_v1,
    'room_gatebcorepublic00000001','pairing_gatebcore00000000001','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',encrypted);
  IF (result).http_status<>201 OR (result).code<>'pairing_issued' THEN RAISE EXCEPTION 'happy_pair_issue_failed'; END IF;

  result := forme_r4.tx_room_pair_exchange(
    ROW('public',NULL,'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','core_pair_exchange_key_000001','sha256:0303030303030303030303030303030303030303030303030303030303030303',1,'10000000-0000-4000-8000-000000000003')::forme_r4.mutation_context_v1,
    'pairing_gatebcore00000000001','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','sha256:abababababababababababababababababababababababababababababababab','binding_gatebcore00000000001',binding_digest,'synthetic-sealed-envelope'::bytea,'sha256:bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc');
  IF (result).http_status<>200 OR (result).code<>'pairing_exchanged' THEN RAISE EXCEPTION 'happy_pair_exchange_failed'; END IF;

  result := forme_r4.tx_projection_deliver(
    ROW('room_operator_v1',NULL,binding_digest,'core_projection_delivery_0001','sha256:0404040404040404040404040404040404040404040404040404040404040404',1,'10000000-0000-4000-8000-000000000004')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'projection_gatebcore000000001','room_gatebcorepublic00000001','entity_gatebcoreforme00000001',encrypted,1024,24,128,'basis_gatebcoreprojection000001',projection_hash,
    jsonb_build_object('schemaVersion','publication_attestation.v1','attestationId','attestation_gatebcoreproj0001','bindingId','binding_gatebcore00000000001','roomId','room_gatebcorepublic00000001','artifactClass','projection','artifactId','projection_gatebcore000000001','artifactHash',projection_hash,'issuedAt',to_char(transaction_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char((transaction_timestamp()+interval '7 days') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'hmacSha256','sha256:4545454545454545454545454545454545454545454545454545454545454545'));
  IF (result).http_status<>201 OR (result).code<>'projection_delivered' THEN RAISE EXCEPTION 'happy_projection_delivery_failed'; END IF;

  result := forme_r4.tx_curation_admit(
    ROW('curator','subject_gatebcorecurator000001',curator_scope,'core_curation_admit_key_0001','sha256:0505050505050505050505050505050505050505050505050505050505050505',1,'10000000-0000-4000-8000-000000000005')::forme_r4.mutation_context_v1,
    'thirdplace_gatebcore000000001','projection_gatebcore000000001');
  IF (result).http_status<>200 OR (result).code<>'projection_admitted' THEN RAISE EXCEPTION 'happy_curation_admit_failed'; END IF;

  SELECT * INTO result FROM forme_r4.api_third_place_list();
  IF (result).http_status<>200 OR jsonb_array_length((result).result->'residents')<>1 THEN RAISE EXCEPTION 'happy_third_place_list_failed'; END IF;
  result := forme_r4.api_projection_read('projection_gatebcore000000001',NULL);
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_projection_read_failed'; END IF;

  result := forme_r4.tx_public_encounter_issue(
    ROW('public',NULL,'sha256:5656565656565656565656565656565656565656565656565656565656565656','core_encounter_issue_key_00001','sha256:0606060606060606060606060606060606060606060606060606060606060606',2,'10000000-0000-4000-8000-000000000006')::forme_r4.mutation_context_v1,
    'projection_gatebcore000000001','encounter_gatebcore0000000001',encounter_digest,'sha256:5757575757575757575757575757575757575757575757575757575757575757');
  IF (result).http_status<>201 OR (result).code<>'public_encounter_issued' THEN RAISE EXCEPTION 'happy_encounter_failed'; END IF;

  result := forme_r4.tx_interaction_create(
    ROW('manual_guest',NULL,encounter_digest,'core_interaction_create_0001','sha256:0707070707070707070707070707070707070707070707070707070707070707',NULL,'10000000-0000-4000-8000-000000000007')::forme_r4.mutation_context_v1,
    'public_encounter','encounter_gatebcore0000000001','projection_gatebcore000000001','interaction_gatebcore000000001','ask',encrypted,128,'sha256:5858585858585858585858585858585858585858585858585858585858585858',NULL,NULL,NULL,'g0_manual','allow_owner_local_ai',jsonb_build_object('schemaVersion','consent_envelope.v1','synthetic',true),'sha256:5959595959595959595959595959595959595959595959595959595959595959','reply_gatebcore0000000000001',reply_digest,delete_digest);
  IF (result).http_status<>201 OR (result).code<>'interaction_accepted' THEN RAISE EXCEPTION 'happy_interaction_create_failed'; END IF;

  result := forme_r4.api_interaction_read('interaction_gatebcore000000001',reply_digest);
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_interaction_read_failed'; END IF;
  result := forme_r4.api_control_status('subject_gatebcorecontroller0001');
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_control_status_failed'; END IF;
  result := forme_r4.api_control_interaction_read('subject_gatebcorecontroller0001','interaction_gatebcore000000001');
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_control_interaction_failed'; END IF;
  result := forme_r4.api_room_operator_status('binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001');
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_operator_status_failed'; END IF;

  result := forme_r4.tx_room_operator_sync(
    ROW('room_operator_v1',NULL,binding_digest,'core_operator_sync_key_000001','sha256:0808080808080808080808080808080808080808080808080808080808080808',NULL,'10000000-0000-4000-8000-000000000008')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001',0);
  IF (result).http_status<>200 THEN RAISE EXCEPTION 'happy_sync_failed'; END IF;

  result := forme_r4.tx_room_operator_pull(
    ROW('room_operator_v1',NULL,binding_digest,'core_operator_pull_key_000001','sha256:0909090909090909090909090909090909090909090909090909090909090909',1,'10000000-0000-4000-8000-000000000009')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001');
  IF (result).http_status<>200 OR (result).target_version<>2 THEN RAISE EXCEPTION 'happy_pull_failed'; END IF;

  result := forme_r4.tx_room_event_ack(
    ROW('room_operator_v1',NULL,binding_digest,'core_operator_ack_key_0000001','sha256:1010101010101010101010101010101010101010101010101010101010101010',NULL,'10000000-0000-4000-8000-000000000010')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'room_gatebcorepublic00000001','streamevent_room_create_10000000000040008000000000000001',1,'sha256:0101010101010101010101010101010101010101010101010101010101010101');
  IF (result).http_status<>200 OR (result).code<>'event_acked' THEN RAISE EXCEPTION 'happy_ack_failed'; END IF;

  result := forme_r4.tx_fresh_cycle_reserve(
    ROW('room_operator_v1',NULL,binding_digest,'core_cycle_reserve_key_00001','sha256:1111111111111111111111111111111111111111111111111111111111111111',2,'10000000-0000-4000-8000-000000000011')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001','reservation_gatebcore00000001','sha256:1212121212121212121212121212121212121212121212121212121212121212','sha256:1313131313131313131313131313131313131313131313131313131313131313');
  IF (result).http_status<>200 OR (result).code<>'cycle_reserved' THEN RAISE EXCEPTION 'happy_reserve_failed'; END IF;

  result := forme_r4.tx_fresh_cycle_recover(
    ROW('room_operator_v1',NULL,binding_digest,'core_cycle_recover_key_00001','sha256:1414141414141414141414141414141414141414141414141414141414141414',1,'10000000-0000-4000-8000-000000000012')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001','reservation_gatebcore00000001','sha256:1212121212121212121212121212121212121212121212121212121212121212','sha256:1313131313131313131313131313131313131313131313131313131313131313');
  IF (result).http_status<>200 OR (result).code<>'cycle_recovered' THEN RAISE EXCEPTION 'happy_recover_failed'; END IF;

  result := forme_r4.tx_fresh_cycle_abandon_zero_dispatch(
    ROW('room_operator_v1',NULL,binding_digest,'core_cycle_abandon_key_00001','sha256:1515151515151515151515151515151515151515151515151515151515151515',1,'10000000-0000-4000-8000-000000000013')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001','reservation_gatebcore00000001','sha256:1212121212121212121212121212121212121212121212121212121212121212','sha256:1313131313131313131313131313131313131313131313131313131313131313',0);
  IF (result).http_status<>200 OR (result).code<>'cycle_abandoned_zero_dispatch' THEN RAISE EXCEPTION 'happy_abandon_failed'; END IF;

  result := forme_r4.tx_response_deliver(
    ROW('room_operator_v1',NULL,binding_digest,'core_response_deliver_key_0001','sha256:1616161616161616161616161616161616161616161616161616161616161616',4,'10000000-0000-4000-8000-000000000014')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001','response_gatebcore00000000001',encrypted,256,'sha256:1717171717171717171717171717171717171717171717171717171717171717','sha256:1818181818181818181818181818181818181818181818181818181818181818','sha256:1919191919191919191919191919191919191919191919191919191919191919','published_fresh','manual_owner_authored','basis_gatebcoreresponse0000001',jsonb_build_object('schemaVersion','publication_attestation.v1','attestationId','attestation_gatebcoreresp0001','bindingId','binding_gatebcore00000000001','roomId','room_gatebcorepublic00000001','artifactClass','response','artifactId','response_gatebcore00000000001','artifactHash','sha256:1919191919191919191919191919191919191919191919191919191919191919','issuedAt',to_char(transaction_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char((transaction_timestamp()+interval '7 days') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'hmacSha256','sha256:2020202020202020202020202020202020202020202020202020202020202020'));
  IF (result).http_status<>201 OR (result).code<>'response_delivered' THEN RAISE EXCEPTION 'happy_response_failed'; END IF;

  result := forme_r4.tx_grant_offer_issue(
    ROW('controller','subject_gatebcorecontroller0001',controller_scope,'core_offer_issue_key_0000001','sha256:2121212121212121212121212121212121212121212121212121212121212121',NULL,'10000000-0000-4000-8000-000000000015')::forme_r4.mutation_context_v1,
    'offer_gatebcore0000000000001','interaction_gatebcore000000001','room_gatebcorepublic00000001','projection_gatebcore000000001','short_exchange',transaction_timestamp()+interval '1 day',transaction_timestamp()+interval '7 days');
  IF (result).http_status<>201 OR (result).code<>'grant_offer_issued' THEN RAISE EXCEPTION 'happy_offer_issue_failed'; END IF;

  result := forme_r4.tx_grant_offer_accept(
    ROW('manual_guest',NULL,reply_digest,'core_offer_accept_key_0000001','sha256:2223232323232323232323232323232323232323232323232323232323232323',1,'10000000-0000-4000-8000-000000000016')::forme_r4.mutation_context_v1,
    'offer_gatebcore0000000000001',reply_digest,'grant_gatebcore0000000000001','sha256:2424242424242424242424242424242424242424242424242424242424242424','chain_gatebcore0000000000001');
  IF (result).http_status<>201 OR (result).code<>'grant_offer_accepted' THEN RAISE EXCEPTION 'happy_offer_accept_failed'; END IF;

  result := forme_r4.tx_local_purge_receipt(
    ROW('room_operator_v1',NULL,binding_digest,'core_local_purge_key_0000001','sha256:2525252525252525252525252525252525252525252525252525252525252525',5,'10000000-0000-4000-8000-000000000017')::forme_r4.mutation_context_v1,
    'binding_gatebcore00000000001',binding_digest,'interaction_gatebcore000000001',true);
  IF (result).http_status<>200 OR (result).code<>'local_purge_recorded' THEN RAISE EXCEPTION 'happy_local_purge_failed'; END IF;
END
$fixture$;

RESET ROLE;
