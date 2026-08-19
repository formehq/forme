import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isSemanticError } from "../../apps/room/src/application.ts";
import { dispatchApi, dispatchLocalPublicCoreApiV1 } from "../../apps/room/src/http.ts";

const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";

function expectNoStore(response: Response): void {
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

async function asObject(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

test("HTTP API fails closed outside explicit synthetic mode and keeps errors no-store", async () => {
  const previous = process.env.FORME_R4_SYNTHETIC;
  delete process.env.FORME_R4_SYNTHETIC;
  try {
    const response = await dispatchApi(
      new Request("http://forme.invalid/api/v1/third-place/projections"),
      ["third-place", "projections"],
    );
    assert.equal(response.status, 503);
    expectNoStore(response);
    const payload = await asObject(response);
    assert.equal((payload.error as { code: string }).code, "hosted_runtime_unavailable");
  } finally {
    if (previous === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previous;
  }
});

test("Agent JSON list/read share one semantic Projection decision and every response is no-store", async () => {
  const previous = process.env.FORME_R4_SYNTHETIC;
  process.env.FORME_R4_SYNTHETIC = "1";
  try {
    const listResponse = await dispatchApi(
      new Request("http://forme.invalid/api/v1/third-place/projections"),
      ["third-place", "projections"],
    );
    assert.equal(listResponse.status, 200);
    expectNoStore(listResponse);
    const list = await asObject(listResponse);
    const residents = list.residents as Array<{ view: Record<string, unknown> }>;
    assert.equal(residents.length, 1);

    const readResponse = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}`),
      ["projections", PUBLIC_PROJECTION_ID],
    );
    assert.equal(readResponse.status, 200);
    expectNoStore(readResponse);
    const read = await asObject(readResponse);
    assert.deepEqual(read.view, residents[0]?.view, "Third Place and direct Agent JSON derive from one server decision");
  } finally {
    if (previous === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previous;
  }
});

test("local Public Core rehearsal seam uses the real HTTP membrane without synthetic authority", async () => {
  const calls: unknown[] = [];
  const application: Parameters<typeof dispatchLocalPublicCoreApiV1>[2] = {
    async runCore(request) {
      calls.push(request);
      return { status: 200, body: { residents: [] } };
    },
  };
  const response = await dispatchLocalPublicCoreApiV1(
    new Request("http://127.0.0.1/api/v1/third-place/projections", {
      headers: { "x-forme-synthetic-client-bucket": "must-not-cross" },
    }),
    ["third-place", "projections"],
    application,
  );
  assert.equal(response.status, 200);
  expectNoStore(response);
  assert.equal(calls.length, 1);
  const request = calls[0] as {
    definition: { name: string };
    syntheticActor: string | null;
    syntheticClientBucket: string | null;
  };
  assert.equal(request.definition.name, "third_place.list");
  assert.equal(request.syntheticActor, null);
  assert.equal(request.syntheticClientBucket, null);
});

test("HTTP parser rejects duplicate JSON keys and missing object versions before mutation", async () => {
  const previous = process.env.FORME_R4_SYNTHETIC;
  process.env.FORME_R4_SYNTHETIC = "1";
  try {
    const duplicate = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}/encounters`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "33333333333333333333333333333333",
          "if-match": "1",
        },
        body: "{\"encounterSecret\":\"duplicate_secret_00000001\",\"encounterSecret\":\"duplicate_secret_00000002\"}",
      }),
      ["projections", PUBLIC_PROJECTION_ID, "encounters"],
    );
    assert.equal(duplicate.status, 400);
    expectNoStore(duplicate);
    assert.equal(((await asObject(duplicate)).error as { code: string }).code, "invalid_json");

    const missingVersion = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}/encounters`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "44444444444444444444444444444444",
        },
        body: JSON.stringify({ encounterSecret: "missing_version_secret_000001" }),
      }),
      ["projections", PUBLIC_PROJECTION_ID, "encounters"],
    );
    assert.equal(missingVersion.status, 400);
    expectNoStore(missingVersion);
    assert.equal(((await asObject(missingVersion)).error as { code: string }).code, "expected_version_required");
  } finally {
    if (previous === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previous;
  }
});

test("production-bundle-equivalent semantic errors stay typed instead of degrading to 503", () => {
  const duplicatedModuleError = Object.assign(new Error("Interaction not found"), {
    name: "SemanticError",
    status: 404,
    code: "not_found",
  });
  assert.equal(isSemanticError(duplicatedModuleError), true);
  assert.equal(isSemanticError({ name: "SemanticError", status: 200, code: "not_found", message: "no" }), false);
  assert.equal(isSemanticError({ name: "SemanticError", status: 404, code: "NOT SAFE", message: "no" }), false);
});

test("unknown and deleted Interaction reads return controlled 404 instead of 503", async () => {
  const previous = process.env.FORME_R4_SYNTHETIC;
  process.env.FORME_R4_SYNTHETIC = "1";
  try {
    const missing = await dispatchApi(
      new Request("http://forme.invalid/api/v1/interactions/interaction_missing0000000000000000", {
        headers: { authorization: "Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
      }),
      ["interactions", "interaction_missing0000000000000000"],
    );
    assert.equal(missing.status, 404);
    assert.equal(((await asObject(missing)).error as { code: string }).code, "not_found");

    const encounterSecret = Buffer.alloc(32, 41).toString("base64url");
    const replySecret = Buffer.alloc(32, 42).toString("base64url");
    const deleteSecret = Buffer.alloc(32, 43).toString("base64url");
    const encounter = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}/encounters`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": Buffer.alloc(16, 44).toString("base64url"),
          "if-match": "1",
          "x-forme-synthetic-client-bucket": "http-terminal-read",
        },
        body: JSON.stringify({ encounterSecret }),
      }),
      ["projections", PUBLIC_PROJECTION_ID, "encounters"],
    );
    assert.equal(encounter.status, 201);

    const created = await dispatchApi(
      new Request("http://forme.invalid/api/v1/interactions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${encounterSecret}`,
          "content-type": "application/json",
          "idempotency-key": Buffer.alloc(16, 45).toString("base64url"),
        },
        body: JSON.stringify({
          projectionId: PUBLIC_PROJECTION_ID,
          interactionType: "resonance",
          consent: "manual_owner_only",
          requestBody: "Synthetic terminal-status browser regression.",
          replySecret,
          deleteSecret,
        }),
      }),
      ["interactions"],
    );
    assert.equal(created.status, 201);
    const interactionId = String((await asObject(created)).interactionId);

    const deleted = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/interactions/${interactionId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${deleteSecret}`,
          "content-type": "application/json",
          "idempotency-key": Buffer.alloc(16, 46).toString("base64url"),
          "if-match": "1",
        },
        body: "{}",
      }),
      ["interactions", interactionId],
    );
    assert.equal(deleted.status, 200);

    const tombstone = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/interactions/${interactionId}`, {
        headers: { authorization: `Bearer ${replySecret}` },
      }),
      ["interactions", interactionId],
    );
    assert.equal(tombstone.status, 404);
    const tombstoneBody = await asObject(tombstone);
    assert.equal((tombstoneBody.error as { code: string }).code, "not_found");
    assert.equal(JSON.stringify(tombstoneBody).includes("Synthetic terminal-status browser regression."), false);
  } finally {
    if (previous === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previous;
  }
});

test("Next Web surface applies no-store and the minimum security headers to every route", async () => {
  const source = readFileSync(new URL("../../apps/room/next.config.ts", import.meta.url), "utf8");
  assert.match(source, /source: "\/:path\*"/u);
  assert.match(source, /key: "Cache-Control", value: "no-store"/u);
  assert.match(source, /key: "Referrer-Policy", value: "no-referrer"/u);
  assert.match(source, /key: "X-Content-Type-Options", value: "nosniff"/u);
  assert.match(source, /key: "X-Frame-Options", value: "DENY"/u);
  assert.match(source, /"frame-ancestors 'none'"/u);
});
