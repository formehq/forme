import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_CORE_PRODUCTION_ENV_KEYS,
  PublicCoreConfigurationError,
  loadPublicCoreProductionConfig,
  serializePublicCoreProductionConfig,
  type PublicCoreProductionConfig,
} from "../../apps/room/src/production-config.ts";
import {
  ProductionIdentityError,
  assertCanonicalProxyHeaderShape,
  authenticateProductionActor,
  verifyProductionOriginBoundary,
  type ProductionAccessClaims,
} from "../../apps/room/src/production-identity.ts";
import {
  PUBLIC_CORE_ACTION_NAMES,
  PUBLIC_CORE_CONSTRUCTION_BOUNDARY,
  PUBLIC_CORE_OPERATION_INVENTORY,
  PUBLIC_CORE_POLICY_ID,
  PUBLIC_CORE_UNAVAILABLE_CAPABILITY_FAMILIES,
  PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES,
  PublicCorePolicyError,
  assertPublicCoreAction,
  assertPublicCoreRoomScope,
} from "../../apps/room/src/public-core-policy.ts";
import { OPERATION_INVENTORY } from "../../apps/room/src/operation-inventory.ts";

const HASH = "a".repeat(64);
const NOW = new Date("2026-08-10T12:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1_000);
const ASSERTION = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.c2lnbmF0dXJl";
const OTHER_ASSERTION = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJvdGhlciJ9.b3RoZXJzaWduYXR1cmU";

function ref(kind: string, name: string): string {
  return `ref:${kind}/${name}@sha256:${HASH}`;
}

function validEnvironment(): Record<string, string> {
  const key = PUBLIC_CORE_PRODUCTION_ENV_KEYS;
  return {
    [key.deploymentMode]: "production_public_core",
    [key.policyId]: PUBLIC_CORE_POLICY_ID,
    [key.publicOrigin]: "https://rooms.forme.example",
    [key.accessIssuer]: "https://forme.cloudflareaccess.com",
    [key.accessControlAudience]: "control_audience_0000000000001",
    [key.accessApproveAudience]: "approve_audience_0000000000001",
    [key.controllerSubject]: "controller-subject-0001",
    [key.curatorSubject]: "curator-subject-000001",
    [key.originProtectionRef]: ref("origin-protection", "forme-tunnel"),
    [key.databaseUrlRef]: ref("postgres-url", "public-core"),
    [key.bodyEncryptionKeyRef]: ref("body-encryption", "public-core"),
    [key.capabilityPepperRef]: ref("capability-pepper", "public-core"),
    [key.publicationVerifierRef]: ref("publication-verifier", "owner-publication"),
    [key.retentionDeclarationRef]: ref("retention", "public-knock"),
    [key.cloudflareLogDeclarationRef]: ref("cloudflare-logs", "public-core"),
    [key.cloudflareLogRetentionHours]: "24",
    [key.caddyLogDeclarationRef]: ref("caddy-logs", "public-core"),
    [key.caddyLogRetentionHours]: "24",
    [key.appLogDeclarationRef]: ref("app-logs", "body-free"),
    [key.appLogRetentionHours]: "168",
    [key.postgresLogDeclarationRef]: ref("postgres-logs", "body-free"),
    [key.postgresLogRetentionHours]: "168",
    [key.backupDeclarationRef]: ref("postgres-backup", "public-core"),
    [key.backupRetentionHours]: "168",
    [key.restoreEvidenceRef]: ref("restore-evidence", "public-core-rehearsal"),
  };
}

function validConfig(): PublicCoreProductionConfig {
  return loadPublicCoreProductionConfig(validEnvironment());
}

function bodyFreeError(error: unknown, expectedType: new (...args: never[]) => Error, canary: string): boolean {
  assert.ok(error instanceof expectedType);
  const serialized = `${error.message}\n${JSON.stringify(error)}`;
  assert.equal(serialized.includes(canary), false);
  return true;
}

function claims(config: PublicCoreProductionConfig, actor: "controller" | "curator", lane: "control" | "approve"):
ProductionAccessClaims {
  const maximumAge = lane === "control" ? 43_200 : 900;
  return {
    iss: config.access.issuer,
    aud: [lane === "control" ? config.access.controlAudience : config.access.approveAudience],
    sub: actor === "controller" ? config.access.controllerSubject : config.access.curatorSubject,
    iat: NOW_SECONDS - 60,
    nbf: NOW_SECONDS - 60,
    exp: NOW_SECONDS - 60 + maximumAge,
  };
}

function accessHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    host: "rooms.forme.example",
    "x-forwarded-proto": "https",
    "cf-access-jwt-assertion": ASSERTION,
    "cf-ray": "synthetic-ray",
    ...overrides,
  };
}

async function originAuthority(config: PublicCoreProductionConfig, headers = accessHeaders()) {
  return await verifyProductionOriginBoundary({
    headers,
    config,
    transportEvidence: Object.freeze({ localProxyConnection: true }),
    verifier: {
      verify(input) {
        assert.equal(input.declarationRef, config.originProtection.declarationRef);
        return { verified: true, declarationRef: input.declarationRef };
      },
    },
  });
}

test("#67 production config is a closed reference-only declaration", () => {
  const env = validEnvironment();
  env.UNRELATED_RAW_SECRET_CANARY = "RAW_SECRET_MUST_NOT_RETURN";
  const config = loadPublicCoreProductionConfig(env);

  assert.equal(config.schemaVersion, "r4_public_core_production_config.v1");
  assert.equal(config.publicOrigin, "https://rooms.forme.example");
  assert.equal(config.access.issuer, "https://forme.cloudflareaccess.com");
  assert.notEqual(config.access.controlAudience, config.access.approveAudience);
  assert.notEqual(config.access.controllerSubject, config.access.curatorSubject);
  assert.equal(config.retention.interactionBodyMaximumDays, 30);
  assert.equal(config.retention.responseBodyAvailable, false);
  assert.equal(config.backup.retentionHours, 168);
  assert.deepEqual(config.unavailable, {
    fullSurface: true,
    freshResponseSession: true,
    response: true,
    grant: true,
    privateRoom: true,
    email: true,
  });
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.logging), true);

  const diagnostic = serializePublicCoreProductionConfig(config);
  assert.equal(diagnostic.includes("RAW_SECRET_MUST_NOT_RETURN"), false);
  assert.equal(diagnostic.includes("ref:postgres-url/public-core"), false);
  assert.equal(diagnostic.includes("ref:body-encryption/public-core"), false);
  assert.equal(diagnostic.includes("ref:retention/public-knock"), false);
  assert.equal(diagnostic.includes("ref:cloudflare-logs/public-core"), false);
  assert.equal(diagnostic.includes("ref:postgres-backup/public-core"), false);
  assert.equal(diagnostic.includes("ref:restore-evidence/public-core-rehearsal"), false);
  assert.equal(diagnostic.includes(config.access.controlAudience), false);
  assert.equal(diagnostic.includes(config.access.controllerSubject), false);
  assert.match(diagnostic, /"response":true/u);
});

test("production config fails closed on missing, unknown, raw-secret, origin, identity, reference, and declaration drift", () => {
  const cases: Array<{ mutate(env: Record<string, string>): void; canary: string }> = [
    {
      mutate(env) { delete env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.backupDeclarationRef]; },
      canary: "MISSING_CANARY",
    },
    {
      mutate(env) { env.FORME_R4_PUBLIC_CORE_UNKNOWN_CANARY = "UNKNOWN_VALUE_CANARY"; },
      canary: "UNKNOWN_VALUE_CANARY",
    },
    {
      mutate(env) { env.DATABASE_URL = "RAW_DATABASE_SECRET_CANARY"; },
      canary: "RAW_DATABASE_SECRET_CANARY",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.publicOrigin] = "http://ORIGIN_VALUE_CANARY.example"; },
      canary: "ORIGIN_VALUE_CANARY",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.publicOrigin] = "https://rooms.forme.example/"; },
      canary: "rooms.forme.example",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.accessIssuer] = "https://issuer.example"; },
      canary: "issuer.example",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.curatorSubject] = env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.controllerSubject]!; },
      canary: "controller-subject-0001",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.databaseUrlRef] = "RAW_REFERENCE_SECRET_CANARY"; },
      canary: "RAW_REFERENCE_SECRET_CANARY",
    },
    {
      mutate(env) { env[PUBLIC_CORE_PRODUCTION_ENV_KEYS.backupRetentionHours] = "8761"; },
      canary: "8761",
    },
  ];

  for (const entry of cases) {
    const env = validEnvironment();
    entry.mutate(env);
    assert.throws(
      () => loadPublicCoreProductionConfig(env),
      (error: unknown) => bodyFreeError(error, PublicCoreConfigurationError, entry.canary),
    );
  }
});

test("trusted-origin gate accepts one canonical proxy replacement and rejects forwarding, CF identity, or synthetic ambiguity", () => {
  const config = validConfig();
  assert.deepEqual(assertCanonicalProxyHeaderShape(accessHeaders(), config), {
    host: "rooms.forme.example",
    proto: "https",
    accessAssertionPresent: true,
    cfRay: "synthetic-ray",
  });
  assert.deepEqual(assertCanonicalProxyHeaderShape({
    host: "rooms.forme.example",
    "x-forwarded-proto": "https",
  }, config), {
    host: "rooms.forme.example",
    proto: "https",
    accessAssertionPresent: false,
    cfRay: null,
  });
  assert.equal(JSON.stringify(assertCanonicalProxyHeaderShape(accessHeaders(), config)).includes(ASSERTION), false);

  const ambiguous: Array<Record<string, string>> = [
    { forwarded: "for=FORWARDED_CANARY" },
    { "x-forwarded-for": "FORWARDED_FOR_CANARY" },
    { "cf-connecting-ip": "CF_IP_CANARY" },
    { "cf-access-authenticated-user-email": "CF_EMAIL_CANARY" },
    { "x-forme-synthetic-actor": "controller" },
    { "cf-access-jwt-assertion": `${ASSERTION},${ASSERTION}` },
    { "x-forwarded-proto": "http" },
    { host: "direct-origin.example" },
  ];
  for (const extra of ambiguous) {
    const canary = Object.values(extra)[0]!;
    assert.throws(
      () => assertCanonicalProxyHeaderShape(accessHeaders(extra), config),
      (error: unknown) => bodyFreeError(error, ProductionIdentityError, canary),
    );
  }
  assert.throws(
    () => assertCanonicalProxyHeaderShape({
      Host: "rooms.forme.example",
      host: "rooms.forme.example",
      "x-forwarded-proto": "https",
    }, config),
    ProductionIdentityError,
  );
});

test("production origin authority consumes the declared protection proof and is bound to the exact request lane", async () => {
  const config = validConfig();
  const headers = accessHeaders();
  const authority = await originAuthority(config, headers);
  assert.deepEqual(JSON.parse(JSON.stringify(authority)), {
    schemaVersion: "r4_verified_production_origin.v1",
    verified: true,
  });
  assert.equal(JSON.stringify(authority).includes(ASSERTION), false);

  for (const verifier of [
    { verify: () => ({ verified: false, declarationRef: config.originProtection.declarationRef }) },
    { verify: () => ({ verified: true, declarationRef: "WRONG_ORIGIN_REFERENCE_CANARY" }) },
    { verify: () => { throw new Error("ORIGIN_VERIFIER_SECRET_CANARY"); } },
  ]) {
    await assert.rejects(
      verifyProductionOriginBoundary({
        headers,
        config,
        transportEvidence: Object.freeze({ localProxyConnection: true }),
        verifier,
      }),
      (error: unknown) => bodyFreeError(error, ProductionIdentityError, "CANARY"),
    );
  }
  await assert.rejects(
    verifyProductionOriginBoundary({
      headers: { host: "rooms.forme.example", "x-forwarded-proto": "https" },
      config,
      transportEvidence: null,
      verifier: { verify: () => ({ verified: true, declarationRef: config.originProtection.declarationRef }) },
    }),
    ProductionIdentityError,
  );

  await assert.rejects(
    authenticateProductionActor({
      headers,
      originAuthority: {} as Awaited<ReturnType<typeof originAuthority>>,
      requiredActor: "controller",
      requiredLane: "control",
      config,
      now: NOW,
      verifier: { verify: () => claims(config, "controller", "control") },
    }),
    /R4_PRODUCTION_ORIGIN_AUTHORITY_INVALID/u,
  );
  await assert.rejects(
    authenticateProductionActor({
      headers: { ...headers, "cf-ray": "different-ray" },
      originAuthority: authority,
      requiredActor: "controller",
      requiredLane: "control",
      config,
      now: NOW,
      verifier: { verify: () => claims(config, "controller", "control") },
    }),
    /R4_PRODUCTION_ORIGIN_AUTHORITY_INVALID/u,
  );
  await assert.rejects(
    authenticateProductionActor({
      headers: { ...headers, "cf-access-jwt-assertion": OTHER_ASSERTION },
      originAuthority: authority,
      requiredActor: "controller",
      requiredLane: "control",
      config,
      now: NOW,
      verifier: { verify: () => claims(config, "controller", "control") },
    }),
    /R4_PRODUCTION_ORIGIN_AUTHORITY_INVALID/u,
  );
});

test("production Access resolver validates injected JWT claims and returns only the closed actor result", async () => {
  const config = validConfig();
  const origin = await originAuthority(config);
  const seen: unknown[] = [];
  const controller = await authenticateProductionActor({
    headers: accessHeaders(),
    originAuthority: origin,
    requiredActor: "controller",
    requiredLane: "control",
    config,
    now: NOW,
    verifier: {
      verify(input) {
        seen.push(input);
        return claims(config, "controller", "control");
      },
    },
  });
  assert.deepEqual(controller, {
    actor: "controller",
    subject: config.access.controllerSubject,
    lane: "control",
  });
  assert.deepEqual(seen, [{
    assertion: ASSERTION,
    issuer: config.access.issuer,
    audience: config.access.controlAudience,
  }]);
  assert.equal(JSON.stringify(controller).includes(ASSERTION), false);

  const curator = await authenticateProductionActor({
    headers: accessHeaders(),
    originAuthority: origin,
    requiredActor: "curator",
    requiredLane: "approve",
    config,
    now: NOW,
    verifier: { verify: () => claims(config, "curator", "approve") },
  });
  assert.deepEqual(curator, {
    actor: "curator",
    subject: config.access.curatorSubject,
    lane: "approve",
  });
});

test("production Access resolver fails closed on verifier, claim, role, lane, and assertion errors without echoing bytes", async () => {
  const config = validConfig();
  const cases: Array<{
    label: string;
    requiredActor?: "controller" | "curator";
    requiredLane?: "control" | "approve";
    headers?: Record<string, string>;
    verify(): unknown | Promise<unknown>;
  }> = [
    {
      label: "VERIFIER_THROW_CANARY",
      verify() { throw new Error("VERIFIER_THROW_CANARY"); },
    },
    {
      label: "WRONG_ISSUER_CANARY",
      verify() { return { ...claims(config, "controller", "control"), iss: "WRONG_ISSUER_CANARY" }; },
    },
    {
      label: "WRONG_AUDIENCE_CANARY",
      verify() { return { ...claims(config, "controller", "control"), aud: ["WRONG_AUDIENCE_CANARY"] }; },
    },
    {
      label: "UNKNOWN_SUBJECT_CANARY",
      verify() { return { ...claims(config, "controller", "control"), sub: "UNKNOWN_SUBJECT_CANARY" }; },
    },
    {
      label: "STALE_IAT_CANARY",
      verify() { return { ...claims(config, "controller", "control"), iat: NOW_SECONDS - 43_201, nbf: NOW_SECONDS - 43_201 }; },
    },
    {
      label: "CURATOR_CONTROL_CANARY",
      requiredActor: "curator",
      verify() { return claims(config, "curator", "control"); },
    },
    {
      label: "ACTOR_MISMATCH_CANARY",
      requiredActor: "curator",
      requiredLane: "approve",
      verify() { return claims(config, "controller", "approve"); },
    },
    {
      label: "ASSERTION_MISSING_CANARY",
      headers: { host: "rooms.forme.example", "x-forwarded-proto": "https", "cf-ray": "missing-assertion-ray" },
      verify() { return claims(config, "controller", "control"); },
    },
  ];

  for (const entry of cases) {
    const headers = entry.headers ?? accessHeaders();
    await assert.rejects(
      authenticateProductionActor({
        headers,
        originAuthority: await originAuthority(config, headers),
        requiredActor: entry.requiredActor ?? "controller",
        requiredLane: entry.requiredLane ?? "control",
        config,
        now: NOW,
        verifier: { verify: () => entry.verify() },
      }),
      (error: unknown) => bodyFreeError(error, ProductionIdentityError, entry.label),
    );
  }
});

test("#67 production action policy is exactly public-only and rejects all Full/Fresh/Response/Grant/Private/email operations", () => {
  assert.deepEqual(PUBLIC_CORE_CONSTRUCTION_BOUNDARY, {
    schemaVersion: "r4_public_core_construction_boundary.v1",
    productionApplicationAdapterConstructed: false,
    durablePersistenceAdapterConstructed: false,
    credentialVaultAdapterConstructed: false,
    transportAdapterConstructed: false,
    trafficReady: false,
    gateCReady: false,
  });
  assert.equal(PUBLIC_CORE_ACTION_NAMES.length, 20);
  assert.equal(PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES.length, 25);
  assert.equal(PUBLIC_CORE_OPERATION_INVENTORY.length, 20);
  assert.deepEqual(
    new Set([...PUBLIC_CORE_ACTION_NAMES, ...PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES]),
    new Set(OPERATION_INVENTORY.map((operation) => operation.name)),
  );
  assert.deepEqual(PUBLIC_CORE_UNAVAILABLE_CAPABILITY_FAMILIES, [
    "full_surface",
    "fresh_response_session",
    "response",
    "grant_or_continuation",
    "private_room",
    "email_or_notification",
  ]);

  assert.equal(assertPublicCoreAction("room_operator.projection.deliver").actor, "room_operator");
  assert.equal(assertPublicCoreAction("room.mode.set").actor, "controller");
  for (const outOfSlice of ["control.status", "control.interaction.read", "interaction.close"] as const) {
    assert.equal(PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES.includes(outOfSlice), true);
  }
  for (const action of PUBLIC_CORE_UNAVAILABLE_OPERATION_NAMES) {
    assert.throws(
      () => assertPublicCoreAction(action),
      (error: unknown) => bodyFreeError(error, PublicCorePolicyError, action),
    );
  }
  assert.throws(
    () => assertPublicCoreAction("future.full.action.canary"),
    (error: unknown) => bodyFreeError(error, PublicCorePolicyError, "future.full.action.canary"),
  );

  assert.deepEqual(assertPublicCoreRoomScope({
    roomKind: "third_place_public",
    interactionMode: "public_single",
    capabilityKind: "public_encounter",
  }), {
    roomKind: "third_place_public",
    interactionMode: "public_single",
    capabilityKind: "public_encounter",
  });
  for (const scope of [
    { roomKind: "private_grant_only", interactionMode: "invite_only", capabilityKind: "grant" },
    { roomKind: "third_place_public", interactionMode: "public_single", capabilityKind: "grant" },
    { roomKind: "third_place_public", interactionMode: "invite_only", capabilityKind: null },
  ]) {
    assert.throws(() => assertPublicCoreRoomScope(scope), PublicCorePolicyError);
  }
});
