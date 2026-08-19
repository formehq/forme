import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalJson } from "../../../packages/r4-protocol/src/index.ts";
import type {
  OperationRequest,
  OperationResponse,
} from "./application.ts";
import {
  PublicCoreApplicationError,
  PublicCoreApplicationV1,
  type PublicCoreOperationInputV1,
  type PublicCoreTrustedTransportMetadataV1,
} from "./public-core-application.ts";
import type { PublicCorePostgresApplicationIdentityPortV1 } from "./public-core-postgres-application-store.ts";

const CAPABILITY = /^[A-Za-z0-9_-]{43}$/u;
const RATE_BUCKET = /^bucket_[A-Za-z0-9_-]{16,128}$/u;

function digest(key: Uint8Array, domain: string, value: string): `sha256:${string}` {
  return `sha256:${createHmac("sha256", key).update(`forme:r4-local-runtime:${domain}\0`, "utf8").update(value, "utf8").digest("hex")}`;
}

export function derivePublicCoreLocalActorScopeDigestV1(
  key: Uint8Array,
  actor: "public" | "controller" | "curator" | "room_operator" | "guest_capability",
  secret: string | null,
): `sha256:${string}` {
  if (key.byteLength !== 32) throw new TypeError("public_core_local_identity_key_invalid");
  if (actor === "public") {
    if (secret !== null) throw new TypeError("public_core_local_actor_scope_invalid");
    return digest(key, "actor", "public");
  }
  if (secret === null || !CAPABILITY.test(secret)) throw new TypeError("public_core_local_actor_scope_invalid");
  return digest(key, actor === "guest_capability" ? "guest" : "actor", actor === "guest_capability" ? secret : `${actor}\0${secret}`);
}

function secretBytes(value: string): Buffer {
  if (!CAPABILITY.test(value)) throw new TypeError("public_core_local_runtime_secret_invalid");
  const bytes = Buffer.from(value, "base64url");
  if (bytes.byteLength !== 32 || bytes.toString("base64url") !== value) {
    bytes.fill(0);
    throw new TypeError("public_core_local_runtime_secret_invalid");
  }
  return bytes;
}

function sameSecret(candidate: string | null, expected: Buffer): boolean {
  if (candidate === null || !CAPABILITY.test(candidate)) return false;
  const bytes = Buffer.from(candidate, "base64url");
  try {
    return bytes.byteLength === expected.byteLength && timingSafeEqual(bytes, expected);
  } finally {
    bytes.fill(0);
  }
}

function bearer(value: string | null): string | null {
  if (value === null) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/u.exec(value);
  return match?.[1] ?? null;
}

export interface PublicCoreRoomRuntimeConfigV1 {
  readonly application: PublicCoreApplicationV1;
  readonly controllerSecret: string;
  readonly curatorSecret: string;
  readonly roomOperatorSecret: string;
  readonly actorDigestKey: Uint8Array;
  readonly publicRateBucket: string;
}

/**
 * Local activation transport membrane for the already-closed Public Core.
 * It deliberately implements the existing OperationRequest shape so the
 * Next.js route and server-rendered pages can switch stores without gaining a
 * second operation inventory or a generic executor.
 */
export class PublicCoreRoomRuntimeV1 {
  readonly #application: PublicCoreApplicationV1;
  readonly #controllerSecret: Buffer;
  readonly #curatorSecret: Buffer;
  readonly #roomOperatorSecret: Buffer;
  readonly #actorDigestKey: Buffer;
  readonly #publicRateBucket: string;

  constructor(config: PublicCoreRoomRuntimeConfigV1) {
    if (!(config.application instanceof PublicCoreApplicationV1)) {
      throw new TypeError("public_core_local_runtime_application_invalid");
    }
    if (!RATE_BUCKET.test(config.publicRateBucket) || config.actorDigestKey.byteLength !== 32) {
      throw new TypeError("public_core_local_runtime_configuration_invalid");
    }
    this.#application = config.application;
    this.#controllerSecret = secretBytes(config.controllerSecret);
    this.#curatorSecret = secretBytes(config.curatorSecret);
    this.#roomOperatorSecret = secretBytes(config.roomOperatorSecret);
    this.#actorDigestKey = Buffer.from(config.actorDigestKey);
    this.#publicRateBucket = config.publicRateBucket;
    Object.freeze(this);
  }

  #authorize(request: OperationRequest): { secret: string | null; actorScopeDigest: `sha256:${string}` } {
    if (request.syntheticActor !== null || request.syntheticClientBucket !== null) {
      throw new PublicCoreApplicationError(400, "synthetic_authority_forbidden");
    }
    const candidate = bearer(request.authorization);
    const actor = request.definition.actor;
    if (actor === "public") {
      if (request.authorization !== null) throw new PublicCoreApplicationError(404, "not_found");
      return { secret: null, actorScopeDigest: derivePublicCoreLocalActorScopeDigestV1(this.#actorDigestKey, "public", null) };
    }
    if (actor === "guest_capability") {
      if (candidate === null) throw new PublicCoreApplicationError(404, "not_found");
      return { secret: candidate, actorScopeDigest: derivePublicCoreLocalActorScopeDigestV1(this.#actorDigestKey, "guest_capability", candidate) };
    }
    const expected = actor === "controller"
      ? this.#controllerSecret
      : actor === "curator"
        ? this.#curatorSecret
        : actor === "room_operator"
          ? this.#roomOperatorSecret
          : null;
    if (expected === null || !sameSecret(candidate, expected)) {
      throw new PublicCoreApplicationError(404, "not_found");
    }
    return {
      secret: actor === "room_operator" ? candidate : null,
      actorScopeDigest: derivePublicCoreLocalActorScopeDigestV1(this.#actorDigestKey, actor, candidate),
    };
  }

  async runCore(request: OperationRequest): Promise<OperationResponse> {
    const authority = this.#authorize(request);
    const input: PublicCoreOperationInputV1 = Object.freeze({
      schemaVersion: "r4_public_core_operation_input.v1",
      action: request.definition.name,
      actorClass: request.definition.actor,
      actorScopeDigest: authority.actorScopeDigest,
      params: Object.freeze({ ...request.params }),
      body: Object.freeze({ ...request.body }),
      authorizationSecret: authority.secret,
      idempotencyKey: request.idempotencyKey,
      expectedVersion: request.expectedVersion,
    });
    const trustedTransport: PublicCoreTrustedTransportMetadataV1 = Object.freeze({
      schemaVersion: "r4_public_core_trusted_transport_metadata.v1",
      coarseRateBucket: request.definition.name === "public_encounter.issue"
        ? this.#publicRateBucket
        : null,
    });
    const result = await this.#application.run(input, trustedTransport);
    return { status: result.status, body: result.body as Record<string, unknown> };
  }

  close(): void {
    this.#controllerSecret.fill(0);
    this.#curatorSecret.fill(0);
    this.#roomOperatorSecret.fill(0);
    this.#actorDigestKey.fill(0);
  }

  toJSON(): Readonly<{
    schemaVersion: "r4_public_core_room_runtime.v1";
    mode: "local_loopback_activation";
    publicRateBucketConfigured: true;
  }> {
    return Object.freeze({
      schemaVersion: "r4_public_core_room_runtime.v1",
      mode: "local_loopback_activation",
      publicRateBucketConfigured: true,
    });
  }
}

export function createPublicCoreIdentityPortV1(
  keyMaterial: Uint8Array,
): PublicCorePostgresApplicationIdentityPortV1 & Readonly<{ close(): void }> {
  if (keyMaterial.byteLength !== 32) throw new TypeError("public_core_local_identity_key_invalid");
  const key = Buffer.from(keyMaterial);
  let closed = false;
  const derive = (input: unknown, domain: string): Buffer => {
    if (closed) throw new TypeError("public_core_local_identity_key_closed");
    return createHmac("sha256", key)
      .update(`forme:r4-public-core:identity:${domain}\0`, "utf8")
      .update(canonicalJson(input), "utf8")
      .digest();
  };
  return Object.freeze({
    deriveId(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveId"]>[0]) {
      const value = derive(input, "id");
      try {
        return `${input.prefix}_${value.toString("base64url").slice(0, 32)}`;
      } finally {
        value.fill(0);
      }
    },
    deriveSecret(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveSecret"]>[0]) {
      const value = derive(input, "secret");
      try {
        return value.toString("base64url");
      } finally {
        value.fill(0);
      }
    },
    deriveNonce(input: Parameters<PublicCorePostgresApplicationIdentityPortV1["deriveNonce"]>[0]) {
      const value = derive(input, "nonce");
      try {
        return Uint8Array.from(value.subarray(0, 12));
      } finally {
        value.fill(0);
      }
    },
    close() {
      if (!closed) {
        key.fill(0);
        closed = true;
      }
    },
  });
}
