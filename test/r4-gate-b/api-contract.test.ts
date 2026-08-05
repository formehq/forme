import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";

// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { buildContractArtifacts } from "../../scripts/r4-gate-b-api-contract.mjs";

const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;
const apiSchemaPath = "schemas/r4/api-v1.schema.json";
const apiIndexPath = "schemas/r4/api-v1-index.json";
const protocolSchemaPath = "schemas/r4/protocol.schema.json";
const protocolIndexPath = "schemas/r4/schema-index.json";

type ApiIndex = {
  bundleSha256: string;
  operationCount: number;
  mutationCount: number;
  readCount: number;
  expectedVersionRequiredCount: number;
  operations: Array<{
    action: string;
    method: string;
    path: string;
    actor: string;
    mutating: boolean;
    expectedVersion: boolean;
    requestRef: string;
    resultRefs: string[];
  }>;
};

function ajvWithSchemas() {
  const protocol = JSON.parse(fs.readFileSync(protocolSchemaPath, "utf8")) as object;
  const api = JSON.parse(fs.readFileSync(apiSchemaPath, "utf8")) as { $id: string };
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(protocol);
  ajv.addSchema(api);
  return { ajv, api };
}

function validatorFor(definition: string) {
  const { ajv, api } = ajvWithSchemas();
  const validate = ajv.getSchema(`${api.$id}#/$defs/${definition}`);
  assert.ok(validate, definition);
  return { ajv, validate };
}

test("API index is a bijective 45-operation map with exact Gate B counts", () => {
  const index = JSON.parse(fs.readFileSync(apiIndexPath, "utf8")) as ApiIndex;
  assert.equal(index.operationCount, 45);
  assert.equal(index.mutationCount, 39);
  assert.equal(index.readCount, 6);
  assert.equal(index.expectedVersionRequiredCount, 31);
  assert.equal(index.operations.length, 45);
  assert.equal(new Set(index.operations.map((operation) => operation.action)).size, 45);
  assert.equal(
    index.operations.filter((operation) => operation.mutating).length,
    39,
  );
  assert.equal(
    index.operations.filter((operation) => operation.expectedVersion).length,
    31,
  );
  for (const operation of index.operations) {
    assert.deepEqual(Object.keys(operation), [
      "action",
      "method",
      "path",
      "actor",
      "mutating",
      "expectedVersion",
      "requestRef",
      "resultRefs",
    ]);
    assert.match(operation.requestRef, /^#\/\$defs\/[A-Za-z][A-Za-z0-9]+V1$/u);
    assert.ok(operation.resultRefs.includes("#/$defs/ApiErrorV1"));
  }
  const bytes = fs.readFileSync(apiSchemaPath);
  assert.equal(index.bundleSha256, `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`);
});

test("all API refs resolve only to generated defs or the exact 39-object protocol registry", () => {
  const api = JSON.parse(fs.readFileSync(apiSchemaPath, "utf8")) as {
    $defs: Record<string, unknown>;
  };
  const protocol = JSON.parse(fs.readFileSync(protocolSchemaPath, "utf8")) as {
    $id: string;
    $defs: Record<string, unknown>;
  };
  const protocolIndex = JSON.parse(fs.readFileSync(protocolIndexPath, "utf8")) as {
    objectCount: number;
    objects: Record<string, string>;
  };
  const index = JSON.parse(fs.readFileSync(apiIndexPath, "utf8")) as ApiIndex;
  assert.equal(protocolIndex.objectCount, 39);
  assert.equal(Object.keys(protocolIndex.objects).length, 39);

  for (const operation of index.operations) {
    assert.ok(operation.requestRef.slice("#/$defs/".length) in api.$defs);
    for (const reference of operation.resultRefs) {
      if (reference.startsWith("#/$defs/")) {
        assert.ok(reference.slice("#/$defs/".length) in api.$defs, reference);
      } else {
        assert.ok(reference.startsWith(`${protocol.$id}#/$defs/`), reference);
        assert.ok(reference.slice(reference.lastIndexOf("/") + 1) in protocol.$defs, reference);
      }
    }
  }
  assert.doesNotThrow(() => ajvWithSchemas());
});

test("closed request schemas reject unknown members and preserve exact conditional ceilings", () => {
  const projectionId = "projection_AAAAAAAAAAAAAAAA";
  const roomId = "room_AAAAAAAAAAAAAAAA";
  const interactionId = "interaction_AAAAAAAAAAAAAAAA";
  const hash = `sha256:${"a".repeat(64)}`;
  const secret = "A".repeat(43);

  const interaction = validatorFor("InteractionCreateRequestV1");
  const interactionValue = {
    projectionId,
    interactionType: "ask",
    consent: "manual_owner_only",
    requestBody: "synthetic",
    replySecret: secret,
    deleteSecret: "B".repeat(43),
  };
  assert.equal(interaction.validate(interactionValue), true, interaction.ajv.errorsText(interaction.validate.errors));
  assert.equal(interaction.validate({ ...interactionValue, ambientPath: "forbidden" }), false);
  assert.ok(interaction.validate.errors?.some((error: ErrorObject) => error.keyword === "additionalProperties"));
  assert.equal(interaction.validate({ ...interactionValue, interactionType: "chat" }), false);
  assert.equal(interaction.validate({ ...interactionValue, requestBody: "x".repeat(12289) }), false);

  const roomCreate = validatorFor("RoomCreateRequestV1");
  assert.equal(roomCreate.validate({ entityId: "entity_AAAAAAAAAAAAAAAA", roomKind: "third_place_public", label: "Synthetic" }), true);
  assert.equal(roomCreate.validate({ entityId: "entity_AAAAAAAAAAAAAAAA", roomKind: "ambient", label: "Synthetic" }), false);

  const grant = validatorFor("GrantIssueRequestV1");
  assert.equal(grant.validate({ roomId, projectionId, presetId: "trusted_collaborator", grantSecret: secret }), true);
  assert.equal(grant.validate({ roomId, projectionId, presetId: "forever", grantSecret: secret }), false);

  const abandon = validatorFor("RoomOperatorCycleAbandonRequestV1");
  const abandonValue = { reservationId: "reservation_AAAAAAAAAAAAAAAA", startAuthorizationHash: hash, sessionEnvelopeHash: hash, transportJournalDispatches: 0 };
  assert.equal(abandon.validate(abandonValue), true);
  assert.equal(abandon.validate({ ...abandonValue, transportJournalDispatches: 1 }), false);

  const dispatch = validatorFor("RoomOperatorDispatchIssueRequestV1");
  const dispatchValue = { reservationId: "reservation_AAAAAAAAAAAAAAAA", sessionEnvelopeHash: hash, startAuthorizationHash: hash, provider: "OpenAI", model: "fixture-model", payloadHash: hash, ordinal: 3 };
  assert.equal(dispatch.validate(dispatchValue), true);
  assert.equal(dispatch.validate({ ...dispatchValue, provider: "Other" }), false);
  assert.equal(dispatch.validate({ ...dispatchValue, ordinal: 4 }), false);

  const purge = validatorFor("RoomOperatorLocalPurgeReceiptRequestV1");
  assert.equal(purge.validate({ localBytesAbsent: true }), true);
  assert.equal(purge.validate({ localBytesAbsent: false }), false);
  assert.equal(interactionId.startsWith("interaction_"), true);
});

test("exact recovery arms appear only on the named operations", () => {
  const index = JSON.parse(fs.readFileSync(apiIndexPath, "utf8")) as ApiIndex;
  const recovery = new Map([
    ["notification.set", "#/$defs/NotificationSetRecoveredResultV1"],
    ["notification.verify", "#/$defs/NotificationVerifyRecoveredResultV1"],
    ["room.pair", "#/$defs/RoomPairRecoveryExpiredResultV1"],
    ["room.pair.exchange", "#/$defs/RoomPairExchangeRecoveryExpiredResultV1"],
    ["room_operator.projection.deliver", "#/$defs/PublicationRecoveryUnavailableResultV1"],
    ["room_operator.response.deliver", "#/$defs/PublicationRecoveryUnavailableResultV1"],
  ]);
  for (const operation of index.operations) {
    const localRecoveryRefs = operation.resultRefs.filter(
      (reference) => reference.includes("Recovered") || reference.includes("Recovery"),
    );
    const expected = recovery.get(operation.action);
    assert.deepEqual(localRecoveryRefs, expected ? [expected] : []);
  }
});

test("contract generation is deterministic and current generated bytes are exact", () => {
  const first = buildContractArtifacts() as Record<string, string>;
  const second = buildContractArtifacts() as Record<string, string>;
  assert.deepEqual(first, second);
  for (const [relativePath, bytes] of Object.entries(first)) {
    assert.equal(fs.readFileSync(relativePath, "utf8"), bytes, relativePath);
  }
});
