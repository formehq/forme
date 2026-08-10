import { PUBLIC_CORE_POLICY_ID } from "./public-core-policy.ts";

const PREFIX = "FORME_R4_PUBLIC_CORE_";

export const PUBLIC_CORE_PRODUCTION_ENV_KEYS = Object.freeze({
  deploymentMode: `${PREFIX}DEPLOYMENT_MODE`,
  policyId: `${PREFIX}POLICY_ID`,
  publicOrigin: `${PREFIX}PUBLIC_ORIGIN`,
  accessIssuer: `${PREFIX}CF_ACCESS_ISSUER`,
  accessControlAudience: `${PREFIX}CF_ACCESS_CONTROL_AUDIENCE`,
  accessApproveAudience: `${PREFIX}CF_ACCESS_APPROVE_AUDIENCE`,
  controllerSubject: `${PREFIX}CONTROLLER_SUBJECT`,
  curatorSubject: `${PREFIX}CURATOR_SUBJECT`,
  originProtectionRef: `${PREFIX}ORIGIN_PROTECTION_REF`,
  databaseUrlRef: `${PREFIX}DATABASE_URL_REF`,
  bodyEncryptionKeyRef: `${PREFIX}BODY_ENCRYPTION_KEY_REF`,
  capabilityPepperRef: `${PREFIX}CAPABILITY_PEPPER_REF`,
  publicationVerifierRef: `${PREFIX}PUBLICATION_VERIFIER_REF`,
  retentionDeclarationRef: `${PREFIX}RETENTION_DECLARATION_REF`,
  cloudflareLogDeclarationRef: `${PREFIX}CLOUDFLARE_LOG_DECLARATION_REF`,
  cloudflareLogRetentionHours: `${PREFIX}CLOUDFLARE_LOG_RETENTION_HOURS`,
  caddyLogDeclarationRef: `${PREFIX}CADDY_LOG_DECLARATION_REF`,
  caddyLogRetentionHours: `${PREFIX}CADDY_LOG_RETENTION_HOURS`,
  appLogDeclarationRef: `${PREFIX}APP_LOG_DECLARATION_REF`,
  appLogRetentionHours: `${PREFIX}APP_LOG_RETENTION_HOURS`,
  postgresLogDeclarationRef: `${PREFIX}POSTGRES_LOG_DECLARATION_REF`,
  postgresLogRetentionHours: `${PREFIX}POSTGRES_LOG_RETENTION_HOURS`,
  backupDeclarationRef: `${PREFIX}BACKUP_DECLARATION_REF`,
  backupRetentionHours: `${PREFIX}BACKUP_RETENTION_HOURS`,
  restoreEvidenceRef: `${PREFIX}RESTORE_EVIDENCE_REF`,
} as const);

const REQUIRED_KEYS = new Set<string>(Object.values(PUBLIC_CORE_PRODUCTION_ENV_KEYS));

const RAW_SECRET_KEYS = new Set([
  "DATABASE_URL",
  `${PREFIX}DATABASE_URL`,
  `${PREFIX}BODY_ENCRYPTION_KEY`,
  `${PREFIX}CAPABILITY_PEPPER`,
  `${PREFIX}PUBLICATION_VERIFIER_KEY`,
  `${PREFIX}SECRET`,
  `${PREFIX}TOKEN`,
]);

export type PublicCoreConfigReference = `ref:${string}/${string}@sha256:${string}`;

export interface PublicCoreProductionConfig {
  readonly schemaVersion: "r4_public_core_production_config.v1";
  readonly deploymentMode: "production_public_core";
  readonly policyId: typeof PUBLIC_CORE_POLICY_ID;
  readonly publicOrigin: string;
  readonly access: Readonly<{
    issuer: string;
    controlAudience: string;
    approveAudience: string;
    controllerSubject: string;
    curatorSubject: string;
    controlMaximumAgeSeconds: 43_200;
    approveMaximumAgeSeconds: 900;
  }>;
  readonly originProtection: Readonly<{
    declarationRef: PublicCoreConfigReference;
  }>;
  readonly resourceReferences: Readonly<{
    databaseUrl: PublicCoreConfigReference;
    bodyEncryptionKey: PublicCoreConfigReference;
    capabilityPepper: PublicCoreConfigReference;
    publicationVerifier: PublicCoreConfigReference;
  }>;
  readonly retention: Readonly<{
    declarationRef: PublicCoreConfigReference;
    interactionBodyMaximumDays: 30;
    responseBodyAvailable: false;
    bodyFreeReceiptMaximumDays: 37;
    purgeTargetHours: 24;
    purgeIncidentAfterHours: 36;
  }>;
  readonly logging: Readonly<{
    cloudflare: PublicCoreLogDeclaration;
    caddy: PublicCoreLogDeclaration;
    app: PublicCoreLogDeclaration;
    postgres: PublicCoreLogDeclaration;
  }>;
  readonly backup: Readonly<{
    declarationRef: PublicCoreConfigReference;
    retentionHours: number;
    restoreEvidenceRef: PublicCoreConfigReference;
  }>;
  readonly unavailable: Readonly<{
    fullSurface: true;
    freshResponseSession: true;
    response: true;
    grant: true;
    privateRoom: true;
    email: true;
  }>;
}

export interface PublicCoreLogDeclaration {
  readonly declarationRef: PublicCoreConfigReference;
  readonly retentionHours: number;
}

export class PublicCoreConfigurationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicCoreConfigurationError";
    this.code = code;
  }

  toJSON(): Readonly<{ name: string; code: string }> {
    return Object.freeze({ name: this.name, code: this.code });
  }
}

function fail(code: string): never {
  throw new PublicCoreConfigurationError(code);
}

function required(env: Readonly<Record<string, string | undefined>>, key: string): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n\0]/u.test(value)) {
    fail("R4_PUBLIC_CORE_CONFIG_MISSING_OR_INVALID");
  }
  return value;
}

function exactHttpsOrigin(value: string, cloudflareIssuer = false): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("R4_PUBLIC_CORE_CONFIG_ORIGIN_INVALID");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.origin !== value
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.pathname !== "/"
    || parsed.search !== ""
    || parsed.hash !== ""
    || (cloudflareIssuer && !parsed.hostname.endsWith(".cloudflareaccess.com"))
  ) {
    fail("R4_PUBLIC_CORE_CONFIG_ORIGIN_INVALID");
  }
  return parsed.origin;
}

function opaqueAccessValue(value: string): string {
  if (!/^[A-Za-z0-9_-]{16,255}$/u.test(value)) fail("R4_PUBLIC_CORE_CONFIG_ACCESS_INVALID");
  return value;
}

function stableSubject(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,255}$/u.test(value)) fail("R4_PUBLIC_CORE_CONFIG_ACCESS_INVALID");
  return value;
}

function reference(value: string, kind: string): PublicCoreConfigReference {
  const escapedKind = kind.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const expression = new RegExp(`^ref:${escapedKind}\/[a-z0-9][a-z0-9._\/-]{0,127}@sha256:[a-f0-9]{64}$`, "u");
  if (!expression.test(value)) fail("R4_PUBLIC_CORE_CONFIG_REFERENCE_INVALID");
  return value as PublicCoreConfigReference;
}

function declaredHours(value: string): number {
  if (!/^(0|[1-9][0-9]{0,3})$/u.test(value)) fail("R4_PUBLIC_CORE_CONFIG_DECLARATION_INVALID");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 8_760) {
    fail("R4_PUBLIC_CORE_CONFIG_DECLARATION_INVALID");
  }
  return parsed;
}

function logDeclaration(
  env: Readonly<Record<string, string | undefined>>,
  component: "cloudflare" | "caddy" | "app" | "postgres",
  declarationKey: string,
  retentionKey: string,
): PublicCoreLogDeclaration {
  return Object.freeze({
    declarationRef: reference(required(env, declarationKey), `${component}-logs`),
    retentionHours: declaredHours(required(env, retentionKey)),
  });
}

function assertClosedEnvironment(env: Readonly<Record<string, string | undefined>>): void {
  for (const key of Object.keys(env)) {
    if (RAW_SECRET_KEYS.has(key)) fail("R4_PUBLIC_CORE_CONFIG_RAW_SECRET_FORBIDDEN");
    if (key.startsWith(PREFIX) && !REQUIRED_KEYS.has(key)) {
      fail("R4_PUBLIC_CORE_CONFIG_UNKNOWN_KEY");
    }
  }
  if ([...REQUIRED_KEYS].some((key) => typeof env[key] !== "string" || env[key] === "")) {
    fail("R4_PUBLIC_CORE_CONFIG_MISSING_OR_INVALID");
  }
}

export function loadPublicCoreProductionConfig(
  env: Readonly<Record<string, string | undefined>>,
): PublicCoreProductionConfig {
  assertClosedEnvironment(env);
  const key = PUBLIC_CORE_PRODUCTION_ENV_KEYS;
  if (required(env, key.deploymentMode) !== "production_public_core") {
    fail("R4_PUBLIC_CORE_CONFIG_MODE_INVALID");
  }
  if (required(env, key.policyId) !== PUBLIC_CORE_POLICY_ID) {
    fail("R4_PUBLIC_CORE_CONFIG_POLICY_INVALID");
  }

  const publicOrigin = exactHttpsOrigin(required(env, key.publicOrigin));
  const issuer = exactHttpsOrigin(required(env, key.accessIssuer), true);
  if (issuer === publicOrigin) fail("R4_PUBLIC_CORE_CONFIG_ORIGIN_INVALID");

  const controlAudience = opaqueAccessValue(required(env, key.accessControlAudience));
  const approveAudience = opaqueAccessValue(required(env, key.accessApproveAudience));
  const controllerSubject = stableSubject(required(env, key.controllerSubject));
  const curatorSubject = stableSubject(required(env, key.curatorSubject));
  if (controlAudience === approveAudience || controllerSubject === curatorSubject) {
    fail("R4_PUBLIC_CORE_CONFIG_ACCESS_INVALID");
  }

  return Object.freeze({
    schemaVersion: "r4_public_core_production_config.v1",
    deploymentMode: "production_public_core",
    policyId: PUBLIC_CORE_POLICY_ID,
    publicOrigin,
    access: Object.freeze({
      issuer,
      controlAudience,
      approveAudience,
      controllerSubject,
      curatorSubject,
      controlMaximumAgeSeconds: 43_200,
      approveMaximumAgeSeconds: 900,
    }),
    originProtection: Object.freeze({
      declarationRef: reference(required(env, key.originProtectionRef), "origin-protection"),
    }),
    resourceReferences: Object.freeze({
      databaseUrl: reference(required(env, key.databaseUrlRef), "postgres-url"),
      bodyEncryptionKey: reference(required(env, key.bodyEncryptionKeyRef), "body-encryption"),
      capabilityPepper: reference(required(env, key.capabilityPepperRef), "capability-pepper"),
      publicationVerifier: reference(required(env, key.publicationVerifierRef), "publication-verifier"),
    }),
    retention: Object.freeze({
      declarationRef: reference(required(env, key.retentionDeclarationRef), "retention"),
      interactionBodyMaximumDays: 30,
      responseBodyAvailable: false,
      bodyFreeReceiptMaximumDays: 37,
      purgeTargetHours: 24,
      purgeIncidentAfterHours: 36,
    }),
    logging: Object.freeze({
      cloudflare: logDeclaration(env, "cloudflare", key.cloudflareLogDeclarationRef, key.cloudflareLogRetentionHours),
      caddy: logDeclaration(env, "caddy", key.caddyLogDeclarationRef, key.caddyLogRetentionHours),
      app: logDeclaration(env, "app", key.appLogDeclarationRef, key.appLogRetentionHours),
      postgres: logDeclaration(env, "postgres", key.postgresLogDeclarationRef, key.postgresLogRetentionHours),
    }),
    backup: Object.freeze({
      declarationRef: reference(required(env, key.backupDeclarationRef), "postgres-backup"),
      retentionHours: declaredHours(required(env, key.backupRetentionHours)),
      restoreEvidenceRef: reference(required(env, key.restoreEvidenceRef), "restore-evidence"),
    }),
    unavailable: Object.freeze({
      fullSurface: true,
      freshResponseSession: true,
      response: true,
      grant: true,
      privateRoom: true,
      email: true,
    }),
  });
}

/** Body-free startup diagnostics. Secret-resource references stay out of logs. */
export function serializePublicCoreProductionConfig(config: PublicCoreProductionConfig): string {
  return JSON.stringify({
    schemaVersion: config.schemaVersion,
    deploymentMode: config.deploymentMode,
    policyId: config.policyId,
    publicOrigin: config.publicOrigin,
    access: {
      issuer: config.access.issuer,
      controlAudienceConfigured: true,
      approveAudienceConfigured: true,
      controllerSubjectConfigured: true,
      curatorSubjectConfigured: true,
    },
    originProtectionDeclarationConfigured: true,
    resourceReferencesConfigured: {
      databaseUrl: true,
      bodyEncryptionKey: true,
      capabilityPepper: true,
      publicationVerifier: true,
    },
    retention: {
      declarationConfigured: true,
      interactionBodyMaximumDays: config.retention.interactionBodyMaximumDays,
      responseBodyAvailable: config.retention.responseBodyAvailable,
      bodyFreeReceiptMaximumDays: config.retention.bodyFreeReceiptMaximumDays,
      purgeTargetHours: config.retention.purgeTargetHours,
      purgeIncidentAfterHours: config.retention.purgeIncidentAfterHours,
    },
    logging: {
      cloudflare: { declarationConfigured: true, retentionHours: config.logging.cloudflare.retentionHours },
      caddy: { declarationConfigured: true, retentionHours: config.logging.caddy.retentionHours },
      app: { declarationConfigured: true, retentionHours: config.logging.app.retentionHours },
      postgres: { declarationConfigured: true, retentionHours: config.logging.postgres.retentionHours },
    },
    backup: {
      declarationConfigured: true,
      retentionHours: config.backup.retentionHours,
      restoreEvidenceConfigured: true,
    },
    unavailable: config.unavailable,
  });
}
