import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  canonicalSha256,
  GOLDEN_APPROVAL,
  GOLDEN_CANDIDATE,
  GOLDEN_HOSTED_PUBLICATION_DELIVERY,
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_BASIS,
  GOLDEN_RESPONSE_PUBLICATION,
  validateHostedPublicationDeliveryV1,
  validatePublicationAttestationV1,
  validateResponsePublicationV1,
  type ArtifactApprovalV1,
} from "../../packages/r4-protocol/src/index.ts";
import {
  buildProjectionPublicationDeliveryV1,
  buildResponsePublicationDeliveryV1,
  coordinateProjectionPublicationV1,
  coordinateResponsePublicationV1,
  verifyHostedPublicationDeliveryHmacV1,
  type ProjectionPublicationPreflightV1,
  type ResponsePublicationPreflightV1,
  type RoomPublicationBindingV1,
} from "../../packages/r4-local/src/index.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const T5M = "2026-08-03T12:05:00.000Z";
const T15M = "2026-08-03T12:15:00.000Z";
const T1H = "2026-08-03T13:00:00.000Z";
const T7D = "2026-08-10T12:00:00.000Z";
const T30D = "2026-09-02T12:00:00.000Z";

const binding: RoomPublicationBindingV1 = {
  bindingId: "binding_syntheticpublication000001",
  roomId: GOLDEN_PROJECTION.roomId,
  secret: new Uint8Array(32).fill(0x5a),
  state: "current",
  expiresAt: T30D,
};

const projectionApproval: ArtifactApprovalV1 = {
  schemaVersion: "artifact_approval.v1",
  approvalId: "approval_syntheticpublication0001",
  artifactClass: "projection",
  artifactHash: GOLDEN_PROJECTION.payloadHash,
  roomId: GOLDEN_PROJECTION.roomId,
  projectionId: GOLDEN_PROJECTION.projectionId,
  interactionId: null,
  basisHash: canonicalSha256(GOLDEN_PROJECTION_BASIS),
  policyHash: GOLDEN_PROJECTION_BASIS.projectionPolicyHash,
  approvedAt: T0,
  expiresAt: T1H,
  operationId: "op_syntheticpublication00000001",
};

const projectionPreflight: ProjectionPublicationPreflightV1 = {
  artifactClass: "projection",
  observedAt: T5M,
  roomId: GOLDEN_PROJECTION.roomId,
  roomStatus: "active",
  projectionId: GOLDEN_PROJECTION.projectionId,
  twinRevision: GOLDEN_PROJECTION_BASIS.twinRevision,
  twinRevisionHash: GOLDEN_PROJECTION_BASIS.twinRevisionHash,
  workspaceContractHash: GOLDEN_PROJECTION_BASIS.workspaceContractHash,
  projectionPolicyGeneration: GOLDEN_PROJECTION_BASIS.projectionPolicyGeneration,
  projectionPolicyHash: GOLDEN_PROJECTION_BASIS.projectionPolicyHash,
  payloadHash: GOLDEN_PROJECTION.payloadHash,
  basisHash: canonicalSha256(GOLDEN_PROJECTION_BASIS),
  currentHostedPayloadHash: null,
};

const responsePreflight: ResponsePublicationPreflightV1 = {
  artifactClass: "response",
  observedAt: T5M,
  roomId: GOLDEN_CANDIDATE.roomId,
  roomStatus: "active",
  projectionId: GOLDEN_CANDIDATE.projectionId,
  interactionId: GOLDEN_CANDIDATE.interactionId,
  interactionState: "preparing",
  originState: GOLDEN_CANDIDATE.originState,
  candidateStoreState: "protected_current",
  candidateHash: GOLDEN_CANDIDATE.candidateHash,
  twinBasisHash: GOLDEN_CANDIDATE.twinBasisHash,
  snapshotManifestHash: GOLDEN_CANDIDATE.snapshotManifestHash,
  sessionReceiptHash: GOLDEN_CANDIDATE.sessionReceiptHash,
  sourceDisclosureClass: GOLDEN_CANDIDATE.sourceDisclosureClass,
  policyHash: GOLDEN_CANDIDATE.policyHash,
  existingResponseId: null,
  parentInteractionExpiresAt: T30D,
};

const FORBIDDEN_PRIVATE_KEYS = new Set([
  "twinRevision",
  "twinRevisionHash",
  "workspaceContractHash",
  "projectionPolicyGeneration",
  "projectionPolicyHash",
  "sourceReference",
  "sourceContentHash",
  "ownerDecisionId",
  "ownerDecisionHash",
  "localReceiptId",
  "hostedReceiptId",
  "basisHash",
  "policyHash",
  "snapshotManifestHash",
  "twinBasisHash",
  "sessionEnvelopeId",
  "approvalId",
  "operationId",
]);

function collectKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const member of value) collectKeys(member, result);
  } else if (value !== null && typeof value === "object") {
    for (const [key, member] of Object.entries(value)) {
      result.add(key);
      collectKeys(member, result);
    }
  }
  return result;
}

test("canonical publication goldens validate as one strict hosted DTO", () => {
  assert.doesNotThrow(() => validateResponsePublicationV1(GOLDEN_RESPONSE_PUBLICATION));
  assert.doesNotThrow(() => validatePublicationAttestationV1(GOLDEN_HOSTED_PUBLICATION_DELIVERY.attestation));
  assert.doesNotThrow(() => validateHostedPublicationDeliveryV1(GOLDEN_HOSTED_PUBLICATION_DELIVERY));
  assert.throws(
    () => validateHostedPublicationDeliveryV1({ ...GOLDEN_HOSTED_PUBLICATION_DELIVERY, privateBasisHash: canonicalSha256("forbidden") }),
    /field is not allowed/u,
  );
});

test("Projection builder validates the full private basis and emits only Capsule plus Room HMAC attestation", () => {
  const delivery = buildProjectionPublicationDeliveryV1({
    projection: GOLDEN_PROJECTION,
    basis: GOLDEN_PROJECTION_BASIS,
    approval: projectionApproval,
    preflight: projectionPreflight,
    binding,
    attestationExpiresAt: T15M,
  });
  assert.equal(delivery.artifactClass, "projection");
  assert.equal(delivery.projection, GOLDEN_PROJECTION);
  assert.equal(delivery.response, null);
  assert.equal(delivery.attestation.artifactHash, GOLDEN_PROJECTION.payloadHash);
  assert.equal(delivery.attestation.bindingId, binding.bindingId);
  assert.equal(
    delivery.attestation.hmacSha256,
    "sha256:40d0c33da5d46d8cdf2267ece8f2fc819f7705682b23674b5e69d5274acf8eab",
    "fixed key + canonical public preimage pins the exact HMAC-SHA256 bytes",
  );
  assert.deepEqual(verifyHostedPublicationDeliveryHmacV1(delivery, binding, T5M), delivery);

  const keys = collectKeys(JSON.parse(canonicalJson(delivery)));
  for (const key of FORBIDDEN_PRIVATE_KEYS) assert.equal(keys.has(key), false, `private key leaked: ${key}`);
  assert.equal(keys.has("claims"), true, "public Projection claims remain the intended public bytes");
});

test("Response builder exposes exact public bytes and opaque IDs but none of the candidate's private basis", () => {
  const delivery = buildResponsePublicationDeliveryV1({
    responseId: "response_syntheticpublication000001",
    publicationAttestationId: "att_syntheticresponsepublish00001",
    candidate: GOLDEN_CANDIDATE,
    approval: GOLDEN_APPROVAL,
    preflight: responsePreflight,
    binding,
    responseExpiresAt: T7D,
    attestationExpiresAt: T15M,
  });
  assert.equal(delivery.artifactClass, "response");
  assert.equal(delivery.projection, null);
  assert.equal(delivery.response?.body, GOLDEN_CANDIDATE.responseText);
  assert.equal(delivery.response?.candidateHash, GOLDEN_CANDIDATE.candidateHash);
  assert.equal(delivery.response?.sourceDisclosureClass, GOLDEN_CANDIDATE.sourceDisclosureClass);
  assert.equal(
    delivery.response?.localBasisAttestationId,
    `att_${canonicalSha256({
      interactionId: GOLDEN_CANDIDATE.interactionId,
      twinBasisHash: GOLDEN_CANDIDATE.twinBasisHash,
      snapshotManifestHash: GOLDEN_CANDIDATE.snapshotManifestHash,
      sessionReceiptHash: GOLDEN_CANDIDATE.sessionReceiptHash,
      policyHash: GOLDEN_CANDIDATE.policyHash,
      sourceDisclosureClass: GOLDEN_CANDIDATE.sourceDisclosureClass,
    }).slice(7, 39)}`,
  );
  assert.deepEqual(verifyHostedPublicationDeliveryHmacV1(delivery, binding, T5M), delivery);

  const serialized = canonicalJson(delivery);
  const keys = collectKeys(JSON.parse(serialized));
  for (const key of FORBIDDEN_PRIVATE_KEYS) assert.equal(keys.has(key), false, `private key leaked: ${key}`);
  assert.equal(serialized.includes(GOLDEN_CANDIDATE.twinBasisHash), false);
  assert.equal(
    GOLDEN_CANDIDATE.snapshotManifestHash === null
      ? false
      : serialized.includes(GOLDEN_CANDIDATE.snapshotManifestHash),
    false,
  );
  assert.equal(serialized.includes(GOLDEN_CANDIDATE.policyHash), false);
  assert.equal(serialized.includes(GOLDEN_APPROVAL.approvalId), false);
});

test("any current-state, exact approval, target, time, or HMAC mismatch is rejected", () => {
  const projectionInput = {
    projection: GOLDEN_PROJECTION,
    basis: GOLDEN_PROJECTION_BASIS,
    approval: projectionApproval,
    preflight: projectionPreflight,
    binding,
    attestationExpiresAt: T15M,
  } as const;
  assert.throws(
    () => buildProjectionPublicationDeliveryV1({
      ...projectionInput,
      preflight: { ...projectionPreflight, twinRevisionHash: canonicalSha256("changed-twin") },
    }),
    /twin_revision_hash_changed/u,
  );
  assert.throws(
    () => buildProjectionPublicationDeliveryV1({
      ...projectionInput,
      preflight: { ...projectionPreflight, currentHostedPayloadHash: GOLDEN_PROJECTION.payloadHash },
    }),
    /identical_projection_no_op/u,
  );
  assert.throws(
    () => buildProjectionPublicationDeliveryV1({
      ...projectionInput,
      approval: { ...projectionApproval, artifactHash: canonicalSha256("different-public-bytes") },
    }),
    /approval_artifact_hash_mismatch/u,
  );

  const responseInput = {
    responseId: "response_syntheticpublication000001",
    publicationAttestationId: "att_syntheticresponsepublish00001",
    candidate: GOLDEN_CANDIDATE,
    approval: GOLDEN_APPROVAL,
    preflight: responsePreflight,
    binding,
    responseExpiresAt: T7D,
    attestationExpiresAt: T15M,
  } as const;
  assert.throws(
    () => buildResponsePublicationDeliveryV1({
      ...responseInput,
      preflight: { ...responsePreflight, originState: "stale" },
    }),
    /origin_state_changed/u,
  );
  assert.throws(
    () => buildResponsePublicationDeliveryV1({
      ...responseInput,
      preflight: { ...responsePreflight, existingResponseId: "response_existing000000000000001" },
    }),
    /response_already_exists/u,
  );
  assert.throws(
    () => buildResponsePublicationDeliveryV1({
      ...responseInput,
      approval: { ...GOLDEN_APPROVAL, policyHash: canonicalSha256("changed-policy") },
    }),
    /approval_policy_mismatch/u,
  );
  assert.throws(
    () => buildResponsePublicationDeliveryV1({ ...responseInput, attestationExpiresAt: T7D }),
    /attestation_outlives_approval/u,
  );

  const delivery = buildResponsePublicationDeliveryV1(responseInput);
  assert.throws(
    () => verifyHostedPublicationDeliveryHmacV1({
      ...delivery,
      attestation: { ...delivery.attestation, hmacSha256: canonicalSha256("tampered-hmac") },
    }, binding, T5M),
    /attestation_hmac_mismatch/u,
  );
  assert.throws(
    () => verifyHostedPublicationDeliveryHmacV1(delivery, { ...binding, secret: new Uint8Array(32).fill(0x6b) }, T5M),
    /attestation_hmac_mismatch/u,
  );
});

test("identical Projection is a local receipted no-op with zero hosted mutation/event/revision effect", () => {
  let currentReads = 0;
  let hostedMutations = 0;
  const coordinated = coordinateProjectionPublicationV1({
    projection: GOLDEN_PROJECTION,
    basis: GOLDEN_PROJECTION_BASIS,
    approval: projectionApproval,
    binding,
    attestationExpiresAt: T15M,
    noOpReceiptId: "receipt_syntheticprojectionnoop0001",
    reader: {
      protocolVersion: "trusted_projection_publication_state_reader.v1",
      readCurrentAfterApproval: () => {
        currentReads += 1;
        return { ...projectionPreflight, currentHostedPayloadHash: GOLDEN_PROJECTION.payloadHash };
      },
    },
  });
  if (coordinated.outcome === "deliver") hostedMutations += 1;
  assert.equal(currentReads, 1);
  assert.equal(coordinated.outcome, "no_op");
  assert.equal(hostedMutations, 0);
  assert.deepEqual(coordinated.outcome === "no_op" ? coordinated.receipt : null, {
    schemaVersion: "projection_publication_no_op_receipt.v1",
    receiptId: "receipt_syntheticprojectionnoop0001",
    roomId: GOLDEN_PROJECTION.roomId,
    projectionId: GOLDEN_PROJECTION.projectionId,
    payloadHash: GOLDEN_PROJECTION.payloadHash,
    basisHash: canonicalSha256(GOLDEN_PROJECTION_BASIS),
    observedAt: T5M,
    bodyFreeCode: "identical_projection_no_op",
  });
});

test("Response coordinator re-reads protected current Twin/origin/policy/store after approval and rejects stale Twin", () => {
  const readOrder: string[] = [];
  assert.throws(() => coordinateResponsePublicationV1({
    responseId: "response_syntheticpublication000002",
    publicationAttestationId: "att_syntheticresponsepublish00002",
    candidate: GOLDEN_CANDIDATE,
    approval: GOLDEN_APPROVAL,
    binding,
    responseExpiresAt: T7D,
    attestationExpiresAt: T15M,
    reader: {
      protocolVersion: "trusted_response_publication_state_reader.v1",
      readCurrentAfterApproval: ({ approvalId, approvedAt }) => {
        readOrder.push(`${approvalId}:${approvedAt}`);
        return { ...responsePreflight, twinBasisHash: canonicalSha256("new-current-twin") };
      },
    },
  }), /twin_basis_changed/u);
  assert.deepEqual(readOrder, [`${GOLDEN_APPROVAL.approvalId}:${GOLDEN_APPROVAL.approvedAt}`]);
});
