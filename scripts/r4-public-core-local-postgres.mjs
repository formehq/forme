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
const APFS_CORRECTION_IMPLEMENTATION_HEAD = "18e3a325cceabdf5168b5ffb328ee2580b069a76";
const APFS_CORRECTION_IMPLEMENTATION_TREE = "184d9a4147fbb9baea22b1303ca24a09c2687a79";
const APFS_CORRECTION_IMPLEMENTATION_AGGREGATE_SHA256 = "sha256:56e2e3b10236e693bf7813c3c97e0acbb6c897123c37918cfda9d8609294e130";
const APFS_CORRECTION_RUNNER_SHA256 = "sha256:4383a52908d7d51d3cac8d549212fa0e7f80c61796123f38280a47421c169b75";
const APFS_CORRECTION_RUNNER_TEST_SHA256 = "sha256:8cc713943f973272aabfd5b3c3e838543e62a632f3917c2585239aac41c648f1";
const APFS_CORRECTION_EVIDENCE_HEAD = "32448cb962c823d39205cc83d11aa3f6571cf65d";
const APFS_CORRECTION_EVIDENCE_TREE = "02b377385a0e68a60021f878027f41ab34399f63";
const APFS_CORRECTION_ARTIFACT_INDEX_SHA256 = "sha256:d3b2ce01350636bbcd6fbde1ee938c6cd5c55f7b8d5e38e72fa4f6dbd5d67056";
const APFS_CORRECTION_EVIDENCE_SCHEMA_SHA256 = "sha256:1cbd487272b052ef9116e473249824476b954e4e07818eb7d90b6079ffd6826a";
const APFS_CORRECTION_EVIDENCE_SHA256 = "sha256:19788c80464ca23e03d5dab6aaf8d810c8541362f414e96d25ab7b9495a1300c";
const APFS_CORRECTION_STATUS_HEAD = "6c96f70b43315d5f9b72cb929dc530b36c4ddfde";
const APFS_CORRECTION_STATUS_TREE = "e08de32e58c5c05730d69280aae824cb2277ea33";
const APFS_CORRECTION_STATUS_AGGREGATE_SHA256 = "sha256:72fe493881c293e6ac60368b8ab490073de1e7c2609a9de83d534dd27ca39bdc";
const APFS_CORRECTION_REPORT_SHA256 = "sha256:0c462d2798c61c4a12a085e465f360c888b234e897fd0a3d8dd5c6e0c9e0e175";
const TOPOLOGY_CORRECTION_ADDENDUM_HEAD = "e61a2bb1817ac56c9377e161078f46543d8d2411";
const TOPOLOGY_CORRECTION_ADDENDUM_TREE = "88b35f39ce6e7d170309244930129911cc09b230";
const TOPOLOGY_CORRECTION_ADDENDUM_SHA256 = "sha256:5c0aaed3f0386b3501548631be9f514c0c1bfcea5ee283d0d152bcccc4e2db22";
const TOPOLOGY_CORRECTION_REVIEW_HEAD = "dd9759f8034042fe28ae7c24c7519dc480ffad37";
const TOPOLOGY_CORRECTION_REVIEW_TREE = "2dc809ea52e2e5d3d64346873e773ba55734de85";
const TOPOLOGY_CORRECTION_REVIEW_SHA256 = "sha256:ce5be9d958e45e05450a19d56aa093344f9e28003ca2534ecf0d13e72d3b9c2b";
const FAILED_V2_EXECUTION_CARD_HEAD = "7a533f4b2cc91070e7bd78cb6c70c1f28524ec38";
const FAILED_V2_EXECUTION_CARD_TREE = "6487d63ae0466c732f1a62ebe5e63f3067ff0e51";
const FAILED_V2_EXECUTION_CARD_SHA256 = "sha256:1ca420578f3e16c75b8242d71b93ea7be18baa1815c0f83e610807f9ded7c795";
const FAILED_V2_EXECUTION_REVIEW_HEAD = "6e67c1f1867d73f27674a5f056e0692c5b42d6a3";
const FAILED_V2_EXECUTION_REVIEW_TREE = "60b3d7b124968a20f6ec30700d389849dd277ab2";
const FAILED_V2_EXECUTION_REVIEW_SHA256 = "sha256:e92a125cdf1f8c4df8448836275bd98225ec8ce0b764dd70dfbabc479366e377";
const FAILED_V2_EXECUTION_PAYLOAD_SHA256 = "sha256:773a172f0d756b218de9ecfd7e9c2858a28b6ceb236474d103a4822a4203bf56";
const DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD = "56553e4a1e7bc65516f1f14cbac7e8fab2a53262";
const DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE = "45a8b295d5308766e2bf0a6f4715af0d5c5edaef";
const DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256 = "sha256:b85d2cd57322e050996e3ec943334e187c2ab29e9f68aff49e4cab66e297c8c9";
const DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD = "eb38eff55c2360b51df13dceb896680ec4440479";
const DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE = "96abe090ac364a973d1b9bc6edc3e5ea70af4d6e";
const DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256 = "sha256:1951a47f27bfb671e105a174f8a2dac3fe174a8bbf0ea36ed88620595939aed4";
const BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD = "931dbb7278bb06bf219ae7553b4317db415de0e7";
const BODY_FREE_DIAGNOSTIC_ADDENDUM_TREE = "22db25181c284d980f4e5d9cbf5cd5e3d7c6a725";
const BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256 = "sha256:790917ab0076e65c091117a67373d7e2d7c59c3690b786bc45fd588886529c13";
const BODY_FREE_DIAGNOSTIC_REVIEW_HEAD = "fcb1a5bc20832bdc63d0c7cfd6ff49ed1cf20e9e";
const BODY_FREE_DIAGNOSTIC_REVIEW_TREE = "1541a8dbd4d425b7faeebd66fa417a035f10f5b3";
const BODY_FREE_DIAGNOSTIC_REVIEW_SHA256 = "sha256:a3dbb56df2fefbb05eef9a1175c49b9afb1a83982909309d5ba230c735222579";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD = "0a9c30632d37bcdca82f7d8d92e0d5c6b841f2fb";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_TREE = "50e5bcc3b6dcec268f619e3b8399cc92e323da70";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256 = "sha256:b77a4149667d42952f57d14fdd3aa23c7fe89314b059da112393727d381a0c00";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD = "725b02338db4aa53517929c28912ef2092732631";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE = "e3a4d568a1c9ba9e47c87d01e4b7129687aa13f1";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256 = "sha256:a7448857f699507babb31477e67e6cf1491d3297a74ed1479de92300e00be1f7";
const FAILED_RESCUE_CARD_HEAD = "fa0a9bf05b9d9c897013d30ac6b2fdbb980da7c5";
const FAILED_RESCUE_CARD_TREE = "4bebb6ea518b9b86e0fed75b9b09925cfc013c91";
const FAILED_RESCUE_CARD_SHA256 = "sha256:131105860c2c94c25c62f17c0b64ff2f0f9f8c481563b9035953d4dca420bddf";
const FAILED_RESCUE_REVIEW_HEAD = "ac1dfea899f2edff6ec59dd401d8aec6256a485f";
const FAILED_RESCUE_REVIEW_TREE = "4c93a2bbe68efae13b4caaecfd3f39cdffb9964b";
const FAILED_RESCUE_REVIEW_SHA256 = "sha256:db692b6a074ec60d324ceede4a74136c26a3f53d3eba31c265d7a9f4297ed154";
const FAILED_RESCUE_AUTHORITY_PAYLOAD_SHA256 = "sha256:d88fdaacabeb893b0e321b8c5cea0c87da3dbd08a56a0d79a6d42ae455dd556e";
const FAILED_RESCUE_PRIVATE_ROOT = "/private/tmp/forme-r4-cleanup-rescue-VVZOVTGn";
const FAILED_RESCUE_PRIVATE_ROOT_IDENTITY = Object.freeze({ dev: "16777231", ino: "33273981", mode: "0700", uid: "501" });
const FAILED_RESCUE_OWNER_APPROVAL_RECEIPT_SHA256 = "sha256:21744a1ab338128f912f046159ef4ebdf74b197088bfa4973ff8d6a597e9475d";
const FAILED_RESCUE_OWNER_APPROVAL_RECEIPT_BYTES = 1085;
const FAILED_RESCUE_CONSUMED_GRANT_SHA256 = "sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654";
const FAILED_RESCUE_CONSUMED_GRANT_BYTES = 4796;
const FAILED_RESCUE_GRANT_ID = "c89d8f4e678dcf2778925af338bb1180";
const FAILED_RESCUE_EVIDENCE_SHA256 = "sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979";
const FAILED_RESCUE_EVIDENCE_BYTES = 5109;
const FAILED_RESCUE_JOURNAL_ENTRY_COUNT = 6;
const FAILED_RESCUE_JOURNAL_HEAD_SHA256 = "sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491";
const BLOCKED_OWNER_APPROVAL_RECEIPT_SHA256 = "sha256:d16d5482bc5f53ed109d5125fc2747afd786dd51bb35db27a245597811aef10c";
const BLOCKED_CONSUMED_GRANT_SHA256 = "sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35";
const BLOCKED_FIRST_EVIDENCE_SHA256 = "sha256:3cc212108bf966903fe964a1a73ad468dd506a2c2d473a9e1e916c558cfe02a7";
const BLOCKED_FINAL_EVIDENCE_SHA256 = "sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c";
const BLOCKED_JOURNAL_ENTRY_COUNT = 34;
const BLOCKED_JOURNAL_HEAD_SHA256 = "sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25";
const BLOCKED_GRANT_ID = "b92ae04555cc3d69a16c06ae53b30976";
const BLOCKED_PRIVATE_ROOT = "/private/tmp/forme-r4-pg-9ZGIOLeX";
const BLOCKED_PRIVATE_ROOT_IDENTITY = Object.freeze({ dev: "16777231", ino: "32871902", mode: "0700", uid: "501" });
const BLOCKED_OWNER_APPROVAL_RECEIPT_BYTES = 1083;
const BLOCKED_CONSUMED_GRANT_BYTES = 6356;
const BLOCKED_FINAL_EVIDENCE_BYTES = 7180;
const BLOCKED_RESOURCES = Object.freeze({
  runId: "b92ae04555cc3d69", container: "forme-r4-public-core-local-b92ae04555cc3d69",
  network: "forme-r4-public-core-local-net-b92ae04555cc3d69",
  volume: "forme-r4-public-core-local-vol-b92ae04555cc3d69",
  labelKey: "forme.r4.public-core.local.grant", labelValue: BLOCKED_GRANT_ID,
});
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
const FAILED_EXECUTION_CARD_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD.md";
const FAILED_EXECUTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW.md";
const FRESH_EXECUTION_CARD_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-CARD-V2.md";
const FRESH_EXECUTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-OWNER-REVIEW-V2.md";
const APFS_NLINK_CORRECTION_ADDENDUM_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-ADDENDUM.md";
const APFS_NLINK_CORRECTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-APFS-NLINK-CORRECTION-OWNER-REVIEW.md";
const TOPOLOGY_CORRECTION_ADDENDUM_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-ADDENDUM.md";
const TOPOLOGY_CORRECTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-OWNER-REVIEW.md";
const DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-ADDENDUM.md";
const DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-OWNER-REVIEW.md";
const BLOCKED_CLEANUP_RESCUE_CARD_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-CARD.md";
const BLOCKED_CLEANUP_RESCUE_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BLOCKED-CLEANUP-RESCUE-OWNER-REVIEW.md";
const BODY_FREE_DIAGNOSTIC_ADDENDUM_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-ADDENDUM.md";
const BODY_FREE_DIAGNOSTIC_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW.md";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-AUTHORITY-PATH-CORRECTION-ADDENDUM.md";
const BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-AUTHORITY-PATH-CORRECTION-OWNER-REVIEW.md";
const BODY_FREE_DIAGNOSTIC_CARD_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CARD-V1.md";
const BODY_FREE_DIAGNOSTIC_EXECUTION_REVIEW_PATH = "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-OWNER-REVIEW-V1.md";
const LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-apfs-nlink-correction.json",
  "schemas/r4/public-core/local-postgres-apfs-nlink-correction-artifact-index.json",
  "schemas/r4/public-core/local-postgres-apfs-nlink-correction-evidence.schema.json",
]);
const LOCAL_POSTGRES_APFS_CORRECTION_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md",
  "docs/README.md", "docs/ROADMAP.md", "docs/VALIDATION.md",
]);
const LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-execution-authority-topology-correction.json",
  "schemas/r4/public-core/local-postgres-execution-authority-topology-correction-artifact-index.json",
  "schemas/r4/public-core/local-postgres-execution-authority-topology-correction-evidence.schema.json",
]);
const LOCAL_POSTGRES_REBIND_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md",
  "docs/README.md", "docs/ROADMAP.md", "docs/VALIDATION.md",
]);
const LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-docker-diagnostic-rescue-correction.json",
  "schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-artifact-index.json",
  "schemas/r4/public-core/local-postgres-docker-diagnostic-rescue-correction-evidence.schema.json",
]);
const LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md",
  "docs/README.md", "docs/ROADMAP.md", "docs/VALIDATION.md",
]);
const LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS = Object.freeze([
  "docs/evidence/r4-public-core-local-postgres-body-free-docker-inspect-diagnostic.json",
  "schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-artifact-index.json",
  "schemas/r4/public-core/local-postgres-body-free-docker-inspect-diagnostic-evidence.schema.json",
]);
const LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_STATUS_PATHS = Object.freeze([
  "README.md", "docs/CONTROL.md", "docs/DECISIONS.md",
  "docs/NATIVE-HARNESS-ARCHITECTURE.md", "docs/PRODUCT.md",
  "docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md",
  "docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md",
  "docs/README.md", "docs/ROADMAP.md", "docs/VALIDATION.md",
]);

const CLEANUP_RESCUE_DOCKER_CALL_CEILINGS = Object.freeze({
  version: 1, "image.inspect": 0, "image.pull": 0,
  "container.inspect": 2, "container.create": 0, "container.start": 0,
  "container.stop": 1, "container.rm": 1,
  "network.inspect": 2, "network.create": 0, "network.rm": 1,
  "volume.inspect": 2, "volume.create": 0, "volume.rm": 1,
});
const CLEANUP_RESCUE_AUTHORITY_BEGIN = "R4_LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_AUTHORITY_V1_BEGIN";
const CLEANUP_RESCUE_AUTHORITY_END = "R4_LOCAL_POSTGRES_BLOCKED_CLEANUP_RESCUE_AUTHORITY_V1_END";
const CLEANUP_RESCUE_GRANT_KEYS = Object.freeze([
  "schemaVersion", "rescueGrantId", "ownerApprovalReceiptSha256", "authority", "lineage", "artifacts",
  "blocked", "host", "ceilings", "localOnly", "productionEffectsAllowed", "createdAt", "expiresAt",
]);
const CLEANUP_RESCUE_AUTHORITY_KEYS = Object.freeze([
  "correctionAddendumSha256", "correctionOwnerReviewSha256", "rescueCardSha256",
  "rescueOwnerReviewSha256", "rescueAuthorityPayloadSha256",
]);
const CLEANUP_RESCUE_PAYLOAD_AUTHORITY_KEYS = Object.freeze([
  "correctionAddendumSha256", "correctionOwnerReviewSha256",
]);
const CLEANUP_RESCUE_LINEAGE_KEYS = Object.freeze([
  "failedExecutionReviewHead", "failedExecutionReviewTree", "correctionAddendumHead", "correctionAddendumTree",
  "correctionOwnerReviewHead", "correctionOwnerReviewTree", "correctionImplementationHead",
  "correctionImplementationTree", "correctionImplementationArtifactAggregateSha256", "correctionEvidenceHead",
  "correctionEvidenceTree", "correctionStatusHead", "correctionStatusTree", "rescueCardHead", "rescueCardTree",
  "rescueOwnerReviewHead", "rescueOwnerReviewTree",
]);
const CLEANUP_RESCUE_PAYLOAD_LINEAGE_KEYS = Object.freeze(CLEANUP_RESCUE_LINEAGE_KEYS.slice(0, -4));
const CLEANUP_RESCUE_ARTIFACT_KEYS = Object.freeze([
  "correctionArtifactIndexSha256", "correctionEvidenceSchemaSha256", "correctionEvidenceSha256",
  "correctionReportSha256", "correctionStatusCommittedAuditSummarySha256", "runnerSha256", "runnerTestSha256",
]);
const CLEANUP_RESCUE_BLOCKED_KEYS = Object.freeze([
  "privateRoot", "rootDev", "rootIno", "rootMode", "rootUid", "rootEntries",
  "ownerApprovalReceiptSha256", "ownerApprovalReceiptBytes", "consumedGrantSha256", "consumedGrantBytes",
  "firstEvidenceSha256", "finalEvidenceSha256", "finalEvidenceBytes", "journalEntryCount",
  "journalHeadSha256", "grantId", "resources",
]);
const CLEANUP_RESCUE_RESOURCE_KEYS = Object.freeze(["runId", "container", "network", "volume", "labelKey", "labelValue"]);
const CLEANUP_RESCUE_HOST_KEYS = Object.freeze([
  "dockerCli", "dockerCliSha256", "dockerCliIdentitySha256", "socketIdentitySha256",
  "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const CLEANUP_RESCUE_PAYLOAD_HOST_KEYS = Object.freeze([
  "dockerCli", "dockerCliSha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const CLEANUP_RESCUE_CEILING_KEYS = Object.freeze(["maximumCleanupRescueLifecycles", "dockerCalls"]);
const CLEANUP_RESCUE_RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "status", "code", "cleanupStatus", "consumedRescueGrantSha256", "authority",
  "lineage", "artifacts", "blocked", "hostObservation", "effects", "cleanup", "journal", "readiness",
]);
const CLEANUP_RESCUE_RECEIPT_EFFECT_KEYS = Object.freeze(["dockerCallCounts"]);
const CLEANUP_RESCUE_RECEIPT_CLEANUP_KEYS = Object.freeze([
  "ownedContainerCount", "ownedNetworkCount", "ownedVolumeCount", "rescueLocalResidueCount",
  "oldForensicRootUnchanged", "retainedRescueForensicFiles",
]);
const CLEANUP_RESCUE_RECEIPT_HOST_KEYS = Object.freeze([
  "dockerCliIdentitySha256", "socketIdentitySha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const CLEANUP_RESCUE_RECEIPT_JOURNAL_KEYS = Object.freeze(["entryCount", "headSha256"]);
const CLEANUP_RESCUE_RECEIPT_READINESS_KEYS = Object.freeze([
  "cleanupRescueGreen", "physicalExecutionPerformed", "targetPostgresObserved", "productRuntimeEffects",
  "trafficReady", "gateCReady",
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

const BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS = Object.freeze({
  version: 1, "image.inspect": 0, "image.pull": 0,
  "container.inspect": 1, "container.create": 0, "container.start": 0,
  "container.stop": 0, "container.rm": 0,
  "network.inspect": 0, "network.create": 0, "network.rm": 0,
  "volume.inspect": 0, "volume.create": 0, "volume.rm": 0,
});
const BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN = "R4_LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_AUTHORITY_V1_BEGIN";
const BODY_FREE_DIAGNOSTIC_AUTHORITY_END = "R4_LOCAL_POSTGRES_BODY_FREE_DOCKER_INSPECT_DIAGNOSTIC_AUTHORITY_V1_END";
const BODY_FREE_DIAGNOSTIC_GRANT_KEYS = Object.freeze([
  "schemaVersion", "diagnosticGrantId", "ownerApprovalReceiptSha256", "authority", "lineage", "artifacts",
  "blocked", "failedRescue", "host", "ceilings", "localOnly", "productionEffectsAllowed", "createdAt", "expiresAt",
]);
const BODY_FREE_DIAGNOSTIC_AUTHORITY_KEYS = Object.freeze([
  "constructionAddendumSha256", "constructionOwnerReviewSha256", "pathCorrectionAddendumSha256",
  "pathCorrectionOwnerReviewSha256", "diagnosticCardSha256", "diagnosticOwnerReviewSha256",
  "diagnosticAuthorityPayloadSha256",
]);
const BODY_FREE_DIAGNOSTIC_PAYLOAD_AUTHORITY_KEYS = Object.freeze(BODY_FREE_DIAGNOSTIC_AUTHORITY_KEYS.slice(0, 4));
const BODY_FREE_DIAGNOSTIC_LINEAGE_KEYS = Object.freeze([
  "cleanupRescueOwnerReviewHead", "cleanupRescueOwnerReviewTree",
  "constructionAddendumHead", "constructionAddendumTree", "constructionOwnerReviewHead", "constructionOwnerReviewTree",
  "pathCorrectionAddendumHead", "pathCorrectionAddendumTree", "pathCorrectionOwnerReviewHead", "pathCorrectionOwnerReviewTree",
  "diagnosticImplementationHead", "diagnosticImplementationTree", "diagnosticImplementationArtifactAggregateSha256",
  "diagnosticEvidenceHead", "diagnosticEvidenceTree", "diagnosticStatusHead", "diagnosticStatusTree",
  "diagnosticCardHead", "diagnosticCardTree", "diagnosticOwnerReviewHead", "diagnosticOwnerReviewTree",
]);
const BODY_FREE_DIAGNOSTIC_PAYLOAD_LINEAGE_KEYS = Object.freeze(BODY_FREE_DIAGNOSTIC_LINEAGE_KEYS.slice(0, -4));
const BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS = Object.freeze([
  "diagnosticArtifactIndexSha256", "diagnosticEvidenceSchemaSha256", "diagnosticEvidenceSha256",
  "diagnosticReportSha256", "diagnosticStatusCommittedAuditSummarySha256", "runnerSha256", "runnerTestSha256",
]);
const BODY_FREE_DIAGNOSTIC_FAILED_RESCUE_KEYS = Object.freeze([
  "privateRoot", "rootDev", "rootIno", "rootMode", "rootUid", "rootEntries",
  "ownerApprovalReceiptSha256", "ownerApprovalReceiptBytes", "consumedGrantSha256", "consumedGrantBytes",
  "grantId", "finalEvidenceSha256", "finalEvidenceBytes", "journalEntryCount", "journalHeadSha256",
  "status", "code", "cleanupStatus", "dockerCallCounts", "oldForensicRootUnchanged",
]);
const BODY_FREE_DIAGNOSTIC_HOST_KEYS = Object.freeze([
  "dockerCli", "dockerCliSha256", "dockerCliIdentitySha256", "socketIdentitySha256",
  "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const BODY_FREE_DIAGNOSTIC_PAYLOAD_HOST_KEYS = Object.freeze([
  "dockerCli", "dockerCliSha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const BODY_FREE_DIAGNOSTIC_CEILING_KEYS = Object.freeze([
  "maximumDiagnosticLifecycles", "maximumOutputBytesPerStream", "dockerCalls",
]);
const BODY_FREE_DIAGNOSTIC_OBSERVATION_KEYS = Object.freeze([
  "effectId", "kind", "ordinal", "spawnOutcome", "exitStatus", "signal", "stdoutBytes", "stdoutSha256",
  "stdoutUtf8", "stdoutEmpty", "stdoutLineEndings", "stdoutLineCount", "stderrBytes", "stderrSha256",
  "stderrUtf8", "stderrEmpty", "stderrLineEndings", "stderrLineCount", "diagnosticClassification",
  "ownershipClassification",
]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "status", "code", "consumedDiagnosticGrantSha256", "authority", "lineage", "artifacts",
  "blocked", "failedRescue", "hostObservation", "effects", "observations", "closure", "journal", "readiness",
]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_HOST_KEYS = Object.freeze([
  "dockerCliIdentitySha256", "socketIdentitySha256", "dockerClientVersion", "dockerServerVersion", "dockerServerPlatform",
]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_EFFECT_KEYS = Object.freeze(["dockerCallCounts"]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_CLOSURE_KEYS = Object.freeze([
  "diagnosticLocalResidueCount", "blockedRootUnchanged", "failedRescueRootUnchanged", "retainedDiagnosticForensicFiles",
  "terminalReason",
]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_JOURNAL_KEYS = Object.freeze(["entryCount", "headSha256"]);
const BODY_FREE_DIAGNOSTIC_RECEIPT_READINESS_KEYS = Object.freeze([
  "diagnosticObservationCaptured", "resourceAbsenceProven", "cleanupRescueGreen", "physicalExecutionPerformed",
  "targetPostgresObserved", "productRuntimeEffects", "trafficReady", "gateCReady",
]);
export const LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_STAGES = Object.freeze([
  "INPUT", "PRIVATE_ROOT", "OWNER_APPROVAL_RECEIPT", "BLOCKED_ROOT_SNAPSHOT",
  "FAILED_RESCUE_ROOT_SNAPSHOT", "AUTHORITY", "DOCKER_CLI", "DOCKER_SOCKET", "TIME",
  "COMMITTED_BINDINGS", "PENDING_OPEN", "PENDING_WRITE", "PENDING_FILE_FSYNC",
  "PENDING_CLOSE", "PENDING_DIRECTORY_FSYNC", "PENDING_READBACK", "FINAL_ROOT",
  "PREPARE_RECEIPT", "PENDING_ROLLBACK",
]);
const BODY_FREE_DIAGNOSTIC_PREPARE_STAGE_SET = new Set(LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_PREPARE_STAGES);
const BODY_FREE_DIAGNOSTIC_PREPARE_FAILED = "local_postgres_body_free_diagnostic_prepare_failed";
const BODY_FREE_DIAGNOSTIC_PREPARE_ROLLBACK_FAILED = "local_postgres_body_free_diagnostic_prepare_rollback_failed";

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

function failBodyFreeDiagnosticPrepare(stage, rollback = false) {
  if (!BODY_FREE_DIAGNOSTIC_PREPARE_STAGE_SET.has(stage)) fail(BODY_FREE_DIAGNOSTIC_PREPARE_FAILED);
  const code = rollback ? BODY_FREE_DIAGNOSTIC_PREPARE_ROLLBACK_FAILED : BODY_FREE_DIAGNOSTIC_PREPARE_FAILED;
  const error = new LocalPostgresRunnerError(code);
  ERROR_DETAILS.set(error, Object.freeze({ code, prepareStage: stage }));
  throw error;
}

function bodyFreeDiagnosticPrepareError(error, stage, rollback = false) {
  const details = authenticLocalPostgresRunnerErrorDetails(error);
  if (details?.prepareStage !== undefined) throw error;
  failBodyFreeDiagnosticPrepare(stage, rollback);
}

function bodyFreeDiagnosticPrepareStage(adapters, stage, operation) {
  try {
    adapters.prepareCheckpoint?.(stage, "before");
    const result = operation();
    adapters.prepareCheckpoint?.(stage, "after");
    return result;
  } catch (error) {
    bodyFreeDiagnosticPrepareError(error, stage, stage === "PENDING_ROLLBACK");
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
  let failureStage = "PENDING_OPEN";
  const checkpoint = (name, stage, edge) => {
    failureStage = stage;
    hooks.checkpoint?.(name, edge);
  };
  try {
    checkpoint("pending.open", "PENDING_OPEN", "before");
    descriptor = fs.openSync(filePath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    const opened = fs.fstatSync(descriptor, { bigint: true });
    const uid = typeof process.getuid === "function" ? BigInt(process.getuid()) : opened.uid;
    if (!opened.isFile() || opened.uid !== uid || opened.nlink !== 1n || (Number(opened.mode) & 0o777) !== 0o600) {
      fail("local_postgres_private_file_invalid");
    }
    createdIdentity = Object.freeze({ dev: opened.dev, ino: opened.ino });
    checkpoint("pending.open", "PENDING_OPEN", "after");
    checkpoint("pending.write", "PENDING_WRITE", "before");
    fs.writeFileSync(descriptor, bytes);
    checkpoint("pending.write", "PENDING_WRITE", "after");
    checkpoint("pending.file_fsync", "PENDING_FILE_FSYNC", "before");
    fs.fsyncSync(descriptor);
    checkpoint("pending.file_fsync", "PENDING_FILE_FSYNC", "after");
    const written = fs.fstatSync(descriptor, { bigint: true });
    if (written.dev !== opened.dev || written.ino !== opened.ino || written.nlink !== 1n
      || written.size !== BigInt(bytes.length) || (Number(written.mode) & 0o777) !== 0o600) {
      fail("local_postgres_private_file_invalid");
    }
    checkpoint("pending.close", "PENDING_CLOSE", "before");
    fs.closeSync(descriptor);
    descriptor = undefined;
    checkpoint("pending.close", "PENDING_CLOSE", "after");
    checkpoint("pending.directory_fsync", "PENDING_DIRECTORY_FSYNC", "before");
    fsyncPrivateDirectory(privateRoot);
    checkpoint("pending.directory_fsync", "PENDING_DIRECTORY_FSYNC", "after");
    checkpoint("pending.readback", "PENDING_READBACK", "before");
    const installedRecord = readPrivateJsonRecord(filePath);
    const current = fs.lstatSync(filePath, { bigint: true });
    if (current.dev !== createdIdentity.dev || current.ino !== createdIdentity.ino || current.nlink !== 1n
      || installedRecord.sha256 !== sha256Bytes(bytes)) fail("local_postgres_private_file_invalid");
    checkpoint("pending.readback", "PENDING_READBACK", "after");
    installed = true;
    return Object.freeze({ identity: createdIdentity, sha256: installedRecord.sha256 });
  } catch (error) {
    if (typeof descriptor === "number") {
      try { fs.closeSync(descriptor); } catch { /* exact created inode cleanup below remains authoritative */ }
      descriptor = undefined;
    }
    if (createdIdentity !== null && !installed) {
      try {
        hooks.rollbackCheckpoint?.("PENDING_ROLLBACK", "before");
        const current = fs.lstatSync(filePath, { bigint: true });
        if (current.dev !== createdIdentity.dev || current.ino !== createdIdentity.ino || current.nlink !== 1n) {
          fail("local_postgres_private_file_invalid");
        }
        hooks.rollbackCheckpoint?.("PENDING_ROLLBACK", "after");
        fs.unlinkSync(filePath);
        fsyncPrivateDirectory(privateRoot);
        exactFileAbsence(filePath);
      } catch (cleanupError) {
        hooks.classifyFailure?.("PENDING_ROLLBACK", cleanupError, true);
        if (authenticLocalPostgresRunnerErrorDetails(cleanupError) !== null) throw cleanupError;
        fail("local_postgres_private_file_invalid");
      }
    }
    hooks.classifyFailure?.(failureStage, error, false);
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
    new Map([[FAILED_EXECUTION_CARD_PATH, "A"]]), "local_postgres_execution_card_binding_invalid");
  exactCommitStep(FAILED_EXECUTION_CARD_HEAD, FAILED_EXECUTION_REVIEW_HEAD, FAILED_EXECUTION_REVIEW_TREE,
    new Map([[FAILED_EXECUTION_REVIEW_PATH, "A"]]), "local_postgres_execution_review_binding_invalid");
  exactCommitStep(FAILED_EXECUTION_REVIEW_HEAD, APFS_NLINK_CORRECTION_ADDENDUM_HEAD, APFS_NLINK_CORRECTION_ADDENDUM_TREE,
    new Map([[APFS_NLINK_CORRECTION_ADDENDUM_PATH, "A"]]), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_NLINK_CORRECTION_ADDENDUM_HEAD, APFS_NLINK_CORRECTION_REVIEW_HEAD, APFS_NLINK_CORRECTION_REVIEW_TREE,
    new Map([[APFS_NLINK_CORRECTION_REVIEW_PATH, "A"]]), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_NLINK_CORRECTION_REVIEW_HEAD, APFS_CORRECTION_IMPLEMENTATION_HEAD, APFS_CORRECTION_IMPLEMENTATION_TREE,
    statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_CORRECTION_IMPLEMENTATION_HEAD, APFS_CORRECTION_EVIDENCE_HEAD, APFS_CORRECTION_EVIDENCE_TREE,
    statusMap(LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS, new Set(LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS)), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_CORRECTION_EVIDENCE_HEAD, APFS_CORRECTION_STATUS_HEAD, APFS_CORRECTION_STATUS_TREE,
    statusMap(LOCAL_POSTGRES_APFS_CORRECTION_STATUS_PATHS, new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md"])), "local_postgres_apfs_nlink_correction_binding_invalid");
  exactCommitStep(APFS_CORRECTION_STATUS_HEAD, TOPOLOGY_CORRECTION_ADDENDUM_HEAD, TOPOLOGY_CORRECTION_ADDENDUM_TREE,
    new Map([[TOPOLOGY_CORRECTION_ADDENDUM_PATH, "A"]]), "local_postgres_execution_topology_correction_binding_invalid");
  exactCommitStep(TOPOLOGY_CORRECTION_ADDENDUM_HEAD, TOPOLOGY_CORRECTION_REVIEW_HEAD, TOPOLOGY_CORRECTION_REVIEW_TREE,
    new Map([[TOPOLOGY_CORRECTION_REVIEW_PATH, "A"]]), "local_postgres_execution_topology_correction_binding_invalid");
  exactCommitStep(TOPOLOGY_CORRECTION_REVIEW_HEAD, lineage.rebindImplementationHead, lineage.rebindImplementationTree,
    statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS), "local_postgres_rebind_implementation_binding_invalid");
  exactCommitStep(lineage.rebindImplementationHead, lineage.rebindEvidenceHead, lineage.rebindEvidenceTree,
    statusMap(LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS, new Set(LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS)), "local_postgres_rebind_evidence_binding_invalid");
  exactCommitStep(lineage.rebindEvidenceHead, lineage.rebindStatusHead, lineage.rebindStatusTree,
    statusMap(LOCAL_POSTGRES_REBIND_STATUS_PATHS, new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md"])), "local_postgres_rebind_status_binding_invalid");
  exactCommitStep(lineage.rebindStatusHead, lineage.executionCardHead, lineage.executionCardTree,
    new Map([[FRESH_EXECUTION_CARD_PATH, "A"]]), "local_postgres_execution_card_binding_invalid");
  exactCommitStep(lineage.executionCardHead, lineage.executionReviewHead, lineage.executionReviewTree,
    new Map([[FRESH_EXECUTION_REVIEW_PATH, "A"]]), "local_postgres_execution_review_binding_invalid");
  const implementation = artifactAggregate(lineage.rebindImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const effect0Implementation = artifactAggregate(EFFECT0_IMPLEMENTATION_HEAD, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const apfsImplementation = artifactAggregate(APFS_CORRECTION_IMPLEMENTATION_HEAD, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const apfsStatus = artifactAggregate(APFS_CORRECTION_STATUS_HEAD, LOCAL_POSTGRES_APFS_CORRECTION_STATUS_PATHS);
  if (effect0Implementation.aggregateSha256 !== EFFECT0_IMPLEMENTATION_AGGREGATE_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[0]}`], true)) !== EFFECT0_EVIDENCE_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[1]}`], true)) !== EFFECT0_ARTIFACT_INDEX_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_EVIDENCE_HEAD}:${LOCAL_POSTGRES_EFFECT0_EVIDENCE_PATHS[2]}`], true)) !== EFFECT0_EVIDENCE_SCHEMA_SHA256
    || sha256Bytes(runGit(["show", `${EFFECT0_STATUS_HEAD}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-PHYSICAL-REBIND-CONSTRUCTION-REPORT.md`], true)) !== EFFECT0_REPORT_SHA256
    || sha256Bytes(runGit(["show", `${FAILED_EXECUTION_CARD_HEAD}:${FAILED_EXECUTION_CARD_PATH}`], true)) !== FAILED_EXECUTION_CARD_SHA256
    || sha256Bytes(runGit(["show", `${FAILED_EXECUTION_REVIEW_HEAD}:${FAILED_EXECUTION_REVIEW_PATH}`], true)) !== FAILED_EXECUTION_REVIEW_SHA256
    || sha256Bytes(runGit(["show", `${APFS_NLINK_CORRECTION_ADDENDUM_HEAD}:${APFS_NLINK_CORRECTION_ADDENDUM_PATH}`], true)) !== APFS_NLINK_CORRECTION_ADDENDUM_SHA256
    || sha256Bytes(runGit(["show", `${APFS_NLINK_CORRECTION_REVIEW_HEAD}:${APFS_NLINK_CORRECTION_REVIEW_PATH}`], true)) !== APFS_NLINK_CORRECTION_REVIEW_SHA256
    || apfsImplementation.aggregateSha256 !== APFS_CORRECTION_IMPLEMENTATION_AGGREGATE_SHA256
    || apfsImplementation.records[0].sha256 !== APFS_CORRECTION_RUNNER_SHA256
    || apfsImplementation.records[1].sha256 !== APFS_CORRECTION_RUNNER_TEST_SHA256
    || sha256Bytes(runGit(["show", `${APFS_CORRECTION_EVIDENCE_HEAD}:${LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS[0]}`], true)) !== APFS_CORRECTION_EVIDENCE_SHA256
    || sha256Bytes(runGit(["show", `${APFS_CORRECTION_EVIDENCE_HEAD}:${LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS[1]}`], true)) !== APFS_CORRECTION_ARTIFACT_INDEX_SHA256
    || sha256Bytes(runGit(["show", `${APFS_CORRECTION_EVIDENCE_HEAD}:${LOCAL_POSTGRES_APFS_CORRECTION_EVIDENCE_PATHS[2]}`], true)) !== APFS_CORRECTION_EVIDENCE_SCHEMA_SHA256
    || apfsStatus.aggregateSha256 !== APFS_CORRECTION_STATUS_AGGREGATE_SHA256
    || sha256Bytes(runGit(["show", `${APFS_CORRECTION_STATUS_HEAD}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-APFS-NLINK-CORRECTION-CONSTRUCTION-REPORT.md`], true)) !== APFS_CORRECTION_REPORT_SHA256
    || sha256Bytes(runGit(["show", `${TOPOLOGY_CORRECTION_ADDENDUM_HEAD}:${TOPOLOGY_CORRECTION_ADDENDUM_PATH}`], true)) !== TOPOLOGY_CORRECTION_ADDENDUM_SHA256
    || sha256Bytes(runGit(["show", `${TOPOLOGY_CORRECTION_REVIEW_HEAD}:${TOPOLOGY_CORRECTION_REVIEW_PATH}`], true)) !== TOPOLOGY_CORRECTION_REVIEW_SHA256
    || implementation.aggregateSha256 !== lineage.rebindImplementationArtifactAggregateSha256
    || implementation.records[0].sha256 !== grant.artifacts.runnerSha256
    || implementation.records[1].sha256 !== grant.artifacts.runnerTestSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[0]}`], true)) !== grant.artifacts.physicalRebindEvidenceSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[1]}`], true)) !== grant.artifacts.physicalRebindArtifactIndexSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindEvidenceHead}:${LOCAL_POSTGRES_REBIND_EVIDENCE_PATHS[2]}`], true)) !== grant.artifacts.physicalRebindEvidenceSchemaSha256
    || sha256Bytes(runGit(["show", `${lineage.rebindStatusHead}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-EXECUTION-AUTHORITY-TOPOLOGY-CORRECTION-CONSTRUCTION-REPORT.md`], true)) !== grant.artifacts.physicalRebindReportSha256
    || sha256Bytes(runGit(["show", `${lineage.executionCardHead}:${FRESH_EXECUTION_CARD_PATH}`], true)) !== grant.authority.executionCardSha256
    || sha256Bytes(runGit(["show", `${lineage.executionReviewHead}:${FRESH_EXECUTION_REVIEW_PATH}`], true)) !== grant.authority.executionReviewSha256) {
    fail("local_postgres_successor_binding_invalid");
  }
}

function verifyExecutionAuthorityPayloadAgainstGrant(grant) {
  const cardBytes = runGit(["show", `${grant.lineage.executionCardHead}:${FRESH_EXECUTION_CARD_PATH}`], true);
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
  const cardBytes = runGit(["show", `${executionCardHead}:${FRESH_EXECUTION_CARD_PATH}`], true);
  const parsed = parseExecutionAuthorityCard(cardBytes);
  for (const key of EXECUTION_PAYLOAD_LINEAGE_KEYS) if (parsed.payload.lineage[key] !== lineage[key]) fail("local_postgres_execution_authority_invalid");
  const authority = Object.freeze({
    ...parsed.payload.authority,
    executionCardSha256: sha256Bytes(cardBytes),
    executionReviewSha256: sha256Bytes(runGit(["show", `${executionReviewHead}:${FRESH_EXECUTION_REVIEW_PATH}`], true)),
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

function cleanupRescueBlockedContract() {
  return Object.freeze({
    privateRoot: BLOCKED_PRIVATE_ROOT,
    rootDev: BLOCKED_PRIVATE_ROOT_IDENTITY.dev,
    rootIno: BLOCKED_PRIVATE_ROOT_IDENTITY.ino,
    rootMode: BLOCKED_PRIVATE_ROOT_IDENTITY.mode,
    rootUid: BLOCKED_PRIVATE_ROOT_IDENTITY.uid,
    rootEntries: Object.freeze(["grant.consumed.json", "journal-v3", "owner-approval-receipt", "physical-evidence.json"]),
    ownerApprovalReceiptSha256: BLOCKED_OWNER_APPROVAL_RECEIPT_SHA256,
    ownerApprovalReceiptBytes: BLOCKED_OWNER_APPROVAL_RECEIPT_BYTES,
    consumedGrantSha256: BLOCKED_CONSUMED_GRANT_SHA256,
    consumedGrantBytes: BLOCKED_CONSUMED_GRANT_BYTES,
    firstEvidenceSha256: BLOCKED_FIRST_EVIDENCE_SHA256,
    finalEvidenceSha256: BLOCKED_FINAL_EVIDENCE_SHA256,
    finalEvidenceBytes: BLOCKED_FINAL_EVIDENCE_BYTES,
    journalEntryCount: BLOCKED_JOURNAL_ENTRY_COUNT,
    journalHeadSha256: BLOCKED_JOURNAL_HEAD_SHA256,
    grantId: BLOCKED_GRANT_ID,
    resources: BLOCKED_RESOURCES,
  });
}

function cleanupRescuePayloadHostContract() {
  return Object.freeze({
    dockerCli: DOCKER_CLI,
    dockerCliSha256: DOCKER_CLI_SHA256,
    dockerClientVersion: "29.3.1",
    dockerServerVersion: "29.3.1",
    dockerServerPlatform: IMAGE_PLATFORM,
  });
}

function cleanupRescueCeilings() {
  return Object.freeze({ maximumCleanupRescueLifecycles: 1, dockerCalls: CLEANUP_RESCUE_DOCKER_CALL_CEILINGS });
}

function assertCleanupRescueBlockedRecord(blocked, code = "local_postgres_cleanup_rescue_grant_invalid") {
  try {
    exactKeys(blocked, CLEANUP_RESCUE_BLOCKED_KEYS);
    exactKeys(blocked.resources, CLEANUP_RESCUE_RESOURCE_KEYS);
    const expected = cleanupRescueBlockedContract();
    for (const [key, value] of Object.entries(expected)) {
      if (key === "resources") assertFixedRecord(blocked.resources, expected.resources);
      else if (key === "rootEntries") {
        if (canonicalJson(blocked.rootEntries) !== canonicalJson(expected.rootEntries)) fail(code);
      }
      else if (blocked[key] !== value) fail(code);
    }
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) fail(code);
    fail(code);
  }
}

function validateCleanupRescueAuthorityPayloadUnchecked(rawPayload) {
  const payload = ownedPlain(rawPayload);
  exactKeys(payload, [
    "schemaVersion", "authority", "lineage", "artifacts", "blocked", "host", "ceilings",
    "localOnly", "productionEffectsAllowed",
  ]);
  if (payload.schemaVersion !== "r4.public-core-local-postgres-cleanup-rescue-authority.v1"
    || payload.localOnly !== true || payload.productionEffectsAllowed !== false) {
    fail("local_postgres_cleanup_rescue_authority_invalid");
  }
  exactKeys(payload.authority, CLEANUP_RESCUE_PAYLOAD_AUTHORITY_KEYS);
  exactKeys(payload.lineage, CLEANUP_RESCUE_PAYLOAD_LINEAGE_KEYS);
  exactKeys(payload.artifacts, CLEANUP_RESCUE_ARTIFACT_KEYS);
  exactKeys(payload.host, CLEANUP_RESCUE_PAYLOAD_HOST_KEYS);
  exactKeys(payload.ceilings, CLEANUP_RESCUE_CEILING_KEYS);
  exactKeys(payload.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  if (payload.authority.correctionAddendumSha256 !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256
    || payload.authority.correctionOwnerReviewSha256 !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256
    || payload.lineage.failedExecutionReviewHead !== FAILED_V2_EXECUTION_REVIEW_HEAD
    || payload.lineage.failedExecutionReviewTree !== FAILED_V2_EXECUTION_REVIEW_TREE
    || payload.lineage.correctionAddendumHead !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD
    || payload.lineage.correctionAddendumTree !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE
    || payload.lineage.correctionOwnerReviewHead !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD
    || payload.lineage.correctionOwnerReviewTree !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE) {
    fail("local_postgres_cleanup_rescue_authority_invalid");
  }
  for (const key of CLEANUP_RESCUE_PAYLOAD_LINEAGE_KEYS) {
    (key.endsWith("Sha256") ? assertSha(payload.lineage[key]) : assertGit(payload.lineage[key]));
  }
  for (const key of CLEANUP_RESCUE_ARTIFACT_KEYS) assertSha(payload.artifacts[key]);
  assertCleanupRescueBlockedRecord(payload.blocked, "local_postgres_cleanup_rescue_authority_invalid");
  assertFixedRecord(payload.host, cleanupRescuePayloadHostContract());
  if (payload.ceilings.maximumCleanupRescueLifecycles !== 1) fail("local_postgres_cleanup_rescue_authority_invalid");
  for (const [key, value] of Object.entries(CLEANUP_RESCUE_DOCKER_CALL_CEILINGS)) {
    if (payload.ceilings.dockerCalls[key] !== value) fail("local_postgres_cleanup_rescue_authority_invalid");
  }
  return payload;
}

function validateCleanupRescueAuthorityPayload(rawPayload) {
  try { return validateCleanupRescueAuthorityPayloadUnchecked(rawPayload); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_cleanup_rescue_authority_invalid") throw error;
    fail("local_postgres_cleanup_rescue_authority_invalid");
  }
}

function parseCleanupRescueAuthorityCard(bytes) {
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("local_postgres_cleanup_rescue_authority_invalid"); }
  const lines = source.split("\n");
  const begins = lines.flatMap((line, index) => line === CLEANUP_RESCUE_AUTHORITY_BEGIN ? [index] : []);
  const ends = lines.flatMap((line, index) => line === CLEANUP_RESCUE_AUTHORITY_END ? [index] : []);
  if (begins.length !== 1 || ends.length !== 1 || ends[0] !== begins[0] + 2) {
    fail("local_postgres_cleanup_rescue_authority_invalid");
  }
  const canonical = lines[begins[0] + 1];
  let parsed;
  try { parsed = parseStrictJson(canonical); }
  catch { fail("local_postgres_cleanup_rescue_authority_invalid"); }
  if (canonical.length === 0 || canonicalJson(parsed) !== canonical) fail("local_postgres_cleanup_rescue_authority_invalid");
  return Object.freeze({ payload: validateCleanupRescueAuthorityPayload(parsed), sha256: sha256Bytes(Buffer.from(canonical, "utf8")) });
}

function verifyCleanupRescueCorrectionBase() {
  exactCommitStep(FAILED_V2_EXECUTION_REVIEW_HEAD, DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD,
    DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE, new Map([[DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_PATH, "A"]]),
    "local_postgres_cleanup_rescue_binding_invalid");
  exactCommitStep(DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD, DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD,
    DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE, new Map([[DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_PATH, "A"]]),
    "local_postgres_cleanup_rescue_binding_invalid");
  if (sha256Bytes(runGit(["show", `${DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD}:${DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_PATH}`], true))
      !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256
    || sha256Bytes(runGit(["show", `${DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD}:${DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_PATH}`], true))
      !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256) {
    fail("local_postgres_cleanup_rescue_binding_invalid");
  }
}

function deriveCleanupRescueAuthority(rescueOwnerReviewHead) {
  assertGit(rescueOwnerReviewHead);
  verifyCleanupRescueCorrectionBase();
  const rescueCardHead = runGit(["rev-parse", `${rescueOwnerReviewHead}^`]);
  const correctionStatusHead = runGit(["rev-parse", `${rescueCardHead}^`]);
  const correctionEvidenceHead = runGit(["rev-parse", `${correctionStatusHead}^`]);
  const correctionImplementationHead = runGit(["rev-parse", `${correctionEvidenceHead}^`]);
  const lineage = Object.freeze({
    failedExecutionReviewHead: FAILED_V2_EXECUTION_REVIEW_HEAD,
    failedExecutionReviewTree: FAILED_V2_EXECUTION_REVIEW_TREE,
    correctionAddendumHead: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD,
    correctionAddendumTree: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE,
    correctionOwnerReviewHead: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD,
    correctionOwnerReviewTree: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE,
    correctionImplementationHead,
    correctionImplementationTree: runGit(["rev-parse", `${correctionImplementationHead}^{tree}`]),
    correctionImplementationArtifactAggregateSha256: artifactAggregate(
      correctionImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS,
    ).aggregateSha256,
    correctionEvidenceHead,
    correctionEvidenceTree: runGit(["rev-parse", `${correctionEvidenceHead}^{tree}`]),
    correctionStatusHead,
    correctionStatusTree: runGit(["rev-parse", `${correctionStatusHead}^{tree}`]),
    rescueCardHead,
    rescueCardTree: runGit(["rev-parse", `${rescueCardHead}^{tree}`]),
    rescueOwnerReviewHead,
    rescueOwnerReviewTree: runGit(["rev-parse", `${rescueOwnerReviewHead}^{tree}`]),
  });
  exactCommitStep(DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD, correctionImplementationHead,
    lineage.correctionImplementationTree, statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS),
    "local_postgres_cleanup_rescue_binding_invalid");
  exactCommitStep(correctionImplementationHead, correctionEvidenceHead, lineage.correctionEvidenceTree,
    statusMap(LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS, new Set(LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS)),
    "local_postgres_cleanup_rescue_binding_invalid");
  exactCommitStep(correctionEvidenceHead, correctionStatusHead, lineage.correctionStatusTree,
    statusMap(LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_STATUS_PATHS,
      new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md"])),
    "local_postgres_cleanup_rescue_binding_invalid");
  exactCommitStep(correctionStatusHead, rescueCardHead, lineage.rescueCardTree,
    new Map([[BLOCKED_CLEANUP_RESCUE_CARD_PATH, "A"]]), "local_postgres_cleanup_rescue_binding_invalid");
  exactCommitStep(rescueCardHead, rescueOwnerReviewHead, lineage.rescueOwnerReviewTree,
    new Map([[BLOCKED_CLEANUP_RESCUE_REVIEW_PATH, "A"]]), "local_postgres_cleanup_rescue_binding_invalid");
  const cardBytes = runGit(["show", `${rescueCardHead}:${BLOCKED_CLEANUP_RESCUE_CARD_PATH}`], true);
  const reviewBytes = runGit(["show", `${rescueOwnerReviewHead}:${BLOCKED_CLEANUP_RESCUE_REVIEW_PATH}`], true);
  const parsed = parseCleanupRescueAuthorityCard(cardBytes);
  if (canonicalJson(parsed.payload.lineage) !== canonicalJson(selectKeys(lineage, CLEANUP_RESCUE_PAYLOAD_LINEAGE_KEYS))) {
    fail("local_postgres_cleanup_rescue_authority_invalid");
  }
  const implementation = artifactAggregate(correctionImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const expectedArtifacts = Object.freeze({
    correctionArtifactIndexSha256: sha256Bytes(runGit(["show", `${correctionEvidenceHead}:${LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS[1]}`], true)),
    correctionEvidenceSchemaSha256: sha256Bytes(runGit(["show", `${correctionEvidenceHead}:${LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS[2]}`], true)),
    correctionEvidenceSha256: sha256Bytes(runGit(["show", `${correctionEvidenceHead}:${LOCAL_POSTGRES_DIAGNOSTIC_RESCUE_EVIDENCE_PATHS[0]}`], true)),
    correctionReportSha256: sha256Bytes(runGit(["show", `${correctionStatusHead}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-DOCKER-DIAGNOSTIC-RESCUE-CORRECTION-CONSTRUCTION-REPORT.md`], true)),
    correctionStatusCommittedAuditSummarySha256: parsed.payload.artifacts.correctionStatusCommittedAuditSummarySha256,
    runnerSha256: implementation.records[0].sha256,
    runnerTestSha256: implementation.records[1].sha256,
  });
  if (implementation.aggregateSha256 !== lineage.correctionImplementationArtifactAggregateSha256
    || canonicalJson(parsed.payload.artifacts) !== canonicalJson(expectedArtifacts)) {
    fail("local_postgres_cleanup_rescue_binding_invalid");
  }
  return Object.freeze({
    authority: Object.freeze({
      correctionAddendumSha256: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256,
      correctionOwnerReviewSha256: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256,
      rescueCardSha256: sha256Bytes(cardBytes),
      rescueOwnerReviewSha256: sha256Bytes(reviewBytes),
      rescueAuthorityPayloadSha256: parsed.sha256,
    }),
    lineage, artifacts: expectedArtifacts, blocked: cleanupRescueBlockedContract(),
    host: cleanupRescuePayloadHostContract(), ceilings: cleanupRescueCeilings(),
  });
}

function validateLocalPostgresCleanupRescueGrantUnchecked(rawGrant, now = new Date()) {
  const grant = ownedPlain(rawGrant);
  exactKeys(grant, CLEANUP_RESCUE_GRANT_KEYS);
  if (grant.schemaVersion !== "r4.public-core-local-postgres-cleanup-rescue-grant.v1"
    || typeof grant.rescueGrantId !== "string" || !GRANT_ID.test(grant.rescueGrantId)
    || grant.localOnly !== true || grant.productionEffectsAllowed !== false) {
    fail("local_postgres_cleanup_rescue_grant_invalid");
  }
  exactKeys(grant.authority, CLEANUP_RESCUE_AUTHORITY_KEYS);
  exactKeys(grant.lineage, CLEANUP_RESCUE_LINEAGE_KEYS);
  exactKeys(grant.artifacts, CLEANUP_RESCUE_ARTIFACT_KEYS);
  exactKeys(grant.host, CLEANUP_RESCUE_HOST_KEYS);
  exactKeys(grant.ceilings, CLEANUP_RESCUE_CEILING_KEYS);
  exactKeys(grant.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  assertSha(grant.ownerApprovalReceiptSha256);
  for (const key of CLEANUP_RESCUE_AUTHORITY_KEYS) assertSha(grant.authority[key]);
  for (const key of CLEANUP_RESCUE_LINEAGE_KEYS) {
    (key.endsWith("Sha256") ? assertSha(grant.lineage[key]) : assertGit(grant.lineage[key]));
  }
  for (const key of CLEANUP_RESCUE_ARTIFACT_KEYS) assertSha(grant.artifacts[key]);
  assertSha(grant.host.dockerCliSha256); assertSha(grant.host.dockerCliIdentitySha256); assertSha(grant.host.socketIdentitySha256);
  if (grant.authority.correctionAddendumSha256 !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256
    || grant.authority.correctionOwnerReviewSha256 !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256
    || grant.lineage.failedExecutionReviewHead !== FAILED_V2_EXECUTION_REVIEW_HEAD
    || grant.lineage.failedExecutionReviewTree !== FAILED_V2_EXECUTION_REVIEW_TREE
    || grant.lineage.correctionAddendumHead !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD
    || grant.lineage.correctionAddendumTree !== DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE
    || grant.lineage.correctionOwnerReviewHead !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD
    || grant.lineage.correctionOwnerReviewTree !== DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE) {
    fail("local_postgres_cleanup_rescue_grant_invalid");
  }
  assertCleanupRescueBlockedRecord(grant.blocked);
  assertFixedRecord(selectKeys(grant.host, CLEANUP_RESCUE_PAYLOAD_HOST_KEYS), cleanupRescuePayloadHostContract());
  if (grant.ceilings.maximumCleanupRescueLifecycles !== 1) fail("local_postgres_cleanup_rescue_grant_invalid");
  for (const [key, value] of Object.entries(CLEANUP_RESCUE_DOCKER_CALL_CEILINGS)) {
    if (grant.ceilings.dockerCalls[key] !== value) fail("local_postgres_cleanup_rescue_grant_invalid");
  }
  const createdAt = instant(grant.createdAt);
  const expiresAt = instant(grant.expiresAt);
  const observedAt = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(observedAt) || expiresAt <= createdAt || expiresAt - createdAt > MAX_GRANT_LIFETIME_MS
    || observedAt < createdAt - 60_000 || observedAt >= expiresAt) fail("local_postgres_cleanup_rescue_grant_expired");
  return grant;
}

export function validateLocalPostgresCleanupRescueGrant(rawGrant, now = new Date()) {
  try { return validateLocalPostgresCleanupRescueGrantUnchecked(rawGrant, now); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_cleanup_rescue_grant_expired") throw error;
    fail("local_postgres_cleanup_rescue_grant_invalid");
  }
}

function readBlockedJournalSnapshot(blockedRoot) {
  const journalPath = privatePath(blockedRoot, JOURNAL_DIRECTORY);
  assertPrivateDirectory(journalPath);
  const names = fs.readdirSync(journalPath).sort(binaryCompare);
  const expected = Array.from({ length: BLOCKED_JOURNAL_ENTRY_COUNT }, (_, index) => `entry-${String(index + 1).padStart(6, "0")}.json`);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  let previous = JOURNAL_GENESIS;
  for (let index = 0; index < names.length; index += 1) {
    const record = ownedPlain(readPrivateJsonRecord(path.join(journalPath, names[index])).value);
    exactKeys(record, ["schemaVersion", "sequence", "previousSha256", "event", "detail", "entrySha256"]);
    if (record.schemaVersion !== "r4.public-core-local-postgres-journal-entry.v3"
      || record.sequence !== index + 1 || record.previousSha256 !== previous || typeof record.event !== "string") {
      fail("local_postgres_cleanup_rescue_forensic_drift");
    }
    const expectedSha = sha256Bytes(Buffer.from(canonicalJson({
      schemaVersion: record.schemaVersion, sequence: record.sequence, previousSha256: record.previousSha256,
      event: record.event, detail: record.detail,
    }), "utf8"));
    if (record.entrySha256 !== expectedSha) fail("local_postgres_cleanup_rescue_forensic_drift");
    previous = record.entrySha256;
  }
  if (previous !== BLOCKED_JOURNAL_HEAD_SHA256) fail("local_postgres_cleanup_rescue_forensic_drift");
  return Object.freeze({ entryCount: names.length, headSha256: previous });
}

function inspectBlockedForensicRoot(blockedRoot = BLOCKED_PRIVATE_ROOT) {
  if (blockedRoot !== BLOCKED_PRIVATE_ROOT) fail("local_postgres_cleanup_rescue_forensic_drift");
  let resolved;
  try { resolved = fs.realpathSync(blockedRoot); } catch { fail("local_postgres_cleanup_rescue_forensic_drift"); }
  if (resolved !== blockedRoot) fail("local_postgres_cleanup_rescue_forensic_drift");
  const rootStat = assertPrivateDirectory(blockedRoot);
  const rootIdentity = privateDirectoryIdentity(blockedRoot, rootStat);
  if (rootStat.dev.toString(10) !== BLOCKED_PRIVATE_ROOT_IDENTITY.dev
    || rootStat.ino.toString(10) !== BLOCKED_PRIVATE_ROOT_IDENTITY.ino
    || (Number(rootStat.mode) & 0o777).toString(8).padStart(4, "0") !== BLOCKED_PRIVATE_ROOT_IDENTITY.mode
    || rootStat.uid.toString(10) !== BLOCKED_PRIVATE_ROOT_IDENTITY.uid) {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  const names = fs.readdirSync(blockedRoot).sort(binaryCompare);
  const expected = ["grant.consumed.json", JOURNAL_DIRECTORY, "owner-approval-receipt", "physical-evidence.json"].sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  const ownerPath = privatePath(blockedRoot, "owner-approval-receipt");
  const ownerStat = fs.lstatSync(ownerPath, { bigint: true });
  const ownerSha = readOwnerApprovalReceipt(blockedRoot, ownerPath, false);
  const consumedPath = privatePath(blockedRoot, "grant.consumed.json");
  const consumedStat = fs.lstatSync(consumedPath, { bigint: true });
  const consumed = readPrivateJsonRecord(consumedPath);
  const evidencePath = privatePath(blockedRoot, "physical-evidence.json");
  const evidenceStat = fs.lstatSync(evidencePath, { bigint: true });
  const evidence = readPrivateJsonRecord(evidencePath);
  if (ownerStat.size !== BigInt(BLOCKED_OWNER_APPROVAL_RECEIPT_BYTES) || ownerSha !== BLOCKED_OWNER_APPROVAL_RECEIPT_SHA256
    || consumedStat.size !== BigInt(BLOCKED_CONSUMED_GRANT_BYTES) || consumed.sha256 !== BLOCKED_CONSUMED_GRANT_SHA256
    || evidenceStat.size !== BigInt(BLOCKED_FINAL_EVIDENCE_BYTES) || evidence.sha256 !== BLOCKED_FINAL_EVIDENCE_SHA256
    || consumed.value.grantId !== BLOCKED_GRANT_ID || evidence.value.status !== "FAILED"
    || evidence.value.code !== "local_postgres_cleanup_unproven" || evidence.value.cleanupStatus !== "BLOCKED") {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  const journal = readBlockedJournalSnapshot(blockedRoot);
  assertPrivateDirectoryIdentity(rootIdentity);
  const snapshot = Object.freeze({
    privateRoot: blockedRoot, rootDev: rootStat.dev.toString(10), rootIno: rootStat.ino.toString(10),
    rootMode: (Number(rootStat.mode) & 0o777).toString(8).padStart(4, "0"), rootUid: rootStat.uid.toString(10),
    rootEntries: cleanupRescueBlockedContract().rootEntries,
    ownerApprovalReceiptSha256: ownerSha, ownerApprovalReceiptBytes: Number(ownerStat.size),
    consumedGrantSha256: consumed.sha256, consumedGrantBytes: Number(consumedStat.size),
    finalEvidenceSha256: evidence.sha256, finalEvidenceBytes: Number(evidenceStat.size),
    journalEntryCount: journal.entryCount, journalHeadSha256: journal.headSha256,
  });
  return Object.freeze({ ...snapshot, snapshotSha256: sha256Bytes(Buffer.from(canonicalJson(snapshot), "utf8")), rootIdentity });
}

function assertCleanupRescueGrantMatchesDerived(stable, derived) {
  for (const key of ["authority", "lineage", "artifacts", "blocked", "ceilings"]) {
    if (canonicalJson(stable[key]) !== canonicalJson(derived[key])) fail("local_postgres_cleanup_rescue_binding_invalid");
  }
  if (canonicalJson(selectKeys(stable.host, CLEANUP_RESCUE_PAYLOAD_HOST_KEYS)) !== canonicalJson(derived.host)) {
    fail("local_postgres_cleanup_rescue_binding_invalid");
  }
}

function verifyCleanupRescueCommittedBindings(grant, observedAt = new Date()) {
  const stable = validateLocalPostgresCleanupRescueGrant(grant, observedAt);
  const derived = deriveCleanupRescueAuthority(stable.lineage.rescueOwnerReviewHead);
  assertCleanupRescueGrantMatchesDerived(stable, derived);
  if (runGit(["rev-parse", "HEAD^{commit}"]) !== stable.lineage.rescueOwnerReviewHead
    || runGit(["rev-parse", "HEAD^{tree}"]) !== stable.lineage.rescueOwnerReviewTree
    || runGit(["diff", "--cached", "--quiet", "--exit-code"]) !== ""
    || runGit(["status", "--porcelain=v1", "--untracked-files=no"]) !== ""
    || sha256StableOwnedFile(path.join(ROOT, "package-lock.json"))
      !== sha256Bytes(runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:package-lock.json`], true))
    || sha256StableOwnedFile(fileURLToPath(import.meta.url)) !== stable.artifacts.runnerSha256
    || sha256StableOwnedFile(path.join(ROOT, "test/r4/public-core-local-postgres.test.ts")) !== stable.artifacts.runnerTestSha256
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.schema))
      !== sha256Bytes(runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:${LOCAL_POSTGRES_SQL_PATHS.schema}`], true))
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.verify))
      !== sha256Bytes(runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:${LOCAL_POSTGRES_SQL_PATHS.verify}`], true))
    || sha256StableOwnedFile(path.join(ROOT, LOCAL_POSTGRES_SQL_PATHS.rollback))
      !== sha256Bytes(runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:${LOCAL_POSTGRES_SQL_PATHS.rollback}`], true))) {
    fail("local_postgres_cleanup_rescue_worktree_drift");
  }
  for (const artifactPath of LOCAL_POSTGRES_STAGE_A_PATHS) {
    if (LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS.includes(artifactPath)) continue;
    const committed = runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) {
      fail("local_postgres_cleanup_rescue_worktree_drift");
    }
  }
  for (const artifactPath of LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS) {
    const committed = runGit(["show", `${stable.lineage.rescueOwnerReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) {
      fail("local_postgres_cleanup_rescue_worktree_drift");
    }
  }
  const boundPaths = [...new Set([
    "package-lock.json", ...LOCAL_POSTGRES_STAGE_A_PATHS, ...LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS,
    ...LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS, ...Object.values(LOCAL_POSTGRES_SQL_PATHS),
  ])].sort(binaryCompare);
  const flags = runGit(["ls-files", "-v", "--", ...boundPaths]).split("\n").filter(Boolean);
  if (flags.length !== boundPaths.length || flags.some((line) => !/^H /u.test(line))) {
    fail("local_postgres_cleanup_rescue_worktree_drift");
  }
  return stable;
}

export function runLocalPostgresCleanupRescueBindingFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set([
    "implementation_head", "implementation_tree", "implementation_aggregate", "evidence_head", "evidence_tree",
    "status_head", "status_tree", "card_head", "card_tree", "review_head", "review_tree", "runner", "test",
    "index", "schema", "evidence", "report", "audit", "card_sha", "review_sha", "payload_sha",
  ]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const owner = `sha256:${"1".repeat(64)}`;
  const grant = JSON.parse(canonicalJson(fakeCleanupRescueGrant(owner)));
  const derived = fakeCleanupRescueDerived();
  const hash = `sha256:${"f".repeat(64)}`;
  const head = "f".repeat(40);
  const mapping = {
    implementation_head: ["lineage", "correctionImplementationHead", head],
    implementation_tree: ["lineage", "correctionImplementationTree", head],
    implementation_aggregate: ["lineage", "correctionImplementationArtifactAggregateSha256", hash],
    evidence_head: ["lineage", "correctionEvidenceHead", head], evidence_tree: ["lineage", "correctionEvidenceTree", head],
    status_head: ["lineage", "correctionStatusHead", head], status_tree: ["lineage", "correctionStatusTree", head],
    card_head: ["lineage", "rescueCardHead", head], card_tree: ["lineage", "rescueCardTree", head],
    review_head: ["lineage", "rescueOwnerReviewHead", head], review_tree: ["lineage", "rescueOwnerReviewTree", head],
    runner: ["artifacts", "runnerSha256", hash], test: ["artifacts", "runnerTestSha256", hash],
    index: ["artifacts", "correctionArtifactIndexSha256", hash],
    schema: ["artifacts", "correctionEvidenceSchemaSha256", hash],
    evidence: ["artifacts", "correctionEvidenceSha256", hash], report: ["artifacts", "correctionReportSha256", hash],
    audit: ["artifacts", "correctionStatusCommittedAuditSummarySha256", hash],
    card_sha: ["authority", "rescueCardSha256", hash], review_sha: ["authority", "rescueOwnerReviewSha256", hash],
    payload_sha: ["authority", "rescueAuthorityPayloadSha256", hash],
  };
  const [group, key, value] = mapping[stable.mutation];
  grant[group][key] = value;
  let accepted = false;
  let code = null;
  try {
    const validated = validateLocalPostgresCleanupRescueGrant(grant, new Date("2026-08-13T20:00:01.000Z"));
    assertCleanupRescueGrantMatchesDerived(validated, derived);
    accepted = true;
  } catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-binding-fake-result.v1",
    mutation: stable.mutation, accepted, code, physicalEffects: 0,
  });
}

function prepareLocalPostgresCleanupRescueGrantWithAdapters(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["rescueRoot", "blockedRoot", "rescueOwnerReviewHead", "ownerApprovalReceiptPath", "createdAt", "expiresAt"]);
  if (typeof stable.rescueRoot !== "string" || !path.isAbsolute(stable.rescueRoot)
    || typeof stable.blockedRoot !== "string" || !path.isAbsolute(stable.blockedRoot)
    || typeof stable.ownerApprovalReceiptPath !== "string" || !path.isAbsolute(stable.ownerApprovalReceiptPath)) {
    fail("local_postgres_cleanup_rescue_private_root_invalid");
  }
  let rescueRoot;
  try { rescueRoot = fs.realpathSync(stable.rescueRoot); }
  catch { fail("local_postgres_cleanup_rescue_private_root_invalid"); }
  if (rescueRoot !== stable.rescueRoot) fail("local_postgres_cleanup_rescue_private_root_invalid");
  const rootIdentity = privateDirectoryIdentity(rescueRoot);
  assertPrivateDirectoryIdentity(rootIdentity);
  const ownerApprovalReceiptSha256 = readOwnerApprovalReceipt(rescueRoot, stable.ownerApprovalReceiptPath);
  assertPrivateDirectoryIdentity(rootIdentity);
  const blockedSnapshot = adapters.inspectBlockedForensicRoot(stable.blockedRoot);
  assertPrivateDirectoryIdentity(rootIdentity);
  const derived = adapters.deriveAuthority(stable.rescueOwnerReviewHead);
  assertPrivateDirectoryIdentity(rootIdentity);
  const cli = adapters.observeDockerCliIdentity();
  const socket = adapters.resolveSocketIdentity();
  assertPrivateDirectoryIdentity(rootIdentity);
  const rescueGrantId = adapters.randomBytes(16).toString("hex");
  const observedAt = adapters.now();
  const observedMs = observedAt instanceof Date ? observedAt.getTime() : Number.NaN;
  const createdMs = instant(stable.createdAt);
  const expiresMs = instant(stable.expiresAt);
  if (!Number.isFinite(observedMs) || Math.abs(createdMs - observedMs) > 60_000
    || expiresMs <= createdMs || expiresMs <= observedMs || expiresMs - createdMs > MAX_GRANT_LIFETIME_MS) {
    fail("local_postgres_cleanup_rescue_grant_expired");
  }
  if (blockedSnapshot.privateRoot !== derived.blocked.privateRoot
    || blockedSnapshot.rootDev !== derived.blocked.rootDev || blockedSnapshot.rootIno !== derived.blocked.rootIno
    || blockedSnapshot.rootMode !== derived.blocked.rootMode || blockedSnapshot.rootUid !== derived.blocked.rootUid
    || canonicalJson(blockedSnapshot.rootEntries) !== canonicalJson(derived.blocked.rootEntries)
    || blockedSnapshot.ownerApprovalReceiptSha256 !== derived.blocked.ownerApprovalReceiptSha256
    || blockedSnapshot.ownerApprovalReceiptBytes !== derived.blocked.ownerApprovalReceiptBytes
    || blockedSnapshot.consumedGrantSha256 !== derived.blocked.consumedGrantSha256
    || blockedSnapshot.consumedGrantBytes !== derived.blocked.consumedGrantBytes
    || blockedSnapshot.finalEvidenceSha256 !== derived.blocked.finalEvidenceSha256
    || blockedSnapshot.finalEvidenceBytes !== derived.blocked.finalEvidenceBytes
    || blockedSnapshot.journalEntryCount !== derived.blocked.journalEntryCount
    || blockedSnapshot.journalHeadSha256 !== derived.blocked.journalHeadSha256) {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  const grant = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-grant.v1", rescueGrantId,
    ownerApprovalReceiptSha256, authority: derived.authority, lineage: derived.lineage,
    artifacts: derived.artifacts, blocked: derived.blocked,
    host: Object.freeze({ ...derived.host, dockerCliIdentitySha256: cli.identitySha256, socketIdentitySha256: socket.identitySha256 }),
    ceilings: derived.ceilings, localOnly: true, productionEffectsAllowed: false,
    createdAt: stable.createdAt, expiresAt: stable.expiresAt,
  });
  validateLocalPostgresCleanupRescueGrant(grant, observedAt);
  adapters.verifyBindings(grant, observedAt);
  assertPrivateDirectoryIdentity(rootIdentity);
  const pending = privatePath(rescueRoot, "rescue.pending.json");
  let pendingIdentity = null;
  try {
    const installed = installPendingGrant(rescueRoot, pending, grant, adapters.pendingInstallHooks);
    pendingIdentity = installed.identity;
    assertPrivateDirectoryIdentity(rootIdentity);
    const names = fs.readdirSync(rescueRoot).sort(binaryCompare);
    if (names.length !== 2 || names[0] !== "owner-approval-receipt" || names[1] !== "rescue.pending.json") {
      fail("local_postgres_cleanup_rescue_private_root_invalid");
    }
    return Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-prepare-receipt.v1",
      pendingRescueGrantSha256: installed.sha256,
      ownerApprovalReceiptSha256,
      rescueAuthorityPayloadSha256: grant.authority.rescueAuthorityPayloadSha256,
      blockedForensicSnapshotSha256: blockedSnapshot.snapshotSha256,
      observedAt: observedAt.toISOString(),
    });
  } catch (error) {
    if (pendingIdentity !== null) {
      try {
        const current = fs.lstatSync(pending, { bigint: true });
        if (current.dev !== pendingIdentity.dev || current.ino !== pendingIdentity.ino || current.nlink !== 1n) {
          fail("local_postgres_cleanup_rescue_private_file_invalid");
        }
        fs.unlinkSync(pending);
        fsyncPrivateDirectory(rescueRoot);
        exactFileAbsence(pending);
      } catch (cleanupError) {
        if (authenticLocalPostgresRunnerErrorDetails(cleanupError) !== null) throw cleanupError;
        fail("local_postgres_cleanup_rescue_private_file_invalid");
      }
    }
    throw error;
  }
}

export function prepareLocalPostgresCleanupRescueGrant(input) {
  return prepareLocalPostgresCleanupRescueGrantWithAdapters(input, Object.freeze({
    inspectBlockedForensicRoot,
    deriveAuthority: deriveCleanupRescueAuthority,
    observeDockerCliIdentity,
    resolveSocketIdentity: resolveDockerSocketIdentity,
    randomBytes: crypto.randomBytes,
    now: () => new Date(),
    verifyBindings: verifyCleanupRescueCommittedBindings,
  }));
}

function fakeCleanupRescueDerived() {
  const fakeSha = (domain) => sha256Bytes(Buffer.from(`r4-cleanup-rescue-fake-${domain}`, "utf8"));
  const lineage = Object.freeze({
    failedExecutionReviewHead: FAILED_V2_EXECUTION_REVIEW_HEAD,
    failedExecutionReviewTree: FAILED_V2_EXECUTION_REVIEW_TREE,
    correctionAddendumHead: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_HEAD,
    correctionAddendumTree: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_TREE,
    correctionOwnerReviewHead: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_HEAD,
    correctionOwnerReviewTree: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_TREE,
    correctionImplementationHead: "1".repeat(40), correctionImplementationTree: "2".repeat(40),
    correctionImplementationArtifactAggregateSha256: fakeSha("aggregate"),
    correctionEvidenceHead: "3".repeat(40), correctionEvidenceTree: "4".repeat(40),
    correctionStatusHead: "5".repeat(40), correctionStatusTree: "6".repeat(40),
    rescueCardHead: "7".repeat(40), rescueCardTree: "8".repeat(40),
    rescueOwnerReviewHead: "9".repeat(40), rescueOwnerReviewTree: "a".repeat(40),
  });
  const artifacts = Object.freeze({
    correctionArtifactIndexSha256: fakeSha("index"), correctionEvidenceSchemaSha256: fakeSha("schema"),
    correctionEvidenceSha256: fakeSha("evidence"), correctionReportSha256: fakeSha("report"),
    correctionStatusCommittedAuditSummarySha256: fakeSha("audit"), runnerSha256: fakeSha("runner"),
    runnerTestSha256: fakeSha("test"),
  });
  return Object.freeze({
    authority: Object.freeze({
      correctionAddendumSha256: DIAGNOSTIC_RESCUE_CORRECTION_ADDENDUM_SHA256,
      correctionOwnerReviewSha256: DIAGNOSTIC_RESCUE_CORRECTION_REVIEW_SHA256,
      rescueCardSha256: fakeSha("card"), rescueOwnerReviewSha256: fakeSha("review"),
      rescueAuthorityPayloadSha256: fakeSha("payload"),
    }),
    lineage, artifacts, blocked: cleanupRescueBlockedContract(), host: cleanupRescuePayloadHostContract(),
    ceilings: cleanupRescueCeilings(),
  });
}

function fakeBlockedForensicSnapshot(mutation = null) {
  const snapshot = {
    privateRoot: BLOCKED_PRIVATE_ROOT, rootDev: BLOCKED_PRIVATE_ROOT_IDENTITY.dev,
    rootIno: BLOCKED_PRIVATE_ROOT_IDENTITY.ino, rootMode: BLOCKED_PRIVATE_ROOT_IDENTITY.mode,
    rootUid: BLOCKED_PRIVATE_ROOT_IDENTITY.uid, rootEntries: cleanupRescueBlockedContract().rootEntries,
    ownerApprovalReceiptSha256: BLOCKED_OWNER_APPROVAL_RECEIPT_SHA256,
    ownerApprovalReceiptBytes: BLOCKED_OWNER_APPROVAL_RECEIPT_BYTES,
    consumedGrantSha256: BLOCKED_CONSUMED_GRANT_SHA256, consumedGrantBytes: BLOCKED_CONSUMED_GRANT_BYTES,
    finalEvidenceSha256: BLOCKED_FINAL_EVIDENCE_SHA256, finalEvidenceBytes: BLOCKED_FINAL_EVIDENCE_BYTES,
    journalEntryCount: BLOCKED_JOURNAL_ENTRY_COUNT, journalHeadSha256: BLOCKED_JOURNAL_HEAD_SHA256,
  };
  if (mutation === "blocked_root_inode") snapshot.rootIno = "1";
  else if (mutation === "blocked_journal_head") snapshot.journalHeadSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "blocked_final_evidence") snapshot.finalEvidenceSha256 = `sha256:${"e".repeat(64)}`;
  const immutable = Object.freeze(snapshot);
  return Object.freeze({ ...immutable, snapshotSha256: sha256Bytes(Buffer.from(canonicalJson(immutable), "utf8")) });
}

export function runLocalPostgresCleanupRescuePrepareFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, stable.mutation === undefined ? [] : ["mutation"]);
  const mutation = stable.mutation ?? null;
  const allowed = new Set([null, "blocked_root_inode", "blocked_journal_head", "blocked_final_evidence", "expired"]);
  if (!allowed.has(mutation)) fail("local_postgres_fake_fault_invalid");
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-rescue-prepare-")));
  const receiptPath = path.join(temporaryRoot, "owner-approval-receipt");
  fs.writeFileSync(receiptPath, "fake cleanup rescue owner approval", { mode: 0o600 });
  fs.chmodSync(receiptPath, 0o600);
  const createdAt = "2026-08-13T20:00:00.000Z";
  const expiresAt = mutation === "expired" ? createdAt : "2026-08-13T21:00:00.000Z";
  let result;
  try {
    const receipt = prepareLocalPostgresCleanupRescueGrantWithAdapters({
      rescueRoot: temporaryRoot, blockedRoot: BLOCKED_PRIVATE_ROOT,
      rescueOwnerReviewHead: "9".repeat(40), ownerApprovalReceiptPath: receiptPath, createdAt, expiresAt,
    }, Object.freeze({
      inspectBlockedForensicRoot: () => fakeBlockedForensicSnapshot(mutation),
      deriveAuthority: () => fakeCleanupRescueDerived(),
      observeDockerCliIdentity: () => Object.freeze({ identitySha256: `sha256:${"b".repeat(64)}` }),
      resolveSocketIdentity: () => Object.freeze({ identitySha256: `sha256:${"c".repeat(64)}` }),
      randomBytes: () => Buffer.alloc(16, 0xd), now: () => new Date("2026-08-13T20:00:01.000Z"),
      verifyBindings: (grant, observedAt) => validateLocalPostgresCleanupRescueGrant(grant, observedAt),
    }));
    result = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-prepare-fake-result.v1",
      status: "GREEN", code: "local_postgres_cleanup_rescue_prepare_green", receipt,
      grant: readPrivateJson(path.join(temporaryRoot, "rescue.pending.json")),
      rootEntries: Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare)), physicalEffects: 0,
    });
  } catch (error) {
    result = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-prepare-fake-result.v1",
      status: "FAILED", code: authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed",
      receipt: null, grant: null, rootEntries: Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare)), physicalEffects: 0,
    });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  return result;
}

export function runLocalPostgresCleanupRescueGrantValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set([
    "top_extra", "missing_key", "schema", "grant_id", "owner_receipt", "authority", "lineage", "artifacts",
    "blocked_root", "blocked_entries", "blocked_owner", "blocked_consumed", "blocked_evidence", "blocked_journal",
    "blocked_resource", "host", "ceiling", "docker_ceiling", "local_only",
    "production", "expired", "future_created",
  ]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const grant = JSON.parse(canonicalJson(fakeCleanupRescueGrant(`sha256:${"1".repeat(64)}`)));
  if (stable.mutation === "top_extra") grant.extra = true;
  else if (stable.mutation === "missing_key") delete grant.artifacts;
  else if (stable.mutation === "schema") grant.schemaVersion = "v0";
  else if (stable.mutation === "grant_id") grant.rescueGrantId = "bad";
  else if (stable.mutation === "owner_receipt") grant.ownerApprovalReceiptSha256 = "bad";
  else if (stable.mutation === "authority") grant.authority.correctionAddendumSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "lineage") grant.lineage.correctionOwnerReviewHead = "f".repeat(40);
  else if (stable.mutation === "artifacts") grant.artifacts.runnerSha256 = "bad";
  else if (stable.mutation === "blocked_root") grant.blocked.rootIno = "1";
  else if (stable.mutation === "blocked_entries") grant.blocked.rootEntries = [...grant.blocked.rootEntries, "foreign"];
  else if (stable.mutation === "blocked_owner") grant.blocked.ownerApprovalReceiptSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "blocked_consumed") grant.blocked.consumedGrantSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "blocked_evidence") grant.blocked.finalEvidenceSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "blocked_journal") grant.blocked.journalEntryCount = 35;
  else if (stable.mutation === "blocked_resource") grant.blocked.resources.container = "foreign";
  else if (stable.mutation === "host") grant.host.dockerServerPlatform = "linux/amd64";
  else if (stable.mutation === "ceiling") grant.ceilings.maximumCleanupRescueLifecycles = 2;
  else if (stable.mutation === "docker_ceiling") grant.ceilings.dockerCalls["container.create"] = 1;
  else if (stable.mutation === "local_only") grant.localOnly = false;
  else if (stable.mutation === "production") grant.productionEffectsAllowed = true;
  else if (stable.mutation === "expired") grant.expiresAt = grant.createdAt;
  else if (stable.mutation === "future_created") grant.createdAt = "2026-08-13T20:02:00.000Z";
  let accepted = false;
  let code = null;
  try { validateLocalPostgresCleanupRescueGrant(grant, new Date("2026-08-13T20:00:01.000Z")); accepted = true; }
  catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-grant-validation-fake-result.v1",
    mutation: stable.mutation, accepted, code, physicalEffects: 0,
  });
}

export function runLocalPostgresCleanupRescueAuthorityFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, stable.mutation === undefined ? [] : ["mutation"]);
  const mutation = stable.mutation ?? "none";
  const allowed = new Set([
    "none", "duplicate_marker", "prefixed_marker", "top_extra", "authority", "lineage", "artifacts", "blocked", "host", "ceiling",
  ]);
  if (!allowed.has(mutation)) fail("local_postgres_fake_fault_invalid");
  const derived = fakeCleanupRescueDerived();
  const payload = {
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-authority.v1",
    authority: selectKeys(derived.authority, CLEANUP_RESCUE_PAYLOAD_AUTHORITY_KEYS),
    lineage: selectKeys(derived.lineage, CLEANUP_RESCUE_PAYLOAD_LINEAGE_KEYS),
    artifacts: { ...derived.artifacts }, blocked: JSON.parse(canonicalJson(derived.blocked)),
    host: { ...derived.host }, ceilings: JSON.parse(canonicalJson(derived.ceilings)),
    localOnly: true, productionEffectsAllowed: false,
  };
  if (mutation === "top_extra") payload.extra = true;
  else if (mutation === "authority") payload.authority.correctionAddendumSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "lineage") payload.lineage.correctionStatusHead = "bad";
  else if (mutation === "artifacts") payload.artifacts.runnerSha256 = "bad";
  else if (mutation === "blocked") payload.blocked.journalEntryCount = 35;
  else if (mutation === "host") payload.host.dockerServerPlatform = "linux/amd64";
  else if (mutation === "ceiling") payload.ceilings.dockerCalls["image.inspect"] = 1;
  const canonical = canonicalJson(payload);
  let card = `fake rescue card\n${CLEANUP_RESCUE_AUTHORITY_BEGIN}\n${canonical}\n${CLEANUP_RESCUE_AUTHORITY_END}\n`;
  if (mutation === "duplicate_marker") card += `${CLEANUP_RESCUE_AUTHORITY_BEGIN}\n${canonical}\n${CLEANUP_RESCUE_AUTHORITY_END}\n`;
  if (mutation === "prefixed_marker") card = card.replace(CLEANUP_RESCUE_AUTHORITY_BEGIN, `prefix${CLEANUP_RESCUE_AUTHORITY_BEGIN}`);
  let accepted = false;
  let code = null;
  try { parseCleanupRescueAuthorityCard(Buffer.from(card, "utf8")); accepted = true; }
  catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-authority-fake-result.v1",
    mutation, accepted, code, physicalEffects: 0,
  });
}

const CLEANUP_RESCUE_JOURNAL_DIRECTORY = "rescue-journal-v1";
const CLEANUP_RESCUE_SIMULATED_CRASH = Symbol("cleanup-rescue-simulated-crash");
const CLEANUP_RESCUE_JOURNAL_EVENTS = new Set([
  "grant.consumed", "rescue.lifecycle_started", "docker.attempt", "docker.completed", "cleanup.proven",
]);
const CLEANUP_RESCUE_RECEIPT_CODES = new Set([
  "local_postgres_cleanup_rescue_green", "local_postgres_cleanup_rescue_blocked",
  "local_postgres_cleanup_rescue_grant_invalid", "local_postgres_cleanup_rescue_grant_expired",
  "local_postgres_cleanup_rescue_binding_invalid", "local_postgres_cleanup_rescue_worktree_drift",
  "local_postgres_cleanup_rescue_forensic_drift", "local_postgres_cleanup_rescue_private_root_invalid",
  "local_postgres_cleanup_rescue_private_file_invalid", "local_postgres_cleanup_rescue_duplicate_consume",
  "local_postgres_cleanup_rescue_journal_invalid", "local_postgres_cleanup_rescue_effect_ceiling_exceeded",
  "local_postgres_docker_call_failed", "local_postgres_docker_version_invalid",
  "local_postgres_docker_cli_drift", "local_postgres_socket_identity_drift",
  "local_postgres_resource_ownership_invalid", "local_postgres_cleanup_unproven",
  "local_postgres_docker_contract_invalid", "local_postgres_docker_command_denied",
  "local_postgres_owner_approval_receipt_drift", "local_postgres_private_root_invalid",
  "local_postgres_private_file_invalid", "local_postgres_docker_home_invalid",
  "local_postgres_private_path_invalid",
]);

function cleanupRescueJournalDirectory(rescueRoot, create = false) {
  const journalPath = privatePath(rescueRoot, CLEANUP_RESCUE_JOURNAL_DIRECTORY);
  if (create && !fs.existsSync(journalPath)) {
    try { fs.mkdirSync(journalPath, { mode: 0o700 }); fsyncPrivateDirectory(rescueRoot); }
    catch { fail("local_postgres_cleanup_rescue_journal_invalid"); }
  }
  assertPrivateDirectory(journalPath);
  return journalPath;
}

function emptyCleanupRescueJournalState() {
  return {
    sequence: 0, lastSha256: JOURNAL_GENESIS, consumedGrantSha256: null, lifecycleCount: 0,
    cleanupProven: false, dockerCallCounts: Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind) => [kind, 0])),
    openEffects: new Map(),
  };
}

function readCleanupRescueJournal(rescueRoot) {
  const state = emptyCleanupRescueJournalState();
  const journalPath = cleanupRescueJournalDirectory(rescueRoot, true);
  const names = fs.readdirSync(journalPath).sort(binaryCompare);
  if (names.some((name, index) => name !== `entry-${String(index + 1).padStart(6, "0")}.json`)) {
    fail("local_postgres_cleanup_rescue_journal_invalid");
  }
  for (let index = 0; index < names.length; index += 1) {
    const record = ownedPlain(readPrivateJsonRecord(path.join(journalPath, names[index])).value);
    exactKeys(record, ["schemaVersion", "sequence", "previousSha256", "event", "detail", "entrySha256"]);
    if (record.schemaVersion !== "r4.public-core-local-postgres-cleanup-rescue-journal-entry.v1"
      || record.sequence !== index + 1 || record.previousSha256 !== state.lastSha256
      || typeof record.event !== "string" || !CLEANUP_RESCUE_JOURNAL_EVENTS.has(record.event)) {
      fail("local_postgres_cleanup_rescue_journal_invalid");
    }
    const expectedSha = sha256Bytes(Buffer.from(canonicalJson({
      schemaVersion: record.schemaVersion, sequence: record.sequence, previousSha256: record.previousSha256,
      event: record.event, detail: record.detail,
    }), "utf8"));
    if (record.entrySha256 !== expectedSha) fail("local_postgres_cleanup_rescue_journal_invalid");
    if (record.event === "grant.consumed") {
      exactKeys(record.detail, ["consumedRescueGrantSha256"]);
      if (state.sequence !== 0 || state.consumedGrantSha256 !== null) fail("local_postgres_cleanup_rescue_journal_invalid");
      state.consumedGrantSha256 = assertSha(record.detail.consumedRescueGrantSha256);
    } else if (record.event === "rescue.lifecycle_started") {
      exactKeys(record.detail, ["ordinal"]);
      if (state.consumedGrantSha256 === null || record.detail.ordinal !== 1 || state.lifecycleCount !== 0) {
        fail("local_postgres_cleanup_rescue_journal_invalid");
      }
      state.lifecycleCount = 1;
    } else if (record.event === "docker.attempt") {
      exactKeys(record.detail, ["effectId", "kind"]);
      if (state.lifecycleCount !== 1 || typeof record.detail.effectId !== "string"
        || state.openEffects.has(record.detail.effectId)
        || !LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(record.detail.kind)) {
        fail("local_postgres_cleanup_rescue_journal_invalid");
      }
      state.dockerCallCounts[record.detail.kind] += 1;
      if (state.dockerCallCounts[record.detail.kind] > CLEANUP_RESCUE_DOCKER_CALL_CEILINGS[record.detail.kind]) {
        fail("local_postgres_cleanup_rescue_effect_ceiling_exceeded");
      }
      state.openEffects.set(record.detail.effectId, record.detail.kind);
    } else if (record.event === "docker.completed") {
      exactKeys(record.detail, ["effectId", "kind"]);
      if (state.openEffects.get(record.detail.effectId) !== record.detail.kind) fail("local_postgres_cleanup_rescue_journal_invalid");
      state.openEffects.delete(record.detail.effectId);
    } else if (record.event === "cleanup.proven") {
      exactKeys(record.detail, ["residueCount"]);
      if (record.detail.residueCount !== 0 || state.openEffects.size !== 0) fail("local_postgres_cleanup_rescue_journal_invalid");
      state.cleanupProven = true;
    }
    state.sequence = record.sequence;
    state.lastSha256 = record.entrySha256;
  }
  if (state.sequence > 0 && state.consumedGrantSha256 === null) fail("local_postgres_cleanup_rescue_journal_invalid");
  return state;
}

function appendCleanupRescueJournal(rescueRoot, event, detail) {
  if (!CLEANUP_RESCUE_JOURNAL_EVENTS.has(event)) fail("local_postgres_cleanup_rescue_journal_invalid");
  const state = readCleanupRescueJournal(rescueRoot);
  const sequence = state.sequence + 1;
  if (sequence > 32) fail("local_postgres_cleanup_rescue_journal_invalid");
  const preimage = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-journal-entry.v1",
    sequence, previousSha256: state.lastSha256, event, detail: ownedPlain(detail),
  });
  const entry = Object.freeze({ ...preimage, entrySha256: sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8")) });
  const journalPath = cleanupRescueJournalDirectory(rescueRoot, true);
  const finalPath = path.join(journalPath, `entry-${String(sequence).padStart(6, "0")}.json`);
  writePrivateJson(finalPath, entry);
  const refreshed = readCleanupRescueJournal(rescueRoot);
  if (refreshed.sequence !== sequence || refreshed.lastSha256 !== entry.entrySha256) {
    fail("local_postgres_cleanup_rescue_journal_invalid");
  }
  return refreshed;
}

function reserveCleanupRescueDockerCall(rescueRoot, kind) {
  const state = readCleanupRescueJournal(rescueRoot);
  if (!LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(kind)
    || state.lifecycleCount !== 1 || state.cleanupProven
    || state.dockerCallCounts[kind] >= CLEANUP_RESCUE_DOCKER_CALL_CEILINGS[kind]) {
    fail("local_postgres_cleanup_rescue_effect_ceiling_exceeded");
  }
  const effectId = `docker-${String(state.sequence + 1).padStart(6, "0")}-${kind}`;
  appendCleanupRescueJournal(rescueRoot, "docker.attempt", { effectId, kind });
  return Object.freeze({ effectId, kind });
}

function completeCleanupRescueDockerCall(rescueRoot, reservation) {
  appendCleanupRescueJournal(rescueRoot, "docker.completed", reservation);
}

function consumeCleanupRescueGrant(rescueRoot, now, verifyBindings) {
  const pending = privatePath(rescueRoot, "rescue.pending.json");
  const consumed = privatePath(rescueRoot, "rescue.consumed.json");
  const names = fs.readdirSync(rescueRoot).sort(binaryCompare);
  if (names.length !== 2 || names[0] !== "owner-approval-receipt" || names[1] !== "rescue.pending.json") {
    fail(fs.existsSync(consumed) ? "local_postgres_cleanup_rescue_duplicate_consume" : "local_postgres_cleanup_rescue_grant_invalid");
  }
  const record = readPrivateJsonRecord(pending);
  const grant = validateLocalPostgresCleanupRescueGrant(record.value, now);
  verifyBindings(grant, now);
  if (readOwnerApprovalReceipt(rescueRoot, privatePath(rescueRoot, "owner-approval-receipt"), false)
    !== grant.ownerApprovalReceiptSha256) fail("local_postgres_owner_approval_receipt_drift");
  try {
    fs.linkSync(pending, consumed);
    fsyncPrivateDirectory(rescueRoot);
  } catch { fail("local_postgres_cleanup_rescue_duplicate_consume"); }
  const pendingStat = fs.lstatSync(pending, { bigint: true });
  const consumedStat = fs.lstatSync(consumed, { bigint: true });
  if (pendingStat.dev !== consumedStat.dev || pendingStat.ino !== consumedStat.ino
    || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) fail("local_postgres_cleanup_rescue_grant_invalid");
  fs.unlinkSync(pending);
  fsyncPrivateDirectory(rescueRoot);
  const stable = readPrivateJsonRecord(consumed);
  if (stable.sha256 !== record.sha256) fail("local_postgres_cleanup_rescue_grant_invalid");
  return Object.freeze({ grant, consumedRescueGrantSha256: stable.sha256 });
}

function recoverConsumedCleanupRescueGrant(rescueRoot, now, verifyBindings) {
  const consumedPath = privatePath(rescueRoot, "rescue.consumed.json");
  const evidencePath = privatePath(rescueRoot, "cleanup-rescue-evidence.json");
  exactFileAbsence(privatePath(rescueRoot, "rescue.pending.json"));
  exactFileAbsence(evidencePath);
  const allowed = new Set([
    "docker-config", "docker-home", CLEANUP_RESCUE_JOURNAL_DIRECTORY,
    "owner-approval-receipt", "rescue.consumed.json",
  ]);
  const names = fs.readdirSync(rescueRoot).sort(binaryCompare);
  if (!names.includes("owner-approval-receipt") || !names.includes("rescue.consumed.json")
    || !names.includes(CLEANUP_RESCUE_JOURNAL_DIRECTORY)
    || names.some((name) => !allowed.has(name))) {
    fail("local_postgres_cleanup_rescue_grant_invalid");
  }
  const record = readPrivateJsonRecord(consumedPath);
  const grant = validateLocalPostgresCleanupRescueGrant(record.value, now);
  verifyBindings(grant, now);
  if (readOwnerApprovalReceipt(rescueRoot, privatePath(rescueRoot, "owner-approval-receipt"), false)
      !== grant.ownerApprovalReceiptSha256) {
    fail("local_postgres_owner_approval_receipt_drift");
  }
  const journal = readCleanupRescueJournal(rescueRoot);
  if (journal.consumedGrantSha256 !== record.sha256 || journal.lifecycleCount !== 1
    || journal.sequence < 2 || journal.cleanupProven) {
    fail("local_postgres_cleanup_rescue_journal_invalid");
  }
  return Object.freeze({ grant, consumedRescueGrantSha256: record.sha256, journal });
}

function validateCleanupRescueReceiptUnchecked(rawReceipt, grant, journal, consumedRescueGrantSha256) {
  const receipt = ownedPlain(rawReceipt);
  exactKeys(receipt, CLEANUP_RESCUE_RECEIPT_KEYS);
  exactKeys(receipt.authority, CLEANUP_RESCUE_AUTHORITY_KEYS);
  exactKeys(receipt.lineage, CLEANUP_RESCUE_LINEAGE_KEYS);
  exactKeys(receipt.artifacts, CLEANUP_RESCUE_ARTIFACT_KEYS);
  exactKeys(receipt.blocked, CLEANUP_RESCUE_BLOCKED_KEYS);
  exactKeys(receipt.blocked.resources, CLEANUP_RESCUE_RESOURCE_KEYS);
  exactKeys(receipt.hostObservation, CLEANUP_RESCUE_RECEIPT_HOST_KEYS);
  exactKeys(receipt.effects, CLEANUP_RESCUE_RECEIPT_EFFECT_KEYS);
  exactKeys(receipt.effects.dockerCallCounts, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  exactKeys(receipt.cleanup, CLEANUP_RESCUE_RECEIPT_CLEANUP_KEYS);
  exactKeys(receipt.journal, CLEANUP_RESCUE_RECEIPT_JOURNAL_KEYS);
  exactKeys(receipt.readiness, CLEANUP_RESCUE_RECEIPT_READINESS_KEYS);
  if (receipt.schemaVersion !== "r4.public-core-local-postgres-cleanup-rescue-receipt.v1"
    || !CLEANUP_RESCUE_RECEIPT_CODES.has(receipt.code)
    || receipt.consumedRescueGrantSha256 !== consumedRescueGrantSha256
    || canonicalJson(receipt.authority) !== canonicalJson(grant.authority)
    || canonicalJson(receipt.lineage) !== canonicalJson(grant.lineage)
    || canonicalJson(receipt.artifacts) !== canonicalJson(grant.artifacts)
    || canonicalJson(receipt.blocked) !== canonicalJson(grant.blocked)
    || receipt.hostObservation.dockerCliIdentitySha256 !== grant.host.dockerCliIdentitySha256
    || receipt.hostObservation.socketIdentitySha256 !== grant.host.socketIdentitySha256
    || receipt.journal.entryCount !== journal.sequence || receipt.journal.headSha256 !== journal.lastSha256
    || canonicalJson(receipt.effects.dockerCallCounts) !== canonicalJson(journal.dockerCallCounts)) {
    fail("local_postgres_cleanup_rescue_receipt_invalid");
  }
  for (const [kind, count] of Object.entries(receipt.effects.dockerCallCounts)) {
    if (!Number.isSafeInteger(count) || count < 0 || count > CLEANUP_RESCUE_DOCKER_CALL_CEILINGS[kind]) {
      fail("local_postgres_cleanup_rescue_receipt_invalid");
    }
  }
  const retained = ["cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json"];
  if (!Number.isSafeInteger(receipt.cleanup.rescueLocalResidueCount) || receipt.cleanup.rescueLocalResidueCount !== 0
    || canonicalJson(receipt.cleanup.retainedRescueForensicFiles) !== canonicalJson(retained)
    || receipt.readiness.physicalExecutionPerformed !== false || receipt.readiness.targetPostgresObserved !== false
    || receipt.readiness.productRuntimeEffects !== false || receipt.readiness.trafficReady !== false
    || receipt.readiness.gateCReady !== false) fail("local_postgres_cleanup_rescue_receipt_invalid");
  if (!["29.3.1", "MISMATCH", "UNKNOWN", "NOT_OBSERVED"].includes(receipt.hostObservation.dockerClientVersion)
    || !["29.3.1", "MISMATCH", "UNKNOWN", "NOT_OBSERVED"].includes(receipt.hostObservation.dockerServerVersion)
    || ![IMAGE_PLATFORM, "MISMATCH", "UNKNOWN", "NOT_OBSERVED"].includes(receipt.hostObservation.dockerServerPlatform)
    || ![0, "UNKNOWN"].includes(receipt.cleanup.ownedContainerCount)
    || ![0, "UNKNOWN"].includes(receipt.cleanup.ownedNetworkCount)
    || ![0, "UNKNOWN"].includes(receipt.cleanup.ownedVolumeCount)
    || typeof receipt.cleanup.oldForensicRootUnchanged !== "boolean") {
    fail("local_postgres_cleanup_rescue_receipt_invalid");
  }
  if (receipt.status === "GREEN") {
    if (receipt.code !== "local_postgres_cleanup_rescue_green" || receipt.cleanupStatus !== "PROVEN_ABSENT"
      || !journal.cleanupProven || journal.openEffects.size !== 0 || receipt.cleanup.ownedContainerCount !== 0
      || receipt.cleanup.ownedNetworkCount !== 0 || receipt.cleanup.ownedVolumeCount !== 0
      || receipt.cleanup.oldForensicRootUnchanged !== true || receipt.readiness.cleanupRescueGreen !== true
      || receipt.hostObservation.dockerClientVersion !== "29.3.1"
      || receipt.hostObservation.dockerServerVersion !== "29.3.1"
      || receipt.hostObservation.dockerServerPlatform !== IMAGE_PLATFORM) {
      fail("local_postgres_cleanup_rescue_receipt_invalid");
    }
  } else if (receipt.status === "FAILED") {
    if (receipt.cleanupStatus !== "BLOCKED" || receipt.readiness.cleanupRescueGreen !== false) {
      fail("local_postgres_cleanup_rescue_receipt_invalid");
    }
  } else fail("local_postgres_cleanup_rescue_receipt_invalid");
  return receipt;
}

function validateCleanupRescueReceipt(rawReceipt, grant, journal, consumedRescueGrantSha256) {
  try { return validateCleanupRescueReceiptUnchecked(rawReceipt, grant, journal, consumedRescueGrantSha256); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_cleanup_rescue_receipt_invalid") throw error;
    fail("local_postgres_cleanup_rescue_receipt_invalid");
  }
}

function cleanupRescueSnapshotProjection(snapshot) {
  return Object.freeze({
    privateRoot: snapshot.privateRoot, rootDev: snapshot.rootDev, rootIno: snapshot.rootIno,
    rootMode: snapshot.rootMode, rootUid: snapshot.rootUid, rootEntries: snapshot.rootEntries,
    ownerApprovalReceiptSha256: snapshot.ownerApprovalReceiptSha256,
    ownerApprovalReceiptBytes: snapshot.ownerApprovalReceiptBytes,
    consumedGrantSha256: snapshot.consumedGrantSha256, consumedGrantBytes: snapshot.consumedGrantBytes,
    finalEvidenceSha256: snapshot.finalEvidenceSha256, finalEvidenceBytes: snapshot.finalEvidenceBytes,
    journalEntryCount: snapshot.journalEntryCount, journalHeadSha256: snapshot.journalHeadSha256,
  });
}

function revalidateCleanupRescueBoundary(context, edge) {
  assertPrivateDirectoryIdentity(context.rootIdentity);
  const now = context.adapters.now(edge);
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(nowMs) || nowMs < instant(context.grant.createdAt) - 60_000
    || nowMs >= instant(context.grant.expiresAt)) fail("local_postgres_cleanup_rescue_grant_expired");
  if (readOwnerApprovalReceipt(context.rescueRoot, privatePath(context.rescueRoot, "owner-approval-receipt"), false)
    !== context.grant.ownerApprovalReceiptSha256) fail("local_postgres_owner_approval_receipt_drift");
  const rescueNames = fs.readdirSync(context.rescueRoot).sort(binaryCompare);
  const expectedRescueNames = [
    "docker-config", "docker-home", CLEANUP_RESCUE_JOURNAL_DIRECTORY,
    "owner-approval-receipt", "rescue.consumed.json",
  ].sort(binaryCompare);
  if (rescueNames.length !== expectedRescueNames.length
    || rescueNames.some((name, index) => name !== expectedRescueNames[index])) {
    fail("local_postgres_cleanup_rescue_private_root_invalid");
  }
  context.adapters.revalidateHost(context.grant, context.socket, edge);
  const current = context.adapters.inspectBlockedForensicRoot(context.blockedRoot);
  if (canonicalJson(cleanupRescueSnapshotProjection(current))
    !== canonicalJson(cleanupRescueSnapshotProjection(context.blockedSnapshot))) {
    fail("local_postgres_cleanup_rescue_forensic_drift");
  }
  assertPrivateDirectoryIdentity(context.rootIdentity);
}

function cleanupRescueDockerCall(context, kind, argv, options = Object.freeze({})) {
  const stableOptions = ownedPlain(options);
  exactKeys(stableOptions, stableOptions.missingAllowed === undefined ? [] : ["missingAllowed"]);
  if (stableOptions.missingAllowed !== undefined && stableOptions.missingAllowed !== true) {
    fail("local_postgres_input_invalid");
  }
  if (CLEANUP_RESCUE_DOCKER_CALL_CEILINGS[kind] === undefined
    || CLEANUP_RESCUE_DOCKER_CALL_CEILINGS[kind] === 0) {
    fail("local_postgres_cleanup_rescue_effect_ceiling_exceeded");
  }
  const stableArgv = approvedDockerArgv(context.plan, kind, argv);
  revalidateCleanupRescueBoundary(context, `${kind}:before`);
  const reservation = reserveCleanupRescueDockerCall(context.rescueRoot, kind);
  let result;
  let callFailed = false;
  try { result = context.adapters.callDocker(kind, stableArgv, context); }
  catch { callFailed = true; }
  context.adapters.crashCheckpoint?.(`${kind}:after_call_before_completion`);
  revalidateCleanupRescueBoundary(context, `${kind}:after`);
  if (callFailed) failDockerCall("AMBIGUOUS");
  if (result === null || typeof result !== "object" || result.signal !== null || result.error !== undefined
    || typeof result.stdout !== "string" || typeof result.stderr !== "string" || !Number.isSafeInteger(result.status)) {
    failDockerCall("AMBIGUOUS");
  }
  completeCleanupRescueDockerCall(context.rescueRoot, reservation);
  if (result.status !== 0) {
    if (stableOptions.missingAllowed === true && result.status === 1 && result.stdout === ""
      && isExactDockerMissingDiagnostic(kind, result.stderr, context.plan)) {
      return Object.freeze({ found: false, stdout: "" });
    }
    failDockerCall("FAILED");
  }
  return Object.freeze({ found: true, stdout: result.stdout.trim() });
}

function inspectCleanupRescueResource(context, kind) {
  const result = cleanupRescueDockerCall(context, kind, planStep(context.plan, kind).argv, { missingAllowed: true });
  if (!result.found) return null;
  const record = parseDockerJson(result.stdout);
  const labels = kind === "container.inspect" ? record.Config?.Labels : record.Labels;
  if (labels === null || typeof labels !== "object"
    || labels[context.plan.resources.labelKey] !== context.plan.resources.labelValue) {
    fail("local_postgres_resource_ownership_invalid");
  }
  return record;
}

function performCleanupRescue(context) {
  const version = cleanupRescueDockerCall(context, "version", planStep(context.plan, "version").argv);
  context.hostObservation = Object.freeze({
    dockerCliIdentitySha256: context.grant.host.dockerCliIdentitySha256,
    socketIdentitySha256: context.grant.host.socketIdentitySha256,
    ...observeDockerVersion(version),
  });
  validateDockerVersion(version);
  const container = inspectCleanupRescueResource(context, "container.inspect");
  const network = inspectCleanupRescueResource(context, "network.inspect");
  const volume = inspectCleanupRescueResource(context, "volume.inspect");
  if (container !== null) {
    if (container.State?.Running === true) {
      cleanupRescueDockerCall(context, "container.stop", planStep(context.plan, "container.stop").argv);
    }
    cleanupRescueDockerCall(context, "container.rm", planStep(context.plan, "container.rm").argv);
  }
  if (network !== null) cleanupRescueDockerCall(context, "network.rm", planStep(context.plan, "network.rm").argv);
  if (volume !== null) cleanupRescueDockerCall(context, "volume.rm", planStep(context.plan, "volume.rm").argv);
  for (const kind of ["container.inspect", "network.inspect", "volume.inspect"]) {
    if (inspectCleanupRescueResource(context, kind) !== null) fail("local_postgres_cleanup_unproven");
  }
}

function buildCleanupRescueReceipt(context, status, code, oldForensicRootUnchanged) {
  const journal = readCleanupRescueJournal(context.rescueRoot);
  const green = status === "GREEN";
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-receipt.v1",
    status, code, cleanupStatus: green ? "PROVEN_ABSENT" : "BLOCKED",
    consumedRescueGrantSha256: context.consumedRescueGrantSha256,
    authority: context.grant.authority, lineage: context.grant.lineage, artifacts: context.grant.artifacts,
    blocked: context.grant.blocked,
    hostObservation: context.hostObservation,
    effects: Object.freeze({ dockerCallCounts: Object.freeze({ ...journal.dockerCallCounts }) }),
    cleanup: Object.freeze({
      ownedContainerCount: green ? 0 : "UNKNOWN", ownedNetworkCount: green ? 0 : "UNKNOWN",
      ownedVolumeCount: green ? 0 : "UNKNOWN", rescueLocalResidueCount: 0,
      oldForensicRootUnchanged,
      retainedRescueForensicFiles: Object.freeze([
        "cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json",
      ]),
    }),
    journal: Object.freeze({ entryCount: journal.sequence, headSha256: journal.lastSha256 }),
    readiness: Object.freeze({
      cleanupRescueGreen: green, physicalExecutionPerformed: false, targetPostgresObserved: false,
      productRuntimeEffects: false, trafficReady: false, gateCReady: false,
    }),
  });
}

function writeCleanupRescueReceipt(context, receipt) {
  const evidencePath = privatePath(context.rescueRoot, "cleanup-rescue-evidence.json");
  exactFileAbsence(evidencePath);
  const journal = readCleanupRescueJournal(context.rescueRoot);
  const validated = validateCleanupRescueReceipt(receipt, context.grant, journal, context.consumedRescueGrantSha256);
  writePrivateJson(evidencePath, validated);
  const committed = readPrivateJsonRecord(evidencePath);
  validateCleanupRescueReceipt(committed.value, context.grant, readCleanupRescueJournal(context.rescueRoot), context.consumedRescueGrantSha256);
  const names = fs.readdirSync(context.rescueRoot).sort(binaryCompare);
  const expected = ["cleanup-rescue-evidence.json", CLEANUP_RESCUE_JOURNAL_DIRECTORY, "owner-approval-receipt", "rescue.consumed.json"].sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_cleanup_rescue_private_root_invalid");
  }
  return committed.value;
}

function cleanupRescueProductionDockerCall(kind, argv, context) {
  const result = spawnSync(DOCKER_CLI, ["--host", `unix://${context.socket.socketPath}`, ...argv], {
    cwd: "/", encoding: "utf8", env: dockerEnvironment(context.isolated), maxBuffer: MAX_DOCKER_OUTPUT_BYTES,
    timeout: 60_000,
  });
  return Object.freeze({ status: result.status, signal: result.signal, error: result.error, stdout: result.stdout, stderr: result.stderr });
}

function recoverCleanupRescueCrash(input, adapters, rescueRoot, rootIdentity, blockedSnapshot, observedAt) {
  const recovered = recoverConsumedCleanupRescueGrant(rescueRoot, observedAt, adapters.verifyBindings);
  let localCleanupFailed = false;
  try { cleanupIsolatedDockerHome(rescueRoot); }
  catch { localCleanupFailed = true; }
  let oldForensicRootUnchanged = false;
  try {
    oldForensicRootUnchanged = canonicalJson(cleanupRescueSnapshotProjection(
      adapters.inspectBlockedForensicRoot(input.blockedRoot),
    )) === canonicalJson(cleanupRescueSnapshotProjection(blockedSnapshot));
  } catch { oldForensicRootUnchanged = false; }
  const context = {
    rescueRoot, blockedRoot: input.blockedRoot, rootIdentity, blockedSnapshot,
    grant: recovered.grant, consumedRescueGrantSha256: recovered.consumedRescueGrantSha256,
    socket: Object.freeze({ identitySha256: recovered.grant.host.socketIdentitySha256 }), adapters,
    isolated: null,
    plan: buildLocalPostgresDockerPlan({
      grantId: BLOCKED_GRANT_ID,
      secretMountSource: path.join(rescueRoot, "unused-password-file"),
    }),
    hostObservation: Object.freeze({
      dockerCliIdentitySha256: recovered.grant.host.dockerCliIdentitySha256,
      socketIdentitySha256: recovered.grant.host.socketIdentitySha256,
      dockerClientVersion: "NOT_OBSERVED", dockerServerVersion: "NOT_OBSERVED",
      dockerServerPlatform: "NOT_OBSERVED",
    }),
  };
  assertPrivateDirectoryIdentity(rootIdentity);
  const code = localCleanupFailed ? "local_postgres_cleanup_unproven" : "local_postgres_cleanup_rescue_blocked";
  const receipt = writeCleanupRescueReceipt(context,
    buildCleanupRescueReceipt(context, "FAILED", code, oldForensicRootUnchanged));
  throw new LocalPostgresRunnerError(receipt.code);
}

async function runLocalPostgresCleanupRescueWithAdapters(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["rescueRoot", "blockedRoot", "evidenceOut"]);
  if (typeof stable.rescueRoot !== "string" || !path.isAbsolute(stable.rescueRoot)
    || typeof stable.blockedRoot !== "string" || !path.isAbsolute(stable.blockedRoot)
    || stable.evidenceOut !== path.join(stable.rescueRoot, "cleanup-rescue-evidence.json")) {
    fail("local_postgres_cleanup_rescue_private_root_invalid");
  }
  let rescueRoot;
  try { rescueRoot = fs.realpathSync(stable.rescueRoot); }
  catch { fail("local_postgres_cleanup_rescue_private_root_invalid"); }
  if (rescueRoot !== stable.rescueRoot) fail("local_postgres_cleanup_rescue_private_root_invalid");
  const rootIdentity = privateDirectoryIdentity(rescueRoot);
  assertPrivateDirectoryIdentity(rootIdentity);
  const blockedSnapshot = adapters.inspectBlockedForensicRoot(stable.blockedRoot);
  const observedAt = adapters.now();
  const entryNames = fs.readdirSync(rescueRoot).sort(binaryCompare);
  if (entryNames.includes("rescue.consumed.json") && !entryNames.includes("rescue.pending.json")
    && !entryNames.includes("cleanup-rescue-evidence.json")) {
    return recoverCleanupRescueCrash(stable, adapters, rescueRoot, rootIdentity, blockedSnapshot, observedAt);
  }
  const consumed = consumeCleanupRescueGrant(rescueRoot, observedAt, adapters.verifyBindings);
  const grant = consumed.grant;
  const cli = adapters.observeDockerCliIdentity();
  const socket = adapters.resolveSocketIdentity();
  if (cli.identitySha256 !== grant.host.dockerCliIdentitySha256
    || socket.identitySha256 !== grant.host.socketIdentitySha256) {
    fail("local_postgres_cleanup_rescue_binding_invalid");
  }
  const context = {
    rescueRoot, blockedRoot: stable.blockedRoot, rootIdentity, blockedSnapshot, grant,
    consumedRescueGrantSha256: consumed.consumedRescueGrantSha256, socket, adapters,
    isolated: null,
    plan: buildLocalPostgresDockerPlan({ grantId: BLOCKED_GRANT_ID, secretMountSource: path.join(rescueRoot, "unused-password-file") }),
    hostObservation: Object.freeze({
      dockerCliIdentitySha256: grant.host.dockerCliIdentitySha256,
      socketIdentitySha256: grant.host.socketIdentitySha256,
      dockerClientVersion: "NOT_OBSERVED", dockerServerVersion: "NOT_OBSERVED", dockerServerPlatform: "NOT_OBSERVED",
    }),
  };
  if (canonicalJson(selectKeys(context.plan.resources, CLEANUP_RESCUE_RESOURCE_KEYS))
    !== canonicalJson(BLOCKED_RESOURCES)) fail("local_postgres_cleanup_rescue_binding_invalid");
  appendCleanupRescueJournal(rescueRoot, "grant.consumed", { consumedRescueGrantSha256: consumed.consumedRescueGrantSha256 });
  appendCleanupRescueJournal(rescueRoot, "rescue.lifecycle_started", { ordinal: 1 });
  let failure = null;
  let isolatedSetupAttempted = false;
  try {
    isolatedSetupAttempted = true;
    context.isolated = prepareIsolatedDockerHome(rescueRoot);
    revalidateCleanupRescueBoundary(context, "rescue:before");
    performCleanupRescue(context);
    revalidateCleanupRescueBoundary(context, "rescue:after");
  } catch (error) {
    if (error === CLEANUP_RESCUE_SIMULATED_CRASH) throw error;
    failure = error;
  }
  let localCleanupFailed = false;
  try { if (isolatedSetupAttempted) cleanupIsolatedDockerHome(rescueRoot); }
  catch { localCleanupFailed = true; }
  let oldForensicRootUnchanged = false;
  try {
    oldForensicRootUnchanged = canonicalJson(cleanupRescueSnapshotProjection(adapters.inspectBlockedForensicRoot(stable.blockedRoot)))
      === canonicalJson(cleanupRescueSnapshotProjection(blockedSnapshot));
  } catch { oldForensicRootUnchanged = false; }
  if (failure === null && !localCleanupFailed && oldForensicRootUnchanged) {
    appendCleanupRescueJournal(rescueRoot, "cleanup.proven", { residueCount: 0 });
    return writeCleanupRescueReceipt(context,
      buildCleanupRescueReceipt(context, "GREEN", "local_postgres_cleanup_rescue_green", true));
  }
  const code = localCleanupFailed ? "local_postgres_cleanup_unproven"
    : (authenticLocalPostgresRunnerErrorDetails(failure)?.code ?? "local_postgres_cleanup_rescue_blocked");
  const receipt = writeCleanupRescueReceipt(context, buildCleanupRescueReceipt(context, "FAILED", code, oldForensicRootUnchanged));
  const error = new LocalPostgresRunnerError(receipt.code);
  throw error;
}

export async function runApprovedLocalPostgresCleanupRescue(input) {
  return runLocalPostgresCleanupRescueWithAdapters(input, Object.freeze({
    inspectBlockedForensicRoot,
    verifyBindings: verifyCleanupRescueCommittedBindings,
    observeDockerCliIdentity,
    resolveSocketIdentity: resolveDockerSocketIdentity,
    revalidateHost(grant, socket) {
      if (observeDockerCliIdentity().identitySha256 !== grant.host.dockerCliIdentitySha256) {
        fail("local_postgres_docker_cli_drift");
      }
      if (socket.identitySha256 !== grant.host.socketIdentitySha256) fail("local_postgres_socket_identity_drift");
      revalidateDockerSocketIdentity(socket);
    },
    callDocker: cleanupRescueProductionDockerCall,
    now: () => new Date(),
  }));
}

function fakeCleanupRescueGrant(ownerApprovalReceiptSha256) {
  const derived = fakeCleanupRescueDerived();
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-grant.v1",
    rescueGrantId: "d".repeat(32), ownerApprovalReceiptSha256,
    authority: derived.authority, lineage: derived.lineage, artifacts: derived.artifacts,
    blocked: derived.blocked,
    host: Object.freeze({ ...derived.host, dockerCliIdentitySha256: `sha256:${"b".repeat(64)}`, socketIdentitySha256: `sha256:${"c".repeat(64)}` }),
    ceilings: derived.ceilings, localOnly: true, productionEffectsAllowed: false,
    createdAt: "2026-08-13T20:00:00.000Z", expiresAt: "2026-08-13T21:00:00.000Z",
  });
}

function fakeCleanupRescueDockerPort(states, calls, mutations, argvRecords) {
  const diagnostic = (kind) => {
    if (kind === "container.inspect") return `Error: No such object: ${BLOCKED_RESOURCES.container}\n`;
    if (kind === "network.inspect") return `Error response from daemon: network ${BLOCKED_RESOURCES.network} not found\n`;
    if (kind === "volume.inspect") return `Error response from daemon: get ${BLOCKED_RESOURCES.volume}: no such volume\n`;
    return "";
  };
  const stateKey = (kind) => kind.split(".")[0];
  return (kind, argv) => {
    calls.push(kind);
    argvRecords.push(Object.freeze({ kind, argv: Object.freeze([...argv]) }));
    if (kind === "version") {
      return Object.freeze({
        status: 0, signal: null, error: undefined, stderr: "",
        stdout: JSON.stringify({ Client: { Version: "29.3.1" }, Server: { Version: "29.3.1", Os: "linux", Arch: "arm64" } }),
      });
    }
    const resource = stateKey(kind);
    const current = states[resource];
    if (kind.endsWith(".inspect")) {
      if (current === "ambiguous") return Object.freeze({ status: null, signal: "SIGKILL", error: undefined, stdout: "", stderr: "" });
      if (current === "malformed") return Object.freeze({ status: 1, signal: null, error: undefined, stdout: "", stderr: `${diagnostic(kind).trim()} extra\n` });
      if (current === "missing") return Object.freeze({ status: 1, signal: null, error: undefined, stdout: "", stderr: diagnostic(kind) });
      const labels = current === "foreign" ? { [BLOCKED_RESOURCES.labelKey]: "foreign" }
        : { [BLOCKED_RESOURCES.labelKey]: BLOCKED_RESOURCES.labelValue };
      const record = resource === "container"
        ? { Config: { Labels: labels }, State: { Running: current === "owned_running" } }
        : { Labels: labels };
      return Object.freeze({ status: 0, signal: null, error: undefined, stdout: JSON.stringify(record), stderr: "" });
    }
    if (kind === "container.stop") {
      if (current !== "owned_running") return Object.freeze({ status: 1, signal: null, error: undefined, stdout: "", stderr: "unexpected\n" });
      states.container = "owned_stopped"; mutations.push("container.stop");
    } else if (kind === "container.rm") {
      states.container = "missing"; mutations.push("container.rm");
    } else if (kind === "network.rm") {
      states.network = "missing"; mutations.push("network.rm");
    } else if (kind === "volume.rm") {
      states.volume = "missing"; mutations.push("volume.rm");
    }
    return Object.freeze({ status: 0, signal: null, error: undefined, stdout: "", stderr: "" });
  };
}

export async function runLocalPostgresCleanupRescueFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  const allowedKeys = new Set([
    "container", "network", "volume", "hostDriftAt", "blockedDriftAt", "clockExpiredAt", "crashAt",
    "duplicateConsume",
  ]);
  if (Object.keys(stable).some((key) => !allowedKeys.has(key))) fail("local_postgres_input_invalid");
  const allowedStates = new Set(["missing", "owned_running", "owned_stopped", "foreign", "malformed", "ambiguous"]);
  const allowedCrashEdges = new Set([
    "container.inspect:after_call_before_completion", "container.rm:after_call_before_completion",
  ]);
  const states = {
    container: stable.container ?? "missing", network: stable.network ?? "missing", volume: stable.volume ?? "missing",
  };
  if (!allowedStates.has(states.container) || !allowedStates.has(states.network) || !allowedStates.has(states.volume)
    || (stable.hostDriftAt !== undefined && typeof stable.hostDriftAt !== "string")
    || (stable.clockExpiredAt !== undefined && typeof stable.clockExpiredAt !== "string")
    || (stable.crashAt !== undefined && !allowedCrashEdges.has(stable.crashAt))
    || (stable.blockedDriftAt !== undefined && (!Number.isSafeInteger(stable.blockedDriftAt) || stable.blockedDriftAt < 1))
    || (stable.duplicateConsume !== undefined && typeof stable.duplicateConsume !== "boolean")) {
    fail("local_postgres_input_invalid");
  }
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-rescue-run-")));
  const ownerPath = path.join(temporaryRoot, "owner-approval-receipt");
  fs.writeFileSync(ownerPath, "fake cleanup rescue execution approval", { mode: 0o600 });
  fs.chmodSync(ownerPath, 0o600);
  const ownerSha = readOwnerApprovalReceipt(temporaryRoot, ownerPath);
  const grant = fakeCleanupRescueGrant(ownerSha);
  installPendingGrant(temporaryRoot, path.join(temporaryRoot, "rescue.pending.json"), grant);
  const calls = [];
  const mutations = [];
  const argvRecords = [];
  const blockedSnapshot = fakeBlockedForensicSnapshot(null);
  const rawCall = fakeCleanupRescueDockerPort(states, calls, mutations, argvRecords);
  let blockedInspectionCount = 0;
  const adapters = Object.freeze({
    inspectBlockedForensicRoot() {
      blockedInspectionCount += 1;
      return blockedInspectionCount === stable.blockedDriftAt ? fakeBlockedForensicSnapshot("blocked_root_inode") : blockedSnapshot;
    },
    verifyBindings: (candidate, observedAt) => validateLocalPostgresCleanupRescueGrant(candidate, observedAt),
    observeDockerCliIdentity: () => Object.freeze({ identitySha256: grant.host.dockerCliIdentitySha256 }),
    resolveSocketIdentity: () => Object.freeze({
      identitySha256: grant.host.socketIdentitySha256, socketPath: "/private/fake/docker.sock",
    }),
    revalidateHost(_grant, _socket, edge) {
      if (stable.hostDriftAt === edge) fail("local_postgres_docker_cli_drift");
    },
    callDocker: (kind, argv) => rawCall(kind, argv),
    crashCheckpoint(edge) {
      if (stable.crashAt === edge) throw CLEANUP_RESCUE_SIMULATED_CRASH;
    },
    now: (edge) => new Date(stable.clockExpiredAt !== undefined && edge === stable.clockExpiredAt
      ? "2026-08-13T21:00:00.000Z" : "2026-08-13T20:00:01.000Z"),
  });
  const request = Object.freeze({
    rescueRoot: temporaryRoot, blockedRoot: BLOCKED_PRIVATE_ROOT,
    evidenceOut: path.join(temporaryRoot, "cleanup-rescue-evidence.json"),
  });
  let receipt = null;
  let failureCode = null;
  let duplicateCode = null;
  let simulatedCrash = false;
  let recoveryAddedCalls = 0;
  try { receipt = await runLocalPostgresCleanupRescueWithAdapters(request, adapters); }
  catch (error) {
    if (error === CLEANUP_RESCUE_SIMULATED_CRASH) {
      simulatedCrash = true;
      const beforeRecoveryCalls = calls.length;
      try { await runLocalPostgresCleanupRescueWithAdapters(request, adapters); }
      catch (recoveryError) {
        failureCode = authenticLocalPostgresRunnerErrorDetails(recoveryError)?.code ?? "local_postgres_runner_failed";
      }
      recoveryAddedCalls = calls.length - beforeRecoveryCalls;
    } else {
      failureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed";
    }
    try { receipt = readPrivateJson(path.join(temporaryRoot, "cleanup-rescue-evidence.json")); } catch { receipt = null; }
  }
  const firstCallCount = calls.length;
  if (stable.duplicateConsume === true) {
    try { await runLocalPostgresCleanupRescueWithAdapters(request, adapters); }
    catch (error) { duplicateCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  }
  const rootEntries = Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare));
  const blockedAfter = adapters.inspectBlockedForensicRoot(BLOCKED_PRIVATE_ROOT);
  const journalAfter = readCleanupRescueJournal(temporaryRoot);
  const result = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-fake-result.v1",
    status: receipt?.status ?? "FAILED", code: receipt?.code ?? failureCode,
    receipt, calls: Object.freeze([...calls]), argv: Object.freeze([...argvRecords]),
    firstCallCount, mutations: Object.freeze([...mutations]),
    duplicateCode, duplicateAddedCalls: calls.length - firstCallCount, rootEntries,
    simulatedCrash, recoveryAddedCalls,
    openEffectCount: journalAfter.openEffects.size,
    oldForensicSnapshotSha256: blockedSnapshot.snapshotSha256,
    oldForensicSnapshotSha256After: blockedAfter.snapshotSha256,
    physicalEffects: 0, postgresConnections: 0, sqlStatements: 0, productNetworkEffects: 0,
  });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  return result;
}

export function runLocalPostgresCleanupRescueReceiptValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set([
    "top_extra", "authority", "lineage", "artifacts", "blocked", "host", "effects", "cleanup",
    "journal", "readiness", "consumed", "status",
  ]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const owner = `sha256:${"1".repeat(64)}`;
  const grant = fakeCleanupRescueGrant(owner);
  const journal = emptyCleanupRescueJournalState();
  journal.sequence = 3; journal.lastSha256 = `sha256:${"2".repeat(64)}`; journal.consumedGrantSha256 = `sha256:${"3".repeat(64)}`;
  journal.lifecycleCount = 1; journal.cleanupProven = true;
  journal.dockerCallCounts.version = 1;
  const receipt = {
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-receipt.v1", status: "GREEN",
    code: "local_postgres_cleanup_rescue_green", cleanupStatus: "PROVEN_ABSENT",
    consumedRescueGrantSha256: journal.consumedGrantSha256,
    authority: grant.authority, lineage: grant.lineage, artifacts: grant.artifacts, blocked: grant.blocked,
    hostObservation: {
      dockerCliIdentitySha256: grant.host.dockerCliIdentitySha256, socketIdentitySha256: grant.host.socketIdentitySha256,
      dockerClientVersion: "29.3.1", dockerServerVersion: "29.3.1", dockerServerPlatform: IMAGE_PLATFORM,
    },
    effects: { dockerCallCounts: { ...journal.dockerCallCounts } },
    cleanup: {
      ownedContainerCount: 0, ownedNetworkCount: 0, ownedVolumeCount: 0, rescueLocalResidueCount: 0,
      oldForensicRootUnchanged: true,
      retainedRescueForensicFiles: ["cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json"],
    },
    journal: { entryCount: journal.sequence, headSha256: journal.lastSha256 },
    readiness: {
      cleanupRescueGreen: true, physicalExecutionPerformed: false, targetPostgresObserved: false,
      productRuntimeEffects: false, trafficReady: false, gateCReady: false,
    },
  };
  const mutation = stable.mutation;
  if (mutation === "top_extra") receipt.extra = true;
  else if (mutation === "authority") receipt.authority = { ...receipt.authority, rescueCardSha256: `sha256:${"f".repeat(64)}` };
  else if (mutation === "lineage") receipt.lineage = { ...receipt.lineage, rescueCardHead: "f".repeat(40) };
  else if (mutation === "artifacts") receipt.artifacts = { ...receipt.artifacts, runnerSha256: `sha256:${"f".repeat(64)}` };
  else if (mutation === "blocked") receipt.blocked = { ...receipt.blocked, journalEntryCount: 35 };
  else if (mutation === "host") receipt.hostObservation = { ...receipt.hostObservation, dockerClientVersion: "MISMATCH" };
  else if (mutation === "effects") receipt.effects.dockerCallCounts.version = 2;
  else if (mutation === "cleanup") receipt.cleanup.rescueLocalResidueCount = 1;
  else if (mutation === "journal") receipt.journal.headSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "readiness") receipt.readiness.gateCReady = true;
  else if (mutation === "consumed") receipt.consumedRescueGrantSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "status") receipt.cleanupStatus = "BLOCKED";
  let accepted = false;
  let code = null;
  try { validateCleanupRescueReceipt(receipt, grant, journal, journal.consumedGrantSha256); accepted = true; }
  catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-cleanup-rescue-receipt-validation-fake-result.v1",
    mutation, accepted, code, physicalEffects: 0,
  });
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
      `Error: No such object: ${plan.resources.container}`,
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

export function runLocalPostgresDockerDiagnosticFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["kind", "status", "stdout", "stderr"]);
  if (typeof stable.kind !== "string" || !LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.includes(stable.kind)
    || !Number.isSafeInteger(stable.status) || typeof stable.stdout !== "string"
    || typeof stable.stderr !== "string") fail("local_postgres_input_invalid");
  const plan = buildLocalPostgresDockerPlan({ grantId: BLOCKED_GRANT_ID, secretMountSource: "/private/fake/postgres-password" });
  const missingExact = stable.status === 1 && stable.stdout === ""
    && isExactDockerMissingDiagnostic(stable.kind, stable.stderr, plan);
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-docker-diagnostic-fake-result.v1",
    outcome: missingExact ? "MISSING_EXACT" : "FAILED",
    missingExact,
    physicalEffects: 0,
  });
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

function bodyFreeDiagnosticDockerCallCounts() {
  return Object.freeze(Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind) => [
    kind, kind === "version" || kind === "container.inspect" ? 1 : 0,
  ])));
}

function bodyFreeDiagnosticFailedRescueContract() {
  return Object.freeze({
    privateRoot: FAILED_RESCUE_PRIVATE_ROOT,
    rootDev: FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.dev,
    rootIno: FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.ino,
    rootMode: FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.mode,
    rootUid: FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.uid,
    rootEntries: Object.freeze([
      "cleanup-rescue-evidence.json", "owner-approval-receipt", "rescue-journal-v1", "rescue.consumed.json",
    ]),
    ownerApprovalReceiptSha256: FAILED_RESCUE_OWNER_APPROVAL_RECEIPT_SHA256,
    ownerApprovalReceiptBytes: FAILED_RESCUE_OWNER_APPROVAL_RECEIPT_BYTES,
    consumedGrantSha256: FAILED_RESCUE_CONSUMED_GRANT_SHA256,
    consumedGrantBytes: FAILED_RESCUE_CONSUMED_GRANT_BYTES,
    grantId: FAILED_RESCUE_GRANT_ID,
    finalEvidenceSha256: FAILED_RESCUE_EVIDENCE_SHA256,
    finalEvidenceBytes: FAILED_RESCUE_EVIDENCE_BYTES,
    journalEntryCount: FAILED_RESCUE_JOURNAL_ENTRY_COUNT,
    journalHeadSha256: FAILED_RESCUE_JOURNAL_HEAD_SHA256,
    status: "FAILED", code: "local_postgres_docker_call_failed", cleanupStatus: "BLOCKED",
    dockerCallCounts: bodyFreeDiagnosticDockerCallCounts(), oldForensicRootUnchanged: true,
  });
}

function bodyFreeDiagnosticHostContract() {
  return Object.freeze({
    dockerCli: DOCKER_CLI, dockerCliSha256: DOCKER_CLI_SHA256,
    dockerClientVersion: "29.3.1", dockerServerVersion: "29.3.1", dockerServerPlatform: IMAGE_PLATFORM,
  });
}

function bodyFreeDiagnosticCeilings() {
  return Object.freeze({
    maximumDiagnosticLifecycles: 1,
    maximumOutputBytesPerStream: MAX_DOCKER_OUTPUT_BYTES,
    dockerCalls: BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS,
  });
}

function assertBodyFreeDiagnosticFailedRescueRecord(raw, code = "local_postgres_body_free_diagnostic_authority_invalid") {
  try {
    const stable = ownedPlain(raw);
    exactKeys(stable, BODY_FREE_DIAGNOSTIC_FAILED_RESCUE_KEYS);
    exactKeys(stable.dockerCallCounts, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
    if (canonicalJson(stable) !== canonicalJson(bodyFreeDiagnosticFailedRescueContract())) fail(code);
    return stable;
  } catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error) !== null) fail(code);
    fail(code);
  }
}

function validateBodyFreeDiagnosticAuthorityPayloadUnchecked(rawPayload) {
  const payload = ownedPlain(rawPayload);
  exactKeys(payload, [
    "schemaVersion", "authority", "lineage", "artifacts", "blocked", "failedRescue", "host", "ceilings",
    "localOnly", "productionEffectsAllowed",
  ]);
  if (payload.schemaVersion !== "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-authority.v1"
    || payload.localOnly !== true || payload.productionEffectsAllowed !== false) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  exactKeys(payload.authority, BODY_FREE_DIAGNOSTIC_PAYLOAD_AUTHORITY_KEYS);
  exactKeys(payload.lineage, BODY_FREE_DIAGNOSTIC_PAYLOAD_LINEAGE_KEYS);
  exactKeys(payload.artifacts, BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS);
  exactKeys(payload.host, BODY_FREE_DIAGNOSTIC_PAYLOAD_HOST_KEYS);
  exactKeys(payload.ceilings, BODY_FREE_DIAGNOSTIC_CEILING_KEYS);
  exactKeys(payload.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  if (payload.authority.constructionAddendumSha256 !== BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256
    || payload.authority.constructionOwnerReviewSha256 !== BODY_FREE_DIAGNOSTIC_REVIEW_SHA256
    || payload.authority.pathCorrectionAddendumSha256 !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256
    || payload.authority.pathCorrectionOwnerReviewSha256 !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256
    || payload.lineage.cleanupRescueOwnerReviewHead !== FAILED_RESCUE_REVIEW_HEAD
    || payload.lineage.cleanupRescueOwnerReviewTree !== FAILED_RESCUE_REVIEW_TREE
    || payload.lineage.constructionAddendumHead !== BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD
    || payload.lineage.constructionAddendumTree !== BODY_FREE_DIAGNOSTIC_ADDENDUM_TREE
    || payload.lineage.constructionOwnerReviewHead !== BODY_FREE_DIAGNOSTIC_REVIEW_HEAD
    || payload.lineage.constructionOwnerReviewTree !== BODY_FREE_DIAGNOSTIC_REVIEW_TREE
    || payload.lineage.pathCorrectionAddendumHead !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD
    || payload.lineage.pathCorrectionAddendumTree !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_TREE
    || payload.lineage.pathCorrectionOwnerReviewHead !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD
    || payload.lineage.pathCorrectionOwnerReviewTree !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  for (const key of BODY_FREE_DIAGNOSTIC_PAYLOAD_LINEAGE_KEYS) {
    (key.endsWith("Sha256") ? assertSha(payload.lineage[key]) : assertGit(payload.lineage[key]));
  }
  for (const key of BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS) assertSha(payload.artifacts[key]);
  assertCleanupRescueBlockedRecord(payload.blocked, "local_postgres_body_free_diagnostic_authority_invalid");
  assertBodyFreeDiagnosticFailedRescueRecord(payload.failedRescue);
  assertFixedRecord(payload.host, bodyFreeDiagnosticHostContract());
  if (payload.ceilings.maximumDiagnosticLifecycles !== 1
    || payload.ceilings.maximumOutputBytesPerStream !== MAX_DOCKER_OUTPUT_BYTES) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  for (const [kind, maximum] of Object.entries(BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS)) {
    if (payload.ceilings.dockerCalls[kind] !== maximum) fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  return payload;
}

function validateBodyFreeDiagnosticAuthorityPayload(rawPayload) {
  try { return validateBodyFreeDiagnosticAuthorityPayloadUnchecked(rawPayload); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_body_free_diagnostic_authority_invalid") throw error;
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
}

function parseBodyFreeDiagnosticAuthorityCard(bytes) {
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("local_postgres_body_free_diagnostic_authority_invalid"); }
  const lines = source.split("\n");
  const begins = lines.flatMap((line, index) => line === BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN ? [index] : []);
  const ends = lines.flatMap((line, index) => line === BODY_FREE_DIAGNOSTIC_AUTHORITY_END ? [index] : []);
  if (begins.length !== 1 || ends.length !== 1 || ends[0] !== begins[0] + 2) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  const canonical = lines[begins[0] + 1];
  let parsed;
  try { parsed = parseStrictJson(canonical); }
  catch { fail("local_postgres_body_free_diagnostic_authority_invalid"); }
  if (canonical.length === 0 || canonicalJson(parsed) !== canonical) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  return Object.freeze({
    payload: validateBodyFreeDiagnosticAuthorityPayload(parsed),
    sha256: sha256Bytes(Buffer.from(canonical, "utf8")),
  });
}

function verifyBodyFreeDiagnosticAuthorityBase() {
  exactCommitStep(FAILED_RESCUE_CARD_HEAD, FAILED_RESCUE_REVIEW_HEAD, FAILED_RESCUE_REVIEW_TREE,
    new Map([[BLOCKED_CLEANUP_RESCUE_REVIEW_PATH, "A"]]), "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(FAILED_RESCUE_REVIEW_HEAD, BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD, BODY_FREE_DIAGNOSTIC_ADDENDUM_TREE,
    new Map([[BODY_FREE_DIAGNOSTIC_ADDENDUM_PATH, "A"]]), "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD, BODY_FREE_DIAGNOSTIC_REVIEW_HEAD, BODY_FREE_DIAGNOSTIC_REVIEW_TREE,
    new Map([[BODY_FREE_DIAGNOSTIC_REVIEW_PATH, "A"]]), "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(BODY_FREE_DIAGNOSTIC_REVIEW_HEAD, BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD,
    BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_TREE, new Map([[BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_PATH, "A"]]),
    "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD, BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD,
    BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE,
    new Map([[BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_PATH, "A"]]),
    "local_postgres_body_free_diagnostic_binding_invalid");
  const bindings = [
    [FAILED_RESCUE_CARD_HEAD, BLOCKED_CLEANUP_RESCUE_CARD_PATH, FAILED_RESCUE_CARD_SHA256],
    [FAILED_RESCUE_REVIEW_HEAD, BLOCKED_CLEANUP_RESCUE_REVIEW_PATH, FAILED_RESCUE_REVIEW_SHA256],
    [BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD, BODY_FREE_DIAGNOSTIC_ADDENDUM_PATH, BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256],
    [BODY_FREE_DIAGNOSTIC_REVIEW_HEAD, BODY_FREE_DIAGNOSTIC_REVIEW_PATH, BODY_FREE_DIAGNOSTIC_REVIEW_SHA256],
    [BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD, BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_PATH,
      BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256],
    [BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD, BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_PATH,
      BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256],
  ];
  for (const [head, artifactPath, expectedSha] of bindings) {
    if (sha256Bytes(runGit(["show", `${head}:${artifactPath}`], true)) !== expectedSha) {
      fail("local_postgres_body_free_diagnostic_binding_invalid");
    }
  }
}

function deriveBodyFreeDiagnosticAuthority(diagnosticOwnerReviewHead) {
  assertGit(diagnosticOwnerReviewHead);
  verifyBodyFreeDiagnosticAuthorityBase();
  const diagnosticCardHead = runGit(["rev-parse", `${diagnosticOwnerReviewHead}^`]);
  const diagnosticStatusHead = runGit(["rev-parse", `${diagnosticCardHead}^`]);
  const diagnosticEvidenceHead = runGit(["rev-parse", `${diagnosticStatusHead}^`]);
  const diagnosticImplementationHead = runGit(["rev-parse", `${diagnosticEvidenceHead}^`]);
  const lineage = Object.freeze({
    cleanupRescueOwnerReviewHead: FAILED_RESCUE_REVIEW_HEAD,
    cleanupRescueOwnerReviewTree: FAILED_RESCUE_REVIEW_TREE,
    constructionAddendumHead: BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD,
    constructionAddendumTree: BODY_FREE_DIAGNOSTIC_ADDENDUM_TREE,
    constructionOwnerReviewHead: BODY_FREE_DIAGNOSTIC_REVIEW_HEAD,
    constructionOwnerReviewTree: BODY_FREE_DIAGNOSTIC_REVIEW_TREE,
    pathCorrectionAddendumHead: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD,
    pathCorrectionAddendumTree: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_TREE,
    pathCorrectionOwnerReviewHead: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD,
    pathCorrectionOwnerReviewTree: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE,
    diagnosticImplementationHead,
    diagnosticImplementationTree: runGit(["rev-parse", `${diagnosticImplementationHead}^{tree}`]),
    diagnosticImplementationArtifactAggregateSha256: artifactAggregate(
      diagnosticImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS,
    ).aggregateSha256,
    diagnosticEvidenceHead,
    diagnosticEvidenceTree: runGit(["rev-parse", `${diagnosticEvidenceHead}^{tree}`]),
    diagnosticStatusHead,
    diagnosticStatusTree: runGit(["rev-parse", `${diagnosticStatusHead}^{tree}`]),
    diagnosticCardHead,
    diagnosticCardTree: runGit(["rev-parse", `${diagnosticCardHead}^{tree}`]),
    diagnosticOwnerReviewHead,
    diagnosticOwnerReviewTree: runGit(["rev-parse", `${diagnosticOwnerReviewHead}^{tree}`]),
  });
  exactCommitStep(BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD, diagnosticImplementationHead,
    lineage.diagnosticImplementationTree, statusMap(LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS),
    "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(diagnosticImplementationHead, diagnosticEvidenceHead, lineage.diagnosticEvidenceTree,
    statusMap(LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS,
      new Set(LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS)),
    "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(diagnosticEvidenceHead, diagnosticStatusHead, lineage.diagnosticStatusTree,
    statusMap(LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_STATUS_PATHS,
      new Set(["docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md"])),
    "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(diagnosticStatusHead, diagnosticCardHead, lineage.diagnosticCardTree,
    new Map([[BODY_FREE_DIAGNOSTIC_CARD_PATH, "A"]]), "local_postgres_body_free_diagnostic_binding_invalid");
  exactCommitStep(diagnosticCardHead, diagnosticOwnerReviewHead, lineage.diagnosticOwnerReviewTree,
    new Map([[BODY_FREE_DIAGNOSTIC_EXECUTION_REVIEW_PATH, "A"]]),
    "local_postgres_body_free_diagnostic_binding_invalid");
  const cardBytes = runGit(["show", `${diagnosticCardHead}:${BODY_FREE_DIAGNOSTIC_CARD_PATH}`], true);
  const reviewBytes = runGit(["show", `${diagnosticOwnerReviewHead}:${BODY_FREE_DIAGNOSTIC_EXECUTION_REVIEW_PATH}`], true);
  const parsed = parseBodyFreeDiagnosticAuthorityCard(cardBytes);
  if (canonicalJson(parsed.payload.lineage)
      !== canonicalJson(selectKeys(lineage, BODY_FREE_DIAGNOSTIC_PAYLOAD_LINEAGE_KEYS))) {
    fail("local_postgres_body_free_diagnostic_authority_invalid");
  }
  const implementation = artifactAggregate(diagnosticImplementationHead, LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS);
  const expectedArtifacts = Object.freeze({
    diagnosticArtifactIndexSha256: sha256Bytes(runGit([
      "show", `${diagnosticEvidenceHead}:${LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS[1]}`,
    ], true)),
    diagnosticEvidenceSchemaSha256: sha256Bytes(runGit([
      "show", `${diagnosticEvidenceHead}:${LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS[2]}`,
    ], true)),
    diagnosticEvidenceSha256: sha256Bytes(runGit([
      "show", `${diagnosticEvidenceHead}:${LOCAL_POSTGRES_BODY_FREE_DIAGNOSTIC_EVIDENCE_PATHS[0]}`,
    ], true)),
    diagnosticReportSha256: sha256Bytes(runGit([
      "show", `${diagnosticStatusHead}:docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-BODY-FREE-DOCKER-INSPECT-DIAGNOSTIC-CONSTRUCTION-REPORT.md`,
    ], true)),
    diagnosticStatusCommittedAuditSummarySha256: parsed.payload.artifacts.diagnosticStatusCommittedAuditSummarySha256,
    runnerSha256: implementation.records[0].sha256,
    runnerTestSha256: implementation.records[1].sha256,
  });
  if (implementation.aggregateSha256 !== lineage.diagnosticImplementationArtifactAggregateSha256
    || canonicalJson(parsed.payload.artifacts) !== canonicalJson(expectedArtifacts)) {
    fail("local_postgres_body_free_diagnostic_binding_invalid");
  }
  return Object.freeze({
    authority: Object.freeze({
      constructionAddendumSha256: BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256,
      constructionOwnerReviewSha256: BODY_FREE_DIAGNOSTIC_REVIEW_SHA256,
      pathCorrectionAddendumSha256: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256,
      pathCorrectionOwnerReviewSha256: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256,
      diagnosticCardSha256: sha256Bytes(cardBytes), diagnosticOwnerReviewSha256: sha256Bytes(reviewBytes),
      diagnosticAuthorityPayloadSha256: parsed.sha256,
    }),
    lineage, artifacts: expectedArtifacts, blocked: cleanupRescueBlockedContract(),
    failedRescue: bodyFreeDiagnosticFailedRescueContract(), host: bodyFreeDiagnosticHostContract(),
    ceilings: bodyFreeDiagnosticCeilings(),
  });
}

function validateBodyFreeDiagnosticGrantUnchecked(rawGrant, now = new Date(), options = Object.freeze({})) {
  const stableOptions = ownedPlain(options);
  exactKeys(stableOptions, stableOptions.allowExpired === undefined ? [] : ["allowExpired"]);
  if (stableOptions.allowExpired !== undefined && stableOptions.allowExpired !== true) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  const grant = ownedPlain(rawGrant);
  exactKeys(grant, BODY_FREE_DIAGNOSTIC_GRANT_KEYS);
  if (grant.schemaVersion !== "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-grant.v1"
    || typeof grant.diagnosticGrantId !== "string" || !GRANT_ID.test(grant.diagnosticGrantId)
    || grant.localOnly !== true || grant.productionEffectsAllowed !== false) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  exactKeys(grant.authority, BODY_FREE_DIAGNOSTIC_AUTHORITY_KEYS);
  exactKeys(grant.lineage, BODY_FREE_DIAGNOSTIC_LINEAGE_KEYS);
  exactKeys(grant.artifacts, BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS);
  exactKeys(grant.host, BODY_FREE_DIAGNOSTIC_HOST_KEYS);
  exactKeys(grant.ceilings, BODY_FREE_DIAGNOSTIC_CEILING_KEYS);
  exactKeys(grant.ceilings.dockerCalls, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  assertSha(grant.ownerApprovalReceiptSha256);
  for (const key of BODY_FREE_DIAGNOSTIC_AUTHORITY_KEYS) assertSha(grant.authority[key]);
  for (const key of BODY_FREE_DIAGNOSTIC_LINEAGE_KEYS) {
    (key.endsWith("Sha256") ? assertSha(grant.lineage[key]) : assertGit(grant.lineage[key]));
  }
  for (const key of BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS) assertSha(grant.artifacts[key]);
  assertCleanupRescueBlockedRecord(grant.blocked, "local_postgres_body_free_diagnostic_grant_invalid");
  assertBodyFreeDiagnosticFailedRescueRecord(grant.failedRescue, "local_postgres_body_free_diagnostic_grant_invalid");
  assertSha(grant.host.dockerCliSha256); assertSha(grant.host.dockerCliIdentitySha256); assertSha(grant.host.socketIdentitySha256);
  if (grant.authority.constructionAddendumSha256 !== BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256
    || grant.authority.constructionOwnerReviewSha256 !== BODY_FREE_DIAGNOSTIC_REVIEW_SHA256
    || grant.authority.pathCorrectionAddendumSha256 !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256
    || grant.authority.pathCorrectionOwnerReviewSha256 !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256
    || grant.lineage.cleanupRescueOwnerReviewHead !== FAILED_RESCUE_REVIEW_HEAD
    || grant.lineage.cleanupRescueOwnerReviewTree !== FAILED_RESCUE_REVIEW_TREE
    || grant.lineage.pathCorrectionOwnerReviewHead !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD
    || grant.lineage.pathCorrectionOwnerReviewTree !== BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  assertFixedRecord(selectKeys(grant.host, BODY_FREE_DIAGNOSTIC_PAYLOAD_HOST_KEYS), bodyFreeDiagnosticHostContract());
  if (grant.ceilings.maximumDiagnosticLifecycles !== 1
    || grant.ceilings.maximumOutputBytesPerStream !== MAX_DOCKER_OUTPUT_BYTES) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  for (const [kind, maximum] of Object.entries(BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS)) {
    if (grant.ceilings.dockerCalls[kind] !== maximum) fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  const createdAt = instant(grant.createdAt);
  const expiresAt = instant(grant.expiresAt);
  const observedAt = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(observedAt) || expiresAt <= createdAt || expiresAt - createdAt > MAX_GRANT_LIFETIME_MS
    || (stableOptions.allowExpired !== true && (observedAt < createdAt - 60_000 || observedAt >= expiresAt))) {
    fail("local_postgres_body_free_diagnostic_grant_expired");
  }
  return grant;
}

export function validateBodyFreeDiagnosticGrant(rawGrant, now = new Date()) {
  try { return validateBodyFreeDiagnosticGrantUnchecked(rawGrant, now); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_body_free_diagnostic_grant_expired") throw error;
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
}

function assertBodyFreeDiagnosticGrantMatchesDerived(stable, derived) {
  for (const key of ["authority", "lineage", "artifacts", "blocked", "failedRescue", "ceilings"]) {
    if (canonicalJson(stable[key]) !== canonicalJson(derived[key])) {
      fail("local_postgres_body_free_diagnostic_binding_invalid");
    }
  }
  if (canonicalJson(selectKeys(stable.host, BODY_FREE_DIAGNOSTIC_PAYLOAD_HOST_KEYS))
      !== canonicalJson(derived.host)) fail("local_postgres_body_free_diagnostic_binding_invalid");
}

function verifyBodyFreeDiagnosticCommittedBindings(grant, observedAt = new Date(), options = Object.freeze({})) {
  const stableOptions = ownedPlain(options);
  exactKeys(stableOptions, stableOptions.allowExpired === undefined ? [] : ["allowExpired"]);
  const stable = stableOptions.allowExpired === true
    ? validateBodyFreeDiagnosticGrantUnchecked(grant, observedAt, { allowExpired: true })
    : validateBodyFreeDiagnosticGrant(grant, observedAt);
  const derived = deriveBodyFreeDiagnosticAuthority(stable.lineage.diagnosticOwnerReviewHead);
  assertBodyFreeDiagnosticGrantMatchesDerived(stable, derived);
  if (runGit(["rev-parse", "HEAD^{commit}"]) !== stable.lineage.diagnosticOwnerReviewHead
    || runGit(["rev-parse", "HEAD^{tree}"]) !== stable.lineage.diagnosticOwnerReviewTree
    || runGit(["diff", "--cached", "--quiet", "--exit-code"]) !== ""
    || runGit(["status", "--porcelain=v1", "--untracked-files=no"]) !== ""
    || sha256StableOwnedFile(fileURLToPath(import.meta.url)) !== stable.artifacts.runnerSha256
    || sha256StableOwnedFile(path.join(ROOT, "test/r4/public-core-local-postgres.test.ts")) !== stable.artifacts.runnerTestSha256) {
    fail("local_postgres_body_free_diagnostic_worktree_drift");
  }
  for (const artifactPath of LOCAL_POSTGRES_STAGE_A_PATHS) {
    if (LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS.includes(artifactPath)) continue;
    const committed = runGit(["show", `${stable.lineage.diagnosticOwnerReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) {
      fail("local_postgres_body_free_diagnostic_worktree_drift");
    }
  }
  for (const artifactPath of LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS) {
    const committed = runGit(["show", `${stable.lineage.diagnosticOwnerReviewHead}:${artifactPath}`], true);
    if (sha256StableOwnedFile(path.join(ROOT, artifactPath)) !== sha256Bytes(committed)) {
      fail("local_postgres_body_free_diagnostic_worktree_drift");
    }
  }
  const boundPaths = [...new Set([
    "package-lock.json", ...LOCAL_POSTGRES_STAGE_A_PATHS, ...LOCAL_POSTGRES_REBIND_IMPLEMENTATION_PATHS,
    ...LOCAL_POSTGRES_TRANSITIVE_RUNTIME_PATHS, ...Object.values(LOCAL_POSTGRES_SQL_PATHS),
  ])].sort(binaryCompare);
  const flags = runGit(["ls-files", "-v", "--", ...boundPaths]).split("\n").filter(Boolean);
  if (flags.length !== boundPaths.length || flags.some((line) => !/^H /u.test(line))) {
    fail("local_postgres_body_free_diagnostic_worktree_drift");
  }
  return stable;
}

function inspectFailedCleanupRescueRoot(rescueRoot = FAILED_RESCUE_PRIVATE_ROOT) {
  if (rescueRoot !== FAILED_RESCUE_PRIVATE_ROOT) fail("local_postgres_body_free_diagnostic_forensic_drift");
  let resolved;
  try { resolved = fs.realpathSync(rescueRoot); }
  catch { fail("local_postgres_body_free_diagnostic_forensic_drift"); }
  if (resolved !== rescueRoot) fail("local_postgres_body_free_diagnostic_forensic_drift");
  const rootStat = assertPrivateDirectory(rescueRoot);
  const rootIdentity = privateDirectoryIdentity(rescueRoot, rootStat);
  if (rootStat.dev.toString(10) !== FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.dev
    || rootStat.ino.toString(10) !== FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.ino
    || (Number(rootStat.mode) & 0o777).toString(8).padStart(4, "0") !== FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.mode
    || rootStat.uid.toString(10) !== FAILED_RESCUE_PRIVATE_ROOT_IDENTITY.uid) {
    fail("local_postgres_body_free_diagnostic_forensic_drift");
  }
  const names = fs.readdirSync(rescueRoot).sort(binaryCompare);
  const expected = [...bodyFreeDiagnosticFailedRescueContract().rootEntries].sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_body_free_diagnostic_forensic_drift");
  }
  const ownerPath = privatePath(rescueRoot, "owner-approval-receipt");
  const ownerStat = fs.lstatSync(ownerPath, { bigint: true });
  const ownerSha = readOwnerApprovalReceipt(rescueRoot, ownerPath, false);
  const consumedPath = privatePath(rescueRoot, "rescue.consumed.json");
  const consumedStat = fs.lstatSync(consumedPath, { bigint: true });
  const consumed = readPrivateJsonRecord(consumedPath);
  const evidencePath = privatePath(rescueRoot, "cleanup-rescue-evidence.json");
  const evidenceStat = fs.lstatSync(evidencePath, { bigint: true });
  const evidence = readPrivateJsonRecord(evidencePath);
  const journal = readCleanupRescueJournal(rescueRoot);
  const contract = bodyFreeDiagnosticFailedRescueContract();
  if (ownerStat.size !== BigInt(contract.ownerApprovalReceiptBytes) || ownerSha !== contract.ownerApprovalReceiptSha256
    || consumedStat.size !== BigInt(contract.consumedGrantBytes) || consumed.sha256 !== contract.consumedGrantSha256
    || evidenceStat.size !== BigInt(contract.finalEvidenceBytes) || evidence.sha256 !== contract.finalEvidenceSha256
    || consumed.value.rescueGrantId !== contract.grantId
    || consumed.value.authority?.rescueAuthorityPayloadSha256 !== FAILED_RESCUE_AUTHORITY_PAYLOAD_SHA256
    || evidence.value.status !== contract.status || evidence.value.code !== contract.code
    || evidence.value.cleanupStatus !== contract.cleanupStatus
    || evidence.value.cleanup?.oldForensicRootUnchanged !== true
    || canonicalJson(evidence.value.effects?.dockerCallCounts) !== canonicalJson(contract.dockerCallCounts)
    || journal.sequence !== contract.journalEntryCount || journal.lastSha256 !== contract.journalHeadSha256
    || canonicalJson(journal.dockerCallCounts) !== canonicalJson(contract.dockerCallCounts)
    || journal.openEffects.size !== 0) {
    fail("local_postgres_body_free_diagnostic_forensic_drift");
  }
  assertPrivateDirectoryIdentity(rootIdentity);
  return Object.freeze({
    ...contract,
    snapshotSha256: sha256Bytes(Buffer.from(canonicalJson(contract), "utf8")),
    rootIdentity,
  });
}

function prepareBodyFreeDiagnosticGrantWithAdapters(input, adapters) {
  const stable = bodyFreeDiagnosticPrepareStage(adapters, "INPUT", () => {
    const candidate = ownedPlain(input);
    exactKeys(candidate, [
      "diagnosticRoot", "blockedRoot", "rescueRoot", "diagnosticOwnerReviewHead",
      "ownerApprovalReceiptPath", "createdAt", "expiresAt",
    ]);
    if (typeof candidate.diagnosticRoot !== "string" || !path.isAbsolute(candidate.diagnosticRoot)
      || candidate.blockedRoot !== BLOCKED_PRIVATE_ROOT || candidate.rescueRoot !== FAILED_RESCUE_PRIVATE_ROOT
      || typeof candidate.ownerApprovalReceiptPath !== "string" || !path.isAbsolute(candidate.ownerApprovalReceiptPath)) {
      fail("local_postgres_body_free_diagnostic_private_root_invalid");
    }
    return candidate;
  });
  const root = bodyFreeDiagnosticPrepareStage(adapters, "PRIVATE_ROOT", () => {
    let diagnosticRoot;
    try { diagnosticRoot = fs.realpathSync(stable.diagnosticRoot); }
    catch { fail("local_postgres_body_free_diagnostic_private_root_invalid"); }
    if (diagnosticRoot !== stable.diagnosticRoot) fail("local_postgres_body_free_diagnostic_private_root_invalid");
    return Object.freeze({ diagnosticRoot, identity: privateDirectoryIdentity(diagnosticRoot) });
  });
  const { diagnosticRoot, identity: rootIdentity } = root;
  const ownerApprovalReceiptSha256 = bodyFreeDiagnosticPrepareStage(adapters, "OWNER_APPROVAL_RECEIPT", () => {
    const sha256 = readOwnerApprovalReceipt(diagnosticRoot, stable.ownerApprovalReceiptPath);
    assertPrivateDirectoryIdentity(rootIdentity);
    return sha256;
  });
  const blockedSnapshot = bodyFreeDiagnosticPrepareStage(adapters, "BLOCKED_ROOT_SNAPSHOT", () => {
    const snapshot = adapters.inspectBlockedForensicRoot(stable.blockedRoot);
    assertPrivateDirectoryIdentity(rootIdentity);
    return snapshot;
  });
  const failedRescueSnapshot = bodyFreeDiagnosticPrepareStage(adapters, "FAILED_RESCUE_ROOT_SNAPSHOT", () => {
    const snapshot = adapters.inspectFailedRescueRoot(stable.rescueRoot);
    assertPrivateDirectoryIdentity(rootIdentity);
    return snapshot;
  });
  const derived = bodyFreeDiagnosticPrepareStage(adapters, "AUTHORITY", () => {
    const authority = adapters.deriveAuthority(stable.diagnosticOwnerReviewHead);
    assertPrivateDirectoryIdentity(rootIdentity);
    return authority;
  });
  const cli = bodyFreeDiagnosticPrepareStage(adapters, "DOCKER_CLI", () => {
    const identity = adapters.observeDockerCliIdentity();
    assertPrivateDirectoryIdentity(rootIdentity);
    return identity;
  });
  const socket = bodyFreeDiagnosticPrepareStage(adapters, "DOCKER_SOCKET", () => {
    const identity = adapters.resolveSocketIdentity();
    assertPrivateDirectoryIdentity(rootIdentity);
    return identity;
  });
  const time = bodyFreeDiagnosticPrepareStage(adapters, "TIME", () => Object.freeze({
    observedAt: adapters.now(), diagnosticGrantId: adapters.randomBytes(16).toString("hex"),
  }));
  const grant = bodyFreeDiagnosticPrepareStage(adapters, "AUTHORITY", () => {
    const candidate = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-grant.v1",
      diagnosticGrantId: time.diagnosticGrantId, ownerApprovalReceiptSha256,
      authority: derived.authority, lineage: derived.lineage, artifacts: derived.artifacts,
      blocked: derived.blocked, failedRescue: derived.failedRescue,
      host: Object.freeze({
        ...derived.host, dockerCliIdentitySha256: cli.identitySha256, socketIdentitySha256: socket.identitySha256,
      }),
      ceilings: derived.ceilings, localOnly: true, productionEffectsAllowed: false,
      createdAt: stable.createdAt, expiresAt: stable.expiresAt,
    });
    validateBodyFreeDiagnosticGrant(candidate, time.observedAt);
    return candidate;
  });
  bodyFreeDiagnosticPrepareStage(adapters, "COMMITTED_BINDINGS", () => {
    adapters.verifyBindings(grant, time.observedAt);
    assertPrivateDirectoryIdentity(rootIdentity);
    return true;
  });
  bodyFreeDiagnosticPrepareStage(adapters, "BLOCKED_ROOT_SNAPSHOT", () => {
    if (canonicalJson(selectKeys(blockedSnapshot, Object.keys(derived.blocked))) !== canonicalJson(derived.blocked)) {
      fail("local_postgres_body_free_diagnostic_forensic_drift");
    }
    return true;
  });
  bodyFreeDiagnosticPrepareStage(adapters, "FAILED_RESCUE_ROOT_SNAPSHOT", () => {
    if (canonicalJson(selectKeys(failedRescueSnapshot, Object.keys(derived.failedRescue))) !== canonicalJson(derived.failedRescue)) {
      fail("local_postgres_body_free_diagnostic_forensic_drift");
    }
    return true;
  });
  const pending = bodyFreeDiagnosticPrepareStage(adapters, "PRIVATE_ROOT", () => {
    assertPrivateDirectoryIdentity(rootIdentity);
    return privatePath(diagnosticRoot, "diagnostic.pending.json");
  });
  let pendingIdentity = null;
  try {
    const pendingStages = Object.freeze({
      "pending.open": "PENDING_OPEN", "pending.write": "PENDING_WRITE",
      "pending.file_fsync": "PENDING_FILE_FSYNC", "pending.close": "PENDING_CLOSE",
      "pending.directory_fsync": "PENDING_DIRECTORY_FSYNC", "pending.readback": "PENDING_READBACK",
    });
    const installed = installPendingGrant(diagnosticRoot, pending, grant, Object.freeze({
      checkpoint(name, edge) {
        adapters.pendingInstallHooks?.checkpoint?.(name, edge);
        adapters.prepareCheckpoint?.(pendingStages[name], edge);
      },
      rollbackCheckpoint(stage, edge) {
        adapters.pendingInstallHooks?.rollbackCheckpoint?.(stage, edge);
        adapters.prepareCheckpoint?.(stage, edge);
      },
      classifyFailure(stage, error, rollback) { bodyFreeDiagnosticPrepareError(error, stage, rollback); },
    }));
    pendingIdentity = installed.identity;
    bodyFreeDiagnosticPrepareStage(adapters, "FINAL_ROOT", () => {
      assertPrivateDirectoryIdentity(rootIdentity);
      const names = fs.readdirSync(diagnosticRoot).sort(binaryCompare);
      if (names.length !== 2 || names[0] !== "diagnostic.pending.json" || names[1] !== "owner-approval-receipt") {
        fail("local_postgres_body_free_diagnostic_private_root_invalid");
      }
      return true;
    });
    return bodyFreeDiagnosticPrepareStage(adapters, "PREPARE_RECEIPT", () => {
      const receipt = Object.freeze({
        schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-prepare-receipt.v1",
        pendingDiagnosticGrantSha256: installed.sha256, ownerApprovalReceiptSha256,
        diagnosticAuthorityPayloadSha256: grant.authority.diagnosticAuthorityPayloadSha256,
        blockedSnapshotSha256: blockedSnapshot.snapshotSha256,
        failedRescueSnapshotSha256: failedRescueSnapshot.snapshotSha256,
        observedAt: time.observedAt.toISOString(),
      });
      canonicalJson(receipt);
      return receipt;
    });
  } catch (error) {
    if (pendingIdentity !== null) {
      bodyFreeDiagnosticPrepareStage(adapters, "PENDING_ROLLBACK", () => {
        const current = fs.lstatSync(pending, { bigint: true });
        if (current.dev !== pendingIdentity.dev || current.ino !== pendingIdentity.ino || current.nlink !== 1n) {
          fail("local_postgres_body_free_diagnostic_private_file_invalid");
        }
        fs.unlinkSync(pending);
        fsyncPrivateDirectory(diagnosticRoot);
        exactFileAbsence(pending);
        return true;
      });
    }
    throw error;
  }
}

export function prepareBodyFreeDockerInspectDiagnosticGrant(input) {
  return prepareBodyFreeDiagnosticGrantWithAdapters(input, Object.freeze({
    inspectBlockedForensicRoot, inspectFailedRescueRoot: inspectFailedCleanupRescueRoot,
    deriveAuthority: deriveBodyFreeDiagnosticAuthority, observeDockerCliIdentity,
    resolveSocketIdentity: resolveDockerSocketIdentity, randomBytes: crypto.randomBytes,
    now: () => new Date(), verifyBindings: verifyBodyFreeDiagnosticCommittedBindings,
  }));
}

const BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY = "docker-inspect-diagnostic-journal-v1";
const BODY_FREE_DIAGNOSTIC_SIMULATED_CRASH = Symbol("body-free-diagnostic-simulated-crash");
const BODY_FREE_DIAGNOSTIC_JOURNAL_EVENTS = new Set([
  "grant.consumed", "diagnostic.lifecycle_started", "docker.attempt", "docker.completed",
  "observation.recorded", "diagnostic.recovered", "closure.proven",
]);
const BODY_FREE_DIAGNOSTIC_SPAWN_OUTCOMES = new Set([
  "COMPLETED", "TIMED_OUT", "SIGNALED", "SPAWN_ERROR", "UNKNOWN",
]);
const BODY_FREE_DIAGNOSTIC_CLASSIFICATIONS = new Set([
  "MATCHED_EXISTING_MISSING", "FOUND_JSON", "UNCLASSIFIED_NONZERO", "AMBIGUOUS_TRANSPORT", "CONTRACT_INVALID",
]);
const BODY_FREE_DIAGNOSTIC_OWNERSHIP_CLASSIFICATIONS = new Set([
  "NOT_APPLICABLE", "OWNED", "FOREIGN", "UNLABELLED", "MALFORMED",
]);
const BODY_FREE_DIAGNOSTIC_LINE_ENDINGS = new Set(["NONE", "LF", "CRLF", "MIXED_OR_OTHER"]);
const BODY_FREE_DIAGNOSTIC_SIGNALS = new Set([
  "NONE", "UNKNOWN", "SIGABRT", "SIGALRM", "SIGHUP", "SIGINT", "SIGKILL", "SIGPIPE", "SIGQUIT",
  "SIGTERM", "SIGUSR1", "SIGUSR2",
]);

function diagnosticRootProjection(snapshot, contract) {
  return selectKeys(snapshot, Object.keys(contract));
}

function bodyFreeDiagnosticJournalDirectory(diagnosticRoot, create = false) {
  const journalPath = privatePath(diagnosticRoot, BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY);
  if (create && !fs.existsSync(journalPath)) {
    try { fs.mkdirSync(journalPath, { mode: 0o700 }); fsyncPrivateDirectory(diagnosticRoot); }
    catch { fail("local_postgres_body_free_diagnostic_journal_invalid"); }
  }
  assertPrivateDirectory(journalPath);
  return journalPath;
}

function emptyBodyFreeDiagnosticJournalState() {
  return {
    sequence: 0, lastSha256: JOURNAL_GENESIS, consumedGrantSha256: null, lifecycleCount: 0,
    dockerCallCounts: Object.fromEntries(LOCAL_POSTGRES_DOCKER_COMMAND_KINDS.map((kind) => [kind, 0])),
    openEffects: new Map(), completedEffects: new Map(), observations: new Map(), closure: null,
  };
}

function validateBodyFreeDiagnosticObservation(raw) {
  const observation = ownedPlain(raw);
  exactKeys(observation, BODY_FREE_DIAGNOSTIC_OBSERVATION_KEYS);
  if (typeof observation.effectId !== "string" || observation.effectId.length < 1
    || !["version", "container.inspect"].includes(observation.kind)
    || !Number.isSafeInteger(observation.ordinal) || observation.ordinal !== 1
    || !BODY_FREE_DIAGNOSTIC_SPAWN_OUTCOMES.has(observation.spawnOutcome)
    || !(Number.isSafeInteger(observation.exitStatus) || observation.exitStatus === "NOT_AVAILABLE")
    || !BODY_FREE_DIAGNOSTIC_SIGNALS.has(observation.signal)
    || !BODY_FREE_DIAGNOSTIC_CLASSIFICATIONS.has(observation.diagnosticClassification)
    || !BODY_FREE_DIAGNOSTIC_OWNERSHIP_CLASSIFICATIONS.has(observation.ownershipClassification)) {
    fail("local_postgres_body_free_diagnostic_observation_invalid");
  }
  for (const prefix of ["stdout", "stderr"]) {
    if (!Number.isSafeInteger(observation[`${prefix}Bytes`]) || observation[`${prefix}Bytes`] < 0
      || observation[`${prefix}Bytes`] > MAX_DOCKER_OUTPUT_BYTES
      || !SHA256.test(observation[`${prefix}Sha256`])
      || typeof observation[`${prefix}Utf8`] !== "boolean"
      || typeof observation[`${prefix}Empty`] !== "boolean"
      || !BODY_FREE_DIAGNOSTIC_LINE_ENDINGS.has(observation[`${prefix}LineEndings`])
      || !Number.isSafeInteger(observation[`${prefix}LineCount`]) || observation[`${prefix}LineCount`] < 0
      || observation[`${prefix}Empty`] !== (observation[`${prefix}Bytes`] === 0)
      || (observation[`${prefix}Empty`] && observation[`${prefix}LineCount`] !== 0)) {
      fail("local_postgres_body_free_diagnostic_observation_invalid");
    }
  }
  if (observation.spawnOutcome === "COMPLETED") {
    if (!Number.isSafeInteger(observation.exitStatus) || observation.signal !== "NONE") {
      fail("local_postgres_body_free_diagnostic_observation_invalid");
    }
  } else if (observation.exitStatus !== "NOT_AVAILABLE") {
    fail("local_postgres_body_free_diagnostic_observation_invalid");
  }
  if (observation.diagnosticClassification === "MATCHED_EXISTING_MISSING"
    && (observation.kind !== "container.inspect" || observation.exitStatus !== 1
      || !observation.stdoutEmpty || observation.ownershipClassification !== "NOT_APPLICABLE")) {
    fail("local_postgres_body_free_diagnostic_observation_invalid");
  }
  if (observation.diagnosticClassification === "FOUND_JSON" && observation.exitStatus !== 0) {
    fail("local_postgres_body_free_diagnostic_observation_invalid");
  }
  if (observation.spawnOutcome !== "COMPLETED"
    && observation.diagnosticClassification !== "AMBIGUOUS_TRANSPORT") {
    fail("local_postgres_body_free_diagnostic_observation_invalid");
  }
  return observation;
}

function readBodyFreeDiagnosticJournal(diagnosticRoot, create = false) {
  const state = emptyBodyFreeDiagnosticJournalState();
  const journalPath = bodyFreeDiagnosticJournalDirectory(diagnosticRoot, create);
  const names = fs.readdirSync(journalPath).sort(binaryCompare);
  if (names.length > 12
    || names.some((name, index) => name !== `entry-${String(index + 1).padStart(6, "0")}.json`)) {
    fail("local_postgres_body_free_diagnostic_journal_invalid");
  }
  for (let index = 0; index < names.length; index += 1) {
    const record = ownedPlain(readPrivateJsonRecord(path.join(journalPath, names[index])).value);
    exactKeys(record, ["schemaVersion", "sequence", "previousSha256", "event", "detail", "entrySha256"]);
    if (record.schemaVersion !== "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-journal-entry.v1"
      || record.sequence !== index + 1 || record.previousSha256 !== state.lastSha256
      || typeof record.event !== "string" || !BODY_FREE_DIAGNOSTIC_JOURNAL_EVENTS.has(record.event)) {
      fail("local_postgres_body_free_diagnostic_journal_invalid");
    }
    const expectedSha = sha256Bytes(Buffer.from(canonicalJson({
      schemaVersion: record.schemaVersion, sequence: record.sequence, previousSha256: record.previousSha256,
      event: record.event, detail: record.detail,
    }), "utf8"));
    if (record.entrySha256 !== expectedSha) fail("local_postgres_body_free_diagnostic_journal_invalid");
    if (record.event === "grant.consumed") {
      exactKeys(record.detail, ["consumedDiagnosticGrantSha256"]);
      if (state.sequence !== 0 || state.consumedGrantSha256 !== null) fail("local_postgres_body_free_diagnostic_journal_invalid");
      state.consumedGrantSha256 = assertSha(record.detail.consumedDiagnosticGrantSha256);
    } else if (record.event === "diagnostic.lifecycle_started") {
      exactKeys(record.detail, ["ordinal"]);
      if (state.consumedGrantSha256 === null || record.detail.ordinal !== 1 || state.lifecycleCount !== 0) {
        fail("local_postgres_body_free_diagnostic_journal_invalid");
      }
      state.lifecycleCount = 1;
    } else if (record.event === "docker.attempt") {
      exactKeys(record.detail, ["effectId", "kind", "ordinal"]);
      const { effectId, kind, ordinal } = record.detail;
      if (state.lifecycleCount !== 1 || !["version", "container.inspect"].includes(kind)
        || typeof effectId !== "string" || state.openEffects.has(effectId) || ordinal !== 1
        || state.dockerCallCounts[kind] >= BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS[kind]) {
        fail("local_postgres_body_free_diagnostic_journal_invalid");
      }
      state.dockerCallCounts[kind] += 1;
      state.openEffects.set(effectId, Object.freeze({ effectId, kind, ordinal }));
    } else if (record.event === "docker.completed") {
      exactKeys(record.detail, ["effectId", "kind", "ordinal"]);
      const open = state.openEffects.get(record.detail.effectId);
      if (open === undefined || canonicalJson(open) !== canonicalJson(record.detail)) {
        fail("local_postgres_body_free_diagnostic_journal_invalid");
      }
      state.openEffects.delete(record.detail.effectId);
      state.completedEffects.set(record.detail.effectId, open);
    } else if (record.event === "observation.recorded") {
      const observation = validateBodyFreeDiagnosticObservation(record.detail);
      const completed = state.completedEffects.get(observation.effectId);
      if (completed === undefined || completed.kind !== observation.kind || completed.ordinal !== observation.ordinal
        || state.observations.has(observation.effectId)) fail("local_postgres_body_free_diagnostic_journal_invalid");
      state.observations.set(observation.effectId, observation);
    } else if (record.event === "diagnostic.recovered") {
      const observation = validateBodyFreeDiagnosticObservation(record.detail);
      const open = state.openEffects.get(observation.effectId);
      if (open === undefined || open.kind !== observation.kind || open.ordinal !== observation.ordinal
        || observation.spawnOutcome !== "UNKNOWN"
        || observation.diagnosticClassification !== "AMBIGUOUS_TRANSPORT"
        || state.observations.has(observation.effectId)) fail("local_postgres_body_free_diagnostic_journal_invalid");
      state.openEffects.delete(observation.effectId);
      state.observations.set(observation.effectId, observation);
    } else if (record.event === "closure.proven") {
      exactKeys(record.detail, [
        "diagnosticLocalResidueCount", "blockedRootUnchanged", "failedRescueRootUnchanged",
      ]);
      if (state.openEffects.size !== 0 || state.closure !== null
        || record.detail.diagnosticLocalResidueCount !== 0
        || typeof record.detail.blockedRootUnchanged !== "boolean"
        || typeof record.detail.failedRescueRootUnchanged !== "boolean") {
        fail("local_postgres_body_free_diagnostic_journal_invalid");
      }
      state.closure = Object.freeze(record.detail);
    }
    state.sequence = record.sequence;
    state.lastSha256 = record.entrySha256;
  }
  if (state.sequence > 0 && state.consumedGrantSha256 === null) {
    fail("local_postgres_body_free_diagnostic_journal_invalid");
  }
  return state;
}

function appendBodyFreeDiagnosticJournal(diagnosticRoot, event, detail) {
  if (!BODY_FREE_DIAGNOSTIC_JOURNAL_EVENTS.has(event)) fail("local_postgres_body_free_diagnostic_journal_invalid");
  const state = readBodyFreeDiagnosticJournal(diagnosticRoot, true);
  const sequence = state.sequence + 1;
  if (sequence > 12) fail("local_postgres_body_free_diagnostic_journal_invalid");
  const preimage = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-journal-entry.v1",
    sequence, previousSha256: state.lastSha256, event, detail: ownedPlain(detail),
  });
  const entry = Object.freeze({ ...preimage, entrySha256: sha256Bytes(Buffer.from(canonicalJson(preimage), "utf8")) });
  const journalPath = bodyFreeDiagnosticJournalDirectory(diagnosticRoot, true);
  writePrivateJson(path.join(journalPath, `entry-${String(sequence).padStart(6, "0")}.json`), entry);
  const refreshed = readBodyFreeDiagnosticJournal(diagnosticRoot);
  if (refreshed.sequence !== sequence || refreshed.lastSha256 !== entry.entrySha256) {
    fail("local_postgres_body_free_diagnostic_journal_invalid");
  }
  return refreshed;
}

function reserveBodyFreeDiagnosticCall(diagnosticRoot, kind) {
  const state = readBodyFreeDiagnosticJournal(diagnosticRoot);
  if (!["version", "container.inspect"].includes(kind) || state.lifecycleCount !== 1 || state.closure !== null
    || state.dockerCallCounts[kind] >= BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS[kind]) {
    fail("local_postgres_body_free_diagnostic_effect_ceiling_exceeded");
  }
  const detail = Object.freeze({
    effectId: `docker-${String(state.sequence + 1).padStart(6, "0")}-${kind}`,
    kind, ordinal: state.dockerCallCounts[kind] + 1,
  });
  appendBodyFreeDiagnosticJournal(diagnosticRoot, "docker.attempt", detail);
  return detail;
}

function lineShape(bytes) {
  if (bytes.length === 0) return Object.freeze({ lineEndings: "NONE", lineCount: 0 });
  let lf = 0;
  let crlf = 0;
  let bareCr = 0;
  let bareLf = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0x0d) {
      if (bytes[index + 1] === 0x0a) { crlf += 1; index += 1; lf += 1; }
      else bareCr += 1;
    } else if (bytes[index] === 0x0a) { lf += 1; bareLf += 1; }
  }
  const lineEndings = lf === 0 && bareCr === 0 ? "NONE"
    : bareCr === 0 && crlf > 0 && bareLf === 0 ? "CRLF"
      : bareCr === 0 && crlf === 0 && bareLf > 0 ? "LF" : "MIXED_OR_OTHER";
  return Object.freeze({ lineEndings, lineCount: lf + (bytes[bytes.length - 1] === 0x0a ? 0 : 1) });
}

function streamFingerprint(bytes) {
  const shape = lineShape(bytes);
  let utf8 = true;
  try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { utf8 = false; }
  return Object.freeze({
    bytes: bytes.length, sha256: sha256Bytes(bytes), utf8, empty: bytes.length === 0,
    lineEndings: shape.lineEndings, lineCount: shape.lineCount,
  });
}

function diagnosticSignal(value) {
  return typeof value === "string" && BODY_FREE_DIAGNOSTIC_SIGNALS.has(value) ? value : value === null ? "NONE" : "UNKNOWN";
}

function recoveredDiagnosticObservation(effect) {
  const emptySha = sha256Bytes(Buffer.alloc(0));
  return Object.freeze({
    effectId: effect.effectId, kind: effect.kind, ordinal: effect.ordinal,
    spawnOutcome: "UNKNOWN", exitStatus: "NOT_AVAILABLE", signal: "UNKNOWN",
    stdoutBytes: 0, stdoutSha256: emptySha, stdoutUtf8: true, stdoutEmpty: true,
    stdoutLineEndings: "NONE", stdoutLineCount: 0,
    stderrBytes: 0, stderrSha256: emptySha, stderrUtf8: true, stderrEmpty: true,
    stderrLineEndings: "NONE", stderrLineCount: 0,
    diagnosticClassification: "AMBIGUOUS_TRANSPORT", ownershipClassification: "NOT_APPLICABLE",
  });
}

function fingerprintDockerDiagnosticResult(kind, effect, raw, plan) {
  const rawStdout = Buffer.isBuffer(raw?.stdout) ? raw.stdout : null;
  const rawStderr = Buffer.isBuffer(raw?.stderr) ? raw.stderr : null;
  const stdout = rawStdout === null ? Buffer.alloc(0) : Buffer.from(rawStdout);
  const stderr = rawStderr === null ? Buffer.alloc(0) : Buffer.from(rawStderr);
  try {
    if (stdout.length > MAX_DOCKER_OUTPUT_BYTES || stderr.length > MAX_DOCKER_OUTPUT_BYTES) {
      fail("local_postgres_body_free_diagnostic_output_invalid");
    }
    const out = streamFingerprint(stdout);
    const err = streamFingerprint(stderr);
    let spawnOutcome = "COMPLETED";
    if (raw?.error?.code === "ETIMEDOUT") spawnOutcome = "TIMED_OUT";
    else if (raw?.signal !== null && raw?.signal !== undefined) spawnOutcome = "SIGNALED";
    else if (raw?.error !== undefined && raw?.error !== null) spawnOutcome = "SPAWN_ERROR";
    else if (!Number.isSafeInteger(raw?.status) || !Buffer.isBuffer(raw?.stdout) || !Buffer.isBuffer(raw?.stderr)) {
      spawnOutcome = "UNKNOWN";
    }
    const exitStatus = spawnOutcome === "COMPLETED" ? raw.status : "NOT_AVAILABLE";
    const signal = spawnOutcome === "COMPLETED" ? "NONE" : diagnosticSignal(raw?.signal);
    let diagnosticClassification = "AMBIGUOUS_TRANSPORT";
    let ownershipClassification = "NOT_APPLICABLE";
    let stdoutText = null;
    let stderrText = null;
    if (out.utf8) stdoutText = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
    if (err.utf8) stderrText = new TextDecoder("utf-8", { fatal: true }).decode(stderr);
    if (spawnOutcome === "COMPLETED") {
      if (exitStatus === 0 && stdoutText !== null) {
        try {
          if (kind === "version") {
            validateDockerVersion(Object.freeze({ stdout: stdoutText.trim() }));
          } else {
            const parsed = parseStrictJson(stdoutText.trim());
            const labels = parsed?.Config?.Labels;
            if (labels === null || typeof labels !== "object" || Array.isArray(labels)) ownershipClassification = "MALFORMED";
            else if (!Object.hasOwn(labels, plan.resources.labelKey)) ownershipClassification = "UNLABELLED";
            else ownershipClassification = labels[plan.resources.labelKey] === plan.resources.labelValue ? "OWNED" : "FOREIGN";
          }
          diagnosticClassification = "FOUND_JSON";
        } catch { diagnosticClassification = "CONTRACT_INVALID"; ownershipClassification = kind === "version" ? "NOT_APPLICABLE" : "MALFORMED"; }
      } else if (kind === "container.inspect" && exitStatus === 1 && out.empty && stderrText !== null
        && isExactDockerMissingDiagnostic(kind, stderrText, plan)) {
        diagnosticClassification = "MATCHED_EXISTING_MISSING";
      } else if (Number.isSafeInteger(exitStatus) && exitStatus !== 0) diagnosticClassification = "UNCLASSIFIED_NONZERO";
      else diagnosticClassification = "CONTRACT_INVALID";
    }
    return validateBodyFreeDiagnosticObservation(Object.freeze({
      effectId: effect.effectId, kind, ordinal: effect.ordinal, spawnOutcome, exitStatus, signal,
      stdoutBytes: out.bytes, stdoutSha256: out.sha256, stdoutUtf8: out.utf8, stdoutEmpty: out.empty,
      stdoutLineEndings: out.lineEndings, stdoutLineCount: out.lineCount,
      stderrBytes: err.bytes, stderrSha256: err.sha256, stderrUtf8: err.utf8, stderrEmpty: err.empty,
      stderrLineEndings: err.lineEndings, stderrLineCount: err.lineCount,
      diagnosticClassification, ownershipClassification,
    }));
  } finally {
    stdout.fill(0); stderr.fill(0);
    rawStdout?.fill(0); rawStderr?.fill(0);
  }
}

function consumeBodyFreeDiagnosticGrant(diagnosticRoot, now, verifyBindings, crashCheckpoint = undefined) {
  const pending = privatePath(diagnosticRoot, "diagnostic.pending.json");
  const consumed = privatePath(diagnosticRoot, "diagnostic.consumed.json");
  const names = fs.readdirSync(diagnosticRoot).sort(binaryCompare);
  if (names.length !== 2 || names[0] !== "diagnostic.pending.json" || names[1] !== "owner-approval-receipt") {
    fail(fs.existsSync(consumed) ? "local_postgres_body_free_diagnostic_duplicate_consume"
      : "local_postgres_body_free_diagnostic_grant_invalid");
  }
  const record = readPrivateJsonRecord(pending);
  const grant = validateBodyFreeDiagnosticGrant(record.value, now);
  verifyBindings(grant, now);
  if (readOwnerApprovalReceipt(diagnosticRoot, privatePath(diagnosticRoot, "owner-approval-receipt"), false)
    !== grant.ownerApprovalReceiptSha256) fail("local_postgres_owner_approval_receipt_drift");
  try { fs.linkSync(pending, consumed); fsyncPrivateDirectory(diagnosticRoot); }
  catch { fail("local_postgres_body_free_diagnostic_duplicate_consume"); }
  crashCheckpoint?.("grant.consume.link:after");
  const pendingStat = fs.lstatSync(pending, { bigint: true });
  const consumedStat = fs.lstatSync(consumed, { bigint: true });
  if (pendingStat.dev !== consumedStat.dev || pendingStat.ino !== consumedStat.ino
    || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  fs.unlinkSync(pending); fsyncPrivateDirectory(diagnosticRoot);
  crashCheckpoint?.("grant.consume.unlink_pending:after");
  const stable = readPrivateJsonRecord(consumed);
  if (stable.sha256 !== record.sha256) fail("local_postgres_body_free_diagnostic_grant_invalid");
  return Object.freeze({ grant, consumedDiagnosticGrantSha256: stable.sha256 });
}

function recoverBodyFreeDiagnosticGrant(diagnosticRoot, now, verifyBindings) {
  exactFileAbsence(privatePath(diagnosticRoot, "docker-inspect-diagnostic-evidence.json"));
  const allowed = new Set([
    "diagnostic.consumed.json", "diagnostic.pending.json", BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY,
    "docker-config", "docker-home", "owner-approval-receipt",
  ]);
  const names = fs.readdirSync(diagnosticRoot).sort(binaryCompare);
  if (!names.includes("diagnostic.consumed.json") || !names.includes("owner-approval-receipt")
    || names.some((name) => !allowed.has(name))) {
    fail("local_postgres_body_free_diagnostic_grant_invalid");
  }
  const consumedPath = privatePath(diagnosticRoot, "diagnostic.consumed.json");
  const pendingPath = privatePath(diagnosticRoot, "diagnostic.pending.json");
  const pendingPresent = names.includes("diagnostic.pending.json");
  const record = readPrivateJsonRecord(consumedPath, pendingPresent ? 2n : 1n);
  const grant = validateBodyFreeDiagnosticGrantUnchecked(record.value, now, { allowExpired: true });
  verifyBindings(grant, now, { allowExpired: true });
  if (readOwnerApprovalReceipt(diagnosticRoot, privatePath(diagnosticRoot, "owner-approval-receipt"), false)
    !== grant.ownerApprovalReceiptSha256) fail("local_postgres_owner_approval_receipt_drift");
  if (pendingPresent) {
    const pendingRecord = readPrivateJsonRecord(pendingPath, 2n);
    const pendingStat = fs.lstatSync(pendingPath, { bigint: true });
    const consumedStat = fs.lstatSync(consumedPath, { bigint: true });
    if (pendingRecord.sha256 !== record.sha256 || pendingStat.dev !== consumedStat.dev
      || pendingStat.ino !== consumedStat.ino || pendingStat.nlink !== 2n || consumedStat.nlink !== 2n) {
      fail("local_postgres_body_free_diagnostic_grant_invalid");
    }
    fs.unlinkSync(pendingPath);
    fsyncPrivateDirectory(diagnosticRoot);
    exactFileAbsence(pendingPath);
  }
  if (!fs.existsSync(privatePath(diagnosticRoot, BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY))) {
    appendBodyFreeDiagnosticJournal(diagnosticRoot, "grant.consumed", {
      consumedDiagnosticGrantSha256: record.sha256,
    });
  }
  const journal = readBodyFreeDiagnosticJournal(diagnosticRoot);
  if (journal.consumedGrantSha256 !== record.sha256 || ![0, 1].includes(journal.lifecycleCount)
    || journal.closure !== null) {
    fail("local_postgres_body_free_diagnostic_journal_invalid");
  }
  return Object.freeze({ grant, consumedDiagnosticGrantSha256: record.sha256, journal });
}

function revalidateBodyFreeDiagnosticBoundary(context, edge) {
  assertPrivateDirectoryIdentity(context.rootIdentity);
  const now = context.adapters.now(edge);
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(nowMs) || nowMs < instant(context.grant.createdAt) - 60_000
    || nowMs >= instant(context.grant.expiresAt)) fail("local_postgres_body_free_diagnostic_grant_expired");
  if (readOwnerApprovalReceipt(context.diagnosticRoot,
    privatePath(context.diagnosticRoot, "owner-approval-receipt"), false) !== context.grant.ownerApprovalReceiptSha256) {
    fail("local_postgres_owner_approval_receipt_drift");
  }
  const names = fs.readdirSync(context.diagnosticRoot).sort(binaryCompare);
  const expected = [
    "diagnostic.consumed.json", BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY,
    "docker-config", "docker-home", "owner-approval-receipt",
  ].sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_body_free_diagnostic_private_root_invalid");
  }
  context.adapters.revalidateHost(context.grant, context.socket, edge);
  const blocked = context.adapters.inspectBlockedForensicRoot(context.blockedRoot);
  const failedRescue = context.adapters.inspectFailedRescueRoot(context.rescueRoot);
  if (canonicalJson(diagnosticRootProjection(blocked, context.grant.blocked)) !== canonicalJson(context.grant.blocked)
    || canonicalJson(diagnosticRootProjection(failedRescue, context.grant.failedRescue))
      !== canonicalJson(context.grant.failedRescue)) fail("local_postgres_body_free_diagnostic_forensic_drift");
  assertPrivateDirectoryIdentity(context.rootIdentity);
}

function callBodyFreeDiagnosticDocker(context, kind) {
  if (!["version", "container.inspect"].includes(kind)) fail("local_postgres_docker_command_denied");
  const argv = approvedDockerArgv(context.plan, kind, planStep(context.plan, kind).argv);
  revalidateBodyFreeDiagnosticBoundary(context, `${kind}:before`);
  const reservation = reserveBodyFreeDiagnosticCall(context.diagnosticRoot, kind);
  const raw = context.adapters.callDocker(kind, argv, context);
  context.adapters.crashCheckpoint?.(`${kind}:after_call_before_completion`);
  revalidateBodyFreeDiagnosticBoundary(context, `${kind}:after`);
  appendBodyFreeDiagnosticJournal(context.diagnosticRoot, "docker.completed", reservation);
  const observation = fingerprintDockerDiagnosticResult(kind, reservation, raw, context.plan);
  appendBodyFreeDiagnosticJournal(context.diagnosticRoot, "observation.recorded", observation);
  return observation;
}

function diagnosticHostObservation(grant, journal) {
  const version = [...journal.observations.values()].find((item) => item.kind === "version");
  const matched = version?.diagnosticClassification === "FOUND_JSON";
  return Object.freeze({
    dockerCliIdentitySha256: grant.host.dockerCliIdentitySha256,
    socketIdentitySha256: grant.host.socketIdentitySha256,
    dockerClientVersion: matched ? "29.3.1" : "NOT_OBSERVED",
    dockerServerVersion: matched ? "29.3.1" : "NOT_OBSERVED",
    dockerServerPlatform: matched ? IMAGE_PLATFORM : "NOT_OBSERVED",
  });
}

function buildBodyFreeDiagnosticReceipt(context, status, terminalReason) {
  const journal = readBodyFreeDiagnosticJournal(context.diagnosticRoot);
  const observed = status === "OBSERVED";
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-receipt.v1",
    status, code: observed ? "local_postgres_body_free_diagnostic_observed" : "local_postgres_body_free_diagnostic_blocked",
    consumedDiagnosticGrantSha256: context.consumedDiagnosticGrantSha256,
    authority: context.grant.authority, lineage: context.grant.lineage, artifacts: context.grant.artifacts,
    blocked: context.grant.blocked, failedRescue: context.grant.failedRescue,
    hostObservation: diagnosticHostObservation(context.grant, journal),
    effects: Object.freeze({ dockerCallCounts: Object.freeze({ ...journal.dockerCallCounts }) }),
    observations: Object.freeze([...journal.observations.values()].sort((left, right) => {
      const order = { version: 0, "container.inspect": 1 };
      return order[left.kind] - order[right.kind];
    })),
    closure: Object.freeze({
      diagnosticLocalResidueCount: journal.closure?.diagnosticLocalResidueCount ?? 0,
      blockedRootUnchanged: journal.closure?.blockedRootUnchanged ?? false,
      failedRescueRootUnchanged: journal.closure?.failedRescueRootUnchanged ?? false,
      retainedDiagnosticForensicFiles: Object.freeze([
        "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
        BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY, "owner-approval-receipt",
      ]),
      terminalReason,
    }),
    journal: Object.freeze({ entryCount: journal.sequence, headSha256: journal.lastSha256 }),
    readiness: Object.freeze({
      diagnosticObservationCaptured: observed, resourceAbsenceProven: false, cleanupRescueGreen: false,
      physicalExecutionPerformed: false, targetPostgresObserved: false, productRuntimeEffects: false,
      trafficReady: false, gateCReady: false,
    }),
  });
}

function validateBodyFreeDiagnosticReceiptUnchecked(rawReceipt, grant, journal, consumedDiagnosticGrantSha256) {
  const receipt = ownedPlain(rawReceipt);
  exactKeys(receipt, BODY_FREE_DIAGNOSTIC_RECEIPT_KEYS);
  exactKeys(receipt.authority, BODY_FREE_DIAGNOSTIC_AUTHORITY_KEYS);
  exactKeys(receipt.lineage, BODY_FREE_DIAGNOSTIC_LINEAGE_KEYS);
  exactKeys(receipt.artifacts, BODY_FREE_DIAGNOSTIC_ARTIFACT_KEYS);
  exactKeys(receipt.hostObservation, BODY_FREE_DIAGNOSTIC_RECEIPT_HOST_KEYS);
  exactKeys(receipt.effects, BODY_FREE_DIAGNOSTIC_RECEIPT_EFFECT_KEYS);
  exactKeys(receipt.effects.dockerCallCounts, LOCAL_POSTGRES_DOCKER_COMMAND_KINDS);
  exactKeys(receipt.closure, BODY_FREE_DIAGNOSTIC_RECEIPT_CLOSURE_KEYS);
  exactKeys(receipt.journal, BODY_FREE_DIAGNOSTIC_RECEIPT_JOURNAL_KEYS);
  exactKeys(receipt.readiness, BODY_FREE_DIAGNOSTIC_RECEIPT_READINESS_KEYS);
  if (!Array.isArray(receipt.observations)) fail("local_postgres_body_free_diagnostic_receipt_invalid");
  const observations = receipt.observations.map(validateBodyFreeDiagnosticObservation);
  if (receipt.schemaVersion !== "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-receipt.v1"
    || !["OBSERVED", "FAILED"].includes(receipt.status)
    || !["local_postgres_body_free_diagnostic_observed", "local_postgres_body_free_diagnostic_blocked"].includes(receipt.code)
    || receipt.consumedDiagnosticGrantSha256 !== consumedDiagnosticGrantSha256
    || canonicalJson(receipt.authority) !== canonicalJson(grant.authority)
    || canonicalJson(receipt.lineage) !== canonicalJson(grant.lineage)
    || canonicalJson(receipt.artifacts) !== canonicalJson(grant.artifacts)
    || canonicalJson(receipt.blocked) !== canonicalJson(grant.blocked)
    || canonicalJson(receipt.failedRescue) !== canonicalJson(grant.failedRescue)
    || canonicalJson(receipt.effects.dockerCallCounts) !== canonicalJson(journal.dockerCallCounts)
    || canonicalJson(observations) !== canonicalJson([...journal.observations.values()].sort((left, right) => {
      const order = { version: 0, "container.inspect": 1 }; return order[left.kind] - order[right.kind];
    }))
    || receipt.journal.entryCount !== journal.sequence || receipt.journal.headSha256 !== journal.lastSha256
    || receipt.hostObservation.dockerCliIdentitySha256 !== grant.host.dockerCliIdentitySha256
    || receipt.hostObservation.socketIdentitySha256 !== grant.host.socketIdentitySha256) {
    fail("local_postgres_body_free_diagnostic_receipt_invalid");
  }
  for (const [kind, count] of Object.entries(receipt.effects.dockerCallCounts)) {
    if (!Number.isSafeInteger(count) || count < 0 || count > BODY_FREE_DIAGNOSTIC_DOCKER_CALL_CEILINGS[kind]) {
      fail("local_postgres_body_free_diagnostic_receipt_invalid");
    }
  }
  const retained = [
    "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
    BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY, "owner-approval-receipt",
  ];
  if (receipt.closure.diagnosticLocalResidueCount !== 0
    || canonicalJson(receipt.closure.retainedDiagnosticForensicFiles) !== canonicalJson(retained)
    || typeof receipt.closure.terminalReason !== "string" || receipt.closure.terminalReason.length < 1
    || receipt.readiness.resourceAbsenceProven !== false || receipt.readiness.cleanupRescueGreen !== false
    || receipt.readiness.physicalExecutionPerformed !== false || receipt.readiness.targetPostgresObserved !== false
    || receipt.readiness.productRuntimeEffects !== false || receipt.readiness.trafficReady !== false
    || receipt.readiness.gateCReady !== false) fail("local_postgres_body_free_diagnostic_receipt_invalid");
  if (receipt.status === "OBSERVED") {
    if (receipt.code !== "local_postgres_body_free_diagnostic_observed" || !journal.closure
      || !journal.closure.blockedRootUnchanged || !journal.closure.failedRescueRootUnchanged
      || observations.length !== 2 || observations[0].kind !== "version" || observations[1].kind !== "container.inspect"
      || observations[0].diagnosticClassification !== "FOUND_JSON"
      || receipt.hostObservation.dockerClientVersion !== "29.3.1"
      || receipt.hostObservation.dockerServerVersion !== "29.3.1"
      || receipt.hostObservation.dockerServerPlatform !== IMAGE_PLATFORM
      || receipt.readiness.diagnosticObservationCaptured !== true) {
      fail("local_postgres_body_free_diagnostic_receipt_invalid");
    }
  } else if (receipt.code !== "local_postgres_body_free_diagnostic_blocked"
    || receipt.readiness.diagnosticObservationCaptured !== false) {
    fail("local_postgres_body_free_diagnostic_receipt_invalid");
  }
  return receipt;
}

function validateBodyFreeDiagnosticReceipt(rawReceipt, grant, journal, consumedDiagnosticGrantSha256) {
  try { return validateBodyFreeDiagnosticReceiptUnchecked(rawReceipt, grant, journal, consumedDiagnosticGrantSha256); }
  catch (error) {
    if (authenticLocalPostgresRunnerErrorDetails(error)?.code === "local_postgres_body_free_diagnostic_receipt_invalid") throw error;
    fail("local_postgres_body_free_diagnostic_receipt_invalid");
  }
}

function writeBodyFreeDiagnosticReceipt(context, receipt) {
  const evidencePath = privatePath(context.diagnosticRoot, "docker-inspect-diagnostic-evidence.json");
  exactFileAbsence(evidencePath);
  const journal = readBodyFreeDiagnosticJournal(context.diagnosticRoot);
  const validated = validateBodyFreeDiagnosticReceipt(
    receipt, context.grant, journal, context.consumedDiagnosticGrantSha256,
  );
  writePrivateJson(evidencePath, validated);
  const committed = readPrivateJsonRecord(evidencePath);
  validateBodyFreeDiagnosticReceipt(
    committed.value, context.grant, readBodyFreeDiagnosticJournal(context.diagnosticRoot),
    context.consumedDiagnosticGrantSha256,
  );
  const names = fs.readdirSync(context.diagnosticRoot).sort(binaryCompare);
  const expected = [
    "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
    BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY, "owner-approval-receipt",
  ].sort(binaryCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    fail("local_postgres_body_free_diagnostic_private_root_invalid");
  }
  return committed.value;
}

function recoverOpenBodyFreeDiagnosticEffects(diagnosticRoot) {
  let state = readBodyFreeDiagnosticJournal(diagnosticRoot);
  for (const effect of [...state.openEffects.values()]) {
    appendBodyFreeDiagnosticJournal(diagnosticRoot, "diagnostic.recovered", recoveredDiagnosticObservation(effect));
    state = readBodyFreeDiagnosticJournal(diagnosticRoot);
  }
  return state;
}

function bodyFreeDiagnosticSnapshotsUnchanged(context) {
  let blockedRootUnchanged = false;
  let failedRescueRootUnchanged = false;
  try {
    const blocked = context.adapters.inspectBlockedForensicRoot(context.blockedRoot);
    blockedRootUnchanged = canonicalJson(diagnosticRootProjection(blocked, context.grant.blocked))
      === canonicalJson(context.grant.blocked);
  } catch { blockedRootUnchanged = false; }
  try {
    const rescue = context.adapters.inspectFailedRescueRoot(context.rescueRoot);
    failedRescueRootUnchanged = canonicalJson(diagnosticRootProjection(rescue, context.grant.failedRescue))
      === canonicalJson(context.grant.failedRescue);
  } catch { failedRescueRootUnchanged = false; }
  return Object.freeze({ blockedRootUnchanged, failedRescueRootUnchanged });
}

function finalizeBodyFreeDiagnostic(context, terminalReason, forceFailed = false) {
  recoverOpenBodyFreeDiagnosticEffects(context.diagnosticRoot);
  const snapshots = bodyFreeDiagnosticSnapshotsUnchanged(context);
  const state = readBodyFreeDiagnosticJournal(context.diagnosticRoot);
  if (state.closure === null) {
    appendBodyFreeDiagnosticJournal(context.diagnosticRoot, "closure.proven", {
      diagnosticLocalResidueCount: 0,
      blockedRootUnchanged: snapshots.blockedRootUnchanged,
      failedRescueRootUnchanged: snapshots.failedRescueRootUnchanged,
    });
  }
  const closed = readBodyFreeDiagnosticJournal(context.diagnosticRoot);
  const hasVersion = [...closed.observations.values()].some((item) => item.kind === "version"
    && item.diagnosticClassification === "FOUND_JSON");
  const hasInspect = [...closed.observations.values()].some((item) => item.kind === "container.inspect");
  const observed = !forceFailed && hasVersion && hasInspect
    && closed.closure?.blockedRootUnchanged === true && closed.closure?.failedRescueRootUnchanged === true;
  return writeBodyFreeDiagnosticReceipt(context,
    buildBodyFreeDiagnosticReceipt(context, observed ? "OBSERVED" : "FAILED", terminalReason));
}

async function runBodyFreeDiagnosticWithAdapters(input, adapters) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["diagnosticRoot", "blockedRoot", "rescueRoot", "evidenceOut"]);
  if (typeof stable.diagnosticRoot !== "string" || !path.isAbsolute(stable.diagnosticRoot)
    || stable.blockedRoot !== BLOCKED_PRIVATE_ROOT || stable.rescueRoot !== FAILED_RESCUE_PRIVATE_ROOT
    || stable.evidenceOut !== path.join(stable.diagnosticRoot, "docker-inspect-diagnostic-evidence.json")) {
    fail("local_postgres_body_free_diagnostic_private_root_invalid");
  }
  let diagnosticRoot;
  try { diagnosticRoot = fs.realpathSync(stable.diagnosticRoot); }
  catch { fail("local_postgres_body_free_diagnostic_private_root_invalid"); }
  if (diagnosticRoot !== stable.diagnosticRoot) fail("local_postgres_body_free_diagnostic_private_root_invalid");
  const rootIdentity = privateDirectoryIdentity(diagnosticRoot);
  const initialNames = fs.readdirSync(diagnosticRoot).sort(binaryCompare);
  const recovery = initialNames.includes("diagnostic.consumed.json")
    && !initialNames.includes("docker-inspect-diagnostic-evidence.json");
  const observedAt = adapters.now("entry");
  const consumed = recovery
    ? recoverBodyFreeDiagnosticGrant(diagnosticRoot, observedAt, adapters.verifyBindings)
    : consumeBodyFreeDiagnosticGrant(diagnosticRoot, observedAt, adapters.verifyBindings, adapters.crashCheckpoint);
  const grant = consumed.grant;
  let socket = null;
  if (!recovery) {
    const cli = adapters.observeDockerCliIdentity();
    socket = adapters.resolveSocketIdentity();
    if (cli.identitySha256 !== grant.host.dockerCliIdentitySha256
      || socket.identitySha256 !== grant.host.socketIdentitySha256) {
      fail("local_postgres_body_free_diagnostic_binding_invalid");
    }
  }
  const context = {
    diagnosticRoot, blockedRoot: stable.blockedRoot, rescueRoot: stable.rescueRoot, rootIdentity,
    grant, consumedDiagnosticGrantSha256: consumed.consumedDiagnosticGrantSha256, socket, adapters,
    isolated: null,
    plan: buildLocalPostgresDockerPlan({
      grantId: BLOCKED_GRANT_ID, secretMountSource: path.join(diagnosticRoot, "unused-password-file"),
    }),
  };
  if (recovery) {
    let cleanupFailed = false;
    try { cleanupIsolatedDockerHome(diagnosticRoot); }
    catch { cleanupFailed = true; }
    const receipt = finalizeBodyFreeDiagnostic(context, "CRASH_RECOVERED", cleanupFailed);
    if (receipt.status !== "OBSERVED") throw new LocalPostgresRunnerError(receipt.code);
    return receipt;
  }
  appendBodyFreeDiagnosticJournal(diagnosticRoot, "grant.consumed", {
    consumedDiagnosticGrantSha256: consumed.consumedDiagnosticGrantSha256,
  });
  adapters.crashCheckpoint?.("grant.consumed:after");
  appendBodyFreeDiagnosticJournal(diagnosticRoot, "diagnostic.lifecycle_started", { ordinal: 1 });
  let failure = null;
  let setupAttempted = false;
  try {
    setupAttempted = true;
    context.isolated = prepareIsolatedDockerHome(diagnosticRoot);
    const version = callBodyFreeDiagnosticDocker(context, "version");
    if (version.diagnosticClassification !== "FOUND_JSON") fail("local_postgres_body_free_diagnostic_host_invalid");
    callBodyFreeDiagnosticDocker(context, "container.inspect");
  } catch (error) {
    if (error === BODY_FREE_DIAGNOSTIC_SIMULATED_CRASH) throw error;
    failure = error;
  }
  let cleanupFailed = false;
  try { if (setupAttempted) cleanupIsolatedDockerHome(diagnosticRoot); }
  catch { cleanupFailed = true; }
  const terminalReason = cleanupFailed ? "LOCAL_CLOSURE_FAILED"
    : failure === null ? "OBSERVATION_CAPTURED"
      : authenticLocalPostgresRunnerErrorDetails(failure)?.code ?? "DIAGNOSTIC_BLOCKED";
  const receipt = finalizeBodyFreeDiagnostic(context, terminalReason, failure !== null || cleanupFailed);
  if (receipt.status !== "OBSERVED") throw new LocalPostgresRunnerError(receipt.code);
  return receipt;
}

function productionBodyFreeDiagnosticDockerCall(_kind, argv, context) {
  const result = spawnSync(DOCKER_CLI, ["--host", `unix://${context.socket.socketPath}`, ...argv], {
    cwd: "/", encoding: null, env: dockerEnvironment(context.isolated),
    maxBuffer: MAX_DOCKER_OUTPUT_BYTES, timeout: 60_000,
  });
  return Object.freeze({
    status: result.status, signal: result.signal, error: result.error,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
    stderr: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
  });
}

export async function runApprovedBodyFreeDockerInspectDiagnostic(input) {
  return runBodyFreeDiagnosticWithAdapters(input, Object.freeze({
    inspectBlockedForensicRoot, inspectFailedRescueRoot: inspectFailedCleanupRescueRoot,
    verifyBindings: verifyBodyFreeDiagnosticCommittedBindings,
    observeDockerCliIdentity, resolveSocketIdentity: resolveDockerSocketIdentity,
    revalidateHost(grant, socket) {
      if (observeDockerCliIdentity().identitySha256 !== grant.host.dockerCliIdentitySha256) {
        fail("local_postgres_docker_cli_drift");
      }
      if (socket.identitySha256 !== grant.host.socketIdentitySha256) fail("local_postgres_socket_identity_drift");
      revalidateDockerSocketIdentity(socket);
    },
    callDocker: productionBodyFreeDiagnosticDockerCall,
    now: () => new Date(),
  }));
}

function fakeBodyFreeDiagnosticDerived() {
  const fakeSha = (domain) => sha256Bytes(Buffer.from(`r4-body-free-diagnostic-fake-${domain}`, "utf8"));
  const lineage = Object.freeze({
    cleanupRescueOwnerReviewHead: FAILED_RESCUE_REVIEW_HEAD,
    cleanupRescueOwnerReviewTree: FAILED_RESCUE_REVIEW_TREE,
    constructionAddendumHead: BODY_FREE_DIAGNOSTIC_ADDENDUM_HEAD,
    constructionAddendumTree: BODY_FREE_DIAGNOSTIC_ADDENDUM_TREE,
    constructionOwnerReviewHead: BODY_FREE_DIAGNOSTIC_REVIEW_HEAD,
    constructionOwnerReviewTree: BODY_FREE_DIAGNOSTIC_REVIEW_TREE,
    pathCorrectionAddendumHead: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_HEAD,
    pathCorrectionAddendumTree: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_TREE,
    pathCorrectionOwnerReviewHead: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_HEAD,
    pathCorrectionOwnerReviewTree: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_TREE,
    diagnosticImplementationHead: "1".repeat(40), diagnosticImplementationTree: "2".repeat(40),
    diagnosticImplementationArtifactAggregateSha256: fakeSha("aggregate"),
    diagnosticEvidenceHead: "3".repeat(40), diagnosticEvidenceTree: "4".repeat(40),
    diagnosticStatusHead: "5".repeat(40), diagnosticStatusTree: "6".repeat(40),
    diagnosticCardHead: "7".repeat(40), diagnosticCardTree: "8".repeat(40),
    diagnosticOwnerReviewHead: "9".repeat(40), diagnosticOwnerReviewTree: "a".repeat(40),
  });
  const artifacts = Object.freeze({
    diagnosticArtifactIndexSha256: fakeSha("index"), diagnosticEvidenceSchemaSha256: fakeSha("schema"),
    diagnosticEvidenceSha256: fakeSha("evidence"), diagnosticReportSha256: fakeSha("report"),
    diagnosticStatusCommittedAuditSummarySha256: fakeSha("audit"), runnerSha256: fakeSha("runner"),
    runnerTestSha256: fakeSha("test"),
  });
  return Object.freeze({
    authority: Object.freeze({
      constructionAddendumSha256: BODY_FREE_DIAGNOSTIC_ADDENDUM_SHA256,
      constructionOwnerReviewSha256: BODY_FREE_DIAGNOSTIC_REVIEW_SHA256,
      pathCorrectionAddendumSha256: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_SHA256,
      pathCorrectionOwnerReviewSha256: BODY_FREE_DIAGNOSTIC_PATH_CORRECTION_REVIEW_SHA256,
      diagnosticCardSha256: fakeSha("card"), diagnosticOwnerReviewSha256: fakeSha("review"),
      diagnosticAuthorityPayloadSha256: fakeSha("payload"),
    }),
    lineage, artifacts, blocked: cleanupRescueBlockedContract(),
    failedRescue: bodyFreeDiagnosticFailedRescueContract(), host: bodyFreeDiagnosticHostContract(),
    ceilings: bodyFreeDiagnosticCeilings(),
  });
}

function fakeBodyFreeDiagnosticSnapshot(contract, mutation = null) {
  const snapshot = JSON.parse(canonicalJson(contract));
  if (mutation === "blocked") snapshot.rootIno = "1";
  else if (mutation === "failed_rescue") snapshot.journalHeadSha256 = `sha256:${"f".repeat(64)}`;
  const frozen = Object.freeze(snapshot);
  return Object.freeze({
    ...frozen, snapshotSha256: sha256Bytes(Buffer.from(canonicalJson(frozen), "utf8")),
  });
}

function fakeBodyFreeDiagnosticGrant(ownerApprovalReceiptSha256) {
  const derived = fakeBodyFreeDiagnosticDerived();
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-grant.v1",
    diagnosticGrantId: "d".repeat(32), ownerApprovalReceiptSha256,
    authority: derived.authority, lineage: derived.lineage, artifacts: derived.artifacts,
    blocked: derived.blocked, failedRescue: derived.failedRescue,
    host: Object.freeze({
      ...derived.host, dockerCliIdentitySha256: `sha256:${"b".repeat(64)}`,
      socketIdentitySha256: `sha256:${"c".repeat(64)}`,
    }),
    ceilings: derived.ceilings, localOnly: true, productionEffectsAllowed: false,
    createdAt: "2026-08-14T20:00:00.000Z", expiresAt: "2026-08-14T21:00:00.000Z",
  });
}

export function runLocalPostgresBodyFreeDiagnosticAuthorityFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, stable.mutation === undefined ? [] : ["mutation"]);
  const mutation = stable.mutation ?? "none";
  const allowed = new Set([
    "none", "duplicate_marker", "prefixed_marker", "top_extra", "authority", "lineage", "artifacts",
    "blocked", "failed_rescue", "host", "ceiling",
  ]);
  if (!allowed.has(mutation)) fail("local_postgres_fake_fault_invalid");
  const derived = fakeBodyFreeDiagnosticDerived();
  const payload = {
    schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-authority.v1",
    authority: { ...selectKeys(derived.authority, BODY_FREE_DIAGNOSTIC_PAYLOAD_AUTHORITY_KEYS) },
    lineage: { ...selectKeys(derived.lineage, BODY_FREE_DIAGNOSTIC_PAYLOAD_LINEAGE_KEYS) },
    artifacts: { ...derived.artifacts }, blocked: JSON.parse(canonicalJson(derived.blocked)),
    failedRescue: JSON.parse(canonicalJson(derived.failedRescue)), host: { ...derived.host },
    ceilings: JSON.parse(canonicalJson(derived.ceilings)), localOnly: true, productionEffectsAllowed: false,
  };
  if (mutation === "top_extra") payload.extra = true;
  else if (mutation === "authority") payload.authority.pathCorrectionOwnerReviewSha256 = `sha256:${"f".repeat(64)}`;
  else if (mutation === "lineage") payload.lineage.pathCorrectionOwnerReviewHead = "f".repeat(40);
  else if (mutation === "artifacts") payload.artifacts.runnerSha256 = "bad";
  else if (mutation === "blocked") payload.blocked.rootIno = "1";
  else if (mutation === "failed_rescue") payload.failedRescue.journalEntryCount = 7;
  else if (mutation === "host") payload.host.dockerServerPlatform = "linux/amd64";
  else if (mutation === "ceiling") payload.ceilings.dockerCalls["container.rm"] = 1;
  const canonical = canonicalJson(payload);
  let card = `fake diagnostic card\n${BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN}\n${canonical}\n${BODY_FREE_DIAGNOSTIC_AUTHORITY_END}\n`;
  if (mutation === "duplicate_marker") card += `${BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN}\n${canonical}\n${BODY_FREE_DIAGNOSTIC_AUTHORITY_END}\n`;
  if (mutation === "prefixed_marker") card = card.replace(BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN,
    `prefix${BODY_FREE_DIAGNOSTIC_AUTHORITY_BEGIN}`);
  let accepted = false;
  let code = null;
  try { parseBodyFreeDiagnosticAuthorityCard(Buffer.from(card, "utf8")); accepted = true; }
  catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-authority-fake-result.v1",
    mutation, accepted, code, physicalEffects: 0,
  });
}

export function runLocalPostgresBodyFreeDiagnosticGrantValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set([
    "none", "top_extra", "missing_key", "schema", "grant_id", "owner_receipt", "authority", "lineage",
    "artifacts", "blocked", "failed_rescue", "host", "ceiling", "docker_ceiling", "local_only",
    "production", "expired", "future_created",
  ]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const grant = JSON.parse(canonicalJson(fakeBodyFreeDiagnosticGrant(`sha256:${"1".repeat(64)}`)));
  if (stable.mutation === "top_extra") grant.extra = true;
  else if (stable.mutation === "missing_key") delete grant.failedRescue;
  else if (stable.mutation === "schema") grant.schemaVersion = "v0";
  else if (stable.mutation === "grant_id") grant.diagnosticGrantId = "bad";
  else if (stable.mutation === "owner_receipt") grant.ownerApprovalReceiptSha256 = "bad";
  else if (stable.mutation === "authority") grant.authority.diagnosticCardSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "lineage") grant.lineage.diagnosticOwnerReviewTree = "f".repeat(40);
  else if (stable.mutation === "artifacts") grant.artifacts.runnerSha256 = "bad";
  else if (stable.mutation === "blocked") grant.blocked.rootIno = "1";
  else if (stable.mutation === "failed_rescue") grant.failedRescue.journalEntryCount = 7;
  else if (stable.mutation === "host") grant.host.dockerServerPlatform = "linux/amd64";
  else if (stable.mutation === "ceiling") grant.ceilings.maximumDiagnosticLifecycles = 2;
  else if (stable.mutation === "docker_ceiling") grant.ceilings.dockerCalls["container.stop"] = 1;
  else if (stable.mutation === "local_only") grant.localOnly = false;
  else if (stable.mutation === "production") grant.productionEffectsAllowed = true;
  else if (stable.mutation === "expired") grant.expiresAt = grant.createdAt;
  else if (stable.mutation === "future_created") grant.createdAt = "2026-08-14T20:02:00.000Z";
  let accepted = false;
  let code = null;
  try {
    validateBodyFreeDiagnosticGrant(grant, new Date("2026-08-14T20:00:01.000Z"));
    assertBodyFreeDiagnosticGrantMatchesDerived(grant, fakeBodyFreeDiagnosticDerived());
    accepted = true;
  } catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-grant-validation-fake-result.v1",
    mutation: stable.mutation, accepted, code, physicalEffects: 0,
  });
}

export function runLocalPostgresBodyFreeDiagnosticPrepareFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  const expectedKeys = [];
  if (stable.mutation !== undefined) expectedKeys.push("mutation");
  if (stable.stage !== undefined) expectedKeys.push("stage");
  if (stable.edge !== undefined) expectedKeys.push("edge");
  exactKeys(stable, expectedKeys);
  const mutation = stable.mutation ?? "none";
  const allowed = new Set(["none", "blocked", "failed_rescue", "expired", "root_extra"]);
  if (!allowed.has(mutation)) fail("local_postgres_fake_fault_invalid");
  const injectedStage = stable.stage ?? null;
  const injectedEdge = stable.edge ?? null;
  if ((injectedStage === null) !== (injectedEdge === null)
    || (injectedStage !== null && !BODY_FREE_DIAGNOSTIC_PREPARE_STAGE_SET.has(injectedStage))
    || (injectedEdge !== null && injectedEdge !== "before" && injectedEdge !== "after")
    || (injectedStage !== null && mutation !== "none")) fail("local_postgres_fake_fault_invalid");
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-diagnostic-prepare-")));
  const receiptPath = path.join(temporaryRoot, "owner-approval-receipt");
  fs.writeFileSync(receiptPath, "fake body-free diagnostic approval", { mode: 0o600 });
  fs.chmodSync(receiptPath, 0o600);
  let result;
  try {
    if (mutation === "root_extra") fs.writeFileSync(path.join(temporaryRoot, "foreign"), "foreign", { mode: 0o600 });
    const receipt = prepareBodyFreeDiagnosticGrantWithAdapters({
      diagnosticRoot: temporaryRoot, blockedRoot: BLOCKED_PRIVATE_ROOT, rescueRoot: FAILED_RESCUE_PRIVATE_ROOT,
      diagnosticOwnerReviewHead: "9".repeat(40), ownerApprovalReceiptPath: receiptPath,
      createdAt: "2026-08-14T20:00:00.000Z",
      expiresAt: mutation === "expired" ? "2026-08-14T20:00:00.000Z" : "2026-08-14T21:00:00.000Z",
    }, Object.freeze({
      inspectBlockedForensicRoot: () => fakeBodyFreeDiagnosticSnapshot(cleanupRescueBlockedContract(),
        mutation === "blocked" ? "blocked" : null),
      inspectFailedRescueRoot: () => fakeBodyFreeDiagnosticSnapshot(bodyFreeDiagnosticFailedRescueContract(),
        mutation === "failed_rescue" ? "failed_rescue" : null),
      deriveAuthority: () => fakeBodyFreeDiagnosticDerived(),
      observeDockerCliIdentity: () => Object.freeze({ identitySha256: `sha256:${"b".repeat(64)}` }),
      resolveSocketIdentity: () => Object.freeze({ identitySha256: `sha256:${"c".repeat(64)}` }),
      randomBytes: () => Buffer.alloc(16, 0xd), now: () => new Date("2026-08-14T20:00:01.000Z"),
      prepareCheckpoint(stage, edge) {
        if (stage === injectedStage && edge === injectedEdge) throw new Error("private fake prepare failure body");
      },
      pendingInstallHooks: injectedStage === "PENDING_ROLLBACK" ? Object.freeze({
        checkpoint(name, edge) {
          if (name === "pending.write" && edge === "after") throw new Error("private fake primary failure body");
        },
      }) : undefined,
      verifyBindings(candidate, observedAt) {
        const validated = validateBodyFreeDiagnosticGrant(candidate, observedAt);
        assertBodyFreeDiagnosticGrantMatchesDerived(validated, fakeBodyFreeDiagnosticDerived());
      },
    }));
    result = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-prepare-fake-result.v1",
      status: "GREEN", code: "local_postgres_body_free_diagnostic_prepare_green", receipt,
      grant: readPrivateJson(path.join(temporaryRoot, "diagnostic.pending.json")),
      prepareStage: null, rootEntries: Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare)), physicalEffects: 0,
    });
  } catch (error) {
    const details = authenticLocalPostgresRunnerErrorDetails(error);
    result = Object.freeze({
      schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-prepare-fake-result.v1",
      status: "FAILED", code: details?.code ?? "local_postgres_runner_failed",
      prepareStage: details?.prepareStage ?? null,
      receipt: null, grant: null, rootEntries: Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare)),
      physicalEffects: 0,
    });
  } finally { fs.rmSync(temporaryRoot, { recursive: true, force: true }); }
  return result;
}

function fakeBodyFreeDiagnosticDockerResult(kind, scenario, plan) {
  const version = Buffer.from(canonicalJson({
    Client: { Version: "29.3.1" }, Server: { Version: "29.3.1", Os: "linux", Arch: "arm64" },
  }), "utf8");
  if (kind === "version") {
    if (scenario === "version_invalid") return { status: 0, signal: null, stdout: Buffer.from("{}", "utf8"), stderr: Buffer.alloc(0) };
    return { status: 0, signal: null, stdout: version, stderr: Buffer.alloc(0) };
  }
  if (scenario === "missing") return {
    status: 1, signal: null, stdout: Buffer.alloc(0),
    stderr: Buffer.from(`Error: No such object: ${plan.resources.container}\n`, "utf8"),
  };
  if (scenario === "found_owned" || scenario === "found_foreign" || scenario === "found_unlabelled"
    || scenario === "found_malformed") {
    const labels = scenario === "found_owned" ? { [plan.resources.labelKey]: plan.resources.labelValue }
      : scenario === "found_foreign" ? { [plan.resources.labelKey]: "foreign" }
        : scenario === "found_unlabelled" ? {} : null;
    return { status: 0, signal: null, stdout: Buffer.from(canonicalJson({ Config: { Labels: labels } }), "utf8"), stderr: Buffer.alloc(0) };
  }
  if (scenario === "unclassified_nonzero") return {
    status: 125, signal: null, stdout: Buffer.from("unexpected\n", "utf8"),
    stderr: Buffer.from("diagnostic\r\nsecond\r\n", "utf8"),
  };
  if (scenario === "invalid_utf8") return { status: 125, signal: null, stdout: Buffer.from([0xff, 0xfe]), stderr: Buffer.alloc(0) };
  if (scenario === "multiline") return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from("first\nsecond\n", "utf8") };
  if (scenario === "timeout") return { status: null, signal: null, error: Object.freeze({ code: "ETIMEDOUT" }), stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  if (scenario === "signal") return { status: null, signal: "SIGTERM", stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  if (scenario === "spawn_error") return { status: null, signal: null, error: Object.freeze({ code: "ENOENT" }), stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  if (scenario === "truncated") return {
    status: null, signal: null, error: Object.freeze({ code: "ENOBUFS" }),
    stdout: Buffer.from("partial-output", "utf8"), stderr: Buffer.from("partial-error", "utf8"),
  };
  if (scenario === "unknown") return { status: null, signal: null, stdout: "not-a-buffer", stderr: Buffer.alloc(0) };
  if (scenario === "contract_invalid") return { status: 0, signal: null, stdout: Buffer.from("not-json", "utf8"), stderr: Buffer.alloc(0) };
  fail("local_postgres_fake_fault_invalid");
}

async function executeBodyFreeDiagnosticFake(input) {
  const stable = ownedPlain(input);
  const allowedKeys = new Set(["scenario", "crashAt", "duplicateConsume", "clockExpiredAt", "hostDriftAt", "forensicDriftAt"]);
  if (Object.keys(stable).some((key) => !allowedKeys.has(key))) fail("local_postgres_fake_fault_invalid");
  const scenario = stable.scenario ?? "missing";
  const scenarios = new Set([
    "missing", "found_owned", "found_foreign", "found_unlabelled", "found_malformed", "unclassified_nonzero",
    "invalid_utf8", "multiline", "timeout", "signal", "spawn_error", "truncated", "unknown",
    "contract_invalid", "version_invalid",
  ]);
  if (!scenarios.has(scenario)
    || (stable.crashAt !== undefined && ![
      "grant.consume.link:after", "grant.consume.unlink_pending:after", "grant.consumed:after",
      "version:after_call_before_completion", "container.inspect:after_call_before_completion",
    ].includes(stable.crashAt))
    || (stable.duplicateConsume !== undefined && typeof stable.duplicateConsume !== "boolean")
    || (stable.clockExpiredAt !== undefined && typeof stable.clockExpiredAt !== "string")
    || (stable.hostDriftAt !== undefined && typeof stable.hostDriftAt !== "string")
    || (stable.forensicDriftAt !== undefined && (!Number.isSafeInteger(stable.forensicDriftAt) || stable.forensicDriftAt < 1))) {
    fail("local_postgres_fake_fault_invalid");
  }
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-diagnostic-run-")));
  const ownerPath = path.join(temporaryRoot, "owner-approval-receipt");
  fs.writeFileSync(ownerPath, "fake body-free diagnostic execution approval", { mode: 0o600 });
  fs.chmodSync(ownerPath, 0o600);
  const ownerSha = readOwnerApprovalReceipt(temporaryRoot, ownerPath);
  const grant = fakeBodyFreeDiagnosticGrant(ownerSha);
  installPendingGrant(temporaryRoot, path.join(temporaryRoot, "diagnostic.pending.json"), grant);
  const calls = [];
  const rawBuffers = [];
  let forensicInspections = 0;
  let crashInjected = false;
  const blockedSnapshot = fakeBodyFreeDiagnosticSnapshot(cleanupRescueBlockedContract());
  const rescueSnapshot = fakeBodyFreeDiagnosticSnapshot(bodyFreeDiagnosticFailedRescueContract());
  const adapters = Object.freeze({
    inspectBlockedForensicRoot() {
      forensicInspections += 1;
      return forensicInspections === stable.forensicDriftAt
        ? fakeBodyFreeDiagnosticSnapshot(cleanupRescueBlockedContract(), "blocked") : blockedSnapshot;
    },
    inspectFailedRescueRoot: () => rescueSnapshot,
    verifyBindings(candidate, observedAt, options = Object.freeze({})) {
      const validated = options.allowExpired === true
        ? validateBodyFreeDiagnosticGrantUnchecked(candidate, observedAt, { allowExpired: true })
        : validateBodyFreeDiagnosticGrant(candidate, observedAt);
      assertBodyFreeDiagnosticGrantMatchesDerived(validated, fakeBodyFreeDiagnosticDerived());
    },
    observeDockerCliIdentity: () => Object.freeze({ identitySha256: grant.host.dockerCliIdentitySha256 }),
    resolveSocketIdentity: () => Object.freeze({
      identitySha256: grant.host.socketIdentitySha256, socketPath: "/private/fake/docker.sock",
    }),
    revalidateHost(_grant, _socket, edge) { if (stable.hostDriftAt === edge) fail("local_postgres_docker_cli_drift"); },
    callDocker(kind, argv, context) {
      calls.push(Object.freeze({ kind, argv: Object.freeze([...argv]) }));
      const raw = fakeBodyFreeDiagnosticDockerResult(kind, scenario, context.plan);
      rawBuffers.push(raw.stdout, raw.stderr);
      return Object.freeze(raw);
    },
    crashCheckpoint(edge) {
      if (!crashInjected && stable.crashAt === edge) { crashInjected = true; throw BODY_FREE_DIAGNOSTIC_SIMULATED_CRASH; }
    },
    now: (edge) => new Date(stable.clockExpiredAt === edge
      ? "2026-08-14T21:00:00.000Z" : "2026-08-14T20:00:01.000Z"),
  });
  const request = Object.freeze({
    diagnosticRoot: temporaryRoot, blockedRoot: BLOCKED_PRIVATE_ROOT, rescueRoot: FAILED_RESCUE_PRIVATE_ROOT,
    evidenceOut: path.join(temporaryRoot, "docker-inspect-diagnostic-evidence.json"),
  });
  let receipt = null;
  let failureCode = null;
  let simulatedCrash = false;
  let recoveryAddedCalls = 0;
  try { receipt = await runBodyFreeDiagnosticWithAdapters(request, adapters); }
  catch (error) {
    if (error === BODY_FREE_DIAGNOSTIC_SIMULATED_CRASH) {
      simulatedCrash = true;
      const beforeRecoveryCalls = calls.length;
      try { receipt = await runBodyFreeDiagnosticWithAdapters(request, adapters); }
      catch (recoveryError) {
        failureCode = authenticLocalPostgresRunnerErrorDetails(recoveryError)?.code ?? "local_postgres_runner_failed";
      }
      recoveryAddedCalls = calls.length - beforeRecoveryCalls;
    } else failureCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed";
    if (receipt === null) {
      try { receipt = readPrivateJson(path.join(temporaryRoot, "docker-inspect-diagnostic-evidence.json")); }
      catch { receipt = null; }
    }
  }
  const firstCallCount = calls.length;
  let duplicateCode = null;
  if (stable.duplicateConsume === true) {
    try { await runBodyFreeDiagnosticWithAdapters(request, adapters); }
    catch (error) { duplicateCode = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  }
  const journal = readBodyFreeDiagnosticJournal(temporaryRoot);
  const rootEntries = Object.freeze(fs.readdirSync(temporaryRoot).sort(binaryCompare));
  const result = Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-fake-result.v1",
    status: receipt?.status ?? "FAILED", code: receipt?.code ?? failureCode, receipt,
    calls: Object.freeze(calls), firstCallCount, duplicateCode, duplicateAddedCalls: calls.length - firstCallCount,
    simulatedCrash, recoveryAddedCalls, rootEntries, journalEntryCount: journal.sequence,
    journalHeadSha256: journal.lastSha256, openEffectCount: journal.openEffects.size,
    rawBuffersCleared: rawBuffers.every((buffer) => !Buffer.isBuffer(buffer) || buffer.every((byte) => byte === 0)),
    physicalEffects: 0, socketCalls: 0, postgresConnections: 0, sqlStatements: 0,
    productNetworkEffects: 0,
  });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  return result;
}

export async function runLocalPostgresBodyFreeDiagnosticFakePlan(input = Object.freeze({})) {
  return executeBodyFreeDiagnosticFake(input);
}

function fakeBodyFreeDiagnosticReceiptContext() {
  const grant = fakeBodyFreeDiagnosticGrant(`sha256:${"1".repeat(64)}`);
  const consumedSha = `sha256:${"2".repeat(64)}`;
  const journal = emptyBodyFreeDiagnosticJournalState();
  journal.sequence = 9;
  journal.lastSha256 = `sha256:${"3".repeat(64)}`;
  journal.consumedGrantSha256 = consumedSha;
  journal.lifecycleCount = 1;
  journal.dockerCallCounts.version = 1;
  journal.dockerCallCounts["container.inspect"] = 1;
  const plan = buildLocalPostgresDockerPlan({
    grantId: BLOCKED_GRANT_ID, secretMountSource: "/private/fake/unused-password-file",
  });
  const versionEffect = Object.freeze({ effectId: "docker-000003-version", kind: "version", ordinal: 1 });
  const inspectEffect = Object.freeze({ effectId: "docker-000006-container.inspect", kind: "container.inspect", ordinal: 1 });
  const version = fingerprintDockerDiagnosticResult("version", versionEffect,
    fakeBodyFreeDiagnosticDockerResult("version", "missing", plan), plan);
  const inspect = fingerprintDockerDiagnosticResult("container.inspect", inspectEffect,
    fakeBodyFreeDiagnosticDockerResult("container.inspect", "missing", plan), plan);
  journal.observations.set(version.effectId, version);
  journal.observations.set(inspect.effectId, inspect);
  journal.closure = Object.freeze({
    diagnosticLocalResidueCount: 0, blockedRootUnchanged: true, failedRescueRootUnchanged: true,
  });
  const receipt = {
    schemaVersion: "r4.public-core-local-postgres-body-free-docker-inspect-diagnostic-receipt.v1",
    status: "OBSERVED", code: "local_postgres_body_free_diagnostic_observed",
    consumedDiagnosticGrantSha256: consumedSha,
    authority: JSON.parse(canonicalJson(grant.authority)), lineage: JSON.parse(canonicalJson(grant.lineage)),
    artifacts: JSON.parse(canonicalJson(grant.artifacts)), blocked: JSON.parse(canonicalJson(grant.blocked)),
    failedRescue: JSON.parse(canonicalJson(grant.failedRescue)),
    hostObservation: {
      dockerCliIdentitySha256: grant.host.dockerCliIdentitySha256,
      socketIdentitySha256: grant.host.socketIdentitySha256,
      dockerClientVersion: "29.3.1", dockerServerVersion: "29.3.1", dockerServerPlatform: IMAGE_PLATFORM,
    },
    effects: { dockerCallCounts: { ...journal.dockerCallCounts } },
    observations: [JSON.parse(canonicalJson(version)), JSON.parse(canonicalJson(inspect))],
    closure: {
      diagnosticLocalResidueCount: 0, blockedRootUnchanged: true, failedRescueRootUnchanged: true,
      retainedDiagnosticForensicFiles: [
        "diagnostic.consumed.json", "docker-inspect-diagnostic-evidence.json",
        BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY, "owner-approval-receipt",
      ],
      terminalReason: "OBSERVATION_CAPTURED",
    },
    journal: { entryCount: journal.sequence, headSha256: journal.lastSha256 },
    readiness: {
      diagnosticObservationCaptured: true, resourceAbsenceProven: false, cleanupRescueGreen: false,
      physicalExecutionPerformed: false, targetPostgresObserved: false, productRuntimeEffects: false,
      trafficReady: false, gateCReady: false,
    },
  };
  return { grant, consumedSha, journal, receipt };
}

export function runLocalPostgresBodyFreeDiagnosticReceiptValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set([
    "none", "top_extra", "nested_extra", "authority", "lineage", "artifacts", "blocked", "failed_rescue",
    "host", "effects", "observation", "closure", "journal", "readiness", "consumed", "status_code", "accessor",
  ]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const { grant, consumedSha, journal, receipt } = fakeBodyFreeDiagnosticReceiptContext();
  if (stable.mutation === "top_extra") receipt.extra = true;
  else if (stable.mutation === "nested_extra") receipt.readiness.extra = true;
  else if (stable.mutation === "authority") receipt.authority.diagnosticCardSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "lineage") receipt.lineage.diagnosticCardHead = "f".repeat(40);
  else if (stable.mutation === "artifacts") receipt.artifacts.runnerSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "blocked") receipt.blocked.rootIno = "1";
  else if (stable.mutation === "failed_rescue") receipt.failedRescue.journalEntryCount = 7;
  else if (stable.mutation === "host") receipt.hostObservation.dockerServerPlatform = "MISMATCH";
  else if (stable.mutation === "effects") receipt.effects.dockerCallCounts["container.inspect"] = 0;
  else if (stable.mutation === "observation") receipt.observations[1].stdoutSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "closure") receipt.closure.diagnosticLocalResidueCount = 1;
  else if (stable.mutation === "journal") receipt.journal.headSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "readiness") receipt.readiness.resourceAbsenceProven = true;
  else if (stable.mutation === "consumed") receipt.consumedDiagnosticGrantSha256 = `sha256:${"f".repeat(64)}`;
  else if (stable.mutation === "status_code") receipt.code = "local_postgres_body_free_diagnostic_blocked";
  else if (stable.mutation === "accessor") {
    Object.defineProperty(receipt, "status", { enumerable: true, get() { return "OBSERVED"; } });
  }
  let accepted = false;
  let code = null;
  try { validateBodyFreeDiagnosticReceipt(receipt, grant, journal, consumedSha); accepted = true; }
  catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-receipt-validation-fake-result.v1",
    mutation: stable.mutation, accepted, code, physicalEffects: 0,
  });
}

export function runLocalPostgresBodyFreeDiagnosticJournalValidationFakePlan(input = Object.freeze({})) {
  const stable = ownedPlain(input);
  exactKeys(stable, ["mutation"]);
  const allowed = new Set(["none", "top_extra", "sequence", "previous", "event", "detail", "entry_sha"]);
  if (!allowed.has(stable.mutation)) fail("local_postgres_fake_fault_invalid");
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "forme-diagnostic-journal-")));
  let accepted = false;
  let code = null;
  try {
    appendBodyFreeDiagnosticJournal(temporaryRoot, "grant.consumed", {
      consumedDiagnosticGrantSha256: `sha256:${"2".repeat(64)}`,
    });
    if (stable.mutation !== "none") {
      const entryPath = path.join(temporaryRoot, BODY_FREE_DIAGNOSTIC_JOURNAL_DIRECTORY, "entry-000001.json");
      const entry = JSON.parse(canonicalJson(readPrivateJson(entryPath)));
      if (stable.mutation === "top_extra") entry.extra = true;
      else if (stable.mutation === "sequence") entry.sequence = 2;
      else if (stable.mutation === "previous") entry.previousSha256 = `sha256:${"f".repeat(64)}`;
      else if (stable.mutation === "event") entry.event = "docker.attempt";
      else if (stable.mutation === "detail") entry.detail = { consumedDiagnosticGrantSha256: "bad" };
      else if (stable.mutation === "entry_sha") entry.entrySha256 = `sha256:${"f".repeat(64)}`;
      writePrivateJson(entryPath, entry, false);
    }
    readBodyFreeDiagnosticJournal(temporaryRoot);
    accepted = true;
  } catch (error) { code = authenticLocalPostgresRunnerErrorDetails(error)?.code ?? "local_postgres_runner_failed"; }
  finally { fs.rmSync(temporaryRoot, { recursive: true, force: true }); }
  return Object.freeze({
    schemaVersion: "r4.public-core-local-postgres-body-free-diagnostic-journal-validation-fake-result.v1",
    mutation: stable.mutation, accepted, code, physicalEffects: 0,
  });
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
  if (stable.length === 13 && stable[0] === "prepare-rescue" && stable[1] === "--rescue-root"
    && typeof stable[2] === "string" && path.isAbsolute(stable[2])
    && stable[3] === "--blocked-root" && stable[4] === BLOCKED_PRIVATE_ROOT
    && stable[5] === "--rescue-review-head" && typeof stable[6] === "string" && GIT_OBJECT.test(stable[6])
    && stable[7] === "--owner-approval-receipt" && typeof stable[8] === "string" && path.isAbsolute(stable[8])
    && stable[9] === "--created-at" && typeof stable[10] === "string"
    && stable[11] === "--expires-at" && typeof stable[12] === "string") {
    instant(stable[10]); instant(stable[12]);
    return Object.freeze({
      mode: "prepare-rescue", rescueRoot: stable[2], blockedRoot: stable[4], rescueOwnerReviewHead: stable[6],
      ownerApprovalReceiptPath: stable[8], createdAt: stable[10], expiresAt: stable[12],
    });
  }
  if (stable.length === 7 && stable[0] === "rescue" && stable[1] === "--rescue-root"
    && typeof stable[2] === "string" && path.isAbsolute(stable[2])
    && stable[3] === "--blocked-root" && stable[4] === BLOCKED_PRIVATE_ROOT
    && stable[5] === "--evidence-out" && typeof stable[6] === "string" && path.isAbsolute(stable[6])) {
    return Object.freeze({ mode: "rescue", rescueRoot: stable[2], blockedRoot: stable[4], evidenceOut: stable[6] });
  }
  if (stable.length === 15 && stable[0] === "prepare-inspect-diagnostic"
    && stable[1] === "--diagnostic-root" && typeof stable[2] === "string" && path.isAbsolute(stable[2])
    && stable[3] === "--blocked-root" && stable[4] === BLOCKED_PRIVATE_ROOT
    && stable[5] === "--rescue-root" && stable[6] === FAILED_RESCUE_PRIVATE_ROOT
    && stable[7] === "--diagnostic-review-head" && typeof stable[8] === "string" && GIT_OBJECT.test(stable[8])
    && stable[9] === "--owner-approval-receipt" && typeof stable[10] === "string" && path.isAbsolute(stable[10])
    && stable[11] === "--created-at" && typeof stable[12] === "string"
    && stable[13] === "--expires-at" && typeof stable[14] === "string") {
    instant(stable[12]); instant(stable[14]);
    return Object.freeze({
      mode: "prepare-inspect-diagnostic", diagnosticRoot: stable[2], blockedRoot: stable[4],
      rescueRoot: stable[6], diagnosticOwnerReviewHead: stable[8], ownerApprovalReceiptPath: stable[10],
      createdAt: stable[12], expiresAt: stable[14],
    });
  }
  if (stable.length === 9 && stable[0] === "inspect-diagnostic"
    && stable[1] === "--diagnostic-root" && typeof stable[2] === "string" && path.isAbsolute(stable[2])
    && stable[3] === "--blocked-root" && stable[4] === BLOCKED_PRIVATE_ROOT
    && stable[5] === "--rescue-root" && stable[6] === FAILED_RESCUE_PRIVATE_ROOT
    && stable[7] === "--evidence-out" && typeof stable[8] === "string" && path.isAbsolute(stable[8])) {
    return Object.freeze({
      mode: "inspect-diagnostic", diagnosticRoot: stable[2], blockedRoot: stable[4],
      rescueRoot: stable[6], evidenceOut: stable[8],
    });
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
  if (parsed.mode === "prepare-rescue") {
    const { mode: _mode, ...input } = parsed;
    process.stdout.write(`${canonicalJson(prepareLocalPostgresCleanupRescueGrant(input))}\n`);
    return;
  }
  if (parsed.mode === "rescue") {
    await runApprovedLocalPostgresCleanupRescue({
      rescueRoot: parsed.rescueRoot, blockedRoot: parsed.blockedRoot, evidenceOut: parsed.evidenceOut,
    });
    return;
  }
  if (parsed.mode === "prepare-inspect-diagnostic") {
    const { mode: _mode, ...input } = parsed;
    process.stdout.write(`${canonicalJson(prepareBodyFreeDockerInspectDiagnosticGrant(input))}\n`);
    return;
  }
  if (parsed.mode === "inspect-diagnostic") {
    await runApprovedBodyFreeDockerInspectDiagnostic({
      diagnosticRoot: parsed.diagnosticRoot, blockedRoot: parsed.blockedRoot,
      rescueRoot: parsed.rescueRoot, evidenceOut: parsed.evidenceOut,
    });
    return;
  }
  await runApprovedLocalPostgresPhysical({ grantRoot: parsed.grantRoot, evidenceOut: parsed.evidenceOut });
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  direct().catch((error) => {
    const details = authenticLocalPostgresRunnerErrorDetails(error);
    const code = details?.code ?? "local_postgres_runner_failed";
    const publicError = { schemaVersion: "r4.public-core-local-postgres-error.v3", code };
    if (BODY_FREE_DIAGNOSTIC_PREPARE_STAGE_SET.has(details?.prepareStage)) {
      publicError.prepareStage = details.prepareStage;
    }
    process.stderr.write(`${canonicalJson(publicError)}\n`);
    process.exitCode = 1;
  });
}
