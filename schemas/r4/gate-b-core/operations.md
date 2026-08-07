# R4 Gate B Core-32 exact operation map

- Status: `CORE_CONSTRUCTED_OFFLINE`
- Authority: R4 Gate B Core Correction Construction Packet v0.1
- Construction Packet SHA-256:
  `sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6`
- API contract version: `forme.r4.gate-b-core.api.v1`
- Canonical HTTP prefix: `/api/v1`
- Operation count: **32**
- Mutation count: **26**
- Read count: **6**
- Mutations requiring `If-Match`: **21**

Unless narrowed here, methods, paths, actors, closed request/result objects,
idempotency and error semantics are inherited from the immutable Full operation
map. Core accepts only `third_place_public` for `room.create`; it serves only
the current public Projection; `interaction.create` accepts a PublicEncounter
or Grant but never an AgentDerivative; and GrantOffer remains exact-public-
Room scoped.

Every route outside this table returns the same body-free `404 not_found`
before query/body parsing, content-type checks, Bearer/header processing or
application/database access. Core contains no disabled or `503` placeholder
for the 13 excluded Full operations.

| # | Action | Method and path | Actor | Mutating | If-Match |
|---:|---|---|---|---:|---:|
| 1 | `third_place.list` | `GET /third-place/projections` | `public` | no | no |
| 2 | `projection.read` | `GET /projections/:projectionId` | `public` | no | no |
| 3 | `public_encounter.issue` | `POST /projections/:projectionId/encounters` | `public` | yes | yes |
| 4 | `interaction.create` | `POST /interactions` | `guest_capability` | yes | no |
| 5 | `interaction.read` | `GET /interactions/:interactionId` | `guest_capability` | no | no |
| 6 | `interaction.delete` | `DELETE /interactions/:interactionId` | `guest_capability` | yes | yes |
| 7 | `grant_offer.accept` | `POST /grant-offers/:offerId/accept` | `guest_capability` | yes | yes |
| 8 | `room.pair.exchange` | `POST /pairings/:pairingId/exchange` | `public` | yes | yes |
| 9 | `control.status` | `GET /control/status` | `controller` | no | no |
| 10 | `control.interaction.read` | `GET /control/interactions/:interactionId` | `controller` | no | no |
| 11 | `room.create` | `POST /control/rooms` | `controller` | yes | no |
| 12 | `room.pair` | `POST /control/rooms/:roomId/pairings` | `controller` | yes | yes |
| 13 | `room.binding.revoke` | `POST /control/room-bindings/:bindingId/revoke` | `controller` | yes | yes |
| 14 | `projection.revoke` | `POST /control/projections/:projectionId/revoke` | `controller` | yes | yes |
| 15 | `response.revoke` | `POST /control/responses/:responseId/revoke` | `controller` | yes | yes |
| 16 | `grant.revoke` | `POST /control/grants/:grantId/revoke` | `controller` | yes | yes |
| 17 | `grant_offer.issue` | `POST /control/grant-offers` | `controller` | yes | no |
| 18 | `grant_offer.revoke` | `POST /control/grant-offers/:offerId/revoke` | `controller` | yes | yes |
| 19 | `interaction.close` | `POST /control/interactions/:interactionId/close` | `controller` | yes | yes |
| 20 | `curation.admit` | `POST /curation/projections/:projectionId/admit` | `curator` | yes | yes |
| 21 | `curation.unlist` | `POST /curation/projections/:projectionId/unlist` | `curator` | yes | yes |
| 22 | `room_operator.status` | `GET /room-operator/status` | `room_operator` | no | no |
| 23 | `room_operator.sync` | `POST /room-operator/sync` | `room_operator` | yes | no |
| 24 | `room_operator.pull` | `POST /room-operator/interactions/:interactionId/pull` | `room_operator` | yes | yes |
| 25 | `room_operator.cycle.reserve` | `POST /room-operator/interactions/:interactionId/cycle/reserve` | `room_operator` | yes | yes |
| 26 | `room_operator.cycle.recover` | `POST /room-operator/interactions/:interactionId/cycle/recover` | `room_operator` | yes | yes |
| 27 | `room_operator.cycle.abandon` | `POST /room-operator/interactions/:interactionId/cycle/abandon` | `room_operator` | yes | yes |
| 28 | `room_operator.dispatch.issue` | `POST /room-operator/interactions/:interactionId/dispatch-permits` | `room_operator` | yes | yes |
| 29 | `room_operator.ack` | `POST /room-operator/events/ack` | `room_operator` | yes | no |
| 30 | `room_operator.projection.deliver` | `POST /room-operator/projections/deliver` | `room_operator` | yes | yes |
| 31 | `room_operator.response.deliver` | `POST /room-operator/responses/deliver` | `room_operator` | yes | yes |
| 32 | `room_operator.local_purge.receipt` | `POST /room-operator/interactions/:interactionId/local-purge` | `room_operator` | yes | yes |

## Excluded Full routes

`notification.set`, `notification.remove`, `notification.verify`,
`direct_invite.redeem`, `agent_derivative.mint`, `room.mode.set`,
`room.retire`, `room.delete`, `grant.issue`, `grant.replace`,
`direct_invite.issue`, `direct_invite.revoke`, and
`room_operator.stale.attest` are absent from every active Core surface.
