import assert from "node:assert/strict";
import test from "node:test";
import {
  SyntheticHourlyJanitor,
  SyntheticRetentionRepository,
} from "../../apps/room/src/offline-control/retention.ts";

const T0 = "2026-08-03T12:00:00.000Z";

function at(hours: number): string {
  return new Date(Date.parse(T0) + hours * 60 * 60 * 1_000).toISOString();
}

test("E06 hourly janitor uses an advisory lock and concurrent duplicate invocation is effectless", async () => {
  const repository = new SyntheticRetentionRepository(T0);
  repository.register({ targetId: "interaction_body_0000000000000001", kind: "interaction_body", terminalAt: T0 });
  const janitor = new SyntheticHourlyJanitor(repository);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const first = janitor.run(at(1), "scheduled", { afterLock: () => held });
  await Promise.resolve();
  const duplicate = await janitor.run(at(1), "scheduled");
  assert.equal(duplicate.status, "advisory_lock_held");
  assert.equal(duplicate.receipts.length, 0);
  release();
  const completed = await first;
  assert.equal(completed.status, "completed");
  assert.equal(repository.target("interaction_body_0000000000000001")?.payloadPresent, false);
});

test("E06 deterministic batches survive partial failure and manual rerun without duplicate purge", async () => {
  const repository = new SyntheticRetentionRepository(T0);
  for (const [targetId, kind] of [
    ["target_a_0000000000000000", "interaction_body"],
    ["target_b_0000000000000000", "response_body"],
    ["target_c_0000000000000000", "notification_delivery_target"],
  ] as const) repository.register({ targetId, kind, terminalAt: T0 });
  const janitor = new SyntheticHourlyJanitor(repository, 10);
  const partial = await janitor.run(at(1), "scheduled", {
    failTargetIds: new Set(["target_b_0000000000000000"]),
  });
  assert.equal(partial.status, "partial_failure");
  assert.deepEqual(partial.receipts.map((receipt) => receipt.outcome), ["purged", "failed", "purged"]);
  assert.equal(repository.target("target_b_0000000000000000")?.payloadPresent, true);

  const manual = await janitor.run(at(2), "manual");
  assert.equal(manual.status, "completed");
  assert.deepEqual(manual.receipts.map((receipt) => receipt.targetId), ["target_b_0000000000000000"]);
  assert.equal(manual.receipts[0]?.outcome, "purged");
  assert.equal(repository.targets().every((target) => !target.payloadPresent), true);

  const noOp = await janitor.run(at(3), "manual");
  assert.equal(noOp.status, "completed");
  assert.equal(noOp.receipts.length, 0);
  assert.equal(repository.receipts().length, 3, "one stable receipt exists per target despite reruns");
});

test("E06 purge target is under 24h and >36h stale success opens a body-free write/email incident", async () => {
  const repository = new SyntheticRetentionRepository(T0);
  repository.register({ targetId: "late_target_0000000000000000", kind: "guest_capsule", terminalAt: T0 });
  const janitor = new SyntheticHourlyJanitor(repository);

  const beforeTarget = janitor.health(at(23.99));
  assert.equal(beforeTarget.incidents.some((incident) => incident.code === "purge_target_missed"), false);
  const targetMissed = janitor.health(at(24));
  assert.equal(targetMissed.incidents.some((incident) => incident.code === "purge_target_missed"), true);
  assert.equal(targetMissed.incidents.every((incident) => JSON.stringify(incident).includes("bodyFree")), true);

  const unhealthy = janitor.health(at(36.01));
  assert.deepEqual(
    { healthy: unhealthy.healthy, writesHealthy: unhealthy.writesHealthy, emailHealthy: unhealthy.emailHealthy },
    { healthy: false, writesHealthy: false, emailHealthy: false },
  );
  assert.equal(unhealthy.incidents.some((incident) => incident.code === "last_successful_purge_stale"), true);

  await janitor.run(at(37), "manual");
  const recovered = janitor.health(at(37));
  assert.equal(recovered.healthy, true);
  assert.equal(repository.target("late_target_0000000000000000")?.purgedAt, at(37));
});
