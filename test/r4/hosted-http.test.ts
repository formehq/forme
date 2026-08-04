import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dispatchApi } from "../../apps/room/src/http.ts";

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

test("Next Web surface applies no-store and the minimum security headers to every route", async () => {
  const source = readFileSync(new URL("../../apps/room/next.config.ts", import.meta.url), "utf8");
  assert.match(source, /source: "\/:path\*"/u);
  assert.match(source, /key: "Cache-Control", value: "no-store"/u);
  assert.match(source, /key: "Referrer-Policy", value: "no-referrer"/u);
  assert.match(source, /key: "X-Content-Type-Options", value: "nosniff"/u);
  assert.match(source, /key: "X-Frame-Options", value: "DENY"/u);
  assert.match(source, /"frame-ancestors 'none'"/u);
});
