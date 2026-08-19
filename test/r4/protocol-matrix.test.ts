import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSha256,
  createProjectionReadViewV1,
  deriveGrantUse,
  deriveProjectionRead,
  derivePublicEncounterUse,
  GOLDEN_GRANT,
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_LIFECYCLE,
  GOLDEN_PUBLIC_ENCOUNTER,
  GOLDEN_ROOM,
  validateProjectionCapsuleV1,
  validateProjectionReadViewV1,
  type CurationState,
  type InteractionMode,
  type ProjectionOwnerState,
  type RoomKind,
  type RoomStatus,
} from "../../packages/r4-protocol/src/index.ts";

const TIMES = {
  before: "2026-08-03T11:59:59.999Z",
  fresh: "2026-08-03T12:00:00.000Z",
  stale: "2026-08-04T12:00:00.000Z",
  expired: "2026-08-10T12:00:00.000Z",
} as const;

test("exhaustive Room/Projection/time/access matrix has one explicit readable region and fail-closed complement", () => {
  const roomKinds: RoomKind[] = ["third_place_public", "private_grant_only"];
  const modes: InteractionMode[] = ["public_single", "invite_only", "closed"];
  const roomStatuses: RoomStatus[] = ["active", "retired"];
  const ownerStates: ProjectionOwnerState[] = ["published_fresh", "stale", "superseded", "revoked", "expired"];
  const curationStates: CurationState[] = ["not_admitted", "admitted", "unlisted"];
  const accesses = [{ kind: "public" } as const, { kind: "grant", grant: GOLDEN_GRANT } as const];
  let readVectors = 0;
  let encounterVectors = 0;
  let grantVectors = 0;
  let readable = 0;
  let encountersAllowed = 0;
  let grantsAllowed = 0;

  for (const roomKind of roomKinds) for (const interactionMode of modes) for (const status of roomStatuses) {
    const room = { ...GOLDEN_ROOM, roomKind, interactionMode, status, retiredAt: status === "retired" ? TIMES.fresh : null };
    for (const ownerState of ownerStates) for (const curationState of curationStates) for (const current of [true, false]) {
      const lifecycle = { ...GOLDEN_PROJECTION_LIFECYCLE, ownerState, curationState, current };
      for (const [timeClass, now] of Object.entries(TIMES) as Array<[keyof typeof TIMES, string]>) {
        for (const access of accesses) {
          const result = deriveProjectionRead(room, GOLDEN_PROJECTION, lifecycle, access, now);
          const expected = timeClass !== "before"
            && timeClass !== "expired"
            && status === "active"
            && current
            && ownerState !== "superseded"
            && ownerState !== "revoked"
            && ownerState !== "expired"
            && (roomKind !== "private_grant_only" || access.kind === "grant");
          assert.equal(result.allowed, expected, canonicalSha256({ roomKind, interactionMode, status, ownerState, curationState, current, timeClass, access: access.kind }));
          readVectors += 1;
          if (result.allowed) readable += 1;
          if (result.allowed && (ownerState === "stale" || timeClass === "stale")) assert.equal(result.warning, "stale_projection");
        }

        const encounter = derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, room, GOLDEN_PROJECTION, lifecycle, now);
        const encounterExpected = roomKind === "third_place_public"
          && interactionMode === "public_single"
          && status === "active"
          && ownerState === "published_fresh"
          && curationState === "admitted"
          && current
          && timeClass === "fresh";
        assert.equal(encounter.allowed, encounterExpected, canonicalSha256({ lane: "encounter", roomKind, interactionMode, status, ownerState, curationState, current, timeClass }));
        encounterVectors += 1;
        if (encounter.allowed) encountersAllowed += 1;

        const grant = deriveGrantUse(GOLDEN_GRANT, room, GOLDEN_PROJECTION, lifecycle, now, "submit");
        const grantExpected = interactionMode !== "closed"
          && status === "active"
          && ownerState === "published_fresh"
          && current
          && timeClass === "fresh";
        assert.equal(grant.allowed, grantExpected, canonicalSha256({ lane: "grant", roomKind, interactionMode, status, ownerState, curationState, current, timeClass }));
        grantVectors += 1;
        if (grant.allowed) grantsAllowed += 1;
      }
    }
  }

  assert.deepEqual({ readVectors, encounterVectors, grantVectors }, { readVectors: 2_880, encounterVectors: 1_440, grantVectors: 1_440 });
  assert.ok(readable > 0 && readable < readVectors);
  assert.ok(encountersAllowed > 0 && encountersAllowed < encounterVectors);
  assert.ok(grantsAllowed > 0 && grantsAllowed < grantVectors);
});

test("Room current pointer and Entity/Projection scope mismatch fail every read/submit lane", () => {
  const wrongCurrentRoom = { ...GOLDEN_ROOM, currentProjectionId: "proj_successorsynthetic00000000001" };
  const wrongEntityProjection = { ...GOLDEN_PROJECTION, entityId: "entity_othersynthetic000000000001" };
  assert.equal(deriveProjectionRead(wrongCurrentRoom, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, { kind: "public" }, TIMES.fresh).allowed, false);
  assert.equal(deriveGrantUse(GOLDEN_GRANT, wrongCurrentRoom, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, TIMES.fresh, "submit").allowed, false);
  assert.equal(derivePublicEncounterUse(GOLDEN_PUBLIC_ENCOUNTER, wrongCurrentRoom, GOLDEN_PROJECTION, GOLDEN_PROJECTION_LIFECYCLE, TIMES.fresh).allowed, false);
  assert.equal(deriveProjectionRead(GOLDEN_ROOM, wrongEntityProjection, GOLDEN_PROJECTION_LIFECYCLE, { kind: "public" }, TIMES.fresh).allowed, false);
});

test("Projection freshness and expiry must each be a positive time window", () => {
  const { payloadHash: _payloadHash, ...preimage } = GOLDEN_PROJECTION;
  const equalFresh = { ...preimage, freshUntil: preimage.publishedAt };
  assert.throws(() => validateProjectionCapsuleV1({ ...equalFresh, payloadHash: canonicalSha256(equalFresh) }), /publishedAt < freshUntil/u);
  const equalExpiry = { ...preimage, expiresAt: preimage.freshUntil };
  assert.throws(() => validateProjectionCapsuleV1({ ...equalExpiry, payloadHash: canonicalSha256(equalExpiry) }), /freshUntil < expiresAt/u);
});

test("a clock-stale view validates even when durable owner state is still published_fresh", () => {
  const view = createProjectionReadViewV1(
    GOLDEN_ROOM,
    GOLDEN_PROJECTION,
    GOLDEN_PROJECTION_LIFECYCLE,
    { kind: "public" },
    TIMES.stale,
  );
  assert.equal(view.lifecycle.ownerState, "published_fresh");
  assert.equal(view.warning, "stale_projection");
  assert.deepEqual(validateProjectionReadViewV1(view), view);
});
