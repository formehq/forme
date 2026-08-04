# R4 Gate B exact operation map

- Status: `PROPOSED_NOT_EXECUTED`
- Authority: R4 Technical Control Packet v0.2
- Approved Packet SHA-256:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- API contract version: `forme.r4.api.v1`
- Canonical HTTP prefix: `/api/v1`
- Operation count: **45**
- Mutation count: **39**
- Read count: **6**
- Mutations requiring an expected object version: **31**
- First Provider-Call Test Grant: `NOT_REQUESTED`

This is a proposed Gate B contract artifact. Its presence does not claim that
Gate B has run and does not authorize a provider call, a Codex thread or turn,
hosted mutation, deployment, external email, real identity, or production
credential.

## Common wire rules

1. Every request and result is a closed API-v1 object. Unknown fields fail
   `400 invalid_request_shape`. The API schema names below are versioned by
   this artifact; they do not add a new `schemaVersion` member to existing
   wire bytes.
2. A `GET` request obtains its request object from unique query keys. Decimal
   digit-only values are parsed as non-negative JSON numbers. Duplicate query
   keys fail `400 duplicate_query_key`.
3. Every non-`GET` request is one exact JSON object with
   `Content-Type: application/json`; the UTF-8 body ceiling is 65,536 bytes.
4. Every mutation requires `Idempotency-Key` matching
   `^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$`. The canonical
   `api_mutation_envelope.v1` binds actor, action, key, request hash, supplied
   expected version, `predecessorHash:null`, and payload hash. Same
   actor/action/key/request bytes recover the prior safe result; a different
   request hash fails `409 idempotency_conflict`.
5. `V=required` means `If-Match` must contain the current integer object
   version. `V=not-required` means the current implementation does not require
   it; for a mutation, a supplied value is still included in the canonical
   mutation hash. Reads ignore it. This artifact does not silently tighten
   that behavior.
6. Every capability secret and Bearer token is the canonical unpadded base64url
   encoding of exactly 32 bytes. Capability failures use controlled `404`
   behavior.
7. Current Controller, Curator, and Room-operator role headers are synthetic
   Gate A/Gate B identities. Cloudflare Access and production identity binding
   remain Gate C.
8. Every result is JSON with `Cache-Control: no-store`. The shared canonical
   objects named with a `.v1` wire version remain governed by
   `schemas/r4/protocol.schema.json`. API-only wrappers are governed by the
   closed API-v1 schema to be generated from this map.

## Authentication notation

| Code | Exact current meaning |
|---|---|
| `PUBLIC` | No Bearer. `public_encounter.issue` additionally requires the current synthetic client-bucket header. |
| `PROJECTION` | Public for an eligible public Room; an eligible private Projection requires an exact Grant or AgentDerivative Bearer. |
| `SUBMIT` | Exact PublicEncounter, Grant, or AgentDerivative Bearer bound to the Room and Projection. |
| `REPLY` | Exact Interaction reply Bearer. |
| `DELETE` | Exact Interaction delete Bearer; a reply Bearer cannot delete. |
| `PARENT_CAP` | Exact issued PublicEncounter or Grant Bearer whose policy permits Agent derivative minting. |
| `INVITE` | Exact one-use DirectGrantInvite secret as Bearer. |
| `PAIR_CODE` | No Bearer; exact live pairing code is in the request body. |
| `CONTROLLER` | `x-forme-synthetic-actor: controller`. |
| `CURATOR` | `x-forme-synthetic-actor: curator`. |
| `ROOM_OPERATOR` | `x-forme-synthetic-actor: room_operator` plus an exact active, unexpired, exact-Room binding Bearer. The request is also bound as `room_operator_request.v1`. |

## Exact 45-operation map

`Idem=yes` applies the common idempotency rule. `V=required` applies the common
`If-Match` rule. Braces list the exact top-level request members; `[]` means an
empty closed request object.

| # | Action | Method and path | Auth | Exact request schema / top-level members | Success result schema and status | Idem | V |
|---:|---|---|---|---|---|---|---|
| 1 | `third_place.list` | `GET /third-place/projections` | `PUBLIC` | `ThirdPlaceListRequestV1` `[]` | `200 ThirdPlaceListResultV1`; wire `third_place_list.v1` `{schemaVersion,residents}` | no | not-required |
| 2 | `projection.read` | `GET /projections/:projectionId` | `PROJECTION` | `ProjectionReadRequestV1` `[]` | `200 ProjectionReadResultV1` `{view:projection_read_view.v1}`; wrapper has no wire `schemaVersion` | no | not-required |
| 3 | `public_encounter.issue` | `POST /projections/:projectionId/encounters` | `PUBLIC` | `PublicEncounterIssueRequestV1` `{encounterSecret}` | `201 PublicEncounterIssueResultV1` `{encounter:public_encounter.v1 redacted view,receipt:operation_receipt.v1}` | yes | required |
| 4 | `interaction.create` | `POST /interactions` | `SUBMIT` | `InteractionCreateRequestV1` required `{projectionId,interactionType,consent,requestBody}`; optional `{replySecret,deleteSecret,guestCapsule}` | `201 InteractionCreateResultV1`; wire `interaction_create_result.v1` `{schemaVersion,interactionId,state,expiresAt,receipt}` | yes | not-required |
| 5 | `interaction.read` | `GET /interactions/:interactionId` | `REPLY` | `InteractionReadRequestV1` `[]` | `200 InteractionReadResultV1`; wire `guest_interaction_status.v1` `{schemaVersion,interaction}` | no | not-required |
| 6 | `interaction.delete` | `DELETE /interactions/:interactionId` | `DELETE` | `InteractionDeleteRequestV1` `[]` | `200 InteractionDeleteResultV1`; wire `interaction_delete_result.v1` `{schemaVersion,state,receipt}` | yes | required |
| 7 | `notification.set` | `PUT /interactions/:interactionId/notification` | `REPLY` | `NotificationSetRequestV1` `{email}` | `202 NotificationSetResultV1`; wire `notification_set_result.v1` `{schemaVersion,endpoint,syntheticVerification,receipt}` | yes | required |
| 8 | `notification.remove` | `DELETE /interactions/:interactionId/notification` | `REPLY` | `NotificationRemoveRequestV1` `[]` | `200 NotificationRemoveResultV1`; wire `notification_remove_result.v1` `{schemaVersion,endpoint,receipt}` | yes | required |
| 9 | `notification.verify` | `POST /interactions/:interactionId/notification/verify` | `REPLY` | `NotificationVerifyRequestV1` `{code}` | `200 NotificationVerifyResultV1`; wire `notification_verify_result.v1` `{schemaVersion,endpoint,receipt}` | yes | required |
| 10 | `grant_offer.accept` | `POST /grant-offers/:offerId/accept` | `REPLY` of the source Interaction | `GrantOfferAcceptRequestV1` `{grantSecret}` | `201 GrantOfferAcceptResultV1` `{grant:grant.v1 redacted view,receipt}` | yes | required |
| 11 | `direct_invite.redeem` | `POST /direct-invites/:inviteId/redeem` | `INVITE` | `DirectInviteRedeemRequestV1` `{grantSecret}` | `201 DirectInviteRedeemResultV1` `{grant:grant.v1 redacted view,receipt}` | yes | required |
| 12 | `agent_derivative.mint` | `POST /agent-derivatives` | `PARENT_CAP` | `AgentDerivativeMintRequestV1` `{agentSecret,replySecret,deleteSecret}` | `201 AgentDerivativeMintResultV1` `{derivative:agent_derivative.v1 redacted view,receipt}` | yes | not-required |
| 13 | `control.status` | `GET /control/status` | `CONTROLLER` | `ControlStatusRequestV1` `[]` | `200 ControlStatusResultV1`; wire `synthetic_owner_status.v1` | no | not-required |
| 14 | `control.interaction.read` | `GET /control/interactions/:interactionId` | `CONTROLLER` | `ControlInteractionReadRequestV1` `[]` | `200 ControlInteractionReadResultV1`; wire `owner_interaction_view.v1` `{schemaVersion,interaction,response}` | no | not-required |
| 15 | `room.create` | `POST /control/rooms` | `CONTROLLER` | `RoomCreateRequestV1` `{entityId,roomKind,label}` | `201 RoomCreateResultV1` `{room:room.v1,receipt}` | yes | not-required |
| 16 | `room.pair` | `POST /control/rooms/:roomId/pairings` | `CONTROLLER` | `RoomPairRequestV1` `[]` | `201 RoomPairResultV1`; wire `synthetic_pairing_challenge_result.v1` `{schemaVersion,pairingId,roomId,pairingCode,expiresAt,version,receipt}` | yes | required |
| 17 | `room.pair.exchange` | `POST /pairings/:pairingId/exchange` | `PAIR_CODE` | `RoomPairExchangeRequestV1` `{pairingCode,clientPublicKey}` | `201 RoomPairExchangeResultV1`; wire `synthetic_pairing_exchange_result.v1` `{schemaVersion,pairingId,bindingId,roomId,expiresAt,sealedCredential,version,receipt}` | yes | required |
| 18 | `room.binding.revoke` | `POST /control/room-bindings/:bindingId/revoke` | `CONTROLLER` | `RoomBindingRevokeRequestV1` `[]` | `200 RoomBindingRevokeResultV1`; wire `synthetic_room_binding_revoke_result.v1` `{schemaVersion,bindingId,roomId,state,revokedAt,version,receipt}` | yes | required |
| 19 | `room.mode.set` | `POST /control/rooms/:roomId/mode` | `CONTROLLER` | `RoomModeSetRequestV1` `{interactionMode}` | `200 RoomModeSetResultV1` `{room:room.v1,receipt}` | yes | required |
| 20 | `room.retire` | `POST /control/rooms/:roomId/retire` | `CONTROLLER` | `RoomRetireRequestV1` `[]` | `200 RoomRetireResultV1` `{room:room.v1,receipt}` | yes | required |
| 21 | `room.delete` | `DELETE /control/rooms/:roomId` | `CONTROLLER` | `RoomDeleteRequestV1` `[]` | `202 RoomDeleteResultV1`; wire `room_delete_result.v1` `{schemaVersion,state,receipt}` | yes | required |
| 22 | `projection.revoke` | `POST /control/projections/:projectionId/revoke` | `CONTROLLER` | `ProjectionRevokeRequestV1` `[]` | `200 ProjectionRevokeResultV1` `{lifecycle:projection_lifecycle.v1,receipt}` | yes | required |
| 23 | `response.revoke` | `POST /control/responses/:responseId/revoke` | `CONTROLLER` | `ResponseRevokeRequestV1` `[]` | `200 ResponseRevokeResultV1`; wire `response_revoke_result.v1` `{schemaVersion,responseState,receipt}` | yes | required |
| 24 | `grant.issue` | `POST /control/grants` | `CONTROLLER` | `GrantIssueRequestV1` required `{roomId,projectionId,presetId,grantSecret}`; optional `{permitsAgentDerivative,reentryChainId}` | `201 GrantIssueResultV1` `{grant:grant.v1 redacted view,receipt}` | yes | not-required |
| 25 | `grant.replace` | `POST /control/grants/:grantId/replacements` | `CONTROLLER` | `GrantReplaceRequestV1` required `{grantSecret}`; optional `{presetId,permitsAgentDerivative}` | `201 GrantReplaceResultV1` `{grant:grant.v1 redacted view,replacedGrantId,receipt}` | yes | required |
| 26 | `grant.revoke` | `POST /control/grants/:grantId/revoke` | `CONTROLLER` | `GrantRevokeRequestV1` `[]` | `200 GrantRevokeResultV1` `{grant:grant.v1 redacted view,receipt}` | yes | required |
| 27 | `grant_offer.issue` | `POST /control/grant-offers` | `CONTROLLER` | `GrantOfferIssueRequestV1` `{sourceInteractionId,roomId,projectionId,presetId,acceptanceExpiresAt,offeredGrantExpiresAt}` | `201 GrantOfferIssueResultV1` `{offer:grant_offer.v1,receipt}` | yes | not-required |
| 28 | `grant_offer.revoke` | `POST /control/grant-offers/:offerId/revoke` | `CONTROLLER` | `GrantOfferRevokeRequestV1` `[]` | `200 GrantOfferRevokeResultV1` `{offer:grant_offer.v1,receipt}` | yes | required |
| 29 | `direct_invite.issue` | `POST /control/direct-invites` | `CONTROLLER` | `DirectInviteIssueRequestV1` `{roomId,projectionId,presetId,inviteSecret,acceptanceExpiresAt,offeredGrantExpiresAt}` | `201 DirectInviteIssueResultV1` `{invite:direct_grant_invite.v1 redacted view,receipt}` | yes | not-required |
| 30 | `direct_invite.revoke` | `POST /control/direct-invites/:inviteId/revoke` | `CONTROLLER` | `DirectInviteRevokeRequestV1` `[]` | `200 DirectInviteRevokeResultV1` `{invite:direct_grant_invite.v1 redacted view,receipt}` | yes | required |
| 31 | `interaction.close` | `POST /control/interactions/:interactionId/close` | `CONTROLLER` | `InteractionCloseRequestV1` `[]` | `200 InteractionCloseResultV1`; wire `interaction_close_result.v1` `{schemaVersion,state,receipt}` | yes | required |
| 32 | `curation.admit` | `POST /curation/projections/:projectionId/admit` | `CURATOR` | `CurationAdmitRequestV1` `[]` | `200 CurationAdmitResultV1` `{lifecycle:projection_lifecycle.v1,receipt}` | yes | required |
| 33 | `curation.unlist` | `POST /curation/projections/:projectionId/unlist` | `CURATOR` | `CurationUnlistRequestV1` `[]` | `200 CurationUnlistResultV1` `{lifecycle:projection_lifecycle.v1,receipt}` | yes | required |
| 34 | `room_operator.status` | `GET /room-operator/status` | `ROOM_OPERATOR` | `RoomOperatorStatusRequestV1` query `{roomId}` | `200 RoomOperatorStatusResultV1`; wire `room_operator_status.v1` `{schemaVersion,room,interactions,synthetic,roomOperatorRequestHash}` | no | not-required |
| 35 | `room_operator.sync` | `POST /room-operator/sync` | `ROOM_OPERATOR` | `RoomOperatorSyncRequestV1` `{roomId,afterSequence}` | `200 room_event_batch.v1` or `410 cursor_gone.v1`; the result is the canonical protocol object itself | yes | not-required |
| 36 | `room_operator.pull` | `POST /room-operator/interactions/:interactionId/pull` | `ROOM_OPERATOR` | `RoomOperatorPullRequestV1` `[]` | `200 RoomOperatorPullResultV1`; wire `room_operator_pull_result.v1` `{schemaVersion,interaction:interaction.v1,receipt}` | yes | required |
| 37 | `room_operator.cycle.reserve` | `POST /room-operator/interactions/:interactionId/cycle/reserve` | `ROOM_OPERATOR` | `RoomOperatorCycleReserveRequestV1` `{startAuthorizationHash,sessionEnvelopeHash}` | `200 RoomOperatorCycleReserveResultV1` `{reservation:fresh_cycle_reservation.v1,receipt}` | yes | required |
| 38 | `room_operator.cycle.recover` | `POST /room-operator/interactions/:interactionId/cycle/recover` | `ROOM_OPERATOR` | `RoomOperatorCycleRecoverRequestV1` `{reservationId,startAuthorizationHash,sessionEnvelopeHash}` | `200 RoomOperatorCycleRecoverResultV1` `{reservation:fresh_cycle_reservation.v1,receipt}` | yes | required |
| 39 | `room_operator.cycle.abandon` | `POST /room-operator/interactions/:interactionId/cycle/abandon` | `ROOM_OPERATOR` | `RoomOperatorCycleAbandonRequestV1` `{reservationId,startAuthorizationHash,sessionEnvelopeHash,transportJournalDispatches}` | `200 RoomOperatorCycleAbandonResultV1` `{reservation:fresh_cycle_reservation.v1,receipt}` | yes | required |
| 40 | `room_operator.dispatch.issue` | `POST /room-operator/interactions/:interactionId/dispatch-permits` | `ROOM_OPERATOR` | `RoomOperatorDispatchIssueRequestV1` `{reservationId,sessionEnvelopeHash,startAuthorizationHash,provider,model,payloadHash,ordinal}` | `201 RoomOperatorDispatchIssueResultV1` `{permit:dispatch_permit.v1,syntheticTransport:{upstreamEnabled:false},receipt}` | yes | required |
| 41 | `room_operator.ack` | `POST /room-operator/events/ack` | `ROOM_OPERATOR` | `RoomOperatorAckRequestV1` is the exact `room_event_ack.v1` object `{schemaVersion,roomId,eventId,sequence,eventHash,idempotencyKey}`; body key must equal header key | `200 room_event_ack_receipt.v1`; the result is the canonical protocol object itself | yes | not-required |
| 42 | `room_operator.projection.deliver` | `POST /room-operator/projections/deliver` | `ROOM_OPERATOR` | `RoomOperatorProjectionDeliverRequestV1` `{delivery}` where `delivery` is the projection arm of `hosted_publication_delivery.v1` | `201 RoomOperatorProjectionDeliverResultV1` `{projection:projection_capsule.v1,lifecycle:projection_lifecycle.v1,receipt}` | yes | required |
| 43 | `room_operator.response.deliver` | `POST /room-operator/responses/deliver` | `ROOM_OPERATOR` | `RoomOperatorResponseDeliverRequestV1` `{delivery}` where `delivery` is the response arm of `hosted_publication_delivery.v1` | `201 RoomOperatorResponseDeliverResultV1` `{responseId,interactionVersion,syntheticNotice:synthetic_notice.v1,receipt}` | yes | required |
| 44 | `room_operator.stale.attest` | `POST /room-operator/projections/:projectionId/stale` | `ROOM_OPERATOR` | `RoomOperatorStaleAttestRequestV1` `[]` | `200 RoomOperatorStaleAttestResultV1` `{lifecycle:projection_lifecycle.v1,receipt}` | yes | required |
| 45 | `room_operator.local_purge.receipt` | `POST /room-operator/interactions/:interactionId/local-purge` | `ROOM_OPERATOR` | `RoomOperatorLocalPurgeReceiptRequestV1` `{localBytesAbsent:true}` | `200 RoomOperatorLocalPurgeReceiptResultV1`; wire `local_purge_result.v1` `{schemaVersion,localBytesAbsent:true,receipt}` | yes | required |

## Conditional request semantics that the closed schemas cannot weaken

- `interaction.create`: `interactionType` is exactly `ask|seed|resonance` and
  `consent` is exactly `allow_owner_local_ai|manual_owner_only`.
  `requestBody` is NFC UTF-8 text of at most 12 KiB. With a PublicEncounter or
  Grant Bearer, distinct `replySecret` and `deleteSecret` are mandatory. With
  an AgentDerivative Bearer, its pre-bound reply/delete digests are used and
  any supplied reply/delete fields are ignored. `guestCapsule` is absent,
  `null`, or an exact `guest_capsule.v1`.
- `room.create`: `roomKind` is exactly
  `third_place_public|private_grant_only`.
- `room.mode.set`: `interactionMode` is exactly
  `public_single|invite_only|closed`.
- Grant presets are exactly `one_visit`, `short_exchange`,
  `familiar_collaborator`, and `trusted_collaborator`.
- `notification.set` and `notification.verify` are still synthetic in Gate B:
  no external email is authorized by this map.
- `room.pair` and `room.pair.exchange` return synthetic pairing material in
  this contract; no production credential is implied.
- `room_operator.cycle.abandon` requires `transportJournalDispatches` to equal
  integer `0` and never reopens a dispatched cycle.
- `room_operator.dispatch.issue` requires `provider` to equal `OpenAI`, ordinal
  to be the next integer in `1..3`, and the returned permit expires after
  30 seconds. Gate B does not authorize consuming that permit against a real
  provider.
- Publication delivery accepts only the endpoint-matching arm, verifies the
  exact active binding and attestation, and never accepts a loose hosted-only
  wrapper.

## Exact alternate and error result arms

Every row's `resultRefs` also includes the closed `ApiErrorV1` arm:

```text
{error:{code,correlationId,message?}}
```

`code` and `correlationId` are required strings; `message` is present only for
a controlled semantic error. Unknown routes and controlled service failures do
not add it. No error arm may reflect a secret, request member name supplied by
an attacker, body, path, environment value, or raw exception.

Idempotent recovery adds only these exact non-primary result arms:

| Action | Exact recovery result |
|---|---|
| `notification.set` | `202 NotificationSetRecoveredResultV1`; wire remains `notification_set_result.v1` with `{schemaVersion,endpoint,receipt,syntheticRecovery:{verificationCodeRetained:false,bodyFree:true}}`; no verification code is retained. |
| `notification.verify` | `200 NotificationVerifyRecoveredResultV1`; wire remains `notification_verify_result.v1` with `{schemaVersion,endpoint,receipt,syntheticRecovery:{verificationCodeRetained:false,bodyFree:true}}`. |
| `room.pair` | Before expiry, exact original `RoomPairResultV1`; after sensitive expiry, `410 RoomPairRecoveryExpiredResultV1`, wire `synthetic_pairing_recovery_expired.v1` `{schemaVersion,pairingId,roomId,expiresAt,receipt}`. |
| `room.pair.exchange` | Before expiry, exact original `RoomPairExchangeResultV1`; after sensitive expiry, `410 RoomPairExchangeRecoveryExpiredResultV1`, wire `synthetic_pairing_exchange_recovery_expired.v1` `{schemaVersion,pairingId,roomId,expiresAt,receipt}`. |
| `room_operator.pull` | The same `room_operator_pull_result.v1` is reconstructed only while the exact Interaction remains eligible; otherwise controlled `404`. |
| `room_operator.projection.deliver` | The current exact projection/lifecycle/receipt result while still current and fresh; otherwise `410 PublicationRecoveryUnavailableResultV1`, wire `publication_recovery_unavailable.v1` `{schemaVersion,artifactClass,artifactId,state,receipt}`. |
| `room_operator.response.deliver` | The exact response publication result while still available; otherwise the same `410 publication_recovery_unavailable.v1` arm. |

Every other mutation replays the exact stored primary success body and status.
Same-key/different-canonical-request bytes always select the common
`409 ApiErrorV1` arm and never a recovery arm.

## Gate B schema artifact rule

Gate B may add `schemas/r4/api-v1.schema.json` and
`schemas/r4/api-v1-index.json` generated from this table. The index must have a
bijective 45-entry mapping with fields
`action,method,path,actor,mutating,expectedVersion,requestRef,resultRefs`.
Tests must assert exactly 45 operations, 39 mutations, 6 reads, 31 required
expected-version operations, exact body/param closure, and exact references to
the 39-object canonical protocol registry. `resultRefs` must include the common
error arm and the exact recovery arms above. Generating these schemas must not
change the current wire bytes or add a wrapper `schemaVersion`.
