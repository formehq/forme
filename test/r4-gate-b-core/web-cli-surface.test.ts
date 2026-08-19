import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HostedRoomApplication } from "../../apps/room/src/application.ts";
import {
  CORE_EXCLUDED_OPERATION_NAMES,
  coreOperationDefinition,
} from "../../apps/room/src/core-policy.ts";
import { dispatchApi } from "../../apps/room/src/http.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";
import { SYNTHETIC_PRIVATE_ROOM_ID } from "../../apps/room/src/synthetic-fixtures.ts";
import {
  buildCoreHostedHttpPlan,
  type CoreRoomApiSecureInputV1,
} from "../../packages/r4-local/src/hosted-room-api.ts";
import {
  runR4CoreCli,
  type R4CliEnvironment,
  type R4CliIo,
} from "../../packages/r4-local/src/cli.ts";

const EXCLUDED_ROUTES = [
  ["PUT", "/interactions/interaction_fixture0000000000/notification"],
  ["DELETE", "/interactions/interaction_fixture0000000000/notification"],
  ["POST", "/interactions/interaction_fixture0000000000/notification/verify"],
  ["POST", "/direct-invites/invite_fixture000000000000/redeem"],
  ["POST", "/agent-derivatives"],
  ["POST", "/control/rooms/room_fixture000000000000000/mode"],
  ["POST", "/control/rooms/room_fixture000000000000000/retire"],
  ["DELETE", "/control/rooms/room_fixture000000000000000"],
  ["POST", "/control/grants"],
  ["POST", "/control/grants/grant_fixture00000000000000/replacements"],
  ["POST", "/control/direct-invites"],
  ["POST", "/control/direct-invites/invite_fixture000000000000/revoke"],
  ["POST", "/room-operator/projections/proj_fixture000000000000000/stale"],
] as const;

test("all 13 excluded routes return the same pre-parse body-free 404", async () => {
  assert.equal(EXCLUDED_ROUTES.length, CORE_EXCLUDED_OPERATION_NAMES.length);
  for (const [method, path] of EXCLUDED_ROUTES) {
    const segments = path.slice(1).split("/");
    const request = new Request(`http://forme.invalid/api/v1${path}`, {
      method,
      headers: { "content-type": "text/plain", authorization: "Bearer private-canary" },
      body: method === "DELETE" || method === "POST" || method === "PUT" ? "not-json-private-canary" : undefined,
    });
    const response = await dispatchApi(request, segments);
    const body = await response.json() as { error: Record<string, unknown> };
    assert.equal(response.status, 404);
    assert.deepEqual(Object.keys(body.error).sort(), ["code", "correlationId"]);
    assert.equal(body.error.code, "not_found");
    assert.doesNotMatch(JSON.stringify(body), /private-canary|content|authorization/u);
  }
});

test("active Core application hides Private Room state while historical Full remains callable", async () => {
  const application = new HostedRoomApplication(new SyntheticPresenceStore(() => new Date("2026-08-07T12:00:00.000Z")));
  const privateRead = {
    definition: coreOperationDefinition("projection.read"),
    params: { projectionId: "proj_formeprivate0000000000000000000" },
    body: {}, authorization: null, syntheticActor: null, idempotencyKey: null, expectedVersion: null,
  };
  await assert.rejects(() => application.runCore(privateRead), /unavailable/u);
  const coreStatus = await application.ownerStatusCore();
  assert.equal((coreStatus.body.rooms as Array<{ room: { roomId: string } }>).some((stored) => stored.room.roomId === SYNTHETIC_PRIVATE_ROOM_ID), false);
  const fullStatus = await application.ownerStatus();
  assert.equal((fullStatus.body.rooms as Array<{ room: { roomId: string } }>).some((stored) => stored.room.roomId === SYNTHETIC_PRIVATE_ROOM_ID), true);
});

test("active Web has no Private entry or notification control", () => {
  const activeFiles = [
    "apps/room/app/layout.tsx", "apps/room/app/page.tsx", "apps/room/app/owner/page.tsx",
    "apps/room/app/owner/interactions/[interactionId]/page.tsx",
    "apps/room/src/components/GuestStatus.tsx", "apps/room/src/components/OwnerControls.tsx",
  ];
  const source = activeFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /\/private\/|setNotification|\/notification|agent-token/u);
  const privateRoute = readFileSync("apps/room/app/private/[projectionId]/page.tsx", "utf8");
  assert.match(privateRoute, /notFound\(\)/u);
  assert.doesNotMatch(privateRoute, /import\s+\{\s*PrivateProjection|<PrivateProjection/u);
});

function coreListInput(): CoreRoomApiSecureInputV1 {
  return {
    schemaVersion: "forme.room.core-api-input.v1",
    pathParams: {},
    request: {},
    capability: {
      bearer: null,
      syntheticActor: null,
      idempotencyKey: null,
      expectedVersion: null,
      syntheticClientBucket: null,
    },
  };
}

test("Core CLI accepts only a named Core action and fixed request/header construction", async () => {
  const plan = buildCoreHostedHttpPlan("https://room.forme.invalid", "third_place.list", coreListInput());
  assert.equal(plan.url, "https://room.forme.invalid/api/v1/third-place/projections");
  assert.deepEqual(plan.headers, { Accept: "application/json" });
  assert.equal(plan.body, null);
  assert.throws(() => buildCoreHostedHttpPlan("https://room.forme.invalid", "notification.set", coreListInput()), /unavailable/u);
  assert.throws(() => buildCoreHostedHttpPlan("https://room.forme.invalid", "third_place.list", { ...coreListInput(), url: "https://attacker.invalid" }), /unknown/u);

  const stdout: string[] = [];
  const secure: string[] = [];
  const io: R4CliIo = {
    stdout: (value) => stdout.push(value),
    stderr: () => undefined,
    readSecret: () => JSON.stringify(coreListInput()),
    writeSecret: (value) => secure.push(value),
  };
  const environment: R4CliEnvironment = {
    room: {
      pair: async () => ({}), status: async () => ({}), sync: async () => ({}),
      prepareResponse: async () => ({}), reconcile: async () => ({}),
      api: async ({ action }) => ({ schemaVersion: "fixture.v1", action, privateFixture: "secure-only" }),
    },
    guest: {
      inspect: async () => ({}), ask: async () => ({}), status: async () => ({}), delete: async () => ({}), mintAgentToken: async () => ({}),
    },
  };
  await runR4CoreCli(["room", "api", "third_place.list"], environment, io);
  assert.match(stdout[0]!, /resultWrittenToSecureOutput/);
  assert.doesNotMatch(stdout[0]!, /secure-only/);
  assert.match(secure[0]!, /secure-only/);
  await assert.rejects(() => runR4CoreCli(["guest", "agent-token"], environment, io), /inspect\|ask\|status\|delete/u);
});
