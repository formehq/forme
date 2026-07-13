import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCodexDoctor, compareVersions } from "./codex-preflight.ts";

function report(current: string, latest: string): unknown {
  return {
    codexVersion: current,
    checks: {
      "updates.status": {
        details: { "latest version": latest },
      },
    },
  };
}

test("Codex preflight accepts current/newer versions and rejects stale versions", () => {
  assert.equal(compareVersions("0.144.3", "0.144.3"), 0);
  assert.equal(compareVersions("0.145.0", "0.144.3"), 1);
  assert.equal(compareVersions("0.142.5", "0.144.3"), -1);
  assert.deepEqual(checkCodexDoctor(report("0.144.3", "0.144.3")), {
    current: "0.144.3",
    latest: "0.144.3",
  });
  assert.throws(() => checkCodexDoctor(report("0.142.5", "0.144.3")), /stale.*latest available/s);
  assert.throws(() => checkCodexDoctor({ codexVersion: "0.144.3", checks: {} }), /could not verify/);
});
