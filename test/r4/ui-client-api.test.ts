import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientApiError,
  readClientApiJson,
  safeClientFailure,
} from "../../apps/room/src/components/client-api.ts";

test("UI response reader returns an object for a successful JSON response", async () => {
  const value = await readClientApiJson(
    new Response(JSON.stringify({ state: "closed_without_response" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
    "fallback",
  );
  assert.deepEqual(value, { state: "closed_without_response" });
});

test("UI response reader maps a reviewed code without reflecting server text", async () => {
  const privateBytes = "capability-super-secret-bytes";
  await assert.rejects(
    readClientApiJson(
      new Response(JSON.stringify({
        error: {
          code: "version_conflict",
          message: `internal failure included ${privateBytes}`,
        },
      }), { status: 409, headers: { "Content-Type": "application/json" } }),
      "safe fallback",
    ),
    (error: unknown) => {
      assert.ok(error instanceof ClientApiError);
      assert.equal(error.code, "version_conflict");
      assert.match(error.message, /Refresh its status/u);
      assert.doesNotMatch(error.message, new RegExp(privateBytes, "u"));
      return true;
    },
  );
});

test("UI response reader uses the local fallback for unknown or non-JSON failures", async () => {
  for (const response of [
    new Response(JSON.stringify({ error: { code: "future_error", message: "sensitive detail" } }), { status: 400 }),
    new Response("proxy included sensitive detail", { status: 502 }),
  ]) {
    await assert.rejects(
      readClientApiJson(response, "safe local fallback"),
      (error: unknown) => error instanceof ClientApiError && error.message === "safe local fallback",
    );
  }
});

test("unexpected browser failures resolve to an actionable local message", () => {
  assert.equal(
    safeClientFailure(new TypeError("fetch included an implementation detail"), "check the connection and retry"),
    "check the connection and retry",
  );
});
