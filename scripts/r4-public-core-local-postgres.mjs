#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const GRANT_ID = /^[0-9a-f]{32}$/u;
const MAX_GRANT_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const DOCKER_CLI = "/Applications/Docker.app/Contents/Resources/bin/docker";
const DOCKER_CLI_SHA256 = "sha256:10f4b83b9f681d57e7cd4f04ccbb9392475ce070ae8efe62d862ab150bec014a";
const IMAGE_REFERENCE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
const IMAGE_PLATFORM = "linux/arm64";
const IMAGE_PLATFORM_MANIFEST = "sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf";
const IMAGE_CACHE_POLICY = "COMPLETE_PINNED_IMAGE_CACHE_MAY_REMAIN_PARTIAL_OR_UNKNOWN_BLOCKS_GREEN";
const ADDENDUM_SHA256 = "sha256:a85dcd2c893e2290f15b0082b93ae0163a1012bb210c00f908ec08747c17415f";
const ADDENDUM_REVIEW_SHA256 = "sha256:ce7acc0ff9c45af9286595449ebce32ec893d70e9092d0be654a20a7bab96eb2";
const WIRING_PACKET_SHA256 = "sha256:be32f425fb3d5e4fa1b4fae611fadbb65d4eaf097b65ecc90a8ea6395cbe1258";
const ADDENDUM_WRAPPER_HEAD = "1db7b30f38ca6322a3b0ad4be6d537af9cf781e8";
const ADDENDUM_WRAPPER_TREE = "1270bbc9beae9c446c83bbfc220e5906800890e3";
const WIRING_REVIEW_SHA256 = "sha256:4f050d5b79fe860d2989eed8a0b6607aa815de1e2a94cf8fae8b941701815aca";
const ADDENDUM_C_SHA256 = "sha256:6efa791732a7f3b28e728c39bd182a73286e23d6fecba90f5be39924ff133d5d";
const ADDENDUM_C_REVIEW_SHA256 = "sha256:2aaa4d1243e2813b4030a37bae2cd7f14b41ca29c3814f4bce70c4c0161f65b7";
const ADDENDUM_C_WRAPPER_HEAD = "deb12a045f5d84281bc9da0f110e049748949970";
const ADDENDUM_C_WRAPPER_TREE = "4b9028a942d4ac436527586aee64fbc23ec3488d";
const WIRING_PACKET_PROPOSAL_HEAD = "fd3abebec02a762d3e318ddba4415389dfd625a6";
const WIRING_PACKET_PROPOSAL_TREE = "9f2c226d0e12d6c5747ec3b693c6ac51c7bb2b27";
const WIRING_PACKET_PARENT_HEAD = "c831b4d5253049c4581d3c576aea59648d699d97";
const WIRING_WRAPPER_HEAD = "c878a5a534868482672838d39290e3f12e9d3b7f";
const WIRING_WRAPPER_TREE = "d917fb7d2c9ade9b2d8acae5f5e7d4893e0c84c5";
const ADDENDUM_B_INITIAL_HEAD = "3c529753ea36bc73269ec31aa5c63cd03f69ef2f";
const ADDENDUM_B_INITIAL_TREE = "dcffbc68b4a34380ca8b135d94c8bd46064f7f1b";
const ADDENDUM_B_INITIAL_SHA256 = "sha256:9f1f22456e3ae8dc666880000578d8a432f5617db7780dd41a0edae7ccf7d9b1";
const ADDENDUM_B_PROPOSAL_HEAD = "4313bd94e2a81761b4b25824b5eb82aa6396b6be";
const ADDENDUM_B_PROPOSAL_TREE = "67233cc1ff81ec5c73b15cfcaa44fb9424d35d83";
const ADDENDUM_C_PROPOSAL_HEAD = "ba61f7434071b759195fd3389b84092b96f3bb0c";
const ADDENDUM_C_PROPOSAL_TREE = "091258d78908a1a2e99542e1a5b835e84b5d3512";
const STAGE_A_HEAD = "bc0b52023bb19d4e41fc4daa4a1e232961e1a19b";
const STAGE_A_TREE = "d5cb758467d06bfd7f17b6ae6a34664e659e1e3d";
const STAGE_A_AGGREGATE_SHA256 = "sha256:d25ebe21a75be81371209699f072dc404947b3f2f7fb6a69c12c5c2d71d5e417";
const STAGE_B_HEAD = "2b49f6ad939993b9ff6a106fab327529a40fa20d";
const STAGE_B_TREE = "b40e967965d9d8878e21f2b5deff5df7aceed7f7";
const STAGE_B_AGGREGATE_SHA256 = "sha256:cb133cbd02585be9f71f8fc1b858d86a8401a82466df1d1a6ab4d705e387516b";
const PHYSICAL_REBIND_PACKET_SHA256 = "sha256:3478089d16059968b69974496701a636c5dd32e449fbb31907e652d523b673fa";
const PHYSICAL_REBIND_REVIEW_SHA256 = "sha256:9ce9a8dfedca0e85deabb9b490055eda9662e492d3b3b51cabeaab1ec2afc9bf";
const PHYSICAL_REBIND_PACKET_HEAD = "697334c169c9ec69d44ecb38529d7108839f886b";
const PHYSICAL_REBIND_PACKET_TREE = "71c6b4197eed649814276a4536b6a40690eefd05";
const PHYSICAL_REBIND_REVIEW_HEAD = "1d9d8ec7d419c90777295099d794ff04f8f476ce";
const PHYSICAL_REBIND_REVIEW_TREE = "257cc30066e669a456916033d5664fc135b7da3c";
const EFFECT0_IMPLEMENTATION_HEAD = "bcfe3349e01a655c2d52d6abbca0038cc3bff6e2";
const EFFECT0_IMPLEMENTATION_TREE = "c34372a7cd121f157ade1fa86841fdebc69bb4ed";
const EFFECT0_EVIDENCE_HEAD = "beeb55b662372e2b4f2a16f8768c16905a7a9978";
const EFFECT0_EVIDENCE_TREE = "10cb87830e37f8070320df09fb0b0dbdaef3268b";
const EFFECT0_STATUS_HEAD = "42378b5a2a48493acf8edddcd05d19593cb05dd7";
const EFFECT0_STATUS_TREE = "67b65083ae26163eca0f7bce1faefa90721c749c";
const EFFECT0_IMPLEMENTATION_AGGREGATE_SHA256 = "sha256:e1eb1cb173c67d43a451bb45fbe402786ccbee7e542f0f0f618760a1379e9920";
const EFFECT0_ARTIFACT_INDEX_SHA256 = "sha256:b3e95a61af0de08b3ddeb5dab7c92309f97eb8a7991126f47d71d638bea9c554";
const EFFECT0_EVIDENCE_SCHEMA_SHA256 = "sha256:06eeead4377ebcdd7d7d145e704b0b313ba54a958659f31cba7475be49ac3d27";
const EFFECT0_EVIDENCE_SHA256 = "sha256:c9b9e48590d501023eda000f49dd6c1f58b5f757ff07095e035678fbc17acaf3";
const EFFECT0_REPORT_SHA256 = "sha256:23a010a39cfa7c093dcf1edd8da2ed4b44730e588ea00460219b63c2683cc43e";
const FAILED_EXECUTION_CARD_HEAD = "421560cb6ac2fbbf52d104a5b71ade6347d9629f";
const FAILED_EXECUTION_CARD_TREE = "2bb4bf20f4892af3f51887e7c7d4f2302b80169d";
const FAILED_EXECUTION_CARD_SHA256 = "sha256:461de2a2ffdf58ae5aaae7d7a0401d10d47fc6f15d3794bf8be8ee4dc5e9fb77";
const FAILED_EXECUTION_REVIEW_HEAD = "e91e4fbdfa3dd884603d365ce6bb69ca5a64e6ab";
const FAILED_EXECUTION_REVIEW_TREE = "91f1a0aef6820bd4a145bc6d93acd0bbedc40992";
const FAILED_EXECUTION_REVIEW_SHA256 = "sha256:192c57c598133674965a3a689bb8237d8197ff583bfaae976cdd7c18f5d5495e";
const APFS_NLINK_CORRECTION_ADDENDUM_HEAD = "04ad36bddbf7d2f62cdfc241f51a5cf817046aff";
const APFS_NLINK_CORRECTION_ADDENDUM_TREE = "006c3bbf7f0a0e988c7afd65b425fbcefc1189b8";
const APFS_NLINK_CORRECTION_ADDENDUM_SHA256 = "sha256:b1ad65b6033eeb0b3848544df596af362e49015613434c4eb2a06ce4f1e80e06";
const APFS_NLINK_CORRECTION_REVIEW_HEAD = "5ec9521e6c16c76ce3cd10ab9f6a1c8acad74544";
const APFS_NLINK_CORRECTION_REVIEW_TREE = "513bf389aebb03bfc86464693facd2257084b5e4";
const APFS_NLINK_CORRECTION_REVIEW_SHA256 = "sha256:a33d6e8b70783e756169af0256f8f5f749461187fb79f343540788df70540bd6";
const PACKAGE_LOCK_SHA256 = "sha256:8173f0ea545f7a3ab107514fea1437601f9cf82d6e987f14aed6d74dcf722d8f";
const PG_IMPORT_CLOSURE_SHA256 = "sha256:548fc49130c7a1bcc42f03f5494ed30c614838e33a45ffe35208b23e389972f4";
const PG_IMPORT_CLOSURE_FILE_COUNT = 145;
const PG_IMPORT_CLOSURE_PACKAGE_COUNT = 15;
const SCHEMA_SQL_SHA256 = "sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8";
const VERIFY_SQL_SHA256 = "sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd";
const ROLLBACK_SQL_SHA256 = "sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4";
const CATALOG_CONTRACT_SHA256 = "sha256:a6d6738de85edf58c12fa4dc3561c8aaf320daaaecb949cc075ee4946e1c63e4";
const DOMAIN_ACTION_SET_SHA256 = "sha256:3c4ecb0ee9cc4133c4b31abf638fc1648d29a1f715018d2925a43cf11698a21c";
const PHASE1_ARTIFACT_INDEX_SHA256 = "sha256:6e63d94ce473e5d8386c46860a3e398b8331f8955003437576710c49ebe759d9";
const PHASE1_EVIDENCE_SCHEMA_SHA256 = "sha256:9bc0d1dbf3a1a74a272e17e4f1ad6bce9d0c33b65bcf7d4ae9fc00567f76902f";
const PHASE1_EVIDENCE_SHA256 = "sha256:37a6ce9b39279281dc9a94e9ee166bf4c8b1ee70caefd3168ef556c8ff8f539d";
const PHASE1_REPORT_SHA256 = "sha256:060e6d05e91101ee95786600698b699c3796758083a2d862a23d3c907ca9ef14";
const PHASE1_GATE_C_CARD_SHA256 = "sha256:b63aa612206af85671af44cdad1fac2727e6c0c3fc96459636f59cec8359f5bb";
const PG_IMPORT_CLOSURE_PACKAGES = Object.freeze([
  "@types/pg", "pg", "pg-cloudflare", "pg-connection-string", "pg-int8", "pg-pool",
  "pg-protocol", "pg-types", "pgpass", "postgres-array", "postgres-bytea", "postgres-date",
  "postgres-interval", "split2", "xtend",
]);
const OBSOLETE_SQL_HASHES = new Set([
  "sha256:869c6c3e0853a8de20a3c4973601877fca854a911dec68b2546da9ff420b5db2",
  "sha256:9c19d3cd55945421176d9c24e268734e4c7a146e004eb3c0cba32ac65ee517e4",
  "sha256:526f8dcb99aa330b2b2666a9e0df3c959caa05ab012fdf33afcdca277d2acd2e",
]);

export const LOCAL_POSTGRES_STAGE_A_PATHS = Object.freeze([
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

export const LOCAL_POSTGRES_SQL_PATHS = Object.freeze({
  schema: "schemas/r4/public-core/schema.sql",
  verify: "schemas/r4/public-core/verify.sql",
  rollback: "schemas/r4/public-core/rollback.sql",
});

export const LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS = Object.freeze({
  packet: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND.md",
  review: "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-OWNER-REVIEW.md",
});

const LOCAL_POSTGRES_STAGE_B_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md", "docs/ROADMAP.md",
  "docs/evidence/r4-public-core-local-postgres-wiring.json",
  "schemas/r4/public-core/local-postgres-artifact-index.json",
  "schemas/r4/public-core/local-postgres-wiring-evidence.schema.json",
]);
const LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS = Object.freeze([
  "scripts/r4-public-core-local-postgres.mjs", "test/r4/public-core-local-postgres.test.ts",
]);
const LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS = Object.freeze([
  "package.json",
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
]);
const LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-physical-rebind.json",
  "schemas/r4/public-core/local-postgres-physical-rebind-artifact-index.json",
  "schemas/r4/public-core/local-postgres-physical-rebind-evidence.schema.json",
]);
const LOCAL_POSTGRES_EFFECT0_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md", "docs/README.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md",
  "docs/ROADMAP.md", "docs/VALIDATION.md",
]);
const PHYSICAL_EXECUTION_CARD_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md";
const PHYSICAL_EXECUTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md";
const APFS_NLINK_CORRECTION_ADDENDUM_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-ADDENDUM.md";
const APFS_NLINK_CORRECTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-OWNER-REVIEW.md";
const LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-apfs-nlink-correction.json",
  "schemas/r4/public-core/local-postgres-apfs-nlink-correction-artifact-index.json",
  "schemas/r4/public-core/local-postgres-apfs-nlink-correction-evidence.schema.json",
]);
const LOCAL_POSTGRES_REBIND_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md", "docs/README.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md",
  "docs/ROADMAP.md", "docs/VALIDATION.md",
]);

export const LOCAL_POSTGRES_PHASE1_AUTHORITY = Object.freeze({
  schemaVersion: "r4.public-core-local-postgres-phase1-authority.v3",
  wiringPacketSha256: WIRING_PACKET_SHA256,
  wiringOwnerReviewSha256: WIRING_REVIEW_SHA256,
  addendumSha256: ADDENDUM_SHA256,
  addendumReviewSha256: ADDENDUM_REVIEW_SHA256,
  addendumWrapperHead: ADDENDUM_WRAPPER_HEAD,
  addendumWrapperTree: ADDENDUM_WRAPPER_TREE,
  addendumCSha256: ADDENDUM_C_SHA256,
  addendumCOwnerReviewSha256: ADDENDUM_C_REVIEW_SHA256,
  addendumCWrapperHead: ADDENDUM_C_WRAPPER_HEAD,
  addendumCWrapperTree: ADDENDUM_C_WRAPPER_TREE,
  stageAHead: STAGE_A_HEAD,
  stageATree: STAGE_A_TREE,
  stageAArtifactAggregateSha256: STAGE_A_AGGREGATE_SHA256,
  stageBHead: STAGE_B_HEAD,
  stageBTree: STAGE_B_TREE,
  stageBArtifactAggregateSha256: STAGE_B_AGGREGATE_SHA256,
  physicalRebindPacketSha256: PHYSICAL_REBIND_PACKET_SHA256,
  physicalRebindReviewSha256: PHYSICAL_REBIND_REVIEW_SHA256,
  physicalRebindPacketHead: PHYSICAL_REBIND_PACKET_HEAD,
  physicalRebindPacketTree: PHYSICAL_REBIND_PACKET_TREE,
  physicalRebindReviewHead: PHYSICAL_REBIND_REVIEW_HEAD,
  physicalRebindReviewTree: PHYSICAL_REBIND_REVIEW_TREE,
  packageLockSha256: PACKAGE_LOCK_SHA256,
  pgImportClosureSha256: PG_IMPORT_CLOSURE_SHA256,
  pgImportClosureFileCount: PG_IMPORT_CLOSURE_FILE_COUNT,
  stageAPathCount: 19,
  stageBPathCount: 9,
  catalog: Object.freeze({ tables: 14, columns: 207, constraints: 172, indexes: 44 }),
  dockerCli: DOCKER_CLI,
  dockerCliSha256: DOCKER_CLI_SHA256,
  imageReference: IMAGE_REFERENCE,
  imagePlatform: IMAGE_PLATFORM,
  imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
  phase1DockerCalls: 0,
  phase1PostgresConnections: 0,
  physicalRebindRequired: true,
  trafficReady: false,
  gateCReady: false,
});

export const LOCAL_POSTGRES_DOCKER_COMMAND_KINDS = Object.freeze([
  "version", "image.inspect", "image.pull", "container.inspect", "container.create",
  "container.start", "container.stop", "container.rm", "network.inspect", "network.create",
  "network.rm", "volume.inspect", "volume.create", "volume.rm",
]);

const GRANT_KEYS = Object.freeze(["schemaVersion", "grantId", "ownerApprovalReceiptSha256", "authority", "lineage", "artifacts", "host", "ceilings", "localOnly", "productionEffectsAllowed", "createdAt", "expiresAt"]);
const AUTHORITY_KEYS = Object.freeze(["wiringPacketSha256", "wiringOwnerReviewSha256", "addendumBSha256", "addendumBOwnerReviewSha256", "addendumCSha256", "addendumCOwnerReviewSha256", "physicalRebindPacketSha256", "physicalRebindReviewSha256", "executionCardSha256", "executionReviewSha256", "executionAuthorityPayloadSha256"]);
const LINEAGE_KEYS = Object.freeze(["addendumBWrapperHead", "addendumBWrapperTree", "addendumCWrapperHead", "addendumCWrapperTree", "stageAHead", "stageATree", "stageAArtifactAggregateSha256", "stageBHead", "stageBTree", "stageBArtifactAggregateSha256", "physicalRebindPacketHead", "physicalRebindPacketTree", "physicalRebindReviewHead", "physicalRebindReviewTree", "rebindImplementationHead", "rebindImplementationTree", "rebindImplementationArtifactAggregateSha256", "rebindEvidenceHead", "rebindEvidenceTree", "rebindStatusHead", "rebindStatusTree", "executionCardHead", "executionCardTree", "executionReviewHead", "executionReviewTree"]);
const ARTIFACT_KEYS = Object.freeze(["physicalRebindArtifactIndexSha256", "physicalRebindEvidenceSchemaSha256", "physicalRebindEvidenceSha256", "physicalRebindReportSha256", "rebindStatusCommittedAuditSummarySha256", "packageLockSha256", "pgImportClosureSha256", "pgImportClosureFileCount", "pgImportClosurePackageCount", "runnerSha256", "runnerTestSha256", "schemaSqlSha256", "verifySqlSha256", "rollbackSqlSha256", "catalogContractSha256", "catalog"]);
const HOST_KEYS = Object.freeze(["dockerCli", "dockerCliSha256", "dockerCliIdentitySha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform", "socketIdentitySha256", "imageReference", "imagePlatform", "imagePlatformManifest", "imageCachePolicy"]);
const CATALOG_KEYS = Object.freeze(["tables", "columns", "constraints", "indexes"]);
const DOCKER_CALL_CEILINGS = Object.freeze({
  version: 3, "image.inspect": 2, "image.pull": 1, "container.inspect": 8,
  "container.create": 1, "container.start": 2, "container.stop": 4, "container.rm": 3,
  "network.inspect": 7, "network.create": 1, "network.rm": 3,
  "volume.inspect": 7, "volume.create": 1, "volume.rm": 3,
});
const CEILING_VALUES = Object.freeze({
  maximumConstructionLifecycles: 1, maximumCleanupRecoveryLifecycles: 2, maximumDockerLifecycles: 3,
  maximumImagePullAttempts: 1, maximumCreatedDatabaseIdentities: 2, maximumConcurrentPools: 1,
  maximumConcurrentClients: 1, maximumConcurrentTransactions: 1, maximumInitialReadinessAttempts: 60,
  maximumRestartReadinessAttempts: 60, maximumOperationalPoolConstructions: 4,
  maximumTotalPoolConstructions: 124, maximumTotalConnectionAttempts: 124, maximumSchemaApplies: 3,
  maximumVerifies: 3, maximumRollbacks: 1, maximumDomainActionInvocations: 23,
  maximumDistinctDomainActions: 20, maximumContainerRestarts: 1, maximumAdminCreateDatabaseStatements: 1,
});
const CEILING_KEYS = Object.freeze([...Object.keys(CEILING_VALUES), "dockerCalls"]);

export const LOCAL_POSTGRES_V3_CEILINGS = Object.freeze({
  ...CEILING_VALUES,
  dockerCalls: DOCKER_CALL_CEILINGS,
});

export const LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY = Object.freeze({
  authority: Object.freeze({
    wiringPacketSha256: WIRING_PACKET_SHA256,
    wiringOwnerReviewSha256: WIRING_REVIEW_SHA256,
    addendumBSha256: ADDENDUM_SHA256,
    addendumBOwnerReviewSha256: ADDENDUM_REVIEW_SHA256,
    addendumCSha256: ADDENDUM_C_SHA256,
    addendumCOwnerReviewSha256: ADDENDUM_C_REVIEW_SHA256,
    physicalRebindPacketSha256: PHYSICAL_REBIND_PACKET_SHA256,
    physicalRebindReviewSha256: PHYSICAL_REBIND_REVIEW_SHA256,
  }),
  lineage: Object.freeze({
    addendumBWrapperHead: ADDENDUM_WRAPPER_HEAD, addendumBWrapperTree: ADDENDUM_WRAPPER_TREE,
    addendumCWrapperHead: ADDENDUM_C_WRAPPER_HEAD, addendumCWrapperTree: ADDENDUM_C_WRAPPER_TREE,
    stageAHead: STAGE_A_HEAD, stageATree: STAGE_A_TREE,
    stageAArtifactAggregateSha256: STAGE_A_AGGREGATE_SHA256,
    stageBHead: STAGE_B_HEAD, stageBTree: STAGE_B_TREE,
    stageBArtifactAggregateSha256: STAGE_B_AGGREGATE_SHA256,
    physicalRebindPacketHead: PHYSICAL_REBIND_PACKET_HEAD, physicalRebindPacketTree: PHYSICAL_REBIND_PACKET_TREE,
    physicalRebindReviewHead: PHYSICAL_REBIND_REVIEW_HEAD, physicalRebindReviewTree: PHYSICAL_REBIND_REVIEW_TREE,
  }),
  artifacts: Object.freeze({
    packageLockSha256: PACKAGE_LOCK_SHA256, pgImportClosureSha256: PG_IMPORT_CLOSURE_SHA256,
    pgImportClosureFileCount: PG_IMPORT_CLOSURE_FILE_COUNT, pgImportClosurePackageCount: PG_IMPORT_CLOSURE_PACKAGE_COUNT,
    schemaSqlSha256: SCHEMA_SQL_SHA256, verifySqlSha256: VERIFY_SQL_SHA256,
    rollbackSqlSha256: ROLLBACK_SQL_SHA256, catalogContractSha256: CATALOG_CONTRACT_SHA256,
    catalog: Object.freeze({ tables: 14, columns: 207, constraints: 172, indexes: 44 }),
  }),
  host: Object.freeze({
    dockerCli: DOCKER_CLI, dockerCliSha256: DOCKER_CLI_SHA256,
    dockerClientVersion: "29.3.1", dockerServerVersion: "29.3.1", dockerServerPlatform: IMAGE_PLATFORM,
    imageReference: IMAGE_REFERENCE, imagePlatform: IMAGE_PLATFORM,
    imagePlatformManifest: IMAGE_PLATFORM_MANIFEST, imageCachePolicy: IMAGE_CACHE_POLICY,
  }),
  ceilings: LOCAL_POSTGRES_V3_CEILINGS,
});

const ERROR_DETAILS = new WeakMap();
const DOCKER_CALL_FAILURE_OUTCOMES = new WeakMap();
const JOURNAL_GENESIS = `sha256:${"0".repeat(64)}`;
const JOURNAL_DIRECTORY = "journal-v3";
const JOURNAL_MAXIMUM_ENTRIES = 1024;
const JOURNAL_NORMAL_MAXIMUM_BYTES = 900_000;
const JOURNAL_TOTAL_MAXIMUM_BYTES = 1_000_000;
const MAX_DOCKER_OUTPUT_BYTES = 16 * 1024 * 1024;
const POSTGRES_READY_ATTEMPTS = 60;
const POSTGRES_READY_INTERVAL_MS = 500;
const RECEIPT_VALIDATION_MUTATIONS = new Set([
  "top_extra", "authority", "lineage", "artifacts", "host", "effects", "target",
  "cleanup", "journal", "readiness", "prior_evidence", "coordinator", "consumed_grant",
  "nested_extra", "code", "status",
]);
const JOURNAL_EVENTS = new Set([
  "grant.consumed", "docker.lifecycle_started", "docker.version_verified", "resources.absence_verified",
  "image.pull_attempted", "image.pulled", "image.verified", "network.created", "volume.created",
  "container.created", "container.started", "primary.schema_verified", "primary.walking_flow_green",
  "container.stopped", "primary.restart_replay_green", "primary.closure_flow_green",
  "rollback_database.created", "rollback_database.rehearsal_green", "container.removed",
  "network.removed", "volume.removed", "cleanup.proven", "cleanup.recovered",
  "effect.attempt", "effect.completed", "observation.recorded",
]);
const EFFECT_KINDS = new Set([
  ...LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind) => `docker:${kind}`),
  "pool:construct", "connection:connect", "database:create", "sql:schema", "sql:verify", "sql:rollback",
  "domain:invoke", "container:restart",
]);
const EFFECT_TARGETS = Object.freeze({
  "pool:construct": new Set(["initial_readiness", "restart_readiness", "operational_primary", "operational_replay", "operational_rollback", "operational_admin"]),
  "connection:connect": new Set(["primary", "rollback", "admin"]),
  "database:create": new Set(["primary", "rollback"]),
  "sql:schema": new Set(["primary_initial", "rollback_initial", "rollback_reapply"]),
  "sql:verify": new Set(["primary_initial", "rollback_initial", "rollback_reapply"]),
  "sql:rollback": new Set(["rollback"]),
  "container:restart": new Set(["primary"]),
});

function assertUnicode(value) {
  if (typeof value !== "string" || value.normalize("NFC") !== value) throw new TypeError("invalid_unicode");
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("invalid_unicode");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new TypeError("invalid_unicode");
  }
}

function encodeCanonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("invalid_number");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertUnicode(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => encodeCanonical(item)).join(",")}]`;
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    || Object.getOwnPropertySymbols(value).length !== 0) throw new TypeError("invalid_json_value");
  const keys = Object.keys(value).sort(binaryCompare);
  return `{${keys.map((key) => {
    assertUnicode(key);
    if (value[key] === undefined) throw new TypeError("invalid_json_value");
    return `${JSON.stringify(key)}:${encodeCanonical(value[key])}`;
  }).join(",")}}`;
}

function canonicalJson(value) {
  return encodeCanonical(value);
}

class StrictJsonParser {
  #source;
  #index = 0;

  constructor(source) {
    if (typeof source !== "string") throw new TypeError("invalid_json_source");
    this.#source = source;
  }

  parse() {
    this.#skipWhitespace();
    const value = this.#parseValue();
    this.#skipWhitespace();
    if (this.#index !== this.#source.length) this.#error();
    return value;
  }

  #parseValue() {
    const char = this.#source[this.#index];
    if (char === "{") return this.#parseObject();
    if (char === "[") return this.#parseArray();
    if (char === '"') return this.#parseString();
    if (char === "t") return this.#literal("true", true);
    if (char === "f") return this.#literal("false", false);
    if (char === "n") return this.#literal("null", null);
    return this.#parseNumber();
  }

  #parseObject() {
    this.#index += 1;
    this.#skipWhitespace();
    const object = Object.create(null);
    const seen = new Set();
    if (this.#source[this.#index] === "}") { this.#index += 1; return object; }
    while (true) {
      if (this.#source[this.#index] !== '"') this.#error();
      const key = this.#parseString();
      if (seen.has(key)) this.#error();
      seen.add(key);
      this.#skipWhitespace();
      if (this.#source[this.#index] !== ":") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
      object[key] = this.#parseValue();
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "}") { this.#index += 1; return object; }
      if (separator !== ",") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseArray() {
    this.#index += 1;
    this.#skipWhitespace();
    const array = [];
    if (this.#source[this.#index] === "]") { this.#index += 1; return array; }
    while (true) {
      array.push(this.#parseValue());
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "]") { this.#index += 1; return array; }
      if (separator !== ",") this.#error();
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseString() {
    const start = this.#index;
    this.#index += 1;
    let escaped = false;
    while (this.#index < this.#source.length) {
      const code = this.#source.charCodeAt(this.#index);
      if (!escaped && code === 0x22) {
        this.#index += 1;
        let value;
        try { value = JSON.parse(this.#source.slice(start, this.#index)); } catch { this.#error(); }
        assertUnicode(value);
        return value;
      }
      if (!escaped && code < 0x20) this.#error();
      if (!escaped && code === 0x5c) escaped = true;
      else escaped = false;
      this.#index += 1;
    }
    this.#error();
  }

  #parseNumber() {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(this.#source.slice(this.#index));
    if (!match) this.#error();
    this.#index += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) this.#error();
    return number;
  }

  #literal(literal, value) {
    if (!this.#source.startsWith(literal, this.#index)) this.#error();
    this.#index += literal.length;
    return value;
  }

  #skipWhitespace() {
    while ([" ", "\t", "\n", "\r"].includes(this.#source[this.#index])) this.#index += 1;
  }

  #error() {
    throw new SyntaxError("invalid_strict_json");
  }
}

function parseStrictJson(source) {
  return new StrictJsonParser(source).parse();
}

export class LocalPostgresRunnerError extends Error {
  constructor(code) {
    super(code);
    this.name = "LocalPostgresRunnerError";
    ERROR_DETAILS.set(this, Object.freeze({ code }));
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({ name: "LocalPostgresRunnerError", code: ERROR_DETAILS.get(this)?.code ?? "local_postgres_runner_failed" });
  }
}

function authenticLocalPostgresRunnerErrorDetails(error) {
  try {
    if ((typeof error !== "object" && typeof error !== "function") || error === null || !Object.isFrozen(error)) return null;
    return ERROR_DETAILS.get(error) ?? null;
  } catch {
    return null;
  }
}

function fail(code) {
  throw new LocalPostgresRunnerError(code);
}

function failDockerCall(outcome) {
  if (outcome !== "FAILED" && outcome !== "AMBIGUOUS") fail("local_postgres_docker_call_failed");
  const error = new LocalPostgresRunnerError("local_postgres_docker_call_failed");
  DOCKER_CALL_FAILURE_OUTCOMES.set(error, outcome);
  throw error;
}

function authenticDockerCallFailureOutcome(error) {
  return authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_docker_call_failed"
    ? DOCKER_CALL_FAILURE_OUTCOMES.get(error) ?? null : null;
}

function sha256Bytes(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function sha256File(filePath) {
  try {
    return sha256Bytes(fs.readFileSync(filePath));
  } catch {
    fail("local_postgres_file_read_failed");
  }
}

function sha256StableOwnedFile(filePath, maximumBytes = 64 * 1024 * 1024) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : before.uid;
    if (!before.isFile() || before.isSymbolicLink() || before.uid !== uid || before.nlink !== 1n
      || (Number(before.mode) & 0o777) !== 0o644 || before.size < 1n || before.size > BigInt(maximumBytes)) {
      fail("local_postgres_file_read_failed");
    }
    const hash = crypto.createHash("sha256");
    const chunk = Buffer.alloc(64 * 1024);
    let position = 0;
    while (position < Number(before.size)) {
      const count = fs.readSync(descriptor, chunk, 0, Math.min(chunk.length, Number(before.size) - position), position);
      if (count === 0) break;
      hash.update(chunk.subarray(0, count)); position += count;
    }
    chunk.fill(0);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (position !== Number(before.size) || before.dev !== after.dev || before.ino !== after.ino
      || before.mode !== after.mode || before.uid !== after.uid || before.nlink !== after.nlink
      || before.size !== after.size || before.mtimeMs !== after.mtimeMs) fail("local_postgres_file_read_failed");
    return `sha256:${hash.digest("hex")}`;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_file_read_failed");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function binaryCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function ownedPlain(value, depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("local_postgres_input_invalid");
    return value;
  }
  if (typeof value !== "object" || depth > 32 || seen.has(value)) fail("local_postgres_input_invalid");
  seen.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) fail("local_postgres_input_invalid");
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) fail("local_postgres_input_invalid");
      const length = descriptors.length;
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0) fail("local_postgres_input_invalid");
      const result = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail("local_postgres_input_invalid");
        result.push(ownedPlain(descriptor.value, depth + 1, seen));
      }
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key))) fail("local_postgres_input_invalid");
      return Object.freeze(result);
    }
    if (prototype !== Object.prototype && prototype !== null) fail("local_postgres_input_invalid");
    const result = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor) || !descriptor.enumerable) fail("local_postgres_input_invalid");
      result[key] = ownedPlain(descriptor.value, depth + 1, seen);
    }
    return Object.freeze(result);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_input_invalid");
  } finally {
    seen.delete(value);
  }
}

function exactKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("local_postgres_input_invalid");
  const actual = Object.keys(value).sort(binaryCompare);
  const wanted = [...expected].sort(binaryCompare);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail("local_postgres_input_invalid");
}

function assertSha(value) {
  if (typeof value !== "string" || !SHA256.test(value)) fail("local_postgres_hash_invalid");
  return value;
}

function assertGit(value) {
  if (typeof value !== "string" || !GIT_OBJECT.test(value)) fail("local_postgres_git_binding_invalid");
  return value;
}

function instant(value) {
  if (typeof value !== "string") fail("local_postgres_time_invalid");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail("local_postgres_time_invalid");
  return parsed;
}

function runGit(args, binary = false) {
  const closedArgs = [
    "--no-optional-locks",
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "diff.external=",
    "-c", "submodule.recurse=false",
    ...args,
  ];
  const result = spawnSync("/usr/bin/git", closedArgs, {
    cwd: ROOT,
    encoding: binary ? null : "utf8",
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
    },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.status !== 0 || result.signal !== null) fail("local_postgres_git_verification_failed");
  if (binary) {
    if (!Buffer.isBuffer(result.stdout)) fail("local_postgres_git_verification_failed");
    return result.stdout;
  }
  if (typeof result.stdout !== "string") fail("local_postgres_git_verification_failed");
  return result.stdout.trim();
}

function gitBlob(head, artifactPath) {
  if (!GIT_OBJECT.test(head) || !LOCAL_POSTGRES_STAGE_A_PATHS.includes(artifactPath)) fail("local_postgres_git_binding_invalid");
  return runGit(["show", `${head}:${artifactPath}`], true);
}

export function computeStageAArtifactAggregate(head) {
  assertGit(head);
  const records = LOCAL_POSTGRES_STAGE_A_PATHS.map((artifactPath) => {
    const bytes = gitBlob(head, artifactPath);
    return Object.freeze({ path: artifactPath, bytes: bytes.length, sha256: sha256Bytes(bytes) });
  });
  const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
  return Object.freeze({ records: Object.freeze(records), aggregateSha256: sha256Bytes(frame) });
}

function assertPrivateDirectory(directoryPath) {
  let stat;
  try {
    stat = fs.lstatSync(directoryPath, { bigint: true });
  } catch {
    fail("local_postgres_private_root_invalid");
  }
  const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
  if (!path.isAbsolute(directoryPath) || !stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid
    || (Number(stat.mode) & 0o777) !== 0o700 || stat.nlink < 2n) fail("local_postgres_private_root_invalid");
  return stat;
}

function privateDirectoryIdentity(directoryPath, stat = assertPrivateDirectory(directoryPath)) {
  return Object.freeze({
    path: directoryPath,
    dev: stat.dev,
    ino: stat.ino,
    uid: stat.uid,
    gid: stat.gid,
    mode: stat.mode,
  });
}

function assertPrivateDirectoryIdentity(identity) {
  if (identity === null || typeof identity !== "object" || typeof identity.path !== "string") {
    fail("local_postgres_private_root_invalid");
  }
  let resolved;
  try { resolved = fs.realpathSync(identity.path); } catch { fail("local_postgres_private_root_invalid"); }
  const current = assertPrivateDirectory(identity.path);
  if (resolved !== identity.path || current.dev !== identity.dev || current.ino !== identity.ino
    || current.uid !== identity.uid || current.gid !== identity.gid || current.mode !== identity.mode) {
    fail("local_postgres_private_root_invalid");
  }
}

function readPrivateJsonRecord(filePath, expectedLinks = 1n) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isFile() || stat.uid !== uid || (Number(stat.mode) & 0o777) !== 0o600
      || stat.nlink !== expectedLinks || stat.size > 65_536n) {
      fail("local_postgres_private_file_invalid");
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (after.dev !== stat.dev || after.ino !== stat.ino || after.size !== stat.size
      || after.nlink !== expectedLinks) fail("local_postgres_private_file_invalid");
    const raw = bytes.toString("utf8");
    const parsed = parseStrictJson(raw);
    if (raw !== `${canonicalJson(parsed)}\n`) fail("local_postgres_private_file_invalid");
    return Object.freeze({ value: parsed, sha256: sha256Bytes(bytes) });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function readPrivateJson(filePath) {
  return readPrivateJsonRecord(filePath).value;
}

function writePrivateJson(filePath, value, exclusive = true) {
  let descriptor;
  try {
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW | (exclusive ? fs.constants.O_EXCL : fs.constants.O_TRUNC);
    descriptor = fs.openSync(filePath, flags, 0o600);
    const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
    if (bytes.length > 65_536) fail("local_postgres_private_file_invalid");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function installPendingGrant(privateRoot, filePath, value, hooks = Object.freeze({})) {
  const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
  if (bytes.length < 1 || bytes.length > 65_536) fail("local_postgres_private_file_invalid");
  let descriptor;
  let createdIdentity = null;
  let installed = false;
  try {
    hooks.checkpoint?.("pending.open", "before");
    descriptor = fs.openSync(filePath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    const opened = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : opened.uid;
    if (!opened.isFile() || opened.uid !== uid || opened.nlink !== 1n || (Number(opened.mode) & 0o777) !== 0o600) {
      fail("local_postgres_private_file_invalid");
    }
    createdIdentity = Object.freeze({ dev: opened.dev, ino: opened.ino });
    hooks.checkpoint?.("pending.open", "after");
    hooks.checkpoint?.("pending.write", "before");
    fs.writeFileSync(descriptor, bytes);
    hooks.checkpoint?.("pending.write", "after");
    hooks.checkpoint?.("pending.file_fsync", "before");
    fs.fsyncSync(descriptor);
    hooks.checkpoint?.("pending.file_fsync", "after");
    const written = fs.fstatSync(descriptor, { bigint: true });
    if (written.dev !== opened.dev || written.ino !== opened.ino || written.nlink !== 1n
      || written.size !== BigInt(bytes.length) || (Number(written.mode) & 0o777) !== 0o600) {
      fail("local_postgres_private_file_invalid");
    }
    hooks.checkpoint?.("pending.close", "before");
    fs.closeSync(descriptor);
    descriptor = undefined;
    hooks.checkpoint?.("pending.close", "after");
    hooks.checkpoint?.("pending.directory_fsync", "before");
    fsyncPrivateDirectory(privateRoot);
    hooks.checkpoint?.("pending.directory_fsync", "after");
    const installedRecord = readPrivateJsonRecord(filePath);
    const current = fs.lstatSync(filePath, { bigint: true });
    if (current.dev !== createdIdentity.dev || current.ino !== createdIdentity.ino || current.nlink !== 1n
      || installedRecord.sha256 !== sha256Bytes(bytes)) fail("local_postgres_private_file_invalid");
    installed = true;
    return Object.freeze({ identity: createdIdentity, sha256: installedRecord.sha256 });
  } catch (error) {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { /* exact created inode cleanup below remains authoritative */ }
      descriptor = undefined;
    }
    if (createdIdentity !== null && !installed) {
      try {
        const current = fs.lstatSync(filePath, { bigint: true });
        if (current.dev !== createdIdentity.dev || current.ino !== createdIdentity.ino || current.nlink !== 1n) {
          fail("local_postgres_private_file_invalid");
        }
        fs.unlinkSync(filePath);
        fsyncPrivateDirectory(privateRoot);
        exactFileAbsence(filePath);
      } catch (cleanupError) {
        if (authenticLocalPostgresRunnerErrorDetails(cleanupError) !== null) throw cleanupError;
        fail("local_postgres_private_file_invalid");
      }
    }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    bytes.fill(0);
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { /* caught path handles created inode */ }
    }
  }
}

export function deriveLocalPostgresResourceNames(grantId) {
  if (typeof grantId !== "string" || !GRANT_ID.test(grantId)) fail("local_postgres_grant_invalid");
  const suffix = grantId.slice(0, 16);
  return Object.freeze({
    runId: suffix,
    container: `forme-r4-public-core-local-${suffix}`,
    network: `forme-r4-public-core-local-net-${suffix}`,
    volume: `forme-r4-public-core-local-vol-${suffix}`,
    databasePrimary: `forme_r4_local_${suffix}_a`,
    databaseRollback: `forme_r4_local_${suffix}_b`,
    labelKey: "forme.r4.public-core.local.grant",
    labelValue: grantId,
  });
}

function assertFixedRecord(actual, expected) {
  exactKeys(actual, Object.keys(expected));
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) fail("local_postgres_grant_invalid");
  }
}

function selectKeys(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

function artifactAggregate(head, artifactPaths) {
  assertGit(head);
  const records = artifactPaths.map((artifactPath) => {
    if (typeof artifactPath !== "string" || artifactPath.includes(":") || path.isAbsolute(artifactPath)) {
      fail("local_postgres_git_binding_invalid");
    }
    const bytes = runGit(["show", `${head}:${artifactPath}`], true);
    return Object.freeze({ path: artifactPath, bytes: bytes.length, sha256: sha256Bytes(bytes) });
  });
  const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
  return Object.freeze({ records: Object.freeze(records), aggregateSha256: sha256Bytes(frame) });
}

function exactCommitStep(parent, child, tree, expectedStatuses, code) {
  try {
    if (runGit(["rev-parse", `${child}^{commit}`]) !== child
      || runGit(["rev-parse", `${child}^{tree}`]) !== tree
      || runGit(["rev-parse", `${child}^`]) !== parent) fail(code);
    const commitRecord = runGit(["cat-file", "-p", child]);
    const parents = commitRecord.split("\n").filter((line) => line.startsWith("parent "));
    if (parents.length !== 1 || parents[0] !== `parent ${parent}`) fail(code);
    const raw = runGit(["diff", "--raw", "--no-renames", parent, child]).split("\n").filter(Boolean);
    const expected = [...expectedStatuses.entries()].sort(([left], [right]) => binaryCompare(left, right));
    const observed = raw.map((line) => {
      const match = /^:([0-7]{6}) ([0-7]{6}) [0-9a-f]+ [0-9a-f]+ ([AM])\t([^\n]+)$/u.exec(line);
      if (!match) fail(code);
      const [, oldMode, newMode, status, artifactPath] = match;
      if ((status === "A" && (oldMode !== "000000" || newMode !== "100644"))
        || (status === "M" && (oldMode !== "100644" || newMode !== "100644"))) fail(code);
      return [artifactPath, status];
    }).sort(([left], [right]) => binaryCompare(left, right));
    if (observed.length !== expected.length || observed.some(([artifactPath, status], index) => (
      artifactPath !== expected[index][0] || status !== expected[index][1]
    ))) fail(code);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail(code);
  }
}

function statusMap(paths, added = new Set()) {
  return new Map(paths.map((artifactPath) => [artifactPath, added.has(artifactPath) ? "A" : "M"]));
}

function verifyHistoricalTopology() {
  const stageAAdded = new Set([
    "apps/room/src/public-core-pg-executor.ts", "apps/room/src/public-core-postgres-application-store.ts",
    "scripts/r4-public-core-local-postgres.mjs", "test/r4/public-core-local-postgres.test.ts",
    "test/r4/public-core-pg-executor.test.ts", "test/r4/public-core-postgres-application-store.test.ts",
  ]);
  const stageBAdded = new Set([
    "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md",
    "docs/evidence/r4-public-core-local-postgres-wiring.json",
    "schemas/r4/public-core/local-postgres-artifact-index.json",
    "schemas/r4/public-core/local-postgres-wiring-evidence.schema.json",
  ]);
  const wiringPacketPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-PACKET.md";
  const wiringReviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-OWNER-REVIEW.md";
  const addendumBPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-B.md";
  const addendumBReviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-B-OWNER-REVIEW.md";
  const addendumCPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-C.md";
  const addendumCReviewPath = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-ADDENDUM-C-OWNER-REVIEW.md";
  exactCommitStep(WIRING_PACKET_PARENT_HEAD, WIRING_PACKET_PROPOSAL_HEAD, WIRING_PACKET_PROPOSAL_TREE,
    new Map([[wiringPacketPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(WIRING_PACKET_PROPOSAL_HEAD, WIRING_WRAPPER_HEAD, WIRING_WRAPPER_TREE,
    new Map([[wiringReviewPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(WIRING_WRAPPER_HEAD, ADDENDUM_B_INITIAL_HEAD, ADDENDUM_B_INITIAL_TREE,
    new Map([[addendumBPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(ADDENDUM_B_INITIAL_HEAD, ADDENDUM_B_PROPOSAL_HEAD, ADDENDUM_B_PROPOSAL_TREE,
    new Map([[addendumBPath, "M"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(ADDENDUM_B_PROPOSAL_HEAD, ADDENDUM_WRAPPER_HEAD, ADDENDUM_WRAPPER_TREE,
    new Map([[addendumBReviewPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(ADDENDUM_WRAPPER_HEAD, ADDENDUM_C_PROPOSAL_HEAD, ADDENDUM_C_PROPOSAL_TREE,
    new Map([[addendumCPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(ADDENDUM_C_PROPOSAL_HEAD, ADDENDUM_C_WRAPPER_HEAD, ADDENDUM_C_WRAPPER_TREE,
    new Map([[addendumCReviewPath, "A"]]), "local_postgres_historical_binding_invalid");
  exactCommitStep(ADDENDUM_C_WRAPPER_HEAD, STAGE_A_HEAD, STAGE_A_TREE,
    statusMap(LOCAL_POSTGRES_STAGE_A_PATHS, stageAAdded), "local_postgres_stage_a_binding_invalid");
  exactCommitStep(STAGE_A_HEAD, STAGE_B_HEAD, STAGE_B_TREE,
    statusMap(LOCAL_POSTGRES_STAGE_B_PATHS, stageBAdded), "local_postgres_stage_b_binding_invalid");
  exactCommitStep(STAGE_B_HEAD, PHYSICAL_REBIND_PACKET_HEAD, PHYSICAL_REBIND_PACKET_TREE,
    new Map([[LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.packet, "A"]]), "local_postgres_physical_rebind_binding_invalid");
  exactCommitStep(PHYSICAL_REBIND_PACKET_HEAD, PHYSICAL_REBIND_REVIEW_HEAD, PHYSICAL_REBIND_REVIEW_TREE,
    new Map([[LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.review, "A"]]), "local_postgres_physical_rebind_binding_invalid");
  if (runGit(["rev-parse", `${WIRING_PACKET_PROPOSAL_HEAD}^{tree}`]) !== WIRING_PACKET_PROPOSAL_TREE
    || runGit(["rev-parse", `${ADDENDUM_B_PROPOSAL_HEAD}^{tree}`]) !== ADDENDUM_B_PROPOSAL_TREE
    || sha256Bytes(runGit(["show", `${WIRING_PACKET_PROPOSAL_HEAD}:${wiringPacketPath}`], true)) !== WIRING_PACKET_SHA256
    || sha256Bytes(runGit(["show", `${WIRING_WRAPPER_HEAD}:${wiringReviewPath}`], true)) !== WIRING_REVIEW_SHA256
    || sha256Bytes(runGit(["show", `${ADDENDUM_B_INITIAL_HEAD}:${addendumBPath}`], true)) !== ADDENDUM_B_INITIAL_SHA256
    || sha256Bytes(runGit(["show", `${ADDENDUM_B_PROPOSAL_HEAD}:${addendumBPath}`], true)) !== ADDENDUM_SHA256
    || sha256Bytes(runGit(["show", `${ADDENDUM_WRAPPER_HEAD}:${addendumBReviewPath}`], true)) !== ADDENDUM_REVIEW_SHA256
    || sha256Bytes(runGit(["show", `${ADDENDUM_C_PROPOSAL_HEAD}:${addendumCPath}`], true)) !== ADDENDUM_C_SHA256
    || sha256Bytes(runGit(["show", `${ADDENDUM_C_WRAPPER_HEAD}:${addendumCReviewPath}`], true)) !== ADDENDUM_C_REVIEW_SHA256
    || runGit(["rev-parse", `${ADDENDUM_C_WRAPPER_HEAD}^{tree}`]) !== ADDENDUM_C_WRAPPER_TREE
    || artifactAggregate(STAGE_A_HEAD, LOCAL_POSTGRES_STAGE_A_PATHS).aggregateSha256 !== STAGE_A_AGGREGATE_SHA256
    || artifactAggregate(STAGE_B_HEAD, LOCAL_POSTGRES_STAGE_B_PATHS).aggregateSha256 !== STAGE_B_AGGREGATE_SHA256
    || sha256Bytes(runGit(["show", `${PHYSICAL_REBIND_PACKET_HEAD}:${LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.packet}`], true)) !== PHYSICAL_REBIND_PACKET_SHA256
    || sha256Bytes(runGit(["show", `${PHYSICAL_REBIND_REVIEW_HEAD}:${LOCAL_POSTGRES_PHYSICAL_REBIND_PATHS.review}`], true)) !== PHYSICAL_REBIND_REVIEW_SHA256
    || sha256Bytes(runGit(["show", `${STAGE_B_HEAD}:schemas/r4/public-core/local-postgres-artifact-index.json`], true)) !== PHASE1_ARTIFACT_INDEX_SHA256
    || sha256Bytes(runGit(["show", `${STAGE_B_HEAD}:schemas/r4/public-core/local-postgres-wiring-evidence.schema.json`], true)) !== PHASE1_EVIDENCE_SCHEMA_SHA256
    || sha256Bytes(runGit(["show", `${STAGE_B_HEAD}:docs/evidence/r4-public-core-local-postgres-wiring.json`], true)) !== PHASE1_EVIDENCE_SHA256
    || sha256Bytes(runGit(["show", `${STAGE_B_HEAD}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-WIRING-CONSTRUCTION-REPORT.md`], true)) !== PHASE1_REPORT_SHA256
    || sha256Bytes(runGit(["show", `${STAGE_B_HEAD}:docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`], true)) !== PHASE1_GATE_C_CARD_SHA256) {
    fail("local_postgres_historical_binding_invalid");
  }
}

export function validateLocalPostgresGrant(rawGrant, now = new Date()) {
  const grant = ownedPlain(rawGrant);
  exactKeys(grant, GRANT_KEYS);
  if (grant.schemaVersion !== "r4.public-core-local-postgres-grant.v3"
    || typeof grant.grantId !== "string" || !GRANT_ID.test(grant.grantId)
    || grant.localOnly !== true || grant.productionEffectsAllowed !== false) fail("local_postgres_grant_invalid");
  exactKeys(grant.authority, AUTHORITY_KEYS);
  exactKeys(grant.lineage, LINEAGE_KEYS);
  exactKeys(grant.artifacts, ARTIFACT_KEYS);
  exactKeys(grant.artifacts.catalog, CATALOG_KEYS);
  exactKeys(grant.host, HOST_KEYS);
  exactKeys(grant.ceilings, CEILING_KEYS);
  exactKeys(grant.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  assertFixedRecord(selectKeys(grant.authority, Object.keys(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority)), LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority);
  assertFixedRecord(selectKeys(grant.lineage, Object.keys(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage)), LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage);
  assertFixedRecord(grant.artifacts.catalog, LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.catalog);
  for (const [key, value] of Object.entries(CEILING_VALUES)) if (grant.ceilings[key] !== value) fail("local_postgres_grant_invalid");
  for (const [key, value] of Object.entries(DOCKER_CALL_CEILINGS)) if (grant.ceilings.dockerCalls[key] !== value) fail("local_postgres_grant_invalid");
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.host)) {
    if (grant.host[key] !== value) fail("local_postgres_grant_invalid");
  }
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts)) {
    if (key !== "catalog" && grant.artifacts[key] !== value) fail("local_postgres_grant_invalid");
  }
  for (const key of [...AUTHORITY_KEYS, "ownerApprovalReceiptSha256"]) assertSha(key === "ownerApprovalReceiptSha256" ? grant[key] : grant.authority[key]);
  for (const key of LINEAGE_KEYS) (key.endsWith("Sha256") ? assertSha(grant.lineage[key]) : assertGit(grant.lineage[key]));
  for (const key of ARTIFACT_KEYS) if (key.endsWith("Sha256")) assertSha(grant.artifacts[key]);
  assertSha(grant.host.dockerCliSha256); assertSha(grant.host.dockerCliIdentitySha256); assertSha(grant.host.socketIdentitySha256);
  if (grant.artifacts.pgImportClosureFileCount !== PG_IMPORT_CLOSURE_FILE_COUNT
    || grant.artifacts.pgImportClosurePackageCount !== PG_IMPORT_CLOSURE_PACKAGE_COUNT
    || grant.artifacts.schemaSqlSha256 !== SCHEMA_SQL_SHA256
    || grant.artifacts.verifySqlSha256 !== VERIFY_SQL_SHA256
    || grant.artifacts.rollbackSqlSha256 !== ROLLBACK_SQL_SHA256
    || OBSOLETE_SQL_HASHES.has(grant.artifacts.schemaSqlSha256)
    || OBSOLETE_SQL_HASHES.has(grant.artifacts.verifySqlSha256)
    || OBSOLETE_SQL_HASHES.has(grant.artifacts.rollbackSqlSha256)) fail("local_postgres_obsolete_sql_grant");
  const createdAt = instant(grant.createdAt);
  const expiresAt = instant(grant.expiresAt);
  const observedAt = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(observedAt) || expiresAt <= createdAt || expiresAt - createdAt > MAX_GRANT_LIFETIME_MS
    || observedAt < createdAt - 60_000 || observedAt >= expiresAt) fail("local_postgres_grant_expired");
  deriveLocalPostgresResourceNames(grant.grantId);
  return grant;
}

function verifySuccessorTopology(grant) {
  verifyHistoricalTopology();
  const lineage = grant.lineage;
  exactCommitStep(PHYSICAL_REBIND_REVIEW_HEAD, EFFECT0_IMPLEMENTATION_HEAD, EFFECT0_IMPLEMENTATION_TREE,
    statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS), "local_postgres_rebind_implementation_binding_invalid");
  exactCommitStep(EFFECT0_IMPLEMENTATION_HEAD, EFFECT0_EVIDENCE_HEAD, EFFECT0_EVIDENCE_TREE,
    statusMap(LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS, new Set(LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS)), "local_postgres_rebind_evidence_binding_invalid");
  exactCommitStep(EFFECT0_EVIDENCE_HEAD, EFFECT0_STATUS_HEAD, EFFECT0_STATUS_TREE,
    statusMap(LOCAL_POSTGRES_EFFECT0_STATUS_PATHS, new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md"])), "local_postgres_rebind_status_binding_invalid");
  exactCommitStep(EFFECT0_STATUS_HEAD, FAILED_EXECUTION_CARD_HEAD, FAILED_EXECUTION_CARD_TREE,
    new Map([[PHYSICAL_EXECUTION_CARD_PATH, "A"]]), "local_postgres_execution_card_binding_invalid");
  exactCommitStep(FAILED_EXECUTION_CARD_HEAD, FAILED_EXECUTION_REVIEW_HEAD, FAILED_EXECUTION_REVIEW_TREE,
    new Map([[PHYSICAL_EXECUTION_REVIEW_PATH, "A"]]), "local_postgres_execution_review_binding_invalid");
  exactCommitStep(FAILED_EXECUTION_REVIEW_HEAD, APFS_NLINK_CORRECTION_ADDENDUM_HEAD, APFS_NLINK_CORRECTION_ADDENDUM_TREE,
    new Map([[APFS_NLINK_CORRECTION_ADDENDUM_PATH, "A"]]), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_NLINK_CORRECTION_ADDENDUM_HEAD, APFS_NLINK_CORRECTION_REVIEW_HEAD, APFS_NLINK_CORRECTION_REVIEW_TREE,
    new Map([[APFS_NLINK_CORRECTION_REVIEW_PATH, "A"]]), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_NLINK_CORRECTION_REVIEW_HEAD, lineage.rebindImplementationHead, lineage.rebindImplementationTree,
    statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS), "local_postgres_rebind_implementation_binding_invalid");
  exactCommitStep(lineage.rebindImplementationHead, lineage.rebindEvidenceHead, lineage.rebindEvidenceTree,
    statusMap(LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS, new Set(LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS)), "local_postgres_rebind_evidence_binding_invalid");
  exactCommitStep(lineage.rebindEvidenceHead, lineage.rebindStatusHead, lineage.rebindStatusTree,
    statusMap(LOCAL_POSTGRES_REBIND_STATUS_PATHS, new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md"])), "local_postgres_rebind_status_binding_invalid");
  exactCommitStep(lineage.rebindStatusHead, lineage.executionCardHead, lineage.executionCardTree,
    new Map([[PHYSICAL_EXECUTION_CARD_PATH, "A"]]), "local_postgres_execution_card_binding_invalid");
  exactCommitStep(lineage.executionCardHead, lineage.executionReviewHead, lineage.executionReviewTree,
    new Map([[PHYSICAL_EXECUTION_REVIEW_PATH, "A"]]), "local_postgres_execution_review_binding_invalid");
  const implementation = artifactAggregate(lineage.rebindImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const effect0Implementation = artifactAggregate(EFFECT0_IMPLEMENTATION_HEAD, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  if (effect0Implementation.aggregateSha256 !== EFFECT0_IMPLEMENTATION_AGGREGATE_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[0]}`], true)) !== EFFECT0_EVIDENCE_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[1]}`], true)) !== EFFECT0_ARTIFACT_INDEX_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[2]}`], true)) !== EFFECT0_EVIDENCE_SCHEMA_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_STATUS_HEAD}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md`], true)) !== EFFECT0_REPORT_SHA256
    || sha256Bytes(runGit(["show", `${FAILED_EXECUTION_CARD_HEAD}:${PHYSICAL_EXECUTION_CARD_PATH}`], true)) !== FAILED_EXECUTION_CARD_SHA256
    || sha256Bytes(runGit(["show", `${FAILED_EXECUTION_REVIEW_HEAD}:${PHYSICAL_EXECUTION_REVIEW_PATH}`], true)) !== FAILED_EXECUTION_REVIEW_SHA256
    || sha256Bytes(runGit(["show", `${APFS_NLINK_CORRECTION_ADDENDUM_HEAD}:${APFS_NLINK_CORRECTION_ADDENDUM_PATH}`], true)) !== APFS_NLINK_CORRECTION_ADDENDUM_SHA256
    || sha256Bytes(runGit(["show", `${APFS_NLINK_CORRECTION_REVIEW_HEAD}:${APFS_NLINK_CORRECTION_REVIEW_PATH}`], true)) !== APFS_NLINK_CORRECTION_REVIEW_SHA256
    || implementation.aggregateSha256 !== lineage.rebindImplementationArtifactAggregateSha256
    || implementation.records[0].sha256 !== grant.artifacts.runnerSha256
    || implementation.records[1].sha256 !== grant.artifacts.runnerTestSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[0]}`], true)) !== grant.artifacts.physicalRebindEvidenceSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[1]}`], true)) !== grant.artifacts.physicalRebindArtifactIndexSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[2]}`], true)) !== grant.artifacts.physicalRebindEvidenceSchemaSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindStatusHead}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md`], true)) !== grant.artifacts.physicalRebindReportSha256
    || sha256Bytes(runGit(["show", `${lineage.executionCardHead}:${PHYSICAL_EXECUTION_CARD_PATH}`], true)) !== grant.authority.executionCardSha256
    || sha256Bytes(runGit(["show", `${lineage.executionReviewHead}:${PHYSICAL_EXECUTION_REVIEW_PATH}`], true)) !== grant.authority.executionReviewSha256) {
    fail("local_postgres_successor_binding_invalid");
  }
}

function verifyExecutionAuthorityPayloadAgainstGrant(grant) {
  const cardBytes = runGit(["show", `${grant.lineage.executionCardHead}:${PHYSICAL_EXECUTION_CARD_PATH}`], true);
  const parsed = parseExecutionAuthorityCard(cardBytes);
  if (parsed.sha256 !== grant.authority.executionAuthorityPayloadSha256
    || canonicalJson(parsed.payload.authority) !== canonicalJson(selectKeys(grant.authority, Object.keys(parsed.payload.authority)))
    || canonicalJson(parsed.payload.lineage) !== canonicalJson(selectKeys(grant.lineage, EXECUTION_PAYLOAD_LINEAGE_KEYS))
    || canonicalJson(parsed.payload.artifacts) !== canonicalJson(grant.artifacts)
    || canonicalJson(parsed.payload.host) !== canonicalJson(selectKeys(grant.host, EXECUTION_PAYLOAD_HOST_KEYS))
    || canonicalJson(parsed.payload.ceilings) !== canonicalJson(grant.ceilings)
    || parsed.payload.localOnly !== grant.localOnly
    || parsed.payload.productionEffectsAllowed !== grant.productionEffectsAllowed) {
    fail("local_postgres_execution_authority_invalid");
  }
}

export function verifyLocalPostgresCommittedBindings(grant, observedAt = new Date()) {
  const stable = validateLocalPostgresGrant(grant, observedAt);
  verifySuccessorTopology(stable);
  verifyExecutionAuthorityPayloadAgainstGrant(stable);
  if (runGit(["rev-parse", "HEAD^{commit}"]) !== stable.lineage.executionReviewHead
    || runGit(["rev-parse", "HEAD^{tree}"]) !== stable.lineage.executionReviewTree
    || runGit(["diff", "--cached", "--quiet", "--exit-code"]) !== ""
    || runGit(["status", "--porcelain=v1", "--untracked-files=no"]) !== ""
    || sha256StableOwnedFile(path.join(ROOT, "package-lock.json")) !== stable.artifacts.packageLockSha256
    || sha256StableOwnedFile(fileURLToPath(import.meta.url)) !== stable.artifacts.runnerSha256
    || sha256StableOwnedFile(path.join(ROOT, "test/r4/public-core-local-postgres.test.ts")) !== stable.artifacts.runnerTestSha256
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.schema)) !== stable.artifacts.schemaSqlSha256
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.verify)) !== stable.artifacts.verifySqlSha256
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.rollback)) !== stable.artifacts.rollbackSqlSha256) {
    fail("local_postgres_execution_worktree_drift");
  }
  for (const artifactPath of LOCAL_POSTGRES_STAGE_A_PATHS) {
    if (LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS.includes(artifactPath)) continue;
    const committed = runGit(["show", `${stable.lineage.executionReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) fail("local_postgres_execution_worktree_drift");
  }
  for (const artifactPath of LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS) {
    const committed = runGit(["show", `${stable.lineage.executionReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) fail("local_postgres_execution_worktree_drift");
  }
  const boundPaths = [...new Set([
    ...LOCAL_POSTGRES_STAGE_A_PATHS, ...LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS,
    ...LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS,
  ])].sort(binaryCompare);
  const flags = runGit(["ls-files", "-v", "--", ...boundPaths]).split("\n").filter(Boolean);
  if (flags.length !== boundPaths.length || flags.some((line) => !/^H /u.test(line))) fail("local_postgres_execution_worktree_drift");
  return Object.freeze({
    rebindImplementationHead: stable.lineage.rebindImplementationHead,
    rebindImplementationTree: stable.lineage.rebindImplementationTree,
    artifactAggregateSha256: stable.lineage.rebindImplementationArtifactAggregateSha256,
  });
}

export function createLocalPostgresPendingGrant() {
  fail("local_postgres_obsolete_grant_api");
}

const EXECUTION_AUTHORITY_BEGIN = "R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_BEGIN";
const EXECUTION_AUTHORITY_END = "R4_LOCAL_POSTGRES_PHYSICAL_EXECUTION_AUTHORITY_V1_END";
const EXECUTION_PAYLOAD_KEYS = Object.freeze([
  "schemaVersion", "authority", "lineage", "artifacts", "host", "ceilings", "dynamicSlots",
  "localOnly", "productionEffectsAllowed",
]);
const EXECUTION_PAYLOAD_LINEAGE_KEYS = Object.freeze(LINEAGE_KEYS.slice(0, 21));
const EXECUTION_PAYLOAD_HOST_KEYS = Object.freeze(HOST_KEYS.filter((key) => (
  key !== "dockerCliIdentitySha256" && key !== "socketIdentitySha256"
)));
const EXECUTION_DYNAMIC_SLOTS = Object.freeze([
  "grantId", "ownerApprovalReceiptSha256", "dockerCliIdentitySha256", "socketIdentitySha256",
  "createdAt", "expiresAt",
]);

function validateExecutionAuthorityPayload(rawPayload) {
  const payload = ownedPlain(rawPayload);
  exactKeys(payload, EXECUTION_PAYLOAD_KEYS);
  if (payload.schemaVersion !== "r4.public-core-local-postgres-execution-authority.v1"
    || payload.localOnly !== true || payload.productionEffectsAllowed !== false
    || !Array.isArray(payload.dynamicSlots)
    || payload.dynamicSlots.length !== EXECUTION_DYNAMIC_SLOTS.length
    || payload.dynamicSlots.some((value, index) => value !== EXECUTION_DYNAMIC_SLOTS[index])) {
    fail("local_postgres_execution_authority_invalid");
  }
  exactKeys(payload.authority, Object.keys(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority));
  exactKeys(payload.lineage, EXECUTION_PAYLOAD_LINEAGE_KEYS);
  exactKeys(payload.artifacts, ARTIFACT_KEYS);
  exactKeys(payload.artifacts.catalog, CATALOG_KEYS);
  exactKeys(payload.host, EXECUTION_PAYLOAD_HOST_KEYS);
  exactKeys(payload.ceilings, CEILING_KEYS);
  exactKeys(payload.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  assertFixedRecord(payload.authority, LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority);
  assertFixedRecord(selectKeys(payload.lineage, Object.keys(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage)), LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage);
  assertFixedRecord(payload.host, LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.host);
  assertFixedRecord(payload.artifacts.catalog, LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts.catalog);
  for (const [key, value] of Object.entries(LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts)) {
    if (key !== "catalog" && payload.artifacts[key] !== value) fail("local_postgres_execution_authority_invalid");
  }
  for (const [key, value] of Object.entries(CEILING_VALUES)) {
    if (payload.ceilings[key] !== value) fail("local_postgres_execution_authority_invalid");
  }
  for (const [key, value] of Object.entries(DOCKER_CALL_CEILINGS)) {
    if (payload.ceilings.dockerCalls[key] !== value) fail("local_postgres_execution_authority_invalid");
  }
  for (const key of EXECUTION_PAYLOAD_LINEAGE_KEYS) (key.endsWith("Sha256") ? assertSha(payload.lineage[key]) : assertGit(payload.lineage[key]));
  for (const key of ARTIFACT_KEYS) if (key.endsWith("Sha256")) assertSha(payload.artifacts[key]);
  return payload;
}

function parseExecutionAuthorityCard(bytes) {
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("local_postgres_execution_authority_invalid"); }
  const lines = source.split("\n");
  const beginIndexes = lines.flatMap((line, index) => line === EXECUTION_AUTHORITY_BEGIN ? [index] : []);
  const endIndexes = lines.flatMap((line, index) => line === EXECUTION_AUTHORITY_END ? [index] : []);
  if (beginIndexes.length !== 1 || endIndexes.length !== 1 || endIndexes[0] !== beginIndexes[0] + 2) {
    fail("local_postgres_execution_authority_invalid");
  }
  const canonical = lines[beginIndexes[0] + 1];
  if (canonical.length === 0 || canonical.includes("\n") || canonical.includes("\r")) fail("local_postgres_execution_authority_invalid");
  let parsed;
  try { parsed = parseStrictJson(canonical); } catch { fail("local_postgres_execution_authority_invalid"); }
  if (canonicalJson(parsed) !== canonical) fail("local_postgres_execution_authority_invalid");
  return Object.freeze({
    payload: validateExecutionAuthorityPayload(parsed),
    sha256: sha256Bytes(Buffer.from(canonical, "utf8")),
  });
}

function readOwnerApprovalReceipt(privateRoot, receiptPath, requireSoleEntry = true) {
  const expected = path.join(privateRoot, "owner-approval-receipt");
  let rootEntries;
  try { rootEntries = fs.readdirSync(privateRoot); } catch { fail("local_postgres_owner_approval_receipt_invalid"); }
  if (!path.isAbsolute(receiptPath) || receiptPath !== expected
    || (requireSoleEntry && (rootEntries.length !== 1 || rootEntries[0] !== "owner-approval-receipt"))) {
    fail("local_postgres_owner_approval_receipt_invalid");
  }
  let descriptor;
  let bytes;
  try {
    descriptor = fs.openSync(receiptPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : before.uid;
    if (!before.isFile() || before.isSymbolicLink() || before.uid !== uid
      || (Number(before.mode) & 0o777) !== 0o600 || before.nlink !== 1n
      || before.size < 1n || before.size > 16_384n) fail("local_postgres_owner_approval_receipt_invalid");
    bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (offset !== bytes.length || before.dev !== after.dev || before.ino !== after.ino
      || before.mode !== after.mode || before.uid !== after.uid || before.nlink !== after.nlink
      || before.size !== after.size) fail("local_postgres_owner_approval_receipt_invalid");
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("local_postgres_owner_approval_receipt_invalid"); }
    if (text.normalize("NFC") !== text || text.includes("\0") || text.endsWith("\n") || text.endsWith("\r")) {
      fail("local_postgres_owner_approval_receipt_invalid");
    }
    return sha256Bytes(bytes);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_owner_approval_receipt_invalid");
  } finally {
    bytes?.fill(0);
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function fileIdentityFromStat(filePath, stat) {
  return Object.freeze({
    path: filePath, dev: stat.dev.toString(10), ino: stat.ino.toString(10), uid: stat.uid.toString(10),
    gid: stat.gid.toString(10), mode: stat.mode.toString(8), nlink: stat.nlink.toString(10),
    size: stat.size.toString(10), mtimeMs: stat.mtimeMs.toString(),
  });
}

function observeDockerCliIdentity() {
  let descriptor;
  try {
    descriptor = fs.openSync(DOCKER_CLI, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size < 1n
      || before.size > 256n * 1024n * 1024n) fail("local_postgres_docker_cli_invalid");
    const hash = crypto.createHash("sha256");
    const chunk = Buffer.alloc(64 * 1024);
    let position = 0;
    while (position < Number(before.size)) {
      const count = fs.readSync(descriptor, chunk, 0, Math.min(chunk.length, Number(before.size) - position), position);
      if (count === 0) break;
      hash.update(chunk.subarray(0, count));
      position += count;
    }
    chunk.fill(0);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const identity = fileIdentityFromStat(DOCKER_CLI, before);
    if (position !== Number(before.size) || before.dev !== after.dev || before.ino !== after.ino
      || before.mode !== after.mode || before.uid !== after.uid || before.gid !== after.gid
      || before.nlink !== after.nlink || before.size !== after.size || before.mtimeMs !== after.mtimeMs
      || `sha256:${hash.digest("hex")}` !== DOCKER_CLI_SHA256) fail("local_postgres_docker_cli_invalid");
    return Object.freeze({ identity, identitySha256: sha256Bytes(Buffer.from(canonicalJson(identity), "utf8")) });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_docker_cli_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function deriveExecutionAuthority(executionReviewHead) {
  assertGit(executionReviewHead);
  const executionCardHead = runGit(["rev-parse", `${executionReviewHead}^`]);
  const rebindStatusHead = runGit(["rev-parse", `${executionCardHead}^`]);
  const rebindEvidenceHead = runGit(["rev-parse", `${rebindStatusHead}^`]);
  const rebindImplementationHead = runGit(["rev-parse", `${rebindEvidenceHead}^`]);
  const lineage = Object.freeze({
    ...LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage,
    rebindImplementationHead, rebindImplementationTree: runGit(["rev-parse", `${rebindImplementationHead}^{tree}`]),
    rebindImplementationArtifactAggregateSha256: artifactAggregate(rebindImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS).aggregateSha256,
    rebindEvidenceHead, rebindEvidenceTree: runGit(["rev-parse", `${rebindEvidenceHead}^{tree}`]),
    rebindStatusHead, rebindStatusTree: runGit(["rev-parse", `${rebindStatusHead}^{tree}`]),
    executionCardHead, executionCardTree: runGit(["rev-parse", `${executionCardHead}^{tree}`]),
    executionReviewHead, executionReviewTree: runGit(["rev-parse", `${executionReviewHead}^{tree}`]),
  });
  const cardBytes = runGit(["show", `${executionCardHead}:${PHYSICAL_EXECUTION_CARD_PATH}`], true);
  const parsed = parseExecutionAuthorityCard(cardBytes);
  for (const key of EXECUTION_PAYLOAD_LINEAGE_KEYS) if (parsed.payload.lineage[key] !== lineage[key]) fail("local_postgres_execution_authority_invalid");
  const authority = Object.freeze({
    ...parsed.payload.authority,
    executionCardSha256: sha256Bytes(cardBytes),
    executionReviewSha256: sha256Bytes(runGit(["show", `${executionReviewHead}:${PHYSICAL_EXECUTION_REVIEW_PATH}`], true)),
    executionAuthorityPayloadSha256: parsed.sha256,
  });
  const candidate = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v3", grantId: "0".repeat(32),
    ownerApprovalReceiptSha256: `sha256:${"0".repeat(64)}`, authority, lineage,
    artifacts: parsed.payload.artifacts,
    host: Object.freeze({ ...parsed.payload.host, dockerCliIdentitySha256: `sha256:${"0".repeat(64)}`, socketIdentitySha256: `sha256:${"0".repeat(64)}` }),
    ceilings: parsed.payload.ceilings, localOnly: true, productionEffectsAllowed: false,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1_000).toISOString(),
  });
  verifySuccessorTopology(candidate);
  return Object.freeze({ authority, lineage, artifacts: parsed.payload.artifacts, host: parsed.payload.host, ceilings: parsed.payload.ceilings });
}

function prepareLocalPostgresPendingGrantV3WithAdapters(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["privateRoot", "executionReviewHead", "ownerApprovalReceiptPath", "createdAt", "expiresAt"]);
  if (typeof stable.privateRoot !== "string" || !path.isAbsolute(stable.privateRoot)
    || typeof stable.ownerApprovalReceiptPath !== "string") fail("local_postgres_private_root_invalid");
  let privateRoot;
  try { privateRoot = fs.realpathSync(stable.privateRoot); } catch { fail("local_postgres_private_root_invalid"); }
  const rootStat = assertPrivateDirectory(privateRoot);
  if (privateRoot !== stable.privateRoot) fail("local_postgres_private_root_invalid");
  const rootIdentity = privateDirectoryIdentity(privateRoot, rootStat);
  assertPrivateDirectoryIdentity(rootIdentity);
  const ownerApprovalReceiptSha256 = readOwnerApprovalReceipt(privateRoot, stable.ownerApprovalReceiptPath);
  assertPrivateDirectoryIdentity(rootIdentity);
  const derived = adapters.deriveExecutionAuthority(stable.executionReviewHead);
  assertPrivateDirectoryIdentity(rootIdentity);
  const cli = adapters.observeDockerCliIdentity();
  assertPrivateDirectoryIdentity(rootIdentity);
  const socket = adapters.resolveSocketIdentity();
  assertPrivateDirectoryIdentity(rootIdentity);
  const grantId = adapters.randomBytes(16).toString("hex");
  const observedAt = adapters.now();
  const observedMs = observedAt instanceof Date ? observedAt.getTime() : Number.NaN;
  const createdMs = instant(stable.createdAt);
  const expiresMs = instant(stable.expiresAt);
  if (!Number.isFinite(observedMs) || Math.abs(createdMs - observedMs) > 60_000
    || expiresMs <= createdMs || expiresMs <= observedMs || expiresMs - createdMs > MAX_GRANT_LIFETIME_MS) {
    fail("local_postgres_grant_expired");
  }
  const grant = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v3", grantId, ownerApprovalReceiptSha256,
    authority: derived.authority, lineage: derived.lineage, artifacts: derived.artifacts,
    host: Object.freeze({ ...derived.host, dockerCliIdentitySha256: cli.identitySha256, socketIdentitySha256: socket.identitySha256 }),
    ceilings: derived.ceilings, localOnly: true, productionEffectsAllowed: false,
    createdAt: stable.createdAt, expiresAt: stable.expiresAt,
  });
  validateLocalPostgresGrant(grant, observedAt);
  adapters.verifyBindings(grant, observedAt);
  assertPrivateDirectoryIdentity(rootIdentity);
  const pending = path.join(privateRoot, "grant.pending.json");
  let pendingIdentity = null;
  try {
    const installed = installPendingGrant(privateRoot, pending, grant, adapters.pendingInstallHooks);
    assertPrivateDirectoryIdentity(rootIdentity);
    pendingIdentity = installed.identity;
    adapters.pendingInstallHooks?.checkpoint?.("pending.installed", "after");
    const finalEntries = fs.readdirSync(privateRoot).sort(binaryCompare);
    if (finalEntries.length !== 2 || finalEntries[0] !== "grant.pending.json" || finalEntries[1] !== "owner-approval-receipt") {
      fail("local_postgres_private_root_invalid");
    }
    assertPrivateDirectoryIdentity(rootIdentity);
    return Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-prepare-receipt.v1",
      pendingGrantSha256: installed.sha256, ownerApprovalReceiptSha256,
      executionAuthorityPayloadSha256: grant.authority.executionAuthorityPayloadSha256,
      observedAt: observedAt.toISOString(),
    });
  } catch (error) {
    if (pendingIdentity !== null) {
      try {
        const current = fs.lstatSync(pending, { bigint: true });
        if (current.dev !== pendingIdentity.dev || current.ino !== pendingIdentity.ino || current.nlink !== 1n) {
          fail("local_postgres_private_file_invalid");
        }
        adapters.pendingInstallHooks?.checkpoint?.("pending.cleanup", "before");
        fs.unlinkSync(pending);
        fsyncPrivateDirectory(privateRoot);
        exactFileAbsence(pending);
        adapters.pendingInstallHooks?.checkpoint?.("pending.cleanup", "after");
      } catch (cleanupError) {
        if (authenticLocalPostgresRunnerErrorDetails(cleanupError) !== null) throw cleanupError;
        fail("local_postgres_private_file_invalid");
      }
    }
    throw error;
  }
}

export function prepareLocalPostgresPendingGrantV3(input) {
  return prepareLocalPostgresPendingGrantV3WithAdapters(
    input,
    Object.freeze({
      deriveExecutionAuthority, observeDockerCliIdentity, resolveSocketIdentity: resolveDockerSocketIdentity,
      randomBytes: crypto.randomBytes, now: () => new Date(),
      verifyBindings: verifyLocalPostgresCommittedBindings,
    }),
  );
}

function fakePrepareAuthority(cardMutation = null) {
  const fakeSha = (domain) => sha256Bytes(Buffer.from(`r4-local-postgres-fake-${domain}`, "utf8"));
  const future = Object.freeze({
    rebindImplementationHead: "1".repeat(40), rebindImplementationTree: "2".repeat(40),
    rebindImplementationArtifactAggregateSha256: fakeSha("implementation-aggregate"),
    rebindEvidenceHead: "3".repeat(40), rebindEvidenceTree: "4".repeat(40),
    rebindStatusHead: "5".repeat(40), rebindStatusTree: "6".repeat(40),
  });
  const artifacts = Object.freeze({
    physicalRebindArtifactIndexSha256: fakeSha("index"),
    physicalRebindEvidenceSchemaSha256: fakeSha("schema"),
    physicalRebindEvidenceSha256: fakeSha("evidence"),
    physicalRebindReportSha256: fakeSha("report"),
    rebindStatusCommittedAuditSummarySha256: fakeSha("audit"),
    ...LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.artifacts,
    runnerSha256: fakeSha("runner"), runnerTestSha256: fakeSha("test"),
  });
  const payload = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-execution-authority.v1",
    authority: LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.authority,
    lineage: Object.freeze({ ...LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.lineage, ...future }),
    artifacts, host: LOCAL_POSTGRES_PHYSICAL_REBIND_AUTHORITY.host,
    ceilings: LOCAL_POSTGRES_V3_CEILINGS, dynamicSlots: EXECUTION_DYNAMIC_SLOTS,
    localOnly: true, productionEffectsAllowed: false,
  });
  const canonical = canonicalJson(payload);
  let card = `fake card\n${EXECUTION_AUTHORITY_BEGIN}\n${canonical}\n${EXECUTION_AUTHORITY_END}\n`;
  if (cardMutation === "card_duplicate") card += `${EXECUTION_AUTHORITY_BEGIN}\n${canonical}\n${EXECUTION_AUTHORITY_END}\n`;
  if (cardMutation === "card_noncanonical") card = card.replace(canonical, ` ${canonical}`);
  if (cardMutation === "card_begin_prefix") card = card.replace(EXECUTION_AUTHORITY_BEGIN, `prefix${EXECUTION_AUTHORITY_BEGIN}`);
  if (cardMutation === "card_end_suffix") card = card.replace(EXECUTION_AUTHORITY_END, `${EXECUTION_AUTHORITY_END}suffix`);
  const parsed = parseExecutionAuthorityCard(Buffer.from(card, "utf8"));
  if (cardMutation === "topology_drift") fail("local_postgres_rebind_status_binding_invalid");
  return Object.freeze({
    authority: Object.freeze({
      ...parsed.payload.authority, executionCardSha256: fakeSha("card"),
      executionReviewSha256: fakeSha("review"), executionAuthorityPayloadSha256: parsed.sha256,
    }),
    lineage: Object.freeze({
      ...parsed.payload.lineage,
      executionCardHead: "7".repeat(40), executionCardTree: "8".repeat(40),
      executionReviewHead: "9".repeat(40), executionReviewTree: "a".repeat(40),
    }),
    artifacts: parsed.payload.artifacts, host: parsed.payload.host, ceilings: parsed.payload.ceilings,
  });
}

export function runLocalPostgresPrepareFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, Object.hasOwn(stable, "mutation") ? ["mutation"] : []);
  const mutations = new Set([
    null, "root_mode", "receipt_mode", "receipt_symlink", "receipt_hardlink", "receipt_trailing_lf",
    "receipt_nul", "receipt_non_nfc", "unknown_entry", "card_duplicate", "card_noncanonical",
    "card_begin_prefix", "card_end_suffix",
    "clock_expired", "topology_drift", "pending_open_failure", "pending_write_failure",
    "pending_file_fsync_failure", "pending_close_failure", "pending_directory_fsync_failure",
    "pending_post_install_root_failure", "pending_cleanup_failure",
    "root_replacement_before_pending", "root_nlink_drift",
  ]);
  const mutation = stable.mutation ?? null;
  if (!mutations.has(mutation)) fail("local_postgres_fake_fault_invalid");
  const pendingFailureCheckpoint = Object.freeze({
    pending_open_failure: "pending.open:after",
    pending_write_failure: "pending.write:after",
    pending_file_fsync_failure: "pending.file_fsync:after",
    pending_close_failure: "pending.close:before",
    pending_directory_fsync_failure: "pending.directory_fsync:after",
  })[mutation] ?? null;
  const privateRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-local-pg-prepare-fake-")));
  fs.chmodSync(privateRoot, 0o700);
  const receiptPath = path.join(privateRoot, "owner-approval-receipt");
  const external = `${privateRoot}-external`;
  const displacedRoot = `${privateRoot}-displaced`;
  try {
    let receiptBytes = Buffer.from("R4 #67 local physical execution approved", "utf8");
    if (mutation === "receipt_trailing_lf") receiptBytes = Buffer.from("receipt\n", "utf8");
    if (mutation === "receipt_nul") receiptBytes = Buffer.from("receipt\0", "utf8");
    if (mutation === "receipt_non_nfc") receiptBytes = Buffer.from("e\u0301", "utf8");
    fs.writeFileSync(receiptPath, receiptBytes, { mode: 0o600, flag: "wx" });
    receiptBytes.fill(0);
    if (mutation === "root_mode") fs.chmodSync(privateRoot, 0o755);
    if (mutation === "receipt_mode") fs.chmodSync(receiptPath, 0o644);
    if (mutation === "receipt_symlink") {
      fs.writeFileSync(external, "receipt", { mode: 0o600, flag: "wx" });
      fs.unlinkSync(receiptPath); fs.symlinkSync(external, receiptPath);
    }
    if (mutation === "receipt_hardlink") fs.linkSync(receiptPath, path.join(privateRoot, "receipt-link"));
    if (mutation === "unknown_entry") fs.writeFileSync(path.join(privateRoot, "unknown"), "x", { mode: 0o600, flag: "wx" });
    const rootNlinkWithReceipt = Number(fs.lstatSync(privateRoot, { bigint: true }).nlink);
    const now = new Date("2026-08-12T18:00:00.000Z");
    const createdAt = mutation === "clock_expired" ? "2026-08-12T16:00:00.000Z" : now.toISOString();
    const expiresAt = mutation === "clock_expired" ? "2026-08-12T17:00:00.000Z" : "2026-08-12T19:00:00.000Z";
    const cliIdentity = fileIdentityFromStat("/private/fake/docker", Object.freeze({
      dev: 1n, ino: 2n, uid: 501n, gid: 20n, mode: 0o100755n, nlink: 1n, size: 1024n, mtimeMs: 1786500000000n,
    }));
    const socketIdentity = fileIdentityFromStat("/private/fake/docker.sock", Object.freeze({
      dev: 1n, ino: 3n, uid: 501n, gid: 20n, mode: 0o140600n, nlink: 1n, size: 0n, mtimeMs: 1786500000000n,
    }));
    let receipt;
    try {
      receipt = prepareLocalPostgresPendingGrantV3WithAdapters({
        privateRoot, executionReviewHead: "9".repeat(40), ownerApprovalReceiptPath: receiptPath, createdAt, expiresAt,
      }, Object.freeze({
        deriveExecutionAuthority: () => fakePrepareAuthority(mutation),
        observeDockerCliIdentity: () => Object.freeze({ identity: cliIdentity, identitySha256: sha256Bytes(Buffer.from(canonicalJson(cliIdentity), "utf8")) }),
        resolveSocketIdentity: () => Object.freeze({ socketPath: socketIdentity.path, identity: socketIdentity, identitySha256: sha256Bytes(Buffer.from(canonicalJson(socketIdentity), "utf8")) }),
        randomBytes: () => Buffer.from("0123456789abcdef0123456789abcdef", "hex"), now: () => now,
        verifyBindings: () => {
          if (mutation === "root_replacement_before_pending") {
            fs.renameSync(privateRoot, displacedRoot);
            fs.mkdirSync(privateRoot, { mode: 0o700 });
          }
          if (mutation === "root_nlink_drift") fs.mkdirSync(path.join(privateRoot, "root-link-drift"), { mode: 0o700 });
          return Object.freeze({ fake: true });
        },
        pendingInstallHooks: Object.freeze({
          checkpoint(name, edge) {
            if (`${name}:${edge}` === pendingFailureCheckpoint) fail("local_postgres_fake_injected_fault");
            if ((mutation === "pending_post_install_root_failure" || mutation === "pending_cleanup_failure")
              && name === "pending.installed" && edge === "after") {
              fs.writeFileSync(path.join(privateRoot, "unknown"), "x", { mode: 0o600, flag: "wx" });
            }
            if (mutation === "pending_cleanup_failure" && name === "pending.cleanup" && edge === "before") {
              fail("local_postgres_private_file_invalid");
            }
          },
        }),
      }));
    } catch (error) {
      const expectedPostInstall = mutation === "pending_post_install_root_failure"
        && authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_private_root_invalid";
      const expectedCleanupFailure = mutation === "pending_cleanup_failure"
        && authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_private_file_invalid";
      const expectedRootReplacement = mutation === "root_replacement_before_pending"
        && authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_private_root_invalid";
      const expectedRootLinkCountDrift = mutation === "root_nlink_drift"
        && authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_private_root_invalid";
      if ((pendingFailureCheckpoint === null || authenticLocalPostgresRunnerErrorDetails(error)?.code !== "local_postgres_fake_injected_fault")
        && !expectedPostInstall && !expectedCleanupFailure && !expectedRootReplacement && !expectedRootLinkCountDrift) throw error;
      return Object.freeze({
        schemaVersion: "r4.public-core-local-postgres-prepare-fake-result.v1", status: "FAILED",
        code: authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_private_file_invalid",
        rootEntries: Object.freeze(fs.readdirSync(privateRoot).sort(binaryCompare)),
        ...(mutation === "root_replacement_before_pending" ? Object.freeze({
          displacedRootEntries: Object.freeze(coordinatorDirectoryExists(displacedRoot)
            ? fs.readdirSync(displacedRoot).sort(binaryCompare) : []),
        }) : Object.freeze({})),
        physicalEffects: 0,
      });
    }
    const grant = readPrivateJson(path.join(privateRoot, "grant.pending.json"));
    return Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-prepare-fake-result.v1", status: "GREEN",
      receipt, grant, rootEntries: Object.freeze(fs.readdirSync(privateRoot).sort(binaryCompare)),
      rootNlinkWithReceipt, rootNlinkWithPending: Number(fs.lstatSync(privateRoot, { bigint: true }).nlink),
      physicalEffects: 0,
    });
  } finally {
    try { fs.rmSync(privateRoot, { recursive: true, force: true }); } catch { /* fake-only residue is reported by callers */ }
    try { fs.rmSync(displacedRoot, { recursive: true, force: true }); } catch { /* fake-only residue is reported by callers */ }
    try { fs.rmSync(external, { force: true }); } catch { /* fake-only residue is reported by callers */ }
  }
}

async function consumeLocalPostgresGrantWithVerifier(input, verifyBindings, checkpoint = () => {}) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["privateRoot", "now"]);
  if (typeof stable.privateRoot !== "string") fail("local_postgres_private_root_invalid");
  assertPrivateDirectory(stable.privateRoot);
  const pending = path.join(stable.privateRoot, "grant.pending.json");
  const consumed = path.join(stable.privateRoot, "grant.consumed.json");
  if (fs.existsSync(consumed)) fail("local_postgres_grant_consumed_cleanup_only");
  const grant = validateLocalPostgresGrant(readPrivateJson(pending), new Date(stable.now));
  if (readOwnerApprovalReceipt(stable.privateRoot, path.join(stable.privateRoot, "owner-approval-receipt"), false) !== grant.ownerApprovalReceiptSha256) {
    fail("local_postgres_owner_approval_receipt_drift");
  }
  verifyBindings(grant);
  try {
    await checkpoint("grant.consume.link", "before");
    fs.linkSync(pending, consumed);
    fsyncPrivateDirectory(stable.privateRoot);
    await checkpoint("grant.consume.link", "after");
    const before = fs.lstatSync(pending, { bigint: true });
    const after = fs.lstatSync(consumed, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || after.nlink !== 2n) fail("local_postgres_grant_consume_failed");
    await checkpoint("grant.consume.unlink_pending", "before");
    fs.unlinkSync(pending);
    fsyncPrivateDirectory(stable.privateRoot);
    await checkpoint("grant.consume.unlink_pending", "after");
    if (fs.lstatSync(consumed, { bigint: true }).nlink !== 1n) fail("local_postgres_grant_consume_failed");
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_grant_consume_failed");
  }
  const consumedRecord = readPrivateJsonRecord(consumed);
  return Object.freeze({ grant, consumedGrantSha256: consumedRecord.sha256 });
}

export async function consumeLocalPostgresGrant(input) {
  return consumeLocalPostgresGrantWithVerifier(input, verifyLocalPostgresCommittedBindings);
}

function probeGrantConsumptionState(privateRoot) {
  const pending = privatePath(privateRoot, "grant.pending.json");
  const consumed = privatePath(privateRoot, "grant.consumed.json");
  let pendingStat = null;
  let consumedStat = null;
  try { pendingStat = fs.lstatSync(pending, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_grant_state_invalid");
  }
  try { consumedStat = fs.lstatSync(consumed, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_grant_state_invalid");
  }
  if (pendingStat !== null && consumedStat === null) return Object.freeze({ state: "pending", consumedGrantSha256: null });
  if (pendingStat === null && consumedStat !== null) {
    const record = readPrivateJsonRecord(consumed);
    return Object.freeze({ state: "consumed", consumedGrantSha256: record.sha256 });
  }
  if (pendingStat !== null && consumedStat !== null
    && pendingStat.isFile() && consumedStat.isFile()
    && pendingStat.dev === consumedStat.dev && pendingStat.ino === consumedStat.ino
    && pendingStat.nlink === 2n && consumedStat.nlink === 2n) {
    const record = readPrivateJsonRecord(consumed, 2n);
    return Object.freeze({ state: "both_links", consumedGrantSha256: record.sha256 });
  }
  fail("local_postgres_grant_state_invalid");
}

export function buildLocalPostgresDockerPlan(input) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantId", "secretMountSource"]);
  const resources = deriveLocalPostgresResourceNames(stable.grantId);
  if (typeof stable.secretMountSource !== "string" || !path.isAbsolute(stable.secretMountSource)
    || /[,\0\r\n]/u.test(stable.secretMountSource)) fail("local_postgres_secret_mount_invalid");
  const secretTarget = "/run/secrets/forme-r4-postgres-password";
  const label = `${resources.labelKey}=${resources.labelValue}`;
  const steps = [
    ["version", ["version", "--format", "{{json .}}"]],
    ["image.inspect", ["image", "inspect", "--format", "{{json .}}", IMAGE_REFERENCE]],
    ["image.pull", ["image", "pull", "--platform", "linux/arm64", IMAGE_REFERENCE]],
    ["network.inspect", ["network", "inspect", "--format", "{{json .}}", resources.network]],
    ["network.create", ["network", "create", "--internal", "--label", label, resources.network]],
    ["volume.inspect", ["volume", "inspect", "--format", "{{json .}}", resources.volume]],
    ["volume.create", ["volume", "create", "--label", label, resources.volume]],
    ["container.inspect", ["container", "inspect", "--format", "{{json .}}", resources.container]],
    ["container.create", [
      "container", "create", "--name", resources.container, "--label", label, "--platform", "linux/arm64",
      "--network", resources.network, "--publish", "127.0.0.1::5432",
      "--mount", `type=volume,src=${resources.volume},dst=/var/lib/postgresql/data`,
      "--mount", `type=bind,src=${stable.secretMountSource},dst=${secretTarget},readonly`,
      "--env", `POSTGRES_PASSWORD_FILE=${secretTarget}`, "--env", "POSTGRES_USER=forme_r4_local",
      "--env", `POSTGRES_DB=${resources.databasePrimary}`, IMAGE_REFERENCE,
    ]],
    ["container.start", ["container", "start", resources.container]],
    ["container.stop", ["container", "stop", "--time", "10", resources.container]],
    ["container.rm", ["container", "rm", resources.container]],
    ["network.rm", ["network", "rm", resources.network]],
    ["volume.rm", ["volume", "rm", resources.volume]],
  ].map(([kind, argv], index) => Object.freeze({ order: index + 1, kind, argv: Object.freeze(argv) }));
  return Object.freeze({ schemaVersion: "r4.public-core-local-postgres-docker-plan.v2", resources, steps: Object.freeze(steps) });
}

function privatePath(root, leaf) {
  if (typeof root !== "string" || typeof leaf !== "string" || leaf.includes("/") || leaf.includes("\\") || leaf === "") {
    fail("local_postgres_private_path_invalid");
  }
  const candidate = path.join(root, leaf);
  if (path.dirname(candidate) !== root) fail("local_postgres_private_path_invalid");
  return candidate;
}

function exactFileAbsence(filePath) {
  try {
    fs.lstatSync(filePath);
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
  fail("local_postgres_cleanup_unproven");
}

function fsyncPrivateDirectory(directoryPath) {
  let descriptor;
  try {
    descriptor = fs.openSync(directoryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isDirectory() || stat.uid !== uid || (Number(stat.mode) & 0o077) !== 0) {
      fail("local_postgres_private_file_invalid");
    }
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_private_file_invalid"); }
    }
  }
}

function journalDirectory(privateRoot, create = false) {
  const directoryPath = privatePath(privateRoot, JOURNAL_DIRECTORY);
  if (!coordinatorDirectoryExists(directoryPath)) {
    if (!create) return null;
    try {
      fs.mkdirSync(directoryPath, { mode: 0o700 });
      fsyncPrivateDirectory(privateRoot);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
      fail("local_postgres_journal_invalid");
    }
  }
  try {
    assertPrivateDirectory(directoryPath);
  } catch {
    fail("local_postgres_journal_invalid");
  }
  return directoryPath;
}

function writePrivateBytes(filePath, bytes) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_private_file_invalid");
  } finally {
    if (typeof descriptor === "number") fs.closeSync(descriptor);
  }
}

function removePrivateFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== uid || stat.nlink !== 1n
      || (Number(stat.mode) & 0o777) !== 0o600) fail("local_postgres_cleanup_unproven");
    fs.unlinkSync(filePath);
    fsyncPrivateDirectory(path.dirname(filePath));
    exactFileAbsence(filePath);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
}

let cachedProcessStartIdentity = null;
let cachedBootIdentity = null;

function systemBootIdentity() {
  if (cachedBootIdentity !== null) return cachedBootIdentity;
  try {
    if (process.platform === "linux") {
      const bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(bootId)) return null;
      cachedBootIdentity = sha256Bytes(Buffer.from(`linux\0${bootId}`, "utf8"));
      return cachedBootIdentity;
    }
    if (process.platform === "darwin") {
      const result = spawnSync("/usr/sbin/sysctl", ["-n", "kern.boottime"], {
        encoding: "utf8",
        env: { PATH: "/usr/bin:/bin:/usr/sbin", HOME: "/var/empty", LANG: "C", LC_ALL: "C" },
        timeout: 5_000,
        maxBuffer: 8_192,
        windowsHide: true,
      });
      const boot = typeof result.stdout === "string" ? result.stdout.trim() : "";
      if (result.status !== 0 || result.signal !== null || !/^\{ sec = [0-9]+, usec = [0-9]+ \} .*$/u.test(boot)) return null;
      cachedBootIdentity = sha256Bytes(Buffer.from(`darwin\0${boot}`, "utf8"));
      return cachedBootIdentity;
    }
  } catch {
    return null;
  }
  return null;
}

function observeProcessStartIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return Object.freeze({ state: "unknown", identity: null });
  const bootIdentity = systemBootIdentity();
  if (bootIdentity === null) return Object.freeze({ state: "unknown", identity: null });
  try {
    if (process.platform === "linux") {
      let stat;
      try {
        stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      } catch (error) {
        if (error !== null && typeof error === "object" && error.code === "ENOENT") {
          return Object.freeze({ state: "dead", identity: null });
        }
        return Object.freeze({ state: "unknown", identity: null });
      }
      const close = stat.lastIndexOf(")");
      if (close < 1) return Object.freeze({ state: "unknown", identity: null });
      const fields = stat.slice(close + 2).trim().split(/ +/u);
      const startTicks = fields[19];
      if (typeof startTicks !== "string" || !/^[0-9]+$/u.test(startTicks)) {
        return Object.freeze({ state: "unknown", identity: null });
      }
      return Object.freeze({
        state: "live",
        identity: sha256Bytes(Buffer.from(`linux\0${bootIdentity}\0${pid}\0${startTicks}`, "utf8")),
      });
    }
    const result = spawnSync("/bin/ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin", HOME: "/var/empty", LANG: "C", LC_ALL: "C" },
      timeout: 5_000,
      maxBuffer: 8_192,
      windowsHide: true,
    });
    const started = typeof result.stdout === "string" ? result.stdout.trim() : "";
    if (result.signal !== null || result.error !== undefined) return Object.freeze({ state: "unknown", identity: null });
    if (result.status === 1 && started === "") return Object.freeze({ state: "dead", identity: null });
    if (result.status !== 0 || !/^[A-Za-z0-9 :]+$/u.test(started)) {
      return Object.freeze({ state: "unknown", identity: null });
    }
    return Object.freeze({
      state: "live",
      identity: sha256Bytes(Buffer.from(`${process.platform}\0${bootIdentity}\0${pid}\0${started}`, "utf8")),
    });
  } catch {
    return Object.freeze({ state: "unknown", identity: null });
  }
}

function processStartIdentity(pid) {
  const observed = observeProcessStartIdentity(pid);
  return observed.state === "live" ? observed.identity : null;
}

function ownProcessStartIdentity() {
  cachedProcessStartIdentity ??= processStartIdentity(process.pid);
  if (cachedProcessStartIdentity === null) fail("local_postgres_coordinator_liveness_unavailable");
  return cachedProcessStartIdentity;
}

function coordinatorLeaseRecord() {
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-coordinator-lease.v2",
    pid: process.pid,
    processStartIdentity: ownProcessStartIdentity(),
    ownerNonce: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  });
}

function validateCoordinatorLease(value) {
  const lease = ownedPlain(value);
  exactKeys(lease, ["schemaVersion", "pid", "processStartIdentity", "ownerNonce", "createdAt"]);
  if (lease.schemaVersion !== "r4.public-core-local-postgres-coordinator-lease.v2"
    || !Number.isSafeInteger(lease.pid) || lease.pid < 1
    || !SHA256.test(lease.processStartIdentity)
    || typeof lease.ownerNonce !== "string" || !/^[0-9a-f]{64}$/u.test(lease.ownerNonce)) {
    fail("local_postgres_coordinator_lock_invalid");
  }
  instant(lease.createdAt);
  return lease;
}

function coordinatorLeaseIsAlive(lease) {
  const observed = observeProcessStartIdentity(lease.pid);
  if (observed.state === "unknown") return true;
  if (observed.state === "dead") return false;
  return observed.identity === lease.processStartIdentity;
}

function coordinatorDirectoryExists(directoryPath) {
  try {
    fs.lstatSync(directoryPath);
    return true;
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return false;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function inspectCoordinatorLeaseFile(filePath) {
  try {
    return validateCoordinatorLease(readPrivateJsonRecord(filePath, 1n).value);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function unlinkCoordinatorLeaseFile(filePath, expectedOwnerNonce, allowAlreadyAbsent = false) {
  let owner;
  try {
    owner = inspectCoordinatorLeaseFile(filePath);
  } catch (error) {
    if (allowAlreadyAbsent && !coordinatorDirectoryExists(filePath)) return false;
    throw error;
  }
  if (owner.ownerNonce !== expectedOwnerNonce) fail("local_postgres_coordinator_lock_invalid");
  try {
    fs.unlinkSync(filePath);
    fsyncPrivateDirectory(path.dirname(filePath));
  } catch (error) {
    if (allowAlreadyAbsent && error !== null && typeof error === "object" && error.code === "ENOENT") return false;
    fail("local_postgres_coordinator_lock_invalid");
  }
  return true;
}

function coordinatorLeasePath(privateRoot, ownerNonce) {
  return privatePath(privateRoot, `coordinator-lease-${ownerNonce}.json`);
}

function ownerIdentityFileStem(owner) {
  return `p${owner.pid}-s${owner.processStartIdentity.slice("sha256:".length)}-n${owner.ownerNonce}`;
}

const COORDINATOR_DRAFT = /^coordinator-draft-p([1-9][0-9]*)-s([0-9a-f]{64})-n([0-9a-f]{64})\.json$/u;
const COORDINATOR_LEASE = /^coordinator-lease-([0-9a-f]{64})\.json$/u;
const FINALIZATION_DRAFT = /^physical-evidence-draft-p([1-9][0-9]*)-s([0-9a-f]{64})-n([0-9a-f]{64})\.json$/u;

function ownerIdentityFromFilename(match) {
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid < 1) fail("local_postgres_coordinator_lock_invalid");
  return Object.freeze({ pid, processStartIdentity: `sha256:${match[2]}`, ownerNonce: match[3] });
}

function cleanupOwnerNamedDrafts(privateRoot, pattern, isAlive = coordinatorLeaseIsAlive) {
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const match = pattern.exec(name);
    if (match === null) continue;
    const owner = ownerIdentityFromFilename(match);
    if (isAlive(owner)) fail("local_postgres_coordinator_active");
    removePrivateFile(privatePath(privateRoot, name));
  }
}

function writeCoordinatorLeaseAtomic(privateRoot, leasePath, record, checkpoint = () => {}) {
  const preparingPath = privatePath(privateRoot, `coordinator-draft-${ownerIdentityFileStem(record)}.json`);
  try {
    writePrivateJson(preparingPath, record);
    validateCoordinatorLease(readPrivateJson(preparingPath));
    checkpoint("lease.candidate.install", "before");
    fs.renameSync(preparingPath, leasePath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("lease.candidate.install", "after");
  } catch (error) {
    // This writer owns both unique names, so a caught failure removes either
    // location blindly. Only an actual process crash leaves filename-bound
    // bytes for exact dead-owner reconciliation.
    removeOwnUniquePaths([preparingPath, leasePath]);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function scanLiveCoordinatorLeases(privateRoot, isAlive = coordinatorLeaseIsAlive) {
  cleanupOwnerNamedDrafts(privateRoot, COORDINATOR_DRAFT, isAlive);
  const live = [];
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const match = COORDINATOR_LEASE.exec(name);
    if (match === null) {
      if (name.startsWith("coordinator-")) fail("local_postgres_coordinator_lock_invalid");
      continue;
    }
    const leasePath = privatePath(privateRoot, name);
    const owner = inspectCoordinatorLeaseFile(leasePath);
    if (owner.ownerNonce !== match[1]) fail("local_postgres_coordinator_lock_invalid");
    if (!isAlive(owner)) {
      unlinkCoordinatorLeaseFile(leasePath, owner.ownerNonce, true);
      continue;
    }
    const stat = fs.lstatSync(leasePath, { bigint: true });
    live.push(Object.freeze({
      leasePath,
      owner,
      birthtimeNs: stat.birthtimeNs,
      ctimeNs: stat.ctimeNs,
      name,
    }));
  }
  live.sort((left, right) => {
    if (left.birthtimeNs !== right.birthtimeNs) return left.birthtimeNs < right.birthtimeNs ? -1 : 1;
    if (left.ctimeNs !== right.ctimeNs) return left.ctimeNs < right.ctimeNs ? -1 : 1;
    return binaryCompare(left.name, right.name);
  });
  return live;
}

function releaseCoordinatorLease(lease, checkpoint = () => {}) {
  const current = inspectCoordinatorLeaseFile(lease.leasePath);
  if (canonicalJson(current) !== canonicalJson(lease.owner)) fail("local_postgres_coordinator_lock_invalid");
  checkpoint("lease.release", "before");
  unlinkCoordinatorLeaseFile(lease.leasePath, lease.owner.ownerNonce);
  checkpoint("lease.release", "after");
}

function discardOwnCoordinatorLease(privateRoot, owner) {
  const leasePath = coordinatorLeasePath(privateRoot, owner.ownerNonce);
  const draftPath = privatePath(privateRoot, `coordinator-draft-${ownerIdentityFileStem(owner)}.json`);
  removeOwnUniquePaths([draftPath, leasePath]);
}

function removeOwnUniquePaths(filePaths) {
  let removalFailure = null;
  for (const filePath of filePaths) {
    try {
      // These paths are nonce/owner-identity bound to this writer. Do not
      // parse potentially torn bytes; remove the owned name and prove absence.
      removePrivateFile(filePath);
      exactFileAbsence(filePath);
    } catch (error) {
      removalFailure ??= error;
    }
  }
  if (removalFailure !== null) throw removalFailure;
}

function coordinatorBarrierExists(provisionalPath, evidencePath) {
  if (coordinatorDirectoryExists(provisionalPath)) return true;
  if (!coordinatorDirectoryExists(evidencePath)) return false;
  return finalEvidenceIsTerminal(validateFinalizingReceipt(readPrivateJson(evidencePath)));
}

async function acquireCoordinatorLease(
  privateRoot,
  evidencePath,
  checkpoint = () => {},
  syncCheckpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  assertPrivateDirectory(privateRoot);
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  if (coordinatorBarrierExists(provisionalPath, evidencePath)) fail("local_postgres_coordinator_active");
  await checkpoint("lease.acquire.precheck", "after");
  const prior = scanLiveCoordinatorLeases(privateRoot, isAlive);
  if (prior.length !== 0) fail("local_postgres_coordinator_active");
  await checkpoint("lease.acquire.prior_clear", "after");
  const fresh = coordinatorLeaseRecord();
  const leasePath = coordinatorLeasePath(privateRoot, fresh.ownerNonce);
  try {
    writeCoordinatorLeaseAtomic(privateRoot, leasePath, fresh, syncCheckpoint);
    await checkpoint("lease.acquire.published", "after");
    if (coordinatorBarrierExists(provisionalPath, evidencePath)) {
      fail("local_postgres_coordinator_active");
    }
    let live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    for (let attempt = 0; live.length > 1 && live[0].owner.ownerNonce === fresh.ownerNonce && attempt < 50; attempt += 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
      live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    }
    if (live.length !== 1 || live[0].owner.ownerNonce !== fresh.ownerNonce) {
      fail("local_postgres_coordinator_active");
    }
    await checkpoint("lease.acquire.sole_self", "after");
    live = scanLiveCoordinatorLeases(privateRoot, isAlive);
    if (live.length !== 1 || live[0].owner.ownerNonce !== fresh.ownerNonce) {
      fail("local_postgres_coordinator_active");
    }
    if (coordinatorBarrierExists(provisionalPath, evidencePath)) fail("local_postgres_coordinator_active");
    return Object.freeze({ leasePath, owner: fresh, ownerNonce: fresh.ownerNonce });
  } catch (error) {
    discardOwnCoordinatorLease(privateRoot, fresh);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
}

function validateJournalDetail(event, rawDetail) {
  const detail = ownedPlain(rawDetail);
  const emptyEvents = new Set([
    "docker.version_verified", "resources.absence_verified", "network.created", "volume.created",
    "container.created", "primary.restart_replay_green", "rollback_database.rehearsal_green",
    "container.removed", "network.removed", "volume.removed",
  ]);
  if (emptyEvents.has(event)) exactKeys(detail, []);
  else if (event === "grant.consumed") {
    exactKeys(detail, ["consumedGrantSha256"]);
    assertSha(detail.consumedGrantSha256);
  } else if (event === "docker.lifecycle_started") {
    exactKeys(detail, ["mode", "ordinal"]);
    if ((detail.mode !== "construction" && detail.mode !== "cleanup_recovery")
      || !Number.isSafeInteger(detail.ordinal) || detail.ordinal < 1 || detail.ordinal > 3) {
      fail("local_postgres_journal_invalid");
    }
  } else if (event === "image.pull_attempted" || event === "image.pulled") {
    exactKeys(detail, ["referenceSha256"]);
    assertSha(detail.referenceSha256);
  } else if (event === "image.verified") {
    exactKeys(detail, ["platformManifest"]);
    if (detail.platformManifest !== IMAGE_PLATFORM_MANIFEST) fail("local_postgres_journal_invalid");
  } else if (event === "container.started") {
    exactKeys(detail, ["lifecycle"]);
    if (detail.lifecycle !== 1 && detail.lifecycle !== 2) fail("local_postgres_journal_invalid");
  } else if (event === "container.stopped") {
    const keys = Object.keys(detail);
    if (keys.length === 0) exactKeys(detail, []);
    else {
      exactKeys(detail, ["lifecycle"]);
      if (detail.lifecycle !== 1) fail("local_postgres_journal_invalid");
    }
  } else if (event === "primary.schema_verified") {
    exactKeys(detail, ["catalog"]);
    exactKeys(detail.catalog, ["tables", "columns", "constraints", "indexes"]);
    for (const key of ["tables", "columns", "constraints", "indexes"]) {
      if (detail.catalog[key] !== LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog[key]) fail("local_postgres_journal_invalid");
    }
  } else if (event === "primary.walking_flow_green") {
    exactKeys(detail, ["actionCount"]);
    if (detail.actionCount !== 15) fail("local_postgres_journal_invalid");
  } else if (event === "primary.closure_flow_green") {
    exactKeys(detail, ["actionCount"]);
    if (detail.actionCount !== 20) fail("local_postgres_journal_invalid");
  } else if (event === "rollback_database.created") {
    exactKeys(detail, ["identityCount"]);
    if (detail.identityCount !== 2) fail("local_postgres_journal_invalid");
  } else if (event === "cleanup.proven" || event === "cleanup.recovered") {
    exactKeys(detail, ["residueCount"]);
    if (detail.residueCount !== 0) fail("local_postgres_journal_invalid");
  } else if (event === "effect.attempt" || event === "effect.completed") {
    exactKeys(detail, ["effectId", "kind", "target", "observedAt", "phase"]);
    if (typeof detail.effectId !== "string" || !/^[0-9a-f]{32}$/u.test(detail.effectId)
      || typeof detail.kind !== "string" || !EFFECT_KINDS.has(detail.kind)
      || typeof detail.target !== "string" || !/^[a-z0-9_.:-]{1,96}$/u.test(detail.target)
      || (detail.phase !== "NON_CLEANUP" && detail.phase !== "CLEANUP")) {
      fail("local_postgres_journal_invalid");
    }
    if (detail.kind.startsWith("docker:")) {
      if (detail.target !== detail.kind.slice("docker:".length)) fail("local_postgres_journal_invalid");
    } else if (detail.kind === "domain:invoke") {
      if (!Object.prototype.hasOwnProperty.call(SYNTHETIC_ACTOR_CLASS, detail.target)) fail("local_postgres_journal_invalid");
    } else if (!EFFECT_TARGETS[detail.kind]?.has(detail.target)) fail("local_postgres_journal_invalid");
    instant(detail.observedAt);
  } else if (event === "observation.recorded") {
    exactKeys(detail, ["kind", "observedAt", "phase", "value"]);
    instant(detail.observedAt);
    if (detail.phase !== "NON_CLEANUP" && detail.phase !== "CLEANUP") fail("local_postgres_journal_invalid");
    if (detail.kind === "host.identity") {
      exactKeys(detail.value, ["dockerCliIdentitySha256", "socketIdentitySha256"]);
      assertSha(detail.value.dockerCliIdentitySha256); assertSha(detail.value.socketIdentitySha256);
    } else if (detail.kind === "docker.version") {
      exactKeys(detail.value, ["dockerClientVersion", "dockerServerVersion", "dockerServerPlatform"]);
      if (!["29.3.1", "MISMATCH", "UNKNOWN"].includes(detail.value.dockerClientVersion)
        || !["29.3.1", "MISMATCH", "UNKNOWN"].includes(detail.value.dockerServerVersion)
        || ![IMAGE_PLATFORM, "MISMATCH", "UNKNOWN"].includes(detail.value.dockerServerPlatform)) fail("local_postgres_journal_invalid");
    } else if (detail.kind === "image.pull") {
      exactKeys(detail.value, ["attempted", "outcome"]);
      if (typeof detail.value.attempted !== "boolean" || !["NOT_REQUIRED_CACHED", "COMPLETED", "FAILED", "AMBIGUOUS", "NOT_REACHED"].includes(detail.value.outcome)
        || (detail.value.outcome === "NOT_REQUIRED_CACHED" && detail.value.attempted !== false)
        || (["COMPLETED", "FAILED", "AMBIGUOUS"].includes(detail.value.outcome) && detail.value.attempted !== true)
        || (detail.value.outcome === "NOT_REACHED" && detail.value.attempted !== false)) fail("local_postgres_journal_invalid");
    } else if (detail.kind === "image.cache") {
      exactKeys(detail.value, ["outcome", "imageReference", "imagePlatform", "imagePlatformManifest"]);
      if (!["VERIFIED_COMPLETE_PINNED", "PARTIAL_OR_UNKNOWN", "NOT_OBSERVED"].includes(detail.value.outcome)) fail("local_postgres_journal_invalid");
      for (const key of ["imageReference", "imagePlatform", "imagePlatformManifest"]) if (typeof detail.value[key] !== "string") fail("local_postgres_journal_invalid");
      const tuple = [detail.value.imageReference, detail.value.imagePlatform, detail.value.imagePlatformManifest];
      const expected = [IMAGE_REFERENCE, IMAGE_PLATFORM, IMAGE_PLATFORM_MANIFEST];
      if (detail.value.outcome === "VERIFIED_COMPLETE_PINNED"
        && tuple.some((value, index) => value !== expected[index])) fail("local_postgres_journal_invalid");
      if (detail.value.outcome === "NOT_OBSERVED" && tuple.some((value) => value !== "NOT_OBSERVED")) {
        fail("local_postgres_journal_invalid");
      }
      if (detail.value.outcome === "PARTIAL_OR_UNKNOWN"
        && tuple.some((value, index) => ![expected[index], "MISMATCH", "UNKNOWN", "NOT_OBSERVED"].includes(value))) {
        fail("local_postgres_journal_invalid");
      }
    } else if (detail.kind === "postgres.server_version_num") {
      if (detail.value !== 160010 && detail.value !== "MISMATCH" && detail.value !== "UNKNOWN") fail("local_postgres_journal_invalid");
    } else if (detail.kind === "catalog") {
      exactKeys(detail.value, ["catalogOutcome", "tables", "columns", "constraints", "indexes", "catalogContractSha256"]);
      if (detail.value.catalogOutcome === "MATCHED") {
        if (detail.value.tables !== 14 || detail.value.columns !== 207 || detail.value.constraints !== 172
          || detail.value.indexes !== 44 || detail.value.catalogContractSha256 !== CATALOG_CONTRACT_SHA256) {
          fail("local_postgres_journal_invalid");
        }
      } else if (detail.value.catalogOutcome === "MISMATCH") {
        for (const key of ["tables", "columns", "constraints", "indexes"]) {
          if (detail.value[key] !== "UNKNOWN"
            && (!Number.isSafeInteger(detail.value[key]) || detail.value[key] < 0)) fail("local_postgres_journal_invalid");
        }
        if (detail.value.catalogContractSha256 !== "MISMATCH"
          && detail.value.catalogContractSha256 !== CATALOG_CONTRACT_SHA256) fail("local_postgres_journal_invalid");
      } else if (detail.value.catalogOutcome === "NOT_OBSERVED" || detail.value.catalogOutcome === "UNKNOWN") {
        for (const key of ["tables", "columns", "constraints", "indexes", "catalogContractSha256"]) {
          if (detail.value[key] !== detail.value.catalogOutcome) fail("local_postgres_journal_invalid");
        }
      } else fail("local_postgres_journal_invalid");
    } else if (detail.kind === "cleanup.residue") {
      exactKeys(detail.value, ["ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "ownedCredentialCount", "ownedDockerConfigCount", "ownedImportedRuntimeCount", "activeCoordinatorResidueCount"]);
      for (const value of Object.values(detail.value)) if (!Number.isSafeInteger(value) || value < 0) fail("local_postgres_journal_invalid");
    } else if (detail.kind === "concurrency.maxima") {
      exactKeys(detail.value, ["pools", "clients", "transactions"]);
      for (const value of Object.values(detail.value)) if (!Number.isSafeInteger(value) || value < 0 || value > 1) fail("local_postgres_journal_invalid");
    } else fail("local_postgres_journal_invalid");
  } else fail("local_postgres_journal_invalid");
  return detail;
}

function reserveEffect(privateRoot, state, kind, target) {
  state.revalidateHost?.(kind, target, "before");
  const durable = readJournalState(privateRoot);
  validateLedgerCeilings(durable.effectLedger);
  const observedAt = state.nowIso?.() ?? new Date().toISOString();
  const observedMs = instant(observedAt);
  const phase = state.cleanupOnly === true || state.inCleanup === true ? "CLEANUP" : "NON_CLEANUP";
  if (state.grant !== undefined && phase === "NON_CLEANUP") {
    const createdMs = instant(state.grant.createdAt);
    const expiresMs = instant(state.grant.expiresAt);
    if (observedMs < createdMs - 60_000
      || observedMs > expiresMs
      || (durable.lastObservedAt !== null && observedMs < instant(durable.lastObservedAt))) {
      fail("local_postgres_effect_clock_invalid");
    }
  }
  const effectId = crypto.randomBytes(16).toString("hex");
  const proposed = ownedPlain({ effectId, kind, target, observedAt, phase });
  const ledger = readJournalState(privateRoot).effectLedger;
  incrementLedger(ledger, "attempt", proposed);
  validateLedgerCeilings(ledger);
  appendPrivateJournal(privateRoot, state, "effect.attempt", proposed);
  validateLedgerCeilings(state.effectLedger);
  return Object.freeze(proposed);
}

function completeEffect(privateRoot, state, reservation) {
  state.revalidateHost?.(reservation.kind, reservation.target, "after");
  const durable = readJournalState(privateRoot);
  const attempt = durable.effectLedger.openEffects.get(reservation.effectId);
  if (attempt === undefined || attempt.kind !== reservation.kind || attempt.target !== reservation.target) {
    fail("local_postgres_journal_invalid");
  }
  const observedAt = state.nowIso?.() ?? new Date().toISOString();
  const observedMs = instant(observedAt);
  const phase = state.cleanupOnly === true || state.inCleanup === true ? "CLEANUP" : "NON_CLEANUP";
  if (reservation.phase !== phase || (phase === "NON_CLEANUP" && (observedMs < instant(attempt.observedAt)
    || (durable.lastObservedAt !== null && observedMs < instant(durable.lastObservedAt))))) {
    fail("local_postgres_effect_clock_invalid");
  }
  if (state.grant !== undefined && phase === "NON_CLEANUP") {
    const createdMs = instant(state.grant.createdAt);
    const expiresMs = instant(state.grant.expiresAt);
    if (observedMs < createdMs - 60_000 || observedMs > expiresMs) fail("local_postgres_effect_clock_invalid");
  }
  appendPrivateJournal(privateRoot, state, "effect.completed", Object.freeze({ ...reservation, observedAt }));
}

function assignJournalState(target, source) {
  target.sequence = source.sequence;
  target.lastSha256 = source.lastSha256;
  target.consumedGrantSha256 = source.consumedGrantSha256;
  target.dockerLifecycleCount = source.dockerLifecycleCount;
  target.constructionLifecycleCount = source.constructionLifecycleCount;
  target.cleanupRecoveryLifecycleCount = source.cleanupRecoveryLifecycleCount;
  target.cleanupProven = source.cleanupProven;
  target.totalBytes = source.totalBytes;
  target.effectLedger = source.effectLedger;
  target.observations = source.observations;
  target.lastObservedAt = source.lastObservedAt;
}

function emptyObservationState() {
  return {
    dockerCliIdentitySha256: null, socketIdentitySha256: null,
    dockerClientVersion: "NOT_OBSERVED", dockerServerVersion: "NOT_OBSERVED",
    dockerServerPlatform: "NOT_OBSERVED",
    imageReference: "NOT_OBSERVED", imagePlatform: "NOT_OBSERVED", imagePlatformManifest: "NOT_OBSERVED",
    imagePullAttempted: false, imagePullOutcome: "NOT_REACHED", imageCacheOutcome: "NOT_OBSERVED",
    postgresServerVersionNum: "NOT_OBSERVED",
    catalog: { catalogOutcome: "NOT_OBSERVED", tables: "NOT_OBSERVED", columns: "NOT_OBSERVED",
      constraints: "NOT_OBSERVED", indexes: "NOT_OBSERVED", catalogContractSha256: "NOT_OBSERVED" },
    cleanup: null,
    concurrency: { pools: 0, clients: 0, transactions: 0 },
  };
}

function foldObservation(observations, detail) {
  const value = detail.value;
  if (detail.kind === "host.identity") {
    if (observations.dockerCliIdentitySha256 !== null
      && (observations.dockerCliIdentitySha256 !== value.dockerCliIdentitySha256
        || observations.socketIdentitySha256 !== value.socketIdentitySha256)) fail("local_postgres_journal_invalid");
    observations.dockerCliIdentitySha256 = value.dockerCliIdentitySha256;
    observations.socketIdentitySha256 = value.socketIdentitySha256;
  } else if (detail.kind === "docker.version") {
    const prior = [observations.dockerClientVersion, observations.dockerServerVersion, observations.dockerServerPlatform];
    const next = [value.dockerClientVersion, value.dockerServerVersion, value.dockerServerPlatform];
    if (prior.some((item) => item !== "NOT_OBSERVED") && canonicalJson(prior) !== canonicalJson(next)) {
      fail("local_postgres_journal_invalid");
    }
    observations.dockerClientVersion = value.dockerClientVersion;
    observations.dockerServerVersion = value.dockerServerVersion;
    observations.dockerServerPlatform = value.dockerServerPlatform;
  } else if (detail.kind === "image.pull") {
    const prior = `${Number(observations.imagePullAttempted)}:${observations.imagePullOutcome}`;
    const next = `${Number(value.attempted)}:${value.outcome}`;
    const allowed = Object.freeze({
      "0:NOT_REACHED": new Set(["0:NOT_REACHED", "0:NOT_REQUIRED_CACHED", "1:AMBIGUOUS", "1:COMPLETED", "1:FAILED"]),
      "1:AMBIGUOUS": new Set(["1:AMBIGUOUS", "1:COMPLETED", "1:FAILED"]),
      "0:NOT_REQUIRED_CACHED": new Set(["0:NOT_REQUIRED_CACHED"]),
      "1:COMPLETED": new Set(["1:COMPLETED"]),
      "1:FAILED": new Set(["1:FAILED"]),
    });
    if (!allowed[prior]?.has(next)) fail("local_postgres_journal_invalid");
    observations.imagePullAttempted = value.attempted;
    observations.imagePullOutcome = value.outcome;
  } else if (detail.kind === "image.cache") {
    const cacheTransitions = Object.freeze({
      NOT_OBSERVED: new Set(["NOT_OBSERVED", "PARTIAL_OR_UNKNOWN", "VERIFIED_COMPLETE_PINNED"]),
      PARTIAL_OR_UNKNOWN: new Set(["PARTIAL_OR_UNKNOWN", "VERIFIED_COMPLETE_PINNED"]),
      VERIFIED_COMPLETE_PINNED: new Set(["VERIFIED_COMPLETE_PINNED"]),
    });
    if (!cacheTransitions[observations.imageCacheOutcome]?.has(value.outcome)) fail("local_postgres_journal_invalid");
    if (observations.imageCacheOutcome === value.outcome && observations.imageCacheOutcome !== "NOT_OBSERVED") {
      const priorTuple = [observations.imageReference, observations.imagePlatform, observations.imagePlatformManifest];
      const nextTuple = [value.imageReference, value.imagePlatform, value.imagePlatformManifest];
      for (let index = 0; index < priorTuple.length; index += 1) {
        if (priorTuple[index] !== "UNKNOWN" && priorTuple[index] !== "NOT_OBSERVED"
          && priorTuple[index] !== nextTuple[index]) fail("local_postgres_journal_invalid");
        if (priorTuple[index] === "UNKNOWN" && nextTuple[index] === "NOT_OBSERVED") fail("local_postgres_journal_invalid");
      }
    }
    observations.imageCacheOutcome = value.outcome;
    observations.imageReference = value.imageReference;
    observations.imagePlatform = value.imagePlatform;
    observations.imagePlatformManifest = value.imagePlatformManifest;
  } else if (detail.kind === "postgres.server_version_num") {
    if (observations.postgresServerVersionNum !== "NOT_OBSERVED"
      && observations.postgresServerVersionNum !== value) fail("local_postgres_journal_invalid");
    observations.postgresServerVersionNum = value;
  } else if (detail.kind === "catalog") {
    if (observations.catalog.catalogOutcome !== "NOT_OBSERVED"
      && canonicalJson(observations.catalog) !== canonicalJson(value)) fail("local_postgres_journal_invalid");
    observations.catalog = { ...value };
  }
  else if (detail.kind === "cleanup.residue") observations.cleanup = { ...value };
  else if (detail.kind === "concurrency.maxima") {
    for (const key of ["pools", "clients", "transactions"]) {
      if (value[key] < observations.concurrency[key]) fail("local_postgres_journal_invalid");
      observations.concurrency[key] = value[key];
    }
  }
}

function assertObservationJournalOrder(kind, value, ledger) {
  if (kind === "postgres.server_version_num") {
    if ((ledger.completions["connection:connect"] ?? 0) < 2
      || (ledger.attempts["sql:schema"] ?? 0) !== 0
      || (ledger.attempts["sql:verify"] ?? 0) !== 0) fail("local_postgres_journal_invalid");
  } else if (kind === "catalog") {
    if (value.catalogOutcome === "MATCHED") {
      if ((ledger.completions["sql:verify"] ?? 0) < 1
        || (ledger.completions["sql:schema"] ?? 0) < 1) fail("local_postgres_journal_invalid");
    } else if ((ledger.attempts["sql:verify"] ?? 0) < 1) {
      fail("local_postgres_journal_invalid");
    }
  }
}

function recordObservation(privateRoot, state, kind, value) {
  state.revalidateHost?.(`observation:${kind}`, kind, "before");
  const durable = readJournalState(privateRoot);
  const observedAt = state.nowIso?.() ?? new Date().toISOString();
  const observedMs = instant(observedAt);
  const phase = state.cleanupOnly === true || state.inCleanup === true ? "CLEANUP" : "NON_CLEANUP";
  if (phase === "NON_CLEANUP" && durable.lastObservedAt !== null
    && observedMs < instant(durable.lastObservedAt)) fail("local_postgres_effect_clock_invalid");
  if (state.grant !== undefined && phase === "NON_CLEANUP") {
    const createdMs = instant(state.grant.createdAt);
    const expiresMs = instant(state.grant.expiresAt);
    if (observedMs < createdMs - 60_000 || observedMs > expiresMs) {
      fail("local_postgres_effect_clock_invalid");
    }
  }
  assertObservationJournalOrder(kind, value, durable.effectLedger);
  if (kind === "catalog" && value.catalogOutcome === "MATCHED"
    && durable.observations.postgresServerVersionNum !== 160010) fail("local_postgres_journal_invalid");
  appendPrivateJournal(privateRoot, state, "observation.recorded", { kind, observedAt, phase, value });
}

function emptyEffectLedger() {
  return {
    attempts: Object.create(null), completions: Object.create(null), openEffects: new Map(),
    dockerCallCounts: Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind) => [kind, 0])),
    poolConstructionAttemptCount: 0, poolConstructionCount: 0, connectionAttemptCount: 0,
    initialReadinessAttemptCount: 0, restartReadinessAttemptCount: 0, operationalPoolAttemptCount: 0,
    connectionTargetCounts: { primary: 0, rollback: 0, admin: 0 },
    connectionTargetAttemptCounts: { primary: 0, rollback: 0, admin: 0 },
    databaseIdentityAttemptCount: 0, databaseIdentityCount: 0,
    adminCreateDatabaseStatementAttemptCount: 0,
    schemaApplyAttemptCount: 0, schemaApplyCount: 0, verifyAttemptCount: 0, verifyCount: 0,
    rollbackAttemptCount: 0, rollbackCount: 0,
    domainActionInvocationAttemptCount: 0, domainActionInvocationCount: 0,
    distinctDomainActionAttemptSet: new Set(), distinctDomainActionSet: new Set(),
    containerRestartAttemptCount: 0, containerRestartCount: 0,
  };
}

function incrementLedger(ledger, phase, detail) {
  const target = phase === "attempt" ? ledger.attempts : ledger.completions;
  target[detail.kind] = (target[detail.kind] ?? 0) + 1;
  if (detail.kind.startsWith("docker:")) {
    if (phase === "attempt") ledger.dockerCallCounts[detail.kind.slice("docker:".length)] += 1;
  } else if (detail.kind === "pool:construct") {
    ledger[phase === "attempt" ? "poolConstructionAttemptCount" : "poolConstructionCount"] += 1;
    if (phase === "attempt" && detail.target === "initial_readiness") ledger.initialReadinessAttemptCount += 1;
    if (phase === "attempt" && detail.target === "restart_readiness") ledger.restartReadinessAttemptCount += 1;
    if (phase === "attempt" && detail.target.startsWith("operational_")) ledger.operationalPoolAttemptCount += 1;
  } else if (detail.kind === "connection:connect") {
    if (phase === "attempt") {
      ledger.connectionAttemptCount += 1;
      ledger.connectionTargetCounts[detail.target] += 1;
      ledger.connectionTargetAttemptCounts[detail.target] += 1;
    }
  } else if (detail.kind === "database:create") {
    ledger[phase === "attempt" ? "databaseIdentityAttemptCount" : "databaseIdentityCount"] += 1;
    if (phase === "attempt" && detail.target === "rollback") ledger.adminCreateDatabaseStatementAttemptCount += 1;
  } else if (detail.kind === "sql:schema") {
    ledger[phase === "attempt" ? "schemaApplyAttemptCount" : "schemaApplyCount"] += 1;
  } else if (detail.kind === "sql:verify") {
    ledger[phase === "attempt" ? "verifyAttemptCount" : "verifyCount"] += 1;
  } else if (detail.kind === "sql:rollback") {
    ledger[phase === "attempt" ? "rollbackAttemptCount" : "rollbackCount"] += 1;
  } else if (detail.kind === "domain:invoke") {
    ledger[phase === "attempt" ? "domainActionInvocationAttemptCount" : "domainActionInvocationCount"] += 1;
    ledger[phase === "attempt" ? "distinctDomainActionAttemptSet" : "distinctDomainActionSet"].add(detail.target);
  } else if (detail.kind === "container:restart") {
    ledger[phase === "attempt" ? "containerRestartAttemptCount" : "containerRestartCount"] += 1;
  }
}

function validateLedgerCeilings(ledger) {
  for (const [kind, maximum] of Object.entries(DOCKER_CALL_CEILINGS)) if (ledger.dockerCallCounts[kind] > maximum) fail("local_postgres_effect_ceiling_exceeded");
  if (ledger.poolConstructionAttemptCount > CEILING_VALUES.maximumTotalPoolConstructions
    || ledger.connectionAttemptCount > CEILING_VALUES.maximumTotalConnectionAttempts
    || ledger.initialReadinessAttemptCount > CEILING_VALUES.maximumInitialReadinessAttempts
    || ledger.restartReadinessAttemptCount > CEILING_VALUES.maximumRestartReadinessAttempts
    || ledger.operationalPoolAttemptCount > CEILING_VALUES.maximumOperationalPoolConstructions
    || ledger.databaseIdentityAttemptCount > CEILING_VALUES.maximumCreatedDatabaseIdentities
    || ledger.schemaApplyAttemptCount > CEILING_VALUES.maximumSchemaApplies
    || ledger.verifyAttemptCount > CEILING_VALUES.maximumVerifies
    || ledger.rollbackAttemptCount > CEILING_VALUES.maximumRollbacks
    || ledger.domainActionInvocationAttemptCount > CEILING_VALUES.maximumDomainActionInvocations
    || ledger.distinctDomainActionAttemptSet.size > CEILING_VALUES.maximumDistinctDomainActions
    || ledger.containerRestartAttemptCount > CEILING_VALUES.maximumContainerRestarts
    || ledger.connectionTargetAttemptCounts.admin > 1
    || ledger.adminCreateDatabaseStatementAttemptCount > CEILING_VALUES.maximumAdminCreateDatabaseStatements) {
    fail("local_postgres_effect_ceiling_exceeded");
  }
}

function appendPrivateJournal(privateRoot, state, event, detail = Object.freeze({})) {
  if (typeof event !== "string" || !JOURNAL_EVENTS.has(event)) fail("local_postgres_journal_invalid");
  const durable = readJournalState(privateRoot);
  if (durable.sequence !== state.sequence || durable.lastSha256 !== state.lastSha256
    || durable.dockerLifecycleCount !== state.dockerLifecycleCount || durable.cleanupProven !== state.cleanupProven) {
    fail("local_postgres_journal_invalid");
  }
  const ownedDetail = validateJournalDetail(event, detail);
  const sequence = state.sequence + 1;
  if (sequence > JOURNAL_MAXIMUM_ENTRIES) fail("local_postgres_journal_invalid");
  const preimage = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-journal-entry.v3",
    sequence,
    previousSha256: state.lastSha256,
    event,
    detail: ownedDetail,
  });
  const entrySha256 = sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8"));
  const entry = Object.freeze({ ...preimage, entrySha256 });
  const entryBytes = Buffer.from(`${canonicalJson(entry)}\n`, "utf8");
  const cleanupEvent = state.cleanupOnly === true || state.inCleanup === true
    || event === "container.stopped" || event === "container.removed"
    || event === "network.removed" || event === "volume.removed" || event.startsWith("cleanup.");
  const maximumBytes = cleanupEvent ? JOURNAL_TOTAL_MAXIMUM_BYTES : JOURNAL_NORMAL_MAXIMUM_BYTES;
  if (durable.totalBytes + entryBytes.length > maximumBytes) fail("local_postgres_journal_invalid");
  const directoryPath = journalDirectory(privateRoot, true);
  const padded = String(sequence).padStart(6, "0");
  const finalPath = path.join(directoryPath, `entry-${padded}.json`);
  const pendingPath = path.join(directoryPath, `entry-${padded}.pending-${crypto.randomBytes(16).toString("hex")}.json`);
  exactFileAbsence(finalPath);
  let renamed = false;
  try {
    writePrivateJson(pendingPath, entry);
    readPrivateJson(pendingPath);
    state.checkpoint?.("journal.entry.install", "before");
    fs.renameSync(pendingPath, finalPath);
    renamed = true;
    fsyncPrivateDirectory(directoryPath);
    state.checkpoint?.("journal.entry.install", "after");
    const committed = readPrivateJsonRecord(finalPath);
    if (committed.sha256 !== sha256Bytes(entryBytes)) fail("local_postgres_journal_invalid");
    const refreshed = readJournalState(privateRoot);
    if (refreshed.sequence !== sequence || refreshed.lastSha256 !== entrySha256) fail("local_postgres_journal_invalid");
    assignJournalState(state, refreshed);
  } catch (error) {
    if (!renamed) {
      try { removePrivateFile(pendingPath); fsyncPrivateDirectory(directoryPath); } catch { /* recovery reader owns any residue */ }
    }
    try { assignJournalState(state, readJournalState(privateRoot)); } catch { /* preserve the primary sanitized failure */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_journal_invalid");
  }
  return entrySha256;
}

function resolveDockerSocketIdentity() {
  try {
    const user = os.userInfo();
    if (typeof user.homedir !== "string" || !path.isAbsolute(user.homedir)) fail("local_postgres_socket_invalid");
    const home = fs.realpathSync(user.homedir);
    const homeStat = fs.lstatSync(home, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : homeStat.uid;
    if (!homeStat.isDirectory() || homeStat.isSymbolicLink() || homeStat.uid !== uid) fail("local_postgres_socket_invalid");
    const dockerDirectory = path.join(home, ".docker");
    const runDirectory = path.join(dockerDirectory, "run");
    for (const directory of [dockerDirectory, runDirectory]) {
      const directoryStat = fs.lstatSync(directory, { bigint: true });
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== uid
        || fs.realpathSync(directory) !== directory) fail("local_postgres_socket_invalid");
    }
    const socketPath = path.join(runDirectory, "docker.sock");
    const relative = path.relative(home, socketPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) fail("local_postgres_socket_invalid");
    if (fs.realpathSync(socketPath) !== socketPath) fail("local_postgres_socket_invalid");
    const stat = fs.lstatSync(socketPath, { bigint: true });
    if (!stat.isSocket() || stat.isSymbolicLink() || stat.uid !== uid || stat.nlink !== 1n) fail("local_postgres_socket_invalid");
    const identity = Object.freeze({
      path: socketPath,
      dev: stat.dev.toString(10),
      ino: stat.ino.toString(10),
      uid: stat.uid.toString(10),
      gid: stat.gid.toString(10),
      mode: stat.mode.toString(8),
      nlink: stat.nlink.toString(10),
      size: stat.size.toString(10),
      mtimeMs: stat.mtimeMs.toString(),
    });
    return Object.freeze({ socketPath, identity, identitySha256: sha256Bytes(Buffer.from(canonicalJson(identity), "utf8")) });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_socket_invalid");
  }
}

function revalidateDockerSocketIdentity(authority) {
  const current = resolveDockerSocketIdentity();
  if (current.identitySha256 !== authority.identitySha256 || current.socketPath !== authority.socketPath) {
    fail("local_postgres_socket_identity_drift");
  }
}

function prepareIsolatedDockerHome(privateRoot) {
  const isolatedHome = privatePath(privateRoot, "docker-home");
  const dockerConfig = privatePath(privateRoot, "docker-config");
  try {
    fs.mkdirSync(isolatedHome, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    fs.mkdirSync(dockerConfig, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    writePrivateBytes(path.join(dockerConfig, "config.json"), Buffer.from('{"auths":{}}\n', "utf8"));
    assertPrivateDirectory(isolatedHome);
    assertPrivateDirectory(dockerConfig);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_docker_home_invalid");
  }
  return Object.freeze({ isolatedHome, dockerConfig });
}

function cleanupIsolatedDockerHome(privateRoot) {
  for (const leaf of ["docker-config", "docker-home"]) {
    const candidate = privatePath(privateRoot, leaf);
    try {
      const stat = fs.lstatSync(candidate, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid) fail("local_postgres_cleanup_unproven");
      fs.rmSync(candidate, { recursive: true, force: false });
      fsyncPrivateDirectory(privateRoot);
      exactFileAbsence(candidate);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
      if (error !== null && typeof error === "object" && error.code === "ENOENT") continue;
      fail("local_postgres_cleanup_unproven");
    }
  }
}

function ensureCleanupDockerHome(privateRoot) {
  try {
    return ensureIsolatedDockerHome(privateRoot);
  } catch {
    try {
      cleanupIsolatedDockerHome(privateRoot);
      return prepareIsolatedDockerHome(privateRoot);
    } catch {
      fail("local_postgres_docker_home_invalid");
    }
  }
}

function approvedDockerArgv(plan, kind, argv) {
  if (typeof kind !== "string" || !LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(kind)) fail("local_postgres_docker_command_denied");
  const candidate = ownedPlain(argv);
  const allowed = plan.steps.filter((step) => step.kind === kind).some((step) => (
    step.argv.length === candidate.length && step.argv.every((value, index) => value === candidate[index])
  ));
  if (!allowed) fail("local_postgres_docker_command_denied");
  return candidate;
}

function dockerEnvironment(isolated) {
  return Object.freeze({
    HOME: isolated.isolatedHome,
    DOCKER_CONFIG: isolated.dockerConfig,
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    TMPDIR: isolated.isolatedHome,
  });
}

function createDockerPort(authority, isolated, plan, privateRoot = null, journalState = null, grant = null) {
  const initialCli = observeDockerCliIdentity();
  if (grant !== null && initialCli.identitySha256 !== grant.host.dockerCliIdentitySha256) fail("local_postgres_docker_cli_invalid");
  const environment = dockerEnvironment(isolated);
  return Object.freeze({
    call(kind, argv, options = Object.freeze({})) {
      const stableOptions = ownedPlain(options);
      if (Object.keys(stableOptions).some((key) => key !== "missingAllowed")) fail("local_postgres_input_invalid");
      const stableArgv = approvedDockerArgv(plan, kind, argv);
      const beforeCli = observeDockerCliIdentity();
      if (beforeCli.identitySha256 !== initialCli.identitySha256
        || (grant !== null && beforeCli.identitySha256 !== grant.host.dockerCliIdentitySha256)) {
        fail("local_postgres_docker_cli_drift");
      }
      revalidateDockerSocketIdentity(authority);
      const reservation = privateRoot === null || journalState === null
        ? null : reserveEffect(privateRoot, journalState, `docker:${kind}`, kind);
      const result = spawnSync(DOCKER_CLI, ["--host", `unix://${authority.socketPath}`, ...stableArgv], {
        cwd: "/",
        encoding: "utf8",
        env: environment,
        maxBuffer: MAX_DOCKER_OUTPUT_BYTES,
        timeout: kind === "image.pull" ? 10 * 60_000 : 60_000,
      });
      if (result.signal !== null || result.error !== undefined || typeof result.stdout !== "string"
        || typeof result.stderr !== "string" || !Number.isSafeInteger(result.status)) {
        failDockerCall("AMBIGUOUS");
      }
      const afterCli = observeDockerCliIdentity();
      if (afterCli.identitySha256 !== beforeCli.identitySha256) fail("local_postgres_docker_cli_drift");
      revalidateDockerSocketIdentity(authority);
      if (result.status !== 0) {
        if (stableOptions.missingAllowed === true && result.status === 1
          && result.stdout === "" && isExactDockerMissingDiagnostic(kind, result.stderr, plan)) {
          if (reservation !== null) completeEffect(privateRoot, journalState, reservation);
          return Object.freeze({ found: false, stdout: "" });
        }
        if (reservation !== null) completeEffect(privateRoot, journalState, reservation);
        failDockerCall("FAILED");
      }
      if (reservation !== null) completeEffect(privateRoot, journalState, reservation);
      return Object.freeze({ found: true, stdout: result.stdout.trim() });
    },
  });
}

function isExactDockerMissingDiagnostic(kind, stderr, plan) {
  if (typeof stderr !== "string") return false;
  const message = stderr.endsWith("\n") ? stderr.slice(0, -1) : stderr;
  if (message.includes("\n") || message.includes("\r")) return false;
  const expected = {
    "image.inspect": Object.freeze([
      `Error response from daemon: No such image: ${IMAGE_REFERENCE}`,
      `Error: No such object: ${IMAGE_REFERENCE}`,
    ]),
    "container.inspect": Object.freeze([
      `Error response from daemon: No such container: ${plan.resources.container}`,
    ]),
    "network.inspect": Object.freeze([
      `Error response from daemon: network ${plan.resources.network} not found`,
    ]),
    "volume.inspect": Object.freeze([
      `Error response from daemon: get ${plan.resources.volume}: no such volume`,
    ]),
  }[kind];
  return Array.isArray(expected) && expected.includes(message);
}

function parseDockerJson(value, code = "local_postgres_docker_contract_invalid") {
  try {
    const parsed = parseStrictJson(value);
    return ownedPlain(parsed);
  } catch {
    fail(code);
  }
}

function planStep(plan, kind) {
  const step = plan.steps.find((candidate) => candidate.kind === kind);
  if (!step) fail("local_postgres_docker_command_denied");
  return step;
}

function inspectOwnedResource(docker, plan, kind) {
  const step = planStep(plan, kind);
  const result = docker.call(kind, step.argv, { missingAllowed: true });
  if (!result.found) return null;
  const record = parseDockerJson(result.stdout);
  const labels = kind === "container.inspect" ? record.Config?.Labels : record.Labels;
  if (labels === null || typeof labels !== "object"
    || labels[plan.resources.labelKey] !== plan.resources.labelValue) fail("local_postgres_resource_ownership_invalid");
  return record;
}

function proveOwnedResourceAbsent(docker, plan, kind) {
  const record = inspectOwnedResource(docker, plan, kind);
  if (record !== null) fail("local_postgres_resource_preexists");
}

function validateDockerVersion(result) {
  const record = parseDockerJson(result.stdout);
  if (record.Client?.Version !== "29.3.1" || record.Server?.Version !== "29.3.1"
    || record.Server?.Os !== "linux" || record.Server?.Arch !== "arm64") fail("local_postgres_docker_version_invalid");
}

function observeDockerVersion(result) {
  let record;
  try { record = parseStrictJson(result?.stdout); record = ownedPlain(record); }
  catch {
    return Object.freeze({
      dockerClientVersion: "UNKNOWN", dockerServerVersion: "UNKNOWN", dockerServerPlatform: "UNKNOWN",
    });
  }
  const observedString = (value, expected) => typeof value !== "string"
    ? "UNKNOWN" : (value === expected ? expected : "MISMATCH");
  const os = record.Server?.Os;
  const arch = record.Server?.Arch;
  const platform = typeof os !== "string" || typeof arch !== "string"
    ? "UNKNOWN" : (os === "linux" && arch === "arm64" ? IMAGE_PLATFORM : "MISMATCH");
  return Object.freeze({
    dockerClientVersion: observedString(record.Client?.Version, "29.3.1"),
    dockerServerVersion: observedString(record.Server?.Version, "29.3.1"),
    dockerServerPlatform: platform,
  });
}

function observePinnedImage(result) {
  let record;
  try { record = parseStrictJson(result?.stdout); record = ownedPlain(record); }
  catch {
    return Object.freeze({
      imageReference: "UNKNOWN", imagePlatform: "UNKNOWN", imagePlatformManifest: "UNKNOWN",
    });
  }
  const digests = record.RepoDigests;
  const imageReference = !Array.isArray(digests) || digests.some((value) => typeof value !== "string")
    ? "UNKNOWN" : (digests.includes(IMAGE_REFERENCE) ? IMAGE_REFERENCE : "MISMATCH");
  const os = record.Os;
  const architecture = record.Architecture;
  const descriptorOs = record.Descriptor?.platform?.os;
  const descriptorArchitecture = record.Descriptor?.platform?.architecture;
  const imagePlatform = [os, architecture, descriptorOs, descriptorArchitecture].some((value) => typeof value !== "string")
    ? "UNKNOWN"
    : (os === "linux" && architecture === "arm64" && descriptorOs === "linux"
      && descriptorArchitecture === "arm64" ? IMAGE_PLATFORM : "MISMATCH");
  const digest = record.Descriptor?.digest;
  const imagePlatformManifest = typeof digest !== "string"
    ? "UNKNOWN" : (digest === IMAGE_PLATFORM_MANIFEST ? IMAGE_PLATFORM_MANIFEST : "MISMATCH");
  return Object.freeze({ imageReference, imagePlatform, imagePlatformManifest });
}

function validatePinnedImage(result) {
  const record = parseDockerJson(result.stdout);
  const digests = Array.isArray(record.RepoDigests) ? record.RepoDigests : [];
  if (record.Os !== "linux" || record.Architecture !== "arm64" || !digests.includes(IMAGE_REFERENCE)) {
    fail("local_postgres_image_identity_invalid");
  }
  if (record.Descriptor?.digest !== IMAGE_PLATFORM_MANIFEST
    || record.Descriptor?.platform?.os !== "linux"
    || record.Descriptor?.platform?.architecture !== "arm64") {
    fail("local_postgres_image_platform_manifest_invalid");
  }
}

function containerLoopbackPort(record, plan) {
  const ports = record?.NetworkSettings?.Ports?.["5432/tcp"];
  if (!Array.isArray(ports) || ports.length !== 1 || ports[0]?.HostIp !== "127.0.0.1"
    || typeof ports[0]?.HostPort !== "string" || !/^[1-9][0-9]{0,4}$/u.test(ports[0].HostPort)) {
    fail("local_postgres_loopback_binding_invalid");
  }
  const port = Number(ports[0].HostPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535
    || record.Config?.Labels?.[plan.resources.labelKey] !== plan.resources.labelValue) fail("local_postgres_loopback_binding_invalid");
  return port;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withLocalDeadline(operation, milliseconds, code) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("local_deadline")), milliseconds);
        timer.unref?.();
      }),
    ]);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail(code);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function canonicalRunnerReceipt(input) {
  return Object.freeze(ownedPlain({ schemaVersion: "r4.public-core-local-postgres-physical-result.v3", ...input }));
}

function actionSetDigest(set) {
  return set.size === 0 ? "NONE" : sha256Bytes(Buffer.from(
    [...set].sort(binaryCompare).map((action) => `${action}\n`).join(""), "utf8",
  ));
}

function receiptHostObservation(observations) {
  return Object.freeze({
    dockerCliIdentitySha256: observations.dockerCliIdentitySha256,
    dockerClientVersion: observations.dockerClientVersion,
    dockerServerVersion: observations.dockerServerVersion,
    dockerServerPlatform: observations.dockerServerPlatform,
    socketIdentitySha256: observations.socketIdentitySha256,
    imageReference: observations.imageReference,
    imagePlatform: observations.imagePlatform,
    imagePlatformManifest: observations.imagePlatformManifest,
    imagePullAttempted: observations.imagePullAttempted,
    imagePullOutcome: observations.imagePullOutcome,
    imageCacheOutcome: observations.imageCacheOutcome,
    postgresServerVersionNum: observations.postgresServerVersionNum,
  });
}

function receiptEffects(effectLedger, observations) {
  return Object.freeze({
    dockerCallCounts: Object.freeze({ ...effectLedger.dockerCallCounts }),
    initialReadinessAttemptCount: effectLedger.initialReadinessAttemptCount,
    restartReadinessAttemptCount: effectLedger.restartReadinessAttemptCount,
    poolConstructionAttemptCount: effectLedger.poolConstructionAttemptCount,
    poolConstructionCount: effectLedger.poolConstructionCount,
    connectionAttemptCount: effectLedger.connectionAttemptCount,
    connectionTargetCounts: Object.freeze({ ...effectLedger.connectionTargetCounts }),
    databaseIdentityAttemptCount: effectLedger.databaseIdentityAttemptCount,
    databaseIdentityCount: effectLedger.databaseIdentityCount,
    schemaApplyAttemptCount: effectLedger.schemaApplyAttemptCount,
    schemaApplyCount: effectLedger.schemaApplyCount,
    verifyAttemptCount: effectLedger.verifyAttemptCount,
    verifyCount: effectLedger.verifyCount,
    rollbackAttemptCount: effectLedger.rollbackAttemptCount,
    rollbackCount: effectLedger.rollbackCount,
    domainActionInvocationAttemptCount: effectLedger.domainActionInvocationAttemptCount,
    domainActionInvocationCount: effectLedger.domainActionInvocationCount,
    distinctDomainActionAttemptCount: effectLedger.distinctDomainActionAttemptSet.size,
    distinctDomainActionAttemptSetSha256: actionSetDigest(effectLedger.distinctDomainActionAttemptSet),
    distinctDomainActionCount: effectLedger.distinctDomainActionSet.size,
    distinctDomainActionSetSha256: actionSetDigest(effectLedger.distinctDomainActionSet),
    containerRestartAttemptCount: effectLedger.containerRestartAttemptCount,
    containerRestartCount: effectLedger.containerRestartCount,
    maximumObservedConcurrentPools: observations.concurrency.pools,
    maximumObservedConcurrentClients: observations.concurrency.clients,
    maximumObservedConcurrentTransactions: observations.concurrency.transactions,
  });
}

function receiptCleanup(observations) {
  const residue = observations.cleanup ?? Object.freeze({
    ownedContainerCount: 1, ownedNetworkCount: 1, ownedVolumeCount: 1,
    ownedCredentialCount: 1, ownedDockerConfigCount: 1, ownedImportedRuntimeCount: 1,
    activeCoordinatorResidueCount: 1,
  });
  return Object.freeze({
    ...residue,
    retainedForensicFiles: Object.freeze([
      "grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json",
    ]),
  });
}

function receiptReadiness(observations) {
  return Object.freeze({
    targetPostgresObserved: observations.postgresServerVersionNum === 160010,
    productRuntimeEffects: false, trafficReady: false, gateCReady: false,
  });
}

function removeOwnedPrivateTree(treePath) {
  let stat;
  try { stat = fs.lstatSync(treePath, { bigint: true }); } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return;
    fail("local_postgres_cleanup_unproven");
  }
  const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : stat.uid;
  if (stat.uid !== uid || stat.isSymbolicLink()) fail("local_postgres_cleanup_unproven");
  if (stat.isFile()) {
    if (stat.nlink !== 1n) fail("local_postgres_cleanup_unproven");
    fs.unlinkSync(treePath);
    fsyncPrivateDirectory(path.dirname(treePath));
    return;
  }
  if (!stat.isDirectory() || (Number(stat.mode) & 0o777) !== 0o700) fail("local_postgres_cleanup_unproven");
  for (const name of fs.readdirSync(treePath).sort(binaryCompare)) {
    if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) fail("local_postgres_cleanup_unproven");
    removeOwnedPrivateTree(path.join(treePath, name));
  }
  fs.rmdirSync(treePath);
  fsyncPrivateDirectory(path.dirname(treePath));
}

function readInstalledClosureFile(filePath) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : before.uid;
    if (!before.isFile() || before.uid !== uid || before.nlink !== 1n || (Number(before.mode) & 0o022) !== 0
      || before.size < 0n || before.size > 4_000_000n) fail("local_postgres_pg_import_closure_invalid");
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.nlink !== 1n) fail("local_postgres_pg_import_closure_invalid");
    return bytes;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_pg_import_closure_invalid"); }
    }
  }
}

function preparePgImportClosure(privateRoot) {
  const sourceRoot = path.join(ROOT, "node_modules");
  const runtimeRoot = privatePath(privateRoot, "pg-runtime");
  const destinationModules = path.join(runtimeRoot, "node_modules");
  exactFileAbsence(runtimeRoot);
  const records = [];
  try {
    fs.mkdirSync(runtimeRoot, { mode: 0o700 });
    fs.mkdirSync(destinationModules, { mode: 0o700 });
    fsyncPrivateDirectory(privateRoot);
    fsyncPrivateDirectory(runtimeRoot);
    function copyDirectory(sourceDirectory, destinationDirectory) {
      const sourceStat = fs.lstatSync(sourceDirectory, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : sourceStat.uid;
      if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink() || sourceStat.uid !== uid
        || (Number(sourceStat.mode) & 0o022) !== 0 || fs.realpathSync(sourceDirectory) !== sourceDirectory) {
        fail("local_postgres_pg_import_closure_invalid");
      }
      if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory, { mode: 0o700 });
        fsyncPrivateDirectory(path.dirname(destinationDirectory));
      }
      for (const name of fs.readdirSync(sourceDirectory).sort(binaryCompare)) {
        if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
          fail("local_postgres_pg_import_closure_invalid");
        }
        const sourcePath = path.join(sourceDirectory, name);
        const destinationPath = path.join(destinationDirectory, name);
        const stat = fs.lstatSync(sourcePath, { bigint: true });
        if (stat.isSymbolicLink()) fail("local_postgres_pg_import_closure_invalid");
        if (stat.isDirectory()) copyDirectory(sourcePath, destinationPath);
        else if (stat.isFile()) {
          const bytes = readInstalledClosureFile(sourcePath);
          writePrivateBytes(destinationPath, bytes);
          const relative = path.relative(sourceRoot, sourcePath).split(path.sep).join("/");
          records.push(Object.freeze({ path: relative, sha256: sha256Bytes(bytes), bytes: bytes.length }));
        } else fail("local_postgres_pg_import_closure_invalid");
      }
    }
    for (const packagePath of PG_IMPORT_CLOSURE_PACKAGES) {
      const destinationPackage = path.join(destinationModules, ...packagePath.split("/"));
      const destinationParent = path.dirname(destinationPackage);
      if (!fs.existsSync(destinationParent)) {
        fs.mkdirSync(destinationParent, { mode: 0o700 });
        fsyncPrivateDirectory(path.dirname(destinationParent));
      }
      copyDirectory(path.join(sourceRoot, ...packagePath.split("/")), destinationPackage);
    }
    records.sort((left, right) => binaryCompare(left.path, right.path));
    const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
    if (records.length !== PG_IMPORT_CLOSURE_FILE_COUNT || sha256Bytes(frame) !== PG_IMPORT_CLOSURE_SHA256) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    fsyncPrivateDirectory(destinationModules);
    fsyncPrivateDirectory(runtimeRoot);
    const verified = verifyPgImportClosureRuntime(runtimeRoot);
    return Object.freeze({ runtimeRoot, aggregateSha256: verified.aggregateSha256, fileCount: verified.fileCount });
  } catch (error) {
    try { removeOwnedPrivateTree(runtimeRoot); } catch { /* primary sanitized failure wins */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  }
}

function verifyPgImportClosureRuntime(runtimeRoot) {
  try {
    assertPrivateDirectory(runtimeRoot);
    const modulesRoot = path.join(runtimeRoot, "node_modules");
    assertPrivateDirectory(modulesRoot);
    const expectedTopLevel = [...new Set(PG_IMPORT_CLOSURE_PACKAGES.map((value) => value.split("/")[0]))].sort(binaryCompare);
    const observedTopLevel = fs.readdirSync(modulesRoot).sort(binaryCompare);
    if (observedTopLevel.length !== expectedTopLevel.length
      || observedTopLevel.some((value, index) => value !== expectedTopLevel[index])) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    const typesRoot = path.join(modulesRoot, "@types");
    const observedTypes = fs.readdirSync(typesRoot).sort(binaryCompare);
    if (observedTypes.length !== 1 || observedTypes[0] !== "pg") fail("local_postgres_pg_import_closure_invalid");
    const records = [];
    function visit(directoryPath) {
      const directoryStat = fs.lstatSync(directoryPath, { bigint: true });
      const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : directoryStat.uid;
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== uid
        || (Number(directoryStat.mode) & 0o777) !== 0o700 || fs.realpathSync(directoryPath) !== directoryPath) {
        fail("local_postgres_pg_import_closure_invalid");
      }
      for (const name of fs.readdirSync(directoryPath).sort(binaryCompare)) {
        const candidate = path.join(directoryPath, name);
        const stat = fs.lstatSync(candidate, { bigint: true });
        if (stat.isSymbolicLink()) fail("local_postgres_pg_import_closure_invalid");
        if (stat.isDirectory()) visit(candidate);
        else if (stat.isFile()) {
          const bytes = readInstalledClosureFile(candidate);
          const relative = path.relative(modulesRoot, candidate).split(path.sep).join("/");
          if (!PG_IMPORT_CLOSURE_PACKAGES.some((packagePath) => relative.startsWith(`${packagePath}/`))) {
            fail("local_postgres_pg_import_closure_invalid");
          }
          records.push(Object.freeze({ path: relative, sha256: sha256Bytes(bytes), bytes: bytes.length }));
        } else fail("local_postgres_pg_import_closure_invalid");
      }
    }
    visit(modulesRoot);
    records.sort((left, right) => binaryCompare(left.path, right.path));
    const frame = Buffer.from(records.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8");
    if (records.length !== PG_IMPORT_CLOSURE_FILE_COUNT || sha256Bytes(frame) !== PG_IMPORT_CLOSURE_SHA256) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    return Object.freeze({ aggregateSha256: PG_IMPORT_CLOSURE_SHA256, fileCount: records.length });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_import_closure_invalid");
  }
}

async function loadPgDriver(runtimeRoot) {
  try {
    if (typeof runtimeRoot !== "string" || !path.isAbsolute(runtimeRoot)) fail("local_postgres_pg_import_closure_invalid");
    verifyPgImportClosureRuntime(runtimeRoot);
    const require = createRequire(path.join(runtimeRoot, "entry.cjs"));
    const resolutionPaths = require.resolve.paths("pg");
    const expectedModulesRoot = path.join(runtimeRoot, "node_modules");
    if (!Array.isArray(resolutionPaths) || resolutionPaths[0] !== expectedModulesRoot) {
      fail("local_postgres_pg_import_closure_invalid");
    }
    for (const fallbackPath of resolutionPaths.slice(1)) exactFileAbsence(fallbackPath);
    const cacheBefore = new Set(Object.keys(require.cache));
    const resolved = require.resolve("pg");
    const modulesRoot = path.join(runtimeRoot, "node_modules") + path.sep;
    if (!resolved.startsWith(modulesRoot)) fail("local_postgres_pg_import_closure_invalid");
    const module = require("pg");
    for (const loadedPath of Object.keys(require.cache)) {
      if (!cacheBefore.has(loadedPath) && !loadedPath.startsWith(modulesRoot)) {
        fail("local_postgres_pg_import_closure_invalid");
      }
    }
    for (const fallbackPath of resolutionPaths.slice(1)) exactFileAbsence(fallbackPath);
    verifyPgImportClosureRuntime(runtimeRoot);
    const candidate = module.Pool ?? module.default?.Pool;
    const types = module.types ?? module.default?.types;
    if (typeof candidate !== "function" || types === null || typeof types !== "object"
      || typeof types.getTypeParser !== "function") fail("local_postgres_pg_driver_invalid");
    const getTypeParser = types.getTypeParser.bind(types);
    const parseInt8 = (value) => {
      if (typeof value !== "string" || !/^-?(?:0|[1-9][0-9]*)$/u.test(value)) fail("local_postgres_pg_integer_invalid");
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) fail("local_postgres_pg_integer_invalid");
      return parsed;
    };
    const baseInt8Array = getTypeParser(1016, "text");
    const parseInt8Array = (value) => {
      let parsed;
      try { parsed = baseInt8Array(value); } catch { fail("local_postgres_pg_integer_invalid"); }
      function convert(item, depth = 0) {
        if (depth > 8) fail("local_postgres_pg_integer_invalid");
        if (Array.isArray(item)) return item.map((child) => convert(child, depth + 1));
        if (item === null) return null;
        if (typeof item === "number") {
          if (!Number.isSafeInteger(item)) fail("local_postgres_pg_integer_invalid");
          return item;
        }
        if (typeof item !== "string") fail("local_postgres_pg_integer_invalid");
        return parseInt8(item);
      }
      return convert(parsed);
    };
    const safeTypes = Object.freeze({
      getTypeParser(oid, format = "text") {
        if (!Number.isSafeInteger(oid) || (format !== "text" && format !== "binary")) fail("local_postgres_pg_type_invalid");
        if (format === "text" && oid === 20) return parseInt8;
        if (format === "text" && oid === 1016) return parseInt8Array;
        const parser = getTypeParser(oid, format);
        if (typeof parser !== "function") fail("local_postgres_pg_type_invalid");
        return parser;
      },
    });
    return Object.freeze({ Pool: candidate, types: safeTypes });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_pg_driver_invalid");
  }
}

function createOneShotLoopbackStreamGate(expectedPort, beforeConnect, completeConnection, makeSocket = () => new Socket()) {
  if (!Number.isSafeInteger(expectedPort) || expectedPort < 1 || expectedPort > 65_535
    || typeof beforeConnect !== "function" || typeof completeConnection !== "function" || typeof makeSocket !== "function") {
    fail("local_postgres_pool_configuration_invalid");
  }
  let streamIssued = false;
  let connectEntered = false;
  let reservation = null;
  let completed = false;
  return Object.freeze({
    streamFactory() {
      if (streamIssued) fail("local_postgres_connection_failed");
      streamIssued = true;
      const socket = makeSocket();
      if (socket === null || typeof socket !== "object" || typeof socket.connect !== "function") fail("local_postgres_connection_failed");
      const nativeConnect = socket.connect;
      Object.defineProperty(socket, "connect", { configurable: false, enumerable: false, writable: false, value(port, host) {
        if (connectEntered || arguments.length !== 2 || port !== expectedPort || host !== "127.0.0.1") {
          fail("local_postgres_connection_failed");
        }
        connectEntered = true;
        reservation = beforeConnect();
        return Reflect.apply(nativeConnect, socket, [port, host]);
      } });
      return socket;
    },
    complete() {
      if (!streamIssued || !connectEntered || reservation === null || completed) fail("local_postgres_connection_failed");
      completeConnection(reservation); completed = true;
    },
  });
}

function createRunPool(driver, input, streamFactory = null) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["database", "password", "port"]);
  if (typeof stable.database !== "string" || !/^forme_r4_local_[0-9a-f]{16}_[ab]$|^postgres$/u.test(stable.database)
    || typeof stable.password !== "string" || stable.password.length < 32 || stable.password.length > 256
    || !Number.isSafeInteger(stable.port) || stable.port < 1 || stable.port > 65_535) fail("local_postgres_pool_configuration_invalid");
  try {
    return new driver.Pool({
      host: "127.0.0.1",
      port: stable.port,
      user: "forme_r4_local",
      password: stable.password,
      database: stable.database,
      max: 1,
      min: 0,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 1_000,
      query_timeout: 90_000,
      statement_timeout: 75_000,
      lock_timeout: 10_000,
      idle_in_transaction_session_timeout: 30_000,
      allowExitOnIdle: false,
      ssl: false,
      application_name: "forme-r4-public-core-local-rehearsal",
      options: "-c timezone=UTC -c datestyle=ISO,MDY -c statement_timeout=75000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=30000",
      types: driver.types,
      ...(streamFactory === null ? Object.freeze({}) : Object.freeze({ stream: streamFactory })),
    });
  } catch {
    fail("local_postgres_pool_configuration_invalid");
  }
}

async function closeRunPool(pool) {
  if (pool === null) return;
  await withLocalDeadline(() => pool.end(), 10_000, "local_postgres_pool_close_failed");
}

async function queryRunPool(pool, text, values = undefined) {
  if (typeof text !== "string" || text.length === 0 || text.length > 2_000_000
    || (values !== undefined && !Array.isArray(values))) fail("local_postgres_sql_input_invalid");
  let result;
  try {
    result = await withLocalDeadline(
      () => (values === undefined ? pool.query(text) : pool.query(text, values)),
      100_000,
      "local_postgres_sql_execution_failed",
    );
  } catch {
    fail("local_postgres_sql_execution_failed");
  }
  try {
    if (result === null || typeof result !== "object") fail("local_postgres_sql_result_invalid");
    const descriptors = Object.getOwnPropertyDescriptors(result);
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (!rowCountDescriptor || !("value" in rowCountDescriptor) || !rowsDescriptor || !("value" in rowsDescriptor)
      || (rowCountDescriptor.value !== null && (!Number.isSafeInteger(rowCountDescriptor.value) || rowCountDescriptor.value < 0))) {
      fail("local_postgres_sql_result_invalid");
    }
    const rows = ownedPlain(rowsDescriptor.value);
    if (!Array.isArray(rows) || (rowCountDescriptor.value !== null && rows.length !== rowCountDescriptor.value)) {
      fail("local_postgres_sql_result_invalid");
    }
    return Object.freeze({ rowCount: rowCountDescriptor.value, rows });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_sql_result_invalid");
  }
}

async function executeRunSql(pool, text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 2_000_000) fail("local_postgres_sql_input_invalid");
  try {
    await pool.query(text);
  } catch {
    fail("local_postgres_sql_execution_failed");
  }
}

async function waitForPostgres(driver, connection, countedAttempt = null, sleep = delay) {
  if (typeof sleep !== "function") fail("local_postgres_readiness_failed");
  for (let attempt = 1; attempt <= POSTGRES_READY_ATTEMPTS; attempt += 1) {
    const oneAttempt = async () => {
      let pool = null;
      let client = null;
      try {
        const gate = countedAttempt?.gate(attempt) ?? null;
        const construct = () => {
          const created = createRunPool(driver, connection, gate?.streamFactory ?? null);
          pool = created;
          countedAttempt?.poolOpened?.(created);
          return created;
        };
        pool = countedAttempt === null ? construct() : await countedAttempt.construct(attempt, construct);
        client = await withLocalDeadline(() => pool.connect(), 1_000, "local_postgres_readiness_failed");
        countedAttempt?.clientOpened?.(client, pool);
        gate?.complete();
        const result = await queryRunPool(client, "SELECT 1::integer AS ready");
        return result.rowCount === 1 && result.rows?.[0]?.ready === 1;
      } finally {
        let cleanupFailed = false;
        if (client !== null) {
          try {
            const released = client.release(new Error("local_postgres_readiness_client_discard"));
            if (released !== null && typeof released === "object" && typeof released.then === "function") await released;
            if (countedAttempt?.isClientOpen?.(client) === true) countedAttempt.clientClosed(client);
          } catch { cleanupFailed = true; }
        }
        if (pool !== null) {
          try {
            await closeRunPool(pool);
            if (countedAttempt?.isClientOpen?.(client) === true) countedAttempt.clientClosed(client);
            if (countedAttempt?.isPoolOpen?.(pool) === true) countedAttempt.poolClosed(pool);
          } catch { cleanupFailed = true; }
        }
        if (cleanupFailed) fail("local_postgres_pool_close_failed");
      }
    };
    try {
      const ready = await oneAttempt();
      if (ready) return attempt;
    } catch (error) {
      const code = authenticLocalPostgresRunnerErrorDetails(error)?.code;
      if (code !== "local_postgres_fake_readiness_not_ready") throw error;
      /* only an explicit, unambiguous successful not-ready observation retries */
    }
    if (attempt === POSTGRES_READY_ATTEMPTS) fail("local_postgres_readiness_failed");
    await sleep(POSTGRES_READY_INTERVAL_MS);
  }
  fail("local_postgres_readiness_failed");
}

export async function runLocalPostgresReadinessFakePlan(input) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["outcomeSequence"]);
  const outcomes = ownedPlain(stable.outcomeSequence);
  const allowed = new Set(["not_ready", "ready", "connect_ambiguous", "sql_ambiguous"]);
  if (!Array.isArray(outcomes) || outcomes.length < 1 || outcomes.length > POSTGRES_READY_ATTEMPTS
    || outcomes.some((outcome) => typeof outcome !== "string" || !allowed.has(outcome))
    || outcomes.slice(0, -1).some((outcome) => outcome !== "not_ready")
    || !["ready", "connect_ambiguous", "sql_ambiguous"].includes(outcomes.at(-1))) {
    fail("local_postgres_fake_fault_invalid");
  }
  let poolAttempts = 0;
  let poolCompletions = 0;
  let connectionAttempts = 0;
  let connectionCompletions = 0;
  let poolCloses = 0;
  let clientOpens = 0;
  let clientCloses = 0;
  let sleeps = 0;
  const openPools = new Set();
  const openClients = new Set();
  let currentOutcome = null;
  class FakePool {
    constructor(config) {
      currentOutcome = outcomes[poolAttempts - 1];
      this.config = config;
      this.closed = false;
    }
    async connect() {
      const stream = this.config.stream();
      stream.connect(this.config.port, this.config.host);
      const outcome = currentOutcome;
      const client = Object.freeze({
        async query(text) {
          if (text !== "SELECT 1::integer AS ready") fail("local_postgres_sql_input_invalid");
          if (outcome === "sql_ambiguous") throw new Error("synthetic_sql_ambiguity");
          return Object.freeze({
            rowCount: 1,
            rows: Object.freeze([Object.freeze({ ready: outcome === "ready" ? 1 : 0 })]),
          });
        },
        release() {},
      });
      return client;
    }
    async end() {
      if (this.closed) fail("local_postgres_pool_close_failed");
      this.closed = true;
      poolCloses += 1;
    }
  }
  const driver = Object.freeze({ Pool: FakePool, types: Object.freeze({}) });
  const countedAttempt = Object.freeze({
    gate() {
      const outcome = outcomes[poolAttempts];
      return createOneShotLoopbackStreamGate(
        54_321,
        () => { connectionAttempts += 1; return Object.freeze({ ordinal: connectionAttempts }); },
        () => { connectionCompletions += 1; },
        () => ({ connect() {
          if (outcome === "connect_ambiguous") throw new Error("synthetic_connect_ambiguity");
          return this;
        } }),
      );
    },
    async construct(_attempt, operation) {
      poolAttempts += 1;
      const candidate = operation();
      poolCompletions += 1;
      return candidate;
    },
    poolOpened(candidate) { openPools.add(candidate); },
    poolClosed(candidate) { if (!openPools.delete(candidate)) fail("local_postgres_pool_close_failed"); },
    isPoolOpen(candidate) { return openPools.has(candidate); },
    clientOpened(candidate) { openClients.add(candidate); clientOpens += 1; },
    clientClosed(candidate) {
      if (!openClients.delete(candidate)) fail("local_postgres_connection_failed");
      clientCloses += 1;
    },
    isClientOpen(candidate) { return openClients.has(candidate); },
  });
  let status = "GREEN";
  let code = "local_postgres_readiness_ready";
  let attempts = 0;
  try {
    attempts = await waitForPostgres(
      driver,
      Object.freeze({ database: "forme_r4_local_0000000000000000_a", password: "x".repeat(32), port: 54_321 }),
      countedAttempt,
      async (milliseconds) => {
        if (milliseconds !== POSTGRES_READY_INTERVAL_MS) fail("local_postgres_fake_fault_invalid");
        sleeps += 1;
      },
    );
  } catch (error) {
    status = "FAILED";
    code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_readiness_failed";
    attempts = poolAttempts;
  }
  if (openPools.size !== 0 || openClients.size !== 0) fail("local_postgres_pool_close_failed");
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-readiness-fake-result.v1",
    status, code, attempts, poolAttempts, poolCompletions, connectionAttempts, connectionCompletions,
    poolCloses, clientOpens, clientCloses, sleeps, physicalEffects: 0,
  });
}

function readSqlArtifact(artifactPath, expectedSha256) {
  const absolute = path.join(ROOT, artifactPath);
  let descriptor;
  try {
    descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size < 1n || stat.size > 2_000_000n) {
      fail("local_postgres_sql_binding_invalid");
    }
    const bytes = fs.readFileSync(descriptor);
    if (BigInt(bytes.length) !== stat.size || sha256Bytes(bytes) !== expectedSha256) fail("local_postgres_sql_binding_invalid");
    const text = bytes.toString("utf8");
    if (text.length === 0 || text.includes("\0")) fail("local_postgres_sql_binding_invalid");
    return text;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_sql_binding_invalid");
  } finally {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { fail("local_postgres_sql_binding_invalid"); }
    }
  }
}

const CATALOG_COUNTS_SQL = `
SELECT
  (SELECT count(*)::integer
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND c.relkind = 'r') AS tables,
  (SELECT count(*)::integer
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'forme_r4_public_core' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
  (SELECT count(*)::integer
     FROM pg_constraint x JOIN pg_namespace n ON n.oid = x.connamespace
    WHERE n.nspname = 'forme_r4_public_core') AS constraints,
  (SELECT count(*)::integer FROM pg_indexes WHERE schemaname = 'forme_r4_public_core') AS indexes
`;

async function observeCatalog(pool) {
  const result = await queryRunPool(pool, CATALOG_COUNTS_SQL);
  const row = result.rows?.[0];
  if (result.rowCount !== 1 || row === null || typeof row !== "object") {
    return Object.freeze({
      catalogOutcome: "MISMATCH", tables: "UNKNOWN", columns: "UNKNOWN",
      constraints: "UNKNOWN", indexes: "UNKNOWN", catalogContractSha256: CATALOG_CONTRACT_SHA256,
    });
  }
  const counts = Object.fromEntries(["tables", "columns", "constraints", "indexes"].map((key) => [
    key, Number.isSafeInteger(row[key]) && row[key] >= 0 ? row[key] : "UNKNOWN",
  ]));
  const matched = counts.tables === 14 && counts.columns === 207 && counts.constraints === 172 && counts.indexes === 44;
  return Object.freeze({
    catalogOutcome: matched ? "MATCHED" : "MISMATCH", ...counts,
    catalogContractSha256: CATALOG_CONTRACT_SHA256,
  });
}

const DURABLE_NON_SEED_COUNT_SQL = `
SELECT (
  (SELECT count(*) FROM forme_r4_public_core.rooms) +
  (SELECT count(*) FROM forme_r4_public_core.projections) +
  (SELECT count(*) FROM forme_r4_public_core.pairing_challenges) +
  (SELECT count(*) FROM forme_r4_public_core.room_bindings) +
  (SELECT count(*) FROM forme_r4_public_core.public_encounters) +
  (SELECT count(*) FROM forme_r4_public_core.interactions) +
  (SELECT count(*) FROM forme_r4_public_core.rate_events) +
  (SELECT count(*) FROM forme_r4_public_core.room_events) +
  (SELECT count(*) FROM forme_r4_public_core.mutation_receipts) +
  (SELECT count(*) FROM forme_r4_public_core.event_acks) +
  (SELECT count(*) FROM forme_r4_public_core.encryption_nonces) +
  (SELECT count(*) FROM forme_r4_public_core.purge_jobs)
)::integer AS durable_rows,
(SELECT count(*)::integer FROM forme_r4_public_core.installation) AS installation_rows,
(SELECT count(*)::integer FROM forme_r4_public_core.retention_health) AS retention_health_rows
`;

async function proveSeedOnly(pool) {
  const result = await queryRunPool(pool, DURABLE_NON_SEED_COUNT_SQL);
  const row = result.rows?.[0];
  if (result.rowCount !== 1 || row?.durable_rows !== 0 || row?.installation_rows !== 1 || row?.retention_health_rows !== 1) {
    fail("local_postgres_seed_state_invalid");
  }
}

async function proveNamespaceAbsent(pool) {
  const result = await queryRunPool(pool, "SELECT to_regnamespace('forme_r4_public_core') IS NULL AS absent");
  if (result.rowCount !== 1 || result.rows?.[0]?.absent !== true) fail("local_postgres_rollback_incomplete");
}

async function applyAndVerifySql(pool, sql) {
  await executeRunSql(pool, sql.schema);
  await executeRunSql(pool, sql.verify);
  return await observeCatalog(pool);
}

async function applySchemaSql(pool, schemaSql) {
  await executeRunSql(pool, schemaSql);
}

async function verifySchemaSql(pool, verifySql) {
  await executeRunSql(pool, verifySql);
}

async function provePrimaryDatabaseIdentity(pool, expectedDatabase) {
  const result = await queryRunPool(pool, "SELECT current_database() AS database");
  return result.rowCount === 1 && result.rows?.[0]?.database === expectedDatabase;
}

async function createRollbackDatabase(admin, databaseName) {
  if (!/^forme_r4_local_[0-9a-f]{16}_b$/u.test(databaseName)) fail("local_postgres_database_identity_invalid");
  await queryRunPool(admin, `CREATE DATABASE "${databaseName}"`);
}

function fixtureBytes(domain) {
  return crypto.createHash("sha256").update(`${WIRING_PACKET_SHA256}\0${domain}`, "utf8").digest();
}

function createDeterministicIdentityPort() {
  const authority = fixtureBytes("local-postgres-identity-v1");
  const secrets = new Map();
  const roomId = `room_${crypto.createHash("sha256").update(`${WIRING_PACKET_SHA256}\0local-postgres-room-id-v1`).digest("hex").slice(0, 32)}`;
  function digest(domain, input) {
    return crypto.createHmac("sha256", authority).update(domain, "utf8").update("\0", "utf8")
      .update(canonicalJson(ownedPlain(input)), "utf8").digest();
  }
  const port = Object.freeze({
    deriveId(input) {
      const stable = ownedPlain(input);
      const prefix = stable.prefix;
      if (typeof prefix !== "string" || !/^[a-z][a-z0-9_]{0,31}$/u.test(prefix)) fail("local_postgres_fixture_identity_invalid");
      if (prefix === "room") return roomId;
      return `${prefix}_${digest("id", stable).toString("hex").slice(0, 32)}`;
    },
    deriveSecret(input) {
      const stable = ownedPlain(input);
      const kind = stable.kind;
      if (typeof kind !== "string" || !/^[a-z][a-z0-9_]{0,31}$/u.test(kind)) fail("local_postgres_fixture_identity_invalid");
      const secret = `${kind}_${digest("secret", stable).toString("base64url")}`;
      secrets.set(kind, secret);
      return secret;
    },
    deriveNonce(input) {
      return Uint8Array.from(digest("nonce", ownedPlain(input)).subarray(0, 12));
    },
  });
  return Object.freeze({
    port,
    roomId,
    takeSecret(kind) {
      const value = secrets.get(kind);
      if (typeof value !== "string") fail("local_postgres_fixture_secret_unavailable");
      return value;
    },
    close() {
      authority.fill(0);
      secrets.clear();
    },
  });
}

function createProjectionCapsule(canonicalSha256, roomId, entityId, observedAt) {
  const publishedAt = new Date(observedAt).toISOString();
  const freshUntil = new Date(observedAt + 3 * 24 * 60 * 60 * 1_000).toISOString();
  const expiresAt = new Date(observedAt + 6 * 24 * 60 * 60 * 1_000).toISOString();
  const preimage = Object.freeze({
    schemaVersion: "projection_capsule.v1",
    projectionId: `proj_${crypto.createHash("sha256").update(`${roomId}\0projection`).digest("hex").slice(0, 32)}`,
    roomId,
    entityId,
    title: "Forme Local PostgreSQL Rehearsal",
    thirdPlaceSummary: "A synthetic, bounded local proof of the durable Public Core.",
    claims: Object.freeze([
      Object.freeze({ slot: "becoming", text: "A local PostgreSQL bridge is under review.", attribution: "owner_confirmed", uncertainty: null }),
      Object.freeze({ slot: "now", text: "Only synthetic local bytes are used.", attribution: "owner_confirmed", uncertainty: null }),
      Object.freeze({ slot: "nextMove", text: "Stop before Gate C activation.", attribution: "inferred_allowed", uncertainty: "Production authority remains absent." }),
      Object.freeze({ slot: "tensions", text: "Durability must not widen authority.", attribution: "unresolved_allowed", uncertainty: null }),
      Object.freeze({ slot: "openTo", text: "One bounded synthetic public encounter.", attribution: "owner_confirmed", uncertainty: null }),
    ]),
    supportedInteractions: Object.freeze(["ask", "seed", "resonance"]),
    allowedTopics: Object.freeze(["R4 local rehearsal"]),
    unavailableTopics: Object.freeze(["private data", "production credentials"]),
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "This synthetic Projection may carry one bounded local request.",
    nonCommitmentStatement: "This Projection cannot commit the Owner.",
    disclosureBasisId: `basis_${crypto.createHash("sha256").update(`${roomId}\0basis`).digest("hex").slice(0, 32)}`,
    publicationAttestationId: `att_${crypto.createHash("sha256").update(`${roomId}\0attestation`).digest("hex").slice(0, 32)}`,
    publishedAt,
    freshUntil,
    expiresAt,
  });
  return Object.freeze({ ...preimage, payloadHash: canonicalSha256(preimage) });
}

async function createApplicationGraph(pool, observedAt) {
  const [executorModule, postgresModule, bridgeModule, applicationModule, cryptoModule, protocolModule] = await Promise.all([
    import("../apps/room/src/public-core-pg-executor.ts"),
    import("../apps/room/src/public-core-postgres.ts"),
    import("../apps/room/src/public-core-postgres-application-store.ts"),
    import("../apps/room/src/public-core-application.ts"),
    import("../apps/room/src/public-core-crypto.ts"),
    import("../packages/r4-protocol/src/index.ts"),
  ]);
  const bodyMaterial = fixtureBytes("local-postgres-body-key-v1");
  const pepperMaterial = fixtureBytes("local-postgres-capability-pepper-v1");
  const publicationMaterial = fixtureBytes("local-postgres-publication-verifier-v1");
  const identity = createDeterministicIdentityPort();
  const roomId = identity.roomId;
  let bodyEncryptionKey;
  let capabilityPepperKey;
  const closedMaterial = {
    bodyEncryptionKey: false,
    capabilityPepperKey: false,
    identity: false,
    bodyMaterial: false,
    pepperMaterial: false,
    publicationMaterial: false,
  };
  function closeAllMaterial() {
    let failed = false;
    for (const [name, operation] of [
      ["bodyEncryptionKey", () => bodyEncryptionKey?.close()],
      ["capabilityPepperKey", () => capabilityPepperKey?.close()],
      ["identity", () => identity.close()],
      ["bodyMaterial", () => bodyMaterial.fill(0)],
      ["pepperMaterial", () => pepperMaterial.fill(0)],
      ["publicationMaterial", () => publicationMaterial.fill(0)],
    ]) {
      if (closedMaterial[name]) continue;
      try {
        operation();
        closedMaterial[name] = true;
      } catch {
        failed = true;
      }
    }
    if (failed) fail("local_postgres_application_graph_cleanup_failed");
  }
  try {
    bodyEncryptionKey = new cryptoModule.PublicCoreCryptoKeyHandleV1({
      purpose: "body_encryption",
      reference: `ref:body-encryption/local-postgres@${WIRING_PACKET_SHA256}`,
      material: bodyMaterial,
    });
    capabilityPepperKey = new cryptoModule.PublicCoreCryptoKeyHandleV1({
      purpose: "capability_pepper",
      reference: `ref:capability-pepper/local-postgres@${WIRING_PACKET_SHA256}`,
      material: pepperMaterial,
    });
    const executor = executorModule.createPublicCorePgExecutorV1({ pool });
    const postgresStore = new postgresModule.PublicCorePostgresStoreV1(executor);
    const publicationVerifier = Object.freeze(function verifyPublication(input) {
      const stable = ownedPlain(input);
      const frame = crypto.createHmac("sha256", publicationMaterial).update(canonicalJson(stable), "utf8").digest("hex");
      return Object.freeze({
        basisHash: protocolModule.canonicalSha256({ projectionPayloadHash: stable.projection?.payloadHash, domain: "basis" }),
        projectionPolicyHash: protocolModule.canonicalSha256({ projectionPayloadHash: stable.projection?.payloadHash, domain: "policy" }),
        publicationApprovalId: `approval_${frame.slice(0, 32)}`,
      });
    });
    const bridge = bridgeModule.createPublicCorePostgresApplicationStoreV1({
      postgresStore,
      roomId,
      bodyEncryptionKey,
      capabilityPepperKey,
      now: () => new Date(observedAt).toISOString(),
      identity: identity.port,
      publicationVerifier,
    });
    const application = new applicationModule.PublicCoreApplicationV1(bridge);
    return Object.freeze({
      application,
      roomId,
      observedAt,
      identity,
      canonicalSha256: protocolModule.canonicalSha256,
      close: closeAllMaterial,
    });
  } catch (error) {
    try { closeAllMaterial(); } catch { /* the original sanitized failure wins */ }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_application_graph_failed");
  }
}

function closeApplicationGraph(graph) {
  if (graph === null) return true;
  try {
    graph.close();
    return true;
  } catch {
    return false;
  }
}

const SYNTHETIC_ACTOR_CLASS = Object.freeze({
  "third_place.list": "public",
  "projection.read": "public",
  "public_encounter.issue": "public",
  "interaction.create": "guest_capability",
  "interaction.read": "guest_capability",
  "interaction.delete": "guest_capability",
  "room.pair.exchange": "public",
  "room.create": "controller",
  "room.pair": "controller",
  "room.binding.revoke": "controller",
  "room.mode.set": "controller",
  "projection.revoke": "controller",
  "curation.admit": "curator",
  "curation.unlist": "curator",
  "room_operator.status": "room_operator",
  "room_operator.sync": "room_operator",
  "room_operator.pull": "room_operator",
  "room_operator.ack": "room_operator",
  "room_operator.projection.deliver": "room_operator",
  "room_operator.local_purge.receipt": "room_operator",
});

async function runSyntheticWalkingFlow(graph, replayInput = null, progress = null) {
  if (replayInput !== null) {
    const replayInvoke = () => graph.application.run(replayInput);
    const replay = progress?.journalEffect === null || progress?.journalEffect === undefined
      ? await replayInvoke() : await progress.journalEffect("domain:invoke", "room_operator.pull", replayInvoke);
    if (replay.status !== 200 || replay.recovered !== true
      || replay.body?.interaction?.interactionType !== "ask"
      || typeof replay.body?.requestBody !== "string") {
      fail("local_postgres_restart_replay_failed");
    }
    return Object.freeze({ replayInput, replayBodyHash: graph.canonicalSha256(replay.body) });
  }
  const actorScopeDigest = graph.canonicalSha256("local postgres synthetic actor scope");
  let serial = 0;
  async function call(action, overrides = Object.freeze({})) {
    serial += 1;
    const stableOverrides = ownedPlain(overrides);
    const mutating = !["third_place.list", "projection.read", "interaction.read", "room_operator.status"].includes(action);
    const base = {
      schemaVersion: "r4_public_core_operation_input.v1",
      action,
      actorClass: SYNTHETIC_ACTOR_CLASS[action],
      actorScopeDigest,
      params: Object.freeze({}),
      body: Object.freeze({}),
      authorizationSecret: null,
      idempotencyKey: mutating ? `idem_${serial.toString(36).padStart(32, "0")}` : null,
      expectedVersion: null,
      ...stableOverrides,
    };
    const trusted = Object.freeze({
      schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
      coarseRateBucket: action === "public_encounter.issue" ? `bucket_${"b".repeat(32)}` : null,
    });
    const invoke = () => graph.application.run(Object.freeze(base), trusted);
    const response = progress?.journalEffect === null || progress?.journalEffect === undefined
      ? await invoke() : await progress.journalEffect("domain:invoke", action, invoke);
    if (!Number.isSafeInteger(response?.status) || response.status < 200 || response.status > 299) {
      fail("local_postgres_action_failed");
    }
    if (progress !== null) {
      progress.completedActions.add(action);
      progress.actionCount = progress.completedActions.size;
    }
    return response;
  }
  const entityId = "entity_forme_public_core_v1";
  const created = await call("room.create", { body: { entityId, roomKind: "third_place_public", label: "Forme Local PostgreSQL Room" } });
  if (created.body.roomId !== graph.roomId || created.body.roomMode !== "closed") fail("local_postgres_room_bootstrap_invalid");
  const pair = await call("room.pair", { params: { roomId: graph.roomId }, expectedVersion: 1 });
  const exchanged = await call("room.pair.exchange", {
    params: { pairingId: pair.body.pairingId },
    body: { pairingCode: pair.body.pairingCode, clientPublicKey: "synthetic-local-postgres-client-public-key" },
    expectedVersion: 1,
  });
  const bindingSecret = graph.identity.takeSecret("binding_secret");
  const projection = createProjectionCapsule(graph.canonicalSha256, graph.roomId, entityId, graph.observedAt);
  const delivered = await call("room_operator.projection.deliver", {
    actorClass: "room_operator",
    authorizationSecret: bindingSecret,
    body: {
      projection,
      publicationApprovalHash: graph.canonicalSha256("local approval"),
      publicationAttestationHash: graph.canonicalSha256("local attestation"),
    },
    expectedVersion: 1,
  });
  const admitted = await call("curation.admit", {
    actorClass: "curator", params: { projectionId: projection.projectionId }, expectedVersion: delivered.body.targetVersion,
  });
  const beforeOpen = await call("room_operator.status", {
    actorClass: "room_operator", authorizationSecret: bindingSecret, body: { roomId: graph.roomId },
  });
  const bindingVersion = beforeOpen.body.bindingVersion;
  await call("room.mode.set", {
    params: { roomId: graph.roomId }, body: { interactionMode: "public_single" }, expectedVersion: beforeOpen.body.roomVersion,
  });
  await call("third_place.list");
  await call("projection.read", { params: { projectionId: projection.projectionId } });
  const encounterSecret = `encounter_secret_${"e".repeat(32)}`;
  await call("public_encounter.issue", {
    params: { projectionId: projection.projectionId }, body: { encounterSecret }, expectedVersion: admitted.body.targetVersion,
  });
  const replySecret = `reply_secret_${"r".repeat(32)}`;
  const deleteSecret = `delete_secret_${"d".repeat(32)}`;
  const interaction = await call("interaction.create", {
    actorClass: "guest_capability",
    authorizationSecret: encounterSecret,
    body: {
      projectionId: projection.projectionId,
      interactionType: "ask",
      consent: "manual_owner_only",
      requestBody: "Synthetic local PostgreSQL request body.",
      guestCapsule: null,
      replySecret,
      deleteSecret,
    },
  });
  await call("interaction.read", {
    actorClass: "guest_capability", authorizationSecret: replySecret, params: { interactionId: interaction.body.targetId },
  });
  const sync = await call("room_operator.sync", {
    actorClass: "room_operator", authorizationSecret: bindingSecret, body: { roomId: graph.roomId, afterSequence: 0 },
  });
  const pullKey = `idem_${(++serial).toString(36).padStart(32, "0")}`;
  const pullInput = Object.freeze({
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.pull",
    actorClass: "room_operator",
    actorScopeDigest,
    params: Object.freeze({ interactionId: interaction.body.targetId }),
    body: Object.freeze({}),
    authorizationSecret: bindingSecret,
    idempotencyKey: pullKey,
    expectedVersion: 1,
  });
  const pullInvoke = () => graph.application.run(pullInput);
  const pulled = progress?.journalEffect === null || progress?.journalEffect === undefined
    ? await pullInvoke() : await progress.journalEffect("domain:invoke", "room_operator.pull", pullInvoke);
  if (pulled.status !== 200 || pulled.body.interaction?.interactionType !== "ask") fail("local_postgres_pull_invalid");
  if (progress !== null) {
    progress.completedActions.add("room_operator.pull");
    progress.actionCount = progress.completedActions.size;
  }
  const firstEvent = sync.body.events?.[0];
  if (!firstEvent) fail("local_postgres_sync_invalid");
  await call("room_operator.ack", {
    actorClass: "room_operator",
    authorizationSecret: bindingSecret,
    body: { roomId: graph.roomId, eventId: firstEvent.eventId, sequence: firstEvent.sequence, eventHash: firstEvent.eventHash },
  });
  return Object.freeze({
    replayInput: pullInput,
    roomId: graph.roomId,
    projectionId: projection.projectionId,
    interactionId: interaction.body.targetId,
    pullBodyHash: graph.canonicalSha256(pulled.body),
    actorScopeDigest,
    bindingSecret,
    bindingId: exchanged.body.bindingId,
    bindingVersion,
    deleteSecret,
    admittedProjectionVersion: admitted.body.targetVersion,
  });
}

async function runSyntheticClosureFlow(graph, flow, progress) {
  let serial = 0;
  async function call(action, overrides) {
    serial += 1;
    const base = Object.freeze({
      schemaVersion: "r4_public_core_operation_input.v1",
      action,
      actorClass: SYNTHETIC_ACTOR_CLASS[action],
      actorScopeDigest: flow.actorScopeDigest,
      params: Object.freeze({}),
      body: Object.freeze({}),
      authorizationSecret: null,
      idempotencyKey: `idem_closure_${serial.toString(36).padStart(24, "0")}`,
      expectedVersion: null,
      ...ownedPlain(overrides),
    });
    const invoke = () => graph.application.run(base);
    const response = progress.journalEffect === null || progress.journalEffect === undefined
      ? await invoke() : await progress.journalEffect("domain:invoke", action, invoke);
    if (!Number.isSafeInteger(response?.status) || response.status < 200 || response.status > 299) {
      fail("local_postgres_action_failed");
    }
    progress.completedActions.add(action);
    progress.actionCount = progress.completedActions.size;
    return response;
  }
  await call("room_operator.local_purge.receipt", {
    actorClass: "room_operator", authorizationSecret: flow.bindingSecret,
    params: { interactionId: flow.interactionId }, body: { localBytesAbsent: true }, expectedVersion: 2,
  });
  await call("interaction.delete", {
    actorClass: "guest_capability", authorizationSecret: flow.deleteSecret,
    params: { interactionId: flow.interactionId }, expectedVersion: 3,
  });
  const statusInput = Object.freeze({
    schemaVersion: "r4_public_core_operation_input.v1",
    action: "room_operator.status",
    actorClass: "room_operator",
    actorScopeDigest: flow.actorScopeDigest,
    params: Object.freeze({}),
    body: Object.freeze({ roomId: flow.roomId }),
    authorizationSecret: flow.bindingSecret,
    idempotencyKey: null,
    expectedVersion: null,
  });
  const statusInvoke = () => graph.application.run(statusInput);
  const status = progress.journalEffect === null || progress.journalEffect === undefined
    ? await statusInvoke() : await progress.journalEffect("domain:invoke", "room_operator.status", statusInvoke);
  if (!Number.isSafeInteger(status?.status) || status.status < 200 || status.status > 299) {
    fail("local_postgres_action_failed");
  }
  progress.completedActions.add("room_operator.status");
  progress.actionCount = progress.completedActions.size;
  await call("room.mode.set", {
    params: { roomId: flow.roomId }, body: { interactionMode: "closed" }, expectedVersion: status.body.roomVersion,
  });
  const unlisted = await call("curation.unlist", {
    actorClass: "curator", params: { projectionId: flow.projectionId }, expectedVersion: flow.admittedProjectionVersion,
  });
  await call("projection.revoke", {
    params: { projectionId: flow.projectionId }, expectedVersion: unlisted.body.targetVersion,
  });
  await call("room.binding.revoke", {
    params: { bindingId: flow.bindingId }, expectedVersion: flow.bindingVersion,
  });
}

function readJournalState(privateRoot, boundary = null) {
  try {
    const directoryPath = journalDirectory(privateRoot, false);
    if (directoryPath === null) {
      if (boundary !== null
        && (boundary.entryCount !== 0 || boundary.headSha256 !== JOURNAL_GENESIS)) fail("local_postgres_journal_invalid");
      return { sequence: 0, lastSha256: JOURNAL_GENESIS, consumedGrantSha256: null, dockerLifecycleCount: 0,
        constructionLifecycleCount: 0, cleanupRecoveryLifecycleCount: 0,
        cleanupProven: false, totalBytes: 0, effectLedger: emptyEffectLedger(), observations: emptyObservationState(), lastObservedAt: null };
    }
    const names = fs.readdirSync(directoryPath).sort(binaryCompare);
    const finalPattern = /^entry-([0-9]{6})\.json$/u;
    const pendingPattern = /^entry-([0-9]{6})\.pending-[0-9a-f]{32}\.json$/u;
    const finals = [];
    let removedPending = false;
    for (const name of names) {
      const candidate = path.join(directoryPath, name);
      if (pendingPattern.test(name)) {
        removePrivateFile(candidate);
        removedPending = true;
      } else if (finalPattern.test(name)) finals.push(name);
      else fail("local_postgres_journal_invalid");
    }
    if (removedPending) fsyncPrivateDirectory(directoryPath);
    if (finals.length > JOURNAL_MAXIMUM_ENTRIES) fail("local_postgres_journal_invalid");
    let selectedFinals = finals;
    if (boundary !== null) {
      const stableBoundary = ownedPlain(boundary);
      exactKeys(stableBoundary, ["entryCount", "headSha256"]);
      if (!Number.isSafeInteger(stableBoundary.entryCount) || stableBoundary.entryCount < 0
        || stableBoundary.entryCount > finals.length || !SHA256.test(stableBoundary.headSha256)) {
        fail("local_postgres_journal_invalid");
      }
      selectedFinals = finals.slice(0, stableBoundary.entryCount);
    }
    let previousSha256 = JOURNAL_GENESIS;
    let sequence = 0;
    let dockerLifecycleCount = 0;
    let constructionLifecycleCount = 0;
    let cleanupRecoveryLifecycleCount = 0;
    let cleanupProven = false;
    let consumedGrantSha256 = null;
    let totalBytes = 0;
    let lastObservedAt = null;
    const effectLedger = emptyEffectLedger();
    const observations = emptyObservationState();
    for (const name of selectedFinals) {
      const match = finalPattern.exec(name);
      if (match === null || Number(match[1]) !== sequence + 1) fail("local_postgres_journal_invalid");
      const entryPath = path.join(directoryPath, name);
      const stat = fs.lstatSync(entryPath, { bigint: true });
      if (stat.size < 1n || stat.size > 65_536n) fail("local_postgres_journal_invalid");
      totalBytes += Number(stat.size);
      if (totalBytes > JOURNAL_TOTAL_MAXIMUM_BYTES) fail("local_postgres_journal_invalid");
      const entry = ownedPlain(readPrivateJson(entryPath));
      exactKeys(entry, ["schemaVersion", "sequence", "previousSha256", "event", "detail", "entrySha256"]);
      if (entry.schemaVersion !== "r4.public-core-local-postgres-journal-entry.v3"
        || entry.sequence !== sequence + 1 || entry.previousSha256 !== previousSha256
        || typeof entry.event !== "string" || !JOURNAL_EVENTS.has(entry.event) || cleanupProven) {
        fail("local_postgres_journal_invalid");
      }
      validateJournalDetail(entry.event, entry.detail);
      if (entry.event === "effect.attempt" || entry.event === "effect.completed" || entry.event === "observation.recorded") {
        const current = instant(entry.detail.observedAt);
        if (entry.detail.phase === "NON_CLEANUP") {
          if (lastObservedAt !== null && current < instant(lastObservedAt)) fail("local_postgres_journal_invalid");
          lastObservedAt = entry.detail.observedAt;
        }
      }
      const preimage = Object.freeze({
        schemaVersion: entry.schemaVersion,
        sequence: entry.sequence,
        previousSha256: entry.previousSha256,
        event: entry.event,
        detail: entry.detail,
      });
      const expected = sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8"));
      if (entry.entrySha256 !== expected) fail("local_postgres_journal_invalid");
      if (entry.event === "docker.lifecycle_started") {
        dockerLifecycleCount += 1;
        if (entry.detail.mode === "construction") constructionLifecycleCount += 1;
        else cleanupRecoveryLifecycleCount += 1;
        if (entry.detail.ordinal !== dockerLifecycleCount || dockerLifecycleCount > 3
          || constructionLifecycleCount > 1 || cleanupRecoveryLifecycleCount > 2
          || (dockerLifecycleCount > 1 && entry.detail.mode !== "cleanup_recovery")) {
          fail("local_postgres_journal_invalid");
        }
      }
      if (entry.event === "grant.consumed") {
        if (sequence !== 0 || consumedGrantSha256 !== null) fail("local_postgres_journal_invalid");
        consumedGrantSha256 = entry.detail.consumedGrantSha256;
      } else if (entry.event === "effect.attempt") {
        if (effectLedger.openEffects.has(entry.detail.effectId)) fail("local_postgres_journal_invalid");
        effectLedger.openEffects.set(entry.detail.effectId, entry.detail);
        incrementLedger(effectLedger, "attempt", entry.detail);
        validateLedgerCeilings(effectLedger);
      } else if (entry.event === "effect.completed") {
        const attempt = effectLedger.openEffects.get(entry.detail.effectId);
        if (attempt === undefined || attempt.kind !== entry.detail.kind || attempt.target !== entry.detail.target
          || attempt.phase !== entry.detail.phase
          || (entry.detail.phase === "NON_CLEANUP"
            && instant(entry.detail.observedAt) < instant(attempt.observedAt))) fail("local_postgres_journal_invalid");
        effectLedger.openEffects.delete(entry.detail.effectId);
        incrementLedger(effectLedger, "completed", entry.detail);
      } else if (entry.event === "observation.recorded") {
        assertObservationJournalOrder(entry.detail.kind, entry.detail.value, effectLedger);
        if (entry.detail.kind === "catalog" && entry.detail.value.catalogOutcome === "MATCHED"
          && observations.postgresServerVersionNum !== 160010) fail("local_postgres_journal_invalid");
        foldObservation(observations, entry.detail);
      }
      if (entry.event === "cleanup.proven" || entry.event === "cleanup.recovered") cleanupProven = true;
      sequence = entry.sequence;
      previousSha256 = expected;
    }
    if (sequence > 0 && consumedGrantSha256 === null) fail("local_postgres_journal_invalid");
    if (boundary !== null && (sequence !== boundary.entryCount || previousSha256 !== boundary.headSha256)) {
      fail("local_postgres_journal_invalid");
    }
    validateLedgerCeilings(effectLedger);
    return { sequence, lastSha256: previousSha256, consumedGrantSha256, dockerLifecycleCount, constructionLifecycleCount,
      cleanupRecoveryLifecycleCount, cleanupProven, totalBytes, effectLedger, observations, lastObservedAt };
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_journal_invalid");
  }
}

function ensureIsolatedDockerHome(privateRoot) {
  const isolatedHome = privatePath(privateRoot, "docker-home");
  const dockerConfig = privatePath(privateRoot, "docker-config");
  if (!fs.existsSync(isolatedHome) && !fs.existsSync(dockerConfig)) return prepareIsolatedDockerHome(privateRoot);
  try {
    assertPrivateDirectory(isolatedHome);
    assertPrivateDirectory(dockerConfig);
    const config = ownedPlain(readPrivateJson(path.join(dockerConfig, "config.json")));
    exactKeys(config, ["auths"]);
    if (config.auths === null || typeof config.auths !== "object"
      || Object.keys(config.auths).length !== 0) fail("local_postgres_docker_home_invalid");
    return Object.freeze({ isolatedHome, dockerConfig });
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_docker_home_invalid");
  }
}

function cleanupOwnedDocker(docker, plan, journalState, privateRoot) {
  let failed = false;
  function attempt(operation) {
    try { return operation(); } catch { failed = true; return null; }
  }
  const container = attempt(() => inspectOwnedResource(docker, plan, "container.inspect"));
  if (container !== null) {
    if (container.State?.Running === true) {
      const stopped = attempt(() => docker.call("container.stop", planStep(plan, "container.stop").argv));
      if (stopped !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "container.stopped"));
    }
    const removed = attempt(() => docker.call("container.rm", planStep(plan, "container.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "container.removed"));
  }
  const network = attempt(() => inspectOwnedResource(docker, plan, "network.inspect"));
  if (network !== null) {
    const removed = attempt(() => docker.call("network.rm", planStep(plan, "network.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "network.removed"));
  }
  const volume = attempt(() => inspectOwnedResource(docker, plan, "volume.inspect"));
  if (volume !== null) {
    const removed = attempt(() => docker.call("volume.rm", planStep(plan, "volume.rm").argv));
    if (removed !== null) attempt(() => appendPrivateJournal(privateRoot, journalState, "volume.removed"));
  }
  for (const kind of ["container.inspect", "network.inspect", "volume.inspect"]) {
    const observed = attempt(() => inspectOwnedResource(docker, plan, kind));
    if (observed !== null) failed = true;
  }
  if (failed) fail("local_postgres_cleanup_unproven");
}

function completeOwnedCleanup(docker, plan, journalState, privateRoot, recovered) {
  let failed = false;
  try { cleanupOwnedDocker(docker, plan, journalState, privateRoot); } catch { failed = true; }
  try { removePrivateFile(privatePath(privateRoot, "postgres-password")); } catch { failed = true; }
  try { cleanupIsolatedDockerHome(privateRoot); } catch { failed = true; }
  try { removeOwnedPrivateTree(privatePath(privateRoot, "pg-runtime")); } catch { failed = true; }
  if (!failed) {
    try {
      recordObservation(privateRoot, journalState, "cleanup.residue", Object.freeze({
        ownedContainerCount: 0, ownedNetworkCount: 0, ownedVolumeCount: 0,
        ownedCredentialCount: 0, ownedDockerConfigCount: 0, ownedImportedRuntimeCount: 0,
        activeCoordinatorResidueCount: 0,
      }));
      appendPrivateJournal(privateRoot, journalState, recovered ? "cleanup.recovered" : "cleanup.proven", { residueCount: 0 });
    } catch {
      failed = true;
    }
  }
  if (failed) fail("local_postgres_cleanup_unproven");
}

function consumedGrantForCleanup(privateRoot, verifyBindings = verifyLocalPostgresCommittedBindings, expectedLinks = 1n) {
  const consumedPath = privatePath(privateRoot, "grant.consumed.json");
  if (expectedLinks !== 1n && expectedLinks !== 2n) fail("local_postgres_grant_state_invalid");
  const record = readPrivateJsonRecord(consumedPath, expectedLinks);
  const raw = ownedPlain(record.value);
  const createdAt = instant(raw.createdAt);
  const grant = validateLocalPostgresGrant(raw, new Date(createdAt + 1));
  verifyBindings(grant, new Date(createdAt + 1));
  const approvalReceiptSha256 = readOwnerApprovalReceipt(
    privateRoot,
    privatePath(privateRoot, "owner-approval-receipt"),
    false,
  );
  if (approvalReceiptSha256 !== grant.ownerApprovalReceiptSha256) {
    fail("local_postgres_owner_approval_receipt_drift");
  }
  return Object.freeze({ grant, consumedGrantSha256: record.sha256 });
}

function repairMissingConsumedJournalAnchor(privateRoot, activeLease, verifyBindings, checkpoint = () => {}) {
  if (activeLease === null || typeof activeLease !== "object"
    || typeof activeLease.leasePath !== "string" || path.dirname(activeLease.leasePath) !== privateRoot
    || activeLease.owner === null || typeof activeLease.owner !== "object") {
    fail("local_postgres_coordinator_lock_invalid");
  }
  const journalPath = privatePath(privateRoot, JOURNAL_DIRECTORY);
  let journalNames = null;
  if (coordinatorDirectoryExists(journalPath)) {
    try {
      assertPrivateDirectory(journalPath);
      journalNames = fs.readdirSync(journalPath).sort(binaryCompare);
    } catch {
      fail("local_postgres_journal_invalid");
    }
    if (journalNames.some((name) => /^entry-[0-9]{6}\.json$/u.test(name))) return null;
    if (journalNames.length > 1
      || (journalNames.length === 1 && !/^entry-000001\.pending-[0-9a-f]{32}\.json$/u.test(journalNames[0]))) {
      fail("local_postgres_journal_invalid");
    }
  }

  const rootNames = fs.readdirSync(privateRoot).sort(binaryCompare);
  const leases = rootNames.filter((name) => COORDINATOR_LEASE.test(name));
  const allowed = new Set(["grant.consumed.json", "owner-approval-receipt", ...leases]);
  if (journalNames !== null) allowed.add(JOURNAL_DIRECTORY);
  const pendingPath = privatePath(privateRoot, "grant.pending.json");
  const pendingPresent = rootNames.includes("grant.pending.json");
  if (pendingPresent) allowed.add("grant.pending.json");
  if (leases.length !== 1 || rootNames.length !== allowed.size
    || rootNames.some((name) => !allowed.has(name))) fail("local_postgres_grant_state_invalid");
  const leaseMatch = COORDINATOR_LEASE.exec(leases[0]);
  const lease = leaseMatch === null ? null : inspectCoordinatorLeaseFile(privatePath(privateRoot, leases[0]));
  if (lease === null || lease.ownerNonce !== leaseMatch[1]
    || activeLease.leasePath !== privatePath(privateRoot, leases[0])
    || canonicalJson(lease) !== canonicalJson(activeLease.owner)) fail("local_postgres_coordinator_lock_invalid");

  let expectedConsumedLinks = 1n;
  if (pendingPresent) {
    const pendingStat = fs.lstatSync(pendingPath, { bigint: true });
    const consumedStat = fs.lstatSync(privatePath(privateRoot, "grant.consumed.json"), { bigint: true });
    if (!pendingStat.isFile() || !consumedStat.isFile() || pendingStat.isSymbolicLink() || consumedStat.isSymbolicLink()
      || pendingStat.dev !== consumedStat.dev || pendingStat.ino !== consumedStat.ino
      || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) fail("local_postgres_grant_state_invalid");
    expectedConsumedLinks = 2n;
  }
  const recovered = consumedGrantForCleanup(privateRoot, verifyBindings, expectedConsumedLinks);
  let pendingJournalInstall = null;
  if (journalNames !== null && journalNames.length === 1) {
    const journalPendingPath = path.join(journalPath, journalNames[0]);
    const expectedPreimage = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-journal-entry.v3",
      sequence: 1,
      previousSha256: JOURNAL_GENESIS,
      event: "grant.consumed",
      detail: Object.freeze({ consumedGrantSha256: recovered.consumedGrantSha256 }),
    });
    const expectedEntry = Object.freeze({
      ...expectedPreimage,
      entrySha256: sha256Bytes(Buffer.from(canonicalJson(expectedPreimage), "utf8")),
    });
    if (canonicalJson(readPrivateJson(journalPendingPath)) !== canonicalJson(expectedEntry)) {
      fail("local_postgres_journal_invalid");
    }
    const finalPath = path.join(journalPath, "entry-000001.json");
    exactFileAbsence(finalPath);
    pendingJournalInstall = Object.freeze({ pendingPath: journalPendingPath, finalPath });
  }
  if (pendingPresent) {
    try {
      fs.unlinkSync(pendingPath);
      fsyncPrivateDirectory(privateRoot);
      exactFileAbsence(pendingPath);
      if (fs.lstatSync(privatePath(privateRoot, "grant.consumed.json"), { bigint: true }).nlink !== 1n) {
        fail("local_postgres_grant_state_invalid");
      }
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
      fail("local_postgres_grant_state_invalid");
    }
  }
  let state;
  if (pendingJournalInstall !== null) {
    try {
      fs.renameSync(pendingJournalInstall.pendingPath, pendingJournalInstall.finalPath);
      fsyncPrivateDirectory(journalPath);
    } catch {
      fail("local_postgres_journal_invalid");
    }
    state = readJournalState(privateRoot);
  } else {
    state = readJournalState(privateRoot);
    state.checkpoint = checkpoint;
    state.grant = recovered.grant;
    if (state.sequence !== 0 || state.consumedGrantSha256 !== null || state.dockerLifecycleCount !== 0
      || state.constructionLifecycleCount !== 0 || state.cleanupRecoveryLifecycleCount !== 0
      || state.cleanupProven || state.effectLedger.openEffects.size !== 0
      || Object.keys(state.effectLedger.attempts).length !== 0 || Object.keys(state.effectLedger.completions).length !== 0
      || canonicalJson(state.observations) !== canonicalJson(emptyObservationState())) {
      fail("local_postgres_journal_invalid");
    }
    appendPrivateJournal(privateRoot, state, "grant.consumed", {
      consumedGrantSha256: recovered.consumedGrantSha256,
    });
  }
  const anchored = readJournalState(privateRoot);
  if (anchored.sequence !== 1 || anchored.consumedGrantSha256 !== recovered.consumedGrantSha256
    || anchored.dockerLifecycleCount !== 0 || anchored.cleanupProven
    || anchored.effectLedger.openEffects.size !== 0
    || Object.keys(anchored.effectLedger.attempts).length !== 0
    || Object.keys(anchored.effectLedger.completions).length !== 0
    || canonicalJson(anchored.observations) !== canonicalJson(emptyObservationState())) {
    fail("local_postgres_journal_invalid");
  }
  return Object.freeze({ ...recovered, journalState: anchored });
}

function exactPhysicalEvidencePath(privateRoot, evidenceOut) {
  if (typeof evidenceOut !== "string" || !path.isAbsolute(evidenceOut)
    || path.basename(evidenceOut) !== "physical-evidence.json") {
    fail("local_postgres_evidence_path_invalid");
  }
  let parent;
  try { parent = fs.realpathSync(path.dirname(evidenceOut)); } catch { fail("local_postgres_evidence_path_invalid"); }
  if (parent !== privateRoot) fail("local_postgres_evidence_path_invalid");
  return path.join(privateRoot, "physical-evidence.json");
}

function preparePhysicalEvidenceWrite(evidencePath, cleanupOnly) {
  try {
    fs.lstatSync(evidencePath);
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") {
      return Object.freeze({ priorEvidenceSha256: null, priorConsumedGrantSha256: null, exclusive: true });
    }
    fail("local_postgres_evidence_path_invalid");
  }
  if (!cleanupOnly) fail("local_postgres_evidence_path_invalid");
  const privateRoot = path.dirname(evidencePath);
  const priorRecord = readPrivateJsonRecord(evidencePath);
  const prior = validateHistoricalReceiptAgainstPrivateState(privateRoot, priorRecord);
  if (prior.status !== "FAILED" || prior.cleanupStatus !== "BLOCKED") {
    fail("local_postgres_evidence_path_invalid");
  }
  return Object.freeze({
    priorEvidenceSha256: priorRecord.sha256,
    priorConsumedGrantSha256: prior.consumedGrantSha256,
    exclusive: false,
  });
}

export const LOCAL_POSTGRES_PHYSICAL_LIFECYCLE_STAGES = Object.freeze([
  "docker.verify", "resources.absence", "image.ensure", "network.create", "volume.create",
  "container.create", "container.start", "primary.open", "primary.schema", "primary.walk",
  "primary.close", "container.restart", "replay.open", "replay.run", "replay.close",
  "rollback_database.create", "rollback.open", "rollback.run", "rollback.close",
]);

async function executePhysicalLifecycle(ports, progress) {
  await ports.verifyDocker();
  await ports.proveResourceAbsence();
  const image = await ports.ensurePinnedImage();
  progress.imagePulled = image.pulled;
  progress.imagePresent = image.present;
  await ports.createNetwork();
  await ports.createVolume();
  await ports.createContainer();
  await ports.startContainer();

  let flow;
  try {
    await ports.openPrimary();
    progress.databaseIdentityCount = 1;
    progress.catalog = await ports.applyPrimarySchema();
    flow = await ports.runWalkingFlow(progress);
  } finally {
    await ports.closePrimary();
  }

  await ports.restartContainer();
  progress.restartCount = 1;
  try {
    await ports.openReplay();
    await ports.runReplayAndClosure(flow, progress);
  } finally {
    await ports.closeReplay();
  }

  await ports.createRollbackDatabase();
  progress.databaseIdentityCount = 2;
  try {
    await ports.openRollback();
    await ports.runRollbackRehearsal();
  } finally {
    await ports.closeRollback();
  }
  return Object.freeze({
    imagePulled: progress.imagePulled,
    catalog: progress.catalog,
    actionCount: progress.actionCount,
    databaseIdentityCount: progress.databaseIdentityCount,
    restartCount: progress.restartCount,
  });
}

function createRealPhysicalLifecyclePorts(context, injectedDependencies = null) {
  const { grant, docker, plan, journalState, privateRoot, password, progress, pgRuntimeRoot } = context;
  const dependencies = injectedDependencies ?? Object.freeze({
    loadPgDriver,
    waitForPostgres,
    readSqlArtifact,
    createRunPool,
    createConnectionGate: createOneShotLoopbackStreamGate,
    closeRunPool,
    applyAndVerifySql,
    applySchemaSql,
    verifySchemaSql,
    observeCatalog,
    provePrimaryDatabaseIdentity,
    async provePoolConnection(pool) {
      const client = await withLocalDeadline(() => pool.connect(), 1_000, "local_postgres_connection_failed");
      await client.release();
    },
    createApplicationGraph,
    closeApplicationGraph,
    runSyntheticWalkingFlow,
    runSyntheticClosureFlow,
    createRollbackDatabase,
    proveSeedOnly,
    executeRunSql,
    proveNamespaceAbsent,
    observePostgresServerVersion: async (candidate) => {
      const version = await queryRunPool(candidate, "SHOW server_version_num");
      return version.rows?.[0]?.server_version_num;
    },
  });
  let driver = null;
  let primaryConnection = null;
  let rollbackConnection = null;
  let sql = null;
  let pool = null;
  let graph = null;
  let flow = null;
  let imagePulled = false;
  let primaryDatabaseReservation = null;
  const resources = {
    activePools: new Set(), activeClients: new Set(), activeTransactions: new Set(),
    clientPools: new Map(),
    maximumPools: 0, maximumClients: 0, maximumTransactions: 0,
  };

  function recordResourceMaxima() {
    const value = Object.freeze({
      pools: resources.maximumPools, clients: resources.maximumClients,
      transactions: resources.maximumTransactions,
    });
    const observed = readJournalState(privateRoot).observations.concurrency;
    if (canonicalJson(value) !== canonicalJson(observed)) {
      recordObservation(privateRoot, journalState, "concurrency.maxima", value);
    }
  }

  function poolOpened(candidate) {
    if (resources.activePools.has(candidate) || resources.activePools.size >= grant.ceilings.maximumConcurrentPools) {
      fail("local_postgres_pool_configuration_invalid");
    }
    resources.activePools.add(candidate);
    resources.maximumPools = Math.max(resources.maximumPools, resources.activePools.size);
    recordResourceMaxima();
  }

  function poolClosed(candidate) {
    if (!resources.activePools.delete(candidate)) fail("local_postgres_pool_close_failed");
  }

  function clientOpened(candidate, ownerPool = null) {
    if (resources.activeClients.has(candidate) || resources.activeClients.size >= grant.ceilings.maximumConcurrentClients) {
      fail("local_postgres_connection_failed");
    }
    resources.activeClients.add(candidate);
    if (ownerPool !== null) resources.clientPools.set(candidate, ownerPool);
    resources.maximumClients = Math.max(resources.maximumClients, resources.activeClients.size);
    recordResourceMaxima();
  }

  function clientClosed(candidate) {
    if (!resources.activeClients.delete(candidate)) fail("local_postgres_connection_failed");
    resources.clientPools.delete(candidate);
  }

  function transactionOpened(identity) {
    if (resources.activeTransactions.has(identity)
      || resources.activeTransactions.size >= grant.ceilings.maximumConcurrentTransactions) {
      fail("local_postgres_sql_execution_failed");
    }
    resources.activeTransactions.add(identity);
    resources.maximumTransactions = Math.max(resources.maximumTransactions, resources.activeTransactions.size);
    recordResourceMaxima();
  }

  function transactionClosed(identity) {
    if (!resources.activeTransactions.delete(identity)) fail("local_postgres_sql_execution_failed");
  }

  function transactionQueryKind(text) {
    if (typeof text !== "string") return null;
    const pinnedBatch = sql !== null && (text === sql.schema || text === sql.verify || text === sql.rollback);
    if (pinnedBatch) return "batch";
    const trimmed = text.trim();
    if (/^BEGIN(?:\s|;|$)/u.test(trimmed)) return "begin";
    if (/^COMMIT\s*;?$/u.test(trimmed)) return "commit";
    if (/^ROLLBACK\s*;?$/u.test(trimmed)) return "rollback";
    return null;
  }

  function instrumentClient(rawClient, ownerPool) {
    if (rawClient === null || typeof rawClient !== "object"
      || typeof rawClient.query !== "function" || typeof rawClient.release !== "function") {
      fail("local_postgres_connection_failed");
    }
    clientOpened(rawClient, ownerPool);
    let released = false;
    return Object.freeze({
      async query(text, values) {
        const transactionKind = transactionQueryKind(text);
        if (transactionKind === "batch" || transactionKind === "begin") transactionOpened(rawClient);
        let result;
        try {
          result = values === undefined ? await rawClient.query(text) : await rawClient.query(text, values);
        } catch (error) {
          throw error;
        }
        if (transactionKind === "batch" || transactionKind === "commit" || transactionKind === "rollback") {
          transactionClosed(rawClient);
        }
        return result;
      },
      release(discard = undefined) {
        if (released) fail("local_postgres_connection_failed");
        released = true;
        const activeTransaction = resources.activeTransactions.has(rawClient);
        const discardRequested = discard !== undefined && discard !== false && discard !== null;
        const discardReason = discard instanceof Error
          ? discard
          : (discardRequested || activeTransaction ? new Error("local_postgres_client_discard") : undefined);
        const finalize = (value) => {
          if (activeTransaction) transactionClosed(rawClient);
          clientClosed(rawClient);
          return value;
        };
        const result = rawClient.release(discardReason);
        if (result !== null && typeof result === "object" && typeof result.then === "function") {
          return result.then(finalize);
        }
        return finalize(result);
      },
    });
  }

  function instrumentPool(rawPool) {
    if (rawPool === null || typeof rawPool !== "object" || typeof rawPool.connect !== "function"
      || typeof rawPool.end !== "function" || !resources.activePools.has(rawPool)) {
      fail("local_postgres_pool_configuration_invalid");
    }
    return Object.freeze({
      async connect() {
        const rawClient = await rawPool.connect();
        try { return instrumentClient(rawClient, rawPool); }
        catch (error) {
          try {
            const released = rawClient.release?.(error instanceof Error ? error : new Error("local_postgres_client_discard"));
            if (released !== null && typeof released === "object" && typeof released.then === "function") await released;
            if (resources.activeClients.has(rawClient)) clientClosed(rawClient);
          } catch { /* the tracked acquired client remains visible to closeOutstanding */ }
          throw error;
        }
      },
      async query(text, values) {
        const client = await this.connect();
        try { return values === undefined ? await client.query(text) : await client.query(text, values); }
        finally { await client.release(); }
      },
      async end() { return rawPool.end(); },
      get poolId() { return rawPool.poolId; },
      get streamFactory() { return rawPool.streamFactory; },
      rawPool,
    });
  }

  async function closeTrackedPool(rawPool) {
    await dependencies.closeRunPool(rawPool);
    for (const [client, ownerPool] of [...resources.clientPools.entries()]) {
      if (ownerPool !== rawPool) continue;
      if (resources.activeTransactions.has(client)) transactionClosed(client);
      if (resources.activeClients.has(client)) clientClosed(client);
    }
    if (resources.activePools.has(rawPool)) poolClosed(rawPool);
  }

  function effect(kind, target, operation) {
    const reservation = reserveEffect(privateRoot, journalState, kind, target);
    let result;
    try { result = operation(); } catch (error) { throw error; }
    if (result !== null && typeof result === "object" && typeof result.then === "function") {
      return result.then((value) => { completeEffect(privateRoot, journalState, reservation); return value; });
    }
    completeEffect(privateRoot, journalState, reservation);
    return result;
  }

  function connectionTarget(connection) {
    if (connection.database === plan.resources.databasePrimary) return "primary";
    if (connection.database === plan.resources.databaseRollback) return "rollback";
    if (connection.database === "postgres") return "admin";
    fail("local_postgres_pool_configuration_invalid");
  }

  async function countedPool(connection, phase) {
    const target = connectionTarget(connection);
    const gate = dependencies.createConnectionGate(connection.port,
      () => reserveEffect(privateRoot, journalState, "connection:connect", target),
      (reservation) => completeEffect(privateRoot, journalState, reservation));
    let rawCandidate = null;
    try {
      rawCandidate = await effect("pool:construct", phase, () => {
        const created = dependencies.createRunPool(driver, connection, gate.streamFactory);
        rawCandidate = created;
        poolOpened(created);
        return created;
      });
    } catch (error) {
      if (rawCandidate !== null) {
        try { await closeTrackedPool(rawCandidate); } catch { /* retained tracker drives closeOutstanding */ }
      }
      throw error;
    }
    let candidate;
    try { candidate = instrumentPool(rawCandidate); }
    catch (error) {
      try { await closeTrackedPool(rawCandidate); } catch { /* original wins; retained tracker drives closeOutstanding */ }
      throw error;
    }
    try {
      await dependencies.provePoolConnection(candidate);
      gate.complete();
      return candidate;
    } catch (error) {
      try { await closeTrackedPool(rawCandidate); } catch { /* original body-free failure wins; retained tracker drives cleanup */ }
      throw error;
    }
  }

  function readinessAttempt(phase, target) {
    return Object.freeze({
      gate: () => dependencies.createConnectionGate(primaryConnection.port,
        () => reserveEffect(privateRoot, journalState, "connection:connect", target),
        (reservation) => completeEffect(privateRoot, journalState, reservation)),
      construct: (_attempt, operation) => effect("pool:construct", phase, operation),
      poolOpened,
      poolClosed,
      clientOpened,
      clientClosed,
      isPoolOpen: (candidate) => resources.activePools.has(candidate),
      isClientOpen: (candidate) => resources.activeClients.has(candidate),
    });
  }

  async function closeGraphAndPool() {
    let failed = false;
    if (graph !== null) {
      try {
        if (dependencies.closeApplicationGraph(graph)) graph = null;
        else failed = true;
      } catch {
        failed = true;
      }
    }
    if (pool !== null) {
      try {
        await closeTrackedPool(pool.rawPool ?? pool);
        pool = null;
      } catch {
        failed = true;
      }
    }
    if (failed) fail("local_postgres_application_graph_cleanup_failed");
  }

  return Object.freeze({
    async verifyDocker() {
      let version;
      try { version = docker.call("version", planStep(plan, "version").argv); }
      catch (error) {
        recordObservation(privateRoot, journalState, "docker.version", Object.freeze({
          dockerClientVersion: "UNKNOWN", dockerServerVersion: "UNKNOWN", dockerServerPlatform: "UNKNOWN",
        }));
        throw error;
      }
      const observed = observeDockerVersion(version);
      recordObservation(privateRoot, journalState, "docker.version", observed);
      if (observed.dockerClientVersion !== "29.3.1" || observed.dockerServerVersion !== "29.3.1"
        || observed.dockerServerPlatform !== IMAGE_PLATFORM) fail("local_postgres_docker_version_invalid");
      appendPrivateJournal(privateRoot, journalState, "docker.version_verified");
    },
    async proveResourceAbsence() {
      proveOwnedResourceAbsent(docker, plan, "container.inspect");
      proveOwnedResourceAbsent(docker, plan, "network.inspect");
      proveOwnedResourceAbsent(docker, plan, "volume.inspect");
      appendPrivateJournal(privateRoot, journalState, "resources.absence_verified");
    },
    async ensurePinnedImage() {
      let image = docker.call("image.inspect", planStep(plan, "image.inspect").argv, { missingAllowed: true });
      if (!image.found) {
        imagePulled = true;
        progress.imagePullAttempted = true;
        progress.imagePulled = null;
        appendPrivateJournal(privateRoot, journalState, "image.pull_attempted", { referenceSha256: sha256Bytes(Buffer.from(IMAGE_REFERENCE)) });
        recordObservation(privateRoot, journalState, "image.pull", Object.freeze({ attempted: true, outcome: "AMBIGUOUS" }));
        recordObservation(privateRoot, journalState, "image.cache", Object.freeze({
          outcome: "PARTIAL_OR_UNKNOWN", imageReference: "UNKNOWN",
          imagePlatform: "UNKNOWN", imagePlatformManifest: "UNKNOWN",
        }));
        try {
          docker.call("image.pull", planStep(plan, "image.pull").argv);
        } catch (error) {
          if (authenticDockerCallFailureOutcome(error) === "FAILED") {
            recordObservation(privateRoot, journalState, "image.pull", Object.freeze({ attempted: true, outcome: "FAILED" }));
          }
          throw error;
        }
        recordObservation(privateRoot, journalState, "image.pull", Object.freeze({ attempted: true, outcome: "COMPLETED" }));
        appendPrivateJournal(privateRoot, journalState, "image.pulled", { referenceSha256: sha256Bytes(Buffer.from(IMAGE_REFERENCE)) });
        image = docker.call("image.inspect", planStep(plan, "image.inspect").argv, { missingAllowed: true });
      }
      try {
        if (image.found !== true) fail("local_postgres_image_identity_invalid");
        validatePinnedImage(image);
      } catch (error) {
        const bounded = observePinnedImage(image);
        const currentCache = readJournalState(privateRoot).observations.imageCacheOutcome;
        if (currentCache === "NOT_OBSERVED") {
          recordObservation(privateRoot, journalState, "image.cache", Object.freeze({ outcome: "PARTIAL_OR_UNKNOWN", ...bounded }));
        } else if (currentCache === "PARTIAL_OR_UNKNOWN"
          && canonicalJson(bounded) !== canonicalJson({
            imageReference: "UNKNOWN", imagePlatform: "UNKNOWN", imagePlatformManifest: "UNKNOWN",
          })) {
          recordObservation(privateRoot, journalState, "image.cache", Object.freeze({ outcome: "PARTIAL_OR_UNKNOWN", ...bounded }));
        }
        throw error;
      }
      progress.imagePresent = true;
      progress.imagePulled = imagePulled;
      recordObservation(privateRoot, journalState, "image.pull", Object.freeze({
        attempted: imagePulled, outcome: imagePulled ? "COMPLETED" : "NOT_REQUIRED_CACHED",
      }));
      recordObservation(privateRoot, journalState, "image.cache", Object.freeze({
        outcome: "VERIFIED_COMPLETE_PINNED", imageReference: IMAGE_REFERENCE,
        imagePlatform: IMAGE_PLATFORM, imagePlatformManifest: IMAGE_PLATFORM_MANIFEST,
      }));
      appendPrivateJournal(privateRoot, journalState, "image.verified", { platformManifest: IMAGE_PLATFORM_MANIFEST });
      return Object.freeze({ pulled: imagePulled, present: true });
    },
    async createNetwork() {
      docker.call("network.create", planStep(plan, "network.create").argv);
      appendPrivateJournal(privateRoot, journalState, "network.created");
    },
    async createVolume() {
      docker.call("volume.create", planStep(plan, "volume.create").argv);
      appendPrivateJournal(privateRoot, journalState, "volume.created");
    },
    async createContainer() {
      docker.call("container.create", planStep(plan, "container.create").argv);
      appendPrivateJournal(privateRoot, journalState, "container.created");
    },
    async startContainer() {
      if (primaryDatabaseReservation !== null) fail("local_postgres_database_identity_invalid");
      primaryDatabaseReservation = reserveEffect(privateRoot, journalState, "database:create", "primary");
      docker.call("container.start", planStep(plan, "container.start").argv);
      appendPrivateJournal(privateRoot, journalState, "container.started", { lifecycle: 1 });
      const container = inspectOwnedResource(docker, plan, "container.inspect");
      if (container?.State?.Running !== true) fail("local_postgres_container_not_running");
      const port = containerLoopbackPort(container, plan);
      driver = await dependencies.loadPgDriver(pgRuntimeRoot);
      primaryConnection = Object.freeze({ database: plan.resources.databasePrimary, password, port });
      rollbackConnection = Object.freeze({ database: plan.resources.databaseRollback, password, port });
      sql = Object.freeze({
        schema: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.schema, grant.artifacts.schemaSqlSha256),
        verify: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.verify, grant.artifacts.verifySqlSha256),
        rollback: dependencies.readSqlArtifact(LOCAL_POSTGRES_SQL_PATHS.rollback, grant.artifacts.rollbackSqlSha256),
      });
    },
    async openPrimary() {
      progress.initialReadinessAttemptCount = await dependencies.waitForPostgres(
        driver, primaryConnection, readinessAttempt("initial_readiness", "primary"),
      );
      pool = await countedPool(primaryConnection, "operational_primary");
      let versionValue;
      try { versionValue = await dependencies.observePostgresServerVersion(pool); }
      catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_sql_execution_failed") {
          recordObservation(privateRoot, journalState, "postgres.server_version_num", "UNKNOWN");
        }
        throw error;
      }
      const parsedVersion = typeof versionValue === "string" && /^[0-9]+$/u.test(versionValue) ? Number(versionValue) : versionValue;
      if (parsedVersion !== 160010) {
        if (Number.isSafeInteger(parsedVersion) && parsedVersion >= 0) {
          recordObservation(privateRoot, journalState, "postgres.server_version_num", "MISMATCH");
        }
        fail("local_postgres_server_version_mismatch");
      }
      progress.postgresServerVersionNum = parsedVersion;
      recordObservation(privateRoot, journalState, "postgres.server_version_num", parsedVersion);
      progress.databaseIdentityAttemptCount = 1;
      const identity = await dependencies.provePrimaryDatabaseIdentity(pool, plan.resources.databasePrimary);
      if (identity !== true) fail("local_postgres_database_identity_invalid");
      if (primaryDatabaseReservation === null) fail("local_postgres_database_identity_invalid");
      completeEffect(privateRoot, journalState, primaryDatabaseReservation);
      primaryDatabaseReservation = null;
    },
    async applyPrimarySchema() {
      await effect("sql:schema", "primary_initial", () => dependencies.applySchemaSql(pool, sql.schema));
      await effect("sql:verify", "primary_initial", () => dependencies.verifySchemaSql(pool, sql.verify));
      let catalogObservation;
      try { catalogObservation = await dependencies.observeCatalog(pool); }
      catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_sql_execution_failed") {
          recordObservation(privateRoot, journalState, "catalog", Object.freeze({
            catalogOutcome: "UNKNOWN", tables: "UNKNOWN", columns: "UNKNOWN",
            constraints: "UNKNOWN", indexes: "UNKNOWN", catalogContractSha256: "UNKNOWN",
          }));
        }
        throw error;
      }
      recordObservation(privateRoot, journalState, "catalog", catalogObservation);
      if (catalogObservation.catalogOutcome !== "MATCHED") fail("local_postgres_catalog_mismatch");
      const catalog = Object.freeze({
        tables: catalogObservation.tables, columns: catalogObservation.columns,
        constraints: catalogObservation.constraints, indexes: catalogObservation.indexes,
      });
      appendPrivateJournal(privateRoot, journalState, "primary.schema_verified", { catalog });
      return catalog;
    },
    async runWalkingFlow(progress) {
      graph = await dependencies.createApplicationGraph(pool, Date.now());
      flow = await dependencies.runSyntheticWalkingFlow(graph, null, progress);
      appendPrivateJournal(privateRoot, journalState, "primary.walking_flow_green", { actionCount: progress.actionCount });
      return flow;
    },
    closePrimary: closeGraphAndPool,
    async restartContainer() {
      docker.call("container.stop", planStep(plan, "container.stop").argv);
      appendPrivateJournal(privateRoot, journalState, "container.stopped", { lifecycle: 1 });
      progress.restartAttemptCount = 1;
      const restartReservation = reserveEffect(privateRoot, journalState, "container:restart", "primary");
      docker.call("container.start", planStep(plan, "container.start").argv);
      completeEffect(privateRoot, journalState, restartReservation);
      appendPrivateJournal(privateRoot, journalState, "container.started", { lifecycle: 2 });
      progress.restartReadinessAttemptCount = await dependencies.waitForPostgres(
        driver, primaryConnection, readinessAttempt("restart_readiness", "primary"),
      );
    },
    async openReplay() {
      pool = await countedPool(primaryConnection, "operational_replay");
      graph = await dependencies.createApplicationGraph(pool, Date.now());
    },
    async runReplayAndClosure(expectedFlow, progress) {
      if (expectedFlow !== flow) fail("local_postgres_restart_replay_failed");
      const replay = await dependencies.runSyntheticWalkingFlow(graph, flow.replayInput, progress);
      if (replay.replayBodyHash !== flow.pullBodyHash) fail("local_postgres_restart_replay_failed");
      appendPrivateJournal(privateRoot, journalState, "primary.restart_replay_green");
      await dependencies.runSyntheticClosureFlow(graph, flow, progress);
      appendPrivateJournal(privateRoot, journalState, "primary.closure_flow_green", { actionCount: progress.actionCount });
    },
    closeReplay: closeGraphAndPool,
    async createRollbackDatabase() {
      progress.databaseIdentityAttemptCount = 2;
      const adminConnection = Object.freeze({ ...primaryConnection, database: "postgres" });
      const admin = await countedPool(adminConnection, "operational_admin");
      try {
        await effect("database:create", "rollback", () => dependencies.createRollbackDatabase(admin, plan.resources.databaseRollback));
      } finally {
        await closeTrackedPool(admin.rawPool ?? admin);
      }
      appendPrivateJournal(privateRoot, journalState, "rollback_database.created", { identityCount: 2 });
    },
    async openRollback() {
      pool = await countedPool(rollbackConnection, "operational_rollback");
    },
    async runRollbackRehearsal() {
      await effect("sql:schema", "rollback_initial", () => dependencies.applySchemaSql(pool, sql.schema));
      await effect("sql:verify", "rollback_initial", () => dependencies.verifySchemaSql(pool, sql.verify));
      await dependencies.proveSeedOnly(pool);
      await effect("sql:rollback", "rollback", () => dependencies.executeRunSql(pool, sql.rollback));
      await dependencies.proveNamespaceAbsent(pool);
      await effect("sql:schema", "rollback_reapply", () => dependencies.applySchemaSql(pool, sql.schema));
      await effect("sql:verify", "rollback_reapply", () => dependencies.verifySchemaSql(pool, sql.verify));
      await dependencies.proveSeedOnly(pool);
      appendPrivateJournal(privateRoot, journalState, "rollback_database.rehearsal_green");
    },
    closeRollback: closeGraphAndPool,
    async closeOutstanding() {
      let failed = false;
      try { await closeGraphAndPool(); } catch { failed = true; }
      for (const candidate of [...resources.activePools]) {
        try { await closeTrackedPool(candidate); } catch { failed = true; }
      }
      if (resources.activePools.size !== 0 || resources.activeClients.size !== 0
        || resources.activeTransactions.size !== 0 || failed) fail("local_postgres_application_graph_cleanup_failed");
    },
  });
}

async function performNormalPhysicalRun(context) {
  const ports = createRealPhysicalLifecyclePorts(context);
  try {
    return await executePhysicalLifecycle(ports, context.progress);
  } finally {
    await ports.closeOutstanding();
  }
}

function assertPhysicalTerminalResult(result, progress) {
  const stable = ownedPlain(result);
  exactKeys(stable, ["imagePulled", "catalog", "actionCount", "databaseIdentityCount", "restartCount"]);
  const expectedActions = Object.keys(SYNTHETIC_ACTOR_CLASS).sort(binaryCompare);
  const completedActions = [...progress.completedActions].sort(binaryCompare);
  if (progress.imagePresent !== true || typeof progress.imagePulled !== "boolean"
    || progress.imagePullAttempted !== progress.imagePulled
    || progress.databaseIdentityAttemptCount !== 2 || progress.databaseIdentityCount !== 2
    || progress.restartAttemptCount !== 1 || progress.restartCount !== 1
    || progress.actionCount !== 20 || completedActions.length !== expectedActions.length
    || completedActions.some((action, index) => action !== expectedActions[index])
    || stable.imagePulled !== progress.imagePulled
    || stable.actionCount !== progress.actionCount
    || stable.databaseIdentityCount !== progress.databaseIdentityCount
    || stable.restartCount !== progress.restartCount
    || canonicalJson(stable.catalog) !== canonicalJson(LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog)) {
    fail("local_postgres_terminal_evidence_invalid");
  }
}

const PHASE1_FAKE_SOCKET_IDENTITY_SHA256 = sha256Bytes(Buffer.from("forme-r4-phase1-fake-socket-v1", "utf8"));

function phase1FakeGrant(now) {
  const derived = fakePrepareAuthority(null);
  const createdAt = new Date(now - 60_000).toISOString();
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-grant.v3",
    grantId: "0123456789abcdef0123456789abcdef",
    ownerApprovalReceiptSha256: sha256Bytes(Buffer.from("phase1-fake-owner-approval")),
    authority: derived.authority, lineage: derived.lineage, artifacts: derived.artifacts,
    host: Object.freeze({
      ...derived.host,
      dockerCliIdentitySha256: sha256Bytes(Buffer.from("forme-r4-phase1-fake-cli-v1", "utf8")),
      socketIdentitySha256: PHASE1_FAKE_SOCKET_IDENTITY_SHA256,
    }),
    ceilings: derived.ceilings,
    localOnly: true,
    productionEffectsAllowed: false,
    createdAt,
    expiresAt: new Date(now + 60 * 60_000).toISOString(),
  });
}

function createPhase1FakeController(input, observeCheckpoint = null) {
  const faultAt = input.faultAt ?? null;
  const faultEdge = input.faultEdge ?? "after";
  const faultOccurrence = input.faultOccurrence ?? 1;
  if (faultAt !== null && (typeof faultAt !== "string" || !/^[a-z][a-z0-9_.-]{0,95}$/u.test(faultAt))) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (faultEdge !== "before" && faultEdge !== "after") fail("local_postgres_fake_fault_invalid");
  if (!Number.isSafeInteger(faultOccurrence) || faultOccurrence < 1 || faultOccurrence > 512) {
    fail("local_postgres_fake_fault_invalid");
  }
  const checkpoints = [];
  let cleanupMode = false;
  let faultInjected = false;
  let faultInjectionCount = 0;
  let requestedOccurrenceCount = 0;
  let faultInjectionOccurrence = null;
  return Object.freeze({
    checkpoints,
    get faultInjected() { return faultInjected; },
    get faultInjectionCount() { return faultInjectionCount; },
    get faultInjectionOccurrence() { return faultInjectionOccurrence; },
    checkpoint(name, edge = "after") {
      checkpoints.push(`${name}:${edge}`);
      observeCheckpoint?.(name, edge);
      if (faultAt === name && faultEdge === edge) requestedOccurrenceCount += 1;
      if (!faultInjected && faultAt === name && faultEdge === edge && requestedOccurrenceCount === faultOccurrence) {
        faultInjected = true;
        faultInjectionCount += 1;
        faultInjectionOccurrence ??= requestedOccurrenceCount;
        fail("local_postgres_fake_injected_fault");
      }
    },
    enterCleanup() { cleanupMode = true; },
    dockerCheckpoint(kind, edge) {
      const prefix = cleanupMode ? "cleanup" : "docker";
      this.checkpoint(`${prefix}.${kind}`, edge);
    },
  });
}

function createPhase1FakeDockerPort(plan, state, controller, options = Object.freeze({})) {
  const observationMutation = state.observationMutation ?? options.observationMutation;
  function resourceRecord(kind) {
    const labels = { [plan.resources.labelKey]: plan.resources.labelValue };
    if (kind === "container.inspect") {
      return {
        Config: { Labels: labels },
        State: { Running: state.containerRunning },
        NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } },
      };
    }
    return { Labels: labels };
  }
  return Object.freeze({
    call(kind, argv, options = Object.freeze({})) {
      const stableOptions = ownedPlain(options);
      if (Object.keys(stableOptions).some((key) => key !== "missingAllowed")) fail("local_postgres_input_invalid");
      approvedDockerArgv(plan, kind, argv);
      controller.dockerCheckpoint(kind, "before");
      state.simulatedDockerPortCalls += 1;
      let found = true;
      let stdout = "";
      if (kind === "version") {
        if (observationMutation === "docker_version_unknown") stdout = "{not-json";
        else stdout = canonicalJson({
          Client: observationMutation === "docker_client_version_unknown"
            ? {} : { Version: observationMutation === "docker_client_version_mismatch" ? "29.3.0" : "29.3.1" },
          Server: {
            ...(observationMutation === "docker_server_version_unknown" ? {} : {
              Version: observationMutation === "docker_server_version_mismatch" ? "29.3.0" : "29.3.1",
            }),
            ...(observationMutation === "docker_platform_unknown" ? {} : {
              Os: observationMutation === "docker_platform_mismatch" ? "darwin" : "linux", Arch: "arm64",
            }),
          },
        });
      } else if (kind === "image.inspect") {
        found = state.imagePresent;
        if (found) stdout = canonicalJson({
          Os: "linux",
          Architecture: "arm64",
          RepoDigests: [["image_cached_mismatch", "image_post_pull_mismatch"].includes(observationMutation)
            ? `postgres@sha256:${"f".repeat(64)}` : IMAGE_REFERENCE],
          Descriptor: { digest: IMAGE_PLATFORM_MANIFEST, platform: { os: "linux", architecture: "arm64" } },
        });
      } else if (kind === "image.pull") {
        if (observationMutation === "image_pull_failed") {
          failDockerCall("FAILED");
        }
        if (observationMutation === "image_pull_ambiguous") {
          failDockerCall("AMBIGUOUS");
        }
        state.imagePresent = observationMutation !== "image_post_pull_missing";
      } else if (kind === "network.inspect") {
        found = state.network;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "network.create") {
        if (state.network) fail("local_postgres_fake_port_invalid");
        state.network = true;
      } else if (kind === "network.rm") {
        if (!state.network) fail("local_postgres_fake_port_invalid");
        state.network = false;
      } else if (kind === "volume.inspect") {
        found = state.volume;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "volume.create") {
        if (state.volume) fail("local_postgres_fake_port_invalid");
        state.volume = true;
      } else if (kind === "volume.rm") {
        if (!state.volume) fail("local_postgres_fake_port_invalid");
        state.volume = false;
      } else if (kind === "container.inspect") {
        found = state.container;
        if (found) stdout = canonicalJson(resourceRecord(kind));
      } else if (kind === "container.create") {
        if (state.container || !state.network || !state.volume) fail("local_postgres_fake_port_invalid");
        state.container = true;
        state.containerRunning = false;
      } else if (kind === "container.start") {
        if (!state.container) fail("local_postgres_fake_port_invalid");
        state.containerRunning = true;
      } else if (kind === "container.stop") {
        if (!state.container || !state.containerRunning) fail("local_postgres_fake_port_invalid");
        state.containerRunning = false;
      } else if (kind === "container.rm") {
        if (!state.container || state.containerRunning) fail("local_postgres_fake_port_invalid");
        state.container = false;
      } else {
        fail("local_postgres_fake_port_invalid");
      }
      controller.dockerCheckpoint(kind, "after");
      if (!found) {
        if (stableOptions.missingAllowed !== true) fail("local_postgres_fake_port_invalid");
        return Object.freeze({ found: false, stdout: "" });
      }
      return Object.freeze({ found: true, stdout });
    },
  });
}

function createPhase1FakeApplicationGraph(shared) {
  const roomId = "room_0123456789abcdef0123456789abcdef";
  const graphId = `graph-${shared.graphOpens + 1}`;
  shared.graphOpens += 1;
  shared.openGraphs.add(graphId);
  let closed = false;
  return Object.freeze({
    roomId,
    observedAt: Date.parse("2026-08-11T18:00:00.000Z"),
    canonicalSha256(value) { return sha256Bytes(Buffer.from(canonicalJson(value), "utf8")); },
    identity: Object.freeze({ takeSecret(kind) {
      if (kind !== "binding_secret") fail("local_postgres_fake_graph_invalid");
      return `binding_secret_${"b".repeat(32)}`;
    } }),
    application: Object.freeze({
      async run(input) {
        const action = input?.action;
        if (typeof action !== "string" || !(action in SYNTHETIC_ACTOR_CLASS)) fail("local_postgres_fake_graph_invalid");
        shared.actions.push(action);
        const body = (() => {
          if (action === "room.create") return { roomId, roomMode: "closed" };
          if (action === "room.pair") return { pairingId: `pairing_${"1".repeat(32)}`, pairingCode: "pairing-code-local" };
          if (action === "room.pair.exchange") return { bindingId: `binding_${"2".repeat(32)}`, version: 2 };
          if (action === "room_operator.projection.deliver") return { targetVersion: 1 };
          if (action === "curation.admit") return { targetVersion: 2 };
          if (action === "room_operator.status") {
            shared.statusReads += 1;
            return { bindingVersion: 1, roomVersion: shared.statusReads === 1 ? 1 : 2 };
          }
          if (action === "interaction.create") return { targetId: `interaction_${"3".repeat(32)}` };
          if (action === "room_operator.sync") return { events: [{ eventId: `event_${"4".repeat(32)}`, sequence: 1, eventHash: `sha256:${"5".repeat(64)}` }] };
          if (action === "room_operator.pull") return {
            interaction: { interactionType: "ask" },
            requestBody: "Synthetic local PostgreSQL request body.",
          };
          if (action === "curation.unlist") return { targetVersion: 3 };
          return { targetVersion: 1 };
        })();
        const recoveryKey = action === "room_operator.pull" ? input.idempotencyKey : null;
        const recovered = recoveryKey !== null && shared.pullKeys.has(recoveryKey);
        if (recoveryKey !== null) shared.pullKeys.add(recoveryKey);
        return Object.freeze({ status: 200, recovered, body: Object.freeze(body) });
      },
    }),
    close() {
      if (closed) return;
      closed = true;
      shared.graphCloses += 1;
      shared.openGraphs.delete(graphId);
    },
  });
}

function createPhase1FakeDependencies(shared, controller, options = Object.freeze({})) {
  function createFakeConnectionGate(expectedPort, beforeConnect, completeConnection) {
    const socket = {
      connect(port, host) {
      if (port !== expectedPort || host !== "127.0.0.1") fail("local_postgres_fake_pool_invalid");
      return socket;
      },
    };
    const gate = createOneShotLoopbackStreamGate(expectedPort, beforeConnect, completeConnection, () => socket);
    let selectedMutation = undefined;
    function selectMutation() {
      if (selectedMutation !== undefined) return selectedMutation;
      selectedMutation = shared.connectionGateMutationApplied === true ? null : options.connectionGateMutation ?? null;
      shared.connectionGateMutationApplied = selectedMutation !== null;
      return selectedMutation;
    }
    function streamFactory() {
      const mutation = selectMutation();
      const stream = gate.streamFactory();
      if (mutation === "second_stream") gate.streamFactory();
      return Object.freeze({
        connect(port, host) {
          if (mutation === "wrong_host") return stream.connect(port, "0.0.0.0");
          if (mutation === "wrong_port") return stream.connect(port === 65_535 ? 65_534 : port + 1, host);
          const result = stream.connect(port, host);
          if (mutation === "second_connect") stream.connect(port, host);
          return result;
        },
      });
    }
    return Object.freeze({
      streamFactory,
      complete() {
        gate.complete();
        if (shared.readinessActive === true) shared.readinessTrace.push("connection.complete");
      },
      fakeConnect() {
        const stream = streamFactory();
        stream.connect(expectedPort, "127.0.0.1");
      },
    });
  }
  return Object.freeze({
    async loadPgDriver(runtimeRoot) {
      shared.pgDriverLoads += 1;
      const driver = await loadPgDriver(runtimeRoot);
      shared.pgDriverResolved = true;
      return driver;
    },
    async waitForPostgres(_driver, _connection, countedAttempt) {
      shared.pgReadinessChecks += 1;
      const failures = shared.pgReadinessChecks === 1 ? (options.initialReadinessFailures ?? 0) : 0;
      let readinessAttempt = 0;
      class FakeReadinessPool {
        constructor(config) {
          this.config = config;
          readinessAttempt += 1;
          shared.fakeReadinessPoolAttempts = (shared.fakeReadinessPoolAttempts ?? 0) + 1;
          this.attempt = readinessAttempt;
          this.closed = false;
          shared.readinessTrace.push(`pool.construct:${this.attempt}`);
        }
        async connect() {
          shared.readinessTrace.push(`connect.enter:${this.attempt}`);
          try {
            const stream = this.config.stream();
            stream.connect(this.config.port, this.config.host);
          } catch (error) {
            if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
            fail("local_postgres_connection_failed");
          }
          const attempt = this.attempt;
          shared.readinessTrace.push(`connect.return:${attempt}`);
          return Object.freeze({
            async query(text) {
              if (text !== "SELECT 1::integer AS ready") fail("local_postgres_sql_input_invalid");
              shared.readinessTrace.push(`select.ready:${attempt <= failures ? 0 : 1}:${attempt}`);
              return Object.freeze({
                rowCount: 1,
                rows: Object.freeze([Object.freeze({ ready: attempt <= failures ? 0 : 1 })]),
              });
            },
            release() { shared.readinessTrace.push(`client.release:${attempt}`); },
          });
        }
        async end() {
          if (this.closed) fail("local_postgres_pool_close_failed");
          this.closed = true;
          shared.readinessTrace.push(`pool.end:${this.attempt}`);
        }
      }
      shared.readinessActive = true;
      try {
        return await waitForPostgres(
          Object.freeze({ Pool: FakeReadinessPool, types: Object.freeze({}) }),
          Object.freeze({ database: "forme_r4_local_0000000000000000_a", password: "x".repeat(32), port: 55_432 }),
          countedAttempt,
          async () => { shared.readinessTrace.push("sleep"); },
        );
      } finally {
        shared.readinessActive = false;
      }
    },
    async observePostgresServerVersion() {
      if (options.observationMutation === "postgres_version_unknown") fail("local_postgres_sql_execution_failed");
      if (options.observationMutation === "postgres_version_mismatch") return "160009";
      return "160010";
    },
    readSqlArtifact(artifactPath, expectedSha256) {
      shared.sqlArtifactReads.push(artifactPath);
      return readSqlArtifact(artifactPath, expectedSha256);
    },
    createConnectionGate: createFakeConnectionGate,
    createRunPool(_driver, _connection, streamFactory = null) {
      shared.poolOpens += 1;
      const poolId = `pool-${shared.poolOpens}`;
      shared.openPools.add(poolId);
      let physicalConnectionEstablished = false;
      return Object.freeze({
        poolId,
        streamFactory,
        async end() {},
        async query() { return Object.freeze({ rowCount: 0, rows: Object.freeze([]) }); },
        connect() {
          if (!physicalConnectionEstablished) {
            const gateSocket = streamFactory?.();
            gateSocket?.connect(55432, "127.0.0.1");
            physicalConnectionEstablished = true;
          }
          let released = false;
          return Object.freeze({
            async query() { return Object.freeze({ rowCount: 0, rows: Object.freeze([]) }); },
            release() {
              if (released) fail("local_postgres_fake_pool_invalid");
              released = true;
            },
          });
        },
      });
    },
    async provePoolConnection(pool) {
      const client = await pool.connect();
      client.release();
    },
    async provePrimaryDatabaseIdentity() { return true; },
    async closeRunPool(pool) {
      if (pool === null || typeof pool !== "object" || typeof pool.poolId !== "string"
        || !shared.openPools.delete(pool.poolId)) fail("local_postgres_fake_pool_invalid");
      shared.poolCloses += 1;
    },
    async applyAndVerifySql() { shared.sqlApplyVerifyRuns += 1; return LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog; },
    async applySchemaSql(pool, text) {
      shared.sqlApplyVerifyRuns += 1;
      if (options.schemaFailureAt === "primary_initial" && shared.sqlApplyVerifyRuns === 1) {
        fail("local_postgres_fake_schema_failed");
      }
      await pool.query(text);
    },
    async verifySchemaSql(pool, text) {
      await pool.query(text);
    },
    async observeCatalog() {
      if (options.observationMutation === "catalog_unknown") fail("local_postgres_sql_execution_failed");
      if (options.observationMutation === "catalog_mismatch") {
        return Object.freeze({
          catalogOutcome: "MISMATCH", tables: 13, columns: 207, constraints: 172, indexes: 44,
          catalogContractSha256: CATALOG_CONTRACT_SHA256,
        });
      }
      return Object.freeze({
        catalogOutcome: "MATCHED", ...LOCAL_POSTGRES_PHASE1_AUTHORITY.catalog,
        catalogContractSha256: CATALOG_CONTRACT_SHA256,
      });
    },
    async createApplicationGraph(pool, observedAt) {
      const canaryPool = Object.freeze({
        connect() {
          shared.realApplicationGraphCanaryConnects += 1;
          throw new Error("PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY");
        },
      });
      const composed = await createApplicationGraph(canaryPool, observedAt);
      shared.realApplicationGraphCompositions += 1;
      const canaryConnectsBefore = shared.realApplicationGraphCanaryConnects;
      let canaryError = null;
      let unexpectedlyGreen = false;
      try {
        await composed.application.run(Object.freeze({
          schemaVersion: "r4_public_core_operation_input.v1",
          action: "room.create",
          actorClass: "controller",
          actorScopeDigest: composed.canonicalSha256("real graph error canary"),
          params: Object.freeze({}),
          body: Object.freeze({
            entityId: "entity_forme_public_core_v1",
            roomKind: "third_place_public",
            label: "Real graph error canary",
          }),
          authorizationSecret: null,
          idempotencyKey: `idem_${"c".repeat(32)}`,
          expectedVersion: null,
        }));
        unexpectedlyGreen = true;
      } catch (error) {
        canaryError = error;
      }
      try {
        if (unexpectedlyGreen) fail("local_postgres_fake_real_graph_canary_unexpected_green");
        if (shared.realApplicationGraphCanaryConnects !== canaryConnectsBefore + 1
          || !(canaryError instanceof Error)
          || canaryError.message === "PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY"
          || JSON.stringify(canaryError).includes("PRIVATE_REAL_GRAPH_FAKE_POOL_CANARY")) {
          fail("local_postgres_fake_real_graph_canary_invalid");
        }
        shared.realApplicationGraphErrorCanaries += 1;
      } finally {
        let closed = false;
        for (let attempt = 0; attempt < 3 && !closed; attempt += 1) closed = closeApplicationGraph(composed);
        if (!closed) {
          shared.retainedRealApplicationGraphs.add(composed);
          fail("local_postgres_fake_real_graph_cleanup_failed");
        }
        shared.realApplicationGraphClosures += 1;
      }
      const synthetic = createPhase1FakeApplicationGraph(shared);
      const trackedClient = await pool.connect();
      try {
        await trackedClient.query("BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE");
        await trackedClient.query("COMMIT");
      } finally {
        trackedClient.release();
      }
      return synthetic;
    },
    closeApplicationGraph(graph) {
      controller.checkpoint("application_graph.close", "before");
      const closed = closeApplicationGraph(graph);
      controller.checkpoint("application_graph.close", "after");
      return closed;
    },
    runSyntheticWalkingFlow,
    runSyntheticClosureFlow,
    async createRollbackDatabase(_admin, databaseName) {
      if (!/^forme_r4_local_[0-9a-f]{16}_b$/u.test(databaseName)) fail("local_postgres_fake_database_invalid");
      if (options.rollbackDatabaseFailureAt === "create") fail("local_postgres_fake_rollback_database_failed");
      shared.rollbackDatabaseCreates += 1;
    },
    async proveSeedOnly() { shared.seedProofs += 1; },
    async executeRunSql(pool, text) { shared.rollbackExecutions += 1; await pool.query(text); },
    async proveNamespaceAbsent() { shared.namespaceAbsenceProofs += 1; },
  });
}

function wrapPhase1FakeLifecyclePorts(ports, controller) {
  const methodByStage = [
    ["verifyDocker", "docker.verify"], ["proveResourceAbsence", "resources.absence"],
    ["ensurePinnedImage", "image.ensure"], ["createNetwork", "network.create"],
    ["createVolume", "volume.create"], ["createContainer", "container.create"],
    ["startContainer", "container.start"], ["openPrimary", "primary.open"],
    ["applyPrimarySchema", "primary.schema"], ["runWalkingFlow", "primary.walk"],
    ["closePrimary", "primary.close"], ["restartContainer", "container.restart"],
    ["openReplay", "replay.open"], ["runReplayAndClosure", "replay.run"],
    ["closeReplay", "replay.close"], ["createRollbackDatabase", "rollback_database.create"],
    ["openRollback", "rollback.open"], ["runRollbackRehearsal", "rollback.run"],
    ["closeRollback", "rollback.close"],
  ];
  return Object.freeze(Object.fromEntries(methodByStage.map(([method, stage]) => [method, async (...args) => {
    controller.checkpoint(stage, "before");
    const result = await ports[method](...args);
    controller.checkpoint(stage, "after");
    return result;
  }])));
}

function mutatedPhase1FakeReceipt(receipt, mutation) {
  const value = JSON.parse(canonicalJson(receipt));
  if (mutation === "top_extra") value.unexpected = true;
  else if (mutation === "authority") value.authority.physicalRebindPacketSha256 = `sha256:${"b".repeat(64)}`;
  else if (mutation === "lineage") value.lineage.stageBHead = "c".repeat(40);
  else if (mutation === "artifacts") value.artifacts.schemaSqlSha256 = `sha256:${"d".repeat(64)}`;
  else if (mutation === "host") value.hostObservation.socketIdentitySha256 = `sha256:${"e".repeat(64)}`;
  else if (mutation === "effects") value.effects.schemaApplyCount += 1;
  else if (mutation === "target") value.targetObservation.columns += 1;
  else if (mutation === "cleanup") value.cleanup.ownedContainerCount = 1;
  else if (mutation === "journal") value.journal.headSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "readiness") value.readiness.trafficReady = true;
  else if (mutation === "prior_evidence") value.priorEvidenceSha256 = JOURNAL_GENESIS;
  else if (mutation === "coordinator") value.coordinator.activeResidueCount = 1;
  else if (mutation === "consumed_grant") value.consumedGrantSha256 = `sha256:${"1".repeat(64)}`;
  else if (mutation === "nested_extra") value.effects.unexpected = 0;
  else if (mutation === "code") value.code = "local_postgres_unlisted_failure";
  else if (mutation === "status") value.status = "CLEANUP_RECOVERED";
  else fail("local_postgres_fake_fault_invalid");
  return value;
}

function createPhase1FakeAdapters(
  controller,
  state,
  shared,
  now,
  leaseOwnerAlive = true,
  recoverCaughtFinalization = true,
) {
  return Object.freeze({
    nowIso: () => new Date(now).toISOString(),
    resolveSocketIdentity() {
      shared.syntheticSocketResolutions += 1;
      return Object.freeze({
        socketPath: "/phase1-fake/no-socket",
        identity: Object.freeze({ phase1Fake: true }),
        identitySha256: PHASE1_FAKE_SOCKET_IDENTITY_SHA256,
      });
    },
    verifyBindings(grant) {
      if (grant.ownerApprovalReceiptSha256 !== sha256Bytes(Buffer.from("phase1-fake-owner-approval"))
        || grant.lineage.stageAHead !== STAGE_A_HEAD) fail("local_postgres_fake_binding_invalid");
      return Object.freeze({ phase1Fake: true });
    },
    createDockerPort(_socket, _isolated, plan, privateRoot, journalState, grant) {
      const port = createPhase1FakeDockerPort(plan, state, controller, shared.options);
      return Object.freeze({
        call(kind, argv, options) {
          const reservation = reserveEffect(privateRoot, journalState, `docker:${kind}`, kind);
          let result;
          try { result = port.call(kind, argv, options); }
          catch (error) {
            if (authenticDockerCallFailureOutcome(error) === "FAILED") {
              completeEffect(privateRoot, journalState, reservation);
            }
            throw error;
          }
          completeEffect(privateRoot, journalState, reservation);
          return result;
        },
        grant,
      });
    },
    revalidateHost(_grant, _socket, kind, target, edge) {
      shared.syntheticHostRevalidations = (shared.syntheticHostRevalidations ?? 0) + 1;
      const mutation = shared.options.hostDriftAt;
      if (mutation !== undefined && mutation.kind === kind && mutation.target === target && mutation.edge === edge) {
        shared.syntheticHostDriftTriggered = true;
        fail("local_postgres_socket_identity_drift");
      }
    },
    async performRun(context) {
      const dependencies = createPhase1FakeDependencies(shared, controller, shared.options);
      const realPorts = createRealPhysicalLifecyclePorts(context, dependencies);
      try {
        return await executePhysicalLifecycle(wrapPhase1FakeLifecyclePorts(realPorts, controller), context.progress);
      } finally {
        await realPorts.closeOutstanding();
      }
    },
    enterCleanup() { controller.enterCleanup(); },
    checkpoint(name, edge = "after") { controller.checkpoint(name, edge); },
    syncCheckpoint(name, edge = "after") { controller.checkpoint(name, edge); },
    isProcessAlive(owner) {
      return typeof leaseOwnerAlive === "function" ? leaseOwnerAlive(owner) : leaseOwnerAlive;
    },
    recoverCaughtFinalization,
  });
}

function phase1FakePreRecoverySnapshot(privateRoot, state, shared) {
  const rootEntries = fs.readdirSync(privateRoot).sort(binaryCompare);
  const pendingPath = privatePath(privateRoot, "grant.pending.json");
  const consumedPath = privatePath(privateRoot, "grant.consumed.json");
  let pendingStat = null;
  let consumedStat = null;
  try { pendingStat = fs.lstatSync(pendingPath, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_fake_port_invalid");
  }
  try { consumedStat = fs.lstatSync(consumedPath, { bigint: true }); } catch (error) {
    if (!(error !== null && typeof error === "object" && error.code === "ENOENT")) fail("local_postgres_fake_port_invalid");
  }
  const grantState = pendingStat !== null && consumedStat !== null
    && pendingStat.dev === consumedStat.dev && pendingStat.ino === consumedStat.ino
    && pendingStat.nlink === 2n && consumedStat.nlink === 2n
    ? "BOTH_LINKS_SAME_INODE"
    : pendingStat !== null && consumedStat === null ? "PENDING_ONLY"
      : pendingStat === null && consumedStat !== null ? "CONSUMED_ONLY"
        : pendingStat === null && consumedStat === null ? "ABSENT" : "INVALID";
  const journalPath = privatePath(privateRoot, JOURNAL_DIRECTORY);
  let journalEntries = Object.freeze([]);
  let journalPendingEntryCount = 0;
  let journalHeadSha256 = JOURNAL_GENESIS;
  let firstEvent = null;
  let firstConsumedGrantSha256 = null;
  if (coordinatorDirectoryExists(journalPath)) {
    const names = fs.readdirSync(journalPath).sort(binaryCompare);
    const finals = names.filter((name) => /^entry-[0-9]{6}\.json$/u.test(name));
    journalPendingEntryCount = names.filter((name) => /^entry-[0-9]{6}\.pending-[0-9a-f]{32}\.json$/u.test(name)).length;
    journalEntries = Object.freeze(finals);
    if (finals.length !== 0) {
      const first = ownedPlain(readPrivateJson(path.join(journalPath, finals[0])));
      firstEvent = typeof first.event === "string" ? first.event : null;
      firstConsumedGrantSha256 = first.event === "grant.consumed"
        && typeof first.detail?.consumedGrantSha256 === "string" ? first.detail.consumedGrantSha256 : null;
      const last = ownedPlain(readPrivateJson(path.join(journalPath, finals.at(-1))));
      journalHeadSha256 = typeof last.entrySha256 === "string" ? last.entrySha256 : "INVALID";
    }
  }
  return Object.freeze({
    rootEntries: Object.freeze(rootEntries),
    grantState,
    journalEntryCount: journalEntries.length,
    journalPendingEntryCount,
    journalHeadSha256,
    firstEvent,
    firstConsumedGrantSha256,
    syntheticPortCalls: Object.freeze({
      socket: shared.syntheticSocketResolutions,
      docker: state.simulatedDockerPortCalls,
      pgDriverLoads: shared.pgDriverLoads,
      poolOpens: shared.poolOpens,
    }),
  });
}

async function executePhase1FakeCoordinator(stable) {
  const now = Date.now();
  const privateRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "forme-r4-local-pg-phase1-fake-")));
  const displacedPhysicalRoot = `${privateRoot}-displaced`;
  fs.chmodSync(privateRoot, 0o700);
  const evidenceOut = path.join(privateRoot, "physical-evidence.json");
  const state = {
    imagePresent: ["image_cached_green", "image_cached_mismatch"].includes(stable.observationMutation),
    observationMutation: stable.observationMutation ?? null,
    network: false,
    volume: false,
    container: false,
    containerRunning: false,
    simulatedDockerPortCalls: 0,
  };
  const shared = {
    options: stable,
    actions: [],
    pullKeys: new Set(),
    statusReads: 0,
    graphCloses: 0,
    graphOpens: 0,
    realApplicationGraphCompositions: 0,
    realApplicationGraphClosures: 0,
    realApplicationGraphCanaryConnects: 0,
    realApplicationGraphErrorCanaries: 0,
    retainedRealApplicationGraphs: new Set(),
    openGraphs: new Set(),
    pgDriverLoads: 0,
    pgDriverResolved: false,
    pgReadinessChecks: 0,
    sqlArtifactReads: [],
    poolOpens: 0,
    poolCloses: 0,
    openPools: new Set(),
    sqlApplyVerifyRuns: 0,
    rollbackDatabaseCreates: 0,
    seedProofs: 0,
    rollbackExecutions: 0,
    namespaceAbsenceProofs: 0,
    syntheticSocketResolutions: 0,
    readinessActive: false,
    readinessTrace: [],
    currentNow: now,
    syntheticHostDriftTriggered: false,
  };
  let firstReceipt = null;
  let recoveryReceipt = null;
  let firstCode = null;
  let recoveryCode = null;
  let firstFaultInjected = false;
  let recoveryAttempted = false;
  let contenderFailureCode = null;
  let contenderCheckpoints = Object.freeze([]);
  let finalizationContenderObservedCandidate = false;
  let repeatReceipt = null;
  let concurrentRecoveryReceipts = Object.freeze([]);
  let concurrentRecoveryRenameWinnerCount = 0;
  let concurrentRecoveryLoserReadbackCount = 0;
  let concurrentReplacementStagingFaultInjected = false;
  let upstreamSnapshotReconcileObserved = false;
  let reentrantDoorwayObserved = false;
  let reentrantTerminalReadMatched = false;
  let firstCheckpoints = Object.freeze([]);
  let recoveryCheckpoints = Object.freeze([]);
  let preRecoverySnapshot = null;
  let preRecoveryEvidenceSha256 = null;
  let postRecoverySnapshot = null;
  let postRecoveryEvidenceSha256 = null;
  let rootReplacementInjected = false;
  let displacedRootEntries = Object.freeze([]);
  let receiptValidationResults = Object.freeze([]);
  let receiptValidationEvidenceUnchanged = null;
  let cleanupLifecycleCeilingProbe = null;
  try {
    const fakeGrant = phase1FakeGrant(now);
    validateLocalPostgresGrant(fakeGrant, new Date(now));
    writePrivateBytes(path.join(privateRoot, "owner-approval-receipt"), Buffer.from("phase1-fake-owner-approval", "utf8"));
    writePrivateJson(path.join(privateRoot, "grant.pending.json"), fakeGrant);
    let finalizationContender = null;
    let finalizationContenderController = null;
    const firstControllerInput = stable.cleanupLifecycleCeilingProbe === true
      ? Object.freeze({ faultAt: "cleanup.container.rm", faultEdge: "before", faultOccurrence: 1 })
      : stable.concurrentRecovery === true
      ? Object.freeze({ ...stable, faultAt: "lease.release", faultEdge: "before", faultOccurrence: 1 })
      : stable.concurrentReplacementRecovery === true || stable.upstreamSnapshotReplacementRecovery === true
        ? Object.freeze({ ...stable, faultAt: "cleanup.container.rm", faultEdge: "before", faultOccurrence: 1 })
        : stable;
    const firstController = createPhase1FakeController(firstControllerInput, (name, edge) => {
      if (stable.rootReplacementMutation === "after_grant_state_observed" && !rootReplacementInjected
        && name === "grant.state_observed" && edge === "after") {
        fs.renameSync(privateRoot, displacedPhysicalRoot);
        fs.mkdirSync(privateRoot, { mode: 0o700 });
        rootReplacementInjected = true;
      }
      if (stable.sameRootFinalizationConcurrency !== true || finalizationContender !== null
        || name !== "evidence.provisional.install" || edge !== "before") return;
      finalizationContenderObservedCandidate = fs.readdirSync(privateRoot)
        .some((leaf) => FINALIZATION_DRAFT.test(leaf));
      finalizationContenderController = createPhase1FakeController(Object.freeze({}));
      finalizationContender = runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(finalizationContenderController, state, shared, now, true),
      ).then(() => null, (error) => error);
    });
    let firstAdapters = createPhase1FakeAdapters(
      firstController, state, shared, now, true, stable.concurrentRecovery !== true,
    );
    let firstRun = null;
    if (stable.reentrantDoorway === true) {
      let releasePriorClear;
      let markPriorClear;
      const priorClear = new Promise((resolve) => { markPriorClear = resolve; });
      const allowPriorClear = new Promise((resolve) => { releasePriorClear = resolve; });
      const contenderController = createPhase1FakeController(Object.freeze({}));
      const contenderBase = createPhase1FakeAdapters(contenderController, state, shared, now, true);
      const contenderAdapters = Object.freeze({
        ...contenderBase,
        async checkpoint(name, edge = "after") {
          contenderBase.checkpoint(name, edge);
          if (name === "lease.acquire.prior_clear" && edge === "after") {
            markPriorClear();
            await allowPriorClear;
          }
        },
      });
      const contender = runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut }, contenderAdapters,
      ).then(() => null, (error) => error);
      await priorClear;
      firstRun = runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters);
      const ownerReceipt = await firstRun;
      releasePriorClear();
      const contenderError = await contender;
      contenderFailureCode = contenderError === null
        ? "local_postgres_fake_contender_unexpected_green"
        : authenticLocalPostgresRunnerErrorDetails(contenderError)?.code ?? "local_postgres_fake_contender_failed";
      contenderCheckpoints = Object.freeze([...contenderController.checkpoints]);
      const doorwayTerminalReceipt = await runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(createPhase1FakeController(Object.freeze({})), state, shared, now, true),
      );
      reentrantTerminalReadMatched = canonicalJson(doorwayTerminalReceipt) === canonicalJson(ownerReceipt);
      reentrantDoorwayObserved = ownerReceipt.status === "GREEN"
        && contenderCheckpoints.includes("lease.acquire.prior_clear:after")
        && contenderCheckpoints.includes("lease.acquire.published:after");
      firstRun = Promise.resolve(ownerReceipt);
    } else if (stable.sameRootConcurrency === true) {
      let markLeaseHeld;
      let resumeLeaseHolder;
      const leaseHeld = new Promise((resolve) => { markLeaseHeld = resolve; });
      const resume = new Promise((resolve) => { resumeLeaseHolder = resolve; });
      const baseAdapters = firstAdapters;
      firstAdapters = Object.freeze({
        ...baseAdapters,
        async checkpoint(name, edge = "after") {
          baseAdapters.checkpoint(name, edge);
          if (name === "grant.state_observed" && edge === "after") {
            markLeaseHeld();
            await resume;
          }
        },
      });
      firstRun = runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters);
      await leaseHeld;
      const contenderController = createPhase1FakeController(Object.freeze({}));
      try {
        await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(contenderController, state, shared, now, true),
        );
      } catch (error) {
        contenderFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_contender_failed";
      } finally {
        contenderCheckpoints = Object.freeze([...contenderController.checkpoints]);
        resumeLeaseHolder();
      }
    }
    try {
      firstReceipt = await (firstRun ?? runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, firstAdapters));
    } catch (error) {
      firstCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_failed";
      try { firstReceipt = ownedPlain(readPrivateJson(evidenceOut)); } catch { firstReceipt = null; }
    } finally {
      firstCheckpoints = Object.freeze([...firstController.checkpoints]);
      firstFaultInjected = firstController.faultInjected;
    }
    if (rootReplacementInjected) displacedRootEntries = Object.freeze(fs.readdirSync(displacedPhysicalRoot).sort(binaryCompare));
    preRecoverySnapshot = phase1FakePreRecoverySnapshot(privateRoot, state, shared);
    try { preRecoveryEvidenceSha256 = readPrivateJsonRecord(evidenceOut).sha256; } catch { preRecoveryEvidenceSha256 = null; }
    if (stable.ownerApprovalReceiptMutation === "replace_before_cleanup_recovery") {
      if (stable.recoverCleanup !== true) fail("local_postgres_fake_fault_invalid");
      const approvalPath = privatePath(privateRoot, "owner-approval-receipt");
      fs.unlinkSync(approvalPath);
      fsyncPrivateDirectory(privateRoot);
      writePrivateBytes(approvalPath, Buffer.from("phase1-fake-owner-approval-replaced", "utf8"));
    }
    if (stable.recoveryClockMutation === "expired") shared.currentNow = now + 2 * 60 * 60_000;
    else if (stable.recoveryClockMutation === "rollback") shared.currentNow = now - 2 * 60 * 60_000;
    if (finalizationContender !== null) {
      try {
        const error = await finalizationContender;
        contenderFailureCode = error === null
          ? "local_postgres_fake_contender_unexpected_green"
          : authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_contender_failed";
      } finally {
        contenderCheckpoints = Object.freeze([...(finalizationContenderController?.checkpoints ?? [])]);
      }
    }
    const deadOwnerNonces = new Set();
    if (firstReceipt?.coordinator?.ownerNonce !== undefined) {
      deadOwnerNonces.add(firstReceipt.coordinator.ownerNonce);
    }
    for (const name of fs.readdirSync(privateRoot)) {
      const leaseMatch = COORDINATOR_LEASE.exec(name);
      if (leaseMatch !== null) deadOwnerNonces.add(leaseMatch[1]);
    }
    try {
      const staged = validateFinalizingReceipt(readPrivateJson(path.join(privateRoot, "physical-evidence.finalizing.json")));
      deadOwnerNonces.add(staged.coordinator.ownerNonce);
    } catch { /* no staged receipt */ }
    const recoveryOwnerAlive = (owner) => !deadOwnerNonces.has(owner.ownerNonce);

    async function runReentrantRecoveryPair(recoveredAt) {
      let reentrantRecovery = null;
      const secondController = createPhase1FakeController(Object.freeze({}));
      const firstRecoveryController = createPhase1FakeController(Object.freeze({}), (name, edge) => {
        if (name !== "evidence.publish" || edge !== "before" || reentrantRecovery !== null) return;
        reentrantRecovery = runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(secondController, state, shared, recoveredAt, recoveryOwnerAlive),
        ).then((receipt) => Object.freeze({ receipt, error: null }), (error) => Object.freeze({ receipt: null, error }));
      });
      let firstRecovered = null;
      let pairFailureCode = null;
      try {
        firstRecovered = await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(firstRecoveryController, state, shared, recoveredAt, recoveryOwnerAlive),
        );
      } catch (error) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
      }
      const secondRecovered = reentrantRecovery === null
        ? Object.freeze({ receipt: null, error: new Error("reentrant_recovery_not_entered") })
        : await reentrantRecovery;
      if (secondRecovered.error !== null) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(secondRecovered.error)?.code
          ?? "local_postgres_fake_recovery_failed";
      }
      const receipts = Object.freeze([firstRecovered, secondRecovered.receipt]);
      const checkpoints = Object.freeze([
        ...firstRecoveryController.checkpoints,
        ...secondController.checkpoints,
      ]);
      const renameWinnerCount = checkpoints.filter((value) => value === "evidence.publish:after").length;
      const receiptsMatch = receipts[0] !== null && receipts.every((receipt) => receipt !== null
        && canonicalJson(receipt) === canonicalJson(receipts[0]));
      return Object.freeze({
        receipts,
        receipt: receipts[0] ?? receipts[1] ?? null,
        checkpoints,
        failureCode: pairFailureCode,
        renameWinnerCount,
        loserReadbackCount: receiptsMatch && renameWinnerCount === 1 ? 1 : 0,
      });
    }

    async function runUpstreamSnapshotRecoveryPair(recoveredAt) {
      let publishingRecovery = null;
      const publishingController = createPhase1FakeController(Object.freeze({}));
      const staleSnapshotController = createPhase1FakeController(Object.freeze({}), (name, edge) => {
        if (name !== "evidence.recovery.snapshot" || edge !== "after" || publishingRecovery !== null) return;
        publishingRecovery = runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(publishingController, state, shared, recoveredAt, recoveryOwnerAlive),
        ).then((receipt) => Object.freeze({ receipt, error: null }), (error) => Object.freeze({ receipt: null, error }));
      });
      let staleSnapshotReceipt = null;
      let pairFailureCode = null;
      try {
        staleSnapshotReceipt = await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(staleSnapshotController, state, shared, recoveredAt, recoveryOwnerAlive),
        );
      } catch (error) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
      }
      const published = publishingRecovery === null
        ? Object.freeze({ receipt: null, error: new Error("snapshot_recovery_not_entered") })
        : await publishingRecovery;
      if (published.error !== null) {
        pairFailureCode = authenticLocalPostgresRunnerErrorDetails(published.error)?.code
          ?? "local_postgres_fake_recovery_failed";
      }
      const receipts = Object.freeze([staleSnapshotReceipt, published.receipt]);
      const checkpoints = Object.freeze([
        ...staleSnapshotController.checkpoints,
        ...publishingController.checkpoints,
      ]);
      const renameWinnerCount = checkpoints.filter((value) => value === "evidence.publish:after").length;
      const receiptsMatch = receipts[0] !== null && receipts.every((receipt) => receipt !== null
        && canonicalJson(receipt) === canonicalJson(receipts[0]));
      return Object.freeze({
        receipts,
        receipt: receipts[0] ?? receipts[1] ?? null,
        checkpoints,
        failureCode: pairFailureCode,
        renameWinnerCount,
        loserReadbackCount: receiptsMatch && renameWinnerCount === 1 ? 1 : 0,
        snapshotObserved: staleSnapshotController.checkpoints.includes("evidence.recovery.snapshot:after")
          && !staleSnapshotController.checkpoints.includes("evidence.publish:before"),
      });
    }

    if (stable.cleanupLifecycleCeilingProbe === true) {
      recoveryAttempted = true;
      const recoveryReceipts = [];
      const recoveryCheckpointSets = [];
      for (let ordinal = 1; ordinal <= 2; ordinal += 1) {
        const controller = createPhase1FakeController(Object.freeze({
          faultAt: "cleanup.container.rm", faultEdge: "before", faultOccurrence: 1,
        }));
        let receipt;
        try {
          receipt = await runCoordinatorWithLease(
            { grantRoot: privateRoot, evidenceOut },
            createPhase1FakeAdapters(controller, state, shared, now + ordinal * 1_000, recoveryOwnerAlive),
          );
        } catch (error) {
          if (authenticLocalPostgresRunnerErrorDetails(error) === null) throw error;
          receipt = validateFinalizingReceipt(readPrivateJson(evidenceOut));
        }
        recoveryReceipts.push(receipt);
        recoveryCheckpointSets.push(Object.freeze([...controller.checkpoints]));
      }
      recoveryReceipt = recoveryReceipts.at(-1);
      recoveryCheckpoints = Object.freeze(recoveryCheckpointSets.flat());
      const evidenceBefore = readPrivateJsonRecord(evidenceOut).sha256;
      const journalBefore = readJournalState(privateRoot);
      const dockerCallsBefore = state.simulatedDockerPortCalls;
      const thirdController = createPhase1FakeController(Object.freeze({}));
      let thirdFailureCode = null;
      try {
        await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(thirdController, state, shared, now + 3_000, recoveryOwnerAlive),
        );
      } catch (error) {
        thirdFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code
          ?? "local_postgres_fake_recovery_failed";
      }
      const evidenceAfter = readPrivateJsonRecord(evidenceOut).sha256;
      const journalAfter = readJournalState(privateRoot);
      cleanupLifecycleCeilingProbe = Object.freeze({
        recoveryStatuses: Object.freeze(recoveryReceipts.map((receipt) => receipt.status)),
        recoveryCleanupStatuses: Object.freeze(recoveryReceipts.map((receipt) => receipt.cleanupStatus)),
        thirdFailureCode,
        thirdCheckpoints: Object.freeze([...thirdController.checkpoints]),
        evidenceUnchanged: evidenceAfter === evidenceBefore,
        journalUnchanged: journalAfter.sequence === journalBefore.sequence
          && journalAfter.lastSha256 === journalBefore.lastSha256,
        dockerCallDelta: state.simulatedDockerPortCalls - dockerCallsBefore,
        lifecycleCount: journalAfter.dockerLifecycleCount,
        constructionLifecycleCount: journalAfter.constructionLifecycleCount,
        cleanupRecoveryLifecycleCount: journalAfter.cleanupRecoveryLifecycleCount,
      });
      recoveryCode = thirdFailureCode;
    } else if (stable.concurrentRecovery === true) {
      recoveryAttempted = true;
      const pair = await runReentrantRecoveryPair(now + 1_000);
      concurrentRecoveryReceipts = pair.receipts;
      recoveryReceipt = pair.receipt;
      recoveryCheckpoints = pair.checkpoints;
      recoveryCode = pair.failureCode;
      concurrentRecoveryRenameWinnerCount = pair.renameWinnerCount;
      concurrentRecoveryLoserReadbackCount = pair.loserReadbackCount;
    } else if (stable.concurrentReplacementRecovery === true
      || stable.upstreamSnapshotReplacementRecovery === true) {
      recoveryAttempted = true;
      const stagingController = createPhase1FakeController(Object.freeze({
        faultAt: "evidence.publish",
        faultEdge: "before",
        faultOccurrence: 1,
      }));
      let stagingFailureCode = null;
      try {
        await runCoordinatorWithLease(
          { grantRoot: privateRoot, evidenceOut },
          createPhase1FakeAdapters(stagingController, state, shared, now + 1_000, recoveryOwnerAlive, false),
        );
      } catch (error) {
        stagingFailureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code
          ?? "local_postgres_fake_replacement_stage_failed";
      }
      concurrentReplacementStagingFaultInjected = stagingController.faultInjected;
      if (!concurrentReplacementStagingFaultInjected
        || stagingFailureCode !== "local_postgres_fake_injected_fault") {
        fail("local_postgres_fake_replacement_stage_invalid");
      }
      const stagedReplacement = validateFinalizingReceipt(
        readPrivateJson(path.join(privateRoot, "physical-evidence.finalizing.json")),
      );
      deadOwnerNonces.add(stagedReplacement.coordinator.ownerNonce);
      const pair = stable.upstreamSnapshotReplacementRecovery === true
        ? await runUpstreamSnapshotRecoveryPair(now + 2_000)
        : await runReentrantRecoveryPair(now + 2_000);
      concurrentRecoveryReceipts = pair.receipts;
      recoveryReceipt = pair.receipt;
      recoveryCheckpoints = Object.freeze([...stagingController.checkpoints, ...pair.checkpoints]);
      recoveryCode = pair.failureCode;
      concurrentRecoveryRenameWinnerCount = pair.renameWinnerCount;
      concurrentRecoveryLoserReadbackCount = pair.loserReadbackCount;
      upstreamSnapshotReconcileObserved = pair.snapshotObserved === true;
    } else if (stable.recoverCleanup === true
      && (firstFaultInjected || firstReceipt === null || firstReceipt.cleanupStatus === "BLOCKED")) {
      recoveryAttempted = true;
      const recoveryController = createPhase1FakeController(Object.freeze({}));
      const recoveryAdapters = createPhase1FakeAdapters(
        recoveryController, state, shared, shared.currentNow + 1_000, recoveryOwnerAlive,
      );
      try {
        recoveryReceipt = await runCoordinatorWithLease({ grantRoot: privateRoot, evidenceOut }, recoveryAdapters);
      } catch (error) {
        recoveryCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_recovery_failed";
        try { recoveryReceipt = ownedPlain(readPrivateJson(evidenceOut)); } catch { recoveryReceipt = null; }
      } finally {
        recoveryCheckpoints = Object.freeze([...recoveryController.checkpoints]);
      }
    }
    if (stable.repeatTerminalEntry === true && (recoveryReceipt ?? firstReceipt) !== null) {
      repeatReceipt = await runCoordinatorWithLease(
        { grantRoot: privateRoot, evidenceOut },
        createPhase1FakeAdapters(createPhase1FakeController(Object.freeze({})), state, shared, now + 2_000, true),
      );
    }
    const finalReceipt = recoveryReceipt ?? firstReceipt;
    if (stable.receiptValidationMutations !== undefined) {
      if (finalReceipt === null) fail("local_postgres_fake_receipt_validation_invalid");
      const grantRecord = readPrivateJsonRecord(privatePath(privateRoot, "grant.consumed.json"));
      const durableJournal = readJournalState(privateRoot);
      const evidenceBefore = readPrivateJsonRecord(evidenceOut).sha256;
      receiptValidationResults = Object.freeze(stable.receiptValidationMutations.map((mutation) => {
        let rejectionCode = null;
        try {
          validateReceiptAgainstGrantAndJournal(
            mutatedPhase1FakeReceipt(finalReceipt, mutation), grantRecord.value, grantRecord.sha256, durableJournal,
          );
        } catch (error) {
          rejectionCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_fake_unexpected_error";
        }
        return Object.freeze({ mutation, rejected: rejectionCode !== null, rejectionCode });
      }));
      receiptValidationEvidenceUnchanged = readPrivateJsonRecord(evidenceOut).sha256 === evidenceBefore;
    }
    postRecoverySnapshot = phase1FakePreRecoverySnapshot(privateRoot, state, shared);
    try { postRecoveryEvidenceSha256 = readPrivateJsonRecord(evidenceOut).sha256; } catch { postRecoveryEvidenceSha256 = null; }
    const transientNames = fs.readdirSync(privateRoot).filter((name) => (
      name === "postgres-password" || name === "docker-home" || name === "docker-config" || name === "pg-runtime"
      || name === "physical-evidence.finalizing.json"
      || FINALIZATION_DRAFT.test(name)
      || name.startsWith("coordinator-")
    ));
    const residueCount = Number(state.network) + Number(state.volume) + Number(state.container)
      + transientNames.length + shared.openPools.size + shared.openGraphs.size + shared.retainedRealApplicationGraphs.size;
    return Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-fake-result.v3",
      status: finalReceipt?.status ?? "FAILED_NO_RECEIPT",
      code: finalReceipt?.code ?? firstCode ?? "local_postgres_fake_failed",
      cleanupStatus: finalReceipt?.cleanupStatus ?? "NOT_PROVEN",
      receipt: finalReceipt,
      firstReceipt,
      recoveryReceipt,
      actionCount: firstReceipt?.effects?.distinctDomainActionCount ?? 0,
      catalog: firstReceipt?.targetObservation?.catalogOutcome === "MATCHED"
        ? Object.freeze(selectKeys(firstReceipt.targetObservation, CATALOG_KEYS)) : null,
      databaseIdentityCount: firstReceipt?.effects?.databaseIdentityCount ?? 0,
      restartCount: firstReceipt?.effects?.containerRestartCount ?? 0,
      residueCount,
      transientLocalResidues: Object.freeze(transientNames.sort(binaryCompare)),
      openSyntheticPoolCount: shared.openPools.size,
      openSyntheticGraphCount: shared.openGraphs.size,
      realApplicationGraphCompositions: shared.realApplicationGraphCompositions,
      realApplicationGraphClosures: shared.realApplicationGraphClosures,
      realApplicationGraphCanaryConnects: shared.realApplicationGraphCanaryConnects,
      realApplicationGraphErrorCanaries: shared.realApplicationGraphErrorCanaries,
      retainedRealApplicationGraphCount: shared.retainedRealApplicationGraphs.size,
      physicalEffects: 0,
      requestedFault: stable.faultAt === undefined
        ? null
        : `${stable.faultAt}:${stable.faultEdge ?? "after"}#${stable.faultOccurrence ?? 1}`,
      faultInjected: firstFaultInjected,
      faultInjectionCount: firstController.faultInjectionCount,
      faultInjectionOccurrence: firstController.faultInjectionOccurrence,
      requestedCheckpointOccurrenceCount: stable.faultAt === undefined ? 0 : firstCheckpoints
        .filter((value) => value === `${stable.faultAt}:${stable.faultEdge ?? "after"}`).length,
      firstFailureCode: firstCode,
      recoveryAttempted,
      recoveryFailureCode: recoveryCode,
      sameRootContenderFailureCode: contenderFailureCode,
      sameRootContenderCheckpoints: contenderCheckpoints,
      finalizationContenderObservedCandidate,
      repeatReceipt,
      repeatReceiptMatches: repeatReceipt === null || finalReceipt === null
        ? null
        : canonicalJson(repeatReceipt) === canonicalJson(finalReceipt),
      concurrentRecoveryReceiptCount: concurrentRecoveryReceipts.filter((receipt) => receipt !== null).length,
      concurrentRecoveryReceiptsMatch: concurrentRecoveryReceipts.length === 0
        ? null
        : concurrentRecoveryReceipts.every((receipt) => receipt !== null
          && canonicalJson(receipt) === canonicalJson(concurrentRecoveryReceipts[0])),
      concurrentRecoveryRenameWinnerCount,
      concurrentRecoveryLoserReadbackCount,
      concurrentReplacementStagingFaultInjected,
      upstreamSnapshotReconcileObserved,
      reentrantDoorwayObserved,
      reentrantTerminalReadMatched,
      syntheticPortCalls: Object.freeze({
        socket: shared.syntheticSocketResolutions,
        docker: state.simulatedDockerPortCalls,
        pgDriverLoads: shared.pgDriverLoads,
        pgDriverResolved: shared.pgDriverResolved,
        poolOpens: shared.poolOpens,
      }),
      uniqueActions: Object.freeze([...new Set(shared.actions)].sort(binaryCompare)),
      checkpoints: firstCheckpoints,
      recoveryCheckpoints,
      preRecoverySnapshot,
      preRecoveryEvidenceSha256,
      postRecoverySnapshot,
      postRecoveryEvidenceSha256,
      rootReplacementInjected,
      displacedRootEntries,
      syntheticHostDriftTriggered: shared.syntheticHostDriftTriggered,
      receiptValidationResults,
      receiptValidationEvidenceUnchanged,
      cleanupLifecycleCeilingProbe,
      readinessTrace: Object.freeze([...shared.readinessTrace]),
    });
  } finally {
    try { fs.rmSync(privateRoot, { recursive: true, force: true }); } catch { /* temp-only fake teardown */ }
    try { fs.rmSync(displacedPhysicalRoot, { recursive: true, force: true }); } catch { /* temp-only fake teardown */ }
  }
}

export async function runLocalPostgresFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  const allowedKeys = new Set([
    "faultAt", "faultEdge", "faultOccurrence", "recoverCleanup", "sameRootConcurrency", "sameRootFinalizationConcurrency",
    "repeatTerminalEntry", "concurrentRecovery", "concurrentReplacementRecovery", "upstreamSnapshotReplacementRecovery",
    "reentrantDoorway", "initialReadinessFailures", "schemaFailureAt", "rollbackDatabaseFailureAt",
    "connectionGateMutation", "observationMutation", "ownerApprovalReceiptMutation", "recoveryClockMutation",
    "rootReplacementMutation",
    "hostDriftAt",
  ]);
  if (Object.keys(stable).some((key) => !allowedKeys.has(key))) fail("local_postgres_input_invalid");
  if (stable.recoverCleanup !== undefined && typeof stable.recoverCleanup !== "boolean") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.faultOccurrence !== undefined
    && (!Number.isSafeInteger(stable.faultOccurrence) || stable.faultOccurrence < 1 || stable.faultOccurrence > 512)) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.initialReadinessFailures !== undefined
    && (!Number.isSafeInteger(stable.initialReadinessFailures)
      || stable.initialReadinessFailures < 0 || stable.initialReadinessFailures > 59)) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.schemaFailureAt !== undefined && stable.schemaFailureAt !== "primary_initial") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.rollbackDatabaseFailureAt !== undefined && stable.rollbackDatabaseFailureAt !== "create") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.connectionGateMutation !== undefined
    && !["second_stream", "second_connect", "wrong_host", "wrong_port"].includes(stable.connectionGateMutation)) {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.observationMutation !== undefined && ![
    "image_cached_green", "image_cached_mismatch",
    "docker_client_version_mismatch", "docker_server_version_mismatch", "docker_platform_mismatch",
    "docker_client_version_unknown", "docker_server_version_unknown", "docker_platform_unknown", "docker_version_unknown",
    "image_pull_failed", "image_pull_ambiguous", "image_post_pull_missing", "image_post_pull_mismatch", "postgres_version_mismatch",
    "postgres_version_unknown", "catalog_mismatch", "catalog_unknown",
  ].includes(stable.observationMutation)) fail("local_postgres_fake_fault_invalid");
  if (stable.ownerApprovalReceiptMutation !== undefined
    && stable.ownerApprovalReceiptMutation !== "replace_before_cleanup_recovery") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.recoveryClockMutation !== undefined
    && stable.recoveryClockMutation !== "expired" && stable.recoveryClockMutation !== "rollback") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.rootReplacementMutation !== undefined
    && stable.rootReplacementMutation !== "after_grant_state_observed") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.hostDriftAt !== undefined) {
    const drift = stable.hostDriftAt;
    if (drift === null || typeof drift !== "object" || Array.isArray(drift)) {
      fail("local_postgres_fake_fault_invalid");
    }
    const driftKeys = Object.keys(drift).sort(binaryCompare);
    if (driftKeys.length !== 3 || driftKeys[0] !== "edge" || driftKeys[1] !== "kind" || driftKeys[2] !== "target") {
      fail("local_postgres_fake_fault_invalid");
    }
    if (typeof drift.kind !== "string" || typeof drift.target !== "string"
      || (drift.edge !== "before" && drift.edge !== "after")) fail("local_postgres_fake_fault_invalid");
  }
  if (stable.sameRootConcurrency !== undefined && typeof stable.sameRootConcurrency !== "boolean") {
    fail("local_postgres_fake_fault_invalid");
  }
  if (stable.sameRootFinalizationConcurrency !== undefined
    && typeof stable.sameRootFinalizationConcurrency !== "boolean") fail("local_postgres_fake_fault_invalid");
  for (const key of [
    "repeatTerminalEntry", "concurrentRecovery", "concurrentReplacementRecovery",
    "upstreamSnapshotReplacementRecovery", "reentrantDoorway",
  ]) {
    if (stable[key] !== undefined && typeof stable[key] !== "boolean") fail("local_postgres_fake_fault_invalid");
  }
  return executePhase1FakeCoordinator(stable);
}

export async function runLocalPostgresReceiptValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutations"]);
  if (!Array.isArray(stable.mutations) || stable.mutations.length < 1
    || stable.mutations.length > RECEIPT_VALIDATION_MUTATIONS.size
    || stable.mutations.some((mutation) => typeof mutation !== "string"
      || !RECEIPT_VALIDATION_MUTATIONS.has(mutation))
    || new Set(stable.mutations).size !== stable.mutations.length) {
    fail("local_postgres_fake_fault_invalid");
  }
  return executePhase1FakeCoordinator(Object.freeze({
    receiptValidationMutations: Object.freeze([...stable.mutations]),
  }));
}

export async function runLocalPostgresCleanupLifecycleFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, []);
  return executePhase1FakeCoordinator(Object.freeze({ cleanupLifecycleCeilingProbe: true }));
}

export function parseLocalPostgresRunnerArguments(argv) {
  const stable = ownedPlain(argv);
  if (stable.length === 1 && stable[0] === "fake") return Object.freeze({ mode: "fake" });
  if (stable.length === 11 && stable[0] === "prepare" && stable[1] === "--grant-root"
    && typeof stable[2] === "string" && path.isAbsolute(stable[2])
    && stable[3] === "--execution-review-head" && typeof stable[4] === "string" && GIT_OBJECT.test(stable[4])
    && stable[5] === "--owner-approval-receipt" && typeof stable[6] === "string" && path.isAbsolute(stable[6])
    && stable[7] === "--created-at" && typeof stable[8] === "string"
    && stable[9] === "--expires-at" && typeof stable[10] === "string") {
    instant(stable[8]); instant(stable[10]);
    return Object.freeze({
      mode: "prepare", privateRoot: stable[2], executionReviewHead: stable[4],
      ownerApprovalReceiptPath: stable[6], createdAt: stable[8], expiresAt: stable[10],
    });
  }
  if (stable.length === 5 && stable[0] === "physical" && stable[1] === "--grant-root"
    && typeof stable[2] === "string" && path.isAbsolute(stable[2]) && stable[3] === "--evidence-out"
    && typeof stable[4] === "string" && path.isAbsolute(stable[4])) {
    return Object.freeze({ mode: "physical", grantRoot: stable[2], evidenceOut: stable[4] });
  }
  fail("local_postgres_arguments_invalid");
}

/**
 * The physical engine is exported but remains unreachable until a valid v3
 * Physical Rebind wrapper and consumed grant are supplied. Phase 1 tests call
 * only the shared coordinator with private in-memory Docker/PG ports and a
 * synthetic 20-action application port. Each synthetic graph opening also
 * dynamically composes the real application/bridge/store/executor graph and
 * drives one fake-pool connection failure through its real error membrane;
 * this is a composition/error-path canary, not a claim that the 20 actions run
 * through real SQL. No operating-system Docker socket, daemon, PostgreSQL, SQL
 * engine, or network API is touched while constructing or testing these bytes.
 */
async function runLocalPostgresCoordinator(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantRoot", "evidenceOut"]);
  if (typeof stable.grantRoot !== "string" || !path.isAbsolute(stable.grantRoot)) fail("local_postgres_private_root_invalid");
  let privateRoot;
  try {
    privateRoot = fs.realpathSync(stable.grantRoot);
  } catch {
    fail("local_postgres_private_root_invalid");
  }
  if (privateRoot !== stable.grantRoot) fail("local_postgres_private_root_invalid");
  assertPrivateDirectory(privateRoot);
  const evidencePath = exactPhysicalEvidencePath(privateRoot, stable.evidenceOut);

  const pendingPath = privatePath(privateRoot, "grant.pending.json");
  const consumedPath = privatePath(privateRoot, "grant.consumed.json");
  let pendingExists = false;
  let consumedExists = false;
  let socket = null;
  let journalState = {
    sequence: 0,
    lastSha256: JOURNAL_GENESIS,
    dockerLifecycleCount: 0,
    cleanupProven: false,
  };
  let isolated = null;
  let pgRuntime = null;
  let secretPath = privatePath(privateRoot, "postgres-password");
  let passwordBytes = null;
  let password = null;
  let grant;
  let consumedGrantSha256;
  let cleanupOnly = false;
  let docker = null;
  let plan = null;
  let result = null;
  const progress = {
    imagePresent: null,
    imagePullAttempted: false,
    imagePulled: false,
    catalog: null,
    actionCount: 0,
    completedActions: new Set(),
    databaseIdentityAttemptCount: 0,
    databaseIdentityCount: 0,
    restartAttemptCount: 0,
    restartCount: 0,
    postgresServerVersionNum: null,
    initialReadinessAttemptCount: 0,
    restartReadinessAttemptCount: 0,
    journalEffect: null,
  };
  let failureCode = null;
  let cleanupStatus = "NOT_STARTED";
  let evidenceWrite = Object.freeze({
    priorEvidenceSha256: null,
    priorConsumedGrantSha256: null,
    exclusive: true,
  });
  let evidenceWritable = false;
  let localSetupStarted = false;
  let secretCreatedByThisRun = false;
  let validatedRecoveryState = false;
  let grantConsumptionStarted = false;
  let grantRecoveryRequired = false;
  let repairedConsumedAnchor = null;

  try {
    pendingExists = fs.existsSync(pendingPath);
    consumedExists = fs.existsSync(consumedPath);
    cleanupOnly = consumedExists;
    if (pendingExists && consumedExists) {
      try {
        const pendingStat = fs.lstatSync(pendingPath, { bigint: true });
        const consumedStat = fs.lstatSync(consumedPath, { bigint: true });
        if (!pendingStat.isFile() || !consumedStat.isFile() || pendingStat.dev !== consumedStat.dev
          || pendingStat.ino !== consumedStat.ino || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) {
          fail("local_postgres_grant_state_invalid");
        }
        // Preserve the two-link forensic state until the recovery bootstrap
        // has validated the grant, approval, bindings, journal and sole lease.
        pendingExists = false;
        consumedExists = true;
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
        fail("local_postgres_grant_state_invalid");
      }
    }
    if (pendingExists === consumedExists) fail("local_postgres_grant_state_invalid");
    evidenceWrite = preparePhysicalEvidenceWrite(evidencePath, consumedExists);
    evidenceWritable = evidenceWrite.exclusive;
    await adapters.checkpoint("grant.state_observed");
    if (consumedExists) {
      repairedConsumedAnchor = repairMissingConsumedJournalAnchor(
        privateRoot, adapters.activeLease, adapters.verifyBindings, adapters.syncCheckpoint,
      );
    }
    journalState = readJournalState(privateRoot);
    journalState.checkpoint = adapters.syncCheckpoint;
    journalState.nowIso = adapters.nowIso;
    journalState.cleanupOnly = cleanupOnly;
    await adapters.checkpoint("journal.loaded");
    if (consumedExists) {
      ({ grant, consumedGrantSha256 } = repairedConsumedAnchor
        ?? consumedGrantForCleanup(privateRoot, adapters.verifyBindings));
      journalState.grant = grant;
      if (journalState.consumedGrantSha256 !== consumedGrantSha256) fail("local_postgres_journal_invalid");
      if (evidenceWrite.priorConsumedGrantSha256 !== null
        && evidenceWrite.priorConsumedGrantSha256 !== consumedGrantSha256) {
        fail("local_postgres_evidence_path_invalid");
      }
      evidenceWritable = true;
      validatedRecoveryState = true;
      if (!journalState.cleanupProven) {
        socket = adapters.resolveSocketIdentity();
        await adapters.checkpoint("socket.resolved");
      }
    } else {
      socket = adapters.resolveSocketIdentity();
      await adapters.checkpoint("socket.resolved");
      const pendingGrant = validateLocalPostgresGrant(readPrivateJson(pendingPath));
      if (pendingGrant.host.socketIdentitySha256 !== socket.identitySha256) fail("local_postgres_socket_identity_drift");
      grant = pendingGrant;
      journalState.grant = grant;
      grantConsumptionStarted = true;
      ({ grant, consumedGrantSha256 } = await consumeLocalPostgresGrantWithVerifier(
        { privateRoot, now: adapters.nowIso() }, adapters.verifyBindings, adapters.checkpoint,
      ));
      journalState.grant = grant;
      appendPrivateJournal(privateRoot, journalState, "grant.consumed", { consumedGrantSha256 });
      validatedRecoveryState = true;
      await adapters.checkpoint("grant.consumed");
      localSetupStarted = true;
      isolated = ensureIsolatedDockerHome(privateRoot);
      exactFileAbsence(secretPath);
      passwordBytes = Buffer.from(crypto.randomBytes(32).toString("base64url"), "utf8");
      password = passwordBytes.toString("utf8");
      secretCreatedByThisRun = true;
      writePrivateBytes(secretPath, passwordBytes);
      await adapters.checkpoint("secret.written");
      pgRuntime = preparePgImportClosure(privateRoot);
      await adapters.checkpoint("pg_runtime.prepared");
    }
    if (socket !== null && grant.host.socketIdentitySha256 !== socket.identitySha256) fail("local_postgres_socket_identity_drift");
    journalState.revalidateHost = (kind, target, edge) => adapters.revalidateHost?.(grant, socket, kind, target, edge);
    if (!validatedRecoveryState) fail("local_postgres_grant_state_invalid");
    if (journalState.cleanupProven) {
      if (!cleanupOnly) fail("local_postgres_journal_invalid");
      exactFileAbsence(secretPath);
      exactFileAbsence(privatePath(privateRoot, "docker-home"));
      exactFileAbsence(privatePath(privateRoot, "docker-config"));
      exactFileAbsence(privatePath(privateRoot, "pg-runtime"));
      cleanupStatus = "PROVEN_ABSENT";
      result = Object.freeze({
        imagePulled: false,
        catalog: null,
        actionCount: 0,
        databaseIdentityCount: 0,
        restartCount: 0,
      });
    } else {
      if ((!cleanupOnly && journalState.constructionLifecycleCount !== 0)
        || (cleanupOnly && journalState.cleanupRecoveryLifecycleCount >= grant.ceilings.maximumCleanupRecoveryLifecycles)
        || journalState.dockerLifecycleCount >= grant.ceilings.maximumDockerLifecycles) {
        fail("local_postgres_docker_lifecycle_limit");
      }
      isolated ??= cleanupOnly ? ensureCleanupDockerHome(privateRoot) : ensureIsolatedDockerHome(privateRoot);
      plan = buildLocalPostgresDockerPlan({ grantId: grant.grantId, secretMountSource: secretPath });
      appendPrivateJournal(privateRoot, journalState, "docker.lifecycle_started", {
        mode: cleanupOnly ? "cleanup_recovery" : "construction",
        ordinal: journalState.dockerLifecycleCount + 1,
      });
      docker = adapters.createDockerPort(socket, isolated, plan, privateRoot, journalState, grant);
      await adapters.checkpoint("docker.port_created");
      if (journalState.observations.dockerCliIdentitySha256 === null) {
        recordObservation(privateRoot, journalState, "host.identity", Object.freeze({
          dockerCliIdentitySha256: grant.host.dockerCliIdentitySha256,
          socketIdentitySha256: grant.host.socketIdentitySha256,
        }));
      }

      if (cleanupOnly) {
        adapters.enterCleanup();
        journalState.inCleanup = true;
        completeOwnedCleanup(docker, plan, journalState, privateRoot, true);
        cleanupStatus = "PROVEN_ABSENT";
        result = Object.freeze({
          imagePulled: false,
          catalog: null,
          actionCount: 0,
          databaseIdentityCount: 0,
          restartCount: 0,
        });
      } else {
        progress.journalEffect = (kind, target, operation) => {
          const reservation = reserveEffect(privateRoot, journalState, kind, target);
          let value;
          try { value = operation(); } catch (error) { throw error; }
          if (value !== null && typeof value === "object" && typeof value.then === "function") {
            return value.then((result) => { completeEffect(privateRoot, journalState, reservation); return result; });
          }
          completeEffect(privateRoot, journalState, reservation);
          return value;
        };
        result = await adapters.performRun({
          grant, docker, plan, journalState, privateRoot, password, progress,
          pgRuntimeRoot: pgRuntime?.runtimeRoot ?? null,
        });
        assertPhysicalTerminalResult(result, progress);
        await adapters.checkpoint("lifecycle.completed");
      }
    }
  } catch (error) {
    const details = error !== null && (typeof error === "object" || typeof error === "function")
      ? ERROR_DETAILS.get(error) : null;
    failureCode = details?.code ?? "local_postgres_physical_failed";
  } finally {
    passwordBytes?.fill(0);
    password = null;
    if (grantConsumptionStarted) {
      try {
        const observed = probeGrantConsumptionState(privateRoot);
        if (observed.state === "consumed" || observed.state === "both_links") {
          consumedGrantSha256 = observed.consumedGrantSha256;
          const durable = readJournalState(privateRoot);
          if (durable.sequence === 0 || durable.consumedGrantSha256 !== consumedGrantSha256) {
            grantRecoveryRequired = true;
          }
        }
      } catch {
        grantRecoveryRequired = true;
      }
    }
    if (grantRecoveryRequired) {
      cleanupStatus = "BLOCKED";
      failureCode = "local_postgres_grant_recovery_required";
      evidenceWritable = false;
    } else if (!cleanupOnly && docker !== null && plan !== null) {
      try {
        adapters.enterCleanup();
        journalState.inCleanup = true;
        completeOwnedCleanup(docker, plan, journalState, privateRoot, false);
        cleanupStatus = "PROVEN_ABSENT";
        await adapters.checkpoint("cleanup.completed");
      } catch {
        cleanupStatus = "BLOCKED";
        failureCode ??= "local_postgres_cleanup_blocked";
      }
    } else if (!cleanupOnly && docker === null) {
      try {
        if (secretCreatedByThisRun) removePrivateFile(secretPath);
        if (localSetupStarted) cleanupIsolatedDockerHome(privateRoot);
        if (localSetupStarted) removeOwnedPrivateTree(privatePath(privateRoot, "pg-runtime"));
        if (validatedRecoveryState) {
          recordObservation(privateRoot, journalState, "cleanup.residue", Object.freeze({
            ownedContainerCount: 0, ownedNetworkCount: 0, ownedVolumeCount: 0,
            ownedCredentialCount: 0, ownedDockerConfigCount: 0, ownedImportedRuntimeCount: 0,
            activeCoordinatorResidueCount: 0,
          }));
        }
        cleanupStatus = "PROVEN_NO_DOCKER_ENTRY";
      } catch {
        cleanupStatus = "BLOCKED";
        failureCode ??= "local_postgres_cleanup_blocked";
      }
    } else if (cleanupOnly && cleanupStatus !== "PROVEN_ABSENT") {
      cleanupStatus = "BLOCKED";
      failureCode ??= "local_postgres_cleanup_blocked";
    }
  }

  if (cleanupOnly && failureCode === "local_postgres_docker_lifecycle_limit") {
    return Object.freeze({ receipt: null, evidencePath, evidenceWrite, evidenceWritable: false,
      terminalFailureCode: "local_postgres_docker_lifecycle_limit" });
  }
  const status = failureCode === null && cleanupStatus === "PROVEN_ABSENT"
    ? (cleanupOnly ? "CLEANUP_RECOVERED" : "GREEN")
    : "FAILED";
  if (grantRecoveryRequired) {
    return Object.freeze({ receipt: null, evidencePath, evidenceWrite, evidenceWritable: false,
      terminalFailureCode: "local_postgres_grant_recovery_required" });
  }
  const durableJournal = readJournalState(privateRoot);
  const ledger = durableJournal.effectLedger;
  const observations = durableJournal.observations;
  if (grant === undefined || consumedGrantSha256 === undefined) {
    return Object.freeze({ receipt: null, evidencePath, evidenceWrite, evidenceWritable: false,
      terminalFailureCode: failureCode ?? "local_postgres_grant_state_invalid" });
  }
  const receipt = canonicalRunnerReceipt({
    status, code: failureCode ?? (cleanupOnly ? "local_postgres_cleanup_recovered" : "local_postgres_physical_green"),
    cleanupStatus, priorEvidenceSha256: evidenceWrite.priorEvidenceSha256 ?? "NONE",
    consumedGrantSha256,
    authority: grant.authority,
    lineage: grant.lineage,
    artifacts: grant.artifacts,
    hostObservation: receiptHostObservation(observations),
    effects: receiptEffects(ledger, observations),
    targetObservation: Object.freeze({ ...observations.catalog }),
    cleanup: receiptCleanup(observations),
    journal: Object.freeze({ entryCount: durableJournal.sequence, headSha256: durableJournal.lastSha256 }),
    readiness: receiptReadiness(observations),
    coordinator: Object.freeze({ ownerIdentitySha256: `sha256:${"0".repeat(64)}`, leaseReleased: false, activeResidueCount: 0 }),
  });
  return Object.freeze({
    receipt,
    evidencePath,
    evidenceWrite,
    evidenceWritable,
    terminalFailureCode: status === "FAILED" ? (failureCode ?? "local_postgres_physical_failed") : null,
  });
}

const FINAL_RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "status", "code", "cleanupStatus", "priorEvidenceSha256", "consumedGrantSha256",
  "authority", "lineage", "artifacts", "hostObservation", "effects", "targetObservation", "cleanup",
  "journal", "readiness", "coordinator",
]);
const PHYSICAL_RECEIPT_CODES = new Set([
  "local_postgres_physical_green", "local_postgres_cleanup_recovered", "local_postgres_physical_failed",
  "local_postgres_cleanup_blocked", "local_postgres_cleanup_unproven", "local_postgres_docker_call_failed",
  "local_postgres_docker_contract_invalid",
  "local_postgres_docker_cli_drift", "local_postgres_docker_cli_invalid", "local_postgres_docker_version_invalid",
  "local_postgres_effect_ceiling_exceeded", "local_postgres_effect_clock_invalid", "local_postgres_image_identity_invalid",
  "local_postgres_image_platform_manifest_invalid", "local_postgres_catalog_mismatch", "local_postgres_server_version_mismatch",
  "local_postgres_readiness_failed", "local_postgres_connection_failed", "local_postgres_sql_execution_failed",
  "local_postgres_database_identity_invalid", "local_postgres_restart_replay_failed", "local_postgres_rollback_incomplete",
  "local_postgres_action_failed", "local_postgres_application_graph_failed", "local_postgres_application_graph_cleanup_failed",
  "local_postgres_grant_recovery_required", "local_postgres_journal_invalid", "local_postgres_socket_identity_drift",
  "local_postgres_fake_injected_fault", "local_postgres_fake_schema_failed", "local_postgres_fake_rollback_database_failed",
]);
const GREEN_DOCKER_CACHED = Object.freeze({
  version: 1, "image.inspect": 1, "image.pull": 0, "container.inspect": 4, "container.create": 1,
  "container.start": 2, "container.stop": 2, "container.rm": 1, "network.inspect": 3,
  "network.create": 1, "network.rm": 1, "volume.inspect": 3, "volume.create": 1, "volume.rm": 1,
});
const GREEN_DOCKER_PULLED = Object.freeze({ ...GREEN_DOCKER_CACHED, "image.inspect": 2, "image.pull": 1 });

function exactRecord(value, expected) { return canonicalJson(value) === canonicalJson(expected); }

function validateReceiptSemantics(receipt) {
  if (!PHYSICAL_RECEIPT_CODES.has(receipt.code) || receipt.consumedGrantSha256 === JOURNAL_GENESIS
    || receipt.priorEvidenceSha256 === JOURNAL_GENESIS) fail("local_postgres_evidence_path_invalid");
  const host = receipt.hostObservation;
  const effects = receipt.effects;
  const target = receipt.targetObservation;
  const cleanup = receipt.cleanup;
  if ((host.dockerCliIdentitySha256 !== null && !SHA256.test(host.dockerCliIdentitySha256))
    || (host.socketIdentitySha256 !== null && !SHA256.test(host.socketIdentitySha256))
    || !["29.3.1", "MISMATCH", "NOT_OBSERVED", "UNKNOWN"].includes(host.dockerClientVersion)
    || !["29.3.1", "MISMATCH", "NOT_OBSERVED", "UNKNOWN"].includes(host.dockerServerVersion)
    || ![IMAGE_PLATFORM, "MISMATCH", "NOT_OBSERVED", "UNKNOWN"].includes(host.dockerServerPlatform)
    || !["NOT_REQUIRED_CACHED", "COMPLETED", "FAILED", "AMBIGUOUS", "NOT_REACHED"].includes(host.imagePullOutcome)
    || !["VERIFIED_COMPLETE_PINNED", "PARTIAL_OR_UNKNOWN", "NOT_OBSERVED"].includes(host.imageCacheOutcome)
    || typeof host.imagePullAttempted !== "boolean"
    || ![160010, "MISMATCH", "NOT_OBSERVED", "UNKNOWN"].includes(host.postgresServerVersionNum)) {
    fail("local_postgres_evidence_path_invalid");
  }
  const imageTuple = [host.imageReference, host.imagePlatform, host.imagePlatformManifest];
  const matchedImageTuple = [IMAGE_REFERENCE, IMAGE_PLATFORM, IMAGE_PLATFORM_MANIFEST];
  const sentinelTuple = (sentinel) => imageTuple.every((value) => value === sentinel);
  if (host.imageCacheOutcome === "VERIFIED_COMPLETE_PINNED") {
    if (imageTuple.some((value, index) => value !== matchedImageTuple[index])) fail("local_postgres_evidence_path_invalid");
  } else if (host.imageCacheOutcome === "NOT_OBSERVED") {
    if (!sentinelTuple("NOT_OBSERVED")) fail("local_postgres_evidence_path_invalid");
  } else if (!imageTuple.every((value, index) => value === matchedImageTuple[index]
    || value === "MISMATCH" || value === "UNKNOWN" || value === "NOT_OBSERVED")) {
    fail("local_postgres_evidence_path_invalid");
  }
  if ((host.imagePullOutcome === "NOT_REQUIRED_CACHED" && host.imagePullAttempted !== false)
    || (["COMPLETED", "FAILED", "AMBIGUOUS"].includes(host.imagePullOutcome) && host.imagePullAttempted !== true)
    || (host.imagePullOutcome === "NOT_REACHED" && host.imagePullAttempted !== false)) {
    fail("local_postgres_evidence_path_invalid");
  }
  for (const [kind, count] of Object.entries(effects.dockerCallCounts)) {
    if (count > DOCKER_CALL_CEILINGS[kind]) fail("local_postgres_evidence_path_invalid");
  }
  const integerKeys = Object.keys(effects).filter((key) => typeof effects[key] === "number");
  for (const key of integerKeys) if (!Number.isSafeInteger(effects[key]) || effects[key] < 0) fail("local_postgres_evidence_path_invalid");
  for (const [attempt, completed] of [
    [effects.poolConstructionAttemptCount, effects.poolConstructionCount],
    [effects.databaseIdentityAttemptCount, effects.databaseIdentityCount],
    [effects.schemaApplyAttemptCount, effects.schemaApplyCount], [effects.verifyAttemptCount, effects.verifyCount],
    [effects.rollbackAttemptCount, effects.rollbackCount],
    [effects.domainActionInvocationAttemptCount, effects.domainActionInvocationCount],
    [effects.containerRestartAttemptCount, effects.containerRestartCount],
  ]) if (attempt < completed) fail("local_postgres_evidence_path_invalid");
  if (Object.values(effects.connectionTargetCounts).reduce((sum, value) => sum + value, 0) !== effects.connectionAttemptCount
    || effects.initialReadinessAttemptCount > 60 || effects.restartReadinessAttemptCount > 60
    || effects.poolConstructionAttemptCount > 124 || effects.connectionAttemptCount > 124
    || effects.databaseIdentityAttemptCount > 2 || effects.schemaApplyAttemptCount > 3 || effects.verifyAttemptCount > 3
    || effects.rollbackAttemptCount > 1 || effects.domainActionInvocationAttemptCount > 23
    || effects.distinctDomainActionAttemptCount > 20 || effects.distinctDomainActionCount > 20
    || effects.containerRestartAttemptCount > 1
    || effects.maximumObservedConcurrentPools > 1 || effects.maximumObservedConcurrentClients > 1
    || effects.maximumObservedConcurrentTransactions > 1) fail("local_postgres_evidence_path_invalid");
  for (const [count, digest] of [[effects.distinctDomainActionAttemptCount, effects.distinctDomainActionAttemptSetSha256], [effects.distinctDomainActionCount, effects.distinctDomainActionSetSha256]]) {
    if ((count === 0 && digest !== "NONE") || (count > 0 && !SHA256.test(digest))
      || (count === 20 && digest !== DOMAIN_ACTION_SET_SHA256)) fail("local_postgres_evidence_path_invalid");
  }
  const retained = ["grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json"];
  if (cleanup.retainedForensicFiles.length !== retained.length
    || cleanup.retainedForensicFiles.some((value, index) => value !== retained[index])) fail("local_postgres_evidence_path_invalid");
  const cleanupCountKeys = ["ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "ownedCredentialCount",
    "ownedDockerConfigCount", "ownedImportedRuntimeCount", "activeCoordinatorResidueCount"];
  for (const key of cleanupCountKeys) {
    if (!Number.isSafeInteger(cleanup[key]) || cleanup[key] < 0) fail("local_postgres_evidence_path_invalid");
  }
  if (typeof receipt.readiness.targetPostgresObserved !== "boolean"
    || receipt.readiness.targetPostgresObserved !== (host.postgresServerVersionNum === 160010)) {
    fail("local_postgres_evidence_path_invalid");
  }
  if (target.catalogOutcome === "MATCHED") {
    if (!exactRecord(target, Object.freeze({ catalogOutcome: "MATCHED", tables: 14, columns: 207,
      constraints: 172, indexes: 44, catalogContractSha256: CATALOG_CONTRACT_SHA256 }))) fail("local_postgres_evidence_path_invalid");
  } else if (target.catalogOutcome === "NOT_OBSERVED" || target.catalogOutcome === "UNKNOWN") {
    for (const key of ["tables", "columns", "constraints", "indexes", "catalogContractSha256"]) if (target[key] !== target.catalogOutcome) fail("local_postgres_evidence_path_invalid");
  } else if (target.catalogOutcome === "MISMATCH") {
    for (const key of ["tables", "columns", "constraints", "indexes"]) {
      if (target[key] !== "UNKNOWN" && (!Number.isSafeInteger(target[key]) || target[key] < 0)) {
        fail("local_postgres_evidence_path_invalid");
      }
    }
    if (target.catalogContractSha256 !== "MISMATCH" && target.catalogContractSha256 !== CATALOG_CONTRACT_SHA256) {
      fail("local_postgres_evidence_path_invalid");
    }
  } else fail("local_postgres_evidence_path_invalid");
  if (receipt.status === "GREEN") {
    const pulled = exactRecord(effects.dockerCallCounts, GREEN_DOCKER_PULLED);
    const cached = exactRecord(effects.dockerCallCounts, GREEN_DOCKER_CACHED);
    if (receipt.code !== "local_postgres_physical_green" || receipt.cleanupStatus !== "PROVEN_ABSENT"
      || (!pulled && !cached) || host.dockerClientVersion !== "29.3.1" || host.dockerServerVersion !== "29.3.1"
      || host.dockerServerPlatform !== IMAGE_PLATFORM || host.imageReference !== IMAGE_REFERENCE
      || host.imagePlatform !== IMAGE_PLATFORM || host.imagePlatformManifest !== IMAGE_PLATFORM_MANIFEST
      || host.imageCacheOutcome !== "VERIFIED_COMPLETE_PINNED" || host.postgresServerVersionNum !== 160010
      || (pulled && (host.imagePullAttempted !== true || host.imagePullOutcome !== "COMPLETED"))
      || (cached && (host.imagePullAttempted !== false || host.imagePullOutcome !== "NOT_REQUIRED_CACHED"))
      || target.catalogOutcome !== "MATCHED" || receipt.readiness.targetPostgresObserved !== true
      || effects.initialReadinessAttemptCount < 1 || effects.restartReadinessAttemptCount < 1
      || effects.poolConstructionAttemptCount !== effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 4
      || effects.poolConstructionCount !== effects.poolConstructionAttemptCount
      || effects.connectionAttemptCount !== effects.poolConstructionAttemptCount
      || effects.connectionTargetCounts.primary !== effects.initialReadinessAttemptCount + effects.restartReadinessAttemptCount + 2
      || effects.connectionTargetCounts.rollback !== 1 || effects.connectionTargetCounts.admin !== 1
      || effects.databaseIdentityAttemptCount !== 2 || effects.databaseIdentityCount !== 2
      || effects.schemaApplyAttemptCount !== 3 || effects.schemaApplyCount !== 3
      || effects.verifyAttemptCount !== 3 || effects.verifyCount !== 3 || effects.rollbackAttemptCount !== 1 || effects.rollbackCount !== 1
      || effects.domainActionInvocationAttemptCount !== 23 || effects.domainActionInvocationCount !== 23
      || effects.distinctDomainActionAttemptCount !== 20 || effects.distinctDomainActionCount !== 20
      || effects.containerRestartAttemptCount !== 1 || effects.containerRestartCount !== 1
      || effects.maximumObservedConcurrentPools !== 1 || effects.maximumObservedConcurrentClients !== 1
      || effects.maximumObservedConcurrentTransactions !== 1
      || Object.values(cleanup).some((value) => typeof value === "number" && value !== 0)
      || receipt.coordinator.leaseReleased !== true || receipt.coordinator.activeResidueCount !== 0) fail("local_postgres_evidence_path_invalid");
  } else if (receipt.status === "CLEANUP_RECOVERED") {
    if (receipt.code !== "local_postgres_cleanup_recovered" || receipt.cleanupStatus !== "PROVEN_ABSENT"
      || cleanupCountKeys.some((key) => cleanup[key] !== 0)
      || receipt.coordinator.leaseReleased !== true || receipt.coordinator.activeResidueCount !== 0) {
      fail("local_postgres_evidence_path_invalid");
    }
  } else if (receipt.code === "local_postgres_physical_green"
    || receipt.code === "local_postgres_cleanup_recovered") {
    fail("local_postgres_evidence_path_invalid");
  }
}

function finalizingReceipt(baseReceipt, lease) {
  const stable = ownedPlain(baseReceipt);
  const { schemaVersion, ...fields } = stable;
  if (schemaVersion !== "r4.public-core-local-postgres-physical-result.v3") fail("local_postgres_evidence_path_invalid");
  return canonicalRunnerReceipt({
    ...fields,
    coordinator: Object.freeze({
      ownerIdentitySha256: sha256Bytes(Buffer.from(canonicalJson(lease.owner), "utf8")),
      leaseReleased: true, activeResidueCount: 0,
    }),
  });
}

function exactReceiptKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("local_postgres_evidence_path_invalid");
  }
  const actual = Object.keys(value).sort(binaryCompare);
  const wanted = [...expected].sort(binaryCompare);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("local_postgres_evidence_path_invalid");
  }
}

function validateFinalizingReceipt(raw) {
  const receipt = ownedPlain(raw);
  exactReceiptKeys(receipt, FINAL_RECEIPT_KEYS);
  if (receipt.schemaVersion !== "r4.public-core-local-postgres-physical-result.v3"
    || (receipt.status !== "GREEN" && receipt.status !== "CLEANUP_RECOVERED" && receipt.status !== "FAILED")
    || typeof receipt.code !== "string" || !/^local_postgres_[a-z0-9_]{1,95}$/u.test(receipt.code)
    || (receipt.cleanupStatus !== "PROVEN_ABSENT" && receipt.cleanupStatus !== "PROVEN_NO_DOCKER_ENTRY"
      && receipt.cleanupStatus !== "BLOCKED" && receipt.cleanupStatus !== "NOT_STARTED")
    || (receipt.priorEvidenceSha256 !== "NONE" && !SHA256.test(receipt.priorEvidenceSha256))
    || !SHA256.test(receipt.consumedGrantSha256)) fail("local_postgres_evidence_path_invalid");
  exactReceiptKeys(receipt.authority, AUTHORITY_KEYS); exactReceiptKeys(receipt.lineage, LINEAGE_KEYS);
  exactReceiptKeys(receipt.artifacts, ARTIFACT_KEYS); exactReceiptKeys(receipt.artifacts.catalog, CATALOG_KEYS);
  exactReceiptKeys(receipt.hostObservation, ["dockerCliIdentitySha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform", "socketIdentitySha256", "imageReference", "imagePlatform", "imagePlatformManifest", "imagePullAttempted", "imagePullOutcome", "imageCacheOutcome", "postgresServerVersionNum"]);
  exactReceiptKeys(receipt.effects, ["dockerCallCounts", "initialReadinessAttemptCount", "restartReadinessAttemptCount", "poolConstructionAttemptCount", "poolConstructionCount", "connectionAttemptCount", "connectionTargetCounts", "databaseIdentityAttemptCount", "databaseIdentityCount", "schemaApplyAttemptCount", "schemaApplyCount", "verifyAttemptCount", "verifyCount", "rollbackAttemptCount", "rollbackCount", "domainActionInvocationAttemptCount", "domainActionInvocationCount", "distinctDomainActionAttemptCount", "distinctDomainActionAttemptSetSha256", "distinctDomainActionCount", "distinctDomainActionSetSha256", "containerRestartAttemptCount", "containerRestartCount", "maximumObservedConcurrentPools", "maximumObservedConcurrentClients", "maximumObservedConcurrentTransactions"]);
  exactReceiptKeys(receipt.effects.dockerCallCounts, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  exactReceiptKeys(receipt.effects.connectionTargetCounts, ["primary", "rollback", "admin"]);
  exactReceiptKeys(receipt.targetObservation, ["catalogOutcome", "tables", "columns", "constraints", "indexes", "catalogContractSha256"]);
  exactReceiptKeys(receipt.cleanup, ["ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "ownedCredentialCount", "ownedDockerConfigCount", "ownedImportedRuntimeCount", "activeCoordinatorResidueCount", "retainedForensicFiles"]);
  exactReceiptKeys(receipt.journal, ["entryCount", "headSha256"]);
  exactReceiptKeys(receipt.readiness, ["targetPostgresObserved", "productRuntimeEffects", "trafficReady", "gateCReady"]);
  exactReceiptKeys(receipt.coordinator, ["ownerIdentitySha256", "leaseReleased", "activeResidueCount"]);
  if (!SHA256.test(receipt.coordinator.ownerIdentitySha256) || receipt.coordinator.leaseReleased !== true
    || receipt.coordinator.activeResidueCount !== 0 || receipt.readiness.productRuntimeEffects !== false
    || receipt.readiness.trafficReady !== false || receipt.readiness.gateCReady !== false
    || !Number.isSafeInteger(receipt.journal.entryCount) || receipt.journal.entryCount < 0
    || !SHA256.test(receipt.journal.headSha256)) fail("local_postgres_evidence_path_invalid");
  for (const value of Object.values(receipt.effects)) {
    if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) fail("local_postgres_evidence_path_invalid");
  }
  for (const value of Object.values(receipt.effects.dockerCallCounts)) if (!Number.isSafeInteger(value) || value < 0) fail("local_postgres_evidence_path_invalid");
  for (const value of Object.values(receipt.effects.connectionTargetCounts)) if (!Number.isSafeInteger(value) || value < 0) fail("local_postgres_evidence_path_invalid");
  validateReceiptSemantics(receipt);
  return receipt;
}

function validateReceiptAgainstGrantAndJournal(receipt, grant, consumedGrantSha256, journal) {
  const stableReceipt = validateFinalizingReceipt(receipt);
  const stableGrant = ownedPlain(grant);
  const createdAt = instant(stableGrant.createdAt);
  validateLocalPostgresGrant(stableGrant, new Date(createdAt + 1));
  if (stableReceipt.consumedGrantSha256 !== consumedGrantSha256
    || journal.consumedGrantSha256 !== consumedGrantSha256
    || canonicalJson(stableReceipt.authority) !== canonicalJson(stableGrant.authority)
    || canonicalJson(stableReceipt.lineage) !== canonicalJson(stableGrant.lineage)
    || canonicalJson(stableReceipt.artifacts) !== canonicalJson(stableGrant.artifacts)
    || canonicalJson(stableReceipt.hostObservation) !== canonicalJson(receiptHostObservation(journal.observations))
    || canonicalJson(stableReceipt.effects) !== canonicalJson(receiptEffects(journal.effectLedger, journal.observations))
    || canonicalJson(stableReceipt.targetObservation) !== canonicalJson(journal.observations.catalog)
    || canonicalJson(stableReceipt.cleanup) !== canonicalJson(receiptCleanup(journal.observations))
    || stableReceipt.journal.entryCount !== journal.sequence
    || stableReceipt.journal.headSha256 !== journal.lastSha256
    || canonicalJson(stableReceipt.readiness) !== canonicalJson(receiptReadiness(journal.observations))
    || (journal.observations.dockerCliIdentitySha256 !== null
      && journal.observations.dockerCliIdentitySha256 !== stableGrant.host.dockerCliIdentitySha256)
    || (journal.observations.socketIdentitySha256 !== null
      && journal.observations.socketIdentitySha256 !== stableGrant.host.socketIdentitySha256)) {
    fail("local_postgres_evidence_path_invalid");
  }
  if (stableReceipt.status === "GREEN"
    && (stableReceipt.hostObservation.dockerCliIdentitySha256 !== stableGrant.host.dockerCliIdentitySha256
      || stableReceipt.hostObservation.socketIdentitySha256 !== stableGrant.host.socketIdentitySha256)) {
    fail("local_postgres_evidence_path_invalid");
  }
  return stableReceipt;
}

function validateCurrentReceiptAgainstPrivateState(privateRoot, rawReceipt) {
  const grantRecord = readPrivateJsonRecord(privatePath(privateRoot, "grant.consumed.json"));
  const grant = ownedPlain(grantRecord.value);
  return validateReceiptAgainstGrantAndJournal(
    rawReceipt, grant, grantRecord.sha256, readJournalState(privateRoot),
  );
}

function validateHistoricalReceiptAgainstPrivateState(privateRoot, record) {
  const receipt = validateFinalizingReceipt(record.value);
  const grantRecord = readPrivateJsonRecord(privatePath(privateRoot, "grant.consumed.json"));
  const grant = ownedPlain(grantRecord.value);
  const journal = readJournalState(privateRoot, receipt.journal);
  return validateReceiptAgainstGrantAndJournal(receipt, grant, grantRecord.sha256, journal);
}

function finalEvidenceIsTerminal(receipt) {
  return receipt.status === "GREEN" || receipt.status === "CLEANUP_RECOVERED"
    || (receipt.status === "FAILED"
      && (receipt.cleanupStatus === "PROVEN_ABSENT" || receipt.cleanupStatus === "PROVEN_NO_DOCKER_ENTRY"));
}

function reconcileExactPublishedReceipt(evidencePath, provisionalPath, targetReceipt) {
  // A concurrent publisher has completed only when the continuous provisional
  // barrier is gone and the final path contains this exact immutable target.
  exactFileAbsence(provisionalPath);
  const winner = validateCurrentReceiptAgainstPrivateState(path.dirname(evidencePath), readPrivateJson(evidencePath));
  if (canonicalJson(winner) !== canonicalJson(targetReceipt)) fail("local_postgres_evidence_path_invalid");
  return winner;
}

function publishFinalizingReceipt(privateRoot, evidencePath, provisionalPath, receipt, checkpoint = () => {}) {
  if (coordinatorDirectoryExists(evidencePath) && !coordinatorDirectoryExists(provisionalPath)) {
    return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
  }
  let record;
  try {
    record = readPrivateJsonRecord(provisionalPath);
  } catch (error) {
    if (!coordinatorDirectoryExists(provisionalPath)) {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
    throw error;
  }
  const observed = validateCurrentReceiptAgainstPrivateState(privateRoot, record.value);
  if (canonicalJson(observed) !== canonicalJson(receipt)) fail("local_postgres_evidence_path_invalid");
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const priorReceipt = validateHistoricalReceiptAgainstPrivateState(privateRoot, prior);
    if (prior.sha256 !== receipt.priorEvidenceSha256 || finalEvidenceIsTerminal(priorReceipt)) {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
  } else {
    if (receipt.priorEvidenceSha256 !== "NONE") fail("local_postgres_evidence_path_invalid");
    try {
      exactFileAbsence(evidencePath);
    } catch {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
  }
  try {
    checkpoint("evidence.publish", "before");
    fs.renameSync(provisionalPath, evidencePath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("evidence.publish", "after");
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") {
      return reconcileExactPublishedReceipt(evidencePath, provisionalPath, receipt);
    }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_evidence_path_invalid");
  }
  const committed = validateCurrentReceiptAgainstPrivateState(privateRoot, readPrivateJson(evidencePath));
  if (canonicalJson(committed) !== canonicalJson(receipt)) fail("local_postgres_evidence_path_invalid");
}

function receiptCoordinatorOwner(privateRoot, receipt) {
  const expected = receipt.coordinator.ownerIdentitySha256;
  if (!SHA256.test(expected)) fail("local_postgres_coordinator_lock_invalid");
  const matches = [];
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    if (!COORDINATOR_LEASE.test(name)) continue;
    const owner = inspectCoordinatorLeaseFile(privatePath(privateRoot, name));
    const identitySha256 = sha256Bytes(Buffer.from(canonicalJson(owner), "utf8"));
    if (identitySha256 === expected) matches.push(owner);
  }
  if (matches.length > 1) fail("local_postgres_coordinator_lock_invalid");
  return matches[0] ?? null;
}

function writeFinalizingReceiptAtomic(
  privateRoot,
  evidencePath,
  provisionalPath,
  receipt,
  lease,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  validateCurrentReceiptAgainstPrivateState(privateRoot, receipt);
  exactFileAbsence(provisionalPath);
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const priorReceipt = validateHistoricalReceiptAgainstPrivateState(privateRoot, prior);
    if (finalEvidenceIsTerminal(priorReceipt) || receipt.priorEvidenceSha256 !== prior.sha256) {
      fail("local_postgres_evidence_path_invalid");
    }
  } else if (receipt.priorEvidenceSha256 !== "NONE") {
    fail("local_postgres_evidence_path_invalid");
  }
  const candidate = privatePath(privateRoot, `physical-evidence-draft-${ownerIdentityFileStem(lease.owner)}.json`);
  try {
    writePrivateJson(candidate, receipt);
    validateCurrentReceiptAgainstPrivateState(privateRoot, readPrivateJson(candidate));
    checkpoint("evidence.provisional.install", "before");
    fs.renameSync(candidate, provisionalPath);
    fsyncPrivateDirectory(privateRoot);
    checkpoint("evidence.provisional.install", "after");
  } catch (error) {
    // A caught failure is still this writer's unique path and is removed
    // blindly; process-crash residue alone relies on filename liveness.
    removeOwnUniquePaths([candidate]);
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_evidence_path_invalid");
  }
}

function ownedCoordinatorResidueCount(privateRoot, owner) {
  const ownedNames = new Set([
    `coordinator-lease-${owner.ownerNonce}.json`,
    `coordinator-draft-${ownerIdentityFileStem(owner)}.json`,
    `physical-evidence-draft-${ownerIdentityFileStem(owner)}.json`,
  ]);
  return fs.readdirSync(privateRoot).filter((name) => ownedNames.has(name)).length;
}

function cleanupDeadForeignCoordinatorArtifactsAtTerminal(privateRoot, isAlive = coordinatorLeaseIsAlive) {
  let failed = false;
  for (const name of fs.readdirSync(privateRoot).sort(binaryCompare)) {
    const draft = COORDINATOR_DRAFT.exec(name) ?? FINALIZATION_DRAFT.exec(name);
    if (draft !== null) {
      const owner = ownerIdentityFromFilename(draft);
      try {
        if (!isAlive(owner)) removePrivateFile(privatePath(privateRoot, name));
      } catch { failed = true; }
      continue;
    }
    const lease = COORDINATOR_LEASE.exec(name);
    if (lease === null) continue;
    let owner;
    try { owner = inspectCoordinatorLeaseFile(privatePath(privateRoot, name)); } catch { failed = true; continue; }
    try {
      if (owner.ownerNonce === lease[1] && !isAlive(owner)) {
        unlinkCoordinatorLeaseFile(privatePath(privateRoot, name), owner.ownerNonce, true);
      }
    } catch { failed = true; }
  }
  if (failed) fail("local_postgres_coordinator_lock_invalid");
}

function assertTerminalForensicRoot(privateRoot) {
  const root = assertPrivateDirectory(privateRoot);
  const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : root.uid;
  if (fs.realpathSync(privateRoot) !== privateRoot) fail("local_postgres_cleanup_unproven");
  const expected = ["grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json"];
  const names = fs.readdirSync(privateRoot).sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_cleanup_unproven");
  }
  for (const name of expected) {
    const stat = fs.lstatSync(privatePath(privateRoot, name), { bigint: true });
    const mode = Number(stat.mode) & 0o777;
    if (stat.uid !== uid) fail("local_postgres_cleanup_unproven");
    if (name === "journal-v3") {
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.nlink < 2n || mode !== 0o700) fail("local_postgres_cleanup_unproven");
    } else if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || mode !== 0o600) {
      fail("local_postgres_cleanup_unproven");
    }
  }
  const grantRecord = readPrivateJsonRecord(privatePath(privateRoot, "grant.consumed.json"));
  const grant = ownedPlain(grantRecord.value);
  const createdAt = instant(grant.createdAt);
  validateLocalPostgresGrant(grant, new Date(createdAt + 1));
  if (readOwnerApprovalReceipt(privateRoot, privatePath(privateRoot, "owner-approval-receipt"), false)
    !== grant.ownerApprovalReceiptSha256) fail("local_postgres_cleanup_unproven");
  try {
    validateReceiptAgainstGrantAndJournal(
      readPrivateJson(privatePath(privateRoot, "physical-evidence.json")),
      grant, grantRecord.sha256, readJournalState(privateRoot),
    );
  } catch {
    fail("local_postgres_cleanup_unproven");
  }
}

function completeCoordinatorFinalization(
  privateRoot,
  evidencePath,
  allowCurrentOwner,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  const receipt = validateFinalizingReceipt(readPrivateJson(provisionalPath));
  const owner = receiptCoordinatorOwner(privateRoot, receipt);
  if (owner !== null && !allowCurrentOwner && isAlive(owner)) fail("local_postgres_coordinator_active");
  const leasePath = owner === null ? null : coordinatorLeasePath(privateRoot, owner.ownerNonce);
  if (leasePath !== null && coordinatorDirectoryExists(leasePath)) {
    try {
      const leaseOwner = inspectCoordinatorLeaseFile(leasePath);
      if (leaseOwner.pid !== owner.pid || leaseOwner.processStartIdentity !== owner.processStartIdentity
        || leaseOwner.ownerNonce !== owner.ownerNonce) fail("local_postgres_coordinator_lock_invalid");
      releaseCoordinatorLease(Object.freeze({ leasePath, owner: leaseOwner }), checkpoint);
    } catch (error) {
      if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
      if (coordinatorDirectoryExists(leasePath)) throw error;
    }
  }
  if (owner !== null) {
    exactFileAbsence(leasePath);
    discardOwnCoordinatorLease(privateRoot, owner);
    if (ownedCoordinatorResidueCount(privateRoot, owner) !== 0) fail("local_postgres_coordinator_lock_invalid");
  } else if (scanLiveCoordinatorLeases(privateRoot, isAlive).length !== 0) {
    fail("local_postgres_coordinator_active");
  }
  publishFinalizingReceipt(privateRoot, evidencePath, provisionalPath, receipt, checkpoint);
  if (owner !== null && ownedCoordinatorResidueCount(privateRoot, owner) !== receipt.coordinator.activeResidueCount) {
    fail("local_postgres_coordinator_lock_invalid");
  }
  cleanupDeadForeignCoordinatorArtifactsAtTerminal(privateRoot, isAlive);
  if (finalEvidenceIsTerminal(receipt)) assertTerminalForensicRoot(privateRoot);
  return receipt;
}

function terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (coordinatorDirectoryExists(provisionalPath)) return null;
    if (!coordinatorDirectoryExists(evidencePath)) return null;
    const current = validateFinalizingReceipt(readPrivateJson(evidencePath));
    if (coordinatorDirectoryExists(provisionalPath)) continue;
    return finalEvidenceIsTerminal(current) ? current : null;
  }
  fail("local_postgres_evidence_path_invalid");
}

function acceptRecoveredTerminal(privateRoot, receipt, isAlive) {
  cleanupDeadForeignCoordinatorArtifactsAtTerminal(privateRoot, isAlive);
  assertTerminalForensicRoot(privateRoot);
  return receipt;
}

function recoverCoordinatorFinalization(
  privateRoot,
  evidencePath,
  isAlive = coordinatorLeaseIsAlive,
  checkpoint = () => {},
) {
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  if (coordinatorDirectoryExists(evidencePath)) {
    const prior = readPrivateJsonRecord(evidencePath);
    const committed = coordinatorDirectoryExists(provisionalPath)
      ? validateHistoricalReceiptAgainstPrivateState(privateRoot, prior)
      : validateFinalizingReceipt(prior.value);
    checkpoint("evidence.recovery.snapshot", "after");
    if (coordinatorDirectoryExists(provisionalPath)) {
      let staged;
      try {
        staged = validateFinalizingReceipt(readPrivateJson(provisionalPath));
      } catch (error) {
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
      if (finalEvidenceIsTerminal(committed) || staged.priorEvidenceSha256 !== prior.sha256) {
        fail("local_postgres_evidence_path_invalid");
      }
      try {
        return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
    }
    if (finalEvidenceIsTerminal(committed)) {
      return acceptRecoveredTerminal(privateRoot, committed, isAlive);
    }
    const boundaryWinner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (boundaryWinner !== null) return acceptRecoveredTerminal(privateRoot, boundaryWinner, isAlive);
    if (coordinatorDirectoryExists(provisionalPath)) {
      try {
        return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
      } catch (error) {
        if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
        const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
        if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
        throw error;
      }
    }
    cleanupOwnerNamedDrafts(privateRoot, FINALIZATION_DRAFT, isAlive);
    if (scanLiveCoordinatorLeases(privateRoot, isAlive).length !== 0) fail("local_postgres_coordinator_active");
    const finalWinner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (finalWinner !== null) return acceptRecoveredTerminal(privateRoot, finalWinner, isAlive);
    if (coordinatorDirectoryExists(provisionalPath)) fail("local_postgres_coordinator_active");
    const refreshed = readPrivateJsonRecord(evidencePath);
    const refreshedReceipt = validateFinalizingReceipt(refreshed.value);
    if (finalEvidenceIsTerminal(refreshedReceipt)) {
      return acceptRecoveredTerminal(privateRoot, refreshedReceipt, isAlive);
    }
    if (refreshed.sha256 !== prior.sha256) fail("local_postgres_evidence_path_invalid");
    return null;
  }
  cleanupOwnerNamedDrafts(privateRoot, FINALIZATION_DRAFT, isAlive);
  if (!coordinatorDirectoryExists(provisionalPath)) {
    scanLiveCoordinatorLeases(privateRoot, isAlive);
    const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
    if (coordinatorDirectoryExists(evidencePath) || coordinatorDirectoryExists(provisionalPath)) {
      fail("local_postgres_coordinator_active");
    }
    return null;
  }
  try {
    return completeCoordinatorFinalization(privateRoot, evidencePath, false, checkpoint, isAlive);
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_fake_injected_fault") throw error;
    const winner = terminalWinnerAtRecoveryBoundary(evidencePath, provisionalPath);
    if (winner !== null) return acceptRecoveredTerminal(privateRoot, winner, isAlive);
    throw error;
  }
}

function stageAndFinalizeCoordinatorOutcome(
  privateRoot,
  evidencePath,
  lease,
  outcome,
  checkpoint = () => {},
  isAlive = coordinatorLeaseIsAlive,
) {
  if (outcome.evidenceWritable !== true) fail("local_postgres_evidence_path_invalid");
  const receipt = finalizingReceipt(outcome.receipt, lease);
  const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
  writeFinalizingReceiptAtomic(privateRoot, evidencePath, provisionalPath, receipt, lease, checkpoint, isAlive);
  return completeCoordinatorFinalization(privateRoot, evidencePath, true, checkpoint, isAlive);
}

async function runCoordinatorWithLease(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["grantRoot", "evidenceOut"]);
  if (typeof stable.grantRoot !== "string" || !path.isAbsolute(stable.grantRoot)) fail("local_postgres_private_root_invalid");
  let privateRoot;
  try { privateRoot = fs.realpathSync(stable.grantRoot); } catch { fail("local_postgres_private_root_invalid"); }
  if (privateRoot !== stable.grantRoot) fail("local_postgres_private_root_invalid");
  const rootIdentity = privateDirectoryIdentity(privateRoot);
  assertPrivateDirectoryIdentity(rootIdentity);
  const baseCheckpoint = adapters.checkpoint;
  const baseSyncCheckpoint = adapters.syncCheckpoint;
  const baseRevalidateHost = adapters.revalidateHost;
  const guardedAdapters = Object.freeze({
    ...adapters,
    rootIdentity,
    async checkpoint(name, edge = "after") {
      assertPrivateDirectoryIdentity(rootIdentity);
      await baseCheckpoint(name, edge);
      assertPrivateDirectoryIdentity(rootIdentity);
    },
    syncCheckpoint(name, edge = "after") {
      assertPrivateDirectoryIdentity(rootIdentity);
      baseSyncCheckpoint(name, edge);
      assertPrivateDirectoryIdentity(rootIdentity);
    },
    revalidateHost(grant, socket, kind, target, edge) {
      assertPrivateDirectoryIdentity(rootIdentity);
      baseRevalidateHost?.(grant, socket, kind, target, edge);
      assertPrivateDirectoryIdentity(rootIdentity);
    },
  });
  const evidencePath = exactPhysicalEvidencePath(privateRoot, stable.evidenceOut);
  assertPrivateDirectoryIdentity(rootIdentity);
  const recovered = recoverCoordinatorFinalization(
    privateRoot, evidencePath, guardedAdapters.isProcessAlive, guardedAdapters.syncCheckpoint,
  );
  assertPrivateDirectoryIdentity(rootIdentity);
  if (recovered !== null) {
    if (recovered.status === "FAILED") fail(recovered.code);
    return recovered;
  }
  const lease = await acquireCoordinatorLease(
    privateRoot, evidencePath, guardedAdapters.checkpoint, guardedAdapters.syncCheckpoint, guardedAdapters.isProcessAlive,
  );
  let outcome;
  try {
    assertPrivateDirectoryIdentity(rootIdentity);
    outcome = await runLocalPostgresCoordinator(stable, Object.freeze({ ...guardedAdapters, activeLease: lease }));
    assertPrivateDirectoryIdentity(rootIdentity);
  } catch (error) {
    try { releaseCoordinatorLease(lease, guardedAdapters.syncCheckpoint); } catch {
      if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_private_root_invalid") throw error;
      fail("local_postgres_coordinator_lock_invalid");
    }
    throw error;
  }
  if (outcome.evidenceWritable !== true) {
    releaseCoordinatorLease(lease, guardedAdapters.syncCheckpoint);
    fail(outcome.terminalFailureCode ?? "local_postgres_evidence_path_invalid");
  }
  let receipt;
  try {
    receipt = stageAndFinalizeCoordinatorOutcome(
      privateRoot, evidencePath, lease, outcome, guardedAdapters.syncCheckpoint, guardedAdapters.isProcessAlive,
    );
  } catch (error) {
    const provisionalPath = privatePath(privateRoot, "physical-evidence.finalizing.json");
    if (coordinatorDirectoryExists(provisionalPath)) {
      if (guardedAdapters.recoverCaughtFinalization !== false) {
        try {
          completeCoordinatorFinalization(
            privateRoot, evidencePath, true, guardedAdapters.syncCheckpoint, guardedAdapters.isProcessAlive,
          );
        } catch { /* bounded recovery remains on disk */ }
      }
    } else if (fs.readdirSync(privateRoot).some((name) => FINALIZATION_DRAFT.test(name))) {
      // A live owner keeps both its unique lease and owner-named torn draft;
      // only an exact dead-owner recovery may discard those bytes.
    } else if (coordinatorDirectoryExists(lease.leasePath)) {
      try { releaseCoordinatorLease(lease, guardedAdapters.syncCheckpoint); } catch { /* primary sanitized failure wins */ }
    }
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) throw error;
    fail("local_postgres_coordinator_lock_invalid");
  }
  if (outcome.terminalFailureCode !== null) fail(outcome.terminalFailureCode);
  return receipt;
}

export async function runApprovedLocalPostgresPhysical(input) {
  return runCoordinatorWithLease(input, Object.freeze({
      nowIso: () => new Date().toISOString(),
      resolveSocketIdentity: resolveDockerSocketIdentity,
      verifyBindings: verifyLocalPostgresCommittedBindings,
      createDockerPort,
      revalidateHost(grant, socket, _kind, _target, _edge) {
        const cli = observeDockerCliIdentity();
        if (cli.identitySha256 !== grant.host.dockerCliIdentitySha256) fail("local_postgres_docker_cli_drift");
        if (socket === null || socket.identitySha256 !== grant.host.socketIdentitySha256) fail("local_postgres_socket_identity_drift");
        revalidateDockerSocketIdentity(socket);
      },
      performRun: performNormalPhysicalRun,
      enterCleanup() {},
      async checkpoint() {},
      syncCheckpoint() {},
      isProcessAlive: coordinatorLeaseIsAlive,
      recoverCaughtFinalization: true,
  }));
}

async function direct() {
  const parsed = parseLocalPostgresRunnerArguments(process.argv.slice(2));
  if (parsed.mode === "fake") {
    process.stdout.write(`${canonicalJson(await runLocalPostgresFakePlan())}\n`);
    return;
  }
  if (parsed.mode === "prepare") {
    const { mode: _mode, ...input } = parsed;
    process.stdout.write(`${canonicalJson(prepareLocalPostgresPendingGrantV3(input))}\n`);
    return;
  }
  await runApprovedLocalPostgresPhysical({ grantRoot: parsed.grantRoot, evidenceOut: parsed.evidenceOut });
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  direct().catch((error) => {
    const code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed";
    process.stderr.write(`${canonicalJson({ schemaVersion: "r4.public-core-local-postgres-error.v3", code })}\n`);
    process.exitCode = 1;
  });
}
