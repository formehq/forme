import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENCRYPTED_COLUMNS,
  ENCRYPTED_FIELD_AAD_SCHEMA_VERSION,
  InMemoryNonceRegistry,
  SyntheticKeyHandle,
  decryptField,
  encryptField,
} from "../packages/r4-persistence/src/index.ts";

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const paths = Object.freeze([
  "packages/r4-persistence/src/encrypted-field.ts",
  "packages/r4-persistence/src/index.ts",
  "scripts/r4-gate-b-encrypted-field.mjs",
  "test/r4-gate-b/encrypted-field.test.ts",
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function exactRead(relativePath) {
  if (!paths.includes(relativePath)) fail("ENCRYPTED_FIELD_PATH_NOT_ALLOWLISTED");
  const candidate = path.join(root, ...relativePath.split("/"));
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail("ENCRYPTED_FIELD_PATH_UNSAFE");
  if (fs.realpathSync(candidate) !== candidate) fail("ENCRYPTED_FIELD_PATH_ESCAPE");
  return fs.readFileSync(candidate, "utf8");
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function staticAudit(source) {
  const forbidden = [
    /process\.env/u,
    /process\.argv/u,
    /writeFile|appendFile|createWriteStream/u,
    /child_process|spawn\(|exec\(/u,
    /node:(?:net|http|https|tls|dns)/u,
    /https?:\/\//u,
    /console\./u,
  ];
  for (const pattern of forbidden) if (pattern.test(source)) fail("ENCRYPTED_FIELD_EFFECT_SURFACE_DRIFT");
  for (const column of ENCRYPTED_COLUMNS) if (!source.includes(`"${column}"`)) fail("ENCRYPTED_COLUMN_INVENTORY_DRIFT");
  for (const token of [
    "aes-256-gcm", "authTagLength", "canonicalJsonBytes", "timingSafeEqual",
    "readSyntheticKeyFromInheritedFd", "ENCRYPTION_NONCE_REUSED",
    "FIELD_NOT_READABLE", "PLAINTEXT_ESCAPE_DENIED",
  ]) if (!source.includes(token)) fail("ENCRYPTED_FIELD_CONTROL_DRIFT");
}

export function inspectEncryptedFieldConstruction() {
  const files = Object.fromEntries(paths.map((relativePath) => [relativePath, exactRead(relativePath)]));
  staticAudit(files["packages/r4-persistence/src/encrypted-field.ts"]);
  const keyBytes = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const nonce = Uint8Array.from({ length: 12 }, (_, index) => index + 41);
  const plaintext = new TextEncoder().encode("synthetic construction smoke vector");
  const handle = new SyntheticKeyHandle(keyBytes);
  const registry = new InMemoryNonceRegistry();
  try {
    const aad = {
      schemaVersion: ENCRYPTED_FIELD_AAD_SCHEMA_VERSION,
      table: "projections",
      column: "capsule_ciphertext",
      roomId: "room_abcdefghijklmnop",
      rowId: "projection_abcdefghijklmnop",
      objectVersion: 1,
    };
    const { envelope } = encryptField({ key: handle, plaintext, aad, nonceRegistry: registry, nonceSource: () => nonce });
    const recovered = decryptField({ key: handle, envelope, aad, bodyReadable: true });
    const roundTrip = Buffer.from(recovered).equals(Buffer.from(plaintext));
    recovered.fill(0);
    plaintext.fill(0);
    keyBytes.fill(0);
    nonce.fill(0);
    if (!roundTrip || registry.size !== 1) fail("ENCRYPTED_FIELD_SMOKE_FAILED");
    return Object.freeze({
      schemaVersion: "r4_gate_b_encrypted_field_static.v1",
      status: "GREEN_IN_MEMORY_ONLY",
      algorithm: "AES-256-GCM",
      keyBytes: 32,
      nonceBytes: 12,
      tagBytes: 16,
      encryptedColumnCount: ENCRYPTED_COLUMNS.length,
      roundTripCount: 1,
      nonceRegistrationCount: registry.size,
      filesystemWrites: 0,
      keychainOperations: 0,
      networkCalls: 0,
      fileHashes: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, digest(value)])),
    });
  } finally {
    plaintext.fill(0);
    keyBytes.fill(0);
    nonce.fill(0);
    handle.close();
  }
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "check") fail("ENCRYPTED_FIELD_COMMAND_INVALID");
  process.stdout.write(`${JSON.stringify(inspectEncryptedFieldConstruction())}\n`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
