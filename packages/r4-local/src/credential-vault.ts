import { timingSafeEqual } from "node:crypto";
import { canonicalJson } from "../../r4-protocol/src/index.ts";
import { verifyHostedPublicationDeliveryHmacV1 } from "./publication.ts";

const ROOM_ID = /^room_[A-Za-z0-9_-]{16,128}$/u;
const BINDING_ID = /^binding_[A-Za-z0-9_-]{16,128}$/u;
const CANONICAL_BEARER = /^[A-Za-z0-9_-]{43}$/u;
const MAXIMUM_BINDING_MILLISECONDS = 30 * 24 * 60 * 60 * 1_000;

function deny(code: string): never {
  throw new Error(code);
}

function exactTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    deny("PRODUCTION_ROOM_BINDING_INVALID");
  }
  return parsed;
}

function exactBearer(value: string): string {
  if (!CANONICAL_BEARER.test(value)) deny("PRODUCTION_ROOM_BINDING_INVALID");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== value) {
    deny("PRODUCTION_ROOM_BINDING_INVALID");
  }
  return value;
}

export interface ExactPublicRoomBindingCredentialInputV1 {
  readonly schemaVersion: "forme.room.public-binding-credential-input.v1";
  readonly bindingId: string;
  readonly roomId: string;
  readonly roomKind: "third_place_public";
  readonly state: "current" | "revoked";
  readonly pairedAt: string;
  readonly expiresAt: string;
  readonly version: number;
  /** Supplied only by a secure vault adapter, never by env, argv, or stdout. */
  readonly bearer: string;
}

export interface PublicRoomBindingDiagnosticV1 {
  readonly schemaVersion: "forme.room.public-binding-diagnostic.v1";
  readonly bindingId: string;
  readonly roomId: string;
  readonly roomKind: "third_place_public";
  readonly state: "current" | "revoked";
  readonly pairedAt: string;
  readonly expiresAt: string;
  readonly version: number;
}

/**
 * Sensitive transport authority. JSON/string coercion is deliberately
 * redacted; only an injected transport can ask for the actual header value.
 */
export class ProductionBearerAuthorizationV1 {
  readonly schemaVersion = "forme.room.production-bearer-authorization.v1" as const;
  readonly scheme = "Bearer" as const;
  #bearer: string;

  constructor(bearer: string) {
    this.#bearer = exactBearer(bearer);
  }

  headerValue(): string {
    return `Bearer ${this.#bearer}`;
  }

  assertAbsentFrom(value: unknown): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      deny("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
    }
    if (serialized.includes(this.#bearer) || serialized.includes(`Bearer ${this.#bearer}`)) {
      deny("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
    }
  }

  toJSON(): Readonly<{ schemaVersion: string; scheme: "Bearer"; redacted: true }> {
    return Object.freeze({ schemaVersion: this.schemaVersion, scheme: this.scheme, redacted: true });
  }

  toString(): string {
    return "[ProductionBearerAuthorization redacted]";
  }
}

/** Pairing code and client key stay out of the inspectable HTTP plan. */
export class ProductionPairingExchangeAuthorizationV1 {
  readonly schemaVersion = "forme.room.production-pairing-authorization.v1" as const;
  #pairingCode: string;
  #clientPublicKey: string;

  constructor(input: { readonly pairingCode: string; readonly clientPublicKey: string }) {
    if (
      typeof input.pairingCode !== "string"
      || input.pairingCode.length < 16
      || Buffer.byteLength(input.pairingCode, "utf8") > 128
      || typeof input.clientPublicKey !== "string"
      || input.clientPublicKey.length < 16
      || Buffer.byteLength(input.clientPublicKey, "utf8") > 4_096
    ) deny("PRODUCTION_ROOM_PAIRING_AUTHORIZATION_INVALID");
    this.#pairingCode = input.pairingCode;
    this.#clientPublicKey = input.clientPublicKey;
  }

  requestBody(): string {
    return canonicalJson({ pairingCode: this.#pairingCode, clientPublicKey: this.#clientPublicKey });
  }

  assertAbsentFrom(value: unknown): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      deny("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
    }
    if (serialized.includes(this.#pairingCode) || serialized.includes(this.#clientPublicKey)) {
      deny("PRODUCTION_ROOM_TRANSPORT_RESPONSE_INVALID");
    }
  }

  toJSON(): Readonly<{ schemaVersion: string; redacted: true }> {
    return Object.freeze({ schemaVersion: this.schemaVersion, redacted: true });
  }

  toString(): string {
    return "[ProductionPairingExchangeAuthorization redacted]";
  }
}

/**
 * Exact public Room binding returned by an injected vault. Secret material is
 * private to this object, absent from enumerable fields, and never enters an
 * HTTP plan or diagnostic. The only release is the explicit transport lane.
 */
export class ExactPublicRoomBindingCredentialV1 {
  readonly schemaVersion = "forme.room.public-binding-credential.v1" as const;
  readonly bindingId: string;
  readonly roomId: string;
  readonly roomKind = "third_place_public" as const;
  readonly state: "current" | "revoked";
  readonly pairedAt: string;
  readonly expiresAt: string;
  readonly version: number;
  #bearer: string;

  constructor(input: ExactPublicRoomBindingCredentialInputV1) {
    if (
      input.schemaVersion !== "forme.room.public-binding-credential-input.v1"
      || !BINDING_ID.test(input.bindingId)
      || !ROOM_ID.test(input.roomId)
      || input.roomKind !== "third_place_public"
      || (input.state !== "current" && input.state !== "revoked")
      || !Number.isSafeInteger(input.version)
      || input.version < 1
    ) deny("PRODUCTION_ROOM_BINDING_INVALID");
    const pairedAt = exactTimestamp(input.pairedAt);
    const expiresAt = exactTimestamp(input.expiresAt);
    if (expiresAt <= pairedAt || expiresAt - pairedAt > MAXIMUM_BINDING_MILLISECONDS) {
      deny("PRODUCTION_ROOM_BINDING_INVALID");
    }
    this.bindingId = input.bindingId;
    this.roomId = input.roomId;
    this.state = input.state;
    this.pairedAt = input.pairedAt;
    this.expiresAt = input.expiresAt;
    this.version = input.version;
    this.#bearer = exactBearer(input.bearer);
    Object.freeze(this);
  }

  assertUsableFor(roomId: string, now: string): void {
    const observedAt = exactTimestamp(now);
    if (
      roomId !== this.roomId
      || this.roomKind !== "third_place_public"
      || this.state !== "current"
      || observedAt < exactTimestamp(this.pairedAt)
      || observedAt >= exactTimestamp(this.expiresAt)
    ) deny("PRODUCTION_ROOM_BINDING_UNAVAILABLE");
  }

  verifyProjectionDelivery(value: unknown, now: string): void {
    try {
      verifyHostedPublicationDeliveryHmacV1(value, {
        bindingId: this.bindingId,
        roomId: this.roomId,
        secret: new TextEncoder().encode(this.#bearer),
        state: this.state,
        expiresAt: this.expiresAt,
      }, now);
    } catch {
      deny("PRODUCTION_ROOM_PROJECTION_AUTHORITY_INVALID");
    }
  }

  async withTransportAuthorization<T>(
    use: (authorization: ProductionBearerAuthorizationV1) => Promise<T>,
  ): Promise<T> {
    return await use(new ProductionBearerAuthorizationV1(this.#bearer));
  }

  /** Opaque exact-authority comparison for commit/readback verification. */
  hasSameSecretAuthority(other: ExactPublicRoomBindingCredentialV1): boolean {
    if (!(other instanceof ExactPublicRoomBindingCredentialV1)) return false;
    return timingSafeEqual(
      Buffer.from(this.#bearer, "base64url"),
      Buffer.from(other.#bearer, "base64url"),
    );
  }

  diagnostic(): PublicRoomBindingDiagnosticV1 {
    return Object.freeze({
      schemaVersion: "forme.room.public-binding-diagnostic.v1",
      bindingId: this.bindingId,
      roomId: this.roomId,
      roomKind: this.roomKind,
      state: this.state,
      pairedAt: this.pairedAt,
      expiresAt: this.expiresAt,
      version: this.version,
    });
  }

  toJSON(): PublicRoomBindingDiagnosticV1 {
    return this.diagnostic();
  }

  toString(): string {
    return `[ExactPublicRoomBinding ${this.bindingId}]`;
  }
}

export interface ProductionPairingExchangeEnvelopeV1 {
  readonly schemaVersion: "forme.room.production-pairing-exchange-result.v1";
  readonly pairingId: string;
  readonly bindingId: string;
  readonly roomId: string;
  readonly clientPublicKeyHash: `sha256:${string}`;
  readonly pairedAt: string;
  readonly expiresAt: string;
  readonly sealedCredential: string;
  readonly version: number;
  readonly receiptSha256: `sha256:${string}`;
}

export interface PreparedPublicRoomPairingV1 {
  readonly schemaVersion: "forme.room.prepared-public-pairing.v1";
  readonly roomId: string;
  readonly pairingId: string;
  readonly idempotencyKey: string;
  /** Public half only; the vault has already durably retained its private half. */
  readonly clientPublicKey: string;
  readonly preparedAt: string;
  readonly expiresAt: string;
}

export interface PreparePublicRoomPairingInputV1 {
  readonly roomId: string;
  readonly pairingId: string;
  readonly idempotencyKey: string;
  readonly observedAt: string;
}

export interface CommitPublicRoomPairingInputV1 {
  readonly roomId: string;
  readonly pairingId: string;
  readonly prepared: PreparedPublicRoomPairingV1;
  readonly exchange: ProductionPairingExchangeEnvelopeV1;
}

/** No filesystem, env, Keychain, argv, or process-global fallback is provided. */
export interface ProductionRoomCredentialVaultV1 {
  readExactPublicRoomBinding(roomId: string): Promise<ExactPublicRoomBindingCredentialV1 | null>;
  /** Idempotently persists the ephemeral private key before the first exchange. */
  preparePublicRoomPairing(input: PreparePublicRoomPairingInputV1): Promise<PreparedPublicRoomPairingV1>;
  /** Atomically unseals, validates, and persists the exact public binding. */
  commitPairedPublicRoomBinding(input: CommitPublicRoomPairingInputV1): Promise<ExactPublicRoomBindingCredentialV1>;
}
