import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PublicCorePgExecutorErrorV1,
  PublicCorePgExecutorV1,
  authenticPublicCorePgExecutorErrorDetails,
  createPublicCorePgExecutorV1,
  type PublicCorePgExecutorErrorCodeV1,
  type PublicCorePgExecutorTransactionOutcomeV1,
  type PublicCorePgPoolV1,
} from "../../apps/room/src/public-core-pg-executor.ts";
import {
  PublicCorePostgresError,
  PublicCorePostgresStoreV1,
  type PublicCoreCanonicalSqlStatementV1,
  type PublicCoreSqlQueryResultV1,
  type PublicCoreSqlTransactionV1,
} from "../../apps/room/src/public-core-postgres.ts";

const SOURCE = readFileSync(
  new URL("../../apps/room/src/public-core-pg-executor.ts", import.meta.url),
  "utf8",
);
const CANARY = "PRIVATE_BODY_SECRET_CANARY";
const TEST_STATEMENT_BRAND = Symbol("r4.public-core.test-canonical-statement.v1");

interface QueryCallV1 {
  readonly text: string;
  readonly values: readonly unknown[];
}

type QueryHandlerV1 = (
  text: string,
  values: readonly unknown[],
) => unknown | Promise<unknown>;

function controlResult(): Readonly<Record<string, unknown>> {
  return Object.freeze({ command: null, rowCount: null, rows: Object.freeze([]) });
}

function domainResult(
  row: Readonly<Record<string, unknown>> = Object.freeze({ value: "ok" }),
): Readonly<Record<string, unknown>> {
  return Object.freeze({ rowCount: 1, rows: Object.freeze([row]) });
}

class FakeClientV1 {
  readonly calls: QueryCallV1[] = [];
  readonly releaseArguments: unknown[][] = [];
  queryHandler: QueryHandlerV1;
  releaseFailure: unknown = null;
  replaceQueryAfterFirstCall = false;

  constructor(queryHandler: QueryHandlerV1 = (text) =>
    text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK"
      ? controlResult()
      : domainResult()) {
    this.queryHandler = queryHandler;
  }

  async query(text: string, values: readonly unknown[]): Promise<unknown> {
    this.calls.push(Object.freeze({ text, values }));
    if (this.replaceQueryAfterFirstCall && this.calls.length === 1) {
      Object.defineProperty(this, "query", {
        configurable: true,
        value: async (): Promise<never> => { throw new Error(CANARY); },
      });
    }
    return await this.queryHandler(text, values);
  }

  release(...args: readonly unknown[]): void {
    this.releaseArguments.push([...args]);
    if (this.releaseFailure !== null) throw this.releaseFailure;
  }
}

class FakePoolV1 implements PublicCorePgPoolV1 {
  connectCalls = 0;
  connectFailure: unknown = null;
  readonly client: unknown;

  constructor(client: unknown) {
    this.client = client;
  }

  async connect(): Promise<unknown> {
    this.connectCalls += 1;
    if (this.connectFailure !== null) throw this.connectFailure;
    return this.client;
  }
}

function statement(input: Readonly<{
  text?: string;
  values?: readonly unknown[];
  rowKeys?: readonly string[];
}> = {}): PublicCoreCanonicalSqlStatementV1 {
  return Object.freeze({
    [TEST_STATEMENT_BRAND]: "r4.public-core.canonical-sql-statement.v1",
    statementId: "third_place.list.read",
    action: "third_place.list",
    phase: "read",
    lockClass: null,
    text: input.text ?? "SELECT value FROM synthetic",
    values: input.values ?? Object.freeze([]),
    payloadClass: "body_free",
    rowExpectation: "exactly_one",
    rowKeys: input.rowKeys ?? Object.freeze(["value"]),
  }) as unknown as PublicCoreCanonicalSqlStatementV1;
}

async function queryOne(
  transaction: PublicCoreSqlTransactionV1,
  value = statement(),
): Promise<PublicCoreSqlQueryResultV1> {
  return await transaction.query(value);
}

async function rejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("expected rejection");
}

function assertExecutorError(
  error: unknown,
  code: PublicCorePgExecutorErrorCodeV1,
  transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1,
  forbiddenCanary = CANARY,
): PublicCorePgExecutorErrorV1 {
  assert.ok(error instanceof PublicCorePgExecutorErrorV1);
  assert.equal(error.name, "PublicCorePgExecutorErrorV1");
  assert.equal(error.message, code);
  assert.equal(error.status, 503);
  assert.equal(error.code, code);
  assert.equal(Object.isFrozen(error), true);
  const details = authenticPublicCorePgExecutorErrorDetails(error);
  assert.deepEqual(details, {
    schemaVersion: "r4.public-core-pg-executor-error.v1",
    status: 503,
    code,
    phase: details?.phase,
    transactionOutcome,
  });
  assert.equal(Object.isFrozen(details), true);
  const visible = `${error.message}\n${JSON.stringify(error)}\n${JSON.stringify(details)}`;
  assert.doesNotMatch(visible, new RegExp(forbiddenCanary, "u"));
  assert.equal(Object.getOwnPropertyDescriptor(error, "cause"), undefined);
  return error;
}

function texts(client: FakeClientV1): readonly string[] {
  return client.calls.map((call) => call.text);
}

test("executor accepts only the PostgreSQL store's private canonical statement path", async () => {
  class PgLikeResultV1 {
    command = "SELECT";
    rowCount = 1;
    oid = null;
    rows = [{
      interaction_id: `interaction_${"i".repeat(24)}`,
      room_id: `room_${"r".repeat(24)}`,
      origin_projection_id: `proj_${"p".repeat(24)}`,
      origin_projection_payload_hash: `sha256:${"a".repeat(64)}`,
      interaction_type: "ask",
      consent_hash: `sha256:${"b".repeat(64)}`,
      state: "accepted",
      body_readable: true,
      version: 1,
      created_at: new Date("2026-08-10T00:00:00.000Z"),
      body_expires_at: new Date("2026-09-09T00:00:00.000Z"),
      tombstone_expires_at: new Date("2026-09-16T00:00:00.000Z"),
      local_purge_received_at: null,
    }];
    fields: readonly unknown[] = [];
  }
  const client = new FakeClientV1((text) =>
    text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK"
      ? controlResult()
      : new PgLikeResultV1());
  const store = new PublicCorePostgresStoreV1(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }));
  const result = await store.readInteraction({
    roomId: `room_${"r".repeat(24)}`,
    interactionId: `interaction_${"i".repeat(24)}`,
    replySecretDigest: `hmac-sha256:${"c".repeat(64)}`,
    requestedAt: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.action, "interaction.read");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.interactionType, "ask");
  assert.equal(result.rows[0]?.acceptedAt, "2026-08-10T00:00:00.000Z");
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    client.calls[1]?.text,
    "COMMIT",
  ]);
  assert.match(client.calls[1]?.text ?? "", /FROM forme_r4_public_core\.interactions/u);
});

test("executor commits one READ COMMITTED callback and releases exactly once", async () => {
  const mutableRow: Record<string, unknown> = { value: "before" };
  const client = new FakeClientV1((text) =>
    text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK"
      ? controlResult()
      : domainResult(mutableRow));
  const pool = new FakePoolV1(client);
  const executor = createPublicCorePgExecutorV1({ pool });
  let callbackCalls = 0;
  const result = await executor.transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => {
      callbackCalls += 1;
      return await queryOne(transaction);
    },
  );
  mutableRow.value = "after";

  assert.equal(executor instanceof PublicCorePgExecutorV1, true);
  assert.equal("pool" in executor, false);
  assert.equal("driver" in executor, false);
  assert.equal("dsn" in executor, false);
  assert.equal(pool.connectCalls, 1);
  assert.equal(callbackCalls, 1);
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "SELECT value FROM synthetic",
    "COMMIT",
  ]);
  assert.equal(client.releaseArguments.length, 1);
  assert.deepEqual(client.releaseArguments[0], []);
  assert.equal(result.rowCount, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.value, "before");
  assert.equal(Object.getPrototypeOf(result.rows[0] as object), null);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.rows), true);
  assert.equal(Object.isFrozen(result.rows[0]), true);

  const writeClient = new FakeClientV1();
  await new PublicCorePgExecutorV1({ pool: new FakePoolV1(writeClient) }).transaction(
    { isolation: "read_committed", readOnly: false },
    async (transaction) => await queryOne(transaction),
  );
  assert.equal(texts(writeClient)[0], "BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE");
});

test("callback failure rolls back once and crosses a body-free membrane", async () => {
  const client = new FakeClientV1();
  const executor = createPublicCorePgExecutorV1({ pool: new FakePoolV1(client) });
  let callbackCalls = 0;
  const error = await rejected(executor.transaction(
    { isolation: "read_committed", readOnly: false },
    async () => {
      callbackCalls += 1;
      throw new Error(CANARY);
    },
  ));
  assertExecutorError(error, "public_core_pg_callback_failed", "rolled_back");
  assert.equal(callbackCalls, 1);
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE",
    "ROLLBACK",
  ]);
  assert.equal(client.releaseArguments.length, 1);
  assert.deepEqual(client.releaseArguments[0], []);
});

test("uncertain BEGIN response is reconciled with one ROLLBACK before release", async () => {
  const client = new FakeClientV1((text) => {
    if (text.startsWith("BEGIN")) throw new Error(CANARY);
    return controlResult();
  });
  let callbackCalls = 0;
  const error = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async () => {
      callbackCalls += 1;
      return "unreachable";
    },
  ));
  assertExecutorError(error, "public_core_pg_begin_failed", "rolled_back");
  assert.equal(callbackCalls, 0);
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "ROLLBACK",
  ]);
  assert.equal(client.releaseArguments.length, 1);
});

test("authentic frozen PostgreSQL callback errors retain exact semantics after rollback", async () => {
  const client = new FakeClientV1();
  const executor = createPublicCorePgExecutorV1({ pool: new FakePoolV1(client) });
  const expected = new PublicCorePostgresError(409, "sql_expected_exactly_one");
  Object.freeze(expected);
  const error = await rejected(executor.transaction(
    { isolation: "read_committed", readOnly: true },
    async () => { throw expected; },
  ));
  assert.equal(error, expected);
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "ROLLBACK",
  ]);
});

test("query rejection rolls back, disconnect text is sanitized, and release is exact", async () => {
  const client = new FakeClientV1((text) => {
    if (text === "SELECT value FROM synthetic") throw new Error(CANARY);
    return controlResult();
  });
  const error = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(error, "public_core_pg_query_failed", "rolled_back");
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "SELECT value FROM synthetic",
    "ROLLBACK",
  ]);
  assert.equal(client.releaseArguments.length, 1);
});

test("driver timeout and disconnect diagnostics collapse to the same closed query failure", async () => {
  for (const driverError of [
    Object.assign(new Error(`${CANARY}_ETIMEDOUT`), { code: "ETIMEDOUT" }),
    Object.assign(new Error(`${CANARY}_ECONNRESET`), { code: "ECONNRESET" }),
  ]) {
    const client = new FakeClientV1((text) => {
      if (text === "SELECT value FROM synthetic") throw driverError;
      return controlResult();
    });
    const error = await rejected(createPublicCorePgExecutorV1({
      pool: new FakePoolV1(client),
    }).transaction(
      { isolation: "read_committed", readOnly: true },
      async (transaction) => await queryOne(transaction),
    ));
    assertExecutorError(error, "public_core_pg_query_failed", "rolled_back");
    assert.equal(texts(client).at(-1), "ROLLBACK");
    assert.equal(client.releaseArguments.length, 1);
  }
});

test("COMMIT rejection is ambiguous, is never followed by ROLLBACK, and discards client", async () => {
  const client = new FakeClientV1((text) => {
    if (text === "COMMIT") throw new Error(CANARY);
    return text.startsWith("BEGIN") || text === "ROLLBACK" ? controlResult() : domainResult();
  });
  const error = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }).transaction(
    { isolation: "read_committed", readOnly: false },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(error, "public_core_pg_commit_ambiguous", "ambiguous");
  assert.deepEqual(texts(client), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE",
    "SELECT value FROM synthetic",
    "COMMIT",
  ]);
  assert.equal(client.releaseArguments.length, 1);
  assert.equal(client.releaseArguments[0]?.length, 1);
  assert.ok(client.releaseArguments[0]?.[0] instanceof Error);
  assert.equal((client.releaseArguments[0]?.[0] as Error).message, "public_core_pg_discard_client");

  client.releaseFailure = new Error(`${CANARY}_RELEASE`);
  const second = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }).transaction(
    { isolation: "read_committed", readOnly: false },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(second, "public_core_pg_commit_ambiguous", "ambiguous", `${CANARY}_RELEASE`);
});

test("release and rollback failures have closed lifecycle-specific errors", async () => {
  const committedClient = new FakeClientV1();
  committedClient.releaseFailure = new Error(CANARY);
  const releaseError = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(committedClient),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(releaseError, "public_core_pg_release_failed", "committed");
  assert.deepEqual(texts(committedClient), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "SELECT value FROM synthetic",
    "COMMIT",
  ]);

  const rollbackClient = new FakeClientV1((text) => {
    if (text === "ROLLBACK") throw new Error(CANARY);
    return controlResult();
  });
  const rollbackError = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(rollbackClient),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async () => { throw new Error(CANARY); },
  ));
  assertExecutorError(rollbackError, "public_core_pg_rollback_failed", "not_started");
  assert.equal(rollbackClient.releaseArguments[0]?.length, 1, "failed rollback discards client");
});

test("connect, Pool, Client and method faults never expose their canaries", async () => {
  const connectClient = new FakeClientV1();
  const failingPool = new FakePoolV1(connectClient);
  failingPool.connectFailure = new Error(CANARY);
  const connectError = await rejected(createPublicCorePgExecutorV1({ pool: failingPool }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(connectError, "public_core_pg_connect_failed", "not_started");
  assert.equal(connectClient.releaseArguments.length, 0);

  let configGetterCalls = 0;
  const hostileConfig = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(hostileConfig, "pool", {
    enumerable: true,
    get(): never {
      configGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  assert.throws(
    () => createPublicCorePgExecutorV1(hostileConfig as never),
    (error: unknown) => {
      assertExecutorError(error, "public_core_pg_configuration_invalid", "not_started");
      return true;
    },
  );
  assert.equal(configGetterCalls, 0);

  let connectGetterCalls = 0;
  const hostilePool = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(hostilePool, "connect", {
    enumerable: true,
    get(): never {
      connectGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  assert.throws(
    () => createPublicCorePgExecutorV1({ pool: hostilePool as never }),
    (error: unknown) => {
      assertExecutorError(error, "public_core_pg_configuration_invalid", "not_started");
      return true;
    },
  );
  assert.equal(connectGetterCalls, 0);

  let queryGetterCalls = 0;
  let hostileReleaseCalls = 0;
  const hostileClient = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(hostileClient, "release", {
    enumerable: true,
    value: (): void => { hostileReleaseCalls += 1; },
  });
  Object.defineProperty(hostileClient, "query", {
    enumerable: true,
    get(): never {
      queryGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  const clientError = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(hostileClient),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(clientError, "public_core_pg_client_invalid", "not_started");
  assert.equal(queryGetterCalls, 0);
  assert.equal(hostileReleaseCalls, 1);

  const proxyPool = new Proxy({}, {
    getOwnPropertyDescriptor(): never { throw new Error(CANARY); },
  });
  assert.throws(
    () => createPublicCorePgExecutorV1({ pool: proxyPool as never }),
    (error: unknown) => {
      assertExecutorError(error, "public_core_pg_configuration_invalid", "not_started");
      return true;
    },
  );
});

test("query result, rows, accessors, symbols and Proxies fail before data escapes", async () => {
  let rowGetterCalls = 0;
  const rowWithGetter = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(rowWithGetter, "value", {
    enumerable: true,
    get(): never {
      rowGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  const outerGetter = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(outerGetter, "rowCount", { enumerable: true, value: 1 });
  Object.defineProperty(outerGetter, "rows", {
    enumerable: true,
    get(): never { throw new Error(CANARY); },
  });
  const symbolRows = [{ value: "ok" }];
  Object.defineProperty(symbolRows, Symbol(CANARY), { enumerable: true, value: CANARY });
  const malformed: readonly unknown[] = [
    { rowCount: 1, rows: [rowWithGetter] },
    outerGetter,
    { rowCount: 1, rows: symbolRows },
    { rowCount: 1, rows: [{ value: "ok", private_canary: CANARY }] },
    { rowCount: 2, rows: [{ value: "ok" }] },
    { rowCount: 1, rows: [new Proxy({ value: "ok" }, {
      ownKeys(): never { throw new Error(CANARY); },
    })] },
    new Proxy({ rowCount: 1, rows: [{ value: "ok" }] }, {
      ownKeys(): never { throw new Error(CANARY); },
    }),
  ];

  for (const value of malformed) {
    const client = new FakeClientV1((text) =>
      text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK"
        ? controlResult()
        : value);
    const error = await rejected(createPublicCorePgExecutorV1({
      pool: new FakePoolV1(client),
    }).transaction(
      { isolation: "read_committed", readOnly: true },
      async (transaction) => await queryOne(transaction),
    ));
    assertExecutorError(error, "public_core_pg_query_result_invalid", "rolled_back");
    assert.equal(texts(client).at(-1), "ROLLBACK");
  }
  assert.equal(rowGetterCalls, 0, "row accessors are inspected, never invoked");
});

test("statement and option descriptors are snapshotted without invoking hostile getters", async () => {
  const optionsPool = new FakePoolV1(new FakeClientV1());
  const executor = createPublicCorePgExecutorV1({ pool: optionsPool });
  let optionGetterCalls = 0;
  const options = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(options, "isolation", {
    enumerable: true,
    get(): never {
      optionGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  Object.defineProperty(options, "readOnly", { enumerable: true, value: true });
  const optionsError = await rejected(executor.transaction(
    options as never,
    async (transaction) => await queryOne(transaction),
  ));
  assertExecutorError(optionsError, "public_core_pg_configuration_invalid", "not_started");
  assert.equal(optionGetterCalls, 0);
  assert.equal(optionsPool.connectCalls, 0);

  let valuesGetterCalls = 0;
  const hostileStatement = {
    [TEST_STATEMENT_BRAND]: "r4.public-core.canonical-sql-statement.v1",
    statementId: "third_place.list.read",
    action: "third_place.list",
    phase: "read",
    lockClass: null,
    payloadClass: "body_free",
    rowExpectation: "exactly_one",
    rowKeys: Object.freeze(["value"]),
    text: "SELECT value FROM synthetic",
  } as Record<PropertyKey, unknown>;
  Object.defineProperty(hostileStatement, "values", {
    enumerable: true,
    get(): never {
      valuesGetterCalls += 1;
      throw new Error(CANARY);
    },
  });
  Object.freeze(hostileStatement);
  const statementClient = new FakeClientV1();
  const statementError = await rejected(createPublicCorePgExecutorV1({
    pool: new FakePoolV1(statementClient),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(
      transaction,
      hostileStatement as unknown as PublicCoreCanonicalSqlStatementV1,
    ),
  ));
  assertExecutorError(statementError, "public_core_pg_protocol_violation", "rolled_back");
  assert.equal(valuesGetterCalls, 0);
  assert.deepEqual(texts(statementClient), [
    "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
    "ROLLBACK",
  ]);
});

test("captured methods and query values resist mutable aliases", async () => {
  const originalObject: Record<string, unknown> = { nested: "before" };
  const observed: { values?: readonly unknown[] } = {};
  const client = new FakeClientV1((text, values) => {
    if (text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK") return controlResult();
    observed.values = values;
    return domainResult({ value: new Date("2026-08-11T01:02:03.456Z") });
  });
  client.replaceQueryAfterFirstCall = true;
  const pool = new FakePoolV1(client);
  const executor = createPublicCorePgExecutorV1({ pool });
  Object.defineProperty(pool, "connect", {
    configurable: true,
    value: async (): Promise<never> => { throw new Error(CANARY); },
  });
  const result = await executor.transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => await queryOne(transaction, statement({ values: [originalObject] })),
  );
  originalObject.nested = "after";
  const driverValues = observed.values;
  assert.ok(driverValues !== undefined);
  assert.equal(pool.connectCalls, 1, "captured Pool method survives replacement");
  assert.equal(client.calls.length, 3, "captured Client query survives replacement");
  assert.equal(driverValues.length, 1);
  assert.equal((driverValues[0] as Readonly<Record<string, unknown>> | undefined)?.nested, "before");
  assert.equal(Object.getPrototypeOf(driverValues[0] as object), null);
  assert.equal(Object.isFrozen(driverValues), true);
  assert.equal(Object.isFrozen(driverValues[0]), true);
  assert.equal(result.rows[0]?.value, "2026-08-11T01:02:03.456Z");
});

test("transaction query is closed after callback and callback is never re-entered", async () => {
  const client = new FakeClientV1();
  let retained: PublicCoreSqlTransactionV1 | null = null;
  let callbackCalls = 0;
  const result = await createPublicCorePgExecutorV1({
    pool: new FakePoolV1(client),
  }).transaction(
    { isolation: "read_committed", readOnly: true },
    async (transaction) => {
      callbackCalls += 1;
      retained = transaction;
      return await queryOne(transaction);
    },
  );
  assert.equal(result.rowCount, 1);
  assert.equal(callbackCalls, 1);
  assert.ok(retained !== null);
  const before = client.calls.length;
  const lateError = await rejected((retained as PublicCoreSqlTransactionV1).query(statement()));
  assertExecutorError(lateError, "public_core_pg_protocol_violation", "committed");
  assert.equal(client.calls.length, before, "late query causes no driver call");
});

test("executor has no pg construction, DSN, environment, or network fallback", () => {
  assert.doesNotMatch(SOURCE, /from ["']pg["']|require\(["']pg["']\)/u);
  assert.doesNotMatch(
    SOURCE,
    /\b(?:process\.env|DATABASE_URL|connectionString|new\s+Pool|createConnection|fetch\s*\(|node:net|node:tls|node:http|node:https)\b/u,
  );
  assert.match(SOURCE, /BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY/u);
  assert.match(SOURCE, /BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE/u);
  assert.equal(authenticPublicCorePgExecutorErrorDetails(
    new PublicCorePgExecutorErrorV1("public_core_pg_query_failed"),
  ), null, "public constructor cannot mint the private error brand");
  assert.equal(authenticPublicCorePgExecutorErrorDetails(new Proxy({}, {
    getPrototypeOf(): never { throw new Error(CANARY); },
  })), null);
});
