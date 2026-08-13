import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LOCAL_POSTGRES_DOCKER_COMMAND_KINDS,
  LOCAL_POSTGRES_PHASE1_AUTHORITY,
  LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY,
  LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES,
  LOCAL_POSTGRES_STAGE_A_PATHS,
  LOCAL_POSTGRES_V3_CEILINGS,
  LocalPostgresRunnerError,
  buildLocalPostgresDockerPlan,
  createLocalPostgresPendingGrant,
  deriveLocalPostgresResourceNames,
  parseLocalPostgresRunnerArguments,
  prepareLocalPostgresPendingGrantV3,
  runApprovedLocalPostgresPhysical,
  runLocalPostgresFakePlan,
  runLocalPostgresCleanupLifecycleFakePlan,
  runLocalPostgresPrepareFakePlan,
  runLocalPostgresReadinessFakePlan,
  runLocalPostgresReceiptValidationFakePlan,
  validateLocalPostgresGrant,
// The approved runner is an executable .mjs artifact; its runtime exports are
// contract-tested here without adding an out-of-workset declaration file.
// @ts-expect-error -- intentionally no ambient declaration for the CLI artifact.
} from "../../scripts/r4-public-core-local-postgres.mjs";

const SHA = `sha256:${"a".repeat(64)}`;
const GIT = "b".repeat(40);
const NOW = "2026-08-11T18:00:00.000Z";

const CATALOG = Object.freeze({ tables: 14, columns: 207, constraints: 172, indexes: 44 });
const CATALOG_CONTRACT_SHA256 = "sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4";
const IMAGE_REFERENCE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
const IMAGE_PLATFORM = "linux/arm64";
const IMAGE_PLATFORM_MANIFEST = "sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf";
const FAKE_DOCKER_CLI_IDENTITY_SHA256 = `sha256:${createHash("sha256")
  .update(Buffer.from("forme-r4-phase1-fake-cli-v1", "utf8"))
  .digest("hex")}`;
const FAKE_SOCKET_IDENTITY_SHA256 = `sha256:${createHash("sha256")
  .update(Buffer.from("forme-r4-phase1-fake-socket-v1", "utf8"))
  .digest("hex")}`;
const NOT_OBSERVED_TARGET = Object.freeze({
  catalogOutcome: "NOT_OBSERVED",
  tables: "NOT_OBSERVED",
  columns: "NOT_OBSERVED",
  constraints: "NOT_OBSERVED",
  indexes: "NOT_OBSERVED",
  catalogContractSha256: "NOT_OBSERVED",
});
const ZERO_RESIDUE_CLEANUP = Object.freeze({
  ownedContainerCount: 0,
  ownedNetworkCount: 0,
  ownedVolumeCount: 0,
  ownedCredentialCount: 0,
  ownedDockerConfigCount: 0,
  ownedImportedRuntimeCount: 0,
  activeCoordinatorResidueCount: 0,
  retainedForensicFiles: ["grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json"],
});
const DOMAIN_ACTIONS = Object.freeze([
  "curation.admit",
  "curation.unlist",
  "interaction.create",
  "interaction.delete",
  "interaction.read",
  "projection.read",
  "projection.revoke",
  "public_encounter.issue",
  "room.binding.revoke",
  "room.create",
  "room.mode.set",
  "room.pair",
  "room.pair.exchange",
  "room_operator.ack",
  "room_operator.local_purge.receipt",
  "room_operator.projection.deliver",
  "room_operator.pull",
  "room_operator.status",
  "room_operator.sync",
  "third_place.list",
]);
const DOMAIN_ACTION_SET_SHA256 = `sha256:${createHash("sha256")
  .update(Buffer.from(`${DOMAIN_ACTIONS.join("\n")}\n`, "utf8"))
  .digest("hex")}`;
const CACHED_DOCKER_VECTOR = Object.freeze({
  version: 1,
  "image.inspect": 1,
  "image.pull": 0,
  "container.inspect": 4,
  "container.create": 1,
  "container.start": 2,
  "container.stop": 2,
  "container.rm": 1,
  "network.inspect": 3,
  "network.create": 1,
  "network.rm": 1,
  "volume.inspect": 3,
  "volume.create": 1,
  "volume.rm": 1,
});
const PULLED_DOCKER_VECTOR = Object.freeze({ ...CACHED_DOCKER_VECTOR, "image.inspect": 2, "image.pull": 1 });
const TRANSITIVE_RUNTIME_PATHS = Object.freeze([
  "apps/room/src/operation-inventory.ts",
  "apps/room/src/production-config.ts",
  "apps/room/src/public-core-policy.ts",
  "apps/room/src/public-core-retention.ts",
  "apps/room/src/public-core-store.ts",
  "packages/r4-protocol/src/canonical.ts",
  "packages/r4-protocol/src/constructors.ts",
  "packages/r4-protocol/src/golden.ts",
  "packages/r4-protocol/src/guards.ts",
  "packages/r4-protocol/src/index.ts",
  "packages/r4-protocol/src/object-validation.ts",
  "packages/r4-protocol/src/registry.ts",
  "packages/r4-protocol/src/state.ts",
  "packages/r4-protocol/src/types.ts",
  "packages/r4-protocol/src/validation.ts",
  "package.json",
]);

const RECEIPT_AUTHORITY_KEYS = Object.freeze([
  "wiringPacketSha256", "wiringOwnerReviewSha256", "addendumBSha256", "addendumBOwnerReviewSha256",
  "addendumCSha256", "addendumCOwnerReviewSha256", "physicalRebindPacketSha256", "physicalRebindReviewSha256",
  "executionCardSha256", "executionReviewSha256", "executionAuthorityPayloadSha256",
]);
const RECEIPT_LINEAGE_KEYS = Object.freeze([
  "addendumBWrapperHead", "addendumBWrapperTree", "addendumCWrapperHead", "addendumCWrapperTree",
  "stageAHead", "stageATree", "stageAArtifactAggregateSha256", "stageBHead", "stageBTree",
  "stageBArtifactAggregateSha256", "physicalRebindPacketHead", "physicalRebindPacketTree",
  "physicalRebindReviewHead", "physicalRebindReviewTree", "rebindImplementationHead", "rebindImplementationTree",
  "rebindImplementationArtifactAggregateSha256", "rebindEvidenceHead", "rebindEvidenceTree", "rebindStatusHead",
  "rebindStatusTree", "executionCardHead", "executionCardTree", "executionReviewHead", "executionReviewTree",
]);
const RECEIPT_ARTIFACT_KEYS = Object.freeze([
  "physicalRebindArtifactIndexSha256", "physicalRebindEvidenceSchemaSha256", "physicalRebindEvidenceSha256",
  "physicalRebindReportSha256", "rebindStatusCommittedAuditSummarySha256", "packageLockSha256",
  "pgImportClosureSha256", "pgImportClosureFileCount", "pgImportClosurePackageCount", "runnerSha256",
  "runnerTestSha256", "schemaSqlSha256", "verifySqlSha256", "rollbackSqlSha256", "catalogContractSha256", "catalog",
]);
const RECEIPT_HOST_KEYS = Object.freeze([
  "dockerCliIdentitySha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
  "socketIdentitySha256", "imageReference", "imagePlatform", "imagePlatformManifest", "imagePullAttempted",
  "imagePullOutcome", "imageCacheOutcome", "postgresServerVersionNum",
]);
const RECEIPT_EFFECT_KEYS = Object.freeze([
  "dockerCallCounts", "initialReadinessAttemptCount", "restartReadinessAttemptCount", "poolConstructionAttemptCount",
  "poolConstructionCount", "connectionAttemptCount", "connectionTargetCounts", "databaseIdentityAttemptCount",
  "databaseIdentityCount", "schemaApplyAttemptCount", "schemaApplyCount", "verifyAttemptCount", "verifyCount",
  "rollbackAttemptCount", "rollbackCount", "domainActionInvocationAttemptCount", "domainActionInvocationCount",
  "distinctDomainActionAttemptCount", "distinctDomainActionAttemptSetSha256", "distinctDomainActionCount",
  "distinctDomainActionSetSha256", "containerRestartAttemptCount", "containerRestartCount",
  "maximumObservedConcurrentPools", "maximumObservedConcurrentClients", "maximumObservedConcurrentTransactions",
]);

function exactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}

function canonicalTestJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalTestJson).join(",")}]`;
  assert.equal(typeof value, "object");
  assert.ok(value !== null);
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalTestJson(record[key])}`).join(",")}}`;
}

function assertClosedReceiptShape(receipt: Readonly<Record<string, unknown>>): void {
  const record = receipt as Readonly<Record<string, any>>;
  exactKeys(receipt, [
    "schemaVersion", "status", "code", "cleanupStatus", "priorEvidenceSha256", "consumedGrantSha256",
    "authority", "lineage", "artifacts", "hostObservation", "effects", "targetObservation", "cleanup",
    "journal", "readiness", "coordinator",
  ]);
  exactKeys(record.authority, RECEIPT_AUTHORITY_KEYS);
  exactKeys(record.lineage, RECEIPT_LINEAGE_KEYS);
  exactKeys(record.artifacts, RECEIPT_ARTIFACT_KEYS);
  exactKeys(record.artifacts.catalog, Object.keys(CATALOG));
  exactKeys(record.hostObservation, RECEIPT_HOST_KEYS);
  exactKeys(record.effects, RECEIPT_EFFECT_KEYS);
  exactKeys(record.effects.dockerCallCounts, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  exactKeys(record.effects.connectionTargetCounts, ["primary", "rollback", "admin"]);
  exactKeys(record.targetObservation, ["catalogOutcome", "tables", "columns", "constraints", "indexes", "catalogContractSha256"]);
  exactKeys(record.cleanup, [
    "ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "ownedCredentialCount", "ownedDockerConfigCount",
    "ownedImportedRuntimeCount", "activeCoordinatorResidueCount", "retainedForensicFiles",
  ]);
  exactKeys(record.journal, ["entryCount", "headSha256"]);
  exactKeys(record.readiness, ["targetPostgresObserved", "productRuntimeEffects", "trafficReady", "gateCReady"]);
  exactKeys(record.coordinator, ["ownerIdentitySha256", "leaseReleased", "activeResidueCount"]);
}

function assertNonnegativeSafeInteger(value: unknown, label: string): asserts value is number {
  assert.equal(Number.isSafeInteger(value) && Number(value) >= 0, true, `${label} must be a nonnegative safe integer`);
}

function assertReceiptBindings(receipt: Readonly<Record<string, any>>): void {
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority)) {
    assert.equal(receipt.authority[key], value, `receipt authority drift: ${key}`);
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage)) {
    assert.equal(receipt.lineage[key], value, `receipt lineage drift: ${key}`);
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts)) {
    if (key === "catalog") assert.deepEqual(JSON.parse(JSON.stringify(receipt.artifacts.catalog)), CATALOG);
    else assert.equal(receipt.artifacts[key], value, `receipt artifact drift: ${key}`);
  }
  for (const key of RECEIPT_AUTHORITY_KEYS.filter((value) => value.endsWith("Sha256"))) {
    assert.match(receipt.authority[key], /^sha256:[0-9a-f]{64}$/u, `invalid receipt authority hash: ${key}`);
  }
  for (const key of RECEIPT_LINEAGE_KEYS) {
    assert.match(
      receipt.lineage[key],
      key.endsWith("Sha256") ? /^sha256:[0-9a-f]{64}$/u : /^[0-9a-f]{40}$/u,
      `invalid receipt lineage binding: ${key}`,
    );
  }
  for (const key of RECEIPT_ARTIFACT_KEYS.filter((value) => value.endsWith("Sha256"))) {
    assert.match(receipt.artifacts[key], /^sha256:[0-9a-f]{64}$/u, `invalid receipt artifact hash: ${key}`);
  }
  assert.match(receipt.consumedGrantSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.notEqual(receipt.consumedGrantSha256, `sha256:${"0".repeat(64)}`);
}

function assertReceiptEffectBounds(effects: Readonly<Record<string, any>>): void {
  for (const key of RECEIPT_EFFECT_KEYS) {
    if ([
      "dockerCallCounts", "connectionTargetCounts", "distinctDomainActionAttemptSetSha256",
      "distinctDomainActionSetSha256",
    ].includes(key)) continue;
    assertNonnegativeSafeInteger(effects[key], `effects.${key}`);
  }
  for (const [key, value] of Object.entries(effects.dockerCallCounts)) {
    assertNonnegativeSafeInteger(value, `effects.dockerCallCounts.${key}`);
    assert.ok(Number(value) <= LOCAL_POSTGRES_V3_CEILINGS.dockerCalls[key as keyof typeof LOCAL_POSTGRES_V3_CEILINGS.dockerCalls]);
  }
  for (const [key, value] of Object.entries(effects.connectionTargetCounts)) {
    assertNonnegativeSafeInteger(value, `effects.connectionTargetCounts.${key}`);
  }
  for (const [attempt, completed] of [
    ["poolConstructionAttemptCount", "poolConstructionCount"],
    ["databaseIdentityAttemptCount", "databaseIdentityCount"],
    ["schemaApplyAttemptCount", "schemaApplyCount"],
    ["verifyAttemptCount", "verifyCount"],
    ["rollbackAttemptCount", "rollbackCount"],
    ["domainActionInvocationAttemptCount", "domainActionInvocationCount"],
    ["distinctDomainActionAttemptCount", "distinctDomainActionCount"],
    ["containerRestartAttemptCount", "containerRestartCount"],
  ] as const) assert.ok(effects[attempt] >= effects[completed], `${attempt} must cover ${completed}`);
  assert.ok(effects.initialReadinessAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumInitialReadinessAttempts);
  assert.ok(effects.restartReadinessAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumRestartReadinessAttempts);
  assert.ok(effects.poolConstructionAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumTotalPoolConstructions);
  assert.ok(effects.connectionAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumTotalConnectionAttempts);
  assert.ok(effects.databaseIdentityAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumCreatedDatabaseIdentities);
  assert.ok(effects.schemaApplyAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumSchemaApplies);
  assert.ok(effects.verifyAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumVerifies);
  assert.ok(effects.rollbackAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumRollbacks);
  assert.ok(effects.domainActionInvocationAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumDomainActionInvocations);
  assert.ok(effects.distinctDomainActionAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumDistinctDomainActions);
  assert.ok(effects.containerRestartAttemptCount <= LOCAL_POSTGRES_V3_CEILINGS.maximumContainerRestarts);
  assert.ok(effects.connectionTargetCounts.admin <= LOCAL_POSTGRES_V3_CEILINGS.maximumAdminCreateDatabaseStatements);
  assert.ok(effects.maximumObservedConcurrentPools <= LOCAL_POSTGRES_V3_CEILINGS.maximumConcurrentPools);
  assert.ok(effects.maximumObservedConcurrentClients <= LOCAL_POSTGRES_V3_CEILINGS.maximumConcurrentClients);
  assert.ok(effects.maximumObservedConcurrentTransactions <= LOCAL_POSTGRES_V3_CEILINGS.maximumConcurrentTransactions);
}

function expectedObservationHost(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return {
    dockerCliIdentitySha256: FAKE_DOCKER_CLI_IDENTITY_SHA256,
    dockerClientVersion: "29.3.1",
    dockerServerVersion: "29.3.1",
    dockerServerPlatform: IMAGE_PLATFORM,
    socketIdentitySha256: FAKE_SOCKET_IDENTITY_SHA256,
    imageReference: "NOT_OBSERVED",
    imagePlatform: "NOT_OBSERVED",
    imagePlatformManifest: "NOT_OBSERVED",
    imagePullAttempted: false,
    imagePullOutcome: "NOT_REACHED",
    imageCacheOutcome: "NOT_OBSERVED",
    postgresServerVersionNum: "NOT_OBSERVED",
    ...overrides,
  };
}

function assertFailedObservationEnvelope(
  result: Readonly<Record<string, any>>,
  code: string,
  targetPostgresObserved = false,
): void {
  assert.equal(result.status, "FAILED");
  assert.notEqual(result.status, "GREEN");
  assert.equal(result.code, code);
  assert.equal(result.firstFailureCode, code);
  assert.equal(result.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.residueCount, 0);
  assert.deepEqual(result.transientLocalResidues, []);
  assert.equal(result.openSyntheticPoolCount, 0);
  assert.equal(result.openSyntheticGraphCount, 0);
  assert.deepEqual(result.uniqueActions, []);
  assertClosedReceiptShape(result.receipt);
  assertReceiptBindings(result.receipt);
  assertReceiptEffectBounds(result.receipt.effects);
  assert.equal(result.receipt.status, "FAILED");
  assert.equal(result.receipt.code, code);
  assert.equal(result.receipt.cleanupStatus, "PROVEN_ABSENT");
  assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.cleanup)), ZERO_RESIDUE_CLEANUP);
  assert.equal(result.receipt.effects.domainActionInvocationAttemptCount, 0);
  assert.equal(result.receipt.effects.domainActionInvocationCount, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.readiness)), {
    targetPostgresObserved,
    productRuntimeEffects: false,
    trafficReady: false,
    gateCReady: false,
  });
}

function grant(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  const fixed = LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY;
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v3",
    grantId: "0123456789abcdef0123456789abcdef",
    ownerApprovalReceiptSha256: SHA,
    authority: Object.freeze({
      ...fixed.authority,
      executionCardSha256: SHA,
      executionReviewSha256: SHA,
      executionAuthorityPayloadSha256: SHA,
    }),
    lineage: Object.freeze({
      ...fixed.lineage,
      rebindImplementationHead: GIT,
      rebindImplementationTree: GIT,
      rebindImplementationArtifactAggregateSha256: SHA,
      rebindEvidenceHead: GIT,
      rebindEvidenceTree: GIT,
      rebindStatusHead: GIT,
      rebindStatusTree: GIT,
      executionCardHead: GIT,
      executionCardTree: GIT,
      executionReviewHead: GIT,
      executionReviewTree: GIT,
    }),
    artifacts: Object.freeze({
      physicalRebindArtifactIndexSha256: SHA,
      physicalRebindEvidenceSchemaSha256: SHA,
      physicalRebindEvidenceSha256: SHA,
      physicalRebindReportSha256: SHA,
      rebindStatusCommittedAuditSummarySha256: SHA,
      ...fixed.artifacts,
      runnerSha256: SHA,
      runnerTestSha256: SHA,
    }),
    host: Object.freeze({
      ...fixed.host,
      dockerCliIdentitySha256: SHA,
      socketIdentitySha256: SHA,
    }),
    ceilings: LOCAL_POSTGRES_V3_CEILINGS,
    localOnly: true,
    productionEffectsAllowed: false,
    createdAt: "2026-08-11T17:00:00.000Z",
    expiresAt: "2026-08-11T19:00:00.000Z",
    ...overrides,
  });
}

function mutateGrant(pathSegments: readonly string[], value: unknown, remove = false): Readonly<Record<string, unknown>> {
  const candidate = JSON.parse(JSON.stringify(grant())) as Record<string, unknown>;
  let target = candidate;
  for (const segment of pathSegments.slice(0, -1)) target = target[segment] as Record<string, unknown>;
  const leaf = pathSegments.at(-1);
  assert.ok(leaf);
  if (remove) delete target[leaf];
  else target[leaf] = value;
  return candidate;
}

function runnerError(code?: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof LocalPostgresRunnerError
    && (code === undefined || (error as Error).message === code);
}

async function privateRoot(): Promise<string> {
  const value = await mkdtemp(path.join(os.tmpdir(), "forme-r4-local-pg-test-"));
  await chmod(value, 0o700);
  return realpath(value);
}

function gitText(arguments_: readonly string[]): string {
  return execFileSync("/usr/bin/git", [
    "--no-optional-locks",
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "diff.external=",
    "-c", "submodule.recurse=false",
    ...arguments_,
  ], {
    cwd: path.resolve("."),
    encoding: "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/var/empty",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
      NODE_ENV: "test",
    },
  }).trimEnd();
}

function gitBytes(arguments_: readonly string[]): Buffer {
  return execFileSync("/usr/bin/git", [
    "--no-optional-locks",
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "diff.external=",
    "-c", "submodule.recurse=false",
    ...arguments_,
  ], {
    cwd: path.resolve("."),
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/var/empty",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
      NODE_ENV: "test",
    },
  });
}

function assertHistoricalAuthorityStep(input: Readonly<{
  head: string;
  parent: string;
  tree: string;
  status: "A" | "M";
  artifactPath: string;
  artifactSha256: string;
}>): void {
  assert.equal(gitText(["rev-parse", `${input.head}^{commit}`]), input.head);
  assert.equal(gitText(["rev-parse", `${input.head}^`]), input.parent);
  assert.equal(gitText(["rev-parse", `${input.head}^{tree}`]), input.tree);
  assert.equal(
    gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", input.head]),
    `${input.status}\t${input.artifactPath}`,
  );
  const bytes = gitBytes(["show", `${input.head}:${input.artifactPath}`]);
  assert.equal(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, input.artifactSha256);
}

test("successor runner freezes J/G19, S/G9, P/W and the exact 19-path baseline", () => {
  assert.deepEqual(LOCAL_POSTGRES_STAGE_A_PATHS, [
    "apps/room/package.json",
    "apps/room/src/public-core-application.ts",
    "apps/room/src/public-core-crypto.ts",
    "apps/room/src/public-core-pg-executor.ts",
    "apps/room/src/public-core-postgres-application-store.ts",
    "apps/room/src/public-core-postgres.ts",
    "package-lock.json",
    "schemas/r4/public-core/rollback.sql",
    "schemas/r4/public-core/schema.sql",
    "schemas/r4/public-core/verify.sql",
    "scripts/r4-public-core-local-postgres.mjs",
    "test/r4-gate-b-core/macos-core-adapter.test.ts",
    "test/r4-gate-b-core/physical-runner.test.ts",
    "test/r4/public-core-application.test.ts",
    "test/r4/public-core-local-postgres.test.ts",
    "test/r4/public-core-pg-executor.test.ts",
    "test/r4/public-core-postgres-application-store.test.ts",
    "test/r4/public-core-postgres.test.ts",
    "test/r4/public-core-privacy.test.ts",
  ]);
  assert.deepEqual(
    [...LOCAL_POSTGRES_STAGE_A_PATHS].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))),
    [...LOCAL_POSTGRES_STAGE_A_PATHS],
  );
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.tables, 14);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.columns, 207);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.constraints, 172);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog.indexes, 44);
  assert.match(LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureFileCount, 145);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageAHead, "bc0b52023bb19d4e41fc4daa4a1e232961e1a19b");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageATree, "d5cb758467d06bfd7f17b6ae6a34664e659e1e3d");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageAArtifactAggregateSha256, "sha256:d25ebe21a75be81371209699f072dc404947b3f2f7fb6a69c12c5c2d71d5e417");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageBHead, "2b49f6ad939993b9ff6a106fab327529a40fa20d");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageBTree, "b40e967965d9d8878e21f2b5deff5df7aceed7f7");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.stageBArtifactAggregateSha256, "sha256:cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindPacketHead, "697334c169c9ec69d44ecb38529d7108839f886b");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindPacketTree, "71c6b4197eed649814276a4536b6a40690eefd05");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindReviewHead, "1d9d8ec7d419c90777295099d794ff04f8f476ce");
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindReviewTree, "257cc30066e669a456916033d5664fc135b7da3c");
  assert.ok(LOCAL_POSTGRES_STAGE_A_PATHS.includes("test/r4-gate-b-core/macos-core-adapter.test.ts"));
  assert.ok(LOCAL_POSTGRES_STAGE_A_PATHS.includes("test/r4-gate-b-core/physical-runner.test.ts"));
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.phase1DockerCalls, 0);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.phase1PostgresConnections, 0);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.physicalRebindRequired, true);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.trafficReady, false);
  assert.equal(LOCAL_POSTGRES_PHASE1_AUTHORITY.gateCReady, false);
  assert.deepEqual(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.catalog, CATALOG);
  assert.equal(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.schemaSqlSha256, "sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8");
  assert.equal(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.verifySqlSha256, "sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd");
  assert.equal(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.rollbackSqlSha256, "sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4");
  assert.deepEqual(LOCAL_POSTGRES_V3_CEILINGS, {
    maximumConstructionLifecycles: 1,
    maximumCleanupRecoveryLifecycles: 2,
    maximumDockerLifecycles: 3,
    maximumImagePullAttempts: 1,
    maximumCreatedDatabaseIdentities: 2,
    maximumConcurrentPools: 1,
    maximumConcurrentClients: 1,
    maximumConcurrentTransactions: 1,
    maximumInitialReadinessAttempts: 60,
    maximumRestartReadinessAttempts: 60,
    maximumOperationalPoolConstructions: 4,
    maximumTotalPoolConstructions: 124,
    maximumTotalConnectionAttempts: 124,
    maximumSchemaApplies: 3,
    maximumVerifies: 3,
    maximumRollbacks: 1,
    maximumDomainActionInvocations: 23,
    maximumDistinctDomainActions: 20,
    maximumContainerRestarts: 1,
    maximumAdminCreateDatabaseStatements: 1,
    dockerCalls: {
      version: 3,
      "image.inspect": 2,
      "image.pull": 1,
      "container.inspect": 8,
      "container.create": 1,
      "container.start": 2,
      "container.stop": 4,
      "container.rm": 3,
      "network.inspect": 7,
      "network.create": 1,
      "network.rm": 3,
      "volume.inspect": 7,
      "volume.create": 1,
      "volume.rm": 3,
    },
  });
});

test("historical wiring and Addenda B/C authority close through every exact single commit step", () => {
  const wiringProposal = "fd3abebec02a762d3e318ddba4415389dfd625a6";
  const wiringReview = "c878a5a534868482672838d39290e3f12e9d3b7f";
  const addendumBInitialProposal = "3c529753ea36bc73269ec31aa5c63cd03f69ef2f";
  const addendumBProposal = "4313bd94e2a81761b4b25824b5eb82aa6396b6be";
  const addendumBReview = "1db7b30f38ca6322a3b0ad4be6d537af9cf781e8";
  const addendumCProposal = "ba61f7434071b759195fd3389b84092b96f3bb0c";
  const addendumCReview = "deb12a045f5d84281bc9da0f110e049748949970";

  assertHistoricalAuthorityStep({
    head: wiringProposal,
    parent: "c831b4d5253049c4581d3c576aea59648d699d97",
    tree: "9f2c226d0e12d6c5747ec3b693c6ac51c7bb2b27",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-PACKET.md",
    artifactSha256: "sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258",
  });
  assertHistoricalAuthorityStep({
    head: wiringReview,
    parent: wiringProposal,
    tree: "d917fb7d2c9ade9b2d8acae5f5e7d4893e0c84c5",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-OWNER-REVIEW.md",
    artifactSha256: "sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca",
  });

  assertHistoricalAuthorityStep({
    head: addendumBInitialProposal,
    parent: wiringReview,
    tree: "dcffbc68b4a34380ca8b135d94c8bd46064f7f1b",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-B.md",
    artifactSha256: "sha256:9f1f22456e3ae8dc666880000578d8a432f5617db7780dd41a0edae7ccf7d9b1",
  });
  assertHistoricalAuthorityStep({
    head: addendumBProposal,
    parent: addendumBInitialProposal,
    tree: "67233cc1ff81ec5c73b15cfcaa44fb9424d35d83",
    status: "M",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-B.md",
    artifactSha256: "sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f",
  });
  assert.notEqual(gitText(["rev-parse", `${addendumBProposal}^`]), wiringReview);
  assertHistoricalAuthorityStep({
    head: addendumBReview,
    parent: addendumBProposal,
    tree: "1270bbc9beae9c446c83bbfc220e5906800890e3",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-B-OWNER-REVIEW.md",
    artifactSha256: "sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2",
  });

  assertHistoricalAuthorityStep({
    head: addendumCProposal,
    parent: addendumBReview,
    tree: "091258d78908a1a2e99542e1a5b835e84b5d3512",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-C.md",
    artifactSha256: "sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d",
  });
  assertHistoricalAuthorityStep({
    head: addendumCReview,
    parent: addendumCProposal,
    tree: "4b9028a942d4ac436527586aee64fbc23ec3488d",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-C-OWNER-REVIEW.md",
    artifactSha256: "sha256:2aaa4d1243e2813b4030a37bae2cd7f14b41ca29c3814f4bce70c4c0161f65b7",
  });
});

test("future physical engine is fully constructed but ordinary test entry remains fake-only", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  assert.equal(source.includes("local_postgres_physical_engine_not_frozen"), false);
  assert.match(source, /if \(parsed\.mode === "fake"\)/u);
  assert.match(source, /consumeLocalPostgresGrant/u);
  assert.match(source, /performNormalPhysicalRun/u);
  assert.match(source, /cleanupOwnedDocker/u);
  assert.equal((source.match(/spawnSync\(DOCKER_CLI/gu) ?? []).length, 1);
  const hardlinkSites = source.match(/fs\.linkSync\([^\n]+/gu) ?? [];
  assert.deepEqual(hardlinkSites.map((site) => (
    site.includes("receipt-link") ? "fake_receipt_hardlink_mutation" : site.includes("pending, consumed") ? "grant_consume" : "unknown"
  )), ["fake_receipt_hardlink_mutation", "grant_consume"]);
  assert.equal(source.includes("coordinator.active.json"), false);
  assert.equal(source.includes("coordinator.claim.json"), false);
  assert.equal(source.includes("process.kill("), false, "PID-only liveness cannot authorize takeover");
  assert.match(source, /\/proc\/sys\/kernel\/random\/boot_id/u);
  assert.match(source, /physical-evidence-draft-p/u);
  assert.match(source, /r4\.public-core-local-postgres-grant\.v3/u);
  assert.match(source, /r4\.public-core-local-postgres-physical-result\.v3/u);
  assert.match(source, /journal-v3/u);
  assert.match(source, /JOURNAL_MAXIMUM_ENTRIES = 1024/u);
  assert.match(source, /SHOW server_version_num/u);
  assert.match(source, /COMPLETE_PINNED_IMAGE_CACHE_MAY_REMAIN_PARTIAL_OR_UNKNOWN_BLOCKS_GREEN/u);
  for (const runtimePath of TRANSITIVE_RUNTIME_PATHS) assert.ok(source.includes(`"${runtimePath}"`), runtimePath);
  assert.match(source, /runGit\(\["ls-files", "-v", "--", \.\.\.boundPaths\]\)/u);
  assert.match(source, /flags\.some\(\(line\) => !\/\^H \/u\.test\(line\)\)/u);
  assert.match(source, /runGit\(\["diff", "--cached", "--quiet", "--exit-code"\]\)/u);
  assert.match(source, /runGit\(\["status", "--porcelain=v1", "--untracked-files=no"\]\)/u);
  assert.match(source, /GIT_NO_LAZY_FETCH: "1"/u);
  assert.match(source, /GIT_OPTIONAL_LOCKS: "0"/u);
  assert.match(source, /GIT_NO_REPLACE_OBJECTS: "1"/u);
  assert.equal(Buffer.byteLength(`${DOMAIN_ACTIONS.join("\n")}\n`, "utf8"), 379);
  assert.equal(DOMAIN_ACTION_SET_SHA256, "sha256:3c4ecb0ee9cc4133c4b31abf638fc1648d29a1f715018d2925a43cf11698a21c");
  assert.ok(source.includes(DOMAIN_ACTION_SET_SHA256));
  assert.equal(source.includes('JOURNAL_DIRECTORY = "journal-v2"'), false);
  assert.equal(source.includes("maximumPhysicalAttempts"), false);
  assert.equal(source.includes("stageAPathCount: 17"), false);
  assert.equal(source.includes("r4.public-core-local-postgres-grant.v2"), false);
  assert.equal(source.includes("r4.public-core-local-postgres-physical-result.v2"), false);
  for (const denied of ["container\", \"run", "container\", \"exec", "image\", \"build", "system\", \"prune"]) {
    assert.equal(source.includes(denied), false);
  }
});

test("missing-anchor repair validates the complete pending journal before removing the consumed hardlink", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  const start = source.indexOf("function repairMissingConsumedJournalAnchor(");
  const end = source.indexOf("\nfunction exactPhysicalEvidencePath(", start);
  assert.ok(start >= 0 && end > start);
  const repair = source.slice(start, end);
  const canonicalPendingValidation = repair.indexOf(
    "canonicalJson(readPrivateJson(journalPendingPath)) !== canonicalJson(expectedEntry)",
  );
  const finalAbsenceValidation = repair.indexOf("exactFileAbsence(finalPath)");
  const pendingHardlinkRemoval = repair.indexOf("fs.unlinkSync(pendingPath)");
  const pendingJournalInstall = repair.indexOf("fs.renameSync(pendingJournalInstall.pendingPath");
  assert.ok(canonicalPendingValidation >= 0);
  assert.ok(finalAbsenceValidation > canonicalPendingValidation);
  assert.ok(pendingHardlinkRemoval > finalAbsenceValidation);
  assert.ok(pendingJournalInstall > pendingHardlinkRemoval);
  assert.equal((repair.match(/fs\.unlinkSync\(pendingPath\)/gu) ?? []).length, 1);
  assert.match(repair, /pendingStat\.dev !== consumedStat\.dev/u);
  assert.match(repair, /pendingStat\.ino !== consumedStat\.ino/u);
  assert.match(repair, /pendingStat\.nlink !== 2n \|\| consumedStat\.nlink !== 2n/u);
});

test("v3 grant membrane has exact nested keys and rejects every obsolete authority shape", () => {
  const accepted = validateLocalPostgresGrant(grant(), new Date(NOW));
  assert.equal(accepted.grantId, "0123456789abcdef0123456789abcdef");
  assert.deepEqual(Object.keys(accepted).sort(), [
    "artifacts", "authority", "ceilings", "createdAt", "expiresAt", "grantId", "host", "lineage",
    "localOnly", "ownerApprovalReceiptSha256", "productionEffectsAllowed", "schemaVersion",
  ]);
  assert.throws(
    () => validateLocalPostgresGrant(grant({ unexpected: true }), new Date(NOW)),
    runnerError("local_postgres_input_invalid"),
  );
  for (const key of Object.keys(grant())) {
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant([key], undefined, true), new Date(NOW)),
      LocalPostgresRunnerError,
      `top-level missing key ${key}`,
    );
  }
  for (const section of ["authority", "lineage", "artifacts", "host", "ceilings"] as const) {
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant([section, "unexpected"], true), new Date(NOW)),
      runnerError("local_postgres_input_invalid"),
      `${section} rejects extra keys`,
    );
    const sectionValue = grant()[section];
    assert.ok(sectionValue !== null && typeof sectionValue === "object");
    for (const key of Object.keys(sectionValue)) {
      assert.throws(
        () => validateLocalPostgresGrant(mutateGrant([section, key], undefined, true), new Date(NOW)),
        LocalPostgresRunnerError,
        `${section} missing key ${key}`,
      );
    }
  }
  for (const key of Object.keys(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority)) {
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["authority", key], `sha256:${"f".repeat(64)}`), new Date(NOW)),
      LocalPostgresRunnerError,
      `fixed authority drift ${key}`,
    );
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage)) {
    const drift = key.endsWith("Sha256") ? `sha256:${"f".repeat(64)}` : "f".repeat(40);
    assert.notEqual(drift, value);
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["lineage", key], drift), new Date(NOW)),
      LocalPostgresRunnerError,
      `fixed lineage drift ${key}`,
    );
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts)) {
    if (key === "catalog") continue;
    const drift = typeof value === "number" ? value + 1 : `sha256:${"f".repeat(64)}`;
    assert.notEqual(drift, value);
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["artifacts", key], drift), new Date(NOW)),
      LocalPostgresRunnerError,
      `fixed artifact drift ${key}`,
    );
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.host)) {
    const drift = key.endsWith("Sha256") ? `sha256:${"f".repeat(64)}` : `wrong-${String(value)}`;
    assert.notEqual(drift, value);
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["host", key], drift), new Date(NOW)),
      LocalPostgresRunnerError,
      `fixed host drift ${key}`,
    );
  }
  for (const nested of [["artifacts", "catalog"], ["ceilings", "dockerCalls"]] as const) {
    const sectionValue = grant()[nested[0]];
    assert.ok(sectionValue !== null && typeof sectionValue === "object");
    const value = (sectionValue as Record<string, unknown>)[nested[1]];
    assert.ok(value !== null && typeof value === "object");
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant([...nested, "unexpected"], 1), new Date(NOW)),
      runnerError("local_postgres_input_invalid"),
    );
    for (const key of Object.keys(value)) {
      assert.throws(
        () => validateLocalPostgresGrant(mutateGrant([...nested, key], undefined, true), new Date(NOW)),
        LocalPostgresRunnerError,
        `${nested.join(".")} missing key ${key}`,
      );
    }
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_V3_CEILINGS)) {
    if (key === "dockerCalls") continue;
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["ceilings", key], (value as number) + 1), new Date(NOW)),
      LocalPostgresRunnerError,
      `ceiling drift ${key}`,
    );
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_V3_CEILINGS.dockerCalls)) {
    assert.equal(typeof value, "number");
    assert.throws(
      () => validateLocalPostgresGrant(mutateGrant(["ceilings", "dockerCalls", key], Number(value) + 1), new Date(NOW)),
      LocalPostgresRunnerError,
      `Docker ceiling drift ${key}`,
    );
  }
  assert.throws(
    () => validateLocalPostgresGrant(mutateGrant(
      ["artifacts", "schemaSqlSha256"],
      "sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2",
    ), new Date(NOW)),
    LocalPostgresRunnerError,
  );
  for (const legacy of [
    { ...grant(), schemaVersion: "r4.public-core-local-postgres-grant.v2" },
    { ...grant(), maximumPhysicalAttempts: 1 },
    mutateGrant(["artifacts", "catalog", "columns"], 206),
    mutateGrant(["artifacts", "catalog", "constraints"], 171),
    mutateGrant(["ceilings", "maximumConstructionLifecycles"], 2),
    mutateGrant(["ceilings", "maximumDockerLifecycles"], 4),
    mutateGrant(["ceilings", "dockerCalls", "container.inspect"], 9),
    mutateGrant(["artifacts", "packageLockSha256"], "sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812"),
    mutateGrant(["lineage", "stageAArtifactAggregateSha256"], `sha256:${"1".repeat(64)}`),
    mutateGrant(["lineage", "stageAHead"], LOCAL_POSTGRES_PHASE1_AUTHORITY.addendumWrapperHead),
  ]) assert.throws(() => validateLocalPostgresGrant(legacy, new Date(NOW)), LocalPostgresRunnerError);
  const canary = "PRIVATE_GRANT_GETTER_CANARY";
  const hostile = new Proxy(grant(), { ownKeys() { throw new Error(canary); } });
  assert.throws(
    () => validateLocalPostgresGrant(hostile, new Date(NOW)),
    (error: unknown) => error instanceof LocalPostgresRunnerError
      && (error as Error).message === "local_postgres_input_invalid"
      && !JSON.stringify(error).includes(canary),
  );
  const nestedHostile = mutateGrant(["host"], new Proxy(grant().host as object, {
    ownKeys() { throw new Error(canary); },
  }));
  assert.throws(
    () => validateLocalPostgresGrant(nestedHostile, new Date(NOW)),
    (error: unknown) => error instanceof LocalPostgresRunnerError
      && (error as Error).message === "local_postgres_input_invalid"
      && !JSON.stringify(error).includes(canary),
  );
});

test("v3 grant rejects malformed scalar fields and enforces its exact clock window", () => {
  for (const candidate of [
    grant({ grantId: "A".repeat(32) }),
    grant({ ownerApprovalReceiptSha256: "sha256:ABC" }),
    grant({ localOnly: false }),
    grant({ productionEffectsAllowed: true }),
    mutateGrant(["lineage", "executionReviewHead"], "b".repeat(39)),
    mutateGrant(["artifacts", "pgImportClosureFileCount"], "145"),
    mutateGrant(["host", "dockerClientVersion"], 29.31),
    mutateGrant(["ceilings", "maximumTotalConnectionAttempts"], "124"),
    grant({ createdAt: "2026-08-11T17:00:00Z" }),
    grant({ expiresAt: "2026-08-11T17:00:00.000Z" }),
    grant({ expiresAt: "2026-08-12T17:00:00.001Z" }),
  ]) assert.throws(() => validateLocalPostgresGrant(candidate, new Date(NOW)), LocalPostgresRunnerError);

  assert.doesNotThrow(() => validateLocalPostgresGrant(grant({
    createdAt: "2026-08-11T18:01:00.000Z",
    expiresAt: "2026-08-12T18:01:00.000Z",
  }), new Date(NOW)));
  assert.throws(
    () => validateLocalPostgresGrant(grant(), new Date("2026-08-11T19:00:00.000Z")),
    runnerError("local_postgres_grant_expired"),
  );
});

test("the obsolete raw pending-grant writer is permanently fail-closed", () => {
  assert.throws(
    () => createLocalPostgresPendingGrant({ privateRoot: "/private/obsolete", grant: grant() }),
    runnerError("local_postgres_obsolete_grant_api"),
  );
});

test("fake prepare constructs the exact two-entry v3 pending grant with zero physical effect", () => {
  const prepared = runLocalPostgresPrepareFakePlan();
  assert.deepEqual(Object.keys(prepared).sort(), ["grant", "physicalEffects", "receipt", "rootEntries", "schemaVersion", "status"]);
  assert.equal(prepared.schemaVersion, "r4.public-core-local-postgres-prepare-fake-result.v1");
  assert.equal(prepared.status, "GREEN");
  assert.equal(prepared.physicalEffects, 0);
  assert.deepEqual(prepared.rootEntries, ["grant.pending.json", "owner-approval-receipt"]);
  assert.deepEqual(Object.keys(prepared.receipt).sort(), [
    "executionAuthorityPayloadSha256", "observedAt", "ownerApprovalReceiptSha256", "pendingGrantSha256", "schemaVersion",
  ]);
  assert.equal(prepared.receipt.schemaVersion, "r4.public-core-local-postgres-prepare-receipt.v1");
  assert.equal(prepared.grant.schemaVersion, "r4.public-core-local-postgres-grant.v3");
  assert.equal(prepared.grant.ownerApprovalReceiptSha256, prepared.receipt.ownerApprovalReceiptSha256);
  assert.equal(prepared.grant.authority.executionAuthorityPayloadSha256, prepared.receipt.executionAuthorityPayloadSha256);
  assert.equal(prepared.grant.host.dockerCliIdentitySha256.startsWith("sha256:"), true);
  assert.equal(prepared.grant.host.socketIdentitySha256.startsWith("sha256:"), true);
  assert.deepEqual(JSON.parse(JSON.stringify(prepared.grant.ceilings)), LOCAL_POSTGRES_V3_CEILINGS);
  assert.equal(
    prepared.receipt.pendingGrantSha256,
    `sha256:${createHash("sha256").update(Buffer.from(`${canonicalTestJson(prepared.grant)}\n`, "utf8")).digest("hex")}`,
    "prepare receipt digest is derived from the exact canonical bytes installed through the owned inode",
  );
  assert.equal(JSON.stringify(prepared).includes("R4 #67 local physical execution approved"), false);
});

test("every pending O_EXCL writer failure removes its exact partial inode and retains only owner approval", () => {
  const mutations = [
    "pending_open_failure",
    "pending_write_failure",
    "pending_file_fsync_failure",
    "pending_close_failure",
    "pending_directory_fsync_failure",
  ] as const;
  for (const mutation of mutations) {
    const failed = runLocalPostgresPrepareFakePlan({ mutation });
    assert.deepEqual(Object.keys(failed).sort(), ["code", "physicalEffects", "rootEntries", "schemaVersion", "status"]);
    assert.equal(failed.schemaVersion, "r4.public-core-local-postgres-prepare-fake-result.v1", mutation);
    assert.equal(failed.status, "FAILED", mutation);
    assert.equal(failed.code, "local_postgres_fake_injected_fault", mutation);
    assert.deepEqual(failed.rootEntries, ["owner-approval-receipt"], mutation);
    assert.equal(failed.physicalEffects, 0, mutation);
  }
});

test("post-install root rejection removes only the owned pending inode and proves the foreign residue truthfully", () => {
  const failed = runLocalPostgresPrepareFakePlan({ mutation: "pending_post_install_root_failure" });
  assert.deepEqual(Object.keys(failed).sort(), ["code", "physicalEffects", "rootEntries", "schemaVersion", "status"]);
  assert.equal(failed.schemaVersion, "r4.public-core-local-postgres-prepare-fake-result.v1");
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_private_root_invalid");
  assert.deepEqual(failed.rootEntries, ["owner-approval-receipt", "unknown"]);
  assert.equal(failed.rootEntries.includes("grant.pending.json"), false);
  assert.equal(failed.physicalEffects, 0);
});

test("pending cleanup failure reports its hard failure and never fabricates pending absence", () => {
  const failed = runLocalPostgresPrepareFakePlan({ mutation: "pending_cleanup_failure" });
  assert.deepEqual(Object.keys(failed).sort(), ["code", "physicalEffects", "rootEntries", "schemaVersion", "status"]);
  assert.equal(failed.schemaVersion, "r4.public-core-local-postgres-prepare-fake-result.v1");
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_private_file_invalid");
  assert.deepEqual(failed.rootEntries, ["grant.pending.json", "owner-approval-receipt", "unknown"]);
  assert.equal(failed.rootEntries.includes("grant.pending.json"), true);
  assert.equal(failed.physicalEffects, 0);
});

test("fake prepare rejects private-root, receipt, Card, clock and topology mutations before pending publication", () => {
  const mutations = [
    "root_mode", "receipt_mode", "receipt_symlink", "receipt_hardlink", "receipt_trailing_lf",
    "receipt_nul", "receipt_non_nfc", "unknown_entry", "card_duplicate", "card_noncanonical",
    "card_begin_prefix", "card_end_suffix", "clock_expired", "topology_drift",
  ] as const;
  for (const mutation of mutations) {
    assert.throws(
      () => runLocalPostgresPrepareFakePlan({ mutation }),
      LocalPostgresRunnerError,
      mutation,
    );
  }
  assert.throws(() => runLocalPostgresPrepareFakePlan({ mutation: "not-approved" }), runnerError("local_postgres_fake_fault_invalid"));
  assert.throws(() => runLocalPostgresPrepareFakePlan({ unexpected: true }), runnerError("local_postgres_input_invalid"));
});

test("real prepare API exposes only the exact five Packet arguments and fails before host observation on hostile input", () => {
  assert.equal(prepareLocalPostgresPendingGrantV3.length, 1);
  assert.throws(
    () => prepareLocalPostgresPendingGrantV3({
      privateRoot: "relative",
      executionReviewHead: GIT,
      ownerApprovalReceiptPath: "/private/owner-approval-receipt",
      createdAt: NOW,
      expiresAt: "2026-08-11T19:00:00.000Z",
    }),
    LocalPostgresRunnerError,
  );
});

test("Docker plan is a closed exact-name surface with loopback-only random publication", () => {
  const grantId = "0123456789abcdef0123456789abcdef";
  const secretMountSource = "/private/run/password";
  const resources = deriveLocalPostgresResourceNames(grantId);
  const plan = buildLocalPostgresDockerPlan({ grantId, secretMountSource });
  assert.equal(plan.resources.container, resources.container);
  assert.equal(plan.resources.labelValue, grantId);
  assert.equal(plan.schemaVersion, "r4.public-core-local-postgres-docker-plan.v2");
  assert.deepEqual((plan.steps as readonly Readonly<{ order: number; kind: string }>[]).map(({ order, kind }) => ({ order, kind })), [
    { order: 1, kind: "version" },
    { order: 2, kind: "image.inspect" },
    { order: 3, kind: "image.pull" },
    { order: 4, kind: "network.inspect" },
    { order: 5, kind: "network.create" },
    { order: 6, kind: "volume.inspect" },
    { order: 7, kind: "volume.create" },
    { order: 8, kind: "container.inspect" },
    { order: 9, kind: "container.create" },
    { order: 10, kind: "container.start" },
    { order: 11, kind: "container.stop" },
    { order: 12, kind: "container.rm" },
    { order: 13, kind: "network.rm" },
    { order: 14, kind: "volume.rm" },
  ]);
  for (const step of plan.steps as readonly Readonly<{ kind: string; argv: readonly string[] }>[]) {
    assert.ok(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(step.kind as never));
    const text = step.argv.join(" ");
    for (const forbidden of [" run ", " exec ", " logs ", " login ", " context ", " prune "]) {
      assert.equal(` ${text} `.includes(forbidden), false);
    }
  }
  const create = (plan.steps as readonly Readonly<{ kind: string; argv: readonly string[] }>[])
    .find((step) => step.kind === "container.create");
  assert.ok(create);
  assert.ok(create.argv.includes("127.0.0.1::5432"));
  assert.equal(create.argv.some((value) => value.startsWith("POSTGRES_PASSWORD=")), false);
  assert.ok(create.argv.some((value) => value === "POSTGRES_PASSWORD_FILE=/run/secrets/forme-r4-postgres-password"));
  const allArguments = (plan.steps as readonly Readonly<{ argv: readonly string[] }>[]).flatMap((step) => step.argv);
  assert.deepEqual(
    allArguments.filter((value) => value.includes(secretMountSource)),
    [`type=bind,src=${secretMountSource},dst=/run/secrets/forme-r4-postgres-password,readonly`],
    "the private password source appears once and only as the read-only bind source",
  );
  assert.throws(
    () => buildLocalPostgresDockerPlan({ grantId, secretMountSource: "/private/run/password,ro" }),
    LocalPostgresRunnerError,
  );
});

test("fake-only shared coordinator runs the exact terminal flow with zero physical or local residue", async () => {
  const green = await runLocalPostgresFakePlan();
  assert.equal(green.schemaVersion, "r4.public-core-local-postgres-fake-result.v3");
  assert.equal(green.status, "GREEN");
  assert.equal(green.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(green.actionCount, 20);
  assert.deepEqual(JSON.parse(JSON.stringify(green.catalog)), CATALOG);
  assert.equal(green.databaseIdentityCount, 2);
  assert.equal(green.restartCount, 1);
  assert.equal(green.residueCount, 0);
  assert.deepEqual(green.transientLocalResidues, []);
  assert.equal(green.openSyntheticPoolCount, 0);
  assert.equal(green.openSyntheticGraphCount, 0);
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.syntheticPortCalls.pgDriverResolved, true);
  assertClosedReceiptShape(green.receipt);
  assertReceiptBindings(green.receipt);
  assertReceiptEffectBounds(green.receipt.effects);
  assert.equal(green.receipt.schemaVersion, "r4.public-core-local-postgres-physical-result.v3");
  assert.equal(green.receipt.code, "local_postgres_physical_green");
  assert.equal(green.receipt.priorEvidenceSha256, "NONE");
  assert.deepEqual(Object.keys(green.receipt.coordinator).sort(), ["activeResidueCount", "leaseReleased", "ownerIdentitySha256"]);
  assert.equal(green.receipt.coordinator.leaseReleased, true);
  assert.equal(green.receipt.coordinator.activeResidueCount, 0);
  assert.match(green.receipt.coordinator.ownerIdentitySha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(green.receipt.artifacts.pgImportClosureSha256, LOCAL_POSTGRES_PHASE1_AUTHORITY.pgImportClosureSha256);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.effects.dockerCallCounts)), PULLED_DOCKER_VECTOR);
  assert.equal(green.receipt.hostObservation.imagePullAttempted, true);
  assert.equal(green.receipt.hostObservation.imagePullOutcome, "COMPLETED");
  assert.equal(green.receipt.hostObservation.imageCacheOutcome, "VERIFIED_COMPLETE_PINNED");
  assert.equal(green.receipt.hostObservation.postgresServerVersionNum, 160010);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.targetObservation)), {
    catalogOutcome: "MATCHED",
    ...CATALOG,
    catalogContractSha256: "sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4",
  });
  const effects = green.receipt.effects;
  assert.ok(effects.initialReadinessAttemptCount >= 1 && effects.initialReadinessAttemptCount <= 60);
  assert.ok(effects.restartReadinessAttemptCount >= 1 && effects.restartReadinessAttemptCount <= 60);
  assert.equal(effects.poolConstructionAttemptCount, effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 4);
  assert.equal(effects.poolConstructionCount, effects.poolConstructionAttemptCount);
  assert.equal(effects.connectionAttemptCount, effects.poolConstructionAttemptCount);
  assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), {
    primary: effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 2,
    rollback: 1,
    admin: 1,
  });
  for (const pair of [["databaseIdentity", 2], ["schemaApply", 3], ["verify", 3], ["rollback", 1], ["domainActionInvocation", 23], ["containerRestart", 1]] as const) {
    assert.equal(effects[`${pair[0]}AttemptCount`], pair[1]);
    assert.equal(effects[`${pair[0]}Count`], pair[1]);
  }
  assert.equal(effects.distinctDomainActionAttemptCount, 20);
  assert.equal(effects.distinctDomainActionCount, 20);
  assert.equal(effects.distinctDomainActionAttemptSetSha256, DOMAIN_ACTION_SET_SHA256);
  assert.equal(effects.distinctDomainActionSetSha256, DOMAIN_ACTION_SET_SHA256);
  assert.equal(effects.connectionTargetCounts.admin, 1);
  assert.equal(effects.maximumObservedConcurrentPools, 1);
  assert.equal(effects.maximumObservedConcurrentClients, 1);
  assert.equal(effects.maximumObservedConcurrentTransactions, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.cleanup)), {
    ownedContainerCount: 0,
    ownedNetworkCount: 0,
    ownedVolumeCount: 0,
    ownedCredentialCount: 0,
    ownedDockerConfigCount: 0,
    ownedImportedRuntimeCount: 0,
    activeCoordinatorResidueCount: 0,
    retainedForensicFiles: ["grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json"],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.readiness)), {
    targetPostgresObserved: true,
    productRuntimeEffects: false,
    trafficReady: false,
    gateCReady: false,
  });
  assert.equal(green.realApplicationGraphCompositions, 2);
  assert.equal(green.realApplicationGraphClosures, 2);
  assert.equal(green.realApplicationGraphCanaryConnects, 2);
  assert.equal(green.realApplicationGraphErrorCanaries, 2);
  assert.equal(green.retainedRealApplicationGraphCount, 0);
});

test("cached pinned image takes the exact no-pull Green branch with durable observations", async () => {
  const green = await runLocalPostgresFakePlan({ observationMutation: "image_cached_green" });
  assert.equal(green.status, "GREEN");
  assert.equal(green.code, "local_postgres_physical_green");
  assert.equal(green.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.residueCount, 0);
  assert.deepEqual(green.transientLocalResidues, []);
  assert.equal(green.openSyntheticPoolCount, 0);
  assert.equal(green.openSyntheticGraphCount, 0);
  assertClosedReceiptShape(green.receipt);
  assertReceiptBindings(green.receipt);
  assertReceiptEffectBounds(green.receipt.effects);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.hostObservation)), expectedObservationHost({
    imageReference: IMAGE_REFERENCE,
    imagePlatform: IMAGE_PLATFORM,
    imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
    imagePullAttempted: false,
    imagePullOutcome: "NOT_REQUIRED_CACHED",
    imageCacheOutcome: "VERIFIED_COMPLETE_PINNED",
    postgresServerVersionNum: 160010,
  }));
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.effects.dockerCallCounts)), CACHED_DOCKER_VECTOR);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.targetObservation)), {
    catalogOutcome: "MATCHED",
    ...CATALOG,
    catalogContractSha256: CATALOG_CONTRACT_SHA256,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.cleanup)), ZERO_RESIDUE_CLEANUP);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.readiness)), {
    targetPostgresObserved: true,
    productRuntimeEffects: false,
    trafficReady: false,
    gateCReady: false,
  });
});

test("Docker version observation records each exact mismatch and ambiguity without reaching image or SQL effects", async (t) => {
  const cases = [
    ["docker_client_version_mismatch", { dockerClientVersion: "MISMATCH" }],
    ["docker_server_version_mismatch", { dockerServerVersion: "MISMATCH" }],
    ["docker_platform_mismatch", { dockerServerPlatform: "MISMATCH" }],
    ["docker_client_version_unknown", { dockerClientVersion: "UNKNOWN" }],
    ["docker_server_version_unknown", { dockerServerVersion: "UNKNOWN" }],
    ["docker_platform_unknown", { dockerServerPlatform: "UNKNOWN" }],
    ["docker_version_unknown", {
      dockerClientVersion: "UNKNOWN",
      dockerServerVersion: "UNKNOWN",
      dockerServerPlatform: "UNKNOWN",
    }],
  ] as const;
  for (const [observationMutation, hostOverride] of cases) {
    await t.test(observationMutation, async () => {
      const failed = await runLocalPostgresFakePlan({ observationMutation });
      assertFailedObservationEnvelope(failed, "local_postgres_docker_version_invalid");
      assert.deepEqual(
        JSON.parse(JSON.stringify(failed.receipt.hostObservation)),
        expectedObservationHost(hostOverride),
      );
      assert.deepEqual(JSON.parse(JSON.stringify(failed.receipt.targetObservation)), NOT_OBSERVED_TARGET);
      assert.equal(failed.receipt.effects.schemaApplyAttemptCount, 0);
      assert.equal(failed.receipt.effects.schemaApplyCount, 0);
      assert.equal(failed.receipt.effects.verifyAttemptCount, 0);
      assert.equal(failed.receipt.effects.verifyCount, 0);
    });
  }
});

test("image observation distinguishes cached mismatch, failed or ambiguous pull, and post-pull identity failure", async (t) => {
  const cases = [
    ["image_cached_mismatch", "local_postgres_image_identity_invalid", {
      imageReference: "MISMATCH",
      imagePlatform: IMAGE_PLATFORM,
      imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
      imagePullAttempted: false,
      imagePullOutcome: "NOT_REACHED",
      imageCacheOutcome: "PARTIAL_OR_UNKNOWN",
    }],
    ["image_pull_ambiguous", "local_postgres_docker_call_failed", {
      imageReference: "UNKNOWN",
      imagePlatform: "UNKNOWN",
      imagePlatformManifest: "UNKNOWN",
      imagePullAttempted: true,
      imagePullOutcome: "AMBIGUOUS",
      imageCacheOutcome: "PARTIAL_OR_UNKNOWN",
    }],
    ["image_pull_failed", "local_postgres_docker_call_failed", {
      imageReference: "UNKNOWN",
      imagePlatform: "UNKNOWN",
      imagePlatformManifest: "UNKNOWN",
      imagePullAttempted: true,
      imagePullOutcome: "FAILED",
      imageCacheOutcome: "PARTIAL_OR_UNKNOWN",
    }],
    ["image_post_pull_missing", "local_postgres_image_identity_invalid", {
      imageReference: "UNKNOWN",
      imagePlatform: "UNKNOWN",
      imagePlatformManifest: "UNKNOWN",
      imagePullAttempted: true,
      imagePullOutcome: "COMPLETED",
      imageCacheOutcome: "PARTIAL_OR_UNKNOWN",
    }],
    ["image_post_pull_mismatch", "local_postgres_image_identity_invalid", {
      imageReference: "MISMATCH",
      imagePlatform: IMAGE_PLATFORM,
      imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
      imagePullAttempted: true,
      imagePullOutcome: "COMPLETED",
      imageCacheOutcome: "PARTIAL_OR_UNKNOWN",
    }],
  ] as const;
  for (const [observationMutation, code, hostOverride] of cases) {
    await t.test(observationMutation, async () => {
      const failed = await runLocalPostgresFakePlan({ observationMutation });
      assertFailedObservationEnvelope(failed, code);
      assert.deepEqual(
        JSON.parse(JSON.stringify(failed.receipt.hostObservation)),
        expectedObservationHost(hostOverride),
      );
      assert.deepEqual(JSON.parse(JSON.stringify(failed.receipt.targetObservation)), NOT_OBSERVED_TARGET);
      assert.equal(failed.receipt.effects.schemaApplyAttemptCount, 0);
      assert.equal(failed.receipt.effects.schemaApplyCount, 0);
      assert.equal(failed.receipt.effects.verifyAttemptCount, 0);
      assert.equal(failed.receipt.effects.verifyCount, 0);
    });
  }
});

test("authenticated pull failure and ambiguous raw failure retain distinct durable outcomes", async () => {
  const failed = await runLocalPostgresFakePlan({ observationMutation: "image_pull_failed" });
  const ambiguous = await runLocalPostgresFakePlan({ observationMutation: "image_pull_ambiguous" });
  const exactEarlyPullVector = {
    version: 1,
    "image.inspect": 1,
    "image.pull": 1,
    "container.inspect": 3,
    "container.create": 0,
    "container.start": 0,
    "container.stop": 0,
    "container.rm": 0,
    "network.inspect": 3,
    "network.create": 0,
    "network.rm": 0,
    "volume.inspect": 3,
    "volume.create": 0,
    "volume.rm": 0,
  };
  for (const result of [failed, ambiguous]) {
    assertFailedObservationEnvelope(result, "local_postgres_docker_call_failed");
    assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.effects.dockerCallCounts)), exactEarlyPullVector);
    assert.equal(result.receipt.hostObservation.imagePullAttempted, true);
    assert.equal(result.receipt.hostObservation.imageCacheOutcome, "PARTIAL_OR_UNKNOWN");
    assert.equal(result.receipt.effects.schemaApplyAttemptCount, 0);
    assert.equal(result.receipt.effects.domainActionInvocationAttemptCount, 0);
  }
  assert.equal(failed.receipt.hostObservation.imagePullOutcome, "FAILED");
  assert.equal(failed.receipt.journal.entryCount, 36);
  assert.equal(ambiguous.receipt.hostObservation.imagePullOutcome, "AMBIGUOUS");
  assert.equal(ambiguous.receipt.journal.entryCount, 34);
  assert.notEqual(failed.receipt.journal.headSha256, ambiguous.receipt.journal.headSha256);
});

test("PostgreSQL and catalog observation preserve safe mismatch counts and ambiguous UNKNOWN sentinels", async (t) => {
  const pinnedImageHost = {
    imageReference: IMAGE_REFERENCE,
    imagePlatform: IMAGE_PLATFORM,
    imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
    imagePullAttempted: true,
    imagePullOutcome: "COMPLETED",
    imageCacheOutcome: "VERIFIED_COMPLETE_PINNED",
  } as const;
  const cases = [
    {
      observationMutation: "postgres_version_mismatch",
      code: "local_postgres_server_version_mismatch",
      postgresServerVersionNum: "MISMATCH",
      target: NOT_OBSERVED_TARGET,
      targetPostgresObserved: false,
      schema: [0, 0],
      verify: [0, 0],
    },
    {
      observationMutation: "postgres_version_unknown",
      code: "local_postgres_sql_execution_failed",
      postgresServerVersionNum: "UNKNOWN",
      target: NOT_OBSERVED_TARGET,
      targetPostgresObserved: false,
      schema: [0, 0],
      verify: [0, 0],
    },
    {
      observationMutation: "catalog_mismatch",
      code: "local_postgres_catalog_mismatch",
      postgresServerVersionNum: 160010,
      target: {
        catalogOutcome: "MISMATCH",
        tables: 13,
        columns: 207,
        constraints: 172,
        indexes: 44,
        catalogContractSha256: CATALOG_CONTRACT_SHA256,
      },
      targetPostgresObserved: true,
      schema: [1, 1],
      verify: [1, 1],
    },
    {
      observationMutation: "catalog_unknown",
      code: "local_postgres_sql_execution_failed",
      postgresServerVersionNum: 160010,
      target: {
        catalogOutcome: "UNKNOWN",
        tables: "UNKNOWN",
        columns: "UNKNOWN",
        constraints: "UNKNOWN",
        indexes: "UNKNOWN",
        catalogContractSha256: "UNKNOWN",
      },
      targetPostgresObserved: true,
      schema: [1, 1],
      verify: [1, 1],
    },
  ] as const;
  for (const item of cases) {
    await t.test(item.observationMutation, async () => {
      const failed = await runLocalPostgresFakePlan({ observationMutation: item.observationMutation });
      assertFailedObservationEnvelope(failed, item.code, item.targetPostgresObserved);
      assert.deepEqual(JSON.parse(JSON.stringify(failed.receipt.hostObservation)), expectedObservationHost({
        ...pinnedImageHost,
        postgresServerVersionNum: item.postgresServerVersionNum,
      }));
      assert.deepEqual(JSON.parse(JSON.stringify(failed.receipt.targetObservation)), item.target);
      assert.deepEqual(
        [failed.receipt.effects.schemaApplyAttemptCount, failed.receipt.effects.schemaApplyCount],
        item.schema,
      );
      assert.deepEqual(
        [failed.receipt.effects.verifyAttemptCount, failed.receipt.effects.verifyCount],
        item.verify,
      );
    });
  }
});

test("cleanup recovery preserves exact durable host and catalog mismatch observations", async () => {
  const recovered = await runLocalPostgresFakePlan({
    observationMutation: "catalog_mismatch",
    faultAt: "cleanup.container.rm",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(recovered.physicalEffects, 0);
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.firstFailureCode, "local_postgres_catalog_mismatch");
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.code, "local_postgres_catalog_mismatch");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.recoveryFailureCode, null);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.notEqual(recovered.status, "GREEN");
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.code, "local_postgres_cleanup_recovered");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assertClosedReceiptShape(recovered.firstReceipt);
  assertClosedReceiptShape(recovered.recoveryReceipt);
  assertReceiptBindings(recovered.firstReceipt);
  assertReceiptBindings(recovered.recoveryReceipt);
  assertReceiptEffectBounds(recovered.firstReceipt.effects);
  assertReceiptEffectBounds(recovered.recoveryReceipt.effects);
  assert.deepEqual(recovered.recoveryReceipt.hostObservation, recovered.firstReceipt.hostObservation);
  assert.deepEqual(recovered.recoveryReceipt.targetObservation, recovered.firstReceipt.targetObservation);
  assert.deepEqual(JSON.parse(JSON.stringify(recovered.recoveryReceipt.hostObservation)), expectedObservationHost({
    imageReference: IMAGE_REFERENCE,
    imagePlatform: IMAGE_PLATFORM,
    imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
    imagePullAttempted: true,
    imagePullOutcome: "COMPLETED",
    imageCacheOutcome: "VERIFIED_COMPLETE_PINNED",
    postgresServerVersionNum: 160010,
  }));
  assert.deepEqual(JSON.parse(JSON.stringify(recovered.recoveryReceipt.targetObservation)), {
    catalogOutcome: "MISMATCH",
    tables: 13,
    columns: 207,
    constraints: 172,
    indexes: 44,
    catalogContractSha256: CATALOG_CONTRACT_SHA256,
  });
  assert.equal(
    recovered.recoveryReceipt.priorEvidenceSha256,
    `sha256:${createHash("sha256")
      .update(Buffer.from(`${canonicalTestJson(recovered.firstReceipt)}\n`, "utf8"))
      .digest("hex")}`,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(recovered.recoveryReceipt.cleanup)), ZERO_RESIDUE_CLEANUP);
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
  assert.equal(recovered.openSyntheticPoolCount, 0);
  assert.equal(recovered.openSyntheticGraphCount, 0);
});

test("observation mutation is a closed exact fake-only selector", async () => {
  for (const observationMutation of [null, "image_pull_error", "docker_version_mismatched", "CATALOG_UNKNOWN", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ observationMutation }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("the three exact hash-pinned SQL byte streams cross real transaction boundaries and leave none active", async () => {
  const sql = [
    {
      path: "schemas/r4/public-core/schema.sql",
      sha256: "a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8",
      opening: "BEGIN;",
      closing: "COMMIT;",
    },
    {
      path: "schemas/r4/public-core/verify.sql",
      sha256: "807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd",
      opening: "BEGIN TRANSACTION READ ONLY;",
      closing: "ROLLBACK;",
    },
    {
      path: "schemas/r4/public-core/rollback.sql",
      sha256: "67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4",
      opening: "BEGIN;",
      closing: "COMMIT;",
    },
  ] as const;
  for (const artifact of sql) {
    const bytes = await readFile(artifact.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256, artifact.path);
    const text = bytes.toString("utf8");
    assert.ok(text.startsWith("-- R4 #67 Durable Public Core proposed"), artifact.path);
    assert.ok(text.indexOf(artifact.opening) > 0, `${artifact.path} keeps its leading comments before transaction open`);
    assert.equal(text.trimEnd().endsWith(artifact.closing), true, artifact.path);
  }

  const green = await runLocalPostgresFakePlan();
  assert.equal(green.status, "GREEN");
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.residueCount, 0);
  assert.equal(green.openSyntheticPoolCount, 0);
  assert.equal(green.receipt.effects.schemaApplyAttemptCount, 3);
  assert.equal(green.receipt.effects.schemaApplyCount, 3);
  assert.equal(green.receipt.effects.verifyAttemptCount, 3);
  assert.equal(green.receipt.effects.verifyCount, 3);
  assert.equal(green.receipt.effects.rollbackAttemptCount, 1);
  assert.equal(green.receipt.effects.rollbackCount, 1);
  assert.equal(green.receipt.effects.maximumObservedConcurrentPools, 1);
  assert.equal(green.receipt.effects.maximumObservedConcurrentClients, 1);
  assert.equal(green.receipt.effects.maximumObservedConcurrentTransactions, 1);
  assert.deepEqual(green.transientLocalResidues, []);
});

test("one failed initial readiness attempt is durably counted before the exact Green flow", async () => {
  const green = await runLocalPostgresFakePlan({ initialReadinessFailures: 1 });
  assert.equal(green.status, "GREEN");
  assert.equal(green.code, "local_postgres_physical_green");
  assert.equal(green.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.residueCount, 0);
  assert.deepEqual(green.transientLocalResidues, []);
  assert.equal(green.openSyntheticPoolCount, 0);
  assert.equal(green.openSyntheticGraphCount, 0);
  assertClosedReceiptShape(green.receipt);
  assertReceiptBindings(green.receipt);
  assertReceiptEffectBounds(green.receipt.effects);

  const effects = green.receipt.effects;
  assert.equal(effects.initialReadinessAttemptCount, 2);
  assert.equal(effects.restartReadinessAttemptCount, 1);
  assert.equal(effects.poolConstructionAttemptCount, 7);
  assert.equal(effects.poolConstructionCount, 7, "a constructed Pool remains completed even when its connect attempt fails");
  assert.equal(effects.connectionAttemptCount, 7);
  assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), {
    primary: 5,
    rollback: 1,
    admin: 1,
  });
  assert.equal(
    effects.poolConstructionAttemptCount,
    effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 4,
  );
  assert.equal(effects.poolConstructionCount, effects.poolConstructionAttemptCount);
  assert.equal(effects.connectionAttemptCount, effects.poolConstructionAttemptCount);
  assert.equal(
    effects.connectionTargetCounts.primary,
    effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 2,
  );
  assert.equal(effects.domainActionInvocationAttemptCount, 23);
  assert.equal(effects.domainActionInvocationCount, 23);
  assert.equal(effects.distinctDomainActionAttemptCount, 20);
  assert.equal(effects.distinctDomainActionCount, 20);
  assert.equal(effects.distinctDomainActionAttemptSetSha256, DOMAIN_ACTION_SET_SHA256);
  assert.equal(effects.distinctDomainActionSetSha256, DOMAIN_ACTION_SET_SHA256);
  assert.equal(effects.maximumObservedConcurrentPools, 1);
  assert.equal(effects.maximumObservedConcurrentClients, 1);
  assert.equal(effects.maximumObservedConcurrentTransactions, 1);
  assert.deepEqual(green.uniqueActions, DOMAIN_ACTIONS);
  assert.deepEqual(JSON.parse(JSON.stringify(green.receipt.readiness)), {
    targetPostgresObserved: true,
    productRuntimeEffects: false,
    trafficReady: false,
    gateCReady: false,
  });
  assert.deepEqual(green.readinessTrace, [
    "pool.construct:1", "connect.enter:1", "connect.return:1", "connection.complete",
    "select.ready:0:1", "client.release:1", "pool.end:1", "sleep",
    "pool.construct:2", "connect.enter:2", "connect.return:2", "connection.complete",
    "select.ready:1:2", "client.release:2", "pool.end:2",
    "pool.construct:1", "connect.enter:1", "connect.return:1", "connection.complete",
    "select.ready:1:1", "client.release:1", "pool.end:1",
  ]);
});

test("main fake readiness delegates both gates through the production SELECT and close order", async () => {
  const green = await runLocalPostgresFakePlan();
  const oneReadyGate = [
    "pool.construct:1", "connect.enter:1", "connect.return:1", "connection.complete",
    "select.ready:1:1", "client.release:1", "pool.end:1",
  ];
  assert.deepEqual(green.readinessTrace, [...oneReadyGate, ...oneReadyGate]);
  assert.equal(green.receipt.effects.initialReadinessAttemptCount, 1);
  assert.equal(green.receipt.effects.restartReadinessAttemptCount, 1);
  assert.equal(green.receipt.effects.poolConstructionAttemptCount, 6);
  assert.equal(green.receipt.effects.poolConstructionCount, 6);
  assert.equal(green.receipt.effects.connectionAttemptCount, 6);
  assert.equal(green.status, "GREEN");
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.residueCount, 0);
});

test("production readiness retries only an explicit successful not-ready result and closes every identity", async () => {
  const ready = await runLocalPostgresReadinessFakePlan({ outcomeSequence: ["ready"] });
  assert.deepEqual(JSON.parse(JSON.stringify(ready)), {
    schemaVersion: "r4.public-core-local-postgres-readiness-fake-result.v1",
    status: "GREEN",
    code: "local_postgres_readiness_ready",
    attempts: 1,
    poolAttempts: 1,
    poolCompletions: 1,
    connectionAttempts: 1,
    connectionCompletions: 1,
    poolCloses: 1,
    clientOpens: 1,
    clientCloses: 1,
    sleeps: 0,
    physicalEffects: 0,
  });

  const retried = await runLocalPostgresReadinessFakePlan({ outcomeSequence: ["not_ready", "ready"] });
  assert.deepEqual(JSON.parse(JSON.stringify(retried)), {
    schemaVersion: "r4.public-core-local-postgres-readiness-fake-result.v1",
    status: "GREEN",
    code: "local_postgres_readiness_ready",
    attempts: 2,
    poolAttempts: 2,
    poolCompletions: 2,
    connectionAttempts: 2,
    connectionCompletions: 2,
    poolCloses: 2,
    clientOpens: 2,
    clientCloses: 2,
    sleeps: 1,
    physicalEffects: 0,
  });
});

test("production readiness never retries an ambiguous connect or SQL result", async () => {
  const connect = await runLocalPostgresReadinessFakePlan({ outcomeSequence: ["connect_ambiguous"] });
  assert.deepEqual(JSON.parse(JSON.stringify(connect)), {
    schemaVersion: "r4.public-core-local-postgres-readiness-fake-result.v1",
    status: "FAILED",
    code: "local_postgres_readiness_failed",
    attempts: 1,
    poolAttempts: 1,
    poolCompletions: 1,
    connectionAttempts: 1,
    connectionCompletions: 0,
    poolCloses: 1,
    clientOpens: 0,
    clientCloses: 0,
    sleeps: 0,
    physicalEffects: 0,
  });

  const sql = await runLocalPostgresReadinessFakePlan({ outcomeSequence: ["sql_ambiguous"] });
  assert.deepEqual(JSON.parse(JSON.stringify(sql)), {
    schemaVersion: "r4.public-core-local-postgres-readiness-fake-result.v1",
    status: "FAILED",
    code: "local_postgres_sql_execution_failed",
    attempts: 1,
    poolAttempts: 1,
    poolCompletions: 1,
    connectionAttempts: 1,
    connectionCompletions: 1,
    poolCloses: 1,
    clientOpens: 1,
    clientCloses: 1,
    sleeps: 0,
    physicalEffects: 0,
  });
});

test("production readiness fake seam accepts only a closed causal outcome sequence", async () => {
  for (const input of [
    { outcomeSequence: [] },
    { outcomeSequence: ["not_ready"] },
    { outcomeSequence: ["ready", "ready"] },
    { outcomeSequence: ["connect_ambiguous", "ready"] },
    { outcomeSequence: ["sql_ambiguous", "ready"] },
    { outcomeSequence: ["unknown"] },
    { outcomeSequence: Array.from({ length: 61 }, () => "not_ready") },
    { outcomeSequence: "ready" },
  ]) {
    await assert.rejects(
      runLocalPostgresReadinessFakePlan(input),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
  await assert.rejects(
    runLocalPostgresReadinessFakePlan({ outcomeSequence: ["ready"], extra: true }),
    runnerError("local_postgres_input_invalid"),
  );
});

test("a failed primary schema attempt never reserves verify and closes with zero residue", async () => {
  const failed = await runLocalPostgresFakePlan({ schemaFailureAt: "primary_initial" });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_fake_schema_failed");
  assert.equal(failed.firstFailureCode, "local_postgres_fake_schema_failed");
  assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(failed.physicalEffects, 0);
  assert.equal(failed.residueCount, 0);
  assert.deepEqual(failed.transientLocalResidues, []);
  assert.equal(failed.openSyntheticPoolCount, 0);
  assert.equal(failed.openSyntheticGraphCount, 0);
  assert.deepEqual(failed.uniqueActions, []);
  assertClosedReceiptShape(failed.receipt);
  assertReceiptBindings(failed.receipt);
  assertReceiptEffectBounds(failed.receipt.effects);

  const effects = failed.receipt.effects;
  assert.equal(effects.schemaApplyAttemptCount, 1);
  assert.equal(effects.schemaApplyCount, 0);
  assert.equal(effects.verifyAttemptCount, 0);
  assert.equal(effects.verifyCount, 0);
  assert.equal(effects.domainActionInvocationAttemptCount, 0);
  assert.equal(effects.domainActionInvocationCount, 0);
  assert.equal(effects.distinctDomainActionAttemptCount, 0);
  assert.equal(effects.distinctDomainActionAttemptSetSha256, "NONE");
  assert.equal(effects.distinctDomainActionCount, 0);
  assert.equal(effects.distinctDomainActionSetSha256, "NONE");
  assert.equal(effects.containerRestartAttemptCount, 0);
  assert.equal(effects.containerRestartCount, 0);
  assert.equal(effects.rollbackAttemptCount, 0);
  assert.equal(effects.rollbackCount, 0);
  assert.equal(effects.maximumObservedConcurrentPools, 1);
  assert.equal(effects.maximumObservedConcurrentClients, 1);
  assert.equal(effects.maximumObservedConcurrentTransactions, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(failed.receipt.targetObservation)), {
    catalogOutcome: "NOT_OBSERVED",
    tables: "NOT_OBSERVED",
    columns: "NOT_OBSERVED",
    constraints: "NOT_OBSERVED",
    indexes: "NOT_OBSERVED",
    catalogContractSha256: "NOT_OBSERVED",
  });
});

test("frozen fake readiness and schema seams reject every unapproved value", async () => {
  for (const initialReadinessFailures of [-1, 60, 1.5, "1", null]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ initialReadinessFailures }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
  for (const schemaFailureAt of [null, "rollback_initial", "PRIMARY_INITIAL", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ schemaFailureAt }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("primary database creation is reserved before the first container-start invocation", async () => {
  const failed = await runLocalPostgresFakePlan({
    faultAt: "docker.container.start",
    faultEdge: "before",
  });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_fake_injected_fault");
  assert.equal(failed.firstFailureCode, "local_postgres_fake_injected_fault");
  assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(failed.faultInjected, true);
  assert.equal(failed.faultInjectionCount, 1);
  assert.equal(failed.requestedFault, "docker.container.start:before#1");
  assert.equal(failed.physicalEffects, 0);
  assert.equal(failed.residueCount, 0);
  assert.deepEqual(failed.transientLocalResidues, []);
  assert.equal(failed.openSyntheticPoolCount, 0);
  assert.equal(failed.openSyntheticGraphCount, 0);
  assertClosedReceiptShape(failed.receipt);
  assertReceiptBindings(failed.receipt);
  assertReceiptEffectBounds(failed.receipt.effects);

  const effects = failed.receipt.effects;
  assert.equal(effects.databaseIdentityAttemptCount, 1);
  assert.equal(effects.databaseIdentityCount, 0);
  assert.equal(effects.poolConstructionAttemptCount, 0);
  assert.equal(effects.poolConstructionCount, 0);
  assert.equal(effects.connectionAttemptCount, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), { primary: 0, rollback: 0, admin: 0 });
  assert.equal(effects.dockerCallCounts["container.start"], 1);
  assert.equal(effects.schemaApplyAttemptCount, 0);
  assert.equal(effects.verifyAttemptCount, 0);
  assert.equal(effects.domainActionInvocationAttemptCount, 0);
  assert.equal(effects.containerRestartAttemptCount, 0);
});

test("rollback database failure occurs after one completed admin Pool/connect and is never retried", async () => {
  const failed = await runLocalPostgresFakePlan({ rollbackDatabaseFailureAt: "create" });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_fake_rollback_database_failed");
  assert.equal(failed.firstFailureCode, "local_postgres_fake_rollback_database_failed");
  assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(failed.physicalEffects, 0);
  assert.equal(failed.residueCount, 0);
  assert.deepEqual(failed.transientLocalResidues, []);
  assert.equal(failed.openSyntheticPoolCount, 0);
  assert.equal(failed.openSyntheticGraphCount, 0);
  assertClosedReceiptShape(failed.receipt);
  assertReceiptBindings(failed.receipt);
  assertReceiptEffectBounds(failed.receipt.effects);

  const effects = failed.receipt.effects;
  assert.equal(effects.poolConstructionAttemptCount, 5);
  assert.equal(effects.poolConstructionCount, 5);
  assert.equal(effects.connectionAttemptCount, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), { primary: 4, rollback: 0, admin: 1 });
  assert.equal(effects.databaseIdentityAttemptCount, 2);
  assert.equal(effects.databaseIdentityCount, 1);
  assert.equal(effects.domainActionInvocationAttemptCount, 23);
  assert.equal(effects.domainActionInvocationCount, 23);
  assert.equal(effects.distinctDomainActionAttemptCount, 20);
  assert.equal(effects.distinctDomainActionCount, 20);
  assert.equal(effects.rollbackAttemptCount, 0);
  assert.equal(effects.rollbackCount, 0);
  assert.equal(effects.schemaApplyAttemptCount, 1);
  assert.equal(effects.schemaApplyCount, 1);
  assert.equal(effects.verifyAttemptCount, 1);
  assert.equal(effects.verifyCount, 1);
});

test("frozen rollback database failure seam rejects every unapproved value", async () => {
  for (const rollbackDatabaseFailureAt of [null, "connect", "CREATE", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ rollbackDatabaseFailureAt }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("one-shot Pool stream gate rejects a second factory before connect and a second connect after one attempt", async (t) => {
  for (const connectionGateMutation of ["second_stream", "second_connect"] as const) {
    await t.test(connectionGateMutation, async () => {
      const failed = await runLocalPostgresFakePlan({ connectionGateMutation });
      assert.equal(failed.status, "FAILED");
      assert.equal(failed.code, "local_postgres_connection_failed");
      assert.equal(failed.firstFailureCode, "local_postgres_connection_failed");
      assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
      assert.equal(failed.physicalEffects, 0);
      assert.equal(failed.residueCount, 0);
      assert.deepEqual(failed.transientLocalResidues, []);
      assert.equal(failed.openSyntheticPoolCount, 0);
      assert.equal(failed.openSyntheticGraphCount, 0);
      assertClosedReceiptShape(failed.receipt);
      assertReceiptBindings(failed.receipt);
      assertReceiptEffectBounds(failed.receipt.effects);

      const effects = failed.receipt.effects;
      assert.equal(effects.poolConstructionAttemptCount, 1);
      assert.equal(effects.poolConstructionCount, 1);
      const expectedAttempts = connectionGateMutation === "second_stream" ? 0 : 1;
      assert.equal(effects.connectionAttemptCount, expectedAttempts);
      assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), {
        primary: expectedAttempts, rollback: 0, admin: 0,
      });
      assert.equal(effects.maximumObservedConcurrentPools, 1);
      assert.equal(effects.maximumObservedConcurrentClients, 0);
      assert.equal(effects.maximumObservedConcurrentTransactions, 0);
      assert.equal(effects.schemaApplyAttemptCount, 0);
      assert.equal(effects.domainActionInvocationAttemptCount, 0);
    });
  }
});

test("one-shot Pool stream gate rejects wrong host or port before reserving a connection", async (t) => {
  for (const connectionGateMutation of ["wrong_host", "wrong_port"] as const) {
    await t.test(connectionGateMutation, async () => {
      const failed = await runLocalPostgresFakePlan({ connectionGateMutation });
      assert.equal(failed.status, "FAILED");
      assert.equal(failed.code, "local_postgres_connection_failed");
      assert.equal(failed.firstFailureCode, "local_postgres_connection_failed");
      assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
      assert.equal(failed.physicalEffects, 0);
      assert.equal(failed.residueCount, 0);
      assert.deepEqual(failed.transientLocalResidues, []);
      assert.equal(failed.openSyntheticPoolCount, 0);
      assert.equal(failed.openSyntheticGraphCount, 0);
      assertClosedReceiptShape(failed.receipt);
      assertReceiptBindings(failed.receipt);
      assertReceiptEffectBounds(failed.receipt.effects);

      const effects = failed.receipt.effects;
      assert.equal(effects.poolConstructionAttemptCount, 1);
      assert.equal(effects.poolConstructionCount, 1);
      assert.equal(effects.connectionAttemptCount, 0);
      assert.deepEqual(JSON.parse(JSON.stringify(effects.connectionTargetCounts)), { primary: 0, rollback: 0, admin: 0 });
      assert.equal(effects.maximumObservedConcurrentPools, 1);
      assert.equal(effects.maximumObservedConcurrentClients, 0);
      assert.equal(effects.maximumObservedConcurrentTransactions, 0);
      assert.equal(effects.schemaApplyAttemptCount, 0);
      assert.equal(effects.domainActionInvocationAttemptCount, 0);
    });
  }
});

test("frozen one-shot connection gate seam rejects every unapproved value", async () => {
  for (const connectionGateMutation of [null, "first_connect", "SECOND_STREAM", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ connectionGateMutation }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("every shared lifecycle before/after fault closes handles and proves zero residue", async (t) => {
  assert.deepEqual(LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES, [
    "docker.verify", "resources.absence", "image.ensure", "network.create", "volume.create",
    "container.create", "container.start", "primary.open", "primary.schema", "primary.walk",
    "primary.close", "container.restart", "replay.open", "replay.run", "replay.close",
    "rollback_database.create", "rollback.open", "rollback.run", "rollback.close",
  ]);
  for (const faultAt of LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES) {
    for (const faultEdge of ["before", "after"] as const) {
      await t.test(`${faultAt}:${faultEdge}`, async () => {
        const failed = await runLocalPostgresFakePlan({ faultAt, faultEdge, recoverCleanup: true });
        assert.equal(failed.physicalEffects, 0);
        assert.equal(failed.residueCount, 0);
        assert.deepEqual(failed.transientLocalResidues, []);
        assert.equal(failed.openSyntheticPoolCount, 0);
        assert.equal(failed.openSyntheticGraphCount, 0);
        assert.equal(JSON.stringify(failed).includes("PRIVATE_"), false);
        assert.equal(failed.requestedFault, `${faultAt}:${faultEdge}#1`);
        assert.equal(failed.faultInjected, true);
        assert.equal(failed.faultInjectionCount, 1);
        assert.equal(failed.faultInjectionOccurrence, 1);
        assert.equal(failed.requestedCheckpointOccurrenceCount, 1);
        assert.ok(failed.checkpoints.includes(`${faultAt}:${faultEdge}`));
        assert.equal(failed.firstFailureCode === null, false);
        assert.equal(failed.recoveryAttempted, true);
        assert.ok(["FAILED", "CLEANUP_RECOVERED"].includes(failed.status));
        assert.notEqual(failed.status, "GREEN", "an injected construction fault and cleanup recovery can never claim Green");
      });
    }
  }
});

test("grant, journal, cleanup, lease, and evidence crash edges recover through the same coordinator", async (t) => {
  const cases = [
    { faultAt: "lease.candidate.install", faultEdge: "after" },
    { faultAt: "grant.consume.link", faultEdge: "after" },
    { faultAt: "grant.consume.unlink_pending", faultEdge: "after" },
    { faultAt: "journal.entry.install", faultEdge: "before" },
    { faultAt: "journal.entry.install", faultEdge: "after" },
    { faultAt: "cleanup.container.rm", faultEdge: "after" },
    { faultAt: "cleanup.network.rm", faultEdge: "after" },
    { faultAt: "cleanup.volume.rm", faultEdge: "after" },
    { faultAt: "evidence.provisional.install", faultEdge: "after" },
    { faultAt: "lease.release", faultEdge: "before" },
    { faultAt: "lease.release", faultEdge: "after" },
    { faultAt: "evidence.publish", faultEdge: "before" },
  ] as const;
  for (const fault of cases) {
    await t.test(`${fault.faultAt}:${fault.faultEdge}`, async () => {
      const result = await runLocalPostgresFakePlan({ ...fault, recoverCleanup: true });
      assert.equal(result.physicalEffects, 0);
      assert.equal(result.residueCount, 0);
      assert.deepEqual(result.transientLocalResidues, []);
      assert.equal(result.openSyntheticPoolCount, 0);
      assert.equal(result.openSyntheticGraphCount, 0);
      assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);
      assert.equal(result.requestedFault, `${fault.faultAt}:${fault.faultEdge}#1`);
      assert.equal(result.faultInjected, true);
      assert.equal(result.faultInjectionCount, 1);
      assert.equal(result.faultInjectionOccurrence, 1);
      assert.ok(result.requestedCheckpointOccurrenceCount >= 1);
      assert.ok(result.checkpoints.includes(`${fault.faultAt}:${fault.faultEdge}`));
      assert.equal(result.firstFailureCode === null, false);
      assert.equal(result.recoveryAttempted, true);
    });
  }
});

test("consume bootstrap crashes expose an exact no-Docker pre-recovery root and repair the anchor first", async (t) => {
  const cases = [
    {
      faultAt: "grant.consume.link",
      faultEdge: "after",
      rootEntries: ["grant.consumed.json", "grant.pending.json", "owner-approval-receipt"],
      grantState: "BOTH_LINKS_SAME_INODE",
    },
    {
      faultAt: "grant.consume.unlink_pending",
      faultEdge: "after",
      rootEntries: ["grant.consumed.json", "owner-approval-receipt"],
      grantState: "CONSUMED_ONLY",
    },
    {
      faultAt: "journal.entry.install",
      faultEdge: "before",
      rootEntries: ["grant.consumed.json", "journal-v3", "owner-approval-receipt"],
      grantState: "CONSUMED_ONLY",
    },
  ] as const;
  for (const item of cases) {
    await t.test(`${item.faultAt}:${item.faultEdge}`, async () => {
      const recovered = await runLocalPostgresFakePlan({
        faultAt: item.faultAt,
        faultEdge: item.faultEdge,
        recoverCleanup: true,
      });
      assert.equal(recovered.firstFailureCode, "local_postgres_grant_recovery_required");
      assert.equal(recovered.firstReceipt, null, "pre-anchor failure cannot publish physical evidence");
      assert.deepEqual(JSON.parse(JSON.stringify(recovered.preRecoverySnapshot)), {
        rootEntries: item.rootEntries,
        grantState: item.grantState,
        journalEntryCount: 0,
        journalPendingEntryCount: 0,
        journalHeadSha256: `sha256:${"0".repeat(64)}`,
        firstEvent: null,
        firstConsumedGrantSha256: null,
        syntheticPortCalls: { socket: 1, docker: 0, pgDriverLoads: 0, poolOpens: 0 },
      });
      assert.equal(recovered.checkpoints.includes("docker.port_created:after"), false);
      const recoveryAnchor = recovered.recoveryCheckpoints.indexOf("journal.entry.install:after");
      const recoveryDockerPort = recovered.recoveryCheckpoints.indexOf("docker.port_created:after");
      assert.ok(recoveryAnchor >= 0);
      assert.ok(recoveryDockerPort > recoveryAnchor, "grant.consumed anchor must commit before cleanup Docker port creation");
      assert.equal(recovered.status, "CLEANUP_RECOVERED");
      assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
      assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
      assert.equal(recovered.residueCount, 0);
      assert.deepEqual(recovered.transientLocalResidues, []);
      assert.equal(recovered.syntheticPortCalls.pgDriverLoads, 0);
      assert.equal(recovered.syntheticPortCalls.poolOpens, 0);
      assert.equal(recovered.physicalEffects, 0);
    });
  }
});

test("consumed cleanup revalidates the Owner approval receipt before any recovery effect", async () => {
  const blocked = await runLocalPostgresFakePlan({
    faultAt: "cleanup.container.rm",
    faultEdge: "before",
    recoverCleanup: true,
    ownerApprovalReceiptMutation: "replace_before_cleanup_recovery",
  });
  assert.equal(blocked.firstFailureCode, "local_postgres_cleanup_blocked");
  assert.equal(blocked.recoveryFailureCode, "local_postgres_owner_approval_receipt_drift");
  assert.equal(blocked.physicalEffects, 0);
  assert.equal(blocked.residueCount, 1, "the exact-owned container remains for separately authorized rescue");
  assert.deepEqual(blocked.postRecoverySnapshot, blocked.preRecoverySnapshot);
  assert.equal(blocked.postRecoveryEvidenceSha256, blocked.preRecoveryEvidenceSha256);
  assert.ok(blocked.preRecoveryEvidenceSha256?.startsWith("sha256:"));
  assert.equal(blocked.recoveryCheckpoints.includes("socket.resolved:after"), false);
  assert.equal(blocked.recoveryCheckpoints.includes("docker.port_created:after"), false);
  assert.equal(blocked.recoveryCheckpoints.includes("journal.entry.install:before"), false);
});

test("Owner approval receipt recovery mutation seam rejects every unapproved value", async () => {
  for (const ownerApprovalReceiptMutation of [null, "replace_before_construction", "REPLACE_BEFORE_CLEANUP_RECOVERY", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ ownerApprovalReceiptMutation }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("expired or rolled-back wall clocks permit only exact cleanup recovery", async (t) => {
  for (const recoveryClockMutation of ["expired", "rollback"] as const) {
    await t.test(recoveryClockMutation, async () => {
      const recovered = await runLocalPostgresFakePlan({
        faultAt: "cleanup.container.rm",
        faultEdge: "before",
        recoverCleanup: true,
        recoveryClockMutation,
      });
      assert.equal(recovered.status, "CLEANUP_RECOVERED");
      assert.equal(recovered.code, "local_postgres_cleanup_recovered");
      assert.equal(recovered.cleanupStatus, "PROVEN_ABSENT");
      assert.equal(recovered.recoveryFailureCode, null);
      assert.equal(recovered.residueCount, 0);
      assert.equal(recovered.physicalEffects, 0);
      assert.equal(recovered.recoveryReceipt.effects.schemaApplyAttemptCount,
        recovered.firstReceipt.effects.schemaApplyAttemptCount);
      assert.equal(recovered.recoveryReceipt.effects.domainActionInvocationAttemptCount,
        recovered.firstReceipt.effects.domainActionInvocationAttemptCount);
      assert.equal(recovered.recoveryReceipt.effects.containerRestartAttemptCount,
        recovered.firstReceipt.effects.containerRestartAttemptCount);
      assert.ok(recovered.recoveryCheckpoints.includes("docker.port_created:after"));
    });
  }
});

test("recovery clock mutation seam rejects every unapproved value", async () => {
  for (const recoveryClockMutation of [null, "future", "ROLLBACK", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ recoveryClockMutation }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("host identity drift is revalidated before SQL, domain, and restart reservations", async (t) => {
  const cases = [
    [{ kind: "sql:schema", target: "primary_initial", edge: "before" }, {
      schemaApplyAttemptCount: 0,
      domainActionInvocationAttemptCount: 0,
      containerRestartAttemptCount: 0,
    }],
    [{ kind: "domain:invoke", target: "room_operator.status", edge: "before" }, {
      schemaApplyAttemptCount: 1,
      domainActionInvocationAttemptCount: 5,
      containerRestartAttemptCount: 0,
    }],
    [{ kind: "container:restart", target: "primary", edge: "before" }, {
      schemaApplyAttemptCount: 1,
      domainActionInvocationAttemptCount: 15,
      containerRestartAttemptCount: 0,
    }],
  ] as const;
  for (const [hostDriftAt, expected] of cases) {
    await t.test(`${hostDriftAt.kind}:${hostDriftAt.target}`, async () => {
      const failed = await runLocalPostgresFakePlan({ hostDriftAt });
      assert.equal(failed.status, "FAILED");
      assert.equal(failed.code, "local_postgres_socket_identity_drift");
      assert.equal(failed.cleanupStatus, "PROVEN_ABSENT");
      assert.equal(failed.syntheticHostDriftTriggered, true);
      assert.equal(failed.physicalEffects, 0);
      assert.equal(failed.residueCount, 0);
      assert.equal(failed.receipt.effects.schemaApplyAttemptCount, expected.schemaApplyAttemptCount);
      assert.equal(failed.receipt.effects.domainActionInvocationAttemptCount,
        expected.domainActionInvocationAttemptCount);
      assert.equal(failed.receipt.effects.containerRestartAttemptCount,
        expected.containerRestartAttemptCount);
    });
  }
});

test("host identity drift seam rejects every unapproved value", async () => {
  for (const hostDriftAt of [
    null,
    "sql:schema",
    { kind: "sql:schema", target: "primary_initial" },
    { kind: "sql:schema", target: "primary_initial", edge: "during" },
    { kind: "sql:schema", target: "primary_initial", edge: "before", extra: true },
  ]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ hostDriftAt }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("final receipt rejects every authority, effect, observation, cleanup, and journal mutation before publication", async () => {
  const mutations = [
    "top_extra", "authority", "lineage", "artifacts", "host", "effects", "target",
    "cleanup", "journal", "readiness", "prior_evidence", "coordinator", "consumed_grant",
    "nested_extra", "code", "status",
  ] as const;
  const result = await runLocalPostgresReceiptValidationFakePlan({ mutations });
  assert.equal(result.status, "GREEN");
  assert.equal(result.receiptValidationEvidenceUnchanged, true);
  assert.deepEqual(
    result.receiptValidationResults.map((entry: {
      mutation: string; rejected: boolean; rejectionCode: string;
    }) => ({ mutation: entry.mutation, rejected: entry.rejected, rejectionCode: entry.rejectionCode })),
    mutations.map((mutation) => ({
      mutation, rejected: true, rejectionCode: "local_postgres_evidence_path_invalid",
    })),
  );
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.residueCount, 0);
});

test("final receipt hostile matrix accepts only a closed, unique mutation list", async () => {
  for (const input of [
    {},
    { mutations: [] },
    { mutations: ["authority", "authority"] },
    { mutations: ["unknown"] },
    { mutations: "authority" },
    { mutations: ["authority"], extra: true },
  ]) {
    await assert.rejects(
      runLocalPostgresReceiptValidationFakePlan(input),
      (error: unknown) => runnerError("local_postgres_fake_fault_invalid")(error)
        || runnerError("local_postgres_input_invalid")(error),
    );
  }
});

test("a third cleanup recovery is denied before journal, Docker, or evidence mutation", async () => {
  const result = await runLocalPostgresCleanupLifecycleFakePlan({});
  assert.deepEqual(result.cleanupLifecycleCeilingProbe.recoveryStatuses, ["FAILED", "FAILED"]);
  assert.deepEqual(result.cleanupLifecycleCeilingProbe.recoveryCleanupStatuses, ["BLOCKED", "BLOCKED"]);
  assert.equal(result.cleanupLifecycleCeilingProbe.thirdFailureCode, "local_postgres_docker_lifecycle_limit");
  assert.equal(result.cleanupLifecycleCeilingProbe.evidenceUnchanged, true);
  assert.equal(result.cleanupLifecycleCeilingProbe.journalUnchanged, true);
  assert.equal(result.cleanupLifecycleCeilingProbe.dockerCallDelta, 0);
  assert.equal(result.cleanupLifecycleCeilingProbe.lifecycleCount, 3);
  assert.equal(result.cleanupLifecycleCeilingProbe.constructionLifecycleCount, 1);
  assert.equal(result.cleanupLifecycleCeilingProbe.cleanupRecoveryLifecycleCount, 2);
  assert.equal(result.cleanupLifecycleCeilingProbe.thirdCheckpoints.includes("docker.port_created:after"), false);
  assert.equal(result.physicalEffects, 0);
});

test("cleanup lifecycle fake plan is a closed zero-key API", async () => {
  await assert.rejects(
    runLocalPostgresCleanupLifecycleFakePlan({ extra: true }),
    runnerError("local_postgres_input_invalid"),
  );
});

test("prepare rejects a same-path private-root replacement without writing the replacement", () => {
  const failed = runLocalPostgresPrepareFakePlan({ mutation: "root_replacement_before_pending" });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_private_root_invalid");
  assert.equal(failed.physicalEffects, 0);
  assert.deepEqual(failed.rootEntries, []);
  assert.deepEqual(failed.displacedRootEntries, ["owner-approval-receipt"]);
});

test("physical coordinator rejects private-root replacement before socket, grant consumption, or effects", async () => {
  const failed = await runLocalPostgresFakePlan({
    rootReplacementMutation: "after_grant_state_observed",
  });
  assert.equal(failed.status, "FAILED_NO_RECEIPT");
  assert.equal(failed.code, "local_postgres_private_root_invalid");
  assert.equal(failed.firstFailureCode, "local_postgres_private_root_invalid");
  assert.equal(failed.rootReplacementInjected, true);
  assert.equal(failed.physicalEffects, 0);
  assert.deepEqual(failed.syntheticPortCalls, {
    socket: 0, docker: 0, pgDriverLoads: 0, pgDriverResolved: false, poolOpens: 0,
  });
  assert.equal(failed.checkpoints.includes("socket.resolved:after"), false);
  assert.equal(failed.checkpoints.includes("grant.consumed:after"), false);
  assert.equal(failed.checkpoints.includes("docker.port_created:after"), false);
  assert.ok(failed.displacedRootEntries.includes("grant.pending.json"));
  assert.ok(failed.displacedRootEntries.includes("owner-approval-receipt"));
  assert.equal(failed.displacedRootEntries.some((name: string) => name.startsWith("journal")), false);
});

test("private-root replacement seam rejects every unapproved value", async () => {
  for (const rootReplacementMutation of [null, "before_grant_state", "AFTER_GRANT_STATE_OBSERVED", 1]) {
    await assert.rejects(
      runLocalPostgresFakePlan({ rootReplacementMutation }),
      runnerError("local_postgres_fake_fault_invalid"),
    );
  }
});

test("same-root contender fails closed while the unique live lease owns the coordinator", async () => {
  const result = await runLocalPostgresFakePlan({ sameRootConcurrency: true });
  assert.equal(result.status, "GREEN");
  assert.equal(result.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.deepEqual(result.sameRootContenderCheckpoints, ["lease.acquire.precheck:after"]);
  assert.equal(result.residueCount, 0);
  assert.deepEqual(result.transientLocalResidues, []);
  assert.equal(result.openSyntheticPoolCount, 0);
  assert.equal(result.openSyntheticGraphCount, 0);
  assert.equal(result.realApplicationGraphCompositions, 2);
  assert.equal(result.realApplicationGraphClosures, 2);

  const finalization = await runLocalPostgresFakePlan({ sameRootFinalizationConcurrency: true });
  assert.equal(finalization.status, "GREEN");
  assert.equal(finalization.finalizationContenderObservedCandidate, true);
  assert.equal(finalization.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.deepEqual(finalization.sameRootContenderCheckpoints, []);
  assert.equal(finalization.residueCount, 0);
  assert.deepEqual(finalization.transientLocalResidues, []);

  const doorway = await runLocalPostgresFakePlan({ reentrantDoorway: true });
  assert.equal(doorway.status, "GREEN");
  assert.equal(doorway.reentrantDoorwayObserved, true);
  assert.equal(doorway.reentrantTerminalReadMatched, true);
  assert.equal(doorway.sameRootContenderFailureCode, "local_postgres_coordinator_active");
  assert.ok(doorway.sameRootContenderCheckpoints.includes("lease.acquire.prior_clear:after"));
  assert.ok(doorway.sameRootContenderCheckpoints.includes("lease.acquire.published:after"));
  assert.equal(doorway.residueCount, 0);
  assert.deepEqual(doorway.transientLocalResidues, []);

  const caughtLease = await runLocalPostgresFakePlan({
    faultAt: "lease.acquire.published",
    faultEdge: "after",
  });
  assert.equal(caughtLease.faultInjected, true);
  assert.equal(caughtLease.residueCount, 0);
  assert.deepEqual(caughtLease.transientLocalResidues, []);

  const caughtDraft = await runLocalPostgresFakePlan({
    faultAt: "evidence.provisional.install",
    faultEdge: "before",
  });
  assert.equal(caughtDraft.faultInjected, true);
  assert.equal(caughtDraft.residueCount, 0);
  assert.deepEqual(caughtDraft.transientLocalResidues, []);
});

test("terminal evidence repeats idempotently and two dead-owner recoverers converge on one receipt", async () => {
  const repeated = await runLocalPostgresFakePlan({ repeatTerminalEntry: true });
  assert.equal(repeated.status, "GREEN");
  assert.equal(repeated.repeatReceiptMatches, true);
  assert.equal(repeated.syntheticPortCalls.socket, 1);
  assert.equal(repeated.residueCount, 0);

  const recovered = await runLocalPostgresFakePlan({ concurrentRecovery: true });
  assert.equal(recovered.status, "GREEN");
  assert.equal(recovered.firstFailureCode, "local_postgres_fake_injected_fault");
  assert.equal(recovered.faultInjectionCount, 1);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.syntheticPortCalls.socket, 1);
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("FAILED BLOCKED evidence is replaced by one cleanup-recovered terminal receipt", async () => {
  const recovered = await runLocalPostgresFakePlan({
    faultAt: "cleanup.container.rm",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.match(recovered.recoveryReceipt.priorEvidenceSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("two dead-owner recoverers converge while replacing FAILED BLOCKED evidence", async () => {
  const recovered = await runLocalPostgresFakePlan({ concurrentReplacementRecovery: true });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.faultInjectionCount, 1);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.concurrentReplacementStagingFaultInjected, true);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.recoveryFailureCode, null);
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.match(recovered.recoveryReceipt.priorEvidenceSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:before",
  ).length, 3);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:after",
  ).length, 1);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("stale FAILED BLOCKED snapshot reconciles the concurrent terminal replacement winner", async () => {
  const recovered = await runLocalPostgresFakePlan({ upstreamSnapshotReplacementRecovery: true });
  assert.equal(recovered.faultInjected, true);
  assert.equal(recovered.firstReceipt.status, "FAILED");
  assert.equal(recovered.firstReceipt.cleanupStatus, "BLOCKED");
  assert.equal(recovered.concurrentReplacementStagingFaultInjected, true);
  assert.equal(recovered.upstreamSnapshotReconcileObserved, true);
  assert.equal(recovered.recoveryAttempted, true);
  assert.equal(recovered.recoveryFailureCode, null);
  assert.equal(recovered.recoveryReceipt.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.recoveryReceipt.cleanupStatus, "PROVEN_ABSENT");
  assert.equal(recovered.concurrentRecoveryReceiptCount, 2);
  assert.equal(recovered.concurrentRecoveryReceiptsMatch, true);
  assert.equal(recovered.concurrentRecoveryRenameWinnerCount, 1);
  assert.equal(recovered.concurrentRecoveryLoserReadbackCount, 1);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.recovery.snapshot:after",
  ).length, 3);
  assert.equal(recovered.recoveryCheckpoints.filter(
    (value: string) => value === "evidence.publish:after",
  ).length, 1);
  assert.equal(recovered.status, "CLEANUP_RECOVERED");
  assert.equal(recovered.residueCount, 0);
  assert.deepEqual(recovered.transientLocalResidues, []);
});

test("faultOccurrence selects an exact repeated journal and graph-close checkpoint", async () => {
  const journal = await runLocalPostgresFakePlan({
    faultAt: "journal.entry.install",
    faultEdge: "after",
    faultOccurrence: 3,
    recoverCleanup: true,
  });
  assert.equal(journal.faultInjectionCount, 1);
  assert.equal(journal.faultInjectionOccurrence, 3);
  assert.ok(journal.requestedCheckpointOccurrenceCount >= 3);
  assert.equal(journal.firstFailureCode === null, false);
  assert.equal(journal.residueCount, 0);

  const graph = await runLocalPostgresFakePlan({
    faultAt: "application_graph.close",
    faultEdge: "before",
    faultOccurrence: 2,
    recoverCleanup: true,
  });
  assert.equal(graph.faultInjectionCount, 1);
  assert.equal(graph.faultInjectionOccurrence, 2);
  assert.ok(graph.requestedCheckpointOccurrenceCount >= 2);
  assert.equal(graph.firstFailureCode === null, false);
  assert.equal(graph.openSyntheticGraphCount, 0);
  assert.equal(graph.openSyntheticPoolCount, 0);
  assert.equal(graph.residueCount, 0);
});

test("durable cleanup proof bypasses socket resolution and graph cleanup retries after one injected close fault", async () => {
  const cleanupProof = await runLocalPostgresFakePlan({
    faultAt: "evidence.provisional.install",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(cleanupProof.faultInjected, true);
  assert.equal(cleanupProof.recoveryAttempted, true);
  assert.equal(cleanupProof.syntheticPortCalls.socket, 1);
  assert.equal(cleanupProof.recoveryCheckpoints.includes("socket.resolved:after"), false);
  assert.equal(cleanupProof.residueCount, 0);

  const retriedClose = await runLocalPostgresFakePlan({
    faultAt: "application_graph.close",
    faultEdge: "before",
    recoverCleanup: true,
  });
  assert.equal(retriedClose.faultInjected, true);
  assert.ok(retriedClose.checkpoints.filter((value: string) => value === "application_graph.close:before").length >= 2);
  assert.equal(retriedClose.openSyntheticGraphCount, 0);
  assert.equal(retriedClose.openSyntheticPoolCount, 0);
  assert.equal(retriedClose.residueCount, 0);
});

test("ordinary argument and invalid physical entry preserve preexisting private bytes and make no daemon receipt", async (t) => {
  assert.deepEqual(parseLocalPostgresRunnerArguments(["fake"]), { mode: "fake" });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare",
    "--grant-root", "/private/r4-local-postgres",
    "--execution-review-head", "a".repeat(40),
    "--owner-approval-receipt", "/private/r4-local-postgres/owner-approval-receipt",
    "--created-at", "2026-08-12T18:00:00.000Z",
    "--expires-at", "2026-08-12T19:00:00.000Z",
  ]), {
    mode: "prepare",
    privateRoot: "/private/r4-local-postgres",
    executionReviewHead: "a".repeat(40),
    ownerApprovalReceiptPath: "/private/r4-local-postgres/owner-approval-receipt",
    createdAt: "2026-08-12T18:00:00.000Z",
    expiresAt: "2026-08-12T19:00:00.000Z",
  });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "physical", "--grant-root", "/private/r4-local-postgres",
    "--evidence-out", "/private/r4-local-postgres/physical-evidence.json",
  ]), {
    mode: "physical",
    grantRoot: "/private/r4-local-postgres",
    evidenceOut: "/private/r4-local-postgres/physical-evidence.json",
  });
  for (const argv of [
    ["physical"],
    ["fake", "unexpected"],
    ["physical", "--grant-root", "relative", "--evidence-out", "/private/evidence.json"],
    ["physical", "--evidence-out", "/private/evidence.json", "--grant-root", "/private/root"],
    ["prepare", "--grant-root", "/private/root", "--execution-review-head", "a".repeat(39),
      "--owner-approval-receipt", "/private/root/receipt", "--created-at", NOW,
      "--expires-at", "2026-08-11T19:00:00.000Z"],
    ["prepare", "--grant-root", "/private/root", "--execution-review-head", "a".repeat(40),
      "--owner-approval-receipt", "relative", "--created-at", NOW,
      "--expires-at", "2026-08-11T19:00:00.000Z"],
    ["prepare", "--grant-root", "/private/root", "--execution-review-head", "a".repeat(40),
      "--owner-approval-receipt", "/private/root/receipt", "--created-at", "2026-08-11T18:00:00Z",
      "--expires-at", "2026-08-11T19:00:00.000Z"],
  ]) assert.throws(() => parseLocalPostgresRunnerArguments(argv), LocalPostgresRunnerError);
  const root = await privateRoot();
  t.after(async () => rm(root, { recursive: true, force: true }));
  const evidence = path.join(root, "physical-evidence.json");
  const sentinel = path.join(root, "postgres-password");
  await writeFile(sentinel, "OWNER_SENTINEL", { mode: 0o600, flag: "wx" });
  await assert.rejects(
    runApprovedLocalPostgresPhysical({ grantRoot: root, evidenceOut: evidence }),
    (error: unknown) => error instanceof LocalPostgresRunnerError
      && (error as Error).message === "local_postgres_grant_state_invalid"
      && !JSON.stringify(error).includes(root),
  );
  assert.equal(await readFile(sentinel, "utf8"), "OWNER_SENTINEL");
  await assert.rejects(readFile(evidence, "utf8"), /ENOENT/u);
  assert.equal((await stat(sentinel)).mode & 0o777, 0o600);
});

test("prepare and physical entry reject a symlink root alias before reading grant or entering any physical port", async (t) => {
  const root = await privateRoot();
  const alias = `${root}-alias`;
  await symlink(root, alias, "dir");
  t.after(async () => {
    await rm(alias, { force: true });
    await rm(root, { recursive: true, force: true });
  });

  assert.throws(
    () => prepareLocalPostgresPendingGrantV3({
      privateRoot: alias,
      executionReviewHead: GIT,
      ownerApprovalReceiptPath: path.join(alias, "owner-approval-receipt"),
      createdAt: NOW,
      expiresAt: "2026-08-11T19:00:00.000Z",
    }),
    runnerError("local_postgres_private_root_invalid"),
  );
  await assert.rejects(
    runApprovedLocalPostgresPhysical({
      grantRoot: alias,
      evidenceOut: path.join(alias, "physical-evidence.json"),
    }),
    runnerError("local_postgres_private_root_invalid"),
  );
  assert.deepEqual((await readdir(root)).sort(), []);
});
