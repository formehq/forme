import { createHash } from "node:crypto";
import type { PublicCoreProductionConfig } from "./production-config.ts";

export type ProductionAccessActor = "controller" | "curator";
export type ProductionAccessLane = "control" | "approve";

export type ProductionHeaderBag =
  | Headers
  | Readonly<Record<string, string | readonly string[] | undefined>>;

export interface CanonicalProxyHeaders {
  readonly host: string;
  readonly proto: "https";
  readonly accessAssertionPresent: boolean;
  readonly cfRay: string | null;
}

interface CanonicalProxyHeadersWithAssertion extends CanonicalProxyHeaders {
  readonly accessAssertion: string | null;
}

export interface ProductionAccessClaims {
  readonly iss: string;
  readonly aud: string | readonly string[];
  readonly sub: string;
  readonly exp: number;
  readonly nbf: number;
  readonly iat: number;
}

export interface ProductionAccessAssertionVerifier {
  /**
   * Implementations verify the JWT signature against already-provisioned,
   * pinned verifier material. This interface performs no key discovery and
   * grants no network capability.
   */
  verify(input: Readonly<{
    assertion: string;
    issuer: string;
    audience: string;
  }>): unknown | Promise<unknown>;
}

export interface AuthenticateProductionActorInput {
  readonly headers: ProductionHeaderBag;
  readonly originAuthority: VerifiedProductionOriginAuthority;
  readonly requiredActor: ProductionAccessActor;
  readonly requiredLane: ProductionAccessLane;
  readonly verifier: ProductionAccessAssertionVerifier;
  readonly config: PublicCoreProductionConfig;
  readonly now?: Date;
}

export interface ProductionOriginBoundaryVerifier {
  /**
   * Gate C supplies the network/edge-specific proof adapter (for example a
   * local Caddy listener identity or an origin-attestation verifier). This
   * pure module performs no network discovery and never guesses provenance
   * from client-controlled HTTP fields.
   */
  verify(input: Readonly<{
    declarationRef: PublicCoreProductionConfig["originProtection"]["declarationRef"];
    expectedOrigin: string;
    host: string;
    proto: "https";
    cfRay: string | null;
    transportEvidence: unknown;
  }>): unknown | Promise<unknown>;
}

export interface VerifyProductionOriginBoundaryInput {
  readonly headers: ProductionHeaderBag;
  readonly config: PublicCoreProductionConfig;
  readonly verifier: ProductionOriginBoundaryVerifier;
  readonly transportEvidence: unknown;
}

export interface AuthenticatedProductionActor {
  readonly actor: ProductionAccessActor;
  readonly subject: string;
  readonly lane: ProductionAccessLane;
}

export class ProductionIdentityError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ProductionIdentityError";
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; code: string }> {
    return Object.freeze({ name: this.name, code: this.code });
  }
}

function fail(code: string): never {
  throw new ProductionIdentityError(code);
}

function normalizeHeaders(headers: ProductionHeaderBag): ReadonlyMap<string, string> {
  const normalized = new Map<string, string>();
  const add = (rawName: string, rawValue: string | readonly string[] | undefined): void => {
    const name = rawName.toLowerCase();
    if (!/^[a-z0-9-]+$/u.test(name) || normalized.has(name) || typeof rawValue !== "string") {
      fail("R4_PRODUCTION_ORIGIN_HEADERS_AMBIGUOUS");
    }
    if (rawValue === "" || rawValue.trim() !== rawValue || /[\r\n\0]/u.test(rawValue)) {
      fail("R4_PRODUCTION_ORIGIN_HEADERS_AMBIGUOUS");
    }
    normalized.set(name, rawValue);
  };

  if (headers instanceof Headers) {
    headers.forEach((value, name) => add(name, value));
  } else {
    for (const [name, value] of Object.entries(headers)) add(name, value);
  }
  return normalized;
}

function isForbiddenProxyOrIdentityHeader(name: string): boolean {
  if (name === "forwarded" || name === "x-real-ip" || name === "true-client-ip") return true;
  if (name.startsWith("x-forme-synthetic-")) return true;
  if (name.startsWith("x-forwarded-") && name !== "x-forwarded-proto") return true;
  if (name.startsWith("x-auth-request-") || name.startsWith("x-original-forwarded-")) return true;
  if (name.startsWith("cf-") && name !== "cf-ray" && name !== "cf-access-jwt-assertion") return true;
  return false;
}

function singleHeader(headers: ReadonlyMap<string, string>, name: string, required: boolean): string | null {
  const value = headers.get(name) ?? null;
  if (value === null) {
    if (required) fail("R4_PRODUCTION_ORIGIN_HEADERS_INVALID");
    return null;
  }
  if (value.includes(",")) fail("R4_PRODUCTION_ORIGIN_HEADERS_AMBIGUOUS");
  return value;
}

/**
 * Application-side half of the Gate C origin chain. Caddy must already have
 * stripped client-supplied forwarding/CF identity headers and installed one
 * canonical replacement. Any ambiguity or extra proxy-derived identity is
 * denied rather than guessed.
 */
function canonicalProxyHeadersWithAssertion(
  input: ProductionHeaderBag,
  config: Pick<PublicCoreProductionConfig, "publicOrigin">,
): CanonicalProxyHeadersWithAssertion {
  const headers = normalizeHeaders(input);
  for (const name of headers.keys()) {
    if (isForbiddenProxyOrIdentityHeader(name)) {
      fail("R4_PRODUCTION_ORIGIN_HEADERS_AMBIGUOUS");
    }
  }

  const expectedHost = new URL(config.publicOrigin).host;
  const host = singleHeader(headers, "host", true);
  const proto = singleHeader(headers, "x-forwarded-proto", true);
  const accessAssertion = singleHeader(headers, "cf-access-jwt-assertion", false);
  const cfRay = singleHeader(headers, "cf-ray", false);
  if (host !== expectedHost || proto !== "https") fail("R4_PRODUCTION_ORIGIN_HEADERS_INVALID");
  if (accessAssertion !== null && !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(accessAssertion)) {
    fail("R4_PRODUCTION_ORIGIN_HEADERS_AMBIGUOUS");
  }

  return Object.freeze({ host, proto: "https", accessAssertionPresent: accessAssertion !== null, accessAssertion, cfRay });
}

/** Header-shape validation only; this deliberately does not claim provenance. */
export function assertCanonicalProxyHeaderShape(
  input: ProductionHeaderBag,
  config: Pick<PublicCoreProductionConfig, "publicOrigin">,
): CanonicalProxyHeaders {
  const trusted = canonicalProxyHeadersWithAssertion(input, config);
  return Object.freeze({
    host: trusted.host,
    proto: trusted.proto,
    accessAssertionPresent: trusted.accessAssertionPresent,
    cfRay: trusted.cfRay,
  });
}


const ORIGIN_AUTHORITY = new WeakMap<VerifiedProductionOriginAuthority, Readonly<{
  declarationRef: string;
  expectedOrigin: string;
  host: string;
  cfRay: string;
  accessAssertionPresent: boolean;
  accessAssertionSha256: string | null;
}>>();
const ORIGIN_AUTHORITY_CONSTRUCTOR = Symbol("R4_PRODUCTION_ORIGIN_AUTHORITY_CONSTRUCTOR");

/** Opaque proof that the Gate-C origin adapter accepted this exact edge lane. */
export class VerifiedProductionOriginAuthority {
  constructor(
    token: typeof ORIGIN_AUTHORITY_CONSTRUCTOR,
    input: Readonly<{
      declarationRef: string;
      expectedOrigin: string;
      host: string;
      cfRay: string;
      accessAssertionPresent: boolean;
      accessAssertionSha256: string | null;
    }>,
  ) {
    if (token !== ORIGIN_AUTHORITY_CONSTRUCTOR) fail("R4_PRODUCTION_ORIGIN_AUTHORITY_INVALID");
    ORIGIN_AUTHORITY.set(this, Object.freeze({ ...input }));
    Object.freeze(this);
  }

  toJSON(): Readonly<{ schemaVersion: "r4_verified_production_origin.v1"; verified: true }> {
    return Object.freeze({ schemaVersion: "r4_verified_production_origin.v1", verified: true });
  }
}

export async function verifyProductionOriginBoundary(
  input: VerifyProductionOriginBoundaryInput,
): Promise<VerifiedProductionOriginAuthority> {
  const trusted = canonicalProxyHeadersWithAssertion(input.headers, input.config);
  const headers: CanonicalProxyHeaders = Object.freeze({
    host: trusted.host,
    proto: trusted.proto,
    accessAssertionPresent: trusted.accessAssertionPresent,
    cfRay: trusted.cfRay,
  });
  if (headers.cfRay === null || !/^[A-Za-z0-9_-]{8,128}$/u.test(headers.cfRay)) {
    fail("R4_PRODUCTION_ORIGIN_HEADERS_INVALID");
  }
  if (!input.verifier || typeof input.verifier.verify !== "function") {
    fail("R4_PRODUCTION_ORIGIN_VERIFIER_INVALID");
  }
  let result: unknown;
  try {
    result = await input.verifier.verify({
      declarationRef: input.config.originProtection.declarationRef,
      expectedOrigin: input.config.publicOrigin,
      host: headers.host,
      proto: headers.proto,
      cfRay: headers.cfRay,
      transportEvidence: input.transportEvidence,
    });
  } catch {
    fail("R4_PRODUCTION_ORIGIN_VERIFICATION_FAILED");
  }
  if (
    result === null
    || typeof result !== "object"
    || Array.isArray(result)
    || (result as Record<string, unknown>).verified !== true
    || (result as Record<string, unknown>).declarationRef !== input.config.originProtection.declarationRef
    || Object.keys(result as Record<string, unknown>).some((key) => !["verified", "declarationRef"].includes(key))
  ) fail("R4_PRODUCTION_ORIGIN_VERIFICATION_FAILED");
  return new VerifiedProductionOriginAuthority(ORIGIN_AUTHORITY_CONSTRUCTOR, {
    declarationRef: input.config.originProtection.declarationRef,
    expectedOrigin: input.config.publicOrigin,
    host: headers.host,
    cfRay: headers.cfRay,
    accessAssertionPresent: headers.accessAssertionPresent,
    accessAssertionSha256: trusted.accessAssertion === null
      ? null
      : `sha256:${createHash("sha256").update(trusted.accessAssertion, "utf8").digest("hex")}`,
  });
}

function assertOriginAuthority(
  authority: VerifiedProductionOriginAuthority,
  config: PublicCoreProductionConfig,
  headers: CanonicalProxyHeadersWithAssertion,
): void {
  const observed = ORIGIN_AUTHORITY.get(authority);
  if (
    !observed
    || observed.declarationRef !== config.originProtection.declarationRef
    || observed.expectedOrigin !== config.publicOrigin
    || observed.host !== headers.host
    || observed.cfRay !== headers.cfRay
    || observed.accessAssertionPresent !== headers.accessAssertionPresent
    || observed.accessAssertionSha256 !== (
      headers.accessAssertion === null
        ? null
        : `sha256:${createHash("sha256").update(headers.accessAssertion, "utf8").digest("hex")}`
    )
  ) fail("R4_PRODUCTION_ORIGIN_AUTHORITY_INVALID");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integerClaim(claims: Record<string, unknown>, name: string): number {
  const value = claims[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
  }
  return value;
}

function stringClaim(claims: Record<string, unknown>, name: string): string {
  const value = claims[name];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n\0]/u.test(value)) {
    fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
  }
  return value;
}

function exactAudience(value: unknown, expected: string): void {
  if (typeof value === "string") {
    if (value !== expected) fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
    return;
  }
  if (
    !Array.isArray(value)
    || value.length !== 1
    || typeof value[0] !== "string"
    || value[0] !== expected
  ) {
    fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
  }
}

function validateClaims(
  value: unknown,
  input: AuthenticateProductionActorInput,
  audience: string,
  nowEpochSeconds: number,
): AuthenticatedProductionActor {
  if (!isRecord(value)) fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
  const issuer = stringClaim(value, "iss");
  const subject = stringClaim(value, "sub");
  exactAudience(value.aud, audience);
  const issuedAt = integerClaim(value, "iat");
  const notBefore = integerClaim(value, "nbf");
  const expiresAt = integerClaim(value, "exp");
  const maximumAge = input.requiredLane === "control"
    ? input.config.access.controlMaximumAgeSeconds
    : input.config.access.approveMaximumAgeSeconds;

  if (
    issuer !== input.config.access.issuer
    || issuedAt > nowEpochSeconds
    || notBefore < issuedAt
    || notBefore > nowEpochSeconds
    || expiresAt <= nowEpochSeconds
    || expiresAt <= issuedAt
    || nowEpochSeconds - issuedAt > maximumAge
    || expiresAt - issuedAt > maximumAge
  ) {
    fail("R4_PRODUCTION_IDENTITY_CLAIMS_INVALID");
  }

  const actor = subject === input.config.access.controllerSubject
    ? "controller"
    : subject === input.config.access.curatorSubject
      ? "curator"
      : null;
  if (actor === null || actor !== input.requiredActor) {
    fail("R4_PRODUCTION_IDENTITY_SUBJECT_UNAUTHORIZED");
  }
  if (actor === "curator" && input.requiredLane !== "approve") {
    fail("R4_PRODUCTION_IDENTITY_LANE_UNAUTHORIZED");
  }

  return Object.freeze({ actor, subject, lane: input.requiredLane });
}

/**
 * Access identity is deliberately available only for Controller and Curator
 * routes. Public, Guest-capability and room_operator callers use their own
 * route-specific authorization and must never call this resolver.
 */
export async function authenticateProductionActor(
  input: AuthenticateProductionActorInput,
): Promise<AuthenticatedProductionActor> {
  const trusted = canonicalProxyHeadersWithAssertion(input.headers, input.config);
  assertOriginAuthority(input.originAuthority, input.config, trusted);
  if (trusted.accessAssertion === null) fail("R4_PRODUCTION_IDENTITY_ASSERTION_MISSING");
  const audience = input.requiredLane === "control"
    ? input.config.access.controlAudience
    : input.config.access.approveAudience;
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) fail("R4_PRODUCTION_IDENTITY_CLOCK_INVALID");

  let claims: unknown;
  try {
    claims = await input.verifier.verify({
      assertion: trusted.accessAssertion,
      issuer: input.config.access.issuer,
      audience,
    });
  } catch {
    fail("R4_PRODUCTION_IDENTITY_VERIFICATION_FAILED");
  }
  return validateClaims(claims, input, audience, Math.floor(nowMs / 1_000));
}
