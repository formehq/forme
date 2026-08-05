import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";

// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { candidateCleanupOrder, reconcileCandidateCleanup, writeCanonicalRecord } from "../../scripts/r4-gate-b-api-contract.mjs";

const addFormats = createRequire(import.meta.url)("ajv-formats") as FormatsPlugin;

function localAjv() {
  const protocol = JSON.parse(fs.readFileSync("schemas/r4/protocol.schema.json", "utf8")) as object;
  const local = JSON.parse(fs.readFileSync("schemas/r4/local-formats.schema.json", "utf8")) as {
    $id: string;
    $defs: Record<string, unknown>;
  };
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(protocol);
  ajv.addSchema(local);
  return { ajv, local };
}

test("local format index binds all 25 rows and only the Room ledger may persist in Workspace", () => {
  const index = JSON.parse(fs.readFileSync("schemas/r4/local-formats-index.json", "utf8")) as {
    formatCount: number;
    formats: Array<{
      schemaVersion: string;
      locationPattern: string | null;
      bodyFree: boolean;
      workspaceAllowed: boolean;
      cleanup: string;
    }>;
  };
  assert.equal(index.formatCount, 25);
  assert.equal(index.formats.length, 25);
  const workspace = index.formats.filter((format) => format.workspaceAllowed);
  assert.deepEqual(workspace.map((format) => format.schemaVersion), ["r4.local-room-ledger.v1"]);
  for (const format of index.formats) {
    assert.deepEqual(Object.keys(format), [
      "schemaVersion",
      "locationPattern",
      "bodyFree",
      "workspaceAllowed",
      "cleanup",
    ]);
    if (format.locationPattern !== null) {
      assert.match(format.locationPattern, /^\^/u);
      assert.equal(format.locationPattern.includes(".."), false);
      assert.equal(format.locationPattern.includes("/Users/"), false);
      assert.equal(format.locationPattern.startsWith("^/"), false);
    }
  }
});

test("every local record object is closed and representative ledger bytes validate", () => {
  const { ajv, local } = localAjv();
  for (const [name, definition] of Object.entries(local.$defs)) {
    if (typeof definition === "object" && definition !== null && "properties" in definition) {
      assert.equal((definition as { additionalProperties?: unknown }).additionalProperties, false, name);
    }
  }
  const validate = ajv.getSchema(`${local.$id}#/$defs/R4LocalRoomLedgerV1`);
  assert.ok(validate);
  const timestamp = "2026-08-04T00:00:00.000Z";
  const ledger = {
    schemaVersion: "r4.local-room-ledger.v1",
    roomId: "room_AAAAAAAAAAAAAAAA",
    bindingId: "binding_AAAAAAAAAAAAAAAA",
    cursor: 0,
    highWater: 0,
    bindingExpiresAt: timestamp,
    bindingRevokedAt: timestamp,
    events: [],
    ackOutbox: [],
    receipts: [],
    tombstoneIds: [],
    gapWarning: null,
    quarantine: null,
    cleanupRequired: false,
    version: 1,
  };
  assert.equal(validate(ledger), true, ajv.errorsText(validate.errors));
  assert.equal(validate({ ...ledger, requestBody: "forbidden" }), false);
  assert.ok(validate.errors?.some((error: ErrorObject) => error.keyword === "additionalProperties"));
});

test("evidence schema validates the body-free in-progress construction record", () => {
  const schema = JSON.parse(fs.readFileSync("schemas/r4/gate-b-evidence.schema.json", "utf8")) as object;
  const evidence = JSON.parse(
    fs.readFileSync("docs/evidence/r4-gate-b-retry-construction.json", "utf8"),
  ) as object;
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: false });
  const validate = ajv.compile(schema);
  assert.equal(validate(evidence), true, ajv.errorsText(validate.errors));
  assert.equal(validate({ ...evidence, promptBody: "forbidden" }), false);
});

test("canonical record write is exclusive, 0700/0600, fsynced, and newline terminated", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-local-format-"));
  fs.chmodSync(root, 0o700);
  try {
    const target = writeCanonicalRecord(root, "records/receipt.json", {
      schemaVersion: "fixture.v1",
      result: "body_free",
    }) as string;
    assert.equal(fs.statSync(path.dirname(target)).mode & 0o777, 0o700);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    assert.equal(
      fs.readFileSync(target, "utf8"),
      '{"schemaVersion":"fixture.v1","result":"body_free"}\n',
    );
    assert.throws(
      () => writeCanonicalRecord(root, "records/receipt.json", { schemaVersion: "fixture.v1" }),
      /RECORD_TARGET_EXISTS/u,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("candidate cleanup is deny-first and every crash state has one explicit next action", () => {
  assert.deepEqual(candidateCleanupOrder(), [
    "COMMIT_DENY",
    "DESTROY_KEY",
    "REMOVE_CIPHERTEXT",
    "COMMIT_RECEIPT",
    "REMOVE_TRANSIENT",
  ]);
  assert.equal(reconcileCandidateCleanup({ denyCommitted: false, keyDestroyed: false, ciphertextPresent: true, receiptCommitted: false }), "COMMIT_DENY");
  assert.equal(reconcileCandidateCleanup({ denyCommitted: true, keyDestroyed: false, ciphertextPresent: true, receiptCommitted: false }), "DESTROY_KEY");
  assert.equal(reconcileCandidateCleanup({ denyCommitted: true, keyDestroyed: true, ciphertextPresent: true, receiptCommitted: false }), "REMOVE_CIPHERTEXT");
  assert.equal(reconcileCandidateCleanup({ denyCommitted: true, keyDestroyed: true, ciphertextPresent: false, receiptCommitted: false }), "COMMIT_RECEIPT");
  assert.equal(reconcileCandidateCleanup({ denyCommitted: true, keyDestroyed: true, ciphertextPresent: false, receiptCommitted: true }), "COMPLETE");
  assert.throws(
    () => reconcileCandidateCleanup({ denyCommitted: true }),
    /CLEANUP_STATE_INVALID/u,
  );
});
