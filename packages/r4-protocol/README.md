# R4 protocol — Gate A proposed contracts

This package is the side-effect-free semantic boundary compiled from R4
Technical Control Packet v0.2 at
`sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`.

It has no filesystem, database, network, model, or harness adapter import. The
stable source entry point is [`src/index.ts`](./src/index.ts). Until the Gate B
Manifest pins package metadata, callers import that file directly with a
relative `.ts` path.

The package exports:

- proposed TypeScript contracts for every named R4 object;
- strict object, text, ID, timestamp, hash, and JSON validation;
- dependency-free canonical JSON and SHA-256;
- Room, Projection, curation, capability, Interaction, Response, Fresh-cycle,
  and notification state helpers;
- Projection visibility/basis eligibility, consent-subset, budget, and
  body-free receipt helpers;
- typed `room_operator.v1`, `SnapshotQueryBrokerV1`, and
  `ResponseTransportGateV1` boundaries;
- deterministic synthetic fixtures and golden vector results.

The JSON Schema bundle is
[`../../schemas/r4/protocol.schema.json`](../../schemas/r4/protocol.schema.json).
It is proposed Gate A evidence, not an applied production migration. Exact
schema hashes and SQL mapping remain a Gate B deliverable.
