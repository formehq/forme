import assert from "node:assert/strict";
import test from "node:test";
import {
  GOLDEN_PROJECTION,
  validateProjectionCapsuleV1,
} from "../../packages/r4-protocol/src/index.ts";

test("Projection publication, freshness, and expiry boundaries are strictly increasing", () => {
  assert.throws(
    () => validateProjectionCapsuleV1({ ...GOLDEN_PROJECTION, freshUntil: GOLDEN_PROJECTION.publishedAt }),
    /publishedAt < freshUntil < expiresAt/u,
  );
  assert.throws(
    () => validateProjectionCapsuleV1({ ...GOLDEN_PROJECTION, expiresAt: GOLDEN_PROJECTION.freshUntil }),
    /publishedAt < freshUntil < expiresAt/u,
  );
});
