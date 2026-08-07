import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

// @ts-expect-error Construction scripts intentionally remain executable ESM.
import { buildCoreContractArtifacts } from "../../scripts/r4-gate-b-core-api-contract.mjs";

const SCHEMA = "schemas/r4/gate-b-core/api-v1.schema.json";
const INDEX = "schemas/r4/gate-b-core/api-v1-index.json";

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

test("Core API generator is deterministic and pins exact 32/26/6/21 counts", () => {
  const generated = buildCoreContractArtifacts();
  assert.equal(generated[SCHEMA], readFileSync(SCHEMA, "utf8"));
  assert.equal(generated[INDEX], readFileSync(INDEX, "utf8"));
  const index = JSON.parse(generated[INDEX]!) as Record<string, unknown>;
  assert.deepEqual(
    [index.operationCount, index.mutationCount, index.readCount, index.expectedVersionRequiredCount],
    [32, 26, 6, 21],
  );
  assert.equal(index.bundleSha256, sha256(generated[SCHEMA]!));
  assert.equal(index.constructionPacketSha256, "sha256:5c8ec32ca40ca9e6f67f96e8b2cec8f378c04fef8bc59387e98f5d79cbe0b3e6");
});

test("Core schema contains every selected request/result and no excluded Full request", () => {
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as { $defs: Record<string, unknown> };
  const index = JSON.parse(readFileSync(INDEX, "utf8")) as {
    operations: Array<{ requestRef: string; resultRefs: string[] }>;
    excludedOperations: string[];
  };
  for (const operation of index.operations) {
    for (const reference of [operation.requestRef, ...operation.resultRefs]) {
      if (!reference.startsWith("#/$defs/")) continue;
      assert.ok(schema.$defs[reference.slice("#/$defs/".length)], reference);
    }
  }
  for (const name of [
    "NotificationSetRequestV1", "NotificationRemoveRequestV1", "NotificationVerifyRequestV1",
    "DirectInviteRedeemRequestV1", "AgentDerivativeMintRequestV1", "RoomModeSetRequestV1",
    "RoomRetireRequestV1", "RoomDeleteRequestV1", "GrantIssueRequestV1", "GrantReplaceRequestV1",
    "DirectInviteIssueRequestV1", "DirectInviteRevokeRequestV1", "RoomOperatorStaleAttestRequestV1",
  ]) assert.equal(schema.$defs[name], undefined, name);
  assert.equal(index.excludedOperations.length, 13);
});
