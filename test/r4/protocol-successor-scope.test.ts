import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveGrantUse,
  deriveProjectionRead,
  derivePublicEncounterUse,
  GOLDEN_GRANT,
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_LIFECYCLE,
  GOLDEN_PUBLIC_ENCOUNTER,
  GOLDEN_ROOM,
} from "../../packages/r4-protocol/src/index.ts";

const NOW = "2026-08-03T12:01:00.000Z";

test("read, Grant submit, and public encounter deny stale successor/current-pointer mismatches", () => {
  const notCurrent = { ...GOLDEN_PROJECTION_LIFECYCLE, current: false };
  assert.equal(
    deriveProjectionRead(GOLDEN_ROOM, GOLDEN_PROJECTION, notCurrent, { kind: "public" }, NOW).code,
    "projection_superseded",
  );
  assert.equal(
    deriveGrantUse(GOLDEN_GRANT, GOLDEN_ROOM, GOLDEN_PROJECTION, notCurrent, NOW, "submit").code,
    "projection_superseded",
  );
  assert.equal(
    derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, GOLDEN_ROOM, GOLDEN_PROJECTION, notCurrent, NOW).code,
    "projection_not_publicly_eligible",
  );

  const successorRoom = { ...GOLDEN_ROOM, currentProjectionId: "proj_successor000000000000000001" };
  assert.equal(
    deriveProjectionRead(successorRoom, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, { kind: "public" }, NOW).code,
    "projection_superseded",
  );
  assert.equal(
    deriveGrantUse(GOLDEN_GRANT, successorRoom, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, NOW, "submit").code,
    "projection_superseded",
  );
});

test("capsule and public encounter must bind the exact Room, entity, Projection, and lifecycle", () => {
  const wrongEntityCapsule = { ...GOLDEN_PROJECTION, entityId: "entity_other000000000000000001" };
  assert.equal(
    deriveProjectionRead(GOLDEN_ROOM, wrongEntityCapsule, GOLDEN_PROJECTION_LIFECYCLE, { kind: "public" }, NOW).code,
    "projection_scope_mismatch",
  );
  assert.equal(
    deriveGrantUse(GOLDEN_GRANT, GOLDEN_ROOM, wrongEntityCapsule, GOLDEN_PROJECTION_LIFECYCLE, NOW, "submit").code,
    "projection_scope_mismatch",
  );
  assert.equal(
    derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, GOLDEN_ROOM, wrongEntityCapsule, GOLDEN_PROJECTION_LIFECYCLE, NOW).code,
    "projection_scope_mismatch",
  );

  const wrongProjectionEncounter = { ...GOLDEN_PUBLIC_ENCOUNTER, projectionId: "proj_other0000000000000000001" };
  assert.equal(
    derivePublicEncounterUse(wrongProjectionEncounter, GOLDEN_ROOM, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, NOW).code,
    "encounter_scope_mismatch",
  );
});
