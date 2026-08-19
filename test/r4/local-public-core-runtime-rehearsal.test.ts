import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createLocalRuntimeRehearsalProjectionV1,
  LOCAL_RUNTIME_REHEARSAL_IMAGE,
  LOCAL_RUNTIME_REHEARSAL_PLATFORM,
  LOCAL_RUNTIME_REHEARSAL_SERVER_VERSION,
// The bounded lifecycle is an executable .mjs artifact; its constants are
// tested directly without adding a declaration-only maintenance surface.
// @ts-expect-error -- intentional executable artifact import.
} from "../../scripts/r4-local-public-core-runtime-rehearsal.mjs";

const SOURCE = readFileSync(new URL("../../scripts/r4-local-public-core-runtime-rehearsal.mjs", import.meta.url), "utf8");

test("rehearsal Projection satisfies the exact existing protocol before physical work", () => {
  const value = createLocalRuntimeRehearsalProjectionV1(
    "room_00000000000000000000000000000001",
    "entity_forme_public_core_v1",
    new Date("2026-08-19T00:00:00.000Z"),
  );
  assert.equal(value.schemaVersion, "projection_capsule.v1");
  assert.equal(value.claims.length, 5);
  for (const claim of value.claims) {
    if (claim.attribution === "inferred_allowed") {
      assert.equal(typeof claim.uncertainty, "string");
      assert.ok(claim.uncertainty.length > 0);
    }
  }
});

test("local runtime rehearsal is one exact-image, loopback-only, synthetic-data lifecycle", () => {
  assert.equal(LOCAL_RUNTIME_REHEARSAL_IMAGE, "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74");
  assert.equal(LOCAL_RUNTIME_REHEARSAL_PLATFORM, "linux/arm64");
  assert.equal(LOCAL_RUNTIME_REHEARSAL_SERVER_VERSION, 160010);
  assert.match(SOURCE, /"--publish", "127\.0\.0\.1::5432"/u);
  assert.match(SOURCE, /imagePullAttempts: 0/u);
  assert.match(SOURCE, /imagePulls: 0/u);
  assert.match(SOURCE, /realGuestRecords: 0/u);
  assert.match(SOURCE, /providerCalls: 0/u);
  assert.match(SOURCE, /publicTrafficEffects: 0/u);
  assert.equal(SOURCE.match(/\["image", "pull"/gu)?.length, 1);
  assert.match(SOURCE, /if \(!pullAllowed\) fail\("local_runtime_exact_image_not_cached", "docker\.image\.inspect"\)/u);
  assert.match(SOURCE, /result\.effects\.imagePullAttempts = 1;[\s\S]*"docker\.image\.pull"[\s\S]*result\.effects\.imagePulls = 1;/u);
  assert.match(SOURCE, /execute \[--allow-image-pull\]/u);
  assert.match(SOURCE, /DOCKER_CONFIG: dockerConfig/u);
  assert.match(SOURCE, /"--host", `unix:\/\/\$\{docker\.socketPath\}`/u);
  assert.match(SOURCE, /"docker\.image\.pull", false, 180_000/u);
  assert.match(SOURCE, /local_runtime_operation_\$\{error\.code\}.*product\.\$\{action\}/su);
  assert.match(SOURCE, /deriveSecret\(\{\s*purpose: "room_binding",\s*action: "room\.pair\.exchange"/u);
});

test("rehearsal walks the complete #67 arrival path and closes before returning", () => {
  const expected = [
    "room.create",
    "room.pair",
    "room.pair.exchange",
    "room_operator.projection.deliver",
    "curation.admit",
    "room.mode.set",
    "third_place.list",
    "projection.read",
    "public_encounter.issue",
    "interaction.create",
    "room_operator.sync",
    "room_operator.pull",
    "interaction.delete",
  ];
  let cursor = 0;
  for (const action of expected) {
    const position = SOURCE.indexOf(`, "${action}"`, cursor);
    assert.ok(position >= cursor, `${action} must appear in order`);
    cursor = position + action.length;
  }
  assert.match(SOURCE, /await loaded\.close\(\);[\s\S]*loadPublicCoreLocalRuntimeV1\(runtimeRoot\)[\s\S]*runtimeReloaded = true/u);
  assert.match(SOURCE, /dispatchLocalPublicCoreApiV1/u);
  assert.match(SOURCE, /interactionMode: "public_single"[\s\S]*expectedVersion: 2/u);
  assert.match(SOURCE, /interactionMode: "closed"[\s\S]*expectedVersion: 3/u);
  assert.match(SOURCE, /"container", "rm", "--force"/u);
  assert.match(SOURCE, /"network", "rm"/u);
  assert.match(SOURCE, /"volume", "rm", "--force"/u);
  assert.match(SOURCE, /await rm\(campaignRoot, \{ recursive: true, force: true \}\)/u);
});
