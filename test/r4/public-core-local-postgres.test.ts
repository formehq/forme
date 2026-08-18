import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import nodeTest from "node:test";
import {
  LOCAL_POSTGRES_DOCKER_COMMAND_KINDS,
  LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_STAGES,
  LOCAL_POSTGRES_PHASE1_AUTHORITY,
  LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY,
  LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES,
  LOCAL_POSTGRES_STAGE_A_PATHS,
  LOCAL_POSTGRES_V3_CEILINGS,
  LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CEILINGS,
  LocalPostgresRunnerError,
  buildLocalPostgresDockerPlan,
  createLocalPostgresPendingGrant,
  deriveLocalPostgresResourceNames,
  parseLocalPostgresRunnerArguments,
  prepareLocalPostgresPendingGrantV3,
  prepareLocalPostgresCleanupRescueGrant,
  prepareBodyFreeDockerInspectDiagnosticGrant,
  prepareLocalPostgresImageAcquisitionDiagnosticGrant,
  prepareLocalPostgresImageManifestDiagnosticGrant,
  prepareLocalPostgresIntegrationCampaignGrant,
  runApprovedLocalPostgresPhysical,
  runApprovedLocalPostgresCleanupRescue,
  runApprovedBodyFreeDockerInspectDiagnostic,
  runApprovedLocalPostgresImageAcquisitionDiagnostic,
  runApprovedLocalPostgresImageManifestDiagnostic,
  runApprovedLocalPostgresIntegrationCampaign,
  runLocalPostgresBodyFreeDiagnosticAuthorityFakePlan,
  runLocalPostgresBodyFreeDiagnosticFakePlan,
  runLocalPostgresBodyFreeDiagnosticGrantValidationFakePlan,
  runLocalPostgresBodyFreeDiagnosticJournalValidationFakePlan,
  runLocalPostgresBodyFreeDiagnosticPrepareFakePlan,
  runLocalPostgresBodyFreeDiagnosticReceiptValidationFakePlan,
  runLocalPostgresCleanupRescueAuthorityFakePlan,
  runLocalPostgresCleanupRescueBindingFakePlan,
  runLocalPostgresCleanupRescueFakePlan,
  runLocalPostgresCleanupRescueGrantValidationFakePlan,
  runLocalPostgresCleanupRescuePrepareFakePlan,
  runLocalPostgresCleanupRescueReceiptValidationFakePlan,
  runLocalPostgresDockerDiagnosticFakePlan,
  runLocalPostgresFakePlan,
  runLocalPostgresIntegrationCampaignAuthorityFakePlan,
  runLocalPostgresIntegrationCampaignFakePlan,
  runLocalPostgresIntegrationCampaignGrantValidationFakePlan,
  runLocalPostgresIntegrationCampaignJournalValidationFakePlan,
  runLocalPostgresIntegrationCampaignJournalHeadroomFakePlan,
  runLocalPostgresIntegrationCampaignCleanupRecoveryFakePlan,
  runLocalPostgresIntegrationCampaignMissingFingerprintFakePlan,
  runLocalPostgresIntegrationCampaignPrepareFakePlan,
  runLocalPostgresIntegrationCampaignReceiptValidationFakePlan,
  runLocalPostgresIntegrationCampaignRawParserFakePlan,
  runLocalPostgresImageManifestDiagnosticAuthorityFakePlan,
  runLocalPostgresImageManifestDiagnosticFakePlan,
  runLocalPostgresImageManifestDiagnosticGrantValidationFakePlan,
  runLocalPostgresImageManifestDiagnosticJournalValidationFakePlan,
  runLocalPostgresImageManifestDiagnosticPrepareFakePlan,
  runLocalPostgresImageManifestDiagnosticReceiptValidationFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticAuthorityFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticGrantValidationFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticJournalValidationFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticPrepareFakePlan,
  runLocalPostgresImageAcquisitionDiagnosticReceiptValidationFakePlan,
  verifyLocalPostgresIntegrationCampaignHistoricalPrefix,
  runLocalPostgresCleanupLifecycleFakePlan,
  runLocalPostgresPrepareFakePlan,
  runLocalPostgresReadinessFakePlan,
  runLocalPostgresReceiptValidationFakePlan,
  validateLocalPostgresGrant,
  validateLocalPostgresIntegrationCampaignGrant,
  validateBodyFreeDiagnosticGrant,
// The approved runner is an executable .mjs artifact; its runtime exports are
// contract-tested here without adding an out-of-workset declaration file.
// @ts-expect-error -- intentionally no ambient declaration for the CLI artifact.
} from "../../scripts/r4-public-core-local-postgres.mjs";

const CURRENT_SQL_HASHES = Object.freeze({
  schema: `sha256:${createHash("sha256").update(readFileSync(new URL("../../schemas/r4/public-core/schema.sql", import.meta.url))).digest("hex")}`,
  verify: `sha256:${createHash("sha256").update(readFileSync(new URL("../../schemas/r4/public-core/verify.sql", import.meta.url))).digest("hex")}`,
  rollback: `sha256:${createHash("sha256").update(readFileSync(new URL("../../schemas/r4/public-core/rollback.sql", import.meta.url))).digest("hex")}`,
});
const HISTORICAL_RUNNER_SQL_CURRENT = CURRENT_SQL_HASHES.schema === LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.schemaSqlSha256
  && CURRENT_SQL_HASHES.verify === LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.verifySqlSha256
  && CURRENT_SQL_HASHES.rollback === LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.rollbackSqlSha256;

nodeTest("the frozen physical runner rejects the #77 PostgreSQL compatibility bytes instead of silently widening authority", () => {
  assert.equal(HISTORICAL_RUNNER_SQL_CURRENT, false);
  assert.deepEqual(CURRENT_SQL_HASHES, {
    schema: "sha256:752affd9c237edf0469ec1486269ad68f46b3b83f93d63d80666f0d20984cb00",
    verify: "sha256:1b05175a925a2a8c614976c0e70700b6f9b7dab1fd59557d0eef6edb0f64c85e",
    rollback: "sha256:618f5de12e7d5b0aeae56229c055aacf1ea9936adfad8c14bed87b80d5650c61",
  });
});

// The legacy fake lifecycle is meaningful only for the immutable SQL authority
// it was constructed to test. Once #77 deliberately supersedes those bytes,
// keep that runner fail-closed and retain its committed audit as history.
const test = HISTORICAL_RUNNER_SQL_CURRENT ? nodeTest : nodeTest.skip;

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

function assertHistoricalConstructionStep(input: Readonly<{
  head: string;
  parent: string;
  tree: string;
  paths: Readonly<Record<string, "A" | "M">>;
}>): void {
  assert.equal(gitText(["rev-parse", `${input.head}^{commit}`]), input.head);
  assert.equal(gitText(["rev-parse", `${input.head}^`]), input.parent);
  assert.equal(gitText(["rev-parse", `${input.head}^{tree}`]), input.tree);
  const actual = gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", input.head])
    .split("\n")
    .filter(Boolean)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const expected = Object.entries(input.paths)
    .map(([artifactPath, status]) => `${status}\t${artifactPath}`)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  assert.deepEqual(actual, expected);
}

function committedArtifactAggregate(head: string, artifactPaths: readonly string[]): string {
  const records = [...artifactPaths]
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
    .map((artifactPath) => {
      const bytes = gitBytes(["show", `${head}:${artifactPath}`]);
      return `${artifactPath}\0sha256:${createHash("sha256").update(bytes).digest("hex")}\0${bytes.length}\n`;
    });
  return `sha256:${createHash("sha256").update(Buffer.from(records.join(""), "utf8")).digest("hex")}`;
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

test("failed physical authority and the APFS nlink correction close through exact committed steps", () => {
  const failedCard = "421560cb6ac2fbbf52d104a5b71ade6347d9629f";
  const failedReview = "e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab";
  const correctionAddendum = "04ad36bddbf7d2f62cdfc241f51a5cf817046aff";
  const correctionReview = "5ec9521e6c16c76ce3cd10ab9f6a1c8acad74544";
  const correctionImplementation = "18e3a325cceabdf5168b5ffb328ee2580b069a76";
  const correctionEvidence = "32448cb962c823d39205cc83d11aa3f6571cf65d";
  const correctionStatus = "6c96f70b43315d5f9b72cb929dc530b36c4ddfde";
  const topologyAddendum = "e61a2bb1817ac56c9377e161078f46543d8d2411";
  const topologyReview = "dd9759f8034042fe28ae7c24c7519dc480ffad37";

  assertHistoricalAuthorityStep({
    head: failedCard,
    parent: "42378b5a2a48493acf8edddcd05d19593cb05dd7",
    tree: "2bb4bf20f4892af3f51887e7c7d4f2302b80169d",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md",
    artifactSha256: "sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77",
  });
  assertHistoricalAuthorityStep({
    head: failedReview,
    parent: failedCard,
    tree: "91f1a0aef6820bd4a145bc6d93acd0bbedc40992",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e",
  });
  assertHistoricalAuthorityStep({
    head: correctionAddendum,
    parent: failedReview,
    tree: "006c3bbf7f0a0e988c7afd65b425fbcefc1189b8",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:b1ad65b6033eeb0b3848544df596af362e49015613434c4eb2a06ce4f1e80e06",
  });
  assertHistoricalAuthorityStep({
    head: correctionReview,
    parent: correctionAddendum,
    tree: "513bf389aebb03bfc86464693facd2257084b5e4",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:a33d6e8b70783e756169af0256f8f5f749461187fb79f343540788df70540bd6",
  });
  assertHistoricalConstructionStep({
    head: correctionImplementation,
    parent: correctionReview,
    tree: "184d9a4147fbb9baea22b1303ca24a09c2687a79",
    paths: {
      "scripts/r4-public-core-local-postgres.mjs": "M",
      "test/r4/public-core-local-postgres.test.ts": "M",
    },
  });
  assert.equal(
    committedArtifactAggregate(correctionImplementation, [
      "scripts/r4-public-core-local-postgres.mjs",
      "test/r4/public-core-local-postgres.test.ts",
    ]),
    "sha256:56e2e3b10236e693bf7813c3c97e0acbb6c897123c37918cfda9d8609294e130",
  );
  assertHistoricalConstructionStep({
    head: correctionEvidence,
    parent: correctionImplementation,
    tree: "02b377385a0e68a60021f878027f41ab34399f63",
    paths: {
      "docs/evidence/r4-public-core-local-postgres-apfs-nlink-correction.json": "A",
      "schemas/r4/public-core/local-postgres-apfs-nlink-correction-artifact-index.json": "A",
      "schemas/r4/public-core/local-postgres-apfs-nlink-correction-evidence.schema.json": "A",
    },
  });
  const correctionStatusPaths = {
    "README.md": "M",
    "docs/CONTROL.md": "M",
    "docs/DECISIONS.md": "M",
    "docs/NATIVE-HARNESS-ARCHITECTURE.md": "M",
    "docs/PRODUCT.md": "M",
    "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md": "M",
    "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md": "A",
    "docs/README.md": "M",
    "docs/ROADMAP.md": "M",
    "docs/VALIDATION.md": "M",
  } as const;
  assertHistoricalConstructionStep({
    head: correctionStatus,
    parent: correctionEvidence,
    tree: "e08de32e58c5c05730d69280aae824cb2277ea33",
    paths: correctionStatusPaths,
  });
  assert.equal(
    committedArtifactAggregate(correctionStatus, Object.keys(correctionStatusPaths)),
    "sha256:72fe493881c293e6ac60368b8ab490073de1e7c2609a9de83d534dd27ca39bdc",
  );
  assertHistoricalAuthorityStep({
    head: topologyAddendum,
    parent: correctionStatus,
    tree: "88b35f39ce6e7d170309244930129911cc09b230",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22",
  });
  assertHistoricalAuthorityStep({
    head: topologyReview,
    parent: topologyAddendum,
    tree: "2dc809ea52e2e5d3d64346873e773ba55734de85",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:ce5be9d958e45e05450a19d56aa093344f9e28003ca2534ecf0d13e72d3b9c2b",
  });
  const statusPaths = gitText(["ls-tree", "-r", "--name-only", topologyReview]).split("\n");
  assert.ok(statusPaths.includes("docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md"));
  assert.ok(statusPaths.includes("docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md"));
  assert.equal(statusPaths.includes("docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2.md"), false);
  assert.equal(statusPaths.includes("docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md"), false);
});

test("fresh execution authority uses only versioned add-only paths after the topology correction", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  assert.match(source, /const FAILED_EXECUTION_CARD_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD\.md"/u);
  assert.match(source, /const FAILED_EXECUTION_REVIEW_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW\.md"/u);
  assert.match(source, /const FRESH_EXECUTION_CARD_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2\.md"/u);
  assert.match(source, /const FRESH_EXECUTION_REVIEW_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2\.md"/u);
  assert.match(source, /new Map\(\[\[FRESH_EXECUTION_CARD_PATH, "A"\]\]\)/u);
  assert.match(source, /new Map\(\[\[FRESH_EXECUTION_REVIEW_PATH, "A"\]\]\)/u);
  assert.equal(source.includes('new Map([[FAILED_EXECUTION_CARD_PATH, "M"]])'), false);
  assert.equal(source.includes('new Map([[FAILED_EXECUTION_REVIEW_PATH, "M"]])'), false);
  assert.ok(source.includes("TOPOLOGY_CORRECTION_REVIEW_HEAD, lineage.rebindImplementationHead"));
  assert.ok(source.includes("lineage.executionCardHead}:${FRESH_EXECUTION_CARD_PATH}"));
  assert.ok(source.includes("lineage.executionReviewHead}:${FRESH_EXECUTION_REVIEW_PATH}"));
  assert.ok(source.includes("executionCardHead}:${FRESH_EXECUTION_CARD_PATH}"));
  assert.ok(source.includes("executionReviewHead}:${FRESH_EXECUTION_REVIEW_PATH}"));
});

test("authorized effect engines are constructed while ordinary tests remain fake-only", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  assert.equal(source.includes("local_postgres_physical_engine_not_frozen"), false);
  assert.match(source, /if \(parsed\.mode === "fake"\)/u);
  assert.match(source, /consumeLocalPostgresGrant/u);
  assert.match(source, /performNormalPhysicalRun/u);
  assert.match(source, /cleanupOwnedDocker/u);
  assert.equal((source.match(/spawnSync\(DOCKER_CLI/gu) ?? []).length, 5,
    "general physical, cleanup-rescue, body-free inspect, image-manifest, and image-acquisition diagnostic each own one closed Docker port");
  const hardlinkSites = source.match(/fs\.linkSync\([^\n]+/gu) ?? [];
  const hardlinkKinds = hardlinkSites.map((site) => (
    site.includes("receipt-link") ? "fake_receipt_hardlink_mutation" : site.includes("pending, consumed") ? "grant_consume" : "unknown"
  ));
  assert.equal(hardlinkKinds.filter((kind) => kind === "grant_consume").length, 6,
    "physical, rescue, body-free inspect, integration campaign, image-manifest, and image-acquisition diagnostic each consume one distinct grant family");
  assert.equal(hardlinkKinds.filter((kind) => kind === "fake_receipt_hardlink_mutation").length, 1);
  assert.equal(hardlinkKinds.includes("unknown"), false);
  assert.equal(source.includes("coordinator.active.json"), false);
  assert.equal(source.includes("coordinator.claim.json"), false);
  assert.equal(source.includes("process.kill("), false, "PID-only liveness cannot authorize takeover");
  assert.match(source, /\/proc\/sys\/kernel\/random\/boot_id/u);
  assert.match(source, /physical-evidence-draft-p/u);
  assert.match(source, /r4\.public-core-local-postgres-grant\.v3/u);
  assert.match(source, /r4\.public-core-local-postgres-physical-result\.v3/u);
  assert.match(source, /r4\.public-core-local-postgres-integration-campaign-grant\.v2/u);
  assert.match(source, /runApprovedLocalPostgresIntegrationCampaign/u);
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
  assert.equal(source.includes("expectedRootNlink"), false);
  assert.match(source, /gid: stat\.gid/u);
  assert.match(source, /current\.gid !== identity\.gid/u);
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
  assert.deepEqual(Object.keys(prepared).sort(), [
    "grant", "physicalEffects", "receipt", "rootEntries", "rootNlinkWithPending",
    "rootNlinkWithReceipt", "schemaVersion", "status",
  ]);
  assert.equal(prepared.schemaVersion, "r4.public-core-local-postgres-prepare-fake-result.v1");
  assert.equal(prepared.status, "GREEN");
  assert.equal(prepared.physicalEffects, 0);
  assert.deepEqual(prepared.rootEntries, ["grant.pending.json", "owner-approval-receipt"]);
  assert.ok(Number.isSafeInteger(prepared.rootNlinkWithReceipt));
  assert.ok(Number.isSafeInteger(prepared.rootNlinkWithPending));
  assert.ok(prepared.rootNlinkWithReceipt >= 2);
  assert.ok(prepared.rootNlinkWithPending >= 2);
  if (process.platform === "darwin") {
    assert.equal(prepared.rootNlinkWithReceipt, 3, "APFS root with one receipt reports nlink 3");
    assert.equal(prepared.rootNlinkWithPending, 4, "APFS root with receipt plus pending reports nlink 4");
  }
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

test("prepare accepts the truthful filesystem link count but rejects an unauthorized link-count entry transition", () => {
  const failed = runLocalPostgresPrepareFakePlan({ mutation: "root_nlink_drift" });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.code, "local_postgres_private_root_invalid");
  assert.deepEqual(failed.rootEntries, ["owner-approval-receipt", "root-link-drift"]);
  assert.equal(failed.rootEntries.includes("grant.pending.json"), false);
  assert.equal(failed.physicalEffects, 0);
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
  const imageInspect = (plan.steps as readonly Readonly<{ kind: string; argv: readonly string[] }>[])
    .find((step) => step.kind === "image.inspect");
  assert.deepEqual(imageInspect?.argv, [
    "image", "inspect", "--platform", IMAGE_PLATFORM, "--format", "{{json .}}", IMAGE_REFERENCE,
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

test("Docker missing diagnostics accept only the exact frozen full-line table", () => {
  const resources = deriveLocalPostgresResourceNames("b92ae04555cc3d69a16c06ae53b30976");
  const accepted = [
    ["image.inspect", `Error response from daemon: No such image: ${IMAGE_REFERENCE}\n`],
    ["image.inspect", `Error: No such object: ${IMAGE_REFERENCE}\n`],
    ["container.inspect", `Error response from daemon: No such container: ${resources.container}\n`],
    ["container.inspect", `Error: No such object: ${resources.container}\n`],
    ["network.inspect", `Error response from daemon: network ${resources.network} not found\n`],
    ["volume.inspect", `Error response from daemon: get ${resources.volume}: no such volume\n`],
  ] as const;
  for (const [kind, stderr] of accepted) {
    const result = runLocalPostgresDockerDiagnosticFakePlan({ kind, status: 1, stdout: "\n", stderr });
    assert.equal(result.outcome, "MISSING_EXACT", `${kind}: ${stderr}`);
    assert.equal(result.missingExact, true);
    assert.equal(result.physicalEffects, 0);
  }
  const exactNames = {
    "image.inspect": IMAGE_REFERENCE,
    "container.inspect": resources.container,
    "network.inspect": resources.network,
    "volume.inspect": resources.volume,
  } as const;
  const hostile = accepted.flatMap(([kind, stderr]) => {
    const exactName = exactNames[kind];
    const withoutLf = stderr.slice(0, -1);
    return [
      { kind, status: 1, stdout: "\n", stderr: stderr.replace(exactName, `${exactName}-other`) },
      { kind, status: 1, stdout: "\n", stderr: `prefix ${stderr}` },
      { kind, status: 1, stdout: "\n", stderr: `${withoutLf} suffix\n` },
      { kind, status: 1, stdout: "\n", stderr: `${stderr}extra\n` },
      { kind, status: 1, stdout: "\n", stderr: `${withoutLf}\r\n` },
      { kind, status: 0, stdout: "\n", stderr },
      { kind, status: 1, stdout: "", stderr },
      { kind, status: 1, stdout: "unexpected", stderr },
    ];
  });
  hostile.push(
    { kind: "network.inspect", status: 1, stdout: "\n", stderr: `Error: No such object: ${resources.network}\n` },
    { kind: "volume.inspect", status: 1, stdout: "\n", stderr: `Error: No such object: ${resources.volume}\n` },
  );
  for (const candidate of hostile) {
    const result = runLocalPostgresDockerDiagnosticFakePlan(candidate);
    assert.equal(result.outcome, "FAILED", JSON.stringify(candidate));
    assert.equal(result.missingExact, false);
    assert.equal(result.physicalEffects, 0);
  }
});

test("Docker diagnostic/rescue Addendum and Review are exact single-document descendants of failed Review V2", () => {
  assertHistoricalAuthorityStep({
    head: "56553e4a1e7bc65516f1f14cbac7e8fab2a53262",
    parent: "6e67c1f1867d73f27674a5f056e0692c5b42d6a3",
    tree: "45a8b295d5308766e2bf0a6f4715af0d5c5edaef",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9",
  });
  assertHistoricalAuthorityStep({
    head: "eb38eff55c2360b51df13dceb896680ec4440479",
    parent: "56553e4a1e7bc65516f1f14cbac7e8fab2a53262",
    tree: "96abe090ac364a973d1b9bc6edc3e5ea70af4d6e",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4",
  });
});

test("cleanup rescue authority, prepare, and grant membranes are closed and fake-only", () => {
  assert.deepEqual(runLocalPostgresCleanupRescueAuthorityFakePlan(), {
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-authority-fake-result.v1",
    mutation: "none", accepted: true, code: null, physicalEffects: 0,
  });
  for (const mutation of [
    "duplicate_marker", "prefixed_marker", "top_extra", "authority", "lineage", "artifacts", "blocked", "host", "ceiling",
  ]) {
    const result = runLocalPostgresCleanupRescueAuthorityFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.code, "local_postgres_cleanup_rescue_authority_invalid", mutation);
    assert.equal(result.physicalEffects, 0);
  }

  const prepared = runLocalPostgresCleanupRescuePrepareFakePlan();
  assert.equal(prepared.status, "GREEN");
  assert.equal(prepared.code, "local_postgres_cleanup_rescue_prepare_green");
  assert.deepEqual(prepared.rootEntries, ["owner-approval-receipt", "rescue.pending.json"]);
  assert.equal(prepared.grant.schemaVersion, "r4.public-core-local-postgres-cleanup-rescue-grant.v1");
  assert.equal(prepared.grant.blocked.consumedGrantSha256,
    "sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35");
  assert.equal(prepared.grant.blocked.finalEvidenceSha256,
    "sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c");
  assert.equal(prepared.grant.blocked.journalEntryCount, 34);
  assert.equal(prepared.grant.blocked.journalHeadSha256,
    "sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25");
  assert.equal(prepared.physicalEffects, 0);
  for (const mutation of ["blocked_root_inode", "blocked_journal_head", "blocked_final_evidence", "expired"] as const) {
    const failed = runLocalPostgresCleanupRescuePrepareFakePlan({ mutation });
    assert.equal(failed.status, "FAILED", mutation);
    assert.equal(failed.receipt, null, mutation);
    assert.equal(failed.grant, null, mutation);
    assert.deepEqual(failed.rootEntries, ["owner-approval-receipt"], mutation);
    assert.equal(failed.physicalEffects, 0, mutation);
  }
  for (const mutation of [
    "top_extra", "missing_key", "schema", "grant_id", "owner_receipt", "authority", "lineage", "artifacts",
    "blocked_root", "blocked_entries", "blocked_owner", "blocked_consumed", "blocked_evidence", "blocked_journal",
    "blocked_resource", "host", "ceiling", "docker_ceiling", "local_only",
    "production", "expired", "future_created",
  ]) {
    const result = runLocalPostgresCleanupRescueGrantValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
    assert.match(result.code, /^local_postgres_/u, mutation);
  }
  for (const mutation of [
    "implementation_head", "implementation_tree", "implementation_aggregate", "evidence_head", "evidence_tree",
    "status_head", "status_tree", "card_head", "card_tree", "review_head", "review_tree", "runner", "test",
    "index", "schema", "evidence", "report", "audit", "card_sha", "review_sha", "payload_sha",
  ]) {
    const result = runLocalPostgresCleanupRescueBindingFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.code, "local_postgres_cleanup_rescue_binding_invalid", mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
});

test("cleanup rescue fake proves exact absence without image, create, start, pg, SQL, or product effects", async () => {
  const result = await runLocalPostgresCleanupRescueFakePlan({});
  assert.equal(result.status, "GREEN");
  assert.equal(result.code, "local_postgres_cleanup_rescue_green");
  assert.deepEqual(result.calls, [
    "version", "container.inspect", "network.inspect", "volume.inspect",
    "container.inspect", "network.inspect", "volume.inspect",
  ]);
  assert.deepEqual(result.argv.map((record: Readonly<{ kind: string; argv: readonly string[] }>) => record.argv), [
    ["version", "--format", "{{json .}}"],
    ["container", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-b92ae04555cc3d69"],
    ["network", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-net-b92ae04555cc3d69"],
    ["volume", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-vol-b92ae04555cc3d69"],
    ["container", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-b92ae04555cc3d69"],
    ["network", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-net-b92ae04555cc3d69"],
    ["volume", "inspect", "--format", "{{json .}}", "forme-r4-public-core-local-vol-b92ae04555cc3d69"],
  ]);
  assert.deepEqual(result.mutations, []);
  assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.effects.dockerCallCounts)), {
    version: 1, "image.inspect": 0, "image.pull": 0,
    "container.inspect": 2, "container.create": 0, "container.start": 0, "container.stop": 0, "container.rm": 0,
    "network.inspect": 2, "network.create": 0, "network.rm": 0,
    "volume.inspect": 2, "volume.create": 0, "volume.rm": 0,
  });
  assert.equal(result.receipt.cleanup.oldForensicRootUnchanged, true);
  assert.equal(result.oldForensicSnapshotSha256After, result.oldForensicSnapshotSha256);
  assert.equal(result.receipt.cleanupStatus, "PROVEN_ABSENT");
  assert.deepEqual(result.rootEntries, [
    "cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json",
  ]);
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.postgresConnections, 0);
  assert.equal(result.sqlStatements, 0);
  assert.equal(result.productNetworkEffects, 0);
});

test("cleanup rescue exact-owned maximum path is one-use and bounded by the closed Docker vector", async () => {
  const result = await runLocalPostgresCleanupRescueFakePlan({
    container: "owned_running", network: "owned_stopped", volume: "owned_stopped", duplicateConsume: true,
  });
  assert.equal(result.status, "GREEN");
  assert.deepEqual(result.calls, [
    "version", "container.inspect", "network.inspect", "volume.inspect", "container.stop", "container.rm",
    "network.rm", "volume.rm", "container.inspect", "network.inspect", "volume.inspect",
  ]);
  assert.deepEqual(result.mutations, ["container.stop", "container.rm", "network.rm", "volume.rm"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.effects.dockerCallCounts)), {
    version: 1, "image.inspect": 0, "image.pull": 0,
    "container.inspect": 2, "container.create": 0, "container.start": 0, "container.stop": 1, "container.rm": 1,
    "network.inspect": 2, "network.create": 0, "network.rm": 1,
    "volume.inspect": 2, "volume.create": 0, "volume.rm": 1,
  });
  assert.equal(result.duplicateCode, "local_postgres_cleanup_rescue_duplicate_consume");
  assert.equal(result.duplicateAddedCalls, 0);
  assert.equal(result.receipt.cleanup.oldForensicRootUnchanged, true);
  assert.equal(result.oldForensicSnapshotSha256After, result.oldForensicSnapshotSha256);
  assert.equal(result.physicalEffects, 0);
});

test("cleanup rescue foreign, malformed, ambiguous, and host-drift preflights are body-free and mutation-free", async () => {
  const cases = [
    { input: { container: "foreign" }, code: "local_postgres_resource_ownership_invalid" },
    { input: { network: "malformed" }, code: "local_postgres_docker_call_failed" },
    { input: { volume: "ambiguous" }, code: "local_postgres_docker_call_failed" },
    { input: { hostDriftAt: "container.inspect:before" }, code: "local_postgres_docker_cli_drift" },
    { input: { hostDriftAt: "network.inspect:after" }, code: "local_postgres_docker_cli_drift" },
    { input: { blockedDriftAt: 2 }, code: "local_postgres_cleanup_rescue_forensic_drift" },
    { input: { clockExpiredAt: "container.inspect:before" }, code: "local_postgres_cleanup_rescue_grant_expired" },
  ] as const;
  for (const item of cases) {
    const result = await runLocalPostgresCleanupRescueFakePlan(item.input);
    assert.equal(result.status, "FAILED", JSON.stringify(item.input));
    assert.equal(result.code, item.code, JSON.stringify(item.input));
    assert.equal(result.receipt.cleanupStatus, "BLOCKED");
    assert.equal(result.receipt.readiness.cleanupRescueGreen, false);
    assert.deepEqual(result.mutations, [], JSON.stringify(item.input));
    if ("blockedDriftAt" in item.input) assert.deepEqual(result.calls, []);
    assert.equal(result.receipt.cleanup.oldForensicRootUnchanged, true);
    assert.equal(result.physicalEffects, 0);
    assert.equal(result.postgresConnections, 0);
    assert.equal(result.sqlStatements, 0);
  }
  const ambiguous = await runLocalPostgresCleanupRescueFakePlan({ volume: "ambiguous", duplicateConsume: true });
  assert.equal(ambiguous.status, "FAILED");
  assert.equal(ambiguous.openEffectCount, 1);
  assert.equal(ambiguous.duplicateCode, "local_postgres_cleanup_rescue_duplicate_consume");
  assert.equal(ambiguous.duplicateAddedCalls, 0);
});

test("cleanup rescue crash recovery never replays an open Docker effect and freezes BLOCKED evidence", async () => {
  const result = await runLocalPostgresCleanupRescueFakePlan({
    crashAt: "container.inspect:after_call_before_completion",
  });
  assert.equal(result.simulatedCrash, true);
  assert.equal(result.recoveryAddedCalls, 0);
  assert.deepEqual(result.calls, ["version", "container.inspect"]);
  assert.deepEqual(result.mutations, []);
  assert.equal(result.status, "FAILED");
  assert.equal(result.code, "local_postgres_cleanup_rescue_blocked");
  assert.equal(result.receipt.cleanupStatus, "BLOCKED");
  assert.equal(result.receipt.readiness.cleanupRescueGreen, false);
  assert.equal(result.receipt.cleanup.oldForensicRootUnchanged, true);
  assert.equal(result.openEffectCount, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(result.receipt.effects.dockerCallCounts)), {
    version: 1, "image.inspect": 0, "image.pull": 0,
    "container.inspect": 1, "container.create": 0, "container.start": 0,
    "container.stop": 0, "container.rm": 0,
    "network.inspect": 0, "network.create": 0, "network.rm": 0,
    "volume.inspect": 0, "volume.create": 0, "volume.rm": 0,
  });
  assert.deepEqual(result.rootEntries, [
    "cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json",
  ]);
  assert.equal(result.oldForensicSnapshotSha256After, result.oldForensicSnapshotSha256);
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.postgresConnections, 0);
  assert.equal(result.sqlStatements, 0);
  assert.equal(result.productNetworkEffects, 0);

  const afterRemove = await runLocalPostgresCleanupRescueFakePlan({
    container: "owned_stopped", crashAt: "container.rm:after_call_before_completion",
  });
  assert.equal(afterRemove.simulatedCrash, true);
  assert.equal(afterRemove.recoveryAddedCalls, 0);
  assert.deepEqual(afterRemove.calls, [
    "version", "container.inspect", "network.inspect", "volume.inspect", "container.rm",
  ]);
  assert.deepEqual(afterRemove.mutations, ["container.rm"]);
  assert.equal(afterRemove.status, "FAILED");
  assert.equal(afterRemove.code, "local_postgres_cleanup_rescue_blocked");
  assert.equal(afterRemove.openEffectCount, 1);
  assert.equal(afterRemove.receipt.effects.dockerCallCounts["container.rm"], 1);
  assert.deepEqual(afterRemove.rootEntries, result.rootEntries);
  assert.equal(afterRemove.oldForensicSnapshotSha256After, afterRemove.oldForensicSnapshotSha256);
});

test("cleanup rescue receipt cross-binding mutations fail before acceptance", () => {
  for (const mutation of [
    "top_extra", "authority", "lineage", "artifacts", "blocked", "host", "effects", "cleanup",
    "journal", "readiness", "consumed", "status",
  ]) {
    const result = runLocalPostgresCleanupRescueReceiptValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.code, "local_postgres_cleanup_rescue_receipt_invalid", mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
});

test("cleanup rescue CLI is versioned, path-closed, and does not widen ordinary prepare or physical", () => {
  const rescueRoot = "/private/r4-cleanup-rescue";
  const blockedRoot = "/private/tmp/forme-r4-pg-9ZGIOLeX";
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare-rescue", "--rescue-root", rescueRoot, "--blocked-root", blockedRoot,
    "--rescue-review-head", "a".repeat(40), "--owner-approval-receipt", `${rescueRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), {
    mode: "prepare-rescue", rescueRoot, blockedRoot, rescueOwnerReviewHead: "a".repeat(40),
    ownerApprovalReceiptPath: `${rescueRoot}/owner-approval-receipt`, createdAt: NOW,
    expiresAt: "2026-08-11T19:00:00.000Z",
  });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "rescue", "--rescue-root", rescueRoot, "--blocked-root", blockedRoot,
    "--evidence-out", `${rescueRoot}/cleanup-rescue-evidence.json`,
  ]), { mode: "rescue", rescueRoot, blockedRoot, evidenceOut: `${rescueRoot}/cleanup-rescue-evidence.json` });
  for (const argv of [
    ["prepare-rescue", "--rescue-root", rescueRoot, "--blocked-root", "/private/other",
      "--rescue-review-head", "a".repeat(40), "--owner-approval-receipt", `${rescueRoot}/owner-approval-receipt`,
      "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z"],
    ["rescue", "--rescue-root", rescueRoot, "--blocked-root", "/private/other",
      "--evidence-out", `${rescueRoot}/cleanup-rescue-evidence.json`],
    ["rescue", "--blocked-root", blockedRoot, "--rescue-root", rescueRoot,
      "--evidence-out", `${rescueRoot}/cleanup-rescue-evidence.json`],
  ]) assert.throws(() => parseLocalPostgresRunnerArguments(argv), LocalPostgresRunnerError);
  assert.equal(typeof prepareLocalPostgresCleanupRescueGrant, "function");
  assert.equal(typeof runApprovedLocalPostgresCleanupRescue, "function");
});

test("body-free diagnostic authority and grant contracts reject every hostile binding family", () => {
  const authorityGreen = runLocalPostgresBodyFreeDiagnosticAuthorityFakePlan();
  assert.equal(authorityGreen.accepted, true);
  assert.equal(authorityGreen.physicalEffects, 0);
  for (const mutation of [
    "duplicate_marker", "prefixed_marker", "top_extra", "authority", "lineage", "artifacts",
    "blocked", "failed_rescue", "host", "ceiling",
  ]) {
    const result = runLocalPostgresBodyFreeDiagnosticAuthorityFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(runLocalPostgresBodyFreeDiagnosticGrantValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "missing_key", "schema", "grant_id", "owner_receipt", "authority", "lineage",
    "artifacts", "blocked", "failed_rescue", "host", "ceiling", "docker_ceiling", "local_only",
    "production", "expired", "future_created",
  ]) {
    const result = runLocalPostgresBodyFreeDiagnosticGrantValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(typeof validateBodyFreeDiagnosticGrant, "function");
});

test("body-free diagnostic construction and authority-path correction close four exact committed steps", () => {
  const rescueReview = "ac1dfea899f2edff6ec59dd401d8aec6256a485f";
  const constructionAddendum = "931dbb7278bb06bf219ae7553b4317db415de0e7";
  const constructionReview = "fcb1a5bc20832bdc63d0c7cfd6ff49ed1cf20e9e";
  const pathCorrection = "0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb";
  const pathCorrectionReview = "725b02338db4aa53517929c28912ef2092732631";
  assertHistoricalAuthorityStep({
    head: constructionAddendum, parent: rescueReview,
    tree: "22db25181c284d980f4e5d9cbf5cd5e3d7c6a725", status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-ADDENDUM.md",
    artifactSha256: "sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13",
  });
  assertHistoricalAuthorityStep({
    head: constructionReview, parent: constructionAddendum,
    tree: "1541a8dbd4d425b7faeebd66fa417a035f10f5b3", status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW.md",
    artifactSha256: "sha256:a3dbb56df2fefbb05eef9a1175c49b9afb1a83982909309d5ba230c735222579",
  });
  assertHistoricalAuthorityStep({
    head: pathCorrection, parent: constructionReview,
    tree: "50e5bcc3b6dcec268f619e3b8399cc92e323da70", status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-AUTHORITY-PATH-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00",
  });
  assertHistoricalAuthorityStep({
    head: pathCorrectionReview, parent: pathCorrection,
    tree: "e3a4d568a1c9ba9e47c87d01e4b7129687aa13f1", status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-AUTHORITY-PATH-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:a7448857f699507babb31477e67e6cf1491d3297a74ed1479de92300e00be1f7",
  });
});

test("body-free diagnostic future effect authority uses only the corrected V1 paths", async () => {
  const source = await readFile(path.resolve("scripts/r4-public-core-local-postgres.mjs"), "utf8");
  assert.match(source, /const BODY_FREE_DIAGNOSTIC_CARD_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD-V1\.md"/u);
  assert.match(source, /const BODY_FREE_DIAGNOSTIC_EXECUTION_REVIEW_PATH = "docs\/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW-V1\.md"/u);
  assert.match(source, /new Map\(\[\[BODY_FREE_DIAGNOSTIC_CARD_PATH, "A"\]\]\)/u);
  assert.match(source, /new Map\(\[\[BODY_FREE_DIAGNOSTIC_EXECUTION_REVIEW_PATH, "A"\]\]\)/u);
  assert.equal(source.includes('new Map([[BODY_FREE_DIAGNOSTIC_REVIEW_PATH, "M"]])'), false);
});

test("body-free diagnostic prepare is zero-effect, exact-root, and forensic-drift closed", () => {
  const green = runLocalPostgresBodyFreeDiagnosticPrepareFakePlan();
  assert.equal(green.status, "GREEN");
  assert.deepEqual(green.rootEntries, ["diagnostic.pending.json", "owner-approval-receipt"]);
  assert.equal(green.grant.schemaVersion,
    "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-grant.v1");
  assert.equal(green.grant.localOnly, true);
  assert.equal(green.grant.productionEffectsAllowed, false);
  assert.equal(green.grant.ceilings.maximumDiagnosticLifecycles, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(green.grant.ceilings.dockerCalls)), {
    version: 1, "image.inspect": 0, "image.pull": 0,
    "container.inspect": 1, "container.create": 0, "container.start": 0,
    "container.stop": 0, "container.rm": 0,
    "network.inspect": 0, "network.create": 0, "network.rm": 0,
    "volume.inspect": 0, "volume.create": 0, "volume.rm": 0,
  });
  assert.equal(green.physicalEffects, 0);
  for (const mutation of ["blocked", "failed_rescue", "expired", "root_extra"]) {
    const result = runLocalPostgresBodyFreeDiagnosticPrepareFakePlan({ mutation });
    assert.equal(result.status, "FAILED", mutation);
    assert.equal(result.grant, null, mutation);
    assert.equal(result.rootEntries.includes("diagnostic.pending.json"), false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(typeof prepareBodyFreeDockerInspectDiagnosticGrant, "function");
});

test("body-free diagnostic prepare classifies every stage edge without leaking raw failure bodies", () => {
  for (const stage of LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_STAGES) {
    for (const edge of ["before", "after"] as const) {
      const result = runLocalPostgresBodyFreeDiagnosticPrepareFakePlan({ stage, edge });
      assert.equal(result.status, "FAILED", `${stage}:${edge}`);
      assert.equal(result.prepareStage, stage, `${stage}:${edge}`);
      assert.equal(result.code, stage === "PENDING_ROLLBACK"
        ? "local_postgres_body_free_diagnostic_prepare_rollback_failed"
        : "local_postgres_body_free_diagnostic_prepare_failed", `${stage}:${edge}`);
      assert.equal(result.receipt, null, `${stage}:${edge}`);
      assert.equal(result.grant, null, `${stage}:${edge}`);
      assert.equal(result.physicalEffects, 0, `${stage}:${edge}`);
      assert.equal(result.rootEntries.includes("private fake prepare failure body"), false, `${stage}:${edge}`);
      if (stage === "PENDING_ROLLBACK") {
        assert.deepEqual(result.rootEntries, ["diagnostic.pending.json", "owner-approval-receipt"], `${stage}:${edge}`);
      } else {
        assert.deepEqual(result.rootEntries, ["owner-approval-receipt"], `${stage}:${edge}`);
      }
    }
  }
});

test("body-free diagnostic prepare CLI returns one closed code and stage", () => {
  const runner = path.resolve("scripts/r4-public-core-local-postgres.mjs");
  let stderr = "";
  assert.throws(() => execFileSync(process.execPath, [
    runner, "prepare-inspect-diagnostic", "--diagnostic-root", "/private/forme-r4-missing-diagnostic-root",
    "--blocked-root", "/private/tmp/forme-r4-pg-9ZGIOLeX",
    "--rescue-root", "/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn",
    "--diagnostic-review-head", "a".repeat(40),
    "--owner-approval-receipt", "/private/forme-r4-missing-diagnostic-root/owner-approval-receipt",
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error: unknown) => {
    if (typeof error !== "object" || error === null || !("stderr" in error)) return false;
    stderr = String(error.stderr);
    return true;
  });
  assert.deepEqual(JSON.parse(stderr), {
    schemaVersion: "r4.public-core-local-postgres-error.v3",
    code: "local_postgres_body_free_diagnostic_prepare_failed",
    prepareStage: "PRIVATE_ROOT",
  });
});

test("body-free diagnostic captures exact body-free fingerprints without cleanup authority", async () => {
  const expected = {
    missing: ["COMPLETED", "MATCHED_EXISTING_MISSING", "NOT_APPLICABLE"],
    found_owned: ["COMPLETED", "FOUND_JSON", "OWNED"],
    found_foreign: ["COMPLETED", "FOUND_JSON", "FOREIGN"],
    found_unlabelled: ["COMPLETED", "FOUND_JSON", "UNLABELLED"],
    found_malformed: ["COMPLETED", "FOUND_JSON", "MALFORMED"],
    unclassified_nonzero: ["COMPLETED", "UNCLASSIFIED_NONZERO", "NOT_APPLICABLE"],
    invalid_utf8: ["COMPLETED", "UNCLASSIFIED_NONZERO", "NOT_APPLICABLE"],
    multiline: ["COMPLETED", "UNCLASSIFIED_NONZERO", "NOT_APPLICABLE"],
    timeout: ["TIMED_OUT", "AMBIGUOUS_TRANSPORT", "NOT_APPLICABLE"],
    signal: ["SIGNALED", "AMBIGUOUS_TRANSPORT", "NOT_APPLICABLE"],
    spawn_error: ["SPAWN_ERROR", "AMBIGUOUS_TRANSPORT", "NOT_APPLICABLE"],
    truncated: ["SPAWN_ERROR", "AMBIGUOUS_TRANSPORT", "NOT_APPLICABLE"],
    unknown: ["UNKNOWN", "AMBIGUOUS_TRANSPORT", "NOT_APPLICABLE"],
    contract_invalid: ["COMPLETED", "CONTRACT_INVALID", "MALFORMED"],
  } as const;
  for (const [scenario, tuple] of Object.entries(expected)) {
    const result = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario });
    assert.equal(result.status, "OBSERVED", scenario);
    assert.deepEqual(result.calls.map((call: { kind: string }) => call.kind), ["version", "container.inspect"], scenario);
    assert.deepEqual(result.calls[0].argv, ["version", "--format", "{{json .}}"], scenario);
    assert.deepEqual(result.calls[1].argv, [
      "container", "inspect", "--format", "{{json .}}",
      "forme-r4-public-core-local-b92ae04555cc3d69",
    ], scenario);
    const observation = result.receipt.observations[1];
    assert.deepEqual([
      observation.spawnOutcome, observation.diagnosticClassification, observation.ownershipClassification,
    ], tuple, scenario);
    assert.match(observation.stdoutSha256, /^sha256:[0-9a-f]{64}$/u, scenario);
    assert.match(observation.stderrSha256, /^sha256:[0-9a-f]{64}$/u, scenario);
    assert.equal(Object.hasOwn(observation, "stdout"), false, scenario);
    assert.equal(Object.hasOwn(observation, "stderr"), false, scenario);
    const receiptBytes = JSON.stringify(result.receipt);
    for (const forbiddenBody of ["partial-output", "partial-error", "first\\nsecond", "unexpected\\n"]) {
      assert.equal(receiptBytes.includes(forbiddenBody), false, `${scenario}:${forbiddenBody}`);
    }
    assert.equal(result.rawBuffersCleared, true, scenario);
    assert.equal(result.openEffectCount, 0, scenario);
    assert.deepEqual(result.rootEntries, [
      "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
      "docker-inspect-diagnostic-journal-v1", "owner-approval-receipt",
    ], scenario);
    assert.equal(result.receipt.readiness.resourceAbsenceProven, false, scenario);
    assert.equal(result.receipt.readiness.cleanupRescueGreen, false, scenario);
    assert.equal(result.receipt.readiness.physicalExecutionPerformed, false, scenario);
    assert.equal(result.receipt.readiness.gateCReady, false, scenario);
    assert.equal(result.physicalEffects, 0, scenario);
    assert.equal(result.socketCalls, 0, scenario);
    assert.equal(result.postgresConnections, 0, scenario);
    assert.equal(result.sqlStatements, 0, scenario);
  }
});

test("body-free diagnostic fingerprints invalid UTF-8 and line structure without retaining bodies", async () => {
  const invalid = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "invalid_utf8" });
  assert.equal(invalid.receipt.observations[1].stdoutUtf8, false);
  assert.equal(invalid.receipt.observations[1].stdoutBytes, 2);
  assert.equal(invalid.receipt.observations[1].stdoutLineEndings, "NONE");
  assert.equal(invalid.receipt.observations[1].stdoutLineCount, 1);
  const multiline = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "multiline" });
  assert.equal(multiline.receipt.observations[1].stderrUtf8, true);
  assert.equal(multiline.receipt.observations[1].stderrLineEndings, "LF");
  assert.equal(multiline.receipt.observations[1].stderrLineCount, 2);
  const crlf = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "unclassified_nonzero" });
  assert.equal(crlf.receipt.observations[1].stderrLineEndings, "CRLF");
  assert.equal(crlf.receipt.observations[1].stderrLineCount, 2);
});

test("body-free diagnostic is one-use, write-ahead, crash-closed, and drift-denying", async () => {
  const duplicate = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "missing", duplicateConsume: true });
  assert.equal(duplicate.status, "OBSERVED");
  assert.equal(duplicate.duplicateCode, "local_postgres_body_free_diagnostic_duplicate_consume");
  assert.equal(duplicate.duplicateAddedCalls, 0);
  assert.equal(duplicate.journalEntryCount, 9);
  for (const crashAt of [
    "grant.consume.link:after", "grant.consume.unlink_pending:after", "grant.consumed:after",
  ] as const) {
    const preCallCrash = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "missing", crashAt });
    assert.equal(preCallCrash.simulatedCrash, true, crashAt);
    assert.equal(preCallCrash.status, "FAILED", crashAt);
    assert.equal(preCallCrash.calls.length, 0, crashAt);
    assert.equal(preCallCrash.journalEntryCount, 2, crashAt);
    assert.equal(preCallCrash.openEffectCount, 0, crashAt);
    assert.deepEqual(preCallCrash.rootEntries, [
      "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
      "docker-inspect-diagnostic-journal-v1", "owner-approval-receipt",
    ], crashAt);
  }
  const crashed = await runLocalPostgresBodyFreeDiagnosticFakePlan({
    scenario: "missing", crashAt: "container.inspect:after_call_before_completion",
  });
  assert.equal(crashed.simulatedCrash, true);
  assert.equal(crashed.recoveryAddedCalls, 0);
  assert.equal(crashed.status, "OBSERVED");
  assert.equal(crashed.receipt.observations[1].spawnOutcome, "UNKNOWN");
  assert.equal(crashed.receipt.observations[1].diagnosticClassification, "AMBIGUOUS_TRANSPORT");
  assert.equal(crashed.openEffectCount, 0);
  for (const input of [
    { scenario: "missing", clockExpiredAt: "version:before" },
    { scenario: "missing", hostDriftAt: "version:before" },
  ] as const) {
    const result = await runLocalPostgresBodyFreeDiagnosticFakePlan(input);
    assert.equal(result.status, "FAILED", JSON.stringify(input));
    assert.equal(result.calls.length, 0, JSON.stringify(input));
    assert.equal(result.openEffectCount, 0, JSON.stringify(input));
    assert.equal(result.physicalEffects, 0, JSON.stringify(input));
  }
  const forensic = await runLocalPostgresBodyFreeDiagnosticFakePlan({ scenario: "missing", forensicDriftAt: 3 });
  assert.equal(forensic.status, "FAILED");
  assert.equal(forensic.calls.length, 1);
  assert.equal(forensic.receipt.closure.blockedRootUnchanged, true);
  assert.equal(forensic.receipt.closure.failedRescueRootUnchanged, true);
});

test("body-free diagnostic receipt and journal hostile mutations never validate", () => {
  assert.equal(runLocalPostgresBodyFreeDiagnosticReceiptValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "authority", "lineage", "artifacts", "blocked", "failed_rescue",
    "host", "effects", "observation", "closure", "journal", "readiness", "consumed", "status_code", "accessor",
  ]) {
    const result = runLocalPostgresBodyFreeDiagnosticReceiptValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.code, "local_postgres_body_free_diagnostic_receipt_invalid", mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(runLocalPostgresBodyFreeDiagnosticJournalValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of ["top_extra", "sequence", "previous", "event", "detail", "entry_sha"]) {
    const result = runLocalPostgresBodyFreeDiagnosticJournalValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
});

test("body-free diagnostic CLI is versioned, path-closed, and separate from rescue and physical", () => {
  const diagnosticRoot = "/private/r4-diagnostic";
  const blockedRoot = "/private/tmp/forme-r4-pg-9ZGIOLeX";
  const rescueRoot = "/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn";
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare-inspect-diagnostic", "--diagnostic-root", diagnosticRoot, "--blocked-root", blockedRoot,
    "--rescue-root", rescueRoot, "--diagnostic-review-head", "a".repeat(40),
    "--owner-approval-receipt", `${diagnosticRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), {
    mode: "prepare-inspect-diagnostic", diagnosticRoot, blockedRoot, rescueRoot,
    diagnosticOwnerReviewHead: "a".repeat(40), ownerApprovalReceiptPath: `${diagnosticRoot}/owner-approval-receipt`,
    createdAt: NOW, expiresAt: "2026-08-11T19:00:00.000Z",
  });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "inspect-diagnostic", "--diagnostic-root", diagnosticRoot, "--blocked-root", blockedRoot,
    "--rescue-root", rescueRoot, "--evidence-out", `${diagnosticRoot}/docker-inspect-diagnostic-evidence.json`,
  ]), {
    mode: "inspect-diagnostic", diagnosticRoot, blockedRoot, rescueRoot,
    evidenceOut: `${diagnosticRoot}/docker-inspect-diagnostic-evidence.json`,
  });
  for (const argv of [
    ["prepare-inspect-diagnostic", "--diagnostic-root", diagnosticRoot, "--blocked-root", "/private/other",
      "--rescue-root", rescueRoot, "--diagnostic-review-head", "a".repeat(40),
      "--owner-approval-receipt", `${diagnosticRoot}/owner-approval-receipt`,
      "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z"],
    ["inspect-diagnostic", "--diagnostic-root", diagnosticRoot, "--blocked-root", blockedRoot,
      "--rescue-root", "/private/other", "--evidence-out", `${diagnosticRoot}/docker-inspect-diagnostic-evidence.json`],
    ["inspect-diagnostic", "--blocked-root", blockedRoot, "--diagnostic-root", diagnosticRoot,
      "--rescue-root", rescueRoot, "--evidence-out", `${diagnosticRoot}/docker-inspect-diagnostic-evidence.json`],
  ]) assert.throws(() => parseLocalPostgresRunnerArguments(argv), LocalPostgresRunnerError);
  assert.equal(typeof prepareBodyFreeDockerInspectDiagnosticGrant, "function");
  assert.equal(typeof runApprovedBodyFreeDockerInspectDiagnostic, "function");
});

test("integration campaign correction binds the committed Addendum/Review and exact closed workset", () => {
  assertHistoricalAuthorityStep({
    head: "98d0a4998252c5f14cf86b9dc8d17469da1325d2",
    parent: "00acfdaecc9e2e3e5141d163188a50efca066b75",
    tree: "8a2e4dc284d86f826e8f48fb7d4a9c4f586a109b",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V2.md",
    artifactSha256: "sha256:03954591d737ff89ffd8bdd61a366cdbeed8691c0d7519abbebde154ae3d142a",
  });
  assertHistoricalAuthorityStep({
    head: "4118a5ec7ae5f1d8a04caeb4cfbcca5715177270",
    parent: "98d0a4998252c5f14cf86b9dc8d17469da1325d2",
    tree: "ed97f07f5b1a80d3331ae6ab424366b1527a7728",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V2.md",
    artifactSha256: "sha256:0cdfad9f1ab7da65692fe5ed3ca02c0c6060610b4233f3e74824e851c276aa50",
  });
  assertHistoricalAuthorityStep({
    head: "5878e51dbf12999a31f99e72d734bd49a63e9f20",
    parent: "4118a5ec7ae5f1d8a04caeb4cfbcca5715177270",
    tree: "ea74620b70369698230ceae9d172c6b7e88e254a",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-PLATFORM-SELECT-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:c338c17b796d911c8cd7f9733193dda4f37515bd0f2e30733b1b6d0f589d560d",
  });
  assertHistoricalAuthorityStep({
    head: "e548933a598c9e62c99dc0caaf4c52b7bf13ff32",
    parent: "5878e51dbf12999a31f99e72d734bd49a63e9f20",
    tree: "75c73c16c81ee3dafd082dfac3bf4758068f474f",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-PLATFORM-SELECT-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:f2eec2aef67784f08567abc6bf2354e906a61c92527cc9813b6315a6030466a8",
  });
  assertHistoricalAuthorityStep({
    head: "b9494e1989d45cab9c35463f9182e1d6ee2c82bb",
    parent: "27bbb085c63e7c4b6d6ffbe4fa3d51ab3984649d",
    tree: "6a75a8965d30f5f228655b866dd95bd685fbdd3c",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-CARD-V3.md",
    artifactSha256: "sha256:37adbcbb3dcf568b21a93a3392f079ef9155533105829b6710a88557917c28d9",
  });
  assertHistoricalAuthorityStep({
    head: "c0382bedf25afc9464254f0d3b3f461e4a364e12",
    parent: "b9494e1989d45cab9c35463f9182e1d6ee2c82bb",
    tree: "1268459f984087419b24db66f2a11fb322eb4f78",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-EXECUTION-OWNER-REVIEW-V3.md",
    artifactSha256: "sha256:c00dece66c93e03143e1bf85bfe3f57e5bdd24c5ffe1bb75df09976311e46a0d",
  });
  assertHistoricalAuthorityStep({
    head: "25cf2b400d96a86c8017f7dbc2e2186fff7e9180",
    parent: "c0382bedf25afc9464254f0d3b3f461e4a364e12",
    tree: "d858b46c9f6e83edd57db22033ce7458952f774f",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-FINGERPRINT-CORRECTION-ADDENDUM.md",
    artifactSha256: "sha256:ef63d738a208c3c2469e8c7f290daaf9ffe2e8166b696239436a3b22abf4bf39",
  });
  assertHistoricalAuthorityStep({
    head: "eb9b3904131a682da6a85677494e97e5e2149bdb",
    parent: "25cf2b400d96a86c8017f7dbc2e2186fff7e9180",
    tree: "d92ce1354685205ddc64c3c3e1dc455cd8ecbce1",
    status: "A",
    artifactPath: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-FINGERPRINT-CORRECTION-OWNER-REVIEW.md",
    artifactSha256: "sha256:f09f4b010a535dca9f9d11d9e07a31e82bd5a6e9b607def85648808130756c37",
  });
  assert.equal(verifyLocalPostgresIntegrationCampaignHistoricalPrefix(), true);
  const green = runLocalPostgresIntegrationCampaignAuthorityFakePlan({ mutation: "none" });
  assert.equal(green.accepted, true);
  assert.equal(green.physicalEffects, 0);
  assert.equal(green.authority.addendumHead, "25cf2b400d96a86c8017f7dbc2e2186fff7e9180");
  assert.equal(green.authority.addendumTree, "d858b46c9f6e83edd57db22033ce7458952f774f");
  assert.equal(green.authority.addendumSha256, "sha256:ef63d738a208c3c2469e8c7f290daaf9ffe2e8166b696239436a3b22abf4bf39");
  assert.equal(green.authority.reviewHead, "eb9b3904131a682da6a85677494e97e5e2149bdb");
  assert.equal(green.authority.reviewTree, "d92ce1354685205ddc64c3c3e1dc455cd8ecbce1");
  assert.equal(green.authority.reviewSha256, "sha256:f09f4b010a535dca9f9d11d9e07a31e82bd5a6e9b607def85648808130756c37");
  assert.deepEqual(green.authority.implementationPaths, [
    "scripts/r4-public-core-local-postgres.mjs", "test/r4/public-core-local-postgres.test.ts",
  ]);
  assert.deepEqual(green.authority.evidencePaths, [
    "docs/evidence/r4-public-core-local-postgres-integration-campaign-inspect-fingerprint-correction.json",
    "schemas/r4/public-core/local-postgres-integration-campaign-inspect-fingerprint-correction-artifact-index.json",
    "schemas/r4/public-core/local-postgres-integration-campaign-inspect-fingerprint-correction-evidence.schema.json",
  ]);
  assert.equal(execFileSync("/usr/bin/git", ["rev-parse", "eb9b3904131a682da6a85677494e97e5e2149bdb^"], {
    cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8",
  }).trim(), "25cf2b400d96a86c8017f7dbc2e2186fff7e9180");
  for (const mutation of ["packet", "review", "topology", "workset", "marker", "old_authority"]) {
    const result = runLocalPostgresIntegrationCampaignAuthorityFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.code, "local_postgres_integration_campaign_authority_invalid", mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
});

test("integration campaign fake and production share the exact one-LF raw inspect parser", () => {
  const kinds = ["image.inspect", "container.inspect", "network.inspect", "volume.inspect"] as const;
  for (const kind of kinds) {
    const missing = runLocalPostgresIntegrationCampaignRawParserFakePlan({ kind, scenario: "missing" });
    assert.equal(missing.parserOutcome, "MISSING_EXACT", kind);
    assert.equal(missing.classification, "MISSING", kind);
    assert.equal(missing.ownership, "NOT_PRESENT", kind);
    assert.deepEqual({
      spawnOutcome: missing.diagnostic.spawnOutcome,
      exitStatus: missing.diagnostic.exitStatus,
      signal: missing.diagnostic.signal,
      stdoutBytes: missing.diagnostic.stdoutBytes,
      stdoutSha256: missing.diagnostic.stdoutSha256,
      stdoutUtf8: missing.diagnostic.stdoutUtf8,
      stdoutEmpty: missing.diagnostic.stdoutEmpty,
      stdoutLineEndings: missing.diagnostic.stdoutLineEndings,
      stdoutLineCount: missing.diagnostic.stdoutLineCount,
    }, {
      spawnOutcome: "COMPLETED", exitStatus: 1, signal: "NONE", stdoutBytes: 1,
      stdoutSha256: "sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
      stdoutUtf8: true, stdoutEmpty: false, stdoutLineEndings: "LF", stdoutLineCount: 1,
    }, kind);
    assert.equal(missing.diagnostic.stderrUtf8, true, kind);
    assert.equal(missing.diagnostic.stderrEmpty, false, kind);
    assert.equal(missing.diagnostic.stderrLineEndings, "LF", kind);
    assert.equal(missing.diagnostic.stderrLineCount, 1, kind);
    assert.equal(missing.rawStdoutZeroed, true, kind);
    assert.equal(missing.rawStderrZeroed, true, kind);
    assert.equal(missing.physicalEffects, 0, kind);
  }
  for (const scenario of ["empty_stdout", "crlf_stdout", "double_lf_stdout", "prefix_stdout",
    "suffix_stdout", "wrong_name", "wrong_status", "signal", "timeout"] as const) {
    for (const kind of kinds) {
      const result = runLocalPostgresIntegrationCampaignRawParserFakePlan({ kind, scenario });
      assert.notEqual(result.parserOutcome, "MISSING_EXACT", `${kind}:${scenario}`);
      assert.equal(result.classification, "UNKNOWN", `${kind}:${scenario}`);
      assert.equal(result.ownership, "UNKNOWN", `${kind}:${scenario}`);
      assert.equal(result.rawStdoutZeroed, true, `${kind}:${scenario}`);
      assert.equal(result.rawStderrZeroed, true, `${kind}:${scenario}`);
      assert.equal(result.physicalEffects, 0, `${kind}:${scenario}`);
    }
  }
  for (const [scenario, classification, ownership] of [
    ["owned", "OWNED", "EXACT_HISTORICAL_GRANT"],
    ["foreign", "FOREIGN", "FOREIGN"],
    ["unlabelled", "UNLABELLED", "UNLABELLED"],
    ["malformed", "MALFORMED", "MALFORMED"],
  ] as const) {
    const result = runLocalPostgresIntegrationCampaignRawParserFakePlan({ kind: "container.inspect", scenario });
    assert.equal(result.parserOutcome, "SUCCESS", scenario);
    assert.equal(result.classification, classification, scenario);
    assert.equal(result.ownership, ownership, scenario);
  }
});

test("integration campaign admits only the captured body-free container-missing fingerprint", () => {
  const green = runLocalPostgresIntegrationCampaignMissingFingerprintFakePlan({ mutation: "none" });
  assert.equal(green.accepted, true);
  assert.equal(green.physicalEffects, 0);
  for (const mutation of [
    "kind", "target", "spawn", "exit", "signal",
    "stdout_bytes", "stdout_sha", "stdout_utf8", "stdout_empty", "stdout_endings", "stdout_lines",
    "stderr_bytes", "stderr_sha", "stderr_utf8", "stderr_empty", "stderr_endings", "stderr_lines",
  ]) {
    const result = runLocalPostgresIntegrationCampaignMissingFingerprintFakePlan({ mutation });
    assert.equal(result.accepted, false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(green.schemaVersion,
    "r4.public-core-local-postgres-integration-campaign-missing-fingerprint-fake-result.v4");
});

test("integration campaign all-missing path reaches one frozen physical Green and exact zero residue", async () => {
  const result = await runLocalPostgresIntegrationCampaignFakePlan();
  assert.equal(result.status, "GREEN");
  assert.equal(result.code, "local_postgres_integration_campaign_green");
  assert.equal(result.receiptValid, true);
  assert.deepEqual(result.calls.map((call: any) => call.kind), [
    "version", "container.inspect", "network.inspect", "volume.inspect", "physical:rehearsal",
  ]);
  assert.deepEqual(result.receipt.phases, {
    diagnostic: 1, historicalCleanup: 0, physicalConstruction: 1, physicalCleanupRecoveries: 0,
  });
  assert.equal(result.receipt.readiness.historicalResourcesAbsent, true);
  assert.equal(result.receipt.readiness.physicalExecuted, true);
  assert.equal(result.receipt.readiness.targetPostgresObserved, true);
  assert.equal(result.receipt.readiness.productRuntimeEffects, false);
  assert.equal(result.receipt.readiness.productionEffects, false);
  assert.equal(result.receipt.readiness.trafficReady, false);
  assert.equal(result.receipt.readiness.gateCReady, false);
  assert.deepEqual(result.receipt.physical.catalog, CATALOG);
  assert.equal(result.receipt.physical.postgresServerVersionNum, 160010);
  assert.equal(result.receipt.physical.schemaApplyCount, 3);
  assert.equal(result.receipt.physical.verifyCount, 3);
  assert.equal(result.receipt.physical.rollbackCount, 1);
  assert.equal(result.receipt.physical.domainActionInvocationCount, 23);
  assert.equal(result.receipt.physical.distinctDomainActionCount, 20);
  assert.equal(result.receipt.physical.containerRestartCount, 1);
  assert.equal(result.receipt.physical.databaseIdentityCount, 2);
  assert.equal(result.receipt.effects.physicalRehearsalAttemptCount, 1);
  assert.equal(result.receipt.effects.physicalRehearsalCompletionCount, 1);
  assert.equal(result.receipt.cleanup.historicalContainerState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.historicalNetworkState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.historicalVolumeState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.freshContainerState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.freshNetworkState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.freshVolumeState, "PROVEN_ABSENT");
  assert.equal(result.receipt.cleanup.ownedCredentialCount, 0);
  assert.equal(result.receipt.cleanup.ownedDockerConfigCount, 0);
  assert.equal(result.receipt.cleanup.ownedImportedRuntimeCount, 0);
  assert.equal(result.receipt.cleanup.activeCoordinatorResidueCount, 0);
  assert.equal(result.receipt.cleanup.pinnedImageCacheOnlyDaemonResidue, true);
  assert.equal(result.receipt.journal.openEffectCount, 0);
  assert.equal(result.physicalEffects, 0);
  assert.equal(result.dockerSocketResolutions, 0);
  assert.equal(result.postgresConnections, 0);
  assert.equal(result.sqlStatements, 0);
  assert.equal(result.networkEffects, 0);
});

test("integration campaign removes only exact-owned historical resources then proves absence", async () => {
  const cases = [
    { resource: "container", stateKey: "historicalContainerState", expected: ["container.inspect", "container.stop", "container.rm", "container.inspect"] },
    { resource: "network", stateKey: "historicalNetworkState", expected: ["network.inspect", "network.rm", "network.inspect"] },
    { resource: "volume", stateKey: "historicalVolumeState", expected: ["volume.inspect", "volume.rm", "volume.inspect"] },
  ] as const;
  for (const item of cases) {
    const result = await runLocalPostgresIntegrationCampaignFakePlan({ [item.resource]: "OWNED" });
    assert.equal(result.status, "GREEN", item.resource);
    assert.equal(result.receiptValid, true, item.resource);
    assert.equal(result.receipt.phases.historicalCleanup, 1, item.resource);
    const relevant = result.calls.map((call: any) => call.kind)
      .filter((kind: string) => kind.startsWith(item.resource));
    assert.deepEqual(relevant, item.expected, item.resource);
    assert.equal(result.receipt.cleanup[item.stateKey], "PROVEN_ABSENT");
    assert.equal(result.receipt.readiness.physicalExecuted, true, item.resource);
    assert.equal(result.physicalEffects, 0, item.resource);
  }
  const all = await runLocalPostgresIntegrationCampaignFakePlan({
    container: "OWNED", network: "OWNED", volume: "OWNED",
  });
  assert.equal(all.status, "GREEN");
  assert.equal(all.receipt.phases.historicalCleanup, 1);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["container.inspect"], 2);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["network.inspect"], 2);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["volume.inspect"], 2);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["container.stop"], 1);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["container.rm"], 1);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["network.rm"], 1);
  assert.equal(all.receipt.effects.diagnosticDockerCallAttempts["volume.rm"], 1);
});

test("integration campaign foreign, unlabelled, malformed, and unknown resources stop before cleanup and physical", async () => {
  const historicalStateKeys = {
    container: "historicalContainerState", network: "historicalNetworkState", volume: "historicalVolumeState",
  } as const;
  const expected: Record<string, string> = {
    FOREIGN: "local_postgres_integration_campaign_foreign_resource",
    UNLABELLED: "local_postgres_integration_campaign_unlabelled_resource",
    MALFORMED: "local_postgres_integration_campaign_malformed_resource",
    UNKNOWN: "local_postgres_integration_campaign_diagnostic_ambiguous",
  };
  for (const resource of ["container", "network", "volume"] as const) {
    for (const classification of Object.keys(expected)) {
      const result = await runLocalPostgresIntegrationCampaignFakePlan({ [resource]: classification });
      assert.equal(result.status, "FAILED", `${resource}:${classification}`);
      assert.equal(result.code, expected[classification], `${resource}:${classification}`);
      assert.equal(result.receipt.phases.historicalCleanup, 0, `${resource}:${classification}`);
      assert.equal(result.receipt.phases.physicalConstruction, 0, `${resource}:${classification}`);
      assert.equal(result.receipt.readiness.physicalExecuted, false, `${resource}:${classification}`);
      assert.equal(result.calls.some((call: any) => call.kind.endsWith(".rm") || call.kind === "container.stop"), false);
      assert.equal(result.receipt.cleanup[historicalStateKeys[resource]], "UNKNOWN");
      assert.equal(result.receipt.cleanup.freshContainerState, "PROVEN_ABSENT");
      assert.equal(result.physicalEffects, 0);
    }
  }
});

test("integration campaign cleanup or physical failure never retries or crosses the next phase", async () => {
  const historicalStateKeys = {
    container: "historicalContainerState", network: "historicalNetworkState", volume: "historicalVolumeState",
  } as const;
  for (const resource of ["container", "network", "volume"] as const) {
    const result = await runLocalPostgresIntegrationCampaignFakePlan({
      [resource]: "OWNED", cleanupFailureAt: resource,
    });
    assert.equal(result.status, "CLEANUP_BLOCKED", resource);
    assert.equal(result.code, "local_postgres_integration_campaign_cleanup_blocked", resource);
    assert.equal(result.receipt.phases.historicalCleanup, 1, resource);
    assert.equal(result.receipt.phases.physicalConstruction, 0, resource);
    assert.equal(result.receipt.readiness.physicalExecuted, false, resource);
    assert.equal(result.receipt.journal.openEffectCount, 1, resource);
    assert.equal(result.receipt.cleanup[historicalStateKeys[resource]], "PROVEN_PRESENT_EXACT_OWNED", resource);
    assert.equal(result.receipt.cleanup.freshContainerState, "PROVEN_ABSENT", resource);
  }
  const failed = await runLocalPostgresIntegrationCampaignFakePlan({ physicalOutcome: "FAILED" });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.receipt.phases.physicalConstruction, 1);
  assert.equal(failed.receipt.physical.status, "FAILED");
  assert.equal(failed.receipt.cleanup.freshContainerState, "UNKNOWN");
  assert.equal(failed.receipt.cleanup.freshNetworkState, "UNKNOWN");
  assert.equal(failed.receipt.cleanup.freshVolumeState, "UNKNOWN");
  const blocked = await runLocalPostgresIntegrationCampaignFakePlan({ physicalOutcome: "CLEANUP_BLOCKED" });
  assert.equal(blocked.status, "CLEANUP_BLOCKED");
  assert.equal(blocked.receipt.physical.status, "CLEANUP_BLOCKED");
  assert.equal(blocked.receipt.phases.physicalCleanupRecoveries, 0);
  assert.equal(blocked.receipt.cleanup.freshContainerState, "UNKNOWN");
  for (const result of [failed, blocked]) {
    assert.equal(result.consumeCount, 1);
    assert.equal(result.physicalEffects, 0);
  }
});

test("integration campaign write-ahead ambiguity, host drift, expiry, and duplicate entry fail closed", async () => {
  const ambiguous = await runLocalPostgresIntegrationCampaignFakePlan({
    crashAt: "container.inspect#1:after_call_before_completion",
  });
  assert.equal(ambiguous.status, "FAILED");
  assert.equal(ambiguous.code, "local_postgres_integration_campaign_ambiguous_effect");
  assert.equal(ambiguous.receipt.journal.openEffectCount, 1);
  assert.equal(ambiguous.receipt.phases.physicalConstruction, 0);
  const drift = await runLocalPostgresIntegrationCampaignFakePlan({ hostDriftAt: "network.inspect#1:before" });
  assert.equal(drift.status, "FAILED");
  assert.equal(drift.code, "local_postgres_integration_campaign_host_drift");
  assert.equal(drift.calls.filter((call: any) => call.kind === "network.inspect").length, 0);
  const expired = await runLocalPostgresIntegrationCampaignFakePlan({ expired: true });
  assert.equal(expired.status, "FAILED");
  assert.equal(expired.code, "local_postgres_integration_campaign_grant_expired");
  assert.equal(expired.calls.length, 0);
  const duplicate = await runLocalPostgresIntegrationCampaignFakePlan({ duplicateConsume: true });
  assert.equal(duplicate.status, "GREEN");
  assert.equal(duplicate.consumeCount, 1);
  assert.equal(duplicate.duplicateDenied, true);
  assert.equal(duplicate.duplicateDenialCode, "local_postgres_integration_campaign_consumed_cleanup_only");
  assert.deepEqual(duplicate.duplicateSnapshot.after, duplicate.duplicateSnapshot.before);
  assert.equal(duplicate.physicalEffects, 0);
});

test("integration campaign reserves every diagnostic, cleanup, and physical call before invocation", async () => {
  const calls = [
    "version#1", "container.inspect#1", "container.stop#1", "container.rm#1", "container.inspect#2",
    "network.inspect#1", "network.rm#1", "network.inspect#2", "volume.inspect#1", "volume.rm#1",
    "volume.inspect#2", "physical:rehearsal#1",
  ];
  for (const call of calls) {
    for (const edge of ["before_call", "after_call_before_completion"]) {
      const result = await runLocalPostgresIntegrationCampaignFakePlan({
        container: "OWNED", network: "OWNED", volume: "OWNED", crashAt: `${call}:${edge}`,
      });
      assert.equal(result.status, "FAILED", `${call}:${edge}`);
      assert.equal(result.code, "local_postgres_integration_campaign_ambiguous_effect", `${call}:${edge}`);
      assert.equal(result.receipt.journal.openEffectCount, 1, `${call}:${edge}`);
      assert.equal(result.physicalEffects, 0, `${call}:${edge}`);
      const reservations = result.journal.filter((entry: any) => entry.event === "effect.reserved");
      const completions = result.journal.filter((entry: any) => entry.event === "effect.completed");
      assert.equal(reservations.length, completions.length + 1, `${call}:${edge}`);
      assert.equal(reservations.at(-1).detail.kind + `#${reservations.at(-1).detail.ordinal}`, call, `${call}:${edge}`);
    }
    for (const edge of ["before", "after"]) {
      const result = await runLocalPostgresIntegrationCampaignFakePlan({
        container: "OWNED", network: "OWNED", volume: "OWNED", hostDriftAt: `${call}:${edge}`,
      });
      assert.equal(result.status, "FAILED", `${call}:${edge}`);
      assert.equal(result.code, "local_postgres_integration_campaign_host_drift", `${call}:${edge}`);
      assert.equal(result.receipt.journal.openEffectCount, 1, `${call}:${edge}`);
      assert.equal(result.physicalEffects, 0, `${call}:${edge}`);
    }
  }
  for (const input of [
    { crashAt: "container.inspect:before_call" },
    { crashAt: "container.inspect#3:before_call" },
    { hostDriftAt: "network.inspect:before" },
    { hostDriftAt: "physical:rehearsal#2:after" },
  ]) {
    await assert.rejects(() => runLocalPostgresIntegrationCampaignFakePlan(input),
      runnerError("local_postgres_fake_fault_invalid"));
  }
});

test("integration campaign enforces non-cleanup expiry and rollback while allowing exact cleanup rollback", async () => {
  for (const clockMutation of ["expired_before_physical", "rollback_before_physical"]) {
    const result = await runLocalPostgresIntegrationCampaignFakePlan({ clockMutation });
    assert.equal(result.status, "FAILED", clockMutation);
    assert.equal(result.code, "local_postgres_integration_campaign_clock_invalid", clockMutation);
    assert.equal(result.receipt.effects.physicalRehearsalAttemptCount, 0, clockMutation);
    assert.equal(result.receipt.effects.physicalRehearsalCompletionCount, 0, clockMutation);
    assert.equal(result.receipt.readiness.physicalExecuted, false, clockMutation);
    assert.equal(result.calls.some((call: any) => call.kind === "physical:rehearsal"), false, clockMutation);
    assert.equal(result.physicalEffects, 0, clockMutation);
  }
  const cleanupRollback = await runLocalPostgresIntegrationCampaignFakePlan({
    container: "OWNED", clockMutation: "rollback_during_cleanup",
  });
  assert.equal(cleanupRollback.status, "GREEN");
  assert.equal(cleanupRollback.receipt.phases.historicalCleanup, 1);
  assert.equal(cleanupRollback.receipt.readiness.physicalExecuted, true);
  assert.equal(cleanupRollback.physicalEffects, 0);
  for (const clockMutation of ["rollback", "expired", "cleanup"] as const) {
    await assert.rejects(() => runLocalPostgresIntegrationCampaignFakePlan({ clockMutation }),
      runnerError("local_postgres_fake_fault_invalid"));
  }
});

test("integration campaign journal preserves exact cleanup headroom without poisoning the durable tip", () => {
  const result = runLocalPostgresIntegrationCampaignJournalHeadroomFakePlan();
  assert.equal(result.normalMaximumBytes, 900_000);
  assert.equal(result.totalMaximumBytes, 1_000_000);
  for (const name of ["normalExact", "cleanupExact"] as const) {
    assert.equal(result[name].accepted, true, name);
    assert.equal(result[name].after.entryCount, 1, name);
    assert.notEqual(result[name].after.headSha256, result[name].before.headSha256, name);
  }
  for (const name of ["normalOverflow", "cleanupOverflow"] as const) {
    assert.equal(result[name].accepted, false, name);
    assert.equal(result[name].code, "local_postgres_integration_campaign_journal_headroom_exhausted", name);
    assert.deepEqual(result[name].after, result[name].before, name);
  }
  assert.equal(result.physicalEffects, 0);
});

test("integration campaign permits at most two cleanup-only recoveries and never restarts construction", () => {
  const recovered = runLocalPostgresIntegrationCampaignCleanupRecoveryFakePlan({
    outcomes: ["CRASH", "PROVEN_ABSENT"],
  });
  assert.equal(recovered.status, "FAILED");
  assert.equal(recovered.code, "local_postgres_integration_campaign_cleanup_recovered_after_interruption");
  assert.equal(recovered.phases.physicalConstruction, 1);
  assert.equal(recovered.phases.physicalCleanupRecoveries, 2);
  assert.equal(recovered.physicalRehearsalAttemptCount, 1);
  assert.equal(recovered.physicalRehearsalCompletionCount, 0);
  assert.equal(recovered.cleanupRecoveryAttemptCount, 2);
  assert.equal(recovered.cleanupRecoveryCompletionCount, 1);
  assert.equal(recovered.journalState.openEffectCount, 2);
  assert.equal(recovered.physicalEffects, 0);

  const denied = runLocalPostgresIntegrationCampaignCleanupRecoveryFakePlan({
    outcomes: ["CRASH", "CRASH", "CRASH"],
  });
  assert.equal(denied.status, "DENIED");
  assert.equal(denied.code, "local_postgres_integration_campaign_cleanup_recovery_limit");
  assert.equal(denied.phases.physicalCleanupRecoveries, 2);
  assert.equal(denied.cleanupRecoveryAttemptCount, 2);
  assert.deepEqual(denied.deniedSnapshot.after, denied.deniedSnapshot.before);
  assert.equal(denied.physicalEffects, 0);
  assert.equal(denied.dockerSocketResolutions, 0);
  assert.equal(denied.postgresConnections, 0);
  assert.equal(denied.sqlStatements, 0);

  const blocked = runLocalPostgresIntegrationCampaignCleanupRecoveryFakePlan({ outcomes: ["BLOCKED"] });
  assert.equal(blocked.status, "CLEANUP_BLOCKED");
  assert.equal(blocked.phases.physicalCleanupRecoveries, 1);
  assert.equal(blocked.cleanupRecoveryAttemptCount, 1);
  assert.equal(blocked.cleanupRecoveryCompletionCount, 0);
  assert.equal(blocked.physicalEffects, 0);
  for (const outcomes of [[], ["UNKNOWN"], ["CRASH", "CRASH", "CRASH", "CRASH"]]) {
    assert.throws(() => runLocalPostgresIntegrationCampaignCleanupRecoveryFakePlan({ outcomes }),
      runnerError("local_postgres_fake_fault_invalid"));
  }
});

test("integration campaign grant, journal, and receipt schemas are closed and mutation-hostile", async () => {
  assert.equal(typeof validateLocalPostgresIntegrationCampaignGrant, "function");
  assert.deepEqual(LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CEILINGS.diagnosticDockerCalls, {
    version: 1, "image.inspect": 0, "image.pull": 0,
    "container.inspect": 2, "container.create": 0, "container.start": 0, "container.stop": 1,
    "container.rm": 1, "network.inspect": 2, "network.create": 0, "network.rm": 1,
    "volume.inspect": 2, "volume.create": 0, "volume.rm": 1,
  });
  assert.deepEqual(LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CEILINGS.physicalDockerCalls, LOCAL_POSTGRES_V3_CEILINGS.dockerCalls);
  assert.equal(runLocalPostgresIntegrationCampaignGrantValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "authority", "lineage", "artifacts", "historical", "host", "ceilings",
    "obsolete_physical", "obsolete_rescue", "expired", "accessor",
  ]) {
    const result = runLocalPostgresIntegrationCampaignGrantValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `grant:${mutation}`);
    assert.equal(result.physicalEffects, 0, `grant:${mutation}`);
  }
  assert.equal(runLocalPostgresIntegrationCampaignJournalValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "sequence", "previous", "event", "detail", "detail_extra_rehashed", "entry_sha",
    "completion_without_attempt",
  ]) {
    const result = runLocalPostgresIntegrationCampaignJournalValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `journal:${mutation}`);
    assert.equal(result.physicalEffects, 0, `journal:${mutation}`);
  }
  assert.equal((await runLocalPostgresIntegrationCampaignReceiptValidationFakePlan({ mutation: "none" })).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "authority", "lineage", "artifacts", "historical", "host", "phases", "effects",
    "observation", "physical", "cleanup", "journal", "readiness", "consumed", "status_code", "accessor",
  ]) {
    const result = await runLocalPostgresIntegrationCampaignReceiptValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `receipt:${mutation}`);
    assert.equal(result.physicalEffects, 0, `receipt:${mutation}`);
  }
});

test("integration campaign prepare is one-use, same-descriptor, exact-root, and effect-free", () => {
  const green = runLocalPostgresIntegrationCampaignPrepareFakePlan({ mutation: "none" });
  assert.equal(green.status, "GREEN");
  assert.equal(green.code, "local_postgres_integration_campaign_prepare_green");
  assert.deepEqual(green.rootEntries, ["integration-campaign.pending.json", "owner-approval-receipt"]);
  assert.match(green.receipt.pendingCampaignGrantSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(green.grant.schemaVersion, "r4.public-core-local-postgres-integration-campaign-grant.v4");
  assert.equal(green.grant.artifacts.dockerCliSourceTagCommit, "c2be9ccfc3cf0b4c4c4f0a3d5c91dd759ab21256");
  assert.equal(green.grant.artifacts.dockerCliInspectorBlob, "526cfda9f8c0cf6135baef50ff4ce357b342d6b0");
  assert.equal(green.grant.artifacts.dockerCliInspectorByteCount, 6094);
  assert.equal(green.grant.artifacts.dockerCliInspectorSha256,
    "sha256:e4409bad908d89c0c5eaae64342b2dbb305b7b7ca5cd693bc7e7e0dd54167c1a");
  assert.equal(green.grant.historical.failedInitialPrepareRoot,
    "/Users/zaynw/.forme-r4-integration-campaign-c44e629b");
  assert.equal(green.grant.historical.failedInitialPrepareReceiptSha256,
    "sha256:1d62c23afd46ac017274189acc67de4ea94ed7ec651b53d38e0d886891f8ec68");
  assert.equal(green.grant.historical.failedInitialPrepareReceiptByteCount, 1116);
  assert.equal(green.grant.historical.failedCampaignRoot,
    "/Users/zaynw/.forme-r4-integration-campaign-c44e629b-r2");
  assert.equal(green.grant.historical.failedCampaignGrantSha256,
    "sha256:7fdf12a2f7bd195ef07218e724f45708ec0cac93c1175605668678df7c236e81");
  assert.equal(green.grant.historical.failedCampaignEvidenceSha256,
    "sha256:be312a188ec955f43bb2cb22bd276f1782ceaaa89da0d5c79d582d8f597c0501");
  assert.equal(green.grant.historical.failedCampaignJournalEntryCount, 7);
  assert.equal(green.grant.historical.failedCampaignJournalSha256,
    "sha256:5f22912b70c2b4bf5f9e4007afb27763931d5c158e41a4eebb7f543bf4208a04");
  assert.equal(green.grant.localOnly, true);
  assert.equal(green.grant.productionEffectsAllowed, false);
  assert.equal(green.physicalEffects, 0);
  for (const mutation of ["root_extra", "authority", "host", "expired"]) {
    const result = runLocalPostgresIntegrationCampaignPrepareFakePlan({ mutation });
    assert.equal(result.status, "FAILED", mutation);
    assert.equal(result.receipt, null, mutation);
    assert.equal(result.grant, null, mutation);
    assert.equal(result.rootEntries.includes("integration-campaign.pending.json"), false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  assert.equal(typeof prepareLocalPostgresIntegrationCampaignGrant, "function");
  const campaignRoot = "/private/r4-integration-campaign";
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare-integration-campaign", "--campaign-root", campaignRoot, "--execution-review-head", "a".repeat(40),
    "--owner-approval-receipt", `${campaignRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), {
    mode: "prepare-integration-campaign", campaignRoot, executionOwnerReviewHead: "a".repeat(40),
    ownerApprovalReceiptPath: `${campaignRoot}/owner-approval-receipt`, createdAt: NOW,
    expiresAt: "2026-08-11T19:00:00.000Z",
  });
  assert.throws(() => parseLocalPostgresRunnerArguments([
    "prepare-integration-campaign", "--campaign-root", "relative", "--execution-review-head", "a".repeat(40),
    "--owner-approval-receipt", `${campaignRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), LocalPostgresRunnerError);
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "integration-campaign", "--campaign-root", campaignRoot,
    "--evidence-out", `${campaignRoot}/integration-campaign-evidence.json`,
  ]), {
    mode: "integration-campaign", campaignRoot,
    evidenceOut: `${campaignRoot}/integration-campaign-evidence.json`,
  });
  assert.equal(typeof runApprovedLocalPostgresIntegrationCampaign, "function");
});

test("integration campaign real entry rejects before host or effect ports when campaign authority is absent", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "forme-integration-campaign-entry-")));
  try {
    await writeFile(path.join(root, "owner-approval-receipt"), "fake absent campaign approval", { mode: 0o600 });
    await assert.rejects(
      runApprovedLocalPostgresIntegrationCampaign({
        campaignRoot: root, evidenceOut: path.join(root, "integration-campaign-evidence.json"),
      }),
      LocalPostgresRunnerError,
    );
    assert.deepEqual(await readdir(root), ["owner-approval-receipt"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("image-manifest diagnostic proposal lineage and committed bytes are exact", () => {
  const addendumHead = "e8919ff6474bd3f61a76668da1f1bbc9cae01fc5";
  const reviewHead = "65771be7a1c17ed9170fbe592dae854f6d312759";
  const addendumPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CORRECTION-ADDENDUM.md";
  const reviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-MANIFEST-DIAGNOSTIC-CORRECTION-OWNER-REVIEW.md";
  assert.equal(gitText(["rev-parse", `${addendumHead}^`]), "4611e57e3481b1b309f0d583d013e548d05e0f25");
  assert.equal(gitText(["rev-parse", `${addendumHead}^{tree}`]), "3ac72ec29feac2f665a271bd79d4ffe33389f794");
  assert.equal(gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", addendumHead]), `A\t${addendumPath}`);
  assert.equal(gitText(["rev-parse", `${reviewHead}^`]), addendumHead);
  assert.equal(gitText(["rev-parse", `${reviewHead}^{tree}`]), "d1b7f0b69634300f5c207b8cdf33823592369ff2");
  assert.equal(gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", reviewHead]), `A\t${reviewPath}`);
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${addendumHead}:${addendumPath}`])).digest("hex")}`,
    "sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee");
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${reviewHead}:${reviewPath}`])).digest("hex")}`,
    "sha256:3af0c155276d6c7946ffb4c5196c61c38067b831e12de41c00c95c249df6b9c4");
});

test("image-manifest diagnostic grant, Card payload, and receipt contracts reject hostile mutations", async () => {
  assert.equal(runLocalPostgresImageManifestDiagnosticAuthorityFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of ["duplicate_marker", "prefix_marker", "top_extra", "authority", "lineage", "host", "ceiling"]) {
    const result = runLocalPostgresImageManifestDiagnosticAuthorityFakePlan({ mutation });
    assert.equal(result.accepted, false, `authority:${mutation}`);
    assert.equal(result.physicalEffects, 0, `authority:${mutation}`);
  }
  assert.equal(runLocalPostgresImageManifestDiagnosticGrantValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "missing", "type", "old_schema", "authority", "lineage",
    "failed_campaign", "host", "ceiling", "accessor",
  ]) {
    const result = runLocalPostgresImageManifestDiagnosticGrantValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `grant:${mutation}`);
    assert.equal(result.physicalEffects, 0, `grant:${mutation}`);
  }
  assert.equal(runLocalPostgresImageManifestDiagnosticJournalValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "top_extra", "sequence", "previous", "event", "detail_extra", "entry_sha", "completion_without_attempt",
  ]) {
    const result = runLocalPostgresImageManifestDiagnosticJournalValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `journal:${mutation}`);
    assert.equal(result.physicalEffects, 0, `journal:${mutation}`);
  }
  assert.equal((await runLocalPostgresImageManifestDiagnosticReceiptValidationFakePlan({ mutation: "none" })).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "missing", "type", "status", "consumed", "authority", "attempt",
    "tuple", "journal", "readiness", "accessor",
  ]) {
    const result = await runLocalPostgresImageManifestDiagnosticReceiptValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `receipt:${mutation}`);
    assert.equal(result.physicalEffects, 0, `receipt:${mutation}`);
  }
});

test("image-manifest diagnostic prepare is one-use, exact-root, and effect-free", () => {
  const green = runLocalPostgresImageManifestDiagnosticPrepareFakePlan({ mutation: "none" });
  assert.equal(green.status, "GREEN");
  assert.equal(green.grant.schemaVersion, "r4.public-core-local-postgres-image-manifest-diagnostic-grant.v1");
  assert.deepEqual(green.rootEntries, ["image-manifest-diagnostic.pending.json", "owner-approval-receipt"]);
  assert.equal(green.grant.failedCampaign.root, "/Users/zaynw/.forme-r4-integration-campaign-v2-1d96cfcf");
  assert.equal(green.grant.failedCampaign.consumedGrantSha256,
    "sha256:a75886cb79162404fce61703aa64b85036060e2f632a98fbf2ce0cb344d53582");
  assert.equal(green.grant.failedCampaign.evidenceSha256,
    "sha256:3d89b0dc937adcf1eeb0dec4d5b995cde3905baf8111ee6298af8b6112813889");
  assert.equal(green.grant.failedCampaign.journalEntryCount, 17);
  assert.equal(green.grant.failedCampaign.journalHeadSha256,
    "sha256:465c4cb46ffbde05da3b51b27f714872ec8687055e210e2389988416f925c26b");
  assert.equal(green.physicalEffects, 0);
  for (const mutation of ["root_extra", "expired", "binding"]) {
    const result = runLocalPostgresImageManifestDiagnosticPrepareFakePlan({ mutation });
    assert.equal(result.status, "FAILED", mutation);
    assert.equal(result.rootEntries.includes("image-manifest-diagnostic.pending.json"), false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  const diagnosticRoot = "/private/r4-image-manifest-diagnostic";
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare-image-manifest-diagnostic", "--diagnostic-root", diagnosticRoot,
    "--diagnostic-review-head", "a".repeat(40), "--owner-approval-receipt", `${diagnosticRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), {
    mode: "prepare-image-manifest-diagnostic", diagnosticRoot, diagnosticOwnerReviewHead: "a".repeat(40),
    ownerApprovalReceiptPath: `${diagnosticRoot}/owner-approval-receipt`, createdAt: NOW,
    expiresAt: "2026-08-11T19:00:00.000Z",
  });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "image-manifest-diagnostic", "--diagnostic-root", diagnosticRoot,
    "--evidence-out", `${diagnosticRoot}/image-manifest-diagnostic-evidence.json`,
  ]), {
    mode: "image-manifest-diagnostic", diagnosticRoot,
    evidenceOut: `${diagnosticRoot}/image-manifest-diagnostic-evidence.json`,
  });
  assert.throws(() => parseLocalPostgresRunnerArguments([
    "image-manifest-diagnostic", "--diagnostic-root", "relative", "--evidence-out", `${diagnosticRoot}/evidence.json`,
  ]), LocalPostgresRunnerError);
  assert.equal(typeof prepareLocalPostgresImageManifestDiagnosticGrant, "function");
});

test("image-manifest diagnostic captures only the bounded tuple and never widens Docker effects", async () => {
  const zeroVector = Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind: string) => [kind, 0]));
  const retained = [
    "image-manifest-diagnostic-evidence.json", "image-manifest-diagnostic-journal-v1",
    "image-manifest-diagnostic.consumed.json", "owner-approval-receipt",
  ];
  const successful = [
    ["index_digest", IMAGE_REFERENCE.slice("postgres@".length), "application/vnd.oci.image.index.v1+json"],
    ["platform_manifest", IMAGE_PLATFORM_MANIFEST, "application/vnd.oci.image.index.v1+json"],
    ["other_digest", `sha256:${"e".repeat(64)}`, "application/vnd.oci.image.index.v1+json"],
    ["media_other", IMAGE_REFERENCE.slice("postgres@".length), "OTHER"],
  ] as const;
  for (const [mutation, digest, mediaType] of successful) {
    const result = await runLocalPostgresImageManifestDiagnosticFakePlan({ mutation });
    assert.equal(result.receipt.status, "OBSERVED", mutation);
    assert.deepEqual(result.dockerKinds, ["version", "image.inspect"], mutation);
    assert.deepEqual(result.dockerArgv, [
      ["version", "--format", "{{json .}}"],
      ["image", "inspect", "--platform", IMAGE_PLATFORM, "--format", "{{json .}}", IMAGE_REFERENCE],
    ], mutation);
    assert.deepEqual(result.rootEntries, retained, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
    const tuple = result.receipt.observations[1].tuple;
    assert.equal(tuple.repoDigestPresent, "TRUE", mutation);
    assert.equal(tuple.imageOs, "linux", mutation);
    assert.equal(tuple.imageArchitecture, "arm64", mutation);
    assert.equal(tuple.descriptorDigest, digest, mutation);
    assert.equal(tuple.descriptorMediaType, mediaType, mutation);
    assert.equal(tuple.descriptorSize, 1234, mutation);
    assert.equal(tuple.descriptorPlatformOs, "linux", mutation);
    assert.equal(tuple.descriptorPlatformArchitecture, "arm64", mutation);
    assert.equal(JSON.stringify(result.receipt).includes("RAW-IMAGE-MANIFEST-SENTINEL"), false, mutation);
    assert.deepEqual({ ...result.receipt.effects.dockerCallAttempts },
      { ...zeroVector, version: 1, "image.inspect": 1 }, mutation);
    assert.deepEqual({ ...result.receipt.effects.dockerCallCompletions },
      { ...zeroVector, version: 1, "image.inspect": 1 }, mutation);
    assert.equal(result.receipt.effects.imagePullCount, 0, mutation);
    assert.equal(result.receipt.effects.dockerResourceEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.cleanupEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.postgresEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.sqlEffectCount, 0, mutation);
  }
});

test("image-manifest diagnostic retains truthful missing, malformed, mismatch, and ambiguous outcomes", async () => {
  const cases = [
    ["descriptor_missing", "DESCRIPTOR_INVALID", "MISSING"],
    ["descriptor_invalid", "DESCRIPTOR_INVALID", "INVALID"],
    ["platform_mismatch", "PLATFORM_MISMATCH", null],
    ["reference_mismatch", "REFERENCE_MISMATCH", null],
    ["malformed", "MALFORMED", "INVALID"],
    ["image_missing", "IMAGE_MISSING", null],
    ["nonzero", "NONZERO", null],
    ["timeout", "AMBIGUOUS_TRANSPORT", "UNKNOWN"],
    ["signal", "AMBIGUOUS_TRANSPORT", "UNKNOWN"],
  ] as const;
  for (const [mutation, classification, descriptorDigest] of cases) {
    const result = await runLocalPostgresImageManifestDiagnosticFakePlan({ mutation });
    assert.equal(result.receipt.status, "FAILED", mutation);
    assert.deepEqual(result.dockerKinds, ["version", "image.inspect"], mutation);
    assert.equal(result.receipt.observations[1].classification, classification, mutation);
    if (descriptorDigest !== null) assert.equal(result.receipt.observations[1].tuple.descriptorDigest, descriptorDigest, mutation);
    assert.equal(JSON.stringify(result.receipt).includes("RAW-IMAGE-MANIFEST-SENTINEL"), false, mutation);
    assert.equal(result.receipt.effects.imagePullCount, 0, mutation);
    assert.equal(result.receipt.effects.dockerResourceEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.cleanupEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.postgresEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.sqlEffectCount, 0, mutation);
    assert.equal(result.receipt.closure.localResidueCount, 0, mutation);
  }
  for (const mutation of ["host_drift", "socket_drift"] as const) {
    const result = await runLocalPostgresImageManifestDiagnosticFakePlan({ mutation });
    assert.equal(result.receipt.status, "FAILED", mutation);
    assert.deepEqual(result.dockerKinds, ["version"], mutation);
    assert.equal(result.receipt.observations[0].classification, "AMBIGUOUS_TRANSPORT", mutation);
    assert.equal(result.receipt.effects.dockerCallAttempts.version, 1, mutation);
    assert.equal(result.receipt.effects.dockerCallCompletions.version, 0, mutation);
    assert.equal(result.receipt.effects.dockerCallAttempts["image.inspect"], 0, mutation);
    assert.equal(result.receipt.closure.localResidueCount, 0, mutation);
  }
});

test("image-manifest diagnostic real entry rejects before host or Docker effects without authority", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "forme-image-manifest-diagnostic-entry-")));
  try {
    await writeFile(path.join(root, "owner-approval-receipt"), "fake absent diagnostic approval", { mode: 0o600 });
    await assert.rejects(runApprovedLocalPostgresImageManifestDiagnostic({
      diagnosticRoot: root, evidenceOut: path.join(root, "image-manifest-diagnostic-evidence.json"),
    }), LocalPostgresRunnerError);
    assert.deepEqual(await readdir(root), ["owner-approval-receipt"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("image-acquisition replacement authority proposal lineage and committed bytes are exact", () => {
  const predecessorCardHead = "23e4213d934076cc85e4cd16512bdcbc4f7a0483";
  const predecessorReviewHead = "33fc039675bb990180cb37f85096f217cb523eea";
  const predecessorCardPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V1.md";
  const predecessorReviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V1.md";
  const addendumHead = "73ea8d2ab6ced3613756ac727433ed623b0fdb24";
  const reviewHead = "56e8d29c9c29de0735667efb6be647d7cc1cd57b";
  const addendumPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-AUTHORITY-CORRECTION-ADDENDUM.md";
  const reviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-REPLACEMENT-AUTHORITY-CORRECTION-OWNER-REVIEW.md";
  assert.equal(gitText(["rev-parse", `${predecessorCardHead}^{tree}`]), "f753b338132db899c9a4a3b7a274ac6c5a67931e");
  assert.equal(gitText(["rev-parse", `${predecessorReviewHead}^`]), predecessorCardHead);
  assert.equal(gitText(["rev-parse", `${predecessorReviewHead}^{tree}`]), "8d58dd8e00a728b23f144a9a1263dbd0f3e68e87");
  assert.equal(gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", predecessorReviewHead]), `A\t${predecessorReviewPath}`);
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${predecessorCardHead}:${predecessorCardPath}`])).digest("hex")}`,
    "sha256:385f82e5ffd19745da495b5ed6e1f57e33020d5ed71df84ac591b2eb93880a72");
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${predecessorReviewHead}:${predecessorReviewPath}`])).digest("hex")}`,
    "sha256:8da2273700d37e588f943194d5a9c2e2d407ad4a75ac22ca3c3b5a58b449675c");
  assert.equal(gitText(["rev-parse", `${addendumHead}^`]), predecessorReviewHead);
  assert.equal(gitText(["rev-parse", `${addendumHead}^{tree}`]), "95d7c1150831bcc2288d80ee650cf8cc3e2b5e0b");
  assert.equal(gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", addendumHead]), `A\t${addendumPath}`);
  assert.equal(gitText(["rev-parse", `${reviewHead}^`]), addendumHead);
  assert.equal(gitText(["rev-parse", `${reviewHead}^{tree}`]), "8557cdc1780478c5cfe75261256c71a579234800");
  assert.equal(gitText(["diff-tree", "--no-commit-id", "--name-status", "-r", reviewHead]), `A\t${reviewPath}`);
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${addendumHead}:${addendumPath}`])).digest("hex")}`,
    "sha256:dd685d694d8ba6a4b14eca1202e3ee4710bf127242591fef0aec30af18d0033f");
  assert.equal(`sha256:${createHash("sha256").update(gitBytes(["show", `${reviewHead}:${reviewPath}`])).digest("hex")}`,
    "sha256:62bf1aa8865202980a8ea2fe22e0ca40993aec43752f9f6b5acfa9d29e8cbcda");
});

test("image-acquisition diagnostic authority, grant, journal, and receipt contracts fail closed without effects", async () => {
  assert.equal(runLocalPostgresImageAcquisitionDiagnosticAuthorityFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of [
    "duplicate_marker", "prefix_marker", "top_extra", "v1", "authority", "lineage", "prior", "host", "ceiling",
  ]) {
    const result = runLocalPostgresImageAcquisitionDiagnosticAuthorityFakePlan({ mutation });
    assert.equal(result.accepted, false, `authority:${mutation}`);
    assert.equal(result.physicalEffects, 0, `authority:${mutation}`);
  }
  assert.equal(runLocalPostgresImageAcquisitionDiagnosticGrantValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of ["top_extra", "missing", "schema", "v1", "authority", "lineage", "prior", "host", "ceiling", "expired"]) {
    const result = runLocalPostgresImageAcquisitionDiagnosticGrantValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `grant:${mutation}`);
    assert.equal(result.physicalEffects, 0, `grant:${mutation}`);
  }
  assert.equal(runLocalPostgresImageAcquisitionDiagnosticJournalValidationFakePlan({ mutation: "none" }).accepted, true);
  for (const mutation of ["top_extra", "sequence", "previous", "event", "detail_extra", "entry_sha", "completion_without_attempt"]) {
    const result = runLocalPostgresImageAcquisitionDiagnosticJournalValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `journal:${mutation}`);
    assert.equal(result.physicalEffects, 0, `journal:${mutation}`);
  }
  assert.equal((await runLocalPostgresImageAcquisitionDiagnosticReceiptValidationFakePlan({ mutation: "none" })).accepted, true);
  for (const mutation of [
    "top_extra", "nested_extra", "missing", "status", "consumed", "authority", "attempt",
    "cache", "journal", "readiness", "accessor",
  ]) {
    const result = await runLocalPostgresImageAcquisitionDiagnosticReceiptValidationFakePlan({ mutation });
    assert.equal(result.accepted, false, `receipt:${mutation}`);
    assert.equal(result.physicalEffects, 0, `receipt:${mutation}`);
  }
});

test("image-acquisition diagnostic prepare is one-use, exact-root, and repository-test-only", () => {
  const green = runLocalPostgresImageAcquisitionDiagnosticPrepareFakePlan({ mutation: "none" });
  assert.equal(green.status, "GREEN");
  assert.equal(green.grant.schemaVersion, "r4.public-core-local-postgres-image-acquisition-diagnostic-grant.v2");
  assert.deepEqual(green.rootEntries, ["image-acquisition-diagnostic-v2.pending.json", "owner-approval-receipt"]);
  assert.equal(green.grant.priorDiagnostic.root, "/Users/zaynw/.forme-r4-image-acquisition-diagnostic-385f82e5");
  assert.equal(green.grant.priorDiagnostic.predecessorCardSha256,
    "sha256:385f82e5ffd19745da495b5ed6e1f57e33020d5ed71df84ac591b2eb93880a72");
  assert.equal(green.grant.priorDiagnostic.predecessorReviewSha256,
    "sha256:8da2273700d37e588f943194d5a9c2e2d407ad4a75ac22ca3c3b5a58b449675c");
  assert.equal(green.grant.priorDiagnostic.predecessorPayloadSha256,
    "sha256:fe44f267ac9663919a4e63ab075ed85a40bdf48b4128cdffaeed52fb107ec7ea");
  assert.equal(green.grant.priorDiagnostic.rootDevice, 16777233);
  assert.equal(green.grant.priorDiagnostic.rootInode, 35611325);
  assert.equal(green.grant.priorDiagnostic.rootUid, 501);
  assert.equal(green.grant.priorDiagnostic.rootMode, "0700");
  assert.deepEqual(green.grant.priorDiagnostic.retainedEntries, [
    "image-acquisition-diagnostic.consumed.json", "image-acquisition-diagnostic-evidence.json",
    "image-acquisition-diagnostic-journal-v1", "owner-approval-receipt",
  ]);
  assert.equal(green.grant.priorDiagnostic.consumedGrantSha256,
    "sha256:76800f6b88c8e024d9ee3e527e3bf285c3163ae39360c903f698547b7cbbb7ba");
  assert.equal(green.grant.priorDiagnostic.evidenceSha256,
    "sha256:d1364db823a82d44da0b36044a66538ba47ff5027980843ea65dc69e3dad4afd");
  assert.equal(green.grant.priorDiagnostic.journalEntryCount, 7);
  assert.equal(green.grant.priorDiagnostic.journalHeadSha256,
    "sha256:0b2f01174fd8ad418f77558db3acae420278e7afb8ea259d6a76fbbb8309b6aa");
  assert.equal(green.physicalEffects, 0);
  for (const mutation of ["root_extra", "expired", "binding"]) {
    const result = runLocalPostgresImageAcquisitionDiagnosticPrepareFakePlan({ mutation });
    assert.equal(result.status, "FAILED", mutation);
    assert.equal(result.rootEntries.includes("image-acquisition-diagnostic-v2.pending.json"), false, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
  }
  const diagnosticRoot = "/private/r4-image-acquisition-diagnostic";
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "prepare-image-acquisition-diagnostic", "--diagnostic-root", diagnosticRoot,
    "--diagnostic-review-head", "a".repeat(40), "--owner-approval-receipt", `${diagnosticRoot}/owner-approval-receipt`,
    "--created-at", NOW, "--expires-at", "2026-08-11T19:00:00.000Z",
  ]), {
    mode: "prepare-image-acquisition-diagnostic", diagnosticRoot, diagnosticOwnerReviewHead: "a".repeat(40),
    ownerApprovalReceiptPath: `${diagnosticRoot}/owner-approval-receipt`, createdAt: NOW,
    expiresAt: "2026-08-11T19:00:00.000Z",
  });
  assert.deepEqual(parseLocalPostgresRunnerArguments([
    "image-acquisition-diagnostic", "--diagnostic-root", diagnosticRoot,
    "--evidence-out", `${diagnosticRoot}/image-acquisition-diagnostic-evidence-v2.json`,
  ]), {
    mode: "image-acquisition-diagnostic", diagnosticRoot,
    evidenceOut: `${diagnosticRoot}/image-acquisition-diagnostic-evidence-v2.json`,
  });
  assert.equal(typeof prepareLocalPostgresImageAcquisitionDiagnosticGrant, "function");
});

test("image-acquisition diagnostic closes cached and one-pull success paths exactly", async () => {
  const zeroVector = Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind: string) => [kind, 0]));
  const retained = [
    "image-acquisition-diagnostic-evidence-v2.json", "image-acquisition-diagnostic-journal-v2",
    "image-acquisition-diagnostic-v2.consumed.json", "owner-approval-receipt",
  ];
  for (const mutation of ["cached_present", "missing_then_observed"] as const) {
    const result = await runLocalPostgresImageAcquisitionDiagnosticFakePlan({ mutation });
    const pulled = mutation === "missing_then_observed";
    assert.equal(result.receipt.status, "OBSERVED", mutation);
    assert.deepEqual(result.calls.map((call: { kind: string }) => call.kind),
      pulled ? ["version", "image.inspect", "image.pull", "image.inspect"] : ["version", "image.inspect"], mutation);
    const versionArgv = ["version", "--format", "{{json .}}"];
    const inspectArgv = ["image", "inspect", "--platform", IMAGE_PLATFORM, "--format", "{{json .}}", IMAGE_REFERENCE];
    const pullArgv = ["image", "pull", "--platform", IMAGE_PLATFORM, IMAGE_REFERENCE];
    assert.deepEqual(result.calls.map((call: { argv: string[] }) => call.argv),
      pulled ? [versionArgv, inspectArgv, pullArgv, inspectArgv] : [versionArgv, inspectArgv], mutation);
    assert.deepEqual(result.rootEntries, retained, mutation);
    assert.equal(result.physicalEffects, 0, mutation);
    assert.deepEqual({ ...result.receipt.effects.dockerCallAttempts }, {
      ...zeroVector, version: 1, "image.inspect": pulled ? 2 : 1, "image.pull": pulled ? 1 : 0,
    }, mutation);
    assert.deepEqual(result.receipt.effects.dockerCallCompletions,
      result.receipt.effects.dockerCallAttempts, mutation);
    assert.equal(result.receipt.effects.imagePullAttemptCount, pulled ? 1 : 0, mutation);
    assert.equal(result.receipt.effects.dockerResourceEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.cleanupEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.postgresEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.sqlEffectCount, 0, mutation);
    assert.equal(result.receipt.cache.cacheBefore, pulled ? "ABSENT" : "PRESENT", mutation);
    assert.equal(result.receipt.cache.cacheAfter, "PRESENT", mutation);
    assert.equal(result.receipt.closure.cacheResidue, pulled ? "EXACT_IMAGE_CACHE" : "PREEXISTING_CACHE", mutation);
    assert.equal(result.receipt.closure.localResidueCount, 0, mutation);
    assert.equal(result.receipt.readiness.acquisitionObserved, true, mutation);
    assert.equal(result.receipt.readiness.replacementCampaignAuthorized, false, mutation);
    assert.equal(result.receipt.readiness.targetPostgresObserved, false, mutation);
    assert.equal(result.receipt.readiness.productionEffects, false, mutation);
    assert.equal(result.receipt.readiness.gateCReady, false, mutation);
  }
});

test("image-acquisition diagnostic preserves body-free failures and never retries or widens", async () => {
  const expected = new Map([
    ["pull_nonzero", ["PULL_NONZERO", 1, 1]],
    ["pull_timeout", ["AMBIGUOUS_TRANSPORT", 1, 0]],
    ["pull_signal", ["AMBIGUOUS_TRANSPORT", 1, 0]],
    ["pull_crash", ["AMBIGUOUS_TRANSPORT", 1, 0]],
    ["host_drift", ["AMBIGUOUS_TRANSPORT", 1, 0]],
    ["post_missing", ["IMAGE_MISSING", 2, 1]],
    ["post_malformed", ["MALFORMED", 2, 1]],
    ["post_reference_mismatch", ["REFERENCE_MISMATCH", 2, 1]],
    ["post_platform_mismatch", ["PLATFORM_MISMATCH", 2, 1]],
    ["post_descriptor_invalid", ["DESCRIPTOR_INVALID", 2, 1]],
  ] as const);
  for (const [mutation, [classification, inspectAttempts, pullCompletions]] of expected) {
    const result = await runLocalPostgresImageAcquisitionDiagnosticFakePlan({ mutation });
    assert.equal(result.receipt.status, "FAILED", mutation);
    assert.equal(result.receipt.observations.at(-1)?.classification, classification, mutation);
    assert.equal(result.receipt.effects.dockerCallAttempts.version, 1, mutation);
    assert.equal(result.receipt.effects.dockerCallAttempts["image.inspect"], inspectAttempts, mutation);
    assert.equal(result.receipt.effects.dockerCallAttempts["image.pull"], 1, mutation);
    assert.equal(result.receipt.effects.dockerCallCompletions["image.pull"], pullCompletions, mutation);
    assert.equal(result.receipt.effects.dockerResourceEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.cleanupEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.postgresEffectCount, 0, mutation);
    assert.equal(result.receipt.effects.sqlEffectCount, 0, mutation);
    assert.equal(result.receipt.closure.localResidueCount, 0, mutation);
    assert.equal(result.receipt.readiness.acquisitionObserved, false, mutation);
    assert.equal(JSON.stringify(result.receipt).includes("progress"), false, mutation);
    if (["pull_timeout", "pull_signal", "pull_crash", "host_drift"].includes(mutation)) {
      assert.equal(result.receipt.cache.cacheAfter, "AMBIGUOUS", mutation);
      assert.equal(result.receipt.closure.cacheResidue, "AMBIGUOUS", mutation);
    }
  }
});

test("image-acquisition diagnostic real entry rejects before socket or Docker without authority", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "forme-image-acquisition-diagnostic-entry-")));
  try {
    await writeFile(path.join(root, "owner-approval-receipt"), "fake absent image acquisition approval", { mode: 0o600 });
    await assert.rejects(runApprovedLocalPostgresImageAcquisitionDiagnostic({
      diagnosticRoot: root, evidenceOut: path.join(root, "image-acquisition-diagnostic-evidence-v2.json"),
    }), LocalPostgresRunnerError);
    assert.deepEqual(await readdir(root), ["owner-approval-receipt"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
