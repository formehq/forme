import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import {
  canonicalSha256,
  GOLDEN_CURSOR_GONE,
  GOLDEN_ROOM_EVENT,
  GOLDEN_ROOM_EVENT_ACK,
  GOLDEN_ROOM_EVENT_ACK_RECEIPT,
  GOLDEN_ROOM_EVENT_BATCH,
  GOLDEN_SYNTHETIC_FIXTURES,
  PROTOCOL_SCHEMA_VERSIONS,
  validateCursorGoneV1,
  validateRoomEventAckReceiptV1,
  validateRoomEventAckV1,
  validateRoomEventBatchV1,
  validateRoomEventV1,
} from "../../packages/r4-protocol/src/index.ts";

const schemaPath = resolve("schemas/r4/protocol.schema.json");
const indexPath = resolve("schemas/r4/schema-index.json");
const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;

test("canonical Room event/sync/ACK DTOs use exact keys and one event hash on both sides", () => {
  assert.doesNotThrow(() => validateRoomEventV1(GOLDEN_ROOM_EVENT));
  assert.doesNotThrow(() => validateRoomEventBatchV1(GOLDEN_ROOM_EVENT_BATCH));
  assert.doesNotThrow(() => validateCursorGoneV1(GOLDEN_CURSOR_GONE));
  assert.doesNotThrow(() => validateRoomEventAckV1(GOLDEN_ROOM_EVENT_ACK));
  assert.doesNotThrow(() => validateRoomEventAckReceiptV1(GOLDEN_ROOM_EVENT_ACK_RECEIPT));
  assert.equal(GOLDEN_ROOM_EVENT_ACK.eventHash, canonicalSha256(GOLDEN_ROOM_EVENT));
  assert.equal(GOLDEN_ROOM_EVENT_ACK_RECEIPT.eventHash, GOLDEN_ROOM_EVENT_ACK.eventHash);
  assert.equal(GOLDEN_ROOM_EVENT_ACK_RECEIPT.idempotencyKey, GOLDEN_ROOM_EVENT_ACK.idempotencyKey);
  assert.equal("contentHash" in GOLDEN_ROOM_EVENT, false);
  assert.throws(
    () => validateRoomEventV1({ ...GOLDEN_ROOM_EVENT, contentHash: canonicalSha256("forbidden-alias") }),
    /field is not allowed/u,
  );
  assert.throws(
    () => validateRoomEventV1({
      ...GOLDEN_ROOM_EVENT,
      objectType: "response",
      objectId: "response_synthetic00000001",
    }),
    /eventType does not match objectType/u,
  );
});

test("Ajv 2020 strict validates every golden protocol object and rejects an unknown event field", () => {
  const schemaBytes = readFileSync(schemaPath);
  const schema = JSON.parse(schemaBytes.toString("utf8")) as object;
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  for (const [name, fixture] of Object.entries(GOLDEN_SYNTHETIC_FIXTURES)) {
    assert.equal(validate(fixture), true, `${name}: ${ajv.errorsText(validate.errors)}`);
  }
  assert.equal(validate({ ...GOLDEN_ROOM_EVENT, contentHash: canonicalSha256("forbidden-alias") }), false);
  assert.ok(validate.errors?.some((error: ErrorObject) => error.keyword === "additionalProperties"));
});

test("schema index pins bundle bytes, object count, and the exact registry version vector", () => {
  const schemaBytes = readFileSync(schemaPath);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    bundleSha256: string;
    objectCount: number;
    protocolSchemaVersionsSha256: string;
    objects: Record<string, string>;
  };
  const fixtureVersions = Object.values(GOLDEN_SYNTHETIC_FIXTURES).map((fixture) => fixture.schemaVersion);
  assert.equal(new Set(fixtureVersions).size, fixtureVersions.length, "one top-level golden fixture per schema version");
  assert.deepEqual([...fixtureVersions].sort(), [...PROTOCOL_SCHEMA_VERSIONS].sort());
  assert.equal(index.objectCount, PROTOCOL_SCHEMA_VERSIONS.length);
  assert.equal(Object.keys(index.objects).length, index.objectCount);
  assert.equal(index.protocolSchemaVersionsSha256, canonicalSha256(PROTOCOL_SCHEMA_VERSIONS));
  assert.equal(index.bundleSha256, `sha256:${createHash("sha256").update(schemaBytes).digest("hex")}`);
});
