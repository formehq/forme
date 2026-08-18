import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PublicCoreApplicationV1, PublicCoreApplicationError } from "../../apps/room/src/public-core-application.ts";
import { PublicCoreCryptoKeyHandleV1 } from "../../apps/room/src/public-core-crypto.ts";
import { loadPublicCoreLocalRuntimeV1 } from "../../apps/room/src/public-core-local-runtime.ts";
import {
  PublicCoreRoomRuntimeV1,
  createPublicCoreIdentityPortV1,
} from "../../apps/room/src/public-core-room-runtime.ts";
import {
  InMemoryPublicCoreStoreV1,
  createPublicCoreBodyProtectorV1,
  type PublicCoreIdSourceV1,
} from "../../apps/room/src/public-core-store.ts";
import { operationDefinition } from "../../apps/room/src/operation-inventory.ts";
import type { PublicCoreConfigReference } from "../../apps/room/src/production-config.ts";

const ROOM_ID = `room_${"r".repeat(32)}`;
const ENTITY_ID = `entity_${"e".repeat(32)}`;

function key(byte: number, purpose: "body_encryption" | "capability_pepper"): PublicCoreCryptoKeyHandleV1 {
  const kind = purpose === "body_encryption" ? "body-encryption" : "capability-pepper";
  return new PublicCoreCryptoKeyHandleV1({
    purpose,
    reference: `ref:${kind}/local-activation@sha256:${byte.toString(16).padStart(2, "0").repeat(32)}` as PublicCoreConfigReference,
    material: new Uint8Array(32).fill(byte),
  });
}

class Ids implements PublicCoreIdSourceV1 {
  #serial = 0;
  nextId(prefix: Parameters<PublicCoreIdSourceV1["nextId"]>[0]): string {
    this.#serial += 1;
    return `${prefix}_${this.#serial.toString(36).padStart(32, "0")}`;
  }
  nextSecret(kind: Parameters<PublicCoreIdSourceV1["nextSecret"]>[0]): string {
    this.#serial += 1;
    return `${kind}_${this.#serial.toString(36).padStart(43, "0")}`;
  }
}

function capability(byte: number): string {
  return Buffer.alloc(32, byte).toString("base64url");
}

function runtime(): PublicCoreRoomRuntimeV1 {
  const body = key(1, "body_encryption");
  const pepper = key(2, "capability_pepper");
  const store = new InMemoryPublicCoreStoreV1({
    installationId: `install_${"i".repeat(32)}`,
    entityId: ENTITY_ID,
    now: () => new Date("2026-08-18T12:00:00.000Z"),
    ids: new Ids(),
    protector: createPublicCoreBodyProtectorV1({ bodyEncryptionKey: body, capabilityPepperKey: pepper }),
  });
  return new PublicCoreRoomRuntimeV1({
    application: new PublicCoreApplicationV1(store),
    controllerSecret: capability(3),
    curatorSecret: capability(4),
    roomOperatorSecret: capability(5),
    actorDigestKey: new Uint8Array(32).fill(6),
    publicRateBucket: `bucket_${"b".repeat(32)}`,
  });
}

function request(
  action: string,
  input: Readonly<{
    authorization?: string | null;
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    idempotencyKey?: string | null;
    expectedVersion?: number | null;
    syntheticActor?: string | null;
    syntheticClientBucket?: string | null;
  }> = {},
) {
  return {
    definition: operationDefinition(action),
    params: input.params ?? {},
    body: input.body ?? {},
    authorization: input.authorization ?? null,
    syntheticActor: input.syntheticActor ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    expectedVersion: input.expectedVersion ?? null,
    syntheticClientBucket: input.syntheticClientBucket ?? null,
  };
}

test("local Room runtime preserves the closed action inventory and authenticates non-public actors before dispatch", async () => {
  const app = runtime();
  const listed = await app.runCore(request("third_place.list"));
  assert.equal(listed.status, 200);
  assert.equal(listed.body.schemaVersion, "r4_public_core_third_place_list.v1");
  assert.deepEqual(listed.body.residents, []);

  await assert.rejects(
    app.runCore(request("room.create", {
      authorization: `Bearer ${capability(9)}`,
      body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Forme Project Room" },
      idempotencyKey: "a".repeat(32),
    })),
    (error: unknown) => error instanceof PublicCoreApplicationError && error.status === 404 && error.code === "not_found",
  );
  const created = await app.runCore(request("room.create", {
    authorization: `Bearer ${capability(3)}`,
    body: { entityId: ENTITY_ID, roomKind: "third_place_public", label: "Forme Project Room" },
    idempotencyKey: "b".repeat(32),
  }));
  assert.equal(created.status, 201);
  assert.match(String(created.body.roomId), /^room_/u);

  await assert.rejects(
    app.runCore(request("third_place.list", { syntheticActor: "controller" })),
    (error: unknown) => error instanceof PublicCoreApplicationError && error.status === 400,
  );
  const serialized = JSON.stringify(app);
  assert.deepEqual(JSON.parse(serialized), {
    schemaVersion: "r4_public_core_room_runtime.v1",
    mode: "local_loopback_activation",
    publicRateBucketConfigured: true,
  });
  for (const value of [capability(3), capability(4), capability(5)]) assert.equal(serialized.includes(value), false);
  app.close();
});

test("identity derivation is deterministic, domain-separated, and body-free", () => {
  const port = createPublicCoreIdentityPortV1(new Uint8Array(32).fill(7));
  const operation = {
    purpose: "operation",
    action: "room.create" as const,
    actorScopeDigest: `sha256:${"1".repeat(64)}` as const,
    idempotencyKey: "c".repeat(32),
    canonicalRequestHash: `sha256:${"2".repeat(64)}` as const,
  };
  const id = port.deriveId({ ...operation, prefix: "pairing", purpose: "pairing" });
  assert.equal(port.deriveId({ ...operation, prefix: "pairing", purpose: "pairing" }), id);
  assert.notEqual(port.deriveSecret({ ...operation, kind: "binding_secret" }), id);
  assert.equal(port.deriveNonce({ ...operation, table: "rooms", column: "label_ciphertext", rowId: id, objectVersion: 1 }).byteLength, 12);
});

function hash(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function privateFile(root: string, name: string, value: string): Promise<Buffer> {
  const bytes = Buffer.from(value, "utf8");
  await writeFile(join(root, name), bytes, { mode: 0o600 });
  await chmod(join(root, name), 0o600);
  return bytes;
}

test("private-root loader accepts only the exact loopback runtime binding and serializes no secret", async () => {
  const temporary = await realpath(await mkdtemp(join(tmpdir(), "forme-r4-local-runtime-")));
  await chmod(temporary, 0o700);
  const secrets = {
    body: capability(11),
    pepper: capability(12),
    identity: capability(13),
    controller: capability(14),
    curator: capability(15),
    operator: capability(16),
    database: "postgresql://forme:private-password@127.0.0.1:55432/forme_activation",
  };
  const authority = JSON.stringify({
    schemaVersion: "r4_public_core_local_publication_authority.v1",
    projectionPayloadHash: `sha256:${"1".repeat(64)}`,
    publicationApprovalHash: `sha256:${"2".repeat(64)}`,
    publicationAttestationHash: `sha256:${"3".repeat(64)}`,
    basisHash: `sha256:${"4".repeat(64)}`,
    projectionPolicyHash: `sha256:${"5".repeat(64)}`,
    publicationApprovalId: `approval_${"a".repeat(32)}`,
  });
  try {
    const database = await privateFile(temporary, "database-url", secrets.database);
    const body = await privateFile(temporary, "body-encryption-key", secrets.body);
    const pepper = await privateFile(temporary, "capability-pepper-key", secrets.pepper);
    const identity = await privateFile(temporary, "identity-key", secrets.identity);
    const controller = await privateFile(temporary, "controller-secret", secrets.controller);
    const curator = await privateFile(temporary, "curator-secret", secrets.curator);
    const operator = await privateFile(temporary, "room-operator-secret", secrets.operator);
    const publication = await privateFile(temporary, "publication-authority.json", authority);
    await privateFile(temporary, "runtime.json", JSON.stringify({
      schemaVersion: "r4_public_core_local_runtime_config.v1",
      roomId: ROOM_ID,
      databaseUrlRef: `ref:postgres-url/local-activation@${hash(database)}`,
      bodyEncryptionKeyRef: `ref:body-encryption/local-activation@${hash(body)}`,
      capabilityPepperRef: `ref:capability-pepper/local-activation@${hash(pepper)}`,
      identityKeySha256: hash(identity),
      controllerSecretSha256: hash(controller),
      curatorSecretSha256: hash(curator),
      roomOperatorSecretSha256: hash(operator),
      publicationAuthoritySha256: hash(publication),
      publicRateBucket: `bucket_${"b".repeat(32)}`,
    }));
    const loaded = await loadPublicCoreLocalRuntimeV1(temporary);
    assert.equal(loaded.roomId, ROOM_ID);
    const serialized = JSON.stringify(loaded.runtime);
    assert.equal(serialized.includes("private-password"), false);
    for (const value of Object.values(secrets)) assert.equal(serialized.includes(value), false);
    await loaded.close();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
