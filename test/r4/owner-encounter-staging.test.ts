import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { access, readFile, realpath, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
// The bounded staging lifecycle is an executable .mjs artifact; its exports
// are tested directly without adding a declaration-only maintenance surface.
// @ts-expect-error -- intentional executable artifact import.
import { runOwnerEncounterStagingCli } from "../../scripts/r4-owner-encounter-staging.mjs";

const SOURCE = readFileSync(new URL("../../scripts/r4-owner-encounter-staging.mjs", import.meta.url), "utf8");

test("#67 Owner staging stays synthetic, loopback-only and exact-owned", () => {
  assert.match(SOURCE, /forme-r4-67-staging-net-\$\{runId\}/u);
  assert.match(SOURCE, /forme-r4-67-staging-pg-\$\{runId\}/u);
  assert.match(SOURCE, /syntheticDataOnly: true/u);
  assert.match(SOURCE, /loopbackOnly: true/u);
  assert.match(SOURCE, /publicTrafficEffects: 0/u);
  assert.match(SOURCE, /providerCalls: 0/u);
  assert.match(SOURCE, /externalMessages: 0/u);
  assert.doesNotMatch(SOURCE, /Cloudflare|Caddy|ssh|scp|fetch\(/u);
});

test("#67 Owner staging reuses the physically proven runtime bootstrap semantics", () => {
  assert.match(SOURCE, /localPublicCoreRuntimeConstructionV1/u);
  for (const action of [
    "room.create",
    "room.pair",
    "room.pair.exchange",
    "room_operator.projection.deliver",
    "curation.admit",
    "room.mode.set",
    "third_place.list",
    "room_operator.sync",
    "room_operator.pull",
  ]) assert.match(SOURCE, new RegExp(JSON.stringify(action).slice(1, -1), "u"));
  assert.match(SOURCE, /expectedVersion: 2[\s\S]*interactionMode: "public_single"|interactionMode: "public_single"[\s\S]*expectedVersion: 2/u);
  assert.match(SOURCE, /event\?\.action === "interaction\.create"/u);
  assert.match(SOURCE, /event\?\.targetKind === "interaction"/u);
  assert.match(SOURCE, /event\?\.bodyAvailable === true/u);
  assert.doesNotMatch(SOURCE, /event\?\.eventKind/u);
  assert.match(SOURCE, /id\("owner_pull", `\$\{secrets\.runId\}:\$\{accepted\.targetId\}`\)/u);
  assert.match(SOURCE, /interactionType: interaction\.interactionType/u);
  assert.match(SOURCE, /consent: interaction\.consent/u);
  assert.match(SOURCE, /originProjectionId: interaction\.projectionId/u);
  assert.match(SOURCE, /bodyExpiresAt: interaction\.expiresAt/u);
});

test("staging Room runtime uses one digest-pinned linux/amd64 base", () => {
  assert.match(SOURCE, /OWNER_STAGING_NODE_IMAGE = "node@sha256:[a-f0-9]{64}"/u);
  assert.match(SOURCE, /OWNER_STAGING_NODE_PLATFORM = "linux\/amd64"/u);
});

test("staging init writes only a private local bundle and exact cleanup removes it", async () => {
  const root = join(await realpath(tmpdir()), `forme-r4-67-staging-${randomBytes(8).toString("hex")}`);
  try {
    const initialized = await runOwnerEncounterStagingCli([
      "init",
      root,
      "abb0fff3f6f97a537273153fd3bd2e60ac4b52b3",
    ]);
    assert.equal(initialized.status, "INITIALIZED");
    assert.equal((await stat(root)).mode & 0o777, 0o700);
    assert.equal((await stat(join(root, "bootstrap-secrets.json"))).mode & 0o777, 0o600);
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
    assert.equal(manifest.runtimePlatform, "linux/amd64");
    assert.equal(JSON.stringify(manifest).includes("postgresPassword"), false);
    const cleaned = await runOwnerEncounterStagingCli(["cleanup-local", root]);
    assert.equal(cleaned.stateRootAbsent, true);
    await assert.rejects(access(root));
  } catch (error) {
    try {
      await runOwnerEncounterStagingCli(["cleanup-local", root]);
    } catch {
      // The assertion reports the original failure; cleanup is best-effort here.
    }
    throw error;
  }
});
