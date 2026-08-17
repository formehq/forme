import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  IMAGE_PLATFORM,
  IMAGE_REFERENCE,
  POSTGRES_SERVER_VERSION_NUM,
  SQL_BINDINGS,
  buildContainerCreateArguments,
  createRunSpec,
  projectPostgresDiagnostic,
  readPinnedSql,
  runRehearsal,
// The development harness is an executable .mjs artifact; its exports are
// tested directly without adding a declaration-only maintenance surface.
// @ts-expect-error -- intentional executable artifact import.
} from "../../scripts/r4-disposable-postgres-rehearsal.mjs";

type FakeOptions = Readonly<{
  imageCached?: boolean;
  hostPlatform?: string;
  postgresVersion?: number;
  failSqlPhase?: string | null;
  cleanupOwnershipMismatch?: boolean;
}>;

class FakeDocker {
  readonly callCounts: Record<string, number> = {};
  readonly calls: string[] = [];
  readonly options: FakeOptions;
  imagePresent: boolean;
  containerPresent = false;
  networkPresent = false;
  volumePresent = false;

  constructor(options: FakeOptions = {}) {
    this.options = options;
    this.imagePresent = options.imageCached ?? true;
  }

  record(kind: string): void {
    this.calls.push(kind);
    this.callCounts[kind] = (this.callCounts[kind] ?? 0) + 1;
  }

  async version(): Promise<Readonly<{ clientVersion: string; serverVersion: string; platform: string }>> {
    this.record("version");
    return Object.freeze({ clientVersion: "29.3.1", serverVersion: "29.3.1", platform: this.options.hostPlatform ?? IMAGE_PLATFORM });
  }

  async inspectImage(): Promise<Readonly<{ id: string; platform: string }> | null> {
    this.record("image.inspect");
    return this.imagePresent ? Object.freeze({ id: "sha256:fake-image", platform: IMAGE_PLATFORM }) : null;
  }

  async pullImage(): Promise<void> {
    this.record("image.pull");
    this.imagePresent = true;
  }

  async requireAbsent(kind: string): Promise<void> {
    this.record(`${kind}.preflight`);
  }

  async createNetwork(): Promise<string> {
    this.record("network.create");
    this.networkPresent = true;
    return "network-id";
  }

  async createVolume(): Promise<string> {
    this.record("volume.create");
    this.volumePresent = true;
    return "volume-name";
  }

  async createContainer(): Promise<string> {
    this.record("container.create");
    this.containerPresent = true;
    return "container-id";
  }

  async startContainer(): Promise<void> {
    this.record("container.start");
  }

  async stopContainer(): Promise<void> {
    this.record("container.stop");
  }

  async publishedPort(): Promise<number> {
    this.record("container.port");
    return 55432;
  }

  async cleanup(): Promise<Readonly<{ container: boolean; network: boolean; volume: boolean }>> {
    this.record("cleanup");
    if (this.options.cleanupOwnershipMismatch === true) throw new Error("ownership mismatch must remain body-free");
    this.containerPresent = false;
    this.networkPresent = false;
    this.volumePresent = false;
    return Object.freeze({ container: true, network: true, volume: true });
  }
}

class FakePostgres {
  readonly options: FakeOptions;
  readonly calls: string[] = [];
  schemaPresent = false;

  constructor(options: FakeOptions = {}) {
    this.options = options;
  }

  async waitReady(_port: number, phase: string): Promise<number> {
    this.calls.push(phase);
    return phase.endsWith("restart") ? 2 : 1;
  }

  async serverVersion(): Promise<number> {
    this.calls.push("postgres.version");
    return this.options.postgresVersion ?? POSTGRES_SERVER_VERSION_NUM;
  }

  async execute(_port: number, sql: string, phase: string): Promise<boolean> {
    this.calls.push(phase);
    if (this.options.failSqlPhase === phase) throw new Error("synthetic SQL failure");
    if (sql.includes("CREATE SCHEMA forme_r4_public_core")) this.schemaPresent = true;
    if (phase.startsWith("postgres.verify") && !this.schemaPresent) throw new Error("verify before schema");
    if (sql.includes("DROP SCHEMA forme_r4_public_core RESTRICT")) this.schemaPresent = false;
    return true;
  }

  async installationSeed(): Promise<Readonly<Record<string, string>>> {
    this.calls.push("postgres.seed");
    if (!this.schemaPresent) throw new Error("seed before schema");
    return Object.freeze({
      installation_id: "installation_forme_public_core_v1",
      third_place_id: "thirdplace_forme_public_core_v1",
      entity_id: "entity_forme_public_core_v1",
      config_lineage_hash: "sha256:f5d6c77c4ae21d57a8fe551ed49916ec8b06fc215ac018b7a71ead19c1c48a31",
    });
  }

  async schemaAbsent(): Promise<boolean> {
    this.calls.push("postgres.rollback-proof");
    return !this.schemaPresent;
  }
}

function fixture(options: FakeOptions = {}) {
  const spec = createRunSpec("0123456789abcdef", "/private/tmp/forme-r4-pg-test");
  const sql = readPinnedSql();
  const docker = new FakeDocker(options);
  const postgres = new FakePostgres(options);
  return { spec, sql, docker, postgres };
}

test("#77 binds one unique, loopback-only, secret-file Docker plan", () => {
  const spec = createRunSpec("0123456789abcdef", "/private/tmp/forme-r4-pg-test");
  assert.deepEqual(spec.names, {
    container: "forme-r4-pg-0123456789abcdef",
    network: "forme-r4-pg-net-0123456789abcdef",
    volume: "forme-r4-pg-vol-0123456789abcdef",
  });
  assert.deepEqual(spec.labels, {
    "forme.r4.enabler": "77",
    "forme.r4.owner": "disposable-postgres-rehearsal",
    "forme.r4.run": "0123456789abcdef",
  });
  const secretPath = "/private/tmp/forme-r4-pg-test/postgres-password";
  const args = buildContainerCreateArguments(spec, secretPath);
  assert.equal(args[0], "container");
  assert.equal(args[1], "create");
  assert.ok(args.includes(IMAGE_REFERENCE));
  assert.ok(args.includes(IMAGE_PLATFORM));
  assert.ok(args.includes("127.0.0.1::5432"));
  assert.ok(args.includes(`POSTGRES_PASSWORD_FILE=${spec.postgres.passwordTarget}`));
  assert.equal(args.filter((value: string) => value.includes(secretPath)).length, 1);
  assert.match(args.find((value: string) => value.includes(secretPath)) ?? "", /,readonly$/u);
  assert.equal(args.some((value: string) => value.includes("POSTGRES_PASSWORD=")), false);
});

test("#77 pins the unchanged Core schema, verify and rollback bytes", () => {
  const sql = readPinnedSql();
  assert.match(sql.schema, /CREATE SCHEMA forme_r4_public_core/u);
  assert.match(sql.verify, /BEGIN TRANSACTION READ ONLY/u);
  assert.match(sql.rollback, /DROP SCHEMA forme_r4_public_core RESTRICT/u);
  assert.deepEqual({
    schema: SQL_BINDINGS.schema.sha256,
    verify: SQL_BINDINGS.verify.sha256,
    rollback: SQL_BINDINGS.rollback.sha256,
  }, {
    schema: "sha256:a0040e8cd91e0eb1d61e8fb14476d0a12243ace7035032657ae2dd08d829eec8",
    verify: "sha256:807cdaf0e85cc5d4a98cc739e46899d538ba35e5d8d174795202170e150bf9bd",
    rollback: "sha256:67bfe857c5c93afb1694bb31b8ded76414a5f9dae79e761c249866c2e0d724a4",
  });
});

test("PostgreSQL diagnostics retain only closed structural fields", () => {
  const hostile = {
    code: "42601",
    severity: "ERROR",
    position: "1234",
    routine: "scanner_yyerror",
    message: "must not cross the result membrane",
    detail: "must not cross the result membrane",
  };
  assert.deepEqual(projectPostgresDiagnostic(hostile), {
    pgCode: "42601",
    severity: "ERROR",
    position: "1234",
    routine: "scanner_yyerror",
  });
  assert.equal(projectPostgresDiagnostic({ code: "not-a-pg-code", message: "secret" }), null);
});

test("cached-image rehearsal proves schema, restart, rollback and exact cleanup", async () => {
  const input = fixture();
  const result = await runRehearsal({ ...input, startedAt: "2026-08-17T00:00:00.000Z" });
  assert.equal(result.status, "GREEN");
  assert.deepEqual(result.outcome, {
    schemaApplied: true,
    verifyCount: 2,
    restartCount: 1,
    restartPersistenceProven: true,
    rollbackApplied: true,
    rollbackProven: true,
  });
  assert.deepEqual(result.resources.finalAbsent, { container: true, network: true, volume: true });
  assert.equal(result.observation.imagePulled, false);
  assert.deepEqual(result.observation.readinessAttempts, { initial: 1, restart: 2 });
  assert.equal(input.docker.calls.filter((kind) => kind === "container.start").length, 2);
  assert.equal(input.docker.calls.at(-1), "cleanup");
  assert.deepEqual(result.effects, {
    syntheticDataOnly: true,
    historicalResourcesTouched: false,
    providerCalls: 0,
    realGuestRecords: 0,
    productionEffects: 0,
    publicTrafficEffects: 0,
    gateCEffects: 0,
    dockerCallCounts: result.effects.dockerCallCounts,
  });
});

test("an absent exact image permits one pull and no second pull", async () => {
  const input = fixture({ imageCached: false });
  const result = await runRehearsal({ ...input });
  assert.equal(result.status, "GREEN");
  assert.equal(result.observation.imagePulled, true);
  assert.equal(input.docker.calls.filter((kind) => kind === "image.pull").length, 1);
  assert.equal(input.docker.calls.filter((kind) => kind === "image.inspect").length, 2);
});

test("an ordinary schema failure remains failed-clean and never verifies", async () => {
  const input = fixture({ failSqlPhase: "postgres.schema" });
  const result = await runRehearsal({ ...input });
  assert.equal(result.status, "FAILED_CLEAN");
  assert.equal(result.failure.code, "disposable_postgres_unexpected_failure");
  assert.equal(result.failure.ambiguous, true);
  assert.equal(result.outcome.schemaApplied, false);
  assert.equal(input.postgres.calls.some((phase) => phase.startsWith("postgres.verify")), false);
  assert.deepEqual(result.resources.finalAbsent, { container: true, network: true, volume: true });
});

test("a PostgreSQL version mismatch stops before schema mutation and cleans", async () => {
  const input = fixture({ postgresVersion: 160009 });
  const result = await runRehearsal({ ...input });
  assert.equal(result.status, "FAILED_CLEAN");
  assert.equal(result.failure.code, "disposable_postgres_version_mismatch");
  assert.equal(result.outcome.schemaApplied, false);
  assert.deepEqual(result.resources.finalAbsent, { container: true, network: true, volume: true });
});

test("cleanup never claims Green when exact ownership cannot be proven", async () => {
  const input = fixture({ cleanupOwnershipMismatch: true });
  const result = await runRehearsal({ ...input });
  assert.equal(result.status, "FAILED_CLEANUP_AMBIGUOUS");
  assert.equal(result.cleanupFailure.ambiguous, true);
  assert.deepEqual(result.resources.finalAbsent, { container: false, network: false, volume: false });
});

test("the ordinary command is separate from the frozen historical runner", async () => {
  const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const source = await readFile(path.join(repositoryRoot, "scripts/r4-disposable-postgres-rehearsal.mjs"), "utf8");
  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };
  assert.equal(packageJson.scripts["r4:postgres:rehearse"], "node scripts/r4-disposable-postgres-rehearsal.mjs");
  assert.doesNotMatch(source, /grant\.pending|owner-approval-receipt|INTEGRATION_CAMPAIGN/u);
  assert.match(source, /historicalResourcesTouched: false/u);
});
